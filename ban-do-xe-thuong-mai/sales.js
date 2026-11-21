/* ===== Doanh số chi tiết IZ – MISSU: đại lý × tháng (TDBH 2026) + model × năm (CSI 2023–2026) ===== */
(function(){
"use strict";
const CV = window.__CV; if(!CV) return;
const {esc, fmtInt, fmt1, toast} = CV;
let S; try{ S = JSON.parse(document.getElementById("sales-data").textContent); }catch(e){ return; }
if(!S || !S.dealers) return;
const MONTHS = ["2026-01","2026-02","2026-03","2026-04","2026-05","2026-06","2026-07","2026-08","2026-09","2026-10"];
const ML = m => "T" + (+m.slice(5));
const C = {le:"#16a0bd", si:"#9568d6", kh:"#e8f3ff", ton:"#d0731d", grid:"rgba(142,167,199,.16)", muted:"#8ea7c7", ink:"#e8f3ff", good:"#4ee2a0", warn:"#ffc35a", bad:"#ff6b6b"};
const MISSU = new Set(S.missu || ["V56","V65","T26","T33L"]);
const CSI_ALIAS = {"PHÚ MỸ HG": "ĐT Hậu Giang", "PHÚ MỸ HG-KG": "ĐT Kiên Giang", "Ô TÔ 19/5": "Ô Tô 19/5"};
const up = s => String(s).normalize("NFC").toUpperCase().trim();
const csiName = n => CSI_ALIAS[up(n)] || (S.dealers.find(d => up(d.name) === up(n)) || {}).name || n;
const lineOf = m => MISSU.has(m) ? "MISSU" : /^JP/.test(m) ? "JP" : /^IZ/.test(m) ? "IZ" : "Khác";
const NETD = name => CV.NET.dealers.find(d => d.salesKey === name);
const sum = a => a.reduce((x,y) => x + (y || 0), 0);

/* ---------- tổng hợp ---------- */
function series(names){
  const ds = S.dealers.filter(d => !names || names.includes(d.name));
  return MONTHS.map(m => { const xs = ds.map(d => d.m[m] || {});
    return {m, le: sum(xs.map(x => x.le)), kh: sum(xs.map(x => x.kh)), si: m === "2026-10" ? null : sum(xs.map(x => x.si)), ton: m === "2026-10" ? null : sum(xs.map(x => x.ton)), thuong: sum(xs.map(x => x.thuong)), izLe: sum(xs.map(x => x.izLe)), msLe: sum(xs.map(x => x.msLe))}; });
}
function models(names, year){
  const o = {}; S.csiDealerModel.forEach(([y, d, m, n]) => { if(year && y !== year) return; const dn = csiName(d); if(names && !names.includes(dn)) return; (o[m] = o[m] || {})[y] = ((o[m] || {})[y] || 0) + n; });
  return Object.entries(o).map(([m, ys]) => ({m, line: lineOf(m), ys, y26: ys["2026"] || 0, y25: ys["2025"] || 0, tot: sum(Object.values(ys))})).sort((a,b) => b.y26 - a.y26 || b.tot - a.tot);
}
function dealerStats(d){
  const ms = MONTHS.map(m => d.m[m] || {}), le = sum(ms.map(x => x.le)), kh = sum(ms.map(x => x.kh)), last3 = ms.slice(-3), l3 = sum(last3.map(x => x.le)), k3 = sum(last3.map(x => x.kh));
  const t9 = d.m["2026-09"] || {}, avg3 = sum(ms.slice(-4, -1).map(x => x.le)) / 3, cover = avg3 ? (t9.ton || 0) / avg3 : null;
  return {le, kh, pct: kh ? le/kh*100 : null, l3, k3, p3: k3 ? l3/k3*100 : null, ton: t9.ton, cover, thuong: sum(ms.map(x => x.thuong)), zero: ms.filter(x => x.kh && !x.le).length};
}
function insights(names){
  const ds = S.dealers.filter(d => !names || names.includes(d.name)).map(d => ({d, s: dealerStats(d)})), out = [];
  const lo = ds.filter(x => x.s.k3 >= 6 && x.s.p3 < 60).sort((a,b) => a.s.p3 - b.s.p3); if(lo.length) out.push(`3 tháng gần nhất (T8–T10) dưới 60% KH: ${lo.map(x => `${x.d.name} ${fmtInt(x.s.l3)}/${fmtInt(x.s.k3)} (${fmtInt(x.s.p3)}%)`).join("; ")}.`);
  const hiS = ds.filter(x => x.s.cover != null && x.s.cover > 3 && x.s.ton >= 5).sort((a,b) => b.s.cover - a.s.cover); if(hiS.length) out.push(`Tồn cuối T9 trên 3 tháng bán: ${hiS.map(x => `${x.d.name} ${fmtInt(x.s.ton)} xe ≈ ${fmt1(x.s.cover)} tháng`).join("; ")}.`);
  const zr = ds.filter(x => x.s.zero >= 3); if(zr.length) out.push(`Nhiều tháng có KH nhưng không bán được xe nào: ${zr.map(x => `${x.d.name} (${x.s.zero} tháng)`).join("; ")}.`);
  const st = S.nat.stock || {}; if(st.Missu && st.Missu.length) out.push(`Tồn MISSU toàn hệ thống tăng từ ${fmtInt(st.Missu[0])} xe (T1) lên ${fmtInt(st.Missu[st.Missu.length-1])} xe (T9); tồn IZ ${fmtInt((st.IZ||[]).slice(-1)[0])} xe: ưu tiên chương trình xả tồn MISSU theo model.`);
  const M = models(names), gr = M.filter(x => x.y25 >= 20).map(x => ({...x, g: (x.y26 - x.y25)/x.y25*100})).sort((a,b) => b.g - a.g);
  if(gr.length) out.push(`Model tăng mạnh 2026/2025 (CSI): ${gr.filter(x => x.g > 0).slice(0,3).map(x => `${x.m} ${fmtInt(x.y25)}→${fmtInt(x.y26)}`).join(", ") || "không"}; giảm: ${gr.filter(x => x.g < 0).slice(-3).map(x => `${x.m} ${fmtInt(x.y25)}→${fmtInt(x.y26)}`).join(", ") || "không"}.`);
  return out;
}

/* ---------- biểu đồ ---------- */
function combo(ser){
  const W = 980, H = 280, pl = 40, pr = 12, pt = 12, pb = 28, n = ser.length, max = Math.max(...ser.flatMap(x => [x.le, x.si || 0, x.kh, x.ton || 0]), 1) * 1.1;
  const X = i => pl + (i + .5) * (W - pl - pr) / n, Y = v => pt + (1 - v/max) * (H - pt - pb), bw = (W - pl - pr) / n * .28;
  const grid = [0,.25,.5,.75,1].map(f => `<line x1="${pl}" x2="${W-pr}" y1="${Y(f*max)}" y2="${Y(f*max)}" stroke="${C.grid}"/><text x="${pl-6}" y="${Y(f*max)+4}" text-anchor="end" fill="${C.muted}" font-size="10">${fmtInt(f*max)}</text>`).join("");
  const line = (k, col, dash) => { const p = ser.map((x,i) => x[k] == null ? null : [X(i), Y(x[k])]).filter(Boolean); return `<path d="${p.map((q,i) => (i ? "L" : "M") + q[0].toFixed(1) + "," + q[1].toFixed(1)).join("")}" fill="none" stroke="${col}" stroke-width="2"${dash ? ` stroke-dasharray="${dash}"` : ""}/>` + p.map(q => `<circle cx="${q[0]}" cy="${q[1]}" r="4" fill="${col}" stroke="#0a1730" stroke-width="2"/>`).join(""); };
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Bán lẻ, bán sỉ, kế hoạch, tồn theo tháng">${grid}
    ${ser.map((x,i) => `<rect class="colb" style="animation-delay:${i*40}ms" x="${X(i) - bw - 1}" y="${Y(x.le)}" width="${bw}" height="${Y(0) - Y(x.le)}" rx="3" fill="${C.le}"/>${x.si != null ? `<rect class="colb" style="animation-delay:${i*40+20}ms" x="${X(i) + 1}" y="${Y(Math.max(0, x.si))}" width="${bw}" height="${Math.max(0, Y(0) - Y(Math.max(0, x.si)))}" rx="3" fill="${C.si}"/>` : ""}<text x="${X(i)}" y="${H-8}" text-anchor="middle" fill="${C.muted}" font-size="11">${ML(x.m)}</text>`).join("")}
    ${line("kh", C.kh, "6 4")}${line("ton", C.ton)}
    ${ser.map((x,i) => `<rect x="${X(i) - (W-pl-pr)/n/2}" y="${pt}" width="${(W-pl-pr)/n}" height="${H-pt-pb}" fill="transparent" data-tip="<b>Tháng ${+x.m.slice(5)}/2026</b><br>Bán lẻ: <b>${fmtInt(x.le)}</b> / KH ${fmtInt(x.kh)} (${x.kh ? fmtInt(x.le/x.kh*100) : "—"}%)${x.si != null ? `<br>Bán sỉ: ${fmtInt(x.si)}` : ""}${x.ton != null ? `<br>Tồn cuối tháng: ${fmtInt(x.ton)}` : ""}${x.izLe || x.msLe ? `<br>IZ ${fmtInt(x.izLe)} · MISSU ${fmtInt(x.msLe)}` : ""}${x.thuong ? `<br>Thưởng tạm tính: ${fmt1(x.thuong)} tr` : ""}"/>`).join("")}</svg>
    <div class="hlegend"><span><i style="background:${C.le}"></i>Bán lẻ</span><span><i style="background:${C.si}"></i>Bán sỉ</span><span><i style="background:${C.kh}"></i>Kế hoạch (nét đứt)</span><span><i style="background:${C.ton}"></i>Tồn cuối tháng</span></div>`;
}
function heat(names){
  const ds = S.dealers.filter(d => !names || names.includes(d.name)).map(d => ({d, s: dealerStats(d)})).sort((a,b) => b.s.le - a.s.le);
  const cell = x => { if(!x || (!x.kh && !x.le)) return `<td class="num" style="color:var(--dim)">—</td>`; const p = x.kh ? x.le/x.kh : (x.le ? 1.5 : 0), a = Math.min(1, p/1.2), st = p >= .9 ? "▲" : p >= .6 ? "■" : "▼";
    return `<td class="num" style="background:rgba(22,160,189,${(0.08 + a*.55).toFixed(2)})" data-tip="TH ${fmtInt(x.le)} / KH ${fmtInt(x.kh)} · ${x.kh ? fmtInt(p*100) + "%" : "ngoài KH"}${x.ton != null ? "<br>Tồn " + fmtInt(x.ton) : ""}${x.thuong ? "<br>Thưởng " + fmt1(x.thuong) + " tr" : ""}${x.izLe != null ? "<br>IZ " + fmtInt(x.izLe) + "/" + fmtInt(x.izKh) + " · MISSU " + fmtInt(x.msLe) + "/" + fmtInt(x.msKh) : ""}">${fmtInt(x.le)}<span class="tiny" style="color:${p >= .9 ? C.good : p >= .6 ? C.warn : C.bad}"> ${st}</span></td>`; };
  return `<div style="overflow-x:auto"><table class="tasktbl small"><thead><tr><th>Đại lý</th><th>Miền</th>${MONTHS.map(m => `<th class="num">${ML(m)}</th>`).join("")}<th class="num">Lũy kế lẻ / KH</th><th class="num">Tồn T9</th><th class="num">Thưởng (tr)</th></tr></thead><tbody>
    ${ds.map(({d,s}) => `<tr class="trow" data-sdl="${esc(d.name)}"><td><b>${esc(d.name)}</b></td><td>${esc(d.region.replace("Miền ",""))}</td>${MONTHS.map(m => cell(d.m[m])).join("")}<td class="num"><b>${fmtInt(s.le)}</b> / ${fmtInt(s.kh)} <span style="color:${s.pct >= 90 ? C.good : s.pct >= 60 ? C.warn : C.bad}">${s.pct == null ? "" : fmtInt(s.pct) + "%"}</span></td><td class="num">${s.ton == null ? "—" : fmtInt(s.ton)}${s.cover != null && s.cover > 3 && s.ton >= 5 ? ` <span class="tiny" style="color:${C.bad}">${fmt1(s.cover)}th</span>` : ""}</td><td class="num">${fmt1(s.thuong)}</td></tr>`).join("")}</tbody></table></div>
    <p class="note">Ô = số xe bán lẻ trong tháng; nền đậm = tỷ lệ hoàn thành KH tháng cao. ▲ ≥ 90% · ■ 60–90% · ▼ &lt; 60%. Bấm một đại lý để lọc và bay tới trên bản đồ.</p>`;
}
function modelTable(names){
  const M = models(names), Y = ["2023","2024","2025","2026"], mx = Math.max(...M.map(x => x.y26), 1);
  return `<div style="overflow-x:auto"><table class="tasktbl small"><thead><tr><th>Model</th><th>Dòng</th>${Y.map(y => `<th class="num">${y}</th>`).join("")}<th>2026</th><th class="num">2026/2025</th></tr></thead><tbody>${M.slice(0, 18).map(x => `<tr><td><b>${esc(x.m)}</b></td><td>${x.line}</td>${Y.map(y => `<td class="num">${x.ys[y] ? fmtInt(x.ys[y]) : "—"}</td>`).join("")}
    <td style="min-width:140px"><span style="display:inline-block;height:9px;border-radius:4px;width:${(x.y26/mx*100).toFixed(1)}%;background:${x.line === "MISSU" ? C.ton : C.le}"></span></td><td class="num" style="color:${!x.y25 ? "" : x.y26 >= x.y25 ? C.good : C.bad}">${x.y25 ? (x.y26 >= x.y25 ? "+" : "") + fmtInt((x.y26 - x.y25)/x.y25*100) + "%" : "mới"}</td></tr>`).join("")}</tbody></table></div>
    <p class="note">Đếm xe theo số khung trong danh sách khách hàng (CSI), năm 2026 tính đến ngày cập nhật. Cam = MISSU, xanh = IZ/JP.</p>`;
}


/* ---------- DỰ BÁO DOANH SỐ T11/2026 – T12/2027 từ dữ liệu ERP ---------- */
const P = S.plan || {}, SEAS = P.season && P.season.length === 12 ? P.season : null;
const GROUPS = (P.models || []).map(g => ({g, parts: g.split("/")}));
const groupOf = m => { const k = m.replace(/-PLUS$/, "-PLUS"); const hit = GROUPS.find(x => x.parts.some(p => k === p || k.replace("IZ65M-PLUS","IZ65-PLUS") === p)); return hit ? hit.g : null; };
const median = a => { const s = a.slice().sort((x,y) => x-y), n = s.length; return n ? (n%2 ? s[(n-1)/2] : (s[n/2-1]+s[n/2])/2) : 0; };
const Phi = z => { const t = 1/(1+0.2316419*Math.abs(z)), d = 0.3989423*Math.exp(-z*z/2), p = d*t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.821256+t*1.330274)))); return z > 0 ? 1-p : p; };
function forecast(){
  if(!SEAS) return null;
  const nat = series(null), y = nat.map(x => x.le), mi = nat.map(x => +x.m.slice(5) - 1);
  // 1) khử mùa vụ bằng chỉ số mùa vụ ERP (2025); 2) loại tháng lệch mạnh (Hampel 2,5×MAD, ví dụ Tết lệch tháng giữa 2025 và 2026); 3) mức nền = trung bình có trọng số 6 tháng gần nhất
  const d = y.map((v,i) => v / SEAS[mi[i]]), md = median(d), mad = 1.4826*median(d.map(v => Math.abs(v - md))) || 1;
  const ok = d.map(v => Math.abs(v - md) <= 2.5*mad), recent = d.map((v,i) => [v, i]).filter(([v,i]) => ok[i]).slice(-6);
  const wsum = recent.reduce((a,[,i],k) => a + (k+1), 0), level = recent.reduce((a,[v],k) => a + v*(k+1), 0) / wsum;
  const resid = d.filter((v,i) => ok[i]).map(v => Math.log(v/level)), sig = Math.sqrt(resid.reduce((a,v) => a + v*v, 0) / Math.max(1, resid.length - 1));
  // 4) tăng trưởng năm: số xe CSI 2026 quy năm so với 2025, giảm chấn một nửa, chặn ±15%
  const c26 = (S.csiTotal || {})["2026"] || 0, c25 = (S.csiTotal || {})["2025"] || 0, run = c26 / 10 * 12, gRaw = c25 ? run/c25 - 1 : 0, g = Math.max(-0.15, Math.min(0.15, gRaw/2));
  const months = []; for(let k = 0; k < 14; k++){ const m = k < 2 ? "2026-" + (11+k) : "2027-" + String(k-1).padStart(2,"0"), cm = +m.slice(5) - 1, gr = m.startsWith("2027") ? 1 + g : 1;
    const base = level * gr * SEAS[cm]; months.push({m, base, lo: base*Math.exp(-1.28*sig), hi: base*Math.exp(1.28*sig), kh: m.startsWith("2027") ? (P.kh27m || [])[cm] : (S.nat.kh || [])[cm], erp: m.startsWith("2027") ? (P.erpBase27m || [])[cm] : null}); }
  const f27 = months.filter(x => x.m.startsWith("2027")), F27 = f27.reduce((a,x) => a + x.base, 0), sA = Math.sqrt((Math.sqrt(12) * sig * F27/12)**2 + (sig / Math.sqrt(recent.length) * F27)**2); // sai số tháng độc lập + sai số mức nền (tương quan cả năm)
  const act26 = sum(y), f26 = act26 + months[0].base + months[1].base, kh26 = sum((S.nat.kh || []).slice(0, 12));
  // đại lý: thị phần nội bộ 6 tháng gần nhất (50%) + 10 tháng (50%)
  const D = S.dealers.map(dl => { const v = MONTHS.map(m => (dl.m[m] || {}).le || 0), sh = 0.5*sum(v.slice(-6))/Math.max(1, sum(y.slice(-6))) + 0.5*sum(v)/Math.max(1, act26), p = (P.dealers || []).find(x => x.name === dl.name || (x.name === "Tây Nguyên" && dl.name === "Ô Tô Tây Nguyên")) || {};
    return {name: dl.name, region: dl.region, act: sum(v), share: sh, f27: F27*sh, lo27: (F27 - 1.28*sA)*sh, hi27: (F27 + 1.28*sA)*sh, kh27: p.kh27, erp: p.erpBase, run26: p.run26, cls: p.class}; }).sort((a,b) => b.f27 - a.f27);
  // model: cơ cấu CSI 2026 theo nhóm model của KH 2027, điều chỉnh xu hướng 2026/2025 (giảm chấn một nửa)
  const mix = {}, m25 = {}; S.csiDealerModel.forEach(([yy, , m, n]) => { const gk = groupOf(m); if(!gk) return; if(yy === "2026") mix[gk] = (mix[gk] || 0) + n; if(yy === "2025") m25[gk] = (m25[gk] || 0) + n; });
  const adj = {}; Object.keys(mix).forEach(k => { const gg = m25[k] ? Math.max(-0.4, Math.min(0.6, (mix[k]/10*12/m25[k] - 1)/2)) : 0; adj[k] = mix[k] * (1 + gg); }); const at = sum(Object.values(adj)) || 1;
  const M = (P.models || []).map((gk,i) => ({g: gk, f27: F27 * (adj[gk] || 0)/at, kh27: (P.kh27model || [])[i], reg09: (P.reg09model || [])[i], erp: (P.erpBase27model || [])[i], sold26: mix[gk] || 0}));
  // MISSU: tồn cuối 2026 ước = tồn T9 + nhập ước − bán; 2027 = tồn đầu + KH nhập − dự báo bán MISSU
  const msShare = sum(["T26","T33L","V56","V65"].map(k => adj[k] || 0)) / at, ms27 = f27.map(x => x.base * msShare), stock0 = (S.nat.stock && S.nat.stock.Missu || []).slice(-1)[0] || 0;
  let st = stock0; const msPath = (P.msImport27m || []).map((imp,i) => { st = st + imp - ms27[i]; return Math.round(st); });
  return {nat, d, ok, level, sig, g, gRaw, months, F27, lo27: F27 - 1.28*sA, hi27: F27 + 1.28*sA, pKH: P.kh27 ? 1 - Phi((P.kh27 - F27)/sA) : null, act26, f26, kh26, D, M, msShare, msPath, stock0};
}
function fcChart(F){
  const W = 980, H = 300, pl = 44, pr = 12, pt = 14, pb = 28, all = F.nat.map(x => ({m: x.m, act: x.le, kh: x.kh})).concat(F.months.map(x => ({m: x.m, base: x.base, lo: x.lo, hi: x.hi, kh: x.kh, erp: x.erp}))), n = all.length;
  const max = Math.max(...all.map(x => Math.max(x.act || 0, x.hi || 0, x.kh || 0, x.erp || 0))) * 1.08, X = i => pl + i*(W-pl-pr)/(n-1), Y = v => pt + (1 - v/max)*(H-pt-pb);
  const path = (k, from = 0) => all.map((x,i) => x[k] == null || i < from ? null : [X(i), Y(x[k])]).filter(Boolean).map((q,i) => (i ? "L" : "M") + q[0].toFixed(1) + "," + q[1].toFixed(1)).join("");
  const n0 = F.nat.length, band = all.map((x,i) => x.hi != null ? [X(i), Y(x.hi)] : null).filter(Boolean), bandL = all.map((x,i) => x.lo != null ? [X(i), Y(x.lo)] : null).filter(Boolean).reverse();
  const grid = [0,.25,.5,.75,1].map(f => `<line x1="${pl}" x2="${W-pr}" y1="${Y(f*max)}" y2="${Y(f*max)}" stroke="${C.grid}"/><text x="${pl-6}" y="${Y(f*max)+4}" text-anchor="end" fill="${C.muted}" font-size="10">${fmtInt(f*max)}</text>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Thực tế 2026 và dự báo đến T12/2027">${grid}
    <rect x="${X(n0)-4}" y="${pt}" width="${W-pr-X(n0)+4}" height="${H-pt-pb}" fill="rgba(70,227,255,.05)"/><text x="${X(n0)+4}" y="${pt+12}" fill="${C.muted}" font-size="10">DỰ BÁO</text>
    <path d="${band.concat(bandL).map((q,i) => (i ? "L" : "M") + q[0].toFixed(1) + "," + q[1].toFixed(1)).join("")}Z" fill="rgba(78,226,160,.14)"/>
    <path d="${path("kh")}" fill="none" stroke="${C.kh}" stroke-width="1.5" stroke-dasharray="6 4"/>
    <path d="${path("erp")}" fill="none" stroke="${C.ton}" stroke-width="1.5" stroke-dasharray="2 3"/>
    <path d="${path("act")}" fill="none" stroke="${C.le}" stroke-width="2.5"/>
    <path d="M${X(n0-1)},${Y(all[n0-1].act)}L${path("base", n0).slice(1)}" fill="none" stroke="${C.good}" stroke-width="2.5"/>
    ${all.map((x,i) => `<text x="${X(i)}" y="${H-8}" text-anchor="middle" fill="${C.muted}" font-size="9.5">${i % 2 === 0 || i === n0 ? "T" + (+x.m.slice(5)) + "/" + x.m.slice(2,4) : ""}</text><rect x="${X(i)-(W-pl-pr)/n/2}" y="${pt}" width="${(W-pl-pr)/(n-1)}" height="${H-pt-pb}" fill="transparent" data-tip="<b>T${+x.m.slice(5)}/${x.m.slice(0,4)}</b>${x.act != null ? `<br>Thực bán lẻ: <b>${fmtInt(x.act)}</b>` : `<br>Dự báo: <b>${fmtInt(x.base)}</b> (${fmtInt(x.lo)}–${fmtInt(x.hi)})`}${x.kh ? `<br>Kế hoạch: ${fmtInt(x.kh)}` : ""}${x.erp ? `<br>Dự báo ERP: ${fmtInt(x.erp)}` : ""}"/>`).join("")}</svg>
    <div class="hlegend"><span><i style="background:${C.le}"></i>Thực bán lẻ 2026</span><span><i style="background:${C.good}"></i>Dự báo (dải 80%)</span><span><i style="background:${C.kh}"></i>Kế hoạch 2026/2027</span><span><i style="background:${C.ton}"></i>Dự báo cơ sở của ERP</span></div>`;
}
function fcHtml(){
  const F = forecast(); if(!F) return '<p class="muted">Chưa có chỉ số mùa vụ từ ERP để dự báo.</p>';
  const pc = (a,b) => b ? fmtInt(a/b*100) + "%" : "—", col = p => p >= 90 ? C.good : p >= 60 ? C.warn : C.bad;
  return `<div class="opstiles num">${[[fmtInt(F.f26), `ước cả năm 2026 (${fmtInt(F.act26)} thực + T11–T12) · ${pc(F.f26, F.kh26)} KH ${fmtInt(F.kh26)}`], [fmtInt(F.F27), `dự báo 2027 (${fmtInt(F.lo27)}–${fmtInt(F.hi27)}, 80%)`], [pc(F.F27, P.kh27), `so với KH 2027 ${fmtInt(P.kh27)} xe · thiếu ${fmtInt(P.kh27 - F.F27)}`], [F.pKH == null ? "—" : (F.pKH < 0.01 ? "< 1%" : fmtInt(F.pKH*100) + "%"), "xác suất đạt đủ KH 2027"], [(P.erpTotal27 || [])[0] ? fmtInt(P.erpTotal27[0]) : "—", "dự báo cơ sở của ERP (đối chiếu)"], [(F.g >= 0 ? "+" : "") + fmt1(F.g*100) + "%", `tăng trưởng 2027 dùng (CSI ${F.gRaw >= 0 ? "+" : ""}${fmt1(F.gRaw*100)}%, giảm chấn 1/2)`]].map(([v,l]) => `<div class="stat"><div class="v">${esc(String(v))}</div><div class="l">${esc(l)}</div></div>`).join("")}</div>
    ${fcChart(F)}
    <div class="hudgrid" style="margin-top:12px"><div class="hp w6"><h3>Theo đại lý · dự báo 2027 so với KH <span>xe</span></h3><div style="overflow-x:auto"><table class="tasktbl small"><thead><tr><th>Đại lý</th><th class="num">Bán lẻ T1–T10</th><th class="num">Dự báo 2027</th><th class="num">KH 2027</th><th class="num">% KH</th><th class="num">ERP</th></tr></thead><tbody>${F.D.map(x => { const p = x.kh27 ? x.f27/x.kh27*100 : null; return `<tr class="trow" data-sdl="${esc(x.name)}"><td>${esc(x.name)}</td><td class="num">${fmtInt(x.act)}</td><td class="num"><b>${fmtInt(x.f27)}</b><span class="reason">${fmtInt(x.lo27)}–${fmtInt(x.hi27)}</span></td><td class="num">${x.kh27 == null ? "—" : fmtInt(x.kh27)}</td><td class="num" style="color:${p == null ? "" : col(p)}">${p == null ? "—" : fmtInt(p) + "%"}</td><td class="num">${x.erp == null ? "—" : fmtInt(x.erp)}</td></tr>`; }).join("")}</tbody></table></div></div>
    <div class="hp w6"><h3>Theo nhóm model · dự báo 2027 so với KH <span>xe</span></h3><div style="overflow-x:auto"><table class="tasktbl small"><thead><tr><th>Nhóm model</th><th class="num">Đã bán 2026 (CSI)</th><th class="num">Dự báo 2027</th><th class="num">KH 2027</th><th class="num">% KH</th><th class="num">ERP</th></tr></thead><tbody>${F.M.map(x => { const p = x.kh27 ? x.f27/x.kh27*100 : null; return `<tr><td>${esc(x.g)}</td><td class="num">${fmtInt(x.sold26)}</td><td class="num">${x.sold26 ? `<b>${fmtInt(x.f27)}</b>` : `<span class="muted tiny">mẫu mới, chưa có lịch sử</span>`}</td><td class="num">${fmtInt(x.kh27)}</td><td class="num" style="color:${p == null || !x.sold26 ? "" : col(p)}">${!x.sold26 ? "—" : p == null ? "—" : fmtInt(p) + "%"}</td><td class="num">${fmtInt(x.erp)}</td></tr>`; }).join("")}</tbody></table></div>
      <h4>MISSU: tồn kho 2027 nếu nhập theo KH và bán theo dự báo</h4><p class="small">Tồn đầu (T9/2026) ${fmtInt(F.stock0)} xe → cuối T12/2027 ≈ <b style="color:${C.bad}">${fmtInt(F.msPath.slice(-1)[0])}</b> xe (bán dự báo ${fmtInt(F.F27*F.msShare)} xe/năm, KH nhập ${fmtInt(sum(P.msImport27m || []))} xe). Cần giảm KH nhập hoặc tăng bán MISSU.</p></div></div>
    <p class="note">Cách tính: bán lẻ thật T1–T10/2026 (TDBH, T10 = ${fmtInt(F.nat[9].le)} xe) khử mùa vụ bằng chỉ số mùa vụ 2025 suy từ dự báo cơ sở của ERP; loại tháng lệch mạnh (${F.ok.map((v,i) => v ? null : "T" + (i+1)).filter(Boolean).join(", ") || "không"}, ví dụ Tết 2026 rơi vào tháng 2 còn mùa vụ 2025 có Tết tháng 1); mức nền = trung bình có trọng số 6 tháng gần nhất (${fmtInt(F.level)} xe/tháng đã khử mùa vụ); tăng trưởng 2027 lấy từ số xe CSI 2026 quy năm so với 2025, giảm chấn một nửa; dải 80% gồm sai số từng tháng và sai số mức nền (σ tháng ${fmt1(F.sig*100)}%). Đại lý phân bổ theo thị phần nội bộ (50% 6 tháng gần nhất, 50% T1–T10); model theo cơ cấu CSI 2026 có điều chỉnh xu hướng. Dùng làm đường cơ sở cho S&amp;OP, chưa gồm tác động khuyến mãi, ra mắt JP mới.</p>`;
}
CV.salesSeason = SEAS; CV.salesForecast = forecast;
function fcMd2(){ const F = forecast(); if(!F) return "Chưa đủ dữ liệu.";
  return `# Dự báo doanh số Đô Thành T11/2026 – T12/2027\n_Từ dữ liệu ERP: bán lẻ thật T1–T10/2026 (T10 = ${fmtInt(F.nat[9].le)} xe), mùa vụ 2025, CSI 2023–2026, KH 2026/2027._\n\n- Ước cả năm 2026: **${fmtInt(F.f26)} xe** (thực ${fmtInt(F.act26)} + T11 ${fmtInt(F.months[0].base)} + T12 ${fmtInt(F.months[1].base)}) = ${fmtInt(F.f26/F.kh26*100)}% KH ${fmtInt(F.kh26)}.\n- Dự báo 2027: **${fmtInt(F.F27)} xe** (80%: ${fmtInt(F.lo27)}–${fmtInt(F.hi27)}) = ${fmtInt(F.F27/P.kh27*100)}% KH ${fmtInt(P.kh27)}; xác suất đạt đủ KH ${F.pKH < 0.01 ? "dưới 1%" : fmtInt(F.pKH*100) + "%"}. Dự báo cơ sở của ERP: ${fmtInt((P.erpTotal27||[])[0])} xe.\n\n## Theo tháng\n| Tháng | Dự báo | Dải 80% | KH | ERP |\n|---|---|---|---|---|\n${F.months.map(x => `| T${+x.m.slice(5)}/${x.m.slice(0,4)} | ${fmtInt(x.base)} | ${fmtInt(x.lo)}–${fmtInt(x.hi)} | ${x.kh ? fmtInt(x.kh) : "—"} | ${x.erp ? fmtInt(x.erp) : "—"} |`).join("\n")}\n\n## Theo đại lý 2027\n| Đại lý | Dự báo | KH | % KH | ERP |\n|---|---|---|---|---|\n${F.D.map(x => `| ${x.name} | ${fmtInt(x.f27)} | ${x.kh27 == null ? "—" : fmtInt(x.kh27)} | ${x.kh27 ? fmtInt(x.f27/x.kh27*100) + "%" : "—"} | ${x.erp == null ? "—" : fmtInt(x.erp)} |`).join("\n")}\n\n## Theo nhóm model 2027\n| Nhóm | Dự báo | KH | % KH | ERP |\n|---|---|---|---|---|\n${F.M.map(x => `| ${x.g} | ${x.sold26 ? fmtInt(x.f27) : "mẫu mới"} | ${fmtInt(x.kh27)} | ${x.kh27 ? fmtInt(x.f27/x.kh27*100) + "%" : "—"} | ${fmtInt(x.erp)} |`).join("\n")}\n\n## MISSU\n- Tồn T9/2026 ${fmtInt(F.stock0)} xe; nếu nhập theo KH 2027 (${fmtInt(sum(P.msImport27m||[]))} xe) và bán theo dự báo (${fmtInt(F.F27*F.msShare)} xe), tồn cuối 2027 ≈ ${fmtInt(F.msPath.slice(-1)[0])} xe.\n\n## Cách tính\n- Khử mùa vụ bằng chỉ số mùa vụ 2025 (suy từ dự báo cơ sở ERP), loại tháng lệch mạnh, mức nền trung bình trọng số 6 tháng, tăng trưởng từ CSI giảm chấn 1/2 (${fmt1(F.g*100)}%), dải 80% từ sai số.\n- Là đường cơ sở cho S&OP: đội kinh doanh điều chỉnh có bằng chứng ở mục Dự báo kinh doanh.\n`; }
CV.tools.push({name: "du_bao_doanh_so", label: "Đang dự báo doanh số…", description: "Dự báo doanh số Đô Thành T11/2026 – T12/2027 từ dữ liệu ERP (bán lẻ thật T1–T10/2026, mùa vụ 2025, CSI, KH): theo tháng, đại lý, nhóm model, xác suất đạt KH 2027, tồn MISSU, đối chiếu dự báo của ERP.", inputSchema: {type: "object", properties: {}}, execute: () => fcMd2()});

/* ---------- section ---------- */
const anchor = document.getElementById("hudSec") || document.getElementById("kpis");
if(anchor){
  const s = document.createElement("section"); s.className = "glass pad"; s.id = "salesSec"; s.setAttribute("aria-label", "Doanh số chi tiết IZ – MISSU");
  s.innerHTML = `<div class="opshead"><div><h2>Doanh số chi tiết IZ – MISSU</h2><p class="muted" style="margin:4px 0 0">Theo đại lý từng tháng 2026 (kế hoạch, bán sỉ, bán lẻ, tồn, thưởng) và theo model từng năm 2023–2026. Nguồn: Dashboard ERP Đô Thành, Tổng hợp TDBH cập nhật ${esc(S.sourceUpdated || "")}; danh sách xe CSI.</p></div>
    <div class="toolbar" style="margin:0"><label class="field">Miền<select id="slReg"><option value="">Tất cả</option>${[...new Set(S.dealers.map(d => d.region))].map(r => `<option>${esc(r)}</option>`).join("")}</select></label>
      <label class="field">Đại lý<select id="slDl"><option value="">Tất cả</option>${S.dealers.map(d => `<option>${esc(d.name)}</option>`).join("")}</select></label>
      <button type="button" class="primary" id="slBen">Ben phân tích doanh số</button><button type="button" id="slCsv">Xuất đại lý × tháng (.csv)</button></div></div>
    <div class="opstiles num" id="slTiles"></div>
    <div class="hp w12" style="margin-bottom:12px"><h3>Bán lẻ, bán sỉ, kế hoạch và tồn theo tháng 2026 <span id="slScope"></span></h3><div id="slCombo"></div></div>
    <div class="hp w12" style="margin-bottom:12px"><h3>Đại lý × tháng: bán lẻ so với kế hoạch <span>rê chuột vào ô để xem chi tiết</span></h3><div id="slHeat"></div></div>
    <div class="hudgrid"><div class="hp w6"><h3>Model theo năm 2023–2026 <span>CSI</span></h3><div id="slModel"></div></div><div class="hp w6"><h3>Nhận định tự động</h3><ul class="actions" id="slIns"></ul></div></div>
    <div class="hp w12" style="margin-top:12px"><h3>Dự báo doanh số T11/2026 – T12/2027 <span><button type="button" id="slFcBen">Ben báo cáo dự báo</button></span></h3><div id="slFc"></div></div>`;
  anchor.after(s);
}
function scope(){ const r = (document.getElementById("slReg") || {}).value, d = (document.getElementById("slDl") || {}).value;
  return d ? [d] : r ? S.dealers.filter(x => x.region === r).map(x => x.name) : null; }
function render(){
  const el = document.getElementById("slCombo"); if(!el) return; const names = scope(), ser = series(names);
  const le = sum(ser.map(x => x.le)), kh = sum(ser.map(x => x.kh)), si = sum(ser.map(x => x.si)), t10 = ser[ser.length-1], ton = ser[ser.length-2].ton, avg3 = sum(ser.slice(-4, -1).map(x => x.le))/3, M = models(names, "2026");
  document.getElementById("slScope").textContent = names ? (names.length === 1 ? names[0] : (document.getElementById("slReg").value + " · " + names.length + " đại lý")) : "toàn hệ thống";
  document.getElementById("slTiles").innerHTML = [[fmtInt(le), "xe bán lẻ T1–T10"], [kh ? fmtInt(le/kh*100) + "%" : "—", `đạt KH lũy kế (${fmtInt(kh)})`], [fmtInt(si), "xe bán sỉ T1–T9"], [`${fmtInt(t10.izLe)} · ${fmtInt(t10.msLe)}`, "IZ · MISSU tháng 10"], [fmtInt(ton), `tồn cuối T9 ≈ ${avg3 ? fmt1(ton/avg3) : "—"} tháng bán`], [M[0] ? M[0].m : "—", `model bán nhiều nhất 2026 (${M[0] ? fmtInt(M[0].y26) : 0} xe)`], [fmt1(sum(ser.map(x => x.thuong))), "thưởng tạm tính (tr đ)"]]
    .map(([v,l]) => `<div class="stat"><div class="v">${esc(String(v))}</div><div class="l">${esc(l)}</div></div>`).join("");
  el.innerHTML = combo(ser);
  document.getElementById("slHeat").innerHTML = heat(names);
  document.getElementById("slModel").innerHTML = modelTable(names);
  if(!render.fcDone){ document.getElementById("slFc").innerHTML = fcHtml(); render.fcDone = true; }
  document.getElementById("slIns").innerHTML = insights(names).map(x => `<li>${esc(x)}</li>`).join("") || "<li>Không có cảnh báo.</li>";
}
document.addEventListener("change", e => { if(e.target.id === "slReg"){ document.getElementById("slDl").value = ""; render(); } if(e.target.id === "slDl") render(); });
document.addEventListener("click", e => {
  const tr = e.target.closest && e.target.closest("[data-sdl]");
  if(tr){ const n = tr.dataset.sdl; document.getElementById("slDl").value = n; render(); const d = NETD(n); if(d){ CV.select(d.province, true); CV.focusOn(d.lng, d.lat, 60); } }
  if(e.target.id === "slFcBen"){ CV.openAi(true); CV.benTab("Chat"); CV.addMsg("u", "Dự báo doanh số 2027"); const b = CV.addMsg("a", ""); CV.finishBubble(b, fcMd2(), false, "Dự báo doanh số", true); }
  if(e.target.id === "slBen"){ CV.openAi(true); CV.benTab("Chat"); CV.addMsg("u", "Phân tích doanh số chi tiết"); const b = CV.addMsg("a", ""); CV.finishBubble(b, salesMd(scope()), false, "Doanh số chi tiết", true); }
  if(e.target.id === "slCsv"){ const csv = "dai_ly,mien,thang,kh,ban_le,ban_si,ton_cuoi_thang,thuong_tr,iz_le,missu_le\n" + S.dealers.flatMap(d => MONTHS.map(m => { const x = d.m[m] || {}; return [d.name, d.region, m, x.kh ?? "", x.le ?? "", x.si ?? "", x.ton ?? "", x.thuong ?? "", x.izLe ?? "", x.msLe ?? ""].join(","); })).join("\n");
    const b = new Blob(["﻿" + csv], {type: "text/csv"}), a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "doanh-so-dai-ly-thang-2026.csv"; a.click(); }
});

/* ---------- báo cáo, Ben, liên kết ---------- */
function salesMd(names, model){
  const ser = series(names), le = sum(ser.map(x => x.le)), kh = sum(ser.map(x => x.kh)), M = models(names);
  const sc = names ? (names.length === 1 ? names[0] : names.length + " đại lý") : "toàn hệ thống";
  const ds = S.dealers.filter(d => !names || names.includes(d.name)).map(d => ({d, s: dealerStats(d)})).sort((a,b) => b.s.le - a.s.le);
  const mm = model ? M.filter(x => up(x.m).includes(up(model))) : M.slice(0, 12);
  return `# Doanh số chi tiết IZ – MISSU: ${sc}\n_Nguồn: Dashboard ERP Đô Thành (Tổng hợp TDBH cập nhật ${S.sourceUpdated}; CSI theo số khung). Đồng bộ ${S.updated}._\n\n## Theo tháng 2026\n| Tháng | KH | Bán lẻ | %HT | Bán sỉ | Tồn cuối tháng | IZ / MISSU |\n|---|---|---|---|---|---|---|\n${ser.map(x => `| ${ML(x.m)} | ${fmtInt(x.kh)} | ${fmtInt(x.le)} | ${x.kh ? fmtInt(x.le/x.kh*100) + "%" : "—"} | ${x.si == null ? "—" : fmtInt(x.si)} | ${x.ton == null ? "—" : fmtInt(x.ton)} | ${x.izLe || x.msLe ? fmtInt(x.izLe) + " / " + fmtInt(x.msLe) : "—"} |`).join("\n")}\n| **Cộng** | **${fmtInt(kh)}** | **${fmtInt(le)}** | **${kh ? fmtInt(le/kh*100) + "%" : "—"}** | ${fmtInt(sum(ser.map(x => x.si)))} | | |\n\n## Theo đại lý (lũy kế T1–T10)\n| Đại lý | Miền | Bán lẻ / KH | %HT | 3 tháng gần nhất | Tồn T9 | Thưởng (tr) |\n|---|---|---|---|---|---|---|\n${ds.map(({d,s}) => `| ${d.name} | ${d.region} | ${fmtInt(s.le)} / ${fmtInt(s.kh)} | ${s.pct == null ? "—" : fmtInt(s.pct) + "%"} | ${fmtInt(s.l3)}/${fmtInt(s.k3)} | ${s.ton ?? "—"} | ${fmt1(s.thuong)} |`).join("\n")}\n\n## Theo model (xe, CSI)\n| Model | Dòng | 2023 | 2024 | 2025 | 2026 |\n|---|---|---|---|---|---|\n${mm.map(x => `| ${x.m} | ${x.line} | ${x.ys["2023"] || "—"} | ${x.ys["2024"] || "—"} | ${x.ys["2025"] || "—"} | ${x.ys["2026"] || "—"} |`).join("\n")}\n\n## Nhận định\n${insights(names).map(x => "- " + x).join("\n") || "- Không có cảnh báo."}\n\n_Lưu ý: số theo model là số xe theo năm (CSI), chưa có model theo từng tháng; tháng 10 chỉ tách IZ / MISSU._\n`;
}
CV.salesOf = name => { const d = S.dealers.find(x => x.name === name); return d ? {d, s: dealerStats(d)} : null; };
CV.salesSpark = name => { const d = S.dealers.find(x => x.name === name); if(!d) return ""; const v = MONTHS.map(m => (d.m[m] || {}).le || 0), k = MONTHS.map(m => (d.m[m] || {}).kh || 0), mx = Math.max(...v, ...k, 1);
  return `<svg viewBox="0 0 120 28" width="120" height="28" aria-hidden="true">${v.map((x,i) => `<rect x="${i*12+1}" y="${27 - x/mx*25}" width="9" height="${x/mx*25}" rx="2" fill="${C.le}"/>`).join("")}<path d="${k.map((x,i) => (i ? "L" : "M") + (i*12+5.5) + "," + (27 - x/mx*25).toFixed(1)).join("")}" fill="none" stroke="${C.kh}" stroke-width="1.2" stroke-dasharray="3 2"/></svg>`; };
CV.salesModelsOfProvince = prov => { const o = {}; S.csiProvModel.forEach(([y, p, m, n]) => { if(p === prov && y === "2026") o[m] = (o[m] || 0) + n; }); return Object.entries(o).sort((a,b) => b[1] - a[1]); };
CV.salesForecastRows = () => { // lịch sử thật cho mô hình dự báo: bán lẻ đại lý × tháng, phân bổ tải trọng theo cơ cấu model 2026 (CSI)
  const segOf = m => /^(V56|V65|T26)$/.test(m) ? "< 1 tấn" : /^(T33L|IZ45S|IZ50S|IZ50M|IZ60SL|IZ50M-PLUS|IZ60SL-PLUS|IZ250)$/.test(m) ? "1–2,5 tấn" : /^JP/.test(m) ? "3,5–10 tấn" : "2,5–3,5 tấn";
  const rows = []; S.dealers.forEach(d => { const mix = {}; S.csiDealerModel.forEach(([y, dl, m, n]) => { if(y === "2026" && csiName(dl) === d.name){ const g = segOf(m); mix[g] = (mix[g] || 0) + n; } }); const tot = sum(Object.values(mix)) || 1;
    if(!Object.keys(mix).length) mix["2,5–3,5 tấn"] = 1;
    MONTHS.forEach(m => { const le = (d.m[m] || {}).le || 0; if(!le) return; Object.entries(mix).forEach(([g, n]) => { const q = Math.round(le * n / tot); if(q) rows.push({m, seg: g, body: "Chưa tách loại thùng", qty: q, cust: "", dealer: d.name}); }); }); });
  return rows; };
CV.tools.push({name: "doanh_so_chi_tiet", label: "Đang tra doanh số…", description: "Doanh số IZ – MISSU chi tiết: theo tháng 2026 (KH, bán lẻ, bán sỉ, tồn, thưởng, IZ/MISSU tháng 10), theo đại lý, theo model từng năm 2023–2026 (CSI). Lọc theo dai_ly (tên đại lý, ví dụ 'Trường Vũ'), mien ('Miền Bắc' | 'Miền Trung' | 'Miền Nam' | 'Miền Tây'), model (ví dụ 'IZ65M').",
  inputSchema: {type: "object", properties: {dai_ly: {type: "string"}, mien: {type: "string"}, model: {type: "string"}}},
  execute: ({dai_ly, mien, model}) => { let names = null; if(dai_ly){ const d = S.dealers.find(x => up(x.name).includes(up(dai_ly)) || up(dai_ly).includes(up(x.name))); if(!d) throw new Error("Không có đại lý " + dai_ly); names = [d.name]; }
    else if(mien){ names = S.dealers.filter(x => up(x.region).includes(up(mien))).map(x => x.name); } return salesMd(names, model); }});
CV.localHooks.unshift(raw => { const t = raw.replace(/^ben\s*(ơi)?[,:\s]+/i, "").trim(); if(/dự báo (doanh số|bán hàng|2027|năm)|khả năng đạt (kế hoạch|kh)/i.test(t)) return fcMd2(); if(!/doanh số|bán lẻ|bán sỉ|tồn kho|thưởng/i.test(t) || /dự báo/i.test(t)) return null;
  const d = S.dealers.find(x => up(t).includes(up(x.name))); if(!d && !/chi tiết|theo tháng|theo model|từng/i.test(t)) return null; return salesMd(d ? [d.name] : null); });
const prev = CV.ctx; CV.ctx = () => (prev ? prev() : "") + `\nDOANH SỐ CHI TIẾT (Tổng hợp TDBH ${S.sourceUpdated}, CSI): có số đại lý × tháng T1–T10/2026 và model × năm 2023–2026; hỏi chi tiết dùng doanh_so_chi_tiet; dự báo doanh số 2026–2027, khả năng đạt KH dùng du_bao_doanh_so.`;
render();
})();
