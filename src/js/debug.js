// debug.js — デバッグモード UIとロジック

import { EVENT_MASTER } from './event-data.js';
import { forceTriggerEvent } from './event-system.js';
import { addPlayerExp, addPoints, saveState } from './game-state.js';
import { updateHUD } from './renderer-common.js';

export function initDebug(gameState) {
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
      if (keyBuffer.endsWith('debug')) {
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
