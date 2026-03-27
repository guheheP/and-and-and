// achievement-system.js — 実績・マイルストーン管理

import { saveState } from './game-state.js';

export const ACHIEVEMENT_MASTER = {
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
  level_50: {
    id: 'level_50',
    name: '大農園主',
    desc: 'プレイヤーレベルが50に到達する',
    condition: (state) => state.level >= 50,
    rewardType: 'hat',
    rewardId: 'cap',
    rewardText: '赤いキャップ',
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

export function isPartUnlocked(state, type, id) {
  // デフォルトパーツ（noneや基本キャラ）は常に解放
  if (id === 'none') return true;
  if (type === 'base') return true; // ベースキャラは初期から全開放（マスターデータに依存）

  if (!state || !state.unlockedParts || !state.unlockedParts[type]) return false;
  return state.unlockedParts[type].includes(id);
}
