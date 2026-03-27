// renderer-3d-crops.js — 3D作物モデル構築
// ツル＋実の統一スタイル（2Dビューに合わせた表現）

import * as THREE from 'three';

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

// ─── Crop colors ───
export const CROP_HEX = {
  tomato: 0xe04040, potato: 0xc8a050,
  carrot: 0xff8c00, strawberry: 0xff4060,
  corn: 0xf0d040, pumpkin: 0xe08020,
  watermelon: 0x408040, golden_apple: 0xffd700,
  tumbleweed: 0xedc97f, christmas_tree: 0x2d8040,
};
export const LEAF_HEX = {
  tomato: 0x2d8040, potato: 0x4a8e2c,
  carrot: 0x2d8040, strawberry: 0x2d8040,
  corn: 0x5a9e3c, pumpkin: 0x2d6030,
  watermelon: 0x306030, golden_apple: 0x5a9e3c,
  tumbleweed: 0x807050, christmas_tree: 0x1a6030,
};

// 実の出現位置（ツル上の4箇所）
const FRUIT_POSITIONS = [
  { vineIdx: 1, appearAt: 0.1 },
  { vineIdx: 3, appearAt: 0.3 },
  { vineIdx: 6, appearAt: 0.5 },
  { vineIdx: 9, appearAt: 0.7 },
];

/**
 * ツルの経路点（S字カーブ）— CONFIG から計算
 */
function getVinePoints(CONFIG) {
  const pX = CONFIG.poleX;
  const fz = CONFIG.poleZ;
  const baseY = 0.35;
  const topY = CONFIG.barY - 0.1;
  const h = topY - baseY;

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

/**
 * 作物固有の3D形状（実の部分）を生成する
 */
function createFruitMesh(cropId, r, color) {
  const grp = new THREE.Group();
  let core, cap;

  switch (cropId) {
    case 'potato':
      core = box(r * 1.6, r * 1.2, r * 1.4, color);
      grp.add(core);
      break;

    case 'carrot':
      core = cylinder(r * 0.8, r * 0.2, r * 2.5, color);
      core.position.y = -r * 0.5;
      cap = box(r * 0.6, 0.1, r * 0.6, 0x2d8040);
      cap.position.set(0, r * 0.8, 0);
      grp.add(core, cap);
      break;

    case 'strawberry':
      core = cylinder(r, r * 0.2, r * 1.8, color);
      core.position.y = -r * 0.2;
      cap = box(r * 0.8, 0.08, r * 0.8, 0x2d8040);
      cap.position.set(0, r * 0.7, 0);
      grp.add(core, cap);
      break;

    case 'corn':
      core = cylinder(r * 0.6, r * 0.6, r * 2.2, color);
      const husk = box(r * 0.8, r * 1.5, r * 0.8, 0x5a9e3c);
      husk.position.y = -r * 0.3;
      cap = box(r * 0.3, 0.2, r * 0.3, 0x2d6030);
      cap.position.set(0, r * 1.1, 0);
      grp.add(core, husk, cap);
      break;

    case 'pumpkin':
      core = sphere(r, color);
      core.scale.set(1.4, 0.8, 1.4);
      cap = box(r * 0.3, 0.15, r * 0.3, 0x2d6030);
      cap.position.set(0, r * 0.8, 0);
      grp.add(core, cap);
      break;

    case 'watermelon':
      core = sphere(r, color);
      core.scale.set(1.1, 1.0, 1.1);
      cap = box(r * 0.4, 0.08, r * 0.4, 0x2d6030);
      cap.position.set(0, r + 0.02, 0);
      grp.add(core, cap);
      break;

    case 'tumbleweed':
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
      core = cylinder(0.01, r * 1.2, r * 2.5, color);
      core.position.y = r * 0.2;
      const trunk = box(r * 0.4, r * 0.8, r * 0.4, 0x5a3216);
      trunk.position.y = -r * 1.0;
      grp.add(trunk, core);
      break;

    case 'tomato':
    case 'golden_apple':
    default:
      core = sphere(r, color);
      cap = box(r * 0.5, 0.08, r * 0.5, 0x2d6030);
      cap.position.set(0, r + 0.02, 0);
      grp.add(core, cap);
      break;
  }

  grp.traverse(child => {
    if (child.isMesh) child.castShadow = true;
  });

  return grp;
}

/**
 * 作物モデルを構築する
 * @param {THREE.Group} cropGroup - 作物のグループ
 * @param {string} cropId - 作物ID
 * @param {object} CONFIG - 設定オブジェクト（poleX, poleZ, barY）
 */
export function buildCrop(cropGroup, cropId, CONFIG) {
  // 既存の作物を削除
  while (cropGroup.children.length) {
    const c = cropGroup.children[0];
    c.removeFromParent();
    if (c.geometry) c.geometry.dispose();
    if (c.material) c.material.dispose();
  }
  cropGroup.visible = true;

  cropGroup.userData.fruits = [];

  const vinePoints = getVinePoints(CONFIG);
  const fruitColor = CROP_HEX[cropId] || 0xffd700;
  const vineColor = 0x3a7a2a;

  // ── ツル ──
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

  // ── 葉っぱ ──
  const leafIndices = [1, 2, 3, 4, 5, 6, 7, 8];
  leafIndices.forEach((idx, i) => {
    const pt = vinePoints[idx];
    if (!pt) return;

    const side1 = (i % 2 === 0) ? 1 : -1;
    const leaf1 = box(0.4, 0.06, 0.3, vineColor);
    leaf1.position.set(pt.x + side1 * 0.25, pt.y + 0.05, pt.z);
    leaf1.rotation.z = side1 * 0.6;
    leaf1.rotation.y = side1 * 0.3;
    leaf1.castShadow = true;
    cropGroup.add(leaf1);

    const side2 = -side1;
    const leaf2 = box(0.3, 0.06, 0.25, vineColor);
    leaf2.position.set(pt.x + side2 * 0.15, pt.y - 0.05, pt.z + 0.15);
    leaf2.rotation.z = side2 * 0.4;
    leaf2.rotation.y = side2 * 0.6;
    leaf2.castShadow = true;
    cropGroup.add(leaf2);
  });

  // ── 実 ──
  FRUIT_POSITIONS.forEach(fp => {
    const pt = vinePoints[fp.vineIdx];
    if (!pt) return;

    const r = 0.35;
    const group = new THREE.Group();
    group.position.set(pt.x, pt.y - r * 0.3, pt.z + 0.2);

    const fruitMeshGroup = createFruitMesh(cropId, r, fruitColor);
    group.add(fruitMeshGroup);

    group.scale.set(0, 0, 0);
    group.userData = { appearAt: fp.appearAt, baseY: pt.y - r * 0.3 };

    cropGroup.add(group);
    cropGroup.userData.fruits.push(group);
  });
}
