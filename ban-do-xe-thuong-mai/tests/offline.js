const {chromium}=require('playwright');const SP=process.argv[2],P=process.argv[3];
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const ctx=await b.newContext({viewport:{width:1500,height:950},offline:true});const p=await ctx.newPage();p.setDefaultTimeout(180000);
const errs=[],net=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,160))});
p.on('request',r=>{if(!r.url().startsWith('file:')&&!r.url().startsWith('data:')&&!r.url().startsWith('blob:'))net.push(r.url().slice(0,80))});
const t0=Date.now();await p.goto('file://'+P);
await p.fill('#pw','sai-mat-khau');await p.click('#go');await p.waitForTimeout(3000);
const bad=await p.textContent('#m');
await p.fill('#pw','Ben168');await p.click('#go');
await p.waitForFunction(()=>window.__CV&&document.querySelector('#stage canvas'),null,{timeout:180000});const tOpen=Date.now()-t0;
await p.waitForTimeout(6000);
const r=await p.evaluate(async()=>{const CV=window.__CV,res={};
 const args={binh_phap_dia_ban:{tinh:'Đà Nẵng'},radar_kinh_te:{tinh:'Hà Nội'},chinh_sach_ban_hang:{},phong_chien_luoc:{tinh:'Cần Thơ'},ho_so_dai_ly:{ten:'Trường Vũ',dai_ly:'Trường Vũ',q:'Trường Vũ',name:'Trường Vũ'}};
 for(const t of CV.tools){ try{ const o=await Promise.race([t.execute(args[t.name]||{}),new Promise((_,j)=>setTimeout(()=>j(new Error('timeout')),5000))]); const s=typeof o==='string'?o:JSON.stringify(o); res[t.name]=/NaN|undefined/.test(s)?'NaN/undefined':'ok '+s.length; }catch(e){ res[t.name]='ERR '+e.message.slice(0,80); } }
 return {n:CV.tools.length,res,rows:CV.rows.length,loadmsg:document.getElementById('loadmsg').hidden,font:getComputedStyle(document.body).fontFamily.slice(0,60)};});
await p.evaluate(()=>{const t=document.getElementById('benTease');if(t)t.hidden=true});
await p.screenshot({path:SP+'/offline.png'});
console.log(JSON.stringify({badMsg:bad,tOpenMs:tOpen,...r,net:[...new Set(net)],errs},null,1));await b.close();})();
