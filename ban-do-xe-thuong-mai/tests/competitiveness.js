const {chromium} = require('playwright');
(async () => {
  const b = await chromium.launch({args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
  const p = await b.newPage({viewport: {width: 1500, height: 1000}}); const errs = [];
  p.on('pageerror', e => errs.push('PE ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text().slice(0, 200)); });
  await p.goto('file:///home/user/dashboard-dothanh/ban-do-xe-thuong-mai/index.html'); await p.waitForTimeout(6000);
  await p.evaluate(() => window.__CV.view3d.stopIntro());
  await p.evaluate(() => document.getElementById('tabN').click()); await p.waitForTimeout(500);
  const o = await p.evaluate(() => ({pane: document.getElementById('paneN').innerText.slice(0, 1500), hid: [document.getElementById('paneP').hidden, document.getElementById('paneC').hidden, document.getElementById('paneN').hidden]}));
  console.log(JSON.stringify(o, null, 1));
  await p.evaluate(() => document.getElementById('paneN').scrollIntoView()); await p.screenshot({path: 'n0.png'});
  await p.evaluate(() => window.__CV.openCompetitiveness('all')); await p.waitForTimeout(800); await p.screenshot({path: 'n1.png'});
  const t = await p.evaluate(() => { const d = document.getElementById('ncBody'); return d.innerText.slice(0, 200) + ' ... ' + [...d.querySelectorAll('details')].map(x => x.id).join(','); });
  console.log(t);
  const rc = await p.evaluate(() => document.querySelector('#nc-recon').innerText.slice(0, 3500)); console.log(rc);
  await p.evaluate(() => document.getElementById('tabP').click()); await p.waitForTimeout(200);
  console.log(await p.evaluate(() => [document.getElementById('paneP').hidden, document.getElementById('paneN').hidden]));
  console.log('errs', errs); await b.close();
})();
