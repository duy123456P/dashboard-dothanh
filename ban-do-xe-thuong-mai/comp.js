/* ===== Đối thủ: bảng giá, chính sách, so sánh đối đầu với Đô Thành (Teraco, Thaco, JAC, Foton, TMT + toàn cảnh) ===== */
(function(){
"use strict";
const CV = window.__CV; if(!CV) return;
const {esc, fmtInt, fmt1, toast} = CV;
let C, PL; try{ C = JSON.parse(document.getElementById("comp-data").textContent); PL = JSON.parse(document.getElementById("pl-data").textContent); }catch(e){ return; }
const tr = v => v == null ? "—" : fmt1(v/1e6).replace(",0","");
const bodyKey = b => { b = String(b).toLowerCase(); return /van/.test(b) ? "van" : /chassis|satxi/.test(b) ? "chassis" : /lửng/.test(b) && !/bạt/.test(b) ? "lung" : /bạt/.test(b) ? "bat" : /composite/.test(b) ? "kincomp" : /kín|tk/.test(b) ? "kin" : "other"; };
const offerOf = m => { const o = (PL.offers||[]).find(x => x.cmodel === m); return o && o.total26 ? o.total26 : 0; };
function dtMatch(it){
  if(!it.dt) return null; const k = bodyKey(it.body); if(k === "other") return null;
  const cands = PL.items.filter(x => x.cmodel === it.dt && !/tập lái/i.test(x.body));
  return cands.find(x => bodyKey(x.body) === k) || (k === "kincomp" ? cands.find(x => bodyKey(x.body) === "kin") : null) || null;
}
function rowsOf(brand){
  return brand.items.map(it => { const d = dtMatch(it), cNet = it.maxRetail - it.promo, dOff = d ? offerOf(d.cmodel) : 0, dNet = d ? d.retail - dOff : null;
    const cMar = it.dealer ? it.maxRetail - it.dealer : null, dMar = d ? d.retail - d.dealer : null;
    return {it, d, cNet, dOff, dNet, gapList: d ? d.retail - it.maxRetail : null, gapNet: d ? dNet - cNet : null, cMarPct: cMar == null ? null : cMar / it.maxRetail * 100, cMar, dMar, dMarPct: d ? dMar / d.retail * 100 : null}; }); }
function insights(brand){
  const R = rowsOf(brand).filter(r => r.d), by = {};
  R.forEach(r => { (by[r.it.seg] = by[r.it.seg] || []).push(r); });
  const seg = Object.entries(by).map(([s, rs]) => ({s, n: rs.length, list: rs.reduce((a,r) => a + r.gapList, 0)/rs.length, net: rs.reduce((a,r) => a + r.gapNet, 0)/rs.length, cm: rs[0].cMarPct == null ? null : rs.reduce((a,r) => a + r.cMarPct, 0)/rs.length, dm: rs.reduce((a,r) => a + r.dMarPct, 0)/rs.length, pair: rs[0].it.model + " ↔ " + rs[0].d.cmodel}));
  const out = [];
  seg.forEach(x => out.push(`${x.s} (${x.pair}): giá công bố Đô Thành ${x.list >= 0 ? "cao hơn" : "thấp hơn"} ${tr(Math.abs(x.list))} tr; sau khuyến mãi T11 Đô Thành ${x.net <= 0 ? "rẻ hơn" : "đắt hơn"} ${tr(Math.abs(x.net))} tr. ${x.cm == null ? "" : `Biên đại lý: ${brand.name} ${fmt1(x.cm)}% so với Đô Thành ${fmt1(x.dm)}%.`}`));
  const cheaperNet = seg.filter(x => x.net < 0).map(x => x.s), dearerNet = seg.filter(x => x.net > 0).map(x => x.s), dealerLose = seg.filter(x => x.cm != null && x.cm > x.dm + 0.5).map(x => x.s);
  return {seg, out, cheaperNet, dearerNet, dealerLose, unmatched: brand.items.filter(it => !dtMatch(it)).map(it => it.model + " · " + it.body)};
}
function compMd(k){
  if(k === "all" || k === "toan canh") return panoMd();
  const B = C.brands.find(b => b.k === (k || "teraco")) || C.brands[0], I = insights(B), maxP = Math.max(0, ...B.items.map(x => x.promo || 0));
  return `# Đối thủ ${B.name}: giá, chính sách và so sánh với Đô Thành\n_${B.maker}. ${B.priceDoc}. ${B.promoDoc}. Cập nhật ${C.updated.split("-").reverse().join("/")}_\n\n## Doanh nghiệp\n${(B.profile||[]).map(x => "- " + x).join("\n")}${B.promoRules ? "\n\n## Chính sách bán hàng\n" + B.promoRules.map(x => "- " + x).join("\n") : ""}${B.vsDT ? "\n\n## Đối đầu theo giá thực bán\n| Phân khúc | " + B.name + " | Đô Thành | Chênh | Vị thế |\n|---|---|---|---|---|\n" + B.vsDT.map(r => "| " + r.join(" | ") + " |").join("\n") : ""}${B.recs ? "\n\n## Kiến nghị\n" + B.recs.map((r, i) => `${i + 1}. **${r[0]}** (${r[2]}): ${r[1]}`).join("\n") : ""}\n\n## Mạng lưới bán hàng, dịch vụ\n${(() => { const nb = (CNs().brands||{})[B.k], P = CNs().points.filter(p => p.b === B.k); return nb ? `- Quy mô: ${nb.total}\n- Dịch vụ: ${nb.svc}\n- Điểm đã xác minh (${P.length}): ${P.map(p => p.name + " (" + p.province + ", " + p.type + ")").join("; ")}` : "- Chưa có dữ liệu"; })()}\n\n## Thông số và cặp đối đầu\n| Dòng xe | Tải trọng, thùng | Động cơ | Đô Thành |\n|---|---|---|---|\n${(B.specs||[]).map(s => "| " + s.join(" | ") + " |").join("\n")}\n\n## Chính sách khuyến mãi\n${B.promoRules.map(x => "- " + x).join("\n")}\n${(B.promoHistory||[]).map(x => "- " + x).join("\n")}\n\n## Nhận định chiến lược\n${(B.insight||[]).map(x => "- " + x).join("\n")}\n\n## So sánh theo phân khúc (giá tối đa ${B.name} so với giá lẻ công bố Đô Thành T11/2026; biên ĐL đối thủ chỉ có khi có giá giao đại lý)\n| Phân khúc | Cặp đối đầu | Chênh giá công bố (ĐT − đối thủ) | Chênh giá ròng sau KM T11 | Biên ĐL đối thủ | Biên ĐL Đô Thành |\n|---|---|---|---|---|---|\n${I.seg.map(x => `| ${x.s} | ${x.pair} | ${x.list >= 0 ? "+" : "−"}${tr(Math.abs(x.list))} tr | ${x.net >= 0 ? "+" : "−"}${tr(Math.abs(x.net))} tr | ${x.cm == null ? "—" : fmt1(x.cm) + "%"} | ${fmt1(x.dm)}% |`).join("\n")}\n\n## Nhận định\n${I.out.map(x => "- " + x).join("\n")}\n${I.cheaperNet.length ? `- **Đô Thành có lợi thế giá ròng** ở: ${I.cheaperNet.join(", ")} (nhờ ưu đãi T11 lớn hơn nhiều: Đô Thành 24,8–55 tr/xe, ${B.name} tối đa ${tr(maxP)} tr/xe).` : ""}\n${I.dearerNet.length ? `- **Đô Thành đắt hơn sau khuyến mãi** ở: ${I.dearerNet.join(", ")}: cần sale talk về chất lượng, TCO, mạng lưới dịch vụ.` : ""}\n${I.dealerLose.length ? `- **Rủi ro đại lý:** biên lợi nhuận của ${B.name} cao hơn ở ${I.dealerLose.join(", ")}: đối thủ có thể lôi kéo đại lý đa thương hiệu.` : ""}\n- Phiên bản chưa có đối thủ trực tiếp của Đô Thành: ${I.unmatched.join("; ") || "không"}.\n\n## Lưu ý dữ liệu\n${B.notes.map(x => "- " + x).join("\n")}\n`;
}

/* toàn cảnh: giá ròng thấp nhất mỗi hãng theo phân khúc so với Đô Thành */
const SEGS = ["Van 2–5 chỗ","Tải dưới 1 tấn","Tải 1,25–1,5 tấn","Tải 1,9–2,5 tấn","Tải 3,5 tấn","Tải 5 tấn","Tải 7 tấn","Ben","Tải nặng, ben, đầu kéo","Thùng dài 5,2–6,2 m"];
const segOf = s => /van/i.test(s) ? SEGS[0] : /thùng [56],2/.test(s) ? SEGS[9] : /990|dưới 1|1 tấn$/i.test(s) ? SEGS[1] : /1,25|1,4|1,5/.test(s) ? SEGS[2] : /1,9|2,4|2,5|2 tấn/.test(s) ? SEGS[3] : /3,5/.test(s) ? SEGS[4] : /5 tấn/.test(s) ? SEGS[5] : /7 tấn|thùng dài|7,5/i.test(s) ? SEGS[6] : /nặng|đầu kéo/i.test(s) ? SEGS[8] : /ben/i.test(s) ? SEGS[7] : s;
function pano(){
  const V = ((CV.NET || {}).vama || {}).brands || [];
  const rows = SEGS.map(sg => { const cells = C.brands.map(B => { const rs = rowsOf(B).filter(r => segOf(r.it.seg) === sg); if(!rs.length) return null; const m = rs.reduce((a,r) => r.cNet < a.cNet ? r : a); return {b: B.name, net: m.cNet, model: m.it.model + " · " + m.it.body}; });
    const ms = C.brands.flatMap(B => rowsOf(B).filter(r => r.d && segOf(r.it.seg) === sg).map(r => Object.assign({b: B.name}, r))), best = ms.length ? ms.reduce((a,r) => r.cNet < a.cNet ? r : a) : null;
    const all = cells.filter(Boolean), low = all.length ? all.reduce((a,c) => c.net < a.net ? c : a) : null;
    return {sg, cells, low, gap: best ? best.gapNet : null, dt: best ? {net: best.dNet, model: best.d.cmodel + " · " + best.d.body, vs: best.b + " " + best.it.model + " · " + best.it.body} : null}; }).filter(r => r.cells.some(Boolean));
  return {rows, V};
}
function panoMd(){
  const P = pano(), th = P.rows.map(r => { const g = r.gap; return `| ${r.sg} | ${r.dt ? tr(r.dt.net) + " (" + r.dt.model + " ↔ " + r.dt.vs + ")" : "chưa có"} | ${C.brands.map((B,i) => r.cells[i] ? tr(r.cells[i].net) : "—").join(" | ")} | ${r.low ? r.low.b : "—"} | ${g == null ? "—" : (g > 0 ? "+" : "−") + tr(Math.abs(g))} |`; }).join("\n");
  const gaps = P.rows.filter(r => !r.dt).map(r => r.sg), win = P.rows.filter(r => r.gap != null && r.gap <= 0).map(r => r.sg), lose = P.rows.filter(r => r.gap > 0).map(r => `${r.sg} (${r.dt.vs} rẻ hơn ${tr(r.gap)} tr)`);
  return `# Toàn cảnh thị trường xe tải nhẹ–trung: Đô Thành so với ${C.brands.map(b => b.name).join(", ")}\n_Giá ròng thấp nhất mỗi hãng theo phân khúc = giá bán tối đa (hoặc giá tham khảo) − khuyến mãi tháng; Đô Thành = giá lẻ T11/2026 − ưu đãi T11. Đơn vị triệu đồng. Cập nhật ${C.updated.split("-").reverse().join("/")}_\n\n| Phân khúc | Đô Thành (ròng) | ${C.brands.map(b => b.name).join(" | ")} | Rẻ nhất đối thủ | ĐT − đối thủ rẻ nhất cùng loại thùng |\n|---|---|${C.brands.map(() => "---").join("|")}|---|---|\n${th}\n\n## Sản lượng (VAMA ${((CV.NET||{}).vama||{}).period || ""})\n${P.V.length ? P.V.map(v => `- ${v[0]}: ${fmtInt(v[1])} xe (T9: ${fmtInt(v[2])})`).join("\n") : "- chưa có"}\n- JAC, Foton, TMT, Teraco không báo cáo qua VAMA.\n\n## Nhận định toàn cảnh\n- **Đô Thành rẻ nhất sau ưu đãi** ở: ${win.join(", ") || "không phân khúc nào"}.\n- **Bị đối thủ rẻ hơn** ở: ${lose.join("; ") || "không"}. Đây là chỗ sale talk cần TCO, chất lượng, dịch vụ.\n- **Khoảng trống sản phẩm** (đối thủ có, Đô Thành không): ${gaps.join(", ") || "không"}.\n- Thaco dẫn đầu sản lượng nhờ mạng đại lý dày nhất; Kia K200/K250 là đối thủ chính của IZ45S/IZ50S.\n- Ưu đãi T11 Đô Thành (24,8–55 tr/xe) lớn hơn hẳn đối thủ (0–15 tr công khai): lợi thế giá ròng là vũ khí chính, cần truyền thông đúng giá ròng.\n\n## Lưu ý\n- Teraco có bảng giá giao đại lý chính thức; Thaco, JAC, Foton, TMT là giá tham khảo từ website đại lý, lệch nhau tới vài chục triệu.\n`;
}
function renderPano(el){
  const P = pano();
  document.getElementById("cpProf").innerHTML = `<p>Chọn từng hãng ở ô "Đối thủ" để xem hồ sơ, thông số, nguồn.</p>`;
  document.getElementById("cpMeta").innerHTML = `Toàn cảnh ${C.brands.length} đối thủ · giá ròng thấp nhất mỗi hãng theo phân khúc, triệu đồng`;
  const win = P.rows.filter(r => r.gap != null && r.gap <= 0).length, lose = P.rows.filter(r => r.gap > 0).length, gap = P.rows.filter(r => !r.dt).length;
  document.getElementById("cpTiles").innerHTML = [[C.brands.length, "đối thủ theo dõi"], [C.brands.reduce((a,b) => a + b.items.length, 0), "phiên bản đối thủ"], [win, "phân khúc ĐT rẻ nhất sau ưu đãi"], [lose, "phân khúc bị đối thủ rẻ hơn"], [gap, "phân khúc ĐT chưa có xe"]]
    .map(([v,l]) => `<div class="stat"><div class="v">${esc(String(v))}</div><div class="l">${esc(l)}</div></div>`).join("");
  el.innerHTML = `<thead><tr><th>Phân khúc</th><th>Đô Thành (ròng)</th>${C.brands.map(b => `<th>${esc(b.name)}</th>`).join("")}<th>ĐT − đối thủ rẻ nhất cùng thùng</th></tr></thead><tbody>${P.rows.map(r => { const g = r.gap;
    return `<tr><td class="small">${esc(r.sg)}</td><td class="num">${r.dt ? `<b>${tr(r.dt.net)}</b><span class="reason">${esc(r.dt.model)} ↔ ${esc(r.dt.vs)}</span>` : '<span class="muted">chưa có</span>'}</td>${r.cells.map(c => `<td class="num">${c ? `${c === r.low ? "<b>" : ""}${tr(c.net)}${c === r.low ? "</b>" : ""}<span class="reason">${esc(c.model)}</span>` : "—"}</td>`).join("")}<td class="num" style="color:${g == null ? "" : g <= 0 ? "var(--good)" : "var(--bad)"}">${g == null ? "—" : (g > 0 ? "+" : "−") + tr(Math.abs(g))}</td></tr>`; }).join("")}</tbody>`;
  document.getElementById("cpIns").innerHTML = `<li>Xanh = Đô Thành rẻ nhất phân khúc sau ưu đãi T11; đỏ = có đối thủ rẻ hơn. Hàng "chưa có" là khoảng trống sản phẩm.</li><li class="muted small">Teraco: bảng giá đại lý chính thức. Thaco, JAC, Foton, TMT: giá tham khảo website đại lý 08–11/2026.</li>`;
}

/* mạng lưới showroom, 3S, xưởng dịch vụ đối thủ (CNET) so với Đô Thành */
const CNs = () => CV.CNET || {brands:{}, points:[]};
const isSvc = p => /3S|xưởng|bảo hành|dịch vụ/i.test(p.type);
function netStats(){
  const N = CNs(), dtProv = new Set(CV.NET.dealers.map(d => d.province)), dtSvc = new Set(CV.NET.stations.map(s => s.province).concat([...dtProv]));
  const rows = Object.entries(N.brands).map(([k,b]) => { const P = N.points.filter(p => p.b === k), prov = [...new Set(P.map(p => p.province))];
    return {k, b, n: P.length, svc: P.filter(isSvc).length, prov, noDT: prov.filter(p => !dtProv.has(p))}; });
  const byProv = {}; N.points.forEach(p => { (byProv[p.province] = byProv[p.province] || new Set()).add(p.b); });
  const white = Object.entries(byProv).filter(([p]) => !dtProv.has(p)).map(([p,s]) => ({p, n: s.size, svc: dtSvc.has(p)})).sort((a,b) => b.n - a.n);
  const dense = Object.entries(byProv).map(([p,s]) => ({p, brands: s.size, pts: N.points.filter(x => x.province === p).length, dt: CV.NET.dealers.filter(d => d.province === p).length + CV.NET.stations.filter(x => x.province === p).length})).filter(x => x.pts > x.dt).sort((a,b) => (b.pts - b.dt) - (a.pts - a.dt));
  const far = N.points.map(p => { let m = 1e9, w = null; CV.NET.dealers.concat(CV.NET.stations).forEach(x => { const d = CV.km(p, x); if(d < m){ m = d; w = x; } }); return {p, d: m, w}; }).filter(x => x.d > 30).sort((a,b) => b.d - a.d);
  return {N, rows, white, dense, far, dt: {dealers: CV.NET.dealers.length, stations: CV.NET.stations.length, prov: dtProv.size}};
}
function netMd(){
  const S = netStats();
  return `# Mạng lưới showroom, 3S, xưởng dịch vụ: Đô Thành so với đối thủ\n_Cập nhật ${S.N.updated.split("-").reverse().join("/")}. ${S.N.note}_\n\n| Hãng | Quy mô công bố | Điểm đã xác minh | 3S / xưởng DV | Tỉnh có điểm | Tỉnh đối thủ có, Đô Thành chưa có đại lý |\n|---|---|---|---|---|---|\n| **Đô Thành** | ${S.dt.dealers} đại lý + ${S.dt.stations} trạm dịch vụ ủy quyền | ${S.dt.dealers + S.dt.stations} | ${S.dt.stations} trạm + đại lý kiêm DV | ${S.dt.prov} | — |\n${S.rows.map(r => `| ${r.b.name} | ${r.b.total} | ${r.n} | ${r.svc} | ${r.prov.length} | ${r.noDT.join(", ") || "không"} |`).join("\n")}\n\n## Khoảng trống mạng lưới\n${S.white.length ? S.white.map(w => `- **${w.p}**: ${w.n} hãng đối thủ có điểm, Đô Thành chưa có đại lý${w.svc ? " (đã có trạm dịch vụ)" : ", cũng chưa có trạm dịch vụ"}.`).join("\n") : "- Không có tỉnh nào đối thủ có điểm mà Đô Thành không có đại lý."}\n\n## Tỉnh đối thủ dày hơn Đô Thành\n${S.dense.slice(0, 8).map(x => `- ${x.p}: ${x.pts} điểm đối thủ (${x.brands} hãng) so với ${x.dt} điểm Đô Thành.`).join("\n") || "- Không có."}\n\n## Điểm đối thủ xa mạng Đô Thành (> 30 km)\n${S.far.slice(0, 8).map(x => `- ${(S.N.brands[x.p.b]||{}).name} ${CV.gmapMd(x.p, x.p.name)} (${x.p.province}): cách ${CV.gmapMd(x.w, x.w.salesKey || x.w.name)} ${Math.round(x.d)} km; nguồn: ${(S.N.sources[x.p.src] || [])[1] ? `[${S.N.sources[x.p.src][0]}](${S.N.sources[x.p.src][1]})` : "—"}.`).join("\n") || "- Không có."}\n\n## Nhận định\n- Thaco phủ dày nhất (hơn 450 showroom, xưởng đa thương hiệu, 34 tỉnh): khách ở tỉnh xa luôn có xưởng Thaco gần hơn. Đô Thành cần bù bằng trạm dịch vụ ủy quyền và dịch vụ lưu động.\n- Teraco (hơn 50 đại lý, phần lớn 3S) và JAC tập trung ở các đầu mối HN, HP, Thanh Hóa, Nghệ An, Đà Nẵng, TP.HCM, Đồng Nai, Cần Thơ: đúng các thị trường lớn của Đô Thành.\n- Foton (20 đại lý, 11 tỉnh) đang mở nhanh 3S từ 2025–2026 dưới ADCV: cần theo dõi khi họ mở thêm ở miền Trung, Tây Nguyên.\n- TMT mạnh ở ben nông thôn, dịch vụ bảo hành lưu động; Đô Thành nên có gói cứu hộ 24h tương đương.\n\n## Lưu ý dữ liệu\n- Danh sách đối thủ chưa đầy đủ: chỉ gồm điểm xác minh được qua website công ty tỉnh, đại lý, báo chí. Website tổng của hãng chưa truy cập được từ môi trường này.\n- Tọa độ đối thủ gần đúng cấp phường/xã.\n`;
}

/* section */
const anchor = document.getElementById("priceSec");
if(anchor){
  const s = document.createElement("section"); s.className = "glass pad"; s.id = "compSec"; s.setAttribute("aria-label","Đối thủ: giá và chính sách");
  s.innerHTML = `<div class="opshead"><div><h2>Đối thủ: giá &amp; chính sách</h2><p class="muted" style="margin:4px 0 0">So sánh từng phiên bản đối thủ với xe Đô Thành cùng phân khúc, cùng loại thùng: giá công bố, khuyến mãi tháng, giá ròng và biên lợi nhuận đại lý.</p></div>
    <div class="toolbar" style="margin:0"><label class="field">Đối thủ<select id="cpBrand"><option value="all">Toàn cảnh thị trường</option>${C.brands.map(b => `<option value="${esc(b.k)}">${esc(b.name)}</option>`).join("")}</select></label><button type="button" class="primary" id="cpBrief">Ben phân tích đối thủ</button><button type="button" id="cpTalk">Sale talk đối đầu</button></div></div>
    <div id="cpMeta" class="small muted" style="margin:8px 0"></div><details class="lgdoc" style="margin-bottom:10px"><summary><b>Hồ sơ đối thủ, thông số, lịch sử khuyến mãi</b></summary><div id="cpProf" class="small"></div></details><div class="opstiles num" id="cpTiles"></div>
    <div style="overflow-x:auto"><table class="tasktbl" id="cpTable"></table></div><ul class="actions" id="cpIns"></ul>
    <details class="lgdoc" id="cpNetBox" style="margin-top:10px"><summary><b>Mạng lưới showroom, 3S, xưởng dịch vụ: Đô Thành so với đối thủ</b></summary><div class="toolbar"><button type="button" class="primary" id="cpNetMap">Xem trên bản đồ 3D</button><button type="button" id="cpNetBen">Ben phân tích mạng lưới</button></div><div id="cpNet" class="small"></div></details>`;
  anchor.after(s);
}
function render(){
  const el = document.getElementById("cpTable"); if(!el) return;
  if(document.getElementById("cpBrand").value === "all") return renderPano(el);
  const B = C.brands.find(b => b.k === document.getElementById("cpBrand").value) || C.brands[0], R = rowsOf(B), I = insights(B);
  const L = (h, a) => a && a.length ? `<h4>${h}</h4><ul>${a.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
  document.getElementById("cpProf").innerHTML = L("Doanh nghiệp", B.profile) + (B.specs ? `<h4>Thông số và đối thủ tương ứng của Đô Thành</h4><div style="overflow-x:auto"><table class="tasktbl"><thead><tr><th>Dòng xe</th><th>Tải trọng, thùng</th><th>Động cơ</th><th>Đô Thành đối đầu</th></tr></thead><tbody>${B.specs.map(s => `<tr>${s.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : "") + (B.vsDT ? `<h4>Đối đầu trực diện theo giá thực bán (sau KM)</h4><div style="overflow-x:auto"><table class="tasktbl small"><thead><tr><th>Phân khúc</th><th>${esc(B.name)} (giá net)</th><th>Đô Thành (giá net)</th><th>Chênh lệch</th><th>Vị thế</th></tr></thead><tbody>${B.vsDT.map(r => `<tr>${r.map((c, i) => `<td>${i === 3 ? "<b>" + esc(c) + "</b>" : esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : "")
    + (B.recs ? `<h4>Kiến nghị sản phẩm, quy cách thùng, giá bán</h4><ol class="actions small">${B.recs.map(r => `<li><b>${esc(r[0])}</b> (${esc(r[2])}): ${esc(r[1])}</li>`).join("")}</ol>` : "")
    + (B.promoRules ? L("Chính sách bán hàng hiện hành", B.promoRules) : "") + L("Khuyến mãi, trả góp 2026", B.promoHistory) + L("Nhận định chiến lược", B.insight) + (B.sources ? `<p class="muted">Nguồn: ${B.sources.map(s => s[1] ? `<a href="${esc(s[1])}" target="_blank" rel="noopener noreferrer">${esc(s[0])}</a>` : esc(s[0])).join(" · ")}</p>` : "");
  document.getElementById("cpMeta").innerHTML = `${esc(B.maker)} · ${esc(B.priceDoc)} · ${esc(B.promoDoc)}`;
  const avg = a => a.length ? a.reduce((x,y) => x + y, 0)/a.length : null, m = R.filter(r => r.d);
  document.getElementById("cpTiles").innerHTML = [[B.items.length, "phiên bản " + B.name], [m.length, "cặp so sánh trực tiếp"], [tr(avg(m.map(r => r.gapList))) + " tr", "chênh giá công bố TB (ĐT − đối thủ)"], [tr(avg(m.map(r => r.gapNet))) + " tr", "chênh giá ròng sau KM TB"], [B.items.some(x => x.dealer) ? fmt1(avg(R.filter(r => r.cMarPct != null).map(r => r.cMarPct))) + "%" : "—", "biên đại lý " + B.name], [fmt1(avg(m.map(r => r.dMarPct))) + "%", "biên đại lý Đô Thành (cặp so sánh)"]]
    .map(([v,l]) => `<div class="stat"><div class="v">${esc(String(v))}</div><div class="l">${esc(l)}</div></div>`).join("");
  el.innerHTML = `<thead><tr><th>Phân khúc</th><th>${esc(B.name)}</th><th>Giá giao ĐL</th><th>Giá bán tối thiểu – tối đa</th><th>KM T11</th><th>Giá ròng</th><th>Đô Thành đối đầu</th><th>Giá lẻ ĐT</th><th>Ưu đãi T11 ĐT</th><th>Giá ròng ĐT</th><th>Chênh ròng</th></tr></thead><tbody>${R.map(r => `<tr><td class="small">${esc(r.it.seg)}</td><td><b>${esc(r.it.model)}</b><span class="reason">${esc(r.it.body)}</span></td><td class="num">${tr(r.it.dealer)}</td><td class="num">${tr(r.it.minRetail)} – ${tr(r.it.maxRetail)}</td><td class="num">${r.it.promo ? tr(r.it.promo) : "—"}</td><td class="num"><b>${tr(r.cNet)}</b></td>
    <td>${r.d ? `<b>${esc(r.d.cmodel)}</b><span class="reason">${esc(r.d.body)}${typeof r.d.payload === "number" ? " · " + fmtInt(r.d.payload) + " kg" : ""}</span>` : '<span class="muted">chưa có bản tương ứng</span>'}</td><td class="num">${r.d ? tr(r.d.retail) : "—"}</td><td class="num">${r.d ? tr(r.dOff) : "—"}</td><td class="num">${r.d ? "<b>" + tr(r.dNet) + "</b>" : "—"}</td>
    <td class="num" style="color:${r.gapNet == null ? "" : r.gapNet <= 0 ? "var(--good)" : "var(--bad)"}">${r.gapNet == null ? "—" : (r.gapNet > 0 ? "+" : "−") + tr(Math.abs(r.gapNet))}</td></tr>`).join("")}</tbody>`;
  document.getElementById("cpIns").innerHTML = I.out.map(x => `<li>${esc(x)}</li>`).join("") + `<li class="muted small">Giá đơn vị triệu đồng. Chênh ròng âm (xanh) = Đô Thành rẻ hơn sau khuyến mãi. ${esc(B.notes.join(" "))}</li>`;
}
document.addEventListener("change", e => { if(e.target.id === "cpBrand") render(); });
document.addEventListener("click", e => {
  const k = (document.getElementById("cpBrand") || {}).value;
  if(e.target.id === "cpBrief"){ CV.openAi(true); CV.benTab("Chat"); CV.addMsg("u", "Phân tích đối thủ"); const b = CV.addMsg("a", ""); CV.finishBubble(b, compMd(k), false, "Đối thủ " + k, true); }
  if(e.target.id === "cpTalk") CV.askAi(`Dùng so_sanh_doi_thu (brand ${k}) và get_price: viết sale talk đối đầu cho từng phân khúc (van 2 chỗ, tải 1 tấn, 1,5 tấn, 3,5 tấn, thùng dài) khi khách so với ${k}: khai thác chênh lệch giá ròng sau khuyến mãi, tổng chi phí sở hữu, mạng lưới dịch vụ, độ bền động cơ; xử lý câu "bên kia rẻ hơn"; không chê bai đối thủ, không bịa thông số.`);
});
function renderNet(){
  const el = document.getElementById("cpNet"); if(!el) return; const S = netStats();
  el.innerHTML = `<div style="overflow-x:auto"><table class="tasktbl"><thead><tr><th>Hãng</th><th>Quy mô công bố</th><th>Điểm xác minh</th><th>3S / xưởng DV</th><th>Tỉnh</th><th>Tỉnh chưa có đại lý ĐT</th></tr></thead><tbody>
    <tr><td><b>Đô Thành</b></td><td>${S.dt.dealers} đại lý + ${S.dt.stations} trạm DV ủy quyền</td><td class="num">${S.dt.dealers + S.dt.stations}</td><td class="num">${S.dt.stations}</td><td class="num">${S.dt.prov}</td><td>—</td></tr>
    ${S.rows.map(r => `<tr><td><i class="dot" style="background:${r.b.color};border-radius:2px"></i> ${esc(r.b.name)}</td><td>${esc(r.b.total)}</td><td class="num">${r.n}</td><td class="num">${r.svc}</td><td class="num">${r.prov.length}</td><td>${esc(r.noDT.join(", ") || "—")}</td></tr>`).join("")}</tbody></table></div>
    <p class="muted">${esc(S.N.note)} Nguồn: ${Object.values(S.N.brands).map(b => `<a href="${esc(b.src[1])}" target="_blank" rel="noopener noreferrer">${esc(b.src[0])}</a>`).join(" · ")}</p>`;
}
renderNet();
document.addEventListener("click", e => {
  if(e.target.id === "cpNetMap"){ CV.setMap({comp: true, pins: true}); const st = document.getElementById("stage"); if(st) st.scrollIntoView({behavior: "smooth", block: "center"}); CV.toast("Đã bật lớp đối thủ: ô vuông màu theo hãng, rê chuột để xem địa chỉ"); }
  if(e.target.id === "cpNetBen"){ CV.openAi(true); CV.benTab("Chat"); CV.addMsg("u", "Phân tích mạng lưới đối thủ"); const b = CV.addMsg("a", ""); CV.finishBubble(b, netMd(), false, "Mạng lưới đối thủ", true); }
});
render();
CV.compPano = pano; CV.netStats = netStats;

/* Ben */
CV.tools.push({name:"mang_luoi_doi_thu", label:"Đang so mạng lưới…", description:"Mạng lưới showroom, đại lý 3S, xưởng dịch vụ, trạm bảo hành của Thaco, Teraco, JAC, Foton, TMT (điểm đã xác minh, quy mô công bố) so với 50 đại lý + 25 trạm dịch vụ Đô Thành: khoảng trống tỉnh, tỉnh đối thủ dày hơn, điểm đối thủ xa mạng Đô Thành. Muốn xem theo tỉnh thì dùng get_indicators (mục mang_luoi). map:true bật lớp đối thủ trên bản đồ.",
  inputSchema:{type:"object",properties:{map:{type:"boolean"}}}, execute: ({map}) => { if(map) CV.setMap({comp: true}); return netMd(); }});
CV.tools.push({name:"so_sanh_doi_thu", label:"Đang so sánh đối thủ…", description:"Bảng giá, khuyến mãi tháng và so sánh đối đầu từng phiên bản đối thủ (TERACO, THACO, JAC, FOTON, TMT) hoặc toàn cảnh thị trường theo phân khúc (brand all) với xe Đô Thành cùng phân khúc: giá công bố, giá ròng sau khuyến mãi, biên lợi nhuận đại lý, nhận định. brand: all (toàn cảnh, mặc định) | teraco | thaco | jac | foton | tmt.",
  inputSchema:{type:"object",properties:{brand:{type:"string"}}}, execute: ({brand}) => compMd(String(brand||"all").toLowerCase())});
CV.localHooks.unshift(raw => { const t = raw.replace(/^ben\s*(ơi)?[,:\s]+/i, "").trim().toLowerCase();
  if(/(mạng lưới|showroom|3s|trạm (dịch vụ|bảo hành)|xưởng dịch vụ)/.test(t) && /(đối thủ|thaco|teraco|jac|foton|tmt|hãng)/.test(t) && !CV.rows.some(r => CV.norm(t).includes(CV.norm(r.name)))){ CV.setMap({comp: true}); return netMd(); }
  const b = C.brands.find(x => t.includes(x.k));
  if(!b && /toàn cảnh/.test(t) && /(đối thủ|thị trường|hãng)/.test(t)) return panoMd();
  return b && /(so sánh|đối thủ|giá|khuyến mãi|chính sách|phân tích)/.test(t) ? compMd(b.k) : null; });
const prev = CV.ctx; CV.ctx = () => (prev ? prev() : "") + `\nĐỐI THỦ CÓ BẢNG GIÁ CHI TIẾT: ${C.brands.map(b => b.name + " (" + b.priceDoc + "; " + b.promoDoc + ")").join("; ")}. Khi hỏi về giá, khuyến mãi, chính sách đối thủ hay so sánh với Đô Thành, dùng so_sanh_doi_thu; hỏi showroom, 3S, xưởng dịch vụ, trạm bảo hành đối thủ dùng mang_luoi_doi_thu (theo tỉnh: get_indicators mục mang_luoi); tải trọng đối thủ là ước tính theo tên model.`;
})();
