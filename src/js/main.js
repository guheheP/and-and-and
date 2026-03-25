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
  showLevelUpEffect,
} from './renderer.js';
import { initUI, buildCatalog } from './ui-controller.js';
import { CROP_MASTER } from './master-data.js';
import { getGachaPool } from './progression.js';
import {
  initEventSystem,
  setPointBoost,
  startRainParticles,
  stopAllParticles,
  startSnowParticles,
  startThunderFlashes,
  spawnBirdDropping,
  spawnCrossingSprite,
  spawnTumbleweed,
  spawnCumulonimbus,
} from './event-system.js';

/** すべてのイベントCSSクラス */
const ALL_EVENT_CLASSES = [
  'event--rain', 'event--heavy-rain', 'event--diamond-rain',
  'event--snow', 'event--thunder', 'event--typhoon', 'event--cumulonimbus',
  'event--tumbleweed', 'event--bird', 'event--stork',
  'event--santa', 'event--john', 'event--dog', 'event--cat',
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
  updateCharacter(state.currentCharId);
  updateField(state.fieldState);
  updateHUD(state);

  // 4. UI初期化
  initUI(state);

  // 5. イベントシステム初期化
  initEventSystem({
    onEventStart: (event) => handleEventStart(state, event),
    onEventEnd: (event) => handleEventEnd(state, event),
  }, state);

  // 6. ゲームループ開始（コールバック登録）
  startGameLoop(state, {
    onFieldUpdate: (fieldState) => {
      updateField(fieldState);
      updateHUD(state);
      
      // カタログが開いていればリアルタイム反映
      const catalogModal = document.getElementById('catalog-modal');
      if (catalogModal && !catalogModal.hidden) {
        buildCatalog();
      }
    },
    onPlant: (cropId) => {
      triggerWorkAnimation();
    },
    onHarvest: (cropId, points) => {
      triggerWorkAnimation();
      showHarvestEffect(points);
      showHarvestParticles(cropId);
      
      // カタログが開いていればリアルタイム反映
      const catalogModal = document.getElementById('catalog-modal');
      if (catalogModal && !catalogModal.hidden) {
        buildCatalog();
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

  // CSSクラス追加
  if (event.cssClass) {
    stage.classList.add(event.cssClass);
  }

  // インジケーター表示
  showEventIndicator(event.name);

  // ビジュアルエフェクト
  switch (event.id) {
    case 'rain':
      startRainParticles();
      break;
    case 'heavy_rain':
      startRainParticles('rgba(140, 180, 220, 0.8)', 35);
      break;
    case 'diamond_rain':
      startRainParticles('rgba(180, 220, 255, 0.9)', 25);
      break;
    case 'snow':
      startSnowParticles();
      break;
    case 'thunder':
      startRainParticles('rgba(160, 180, 200, 0.6)', 50);
      startThunderFlashes();
      break;
    case 'typhoon':
      startRainParticles('rgba(150, 170, 190, 0.5)', 30);
      break;
    case 'cumulonimbus':
      spawnCumulonimbus();
      break;
    case 'tumbleweed':
      spawnTumbleweed();
      break;
    case 'bird_poop':
      spawnBirdDropping();
      break;
    case 'stork':
      spawnCrossingSprite('🦩', 4000);
      break;
    case 'santa':
      spawnCrossingSprite('🎅', 4000);
      break;
    case 'john':
      spawnCrossingSprite('🧑', 4000);
      break;
    case 'dog_visit':
      // CSS ::after で犬が居座る
      break;
    case 'cat_visit':
      // CSS ::after で猫が居座る
      break;
  }

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

  // 全CSSクラス除去
  ALL_EVENT_CLASSES.forEach(cls => stage.classList.remove(cls));

  // 全パーティクル停止
  stopAllParticles();

  // インジケーター非表示
  hideEventIndicator();

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
      addSeed(state, cropId, count);
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
//  インジケーターUI
// ============================================

function showEventIndicator(name) {
  let indicator = document.getElementById('weather-indicator');
  if (!indicator) {
    indicator = document.createElement('span');
    indicator.id = 'weather-indicator';
    indicator.className = 'weather-indicator';
    const titleBar = document.querySelector('.title-bar');
    if (titleBar) {
      titleBar.insertBefore(indicator, titleBar.querySelector('.title-bar__controls'));
    }
  }
  indicator.textContent = name;
  indicator.style.display = '';
}

function hideEventIndicator() {
  const indicator = document.getElementById('weather-indicator');
  if (indicator) {
    indicator.textContent = '';
    indicator.style.display = 'none';
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
document.addEventListener('DOMContentLoaded', init);
