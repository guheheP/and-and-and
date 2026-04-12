// renderer-common.js — HUD・エフェクト共通処理（2D/3D共通）

import { getLevelThreshold } from './master-data.js';

/** DOM要素のキャッシュ */
const dom = {};

/**
 * 共通DOM要素をキャッシュ
 */
export function initCommonDOM() {
  dom.hudLevel = document.getElementById('hud-level');
  dom.hudPoints = document.getElementById('hud-points');
  dom.hudExpFill = document.getElementById('hud-exp-fill');
  dom.blurExpFill = document.getElementById('blur-exp-fill');
  dom.blurLevel = document.getElementById('blur-level');
  dom.blurPoints = document.getElementById('blur-points');
  dom.harvestEffect = document.getElementById('harvest-effect');
  dom.levelupEffect = document.getElementById('levelup-effect');
}

/**
 * HUD（ポイント・レベル）を更新
 * @param {GameState} state
 */
export function updateHUD(state) {
  if (dom.hudLevel) dom.hudLevel.textContent = state.level;
  if (dom.hudPoints) dom.hudPoints.textContent = formatNumber(state.points);
  if (dom.blurLevel) dom.blurLevel.textContent = state.level;
  if (dom.blurPoints) dom.blurPoints.textContent = formatNumber(state.points);

  if (dom.hudExpFill || dom.blurExpFill) {
    const currentThreshold = getLevelThreshold(state.level);
    const nextThreshold = getLevelThreshold(state.level + 1);
    const progress = Math.max(0, Math.min(1, (state.totalEarnedExp - currentThreshold) / (nextThreshold - currentThreshold)));
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
  dom.harvestEffect.style.animation = 'none';
  dom.harvestEffect.offsetHeight;
  dom.harvestEffect.style.animation = '';
  setTimeout(() => { dom.harvestEffect.hidden = true; }, 1000);
}

/**
 * レベルアップエフェクトを表示
 */
export function showLevelUpEffect() {
  if (!dom.levelupEffect) return;
  dom.levelupEffect.hidden = false;
  dom.levelupEffect.style.animation = 'none';
  dom.levelupEffect.offsetHeight;
  dom.levelupEffect.style.animation = '';
  setTimeout(() => { dom.levelupEffect.hidden = true; }, 1200);
}

let toastTimeout1 = null;
let toastTimeout2 = null;

/**
 * 実績解除トーストを表示
 * @param {Object} ach 
 */
export function showAchievementToast(ach) {
  const toast = document.getElementById('achievement-toast');
  const desc = document.getElementById('achievement-toast-desc');
  if (!toast || !desc) return;

  if (toastTimeout1) clearTimeout(toastTimeout1);
  if (toastTimeout2) clearTimeout(toastTimeout2);

  const rewardStr = ach.rewardText ? ` ${ach.rewardText}が解放されました` : '';
  desc.textContent = `【${ach.name}】を達成！${rewardStr}`;

  toast.style.transition = 'none';
  toast.style.opacity = '0';
  toast.style.display = 'block';
  
  // force reflow
  toast.offsetHeight;

  toast.style.transition = 'opacity 0.5s';
  toast.style.opacity = '1';

  toastTimeout1 = setTimeout(() => {
    toast.style.opacity = '0';
    toastTimeout2 = setTimeout(() => { toast.style.display = 'none'; }, 500);
  }, 4000);
}

/**
 * 数値をフォーマット（1000以上はK表記）
 * @param {number} num
 * @returns {string}
 */
export function formatNumber(num) {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 10_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toLocaleString();
}

/**
 * 作物IDから色を取得
 * @param {string} cropId
 * @returns {string}
 */
export function getCropColor(cropId) {
  const colorMap = {
    tomato: '#e04040',
    potato: '#c8a050',
    carrot: '#ff8c00',
    strawberry: '#ff4060',
    corn: '#f0d040',
    pumpkin: '#e08020',
    eggplant: '#6b3fa0',
    melon: '#80c060',
    watermelon: '#408040',
    golden_apple: '#ffd700',
    tumbleweed: '#a08850',
    christmas_tree: '#2d8040',
    // v0.5 追加
    onion: '#f0e0a0',
    cabbage: '#80c060',
    mushroom: '#c8a080',
    radish: '#f0f0f0',
    cherry: '#cc2244',
    grape: '#6622aa',
    bamboo: '#88aa44',
    peach: '#ffaa88',
    pineapple: '#e0b020',
    lotus: '#e8d8c0',
    truffle: '#3a2820',
    dragon_fruit: '#ee3388',
    crystal_flower: '#88ddff',
    rainbow_melon: '#44cc88',
    world_tree_seed: '#226622',
  };
  return colorMap[cropId] || '#ffd700';
}
