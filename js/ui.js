/* =====================================================================
 * ui.js — 화면 조작, 결과 표, 그래프, 설명, 마우스 툴팁, 애니메이션
 * ===================================================================== */

const $ = id => document.getElementById(id);
const geno = {}; GENES.forEach(g => geno[g.id] = false);
const env = {T:25, DL:14, N:1};
let day = 0, playing = false, compare = true, simW, simK, dirty = true;
let plantW = null, plantK = null, labelW = null, labelK = null;

const activeNames = () => GENES.filter(g => geno[g.id]);
const geneTag = g => g.type==='ko' ? g.id.toLowerCase()+' KO' : '+'+g.id;

function recompute(){
  simW = makeSim({}, env);
  simK = makeSim(geno, env);
  applySourceLimit(simK, simW);
  dirty = true;
  updatePanels();
}

// ───────────── 유전자 카드 (카테고리별) ─────────────
function buildGeneCards(){
  const box = $('categories');
  CATEGORIES.forEach(cat => {
    const genes = GENES.filter(g => g.cat === cat.id);
    const sec = document.createElement('div'); sec.className = 'cat';
    sec.innerHTML = `<div class="cat-h" style="--c:${cat.color}"><span class="dot"></span>${cat.name}
      <small>${genes.length ? genes.length+'개' : '준비 중'}</small></div>`;
    const grid = document.createElement('div'); grid.className = 'genes';
    if (!genes.length){
      grid.innerHTML = '<div class="empty">다음 단계에서 추가할 예정이에요.</div>';
    }
    genes.forEach(g => {
      const d = document.createElement('div'); d.className = 'gene'; d.style.setProperty('--c', cat.color);
      d.innerHTML = `<div class="gn">${g.id}<i>${g.type==='ko'?'KO':'도입'}</i></div>
        <div class="gr">${g.role}</div><div class="ev ev-${g.ev}">${g.ev}</div>`;
      d.onclick = () => { geno[g.id] = !geno[g.id]; d.classList.toggle('on', geno[g.id]); recompute(); };
      grid.appendChild(d);
    });
    sec.appendChild(grid); box.appendChild(sec);
  });
}

// ───────────── 환경 조절 ─────────────
function bindControls(){
  $('temp').oninput = e => { env.T = +e.target.value; $('tVal').textContent = env.T+' °C'; recompute(); };
  $('dl').oninput = e => { env.DL = +e.target.value; $('dlVal').textContent = env.DL.toFixed(1)+' 시간'; recompute(); };
  document.querySelectorAll('#nitro button').forEach(b => b.onclick = () => {
    document.querySelectorAll('#nitro button').forEach(x => x.classList.remove('on'));
    b.classList.add('on'); env.N = +b.dataset.n; recompute();
  });
  $('compare').onchange = e => { compare = e.target.checked; dirty = true; };
  $('day').oninput = e => { day = +e.target.value; dirty = true; updateHud(); drawCharts(); };
  $('play').onclick = () => {
    if (!playing && day >= MAXDAY) day = 0;
    playing = !playing; $('play').textContent = playing ? '❚❚' : '▶';
  };
}

// ───────────── 결과·설명 패널 ─────────────
const fmtDay = d => isFinite(d) && d < 9999 ? Math.round(d)+'일' : '—';
function pct(a,b){
  if (!b) return '';
  const v = (a/b-1)*100;
  if (Math.abs(v) < 0.5) return '<span>±0%</span>';
  return `<span class="${v>0?'up':'down'}">${v>0?'+':''}${v.toFixed(0)}%</span>`;
}

function updatePanels(){
  const W = simW, K = simK;
  const rows = [
    ['초장 (줄기)', W.Hmax.toFixed(0)+' cm', K.Hmax.toFixed(0)+' cm', pct(K.Hmax,W.Hmax)],
    ['이삭 수', W.panicles+' 개', K.panicles+' 개', pct(K.panicles,W.panicles)],
    ['이삭당 낟알', W.grains.toFixed(0)+' 개', K.grains.toFixed(0)+' 개', pct(K.grains,W.grains)],
    ['낟알 길이 × 폭', `${W.grainLen.toFixed(1)}×${W.grainWid.toFixed(1)} mm`, `${K.grainLen.toFixed(1)}×${K.grainWid.toFixed(1)} mm`, ''],
    ['천립중', W.grainW.toFixed(1)+' g', K.grainW.toFixed(1)+' g', pct(K.grainW,W.grainW)],
    ['등숙률', (W.seedSet*100).toFixed(0)+'%', (K.seedSet*100).toFixed(0)+'%'+(K.sinkLimited?' ⚠':''), ''],
    ['출수일', fmtDay(W.headDay), fmtDay(K.headDay), ''],
    ['<b style="color:var(--ink)">예상 수량 / 주</b>', '<b>'+W.yield.toFixed(1)+' g</b>', '<b>'+K.yield.toFixed(1)+' g</b>', pct(K.yield,W.yield)],
  ];
  $('results').innerHTML = '<tr><th></th><th>기준 품종</th><th style="color:var(--ko)">설계 계통</th><th></th></tr>' +
    rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td class="d">${r[3]}</td></tr>`).join('');

  const mk = [[K.piDay,'유수형성'],[K.headDay,'출수'],[K.matDay,'성숙']].filter(m => m[0] <= MAXDAY);
  $('markers').innerHTML = mk.map(m => `<span style="left:${m[0]/MAXDAY*100}%">${m[1]}</span>`).join('');

  // 낟알 패널
  drawGrains($('grainCanvas'), W, K);
  $('grainInfo').innerHTML =
    `<div><b style="color:#8a918c">기준</b> 장폭비 ${(W.grainLen/W.grainWid).toFixed(2)} · ${grainShape(W.grainLen,W.grainWid)}</div>
     <div><b style="color:var(--ko)">설계</b> 장폭비 ${(K.grainLen/K.grainWid).toFixed(2)} · ${grainShape(K.grainLen,K.grainWid)}</div>`;

  // 해석
  const act = activeNames();
  let html = '';
  if (!act.length) html = '<div class="note">위에서 유전자를 골라 보세요. 지금은 두 식물의 유전형이 같아서 똑같이 자랍니다.</div>';
  act.forEach(g => {
    const cat = CATEGORIES.find(c => c.id === g.cat);
    html += `<div class="card" style="--c:${cat.color}"><b>${g.id}</b> <span class="tag">${geneTag(g)}</span>
      <span class="ev ev-${g.ev}">${g.ev}</span><br>${g.mech}
      <div class="m"><b>논문 결과:</b> ${g.data}</div>
      <div class="m"><b>모델 반영:</b> ${Object.entries(g.effects).map(([k,v]) => `${k} ×${v}`).join(', ')}</div>
      <div class="m">출처: <a href="${g.url}" target="_blank" rel="noopener">${g.ref}</a></div></div>`;
  });
  const notes = [];
  if (K.sinkLimited) notes.push(`⚠ <b>동화산물 한계</b>: 낟알이 채울 수 있는 양(${K.potential.toFixed(1)} g)이 잎과 줄기가 공급할 수 있는 탄수화물(${K.sourceCap.toFixed(1)} g)보다 많아요. 그래서 등숙률이 ${(K.seedSet*100).toFixed(0)}%로 떨어졌어요. 그릇(sink)을 키워도 채울 재료(source)가 모자라면 수량이 그만큼 늘지 않습니다.`);
  if (geno.SD1 && K.yield >= W.yield*0.99) notes.push('sd1은 키만 줄이고 수량 구성 요소는 그대로라서, 이 모델에서는 수량 변화가 없어요. 실제 포장에서의 장점은 비바람에 쓰러지지 않는 것(도복 저항성)인데, 아직 이 모델에는 도복이 들어 있지 않아요.');
  if (env.T > 32) notes.push(`기온 ${env.T}°C: 개화기 고온 장해로 등숙률이 떨어졌어요.`);
  if (env.T < 20) notes.push(`기온 ${env.T}°C: 생장이 느리고 저온 장해로 등숙률이 떨어졌어요.`);
  if (act.length) notes.push(`종합: 설계 계통의 주당 예상 수량은 기준 품종보다 <b>${pct(K.yield,W.yield).replace(/<[^>]+>/g,'')}</b>예요.`);
  html += notes.map(n => `<div class="note">${n}</div>`).join('');
  $('expl').innerHTML = html;

  updateHud(); drawCharts();
}

function updateHud(){
  const s = simK.state(day*simK.dGDD), sw = simW.state(day*simW.dGDD);
  $('hudDay').textContent = Math.floor(day)+'일차';
  $('hudStage').textContent = s.stage;
  $('hudSub').innerHTML = `적산온도 ${(day*simK.dGDD).toFixed(0)} °C·일<br>설계: 줄기 ${s.h.toFixed(0)} cm · 분얼 ${Math.floor(s.tc)}개 · 잎 ${Math.floor(s.leaves)}매` +
    (compare ? `<br><span style="color:#8a918c">기준: 줄기 ${sw.h.toFixed(0)} cm · 분얼 ${Math.floor(sw.tc)}개</span>` : '');
}

function drawChart(cv, wt, mt, title, unit){
  const dpr = window.devicePixelRatio||1, w = cv.clientWidth, h = cv.clientHeight;
  cv.width = w*dpr; cv.height = h*dpr; const c = cv.getContext('2d'); c.scale(dpr,dpr);
  const L=34, Rr=8, T=20, B=20, pw=w-L-Rr, ph=h-T-B;
  const ymax = Math.max(...wt,...mt)*1.1 || 1;
  c.font = '12px "Noto Sans KR",sans-serif'; c.fillStyle = '#1f2a22'; c.fillText(title, L, 13);
  c.strokeStyle = '#e3e1d8'; c.fillStyle = '#66706a'; c.font = '10px "Noto Sans KR",sans-serif'; c.lineWidth = 1;
  for (let i=0; i<=3; i++){ const y=T+ph-ph*i/3; c.beginPath(); c.moveTo(L,y); c.lineTo(L+pw,y); c.stroke(); c.fillText((ymax*i/3).toFixed(0),4,y+3); }
  for (let d=0; d<=MAXDAY; d+=50){ c.fillText(d+'일', L+pw*d/MAXDAY-8, h-5); }
  const X = d => L+pw*d/MAXDAY, Y = v => T+ph-ph*v/ymax;
  const line = (arr,col,dash) => { c.beginPath(); c.setLineDash(dash); c.strokeStyle=col; c.lineWidth=2; arr.forEach((v,d) => d?c.lineTo(X(d),Y(v)):c.moveTo(X(d),Y(v))); c.stroke(); c.setLineDash([]); };
  line(wt,'#8a918c',[5,4]); line(mt,'#c2512f',[]);
  c.strokeStyle = '#3b7d3a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(X(day),T); c.lineTo(X(day),T+ph); c.stroke();
  c.fillStyle = '#66706a'; c.fillText(unit, L+pw-24, T+10);
}
function drawCharts(){
  drawChart($('chH'), simW.series.h, simK.series.h, '줄기 길이', 'cm');
  drawChart($('chT'), simW.series.t, simK.series.t, '분얼 수', '개');
}

// ───────────── 3D 다시 그리기 ─────────────
function rebuild(){
  const S = Scene3D.scene;
  disposeGroup(plantW); disposeGroup(plantK); plantW = plantK = null;
  [labelW,labelK].forEach(l => { if (l){ S.remove(l); l.material.map.dispose(); } }); labelW = labelK = null;
  const dx = compare ? 4.2 : 0;
  plantK = buildPlant(simK, day*simK.dGDD, 7, 'design'); plantK.position.x = dx; S.add(plantK);
  const act = activeNames();
  labelK = makeLabel(act.length ? '설계: '+act.map(geneTag).join(' · ') : '설계 계통 (변화 없음)', 28, act.length?'#c2512f':'#555');
  labelK.position.set(dx,-0.6,3.2); S.add(labelK);
  if (compare){
    plantW = buildPlant(simW, day*simW.dGDD, 7, 'base'); plantW.position.x = -dx; S.add(plantW);
    labelW = makeLabel('기준 품종', 28, '#555'); labelW.position.set(-dx,-0.6,3.2); S.add(labelW);
    Scene3D.ruler.position.set(-7.6,0,0);
  } else Scene3D.ruler.position.set(-3.6,0,0);
  dirty = false;
}

// ───────────── 마우스 툴팁 ─────────────
const tip = $('tip'), ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
let pointer = null, hovered = null, hoverOrig = null;
Scene3D.renderer.domElement.addEventListener('pointermove', e => {
  const r = Scene3D.renderer.domElement.getBoundingClientRect();
  pointer = {x:e.clientX-r.left, y:e.clientY-r.top, w:r.width, h:r.height, drag:e.buttons>0};
  pick();
});
Scene3D.renderer.domElement.addEventListener('pointerleave', () => { pointer = null; clearHover(); });

function clearHover(){
  if (hovered && hoverOrig){ hovered.material.dispose(); hovered.material = hoverOrig; }
  hovered = null; hoverOrig = null; tip.style.display = 'none';
}
function pick(){
  if (!pointer || pointer.drag){ clearHover(); return; }
  mouse.set(pointer.x/pointer.w*2-1, -(pointer.y/pointer.h)*2+1);
  ray.setFromCamera(mouse, Scene3D.camera);
  const hit = ray.intersectObjects([plantK,plantW].filter(Boolean), true).find(h => h.object.userData && h.object.userData.part);
  if (!hit){ clearHover(); return; }
  const obj = hit.object;
  if (obj !== hovered){
    clearHover(); hovered = obj;
    if (!obj.isInstancedMesh){ hoverOrig = obj.material; const m = obj.material.clone(); m.emissive = new THREE.Color(0x6b4a10); obj.material = m; }
  }
  let grp = obj; while (grp && !grp.userData.who) grp = grp.parent;
  tip.innerHTML = describe(obj.userData, grp.userData);
  tip.style.display = 'block';
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  let x = pointer.x+16, y = pointer.y+14;
  if (x+tw > pointer.w-8) x = pointer.x-tw-16;
  if (y+th > pointer.h-8) y = pointer.h-th-8;
  tip.style.left = x+'px'; tip.style.top = y+'px';
}

// 부위별 설명. 유전자별 문구는 genes.js의 notes에서 가져와요.
function describe(u, G){
  const {who, sim, st} = G, isK = who === 'design', P = v => Math.round(v*100)+'%';
  const act = isK ? sim.E.active : [];
  const whoTxt = isK ? (act.length ? '설계 계통 ('+act.map(geneTag).join(' · ')+')' : '설계 계통') : '기준 품종';
  const shoot = u.k===0 ? '주간' : `${u.k}번째 분얼`;
  const geneNotes = key => act.map(g => g.notes && g.notes[key]).filter(Boolean);
  let title = '', body = '', gn = [];
  if (u.part === 'stem'){
    title = `줄기 · ${shoot}`;
    body = `길이 ${u.len.toFixed(0)} cm<br>`;
    if (st.g < sim.piG) body += '아직 마디가 길어지지 않은 시기예요. 겉으로 보이는 줄기는 대부분 잎집(엽초)이 겹친 것이고, 생장점은 땅 가까이에 있어요.';
    else if (st.g < sim.headG-60) body += '마디 사이가 빠르게 길어지는 시기예요(절간 신장). 줄기 안에서 어린 이삭이 자라고 있어요.';
    else if (st.sen < 0.5) body += '이삭을 받치고 있어요. 등숙기에는 줄기에 저장해 둔 탄수화물도 낟알로 옮겨 갑니다.';
    else body += '노화가 진행되어 저장 탄수화물 대부분이 낟알로 옮겨 갔어요.';
    gn = geneNotes('stem');
  } else if (u.part === 'leaf'){
    const flag = u.i === sim.finalLeaf;
    title = `잎 · ${shoot}의 ${u.i}번째 잎${flag?' (지엽)':''}`;
    body = `길이 ${u.len.toFixed(0)} cm<br>`;
    if (u.growing) body += `새로 나오는 중이에요 (${P(u.lf)} 전개). 이전 잎의 잎집 속에서 밀려 올라와요.`;
    else if (st.sen > 0.3) body += '등숙기 노화 중이에요. 엽록소를 분해해 질소와 탄수화물을 낟알로 보내고 있어요.';
    else if (u.age <= 1) body += '가장 젊고 활발하게 광합성하는 잎이에요.';
    else if (u.age <= 3) body += '다 자란 잎이에요. 아래쪽 잎일수록 그늘이 져 광합성량이 줄어요.';
    else body += '가장 오래된 잎이에요. 곧 노화해서 질소를 위쪽 잎으로 넘겨줘요.';
    if (flag){ body += '<br><b>지엽</b>은 마지막 잎으로, 등숙기에 낟알을 채우는 탄수화물을 가장 많이 공급해요.'; gn = geneNotes('flag'); }
  } else if (u.part === 'panicle'){
    title = `이삭 · ${shoot}`;
    body = `이삭당 낟알 ${Math.round(sim.grains)}개 · 출수 ${P(st.exs)} · 등숙 ${P(st.fill)}<br>`;
    if (st.exs < 1) body += '이삭이 지엽의 잎집에서 빠져나오는 중이에요(출수).';
    else if (st.fill === 0) body += '개화기예요. 영화가 열리고 꽃가루받이가 일어나요.';
    else if (st.fill < 1) body += '낟알이 차면서 무거워져 이삭이 점점 고개를 숙여요.';
    else body += '다 익었어요. 수확 적기입니다.';
    gn = geneNotes('panicle');
    if (isK && sim.sinkLimited) gn.push(`⚠ 동화산물 한계로 등숙률이 ${P(sim.seedSet)}예요`);
  } else if (u.part === 'grain'){
    title = '낟알';
    const f = st.fill;
    body = (f===0 ? '개화·수정 단계' : f<0.3 ? '유숙기: 속이 우윳빛 즙 상태' : f<0.6 ? '호숙기: 풀처럼 굳는 중' : f<0.9 ? '황숙기: 껍질이 노랗게 변하는 중' : '완숙기: 단단하게 여물었어요') +
      `<br>현미 ${sim.grainLen.toFixed(1)}×${sim.grainWid.toFixed(1)} mm · 천립중 ${sim.grainW.toFixed(1)} g`;
    gn = geneNotes('grain');
  }
  return `<div class="t">${title}</div><div class="w">${whoTxt} · ${Math.floor(day)}일차 · ${st.stage}</div><div>${body}</div>` +
    (gn.length ? `<div class="g">${gn.join('<br>')}</div>` : '');
}

// ───────────── 시작 ─────────────
buildGeneCards(); bindControls(); recompute(); Scene3D.resize();
day = Math.round(simW.headDay + 12); $('day').value = day; updateHud(); drawCharts(); dirty = true;
window.addEventListener('resize', () => { drawCharts(); drawGrains($('grainCanvas'), simW, simK); });

let last = performance.now();
function loop(t){
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (t-last)/1000); last = t;
  if (playing){
    day = Math.min(MAXDAY, day + dt*12); $('day').value = day;
    if (day >= MAXDAY){ playing = false; $('play').textContent = '▶'; }
    dirty = true; updateHud(); drawCharts();
  }
  if (dirty){ clearHover(); rebuild(); if (pointer) pick(); }
  Scene3D.controls.update(); Scene3D.renderer.render(Scene3D.scene, Scene3D.camera);
}
requestAnimationFrame(loop);
