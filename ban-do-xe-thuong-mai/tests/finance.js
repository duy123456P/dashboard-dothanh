const {chromium} = require('playwright');
(async () => {
  const b = await chromium.launch({args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
  const p = await b.newPage({viewport: {width: 1400, height: 900}}); const errs = [];
  p.on('pageerror', e => errs.push('PE ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text()); });
  await p.goto('file:///home/user/dashboard-dothanh/ban-do-xe-thuong-mai/index.html'); await p.waitForTimeout(7000);
  const r = await p.evaluate(async () => {
    const CV = window.__CV, o = {};
    o.btns = ['btnCash', 'btnInput', 'btnCtrl', 'btnGrab', 'btnBoard'].map(i => !!document.getElementById(i));
    const c = CV.cashCalc(); o.cash = c ? {total: Math.round(c.total), over: Math.round(c.over), pct: +c.overPct.toFixed(1), dso: c.dso && +c.dso.toFixed(1), collect: Math.round(c.collectTot), capital: Math.round(c.capital), carry: Math.round(c.carry), top3: +c.top3Pct.toFixed(1)} : null;
    o.ind = CV.cashIndicators().map(x => x.id + ':' + x.lv + ':' + x.txt.slice(0, 40));
    o.rules = CV.dataRules().map(x => x.id + ':' + x.lv);
    o.red = CV.dataControl.redCount();
    // nhập thử công nợ
    const rows = CV.parseTable('Đại lý,Loại hợp đồng,Ngày đến hạn,Số tiền còn nợ,Số khung\nTrường Vũ,HĐMB,15/12/2026,300000000,AAAA1234567890123\nTrường Vũ,HĐMB,01/10/2026,300000000,AAAA1234567890123\nXYZ lạ,MBTB,2026-13-40,,\nQuang Dương,MBTB,10/11/2026,,BBBB1234567890123');
    const r = CV.validateData('debt', rows, {asOf: '2026-11-20', unit: 1});
    o.val = {total: r.total, good: r.good, errs: r.errs.map(e => e.row + ':' + e.msg.slice(0, 60)), warns: r.warns.length};
    const rr = CV.parseTable('Số khung,Đại lý,Ngày thu tiền,Số tiền đã thu,Ngày giao xe,Ngày xuất hóa đơn,Giá bán gồm VAT,Giá vốn,Biên bản giao xe\nAAAA1234567890001,Trường Vũ,01/11/2026,550000000,05/11/2026,05/11/2026,550000000,450000000,Có\nAAAA1234567890002,Trường Vũ,02/11/2026,100000000,,10/11/2026,,,\nAAAA1234567890003,Trường Vũ,02/11/2026,100000000,,,,,\nAAAA1234567890001,Trường Vũ,02/11/2026,100000000,,,,,\nAAAA1234567890004,Trường Vũ,02/11/2026,550000000,06/11/2026,06/11/2026,550000000,,Có');
    const v2 = CV.validateData('retail', rr, {asOf: '2026-11-20', unit: 1, vat: 10});
    o.rr = {total: v2.total, good: v2.good, errs: v2.errs.map(e => e.row + ':' + e.msg.slice(0, 70)), warns: v2.warns.map(e => e.row + ':' + e.msg.slice(0, 40))};
    o.zoom = typeof CV.zoomProvince;
    return o;
  });
  console.log(JSON.stringify(r, null, 1));
  // mở dashboard
  await p.evaluate(() => window.__CV.view3d.stopIntro());
  await p.click('#btnCash'); await p.waitForTimeout(800); await p.screenshot({path: 'f1.png'});
  await p.evaluate(() => document.getElementById('cashBody').scrollTo(0, 600)); await p.waitForTimeout(300); await p.screenshot({path: 'f2.png'});
  await p.keyboard.press('Escape'); await p.click('#btnCtrl'); await p.waitForTimeout(600); await p.screenshot({path: 'f3.png'});
  await p.click('#ctTabs [data-tab=rev]'); await p.waitForTimeout(400); await p.screenshot({path: 'f4.png'});
  console.log('errs', errs); await b.close();
})();
