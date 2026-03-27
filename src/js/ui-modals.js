// ui-modals.js — モーダルコンテンツの描画ロジック
// 種購入結果、キャラ変更、作物カタログ、イベント図鑑、プレステージショップ

import { CHARACTER_MASTER, CROP_MASTER, LEVEL_UNLOCK_CROPS } from './master-data.js';
import { saveState, getCropLevel, getCropLevelMultiplier, getCropLevelProgress, purchaseUpgrade, getUpgradeLevel, isCropInfinite } from './game-state.js';
import { isGachaBatchUnlocked, getGachaCost } from './gacha.js';
import { PRESTIGE_CONFIG, PRESTIGE_UPGRADES, getUpgradeCost } from './prestige-data.js';
import { EVENT_MASTER } from './event-data.js';

// レンダラーモードに応じた updateCharacter を動的に取得
const renderMode = localStorage.getItem('idle-farm-render-mode') || '3d';
const { updateCharacter } = renderMode === '3d'
  ? await import('./renderer-3d.js')
  : await import('./renderer.js');

// ============================================
//  種購入（旧ガチャ）関連
// ============================================

/** 購入数量の選択肢管理 */
let currentGachaQtyIndex = 0;

/** @type {GameState|null} */
let _gameState = null;

/** gameState を外部から設定する */
export function setGameState(state) {
  _gameState = state;
}

/** 現在解放済みの購入数量リストを取得 */
function getAvailableGachaQties() {
  const qties = [1];
  if (_gameState && isGachaBatchUnlocked(_gameState, 10)) qties.push(10);
  if (_gameState && isGachaBatchUnlocked(_gameState, 50)) qties.push(50);
  if (_gameState && isGachaBatchUnlocked(_gameState, 100)) qties.push(100);
  return qties;
}

/** ◀▶で数量を切り替える */
export function cycleGachaQty(dir) {
  const qties = getAvailableGachaQties();
  currentGachaQtyIndex = (currentGachaQtyIndex + dir + qties.length) % qties.length;
}

/** 現在選択中の数量を取得 */
export function getCurrentGachaQty() {
  const qties = getAvailableGachaQties();
  if (currentGachaQtyIndex >= qties.length) currentGachaQtyIndex = qties.length - 1;
  return qties[currentGachaQtyIndex];
}

export function showGachaResult(resultEl, result, rapid = false) {
  if (!resultEl) return;

  if (rapid && resultEl.firstChild) {
    const existing = resultEl.firstChild;
    if (result.success) {
      existing.className = `rarity-${result.cropData.rarity}`;
      existing.textContent = result.message;
      existing.style.color = '';
    } else {
      existing.className = '';
      existing.textContent = result.message;
      existing.style.color = '#ff6060';
    }
    return;
  }

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

export function showGachaBatchResult(resultEl, result, rapid = false) {
  if (!resultEl) return;

  if (rapid && resultEl.firstChild && result.success) {
    const summary = {};
    result.results.forEach(crop => {
      summary[crop.name] = (summary[crop.name] || 0) + 1;
    });
    resultEl.firstChild.innerHTML = Object.entries(summary)
      .map(([name, c]) => `${name} ×${c}`)
      .join('<br>');
    return;
  }

  resultEl.innerHTML = '';
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
    resultEl.appendChild(msg);
  } else {
    const msg = document.createElement('div');
    msg.textContent = result.message;
    msg.style.color = '#ff6060';
    resultEl.appendChild(msg);
  }
}

export function updateGachaCostDisplay() {
  if (!_gameState) return;
  const cost = getGachaCost(_gameState);
  const qties = getAvailableGachaQties();

  if (currentGachaQtyIndex >= qties.length) currentGachaQtyIndex = qties.length - 1;

  const qty = qties[currentGachaQtyIndex];
  const totalCost = cost * qty;

  const qtyLabel = document.getElementById('gacha-qty-label');
  if (qtyLabel) qtyLabel.textContent = `${qty}個`;

  const btnBuy = document.getElementById('btn-gacha-buy');
  if (btnBuy) btnBuy.textContent = `購入 (${totalCost}pt)`;

  const btnPrev = document.getElementById('btn-gacha-prev');
  const btnNext = document.getElementById('btn-gacha-next');
  const hide = qties.length <= 1;
  if (btnPrev) btnPrev.style.visibility = hide ? 'hidden' : 'visible';
  if (btnNext) btnNext.style.visibility = hide ? 'hidden' : 'visible';
}

// ============================================
//  キャラ変更
// ============================================

export function buildCharacterCustomizer() {
  if (!_gameState) return;
  const baseSelect = document.getElementById('char-base-select');
  const hatSelect = document.getElementById('char-hat-select');
  const accSelect = document.getElementById('char-acc-select');
  if (!baseSelect || !hatSelect || !accSelect) return;

  // 初期化：ベースの選択肢を生成
  if (baseSelect.options.length === 0) {
    for (const [id, charData] of Object.entries(CHARACTER_MASTER)) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = charData.name;
      baseSelect.appendChild(opt);
    }
  }

  // 現在の設定を反映
  const config = _gameState.characterConfig || { base: _gameState.currentCharId };
  baseSelect.value = config.base || 'man';
  hatSelect.value = config.hat || 'none';
  accSelect.value = config.accessory || 'none';

  // 値が変わった時のライブプレビュー更新
  const updatePreview = () => {
    updateCharacter({
      base: baseSelect.value,
      hat: hatSelect.value === 'none' ? undefined : hatSelect.value,
      accessory: accSelect.value === 'none' ? undefined : accSelect.value
    });
  };

  baseSelect.onchange = updatePreview;
  hatSelect.onchange = updatePreview;
  accSelect.onchange = updatePreview;
  
  // モーダルを開いた瞬間の状態反映
  updatePreview();
}

export function saveCharacterCustomizer(gameStateObj) {
  const baseSelect = document.getElementById('char-base-select');
  const hatSelect = document.getElementById('char-hat-select');
  const accSelect = document.getElementById('char-acc-select');
  if (!baseSelect || !hatSelect || !accSelect) return;

  gameStateObj.characterConfig = {
    base: baseSelect.value,
    hat: hatSelect.value === 'none' ? undefined : hatSelect.value,
    accessory: accSelect.value === 'none' ? undefined : accSelect.value
  };
  gameStateObj.currentCharId = baseSelect.value; // 後方互換
  saveState(gameStateObj);
  updateCharacter(gameStateObj.characterConfig);
}

// ============================================
//  作物カタログ
// ============================================

function getUnlockedCropIds() {
  if (!_gameState) return [];
  const unlocked = [];
  for (const [lvl, cropIds] of Object.entries(LEVEL_UNLOCK_CROPS)) {
    if (_gameState.level >= Number(lvl)) {
      unlocked.push(...cropIds);
    }
  }
  return unlocked;
}

export function buildCatalog() {
  const listEl = document.getElementById('catalog-list');
  if (!listEl || !_gameState) return;

  if (!listEl.dataset.clickEventAttached) {
    listEl.addEventListener('mousedown', (e) => {
      const itemNode = e.target.closest('.catalog-item');
      if (!itemNode) return;
      
      const cropId = itemNode.dataset.cropId;
      if (!cropId || itemNode.classList.contains('catalog-item--locked')) return;

      if (_gameState.selectedCropId === cropId) {
        _gameState.selectedCropId = null;
      } else {
        _gameState.selectedCropId = cropId;
      }
      saveState(_gameState);
      buildCatalog();
    });
    listEl.dataset.clickEventAttached = 'true';
  }

  listEl.innerHTML = '';
  const unlockedIds = getUnlockedCropIds();

  for (const [cropId, crop] of Object.entries(CROP_MASTER)) {
    const isUnlocked = unlockedIds.includes(cropId);
    const cropLevel = getCropLevel(_gameState, cropId);
    const { current: expInLevel, required: expRequired } = getCropLevelProgress(_gameState, cropId);
    const seedCount = _gameState.seedsInventory[cropId] || 0;
    const multiplier = getCropLevelMultiplier(cropLevel);

    const isInf = isCropInfinite(_gameState, cropId);
    const isSelected = _gameState.selectedCropId === cropId;

    const item = document.createElement('div');
    item.className = `catalog-item${isUnlocked ? '' : ' catalog-item--locked'}${isSelected ? ' is-selected' : ''}`;
    
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

export function buildEventLog() {
  const listEl = document.getElementById('log-list');
  if (!listEl || !_gameState) return;

  listEl.innerHTML = '';
  
  for (const [id, eventData] of Object.entries(EVENT_MASTER)) {
    const count = (_gameState.eventCounts && _gameState.eventCounts[id]) || 0;
    const isUnlocked = count > 0;

    const item = document.createElement('div');
    item.className = `log-item${isUnlocked ? '' : ' log-item--locked'}`;
    
    const nameParts = eventData.name.split(' ');
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

export function buildPrestigeShop() {
  if (!_gameState) return;

  const currencyEl = document.getElementById('prestige-currency');
  const countEl = document.getElementById('prestige-count');
  if (currencyEl) currencyEl.textContent = _gameState.prestigeCurrency || 0;
  if (countEl) countEl.textContent = _gameState.prestigeCount || 0;

  const btnExec = document.getElementById('btn-prestige-exec');
  if (btnExec) {
    const canPrestige = _gameState.level >= PRESTIGE_CONFIG.minLevel;
    btnExec.disabled = !canPrestige;
    if (canPrestige) {
      const earn = PRESTIGE_CONFIG.getCurrency(_gameState);
      btnExec.textContent = `プレステージ (💎+${earn})`;
    } else {
      btnExec.textContent = `Lv.${PRESTIGE_CONFIG.minLevel}で解放`;
    }
  }

  const shopEl = document.getElementById('prestige-shop');
  if (!shopEl) return;
  shopEl.innerHTML = '';

  for (const [id, upgrade] of Object.entries(PRESTIGE_UPGRADES)) {
    const currentLv = getUpgradeLevel(_gameState, id);
    const isMaxed = currentLv >= upgrade.maxLv;
    const cost = isMaxed ? 0 : getUpgradeCost(upgrade, currentLv);
    const canAfford = (_gameState.prestigeCurrency || 0) >= cost;

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
        const result = purchaseUpgrade(_gameState, id);
        if (result.success) {
          buildPrestigeShop();
        }
      });
    }

    row.appendChild(btn);
    shopEl.appendChild(row);
  }
}
