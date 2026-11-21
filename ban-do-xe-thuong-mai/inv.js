/* ===== Tồn kho hệ thống đại lý DAC (file tồn SR từng xe): độ phủ theo model, đại lý × model, tuổi tồn, MBTB + phương án xả tồn ===== */
(function(){
"use strict";
const CV = window.__CV; if(!CV) return;
const {esc, fmtInt, fmt1} = CV;
let I; try{ I = JSON.parse(document.getElementById("inv-data").textContent); }catch(e){ return; }
if(!I || !I.total) return;
const C = {muted:"#8ea7c7", ink:"#e8f3ff", grid:"rgba(142,167,199,.16)", good:"#4ee2a0", warn:"#ffc35a", bad:"#ff6b6b", bar:"#16a0bd"};
const sum = a => a.reduce((x,y) => x + (y || 0), 0);
const rate = I.retailT11 / I.daysT11 * 30, cover = I.total / rate, DL = I.dealers.filter(d => d.ton), dd = I.asOf.split("-").reverse().join("/");
const top6 = DL.slice().sort((a,b) => b.ton - a.ton).slice(0, 6), top6s = sum(top6.map(d => d.ton));
const lvl = m => m == null ? C.bad : m <= 2 ? C.good : m <= 3 ? C.warn : C.bad, mark = m => m == null ? "▼" : m <= 2 ? "▲" : m <= 3 ? "■" : "▼";
const D1 = n => n == null ? "—" : fmt1(n).replace(",0", "");
const AGES = ["0-90", "91-180", "181-365", ">365"], old = d => ((d.age || {})["181-365"] || 0) + ((d.age || {})[">365"] || 0);
const M = m => I.models.find(x => x.m === m) || {};
CV.inv = I;
CV.invOf = name => { const ls = I.dealers.filter(d => d.link === name || d.name === name); if(!ls.length) return null; const ton = sum(ls.map(d => d.ton)), le = sum(ls.map(d => d.leT11));
  return {name, ton, leT11: le, cover: le ? +(ton / (le / I.daysT11 * 30)).toFixed(1) : null, lines: ls}; };

function coverChart(){
  const rows = I.models.filter(m => m.ton >= 5), W = 620, rh = 24, lw = 110, max = 18, bw = W - lw - 120, X = v => lw + Math.min(v, max)/max*bw, H = rows.length*rh + 24;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Tháng bán của tồn theo model">
    ${[2,3].map(v => `<line x1="${X(v)}" x2="${X(v)}" y1="0" y2="${H-18}" stroke="${v === 2 ? C.good : C.warn}" stroke-dasharray="3 3"/><text x="${X(v)}" y="${H-4}" text-anchor="middle" fill="${C.muted}" font-size="10">${v} th</text>`).join("")}
    ${rows.map((r,i) => { const y = i*rh + 2, v = r.cover == null ? max : r.cover;
      return `<g data-tip="<b>${esc(r.m)}</b><br>Tồn ${fmtInt(r.ton)} xe (MBTB ${r.mbtb}, đời ≤ 2025: ${r.y2025})<br>Bán lẻ T11 (${I.daysT11} ngày): ${r.leT11}<br>${r.cover == null ? "Chưa bán xe nào trong T11" : D1(r.cover) + " tháng bán"}<br>Quá 180 ngày: ${old(r)} xe<br>Thùng: ${Object.entries(r.bodies).map(([k,n]) => k + " " + n).join(", ")}"><rect x="0" y="${y}" width="${W}" height="${rh}" fill="transparent"/>
        <text x="${lw-8}" y="${y+15}" text-anchor="end" fill="${C.ink}" font-size="12">${esc(r.m)}</text>
        <rect class="bar" x="${lw}" y="${y+6}" width="${X(v)-lw}" height="12" rx="4" fill="${lvl(r.cover)}"${r.cover == null ? ' opacity=".5"' : ""}/>
        <text x="${X(v)+6}" y="${y+16}" fill="${C.ink}" font-size="11.5">${r.cover == null ? "không bán T11" : D1(r.cover) + " th"} · ${fmtInt(r.ton)} xe ${mark(r.cover)}</text></g>`; }).join("")}</svg>
    <p class="note">▲ ≤ 2 tháng · ■ 2–3 tháng · ▼ &gt; 3 tháng. Quy từ bán lẻ ${I.daysT11} ngày đầu tháng 11, chỉ để so sánh tương đối.</p>`;
}
function dealerTable(){
  return `<table class="tasktbl small"><thead><tr><th>Đại lý</th><th>Miền</th><th class="num">Tồn</th><th class="num">Mua bán · MBTB</th><th class="num">Bán T11</th><th class="num">Tháng bán</th><th class="num">&gt; 180 ngày</th><th>Model tồn nhiều</th></tr></thead><tbody>
    ${DL.slice().sort((a,b) => b.ton - a.ton).map(d => `<tr class="trow" data-sdl="${esc(d.link)}"><td><b>${CV.gmapA(d.link, esc(d.name))}</b>${d.manual ? '<span class="reason">số tổng nhập tay</span>' : ""}</td><td>${esc(d.region)}</td><td class="num"><b>${fmtInt(d.ton)}</b></td><td class="num">${d.mb} · ${d.mbtb}${d.kg ? " · KG " + d.kg : ""}</td><td class="num">${d.leT11 || 0}</td><td class="num" style="color:${lvl(d.cover)}">${d.cover == null ? "không bán" : D1(d.cover)} ${mark(d.cover)}</td><td class="num" style="color:${old(d) ? C.bad : ""}">${old(d) || ""}</td><td class="tiny">${Object.entries(d.models).slice(0, 3).map(([m,n]) => m + " " + n).join(", ")}</td></tr>`).join("")}</tbody></table>`;
}
function matrix(){
  const ms = I.models.filter(m => m.ton >= 9).map(m => m.m), mx = Math.max(...DL.flatMap(d => ms.map(m => d.models[m] || 0)), 1);
  return `<table class="tasktbl small"><thead><tr><th>Đại lý</th>${ms.map(m => `<th class="num">${esc(m)}</th>`).join("")}<th class="num">Khác</th></tr></thead><tbody>
    ${DL.slice().sort((a,b) => b.ton - a.ton).map(d => { const k = d.ton - sum(ms.map(m => d.models[m] || 0)); return `<tr class="trow" data-sdl="${esc(d.link)}"><td><b>${CV.gmapA(d.link, esc(d.name))}</b></td>${ms.map(m => { const v = d.models[m] || 0; return `<td class="num" style="background:${v ? `rgba(208,115,29,${(0.08 + 0.6*v/mx).toFixed(2)})` : "transparent"}">${v || ""}</td>`; }).join("")}<td class="num">${k || ""}</td></tr>`; }).join("")}
    <tr><td><b>Tổng</b></td>${ms.map(m => `<td class="num"><b>${M(m).ton}</b></td>`).join("")}<td class="num"><b>${I.total - sum(ms.map(m => M(m).ton))}</b></td></tr></tbody></table>`;
}
function ageHtml(){
  const b = I.age.buckets, mx = Math.max(...AGES.map(a => b[a] || 0), 1), col = {"0-90": C.good, "91-180": C.warn, "181-365": C.bad, ">365": "#b0303f"};
  const byModel = I.models.map(m => [m.m, old(m)]).filter(x => x[1]).sort((a,b) => b[1] - a[1]);
  return AGES.map(a => `<div class="rk" style="grid-template-columns:90px minmax(0,1fr) 70px;cursor:default"><span class="nm">${a} ngày</span><span class="b" style="width:${((b[a]||0)/mx*100).toFixed(1)}%;background:${col[a]}"></span><span class="v">${fmtInt(b[a] || 0)} xe</span></div>`).join("")
    + `<p class="note">Tuổi tính từ ngày TT 10% cho ${fmtInt(I.age.withPayDate)} xe hợp đồng mua bán; ${fmtInt(I.contracts.MBTB)} xe MBTB không có ngày TT 10%. Xe đời ≤ 2025 còn ${I.age.model2025}.</p>
    <h4>Quá 180 ngày theo model</h4><p class="small">${byModel.map(([m,n]) => `<b>${esc(m)}</b> ${n}`).join(" · ")}</p>
    <h4>Danh sách nhóm xe quá 180 ngày</h4><div style="max-height:220px;overflow:auto"><table class="tasktbl small"><thead><tr><th>Đại lý</th><th>Model</th><th>Đời</th><th>Tuổi</th><th class="num">Xe</th></tr></thead><tbody>${I.old.map(([d,m,y,a,n]) => `<tr><td>${esc(d)}</td><td>${esc(m)}</td><td>${y || ""}</td><td style="color:${a === ">365" ? "#ff8a9a" : C.bad}">${a} ngày</td><td class="num">${n}</td></tr>`).join("")}</tbody></table></div>`;
}
function regionBars(){ const mx = Math.max(...I.regions.map(r => r[1]));
  return I.regions.map(([r,v]) => `<div class="rk" style="grid-template-columns:70px minmax(0,1fr) 90px;cursor:default" data-tip="<b>Miền ${esc(r)}</b><br>${fmtInt(v)} xe · ${fmt1(v/I.total*100)}%"><span class="nm">${esc(r)}</span><span class="b" style="width:${(v/mx*100).toFixed(1)}%;background:linear-gradient(90deg,#16a0bd66,#16a0bd)"></span><span class="v">${fmtInt(v)} · ${fmtInt(v/I.total*100)}%</span></div>`).join("")
    + `<p class="note">${esc(I.regionNote)}</p><h4>Theo loại thùng</h4><p class="small">${Object.entries(I.bodies).map(([k,n]) => `<b>${esc(k)}</b> ${n}`).join(" · ")}</p><h4>Theo màu</h4><p class="small">${Object.entries(I.colors).map(([k,n]) => `<b>${esc(k)}</b> ${n}`).join(" · ")}</p>`; }
function actions(){
  const iz = M("IZ50S"), izRate = iz.leT11 / I.daysT11 * 30, izOver = Math.round(iz.ton - 3*izRate), jp = ["JP120SL","JP120EXL"].map(M), jpT = sum(jp.map(x => x.ton)), jpL = sum(jp.map(x => x.leT11)), S = CV.salesSeason;
  const slow = DL.filter(d => d.ton >= 10 && (d.cover == null || d.cover > 6) && !d.manual).sort((a,b) => (b.cover || 99) - (a.cover || 99));
  const fast = DL.filter(d => d.cover != null && d.cover <= 3 && d.leT11 >= 3).sort((a,b) => a.cover - b.cover);
  const zero = DL.filter(d => !d.leT11 && d.ton >= 10 && !d.manual);
  const goodM = I.models.filter(m => m.cover != null && m.cover <= 3 && m.ton >= 5).map(m => m.m);
  const oldTop = I.old.slice(0, 4).map(([d,m,y,a,n]) => `${d} ${m} ${n} xe`).join("; ");
  return [
    `<b>Dừng xuất sỉ, giãn sản xuất/CKD cho IZ50S, IZ50M, IZ50M-PLUS, JP120</b> đến khi tồn ≤ 3 tháng bán. IZ50S tồn ${fmtInt(iz.ton)} xe (${iz.mbtb} xe MBTB) dư khoảng ${fmtInt(izOver)} xe so với mức 3 tháng (${fmtInt(izRate)} xe/tháng); IZ50M ${M("IZ50M").ton} xe ≈ ${D1(M("IZ50M").cover)} tháng.`,
    `<b>Ưu tiên phân bổ, sản xuất các model đang bán tốt</b>: ${goodM.join(", ")} (≤ 3 tháng bán).`,
    `<b>Chiến dịch cao điểm T11–T12</b>: mùa vụ T11, T12 cao hơn bình quân ${S ? fmtInt((S[10]-1)*100) + "% và " + fmtInt((S[11]-1)*100) + "%" : "30–50%"}; thưởng nóng theo xe bán lẻ IZ50S, IZ50M; xe đời ≤ 2025 (${I.age.model2025} xe) bán trước 31/12.`,
    `<b>Xử lý theo tuổi tồn</b>: ${I.age.over180} xe quá 180 ngày, ${I.age.over365} xe quá 1 năm. Nhóm lớn nhất: ${oldTop}. Hỗ trợ lãi vay tồn kho có thời hạn; xe quá 1 năm làm phương án thanh lý.`,
    `<b>Điều chuyển giữa đại lý</b>: rút xe từ đại lý bán chậm ${slow.slice(0, 5).map(d => `${d.name} (${d.ton} xe, ${d.cover == null ? "không bán T11" : D1(d.cover) + " tháng"})`).join(", ")} sang đại lý bán nhanh ${fast.slice(0, 5).map(d => `${d.name} (${D1(d.cover)} tháng)`).join(", ")}.`,
    zero.length ? `<b>Đại lý có tồn nhưng chưa bán xe nào trong T11</b>: ${zero.map(d => `${d.name} ${d.ton} xe`).join(", ")}: kiểm tra phễu khách, lái thử, chương trình bán hàng tại chỗ trong tuần này.` : "",
    `<b>MBTB ${fmtInt(I.contracts.MBTB)} xe (${fmtInt(I.contracts.MBTB/I.total*100)}% tồn)</b>, riêng IZ50S ${iz.mbtb} xe: theo dõi giá bán lẻ của xe MBTB (cơ chế giá riêng) để tránh phá giá hệ thống khi xả tồn.`,
    `<b>JP120SL/EXL ${jpT} xe, bán ${jpL} xe trong T11</b> (≈ ${D1(jpT/(Math.max(jpL,0.5)/I.daysT11*30))} tháng): chỉ bán theo dự án, giữ xe trưng bày ở 3–4 đại lý trọng điểm.`,
    `<b>Trung – Tây Nguyên</b>: Cương Nguyễn chưa có showroom riêng (đang dùng showroom Đô Thành Kon Tum là đại lý VinFast); thu hồi xe ở Hùng Tuyến sau khi chuyển cấp 2; Dũng Lạc, ĐT Đà Nẵng cần kế hoạch bán T12.`,
    `<b>Quy tắc bán sỉ</b>: chỉ xuất sỉ khi tồn đại lý ≤ 2 tháng bán; ĐT Hậu Giang, ĐT Kiên Giang, Cương Nguyễn, Hùng Tuyến cập nhật tồn từng xe lên hệ thống.`].filter(Boolean);
}
function invMd(){
  const strip = x => x.replace(/<[^>]+>/g, "").replace(/&gt;/g, ">");
  return `# Tồn kho hệ thống đại lý DAC đến ${dd}\n_${I.source}._\n\n- **Tồn: ${fmtInt(I.total)} xe ≈ ${fmt1(cover)} tháng bán** (bán lẻ T11 ${I.retailT11} xe/${I.daysT11} ngày ≈ ${fmtInt(rate)} xe/tháng); gấp ${fmt1(I.total/I.regT10)} lần đăng kiểm T10 (${I.regT10} xe).\n- ${I.recon.note}\n- Loại hợp đồng: mua bán ${I.contracts["Mua bán"]}, MBTB ${I.contracts.MBTB}, ký gửi ${I.contracts["Ký gửi"]}. ${I.mbtb.note}\n- 6 đại lý (${top6.map(d => d.name).join(", ")}) giữ ${fmtInt(top6s)} xe = ${fmtInt(top6s/I.total*100)}% tồn.\n- Tuổi tồn (${I.age.withPayDate} xe có ngày TT 10%): ${AGES.map(a => a + " ngày " + (I.age.buckets[a] || 0)).join(", ")}; quá 180 ngày ${I.age.over180}, quá 1 năm ${I.age.over365}; đời ≤ 2025 ${I.age.model2025} xe.\n\n## Theo model\n| Model | Tồn | MBTB | Bán T11 | Tháng bán | > 180 ngày | Đời ≤ 2025 |\n|---|---|---|---|---|---|---|\n${I.models.map(m => `| ${m.m} | ${m.ton} | ${m.mbtb} | ${m.leT11} | ${m.cover == null ? "không bán" : D1(m.cover)} | ${old(m)} | ${m.y2025} |`).join("\n")}\n\n## Theo đại lý\n| Đại lý | Miền | Tồn | Mua bán / MBTB | Bán T11 | Tháng bán | > 180 ngày | Model tồn nhiều |\n|---|---|---|---|---|---|---|---|\n${DL.slice().sort((a,b) => b.ton - a.ton).map(d => `| ${d.name}${d.manual ? " (nhập tay)" : ""} | ${d.region} | ${d.ton} | ${d.mb} / ${d.mbtb} | ${d.leT11} | ${d.cover == null ? "không bán" : D1(d.cover)} | ${old(d)} | ${Object.entries(d.models).slice(0,3).map(([m,n]) => m + " " + n).join(", ")} |`).join("\n")}\n\n## Theo miền\n${I.regions.map(([r,v]) => `- ${r}: ${v} xe (${fmtInt(v/I.total*100)}%)`).join("\n")}\n\n## Phương án xả tồn\n${actions().map((a,i) => `${i+1}. ${strip(a)}`).join("\n")}\n`;
}

const anchor = document.getElementById("salesSec");
if(anchor){
  const s = document.createElement("section"); s.className = "glass pad"; s.id = "invSec"; s.setAttribute("aria-label", "Tồn kho đại lý");
  const tile = ([v,l]) => `<div class="stat"><div class="v">${esc(String(v))}</div><div class="l">${esc(l)}</div></div>`;
  s.innerHTML = `<div class="opshead"><div><h2>Tồn kho đại lý ${esc(dd)}</h2><p class="muted" style="margin:4px 0 0">${esc(I.source)}. ${esc(I.recon.note)}</p></div><div class="toolbar" style="margin:0"><button type="button" class="primary" id="invBen">Ben phương án xả tồn</button><button type="button" id="invCsv">Xuất đại lý × model (.csv)</button></div></div>
    <div class="opstiles num">${[[fmtInt(I.total), `xe tồn tại đại lý (mua bán ${I.contracts["Mua bán"]} · MBTB ${I.contracts.MBTB})`], [fmt1(cover), `tháng bán tồn kho (bán ${fmtInt(rate)} xe/tháng)`], [`${M("IZ50S").ton} · ${fmtInt(M("IZ50S").ton/I.total*100)}%`, `IZ50S trong tồn (${D1(M("IZ50S").cover)} tháng bán, MBTB ${M("IZ50S").mbtb})`], [`${I.age.over180} xe`, `tồn quá 180 ngày (${I.age.over365} xe quá 1 năm)`], [fmtInt(top6s/I.total*100) + "%", "tồn dồn ở 6 đại lý"], [fmt1(I.total/I.regT10) + " lần", `tồn so với đăng kiểm T10 (${I.regT10} xe)`]].map(tile).join("")}</div>
    <div class="hudgrid"><div class="hp w6"><h3>Tháng bán của tồn theo model <span>ngưỡng 2–3 tháng</span></h3>${coverChart()}</div>
      <div class="hp w6"><h3>Tồn theo đại lý <span>bấm để bay tới đại lý</span></h3><div style="overflow-x:auto;max-height:520px">${dealerTable()}</div></div>
      <div class="hp w12"><h3>Ma trận đại lý × model (xe tồn) <span>màu đậm = tồn nhiều</span></h3><div style="overflow-x:auto">${matrix()}</div></div>
      <div class="hp"><h3>Tuổi tồn</h3>${ageHtml()}</div>
      <div class="hp"><h3>Tồn theo miền, thùng, màu</h3>${regionBars()}</div>
      <div class="hp"><h3>Phương án xả tồn đề xuất</h3><ol class="actions small">${actions().map(a => `<li>${a}</li>`).join("")}</ol></div></div>`;
  anchor.after(s);
}
document.addEventListener("click", e => {
  if(e.target.id === "invBen"){ CV.openAi(true); CV.benTab("Chat"); CV.addMsg("u", "Phương án xả tồn"); const b = CV.addMsg("a", ""); CV.finishBubble(b, invMd(), false, "Tồn kho đại lý", true); }
  if(e.target.id === "invCsv"){ const csv = "dai_ly,mien,model,so_xe\n" + DL.flatMap(d => Object.entries(d.models).map(([m,n]) => [d.name, d.region, m, n].join(","))).join("\n");
    const b = new Blob(["﻿" + csv], {type: "text/csv"}), a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "ton-dai-ly-model-" + I.asOf + ".csv"; a.click(); }
});
CV.tools.push({name: "ton_kho_dai_ly", label: "Đang xem tồn kho…", description: `Tồn kho hệ thống đại lý DAC đến ${dd} (file tồn từng xe): ${I.total} xe, khớp tồn, loại hợp đồng (mua bán/MBTB/ký gửi), tháng bán theo model và đại lý, ma trận đại lý × model, tuổi tồn, đời xe, thùng, màu, miền, phương án xả tồn.`, inputSchema: {type: "object", properties: {}}, execute: () => invMd()});
CV.localHooks.unshift(raw => /tồn kho|xả tồn|tồn đại lý|tuổi tồn/i.test(raw) && !/dự báo|kho thành phẩm|hệ thống/i.test(raw) ? invMd() : null);
const prev = CV.ctx; CV.ctx = () => (prev ? prev() : "") + `\nTỒN KHO ĐẠI LÝ ${dd}: ${I.total} xe ≈ ${fmt1(cover)} tháng bán; IZ50S ${M("IZ50S").ton} xe; ${I.age.over180} xe quá 180 ngày; MBTB ${I.contracts.MBTB} xe; dùng ton_kho_dai_ly.`;
})();
