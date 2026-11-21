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
  return `# Đối thủ ${B.name}: giá, chính sách và so sánh với Đô Thành\n_${B.maker}. ${B.priceDoc}. ${B.promoDoc}. Cập nhật ${C.updated.split("-").reverse().join("/")}_\n\n## Doanh nghiệp\n${(B.profile||[]).map(x => "- " + x).join("\n")}\n\n## Thông số và cặp đối đầu\n| Dòng xe | Tải trọng, thùng | Động cơ | Đô Thành |\n|---|---|---|---|\n${(B.specs||[]).map(s => "| " + s.join(" | ") + " |").join("\n")}\n\n## Chính sách khuyến mãi\n${B.promoRules.map(x => "- " + x).join("\n")}\n${(B.promoHistory||[]).map(x => "- " + x).join("\n")}\n\n## Nhận định chiến lược\n${(B.insight||[]).map(x => "- " + x).join("\n")}\n\n## So sánh theo phân khúc (giá tối đa ${B.name} so với giá lẻ công bố Đô Thành T11/2026; biên ĐL đối thủ chỉ có khi có giá giao đại lý)\n| Phân khúc | Cặp đối đầu | Chênh giá công bố (ĐT − đối thủ) | Chênh giá ròng sau KM T11 | Biên ĐL đối thủ | Biên ĐL Đô Thành |\n|---|---|---|---|---|---|\n${I.seg.map(x => `| ${x.s} | ${x.pair} | ${x.list >= 0 ? "+" : "−"}${tr(Math.abs(x.list))} tr | ${x.net >= 0 ? "+" : "−"}${tr(Math.abs(x.net))} tr | ${x.cm == null ? "—" : fmt1(x.cm) + "%"} | ${fmt1(x.dm)}% |`).join("\n")}\n\n## Nhận định\n${I.out.map(x => "- " + x).join("\n")}\n${I.cheaperNet.length ? `- **Đô Thành có lợi thế giá ròng** ở: ${I.cheaperNet.join(", ")} (nhờ ưu đãi T11 lớn hơn nhiều: Đô Thành 24,8–55 tr/xe, ${B.name} tối đa ${tr(maxP)} tr/xe).` : ""}\n${I.dearerNet.length ? `- **Đô Thành đắt hơn sau khuyến mãi** ở: ${I.dearerNet.join(", ")}: cần sale talk về chất lượng, TCO, mạng lưới dịch vụ.` : ""}\n${I.dealerLose.length ? `- **Rủi ro đại lý:** biên lợi nhuận của ${B.name} cao hơn ở ${I.dealerLose.join(", ")}: đối thủ có thể lôi kéo đại lý đa thương hiệu.` : ""}\n- Phiên bản chưa có đối thủ trực tiếp của Đô Thành: ${I.unmatched.join("; ") || "không"}.\n\n## Lưu ý dữ liệu\n${B.notes.map(x => "- " + x).join("\n")}\n`;
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

/* section */
const anchor = document.getElementById("priceSec");
if(anchor){
  const s = document.createElement("section"); s.className = "glass pad"; s.id = "compSec"; s.setAttribute("aria-label","Đối thủ: giá và chính sách");
  s.innerHTML = `<div class="opshead"><div><h2>Đối thủ: giá &amp; chính sách</h2><p class="muted" style="margin:4px 0 0">So sánh từng phiên bản đối thủ với xe Đô Thành cùng phân khúc, cùng loại thùng: giá công bố, khuyến mãi tháng, giá ròng và biên lợi nhuận đại lý.</p></div>
    <div class="toolbar" style="margin:0"><label class="field">Đối thủ<select id="cpBrand"><option value="all">Toàn cảnh thị trường</option>${C.brands.map(b => `<option value="${esc(b.k)}">${esc(b.name)}</option>`).join("")}</select></label><button type="button" class="primary" id="cpBrief">Ben phân tích đối thủ</button><button type="button" id="cpTalk">Sale talk đối đầu</button></div></div>
    <div id="cpMeta" class="small muted" style="margin:8px 0"></div><details class="lgdoc" style="margin-bottom:10px"><summary><b>Hồ sơ đối thủ, thông số, lịch sử khuyến mãi</b></summary><div id="cpProf" class="small"></div></details><div class="opstiles num" id="cpTiles"></div>
    <div style="overflow-x:auto"><table class="tasktbl" id="cpTable"></table></div><ul class="actions" id="cpIns"></ul>`;
  anchor.after(s);
}
function render(){
  const el = document.getElementById("cpTable"); if(!el) return;
  if(document.getElementById("cpBrand").value === "all") return renderPano(el);
  const B = C.brands.find(b => b.k === document.getElementById("cpBrand").value) || C.brands[0], R = rowsOf(B), I = insights(B);
  const L = (h, a) => a && a.length ? `<h4>${h}</h4><ul>${a.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
  document.getElementById("cpProf").innerHTML = L("Doanh nghiệp", B.profile) + (B.specs ? `<h4>Thông số và đối thủ tương ứng của Đô Thành</h4><div style="overflow-x:auto"><table class="tasktbl"><thead><tr><th>Dòng xe</th><th>Tải trọng, thùng</th><th>Động cơ</th><th>Đô Thành đối đầu</th></tr></thead><tbody>${B.specs.map(s => `<tr>${s.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : "") + L("Khuyến mãi, trả góp 2026", B.promoHistory) + L("Nhận định chiến lược", B.insight) + (B.sources ? `<p class="muted">Nguồn: ${B.sources.map(s => `<a href="${esc(s[1])}" target="_blank" rel="noopener noreferrer">${esc(s[0])}</a>`).join(" · ")}</p>` : "");
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
render();

/* Ben */
CV.tools.push({name:"so_sanh_doi_thu", label:"Đang so sánh đối thủ…", description:"Bảng giá, khuyến mãi tháng và so sánh đối đầu từng phiên bản đối thủ (TERACO, THACO, JAC, FOTON, TMT) hoặc toàn cảnh thị trường theo phân khúc (brand all) với xe Đô Thành cùng phân khúc: giá công bố, giá ròng sau khuyến mãi, biên lợi nhuận đại lý, nhận định. brand: all (toàn cảnh, mặc định) | teraco | thaco | jac | foton | tmt.",
  inputSchema:{type:"object",properties:{brand:{type:"string"}}}, execute: ({brand}) => compMd(String(brand||"all").toLowerCase())});
CV.localHooks.unshift(raw => { const t = raw.replace(/^ben\s*(ơi)?[,:\s]+/i, "").trim().toLowerCase(); const b = C.brands.find(x => t.includes(x.k));
  if(!b && /toàn cảnh/.test(t) && /(đối thủ|thị trường|hãng)/.test(t)) return panoMd();
  return b && /(so sánh|đối thủ|giá|khuyến mãi|chính sách|phân tích)/.test(t) ? compMd(b.k) : null; });
const prev = CV.ctx; CV.ctx = () => (prev ? prev() : "") + `\nĐỐI THỦ CÓ BẢNG GIÁ CHI TIẾT: ${C.brands.map(b => b.name + " (" + b.priceDoc + "; " + b.promoDoc + ")").join("; ")}. Khi hỏi về giá, khuyến mãi, chính sách đối thủ hay so sánh với Đô Thành, dùng so_sanh_doi_thu; tải trọng đối thủ là ước tính theo tên model.`;
})();
