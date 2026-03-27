// game-state.js — ゲーム状態管理・セーブ/ロード

const SAVE_KEY = 'idle-farm-save';

import { PRESTIGE_CONFIG, PRESTIGE_UPGRADES, getUpgradeCost, getUpgradeEffect } from './prestige-data.js';
import { CROP_MASTER } from './master-data.js';

/**
 * 初期ゲーム状態を生成
 * @returns {GameState}
 */
export function createInitialState() {
  return {
    points: 0,
    totalEarnedPoints: 0,
    playerExp: 0,
    totalEarnedExp: 0,
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
    selectedCropId: null, // 優先植え付けのターゲット
    // プレステージ
    prestigeCount: 0,
    prestigeCurrency: 0,
    prestigeUpgrades: {},
    eventCounts: {},
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

    // 互換性パッチ：旧バージョンのポイントを初期EXPに変換
    if (saved.totalEarnedExp === undefined && saved.totalEarnedPoints !== undefined) {
      saved.totalEarnedExp = saved.totalEarnedPoints;
      saved.playerExp = saved.points;
    }

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
 * プレイヤー経験値を加算
 * @param {GameState} state
 * @param {number} amount
 */
export function addPlayerExp(state, amount) {
  if (state.playerExp === undefined) state.playerExp = 0;
  if (state.totalEarnedExp === undefined) state.totalEarnedExp = 0;
  state.playerExp += amount;
  state.totalEarnedExp += amount;
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
 * Lv N→N+1 に必要なexp = N（累計 = N*(N-1)/2）
 * @param {GameState} state
 * @param {string} cropId
 * @returns {number}
 */
export function getCropLevel(state, cropId) {
  const exp = state.cropExp[cropId] || 0;
  return Math.floor((1 + Math.sqrt(1 + 8 * exp)) / 2);
}

/**
 * 作物の現在レベル内での経験値進捗を取得
 * @param {GameState} state
 * @param {string} cropId
 * @returns {{ current: number, required: number }}
 */
export function getCropLevelProgress(state, cropId) {
  const exp = state.cropExp[cropId] || 0;
  const level = getCropLevel(state, cropId);
  const totalForCurrentLevel = level * (level - 1) / 2;
  return {
    current: exp - totalForCurrentLevel,
    required: level,
  };
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

/**
 * 作物が無限化（種消費なし）されているか判定
 * トマトは初期から無限、それ以外は作物レベル100で無限化
 * @param {GameState} state
 * @param {string} cropId
 * @returns {boolean}
 */
export function isCropInfinite(state, cropId) {
  if (cropId === 'tomato') return true;
  const crop = CROP_MASTER[cropId];
  if (!crop) return false;
  return getCropLevel(state, cropId) >= 100;
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
  const earned = PRESTIGE_CONFIG.getCurrency(state);

  // プレステージ永続データを退避
  const prestigeCount = (state.prestigeCount || 0) + 1;
  const prestigeCurrency = (state.prestigeCurrency || 0) + earned;
  const prestigeUpgrades = { ...(state.prestigeUpgrades || {}) };
  const currentCharId = state.currentCharId;
  const eventCounts = { ...(state.eventCounts || {}) };

  // ゲーム部分をリセット
  const fresh = createInitialState();
  Object.assign(state, fresh);

  // プレステージデータを復元
  state.prestigeCount = prestigeCount;
  state.prestigeCurrency = prestigeCurrency;
  state.prestigeUpgrades = prestigeUpgrades;
  state.currentCharId = currentCharId;
  state.eventCounts = eventCounts;
  state.selectedCropId = null; // リセットで種が消えるためターゲットもリセット

  // リセットボーナス（startBonus）のポイント付与
  const startBonusLv = prestigeUpgrades['startBonus'] || 0;
  if (startBonusLv > 0) {
    const bonusPts = getUpgradeEffect('startBonus', startBonusLv);
    state.points += bonusPts;
    state.totalEarnedPoints += bonusPts;
  }

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
