/* =====================================================================
 * plant3d.js — 3D 장면과 벼 그리기 (Three.js)
 * ---------------------------------------------------------------------
 * model.js가 계산한 상태(줄기 길이, 분얼 수, 잎 수, 이삭, 등숙도)를 받아
 * 줄기·잎·이삭·낟알을 그려요. 1 unit = 10 cm.
 * 색을 바꾸고 싶으면 아래 COLORS를 고치면 됩니다.
 * ===================================================================== */

const COLORS = {
  leaf:   0x3f8a36,  oldLeaf: 0x7d9a3c,  straw: 0xc9ab5c,
  stem:   0x5e9a48,  grainGreen: 0x9cc75a, grainGold: 0xd8b443,
  mud:    0x7a6544,  water: 0x8fb3bf,
};

const Scene3D = (function(){
  const view = document.getElementById('view');
  const renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  view.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xeef0ea, 40, 90);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  camera.position.set(0, 8, 24);
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 4.5, 0); controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI*0.52; controls.minDistance = 5; controls.maxDistance = 55;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a55, 0.85));
  const sun = new THREE.DirectionalLight(0xffffff, 0.75); sun.position.set(8,20,10); scene.add(sun);

  const mud = new THREE.Mesh(new THREE.CircleGeometry(16,64), new THREE.MeshStandardMaterial({color:COLORS.mud, roughness:1}));
  mud.rotation.x = -Math.PI/2; scene.add(mud);
  const water = new THREE.Mesh(new THREE.CircleGeometry(16,64), new THREE.MeshStandardMaterial({color:COLORS.water, transparent:true, opacity:0.45, roughness:0.2}));
  water.rotation.x = -Math.PI/2; water.position.y = 0.06; scene.add(water);

  // 높이 눈금자
  const ruler = new THREE.Group();
  const rmat = new THREE.LineBasicMaterial({color:0x666666});
  ruler.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,15,0)]), rmat));
  [50,100,150].forEach(cm => {
    const y = cm/10;
    ruler.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.25,y,0), new THREE.Vector3(0.25,y,0)]), rmat));
    const s = makeLabel(cm+' cm', 22, '#555', false); s.position.set(-1.1,y,0); s.scale.multiplyScalar(0.7); ruler.add(s);
  });
  scene.add(ruler);

  function resize(){
    const w = view.clientWidth, h = view.clientHeight;
    renderer.setSize(w,h); camera.aspect = w/h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  return {view, renderer, scene, camera, controls, ruler, resize};
})();

function makeLabel(text, size=28, color='#1f2a22', bg=true){
  const c = document.createElement('canvas'), ctx = c.getContext('2d');
  ctx.font = `600 ${size}px "Noto Sans KR",sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width)+28; c.width = w; c.height = size+20;
  ctx.font = `600 ${size}px "Noto Sans KR",sans-serif`;
  if (bg){ ctx.fillStyle='rgba(255,255,255,0.9)'; roundRect(ctx,0,0,w,c.height,12); ctx.fill(); }
  ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.fillText(text,14,c.height/2+1);
  const tex = new THREE.CanvasTexture(c); tex.minFilter = THREE.LinearFilter;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:tex, depthTest:false}));
  sp.scale.set(w/60, c.height/60, 1); sp.renderOrder = 10; return sp;
}
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}

const matCache = new Map();
function mat(color){
  const k = color.getHexString();
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({color:color.clone(), side:THREE.DoubleSide, roughness:0.75}));
  return matCache.get(k);
}
const C = Object.fromEntries(Object.entries(COLORS).map(([k,v]) => [k, new THREE.Color(v)]));

function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

function curve(start, phi, th0, droop, len, n=12){
  const pts = [start.clone()], p = start.clone(), ds = len/n;
  for (let i=1; i<=n; i++){
    const s = i/n, th = Math.min(th0 + droop*Math.pow(s,1.6), 2.7);
    p.add(new THREE.Vector3(Math.sin(th)*Math.cos(phi), Math.cos(th), Math.sin(th)*Math.sin(phi)).multiplyScalar(ds));
    pts.push(p.clone());
  }
  return pts;
}
function leafGeo(pts, phi, W){
  const side = new THREE.Vector3(-Math.sin(phi), 0, Math.cos(phi));
  const pos = [], idx = [], n = pts.length-1;
  pts.forEach((pt,i) => {
    const s = i/n, w = W*Math.min(1,0.35+s*4)*(1-Math.pow(s,2.2))+0.002;
    pos.push(pt.x-side.x*w/2, pt.y, pt.z-side.z*w/2, pt.x+side.x*w/2, pt.y, pt.z+side.z*w/2);
    if (i<n){ const a=i*2; idx.push(a,a+1,a+2,a+1,a+3,a+2); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos,3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

const grainGeo = new THREE.SphereGeometry(1,8,6);
const UP = new THREE.Vector3(0,1,0);

// sim: makeSim 결과, g: 적산온도, who: 'base' | 'design'
function buildPlant(sim, g, seed, who){
  const grp = new THREE.Group(), R = rng(seed), st = sim.state(g);
  grp.userData = {who, sim, st};
  const nT = Math.ceil(st.tc-0.02);
  const grainM = [];
  const gc = C.grainGreen.clone().lerp(C.grainGold, clamp((st.fill-0.35)/0.6,0,1));
  const lenF = sim.grainLen/BASE.grainLen, widF = sim.grainWid/BASE.grainWid;

  for (let k=0; k<nT; k++){
    const grow = k===0 ? 1 : clamp(st.tc-k,0,1); if (grow<0.05) continue;
    const phiT = k*2.39996 + R()*0.3;
    const rad = k===0 ? 0 : 0.12+0.06*Math.sqrt(k);
    const base = new THREE.Vector3(Math.cos(phiT)*rad, 0, Math.sin(phiT)*rad);
    const tilt = k===0 ? sim.tilt*0.25 : sim.tilt*(0.75+R()*0.5);
    const axis = new THREE.Vector3(Math.sin(tilt)*Math.cos(phiT), Math.cos(tilt), Math.sin(tilt)*Math.sin(phiT));
    const hK = st.h/10*(k===0?1:clamp(0.97-0.015*k,0.75,1))*(0.35+0.65*grow);

    // 줄기
    const stemCol = C.stem.clone().lerp(C.straw, st.sen);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035*sim.stemR, 0.06*sim.stemR, hK, 6), mat(stemCol));
    stem.position.copy(base).addScaledVector(axis, hK/2);
    stem.quaternion.setFromUnitVectors(UP, axis);
    stem.userData = {part:'stem', k, len:hK*10, tilt};
    grp.add(stem);

    // 잎
    const nL = st.leaves - (k===0 ? 0 : 1.5+0.5*k);
    if (nL > 0){
      const top = Math.ceil(nL);
      for (let i=Math.max(1,top-4); i<=top; i++){
        const age = top-i;
        const lf = i===top ? clamp(nL-(i-1),0.15,1) : 1;
        let L = Math.min(12+3.2*i, 0.5*sim.Hmax+15)/10*lf*(0.5+0.5*grow);
        if (i===sim.finalLeaf) L *= 0.72*sim.flagF;
        const attach = hK*(0.12+0.75*(1-age/5))*0.92;
        const ap = base.clone().addScaledVector(axis, attach);
        const phi = phiT + (i%2)*Math.PI + (R()-0.5)*0.5;
        const outward = Math.cos(phi-phiT)>0 ? tilt : -tilt*0.3;
        const th0 = 0.12 + age*0.14 + outward + R()*0.1;
        const droop = 0.5 + age*0.28 + R()*0.2;
        const col = C.leaf.clone().lerp(C.oldLeaf, clamp(age/4,0,1)).lerp(C.straw, clamp(st.sen*1.1-age*0.05,0,1));
        if (age>=4 && st.exs>0.5) col.lerp(C.straw, 0.5);
        const lm = new THREE.Mesh(leafGeo(curve(ap,phi,th0,droop,L), phi, 0.13), mat(col));
        lm.userData = {part:'leaf', k, i, age, len:L*10, growing:i===top&&lf<1, lf};
        grp.add(lm);
      }
    }

    // 이삭과 낟알
    if (st.exs > 0){
      const topP = base.clone().addScaledVector(axis, hK);
      const pl = sim.panL/10*st.exs*(0.8+0.2*grow);
      const droop = 0.35 + st.fill*1.9 + (sim.grainW/BASE.tgw-1)*0.6;
      const phiP = phiT + (R()-0.5)*0.6;
      const pts = curve(topP, phiP, tilt*0.6, droop, pl, 14);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),14,0.014,4,false), mat(stemCol));
      tube.userData = {part:'panicle', k};
      grp.add(tube);
      const side = new THREE.Vector3(-Math.sin(phiP), 0, Math.cos(phiP));
      const nG = Math.round(clamp(sim.grains/5,8,48)*st.exs);
      for (let j=0; j<nG; j++){
        const s = 0.12 + 0.88*(j/Math.max(1,nG-1));
        const fi = s*(pts.length-1), i0 = Math.floor(fi), i1 = Math.min(pts.length-1, i0+1);
        const p = pts[i0].clone().lerp(pts[i1], fi-i0);
        const tan = pts[i1].clone().sub(pts[Math.max(0,i1-1)]).normalize();
        p.addScaledVector(side, (j%2?1:-1)*(0.03+0.1*(1-s))*(0.6+R()*0.6));
        p.y += (R()-0.5)*0.04;
        const q = new THREE.Quaternion().setFromUnitVectors(UP, tan);
        const wv = 0.028*widF*(0.6+0.4*Math.min(1, st.fill*1.5+0.2));
        grainM.push(new THREE.Matrix4().compose(p, q, new THREE.Vector3(wv, 0.07*lenF, wv)));
      }
    }
  }
  if (grainM.length){
    const im = new THREE.InstancedMesh(grainGeo, new THREE.MeshStandardMaterial({color:gc, roughness:0.6}), grainM.length);
    grainM.forEach((m,i) => im.setMatrixAt(i,m));
    im.userData = {part:'grain'};
    grp.add(im);
  }
  return grp;
}

function disposeGroup(g){
  if (!g) return;
  Scene3D.scene.remove(g);
  g.traverse(o => {
    if (o.geometry && o.geometry !== grainGeo) o.geometry.dispose();
    if (o.isInstancedMesh) o.material.dispose();
  });
}
