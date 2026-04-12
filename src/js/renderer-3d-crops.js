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
  eggplant: 0x4b0082, melon: 0x98fb98,
  // v0.5 追加
  onion: 0xf0e0a0, cabbage: 0x80c060,
  mushroom: 0xc8a080, radish: 0xf0f0f0,
  cherry: 0xcc2244, grape: 0x6622aa,
  bamboo: 0x88aa44, peach: 0xffaa88,
  pineapple: 0xe0b020, lotus: 0xe8d8c0,
  truffle: 0x3a2820, dragon_fruit: 0xee3388,
  crystal_flower: 0x88ddff, rainbow_melon: 0x44cc88,
  world_tree_seed: 0x226622,
};
export const LEAF_HEX = {
  tomato: 0x2d8040, potato: 0x4a8e2c,
  carrot: 0x2d8040, strawberry: 0x2d8040,
  corn: 0x5a9e3c, pumpkin: 0x2d6030,
  watermelon: 0x306030, golden_apple: 0x5a9e3c,
  tumbleweed: 0x807050, christmas_tree: 0x1a6030,
  eggplant: 0x2d8040, melon: 0x306030,
  // v0.5 追加
  onion: 0x4a8e2c, cabbage: 0x2d8040,
  mushroom: 0x605040, radish: 0x2d8040,
  cherry: 0x2d8040, grape: 0x3a6030,
  bamboo: 0x5a7a2c, peach: 0x3a7a30,
  pineapple: 0x2d6030, lotus: 0x2d6030,
  truffle: 0x504030, dragon_fruit: 0x2d6040,
  crystal_flower: 0x4488aa, rainbow_melon: 0x2d8040,
  world_tree_seed: 0x1a4a1a,
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

    case 'eggplant':
      core = cylinder(r * 0.4, r * 1.0, r * 2.5, color);
      core.position.y = -r * 0.5;
      cap = box(r * 0.8, 0.1, r * 0.8, 0x2d8040);
      cap.position.set(0, r * 0.8, 0);
      grp.add(core, cap);
      break;

    case 'melon':
      core = sphere(r, color);
      core.scale.set(1.2, 1.2, 1.2);
      cap = cylinder(r * 0.1, r * 0.1, r * 0.5, 0x8b5a2b);
      cap.position.set(0, r * 1.3, 0);
      grp.add(core, cap);
      break;

    // ── v0.5 追加作物 ──

    case 'onion': {
      // 丸い球体 + 上部の緑の芽
      core = sphere(r, color);
      core.scale.set(1.0, 1.2, 1.0);
      const sprout = cylinder(r * 0.15, r * 0.1, r * 1.0, 0x4a8e2c);
      sprout.position.set(0, r * 1.2, 0);
      grp.add(core, sprout);
      break;
    }

    case 'cabbage': {
      // 重なった球体で表��
      core = sphere(r, color);
      core.scale.set(1.3, 0.9, 1.3);
      const outerLeaf = sphere(r * 1.1, 0x60a040);
      outerLeaf.scale.set(1.4, 0.6, 1.4);
      outerLeaf.position.y = -r * 0.15;
      grp.add(outerLeaf, core);
      break;
    }

    case 'mushroom': {
      // 傘 + 軸
      const stem = cylinder(r * 0.3, r * 0.35, r * 1.2, 0xf0e8d0);
      stem.position.y = -r * 0.3;
      const capMush = cylinder(r * 1.0, r * 0.3, r * 0.8, color);
      capMush.position.set(0, r * 0.5, 0);
      grp.add(stem, capMush);
      break;
    }

    case 'radish': {
      // 長い白い根 + 葉
      core = cylinder(r * 0.6, r * 0.2, r * 2.8, color);
      core.position.y = -r * 0.5;
      cap = box(r * 0.7, 0.1, r * 0.7, 0x2d8040);
      cap.position.set(0, r * 0.9, 0);
      grp.add(core, cap);
      break;
    }

    case 'cherry': {
      // 双子の実 + Y字の枝
      const stem1 = cylinder(r * 0.06, r * 0.06, r * 1.2, 0x5a3216);
      stem1.position.set(-r * 0.3, r * 0.6, 0);
      stem1.rotation.z = 0.3;
      const stem2 = cylinder(r * 0.06, r * 0.06, r * 1.2, 0x5a3216);
      stem2.position.set(r * 0.3, r * 0.6, 0);
      stem2.rotation.z = -0.3;
      const ball1 = sphere(r * 0.7, color);
      ball1.position.set(-r * 0.5, -r * 0.1, 0);
      const ball2 = sphere(r * 0.7, color);
      ball2.position.set(r * 0.5, -r * 0.1, 0);
      grp.add(stem1, stem2, ball1, ball2);
      break;
    }

    case 'grape': {
      // 房状の球体群
      const positions = [
        [0, 0, 0], [-r*0.5, -r*0.4, 0], [r*0.5, -r*0.4, 0],
        [-r*0.25, -r*0.8, 0], [r*0.25, -r*0.8, 0], [0, -r*1.2, 0],
      ];
      positions.forEach(([x, y, z]) => {
        const g = sphere(r * 0.45, color);
        g.position.set(x, y, z);
        grp.add(g);
      });
      const grapeStem = cylinder(r * 0.08, r * 0.08, r * 0.8, 0x5a3216);
      grapeStem.position.set(0, r * 0.6, 0);
      grp.add(grapeStem);
      break;
    }

    case 'bamboo': {
      // 節のあるタケノコ
      const seg1 = cylinder(r * 0.5, r * 0.7, r * 1.0, color);
      seg1.position.y = -r * 0.5;
      const seg2 = cylinder(r * 0.3, r * 0.5, r * 0.8, color);
      seg2.position.y = r * 0.3;
      const seg3 = cylinder(r * 0.1, r * 0.3, r * 0.6, 0x99bb55);
      seg3.position.y = r * 0.9;
      const ring1 = cylinder(r * 0.55, r * 0.55, r * 0.08, 0x667733);
      ring1.position.y = 0;
      grp.add(seg1, seg2, seg3, ring1);
      break;
    }

    case 'peach': {
      // 桃: 球体 + 溝線（中央のライン） + 葉
      core = sphere(r, color);
      core.scale.set(1.1, 1.0, 1.0);
      const groove = box(r * 0.06, r * 1.6, r * 0.06, 0xdd8866);
      groove.position.set(0, 0, r * 0.5);
      const peachLeaf = box(r * 0.5, 0.06, r * 0.3, 0x3a7a30);
      peachLeaf.position.set(0, r * 0.9, 0);
      grp.add(core, groove, peachLeaf);
      break;
    }

    case 'pineapple': {
      // 円筒ボディ + 上部の葉の冠
      core = cylinder(r * 0.7, r * 0.6, r * 2.0, color);
      const crown1 = box(r * 0.2, r * 0.8, r * 0.08, 0x2d8040);
      crown1.position.set(0, r * 1.4, 0);
      crown1.rotation.z = 0.2;
      const crown2 = box(r * 0.2, r * 0.7, r * 0.08, 0x2d8040);
      crown2.position.set(r * 0.15, r * 1.3, 0);
      crown2.rotation.z = -0.3;
      const crown3 = box(r * 0.2, r * 0.6, r * 0.08, 0x3a9050);
      crown3.position.set(-r * 0.15, r * 1.2, 0);
      crown3.rotation.z = 0.4;
      grp.add(core, crown1, crown2, crown3);
      break;
    }

    case 'lotus': {
      // 蓮根: 横倒しの円筒 + 断面の穴模様
      core = cylinder(r * 0.8, r * 0.8, r * 2.2, color);
      core.rotation.z = Math.PI / 2;
      const endCap = cylinder(r * 0.75, r * 0.75, r * 0.05, 0xd0c0a0);
      endCap.rotation.z = Math.PI / 2;
      endCap.position.x = r * 1.1;
      // 穴の表現（暗い丸）
      const hole1 = cylinder(r * 0.15, r * 0.15, r * 0.08, 0x8a7a60);
      hole1.rotation.z = Math.PI / 2;
      hole1.position.set(r * 1.15, r * 0.2, 0);
      const hole2 = cylinder(r * 0.15, r * 0.15, r * 0.08, 0x8a7a60);
      hole2.rotation.z = Math.PI / 2;
      hole2.position.set(r * 1.15, -r * 0.2, 0);
      grp.add(core, endCap, hole1, hole2);
      break;
    }

    case 'truffle': {
      // 不整形な球体（ゴツゴツ感）
      core = sphere(r, color);
      core.scale.set(1.1, 0.9, 1.0);
      const bump1 = sphere(r * 0.4, 0x4a3828);
      bump1.position.set(r * 0.4, r * 0.3, r * 0.2);
      const bump2 = sphere(r * 0.35, 0x4a3828);
      bump2.position.set(-r * 0.3, -r * 0.2, r * 0.3);
      grp.add(core, bump1, bump2);
      break;
    }

    case 'dragon_fruit': {
      // 楕円体 + 鱗状の突起
      core = sphere(r, color);
      core.scale.set(0.9, 1.3, 0.9);
      const spike1 = box(r * 0.15, r * 0.5, r * 0.08, 0x44aa44);
      spike1.position.set(r * 0.4, r * 0.3, 0);
      spike1.rotation.z = -0.5;
      const spike2 = box(r * 0.15, r * 0.5, r * 0.08, 0x44aa44);
      spike2.position.set(-r * 0.4, 0, 0);
      spike2.rotation.z = 0.5;
      const spike3 = box(r * 0.15, r * 0.4, r * 0.08, 0x44aa44);
      spike3.position.set(0, -r * 0.4, r * 0.3);
      spike3.rotation.x = 0.5;
      grp.add(core, spike1, spike2, spike3);
      break;
    }

    case 'crystal_flower': {
      // クリスタルの花弁（透明感のある多面体）
      const center = sphere(r * 0.3, 0xffee88);
      center.material.emissive = new THREE.Color(0x444400);
      for (let i = 0; i < 5; i++) {
        const petal = box(r * 0.5, r * 0.8, r * 0.08, color);
        petal.material.transparent = true;
        petal.material.opacity = 0.8;
        const angle = (i / 5) * Math.PI * 2;
        petal.position.set(Math.cos(angle) * r * 0.5, r * 0.2, Math.sin(angle) * r * 0.5);
        petal.rotation.y = -angle;
        petal.rotation.x = -0.3;
        grp.add(petal);
      }
      grp.add(center);
      break;
    }

    case 'rainbow_melon': {
      // メロン型 + 虹色のストライプ
      core = sphere(r, 0x44cc88);
      core.scale.set(1.3, 1.1, 1.3);
      const stripe1 = box(r * 0.1, r * 2.0, r * 0.1, 0xff4444);
      stripe1.position.set(r * 0.5, 0, 0);
      const stripe2 = box(r * 0.1, r * 2.0, r * 0.1, 0xffaa00);
      stripe2.position.set(r * 0.25, 0, r * 0.4);
      const stripe3 = box(r * 0.1, r * 2.0, r * 0.1, 0x4444ff);
      stripe3.position.set(-r * 0.25, 0, r * 0.4);
      const stripe4 = box(r * 0.1, r * 2.0, r * 0.1, 0xaa44ff);
      stripe4.position.set(-r * 0.5, 0, 0);
      cap = cylinder(r * 0.12, r * 0.12, r * 0.5, 0x5a3216);
      cap.position.set(0, r * 1.2, 0);
      grp.add(core, stripe1, stripe2, stripe3, stripe4, cap);
      break;
    }

    case 'world_tree_seed': {
      // 巨大な種: 卵型 + 発光する紋様
      core = sphere(r, color);
      core.scale.set(0.8, 1.4, 0.8);
      const glow1 = box(r * 0.08, r * 1.0, r * 0.08, 0x88ff88);
      glow1.material.emissive = new THREE.Color(0x226622);
      glow1.position.set(0, 0, r * 0.4);
      const glow2 = box(r * 0.08, r * 0.8, r * 0.08, 0x88ff88);
      glow2.material.emissive = new THREE.Color(0x226622);
      glow2.position.set(r * 0.3, 0, r * 0.2);
      glow2.rotation.z = 0.4;
      const sproutTop = box(r * 0.3, r * 0.5, r * 0.08, 0x44aa44);
      sproutTop.position.set(0, r * 1.2, 0);
      grp.add(core, glow1, glow2, sproutTop);
      break;
    }

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
