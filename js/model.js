/* =====================================================================
 * model.js — 생장 모델
 * ---------------------------------------------------------------------
 * 기준 품종의 기본값(BASE)과 유전자 효과를 합쳐서, 날마다의 상태를 계산해요.
 * 기준 품종의 성질을 바꾸고 싶으면 BASE 값을 고치면 됩니다.
 * ===================================================================== */

const BASE = {
  height: 100,     // 최대 줄기 길이 (cm)
  tillers: 13,     // 질소 '보통'일 때 최대 분얼 수
  grains: 130,     // 이삭당 낟알
  panicleLen: 22,  // 이삭 길이 (cm)
  grainLen: 5.8,   // 현미 길이 (mm)
  grainWid: 2.6,   // 현미 폭 (mm)
  tgw: 25,         // 천립중 (g)
  tilt: 8,         // 분얼 각도 (도)
  headGDD: 1150,   // 단일 조건 출수 적산온도
  ldDelay: 280,    // 낮 1시간이 12.5시간을 넘을 때마다 늘어나는 출수 GDD
};
const MAXDAY = 200;
const clamp = (x,a,b) => Math.max(a, Math.min(b, x));
const sig = x => 1/(1+Math.exp(-x));

// 켜진 유전자들의 효과를 모두 곱해서 하나로 합쳐요.
function collectEffects(geno){
  const E = {height:1, flagLeaf:1, tillers:1, grains:1, panicleLen:1,
             stemThick:1, grainLen:1, grainWid:1, active:[]};
  for (const g of GENES){
    if (!geno[g.id]) continue;
    E.active.push(g);
    for (const [k,v] of Object.entries(g.effects||{})){
      if (typeof v === 'number' && k in E) E[k] *= v;
    }
  }
  return E;
}

function makeSim(geno, env){
  const E = collectEffects(geno);
  const p = {E, geno};
  p.dGDD = Math.max(0, Math.min(env.T,35) - 10);          // 하루 적산온도
  p.LD = env.DL > 12.5;
  p.headG = BASE.headGDD + Math.max(0, env.DL-12.5)*BASE.ldDelay;
  p.piG = p.headG - 450;                                   // 유수형성
  p.matG = p.headG + 520;                                  // 성숙
  p.Hmax = BASE.height * E.height;
  p.Tmax = BASE.tillers * [0.6,1,1.4][env.N] * E.tillers;
  p.grains = BASE.grains * E.grains;
  p.panL = BASE.panicleLen * E.panicleLen;
  p.stemR = E.stemThick;
  p.flagF = E.flagLeaf;
  p.tilt = BASE.tilt*Math.PI/180;
  p.grainLen = BASE.grainLen * E.grainLen;
  p.grainWid = BASE.grainWid * E.grainWid;
  // 천립중은 낟알 부피에 비례한다고 보고 길이 × 폭^1.2 로 계산 (단순화)
  p.grainW = BASE.tgw * E.grainLen * Math.pow(E.grainWid, 1.2);
  let ss = 0.9;
  if (env.T > 32) ss -= (env.T-32)*0.16;   // 고온 불임
  if (env.T < 20) ss -= (20-env.T)*0.12;   // 저온 장해
  p.seedSetEnv = clamp(ss, 0.1, 0.9);
  p.finalLeaf = Math.round(p.piG/95) + 3;

  p.state = function(g){
    const h = p.Hmax*(0.38*sig((g-p.piG*0.45)/(p.piG*0.13)) + 0.62*sig((g-(p.piG+p.headG)/2)/85));
    const tcAt = x => 1 + (p.Tmax-1)*sig((x-0.5*p.piG)/(0.1*p.piG));
    let tc;
    if (g <= p.piG) tc = tcAt(g);
    else { const pk = tcAt(p.piG); tc = 1 + (pk-1)*(1-0.2*clamp((g-p.piG)/300,0,1)); }
    const leaves = Math.min(p.finalLeaf, 1+g/95);
    const exs  = clamp((g-(p.headG-60))/110, 0, 1);
    const fill = clamp((g-p.headG)/(p.matG-p.headG), 0, 1);
    const sen  = clamp((g-p.headG-150)/(p.matG-p.headG-150), 0, 1);
    let stage;
    if (g < 20) stage = '이앙 직후';
    else if (g < p.piG) stage = '영양생장기 (분얼기)';
    else if (g < p.headG-60) stage = '생식생장기 (유수형성·수잉기)';
    else if (g < p.headG+110) stage = '출수·개화기';
    else if (g < p.matG) stage = '등숙기 (낟알 채우기)';
    else stage = '성숙기 (수확 적기)';
    return {h, tc, leaves, exs, fill, sen, stage, g};
  };

  const fin = p.state(p.matG);
  p.panicles = Math.max(1, Math.floor(fin.tc));
  p.potential = p.panicles * p.grains * p.seedSetEnv * p.grainW / 1000;
  p.seedSet = p.seedSetEnv; p.yield = p.potential; p.sinkLimited = false;
  const dd = p.dGDD > 0 ? p.dGDD : 1e-9;
  p.piDay = p.piG/dd; p.headDay = p.headG/dd; p.matDay = p.matG/dd;
  p.series = {h:[], t:[]};
  for (let d=0; d<=MAXDAY; d++){
    const s = p.state(d*p.dGDD);
    p.series.h.push(s.h); p.series.t.push(Math.floor(s.tc));
  }
  return p;
}

// 동화산물(source) 한계: 잎·줄기가 만드는 탄수화물보다 많이 채울 수는 없어요.
// 공급 능력 = 기준 품종 잠재수량 × 1.25
// (초장으로 줄이지 않아요: 반왜성 품종은 키가 작아도 수확지수가 높아 공급 능력이 크게 줄지 않기 때문)
function applySourceLimit(K, W){
  const cap = W.potential * 1.25;
  K.sourceCap = cap;
  if (K.potential > cap){
    K.sinkLimited = true; K.yield = cap;
    K.seedSet = K.seedSetEnv * cap / K.potential;
  }
}

// 장폭비로 낟알 모양을 분류해요 (현미 기준).
function grainShape(L, W){
  const r = L/W;
  if (r > 3.0) return '세장형 (장립)';
  if (r >= 2.1) return '중간형 (중립)';
  return '굵은형 (단립)';
}
