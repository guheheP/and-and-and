// game-state.js — ゲーム状態管理・セーブ/ロード

const SAVE_KEY = 'idle-farm-save';

import { PRESTIGE_CONFIG, PRESTIGE_UPGRADES, getUpgradeCost, getUpgradeEffect } from './prestige-data.js';
import { CROP_MASTER, LEVEL_UNLOCK_CROPS } from './master-data.js';

/**
 * 初期ゲーム状態を生成
 * @returns {GameState}
 */
function createEmptyField() {
  return { isPlanted: false, cropId: null, plantedAt: null, progress: 0 };
}

export function createInitialState() {
  return {
    points: 0,
    totalEarnedPoints: 0,
    playerExp: 0,
    totalEarnedExp: 0,
    level: 1,
    harvestCount: 0,
    seedsInventory: {},
    cropExp: {},
    currentCharId: 'human',
    fieldSlots: [createEmptyField()],
    selectedCropId: null, // 優先植え付けのターゲット
    colorPresets: [null, null, null, null, null], // カラープリセット5枠
    // プレステージ
    prestigeCount: 0,
    prestigeCurrency: 0,
    prestigeUpgrades: {},
    eventCounts: {},
  };
}

/**
 * ��方互換: fieldState は fieldSlots[0] のエイリアス
 * @param {GameState} state
 */
export function getFieldState(state) {
  return state.fieldSlots[0];
}

/**
 * 解放済みスロット数を取得
 * @param {GameState} state
 * @returns {number}
 */
export function getActiveSlotCount(state) {
  let count = 1;
  if (getUpgradeLevel(state, 'fieldSlot2') > 0) count = 2;
  if (getUpgradeLevel(state, 'fieldSlot3') > 0) count = 3;
  // fieldSlots配列が足りなければ拡張
  while (state.fieldSlots.length < count) {
    state.fieldSlots.push(createEmptyField());
  }
  return count;
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

    // fieldState → fieldSlots 移行
    if (saved.fieldState && !saved.fieldSlots) {
      saved.fieldSlots = [{ ...saved.fieldState }];
      delete saved.fieldState;
    }

    // 旧人型キャラID → 統合 'human' に変換
    const OLD_HUMAN_IDS = ['man', 'woman', 'boy', 'girl', 'grandpa', 'grandma'];
    if (OLD_HUMAN_IDS.includes(saved.currentCharId)) {
      saved.currentCharId = 'human';
    }
    if (saved.characterConfig && OLD_HUMAN_IDS.includes(saved.characterConfig.base)) {
      saved.characterConfig.base = 'human';
    }

    // 初期値とマージ（バージョン間のフィールド欠損を防止）
    const initial = createInitialState();
    const merged = {
      ...initial,
      ...saved,
      fieldSlots: (saved.fieldSlots || initial.fieldSlots).map((slot, i) => ({
        ...createEmptyField(),
        ...(slot || {}),
      })),
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

    // selectedCropId の整合性チェック（未解放作物が選択されていたらリセット）
    if (merged.selectedCropId) {
      const unlockedIds = [];
      for (const [lvl, ids] of Object.entries(LEVEL_UNLOCK_CROPS)) {
        if (merged.level >= Number(lvl)) unlockedIds.push(...ids);
      }
      if (!unlockedIds.includes(merged.selectedCropId)) {
        merged.selectedCropId = null;
      }
    }

    // seedsInventory から null キーを除去（過去の不具合データ対応）
    delete merged.seedsInventory['null'];
    delete merged.seedsInventory[null];

    return merged;
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
  const characterConfig = state.characterConfig ? { ...state.characterConfig } : undefined;
  const eventCounts = { ...(state.eventCounts || {}) };
  const colorPresets = state.colorPresets ? state.colorPresets.map(p => p ? { ...p } : null) : [null, null, null, null, null];
  const unlockedAchievements = [...(state.unlockedAchievements || [])];
  const unlockedParts = state.unlockedParts ? {
    hat: [...(state.unlockedParts.hat || [])],
    accessory: [...(state.unlockedParts.accessory || [])],
    base: [...(state.unlockedParts.base || [])],
  } : { hat: [], accessory: [], base: [] };

  // ゲーム部分をリセット
  const fresh = createInitialState();
  Object.assign(state, fresh);

  // プレステージデータを復元
  state.prestigeCount = prestigeCount;
  state.prestigeCurrency = prestigeCurrency;
  state.prestigeUpgrades = prestigeUpgrades;
  state.currentCharId = currentCharId;
  if (characterConfig) state.characterConfig = characterConfig;
  state.eventCounts = eventCounts;
  state.colorPresets = colorPresets;
  state.unlockedAchievements = unlockedAchievements;
  state.unlockedParts = unlockedParts;
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
