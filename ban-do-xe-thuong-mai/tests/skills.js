const {chromium} = require('playwright');
const ARGS = {
  update_map_data: {target: 'Cần Thơ', field: 'sales', value: 480, mode: 'set'}, undo_last_change: {}, ops_brief: {}, list_tasks: {}, create_task: {title: 'Kiểm kê phụ tùng Hậu Giang', owner: 'Lan', dept: 'Phụ tùng', due: '2026-12-05', kpi_name: 'Số phiếu kiểm kê', kpi_target: 10, evidence_req: 'Biên bản kiểm kê'},
  update_task: {task: 'Kiểm kê', note: 'Đã kiểm 50%', progress: 50}, get_meeting_transcript: {}, ky_luat_hop: {}, show_lens: {lens: 'uio', province: 'Cần Thơ'}, get_indicators: {name: 'Cần Thơ'}, diagnose_province: {name: 'Cần Thơ'},
  am_lich: {date: '2026-12-05'}, gieo_que: {question: 'Mở đại lý tại Gia Lai có thuận không', a: 5, b: 8}, menh_khach: {birth: '1985'}, thien_dia_nhan: {name: 'Cần Thơ'}, tra_cuu_phap_luat: {query: 'niên hạn xe tải'}, lich_tuan_thu: {days: 90},
  mang_luoi_doi_thu: {}, so_sanh_doi_thu: {brand: 'thaco'}, du_bao_doanh_so: {}, ban_le_t11: {dai_ly: 'Trường Vũ'}, doanh_so_chi_tiet: {dai_ly: 'Trường Vũ'}, du_bao_kinh_doanh: {tai_trong: '1-3,5 tấn'}, mo_hinh_du_bao_dac: {}, giai_thich_chi_so: {chi_so: 'UIO'},
  ton_kho_dai_ly: {}, ban_hang_chi_tiet: {dai_ly: 'Trường Vũ'}, kho_nha_may: {}, ho_so_dai_ly: {dai_ly: 'Trường Vũ'}, phong_chien_luoc: {tinh: 'Cần Thơ'}, binh_phap_dia_ban: {tinh: 'Đà Nẵng'}, radar_kinh_te: {tinh: 'Hà Nội'}, chinh_sach_ban_hang: {dai_ly: 'Trường Vũ'},
  thi_truong_2026: {tinh: 'Cần Thơ'}, doi_dau_mau_xe: {mau: 'IZ65M Plus'}, doi_thu_tai_tinh: {tinh: 'Cần Thơ'}, khach_hang: {tinh: 'Đắk Lắk'}, chien_dich_mkt: {tinh: 'Đồng Nai'}, de_xuat_chien_dich: {dai_ly: 'Trường Vũ'}, tai_san_ton_kho: {dai_ly: 'Trường Vũ'},
  lo_trinh_2027: {}, doi_thu_4_khia_canh: {hang: 'thaco'}, lich_cham_soc_khach: {}, dong_tien: {}, nhap_du_lieu: {loai: 'debt'}, kiem_soat_du_lieu: {}, chien_truong: {dai_ly: 'Trường Vũ'}, tim_nguon_ai: {chu_de: 'gia'}, nang_luc_canh_tranh: {}, ra_soat_lead_tuan: {},
  get_province: {name: 'Cần Thơ'}, calc: {expr: '122235*8%'}, focus_location: {name: 'Trường Vũ'}, focus_province: {name: 'Cần Thơ'}, get_customer_care: {name: 'Cần Thơ'}, get_market_structure: {name: 'Cần Thơ'}, get_price: {model: 'IZ65M Plus'}, merge_share: {names: ['Cần Thơ', 'Hậu Giang']}, recommend_sites: {n: 5}, set_map: {metric: 'market'}, split_province: {name: 'Đồng Nai'}
};
(async () => {
  const b = await chromium.launch({args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
  const ctx = await b.newContext({viewport: {width: 1300, height: 900}, offline: true}); const p = await ctx.newPage(); const net = [];
  p.on('request', r => { if (!/^(file|data|blob):/.test(r.url())) net.push(r.url().slice(0, 80)); });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 100)); });
  await p.goto('file:///home/user/dashboard-dothanh/ban-do-xe-thuong-mai/index.html'); await p.waitForTimeout(6000);
  await p.evaluate(() => window.__CV.view3d.stopIntro());
  const res = await p.evaluate(async (ARGS) => {
    const CV = window.__CV, all = CV.aiTools.concat(CV.tools), out = [];
    for (const t of all) {
      const a = ARGS[t.name] || {}, r = {n: t.name};
      for (const k of [1, 2]) { const t0 = performance.now(); try { const v = await Promise.race([Promise.resolve(t.execute(a, {})), new Promise((_, j) => setTimeout(() => j(new Error('timeout 8s')), 8000))]); const s = typeof v === 'string' ? v : JSON.stringify(v); r['ms' + k] = Math.round(performance.now() - t0); r.len = s.length; r.bad = (s.match(/NaN|undefined|\[object|Infinity|null\b/g) || []).slice(0, 3).join(','); r.head = s.replace(/\s+/g, ' ').slice(0, 90); r.err = null; } catch (e) { r['ms' + k] = Math.round(performance.now() - t0); r.err = String(e.message || e).slice(0, 120); } }
      // đóng hộp thoại mở ra
      document.querySelectorAll('dialog[open]').forEach(d => d.close());
      out.push(r);
    }
    return out;
  }, ARGS);
  console.log(JSON.stringify({res, net, errs}));
  await b.close();
})();
