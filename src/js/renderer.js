// renderer.js — 2D DOM操作・描画更新

import { CROP_MASTER, CHARACTER_MASTER } from './master-data.js';
import { initCommonDOM, updateHUD, showHarvestEffect, showLevelUpEffect, getCropColor } from './renderer-common.js';

/** 2D専用DOM要素のキャッシュ */
const dom = {};

/**
 * DOM要素をキャッシュ（初期化時に1回呼ぶ）
 */
export function initRenderer() {
  initCommonDOM();
  dom.farmer = document.getElementById('farmer');
  dom.crop = document.getElementById('crop');
  dom.field = document.getElementById('field');
  dom.stage = document.getElementById('stage');
}

/**
 * キャラクターの表示を更新
 * @param {string} charId
 */
export function updateCharacter(charId) {
  const char = CHARACTER_MASTER[charId];
  if (!char || !dom.farmer) return;

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
    dom.crop.className = 'crop crop--empty';
    dom.crop.style.removeProperty('--growth-progress');
    return;
  }

  const crop = CROP_MASTER[fieldState.cropId];
  if (!crop) return;

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
 * キャラクターの作業アニメーションを発火
 */
export function triggerWorkAnimation() {
  if (!dom.farmer) return;
  dom.farmer.classList.add('is-working');
  setTimeout(() => { dom.farmer.classList.remove('is-working'); }, 400);
}

/**
 * 収穫パーティクルエフェクト
 * @param {string} cropId
 */
export function showHarvestParticles(cropId) {
  if (!dom.field) return;
  const color = getCropColor(cropId);

  for (let i = 0; i < 6; i++) {
    const particle = document.createElement('div');
    particle.className = 'harvest-particle';
    particle.style.background = color;
    particle.style.setProperty('--px', `${(Math.random() - 0.5) * 50}px`);
    particle.style.setProperty('--py', `${-20 - Math.random() * 40}px`);
    particle.style.left = '50%';
    particle.style.bottom = '10px';
    dom.field.appendChild(particle);
    setTimeout(() => particle.remove(), 600);
  }
}

// 共通モジュールから re-export
export { updateHUD, showHarvestEffect, showLevelUpEffect };
