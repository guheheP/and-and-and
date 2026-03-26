// simulator-core.js - Virtual time game loop for balancing tests
// 現在の仕様に完全準拠したシミュレータコア

import { createInitialState, getCropLevel, getCropLevelMultiplier, addPoints, addPlayerExp, addCropExp, consumeSeed, executePrestige, purchaseUpgrade, getUpgradeLevel, isCropInfinite } from './game-state.js';
import { CROP_MASTER, GACHA_CONFIG } from './master-data.js';
import { checkLevelUp, getPointMultiplier, getGachaPool } from './progression.js';
import { getUpgradeCost, PRESTIGE_UPGRADES, getUpgradeEffect } from './prestige-data.js';

export class SimulatorCore {
    constructor() {
        this.state = createInitialState();
        this.virtualTimeMs = 0;
        this.logs = [];
        this.dataPoints = { time: [], level: [], points: [], exp: [], prestigeCount: [] };
        this.harvestCount = 0;

        // Settings
        this.autoPrestige = true;
        this.prestigeThreshold = 50;
        this.totalCurrencyEarned = 0;
    }

    reset() {
        this.state = createInitialState();
        this.virtualTimeMs = 0;
        this.logs = [];
        this.dataPoints = { time: [], level: [], points: [], exp: [], prestigeCount: [] };
        this.harvestCount = 0;
        this.totalCurrencyEarned = 0;
    }

    log(message) {
        const hours = Math.floor(this.virtualTimeMs / 3600000);
        const minutes = Math.floor((this.virtualTimeMs % 3600000) / 60000);
        const timeStr = `${hours}h ${minutes}m`;
        this.logs.push({
            time: this.virtualTimeMs,
            timeStr,
            level: this.state.level,
            msg: message,
            points: this.state.points,
            exp: this.state.totalEarnedExp,
        });
    }

    recordDataPoint() {
        this.dataPoints.time.push(this.virtualTimeMs / 3600000);
        this.dataPoints.level.push(this.state.level);
        this.dataPoints.points.push(this.state.totalEarnedPoints);
        this.dataPoints.exp.push(this.state.totalEarnedExp);
        this.dataPoints.prestigeCount.push(this.state.prestigeCount);
    }

    run(durationSeconds, tickMs = 1000) {
        let elapsedTime = 0;
        const targetTime = durationSeconds * 1000;
        const recordInterval = Math.max(1000, targetTime / 200);
        let nextRecordTime = this.virtualTimeMs;

        this.log(`シミュレーション開始 (${durationSeconds}秒間)`);

        while (elapsedTime < targetTime) {
            this.tick(tickMs);
            elapsedTime += tickMs;
            this.virtualTimeMs += tickMs;

            if (this.virtualTimeMs >= nextRecordTime) {
                this.recordDataPoint();
                nextRecordTime += recordInterval;
            }
        }

        this.recordDataPoint();
        this.log(`シミュレーション終了`);
        return { state: this.state, logs: this.logs, dataPoints: this.dataPoints };
    }

    tick(deltaMs) {
        // AI: Buy Gacha
        this.autoGacha();

        // AI: Plant
        if (!this.state.fieldState.isPlanted) {
            this.plantCrop();
        }

        // AI: Growth & Harvest
        if (this.state.fieldState.isPlanted) {
            this.updateGrowth(deltaMs);

            if (this.state.fieldState.progress >= 1.0) {
                this.harvestCrop();
            }
        }

        // AI: Prestige
        if (this.autoPrestige && this.state.level >= this.prestigeThreshold) {
            this.doPrestige();
        }
    }

    /**
     * 最も効率の良い種を選択（EXP/時間ベース）
     */
    getBestSeed() {
        let bestId = null;
        let bestScore = -1;

        for (const [id, count] of Object.entries(this.state.seedsInventory || {})) {
            if (count > 0 && CROP_MASTER[id]) {
                const crop = CROP_MASTER[id];
                const cropLv = getCropLevel(this.state, id);
                const cropMult = getCropLevelMultiplier(cropLv);
                // EXP効率 = baseExp * cropMult / growTimeMs
                const score = (crop.baseExp || crop.basePoint) * cropMult / crop.growTimeMs;
                if (score > bestScore) {
                    bestScore = score;
                    bestId = id;
                }
            }
        }

        // 無限作物もチェック
        for (const [id, crop] of Object.entries(CROP_MASTER)) {
            if (isCropInfinite(this.state, id)) {
                const cropLv = getCropLevel(this.state, id);
                const cropMult = getCropLevelMultiplier(cropLv);
                const score = (crop.baseExp || crop.basePoint) * cropMult / crop.growTimeMs;
                if (score > bestScore) {
                    bestScore = score;
                    bestId = id;
                }
            }
        }

        return bestId || 'tomato';
    }

    plantCrop() {
        const cropId = this.getBestSeed();

        // 無限化されていない場合のみ種を消費
        if (!isCropInfinite(this.state, cropId)) {
            consumeSeed(this.state, cropId);
        }

        this.state.fieldState.isPlanted = true;
        this.state.fieldState.cropId = cropId;
        this.state.fieldState.plantedAt = this.virtualTimeMs;
        this.state.fieldState.progress = 0;
    }

    updateGrowth(deltaMs) {
        const crop = CROP_MASTER[this.state.fieldState.cropId];
        if (!crop) return;

        const prestigeGrowth = getUpgradeEffect('growthSpeed', getUpgradeLevel(this.state, 'growthSpeed'));
        const effectiveGrowTime = crop.growTimeMs * prestigeGrowth;

        const elapsed = this.virtualTimeMs - this.state.fieldState.plantedAt;
        this.state.fieldState.progress = Math.min(elapsed / effectiveGrowTime, 1.0);
    }

    harvestCrop() {
        const cropId = this.state.fieldState.cropId;
        const crop = CROP_MASTER[cropId];
        if (!crop) return;

        this.harvestCount++;
        const basePoint = crop.basePoint;
        const baseExp = crop.baseExp || basePoint;

        // ラッキー収穫判定
        const luckyChance = getUpgradeEffect('luckyHarvest', getUpgradeLevel(this.state, 'luckyHarvest'));
        const luckyMultiplier = (Math.random() * 100 < luckyChance) ? 3 : 1;

        // 各種倍率
        const prestigeMult = getUpgradeEffect('basePoints', getUpgradeLevel(this.state, 'basePoints'));
        const playerPointMult = getPointMultiplier(this.state.level);
        const boostMult = 1.0; // イベントブーストなし
        const cropLevelMult = getCropLevelMultiplier(getCropLevel(this.state, cropId));

        // ポイント加算
        const gainedPoints = Math.floor(basePoint * playerPointMult * cropLevelMult * prestigeMult * boostMult * luckyMultiplier);
        addPoints(this.state, gainedPoints);

        // EXP加算（EXP専用プレステージ倍率を適用）
        const expPrestigeMult = getUpgradeEffect('expMultiplier', getUpgradeLevel(this.state, 'expMultiplier'));
        const gainedExp = Math.floor(baseExp * cropLevelMult * expPrestigeMult * boostMult * luckyMultiplier);
        addPlayerExp(this.state, gainedExp);

        // 作物EXP加算（cropExpBoost適用）
        const expBoost = getUpgradeEffect('cropExpBoost', getUpgradeLevel(this.state, 'cropExpBoost'));
        const cropExpAmount = Math.floor(expBoost);
        for (let i = 0; i < cropExpAmount; i++) addCropExp(this.state, cropId);

        // レベルアップ判定
        const { leveledUp, newLevel } = checkLevelUp(this.state);
        if (leveledUp) {
            if (newLevel % 10 === 0 || newLevel <= 5) {
                this.log(`Lv.${newLevel} 到達 (pt: ${formatNum(this.state.points)}, exp: ${formatNum(this.state.totalEarnedExp)})`);
            }
        }

        // 畑リセット
        this.state.fieldState.isPlanted = false;
        this.state.fieldState.cropId = null;
        this.state.fieldState.plantedAt = null;
        this.state.fieldState.progress = 0;
    }

    autoGacha() {
        const pool = getGachaPool(this.state.level);
        if (pool.length === 0) return;

        const discount = getUpgradeEffect('gachaDiscount', getUpgradeLevel(this.state, 'gachaDiscount'));
        const cost = Math.floor(GACHA_CONFIG.cost * discount);

        // ポイントに余裕がある場合のみガチャ
        if (this.state.points > cost * 10) {
            this.state.points -= cost;

            // レアリティ重み付き抽選
            const rarityBoost = getUpgradeEffect('gachaRarity', getUpgradeLevel(this.state, 'gachaRarity'));
            const weights = pool.map(crop => {
                const base = GACHA_CONFIG.rarityWeights[crop.rarity] || 1;
                return crop.rarity >= 3 ? base * rarityBoost : base;
            });
            const totalWeight = weights.reduce((s, w) => s + w, 0);
            let roll = Math.random() * totalWeight;
            let selected = pool[0];
            for (let i = 0; i < pool.length; i++) {
                roll -= weights[i];
                if (roll <= 0) { selected = pool[i]; break; }
            }

            if (!this.state.seedsInventory[selected.id]) this.state.seedsInventory[selected.id] = 0;
            this.state.seedsInventory[selected.id]++;
        }
    }

    doPrestige() {
        const result = executePrestige(this.state);
        this.totalCurrencyEarned += result.currency;
        this.log(`プレステージ実行! 💎+${result.currency} (累計: ${this.totalCurrencyEarned})`);

        // 自動強化購入（優先度順）
        const priorities = [
            'growthSpeed', 'basePoints', 'expMultiplier', 'cropExpBoost',
            'gachaDiscount', 'luckyHarvest', 'gachaRarity',
            'gachaMulti', 'eventRate', 'eventPower', 'eventDuration',
            'gacha50', 'gacha100',
        ];

        let boughtSomething = true;
        while (boughtSomething) {
            boughtSomething = false;
            for (const id of priorities) {
                const upg = PRESTIGE_UPGRADES[id];
                if (!upg) continue;
                const lv = getUpgradeLevel(this.state, id);
                if (lv < upg.maxLv) {
                    const cost = getUpgradeCost(upg, lv);
                    if ((this.state.prestigeCurrency || 0) >= cost) {
                        purchaseUpgrade(this.state, id);
                        boughtSomething = true;
                        this.log(`強化購入: ${upg.name} Lv.${getUpgradeLevel(this.state, id)}`);
                        break;
                    }
                }
            }
        }
    }

    /**
     * 作物レベルのサマリーを取得
     */
    getCropSummary() {
        const summary = [];
        for (const [id, crop] of Object.entries(CROP_MASTER)) {
            const lv = getCropLevel(this.state, id);
            const seeds = this.state.seedsInventory[id] || 0;
            const inf = isCropInfinite(this.state, id);
            if (lv > 1 || seeds > 0 || inf) {
                summary.push({ id, name: crop.name, level: lv, seeds, infinite: inf });
            }
        }
        return summary;
    }
}

function formatNum(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
}
