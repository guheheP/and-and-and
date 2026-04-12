// prestige-data.js — プレステージ強化定義

/**
 * プレステージ設定
 */
export const PRESTIGE_CONFIG = {
  minLevel: 50,
  // プレステージ周回数に応じて指数を少しずつ上げ、最高効率のポイントを後退させる
  getCurrency: (state) => {
    const level = Math.max(0, state.level - 45);
    const count = state.prestigeCount || 0;
    // 基礎指数1.5からスタートし、1周ごとに+0.05（最大2.5まで）
    const exponent = Math.min(2.5, 1.5 + count * 0.05);
    return Math.max(1, Math.floor(Math.pow(level, exponent)));
  },
};

/**
 * 強化のコストを算出
 * @param {Object} upgrade - PRESTIGE_UPGRADES のエントリ
 * @param {number} currentLv - 現在の強化レベル
 * @returns {number}
 */
export function getUpgradeCost(upgrade, currentLv) {
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costScale, currentLv));
}

/**
 * 強化の効果値を算出
 * @param {string} upgradeId
 * @param {number} level - 強化レベル
 * @returns {number}
 */
export function getUpgradeEffect(upgradeId, level) {
  if (level <= 0) {
    if (['gachaMulti', 'gacha50', 'gacha100', 'autoGacha', 'fieldSlot2', 'fieldSlot3'].includes(upgradeId)) return 0;
    if (upgradeId === 'startBonus') return 0;
    return 1.0;
  }

  switch (upgradeId) {
    case 'growthSpeed':
      // Lv1-20: 1レベルごとに-4.5% (Lv20で×0.10＝10倍速)
      // Lv21-30: 下限を突破して指数的に短縮
      if (level <= 20) {
        return Math.max(1 - level * 0.045, 0.10);
      }
      return 0.10 * Math.pow(0.85, level - 20);
    case 'basePoints':
      // 1レベルごとに+50% (最大Lv20で11倍)
      return 1 + level * 0.5;
    case 'expMultiplier':
      // プレイヤーEXP倍率: 1レベルごとに+50% (最大Lv20で11倍)
      return 1 + level * 0.5;
    case 'luckyHarvest':
      // ラッキー発生確率（%）
      return level * 3;
    case 'cropExpBoost':
      // 作物経験値倍率
      return 1 + level * 0.1;
    case 'gachaDiscount':
      // ガチャコスト軽減率（最低50%）
      return Math.max(1 - level * 0.05, 0.5);
    case 'gachaRarity':
      // 高レア重み倍率
      return 1 + level * 0.3;
    case 'eventRate':
      // イベント発生確率の追加%
      return level * 1.5;
    case 'eventPower':
      // イベント効果倍率
      return 1 + level * 0.1;
    case 'eventDuration':
      // イベント持続時間倍率
      return 1 + level * 0.1;
    case 'gachaMulti':
    case 'gacha50':
    case 'gacha100':
      // ガチャ解放（0 or 1）
      return level >= 1 ? 1 : 0;
    case 'autoGacha':
      // 5秒あたりの自動購入数: 2^(Lv-1)
      return Math.pow(2, level - 1);
    case 'startBonus':
      // プレステージ後の初期ポイント
      return level * 500;
    case 'fieldSlot2':
    case 'fieldSlot3':
      // 畑スロット解放（0 or 1）
      return level >= 1 ? 1 : 0;
    default:
      return 1.0;
  }
}

/**
 * 強化テーブル
 */
export const PRESTIGE_UPGRADES = {
  // 🌱 成長系
  growthSpeed: {
    id: 'growthSpeed',
    name: '🌱 成長速度UP',
    description: '作物の成長時間を短縮',
    category: 'growth',
    maxLv: 30,
    baseCost: 3,
    costScale: 1.5,
    effectLabel: (lv) => {
      if (lv <= 0) return '効果なし';
      const mult = getUpgradeEffect('growthSpeed', lv);
      return mult >= 0.01
        ? `成長時間 ×${mult.toFixed(2)}`
        : `成長時間 ×${mult.toFixed(3)}`;
    },
  },
  basePoints: {
    id: 'basePoints',
    name: '💰 ポイント倍率',
    description: '収穫ポイントを増加',
    category: 'growth',
    maxLv: 20,
    baseCost: 5,
    costScale: 1.8,
    effectLabel: (lv) => lv > 0 ? `獲得pt ×${getUpgradeEffect('basePoints', lv).toFixed(1)}` : '効果なし',
  },
  luckyHarvest: {
    id: 'luckyHarvest',
    name: '🍀 ラッキー収穫',
    description: '確率で収穫ポイント3倍',
    category: 'growth',
    maxLv: 10,
    baseCost: 10,
    costScale: 2.0,
    effectLabel: (lv) => lv > 0 ? `${getUpgradeEffect('luckyHarvest', lv)}%でpt×3` : '効果なし',
  },
  cropExpBoost: {
    id: 'cropExpBoost',
    name: '📈 作物Exp UP',
    description: '作物経験値の獲得量を増加',
    category: 'growth',
    maxLv: 10,
    baseCost: 8,
    costScale: 2.0,
    effectLabel: (lv) => lv > 0 ? `作物Exp ×${getUpgradeEffect('cropExpBoost', lv).toFixed(1)}` : '効果なし',
  },
  expMultiplier: {
    id: 'expMultiplier',
    name: '📚 EXP倍率UP',
    description: 'プレイヤーEXPの獲得量を増加',
    category: 'growth',
    maxLv: 20,
    baseCost: 5,
    costScale: 1.8,
    effectLabel: (lv) => lv > 0 ? `EXP ×${getUpgradeEffect('expMultiplier', lv).toFixed(1)}` : '効果なし',
  },

  // 🎰 ガチャ系
  gachaDiscount: {
    id: 'gachaDiscount',
    name: '🏷️ ガチャ割引',
    description: 'ガチャのコストを削減',
    category: 'gacha',
    maxLv: 10,
    baseCost: 8,
    costScale: 2.0,
    effectLabel: (lv) => lv > 0 ? `コスト ×${getUpgradeEffect('gachaDiscount', lv).toFixed(2)}` : '効果なし',
  },
  gachaRarity: {
    id: 'gachaRarity',
    name: '✨ レア率UP',
    description: '高レアリティの排出率を増加',
    category: 'gacha',
    maxLv: 5,
    baseCost: 20,
    costScale: 2.2,
    effectLabel: (lv) => lv > 0 ? `高レア重み ×${getUpgradeEffect('gachaRarity', lv).toFixed(2)}` : '効果なし',
  },
  autoGacha: {
    id: 'autoGacha',
    name: '🤖 自動購入',
    description: '5秒ごとに自動で種を購入',
    category: 'gacha',
    maxLv: 8,
    baseCost: 500,
    costScale: 2.2,
    effectLabel: (lv) => lv > 0 ? `5秒ごとに${Math.pow(2, lv - 1)}個` : '効果なし',
  },
  gachaMulti: {
    id: 'gachaMulti',
    name: '🔟 10連購入',
    description: '10連購入を解放',
    category: 'gacha',
    maxLv: 1,
    baseCost: 30,
    costScale: 1.0,
    effectLabel: (lv) => lv >= 1 ? '解放済み' : '未解放',
  },
  gacha50: {
    id: 'gacha50',
    name: '🎰 50連購入',
    description: '50連購入を解放',
    category: 'gacha',
    maxLv: 1,
    baseCost: 1000,
    costScale: 1.0,
    effectLabel: (lv) => lv >= 1 ? '解放済み' : '未解放',
  },
  gacha100: {
    id: 'gacha100',
    name: '🌟 100連購入',
    description: '100連購入を解放',
    category: 'gacha',
    maxLv: 1,
    baseCost: 5000,
    costScale: 1.0,
    effectLabel: (lv) => lv >= 1 ? '解放済み' : '未解放',
  },

  // 🎲 イベント系
  eventRate: {
    id: 'eventRate',
    name: '🎲 イベント率UP',
    description: 'ランダムイベントの発生確率を増加',
    category: 'event',
    maxLv: 10,
    baseCost: 10,
    costScale: 2.0,
    effectLabel: (lv) => lv > 0 ? `発生率 +${getUpgradeEffect('eventRate', lv)}%` : '効果なし',
  },
  eventPower: {
    id: 'eventPower',
    name: '⚡ イベント効果UP',
    description: 'イベントの成長倍率を強化',
    category: 'event',
    maxLv: 10,
    baseCost: 10,
    costScale: 2.0,
    effectLabel: (lv) => lv > 0 ? `効果 ×${getUpgradeEffect('eventPower', lv).toFixed(1)}` : '効果なし',
  },
  eventDuration: {
    id: 'eventDuration',
    name: '⏱️ イベント延長',
    description: 'イベントの持続時間を延長',
    category: 'event',
    maxLv: 10,
    baseCost: 10,
    costScale: 2.0,
    effectLabel: (lv) => lv > 0 ? `持続 ×${getUpgradeEffect('eventDuration', lv).toFixed(1)}` : '効果なし',
  },

  // 💰 ボーナス系
  startBonus: {
    id: 'startBonus',
    name: '💰 リセットボーナス',
    description: 'プレステージ後の初期ポイント',
    category: 'bonus',
    maxLv: 10,
    baseCost: 100,
    costScale: 2.0,
    effectLabel: (lv) => lv > 0 ? `初期 ${getUpgradeEffect('startBonus', lv)}pt` : '効果なし',
  },
  // ── 畑拡張 ──
  fieldSlot2: {
    id: 'fieldSlot2',
    name: '🌾 2つ目の畑',
    description: '同時に2つの作物を栽培できるようになる',
    category: 'bonus',
    maxLv: 1,
    baseCost: 50,
    costScale: 1.0,
    effectLabel: (lv) => lv > 0 ? '解放済み' : '未解放',
  },
  fieldSlot3: {
    id: 'fieldSlot3',
    name: '🌾 3つ目の畑',
    description: '同時に3つの作物を栽培できるようになる',
    category: 'bonus',
    maxLv: 1,
    baseCost: 500,
    costScale: 1.0,
    effectLabel: (lv) => lv > 0 ? '解放済み' : '未解放',
  },
};
