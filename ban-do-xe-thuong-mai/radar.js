/* ===== DAC Economic & Commercial Radar: 20 chỉ số quốc gia, điểm Radar 34 tỉnh, cảnh báo sớm ===== */
(function(){
"use strict";
const CV = window.__CV; if(!CV) return;
const {esc, fmtInt, fmt1} = CV;
const RD = /*__RADAR__*/null; if(!RD) return;
let PS = {}; try{ PS = JSON.parse(document.getElementById("ps-data").textContent); }catch(e){}
const SIG = {good: ["#4ee2a0", "Cơ hội"], neutral: ["#ffc35a", "Trung tính"], warn: ["#ff8a5a", "Cảnh báo"], bad: ["#ff5a6e", "Rủi ro"]};
const Q = {A: "A: nguồn chính thức", B: "B: tổ chức quốc tế, chuyên ngành, báo dẫn nguồn chính thức", C: "C: nguồn tổng hợp, thứ cấp", D: "D: ước tính"};
const srcA = k => { const s = RD.src[k]; return s ? `<a href="${esc(s[1])}" target="_blank" rel="noopener noreferrer">${esc(s[0])}</a>` : ""; };
const srcM = k => { const s = RD.src[k]; return s ? `[${s[0]}](${s[1]})` : ""; };

/* ---------- điểm Radar tỉnh (khung trọng số trong tài liệu Radar; chưa backtest) ---------- */
let cache = null;
function rows(){ return CV.rows; }
function nodesByProv(){ const o = {}; ((CV.INFRA || {}).nodes || []).forEach(n => { const pv = CV.provinceOfPoint ? CV.provinceOfPoint(n.lng, n.lat) : null; if(pv) (o[pv.name] = o[pv.name] || []).push(n.type); }); return o; }
function build(){
  const R = rows(), nodes = nodesByProv(), g = (o, k) => (o || {})[k];
  const F = {
    grdp: r => g(PS.grdp2025, r.name) ?? null, inc: r => (g(PS.income2025, r.name) || {}).v ?? null, pop: r => g(PS.pop2025, r.name) ?? r.pop, retail: r => g(PS.retail2025, r.name) ?? null,
    fdi: r => (g(PS.fdi10m26, r.name) || {}).v ?? 0, pinv: r => (g(PS.publicInv10m26, r.name) || {}).vnd ?? 0, g9: r => (g(PS.growth9m26, r.name) || {}).v ?? null,
    nodes: r => { const t = nodes[r.name] || []; return t.filter(x => x === "port").length * 3 + t.filter(x => x === "kcn").length * 2 + t.filter(x => x === "gate").length * 2 + t.filter(x => x === "air").length; },
    market: r => r._market ?? null, gpc: r => g(PS.gpc2025, r.name) ?? r._gpc, ind: r => r.econ ? r.econ[1] : null,
    rpc: r => { const v = g(PS.retail2025, r.name), p = g(PS.pop2025, r.name); return v && p ? v / p : null; }, car: r => CV.carEst ? CV.carEst(r).v : r.carReg2025 ?? null,
    share: r => r._market ? (r.sales || 0) / r._market : null, kpct: r => r.target ? r._kpct : null,
    cover: r => { const x = CV.boardAgg ? CV.boardAgg(r) : null; return x && x.inv ? (x.tx12 ? x.inv / (x.tx12 / 12) : 99) : null; }};
  const pct = {}; Object.entries(F).forEach(([k, f]) => { const v = R.map(r => [r.name, f(r)]).filter(x => x[1] != null && isFinite(x[1])), s = v.map(x => x[1]).sort((a, b) => a - b);
    pct[k] = Object.fromEntries(v.map(([n, x]) => [n, s.length > 1 ? s.filter(y => y < x).length / (s.length - 1) : 0.5])); });
  const P = (k, r, inv) => { const v = pct[k][r.name]; return v == null ? null : inv ? 1 - v : v; };
  const GR = {scale: r => [P("grdp", r), P("inc", r), P("pop", r), P("retail", r)], prod: r => [P("fdi", r), P("pinv", r), P("g9", r)], logi: r => [P("nodes", r), P("market", r)],
    fin: r => [P("inc", r), P("gpc", r)], sect: r => [P("ind", r), P("rpc", r), P("car", r)], dac: r => [P("share", r), P("kpct", r), P("cover", r, true)]};
  const out = {};
  R.forEach(r => { let tot = 0, wsum = 0, have = 0, all = 0; const parts = {};
    RD.weights.forEach(([k, , w]) => { const a = GR[k](r), v = a.filter(x => x != null); all += a.length; have += v.length; const sc = v.length ? v.reduce((x, y) => x + y, 0) / v.length : null; parts[k] = sc == null ? null : Math.round(sc * 100); if(sc != null){ tot += sc * w; wsum += w; } });
    out[r.name] = {score: wsum ? Math.round(tot / wsum * 100) : null, parts, full: Math.round(have / all * 100)}; });
  const ord = Object.entries(out).filter(x => x[1].score != null).sort((a, b) => b[1].score - a[1].score); ord.forEach(([n], i) => out[n].rank = i + 1);
  return out;
}
function score(r){ if(!cache) cache = build(); return cache[typeof r === "string" ? r : r.name]; }
const col = v => v == null ? "#8ea7c7" : v >= 60 ? SIG.good[0] : v >= 40 ? SIG.neutral[0] : SIG.bad[0];
CV.radarScore = r => { const s = score(r); return s ? s.score : null; }; CV.radar = score; CV.radarReset = () => { cache = null; };

/* ---------- cảnh báo sớm (cơ chế tác động trong tài liệu, mục 10 và 12) ---------- */
function alerts(){
  const I = Object.fromEntries(RD.ind.map(x => [x.id, x]));
  const out = [];
  out.push(["good", "CƠ HỘI – sản xuất mở rộng", `IIP 10 tháng ${I["06"].v}, PMI ${I["07"].v}, FDI ${I["09"].v} (+74%). Ưu tiên tỉnh FDI cao (TP.HCM, Thái Nguyên, Bắc Ninh, Hà Nội, Hải Phòng, Nghệ An, Phú Thọ, Tây Ninh): xe tải công nghiệp, tải trung; xác minh dự án, ngành hàng trước khi dồn xe.`, ["nsoX", "pmi"]]);
  out.push(["good", "CƠ HỘI – tiêu dùng, phân phối", `Bán lẻ 10 tháng ${I["05"].d.split(";")[0]}, vận tải hàng hóa đường bộ +16,5%: đẩy xe tải nhẹ, thùng kín, van MISSU cho phân phối nội đô và giao nhận.`, ["nsoX"]]);
  out.push(["neutral", "CƠ HỘI – đầu tư công quý IV", `Vốn NSNN mới giải ngân 69% kế hoạch, chi đầu tư phát triển 65,6% dự toán: 2 tháng cuối năm dồn giải ngân. Tỉnh có vốn lớn: Hà Nội, TP.HCM, Hưng Yên, Ninh Bình, Hải Phòng, Tây Ninh, Đồng Nai: xe ben, tải nặng, chuyên dụng.`, ["nsoX", "budget"]]);
  out.push(["warn", "CẢNH BÁO – chi phí vận tải", `CPI tháng 10 ${I["13"].d.split(";")[0]}, nhóm giao thông +15,57%: chủ xe bị ép biên. Chào bán theo TCO (tiêu hao nhiên liệu, phụ tùng), gói bảo dưỡng trọn gói.`, ["nsoX"]]);
  out.push(["good", "TÀI CHÍNH – lãi vay giảm", `Tín dụng +12,27% (mục tiêu ≈ 15%), lãi suất cho vay mới giảm 0,2–0,5 điểm, NHNN thanh tra việc giảm lãi suất: thời điểm đẩy gói trả góp 70–80%, liên kết ngân hàng.`, ["credit", "rate"]]);
  out.push(["warn", "RỦI RO – tỷ giá, ngoại tệ", `Nhập siêu 10 tháng 12,07 tỷ USD, cán cân thanh toán quý II chỉ +81 triệu USD, dự trữ ≈ 87,6 tỷ USD: rủi ro giá linh kiện CKD nhập khẩu; theo dõi giá vốn trước khi chốt giá bán 2027.`, ["nso10", "bop", "fx"]]);
  return out;
}

/* ---------- giao diện ---------- */
const sec = document.createElement("section"); sec.className = "glass pad"; sec.id = "radarSec";
function render(){
  cache = null; const R = rows().slice().sort((a, b) => (score(b).score || 0) - (score(a).score || 0));
  const card = x => `<div class="rdcard" title="${esc(x.dac)}"><div class="rdtop"><span class="rdid">${esc(x.id || "+")}</span><span class="rddot" style="background:${SIG[x.s][0]}" title="${SIG[x.s][1]}"></span><span class="rdq" title="${esc(Q[x.q])}">${x.q}</span></div>
    <div class="rdn">${esc(x.n)}</div><div class="rdv">${esc(x.v)}</div><div class="rdp">${esc(x.p)}</div><div class="rdd">${esc(x.d)}</div><div class="rds">${x.src.map(srcA).join(" · ")}</div></div>`;
  const groups = [...new Set(RD.ind.map(x => x.g))];
  sec.innerHTML = `<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-end"><div><h2>Radar kinh tế – tài chính DAC</h2><p class="muted" style="margin:4px 0 0">20 chỉ số quốc gia theo tài liệu “DAC Economic &amp; Commercial Radar”, số mới nhất kèm nguồn, mức tin cậy A–D và tín hiệu; điểm Radar 34 tỉnh; cảnh báo sớm. Trỏ chuột vào thẻ để xem ý nghĩa với DAC.</p></div>
    <div class="rdleg">${Object.values(SIG).map(([c, t]) => `<span><i style="background:${c}"></i>${t}</span>`).join("")}</div></div>
    ${groups.map(g => `<h4>${esc(g)}</h4><div class="rdgrid">${RD.ind.filter(x => x.g === g).map(card).join("")}</div>`).join("")}
    <h4>Chỉ báo vận tải, logistics bổ sung</h4><div class="rdgrid">${RD.extra.map(card).join("")}</div>
    <div class="hudgrid" style="margin-top:12px"><div class="hp w12"><h3>Cảnh báo sớm <span>cơ chế tác động tới doanh số DAC, cần kiểm chứng bằng đơn hàng, tồn kho</span></h3>
      <div class="rdalert">${alerts().map(([s, t, d, k]) => `<div style="border-left:3px solid ${SIG[s][0]}"><b style="color:${SIG[s][0]}">${esc(t)}</b><p class="small">${esc(d)}</p><p class="tiny muted">Nguồn: ${k.map(srcA).join(" · ")}</p></div>`).join("")}</div></div>
    <div class="hp w12"><h3>Điểm Radar 34 tỉnh <span>trọng số ${RD.weights.map(w => w[1] + " " + w[2] + "%").join(" · ")}; khung ban đầu, chưa backtest</span></h3>
      <div style="overflow-x:auto"><table class="tasktbl small rdtbl"><thead><tr><th>#</th><th>Tỉnh</th><th class="num">Điểm</th>${RD.weights.map(w => `<th title="${esc(w[3])}">${esc(w[1])}</th>`).join("")}<th class="num" title="Tỷ lệ chỉ số thành phần có số liệu">Đủ dữ liệu</th></tr></thead>
      <tbody>${R.map(r => { const s = score(r); return `<tr data-rdp="${esc(r.name)}" style="cursor:pointer"><td class="num">${s.rank || "—"}</td><td><b>${esc(r.name)}</b></td><td class="num"><b style="color:${col(s.score)}">${s.score ?? "—"}</b></td>${RD.weights.map(([k]) => `<td><span class="rdbar"><i style="width:${s.parts[k] || 0}%;background:${col(s.parts[k])}"></i></span> <span class="tiny">${s.parts[k] ?? "—"}</span></td>`).join("")}<td class="num">${s.full}%</td></tr>`; }).join("")}</tbody></table></div>
      <p class="note">Điểm = trung bình phân vị (0–100) của các chỉ số thành phần trong 34 tỉnh, nhân trọng số nhóm. FDI và vốn NSNN: tỉnh ngoài danh sách Cục Thống kê công bố (top 20 FDI, 21 tỉnh vốn NSNN) tính bằng 0, tức thấp hơn ngưỡng công bố. Không tự nội suy số thiếu; cột “Đủ dữ liệu” cho biết tỷ lệ có số. Nguồn tỉnh: Niên giám Thống kê 2025, biểu KT-XH tháng 10/2026, file bán hàng, tồn kho DAC.</p></div></div>`;
}
render();
const anchor = document.getElementById("hudSec") || document.querySelector("section.main"); anchor.parentElement.insertBefore(sec, anchor);
sec.addEventListener("click", e => { const t = e.target.closest("[data-rdp]"); if(t && CV.openBoard) CV.openBoard(t.dataset.rdp); });
CV.radarRender = render;

/* ---------- Ben ---------- */
function md(tinh){
  if(tinh){ const r = CV.findRow(tinh); if(!r) throw new Error("Không tìm thấy tỉnh " + tinh); const s = score(r);
    return `## Điểm Radar DAC: ${r.name}\n**${s.score}/100**, hạng ${s.rank}/34 (đủ dữ liệu ${s.full}%).\n\n| Nhóm | Trọng số | Điểm | Thành phần |\n|---|---|---|---|\n${RD.weights.map(([k, n, w, d]) => `| ${n} | ${w}% | ${s.parts[k] ?? "—"} | ${d} |`).join("\n")}\n\n_Khung trọng số theo tài liệu DAC Economic & Commercial Radar; chưa backtest với doanh số DAC._\n`; }
  const top = rows().slice().sort((a, b) => (score(b).score || 0) - (score(a).score || 0));
  return `# Radar kinh tế – tài chính DAC (cập nhật ${RD.updated})\n| # | Chỉ số | Giá trị | Kỳ | Diễn giải | Tín hiệu | Tin cậy | Nguồn |\n|---|---|---|---|---|---|---|---|\n${RD.ind.map(x => `| ${x.id} | ${x.n} | ${x.v} | ${x.p} | ${x.d} | ${SIG[x.s][1]} | ${x.q} | ${x.src.map(srcM).join("; ")} |`).join("\n")}\n\n**Bổ sung:** ${RD.extra.map(x => `${x.n} ${x.v} (${x.p}; ${x.d})`).join(" · ")}\n\n## Cảnh báo sớm\n${alerts().map(([s, t, d, k]) => `- **${t}:** ${d} _(nguồn: ${k.map(srcM).join("; ")})_`).join("\n")}\n\n## Top 10 tỉnh theo điểm Radar\n${top.slice(0, 10).map((r, i) => `${i + 1}. ${r.name}: ${score(r).score}`).join("\n")}\n\n_Số liệu chính thức là số quan sát; quan hệ với nhu cầu xe là giả thuyết, cần kiểm chứng bằng đơn hàng, bán ra, tồn kho DAC._\n`;
}
CV.tools.push({name: "radar_kinh_te", label: "Đang đọc Radar kinh tế…", description: "Radar kinh tế – tài chính DAC: 20 chỉ số quốc gia (GDP, GRDP, thu nhập, thất nghiệp, bán lẻ, IIP, PMI, đầu tư công, FDI, xuất nhập khẩu, cán cân thương mại, CPI, tỷ giá/lãi suất/tín dụng, thu chi ngân sách, nợ công, cán cân thanh toán, dự trữ ngoại hối, M2) kèm nguồn, tín hiệu; cảnh báo sớm; điểm Radar 34 tỉnh. tinh = điểm Radar chi tiết một tỉnh.", inputSchema: {type: "object", properties: {tinh: {type: "string"}}}, execute: ({tinh}) => md(tinh)});
CV.localHooks.unshift(raw => /radar|20 chỉ số|chỉ số vĩ mô|cảnh báo sớm/i.test(raw) ? md((raw.match(/(?:tỉnh|tại|của)\s+(.+)$/i) || [])[1] && CV.findRow(raw.match(/(?:tỉnh|tại|của)\s+(.+)$/i)[1]) ? raw.match(/(?:tỉnh|tại|của)\s+(.+)$/i)[1] : "") : null);
const prev = CV.ctx; CV.ctx = () => (prev ? prev() : "") + `\nRADAR KINH TẾ – TÀI CHÍNH: dùng radar_kinh_te cho 20 chỉ số quốc gia (số tháng 10/2026, Cục Thống kê, NHNN, Bộ Tài chính), cảnh báo sớm và điểm Radar 34 tỉnh.`;
})();
