// ui-controller.js — メニュー・UI制御

import { rollGacha, rollGachaMulti, getGachaCost, isMultiGachaUnlocked } from './gacha.js';
import { CHARACTER_MASTER, CROP_MASTER, LEVEL_UNLOCK_CROPS, LEVEL_DEFAULT_CROP } from './master-data.js';
import { saveState, getCropLevel, getCropLevelMultiplier, executePrestige, purchaseUpgrade, getUpgradeLevel } from './game-state.js';
import { updateCharacter, updateHUD } from './renderer.js';
import { PRESTIGE_CONFIG, PRESTIGE_UPGRADES, getUpgradeCost, getUpgradeEffect } from './prestige-data.js';

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

  if (btnGachaMulti) {
    btnGachaMulti.addEventListener('click', () => {
      const result = rollGachaMulti(gameState);
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
            .map(([name, count]) => `${name} ×${count}`)
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
    });
  }

  if (btnGachaClose) {
    btnGachaClose.addEventListener('click', () => {
      if (gachaModal) { gachaModal.hidden = true; restoreSize(); }
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

  if (btnPrestigeExec) {
    btnPrestigeExec.addEventListener('click', () => {
      if (!gameState) return;
      if (gameState.level < PRESTIGE_CONFIG.minLevel) {
        alert(`Lv.${PRESTIGE_CONFIG.minLevel} 以上でプレステージ可能です（現在 Lv.${gameState.level}）`);
        return;
      }
      const earned = PRESTIGE_CONFIG.getCurrency(gameState.level);
      const confirmed = confirm(
        `プレステージを実行しますか？\n\n獲得通貨: 💎 ${earned}\n\n⚠️ レベル・ポイント・種がリセットされます\n（強化は保持されます）`
      );
      if (confirmed) {
        executePrestige(gameState);
        location.reload();
      }
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
    if (isMultiGachaUnlocked(gameState)) {
      btnGachaMulti.hidden = false;
      const multiCost = cost * 9;
      btnGachaMulti.textContent = `10連 (${multiCost}pt)`;
    } else {
      btnGachaMulti.hidden = true;
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

function isCurrentDefault(cropId) {
  if (!gameState) return false;
  for (const entry of LEVEL_DEFAULT_CROP) {
    if (gameState.level >= entry.level && entry.cropId === cropId) {
      return true;
    }
  }
  return false;
}

function buildCatalog() {
  const listEl = document.getElementById('catalog-list');
  if (!listEl || !gameState) return;

  listEl.innerHTML = '';
  const unlockedIds = getUnlockedCropIds();

  for (const [cropId, crop] of Object.entries(CROP_MASTER)) {
    const isUnlocked = unlockedIds.includes(cropId);
    const cropLevel = getCropLevel(gameState, cropId);
    const exp = gameState.cropExp[cropId] || 0;
    const expInLevel = exp % 5;
    const seedCount = gameState.seedsInventory[cropId] || 0;
    const multiplier = getCropLevelMultiplier(cropLevel);

    const item = document.createElement('div');
    item.className = `catalog-item${isUnlocked ? '' : ' catalog-item--locked'}`;

    const isDefault = isCurrentDefault(cropId);

    item.innerHTML = `
      <div class="catalog-item__icon" style="background:${CROP_COLORS[cropId] || '#888'}"></div>
      <div class="catalog-item__info">
        <div class="catalog-item__name">${isUnlocked ? crop.name : '???'}</div>
        <div class="catalog-item__stats">
          <span>Lv.${cropLevel}</span>
          <span>x${multiplier.toFixed(2)}</span>
        </div>
        <div class="catalog-item__level-bar">
          <div class="catalog-item__level-fill" style="width:${(expInLevel / 5) * 100}%"></div>
        </div>
      </div>
      <div class="catalog-item__seeds">${isUnlocked ? (isDefault ? '∞' : `${seedCount}`) : '🔒'}</div>
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
      const earn = PRESTIGE_CONFIG.getCurrency(gameState.level);
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
