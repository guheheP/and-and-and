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
    rarity: 1,
    isDefault: true,
    cssClass: 'crop--tomato',
  },
  carrot: {
    id: 'carrot',
    name: 'ニンジン',
    growTimeMs: 10000,
    basePoint: 30, // restored
    rarity: 1,
    isDefault: false,
    cssClass: 'crop--carrot',
  },
  potato: {
    id: 'potato',
    name: 'ジャガイモ',
    growTimeMs: 15000,
    basePoint: 50, // restored
    rarity: 2,
    isDefault: false,
    cssClass: 'crop--potato',
  },
  strawberry: {
    id: 'strawberry',
    name: 'イチゴ',
    growTimeMs: 20000,
    basePoint: 80, // restored
    rarity: 3,
    isDefault: false,
    cssClass: 'crop--strawberry',
  },
  corn: {
    id: 'corn',
    name: 'トウモロコシ',
    growTimeMs: 25000,
    basePoint: 100, // restored
    rarity: 3,
    isDefault: false,
    cssClass: 'crop--corn',
  },
  pumpkin: {
    id: 'pumpkin',
    name: 'カボチャ',
    growTimeMs: 40000,
    basePoint: 200, // restored
    rarity: 4,
    isDefault: false,
    cssClass: 'crop--pumpkin',
  },
  watermelon: {
    id: 'watermelon',
    name: 'スイカ',
    growTimeMs: 45000,
    basePoint: 250, // restored
    rarity: 4,
    isDefault: false,
    cssClass: 'crop--watermelon',
  },
  golden_apple: {
    id: 'golden_apple',
    name: '金のリンゴ',
    growTimeMs: 60000,
    basePoint: 500, // restored
    rarity: 5,
    isDefault: false,
    cssClass: 'crop--golden-apple',
  },
  tumbleweed: {
    id: 'tumbleweed',
    name: 'タンブルウィード',
    growTimeMs: 30000,
    basePoint: 500,
    rarity: 5,
    isDefault: false,
    isEventOnly: true,
    cssClass: 'crop--tumbleweed',
  },
  christmas_tree: {
    id: 'christmas_tree',
    name: 'もみの木',
    growTimeMs: 300000,
    basePoint: 5000,
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
  man:     { id: 'man',     name: '成人男性',   cssClass: 'farmer--man' },
  woman:   { id: 'woman',   name: '成人女性',   cssClass: 'farmer--woman' },
  boy:     { id: 'boy',     name: '少年',       cssClass: 'farmer--boy' },
  girl:    { id: 'girl',    name: '少女',       cssClass: 'farmer--girl' },
  grandpa: { id: 'grandpa', name: 'おじいさん', cssClass: 'farmer--grandpa' },
  grandma: { id: 'grandma', name: 'おばあさん', cssClass: 'farmer--grandma' },
  dog:     { id: 'dog',     name: '犬',         cssClass: 'farmer--dog' },
  cat:     { id: 'cat',     name: '猫',         cssClass: 'farmer--cat' },
  tree:    { id: 'tree',    name: '木',         cssClass: 'farmer--tree' },
  bird:    { id: 'bird',    name: '鳥',         cssClass: 'farmer--bird' },
  insect:  { id: 'insect',  name: 'クワガタ',   cssClass: 'farmer--insect' },
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
 * プレイヤーレベルに応じた基本作物（種∞）
 * Lv.100以降で高レア作物が無限になる
 * @type {Array<{level: number, cropId: string}>}
 */
export const LEVEL_DEFAULT_CROP = [
  { level: 1,   cropId: 'tomato' },
  { level: 40,  cropId: 'carrot' },
  { level: 70,  cropId: 'potato' },
  { level: 100, cropId: 'strawberry' },
  { level: 130, cropId: 'corn' },
  { level: 160, cropId: 'pumpkin' },
  { level: 190, cropId: 'watermelon' },
  { level: 220, cropId: 'golden_apple' },
];

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

/**
 * プレイヤーレベルに応じたデフォルト作物IDを取得
 * @param {number} playerLevel
 * @returns {string}
 */
export function getDefaultCropId(playerLevel = 1) {
  let defaultId = 'tomato';
  for (const entry of LEVEL_DEFAULT_CROP) {
    if (playerLevel >= entry.level) {
      defaultId = entry.cropId;
    }
  }
  return defaultId;
}

