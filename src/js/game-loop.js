// game-loop.js — ゲームループ（Tick処理）

import { CROP_MASTER, getDefaultCropId } from './master-data.js';
import { addPoints, consumeSeed, saveState, addCropExp, getCropLevel, getCropLevelMultiplier, getUpgradeLevel } from './game-state.js';
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

  // 収穫フェーズ
  if (state.fieldState.progress >= 1.0) {
    harvestCrop(state);
  }

  // 描画更新コールバック
  if (callbacks.onFieldUpdate) {
    callbacks.onFieldUpdate(state.fieldState);
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

  // インベントリから使える種を探す
  for (const [id, count] of Object.entries(state.seedsInventory)) {
    if (count > 0 && CROP_MASTER[id]) {
      cropId = id;
      break;
    }
  }

  // 種がなければデフォルト作物
  if (!cropId) {
    cropId = getDefaultCropId(state.level);
  } else {
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

  // 作物経験値を加算（cropExpBoost適用）
  const expBoost = getUpgradeEffect('cropExpBoost', getUpgradeLevel(state, 'cropExpBoost'));
  const expAmount = Math.floor(expBoost);
  for (let i = 0; i < expAmount; i++) addCropExp(state, cropId);

  // ポイント計算
  const playerMultiplier = getPointMultiplier(state.level);
  const cropLevel = getCropLevel(state, cropId);
  const cropMultiplier = getCropLevelMultiplier(cropLevel);
  const eventPointBoost = consumePointBoost();
  const prestigePoints = getUpgradeEffect('basePoints', getUpgradeLevel(state, 'basePoints'));

  // ラッキー収穫判定
  const luckyChance = getUpgradeEffect('luckyHarvest', getUpgradeLevel(state, 'luckyHarvest'));
  const luckyMultiplier = (Math.random() * 100 < luckyChance) ? 3 : 1;

  const earnedPoints = Math.floor(
    crop.basePoint * playerMultiplier * cropMultiplier * eventPointBoost * prestigePoints * luckyMultiplier
  );

  addPoints(state, earnedPoints);

  // 収穫コールバック
  if (callbacks.onHarvest) {
    callbacks.onHarvest(cropId, earnedPoints);
  }

  // レベルアップ判定
  const { leveledUp, newLevel } = checkLevelUp(state);
  if (leveledUp && callbacks.onLevelUp) {
    callbacks.onLevelUp(newLevel);
  }

  // 畑をリセット（次のtickで再び種植えへ）
  state.fieldState.isPlanted = false;
  state.fieldState.cropId = null;
  state.fieldState.plantedAt = null;
  state.fieldState.progress = 0;
}
