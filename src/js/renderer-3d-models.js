// renderer-3d-models.js — 3Dキャラクターモデル構築
// Farmer（人間/動物/雪だるま）の3Dモデルをtarget groupに生成する

import * as THREE from 'three';

// ─── Character colors ───
export const CHAR_COLORS = {
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

/**
 * キャラクターモデルを再構築する
 * @param {THREE.Group} farmerGroup - 既存のfarmerGroup (子は全クリアされる)
 * @param {string} cssClass - キャラのCSSクラス名
 */
export function rebuildFarmerModel(farmerGroup, cssClass) {
  while (farmerGroup.children.length) {
    const c = farmerGroup.children[0];
    c.removeFromParent();
    if (c.geometry) c.geometry.dispose();
    if (c.material) c.material.dispose();
  }

  // 動物系は別Builder
  if (cssClass === 'farmer--dog') return buildDogModel(farmerGroup);
  if (cssClass === 'farmer--cat') return buildCatModel(farmerGroup);
  if (cssClass === 'farmer--snowman') return buildSnowmanModel(farmerGroup);

  // 人間系
  const colors = CHAR_COLORS[cssClass] || CHAR_COLORS['farmer--man'];
  buildHumanoidModel(farmerGroup, colors);
}

function buildHumanoidModel(farmerGroup, c) {
  const head = box(0.9, 0.9, 0.9, c.skin);
  head.position.set(0, 3.1, 0);
  head.castShadow = true;
  farmerGroup.add(head);

  const hair = box(0.95, 0.25, 0.95, c.hair);
  hair.position.set(0, 3.6, 0);
  farmerGroup.add(hair);

  const eyeGeo = new THREE.BoxGeometry(0.12, 0.12, 0.05);
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const eL = new THREE.Mesh(eyeGeo, eyeMat);
  eL.position.set(-0.22, 3.15, 0.48);
  farmerGroup.add(eL);
  const eR = new THREE.Mesh(eyeGeo, eyeMat);
  eR.position.set(0.22, 3.15, 0.48);
  farmerGroup.add(eR);

  const body = box(0.9, 1.3, 0.6, c.body);
  body.position.set(0, 2.0, 0);
  body.castShadow = true;
  farmerGroup.add(body);

  const armL = box(0.3, 1.1, 0.3, c.skin);
  armL.position.set(-0.6, 2.0, 0);
  armL.castShadow = true;
  farmerGroup.add(armL);
  const armR = box(0.3, 1.1, 0.3, c.skin);
  armR.position.set(0.6, 2.0, 0);
  armR.castShadow = true;
  farmerGroup.add(armR);

  const legL = box(0.35, 0.9, 0.35, c.pants);
  legL.position.set(-0.22, 0.7, 0);
  legL.castShadow = true;
  farmerGroup.add(legL);
  const legR = box(0.35, 0.9, 0.35, c.pants);
  legR.position.set(0.22, 0.7, 0);
  legR.castShadow = true;
  farmerGroup.add(legR);
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
