// debug.js — デバッグモード UIとロジック

import { EVENT_MASTER } from './event-data.js';
import { forceTriggerEvent } from './event-system.js';
import { addPlayerExp, addPoints, saveState, getActiveSlotCount } from './game-state.js';
import { updateHUD } from './renderer-common.js';
import { rebuildFields } from './renderer-3d.js';

export function initDebug(gameState) {
  // リリース版（Electron パッケージ版で --dev なし）ではデバッグ無効
  const isElectron = !!window.electronAPI;
  const isDevMode = window.electronAPI?.isDevMode ?? false;
  if (isElectron && !isDevMode) return;

  const debugModal = document.getElementById('debug-modal');
  if (!debugModal) return;

  // プルダウンにイベント一覧を展開
  const select = document.getElementById('debug-event-select');
  if (select) {
    for (const [id, event] of Object.entries(EVENT_MASTER)) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = `${event.name} (${id})`;
      select.appendChild(opt);
    }
  }

  // イベント強制発生ボタン
  document.getElementById('btn-debug-trigger-event')?.addEventListener('click', () => {
    if (select && select.value) {
      forceTriggerEvent(select.value);
    }
  });

  // 経験値付与ボタン
  document.getElementById('btn-debug-add-exp')?.addEventListener('click', () => {
    addPlayerExp(gameState, 1000);
    updateHUD(gameState);
    saveState(gameState);
  });

  // ポイント付与ボタン
  document.getElementById('btn-debug-add-pt')?.addEventListener('click', () => {
    addPoints(gameState, 10000);
    updateHUD(gameState);
    saveState(gameState);
  });

  // 畑プレビュー（ゲームループも複数畑で動作させる）
  [1, 2, 3, 4].forEach(n => {
    document.getElementById(`btn-debug-field-${n}`)?.addEventListener('click', () => {
      // fieldSlotsを必要数まで拡張
      while (gameState.fieldSlots.length < n) {
        gameState.fieldSlots.push({ isPlanted: false, cropId: null, plantedAt: null, progress: 0 });
      }
      // デバッグ用の強制スロット数を設定（getActiveSlotCountをオーバーライド）
      window._debugFieldSlots = n;
      rebuildFields(n);
    });
  });

  // デバッグモーダル閉じる
  document.getElementById('btn-debug-close')?.addEventListener('click', () => {
    debugModal.hidden = true;
    if (window.electronAPI?.resize) {
      window.electronAPI.resize(240, 210); // 通常サイズに戻す
    }
  });

  // ショートカット・隠しコマンドでモーダルを開く
  let keyBuffer = '';
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
      openDebugModal();
    } else {
      keyBuffer += e.key;
      if (keyBuffer.length > 20) keyBuffer = keyBuffer.slice(-20);
      if (keyBuffer.endsWith('opendebug')) {
        openDebugModal();
        keyBuffer = '';
      }
    }
  });

  function openDebugModal() {
    debugModal.hidden = false;
    // メニューが開いていれば閉じる
    document.getElementById('menu-popup')?.classList.remove('is-active');
    
    if (window.electronAPI?.resize) {
      window.electronAPI.resize(240, 400); // モーダルサイズ
    }
  }
}
