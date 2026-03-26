// ui-controller.js — メニュー・UI制御

import { rollGacha, rollGachaBatch, getGachaCost, isGachaBatchUnlocked } from './gacha.js';
import { CHARACTER_MASTER, CROP_MASTER, LEVEL_UNLOCK_CROPS } from './master-data.js';
import { saveState, getCropLevel, getCropLevelMultiplier, getCropLevelProgress, executePrestige, purchaseUpgrade, getUpgradeLevel, clearSave, isCropInfinite } from './game-state.js';
import { updateCharacter, updateHUD } from './renderer.js';
import { PRESTIGE_CONFIG, PRESTIGE_UPGRADES, getUpgradeCost, getUpgradeEffect } from './prestige-data.js';
import { EVENT_MASTER } from './event-data.js';

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

  // ============================================
  //  ガチャ
  // ============================================
  const btnGacha = document.getElementById('btn-gacha');
  const btnGachaRoll = document.getElementById('btn-gacha-roll');
  const btnGachaMulti = document.getElementById('btn-gacha-multi');
  const btnGachaClose = document.getElementById('btn-gacha-close');
  const gachaModal = document.getElementById('gacha-modal');
  const gachaResult = document.getElementById('gacha-result');

  if (btnGacha) {
    btnGacha.addEventListener('click', () => {
      if (gachaModal) {
        gachaModal.hidden = false;
        if (gachaResult) gachaResult.textContent = '';
        updateGachaCostDisplay();
        resizeForModal();
      }
    });
  }

  if (btnGachaRoll) {
    btnGachaRoll.addEventListener('click', () => {
      const result = rollGacha(gameState);
      showGachaResult(gachaResult, result);
      updateHUD(gameState);
      updateGachaCostDisplay();
      saveState(gameState);
    });
  }

  const btnGacha50 = document.getElementById('btn-gacha-50');
  const btnGacha100 = document.getElementById('btn-gacha-100');

  const handleMultiGacha = (count) => {
    const result = rollGachaBatch(gameState, count);
    if (gachaResult) {
      gachaResult.innerHTML = '';
      if (result.success) {
        const summary = {};
        result.results.forEach(crop => {
          summary[crop.name] = (summary[crop.name] || 0) + 1;
        });
        const msg = document.createElement('div');
        msg.className = 'gacha-reveal';
        msg.innerHTML = Object.entries(summary)
          .map(([name, c]) => `${name} ×${c}`)
          .join('<br>');
        gachaResult.appendChild(msg);
      } else {
        const msg = document.createElement('div');
        msg.textContent = result.message;
        msg.style.color = '#ff6060';
        gachaResult.appendChild(msg);
      }
    }
    updateHUD(gameState);
    updateGachaCostDisplay();
    saveState(gameState);
  };

  if (btnGachaMulti) btnGachaMulti.addEventListener('click', () => handleMultiGacha(10));
  if (btnGacha50) btnGacha50.addEventListener('click', () => handleMultiGacha(50));
  if (btnGacha100) btnGacha100.addEventListener('click', () => handleMultiGacha(100));

  if (btnGachaClose) {
    btnGachaClose.addEventListener('click', () => {
      if (gachaModal) { gachaModal.hidden = true; restoreSize(); }
    });
  }

  // ============================================
  //  メニュー開閉
  // ============================================
  const btnMenu = document.getElementById('btn-menu');
  const menuPopup = document.getElementById('menu-popup');

  if (btnMenu && menuPopup) {
    btnMenu.addEventListener('click', (e) => {
      e.stopPropagation(); // 外側クリック判別用
      menuPopup.classList.toggle('is-active');
    });

    document.addEventListener('click', (e) => {
      // メニュー内やボタン本体のクリックでなければ閉じる
      if (!menuPopup.contains(e.target) && e.target !== btnMenu) {
        menuPopup.classList.remove('is-active');
      }
    });
  }

  // ============================================
  //  時計トグル
  // ============================================
  const btnClockToggle = document.getElementById('btn-clock-toggle');
  const skyClock = document.getElementById('sky-clock');

  if (skyClock) {
    // 毎秒時計を更新するループ
    setInterval(() => {
      if (skyClock.hidden) return;
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      skyClock.textContent = `${hh}:${mm}`;
    }, 1000);
  }

  if (btnClockToggle && skyClock) {
    const savedClockMode = localStorage.getItem('idle-farm-clock-visible');
    if (savedClockMode === 'true') {
      skyClock.hidden = false;
      btnClockToggle.classList.add('is-active');
      const now = new Date();
      skyClock.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }

    btnClockToggle.addEventListener('click', () => {
      const isVisible = skyClock.hidden;
      skyClock.hidden = !isVisible;
      btnClockToggle.classList.toggle('is-active', isVisible);
      localStorage.setItem('idle-farm-clock-visible', isVisible);
      if (isVisible) {
        const now = new Date();
        skyClock.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      }
    });
  }

  // ============================================
  //  キャラ変更
  // ============================================
  const btnCharacter = document.getElementById('btn-character');
  if (btnCharacter) {
    btnCharacter.addEventListener('click', () => {
      cycleCharacter();
    });
  }

  // ============================================
  //  作物カタログ
  // ============================================
  const btnInventory = document.getElementById('btn-inventory');
  const catalogModal = document.getElementById('catalog-modal');
  const btnCatalogClose = document.getElementById('btn-catalog-close');

  if (btnInventory) {
    btnInventory.addEventListener('click', () => {
      if (catalogModal) {
        buildCatalog();
        catalogModal.hidden = false;
        resizeForModal();
      }
    });
  }

  if (btnCatalogClose) {
    btnCatalogClose.addEventListener('click', () => {
      if (catalogModal) { catalogModal.hidden = true; restoreSize(); }
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
        buildPrestigeShop();
        prestigeModal.hidden = false;
        resizeForModal();
      }
    });
  }

  if (btnPrestigeClose) {
    btnPrestigeClose.addEventListener('click', () => {
      if (prestigeModal) { prestigeModal.hidden = true; restoreSize(); }
    });
  }

  const prestigeConfirmModal = document.getElementById('prestige-confirm-modal');
  const btnPrestigeConfirmYes = document.getElementById('btn-prestige-confirm-yes');
  const btnPrestigeConfirmNo = document.getElementById('btn-prestige-confirm-no');
  const prestigeConfirmEarn = document.getElementById('prestige-confirm-earn');

  if (btnPrestigeExec) {
    btnPrestigeExec.addEventListener('click', () => {
      if (!gameState) return;
      if (gameState.level < PRESTIGE_CONFIG.minLevel) return; // disabled checked earlier

      const earned = PRESTIGE_CONFIG.getCurrency(gameState);
      if (prestigeConfirmEarn) prestigeConfirmEarn.textContent = earned;
      
      if (prestigeModal) prestigeModal.hidden = true;
      if (prestigeConfirmModal) prestigeConfirmModal.hidden = false;
      resizeForModal();
    });
  }

  if (btnPrestigeConfirmYes) {
    btnPrestigeConfirmYes.addEventListener('click', () => {
      executePrestige(gameState);
      // 自動セーブ回避用フラグ
      window.skipSaveOnUnload = true;
      location.reload();
    });
  }

  if (btnPrestigeConfirmNo) {
    btnPrestigeConfirmNo.addEventListener('click', () => {
      if (prestigeConfirmModal) prestigeConfirmModal.hidden = true;
      if (prestigeModal) prestigeModal.hidden = false;
    });
  }

  // ============================================
  //  背景透過トグル
  // ============================================
  const btnBgToggle = document.getElementById('btn-bg-toggle');
  if (btnBgToggle) {
    const savedBgMode = localStorage.getItem('idle-farm-bg-transparent');
    if (savedBgMode === 'true') {
      document.body.classList.add('bg-transparent');
      btnBgToggle.classList.add('is-active');
    }

    btnBgToggle.addEventListener('click', () => {
      const isTransparent = document.body.classList.toggle('bg-transparent');
      btnBgToggle.classList.toggle('is-active', isTransparent);
      localStorage.setItem('idle-farm-bg-transparent', isTransparent);
    });
  }

  // ============================================
  //  3D モード切替
  // ============================================
  const btn3dToggle = document.getElementById('btn-3d-toggle');
  if (btn3dToggle) {
    const currentMode = localStorage.getItem('idle-farm-render-mode') || '2d';
    if (currentMode === '3d') {
      btn3dToggle.classList.add('is-active');
    }

    btn3dToggle.addEventListener('click', () => {
      const menuPopup = document.getElementById('menu-popup');
      if (menuPopup) menuPopup.classList.remove('is-active');
      const current = localStorage.getItem('idle-farm-render-mode') || '2d';
      const next = current === '3d' ? '2d' : '3d';
      localStorage.setItem('idle-farm-render-mode', next);
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
      const menuPopup = document.getElementById('menu-popup');
      if (menuPopup) menuPopup.classList.remove('is-active');
      if (logModal) {
        buildEventLog();
        logModal.hidden = false;
        resizeForModal();
      }
    });
  }

  if (btnLogClose && logModal) {
    btnLogClose.addEventListener('click', () => {
      logModal.hidden = true;
      restoreSize();
    });
  }

  // ============================================
  //  バージョン＆設定モーダル
  // ============================================
  const btnVersion = document.getElementById('btn-version');
  const versionModal = document.getElementById('version-modal');
  const btnVersionClose = document.getElementById('btn-version-close');
  const btnOpenReset = document.getElementById('btn-open-reset');

  const confirmModal = document.getElementById('confirm-modal');
  const btnConfirmYes = document.getElementById('btn-confirm-yes');
  const btnConfirmNo = document.getElementById('btn-confirm-no');

  if (btnVersion) {
    btnVersion.addEventListener('click', () => {
      if (menuPopup) menuPopup.classList.remove('is-active');
      if (versionModal) {
        versionModal.hidden = false;
        resizeForModal();
      }
    });
  }

  if (btnVersionClose) {
    btnVersionClose.addEventListener('click', () => {
      if (versionModal) {
        versionModal.hidden = true;
        restoreSize();
      }
    });
  }

  if (btnOpenReset) {
    btnOpenReset.addEventListener('click', () => {
      if (versionModal) versionModal.hidden = true;
      if (confirmModal) confirmModal.hidden = false;
      resizeForModal();
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

// ============================================
//  ガチャ関連
// ============================================

function showGachaResult(resultEl, result) {
  if (!resultEl) return;
  resultEl.innerHTML = '';
  const msg = document.createElement('div');
  if (result.success) {
    msg.className = `gacha-reveal rarity-${result.cropData.rarity}`;
    msg.textContent = result.message;
  } else {
    msg.textContent = result.message;
    msg.style.color = '#ff6060';
  }
  resultEl.appendChild(msg);
}

function updateGachaCostDisplay() {
  if (!gameState) return;
  const cost = getGachaCost(gameState);
  const btnGachaRoll = document.getElementById('btn-gacha-roll');
  if (btnGachaRoll) {
    btnGachaRoll.textContent = `回す (${cost}pt)`;
  }

  // 10連ボタンの表示/非表示
  const btnGachaMulti = document.getElementById('btn-gacha-multi');
  if (btnGachaMulti) {
    if (isGachaBatchUnlocked(gameState, 10)) {
      btnGachaMulti.hidden = false;
      btnGachaMulti.textContent = `10連 (${cost * 10}pt)`;
    } else {
      btnGachaMulti.hidden = true;
    }
  }

  // 50連ボタンの表示/非表示
  const btnGacha50 = document.getElementById('btn-gacha-50');
  if (btnGacha50) {
    if (isGachaBatchUnlocked(gameState, 50)) {
      btnGacha50.hidden = false;
      btnGacha50.textContent = `50連 (${cost * 50}pt)`;
    } else {
      btnGacha50.hidden = true;
    }
  }

  // 100連ボタンの表示/非表示
  const btnGacha100 = document.getElementById('btn-gacha-100');
  if (btnGacha100) {
    if (isGachaBatchUnlocked(gameState, 100)) {
      btnGacha100.hidden = false;
      btnGacha100.textContent = `100連 (${cost * 100}pt)`;
    } else {
      btnGacha100.hidden = true;
    }
  }
}

// ============================================
//  キャラ変更
// ============================================

function cycleCharacter() {
  if (!gameState) return;
  const charIds = Object.keys(CHARACTER_MASTER);
  const currentIdx = charIds.indexOf(gameState.currentCharId);
  const nextIdx = (currentIdx + 1) % charIds.length;
  const nextId = charIds[nextIdx];
  gameState.currentCharId = nextId;
  updateCharacter(nextId);
  saveState(gameState);
}

// ============================================
//  作物カタログ
// ============================================

function getUnlockedCropIds() {
  if (!gameState) return [];
  const unlocked = [];
  for (const [lvl, cropIds] of Object.entries(LEVEL_UNLOCK_CROPS)) {
    if (gameState.level >= Number(lvl)) {
      unlocked.push(...cropIds);
    }
  }
  return unlocked;
}

export function buildCatalog() {
  const listEl = document.getElementById('catalog-list');
  if (!listEl || !gameState) return;

  // 1回だけイベントデリゲーションを設定（多重登録防止）
  if (!listEl.dataset.clickEventAttached) {
    listEl.addEventListener('mousedown', (e) => {
      const itemNode = e.target.closest('.catalog-item');
      if (!itemNode) return;
      
      const cropId = itemNode.dataset.cropId;
      if (!cropId || itemNode.classList.contains('catalog-item--locked')) return;

      // 対象を切り替え (既に優先なら解除)
      if (gameState.selectedCropId === cropId) {
        gameState.selectedCropId = null;
      } else {
        gameState.selectedCropId = cropId;
      }
      saveState(gameState);
      buildCatalog(); // 即座に再描画
    });
    listEl.dataset.clickEventAttached = 'true';
  }

  listEl.innerHTML = '';
  const unlockedIds = getUnlockedCropIds();

  for (const [cropId, crop] of Object.entries(CROP_MASTER)) {
    const isUnlocked = unlockedIds.includes(cropId);
    const cropLevel = getCropLevel(gameState, cropId);
    const { current: expInLevel, required: expRequired } = getCropLevelProgress(gameState, cropId);
    const seedCount = gameState.seedsInventory[cropId] || 0;
    const multiplier = getCropLevelMultiplier(cropLevel);

    const isInf = isCropInfinite(gameState, cropId);
    const isSelected = gameState.selectedCropId === cropId;

    const item = document.createElement('div');
    item.className = `catalog-item${isUnlocked ? '' : ' catalog-item--locked'}${isSelected ? ' is-selected' : ''}`;
    
    // イベントデリゲーション用にデータを仕込む
    item.dataset.cropId = cropId;
    
    if (isUnlocked) {
      item.style.cursor = 'pointer';
    }

    item.innerHTML = `
      <div class="catalog-item__icon-wrapper ${crop.cssClass}">
        <div class="catalog-fruit"></div>
      </div>
      <div class="catalog-item__info">
        <div class="catalog-item__name">${isUnlocked ? crop.name : '???'}</div>
        <div class="catalog-item__stats">
          <span>Lv.${cropLevel}</span>
          <span>x${multiplier.toFixed(2)}</span>
        </div>
        <div class="catalog-item__level-bar">
          <div class="catalog-item__level-fill" style="width:${(expInLevel / expRequired) * 100}%"></div>
        </div>
      </div>
      <div class="catalog-item__seeds">${isUnlocked ? (isInf ? '∞' : `${seedCount}`) : '🔒'}</div>
    `;

    listEl.appendChild(item);
  }
}

// ============================================
//  イベント図鑑
// ============================================

function buildEventLog() {
  const listEl = document.getElementById('log-list');
  if (!listEl || !gameState) return;

  listEl.innerHTML = '';
  
  for (const [id, eventData] of Object.entries(EVENT_MASTER)) {
    const count = (gameState.eventCounts && gameState.eventCounts[id]) || 0;
    const isUnlocked = count > 0;

    const item = document.createElement('div');
    item.className = `log-item${isUnlocked ? '' : ' log-item--locked'}`;
    
    // アイコンと名前（分割）
    const nameParts = eventData.name.split(' ');
    // 未遭遇の場合は '❓ 未知の現象'
    const icon = isUnlocked ? (nameParts[0] || '✨') : '❓';
    const dispName = isUnlocked ? (nameParts.slice(1).join(' ') || eventData.name) : '未知の現象';

    item.innerHTML = `
      <div class="log-item__icon">${icon}</div>
      <div class="log-item__info">
        <div class="log-item__name">${dispName}</div>
      </div>
      <div class="log-item__count">${isUnlocked ? `遭遇: ${count}回` : '未遭遇'}</div>
    `;

    listEl.appendChild(item);
  }
}

// ============================================
//  プレステージショップ
// ============================================

function buildPrestigeShop() {
  if (!gameState) return;

  // ヘッダー更新
  const currencyEl = document.getElementById('prestige-currency');
  const countEl = document.getElementById('prestige-count');
  if (currencyEl) currencyEl.textContent = gameState.prestigeCurrency || 0;
  if (countEl) countEl.textContent = gameState.prestigeCount || 0;

  // プレステージ実行ボタンの状態
  const btnExec = document.getElementById('btn-prestige-exec');
  if (btnExec) {
    const canPrestige = gameState.level >= PRESTIGE_CONFIG.minLevel;
    btnExec.disabled = !canPrestige;
    if (canPrestige) {
      const earn = PRESTIGE_CONFIG.getCurrency(gameState);
      btnExec.textContent = `プレステージ (💎+${earn})`;
    } else {
      btnExec.textContent = `Lv.${PRESTIGE_CONFIG.minLevel}で解放`;
    }
  }

  // ショップリスト
  const shopEl = document.getElementById('prestige-shop');
  if (!shopEl) return;
  shopEl.innerHTML = '';

  for (const [id, upgrade] of Object.entries(PRESTIGE_UPGRADES)) {
    const currentLv = getUpgradeLevel(gameState, id);
    const isMaxed = currentLv >= upgrade.maxLv;
    const cost = isMaxed ? 0 : getUpgradeCost(upgrade, currentLv);
    const canAfford = (gameState.prestigeCurrency || 0) >= cost;

    const row = document.createElement('div');
    row.className = `upgrade-row${isMaxed ? ' upgrade-row--maxed' : ''}`;

    row.innerHTML = `
      <div class="upgrade-info">
        <span class="upgrade-name">${upgrade.name}</span>
        <span class="upgrade-effect">${upgrade.effectLabel(currentLv)}</span>
      </div>
      <span class="upgrade-level">Lv.${currentLv}/${upgrade.maxLv}</span>
    `;

    const btn = document.createElement('button');
    btn.className = 'upgrade-buy';
    if (isMaxed) {
      btn.textContent = 'MAX';
      btn.disabled = true;
    } else {
      btn.textContent = `💎${cost}`;
      btn.disabled = !canAfford;
      btn.addEventListener('click', () => {
        const result = purchaseUpgrade(gameState, id);
        if (result.success) {
          buildPrestigeShop(); // 再描画
        }
      });
    }

    row.appendChild(btn);
    shopEl.appendChild(row);
  }
}
