// ui-modals.js — モーダルコンテンツの描画ロジック
// 種購入結果、キャラ変更、作物カタログ、イベント図鑑、プレステージショップ

import { CHARACTER_MASTER, CROP_MASTER, LEVEL_UNLOCK_CROPS } from './master-data.js';
import { saveState, getCropLevel, getCropLevelMultiplier, getCropLevelProgress, purchaseUpgrade, getUpgradeLevel, isCropInfinite, getTranscendLevel, purchaseTranscendUpgrade, canTranscend, getTranscendTitle } from './game-state.js';
import { isGachaBatchUnlocked, getGachaCost } from './gacha.js';
import { PRESTIGE_CONFIG, PRESTIGE_UPGRADES, getUpgradeCost } from './prestige-data.js';
import { TRANSCEND_CONFIG, TRANSCEND_UPGRADES, getTranscendUpgradeCost, getTranscendEffect } from './transcend-data.js';
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
  const baseSelect = document.getElementById('char-base-select');
  const hatSelect = document.getElementById('char-hat-select');
  const accSelect = document.getElementById('char-acc-select');
  if (!hatSelect || !accSelect) return;

  // プレビュー初期化
  initPreview();

  // 現在の設定を反映
  const config = _gameState.characterConfig || {};
  if (baseSelect) baseSelect.value = config.base || _gameState.currentCharId || 'man';
  hatSelect.value = config.hat || 'none';
  accSelect.value = config.accessory || 'none';

  // カスタムカラーを復元
  _currentColors = config.colors || null;

  // ベースキャラの未解放をロック表示
  if (baseSelect) {
    Array.from(baseSelect.options).forEach(opt => {
      const unlocked = isPartUnlocked(_gameState, 'base', opt.value);
      opt.disabled = !unlocked;
      opt.text = unlocked ? opt.text.replace('🔒 ', '') : `🔒 ${opt.text.replace('🔒 ', '')}`;
      if (!unlocked && baseSelect.value === opt.value) baseSelect.value = 'man';
    });
  }

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
    const selectedBase = (baseSelect && baseSelect.value) || 'man';
    const cfg = {
      base: selectedBase,
      hat: hatSelect.value === 'none' ? undefined : hatSelect.value,
      accessory: accSelect.value === 'none' ? undefined : accSelect.value,
      colors: _currentColors || undefined,
    };
    updateCharacter(cfg);
    updatePreviewModel(cfg);
  };

  if (baseSelect) {
    baseSelect.onchange = () => {
      // ベースキャラ変更時にデフォルトカラーをリセット
      _currentColors = null;
      updateNonHumanLock();
      updatePreview();
    };
  }
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

  // ── 人間以外のキャラクター選択時に帽子・アクセサリー・カラーをロック ──
  const lockableControls = [hatSelect, accSelect, btnRandomize, btnResetColor];
  function updateNonHumanLock() {
    const isHuman = (baseSelect && baseSelect.value) === 'human';
    hatSelect.disabled = !isHuman;
    accSelect.disabled = !isHuman;
    if (btnRandomize) btnRandomize.disabled = !isHuman;
    if (btnResetColor) btnResetColor.disabled = !isHuman;
    lockableControls.forEach(el => {
      if (el) el.style.opacity = isHuman ? '' : '0.4';
    });
    if (!isHuman) {
      hatSelect.value = 'none';
      accSelect.value = 'none';
      _currentColors = null;
    }
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
  updateNonHumanLock();
  updatePreview();
  if (previewGroup) previewGroup.rotation.y = 0;
  startPreviewLoop();
}

export function stopCharacterPreview() {
  stopPreviewLoop();
}

export function saveCharacterCustomizer(gameStateObj) {
  const baseSelect = document.getElementById('char-base-select');
  const hatSelect = document.getElementById('char-hat-select');
  const accSelect = document.getElementById('char-acc-select');
  if (!hatSelect || !accSelect) return;

  const selectedBase = (baseSelect && baseSelect.value) || 'man';
  const isHuman = selectedBase === 'human';
  gameStateObj.characterConfig = {
    base: selectedBase,
    hat: isHuman && hatSelect.value !== 'none' ? hatSelect.value : undefined,
    accessory: isHuman && accSelect.value !== 'none' ? accSelect.value : undefined,
    colors: isHuman ? (_currentColors || undefined) : undefined,
  };
  gameStateObj.currentCharId = selectedBase;
  saveState(gameStateObj);
  updateCharacter(gameStateObj.characterConfig);
}

// ============================================
//  作物カタログ（互換: 図鑑の作物タブへリダイレクト）
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
  // 図鑑の作物タブを構築（互換用エイリアス）
  buildEncyclopedia();
}

// ============================================
//  図鑑システム（統合版）
// ============================================

/** 現在のタブ */
let _currentEncTab = 'crops';

/** 図鑑タブ切替の初期化 */
export function initEncyclopediaTabs() {
  const tabs = document.querySelectorAll('.encyclopedia-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      _currentEncTab = tab.dataset.tab;
      tabs.forEach(t => t.classList.toggle('is-active', t === tab));
      // パネル切替
      document.querySelectorAll('.enc-tab-panel').forEach(p => p.classList.remove('is-active'));
      const panel = document.getElementById(`enc-tab-${_currentEncTab}`);
      if (panel) panel.classList.add('is-active');
      buildEncyclopediaTab(_currentEncTab);
    });
  });
}

/** 図鑑モーダルを構築 */
export function buildEncyclopedia() {
  buildEncyclopediaTab(_currentEncTab);
}

/** 指定タブの図鑑を構築 */
function buildEncyclopediaTab(tab) {
  switch (tab) {
    case 'crops': buildEncCrops(); break;
    case 'characters': buildEncCharacters(); break;
    case 'events': buildEncEvents(); break;
    case 'completion': buildEncCompletion(); break;
  }
}

/** 作物図鑑タブ */
function buildEncCrops() {
  const panel = document.getElementById('enc-tab-crops');
  if (!panel || !_gameState) return;

  if (!panel.dataset.clickEventAttached) {
    panel.addEventListener('mousedown', (e) => {
      const itemNode = e.target.closest('.enc-item');
      if (!itemNode) return;
      const cropId = itemNode.dataset.cropId;
      if (!cropId || itemNode.classList.contains('enc-item--locked')) return;

      if (_gameState.selectedCropId === cropId) {
        _gameState.selectedCropId = null;
      } else {
        _gameState.selectedCropId = cropId;
      }
      saveState(_gameState);
      buildEncCrops();
    });
    panel.dataset.clickEventAttached = 'true';
  }

  panel.innerHTML = '';
  const unlockedIds = getUnlockedCropIds();

  for (const [cropId, crop] of Object.entries(CROP_MASTER)) {
    const isLevelUnlocked = unlockedIds.includes(cropId);
    const hasSeeds = (_gameState.seedsInventory[cropId] || 0) > 0;
    const hasCropExp = (_gameState.cropExp[cropId] || 0) > 0;
    const isUnlocked = isLevelUnlocked || (crop.isEventOnly && (hasSeeds || hasCropExp));
    const cropLevel = getCropLevel(_gameState, cropId);
    const { current: expInLevel, required: expRequired } = getCropLevelProgress(_gameState, cropId);
    const seedCount = _gameState.seedsInventory[cropId] || 0;
    const isInf = isCropInfinite(_gameState, cropId);
    const isSelected = _gameState.selectedCropId === cropId;
    const fruitColor = getCropColor(cropId);
    const harvestCount = (_gameState.cropHarvestCounts && _gameState.cropHarvestCounts[cropId]) || 0;
    const discoveredAt = _gameState.cropDiscoveredAt && _gameState.cropDiscoveredAt[cropId];
    const discoveredStr = discoveredAt ? new Date(discoveredAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }) : '';

    const rarityStars = isUnlocked ? '★'.repeat(crop.rarity) : '';

    const item = document.createElement('div');
    item.className = `enc-item${isUnlocked ? '' : ' enc-item--locked'}${isSelected ? ' is-selected' : ''}`;
    item.dataset.cropId = cropId;
    if (isUnlocked) item.style.cursor = 'pointer';

    item.innerHTML = `
      <div class="enc-item__icon">
        <div style="width:12px;height:12px;border-radius:50%;background:${isUnlocked ? fruitColor : '#555'};box-shadow:inset -2px -2px 0 rgba(0,0,0,0.15);"></div>
      </div>
      <div class="enc-item__info">
        <div class="enc-item__name">${isUnlocked ? crop.name : '???'} <span style="font-size:8px;color:#a09080;">${rarityStars}</span></div>
        <div class="enc-item__detail">Lv.${cropLevel} x${getCropLevelMultiplier(cropLevel).toFixed(2)}${discoveredStr ? ` | ${discoveredStr}` : ''}${harvestCount > 0 ? ` | ${harvestCount}回` : ''}</div>
        <div class="catalog-item__level-bar"><div class="catalog-item__level-fill" style="width:${(expInLevel / expRequired) * 100}%"></div></div>
      </div>
      <div class="enc-item__badge">${isUnlocked ? (isInf ? '∞' : `${seedCount}`) : '🔒'}</div>
    `;
    panel.appendChild(item);
  }
}

/** キャラクター図鑑タブ */
function buildEncCharacters() {
  const panel = document.getElementById('enc-tab-characters');
  if (!panel || !_gameState) return;
  panel.innerHTML = '';

  for (const [charId, char] of Object.entries(CHARACTER_MASTER)) {
    const unlocked = isPartUnlocked(_gameState, 'base', charId);
    // 解放条件テキスト
    let conditionText = '初期キャラクター';
    if (char.unlockAchievement) {
      const ach = ACHIEVEMENT_MASTER[char.unlockAchievement];
      conditionText = ach ? ach.desc : '???';
    }

    const item = document.createElement('div');
    item.className = `enc-item${unlocked ? '' : ' enc-item--locked'}`;

    const charEmoji = { human: '👤', dog: '🐕', cat: '🐈', robot: '🤖', alien: '👽', pumpkinhead: '🎃', snowman: '⛄' };

    item.innerHTML = `
      <div class="enc-item__icon">${unlocked ? (charEmoji[charId] || '👤') : '❓'}</div>
      <div class="enc-item__info">
        <div class="enc-item__name">${unlocked ? char.name : '???'}</div>
        <div class="enc-item__detail">${unlocked ? '解放済み' : conditionText}</div>
      </div>
      <div class="enc-item__badge">${unlocked ? '✅' : '🔒'}</div>
    `;
    panel.appendChild(item);
  }
}

/** イベント図鑑タブ */
function buildEncEvents() {
  const panel = document.getElementById('enc-tab-events');
  if (!panel || !_gameState) return;
  panel.innerHTML = '';

  for (const [id, eventData] of Object.entries(EVENT_MASTER)) {
    const count = (_gameState.eventCounts && _gameState.eventCounts[id]) || 0;
    const isUnlocked = count > 0;

    const nameParts = eventData.name.split(' ');
    const icon = isUnlocked ? (nameParts[0] || '✨') : '❓';
    const dispName = isUnlocked ? (nameParts.slice(1).join(' ') || eventData.name) : '未知の現象';

    const seasonLabel = eventData.months ? `(${eventData.months.map(m => m + '月').join(',')})` : '';

    const item = document.createElement('div');
    item.className = `enc-item${isUnlocked ? '' : ' enc-item--locked'}`;

    item.innerHTML = `
      <div class="enc-item__icon">${icon}</div>
      <div class="enc-item__info">
        <div class="enc-item__name">${dispName}</div>
        <div class="enc-item__detail">${eventData.genre === 'seasonal' ? seasonLabel : ''}</div>
      </div>
      <div class="enc-item__badge">${isUnlocked ? `${count}回` : '未遭遇'}</div>
    `;
    panel.appendChild(item);
  }
}

/** コンプリート率タブ */
function buildEncCompletion() {
  const panel = document.getElementById('enc-tab-completion');
  if (!panel || !_gameState) return;
  panel.innerHTML = '';

  const container = document.createElement('div');
  container.className = 'enc-completion';

  // 作物コンプリート率
  const totalCrops = Object.keys(CROP_MASTER).length;
  let discoveredCrops = 0;
  for (const cropId of Object.keys(CROP_MASTER)) {
    const hasExp = (_gameState.cropExp[cropId] || 0) > 0;
    const hasSeeds = (_gameState.seedsInventory[cropId] || 0) > 0;
    const discovered = _gameState.cropDiscoveredAt && _gameState.cropDiscoveredAt[cropId];
    if (hasExp || hasSeeds || discovered) discoveredCrops++;
  }

  // キャラコンプリート率
  const totalChars = Object.keys(CHARACTER_MASTER).length;
  let unlockedChars = 0;
  for (const charId of Object.keys(CHARACTER_MASTER)) {
    if (isPartUnlocked(_gameState, 'base', charId)) unlockedChars++;
  }

  // イベントコンプリート率
  const totalEvents = Object.keys(EVENT_MASTER).length;
  let seenEvents = 0;
  for (const id of Object.keys(EVENT_MASTER)) {
    if ((_gameState.eventCounts && _gameState.eventCounts[id]) > 0) seenEvents++;
  }

  // 実績コンプリート率
  const totalAch = Object.keys(ACHIEVEMENT_MASTER).length;
  const unlockedAch = (_gameState.unlockedAchievements || []).length;

  // 全体
  const totalAll = totalCrops + totalChars + totalEvents + totalAch;
  const completedAll = discoveredCrops + unlockedChars + seenEvents + unlockedAch;

  const sections = [
    { label: '総合', count: completedAll, total: totalAll },
    { label: '作物', count: discoveredCrops, total: totalCrops },
    { label: 'キャラクター', count: unlockedChars, total: totalChars },
    { label: 'イベント', count: seenEvents, total: totalEvents },
    { label: '実績', count: unlockedAch, total: totalAch },
  ];

  for (const s of sections) {
    const pct = s.total > 0 ? Math.floor((s.count / s.total) * 100) : 0;
    const sec = document.createElement('div');
    sec.className = 'enc-completion__section';
    sec.innerHTML = `
      <div class="enc-completion__label">${s.label}</div>
      <div class="enc-completion__bar"><div class="enc-completion__fill" style="width:${pct}%"></div></div>
      <div class="enc-completion__text">${s.count}/${s.total} (${pct}%)</div>
    `;
    container.appendChild(sec);
  }

  panel.appendChild(container);
}

// 旧APIとの互換用
export function buildEventLog() {
  // 旧イベント図鑑ボタンから呼ばれた場合、図鑑のイベントタブを開く
  _currentEncTab = 'events';
  const tabs = document.querySelectorAll('.encyclopedia-tab');
  tabs.forEach(t => t.classList.toggle('is-active', t.dataset.tab === 'events'));
  document.querySelectorAll('.enc-tab-panel').forEach(p => p.hidden = true);
  const panel = document.getElementById('enc-tab-events');
  if (panel) panel.hidden = false;
  buildEncEvents();
}

// ============================================
//  統計ダッシュボード
// ============================================

export function buildStats() {
  const container = document.getElementById('stats-content');
  if (!container || !_gameState) return;
  container.innerHTML = '';

  // -- 概要セクション --
  const overviewSection = document.createElement('div');
  overviewSection.className = 'stats-section';
  const playTime = _gameState.totalPlayTime || 0;
  const hours = Math.floor(playTime / 3600);
  const mins = Math.floor((playTime % 3600) / 60);
  const timeStr = hours > 0 ? `${hours}時間${mins}分` : `${mins}分`;

  overviewSection.innerHTML = `
    <div class="stats-section__title">概要</div>
    <div class="stats-row"><span class="stats-row__label">プレイ時間</span><span class="stats-row__value">${timeStr}</span></div>
    <div class="stats-row"><span class="stats-row__label">総収穫回数</span><span class="stats-row__value">${(_gameState.harvestCount || 0).toLocaleString()}</span></div>
    <div class="stats-row"><span class="stats-row__label">累計ポイント</span><span class="stats-row__value">${(_gameState.totalEarnedPoints || 0).toLocaleString()}</span></div>
    <div class="stats-row"><span class="stats-row__label">現在レベル</span><span class="stats-row__value">Lv.${_gameState.level}</span></div>
    <div class="stats-row"><span class="stats-row__label">転生回数</span><span class="stats-row__value">${_gameState.prestigeCount || 0}回</span></div>
  `;
  container.appendChild(overviewSection);

  // -- 作物収穫ランキング --
  const cropSection = document.createElement('div');
  cropSection.className = 'stats-section';
  cropSection.innerHTML = '<div class="stats-section__title">収穫ランキング</div>';

  const harvestCounts = _gameState.cropHarvestCounts || {};
  const sorted = Object.entries(harvestCounts)
    .filter(([id]) => CROP_MASTER[id])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (sorted.length > 0) {
    const maxCount = sorted[0][1];
    const barColors = ['#f0c060', '#e0a040', '#c08030', '#a06020', '#806010'];
    sorted.forEach(([cropId, count], idx) => {
      const crop = CROP_MASTER[cropId];
      const pct = maxCount > 0 ? Math.floor((count / maxCount) * 100) : 0;
      const bar = document.createElement('div');
      bar.className = 'stats-bar';
      bar.innerHTML = `
        <span class="stats-bar__label">${crop.name}</span>
        <div class="stats-bar__track"><div class="stats-bar__fill" style="width:${pct}%;background:${barColors[idx] || '#806010'}"></div></div>
        <span class="stats-bar__count">${count}</span>
      `;
      cropSection.appendChild(bar);
    });
  } else {
    cropSection.innerHTML += '<div style="font-size:9px;color:#666;padding:4px;">まだデータがありません</div>';
  }
  container.appendChild(cropSection);

  // -- プレステージ履歴 --
  const histSection = document.createElement('div');
  histSection.className = 'stats-section';
  histSection.innerHTML = '<div class="stats-section__title">プレステージ履歴</div>';

  const history = _gameState.prestigeHistory || [];
  if (history.length > 0) {
    // 最新10件を逆順で表示
    const recent = history.slice(-10).reverse();
    recent.forEach(entry => {
      const item = document.createElement('div');
      item.className = 'stats-history-item';
      item.innerHTML = `
        <span class="stats-history-item__num">#${entry.count}</span>
        <span class="stats-history-item__detail">Lv.${entry.level}</span>
        <span class="stats-history-item__currency">💎+${entry.currency}</span>
      `;
      histSection.appendChild(item);
    });
  } else {
    histSection.innerHTML += '<div style="font-size:9px;color:#666;padding:4px;">まだ転生していません</div>';
  }
  container.appendChild(histSection);
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

  // 超越割引（game-state.js の purchaseUpgrade と同じ計算）
  const discountMult = getTranscendEffect('t_prestigeDiscount', getTranscendLevel(_gameState, 't_prestigeDiscount'));

  for (const [id, upgrade] of Object.entries(PRESTIGE_UPGRADES)) {
    const currentLv = getUpgradeLevel(_gameState, id);
    const isMaxed = currentLv >= upgrade.maxLv;
    const baseCost = isMaxed ? 0 : getUpgradeCost(upgrade, currentLv);
    const cost = Math.max(1, Math.floor(baseCost * discountMult));
    const canAfford = (_gameState.prestigeCurrency || 0) >= cost;

    const row = document.createElement('div');
    row.className = `upgrade-row${isMaxed ? ' upgrade-row--maxed' : ''}`;
    row.title = `${upgrade.name}\n${upgrade.description}`;

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
//  超越ショップ
// ============================================

/** プレステージ/超越タブの初期化 */
export function initPrestigeTabs() {
  const tabs = document.querySelectorAll('.prestige-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach(t => t.classList.toggle('is-active', t === tab));
      document.getElementById('prestige-tab-prestige').classList.toggle('is-active', target === 'prestige');
      document.getElementById('prestige-tab-transcend').classList.toggle('is-active', target === 'transcend');
      if (target === 'transcend') buildTranscendShop();
      if (target === 'prestige') buildPrestigeShop();
    });
  });
}

export function buildTranscendShop() {
  if (!_gameState) return;

  const currencyEl = document.getElementById('transcend-currency');
  const countEl = document.getElementById('transcend-count');
  const titleEl = document.getElementById('transcend-title');
  if (currencyEl) currencyEl.textContent = _gameState.transcendCurrency || 0;
  if (countEl) countEl.textContent = _gameState.transcendCount || 0;
  if (titleEl) {
    const title = getTranscendTitle(_gameState);
    titleEl.textContent = title ? `[${title}]` : '';
  }

  // 超越実行ボタン
  const btnExec = document.getElementById('btn-transcend-exec');
  if (btnExec) {
    const can = canTranscend(_gameState);
    btnExec.disabled = !can;
    if (can) {
      const earn = TRANSCEND_CONFIG.getCurrency(_gameState);
      btnExec.textContent = `超越実行 (🌟+${earn})`;
    } else {
      const pc = _gameState.prestigeCount || 0;
      const lv = _gameState.level || 0;
      const needs = [];
      if (pc < TRANSCEND_CONFIG.minPrestigeCount) needs.push(`転生${TRANSCEND_CONFIG.minPrestigeCount}回`);
      if (lv < TRANSCEND_CONFIG.minLevel) needs.push(`Lv.${TRANSCEND_CONFIG.minLevel}`);
      btnExec.textContent = `${needs.join(' + ')}で解放`;
    }
  }

  // 自動転生UI
  const autoDiv = document.getElementById('transcend-auto-prestige');
  const autoInput = document.getElementById('auto-prestige-level');
  const hasAutoPrestige = getTranscendLevel(_gameState, 't_autoPrestige') > 0;
  if (autoDiv) autoDiv.style.display = hasAutoPrestige ? 'block' : 'none';
  if (autoInput && hasAutoPrestige) {
    autoInput.value = _gameState.autoPrestigeLevel || 0;
    autoInput.onchange = () => {
      _gameState.autoPrestigeLevel = Math.max(0, Math.min(999, parseInt(autoInput.value) || 0));
      saveState(_gameState);
    };
  }

  // ショップリスト
  const shopEl = document.getElementById('transcend-shop');
  if (!shopEl) return;
  shopEl.innerHTML = '';

  // 超越未解放時は「???」表示
  if ((_gameState.transcendCount || 0) === 0 && !canTranscend(_gameState)) {
    shopEl.innerHTML = '<div style="text-align:center;color:#666;font-size:10px;padding:20px 0;">??? 条件未達成 ???</div>';
    return;
  }

  for (const [id, upgrade] of Object.entries(TRANSCEND_UPGRADES)) {
    const currentLv = getTranscendLevel(_gameState, id);
    const isMaxed = currentLv >= upgrade.maxLv;
    const cost = isMaxed ? 0 : getTranscendUpgradeCost(upgrade, currentLv);
    const canAfford = (_gameState.transcendCurrency || 0) >= cost;

    const row = document.createElement('div');
    row.className = `upgrade-row${isMaxed ? ' upgrade-row--maxed' : ''}`;
    row.title = `${upgrade.name}\n${upgrade.description}`;

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
      btn.textContent = `🌟${cost}`;
      btn.disabled = !canAfford;
      btn.addEventListener('click', () => {
        const result = purchaseTranscendUpgrade(_gameState, id);
        if (result.success) {
          buildTranscendShop();
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

