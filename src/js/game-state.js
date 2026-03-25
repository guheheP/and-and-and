// game-state.js — ゲーム状態管理・セーブ/ロード

const SAVE_KEY = 'idle-farm-save';

import { PRESTIGE_CONFIG, PRESTIGE_UPGRADES, getUpgradeCost } from './prestige-data.js';

/**
 * 初期ゲーム状態を生成
 * @returns {GameState}
 */
export function createInitialState() {
  return {
    points: 0,
    totalEarnedPoints: 0,
    level: 1,
    seedsInventory: {},
    cropExp: {},
    currentCharId: 'man',
    fieldState: {
      isPlanted: false,
      cropId: null,
      plantedAt: null,
      progress: 0,
    },
    // プレステージ
    prestigeCount: 0,
    prestigeCurrency: 0,
    prestigeUpgrades: {},
  };
}

/**
 * 状態をlocalStorageに保存
 * @param {GameState} state
 */
export function saveState(state) {
  try {
    const json = JSON.stringify(state);
    localStorage.setItem(SAVE_KEY, json);
  } catch (e) {
    console.error('セーブ失敗:', e);
  }
}

/**
 * localStorageから状態を読み込み
 * @returns {GameState}
 */
export function loadState() {
  try {
    const json = localStorage.getItem(SAVE_KEY);
    if (!json) return createInitialState();

    const saved = JSON.parse(json);
    // 初期値とマージ（バージョン間のフィールド欠損を防止）
    const initial = createInitialState();
    return {
      ...initial,
      ...saved,
      fieldState: {
        ...initial.fieldState,
        ...(saved.fieldState || {}),
      },
      seedsInventory: {
        ...initial.seedsInventory,
        ...(saved.seedsInventory || {}),
      },
      cropExp: {
        ...initial.cropExp,
        ...(saved.cropExp || {}),
      },
      prestigeUpgrades: {
        ...initial.prestigeUpgrades,
        ...(saved.prestigeUpgrades || {}),
      },
    };
  } catch (e) {
    console.error('ロード失敗:', e);
    return createInitialState();
  }
}

/**
 * セーブデータを削除
 */
export function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}

/**
 * ポイントを加算
 * @param {GameState} state
 * @param {number} amount
 */
export function addPoints(state, amount) {
  state.points += amount;
  state.totalEarnedPoints += amount;
}

/**
 * 種をインベントリに追加
 * @param {GameState} state
 * @param {string} cropId
 * @param {number} count
 */
export function addSeed(state, cropId, count = 1) {
  if (!state.seedsInventory[cropId]) {
    state.seedsInventory[cropId] = 0;
  }
  state.seedsInventory[cropId] += count;
}

/**
 * 種をインベントリから消費（0以下にはしない）
 * @param {GameState} state
 * @param {string} cropId
 * @returns {boolean} 消費できたかどうか
 */
export function consumeSeed(state, cropId) {
  if (!state.seedsInventory[cropId] || state.seedsInventory[cropId] <= 0) {
    return false;
  }
  state.seedsInventory[cropId] -= 1;
  return true;
}

/**
 * 作物の経験値を加算（収穫時に呼ぶ）
 * @param {GameState} state
 * @param {string} cropId
 */
export function addCropExp(state, cropId) {
  if (!state.cropExp[cropId]) {
    state.cropExp[cropId] = 0;
  }
  state.cropExp[cropId] += 1;
}

/**
 * 作物のレベルを取得
 * 収穫5回ごとにレベルアップ（上限なし）
 * @param {GameState} state
 * @param {string} cropId
 * @returns {number}
 */
export function getCropLevel(state, cropId) {
  const exp = state.cropExp[cropId] || 0;
  return Math.floor(exp / 5) + 1;
}

/**
 * 作物レベルに応じたポイント倍率
 * Lv.1=x1.00, Lv.2=x1.01, Lv.100=x1.99 ...
 * @param {number} cropLevel
 * @returns {number}
 */
export function getCropLevelMultiplier(cropLevel) {
  return 1.0 + (cropLevel - 1) * 0.01;
}

// ============================================
//  プレステージ
// ============================================

/**
 * プレステージ実行
 * ゲーム状態をリセットし、通貨を獲得
 * @param {GameState} state
 * @returns {{ currency: number }} 獲得した通貨
 */
export function executePrestige(state) {
  const earned = PRESTIGE_CONFIG.getCurrency(state.level);

  // プレステージ永続データを退避
  const prestigeCount = (state.prestigeCount || 0) + 1;
  const prestigeCurrency = (state.prestigeCurrency || 0) + earned;
  const prestigeUpgrades = { ...(state.prestigeUpgrades || {}) };
  const currentCharId = state.currentCharId;

  // ゲーム部分をリセット
  const fresh = createInitialState();
  Object.assign(state, fresh);

  // プレステージデータを復元
  state.prestigeCount = prestigeCount;
  state.prestigeCurrency = prestigeCurrency;
  state.prestigeUpgrades = prestigeUpgrades;
  state.currentCharId = currentCharId;

  saveState(state);
  return { currency: earned };
}

/**
 * 強化を購入
 * @param {GameState} state
 * @param {string} upgradeId
 * @returns {{ success: boolean, message: string }}
 */
export function purchaseUpgrade(state, upgradeId) {
  const upgrade = PRESTIGE_UPGRADES[upgradeId];
  if (!upgrade) return { success: false, message: '不明な強化' };

  const currentLv = getUpgradeLevel(state, upgradeId);
  if (currentLv >= upgrade.maxLv) {
    return { success: false, message: '最大レベルです' };
  }

  const cost = getUpgradeCost(upgrade, currentLv);
  if ((state.prestigeCurrency || 0) < cost) {
    return { success: false, message: `通貨不足（必要: ${cost}）` };
  }

  state.prestigeCurrency -= cost;
  if (!state.prestigeUpgrades) state.prestigeUpgrades = {};
  state.prestigeUpgrades[upgradeId] = currentLv + 1;

  saveState(state);
  return { success: true, message: `${upgrade.name} Lv.${currentLv + 1}` };
}

/**
 * 強化レベルを取得
 * @param {GameState} state
 * @param {string} upgradeId
 * @returns {number}
 */
export function getUpgradeLevel(state, upgradeId) {
  return (state.prestigeUpgrades && state.prestigeUpgrades[upgradeId]) || 0;
}
