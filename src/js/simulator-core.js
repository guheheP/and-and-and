// simulator-core.js - Virtual time game loop for balancing tests

import { createInitialState, getCropLevel, getCropLevelMultiplier, addPoints, addCropExp, consumeSeed, executePrestige, purchaseUpgrade, getUpgradeLevel } from './game-state.js';
import { CROP_MASTER, getDefaultCropId, GACHA_CONFIG } from './master-data.js';
import { checkLevelUp, getPointMultiplier, getGachaPool } from './progression.js';
import { getUpgradeCost, PRESTIGE_UPGRADES, getUpgradeEffect } from './prestige-data.js';

export class SimulatorCore {
    constructor() {
        this.state = createInitialState();
        this.virtualTimeMs = 0;
        this.logs = [];
        this.dataPoints = { time: [], level: [], points: [] };
        
        // Settings
        this.autoPrestige = true;
        this.prestigeThreshold = 50;
        this.totalCurrencyEarned = 0;
    }

    reset() {
        this.state = createInitialState();
        this.virtualTimeMs = 0;
        this.logs = [];
        this.dataPoints = { time: [], level: [], points: [] };
        this.totalCurrencyEarned = 0;
    }

    log(message) {
        const hours = Math.floor(this.virtualTimeMs / 3600000);
        const minutes = Math.floor((this.virtualTimeMs % 3600000) / 60000);
        const timeStr = `${hours}h ${minutes}m`;
        this.logs.push({ time: this.virtualTimeMs, timeStr, level: this.state.level, msg: message, points: this.state.points });
    }

    recordDataPoint() {
        this.dataPoints.time.push(this.virtualTimeMs / 3600000); // 単位: 時間
        this.dataPoints.level.push(this.state.level);
        this.dataPoints.points.push(this.state.totalEarnedPoints);
    }

    run(durationSeconds, tickMs = 1000) {
        let elapsedTime = 0;
        const targetTime = durationSeconds * 1000;
        const recordInterval = Math.max(1000, targetTime / 100); // Record roughly 100 points
        let nextRecordTime = this.virtualTimeMs;

        this.log(`Simulation started for ${durationSeconds} seconds.`);

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
        this.log(`Simulation ended.`);
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

    getBestSeed() {
        let bestId = null;
        let bestScore = -1;
        
        for (const [id, count] of Object.entries(this.state.seedsInventory || {})) {
            if (count > 0 && CROP_MASTER[id]) {
                const crop = CROP_MASTER[id];
                // Points per real time is roughly basePoint / growTimeMs
                const score = crop.basePoint / crop.growTimeMs;
                if (score > bestScore) {
                    bestScore = score;
                    bestId = id;
                }
            }
        }
        
        return bestId || getDefaultCropId(this.state.level);
    }

    plantCrop() {
        const cropId = this.getBestSeed();
        
        // Consume seed if not default
        let isDefault = true;
        for (const entry of Object.values(CROP_MASTER)) {
            if (entry.id === cropId && !entry.isDefault) isDefault = false;
        }
        
        if (!isDefault) consumeSeed(this.state, cropId);

        this.state.fieldState.isPlanted = true;
        this.state.fieldState.cropId = cropId;
        this.state.fieldState.plantedAt = this.virtualTimeMs;
        this.state.fieldState.progress = 0;
    }

    updateGrowth(deltaMs) {
        const crop = CROP_MASTER[this.state.fieldState.cropId];
        if (!crop) return;

        const growthMult = 1.0; // Assume no weather events for basic balance baseline
        const prestigeGrowth = getUpgradeEffect('growthSpeed', getUpgradeLevel(this.state, 'growthSpeed'));
        const effectiveGrowTime = crop.growTimeMs * prestigeGrowth / growthMult;
        
        const elapsed = this.virtualTimeMs - this.state.fieldState.plantedAt;
        this.state.fieldState.progress = Math.min(elapsed / effectiveGrowTime, 1.0);
    }

    harvestCrop() {
        const cropId = this.state.fieldState.cropId;
        const crop = CROP_MASTER[cropId];
        
        // Add EXP
        const expBoost = getUpgradeEffect('cropExpBoost', getUpgradeLevel(this.state, 'cropExpBoost'));
        const expAmount = Math.floor(expBoost);
        for (let i = 0; i < expAmount; i++) {
            if (!this.state.cropExp) this.state.cropExp = {};
            if (!this.state.cropExp[cropId]) this.state.cropExp[cropId] = 0;
            this.state.cropExp[cropId]++;
        }

        // Calculate Points
        const playerMultiplier = getPointMultiplier(this.state.level);
        const cropMultiplier = getCropLevelMultiplier(getCropLevel(this.state, cropId));
        const prestigePoints = getUpgradeEffect('basePoints', getUpgradeLevel(this.state, 'basePoints'));
        
        const luckyChance = getUpgradeEffect('luckyHarvest', getUpgradeLevel(this.state, 'luckyHarvest'));
        const luckyMultiplier = (Math.random() * 100 < luckyChance) ? 3 : 1;

        const earnedPoints = Math.floor(crop.basePoint * playerMultiplier * cropMultiplier * prestigePoints * luckyMultiplier);
        addPoints(this.state, earnedPoints);

        // Level Up
        const oldLevel = this.state.level;
        const { leveledUp, newLevel } = checkLevelUp(this.state);
        
        if (leveledUp) {
            if (newLevel % 10 === 0 || newLevel === 2) {
                this.log(`Reached Lv.${newLevel}`);
            }
        }

        // Reset Field
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

        // Limit gacha pulls so we don't spend all points instantly and stall. Keep a buffer.
        if (this.state.points > cost * 10) {
            this.state.points -= cost;
            
            // Randomly select from pool (ignoring rarities for simple sim)
            const roll = pool[Math.floor(Math.random() * pool.length)];
            if (!this.state.seedsInventory) this.state.seedsInventory = {};
            if (!this.state.seedsInventory[roll.id]) this.state.seedsInventory[roll.id] = 0;
            this.state.seedsInventory[roll.id]++;
        }
    }

    doPrestige() {
        const result = executePrestige(this.state);
        this.totalCurrencyEarned += result.currency;
        this.log(`Prestiged! Earned ${result.currency} currency`);
        
        // Auto-buy upgrades strategy
        // 1. basePoints
        // 2. growthSpeed
        // 3. gachaDiscount
        let currency = this.state.prestigeCurrency || 0;
        const priorities = ['basePoints', 'growthSpeed', 'cropExpBoost', 'luckyHarvest', 'gachaDiscount', 'gachaRarity'];
        
        let boughtSomething = true;
        while(boughtSomething && currency > 0) {
            boughtSomething = false;
            for (const id of priorities) {
                const upg = PRESTIGE_UPGRADES[id];
                const lv = getUpgradeLevel(this.state, id);
                if (lv < upg.maxLv) {
                    const cost = getUpgradeCost(upg, lv);
                    if (currency >= cost) {
                        purchaseUpgrade(this.state, id);
                        currency = this.state.prestigeCurrency;
                        boughtSomething = true;
                        this.log(`Bought ${upg.name} Lv.${getUpgradeLevel(this.state, id)}`);
                        break;
                    }
                }
            }
        }
    }
}
