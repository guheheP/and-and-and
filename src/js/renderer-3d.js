// renderer-3d.js — Three.js ボクセル 2.5D レンダラー（コア）
// カメラ・ライティング・地面・畑の基盤 + モジュール統合

import * as THREE from 'three';
import { CROP_MASTER, CHARACTER_MASTER } from './master-data.js';
import { initCommonDOM, updateHUD, showHarvestEffect, showLevelUpEffect, getCropColor } from './renderer-common.js';
import { CHAR_COLORS, rebuildFarmerModel } from './renderer-3d-models.js';
import { CROP_HEX, LEAF_HEX, buildCrop } from './renderer-3d-crops.js';
import {
  build3DClock, update3DClock,
  buildClouds,
  startEventVisual as _startEventVisual,
  stopAllEventVisuals as _stopAllEventVisuals,
  showHarvestParticles as _showHarvestParticles,
} from './renderer-3d-events.js';

// ═══════════════════════════════════════════
//  調整用パラメータ（ここを編集してください）
// ═══════════════════════════════════════════
const CONFIG = {
  // ── カメラ ──
  frustum: 4,                      // 視野の広さ（大きい=引き、小さい=寄り）
  cameraPos: { x: -0.8, y: 12, z: 30 },  // カメラ位置
  cameraLookAt: { x: -0.8, y: 2.5, z: 0 },    // カメラの注視点

  // ── 地面 ──
  groundX: [-10, 10],     // X方向の範囲 [min, max]
  groundZ: [-5, 6],     // Z方向の範囲 [min, max]（手前がプラス）
  groundY: -0.25,       // 地面ブロックの高さ位置
  groundHeight: 0.5,    // 地面ブロックの厚み
  groundEdgeZ: 6,       // 手前エッジブロックのZ位置
  groundEdgeLayers: 2,  // エッジの層数

  // ── 畑 ──
  fieldX: [-2, 2],      // 畑のX範囲 [min, max]
  fieldZ: [0, 1],       // 畑のZ範囲（行数）
  fieldOffsetZ: 0.5,    // 畑のZ方向オフセット
  fieldY: 0.02,         // 畑の高さ位置

  // ── 支柱 ──
  poleX: 1.2,           // 支柱のX位置（左は-poleX、右は+poleX）
  poleZ: 1.0,           // 支柱のZ位置
  poleHeight: 2.5,      // 支柱の高さ
  barY: 2.5,            // 横棒の高さ

  // ── キャラクター ──
  farmerPos: { x: -3.5, y: 0, z: 1.0 },  // キャラクターの位置
  farmerRotY: Math.PI / 4,               // キャラクターのY軸回転（畑の方を向く）

  // ── ライティング ──
  ambientIntensity: 0.95,
  dirLightIntensity: 1.0,
  dirLightPos: { x: 3, y: 8, z: 10 },
};

// ─── State ───
let scene, camera, renderer3d, animFrameId;
let groundGroup, farmerGroup;
let weatherGroup, cloudsGroup;
const activeAnimators = [];
let currentCharId = null;

// ── 複数畑対応 ──
/** @type {{ fieldGroup: THREE.Group, cropGroup: THREE.Group, cropId: string|null, progress: number, smoothProgress: number }[]} */
let fieldSlots = [];
let currentSlotCount = 1;

// 旧APIとの互換
export let currentCropId = null;
export let currentProgress = 0;
let smoothProgress = 0;

// ── ズーム制御 ──
let currentFrustum = CONFIG.frustum;
let currentLookAtY = CONFIG.cameraLookAt.y;

// ─── Constants ───
const V = 1;
const COLORS = {
  ground: 0x5a9e3c,
  groundDark: 0x4a8e2c,
  soil: 0x6b4226,
  soilDark: 0x5a3216,
  wood: 0x8B6914,
  sky: 0x87CEEB,
};

// ─ Helpers ─
function box(w, h, d, color) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshLambertMaterial({ color });
  return new THREE.Mesh(geo, mat);
}

// ═══════════════════════════════════════════
//  Init
// ═══════════════════════════════════════════

export function initRenderer() {
  initCommonDOM();

  const stage = document.getElementById('stage');

  // 2D要素を非表示
  const elements2D = stage.querySelectorAll('.stage__sky, .stage__ground, .farmer, .field');
  elements2D.forEach(el => el.style.display = 'none');

  // HTML時計を非表示（3D時計が代替）
  const htmlClock = document.getElementById('sky-clock');
  if (htmlClock) htmlClock.style.display = 'none';

  scene = new THREE.Scene();

  // カメラ（CONFIG で調整）
  const aspect = stage.clientWidth / stage.clientHeight;
  const f = CONFIG.frustum;
  camera = new THREE.OrthographicCamera(
    -f * aspect, f * aspect,
    f, -f,
    0.1, 100
  );
  camera.position.set(CONFIG.cameraPos.x, CONFIG.cameraPos.y, CONFIG.cameraPos.z);
  camera.lookAt(CONFIG.cameraLookAt.x, CONFIG.cameraLookAt.y, CONFIG.cameraLookAt.z);

  // レンダラー
  renderer3d = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
  });
  renderer3d.setSize(stage.clientWidth, stage.clientHeight);
  renderer3d.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer3d.shadowMap.enabled = true;
  renderer3d.shadowMap.type = THREE.PCFSoftShadowMap;

  updateClearColor();

  renderer3d.domElement.style.position = 'absolute';
  renderer3d.domElement.style.top = '0';
  renderer3d.domElement.style.left = '0';
  renderer3d.domElement.style.width = '100%';
  renderer3d.domElement.style.height = '100%';
  stage.appendChild(renderer3d.domElement);

  // ライティング（温かみのある農場の午後感）
  const ambient = new THREE.AmbientLight(0xfff5e0, CONFIG.ambientIntensity);
  scene.add(ambient);

  // ヘミスフィアライト（空=淡い水色 / 地面=草色）で自然な陰影
  const hemi = new THREE.HemisphereLight(0xb0d8f0, 0x607B33, 0.3);
  scene.add(hemi);

  const dirLight = new THREE.DirectionalLight(0xffe8b0, CONFIG.dirLightIntensity);
  dirLight.position.set(CONFIG.dirLightPos.x, CONFIG.dirLightPos.y, CONFIG.dirLightPos.z);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(512, 512);
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 40;
  dirLight.shadow.camera.left = -10;
  dirLight.shadow.camera.right = 10;
  dirLight.shadow.camera.top = 10;
  dirLight.shadow.camera.bottom = -10;
  scene.add(dirLight);

  // シーン構築
  buildGround();
  // 畑はmain.jsのrebuildFields()で構築される
  buildFarmer();

  // 天気グループ
  weatherGroup = new THREE.Group();
  scene.add(weatherGroup);

  cloudsGroup = new THREE.Group();
  scene.add(cloudsGroup);
  buildClouds(cloudsGroup);
  build3DClock(scene, CONFIG);

  animate();

  const observer = new MutationObserver(() => updateClearColor());
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', onResize);

  // マウスホイールズーム
  const stageEl = document.getElementById('stage');
  if (stageEl) {
    stageEl.addEventListener('wheel', (e) => {
      const modals = document.querySelectorAll('.modal:not([hidden])');
      if (modals.length > 0) return;
      e.preventDefault();
      const zoomStep = 0.15;
      const dir = e.deltaY > 0 ? 1 : -1;
      currentFrustum = Math.min(5, Math.max(3, currentFrustum + dir * zoomStep));
      currentLookAtY = 2 + (currentFrustum - 3) * 0.5;
      const w = stageEl.clientWidth, h = stageEl.clientHeight;
      const aspect = w / h;
      camera.left = -currentFrustum * aspect;
      camera.right = currentFrustum * aspect;
      camera.top = currentFrustum;
      camera.bottom = -currentFrustum;
      camera.updateProjectionMatrix();
      camera.lookAt(CONFIG.cameraLookAt.x, currentLookAtY, CONFIG.cameraLookAt.z);
    }, { passive: false });
  }
}

function updateClearColor() {
  const isTransparent = document.body.classList.contains('bg-transparent');
  renderer3d.setClearColor(isTransparent ? 0x000000 : COLORS.sky, isTransparent ? 0 : 1.0);
}

function onResize() {
  const stage = document.getElementById('stage');
  if (!stage) return;
  const w = stage.clientWidth, h = stage.clientHeight;
  const aspect = w / h;
  camera.left = -currentFrustum * aspect;
  camera.right = currentFrustum * aspect;
  camera.top = currentFrustum;
  camera.bottom = -currentFrustum;
  camera.updateProjectionMatrix();
  camera.lookAt(CONFIG.cameraLookAt.x, currentLookAtY, CONFIG.cameraLookAt.z);
  renderer3d.setSize(w, h);
}

function animate() {
  animFrameId = requestAnimationFrame(animate);
  const t = Date.now();

  // 作物スムーズ成長＆揺れアニメーション（全スロット）
  for (const slot of fieldSlots) {
    const cg = slot.cropGroup;
    if (cg && cg.visible && cg.userData.fruits) {
      slot.smoothProgress += (slot.progress - slot.smoothProgress) * 0.15;

      cg.userData.fruits.forEach(fruitGroup => {
        const appearAt = fruitGroup.userData.appearAt;
        const scaleTarget = Math.max(0, Math.min(1, (slot.smoothProgress - appearAt) * 3.3));
        fruitGroup.scale.set(scaleTarget, scaleTarget, scaleTarget);

        if (slot.progress >= 1.0) {
          fruitGroup.position.y = fruitGroup.userData.baseY + Math.sin(t * 0.005) * 0.12;
        } else {
          fruitGroup.position.y = fruitGroup.userData.baseY;
        }
      });
    }
  }

  // キャラクターの呼吸アニメーション（収穫アニメーション中はスキップ）
  if (farmerGroup && !farmerGroup.userData.animLock) {
    farmerGroup.userData.breathOffset = Math.sin(t * 0.002) * 0.04;
    farmerGroup.position.y = farmerGroup.userData.breathOffset;
  }

  // 雲のアニメーション
  if (cloudsGroup) {
    cloudsGroup.children.forEach(cloud => {
      cloud.position.x += cloud.userData.speed;
      if (cloud.position.x > 20) {
        cloud.position.x = -20;
        cloud.position.y = 5 + Math.random() * 3;
      }
    });
  }

  // 3D時計の更新
  update3DClock();

  // アクティブアニメーターの更新
  const dt = 16;
  for (let i = activeAnimators.length - 1; i >= 0; i--) {
    const anim = activeAnimators[i];
    if (!anim.update(dt, t)) {
      if (anim.mesh) {
        anim.mesh.removeFromParent();
        // ジオメトリとマテリアルを解放
        anim.mesh.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
      }
      activeAnimators.splice(i, 1);
    }
  }

  renderer3d.render(scene, camera);
}

// ═══════════════════════════════════════════
//  Ground
// ═══════════════════════════════════════════

function buildGround() {
  groundGroup = new THREE.Group();

  for (let x = CONFIG.groundX[0]; x <= CONFIG.groundX[1]; x++) {
    for (let z = CONFIG.groundZ[0]; z <= CONFIG.groundZ[1]; z++) {
      const isDark = (x + z) % 2 === 0;
      const block = box(V, V * CONFIG.groundHeight, V, isDark ? COLORS.groundDark : COLORS.ground);
      block.position.set(x * V, CONFIG.groundY, z * V);
      block.receiveShadow = true;
      groundGroup.add(block);
    }
  }

  for (let x = CONFIG.groundX[0]; x <= CONFIG.groundX[1]; x++) {
    for (let y = 0; y < CONFIG.groundEdgeLayers; y++) {
      const sideBlock = box(V, V, V, y === 0 ? 0x3a7020 : 0x2a5a18);
      sideBlock.position.set(x * V, -0.5 - y, CONFIG.groundEdgeZ);
      groundGroup.add(sideBlock);
    }
  }

  scene.add(groundGroup);
}

// ═══════════════════════════════════════════
//  Field（複数畑対応）
// ═══════════════════════════════════════════

/**
 * 畑のレイアウト位置を計算（斜め配置）
 * @param {number} slotIndex - スロット番号
 * @param {number} totalSlots - 総スロット数
 * @returns {{ x: number, z: number, scale: number }}
 */
function getFieldLayout(slotIndex, totalSlots) {
  // 1畑の場合: 元の位置
  if (totalSlots === 1) {
    return { x: 0, z: 0, scale: 1.0 };
  }

  // 畑数ごとに個別レイアウト（scale縮小を加味した間隔調整）
  const layouts = {
    2: { stepX: 2.8, stepZ: -2.5, scale: 0.85 },
    3: { stepX: 2.0, stepZ: -1.8, scale: 0.7 },
    4: { stepX: 1.7, stepZ: -1.6, scale: 0.7 },
  };
  const cfg = layouts[totalSlots] || layouts[2];
  const centerIdx = (totalSlots - 1) / 2;
  const offset = slotIndex - centerIdx;

  return {
    x: offset * cfg.stepX,
    z: offset * cfg.stepZ,
    scale: cfg.scale,
  };
}

/**
 * 単一の畑セット（土壌+支柱+作物グループ）を構築
 */
function buildSingleField(scale) {
  const fieldGroup = new THREE.Group();

  const s = scale;
  const fieldXRange = [Math.round(CONFIG.fieldX[0] * s), Math.round(CONFIG.fieldX[1] * s)];
  const fieldZRange = [CONFIG.fieldZ[0], CONFIG.fieldZ[1]];

  for (let x = fieldXRange[0]; x <= fieldXRange[1]; x++) {
    for (let z = fieldZRange[0]; z <= fieldZRange[1]; z++) {
      const isDark = (x + z) % 2 === 0;
      const soil = box(V, 0.3, V, isDark ? COLORS.soilDark : COLORS.soil);
      soil.position.set(x * V, CONFIG.fieldY, z * V + CONFIG.fieldOffsetZ);
      soil.receiveShadow = true;
      soil.userData = { isSoil: true, isDark };
      fieldGroup.add(soil);
    }
  }

  // 支柱
  const poleXScaled = CONFIG.poleX * s;
  const poleL = box(0.15, CONFIG.poleHeight, 0.15, COLORS.wood);
  poleL.position.set(-poleXScaled, CONFIG.poleHeight / 2, CONFIG.poleZ);
  poleL.castShadow = true;
  fieldGroup.add(poleL);

  const poleR = box(0.15, CONFIG.poleHeight, 0.15, COLORS.wood);
  poleR.position.set(poleXScaled, CONFIG.poleHeight / 2, CONFIG.poleZ);
  poleR.castShadow = true;
  fieldGroup.add(poleR);

  // 横棒
  const barWidth = (poleXScaled * 2) + 0.15;
  const bar = box(barWidth, 0.1, 0.1, COLORS.wood);
  bar.position.set(0, CONFIG.barY, CONFIG.poleZ);
  bar.castShadow = true;
  fieldGroup.add(bar);

  const cropGroup = new THREE.Group();
  cropGroup.visible = false;

  return { fieldGroup, cropGroup };
}

/**
 * 全畑を再構築
 * @param {number} slotCount
 */
export function rebuildFields(slotCount) {
  // 旧スロットを削除
  for (const slot of fieldSlots) {
    scene.remove(slot.fieldGroup);
    scene.remove(slot.cropGroup);
    slot.fieldGroup.traverse(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });
    slot.cropGroup.traverse(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });
  }
  fieldSlots = [];

  currentSlotCount = slotCount;

  for (let i = 0; i < slotCount; i++) {
    const layout = getFieldLayout(i, slotCount);
    const { fieldGroup, cropGroup } = buildSingleField(layout.scale);

    // 畑全体をスケール＆配置
    fieldGroup.scale.setScalar(layout.scale);
    fieldGroup.position.set(layout.x, 0, layout.z);
    cropGroup.scale.setScalar(layout.scale);
    cropGroup.position.set(layout.x, 0, layout.z);

    scene.add(fieldGroup);
    scene.add(cropGroup);

    fieldSlots.push({
      fieldGroup,
      cropGroup,
      cropId: null,
      progress: 0,
      smoothProgress: 0,
    });
  }

  // キャラクター位置を畑数に応じて調整
  if (farmerGroup) {
    const layout0 = getFieldLayout(0, slotCount);
    farmerGroup.position.set(
      layout0.x + CONFIG.farmerPos.x * layout0.scale,
      CONFIG.farmerPos.y,
      layout0.z + CONFIG.farmerPos.z * layout0.scale
    );
  }
}

/** 初期畑構築（後方互換） */
function buildField() {
  rebuildFields(1);
}

// ═══════════════════════════════════════════
//  Farmer
// ═══════════════════════════════════════════

function buildFarmer() {
  farmerGroup = new THREE.Group();
  farmerGroup.position.set(CONFIG.farmerPos.x, CONFIG.farmerPos.y, CONFIG.farmerPos.z);
  farmerGroup.rotation.y = CONFIG.farmerRotY;
  farmerGroup.userData = { breathOffset: 0, animLock: false };
  scene.add(farmerGroup);
  rebuildFarmerModel(farmerGroup, 'farmer--man');
}

// ═══════════════════════════════════════════
//  Public Interface
// ═══════════════════════════════════════════

export function updateCharacter(charIdOrConfig) {
  let cssClass, config;

  if (typeof charIdOrConfig === 'object' && charIdOrConfig !== null) {
    // オブジェクト形式: { base: 'man', hat: 'straw_hat', accessory: 'watering_can' }
    const baseId = charIdOrConfig.base || 'man';
    const char = CHARACTER_MASTER[baseId];
    cssClass = char ? char.cssClass : 'farmer--man';
    config = charIdOrConfig;
  } else {
    // 文字列形式（後方互換）: 'man', 'woman', etc.
    const char = CHARACTER_MASTER[charIdOrConfig];
    if (!char) return;
    cssClass = char.cssClass;
    config = charIdOrConfig;
  }

  currentCharId = typeof charIdOrConfig === 'object' ? charIdOrConfig.base : charIdOrConfig;
  rebuildFarmerModel(farmerGroup, config);
}

export function updateField(fieldState, slotIndex = 0) {
  const slot = fieldSlots[slotIndex];
  if (!slot) return;

  if (!fieldState.isPlanted || !fieldState.cropId) {
    slot.cropGroup.visible = false;
    slot.cropId = null;
    // スロット0の旧API互換
    if (slotIndex === 0) currentCropId = null;
    return;
  }

  const isNewPlant = fieldState.cropId !== slot.cropId || fieldState.progress < slot.progress;

  if (isNewPlant) {
    slot.cropId = fieldState.cropId;
    slot.smoothProgress = fieldState.progress;
    // スケールされた畑用のCONFIG
    const layout = getFieldLayout(slotIndex, currentSlotCount);
    buildCrop(slot.cropGroup, slot.cropId, CONFIG);
  }

  slot.progress = fieldState.progress;

  // スロット0の旧API互換
  if (slotIndex === 0) {
    currentCropId = slot.cropId;
    currentProgress = slot.progress;
    smoothProgress = slot.smoothProgress;
  }
}

let _armResetTimer = null;
export function triggerWorkAnimation() {
  if (!farmerGroup) return;

  if (_armResetTimer) {
    clearTimeout(_armResetTimer);
    _armResetTimer = null;
  }

  const armL = farmerGroup.getObjectByName('armL');
  const armR = farmerGroup.getObjectByName('armR');
  if (!armL || !armR) return;

  armL.rotation.x = -0.7;
  armR.rotation.x = -0.7;

  _armResetTimer = setTimeout(() => {
    if (farmerGroup.getObjectByName('armL') === armL && farmerGroup.getObjectByName('armR') === armR) {
      armL.rotation.x = 0;
      armR.rotation.x = 0;
    }
    _armResetTimer = null;
  }, 150);
}

// 収穫時の専用アニメーション（屈んでから伸び上がる）
export function triggerHarvestAnimation() {
  if (!farmerGroup) return;

  if (_armResetTimer) {
    clearTimeout(_armResetTimer);
    _armResetTimer = null;
  }

  // 呼吸アニメーションをロック
  farmerGroup.userData.animLock = true;

  const armL = farmerGroup.getObjectByName('armL');
  const armR = farmerGroup.getObjectByName('armR');

  // 1: 屈む（farmerGroup 全体を動かす）
  farmerGroup.position.y = -0.2;
  farmerGroup.rotation.x = -0.2;
  if (armL && armR) {
    armL.rotation.x = -1.2;
    armR.rotation.x = -1.2;
  }

  // 2: 伸び上がって喜ぶ
  setTimeout(() => {
    if (!farmerGroup) return;
    farmerGroup.position.y = 0.2; // 少しジャンプ
    farmerGroup.rotation.x = 0;
    if (armL && armR) {
      armL.rotation.x = -2.5; // バンザイ
      armR.rotation.x = -2.5;
    }

    // 3: 元に戻る
    _armResetTimer = setTimeout(() => {
      if (!farmerGroup) return;
      farmerGroup.position.y = 0;
      farmerGroup.rotation.x = 0;
      if (armL && armR) {
        armL.rotation.x = 0;
        armR.rotation.x = 0;
      }
      // 呼吸アニメーションのロックを解除
      farmerGroup.userData.animLock = false;
      _armResetTimer = null;
    }, 300);
  }, 150);
}

// ═══════════════════════════════════════════
//  Event Visuals (delegate to events module)
// ═══════════════════════════════════════════

function getEventContext() {
  return { scene, weatherGroup, activeAnimators, CONFIG, updateClearColor, renderer3d };
}

export function startEventVisual(event) {
  _startEventVisual(event, getEventContext());
}

export function stopAllEventVisuals() {
  _stopAllEventVisuals(getEventContext());
}

export function showHarvestParticles(cropId, slotIndex = 0) {
  const layout = getFieldLayout(slotIndex, currentSlotCount);
  _showHarvestParticles(scene, cropId, CROP_HEX, layout.x, layout.z);
}

// 共通モジュールから re-export
export { updateHUD, showHarvestEffect, showLevelUpEffect };
