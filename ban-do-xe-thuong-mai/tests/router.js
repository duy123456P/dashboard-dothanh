const {chromium} = require('playwright');
const Q = [
 ['thị trường Cần Thơ', 'thi_truong_2026'], ['đối thủ ở Cần Thơ', 'doi_thu_tai_tinh'], ['radar kinh tế Hà Nội', 'radar_kinh_te'], ['cơ cấu thị trường Đồng Nai', 'get_market_structure'],
 ['so sánh Thaco', 'so_sanh_doi_thu'], ['đối đầu IZ45S', 'doi_dau_mau_xe'], ['giá IZ50S', 'get_price'], ['mạng lưới đối thủ', 'mang_luoi_doi_thu'], ['đối thủ 4 khía cạnh Thaco', 'doi_thu_4_khia_canh'],
 ['năng lực cạnh tranh', 'nang_luc_canh_tranh'], ['chiến trường Trường Vũ', 'chien_truong'], ['doanh số Trường Vũ', 'doanh_so_chi_tiet'], ['bán lẻ T11 Trường Vũ', 'ban_le_t11'], ['bán hàng chi tiết Trường Vũ', 'ban_hang_chi_tiet'],
 ['tồn kho đại lý', 'ton_kho_dai_ly'], ['kho nhà máy còn bao nhiêu xe', 'kho_nha_may'], ['tài sản tồn kho vốn chôn', 'tai_san_ton_kho'], ['chính sách bán hàng', 'chinh_sach_ban_hang'], ['dự báo doanh số', 'du_bao_doanh_so'],
 ['dự báo kinh doanh', 'du_bao_kinh_doanh'], ['mô hình dự báo SARIMAX', 'mo_hinh_du_bao_dac'], ['lộ trình 2027', 'lo_trinh_2027'], ['dòng tiền thế nào', 'dong_tien'], ['công nợ quá hạn', 'dong_tien'], ['kiểm soát dữ liệu', 'kiem_soat_du_lieu'],
 ['nhập dữ liệu công nợ', 'nhap_du_lieu'], ['UIO là gì', 'giai_thich_chi_so'], ['khách hàng tiềm năng Đắk Lắk', 'khach_hang'], ['chiến dịch MKT Đồng Nai', 'chien_dich_mkt'], ['đề xuất chiến dịch Trường Vũ', 'de_xuat_chien_dich'],
 ['lịch chăm sóc khách', 'lich_cham_soc_khach'], ['rà soát LEAD tuần', 'ra_soat_lead_tuan'], ['bản tin điều hành', 'ops_brief'], ['danh sách việc', 'list_tasks'], ['kỷ luật họp', 'ky_luat_hop'], ['phòng chiến lược Cần Thơ', 'phong_chien_luoc'],
 ['binh pháp Đà Nẵng', 'binh_phap_dia_ban'], ['hồ sơ tỉnh Gia Lai', 'get_province'], ['chỉ số Cần Thơ', 'get_indicators'], ['vì sao Cần Thơ chưa bán được', 'diagnose_province'], ['đề xuất mở đại lý', 'recommend_sites'],
 ['pháp luật niên hạn xe tải', 'tra_cuu_phap_luat'], ['lịch tuân thủ 90 ngày', 'lich_tuan_thu'], ['âm lịch hôm nay', 'am_lich'], ['gieo quẻ mở đại lý Gia Lai', 'gieo_que'], ['mệnh khách sinh năm 1985', 'menh_khach'], ['thiên địa nhân Cần Thơ', 'thien_dia_nhan'],
 ['tô màu theo thị phần', 'set_map'], ['mở Cần Thơ', 'focus_province'], ['gộp Cần Thơ, Hậu Giang', 'merge_share'], ['tách Đồng Nai', 'split_province'], ['122235 x 8%', 'calc'], ['hồ sơ đại lý Trường Vũ', 'ho_so_dai_ly'],
 ['tìm nguồn bằng AI', 'tim_nguon_ai'], ['lớp dữ liệu UIO Cần Thơ', 'show_lens'], ['hoàn tác', 'undo_last_change'], ['chăm sóc khách tháng này', 'get_customer_care'],
];
(async () => {
  const b = await chromium.launch({args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
  const ctx = await b.newContext({viewport: {width: 1300, height: 900}, offline: true}); const p = await ctx.newPage(); const errs = [], net = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('request', r => { if (!/^(file|data|blob):/.test(r.url())) net.push(r.url()); });
  await p.goto('file:///home/user/dashboard-dothanh/ban-do-xe-thuong-mai/index.html'); await p.waitForTimeout(6000);
  await p.evaluate(() => window.__CV.view3d.stopIntro());
  const res = await p.evaluate(async Q => { const CV = window.__CV, out = []; for (const [q, exp] of Q) { const t0 = performance.now(); let r; try { r = await CV.offlineBen(q); } catch (e) { r = {err: e.message}; } const ms = Math.round(performance.now() - t0); const foot = r && r.foot || ''; const got = (foot.match(/Kỹ năng: (\w+)/) || [])[1] || (r && r.html ? 'HTML:' + r.html.replace(/<[^>]+>/g, ' ').slice(0, 50) : r && r.err); out.push([q, exp, got, ms]); document.querySelectorAll('dialog[open]').forEach(d => d.close()); } return out; }, Q);
  let ok = 0; res.forEach(([q, e, g, ms]) => { const good = e === g; if (good) ok++; else console.log('SAI:', q, '→ mong', e, 'được', g); });
  console.log(ok + '/' + res.length + ' đúng; chậm nhất', Math.max(...res.map(r => r[3])) + 'ms; net', net.length, 'errs', errs);
  // luồng chat thật
  await p.evaluate(() => window.__CV.askAi('tồn kho đại lý')); await p.waitForTimeout(800);
  console.log(await p.evaluate(() => { const l = document.getElementById('aiLog'); return l.innerText.slice(-300); }));
  await p.evaluate(() => window.__CV.askAi('ben làm được gì')); await p.waitForTimeout(500);
  await p.evaluate(() => window.__CV.askAi('doanh số')); await p.waitForTimeout(500);
  console.log(await p.evaluate(() => document.getElementById('aiState').textContent));
  await p.screenshot({path: 'bo.png'});
  await b.close();
})();
