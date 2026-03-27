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
  buildCharacterCustomizer, saveCharacterCustomizer, stopCharacterPreview,
  buildCatalog, buildEventLog, buildPrestigeShop,
} from './ui-modals.js';

import { updateCharacter } from './renderer-3d.js';

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

window.idleFarmScale = parseInt(localStorage.getItem('idle-farm-scale')) || 1;

function resizeForModal() {
  if (window.electronAPI?.resize) {
    const s = window.idleFarmScale;
    window.electronAPI.resize(MODAL_SIZE.w * s, MODAL_SIZE.h * s);
  }
}

function restoreSize() {
  if (window.electronAPI?.resize) {
    const s = window.idleFarmScale;
    window.electronAPI.resize(NORMAL_SIZE.w * s, NORMAL_SIZE.h * s);
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
  //  2倍サイズ切替
  // ============================================
  const btnSizeToggle = document.getElementById('btn-size-toggle');
  
  // 初期スケール適用
  document.body.style.zoom = window.idleFarmScale;
  // 初回ロード時のウィンドウサイズ同期
  setTimeout(() => {
    const modals = document.querySelectorAll('.modal:not([hidden])');
    if (modals.length > 0) resizeForModal();
    else restoreSize();
  }, 100);

  if (btnSizeToggle) {
    btnSizeToggle.addEventListener('click', () => {
      // モーダルが開いている時は切り替えを無効化（レイアウト崩れ防止）
      const modals = document.querySelectorAll('.modal:not([hidden])');
      if (modals.length > 0) return;

      window.idleFarmScale = window.idleFarmScale === 1 ? 2 : 1;
      localStorage.setItem('idle-farm-scale', window.idleFarmScale);
      
      document.body.style.zoom = window.idleFarmScale;
      restoreSize(); 
    });
  }

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
      menuPopup.classList.toggle('is-active');
    });
    document.addEventListener('click', (e) => {
      if (!menuPopup.contains(e.target) && e.target !== btnMenu) {
        menuPopup.classList.remove('is-active');
      }
    });
  }

  // ============================================
  //  時計トグル
  // ============================================
  const btnClock = document.getElementById('btn-clock-toggle');
  const clockEl = document.getElementById('sky-clock');
  const saved = localStorage.getItem('idle-farm-clock-visible');

  if (btnClock) {
    if (saved === 'true') {
      btnClock.classList.add('is-active');
    }

    btnClock.addEventListener('click', () => {
      const isActive = btnClock.classList.toggle('is-active');
      localStorage.setItem('idle-farm-clock-visible', isActive ? 'true' : 'false');
    });
  }

  // ============================================
  //  キャラカスタマイズモーダル
  // ============================================
  const btnChar = document.getElementById('btn-character');
  const characterModal = document.getElementById('character-modal');
  const btnCharClose = document.getElementById('btn-character-close');
  const btnCharSave = document.getElementById('btn-character-save');

  if (btnChar) {
    btnChar.addEventListener('click', () => {
      if (characterModal) {
        characterModal.hidden = false;
        resizeForModal();
      }
      buildCharacterCustomizer();
    });
  }

  if (btnCharClose) {
    btnCharClose.addEventListener('click', () => {
      if (characterModal) characterModal.hidden = true;
      restoreSize();
      stopCharacterPreview();
      // 元の見た目にリセット
      updateCharacter(gameState.characterConfig || { base: gameState.currentCharId });
    });
  }

  if (btnCharSave) {
    btnCharSave.addEventListener('click', () => {
      saveCharacterCustomizer(gameState);
      if (characterModal) characterModal.hidden = true;
      restoreSize();
      stopCharacterPreview();
    });
  }

  // ============================================
  //  作物カタログ
  // ============================================
  const btnCatalog = document.getElementById('btn-inventory');
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
  const btnBg = document.getElementById('btn-bg-toggle');
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
  const btnResetSave = document.getElementById('btn-open-reset');
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
      window.skipSaveOnUnload = true;
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
