// Procedural geometry adapted from the supplied demo (Three.js MIT).
// No simulated inventory, capacities, route timers, GPS or WebMCP actions.
import * as THREE from './vendor/logistica-three/three.module.js';
import { OrbitControls } from './vendor/logistica-three/OrbitControls.js';

export function mountScene({host, labels, model, selected, onSelect, onError}) {
  let renderer, controls, resizeObserver, frame=0, disposed=false, tween=null;
  const scene=new THREE.Scene();
  const cubeGeometry=new THREE.BoxGeometry(1,1,1);
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const cleanups=[];
  let trucks=[], truckSignature='', currentSelection=selected;
  function disposeObjects(object, keepGeometry=new Set(), keepMaterials=new Set()) {
    const geometries=new Set(), materials=new Set();
    object.traverse(o=>{if(o.geometry&&!keepGeometry.has(o.geometry))geometries.add(o.geometry);
      for(const m of [].concat(o.material||[]))if(!keepMaterials.has(m))materials.add(m)});
    geometries.forEach(g=>g.dispose());
    materials.forEach(m=>{for(const v of Object.values(m))if(v&&v.isTexture)v.dispose();m.dispose()});
  }
  function listen(target, name, handler, options) {
    target.addEventListener(name,handler,options);
    cleanups.push(()=>target.removeEventListener(name,handler,options));
  }
  function dispose() {
    if(disposed)return; disposed=true;
    cancelAnimationFrame(frame); frame=0; tween=null;
    resizeObserver?.disconnect(); cleanups.forEach(fn=>fn()); controls?.dispose();
    disposeObjects(scene); cubeGeometry.dispose();
    renderer?.renderLists.dispose(); renderer?.dispose(); renderer?.forceContextLoss();
    renderer?.domElement.remove(); labels.replaceChildren();
  }
  try {
  const mobile=host.clientWidth<650;
  renderer=new THREE.WebGLRenderer({antialias:!mobile,alpha:false,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1:1.5));
  renderer.shadowMap.enabled=!mobile;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
  renderer.setClearColor(0x0b2034);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  renderer.domElement.setAttribute('aria-label','Vista conceptual de los depósitos y vehículos. Seleccioná también con los botones debajo.');
  renderer.domElement.setAttribute('role','img');
  host.appendChild(renderer.domElement);
  const camera=new THREE.OrthographicCamera(-30,30,22,-22,.1,220);
  camera.position.set(35,35,45);
  controls=new OrbitControls(camera,renderer.domElement);
  controls.target.set(0,0,3);controls.enableDamping=false;controls.enablePan=false;
  controls.minZoom=.75;controls.maxZoom=1.6;controls.minPolarAngle=.35;controls.maxPolarAngle=1.18;
  controls.maxAzimuthAngle=1.5;controls.minAzimuthAngle=-1.5;
  controls.enableZoom=false; controls.update();
  if(mobile){controls.enableRotate=false;renderer.domElement.style.touchAction='pan-y';}
  scene.add(new THREE.HemisphereLight(0xd9efff,0x25463d,1.5));
  const sun=new THREE.DirectionalLight(0xffe0b3,2.8);
  sun.position.set(-15,35,20);sun.castShadow=!mobile;sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-32,right:32,top:32,bottom:-32,near:.5,far:90});
  sun.shadow.normalBias=.035;sun.shadow.bias=-.00015;scene.add(sun);
  const fill=new THREE.DirectionalLight(0x70cbdc,1.2);fill.position.set(25,12,-25);scene.add(fill);

  // Continuous industrial yard; procedural textures stay local and contain no operational data.
  const textures=new Set(),staticBoxes=[],pickMaterial=new THREE.MeshBasicMaterial();
  let seed=307;
  function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
  function canvasTexture(size,paint){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
    paint(canvas.getContext('2d'),size);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());textures.add(texture);return texture;
  }
  const asphalt=canvasTexture(512,(ctx,n)=>{
    ctx.fillStyle='#424b51';ctx.fillRect(0,0,n,n);
    for(let i=0;i<26000;i++){const v=Math.floor(random()*50+35);ctx.fillStyle='rgba('+v+','+(v+5)+','+(v+7)+',.38)';ctx.fillRect(random()*n,random()*n,1+random()*2,1+random()*2);}
    for(let x=0;x<n;x+=128){ctx.strokeStyle='#202c3140';ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+7,n);ctx.stroke();}
  });asphalt.wrapS=asphalt.wrapT=THREE.RepeatWrapping;asphalt.repeat.set(14,14);
  const metal=canvasTexture(256,(ctx,n)=>{
    ctx.fillStyle='#c5cbd0';ctx.fillRect(0,0,n,n);
    for(let i=0;i<n;i+=8){ctx.fillStyle='#83929d';ctx.fillRect(i,0,1,n);ctx.fillStyle='#e6edf1';ctx.fillRect(i+2,0,2,n);}
    for(let i=0;i<3000;i++){ctx.fillStyle='#30445a10';ctx.fillRect(random()*n,random()*n,1,2);}
  });metal.wrapS=metal.wrapT=THREE.RepeatWrapping;metal.repeat.set(2,1);
  const glowMap=canvasTexture(128,(ctx,n)=>{const g=ctx.createRadialGradient(n/2,n/2,1,n/2,n/2,n/2);g.addColorStop(0,'#fff7eacc');g.addColorStop(.28,'#ffd58e80');g.addColorStop(1,'#ffd58e00');ctx.fillStyle=g;ctx.fillRect(0,0,n,n)});
  const shadowMap=canvasTexture(128,(ctx,n)=>{const g=ctx.createRadialGradient(n/2,n/2,0,n/2,n/2,n/2);g.addColorStop(0,'#00000099');g.addColorStop(1,'#00000000');ctx.fillStyle=g;ctx.fillRect(0,0,n,n)});
  const mats={
    white:new THREE.MeshStandardMaterial({color:0xe0e3df,roughness:.6}),
    wall:new THREE.MeshStandardMaterial({map:metal,color:0xd1d6d8,roughness:.63,metalness:.2}),
    navy:new THREE.MeshStandardMaterial({color:0x163348,roughness:.55,metalness:.25}),
    roof:new THREE.MeshStandardMaterial({map:metal,color:0x9aabba,roughness:.62,metalness:.25}),
    concrete:new THREE.MeshStandardMaterial({color:0x8e9293,roughness:.96}),
    road:new THREE.MeshStandardMaterial({map:asphalt,color:0xbac0c4,roughness:.63,metalness:.08}),
    line:new THREE.MeshStandardMaterial({color:0xd3d8d5,roughness:.8}),
    black:new THREE.MeshStandardMaterial({color:0x101820,roughness:.85}),
    glass:new THREE.MeshStandardMaterial({color:0x163949,roughness:.12,metalness:.7}),
    orange:new THREE.MeshStandardMaterial({color:0xe7b242,roughness:.75}),
    green:new THREE.MeshStandardMaterial({color:0x2c4e35,roughness:1}),
    trunk:new THREE.MeshStandardMaterial({color:0x625741,roughness:1}),
    wood:new THREE.MeshStandardMaterial({color:0xb7a182,roughness:1}),
    lamp:new THREE.MeshBasicMaterial({color:0xffe3ae}),
    chrome:new THREE.MeshStandardMaterial({color:0xb2bbc0,metalness:.8,roughness:.24}),
    contact:new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false}),
    glow:new THREE.MeshBasicMaterial({map:glowMap,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending})
  };
  const box=(w,h,d,mat,x=0,y=0,z=0,parent=scene)=>{
    const mesh=new THREE.Mesh(cubeGeometry,mat);mesh.scale.set(w,h,d);mesh.position.set(x,y,z);
    mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
    if(parent===scene)staticBoxes.push(mesh);return mesh;
  };
  const cylinderGeometry=new THREE.CylinderGeometry(1,1,1,12);
  const planeGeometry=new THREE.PlaneGeometry(1,1);
  function cyl(r,h,mat,x,y,z,parent=scene){
    const mesh=new THREE.Mesh(cylinderGeometry,mat);mesh.scale.set(r,h,r);mesh.position.set(x,y,z);
    mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function groundDecal(w,d,mat,x,z){const m=new THREE.Mesh(planeGeometry,mat);m.rotation.x=-Math.PI/2;m.scale.set(w,d,1);m.position.set(x,.035,z);scene.add(m);return m;}
  box(190,.2,190,mats.road,0,-.15,0).castShadow=false;
  const clickables=[],depotLabels=[];let truckMeshes=[],truckLabels=[];
  function label(value,sub,pos,cls='depot-label'){
    const el=document.createElement('div');el.className=cls;el.textContent=value;
    if(sub){const small=document.createElement('small');small.textContent=sub;el.appendChild(small);}
    labels.appendChild(el);return {el,pos:new THREE.Vector3(...pos)};
  }
  function sign(value,w,h,x,y,z,parent=scene,color='#edf6fd',background='#173448'){
    const map=canvasTexture(512,(ctx,n)=>{ctx.fillStyle=background;ctx.fillRect(0,0,n,n);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold '+(value.length>12?42:75)+'px Arial';ctx.fillText(value,n/2,n/2,n-45)});
    const m=new THREE.Mesh(planeGeometry,new THREE.MeshStandardMaterial({map,roughness:.7,emissive:0x10252c,emissiveIntensity:.12}));
    m.scale.set(w,h,1);m.position.set(x,y,z);parent.add(m);return m;
  }
  function pickBox(w,h,d,x,y,z,data){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),pickMaterial);
    mesh.position.set(x,y,z);Object.assign(mesh.userData,data);mesh.updateMatrixWorld();clickables.push(mesh);
  }
  function pallet(x,z,count=4){
    box(1.3,.12,1.2,mats.wood,x,.12,z);
    for(let a=-.46;a<.6;a+=.46)box(.12,.14,1.16,mats.wood,x+a,.22,z);
    for(let k=0;k<count;k++){
      box(1.15,.21,1.08,k%2?mats.white:mats.wall,x,.42+k*.23,z);
      box(.035,.23,1.095,mats.wood,x-.37,.42+k*.23,z);
      box(.035,.23,1.095,mats.wood,x+.37,.42+k*.23,z);
    }
  }
  function warehouse(name,x,z,w,d){
    box(w+.8,.2,d+1,mats.concrete,x,.1,z);
    box(w,4.4,d,mats.wall,x,2.4,z);
    box(w+.08,1.15,.16,mats.navy,x,3.35,z+d/2+.04);
    sign(name==='PTF'?'M  PTF':name,w*.75,1.02,x,3.35,z+d/2+.14);
    const roof=box(w+.35,.22,d+.35,mats.roof,x,4.69,z);
    // Roof seams, skylights, ridge and rooftop ventilation.
    for(let k=-w/2;k<=w/2;k+=.8)box(.035,.04,d+.25,mats.chrome,x+k,4.83,z);
    box(w+.4,.12,.15,mats.white,x,4.91,z);
    for(let k=-1;k<=1;k++){
      box(1.9,.07,2.1,mats.glass,x+k*w/3.7,4.86,z-1.2);
      box(.75,.46,.8,mats.white,x+k*w/3.7,5.0,z-d/2+1.3);
      for(let j=0;j<3;j++)box(.05,.18,.86,mats.chrome,x+k*w/3.7-.25+j*.25,5.22,z-d/2+1.3);
    }
    for(let k=-1;k<=1;k++){
      const dx=x+k*w/3.5,fz=z+d/2;
      box(2.75,2.7,.18,mats.navy,dx,1.52,fz+.14);
      box(2.32,2.29,.2,mats.roof,dx,1.32,fz+.25);
      for(let j=.28;j<2.4;j+=.18)box(2.34,.027,.055,mats.chrome,dx,j,fz+.37);
      box(2.8,.18,1.25,mats.concrete,dx,.2,fz+.78);
      sign(String(k+2),.5,.42,dx,2.97,fz+.145,scene,'#fff6de');
      box(1.1,.09,.13,mats.lamp,dx,2.69,fz+.46);
      groundDecal(4,5,mats.glow,dx,fz+1.5);
      for(const side of [-1,1]){
        cyl(.08,.7,mats.orange,dx+side*1.45,.45,fz+1.04);
        box(.06,.72,.07,mats.black,dx+side*1.46,.47,fz+1.09);
      }
      // Loading bay guides are generic road markings, never vehicle assignments.
      box(.05,.01,4.8,mats.orange,dx-1.6,.011,fz+3.3);
      box(.05,.01,4.8,mats.orange,dx+1.6,.011,fz+3.3);
      pallet(dx+1.95,fz+1.5,4+(k+1)%2);
      pallet(dx+2.1,fz+3.05,3);
    }
    for(const side of [-1,1])box(.13,4.5,.15,mats.white,x+side*(w/2-.12),2.46,z+d/2+.16);
    groundDecal(w+4,d+4,mats.contact,x,z);
    pickBox(w,5,d,x,2.5,z,{depot:name});
    depotLabels.push(label(name,'Depósito',[x,5.6,z+d/2]));
  }
  warehouse('BANZER',-15,-11,15,10);
  warehouse('PTF',12,-8,18,15);
  warehouse('MORENO',-14,11,13,10);
  // White lane divisions and yellow safety edges across the continuous yard.
  for(let x=-25;x<25;x+=3.3){box(1.25,.012,.09,mats.line,x,.014,6.6);box(1.25,.012,.09,mats.line,x,.014,22.4);}
  for(let z=-21;z<25;z+=3.1)box(.09,.012,1.25,mats.line,-26,.014,z);
  for(let k=0;k<8;k++)box(.65,.012,2.4,mats.line,3.8+k*.95,.015,13.5);
  for(let i=0;i<8;i++){pallet(-4+(i%3)*1.55,-14+Math.floor(i/3)*1.7,3+i%3);}
  // Organic tree silhouettes are instanced: detail without hundreds of draw calls.
  const leaves=[],leafGeometry=new THREE.IcosahedronGeometry(1,1);
  function tree(x,z,s=1){
    box(2.4,.12,2.4,mats.concrete,x,.07,z);
    cyl(.13,1.8,mats.trunk,x,.9,z);
    for(let i=0;i<7;i++)leaves.push({x:x+(random()-.5)*1.3*s,y:1.7*s+random()*1.1*s,z:z+(random()-.5)*1.3*s,s:(.6+random()*.45)*s});
  }
  for(let z=-23;z<=25;z+=4.1){tree(-30,z,.9);tree(28,z,.95);}
  for(let x=-25;x<25;x+=4.3)tree(x,-25,.85);
  for(const [x,z] of [[-4,7],[-4,11],[-3,18],[4,-5],[24,6],[20,20],[-23,19]])tree(x,z,.9);
  const foliage=new THREE.InstancedMesh(leafGeometry,mats.green,leaves.length),dummy=new THREE.Object3D();
  leaves.forEach((o,i)=>{dummy.position.set(o.x,o.y,o.z);dummy.scale.set(o.s,o.s*1.2,o.s);dummy.rotation.set(random(),random(),random());dummy.updateMatrix();foliage.setMatrixAt(i,dummy.matrix);foliage.setColorAt(i,new THREE.Color().setHSL(.28+random()*.05,.24,.16+random()*.09))});
  foliage.castShadow=true;foliage.receiveShadow=true;scene.add(foliage);
  // Perimeter, security booth, gates and warm lamps.
  for(let x=-29;x<=28;x+=2.1){
    box(.06,1.5,.06,mats.navy,x,.8,26);
    box(2.1,.045,.045,mats.navy,x,1.5,26);
    box(2.1,.045,.045,mats.navy,x,.6,26);
    for(let j=0;j<6;j++)box(.02,1.3,.02,mats.chrome,x-1+j*.35,.8,26);
  }
  box(2.3,2.6,2.7,mats.wall,20,1.4,25);
  box(2.6,.2,3,mats.roof,20,2.86,25);
  box(1.65,.85,.06,mats.glass,20,1.9,26.4);
  box(4,.08,.12,mats.white,14.3,1.4,25.3);
  for(let x=12.5;x<16.3;x+=.6)box(.22,.09,.14,mats.orange,x,1.4,25.3);
  for(const [x,z] of [[-25,4],[24,4],[-3,3],[-4,20],[24,23]]){
    cyl(.065,5,mats.navy,x,2.5,z);
    box(1.1,.12,.45,mats.navy,x+.4,5,z);
    box(.9,.035,.35,mats.lamp,x+.4,4.92,z);
    groundDecal(8,8,mats.glow,x+.4,z);
  }
  // Batch static boxes by material. Picking uses separate, non-rendered volumes.
  scene.updateMatrixWorld(true);
  const batches=new Map();
  staticBoxes.forEach(mesh=>{if(!batches.has(mesh.material))batches.set(mesh.material,[]);batches.get(mesh.material).push(mesh)});
  batches.forEach((meshes,material)=>{
    const batch=new THREE.InstancedMesh(cubeGeometry,material,meshes.length);
    meshes.forEach((m,i)=>{batch.setMatrixAt(i,m.matrixWorld);m.removeFromParent()});
    batch.castShadow=true;batch.receiveShadow=true;scene.add(batch);
  });
  const truckGeometries=new Map();
  function roundedBox(w,h,d,material,x,y,z,parent){
    const key=[w,h,d].join(',');
    if(!truckGeometries.has(key)){
      const shape=new THREE.Shape();shape.moveTo(-w/2,-h/2);shape.lineTo(w/2,-h/2);shape.lineTo(w/2,h/2);shape.lineTo(-w/2,h/2);shape.closePath();
      const geometry=new THREE.ExtrudeGeometry(shape,{depth:d-.1,bevelEnabled:true,bevelSize:.06,bevelThickness:.05,bevelSegments:2,steps:1});
      geometry.translate(0,0,-d/2+.05);truckGeometries.set(key,geometry);
    }
    const m=new THREE.Mesh(truckGeometries.get(key),material);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;
  }
  const brandMap=canvasTexture(512,(ctx,n)=>{ctx.clearRect(0,0,n,n);ctx.fillStyle='#077989';ctx.font='bold 76px Arial';ctx.fillText('M',22,280);ctx.fillStyle='#193c4a';ctx.font='bold 34px Arial';ctx.fillText('MULTIESPUMAS',108,277);});
  const brandMaterial=new THREE.MeshStandardMaterial({map:brandMap,transparent:true,roughness:.7,depthWrite:false});
  function makeTruck(t,i){
    const g=new THREE.Group(),cargo=new THREE.Group(),wheels=[];
    scene.add(g);
    const paint=new THREE.MeshStandardMaterial({color:0x087d8b,roughness:.28,metalness:.48});
    box(1.6,.22,6.4,mats.navy,0,.53,0,g);
    box(1.7,1.96,4.65,mats.wall,0,1.86,-.68,g);
    box(1.76,.11,4.74,mats.white,0,2.9,-.68,g);
    box(1.75,.1,4.75,mats.chrome,0,.85,-.68,g);
    roundedBox(1.6,1.7,1.45,paint,0,1.49,2.45,g);
    box(1.5,.55,.06,mats.glass,0,1.95,3.2,g).rotation.x=-.12;
    box(1.44,.075,1.27,paint,0,2.41,2.4,g);
    box(1.2,.46,.08,mats.navy,0,1.12,3.22,g);
    for(let k=0;k<4;k++)box(1.18,.035,.02,mats.chrome,0,.98+k*.1,3.27,g);
    box(1.54,.16,.1,mats.chrome,0,.73,3.25,g);
    for(const side of [-1,1]){
      box(.025,.58,.88,mats.glass,side*.82,1.94,2.43,g);
      box(.16,.33,.18,mats.navy,side*.98,1.94,3.0,g);
      box(.25,.07,.58,mats.chrome,side*.82,.76,2.5,g);
      box(.27,.17,.08,mats.lamp,side*.59,.95,3.29,g);
      const brand=new THREE.Mesh(planeGeometry,brandMaterial);
      brand.scale.set(3.7,.85,1);brand.rotation.y=side*Math.PI/2;brand.position.set(side*.856,1.92,-.65);g.add(brand);
      for(let k=-2.7;k<1.5;k+=.62)box(.03,.065,.15,mats.orange,side*.88,.9,k,g);
    }
    const tireGeometry=new THREE.CylinderGeometry(.4,.4,.23,24);
    const hubGeometry=new THREE.CylinderGeometry(.23,.23,.242,16);
    for(const z of [-2.25,-1.32,2.5])for(const x of [-.84,.84]){
      const tire=new THREE.Mesh(tireGeometry,mats.black);tire.rotation.z=Math.PI/2;tire.position.set(x,.43,z);tire.castShadow=true;g.add(tire);wheels.push(tire);
      const hub=new THREE.Mesh(hubGeometry,mats.chrome);hub.rotation.z=Math.PI/2;hub.position.copy(tire.position);g.add(hub);
    }
    box(1.55,1.85,.04,mats.roof,0,1.85,-3.03,g);
    for(const x of [-.4,.4])box(.045,1.72,.06,mats.chrome,x,1.85,-3.07,g);
    g.add(cargo);
    g.traverse(o=>{if(o.isMesh){o.userData.truck=i;clickables.push(o)}});
    truckMeshes.push({g,cargo,wheels});
    truckLabels.push(label(t.name,'',[0,0,0],'truck-label'));
  }
  const ring=new THREE.Mesh(new THREE.PlaneGeometry(2.25,7.3),new THREE.MeshBasicMaterial({color:0x31ded9,transparent:true,opacity:.2,side:THREE.DoubleSide,depthWrite:false}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.025;scene.add(ring);

  cleanups.push(()=>{
    textures.forEach(t=>t.dispose());
    clickables.filter(o=>o.userData.depot).forEach(o=>o.geometry.dispose());
    pickMaterial.dispose();truckGeometries.forEach(g=>g.dispose());
  });
  const staticClickables=clickables.slice();
  const commonMaterials=new Set([...Object.values(mats),brandMaterial]);
  function rebuildTrucks(next) {
    for(const ob of truckMeshes){disposeObjects(ob.g,new Set([cubeGeometry,cylinderGeometry,planeGeometry,...truckGeometries.values()]),commonMaterials);scene.remove(ob.g);}
    for(const lab of truckLabels)lab.el.remove();
    truckMeshes=[];truckLabels=[];clickables.splice(0,clickables.length,...staticClickables);
    trucks=next.slice(0,8).map((t,i)=>({...t,color:[0x008e98,0xd6a357,0x3d789c,0x5c8c8c][i%4]}));
    // Display slots are schematic, never an inferred depot or live truck location.
    trucks.forEach((t,i)=>{
      makeTruck(t,i);
      const slots=[[-13,-1],[12,6],[-12,21],[10,21],[-24,8],[3,5],[22,17],[-23,-4]];
      const ob=truckMeshes[i], [x,z]=slots[i];
      ob.g.position.set(x,.08,z);ob.g.rotation.y=0;
      truckLabels[i].pos.set(x,3.9,z);
    });
    renderer.shadowMap.needsUpdate=true;
  }
  function positionLabels() {
    const placed=[],w=host.clientWidth,h=host.clientHeight;
    for(const lab of depotLabels.concat(truckLabels)){
      const p=lab.pos.clone().project(camera);
      const width=lab.el.offsetWidth,height=lab.el.offsetHeight;
      const left=Math.max(6,Math.min(w-width-6,(p.x*.5+.5)*w-width/2));
      let top=Math.max(48,Math.min(h-height-5,(-p.y*.5+.5)*h-height));
      for(let attempt=0;attempt<12;attempt++){
        const overlap=placed.find(r=>left<r.right+4&&left+width>r.left-4&&top<r.bottom+4&&top+height>r.top-4);
        if(!overlap)break;
        top=overlap.bottom+5;
      }
      lab.el.style.transform='none';lab.el.style.left=left+'px';lab.el.style.top=top+'px';
      lab.el.hidden=p.z>1||p.z< -1||top>h-height;
      if(!lab.el.hidden)placed.push({left,right:left+width,top,bottom:top+height});
    }
  }
  function draw(ms) {
    frame=0;if(disposed||document.hidden)return;
    if(tween){
      const t=media.matches?1:Math.min(1,(ms-tween.start)/230),e=1-Math.pow(1-t,3);
      controls.target.lerpVectors(tween.from,tween.to,e);
      controls.update();
      if(t===1)tween=null;
    }
    positionLabels();
    renderer.render(scene,camera);
    if(tween)invalidate();
  }
  function invalidate(){if(!disposed&&!frame)frame=requestAnimationFrame(draw);}
  function setSelection(id) {
    currentSelection=id;ring.visible=false;
    trucks.forEach((t,i)=>{
      const yes=t.id===id;truckLabels[i].el.dataset.selected=String(yes);
      if(yes){ring.visible=true;ring.position.x=truckMeshes[i].g.position.x;ring.position.z=truckMeshes[i].g.position.z;}
    });
    depotLabels.forEach(l=>{l.el.style.borderColor=id==='depot:'+l.el.firstChild.textContent?'#42f2eb':'#59869b'});
    invalidate();
  }
  function update(next,id) {
    model=next;
    const displayed=next.trucks.slice(0,8), chosen=next.trucks.find(t=>t.id===id);
    if(chosen&&!displayed.includes(chosen))displayed[7]=chosen;
    const signature=JSON.stringify(displayed.map(t=>[t.id,t.name]));
    if(signature!==truckSignature){truckSignature=signature;rebuildTrucks(displayed);}
    setSelection(id);
  }
  function resize(){
    const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;
    const compact=w<650;
    controls.enableRotate=!compact;
    renderer.domElement.style.touchAction=compact?'pan-y':'none';
    renderer.setPixelRatio(Math.min(devicePixelRatio,compact?1:1.5));
    if(renderer.shadowMap.enabled===compact){renderer.shadowMap.enabled=!compact;renderer.shadowMap.needsUpdate=true;}
    renderer.setSize(w,h);const halfHeight=Math.max(18,26/(w/h));
    camera.left=-halfHeight*w/h;camera.right=halfHeight*w/h;camera.top=halfHeight;camera.bottom=-halfHeight;
    camera.updateProjectionMatrix();invalidate();
  }
  function reset(){
    const target=new THREE.Vector3(0,0,3);
    camera.position.set(35,35,45);camera.zoom=1;camera.updateProjectionMatrix();
    if(media.matches){controls.target.copy(target);controls.update();tween=null;}
    else tween={from:controls.target.clone(),to:target,start:performance.now()};
    invalidate();
  }
  let down=null;
  const raycaster=new THREE.Raycaster();
  listen(renderer.domElement,'pointerdown',e=>{down={x:e.clientX,y:e.clientY,id:e.pointerId}});
  listen(renderer.domElement,'pointercancel',()=>{down=null});
  listen(renderer.domElement,'pointerup',e=>{
    const start=down;down=null;
    if(!start||start.id!==e.pointerId||Math.hypot(e.clientX-start.x,e.clientY-start.y)>7)return;
    const r=renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1),camera);
    const hit=raycaster.intersectObjects(clickables,false)[0];if(!hit)return;
    if(hit.object.userData.truck!==undefined)onSelect(trucks[hit.object.userData.truck].id);
    else if(hit.object.userData.depot)onSelect('depot:'+hit.object.userData.depot);
  });
  listen(renderer.domElement,'webglcontextlost',e=>{e.preventDefault();if(!disposed)onError();});
  controls.addEventListener('change',invalidate);
  controls.addEventListener('start',()=>{tween=null});
  listen(media,'change',()=>{if(media.matches)tween=null;invalidate();});
  resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);
  update(model,selected);resize();
  return {update,select:id=>update(model,id),reset,dispose};
  } catch(error) {dispose();throw error;}
}
