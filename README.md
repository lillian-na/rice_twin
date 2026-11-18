# 🌾 벼 디지털 트윈 · 유전자 설계 시뮬레이터

카테고리별 유전자를 골라 벼 계통을 설계하고, 기준 품종과 나란히 키워 보는 교육용 시뮬레이터예요.
3D로 생장을 보여 주고, 잎·줄기·이삭에 마우스를 올리면 상태와 유전자 효과를 설명합니다.

## 실행하기

빌드 도구가 필요 없어요. `index.html`을 브라우저로 열면 바로 실행됩니다.
(인터넷 연결이 필요해요. Three.js를 CDN에서 불러옵니다.)

## 폴더 구조

```
rice-twin/
├── index.html        화면 뼈대
├── css/style.css     디자인
├── js/genes.js       ★ 유전자 데이터 (가장 자주 고칠 파일)
├── js/model.js       생장 모델 (기준 품종 값, 계산식)
├── js/plant3d.js     3D 벼 그리기
├── js/grain2d.js     낟알 모양 비교 그림
└── js/ui.js          버튼·표·그래프·툴팁
```

## 유전자 추가하기

`js/genes.js`의 `GENES` 배열에 항목 하나를 추가하면 끝이에요. 화면의 카드, 계산, 설명이 자동으로 따라옵니다.

```js
{
  id:'GW2', cat:'yield', type:'ko', ev:'방향만',
  role:'낟알 폭·무게 (E3 유비퀴틴 리가아제)',
  mech:'작동 원리 설명',
  data:'논문 결과 요약',
  effects:{grainWid:1.25, stemThick:1.2},
  notes:{grain:'gw2: 낟알이 넓어졌어요'},
  ref:'Song et al. 2007', url:'https://...'
},
```

- `cat`: `biotic`(병해충) · `abiotic`(비생물 스트레스) · `yield`(수량·초형) · `quality`(미질·영양)
- `type`: `ko`(기능 상실) · `add`(도입)
- `effects`에 쓸 수 있는 키 목록은 `genes.js` 맨 위 주석에 있어요.
- 새로운 종류의 효과(예: 병 저항성)를 넣으려면 `model.js`의 `collectEffects`와 계산식도 함께 고쳐야 해요.

## 기준 품종 바꾸기

`js/model.js`의 `BASE` 값을 고치세요. 예를 들어 `grainLen: 5.8`을 `7.0`으로 바꾸면 장립종 기준이 됩니다.

## GitHub Pages로 사이트 만들기

1. GitHub에서 새 저장소를 만들어요 (예: `rice-twin`).
2. 이 폴더의 파일을 모두 올려요 (웹에서 **Add file → Upload files**로 끌어다 놓아도 돼요).
3. 저장소의 **Settings → Pages**에서 Source를 `Deploy from a branch`, Branch를 `main` / `(root)`로 정하고 저장해요.
4. 1~2분 뒤 `https://아이디.github.io/rice-twin/`에서 사이트가 열려요.

이후에는 파일을 고쳐서 커밋할 때마다 사이트가 자동으로 업데이트돼요.

## 진행 상황

- [x] 수량 및 초형: Gn1a, SD1, GS3, GW5
- [ ] 병해충 저항성
- [ ] 비생물적 스트레스 내성
- [ ] 미질 및 영양 성분

## 주의

교육용 규칙 기반 모델이에요. 계수는 각 유전자 카드에 적힌 논문을 바탕으로 했지만, 논문마다 품종 배경과 재배 환경이 달라서 실제 예측값은 아닙니다.
