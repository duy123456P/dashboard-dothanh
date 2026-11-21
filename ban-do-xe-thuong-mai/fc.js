/* ===== Dự báo kinh doanh 3 bước: làm sạch & phân khúc → độ trễ vĩ mô → S&OP chốt số ===== */
(function(){
"use strict";
const CV = window.__CV; if(!CV) return;
const {esc, fmtInt, fmt1, toast} = CV;
const SEGS = ["< 1 tấn","1–2,5 tấn","2,5–3,5 tấn","3,5–10 tấn","> 10 tấn"];
const BODIES = ["Thùng kín","Mui bạt","Ben","Chuyên dùng","Khác (lửng, chassis, van)"];
const ADJ_T = {sales:"Thông tin thị trường (đội kinh doanh)", comp:"Khuyến mãi, chính sách đối thủ", launch:"Ra mắt sản phẩm mới", supply:"Cung ứng, tồn kho", other:"Khác"};
const SIGN = ["Kinh doanh","Kế hoạch – Tài chính","Cung ứng – Logistics"];
const C = {raw:"#5c7393", clean:"#16a0bd", base:"#e8f3ff", fin:"#4ee2a0", macro:"#d0731d", grid:"rgba(142,167,199,.16)", muted:"#8ea7c7", ink:"#e8f3ff"};
const LKEY = "cv-forecast-v1";

/* ---------- lưu trữ: db dùng chung nếu có, không thì trình duyệt ---------- */
let D = {sales: [], macro: [], adj: [], lock: {}, cfg: {fleetMin: 10, hampel: 3.5, horizon: 6}, keep: {}}, demo = false, db = null;
try{ const s = JSON.parse(localStorage.getItem(LKEY) || "null"); if(s) D = Object.assign(D, s); }catch(e){}
function persist(){ if(demo) return; try{ localStorage.setItem(LKEY, JSON.stringify(D)); }catch(e){} if(db) db.doc("forecast/data").set(JSON.parse(JSON.stringify(D))).catch(() => toast("Chưa lưu được lên dữ liệu chung")); }
if(window.claude && typeof window.claude.use === "function") window.claude.use("db").then(d => { if(!d) return; db = d;
  db.doc("forecast/data").onSnapshot(s => { if(s.exists && !demo){ D = Object.assign(D, s.data()); render(); } }, () => {}); }).catch(() => {});

/* ---------- tiện ích tháng ---------- */
const ym = s => { const m = String(s).trim().match(/^(\d{4})[-/.](\d{1,2})$/) || String(s).trim().match(/^(\d{1,2})[-/.](\d{4})$/); if(!m) return null; const [y, mo] = m[1].length === 4 ? [+m[1], +m[2]] : [+m[2], +m[1]]; return mo >= 1 && mo <= 12 ? y + "-" + String(mo).padStart(2,"0") : null; };
const addM = (k, n) => { let [y, m] = k.split("-").map(Number); m += n; y += Math.floor((m-1)/12); m = ((m-1)%12+12)%12+1; return y + "-" + String(m).padStart(2,"0"); };
const lbl = k => { const [y, m] = k.split("-"); return "T" + (+m) + "/" + y.slice(2); };
function span(keys){ if(!keys.length) return []; const s = [...keys].sort(), out = []; for(let k = s[0]; k <= s[s.length-1]; k = addM(k, 1)) out.push(k); return out; }
const median = a => { const s = a.slice().sort((x,y) => x-y), n = s.length; return n ? (n%2 ? s[(n-1)/2] : (s[n/2-1]+s[n/2])/2) : 0; };
const r2 = r => r == null || !isFinite(r) ? "—" : (Math.round(r*100)/100).toString().replace(".", ",");
const mean = a => a.length ? a.reduce((x,y) => x+y, 0)/a.length : 0;

/* ---------- BƯỚC 1: phân khúc + loại fleet bất thường ---------- */
function step1(seg, body, auto){
  const kp = ((D.keep || {})[key(seg, body)] || []).concat(auto || []);
  const rows = D.sales.filter(r => (!seg || r.seg === seg) && (!body || r.body === body)), months = span([...new Set(D.sales.map(r => r.m))]);
  const raw = {}, flagged = {}, fl = [];
  months.forEach(m => { raw[m] = 0; flagged[m] = 0; });
  rows.forEach(r => { raw[r.m] += r.qty; const isF = r.fleet || (r.cust && r.qty >= D.cfg.fleetMin); if(isF){ flagged[r.m] += r.qty; fl.push({m: r.m, qty: r.qty, why: r.fleet ? "đánh dấu fleet" : `${r.qty} xe một khách ≥ ${D.cfg.fleetMin}`, cust: r.cust || "", seg: r.seg, body: r.body}); } });
  const step = months.map(m => raw[m] - flagged[m]);
  // Hampel: so với trung vị cửa sổ ±3 tháng, vượt k × 1,4826 × MAD thì đưa về trung vị
  const clean = step.slice(), out = [];
  step.forEach((v, i) => { const w = step.slice(Math.max(0, i-3), i+4), md = median(w), mad = 1.4826 * median(w.map(x => Math.abs(x - md)));
    if(w.length >= 5 && mad > 0 && v - md > D.cfg.hampel * mad && !kp.includes(months[i])){ clean[i] = Math.round(md); out.push({m: months[i], qty: v - Math.round(md), why: `đột biến ${fmtInt(v)} xe so với trung vị ${fmtInt(md)} (> ${D.cfg.hampel}×MAD)`}); } });
  return {months, raw: months.map(m => raw[m]), noFleet: step, clean, fleet: fl, auto: auto || [], spikes: out, removed: fl.reduce((a,x) => a + x.qty, 0) + out.reduce((a,x) => a + x.qty, 0)};
}

/* ---------- BƯỚC 2: tương quan chéo theo độ trễ ---------- */
function diff1(a){ return a.map((v,i) => i && a[i-1] != null && v != null && isFinite(v) && isFinite(a[i-1]) ? v - a[i-1] : null); }
function yoy(a){ return a.map((v,i) => i >= 12 && a[i-12] ? (v - a[i-12]) / Math.abs(a[i-12]) : null); }
function corr(x, y){ const p = x.map((v,i) => [v, y[i]]).filter(([a,b]) => a != null && b != null && isFinite(a) && isFinite(b)); const n = p.length; if(n < 6) return {r: null, n};
  const mx = mean(p.map(q => q[0])), my = mean(p.map(q => q[1])); let sxy = 0, sx = 0, sy = 0; p.forEach(([a,b]) => { sxy += (a-mx)*(b-my); sx += (a-mx)**2; sy += (b-my)**2; }); return {r: sx && sy ? sxy/Math.sqrt(sx*sy) : null, n}; }
function step2(S1, varKey, maxLag = 12){
  const mm = {}; D.macro.filter(x => x.k === varKey).forEach(x => { mm[x.m] = x.v; });
  // dùng chuỗi đã bỏ fleet nhưng CHƯA cắt đột biến (đỉnh do vĩ mô là tín hiệu cần giữ); sai phân bậc 1 để khử xu hướng, tránh tương quan giả
  const xs = S1.months.map(m => mm[m] ?? null), ty = diff1(S1.noFleet), tx = diff1(xs.map(v => v == null ? NaN : v));
  const res = []; for(let L = 0; L <= maxLag; L++){ const xl = S1.months.map((_,i) => i - L >= 0 ? tx[i-L] : null), c = corr(xl, ty); res.push({lag: L, r: c.r, n: c.n, sig: c.r != null && Math.abs(c.r) > 2/Math.sqrt(c.n)}); }
  const sig = res.filter(x => x.sig), best = (sig.length ? sig : res.filter(x => x.r != null)).reduce((a,x) => !a || Math.abs(x.r) > Math.abs(a.r) ? x : a, null);
  return {res, best, method: "sai phân tháng (khử xu hướng), chuỗi đã bỏ fleet", varKey, xs, has: Object.keys(mm).length > 0};
}

/* ---------- BƯỚC 3a: đường cơ sở (Holt-Winters cộng / Holt tắt dần) + hiệu chỉnh vĩ mô ---------- */
function hw(y, h){
  const n = y.length, P = 12;
  if(n >= 2*P){ let best = null;
    for(const a of [.1,.2,.3,.5]) for(const b of [.01,.05,.1]) for(const g of [.1,.2,.4]){
      let L = mean(y.slice(0,P)), T = (mean(y.slice(P,2*P)) - L)/P, S = y.slice(0,P).map(v => v - L), sse = 0, fit = [];
      for(let t = 0; t < n; t++){ const f = L + T + S[t%P]; fit.push(f); if(t >= P) sse += (y[t]-f)**2; const L0 = L; L = a*(y[t] - S[t%P]) + (1-a)*(L + T); T = b*(L - L0) + (1-b)*T; S[t%P] = g*(y[t] - L) + (1-g)*S[t%P]; }
      if(!best || sse < best.sse) best = {sse, a, b, g, L, T, S: S.slice(), fit}; }
    return {name: `Holt-Winters cộng tính, mùa vụ 12 tháng (α ${best.a}, β ${best.b}, γ ${best.g})`, fit: best.fit, fc: Array.from({length: h}, (_,k) => Math.max(0, best.L + (k+1)*best.T + best.S[(n+k)%P]))}; }
  if(n >= 6){ let best = null;
    for(const a of [.2,.3,.5,.7]) for(const b of [.05,.1,.2]){ const phi = .9; let L = y[0], T = y[1]-y[0], sse = 0, fit = [];
      for(let t = 0; t < n; t++){ const f = L + phi*T; fit.push(f); if(t) sse += (y[t]-f)**2; const L0 = L; L = a*y[t] + (1-a)*(L + phi*T); T = b*(L - L0) + (1-b)*phi*T; }
      if(!best || sse < best.sse) best = {sse, a, b, L, T, fit}; }
    let acc = 0; return {name: `Holt xu hướng tắt dần, chưa đủ 24 tháng để tách mùa vụ (α ${best.a}, β ${best.b})`, fit: best.fit, fc: Array.from({length: h}, (_,k) => { acc += .9**(k+1); return Math.max(0, best.L + acc*best.T); })}; }
  const m3 = mean(y.slice(-3)); return {name: "Trung bình 3 tháng (dữ liệu quá ngắn)", fit: y.map(() => m3), fc: Array(h).fill(m3)};
}
function baseline(S1, S2){
  const h = D.cfg.horizon, y = S1.clean, M = hw(y, h), fut = Array.from({length: h}, (_,k) => addM(S1.months[S1.months.length-1], k+1));
  // MAPE kiểm định: bỏ 3 tháng cuối, dự báo lại
  let mape = null; if(y.length >= 12){ const t = hw(y.slice(0, -3), 3), act = y.slice(-3); const e = act.map((a,i) => a ? Math.abs(a - t.fc[i])/a : null).filter(v => v != null); mape = e.length ? mean(e)*100 : null; }
  // Hiệu chỉnh vĩ mô: hồi quy phần dư theo biến vĩ mô đã trễ L tháng (z-score); chỉ áp cho tháng tương lai đã biết giá trị vĩ mô trễ
  let macro = Array(h).fill(0), beta = null;
  if(S2 && S2.best && S2.best.sig){ const L = S2.best.lag, xs = S2.xs, valid = xs.filter(v => v != null), mx = mean(valid), sd = Math.sqrt(mean(valid.map(v => (v-mx)**2))) || 1;
    const pts = y.map((v,i) => i-L >= 0 && xs[i-L] != null ? [(xs[i-L]-mx)/sd, v - M.fit[i]] : null).filter(Boolean);
    if(pts.length >= 8){ const zx = mean(pts.map(p => p[0])), zy = mean(pts.map(p => p[1])); let num = 0, den = 0; pts.forEach(([a,b]) => { num += (a-zx)*(b-zy); den += (a-zx)**2; }); beta = den ? num/den : null;
      const mm = {}; D.macro.filter(x => x.k === S2.varKey).forEach(x => { mm[x.m] = x.v; });
      if(beta != null) macro = fut.map(m => { const v = mm[addM(m, -L)]; return v == null ? 0 : beta*((v-mx)/sd); }); } }
  const base = M.fc.map((v,k) => Math.max(0, Math.round(v + macro[k])));
  return {model: M.name, fit: M.fit, fut, hw: M.fc, macro, beta, base, mape};
}

/* ---------- BƯỚC 3b: S&OP ---------- */
const key = (seg, body) => (seg || "*") + "|" + (body || "*");
function sop(seg, body, B){
  const adj = D.adj.filter(a => a.key === key(seg, body));
  const fin = B.fut.map((m,k) => { const as = adj.filter(a => a.m === m && a.status !== "rejected"), pct = as.reduce((s,a) => s + (+a.pct || 0), 0), units = as.reduce((s,a) => s + (+a.units || 0), 0);
    return {m, base: B.base[k], pct, units, val: Math.max(0, Math.round(B.base[k]*(1 + pct/100) + units)), n: as.length, pending: as.filter(a => a.status !== "approved").length}; });
  const lk = D.lock[key(seg, body)] || {};
  return {adj, fin, lock: lk, signed: SIGN.filter(s => (lk.sign || {})[s])};
}
function compHints(seg){
  if(!CV.compPano) return []; const P = CV.compPano(), map = {"< 1 tấn": ["Tải dưới 1 tấn","Van 2–5 chỗ"], "1–2,5 tấn": ["Tải 1,25–1,5 tấn","Tải 1,9–2,5 tấn"], "2,5–3,5 tấn": ["Tải 3,5 tấn","Thùng dài 5,2–6,2 m"], "3,5–10 tấn": ["Tải 5 tấn","Tải 7 tấn"], "> 10 tấn": ["Tải nặng, ben, đầu kéo","Ben"]};
  return P.rows.filter(r => !seg || (map[seg] || []).includes(r.sg)).map(r => r.gap == null ? `${r.sg}: Đô Thành chưa có xe, đối thủ ${r.low ? r.low.b + " " + r.low.model + " " + fmtInt(r.low.net/1e6) + " tr" : ""}` : r.gap > 0 ? `${r.sg}: ${r.dt.vs} rẻ hơn ${fmtInt(r.gap/1e6)} tr sau KM → cân nhắc giảm dự báo hoặc tăng ưu đãi` : `${r.sg}: Đô Thành rẻ hơn ${fmtInt(-r.gap/1e6)} tr sau ưu đãi T11 → có thể tăng dự báo nếu truyền thông tốt`);
}

/* ---------- dữ liệu minh họa (KHÔNG phải số thật) ---------- */
function demoData(){
  const sales = [], macro = [], start = "2023-11"; let rnd = 7; const r = () => (rnd = (rnd*16807) % 2147483647) / 2147483647;
  const seas = [0.8,0.7,1.0,1.0,1.05,1.0,0.95,1.0,1.05,1.1,1.15,1.25];
  const dtc = []; for(let i = 0; i < 36; i++){ const m = addM(start, i), mo = +m.split("-")[1]; dtc.push(40 + i*1.2 + (mo === 12 ? 45 : mo >= 10 ? 15 : 0) + 8*Math.sin(i/2.5) + r()*6); macro.push({m, k: "Giải ngân đầu tư công (nghìn tỷ đ)", v: Math.round(dtc[i]*10)/10}); macro.push({m, k: "Tín dụng tiêu dùng (% tăng)", v: Math.round((8 + Math.sin(i/4)*2 + r())*10)/10}); }
  for(let i = 0; i < 36; i++){ const m = addM(start, i), mo = +m.split("-")[1], s = seas[mo-1], g = 1 + i*0.008;
    const add = (seg, body, b) => sales.push({m, seg, body, qty: Math.max(0, Math.round(b*s*g*(0.9 + r()*0.2)))});
    add("< 1 tấn","Thùng kín",38); add("< 1 tấn","Mui bạt",30); add("< 1 tấn","Khác (lửng, chassis, van)",26); add("1–2,5 tấn","Thùng kín",46); add("1–2,5 tấn","Mui bạt",40); add("2,5–3,5 tấn","Thùng kín",34); add("2,5–3,5 tấn","Mui bạt",30); add("2,5–3,5 tấn","Chuyên dùng",8); add("3,5–10 tấn","Mui bạt",14); add("3,5–10 tấn","Ben",4);
    const lagX = i >= 4 ? dtc[i-4] : dtc[0]; sales.push({m, seg: "> 10 tấn", body: "Ben", qty: Math.max(0, Math.round(lagX*0.22 + r()*2))});
  }
  sales.push({m: "2025-06", seg: "1–2,5 tấn", body: "Thùng kín", qty: 60, fleet: true, cust: "Công ty logistics A (minh họa)"});
  sales.push({m: "2026-03", seg: "2,5–3,5 tấn", body: "Mui bạt", qty: 45, cust: "Hợp tác xã vận tải B (minh họa)"});
  return {sales, macro};
}

/* ---------- nhập CSV ---------- */
function parseCSV(t){ const L = t.replace(/\r/g,"").split("\n").filter(x => x.trim()); if(L.length < 2) return []; const sep = (L[0].match(/;/g)||[]).length > (L[0].match(/,/g)||[]).length ? ";" : L[0].includes("\t") ? "\t" : ",";
  const H = L[0].split(sep).map(h => h.trim().toLowerCase()); return L.slice(1).map(l => { const c = l.split(sep), o = {}; H.forEach((h,i) => o[h] = (c[i]||"").trim()); return o; }); }
const pick = (o, ks) => { for(const k of ks){ if(o[k] != null && o[k] !== "") return o[k]; } return ""; };
function normSeg(s){ s = String(s).toLowerCase().replace(",", "."); const n = parseFloat(s); if(/</.test(s) || n < 1 && !isNaN(n)) return SEGS[0]; if(/>\s*10|đầu kéo|nặng/.test(s) || n > 10) return SEGS[4]; if(n > 3.5) return SEGS[3]; if(n > 2.5) return SEGS[2]; if(n >= 1) return SEGS[1]; return SEGS.find(x => x.toLowerCase() === s) || null; }
function normBody(s){ s = String(s).toLowerCase(); return /kín|tk|đông lạnh|bảo ôn/.test(s) ? BODIES[0] : /bạt|tmb/.test(s) ? BODIES[1] : /ben|tự đổ/.test(s) ? BODIES[2] : /chuyên|cẩu|bồn|xitec|rác|cứu hộ|tập lái/.test(s) ? BODIES[3] : BODIES[4]; }
function importSales(t, replace){ const rows = parseCSV(t).map(o => ({m: ym(pick(o, ["thang","tháng","month"])), seg: normSeg(pick(o, ["phan_khuc","phân khúc","tai_trong","tải trọng","tan"])), body: normBody(pick(o, ["loai_thung","loại thùng","thung"])),
    qty: +pick(o, ["so_luong","số lượng","sl","qty"]).replace(/\D/g,"") || 0, fleet: /^(1|x|có|co|yes|fleet)$/i.test(pick(o, ["la_fleet","fleet","lo_lon"])), cust: pick(o, ["khach_hang","khách hàng","customer"])})).filter(r => r.m && r.seg && r.qty);
  if(!rows.length) return 0; demo = false; D.sales = replace ? rows : D.sales.concat(rows); persist(); return rows.length; }
function importMacro(t, replace){ const rows = parseCSV(t).map(o => ({m: ym(pick(o, ["thang","tháng","month"])), k: pick(o, ["bien","biến","chi_so","chỉ số"]), v: parseFloat(pick(o, ["gia_tri","giá trị","value"]).replace(",", "."))})).filter(r => r.m && r.k && isFinite(r.v));
  if(!rows.length) return 0; demo = false; D.macro = replace ? rows : D.macro.concat(rows); persist(); return rows.length; }

/* ---------- biểu đồ đường ---------- */
function lineChart(S1, B, F){
  const W = 980, H = 300, pl = 44, pr = 14, pt = 14, pb = 28, ms = S1.months.concat(B.fut), n = ms.length;
  const all = S1.raw.concat(B.base, F.fin.map(f => f.val)), max = Math.max(...all, 1)*1.1, X = i => pl + i*(W-pl-pr)/Math.max(1, n-1), Y = v => pt + (1 - v/max)*(H-pt-pb);
  const path = (arr, off = 0) => arr.map((v,i) => v == null ? "" : (i && arr[i-1] != null ? "L" : "M") + X(i+off).toFixed(1) + "," + Y(v).toFixed(1)).join("");
  const nh = S1.months.length, last = nh-1;
  const grid = [0,.25,.5,.75,1].map(f => `<line x1="${pl}" x2="${W-pr}" y1="${Y(f*max)}" y2="${Y(f*max)}" stroke="${C.grid}"/><text x="${pl-6}" y="${Y(f*max)+4}" text-anchor="end" fill="${C.muted}" font-size="10">${fmtInt(f*max)}</text>`).join("");
  const xt = ms.map((m,i) => i % Math.ceil(n/12) === 0 || i === nh ? `<text x="${X(i)}" y="${H-8}" text-anchor="middle" fill="${C.muted}" font-size="10">${lbl(m)}</text>` : "").join("");
  const hit = ms.map((m,i) => { const fut = i >= nh, k = i - nh; return `<rect x="${X(i)-(W-pl-pr)/n/2}" y="${pt}" width="${(W-pl-pr)/n}" height="${H-pt-pb}" fill="transparent" data-tip="<b>${lbl(m)}</b>${fut ? ` · dự báo<br>Đường cơ sở: ${fmtInt(B.base[k])} xe${B.macro[k] ? ` (vĩ mô ${B.macro[k] > 0 ? "+" : ""}${fmt1(B.macro[k])})` : ""}<br>S&amp;OP chốt: <b>${fmtInt(F.fin[k].val)}</b> xe${F.fin[k].n ? ` (${F.fin[k].n} điều chỉnh)` : ""}` : `<br>Thực bán: ${fmtInt(S1.raw[i])} xe<br>Sau làm sạch: ${fmtInt(S1.clean[i])} xe<br>Mô hình khớp: ${fmtInt(B.fit[i])}`}"/>`; }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Lịch sử và dự báo">${grid}${xt}
    <rect x="${X(nh)-4}" y="${pt}" width="${W-pr-X(nh)+4}" height="${H-pt-pb}" fill="rgba(70,227,255,.05)"/><text x="${X(nh)+4}" y="${pt+12}" fill="${C.muted}" font-size="10">DỰ BÁO</text>
    <path d="${path(S1.raw)}" fill="none" stroke="${C.raw}" stroke-width="1.5" stroke-dasharray="4 3"/>
    <path d="${path(S1.clean)}" fill="none" stroke="${C.clean}" stroke-width="2"/>
    <path d="${path([S1.clean[last]].concat(B.base), last)}" fill="none" stroke="${C.base}" stroke-width="2" stroke-dasharray="6 4"/>
    <path d="${path([S1.clean[last]].concat(F.fin.map(f => f.val)), last)}" fill="none" stroke="${C.fin}" stroke-width="2.5"/>
    ${F.fin.map((f,k) => `<circle cx="${X(nh+k)}" cy="${Y(f.val)}" r="4" fill="${C.fin}" stroke="#0a1730" stroke-width="2"/>`).join("")}
    ${S1.fleet.concat(S1.spikes).map(x => { const i = S1.months.indexOf(x.m); return i < 0 ? "" : `<circle cx="${X(i)}" cy="${Y(S1.raw[i])}" r="5" fill="none" stroke="#ff6b6b" stroke-width="2"/>`; }).join("")}${hit}</svg>
    <div class="hlegend"><span><i style="background:${C.raw}"></i>Thực bán (gồm fleet)</span><span><i style="background:${C.clean}"></i>Sau làm sạch</span><span><i style="background:${C.base}"></i>Đường cơ sở (mô hình)</span><span><i style="background:${C.fin}"></i>Số chốt S&amp;OP</span><span><i style="background:transparent;border:2px solid #ff6b6b;border-radius:50%"></i>Điểm đã loại (fleet, đột biến)</span></div>`;
}
function lagChart(S2){
  const W = 520, H = 190, pl = 30, pb = 24, bw = (W-pl-10)/S2.res.length, Y = r => 10 + (1 - (r+1)/2)*(H-10-pb), thr = S2.best && S2.best.n ? 2/Math.sqrt(S2.best.n) : .3;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Tương quan chéo theo độ trễ">
    <rect x="${pl}" y="${Y(thr)}" width="${W-pl-10}" height="${Y(-thr)-Y(thr)}" fill="rgba(142,167,199,.08)"/><line x1="${pl}" x2="${W-10}" y1="${Y(0)}" y2="${Y(0)}" stroke="rgba(142,167,199,.35)"/>
    ${[1,.5,-.5,-1].map(v => `<text x="${pl-4}" y="${Y(v)+3}" text-anchor="end" fill="${C.muted}" font-size="9">${fmt1(v)}</text>`).join("")}
    ${S2.res.map((x,i) => { const r = x.r || 0, best = S2.best && x.lag === S2.best.lag; return `<g data-tip="<b>Trễ ${x.lag} tháng</b><br>r = ${r2(x.r)}${x.sig ? " · có ý nghĩa" : " · trong vùng nhiễu"}<br>${x.n} cặp tháng"><rect x="${pl + i*bw + 3}" y="${Math.min(Y(r), Y(0))}" width="${bw-6}" height="${Math.abs(Y(r)-Y(0)) || 1}" rx="3" fill="${best ? C.macro : x.sig ? "#16a0bd" : "#5c7393"}"/><text x="${pl + i*bw + bw/2}" y="${H-8}" text-anchor="middle" fill="${C.muted}" font-size="10">${x.lag}</text></g>`; }).join("")}</svg>
    <p class="note">Cột = hệ số tương quan r giữa biến vĩ mô trễ L tháng và nhu cầu; vùng xám = nhiễu (±2/√n). Cột cam = độ trễ mạnh nhất có ý nghĩa.</p>`;
}

/* ---------- giao diện ---------- */
const anchor = document.getElementById("compSec") || document.getElementById("priceSec");
if(anchor){
  const s = document.createElement("section"); s.className = "glass pad"; s.id = "fcSec"; s.setAttribute("aria-label", "Dự báo kinh doanh");
  s.innerHTML = `<div class="opshead"><div><h2>Dự báo kinh doanh</h2><p class="muted" style="margin:4px 0 0;max-width:95ch">Bước 1: tách theo tải trọng và loại thùng, loại đơn lô lớn (fleet) và đột biến để có đường cơ sở sạch. Bước 2: tương quan chéo tìm độ trễ của biến vĩ mô. Bước 3: mô hình cho số cơ sở, đội kinh doanh điều chỉnh có bằng chứng (thị trường, khuyến mãi đối thủ, ra mắt sản phẩm), 3 phòng ký chốt.</p></div>
    <div class="toolbar" style="margin:0"><button type="button" class="primary" id="fcBen">Ben báo cáo dự báo</button><button type="button" id="fcExport">Xuất dự báo (.csv)</button></div></div>
    <div id="fcBanner"></div>
    <div class="toolbar"><label class="field">Tải trọng<select id="fcSeg"><option value="">Tất cả</option>${SEGS.map(x => `<option>${esc(x)}</option>`).join("")}</select></label>
      <label class="field">Loại thùng<select id="fcBody"><option value="">Tất cả</option>${BODIES.map(x => `<option>${esc(x)}</option>`).join("")}</select></label>
      <label class="field">Biến vĩ mô<select id="fcVar"></select></label>
      <label class="field">Ngưỡng fleet (xe/khách/tháng)<input type="number" id="fcFleet" min="2" step="1" style="width:90px"></label>
      <label class="field">Độ nhạy đột biến (×MAD)<input type="number" id="fcHam" min="1.5" step="0.5" style="width:90px"></label>
      <label class="field">Số tháng dự báo<input type="number" id="fcH" min="1" max="12" step="1" style="width:80px"></label></div>
    <div class="opstiles num" id="fcTiles"></div>
    <div class="hp w12" style="margin-bottom:12px"><h3>Lịch sử và dự báo <span id="fcModel"></span></h3><div id="fcChart"></div></div>
    <div class="hudgrid"><div class="hp w6"><h3>Bước 1 · Điểm đã loại khỏi đường cơ sở <span id="fcRm"></span></h3><div id="fcS1" class="small"></div></div>
      <div class="hp w6"><h3>Bước 2 · Độ trễ vĩ mô <span id="fcLagM"></span></h3><div id="fcS2"></div></div>
      <div class="hp w12"><h3>Bước 3 · S&amp;OP: điều chỉnh định tính và chốt số <span>mỗi điều chỉnh cần lý do, bằng chứng, người chịu trách nhiệm</span></h3><div id="fcS3" class="small"></div></div></div>
    <details class="lgdoc" style="margin-top:12px"><summary><b>Nhập dữ liệu</b> · lịch sử bán theo tháng và biến vĩ mô (CSV)</summary>
      <p class="small muted">Bán hàng: cột <code>thang, phan_khuc, loai_thung, so_luong, la_fleet, khach_hang</code> (phan_khuc ghi tải trọng tấn, ví dụ 1,9 hoặc "&gt;10"; la_fleet = 1 nếu là đơn lô lớn). Vĩ mô: <code>thang, bien, gia_tri</code> (ví dụ "Giải ngân đầu tư công (nghìn tỷ đ)"). Tháng dạng 2026-10.</p>
      <div class="toolbar"><label class="field">File bán hàng<input type="file" id="fcFileS" accept=".csv,.txt"></label><label class="field">File vĩ mô<input type="file" id="fcFileM" accept=".csv,.txt"></label>
        <label class="field"><span><input type="checkbox" id="fcReplace" checked> Thay toàn bộ dữ liệu cũ</span></label><button type="button" id="fcTpl">Tải file mẫu</button><button type="button" id="fcDemo">Chạy thử với dữ liệu minh họa</button><button type="button" id="fcClear">Xóa dữ liệu dự báo</button></div></details>`;
  anchor.after(s);
}
let cur = null;
function render(){
  const el = document.getElementById("fcChart"); if(!el) return;
  const seg = document.getElementById("fcSeg").value, body = document.getElementById("fcBody").value, vars = [...new Set(D.macro.map(x => x.k))], vs = document.getElementById("fcVar");
  const want = vs.value || (body === "Ben" || seg === "> 10 tấn" ? vars.find(v => /đầu tư công/i.test(v)) : null) || vars[0] || "";
  vs.innerHTML = vars.length ? vars.map(v => `<option${v === want ? " selected" : ""}>${esc(v)}</option>`).join("") : `<option value="">Chưa có dữ liệu vĩ mô</option>`;
  ["fcFleet","fcHam","fcH"].forEach((id,i) => { const e = document.getElementById(id); if(document.activeElement !== e) e.value = [D.cfg.fleetMin, D.cfg.hampel, D.cfg.horizon][i]; });
  document.getElementById("fcBanner").innerHTML = demo ? `<div class="todo"><li class="red" style="list-style:none"><b>ĐANG XEM DỮ LIỆU MINH HỌA</b> (tự sinh, không phải số bán thật của Đô Thành; không lưu lên dữ liệu chung). Nhập file lịch sử thật ở mục “Nhập dữ liệu” để dự báo thật.</li></div>` : !D.sales.length ? `<div class="todo"><li class="blue" style="list-style:none">Chưa có lịch sử bán theo tháng. Mở “Nhập dữ liệu” để nạp file CSV (từ DMS/Excel bán hàng), hoặc bấm “Chạy thử với dữ liệu minh họa” để xem cách mô hình chạy.</li></div>` : "";
  if(!D.sales.length){ el.innerHTML = '<p class="muted">Chưa có dữ liệu.</p>'; ["fcS1","fcS2","fcS3","fcTiles"].forEach(id => document.getElementById(id).innerHTML = ""); cur = null; return; }
  let S1 = step1(seg, body); const S2 = want ? step2(S1, want) : null;
  // đột biến trùng thời điểm biến vĩ mô (đã trễ) cao bất thường là nhu cầu thật: tự giữ lại
  if(S2 && S2.best && S2.best.sig && S2.best.r > 0 && S1.spikes.length){ const v = S2.xs.filter(x => x != null), mx = mean(v), sd = Math.sqrt(mean(v.map(x => (x-mx)**2))) || 1;
    const auto = S1.spikes.filter(sp => { const i = S1.months.indexOf(sp.m) - S2.best.lag; return i >= 0 && S2.xs[i] != null && (S2.xs[i] - mx)/sd > 1; }).map(sp => sp.m);
    if(auto.length) S1 = step1(seg, body, auto); }
  const B = baseline(S1, S2), F = sop(seg, body, B); cur = {seg, body, S1, S2, B, F};
  const tot = a => a.reduce((x,y) => x+y, 0), last12 = tot(S1.clean.slice(-12)), prev12 = tot(S1.clean.slice(-24, -12));
  document.getElementById("fcModel").textContent = B.model;
  document.getElementById("fcTiles").innerHTML = [[fmtInt(last12), "xe 12 tháng gần nhất (đã làm sạch)"], [prev12 ? (last12 >= prev12 ? "+" : "") + fmt1((last12/prev12 - 1)*100) + "%" : "—", "so với 12 tháng trước"], [fmtInt(S1.removed), "xe fleet, đột biến đã loại"], [fmtInt(tot(B.base)), `đường cơ sở ${B.fut.length} tháng tới`], [fmtInt(tot(F.fin.map(f => f.val))), "số chốt S&OP"], [B.mape == null ? "—" : fmt1(B.mape) + "%", "sai số kiểm định 3 tháng (MAPE)"], [F.lock.at ? "Đã chốt" : `${F.signed.length}/3`, F.lock.at ? "ngày " + F.lock.at : "phòng ban đã ký"]]
    .map(([v,l]) => `<div class="stat"><div class="v">${esc(String(v))}</div><div class="l">${esc(l)}</div></div>`).join("");
  el.innerHTML = lineChart(S1, B, F);
  document.getElementById("fcRm").textContent = `${fmtInt(S1.removed)} xe`;
  const rm = S1.fleet.map(x => [x.m, x.qty, "Fleet: " + x.why + (x.cust ? " · " + x.cust : ""), ""]).concat(S1.spikes.map(x => [x.m, x.qty, "Đột biến: " + x.why, `<button type="button" data-fckeep="${x.m}" title="Đây là nhu cầu thật (mùa vụ, vĩ mô): không loại">Giữ lại</button>`]));
  const kept = ((D.keep || {})[key(seg, body)] || []);
  document.getElementById("fcS1").innerHTML = rm.length ? `<table class="tasktbl"><thead><tr><th>Tháng</th><th>Xe loại</th><th>Lý do</th><th></th></tr></thead><tbody>${rm.sort((a,b) => a[0] < b[0] ? -1 : 1).map(r => `<tr><td>${lbl(r[0])}</td><td class="num">${fmtInt(r[1])}</td><td>${esc(r[2])}</td><td>${r[3]}</td></tr>`).join("")}</tbody></table><p class="note">Đột biến được phát hiện tự động có thể là nhu cầu thật (cao điểm mùa vụ, tác động vĩ mô): kiểm tra rồi bấm “Giữ lại” nếu không phải đơn lô bất thường.</p>` : '<p class="muted">Không có đơn fleet hay đột biến trong chuỗi này.</p>';
  if(S1.auto.length) document.getElementById("fcS1").insertAdjacentHTML("beforeend", `<p class="note">Tự giữ lại (giải thích được bằng ${esc(want)} trễ ${S2.best.lag} tháng): ${S1.auto.map(lbl).join(", ")}.</p>`);
  if(kept.length) document.getElementById("fcS1").insertAdjacentHTML("beforeend", `<p class="note">Đang giữ lại: ${kept.map(lbl).join(", ")} <button type="button" data-fcunkeep="1">Bỏ giữ lại</button></p>`);
  document.getElementById("fcLagM").textContent = S2 ? S2.method : "";
  document.getElementById("fcS2").innerHTML = !S2 || !S2.has ? '<p class="muted">Chưa có biến vĩ mô. Nhập file vĩ mô (giải ngân đầu tư công, tín dụng, PMI, giá cước…) để tìm độ trễ.</p>'
    : lagChart(S2) + `<p class="small">${S2.best && S2.best.sig ? `<b>${esc(want)}</b> dẫn trước nhu cầu <b>${S2.best.lag} tháng</b> (r = ${r2(S2.best.r)}). ${B.beta != null ? `Mô hình cộng thêm ${B.beta >= 0 ? "+" : ""}${fmt1(B.beta)} xe cho mỗi độ lệch chuẩn của biến vĩ mô ${S2.best.lag} tháng trước.` : ""} Biến vĩ mô hôm nay sẽ tác động tới tháng ${lbl(addM(S1.months[S1.months.length-1], S2.best.lag || 0))}.` : `Chưa thấy độ trễ có ý nghĩa thống kê giữa <b>${esc(want)}</b> và chuỗi này: không dùng biến này cho dự báo.`}</p>`;
  const hints = compHints(seg);
  document.getElementById("fcS3").innerHTML = `<div style="overflow-x:auto"><table class="tasktbl"><thead><tr><th>Tháng</th><th>Cơ sở</th><th>Điều chỉnh</th><th>Chốt</th><th></th></tr></thead><tbody>${F.fin.map(f => `<tr><td>${lbl(f.m)}</td><td class="num">${fmtInt(f.base)}</td><td class="num">${f.pct ? (f.pct > 0 ? "+" : "") + fmt1(f.pct) + "%" : ""}${f.units ? ` ${f.units > 0 ? "+" : ""}${fmtInt(f.units)} xe` : ""}${!f.pct && !f.units ? "—" : ""}${f.pending ? ` <span class="pill warn">${f.pending} chờ duyệt</span>` : ""}</td><td class="num"><b>${fmtInt(f.val)}</b></td><td><button type="button" data-fcadd="${f.m}">+ Điều chỉnh</button></td></tr>`).join("")}</tbody></table></div>
    ${F.adj.length ? `<h4>Điều chỉnh đã ghi</h4><ul class="actions">${F.adj.map(a => `<li><b>${lbl(a.m)}</b> · ${esc(ADJ_T[a.type] || a.type)} · ${a.pct ? (a.pct > 0 ? "+" : "") + a.pct + "%" : ""}${a.units ? " " + (a.units > 0 ? "+" : "") + a.units + " xe" : ""} · ${esc(a.reason)}<br><span class="muted">Bằng chứng: ${esc(a.evidence || "chưa có")} · ${esc(a.owner)} · ${a.status === "approved" ? "đã duyệt" : a.status === "rejected" ? "bác" : "chờ duyệt"}</span> <button type="button" data-fcok="${a.id}">Duyệt</button> <button type="button" data-fcno="${a.id}">Bác</button> <button type="button" data-fcdel="${a.id}">Xóa</button></li>`).join("")}</ul>` : ""}
    ${hints.length ? `<h4>Gợi ý từ dữ liệu đối thủ (giá ròng T11/2026)</h4><ul class="actions">${hints.map(h => `<li>${esc(h)}</li>`).join("")}</ul>` : ""}
    <h4>Ký chốt S&amp;OP</h4><div class="toolbar">${SIGN.map(s => `<button type="button" data-fcsign="${esc(s)}" aria-pressed="${!!(F.lock.sign||{})[s]}">${(F.lock.sign||{})[s] ? "✓ " : ""}${esc(s)}</button>`).join("")}<span class="muted small">Đủ 3 phòng ký thì số chốt được khóa và giao làm chỉ tiêu.</span></div>`;
}
function ask(q, def){ return CV.ask ? CV.ask(q, {def: def || ""}) : Promise.resolve(window.prompt(q, def || "")); }
const confirmA = q => CV.ask ? CV.ask(q, {confirm: true}) : Promise.resolve(window.confirm(q));
document.addEventListener("change", async e => { const id = e.target.id;
  if(id === "fcSeg" || id === "fcBody"){ document.getElementById("fcVar").value = ""; render(); }
  if(id === "fcVar") render();
  if(id === "fcFleet" || id === "fcHam" || id === "fcH"){ const v = +e.target.value; if(id === "fcFleet" && v >= 2) D.cfg.fleetMin = v; if(id === "fcHam" && v >= 1.5) D.cfg.hampel = v; if(id === "fcH" && v >= 1 && v <= 12) D.cfg.horizon = Math.round(v); persist(); render(); }
  if(id === "fcFileS" || id === "fcFileM"){ const f = e.target.files[0]; if(!f) return; const t = await f.text(), rep = document.getElementById("fcReplace").checked; const n = id === "fcFileS" ? importSales(t, rep) : importMacro(t, rep);
    if(n){ document.getElementById("fcSeg").value = ""; document.getElementById("fcBody").value = ""; document.getElementById("fcVar").value = ""; }
    toast(n ? `Đã nạp ${n} dòng ${id === "fcFileS" ? "bán hàng" : "vĩ mô"}` : "Không đọc được dòng hợp lệ: kiểm tra tên cột và định dạng tháng"); e.target.value = ""; render(); }
});
document.addEventListener("click", async e => { const t = e.target, k = cur ? key(cur.seg, cur.body) : null;
  if(t.id === "fcDemo"){ const x = demoData(); demo = true; D = Object.assign({}, D, {sales: x.sales, macro: x.macro, adj: [], lock: {}, keep: {}}); document.getElementById("fcBody").value = "Ben"; document.getElementById("fcSeg").value = ""; document.getElementById("fcVar").value = ""; render(); toast("Đang chạy với dữ liệu minh họa (không phải số thật)"); }
  if(t.id === "fcClear"){ if(!(await confirmA("Xóa toàn bộ lịch sử, biến vĩ mô và điều chỉnh dự báo?"))) return; demo = false; D = Object.assign(D, {sales: [], macro: [], adj: [], lock: {}}); persist(); render(); }
  if(t.id === "fcTpl"){ const csv = "thang,phan_khuc,loai_thung,so_luong,la_fleet,khach_hang\n2026-09,1.9,Thùng kín,42,0,\n2026-09,3.49,Mui bạt,35,0,\n2026-10,1.9,Thùng kín,60,1,Công ty logistics X\n\nthang,bien,gia_tri\n2026-09,Giải ngân đầu tư công (nghìn tỷ đ),85.4\n";
    const b = new Blob(["﻿" + csv], {type: "text/csv"}), a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "mau-du-bao.csv"; a.click(); }
  if(t.id === "fcExport" && cur){ const csv = "thang,tai_trong,loai_thung,co_so,dieu_chinh_pct,dieu_chinh_xe,chot\n" + cur.F.fin.map(f => [f.m, cur.seg || "Tất cả", cur.body || "Tất cả", f.base, f.pct, f.units, f.val].join(",")).join("\n");
    const b = new Blob(["﻿" + csv], {type: "text/csv"}), a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "du-bao.csv"; a.click(); }
  if(t.dataset.fcadd && cur){ const type = await ask("Loại điều chỉnh: sales (thị trường) / comp (đối thủ) / launch (ra mắt SP) / supply / other", "sales"); if(!type) return;
    const v = await ask("Mức điều chỉnh: ghi % (ví dụ +8% hoặc -5%) hoặc số xe (ví dụ +12 xe)", "+5%"); if(!v) return; const reason = await ask("Lý do (bắt buộc)"); if(!reason) return toast("Cần lý do");
    const evidence = await ask("Bằng chứng (đơn đặt cọc, hợp đồng, link chính sách đối thủ…)"), owner = await ask("Người chịu trách nhiệm", "");
    const num = parseFloat(v.replace(",", ".")); D.adj.push({id: Date.now().toString(36), key: k, m: t.dataset.fcadd, type: ADJ_T[type] ? type : "other", pct: /%/.test(v) ? num : 0, units: /%/.test(v) ? 0 : Math.round(num), reason, evidence: evidence || "", owner: owner || "", status: "pending", at: new Date().toISOString()});
    delete D.lock[k]; persist(); render(); }
  if(t.dataset.fckeep && k){ D.keep = D.keep || {}; (D.keep[k] = D.keep[k] || []).push(t.dataset.fckeep); persist(); render(); }
  if(t.dataset.fcunkeep && k){ D.keep = D.keep || {}; delete D.keep[k]; persist(); render(); }
  const find = id => D.adj.find(a => a.id === id);
  if(t.dataset.fcok){ const a = find(t.dataset.fcok); if(a){ if(!a.evidence) return toast("Điều chỉnh chưa có bằng chứng, chưa duyệt được"); a.status = "approved"; persist(); render(); } }
  if(t.dataset.fcno){ const a = find(t.dataset.fcno); if(a){ a.status = "rejected"; persist(); render(); } }
  if(t.dataset.fcdel){ D.adj = D.adj.filter(a => a.id !== t.dataset.fcdel); persist(); render(); }
  if(t.dataset.fcsign && cur){ if(cur.F.fin.some(f => f.pending)) return toast("Còn điều chỉnh chờ duyệt: duyệt hoặc bác trước khi ký"); const L = D.lock[k] = D.lock[k] || {sign: {}}; L.sign = L.sign || {}; const s = t.dataset.fcsign; L.sign[s] = L.sign[s] ? null : new Date().toISOString();
    if(SIGN.every(x => L.sign[x])){ L.at = new Date().toLocaleDateString("vi-VN"); L.values = cur.F.fin.map(f => [f.m, f.val]); toast("Đã chốt số dự báo S&OP"); } else delete L.at; persist(); render(); }
  if(t.id === "fcBen"){ CV.openAi(true); CV.benTab("Chat"); CV.addMsg("u", "Báo cáo dự báo kinh doanh"); const b = CV.addMsg("a", ""); CV.finishBubble(b, fcMd(), false, "Dự báo kinh doanh", true); }
});

/* ---------- báo cáo + Ben ---------- */
function fcMd(seg, body){
  if(seg !== undefined || body !== undefined){ const a = document.getElementById("fcSeg"), b = document.getElementById("fcBody"); if(a && seg != null) a.value = SEGS.includes(seg) ? seg : ""; if(b && body != null) b.value = BODIES.includes(body) ? body : ""; if(a) document.getElementById("fcVar").value = ""; render(); }
  if(!cur) return "Chưa có lịch sử bán theo tháng để dự báo. Nạp file CSV ở mục Dự báo kinh doanh → Nhập dữ liệu (cột thang, phan_khuc, loai_thung, so_luong, la_fleet, khach_hang).";
  const {S1, S2, B, F} = cur, sc = (cur.seg || "mọi tải trọng") + " · " + (cur.body || "mọi loại thùng");
  return `# Dự báo kinh doanh: ${sc}\n${demo ? "> **DỮ LIỆU MINH HỌA, không phải số bán thật.**\n" : ""}_Lịch sử ${lbl(S1.months[0])}–${lbl(S1.months[S1.months.length-1])} (${S1.months.length} tháng). Mô hình: ${B.model}. Sai số kiểm định 3 tháng (MAPE): ${B.mape == null ? "chưa đủ dữ liệu" : fmt1(B.mape) + "%"}._\n\n## Bước 1: làm sạch đường cơ sở\n- Đã loại ${fmtInt(S1.removed)} xe: ${S1.fleet.length} đơn fleet (ngưỡng ${D.cfg.fleetMin} xe/khách/tháng hoặc đánh dấu), ${S1.spikes.length} tháng đột biến (> ${D.cfg.hampel}×MAD so với trung vị ±3 tháng).\n${S1.fleet.concat(S1.spikes).map(x => `  - ${lbl(x.m)}: ${fmtInt(x.qty)} xe, ${x.why}${x.cust ? " (" + x.cust + ")" : ""}`).join("\n")}\n\n## Bước 2: độ trễ vĩ mô\n${S2 && S2.has ? `- Biến: ${S2.varKey}; phương pháp: ${S2.method}, độ trễ 0–12 tháng.\n- ${S2.best && S2.best.sig ? `Độ trễ mạnh nhất: **${S2.best.lag} tháng** (r = ${r2(S2.best.r)}, ${S2.best.n} cặp). Biến vĩ mô tháng này tác động tới nhu cầu ${lbl(addM(S1.months[S1.months.length-1], S2.best.lag))}.` : "Chưa có độ trễ có ý nghĩa thống kê: không dùng biến này."}` : "- Chưa có dữ liệu vĩ mô."}\n\n## Bước 3: S&OP\n| Tháng | Cơ sở | Vĩ mô | Điều chỉnh | Chốt |\n|---|---|---|---|---|\n${F.fin.map((f,k) => `| ${lbl(f.m)} | ${fmtInt(f.base)} | ${B.macro[k] ? (B.macro[k] > 0 ? "+" : "") + fmt1(B.macro[k]) : "—"} | ${f.pct ? (f.pct > 0 ? "+" : "") + fmt1(f.pct) + "%" : ""}${f.units ? " " + (f.units > 0 ? "+" : "") + f.units + " xe" : ""}${f.pending ? " (chờ duyệt)" : ""} | **${fmtInt(f.val)}** |`).join("\n")}\n\n${F.adj.length ? "### Điều chỉnh\n" + F.adj.map(a => `- ${lbl(a.m)} · ${ADJ_T[a.type]}: ${a.pct ? a.pct + "%" : ""}${a.units ? a.units + " xe" : ""}, ${a.reason}. Bằng chứng: ${a.evidence || "chưa có"}. ${a.owner}. ${a.status === "approved" ? "Đã duyệt" : a.status === "rejected" ? "Bác" : "Chờ duyệt"}.`).join("\n") + "\n" : ""}\n### Gợi ý từ đối thủ\n${compHints(cur.seg).map(h => "- " + h).join("\n") || "- Không có."}\n\n### Trạng thái chốt\n- ${F.lock.at ? "Đã chốt ngày " + F.lock.at + " (đủ 3 phòng ký)." : "Đã ký: " + (F.signed.join(", ") || "chưa phòng nào") + ". Cần đủ: " + SIGN.join(", ") + "."}\n`;
}
CV.tools.push({name: "du_bao_kinh_doanh", label: "Đang dự báo…", description: "Dự báo số bán theo tải trọng và loại thùng, 3 bước: (1) làm sạch đường cơ sở, loại đơn fleet và đột biến; (2) tương quan chéo tìm độ trễ biến vĩ mô (ví dụ giải ngân đầu tư công → xe ben); (3) S&OP: đường cơ sở + điều chỉnh có bằng chứng → số chốt, trạng thái ký 3 phòng. tai_trong: '< 1 tấn' | '1–2,5 tấn' | '2,5–3,5 tấn' | '3,5–10 tấn' | '> 10 tấn' | bỏ trống = tất cả; loai_thung: 'Thùng kín' | 'Mui bạt' | 'Ben' | 'Chuyên dùng' | 'Khác (lửng, chassis, van)' | bỏ trống.",
  inputSchema: {type: "object", properties: {tai_trong: {type: "string"}, loai_thung: {type: "string"}}}, execute: ({tai_trong, loai_thung}) => fcMd(tai_trong || "", loai_thung || "")});
CV.localHooks.unshift(raw => { const t = raw.replace(/^ben\s*(ơi)?[,:\s]+/i, "").trim().toLowerCase(); if(!/dự báo|forecast|s&op/.test(t)) return null;
  const body = BODIES.find(b => t.includes(b.toLowerCase().split(" (")[0].toLowerCase())) || (/\bben\b/.test(t) ? "Ben" : /kín/.test(t) ? "Thùng kín" : /bạt/.test(t) ? "Mui bạt" : /chuyên dùng/.test(t) ? "Chuyên dùng" : "");
  return fcMd("", body); });
const prev = CV.ctx; CV.ctx = () => (prev ? prev() : "") + `\nDỰ BÁO KINH DOANH: hỏi dự báo, S&OP, độ trễ vĩ mô, loại fleet thì dùng du_bao_kinh_doanh. ${D.sales.length ? `Đã có ${D.sales.length} dòng lịch sử bán, ${new Set(D.macro.map(x => x.k)).size} biến vĩ mô.` : "Chưa có lịch sử bán theo tháng: hướng dẫn nạp CSV, không tự bịa số dự báo."}`;
render();
})();
