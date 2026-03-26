// renderer-3d.js — Three.js ボクセル 2.5D レンダラー
// 横（やや斜め上）からのビュー、作物/キャラ個別モデル

import * as THREE from 'three';
import { CROP_MASTER, CHARACTER_MASTER } from './master-data.js';
import { initCommonDOM, updateHUD, showHarvestEffect, showLevelUpEffect, getCropColor } from './renderer-common.js';

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
let groundGroup, fieldGroup, cropGroup, farmerGroup;
let weatherGroup, cloudsGroup;
const activeAnimators = [];
export let currentCropId = null;
export let currentProgress = 0;
let smoothProgress = 0; // スムーズな成長アニメーション用
let currentCharId = null;

// ── ズーム制御 ──
let currentFrustum = CONFIG.frustum;
let currentLookAtY = CONFIG.cameraLookAt.y;

// ── 3D時計 ──
let clockMesh = null;
let clockCanvas = null;
let clockCtx = null;
let clockTexture = null;
let lastClockMinute = -1;

// ─── Constants ───
const V = 1;  // voxel unit
const COLORS = {
  ground: 0x5a9e3c,
  groundDark: 0x4a8e2c,
  soil: 0x6b4226,
  soilDark: 0x5a3216,
  wood: 0x8B6914,
  sky: 0x87CEEB,
};

// ─── Crop colors ───
const CROP_HEX = {
  tomato: 0xe04040, potato: 0xc8a050,
  carrot: 0xff8c00, strawberry: 0xff4060,
  corn: 0xf0d040, pumpkin: 0xe08020,
  watermelon: 0x408040, golden_apple: 0xffd700,
  tumbleweed: 0xedc97f, christmas_tree: 0x2d8040,
};
const LEAF_HEX = {
  tomato: 0x2d8040, potato: 0x4a8e2c,
  carrot: 0x2d8040, strawberry: 0x2d8040,
  corn: 0x5a9e3c, pumpkin: 0x2d6030,
  watermelon: 0x306030, golden_apple: 0x5a9e3c,
  tumbleweed: 0x807050, christmas_tree: 0x1a6030,
};

// ─── Character colors ───
const CHAR_COLORS = {
  'farmer--man': { skin: 0xf5c6a0, body: 0x4477bb, hair: 0x4a3520, pants: 0x445566 },
  'farmer--woman': { skin: 0xf5c6a0, body: 0xcc4477, hair: 0x6a4530, pants: 0x445566 },
  'farmer--oldman': { skin: 0xe0b890, body: 0x667744, hair: 0xcccccc, pants: 0x556644 },
  'farmer--girl': { skin: 0xf5c6a0, body: 0xff88aa, hair: 0xffcc44, pants: 0x445566 },
  'farmer--boy': { skin: 0xf5c6a0, body: 0x44aa77, hair: 0x3a2010, pants: 0x445566 },
  'farmer--dog': { skin: 0xc8a060, body: 0xc8a060, hair: 0x8a6030, pants: 0xc8a060 },
  'farmer--cat': { skin: 0xe0b880, body: 0xe0b880, hair: 0x504030, pants: 0xe0b880 },
  'farmer--robot': { skin: 0xaaaacc, body: 0x6688aa, hair: 0x889900, pants: 0x556688 },
  'farmer--alien': { skin: 0x80cc80, body: 0x445588, hair: 0x40aa40, pants: 0x334466 },
  'farmer--pumpkinhead': { skin: 0xe08020, body: 0x553322, hair: 0x2d8040, pants: 0x443322 },
  'farmer--snowman': { skin: 0xffffff, body: 0xffffff, hair: 0xff6600, pants: 0xeeeeee },
};

// ─ Helpers ─
function box(w, h, d, color) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshLambertMaterial({ color });
  return new THREE.Mesh(geo, mat);
}

function sphere(r, color) {
  const geo = new THREE.SphereGeometry(r, 6, 6);
  const mat = new THREE.MeshLambertMaterial({ color });
  return new THREE.Mesh(geo, mat);
}

function cylinder(rTop, rBot, h, color) {
  const geo = new THREE.CylinderGeometry(rTop, rBot, h, 6);
  const mat = new THREE.MeshLambertMaterial({ color });
  return new THREE.Mesh(geo, mat);
}

function cloudBox(w, h, d, color, opacity = 0.8) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false
  });
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
    premultipliedAlpha: false,
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
  buildField();
  buildFarmer();

  // 天気グループ
  weatherGroup = new THREE.Group();
  scene.add(weatherGroup);

  cloudsGroup = new THREE.Group();
  scene.add(cloudsGroup);
  buildClouds();
  build3DClock();

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

  // 作物スムーズ成長＆揺れアニメーション
  if (cropGroup && cropGroup.visible && cropGroup.userData.fruits) {
    // 実際の進捗に向けてスムーズに追従（CSS transition: 0.4s のような動き）
    smoothProgress += (currentProgress - smoothProgress) * 0.15;

    cropGroup.userData.fruits.forEach(fruitGroup => {
      const appearAt = fruitGroup.userData.appearAt;
      // appearAt〜の範囲でスケール0→1へ
      const scaleTarget = Math.max(0, Math.min(1, (smoothProgress - appearAt) * 3.3));

      // バネのような少し弾むイージング（オプションだが線形でも十分きれい）
      fruitGroup.scale.set(scaleTarget, scaleTarget, scaleTarget);

      // 成熟時の揺れ
      if (currentProgress >= 1.0) {
        fruitGroup.position.y = fruitGroup.userData.baseY + Math.sin(t * 0.005) * 0.12;
      } else {
        fruitGroup.position.y = fruitGroup.userData.baseY;
      }
    });
  }

  // キャラクターの呼吸アニメーション
  if (farmerGroup) {
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
      if (anim.mesh) anim.mesh.removeFromParent();
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

  // 地面ブロック（CONFIG で範囲を調整）
  for (let x = CONFIG.groundX[0]; x <= CONFIG.groundX[1]; x++) {
    for (let z = CONFIG.groundZ[0]; z <= CONFIG.groundZ[1]; z++) {
      const isDark = (x + z) % 2 === 0;
      const block = box(V, V * CONFIG.groundHeight, V, isDark ? COLORS.groundDark : COLORS.ground);
      block.position.set(x * V, CONFIG.groundY, z * V);
      block.receiveShadow = true;
      groundGroup.add(block);
    }
  }

  // 地面の側面（手前エッジ）
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
//  Field
// ═══════════════════════════════════════════

function buildField() {
  fieldGroup = new THREE.Group();

  // 畑の土（CONFIG で範囲を調整）
  for (let x = CONFIG.fieldX[0]; x <= CONFIG.fieldX[1]; x++) {
    for (let z = CONFIG.fieldZ[0]; z <= CONFIG.fieldZ[1]; z++) {
      const isDark = (x + z) % 2 === 0;
      const soil = box(V, V * 0.55, V, isDark ? COLORS.soilDark : COLORS.soil);
      soil.position.set(x * V, CONFIG.fieldY, z * V + CONFIG.fieldOffsetZ);
      soil.receiveShadow = true;
      fieldGroup.add(soil);
    }
  }

  // 支柱（CONFIG で位置を調整）
  const poleL = box(0.12, CONFIG.poleHeight, 0.12, COLORS.wood);
  poleL.position.set(-CONFIG.poleX, CONFIG.poleHeight / 2, CONFIG.poleZ);
  poleL.castShadow = true;
  fieldGroup.add(poleL);

  const poleR = box(0.12, CONFIG.poleHeight, 0.12, COLORS.wood);
  poleR.position.set(CONFIG.poleX, CONFIG.poleHeight / 2, CONFIG.poleZ);
  poleR.castShadow = true;
  fieldGroup.add(poleR);

  // 横棒
  const barWidth = (CONFIG.poleX * 2) + 0.15;
  const bar = box(barWidth, 0.1, 0.1, COLORS.wood);
  bar.position.set(0, CONFIG.barY, CONFIG.poleZ);
  bar.castShadow = true;
  fieldGroup.add(bar);

  scene.add(fieldGroup);

  cropGroup = new THREE.Group();
  cropGroup.visible = false;
  scene.add(cropGroup);
}

// ═══════════════════════════════════════════
//  Crops — ツル＋実の統一スタイル（2Dビューに合わせた表現）
//  支柱の間をS字カーブのツルが巻き、実が膨らむ
// ═══════════════════════════════════════════

// ツルの経路点（S字カーブ）— ワールド座標で直接指定
function getVinePoints() {
  const pX = CONFIG.poleX;
  const fz = CONFIG.poleZ;      // 支柱のZ位置（＝畑のZ）
  const baseY = 0.35;
  const topY = CONFIG.barY - 0.1;
  const h = topY - baseY;

  // S字カーブ（左の支柱根元から右上→左中→右上へ）
  return [
    { x: -pX + 0.15, y: baseY, z: fz },
    { x: -pX + 0.6, y: baseY + h * 0.12, z: fz + 0.2 },
    { x: 0, y: baseY + h * 0.25, z: fz - 0.15 },
    { x: pX - 0.4, y: baseY + h * 0.38, z: fz + 0.15 },
    { x: pX - 0.15, y: baseY + h * 0.5, z: fz },
    { x: 0, y: baseY + h * 0.62, z: fz + 0.2 },
    { x: -pX + 0.4, y: baseY + h * 0.75, z: fz - 0.15 },
    { x: -pX + 0.15, y: baseY + h * 0.85, z: fz },
    { x: 0, y: baseY + h * 0.92, z: fz + 0.1 },
    { x: pX - 0.3, y: topY, z: fz },
  ];
}

// 実の出現位置（ツル上の4箇所）
const FRUIT_POSITIONS = [
  { vineIdx: 1, appearAt: 0.1 },
  { vineIdx: 3, appearAt: 0.3 },
  { vineIdx: 6, appearAt: 0.5 },
  { vineIdx: 9, appearAt: 0.7 },
];

/**
 * 作物固有の3D形状（実の部分）を生成する
 */
function createFruitMesh(cropId, r, color) {
  const grp = new THREE.Group();
  let core, cap;

  switch (cropId) {
    case 'potato':
      // じゃがいも（いびつな塊）
      core = box(r * 1.6, r * 1.2, r * 1.4, color);
      grp.add(core); // ヘタなし
      break;

    case 'carrot':
      // にんじん（逆円錐風・下向きシリンダー）
      core = cylinder(r * 0.8, r * 0.2, r * 2.5, color);
      core.position.y = -r * 0.5; // 重心を下に
      cap = box(r * 0.6, 0.1, r * 0.6, 0x2d8040); // 葉
      cap.position.set(0, r * 0.8, 0);
      grp.add(core, cap);
      break;

    case 'strawberry':
      // いちご（下向きの円錐に近い）
      core = cylinder(r, r * 0.2, r * 1.8, color);
      core.position.y = -r * 0.2;
      cap = box(r * 0.8, 0.08, r * 0.8, 0x2d8040);
      cap.position.set(0, r * 0.7, 0);
      grp.add(core, cap);
      break;

    case 'corn':
      // とうもろこし（縦長シリンダー＋緑の皮）
      core = cylinder(r * 0.6, r * 0.6, r * 2.2, color);
      const husk = box(r * 0.8, r * 1.5, r * 0.8, 0x5a9e3c);
      husk.position.y = -r * 0.3;
      cap = box(r * 0.3, 0.2, r * 0.3, 0x2d6030);
      cap.position.set(0, r * 1.1, 0);
      grp.add(core, husk, cap);
      break;

    case 'pumpkin':
      // かぼちゃ（平たい球）
      core = sphere(r, color);
      core.scale.set(1.4, 0.8, 1.4);
      cap = box(r * 0.3, 0.15, r * 0.3, 0x2d6030); // 太めのヘタ
      cap.position.set(0, r * 0.8, 0);
      grp.add(core, cap);
      break;

    case 'watermelon':
      // スイカ（少し横長）
      core = sphere(r, color);
      core.scale.set(1.1, 1.0, 1.1);
      cap = box(r * 0.4, 0.08, r * 0.4, 0x2d6030);
      cap.position.set(0, r + 0.02, 0);
      grp.add(core, cap);
      break;

    case 'tumbleweed':
      // タンブルウィード（大きめで明るく）
      core = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const b = box(r * 2.5, r * 2.5, r * 0.6, color);
        b.rotation.x = i * 1.0;
        b.rotation.y = i * 0.5;
        core.add(b);
      }
      grp.add(core);
      break;

    case 'christmas_tree':
      // ツリー（円錐・上向きシリンダー）
      core = cylinder(0.01, r * 1.2, r * 2.5, color);
      core.position.y = r * 0.2;
      const trunk = box(r * 0.4, r * 0.8, r * 0.4, 0x5a3216);
      trunk.position.y = -r * 1.0;
      grp.add(trunk, core);
      break;

    case 'tomato':
    case 'golden_apple':
    default:
      // デフォルト（球 + ヘタ）
      core = sphere(r, color);
      cap = box(r * 0.5, 0.08, r * 0.5, 0x2d6030);
      cap.position.set(0, r + 0.02, 0);
      grp.add(core, cap);
      break;
  }

  // 子要素すべてにシャドウキャストを設定
  grp.traverse(child => {
    if (child.isMesh) child.castShadow = true;
  });

  return grp;
}

function buildCrop(cropId) {
  // 既存の作物を削除
  while (cropGroup.children.length) {
    const c = cropGroup.children[0];
    c.removeFromParent();
    if (c.geometry) c.geometry.dispose();
    if (c.material) c.material.dispose();
  }
  cropGroup.visible = true;

  cropGroup.userData.fruits = [];

  const vinePoints = getVinePoints();
  const fruitColor = CROP_HEX[cropId] || 0xffd700;
  const vineColor = 0x3a7a2a;

  // ── ツル（最初から完全表示。2DのSVGと同じ挙動）──
  const vineLen = vinePoints.length;
  for (let i = 0; i < vineLen - 1; i++) {
    const p1 = vinePoints[i];
    const p2 = vinePoints[i + 1];

    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    const mz = (p1.z + p2.z) / 2;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = p2.z - p1.z;
    const segLen = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const vine = box(0.15, segLen + 0.05, 0.15, vineColor);
    vine.position.set(mx, my, mz);
    vine.rotation.z = -Math.atan2(dx, dy);
    vine.rotation.x = Math.atan2(dz, Math.sqrt(dx * dx + dy * dy)) * 0.3;
    vine.castShadow = true;
    cropGroup.add(vine);
  }

  // ── 葉っぱ（茂らせる） ──
  const leafIndices = [1, 2, 3, 4, 5, 6, 7, 8];
  leafIndices.forEach((idx, i) => {
    const pt = vinePoints[idx];
    if (!pt) return;

    // メインの葉
    const side1 = (i % 2 === 0) ? 1 : -1;
    const leaf1 = box(0.4, 0.06, 0.3, vineColor);
    leaf1.position.set(pt.x + side1 * 0.25, pt.y + 0.05, pt.z);
    leaf1.rotation.z = side1 * 0.6;
    leaf1.rotation.y = side1 * 0.3;
    leaf1.castShadow = true;
    cropGroup.add(leaf1);

    // サブの葉（反対側や少しズレた位置に生やす）
    const side2 = -side1;
    const leaf2 = box(0.3, 0.06, 0.25, vineColor);
    leaf2.position.set(pt.x + side2 * 0.15, pt.y - 0.05, pt.z + 0.15);
    leaf2.rotation.z = side2 * 0.4;
    leaf2.rotation.y = side2 * 0.6;
    leaf2.castShadow = true;
    cropGroup.add(leaf2);
  });

  // ── 実（スケール0で初期配置し、animateループでアニメーションさせる）──
  FRUIT_POSITIONS.forEach(fp => {
    const pt = vinePoints[fp.vineIdx];
    if (!pt) return;

    const r = 0.35; // 最大サイズ
    const group = new THREE.Group();
    // 葉っぱに隠れないよう、Z軸（手前）に少しオフセット (+0.2)
    group.position.set(pt.x, pt.y - r * 0.3, pt.z + 0.2);

    // 作物ごとの独自形状メッシュを生成して追加
    const fruitMeshGroup = createFruitMesh(cropId, r, fruitColor);
    group.add(fruitMeshGroup);

    group.scale.set(0, 0, 0); // 初期状態は見えない
    group.userData = { appearAt: fp.appearAt, baseY: pt.y - r * 0.3 };

    cropGroup.add(group);
    cropGroup.userData.fruits.push(group);
  });
}

// ═══════════════════════════════════════════
//  Farmer — キャラクター別モデル
// ═══════════════════════════════════════════

function buildFarmer() {
  farmerGroup = new THREE.Group();
  // キャラクター位置・向き（CONFIG で調整）
  farmerGroup.position.set(CONFIG.farmerPos.x, CONFIG.farmerPos.y, CONFIG.farmerPos.z);
  farmerGroup.rotation.y = CONFIG.farmerRotY;
  farmerGroup.userData = { breathOffset: 0 };
  scene.add(farmerGroup);
  rebuildFarmerModel('farmer--man');
}

function rebuildFarmerModel(cssClass) {
  while (farmerGroup.children.length) {
    const c = farmerGroup.children[0];
    c.removeFromParent();
    if (c.geometry) c.geometry.dispose();
    if (c.material) c.material.dispose();
  }

  // 動物系は別Builder
  if (cssClass === 'farmer--dog') return buildDogModel();
  if (cssClass === 'farmer--cat') return buildCatModel();
  if (cssClass === 'farmer--snowman') return buildSnowmanModel();

  // 人間系
  const colors = CHAR_COLORS[cssClass] || CHAR_COLORS['farmer--man'];
  buildHumanoidModel(colors);
}

function buildHumanoidModel(c) {
  // 頭
  const head = box(0.9, 0.9, 0.9, c.skin);
  head.position.set(0, 3.1, 0);
  head.castShadow = true;
  farmerGroup.add(head);

  // 髪
  const hair = box(0.95, 0.25, 0.95, c.hair);
  hair.position.set(0, 3.6, 0);
  farmerGroup.add(hair);

  // 目
  const eyeGeo = new THREE.BoxGeometry(0.12, 0.12, 0.05);
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const eL = new THREE.Mesh(eyeGeo, eyeMat);
  eL.position.set(-0.22, 3.15, 0.48);
  farmerGroup.add(eL);
  const eR = new THREE.Mesh(eyeGeo, eyeMat);
  eR.position.set(0.22, 3.15, 0.48);
  farmerGroup.add(eR);

  // 胴体
  const body = box(0.9, 1.3, 0.6, c.body);
  body.position.set(0, 2.0, 0);
  body.castShadow = true;
  farmerGroup.add(body);

  // 腕
  const armL = box(0.3, 1.1, 0.3, c.skin);
  armL.position.set(-0.6, 2.0, 0);
  armL.castShadow = true;
  farmerGroup.add(armL);
  const armR = box(0.3, 1.1, 0.3, c.skin);
  armR.position.set(0.6, 2.0, 0);
  armR.castShadow = true;
  farmerGroup.add(armR);

  // 脚
  const legL = box(0.35, 0.9, 0.35, c.pants);
  legL.position.set(-0.22, 0.7, 0);
  legL.castShadow = true;
  farmerGroup.add(legL);
  const legR = box(0.35, 0.9, 0.35, c.pants);
  legR.position.set(0.22, 0.7, 0);
  legR.castShadow = true;
  farmerGroup.add(legR);
}

function buildDogModel() {
  const c = 0xd89f50; // 薄茶色
  const w = 0xffffff; // 白

  // 1: 体（上半分茶色）
  const bodyTop = box(1.4, 0.4, 0.8, c);
  bodyTop.position.set(0, 1.0, 0);
  bodyTop.castShadow = true;
  farmerGroup.add(bodyTop);
  
  // 体（下半分白）
  const bodyBot = box(1.4, 0.3, 0.8, w);
  bodyBot.position.set(0, 0.65, 0);
  bodyBot.castShadow = true;
  farmerGroup.add(bodyBot);

  // 2: 頭
  const head = box(0.8, 0.8, 0.8, c);
  head.position.set(0.8, 1.5, 0);
  head.castShadow = true;
  farmerGroup.add(head);

  // 3: マズル（白）
  const muzzle = box(0.4, 0.4, 0.82, w);
  muzzle.position.set(1.0, 1.35, 0);
  farmerGroup.add(muzzle);

  // 4: 鼻先
  const nose = box(0.2, 0.2, 0.2, 0x333333);
  nose.position.set(1.25, 1.45, 0);
  farmerGroup.add(nose);

  // 5 (左前脚), 6 (右前脚) - アニメーション対象 (白)
  const legFL = box(0.3, 0.6, 0.3, w);
  legFL.position.set(0.45, 0.3, -0.25);
  legFL.castShadow = true;
  farmerGroup.add(legFL);

  const legFR = box(0.3, 0.6, 0.3, w);
  legFR.position.set(0.45, 0.3, 0.25);
  legFR.castShadow = true;
  farmerGroup.add(legFR);

  // 7 (左後脚), 8 (右後脚) (白)
  const legBL = box(0.3, 0.6, 0.3, w);
  legBL.position.set(-0.45, 0.3, -0.25);
  legBL.castShadow = true;
  farmerGroup.add(legBL);

  const legBR = box(0.3, 0.6, 0.3, w);
  legBR.position.set(-0.45, 0.3, 0.25);
  legBR.castShadow = true;
  farmerGroup.add(legBR);

  // 9 耳L
  const earL = box(0.2, 0.4, 0.2, c);
  earL.position.set(0.6, 2.0, -0.3);
  farmerGroup.add(earL);

  // 10 耳R
  const earR = box(0.2, 0.4, 0.2, c);
  earR.position.set(0.6, 2.0, 0.3);
  farmerGroup.add(earR);

  // 11 しっぽ
  const tail = box(0.3, 0.4, 0.3, c);
  tail.position.set(-0.7, 1.3, 0);
  tail.rotation.z = Math.PI / 4;
  farmerGroup.add(tail);
}

function buildCatModel() {
  const cw = 0xffffff;
  const cb = 0x333333;
  const co = 0xe08020;

  // 1: 体
  const body = box(1.2, 0.6, 0.6, cw);
  body.position.set(0, 0.8, 0);
  body.castShadow = true;
  farmerGroup.add(body);

  // 2: ブチ1
  const patch1 = box(0.4, 0.62, 0.62, cb);
  patch1.position.set(-0.3, 0.8, 0);
  farmerGroup.add(patch1);
  
  // 3: ブチ2
  const patch2 = box(0.3, 0.62, 0.62, co);
  patch2.position.set(0.3, 0.8, 0);
  farmerGroup.add(patch2);

  // 4: 頭
  const head = box(0.7, 0.7, 0.7, cw);
  head.position.set(0.6, 1.3, 0);
  head.castShadow = true;
  farmerGroup.add(head);

  // 5 (左前脚), 6 (右前脚) - アニメーション対象
  const legFL = box(0.2, 0.5, 0.2, cw);
  legFL.position.set(0.3, 0.25, -0.15);
  legFL.castShadow = true;
  farmerGroup.add(legFL);

  const legFR = box(0.2, 0.5, 0.2, cw);
  legFR.position.set(0.3, 0.25, 0.15);
  legFR.castShadow = true;
  farmerGroup.add(legFR);

  // 頭のブチ (重なりによるちらつきを避けるため少し高く)
  const headPatch = box(0.72, 0.32, 0.72, co);
  headPatch.position.set(0.6, 1.51, 0);
  farmerGroup.add(headPatch);

  // 耳L
  const earL = box(0.2, 0.3, 0.2, cb);
  earL.position.set(0.48, 1.7, -0.25);
  earL.rotation.z = 0.3;
  farmerGroup.add(earL);
  
  // 耳R
  const earR = box(0.2, 0.3, 0.2, co);
  earR.position.set(0.48, 1.7, 0.25);
  earR.rotation.z = 0.3;
  farmerGroup.add(earR);

  // 後ろ脚
  const legBL = box(0.2, 0.5, 0.2, cw);
  legBL.position.set(-0.3, 0.25, -0.15);
  legBL.castShadow = true;
  farmerGroup.add(legBL);

  const legBR = box(0.2, 0.5, 0.2, cw);
  legBR.position.set(-0.3, 0.25, 0.15);
  legBR.castShadow = true;
  farmerGroup.add(legBR);

  // しっぽ
  const tail = box(0.15, 0.7, 0.15, cb);
  tail.position.set(-0.6, 1.0, 0);
  tail.rotation.z = -0.3;
  farmerGroup.add(tail);
}

function buildSnowmanModel() {
  // 下の球
  const bottom = sphere(0.7, 0xffffff);
  bottom.position.set(0, 0.7, 0);
  bottom.castShadow = true;
  farmerGroup.add(bottom);

  // 中の球
  const mid = sphere(0.5, 0xffffff);
  mid.position.set(0, 1.7, 0);
  mid.castShadow = true;
  farmerGroup.add(mid);

  // 頭の球
  const head = sphere(0.4, 0xffffff);
  head.position.set(0, 2.5, 0);
  head.castShadow = true;
  farmerGroup.add(head);

  // ニンジン鼻
  const nose = cylinder(0.02, 0.08, 0.3, 0xff6600);
  nose.position.set(0, 2.45, 0.45);
  nose.rotation.x = -Math.PI / 2;
  farmerGroup.add(nose);

  // 目（石炭）
  const eyeGeo = new THREE.SphereGeometry(0.06, 4, 4);
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const eL = new THREE.Mesh(eyeGeo, eyeMat);
  eL.position.set(-0.15, 2.6, 0.35);
  farmerGroup.add(eL);
  const eR = new THREE.Mesh(eyeGeo, eyeMat);
  eR.position.set(0.15, 2.6, 0.35);
  farmerGroup.add(eR);

  // ボタン
  for (let i = 0; i < 3; i++) {
    const btn = new THREE.Mesh(eyeGeo, eyeMat);
    btn.position.set(0, 1.4 + i * 0.25, 0.48);
    farmerGroup.add(btn);
  }

  // 帽子
  const brim = cylinder(0.5, 0.5, 0.08, 0x222222);
  brim.position.set(0, 2.85, 0);
  farmerGroup.add(brim);
  const hat = cylinder(0.3, 0.3, 0.4, 0x222222);
  hat.position.set(0, 3.1, 0);
  farmerGroup.add(hat);
}

// ═══════════════════════════════════════════
//  Public Interface
// ═══════════════════════════════════════════

export function updateCharacter(charId) {
  const char = CHARACTER_MASTER[charId];
  if (!char) return;
  if (currentCharId === charId) return;
  currentCharId = charId;
  rebuildFarmerModel(char.cssClass);
}

export function updateField(fieldState) {
  // 収穫直後（isPlanted=false）でもcropGroupは前の状態を維持する
  // → 新しい作物が植えられた時にのみリビルド
  if (!fieldState.isPlanted || !fieldState.cropId) {
    // cropGroup は非表示にしない（前回の作物表示を維持）
    return;
  }

  // リビルドが必要な条件：作物が変わったか、プログレスがリセット(0)された時
  const isNewPlant = fieldState.cropId !== currentCropId || fieldState.progress < currentProgress;

  if (isNewPlant) {
    currentCropId = fieldState.cropId;
    smoothProgress = fieldState.progress; // アニメーションをここから開始
    buildCrop(currentCropId);
  }

  currentProgress = fieldState.progress;
}

let _armResetTimer = null;
export function triggerWorkAnimation() {
  if (!farmerGroup) return;

  // すでに実行中の場合はキャンセルしてニュートラルに戻す
  if (_armResetTimer) {
    clearTimeout(_armResetTimer);
    _armResetTimer = null;
  }

  // 両腕を振り上げる
  const armL = farmerGroup.children[4];
  const armR = farmerGroup.children[5];
  if (!armL || !armR) return;

  armL.rotation.x = -0.7;
  armR.rotation.x = -0.7;

  // 150ms後に戻す
  _armResetTimer = setTimeout(() => {
    // farmerGroupが再構築されていないかチェック
    if (farmerGroup.children[4] === armL && farmerGroup.children[5] === armR) {
      armL.rotation.x = 0;
      armR.rotation.x = 0;
    }
    _armResetTimer = null;
  }, 150);
}

// ═══════════════════════════════════════════
//  3D Clock
// ═══════════════════════════════════════════

function build3DClock() {
  clockCanvas = document.createElement('canvas');
  clockCanvas.width = 1024;
  clockCanvas.height = 256;
  clockCtx = clockCanvas.getContext('2d');

  clockTexture = new THREE.CanvasTexture(clockCanvas);
  clockTexture.minFilter = THREE.LinearFilter;

  const geo = new THREE.PlaneGeometry(24, 6);
  const mat = new THREE.MeshBasicMaterial({
    map: clockTexture,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  clockMesh = new THREE.Mesh(geo, mat);

  clockMesh.position.set(CONFIG.cameraLookAt.x, 5.5, 2);
  clockMesh.lookAt(CONFIG.cameraPos.x, CONFIG.cameraPos.y, CONFIG.cameraPos.z);

  const savedClockMode = localStorage.getItem('idle-farm-clock-visible');
  clockMesh.visible = savedClockMode === 'true';

  scene.add(clockMesh);
  renderClockTexture();
}

function renderClockTexture() {
  if (!clockCtx) return;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');

  clockCtx.clearRect(0, 0, 1024, 256);
  clockCtx.font = "bold 180px 'VT323', 'Courier New', monospace";
  clockCtx.textAlign = 'center';
  clockCtx.textBaseline = 'middle';

  clockCtx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  clockCtx.fillText(`${hh}:${mm}`, 518, 134);

  clockCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  clockCtx.fillText(`${hh}:${mm}`, 512, 128);

  clockTexture.needsUpdate = true;
}

function update3DClock() {
  if (!clockMesh) return;

  const visible = localStorage.getItem('idle-farm-clock-visible') === 'true';
  clockMesh.visible = visible;
  if (!visible) return;

  const now = new Date();
  const currentMinute = now.getHours() * 60 + now.getMinutes();
  if (currentMinute !== lastClockMinute) {
    lastClockMinute = currentMinute;
    renderClockTexture();
  }
}

// ═══════════════════════════════════════════
//  Clouds & 3D Events
// ═══════════════════════════════════════════

function buildClouds() {
  for (let i = 0; i < 6; i++) {
    const cloud = new THREE.Group();

    // ベースとなる平べったい四角
    const baseW = 3 + Math.random() * 2;
    const baseD = 2 + Math.random() * 2;
    const base = cloudBox(baseW, 0.6, baseD, 0xffffff, 0.35);
    cloud.add(base);

    // 上に乗る少し小さな四角
    const puffW = baseW * 0.6;
    const puffD = baseD * 0.6;
    const puff = cloudBox(puffW, 0.8, puffD, 0xffffff, 0.15);
    puff.position.set((Math.random() - 0.5) * 0.5, 0.5, (Math.random() - 0.5) * 0.5);
    cloud.add(puff);

    cloud.position.set(-20 + Math.random() * 40, 5 + Math.random() * 3, -5 + Math.random() * 4);
    cloud.userData = { speed: 0.01 + Math.random() * 0.015 };
    cloudsGroup.add(cloud);
  }
}

export function startEventVisual(event) {
  switch (event.id) {
    case 'rain': spawnWeatherParticles('rain', 0xaaccff, 0.4, 300); break;
    case 'heavy_rain': spawnWeatherParticles('rain', 0x88bbdd, 0.6, 600); break;
    case 'diamond_rain': spawnWeatherParticles('diamond', 0xbbeeff, 0.5, 400); break;
    case 'snow': spawnWeatherParticles('snow', 0xffffff, 0.1, 400); break;
    case 'thunder':
      spawnWeatherParticles('rain', 0x99aabb, 0.5, 500);
      let flashTime = Date.now() + 1000 + Math.random() * 2000;
      activeAnimators.push({
        type: 'thunder',
        update: (dt, t) => {
          if (t > flashTime) {
            triggerThunderFlash();
            flashTime = t + 2000 + Math.random() * 4000;
          }
          return true;
        }
      });
      break;
    case 'typhoon': spawnWeatherParticles('rain', 0x7799bb, 0.8, 800, 0.4); break;
    case 'cumulonimbus':
      const cloud = new THREE.Group();
      const layers = 5;
      for (let i = 0; i < layers; i++) {
        const w = 6 - i * 0.8 + Math.random();
        const d = 5 - i * 0.6 + Math.random();
        const h = 1.2;
        const p = cloudBox(w, h, d, 0xcccccc, 0.5);
        p.position.set((Math.random() - 0.5) * 1.5, i * (h * 0.8), (Math.random() - 0.5) * 1.5);
        p.castShadow = true;
        cloud.add(p);
      }
      cloud.position.set(0, 4, -8);
      weatherGroup.add(cloud);
      break;
    case 'tumbleweed': spawnCrossingObject3D('tumbleweed'); break;
    case 'bird_poop': spawnCrossingObject3D('bird'); break;
    case 'stork': spawnCrossingObject3D('stork'); break;
    case 'santa': spawnCrossingObject3D('santa'); break;
    case 'john': spawnJohnVisit3D(); break;
    case 'dog_visit': spawnStaticAnimal3D('dog_visit'); break;
    case 'cat_visit': spawnStaticAnimal3D('cat_visit'); break;
  }
}

export function stopAllEventVisuals() {
  while (weatherGroup.children.length > 0) {
    const c = weatherGroup.children[0];
    c.removeFromParent();
    if (c.geometry) c.geometry.dispose();
    if (c.material) c.material.dispose();
  }
  for (let i = activeAnimators.length - 1; i >= 0; i--) {
    const anim = activeAnimators[i];
    if (anim.type !== 'crossing' && anim.type !== 'poop') { // remove lightning and weather
      if (anim.mesh) anim.mesh.removeFromParent();
      activeAnimators.splice(i, 1);
    }
  }

  // reset thunder lighting
  scene.children.forEach(c => {
    if (c.isAmbientLight) c.intensity = CONFIG.ambientIntensity;
  });
  updateClearColor();
}

function triggerThunderFlash() {
  const isTransparent = document.body.classList.contains('bg-transparent');
  if (!isTransparent) renderer3d.setClearColor(0xffffff, 1.0);

  scene.children.forEach(c => {
    if (c.isAmbientLight) c.intensity = 2.0;
  });

  setTimeout(() => {
    updateClearColor();
    scene.children.forEach(c => {
      if (c.isAmbientLight) c.intensity = CONFIG.ambientIntensity;
    });
  }, 100);
}

function spawnWeatherParticles(type, colorHex, speed, count, slantX = 0) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = -15 + Math.random() * 30; // x
    pos[i * 3 + 1] = Math.random() * 15;       // y
    pos[i * 3 + 2] = -5 + Math.random() * 15;  // z
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  let mat;
  // OrthographicCamera では PointsMaterial の size はピクセル単位になります。
  if (type === 'snow') {
    mat = new THREE.PointsMaterial({ color: colorHex, size: 5, transparent: true, opacity: 0.8 });
  } else {
    mat = new THREE.PointsMaterial({ color: colorHex, size: type === 'diamond' ? 8 : 4, transparent: true, opacity: 0.6 });
  }

  const points = new THREE.Points(geo, mat);
  weatherGroup.add(points);

  activeAnimators.push({
    type: 'weather',
    mesh: points,
    update: (dt) => {
      const positions = points.geometry.attributes.position.array;
      for (let i = 0; i < count; i++) {
        let x = positions[i * 3];
        let y = positions[i * 3 + 1];

        y -= speed;
        x += slantX;

        if (type === 'snow') {
          x += Math.sin(y * 2) * 0.02; // Wobble
        }

        if (y < -1) y = 15;
        if (x > 15) x = -15;

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
      }
      points.geometry.attributes.position.needsUpdate = true;
      return true; // Keep alive
    }
  });
}

function spawnCrossingObject3D(type) {
  const grp = new THREE.Group();
  let startX = -10, endX = 10;
  let moveY = 5, moveZ = 2;
  let speed = 0.05 + Math.random() * 0.03;
  let rotSpeed = 0;

  if (type === 'tumbleweed') {
    for (let i = 0; i < 3; i++) {
      const b = box(1.6, 1.6, 0.4, 0xedc97f);
      b.rotation.x = i * 1.0;
      b.rotation.y = i * 0.5;
      grp.add(b);
    }
    moveY = 0.5; // ground level (slightly higher due to size)
    moveZ = 2 + Math.random() * 3;
    rotSpeed = 0.1;
    speed = 0.03 + Math.random() * 0.02;
  } else if (type === 'bird') {
    const b1 = box(0.5, 0.3, 0.4, 0xffffff); // body
    const b2 = box(0.2, 0.1, 0.8, 0xffffff); // wings
    grp.add(b1, b2);
    moveY = 6;
  } else if (type === 'stork') {
    const b1 = box(0.8, 0.4, 0.3, 0xffccdd);
    const b2 = box(0.2, 0.1, 1.0, 0xffccdd);
    grp.add(b1, b2);
    moveY = 6;
  } else if (type === 'santa') {
    const body = box(1.2, 0.8, 0.8, 0xdd1111);
    const head = box(0.5, 0.5, 0.5, 0xf5c6a0);
    head.position.set(0.6, 0.6, 0);
    grp.add(body, head);
    moveY = 8;
  } else if (type === 'john') {
    const body = box(0.6, 1.2, 0.4, 0x4444ff);
    const head = box(0.5, 0.5, 0.5, 0xf5c6a0);
    head.position.set(0, 0.8, 0);
    grp.add(body, head);
    moveY = 0.5;
    rotSpeed = 0;
  }

  grp.position.set(startX, moveY, moveZ);
  scene.add(grp);

  activeAnimators.push({
    type: 'crossing',
    mesh: grp,
    update: (dt) => {
      grp.position.x += speed;
      grp.rotation.z -= rotSpeed;
      if (type === 'john' || type === 'tumbleweed') {
        grp.position.y = moveY + Math.sin(grp.position.x * 5) * 0.2; // walking bounce
      } else if (type === 'bird' || type === 'stork') {
        grp.children[1].rotation.x = Math.sin(grp.position.x * 10) * 0.5; // flap wings
      }

      if (grp.position.x > endX) {
        return false; // remove
      }
      return true;
    }
  });

  // For bird, dropping a poop midway
  if (type === 'bird') {
    setTimeout(() => {
      if (grp.parent) {
        const poop = box(0.2, 0.2, 0.2, 0xffffff);
        poop.position.copy(grp.position);
        scene.add(poop);
        activeAnimators.push({
          type: 'poop',
          mesh: poop,
          update: (dt) => {
            poop.position.y -= 0.1;
            if (poop.position.y < 0) {
              return false;
            }
            return true;
          }
        });
      }
    }, 1500 + Math.random() * 1000);
  }
}

function spawnStaticAnimal3D(type) {
  const grp = new THREE.Group();
  
  if (type === 'dog_visit') {
    // 柴犬カラー
    const c = 0xd89f50; // 薄茶色
    const w = 0xffffff; // 白
    
    // 体（上半分茶色、下半分白）
    const bodyTop = box(1.4, 0.4, 0.8, c);
    bodyTop.position.set(0, 1.0, 0);
    const bodyBot = box(1.4, 0.3, 0.8, w);
    bodyBot.position.set(0, 0.65, 0);
    
    // 頭 (茶色)
    const head = box(0.8, 0.8, 0.8, c);
    head.position.set(0.8, 1.4, 0);
    
    // マズル・頬などの白い部分
    const muzzle = box(0.4, 0.4, 0.82, w);
    muzzle.position.set(1.0, 1.25, 0);
    
    // 耳 (茶色)
    const earL = box(0.2, 0.4, 0.2, c);
    earL.position.set(0.6, 1.9, -0.3);
    const earR = box(0.2, 0.4, 0.2, c);
    earR.position.set(0.6, 1.9, 0.3);
    
    // 鼻先
    const nose = box(0.2, 0.2, 0.2, 0x222222);
    nose.position.set(1.25, 1.3, 0);
    
    // 脚 (白)
    [[-0.5, -0.25], [0.5, -0.25], [-0.5, 0.25], [0.5, 0.25]].forEach(([x, z]) => {
      const leg = box(0.3, 0.6, 0.3, w);
      leg.position.set(x, 0.3, z);
      grp.add(leg);
    });
    
    // くるんと巻いたしっぽ (茶色)
    const tail = box(0.3, 0.4, 0.3, c);
    tail.position.set(-0.7, 1.3, 0);
    tail.rotation.z = Math.PI / 4;

    grp.add(bodyTop, bodyBot, head, muzzle, earL, earR, nose, tail);
  } else {
    // 三毛猫カラー
    const cw = 0xffffff; // 白
    const cb = 0x333333; // 黒
    const co = 0xe08020; // オレンジ

    // 体 (白ベース)
    const body = box(1.2, 0.6, 0.6, cw);
    body.position.set(0, 0.6, 0);
    // 体のブチ模様
    const patch1 = box(0.4, 0.62, 0.62, cb);
    patch1.position.set(-0.3, 0.6, 0);
    const patch2 = box(0.3, 0.62, 0.62, co);
    patch2.position.set(0.3, 0.6, 0);
    
    // 頭 (白ベース)
    const head = box(0.7, 0.7, 0.7, cw);
    head.position.set(0.7, 1.2, 0);
    // 頭のブチ (重なりによるちらつきを避けるため少し高く)
    const headPatch = box(0.72, 0.32, 0.72, co);
    headPatch.position.set(0.7, 1.41, 0);

    // 耳 (左右で色を変える)
    const earL = box(0.2, 0.3, 0.2, cb);
    earL.position.set(0.6, 1.6, -0.25);
    earL.rotation.z = 0.3;
    const earR = box(0.2, 0.3, 0.2, co);
    earR.position.set(0.6, 1.6, 0.25);
    earR.rotation.z = 0.3;
    
    // 脚 (白)
    [[-0.4, -0.15], [0.4, -0.15], [-0.4, 0.15], [0.4, 0.15]].forEach(([x, z]) => {
      const leg = box(0.2, 0.4, 0.2, cw);
      leg.position.set(x, 0.2, z);
      grp.add(leg);
    });
    // しっぽ (黒寄り)
    const tail = box(0.15, 0.7, 0.15, cb);
    tail.position.set(-0.6, 0.8, 0);
    tail.rotation.z = -0.3;
    
    grp.add(body, patch1, patch2, head, headPatch, earL, earR, tail);
  }

  // 影の設定
  grp.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
    }
  });

  // 猫の場合：元の位置に留まらせてゆっくり息をさせる
  if (type === 'cat_visit') {
    grp.position.set(-4 + Math.random(), 0, 4 + Math.random() * 2);
    grp.rotation.y = Math.PI / 4 + Math.random() * 0.5;
    weatherGroup.add(grp);

    activeAnimators.push({
      type: 'animal_visit',
      mesh: grp,
      update: (dt, t) => {
        if (!grp.parent) return false;
        // 猫：歩き回らず、その場でゆっくりと呼吸するだけ
        grp.position.y = Math.sin(t * 0.002) * 0.04; 
        return true;
      }
    });
    return; // 猫の処理はここで終了
  }

  // 犬の場合：初期配置
  grp.position.set(-5 + Math.random() * 2, 0, 4 + Math.random() * 2);
  grp.rotation.y = Math.PI / 4 + Math.random() * 0.5;
  weatherGroup.add(grp);
  
  // 犬がうろうろ歩き回るアニメーションを追加
  let targetX = grp.position.x;
  let targetZ = grp.position.z;
  let state = 'idle'; 
  let stateTimer = Date.now() + 1000;
  const walkSpeed = 0.04; 
  
  activeAnimators.push({
    type: 'animal_visit',
    mesh: grp,
    update: (dt, t) => {
      // イベント終了等でmeshが削除された場合はアニメーターも終了
      if (!grp.parent) return false;

      if (t > stateTimer) {
        if (state === 'idle') {
          // 歩き始める
          state = 'walk';
          
          // 新しい目標地点を決定（畑の領域 x: -3.5〜3.5, z: -0.5〜3.5 を確実に避ける）
          const zone = Math.floor(Math.random() * 3);
          if (zone === 0) {
            // 畑の左側の空き地
            targetX = -7 + Math.random() * 3;
            targetZ = Math.random() * 6;
          } else if (zone === 1) {
            // 畑の右側の空き地
            targetX = 4 + Math.random() * 3;
            targetZ = Math.random() * 6;
          } else {
            // 畑より手前（カメラ側）の空き地
            targetX = -6 + Math.random() * 12;
            targetZ = 4.5 + Math.random() * 3;
          }
          
          // 目標地点の方向を向く (Xが横、Zが奥方向)
          const dx = targetX - grp.position.x;
          const dz = targetZ - grp.position.z;
          grp.rotation.y = Math.atan2(dx, dz);
          
          // 次のステート切り替えまでの時間
          stateTimer = t + 1000 + Math.random() * 3000;
        } else {
          // 立ち止まる
          state = 'idle';
          stateTimer = t + 1000 + Math.random() * 2000;
        }
      }
      
      if (state === 'walk') {
        const dx = targetX - grp.position.x;
        const dz = targetZ - grp.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist > 0.1) {
          // 目標へ移動
          grp.position.x += (dx / dist) * walkSpeed;
          grp.position.z += (dz / dist) * walkSpeed;
          // ピョコピョコ跳ねる歩行感
          grp.position.y = Math.abs(Math.sin(t * 0.015)) * 0.3;
        } else {
          state = 'idle';
          stateTimer = t + 500 + Math.random() * 2000;
        }
      } else {
        // 待機中は高さをゼロに
        grp.position.y = 0;
      }
      
      return true;
    }
  });
}


function spawnJohnVisit3D() {
  const grp = new THREE.Group();
  
  // ジョンのモデル構築（プレイヤーと同じようなサイズ感で）
  const body = box(1.0, 1.4, 0.6, 0xffa07a);
  body.position.y = 1.0; 
  body.castShadow = true;
  
  const head = box(0.8, 0.8, 0.8, 0xffdcb4);
  head.position.y = 2.1;
  head.castShadow = true;
  
  const legL = box(0.4, 0.6, 0.4, 0x4444aa);
  legL.position.set(0.25, 0.3, 0);
  legL.castShadow = true;
  
  const legR = box(0.4, 0.6, 0.4, 0x4444aa);
  legR.position.set(-0.25, 0.3, 0);
  legR.castShadow = true;
  
  const armL = box(0.3, 0.8, 0.3, 0xffa07a);
  armL.position.set(0.65, 1.3, 0);
  armL.castShadow = true;

  const armR = box(0.3, 0.8, 0.3, 0xffa07a);
  armR.position.set(-0.65, 1.3, 0);
  armR.castShadow = true;
  
  grp.add(body, head, legL, legR, armL, armR);
  
  // 初期位置 (右奥辺りから来る)
  grp.position.set(10, 0, 5);
  weatherGroup.add(grp);
  
  let state = 'enter';
  let targetX = 3 + Math.random() * 2; // 畑の右側付近
  let targetZ = 2 + Math.random() * 2;
  
  // 指定座標の方を向かせる関数
  const faceTarget = (tx, tz) => {
    const dx = tx - grp.position.x;
    const dz = tz - grp.position.z;
    grp.rotation.y = Math.atan2(dx, dz);
  };
  faceTarget(targetX, targetZ);
  
  const speed = 0.04;
  const startTime = Date.now();

  activeAnimators.push({
    type: 'animal_visit', // animal_visitと同じ扱いでイベント終了時に消える
    mesh: grp,
    update: (dt, t) => {
      if (!grp.parent) return false;
      
      const elapsed = Date.now() - startTime;
      
      if (state === 'enter') {
        const dx = targetX - grp.position.x;
        const dz = targetZ - grp.position.z;
        const dist = Math.sqrt(dx*dx + dz*dz);
        
        if (dist > 0.1) {
          grp.position.x += (dx/dist) * speed;
          grp.position.z += (dz/dist) * speed;
          // 歩行モーション（腕と脚も少し振る）
          grp.position.y = Math.abs(Math.sin(elapsed * 0.01)) * 0.2;
          legL.rotation.x = Math.sin(elapsed * 0.01) * 0.4;
          legR.rotation.x = -Math.sin(elapsed * 0.01) * 0.4;
          armL.rotation.x = -Math.sin(elapsed * 0.01) * 0.4;
          armR.rotation.x = Math.sin(elapsed * 0.01) * 0.4;
        } else {
          // 到着したら畑（中央）を見る
          state = 'watch';
          grp.position.y = 0;
          legL.rotation.x = 0; legR.rotation.x = 0;
          armL.rotation.x = 0; armR.rotation.x = 0;
          faceTarget(0, 0);
        }
      } else if (state === 'watch') {
        // 10秒(10000ms)経過したら帰る準備
        if (elapsed > 10000) {
          state = 'exit';
          targetX = 12; // 画面外へ
          targetZ = 6;
          faceTarget(targetX, targetZ);
        } else {
          // 見ている間、時々頷くような動き
          head.rotation.x = Math.sin(elapsed * 0.003) * 0.1;
        }
      } else if (state === 'exit') {
        head.rotation.x = 0;
        const dx = targetX - grp.position.x;
        const dz = targetZ - grp.position.z;
        const dist = Math.sqrt(dx*dx + dz*dz);
        
        if (dist > 0.1) {
          grp.position.x += (dx/dist) * speed;
          grp.position.z += (dz/dist) * speed;
          grp.position.y = Math.abs(Math.sin(elapsed * 0.01)) * 0.2;
          legL.rotation.x = Math.sin(elapsed * 0.01) * 0.4;
          legR.rotation.x = -Math.sin(elapsed * 0.01) * 0.4;
          armL.rotation.x = -Math.sin(elapsed * 0.01) * 0.4;
          armR.rotation.x = Math.sin(elapsed * 0.01) * 0.4;
        } else {
          // 画面外に出たら消す
          grp.removeFromParent();
          return false;
        }
      }
      return true;
    }
  });
}

export function showHarvestParticles(cropId) {
  if (!scene) return;
  const color = CROP_HEX[cropId] || 0xffd700;

  for (let i = 0; i < 10; i++) {
    const size = 0.12 + Math.random() * 0.12;
    const particle = box(size, size, size, color);
    particle.position.set(
      (Math.random() - 0.5) * 2.5,
      1.0 + Math.random() * 1.5,
      0.5 + (Math.random() - 0.5) * 1
    );
    scene.add(particle);

    const vy = 2 + Math.random() * 3;
    const vx = (Math.random() - 0.5) * 4;
    const start = Date.now();

    (function tick() {
      const t = (Date.now() - start) / 1000;
      if (t > 0.7) {
        scene.remove(particle);
        particle.geometry.dispose();
        particle.material.dispose();
        return;
      }
      particle.position.x += vx * 0.016;
      particle.position.y += (vy - t * 9) * 0.016;
      particle.material.opacity = 1 - t / 0.7;
      particle.material.transparent = true;
      requestAnimationFrame(tick);
    })();
  }
}

// 共通モジュールから re-export
export { updateHUD, showHarvestEffect, showLevelUpEffect };
