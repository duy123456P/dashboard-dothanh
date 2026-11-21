/* ===== Đối thủ: bảng giá, chính sách, so sánh đối đầu với Đô Thành (Teraco; JAC… nạp cùng khuôn) ===== */
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
    const cMar = it.maxRetail - it.dealer, dMar = d ? d.retail - d.dealer : null;
    return {it, d, cNet, dOff, dNet, gapList: d ? d.retail - it.maxRetail : null, gapNet: d ? dNet - cNet : null, cMarPct: cMar / it.maxRetail * 100, cMar, dMar, dMarPct: d ? dMar / d.retail * 100 : null}; }); }
function insights(brand){
  const R = rowsOf(brand).filter(r => r.d), by = {};
  R.forEach(r => { (by[r.it.seg] = by[r.it.seg] || []).push(r); });
  const seg = Object.entries(by).map(([s, rs]) => ({s, n: rs.length, list: rs.reduce((a,r) => a + r.gapList, 0)/rs.length, net: rs.reduce((a,r) => a + r.gapNet, 0)/rs.length, cm: rs.reduce((a,r) => a + r.cMarPct, 0)/rs.length, dm: rs.reduce((a,r) => a + r.dMarPct, 0)/rs.length, pair: rs[0].it.model + " ↔ " + rs[0].d.cmodel}));
  const out = [];
  seg.forEach(x => out.push(`${x.s} (${x.pair}): giá công bố Đô Thành ${x.list >= 0 ? "cao hơn" : "thấp hơn"} ${tr(Math.abs(x.list))} tr; sau khuyến mãi T11 Đô Thành ${x.net <= 0 ? "rẻ hơn" : "đắt hơn"} ${tr(Math.abs(x.net))} tr. Biên đại lý: ${brand.name} ${fmt1(x.cm)}% so với Đô Thành ${fmt1(x.dm)}%.`));
  const cheaperNet = seg.filter(x => x.net < 0).map(x => x.s), dearerNet = seg.filter(x => x.net > 0).map(x => x.s), dealerLose = seg.filter(x => x.cm > x.dm + 0.5).map(x => x.s);
  return {seg, out, cheaperNet, dearerNet, dealerLose, unmatched: brand.items.filter(it => !dtMatch(it)).map(it => it.model + " · " + it.body)};
}
function compMd(k){
  const B = C.brands.find(b => b.k === (k || "teraco")) || C.brands[0], I = insights(B);
  return `# Đối thủ ${B.name}: giá, chính sách và so sánh với Đô Thành\n_${B.maker}. ${B.priceDoc}. ${B.promoDoc}. Cập nhật ${C.updated.split("-").reverse().join("/")}_\n\n## Chính sách khuyến mãi\n${B.promoRules.map(x => "- " + x).join("\n")}\n\n## So sánh theo phân khúc (giá tối đa ${B.name} so với giá lẻ công bố Đô Thành T11/2026)\n| Phân khúc | Cặp đối đầu | Chênh giá công bố (ĐT − đối thủ) | Chênh giá ròng sau KM T11 | Biên ĐL đối thủ | Biên ĐL Đô Thành |\n|---|---|---|---|---|---|\n${I.seg.map(x => `| ${x.s} | ${x.pair} | ${x.list >= 0 ? "+" : "−"}${tr(Math.abs(x.list))} tr | ${x.net >= 0 ? "+" : "−"}${tr(Math.abs(x.net))} tr | ${fmt1(x.cm)}% | ${fmt1(x.dm)}% |`).join("\n")}\n\n## Nhận định\n${I.out.map(x => "- " + x).join("\n")}\n${I.cheaperNet.length ? `- **Đô Thành có lợi thế giá ròng** ở: ${I.cheaperNet.join(", ")} (nhờ ưu đãi T11 lớn hơn nhiều: Đô Thành 24,8–55 tr/xe, ${B.name} 0–10 tr/xe).` : ""}\n${I.dearerNet.length ? `- **Đô Thành đắt hơn sau khuyến mãi** ở: ${I.dearerNet.join(", ")}: cần sale talk về chất lượng, TCO, mạng lưới dịch vụ.` : ""}\n${I.dealerLose.length ? `- **Rủi ro đại lý:** biên lợi nhuận của ${B.name} cao hơn ở ${I.dealerLose.join(", ")}: đối thủ có thể lôi kéo đại lý đa thương hiệu.` : ""}\n- Phiên bản chưa có đối thủ trực tiếp của Đô Thành: ${I.unmatched.join("; ") || "không"}.\n\n## Lưu ý dữ liệu\n${B.notes.map(x => "- " + x).join("\n")}\n`;
}

/* section */
const anchor = document.getElementById("priceSec");
if(anchor){
  const s = document.createElement("section"); s.className = "glass pad"; s.id = "compSec"; s.setAttribute("aria-label","Đối thủ: giá và chính sách");
  s.innerHTML = `<div class="opshead"><div><h2>Đối thủ: giá &amp; chính sách</h2><p class="muted" style="margin:4px 0 0">So sánh từng phiên bản đối thủ với xe Đô Thành cùng phân khúc, cùng loại thùng: giá công bố, khuyến mãi tháng, giá ròng và biên lợi nhuận đại lý.</p></div>
    <div class="toolbar" style="margin:0"><label class="field">Đối thủ<select id="cpBrand">${C.brands.map(b => `<option value="${esc(b.k)}">${esc(b.name)}</option>`).join("")}</select></label><button type="button" class="primary" id="cpBrief">Ben phân tích đối thủ</button><button type="button" id="cpTalk">Sale talk đối đầu</button></div></div>
    <div id="cpMeta" class="small muted" style="margin:8px 0"></div><div class="opstiles num" id="cpTiles"></div>
    <div style="overflow-x:auto"><table class="tasktbl" id="cpTable"></table></div><ul class="actions" id="cpIns"></ul>`;
  anchor.after(s);
}
function render(){
  const el = document.getElementById("cpTable"); if(!el) return;
  const B = C.brands.find(b => b.k === document.getElementById("cpBrand").value) || C.brands[0], R = rowsOf(B), I = insights(B);
  document.getElementById("cpMeta").innerHTML = `${esc(B.maker)} · ${esc(B.priceDoc)} · ${esc(B.promoDoc)}`;
  const avg = a => a.length ? a.reduce((x,y) => x + y, 0)/a.length : null, m = R.filter(r => r.d);
  document.getElementById("cpTiles").innerHTML = [[B.items.length, "phiên bản " + B.name], [m.length, "cặp so sánh trực tiếp"], [tr(avg(m.map(r => r.gapList))) + " tr", "chênh giá công bố TB (ĐT − đối thủ)"], [tr(avg(m.map(r => r.gapNet))) + " tr", "chênh giá ròng sau KM TB"], [fmt1(avg(R.map(r => r.cMarPct))) + "%", "biên đại lý " + B.name], [fmt1(avg(m.map(r => r.dMarPct))) + "%", "biên đại lý Đô Thành (cặp so sánh)"]]
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
CV.tools.push({name:"so_sanh_doi_thu", label:"Đang so sánh đối thủ…", description:"Bảng giá, khuyến mãi tháng và so sánh đối đầu từng phiên bản đối thủ (hiện có TERACO) với xe Đô Thành cùng phân khúc: giá công bố, giá ròng sau khuyến mãi, biên lợi nhuận đại lý, nhận định. brand: teraco (mặc định).",
  inputSchema:{type:"object",properties:{brand:{type:"string"}}}, execute: ({brand}) => compMd(String(brand||"teraco").toLowerCase())});
CV.localHooks.unshift(raw => { const t = raw.replace(/^ben\s*(ơi)?[,:\s]+/i, "").trim().toLowerCase(); const b = C.brands.find(x => t.includes(x.k));
  return b && /(so sánh|đối thủ|giá|khuyến mãi|chính sách|phân tích)/.test(t) ? compMd(b.k) : null; });
const prev = CV.ctx; CV.ctx = () => (prev ? prev() : "") + `\nĐỐI THỦ CÓ BẢNG GIÁ CHI TIẾT: ${C.brands.map(b => b.name + " (" + b.priceDoc + "; " + b.promoDoc + ")").join("; ")}. Khi hỏi về giá, khuyến mãi, chính sách đối thủ hay so sánh với Đô Thành, dùng so_sanh_doi_thu; tải trọng đối thủ là ước tính theo tên model.`;
})();
