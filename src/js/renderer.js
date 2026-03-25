// renderer.js — DOM操作・描画更新

import { CROP_MASTER, CHARACTER_MASTER, getLevelThreshold } from './master-data.js';

/** DOM要素のキャッシュ */
const dom = {};

/**
 * DOM要素をキャッシュ（初期化時に1回呼ぶ）
 */
export function initRenderer() {
  dom.hudLevel = document.getElementById('hud-level');
  dom.hudPoints = document.getElementById('hud-points');
  dom.farmer = document.getElementById('farmer');
  dom.crop = document.getElementById('crop');
  dom.field = document.getElementById('field');
  dom.harvestEffect = document.getElementById('harvest-effect');
  dom.levelupEffect = document.getElementById('levelup-effect');
  dom.stage = document.getElementById('stage');
  dom.hudExpFill = document.getElementById('hud-exp-fill');
  dom.blurExpFill = document.getElementById('blur-exp-fill');
}

/**
 * キャラクターの表示を更新
 * @param {string} charId
 */
export function updateCharacter(charId) {
  const char = CHARACTER_MASTER[charId];
  if (!char || !dom.farmer) return;

  // 既存のキャラクタークラスを全て除去
  for (const c of Object.values(CHARACTER_MASTER)) {
    dom.farmer.classList.remove(c.cssClass);
  }
  dom.farmer.classList.add(char.cssClass);
}

/**
 * 畑・作物の描画を更新
 * @param {FieldState} fieldState
 */
export function updateField(fieldState) {
  if (!dom.crop) return;

  if (!fieldState.isPlanted || !fieldState.cropId) {
    // 作物なし
    dom.crop.className = 'crop crop--empty';
    dom.crop.style.removeProperty('--growth-progress');
    return;
  }

  const crop = CROP_MASTER[fieldState.cropId];
  if (!crop) return;

  // 作物のCSSクラスを設定
  dom.crop.className = `crop ${crop.cssClass}`;

  if (fieldState.progress >= 1.0) {
    dom.crop.classList.add('crop--ready');
  } else if (fieldState.progress > 0.1) {
    dom.crop.classList.add('crop--growing');
    dom.crop.style.setProperty('--growth-progress', fieldState.progress.toFixed(2));
  } else {
    dom.crop.classList.add('crop--seed');
  }
}

/**
 * HUD（ポイント・レベル）を更新
 * @param {GameState} state
 */
export function updateHUD(state) {
  if (dom.hudLevel) {
    dom.hudLevel.textContent = state.level;
  }
  if (dom.hudPoints) {
    dom.hudPoints.textContent = formatNumber(state.points);
  }
  
  // プレイヤー経験値バーの更新
  if (dom.hudExpFill || dom.blurExpFill) {
    const currentThreshold = getLevelThreshold(state.level);
    const nextThreshold = getLevelThreshold(state.level + 1);
    const progress = Math.max(0, Math.min(1, (state.totalEarnedPoints - currentThreshold) / (nextThreshold - currentThreshold)));
    const percent = (progress * 100) + '%';
    
    if (dom.hudExpFill) dom.hudExpFill.style.width = percent;
    if (dom.blurExpFill) dom.blurExpFill.style.width = percent;
  }
}

/**
 * 収穫エフェクトを表示
 * @param {number} points
 */
export function showHarvestEffect(points) {
  if (!dom.harvestEffect) return;

  dom.harvestEffect.textContent = `+${formatNumber(points)} pt`;
  dom.harvestEffect.hidden = false;

  // アニメーション再トリガー
  dom.harvestEffect.style.animation = 'none';
  dom.harvestEffect.offsetHeight; // reflow
  dom.harvestEffect.style.animation = '';

  setTimeout(() => {
    dom.harvestEffect.hidden = true;
  }, 1000);
}

/**
 * キャラクターの作業アニメーションを発火
 */
export function triggerWorkAnimation() {
  if (!dom.farmer) return;

  dom.farmer.classList.add('is-working');
  setTimeout(() => {
    dom.farmer.classList.remove('is-working');
  }, 400);
}

/**
 * レベルアップエフェクトを表示
 */
export function showLevelUpEffect() {
  if (!dom.levelupEffect) return;
  
  dom.levelupEffect.hidden = false;
  // 再トリガー
  dom.levelupEffect.style.animation = 'none';
  dom.levelupEffect.offsetHeight; // reflow
  dom.levelupEffect.style.animation = '';
  
  setTimeout(() => {
    dom.levelupEffect.hidden = true;
  }, 1200);
}

/**
 * 収穫パーティクルエフェクト
 * @param {string} cropId
 */
export function showHarvestParticles(cropId) {
  if (!dom.field) return;
  const crop = CROP_MASTER[cropId];
  const color = crop ? getComputedCropColor(crop.cssClass) : '#ffd700';

  for (let i = 0; i < 6; i++) {
    const particle = document.createElement('div');
    particle.className = 'harvest-particle';
    particle.style.background = color;
    particle.style.setProperty('--px', `${(Math.random() - 0.5) * 50}px`);
    particle.style.setProperty('--py', `${-20 - Math.random() * 40}px`);
    
    // 畑を基準に発生させる
    particle.style.left = '50%';
    particle.style.bottom = '10px'; // crop is around bottom: 5px
    dom.field.appendChild(particle);

    setTimeout(() => particle.remove(), 600);
  }
}

/**
 * 数値をフォーマット（1000以上はK表記）
 * @param {number} num
 * @returns {string}
 */
function formatNumber(num) {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 10_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toLocaleString();
}

/**
 * 作物CSSクラスから色を推定（フォールバック用）
 * @param {string} cssClass
 * @returns {string}
 */
function getComputedCropColor(cssClass) {
  const colorMap = {
    'crop--tomato': '#e04040',
    'crop--potato': '#c8a050',
    'crop--golden-apple': '#ffd700',
    'crop--carrot': '#ff8c00',
    'crop--strawberry': '#ff4060',
    'crop--corn': '#f0d040',
    'crop--pumpkin': '#e08020',
    'crop--watermelon': '#408040',
  };
  return colorMap[cssClass] || '#ffd700';
}
