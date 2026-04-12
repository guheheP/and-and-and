// renderer-3d-models.js — 3Dキャラクターモデル構築
// Farmer（人間/動物/雪だるま）の3Dモデルをtarget groupに生成する

import * as THREE from 'three';
import { CHARACTER_MASTER } from './master-data.js';

// ─── Character colors ───
export const CHAR_COLORS = {
  'farmer--man': { skin: 0xf5c6a0, body: 0x4477bb, hair: 0x4a3520, pants: 0x445566, eyes: 0x222222 },
  'farmer--woman': { skin: 0xf5c6a0, body: 0xcc4477, hair: 0x6a4530, pants: 0x445566, eyes: 0x222222 },
  'farmer--grandpa': { skin: 0xe0b890, body: 0x667744, hair: 0xcccccc, pants: 0x556644, eyes: 0x222222 },
  'farmer--grandma': { skin: 0xe0b890, body: 0x885566, hair: 0xcccccc, pants: 0x665544, eyes: 0x222222 },
  'farmer--girl': { skin: 0xf5c6a0, body: 0xff88aa, hair: 0xffcc44, pants: 0x445566, eyes: 0x222222 },
  'farmer--boy': { skin: 0xf5c6a0, body: 0x44aa77, hair: 0x3a2010, pants: 0x445566, eyes: 0x222222 },
  'farmer--dog': { skin: 0xc8a060, body: 0xc8a060, hair: 0x8a6030, pants: 0xc8a060, eyes: 0x222222 },
  'farmer--cat': { skin: 0xe0b880, body: 0xe0b880, hair: 0x504030, pants: 0xe0b880, eyes: 0x222222 },
  'farmer--robot': { skin: 0xaaaacc, body: 0x6688aa, hair: 0x889900, pants: 0x556688, eyes: 0x222222 },
  'farmer--alien': { skin: 0x80cc80, body: 0x445588, hair: 0x40aa40, pants: 0x334466, eyes: 0x222222 },
  'farmer--pumpkinhead': { skin: 0xe08020, body: 0x553322, hair: 0x2d8040, pants: 0x443322, eyes: 0x222222 },
  'farmer--snowman': { skin: 0xffffff, body: 0xffffff, hair: 0xff6600, pants: 0xeeeeee, eyes: 0x222222 },
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

// ─── HSL → Hex 変換ヘルパー ───
function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * Math.max(0, color));
  };
  return (f(0) << 16) | (f(8) << 8) | f(4);
}

/**
 * ランダムな配色を生成
 * @returns {{ skin: number, body: number, hair: number, pants: number }}
 */
export function generateRandomColors() {
  // 肌色: 70%は暖色系、30%は外れ値（全色相）
  let skinHue, skinSat, skinLight;
  if (Math.random() < 0.3) {
    skinHue = Math.random() * 360;
    skinSat = 35 + Math.random() * 45;
    skinLight = 55 + Math.random() * 30;
  } else {
    skinHue = 15 + Math.random() * 25;
    skinSat = 40 + Math.random() * 35;
    skinLight = 65 + Math.random() * 20;
  }

  // 服: 自由な色
  const bodyHue = Math.random() * 360;
  const bodySat = 40 + Math.random() * 45;
  const bodyLight = 30 + Math.random() * 35;

  // 髪: ナチュラル or ファンカラー
  const hairType = Math.random();
  let hairHue, hairSat, hairLight;
  if (hairType < 0.4) {
    hairHue = 20 + Math.random() * 20;
    hairSat = 25 + Math.random() * 40;
    hairLight = 12 + Math.random() * 25;
  } else if (hairType < 0.6) {
    hairHue = 38 + Math.random() * 15;
    hairSat = 60 + Math.random() * 30;
    hairLight = 60 + Math.random() * 20;
  } else {
    hairHue = Math.random() * 360;
    hairSat = 50 + Math.random() * 40;
    hairLight = 35 + Math.random() * 35;
  }

  // パンツ
  const pantsHue = Math.random() * 360;
  const pantsSat = 15 + Math.random() * 40;
  const pantsLight = 25 + Math.random() * 25;

  // 目: 自由な色
  const eyeHue = Math.random() * 360;
  const eyeSat = 30 + Math.random() * 60;
  const eyeLight = 15 + Math.random() * 35;

  return {
    skin: hslToHex(skinHue, skinSat, skinLight),
    body: hslToHex(bodyHue, bodySat, bodyLight),
    hair: hslToHex(hairHue, hairSat, hairLight),
    pants: hslToHex(pantsHue, pantsSat, pantsLight),
    eyes: hslToHex(eyeHue, eyeSat, eyeLight),
  };
}

/**
 * ベースIDに対応するデフォルト配色を返す
 * @param {string} baseId
 * @returns {{ skin: number, body: number, hair: number, pants: number }}
 */
export function getDefaultColors(baseId) {
  const charMaster = CHARACTER_MASTER[baseId];
  const cssClass = charMaster ? charMaster.cssClass : `farmer--${baseId}`;
  return CHAR_COLORS[cssClass] || CHAR_COLORS['farmer--man'];
}

/**
 * キャラクターモデルを再構築する
 * @param {THREE.Group} farmerGroup - 既存のfarmerGroup (子は全クリアされる)
 * @param {string|Object} charConfig - キャラのCSSクラス名、またはカスタマイズオブジェクト
 */
export function rebuildFarmerModel(farmerGroup, charConfig) {
  while (farmerGroup.children.length) {
    const c = farmerGroup.children[0];
    c.removeFromParent();
    if (c.geometry) c.geometry.dispose();
    if (c.material) c.material.dispose();
  }

  let cssClass;
  if (typeof charConfig === 'string') {
    cssClass = charConfig;
  } else {
    // base ID ('man') → cssClass ('farmer--man') に変換
    const baseId = charConfig.base || 'man';
    const charMaster = CHARACTER_MASTER[baseId];
    cssClass = charMaster ? charMaster.cssClass : `farmer--${baseId}`;
  }

  // 動物系は別Builder
  if (cssClass === 'farmer--dog') return buildDogModel(farmerGroup);
  if (cssClass === 'farmer--cat') return buildCatModel(farmerGroup);
  if (cssClass === 'farmer--snowman') return buildSnowmanModel(farmerGroup);

  // 人間系 — カスタムカラーがあればデフォルトに上書き適用
  const defaultColors = CHAR_COLORS[cssClass] || CHAR_COLORS['farmer--man'];
  const colors = (typeof charConfig === 'object' && charConfig.colors)
    ? { ...defaultColors, ...charConfig.colors }
    : defaultColors;
  buildHumanoidModel(farmerGroup, colors, typeof charConfig === 'object' ? charConfig : {});
}

function buildHumanoidModel(farmerGroup, c, config = {}) {
  const head = box(0.9, 0.9, 0.9, c.skin);
  head.position.set(0, 2.65, 0);
  head.castShadow = true;
  head.name = 'head';
  farmerGroup.add(head);

  const hair = box(0.95, 0.25, 0.95, c.hair);
  hair.position.set(0, 3.15, 0);
  farmerGroup.add(hair);

  const eyeGeo = new THREE.BoxGeometry(0.12, 0.12, 0.05);
  const eyeMat = new THREE.MeshLambertMaterial({ color: c.eyes || 0x222222 });
  const eL = new THREE.Mesh(eyeGeo, eyeMat);
  eL.position.set(-0.22, 2.7, 0.48);
  farmerGroup.add(eL);
  const eR = new THREE.Mesh(eyeGeo, eyeMat);
  eR.position.set(0.22, 2.7, 0.48);
  farmerGroup.add(eR);

  const body = box(0.9, 1.3, 0.6, c.body);
  body.position.set(0, 1.55, 0);
  body.castShadow = true;
  body.name = 'body';
  farmerGroup.add(body);

  const armL = box(0.3, 1.1, 0.3, c.skin);
  armL.position.set(-0.6, 1.55, 0);
  armL.castShadow = true;
  armL.name = 'armL';
  farmerGroup.add(armL);
  const armR = box(0.3, 1.1, 0.3, c.skin);
  armR.position.set(0.6, 1.55, 0);
  armR.castShadow = true;
  armR.name = 'armR';
  farmerGroup.add(armR);

  const legL = box(0.35, 0.9, 0.35, c.pants);
  legL.position.set(-0.22, 0.45, 0);
  legL.castShadow = true;
  legL.name = 'legL';
  farmerGroup.add(legL);
  const legR = box(0.35, 0.9, 0.35, c.pants);
  legR.position.set(0.22, 0.45, 0);
  legR.castShadow = true;
  legR.name = 'legR';
  farmerGroup.add(legR);

  // ─── 帽子パーツ ───
  if (config.hat === 'straw_hat') {
    const brim = cylinder(1.2, 1.2, 0.08, 0xe0c080);
    brim.position.set(0, 3.27, 0);
    const top = cylinder(0.55, 0.6, 0.55, 0xe0c080);
    top.position.set(0, 3.55, 0);
    farmerGroup.add(brim, top);
  } else if (config.hat === 'cap') {
    const capTop = box(1.1, 0.45, 1.1, 0xff0000);
    capTop.position.set(0, 3.3, 0);
    const brim = box(1.1, 0.08, 0.65, 0xff0000);
    brim.position.set(0, 3.1, 0.5);
    farmerGroup.add(capTop, brim);
  } else if (config.hat === 'bandana') {
    const band = box(1.0, 0.2, 1.0, 0x3366cc);
    band.position.set(0, 3.18, 0);
    const knot = box(0.2, 0.25, 0.3, 0x3366cc);
    knot.position.set(0, 3.15, -0.55);
    farmerGroup.add(band, knot);
  } else if (config.hat === 'crown') {
    const base = cylinder(0.55, 0.55, 0.2, 0xffd700);
    base.position.set(0, 3.25, 0);
    const gem = box(0.15, 0.3, 0.15, 0xff2222);
    gem.position.set(0, 3.5, 0.45);
    const spikeL = box(0.12, 0.25, 0.12, 0xffd700);
    spikeL.position.set(-0.3, 3.48, 0.3);
    const spikeR = box(0.12, 0.25, 0.12, 0xffd700);
    spikeR.position.set(0.3, 3.48, 0.3);
    farmerGroup.add(base, gem, spikeL, spikeR);
  } else if (config.hat === 'headband') {
    const band = box(1.0, 0.15, 1.0, 0xffffff);
    band.position.set(0, 3.05, 0);
    const mark = box(0.2, 0.2, 0.05, 0xff3333);
    mark.position.set(0, 3.05, 0.5);
    farmerGroup.add(band, mark);
  } else if (config.hat === 'halo') {
    const ring = cylinder(0.6, 0.6, 0.06, 0xffffaa);
    ring.position.set(0, 3.55, 0);
    ring.material.transparent = true;
    ring.material.opacity = 0.85;
    // 内側くり抜き風に薄い黒リングを重ねる
    const inner = cylinder(0.4, 0.4, 0.08, 0x000000);
    inner.position.set(0, 3.55, 0);
    inner.material.transparent = true;
    inner.material.opacity = 0.0;
    farmerGroup.add(ring);
  } else if (config.hat === 'wizard_hat') {
    const brim = cylinder(0.9, 0.9, 0.06, 0x4422aa);
    brim.position.set(0, 3.2, 0);
    const cone = cylinder(0.05, 0.5, 1.0, 0x4422aa);
    cone.position.set(0, 3.75, 0);
    const star = box(0.15, 0.15, 0.05, 0xffdd00);
    star.position.set(0.15, 3.6, 0.35);
    farmerGroup.add(brim, cone, star);
  } else if (config.hat === 'flower_crown') {
    const vine = cylinder(0.55, 0.55, 0.12, 0x2d8040);
    vine.position.set(0, 3.2, 0);
    const colors = [0xff6688, 0xffcc44, 0xff88cc, 0x66ccff];
    for (let i = 0; i < 4; i++) {
      const flower = sphere(0.1, colors[i]);
      const angle = (i / 4) * Math.PI * 2;
      flower.position.set(Math.cos(angle) * 0.5, 3.3, Math.sin(angle) * 0.5);
      farmerGroup.add(flower);
    }
    farmerGroup.add(vine);
  } else if (config.hat === 'top_hat') {
    const brim = cylinder(0.7, 0.7, 0.06, 0x111111);
    brim.position.set(0, 3.2, 0);
    const top = cylinder(0.4, 0.4, 0.8, 0x111111);
    top.position.set(0, 3.65, 0);
    const ribbon = cylinder(0.42, 0.42, 0.1, 0xcc2222);
    ribbon.position.set(0, 3.3, 0);
    farmerGroup.add(brim, top, ribbon);
  }

  // ─── アクセサリパーツ ───
  if (config.accessory === 'watering_can') {
    const can = box(0.4, 0.4, 0.4, 0x88bbff);
    can.position.set(0, -0.5, 0.3);
    armR.add(can);
  } else if (config.accessory === 'hoe') {
    const handle = box(0.08, 1.2, 0.08, 0x8B6914);
    handle.position.set(0, -0.2, 0.15);
    handle.rotation.z = -0.3;
    const blade = box(0.35, 0.08, 0.15, 0x888888);
    blade.position.set(0.1, -0.8, 0.15);
    armR.add(handle, blade);
  } else if (config.accessory === 'basket') {
    const base = cylinder(0.3, 0.25, 0.3, 0xc89050);
    base.position.set(0, -0.4, 0.3);
    armL.add(base);
  } else if (config.accessory === 'scarf') {
    const wrap = box(1.0, 0.25, 0.7, 0xcc3333);
    wrap.position.set(0, 2.05, 0);
    const tail = box(0.2, 0.5, 0.15, 0xcc3333);
    tail.position.set(0.35, 1.8, 0.3);
    farmerGroup.add(wrap, tail);
  } else if (config.accessory === 'seed_bag') {
    const bag = box(0.35, 0.4, 0.25, 0xddbb77);
    bag.position.set(0, -0.4, 0.3);
    armR.add(bag);
  } else if (config.accessory === 'gold_medal') {
    const ribbon = box(0.2, 0.25, 0.05, 0xff2222);
    ribbon.position.set(0, 1.85, 0.32);
    const medal = cylinder(0.15, 0.15, 0.04, 0xffd700);
    medal.position.set(0, 1.6, 0.32);
    medal.rotation.x = Math.PI / 2;
    farmerGroup.add(ribbon, medal);
  } else if (config.accessory === 'umbrella') {
    const handle = box(0.06, 1.0, 0.06, 0x8B6914);
    handle.position.set(0, 0.2, 0.15);
    const canopy = cylinder(0.6, 0.0, 0.35, 0x3388cc);
    canopy.position.set(0, 0.8, 0.15);
    armR.add(handle, canopy);
  } else if (config.accessory === 'wings') {
    const wingL = box(0.05, 0.7, 0.5, 0xffffff);
    wingL.position.set(-0.35, 1.8, -0.35);
    wingL.rotation.y = 0.3;
    wingL.material.transparent = true;
    wingL.material.opacity = 0.75;
    const wingR = box(0.05, 0.7, 0.5, 0xffffff);
    wingR.position.set(0.35, 1.8, -0.35);
    wingR.rotation.y = -0.3;
    wingR.material.transparent = true;
    wingR.material.opacity = 0.75;
    farmerGroup.add(wingL, wingR);
  }
}

function buildDogModel(farmerGroup) {
  const c = 0xd89f50;
  const w = 0xffffff;

  const bodyTop = box(1.4, 0.4, 0.8, c);
  bodyTop.position.set(0, 1.0, 0);
  bodyTop.castShadow = true;
  farmerGroup.add(bodyTop);
  
  const bodyBot = box(1.4, 0.3, 0.8, w);
  bodyBot.position.set(0, 0.65, 0);
  bodyBot.castShadow = true;
  farmerGroup.add(bodyBot);

  const head = box(0.8, 0.8, 0.8, c);
  head.position.set(0.8, 1.5, 0);
  head.castShadow = true;
  farmerGroup.add(head);

  const muzzle = box(0.4, 0.4, 0.82, w);
  muzzle.position.set(1.0, 1.35, 0);
  farmerGroup.add(muzzle);

  const nose = box(0.2, 0.2, 0.2, 0x333333);
  nose.position.set(1.25, 1.45, 0);
  farmerGroup.add(nose);

  const legFL = box(0.3, 0.6, 0.3, w);
  legFL.position.set(0.45, 0.3, -0.25);
  legFL.castShadow = true;
  farmerGroup.add(legFL);

  const legFR = box(0.3, 0.6, 0.3, w);
  legFR.position.set(0.45, 0.3, 0.25);
  legFR.castShadow = true;
  farmerGroup.add(legFR);

  const legBL = box(0.3, 0.6, 0.3, w);
  legBL.position.set(-0.45, 0.3, -0.25);
  legBL.castShadow = true;
  farmerGroup.add(legBL);

  const legBR = box(0.3, 0.6, 0.3, w);
  legBR.position.set(-0.45, 0.3, 0.25);
  legBR.castShadow = true;
  farmerGroup.add(legBR);

  const earL = box(0.2, 0.4, 0.2, c);
  earL.position.set(0.6, 2.0, -0.3);
  farmerGroup.add(earL);

  const earR = box(0.2, 0.4, 0.2, c);
  earR.position.set(0.6, 2.0, 0.3);
  farmerGroup.add(earR);

  const tail = box(0.3, 0.4, 0.3, c);
  tail.position.set(-0.7, 1.3, 0);
  tail.rotation.z = Math.PI / 4;
  farmerGroup.add(tail);
}

function buildCatModel(farmerGroup) {
  const cw = 0xffffff;
  const cb = 0x333333;
  const co = 0xe08020;

  const body = box(1.2, 0.6, 0.6, cw);
  body.position.set(0, 0.8, 0);
  body.castShadow = true;
  farmerGroup.add(body);

  const patch1 = box(0.4, 0.62, 0.62, cb);
  patch1.position.set(-0.3, 0.8, 0);
  farmerGroup.add(patch1);
  
  const patch2 = box(0.3, 0.62, 0.62, co);
  patch2.position.set(0.3, 0.8, 0);
  farmerGroup.add(patch2);

  const head = box(0.7, 0.7, 0.7, cw);
  head.position.set(0.6, 1.3, 0);
  head.castShadow = true;
  farmerGroup.add(head);

  const legFL = box(0.2, 0.5, 0.2, cw);
  legFL.position.set(0.3, 0.25, -0.15);
  legFL.castShadow = true;
  farmerGroup.add(legFL);

  const legFR = box(0.2, 0.5, 0.2, cw);
  legFR.position.set(0.3, 0.25, 0.15);
  legFR.castShadow = true;
  farmerGroup.add(legFR);

  const headPatch = box(0.72, 0.32, 0.72, co);
  headPatch.position.set(0.6, 1.51, 0);
  farmerGroup.add(headPatch);

  const earL = box(0.2, 0.3, 0.2, cb);
  earL.position.set(0.48, 1.7, -0.25);
  earL.rotation.z = 0.3;
  farmerGroup.add(earL);
  
  const earR = box(0.2, 0.3, 0.2, co);
  earR.position.set(0.48, 1.7, 0.25);
  earR.rotation.z = 0.3;
  farmerGroup.add(earR);

  const legBL = box(0.2, 0.5, 0.2, cw);
  legBL.position.set(-0.3, 0.25, -0.15);
  legBL.castShadow = true;
  farmerGroup.add(legBL);

  const legBR = box(0.2, 0.5, 0.2, cw);
  legBR.position.set(-0.3, 0.25, 0.15);
  legBR.castShadow = true;
  farmerGroup.add(legBR);

  const tail = box(0.15, 0.7, 0.15, cb);
  tail.position.set(-0.6, 1.0, 0);
  tail.rotation.z = -0.3;
  farmerGroup.add(tail);
}

function buildSnowmanModel(farmerGroup) {
  const bottom = sphere(0.7, 0xffffff);
  bottom.position.set(0, 0.7, 0);
  bottom.castShadow = true;
  farmerGroup.add(bottom);

  const mid = sphere(0.5, 0xffffff);
  mid.position.set(0, 1.7, 0);
  mid.castShadow = true;
  farmerGroup.add(mid);

  const head = sphere(0.4, 0xffffff);
  head.position.set(0, 2.5, 0);
  head.castShadow = true;
  farmerGroup.add(head);

  const nose = cylinder(0.02, 0.08, 0.3, 0xff6600);
  nose.position.set(0, 2.45, 0.45);
  nose.rotation.x = -Math.PI / 2;
  farmerGroup.add(nose);

  const eyeGeo = new THREE.SphereGeometry(0.06, 4, 4);
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const eL = new THREE.Mesh(eyeGeo, eyeMat);
  eL.position.set(-0.15, 2.6, 0.35);
  farmerGroup.add(eL);
  const eR = new THREE.Mesh(eyeGeo, eyeMat);
  eR.position.set(0.15, 2.6, 0.35);
  farmerGroup.add(eR);

  for (let i = 0; i < 3; i++) {
    const btn = new THREE.Mesh(eyeGeo, eyeMat);
    btn.position.set(0, 1.4 + i * 0.25, 0.48);
    farmerGroup.add(btn);
  }

  const brim = cylinder(0.5, 0.5, 0.08, 0x222222);
  brim.position.set(0, 2.85, 0);
  farmerGroup.add(brim);
  const hat = cylinder(0.3, 0.3, 0.4, 0x222222);
  hat.position.set(0, 3.1, 0);
  farmerGroup.add(hat);
}
