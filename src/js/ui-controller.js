// ui-controller.js — メニュー・UI制御（イベントリスナー登録）

import { rollGacha, rollGachaBatch, getGachaCost, isGachaBatchUnlocked } from './gacha.js';
import { CHARACTER_MASTER, CROP_MASTER, LEVEL_UNLOCK_CROPS } from './master-data.js';
import { saveState, getCropLevel, getCropLevelMultiplier, getCropLevelProgress, executePrestige, purchaseUpgrade, getUpgradeLevel, clearSave, isCropInfinite } from './game-state.js';
import { updateHUD } from './renderer-common.js';
import { PRESTIGE_CONFIG, PRESTIGE_UPGRADES, getUpgradeCost, getUpgradeEffect } from './prestige-data.js';
import { EVENT_MASTER } from './event-data.js';
import {
  setGameState,
  cycleGachaQty, getCurrentGachaQty,
  showGachaResult, showGachaBatchResult, updateGachaCostDisplay,
  cycleCharacter,
  buildCatalog, buildEventLog, buildPrestigeShop,
} from './ui-modals.js';

// レンダラーモードに応じた updateCharacter を動的に取得
const renderMode = localStorage.getItem('idle-farm-render-mode') || '3d';
const { updateCharacter } = renderMode === '3d'
  ? await import('./renderer-3d.js')
  : await import('./renderer.js');

/** 作物の色マップ */
const CROP_COLORS = {
  tomato: '#e04040',
  potato: '#c8a050',
  carrot: '#ff8c00',
  strawberry: '#ff4060',
  corn: '#f0d040',
  pumpkin: '#e08020',
  watermelon: '#408040',
  golden_apple: '#ffd700',
  tumbleweed: '#a08850',
  christmas_tree: '#2d8040',
};

/** @type {GameState|null} */
let gameState = null;

/** Electronウィンドウサイズ管理 */
const NORMAL_SIZE = { w: 240, h: 210 };
const MODAL_SIZE = { w: 240, h: 400 };

function resizeForModal() {
  if (window.electronAPI?.resize) {
    window.electronAPI.resize(MODAL_SIZE.w, MODAL_SIZE.h);
  }
}

function restoreSize() {
  if (window.electronAPI?.resize) {
    window.electronAPI.resize(NORMAL_SIZE.w, NORMAL_SIZE.h);
  }
}

/**
 * UIコントローラーの初期化
 * @param {GameState} state
 */
export function initUI(state) {
  gameState = state;
  setGameState(state); // ui-modals にも共有

  // ============================================
  //  種購入（旧ガチャ）
  // ============================================
  const btnGacha = document.getElementById('btn-gacha');
  const btnGachaBuy = document.getElementById('btn-gacha-buy');
  const btnGachaClose = document.getElementById('btn-gacha-close');
  const gachaModal = document.getElementById('gacha-modal');
  const gachaResult = document.getElementById('gacha-result');
  const btnGachaPrev = document.getElementById('btn-gacha-prev');
  const btnGachaNext = document.getElementById('btn-gacha-next');

  if (btnGacha) {
    btnGacha.addEventListener('click', () => {
      if (gachaModal) {
        gachaModal.hidden = false;
        resizeForModal();
      }
      updateGachaCostDisplay();
    });
  }

  // 長押し連続購入
  let buyInterval = null;
  let buyCount = 0;

  function doBuy() {
    const qty = getCurrentGachaQty();
    const rapid = buyCount > 0;

    if (qty === 1) {
      const result = rollGacha(gameState);
      showGachaResult(gachaResult, result, rapid);
    } else {
      const result = rollGachaBatch(gameState, qty);
      showGachaBatchResult(gachaResult, result, rapid);
    }
    buyCount++;
    updateHUD(gameState);
    updateGachaCostDisplay();
    saveState(gameState);
  }

  if (btnGachaBuy) {
    btnGachaBuy.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      buyCount = 0;
      doBuy();
      buyInterval = setInterval(doBuy, 200);
    });

    const stopBuy = () => {
      if (buyInterval) {
        clearInterval(buyInterval);
        buyInterval = null;
      }
      buyCount = 0;
    };

    btnGachaBuy.addEventListener('mouseup', stopBuy);
    btnGachaBuy.addEventListener('mouseleave', stopBuy);
    window.addEventListener('blur', stopBuy);
  }

  if (btnGachaClose) {
    btnGachaClose.addEventListener('click', () => {
      if (gachaModal) gachaModal.hidden = true;
      restoreSize();
    });
  }

  if (btnGachaPrev) {
    btnGachaPrev.addEventListener('click', () => {
      cycleGachaQty(-1);
      updateGachaCostDisplay();
    });
  }

  if (btnGachaNext) {
    btnGachaNext.addEventListener('click', () => {
      cycleGachaQty(1);
      updateGachaCostDisplay();
    });
  }

  // ============================================
  //  メニュー開閉
  // ============================================
  const btnMenu = document.getElementById('btn-menu');
  const menuPopup = document.getElementById('menu-popup');
  if (btnMenu && menuPopup) {
    btnMenu.addEventListener('click', () => {
      menuPopup.hidden = !menuPopup.hidden;
    });
    document.addEventListener('click', (e) => {
      if (!menuPopup.hidden && !menuPopup.contains(e.target) && e.target !== btnMenu) {
        menuPopup.hidden = true;
      }
    });
  }

  // ============================================
  //  時計トグル
  // ============================================
  const btnClock = document.getElementById('btn-clock');
  const clockEl = document.getElementById('sky-clock');
  const saved = localStorage.getItem('idle-farm-clock-visible');

  if (btnClock) {
    if (saved === 'true') {
      btnClock.classList.add('is-active');
      if (clockEl) clockEl.hidden = false;
    } else {
      if (clockEl) clockEl.hidden = true;
    }

    btnClock.addEventListener('click', () => {
      const isActive = btnClock.classList.toggle('is-active');
      if (clockEl) clockEl.hidden = !isActive;
      localStorage.setItem('idle-farm-clock-visible', isActive ? 'true' : 'false');
    });

    // 分ごとに時刻を更新
    if (clockEl) {
      const updateClock = () => {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        clockEl.textContent = `${hh}:${mm}`;
      };
      updateClock();
      setInterval(updateClock, 10000);
    }
  }

  // ============================================
  //  キャラ変更
  // ============================================
  const btnChar = document.getElementById('btn-char');
  if (btnChar) {
    btnChar.addEventListener('click', () => {
      cycleCharacter();
    });
  }

  // ============================================
  //  作物カタログ
  // ============================================
  const btnCatalog = document.getElementById('btn-catalog');
  const catalogModal = document.getElementById('catalog-modal');
  const btnCatalogClose = document.getElementById('btn-catalog-close');

  if (btnCatalog) {
    btnCatalog.addEventListener('click', () => {
      if (catalogModal) {
        catalogModal.hidden = false;
        resizeForModal();
      }
      buildCatalog();
    });
  }

  if (btnCatalogClose) {
    btnCatalogClose.addEventListener('click', () => {
      if (catalogModal) catalogModal.hidden = true;
      restoreSize();
    });
  }

  // ============================================
  //  プレステージ
  // ============================================
  const btnPrestige = document.getElementById('btn-prestige');
  const prestigeModal = document.getElementById('prestige-modal');
  const btnPrestigeClose = document.getElementById('btn-prestige-close');
  const btnPrestigeExec = document.getElementById('btn-prestige-exec');

  if (btnPrestige) {
    btnPrestige.addEventListener('click', () => {
      if (prestigeModal) {
        prestigeModal.hidden = false;
        resizeForModal();
      }
      buildPrestigeShop();
    });
  }

  if (btnPrestigeClose) {
    btnPrestigeClose.addEventListener('click', () => {
      if (prestigeModal) prestigeModal.hidden = true;
      restoreSize();
    });
  }

  if (btnPrestigeExec) {
    btnPrestigeExec.addEventListener('click', () => {
      if (!gameState || gameState.level < PRESTIGE_CONFIG.minLevel) return;
      if (!confirm('プレステージで全データをリセットし報酬を得ますか？')) return;

      executePrestige(gameState);
      
      const char = CHARACTER_MASTER[gameState.currentCharId];
      if (char) updateCharacter(gameState.currentCharId);

      buildPrestigeShop();
      updateHUD(gameState);
    });
  }

  // ============================================
  //  背景透過トグル
  // ============================================
  const btnBg = document.getElementById('btn-bg');
  if (btnBg) {
    const savedBg = localStorage.getItem('idle-farm-bg-transparent');
    if (savedBg === 'true') {
      document.body.classList.add('bg-transparent');
      btnBg.classList.add('is-active');
    }
    btnBg.addEventListener('click', () => {
      const nowTransparent = document.body.classList.toggle('bg-transparent');
      btnBg.classList.toggle('is-active', nowTransparent);
      localStorage.setItem('idle-farm-bg-transparent', nowTransparent ? 'true' : 'false');
    });
  }

  // ============================================
  //  3D モード切替
  // ============================================
  const btn3D = document.getElementById('btn-3d');
  if (btn3D) {
    const mode = localStorage.getItem('idle-farm-render-mode') || '3d';
    btn3D.classList.toggle('is-active', mode === '3d');
    btn3D.addEventListener('click', () => {
      const nowMode = localStorage.getItem('idle-farm-render-mode') || '3d';
      const nextMode = nowMode === '3d' ? '2d' : '3d';
      localStorage.setItem('idle-farm-render-mode', nextMode);
      location.reload();
    });
  }

  // ============================================
  //  イベント図鑑
  // ============================================
  const btnLog = document.getElementById('btn-log');
  const logModal = document.getElementById('log-modal');
  const btnLogClose = document.getElementById('btn-log-close');

  if (btnLog) {
    btnLog.addEventListener('click', () => {
      if (logModal) {
        logModal.hidden = false;
        resizeForModal();
      }
      buildEventLog();
    });
  }

  if (btnLogClose) {
    btnLogClose.addEventListener('click', () => {
      if (logModal) logModal.hidden = true;
      restoreSize();
    });
  }

  // ============================================
  //  バージョン＆設定モーダル
  // ============================================
  const btnVersion = document.getElementById('btn-version');
  const versionModal = document.getElementById('version-modal');
  const btnVersionClose = document.getElementById('btn-version-close');
  const btnResetSave = document.getElementById('btn-reset-save');
  const confirmModal = document.getElementById('confirm-modal');
  const btnConfirmYes = document.getElementById('btn-confirm-yes');
  const btnConfirmNo = document.getElementById('btn-confirm-no');

  if (btnVersion) {
    btnVersion.addEventListener('click', () => {
      if (versionModal) {
        versionModal.hidden = false;
        resizeForModal();
      }
    });
  }

  if (btnVersionClose) {
    btnVersionClose.addEventListener('click', () => {
      if (versionModal) versionModal.hidden = true;
      restoreSize();
    });
  }

  if (btnResetSave) {
    btnResetSave.addEventListener('click', () => {
      if (versionModal) versionModal.hidden = true;
      if (confirmModal) confirmModal.hidden = false;
    });
  }

  if (btnConfirmYes) {
    btnConfirmYes.addEventListener('click', () => {
      clearSave();
      location.reload();
    });
  }

  if (btnConfirmNo) {
    btnConfirmNo.addEventListener('click', () => {
      if (confirmModal) confirmModal.hidden = true;
      if (versionModal) versionModal.hidden = false;
    });
  }
}

// buildCatalog を再エクスポート（game-loop.js等からの参照用）
export { buildCatalog };
