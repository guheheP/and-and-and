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
 * 季節ジャンルは現在の月でフィルタする
 * @param {string} genreId
 * @returns {Object|null}
 */
function pickEventInGenre(genreId) {
  let events = Object.values(EVENT_MASTER).filter(e => e.genre === genreId);

  // 季節ジャンル: 現在の月に該当するイベントのみ
  if (genreId === 'seasonal') {
    const currentMonth = new Date().getMonth() + 1; // 1-12
    events = events.filter(e => e.months && e.months.includes(currentMonth));
  }

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
