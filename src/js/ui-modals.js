// ui-modals.js — モーダルコンテンツの描画ロジック
// 種購入結果、キャラ変更、作物カタログ、イベント図鑑、プレステージショップ

import { CHARACTER_MASTER, CROP_MASTER, LEVEL_UNLOCK_CROPS } from './master-data.js';
import { saveState, getCropLevel, getCropLevelMultiplier, getCropLevelProgress, purchaseUpgrade, getUpgradeLevel, isCropInfinite } from './game-state.js';
import { isGachaBatchUnlocked, getGachaCost } from './gacha.js';
import { PRESTIGE_CONFIG, PRESTIGE_UPGRADES, getUpgradeCost } from './prestige-data.js';
import { EVENT_MASTER } from './event-data.js';
import { isPartUnlocked, ACHIEVEMENT_MASTER } from './achievement-system.js';
import { updateCharacter } from './renderer-3d.js';
import { getCropColor } from './renderer-common.js';

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

// ── ミニプレビュー用の状態 ──
import * as THREE from 'three';
import { rebuildFarmerModel, generateRandomColors, getDefaultColors } from './renderer-3d-models.js';

let previewRenderer = null;
let previewScene = null;
let previewCamera = null;
let previewGroup = null;
let previewAnimId = null;

/** カスタマイズ中のカラー状態 */
let _currentColors = null;

function initPreview() {
  const canvas = document.getElementById('char-preview-canvas');
  if (!canvas) return;

  if (previewRenderer) return; // 既に初期化済み

  previewRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  previewRenderer.setSize(canvas.width, canvas.height);
  previewRenderer.setPixelRatio(1);

  previewScene = new THREE.Scene();

  previewCamera = new THREE.PerspectiveCamera(35, canvas.width / canvas.height, 0.1, 100);
  previewCamera.position.set(0, 2.5, 10);
  previewCamera.lookAt(0, 2.0, 0);

  // ライティング
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  previewScene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(3, 5, 4);
  previewScene.add(dir);

  // キャラグループ
  previewGroup = new THREE.Group();
  previewScene.add(previewGroup);
}

function updatePreviewModel(config) {
  if (!previewGroup) return;
  rebuildFarmerModel(previewGroup, config);
}

function startPreviewLoop() {
  if (previewAnimId) return;
  function loop() {
    previewAnimId = requestAnimationFrame(loop);
    if (previewGroup) {
      previewGroup.rotation.y += 0.012;
    }
    previewRenderer.render(previewScene, previewCamera);
  }
  loop();
}

function stopPreviewLoop() {
  if (previewAnimId) {
    cancelAnimationFrame(previewAnimId);
    previewAnimId = null;
  }
}

export function buildCharacterCustomizer() {
  if (!_gameState) return;
  const hatSelect = document.getElementById('char-hat-select');
  const accSelect = document.getElementById('char-acc-select');
  if (!hatSelect || !accSelect) return;

  // プレビュー初期化
  initPreview();

  // 現在の設定を反映
  const config = _gameState.characterConfig || {};
  hatSelect.value = config.hat || 'none';
  accSelect.value = config.accessory || 'none';

  // カスタムカラーを復元
  _currentColors = config.colors || null;

  // 未解放パーツをロック表示
  Array.from(hatSelect.options).forEach(opt => {
    const unlocked = isPartUnlocked(_gameState, 'hat', opt.value);
    opt.disabled = !unlocked;
    opt.text = unlocked ? opt.text.replace('🔒 ', '') : `🔒 ${opt.text.replace('🔒 ', '')}`;
    if (!unlocked && hatSelect.value === opt.value) hatSelect.value = 'none';
  });

  Array.from(accSelect.options).forEach(opt => {
    const unlocked = isPartUnlocked(_gameState, 'accessory', opt.value);
    opt.disabled = !unlocked;
    opt.text = unlocked ? opt.text.replace('🔒 ', '') : `🔒 ${opt.text.replace('🔒 ', '')}`;
    if (!unlocked && accSelect.value === opt.value) accSelect.value = 'none';
  });

  // プレビュー＆メインシーン両方を更新
  const updatePreview = () => {
    const cfg = {
      base: 'man',
      hat: hatSelect.value === 'none' ? undefined : hatSelect.value,
      accessory: accSelect.value === 'none' ? undefined : accSelect.value,
      colors: _currentColors || undefined,
    };
    updateCharacter(cfg);
    updatePreviewModel(cfg);
  };

  hatSelect.onchange = updatePreview;
  accSelect.onchange = updatePreview;

  // ランダムカラーボタン
  const btnRandomize = document.getElementById('btn-char-randomize');
  if (btnRandomize) {
    btnRandomize.onclick = () => {
      _currentColors = generateRandomColors();
      updatePreview();
    };
  }

  // カラーリセットボタン
  const btnResetColor = document.getElementById('btn-char-reset-color');
  if (btnResetColor) {
    btnResetColor.onclick = () => {
      _currentColors = null;
      updatePreview();
    };
  }

  // ─── プリセットスロット ───
  let _presetSaveMode = false;
  const modeLabel = document.getElementById('preset-mode-label');
  const btnPresetSave = document.getElementById('btn-char-preset-save');
  const presetSlots = document.querySelectorAll('.char-preset-slot');

  // スロットの見た目を更新
  function refreshPresetSlots() {
    const presets = _gameState.colorPresets || [null, null, null, null, null];
    presetSlots.forEach(btn => {
      const idx = Number(btn.dataset.slot);
      const data = presets[idx];
      if (data) {
        // body色を背景に表示
        const hex = '#' + (data.body || 0x333333).toString(16).padStart(6, '0');
        btn.style.background = hex;
        btn.style.borderColor = '#aaa';
        btn.style.color = '#fff';
        btn.style.textShadow = '0 0 3px rgba(0,0,0,0.8)';
      } else {
        btn.style.background = '#333';
        btn.style.borderColor = '#555';
        btn.style.color = '#888';
        btn.style.textShadow = '';
      }
    });
  }

  // 保存モードの表示切替
  function setSaveMode(on) {
    _presetSaveMode = on;
    if (btnPresetSave) {
      btnPresetSave.style.background = on ? '#554' : '';
      btnPresetSave.style.borderColor = on ? '#aa8' : '';
    }
    if (modeLabel) {
      modeLabel.textContent = on ? 'スロットを選んで保存...' : '';
    }
  }

  if (btnPresetSave) {
    btnPresetSave.onclick = () => {
      setSaveMode(!_presetSaveMode);
    };
  }

  presetSlots.forEach(btn => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.slot);
      if (!_gameState.colorPresets) _gameState.colorPresets = [null, null, null, null, null];

      if (_presetSaveMode) {
        // 保存: 現在のカラーをスロットに保存
        if (_currentColors) {
          _gameState.colorPresets[idx] = { ..._currentColors };
          saveState(_gameState);
          refreshPresetSlots();
          setSaveMode(false);
        }
      } else {
        // 読み込み: スロットのカラーを適用
        const data = _gameState.colorPresets[idx];
        if (data) {
          _currentColors = { ...data };
          updatePreview();
        }
      }
    };
  });

  refreshPresetSlots();
  setSaveMode(false);

  // モーダルを開いた瞬間の状態反映
  updatePreview();
  if (previewGroup) previewGroup.rotation.y = 0;
  startPreviewLoop();
}

export function stopCharacterPreview() {
  stopPreviewLoop();
}

export function saveCharacterCustomizer(gameStateObj) {
  const hatSelect = document.getElementById('char-hat-select');
  const accSelect = document.getElementById('char-acc-select');
  if (!hatSelect || !accSelect) return;

  gameStateObj.characterConfig = {
    base: 'man',
    hat: hatSelect.value === 'none' ? undefined : hatSelect.value,
    accessory: accSelect.value === 'none' ? undefined : accSelect.value,
    colors: _currentColors || undefined,
  };
  gameStateObj.currentCharId = 'man'; // 後方互換
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
    const isLevelUnlocked = unlockedIds.includes(cropId);
    // イベント限定作物は種を所持していれば解放済みとみなす
    const hasSeeds = (_gameState.seedsInventory[cropId] || 0) > 0;
    const isUnlocked = isLevelUnlocked || (crop.isEventOnly && hasSeeds);
    const cropLevel = getCropLevel(_gameState, cropId);
    const { current: expInLevel, required: expRequired } = getCropLevelProgress(_gameState, cropId);
    const seedCount = _gameState.seedsInventory[cropId] || 0;
    const multiplier = getCropLevelMultiplier(cropLevel);

    const isInf = isCropInfinite(_gameState, cropId);
    const isSelected = _gameState.selectedCropId === cropId;
    const fruitColor = getCropColor(cropId);

    // 作物ごとの形状定義
    const CROP_SHAPES = {
      tomato:         'width:12px;height:12px;border-radius:50%',
      potato:         'width:14px;height:10px;border-radius:40%',
      carrot:         'width:6px;height:14px;border-radius:3px 3px 1px 1px',
      strawberry:     'width:10px;height:12px;border-radius:2px 2px 50% 50%',
      corn:           'width:7px;height:14px;border-radius:3px',
      pumpkin:        'width:14px;height:11px;border-radius:50%',
      eggplant:       'width:8px;height:14px;border-radius:50% 50% 3px 3px',
      melon:          'width:13px;height:13px;border-radius:50%',
      watermelon:     'width:14px;height:8px;border-radius:14px 14px 2px 2px',
      golden_apple:   'width:11px;height:12px;border-radius:50%;box-shadow:0 0 4px rgba(255,215,0,0.7)',
      tumbleweed:     'width:11px;height:11px;border-radius:50%;border:1px dashed rgba(255,255,255,0.3)',
      christmas_tree: 'width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:14px solid',
    };
    const shapeBase = CROP_SHAPES[cropId] || 'width:12px;height:12px;border-radius:50%';
    // christmas_tree は border-bottom-color で着色、それ以外は background
    const fruitStyle = cropId === 'christmas_tree'
      ? `${shapeBase} ${fruitColor};background:transparent`
      : `${shapeBase};background:${fruitColor}`;

    const item = document.createElement('div');
    item.className = `catalog-item${isUnlocked ? '' : ' catalog-item--locked'}${isSelected ? ' is-selected' : ''}`;
    
    item.dataset.cropId = cropId;
    
    if (isUnlocked) {
      item.style.cursor = 'pointer';
    }

    item.innerHTML = `
      <div class="catalog-item__icon-wrapper">
        <div class="catalog-fruit" style="${fruitStyle}"></div>
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

// ============================================
//  実績一覧
// ============================================

export function buildAchievementList() {
  if (!_gameState) return;
  const listEl = document.getElementById('achievement-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  const unlocked = _gameState.unlockedAchievements || [];

  for (const [id, ach] of Object.entries(ACHIEVEMENT_MASTER)) {
    const isUnlocked = unlocked.includes(id);
    const card = document.createElement('div');
    card.style.cssText = `
      background: ${isUnlocked ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.03)'};
      border: 1px solid ${isUnlocked ? '#ffd70066' : '#555'};
      border-radius: 6px;
      padding: 8px 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    `;

    const icon = document.createElement('div');
    icon.style.cssText = 'font-size: 1.4rem; min-width: 28px; text-align: center;';
    icon.textContent = isUnlocked ? '✅' : '🔒';

    const info = document.createElement('div');
    info.style.cssText = 'flex: 1; min-width: 0;';

    const title = document.createElement('div');
    title.style.cssText = `font-size: 0.85rem; font-weight: bold; color: ${isUnlocked ? '#ffd700' : '#888'};`;
    title.textContent = ach.name;

    const desc = document.createElement('div');
    desc.style.cssText = 'font-size: 0.75rem; color: #aaa; margin-top: 2px;';
    desc.textContent = ach.desc;

    if (ach.rewardText) {
      const reward = document.createElement('div');
      reward.style.cssText = `font-size: 0.7rem; color: ${isUnlocked ? '#88ccff' : '#666'}; margin-top: 3px;`;
      reward.textContent = `🎁 報酬: ${ach.rewardText}`;
      info.appendChild(title);
      info.appendChild(desc);
      info.appendChild(reward);
    } else {
      info.appendChild(title);
      info.appendChild(desc);
    }

    card.appendChild(icon);
    card.appendChild(info);
    listEl.appendChild(card);
  }
}

