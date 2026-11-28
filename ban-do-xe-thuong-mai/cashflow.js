/* ===== Dashboard dòng tiền (Phòng chiến lược HĐQT): chỉ số tài chính ảnh hưởng dòng tiền, cảnh báo nguy cơ đứt gãy, lịch thu – chi 13 tuần =====
   Nguyên tắc chống sai: mỗi số ghi nguồn, ngày; số chưa có thì ghi "chưa có số" (không thay bằng 0); ngưỡng cảnh báo là quy tắc minh bạch, Ban TGĐ chỉnh được;
   giả định (tỷ lệ thu hồi, lãi vốn, bán sỉ mới) hiển thị và sửa được. Đơn vị: triệu đồng. */
(function(){
"use strict";
const CV = window.__CV; if(!CV) return;
const {esc, fmtInt, fmt1} = CV, sum = a => a.reduce((x, y) => x + (y || 0), 0);

/* ---------- kho lưu cục bộ (chỉ trên máy người dùng): dùng chung cho cổng nhập dữ liệu ---------- */
const NS = "dac.in.";
CV.store = {
  get(k){ try{ const v = localStorage.getItem(NS + k); return v ? JSON.parse(v) : null; }catch(e){ return null; } },
  set(k, v){ try{ localStorage.setItem(NS + k, JSON.stringify(v)); window.dispatchEvent(new CustomEvent("dac:store", {detail: k})); return true; }catch(e){ return false; } },
  del(k){ try{ localStorage.removeItem(NS + k); window.dispatchEvent(new CustomEvent("dac:store", {detail: k})); }catch(e){} },
  keys(){ try{ return Object.keys(localStorage).filter(x => x.startsWith(NS)).map(x => x.slice(NS.length)); }catch(e){ return []; } }
};
let DEBT0 = null; try{ DEBT0 = JSON.parse(document.getElementById("debt-data").textContent); }catch(e){}
const debt = () => CV.store.get("debt") || DEBT0;
CV.debt = debt; CV.debtBase = () => DEBT0;

/* ---------- trường nhập tài chính (Phòng Tài chính cung cấp) ---------- */
const FIELDS = [
  ["cash", "Tiền mặt và tiền gửi khả dụng", "Số dư thực tế cuối ngày, không gồm tiền ký quỹ, tiền đã cam kết chi"],
  ["undrawn", "Hạn mức tín dụng chưa rút", "Hạn mức còn được giải ngân, đang hiệu lực"],
  ["stDebt", "Dư nợ vay ngắn hạn", "Gốc vay đang còn"],
  ["debt30", "Nợ vay, lãi đến hạn trong 30 ngày", ""], ["debt60", "Nợ vay, lãi đến hạn 31–60 ngày", ""], ["debt90", "Nợ vay, lãi đến hạn 61–90 ngày", ""],
  ["ap30", "Phải trả nhà cung cấp (CKD, linh kiện, thùng) đến hạn 30 ngày", "Theo hợp đồng, bảng kê công nợ phải trả"], ["ap60", "Phải trả nhà cung cấp đến hạn 31–60 ngày", ""], ["ap90", "Phải trả nhà cung cấp đến hạn 61–90 ngày", ""],
  ["tax30", "Thuế, phí phải nộp 30 ngày (GTGT, TNCN, nhập khẩu…)", ""], ["tax60", "Thuế, phí phải nộp 31–60 ngày", ""], ["tax90", "Thuế, phí phải nộp 61–90 ngày", ""],
  ["payroll", "Lương, BHXH, chi phí cố định mỗi tháng", ""], ["opex", "Chi phí bán hàng, marketing, vận hành mỗi tháng (không gồm lương)", ""],
  ["adv", "Tiền khách, đại lý trả trước chưa ghi nhận doanh thu", "Số dư Có TK 131: tiền đã thu nhưng chưa giao xe"],
  ["vatCredit", "Thuế GTGT đầu vào chờ khấu trừ, hoàn", ""],
  ["rate", "Lãi suất vay bình quân (%/năm)", "Mặc định 8% nếu chưa nhập"],
  ["minCover", "Hệ số thanh toán tối thiểu theo hợp đồng tín dụng", "Ví dụ 1,2; để trống nếu chưa có"]];
CV.finFields = FIELDS;
const fin = () => CV.store.get("fin") || {};
const has = v => v !== undefined && v !== null && v !== "" && !isNaN(+v);
const num = k => has(fin()[k]) ? +fin()[k] : null;
const ASSUME_DEF = {rec1: 90, rec2: 70, rec3: 50, rec4: 30, newSell: 80};   // % thu hồi nợ quá hạn theo nhóm tuổi; % bán sỉ mới thu được
const assume = () => Object.assign({}, ASSUME_DEF, CV.store.get("assume") || {});

/* ---------- tính toán ---------- */
function calc(){
  const D = debt(); if(!D) return null;
  const P = CV.plan27 || {}, S = P.stock || {}, F = P.factory || {};
  const A = assume();
  const total = D.MB.amt + D.MBTB.amt, over = D.MB.overAmt + D.MBTB.overAmt;
  const bk = k => (D.bucketsAmt.MB[k] || 0) + (D.bucketsAmt.MBTB[k] || 0);
  const aging = [["Trong hạn", bk("trong hạn"), "#4ee2a0"], ["Quá 1–30 ngày", bk("1–30"), "#9be15d"], ["Quá 31–60 ngày", bk("31–60"), "#ffc35a"], ["Quá 61–90 ngày", bk("61–90"), "#ff9a5a"], ["Quá trên 90 ngày", bk("> 90"), "#ff6b6b"]];
  const du = k => ((D.dueAmt || {}).MB || {})[k] + 0 || 0, due = k => (((D.dueAmt || {}).MB || {})[k] || 0) + (((D.dueAmt || {}).MBTB || {})[k] || 0);
  const dueS = {w1: due("0–7"), m1: due("8–30"), m2: due("31–60"), m3: due("61–90"), later: due("> 90")};
  // doanh số bán sỉ bình quân 3 tháng gần nhất đủ tháng (xe) × giá bình quân tồn đại lý
  let units3 = null, perDay = null;
  const sI = CV.factory && CV.factory.sellIn; if(sI){ const ms = ["2026-08", "2026-09", "2026-10"]; units3 = sum(Object.values(sI).map(d => sum(ms.map(m => d[m] || 0)))); }
  const price = S.ton ? S.value / S.ton : null;    // triệu đồng/xe, theo giá bán cho đại lý
  if(units3 != null && price) perDay = units3 * price / 92;
  const dso = perDay ? total / perDay : null;
  const dealers = D.dealers.slice().sort((a, b) => b.over - a.over);
  const top3 = sum(dealers.slice(0, 3).map(d => d.over)), top1Debt = Math.max(...D.dealers.map(d => d.total));
  const midAge = {"1–30": 15, "31–60": 45, "61–90": 75, "> 90": 150};
  const wAge = over ? sum(Object.entries(midAge).map(([k, v]) => v * bk(k))) / over : 0;
  const capital = (S.value || 0) + (F.value || 0), rate = has(fin().rate) ? +fin().rate : 8, carry = capital * rate / 100 / 12;
  const gap = CV.inv && CV.inv.contracts ? null : null;
  // lịch tiền về 13 tuần
  const W = 13, col = Array(W).fill(0), colNew = Array(W).fill(0), out = Array(W).fill(0);
  col[0] += dueS.w1; for(let i = 1; i <= 3; i++) col[i] += dueS.m1 / 3; for(let i = 4; i <= 7; i++) col[i] += dueS.m2 / 4; for(let i = 8; i <= 12; i++) col[i] += dueS.m3 / 5;
  const rec = [[bk("1–30"), A.rec1, 4], [bk("31–60"), A.rec2, 8], [bk("61–90"), A.rec3, 12], [bk("> 90"), A.rec4, 13]];
  rec.forEach(([amt, pc, wk]) => { for(let i = 0; i < wk; i++) col[i] += amt * pc / 100 / wk; });
  if(perDay) for(let i = 4; i < W; i++) colNew[i] = perDay * 7 * A.newSell / 100;
  const sp = (k30, k60, k90, from, to) => { const v = [num(k30), num(k60), num(k90)]; const rng = [[0, 4], [4, 8], [8, 13]]; v.forEach((x, j) => { if(x == null) return; const [a, b] = rng[j]; for(let i = a; i < b; i++) out[i] += x / (b - a); }); };
  sp("debt30", "debt60", "debt90"); sp("ap30", "ap60", "ap90"); sp("tax30", "tax60", "tax90");
  const fixedWeek = ((num("payroll") || 0) + (num("opex") || 0)) * 12 / 52; if(num("payroll") != null || num("opex") != null) for(let i = 0; i < W; i++) out[i] += fixedWeek;
  const open = num("cash"), net = col.map((c, i) => c + colNew[i] - out[i]); let cum = open == null ? 0 : open, cums = [], minC = Infinity, minW = 0;
  net.forEach((n, i) => { cum += n; cums.push(cum); if(cum < minC){ minC = cum; minW = i + 1; } });
  const outTot = sum(out), obl30 = sum(out.slice(0, 4)), liquid = (open || 0) + (num("undrawn") || 0), inputs = ["cash", "ap30", "debt30", "payroll"].filter(k => num(k) != null).length;
  return {D, A, total, over, o90: bk("> 90"), overPct: total ? over / total * 100 : 0, aging, dueS, units3, price, perDay, dso, dealers, top3, top3Pct: over ? top3 / over * 100 : 0, top1Pct: total ? top1Debt / total * 100 : 0, wAge,
    capital, rate, carry, S, F, col, colNew, out, net, cums, open, minC, minW, outTot, obl30, liquid, inputs, collectTot: sum(col), newTot: sum(colNew), dueTotal: sum(Object.values(dueS))};
}
CV.cashCalc = calc;

/* ---------- đèn cảnh báo ---------- */
const L = (v, g, a, hi = true) => hi ? (v <= g ? "g" : v <= a ? "a" : "r") : (v >= g ? "g" : v >= a ? "a" : "r");
function indicators(c){
  const R = [], add = (id, name, val, txt, rule, lv, meaning, act, src) => R.push({id, name, val, txt, rule, lv, meaning, act, src});
  const ty = x => fmt1(x / 1000) + " tỷ";
  add("CF-01", "Nợ quá hạn / tổng dư nợ đại lý", c.overPct, fmt1(c.overPct) + "% (" + ty(c.over) + ")", "Xanh ≤ 10% · Vàng ≤ 25% · Đỏ > 25%", L(c.overPct, 10, 25), "Phần tiền DAC đáng lẽ đã thu mà chưa thu; gốc của thiếu hụt tiền mặt.", "Thu nợ theo lịch từng xe; dừng giao xe mới cho đại lý quá hạn nặng.", "Báo cáo công nợ kế toán");
  add("CF-02", "Nợ quá hạn trên 90 ngày", c.o90, ty(c.o90), "Xanh = 0 · Vàng ≤ 5 tỷ · Đỏ > 5 tỷ", c.o90 === 0 ? "g" : c.o90 <= 5000 ? "a" : "r", "Nợ khó thu: xác suất thu hồi giảm mạnh theo tuổi nợ.", "Khóa giao xe; lập lịch trả; xem xét thu hồi xe hoặc trích lập.", "Báo cáo công nợ kế toán");
  add("CF-03", "Tuổi nợ quá hạn bình quân (ước)", c.wAge, fmt1(c.wAge) + " ngày", "Xanh ≤ 15 · Vàng ≤ 45 · Đỏ > 45 ngày", L(c.wAge, 15, 45), "Nợ càng già càng chậm quay vòng tiền.", "Ưu tiên thu nhóm 31–90 ngày trước khi thành nợ trên 90 ngày.", "Tính từ nhóm tuổi nợ (điểm giữa nhóm)");
  if(c.dso != null) add("CF-04", "DSO: số ngày thu tiền bình quân của đại lý", c.dso, fmt1(c.dso) + " ngày", "Xanh ≤ 30 · Vàng ≤ 45 · Đỏ > 45 ngày (hạn HĐMB 30 ngày)", L(c.dso, 30, 45), "Dư nợ chia doanh số bán sỉ bình quân mỗi ngày (3 tháng gần nhất); cao hơn hạn hợp đồng nghĩa là tiền về chậm.", "Rút ngắn kỳ thu; bán sỉ theo hạn mức và theo bán lẻ thực.", "Kho thành phẩm (bán sỉ), kế toán (dư nợ)");
  const cov = CV.plan27 ? CV.plan27.stock.cover : null;
  if(cov != null) add("CF-05", "Tồn đại lý (tháng bán lẻ)", cov, fmt1(cov) + " tháng", "Xanh ≤ 2 · Vàng ≤ 3 · Đỏ > 3 tháng", L(cov, 2, 3), "Xe đại lý chưa bán là vốn DAC còn nằm ngoài (HĐMB đã trả 10%, MBTB 5%).", "Khóa sỉ đại lý tồn > 4 tháng; xả xe > 180 ngày.", "Tồn SR từng xe, giao dịch bán lẻ");
  const sys = CV.plan27 ? CV.plan27.factory.sysCover : null;
  if(sys != null) add("CF-06", "Tồn toàn hệ thống (tháng bán lẻ)", sys, fmt1(sys) + " tháng", "Xanh ≤ 3 · Vàng ≤ 5 · Đỏ > 5 tháng", L(sys, 3, 5), "Kho nhà máy + đại lý: vốn bị chôn theo giá bán " + ty(c.capital) + "; lãi vốn khoảng " + fmtInt(c.carry) + " triệu/tháng.", "Hoãn, cắt nhập CKD model thừa; S&OP hằng tháng.", "Kho thành phẩm, tồn SR");
  const old = CV.plan27 ? CV.plan27.stock.age["181-365"] + CV.plan27.stock.age[">365"] : null;
  if(old != null) add("CF-07", "Xe tồn đại lý trên 180 ngày", old, fmtInt(old) + " xe", "Xanh ≤ 15 · Vàng ≤ 50 · Đỏ > 50 xe", L(old, 15, 50), "Tuổi tồn dài làm mất giá xe, dễ phải giảm giá sâu.", "Gói xả có thời hạn; điều chuyển đại lý thiếu model.", "Tồn SR từng xe (ngày TT 10%)");
  add("CF-08", "Tập trung nợ quá hạn ở 3 đại lý lớn nhất", c.top3Pct, fmt1(c.top3Pct) + "% (" + c.dealers.slice(0, 3).map(d => d.name).join(", ") + ")", "Xanh ≤ 40% · Vàng ≤ 60% · Đỏ > 60%", L(c.top3Pct, 40, 60), "Dòng tiền phụ thuộc vài đại lý: một đại lý đứt thanh toán là đứt cả kỳ thu.", "Đặt hạn mức riêng, lịch trả bảo đảm bằng xe, bảo lãnh.", "Báo cáo công nợ kế toán");
  add("CF-09", "Đại lý lớn nhất trong tổng dư nợ", c.top1Pct, fmt1(c.top1Pct) + "%", "Xanh ≤ 15% · Vàng ≤ 25% · Đỏ > 25%", L(c.top1Pct, 15, 25), "Rủi ro tập trung khách nợ.", "Chia nhỏ hạn mức; theo dõi hằng ngày đại lý này.", "Báo cáo công nợ kế toán");
  const ad = CV.plan27 && CV.plan27.debt ? CV.plan27.debt : null;
  if(ad){ const gp = ad.pend, ac = c.D.MB.n; const pct = gp ? Math.abs(gp - ac) / gp * 100 : 0; add("CF-10", "Lệch giữa file giao dịch bán hàng và kế toán (xe còn nợ HĐMB)", pct, fmtInt(gp) + " xe (giao dịch) so với " + fmtInt(ac) + " xe (kế toán)", "Xanh ≤ 5% · Vàng ≤ 20% · Đỏ > 20%", L(pct, 5, 20), "Dữ liệu không khớp thì không biết đúng ai nợ bao nhiêu; quyết định thu nợ dễ sai.", "Cập nhật ngày thanh toán 100% trong 48 giờ; đối soát từng số khung.", "File giao dịch, kế toán"); }
  // chỉ số cần nhập
  const need = (id, name, val, f, rule, meaning, act) => add(id, name, val, val == null ? "Chưa có số" : f(val), rule, val == null ? "n" : f.lv(val), meaning, act, "Nhập dữ liệu nội bộ (Phòng Tài chính)");
  const mk = (lvfn, fm) => Object.assign(x => fm(x), {lv: lvfn});
  const liq = c.open == null ? null : c.obl30 > 0 ? (c.liquid) / c.obl30 : null;
  need("CF-11", "Hệ số thanh khoản 30 ngày (tiền + hạn mức chưa rút) / nghĩa vụ 30 ngày", liq, mk(v => L(v, 1.5, 1.0, false), v => fmt1(v) + " lần"), "Xanh ≥ 1,5 · Vàng ≥ 1,0 · Đỏ < 1,0 lần", "Tiền sẵn có đủ trả nợ vay, nhà cung cấp, thuế, lương 30 ngày tới không.", "Dưới 1,0: lập kế hoạch bổ sung vốn, hoãn chi, đẩy thu nợ.");
  const run = c.open == null ? null : c.minC;
  need("CF-12", "Điểm trũng tiền mặt trong 13 tuần (sau thu – chi dự kiến)", run, mk(v => v >= 0 ? (v >= (c.outTot / 13 * 4) ? "g" : "a") : "r", v => ty(v) + (v < 0 ? " (tuần " + c.minW + ")" : "")), "Xanh ≥ chi 4 tuần · Vàng 0 đến chi 4 tuần · Đỏ < 0", "Điểm thấp nhất của số dư tiền mặt dự kiến; âm là đứt gãy dòng tiền.", "Bổ sung vốn trước tuần trũng; đẩy thu nợ nhóm 31–90 ngày.");
  const cvr = has(fin().minCover) && c.obl30 > 0 && c.open != null ? c.liquid / c.obl30 : null; const mc = num("minCover");
  need("CF-13", "Hệ số thanh toán so cam kết tín dụng", mc != null && cvr != null ? cvr / mc : null, mk(v => L(v, 1.2, 1.0, false), v => fmt1(v) + " lần mức tối thiểu"), "Xanh ≥ 1,2 · Vàng ≥ 1,0 · Đỏ < 1,0 lần mức tối thiểu", "Vi phạm cam kết có thể làm ngân hàng thu hồi nợ sớm.", "Báo trước ngân hàng; xin nới cam kết.");
  const advv = num("adv");
  need("CF-14", "Tiền khách trả trước chưa ghi nhận doanh thu", advv, mk(() => "i", v => ty(v)), "Thông tin (không phải doanh thu)", "Tiền đã thu nhưng xe chưa giao: là nghĩa vụ giao xe, không được dùng như doanh thu hay lợi nhuận.", "Giao xe đúng hẹn; ghi doanh thu khi đủ điều kiện bàn giao.");
  const sI = CV.salesSeason; const low = sI ? (sI.map((v, i) => [v, i + 1]).sort((a, b) => a[0] - b[0]).slice(0, 2).map(x => "T" + x[1]).join(", ")) : "T2, T8";
  add("CF-15", "Mùa vụ thu tiền thấp điểm 2027", 0, "Tháng " + low, "Thông tin: chuẩn bị đệm tiền trước 1–2 tháng", "i", "Bán lẻ thấp thì dòng thu của đại lý thấp, nợ dễ quá hạn.", "Gom tiền mặt đệm; không đẩy sỉ vào tháng thấp điểm.", "Chỉ số mùa vụ ERP");
  return R;
}
CV.cashIndicators = () => { const c = calc(); return c ? indicators(c) : []; };

/* ---------- giao diện ---------- */
const COL = {g: "#4ee2a0", a: "#ffc35a", r: "#ff6b6b", n: "#8ea7c7", i: "#46e3ff"}, LAB = {g: "Xanh", a: "Vàng", r: "Đỏ", n: "Chưa có số", i: "Thông tin"};
const ty = x => fmt1(x / 1000) + " tỷ";
function agingSvg(c){
  const W = 560, H = 54, tot = sum(c.aging.map(x => x[1])) || 1; let x = 0;
  return `<svg viewBox="0 0 ${W} ${H + 46}" role="img" aria-label="Cơ cấu tuổi nợ đại lý">${c.aging.map(([n, v, col]) => { const w = v / tot * W, g = `<g data-tip="<b>${esc(n)}</b><br>${ty(v)} · ${fmt1(v / tot * 100)}% dư nợ"><rect x="${x}" y="6" width="${Math.max(w, 1)}" height="${H - 12}" fill="${col}" opacity=".85"/>${w > 52 ? `<text x="${x + w / 2}" y="${H / 2 + 5}" text-anchor="middle" fill="#04121c" font-size="12" font-weight="700">${fmt1(v / tot * 100)}%</text>` : ""}</g>`; x += w; return g; }).join("")}
   ${c.aging.map(([n, v, col], i) => `<g transform="translate(${(i % 3) * 190},${H + 8 + Math.floor(i / 3) * 18})"><rect width="10" height="10" y="-9" fill="${col}"/><text x="14" fill="#e8f3ff" font-size="11.5">${esc(n)}: ${ty(v)}</text></g>`).join("")}</svg>`;
}
function weekSvg(c){
  const W = 640, H = 230, L0 = 52, T0 = 16, B0 = 28, w = (W - L0 - 8) / 13; const vals = c.cums, mx = Math.max(...vals, 1), mn = Math.min(...vals, 0), rg = (mx - mn) || 1; const Y = v => T0 + (mx - v) / rg * (H - T0 - B0);
  const bars = c.col.map((v, i) => v + c.colNew[i]), bmx = Math.max(...bars, ...c.out, 1);
  const hasOut = c.out.some(v => v > 0);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Dòng tiền dự kiến 13 tuần">
   <line x1="${L0}" x2="${W - 8}" y1="${Y(0)}" y2="${Y(0)}" stroke="#8ea7c7" stroke-dasharray="3 3"/>
   ${[mx, (mx + mn) / 2, mn].map(v => `<g><line x1="${L0}" x2="${W - 8}" y1="${Y(v)}" y2="${Y(v)}" stroke="rgba(142,167,199,.14)"/><text x="${L0 - 6}" y="${Y(v) + 4}" text-anchor="end" fill="#8ea7c7" font-size="10.5">${fmtInt(v / 1000)}</text></g>`).join("")}
   ${c.cums.map((v, i) => `<g data-tip="<b>Tuần ${i + 1}</b><br>Thu nợ cũ: ${ty(c.col[i])}${c.colNew[i] ? "<br>Thu bán sỉ mới (giả định): " + ty(c.colNew[i]) : ""}<br>Chi theo kế hoạch: ${hasOut ? ty(c.out[i]) : "chưa nhập"}<br><b>Lũy kế ${c.open == null ? "(so với đầu kỳ)" : "số dư"}: ${ty(v)}</b>"><rect x="${L0 + i * w + 4}" y="${Math.min(Y(v), Y(0))}" width="${w - 8}" height="${Math.max(Math.abs(Y(v) - Y(0)), 1.5)}" rx="3" fill="${v < 0 ? "#ff6b6b" : "#16a0bd"}" opacity=".9"/><text x="${L0 + i * w + w / 2}" y="${H - 10}" text-anchor="middle" fill="#8ea7c7" font-size="10.5">T${i + 1}</text></g>`).join("")}
   <text x="${W - 8}" y="12" text-anchor="end" fill="#8ea7c7" font-size="10.5">tỷ đồng · ${c.open == null ? "lũy kế so với đầu kỳ (chưa nhập tiền mặt)" : "số dư tiền mặt dự kiến"}</text></svg>`;
}
const dlg = document.createElement("dialog"); dlg.className = "odlg"; dlg.id = "cashDlg"; dlg.style.width = "min(1320px,98vw)"; dlg.setAttribute("aria-labelledby", "cashT");
document.body.appendChild(dlg);
const tip = document.createElement("div"); tip.className = "hudtip"; tip.hidden = true; dlg.appendChild(tip);
dlg.addEventListener("pointermove", e => { const t = e.target.closest && e.target.closest("[data-tip]"); if(!t){ tip.hidden = true; return; } tip.innerHTML = t.getAttribute("data-tip"); tip.hidden = false; const w = tip.offsetWidth, h = tip.offsetHeight; let x = e.clientX + 14, y = e.clientY + 14; if(x + w > innerWidth - 8) x = e.clientX - w - 14; if(y + h > innerHeight - 8) y = e.clientY - h - 14; tip.style.left = x + "px"; tip.style.top = y + "px"; });
function render(){
  const c = calc(); const body = dlg.querySelector("#cashBody"); if(!body) return;
  if(!c){ body.innerHTML = '<p class="muted">Chưa có dữ liệu công nợ.</p>'; return; }
  const R = indicators(c), cnt = k => R.filter(x => x.lv === k).length, D = c.D, ov = CV.store.get("debt");
  const fillN = FIELDS.filter(f => num(f[0]) != null).length;
  body.innerHTML = `
  <p class="muted small" style="margin:0 0 8px">Công nợ đại lý theo ${ov ? "<b>số nhập</b>" : "báo cáo kế toán"} <b>${esc(D.asOf.split("-").reverse().join("/"))}</b> (${esc(D.source)}); tồn đại lý ${esc(CV.plan27 ? CV.plan27.asOf.split("-").reverse().join("/") : "")}; kho nhà máy ${esc(CV.plan27 ? CV.plan27.factory.asOf.split("-").reverse().join("/") : "")}. Số tài chính nhập tay: ${fillN}/${FIELDS.length} trường${fillN ? "" : " (chưa nhập)"}. Giá trị xe theo giá bán cho đại lý, không phải giá vốn.</p>
  <div class="stats num">${[[ty(c.total), "dư nợ đại lý (HĐMB " + ty(D.MB.amt) + ", MBTB ước " + ty(D.MBTB.amt) + ")"], [ty(c.over) + " · " + fmt1(c.overPct) + "%", "nợ quá hạn / dư nợ"], [ty(c.o90), "nợ quá 90 ngày"], [c.dso == null ? "—" : fmt1(c.dso) + " ngày", "DSO đại lý (hạn HĐMB 30 ngày)"], [ty(c.capital), "vốn chôn trong tồn (kho NM + đại lý)"], [fmtInt(c.carry) + " tr/tháng", "lãi vốn ước (" + fmt1(c.rate) + "%/năm)"], [ty(c.collectTot), "thu nợ cũ dự kiến 13 tuần"], [c.open == null ? "chưa nhập" : ty(c.minC), "điểm trũng tiền mặt 13 tuần"]].map(([v, l]) => `<div class="stat"><div class="v">${esc(v)}</div><div class="l">${esc(l)}</div></div>`).join("")}</div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0"><span class="pill" style="border-color:${COL.r};color:${COL.r}">Đỏ ${cnt("r")}</span><span class="pill" style="border-color:${COL.a};color:${COL.a}">Vàng ${cnt("a")}</span><span class="pill" style="border-color:${COL.g};color:${COL.g}">Xanh ${cnt("g")}</span><span class="pill" style="border-color:${COL.n};color:${COL.n}">Chưa có số ${cnt("n")}</span>
   <b style="margin-left:6px;color:${cnt("r") ? COL.r : COL.g}">${cnt("r") >= 4 ? "Nguy cơ đứt gãy dòng tiền CAO: cần phương án vốn và thu nợ ngay" : cnt("r") >= 2 ? "Nguy cơ đứt gãy dòng tiền TRUNG BÌNH: theo dõi hằng tuần" : "Dòng tiền trong ngưỡng an toàn"}</b></div>
  <div class="hudgrid">
   <div class="hp w6"><h3>Tuổi nợ đại lý <span>tỷ đồng, theo ngày quá hạn</span></h3>${agingSvg(c)}</div>
   <div class="hp w6"><h3>Lịch tiền về theo hạn thanh toán <span>nợ trong hạn: tiền dự kiến vào</span></h3><table class="tasktbl small"><thead><tr><th>Đến hạn trong</th><th class="num">Số tiền</th><th>Ghi chú</th></tr></thead><tbody>
     ${[["0–7 ngày", c.dueS.w1, ""], ["8–30 ngày", c.dueS.m1, "HĐMB quá nửa nằm ở đây"], ["31–60 ngày", c.dueS.m2, "MBTB hạn 95 ngày"], ["61–90 ngày", c.dueS.m3, ""], ["Trên 90 ngày", c.dueS.later, "ngoài 13 tuần"]].map(r => `<tr><td>${r[0]}</td><td class="num">${ty(r[1])}</td><td class="tiny muted">${r[2]}</td></tr>`).join("")}
     <tr><td><b>Nợ quá hạn thu hồi (giả định)</b></td><td class="num"><b>${ty(sum([c.aging[1][1] * c.A.rec1, c.aging[2][1] * c.A.rec2, c.aging[3][1] * c.A.rec3, c.aging[4][1] * c.A.rec4].map(v => v / 100)))}</b></td><td class="tiny muted">tỷ lệ thu hồi ${c.A.rec1}% / ${c.A.rec2}% / ${c.A.rec3}% / ${c.A.rec4}% theo nhóm 1–30 / 31–60 / 61–90 / trên 90 ngày</td></tr></tbody></table></div>
   <div class="hp w12"><h3>Dòng tiền dự kiến 13 tuần <span>thu nợ cũ + bán sỉ mới (${c.A.newSell}% thu được, từ tuần 5) − chi theo kế hoạch nhập</span></h3>${weekSvg(c)}
    <p class="tiny muted" style="margin:4px 0 0">${c.open == null ? "Chưa nhập tiền mặt đầu kỳ nên biểu đồ là dòng tiền ròng lũy kế." : "Số dư đầu kỳ " + ty(c.open) + "."} ${c.out.some(v => v > 0) ? "Chi gồm: nợ vay, phải trả nhà cung cấp, thuế, lương và chi phí cố định đã nhập." : "<b>Chưa nhập kế hoạch chi</b> (nợ vay, nhà cung cấp, thuế, lương): biểu đồ mới chỉ có phía thu, chưa đánh giá được đứt gãy."} Bán sỉ mới giả định bằng bình quân ${c.units3 == null ? "" : fmtInt(c.units3 / 3) + " xe/tháng"} 3 tháng gần nhất (sỉ giảm thì thu giảm theo).</p></div>
   <div class="hp w12"><h3>Bảng chỉ số cảnh báo đứt gãy dòng tiền <span>${R.length} chỉ số · ngưỡng minh bạch</span></h3><div style="overflow-x:auto"><table class="tasktbl small"><thead><tr><th>Mã</th><th>Chỉ số</th><th>Giá trị</th><th>Ngưỡng</th><th>Mức</th><th>Ý nghĩa</th><th>Hành động</th><th>Nguồn</th></tr></thead><tbody>
    ${R.map(r => `<tr><td class="tiny">${r.id}</td><td><b>${esc(r.name)}</b></td><td>${esc(r.txt)}</td><td class="tiny">${esc(r.rule)}</td><td><b style="color:${COL[r.lv]}">● ${LAB[r.lv]}</b></td><td class="tiny">${esc(r.meaning)}</td><td class="tiny">${esc(r.act)}</td><td class="tiny muted">${esc(r.src)}</td></tr>`).join("")}</tbody></table></div></div>
   <div class="hp w12"><h3>Nợ theo đại lý <span>tỷ đồng · tuổi nợ lâu nhất</span></h3><div style="overflow-x:auto"><table class="tasktbl small"><thead><tr><th>Đại lý</th><th class="num">Dư nợ</th><th class="num">Quá hạn</th><th class="num">% quá hạn</th><th class="num">Trên 90 ngày</th><th class="num">Lâu nhất</th><th>Đề xuất</th></tr></thead><tbody>
    ${c.dealers.map(d => { const o90 = (d.MB.bAmt["> 90"] || 0) + (d.MBTB.bAmt["> 90"] || 0), mx = Math.max(d.MB.max, d.MBTB.max); return `<tr><td><b>${esc(d.name)}</b></td><td class="num">${ty(d.total)}</td><td class="num">${d.over ? ty(d.over) : ""}</td><td class="num" style="color:${d.total && d.over / d.total > .5 ? COL.r : ""}">${d.total ? fmtInt(d.over / d.total * 100) + "%" : ""}</td><td class="num">${o90 ? ty(o90) : ""}</td><td class="num">${mx > 0 ? mx + " ngày" : ""}</td><td class="tiny">${o90 ? "Khóa giao xe; lịch trả bảo đảm" : d.over ? "Nhắc nợ, lịch trả 15 ngày" : "Trong hạn"}</td></tr>`; }).join("")}</tbody></table></div></div>
   <div class="hp w12"><h3>Giả định có thể chỉnh <span>lưu trên máy này</span></h3><div style="display:flex;gap:14px;flex-wrap:wrap" id="cfAssume">${[["rec1", "Thu hồi nợ quá hạn 1–30 ngày (%)"], ["rec2", "Thu hồi 31–60 ngày (%)"], ["rec3", "Thu hồi 61–90 ngày (%)"], ["rec4", "Thu hồi trên 90 ngày (%)"], ["newSell", "Bán sỉ mới thu được (%)"]].map(([k, l]) => `<label class="field small">${l}<input type="number" min="0" max="100" step="5" data-as="${k}" value="${c.A[k]}" style="width:90px"></label>`).join("")}<button type="button" id="cfInput">Nhập số tài chính, công nợ…</button></div>
    <p class="tiny muted">Tỷ lệ thu hồi là giả định điều hành, chưa có số thống kê lịch sử của DAC; cần Phòng Tài chính hiệu chỉnh theo lịch sử thu nợ thực.</p></div>
  </div>`;
}
dlg.innerHTML = `<header><h3 id="cashT">Dashboard dòng tiền · Phòng chiến lược HĐQT</h3><button type="button" id="cfRefresh" title="Tính lại theo số mới nhất">Làm mới</button><button type="button" id="cfBen">Ben phân tích dòng tiền</button><button type="button" class="x" data-close>Đóng</button></header><div class="body" id="cashBody"></div>`;
function open(){ render(); if(!dlg.open) dlg.showModal(); }
dlg.addEventListener("click", e => {
  if(e.target.closest("[data-close]")) dlg.close();
  if(e.target.id === "cfRefresh") render();
  if(e.target.id === "cfInput"){ if(CV.openInput) CV.openInput("fin"); }
  if(e.target.id === "cfBen"){ const md = md_(); dlg.close(); CV.openAi(true); CV.benTab("Chat"); CV.addMsg("u", "Phân tích dòng tiền"); const b = CV.addMsg("a", ""); CV.finishBubble(b, md, false, "Phân tích dòng tiền", true); } });
dlg.addEventListener("change", e => { const k = e.target.dataset && e.target.dataset.as; if(!k) return; const v = Math.max(0, Math.min(100, +e.target.value || 0)); const a = CV.store.get("assume") || {}; a[k] = v; CV.store.set("assume", a); render(); });
window.addEventListener("dac:store", () => { if(dlg.open) render(); });
const tools = document.querySelector(".maptools"); if(tools){ const b = document.createElement("button"); b.type = "button"; b.id = "btnCash"; b.className = "primary"; b.textContent = "Dòng tiền"; b.title = "Dashboard dòng tiền: chỉ số cảnh báo đứt gãy, lịch thu chi 13 tuần"; b.addEventListener("click", open); const bd = document.getElementById("btnBoard"); bd ? bd.after(b) : tools.prepend(b); }
const bh = document.querySelector("#boardDlg header"); if(bh){ const b = document.createElement("button"); b.type = "button"; b.textContent = "Dòng tiền"; b.addEventListener("click", () => { const bdlg = document.getElementById("boardDlg"); if(bdlg && bdlg.open) bdlg.close(); open(); }); const t = bh.querySelector("#bdBen"); t ? bh.insertBefore(b, t) : bh.appendChild(b); }
CV.openCashflow = open;

function md_(){
  const c = calc(); if(!c) return "# Dòng tiền\nChưa có dữ liệu công nợ.";
  const R = indicators(c), ord = {r: 0, a: 1, n: 2, g: 3, i: 4};
  return `# Dashboard dòng tiền DAC\n_Công nợ đại lý ${c.D.asOf.split("-").reverse().join("/")} (${c.D.source}). Giá trị xe theo giá bán cho đại lý._\n\n- Dư nợ đại lý **${ty(c.total)}**, quá hạn **${ty(c.over)} (${fmt1(c.overPct)}%)**, trên 90 ngày **${ty(c.o90)}**.\n- DSO ${c.dso == null ? "chưa tính được" : fmt1(c.dso) + " ngày (hạn HĐMB 30 ngày)"}; vốn chôn trong tồn ${ty(c.capital)}, lãi vốn ước ${fmtInt(c.carry)} triệu/tháng.\n- Thu nợ cũ dự kiến 13 tuần: ${ty(c.collectTot)} (giả định thu hồi ${c.A.rec1}/${c.A.rec2}/${c.A.rec3}/${c.A.rec4}%).\n- ${c.open == null ? "**Chưa nhập tiền mặt, kế hoạch chi:** chưa đánh giá được điểm trũng tiền mặt; Phòng Tài chính nhập tại mục Nhập dữ liệu nội bộ." : "Điểm trũng tiền mặt " + ty(c.minC) + " (tuần " + c.minW + ")."}\n\n## Chỉ số cảnh báo\n| Mã | Chỉ số | Giá trị | Mức | Hành động |\n|---|---|---|---|---|\n${R.slice().sort((a, b) => ord[a.lv] - ord[b.lv]).map(r => `| ${r.id} | ${r.name} | ${r.txt} | ${LAB[r.lv]} | ${r.act} |`).join("\n")}\n\n## Đại lý nợ quá hạn lớn nhất\n${c.dealers.slice(0, 6).map(d => `- ${d.name}: quá hạn ${ty(d.over)} / dư nợ ${ty(d.total)}, lâu nhất ${Math.max(d.MB.max, d.MBTB.max)} ngày`).join("\n")}`;
}
CV.tools.push({name: "dong_tien", label: "Đang đọc dashboard dòng tiền…", description: "Dashboard dòng tiền DAC: dư nợ và tuổi nợ đại lý (kế toán), DSO, vốn chôn trong tồn kho, lãi vốn, lịch tiền về 13 tuần, điểm trũng tiền mặt, chỉ số cảnh báo đứt gãy (đỏ, vàng, xanh) và hành động. Số tài chính (tiền mặt, nợ vay, phải trả, thuế…) do Phòng Tài chính nhập; chưa nhập thì nói rõ chưa có số, không tự đặt.", inputSchema: {type: "object", properties: {}}, execute: () => md_()});
CV.localHooks.unshift(raw => /dòng tiền|cashflow|cash flow|đứt gãy|thanh khoản/i.test(raw) && !/dự báo|kế hoạch 2027/i.test(raw) ? md_() : null);
const prev = CV.ctx; CV.ctx = () => { const c = calc(); return (prev ? prev() : "") + (c ? `\nDÒNG TIỀN: dư nợ đại lý ${ty(c.total)}, quá hạn ${ty(c.over)} (${fmt1(c.overPct)}%), trên 90 ngày ${ty(c.o90)}; ${indicators(c).filter(x => x.lv === "r").length} chỉ số đỏ. Dùng dong_tien; số tài chính chưa nhập thì nói chưa có số.` : ""); };
if(CV.gloss) CV.gloss.push(
  {re: /DSO|số ngày thu tiền/i, t: "DSO – số ngày thu tiền bình quân", d: "Dư nợ phải thu của đại lý chia doanh số bán sỉ bình quân mỗi ngày.", v: "Cao hơn hạn thanh toán hợp đồng nghĩa là tiền về chậm, vốn DAC bị chiếm dụng.", a: "Rút ngắn kỳ thu; bán sỉ theo hạn mức và bán lẻ thực."},
  {re: /Điểm trũng tiền mặt|đứt gãy dòng tiền/i, t: "Điểm trũng tiền mặt", d: "Số dư tiền mặt thấp nhất trong 13 tuần tới sau khi cộng thu nợ, bán sỉ mới và trừ các khoản chi đã nhập.", v: "Âm nghĩa là đứt gãy dòng tiền: không đủ tiền trả lương, nhà cung cấp, thuế, nợ vay đúng hạn.", a: "Bổ sung vốn trước tuần trũng; đẩy thu nợ; hoãn chi, nhập CKD."});
})();
