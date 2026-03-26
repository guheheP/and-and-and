// master-data.js — マスターデータ（読み取り専用）

/**
 * 作物マスターデータ
 * @type {Object.<string, CropData>}
 */
export const CROP_MASTER = {
  tomato: {
    id: 'tomato',
    name: 'トマト',
    growTimeMs: 5000,
    basePoint: 10,
    baseExp: 10,
    rarity: 1,
    isDefault: true,
    cssClass: 'crop--tomato',
  },
  potato: {
    id: 'potato',
    name: 'じゃがいも',
    growTimeMs: 8000,
    basePoint: 20,
    baseExp: 25,
    rarity: 1,
    isDefault: false,
    cssClass: 'crop--potato',
  },
  carrot: {
    id: 'carrot',
    name: 'ニンジン',
    growTimeMs: 12000,
    basePoint: 25,
    baseExp: 45,
    rarity: 2,
    isDefault: false,
    cssClass: 'crop--carrot',
  },
  strawberry: {
    id: 'strawberry',
    name: 'イチゴ',
    growTimeMs: 20000,
    basePoint: 40,
    baseExp: 100,
    rarity: 2,
    isDefault: false,
    cssClass: 'crop--strawberry',
  },
  corn: {
    id: 'corn',
    name: 'トウモロコシ',
    growTimeMs: 25000,
    basePoint: 60,
    baseExp: 250,
    rarity: 3,
    isDefault: false,
    cssClass: 'crop--corn',
  },
  pumpkin: {
    id: 'pumpkin',
    name: 'カボチャ',
    growTimeMs: 40000,
    basePoint: 90,
    baseExp: 600,
    rarity: 4,
    isDefault: false,
    cssClass: 'crop--pumpkin',
  },
  watermelon: {
    id: 'watermelon',
    name: 'スイカ',
    growTimeMs: 45000,
    basePoint: 120,
    baseExp: 1200,
    rarity: 4,
    isDefault: false,
    cssClass: 'crop--watermelon',
  },
  golden_apple: {
    id: 'golden_apple',
    name: '金のリンゴ',
    growTimeMs: 60000,
    basePoint: 200,
    baseExp: 3500,
    rarity: 5,
    isDefault: false,
    cssClass: 'crop--golden-apple',
  },
  tumbleweed: {
    id: 'tumbleweed',
    name: 'タンブルウィード',
    growTimeMs: 30000,
    basePoint: 40,
    baseExp: 100,
    rarity: 5,
    isDefault: false,
    isEventOnly: true,
    cssClass: 'crop--tumbleweed',
  },
  christmas_tree: {
    id: 'christmas_tree',
    name: 'もみの木',
    growTimeMs: 300000,
    basePoint: 1000,
    baseExp: 5000,
    rarity: 5,
    isDefault: false,
    isEventOnly: true,
    cssClass: 'crop--christmas-tree',
  },
};

/**
 * キャラクターマスターデータ
 * @type {Object.<string, CharacterData>}
 */
export const CHARACTER_MASTER = {
  man: { id: 'man', name: '成人男性', cssClass: 'farmer--man' },
  woman: { id: 'woman', name: '成人女性', cssClass: 'farmer--woman' },
  boy: { id: 'boy', name: '少年', cssClass: 'farmer--boy' },
  girl: { id: 'girl', name: '少女', cssClass: 'farmer--girl' },
  grandpa: { id: 'grandpa', name: 'おじいさん', cssClass: 'farmer--grandpa' },
  grandma: { id: 'grandma', name: 'おばあさん', cssClass: 'farmer--grandma' },
};

/**
 * レベルアップ閾値を指数関数で算出（無限レベル対応）
 * 式: 100 * 1.08^(level-1)
 * @param {number} level - 1-indexed
 * @returns {number}
 */
export function getLevelThreshold(level) {
  if (level <= 1) return 0;
  // インフレ率を 1.15 から 1.08 に緩和
  return Math.floor(100 * (Math.pow(1.08, level - 1) - 1) / 0.08);
}

/**
 * レベルで解放される作物
 * @type {Object.<number, string[]>}
 */
export const LEVEL_UNLOCK_CROPS = {
  1: ['tomato', 'carrot', 'potato', 'strawberry', 'corn'], // ガチャ用に序盤から5種解放
  20: ['pumpkin'],
  30: ['watermelon'],
  40: ['golden_apple'],
};

/**
 * ガチャ設定
 */
export const GACHA_CONFIG = {
  cost: 100,
  // レアリティ別の排出重み（大きいほど出やすい）
  rarityWeights: {
    1: 50,
    2: 30,
    3: 15,
    4: 4,
    5: 1,
  },
};
