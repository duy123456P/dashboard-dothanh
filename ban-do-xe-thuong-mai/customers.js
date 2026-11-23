/* ===== Khách hàng: khách tiềm năng cần chăm sóc (định vị Google Maps) + khách đã mua 2023–2026 theo tỉnh, huyện (không tên, SĐT cá nhân, số khung) ===== */
(function(){
"use strict";
const CV = window.__CV; if(!CV || !CV.CUST) return;
const {esc, fmtInt, fmt1} = CV, C = CV.CUST, PR = C.prospects || [], B = C.buyers || {byProv: {}, districts: [], years: {}};
const YRS = Object.keys(B.years || {}).sort();
/* Nguyên tắc phòng thủ khách hàng DAC (anh Duy, 23/11/2026) – áp dụng xuyên suốt chiến lược cạnh tranh */
const LOY = {net: 250, futurePct: 30, repeatToLoyal: 75, loyalShare: 20, loyalRev: 85, cacX: 7,
  src: [["Quy tắc 250 (Joe Girard, How to Sell Anything to Anybody, 1977): mỗi khách quen biết khoảng 250 người", "https://en.wikipedia.org/wiki/Joe_Girard"],
        ["HBR (Amy Gallo, 2014): tìm khách mới tốn gấp 5–25 lần giữ khách cũ", "https://hbr.org/2014/10/the-value-of-keeping-the-right-customers"],
        ["HBR (Reichheld & Sasser, 1990): tăng 5% tỷ lệ giữ khách làm lợi nhuận tăng 25–85%", "https://hbr.org/1990/09/zero-defections-quality-comes-to-services"]],
  note: "Các tỉ lệ 30%, 75%, 20/85, 7 lần là chuẩn điều hành của DAC (anh Duy); nguồn quốc tế trên là cơ sở tham chiếu. Dữ liệu khách: file thưởng TVBH 2023–2026 (mua lại = cùng SĐT/tên mua ≥ 2 xe, mã hóa ẩn danh), CSI ERP theo số khung, danh sách tiềm năng Ku_Sales."};
const LY = C.loyalty || {byProv: {}};
const loyOf = L => { const loyal = Math.round((L.repeat || 0) * LOY.repeatToLoyal / 100); return {loyal, net: loyal * LOY.net, rate: L.customers ? L.repeat / L.customers * 100 : 0}; };
CV.loyalty = {LOY, LY, loyOf};
let EOL = {}, EOLB = {}; try{ const ps = JSON.parse(document.getElementById("ps-data").textContent); EOL = ps.eol2025 || {}; EOLB = ps.eolBrands2025 || {}; }catch(e){}
const gm = p => `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
const COL = s => /chốt/i.test(s) ? "#46e3ff" : /quan tâm|hẹn gặp|báo giá/i.test(s) ? "#3ddc84" : /không|sai số/i.test(s) ? "#8a96a8" : "#ffb020";
const norm = s => String(s || "").toLowerCase().replace(/^(tp\.?|tỉnh|thành phố)\s*/i, "").trim();
const findP = q => { if(!q) return null; const n = norm(q); return (CV.rows || []).map(r => r.name).find(x => norm(x) === n) || (CV.rows || []).map(r => r.name).find(x => norm(x).includes(n) || n.includes(norm(x))); };
const prosOf = p => PR.filter(x => x.province === p).sort((a, b) => (b.phone ? 1 : 0) - (a.phone ? 1 : 0));
const cnt = (a, f) => a.reduce((m, x) => (m[f(x)] = (m[f(x)] || 0) + 1, m), {});

function campaign(p){
  const b = B.byProv[p] || {n: 0, years: {}}, pr = prosOf(p), old = (b.years["2023"] || 0) + (b.years["2024"] || 0), ind = Object.entries(cnt(pr, x => x.ind)).sort((a, c) => c[1] - a[1]).slice(0, 2).map(x => x[0]);
  const out = [], eol = (EOL[p] || {}).truck, L = LY.byProv[p];
  if(L && L.customers){ const o = loyOf(L); out.push(`Phòng thủ khách cũ trước: ${fmtInt(L.customers)} khách đã mua, ${fmtInt(L.repeat)} khách mua lại (${fmt1(o.rate)}%) ≈ ${fmtInt(o.loyal)} khách trung thành (75% khách mua lần 2), mỗi người mở ra ~250 người tiềm năng (~${fmtInt(o.net)} người). Chăm sóc khách cũ rẻ hơn tìm khách mới 7 lần: gọi hỏi thăm, bảo dưỡng ưu đãi, chương trình giới thiệu có thưởng.`); }
  const eb = (EOLB[p] || {}).brands, top = eb ? Object.entries(eb).slice(0, 4).map(([b, n]) => b + " " + Math.round(n / EOLB[p].n * 100) + "%").join(", ") : "";
  if(eol) out.push(`${fmtInt(eol)} xe tải hết niên hạn năm 2025 tại tỉnh (Cục Đăng kiểm, văn bản 419/ĐKVN)${top ? ", chủ yếu " + top : ""}: chủ xe buộc phải thay xe mới, chạy chương trình thu cũ đổi mới, hỗ trợ trả góp, ưu tiên nhà xe, hợp tác xã vận tải${top ? "; chào mẫu Đô Thành cùng tải trọng thay cho các hãng trên" : ""}.`);
  if(pr.length) out.push(`Gọi ${pr.length} doanh nghiệp tiềm năng (${pr.filter(x => x.phone).length} có số điện thoại${ind.length ? "; ngành chính: " + ind.join(", ") : ""}): kịch bản hỏi hàng chở, tải trọng, mời bản tư vấn chọn xe miễn phí; ghi kết quả vào cột Kết quả.`);
  if(old) out.push(`${fmtInt(old)} khách mua 2023–2024 đến kỳ bảo dưỡng lớn, thay lốp, gia hạn bảo hiểm: chiến dịch kiểm tra xe miễn phí, ưu đãi phụ tùng, giới thiệu khách mới; khách mua nhiều xe là ứng viên đổi, mua thêm.`);
  if((b.years["2025"] || 0) + (b.years["2026"] || 0)) out.push(`${fmtInt((b.years["2025"] || 0) + (b.years["2026"] || 0))} khách 2025–2026: chăm sóc sau bán (1 tháng/1.000 km, bảo dưỡng định kỳ), xin giới thiệu, mời làm khách tham chiếu.`);
  return out;
}
CV.custFront = r => { const p = r.name, pr = prosOf(p), b = B.byProv[p]; if(!pr.length && !b) return "";
  return `<details class="lgdoc" style="margin-top:8px"><summary><b>Khách hàng tại ${esc(p)}</b> · ${pr.length} tiềm năng · ${fmtInt(b ? b.n : 0)} xe đã bán 2023–2026</summary>
   ${b ? `<p class="small" style="margin:6px 0">Đã mua theo năm: ${YRS.map(y => y + ": <b>" + fmtInt(b.years[y] || 0) + "</b>").join(" · ")} · doanh nghiệp ${fmtInt(b.org)} (${fmtInt(b.org / b.n * 100)}%) · mẫu: ${Object.entries(b.models).slice(0, 5).map(([m, n]) => esc(m) + " " + n).join(", ")}</p>` : ""}
   ${pr.length ? `<ul class="small" style="margin:4px 0 4px 16px;padding:0">${pr.slice(0, 12).map(x => `<li><a href="${gm(x)}" target="_blank" rel="noopener">${esc(x.name)}</a> · ${esc(x.ind)}${x.phone ? " · " + esc(x.phone) : ""} · <span style="color:${COL(x.status)}">${esc(x.status)}</span></li>`).join("")}${pr.length > 12 ? `<li class="muted">… và ${pr.length - 12} doanh nghiệp khác (mục Khách hàng)</li>` : ""}</ul>` : ""}
   <ol class="actions small">${campaign(p).map(x => `<li>${esc(x)}</li>`).join("")}</ol></details>`; };

const sec = document.createElement("section"); sec.className = "glass pad"; sec.id = "custSec";
function render(){
  const st = cnt(PR, x => x.status), provs = Object.entries(B.byProv).sort((a, b) => b[1].n - a[1].n);
  const pOpts = [...new Set(PR.map(x => x.province).filter(Boolean))].sort((a, b) => prosOf(b).length - prosOf(a).length);
  sec.innerHTML = `<div><h2>Khách hàng &amp; chiến dịch chăm sóc</h2><p class="muted" style="margin:4px 0 0">Khách tiềm năng (doanh nghiệp, định vị OpenStreetMap, bấm tên để mở Google Maps) và khách đã mua xe Đô Thành 2023–2026 theo file TVBH. Bật nút <b>Khách hàng</b> trên bản đồ để xem dấu. Không hiển thị tên, số điện thoại khách cá nhân, số khung.</p></div>
  <div class="stats num" style="margin-top:10px"><div class="stat"><div class="v">${PR.length}</div><div class="l">doanh nghiệp tiềm năng (${PR.filter(x => x.phone).length} có SĐT)</div></div>
   <div class="stat"><div class="v">${fmtInt(st["Chưa gọi"] || 0)}</div><div class="l">chưa gọi</div></div>
   <div class="stat"><div class="v">${fmtInt(B.total || 0)}</div><div class="l">xe đã bán 2023–2026 (mỗi số khung một lần)</div></div>
   ${YRS.map(y => `<div class="stat"><div class="v">${fmtInt(B.years[y])}</div><div class="l">khách mua năm ${y}</div></div>`).join("")}</div>
  <div class="hudgrid" style="margin-top:12px">
   <div class="hp w12"><h3>Phòng thủ khách hàng: giá trị khách trung thành <span>nguyên tắc DAC, áp dụng xuyên suốt</span></h3>
    <div class="stats num"><div class="stat"><div class="v">${fmtInt(LY.customers || 0)}</div><div class="l">khách đã mua 2023–2026</div></div><div class="stat"><div class="v">${fmtInt(LY.repeat || 0)}</div><div class="l">khách mua lại ≥ 2 xe (${fmt1((LY.repeat || 0) / (LY.customers || 1) * 100)}% khách, ${fmtInt(LY.repeatVeh || 0)} xe = ${fmt1((LY.repeatVeh || 0) / (B.total || 1) * 100)}% số xe)</div></div>
     <div class="stat"><div class="v">~${fmtInt(loyOf(LY).loyal)}</div><div class="l">khách trung thành ước (75% khách mua lần 2)</div></div><div class="stat"><div class="v">~${fmtInt(loyOf(LY).net)}</div><div class="l">người tiềm năng qua giới thiệu (× 250)</div></div>
     <div class="stat"><div class="v">~${fmtInt(Math.round(PR.length * LOY.futurePct / 100))}</div><div class="l">doanh số tương lai từ ${PR.length} doanh nghiệp tiềm năng (30%)</div></div></div>
    <ol class="actions small"><li><b>1 khách trung thành ≈ 250 người tiềm năng:</b> mất 1 khách cũ là mất cả mạng lưới giới thiệu; xử lý khiếu nại trong 24 giờ.</li><li><b>30% khách tiềm năng là doanh số tương lai:</b> theo dõi đến cùng, không bỏ khách sau lần gọi đầu.</li><li><b>Khách mua lần 2 có 75% khả năng trung thành:</b> ưu tiên chốt lần mua thứ 2 (đổi xe, mua thêm) bằng ưu đãi khách cũ.</li><li><b>20% khách trung thành tạo 85% doanh thu định kỳ</b> (dịch vụ, phụ tùng, đổi xe): mỗi đại lý lập danh sách top 20% khách, giao người chăm sóc riêng.</li><li><b>Tìm khách mới tốn gấp 7 lần chăm sóc khách cũ:</b> phân bổ ngân sách marketing ưu tiên khách đã mua và khách tiềm năng đang theo dõi.</li></ol>
    <p class="note">${esc(LOY.note)} Tham chiếu: ${LOY.src.map(([t, u]) => `<a href="${u}" target="_blank" rel="noopener">${esc(t)}</a>`).join("; ")}. Chưa có khảo sát hài lòng (CSAT/NPS) theo đại lý trong dữ liệu: đề nghị đo qua cuộc gọi CSI sau giao xe 1 tháng và Zalo OA để theo dõi tỉ lệ khách trung thành thật.</p></div>
   <div class="hp w12"><h3>Khách tiềm năng cần gọi <span>theo tỉnh, ưu tiên có số điện thoại</span></h3><label class="field">Tỉnh <select id="cuProv"><option value="">Tất cả (${PR.length})</option>${pOpts.map(p => `<option>${esc(p)}</option>`).join("")}</select></label><div id="cuList" style="margin-top:8px;max-height:420px;overflow:auto"></div></div>
   <div class="hp w12"><h3>Khách đã mua theo tỉnh <span>xe, 2023–2026</span></h3><div style="overflow-x:auto"><table class="tasktbl small"><thead><tr><th>Tỉnh</th>${YRS.map(y => `<th class="num">${y}</th>`).join("")}<th class="num">Tổng</th><th class="num">% doanh nghiệp</th><th class="num">Khách mua lại</th><th>Mẫu chính</th><th>Huyện nhiều khách</th></tr></thead><tbody>
    ${provs.map(([p, b]) => `<tr><td><b>${esc(p)}</b></td>${YRS.map(y => `<td class="num">${fmtInt(b.years[y] || 0)}</td>`).join("")}<td class="num"><b>${fmtInt(b.n)}</b></td><td class="num">${fmtInt(b.org / b.n * 100)}%</td><td class="num">${(LY.byProv[p] || {}).repeat || 0}</td><td class="tiny">${Object.entries(b.models).slice(0, 3).map(([m, n]) => esc(m) + " " + n).join(", ")}</td><td class="tiny">${B.districts.filter(d => d.province === p && !/không ghi/.test(d.dist)).slice(0, 3).map(d => esc(d.dist) + " " + d.n).join(", ")}</td></tr>`).join("")}</tbody></table></div>
    <p class="note">${B.noProv ? fmtInt(B.noProv) + " xe không xác định được tỉnh từ địa chỉ. " : ""}Tỉnh theo 34 đơn vị mới (địa chỉ cũ được quy đổi); vòng tím trên bản đồ đặt ở trung tâm huyện.</p></div>
  </div>`;
  const sel = sec.querySelector("#cuProv"), box = sec.querySelector("#cuList");
  const draw = () => { const a = sel.value ? prosOf(sel.value) : PR.slice().sort((x, y) => (y.phone ? 1 : 0) - (x.phone ? 1 : 0));
    box.innerHTML = `<table class="tasktbl small"><thead><tr><th>Doanh nghiệp</th><th>Ngành</th><th>Khu vực</th><th>Điện thoại</th><th>Trạng thái</th></tr></thead><tbody>${a.map(x => `<tr><td><a href="${gm(x)}" target="_blank" rel="noopener" title="Mở Google Maps">${esc(x.name)}</a>${x.web ? ` <a class="tiny" href="${esc(/^http/.test(x.web) ? x.web : "https://" + x.web)}" target="_blank" rel="noopener">web</a>` : ""}</td><td>${esc(x.ind)}</td><td>${esc(x.area)}${x.province ? " · " + esc(x.province) : ""}</td><td>${esc(x.phone || "—")}</td><td style="color:${COL(x.status)}">${esc(x.status)}</td></tr>`).join("")}</tbody></table>`; };
  sel.addEventListener("change", draw); draw();
}
render();
const anchor = document.getElementById("policySec") || document.getElementById("salesSec") || document.querySelector("section.main"); anchor.parentElement.insertBefore(sec, anchor);

/* ---------- Ben ---------- */
function md(q){
  if(q){ const p = findP(q); if(!p) throw new Error("Không thấy tỉnh " + q); const pr = prosOf(p), b = B.byProv[p];
    return `# Khách hàng tại ${p}\n` + (b ? `- Đã mua 2023–2026: **${fmtInt(b.n)} xe** (${YRS.map(y => y + ": " + (b.years[y] || 0)).join(", ")}); doanh nghiệp ${fmtInt(b.org / b.n * 100)}%; mẫu: ${Object.entries(b.models).map(([m, n]) => m + " " + n).join(", ")}.\n- Huyện nhiều khách: ${B.districts.filter(d => d.province === p && !/không ghi/.test(d.dist)).slice(0, 6).map(d => d.dist + " " + d.n).join(", ")}.\n` : "- Chưa có khách đã mua trong file TVBH.\n") +
      `\n## Khách tiềm năng (${pr.length})\n` + (pr.map(x => `- [${x.name}](${gm(x)}) · ${x.ind} · ${x.area}${x.phone ? " · " + x.phone : ""} · ${x.status}`).join("\n") || "- Chưa có trong danh sách Ku_Sales.") +
      (LY.byProv[p] ? `\n- Khách mua lại: ${LY.byProv[p].repeat}/${LY.byProv[p].customers} khách (${fmt1(loyOf(LY.byProv[p]).rate)}%) → ~${loyOf(LY.byProv[p]).loyal} khách trung thành, ~${fmtInt(loyOf(LY.byProv[p]).net)} người tiềm năng qua giới thiệu.` : "") +
      `\n\n## Chiến dịch chăm sóc đề xuất\n${campaign(p).map((x, i) => `${i + 1}. ${x}`).join("\n")}`; }
  const top = Object.entries(B.byProv).sort((a, b) => b[1].n - a[1].n).slice(0, 10), pt = Object.entries(cnt(PR, x => x.province || "?")).sort((a, b) => b[1] - a[1]).slice(0, 10);
  return `# Khách hàng Đô Thành\n- Khách tiềm năng: **${PR.length} doanh nghiệp** (${PR.filter(x => x.phone).length} có SĐT); trạng thái: ${Object.entries(cnt(PR, x => x.status)).map(([s, n]) => s + " " + n).join(", ")}. Nhiều nhất: ${pt.map(([p, n]) => p + " " + n).join(", ")}.\n- Ngành: ${Object.entries(cnt(PR, x => x.ind)).sort((a, b) => b[1] - a[1]).map(([s, n]) => s + " " + n).join(", ")}.\n- Đã mua 2023–2026: **${fmtInt(B.total)} xe** (${YRS.map(y => y + ": " + B.years[y]).join(", ")}).\n\n| Tỉnh | ${YRS.join(" | ")} | Tổng | Tiềm năng |\n|---|${YRS.map(() => "---|").join("")}---|---|\n` +
    top.map(([p, b]) => `| ${p} | ${YRS.map(y => b.years[y] || 0).join(" | ")} | ${b.n} | ${prosOf(p).length} |`).join("\n") + `\n\nHỏi theo tỉnh để có danh sách gọi và chiến dịch chăm sóc.`;
}
CV.tools.push({name: "khach_hang", label: "Đang đọc dữ liệu khách hàng…", description: "Khách tiềm năng cần chăm sóc (doanh nghiệp, ngành, SĐT công khai, link Google Maps, trạng thái gọi) và khách đã mua xe Đô Thành 2023–2026 theo năm, tỉnh, huyện, mẫu xe; đề xuất chiến dịch chăm sóc. tinh = một tỉnh, bỏ trống = toàn quốc. Không có tên, SĐT khách cá nhân.", inputSchema: {type: "object", properties: {tinh: {type: "string"}}}, execute: ({tinh}) => md(tinh)});
CV.localHooks.unshift(raw => { const m = raw.trim().match(/khách (?:hàng )?(?:tiềm năng|đã mua|cũ)(?:\s+(?:tại|ở)\s+(.+?))?\??$/i); return m ? md(m[1] || "") : null; });
const prev = CV.ctx; CV.ctx = () => (prev ? prev() : "") + `\nNGUYÊN TẮC PHÒNG THỦ KHÁCH HÀNG (luôn áp dụng khi đề xuất chiến lược, cạnh tranh, ngân sách): 1 khách trung thành ≈ 250 người tiềm năng; 30% khách tiềm năng là doanh số tương lai; khách mua lần 2 có 75% khả năng trung thành; 20% khách trung thành tạo 85% doanh thu định kỳ; tìm khách mới tốn gấp 7 lần chăm sóc khách cũ. Dữ liệu: ${LY.customers || 0} khách 2023–2026, ${LY.repeat || 0} khách mua lại. Luôn ưu tiên giữ khách cũ, chốt lần mua thứ 2, giới thiệu, trước khi chi cho khách mới.\nKHÁCH HÀNG: khach_hang (tiềm năng ${PR.length} doanh nghiệp có định vị; đã mua 2023–2026 ${B.total || 0} xe theo tỉnh, huyện; chiến dịch chăm sóc).`;
})();

/* ===== Chiến dịch MKT offline 2027 + kỹ năng Ben: đề xuất chiến dịch xả tồn, chăm sóc bán hàng theo đại lý ===== */
(function(){
"use strict";
const CV = window.__CV; if(!CV || !CV.MKT) return;
const {esc, fmtInt, fmt1} = CV, M = CV.MKT, LOYX = CV.loyalty || {}, sum = a => a.reduce((x, y) => x + (y || 0), 0);
const fold = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();
const DLN = i => (M.dealers[i] || "").split("–")[0].trim(), gm = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
const T = k => sum(M.plan.map(p => p[k])), today = new Date().toISOString().slice(0, 10);
const AS = Object.fromEntries((M.assume || []).map(([k, v]) => [k, v])), rate = (re, d) => { const k = Object.keys(AS).find(x => re.test(x)); return k ? +AS[k] : d; };
const RTD = rate(/khách → lái thử/i, .35), RCL = rate(/lái thử → chốt/i, .3);

const sec = document.createElement("section"); sec.className = "glass pad"; sec.id = "mktSec";
function render(){
  const pv = [...new Set(M.plan.map(p => p.province))];
  sec.innerHTML = `<div><h2>Chiến dịch MKT offline cả nước 2027</h2><p class="muted" style="margin:4px 0 0">Kết hợp xe tải hết niên hạn 2025 và ${fmtInt(M.prospects.length)} doanh nghiệp tiềm năng có định vị. Bật nút <b>Khách hàng</b> trên bản đồ: vuông vàng = lưu động, vuông hồng = hội thảo DN, chấm xanh = DN tiềm năng, chấm đỏ = khách nóng; bấm để mở Google Maps. Số liệu tính lại theo sheet "Giả định" của file ${esc(M.source)}.</p></div>
  <div class="stats num" style="margin-top:10px">${[[T("events"), "buổi lưu động"], [T("seminars"), "hội thảo khách DN"], [M.prospects.length, "DN tiềm năng (" + M.prospects.filter(p => p.hot).length + " nóng)"], [T("leads"), "khách tiềm năng thu được"], [T("testDrive"), "lái thử"], [T("sold"), "xe bán mới dự kiến"], [fmtInt(T("budget")) + " tr", "ngân sách"], [fmt1(T("budget") / (T("sold") || 1)) + " tr", "chi phí / xe bán"], [fmt1(T("revenue")) + " tỷ", "doanh thu dự kiến"]].map(([v, l]) => `<div class="stat"><div class="v">${typeof v === "number" ? fmtInt(v) : v}</div><div class="l">${l}</div></div>`).join("")}</div>
  <div class="hudgrid" style="margin-top:12px">
   <div class="hp w12"><h3>Lộ trình và nguyên tắc</h3><ol class="actions small">${M.phases.map(x => `<li>${esc(x)}</li>`).join("")}</ol><ul class="small">${M.principles.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
   <div class="hp w12"><h3>Kế hoạch 34 tỉnh <span>hạng ưu tiên, buổi, khách, xe bán, ngân sách</span></h3><div style="overflow-x:auto"><table class="tasktbl small"><thead><tr><th>#</th><th>Tỉnh</th><th>Ưu tiên</th><th class="num">Xe hết NH 2025</th><th class="num">DN tiềm năng</th><th class="num">Lưu động</th><th class="num">Hội thảo</th><th class="num">Khách</th><th class="num">Lái thử</th><th class="num">Xe bán</th><th class="num">Ngân sách (tr)</th><th class="num">Chi phí/xe (tr)</th><th>Tháng vàng</th><th>Đại lý phụ trách</th></tr></thead><tbody>
    ${M.plan.map(p => `<tr><td>${p.rank}</td><td><b>${esc(p.province)}</b></td><td>${p.priority}</td><td class="num">${fmtInt(p.eol)}</td><td class="num">${fmtInt(p.dn)}</td><td class="num">${p.events}</td><td class="num">${p.seminars}</td><td class="num">${fmtInt(p.leads)}</td><td class="num">${fmtInt(p.testDrive)}</td><td class="num"><b>${fmtInt(p.sold)}</b></td><td class="num">${fmtInt(p.budget)}</td><td class="num">${p.costPerCar == null ? "—" : fmt1(p.costPerCar)}</td><td class="tiny">${esc(p.peak)}</td><td class="tiny">${esc(DLN(p.dealer))}</td></tr>`).join("")}</tbody></table></div></div>
   <div class="hp w12"><h3>Lịch sự kiện <span>thứ Bảy, theo tỉnh</span></h3><label class="field">Tỉnh <select id="mkProvE"><option value="">Tất cả (${M.events.length})</option>${pv.map(p => `<option>${esc(p)}</option>`).join("")}</select></label><div id="mkEv" style="max-height:360px;overflow:auto;margin-top:6px"></div></div>
   <div class="hp w12"><h3>Doanh nghiệp tiềm năng của chiến dịch <span>khách nóng trước</span></h3><label class="field">Tỉnh <select id="mkProvP"><option value="">Tất cả (${M.prospects.length})</option>${pv.map(p => `<option>${esc(p)}</option>`).join("")}</select></label><div id="mkPr" style="max-height:420px;overflow:auto;margin-top:6px"></div></div>
   <div class="hp w12"><h3>Playbook chiến dịch</h3><table class="tasktbl small"><thead><tr>${(M.playbook[0] || []).map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${M.playbook.slice(1).map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
  </div>`;
  const e1 = sec.querySelector("#mkProvE"), e2 = sec.querySelector("#mkProvP");
  const de = () => sec.querySelector("#mkEv").innerHTML = `<table class="tasktbl small"><thead><tr><th>Ngày</th><th>Giai đoạn</th><th>Tỉnh</th><th>Hoạt động</th><th>Địa điểm</th><th class="num">KPI</th><th>Đại lý</th><th>Trạng thái</th></tr></thead><tbody>${M.events.filter(x => !e1.value || x.province === e1.value).map(x => `<tr><td>${esc(x.date.split("-").reverse().join("/"))}</td><td class="tiny">${esc(x.phase)}</td><td>${esc(x.province)}</td><td>${x.type === "seminar" ? "Hội thảo DN" : "Lưu động"}</td><td class="tiny">${x.lat != null ? `<a href="${x.map || gm(x.lat, x.lng)}" target="_blank" rel="noopener">${esc(x.place.slice(0, 90))}</a>` : esc(x.place.slice(0, 90))}</td><td class="num">${x.kpi}</td><td class="tiny">${esc(DLN(x.dealer))}</td><td>${esc(x.status)}</td></tr>`).join("")}</tbody></table>`;
  const dp = () => sec.querySelector("#mkPr").innerHTML = `<table class="tasktbl small"><thead><tr><th>Doanh nghiệp</th><th>Ngành</th><th>Phân khúc ĐT</th><th>Địa chỉ</th><th>SĐT công khai</th><th>Mời</th><th>Đại lý</th><th>Trạng thái</th></tr></thead><tbody>${M.prospects.filter(x => !e2.value || x.province === e2.value).sort((a, b) => b.hot - a.hot).slice(0, 400).map(x => `<tr><td>${x.hot ? '<b style="color:#ff6b6b">NÓNG</b> ' : ""}${x.lat != null ? `<a href="${gm(x.lat, x.lng)}" target="_blank" rel="noopener">${esc(x.name)}</a>` : esc(x.name)}</td><td class="tiny">${esc(x.ind)}</td><td class="tiny">${esc(x.seg)}</td><td class="tiny">${esc(x.addr || x.area)}</td><td>${esc(x.phone)}</td><td class="tiny">${esc(x.invite)}</td><td class="tiny">${esc(DLN(x.dealer))}</td><td>${esc(x.status)}</td></tr>`).join("")}</tbody></table>${e2.value ? "" : '<p class="note">Hiện 400 DN đầu; chọn tỉnh để xem đủ.</p>'}`;
  e1.addEventListener("change", de); e2.addEventListener("change", dp); de(); dp();
}
render();
const anchor = document.getElementById("custSec"); if(anchor) anchor.after(sec);

/* ---------- Ben: chiến dịch MKT theo tỉnh ---------- */
function mdMkt(q){
  const P = q ? M.plan.find(p => fold(p.province).includes(fold(q).replace(/^(tp\.?|tinh|thanh pho)\s*/, ""))) : null;
  if(q && !P) throw new Error("Không thấy tỉnh " + q);
  if(!P) return `# Chiến dịch MKT offline 2027\n- ${T("events")} buổi lưu động, ${T("seminars")} hội thảo DN; ${M.prospects.length} DN tiềm năng (${M.prospects.filter(p => p.hot).length} nóng); dự kiến ${fmtInt(T("leads"))} khách, ${fmtInt(T("testDrive"))} lái thử, **${fmtInt(T("sold"))} xe**; ngân sách ${fmtInt(T("budget"))} triệu (${fmt1(T("budget") / T("sold"))} tr/xe), doanh thu ~${fmt1(T("revenue"))} tỷ.\n\n| Tỉnh | Ưu tiên | Xe hết NH | DN | Buổi | Xe bán | Ngân sách (tr) |\n|---|---|---|---|---|---|---|\n` + M.plan.slice(0, 15).map(p => `| ${p.province} | ${p.priority} | ${p.eol} | ${p.dn} | ${p.events}+${p.seminars} | ${p.sold} | ${p.budget} |`).join("\n") + `\n\n## Lộ trình\n${M.phases.map(x => "- " + x).join("\n")}`;
  const ev = M.events.filter(e => e.province === P.province), pr = M.prospects.filter(x => x.province === P.province);
  return `# Chiến dịch MKT 2027: ${P.province} (ưu tiên ${P.priority})\n- ${P.eol} xe tải hết niên hạn 2025, ${P.dn} DN tiềm năng (${pr.filter(x => x.hot).length} nóng); ${P.events} buổi lưu động + ${P.seminars} hội thảo/quý → ${P.leads} khách, ${P.testDrive} lái thử, **${P.sold} xe**; ngân sách ${fmtInt(P.budget)} tr (${P.costPerCar == null ? "—" : fmt1(P.costPerCar)} tr/xe).\n- Tháng vàng: ${P.peak}. Thông điệp: ${P.message}\n- Đại lý: ${M.dealers[P.dealer]}\n\n## Lịch\n${ev.map(e => `- ${e.date.split("-").reverse().join("/")}: ${e.type === "seminar" ? "Hội thảo DN" : "Lưu động"} tại [${e.place.slice(0, 80)}](${e.map || gm(e.lat, e.lng)}), KPI ${e.kpi} khách`).join("\n")}\n\n## DN tiềm năng tiêu biểu\n${pr.sort((a, b) => b.hot - a.hot).slice(0, 15).map(x => `- ${x.hot ? "**NÓNG** " : ""}[${x.name}](${x.lat != null ? gm(x.lat, x.lng) : "#"}) · ${x.ind} · ${x.seg}${x.phone ? " · " + x.phone : ""}`).join("\n")}`;
}
CV.tools.push({name: "chien_dich_mkt", label: "Đang đọc chiến dịch MKT 2027…", description: "Chiến dịch marketing offline cả nước 2027: kế hoạch 34 tỉnh (buổi lưu động, hội thảo DN, khách, lái thử, xe bán, ngân sách), lịch sự kiện có định vị, doanh nghiệp tiềm năng (khách nóng) theo tỉnh. tinh = một tỉnh, bỏ trống = toàn quốc.", inputSchema: {type: "object", properties: {tinh: {type: "string"}}}, execute: ({tinh}) => mdMkt(tinh)});

/* ---------- Ben: đề xuất chiến dịch xả tồn + chăm sóc bán hàng theo đại lý ---------- */
function dealerPlan(d){
  const NET = (CV.NET || {}).dealers || [], nd = NET.find(x => x.salesKey === d.name || x.salesKey === d.link || fold(x.name).includes(fold(d.name))) || {}, prov = nd.province || "";
  const key = fold(d.name).replace(/^(dt|o to)\s+/, "");
  const mp = M.prospects.filter(x => fold(DLN(x.dealer)).includes(key) || (!x.dealer && x.province === prov)), mpP = mp.length ? mp : M.prospects.filter(x => x.province === prov);
  const ev = M.events.filter(e => fold(DLN(e.dealer)).includes(key) && e.date >= today), evP = ev.length ? ev : M.events.filter(e => e.province === prov && e.date >= today);
  const L = (LOYX.LY && LOYX.LY.byProv[prov]) || null, old = d.age ? (d.age["181-365"] || 0) + (d.age[">365"] || 0) : 0, mid = d.age ? d.age["91-180"] || 0 : 0;
  const top = Object.entries(d.models || {}).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const leads = mpP.length + evP.reduce((a, e) => a + (e.kpi || 0), 0), sold = Math.round(leads * RTD * RCL), need = Math.max(0, d.ton - Math.round((d.leT11 || 0) / 21 * 30 * 2));
  return {d, prov, mp: mpP, ev: evP, L, old, mid, top, leads, sold, need, cover: d.cover};
}
function mdDealerPlan(q){
  const I = CV.inv; if(!I) return "Chưa có dữ liệu tồn đại lý.";
  if(!q){ const rows = I.dealers.filter(d => d.ton > 0).map(dealerPlan).sort((a, b) => (b.cover || 0) - (a.cover || 0));
    return `# Đề xuất chiến dịch xả tồn và chăm sóc bán hàng theo đại lý\n_Tồn đại lý ${I.asOf.split("-").reverse().join("/")}; khách mới từ chiến dịch MKT 2027; nguyên tắc phòng thủ khách hàng DAC._\n\n| Đại lý | Tồn | Tháng bán | Tồn > 180 ngày | Cần xả (> 2 tháng bán) | Khách mới chiến dịch | Xe bán dự kiến từ chiến dịch | Khách mua lại tại tỉnh |\n|---|---|---|---|---|---|---|---|\n` +
      rows.map(x => `| ${x.d.name} | ${x.d.ton} | ${x.cover == null ? "—" : fmt1(x.cover)} | ${x.old} | ${x.need} | ${x.leads} | ${x.sold} | ${x.L ? x.L.repeat : 0} |`).join("\n") + `\n\nHỏi "đề xuất chiến dịch cho <tên đại lý>" để có kế hoạch chi tiết.`; }
  const d = I.dealers.find(x => fold(x.name).includes(fold(q)) || fold(q).includes(fold(x.name))); if(!d) throw new Error("Không thấy đại lý " + q);
  const x = dealerPlan(d), msVol = x.top.map(([m, n]) => m + " " + n).join(", ");
  return `# Chiến dịch xả tồn và chăm sóc bán hàng: ${d.name}${x.prov ? " (" + x.prov + ")" : ""}\n\n## 1. Hiện trạng\n- Tồn **${d.ton} xe** ≈ ${x.cover == null ? "—" : fmt1(x.cover)} tháng bán (bán lẻ T11 đến ${I.asOf.split("-").reverse().slice(0, 2).join("/")}: ${d.leT11 || 0} xe); tồn > 180 ngày **${x.old} xe**, 91–180 ngày ${x.mid} xe. Model tồn nhiều: ${msVol}.\n- Cần xả khoảng **${x.need} xe** để về mức 2 tháng bán.\n\n## 2. Xả tồn (30–45 ngày)\n- Nhóm > 180 ngày (${x.old} xe): giảm trực tiếp + thưởng nóng TVBH 3–5 triệu/xe, ưu tiên khách doanh nghiệp, hạn chót cuối tháng.\n- Nhóm 91–180 ngày (${x.mid} xe): tặng bảo dưỡng/bảo hiểm, trả góp trả trước thấp; điều chuyển bớt sang đại lý bán nhanh nếu sau 30 ngày chưa giảm.\n- Dừng nhận sell-in model đang tồn > 3 tháng bán (${x.top.slice(0, 2).map(t => t[0]).join(", ")}).\n\n## 3. Khách mới từ chiến dịch MKT 2027\n- ${x.mp.length} doanh nghiệp tiềm năng giao về đại lý/tỉnh (${x.mp.filter(p => p.hot).length} khách nóng); ${x.ev.length} sự kiện sắp tới${x.ev[0] ? ", gần nhất " + x.ev[0].date.split("-").reverse().join("/") + " (" + (x.ev[0].type === "seminar" ? "hội thảo DN" : "lưu động") + ")" : ""}.\n- Dự kiến ~${x.leads} khách → ${Math.round(x.leads * RTD)} lái thử (${Math.round(RTD * 100)}%) → **~${x.sold} xe** (${Math.round(RCL * 100)}% chốt). Mang xe tồn lâu ra trưng bày tại các buổi lưu động để xả tồn đúng đối tượng.\n- DN ưu tiên gọi: ${x.mp.sort((a, b) => b.hot - a.hot).slice(0, 8).map(p => p.name + (p.phone ? " (" + p.phone + ")" : "")).join("; ") || "chưa có trong danh sách"}.\n\n## 4. Chăm sóc khách cũ (phòng thủ trước)\n${x.L ? `- Tại ${x.prov}: ${x.L.customers} khách đã mua 2023–2026, ${x.L.repeat} khách mua lại → ~${Math.round(x.L.repeat * .75)} khách trung thành, mỗi người mở ~250 người tiềm năng.` : "- Chưa có dữ liệu khách cũ của tỉnh."}\n- Chăm sóc khách cũ rẻ hơn tìm khách mới 7 lần: gọi toàn bộ khách 2023–2024 (bảo dưỡng, đổi xe), ưu đãi lần mua thứ 2 (75% thành khách trung thành), thưởng giới thiệu cho 20% khách trung thành (tạo 85% doanh thu định kỳ).\n\n## 5. KPI theo dõi hằng tuần\n- Xe tồn > 180 ngày giảm về 0; tồn về ≤ 2 tháng bán.\n- Khách mới để lại thông tin, lái thử, cọc, giao xe theo sheet "Theo dõi tuần"; chi phí/xe bán ≤ mức kế hoạch tỉnh.`;
}
CV.tools.push({name: "de_xuat_chien_dich", label: "Đang lập chiến dịch cho đại lý…", description: "Kỹ năng đề xuất chiến dịch giải quyết tồn kho và chăm sóc bán hàng cho từng đại lý Đô Thành: tồn, tuổi tồn, model tồn, số xe cần xả; khách mới từ chiến dịch MKT 2027 giao về đại lý (DN tiềm năng, khách nóng, sự kiện), dự kiến xe bán; chăm sóc khách cũ theo nguyên tắc phòng thủ. dai_ly = tên đại lý, bỏ trống = bảng toàn hệ thống.", inputSchema: {type: "object", properties: {dai_ly: {type: "string"}}}, execute: ({dai_ly}) => mdDealerPlan(dai_ly)});
CV.localHooks.unshift(raw => { const m = raw.trim().match(/(?:đề xuất|lập)\s+chiến dịch(?:\s+(?:xả tồn|chăm sóc|bán hàng))*(?:\s+(?:cho|tại|của))?\s*(.*?)\??$/i); if(m) return mdDealerPlan(m[1] && m[1].length > 2 ? m[1] : ""); const k = raw.match(/chiến dịch mkt(?:\s+(?:tại|ở))?\s*(.*?)\??$/i); return k ? mdMkt(k[1] || "") : null; });
const prev = CV.ctx; CV.ctx = () => (prev ? prev() : "") + `\nKỸ NĂNG ĐỀ XUẤT CHIẾN DỊCH: khi hỏi về tồn kho đại lý, xả tồn, chăm sóc bán hàng, chiến dịch cho đại lý thì dùng de_xuat_chien_dich (kết hợp tồn, tuổi tồn, khách mới từ chiến dịch MKT 2027, khách cũ, nguyên tắc phòng thủ); chiến dịch MKT theo tỉnh dùng chien_dich_mkt.`;
})();
