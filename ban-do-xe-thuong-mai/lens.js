/* ===== Lớp dữ liệu nền ẩn + chẩn đoán "vì sao đối thủ bán được, Đô Thành không" ===== */
(function(){
"use strict";
const CV = window.__CV; if(!CV) return;
const {esc, fmtInt, fmt1, mdToHtml, toast} = CV;
const CPI_NAT = {avg: 4.57, oct: 5.09, core: 4.24, src: "Cục Thống kê, bình quân 10 tháng 2026 so với cùng kỳ"};
const SEG = ["Tải nhẹ < 3,5T","Tải trung 3,5–10T","Tải nặng > 10T","Đầu kéo","Xe khách / bus","Pickup / van"];
// Đô Thành portfolio strength by segment (0..1): MISSU/IZ strong in light, IZ/JP120 medium, Daewoo heavy/tractor still new, no bus, MISSU van
const FIT = [1, 0.8, 0.35, 0.25, 0, 0.6];
const NODE = {port:"cảng biển", gate:"cửa khẩu", kcn:"KCN", air:"sân bay"};
const pct = v => v == null || isNaN(v) ? "—" : fmt1(v) + "%";
const n0 = v => v == null || isNaN(v) ? "—" : fmtInt(v);
const median = a => { const s = a.filter(x => x != null && isFinite(x)).sort((x,y) => x-y); return s.length ? s[Math.floor(s.length/2)] : null; };
const dealersOf = r => CV.NET.dealers.filter(d => d.province === r.name);
function nearestStation(r){ const p = {lng: r.lp[0], lat: r.lp[1]}; let best = null; CV.NET.stations.concat(CV.NET.dealers).forEach(s => { const d = CV.km(p, s); if(!best || d < best.d) best = {d, s}; }); return best; }
/* mạng lưới đối thủ đã xác minh (CNET) so với Đô Thành */
const CN = () => CV.CNET || {brands:{}, points:[]};
function netOf(r){ const P = CN().points.filter(p => p.province === r.name), by = {};
  P.forEach(p => { (by[p.b] = by[p.b] || []).push(p); });
  const dts = CV.NET.dealers.filter(d => d.province === r.name).length, dst = CV.NET.stations.filter(s => s.province === r.name).length;
  const svc = P.filter(p => /3S|xưởng|bảo hành|dịch vụ/i.test(p.type)).length;
  const far = P.map(p => { let m = 1e9; CV.NET.dealers.concat(CV.NET.stations).forEach(x => { const d = CV.km(p, x); if(d < m) m = d; }); return {p, d: m}; });
  return {P, by, dts, dst, svc, brands: Object.keys(by).length, gap: P.length - (dts + dst), far}; }
let nodeCache = null;
function nodesOf(r){ if(!nodeCache){ nodeCache = {}; (CV.INFRA.nodes || []).forEach(n => { const pv = CV.provinceOfPoint(n.lng, n.lat); if(pv) (nodeCache[pv.name] = nodeCache[pv.name] || []).push(n); }); } return nodeCache[r.name] || []; }
function arteriesOf(r){ return (CV.INFRA.arteries || []).filter(a => (a.path || []).some(([lng, lat]) => { const pv = CV.provinceOfPoint(lng, lat); return pv && pv.name === r.name; })).map(a => a.name); }
function nat(){ const R = CV.rows, m = R.reduce((a,r) => a + (r._market||0), 0), s = R.reduce((a,r) => a + (+r.sales||0), 0);
  const fit = R.reduce((a,r) => a + (r._market||0) * fitOf(r), 0) / (m || 1);
  return {market: m, sales: s, share: m ? s / m * 100 : 0, gpc: median(R.map(r => r._gpc)), perDealer: median(R.filter(r => r._c4 + r._c3).map(r => r._perCenter)), fit, agri: median(R.map(r => r.econ[0])), ind: median(R.map(r => r.econ[1]))}; }
function fitOf(r){ return r.mix.reduce((a,v,i) => a + v * FIT[i], 0) / 100; }
const shareOf = r => r._market ? (+r.sales||0) / r._market * 100 : 0;

/* ---------- chẩn đoán ---------- */
function diagnose(r){
  const N = nat(), share = shareOf(r), ratio = N.share ? share / N.share : 0, F = [], gaps = [];
  const ds = dealersOf(r), withSales = ds.filter(d => d.leCum != null), nd = r._c4 + r._c3, ns = nearestStation(r);
  const add = (sev, key, title, ev, act) => F.push({sev, key, title, ev, act});
  // 1. Mạng lưới
  if(!nd) add(3, "net", "Chưa có đại lý Đô Thành trong tỉnh", `Thị trường ~${n0(r._market)} xe tải ĐK mới/năm, UIO ${n0(r._uio)} xe; điểm Đô Thành gần nhất cách trung tâm tỉnh ${n0(ns && ns.d)} km (${esc(ns ? ns.s.salesKey || ns.s.name : "")}). Khách không có nơi xem xe, lái thử, bảo hành gần nhà nên chọn hãng có đại lý tại chỗ.`, "Mở đại lý cấp 2 hoặc điểm bán vệ tinh tại " + r.capital + "; trước mắt tổ chức đội bán lưu động và xưởng dịch vụ lưu động định kỳ.");
  else if(N.perDealer && r._perCenter > N.perDealer * 1.6) add(2, "net", "Độ phủ mỏng so với quy mô thị trường", `${nd} đại lý cho ~${n0(r._market)} xe/năm: ${n0(r._perCenter)} xe thị trường/đại lý, gấp ${fmt1(r._perCenter / N.perDealer)} lần trung vị cả nước (${n0(N.perDealer)}).`, "Thêm đại lý cấp 2 ở cụm KCN/huyện xa trung tâm; giao chỉ tiêu phủ xã cho TVBH.");
  if(nd && ns && ns.d > 60) add(2, "svc", "Xa điểm dịch vụ", `Trung tâm tỉnh cách điểm dịch vụ gần nhất ${n0(ns.d)} km. Với xe tải, thời gian nằm chờ sửa là chi phí trực tiếp của chủ xe.`, "Cam kết dịch vụ lưu động 24h, kho phụ tùng nhanh tại đại lý, gói bảo dưỡng tận nơi.");
  // 2. Sản phẩm – phân khúc
  const fit = fitOf(r), heavy = r.mix[2] + r.mix[3];
  if(fit < N.fit - 0.06 || heavy >= 28) add(heavy >= 35 ? 3 : 2, "fit", "Cơ cấu thị trường lệch khỏi thế mạnh sản phẩm", `Tải nặng + đầu kéo chiếm ${heavy}% thị trường tỉnh (ước ~${n0(r._market * heavy / 100)} xe/năm), nơi Hino, Isuzu, Thaco Auman và xe Trung Quốc mạnh; danh mục Đô Thành mạnh ở tải nhẹ–trung (IZ, MISSU, JP120), dòng Daewoo nặng mới ra. Chỉ số phù hợp sản phẩm ${fmt1(fit*100)} so với ${fmt1(N.fit*100)} bình quân.`, "Đưa Daewoo HC/Novus, xe ben vào tỉnh có tỷ trọng nặng cao; lái thử tại công trường, mỏ; gói tài chính riêng cho nhà thầu.");
  else if(r.mix[0] + r.mix[5] >= 50) add(0, "fit", "Thị trường hợp danh mục Đô Thành", `Tải nhẹ + van chiếm ${r.mix[0] + r.mix[5]}%: đúng sân chơi MISSU, IZ.`, "Tập trung IZ65/IZ50, MISSU; so sánh TCO với Thaco Kia/Towner và Isuzu QKR.");
  // 3. Năng lực đại lý
  withSales.forEach(d => { const p = d.khCum ? d.leCum / d.khCum * 100 : null, run = d.khT10 ? d.thT10 / d.khT10 * 100 : null, mon = d.leT9 ? d.leT9 / 9 : null, stock = mon && d.tonT9 != null ? d.tonT9 / mon : null;
    const bad = []; if(p != null && p < 70) bad.push(`đạt ${fmt1(p)}% KH lũy kế T10 (${n0(d.leCum)}/${n0(d.khCum)} xe)`); if(run != null && run < 60) bad.push(`tháng 10 chỉ ${n0(d.thT10)}/${n0(d.khT10)} xe (${fmt1(run)}%)`);
    if(stock != null && stock > 3) bad.push(`tồn ${n0(d.tonT9)} xe ≈ ${fmt1(stock)} tháng bán`); if(d.grade && d.grade !== "A") bad.push(`năng lực hạng ${d.grade} (${fmt1(d.score)} điểm)`);
    if(d.tvbh != null && d.tvbh <= 3) bad.push(`chỉ ${d.tvbh} tư vấn bán hàng`);
    if(bad.length) add(p != null && p < 50 || (run != null && run < 40) ? 3 : 2, "dealer", "Năng lực bán của đại lý " + d.salesKey, bad.join("; ") + ".", "Kèm cặp đại lý theo tuần: phễu khách, tỷ lệ chốt, lái thử; bổ sung TVBH; xử lý tồn bằng chương trình theo model; thưởng theo bán lẻ thay vì bán sỉ."); });
  if(ds.length && !withSales.length) gaps.push("số bán riêng của đại lý cấp 2 trong tỉnh");
  // 4. Sức mua – tài chính
  if(N.gpc && r._gpc < N.gpc * 0.8) add(1, "money", "Sức mua thấp, khách nhạy giá và cần tài chính", `GRDP/người ~${n0(r._gpc)} triệu đ, bằng ${fmt1(r._gpc / N.gpc * 100)}% trung vị cả nước; CPI cả nước bình quân 10T/2026 +${fmt1(CPI_NAT.avg)}% làm chi phí sống và lãi vay cao hơn. Khách dễ chọn xe rẻ hoặc xe cũ.`, "Gói trả góp lãi thấp, trả trước thấp, trả theo mùa vụ; nhấn tổng chi phí sở hữu (TCO) và giá trị bán lại.");
  if(r.econ[0] >= 25) add(1, "season", "Dòng tiền theo mùa vụ nông nghiệp", `Nông – lâm – thủy sản ${r.econ[0]}% GRDP; khách mua xe theo mùa thu hoạch (${(r.seasonNotes||[])[0] ? esc(r.seasonNotes[0]) : "xem lịch mùa vụ"}).`, "Lịch chiến dịch theo mùa: chào hàng 4–6 tuần trước vụ, ưu đãi trả theo vụ, liên kết thương lái, HTX.");
  // 5. Địa hình
  if(r.elev >= 500) add(1, "terrain", "Địa hình đồi núi, khách ưu tiên độ bền và khả năng leo dốc", `Độ cao trung bình ${n0(r.elev)} m; xe chạy đèo dốc, tải nặng. Khách tin hãng đã có xe chạy lâu năm trong vùng.`, "Chứng minh bằng lái thử đường đèo, xe mẫu của khách đang chạy, bảo hành dài, phanh khí xả.");
  // 6. Kênh khách, truyền miệng
  if(/người quen|giới thiệu|truyền miệng|thương lái|quan hệ|uy tín/i.test(r.psyche || "") && share < N.share) add(2, "trust", "Thị trường mua theo người quen, Đô Thành có ít xe đang chạy để được giới thiệu", `Tâm lý khách: “${esc(String(r.psyche).slice(0, 140))}…”. Bán lẻ T1–T10 ${n0(r.sales)} xe trên UIO ${n0(r._uio)} xe: cơ sở khách cũ để giới thiệu còn mỏng.`, "Chương trình khách giới thiệu khách, chăm sóc khách cũ, hội chủ xe; mời khách đang chạy xe Đô Thành làm người chứng thực.");
  // 6b. Mạng lưới đối thủ (điểm bán, 3S, xưởng dịch vụ đã xác minh)
  const NW = netOf(r);
  if(NW.P.length){ const lst = Object.entries(NW.by).map(([k,a]) => (CN().brands[k]||{}).name + " " + a.length).join(", ");
    if(!nd) add(3, "cnet", "Đối thủ có showroom, xưởng dịch vụ tại tỉnh, Đô Thành không có", `Điểm đối thủ đã xác minh: ${lst} (${NW.svc} điểm 3S/xưởng dịch vụ); Đô Thành 0 đại lý, ${NW.dst} trạm dịch vụ.`, "Ưu tiên mở đại lý 3S hoặc trạm dịch vụ ủy quyền; trước mắt cử xe dịch vụ lưu động, đặt kho phụ tùng vệ tinh.");
    else if(NW.P.length > NW.dts + NW.dst && NW.brands >= 2) add(2, "cnet", "Mạng lưới đối thủ dày hơn Đô Thành", `${NW.P.length} điểm đối thủ đã xác minh (${lst}) so với ${NW.dts} đại lý + ${NW.dst} trạm dịch vụ Đô Thành.`, "Thêm đại lý cấp 2 hoặc điểm dịch vụ tại cụm có đối thủ; tận dụng lợi thế giá ròng sau ưu đãi để chào trực tiếp khách của đối thủ.");
    else add(0, "cnet", "Mạng lưới Đô Thành không kém đối thủ đã xác minh", `${NW.dts} đại lý + ${NW.dst} trạm Đô Thành; đối thủ: ${lst}.`, "Giữ chất lượng dịch vụ, thời gian sửa chữa.");
  }
  // 7. Cạnh tranh
  const comp = (r._comp || []); if(comp.length){ const [n, v] = comp[0]; add(v >= 30 ? 2 : 1, "comp", `Đối thủ dẫn đầu tại tỉnh: ${n} ${fmt1(v)}%`, `Thị phần trong tỉnh: ${comp.map(([a,b]) => a + " " + fmt1(b) + "%").join(", ")}.`, "Phân tích đại lý, giá, chính sách của " + n + " tại tỉnh; chọn model đối đầu trực tiếp."); }
  else { const vb = CV.NET.vama.brands, th = vb.find(x => /THACO/i.test(x[0])), dt = vb.find(x => x[0] === "DOTHANH"); gaps.push("thị phần từng hãng trong tỉnh (Cục Đăng kiểm/CSGT hoặc đại lý báo về)");
    if(th && dt) add(1, "comp", "Đối thủ có quy mô và độ nhận diện lớn hơn nhiều", `Cả nước YTM T9/2026 (VAMA): Thaco Truck ${n0(th[1])} xe, Isuzu ${n0((vb.find(x => /Isuzu/.test(x[0]))||[0,0])[1])} xe, Hino ${n0((vb.find(x => /Hino/.test(x[0]))||[0,0])[1])} xe; DOTHANH ${n0(dt[1])} xe (Thaco gấp ${fmt1(th[1]/dt[1])} lần). Chưa có thị phần từng hãng tại tỉnh.`, "Nhập số đăng ký theo hãng tại tỉnh để biết chính xác ai đang lấy khách của mình."); }
  // 8. Thời điểm
  const mo = new Date().getMonth(), sv = (r.season||[])[mo];
  if(sv >= 3 && withSales.length && withSales.every(d => d.khT10 && d.thT10 / d.khT10 < 0.6)) add(2, "timing", "Đang vào cao điểm mùa vụ nhưng nhịp bán chậm", `Tháng ${mo+1} là cao điểm vận tải của tỉnh, nhưng bán lẻ tháng 10 của các đại lý dưới 60% kế hoạch.`, "Tăng tồn xe sẵn giao, ưu đãi giao ngay, lái thử cuối tuần tại chợ đầu mối, KCN.");
  if(!r._regReal) gaps.push("số ĐK mới xe tải thực tế của tỉnh (đang dùng mô hình ước)");
  if(r.cpi == null || r.cpi === "") gaps.push("CPI riêng của tỉnh");
  F.sort((a,b) => b.sev - a.sev);
  const verdict = !r._market ? "" : ratio >= 1.2 ? `Đô Thành đang làm tốt hơn bình quân: bán lẻ T1–T10 ${n0(r.sales)} xe ≈ ${fmt1(share)}% ĐK mới năm, gấp ${fmt1(ratio)} lần bình quân cả nước (${fmt1(N.share)}%).`
    : r.sales ? `Bán lẻ T1–T10 ${n0(r.sales)} xe ≈ ${fmt1(share)}% ĐK mới năm, bằng ${fmt1(ratio*100)}% mức bình quân cả nước (${fmt1(N.share)}%): đối thủ đang lấy phần lớn nhu cầu.` : `Chưa có số bán của Đô Thành tại tỉnh trong khi thị trường ~${n0(r._market)} xe/năm: toàn bộ nhu cầu đang về đối thủ.`;
  const score = Math.round((F.slice(0,3).reduce((a,f) => a + f.sev, 0) / 9) * 70 + Math.max(0, Math.min(1, 1 - ratio)) * 30);
  return {r, share, ratio, verdict, factors: F.filter(f => f.sev > 0), good: F.filter(f => f.sev === 0), gaps, score, N};
}
function diagMd(r){ const D = diagnose(r);
  return `# Chẩn đoán ${r.name}: vì sao đối thủ bán được, Đô Thành chưa\n${D.verdict}\n\n## Nguyên nhân cốt lõi (xếp theo mức độ)\n${D.factors.map((f,i) => `${i+1}. **${f.title}** (${"●".repeat(f.sev)}${"○".repeat(3-f.sev)})\n   - Bằng chứng: ${f.ev.replace(/<[^>]+>/g,"")}\n   - Hành động: ${f.act}`).join("\n") || "- Chưa thấy nguyên nhân nổi bật từ dữ liệu hiện có."}\n${D.good.length ? "\n## Điểm thuận lợi\n" + D.good.map(f => `- ${f.title}: ${f.ev}`).join("\n") : ""}\n\n## Cần bổ sung dữ liệu để kết luận chắc chắn\n${D.gaps.map(g => "- " + g).join("\n") || "- Đủ dữ liệu cơ bản."}\n`; }

/* dữ liệu bổ sung theo tỉnh (r.ext): số mới nhất có nguồn */
const extEcon = r => { const x = r.ext; if(!x) return ""; return `<h4>Số mới nhất (${esc(x.asOf || "")})</h4>${kv([
  x.grdp2025 && ["GRDP 2025 (ước)", `${n0(x.grdp2025.v)} nghìn tỷ · tăng ${fmt1(x.grdp2025.g)}%`], x.grdp9m26 && ["GRDP 9 tháng 2026", `tăng ${fmt1(x.grdp9m26.g)}% (mục tiêu năm ${fmt1(x.grdp9m26.target)}%)`],
  x.incomePc2025 && ["Thu nhập bình quân đầu người 2025", `${n0(x.incomePc2025.v)} triệu/năm (≈ ${fmt1(x.incomePc2025.v/12)} triệu/tháng; ${n0(x.incomePc2025.usd)} USD), hạng ${esc(x.incomePc2025.rank)}`],
  x.grdpPcUsd2025 && ["GRDP bình quân đầu người 2025", n0(x.grdpPcUsd2025) + " USD"], x.servicesShare && ["Tỷ trọng dịch vụ", fmt1(x.servicesShare.v) + "% (" + esc(x.servicesShare.note) + ")"],
  x.fdi && ["Vốn FDI đăng ký", `10 tháng 2026 ≈ ${n0(x.fdi.v10m26)} triệu USD (9 tháng ${fmt1(x.fdi.v9m26)}, tăng ${fmt1(x.fdi.g9m26)}%); năm 2025 ${fmt1(x.fdi.v2025)} triệu USD`],
  x.domesticInv9m26 && ["Đầu tư trong nước đăng ký 9 tháng 2026", `${fmt1(x.domesticInv9m26.v)} nghìn tỷ (tăng ${fmt1(x.domesticInv9m26.g)}%)`],
  x.publicInv && ["Giải ngân đầu tư công 2026", `9 tháng ${fmt1(x.publicInv.pct9m26)}% (${n0(x.publicInv.vnd9m26)} tỷ); cả nước 10 tháng ${fmt1(x.publicInv.nat10m26)}%; lộ trình: ${esc(x.publicInv.targets)}`]])}
  ${x.missing ? `<p class="muted small">Chưa có số chính thức: ${esc(x.missing.join("; "))}.</p>` : ""}${x.src ? `<p class="muted tiny">Nguồn: ${x.src.map(s => `<a href="${esc(s[1])}" target="_blank" rel="noopener noreferrer">${esc(s[0])}</a>`).join(" · ")}</p>` : ""}`; };
const extSoc = r => { const x = r.ext; if(!x) return ""; return kv([x.popOfficial && ["Dân số theo hồ sơ sáp nhập", `${fmt1(x.popOfficial.v)} nghìn: ${esc(x.popOfficial.note)}`], x.units && ["Đơn vị hành chính", esc(x.units)], x.urbanNote && ["Đô thị hóa", esc(x.urbanNote)], r.parts && ["Gộp từ", r.parts.map(p => `${esc(p.name)}: ${n0(p.pop)} nghìn dân, ${n0(p.area)} km², GRDP ${fmt1(p.grdp)} nghìn tỷ`).join("; ")]]); };
const extRules = r => { const x = r.ext; if(!x || !x.localRules) return ""; return `<h4>Quy định địa phương ảnh hưởng xe tải</h4><ul class="actions">${x.localRules.map(q => `<li><b>${esc(q.t)}</b>: ${esc(q.d)}<br><span class="small">→ ${esc(q.impact)}</span><br><a class="tiny" href="${esc(q.src[1])}" target="_blank" rel="noopener noreferrer">${esc(q.src[0])}</a></li>`).join("")}</ul>`; };
CV.provExt = r => r && r.ext ? r.ext : null;
/* ---------- danh mục lớp ---------- */
const kv = rowsKV => `<div class="kv">${rowsKV.filter(Boolean).map(([k,v]) => `<span>${esc(k)}</span><b>${v}</b>`).join("")}</div>`;
const stat = (v, l) => `<div class="stat"><div class="v">${v}</div><div class="l">${esc(l)}</div></div>`;
const bars = (labels, vals, unit) => { const mx = Math.max(...vals, 1); return labels.map((l,i) => `<div class="rk" style="grid-template-columns:150px minmax(0,1fr) 64px;cursor:default"><span class="nm">${esc(l)}</span><span class="b" style="width:${Math.max(.5, vals[i]/mx*100).toFixed(1)}%;background:linear-gradient(90deg,#46e3ff55,#46e3ff)"></span><span class="v">${fmt1(vals[i])}${unit||""}</span></div>`).join(""); };
const LENS = {
  kinhte: {label:"Kinh tế", metric:"gpc", body: r => `<div class="stats num">${stat(n0(r.grdp), "GRDP 2024, nghìn tỷ đ")}${stat(n0(r._gpc) + " tr", "GRDP/người")}${stat(r.growth == null ? "—" : pct(r.growth), "Tăng trưởng GRDP 2025")}${stat(r.cpi == null || r.cpi === "" ? pct(CPI_NAT.avg) : pct(+r.cpi), r.cpi == null || r.cpi === "" ? "CPI 10T/2026 cả nước" : "CPI 10T/2026 của tỉnh")}${stat(fmt1(r.grdp*1000/r.area), "tỷ đ GRDP / km²")}${stat(fmt1(r._market / r.grdp), "xe ĐK mới / nghìn tỷ GRDP")}</div>
      ${kv([["CPI cả nước", `bình quân 10T/2026 +${fmt1(CPI_NAT.avg)}%; tháng 10 +${fmt1(CPI_NAT.oct)}% so với cùng kỳ; lạm phát cơ bản +${fmt1(CPI_NAT.core)}%`], ["Tác động tới xe tải", r.growth != null && r.growth >= 9 ? "Tăng trưởng cao: nhu cầu vận tải, xây dựng tăng" : "Tăng trưởng vừa: cạnh tranh giá, cần gói tài chính"]])}
      <h4>Các tỉnh cũ trước sáp nhập</h4>${bars((r.parts||[]).map(p => p.name), (r.parts||[]).map(p => p.grdp), " nghìn tỷ")}${extEcon(r)}`},
  nganh: {label:"Cơ cấu ngành", metric:"ind", body: r => `${bars(["Nông – lâm – thủy sản","Công nghiệp – xây dựng","Dịch vụ","Thuế SP trừ trợ cấp"], r.econ, "%")}${kv([["Ngành mũi nhọn", esc(r.industries)], ["Đặc sản, hàng hóa chủ lực", esc(r.specialties)], ["Nhu cầu xe theo ngành", esc(r.cvDemand)]])}`},
  xahoi: {label:"Xã hội – dân cư", metric:"density", body: r => `<div class="stats num">${stat(n0(r.pop), "nghìn dân")}${stat(n0(r._density), "người/km²")}${stat(n0(r.urban) + "%", "đô thị hóa (ước)")}${stat(n0(r.area), "km²")}${stat(n0(r.communes), "xã/phường")}${stat(fmt1(r._uio / r.pop), "xe TM / nghìn dân")}</div>${kv([["Dân tộc", esc(r.ethnic)], ["Vùng", esc(r.region)]])}${extSoc(r)}`},
  vanhoa: {label:"Văn hóa – con người", metric:null, body: r => kv([["Văn hóa kinh doanh", esc(r.culture)], ["Tâm lý khách hàng", esc(r.psyche)], ["Lễ hội", esc(r.festivals)], ["Đặc sản", esc(r.specialties)], ["Dân tộc", esc(r.ethnic)]]) + `<h4>Chiến dịch phù hợp</h4><ul class="actions">${(r.campaigns||[]).map(c => `<li>${esc(c)}</li>`).join("")}</ul>`},
  chinhtri: {label:"Chính trị – hành chính – chính sách", metric:"communes", body: r => kv([["Đơn vị hành chính", `Tỉnh/thành mới theo NQ 202/2025/QH15, chính quyền 2 cấp từ 1/7/2025`], ["Gộp từ", esc(r.merged.join(", "))], ["Trung tâm hành chính", esc(r.capital)], ["Số xã/phường", n0(r.communes)], ["Biển số", esc(r.plates)], ["Vùng kinh tế", esc(r.region)], ["Hạ tầng, dự án trọng điểm", esc(r.logistics)]]) + `<p class="muted small">Sau sáp nhập, trung tâm hành chính và dòng đầu tư công có thể dịch chuyển: theo dõi dự án hạ tầng, KCN mới để đón nhu cầu xe công trình, logistics.</p>${extRules(r)}`},
  hatang: {label:"Hạ tầng – logistics", metric:"nodes", body: r => { const ns = nodesOf(r), cnt = k => ns.filter(n => n.type === k).length, sites = (CV.SITES||[]).filter(s => s.prov && s.prov.name === r.name && !s.covered);
      return `<div class="stats num">${stat(cnt("port"), "cảng biển")}${stat(cnt("gate"), "cửa khẩu")}${stat(cnt("kcn"), "KCN lớn")}${stat(cnt("air"), "sân bay")}${stat(arteriesOf(r).length, "trục huyết mạch đi qua")}${stat(sites.length, "điểm đề xuất mở ĐL")}</div>${kv([["Tuyến huyết mạch", esc(arteriesOf(r).join(", ") || "—")], ["Đầu mối", esc(ns.map(n => n.name).join(", ") || "—")], ["Logistics", esc(r.logistics)]])}`; }},
  diahinh: {label:"Địa hình – mùa vụ", metric:"elev", body: r => `<div class="stats num">${stat(n0(r.elev) + " m", "độ cao trung bình")}${stat(esc(r.archetype), "kiểu địa bàn")}${stat(["Thấp","Vừa","Cao","Cao điểm"][(r.season||[])[new Date().getMonth()]||0], "nhu cầu tháng này")}</div>${bars(["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"], (r.season||[]).map(Number), "")}<ul class="actions">${(r.seasonNotes||[]).map(s => `<li>${esc(s)}</li>`).join("")}</ul>`},
  thitruong: {label:"Thị trường xe tải", metric:"market", body: r => `<div class="stats num">${stat(n0(r._market), "xe tải ĐK mới/năm" + (r._regReal ? "" : " (ước)"))}${stat(n0(r._uio), "UIO xe TM")}${stat(pct(r._turn), "ĐK mới / UIO")}${stat(pct(r._mshare), "tỷ trọng cả nước")}${stat(n0(r.carReg2025), "ô tô mọi loại ĐK 2025")}${stat(r._tier, "hạng ưu tiên")}</div>${bars(SEG, r.mix.map(v => r._market * v / 100), " xe")}`},
  canhtranh: {label:"Cạnh tranh", metric:"share", body: r => { const vb = CV.NET.vama.brands;
      return `${(r._comp||[]).length ? bars(r._comp.map(c => c[0]), r._comp.map(c => c[1]), "%") : '<p class="muted small">Chưa có thị phần từng hãng tại tỉnh. Nói với Ben: “cập nhật thị phần Thaco ' + esc(r.name) + ' 35%”.</p>'}
      <h4>Cả nước, YTM T9/2026 (VAMA)</h4>${bars(vb.map(b => b[0]), vb.map(b => b[1]), " xe")}${kv([["Đô Thành tại tỉnh", `${n0(r.sales)} xe bán lẻ T1–T10 ≈ ${fmt1(shareOf(r))}% ĐK mới năm`]])}
      <h4>Bổ sung dữ liệu còn thiếu cho ${esc(r.name)}</h4><div class="fgrid gapform">${GAPF.map(([k,l]) => `<label class="field">${esc(l)}<input type="number" step="0.1" data-gap="${k}" value="${r[k] == null || r[k] === 0 && k.startsWith("c_") ? "" : esc(r[k])}"></label>`).join("")}</div>
      <div class="toolbar"><button type="button" class="primary" data-gapsave="1">Lưu dữ liệu tỉnh</button><span class="muted small">Nguồn nên dùng: Cục Đăng kiểm/CSGT (đăng ký theo hãng), Cục Thống kê tỉnh (CPI). Mọi thay đổi ghi vào nhật ký.</span></div>`; }},
  mangluoi: {label:"Mạng lưới bán hàng & dịch vụ", metric:"netgap", body: r => { const NW = netOf(r), B = CN().brands;
      return `<div class="stats num">${stat(n0(NW.dts), "đại lý Đô Thành")}${stat(n0(NW.dst), "trạm DV Đô Thành")}${stat(n0(NW.P.length), "điểm đối thủ đã xác minh")}${stat(n0(NW.svc), "3S / xưởng DV đối thủ")}${stat(n0(NW.brands), "hãng đối thủ có điểm")}</div>
      <div style="overflow-x:auto"><table class="tasktbl small"><thead><tr><th>Hãng</th><th>Điểm</th><th>Loại</th><th>Địa chỉ</th><th>Cách Đô Thành gần nhất</th></tr></thead><tbody>${NW.far.map(({p,d}) => `<tr><td><i class="dot" style="background:${B[p.b].color}"></i> ${esc(B[p.b].name)}</td><td>${esc(p.name)}</td><td>${esc(p.type)}</td><td>${esc(p.addr)}</td><td class="num">${n0(d)} km</td></tr>`).join("") || '<tr><td colspan="5" class="muted">Chưa có điểm đối thủ đã xác minh tại tỉnh</td></tr>'}</tbody></table></div>
      <h4>Quy mô mạng lưới cả nước</h4>${kv(Object.values(B).map(b => [b.name, esc(b.total)]).concat([["Đô Thành", `${CV.NET.dealers.length} đại lý + ${CV.NET.stations.length} trạm dịch vụ ủy quyền`]]))}
      <p class="muted small">Bật nút “Đối thủ” trên bản đồ để xem vị trí. ${esc(CN().note || "")}</p>`; }},
  dothanh: {label:"Năng lực Đô Thành tại tỉnh", metric:"kpct", body: r => { const ds = dealersOf(r), ns = nearestStation(r);
      return `<div class="stats num">${stat(n0(r.sales), "bán lẻ lũy kế T10")}${stat(r.target ? n0(r._kpct) + "%" : "—", "đạt KH lũy kế")}${stat(r._c4 + " · " + r._c3, "đại lý cấp 1 · 2")}${stat(n0(r._perCenter), "xe thị trường / đại lý")}${stat(n0(ns && ns.d) + " km", "tới điểm DV gần nhất")}${stat(r._tgt26 ? n0(r._tgt26) : "—", "mục tiêu 2026 đề xuất")}</div>
      <div style="overflow-x:auto"><table class="tasktbl small"><thead><tr><th>Đại lý</th><th>Cấp</th><th>Bán lẻ T10 lũy kế / KH</th><th>T10</th><th>Tồn T9</th><th>Tồn 21/11</th><th>TVBH</th><th>Hạng</th><th>T1–T10 (lẻ, nét đứt = KH)</th></tr></thead><tbody>${ds.map(d => `<tr><td>${esc(d.salesKey || d.name)}${d.salesKey ? ` <button type="button" class="tiny" data-d360="${esc(d.salesKey)}" title="Hồ sơ 360°: gom mọi nguồn, kiểm tra khớp số liệu">360°</button>` : ""}</td><td>${d.tier}</td><td>${d.leCum != null ? n0(d.leCum) + " / " + n0(d.khCum) + " (" + fmtInt(d.leCum/d.khCum*100) + "%)" : "—"}</td><td>${d.thT10 != null ? d.thT10 + "/" + d.khT10 : "—"}</td><td>${d.tonT9 ?? "—"}</td><td>${(() => { const v = CV.invOf && CV.invOf(d.salesKey); return v && v.ton != null ? v.ton + (v.cover != null ? " · " + String(v.cover).replace(".", ",") + " th" : "") : "—"; })()}</td><td>${d.tvbh ?? "—"}</td><td>${d.grade ? d.grade + " · " + fmt1(d.score) : "—"}</td><td>${CV.salesSpark ? CV.salesSpark(d.salesKey) : ""}</td></tr>`).join("") || '<tr><td colspan="9">Chưa có đại lý</td></tr>'}</tbody></table></div>${(() => { const M = CV.salesModelsOfProvince ? CV.salesModelsOfProvince(r.name) : []; return M.length ? `<h4>Model Đô Thành bán tại tỉnh năm 2026 (theo địa chỉ khách, CSI)</h4><p class="small">${M.slice(0, 10).map(([m, n]) => `<b>${esc(m)}</b> ${n}`).join(" · ")}</p>` : ""; })()}`; }},
  chandoan: {label:"Chẩn đoán: vì sao đối thủ bán được", metric:"diag", body: r => { const D = diagnose(r);
      return `<p style="margin:0 0 8px"><b>${esc(D.verdict)}</b></p><ol class="actions">${D.factors.map(f => `<li><span class="pill ${f.sev >= 3 ? "bad" : f.sev === 2 ? "warn" : ""}">${"●".repeat(f.sev)}</span> <b>${esc(f.title)}</b><br><span class="muted small">Bằng chứng: ${f.ev}</span><br><span class="small">→ ${esc(f.act)}</span></li>`).join("") || "<li>Chưa thấy nguyên nhân nổi bật từ dữ liệu hiện có.</li>"}</ol>
      ${D.good.length ? `<p class="small" style="color:var(--good)">Thuận lợi: ${D.good.map(f => esc(f.title)).join("; ")}</p>` : ""}${D.gaps.length ? `<p class="muted small">Cần bổ sung để kết luận chắc chắn: ${esc(D.gaps.join("; "))}.</p>` : ""}`; }},
};
const GAPF = [["c_thaco","Thaco %"],["c_hyundai","Hyundai %"],["c_isuzu","Isuzu %"],["c_hino","Hino %"],["c_fuso","Fuso %"],["c_china","Xe Trung Quốc %"],["c_other","Hãng khác %"],["reg","ĐK mới thực tế (xe/năm)"],["uio","UIO thực tế (xe)"],["cpi","CPI 10T/2026 của tỉnh %"]];
const ALIAS = [["chandoan",/chẩn đoán|vì sao|tại sao|nguyên nhân|không bán được|bán không được/], ["mangluoi",/mạng lưới|showroom|3s|trạm dịch vụ|xưởng|bảo hành|bảo dưỡng|hậu mãi/], ["kinhte",/kinh tế|grdp|cpi|lạm phát|vĩ mô/], ["nganh",/cơ cấu ngành|tỷ trọng ngành|ngành nghề|ngành|mũi nhọn/], ["xahoi",/xã hội|dân cư|dân số|đô thị/],
  ["vanhoa",/văn hóa|con người|tâm lý|lễ hội/], ["chinhtri",/chính trị|hành chính|chính sách|sáp nhập/], ["hatang",/hạ tầng|logistics|giao thông|cảng|kcn/], ["diahinh",/địa hình|mùa vụ|thời tiết|khí hậu/],
  ["thitruong",/thị trường|dung lượng|đăng ký|uio|phân khúc/], ["canhtranh",/cạnh tranh|đối thủ|thị phần/], ["dothanh",/năng lực|đại lý|đô thành|nội lực/]];

/* hidden metrics for map colouring (not shown as chips) */
Object.assign(CV.METRICS, {
  netgap: {label:"Điểm đối thủ trừ điểm Đô Thành", unit:"điểm", get: r => netOf(r).gap, fmt: v => fmtInt(v)},
  cpi: {label:"CPI 10T/2026", unit:"%", get: r => r.cpi == null || r.cpi === "" ? null : +r.cpi, fmt: v => fmt1(v)},
  density: {label:"Mật độ dân số", unit:"người/km²", get: r => r._density, fmt: v => fmtInt(v)},
  nodes: {label:"Đầu mối logistics", unit:"điểm", get: r => nodesOf(r).length, fmt: v => fmtInt(v)},
  kpct: CV.METRICS.kpct || {label:"% KH lũy kế T10", unit:"%", get: r => r._kpct, fmt: v => fmtInt(v)},
  diag: {label:"Mức độ vấn đề (chẩn đoán)", unit:"điểm", get: r => diagnose(r).score, fmt: v => fmtInt(v)},
});

/* ---------- state + rendering hooks ---------- */
let lensKey = null;
Object.defineProperty(CV, "lens", {get: () => lensKey, configurable: true});
function setLens(k, prov){
  lensKey = k && LENS[k] ? k : null;
  if(prov){ const r = CV.findRow(prov); if(r) CV.select(r.name, true); }
  const m = lensKey && LENS[lensKey].metric; if(m && CV.METRICS[m]) CV.setMap(Object.assign({metric: m, color: "metric"}, lensKey === "mangluoi" ? {comp: true} : {})); else if(!lensKey) CV.setMap({color: "zone"}); else CV.renderDossier();
  CV.showTab("P"); return lensKey;
}
CV.setLens = setLens;
CV.lensBar = r => `<div class="lensbar"><span class="muted tiny">Lớp dữ liệu nền (nhờ Ben hoặc chọn):</span>${Object.entries(LENS).map(([k,L]) => `<button type="button" data-lens="${k}">${esc(L.label.split(":")[0])}</button>`).join("")}</div>`;
CV.lensHtml = r => {
  const L = LENS[lensKey]; if(!L) return null;
  const head = `<div class="lenshead"><div><h3>Lớp: ${esc(L.label)}</h3><div class="name" style="font-size:22px">${r ? esc(r.name) : "Chọn một tỉnh trên bản đồ"}</div></div><button type="button" data-lens="">↩ Về hồ sơ mặc định</button></div>${CV.lensBar(r)}`;
  if(!r){ const M = CV.METRICS[L.metric]; if(!M) return head + '<p class="muted">Bấm một tỉnh để xem lớp này.</p>';
    const list = CV.rows.map(x => [x, M.get(x)]).filter(x => x[1] != null && !isNaN(x[1])).sort((a,b) => b[1]-a[1]).slice(0, 12);
    return head + `<h4>${esc(M.label)} · 12 tỉnh cao nhất</h4>` + bars(list.map(x => x[0].name), list.map(x => +x[1]), " " + M.unit); }
  return head + `<div class="lensbody">${L.body(r)}</div><div class="toolbar"><button type="button" data-diagmd="1">Ben báo cáo chi tiết lớp này</button></div>`;
};
CV.lensWire = (el, r) => {
  el.querySelectorAll("[data-lens]").forEach(b => b.addEventListener("click", () => setLens(b.dataset.lens || null)));
  const gs = el.querySelector("[data-gapsave]"); if(gs && r) gs.addEventListener("click", () => { const o = {}; el.querySelectorAll("[data-gap]").forEach(i => { o[i.dataset.gap] = i.value.trim() === "" ? (i.dataset.gap.startsWith("c_") ? 0 : null) : i.value.replace(",", "."); });
    const sum = GAPF.filter(([k]) => k.startsWith("c_")).reduce((a,[k]) => a + (+o[k] || 0), 0); if(sum > 100.5) return toast(`Tổng thị phần ${fmt1(sum)}% vượt 100%`);
    const n = CV.setProvFields ? CV.setProvFields(r.name, o, "Biểu mẫu Cạnh tranh") : 0; toast(n ? `Đã lưu ${n} chỉ tiêu của ${r.name}` : "Không có thay đổi"); });
  const d = el.querySelector("[data-diagmd]"); if(d && r) d.addEventListener("click", () => { CV.openAi(true); CV.benTab("Chat");
    if(lensKey === "chandoan"){ CV.addMsg("u", esc("Chẩn đoán " + r.name)); const b = CV.addMsg("a", ""); CV.finishBubble(b, diagMd(r), false, "Chẩn đoán " + r.name, true); }
    else CV.askAi(`Phân tích lớp "${LENS[lensKey].label}" của ${r.name} (dùng get_indicators và diagnose_province): số liệu nổi bật, tác động tới sức mua xe tải của Đô Thành và thị trường, 3 hành động ưu tiên.`); });
};
document.addEventListener("click", e => { const b = e.target.closest("#paneP .lensbar [data-lens]"); if(b && !lensKey){ setLens(b.dataset.lens); } });
CV.lensTip = r => { const L = LENS[lensKey]; if(!L) return null; const M = CV.METRICS[L.metric];
  if(lensKey === "chandoan"){ const D = diagnose(r); return `<div class="t">${esc(r.name)}</div><div class="muted">${esc(D.verdict)}</div><ol style="margin:6px 0 0 16px;padding:0">${D.factors.slice(0,3).map(f => `<li>${esc(f.title)}</li>`).join("")}</ol>`; }
  return `<div class="t">${esc(r.name)}</div><div class="muted">Lớp: ${esc(L.label)}</div>${M ? `<div class="g num"><span>${esc(M.label)}</span><b>${M.get(r) == null ? "—" : M.fmt(M.get(r)) + " " + esc(M.unit)}</b><span>Dung lượng thị trường</span><b>${n0(r._market)} xe</b><span>Bán lẻ T1–T10</span><b>${n0(r.sales)} xe</b></div>` : ""}`; };

/* ---------- Ben: lệnh nhanh + công cụ AI ---------- */
function lensFromText(low){ const a = ALIAS.find(([,re]) => re.test(low)); return a ? a[0] : null; }
CV.localHooks.unshift(raw => {
  const t = raw.replace(/^ben\s*(ơi)?[,:\s]+/i, "").trim(), low = t.toLowerCase();
  if(/^(về mặc định|ẩn lớp|tắt lớp|hiện lại hồ sơ|bỏ lớp|về hồ sơ)/.test(low)){ setLens(null); return "Đã ẩn lớp dữ liệu, về hồ sơ mặc định."; }
  const isWhy = /(vì sao|tại sao|nguyên nhân|chẩn đoán).*(bán|đối thủ|đô thành)|không bán được|bán không được|^chẩn đoán/.test(low);
  if(!isWhy && !/^(hiện|xem|mở lớp|bật lớp|lớp|cho xem|hiển thị|phân tích)\s/.test(low)) return null;
  const k = isWhy ? "chandoan" : lensFromText(low); if(!k) return null;
  let r = null; CV.rows.forEach(x => [x.name, ...(x.merged||[])].forEach(n => { if(CV.norm(t).includes(CV.norm(n)) && (!r || n.length > r[1])) r = [x, n.length]; }));
  const row = r ? r[0] : CV.findRow(CV.selected || "");
  setLens(k, row && row.name);
  if(!row) return `Đã bật lớp **${LENS[k].label}**, bản đồ tô màu theo chỉ số của lớp. Bấm một tỉnh để xem chi tiết.`;
  return k === "chandoan" ? diagMd(row) : `Đã ẩn hồ sơ mặc định và hiện lớp **${LENS[k].label}** của **${row.name}** trong khung Hồ sơ tỉnh${LENS[k].metric ? "; bản đồ tô màu theo " + CV.METRICS[LENS[k].metric].label : ""}. Nói “về mặc định” để quay lại.`;
});
function indicators(r){ const D = diagnose(r), ns = nearestStation(r);
  return {tinh: r.name, vung: r.zone, kinh_te: {grdp_2024_nghin_ty: r.grdp, grdp_nguoi_tr: Math.round(r._gpc), tang_truong_2025: r.growth, cpi_tinh: r.cpi ?? null, cpi_ca_nuoc_10T2026: CPI_NAT.avg, cpi_T10_yoy: CPI_NAT.oct, grdp_km2_ty: +(r.grdp*1000/r.area).toFixed(1)},
    co_cau_nganh_pct: {nong_lam_thuy_san: r.econ[0], cong_nghiep_xay_dung: r.econ[1], dich_vu: r.econ[2], thue: r.econ[3]}, nganh_mui_nhon: r.industries, dac_san: r.specialties,
    xa_hoi: {dan_so_nghin: r.pop, mat_do: Math.round(r._density), do_thi_hoa: r.urban, xa_phuong: r.communes, dan_toc: r.ethnic}, van_hoa: {kinh_doanh: r.culture, tam_ly: r.psyche, le_hoi: r.festivals},
    hanh_chinh: {gop_tu: r.merged, trung_tam: r.capital, bien_so: r.plates}, ha_tang: {dau_moi: nodesOf(r).map(n => NODE[n.type] + " " + n.name), truc: arteriesOf(r), logistics: r.logistics},
    dia_hinh_mua_vu: {do_cao: r.elev, kieu: r.archetype, mua_vu_T1_T12: r.season, ghi_chu: r.seasonNotes},
    thi_truong: {dk_moi_nam: r._market, so_thuc: r._regReal, uio: r._uio, phan_khuc_pct: Object.fromEntries(SEG.map((s,i) => [s, r.mix[i]])), ty_trong_ca_nuoc: +r._mshare.toFixed(2)},
    mang_luoi: (() => { const NW = netOf(r); return {do_thanh_dai_ly: NW.dts, do_thanh_tram_dv: NW.dst, doi_thu_xac_minh: NW.far.map(({p,d}) => ({hang: (CN().brands[p.b]||{}).name, ten: p.name, loai: p.type, dia_chi: p.addr, cach_DT_km: Math.round(d)})), quy_mo_ca_nuoc: Object.fromEntries(Object.values(CN().brands).map(b => [b.name, b.total]))}; })(),
    canh_tranh: {thi_phan_tinh: Object.fromEntries((r._comp||[]).map(c => [c[0], c[1]])), vama_ca_nuoc_YTM_T9: CV.NET.vama.brands},
    do_thanh: {ban_le_T1_T10: r.sales, kh_luy_ke: r.target, dat_kh_pct: r._kpct, dai_ly: dealersOf(r).map(d => ({ten: d.salesKey || d.name, cap: d.tier, le: d.leCum, kh: d.khCum, t10: d.thT10, kh_t10: d.khT10, ton: d.tonT9, tvbh: d.tvbh, hang: d.grade})), km_toi_diem_dv: ns && Math.round(ns.d)},
    chan_doan: {ket_luan: D.verdict, nguyen_nhan: D.factors.map(f => ({muc_do: f.sev, van_de: f.title, bang_chung: f.ev.replace(/<[^>]+>/g,""), hanh_dong: f.act})), thieu_du_lieu: D.gaps}}; }
CV.tools.push(
  {name:"show_lens", label:"Đang đổi lớp dữ liệu…", description:"Ẩn hồ sơ mặc định và hiện một lớp dữ liệu nền của tỉnh trên khung Hồ sơ, tô màu bản đồ theo chỉ số của lớp. lens: kinhte, nganh, xahoi, vanhoa, chinhtri, hatang, diahinh, thitruong, canhtranh, dothanh, chandoan; rỗng = về mặc định. province: tên tỉnh (tùy chọn).",
   inputSchema:{type:"object",properties:{lens:{type:"string"},province:{type:"string"}}}, execute: ({lens, province}) => { const k = setLens(lens || null, province); return {lop: k ? LENS[k].label : "mặc định", tinh: CV.selected}; }},
  {name:"get_indicators", label:"Đang đọc lớp dữ liệu…", description:"Toàn bộ chỉ số nền của một tỉnh: kinh tế (GRDP, CPI), cơ cấu ngành, xã hội, văn hóa, hành chính, hạ tầng, địa hình–mùa vụ, thị trường, cạnh tranh, năng lực Đô Thành và chẩn đoán.",
   inputSchema:{type:"object",properties:{name:{type:"string"}},required:["name"]}, execute: ({name}) => { const r = CV.findRow(String(name)); if(!r) throw new Error("Không tìm thấy tỉnh " + name); return indicators(r); }},
  {name:"diagnose_province", label:"Đang chẩn đoán…", description:"Chẩn đoán vì sao đối thủ bán được mà Đô Thành chưa bán được tại một tỉnh: nguyên nhân cốt lõi xếp theo mức độ, bằng chứng số liệu, hành động, dữ liệu còn thiếu.",
   inputSchema:{type:"object",properties:{name:{type:"string"}},required:["name"]}, execute: ({name}) => { const r = CV.findRow(String(name)); if(!r) throw new Error("Không tìm thấy tỉnh " + name); setLens("chandoan", r.name); return diagMd(r); }},
);
const prevCtx = CV.ctx;
CV.ctx = () => (prevCtx ? prevCtx() : "") + `
LỚP DỮ LIỆU NỀN: hồ sơ tỉnh mặc định hiển thị dung lượng thị trường, số bán, dân số, GRDP, CPI, ngành mũi nhọn. Các lớp khác ẩn; khi người dùng yêu cầu xem văn hóa, chính trị, cơ cấu ngành, hạ tầng, cạnh tranh… thì gọi show_lens để ẩn hồ sơ cũ và hiện lớp được yêu cầu, rồi giải thích bằng get_indicators. Câu hỏi "vì sao đối thủ bán được mà Đô Thành không" dùng diagnose_province: nêu nguyên nhân cốt lõi kèm bằng chứng số liệu, phân biệt số thực và số ước, nêu dữ liệu còn thiếu, đề xuất hành động cụ thể. CPI cả nước bình quân 10T/2026 +${CPI_NAT.avg}% (tháng 10 +${CPI_NAT.oct}% so với cùng kỳ, lạm phát cơ bản +${CPI_NAT.core}%), chưa có CPI từng tỉnh.${lensKey ? " Đang hiện lớp: " + LENS[lensKey].label + "." : ""}`;
const inst = document.getElementById("aiInstant");
if(inst){ const b = document.createElement("button"); b.type = "button"; b.textContent = "Vì sao chưa bán được"; b.addEventListener("click", () => { const r = CV.findRow(CV.selected || ""); if(!r){ toast("Chọn một tỉnh trên bản đồ trước"); return; } setLens("chandoan", r.name); CV.openAi(true); CV.addMsg("u", esc("Vì sao đối thủ bán được tại " + r.name)); const m = CV.addMsg("a", ""); CV.finishBubble(m, diagMd(r), false, "Chẩn đoán " + r.name, true); }); inst.appendChild(b); }
CV.renderDossier();
})();
