/* ===== Khách hàng: khách tiềm năng cần chăm sóc (định vị Google Maps) + khách đã mua 2023–2026 theo tỉnh, huyện (không tên, SĐT cá nhân, số khung) ===== */
(function(){
"use strict";
const CV = window.__CV; if(!CV || !CV.CUST) return;
const {esc, fmtInt, fmt1} = CV, C = CV.CUST, PR = C.prospects || [], B = C.buyers || {byProv: {}, districts: [], years: {}};
const YRS = Object.keys(B.years || {}).sort();
let EOL = {}, EOLB = {}; try{ const ps = JSON.parse(document.getElementById("ps-data").textContent); EOL = ps.eol2025 || {}; EOLB = ps.eolBrands2025 || {}; }catch(e){}
const gm = p => `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
const COL = s => /chốt/i.test(s) ? "#46e3ff" : /quan tâm|hẹn gặp|báo giá/i.test(s) ? "#3ddc84" : /không|sai số/i.test(s) ? "#8a96a8" : "#ffb020";
const norm = s => String(s || "").toLowerCase().replace(/^(tp\.?|tỉnh|thành phố)\s*/i, "").trim();
const findP = q => { if(!q) return null; const n = norm(q); return (CV.rows || []).map(r => r.name).find(x => norm(x) === n) || (CV.rows || []).map(r => r.name).find(x => norm(x).includes(n) || n.includes(norm(x))); };
const prosOf = p => PR.filter(x => x.province === p).sort((a, b) => (b.phone ? 1 : 0) - (a.phone ? 1 : 0));
const cnt = (a, f) => a.reduce((m, x) => (m[f(x)] = (m[f(x)] || 0) + 1, m), {});

function campaign(p){
  const b = B.byProv[p] || {n: 0, years: {}}, pr = prosOf(p), old = (b.years["2023"] || 0) + (b.years["2024"] || 0), ind = Object.entries(cnt(pr, x => x.ind)).sort((a, c) => c[1] - a[1]).slice(0, 2).map(x => x[0]);
  const out = [], eol = (EOL[p] || {}).truck;
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
   <div class="hp w12"><h3>Khách tiềm năng cần gọi <span>theo tỉnh, ưu tiên có số điện thoại</span></h3><label class="field">Tỉnh <select id="cuProv"><option value="">Tất cả (${PR.length})</option>${pOpts.map(p => `<option>${esc(p)}</option>`).join("")}</select></label><div id="cuList" style="margin-top:8px;max-height:420px;overflow:auto"></div></div>
   <div class="hp w12"><h3>Khách đã mua theo tỉnh <span>xe, 2023–2026</span></h3><div style="overflow-x:auto"><table class="tasktbl small"><thead><tr><th>Tỉnh</th>${YRS.map(y => `<th class="num">${y}</th>`).join("")}<th class="num">Tổng</th><th class="num">% doanh nghiệp</th><th>Mẫu chính</th><th>Huyện nhiều khách</th></tr></thead><tbody>
    ${provs.map(([p, b]) => `<tr><td><b>${esc(p)}</b></td>${YRS.map(y => `<td class="num">${fmtInt(b.years[y] || 0)}</td>`).join("")}<td class="num"><b>${fmtInt(b.n)}</b></td><td class="num">${fmtInt(b.org / b.n * 100)}%</td><td class="tiny">${Object.entries(b.models).slice(0, 3).map(([m, n]) => esc(m) + " " + n).join(", ")}</td><td class="tiny">${B.districts.filter(d => d.province === p && !/không ghi/.test(d.dist)).slice(0, 3).map(d => esc(d.dist) + " " + d.n).join(", ")}</td></tr>`).join("")}</tbody></table></div>
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
      `\n\n## Chiến dịch chăm sóc đề xuất\n${campaign(p).map((x, i) => `${i + 1}. ${x}`).join("\n")}`; }
  const top = Object.entries(B.byProv).sort((a, b) => b[1].n - a[1].n).slice(0, 10), pt = Object.entries(cnt(PR, x => x.province || "?")).sort((a, b) => b[1] - a[1]).slice(0, 10);
  return `# Khách hàng Đô Thành\n- Khách tiềm năng: **${PR.length} doanh nghiệp** (${PR.filter(x => x.phone).length} có SĐT); trạng thái: ${Object.entries(cnt(PR, x => x.status)).map(([s, n]) => s + " " + n).join(", ")}. Nhiều nhất: ${pt.map(([p, n]) => p + " " + n).join(", ")}.\n- Ngành: ${Object.entries(cnt(PR, x => x.ind)).sort((a, b) => b[1] - a[1]).map(([s, n]) => s + " " + n).join(", ")}.\n- Đã mua 2023–2026: **${fmtInt(B.total)} xe** (${YRS.map(y => y + ": " + B.years[y]).join(", ")}).\n\n| Tỉnh | ${YRS.join(" | ")} | Tổng | Tiềm năng |\n|---|${YRS.map(() => "---|").join("")}---|---|\n` +
    top.map(([p, b]) => `| ${p} | ${YRS.map(y => b.years[y] || 0).join(" | ")} | ${b.n} | ${prosOf(p).length} |`).join("\n") + `\n\nHỏi theo tỉnh để có danh sách gọi và chiến dịch chăm sóc.`;
}
CV.tools.push({name: "khach_hang", label: "Đang đọc dữ liệu khách hàng…", description: "Khách tiềm năng cần chăm sóc (doanh nghiệp, ngành, SĐT công khai, link Google Maps, trạng thái gọi) và khách đã mua xe Đô Thành 2023–2026 theo năm, tỉnh, huyện, mẫu xe; đề xuất chiến dịch chăm sóc. tinh = một tỉnh, bỏ trống = toàn quốc. Không có tên, SĐT khách cá nhân.", inputSchema: {type: "object", properties: {tinh: {type: "string"}}}, execute: ({tinh}) => md(tinh)});
CV.localHooks.unshift(raw => { const m = raw.trim().match(/khách (?:hàng )?(?:tiềm năng|đã mua|cũ)(?:\s+(?:tại|ở)\s+(.+?))?\??$/i); return m ? md(m[1] || "") : null; });
const prev = CV.ctx; CV.ctx = () => (prev ? prev() : "") + `\nKHÁCH HÀNG: khach_hang (tiềm năng ${PR.length} doanh nghiệp có định vị; đã mua 2023–2026 ${B.total || 0} xe theo tỉnh, huyện; chiến dịch chăm sóc).`;
})();
