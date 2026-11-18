/* =====================================================================
 * grain2d.js — 낟알(현미) 모양 비교 그림
 * ---------------------------------------------------------------------
 * 기준 품종과 설계 계통의 현미를 실제 비율(mm)로 나란히 그려요.
 * 나중에 미질 카테고리(아밀로스, 향, 색)를 추가하면 여기서 색과 질감을 바꿀 수 있어요.
 * ===================================================================== */

function drawGrains(canvas, W, K){
  const dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w*dpr; canvas.height = h*dpr;
  const c = canvas.getContext('2d'); c.scale(dpr,dpr);
  const pxPerMm = Math.min(h*0.11, w*0.055);   // 화면 크기에 맞춘 축척

  // 1 mm 격자
  c.strokeStyle = '#eceae2'; c.lineWidth = 1;
  for (let x=0; x<w; x+=pxPerMm){ c.beginPath(); c.moveTo(x,0); c.lineTo(x,h-22); c.stroke(); }
  for (let y=0; y<h-22; y+=pxPerMm){ c.beginPath(); c.moveTo(0,y); c.lineTo(w,y); c.stroke(); }

  const items = [[W,'기준 품종','#8a918c'], [K,'설계 계통','#c2512f']];
  items.forEach(([s,label,col], idx) => {
    const cx = w*(idx===0?0.27:0.73), cy = (h-22)/2;
    const L = s.grainLen*pxPerMm, Wd = s.grainWid*pxPerMm;
    // 현미: 끝이 둥근 타원 + 한쪽 끝의 배아 홈
    c.save(); c.translate(cx,cy); c.rotate(-0.08);
    const grad = c.createLinearGradient(-Wd/2,0,Wd/2,0);
    grad.addColorStop(0,'#e7dcc0'); grad.addColorStop(0.5,'#f7f0de'); grad.addColorStop(1,'#ddd0b0');
    c.fillStyle = grad; c.strokeStyle = '#b9a77e'; c.lineWidth = 1.2;
    c.beginPath(); c.ellipse(0,0,Wd/2,L/2,0,0,Math.PI*2); c.fill(); c.stroke();
    c.fillStyle = '#e2cf9e';
    c.beginPath(); c.ellipse(-Wd*0.28,L*0.36,Wd*0.16,L*0.09,0.4,0,Math.PI*2); c.fill();
    c.restore();
    // 글자
    c.fillStyle = col; c.font = '600 12px "Noto Sans KR",sans-serif'; c.textAlign = 'center';
    c.fillText(label, cx, h-6);
  });
  // 축척 막대
  c.fillStyle = '#66706a'; c.font = '10px "Noto Sans KR",sans-serif'; c.textAlign = 'left';
  c.fillRect(8, 10, pxPerMm, 2); c.fillText('1 mm', 8, 24);
}
