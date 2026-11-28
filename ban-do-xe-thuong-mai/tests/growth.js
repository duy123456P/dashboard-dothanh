const {chromium} = require('playwright');
(async () => {
  const b = await chromium.launch({args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
  const p = await b.newPage({viewport: {width: 1500, height: 1000}}); const errs = [];
  p.on('pageerror', e => errs.push('PE ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text().slice(0, 200)); });
  await p.goto('file:///home/user/dashboard-dothanh/ban-do-xe-thuong-mai/index.html'); await p.waitForTimeout(6000);
  await p.evaluate(() => window.__CV.view3d.stopIntro());
  await p.evaluate(() => window.__CV.openCompetitiveness('growth')); await p.waitForTimeout(1500);
  const o = await p.evaluate(() => { const d = document.querySelector('#nc-growth'); return d.innerText.slice(0, 3800); }); console.log(o);
  console.log(await p.evaluate(() => window.__CV.weeklyLeadReview().slice(0, 1500)));
  await p.evaluate(() => document.querySelector('#nc-growth').scrollIntoView()); await p.screenshot({path: 'g1.png'});
  console.log('errs', errs); await b.close();
})();
