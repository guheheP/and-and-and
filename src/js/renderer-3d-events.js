// renderer-3d-events.js — 3D天気・イベント・時計・雲
// 天気パーティクル、横断オブジェクト、訪問動物、3D時計、雲の構築

import * as THREE from 'three';

// ─ Helpers ─
function box(w, h, d, color) {
  const geo = new THREE.BoxGeometry(w, h, d);
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
//  3D Clock
// ═══════════════════════════════════════════

let clockMesh = null;
let clockCanvas = null;
let clockCtx = null;
let clockTexture = null;
let lastClockMinute = -1;

export function build3DClock(scene, CONFIG) {
  clockCanvas = document.createElement('canvas');
  clockCanvas.width = 1024;
  clockCanvas.height = 256;
  clockCtx = clockCanvas.getContext('2d');

  clockTexture = new THREE.CanvasTexture(clockCanvas);
  clockTexture.minFilter = THREE.LinearFilter;

  const geo = new THREE.PlaneGeometry(20, 5);
  const mat = new THREE.MeshBasicMaterial({
    map: clockTexture,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  clockMesh = new THREE.Mesh(geo, mat);

  clockMesh.position.set(CONFIG.cameraLookAt.x, 4.0, -3);
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

  // フォントと文字詰めをCSS版に寄せる
  clockCtx.font = "200px 'VT323', 'Courier New', monospace";
  clockCtx.textAlign = 'center';
  clockCtx.textBaseline = 'middle';
  clockCtx.letterSpacing = "10px";

  // CSS版の text-shadow: 0 0 10px rgba(255,255,255,0.3) を再現
  clockCtx.shadowColor = 'rgba(255, 255, 255, 0.4)';
  clockCtx.shadowBlur = 30;
  clockCtx.shadowOffsetX = 0;
  clockCtx.shadowOffsetY = 0;

  // CSS版の color: rgba(255,255,255,0.4) に近い半透明の白
  clockCtx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  clockCtx.fillText(`${hh}:${mm}`, 512, 128);

  clockTexture.needsUpdate = true;
}

export function update3DClock() {
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
//  Clouds
// ═══════════════════════════════════════════

export function buildClouds(cloudsGroup) {
  for (let i = 0; i < 6; i++) {
    const cloud = new THREE.Group();

    const baseW = 3 + Math.random() * 2;
    const baseD = 2 + Math.random() * 2;
    const base = cloudBox(baseW, 0.6, baseD, 0xffffff, 0.35);
    cloud.add(base);

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

// ═══════════════════════════════════════════
//  Weather & Event Visuals
// ═══════════════════════════════════════════

export function startEventVisual(event, { scene, weatherGroup, activeAnimators, CONFIG, updateClearColor, renderer3d }) {
  switch (event.id) {
    case 'rain': 
      spawnWeatherParticles('rain', 0xaaccff, 0.4, 300, 0, weatherGroup, activeAnimators); 
      setMudVisual(scene, true);
      break;
    case 'heavy_rain': 
      spawnWeatherParticles('rain', 0x88bbdd, 0.6, 600, 0, weatherGroup, activeAnimators); 
      setMudVisual(scene, true);
      break;
    case 'diamond_rain': spawnWeatherParticles('diamond', 0xbbeeff, 0.5, 400, 0, weatherGroup, activeAnimators); break;
    case 'snow': spawnWeatherParticles('snow', 0xffffff, 0.1, 400, 0, weatherGroup, activeAnimators); break;
    case 'thunder':
      spawnWeatherParticles('rain', 0x99aabb, 0.5, 500, 0, weatherGroup, activeAnimators);
      setMudVisual(scene, true);
      let flashTime = Date.now() + 1000 + Math.random() * 2000;
      activeAnimators.push({
        type: 'thunder',
        update: (dt, t) => {
          if (t > flashTime) {
            triggerThunderFlash(scene, CONFIG, updateClearColor, renderer3d);
            flashTime = t + 2000 + Math.random() * 4000;
          }
          return true;
        }
      });
      break;
    case 'typhoon': 
      spawnWeatherParticles('rain', 0x7799bb, 0.8, 800, 0.4, weatherGroup, activeAnimators); 
      setMudVisual(scene, true);
      break;
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
    case 'tumbleweed': spawnCrossingObject3D('tumbleweed', scene, activeAnimators); break;
    case 'bird_poop': spawnCrossingObject3D('bird', scene, activeAnimators); break;
    case 'stork': spawnCrossingObject3D('stork', scene, activeAnimators); break;
    case 'santa': spawnCrossingObject3D('santa', scene, activeAnimators); break;
    case 'john': spawnJohnVisit3D(weatherGroup, activeAnimators); break;
    case 'dog_visit': spawnStaticAnimal3D('dog_visit', weatherGroup, activeAnimators); break;
    case 'cat_visit': spawnStaticAnimal3D('cat_visit', weatherGroup, activeAnimators); break;
  }
}

export function stopAllEventVisuals({ scene, weatherGroup, activeAnimators, CONFIG, updateClearColor }) {
  // アニメーターのクリーンアップ（天気はフェードアウトフラグを立てて残す）
  for (let i = activeAnimators.length - 1; i >= 0; i--) {
    const anim = activeAnimators[i];
    if (anim.type === 'weather') {
      anim.fadeOut = true;
    } else if (anim.type !== 'crossing' && anim.type !== 'poop' && anim.type !== 'thunder') {
      if (anim.mesh) anim.mesh.removeFromParent();
      activeAnimators.splice(i, 1);
    }
  }

  // weatherGroupのクリーンアップ（天気パーティクル以外は即削除）
  for (let i = weatherGroup.children.length - 1; i >= 0; i--) {
    const c = weatherGroup.children[i];
    if (!c.isPoints) {
      c.removeFromParent();
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }
  }

  scene.children.forEach(c => {
    if (c.isAmbientLight) c.intensity = CONFIG.ambientIntensity;
  });
  updateClearColor();
  setMudVisual(scene, false); // 元の土の色に戻す
}

function triggerThunderFlash(scene, CONFIG, updateClearColor, renderer3d) {
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

function spawnWeatherParticles(type, colorHex, speed, count, slantX, weatherGroup, activeAnimators) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = -15 + Math.random() * 30;
    pos[i * 3 + 1] = Math.random() * 15;
    pos[i * 3 + 2] = -5 + Math.random() * 15;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  let mat;
  const targetOpacity = type === 'snow' ? 0.8 : 0.6;
  if (type === 'snow') {
    mat = new THREE.PointsMaterial({ color: colorHex, size: 5, transparent: true, opacity: 0 });
  } else {
    mat = new THREE.PointsMaterial({ color: colorHex, size: type === 'diamond' ? 8 : 4, transparent: true, opacity: 0 });
  }

  const points = new THREE.Points(geo, mat);
  weatherGroup.add(points);

  let fadeTime = 0;

  const animObj = {
    type: 'weather',
    mesh: points,
    fadeOut: false,
    update: (dt) => {
      // フェードイン / フェードアウト制御
      if (!animObj.fadeOut) {
        if (fadeTime < 2000) {
          fadeTime += dt;
          mat.opacity = Math.min(targetOpacity, (fadeTime / 2000) * targetOpacity);
        }
      } else {
        fadeTime -= dt * 2; // フェードアウトは少し早め
        if (fadeTime <= 0) {
          points.removeFromParent();
          points.geometry.dispose();
          points.material.dispose();
          return false; // アニメーターから削除
        }
        mat.opacity = Math.max(0, (fadeTime / 2000) * targetOpacity);
      }

      const positions = points.geometry.attributes.position.array;
      for (let i = 0; i < count; i++) {
        let x = positions[i * 3];
        let y = positions[i * 3 + 1];

        y -= speed;
        x += slantX;

        if (type === 'snow') {
          x += Math.sin(y * 2) * 0.02;
        }

        if (y < -1) y = 15;
        if (x > 15) x = -15;

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
      }
      points.geometry.attributes.position.needsUpdate = true;
      return true;
    }
  };
  activeAnimators.push(animObj);
}

function setMudVisual(scene, isMuddy) {
  scene.traverse((c) => {
    if (c.userData && c.userData.isSoil && c.material) {
      if (isMuddy) {
        c.material.color.setHex(c.userData.isDark ? 0x3a2517 : 0x4a3221); // Darker mud
      } else {
        c.material.color.setHex(c.userData.isDark ? 0x684b31 : 0x8a6042); // Normal soil
      }
    }
  });
}

function spawnCrossingObject3D(type, scene, activeAnimators) {
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
    moveY = 0.5;
    moveZ = 2 + Math.random() * 3;
    rotSpeed = 0.1;
    speed = 0.03 + Math.random() * 0.02;
  } else if (type === 'bird') {
    const b1 = box(0.5, 0.3, 0.4, 0xffffff);
    const b2 = box(0.2, 0.1, 0.8, 0xffffff);
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
        grp.position.y = moveY + Math.sin(grp.position.x * 5) * 0.2;
      } else if (type === 'bird' || type === 'stork') {
        grp.children[1].rotation.x = Math.sin(grp.position.x * 10) * 0.5;
      }

      if (grp.position.x > endX) {
        return false;
      }
      return true;
    }
  });

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

function spawnStaticAnimal3D(type, weatherGroup, activeAnimators) {
  const grp = new THREE.Group();

  if (type === 'dog_visit') {
    const c = 0xd89f50;
    const w = 0xffffff;

    const bodyTop = box(1.4, 0.4, 0.8, c);
    bodyTop.position.set(0, 1.0, 0);
    const bodyBot = box(1.4, 0.3, 0.8, w);
    bodyBot.position.set(0, 0.65, 0);

    const head = box(0.8, 0.8, 0.8, c);
    head.position.set(0.8, 1.4, 0);

    const muzzle = box(0.4, 0.4, 0.82, w);
    muzzle.position.set(1.0, 1.25, 0);

    const earL = box(0.2, 0.4, 0.2, c);
    earL.position.set(0.6, 1.9, -0.3);
    const earR = box(0.2, 0.4, 0.2, c);
    earR.position.set(0.6, 1.9, 0.3);

    const nose = box(0.2, 0.2, 0.2, 0x222222);
    nose.position.set(1.25, 1.3, 0);

    [[-0.5, -0.25], [0.5, -0.25], [-0.5, 0.25], [0.5, 0.25]].forEach(([x, z]) => {
      const leg = box(0.3, 0.6, 0.3, w);
      leg.position.set(x, 0.3, z);
      grp.add(leg);
    });

    const tail = box(0.3, 0.4, 0.3, c);
    tail.position.set(-0.7, 1.3, 0);
    tail.rotation.z = Math.PI / 4;

    grp.add(bodyTop, bodyBot, head, muzzle, earL, earR, nose, tail);
  } else {
    const cw = 0xffffff;
    const cb = 0x333333;
    const co = 0xe08020;

    const body = box(1.2, 0.6, 0.6, cw);
    body.position.set(0, 0.6, 0);
    const patch1 = box(0.4, 0.62, 0.62, cb);
    patch1.position.set(-0.3, 0.6, 0);
    const patch2 = box(0.3, 0.62, 0.62, co);
    patch2.position.set(0.3, 0.6, 0);

    const head = box(0.7, 0.7, 0.7, cw);
    head.position.set(0.7, 1.2, 0);
    const headPatch = box(0.72, 0.32, 0.72, co);
    headPatch.position.set(0.7, 1.41, 0);

    const earL = box(0.2, 0.3, 0.2, cb);
    earL.position.set(0.6, 1.6, -0.25);
    earL.rotation.z = 0.3;
    const earR = box(0.2, 0.3, 0.2, co);
    earR.position.set(0.6, 1.6, 0.25);
    earR.rotation.z = 0.3;

    [[-0.4, -0.15], [0.4, -0.15], [-0.4, 0.15], [0.4, 0.15]].forEach(([x, z]) => {
      const leg = box(0.2, 0.4, 0.2, cw);
      leg.position.set(x, 0.2, z);
      grp.add(leg);
    });
    const tail = box(0.15, 0.7, 0.15, cb);
    tail.position.set(-0.6, 0.8, 0);
    tail.rotation.z = -0.3;

    grp.add(body, patch1, patch2, head, headPatch, earL, earR, tail);
  }

  grp.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
    }
  });

  if (type === 'cat_visit') {
    grp.position.set(-4 + Math.random(), 0, 4 + Math.random() * 2);
    grp.rotation.y = Math.PI / 4 + Math.random() * 0.5;
    weatherGroup.add(grp);

    activeAnimators.push({
      type: 'animal_visit',
      mesh: grp,
      update: (dt, t) => {
        if (!grp.parent) return false;
        grp.position.y = Math.sin(t * 0.002) * 0.04;
        return true;
      }
    });
    return;
  }

  grp.position.set(-5 + Math.random() * 2, 0, 4 + Math.random() * 2);
  grp.rotation.y = Math.PI / 4 + Math.random() * 0.5;
  weatherGroup.add(grp);

  let targetX = grp.position.x;
  let targetZ = grp.position.z;
  let state = 'idle';
  let stateTimer = Date.now() + 1000;
  const walkSpeed = 0.04;

  activeAnimators.push({
    type: 'animal_visit',
    mesh: grp,
    update: (dt, t) => {
      if (!grp.parent) return false;

      if (t > stateTimer) {
        if (state === 'idle') {
          state = 'walk';
          const zone = Math.floor(Math.random() * 3);
          if (zone === 0) {
            targetX = -7 + Math.random() * 3;
            targetZ = Math.random() * 6;
          } else if (zone === 1) {
            targetX = 4 + Math.random() * 3;
            targetZ = Math.random() * 6;
          } else {
            targetX = -6 + Math.random() * 12;
            targetZ = 4.5 + Math.random() * 3;
          }
          const dx = targetX - grp.position.x;
          const dz = targetZ - grp.position.z;
          grp.rotation.y = Math.atan2(dx, dz);
          stateTimer = t + 1000 + Math.random() * 3000;
        } else {
          state = 'idle';
          stateTimer = t + 1000 + Math.random() * 2000;
        }
      }

      if (state === 'walk') {
        const dx = targetX - grp.position.x;
        const dz = targetZ - grp.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > 0.1) {
          grp.position.x += (dx / dist) * walkSpeed;
          grp.position.z += (dz / dist) * walkSpeed;
          grp.position.y = Math.abs(Math.sin(t * 0.015)) * 0.3;
        } else {
          state = 'idle';
          stateTimer = t + 500 + Math.random() * 2000;
        }
      } else {
        grp.position.y = 0;
      }

      return true;
    }
  });
}


function spawnJohnVisit3D(weatherGroup, activeAnimators) {
  const grp = new THREE.Group();

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

  grp.position.set(10, 0, 5);
  weatherGroup.add(grp);

  let state = 'enter';
  let targetX = 3 + Math.random() * 2;
  let targetZ = 2 + Math.random() * 2;

  const faceTarget = (tx, tz) => {
    const dx = tx - grp.position.x;
    const dz = tz - grp.position.z;
    grp.rotation.y = Math.atan2(dx, dz);
  };
  faceTarget(targetX, targetZ);

  const speed = 0.04;
  const startTime = Date.now();

  activeAnimators.push({
    type: 'animal_visit',
    mesh: grp,
    update: (dt, t) => {
      if (!grp.parent) return false;

      const elapsed = Date.now() - startTime;

      if (state === 'enter') {
        const dx = targetX - grp.position.x;
        const dz = targetZ - grp.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > 0.1) {
          grp.position.x += (dx / dist) * speed;
          grp.position.z += (dz / dist) * speed;
          grp.position.y = Math.abs(Math.sin(elapsed * 0.01)) * 0.2;
          legL.rotation.x = Math.sin(elapsed * 0.01) * 0.4;
          legR.rotation.x = -Math.sin(elapsed * 0.01) * 0.4;
          armL.rotation.x = -Math.sin(elapsed * 0.01) * 0.4;
          armR.rotation.x = Math.sin(elapsed * 0.01) * 0.4;
        } else {
          state = 'watch';
          grp.position.y = 0;
          legL.rotation.x = 0; legR.rotation.x = 0;
          armL.rotation.x = 0; armR.rotation.x = 0;
          faceTarget(0, 0);
        }
      } else if (state === 'watch') {
        if (elapsed > 10000) {
          state = 'exit';
          targetX = 12;
          targetZ = 6;
          faceTarget(targetX, targetZ);
        } else {
          head.rotation.x = Math.sin(elapsed * 0.003) * 0.1;
        }
      } else if (state === 'exit') {
        head.rotation.x = 0;
        const dx = targetX - grp.position.x;
        const dz = targetZ - grp.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > 0.1) {
          grp.position.x += (dx / dist) * speed;
          grp.position.z += (dz / dist) * speed;
          grp.position.y = Math.abs(Math.sin(elapsed * 0.01)) * 0.2;
          legL.rotation.x = Math.sin(elapsed * 0.01) * 0.4;
          legR.rotation.x = -Math.sin(elapsed * 0.01) * 0.4;
          armL.rotation.x = -Math.sin(elapsed * 0.01) * 0.4;
          armR.rotation.x = Math.sin(elapsed * 0.01) * 0.4;
        } else {
          grp.removeFromParent();
          return false;
        }
      }
      return true;
    }
  });
}

// ── 収穫パーティクルの共有プール ──
const harvestPool = [];
const MAX_HARVEST_PARTICLES = 60;
let harvestAnimRunning = false;

function tickHarvestPool() {
  if (harvestPool.length === 0) {
    harvestAnimRunning = false;
    return;
  }

  const now = Date.now();
  for (let i = harvestPool.length - 1; i >= 0; i--) {
    const p = harvestPool[i];
    const t = (now - p.startTime) / 1000;

    if (p.phase === 'pop') {
      if (t > p.popDuration) {
        // ポップ終了 → 散らばるフェーズに移行
        p.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        harvestPool.splice(i, 1);

        // パーティクル生成（上限チェック付き）
        const count = Math.min(12, MAX_HARVEST_PARTICLES - harvestPool.length);
        for (let j = 0; j < count; j++) {
          if (harvestPool.length >= MAX_HARVEST_PARTICLES) break;
          const size = 0.15 + Math.random() * 0.15;
          const pColor = Math.random() > 0.8 ? 0xffea00 : p.color;
          const particle = box(size, size, size, pColor);
          particle.material.transparent = true;
          particle.position.copy(p.originPos);
          p.scene.add(particle);

          harvestPool.push({
            phase: 'scatter',
            mesh: particle,
            scene: p.scene,
            startTime: now,
            vx: (Math.random() - 0.5) * 8,
            vy: 3 + Math.random() * 5,
            vz: (Math.random() - 0.5) * 8,
            duration: 0.5,
          });
        }
      } else {
        // サインカーブで上向きの弧を描く
        const progress = t / p.popDuration;
        p.mesh.position.y = 0.5 + Math.sin(progress * Math.PI) * 2.5;
        p.mesh.rotation.x += 0.2;
        p.mesh.rotation.y += 0.2;
      }
    } else if (p.phase === 'scatter') {
      if (t > p.duration) {
        p.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        harvestPool.splice(i, 1);
      } else {
        p.mesh.position.x += p.vx * 0.016;
        p.mesh.position.y += (p.vy - t * 15) * 0.016;
        p.mesh.position.z += p.vz * 0.016;
        p.mesh.rotation.x += 0.1;
        p.mesh.rotation.y += 0.1;
        p.mesh.material.opacity = 1 - t / p.duration;
      }
    }
  }

  requestAnimationFrame(tickHarvestPool);
}

export function showHarvestParticles(scene, cropId, CROP_HEX) {
  if (!scene) return;
  const color = CROP_HEX[cropId] || 0xffd700;

  // 古いパーティクルが溜まりすぎている場合、古いものを強制削除
  while (harvestPool.length >= MAX_HARVEST_PARTICLES - 5) {
    const old = harvestPool.shift();
    if (old && old.mesh && old.mesh.parent) {
      old.scene.remove(old.mesh);
      old.mesh.geometry.dispose();
      old.mesh.material.dispose();
    }
  }

  const bigCrop = box(0.6, 0.6, 0.6, color);
  bigCrop.position.set(0, 0.5, 0.5);
  scene.add(bigCrop);

  harvestPool.push({
    phase: 'pop',
    mesh: bigCrop,
    scene,
    color,
    originPos: bigCrop.position.clone(),
    startTime: Date.now(),
    popDuration: 0.3,
  });

  if (!harvestAnimRunning) {
    harvestAnimRunning = true;
    requestAnimationFrame(tickHarvestPool);
  }
}
