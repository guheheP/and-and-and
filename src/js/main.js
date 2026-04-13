// main.js — エントリーポイント（初期化・各モジュール結合）

import { loadState, saveState, addSeed, addPoints } from './game-state.js';
import { startGameLoop } from './game-loop.js';

import {
  initRenderer,
  updateCharacter,
  updateField,
  updateHUD,
  showHarvestEffect,
  showHarvestParticles,
  triggerWorkAnimation,
  triggerHarvestAnimation,
  showLevelUpEffect,
  startEventVisual,
  stopAllEventVisuals,
} from './renderer-3d.js';
import { initUI } from './ui-controller.js';
import { buildEncyclopedia } from './ui-modals.js';
import { initDebug } from './debug.js';
import { CROP_MASTER } from './master-data.js';
import { getGachaPool } from './progression.js';
import { showAchievementToast } from './renderer-common.js';
import { initEventSystem, setPointBoost } from './event-system.js';
import { initAchievementSystem } from './achievement-system.js';

/** すべてのイベントCSSクラス */
const ALL_EVENT_CLASSES = [
  'event--rain', 'event--heavy-rain', 'event--diamond-rain',
  'event--snow', 'event--thunder', 'event--typhoon', 'event--cumulonimbus',
  'event--tumbleweed', 'event--bird', 'event--stork',
  'event--santa', 'event--john', 'event--dog', 'event--cat',
  // 季節イベント
  'event--cherry-blossom', 'event--hay-fever', 'event--spring-breeze',
  'event--fireworks', 'event--heatwave', 'event--shaved-ice',
  'event--autumn-leaves', 'event--harvest-festival', 'event--moon-viewing',
  'event--christmas-bonus', 'event--new-year', 'event--valentine', 'event--aurora',
];

/**
 * アプリケーション初期化
 */
function init() {
  // 1. レンダラー初期化（DOM要素キャッシュ）
  initRenderer();

  // 2. ゲーム状態のロード
  const state = loadState();

  // 3. 初期描画
  updateCharacter(state.characterConfig || state.currentCharId);
  updateField(state.fieldSlots[0]);
  updateHUD(state);

  // 4. UI初期化
  initUI(state);
  initDebug(state);

  // 5. 実績システム初期化
  initAchievementSystem({
    onUnlock: (ach) => {
      showAchievementToast(ach);
    }
  });

  // 5. イベントシステム初期化
  initEventSystem({
    onEventStart: (event) => handleEventStart(state, event),
    onEventEnd: (event) => handleEventEnd(state, event),
  }, state);

  // 6. ゲームループ開始（コールバック登録）
  startGameLoop(state, {
    onFieldUpdate: (slot, slotIndex) => {
      // スロット0のみ3D描画
      if (slotIndex === 0) updateField(slot);
      updateHUD(state);
    },
    onPlant: (cropId) => {
      triggerWorkAnimation();
    },
    onHarvest: (cropId, points) => {
      triggerHarvestAnimation();
      showHarvestEffect(points);
      showHarvestParticles(cropId);

      // 図鑑が開いていればリアルタイム反映
      const encModal = document.getElementById('encyclopedia-modal');
      if (encModal && !encModal.hidden) {
        buildEncyclopedia();
      }
    },
    onLevelUp: (newLevel) => {
      updateHUD(state);
      showLevelUpEffect();
      console.log(`🎉 レベルアップ！ Lv.${newLevel}`);
    },
  });

  // 7. Electron ハンドラ初期化
  initElectronHandlers(state);

  // 8. 自動アップデートUI
  initUpdateUI();

  // 8. ウィンドウを閉じる前にセーブ
  window.addEventListener('beforeunload', () => {
    if (!window.skipSaveOnUnload) {
      saveState(state);
    }
  });

  // 9. ブラウザ用デバッグモード（特定コマンド入力）
  if (!window.electronAPI) {
    let keyBuffer = '';
    window.addEventListener('keydown', (e) => {
      // コマンド入力バッファ
      keyBuffer += e.key;
      if (keyBuffer.length > 20) keyBuffer = keyBuffer.slice(-20);

      // コマンド判定
      if (keyBuffer.endsWith('100debug')) {
        window.DEBUG_SPEED_MULTIPLIER = 100;
        alert('【デバッグモード】100倍速を有効化しました');
        keyBuffer = '';
      } else if (keyBuffer.endsWith('10debug')) {
        window.DEBUG_SPEED_MULTIPLIER = 10;
        alert('【デバッグモード】10倍速を有効化しました');
        keyBuffer = '';
      } else if (keyBuffer.endsWith('1debug')) {
        window.DEBUG_SPEED_MULTIPLIER = 1;
        alert('【デバッグモード】等速に戻しました');
        keyBuffer = '';
      }
    });
    console.log('ブラウザ版デバッグコマンドが利用可能です。「10debug」や「100debug」とタイプしてください。');
  }

  console.log('🌱 Idle Farm 起動完了');
}

// ============================================
//  イベント処理ハンドラ
// ============================================

/**
 * イベント開始時の処理
 */
function handleEventStart(state, event) {
  const stage = document.getElementById('stage');
  if (!stage) return;

  // 出現回数を記録
  if (!state.eventCounts) state.eventCounts = {};
  state.eventCounts[event.id] = (state.eventCounts[event.id] || 0) + 1;

  // ビジュアルエフェクト（3D renderer に委譲）
  startEventVisual(event);

  // ゲーム効果の適用
  applyEventEffect(state, event);

  console.log(`🎲 イベント発生: ${event.name}`);
}

/**
 * イベント終了時の処理
 */
function handleEventEnd(state, event) {
  const stage = document.getElementById('stage');
  if (!stage) return;

  stopAllEventVisuals();

  saveState(state);
}

/**
 * イベント効果を適用
 */
function applyEventEffect(state, event) {
  switch (event.effectType) {
    case 'pointBoost': {
      // 鳥のフン: 次N回の収穫ポイントx倍
      const { multiplier, harvestCount } = event.effectValue;
      setPointBoost(multiplier, harvestCount);
      break;
    }
    case 'giveSeeds': {
      // コウノトリ: ランダムな種を20個
      const pool = getGachaPool(state.level);
      const count = event.effectValue.count;
      for (let i = 0; i < count; i++) {
        if (pool.length > 0) {
          const crop = pool[Math.floor(Math.random() * pool.length)];
          addSeed(state, crop.id);
        }
      }
      saveState(state);
      break;
    }
    case 'giveItem': {
      // タンブルウィード or サンタ: 特定の種＋ポイント
      const { cropId, count, bonusPointsPerLevel } = event.effectValue;
      if (cropId && count > 0) {
        addSeed(state, cropId, count);
      }
      if (bonusPointsPerLevel) {
        const bonus = state.level * bonusPointsPerLevel;
        addPoints(state, bonus);
        showHarvestEffect(bonus);
      }
      saveState(state);
      break;
    }
    // growthBoost と visual は自動で処理される（getGrowthMultiplier経由）
  }
}

// ============================================
//  自動アップデートUI
// ============================================

function initUpdateUI() {
  if (!window.electronAPI) return;

  const toast = document.getElementById('update-toast');
  const toastText = document.getElementById('update-toast-text');
  if (!toast || !toastText) return;

  let downloadedVersion = null;

  window.electronAPI.onUpdateAvailable((version) => {
    toastText.textContent = `v${version} をダウンロード中...`;
    toast.style.display = 'block';
  });

  window.electronAPI.onUpdateDownloaded((version) => {
    downloadedVersion = version;
    toastText.textContent = `v${version} 準備完了 — クリックで再起動`;
    toast.style.display = 'block';
  });

  toast.addEventListener('click', () => {
    if (downloadedVersion) {
      window.electronAPI.installUpdate();
    }
  });

  // バージョン情報モーダルの「更新を確認」ボタン
  const btnCheckUpdate = document.getElementById('btn-check-update');
  if (btnCheckUpdate) {
    btnCheckUpdate.addEventListener('click', () => {
      btnCheckUpdate.textContent = '確認中...';
      btnCheckUpdate.disabled = true;
      window.electronAPI.checkForUpdate();
      setTimeout(() => {
        if (!downloadedVersion && toast.style.display === 'none') {
          btnCheckUpdate.textContent = '最新版です';
        }
        setTimeout(() => {
          btnCheckUpdate.textContent = '更新を確認';
          btnCheckUpdate.disabled = false;
        }, 3000);
      }, 5000);
    });
  }
}

// ============================================
//  Electron ウィンドウ blur/focus
// ============================================

function initElectronHandlers(state) {
  if (!window.electronAPI) return;

  // Electron時はhtml/body/app背景を透明に
  document.documentElement.style.background = 'transparent';
  document.body.style.background = 'transparent';
  const appEl = document.querySelector('.app');
  if (appEl) {
    appEl.style.margin = '0';
    appEl.style.background = 'transparent';
  }

  // 非アクティブ時: 地面にステータス表示のみ（UIは消さない）
  const blurStats = document.getElementById('blur-stats');
  const blurLevel = document.getElementById('blur-level');
  const blurPoints = document.getElementById('blur-points');

  window.electronAPI.onWindowBlur(() => {
    document.body.classList.add('window-blurred');
    // 背景透過時のみ地面にステータス表示（通常時はタイトルバーが見えるので不要）
    if (blurStats && state && document.body.classList.contains('bg-transparent')) {
      blurLevel.textContent = state.level;
      blurPoints.textContent = state.points >= 1000 ? (state.points / 1000).toFixed(1) + 'K' : state.points;
      blurStats.hidden = false;
    }
  });

  window.electronAPI.onWindowFocus(() => {
    document.body.classList.remove('window-blurred');
    if (blurStats) blurStats.hidden = true;
  });

  // ウィンドウコントロールボタン
  const btnMinimize = document.getElementById('btn-minimize');
  const btnClose = document.getElementById('btn-close');
  const btnVersion = document.getElementById('btn-version');

  if (btnMinimize) {
    btnMinimize.addEventListener('click', () => window.electronAPI.minimize());
  }
  if (btnClose) {
    btnClose.addEventListener('click', () => window.electronAPI.close());
  }
}

// DOMContentLoaded で初期化
// NOTE: top-level await によりモジュール実行が遅延するため、
// DOMContentLoaded が既に発火済みの場合は直接 init() を呼ぶ
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
