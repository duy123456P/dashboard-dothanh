/* ===== Hologram HUD: nền mạng điểm sáng + bảng biểu đồ điều hành trực quan ===== */
(function(){
"use strict";
const CV = window.__CV; if(!CV) return;
const {esc, fmtInt, fmt1} = CV;
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const C = {dt:"#16a0bd", thaco:"#d0731d", teraco:"#9568d6", jac:"#22a874", foton:"#4b8fe0", tmt:"#e2557f", grid:"rgba(142,167,199,.16)", axis:"rgba(142,167,199,.35)", ink:"#e8f3ff", muted:"#8ea7c7", good:"#4ee2a0", warn:"#ffc35a", bad:"#ff6b6b", neutral:"#5c7393"};
const tr = v => fmt1(v/1e6).replace(",0","");

/* ---------- nền: mạng điểm sáng trôi + quầng sáng ---------- */
(function bg(){
  const cv = document.createElement("canvas"); cv.id = "fxBg"; cv.setAttribute("aria-hidden","true"); document.body.prepend(cv);
  const g = cv.getContext("2d"); let W, H, P = [], raf = 0, last = 0;
  function size(){ const d = Math.min(devicePixelRatio || 1, 1.5); W = innerWidth; H = innerHeight; cv.width = W*d; cv.height = H*d; g.setTransform(d,0,0,d,0,0);
    const n = Math.round(Math.min(90, W*H/16000)); P = Array.from({length:n}, () => ({x:Math.random()*W, y:Math.random()*H, vx:(Math.random()-.5)*.16, vy:(Math.random()-.5)*.16, r:Math.random()*1.6+.6, big: Math.random() < .08})); }
  function draw(t){
    g.clearRect(0,0,W,H);
    const gl = g.createRadialGradient(W*.72, H*.28, 0, W*.72, H*.28, Math.max(W,H)*.55); gl.addColorStop(0,"rgba(70,160,255,.10)"); gl.addColorStop(1,"rgba(70,160,255,0)"); g.fillStyle = gl; g.fillRect(0,0,W,H);
    for(let i = 0; i < P.length; i++){ const a = P[i];
      for(let j = i+1; j < P.length; j++){ const b = P[j], dx = a.x-b.x, dy = a.y-b.y, d2 = dx*dx+dy*dy; if(d2 < 26000){ g.strokeStyle = `rgba(110,200,255,${(1-d2/26000)*.22})`; g.lineWidth = 1; g.beginPath(); g.moveTo(a.x,a.y); g.lineTo(b.x,b.y); g.stroke(); } } }
    P.forEach(p => { const tw = .6 + .4*Math.sin(t/900 + p.x); g.fillStyle = `rgba(150,225,255,${p.big ? .9*tw : .55*tw})`; g.beginPath(); g.arc(p.x, p.y, p.big ? p.r*2.4 : p.r, 0, 7); g.fill();
      if(p.big){ g.fillStyle = "rgba(70,227,255,.08)"; g.beginPath(); g.arc(p.x, p.y, 16, 0, 7); g.fill(); } });
  }
  function step(t){ raf = requestAnimationFrame(step); if(t - last < 33) return; last = t;
    P.forEach(p => { p.x += p.vx; p.y += p.vy; if(p.x < -20) p.x = W+20; if(p.x > W+20) p.x = -20; if(p.y < -20) p.y = H+20; if(p.y > H+20) p.y = -20; }); draw(t); }
  size(); addEventListener("resize", () => { size(); if(RM) draw(0); });
  if(RM) draw(0); else raf = requestAnimationFrame(step);
  document.addEventListener("visibilitychange", () => { if(RM) return; if(document.hidden) cancelAnimationFrame(raf); else raf = requestAnimationFrame(step); });
})();

/* ---------- tooltip dùng chung ---------- */
const tip = document.createElement("div"); tip.className = "hudtip"; tip.hidden = true; document.body.appendChild(tip);
document.addEventListener("pointermove", e => { const t = e.target.closest && e.target.closest("#hudSec [data-tip], #fcSec [data-tip]"); if(!t){ tip.hidden = true; return; }
  tip.innerHTML = t.getAttribute("data-tip"); tip.hidden = false; const w = tip.offsetWidth, h = tip.offsetHeight; let x = e.clientX + 14, y = e.clientY + 14;
  if(x + w > innerWidth - 8) x = e.clientX - w - 14; if(y + h > innerHeight - 8) y = e.clientY - h - 14; tip.style.left = x + "px"; tip.style.top = y + "px"; });

/* ---------- dữ liệu ---------- */
function data(){
  const N = CV.NET, D = N.dealers.filter(d => d.leCum != null), le = D.reduce((a,d) => a + d.leCum, 0), kh = D.reduce((a,d) => a + d.khCum, 0), T = N.totals;
  return {N, D, le, kh, T, pano: CV.compPano ? CV.compPano() : null, net: CV.netStats ? CV.netStats() : null};
}

/* ---------- đồng hồ vòng ---------- */
function ring(val, max, label, sub){
  const p = max ? Math.max(0, Math.min(1.2, val/max)) : 0, R = 44, L = 2*Math.PI*R, col = p >= .9 ? C.good : p >= .6 ? C.warn : C.bad, st = p >= .9 ? "Đạt" : p >= .6 ? "Cần đẩy" : "Báo động";
  const ticks = Array.from({length:40}, (_,i) => { const a = i/40*2*Math.PI - Math.PI/2, r1 = 54, r2 = i%5 ? 56 : 59; return `<line x1="${60+r1*Math.cos(a)}" y1="${60+r1*Math.sin(a)}" x2="${60+r2*Math.cos(a)}" y2="${60+r2*Math.sin(a)}" stroke="${C.axis}" stroke-width="1"/>`; }).join("");
  return `<div class="ring" data-tip="<b>${esc(label)}</b><br>${fmtInt(val)} / ${fmtInt(max)} · ${fmt1(p*100)}% · ${st}"><svg viewBox="0 0 120 120" role="img" aria-label="${esc(label)} ${fmt1(p*100)}%">${ticks}
    <circle cx="60" cy="60" r="${R}" fill="none" stroke="rgba(142,167,199,.14)" stroke-width="8"/>
    <circle class="arc glow" cx="60" cy="60" r="${R}" fill="none" stroke="${col}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${L}" stroke-dashoffset="${RM ? L*(1-Math.min(p,1)) : L}" data-off="${L*(1-Math.min(p,1))}" transform="rotate(-90 60 60)"/>
    <text x="60" y="58" text-anchor="middle" fill="${C.ink}" font-family="Chakra Petch,Arial" font-weight="700" font-size="21">${fmtInt(p*100)}%</text>
    <text x="60" y="75" text-anchor="middle" fill="${C.muted}" font-size="10">${st}</text></svg><div class="lbl">${esc(label)}</div><div class="sub2 num">${fmtInt(val)} / ${fmtInt(max)} xe${sub ? " · " + esc(sub) : ""}</div></div>`;
}

/* ---------- thanh ngang (một chuỗi, nhãn trực tiếp) ---------- */
function hbars(items, {w = 520, unit = "", hi} = {}){
  const rh = 24, lw = 150, max = Math.max(...items.map(x => x.v), 1), H = items.length*rh + 6, bw = w - lw - 56;
  return `<svg viewBox="0 0 ${w} ${H}" role="img">${items.map((x,i) => { const y = i*rh + 4, len = Math.max(2, x.v/max*bw);
    return `<g data-tip="<b>${esc(x.k)}</b><br>${fmtInt(x.v)}${unit}${x.t ? "<br>" + esc(x.t) : ""}"><rect x="0" y="${y-2}" width="${w}" height="${rh}" fill="transparent"/>
      <text x="${lw-8}" y="${y+12}" text-anchor="end" fill="${x.hi ? C.ink : C.muted}" font-size="12" font-weight="${x.hi ? 700 : 400}">${esc(x.k)}</text>
      <rect class="${x.hi ? "bar glow" : "bar"}" style="animation-delay:${i*60}ms" x="${lw}" y="${y+3}" width="${len}" height="12" rx="4" fill="${x.c || (x.hi ? C.dt : C.neutral)}"/>
      <text x="${lw+len+6}" y="${y+13}" fill="${C.ink}" font-size="11.5" class="num">${fmtInt(x.v)}${unit}</text></g>`; }).join("")}</svg>`;
}

/* ---------- bullet: thực hiện so với kế hoạch theo đại lý ---------- */
function bullet(D, w = 760){
  const top = D.slice().sort((a,b) => b.leCum - a.leCum).slice(0, 12), max = Math.max(...top.map(d => Math.max(d.leCum, d.khCum)), 1), rh = 26, lw = 160, bw = w - lw - 90, H = top.length*rh + 26;
  const x = v => lw + v/max*bw, grid = [0,.25,.5,.75,1].map(f => `<line x1="${lw + f*bw}" y1="0" x2="${lw + f*bw}" y2="${H-18}" stroke="${C.grid}"/><text x="${lw + f*bw}" y="${H-4}" text-anchor="middle" fill="${C.muted}" font-size="10">${fmtInt(f*max)}</text>`).join("");
  return `<svg viewBox="0 0 ${w} ${H}" role="img" aria-label="Bán lẻ lũy kế so với kế hoạch, 12 đại lý">${grid}${top.map((d,i) => { const y = i*rh + 2, p = d.khCum ? d.leCum/d.khCum : 0, col = p >= .9 ? C.good : p >= .6 ? C.warn : C.bad;
    return `<g data-tip="<b>${esc(d.salesKey || d.name)}</b> · ${esc(d.province)}<br>Bán lẻ lũy kế T10: ${fmtInt(d.leCum)} xe<br>KH lũy kế: ${fmtInt(d.khCum)} xe · đạt ${fmt1(p*100)}%"><rect x="0" y="${y}" width="${w}" height="${rh}" fill="transparent"/>
      <text x="${lw-8}" y="${y+15}" text-anchor="end" fill="${C.ink}" font-size="12">${esc(d.salesKey || d.name)}</text>
      <rect x="${lw}" y="${y+5}" width="${x(d.khCum)-lw}" height="14" rx="4" fill="rgba(142,167,199,.14)"/>
      <rect class="bar" style="animation-delay:${i*50}ms" x="${lw}" y="${y+8}" width="${Math.max(2, x(d.leCum)-lw)}" height="8" rx="4" fill="${C.dt}"/>
      <line x1="${x(d.khCum)}" y1="${y+2}" x2="${x(d.khCum)}" y2="${y+22}" stroke="${C.ink}" stroke-width="2"/>
      <text x="${Math.max(x(d.khCum), x(d.leCum)) + 8}" y="${y+16}" fill="${col}" font-size="11.5" font-weight="700" class="num">${p >= .9 ? "▲" : p >= .6 ? "■" : "▼"} ${fmtInt(p*100)}%</text></g>`; }).join("")}</svg>`;
}

/* ---------- phân kỳ: giá ròng ĐT − đối thủ rẻ nhất cùng thùng ---------- */
function diverge(P, w = 520){
  const rows = P.rows.filter(r => r.gap != null), max = Math.max(...rows.map(r => Math.abs(r.gap)), 1), rh = 30, lw = 150, mid = lw + (w - lw - 20)/2, half = (w - lw - 20)/2 - 40, H = rows.length*rh + 22;
  return `<svg viewBox="0 0 ${w} ${H}" role="img" aria-label="Chênh giá ròng Đô Thành so với đối thủ rẻ nhất">
    <line x1="${mid}" y1="0" x2="${mid}" y2="${H-16}" stroke="${C.axis}" stroke-width="1.5"/><text x="${mid-6}" y="${H-3}" text-anchor="end" fill="${C.muted}" font-size="10">← ĐT rẻ hơn</text><text x="${mid+6}" y="${H-3}" fill="${C.muted}" font-size="10">ĐT đắt hơn →</text>
    ${rows.map((r,i) => { const y = i*rh + 2, len = Math.max(2, Math.abs(r.gap)/max*half), neg = r.gap <= 0, col = neg ? C.dt : C.tmt, x0 = neg ? mid - len : mid;
      return `<g data-tip="<b>${esc(r.sg)}</b><br>Đô Thành ${tr(r.dt.net)} tr: ${esc(r.dt.model)}<br>Đối thủ: ${esc(r.dt.vs)}<br>Chênh ${r.gap > 0 ? "+" : "−"}${tr(Math.abs(r.gap))} tr"><rect x="0" y="${y}" width="${w}" height="${rh}" fill="transparent"/>
        <text x="${lw-8}" y="${y+17}" text-anchor="end" fill="${C.ink}" font-size="12">${esc(r.sg)}</text>
        <rect class="seg" style="transform-origin:${neg ? "right" : "left"} center;animation-delay:${i*70}ms" x="${x0}" y="${y+7}" width="${len}" height="14" rx="4" fill="${col}"/>
        <text x="${neg ? x0 - 6 : x0 + len + 6}" y="${y+18}" text-anchor="${neg ? "end" : "start"}" fill="${C.ink}" font-size="11.5" class="num">${r.gap > 0 ? "+" : "−"}${tr(Math.abs(r.gap))}</text></g>`; }).join("")}</svg>`;
}

/* ---------- vành khuyên: bán lẻ T9 theo miền ---------- */
function donut(parts){
  const tot = parts.reduce((a,p) => a + p.v, 0) || 1, R = 46; let a0 = -Math.PI/2;
  const segs = parts.map(p => { const a1 = a0 + p.v/tot*2*Math.PI, gap = .03, s = a0 + gap/2, e = a1 - gap/2, lg = e - s > Math.PI ? 1 : 0;
    const d = `M${60+R*Math.cos(s)},${60+R*Math.sin(s)} A${R},${R} 0 ${lg} 1 ${60+R*Math.cos(e)},${60+R*Math.sin(e)}`, mid = (a0+a1)/2; a0 = a1;
    return `<path d="${d}" fill="none" stroke="${p.c}" stroke-width="16" data-tip="<b>${esc(p.k)}</b><br>${fmtInt(p.v)} xe · ${fmt1(p.v/tot*100)}%"/><text x="${60+(R+22)*Math.cos(mid)}" y="${60+(R+22)*Math.sin(mid)+4}" text-anchor="middle" fill="${C.ink}" font-size="10.5">${fmtInt(p.v/tot*100)}%</text>`; }).join("");
  return `<svg viewBox="-12 -8 144 136" role="img" aria-label="Bán lẻ tháng 9 theo miền" style="max-width:230px;margin:0 auto">${segs}<text x="60" y="58" text-anchor="middle" fill="${C.ink}" font-family="Chakra Petch,Arial" font-weight="700" font-size="20">${fmtInt(tot)}</text><text x="60" y="74" text-anchor="middle" fill="${C.muted}" font-size="9.5">xe tháng 9</text></svg>
    <div class="hlegend" style="justify-content:center">${parts.map(p => `<span><i style="background:${p.c}"></i>${esc(p.k)} ${fmtInt(p.v)}</span>`).join("")}</div>`;
}

/* ---------- dựng section ---------- */
const anchor = document.getElementById("kpis");
if(anchor){
  const s = document.createElement("section"); s.className = "glass"; s.id = "hudSec"; s.setAttribute("aria-label", "Bảng điều khiển trực quan");
  s.innerHTML = `<div class="hudhead"><div><h2>Trung tâm dữ liệu</h2><p class="muted" style="margin:4px 0 0">Kế hoạch, thị phần, giá ròng và mạng lưới trên một màn hình. Rê chuột vào biểu đồ để xem số chi tiết.</p></div><div class="clock num" id="hudClock"></div></div><div class="hudgrid" id="hudGrid"></div>`;
  anchor.after(s);
}
function render(){
  const el = document.getElementById("hudGrid"); if(!el) return; const X = data(), T = X.T, V = X.N.vama;
  const rings = [ring(X.le, X.kh, "Bán lẻ lũy kế T10 so với KH", ""), ring(T.thT10, T.khT10, "Tháng 10: thực hiện / KH", ""), ring(T.izT10, T.izKhT10, "IZ Series tháng 10", ""), ring(T.msT10, T.msKhT10, "MISSU tháng 10", ""), ring(X.le, T.khYear, "Tiến độ KH năm 2026", "còn " + fmtInt(T.khYear - X.le) + " xe")].join("");
  const vama = V.brands.filter(b => b[1] > 0).map(b => ({k: b[0], v: b[1], hi: b[0] === "DOTHANH", t: "Tháng 9: " + fmtInt(b[2]) + " xe"}));
  const net = X.net ? [{k: "Đô Thành", v: X.net.dt.dealers + X.net.dt.stations, c: C.dt, hi: true, t: `${X.net.dt.dealers} đại lý + ${X.net.dt.stations} trạm DV, ${X.net.dt.prov} tỉnh`}].concat(X.net.rows.map(r => ({k: r.b.name, v: r.n, c: C[r.k] || C.neutral, t: r.b.total}))) : [];
  const reg = Object.entries(V.regionT9 || {}).map(([k,v],i) => ({k: "Miền " + k, v, c: ["#5fd0e8", "#16a0bd", "#0e6f86"][i] || C.neutral}));
  el.innerHTML = `<div class="hp w12"><h3>Nhịp thực hiện kế hoạch <span>ngưỡng: ≥ 90% đạt · 60–90% cần đẩy · &lt; 60% báo động</span></h3><div class="rings">${rings}</div></div>
    <div class="hp w8"><h3>Bán lẻ lũy kế T10 so với KH · 12 đại lý dẫn đầu <span>thanh = thực hiện, vạch trắng = KH</span></h3>${bullet(X.D)}</div>
    <div class="hp"><h3>Bán lẻ tháng 9 theo miền <span>VAMA</span></h3>${donut(reg)}<p class="note">${esc(V.period)}</p></div>
    <div class="hp w6"><h3>Giá ròng sau ưu đãi T11: Đô Thành − đối thủ rẻ nhất cùng thùng <span>triệu đồng</span></h3>${X.pano ? diverge(X.pano) : ""}<p class="note">Xanh: Đô Thành rẻ hơn; hồng: đối thủ rẻ hơn. Phân khúc Đô Thành chưa có xe không hiện.</p></div>
    <div class="hp w6"><h3>Sản lượng lũy kế T9/2026 theo hãng <span>VAMA, xe</span></h3>${hbars(vama)}<p class="note">JAC, Foton, TMT, Teraco không báo cáo VAMA.</p></div>
    <div class="hp w12"><h3>Mạng lưới bán hàng và dịch vụ <span>điểm đã xác minh trên bản đồ</span></h3>${hbars(net, {w: 1100})}<div class="toolbar" style="margin:4px 0 0"><button type="button" id="hudNet">Bật lớp đối thủ trên bản đồ 3D</button><span class="muted small">Thaco công bố hơn 450 showroom, xưởng; Teraco hơn 50; TMT 64; Foton 20 đại lý. Biểu đồ chỉ đếm điểm đã xác minh.</span></div></div>`;
  if(!RM) requestAnimationFrame(() => requestAnimationFrame(() => el.querySelectorAll(".arc").forEach(a => a.setAttribute("stroke-dashoffset", a.dataset.off))));
}
document.addEventListener("click", e => { if(e.target.id === "hudNet"){ CV.setMap({comp: true, pins: true}); const st = document.getElementById("stage"); if(st) st.scrollIntoView({behavior: "smooth", block: "center"}); } });
const clk = () => { const c = document.getElementById("hudClock"); if(c){ const d = new Date(); c.textContent = "● LIVE · " + d.toLocaleDateString("vi-VN") + " · " + d.toLocaleTimeString("vi-VN"); } };
clk(); setInterval(clk, 1000);
render();
const prevSave = CV.onSave; CV.onSave = () => { if(prevSave) prevSave(); render(); };
})();
