// game-loop.js — ゲームループ（Tick処理）

import { CROP_MASTER } from './master-data.js';
import { addPoints, addPlayerExp, consumeSeed, saveState, addCropExp, addCropHarvestCount, getCropLevel, getCropLevelMultiplier, getUpgradeLevel, getTranscendLevel, isCropInfinite, getActiveSlotCount, canTranscend, executePrestige } from './game-state.js';
import { checkLevelUp, getPointMultiplier } from './progression.js';
import { updateEventSystem, getGrowthMultiplier, consumePointBoost } from './event-system.js';
import { checkAchievements } from './achievement-system.js';
import { getUpgradeEffect } from './prestige-data.js';
import { getTranscendEffect } from './transcend-data.js';
import { rollGacha } from './gacha.js';

/** @type {number|null} */
let loopId = null;

/** @type {number} */
let lastTickTime = 0;

/** 自動セーブ間隔 (ms) */
const AUTO_SAVE_INTERVAL = 10000;
let lastSaveTime = 0;

/** 自動購入タイマー (ms) */
const AUTO_GACHA_INTERVAL = 5000;
let lastAutoGachaTime = 0;

/** 自動転生後のレベル（無限ループ防止用） */
let lastAutoPrestigeLevel = -1;

/**
 * コールバック: 描画更新やイベント通知に使用
 * @type {{ onFieldUpdate: Function, onHarvest: Function, onLevelUp: Function, onPlant: Function }}
 */
let callbacks = {};

/**
 * ゲームループを開始
 * @param {GameState} state
 * @param {Object} cbs - コールバック関数のオブジェクト
 */
export function startGameLoop(state, cbs = {}) {
  callbacks = cbs;
  lastTickTime = performance.now();
  lastSaveTime = lastTickTime;
  lastAutoGachaTime = lastTickTime;
  loopId = requestAnimationFrame((time) => tick(state, time));
}

/**
 * ゲームループを停止
 */
export function stopGameLoop() {
  if (loopId !== null) {
    cancelAnimationFrame(loopId);
    loopId = null;
  }
}

/**
 * メインTick処理
 * @param {GameState} state
 * @param {number} currentTime
 */
function tick(state, currentTime) {
  const deltaMs = currentTime - lastTickTime;
  lastTickTime = currentTime;

  // イベントシステム更新
  updateEventSystem(currentTime);

  // 全スロットを処理
  const slotCount = getActiveSlotCount(state);
  for (let i = 0; i < slotCount; i++) {
    const slot = state.fieldSlots[i];

    // 種植えフェーズ
    if (!slot.isPlanted) {
      plantCrop(state, slot);
    }

    // 成長フェーズ
    if (slot.isPlanted) {
      updateGrowth(state, slot, currentTime);
    }

    // 描画更新コールバック
    if (callbacks.onFieldUpdate) {
      callbacks.onFieldUpdate(slot, i);
    }

    // 収穫フェーズ
    if (slot.progress >= 1.0) {
      harvestCrop(state, slot, i);
    }
  }

  // 自動購入
  const autoLv = getUpgradeLevel(state, 'autoGacha');
  if (autoLv > 0 && currentTime - lastAutoGachaTime > AUTO_GACHA_INTERVAL) {
    lastAutoGachaTime = currentTime;
    const buyCount = Math.pow(2, autoLv - 1);
    for (let i = 0; i < buyCount; i++) {
      const result = rollGacha(state);
      if (!result.success) break; // ポイント不足などで停止
    }
  }

  // 実績チェックと自動セーブ
  if (currentTime - lastSaveTime > AUTO_SAVE_INTERVAL) {
    // プレイ時間加算（10秒ごと）
    if (state.totalPlayTime === undefined) state.totalPlayTime = 0;
    state.totalPlayTime += AUTO_SAVE_INTERVAL / 1000;

    checkAchievements(state);

    // 自動転生チェック
    const autoPrestigeLv = getTranscendLevel(state, 't_autoPrestige');
    const autoThreshold = state.autoPrestigeLevel || 0;
    if (autoPrestigeLv > 0 && autoThreshold > 0 && state.level >= autoThreshold) {
      // 無限ループ防止: 転生直後のレベルと同じなら実際にプレイで上がっていない
      if (state.level >= 50 && state.level !== lastAutoPrestigeLevel) {
        executePrestige(state);
        lastAutoPrestigeLevel = state.level; // 転生後のレベルを記録
        if (callbacks.onAutoPrestige) callbacks.onAutoPrestige();
      }
    } else {
      // 閾値以下になったらリセット（次回の転生を許可）
      lastAutoPrestigeLevel = -1;
    }

    saveState(state);
    lastSaveTime = currentTime;
  }

  // 次フレーム
  loopId = requestAnimationFrame((time) => tick(state, time));
}

/**
 * 種植えフェーズ
 * @param {GameState} state
 * @param {Object} slot - 畑スロット
 */
function plantCrop(state, slot) {
  let cropId = null;

  // 1. 優先指定の確認
  if (state.selectedCropId && CROP_MASTER[state.selectedCropId]) {
    const isInf = isCropInfinite(state, state.selectedCropId);
    const hasSeeds = (state.seedsInventory[state.selectedCropId] || 0) > 0;
    if (isInf || hasSeeds) {
      cropId = state.selectedCropId;
    }
  }

  // 2. 指定がない/植えられない場合、植えられる作物からランダム選択
  if (!cropId) {
    const allAvailable = [];
    for (const id of Object.keys(CROP_MASTER)) {
      const isInf = isCropInfinite(state, id);
      const hasSeeds = (state.seedsInventory[id] || 0) > 0;
      if (isInf || hasSeeds) {
        allAvailable.push(id);
      }
    }
    if (allAvailable.length > 0) {
      cropId = allAvailable[Math.floor(Math.random() * allAvailable.length)];
    }
  }

  // 3. 安全装置（枯渇時フォールバック。通常トマトが無限なので発生しない）
  if (!cropId) {
    cropId = 'tomato';
  }

  // 無限化されていない場合のみ種を消費
  if (!isCropInfinite(state, cropId)) {
    consumeSeed(state, cropId);
  }

  slot.isPlanted = true;
  slot.cropId = cropId;
  slot.plantedAt = Date.now();
  slot.progress = 0;

  if (callbacks.onPlant) {
    callbacks.onPlant(cropId);
  }
}

/**
 * 成長フェーズ
 * @param {GameState} state
 * @param {Object} slot - 畑スロット
 * @param {number} currentTime
 */
function updateGrowth(state, slot, currentTime) {
  const crop = CROP_MASTER[slot.cropId];
  if (!crop) return;

  const elapsed = Date.now() - slot.plantedAt;
  const growthMult = getGrowthMultiplier() * (window.DEBUG_SPEED_MULTIPLIER || 1);
  const prestigeGrowth = getUpgradeEffect('growthSpeed', getUpgradeLevel(state, 'growthSpeed'));
  const transcendGrowth = getTranscendEffect('t_growthBase', getTranscendLevel(state, 't_growthBase'));
  const effectiveGrowTime = crop.growTimeMs * prestigeGrowth * transcendGrowth / growthMult;
  slot.progress = Math.min(elapsed / effectiveGrowTime, 1.0);
}

/**
 * 収穫フェーズ
 * @param {GameState} state
 * @param {Object} slot - 畑スロット
 * @param {number} slotIndex
 */
function harvestCrop(state, slot, slotIndex) {
  const crop = CROP_MASTER[slot.cropId];
  if (!crop) return;

  const cropId = slot.cropId;
  const basePoint = crop.basePoint;
  const baseExp = crop.baseExp || basePoint;

  // ラッキー収穫判定
  const luckyChance = getUpgradeEffect('luckyHarvest', getUpgradeLevel(state, 'luckyHarvest'));
  const luckyMultiplier = (Math.random() * 100 < luckyChance) ? 3 : 1;

  // 各種倍率
  const prestigeMult = getUpgradeEffect('basePoints', getUpgradeLevel(state, 'basePoints'));
  const playerPointMult = getPointMultiplier(state.level);
  const boostMult = consumePointBoost();
  const cropLevelMult = getCropLevelMultiplier(getCropLevel(state, cropId));

  // 超越倍率
  const transcendPtMult = getTranscendEffect('t_baseMultiplier', getTranscendLevel(state, 't_baseMultiplier'));
  const transcendExpMult = getTranscendEffect('t_expMultiplier', getTranscendLevel(state, 't_expMultiplier'));

  // ポイント加算（プレイヤーLv倍率はポイント専用）
  const gainedPoints = Math.floor(basePoint * playerPointMult * cropLevelMult * prestigeMult * boostMult * luckyMultiplier * transcendPtMult);
  addPoints(state, gainedPoints);

  // EXP加算（EXP専用プレステージ倍率を適用）
  const expPrestigeMult = getUpgradeEffect('expMultiplier', getUpgradeLevel(state, 'expMultiplier'));
  const gainedExp = Math.floor(baseExp * cropLevelMult * expPrestigeMult * boostMult * luckyMultiplier * transcendExpMult);
  addPlayerExp(state, gainedExp);

  // 作物自体の経験値加算 (cropExpBoost適用)
  const expBoost = getUpgradeEffect('cropExpBoost', getUpgradeLevel(state, 'cropExpBoost'));
  const cropExpAmount = Math.floor(expBoost);
  for (let i = 0; i < cropExpAmount; i++) addCropExp(state, cropId);

  // 収穫コールバック
  if (callbacks.onHarvest) {
    callbacks.onHarvest(cropId, gainedPoints);
  }

  // レベルアップ判定
  const { leveledUp, newLevel } = checkLevelUp(state);
  if (leveledUp && callbacks.onLevelUp) {
    callbacks.onLevelUp(newLevel);
  }

  // 収穫回数を記録（実績判定用）
  state.harvestCount = (state.harvestCount || 0) + 1;

  // 作物別収穫回数を記録（図鑑用）
  addCropHarvestCount(state, cropId);

  // 畑をリセット
  slot.isPlanted = false;
  slot.cropId = null;
  slot.plantedAt = null;
  slot.progress = 0;
}
