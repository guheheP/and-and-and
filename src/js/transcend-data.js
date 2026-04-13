// transcend-data.js — 超越（プレステージ2段階目）定義

/**
 * 超越設定
 */
export const TRANSCEND_CONFIG = {
  minPrestigeCount: 20,
  minLevel: 100,
  /**
   * 超越通貨計算
   * @param {GameState} state
   * @returns {number}
   */
  getCurrency: (state) => {
    const pc = Math.max(0, state.prestigeCount || 0);
    const lv = Math.max(0, state.level || 0);
    return Math.max(1, Math.floor(Math.pow(pc, 1.2) * (lv / 50)));
  },
};

/**
 * 超越アップグレードのコスト算出
 * @param {Object} upgrade
 * @param {number} currentLv
 * @returns {number}
 */
export function getTranscendUpgradeCost(upgrade, currentLv) {
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costScale, currentLv));
}

/**
 * 超越アップグレードの効果値を算出
 * @param {string} upgradeId
 * @param {number} level
 * @returns {number}
 */
export function getTranscendEffect(upgradeId, level) {
  if (level <= 0) {
    if (['t_fieldSlot2', 't_fieldSlot3', 't_fieldSlot4', 't_autoPrestige'].includes(upgradeId)) return 0;
    if (upgradeId === 't_startLevel') return 0;
    if (upgradeId === 't_goldenSeed') return 0;
    if (upgradeId === 't_prestigeKeep') return 0;
    return 1.0;
  }

  switch (upgradeId) {
    case 't_baseMultiplier':
      // 全ポイント恒久倍率: ×(1 + lv × 0.25)
      return 1 + level * 0.25;
    case 't_expMultiplier':
      // 全EXP恒久倍率: ×(1 + lv × 0.25)
      return 1 + level * 0.25;
    case 't_growthBase':
      // 成長速度基礎短縮: ×(1 - lv × 0.03) 最大45%短縮
      return Math.max(0.55, 1 - level * 0.03);
    case 't_startLevel':
      // プレステージ後の初期レベル
      return 1 + level * 2;
    case 't_prestigeGain':
      // プレステージ通貨獲得量倍率
      return 1 + level * 0.2;
    case 't_prestigeDiscount':
      // プレステージアップグレードコスト割引（最大50%）
      return Math.max(0.5, 1 - level * 0.05);
    case 't_prestigeKeep':
      // 超越後に保持するプレステージアップグレード数
      return level;
    case 't_fieldSlot2':
    case 't_fieldSlot3':
    case 't_fieldSlot4':
      // 畑スロット解放（0 or 1）
      return level >= 1 ? 1 : 0;
    case 't_autoPrestige':
      // 自動転生（0 or 1）
      return level >= 1 ? 1 : 0;
    case 't_goldenSeed':
      // 毎プレステージ開始時に種を自動獲得
      return level;
    default:
      return 1.0;
  }
}

/**
 * 超越アップグレードテーブル
 */
export const TRANSCEND_UPGRADES = {
  // -- 基礎強化カテゴリ --
  t_baseMultiplier: {
    id: 't_baseMultiplier',
    name: '🔮 根源の力',
    description: '全ポイント獲得に恒久倍率',
    category: 'base',
    maxLv: 20,
    baseCost: 3,
    costScale: 1.8,
    effectLabel: (lv) => lv > 0 ? `獲得pt ×${getTranscendEffect('t_baseMultiplier', lv).toFixed(2)}` : '効果なし',
  },
  t_expMultiplier: {
    id: 't_expMultiplier',
    name: '📜 知恵の泉',
    description: '全EXP獲得に恒久倍率',
    category: 'base',
    maxLv: 20,
    baseCost: 3,
    costScale: 1.8,
    effectLabel: (lv) => lv > 0 ? `獲得EXP ×${getTranscendEffect('t_expMultiplier', lv).toFixed(2)}` : '効果なし',
  },
  t_growthBase: {
    id: 't_growthBase',
    name: '🌍 大地の祝福',
    description: '成長速度の基礎短縮',
    category: 'base',
    maxLv: 15,
    baseCost: 5,
    costScale: 2.0,
    effectLabel: (lv) => lv > 0 ? `成長時間 ×${getTranscendEffect('t_growthBase', lv).toFixed(2)}` : '効果なし',
  },
  t_startLevel: {
    id: 't_startLevel',
    name: '💭 記憶の残滓',
    description: 'プレステージ後の初期レベルを上昇',
    category: 'base',
    maxLv: 10,
    baseCost: 10,
    costScale: 2.5,
    effectLabel: (lv) => lv > 0 ? `初期Lv.${getTranscendEffect('t_startLevel', lv)}` : '効果なし',
  },

  // -- プレステージ強化カテゴリ --
  t_prestigeGain: {
    id: 't_prestigeGain',
    name: '🔄 輪廻の加速',
    description: 'プレステージ通貨の獲得量を増加',
    category: 'prestige',
    maxLv: 15,
    baseCost: 5,
    costScale: 2.0,
    effectLabel: (lv) => lv > 0 ? `通貨 ×${getTranscendEffect('t_prestigeGain', lv).toFixed(1)}` : '効果なし',
  },
  t_prestigeDiscount: {
    id: 't_prestigeDiscount',
    name: '🧘 悟りの境地',
    description: 'プレステージアップグレードのコスト削減',
    category: 'prestige',
    maxLv: 10,
    baseCost: 8,
    costScale: 2.2,
    effectLabel: (lv) => lv > 0 ? `コスト ×${getTranscendEffect('t_prestigeDiscount', lv).toFixed(2)}` : '効果なし',
  },
  t_prestigeKeep: {
    id: 't_prestigeKeep',
    name: '🏛️ 不朽の遺産',
    description: '超越後にプレステージアップグレードを保持',
    category: 'prestige',
    maxLv: 5,
    baseCost: 20,
    costScale: 3.0,
    effectLabel: (lv) => lv > 0 ? `${lv}個保持` : '効果なし',
  },

  // -- 解放カテゴリ --
  t_fieldSlot2: {
    id: 't_fieldSlot2',
    name: '🌾 2つ目の畑',
    description: '同時に2つの作物を栽培できるようになる',
    category: 'unlock',
    maxLv: 1,
    baseCost: 3,
    costScale: 1.0,
    effectLabel: (lv) => lv >= 1 ? '解放済み' : '未解放',
  },
  t_fieldSlot3: {
    id: 't_fieldSlot3',
    name: '🌾 3つ目の畑',
    description: '同時に3つの作物を栽培できるようになる',
    category: 'unlock',
    maxLv: 1,
    baseCost: 10,
    costScale: 1.0,
    effectLabel: (lv) => lv >= 1 ? '解放済み' : '未解放',
  },
  t_fieldSlot4: {
    id: 't_fieldSlot4',
    name: '🌾 4つ目の畑',
    description: '同時に4つの作物を栽培できるようになる',
    category: 'unlock',
    maxLv: 1,
    baseCost: 25,
    costScale: 1.0,
    effectLabel: (lv) => lv >= 1 ? '解放済み' : '未解放',
  },
  t_autoPrestige: {
    id: 't_autoPrestige',
    name: '⚡ 自動転生',
    description: '設定レベル到達時に自動でプレステージ',
    category: 'unlock',
    maxLv: 1,
    baseCost: 50,
    costScale: 1.0,
    effectLabel: (lv) => lv >= 1 ? '解放済み' : '未解放',
  },
  t_goldenSeed: {
    id: 't_goldenSeed',
    name: '✨ 黄金の種袋',
    description: 'プレステージ開始時に種を自動獲得',
    category: 'unlock',
    maxLv: 5,
    baseCost: 30,
    costScale: 2.5,
    effectLabel: (lv) => lv > 0 ? `★${1 + lv}以下×${lv * 10}個` : '効果なし',
  },
};
