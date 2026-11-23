/* ===== Thị trường xe tải 2026: phân khúc, thương hiệu, đăng ký thực T10/2026 theo tỉnh, đối đầu theo ĐÚNG mã mẫu xe ===== */
(function(){
"use strict";
const CV = window.__CV; if(!CV) return;
const {esc, fmtInt, fmt1} = CV;
const M = /*__MARKET__*/null; if(!M) return;
const D = M.dkm, SEGS = ["Van", "Small Trucks I", "Small Trucks II", "Light Trucks I", "Light Trucks II", "Medium Trucks I", "Medium Trucks II", "Heavy Trucks"];
const VN = {"Van": "Van (MISSU V56/V65)", "Small Trucks I": "Tải nhỏ I (MISSU T26/T33L)", "Small Trucks II": "Tải nhỏ II (IZ45S–IZ60SL)", "Light Trucks I": "Tải nhẹ I (IZ62M–IZ71SL)",
  "Light Trucks II": "Tải nhẹ II (JP120)", "Medium Trucks I": "Tải trung I", "Medium Trucks II": "Tải trung II", "Heavy Trucks": "Tải nặng", "Van điện": "Van điện", "Trung & nặng": "Tải trung & nặng, đầu kéo"};
const promo = s => (s || "").replace(/([a-zđ0-9đ%)])([A-ZĐ])/g, "$1 · $2").replace(/\s*-\s+/g, " · ").replace(/^ · /, "").replace(/No Promotion/i, "Không có CTKM").replace(/1 year insurance/gi, "1 năm bảo hiểm").replace(/\bLoan\b/g, "Hỗ trợ vay").replace(/Discount/g, "Giảm giá").replace(/Petrol voucher/gi, "Phiếu nhiên liệu").replace(/(\d)mil\b/g, "$1 tr");
const DTN = b => /^DOTHANH$/i.test(b) ? "Đô Thành" : b, isDT = b => /DOTHANH|Đô Thành/i.test(b);
const pr = v => v ? fmtInt(v / 1e6) + " tr" : "—", pct = (a, b) => b ? fmt1(a / b * 100) + "%" : "—";
const N = M.national, NT = N["Grand Total"];
const ADDR = ["Van", "Small Trucks I", "Small Trucks II", "Light Trucks I", "Light Trucks II"], addrOf = x => ADDR.reduce((a, s) => a + ((x.seg || {})[s] || 0), 0), dtAddrOf = x => ADDR.reduce((a, s) => a + ((x.segDt || {})[s] || 0), 0);
const RS = M.regionShare, dacIZ = (RS["IZ (Small II + Light I + Light II)"] || {}).Total || {}, dacMS = (RS["Small Trucks I + Van (MISSU)"] || {}).Total || {};
const HV = M.dtHeavy || null;
const DAC10 = {dac: (dacIZ.dac10m26 || 0) + (dacMS.dac10m26 || 0), mkt: (dacIZ.tt10m26 || 0) + (dacMS.tt10m26 || 0)};
const share = s => { const r = (M.regionShare[s] || {}).Total; return r ? r.share10m26 : null; };
/* gộp bảng thương hiệu theo phân khúc (báo cáo chia nhóm con: dòng tiêu đề nhóm như "4m3", "5m2" không phải thương hiệu) */
const brandsOf = s => { const g = {}; (M.brandsBySeg[s] || []).forEach(b => { if(/^\d|^other$/i.test(b.brand) && /m\d|^\d/.test(b.brand)) return; const k = b.brand.toUpperCase() === "OTHER" ? "Khác" : b.brand; g[k] = (g[k] || 0) + (b.m10_2026 || 0); });
  const tot = (N[s] || {}).m10_2026 || Object.values(g).reduce((a, b) => a + b, 0); return Object.entries(g).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).map(([b, v]) => [b, v, v / tot * 100]); };
const spark = a => { const mx = Math.max(...a, 1); return `<svg viewBox="0 0 100 24" width="100" height="24" aria-hidden="true"><polyline fill="none" stroke="currentColor" stroke-width="1.6" points="${a.map((v, i) => `${i * 100 / (a.length - 1)},${22 - v / mx * 20}`).join(" ")}"/></svg>`; };

function matchCard(m){
  const dts = m.rows.filter(r => isDT(r.brand)), gap = !dts.length;
  return `<div class="hp w6"><h3>${esc(VN[m.seg] || m.seg)} · ${gap ? '<span class="pill warn">' + esc(m.title || "Đô Thành chưa có mẫu") + "</span>" : dts.map(r => "<b>" + esc(r.model) + "</b>").join(" + ")} <span>${esc(m.src)}</span></h3>
  <div style="overflow-x:auto"><table class="tasktbl small"><thead><tr><th>Hãng</th><th>Mẫu xe (mã)</th><th class="num">Tải (kg)</th><th class="num">Giá lẻ</th><th class="num">Giá XHĐ</th><th class="num">TB/tháng 2026</th><th class="num">ĐK T10/2026</th><th>Khuyến mại</th></tr></thead><tbody>
  ${m.rows.map(r => `<tr${isDT(r.brand) ? ' style="background:rgba(22,160,189,.12)"' : ""}><td>${esc(DTN(r.brand))}</td><td><b>${esc(r.model)}</b></td><td class="num">${r.payload ? fmtInt(r.payload) : "—"}</td><td class="num">${pr(r.retail)}</td><td class="num">${pr(r.xhd)}</td><td class="num">${r.avg26 != null ? fmt1(r.avg26) : "—"}</td>
    <td class="num" title="${esc(r.match)}">${r.dkmT10 != null ? fmtInt(r.dkmT10) : "—"}${r.match !== "đúng mẫu" ? ' <span class="tiny muted">*</span>' : ""}</td><td class="tiny">${esc(promo(r.promo).slice(0, 160))}</td></tr>`).join("")}</tbody></table></div>
  ${m.rows.some(r => r.match !== "đúng mẫu") ? `<p class="note">* ${[...new Set(m.rows.filter(r => r.match !== "đúng mẫu").map(r => r.brand + ": " + r.match))].map(esc).join("; ")} (file DKM ghi số loại chung cho cả dòng, không tách được từng mẫu).</p>` : ""}</div>`;
}

const sec = document.createElement("section"); sec.className = "glass pad"; sec.id = "marketSec";
function provBlock(p){
  const x = D.byProv[p]; if(!x) return `<p class="muted">Chưa có số đăng ký T10/2026 của ${esc(p)}.</p>`;
  const br = Object.entries(x.brands).sort((a, b) => b[1] - a[1]);
  return `<div class="stats num"><div class="stat"><div class="v">${fmtInt(x.total)}</div><div class="l">xe tải ĐK mới T10/2026</div></div><div class="stat"><div class="v">${fmtInt(x.dt)}</div><div class="l">Đô Thành: ${pct(dtAddrOf(x), addrOf(x))} phân khúc có sản phẩm (${fmtInt(addrOf(x))} xe); ${pct(x.dt, x.total)} toàn bộ xe tải</div></div>
    <div class="stat"><div class="v">${pct(x.total, D.total)}</div><div class="l">tỷ trọng cả nước</div></div><div class="stat"><div class="v">${pct(x.org["tổ chức"] || 0, x.total)}</div><div class="l">chủ xe là tổ chức</div></div></div>
   <div class="hudgrid" style="margin-top:8px"><div class="hp w6"><h3>Thương hiệu <span>xe, T10/2026</span></h3><table class="tasktbl small"><tbody>${br.slice(0, 14).map(([b, v]) => `<tr${isDT(b) ? ' style="background:rgba(22,160,189,.12)"' : ""}><td>${esc(DTN(b))}</td><td class="num">${fmtInt(v)}</td><td class="num">${pct(v, x.total)}</td></tr>`).join("")}</tbody></table></div>
   <div class="hp w6"><h3>Phân khúc <span>Đô Thành / thị trường tỉnh</span></h3><table class="tasktbl small"><tbody>${Object.entries(x.seg).sort((a, b) => b[1] - a[1]).map(([s, v]) => `<tr><td>${esc(VN[s] || s)}</td><td class="num">${fmtInt(x.segDt[s] || 0)} / ${fmtInt(v)}</td><td class="num">${pct(x.segDt[s] || 0, v)}</td></tr>`).join("")}</tbody></table>
   <p class="note">Loại thùng: ${Object.entries(x.body).slice(0, 6).map(([b, v]) => esc(b) + " " + v).join(", ")}.</p></div></div>`;
}
function render(){
  const provs = Object.keys(D.byProv).sort((a, b) => D.byProv[b].total - D.byProv[a].total);
  sec.innerHTML = `<div><h2>Thị trường xe tải 2026 theo mẫu xe</h2><p class="muted" style="margin:4px 0 0">Số 10 tháng 2026 theo báo cáo thị trường DAC tháng 10/2026 (IZ, KAMA); đăng ký thực từng xe tháng 10/2026 theo tỉnh (file DKM). Đối đầu so <b>đúng mã mẫu xe</b> hai bên: tải trọng, giá, khuyến mại, số đăng ký.</p></div>
  <div class="stats num" style="margin-top:10px"><div class="stat"><div class="v">${fmtInt(NT.m10_2026)}</div><div class="l">xe tải 10T/2026 (+${fmtInt(NT.g10)}% so 10T/2025)</div></div>
   <div class="stat"><div class="v">${fmtInt(NT.oct26)}</div><div class="l">tháng 10/2026 (${NT.gOct > 0 ? "+" : ""}${fmtInt(NT.gOct)}% so T10/2025)</div></div>
   <div class="stat"><div class="v">${fmtInt(M.annual2026)}</div><div class="l">quy năm 2026 (ước)</div></div>
   ${HV ? `<div class="stat"><div class="v">${HV.n} xe</div><div class="l">${esc(HV.model)} ${esc(HV.period)} (${esc(HV.dealer)}): ${pct(HV.n, HV.tractorT10)} đầu kéo cả nước, ${pct(HV.n, HV.tractorT10hcm)} TP.HCM</div></div>` : ""}
   <div class="stat"><div class="v">${pct(DAC10.dac, DAC10.mkt)}</div><div class="l">thị phần Đô Thành 10T/2026 trong phân khúc chủ lực (${fmtInt(DAC10.dac)}/${fmtInt(DAC10.mkt)} xe; IZ ${fmt1(dacIZ.share10m26)}%, MISSU ${fmt1(dacMS.share10m26)}%)</div></div><div class="stat"><div class="v">${fmtInt(D.total)}</div><div class="l">xe tải ĐK thực T10/2026 (file DKM), Đô Thành ${fmtInt(D.byProv ? Object.values(D.byProv).reduce((a, x) => a + x.dt, 0) : 0)}</div></div></div>
  <div class="hudgrid" style="margin-top:12px">
   <div class="hp w12"><h3>Phân khúc cả nước <span>xe; thị phần DAC 10T/2026</span></h3><div style="overflow-x:auto"><table class="tasktbl small"><thead><tr><th>Phân khúc</th><th class="num">2025</th><th class="num">10T/2025</th><th class="num">10T/2026</th><th class="num">±</th><th class="num">T10/2026</th><th>T1–T10/2026</th><th class="num">Thị phần DAC</th><th class="num">ĐK thực T10 (DKM): ĐT / tổng</th></tr></thead><tbody>
    ${SEGS.map(s => { const n = N[s] || {}, sh = share(s) ?? (s === "Van" || s === "Small Trucks I" ? null : null), dk = D.seg[s], dt = Object.values(D.byProv).reduce((a, x) => a + ((x.segDt || {})[s] || 0), 0);
      return `<tr><td><b>${esc(VN[s] || s)}</b></td><td class="num">${fmtInt(n.y2025)}</td><td class="num">${fmtInt(n.m10_2025)}</td><td class="num">${fmtInt(n.m10_2026)}</td><td class="num">${n.g10 > 0 ? "+" : ""}${fmtInt(n.g10)}%</td><td class="num">${fmtInt(n.oct26)}</td><td>${spark(M.monthly2026[s] || [])}</td><td class="num">${sh != null ? fmt1(sh) + "%" : "—"}</td><td class="num">${dk ? fmtInt(dt) + " / " + fmtInt(dk) : "—"}</td></tr>`; }).join("")}
    <tr><td><b>Tổng</b></td><td class="num">${fmtInt(NT.y2025)}</td><td class="num">${fmtInt(NT.m10_2025)}</td><td class="num"><b>${fmtInt(NT.m10_2026)}</b></td><td class="num">+${fmtInt(NT.g10)}%</td><td class="num">${fmtInt(NT.oct26)}</td><td>${spark(M.monthly2026["Grand Total"] || [])}</td><td></td><td class="num">${fmtInt(Object.values(D.byProv).reduce((a, x) => a + x.dt, 0))} / ${fmtInt(D.total)}</td></tr></tbody></table></div>
    <p class="note">Thị phần MISSU (Van + tải nhỏ I) 10T/2026: ${fmt1(((M.regionShare["Small Trucks I + Van (MISSU)"] || {}).Total || {}).share10m26 || 0)}%. File DKM tách thêm Van điện (VinFast EC Van) ${fmtInt(D.seg["Van điện"] || 0)} xe và tải trung, nặng, đầu kéo ${fmtInt(D.seg["Trung & nặng"] || 0)} xe${HV ? ` (Đô Thành ${HV.n} đầu kéo ${esc(HV.model.split(" (")[0])}, ${esc(HV.dealer)}; file DKM ghi nhãn hiệu DAEWOO nên tính riêng)` : ""}.</p></div>
   <div class="hp w12"><h3>Thị phần DAC theo vùng <span>10T/2026 so 10T/2025, tháng 10/2026</span></h3><div style="overflow-x:auto"><table class="tasktbl small"><thead><tr><th>Nhóm</th>${["Bắc", "Trung – Tây Nguyên", "Nam", "Tây", "Total"].map(v => `<th class="num">${v === "Total" ? "Cả nước" : v}</th>`).join("")}</tr></thead><tbody>
    ${Object.entries(M.regionShare).map(([k, v]) => `<tr><td>${esc(k)}</td>${["Bắc", "Trung – Tây Nguyên", "Nam", "Tây", "Total"].map(z => { const r = v[z]; if(!r) return "<td>—</td>"; const d = r.share10m26 - r.share10m25;
      return `<td class="num" title="DAC ${fmtInt(r.dac10m26)} / thị trường ${fmtInt(r.tt10m26)} xe; T10/2026: ${fmt1(r.shareOct26)}%"><b>${fmt1(r.share10m26)}%</b> <span class="tiny ${d >= 0 ? "good" : "bad"}">${d >= 0 ? "▲" : "▼"}${fmt1(Math.abs(d))}</span></td>`; }).join("")}</tr>`).join("")}</tbody></table></div></div>
   <div class="hp w12"><h3>Thương hiệu theo phân khúc <span>10T/2026, xe và % phân khúc</span></h3>${Object.keys(M.brandsBySeg).map(s => `<details class="lgdoc"><summary><b>${esc(VN[s] || s)}</b> · ${brandsOf(s).slice(0, 4).map(([b, v, p]) => esc(DTN(b)) + " " + fmt1(p) + "%").join(", ")}</summary><table class="tasktbl small"><tbody>${brandsOf(s).map(([b, v, p]) => `<tr${isDT(b) ? ' style="background:rgba(22,160,189,.12)"' : ""}><td>${esc(DTN(b))}</td><td class="num">${fmtInt(v)}</td><td class="num">${fmt1(p)}%</td></tr>`).join("")}</tbody></table></details>`).join("")}</div>
   <div class="hp w12"><h3>Đối đầu theo mẫu xe <span>Đô Thành vs đúng mã đối thủ cùng tải trọng</span></h3><p class="note">Nguồn: báo cáo DAC tháng 10/2026. Cột "ĐK T10/2026" đếm từ file DKM theo đúng số loại; dấu * là đếm theo cả dòng xe vì file đăng ký không tách mẫu.</p></div>
   ${M.matchups.map(matchCard).join("")}
   <div class="hp w12"><h3>Đăng ký thực T10/2026 theo tỉnh <span>file DKM</span></h3><label class="field">Tỉnh <select id="mkProv">${provs.map(p => `<option>${esc(p)}</option>`).join("")}</select></label><div id="mkProvBody" style="margin-top:8px"></div></div>
  </div>`;
  const sel = sec.querySelector("#mkProv"), body = sec.querySelector("#mkProvBody"); const show = () => body.innerHTML = provBlock(sel.value); sel.addEventListener("change", show); show();
}
render();
const anchor = document.getElementById("compSec") || document.querySelector("section.main"); anchor.parentElement.insertBefore(sec, anchor);
CV.market = M;

/* ---------- Ben ---------- */
const rowMd = r => `| ${DTN(r.brand)} | **${r.model}** | ${r.payload ? fmtInt(r.payload) : "—"} | ${pr(r.retail)} | ${pr(r.xhd)} | ${r.avg26 ?? "—"} | ${r.dkmT10 ?? "—"}${r.match !== "đúng mẫu" ? " (" + r.match + ")" : ""} | ${promo(r.promo).slice(0, 120)} |`;
function mdMatch(q){
  const ms = q ? M.matchups.filter(m => m.rows.some(r => (r.brand + " " + r.model).toLowerCase().includes(q.toLowerCase())) || (VN[m.seg] + m.seg).toLowerCase().includes(q.toLowerCase())) : M.matchups;
  if(!ms.length) throw new Error("Không thấy mẫu xe " + q);
  return `# Đối đầu theo mẫu xe (báo cáo DAC T10/2026, ĐK thực T10/2026)\n` + ms.map(m => `\n## ${VN[m.seg] || m.seg}: ${m.rows.filter(r => isDT(r.brand)).map(r => r.model).join(" + ") || (m.title || "Đô Thành chưa có mẫu")} (${m.src})\n| Hãng | Mẫu | Tải kg | Giá lẻ | Giá XHĐ | TB/tháng 2026 | ĐK T10 | Khuyến mại |\n|---|---|---|---|---|---|---|---|\n` + m.rows.map(rowMd).join("\n")).join("\n") +
    `\n\nGhi chú: THACO, FOTON trong file đăng ký chỉ ghi chung cả dòng (LINKER, TOWNER, AUMARK) nên số ĐK là của cả dòng.`;
}
function mdMarket(p){
  if(p){ const k = Object.keys(D.byProv).find(z => z.toLowerCase().includes(p.toLowerCase().replace(/^(tp\.?|tỉnh|thành phố)\s*/i, ""))); if(!k) throw new Error("Không thấy tỉnh " + p); const x = D.byProv[k];
    return `## Đăng ký mới xe tải T10/2026: ${k} (file DKM, số thực)\n- Tổng **${fmtInt(x.total)} xe** (${pct(x.total, D.total)} cả nước); Đô Thành **${fmtInt(x.dt)} xe**: ${pct(dtAddrOf(x), addrOf(x))} thị trường phân khúc có sản phẩm (${fmtInt(addrOf(x))} xe), ${pct(x.dt, x.total)} toàn bộ xe tải.\n- Thương hiệu: ${Object.entries(x.brands).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([b, v]) => DTN(b) + " " + v).join(", ")}.\n- Phân khúc (Đô Thành / tổng): ${Object.entries(x.seg).sort((a, b) => b[1] - a[1]).map(([s, v]) => (VN[s] || s) + " " + (x.segDt[s] || 0) + "/" + v).join("; ")}.\n- Chủ xe: ${Object.entries(x.org).map(([o, v]) => o + " " + v).join(", ")}. Thùng: ${Object.entries(x.body).slice(0, 6).map(([b, v]) => b + " " + v).join(", ")}.`; }
  return `# Thị trường xe tải 2026 (báo cáo DAC T10/2026)\n- Thị phần Đô Thành 10T/2026 trong phân khúc có sản phẩm (Van, tải nhỏ I–II, tải nhẹ I–II): **${pct(DAC10.dac, DAC10.mkt)}** (${fmtInt(DAC10.dac)}/${fmtInt(DAC10.mkt)} xe); IZ ${fmt1(dacIZ.share10m26)}% (10T/2025: ${fmt1(dacIZ.share10m25)}%), MISSU ${fmt1(dacMS.share10m26)}%. Tính trên toàn bộ xe tải chỉ ${pct(DAC10.dac, NT.m10_2026)} vì 43% thị trường là tải trung, nặng, đầu kéo, van điện, nơi Đô Thành chỉ có Daewoo nhập khẩu số lượng nhỏ.${HV ? `\n- Tải nặng, đầu kéo ${HV.period}: Đô Thành bán **${HV.n} ${HV.model}** (${HV.dealer}) = ${pct(HV.n, HV.tractorT10)} đầu kéo ĐK cả nước (${fmtInt(HV.tractorT10)} xe), ${pct(HV.n, HV.tractorT10hcm)} tại TP.HCM (${fmtInt(HV.tractorT10hcm)} xe). Toàn bộ xe tải T10: ${pct(D.byProv ? Object.values(D.byProv).reduce((a, x) => a + x.dt, 0) + HV.n : 0, D.total)}.` : ""}
- 10T/2026: **${fmtInt(NT.m10_2026)} xe** (+${NT.g10}% so 10T/2025); tháng 10: ${fmtInt(NT.oct26)} xe (${NT.gOct}%). Quy năm 2026 ≈ ${fmtInt(M.annual2026)} xe (ước). Năm 2025: ${fmtInt(NT.y2025)} xe.\n\n| Phân khúc | 10T/2025 | 10T/2026 | ± | T10/2026 | Thị phần DAC 10T/2026 | Top thương hiệu |\n|---|---|---|---|---|---|---|\n` +
    SEGS.map(s => { const n = N[s] || {}, sh = share(s); return `| ${VN[s] || s} | ${fmtInt(n.m10_2025)} | ${fmtInt(n.m10_2026)} | ${n.g10}% | ${fmtInt(n.oct26)} | ${sh != null ? fmt1(sh) + "%" : "—"} | ${M.brandsBySeg[s] ? brandsOf(s).slice(0, 4).map(([b, v, q]) => DTN(b) + " " + fmt1(q) + "%").join(", ") : ""} |`; }).join("\n") +
    `\n\n## Thị phần DAC theo vùng (10T/2026)\n` + Object.entries(M.regionShare).map(([k, v]) => `- ${k}: ` + Object.entries(v).map(([z, r]) => `${z === "Total" ? "cả nước" : z} ${fmt1(r.share10m26)}% (10T/2025 ${fmt1(r.share10m25)}%)`).join(", ")).join("\n") +
    `\n\n## Đăng ký thực tháng 10/2026 (file DKM): ${fmtInt(D.total)} xe tải\n- Top tỉnh: ${Object.entries(D.byProv).sort((a, b) => b[1].total - a[1].total).slice(0, 10).map(([k, x]) => k + " " + x.total + " (ĐT " + x.dt + ")").join(", ")}.\n- Mẫu Đô Thành: ${Object.entries(D.dtModels).map(([k, v]) => k + " " + v).join(", ")}.`;
}
CV.tools.push({name: "thi_truong_2026", label: "Đang đọc thị trường xe tải 2026…", description: "Thị trường xe tải 2026: số 10 tháng theo phân khúc, thương hiệu, thị phần DAC theo vùng (báo cáo DAC T10/2026); tinh = đăng ký thực tháng 10/2026 của một tỉnh (thương hiệu, phân khúc, Đô Thành).", inputSchema: {type: "object", properties: {tinh: {type: "string"}}}, execute: ({tinh}) => mdMarket(tinh)});
CV.tools.push({name: "doi_dau_mau_xe", label: "Đang so mẫu xe…", description: "So sánh mẫu xe Đô Thành với đúng mã mẫu xe đối thủ cùng tải trọng: tải trọng, giá lẻ, giá xuất hóa đơn, khuyến mại, bán TB/tháng 2026, số đăng ký T10/2026. mau = mã xe (IZ50S, T26, V65, JP120…) hoặc hãng/mẫu đối thủ, bỏ trống = tất cả.", inputSchema: {type: "object", properties: {mau: {type: "string"}}}, execute: ({mau}) => mdMatch(mau)});
CV.localHooks.unshift(raw => { const t = raw.trim(); if(/đối đầu|so (sánh )?(mẫu|xe)|đối thủ của (iz|missu|jp|v5|v6|t2|t3)/i.test(t)){ const m = t.match(/\b(IZ\d+\w*(-PLUS)?|JP120\w*|T26|T33L|V56|V65|K2\d0\w*|LINKER|TOWNER|H200|N\d{3}\w*)\b/i); return mdMatch(m ? m[0] : ""); }
  if(/thị trường (xe tải )?2026|đăng ký (mới )?(tháng|t)\s*10/i.test(t)) return mdMarket(""); return null; });

/* ---------- Đối thủ trên từng mặt trận (tỉnh): điểm bán, dịch vụ + link Google Maps, số ĐK T10, chính sách bán hàng, mẫu đối đầu ---------- */
let CP = null; try{ CP = JSON.parse(document.getElementById("comp-data").textContent); }catch(e){}
const BKEY = {thaco: "THACO", teraco: "TERACO", jac: "JAC", tmt: "TMT", foton: "FOTON", isuzu: "ISUZU", veam: "VEAM", kimlong: "KIM LONG"};
function front(p){
  const N = CV.CNET || {dealers: [], brands: {}}, ds = (N.dealers || []).filter(d => d.province === p), x = D.byProv[p] || {brands: {}};
  const keys = Object.keys(BKEY).filter(k => ds.some(d => d.b === k) || (x.brands[BKEY[k]] || 0) > 0).sort((a, b) => (x.brands[BKEY[b]] || 0) - (x.brands[BKEY[a]] || 0));
  return keys.map(k => { const dl = ds.filter(d => d.b === k), cb = (CP && CP.brands || []).find(b => b.k === k), reg = x.brands[BKEY[k]] || 0,
    mods = [...new Set(M.matchups.flatMap(m => m.rows.filter(r => r.brand.replace(/\s/g, "") === BKEY[k].replace(/\s/g, "")).map(r => r.model + (r.promo && !/không có|no promotion/i.test(r.promo) ? " (" + promo(r.promo).slice(0, 70) + ")" : ""))))];
    return {k, name: (N.brands[k] || {}).name || BKEY[k], reg, dl, total: (N.brands[k] || {}).total || "", policy: cb ? [cb.promoDoc, ...(cb.promoRules || [])].filter(Boolean) : [], mods}; });
}
CV.compFront = r => { const F = front(r.name); if(!F.length) return "";
  return `<details class="lgdoc" style="margin-top:8px"><summary><b>Đối thủ tại mặt trận ${esc(r.name)}</b> · ${F.slice(0, 4).map(f => esc(f.name) + " " + f.dl.length + " điểm").join(", ")}</summary>
  ${F.map(f => `<div style="margin:8px 0;padding-top:6px;border-top:1px solid rgba(170,215,255,.15)"><b>${esc(f.name)}</b> <span class="muted small">· ĐK T10/2026 tại tỉnh: <b>${fmtInt(f.reg)}</b> xe · ${f.dl.length} điểm bán/dịch vụ</span>
    ${f.dl.length ? `<ul class="small" style="margin:4px 0 4px 16px;padding:0">${f.dl.map(d => `<li><a href="${esc(d.map)}" target="_blank" rel="noopener" title="Mở Google Maps">${esc(d.name)}</a>${d.type ? ' <span class="pill">' + esc(d.type) + "</span>" : ""} · ${esc(d.addr)}${d.phone ? " · " + esc(d.phone) : ""}</li>`).join("")}</ul>` : '<p class="small muted">Chưa có điểm bán chính thức trong danh bạ; xe bán qua đại lý tỉnh lân cận.</p>'}
    ${f.policy.length ? `<p class="small" style="margin:2px 0"><b>Chính sách bán hàng:</b> ${f.policy.map(esc).join(" · ")}</p>` : ""}
    ${f.mods.length ? `<p class="small" style="margin:2px 0"><b>Mẫu đối đầu Đô Thành:</b> ${f.mods.slice(0, 8).map(esc).join(", ")}</p>` : ""}</div>`).join("")}
  <p class="note">Nguồn: Teraco theo daehan.vn (vị trí bản đồ chính thức); hãng khác theo danh bạ đại lý Oto360 2026 (link Google Maps tìm theo tên + địa chỉ); số ĐK: file DKM T10/2026; chính sách: bảng giá, thông báo khuyến mại hãng và báo cáo DAC T10/2026.</p></details>`; };
function mdFront(p){
  const k = Object.keys(D.byProv).find(z => z.toLowerCase().includes(p.toLowerCase().replace(/^(tp\.?|tỉnh|thành phố)\s*/i, ""))) || p, F = front(k);
  if(!F.length) throw new Error("Không thấy tỉnh " + p);
  return `# Đối thủ tại mặt trận ${k}\n_ĐK mới xe tải T10/2026 tại tỉnh: ${fmtInt((D.byProv[k] || {}).total || 0)} xe, Đô Thành ${fmtInt((D.byProv[k] || {}).dt || 0)}._\n` + F.map(f => `\n## ${f.name}: ${fmtInt(f.reg)} xe ĐK T10 · ${f.dl.length} điểm\n` + (f.dl.map(d => `- [${d.name}](${d.map})${d.type ? " (" + d.type + ")" : ""}: ${d.addr}${d.phone ? ", " + d.phone : ""}`).join("\n") || "- Chưa có điểm bán chính thức tại tỉnh.") +
    (f.policy.length ? `\n- **Chính sách:** ${f.policy.join("; ")}` : "") + (f.mods.length ? `\n- **Mẫu đối đầu Đô Thành:** ${f.mods.join(", ")}` : "")).join("\n") + `\n\nNguồn: [daehan.vn](https://daehan.vn/he-thong-dai-ly), [Oto360 đại lý](https://oto360.net/dai-ly-thaco), file DKM T10/2026, báo cáo DAC T10/2026.`;
}
CV.tools.push({name: "doi_thu_tai_tinh", label: "Đang rà đối thủ tại tỉnh…", description: "Mạng lưới đại lý, showroom, trạm dịch vụ của Thaco, Teraco, JAC, TMT, Foton, Isuzu, VEAM tại một tỉnh (địa chỉ, điện thoại, link Google Maps), số đăng ký T10/2026 của từng hãng tại tỉnh, chính sách bán hàng, khuyến mại và mẫu xe đối đầu với Đô Thành.", inputSchema: {type: "object", properties: {tinh: {type: "string"}}, required: ["tinh"]}, execute: ({tinh}) => mdFront(tinh || "")});
CV.localHooks.unshift(raw => { const t = raw.trim(), m = t.match(/(?:đối thủ|đại lý (?:thaco|teraco|jac|tmt|foton|isuzu)|showroom đối thủ)\s*(?:tại|ở)\s+(.+?)\??$/i); return m ? mdFront(m[1]) : null; });
const prev = CV.ctx; CV.ctx = () => (prev ? prev() : "") + `\nĐỐI THỦ THEO TỈNH: doi_thu_tai_tinh (điểm bán, dịch vụ, link Google Maps, chính sách, ĐK T10).\nTHỊ TRƯỜNG 2026: thi_truong_2026 (10T/2026 theo phân khúc, thương hiệu, thị phần DAC; tinh = ĐK thực T10/2026), doi_dau_mau_xe (so ĐÚNG mã mẫu xe hai bên, không so chung chung).`;
})();
