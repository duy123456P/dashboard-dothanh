/* ===== Phòng chiến lược HĐQT: mọi thông tin của một tỉnh + xếp hạng /34 + thế trận (đánh nhanh / đánh chắc) ===== */
(function(){
"use strict";
const CV = window.__CV; if(!CV) return;
const {esc, fmtInt, fmt1} = CV;
let PS = {}; try{ PS = JSON.parse(document.getElementById("ps-data").textContent); }catch(e){}
const sum = a => a.reduce((x,y) => x + (y || 0), 0);
const n0 = v => v == null || !isFinite(v) ? "—" : fmtInt(v), f1 = v => v == null || !isFinite(v) ? "—" : fmt1(v);
const C = {good: "#4ee2a0", warn: "#ffc35a", bad: "#ff6b6b", muted: "#8ea7c7"};

/* ---------- gom số theo tỉnh từ mọi module ---------- */
let cache = null;
function agg(){
  if(cache) return cache; const o = {}; const get = p => o[p] = o[p] || {dealers: [], tx12: 0, inv: 0, invLe: 0, invOld: 0, f27: 0, kh27: 0, erp27: 0, comp: 0, compBrands: new Set()};
  const prov = name => { const d = CV.NET.dealers.find(x => x.salesKey === name); return d ? d.province : null; };
  CV.NET.dealers.forEach(d => get(d.province).dealers.push(d));
  const TX = CV.TX; if(TX){ const ms = TX.months.filter(m => m < TX.asOf.slice(0,7)).slice(-12), set = new Set(ms); TX.tx.forEach(t => { if(!set.has(t[0])) return; const p = prov(TX.dealers[t[1]]); if(p) get(p).tx12 += t[5]; }); }
  if(CV.inv) CV.inv.dealers.forEach(l => { const p = prov(l.link); if(!p) return; const x = get(p); x.inv += l.ton; x.invLe += l.leT11; x.invOld += ((l.age || {})["181-365"] || 0) + ((l.age || {})[">365"] || 0); });
  const F = CV.salesForecast ? CV.salesForecast() : null; if(F) F.D.forEach(d => { const p = prov(d.name); if(!p) return; const x = get(p); x.f27 += d.f27 || 0; x.kh27 += d.kh27 || 0; x.erp27 += d.erp || 0; });
  (CV.CNET ? CV.CNET.points : []).forEach(p => { const x = get(p.province); x.comp++; x.compBrands.add(p.b); });
  return cache = o;
}
const A = r => agg()[r.name] || {dealers: [], tx12: 0, inv: 0, invLe: 0, invOld: 0, f27: 0, kh27: 0, erp27: 0, comp: 0, compBrands: new Set()};
const invRate = () => CV.inv ? CV.inv.daysT11 / 30 : 0.7;

/* ---------- ô tô mọi loại 2025: số ĐK thật (Cục CSGT) nếu có; còn lại ước từ tổng thị trường VAMA + VinFast + Hyundai ---------- */
const CAR_TOTAL_2025 = 604000; // VAMA 375.736 + VinFast 175.099 + Hyundai 53.229 (Vietnamnet, 1/2026)
function carEst(r){ const rs = CV.rows, real = rs.filter(x => x.carReg2025), rest = rs.filter(x => !x.carReg2025);
  const w = x => Math.pow(Math.max(x.grdp || 0, 0), 0.65) * Math.pow(Math.max(x.pop || 0, 0), 0.35), sw = rest.reduce((a, x) => a + w(x), 0) || 1;
  const left = Math.max(0, CAR_TOTAL_2025 - real.reduce((a, x) => a + x.carReg2025, 0));
  return r.carReg2025 ? {v: r.carReg2025, est: false} : {v: Math.round(left * w(r) / sw), est: true}; }
CV.carEst = carEst;
/* ---------- danh mục chỉ số (có xếp hạng /34) ---------- */
const MET = [
  // [id, nhóm, nhãn, đơn vị, getter, hướng (+1 cao là tốt / −1 thấp là tốt / 0 trung tính), nguồn]
  ["pop", "Kinh tế – xã hội", "Dân số 2025", "nghìn người", r => r.pop, 0, "Niên giám Thống kê 2025"],
  ["area", "Kinh tế – xã hội", "Diện tích", "km²", r => r.area, 0, "NQ 202/2025/QH15"],
  ["density", "Kinh tế – xã hội", "Mật độ dân số", "người/km²", r => r._density, 0, "tính từ dân số, diện tích"],
  ["urban", "Kinh tế – xã hội", "Đô thị hóa (ước)", "%", r => r.urban, 1, "ước tính gộp tỉnh cũ"],
  ["grdp", "Kinh tế – xã hội", "GRDP 2026 (ước)", "nghìn tỷ", r => r.grdp2026e ?? null, 1, "GRDP 2025 × tăng trưởng thực 9T/2026"],
  ["grdp25", "Kinh tế – xã hội", "GRDP 2025", "nghìn tỷ", r => r.grdp ?? null, 1, "Niên giám Thống kê 2025 (đủ 34 tỉnh)"],
  ["growth", "Kinh tế – xã hội", "Tăng trưởng GRDP 2025", "%", r => r.growth, 1, "Cục Thống kê (đủ 34 tỉnh)"],
  ["gpc", "Kinh tế – xã hội", "GRDP bình quân đầu người 2025", "triệu đ", r => (PS.gpc2025 || {})[r.name] ?? r._gpc, 1, "Niên giám Thống kê 2025"],
  ["retail", "Kinh tế – xã hội", "Bán lẻ hàng hóa, dịch vụ 2025", "nghìn tỷ", r => (PS.retail2025 || {})[r.name] != null ? PS.retail2025[r.name] / 1000 : null, 1, "Niên giám Thống kê 2025"],
  ["income", "Kinh tế – xã hội", "Thu nhập bình quân/tháng 2025", "triệu đ", r => ((PS.income2025 || {})[r.name] || {}).v ?? null, 1, "Khảo sát mức sống 2025 (một phần)"],
  ["ind", "Kinh tế – xã hội", "Tỷ trọng công nghiệp – xây dựng", "% GRDP", r => r.econ ? r.econ[1] : null, 0, "cơ cấu GRDP"],
  ["serv", "Kinh tế – xã hội", "Tỷ trọng dịch vụ", "% GRDP", r => r.econ ? r.econ[2] : null, 0, "cơ cấu GRDP"],
  ["agri", "Kinh tế – xã hội", "Tỷ trọng nông – lâm – thủy sản", "% GRDP", r => r.econ ? r.econ[0] : null, 0, "cơ cấu GRDP"],
  ["g9m26", "Kinh tế – xã hội", "Tăng trưởng GRDP 9 tháng 2026", "%", r => ((PS.growth9m26 || {})[r.name] || {}).v ?? null, 1, "Cục Thống kê, báo địa phương (một phần)"],
  ["cpi", "Kinh tế – xã hội", "CPI 2026 (tỉnh có công bố)", "%", r => ((PS.cpi2026 || {})[r.name] || {}).v ?? null, -1, "Cục Thống kê tỉnh, báo chí (Cục Thống kê không công bố CPI 34 tỉnh)"],
  ["labor", "Kinh tế – xã hội", "Sử dụng lao động công nghiệp 01/10/2026 so cùng kỳ", "%", r => ((PS.labor1026 || {})[r.name] || {}).yoy ?? null, 1, "Cục Thống kê, biểu tháng 10/2026"],
  ["fdi", "Kinh tế – xã hội", "FDI 10 tháng 2026", "triệu USD", r => ((PS.fdi10m26 || {})[r.name] || {}).v ?? null, 1, "Cục Thống kê, biểu tháng 10/2026 (top 20)"],
  ["pinv", "Kinh tế – xã hội", "Vốn đầu tư NSNN 10 tháng 2026", "tỷ đ", r => ((PS.publicInv10m26 || {})[r.name] || {}).vnd ?? null, 1, "Cục Thống kê, biểu tháng 10/2026 (21 tỉnh)"],
  ["radar", "Radar DAC", "Điểm Radar DAC (20/20/20/15/15/10)", "/100", r => CV.radarScore ? CV.radarScore(r) : null, 1, "Radar kinh tế – tài chính DAC"],
  ["market", "Thị trường xe", "ĐK mới xe tải 2026 (quy năm)", "xe", r => r._market, 1, "ĐK thực T10/2026 × tổng 10T/2026"],
  ["regT10", "Thị trường xe", "ĐK mới xe tải T10/2026 (thực)", "xe", r => r.regT10 ?? null, 1, "File DKM tháng 10/2026"],
  ["dtT10", "Thị trường xe", "Thị phần Đô Thành T10/2026 trong phân khúc có sản phẩm (ĐK thực)", "%", r => r.regT10addr ? r.regT10dtAddr / r.regT10addr * 100 : null, 1, "File DKM tháng 10/2026"],
  ["eol", "Thị trường xe", "Xe tải hết niên hạn 2025 (phải thay thế)", "xe", r => ((PS.eol2025 || {})[r.name] || {}).truck ?? null, 1, "Cục Đăng kiểm, văn bản 419/ĐKVN-PTGTĐB 06/02/2026"],
  ["uio", "Thị trường xe", "UIO xe thương mại", "xe", r => r._uio, 1, "Cục ĐK tổng 8/2026, phân bổ theo ĐK xe TM 2025–6T/2026 (85%) + xe tải hết niên hạn 2025 (15%); HN, HCM, HP neo theo tổng ô tô"],
  ["carreg", "Thị trường xe", "Ô tô mọi loại 2025 (ĐK thật hoặc ước từ VAMA)", "xe", r => carEst(r).v, 1, "Cục CSGT (tỉnh có số) · ước từ tổng VAMA + VinFast + Hyundai"],
  ["heavy", "Thị trường xe", "Tỷ trọng tải nặng + đầu kéo", "% thị trường", r => r.mix ? r.mix[2] + r.mix[3] : null, 0, "ước theo cơ cấu ngành"],
  ["comp", "Thị trường xe", "Điểm bán, dịch vụ đối thủ đã xác minh", "điểm", r => A(r).comp, -1, "mạng lưới đối thủ"],
  ["sales", "Đô Thành", "Bán lẻ T1–T10/2026 (TDBH)", "xe", r => r.sales, 1, "Tổng hợp TDBH"],
  ["share", "Đô Thành", "Thị phần phân khúc ĐT (bán lẻ T1–T10 / ĐK cùng phân khúc 10T)", "%", r => r._addr10 ? (r.sales || 0) / r._addr10 * 100 : null, 1, "Bán lẻ T1–T10 / (ĐK quy năm × tỷ trọng phân khúc có sản phẩm × 10/12)"],
  ["kpct", "Đô Thành", "Đạt KH lũy kế T10", "%", r => r.target ? r._kpct : null, 1, "TDBH"],
  ["tx12", "Đô Thành", "Bán lẻ 12 tháng (TT 100%)", "xe", r => A(r).tx12 || null, 1, "file giao dịch từng xe"],
  ["dealers", "Đô Thành", "Đại lý Đô Thành", "điểm", r => (r._c4 || 0) + (r._c3 || 0), 1, "mạng lưới"],
  ["inv", "Đô Thành", "Tồn đại lý 21/11", "xe", r => A(r).inv || null, -1, "file tồn SR"],
  ["cover", "Đô Thành", "Tháng bán của tồn", "tháng", r => { const x = A(r); return x.inv ? (x.tx12 ? x.inv / (x.tx12 / 12) : x.invLe ? x.inv / (x.invLe / invRate()) : 99) : null; }, -1, "tồn SR 21/11 / bán lẻ bình quân 12 tháng"],
  ["f27", "Đô Thành", "Dự báo 2027", "xe", r => A(r).f27 || null, 1, "mô hình dự báo"],
  ["kh27", "Đô Thành", "KH 2027", "xe", r => A(r).kh27 || null, 0, "Đánh giá KH 2027 (ERP)"],
  ["gap27", "Đô Thành", "Dự báo / KH 2027", "%", r => { const x = A(r); return x.kh27 ? x.f27 / x.kh27 * 100 : null; }, 1, "dự báo / KH"],
];
const MID = Object.fromEntries(MET.map(m => [m[0], m]));
/* nguồn cụ thể cho từng chỉ số: [tên, link] hoặc [tên, null] cho dữ liệu nội bộ DAC (file gốc anh gửi) */
const U = {
  nqs: ["Nghị quyết 202/2025/QH15 sắp xếp đơn vị hành chính cấp tỉnh", "https://thuvienphapluat.vn/van-ban/Bo-may-hanh-chinh/Nghi-quyet-202-2025-QH15-660927.aspx"],
  vne: ["VnEconomy: vị thế kinh tế 34 tỉnh sau sáp nhập (dân số, GRDP)", "https://vneconomy.vn/vi-the-kinh-te-tinh-thanh-pho-sau-sap-nhap-dua-theo-mot-so-chi-tieu-chu-yeu.htm"],
  vnx: ["VnExpress: quy mô kinh tế các địa phương sau sáp nhập", "https://vnexpress.net/quy-mo-kinh-te-cac-dia-phuong-the-nao-sau-sap-nhap-4874073.html"],
  g25: ["Cục Thống kê: thông cáo GRDP 34 tỉnh năm 2025", "https://www.nso.gov.vn/tin-tuc-thong-ke/2026/01/thong-cao-bao-chi-ve-ket-qua-tang-truong-tong-san-pham-tren-dia-ban-grdp-cua-34-tinh-thanh-pho-nam-2025/"],
  dk419: ["Cục Đăng kiểm: văn bản 419/ĐKVN-PTGTĐB (06/02/2026), xe hết niên hạn năm 2025 theo tỉnh", "https://moc.gov.vn/Images/editor/files/QLVB/2026/BXD_419-%C4%90KVN-PTGT%C4%90B_06022026.pdf"],
  dkm: ["File DKM_10.2026.xlsx: đăng ký mới xe tải từng xe tháng 10/2026 (nội bộ DAC)", null], dacm: ["Báo cáo thị trường DAC tháng 10/2026 (IZ, KAMA): 10T/2026 98.955 xe", null],
  g9: ["VOV: GRDP 34 tỉnh 9 tháng 2026", "https://vov.vn/kinh-te/grdp-34-tinh-thanh-sau-9-thang-dia-phuong-nao-dang-dan-dau-cuoc-dua-tang-truong-post1338269.vov"],
  ksms: ["Cục Thống kê: Khảo sát mức sống dân cư 2025 (PDF)", "https://www.nso.gov.vn/wp-content/uploads/2026/07/Thong-cao-bao-chi-ksms2025.pdf"],
  cfinc: ["CafeF: thu nhập bình quân tháng 34 tỉnh (KSMS 2025)", "https://cafef.vn/lan-dau-tien-cong-bo-bang-xep-hang-thu-nhap-binh-quan-thang-cua-34-tinh-thanh-sau-sap-nhap-dia-phuong-nao-dang-dan-dau-188260711090453958.chn"], cfcar: ["CafeF: tỉnh thành mua ô tô nhiều nhất 2025 (Cục CSGT)", "https://cafef.vn/lo-dien-nhung-tinh-thanh-mua-o-to-xe-may-nhieu-nhat-nam-2025-188251229100610196.chn"],
  fdi: ["Người Quan Sát: FDI 10 tháng 2026 theo địa phương", "https://nguoiquansat.vn/dia-phuong-hut-von-fdi-cap-moi-nhieu-nhat-viet-nam-voi-hon-10-ty-usd-gan-gap-doi-thai-nguyen-vuot-ca-ha-noi-va-bac-ninh-326316.html"],
  csgt: ["Dân trí: ô tô đăng ký mới 2025 theo địa phương (Cục CSGT)", "https://dantri.com.vn/thoi-su/5-dia-phuong-co-so-luong-o-to-xe-may-dang-ky-moi-nhieu-nhat-nam-2025-20251226185131842.htm"],
  ng: ["Cục Thống kê: Niên giám Thống kê 2025 (quy đổi 63 tỉnh cũ → 34 tỉnh)", "https://www.nso.gov.vn/wp-content/uploads/2026/07/NG-TOAN-QUOC-2025_WM.pdf"],
  nsoX: ["Cục Thống kê: biểu số liệu tháng 10/2026 (FDI, vốn NSNN theo tỉnh)", "https://www.nso.gov.vn/wp-content/uploads/2026/11/2.-Bieu-thang-10.2026.xlsx"],
  radar: ["Radar DAC: điểm tổng hợp từ Niên giám 2025, biểu tháng 10/2026, dữ liệu DAC (khung chưa backtest)", null],
  vama: ["Vietnamnet: doanh số ô tô 2025 (VAMA 375.736 xe; cộng VinFast, Hyundai ≈ 604.000 xe)", "https://vietnamnet.vn/en/vietnam-s-2025-car-sales-race-these-9-models-led-their-brands-2483168.html"],
  vamaest: ["Ước phân bổ theo GRDP, dân số từ tổng VAMA (tỉnh chưa có số Cục CSGT)", null],
  csgt9: ["Tuổi Trẻ: xe đăng ký mới 9 tháng 2026 (Cục CSGT)", "https://tuoitre.vn/ca-nuoc-co-hon-33-trieu-xe-duoc-dang-ky-moi-trong-9-thang-dau-nam-2026-100260924115759761.htm"],
  dk: ["Báo Xây dựng: phương tiện lưu hành 8 tháng 2026 (Cục Đăng kiểm)", "https://baoxaydung.vn/hon-500-nghin-luot-phuong-tien-truot-kiem-dinh-8-thang-dau-nam-2026-192260818102808066.htm"],
  dtweb: ["dothanhauto.com: hệ thống đại lý", "https://www.dothanhauto.com/dai-ly.html"],
  tdbh: ["ERP Đô Thành: Tổng hợp TDBH chốt T10/2026", null], tx: ["File DAC_SL_bán_2024-YTD2026.xlsx (từng xe, TT 100%)", null],
  inv: ["File MoM_Tồn_SR_W2.M11.Y26_21.11.26.xlsx", null], kh27: ["ERP Đô Thành: Đánh giá KH 2027", null],
  model: ["Mô hình phân bổ của bản đồ (không phải số thống kê): tổng toàn quốc Cục CSGT, Cục Đăng kiểm chia theo GRDP, cơ cấu ngành", null],
  est: ["Ước tính gộp tỉnh cũ, chưa có số công bố sau sáp nhập", null], fc: ["Mô hình dự báo DAC Hybrid trên bản đồ (từ file giao dịch từng xe)", null],
  comp: ["Mạng lưới đối thủ đã xác minh (nguồn từng điểm trong compnet)", null]};
const SRCOF = {pop: ["vne"], area: ["nqs"], density: ["vne", "nqs"], urban: ["est"], grdp: ["ng", "g9"], grdp25: ["ng", "g25"], growth: ["g25"], gpc: ["ng"], retail: ["ng"], income: ["cfinc", "ng", "ksms"], ind: ["est"], serv: ["est"], agri: ["est"],
  g9m26: ["g9"], fdi: ["nsoX"], labor: ["nsoX"], pinv: ["nsoX"], radar: ["radar", "ng", "nsoX"], market: ["dkm", "dacm"], regT10: ["dkm"], eol: ["dk419"], dtT10: ["dkm"], uio: ["model", "dk"], carreg: ["csgt", "cfcar", "vama", "vamaest"], heavy: ["est"], comp: ["comp"], sales: ["tdbh"], share: ["tdbh", "model"], kpct: ["tdbh"], tx12: ["tx"],
  dealers: ["dtweb", "tdbh"], inv: ["inv"], cover: ["inv"], f27: ["fc"], kh27: ["kh27"], gap27: ["fc", "kh27"]};
// nguồn riêng của tỉnh (báo địa phương) ưu tiên cho số 9 tháng
const provSrc = (id, r) => { const x = (r.ext || {}).src || [];
  if(id === "carreg") return r.carReg2025 ? (x.filter(z => /ô tô/i.test(z[0])).length ? x.filter(z => /ô tô/i.test(z[0])) : [U.csgt, U.cfcar]) : [U.vama, U.vamaest];
  if(id === "income") return ((PS.income2025 || {})[r.name] || {}).src === "công bố" ? [U.cfinc, U.ksms] : [U.ng, U.ksms];
  if(id === "cpi"){ const c = (PS.cpi2026 || {})[r.name]; return c ? [c.src] : [["Cục Thống kê: CPI 10 tháng 2026 cả nước 4,57% (không có số tỉnh)", "https://www.nso.gov.vn/wp-content/uploads/2026/11/CPI-chi-so-gia-vang-va-chi-so-gia-do-la-My-thang-Muoi-va-10-thang-nam-2026.pdf"]]; }
  if(id === "comp" && CV.CNET){ const S = CV.CNET.sources || {}, k = [...new Set(CV.CNET.points.filter(p => p.province === r.name).map(p => p.src))].filter(z => S[z]); if(k.length) return k.map(z => S[z]); } if(id === "g9m26" && x.length) return x.filter(z => /9 tháng|GRDP|KT-XH|tăng trưởng|kinh tế/i.test(z[0]) && !/2025/.test(z[0])).concat([U.g9]); return null; };
const kindOf = t => /^(File|ERP)/.test(t) ? "dữ liệu nội bộ DAC" : "ước tính của bản đồ, chưa có số công bố";
const srcList = (id, r) => provSrc(id, r) || (SRCOF[id] || []).map(k => U[k]);
const srcHtml = (id, r) => srcList(id, r).map(([t, u]) => u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(t)}</a>` : `<span>${esc(t)}</span>`).join(" · ");
const srcMd = (id, r) => srcList(id, r).map(([t, u]) => u ? `[${t}](${u})` : t).join("; ");
CV.boardSrc = {U, SRCOF, srcHtml, srcMd};
function ranks(id){ const m = MID[id]; const vals = CV.rows.map(r => [r.name, m[4](r)]).filter(([, v]) => v != null && isFinite(v)); const s = vals.slice().sort((a,b) => b[1] - a[1]); const o = {}; s.forEach(([n, v], i) => { o[n] = i && v === s[i-1][1] ? o[s[i-1][0]] : i + 1; }); return {o, n: vals.length}; } // bằng nhau cùng hạng
let RK = null; const R = () => RK || (RK = Object.fromEntries(MET.map(m => [m[0], ranks(m[0])])));
const rankOf = (id, r) => { const x = R()[id]; return x && x.o[r.name] ? [x.o[r.name], x.n] : null; };
const pct = (id, r) => { const k = rankOf(id, r); return k ? 1 - (k[0] - 1) / Math.max(1, k[1] - 1) : null; };
// xếp hạng chính thức đã công bố (ưu tiên hiển thị)
const official = (id, r) => id === "growth" ? ((PS.growth2025 || {})[r.name] || {}).rank : id === "income" ? (((PS.income2025 || {})[r.name] || {}).src === "công bố" ? PS.income2025[r.name].rank : null) : id === "fdi" ? ((PS.fdi10m26 || {})[r.name] || {}).rank : id === "g9m26" ? ((PS.growth9m26 || {})[r.name] || {}).rank : null;

/* ---------- thế trận ---------- */
function posture(r){
  const avg = a => { const v = a.filter(x => x != null); return v.length ? sum(v) / v.length : 0.5; };
  const attr = avg([pct("market", r), pct("growth", r), pct("gpc", r), pct("uio", r), (r.carReg2025 ? pct("carreg", r) : null), pct("grdp", r)]);
  const x = A(r), cov = MID.cover[4](r);
  const nd = (r._c4 || 0) + (r._c3 || 0), z = v => v == null ? 0.2 : v; // thiếu số liệu nội lực = yếu, không coi là trung bình
  let str = avg([z(pct("share", r)), z(pct("kpct", r)), z(pct("dealers", r)), z(pct("tx12", r)), cov == null ? 0.3 : cov <= 3 ? 0.8 : cov <= 6 ? 0.4 : 0.1, x.comp ? Math.max(0, 1 - x.comp / 12) : 0.6]);
  if(!nd && !(r.sales > 0)) str = Math.min(str, 0.15);
  const hiA = attr >= 0.5, hiS = str >= 0.5;
  const P = hiA && hiS ? {k: "fast", t: "Đánh nhanh, thắng nhanh", c: C.good, why: "Thị trường hấp dẫn và Đô Thành đã có chỗ đứng: dồn lực 30–90 ngày để chiếm thêm thị phần ngay."}
    : hiA ? {k: "slow", t: "Đánh chậm, thắng chắc", c: C.warn, why: "Thị trường lớn, tăng trưởng tốt nhưng nội lực Đô Thành còn mỏng: xây mạng lưới, dịch vụ, niềm tin 12–24 tháng trước khi đẩy sản lượng."}
    : hiS ? {k: "hold", t: "Giữ chắc, khai thác hiệu quả", c: "#5ab0ff", why: "Thị trường vừa/nhỏ nhưng Đô Thành mạnh: giữ thị phần, tối ưu chi phí, biên lợi nhuận và tồn kho."}
    : {k: "guer", t: "Du kích, chọn lọc", c: C.bad, why: "Thị trường nhỏ và Đô Thành yếu: không đầu tư cố định lớn; bán qua cấp 2, dự án, đội bán lưu động; theo dõi tín hiệu đầu tư công, KCN mới."};
  return {...P, attr, str};
}
function tactics(r){
  const P = posture(r), x = A(r), mo = new Date().getMonth(), ext = r.ext || {}, cov = MID.cover[4](r), lines = [], longs = [];
  const invL = CV.inv ? CV.inv.dealers.filter(l => { const d = CV.NET.dealers.find(z => z.salesKey === l.link); return d && d.province === r.name; }) : [];
  const models = {}; invL.forEach(l => Object.entries(l.models).forEach(([m,n]) => models[m] = (models[m] || 0) + n));
  const topM = Object.entries(models).sort((a,b) => b[1] - a[1]).slice(0, 3);
  // ngắn hạn
  if(x.inv) lines.push(`Tồn ${x.inv} xe tại tỉnh ≈ ${cov >= 99 ? "chưa bán xe nào T11" : f1(cov) + " tháng bán"}${x.invOld ? `, ${x.invOld} xe quá 180 ngày` : ""}: ${cov > 3 ? `xả tồn trước, ưu tiên ${topM.map(([m,n]) => m + " " + n).join(", ")}; dừng nhận sỉ đến khi ≤ 2 tháng` : "đủ hàng để chạy chương trình bán ngay"}.`);
  const sv = (r.season || [])[mo]; lines.push(`Mùa vụ tháng ${mo+1}: ${sv >= 3 ? "cao điểm" : sv >= 2 ? "trung bình" : "thấp"}; ${(r.seasonNotes || []).slice(0, 2).join("; ")}. Chiến dịch: ${((r.campaigns || [])[0] || "").replace(/^“|”.*$/g, "")}.`);
  if(ext.localRules) lines.push(`Quy định địa phương: ${ext.localRules[0].impact}`);
  if(r.target && r._kpct < 70) lines.push(`Đạt KH lũy kế ${n0(r._kpct)}%: kèm cặp đại lý theo tuần, thưởng nóng theo xe bán lẻ, lái thử cuối tuần tại chợ đầu mối, KCN.`);
  if(x.comp) lines.push(`Đối thủ có ${x.comp} điểm đã xác minh tại tỉnh (${[...x.compBrands].map(b => (CV.CNET.brands[b] || {}).name).join(", ")}): chào trực tiếp bằng giá ròng sau ưu đãi và TCO ở phân khúc Đô Thành rẻ hơn (1,9–2,5 tấn, thùng dài).`);
  const LYp = CV.loyalty && CV.loyalty.LY.byProv[r.name];
  if(LYp && LYp.customers) lines.push(`Phòng thủ trước khi tấn công: ${LYp.customers} khách đã mua tại tỉnh, ${LYp.repeat} khách mua lại; giữ khách cũ rẻ hơn tìm khách mới 7 lần, mỗi khách trung thành mở ~250 người tiềm năng. Gọi chăm sóc toàn bộ khách 2023–2024, chốt lần mua thứ 2, thưởng giới thiệu.`);
  if(P.k === "fast") lines.push("Dồn ngân sách khuyến mãi, xe sẵn giao, quảng cáo địa phương vào 60 ngày tới; mục tiêu tăng thị phần 1–2 điểm %.");
  if(P.k === "guer") lines.push("Không tăng tồn; bán theo đơn, dự án; đội bán lưu động 2 tuần/lần; hợp tác đại lý đa thương hiệu.");
  // dài hạn
  const nd = (r._c4 || 0) + (r._c3 || 0);
  if(!nd) longs.push("Chưa có đại lý: lập đề án đại lý 3S hoặc trạm dịch vụ ủy quyền tại trung tâm tỉnh; trước mắt dịch vụ lưu động.");
  else if(r._perCenter > 2500) longs.push(`${nd} đại lý cho ~${n0(r._market)} xe/năm (${n0(r._perCenter)} xe/đại lý): mở thêm đại lý cấp 2, trạm dịch vụ ở cụm KCN, huyện xa.`);
  if(r.mix && r.mix[2] + r.mix[3] >= 28) longs.push(`Tải nặng + đầu kéo chiếm ${r.mix[2] + r.mix[3]}% thị trường: chuẩn bị danh mục Daewoo, JP120, xe ben; kho phụ tùng, cứu hộ công trường.`);
  if(r.growth >= 9) longs.push(`Tăng trưởng GRDP 2025 ${f1(r.growth)}% (hạng ${((PS.growth2025 || {})[r.name] || {}).rank}/34): ưu tiên đầu tư dài hạn, đón dự án hạ tầng, KCN.`);
  if(ext.publicInv) longs.push(`Đầu tư công: ${ext.publicInv.targets}; theo dõi độ trễ giải ngân → nhu cầu xe ben, tải nặng 3–6 tháng sau.`);
  longs.push(`Ngành mũi nhọn: ${r.industries} → nhu cầu xe: ${r.cvDemand}`);
  if(P.k === "slow") longs.push("Lộ trình 12–24 tháng: (1) mạng lưới, dịch vụ; (2) đội xe chứng minh (khách tiêu biểu, xe chạy thử dài ngày); (3) tài chính trả góp riêng; (4) rồi mới đẩy sản lượng.");
  if(P.k === "hold") longs.push("Giữ thị phần, nâng biên: bán gói dịch vụ, phụ tùng, xe chuyên dùng; khách quay lại, giới thiệu.");
  return {P, lines, longs};
}

/* ---------- giao diện ---------- */
const dlg = document.createElement("dialog"); dlg.className = "odlg"; dlg.id = "boardDlg"; dlg.style.width = "min(1380px,98vw)"; dlg.setAttribute("aria-labelledby", "boardT");
dlg.innerHTML = `<header><h3 id="boardT">Phòng chiến lược HĐQT</h3><label class="field" style="flex-direction:row;align-items:center;gap:6px;margin:0">Tỉnh<select id="bdProv"></select></label><button type="button" id="bdPrev" aria-label="Tỉnh trước">◀</button><button type="button" id="bdNext" aria-label="Tỉnh sau">▶</button>
  <label class="field" style="flex-direction:row;align-items:center;gap:6px;margin:0">Tô màu bản đồ<select id="bdColor"><option value="">(giữ nguyên)</option><option value="posture">Thế trận</option>${MET.map(m => `<option value="bd_${m[0]}">${esc(m[2])}</option>`).join("")}</select></label>
  <button type="button" id="bdBen">Ben trình bày</button><button type="button" class="x" data-close>Đóng</button></header><div class="body" id="bdBody"></div>`;
document.body.appendChild(dlg);
dlg.addEventListener("click", e => { if(e.target.closest("[data-close]")) dlg.close(); });
const btip = document.createElement("div"); btip.className = "hudtip"; btip.hidden = true; dlg.appendChild(btip);
dlg.addEventListener("pointermove", e => { const t = e.target.closest && e.target.closest("[data-tip]"); if(!t){ btip.hidden = true; return; } btip.innerHTML = t.getAttribute("data-tip"); btip.hidden = false;
  const w = btip.offsetWidth, h = btip.offsetHeight; let x = e.clientX + 14, y = e.clientY + 14; if(x + w > innerWidth - 8) x = e.clientX - w - 14; if(y + h > innerHeight - 8) y = e.clientY - h - 14; btip.style.left = x + "px"; btip.style.top = y + "px"; });
const sel = dlg.querySelector("#bdProv"); sel.innerHTML = CV.rows.map(r => r.name).sort((a,b) => a.localeCompare(b, "vi")).map(n => `<option>${esc(n)}</option>`).join("");
// chỉ số tô màu bản đồ
MET.forEach(m => { CV.METRICS["bd_" + m[0]] = {label: m[2], unit: m[3], get: r => { try{ return m[4](r); }catch(e){ return null; } }, fmt: v => m[3] === "%" || m[3] === "tháng" ? fmt1(v) : fmtInt(v)}; });
CV.METRICS.posture = {label: "Thế trận (1 du kích · 2 giữ chắc · 3 đánh chắc · 4 đánh nhanh)", unit: "", get: r => ({guer: 1, hold: 2, slow: 3, fast: 4})[posture(r).k], fmt: v => ["", "Du kích", "Giữ chắc", "Đánh chắc", "Đánh nhanh"][v] || v};

function tile(id, r){
  const m = MID[id], v = m[4](r), rk = rankOf(id, r), off = official(id, r), q = rk ? (rk[0] - 1) / Math.max(1, rk[1] - 1) : null;
  const col = m[5] === 0 || q == null ? C.muted : (m[5] > 0 ? q : 1 - q) <= 0.25 ? C.good : (m[5] > 0 ? q : 1 - q) >= 0.75 ? C.bad : C.warn;
  const val = v == null || !isFinite(v) ? "—" : id === "carreg" && carEst(r).est ? "~" + n0(v) : id === "cover" && v >= 99 ? "không bán" : (m[3] === "%" || m[3] === "tháng" || id === "income" || id === "growth") ? f1(v) : n0(v);
  return `<div class="stat bdt" data-gl-text="${esc(m[2])}" data-tip="<b>${esc(m[2])}</b><br>${esc(val)} ${esc(m[3])}<br>Hạng ${rk ? rk[0] + "/" + rk[1] : "—"}${off ? " (công bố: " + off + "/34)" : ""}<br>Nguồn: ${esc(srcList(id, r).map(z => z[0]).join(" · ") || m[6])}"><div class="v">${esc(val)}<span class="bdu"> ${esc(m[3])}</span></div><div class="l">${esc(m[2])}</div><div class="bdr" style="color:${col}">${rk ? `#${off || rk[0]}/${off ? 34 : rk[1]}` : "chưa có số"}</div><div class="bdsrc">${(() => { const L = srcList(id, r), w = L.find(z => z[1]); return w ? `<a href="${esc(w[1])}" target="_blank" rel="noopener noreferrer" title="${esc(L.map(z => z[0]).join(" · "))}">nguồn ↗</a>` : `<span title="${esc(L.map(z => z[0]).join(" · "))}">${/^(File|ERP)/.test((L[0] || [""])[0]) ? "nguồn: file nội bộ DAC" : "ước tính"}</span>`; })()}</div></div>`;
}
function render(name){
  const r = CV.findRow(name); if(!r) return; sel.value = r.name; RK = null; cache = null;
  const T = tactics(r), P = T.P, x = A(r), ext = r.ext || {};
  const groups = [...new Set(MET.map(m => m[1]))];
  const dl = x.dealers.filter(d => d.salesKey).map(d => { const iv = CV.invOf ? CV.invOf(d.salesKey) : null, fd = (CV.salesForecast() || {D: []}).D.find(z => z.name === d.salesKey);
    return `<tr><td><b>${CV.gmapA(d, esc(d.salesKey))}</b> <span class="muted tiny">${d.tier}</span> <button type="button" class="tiny" data-d360="${esc(d.salesKey)}">360°</button></td><td class="num">${n0(d.leCum)}/${n0(d.khCum)}</td><td class="num">${d.thT10 ?? "—"}/${d.khT10 ?? "—"}</td><td class="num">${iv ? iv.ton : "—"}</td><td class="num">${iv && iv.cover != null ? f1(iv.cover) : iv ? "không bán" : "—"}</td><td class="num">${fd ? n0(fd.f27) : "—"}</td><td class="num">${fd && fd.kh27 ? n0(fd.kh27) : "—"}</td><td>${d.grade ? d.grade + " · " + f1(d.score) : ""}</td></tr>`; }).join("");
  document.getElementById("bdBody").innerHTML = `
    <div class="bdhead"><div><div class="eyebrow">${esc(r.region)} · ${esc(r.zone)} · gộp từ ${esc((r.merged || []).join(", "))}</div><h2 style="margin:4px 0">${esc(r.name)}</h2><div class="muted small">${esc(r.industries)}</div></div>
      <div class="bdpost" style="border-color:${P.c};box-shadow:0 0 24px ${P.c}55"><div class="tiny muted">THẾ TRẬN ĐỀ XUẤT</div><div class="bdpt" style="color:${P.c}">${esc(P.t)}</div><div class="tiny">Hấp dẫn thị trường ${fmtInt(P.attr*100)}/100 · Nội lực Đô Thành ${fmtInt(P.str*100)}/100</div><div class="small" style="margin-top:4px">${esc(P.why)}</div></div></div>
    ${groups.map(g => `<h4>${esc(g)}</h4><div class="bdgrid">${MET.filter(m => m[1] === g).map(m => tile(m[0], r)).join("")}</div>`).join("")}
    <div class="hudgrid" style="margin-top:12px">
      <div class="hp w6"><h3>Đối sách ngắn hạn 30–90 ngày <span>${P.k === "fast" ? "đánh nhanh" : P.k === "slow" ? "chuẩn bị, chưa dồn lực" : P.k === "hold" ? "giữ, tối ưu" : "chọn lọc"}</span></h3><ol class="actions small">${T.lines.map(l => `<li>${esc(l)}</li>`).join("")}</ol></div>
      <div class="hp w6"><h3>Chiến lược dài hạn 1–3 năm</h3><ol class="actions small">${T.longs.map(l => `<li>${esc(l)}</li>`).join("")}</ol></div>
      <div class="hp w12"><h3>Đại lý Đô Thành tại tỉnh <span>bán lẻ lũy kế/KH · T10 · tồn 21/11 · tháng bán · dự báo/KH 2027</span></h3><div style="overflow-x:auto"><table class="tasktbl small"><thead><tr><th>Đại lý</th><th class="num">Lũy kế T10</th><th class="num">T10</th><th class="num">Tồn</th><th class="num">Tháng bán</th><th class="num">Dự báo 27</th><th class="num">KH 27</th><th>Hạng</th></tr></thead><tbody>${dl || '<tr><td colspan="8" class="muted">Chưa có đại lý Đô Thành tại tỉnh</td></tr>'}</tbody></table></div></div>
      <div class="hp w6"><h3>Văn hóa, con người, mùa vụ</h3><div class="small"><p><b>Văn hóa kinh doanh:</b> ${esc(r.culture)}</p><p><b>Tâm lý khách:</b> ${esc(r.psyche)}</p><p><b>Dân tộc:</b> ${esc(r.ethnic)} · <b>Đặc sản:</b> ${esc(r.specialties)}</p><p><b>Lễ hội:</b> ${esc(r.festivals)}</p><p><b>Mùa vụ:</b> ${esc((r.seasonNotes || []).join("; "))}</p></div></div>
      <div class="hp w6"><h3>Chính trị, pháp lý, hạ tầng</h3><div class="small"><p><b>Hành chính:</b> ${esc(ext.units || (r.communes ? r.communes + " xã/phường" : ""))}; trung tâm ${esc(r.capital)}; biển số ${esc(r.plates)}.</p><p><b>Hạ tầng, logistics:</b> ${esc(r.logistics)}</p>${ext.localRules ? ext.localRules.map(q => `<p><b>${esc(q.t)}:</b> ${esc(q.d)}<br><span class="muted">→ ${esc(q.impact)}</span></p>`).join("") : '<p class="muted">Chưa có quy định địa phương riêng trong dữ liệu (quy định quốc gia: mục Pháp lý).</p>'}${ext.publicInv ? `<p><b>Đầu tư công:</b> ${esc(ext.publicInv.targets)}</p>` : ""}</div></div>
    </div>
    ${CV.warplan ? CV.warplan(r).html : ""}
    <details class="lgdoc" style="margin-top:10px"><summary><b>Nguồn số liệu của ${esc(r.name)}</b> (bấm để mở từng link)</summary><ul class="small">${[...new Map(MET.flatMap(m => srcList(m[0], r)).concat((r.ext || {}).src || []).map(z => [z[0], z])).values()].map(([t, u]) => `<li>${u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(t)}</a>` : esc(t) + " <span class='muted'>(" + kindOf(t) + ")</span>"}</li>`).join("")}</ul></details>
    <p class="note">Hạng: #1 là cao nhất. Màu xanh = tốt cho kinh doanh, đỏ = bất lợi, xám = trung tính. Xếp hạng “công bố” lấy theo Cục Thống kê / Cục ĐTNN khi có; còn lại xếp trên số đang có trên bản đồ (n = số tỉnh có dữ liệu). ${esc(Object.values(PS.notes || {}).join(" · "))}</p>`;
  try{ CV.select(r.name, true); }catch(e){}
}
function open(name){ RK = null; cache = null; render(name || CV.selected || "Hà Nội"); if(!dlg.open) dlg.showModal(); }
dlg.addEventListener("change", e => { if(e.target.id === "bdProv") render(e.target.value);
  if(e.target.id === "bdColor"){ const v = e.target.value; if(v) CV.setMap({metric: v, color: "metric"}); } });
dlg.addEventListener("click", e => { const names = [...sel.options].map(o => o.value), i = names.indexOf(sel.value);
  if(e.target.id === "bdPrev") render(names[(i - 1 + names.length) % names.length]); if(e.target.id === "bdNext") render(names[(i + 1) % names.length]);
  if(e.target.id === "bdBen"){ const md = boardMd(sel.value); dlg.close(); CV.openAi(true); CV.benTab("Chat"); CV.addMsg("u", "Phòng chiến lược " + sel.value); const b = CV.addMsg("a", ""); CV.finishBubble(b, md, false, "Phòng chiến lược " + sel.value, true); } });
// nút trên thanh công cụ bản đồ + trên trang
const tools = document.querySelector(".maptools"); if(tools){ const b = document.createElement("button"); b.type = "button"; b.id = "btnBoard"; b.className = "primary"; b.textContent = "Phòng chiến lược HĐQT"; b.addEventListener("click", () => open()); tools.prepend(b); }
CV.openBoard = open; CV.boardPosture = posture; CV.boardAgg = A; CV.postureReset = () => { RK = null; cache = null; if(CV.radarReset) CV.radarReset(); };
try{ CV.renderAll && CV.renderAll(); }catch(e){ console.warn(e); }

function boardMd(name){
  const r = CV.findRow(name); if(!r) return "Không tìm thấy tỉnh.";
  const T = tactics(r), P = T.P;
  return `# Phòng chiến lược: ${r.name}\n_Thế trận đề xuất: **${P.t}** (hấp dẫn ${fmtInt(P.attr*100)}/100, nội lực ${fmtInt(P.str*100)}/100). ${P.why}_\n\n${[...new Set(MET.map(m => m[1]))].map(g => `## ${g}\n| Chỉ số | Giá trị | Hạng | Nguồn |\n|---|---|---|---|\n${MET.filter(m => m[1] === g).map(m => { const v = m[4](r), rk = rankOf(m[0], r), off = official(m[0], r); return `| ${m[2]} | ${v == null || !isFinite(v) ? "—" : (m[0] === "cover" && v >= 99 ? "không bán" : Number.isInteger(v) || Math.abs(v) >= 1000 ? fmtInt(v) : fmt1(v)) + " " + m[3]} | ${rk ? (off || rk[0]) + "/" + (off ? 34 : rk[1]) : "—"} | ${srcMd(m[0], r)} |`; }).join("\n")}`).join("\n\n")}\n\n## Đối sách ngắn hạn 30–90 ngày\n${T.lines.map((l,i) => `${i+1}. ${l}`).join("\n")}\n\n## Chiến lược dài hạn 1–3 năm\n${T.longs.map((l,i) => `${i+1}. ${l}`).join("\n")}\n\n## Văn hóa, mùa vụ\n- ${r.culture}\n- Tâm lý khách: ${r.psyche}\n- Lễ hội: ${r.festivals}; đặc sản: ${r.specialties}\n- Mùa vụ: ${(r.seasonNotes || []).join("; ")}\n`;
}
function overviewMd(){
  const rows = CV.rows.map(r => ({r, P: posture(r)})).sort((a,b) => b.P.attr + b.P.str - a.P.attr - a.P.str);
  const grp = k => rows.filter(x => x.P.k === k).map(x => x.r.name).join(", ") || "—";
  return `# Bản đồ thế trận 34 tỉnh\n- **Đánh nhanh, thắng nhanh:** ${grp("fast")}\n- **Đánh chậm, thắng chắc:** ${grp("slow")}\n- **Giữ chắc, khai thác:** ${grp("hold")}\n- **Du kích, chọn lọc:** ${grp("guer")}\n\n| Tỉnh | Thế trận | Hấp dẫn | Nội lực | Tăng trưởng 2025 | Bán lẻ T1–T10 | Tồn 21/11 |\n|---|---|---|---|---|---|---|\n${rows.map(({r,P}) => `| ${r.name} | ${P.t} | ${fmtInt(P.attr*100)} | ${fmtInt(P.str*100)} | ${f1(r.growth)}% | ${n0(r.sales)} | ${n0(A(r).inv)} |`).join("\n")}\n`;
}
CV.tools.push({name: "phong_chien_luoc", label: "Đang mở phòng chiến lược…", description: "Phòng chiến lược HĐQT cho một tỉnh: mọi chỉ số kinh tế – xã hội, thị trường xe (ĐK mới, UIO, đăng ký ô tô), đối thủ, Đô Thành (bán, tồn, dự báo, KH 2027) kèm xếp hạng /34; thế trận đề xuất (đánh nhanh thắng nhanh / đánh chậm thắng chắc / giữ chắc / du kích); đối sách 30–90 ngày và chiến lược 1–3 năm. tinh: tên tỉnh; bỏ trống = bản đồ thế trận 34 tỉnh.", inputSchema: {type: "object", properties: {tinh: {type: "string"}}},
  execute: ({tinh}) => { if(!tinh) return overviewMd(); const r = CV.findRow(tinh); if(!r) throw new Error("Không tìm thấy tỉnh " + tinh); open(r.name); return boardMd(r.name); }});
CV.localHooks.unshift(raw => { const t = raw.replace(/^ben\s*(ơi)?[,:\s]+/i, "").trim();
  if(/thế trận 34 tỉnh|bản đồ thế trận/i.test(t)){ CV.setMap({metric: "posture", color: "metric"}); return overviewMd(); }
  const m = t.match(/(?:phòng chiến lược|trình hđqt|chiến lược tỉnh)\s*(.*)/i); if(!m) return null; const r = CV.findRow(m[1].trim()) || CV.findRow(CV.selected || ""); open(r ? r.name : null); return r ? boardMd(r.name) : overviewMd(); });
const prev = CV.ctx; CV.ctx = () => (prev ? prev() : "") + `\nPHÒNG CHIẾN LƯỢC HĐQT: hỏi chiến lược một tỉnh, thế trận, xếp hạng tỉnh dùng phong_chien_luoc (bỏ trống tinh = 34 tỉnh).`;
})();
