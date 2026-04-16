// performance-settings.js — パフォーマンス関連の設定値 単一ソース
// レンダラー/イベントレイヤーがここから参照。設定変更は setPerf()。

/** 既定値（画質: 高） */
export const DEFAULT_PERF = Object.freeze({
  qualityTier: 'high',           // 'low' | 'medium' | 'high'
  particleScale: 1.0,            // 0 - 1.0（天候・収穫パーティクル量の倍率）
  maxAnimators: 20,              // 同時アニメーター上限
  maxWeatherAnimators: 3,        // 同時天候パーティクル上限
  shadowsEnabled: true,          // 影のオン/オフ
  antialias: true,               // アンチエイリアス（次回起動時反映）
  pixelRatioCap: 2,              // 1 or 2（次回起動時反映）
  cloudCount: 6,                 // 背景の雲の数（次回起動時反映）
  harvestParticlesEnabled: true, // 収穫時パーティクル
  characterBreathEnabled: true,  // キャラ呼吸アニメーション
});

/** プリセット定義 */
export const PRESETS = Object.freeze({
  low: {
    qualityTier: 'low',
    particleScale: 0.3,
    maxAnimators: 10,
    maxWeatherAnimators: 1,
    shadowsEnabled: false,
    antialias: false,
    pixelRatioCap: 1,
    cloudCount: 2,
    harvestParticlesEnabled: true,
    characterBreathEnabled: true,
  },
  medium: {
    qualityTier: 'medium',
    particleScale: 0.6,
    maxAnimators: 14,
    maxWeatherAnimators: 2,
    shadowsEnabled: true,
    antialias: true,
    pixelRatioCap: 1,
    cloudCount: 4,
    harvestParticlesEnabled: true,
    characterBreathEnabled: true,
  },
  high: {
    qualityTier: 'high',
    particleScale: 1.0,
    maxAnimators: 20,
    maxWeatherAnimators: 3,
    shadowsEnabled: true,
    antialias: true,
    pixelRatioCap: 2,
    cloudCount: 6,
    harvestParticlesEnabled: true,
    characterBreathEnabled: true,
  },
});

/** 現在の設定（内部参照） */
let _current = { ...DEFAULT_PERF };

/** 変更通知コールバック */
const _subscribers = [];

/**
 * gameState.performanceSettings を元に初期化
 * @param {object} saved - gameState.performanceSettings
 */
export function initPerfSettings(saved) {
  _current = { ...DEFAULT_PERF, ...(saved || {}) };
  return _current;
}

/**
 * 現在の設定を取得（レンダラーが毎フレーム参照しても軽い）
 */
export function getPerf() {
  return _current;
}

/**
 * 設定を部分更新。gameState 側の値も書き戻し（呼び出し側で saveState）
 * @param {object} patch
 */
export function setPerf(patch) {
  _current = { ...DEFAULT_PERF, ..._current, ...patch };
  _subscribers.forEach(cb => {
    try { cb(_current); } catch (e) { console.error(e); }
  });
  return _current;
}

/**
 * プリセットを一括適用
 * @param {'low'|'medium'|'high'} tier
 */
export function applyPreset(tier) {
  const preset = PRESETS[tier];
  if (!preset) return _current;
  return setPerf(preset);
}

/**
 * 既定値に戻す
 */
export function resetPerf() {
  return setPerf(DEFAULT_PERF);
}

/**
 * 設定変更時のコールバックを登録
 * @param {(perf:object)=>void} cb
 */
export function subscribePerf(cb) {
  _subscribers.push(cb);
  return () => {
    const i = _subscribers.indexOf(cb);
    if (i >= 0) _subscribers.splice(i, 1);
  };
}
