// game-loop.js — ゲームループ（Tick処理）

import { CROP_MASTER } from './master-data.js';
import { addPoints, addPlayerExp, consumeSeed, saveState, addCropExp, getCropLevel, getCropLevelMultiplier, getUpgradeLevel, isCropInfinite } from './game-state.js';
import { checkLevelUp, getPointMultiplier } from './progression.js';
import { updateEventSystem, getGrowthMultiplier, consumePointBoost } from './event-system.js';
import { getUpgradeEffect } from './prestige-data.js';

/** @type {number|null} */
let loopId = null;

/** @type {number} */
let lastTickTime = 0;

/** 自動セーブ間隔 (ms) */
const AUTO_SAVE_INTERVAL = 10000;
let lastSaveTime = 0;

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

  // 種植えフェーズ
  if (!state.fieldState.isPlanted) {
    plantCrop(state);
  }

  // 成長フェーズ
  if (state.fieldState.isPlanted) {
    updateGrowth(state, currentTime);
  }

  // 描画更新コールバック（収穫前に呼ぶ → 成長中の作物を描画）
  if (callbacks.onFieldUpdate) {
    callbacks.onFieldUpdate(state.fieldState);
  }

  // 収穫フェーズ（描画後に実行）
  if (state.fieldState.progress >= 1.0) {
    harvestCrop(state);
  }

  // 自動セーブ
  if (currentTime - lastSaveTime > AUTO_SAVE_INTERVAL) {
    saveState(state);
    lastSaveTime = currentTime;
  }

  // 次フレーム
  loopId = requestAnimationFrame((time) => tick(state, time));
}

/**
 * 種植えフェーズ
 * @param {GameState} state
 */
function plantCrop(state) {
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

  state.fieldState.isPlanted = true;
  state.fieldState.cropId = cropId;
  state.fieldState.plantedAt = Date.now();
  state.fieldState.progress = 0;

  if (callbacks.onPlant) {
    callbacks.onPlant(cropId);
  }
}

/**
 * 成長フェーズ
 * @param {GameState} state
 * @param {number} currentTime - performance.now() の値（進捗計算にはDate.nowを使用）
 */
function updateGrowth(state, currentTime) {
  const crop = CROP_MASTER[state.fieldState.cropId];
  if (!crop) return;

  const elapsed = Date.now() - state.fieldState.plantedAt;
  const growthMult = getGrowthMultiplier() * (window.DEBUG_SPEED_MULTIPLIER || 1);
  const prestigeGrowth = getUpgradeEffect('growthSpeed', getUpgradeLevel(state, 'growthSpeed'));
  const effectiveGrowTime = crop.growTimeMs * prestigeGrowth / growthMult;
  state.fieldState.progress = Math.min(elapsed / effectiveGrowTime, 1.0);
}

/**
 * 収穫フェーズ
 * @param {GameState} state
 */
function harvestCrop(state) {
  const crop = CROP_MASTER[state.fieldState.cropId];
  if (!crop) return;

  const cropId = state.fieldState.cropId;
  const basePoint = crop.basePoint;
  const baseExp = crop.baseExp || basePoint;

  // ラッキー収穫判定
  const luckyChance = getUpgradeEffect('luckyHarvest', getUpgradeLevel(state, 'luckyHarvest'));
  const luckyMultiplier = (Math.random() * 100 < luckyChance) ? 3 : 1;

  // 各種倍率
  const prestigeMult = getUpgradeEffect('basePoints', getUpgradeLevel(state, 'basePoints'));
  const playerPointMult = getPointMultiplier(state.level);
  const eventGrowMult = getGrowthMultiplier(); // TODO: 必要時適用
  const boostMult = consumePointBoost();
  const cropLevelMult = getCropLevelMultiplier(getCropLevel(state, cropId));

  // ポイント加算（プレイヤーLv倍率はポイント専用）
  const gainedPoints = Math.floor(basePoint * playerPointMult * cropLevelMult * prestigeMult * boostMult * luckyMultiplier);
  addPoints(state, gainedPoints);

  // EXP加算（EXP専用プレステージ倍率を適用）
  const expPrestigeMult = getUpgradeEffect('expMultiplier', getUpgradeLevel(state, 'expMultiplier'));
  const gainedExp = Math.floor(baseExp * cropLevelMult * expPrestigeMult * boostMult * luckyMultiplier);
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

  // 畑をリセット
  state.fieldState.isPlanted = false;
  state.fieldState.cropId = null;
  state.fieldState.plantedAt = null;
  state.fieldState.progress = 0;
}
