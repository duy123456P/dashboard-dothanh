/* ===== Ben offline: trả lời câu hỏi bằng các kỹ năng (công cụ) có sẵn, không cần AI, không cần mạng =====
   Khi mở ngoài Claude (tệp offline, GitHub Pages) Ben không có mô hình ngôn ngữ. Module này hiểu câu hỏi bằng quy tắc:
   nhận ý định (từ khóa tiếng Việt không dấu), tách tỉnh, đại lý, hãng, mẫu xe, ngày, rồi gọi đúng kỹ năng và trả markdown.
   Không đoán: câu nào không nhận ra thì gợi ý kỹ năng gần nhất, không bịa câu trả lời. Phân tích sâu bằng AI vẫn cần mở trong Claude. */
(function(){
"use strict";
const CV = window.__CV; if(!CV || !CV.tools) return;
const fold = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9.\/\- ]+/g, " ").replace(/\s+/g, " ").trim();
const esc = CV.esc, all = () => (CV.aiTools || []).concat(CV.tools), byName = n => all().find(t => t.name === n);
const mem = {tinh: "", dai_ly: ""};

/* ---------- ý định: [kỹ năng, mẫu nhận diện (không dấu), điểm, cần tham số] ---------- */
const I = [
  ["calc", /^[\d(][\d.,+\-*\/^%() x×÷]+$/, 9],
  ["dong_tien", /dong tien|thanh khoan|dut gay|cashflow|\bdso\b|cong no|thu no|qua han/, 5],
  ["kiem_soat_du_lieu", /kiem soat (du lieu|so lieu)|sai lech|chat luong (du lieu|so lieu)|doanh thu.*(ghi nhan|khac tien)|ghi nhan doanh thu|\brr-|\bdc-/, 6],
  ["nhap_du_lieu", /nhap (du lieu|cong no|ton|ban le)|cong nhap|tai (file|tep) (cong no|ton)/, 6],
  ["ky_luat_hop", /ky luat hop|bien ban chua chot|chua chot bien ban|hop xong|nang luc thuc thi/, 6],
  ["get_meeting_transcript", /loi thoai|da noi gi|da chot gi|cuoc hop dang ghi/, 6],
  ["ops_brief", /hom nay (nen )?(lam|can)|can lam gi|uu tien (hom nay|tuan)|ban tin|dieu hanh hom nay|viec do|viec tre|viec cham|tien do cong viec/, 5],
  ["list_tasks", /danh sach (viec|dau viec)|dau viec|cong viec cua|viec cua/, 4],
  ["ra_soat_lead_tuan", /\blead\b|ra soat tuan|khach tiem nang .*(diem|cham)|cham diem lead/, 6],
  ["nang_luc_canh_tranh", /nang luc canh tranh|tru cot|tran dung|4 tru cot/, 6],
  ["tim_nguon_ai", /deep research|tim nguon|dan chung|chatgpt|grok|perplexity|tim kiem bang ai/, 6],
  ["chien_truong", /chien truong|mat tran .*(dai ly|\w+)|chien luoc mat tran|doi thu quanh/, 6],
  ["chien_dich_mkt", /chien dich|\bmkt\b|marketing offline|su kien|hoi thao|luu dong/, 5],
  ["de_xuat_chien_dich", /de xuat chien dich|chien dich cho dai ly/, 6],
  ["lich_cham_soc_khach", /lich cham soc|cham soc khach/, 6],
  ["khach_hang", /khach (hang )?tiem nang|khach da mua|khach hang/, 5],
  ["doi_dau_mau_xe", /\b(iz\d{2}\w*|v56|v65|t26|t33l?|jp120\w*|hc[68]|hu[68]|novus)\b.*(doi dau|so sanh|doi thu)|(doi dau|so sanh).*\b(iz\d{2}\w*|v56|v65|t26|t33l?|jp120\w*)\b/, 8],
  ["doi_thu_4_khia_canh", /khia canh|4 khia|doi thu (san pham|dich vu|nhan dien|chinh sach)/, 6],
  ["so_sanh_doi_thu", /so sanh|doi dau|\bvs\b|ban gia doi thu|gia doi thu|chinh sach doi thu/, 4],
  ["mang_luoi_doi_thu", /mang luoi doi thu|diem ban doi thu|showroom doi thu|dai ly doi thu|xuong dich vu doi thu|so (dai ly|diem ban) cua/, 6],
  ["doi_thu_tai_tinh", /doi thu (o|tai|trong|tinh)|thi phan .*(tinh|doi thu)|ai dang ban|hang nao ban/, 5],
  ["ho_so_dai_ly", /ho so (?!tinh)|360|thong tin dai ly|dai ly .*(the nao|ra sao|tot|yeu)|suc khoe dai ly/, 5],
  ["ban_le_t11", /ban le (t11|thang 11)|t11/, 6],
  ["doanh_so_chi_tiet", /doanh so (chi tiet|dai ly|theo)|so ban (cua|theo)|tdbh|sell ?(in|out)|ban si/, 4],
  ["ban_hang_chi_tiet", /ban hang chi tiet|giao dich|theo (model|mau xe)|cong nang/, 4],
  ["du_bao_doanh_so", /du bao doanh so|du bao ban hang/, 6],
  ["du_bao_kinh_doanh", /du bao kinh doanh|s&op|do tre vi mo|lam sach/, 6],
  ["mo_hinh_du_bao_dac", /mo hinh du bao|sarimax|hoi quy|hybrid|du bao dac/, 6],
  ["ton_kho_dai_ly", /ton kho|xa ton|ton dai ly|do phu|tuoi ton|mbtb/, 5],
  ["kho_nha_may", /kho nha may|thanh pham|dang san xuat|xe che|nhap xuat ton|ton nha may/, 6],
  ["tai_san_ton_kho", /tai san|von chon|von ton|gia tri ton/, 6],
  ["lo_trinh_2027", /2027|lo trinh|eisenhower|5\.?000 xe|ke hoach nam toi/, 6],
  ["chinh_sach_ban_hang", /chinh sach (ban hang|thuong|ho tro)|thuong dai ly|thuong tvbh|doi soat so ban|ho tro lai/, 5],
  ["tra_cuu_phap_luat", /phap luat|nghi dinh|thong tu|quy dinh|nien han|thue|le phi|dang kiem|tai trong cho phep|luat/, 5],
  ["lich_tuan_thu", /tuan thu|han (nop|hieu luc)|lich phap ly/, 6],
  ["radar_kinh_te", /radar|kinh te vi mo|gdp|cpi|lai suat|ty gia|tin dung|fdi|pmi|dau tu cong/, 5],
  ["thi_truong_2026", /thi truong|dang ky moi|\bdkm\b|phan khuc|\buio\b|quy mo/, 4],
  ["phong_chien_luoc", /yeu nhat|manh nhat|o dau (yeu|manh|tot)|phong chien luoc|hdqt|the tran|danh nhanh|danh cham|du kich|giu chac/, 6],
  ["binh_phap_dia_ban", /binh phap|ton tu|dia ban/, 6],
  ["thien_dia_nhan", /thien dia nhan/, 8],
  ["show_lens", /lop (du lieu|nen)|lens/, 6],
  ["diagnose_province", /vi sao .*(khong ban|chua ban|thap)|chan doan|nguyen nhan .*(thap|yeu)/, 7],
  ["get_indicators", /chi so|bang chi so/, 4],
  ["giai_thich_chi_so", /(la gi|nghia la|giai thich|cach doc|dinh nghia)/, 5],
  ["am_lich", /am lich|ngay tot|ngay (hom nay )?can chi|xem ngay|ngay hoang dao/, 6],
  ["gieo_que", /gieo que|mai hoa|que dich|xin que/, 7],
  ["menh_khach", /menh|tuoi (khach|ty|suu|dan|mao|thin|ti|mui|than|dau|tuat|hoi)|sinh nam/, 6],
  ["get_price", /\bgia\b.*\b(iz\d{2}\w*|v56|v65|t26|t33l?|jp120\w*|hc[68])|bang gia|gia (cong bo|xe|ban)/, 5],
  ["recommend_sites", /de xuat (mo )?dai ly|mo (them )?(dai ly|tram)|nen mo|xep hang .*(tinh|dai ly)|tinh nao .*(mo|them)|diem (mo|dat) dai ly|dia diem dai ly/, 7],
  ["get_market_structure", /co cau thi truong|co cau (tai trong|thung|thuong hieu)/, 6],
  ["get_customer_care", /cham soc khach thang|giu chan khach/, 6],
  ["merge_share", /^(gop|tong|cong(?! no| viec| thuc))\b/, 7],
  ["split_province", /^tach\b/, 7],
  ["focus_province", /^(mo|xem|bay toi|di toi|phong to|zoom)\b.*(tinh|thanh pho|\btp\b)?/, 3],
  ["set_map", /to mau|chi so tren ban do|doi chi so|hien cot|cot chi so/, 6],
  ["update_map_data", /^(cap nhat|sua|dat|tang|giam)\b/, 7],
  ["undo_last_change", /hoan tac|undo|huy thay doi/, 8],
  ["create_task", /^(giao viec|tao viec)\b/, 8],
  ["get_province", /ho so tinh|thong tin tinh|ve tinh|tinh nay|tong quan tinh/, 5],
];
const NEED = {get_indicators: "tinh", diagnose_province: "tinh", thien_dia_nhan: "tinh", doi_thu_tai_tinh: "tinh", get_province: "tinh", ho_so_dai_ly: "dai_ly", giai_thich_chi_so: "chi_so", menh_khach: "birth", split_province: "tinh", focus_province: "tinh", get_customer_care: "tinh", doi_dau_mau_xe: "mau"};

/* ---------- tách tham số ---------- */
function findProv(f){
  const w = f.split(" "); let best = null;
  for(let n = Math.min(4, w.length); n >= 1 && !best; n--) for(let i = 0; i + n <= w.length; i++){ const g = w.slice(i, i + n).join(" "); if(g.length < 4) continue; const r = CV.findRow(g); if(r){ best = r.name; break; } }
  if(!best) CV.rows.forEach(r => { const nm = fold(r.name).replace(/^tp\.? ?/, ""); if(nm.length > 3 && f.includes(nm) && (!best || nm.length > fold(best).length)) best = r.name; });
  return best;
}
function findDealer(f){
  let best = null, bl = 0; (CV.NET.dealers || []).concat(CV.NET.stations || []).forEach(d => [d.salesKey, d.name].forEach(n => { const k = fold(n).replace(/^(o to|dai ly|cty tnhh|cong ty|tm|xnk tm) /, ""); if(k.length >= 4 && f.includes(k) && k.length > bl){ best = d.salesKey || d.name; bl = k.length; } }));
  return best;
}
const BRANDS = [["thaco", /thaco|truong hai/], ["teraco", /teraco|daehan/], ["jac", /\bjac\b/], ["foton", /foton/], ["tmt", /\btmt\b|cuu long/], ["isuzu", /isuzu/], ["veam", /veam/], ["kimlong", /kim long/]];
const brandOf = f => (BRANDS.find(b => b[1].test(f)) || [])[0] || "";
const modelOf = raw => { const m = raw.match(/\b(iz\s?\d{2}\w*(?:\s?plus)?|v56|v65|t26|t33l?|jp120\s?(?:sl|exl)|hc\s?[68]|hu\s?[68]|novus)\b/i); return m ? m[1].replace(/\s+/g, "").replace(/plus/i, " Plus").toUpperCase().replace(" PLUS", " Plus") : ""; };
function dateOf(raw){ const m = raw.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/); if(m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`; if(/hom nay|bay gio/.test(fold(raw))) return new Date().toISOString().slice(0, 10); return ""; }
function args(tool, raw){
  const f = fold(raw), tinh = findProv(f) || "", dl = findDealer(f) || "", a = {};
  const props = Object.keys((byName(tool).inputSchema || {}).properties || {});
  if(tinh) mem.tinh = tinh; if(dl) mem.dai_ly = dl;
  const T = tinh || (NEED[tool] === "tinh" ? mem.tinh : ""), D = dl || (NEED[tool] === "dai_ly" ? mem.dai_ly : "");
  props.forEach(p => {
    if(["tinh", "province"].includes(p)) { if(T) a[p] = T; }
    else if(p === "name"){ if(["get_province", "get_indicators", "diagnose_province", "thien_dia_nhan", "split_province", "focus_province", "get_customer_care"].includes(tool)){ if(T) a[p] = T; } else if(tool === "focus_location"){ if(D || T) a[p] = D || T; } }
    else if(p === "dai_ly"){ if(D) a[p] = D; }
    else if(p === "brand" || p === "hang"){ const b = brandOf(f); if(b) a[p] = b; }
    else if(p === "mau" || p === "model"){ const m = modelOf(raw); if(m) a[p] = m; }
    else if(p === "date"){ const d = dateOf(raw); if(d) a[p] = d; }
    else if(p === "birth"){ const m = raw.match(/(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4}|(?:19|20)\d{2})/); if(m) a[p] = m[1]; }
    else if(p === "chi_so"){ const t = raw.replace(/\b(là gì|nghĩa là|giải thích|cách đọc|định nghĩa|chỉ số|thế nào|ra sao|hãy|ben ơi|ben)\b/gi, " ").replace(/[?.!]/g, " ").replace(/\s+/g, " ").trim(); if(t) a[p] = t; }
    else if(p === "expression"){ a[p] = raw; }
    else if(p === "names"){ const n = CV.rows.filter(r => f.includes(fold(r.name).replace(/^tp\.? ?/, ""))).map(r => r.name); if(n.length) a[p] = n; }
    else if(p === "query" || p === "q"){ a[p] = raw; }
    else if(p === "days"){ const m = f.match(/(\d{2,4}) ngay/); if(m) a[p] = +m[1]; }
    else if(p === "question"){ a[p] = raw; }
    else if(p === "chu_de"){ const m = [["gia", /gia|bang gia/], ["km", /khuyen mai|uu dai|chinh sach/], ["mxh", /facebook|youtube|tiktok|video|mang xa hoi/], ["cs", /showroom|xuong|nhan dien/], ["dl", /dai ly|diem ban/], ["pl", /phap luat|thue|nghi dinh/], ["tt", /thi truong|dang ky/]].find(x => x[1].test(f)); if(m) a[p] = m[0]; }
    else if(p === "mien"){ const m = f.match(/mien (bac|trung|nam|tay)/); if(m) a[p] = "Miền " + {bac: "Bắc", trung: "Trung", nam: "Nam", tay: "Tây"}[m[1]]; }
    else if(p === "metric"){ const m = [["market", /dang ky moi|dkm|thi truong/], ["uio", /uio/], ["attr", /hap dan/], ["share", /thi phan/], ["grdp", /grdp/], ["pop", /dan so/]].find(x => x[1].test(f)); if(m) a[p] = m[0]; }
  });
  return a;
}

/* ---------- nhận ý định ---------- */
function rank(raw){
  const f = fold(raw), out = [];
  I.forEach(([t, re, w]) => { if(!byName(t)) return; const hit = re.test(f) || re.test(raw.trim()); if(hit){ let s = w; if(f.length < 6) s -= 2; out.push([t, s]); } });
  // dự phòng: so khớp từ khóa với mô tả kỹ năng
  const ws = new Set(f.split(" ").filter(x => x.length > 2));
  all().forEach(t => { if(out.some(o => o[0] === t.name)) return; const d = fold(t.name.replace(/_/g, " ") + " " + (t.description || "")).split(" "); let s = 0; d.forEach(x => { if(ws.has(x)) s++; }); const sc = s / Math.sqrt(d.length + 8) * 6; if(sc >= 1.1) out.push([t.name, Math.min(3, sc)]); });
  const hasProv = !!findProv(f);
  out.forEach(o => { if(hasProv && NEED[o[0]] === "tinh" && o[1] > 3) o[1] += 2; if(hasProv && o[0] === "giai_thich_chi_so") o[1] -= 2; });
  return out.sort((a, b) => b[1] - a[1]);
}
const chips = (items) => `<div style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0">${items.map(([t, q]) => `<button type="button" class="askben" data-ask="${esc(q)}">${esc(t)}</button>`).join("")}</div>`;
const HELP = [["Thị trường", ["thi_truong_2026", "radar_kinh_te", "get_market_structure", "doi_thu_tai_tinh", "mang_luoi_doi_thu"]], ["Đối thủ, sản phẩm", ["so_sanh_doi_thu", "doi_dau_mau_xe", "doi_thu_4_khia_canh", "get_price", "nang_luc_canh_tranh", "chien_truong"]], ["Bán hàng, kho", ["doanh_so_chi_tiet", "ban_le_t11", "ban_hang_chi_tiet", "ton_kho_dai_ly", "kho_nha_may", "tai_san_ton_kho", "chinh_sach_ban_hang"]], ["Dự báo, kế hoạch", ["du_bao_doanh_so", "du_bao_kinh_doanh", "mo_hinh_du_bao_dac", "lo_trinh_2027"]], ["Tài chính, dữ liệu", ["dong_tien", "kiem_soat_du_lieu", "nhap_du_lieu", "giai_thich_chi_so"]], ["Khách hàng, chiến dịch", ["khach_hang", "chien_dich_mkt", "de_xuat_chien_dich", "lich_cham_soc_khach", "ra_soat_lead_tuan"]], ["Điều hành, họp", ["ops_brief", "list_tasks", "create_task", "update_task", "get_meeting_transcript", "ky_luat_hop"]], ["Địa bàn, chiến lược", ["phong_chien_luoc", "binh_phap_dia_ban", "get_province", "get_indicators", "diagnose_province", "recommend_sites", "show_lens"]], ["Pháp chế, lý học", ["tra_cuu_phap_luat", "lich_tuan_thu", "am_lich", "gieo_que", "menh_khach", "thien_dia_nhan"]], ["Bản đồ, công cụ", ["set_map", "focus_province", "focus_location", "merge_share", "split_province", "calc", "update_map_data", "undo_last_change", "tim_nguon_ai"]]];
const EX = {thi_truong_2026: "thị trường Cần Thơ", radar_kinh_te: "radar kinh tế Hà Nội", get_market_structure: "cơ cấu thị trường Đồng Nai", doi_thu_tai_tinh: "đối thủ ở Cần Thơ", mang_luoi_doi_thu: "mạng lưới đối thủ", so_sanh_doi_thu: "so sánh Thaco", doi_dau_mau_xe: "đối đầu IZ45S", doi_thu_4_khia_canh: "đối thủ 4 khía cạnh Thaco", get_price: "giá IZ50S", nang_luc_canh_tranh: "năng lực cạnh tranh", chien_truong: "chiến trường Trường Vũ", doanh_so_chi_tiet: "doanh số Trường Vũ", ban_le_t11: "bán lẻ T11 Trường Vũ", ban_hang_chi_tiet: "bán hàng chi tiết Trường Vũ", ton_kho_dai_ly: "tồn kho đại lý", kho_nha_may: "kho nhà máy", tai_san_ton_kho: "tài sản tồn kho", chinh_sach_ban_hang: "chính sách bán hàng", du_bao_doanh_so: "dự báo doanh số", du_bao_kinh_doanh: "dự báo kinh doanh", mo_hinh_du_bao_dac: "mô hình dự báo", lo_trinh_2027: "lộ trình 2027", dong_tien: "dòng tiền", kiem_soat_du_lieu: "kiểm soát dữ liệu", nhap_du_lieu: "nhập dữ liệu công nợ", giai_thich_chi_so: "UIO là gì", khach_hang: "khách hàng Đắk Lắk", chien_dich_mkt: "chiến dịch MKT Đồng Nai", de_xuat_chien_dich: "đề xuất chiến dịch Trường Vũ", lich_cham_soc_khach: "lịch chăm sóc khách", ra_soat_lead_tuan: "rà soát LEAD tuần", ops_brief: "bản tin điều hành", list_tasks: "danh sách việc", ky_luat_hop: "kỷ luật họp", phong_chien_luoc: "phòng chiến lược Cần Thơ", binh_phap_dia_ban: "binh pháp Đà Nẵng", get_province: "hồ sơ tỉnh Gia Lai", get_indicators: "chỉ số Cần Thơ", diagnose_province: "vì sao Cần Thơ chưa bán được", recommend_sites: "đề xuất mở đại lý", show_lens: "lớp dữ liệu UIO Cần Thơ", tra_cuu_phap_luat: "pháp luật niên hạn xe tải", lich_tuan_thu: "lịch tuân thủ 90 ngày", am_lich: "âm lịch hôm nay", gieo_que: "gieo quẻ mở đại lý Gia Lai", menh_khach: "mệnh khách sinh năm 1985", thien_dia_nhan: "thiên địa nhân Cần Thơ", set_map: "tô màu theo thị phần", focus_province: "mở Cần Thơ", merge_share: "gộp Cần Thơ, Hậu Giang", split_province: "tách Đồng Nai", calc: "122235 x 8%", ho_so_dai_ly: "hồ sơ đại lý Trường Vũ"};
function helpHtml(){
  return `<p><b>Ben offline</b> trả lời bằng ${all().length} kỹ năng có sẵn trong máy, không cần mạng và không dùng AI. Bấm một câu mẫu hoặc gõ câu hỏi (có tên tỉnh, đại lý, hãng, mẫu xe).</p>` + HELP.map(([g, ts]) => `<p style="margin:8px 0 2px"><b>${esc(g)}</b></p>${chips(ts.filter(t => EX[t]).map(t => [EX[t], EX[t]]))}`).join("") + `<p class="tiny muted">Phân tích sâu, viết biên bản bằng AI, trả lời câu hỏi tự do: cần mở bản đồ trong Claude.</p>`;
}
const ASK = {tinh: ["Anh cho em biết tỉnh, thành nào?", () => CV.rows.slice().sort((a, b) => (b._market || 0) - (a._market || 0)).slice(0, 8).map(r => r.name)], dai_ly: ["Anh cho em biết đại lý nào?", () => (CV.NET.dealers || []).filter(d => d.salesKey).slice(0, 8).map(d => d.salesKey)], mau: ["Anh cho em biết mẫu xe nào (ví dụ IZ45S, IZ50S, V56, JP120SL)?", () => ["IZ45S", "IZ50S", "IZ62M", "V56", "T26", "JP120SL"]], chi_so: ["Anh muốn giải thích chỉ số nào (ví dụ UIO, DSO, thị phần phân khúc)?", () => ["UIO", "DSO", "thị phần phân khúc"]], birth: ["Anh cho em năm sinh hoặc ngày sinh của khách (ví dụ 1985)?", () => []]};
const LABEL = {tinh: "tỉnh", dai_ly: "đại lý", mau: "mẫu xe"};

async function answer(raw){
  const t0 = performance.now(), text = String(raw || "").trim(); if(!text) return null;
  const f = fold(text);
  if(/^(ben )?(lam duoc gi|giup gi|ky nang|huong dan|help|tro giup|menu)\b|ben (co the|lam duoc)/.test(f) || /^\?$/.test(f)) return {html: helpHtml()};
  if(/^(chao|xin chao|hello|hi|alo)\b/.test(f) && f.length < 20) return {html: "<p>Chào anh. Em là Ben (chế độ offline, trả lời từ dữ liệu trong máy). Anh hỏi tỉnh, đại lý, hãng, mẫu xe nào em tra ngay.</p>" + helpHtml()};
  const R = rank(text);
  if(!R.length || R[0][1] < 1.5){
    const sug = R.slice(0, 4).map(r => [EX[r[0]] || r[0], EX[r[0]] || r[0]]);
    return {html: `<p>Em chưa nhận ra câu này ở chế độ offline (em không đoán). ${sug.length ? "Có phải anh muốn:" : ""}</p>${sug.length ? chips(sug) : ""}${helpHtml()}`};
  }
  const tool = R[0][0], tl = byName(tool), a = args(tool, text), need = NEED[tool];
  if(need && !a[need === "tinh" ? (tl.inputSchema.properties.tinh ? "tinh" : "name") : need]){
    const [q, mk] = ASK[need] || ["Anh cho em biết thêm thông tin?", () => []], sg = mk();
    return {html: `<p>${esc(q)}</p>${chips(sg.map(x => [x, text + " " + x]))}`};
  }
  let md;
  try{ const v = await tl.execute(a, {}); md = typeof v === "string" ? v : (v == null || (Array.isArray(v) && !v.length) || (typeof v === "object" && !Object.keys(v).length)) ? "Chưa có dữ liệu cho câu hỏi này (kỹ năng " + tool + " trả rỗng)." : "```json\n" + JSON.stringify(v, null, 1) + "\n```"; }
  catch(e){ return {html: `<p>Em không tra được: ${esc(e && e.message || e)}. Anh thử nêu rõ tên tỉnh, đại lý hoặc mẫu xe.</p>`}; }
  const ms = Math.max(1, Math.round(performance.now() - t0));
  return {md, extra: extHtml(text, md), title: EX[tool] || tool, foot: `Kỹ năng: ${tool} · ${ms} ms · offline` + (R[1] && R[1][1] >= R[0][1] - 1 ? " · có thể anh cũng muốn: " + R.slice(1, 3).map(r => EX[r[0]] || r[0]).join(", ") : "")};
}
CV.offlineBen = answer; CV.offlineBenRank = rank; CV.offlineBenArgs = args;
/* Ben online nhưng ngoài Claude: phân tích sâu nhờ AI bên ngoài (người dùng bấm, có xác nhận vì câu trả lời có thể chứa số liệu nội bộ) */
const EXT = [["ChatGPT", q => "https://chatgpt.com/?q=" + encodeURIComponent(q)], ["Grok", q => "https://grok.com/?q=" + encodeURIComponent(q)], ["Perplexity", q => "https://www.perplexity.ai/search?q=" + encodeURIComponent(q)], ["Claude", q => "https://claude.ai/new?q=" + encodeURIComponent(q)]];
const pend = {};
function extHtml(q, md){ if(navigator.onLine === false) return ""; const id = "x" + Math.random().toString(36).slice(2, 8); pend[id] = {q, md};
  return `<div class="tools" style="margin-top:6px"><span class="tiny muted">Phân tích sâu bằng AI ngoài:</span> ${EXT.map(([n]) => `<button type="button" data-ext="${id}:${n}">${n}</button>`).join("")}</div>`; }
document.addEventListener("click", async e => { const b = e.target.closest && e.target.closest("[data-ext]"); if(!b) return; const [id, n] = b.dataset.ext.split(":"), d = pend[id], tool = EXT.find(x => x[0] === n); if(!d || !tool) return;
  const ok = CV.ask ? await CV.ask("Câu trả lời của Ben có thể chứa số liệu nội bộ DAC. Chỉ gửi sang " + n + " khi được phép. Em sẽ chép câu hỏi kèm số liệu vào bộ nhớ tạm và mở " + n + ". Tiếp tục?", {confirm: true}) : window.confirm("Gửi sang " + n + "?"); if(!ok) return;
  const prompt = "Là chuyên gia xe thương mại Việt Nam, hãy phân tích sâu, nêu nhận định, rủi ro, cơ hội và hành động cụ thể (ai, làm gì, khi nào, chỉ số đo). Câu hỏi: " + d.q + "\n\nSố liệu từ bản đồ DAC (ngày " + new Date().toLocaleDateString("vi-VN") + "):\n" + d.md.slice(0, 5000);
  try{ await navigator.clipboard.writeText(prompt); }catch(_){} window.open(tool[1](prompt.length > 1800 ? d.q : prompt), "_blank", "noopener"); CV.toast && CV.toast(prompt.length > 1800 ? "Đã chép số liệu, dán vào " + n : "Đã mở " + n); });
const stEl = () => document.getElementById("aiState");
setTimeout(() => { if(!CV.sample){ const s = stEl(); if(s && !s.textContent) s.textContent = navigator.onLine === false ? "Ben offline: trả lời bằng kỹ năng có sẵn, không cần mạng" : "Ben chạy trong máy (không cần mạng); phân tích sâu: mở trong Claude hoặc bấm AI ngoài dưới mỗi câu trả lời"; const ph = document.getElementById("aiText"); if(ph) ph.placeholder = "Hỏi Ben (offline): “thị trường Cần Thơ”, “tồn kho đại lý”, “so sánh Thaco”, “dòng tiền”… gõ “ben làm được gì”"; } }, 1500);
})();
