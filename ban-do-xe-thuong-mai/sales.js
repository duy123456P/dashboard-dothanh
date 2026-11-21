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
    <div class="hudgrid"><div class="hp w6"><h3>Model theo năm 2023–2026 <span>CSI</span></h3><div id="slModel"></div></div><div class="hp w6"><h3>Nhận định tự động</h3><ul class="actions" id="slIns"></ul></div></div>`;
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
  document.getElementById("slIns").innerHTML = insights(names).map(x => `<li>${esc(x)}</li>`).join("") || "<li>Không có cảnh báo.</li>";
}
document.addEventListener("change", e => { if(e.target.id === "slReg"){ document.getElementById("slDl").value = ""; render(); } if(e.target.id === "slDl") render(); });
document.addEventListener("click", e => {
  const tr = e.target.closest && e.target.closest("[data-sdl]");
  if(tr){ const n = tr.dataset.sdl; document.getElementById("slDl").value = n; render(); const d = NETD(n); if(d){ CV.select(d.province, true); CV.focusOn(d.lng, d.lat, 60); } }
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
CV.localHooks.unshift(raw => { const t = raw.replace(/^ben\s*(ơi)?[,:\s]+/i, "").trim(); if(!/doanh số|bán lẻ|bán sỉ|tồn kho|thưởng/i.test(t) || /dự báo/i.test(t)) return null;
  const d = S.dealers.find(x => up(t).includes(up(x.name))); if(!d && !/chi tiết|theo tháng|theo model|từng/i.test(t)) return null; return salesMd(d ? [d.name] : null); });
const prev = CV.ctx; CV.ctx = () => (prev ? prev() : "") + `\nDOANH SỐ CHI TIẾT (Tổng hợp TDBH ${S.sourceUpdated}, CSI): có số đại lý × tháng T1–T10/2026 và model × năm 2023–2026; hỏi chi tiết dùng doanh_so_chi_tiet.`;
render();
})();
