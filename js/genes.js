/* =====================================================================
 * genes.js — 유전자 데이터
 * ---------------------------------------------------------------------
 * ★ 가장 자주 고칠 파일이에요. 유전자를 추가하거나 수치를 바꾸려면
 *   아래 CATEGORIES와 GENES만 수정하면 됩니다. 다른 파일은 손대지 않아도 돼요.
 *
 * GENES 항목 설명
 *   id       유전자 이름 (고유해야 함)
 *   cat      카테고리 id (CATEGORIES 참고)
 *   type     'ko'  = 기능 상실(녹아웃)   'add' = 도입/보유
 *   role     카드에 보이는 한 줄 설명
 *   ev       근거 수준: '실측' | '대리값' | '추정' | '방향만'
 *   mech     작동 원리
 *   data     논문 결과 요약
 *   effects  모델에 주는 효과 (곱셈 계수, 1 = 변화 없음)
 *              height     최대 초장 ×         flagLeaf  지엽 길이 ×
 *              tillers    최대 분얼 수 ×      grains    이삭당 낟알 ×
 *              panicleLen 이삭 길이 ×         stemThick 줄기 굵기 ×
 *              grainLen   낟알 길이 ×         grainWid  낟알 폭 ×
 *              (천립중은 낟알 길이·폭으로 자동 계산)
 *   notes    3D에서 마우스를 올렸을 때 부위별로 보여 줄 설명
 *              stem | flag(지엽) | panicle | grain
 *   ref,url  출처
 * ===================================================================== */

const CATEGORIES = [
  {id:'biotic',  name:'병해충 저항성',          color:'#b3472b'},
  {id:'abiotic', name:'비생물적 스트레스 내성', color:'#2f6f9f'},
  {id:'yield',   name:'수량 및 초형',           color:'#3b7d3a'},
  {id:'quality', name:'미질 및 영양 성분',      color:'#b08a1f'},
];

const GENES = [
  // ───────────── 수량 및 초형 ─────────────
  {
    id:'Gn1a', cat:'yield', type:'ko', ev:'실측',
    role:'이삭당 립수 (사이토키닌 분해 효소 OsCKX2)',
    mech:'사이토키닌을 분해하는 효소가 없어지면 이삭 분열조직에 사이토키닌이 쌓여, 이삭 가지와 낟알 수가 늘어나요.',
    data:'자포니카 CRISPR 녹아웃 3계통에서 이삭당 낟알이 19.0~26.2% 증가(평균 21.7%).',
    effects:{grains:1.22},
    notes:{panicle:'gn1a: 이삭 분열조직에 사이토키닌이 쌓여 가지와 낟알이 늘었어요 (×1.22)'},
    ref:'Chang et al. 2023, Acta Agric Univ Jiangxiensis',
    url:'https://www.sciengine.com/doi/pdf/02CC973055EC416B8D4F0DC7B8DC704F'
  },
  {
    id:'SD1', cat:'yield', type:'ko', ev:'실측',
    role:'반왜성 (지베렐린 생합성 OsGA20ox2)',
    mech:'지베렐린이 부족해 마디 세포가 덜 길어지면서 키가 작아져요. 녹색혁명 품종 IR8의 반왜성 원인 유전자로, 비료를 많이 줘도 잘 쓰러지지 않게 해 줍니다.',
    data:'바스마티 벼 CRISPR 녹아웃에서 초장 28.7% 감소, 지엽 길이 감소, 나머지 형질은 변화 없음.',
    effects:{height:0.71, flagLeaf:0.85},
    notes:{stem:'sd1: 지베렐린이 부족해 마디 세포가 짧아요 → 줄기 ×0.71',
           flag:'sd1: 지엽도 짧아졌어요 (×0.85)'},
    ref:'Nawaz et al. 2020, Int J Mol Sci',
    url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC7504442'
  },
  {
    id:'GS3', cat:'yield', type:'ko', ev:'방향만',
    role:'낟알 길이 (낟알 크기 억제 유전자)',
    mech:'GS3는 낟알이 길어지는 것을 억제해요. 기능을 잃으면 억제가 풀려 낟알이 길고 무거워집니다. 길쭉한 인디카 장립종이 흔히 가진 대립유전자예요.',
    data:'낟알 길이·무게에 큰 효과, 폭·두께에는 작은 효과를 주는 음성 조절자. 길이 증가율(20%)은 추정.',
    effects:{grainLen:1.2},
    notes:{grain:'gs3: 길이 억제가 풀려 낟알이 길어졌어요 (×1.2, 추정)'},
    ref:'Fan et al. 2006, Theor Appl Genet (리뷰: Breed Sci)',
    url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC4430511'
  },
  {
    id:'GW5', cat:'yield', type:'ko', ev:'방향만',
    role:'낟알 폭 (낟알 크기 억제 유전자)',
    mech:'GW5도 낟알 크기를 억제하는 유전자예요. 폭이 넓은 품종은 이 부위에 1,212bp 결실이 있어 GW5 발현이 달라지고 낟알이 넓어집니다.',
    data:'광폭 품종의 1,212bp 결실이 GW5 발현과 낟알 폭을 조절. 폭 증가율(15%)은 추정.',
    effects:{grainWid:1.15},
    notes:{grain:'gw5: 폭 억제가 풀려 낟알이 넓어졌어요 (×1.15, 추정)'},
    ref:'Weng et al. 2008, Cell Research',
    url:'https://www.nature.com/articles/cr2008307.pdf'
  },

  // ───────────── 병해충 저항성 · 비생물적 스트레스 · 미질 ─────────────
  // 다음 단계에서 추가할 예정이에요.
];
