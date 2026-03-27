// renderer-3d.js 窶・Three.js 繝懊け繧ｻ繝ｫ 2.5D 繝ｬ繝ｳ繝繝ｩ繝ｼ
// 讓ｪ・医ｄ繧・万繧∽ｸ奇ｼ峨°繧峨・繝薙Η繝ｼ縲∽ｽ懃黄/繧ｭ繝｣繝ｩ蛟句挨繝｢繝・Ν

import * as THREE from 'three';
import { CROP_MASTER, CHARACTER_MASTER } from './master-data.js';
import { initCommonDOM, updateHUD, showHarvestEffect, showLevelUpEffect, getCropColor } from './renderer-common.js';

// 笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊・//  隱ｿ謨ｴ逕ｨ繝代Λ繝｡繝ｼ繧ｿ・医％縺薙ｒ邱ｨ髮・＠縺ｦ縺上□縺輔＞・・// 笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊・const CONFIG = {
  // 笏笏 繧ｫ繝｡繝ｩ 笏笏
  frustum: 4,                      // 隕夜㍽縺ｮ蠎・＆・亥､ｧ縺阪＞=蠑輔″縲∝ｰ上＆縺・蟇・ｊ・・  cameraPos: { x: -0.8, y: 12, z: 30 },  // 繧ｫ繝｡繝ｩ菴咲ｽｮ
  cameraLookAt: { x: -0.8, y: 2.5, z: 0 },    // 繧ｫ繝｡繝ｩ縺ｮ豕ｨ隕也せ

  // 笏笏 蝨ｰ髱｢ 笏笏
  groundX: [-10, 10],     // X譁ｹ蜷代・遽・峇 [min, max]
  groundZ: [-5, 6],     // Z譁ｹ蜷代・遽・峇 [min, max]・域焔蜑阪′繝励Λ繧ｹ・・  groundY: -0.25,       // 蝨ｰ髱｢繝悶Ο繝・け縺ｮ鬮倥＆菴咲ｽｮ
  groundHeight: 0.5,    // 蝨ｰ髱｢繝悶Ο繝・け縺ｮ蜴壹∩
  groundEdgeZ: 6,       // 謇句燕繧ｨ繝・ず繝悶Ο繝・け縺ｮZ菴咲ｽｮ
  groundEdgeLayers: 2,  // 繧ｨ繝・ず縺ｮ螻､謨ｰ

  // 笏笏 逡・笏笏
  fieldX: [-2, 2],      // 逡代・X遽・峇 [min, max]
  fieldZ: [0, 1],       // 逡代・Z遽・峇・郁｡梧焚・・  fieldOffsetZ: 0.5,    // 逡代・Z譁ｹ蜷代が繝輔そ繝・ヨ
  fieldY: 0.02,         // 逡代・鬮倥＆菴咲ｽｮ

  // 笏笏 謾ｯ譟ｱ 笏笏
  poleX: 1.2,           // 謾ｯ譟ｱ縺ｮX菴咲ｽｮ・亥ｷｦ縺ｯ-poleX縲∝承縺ｯ+poleX・・  poleZ: 1.0,           // 謾ｯ譟ｱ縺ｮZ菴咲ｽｮ
  poleHeight: 2.5,      // 謾ｯ譟ｱ縺ｮ鬮倥＆
  barY: 2.5,            // 讓ｪ譽偵・鬮倥＆

  // 笏笏 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ 笏笏
  farmerPos: { x: -3.5, y: 0, z: 1.0 },  // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｮ菴咲ｽｮ
  farmerRotY: Math.PI / 4,               // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｮY霆ｸ蝗櫁ｻ｢・育舞縺ｮ譁ｹ繧貞髄縺擾ｼ・
  // 笏笏 繝ｩ繧､繝・ぅ繝ｳ繧ｰ 笏笏
  ambientIntensity: 0.95,
  dirLightIntensity: 1.0,
  dirLightPos: { x: 3, y: 8, z: 10 },
};

// 笏笏笏 State 笏笏笏
let scene, camera, renderer3d, animFrameId;
let groundGroup, fieldGroup, cropGroup, farmerGroup;
let weatherGroup, cloudsGroup;
const activeAnimators = [];
export let currentCropId = null;
export let currentProgress = 0;
let smoothProgress = 0; // 繧ｹ繝繝ｼ繧ｺ縺ｪ謌宣聞繧｢繝九Γ繝ｼ繧ｷ繝ｧ繝ｳ逕ｨ
let currentCharId = null;

// 笏笏 繧ｺ繝ｼ繝蛻ｶ蠕｡ 笏笏
let currentFrustum = CONFIG.frustum;
let currentLookAtY = CONFIG.cameraLookAt.y;

// 笏笏 3D譎りｨ・笏笏
let clockMesh = null;
let clockCanvas = null;
let clockCtx = null;
let clockTexture = null;
let lastClockMinute = -1;

// 笏笏笏 Constants 笏笏笏
const V = 1;  // voxel unit
const COLORS = {
  ground: 0x5a9e3c,
  groundDark: 0x4a8e2c,
  soil: 0x6b4226,
  soilDark: 0x5a3216,
  wood: 0x8B6914,
  sky: 0x87CEEB,
};

// 笏笏笏 Crop colors 笏笏笏
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

// 笏笏笏 Character colors 笏笏笏
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

// 笏 Helpers 笏
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

// 笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊・//  Init
// 笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊・
export function initRenderer() {
  initCommonDOM();

  const stage = document.getElementById('stage');

  // 2D隕∫ｴ繧帝撼陦ｨ遉ｺ
  const elements2D = stage.querySelectorAll('.stage__sky, .stage__ground, .farmer, .field');
  elements2D.forEach(el => el.style.display = 'none');

  // HTML譎りｨ医ｒ髱櫁｡ｨ遉ｺ・・D譎りｨ医′莉｣譖ｿ・・  const htmlClock = document.getElementById('sky-clock');
  if (htmlClock) htmlClock.style.display = 'none';

  scene = new THREE.Scene();

  // 繧ｫ繝｡繝ｩ・・ONFIG 縺ｧ隱ｿ謨ｴ・・  const aspect = stage.clientWidth / stage.clientHeight;
  const f = CONFIG.frustum;
  camera = new THREE.OrthographicCamera(
    -f * aspect, f * aspect,
    f, -f,
    0.1, 100
  );
  camera.position.set(CONFIG.cameraPos.x, CONFIG.cameraPos.y, CONFIG.cameraPos.z);
  camera.lookAt(CONFIG.cameraLookAt.x, CONFIG.cameraLookAt.y, CONFIG.cameraLookAt.z);

  // 繝ｬ繝ｳ繝繝ｩ繝ｼ
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

  // 繝ｩ繧､繝・ぅ繝ｳ繧ｰ・域ｸｩ縺九∩縺ｮ縺ゅｋ霎ｲ蝣ｴ縺ｮ蜊亥ｾ梧─・・  const ambient = new THREE.AmbientLight(0xfff5e0, CONFIG.ambientIntensity);
  scene.add(ambient);

  // 繝倥Α繧ｹ繝輔ぅ繧｢繝ｩ繧､繝茨ｼ育ｩｺ=豺｡縺・ｰｴ濶ｲ / 蝨ｰ髱｢=闕芽牡・峨〒閾ｪ辟ｶ縺ｪ髯ｰ蠖ｱ
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

  // 繧ｷ繝ｼ繝ｳ讒狗ｯ・  buildGround();
  buildField();
  buildFarmer();

  // 螟ｩ豌励げ繝ｫ繝ｼ繝・  weatherGroup = new THREE.Group();
  scene.add(weatherGroup);

  cloudsGroup = new THREE.Group();
  scene.add(cloudsGroup);
  buildClouds();
  build3DClock();

  animate();

  const observer = new MutationObserver(() => updateClearColor());
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', onResize);

  // 繝槭え繧ｹ繝帙う繝ｼ繝ｫ繧ｺ繝ｼ繝
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

  // 菴懃黄繧ｹ繝繝ｼ繧ｺ謌宣聞・・昭繧後い繝九Γ繝ｼ繧ｷ繝ｧ繝ｳ
  if (cropGroup && cropGroup.visible && cropGroup.userData.fruits) {
    // 螳滄圀縺ｮ騾ｲ謐励↓蜷代￠縺ｦ繧ｹ繝繝ｼ繧ｺ縺ｫ霑ｽ蠕難ｼ・SS transition: 0.4s 縺ｮ繧医≧縺ｪ蜍輔″・・    smoothProgress += (currentProgress - smoothProgress) * 0.15;

    cropGroup.userData.fruits.forEach(fruitGroup => {
      const appearAt = fruitGroup.userData.appearAt;
      // appearAt縲懊・遽・峇縺ｧ繧ｹ繧ｱ繝ｼ繝ｫ0竊・縺ｸ
      const scaleTarget = Math.max(0, Math.min(1, (smoothProgress - appearAt) * 3.3));

      // 繝舌ロ縺ｮ繧医≧縺ｪ蟆代＠蠑ｾ繧繧､繝ｼ繧ｸ繝ｳ繧ｰ・医が繝励す繝ｧ繝ｳ縺縺檎ｷ壼ｽ｢縺ｧ繧ょ香蛻・″繧後＞・・      fruitGroup.scale.set(scaleTarget, scaleTarget, scaleTarget);

      // 謌千・譎ゅ・謠ｺ繧・      if (currentProgress >= 1.0) {
        fruitGroup.position.y = fruitGroup.userData.baseY + Math.sin(t * 0.005) * 0.12;
      } else {
        fruitGroup.position.y = fruitGroup.userData.baseY;
      }
    });
  }

  // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｮ蜻ｼ蜷ｸ繧｢繝九Γ繝ｼ繧ｷ繝ｧ繝ｳ
  if (farmerGroup) {
    farmerGroup.userData.breathOffset = Math.sin(t * 0.002) * 0.04;
    farmerGroup.position.y = farmerGroup.userData.breathOffset;
  }

  // 髮ｲ縺ｮ繧｢繝九Γ繝ｼ繧ｷ繝ｧ繝ｳ
  if (cloudsGroup) {
    cloudsGroup.children.forEach(cloud => {
      cloud.position.x += cloud.userData.speed;
      if (cloud.position.x > 20) {
        cloud.position.x = -20;
        cloud.position.y = 5 + Math.random() * 3;
      }
    });
  }

  // 3D譎りｨ医・譖ｴ譁ｰ
  update3DClock();

  // 繧｢繧ｯ繝・ぅ繝悶い繝九Γ繝ｼ繧ｿ繝ｼ縺ｮ譖ｴ譁ｰ
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

// 笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊・//  Ground
// 笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊・
function buildGround() {
  groundGroup = new THREE.Group();

  // 蝨ｰ髱｢繝悶Ο繝・け・・ONFIG 縺ｧ遽・峇繧定ｪｿ謨ｴ・・  for (let x = CONFIG.groundX[0]; x <= CONFIG.groundX[1]; x++) {
    for (let z = CONFIG.groundZ[0]; z <= CONFIG.groundZ[1]; z++) {
      const isDark = (x + z) % 2 === 0;
      const block = box(V, V * CONFIG.groundHeight, V, isDark ? COLORS.groundDark : COLORS.ground);
      block.position.set(x * V, CONFIG.groundY, z * V);
      block.receiveShadow = true;
      groundGroup.add(block);
    }
  }

  // 蝨ｰ髱｢縺ｮ蛛ｴ髱｢・域焔蜑阪お繝・ず・・  for (let x = CONFIG.groundX[0]; x <= CONFIG.groundX[1]; x++) {
    for (let y = 0; y < CONFIG.groundEdgeLayers; y++) {
      const sideBlock = box(V, V, V, y === 0 ? 0x3a7020 : 0x2a5a18);
      sideBlock.position.set(x * V, -0.5 - y, CONFIG.groundEdgeZ);
      groundGroup.add(sideBlock);
    }
  }

  scene.add(groundGroup);
}

// 笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊・//  Field
// 笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊・
function buildField() {
  fieldGroup = new THREE.Group();

  // 逡代・蝨滂ｼ・ONFIG 縺ｧ遽・峇繧定ｪｿ謨ｴ・・  for (let x = CONFIG.fieldX[0]; x <= CONFIG.fieldX[1]; x++) {
    for (let z = CONFIG.fieldZ[0]; z <= CONFIG.fieldZ[1]; z++) {
      const isDark = (x + z) % 2 === 0;
      const soil = box(V, V * 0.55, V, isDark ? COLORS.soilDark : COLORS.soil);
      soil.position.set(x * V, CONFIG.fieldY, z * V + CONFIG.fieldOffsetZ);
      soil.receiveShadow = true;
      fieldGroup.add(soil);
    }
  }

  // 謾ｯ譟ｱ・・ONFIG 縺ｧ菴咲ｽｮ繧定ｪｿ謨ｴ・・  const poleL = box(0.12, CONFIG.poleHeight, 0.12, COLORS.wood);
  poleL.position.set(-CONFIG.poleX, CONFIG.poleHeight / 2, CONFIG.poleZ);
  poleL.castShadow = true;
  fieldGroup.add(poleL);

  const poleR = box(0.12, CONFIG.poleHeight, 0.12, COLORS.wood);
  poleR.position.set(CONFIG.poleX, CONFIG.poleHeight / 2, CONFIG.poleZ);
  poleR.castShadow = true;
  fieldGroup.add(poleR);

  // 讓ｪ譽・  const barWidth = (CONFIG.poleX * 2) + 0.15;
  const bar = box(barWidth, 0.1, 0.1, COLORS.wood);
  bar.position.set(0, CONFIG.barY, CONFIG.poleZ);
  bar.castShadow = true;
  fieldGroup.add(bar);

  scene.add(fieldGroup);

  cropGroup = new THREE.Group();
  cropGroup.visible = false;
  scene.add(cropGroup);
}

// 笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊・//  Crops 窶・繝・Ν・句ｮ溘・邨ｱ荳繧ｹ繧ｿ繧､繝ｫ・・D繝薙Η繝ｼ縺ｫ蜷医ｏ縺帙◆陦ｨ迴ｾ・・//  謾ｯ譟ｱ縺ｮ髢薙ｒS蟄励き繝ｼ繝悶・繝・Ν縺悟ｷｻ縺阪∝ｮ溘′閹ｨ繧峨・
// 笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊・
// 繝・Ν縺ｮ邨瑚ｷｯ轤ｹ・・蟄励き繝ｼ繝厄ｼ俄・繝ｯ繝ｼ繝ｫ繝牙ｺｧ讓吶〒逶ｴ謗･謖・ｮ・function getVinePoints() {
  const pX = CONFIG.poleX;
  const fz = CONFIG.poleZ;      // 謾ｯ譟ｱ縺ｮZ菴咲ｽｮ・茨ｼ晉舞縺ｮZ・・  const baseY = 0.35;
  const topY = CONFIG.barY - 0.1;
  const h = topY - baseY;

  // S蟄励き繝ｼ繝厄ｼ亥ｷｦ縺ｮ謾ｯ譟ｱ譬ｹ蜈・°繧牙承荳岩・蟾ｦ荳ｭ竊貞承荳翫∈・・  return [
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

// 螳溘・蜃ｺ迴ｾ菴咲ｽｮ・医ヤ繝ｫ荳翫・4邂・園・・const FRUIT_POSITIONS = [
  { vineIdx: 1, appearAt: 0.1 },
  { vineIdx: 3, appearAt: 0.3 },
  { vineIdx: 6, appearAt: 0.5 },
  { vineIdx: 9, appearAt: 0.7 },
];

/**
 * 菴懃黄蝗ｺ譛峨・3D蠖｢迥ｶ・亥ｮ溘・驛ｨ蛻・ｼ峨ｒ逕滓・縺吶ｋ
 */
function createFruitMesh(cropId, r, color) {
  const grp = new THREE.Group();
  let core, cap;

  switch (cropId) {
    case 'potato':
      // 縺倥ｃ縺後＞繧ゑｼ医＞縺ｳ縺､縺ｪ蝪奇ｼ・      core = box(r * 1.6, r * 1.2, r * 1.4, color);
      grp.add(core); // 繝倥ち縺ｪ縺・      break;

    case 'carrot':
      // 縺ｫ繧薙§繧難ｼ磯・・骭宣｢ｨ繝ｻ荳句髄縺阪す繝ｪ繝ｳ繝繝ｼ・・      core = cylinder(r * 0.8, r * 0.2, r * 2.5, color);
      core.position.y = -r * 0.5; // 驥榊ｿ・ｒ荳九↓
      cap = box(r * 0.6, 0.1, r * 0.6, 0x2d8040); // 闡・      cap.position.set(0, r * 0.8, 0);
      grp.add(core, cap);
      break;

    case 'strawberry':
      // 縺・■縺費ｼ井ｸ句髄縺阪・蜀・倹縺ｫ霑代＞・・      core = cylinder(r, r * 0.2, r * 1.8, color);
      core.position.y = -r * 0.2;
      cap = box(r * 0.8, 0.08, r * 0.8, 0x2d8040);
      cap.position.set(0, r * 0.7, 0);
      grp.add(core, cap);
      break;

    case 'corn':
      // 縺ｨ縺・ｂ繧阪％縺暦ｼ育ｸｦ髟ｷ繧ｷ繝ｪ繝ｳ繝繝ｼ・狗ｷ代・逧ｮ・・      core = cylinder(r * 0.6, r * 0.6, r * 2.2, color);
      const husk = box(r * 0.8, r * 1.5, r * 0.8, 0x5a9e3c);
      husk.position.y = -r * 0.3;
      cap = box(r * 0.3, 0.2, r * 0.3, 0x2d6030);
      cap.position.set(0, r * 1.1, 0);
      grp.add(core, husk, cap);
      break;

    case 'pumpkin':
      // 縺九⊂縺｡繧・ｼ亥ｹｳ縺溘＞逅・ｼ・      core = sphere(r, color);
      core.scale.set(1.4, 0.8, 1.4);
      cap = box(r * 0.3, 0.15, r * 0.3, 0x2d6030); // 螟ｪ繧√・繝倥ち
      cap.position.set(0, r * 0.8, 0);
      grp.add(core, cap);
      break;

    case 'watermelon':
      // 繧ｹ繧､繧ｫ・亥ｰ代＠讓ｪ髟ｷ・・      core = sphere(r, color);
      core.scale.set(1.1, 1.0, 1.1);
      cap = box(r * 0.4, 0.08, r * 0.4, 0x2d6030);
      cap.position.set(0, r + 0.02, 0);
      grp.add(core, cap);
      break;

    case 'tumbleweed':
      // 繧ｿ繝ｳ繝悶Ν繧ｦ繧｣繝ｼ繝会ｼ亥､ｧ縺阪ａ縺ｧ譏弱ｋ縺擾ｼ・      core = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const b = box(r * 2.5, r * 2.5, r * 0.6, color);
        b.rotation.x = i * 1.0;
        b.rotation.y = i * 0.5;
        core.add(b);
      }
      grp.add(core);
      break;

    case 'christmas_tree':
      // 繝・Μ繝ｼ・亥・骭舌・荳雁髄縺阪す繝ｪ繝ｳ繝繝ｼ・・      core = cylinder(0.01, r * 1.2, r * 2.5, color);
      core.position.y = r * 0.2;
      const trunk = box(r * 0.4, r * 0.8, r * 0.4, 0x5a3216);
      trunk.position.y = -r * 1.0;
      grp.add(trunk, core);
      break;

    case 'tomato':
    case 'golden_apple':
    default:
      // 繝・ヵ繧ｩ繝ｫ繝茨ｼ育帥 + 繝倥ち・・      core = sphere(r, color);
      cap = box(r * 0.5, 0.08, r * 0.5, 0x2d6030);
      cap.position.set(0, r + 0.02, 0);
      grp.add(core, cap);
      break;
  }

  // 蟄占ｦ∫ｴ縺吶∋縺ｦ縺ｫ繧ｷ繝｣繝峨え繧ｭ繝｣繧ｹ繝医ｒ險ｭ螳・  grp.traverse(child => {
    if (child.isMesh) child.castShadow = true;
  });

  return grp;
}

function buildCrop(cropId) {
  // 譌｢蟄倥・菴懃黄繧貞炎髯､
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

  // 笏笏 繝・Ν・域怙蛻昴°繧牙ｮ悟・陦ｨ遉ｺ縲・D縺ｮSVG縺ｨ蜷後§謖吝虚・俄楳笏
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

  // 笏笏 闡峨▲縺ｱ・郁撃繧峨○繧具ｼ・笏笏
  const leafIndices = [1, 2, 3, 4, 5, 6, 7, 8];
  leafIndices.forEach((idx, i) => {
    const pt = vinePoints[idx];
    if (!pt) return;

    // 繝｡繧､繝ｳ縺ｮ闡・    const side1 = (i % 2 === 0) ? 1 : -1;
    const leaf1 = box(0.4, 0.06, 0.3, vineColor);
    leaf1.position.set(pt.x + side1 * 0.25, pt.y + 0.05, pt.z);
    leaf1.rotation.z = side1 * 0.6;
    leaf1.rotation.y = side1 * 0.3;
    leaf1.castShadow = true;
    cropGroup.add(leaf1);

    // 繧ｵ繝悶・闡会ｼ亥渚蟇ｾ蛛ｴ繧・ｰ代＠繧ｺ繝ｬ縺滉ｽ咲ｽｮ縺ｫ逕溘ｄ縺呻ｼ・    const side2 = -side1;
    const leaf2 = box(0.3, 0.06, 0.25, vineColor);
    leaf2.position.set(pt.x + side2 * 0.15, pt.y - 0.05, pt.z + 0.15);
    leaf2.rotation.z = side2 * 0.4;
    leaf2.rotation.y = side2 * 0.6;
    leaf2.castShadow = true;
    cropGroup.add(leaf2);
  });

  // 笏笏 螳滂ｼ医せ繧ｱ繝ｼ繝ｫ0縺ｧ蛻晄悄驟咲ｽｮ縺励∥nimate繝ｫ繝ｼ繝励〒繧｢繝九Γ繝ｼ繧ｷ繝ｧ繝ｳ縺輔○繧具ｼ俄楳笏
  FRUIT_POSITIONS.forEach(fp => {
    const pt = vinePoints[fp.vineIdx];
    if (!pt) return;

    const r = 0.35; // 譛螟ｧ繧ｵ繧､繧ｺ
    const group = new THREE.Group();
    // 闡峨▲縺ｱ縺ｫ髫繧後↑縺・ｈ縺・〇霆ｸ・域焔蜑搾ｼ峨↓蟆代＠繧ｪ繝輔そ繝・ヨ (+0.2)
    group.position.set(pt.x, pt.y - r * 0.3, pt.z + 0.2);

    // 菴懃黄縺斐→縺ｮ迢ｬ閾ｪ蠖｢迥ｶ繝｡繝・す繝･繧堤函謌舌＠縺ｦ霑ｽ蜉
    const fruitMeshGroup = createFruitMesh(cropId, r, fruitColor);
    group.add(fruitMeshGroup);

    group.scale.set(0, 0, 0); // 蛻晄悄迥ｶ諷九・隕九∴縺ｪ縺・    group.userData = { appearAt: fp.appearAt, baseY: pt.y - r * 0.3 };

    cropGroup.add(group);
    cropGroup.userData.fruits.push(group);
  });
}

// 笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊・//  Farmer 窶・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ蛻･繝｢繝・Ν
// 笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊・
function buildFarmer() {
  farmerGroup = new THREE.Group();
  // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴咲ｽｮ繝ｻ蜷代″・・ONFIG 縺ｧ隱ｿ謨ｴ・・  farmerGroup.position.set(CONFIG.farmerPos.x, CONFIG.farmerPos.y, CONFIG.farmerPos.z);
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

  // 蜍慕黄邉ｻ縺ｯ蛻･Builder
  if (cssClass === 'farmer--dog') return buildDogModel();
  if (cssClass === 'farmer--cat') return buildCatModel();
  if (cssClass === 'farmer--snowman') return buildSnowmanModel();

  // 莠ｺ髢鍋ｳｻ
  const colors = CHAR_COLORS[cssClass] || CHAR_COLORS['farmer--man'];
  buildHumanoidModel(colors);
}

function buildHumanoidModel(c) {
  // 鬆ｭ
  const head = box(0.9, 0.9, 0.9, c.skin);
  head.position.set(0, 3.1, 0);
  head.castShadow = true;
  farmerGroup.add(head);

  // 鬮ｪ
  const hair = box(0.95, 0.25, 0.95, c.hair);
  hair.position.set(0, 3.6, 0);
  farmerGroup.add(hair);

  // 逶ｮ
  const eyeGeo = new THREE.BoxGeometry(0.12, 0.12, 0.05);
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const eL = new THREE.Mesh(eyeGeo, eyeMat);
  eL.position.set(-0.22, 3.15, 0.48);
  farmerGroup.add(eL);
  const eR = new THREE.Mesh(eyeGeo, eyeMat);
  eR.position.set(0.22, 3.15, 0.48);
  farmerGroup.add(eR);

  // 閭ｴ菴・  const body = box(0.9, 1.3, 0.6, c.body);
  body.position.set(0, 2.0, 0);
  body.castShadow = true;
  farmerGroup.add(body);

  // 閻・  const armL = box(0.3, 1.1, 0.3, c.skin);
  armL.position.set(-0.6, 2.0, 0);
  armL.castShadow = true;
  farmerGroup.add(armL);
  const armR = box(0.3, 1.1, 0.3, c.skin);
  armR.position.set(0.6, 2.0, 0);
  armR.castShadow = true;
  farmerGroup.add(armR);

  // 閼・  const legL = box(0.35, 0.9, 0.35, c.pants);
  legL.position.set(-0.22, 0.7, 0);
  legL.castShadow = true;
  farmerGroup.add(legL);
  const legR = box(0.35, 0.9, 0.35, c.pants);
  legR.position.set(0.22, 0.7, 0);
  legR.castShadow = true;
  farmerGroup.add(legR);
}

function buildDogModel() {
  const c = 0xd89f50; // 阮・幻濶ｲ
  const w = 0xffffff; // 逋ｽ

  // 1: 菴難ｼ井ｸ雁濠蛻・幻濶ｲ・・  const bodyTop = box(1.4, 0.4, 0.8, c);
  bodyTop.position.set(0, 1.0, 0);
  bodyTop.castShadow = true;
  farmerGroup.add(bodyTop);
  
  // 菴難ｼ井ｸ句濠蛻・區・・  const bodyBot = box(1.4, 0.3, 0.8, w);
  bodyBot.position.set(0, 0.65, 0);
  bodyBot.castShadow = true;
  farmerGroup.add(bodyBot);

  // 2: 鬆ｭ
  const head = box(0.8, 0.8, 0.8, c);
  head.position.set(0.8, 1.5, 0);
  head.castShadow = true;
  farmerGroup.add(head);

  // 3: 繝槭ぜ繝ｫ・育區・・  const muzzle = box(0.4, 0.4, 0.82, w);
  muzzle.position.set(1.0, 1.35, 0);
  farmerGroup.add(muzzle);

  // 4: 鮠ｻ蜈・  const nose = box(0.2, 0.2, 0.2, 0x333333);
  nose.position.set(1.25, 1.45, 0);
  farmerGroup.add(nose);

  // 5 (蟾ｦ蜑崎・), 6 (蜿ｳ蜑崎・) - 繧｢繝九Γ繝ｼ繧ｷ繝ｧ繝ｳ蟇ｾ雎｡ (逋ｽ)
  const legFL = box(0.3, 0.6, 0.3, w);
  legFL.position.set(0.45, 0.3, -0.25);
  legFL.castShadow = true;
  farmerGroup.add(legFL);

  const legFR = box(0.3, 0.6, 0.3, w);
  legFR.position.set(0.45, 0.3, 0.25);
  legFR.castShadow = true;
  farmerGroup.add(legFR);

  // 7 (蟾ｦ蠕瑚・), 8 (蜿ｳ蠕瑚・) (逋ｽ)
  const legBL = box(0.3, 0.6, 0.3, w);
  legBL.position.set(-0.45, 0.3, -0.25);
  legBL.castShadow = true;
  farmerGroup.add(legBL);

  const legBR = box(0.3, 0.6, 0.3, w);
  legBR.position.set(-0.45, 0.3, 0.25);
  legBR.castShadow = true;
  farmerGroup.add(legBR);

  // 9 閠ｳL
  const earL = box(0.2, 0.4, 0.2, c);
  earL.position.set(0.6, 2.0, -0.3);
  farmerGroup.add(earL);

  // 10 閠ｳR
  const earR = box(0.2, 0.4, 0.2, c);
  earR.position.set(0.6, 2.0, 0.3);
  farmerGroup.add(earR);

  // 11 縺励▲縺ｽ
  const tail = box(0.3, 0.4, 0.3, c);
  tail.position.set(-0.7, 1.3, 0);
  tail.rotation.z = Math.PI / 4;
  farmerGroup.add(tail);
}

function buildCatModel() {
  const cw = 0xffffff;
  const cb = 0x333333;
  const co = 0xe08020;

  // 1: 菴・  const body = box(1.2, 0.6, 0.6, cw);
  body.position.set(0, 0.8, 0);
  body.castShadow = true;
  farmerGroup.add(body);

  // 2: 繝悶メ1
  const patch1 = box(0.4, 0.62, 0.62, cb);
  patch1.position.set(-0.3, 0.8, 0);
  farmerGroup.add(patch1);
  
  // 3: 繝悶メ2
  const patch2 = box(0.3, 0.62, 0.62, co);
  patch2.position.set(0.3, 0.8, 0);
  farmerGroup.add(patch2);

  // 4: 鬆ｭ
  const head = box(0.7, 0.7, 0.7, cw);
  head.position.set(0.6, 1.3, 0);
  head.castShadow = true;
  farmerGroup.add(head);

  // 5 (蟾ｦ蜑崎・), 6 (蜿ｳ蜑崎・) - 繧｢繝九Γ繝ｼ繧ｷ繝ｧ繝ｳ蟇ｾ雎｡
  const legFL = box(0.2, 0.5, 0.2, cw);
  legFL.position.set(0.3, 0.25, -0.15);
  legFL.castShadow = true;
  farmerGroup.add(legFL);

  const legFR = box(0.2, 0.5, 0.2, cw);
  legFR.position.set(0.3, 0.25, 0.15);
  legFR.castShadow = true;
  farmerGroup.add(legFR);

  // 鬆ｭ縺ｮ繝悶メ (驥阪↑繧翫↓繧医ｋ縺｡繧峨▽縺阪ｒ驕ｿ縺代ｋ縺溘ａ蟆代＠鬮倥￥)
  const headPatch = box(0.72, 0.32, 0.72, co);
  headPatch.position.set(0.6, 1.51, 0);
  farmerGroup.add(headPatch);

  // 閠ｳL
  const earL = box(0.2, 0.3, 0.2, cb);
  earL.position.set(0.48, 1.7, -0.25);
  earL.rotation.z = 0.3;
  farmerGroup.add(earL);
  
  // 閠ｳR
  const earR = box(0.2, 0.3, 0.2, co);
  earR.position.set(0.48, 1.7, 0.25);
  earR.rotation.z = 0.3;
  farmerGroup.add(earR);

  // 蠕後ｍ閼・  const legBL = box(0.2, 0.5, 0.2, cw);
  legBL.position.set(-0.3, 0.25, -0.15);
  legBL.castShadow = true;
  farmerGroup.add(legBL);

  const legBR = box(0.2, 0.5, 0.2, cw);
  legBR.position.set(-0.3, 0.25, 0.15);
  legBR.castShadow = true;
  farmerGroup.add(legBR);

  // 縺励▲縺ｽ
  const tail = box(0.15, 0.7, 0.15, cb);
  tail.position.set(-0.6, 1.0, 0);
  tail.rotation.z = -0.3;
  farmerGroup.add(tail);
}

function buildSnowmanModel() {
  // 荳九・逅・  const bottom = sphere(0.7, 0xffffff);
  bottom.position.set(0, 0.7, 0);
  bottom.castShadow = true;
  farmerGroup.add(bottom);

  // 荳ｭ縺ｮ逅・  const mid = sphere(0.5, 0xffffff);
  mid.position.set(0, 1.7, 0);
  mid.castShadow = true;
  farmerGroup.add(mid);

  // 鬆ｭ縺ｮ逅・  const head = sphere(0.4, 0xffffff);
  head.position.set(0, 2.5, 0);
  head.castShadow = true;
  farmerGroup.add(head);

  // 繝九Φ繧ｸ繝ｳ鮠ｻ
  const nose = cylinder(0.02, 0.08, 0.3, 0xff6600);
  nose.position.set(0, 2.45, 0.45);
  nose.rotation.x = -Math.PI / 2;
  farmerGroup.add(nose);

  // 逶ｮ・育浹轤ｭ・・  const eyeGeo = new THREE.SphereGeometry(0.06, 4, 4);
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const eL = new THREE.Mesh(eyeGeo, eyeMat);
  eL.position.set(-0.15, 2.6, 0.35);
  farmerGroup.add(eL);
  const eR = new THREE.Mesh(eyeGeo, eyeMat);
  eR.position.set(0.15, 2.6, 0.35);
  farmerGroup.add(eR);

  // 繝懊ち繝ｳ
  for (let i = 0; i < 3; i++) {
    const btn = new THREE.Mesh(eyeGeo, eyeMat);
    btn.position.set(0, 1.4 + i * 0.25, 0.48);
    farmerGroup.add(btn);
  }

  // 蟶ｽ蟄・  const brim = cylinder(0.5, 0.5, 0.08, 0x222222);
  brim.position.set(0, 2.85, 0);
  farmerGroup.add(brim);
  const hat = cylinder(0.3, 0.3, 0.4, 0x222222);
  hat.position.set(0, 3.1, 0);
  farmerGroup.add(hat);
}

// 笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊・//  Public Interface
// 笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊・
export function updateCharacter(charId) {
  const char = CHARACTER_MASTER[charId];
  if (!char) return;
  if (currentCharId === charId) return;
  currentCharId = charId;
  rebuildFarmerModel(char.cssClass);
}

export function updateField(fieldState) {
  // 蜿守ｩｫ逶ｴ蠕鯉ｼ・sPlanted=false・峨〒繧ＤropGroup縺ｯ蜑阪・迥ｶ諷九ｒ邯ｭ謖√☆繧・  // 竊・譁ｰ縺励＞菴懃黄縺梧､阪∴繧峨ｌ縺滓凾縺ｫ縺ｮ縺ｿ繝ｪ繝薙Ν繝・  if (!fieldState.isPlanted || !fieldState.cropId) {
    // cropGroup 縺ｯ髱櫁｡ｨ遉ｺ縺ｫ縺励↑縺・ｼ亥燕蝗槭・菴懃黄陦ｨ遉ｺ繧堤ｶｭ謖・ｼ・    return;
  }

  // 繝ｪ繝薙Ν繝峨′蠢・ｦ√↑譚｡莉ｶ・壻ｽ懃黄縺悟､峨ｏ縺｣縺溘°縲√・繝ｭ繧ｰ繝ｬ繧ｹ縺後Μ繧ｻ繝・ヨ(0)縺輔ｌ縺滓凾
  const isNewPlant = fieldState.cropId !== currentCropId || fieldState.progress < currentProgress;

  if (isNewPlant) {
    currentCropId = fieldState.cropId;
    smoothProgress = fieldState.progress; // 繧｢繝九Γ繝ｼ繧ｷ繝ｧ繝ｳ繧偵％縺薙°繧蛾幕蟋・    buildCrop(currentCropId);
  }

  currentProgress = fieldState.progress;
}

let _armResetTimer = null;
export function triggerWorkAnimation() {
  if (!farmerGroup) return;

  // 縺吶〒縺ｫ螳溯｡御ｸｭ縺ｮ蝣ｴ蜷医・繧ｭ繝｣繝ｳ繧ｻ繝ｫ縺励※繝九Η繝ｼ繝医Λ繝ｫ縺ｫ謌ｻ縺・  if (_armResetTimer) {
    clearTimeout(_armResetTimer);
    _armResetTimer = null;
  }

  // 荳｡閻輔ｒ謖ｯ繧贋ｸ翫￡繧・  const armL = farmerGroup.children[4];
  const armR = farmerGroup.children[5];
  if (!armL || !armR) return;

  armL.rotation.x = -0.7;
  armR.rotation.x = -0.7;

  // 150ms蠕後↓謌ｻ縺・  _armResetTimer = setTimeout(() => {
    // farmerGroup縺悟・讒狗ｯ峨＆繧後※縺・↑縺・°繝√ぉ繝・け
    if (farmerGroup.children[4] === armL && farmerGroup.children[5] === armR) {
      armL.rotation.x = 0;
      armR.rotation.x = 0;
    }
    _armResetTimer = null;
  }, 150);
}

// 笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊・//  3D Clock
// 笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊・
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

// 笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊・//  Clouds & 3D Events
// 笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊・
function buildClouds() {
  for (let i = 0; i < 6; i++) {
    const cloud = new THREE.Group();

    // 繝吶・繧ｹ縺ｨ縺ｪ繧句ｹｳ縺ｹ縺｣縺溘＞蝗幄ｧ・    const baseW = 3 + Math.random() * 2;
    const baseD = 2 + Math.random() * 2;
    const base = cloudBox(baseW, 0.6, baseD, 0xffffff, 0.35);
    cloud.add(base);

    // 荳翫↓荵励ｋ蟆代＠蟆上＆縺ｪ蝗幄ｧ・    const puffW = baseW * 0.6;
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
  // OrthographicCamera 縺ｧ縺ｯ PointsMaterial 縺ｮ size 縺ｯ繝斐け繧ｻ繝ｫ蜊倅ｽ阪↓縺ｪ繧翫∪縺吶・  if (type === 'snow') {
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
    // 譟ｴ迥ｬ繧ｫ繝ｩ繝ｼ
    const c = 0xd89f50; // 阮・幻濶ｲ
    const w = 0xffffff; // 逋ｽ
    
    // 菴難ｼ井ｸ雁濠蛻・幻濶ｲ縲∽ｸ句濠蛻・區・・    const bodyTop = box(1.4, 0.4, 0.8, c);
    bodyTop.position.set(0, 1.0, 0);
    const bodyBot = box(1.4, 0.3, 0.8, w);
    bodyBot.position.set(0, 0.65, 0);
    
    // 鬆ｭ (闌ｶ濶ｲ)
    const head = box(0.8, 0.8, 0.8, c);
    head.position.set(0.8, 1.4, 0);
    
    // 繝槭ぜ繝ｫ繝ｻ鬆ｬ縺ｪ縺ｩ縺ｮ逋ｽ縺・Κ蛻・    const muzzle = box(0.4, 0.4, 0.82, w);
    muzzle.position.set(1.0, 1.25, 0);
    
    // 閠ｳ (闌ｶ濶ｲ)
    const earL = box(0.2, 0.4, 0.2, c);
    earL.position.set(0.6, 1.9, -0.3);
    const earR = box(0.2, 0.4, 0.2, c);
    earR.position.set(0.6, 1.9, 0.3);
    
    // 鮠ｻ蜈・    const nose = box(0.2, 0.2, 0.2, 0x222222);
    nose.position.set(1.25, 1.3, 0);
    
    // 閼・(逋ｽ)
    [[-0.5, -0.25], [0.5, -0.25], [-0.5, 0.25], [0.5, 0.25]].forEach(([x, z]) => {
      const leg = box(0.3, 0.6, 0.3, w);
      leg.position.set(x, 0.3, z);
      grp.add(leg);
    });
    
    // 縺上ｋ繧薙→蟾ｻ縺・◆縺励▲縺ｽ (闌ｶ濶ｲ)
    const tail = box(0.3, 0.4, 0.3, c);
    tail.position.set(-0.7, 1.3, 0);
    tail.rotation.z = Math.PI / 4;

    grp.add(bodyTop, bodyBot, head, muzzle, earL, earR, nose, tail);
  } else {
    // 荳画ｯ帷賢繧ｫ繝ｩ繝ｼ
    const cw = 0xffffff; // 逋ｽ
    const cb = 0x333333; // 鮟・    const co = 0xe08020; // 繧ｪ繝ｬ繝ｳ繧ｸ

    // 菴・(逋ｽ繝吶・繧ｹ)
    const body = box(1.2, 0.6, 0.6, cw);
    body.position.set(0, 0.6, 0);
    // 菴薙・繝悶メ讓｡讒・    const patch1 = box(0.4, 0.62, 0.62, cb);
    patch1.position.set(-0.3, 0.6, 0);
    const patch2 = box(0.3, 0.62, 0.62, co);
    patch2.position.set(0.3, 0.6, 0);
    
    // 鬆ｭ (逋ｽ繝吶・繧ｹ)
    const head = box(0.7, 0.7, 0.7, cw);
    head.position.set(0.7, 1.2, 0);
    // 鬆ｭ縺ｮ繝悶メ (驥阪↑繧翫↓繧医ｋ縺｡繧峨▽縺阪ｒ驕ｿ縺代ｋ縺溘ａ蟆代＠鬮倥￥)
    const headPatch = box(0.72, 0.32, 0.72, co);
    headPatch.position.set(0.7, 1.41, 0);

    // 閠ｳ (蟾ｦ蜿ｳ縺ｧ濶ｲ繧貞､峨∴繧・
    const earL = box(0.2, 0.3, 0.2, cb);
    earL.position.set(0.6, 1.6, -0.25);
    earL.rotation.z = 0.3;
    const earR = box(0.2, 0.3, 0.2, co);
    earR.position.set(0.6, 1.6, 0.25);
    earR.rotation.z = 0.3;
    
    // 閼・(逋ｽ)
    [[-0.4, -0.15], [0.4, -0.15], [-0.4, 0.15], [0.4, 0.15]].forEach(([x, z]) => {
      const leg = box(0.2, 0.4, 0.2, cw);
      leg.position.set(x, 0.2, z);
      grp.add(leg);
    });
    // 縺励▲縺ｽ (鮟貞ｯ・ｊ)
    const tail = box(0.15, 0.7, 0.15, cb);
    tail.position.set(-0.6, 0.8, 0);
    tail.rotation.z = -0.3;
    
    grp.add(body, patch1, patch2, head, headPatch, earL, earR, tail);
  }

  // 蠖ｱ縺ｮ險ｭ螳・  grp.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
    }
  });

  // 迪ｫ縺ｮ蝣ｴ蜷茨ｼ壼・縺ｮ菴咲ｽｮ縺ｫ逡吶∪繧峨○縺ｦ繧・▲縺上ｊ諱ｯ繧偵＆縺帙ｋ
  if (type === 'cat_visit') {
    grp.position.set(-4 + Math.random(), 0, 4 + Math.random() * 2);
    grp.rotation.y = Math.PI / 4 + Math.random() * 0.5;
    weatherGroup.add(grp);

    activeAnimators.push({
      type: 'animal_visit',
      mesh: grp,
      update: (dt, t) => {
        if (!grp.parent) return false;
        // 迪ｫ・壽ｭｩ縺榊屓繧峨★縲√◎縺ｮ蝣ｴ縺ｧ繧・▲縺上ｊ縺ｨ蜻ｼ蜷ｸ縺吶ｋ縺縺・        grp.position.y = Math.sin(t * 0.002) * 0.04; 
        return true;
      }
    });
    return; // 迪ｫ縺ｮ蜃ｦ逅・・縺薙％縺ｧ邨ゆｺ・  }

  // 迥ｬ縺ｮ蝣ｴ蜷茨ｼ壼・譛滄・鄂ｮ
  grp.position.set(-5 + Math.random() * 2, 0, 4 + Math.random() * 2);
  grp.rotation.y = Math.PI / 4 + Math.random() * 0.5;
  weatherGroup.add(grp);
  
  // 迥ｬ縺後≧繧阪≧繧肴ｭｩ縺榊屓繧九い繝九Γ繝ｼ繧ｷ繝ｧ繝ｳ繧定ｿｽ蜉
  let targetX = grp.position.x;
  let targetZ = grp.position.z;
  let state = 'idle'; 
  let stateTimer = Date.now() + 1000;
  const walkSpeed = 0.04; 
  
  activeAnimators.push({
    type: 'animal_visit',
    mesh: grp,
    update: (dt, t) => {
      // 繧､繝吶Φ繝育ｵゆｺ・ｭ峨〒mesh縺悟炎髯､縺輔ｌ縺溷ｴ蜷医・繧｢繝九Γ繝ｼ繧ｿ繝ｼ繧らｵゆｺ・      if (!grp.parent) return false;

      if (t > stateTimer) {
        if (state === 'idle') {
          // 豁ｩ縺榊ｧ九ａ繧・          state = 'walk';
          
          // 譁ｰ縺励＞逶ｮ讓吝慍轤ｹ繧呈ｱｺ螳夲ｼ育舞縺ｮ鬆伜沺 x: -3.5縲・.5, z: -0.5縲・.5 繧堤｢ｺ螳溘↓驕ｿ縺代ｋ・・          const zone = Math.floor(Math.random() * 3);
          if (zone === 0) {
            // 逡代・蟾ｦ蛛ｴ縺ｮ遨ｺ縺榊慍
            targetX = -7 + Math.random() * 3;
            targetZ = Math.random() * 6;
          } else if (zone === 1) {
            // 逡代・蜿ｳ蛛ｴ縺ｮ遨ｺ縺榊慍
            targetX = 4 + Math.random() * 3;
            targetZ = Math.random() * 6;
          } else {
            // 逡代ｈ繧頑焔蜑搾ｼ医き繝｡繝ｩ蛛ｴ・峨・遨ｺ縺榊慍
            targetX = -6 + Math.random() * 12;
            targetZ = 4.5 + Math.random() * 3;
          }
          
          // 逶ｮ讓吝慍轤ｹ縺ｮ譁ｹ蜷代ｒ蜷代￥ (X縺梧ｨｪ縲〇縺悟･･譁ｹ蜷・
          const dx = targetX - grp.position.x;
          const dz = targetZ - grp.position.z;
          grp.rotation.y = Math.atan2(dx, dz);
          
          // 谺｡縺ｮ繧ｹ繝・・繝亥・繧頑崛縺医∪縺ｧ縺ｮ譎る俣
          stateTimer = t + 1000 + Math.random() * 3000;
        } else {
          // 遶九■豁｢縺ｾ繧・          state = 'idle';
          stateTimer = t + 1000 + Math.random() * 2000;
        }
      }
      
      if (state === 'walk') {
        const dx = targetX - grp.position.x;
        const dz = targetZ - grp.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist > 0.1) {
          // 逶ｮ讓吶∈遘ｻ蜍・          grp.position.x += (dx / dist) * walkSpeed;
          grp.position.z += (dz / dist) * walkSpeed;
          // 繝斐Ι繧ｳ繝斐Ι繧ｳ霍ｳ縺ｭ繧区ｭｩ陦梧─
          grp.position.y = Math.abs(Math.sin(t * 0.015)) * 0.3;
        } else {
          state = 'idle';
          stateTimer = t + 500 + Math.random() * 2000;
        }
      } else {
        // 蠕・ｩ滉ｸｭ縺ｯ鬮倥＆繧偵ぞ繝ｭ縺ｫ
        grp.position.y = 0;
      }
      
      return true;
    }
  });
}


function spawnJohnVisit3D() {
  const grp = new THREE.Group();
  
  // 繧ｸ繝ｧ繝ｳ縺ｮ繝｢繝・Ν讒狗ｯ会ｼ医・繝ｬ繧､繝､繝ｼ縺ｨ蜷後§繧医≧縺ｪ繧ｵ繧､繧ｺ諢溘〒・・  const body = box(1.0, 1.4, 0.6, 0xffa07a);
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
  
  // 蛻晄悄菴咲ｽｮ (蜿ｳ螂･霎ｺ繧翫°繧画擂繧・
  grp.position.set(10, 0, 5);
  weatherGroup.add(grp);
  
  let state = 'enter';
  let targetX = 3 + Math.random() * 2; // 逡代・蜿ｳ蛛ｴ莉倩ｿ・  let targetZ = 2 + Math.random() * 2;
  
  // 謖・ｮ壼ｺｧ讓吶・譁ｹ繧貞髄縺九○繧矩未謨ｰ
  const faceTarget = (tx, tz) => {
    const dx = tx - grp.position.x;
    const dz = tz - grp.position.z;
    grp.rotation.y = Math.atan2(dx, dz);
  };
  faceTarget(targetX, targetZ);
  
  const speed = 0.04;
  const startTime = Date.now();

  activeAnimators.push({
    type: 'animal_visit', // animal_visit縺ｨ蜷後§謇ｱ縺・〒繧､繝吶Φ繝育ｵゆｺ・凾縺ｫ豸医∴繧・    mesh: grp,
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
          // 豁ｩ陦後Δ繝ｼ繧ｷ繝ｧ繝ｳ・郁・縺ｨ閼壹ｂ蟆代＠謖ｯ繧具ｼ・          grp.position.y = Math.abs(Math.sin(elapsed * 0.01)) * 0.2;
          legL.rotation.x = Math.sin(elapsed * 0.01) * 0.4;
          legR.rotation.x = -Math.sin(elapsed * 0.01) * 0.4;
          armL.rotation.x = -Math.sin(elapsed * 0.01) * 0.4;
          armR.rotation.x = Math.sin(elapsed * 0.01) * 0.4;
        } else {
          // 蛻ｰ逹縺励◆繧臥舞・井ｸｭ螟ｮ・峨ｒ隕九ｋ
          state = 'watch';
          grp.position.y = 0;
          legL.rotation.x = 0; legR.rotation.x = 0;
          armL.rotation.x = 0; armR.rotation.x = 0;
          faceTarget(0, 0);
        }
      } else if (state === 'watch') {
        // 10遘・10000ms)邨碁℃縺励◆繧牙ｸｰ繧区ｺ門ｙ
        if (elapsed > 10000) {
          state = 'exit';
          targetX = 12; // 逕ｻ髱｢螟悶∈
          targetZ = 6;
          faceTarget(targetX, targetZ);
        } else {
          // 隕九※縺・ｋ髢薙∵凾縲・ｷ縺上ｈ縺・↑蜍輔″
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
          // 逕ｻ髱｢螟悶↓蜃ｺ縺溘ｉ豸医☆
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

// 蜈ｱ騾壹Δ繧ｸ繝･繝ｼ繝ｫ縺九ｉ re-export
export { updateHUD, showHarvestEffect, showLevelUpEffect };
