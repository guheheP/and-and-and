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
  eggplant: {
    id: 'eggplant',
    name: 'ナス',
    growTimeMs: 16000,
    basePoint: 32,
    baseExp: 80,
    rarity: 2,
    isDefault: false,
    cssClass: 'crop--eggplant',
  },
  melon: {
    id: 'melon',
    name: 'メロン',
    growTimeMs: 50000,
    basePoint: 150,
    baseExp: 1500,
    rarity: 4,
    isDefault: false,
    cssClass: 'crop--melon',
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
  // ── v0.5 追加作物 ──
  onion: {
    id: 'onion',
    name: 'タマネギ',
    growTimeMs: 10000,
    basePoint: 18,
    baseExp: 20,
    rarity: 1,
    isDefault: false,
    cssClass: 'crop--onion',
  },
  cabbage: {
    id: 'cabbage',
    name: 'キャベツ',
    growTimeMs: 14000,
    basePoint: 28,
    baseExp: 55,
    rarity: 2,
    isDefault: false,
    cssClass: 'crop--cabbage',
  },
  mushroom: {
    id: 'mushroom',
    name: 'キノコ',
    growTimeMs: 15000,
    basePoint: 30,
    baseExp: 65,
    rarity: 2,
    isDefault: false,
    cssClass: 'crop--mushroom',
  },
  radish: {
    id: 'radish',
    name: 'ダイコン',
    growTimeMs: 18000,
    basePoint: 35,
    baseExp: 85,
    rarity: 2,
    isDefault: false,
    cssClass: 'crop--radish',
  },
  cherry: {
    id: 'cherry',
    name: 'サクランボ',
    growTimeMs: 22000,
    basePoint: 55,
    baseExp: 180,
    rarity: 3,
    isDefault: false,
    cssClass: 'crop--cherry',
  },
  grape: {
    id: 'grape',
    name: 'ブドウ',
    growTimeMs: 30000,
    basePoint: 70,
    baseExp: 350,
    rarity: 3,
    isDefault: false,
    cssClass: 'crop--grape',
  },
  bamboo: {
    id: 'bamboo',
    name: 'タケノコ',
    growTimeMs: 28000,
    basePoint: 65,
    baseExp: 300,
    rarity: 3,
    isDefault: false,
    cssClass: 'crop--bamboo',
  },
  peach: {
    id: 'peach',
    name: 'モモ',
    growTimeMs: 35000,
    basePoint: 85,
    baseExp: 500,
    rarity: 3,
    isDefault: false,
    cssClass: 'crop--peach',
  },
  pineapple: {
    id: 'pineapple',
    name: 'パイナップル',
    growTimeMs: 55000,
    basePoint: 140,
    baseExp: 1400,
    rarity: 4,
    isDefault: false,
    cssClass: 'crop--pineapple',
  },
  lotus: {
    id: 'lotus',
    name: 'レンコン',
    growTimeMs: 42000,
    basePoint: 95,
    baseExp: 700,
    rarity: 4,
    isDefault: false,
    cssClass: 'crop--lotus',
  },
  truffle: {
    id: 'truffle',
    name: 'トリュフ',
    growTimeMs: 90000,
    basePoint: 300,
    baseExp: 4000,
    rarity: 5,
    isDefault: false,
    cssClass: 'crop--truffle',
  },
  dragon_fruit: {
    id: 'dragon_fruit',
    name: 'ドラゴンフルーツ',
    growTimeMs: 75000,
    basePoint: 250,
    baseExp: 3800,
    rarity: 5,
    isDefault: false,
    cssClass: 'crop--dragon-fruit',
  },
  crystal_flower: {
    id: 'crystal_flower',
    name: 'クリスタルフラワー',
    growTimeMs: 120000,
    basePoint: 500,
    baseExp: 6000,
    rarity: 5,
    isDefault: false,
    cssClass: 'crop--crystal-flower',
  },
  rainbow_melon: {
    id: 'rainbow_melon',
    name: '虹色メロン',
    growTimeMs: 180000,
    basePoint: 800,
    baseExp: 10000,
    rarity: 5,
    isDefault: false,
    cssClass: 'crop--rainbow-melon',
  },
  world_tree_seed: {
    id: 'world_tree_seed',
    name: '世界樹の種',
    growTimeMs: 600000,
    basePoint: 5000,
    baseExp: 50000,
    rarity: 5,
    isDefault: false,
    cssClass: 'crop--world-tree-seed',
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
  // 人間（カラー変更で見た目を自由にカスタマイズ）
  human: { id: 'human', name: '人間', cssClass: 'farmer--man' },
  // ── 異形キャラクター（実績で解放） ──
  dog: { id: 'dog', name: '犬', cssClass: 'farmer--dog', unlockAchievement: 'char_dog' },
  cat: { id: 'cat', name: '猫', cssClass: 'farmer--cat', unlockAchievement: 'char_cat' },
  robot: { id: 'robot', name: 'ロボット', cssClass: 'farmer--robot', unlockAchievement: 'char_robot' },
  alien: { id: 'alien', name: 'エイリアン', cssClass: 'farmer--alien', unlockAchievement: 'char_alien' },
  pumpkinhead: { id: 'pumpkinhead', name: 'カボチャ頭', cssClass: 'farmer--pumpkinhead', unlockAchievement: 'char_pumpkinhead' },
  snowman: { id: 'snowman', name: '雪だるま', cssClass: 'farmer--snowman', unlockAchievement: 'char_snowman' },
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
  1: ['tomato', 'carrot', 'potato', 'strawberry', 'corn', 'onion'],
  5: ['cabbage'],
  8: ['mushroom'],
  10: ['radish'],
  12: ['cherry'],
  15: ['eggplant'],
  18: ['grape'],
  20: ['pumpkin'],
  22: ['peach'],
  25: ['bamboo'],
  28: ['pineapple'],
  30: ['watermelon'],
  32: ['lotus'],
  35: ['melon'],
  40: ['golden_apple'],
  45: ['truffle'],
  50: ['dragon_fruit'],
  60: ['crystal_flower'],
  75: ['rainbow_melon'],
  90: ['world_tree_seed'],
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
