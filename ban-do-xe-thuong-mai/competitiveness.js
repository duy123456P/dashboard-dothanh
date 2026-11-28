/* ===== Tab "Năng lực cạnh tranh" =====
   Thống nhất thông tin từ các hình Anh cung cấp (chân dung khách hàng 4 trụ cột, bản đồ sản phẩm, danh mục, 4 trụ cột sản phẩm, độ trễ điều hành,
   đặt tên chương trình khuyến mãi, công cụ AI) với dữ liệu đã có trên bản đồ. Nguyên tắc: số nào có nguồn công bố thì dùng nguồn đó; số chỉ có trong hình
   ghi rõ "theo hình, chưa có nguồn" và đặt cạnh số của bản đồ để đối chiếu. Không đưa vào đây đề xuất thu nhập, cổ phần cá nhân. */
(function(){
"use strict";
const CV = window.__CV; if(!CV) return;
const {esc, fmtInt, fmt1} = CV, sum = a => a.reduce((x, y) => x + (y || 0), 0);
const J = id => { try{ return JSON.parse(document.getElementById(id).textContent); }catch(e){ return null; } };
const PR = J("prod-data") || {groups: [], prices: {}, specs: {}}, PL = J("pl-data") || {offers: []}, M = CV.market || null;
const IMG = "Hình Anh cung cấp ngày 28/11/2026 (chưa có đường dẫn nguồn)";
const L = (u, t) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(t)}</a>`;
const GROUPS = [
  {g: "MISSU", name: "DOTHANH MISSU", tag: "Giao hàng đô thị, tải nhẹ", col: "#2f8fff", segs: ["Van", "Small Trucks I"],
   who: "Chủ hộ kinh doanh, cửa hàng, đại lý, tài xế tự doanh, đội giao hàng nhỏ.", ind: "Thực phẩm, tạp hóa, đồ uống, chuyển phát, bán online, giao nội đô.", care: "Xe gọn, dễ xoay trở; chi phí hợp lý; thùng phù hợp; vốn linh hoạt.",
   pos: "Tải nhẹ, xe van, đô thị, hộ kinh doanh, giao hàng, dịch vụ.", engine: "122 PS, 158 Nm (động cơ xăng)", rivals: "Suzuki (K200, K250), Thaco, các dòng tải nhẹ khác"},
  {g: "IZ Series", name: "DOTHANH IZ", tag: "Phân phối và vận tải linh hoạt", col: "#14a3b8", segs: ["Small Trucks II", "Light Trucks I", "Light Trucks II"],
   who: "Chủ doanh nghiệp vừa và nhỏ, chủ xe dịch vụ, quản lý đội giao hàng, phân phối.", ind: "Vật liệu xây dựng, nông sản, đồ uống, hàng tiêu dùng; tuyến liên huyện, liên tỉnh.", care: "Tải và thùng phù hợp; bền bỉ, tiết kiệm; phụ tùng và sửa chữa nhanh.",
   pos: "Tải nhẹ, nhỏ 1,9–3,6 tấn, đa dạng nhu cầu, hiệu quả kinh tế cao.", engine: "116–122 PS, 285–330 Nm", rivals: "Isuzu, Thaco, JAC, VEAM, các dòng tải nhẹ nhỏ khác", note: "Nền tảng JMC, tích lũy hơn 12.000 xe (theo hình)"},
  {g: "JP Series", name: "DOTHANH JP", tag: "Vận tải trung và liên tỉnh", col: "#c93b4a", segs: ["Medium Trucks I"],
   who: "Chủ doanh nghiệp vận tải vừa, nhà phân phối vùng, quản lý đội xe nhà máy, kho.", ind: "Trung chuyển kho – đại lý; hàng pallet, công nghiệp, nông sản liên tỉnh.", care: "Hiệu quả mỗi tấn-km; số chuyến; độ tin cậy; dịch vụ và tài chính.",
   pos: "Tải trung 7–7,8 tấn, liên tỉnh, đường dài, hàng dài, hiệu quả và ổn định.", engine: "163 PS, 450 Nm", rivals: "Hino, Isuzu, Thaco, Fuso, các dòng tải trung khác"},
  {g: "DAEWOO TRUCKS", name: "DAEWOO TRUCKS", tag: "Vận tải nặng và chuyên dụng", col: "#e8832a", segs: ["Medium Trucks II", "Heavy Trucks"],
   who: "Chủ doanh nghiệp vận tải lớn, nhà thầu, đơn vị công trình, khai khoáng, logistics.", ind: "Hàng nặng, xe ben, container, đầu kéo, vận tải công nghiệp đường dài.", care: "Sức kéo, độ bền; ít nằm xưởng; hậu mãi, phụ tùng; tổng chi phí sở hữu.",
   pos: "Tải trung, nặng, ben, đầu kéo; vận tải đường dài, công trình, khai thác.", engine: "280–440 PS, 1.000–2.100 Nm", rivals: "Hino, Isuzu, Hyundai, Thaco, Fuso, các dòng tải nặng khác"},
];
/* số trong hình: giá (triệu đồng), tải trọng (kg) */
const IMG_PRICE = {V56: [300, 330], V65: [310, 340], T26: [320, 350], T33L: [350, 390], IZ45S: [356, 356], IZ50S: [358, 358], IZ50M: [388, 388], IZ62M: [388, 388], "IZ50M Plus": [390, 430], "IZ65M Plus": [390, 430], "IZ60SL Plus": [430, 480], "IZ71SL Plus": [430, 480], JP120SL: [800, 900], JP120EXL: [850, 950]};
const IMG_PAY = {V56: 945, V65: 945, T26: 990, T33L: 1490, IZ45S: 1990, IZ50S: 2350, IZ50M: 2250, "IZ50M Plus": 1990, IZ62M: 3490, "IZ65M Plus": 3490, "IZ60SL Plus": 2490, "IZ71SL Plus": 3490, JP120SL: 7790, JP120EXL: 7580};
const IMG_DAEWOO = [["HC6", "~1,23 tỷ"], ["HC8", "~1,24 tỷ"], ["HU6", "~1,56 tỷ"], ["CL4DF (ben)", "~1,92 tỷ"], ["CL4T8 (đầu kéo)", "~1,90 tỷ"]];
const SEGN = {"Van": "Van", "Small Trucks I": "Tải nhỏ I", "Small Trucks II": "Tải nhỏ II", "Light Trucks I": "Tải nhẹ I", "Light Trucks II": "Tải nhẹ II", "Medium Trucks I": "Tải trung I", "Medium Trucks II": "Tải trung II", "Heavy Trucks": "Tải nặng"};
const SEGD = {"Van": "van", "Small Trucks I": "tổng tải < 5 t, tải < 1,25 t", "Small Trucks II": "tổng tải < 5 t, tải > 1,25 t", "Light Trucks I": "5–8 t", "Light Trucks II": "8–12 t", "Medium Trucks I": "12–16 t", "Medium Trucks II": "16–24 t", "Heavy Trucks": "> 24 t"};

/* ---------- tính từ dữ liệu bản đồ ---------- */
const segs = () => M && M.national ? Object.keys(M.national).filter(k => k !== "Grand Total") : [];
function segStat(s){ const n = M.national[s] || {}, rk = (M.rankSeg10T || {})[s], dt = rk ? (rk.find(x => x[0] === "DOTHANH") || [0, 0])[1] : null;
  return {s, tt: n.m10_2026, tt25: n.m10_2025, g: n.g10, dt, share: rk && n.m10_2026 ? dt / n.m10_2026 * 100 : null, top: rk ? rk.filter(x => x[0] !== "DOTHANH").slice(0, 3) : [], hasRank: !!rk}; }
function groupStat(G){ const S = G.segs.map(segStat).filter(x => x.tt != null), tt = sum(S.map(x => x.tt)), tt25 = sum(S.map(x => x.tt25)), ranked = S.every(x => x.hasRank), dt = ranked ? sum(S.map(x => x.dt)) : null;
  const rv = {}; S.forEach(x => x.top.forEach(([b, n]) => rv[b] = (rv[b] || 0) + n));
  return {S, tt, tt25, g: tt25 ? (tt / tt25 - 1) * 100 : null, dt, share: ranked && tt ? dt / tt * 100 : null, ranked, top: Object.entries(rv).sort((a, b) => b[1] - a[1]).slice(0, 4)}; }
function models(G){ const gr = PR.groups.find(x => x.group === G.g); return gr ? gr.models : []; }
const pr = m => PR.prices[m] || null;
const payRange = m => { const sp = (PR.specs || {})[m]; if(!sp || !sp.length) return null; const v = sp.map(x => x[1] * 1000); return [Math.min(...v), Math.max(...v)]; };
function offer(G){ const ms = models(G), o = (PL.offers || []).filter(x => ms.includes(x.model) || ms.includes(x.cmodel)); if(!o.length) return null; const t = o.map(x => x.total26).filter(x => x != null); return {n: o.length, min: Math.min(...t), max: Math.max(...t)}; }
const tr = v => v == null ? "—" : fmtInt(v / 1e6) + " tr";

/* ---------- đối chiếu hình và bản đồ ---------- */
function reconcile(){
  const R = [];
  // giá
  Object.entries(IMG_PRICE).forEach(([m, [a, b]]) => { const p = pr(m); if(!p) return; const mi = (a + b) / 2, mo = (p[0] + p[1]) / 2, d = (mi - mo) / mo * 100;
    R.push({k: "Giá " + m, img: a === b ? "~" + a + " tr" : a + "–" + b + " tr", map: p[0] === p[1] ? p[0] + " tr" : p[0] + "–" + p[1] + " tr", d, ok: Math.abs(d) <= 10, use: "Giá công bố T11/2026", src: PR.catalog ? L(PR.catalog, "Bảng giá DOTHANH T11/2026") : "Bảng giá DOTHANH T11/2026"}); });
  // tải trọng
  Object.entries(IMG_PAY).forEach(([m, v]) => { const r = payRange(m); if(!r) return; const ok = v >= r[0] - 1 && v <= r[1] + 1; R.push({k: "Tải trọng " + m, img: fmtInt(v) + " kg", map: r[0] === r[1] ? fmtInt(r[0]) + " kg" : fmtInt(r[0]) + "–" + fmtInt(r[1]) + " kg", d: null, ok, use: "Bảng thông số theo từng loại thùng", src: L("https://www.dothanhauto.com/san-pham.html", "dothanhauto.com")}); });
  // mạng lưới
  const N = CV.NET, c1 = N.dealers.filter(d => d.tier === "C1").length, c2 = N.dealers.filter(d => d.tier === "C2").length, pv = new Set(N.dealers.map(d => d.province)).size;
  R.push({k: "Mạng lưới đại lý", img: "37 đại lý, 26 tỉnh", map: `${c1} cấp 1 + ${c2} cấp 2 = ${N.dealers.length} điểm, ${pv} tỉnh; ${N.stations.length} trạm dịch vụ`, d: null, ok: false, use: "Số tỉnh " + (pv === 26 ? "khớp hình (26)" : "khác hình (26)") + "; số điểm lấy theo website (19/11/2026), kế hoạch 2027: 34 đại lý cấp 1", src: L("https://www.dothanhauto.com/dai-ly.html", "dothanhauto.com/dai-ly")});
  if(M){ const S = segs(), t8 = sum(S.map(s => (M.monthly2026[s] || [])[7])), t10 = sum(S.map(s => M.national[s].m10_2026)), t10b = sum(S.map(s => M.national[s].m10_2025));
    R.push({k: "Thị trường xe thương mại tháng 8/2026", img: "8.258 xe (+5% so tháng trước)", map: fmtInt(t8) + " xe (8 phân khúc báo cáo IZ)", d: (8258 - t8) / t8 * 100, ok: Math.abs(8258 - t8) / t8 <= .05, use: "Báo cáo thị trường IZ", src: (M.sources && M.sources[0] && M.sources[0][1]) ? L(M.sources[0][1], M.sources[0][0]) : "Báo cáo nội bộ IZ T10/2026"});
    R.push({k: "Tăng trưởng thị trường", img: "+19% so cùng kỳ (8 tháng 2026)", map: `${fmt1((t10 / t10b - 1) * 100)}% (10 tháng 2026 so 10 tháng 2025)`, d: null, ok: false, use: "10 tháng theo báo cáo IZ; kỳ khác nhau nên không so trực tiếp", src: "Báo cáo nội bộ IZ T10/2026"}); }
  R.push({k: "Chính sách bán hàng", img: "MISSU, IZ, DAEWOO: tháng 9/2026; JP: tháng 7/2026", map: "Tháng 11/2026 (TB 232, 233, 211, 234; hiệu lực 06–30/11)", d: null, ok: false, use: "Chính sách T11/2026; hình là kỳ cũ, không dùng", src: "Thông báo DAC T11/2026 (nội bộ)"});
  R.push({k: "Cơ cấu phân khúc thị trường", img: "< 1,5 t 18%; 1,5–3,5 t 39%; 7–16 t 32%; > 16 t 11%", map: "8 phân khúc theo tổng tải (xem mục Thị trường)", d: null, ok: false, use: "Hai cách chia khác nhau, không so từng con số; dùng 8 phân khúc của bản đồ", src: IMG});
  R.push({k: "Công suất nhà máy", img: "22.500 xe/năm", map: "Chưa có số công suất trong dữ liệu bản đồ", d: null, ok: null, use: "Chờ Nhà máy xác nhận", src: IMG});
  R.push({k: "Sản lượng toàn thị trường 2025", img: "VAMA Truck 70.746 xe (+24%); Commercial Vehicles 79.414 xe (+23%)", map: "Báo cáo IZ dùng 8 phân khúc, quy năm 2026 = " + (M ? fmtInt(M.annual2026) : "—") + " xe", d: null, ok: null, use: "Phạm vi khác nhau, chưa so được", src: IMG});
  R.push({k: "Giá tham chiếu đối thủ", img: "IZ250/IZ350 ~370 tr; Thaco K250/K250L ~450 tr; Hyundai N250/N250SL ~480 tr; Isuzu QKR ~560 tr", map: "Thaco Kia K250: đại lý bán 392–480 tr (bảng giá đại lý)", d: null, ok: null, use: "Dùng bảng giá đối thủ có nguồn ở tab Đối thủ", src: IMG});
  return R;
}

/* ---------- độ trễ điều hành ---------- */
function bottlenecks(){
  const cash = CV.cashCalc ? CV.cashCalc() : null, I = CV.inv, pm = CV.pendingMinutes ? CV.pendingMinutes().filter(x => x.lv !== "new") : [];
  let tonOld = null; if(I && I.dealers){ try{ tonOld = sum(I.dealers.map(d => (d.lines || []).reduce((s, l) => s + (((l.age || {})["181-365"]) || 0) + (((l.age || {})[">365"]) || 0), 0))); }catch(e){} }
  return [
    {n: 1, t: "Chương trình bán hàng có nhưng triển khai chưa đủ nhanh và đồng bộ", res: "Sức bán không được kích hoạt", fix: "Cảnh báo sớm chương trình sắp hết hạn; mỗi chương trình có người phụ trách, hạn, trạng thái triển khai từng đại lý", metric: "Thời gian từ ra thông báo đến đại lý triển khai: chưa có số (chưa ghi nhận ngày triển khai)", open: "Thư ký họp"},
    {n: 2, t: "Giải chi, thanh toán và quyết toán chương trình còn độ trễ", res: "Chính sách mất hiệu lực; chậm dòng tiền đại lý", fix: "Quy định thời hạn từng bước; theo dõi hồ sơ giải chi tồn đọng", metric: cash ? `Thời gian giải chi: chưa có số. Đang đo công nợ đại lý quá hạn ${fmt1(cash.overPct)}% (${fmt1(cash.over / 1000)} tỷ)` : "Chưa có số", open: "Dòng tiền"},
    {n: 3, t: "Cung ứng xe, dịch vụ và phụ tùng chưa kết nối thành một chuỗi", res: "Gián đoạn hoạt động", fix: "Theo dõi xuyên suốt: đặt xe, phân bổ VIN, PDI, phụ tùng, dịch vụ", metric: I ? `Tồn đại lý ${fmtInt(I.total)} xe${tonOld != null ? `, ${fmtInt(tonOld)} xe tồn trên 180 ngày` : ""}. Phụ tùng, PDI, thời gian phân bổ VIN: chưa có số` : "Chưa có số tồn", open: "Tồn kho"},
    {n: 4, t: "Chăm sóc khách hàng và xử lý khiếu nại chưa khép kín", res: "Giảm CSI, ảnh hưởng thương hiệu", fix: "Một đầu mối theo dõi khiếu nại; đo thời gian phản hồi và CSI", metric: "CSI, thời gian phản hồi khiếu nại: chưa có số (cần dữ liệu CSKH)", open: "Lịch chăm sóc"},
    {n: 5, t: "Họp nhiều nhưng việc đã thống nhất trôi qua", res: "Không có kết quả cụ thể, không đo được năng lực thực thi", fix: "Chốt biên bản ngay sau họp; việc giao có người, hạn, chỉ số, bằng chứng", metric: pm.length ? `${pm.length} cuộc họp quá 2 giờ chưa chốt biên bản` : "Không có biên bản quá hạn chốt", open: "Thư ký họp"},
  ];
}

/* ---------- chấm tên chương trình khuyến mãi ---------- */
const CRIT = [["Phù hợp mục tiêu kinh doanh", 20], ["Sức hấp dẫn với khách hàng", 20], ["Thể hiện lợi ích khuyến mãi", 15], ["Phù hợp thương hiệu DAC", 15], ["Khác biệt và sáng tạo", 10], ["Dễ nhớ, dễ truyền thông", 10], ["Phù hợp pháp lý, minh bạch", 10]];
const LS = "dac.promoName";
const loadN = () => { try{ return JSON.parse(localStorage.getItem(LS) || "null") || [{n: "", s: CRIT.map(() => "")}, {n: "", s: CRIT.map(() => "")}, {n: "", s: CRIT.map(() => "")}]; }catch(e){ return [{n: "", s: CRIT.map(() => "")}]; } };
const saveN = a => { try{ localStorage.setItem(LS, JSON.stringify(a)); }catch(e){} };
const score = c => c.s.every(v => v === "" || v == null) ? null : Math.round(sum(c.s.map((v, i) => (+v || 0) / 10 * CRIT[i][1])) * 10) / 10;

/* ---------- AI hỗ trợ (từ hình Anh gửi) ---------- */
const AI = [["Nghiên cứu thị trường, tìm nguồn", [["Perplexity", "https://www.perplexity.ai", "Tìm kiếm có nguồn dẫn"], ["NotebookLM", "https://notebooklm.google.com", "Tổng hợp tài liệu, ghi chú"], ["Otio", "https://otio.ai", "Trợ lý nghiên cứu"], ["Manus", "https://manus.im", "Tác tử nghiên cứu, nội dung"]]],
  ["Thiết kế, ảnh", [["Canva", "https://www.canva.com", "Thiết kế, bài đăng mạng xã hội"], ["Gamma", "https://gamma.app", "Bài thuyết trình"]]],
  ["Video, giọng nói", [["HeyGen", "https://www.heygen.com", "Video người ảo"], ["OpusClip", "https://www.opus.pro", "Cắt video dài thành video ngắn"], ["ElevenLabs", "https://elevenlabs.io", "Giọng đọc"]]],
  ["Tự động hóa", [["n8n", "https://n8n.io", "Quy trình tự động"], ["Zapier", "https://zapier.com", "Kết nối ứng dụng"], ["Make", "https://www.make.com", "Quy trình trực quan"]]]];


/* ---------- DAC AI Market & Customer Growth Intelligence: hiện trạng triển khai trong bản đồ ---------- */
const ST = {y: ["Có", "#4ee2a0"], p: ["Một phần", "#ffb020"], n: ["Chưa có", "#ff6b6b"]};
const stb = k => `<b style="color:${ST[k][1]}">${ST[k][0]}</b>`;
const hasTool = n => (CV.tools || []).some(t => t.name === n);
const CAP = [
  ["1. Market Intelligence", "p", "Thị trường 2026, Radar 20 chỉ số, 34 tỉnh, đối thủ, bản đồ 3D, dự báo SARIMAX và hồi quy; tab này", "Chưa thu thập tự động dữ liệu kinh tế, đầu tư, đấu thầu; cập nhật qua file và nút tìm nguồn bằng AI", "Thị trường 8 phân khúc; Radar; Chiến trường 2D"],
  ["2. Business Lead Generation", "p", "2.118 doanh nghiệp tiềm năng có tọa độ (OSM, danh sách xe hết niên hạn) gắn đại lý và sự kiện; chấm điểm LEAD ở mục dưới", "Chưa có mã LEAD duy nhất, kiểm tra trùng, hợp nhất hồ sơ; chưa tự tìm từ danh bạ doanh nghiệp, đấu thầu", "Khách hàng; chiến dịch MKT"],
  ["3. Customer Intelligence 360", "n", "Khách đã mua chỉ có tổng hợp theo huyện, không hồ sơ từng khách (cố ý, không lưu thông tin cá nhân)", "Cần CRM: lịch sử tương tác, báo giá, bảo dưỡng, hài lòng", "—"],
  ["4. AI Customer Care", "p", "Lịch chăm sóc khách, kịch bản bán hàng (Sale talk), Ben soạn nháp", "Chưa kết nối Zalo OA, email, tổng đài; chưa có đồng ý nhận tin, danh sách không liên hệ; không tự gửi tin", "Lịch chăm sóc; Sale talk"],
  ["5. Sales Growth & Conversion", "n", "Chỉ có trạng thái đơn giản “Chưa gọi” của danh sách tiềm năng", "Cần phễu 12 bước, lý do thất bại, người phụ trách từng LEAD", "—"],
  ["6. Dealer & Distribution Intelligence", "y", "Hồ sơ 360 đại lý, số bán, tồn, công nợ, chỉ tiêu 2027, chiến lược từng mặt trận, đề xuất mở đại lý", "Chưa có năng lực nhân sự, tỷ lệ chuyển đổi LEAD theo đại lý", "Chiến trường 2D; Hồ sơ đại lý; Tồn kho"],
  ["7. Business Performance", "p", "Doanh số, dự báo, kế hoạch 2027, dòng tiền, kiểm soát dữ liệu, DC-16 kỷ luật họp", "Chưa có lợi nhuận, CAC, ROI chiến dịch (chưa có dữ liệu chi phí)", "Dòng tiền; Kiểm soát dữ liệu"],
  ["8. AI Action Center", "p", "Đầu việc, điểm nghẽn, biên bản họp chốt việc, bảng năng lực Leader (Trung tâm điều hành)", "Cảnh báo chưa tự phát sinh từ mọi nguồn; chưa đo hiệu quả sau xử lý", "Trung tâm điều hành"],
];
const AGENTS = [["AI Commander", ["__ben"]], ["Market Research Agent", ["thi_truong_2026", "radar_kinh_te"]], ["Business Lead Hunter", ["khach_hang", "chien_dich_mkt"]], ["Customer Profiler", []], ["Lead Scoring Agent", ["__lead"]], ["Competitor Intelligence Agent", ["mang_luoi_doi_thu", "so_sanh_doi_thu", "doi_thu_tai_tinh", "chien_truong"]], ["Market Share Analyst", ["thi_truong_2026", "doi_dau_mau_xe"]], ["Economic Analyst", ["radar_kinh_te", "binh_phap_dia_ban"]], ["Sales Performance Analyst", ["doanh_so_chi_tiet", "ban_hang_chi_tiet", "ban_le_t11"]], ["Sales Target Optimizer", ["lo_trinh_2027", "du_bao_kinh_doanh"]], ["Business Plan Validator", []], ["Dealer Development Agent", ["de_xuat_chien_dich", "chien_truong"]], ["Sales Script Generator", ["__talk"]], ["Customer Care Agent", ["lich_cham_soc_khach"]], ["Customer Sentiment Agent", []], ["Conversion Optimizer", []], ["Customer Retention Agent", ["khach_hang"]], ["Business Bottleneck Analyst", ["ky_luat_hop", "dong_tien"]], ["Data Auditor", ["kiem_soat_du_lieu"]], ["Strategic Advisor", ["phong_chien_luoc", "nang_luc_canh_tranh"]]];
const OSS = [["Ollama", "https://github.com/ollama/ollama", "MIT", "Chạy mô hình ngôn ngữ nội bộ"], ["LangGraph", "https://github.com/langchain-ai/langgraph", "MIT", "Điều phối nhiều tác nhân AI"], ["n8n", "https://github.com/n8n-io/n8n", "Sustainable Use License (không phải mã nguồn mở theo OSI; hạn chế dùng thương mại)", "Tự động hóa quy trình: cần pháp chế xem điều khoản trước khi dùng"], ["PostgreSQL", "https://github.com/postgres/postgres", "PostgreSQL License", "Cơ sở dữ liệu chính"], ["pgvector", "https://github.com/pgvector/pgvector", "PostgreSQL License", "Tìm kiếm vector trong PostgreSQL"], ["DuckDB", "https://github.com/duckdb/duckdb", "MIT", "Phân tích dữ liệu tại chỗ"], ["Apache Superset", "https://github.com/apache/superset", "Apache-2.0", "Dashboard"], ["Metabase", "https://github.com/metabase/metabase", "AGPL-3.0 (bản thương mại riêng)", "Dashboard: AGPL cần xem xét nếu tích hợp vào sản phẩm"], ["Qdrant", "https://github.com/qdrant/qdrant", "Apache-2.0", "Cơ sở dữ liệu vector"], ["Playwright", "https://github.com/microsoft/playwright", "Apache-2.0", "Kiểm thử giao diện, thu thập trang công khai được phép"]];
const ACCEPT = [["Tích hợp đúng vào DAC ERP hiện hữu", "n", "Bản đồ chạy độc lập một file; chưa có mã nguồn, cơ sở dữ liệu, API của DAC ERP để tích hợp"], ["Không nhân bản hồ sơ khách hàng", "y", "Không lưu hồ sơ khách hàng cá nhân; danh sách tiềm năng là doanh nghiệp công khai"], ["Tìm và quản lý LEAD từ nguồn hợp pháp", "p", "Có danh sách OSM, xe hết niên hạn; chưa có quản lý vòng đời LEAD"], ["Chấm điểm LEAD có căn cứ, giải thích được", "y", "Mục chấm điểm LEAD: chỉ cộng điểm khi có bằng chứng, hiện lý do"], ["Phân tích thị trường, đối thủ, địa bàn", "y", "Tab này, Chiến trường 2D, thị trường 2026"], ["Tạo kịch bản chăm sóc cá nhân hóa", "p", "Có Sale talk, lịch chăm sóc; chưa theo hồ sơ từng khách"], ["Theo dõi phản hồi khách hàng", "n", "Chưa có dữ liệu tương tác"], ["Quản lý phễu chuyển đổi", "n", "Chưa có"], ["Nhận diện LEAD bị bỏ quên", "p", "Đếm LEAD chưa gọi, chưa gắn đại lý; chưa có hạn chăm sóc"], ["Đề xuất hành động và người chịu trách nhiệm", "p", "Chiến lược từng đại lý, đầu việc có PIC; chưa tự tạo từ cảnh báo"], ["Đo chuyển đổi, đơn hàng, doanh thu, hiệu quả", "p", "Doanh số, đơn bán có; chuyển đổi LEAD, CAC, ROI chưa có"], ["Báo cáo rà soát hàng tuần", "p", "Nút tạo báo cáo rà soát LEAD tuần (mục dưới), chạy khi bấm; chưa tự chạy theo lịch"], ["Phân quyền, bảo mật, lịch sử thao tác", "p", "Mã hóa AES-256-GCM, nhật ký thay đổi dữ liệu; chưa phân quyền theo vai trò"], ["Kiểm thử và bằng chứng nghiệm thu", "p", "Kiểm thử trình duyệt tự động cho từng module; chưa có kiểm thử bảo mật độc lập"], ["Không tự tạo dữ liệu, không tuyên bố tính năng chưa triển khai", "y", "Số chưa có ghi “chưa có số”; mục này liệt kê rõ phần chưa làm"]];

/* chấm điểm LEAD: chỉ cộng điểm khi có bằng chứng trong dữ liệu; tiêu chí không có bằng chứng để trống, không đoán */
const SECT_OK = /vận tải|logistic|xây dựng|nhà thầu|nông|thủy sản|thực phẩm|sản xuất|chế biến|phân phối|vật liệu|vật tư|khai thác|cảng|kho|thương mại|bán lẻ|siêu thị|đá|cát|xi măng|cao su|gỗ|thức ăn|đồ uống|nước/i;
function leadScore(p){
  const C = [];
  const ind = String(p.ind || "").trim();
  C.push(["Phù hợp ngành nghề", 15, ind ? (SECT_OK.test(ind) ? 15 : 5) : null, ind ? `Ngành “${ind}”` : "chưa có ngành"]);
  const note = String(p.note || ""), nx = +(note.match(/(\d+)\s*xe/i) || [])[1] || 0, eol = /niên hạn/i.test(note + " " + (p.src || ""));
  C.push(["Nhu cầu sản phẩm", 20, eol && nx ? (nx >= 5 ? 20 : nx >= 2 ? 15 : 10) : null, eol && nx ? `${nx} xe hết niên hạn (danh sách xe hết niên hạn)` : "chưa có bằng chứng nhu cầu"]);
  const stt = String(p.status || ""), sig = /quan tâm|hẹn|báo giá|chốt/i.test(stt);
  C.push(["Tín hiệu mua hàng", 20, sig ? 20 : null, sig ? `Trạng thái “${stt}”` : "chưa có tương tác, chưa có tín hiệu"]);
  const acc = (p.phone ? 5 : 0) + (p.web ? 3 : 0) + (p.exact ? 2 : 0);
  C.push(["Khả năng tiếp cận", 10, p.phone || p.web || p.addr ? acc : null, `${p.phone ? "SĐT công khai; " : ""}${p.web ? "website; " : ""}${p.exact ? "địa chỉ chính xác" : p.addr ? "địa chỉ gần đúng" : ""}`]);
  C.push(["Khả năng tài chính", 10, null, "chưa có bằng chứng tài chính (không suy đoán)"]);
  C.push(["Phù hợp sản phẩm", 15, p.seg ? 15 : null, p.seg ? `Dòng xe phù hợp: ${p.seg}` : "chưa xác định dòng xe"]);
  C.push(["Thời điểm mua", 10, p.invite ? 10 : null, p.invite ? `Có lịch tiếp cận: ${p.invite}` : "chưa có lịch"]);
  const E = sum(C.map(c => c[2] || 0)), Mx = sum(C.filter(c => c[2] != null).map(c => c[1]));
  const conf = Mx, ratio = Mx ? E / Mx : 0; let grp = conf < 40 ? "D" : ratio >= .75 ? "A" : ratio >= .55 ? "B" : ratio >= .35 ? "C" : "D";
  if(grp === "A" && !sig) grp = "B";   // chưa có tín hiệu mua thì không xếp ưu tiên cao
  return {C, E, Mx, ratio, grp, sig};
}
let _ls = null;
function leads(){ if(_ls) return _ls; const P = (CV.MKT && CV.MKT.prospects) || []; _ls = P.map(p => ({p, s: leadScore(p)})); return _ls; }
function leadHtml(){
  const L = leads(); if(!L.length) return "<p class='muted'>Chưa có danh sách doanh nghiệp tiềm năng.</p>";
  const g = {A: 0, B: 0, C: 0, D: 0}; L.forEach(x => g[x.s.grp]++);
  const top = L.filter(x => x.s.grp !== "D").sort((a, b) => b.s.E - a.s.E || b.s.ratio - a.s.ratio).slice(0, 15), noDealer = L.filter(x => x.p.dealer == null || x.p.dealer === "").length, called = L.filter(x => x.p.status && !/chưa gọi/i.test(x.p.status)).length;
  const dealers = (CV.MKT && CV.MKT.dealers) || [];
  return `<p class="small">Khung 100 điểm: ngành nghề 15, nhu cầu sản phẩm 20, tín hiệu mua 20, tiếp cận 10, tài chính 10, phù hợp sản phẩm 15, thời điểm 10. <b>Chỉ cộng điểm khi dữ liệu có bằng chứng</b>; tiêu chí chưa có bằng chứng để trống (không đoán). Mỗi LEAD hiện điểm đạt, điểm tối đa có bằng chứng (độ tin cậy) và lý do.</p>
  <div class="stats num">${[[g.A, "nhóm A (ưu tiên cao)"], [g.B, "nhóm B (có tiềm năng)"], [g.C, "nhóm C (cần nuôi dưỡng)"], [g.D, "nhóm D (chưa đủ thông tin hoặc chưa phù hợp)"], [fmtInt(L.length), "tổng doanh nghiệp tiềm năng"], [fmtInt(called) + " / " + fmtInt(L.length), "đã có tương tác (trạng thái khác “Chưa gọi”)"]].map(([v, l]) => `<div class="stat"><div class="v">${esc(v)}</div><div class="l">${esc(l)}</div></div>`).join("")}</div>
  <p class="tiny" style="color:#ffb020;margin:6px 0">Ngưỡng nhóm (A từ 75%, B từ 55%, C từ 35% điểm có bằng chứng; D khi độ tin cậy dưới 40 điểm; chưa có tín hiệu mua thì tối đa nhóm B) là <b>đề xuất, chờ phê duyệt</b>. Tín hiệu mua và tài chính chưa có dữ liệu nên điểm hiện chỉ phản ánh phù hợp và nhu cầu, chưa phản ánh khả năng mua thực tế.</p>
  <div style="max-height:360px;overflow:auto"><table class="tasktbl small"><thead><tr><th>Doanh nghiệp</th><th>Tỉnh</th><th>Đại lý phụ trách</th><th class="num">Điểm</th><th class="num">Tin cậy</th><th>Nhóm</th><th>Lý do (bằng chứng)</th><th></th></tr></thead><tbody>${top.map(x => `<tr><td>${esc(x.p.name)}</td><td>${esc(x.p.province)}</td><td class="tiny">${esc(String(dealers[x.p.dealer] || "chưa phân công").split("–")[0].trim())}</td><td class="num"><b>${x.s.E}</b>/${x.s.Mx}</td><td class="num">${x.s.Mx}/100</td><td><b>${x.s.grp}</b></td><td class="tiny">${esc(x.s.C.filter(c => c[2] != null).map(c => c[0] + " " + c[2] + "/" + c[1] + " (" + c[3] + ")").join("; "))}</td><td>${x.p.lat != null ? L2(gmUrl(x.p), "Maps") : ""}</td></tr>`).join("")}</tbody></table></div>
  <p class="tiny muted">LEAD chưa gắn đại lý: ${fmtInt(noDealer)}. Nguồn: danh sách doanh nghiệp từ OpenStreetMap và danh sách xe hết niên hạn (Cục Đăng kiểm, qua DAC), chiến dịch MKT 2027 (nội bộ). Không hiển thị số điện thoại; không lưu thông tin cá nhân.</p>`;
}
const L2 = (u, t) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(t)}</a>`;
const gmUrl = p => "https://www.google.com/maps/search/?api=1&query=" + p.lat + "," + p.lng;
function weekly(){
  const L = leads(), td = new Date().toLocaleDateString("vi-VN"), g = {A: 0, B: 0, C: 0, D: 0}; L.forEach(x => g[x.s.grp]++);
  const noDealer = L.filter(x => x.p.dealer == null || x.p.dealer === "").length, called = L.filter(x => x.p.status && !/chưa gọi/i.test(x.p.status)).length, ev = ((CV.MKT && CV.MKT.events) || []);
  const next = ev.filter(e => e.date >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8), pm = CV.pendingMinutes ? CV.pendingMinutes().filter(x => x.lv !== "new") : [];
  return `# Rà soát LEAD và chuyển đổi hàng tuần\n**Ngày chốt dữ liệu:** ${td}. **Nguồn:** chiến dịch MKT 2027 (mkt2027.json, ${(CV.MKT && CV.MKT.asOf) || "chưa rõ ngày"}), điểm LEAD tính từ bằng chứng có trong dữ liệu.\n\n## 1. Số liệu thực tế\n- Tổng doanh nghiệp tiềm năng: ${fmtInt(L.length)}; nhóm A ${g.A}, B ${g.B}, C ${g.C}, D ${g.D} (ngưỡng đề xuất, chờ phê duyệt).\n- Đã có tương tác: ${fmtInt(called)}. **Không có số** về LEAD mới trong tuần, tỷ lệ phản hồi, báo giá, đơn hàng vì chưa có dữ liệu CRM.\n- Chưa gắn đại lý phụ trách: ${fmtInt(noDealer)}.\n- Chưa so sánh với kỳ trước: chưa lưu lịch sử tuần.\n\n## 2. Việc cần làm trong 7 ngày tới (theo lịch chiến dịch)\n${next.length ? next.map(e => `- ${e.date}: ${e.province}, ${e.typeName || e.type}${e.place ? ", " + e.place : ""}`).join("\n") : "- Không có sự kiện trong lịch."}\n\n## 3. Cảnh báo kỷ luật\n${pm.length ? pm.map(x => `- Biên bản chưa chốt: ${x.title} (${x.hours} giờ)`).join("\n") : "- Không có biên bản quá hạn chốt."}\n\n## 4. Nhận định AI (tách khỏi số liệu)\n- Danh sách hiện chỉ cho biết ai phù hợp và có nhu cầu thay xe (xe hết niên hạn); chưa có bằng chứng ai sẵn sàng mua. Ưu tiên gọi nhóm A, B trước, ghi lại kết quả vào Nhập dữ liệu để có số chuyển đổi tuần sau.\n\n## 5. Hành động tuần tới\n| Việc | PIC | SUB | Hạn |\n|---|---|---|---|\n| Gắn đại lý phụ trách cho LEAD chưa phân công | (chờ Giám đốc kinh doanh chỉ định) | | |\n| Gọi nhóm A, B và ghi trạng thái | Đại lý phụ trách | Marketing | |\n| Phê duyệt ngưỡng nhóm A/B/C/D | Giám đốc kinh doanh | | |`;
}
function growthHtml(){
  const rows = CAP.map(c => `<tr><td><b>${esc(c[0])}</b></td><td>${stb(c[1])}</td><td class="tiny">${esc(c[2])}</td><td class="tiny">${esc(c[3])}</td></tr>`).join("");
  const ag = AGENTS.map(([n, ts]) => { const real = ts.filter(t => !t.startsWith("__") && hasTool(t)); const ok = ts.includes("__ben") || ts.includes("__lead") || ts.includes("__talk") || real.length; return `<tr><td>${esc(n)}</td><td>${ok ? stb(ts.length && real.length === ts.filter(t => !t.startsWith("__")).length ? "y" : "p") : stb("n")}</td><td class="tiny">${ts.includes("__ben") ? "Ben chọn công cụ theo câu hỏi (pickTools)" : ts.includes("__lead") ? "Chấm điểm LEAD (mục trên)" : ts.includes("__talk") ? "Sale talk (tab Đối thủ trong Ben)" : real.length ? real.join(", ") : "chưa có"}</td></tr>`; }).join("");
  return `<p class="small">Master prompt DAC AI Market &amp; Customer Growth Intelligence yêu cầu một hệ thống tích hợp DAC ERP. Bản đồ 3D hiện là <b>một file độc lập, không có mã nguồn hay cơ sở dữ liệu của DAC ERP</b>, nên em triển khai phần phân tích chạy được ngay trên dữ liệu đã có, và ghi rõ phần còn thiếu thay vì tuyên bố đã tích hợp.</p>
  <h4 style="margin:8px 0 4px">8 nhóm năng lực: hiện trạng</h4><table class="tasktbl small"><thead><tr><th>Nhóm</th><th>Trạng thái</th><th>Đã có</th><th>Còn thiếu</th></tr></thead><tbody>${rows}</tbody></table>
  <h4 style="margin:12px 0 4px">Chấm điểm LEAD (khung 100 điểm)</h4>${leadHtml()}
  <div style="margin:8px 0"><button type="button" class="primary" data-wk="1">Tạo báo cáo rà soát LEAD tuần</button> <span class="tiny muted">kết quả gửi vào khung chat của Ben</span></div>
  <h4 style="margin:12px 0 4px">Phễu bán hàng 12 bước: dữ liệu hiện có</h4>${funnelHtml()}
  <h4 style="margin:12px 0 4px">20 tác nhân AI: ánh xạ vào công cụ của Ben</h4><table class="tasktbl small"><thead><tr><th>Tác nhân</th><th>Trạng thái</th><th>Công cụ hiện có</th></tr></thead><tbody>${ag}</tbody></table>
  <h4 style="margin:12px 0 4px">Quyền hạn AI: ba cấp</h4><table class="tasktbl small"><tbody><tr><td><b>Cấp 1: AI tự thực hiện</b></td><td class="tiny">Phân tích, tổng hợp, chấm điểm LEAD, soạn nháp, cảnh báo, đề xuất. Đang chạy trong bản đồ.</td></tr><tr><td><b>Cấp 2: AI đề xuất, người duyệt</b></td><td class="tiny">Sửa số liệu bản đồ: Ben báo trước và sau, có hoàn tác, ghi Nhật ký thay đổi dữ liệu. Gửi tin cho khách, kích hoạt chiến dịch, đổi chỉ tiêu: bản đồ không tự thực hiện.</td></tr><tr><td><b>Cấp 3: chỉ người có thẩm quyền</b></td><td class="tiny">Giá, chính sách, ngân sách, cam kết thương mại, công nợ, xóa dữ liệu: bản đồ không có chức năng này. Phân quyền theo vai trò chưa có (chỉ có quyền Host chốt biên bản khi mở trong Claude).</td></tr></tbody></table>
  <h4 style="margin:12px 0 4px">Công nghệ mã nguồn mở đề xuất</h4><p class="tiny muted">Giấy phép ghi theo hiểu biết của em, <b>chưa kiểm tra trực tiếp trên từng repo</b> (phiên này không đọc được GitHub bên ngoài). Mức bảo trì, lỗ hổng đã biết, yêu cầu hạ tầng, chi phí vận hành: chưa kiểm. Phải xác minh trước khi chọn; số sao không chứng minh an toàn.</p>
  <table class="tasktbl small"><thead><tr><th>Dự án</th><th>Giấy phép (cần xác minh)</th><th>Dùng cho</th></tr></thead><tbody>${OSS.map(o => `<tr><td>${L2(o[1], o[0])}</td><td class="tiny">${esc(o[2])}</td><td class="tiny">${esc(o[3])}</td></tr>`).join("")}</tbody></table>
  <h4 style="margin:12px 0 4px">15 tiêu chuẩn nghiệm thu: tự đánh giá</h4><table class="tasktbl small"><tbody>${ACCEPT.map((a, i) => `<tr><td>${i + 1}. ${esc(a[0])}</td><td>${stb(a[1])}</td><td class="tiny">${esc(a[2])}</td></tr>`).join("")}</tbody></table>
  <p class="tiny muted">Cần từ Anh để làm tiếp: quyền truy cập mã nguồn và cơ sở dữ liệu DAC ERP; dữ liệu CRM (tương tác, báo giá, khiếu nại, hài lòng); kênh Zalo OA, email được cấp quyền; ngưỡng nhóm LEAD và KPI được phê duyệt; dữ liệu chi phí chiến dịch để tính CAC, ROI.</p>`;
}
function funnelHtml(){
  const L = leads(), n = L.length, id = L.filter(x => x.p.ind && x.p.addr).length, q = L.filter(x => x.s.Mx > 0).length, eng = L.filter(x => x.p.status && !/chưa gọi/i.test(x.p.status)).length;
  const S = [["1. Discovery: phát hiện", n, "Doanh nghiệp trong danh sách tiềm năng"], ["2. Identification: xác định thông tin", id, "Có ngành và địa chỉ"], ["3. Qualification: đánh giá LEAD", q, "Có ít nhất một tiêu chí chấm được"], ["4. Engagement: tiếp cận", eng, "Trạng thái khác “Chưa gọi”"], ["5. Nurturing: nuôi dưỡng", null, "Chưa có dữ liệu"], ["6. Sales Opportunity: cơ hội", null, "Chưa có dữ liệu"], ["7. Consultation: tư vấn", null, "Chưa có dữ liệu"], ["8. Negotiation: đàm phán", null, "Chưa có dữ liệu"], ["9. Conversion: đơn hàng", null, "Chưa gắn đơn hàng với LEAD"], ["10. Delivery: giao xe", null, "Chưa gắn với LEAD"], ["11. Retention: duy trì", null, "Chưa có dữ liệu"], ["12. Referral: giới thiệu", null, "Chưa có dữ liệu"]];
  return `<table class="tasktbl small"><tbody>${S.map(s => `<tr><td>${esc(s[0])}</td><td class="num">${s[1] == null ? "chưa có số" : fmtInt(s[1])}</td><td class="tiny">${esc(s[2])}</td></tr>`).join("")}</tbody></table><p class="tiny muted">Mỗi giai đoạn cần điều kiện bắt đầu, tiêu chí hoàn thành, người phụ trách, hạn, lý do thất bại: chưa có nơi ghi trong bản đồ, cần CRM của DAC ERP.</p>`;
}

/* ---------- vẽ ---------- */
const COL = {ok: "#4ee2a0", bad: "#ff6b6b", na: "#8ea7c7"};
const dot = ok => `<i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${ok === true ? COL.ok : ok === false ? COL.bad : COL.na};margin-right:5px"></i>`;
function kpis(){
  if(!M) return "";
  const S = segs().map(segStat), dts = S.filter(x => x.hasRank), dtN = sum(dts.map(x => x.dt)), ttN = sum(dts.map(x => x.tt)), best = dts.slice().sort((a, b) => b.share - a.share)[0], low = dts.slice().sort((a, b) => a.share - b.share)[0];
  const rank = (M.rank10T || []).findIndex(x => x[0] === "DOTHANH") + 1;
  const items = [[dtN ? fmt1(dtN / ttN * 100) + "%" : "—", "thị phần ĐT trong 5 phân khúc có số (10T/2026)", `${fmtInt(dtN)} / ${fmtInt(ttN)} xe`], [rank ? "Hạng " + rank : "—", "xếp hạng thương hiệu 10T/2026", `${(M.rank10T || []).length} thương hiệu`], [best ? SEGN[best.s] : "—", "phân khúc ta mạnh nhất", best ? fmt1(best.share) + "%" : ""], [low ? SEGN[low.s] : "—", "phân khúc ta yếu nhất (có số)", low ? fmt1(low.share) + "%" : ""],
    [fmt1(sum(segs().map(s => M.national[s].m10_2026)) / sum(segs().map(s => M.national[s].m10_2025)) * 100 - 100) + "%", "thị trường 8 phân khúc, 10T so cùng kỳ", fmtInt(sum(segs().map(s => M.national[s].m10_2026))) + " xe"]];
  return `<div class="stats num">${items.map(([v, l, s]) => `<div class="stat"><div class="v">${esc(v)}</div><div class="l">${esc(l)}</div><div class="tiny muted">${esc(s)}</div></div>`).join("")}</div>`;
}
function insights(){
  const out = [], G = GROUPS.map(g => [g, groupStat(g)]);
  G.forEach(([g, s]) => { if(s.ranked && s.share != null) out.push(`<b>${esc(g.name)}</b>: thị phần ${fmt1(s.share)}% (${fmtInt(s.dt)}/${fmtInt(s.tt)} xe), thị trường ${s.g >= 0 ? "+" : ""}${fmt1(s.g)}%; đối thủ mạnh nhất ${s.top.slice(0, 3).map(x => x[0] + " " + fmtInt(x[1])).join(", ")}.`); else if(s.tt) out.push(`<b>${esc(g.name)}</b>: thị trường ${fmtInt(s.tt)} xe (${s.g >= 0 ? "+" : ""}${fmt1(s.g)}%); <span style="color:#ffb020">chưa có số xe bán theo hãng ở phân khúc này</span>, cần nhập để tính thị phần.`); });
  const rc = reconcile().filter(r => r.d != null && r.k.startsWith("Giá ")), off = rc.filter(r => !r.ok).length; if(rc.length) out.push(`Đối chiếu giá: ${off}/${rc.length} mẫu trong hình lệch trên 10% so với bảng giá công bố T11/2026; <b>bản đồ dùng bảng giá công bố</b>.`);
  return out;
}
function paneHtml(){
  return `${kpis()}<h4 style="margin:10px 0 4px">Nhận định chính</h4><ul class="small" style="margin:0;padding-left:18px">${insights().map(x => `<li>${x}</li>`).join("") || "<li class='muted'>Chưa đủ dữ liệu</li>"}</ul>
  <div style="display:flex;flex-wrap:wrap;gap:6px;margin:10px 0"><button type="button" class="primary" data-nc="all">Xem đầy đủ</button><button type="button" data-nc="pillar">4 trụ cột sản phẩm</button><button type="button" data-nc="recon">Đối chiếu hình và bản đồ</button><button type="button" data-nc="lag">Độ trễ điều hành</button><button type="button" data-nc="promo">Đặt tên khuyến mãi</button><button type="button" data-nc="growth">Tăng trưởng và LEAD (DAC AI)</button></div>
  <p class="tiny muted">Số có nguồn (bảng giá công bố, báo cáo thị trường, website Đô Thành) được ưu tiên; số chỉ có trong hình ghi rõ “theo hình”.</p>`;
}
function pillarCard(G){
  const s = groupStat(G), ms = models(G), of = offer(G);
  const rows = ms.map(m => { const p = pr(m), py = payRange(m), ip = IMG_PRICE[m]; return `<tr><td><b>${esc(m)}</b></td><td class="num">${p ? (p[0] === p[1] ? p[0] : p[0] + "–" + p[1]) + " tr" : "chưa có trong bảng giá"}</td><td class="num">${py ? (py[0] === py[1] ? fmtInt(py[0]) : fmtInt(py[0]) + "–" + fmtInt(py[1])) + " kg" : "—"}</td><td class="num tiny muted">${ip ? (ip[0] === ip[1] ? "~" + ip[0] : ip[0] + "–" + ip[1]) + " tr" : G.g === "DAEWOO TRUCKS" ? ((IMG_DAEWOO.find(x => x[0].startsWith(m)) || [])[1] || "—") : "—"}</td></tr>`; }).join("");
  return `<div class="hp w6" style="border-top:3px solid ${G.col}"><h3 style="color:${G.col}">${esc(G.name)} <span>${esc(G.tag)}</span></h3>
   <p class="small" style="margin:2px 0"><b>Chân dung người mua:</b> ${esc(G.who)}<br><b>Ngành hàng, bài toán:</b> ${esc(G.ind)}<br><b>Điều họ quan tâm:</b> ${esc(G.care)}<br><b>Định vị:</b> ${esc(G.pos)} <span class="muted">Động cơ ${esc(G.engine)}.</span>${G.note ? " " + esc(G.note) + "." : ""}</p>
   <p class="tiny muted" style="margin:2px 0">Chân dung là mục tiêu định tính (theo hình), cần kiểm chứng bằng CRM, phỏng vấn khách hàng và kết quả bán hàng từng địa bàn. Nguồn: ${esc(IMG)}.</p>
   <table class="tasktbl small"><thead><tr><th>Mẫu</th><th class="num">Giá công bố T11/2026</th><th class="num">Tải trọng (bảng thông số)</th><th class="num">Giá theo hình</th></tr></thead><tbody>${rows}</tbody></table>
   <p class="small" style="margin:6px 0"><b>Thị trường phân khúc:</b> ${G.segs.map(x => SEGN[x] + " (" + SEGD[x] + ")").join(", ")}: ${s.tt ? fmtInt(s.tt) + " xe 10T/2026, " + (s.g >= 0 ? "+" : "") + fmt1(s.g) + "% so cùng kỳ" : "chưa có số"}.<br><b>Thị phần Đô Thành:</b> ${s.share != null ? fmt1(s.share) + "% (" + fmtInt(s.dt) + " xe)" : "chưa có số xe bán theo hãng ở phân khúc này"}.<br><b>Đối thủ trong dữ liệu:</b> ${s.top.length ? s.top.map(x => esc(x[0]) + " " + fmtInt(x[1])).join(", ") : "chưa có"}; <b>đối thủ theo hình:</b> ${esc(G.rivals)}.<br><b>Ưu đãi T11/2026:</b> ${of ? `${of.n} mẫu, tổng ưu đãi khách ${tr(of.min)}–${tr(of.max)}` : "chưa có trong bảng ưu đãi"}.</p>
   <p class="tiny muted">Nguồn: ${PR.catalog ? L(PR.catalog, "Bảng giá DOTHANH T11/2026") : "Bảng giá DOTHANH T11/2026"} · ${L("https://www.dothanhauto.com/san-pham.html", "Trang sản phẩm")} · báo cáo thị trường IZ T10/2026 (nội bộ)</p></div>`;
}
function marketTable(){
  if(!M) return "<p class='muted'>Chưa có dữ liệu thị trường</p>";
  const S = segs().map(segStat), tot = sum(S.map(x => x.tt));
  return `<table class="tasktbl small"><thead><tr><th>Phân khúc</th><th>Cỡ tải</th><th class="num">10T/2026</th><th class="num">Cơ cấu</th><th class="num">So cùng kỳ</th><th class="num">Đô Thành</th><th class="num">Thị phần ĐT</th><th>Đối thủ đứng đầu</th></tr></thead><tbody>${S.map(x => `<tr><td>${esc(SEGN[x.s] || x.s)}</td><td class="tiny">${esc(SEGD[x.s] || "")}</td><td class="num">${fmtInt(x.tt)}</td><td class="num">${fmt1(x.tt / tot * 100)}%</td><td class="num">${x.g >= 0 ? "+" : ""}${fmt1(x.g)}%</td><td class="num">${x.hasRank ? fmtInt(x.dt) : "chưa có số"}</td><td class="num">${x.share != null ? fmt1(x.share) + "%" : "—"}</td><td class="tiny">${x.top.map(t => esc(t[0]) + " " + fmtInt(t[1])).join(", ") || "chưa có số xe bán theo hãng"}</td></tr>`).join("")}</tbody></table>
  <p class="tiny muted">Nguồn: báo cáo thị trường IZ tháng 10/2026 (nội bộ), số đăng ký theo hãng. Phân khúc tải trung, nặng chưa có số theo hãng nên chưa tính được thị phần JP và DAEWOO: cần nhập thêm. ${CV.NET ? "" : ""}</p>`;
}
function reconTable(){
  const R = reconcile(), ok = R.filter(r => r.ok === true).length, bad = R.filter(r => r.ok === false).length;
  return `<p class="small">Hình Anh gửi là bản tóm tắt định tính; một số con số khác với dữ liệu có nguồn trên bản đồ. Quy tắc thống nhất: <b>số có nguồn công bố mới nhất được dùng</b>, số trong hình để tham khảo. Kết quả: ${ok} khớp, ${bad} lệch, ${R.length - ok - bad} chưa so được.</p>
  <div style="max-height:420px;overflow:auto"><table class="tasktbl small"><thead><tr><th>Hạng mục</th><th>Theo hình</th><th>Theo bản đồ</th><th class="num">Lệch</th><th>Dùng số nào</th><th>Nguồn</th></tr></thead><tbody>${R.map(r => `<tr><td>${dot(r.ok)}${esc(r.k)}</td><td class="tiny">${esc(r.img)}</td><td class="tiny">${esc(r.map)}</td><td class="num">${r.d != null ? (r.d >= 0 ? "+" : "") + fmt1(r.d) + "%" : "—"}</td><td class="tiny">${esc(r.use)}</td><td class="tiny">${typeof r.src === "string" && r.src.startsWith("<a") ? r.src : esc(r.src)}</td></tr>`).join("")}</tbody></table></div>`;
}
function lagHtml(){
  const B = bottlenecks();
  return `<p class="small"><b>Điểm nghẽn không nằm ở chính sách hay nguồn lực mà ở tốc độ phối hợp</b> giữa Nhà máy, phòng ban, đại lý, khách hàng và trách nhiệm theo đuổi đến khi có kết quả. Chuỗi giá trị: Nhà máy DAC (sản phẩm, chính sách, nguồn lực, phê duyệt) → Kinh doanh, Tài chính, Dịch vụ – Phụ tùng, Marketing – CSKH → Hệ thống đại lý → Khách hàng. Bản đồ này đóng vai trò DAC Control Tower: giám sát xuyên suốt, cảnh báo sớm, xử lý đến cùng.</p>
  <table class="tasktbl small"><thead><tr><th></th><th>Điểm nghẽn</th><th>Hệ quả</th><th>Việc tháo gỡ</th><th>Chỉ số đang đo</th><th></th></tr></thead><tbody>${B.map(b => `<tr><td><b>${b.n}</b></td><td>${esc(b.t)}</td><td class="tiny">${esc(b.res)}</td><td class="tiny">${esc(b.fix)}</td><td class="tiny">${esc(b.metric)}</td><td><button type="button" data-open="${esc(b.open)}">${esc(b.open)}</button></td></tr>`).join("")}</tbody></table>
  <p class="tiny muted" style="margin-top:6px"><b>Bộ chỉ số lãnh đạo cần kiểm soát:</b> bán hàng (doanh số, tỷ lệ chuyển đổi); chính sách (thời gian phê duyệt, triển khai); giải chi (giá trị tồn đọng, đúng hạn); giao xe (tiến độ VIN, PDI); phụ tùng (tỷ lệ đáp ứng); dịch vụ (doanh thu, năng suất); CSKH (thời gian phản hồi, CSI); đại lý (ES, CS, DS: nhân sự, khách hàng, đại lý hài lòng). Chỉ số nào chưa có dữ liệu thì ghi “chưa có số”, không điền. Nguồn: ${esc(IMG)} và dữ liệu bản đồ.</p>`;
}
function promoHtml(){
  const C = loadN();
  return `<p class="small">Mục tiêu: <b>ĐÚNG – TRÚNG – NHỚ</b>. Chấm từng tên đề xuất (3–5 tên) theo ma trận 100 điểm, mỗi tiêu chí 0–10. Không chọn tên chỉ vì nghe hay; phải gắn mục tiêu và lợi ích khách hàng, bảo đảm pháp lý, minh bạch, đồng hành thương hiệu DAC.</p>
  <div style="overflow-x:auto"><table class="tasktbl small" id="ncPromo"><thead><tr><th>Tên đề xuất</th>${CRIT.map(c => `<th class="num" title="${esc(c[0])}">${esc(c[0])}<br>${c[1]}%</th>`).join("")}<th class="num">Điểm /100</th></tr></thead><tbody>${C.map((c, i) => `<tr><td><input type="text" data-pn="${i}" value="${esc(c.n)}" placeholder="Tên chương trình" style="min-width:160px"></td>${c.s.map((v, j) => `<td><input type="number" min="0" max="10" step="0.5" data-ps="${i}:${j}" value="${esc(v)}" style="width:56px"></td>`).join("")}<td class="num"><b>${score(c) == null ? "—" : fmt1(score(c))}</b></td></tr>`).join("")}</tbody></table></div>
  <div style="margin:6px 0"><button type="button" data-pa="add">Thêm tên</button> <button type="button" data-pa="clear">Xóa bảng</button></div>
  <p class="small"><b>Quy trình:</b> xác định mục tiêu → đề xuất 3–5 tên → chấm điểm → kiểm tra thực tế (trùng lặp, pháp lý) → phê duyệt tên chính thức → triển khai đồng bộ. <b>8 yếu tố:</b> mục tiêu kinh doanh, khách hàng mục tiêu, thông điệp truyền thông, sức hấp dẫn, nhận diện thương hiệu, tính khác biệt, khả năng ứng dụng, tính pháp lý.</p><p class="tiny muted">Ma trận lấy từ ${esc(IMG)}; điểm chấm do người dùng nhập, bản đồ chỉ cộng theo trọng số.</p>`;
}
function aiHtml(){
  return `<p class="small">Danh mục công cụ AI trong hình Anh gửi, chọn những công cụ hợp với nghiên cứu thị trường và marketing. Công cụ bên thứ ba: bản miễn phí có giới hạn, tính năng và giá thay đổi, <b>không gửi dữ liệu nội bộ, tên khách, số khung</b>. Muốn tìm dẫn chứng thị trường: dùng nút Tìm nguồn bằng AI.</p>
  <div class="hudgrid">${AI.map(([t, items]) => `<div class="hp w6"><h3>${esc(t)}</h3><ul class="small" style="margin:0;padding-left:18px">${items.map(([n, u, d]) => `<li>${L(u, n)}: ${esc(d)}</li>`).join("")}</ul></div>`).join("")}</div>`;
}
const dlg = document.createElement("dialog"); dlg.className = "odlg"; dlg.id = "ncDlg"; dlg.style.width = "min(1280px,98vw)"; dlg.setAttribute("aria-labelledby", "ncT");
dlg.innerHTML = `<header><h3 id="ncT">Năng lực cạnh tranh</h3><button type="button" id="ncBen">Ben phân tích</button><button type="button" id="ncRes">Tìm nguồn bằng AI</button><button type="button" class="x" data-close>Đóng</button></header><div class="body" id="ncBody"></div>`;
document.body.appendChild(dlg);
const sec = (id, t, sub, body, open) => `<details id="nc-${id}" ${open ? "open" : ""} style="margin:10px 0"><summary style="cursor:pointer;font-weight:600;font-size:1.05em">${esc(t)} <span class="muted small">${esc(sub || "")}</span></summary><div style="margin-top:8px">${body}</div></details>`;
function full(open){
  const o = open || "pillar";
  dlg.querySelector("#ncBody").innerHTML = `${kpis()}<h4 style="margin:10px 0 4px">Nhận định chính</h4><ul class="small" style="margin:0 0 6px;padding-left:18px">${insights().map(x => `<li>${x}</li>`).join("")}</ul>`
    + sec("pillar", "4 trụ cột sản phẩm", "chân dung khách hàng, giá, tải trọng, thị phần, đối thủ", `<div class="hudgrid">${GROUPS.map(pillarCard).join("")}</div>`, o === "pillar" || o === "all")
    + sec("market", "Thị trường và vị thế theo phân khúc", "10 tháng 2026", marketTable(), o === "all")
    + sec("recon", "Đối chiếu hình Anh gửi với dữ liệu bản đồ", "thống nhất số liệu", reconTable(), o === "recon" || o === "all")
    + sec("lag", "Độ trễ điều hành tại DAC", "năm điểm nghẽn và chỉ số đo", lagHtml(), o === "lag" || o === "all")
    + sec("promo", "Đặt tên chương trình khuyến mãi", "ma trận 100 điểm", promoHtml(), o === "promo" || o === "all")
    + sec("ai", "Công cụ AI hỗ trợ nghiên cứu và marketing", "", aiHtml(), o === "ai" || o === "all")
    + sec("growth", "DAC AI Market & Customer Growth Intelligence", "8 nhóm năng lực, chấm điểm LEAD, rà soát tuần, nghiệm thu", growthHtml(), o === "growth");
  const t = dlg.querySelector("#nc-" + o); if(t) setTimeout(() => t.scrollIntoView({block: "start"}), 50);
}
function openFull(o){ full(o); if(!dlg.open) dlg.showModal(); }
dlg.addEventListener("click", e => { const t = e.target;
  if(t.closest("[data-close]")) return dlg.close();
  if(t.id === "ncRes"){ dlg.close(); if(CV.openResearch) CV.openResearch("gia"); return; }
  if(t.id === "ncBen"){ dlg.close(); CV.openAi(true); CV.benTab("Chat"); CV.addMsg("u", "Phân tích năng lực cạnh tranh"); const b = CV.addMsg("a", ""); CV.finishBubble(b, md(), false, "Năng lực cạnh tranh", true); return; }
  if(t.dataset && t.dataset.wk){ dlg.close(); CV.openAi(true); CV.benTab("Chat"); CV.addMsg("u", "Rà soát LEAD và chuyển đổi tuần"); const b = CV.addMsg("a", ""); CV.finishBubble(b, weekly(), false, "Rà soát LEAD tuần", true); return; }
  const o = t.dataset && t.dataset.open; if(o){ dlg.close(); const m = {"Dòng tiền": CV.openCashflow, "Thư ký họp": () => { CV.openAi(true); CV.benTab("Meet"); }, "Tồn kho": () => { const b = document.getElementById("btnInv"); if(b) b.click(); else CV.openAi(true); }, "Lịch chăm sóc": () => { CV.openAi(true); CV.benTab("Chat"); CV.askAi("Lịch chăm sóc khách hàng"); }}[o]; if(m) m(); return; }
  const pa = t.dataset && t.dataset.pa; if(pa){ const C = loadN(); if(pa === "add") C.push({n: "", s: CRIT.map(() => "")}); else { C.length = 0; C.push({n: "", s: CRIT.map(() => "")}, {n: "", s: CRIT.map(() => "")}, {n: "", s: CRIT.map(() => "")}); } saveN(C); full("promo"); } });
dlg.addEventListener("change", e => { const t = e.target, C = loadN(); if(t.dataset && t.dataset.pn !== undefined){ C[+t.dataset.pn].n = t.value; saveN(C); } else if(t.dataset && t.dataset.ps){ const [i, j] = t.dataset.ps.split(":").map(Number); C[i].s[j] = t.value === "" ? "" : Math.max(0, Math.min(10, +t.value)); saveN(C); full("promo"); } });
function md(){
  const G = GROUPS.map(g => [g, groupStat(g)]), R = reconcile();
  return `# Năng lực cạnh tranh Đô Thành (10 tháng 2026)\n${(M ? "" : "_Chưa có dữ liệu thị trường._\n")}\n| Trụ cột | Thị trường (xe) | So cùng kỳ | Thị phần ĐT | Đối thủ đứng đầu |\n|---|---|---|---|---|\n${G.map(([g, s]) => `| ${g.name} | ${s.tt ? fmtInt(s.tt) : "—"} | ${s.g != null ? (s.g >= 0 ? "+" : "") + fmt1(s.g) + "%" : "—"} | ${s.share != null ? fmt1(s.share) + "%" : "chưa có số"} | ${s.top.map(x => x[0] + " " + fmtInt(x[1])).join(", ") || "chưa có số"} |`).join("\n")}\n\n## Đối chiếu hình và bản đồ\n- Số khớp: ${R.filter(r => r.ok === true).length}; lệch: ${R.filter(r => r.ok === false).length}; chưa so được: ${R.filter(r => r.ok == null).length}.\n- Quy tắc: số có nguồn công bố mới nhất được dùng (bảng giá công bố T11/2026, báo cáo thị trường IZ); số chỉ có trong hình để tham khảo.\n${R.filter(r => r.ok === false).slice(0, 8).map(r => `- ${r.k}: hình ${r.img}; bản đồ ${r.map}`).join("\n")}\n\n## Điểm nghẽn điều hành\n${bottlenecks().map(b => `${b.n}. ${b.t}: ${b.metric}`).join("\n")}`;
}
/* ---------- gắn tab ---------- */
const tabs = document.querySelector(".side .tabs"), side = document.querySelector(".side");
if(tabs && side){
  const tb = document.createElement("button"); tb.type = "button"; tb.setAttribute("role", "tab"); tb.id = "tabN"; tb.setAttribute("aria-selected", "false"); tb.setAttribute("aria-controls", "paneN"); tb.textContent = "Năng lực cạnh tranh"; tabs.appendChild(tb);
  const pn = document.createElement("div"); pn.className = "pane"; pn.id = "paneN"; pn.setAttribute("role", "tabpanel"); pn.setAttribute("aria-labelledby", "tabN"); pn.hidden = true; side.appendChild(pn);
  const render = () => { try{ pn.innerHTML = paneHtml(); }catch(e){ pn.innerHTML = '<p class="muted">Chưa tải được dữ liệu năng lực cạnh tranh.</p>'; } };
  const show = on => { ["tabP", "tabC"].forEach(id => document.getElementById(id).setAttribute("aria-selected", "false")); ["paneP", "paneC"].forEach(id => document.getElementById(id).hidden = true); tb.setAttribute("aria-selected", "true"); pn.hidden = false; render(); };
  const hide = () => { tb.setAttribute("aria-selected", "false"); pn.hidden = true; };
  tb.addEventListener("click", show); ["tabP", "tabC"].forEach(id => document.getElementById(id).addEventListener("click", hide, true));
  new MutationObserver(() => { if(!document.getElementById("paneP").hidden || !document.getElementById("paneC").hidden) hide(); }).observe(document.getElementById("paneP"), {attributes: true, attributeFilter: ["hidden"]});
  pn.addEventListener("click", e => { const b = e.target.closest("[data-nc]"); if(b) openFull(b.dataset.nc); });
}
CV.openCompetitiveness = openFull; CV.competitivenessMd = md; CV.leadScores = () => leads().map(x => ({name: x.p.name, province: x.p.province, score: x.s.E, conf: x.s.Mx, grp: x.s.grp})); CV.weeklyLeadReview = weekly;
CV.tools.push({name: "nang_luc_canh_tranh", label: "Đang phân tích năng lực cạnh tranh…", description: "Năng lực cạnh tranh của Đô Thành: 4 trụ cột sản phẩm (MISSU, IZ, JP, DAEWOO) chân dung khách hàng, giá, tải trọng, thị phần, đối thủ; đối chiếu số trong hình Anh cung cấp với dữ liệu bản đồ; độ trễ điều hành; chấm tên chương trình khuyến mãi.", inputSchema: {type: "object", properties: {}}, execute: () => { openFull("all"); return md(); }});
CV.tools.push({name: "ra_soat_lead_tuan", label: "Đang rà soát LEAD tuần…", description: "Báo cáo rà soát LEAD và chuyển đổi hàng tuần: tổng LEAD theo nhóm A-D (chấm điểm có bằng chứng), chưa phân công, lịch tiếp cận, kỷ luật họp, hành động tuần tới; ghi rõ số chưa có.", inputSchema: {type: "object", properties: {}}, execute: () => weekly()});
CV.localHooks.unshift(raw => { if(!/năng lực cạnh tranh/i.test(raw)) return null; openFull("all"); return md(); });
const prev = CV.ctx; CV.ctx = () => (prev ? prev() : "") + "\nNĂNG LỰC CẠNH TRANH: tab mới; số có nguồn công bố (bảng giá T11/2026, báo cáo IZ) được ưu tiên hơn số trong hình; thị phần JP và DAEWOO chưa có số xe theo hãng thì nói chưa có số. Dùng nang_luc_canh_tranh.";
})();
