
       });
     }
   
  +  // 3D譎りｨ医・譖ｴ譁ｰ
  +  update3DClock();
  +
     // 繧｢繧ｯ繝・ぅ繝悶い繝九Γ繝ｼ繧ｿ繝ｼ縺ｮ譖ｴ譁ｰ
     const dt = 16;
     for (let i = activeAnimators
.length - 1; i >= 0; i--) {
  @@ -914,6 +959,73 @@ export fun
ction triggerWorkAnimation() {
     }, 150);
   }
   
  +// 笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武
笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武
笊絶武笊・+//  3D Clock
  +// 笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武
笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武笊絶武
笊絶武笊・+
> +function build3DClock() {
  +  clockCanvas = document.creat
eElement('canvas');
  +  clockCanvas.width = 1024;
  +  clockCanvas.height = 256;
  +  clockCtx = clockCanvas.getCo
ntext('2d');
  +
  +  clockTexture = new THREE.Can
vasTexture(clockCanvas);
  +  clockTexture.minFilter = THR
EE.LinearFilter;
  +
  +  const geo = new THREE.PlaneG
eometry(24, 6);
  +  const mat = new THREE.MeshBa
sicMaterial({
  +    map: clockTexture,
  +    transparent: true,
  +    depthWrite: false,
  +    side: THREE.DoubleSide,
  +  });


