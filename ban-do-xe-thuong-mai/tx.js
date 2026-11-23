/* ===== Bán hàng chi tiết từ file giao dịch từng xe (2024–2026) + tồn thành phẩm DAC + tồn toàn hệ thống theo model ===== */
(function(){
"use strict";
const CV = window.__CV; if(!CV || !CV.TX) return;
const {esc, fmtInt, fmt1} = CV, TX = CV.TX;
const FG = CV.factory || null;
const sum = a => a.reduce((x,y) => x + (y || 0), 0);
const BODY = {KIN: "Thùng kín", BAT: "Mui bạt", LUNG: "Thùng lửng", CHASSIS: "Chassis", XTL: "Xe tập lái", VAN: "Van", KHAC: "Khác"};
const MET = {le: ["Bán lẻ (TT 100%)", 5], si: ["Bán sỉ (TT 10%)", 6], xk: ["Xuất kho", 7]};
const C = {bar: "#16a0bd", muted: "#8ea7c7", ink: "#e8f3ff", good: "#4ee2a0", warn: "#ffc35a", bad: "#ff6b6b"};
const ML = m => "T" + (+m.slice(5)) + "/" + m.slice(2, 4);
const lineOf = m => /^(T26|T33L|V56|V65|T18)$/.test(m) ? "MISSU" : /^JP/.test(m) ? "JP" : /^IZ/.test(m) ? "IZ" : /ĐẦU KÉO|BEN|HC\d|NOVUS/i.test(m) ? "Daewoo" : "Khác";
const dimOf = {model: r => TX.models[r[2]], dealer: r => TX.dealers[r[1]], body: r => BODY[TX.bodies[r[3]]] || TX.bodies[r[3]], seg: r => TX.segs[r[2]] || "?", region: r => TX.regions[TX.dealers[r[1]]] || "?", line: r => lineOf(TX.models[r[2]])};
const asOfM = TX.asOf.slice(0, 7);

/* ---------- pivot ---------- */
const st = {met: "le", dim: "model", dealer: "", model: "", body: "", per: "12"};
function periods(){
  const ms = TX.months.filter(m => m >= "2024-11");
  if(st.per === "12") return ms.slice(-13);
  if(st.per === "2026" || st.per === "2025") return ms.filter(m => m.startsWith(st.per));
  if(st.per === "all") return ms;
  return ["2024", "2025", "2026"];
}
function pivot(){
  const cols = periods(), byYear = st.per === "year", j = MET[st.met][1], f = r => (!st.dealer || TX.dealers[r[1]] === st.dealer) && (!st.model || TX.models[r[2]] === st.model) && (!st.body || (BODY[TX.bodies[r[3]]] || TX.bodies[r[3]]) === st.body);
  const o = {}, tot = {}; TX.tx.forEach(r => { if(!f(r)) return; const c = byYear ? r[0].slice(0, 4) : r[0]; if(!cols.includes(c)) return; const k = dimOf[st.dim](r), x = o[k] = o[k] || {}; x[c] = (x[c] || 0) + r[j]; tot[c] = (tot[c] || 0) + r[j]; });
  const rows = Object.entries(o).map(([k, x]) => ({k, x, t: sum(cols.map(c => x[c]))})).filter(r => r.t).sort((a,b) => b.t - a.t);
  return {cols, rows, tot};
}
function spark(vals){ const mx = Math.max(...vals, 1); return `<svg viewBox="0 0 ${vals.length*6} 20" width="${vals.length*6}" height="20" aria-hidden="true">${vals.map((v,i) => `<rect x="${i*6}" y="${20 - v/mx*18}" width="4.5" height="${v/mx*18}" rx="1" fill="${C.bar}"/>`).join("")}</svg>`; }
function renderPivot(){
  const el = document.getElementById("txPivot"); if(!el) return; const P = pivot(), mx = Math.max(1, ...P.rows.flatMap(r => P.cols.map(c => r.x[c] || 0)));
  const cell = (v, c) => `<td class="num" style="background:${v ? `rgba(22,160,189,${(0.08 + 0.55*v/mx).toFixed(2)})` : "transparent"}"${c === asOfM ? ' title="Tháng đang chạy, tính đến ngày chốt"' : ""}>${v ? fmtInt(v) : ""}</td>`;
  el.innerHTML = `<table class="tasktbl small"><thead><tr><th>${{model: "Model", dealer: "Đại lý", body: "Loại thùng", seg: "Phân khúc tải", region: "Miền", line: "Dòng"}[st.dim]}</th>${P.cols.map(c => `<th class="num">${c.length === 4 ? c : ML(c)}${c === asOfM ? "*" : ""}</th>`).join("")}<th class="num">Cộng</th><th>Xu hướng</th></tr></thead><tbody>
    ${P.rows.map(r => `<tr class="trow" data-txk="${esc(r.k)}"><td><b>${esc(r.k)}</b></td>${P.cols.map(c => cell(r.x[c] || 0, c)).join("")}<td class="num"><b>${fmtInt(r.t)}</b></td><td>${spark(P.cols.map(c => r.x[c] || 0))}</td></tr>`).join("")}
    <tr><td><b>Tổng</b></td>${P.cols.map(c => `<td class="num"><b>${fmtInt(P.tot[c] || 0)}</b></td>`).join("")}<td class="num"><b>${fmtInt(sum(P.cols.map(c => P.tot[c])))}</b></td><td></td></tr></tbody></table>`;
  const r26 = CV.txAgg(), S = (CV.salesPlan || {}), nat = document.getElementById("txRecon");
  if(nat){ const td = (window.__CV.salesTDBH || []); nat.innerHTML = td.length ? `So với Tổng hợp TDBH 2026 (bán lẻ): ${td.map((v,i) => { const m = "2026-" + String(i+1).padStart(2,"0"), f = (r26[m] || {}).le || 0; return `T${i+1} ${fmtInt(f)}/${fmtInt(v)}`; }).join(" · ")}. Lũy kế T1–T10: file ${fmtInt(sum(td.map((v,i) => ((r26["2026-" + String(i+1).padStart(2,"0")] || {}).le || 0))))} / TDBH ${fmtInt(sum(td))} xe; lệch từng tháng do thời điểm ghi nhận (thanh toán 100% so với báo cáo đại lý).` : ""; }
}

/* ---------- tồn toàn hệ thống theo model ---------- */
function systemStock(){
  if(!FG) return null; const F = CV.salesForecast ? CV.salesForecast() : null, inv = CV.inv;
  const last3 = TX.months.filter(m => m < asOfM).slice(-3), s3 = new Set(last3), rate = {};
  TX.tx.forEach(r => { if(s3.has(r[0])) rate[TX.models[r[2]]] = (rate[TX.models[r[2]]] || 0) + r[5] / 3; });
  const pend = {}, pAge = {}; TX.pend.forEach(([d, m, b, age, yr, n]) => { const k = TX.models[m]; pend[k] = (pend[k] || 0) + n; if(age === "181-365" || age === ">365") pAge[k] = (pAge[k] || 0) + n; });
  const fg = {}, wait = {}; FG.items.forEach(it => { if(it.group === "KHÁCH") return; fg[it.model] = (fg[it.model] || 0) + it.fg + it.chassis; wait[it.model] = (wait[it.model] || 0) + it.wait; });
  const ALIAS = {CL4TF: "ĐẦU KÉO", CL4DF: "BEN TỰ ĐỔ", HC8AA: "HC8"}, dl = {}; (inv ? inv.models : []).forEach(x => { if(x.ton != null){ const k = ALIAS[x.m] || x.m; dl[k] = (dl[k] || 0) + x.ton; } }); const full = !!(inv && inv.models.length > 10);
  const totF = F ? sum(F.months.slice(0, 3).map(x => x.base)) : null, mixTot = sum(Object.values(rate)) || 1;
  const models = [...new Set([...Object.keys(fg), ...Object.keys(rate).filter(k => rate[k] >= 1), ...Object.keys(dl).filter(k => dl[k] > 0)])];
  const rows = models.map(m => { const dealer = dl[m] != null ? dl[m] : (full ? 0 : (pend[m] || 0)), src = dl[m] != null || full ? "tồn SR " + (inv.asOf || "").split("-").reverse().slice(0,2).join("/") : "chờ TT100%", sys = (fg[m] || 0) + dealer, r = rate[m] || 0, f3 = totF != null ? totF * r / mixTot : r * 3;
    return {m, line: lineOf(m), fg: fg[m] || 0, wait: wait[m] || 0, dealer, src, sys, rate: r, f3, cover: r ? sys / r : null, old: pAge[m] || 0}; }).filter(x => x.sys || x.rate).sort((a,b) => b.sys - a.sys);
  return {rows, last3, totF, dealerTotal: inv ? inv.total : null, fgTotal: sum(Object.values(fg)), waitTotal: sum(Object.values(wait))};
}
function action(x){ if(!x.rate) return ["Không bán 3 tháng: dừng sản xuất, bán theo dự án", C.bad]; if(x.cover > 6) return ["Dừng sản xuất/CKD, xả tồn", C.bad]; if(x.cover > 3.5) return ["Giãn sản xuất, ưu tiên xả tồn", C.warn]; if(x.cover < 1.5) return ["Cần bổ sung sản xuất/CKD", C.good]; return ["Giữ nhịp theo dự báo", C.muted]; }
/* tuổi tồn kho DAC, xe đang sản xuất, nhập – xuất trong kỳ, xuất bán (sell-in) theo đại lý × tháng, đối chiếu với TDBH và tồn đại lý */
function fgExtra(){
  if(!FG || !FG.items[0] || FG.items[0].age90 == null) return "";
  const byM = {}; FG.items.forEach(it => { const x = byM[it.model] = byM[it.model] || {g: it.group, n: 0, a45: 0, a90: 0, aOld: 0, max: 0, body: {}, color: {}}; const n = it.fg + it.chassis + it.wait;
    x.n += n; x.a45 += it.age45; x.a90 += it.age45_90; x.aOld += it.age90; x.max = Math.max(x.max, it.maxAge || 0); x.body[it.body] = (x.body[it.body] || 0) + n; x.color[it.color] = (x.color[it.color] || 0) + n; });
  const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => k + " " + v).join(", ");
  const P = FG.pipeline || {}, N = FG.nxt || {}, R = FG.recon, ym = Object.keys(FG.sellInModel || {}).filter(m => m >= "2026-01");
  const mm = m => "T" + (+m.slice(5)), dls = Object.entries(FG.sellIn || {}).map(([d, v]) => [d, ym.map(m => v[m] || 0)]).filter(x => sum(x[1])).sort((a, b) => sum(b[1]) - sum(a[1]));
  return `<h4 style="margin-top:12px">Tuổi tồn kho thành phẩm DAC theo model <span class="muted tiny">tính đến ${esc((FG.asOf || "").split("-").reverse().join("/"))}; gồm xe + thùng, chassis, xe chờ xuất</span></h4>
    <div style="overflow-x:auto"><table class="tasktbl small"><thead><tr><th>Model</th><th>Nhóm</th><th class="num">Tồn</th><th class="num">&lt; 45 ngày</th><th class="num">45–90</th><th class="num">&gt; 90 ngày</th><th class="num">Lâu nhất</th><th>Thùng</th><th>Màu</th></tr></thead><tbody>
    ${Object.entries(byM).sort((a, b) => b[1].aOld - a[1].aOld || b[1].n - a[1].n).map(([m, x]) => `<tr><td><b>${esc(m)}</b></td><td>${esc(x.g)}</td><td class="num">${fmtInt(x.n)}</td><td class="num">${x.a45 || ""}</td><td class="num">${x.a90 || ""}</td><td class="num" style="color:${x.aOld / x.n > .5 ? C.bad : x.aOld ? C.warn : "inherit"}"><b>${x.aOld || ""}</b></td><td class="num">${x.max ? fmtInt(x.max) + " ngày" : ""}</td><td class="tiny">${esc(top(x.body))}</td><td class="tiny">${esc(top(x.color))}</td></tr>`).join("")}</tbody></table></div>
    <p class="note">Đang sản xuất: ${fmtInt(P.wipBody || 0)} xe giao gác thùng, ${fmtInt(P.wipQC || 0)} thùng đã đóng chờ QM nhập kho; ${fmtInt(P.ckd || 0)} bộ linh kiện chưa nhập kho; ${fmtInt(P.mbtb || 0)} xe chuyển kho MBTB; ${fmtInt(sum(Object.values(FG.consign || {})))} xe ký gửi tại đại lý.</p>
    ${N.period ? `<h4>Nhập – xuất kho thành phẩm ${esc(N.period.map(d => d.split("-").reverse().slice(0, 2).join("/")).join("–"))}</h4><p class="small">Nhập <b>${fmtInt(sum(Object.values(N.in)))}</b> xe (${esc(top(N.in))}); xuất <b>${fmtInt(sum(Object.values(N.out)))}</b> xe (${esc(top(N.out))}); thu hồi từ đại lý ${fmtInt(sum(Object.values(N.returned || {})))} xe; chuyển ký gửi sang mua bán ${fmtInt(sum(Object.values(N.kgToMb || {})))} xe. Xuất nhiều nhất: ${esc(Object.entries(N.outDealer).slice(0, 6).map(([d, n]) => d + " " + n).join(", "))}.</p>` : ""}
    ${dls.length ? `<h4>Xuất bán cho đại lý (sell-in) 2026 theo tháng <span class="muted tiny">ngày HĐ mua bán trong file xe tổng hợp</span></h4><div style="overflow-x:auto"><table class="tasktbl small"><thead><tr><th>Đại lý</th>${ym.map(m => `<th class="num">${mm(m)}</th>`).join("")}<th class="num">Cộng</th></tr></thead><tbody>
      ${dls.slice(0, 30).map(([d, v]) => `<tr><td>${esc(d)}</td>${v.map(n => `<td class="num">${n || ""}</td>`).join("")}<td class="num"><b>${fmtInt(sum(v))}</b></td></tr>`).join("")}
      <tr><td><b>Tổng</b></td>${ym.map(m => `<td class="num"><b>${fmtInt(sum(Object.values(FG.sellInModel[m])))}</b></td>`).join("")}<td class="num"><b>${fmtInt(sum(ym.map(m => sum(Object.values(FG.sellInModel[m])))))}</b></td></tr></tbody></table></div>` : ""}
    ${R ? `<h4>Đối chiếu ${esc(R.months)}: sell-in theo kho nhà máy ↔ TDBH ↔ tồn thực tế đại lý</h4><div style="overflow-x:auto"><table class="tasktbl small"><thead><tr><th>Đại lý</th><th class="num">Sell-in kho NM</th><th class="num">Sell-in TDBH</th><th class="num">Lệch</th><th class="num">Bán lẻ TDBH</th><th class="num">Tồn đại lý (MoM ${esc((R.asOfStock || "").split("-").reverse().slice(0, 2).join("/"))})</th></tr></thead><tbody>
      ${R.rows.sort((a, b) => Math.abs(b.diffSellIn) - Math.abs(a.diffSellIn)).map(r => `<tr><td>${esc(r.dealer)}</td><td class="num">${fmtInt(r.fgSellIn)}</td><td class="num">${fmtInt(r.tdbhSellIn)}</td><td class="num" style="color:${Math.abs(r.diffSellIn) >= 15 ? C.bad : Math.abs(r.diffSellIn) >= 5 ? C.warn : "inherit"}"><b>${r.diffSellIn > 0 ? "+" : ""}${fmtInt(r.diffSellIn)}</b></td><td class="num">${fmtInt(r.tdbhRetail)}</td><td class="num">${r.stockMoM == null ? "—" : fmtInt(r.stockMoM)}</td></tr>`).join("")}
      <tr><td><b>Tổng</b></td><td class="num"><b>${fmtInt(R.total.fgSellIn)}</b></td><td class="num"><b>${fmtInt(R.total.tdbhSellIn)}</b></td><td class="num"><b>${R.total.fgSellIn - R.total.tdbhSellIn > 0 ? "+" : ""}${fmtInt(R.total.fgSellIn - R.total.tdbhSellIn)}</b></td><td class="num"><b>${fmtInt(R.total.tdbhRetail)}</b></td><td class="num"><b>${fmtInt(R.total.stockMoM)}</b></td></tr></tbody></table></div>
      <p class="note">Lệch dương: kho nhà máy ghi xuất bán nhiều hơn TDBH (có thể do xe ký gửi chuyển mua bán, xe chuyển giữa đại lý ghi cho nơi nhận cuối, hoặc TDBH chưa cập nhật). Cần Kế hoạch – Kinh doanh rà các đại lý lệch từ 15 xe. Xuất cho đơn vị ngoài danh sách TDBH: ${esc(R.other.map(([k, n]) => k + " " + n).join(", ") || "không")}.</p>` : ""}`;
}
function sysHtml(){
  const S = systemStock(); if(!S) return ""; const pend = sum(TX.pend.map(p => p[5])), over = sum(TX.pend.filter(p => p[3] === "181-365" || p[3] === ">365").map(p => p[5]));
  const groups = Object.entries(FG.groups).filter(([g]) => g !== "KHÁCH");
  return `<div class="hp w12" style="margin-top:12px"><h3>Tồn thành phẩm tại kho DAC và tồn toàn hệ thống <span>${esc(FG.source)}</span></h3>
    <div class="opstiles num">${[[fmtInt(S.fgTotal), "xe thành phẩm tại kho DAC (gồm chassis)"], [fmtInt(S.waitTotal), "xe chờ xuất bán (đã có đơn)"], [S.dealerTotal ? fmtInt(S.dealerTotal) : "—", "xe tồn tại đại lý (21/11)"], [S.dealerTotal ? fmtInt(S.fgTotal + S.dealerTotal) : "—", "tồn toàn hệ thống (kho DAC + đại lý)"], [S.totF ? fmt1((S.fgTotal + (S.dealerTotal || 0)) / (S.totF/3)) : "—", "tháng bán của tồn hệ thống (theo dự báo 3 tháng tới)"], [CV.inv && CV.inv.age ? fmtInt(CV.inv.age.over180) : fmtInt(over), CV.inv && CV.inv.age ? `xe tồn đại lý quá 180 ngày (${CV.inv.age.over365} xe quá 1 năm)` : `xe đã cọc 10% quá 180 ngày chưa thanh toán đủ (trên ${fmtInt(pend)})`]].map(([v,l]) => `<div class="stat"><div class="v">${esc(String(v))}</div><div class="l">${esc(l)}</div></div>`).join("")}</div>
    <div class="small muted" style="margin:6px 0">${groups.map(([g, v]) => `<b>${esc(g === "T822" ? "JP (T822)" : g)}</b>: ${fmtInt(v.fg)} thành phẩm, ${fmtInt(v.wait)} chờ xuất${v.chassis ? ", " + v.chassis + " chassis" : ""}`).join(" · ")}. ${esc(FG.note)}</div>
    <div style="overflow-x:auto"><table class="tasktbl small"><thead><tr><th>Model</th><th>Dòng</th><th class="num">Kho DAC</th><th class="num">Chờ xuất</th><th class="num">Tại đại lý</th><th class="num">Tồn hệ thống</th><th class="num">Bán lẻ/tháng (3 th)</th><th class="num">Tháng bán</th><th class="num">Cọc &gt; 180 ngày</th><th>Đề xuất sản xuất / CKD</th></tr></thead><tbody>
    ${S.rows.map(x => { const [a, col] = action(x); return `<tr><td><b>${esc(x.m)}</b></td><td>${x.line}</td><td class="num">${fmtInt(x.fg)}</td><td class="num">${x.wait ? fmtInt(x.wait) : ""}</td><td class="num">${fmtInt(x.dealer)}<span class="reason">${x.src}</span></td><td class="num"><b>${fmtInt(x.sys)}</b></td><td class="num">${fmt1(x.rate)}</td><td class="num" style="color:${col}"><b>${x.cover == null ? "∞" : fmt1(x.cover)}</b></td><td class="num">${x.old || ""}</td><td style="color:${col}">${a}</td></tr>`; }).join("")}</tbody></table></div>
    <p class="note">Tồn hệ thống = thành phẩm tại kho DAC (gồm chassis) + tồn tại đại lý; tại đại lý lấy từ file tồn SR từng xe (đủ mọi model). Tháng bán = tồn hệ thống / bán lẻ bình quân 3 tháng (${S.last3.map(ML).join(", ")}). Ngưỡng: &gt; 6 tháng dừng sản xuất; 3,5–6 giãn; &lt; 1,5 bổ sung.</p>${fgExtra()}</div>`;
}
function pendHtml(){
  const ages = ["0-90", "91-180", "181-365", ">365"], o = {}; TX.pend.forEach(([d, m, b, age, yr, n]) => { const k = TX.dealers[d], x = o[k] = o[k] || {t: 0}; x[age] = (x[age] || 0) + n; x.t += n; });
  const rows = Object.entries(o).sort((a,b) => b[1].t - a[1].t);
  return `<div class="hp w12" style="margin-top:12px"><h3>Xe đã cọc 10%, chưa thanh toán 100% theo đại lý và tuổi <span>tuổi tính từ ngày TT 10% đến ${esc(TX.asOf.split("-").reverse().join("/"))}</span></h3><div style="overflow-x:auto"><table class="tasktbl small"><thead><tr><th>Đại lý</th>${ages.map(a => `<th class="num">${a} ngày</th>`).join("")}<th class="num">Cộng</th></tr></thead><tbody>${rows.map(([k, x]) => `<tr class="trow" data-sdl="${esc(k)}"><td><b>${esc(k)}</b></td>${ages.map(a => `<td class="num" style="color:${(a === "181-365" || a === ">365") && x[a] ? C.bad : ""}">${x[a] || ""}</td>`).join("")}<td class="num"><b>${x.t}</b></td></tr>`).join("")}</tbody></table></div>
    <p class="note">Khác với tồn PV 957 xe: đây là xe đại lý đã đặt cọc 10% nhưng chưa thanh toán đủ theo file giao dịch (gồm cả xe đã giao, xe ký gửi), dùng để quản trị công nợ và tuổi xe. Model cũ (IZ250, IZ65-3.5T…) còn treo là dữ liệu cần làm sạch.</p></div>`;
}

/* ---------- section ---------- */
const anchor = document.getElementById("salesSec");
if(anchor){
  const s = document.createElement("section"); s.className = "glass pad"; s.id = "txSec"; s.setAttribute("aria-label", "Bán hàng chi tiết theo đại lý, model, tháng");
  const opt = (id, lab, arr) => `<label class="field">${lab}<select id="${id}"><option value="">Tất cả</option>${arr.map(x => `<option>${esc(x)}</option>`).join("")}</select></label>`;
  s.innerHTML = `<div class="opshead"><div><h2>Bán hàng chi tiết: đại lý × model × tháng</h2><p class="muted" style="margin:4px 0 0">File giao dịch từng xe ${esc(TX.source)} (đồng bộ ${esc(TX.synced)}): ${esc(TX.def.le)}; ${esc(TX.def.si)}; ${esc(TX.def.xk)}. Số khung, hợp đồng không đưa lên bản đồ.</p></div>
    <div class="toolbar" style="margin:0"><button type="button" class="primary" id="txBen">Ben phân tích</button><button type="button" id="txCsv">Xuất chi tiết (.csv)</button></div></div>
    <div class="toolbar"><label class="field">Chỉ số<select id="txMet">${Object.entries(MET).map(([k,v]) => `<option value="${k}">${esc(v[0])}</option>`).join("")}</select></label>
      <label class="field">Hàng theo<select id="txDim"><option value="model">Model</option><option value="dealer">Đại lý</option><option value="body">Loại thùng</option><option value="seg">Phân khúc tải</option><option value="line">Dòng</option><option value="region">Miền</option></select></label>
      ${opt("txDl", "Đại lý", [...TX.dealers].sort())}${opt("txMo", "Model", [...TX.models].sort())}${opt("txBo", "Loại thùng", [...new Set(TX.bodies.map(b => BODY[b] || b))])}
      <label class="field">Kỳ<select id="txPer"><option value="12">13 tháng gần nhất</option><option value="2026">Năm 2026</option><option value="2025">Năm 2025</option><option value="all">Toàn bộ theo tháng</option><option value="year">Theo năm</option></select></label></div>
    <div style="overflow-x:auto" id="txPivot"></div><p class="note" id="txRecon"></p><p class="note">* Tháng đang chạy, tính đến ${esc(TX.asOf.split("-").reverse().join("/"))}. Bấm một dòng để lọc theo dòng đó.</p>`;
  anchor.after(s);
}
const inv = document.getElementById("invSec");
if(inv){ const box = document.createElement("div"); box.innerHTML = sysHtml() + pendHtml(); inv.appendChild(box); }
document.addEventListener("change", e => { const m = {txMet: "met", txDim: "dim", txDl: "dealer", txMo: "model", txBo: "body", txPer: "per"}[e.target.id]; if(m){ st[m] = e.target.value; renderPivot(); } });
document.addEventListener("click", e => {
  const tr = e.target.closest && e.target.closest("[data-txk]");
  if(tr){ const k = tr.dataset.txk, map = {model: ["txMo", "model"], dealer: ["txDl", "dealer"], body: ["txBo", "body"]}[st.dim]; if(map){ st[map[1]] = k; document.getElementById(map[0]).value = k; st.dim = st.dim === "model" ? "dealer" : "model"; document.getElementById("txDim").value = st.dim; renderPivot(); } }
  if(e.target.id === "txCsv"){ const csv = "thang,dai_ly,mien,model,phan_khuc,loai_thung,du_an,ban_le_tt100,ban_si_tt10,xuat_kho\n" + TX.tx.map(r => [r[0], TX.dealers[r[1]], TX.regions[TX.dealers[r[1]]] || "", TX.models[r[2]], TX.segs[r[2]] || "", BODY[TX.bodies[r[3]]] || TX.bodies[r[3]], r[4], r[5], r[6], r[7]].join(",")).join("\n");
    const b = new Blob(["﻿" + csv], {type: "text/csv"}), a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "ban-hang-dai-ly-model-thang.csv"; a.click(); }
  if(e.target.id === "txBen"){ CV.openAi(true); CV.benTab("Chat"); CV.addMsg("u", "Phân tích bán hàng chi tiết và tồn hệ thống"); const b = CV.addMsg("a", ""); CV.finishBubble(b, txMd(), false, "Bán hàng chi tiết", true); }
});
function txMd(q){
  q = q || {}; const f = r => (!q.dealer || TX.dealers[r[1]] === q.dealer) && (!q.model || TX.models[r[2]] === q.model);
  const ms = TX.months.filter(m => m >= "2024-11"), o = {}; TX.tx.forEach(r => { if(!f(r)) return; const x = o[r[0]] = o[r[0]] || {le: 0, si: 0, xk: 0}; x.le += r[5]; x.si += r[6]; x.xk += r[7]; });
  const top = (dim, n) => { const t = {}; TX.tx.forEach(r => { if(f(r) && r[0] >= ms[ms.length-13]) t[dimOf[dim](r)] = (t[dimOf[dim](r)] || 0) + r[5]; }); return Object.entries(t).sort((a,b) => b[1] - a[1]).slice(0, n); };
  const S = systemStock();
  return `# Bán hàng chi tiết${q.dealer ? " · " + q.dealer : ""}${q.model ? " · " + q.model : ""}\n_${TX.source}; ${TX.def.le}; ${TX.def.si}._\n\n## Theo tháng\n| Tháng | Bán lẻ | Bán sỉ | Xuất kho |\n|---|---|---|---|\n${ms.map(m => `| ${ML(m)}${m === asOfM ? "*" : ""} | ${fmtInt((o[m]||{}).le || 0)} | ${fmtInt((o[m]||{}).si || 0)} | ${fmtInt((o[m]||{}).xk || 0)} |`).join("\n")}\n\n## 13 tháng gần nhất\n- Model bán lẻ nhiều nhất: ${top("model", 8).map(([k,v]) => `${k} ${fmtInt(v)}`).join(", ")}\n- Đại lý: ${top("dealer", 8).map(([k,v]) => `${k} ${fmtInt(v)}`).join(", ")}\n- Loại thùng: ${top("body", 6).map(([k,v]) => `${k} ${fmtInt(v)}`).join(", ")}\n\n${S && !q.dealer ? `## Tồn toàn hệ thống theo model (kho DAC + đại lý)\n| Model | Kho DAC | Đại lý | Hệ thống | Bán lẻ/tháng | Tháng bán | Đề xuất |\n|---|---|---|---|---|---|---|\n${S.rows.filter(x => !q.model || x.m === q.model).map(x => `| ${x.m} | ${x.fg} | ${x.dealer} | ${x.sys} | ${fmt1(x.rate)} | ${x.cover == null ? "∞" : fmt1(x.cover)} | ${action(x)[0]} |`).join("\n")}\n` : ""}\n_* tháng đang chạy._\n`;
}
CV.tools.push({name: "ban_hang_chi_tiet", label: "Đang tra bán hàng chi tiết…", description: "Số bán từng tháng T11/2024–T11/2026 theo đại lý × model × loại thùng từ file giao dịch từng xe (bán lẻ = TT 100%, bán sỉ = TT 10%, xuất kho), top model/đại lý/thùng 13 tháng, tồn toàn hệ thống theo model (kho thành phẩm DAC + đại lý) và đề xuất sản xuất/CKD. Lọc dai_ly, model.", inputSchema: {type: "object", properties: {dai_ly: {type: "string"}, model: {type: "string"}}},
  execute: ({dai_ly, model}) => { const up = s => String(s || "").toUpperCase(); const d = dai_ly ? TX.dealers.find(x => up(x).includes(up(dai_ly))) : ""; const m = model ? TX.models.find(x => up(x) === up(model)) || TX.models.find(x => up(x).includes(up(model))) : ""; return txMd({dealer: d, model: m}); }});
CV.localHooks.unshift(raw => { const t = raw.replace(/^ben\s*(ơi)?[,:\s]+/i, "").trim(), up = String(t).toUpperCase();
  if(!/bán hàng chi tiết|theo model|từng model|tồn hệ thống|kho thành phẩm|sản xuất|ckd/i.test(t)) return null;
  const d = TX.dealers.find(x => up.includes(x.toUpperCase())), m = TX.models.find(x => new RegExp("\\b" + x.replace(/[-]/g, "\\-") + "\\b").test(up)); return txMd({dealer: d, model: m}); });
function fgMd(){
  if(!FG || !FG.items[0] || FG.items[0].age90 == null) return "Chưa có dữ liệu kho thành phẩm chi tiết.";
  const g = Object.entries(FG.groups).filter(([k]) => k !== "KHÁCH"), byM = {}; FG.items.forEach(it => { const x = byM[it.model] = byM[it.model] || [0, 0, 0]; x[0] += it.fg + it.chassis + it.wait; x[1] += it.age90; x[2] = Math.max(x[2], it.maxAge || 0); });
  const R = FG.recon, N = FG.nxt || {}, P = FG.pipeline || {};
  return `# Kho thành phẩm DAC (${(FG.asOf || "").split("-").reverse().join("/")})\n- Tồn: ${g.map(([k, v]) => `${k} ${v.fg} xe + thùng${v.chassis ? ", " + v.chassis + " chassis" : ""}, ${v.wait} chờ xuất, ${v.age90} xe > 90 ngày`).join("; ")}.\n- Đang sản xuất: ${P.wipBody || 0} gác thùng, ${P.wipQC || 0} chờ QM; ${P.ckd || 0} bộ linh kiện chưa nhập kho; ký gửi tại đại lý ${sum(Object.values(FG.consign || {}))} xe.\n` +
    (N.period ? `- Nhập – xuất ${N.period.join(" → ")}: nhập ${sum(Object.values(N.in))}, xuất ${sum(Object.values(N.out))} (nhiều nhất ${Object.entries(N.outDealer).slice(0, 5).map(([d, n]) => d + " " + n).join(", ")}).\n` : "") +
    `\n| Model | Tồn | > 90 ngày | Lâu nhất |\n|---|---|---|---|\n` + Object.entries(byM).sort((a, b) => b[1][1] - a[1][1]).map(([m, x]) => `| ${m} | ${x[0]} | ${x[1]} | ${x[2] || ""} ngày |`).join("\n") +
    (R ? `\n\n## Đối chiếu sell-in ${R.months}\nKho nhà máy ${R.total.fgSellIn} xe, TDBH ${R.total.tdbhSellIn} xe (lệch ${R.total.fgSellIn - R.total.tdbhSellIn}); bán lẻ TDBH ${R.total.tdbhRetail}; tồn đại lý ${R.total.stockMoM}. Lệch lớn: ${R.rows.filter(r => Math.abs(r.diffSellIn) >= 15).map(r => r.dealer + " " + (r.diffSellIn > 0 ? "+" : "") + r.diffSellIn).join(", ") || "không"}.` : "");
}
CV.tools.push({name: "kho_nha_may", label: "Đang đọc kho thành phẩm…", description: "Kho thành phẩm DAC tại nhà máy: tồn theo model, thùng, màu, tuổi tồn (< 45, 45–90, > 90 ngày), xe đang sản xuất, linh kiện chưa nhập kho, nhập – xuất trong kỳ, xuất bán cho đại lý (sell-in) theo tháng, đối chiếu sell-in với TDBH và tồn đại lý.", inputSchema: {type: "object", properties: {}}, execute: () => fgMd()});
const prev = CV.ctx; CV.ctx = () => (prev ? prev() : "") + `\nBÁN HÀNG CHI TIẾT (file giao dịch ${TX.source}, T11/2024–${TX.asOf}): đại lý × model × thùng × tháng; tồn thành phẩm kho DAC ${FG ? Object.entries(FG.groups).filter(([g]) => g !== "KHÁCH").reduce((a,[,v]) => a + v.fg + v.chassis, 0) : "?"} xe; dùng ban_hang_chi_tiet.`;
renderPivot();
})();
