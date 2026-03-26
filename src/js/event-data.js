// event-data.js — ランダムイベント定義

/**
 * イベント抽選設定
 */
export const EVENT_CONFIG = {
  checkIntervalMs: 60000,  // 1分ごとに抽選
  triggerChance: 10,       // 10% の確率でイベント発生
};

/**
 * ジャンル定義と選択重み
 * weight が大きいほど選ばれやすい
 */
export const EVENT_GENRES = {
  weather: { name: '天気',   weight: 60 },
  gift:    { name: '贈り物', weight: 25 },
  friend:  { name: 'お友達', weight: 15 },
};

/**
 * 全イベント定義
 *
 * type: 効果の種類
 *   'growthBoost'   — 成長速度倍率
 *   'pointBoost'    — 次N回の収穫ポイント倍率
 *   'giveSeeds'     — 種を付与
 *   'givePoints'    — ポイントを付与
 *   'giveItem'      — 特定アイテム/種を付与
 *   'visual'        — 演出のみ
 */
export const EVENT_MASTER = {
  // ============================================
  //  🌦️ 天気ジャンル
  // ============================================
  rain: {
    id: 'rain',
    genre: 'weather',
    name: '🌧️ 雨',
    durationMs: 60000,
    weight: 30,
    effectType: 'growthBoost',
    effectValue: 3.0,
    cssClass: 'event--rain',
  },
  heavy_rain: {
    id: 'heavy_rain',
    genre: 'weather',
    name: '⛈️ 大雨',
    durationMs: 60000,
    weight: 15,
    effectType: 'growthBoost',
    effectValue: 5.0,
    cssClass: 'event--heavy-rain',
  },
  diamond_rain: {
    id: 'diamond_rain',
    genre: 'weather',
    name: '💎 ダイヤの雨',
    durationMs: 60000,
    weight: 3,
    effectType: 'growthBoost',
    effectValue: 10.0,
    cssClass: 'event--diamond-rain',
  },
  snow: {
    id: 'snow',
    genre: 'weather',
    name: '❄️ 雪',
    durationMs: 60000,
    weight: 20,
    effectType: 'growthBoost',
    effectValue: 0.5,
    cssClass: 'event--snow',
  },
  thunder: {
    id: 'thunder',
    genre: 'weather',
    name: '⚡ 雷雨',
    durationMs: 60000,
    weight: 15,
    effectType: 'growthBoost',
    effectValue: 0.3,
    cssClass: 'event--thunder',
  },
  typhoon: {
    id: 'typhoon',
    genre: 'weather',
    name: '🌀 台風',
    durationMs: 60000,
    weight: 10,
    effectType: 'growthBoost',
    effectValue: 0.1,
    cssClass: 'event--typhoon',
  },
  cumulonimbus: {
    id: 'cumulonimbus',
    genre: 'weather',
    name: '☁️ 入道雲',
    durationMs: 30000,
    weight: 25,
    effectType: 'growthBoost',
    effectValue: 1.5,
    cssClass: 'event--cumulonimbus',
  },

  // ============================================
  //  🎁 贈り物ジャンル
  // ============================================
  tumbleweed: {
    id: 'tumbleweed',
    genre: 'gift',
    name: '🌿 タンブルウィード',
    durationMs: 5000,
    weight: 40,
    effectType: 'giveItem',
    effectValue: { cropId: 'tumbleweed', count: 1, bonusPointsPerLevel: 500 },
    cssClass: 'event--tumbleweed',
  },
  bird_poop: {
    id: 'bird_poop',
    genre: 'gift',
    name: '🐦 鳥のフン',
    durationMs: 3000,
    weight: 35,
    effectType: 'pointBoost',
    effectValue: { multiplier: 5.0, harvestCount: 5 },
    cssClass: 'event--bird',
  },
  stork: {
    id: 'stork',
    genre: 'gift',
    name: '🦩 コウノトリ',
    durationMs: 5000,
    weight: 25,
    effectType: 'giveSeeds',
    effectValue: { count: 20 },
    cssClass: 'event--stork',
  },

  // ============================================
  //  🐾 お友達ジャンル
  // ============================================
  santa: {
    id: 'santa',
    genre: 'friend',
    name: '🎅 サンタさん',
    durationMs: 5000,
    weight: 10,
    effectType: 'giveItem',
    effectValue: { cropId: 'christmas_tree', count: 1 },
    cssClass: 'event--santa',
  },
  john: {
    id: 'john',
    genre: 'friend',
    name: '🧑 ジョンの訪問',
    durationMs: 15000,
    weight: 30,
    effectType: 'giveItem',
    effectValue: { cropId: null, count: 0, bonusPointsPerLevel: 100 },
    cssClass: 'event--john',
  },
  dog_visit: {
    id: 'dog_visit',
    genre: 'friend',
    name: '🐕 犬の訪問',
    durationMs: 180000,
    weight: 30,
    effectType: 'pointBoost',
    effectValue: { multiplier: 1.5, harvestCount: 10 },
    cssClass: 'event--dog',
  },
  cat_visit: {
    id: 'cat_visit',
    genre: 'friend',
    name: '🐈 猫の訪問',
    durationMs: 180000,
    weight: 30,
    effectType: 'pointBoost',
    effectValue: { multiplier: 1.3, harvestCount: 20 },
    cssClass: 'event--cat',
  },
};
