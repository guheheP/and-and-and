// achievement-system.js — 実績・マイルストーン管理

import { saveState, getCropLevel } from './game-state.js';
import { CROP_MASTER } from './master-data.js';
import { EVENT_MASTER } from './event-data.js';

export const ACHIEVEMENT_MASTER = {
  // ── 収穫系 ──
  harvest_100: {
    id: 'harvest_100',
    name: '見習い農家',
    desc: '総収穫回数が100回に到達する',
    condition: (state) => state.harvestCount >= 100,
    rewardType: 'hat',
    rewardId: 'straw_hat',
    rewardText: '麦わら帽子',
  },
  harvest_1000: {
    id: 'harvest_1000',
    name: 'ベテラン農家',
    desc: '総収穫回数が1000回に到達する',
    condition: (state) => state.harvestCount >= 1000,
    rewardType: 'accessory',
    rewardId: 'watering_can',
    rewardText: 'ジョウロ',
  },
  harvest_5000: {
    id: 'harvest_5000',
    name: '熟練農家',
    desc: '総収穫回数が5000回に到達する',
    condition: (state) => state.harvestCount >= 5000,
    rewardType: 'hat',
    rewardId: 'bandana',
    rewardText: 'バンダナ',
  },
  harvest_10000: {
    id: 'harvest_10000',
    name: '鉄人農家',
    desc: '総収穫回数が10000回に到達する',
    condition: (state) => state.harvestCount >= 10000,
    rewardType: 'accessory',
    rewardId: 'hoe',
    rewardText: 'クワ',
  },
  harvest_50000: {
    id: 'harvest_50000',
    name: '伝説の農家',
    desc: '総収穫回数が50000回に到達する',
    condition: (state) => state.harvestCount >= 50000,
    rewardType: 'hat',
    rewardId: 'crown',
    rewardText: '王冠',
  },

  // ── レベル系 ──
  level_10: {
    id: 'level_10',
    name: 'かけだし',
    desc: 'プレイヤーレベルが10に到達する',
    condition: (state) => state.level >= 10,
    rewardType: 'accessory',
    rewardId: 'basket',
    rewardText: 'カゴ',
  },
  level_25: {
    id: 'level_25',
    name: '一人前',
    desc: 'プレイヤーレベルが25に到達する',
    condition: (state) => state.level >= 25,
    rewardType: 'hat',
    rewardId: 'headband',
    rewardText: 'はちまき',
  },
  level_50: {
    id: 'level_50',
    name: '大農園主',
    desc: 'プレイヤーレベルが50に到達する',
    condition: (state) => state.level >= 50,
    rewardType: 'hat',
    rewardId: 'cap',
    rewardText: '赤いキャップ',
  },
  level_100: {
    id: 'level_100',
    name: '農業の神',
    desc: 'プレイヤーレベルが100に到達する',
    condition: (state) => state.level >= 100,
    rewardType: 'hat',
    rewardId: 'halo',
    rewardText: '天使の輪',
  },

  // ── プレステージ系 ──
  prestige_1: {
    id: 'prestige_1',
    name: 'はじめての転生',
    desc: 'プレステージを1回実行する',
    condition: (state) => (state.prestigeCount || 0) >= 1,
    rewardType: 'accessory',
    rewardId: 'scarf',
    rewardText: 'マフラー',
  },
  prestige_5: {
    id: 'prestige_5',
    name: '輪廻の農家',
    desc: 'プレステージを5回実行する',
    condition: (state) => (state.prestigeCount || 0) >= 5,
    rewardType: 'hat',
    rewardId: 'wizard_hat',
    rewardText: '魔法使いの帽子',
  },
  prestige_10: {
    id: 'prestige_10',
    name: '永遠の農家',
    desc: 'プレステージを10回実行する',
    condition: (state) => (state.prestigeCount || 0) >= 10,
    rewardType: 'accessory',
    rewardId: 'wings',
    rewardText: '天使の羽',
  },

  // ── 作物レベル系 ──
  crop_lv50: {
    id: 'crop_lv50',
    name: '作物マスター',
    desc: 'いずれかの作物レベルが50に到達する',
    condition: (state) => {
      for (const cropId of Object.keys(CROP_MASTER)) {
        if (getCropLevel(state, cropId) >= 50) return true;
      }
      return false;
    },
    rewardType: 'accessory',
    rewardId: 'seed_bag',
    rewardText: '種袋',
  },
  crop_lv100: {
    id: 'crop_lv100',
    name: '作物の達人',
    desc: 'いずれかの作物レベルが100に到達する（無限化）',
    condition: (state) => {
      for (const cropId of Object.keys(CROP_MASTER)) {
        if (cropId === 'tomato') continue; // トマトは初期から無限
        if (getCropLevel(state, cropId) >= 100) return true;
      }
      return false;
    },
    rewardType: 'hat',
    rewardId: 'flower_crown',
    rewardText: '花冠',
  },

  // ── ポイント系 ──
  points_100k: {
    id: 'points_100k',
    name: '蓄財農家',
    desc: '累計獲得ポイントが100,000に到達する',
    condition: (state) => (state.totalEarnedPoints || 0) >= 100000,
    rewardType: null,
    rewardId: null,
    rewardText: null,
  },
  points_1m: {
    id: 'points_1m',
    name: '大富農',
    desc: '累計獲得ポイントが1,000,000に到達する',
    condition: (state) => (state.totalEarnedPoints || 0) >= 1000000,
    rewardType: 'accessory',
    rewardId: 'gold_medal',
    rewardText: '金メダル',
  },

  // ── コレクション系 ──
  all_crops: {
    id: 'all_crops',
    name: 'コンプリート',
    desc: '通常作物を全種類入手する',
    condition: (state) => {
      for (const [id, crop] of Object.entries(CROP_MASTER)) {
        if (crop.isEventOnly) continue;
        if (!(state.seedsInventory[id] > 0 || (state.cropExp[id] || 0) > 0)) return false;
      }
      return true;
    },
    rewardType: 'hat',
    rewardId: 'top_hat',
    rewardText: 'シルクハット',
  },
  all_events: {
    id: 'all_events',
    name: '全天候制覇',
    desc: '全てのイベントを1回以上目撃する',
    condition: (state) => {
      if (!state.eventCounts) return false;
      for (const id of Object.keys(EVENT_MASTER)) {
        if (!(state.eventCounts[id] > 0)) return false;
      }
      return true;
    },
    rewardType: 'accessory',
    rewardId: 'umbrella',
    rewardText: '傘',
  },

  // ── キャラクター解放系 ──
  char_dog: {
    id: 'char_dog',
    name: '忠犬農家',
    desc: '犬の訪問イベントを5回目撃する',
    condition: (state) => (state.eventCounts?.dog_visit || 0) >= 5,
    rewardType: 'base',
    rewardId: 'dog',
    rewardText: 'キャラクター「犬」',
  },
  char_cat: {
    id: 'char_cat',
    name: '猫の恩返し',
    desc: '猫の訪問イベントを5回目撃する',
    condition: (state) => (state.eventCounts?.cat_visit || 0) >= 5,
    rewardType: 'base',
    rewardId: 'cat',
    rewardText: 'キャラクター「猫」',
  },
  char_robot: {
    id: 'char_robot',
    name: '機械化農業',
    desc: 'プレステージを10回実行する',
    condition: (state) => (state.prestigeCount || 0) >= 10,
    rewardType: 'base',
    rewardId: 'robot',
    rewardText: 'キャラクター「ロボット」',
  },
  char_alien: {
    id: 'char_alien',
    name: '宇宙農法',
    desc: '累計獲得ポイントが1,000,000に到達する',
    condition: (state) => (state.totalEarnedPoints || 0) >= 1000000,
    rewardType: 'base',
    rewardId: 'alien',
    rewardText: 'キャラクター「エイリアン」',
  },
  char_pumpkinhead: {
    id: 'char_pumpkinhead',
    name: 'ハロウィンの夜',
    desc: 'カボチャの作物レベルが50に到達する',
    condition: (state) => getCropLevel(state, 'pumpkin') >= 50,
    rewardType: 'base',
    rewardId: 'pumpkinhead',
    rewardText: 'キャラクター「カボチャ頭」',
  },
  char_snowman: {
    id: 'char_snowman',
    name: '冬の農夫',
    desc: '雪イベントを10回目撃する',
    condition: (state) => (state.eventCounts?.snow || 0) >= 10,
    rewardType: 'base',
    rewardId: 'snowman',
    rewardText: 'キャラクター「雪だるま」',
  },

  // ── 超越系 ──
  transcend_1: {
    id: 'transcend_1',
    name: '覚醒',
    desc: '超越を1回実行する',
    condition: (state) => (state.transcendCount || 0) >= 1,
    rewardType: null,
    rewardId: null,
    rewardText: null,
  },
  transcend_5: {
    id: 'transcend_5',
    name: '超越者',
    desc: '超越を5回実行する',
    condition: (state) => (state.transcendCount || 0) >= 5,
    rewardType: null,
    rewardId: null,
    rewardText: null,
  },
  transcend_10: {
    id: 'transcend_10',
    name: '世界の理',
    desc: '超越を10回実行する',
    condition: (state) => (state.transcendCount || 0) >= 10,
    rewardType: null,
    rewardId: null,
    rewardText: null,
  },
};

let callbacks = {
  onUnlock: null
};

export function initAchievementSystem(cbs = {}) {
  callbacks = { ...callbacks, ...cbs };
}

export function checkAchievements(state) {
  if (!state) return;
  if (!state.unlockedAchievements) {
    state.unlockedAchievements = [];
  }
  
  let newlyUnlocked = false;

  for (const [id, ach] of Object.entries(ACHIEVEMENT_MASTER)) {
    if (!state.unlockedAchievements.includes(id)) {
      if (ach.condition(state)) {
        state.unlockedAchievements.push(id);
        newlyUnlocked = true;
        
        // 報酬アンロック処理
        if (!state.unlockedParts) state.unlockedParts = { hat: [], accessory: [], base: [] };
        if (ach.rewardType && ach.rewardId) {
          if (!state.unlockedParts[ach.rewardType]) state.unlockedParts[ach.rewardType] = [];
          if (!state.unlockedParts[ach.rewardType].includes(ach.rewardId)) {
            state.unlockedParts[ach.rewardType].push(ach.rewardId);
          }
        }

        if (callbacks.onUnlock) {
          callbacks.onUnlock(ach);
        }
      }
    }
  }

  if (newlyUnlocked) {
    saveState(state);
  }
}

// 初期から使用可能なベースキャラクター
const DEFAULT_BASE_CHARS = ['human'];

export function isPartUnlocked(state, type, id) {
  // デフォルトパーツ（none）は常に解放
  if (id === 'none') return true;
  // 基本キャラ6体は初期から全開放
  if (type === 'base' && DEFAULT_BASE_CHARS.includes(id)) return true;

  if (!state || !state.unlockedParts || !state.unlockedParts[type]) return false;
  return state.unlockedParts[type].includes(id);
}
