// gacha.js — ガチャシステム

import { CROP_MASTER, GACHA_CONFIG } from './master-data.js';
import { addSeed, getUpgradeLevel } from './game-state.js';
import { getGachaPool } from './progression.js';
import { getUpgradeEffect } from './prestige-data.js';

/**
 * ガチャのコストを取得（プレステージ割引適用）
 * @param {GameState} state
 * @returns {number}
 */
export function getGachaCost(state) {
  const discount = getUpgradeEffect('gachaDiscount', getUpgradeLevel(state, 'gachaDiscount'));
  return Math.floor(GACHA_CONFIG.cost * discount);
}

/**
 * ガチャを回す
 * @param {GameState} state
 * @returns {{ success: boolean, cropId?: string, cropData?: CropData, message: string }}
 */
export function rollGacha(state) {
  const cost = getGachaCost(state);

  if (state.points < cost) {
    return {
      success: false,
      message: `ポイントが足りません（${cost}pt 必要）`,
    };
  }

  const pool = getGachaPool(state.level);
  if (pool.length === 0) {
    return {
      success: false,
      message: 'ガチャで入手できる作物がありません',
    };
  }

  state.points -= cost;
  const selected = weightedRandom(pool, state);
  addSeed(state, selected.id);

  return {
    success: true,
    cropId: selected.id,
    cropData: selected,
    message: `「${selected.name}」の種を入手！`,
  };
}

/**
 * 10連ガチャ
 * @param {GameState} state
 * @returns {{ success: boolean, results?: Array, message: string }}
 */
export function rollGachaMulti(state) {
  const count = 10;
  const singleCost = getGachaCost(state);
  const totalCost = singleCost * (count - 1); // 9回分のコスト

  if (state.points < totalCost) {
    return {
      success: false,
      message: `ポイントが足りません（${totalCost}pt 必要）`,
    };
  }

  const pool = getGachaPool(state.level);
  if (pool.length === 0) {
    return {
      success: false,
      message: 'ガチャで入手できる作物がありません',
    };
  }

  state.points -= totalCost;

  const results = [];
  for (let i = 0; i < count; i++) {
    const selected = weightedRandom(pool, state);
    addSeed(state, selected.id);
    results.push(selected);
  }

  return {
    success: true,
    results,
    message: `10連ガチャ完了！`,
  };
}

/**
 * 10連ガチャが解放されているか
 * @param {GameState} state
 * @returns {boolean}
 */
export function isMultiGachaUnlocked(state) {
  return getUpgradeEffect('gachaMulti', getUpgradeLevel(state, 'gachaMulti')) >= 1;
}

/**
 * レアリティに基づく加重ランダム抽選（gachaRarity適用）
 * @param {CropData[]} pool
 * @param {GameState} state
 * @returns {CropData}
 */
function weightedRandom(pool, state) {
  const rarityBoost = getUpgradeEffect('gachaRarity', getUpgradeLevel(state, 'gachaRarity'));

  const weights = pool.map((crop) => {
    const baseWeight = GACHA_CONFIG.rarityWeights[crop.rarity] || 1;
    // 高レア（rarity >= 3）の重みを増加
    if (crop.rarity >= 3) {
      return baseWeight * rarityBoost;
    }
    return baseWeight;
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < pool.length; i++) {
    random -= weights[i];
    if (random <= 0) return pool[i];
  }

  return pool[pool.length - 1];
}
