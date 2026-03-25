// progression.js — レベルアップ・進行システム

import { getLevelThreshold, LEVEL_UNLOCK_CROPS, CROP_MASTER } from './master-data.js';

/**
 * レベルアップ判定と適用
 * @param {GameState} state
 * @returns {{ leveledUp: boolean, newLevel: number }}
 */
export function checkLevelUp(state) {
  const oldLevel = state.level;
  let newLevel = oldLevel;

  // 次のレベルの閾値を超えている限りレベルアップ
  while (state.totalEarnedPoints >= getLevelThreshold(newLevel + 1)) {
    newLevel++;
  }

  if (newLevel > oldLevel) {
    state.level = newLevel;
    return { leveledUp: true, newLevel };
  }

  return { leveledUp: false, newLevel: oldLevel };
}

/**
 * レベルに応じたポイント倍率
 * 基本: 1.0 + (level - 1) * 0.1
 * Lv.1 = x1.0, Lv.5 = x1.4, Lv.10 = x1.9, Lv.15 = x2.4
 * @param {number} level
 * @returns {number}
 */
export function getPointMultiplier(level) {
  return 1.0 + (level - 1) * 0.1;
}

/**
 * 指定レベルまでに解放されている作物IDリストを取得
 * @param {number} level
 * @returns {string[]}
 */
export function getUnlockedCrops(level) {
  const unlocked = [];
  for (const [lvStr, cropIds] of Object.entries(LEVEL_UNLOCK_CROPS)) {
    if (level >= Number(lvStr)) {
      unlocked.push(...cropIds);
    }
  }
  return unlocked;
}

/**
 * ガチャプールに入る作物リストを取得（レベルで解放済みの作物のみ）
 * @param {number} level
 * @returns {CropData[]}
 */
export function getGachaPool(level) {
  const unlockedIds = getUnlockedCrops(level);
  return unlockedIds
    .filter((id) => CROP_MASTER[id] && !CROP_MASTER[id].isDefault && !CROP_MASTER[id].isEventOnly)
    .map((id) => CROP_MASTER[id]);
}

/**
 * 次のレベルアップまでに必要なポイント
 * @param {GameState} state
 * @returns {number}
 */
export function getPointsToNextLevel(state) {
  return getLevelThreshold(state.level + 1) - state.totalEarnedPoints;
}
