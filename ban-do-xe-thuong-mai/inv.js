/* ===== Tồn kho hệ thống đại lý DAC (ảnh chụp 21/11/2026): độ phủ theo model, đại lý, miền, tuổi tồn + phương án xả tồn ===== */
(function(){
"use strict";
const CV = window.__CV; if(!CV) return;
const {esc, fmtInt, fmt1} = CV;
let I; try{ I = JSON.parse(document.getElementById("inv-data").textContent); }catch(e){ return; }
if(!I || !I.total) return;
const C = {muted:"#8ea7c7", ink:"#e8f3ff", grid:"rgba(142,167,199,.16)", good:"#4ee2a0", warn:"#ffc35a", bad:"#ff6b6b", bar:"#16a0bd"};
const rate = I.retailT11 / I.daysT11 * 30, cover = I.total / rate, dl = I.dealers.filter(d => d.ton != null), known = dl.reduce((a,d) => a + d.ton, 0);
const top6 = dl.slice().sort((a,b) => b.ton - a.ton).slice(0, 6), top6s = top6.reduce((a,d) => a + d.ton, 0);
const lvl = m => m == null ? C.muted : m <= 2 ? C.good : m <= 3 ? C.warn : C.bad, mark = m => m == null ? "" : m <= 2 ? "▲" : m <= 3 ? "■" : "▼";
const D = n => (n == null ? "—" : fmt1(n)).replace(",0", "");
CV.inv = I; CV.invOf = name => I.dealers.find(d => d.name === name) || null;

function coverChart(){
  const rows = I.models, W = 620, rh = 26, lw = 120, max = 18, bw = W - lw - 70, X = v => lw + Math.min(v, max)/max*bw, H = rows.length*rh + 24;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Số tháng bán của tồn theo model">
    ${[2,3].map(v => `<line x1="${X(v)}" x2="${X(v)}" y1="0" y2="${H-18}" stroke="${v === 2 ? C.good : C.warn}" stroke-dasharray="3 3"/><text x="${X(v)}" y="${H-4}" text-anchor="middle" fill="${C.muted}" font-size="10">${v} th</text>`).join("")}
    ${rows.map((r,i) => { const y = i*rh + 2, lo = r.coverRange ? r.coverRange[0] : r.cover, hi = r.coverRange ? r.coverRange[1] : r.cover;
      return `<g data-tip="<b>${esc(r.m)}</b>${r.ton != null ? `<br>Tồn ${fmtInt(r.ton)} xe` : ""}${r.leT11 != null ? ` · bán lẻ T11 (21 ngày) ${r.leT11}` : ""}<br>${r.coverRange ? `Khoảng ${D(lo)}–${D(hi)} tháng bán` : `${D(r.cover)} tháng bán`}"><rect x="0" y="${y}" width="${W}" height="${rh}" fill="transparent"/>
        <text x="${lw-8}" y="${y+16}" text-anchor="end" fill="${C.ink}" font-size="12">${esc(r.m)}</text>
        ${r.coverRange ? `<rect class="bar" x="${X(lo)}" y="${y+7}" width="${X(hi)-X(lo)}" height="12" rx="4" fill="${C.bad}" opacity=".55"/>` : `<rect class="bar" x="${lw}" y="${y+7}" width="${X(hi)-lw}" height="12" rx="4" fill="${lvl(hi)}"/>`}
        <text x="${X(hi)+6}" y="${y+17}" fill="${C.ink}" font-size="11.5">${r.coverRange ? D(lo) + "–" + D(hi) : D(hi)} th${r.ton != null ? ` · ${fmtInt(r.ton)} xe` : ""} ${mark(hi)}</text></g>`; }).join("")}</svg>
    <p class="note">▲ ≤ 2 tháng (tốt) · ■ 2–3 tháng · ▼ &gt; 3 tháng (phải xử lý). Quy từ bán lẻ 21 ngày đầu T11, chỉ để so sánh tương đối.</p>`;
}
function dealerTable(){
  const rest = I.total - known, rows = dl.slice().sort((a,b) => b.ton - a.ton);
  return `<table class="tasktbl small"><thead><tr><th>Đại lý</th><th class="num">Tồn 21/11</th><th class="num">% hệ thống</th><th class="num">Tháng bán</th><th>Ghi chú</th></tr></thead><tbody>
    ${rows.map(d => `<tr class="trow" data-sdl="${esc(d.name)}"><td><b>${esc(d.name)}</b></td><td class="num">${fmtInt(d.ton)}</td><td class="num">${fmt1(d.ton/I.total*100)}%</td><td class="num" style="color:${lvl(d.cover)}">${d.cover != null ? D(d.cover) + " " + mark(d.cover) : "—"}${d.leT11 != null ? `<span class="reason">bán T11: ${d.leT11}</span>` : ""}</td><td class="tiny">${d.manual ? "Số thực tế (đại lý chưa cập nhật hệ thống). " : ""}${esc(d.note || "")}</td></tr>`).join("")}
    <tr><td class="muted">Các đại lý còn lại</td><td class="num">${fmtInt(rest)}</td><td class="num">${fmt1(rest/I.total*100)}%</td><td></td><td class="tiny muted">chưa có số chi tiết từng đại lý</td></tr></tbody></table>`;
}
function regionBars(){ const mx = Math.max(...I.regions.map(r => r[1]));
  return I.regions.map(([r,v]) => `<div class="rk" style="grid-template-columns:70px minmax(0,1fr) 90px;cursor:default" data-tip="<b>Miền ${esc(r)}</b><br>${fmtInt(v)} xe · ${fmt1(v/I.total*100)}%"><span class="nm">${esc(r)}</span><span class="b" style="width:${(v/mx*100).toFixed(1)}%;background:linear-gradient(90deg,#16a0bd66,#16a0bd)"></span><span class="v">${fmtInt(v)} · ${fmtInt(v/I.total*100)}%</span></div>`).join("") + `<p class="note">${esc(I.regionNote)} Nam + Trung–Tây Nguyên: ${fmtInt(I.regions.filter(r => /Nam|Trung/.test(r[0])).reduce((a,r) => a + r[1], 0))} xe.</p>`; }
function actions(){
  const iz = I.models.find(m => m.m === "IZ50S"), izRate = iz.leT11 / I.daysT11 * 30, izOver = Math.round(iz.ton - 3*izRate), jp = I.models.find(m => /JP120/.test(m.m)), S = CV.salesSeason;
  return [
    `<b>Dừng xuất sỉ, giãn nhập CKD cho IZ50S, IZ50M, JP120</b> đến khi độ phủ ≤ 3 tháng. IZ50S đang dư khoảng ${fmtInt(izOver)} xe so với mức 3 tháng bán (${fmtInt(izRate)} xe/tháng).`,
    `<b>Chiến dịch cao điểm T11–T12</b>: mùa vụ T11, T12 cao hơn bình quân ${S ? fmtInt((S[10]-1)*100) + "% và " + fmtInt((S[11]-1)*100) + "%" : "30–50%"}. Thưởng nóng theo xe bán lẻ cho IZ50S, IZ50M; ưu tiên xe đời 2025 (${fmtInt(I.age.model2025)} xe) trước 31/12 để tránh mất giá khi sang năm.`,
    `<b>Xử lý theo tuổi tồn</b>: ${fmtInt(I.age.over180)} xe quá 180 ngày (${fmt1(I.age.over180/I.age.withPayDate*100)}% số xe có ngày thanh toán) hỗ trợ lãi vay tồn kho cho đại lý; ${fmtInt(I.age.over365)} xe quá 1 năm làm phương án thanh lý hoặc chuyển kênh fleet.`,
    `<b>Điều chuyển giữa đại lý</b>: rút xe từ Phi Hưng (khoảng 11 tháng bán) và Quang Dương (khoảng 7 tháng) sang đại lý bán nhanh như Vũ Hùng (2,4 tháng); ưu tiên model đang thiếu ở nơi nhận.`,
    `<b>Kênh fleet, dự án cho IZ50S</b>: chào trường dạy lái (IZ50S là xe tập lái), doanh nghiệp logistics, hợp tác xã; giá theo lô có thời hạn.`,
    `<b>JP120SL/EXL ${fmtInt(jp.ton)} xe ~${D(jp.cover)} tháng</b>: chỉ bán theo dự án, có xe trưng bày tại 3–4 đại lý trọng điểm, gom phần còn lại về kho tổng.`,
    `<b>Trung – Tây Nguyên</b>: bán T11 rất thấp (Phi Hưng 3, Tây Nguyên 1, Dũng Lạc 0). Cương Nguyễn chưa có showroom riêng (đang dùng showroom Đô Thành Kon Tum là đại lý VinFast): cần điểm trưng bày; thu hồi 3 xe ở Hùng Tuyến sau khi chuyển cấp 2.`,
    `<b>Chốt quy tắc sell-in</b>: chỉ xuất sỉ khi tồn đại lý ≤ 2 tháng bán; kế hoạch nhập MISSU 2027 điều chỉnh theo dự báo (mục Dự báo doanh số).`,
    `<b>Dữ liệu</b>: đối chiếu chênh 9 xe trong phép khớp tồn (thu hồi, chuyển MBTB→MB); yêu cầu Hậu Giang, Kiên Giang, Cương Nguyễn, Hùng Tuyến cập nhật tồn lên hệ thống hằng ngày.`];
}
function invMd(){
  const strip = x => x.replace(/<[^>]+>/g, "").replace(/&gt;/g, ">");
  return `# Tồn kho hệ thống đại lý DAC đến ${I.asOf.split("-").reverse().join("/")}\n_${I.source}._\n\n- **Tồn thực tế: ${fmtInt(I.total)} xe ≈ ${fmt1(cover)} tháng bán** (bán lẻ T11 ${I.retailT11} xe/${I.daysT11} ngày ≈ ${fmtInt(rate)} xe/tháng); gấp ${fmt1(I.total/I.regT10)} lần đăng kiểm T10 (${I.regT10} xe).\n- Khớp tồn: ${I.recon.note}\n- MBTB: ${I.mbtb.note}\n- 6 đại lý (${top6.map(d => d.name).join(", ")}) giữ ${fmtInt(top6s)} xe = ${fmtInt(top6s/I.total*100)}% tồn.\n- Tuổi tồn: ${I.age.over180}/${I.age.withPayDate} xe có ngày thanh toán quá 180 ngày, ${I.age.over365} xe quá 1 năm; còn ${I.age.model2025} xe đời 2025.\n\n## Theo model\n| Model | Tồn | Bán lẻ T11 (21 ngày) | Tháng bán |\n|---|---|---|---|\n${I.models.map(m => `| ${m.m} | ${m.ton ?? "—"} | ${m.leT11 ?? "—"} | ${m.coverRange ? D(m.coverRange[0]) + "–" + D(m.coverRange[1]) : D(m.cover)} |`).join("\n")}\n\n## Theo đại lý\n| Đại lý | Tồn | Tháng bán | Ghi chú |\n|---|---|---|---|\n${dl.slice().sort((a,b) => b.ton - a.ton).map(d => `| ${d.name} | ${d.ton} | ${d.cover != null ? D(d.cover) : "—"} | ${d.manual ? "số thực tế, chưa cập nhật hệ thống. " : ""}${d.note || ""} |`).join("\n")}\n| Các đại lý còn lại | ${I.total - known} | | |\n\n## Theo miền\n${I.regions.map(([r,v]) => `- ${r}: ${v} xe (${fmtInt(v/I.total*100)}%)`).join("\n")}\n\n## Phương án xả tồn\n${actions().map((a,i) => `${i+1}. ${strip(a)}`).join("\n")}\n`;
}

const anchor = document.getElementById("salesSec");
if(anchor){
  const s = document.createElement("section"); s.className = "glass pad"; s.id = "invSec"; s.setAttribute("aria-label", "Tồn kho đại lý");
  s.innerHTML = `<div class="opshead"><div><h2>Tồn kho đại lý ${esc(I.asOf.split("-").reverse().join("/"))}</h2><p class="muted" style="margin:4px 0 0">${esc(I.source)}. Số tháng bán quy từ bán lẻ ${I.daysT11} ngày đầu tháng 11.</p></div><div class="toolbar" style="margin:0"><button type="button" class="primary" id="invBen">Ben phương án xả tồn</button></div></div>
    <div class="opstiles num">${[[fmtInt(I.total), "xe tồn thực tế hệ thống đại lý"], [fmt1(cover), `tháng bán tồn kho (bán ${fmtInt(rate)} xe/tháng)`], ["419 · 44%", "IZ50S trong tồn (8,4 tháng bán)"], [`${I.age.over180} xe`, `tồn quá 180 ngày (${I.age.over365} xe quá 1 năm)`], [fmtInt(top6s/I.total*100) + "%", "tồn dồn ở 6 đại lý"], [fmt1(I.total/I.regT10) + " lần", `tồn so với đăng kiểm T10 (${I.regT10} xe)`]].map(([v,l]) => `<div class="stat"><div class="v">${esc(String(v))}</div><div class="l">${esc(l)}</div></div>`).join("")}</div>
    <div class="hudgrid"><div class="hp w6"><h3>Tháng bán của tồn theo model <span>ngưỡng 2–3 tháng</span></h3>${coverChart()}</div>
      <div class="hp w6"><h3>Tồn theo đại lý <span>bấm để bay tới đại lý</span></h3><div style="overflow-x:auto">${dealerTable()}</div></div>
      <div class="hp"><h3>Tồn theo miền</h3>${regionBars()}</div>
      <div class="hp w8"><h3>Phương án xả tồn đề xuất</h3><ol class="actions small">${actions().map(a => `<li>${a}</li>`).join("")}</ol>
        <p class="note">Khớp tồn: ${esc(I.recon.note)} MBTB: ${esc(I.mbtb.note)}</p></div></div>`;
  anchor.after(s);
}
document.addEventListener("click", e => { if(e.target.id === "invBen"){ CV.openAi(true); CV.benTab("Chat"); CV.addMsg("u", "Phương án xả tồn"); const b = CV.addMsg("a", ""); CV.finishBubble(b, invMd(), false, "Tồn kho đại lý", true); } });
CV.tools.push({name: "ton_kho_dai_ly", label: "Đang xem tồn kho…", description: "Tồn kho hệ thống đại lý DAC đến 21/11/2026: 957 xe, số tháng bán theo model và đại lý, tuổi tồn, theo miền, khớp tồn, MBTB, phương án xả tồn (dừng sỉ, thưởng nóng, điều chuyển, fleet, thanh lý).", inputSchema: {type: "object", properties: {}}, execute: () => invMd()});
CV.localHooks.unshift(raw => /tồn kho|xả tồn|tồn đại lý|tuổi tồn/i.test(raw) && !/dự báo/i.test(raw) ? invMd() : null);
const prev = CV.ctx; CV.ctx = () => (prev ? prev() : "") + `\nTỒN KHO ĐẠI LÝ ${I.asOf}: ${I.total} xe ≈ ${fmt1(cover)} tháng bán; IZ50S 419 xe (8,4 tháng); 107 xe quá 180 ngày; dùng ton_kho_dai_ly.`;
})();
