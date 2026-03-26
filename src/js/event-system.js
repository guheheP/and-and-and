// event-system.js — ランダムイベントシステム
// weather.js を全面改修

import { EVENT_CONFIG, EVENT_GENRES, EVENT_MASTER } from './event-data.js';
import { getUpgradeEffect } from './prestige-data.js';

// ============================================
//  状態管理
// ============================================

/** 現在のアクティブイベント */
let activeEvent = null;
let eventEndTime = 0;
let lastCheckTime = 0;

/** 鳥のフン: ポイント倍率の残り回数 */
let pointBoostRemaining = 0;
let pointBoostMultiplier = 1.0;

/** ゲームステート参照（プレステージ強化参照用） */
let gameState = null;

/** コールバック */
let callbacks = {
  onEventStart: null,
  onEventEnd: null,
  onGift: null,
};

// ============================================
//  初期化
// ============================================

/**
 * イベントシステムの初期化
 * @param {Object} cbs - { onEventStart, onEventEnd, onGift }
 */
export function initEventSystem(cbs = {}, state = null) {
  callbacks = { ...callbacks, ...cbs };
  gameState = state;
  activeEvent = null;
  eventEndTime = 0;
  lastCheckTime = performance.now();
  pointBoostRemaining = 0;
  pointBoostMultiplier = 1.0;
}

// ============================================
//  メインループ更新
// ============================================

/**
 * イベントシステムのTick更新（ゲームループから呼ぶ）
 * @param {number} currentTime - performance.now()
 */
export function updateEventSystem(currentTime) {
  // アクティブイベントの終了チェック
  if (activeEvent) {
    if (currentTime >= eventEndTime) {
      endEvent();
    }
    return; // イベント中は新規抽選しない
  }

  // 抽選間隔チェック
  if (currentTime - lastCheckTime < EVENT_CONFIG.checkIntervalMs) return;
  lastCheckTime = currentTime;

  // ステップ1: イベント発生判定（プレステージ eventRate 適用）
  const upgradeLv = gameState ? (gameState.prestigeUpgrades && gameState.prestigeUpgrades['eventRate']) || 0 : 0;
  const bonusRate = getUpgradeEffect('eventRate', upgradeLv);
  const totalChance = EVENT_CONFIG.triggerChance + bonusRate;
  if (Math.random() * 100 >= totalChance) return;

  // ステップ2: ジャンル抽選
  const genre = pickGenre();

  // ステップ3: ジャンル内イベント抽選
  const event = pickEventInGenre(genre);
  if (!event) return;

  // イベント開始
  startEvent(event, currentTime);
}

// ============================================
//  抽選ロジック
// ============================================

/**
 * ジャンルを重み付き抽選
 * @returns {string} ジャンルID
 */
function pickGenre() {
  const genres = Object.entries(EVENT_GENRES);
  const totalWeight = genres.reduce((sum, [, g]) => sum + g.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const [id, genre] of genres) {
    roll -= genre.weight;
    if (roll <= 0) return id;
  }
  return genres[0][0];
}

/**
 * ジャンル内のイベントを重み付き抽選
 * @param {string} genreId
 * @returns {Object|null}
 */
function pickEventInGenre(genreId) {
  const events = Object.values(EVENT_MASTER).filter(e => e.genre === genreId);
  if (events.length === 0) return null;

  const totalWeight = events.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const event of events) {
    roll -= event.weight;
    if (roll <= 0) return event;
  }
  return events[0];
}

// ============================================
//  イベント開始・終了
// ============================================

function startEvent(event, currentTime) {
  activeEvent = event;

  // eventDuration プレステージ適用
  const durationLv = gameState ? (gameState.prestigeUpgrades && gameState.prestigeUpgrades['eventDuration']) || 0 : 0;
  const durationMult = getUpgradeEffect('eventDuration', durationLv);
  eventEndTime = currentTime + event.durationMs * durationMult;

  if (callbacks.onEventStart) {
    callbacks.onEventStart(event);
  }
}

/**
 * イベントを強制発生させる（デバッグ用・特殊効果用）
 * @param {string} eventId
 */
export function forceTriggerEvent(eventId) {
  const event = EVENT_MASTER[eventId];
  if (!event) return;

  // 既にイベント中の場合は終了処理を呼んでから上書き
  if (activeEvent) {
    endEvent();
  }

  startEvent(event, performance.now());
}

function endEvent() {
  const ended = activeEvent;
  activeEvent = null;
  eventEndTime = 0;

  if (callbacks.onEventEnd) {
    callbacks.onEventEnd(ended);
  }
}

// ============================================
//  効果ゲッター
// ============================================

/**
 * 現在の成長速度倍率を取得（天気系のみ）
 * @returns {number}
 */
export function getGrowthMultiplier() {
  if (activeEvent && activeEvent.effectType === 'growthBoost') {
    // eventPower プレステージ適用
    const powerLv = gameState ? (gameState.prestigeUpgrades && gameState.prestigeUpgrades['eventPower']) || 0 : 0;
    const powerMult = getUpgradeEffect('eventPower', powerLv);
    return activeEvent.effectValue * powerMult;
  }
  return 1.0;
}

/**
 * 現在のアクティブイベントを取得
 * @returns {Object|null}
 */
export function getActiveEvent() {
  return activeEvent;
}

/**
 * 鳥のフンの収穫ポイント倍率を取得＆消費
 * @returns {number} 倍率（適用なしなら1.0）
 */
export function consumePointBoost() {
  if (pointBoostRemaining > 0) {
    pointBoostRemaining--;
    return pointBoostMultiplier;
  }
  return 1.0;
}

/**
 * 鳥のフンのポイントブーストを設定
 * @param {number} multiplier
 * @param {number} count
 */
export function setPointBoost(multiplier, count) {
  pointBoostMultiplier = multiplier;
  pointBoostRemaining = count;
}

/**
 * 現在のポイントブースト残り回数
 * @returns {number}
 */
export function getPointBoostRemaining() {
  return pointBoostRemaining;
}

// ============================================
//  パーティクル生成
// ============================================

/** @type {number|null} */
let rainIntervalId = null;
let stageEl = null;

function getStage() {
  if (!stageEl) stageEl = document.getElementById('stage');
  return stageEl;
}

/**
 * 雨パーティクルを開始
 * @param {string} [color='rgba(180, 210, 255, 0.7)'] - 雨粒の色
 * @param {number} [interval=60] - 生成間隔(ms)
 */
export function startRainParticles(color, interval = 60) {
  stopRainParticles();
  const stage = getStage();
  if (!stage) return;

  rainIntervalId = setInterval(() => {
    const drop = document.createElement('div');
    drop.className = 'rain-drop';

    const x = Math.random() * 100;
    const speed = 0.3 + Math.random() * 0.3;
    const len = 8 + Math.random() * 12;

    drop.style.cssText = `
      left: ${x}%;
      --rain-speed: ${speed}s;
      --rain-len: ${len}px;
      ${color ? `--rain-color: ${color};` : ''}
    `;

    stage.appendChild(drop);
    setTimeout(() => drop.remove(), speed * 1000 + 50);
  }, interval);
}

/**
 * 雨パーティクルを停止
 */
export function stopRainParticles() {
  if (rainIntervalId !== null) {
    clearInterval(rainIntervalId);
    rainIntervalId = null;
  }
  const stage = getStage();
  if (stage) {
    stage.querySelectorAll('.rain-drop').forEach(el => el.remove());
  }
}

/**
 * 雪パーティクルを開始
 */
export function startSnowParticles() {
  stopRainParticles(); // 同じintervalを共有
  const stage = getStage();
  if (!stage) return;

  rainIntervalId = setInterval(() => {
    const flake = document.createElement('div');
    flake.className = 'snow-flake';
    const x = Math.random() * 100;
    const speed = 1.5 + Math.random() * 1.5;
    const size = 2 + Math.random() * 4;
    flake.style.cssText = `
      left: ${x}%;
      --snow-speed: ${speed}s;
      --snow-size: ${size}px;
    `;
    stage.appendChild(flake);
    setTimeout(() => flake.remove(), speed * 1000 + 50);
  }, 120);
}

/**
 * キャラが横断するスプライトを生成
 * @param {string} emoji
 * @param {number} durationMs
 */
export function spawnCrossingSprite(emoji, durationMs = 3000) {
  const stage = getStage();
  if (!stage) return;

  const sprite = document.createElement('div');
  sprite.className = 'crossing-sprite';
  sprite.textContent = emoji;
  sprite.style.setProperty('--cross-duration', `${durationMs / 1000}s`);
  stage.appendChild(sprite);
  setTimeout(() => sprite.remove(), durationMs + 100);
}

/**
 * 鳥のフン白パーティクル
 */
export function spawnBirdDropping() {
  const stage = getStage();
  if (!stage) return;

  const bird = document.createElement('div');
  bird.className = 'bird-sprite';
  stage.appendChild(bird);
  setTimeout(() => bird.remove(), 3000);

  setTimeout(() => {
    for (let i = 0; i < 3; i++) {
      const poop = document.createElement('div');
      poop.className = 'bird-poop';
      const offsetX = -8 + Math.random() * 16;
      poop.style.setProperty('--poop-x', `${offsetX}px`);
      poop.style.setProperty('--poop-delay', `${i * 0.1}s`);
      stage.appendChild(poop);
      setTimeout(() => poop.remove(), 1200);
    }
  }, 800);
}

/**
 * タンブルウィードが転がるスプライト
 */
export function spawnTumbleweed() {
  const stage = getStage();
  if (!stage) return;

  const tw = document.createElement('div');
  tw.className = 'tumbleweed-sprite';
  tw.textContent = '🌿';
  stage.appendChild(tw);
  setTimeout(() => tw.remove(), 5000);
}

/**
 * 雷フラッシュ
 */
export function triggerLightningFlash() {
  const stage = getStage();
  if (!stage) return;

  const flash = document.createElement('div');
  flash.className = 'lightning-flash';
  stage.appendChild(flash);
  setTimeout(() => flash.remove(), 300);

  // 複数回フラッシュ
  setTimeout(() => {
    const flash2 = document.createElement('div');
    flash2.className = 'lightning-flash';
    stage.appendChild(flash2);
    setTimeout(() => flash2.remove(), 200);
  }, 500);
}

/** 雷の定期フラッシュ用 */
let thunderIntervalId = null;

export function startThunderFlashes() {
  stopThunderFlashes();
  triggerLightningFlash();
  thunderIntervalId = setInterval(() => {
    if (Math.random() < 0.3) triggerLightningFlash();
  }, 3000);
}

export function stopThunderFlashes() {
  if (thunderIntervalId !== null) {
    clearInterval(thunderIntervalId);
    thunderIntervalId = null;
  }
}

/**
 * 全パーティクルを停止
 */
export function stopAllParticles() {
  stopRainParticles();
  stopThunderFlashes();
  const stage = getStage();
  if (stage) {
    stage.querySelectorAll(
      '.rain-drop, .snow-flake, .crossing-sprite, .bird-sprite, .bird-poop, .tumbleweed-sprite, .lightning-flash, .cumulonimbus-cloud'
    ).forEach(el => el.remove());
  }
}

/**
 * 入道雲を表示
 */
export function spawnCumulonimbus() {
  const stage = getStage();
  if (!stage) return;
  const cloud = document.createElement('div');
  cloud.className = 'cumulonimbus-cloud';
  cloud.textContent = '☁️';
  stage.appendChild(cloud);
  // 30秒後に消す（イベント終了時にも消す）
}
