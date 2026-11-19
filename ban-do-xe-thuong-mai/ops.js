/* ===== Ben: ra lệnh giọng nói/văn bản, thư ký họp, trung tâm điều hành ===== */
(function(){
"use strict";
const CV = window.__CV; if(!CV) return;
const {esc, fmtInt, fmt1, mdToHtml, toast} = CV;
const $ = id => document.getElementById(id);
const DEPTS = ["Ban Giám đốc","Kinh doanh","Phát triển đại lý","Dịch vụ","Phụ tùng","Marketing","Tài chính – Kế toán","Nhân sự – Đào tạo","Logistics – Kho","Pháp chế","CNTT – Dữ liệu"];
const STATUS = {todo:"Chưa làm", doing:"Đang làm", review:"Chờ nghiệm thu", done:"Hoàn thành đạt chuẩn", cancel:"Hủy"};
const HL = {green:["Đúng tiến độ","d-green"], amber:["Cảnh báo","d-amber"], red:["Nguy cơ trễ","d-red"], done:["Hoàn thành","d-done"], cancel:["Hủy","d-cancel"]};
const TAGS = {"Ý chính":"", "Quyết định":"t-qd", "Giao việc":"t-gv", "Điểm nghẽn":"t-nn", "Rủi ro":"t-nn", "Lệnh Ben":""};

/* ---------- dates ---------- */
const pad = n => String(n).padStart(2,"0");
function ymd(d){ d = d || new Date(); return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); }
function toD(s){ const [y,m,d] = String(s).slice(0,10).split("-").map(Number); return new Date(y, (m||1)-1, d||1); }
function addDays(s, n){ const d = toD(s); d.setDate(d.getDate()+n); return ymd(d); }
function dd(a, b){ return Math.round((toD(b) - toD(a)) / 864e5); }
function wd(a, b){ if(!a || !b || b <= a) return 0; let n = 0; const d = toD(a), e = toD(b); while(d < e){ d.setDate(d.getDate()+1); if(d.getDay() !== 0) n++; } return n; }
function vnDate(s){ if(!s) return "—"; const d = toD(s); return pad(d.getDate())+"/"+pad(d.getMonth()+1)+"/"+d.getFullYear(); }
function vnTime(iso){ const d = new Date(iso); return isNaN(d) ? "—" : d.toLocaleString("vi-VN",{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"2-digit"}); }
const nowIso = () => new Date().toISOString();
const gid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
function parseDue(s, base){ s = String(s||"").toLowerCase(); base = base || ymd();
  let m = s.match(/(\d{1,2})\s*[\/\-.]\s*(\d{1,2})(?:\s*[\/\-.]\s*(\d{2,4}))?/); if(m){ let y = m[3] ? +m[3] : toD(base).getFullYear(); if(y < 100) y += 2000; const r = y+"-"+pad(+m[2])+"-"+pad(+m[1]); return r < base && !m[3] ? (y+1)+"-"+pad(+m[2])+"-"+pad(+m[1]) : r; }
  m = s.match(/(\d+)\s*(ngày|tuần|tháng)/); if(m){ const n = +m[1] * (m[2]==="tuần"?7:m[2]==="tháng"?30:1); return addDays(base, n); }
  if(/cuối tuần/.test(s)){ const d = toD(base); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7)); return ymd(d); }
  if(/cuối tháng/.test(s)){ const d = toD(base); return ymd(new Date(d.getFullYear(), d.getMonth()+1, 0)); }
  if(/ngày mai/.test(s)) return addDays(base, 1);
  return ""; }

/* ---------- store: shared db when available, this browser otherwise ---------- */
const S = {tasks:{}, meetings:{}, signoffs:{}, changes:[], parts:{}};
let db = null, userCap = null, assets = null, me = null, canAdmin = true, canWrite = true, mode = "local", syncOk = false;
const LKEY = "cv-ops-v1";
function loadLocal(){ try{ const o = JSON.parse(localStorage.getItem(LKEY) || "null"); if(o){ Object.assign(S, {tasks:o.tasks||{}, meetings:o.meetings||{}, signoffs:o.signoffs||{}, changes:o.changes||[], parts:o.parts||{}}); } }catch(e){} }
function saveLocal(){ if(mode !== "local") return; try{ localStorage.setItem(LKEY, JSON.stringify({tasks:S.tasks, meetings:S.meetings, signoffs:S.signoffs, changes:S.changes.slice(-300), parts:S.parts})); }catch(e){} }
function applyLocal(path, data){
  const s = path.split("/");
  if(s[0]==="tasks"||s[0]==="signoffs"||(s[0]==="meetings"&&s.length===2)){ const c = S[s[0]]; if(data == null) delete c[s[1]]; else c[s[1]] = data; }
  else if(s[0]==="meetings" && s[2]==="parts"){ (S.parts[s[1]] = S.parts[s[1]] || {})[s[3]] = data; }
  else if(path==="shared/changes") S.changes = data ? data.items || [] : [];
}
const wq = {};
function put(path, data){
  if(mode === "local"){ applyLocal(path, data); saveLocal(); scheduleRender(); return Promise.resolve(true); }
  const p = (wq[path] || Promise.resolve()).then(() => data == null ? db.doc(path).delete() : db.doc(path).set(data)).then(() => true, e => { dbErr(e); return false; });
  wq[path] = p; return p;
}
function dbErr(e){ const c = e && e.code;
  if(c === "invalid_argument"){ canWrite = false; toast("Tài khoản này chỉ được xem, chưa được ghi dữ liệu điều hành"); }
  else if(c === "quota_exceeded") toast("Kho dữ liệu đã đầy: hãy xóa bớt cuộc họp/đầu việc cũ");
  else if(c === "resource_exhausted") toast("Đang ghi quá nhanh, thử lại sau vài giây");
  else toast("Chưa lưu được, kiểm tra kết nối"); renderSync(); }
function who(uid){ if(!uid) return "—"; if(uid === me) return "Tôi"; if(uid === "local") return "Máy này"; const n = NAMES[uid]; if(n == null) wantName(uid); return n || "Thành viên"; }
const NAMES = {}, pendingNames = new Set(); let nameT = null;
function wantName(uid){ if(!userCap || pendingNames.has(uid)) return; pendingNames.add(uid); clearTimeout(nameT);
  nameT = setTimeout(async () => { const ids = [...pendingNames].filter(x => NAMES[x] == null); if(!ids.length) return;
    try{ const ps = await userCap.profiles(ids); ids.forEach(id => { NAMES[id] = (ps && ps[id] && ps[id].name) || ""; }); }catch(e){ ids.forEach(id => { NAMES[id] = ""; }); }
    scheduleRender(); }, 300); }
const meId = () => me || "local";

/* ---------- map data: shared overrides + change log ---------- */
const DEALER_FIELDS = ["leCum","khCum","thT10","khT10","siT9","leT9","khT9","tonT9"];
const DLABEL = {leCum:"bán lẻ lũy kế T10", khCum:"KH lũy kế T10", thT10:"thực hiện tháng 10", khT10:"KH tháng 10", siT9:"bán sỉ lũy kế T9", leT9:"bán lẻ lũy kế T9", khT9:"KH lũy kế T9", tonT9:"tồn kho T9"};
const PF = [
  ["c_thaco","thị phần Thaco (%)",/thaco/], ["c_hyundai","thị phần Hyundai (%)",/hyundai/], ["c_isuzu","thị phần Isuzu (%)",/isuzu/], ["c_hino","thị phần Hino (%)",/hino/],
  ["c_fuso","thị phần Fuso (%)",/fuso/], ["c_china","thị phần xe Trung Quốc (%)",/trung quốc|xe tàu/], ["c_other","thị phần hãng khác (%)",/hãng khác/],
  ["cpi","CPI tỉnh (%)",/\bcpi\b|lạm phát|giá tiêu dùng/], ["growth","tăng trưởng GRDP (%)",/tăng trưởng/], ["target","KH lũy kế / mục tiêu (xe)",/kế hoạch|mục tiêu|chỉ tiêu|\bkh\b/], ["sales","bán lẻ lũy kế (xe)",/doanh số|số bán|bán lẻ|bán được/],
  ["reg","ĐK mới thực tế (xe)",/đăng ký|đk mới/], ["uio","UIO thực tế (xe)",/\buio\b|lưu hành/], ["pop","dân số (nghìn người)",/dân số/], ["grdp","GRDP (nghìn tỷ đ)",/grdp/],
  ["dealers","số điểm bán",/điểm bán/], ["factor","hệ số vùng",/hệ số/], ["elev","độ cao TB (m)",/độ cao/],
];
const DF = [["leCum",/bán lẻ|doanh số|số bán|bán được/], ["khCum",/kế hoạch|\bkh\b|chỉ tiêu|mục tiêu/], ["siT9",/bán sỉ/], ["tonT9",/tồn/]];
let mapRev = null, applyingRemote = false, pushT = null;
function diffMap(){
  const prov = {};
  CV.rows.forEach(r => { const b = CV.BASE.find(x => x.name === r.name) || {}; const o = {};
    [...CV.NUM_KEYS, "note"].forEach(k => { const a = r[k] == null ? null : r[k], z = b[k] == null ? null : b[k]; if(a !== z) o[k] = a; }); if(Object.keys(o).length) prov[r.name] = o; });
  const dealer = {};
  CV.NET.dealers.forEach((d,i) => { const b = CV.BASE_DEALERS[i], o = {}; DEALER_FIELDS.forEach(k => { const a = d[k] == null ? null : d[k], z = b[k] == null ? null : b[k]; if(a !== z) o[k] = a; }); if(Object.keys(o).length) dealer[d.id] = o; });
  return {prov, dealer, tam: CV.tam, uioNat: CV.uioNat};
}
CV.onSave = () => { if(applyingRemote || mode !== "db") return; clearTimeout(pushT); pushT = setTimeout(() => { mapRev = gid("r"); put("shared/mapdata", {...diffMap(), rev: mapRev, by: me, at: nowIso()}); renderSync(); }, 1200); };
function applyMapdata(d){
  if(!d || d.rev === mapRev) return; mapRev = d.rev; applyingRemote = true;
  try{
    CV.rows = CV.clone(CV.BASE);
    CV.mergeRows(Object.entries(d.prov || {}).map(([name, o]) => ({name, ...Object.fromEntries(Object.entries(o).filter(([,v]) => v != null))})));
    CV.NET.dealers.forEach((x,i) => { const b = CV.BASE_DEALERS[i]; DEALER_FIELDS.forEach(k => { x[k] = b[k]; }); Object.assign(x, (d.dealer || {})[x.id] || {}); });
    if(d.tam) CV.tam = +d.tam; if(d.uioNat) CV.uioNat = +d.uioNat; CV.saveLocal(); CV.renderAll();
  } finally { applyingRemote = false; }
}
function logChange(c){ const items = S.changes.concat([{at: nowIso(), by: meId(), ...c}]).slice(-300); if(mode === "local"){ S.changes = items; saveLocal(); } put("shared/changes", {items}); }
function dealerOf(d){ return CV.NET.dealers.find(x => x.id === d); }
function provSum(name){ return CV.NET.dealers.filter(x => x.province === name); }
function setProv(r, field, v, via){ const before = r[field]; r[field] = v; logChange({kind:"prov", key:r.name, field, before: before ?? null, after: v, via}); CV.save(); CV.renderAll(); return before; }
function setDealer(d, field, v, via){
  const before = d[field]; d[field] = v;
  if(field === "leCum" || field === "khCum"){ const r = CV.findRow(d.province); const pf = field === "leCum" ? "sales" : "target"; if(r){ r[pf] = (+r[pf] || 0) + (v - (+before || 0)); } }
  logChange({kind:"dealer", key:d.id, name:d.salesKey || d.name, field, before: before ?? null, after: v, via}); CV.save(); CV.renderAll(); return before;
}
function undoLast(){
  const mine = [...S.changes].reverse().find(c => c.by === meId() && !c.undone && (c.kind === "prov" || c.kind === "dealer")); if(!mine) return null;
  if(mine.kind === "prov"){ const r = CV.findRow(mine.key); if(!r) return null; r[mine.field] = mine.before; }
  else { const d = dealerOf(mine.key); if(!d) return null; const r = CV.findRow(d.province), pf = mine.field === "leCum" ? "sales" : mine.field === "khCum" ? "target" : null; if(r && pf) r[pf] = (+r[pf]||0) - ((+mine.after||0) - (+mine.before||0)); d[mine.field] = mine.before; }
  const items = S.changes.map(c => c === mine ? {...c, undone: nowIso()} : c);
  if(mode === "local"){ S.changes = items; saveLocal(); } put("shared/changes", {items}); CV.save(); CV.renderAll(); return mine;
}

/* ---------- in-page ask (browser prompt/confirm can be blocked inside the frame) ---------- */
function ask(label, opts){ opts = opts || {}; return new Promise(res => {
  const d = $("askDlg"); $("askL").textContent = label; const inp = $("askIn"); inp.value = ""; inp.hidden = !!opts.confirm; inp.placeholder = opts.ph || "";
  const done = v => { d.close(); $("askOk").onclick = $("askNo").onclick = null; res(v); };
  $("askOk").onclick = () => { if(opts.confirm) return done(true); const v = inp.value.trim(); if(opts.required && !v){ inp.focus(); return; } done(v); };
  $("askNo").onclick = () => done(opts.confirm ? false : null); d.oncancel = e => { e.preventDefault(); done(opts.confirm ? false : null); };
  inp.onkeydown = e => { if(e.key === "Enter"){ e.preventDefault(); $("askOk").click(); } };
  d.showModal(); if(!opts.confirm) inp.focus(); }); }

/* ---------- natural-language command parsing (no AI needed) ---------- */
const N = s => CV.norm(String(s||""));
function findTarget(text){
  const t = N(text); let best = null;
  CV.rows.forEach(r => [r.name, ...(r.merged||[])].forEach(n => { const k = N(n); if(k.length >= 3 && t.includes(k) && (!best || k.length > best.len)) best = {kind:"prov", row:r, len:k.length, label:r.name}; }));
  CV.NET.dealers.forEach(d => [d.salesKey, d.name].filter(Boolean).forEach(n => { const k = N(n); if(k.length >= 4 && t.includes(k) && (!best || k.length > best.len || (best.kind === "prov" && /đại lý/.test(text.toLowerCase()) && k.length >= best.len - 2))) best = {kind:"dealer", d, len:k.length, label:d.salesKey || d.name}; }));
  return best;
}
function parseNum(s){ s = String(s).trim().toLowerCase(); const m = s.match(/(-?\d[\d.,]*)\s*(nghìn|ngàn|triệu|tỷ|%)?\s*$/); if(!m) return null;
  let x = m[1]; if(/^\d{1,3}(\.\d{3})+$/.test(x)) x = x.replace(/\./g,""); else x = x.replace(/\.(?=\d{3}\b)/g,"").replace(",", ".");
  let v = parseFloat(x); if(isNaN(v)) return null; v *= ({nghìn:1e3, ngàn:1e3, triệu:1e6, tỷ:1e9}[m[2]] || 1); return v; }
function lastNum(text){ const all = [...String(text).matchAll(/-?\d[\d.,]*\s*(?:nghìn|ngàn|triệu|tỷ|%)?/g)].map(m => m[0]); return all.length ? parseNum(all[all.length-1]) : null; }
function runSetCommand(text, via){
  const low = text.toLowerCase();
  if(!/^(đặt|sửa|cập nhật|nhập|chỉnh|đổi|ghi|tăng|giảm|set|update)\b/.test(low)) return null;
  const tg = findTarget(text); if(!tg) return "Em chưa nhận ra tỉnh/đại lý trong lệnh. Ví dụ: `cập nhật doanh số Cần Thơ 480` hoặc `đặt bán lẻ đại lý Trường Vũ 360`.";
  const v = lastNum(text.replace(/t(9|10)\b/gi, "")); if(v == null) return "Em chưa thấy con số trong lệnh.";
  const rel = /\b(tăng|thêm|cộng)\b/.test(low) ? 1 : /\b(giảm|bớt|trừ)\b/.test(low) ? -1 : 0;
  if(tg.kind === "dealer"){
    const f = (DF.find(([,re]) => re.test(low)) || ["leCum"])[0], d = tg.d, before = +d[f] || 0, nv = rel ? before + rel*v : v;
    setDealer(d, f, Math.round(nv), via);
    return `Đã cập nhật **${esc(tg.label)}** · ${DLABEL[f]}: ${fmtInt(before)} → **${fmtInt(nv)}**${f==="leCum"||f==="khCum" ? ` (tỉnh ${esc(d.province)} cập nhật theo)` : ""}. Gõ hoặc nói “hoàn tác” để quay lại.`;
  }
  const pf = PF.find(([,,re]) => re.test(low)); if(!pf) return `Em chưa rõ chỉ tiêu cần sửa cho ${esc(tg.label)}. Các chỉ tiêu: ${PF.map(p => p[1]).join(", ")}.`;
  const r = tg.row, before = r[pf[0]], nv = rel ? (+before||0) + rel*v : v;
  setProv(r, pf[0], nv, via); CV.select(r.name, true);
  return `Đã cập nhật **${esc(r.name)}** · ${pf[1]}: ${before == null || before === "" ? "trống" : fmtInt(before)} → **${(+nv % 1) ? fmt1(nv) : fmtInt(nv)}**. Bản đồ, xếp hạng, thế trận đã tính lại. Nói “hoàn tác” để quay lại.`;
}
function localCommand(raw){
  let text = raw.replace(/^ben\s*(ơi)?[,:\s]+/i, "").trim(); const low = text.toLowerCase();
  if(!text) return null;
  if(/^(hoàn tác|undo|quay lại)\b/.test(low)){ const c = undoLast(); return c ? `Đã hoàn tác: ${esc(c.kind === "prov" ? c.key : c.name)} · ${esc(c.field)} về ${c.before == null ? "trống" : fmtInt(c.before)}.` : "Không có thay đổi nào của anh/chị để hoàn tác."; }
  const set = runSetCommand(text, "Ben"); if(set) return set;
  if(/^(bản tin|báo cáo hôm nay|tình hình đầu việc|tình hình công việc|việc hôm nay)/.test(low)) return briefMd();
  let m;
  if((m = low.match(/^(mở|xem|chọn|bay tới|đi tới|zoom)\s+(.+)$/))){
    const z = CV.ZONES.find(x => N(x) === N(m[2]) || N(x.replace("Khu vực ","")) === N(m[2])); if(z){ CV.setMap({zone:z}); return `Đã lọc **${esc(z)}**.`; }
    if(/toàn quốc|cả nước/.test(m[2])){ CV.setMap({zone:""}); return "Đã về **toàn quốc**."; }
    const tg = findTarget(text); if(tg){ if(tg.kind === "prov"){ CV.select(tg.row.name, true); CV.showTab("P"); CV.focusOn(tg.row.lp[0], tg.row.lp[1], 90); return `Đã mở **${esc(tg.row.name)}**.`; }
      CV.select(tg.d.province, true); CV.focusOn(tg.d.lng, tg.d.lat, 55); return `Đã bay tới đại lý **${esc(tg.label)}** (${esc(tg.d.province)}): bán lẻ lũy kế T10 ${fmtInt(tg.d.leCum)} / KH ${fmtInt(tg.d.khCum)} xe.`; }
  }
  if(/^(toàn quốc|cả nước)$/.test(low)){ CV.setMap({zone:""}); return "Đã về **toàn quốc**."; }
  if((m = low.match(/^(?:chỉ số|xem chỉ số|tô màu theo)\s+(.+)$/))){ const k = Object.keys(CV.METRICS).find(k => CV.METRICS[k].label.toLowerCase().includes(m[1].trim())); if(k){ CV.setMap({metric:k, bars:true, color:"metric"}); return `Đã chuyển chỉ số **${esc(CV.METRICS[k].label)}**, dựng cột 3D.`; } }
  if((m = low.match(/^(bật|tắt|hiện|ẩn)\s+(cột|ghim|đại lý|nhãn|tên tỉnh|giao thông|đề xuất)/))){ const on = /bật|hiện/.test(m[1]);
    const key = {cột:"bars", ghim:"pins", "đại lý":"pins", nhãn:"labels", "tên tỉnh":"labels", "giao thông":"infra", "đề xuất":"sites"}[m[2]]; CV.setMap({[key]: on}); return `Đã ${on ? "bật" : "tắt"} ${m[2]}.`; }
  if((m = text.match(/^giao việc[:\s]+(.+?)\s+cho\s+(.+?)(?:\s*(?:,|hạn|trước|deadline|trong)\s+(.+))?$/i))){
    const t = blankTask({title: m[1].trim(), owner: m[2].trim(), due: parseDue(m[3]) || addDays(ymd(), 7)}); openTask(t, true);
    return `Em đã mở phiếu giao việc **${esc(t.title)}** cho **${esc(t.owner)}**, hạn ${vnDate(t.due)}. Anh/chị bổ sung chỉ số đo, bằng chứng yêu cầu, phòng xác nhận rồi bấm Lưu.`; }
  return null;
}
CV.localHooks.push(localCommand);

/* ---------- task logic ---------- */
function blankTask(o){ const s = ymd(); return {id: gid("t"), title:"", owner:"", dept:"Kinh doanh", priority:"P2", coDepts:[], kpi:{name:"", unit:"", base:"", target:"", actual:"", dir:"up"}, evidenceReq:"", start:s, due:addDays(s,7), effortH:"", firstStep:"", status:"todo", progress:0, checkins:[], evidence:[], blockers:[], support:null, kudos:[], log:[], meetingId:"", createdAt:nowIso(), createdBy:meId(), ...o}; }
const tasksArr = () => Object.values(S.tasks).filter(Boolean);
function lastCi(t){ const c = t.checkins || []; return c.length ? c[c.length-1] : null; }
function confirmsOf(id){ const out = []; Object.entries(S.signoffs).forEach(([uid, d]) => { const c = d && (d.confirms || {})[id]; if(c) out.push({uid, ...c}); }); return out; }
function dod(t){
  const k = t.kpi || {}, hasT = k.target !== "" && k.target != null && !isNaN(+k.target);
  const kpiOk = !hasT || (k.actual !== "" && k.actual != null && (k.dir === "down" ? +k.actual <= +k.target : +k.actual >= +k.target));
  const cf = confirmsOf(t.id).filter(c => c.ok), need = t.coDepts || [];
  const missing = need.filter(dp => !cf.some(c => c.dept === dp)), ev = (t.evidence || []).length > 0, blk = !(t.blockers || []).some(b => !b.resolved);
  return {ev, kpiOk, hasT, cfOk: !missing.length, missing, blk, all: ev && kpiOk && !missing.length && blk};
}
function health(t, td){
  td = td || ymd();
  if(t.status === "done") return {k:"done", reasons:[], expected:100, gap:0};
  if(t.status === "cancel") return {k:"cancel", reasons:[], expected:0, gap:0};
  const start = t.start || String(t.createdAt || nowIso()).slice(0,10), due = t.due || start;
  const total = Math.max(1, dd(start, due)), el = Math.max(0, dd(start, td));
  const expected = Math.min(100, Math.round(el / total * 100)), p = +t.progress || 0, gap = expected - p;
  const lc = lastCi(t), since = td < start ? 0 : wd(lc ? lc.d : start, td);
  const open = (t.blockers || []).filter(b => !b.resolved), stale = open.filter(b => dd(String(b.since).slice(0,10), td) >= 2);
  let eta = null; const cs = (t.checkins || []).filter(c => c.p != null);
  if(cs.length >= 2){ const a = cs[Math.max(0, cs.length-4)], b = cs[cs.length-1], v = (b.p - a.p) / Math.max(1, dd(a.d, b.d)); if(v > 0) eta = addDays(td, Math.ceil((100 - p) / v)); }
  else if(p > 0 && el > 0) eta = addDays(td, Math.ceil((100 - p) / (p / el)));
  const R = [], A = [];
  if(td > due) R.push(`Quá hạn ${dd(due, td)} ngày`);
  if(gap >= 25) R.push(`Tiến độ ${p}% / kỳ vọng ${expected}%`); else if(gap >= 10) A.push(`Chậm ${gap} điểm so với kỳ vọng ${expected}%`);
  if(stale.length) R.push(`Điểm nghẽn tồn ${dd(String(stale[0].since).slice(0,10), td)} ngày chưa xử lý`); else if(open.length) A.push(`${open.length} điểm nghẽn đang mở`);
  if(since >= 3) R.push(`${since} ngày làm việc chưa cập nhật`); else if(since >= 2) A.push(`${since} ngày chưa cập nhật`);
  if(eta && eta > due && td <= due){ const late = dd(due, eta); (late > 2 ? R : A).push(`Dự báo xong ${vnDate(eta)}, trễ ${late} ngày`); }
  if(t.support && t.support.open) A.push("Đang xin hỗ trợ" + (t.support.takenBy ? " (đã có người nhận)" : ""));
  if(t.status === "review" && !dod(t).all) A.push("Chưa đủ điều kiện nghiệm thu");
  if(p >= 50 && !(t.evidence || []).length) A.push("Đã ≥ 50% nhưng chưa có bằng chứng");
  return {k: R.length ? "red" : A.length ? "amber" : "green", reasons: R.concat(A), expected, gap, since, eta, open, left: dd(td, due)};
}
async function saveTask(t, act){
  if(!canWrite){ toast("Tài khoản này chỉ được xem"); return false; }
  const x = JSON.parse(JSON.stringify(t)); x.updatedAt = nowIso(); x.updatedBy = meId();
  if(act) x.log = (x.log || []).concat([{at: nowIso(), by: meId(), act}]).slice(-80);
  if(x.checkins && x.checkins.length > 120) x.checkins = x.checkins.slice(-120);
  return put("tasks/" + x.id, x);
}
async function writeSignoff(fn){
  if(!canWrite){ toast("Tài khoản này chỉ được xem"); return false; }
  const cur = JSON.parse(JSON.stringify(S.signoffs[meId()] || {confirms:{}, meetings:{}})); fn(cur); cur.at = nowIso();
  return put("signoffs/" + meId(), cur);
}

/* ---------- daily brief & leader actions ---------- */
function scorecard(){
  const by = {}, td = ymd();
  tasksArr().forEach(t => { if(t.status === "cancel") return; const o = (t.owner || "(chưa giao)").trim();
    const s = by[o] || (by[o] = {owner:o, dept:t.dept||"", n:0, done:0, onTime:0, lateOpen:0, red:0, amber:0, ciDays:0, ciNeed:0, evOk:0, cfNeed:0, cfOk:0, blk:0, blkRes:0, blkDays:0, sup:0, kudos:0, open:0});
    s.n++; const h = health(t, td); if(h.k === "red") s.red++; if(h.k === "amber") s.amber++;
    const start = t.start || String(t.createdAt).slice(0,10), D = dod(t);
    if(t.status === "done"){ s.done++; const fin = String(t.acceptedAt || "").slice(0,10) || td; if(!t.due || fin <= t.due) s.onTime++; if(D.ev && D.kpiOk) s.evOk++; }
    else { s.open++; if(t.due && td > t.due) s.lateOpen++; }
    const end = t.status === "done" ? (String(t.acceptedAt || "").slice(0,10) || td) : (t.due && t.due < td ? t.due : td);
    const need = wd(start, end), days = new Set((t.checkins || []).map(c => c.d)).size; s.ciNeed += need; s.ciDays += Math.min(need, days);
    if((t.coDepts || []).length && t.status === "done"){ s.cfNeed++; if(D.cfOk) s.cfOk++; }
    (t.blockers || []).forEach(b => { if(!b.resolved && dd(String(b.since).slice(0,10), td) < 2) return; s.blk++; if(b.resolved){ s.blkRes++; s.blkDays += Math.max(0, dd(String(b.since).slice(0,10), String(b.resolvedAt).slice(0,10))); } });
    if(t.support && t.support.at) s.sup++; s.kudos += (t.kudos || []).length; });
  return Object.values(by).map(s => {
    const P = (a, b) => b ? a / b * 100 : null;
    s.onTimeP = P(s.onTime, s.done + s.lateOpen); s.ciP = P(s.ciDays, s.ciNeed); s.evP = P(s.evOk, s.done); s.cfP = P(s.cfOk, s.cfNeed); s.blkP = P(s.blkRes, s.blk); s.blkAvg = s.blkRes ? s.blkDays / s.blkRes : null;
    const parts = [[s.onTimeP,.3],[s.ciP,.2],[s.evP,.2],[s.cfP,.15],[s.blkP,.15]].filter(x => x[0] != null), w = parts.reduce((a,x)=>a+x[1],0);
    s.score = w ? Math.max(0, Math.round(parts.reduce((a,x)=>a+x[0]*x[1],0)/w - 5*s.red)) : null; return s;
  }).sort((a,b) => (b.score ?? -1) - (a.score ?? -1));
}
function leaderActions(){
  const td = ymd(), out = [], ts = tasksArr().filter(t => t.status !== "cancel");
  ts.filter(t => t.support && t.support.open && !t.support.takenBy).forEach(t => out.push({c:"red", pri:0, t, txt:`Hỗ trợ ngay <b>${esc(t.owner)}</b>: “${esc(t.support.text || "cần hỗ trợ")}” · ${esc(t.title)}`, btn:["take","Tôi nhận hỗ trợ"]}));
  ts.forEach(t => { const h = health(t, td); if(h.k === "red") out.push({c:"red", pri:1, t, txt:`Gỡ nghẽn cùng <b>${esc(t.owner)}</b> (15 phút, trước 10:00): ${esc(t.title)} · <span class="muted">${esc(h.reasons.slice(0,2).join("; "))}</span>`, btn:["open","Mở"]}); });
  ts.filter(t => t.status === "review").forEach(t => { const D = dod(t);
    out.push(D.all ? {c:"green", pri:2, t, txt:`Nghiệm thu: <b>${esc(t.title)}</b> (${esc(t.owner)}) đã đủ số liệu, bằng chứng, xác nhận`, btn:["open","Nghiệm thu"]}
      : {c:"", pri:3, t, txt:`Điều phối hoàn tất nghiệm thu <b>${esc(t.title)}</b>: ${[!D.ev && "thiếu bằng chứng", !D.kpiOk && "KPI chưa đạt", D.missing.length && "chờ " + D.missing.join(", ") + " xác nhận", !D.blk && "còn điểm nghẽn"].filter(Boolean).map(esc).join(", ")}`, btn:["open","Mở"]}); });
  ts.filter(t => t.status !== "done" && t.due && dd(td, t.due) >= 0 && dd(td, t.due) <= 2 && (+t.progress||0) < 80 && health(t, td).k !== "red").forEach(t => out.push({c:"", pri:4, t, txt:`Rà soát cùng <b>${esc(t.owner)}</b> trước hạn ${vnDate(t.due)}: ${esc(t.title)} (${+t.progress||0}%)`, btn:["open","Mở"]}));
  const miss = {}; ts.filter(t => t.status !== "done" && (t.start || "") <= td && !(t.checkins || []).some(c => c.d === td)).forEach(t => { (miss[t.owner] = miss[t.owner] || []).push(t); });
  Object.entries(miss).forEach(([o, l]) => out.push({c:"blue", pri:5, txt:`Nhắc <b>${esc(o)}</b> cập nhật hôm nay ${l.length} việc: ${l.slice(0,3).map(x => esc(x.title)).join("; ")}${l.length > 3 ? "…" : ""}`}));
  ts.filter(t => t.status === "done" && t.acceptedAt && dd(String(t.acceptedAt).slice(0,10), td) <= 3 && !(t.kudos || []).length).forEach(t => out.push({c:"green", pri:6, t, txt:`Ghi nhận <b>${esc(t.owner)}</b>: hoàn thành đạt chuẩn “${esc(t.title)}”`, btn:["kudos","Ghi nhận"]}));
  Object.values(S.meetings).filter(m => m && m.status === "confirmed").forEach(m => { const n = Object.values(S.signoffs).filter(s => s && (s.meetings || {})[m.id]).length; if(n < Math.max(1, (m.people || []).length)) out.push({c:"blue", pri:7, txt:`Biên bản “${esc(m.title)}”: ${n}/${(m.people||[]).length} thành phần đã xác nhận`, mtg:m.id, btn:["mtg","Mở biên bản"]}); });
  return out.sort((a,b) => a.pri - b.pri);
}
function briefMd(){
  const td = ymd(), ts = tasksArr().filter(t => t.status !== "cancel"), H = ts.map(t => [t, health(t, td)]);
  const cnt = k => H.filter(([,h]) => h.k === k).length, open = H.filter(([t]) => t.status !== "done");
  const row = ([t,h]) => `| ${t.title} | ${t.owner} (${t.dept}) | ${+t.progress||0}% / ${h.expected}% | ${vnDate(t.due)} | ${h.reasons.slice(0,2).join("; ") || "—"} |`;
  const tot = CV.rows.reduce((a,r) => a + (+r.sales||0), 0), kh = CV.rows.reduce((a,r) => a + (+r.target||0), 0);
  const blk = []; ts.forEach(t => (t.blockers||[]).filter(b => !b.resolved).forEach(b => blk.push(`- **${b.text}** · việc “${t.title}” · ${t.owner} · tồn ${dd(String(b.since).slice(0,10), td)} ngày`)));
  const sup = ts.filter(t => t.support && t.support.open).map(t => `- ${t.owner}: “${t.support.text || "cần hỗ trợ"}” (${t.title})${t.support.takenBy ? " · đã có người nhận" : " · **chưa ai nhận**"}`);
  const acts = leaderActions().slice(0, 10).map((a,i) => `${i+1}. ${a.txt.replace(/<[^>]+>/g, "")}`);
  return `# Bản tin điều hành ${vnDate(td)}
_Ben tổng hợp lúc ${new Date().toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"})} · ${ts.length} đầu việc · dữ liệu ${mode === "db" ? "đồng bộ chung" : "trên máy này"}_

## 1. Tổng quan
- Đang mở **${open.length}** việc: đúng tiến độ ${cnt("green")}, cảnh báo ${cnt("amber")}, **nguy cơ trễ ${cnt("red")}**; hoàn thành đạt chuẩn ${cnt("done")}.
- Quá hạn: **${open.filter(([t]) => t.due && td > t.due).length}** · cần hỗ trợ: **${sup.length}** · điểm nghẽn mở: **${blk.length}** · chưa cập nhật hôm nay: ${open.filter(([t]) => (t.start||"") <= td && !(t.checkins||[]).some(c => c.d === td)).length}.
- Kinh doanh: bán lẻ lũy kế ${fmtInt(tot)} xe / KH lũy kế ${fmtInt(kh)} xe (${kh ? fmt1(tot/kh*100) : "—"}%).

## 2. Nguy cơ trễ (xử lý hôm nay)
${cnt("red") ? "| Việc | Người chịu trách nhiệm | Tiến độ / kỳ vọng | Hạn | Lý do |\n|---|---|---|---|---|\n" + H.filter(([,h]) => h.k === "red").map(row).join("\n") : "_Không có việc nguy cơ trễ._"}

## 3. Cảnh báo sớm
${cnt("amber") ? "| Việc | Người chịu trách nhiệm | Tiến độ / kỳ vọng | Hạn | Lý do |\n|---|---|---|---|---|\n" + H.filter(([,h]) => h.k === "amber").map(row).join("\n") : "_Không có._"}

## 4. Cần hỗ trợ
${sup.join("\n") || "_Không có yêu cầu hỗ trợ._"}

## 5. Điểm nghẽn phải xử lý dứt điểm
${blk.join("\n") || "_Không có điểm nghẽn mở._"}

## 6. Lãnh đạo cần làm hôm nay
${acts.join("\n") || "_Không có việc cần can thiệp._"}
`;
}

/* ---------- render ---------- */
let rT = null; function scheduleRender(){ clearTimeout(rT); rT = setTimeout(renderOps, 60); }
let otab = "T", tileF = "";
function renderSync(){ const el = $("opsSync"); if(!el) return; el.className = "syncb" + (mode === "db" && syncOk ? " on" : "");
  el.textContent = mode === "db" ? (syncOk ? "● Đồng bộ chung, realtime" : "Đang kết nối dữ liệu chung…") : "Lưu trên máy này (mở trong Claude để đồng bộ chung)"; if(!canWrite && mode === "db") el.textContent += " · chỉ xem"; }
function pbar(p, e){ return `<div class="pbar" title="Thực tế ${p}% · kỳ vọng ${e}%"><i style="width:${Math.min(100,p)}%"></i><b style="left:${Math.min(100,e)}%"></b></div>`; }
function kpiTxt(k){ k = k || {}; if(!k.name) return '<span class="muted">chưa có</span>'; return `${esc(k.name)}<br><b>${k.actual === "" || k.actual == null ? "—" : fmtInt(+k.actual)}</b> / ${k.target === "" || k.target == null ? "—" : fmtInt(+k.target)} ${esc(k.unit||"")}`; }
function renderOps(){
  if(!$("opsSec")) return;
  const td = ymd(), all = tasksArr(), H = new Map(all.map(t => [t.id, health(t, td)]));
  const open = all.filter(t => t.status !== "done" && t.status !== "cancel");
  const nb = (k) => open.filter(t => H.get(t.id).k === k).length;
  const tiles = [["open","Đang mở",open.length],["green","Đúng tiến độ",nb("green")],["amber","Cảnh báo sớm",nb("amber")],["red","Nguy cơ trễ",nb("red")],
    ["late","Quá hạn",open.filter(t => t.due && td > t.due).length],["sup","Cần hỗ trợ",open.filter(t => t.support && t.support.open).length],
    ["noci","Chưa cập nhật hôm nay",open.filter(t => (t.start||"") <= td && !(t.checkins||[]).some(c => c.d === td)).length],["blk","Điểm nghẽn mở",open.reduce((a,t) => a + (t.blockers||[]).filter(b => !b.resolved).length, 0)],
    ["review","Chờ nghiệm thu",all.filter(t => t.status === "review").length],["done","Hoàn thành đạt chuẩn",all.filter(t => t.status === "done").length]];
  const col = {green:"var(--good)", amber:"var(--warn)", red:"var(--bad)", late:"var(--bad)", sup:"var(--warn)", blk:"var(--bad)", done:"#9fb4ff"};
  $("opsTiles").innerHTML = tiles.map(([k,l,v]) => `<div class="stat" role="button" tabindex="0" data-tile="${k}" aria-pressed="${tileF===k}"><div class="v" style="color:${v && col[k] || "#fff"}">${fmtInt(v)}</div><div class="l">${l}</div></div>`).join("");
  const live = Object.values(S.meetings).find(m => m && m.status === "live");
  $("opsBar").innerHTML = `<b>Điều hành</b><span>${open.length} việc mở</span><span><i class="dot3 d-green"></i>${nb("green")}</span><span><i class="dot3 d-amber"></i>${nb("amber")}</span><span><i class="dot3 d-red"></i>${nb("red")}</span>`
    + `<span>Quá hạn <b style="color:var(--bad)">${tiles[4][2]}</b></span><span>Cần hỗ trợ <b style="color:var(--warn)">${tiles[5][2]}</b></span><span>Chưa cập nhật hôm nay ${tiles[6][2]}</span>`
    + (live ? `<span class="live">● Đang họp: ${esc(live.title || "Cuộc họp")}</span>` : "") + `<span class="muted" style="margin-left:auto">Xem trung tâm điều hành ↓</span>`;
  const acts = leaderActions();
  $("opsToday").innerHTML = acts.slice(0, 12).map((a,i) => `<li class="${a.c}">${a.txt}${a.btn ? `<button type="button" data-act="${a.btn[0]}" data-i="${i}">${a.btn[1]}</button>` : ""}</li>`).join("") || '<li class="green">Chưa có việc cần lãnh đạo can thiệp. Tạo đầu việc từ cuộc họp hoặc bấm “+ Đầu việc”.</li>';
  $("opsToday")._acts = acts;
  const sc = scorecard(), P = v => v == null ? "—" : fmtInt(v) + "%";
  const scoreCol = v => v == null ? "" : v >= 80 ? "var(--good)" : v >= 60 ? "var(--warn)" : "var(--bad)";
  $("opsLeadMini").innerHTML = sc.length ? `<table class="lead"><thead><tr><th>Người chịu trách nhiệm</th><th>Việc</th><th>Nguy cơ</th><th>Đúng hạn</th><th>Cập nhật</th><th>Điểm</th></tr></thead><tbody>${sc.slice(0,8).map(s => `<tr><td>${esc(s.owner)}<span class="reason">${esc(s.dept)}</span></td><td>${s.n}</td><td style="color:${s.red ? "var(--bad)" : ""}">${s.red}</td><td>${P(s.onTimeP)}</td><td>${P(s.ciP)}</td><td><b style="color:${scoreCol(s.score)}">${s.score ?? "—"}</b></td></tr>`).join("")}</tbody></table>` : '<p class="muted small">Chưa có dữ liệu.</p>';
  $("opsLead").innerHTML = sc.length ? `<table class="lead"><thead><tr><th>Người chịu trách nhiệm</th><th>Phòng ban</th><th>Tổng việc</th><th>Đang mở</th><th>Nguy cơ / cảnh báo</th><th>Đúng hạn</th><th>Kỷ luật cập nhật</th><th>Có số liệu + bằng chứng</th><th>Xác nhận liên phòng</th><th>Nghẽn đã xử lý</th><th>Ngày xử lý TB</th><th>Xin hỗ trợ</th><th>Ghi nhận</th><th>Điểm năng lực</th></tr></thead><tbody>${sc.map(s => `<tr><td>${esc(s.owner)}</td><td style="text-align:left">${esc(s.dept)}</td><td>${s.n}</td><td>${s.open}</td><td><span style="color:var(--bad)">${s.red}</span> / <span style="color:var(--warn)">${s.amber}</span></td><td>${P(s.onTimeP)}</td><td>${P(s.ciP)}</td><td>${P(s.evP)}</td><td>${P(s.cfP)}</td><td>${s.blk ? s.blkRes + "/" + s.blk : "—"}</td><td>${s.blkAvg == null ? "—" : fmt1(s.blkAvg)}</td><td>${s.sup}</td><td>${s.kudos}</td><td><b style="color:${scoreCol(s.score)}">${s.score ?? "—"}</b></td></tr>`).join("")}</tbody></table>` : '<p class="muted">Chưa có đầu việc nào.</p>';
  // filters
  const owners = [...new Set(all.map(t => t.owner).filter(Boolean))].sort((a,b) => a.localeCompare(b,"vi"));
  const fo = $("ofOwner"), fv = fo.value; fo.innerHTML = '<option value="">Tất cả</option>' + owners.map(o => `<option>${esc(o)}</option>`).join(""); fo.value = owners.includes(fv) ? fv : "";
  const fD = $("ofDept").value, fO = fo.value, fS = $("ofStatus").value, fT = N($("ofText").value);
  let list = all.filter(t => (!fD || t.dept === fD) && (!fO || t.owner === fO) && (fS === "active" ? (t.status !== "done" && t.status !== "cancel") : (!fS || t.status === fS)));
  if(fT) list = list.filter(t => N(t.title + " " + t.owner + " " + ((S.meetings[t.meetingId]||{}).title||"")).includes(fT));
  if(tileF){ list = all.filter(t => { const h = H.get(t.id), op = t.status !== "done" && t.status !== "cancel";
    return {open:op, green:op && h.k==="green", amber:op && h.k==="amber", red:op && h.k==="red", late:op && t.due && td > t.due, sup:op && t.support && t.support.open, noci:op && (t.start||"") <= td && !(t.checkins||[]).some(c => c.d === td), blk:op && (t.blockers||[]).some(b => !b.resolved), review:t.status==="review", done:t.status==="done"}[tileF]; }); }
  const ord = {red:0, amber:1, green:2, done:3, cancel:4};
  list.sort((a,b) => ord[H.get(a.id).k] - ord[H.get(b.id).k] || String(a.due).localeCompare(String(b.due)));
  $("opsTable").innerHTML = `<thead><tr><th>Sức khỏe</th><th>Đầu việc</th><th>Người chịu trách nhiệm</th><th>Chỉ số (thực / mục tiêu)</th><th>Tiến độ (vạch trắng = kỳ vọng hôm nay)</th><th>Hạn</th><th>Bằng chứng · xác nhận</th><th>Cập nhật gần nhất</th></tr></thead><tbody>` +
    (list.map(t => { const h = H.get(t.id), D = dod(t), lc = lastCi(t), cf = confirmsOf(t.id).filter(c => c.ok).length;
      return `<tr class="trow" data-id="${esc(t.id)}"><td><i class="dot3 ${HL[h.k][1]}"></i>${HL[h.k][0]}${h.reasons.length ? `<span class="reason">${esc(h.reasons.slice(0,2).join(" · "))}</span>` : ""}</td>
        <td><b>${esc(t.title)}</b><span class="reason">${esc(t.priority||"")} · ${esc(STATUS[t.status]||"")}${t.meetingId && S.meetings[t.meetingId] ? " · họp: " + esc(S.meetings[t.meetingId].title) : ""}</span></td>
        <td>${esc(t.owner)}<span class="reason">${esc(t.dept)}${(t.coDepts||[]).length ? " · phối hợp: " + esc(t.coDepts.join(", ")) : ""}</span></td>
        <td class="num">${kpiTxt(t.kpi)}</td><td class="num">${+t.progress||0}%${pbar(+t.progress||0, h.expected)}</td>
        <td class="num">${vnDate(t.due)}<span class="reason">${t.status === "done" ? "đã xong" : h.left < 0 ? "quá " + (-h.left) + " ngày" : "còn " + h.left + " ngày"}</span></td>
        <td>${(t.evidence||[]).length} bằng chứng<span class="reason">${(t.coDepts||[]).length ? cf + "/" + t.coDepts.length + " phòng xác nhận" : "không cần xác nhận"}${D.all ? " · đủ ĐK nghiệm thu" : ""}</span></td>
        <td class="small">${lc ? vnDate(lc.d) + " · " + esc(String(lc.note||"").slice(0,60)) : '<span class="muted">chưa có</span>'}</td></tr>`; }).join("") || `<tr><td colspan="8" class="muted">Không có đầu việc phù hợp bộ lọc.</td></tr>`) + "</tbody>";
  renderMeetings(); renderChanges(); renderSync();
  if(dlgTask && $("taskDlg").open){ const cur = S.tasks[dlgTask.id]; if(cur && !dlgDirty){ dlgTask = JSON.parse(JSON.stringify(cur)); drawTask(); } }
  if(minId && $("minDlg").open && minMode === "view") drawMinutes();
}
function renderMeetings(){
  const ms = Object.values(S.meetings).filter(Boolean).sort((a,b) => String(b.startedAt).localeCompare(String(a.startedAt)));
  $("opsMeetings").innerHTML = ms.length ? `<table class="tasktbl"><thead><tr><th>Cuộc họp</th><th>Thời gian</th><th>Chủ trì</th><th>Trạng thái</th><th>Đầu việc</th><th>Xác nhận</th><th></th></tr></thead><tbody>${ms.map(m => {
    const ts = (m.taskIds || []).map(id => S.tasks[id]).filter(Boolean), hs = ts.map(t => health(t).k), sg = Object.values(S.signoffs).filter(s => s && (s.meetings||{})[m.id]).length;
    return `<tr><td><b>${esc(m.title || "Cuộc họp")}</b><span class="reason">${esc(m.goal||"")}</span></td><td class="small">${vnTime(m.startedAt)}</td><td>${esc(m.host||"")}</td><td>${{live:'<span style="color:var(--bad)">● Đang ghi</span>', draft:"Nháp biên bản", confirmed:'<span style="color:var(--good)">Đã chốt</span>'}[m.status] || esc(m.status)}</td>
      <td>${ts.length ? `${ts.length} · <i class="dot3 d-green"></i>${hs.filter(k=>k==="green").length} <i class="dot3 d-amber"></i>${hs.filter(k=>k==="amber").length} <i class="dot3 d-red"></i>${hs.filter(k=>k==="red").length} <i class="dot3 d-done"></i>${hs.filter(k=>k==="done").length}` : "—"}</td>
      <td>${m.status === "confirmed" ? sg + "/" + (m.people||[]).length : "—"}</td><td><button type="button" data-mtg="${esc(m.id)}">Mở biên bản</button></td></tr>`; }).join("")}</tbody></table>` : '<p class="muted">Chưa có cuộc họp. Mở Ben → tab “Thư ký họp” để bắt đầu.</p>';
}
function renderChanges(){
  const cs = [...S.changes].reverse().slice(0, 120);
  $("opsChanges").innerHTML = cs.length ? `<table class="tasktbl"><thead><tr><th>Thời điểm</th><th>Người sửa</th><th>Qua</th><th>Đối tượng</th><th>Chỉ tiêu</th><th>Trước → sau</th></tr></thead><tbody>${cs.map(c => `<tr${c.undone ? ' style="opacity:.5"' : ""}><td class="small">${vnTime(c.at)}</td><td>${esc(who(c.by))}</td><td>${esc(c.via||"")}</td><td>${esc(c.kind === "dealer" ? "Đại lý " + (c.name||"") : c.key)}</td><td>${esc(c.kind === "dealer" ? DLABEL[c.field] || c.field : (PF.find(p => p[0] === c.field) || [0,c.field])[1])}</td><td class="num">${c.before == null ? "trống" : esc(String(c.before))} → <b>${esc(String(c.after))}</b>${c.undone ? " (đã hoàn tác)" : ""}</td></tr>`).join("")}</tbody></table>` : '<p class="muted">Chưa có thay đổi dữ liệu bản đồ nào qua Ben.</p>';
}

/* ---------- task dialog ---------- */
let dlgTask = null, dlgDirty = false, dlgNew = false;
function openTask(t, isNew){ dlgTask = JSON.parse(JSON.stringify(t)); dlgNew = !!isNew; dlgDirty = !!isNew; drawTask(); const d = $("taskDlg"); if(!d.open) d.showModal(); }
function fld(label, html, cls){ return `<label class="field ${cls||""}">${label}${html}</label>`; }
function drawTask(){
  const t = dlgTask, h = health(t), D = dod(t), k = t.kpi || {}, cf = confirmsOf(t.id);
  $("taskDlgT").textContent = dlgNew ? "Giao đầu việc mới" : "Đầu việc · " + (t.title || "");
  $("taskHealth").innerHTML = `<i class="dot3 ${HL[h.k][1]}"></i>${HL[h.k][0]}`;
  const opt = (arr, v) => arr.map(x => `<option${x === v ? " selected" : ""}>${esc(x)}</option>`).join("");
  const mtg = S.meetings[t.meetingId];
  $("taskBody").innerHTML = `
  <div class="fgrid">
    ${fld("Tên đầu việc (kết quả cần đạt)", `<input type="text" data-f="title" value="${esc(t.title)}">`, "w4")}
    ${fld("Người chịu trách nhiệm chính (1 người)", `<input type="text" data-f="owner" value="${esc(t.owner)}" placeholder="Họ tên – chức danh">`, "w2")}
    ${fld("Phòng ban", `<select data-f="dept">${opt(DEPTS, t.dept)}</select>`)}
    ${fld("Ưu tiên", `<select data-f="priority">${opt(["P1","P2","P3"], t.priority)}</select>`)}
    <div class="field w4">Phòng ban phối hợp / phải xác nhận kết quả<div class="chips">${DEPTS.filter(x => x !== t.dept).map(x => `<label class="chip" style="text-transform:none;letter-spacing:0"><input type="checkbox" data-co="${esc(x)}"${(t.coDepts||[]).includes(x) ? " checked" : ""}> ${esc(x)}</label>`).join("")}</div></div>
    ${fld("Chỉ số đo kết quả (KPI)", `<input type="text" data-k="name" value="${esc(k.name)}" placeholder="VD: Số xe bán lẻ Vùng 9 tháng 11">`, "w2")}
    ${fld("Đơn vị", `<input type="text" data-k="unit" value="${esc(k.unit)}" placeholder="xe, %, tr đ">`)}
    ${fld("Chiều đạt", `<select data-k="dir"><option value="up"${k.dir !== "down" ? " selected" : ""}>Thực tế ≥ mục tiêu</option><option value="down"${k.dir === "down" ? " selected" : ""}>Thực tế ≤ mục tiêu</option></select>`)}
    ${fld("Đầu kỳ", `<input type="number" data-k="base" value="${esc(k.base)}">`)}
    ${fld("Mục tiêu", `<input type="number" data-k="target" value="${esc(k.target)}">`)}
    ${fld("Thực tế hiện tại", `<input type="number" data-k="actual" value="${esc(k.actual)}">`)}
    ${fld("Trạng thái", `<select data-f="status">${Object.entries(STATUS).map(([v,l]) => `<option value="${v}"${t.status === v ? " selected" : ""}${v === "done" ? " disabled" : ""}>${l}</option>`).join("")}</select>`)}
    ${fld("Bằng chứng bắt buộc khi hoàn thành", `<input type="text" data-f="evidenceReq" value="${esc(t.evidenceReq)}" placeholder="VD: Báo cáo ERP xuất ngày, hợp đồng, hóa đơn, ảnh bàn giao xe">`, "w4")}
    ${fld("Bắt đầu", `<input type="date" data-f="start" value="${esc(t.start)}">`)}
    ${fld("Hạn hoàn thành", `<input type="date" data-f="due" value="${esc(t.due)}">`)}
    ${fld("Thời lượng", `<input type="text" readonly value="${t.start && t.due ? dd(t.start, t.due) + " ngày · " + (wd(t.start, t.due) + 1) + " ngày làm việc" : ""}">`)}
    ${fld("Giờ công ước tính", `<input type="number" data-f="effortH" value="${esc(t.effortH)}" min="0">`)}
    ${fld("Việc làm ngay trong 24 giờ", `<input type="text" data-f="firstStep" value="${esc(t.firstStep)}">`, "w4")}
  </div>
  ${mtg ? `<p class="muted small">Từ cuộc họp: <b>${esc(mtg.title)}</b> (${vnTime(mtg.startedAt)}), chủ trì ${esc(mtg.host||"")}.</p>` : ""}
  ${dlgNew ? "" : `
  <h3 style="margin-top:14px">Điều kiện nghiệm thu (đạt chuẩn Ban Lãnh đạo)</h3>
  <div class="dod">${[[D.hasT ? D.kpiOk : !!k.name, D.hasT ? "KPI đạt mục tiêu" : "Có chỉ số đo"], [D.ev, "Có bằng chứng"], [D.cfOk, D.missing.length ? "Chờ xác nhận: " + D.missing.join(", ") : "Đủ xác nhận liên phòng"], [D.blk, "Không còn điểm nghẽn"]].map(([ok,l]) => `<span class="${ok ? "ok" : "no"}">${ok ? "✓" : "✗"} ${esc(l)}</span>`).join("")}</div>
  ${h.reasons.length ? `<p class="small" style="color:${h.k === "red" ? "var(--bad)" : "var(--warn)"}">${esc(h.reasons.join(" · "))}</p>` : ""}
  <div class="opsgrid">
    <div>
      <h3>Cập nhật hôm nay ${vnDate(ymd())}</h3>
      <div class="fgrid" style="margin-top:6px">
        ${fld("Tiến độ %", `<input type="number" id="ciP" min="0" max="100" value="${+t.progress||0}">`)}
        ${fld("Số thực tế KPI", `<input type="number" id="ciA" value="${esc(k.actual)}">`)}
        ${fld("Đã làm hôm nay (có số liệu)", `<input type="text" id="ciNote" placeholder="VD: Ký 3 HĐ IZ65, giao 2 xe">`, "w2")}
        ${fld("Kế hoạch ngày mai", `<input type="text" id="ciNext">`, "w2")}
        ${fld("Điểm nghẽn mới (nếu có)", `<input type="text" id="ciBlk" placeholder="Nêu rõ nghẽn ở đâu, ai gỡ được">`, "w2")}
        <label class="field w2"><span><input type="checkbox" id="ciSup"${t.support && t.support.open ? " checked" : ""}> Cần lãnh đạo hỗ trợ</span><input type="text" id="ciSupT" value="${esc(t.support && t.support.open ? t.support.text || "" : "")}" placeholder="Cần hỗ trợ gì, từ ai, trước khi nào"></label>
      </div>
      <div class="toolbar"><button type="button" class="primary" id="ciSave">Cập nhật hôm nay</button></div>
      <h3>Bằng chứng</h3>
      <ul class="tl">${(t.evidence||[]).map(e => `<li>${e.kind === "file" ? `📎 <a href="${esc("/_blob/" + e.assetId)}" target="_blank" rel="noopener">${esc(e.name || "tệp")}</a>` : e.kind === "link" ? `🔗 <a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${esc(e.url)}</a>` : "📝"} ${esc(e.note||"")} <span class="muted tiny">· ${esc(who(e.by))} · ${vnTime(e.at)}</span></li>`).join("") || '<li class="muted">Chưa có.</li>'}</ul>
      <div class="fgrid">${fld("Đường dẫn (ERP, Drive, ảnh…)", `<input type="url" id="evUrl" placeholder="https://">`, "w2")}${fld("Mô tả", `<input type="text" id="evNote" placeholder="Bằng chứng chứng minh điều gì">`, "w2")}</div>
      <div class="toolbar"><button type="button" id="evAdd">Thêm bằng chứng</button>${assets ? `<label class="chip" style="cursor:pointer">Tải tệp lên<input type="file" id="evFile" hidden accept="image/*,video/*,application/pdf,text/csv,text/plain,application/json"></label>` : ""}</div>
    </div>
    <div>
      <h3>Xác nhận liên phòng</h3>
      <ul class="tl">${(t.coDepts||[]).map(dp => { const c = cf.filter(x => x.dept === dp); return `<li><b>${esc(dp)}</b>: ${c.length ? c.map(x => `${x.ok ? '<span style="color:var(--good)">Đạt</span>' : '<span style="color:var(--bad)">Chưa đạt</span>'} · ${esc(who(x.uid))} · ${vnTime(x.at)}${x.note ? " · " + esc(x.note) : ""}`).join("; ") : '<span class="muted">chưa xác nhận</span>'}</li>`; }).join("") || '<li class="muted">Không yêu cầu xác nhận liên phòng.</li>'}</ul>
      ${(t.coDepts||[]).length ? `<div class="fgrid">${fld("Tôi xác nhận cho phòng", `<select id="cfDept">${opt(t.coDepts, t.coDepts[0])}</select>`, "w2")}${fld("Ghi chú", `<input type="text" id="cfNote">`, "w2")}</div><div class="toolbar"><button type="button" id="cfOk">Xác nhận đạt</button><button type="button" id="cfNo">Chưa đạt</button></div><p class="muted tiny">Xác nhận lưu dưới tài khoản người bấm, người khác không sửa được.</p>` : ""}
      <h3>Điểm nghẽn</h3>
      <ul class="tl">${(t.blockers||[]).map((b,i) => `<li>${b.resolved ? "✅" : "⛔"} ${esc(b.text)} <span class="muted tiny">· từ ${vnTime(b.since)}${b.resolved ? " · xử lý " + vnTime(b.resolvedAt) + ": " + esc(b.resolution||"") : ""}</span>${b.resolved ? "" : ` <button type="button" data-blk="${i}">Đã xử lý dứt điểm</button>`}</li>`).join("") || '<li class="muted">Không có.</li>'}</ul>
      <h3>Nhật ký cập nhật</h3>
      <ul class="tl">${[...(t.checkins||[])].reverse().slice(0,20).map(c => `<li><b>${vnDate(c.d)}</b> · ${c.p}%${c.a !== "" && c.a != null ? " · KPI " + esc(String(c.a)) : ""} · ${esc(c.note||"")}${c.next ? ' <span class="muted">→ mai: ' + esc(c.next) + "</span>" : ""} <span class="muted tiny">· ${esc(who(c.by))}</span></li>`).join("") || '<li class="muted">Chưa có cập nhật.</li>'}
        ${[...(t.log||[])].reverse().slice(0,12).map(l => `<li class="muted tiny">${vnTime(l.at)} · ${esc(who(l.by))} · ${esc(l.act)}</li>`).join("")}</ul>
      ${(t.kudos||[]).length ? `<p class="small">🏅 Được ghi nhận ${t.kudos.length} lần.</p>` : ""}
    </div>
  </div>`}`;
  const foot = [`<button type="button" class="primary" id="tSave">${dlgNew ? "Giao việc" : "Lưu thay đổi"}</button>`];
  if(!dlgNew){
    if(t.status !== "done" && t.status !== "review") foot.push(`<button type="button" id="tReview">Gửi nghiệm thu</button>`);
    if(t.status === "review" || (t.status !== "done" && D.all)) foot.push(`<button type="button" id="tAccept"${D.all && canAdmin ? "" : " disabled"} title="${canAdmin ? "Cần đủ điều kiện nghiệm thu" : "Chỉ Host/lãnh đạo (quyền Editor) nghiệm thu"}">Nghiệm thu đạt chuẩn</button>`);
    if(t.status === "review" && canAdmin) foot.push(`<button type="button" id="tBack">Trả lại để bổ sung</button>`);
    if(t.status === "done") foot.push(`<button type="button" id="tKudos">🏅 Ghi nhận</button>`);
    foot.push(`<button type="button" id="tAi">Ben phân tích việc này</button>`);
    if(canAdmin) foot.push(`<button type="button" id="tDel" style="margin-left:auto">Xóa</button>`);
  }
  $("taskFoot").innerHTML = foot.join("");
}
function readForm(){
  const t = dlgTask, b = $("taskBody");
  b.querySelectorAll("[data-f]").forEach(el => { if(el.readOnly) return; t[el.dataset.f] = el.value; });
  t.kpi = t.kpi || {}; b.querySelectorAll("[data-k]").forEach(el => { t.kpi[el.dataset.k] = el.value; });
  t.coDepts = [...b.querySelectorAll("[data-co]")].filter(x => x.checked).map(x => x.dataset.co);
  t.title = t.title.trim(); t.owner = t.owner.trim();
}
$("taskBody").addEventListener("input", e => { if(e.target.closest("[data-f],[data-k],[data-co]")) dlgDirty = true; });
$("taskDlg").addEventListener("close", () => { dlgDirty = false; dlgTask = null; });
$("taskDlg").addEventListener("click", async e => {
  if(e.target.closest("[data-close]")) return $("taskDlg").close();
  const id = e.target.id, t = dlgTask; if(!t) return;
  if(id === "tSave"){ readForm(); const miss = [!t.title && "tên việc", !t.owner && "người chịu trách nhiệm", !t.due && "hạn hoàn thành", !(t.kpi||{}).name && "chỉ số đo", !t.evidenceReq && "bằng chứng bắt buộc"].filter(Boolean);
    if(miss.length) return toast("Ban lãnh đạo yêu cầu đủ: " + miss.join(", "));
    if(t.due < t.start) return toast("Hạn phải sau ngày bắt đầu");
    if(t.status === "done") t.status = S.tasks[t.id] ? S.tasks[t.id].status : "todo";
    if(await saveTask(t, dlgNew ? "Giao việc" : "Sửa thông tin")){ toast(dlgNew ? "Đã giao việc" : "Đã lưu"); dlgNew = false; dlgDirty = false; drawTask(); } return; }
  if(id === "ciSave"){ readForm(); const p = Math.max(0, Math.min(100, +$("ciP").value || 0)), a = $("ciA").value, note = $("ciNote").value.trim();
    if(!note) return toast("Ghi rõ hôm nay đã làm gì, có số liệu");
    const td = ymd(); t.checkins = (t.checkins || []).filter(c => !(c.d === td && c.by === meId())).concat([{d: td, p, a, note, next: $("ciNext").value.trim(), by: meId(), at: nowIso()}]);
    t.progress = p; if(a !== "") t.kpi.actual = a; if(t.status === "todo" && p > 0) t.status = "doing";
    const bk = $("ciBlk").value.trim(); if(bk) t.blockers = (t.blockers || []).concat([{text: bk, since: nowIso(), by: meId(), resolved: false}]);
    const sup = $("ciSup").checked; if(sup) t.support = {open: true, text: $("ciSupT").value.trim(), at: (t.support && t.support.open && t.support.at) || nowIso(), by: meId(), takenBy: t.support && t.support.open ? t.support.takenBy || null : null};
    else if(t.support && t.support.open) t.support = {...t.support, open: false, closedAt: nowIso()};
    if(await saveTask(t, `Cập nhật ${p}%`)){ dlgDirty = false; toast("Đã cập nhật hôm nay"); drawTask(); } return; }
  if(id === "evAdd"){ const url = $("evUrl").value.trim(), note = $("evNote").value.trim(); if(!url && !note) return toast("Nhập đường dẫn hoặc mô tả bằng chứng");
    if(url && !/^https?:\/\//i.test(url)) return toast("Đường dẫn phải bắt đầu bằng http(s)://");
    t.evidence = (t.evidence || []).concat([{kind: url ? "link" : "note", url, note, by: meId(), at: nowIso()}]); if(await saveTask(t, "Thêm bằng chứng")) drawTask(); return; }
  if(id === "cfOk" || id === "cfNo"){ const dept = $("cfDept").value, note = $("cfNote").value.trim(), ok = id === "cfOk";
    if(!ok && !note) return toast("Ghi rõ vì sao chưa đạt để bên thực hiện khắc phục");
    if(await writeSignoff(s => { s.confirms = s.confirms || {}; s.confirms[t.id] = {dept, ok, note, at: nowIso()}; })){ toast("Đã ghi xác nhận của " + dept); setTimeout(drawTask, 300); } return; }
  const bi = e.target.dataset && e.target.dataset.blk; if(bi != null){ const res = await ask("Đã xử lý dứt điểm như thế nào? (kết quả, bằng chứng)", {required:true}); if(!res) return;
    t.blockers[+bi] = {...t.blockers[+bi], resolved: true, resolvedAt: nowIso(), resolution: res, resolvedBy: meId()}; if(await saveTask(t, "Gỡ điểm nghẽn")) drawTask(); return; }
  if(id === "tReview"){ readForm(); t.status = "review"; t.reviewAt = nowIso(); if(await saveTask(t, "Gửi nghiệm thu")){ toast("Đã gửi nghiệm thu"); drawTask(); } return; }
  if(id === "tAccept"){ if(!dod(t).all) return; t.status = "done"; t.progress = 100; t.acceptedAt = nowIso(); t.acceptedBy = meId(); if(t.support) t.support.open = false; if(await saveTask(t, "Nghiệm thu đạt chuẩn")){ toast("Đã nghiệm thu"); drawTask(); } return; }
  if(id === "tBack"){ const why = await ask("Cần bổ sung gì để đạt chuẩn nghiệm thu?", {required:true}); if(!why) return; t.status = "doing"; t.blockers = (t.blockers||[]).concat([{text: "Nghiệm thu trả lại: " + why, since: nowIso(), by: meId(), resolved: false}]); if(await saveTask(t, "Trả lại: " + why)) drawTask(); return; }
  if(id === "tKudos"){ t.kudos = (t.kudos || []).concat([{by: meId(), at: nowIso()}]); if(await saveTask(t, "Ghi nhận")){ toast("Đã ghi nhận"); drawTask(); } return; }
  if(id === "tDel"){ if(!(await ask("Xóa hẳn đầu việc này? Lịch sử cập nhật cũng mất.", {confirm:true}))) return; await put("tasks/" + t.id, null); $("taskDlg").close(); return; }
  if(id === "tAi"){ $("taskDlg").close(); CV.askAi(`Phân tích đầu việc "${t.title}" (id ${t.id}) bằng công cụ list_tasks: tiến độ thực so với kỳ vọng, rủi ro trễ, điểm nghẽn, lãnh đạo nên hỗ trợ gì cụ thể trong 24 giờ tới, và câu hỏi coaching để người chịu trách nhiệm tự gỡ.`); }
});
$("taskBody").addEventListener("change", async e => {
  if(e.target.id !== "evFile" || !e.target.files[0]) return; const f = e.target.files[0], t = dlgTask;
  toast("Đang tải lên…");
  try{ const r = await assets.upload(f); t.evidence = (t.evidence || []).concat([{kind:"file", assetId: r.id, name: f.name, note: ($("evNote").value||"").trim(), by: meId(), at: nowIso()}]); if(await saveTask(t, "Tải bằng chứng " + f.name)) drawTask(); }
  catch(err){ toast("Không tải được tệp" + (err && err.code ? " (" + err.code + ")" : "")); }
});

/* ---------- meeting recorder ---------- */
let dict = null, dictMode = "", noLang = false, rec = null, recT = null, cmdT = null, partialTxt = "";
function meetForm(){ const v = id => ($(id) ? $(id).value.trim() : ""), L = id => v(id).split("\n").map(s => s.trim()).filter(Boolean);
  return {title: v("mTitle") || "Cuộc họp " + vnDate(ymd()), host: v("mHost"), people: L("mPeople"), absent: L("mAbsent"), goal: v("mGoal"), reason: v("mReason"), place: v("mPlace"), form: v("mForm") || "Trực tiếp", agenda: L("mAgenda"), unit: v("mUnit") || "ĐÔ THÀNH AUTO", secretary: v("mSec") || "Ben (trợ lý AI), ghi lời thoại tự động"}; }
function ensureMeeting(){
  if(rec) return rec; const f = meetForm(), id = gid("m");
  rec = {id, lines: [], part: 1, cur: [], dirty: false, t0: Date.now()};
  putMeeting({id, ...f, status: "live", startedAt: nowIso(), recorder: meId(), lineCount: 0});
  return rec;
}
const mLocal = {};
function meet(id){ return mLocal[id] || S.meetings[id]; }
function putMeeting(m){ const cur = meet(m.id) || {}; const x = {...cur, ...m, updatedAt: nowIso()}; mLocal[m.id] = x; if(mode === "local") S.meetings[m.id] = x; return put("meetings/" + m.id, x); }
function stamp(){ const s = Math.round((Date.now() - (rec ? rec.t0 : Date.now())) / 1000); return pad(Math.floor(s/60)) + ":" + pad(s%60); }
function addLine(text, tag){
  ensureMeeting(); text = String(text);
  const last = rec.lines[rec.lines.length-1], now = Date.now();
  if(!tag && last && /^\s/.test(text) && now - last.ms < 9000 && last.text.length < 320 && !last.tag){ last.text += text; last.ms = now; }
  else rec.lines.push({ts: stamp(), at: nowIso(), ms: now, text: text.trim(), tag: tag || ""});
  const L = rec.lines[rec.lines.length-1]; rec.dirty = true; drawScript();
  const m = L.text.match(/\bben\s*(?:ơi)?[,:\s]+(.{3,})$/i);
  if(m && !tag){ clearTimeout(cmdT); cmdT = setTimeout(() => { const q = m[1].trim(); L.tag = "Lệnh Ben"; drawScript(); runBen(q); }, 1800); }
}
function runBen(q){ const r = localCommand(q); if(r){ CV.addMsg("u", esc("🎙 " + q)); const b = CV.addMsg("a", ""); CV.finishBubble(b, r, false, "Ben"); toast("Ben: " + r.replace(/[*_`]/g, "").slice(0, 90)); }
  else { CV.openAi(true); CV.benTab("Chat"); CV.askAi(q); } }
function drawScript(){
  const el = $("mScript"); if(!rec){ return; }
  el.innerHTML = rec.lines.slice(-200).map((l,i,arr) => `<p><span class="tm">${l.ts}</span>${l.tag ? `<span class="tag ${TAGS[l.tag]||""}">${esc(l.tag)}</span>` : ""}${l.sp ? `<b>${esc(l.sp)}:</b> ` : ""}${esc(l.text)}</p>`).join("") + (partialTxt ? `<p class="partial">${esc(partialTxt)}</p>` : "");
  el.scrollTop = el.scrollHeight;
}
function flush(force){
  if(!rec || (!rec.dirty && !force)) return; rec.dirty = false;
  const start = (rec.part - 1) * 60, lines = rec.lines.slice(start, start + 60).map(({ms, ...l}) => l);
  put(`meetings/${rec.id}/parts/p${String(rec.part).padStart(3,"0")}`, {lines});
  if(rec.lines.length >= rec.part * 60){ rec.part++; if(rec.lines.length > (rec.part - 1) * 60) rec.dirty = true; }
  putMeeting({id: rec.id, lineCount: rec.lines.length});
}
function setRecUi(state, reason){
  const b = $("mRec"), on = dictMode === "meet" && state !== "idle";
  b.setAttribute("aria-pressed", on); b.textContent = on ? "■ Dừng ghi" : rec ? "● Ghi tiếp" : "● Bắt đầu ghi";
  $("mState").textContent = on ? (state === "listening" ? "● Đang ghi… nói “Ben ơi …” để ra lệnh" : "Đang mở micro…") : reason ? ({stopped:"Đã dừng ghi", viewer_stopped:"Đã dừng ghi", hidden:"Tạm dừng do chuyển cửa sổ, bấm Ghi tiếp", time_limit:"Hết phiên 60 phút, bấm Ghi tiếp", not_granted:"Micro chưa được cho phép", unavailable:"Chưa hỗ trợ ghi giọng nói ở đây", upstream_error:"Lỗi micro/dịch vụ, bấm Ghi tiếp", rate_limited:"Quá nhiều phiên ghi, thử lại sau"}[reason] || "Đã dừng") : rec ? `${rec.lines.length} câu đã ghi` : "Chưa ghi";
  const mic = $("aiMic"); if(mic) mic.setAttribute("aria-pressed", dictMode === "cmd" && state !== "idle");
}
function startDict(m){
  if(!dict){ toast(m === "meet" ? "Trình duyệt/thiết bị này chưa hỗ trợ ghi giọng nói: hãy gõ ghi chú tay" : "Chưa hỗ trợ nhập giọng nói ở đây (dùng Chrome hoặc ứng dụng Claude trên máy tính)"); return; }
  if(dict.active()){ if(dictMode === m){ dict.stop().catch(() => {}); } else toast(dictMode === "meet" ? "Đang ghi cuộc họp: nói “Ben ơi …” để ra lệnh" : "Đang nghe lệnh, bấm micro để dừng trước"); return; }
  dictMode = m; const p = dict.start(noLang ? undefined : {language: "vi"});
  if(m === "meet"){ ensureMeeting(); clearInterval(recT); recT = setInterval(() => flush(), 15000); if(meet(rec.id) && meet(rec.id).status !== "live") putMeeting({id: rec.id, status: "live"}); }
  p.catch(e => { const c = e && e.code; if(c === "unavailable" && !noLang){ noLang = true; toast("Bấm lại để ghi bằng ngôn ngữ mặc định của trình duyệt"); }
    else if(c === "not_granted") toast("Micro chưa được cho phép cho trang này"); else if(c && c !== "stopped" && c !== "dismissed") toast("Không mở được micro (" + c + ")"); });
}
function stopMeeting(){ if(dict && dict.active() && dictMode === "meet") dict.stop().catch(() => {}); flush(true); clearInterval(recT); if(rec) putMeeting({id: rec.id, status: meet(rec.id) && meet(rec.id).status === "confirmed" ? "confirmed" : "draft", endedAt: nowIso(), lineCount: rec.lines.length}); }
$("mRec").addEventListener("click", () => { if(dict && dict.active() && dictMode === "meet"){ stopMeeting(); return; } startDict("meet"); });
$("mNote").addEventListener("keydown", e => { if(e.key === "Enter"){ e.preventDefault(); $("mNoteAdd").click(); } });
$("mNoteAdd").addEventListener("click", () => { const v = $("mNote").value.trim(); if(!v) return; addLine(v); $("mNote").value = ""; flush(); });
document.querySelectorAll("#bMeet [data-tag]").forEach(b => b.addEventListener("click", () => { if(!rec || !rec.lines.length){ toast("Chưa có câu nào để đánh dấu"); return; } const l = rec.lines[rec.lines.length-1]; l.tag = b.dataset.tag; rec.dirty = true; drawScript(); }));
$("mOpen").addEventListener("click", () => { document.querySelector('[data-otab="M"]').click(); $("opsSec").scrollIntoView({behavior:"smooth"}); });
// chat microphone for commands
(function(){ const inBox = document.querySelector(".aiin"), send = $("aiSend"); if(!inBox || !send) return;
  const b = document.createElement("button"); b.type = "button"; b.id = "aiMic"; b.className = "mic"; b.title = "Ra lệnh bằng giọng nói"; b.setAttribute("aria-pressed","false"); b.setAttribute("aria-label","Ra lệnh bằng giọng nói"); b.textContent = "🎙"; b.hidden = true;
  inBox.insertBefore(b, send); b.addEventListener("click", () => startDict("cmd"));
  const ta = $("aiText"); if(ta) ta.placeholder = "Hỏi hoặc ra lệnh: “cập nhật doanh số Cần Thơ 480”, “mở Trường Vũ”, “bản tin hôm nay”, “giao việc … cho … hạn 30/11”";
})();

/* ---------- minutes: Ben drafting, host confirmation, export ---------- */
let minId = null, minMode = "view", draft = null;
async function meetingLines(id){
  if(rec && rec.id === id) return rec.lines;
  if(mode === "local") return Object.keys(S.parts[id] || {}).sort().flatMap(k => (S.parts[id][k] || {}).lines || []);
  try{ const s = await db.collection(`meetings/${id}/parts`).get(); return s.docs.map(d => [d.id, d.data()]).sort((a,b) => a[0].localeCompare(b[0])).flatMap(x => x[1].lines || []); }catch(e){ return []; }
}
/* transcript import: our local tool (.json), Whisper (.json/.srt/.vtt), Zoom/Teams/Meet (.vtt/.txt) */
function secTs(s){ s = Math.max(0, Math.round(+s || 0)); const h = Math.floor(s/3600), m = Math.floor(s%3600/60); return (h ? pad(h) + ":" : "") + pad(m) + ":" + pad(s%60); }
function splitSpeaker(t){ const m = String(t).match(/^\s*([^:：]{2,40}?)\s*[:：]\s+(.+)$/); return m && !/\d{2}:\d{2}/.test(m[1]) && m[1].split(/\s+/).length <= 6 ? {sp: m[1].trim(), text: m[2].trim()} : {sp: "", text: String(t).trim()}; }
function parseTranscript(raw, name){
  const txt = String(raw).replace(/^﻿/, ""), out = [];
  if(/\.json$/i.test(name) || /^\s*[\[{]/.test(txt)){
    try{ const j = JSON.parse(txt); const segs = Array.isArray(j) ? j : j.segments || j.lines || j.results || [];
      segs.forEach(s => { const t = String(s.text ?? s.transcript ?? "").trim(); if(!t) return; out.push({ts: s.ts || secTs(s.start ?? s.start_time ?? 0), sp: String(s.speaker ?? s.sp ?? "").trim(), text: t, tag: s.tag || ""}); });
      if(!out.length && j.text) String(j.text).split(/(?<=[.!?])\s+/).forEach(t => out.push({ts: "", sp: "", text: t}));
      return {lines: out, meta: j.meta || j.info || null};
    }catch(e){}
  }
  if(/-->/.test(txt)){
    txt.split(/\r?\n\r?\n+/).forEach(b => { const ls = b.split(/\r?\n/).map(s => s.trim()).filter(Boolean); const ti = ls.findIndex(l => /-->/.test(l)); if(ti < 0) return;
      const m = ls[ti].match(/(?:(\d+):)?(\d{1,2}):(\d{2})[.,]\d+/); const sec = m ? (+m[1]||0)*3600 + (+m[2])*60 + (+m[3]) : 0;
      let body = ls.slice(ti+1).join(" "), sp = ""; const v = body.match(/<v\s+([^>]+)>/); if(v) sp = v[1].trim(); body = body.replace(/<[^>]+>/g, "").trim(); if(!body) return;
      if(!sp){ const x = splitSpeaker(body); sp = x.sp; body = x.text; }
      const last = out[out.length-1]; if(last && last.sp === sp && last.text.length < 280 && !/[.!?]$/.test(last.text)) last.text += " " + body; else out.push({ts: secTs(sec), sp, text: body}); });
    return {lines: out, meta: null};
  }
  txt.split(/\r?\n/).forEach(l => { l = l.trim(); if(!l) return; let ts = ""; const m = l.match(/^\[?((?:\d{1,2}:)?\d{1,2}:\d{2})\]?\s*[-–]?\s*/); if(m){ ts = m[1]; l = l.slice(m[0].length); }
    const x = splitSpeaker(l); if(x.text) out.push({ts, sp: x.sp, text: x.text}); });
  return {lines: out, meta: null};
}
async function importTranscript(file){
  const raw = await file.text(), {lines, meta} = parseTranscript(raw, file.name);
  if(!lines.length) return toast("Không đọc được lời thoại trong file này");
  if(meta){ const set = (id, v) => { if(v && $(id) && !$(id).value) $(id).value = Array.isArray(v) ? v.join("\n") : v; };
    set("mTitle", meta.title); set("mHost", meta.host); set("mPeople", meta.people); set("mPlace", meta.place); set("mReason", meta.reason); set("mGoal", meta.goal); set("mAgenda", meta.agenda); }
  if(rec && dict && dict.active() && dictMode === "meet") stopMeeting();
  rec = null; ensureMeeting();
  rec.lines = lines.map(l => ({...l, at: nowIso(), ms: 0, tag: l.tag || ""}));
  const parts = Math.ceil(rec.lines.length / 60);
  for(let i = 1; i <= parts; i++){ const ls = rec.lines.slice((i-1)*60, i*60).map(({ms, ...l}) => l); await put(`meetings/${rec.id}/parts/p${String(i).padStart(3,"0")}`, {lines: ls}); }
  rec.part = parts + (rec.lines.length % 60 === 0 ? 1 : 0) || 1; rec.dirty = false;
  const sp = new Set(lines.map(l => l.sp).filter(Boolean));
  await putMeeting({id: rec.id, status: "draft", lineCount: rec.lines.length, source: file.name, speakers: [...sp], ...(meta && meta.startedAt ? {startedAt: meta.startedAt} : {}), ...(meta && meta.endedAt ? {endedAt: meta.endedAt} : {})});
  drawScript(); setRecUi("idle"); $("mState").textContent = `Đã nhập ${lines.length} câu${sp.size ? ", " + sp.size + " người nói" : ""} từ ${file.name}. Bấm “Ben tổng hợp & lập biên bản”.`;
}
$("mImport").addEventListener("change", e => { const f = e.target.files[0]; e.target.value = ""; if(f) importTranscript(f).catch(() => toast("Không đọc được file")); });

/* drafts */
const EMPTY = () => ({reason:"", summary:[], agendaItems:[], decisions:[], tasks:[], blockers:[], risks:[], openQuestions:[], nextMeeting:""});
function quickDraft(m, lines){
  const tg = k => lines.filter(l => l.tag === k).map(l => (l.sp ? l.sp + ": " : "") + l.text);
  return {...EMPTY(), reason: (m && m.reason) || "", summary: tg("Ý chính"), decisions: tg("Quyết định"), risks: tg("Rủi ro"),
    agendaItems: ((m && m.agenda) || []).map(a => ({item: a, summary: [], points: [], conclusion: ""})),
    blockers: tg("Điểm nghẽn").map(x => ({text: x, owner: "", due: addDays(ymd(), 3), solution: ""})),
    tasks: tg("Giao việc").map(x => { const o = (x.match(/(?:giao cho|cho|phụ trách|chịu trách nhiệm)[:\s]+([^,.;]+?)(?:\s+(?:hạn|trước|trong|làm|thực hiện)\b|[,.;]|$)/i) || [])[1] || "";
      return {title: x.slice(0,160), owner: o.trim(), dept: "Kinh doanh", coDepts: [], kpiName: "", kpiUnit: "", kpiBase: "", kpiTarget: "", kpiDir: "up", evidenceReq: "", start: ymd(), due: parseDue(x) || addDays(ymd(), 7), priority: "P2", firstStep: ""}; })};
}
function minutesPrompt(m, lines){
  let tx = lines.map(l => `[${l.ts || ""}]${l.tag ? " (" + l.tag + ")" : ""} ${l.sp ? l.sp + ": " : ""}${l.text}`).join("\n"); if(tx.length > 90000) tx = tx.slice(0, 20000) + "\n…\n" + tx.slice(-68000);
  return `Bạn là Ben, thư ký cuộc họp chuyên nghiệp của Đô Thành Auto, viết biên bản theo chuẩn tập đoàn lớn: khách quan, chính xác, ngắn gọn, có số liệu, ghi đúng ai nói gì, phân biệt rõ ý kiến thảo luận với kết luận đã chốt. Hôm nay ${vnDate(ymd())} (${ymd()}).
Lời thoại được nhận dạng tự động nên có thể sai chính tả: hiểu theo ngữ cảnh, không bịa số liệu hay tên người. Không biết ai nói thì để speaker rỗng.
Cuộc họp: ${m.title || ""}. Chủ trì: ${m.host || "chưa ghi"}. Địa điểm: ${m.place || "chưa ghi"} (${m.form || ""}). Lý do triệu tập: ${m.reason || "chưa ghi, hãy suy ra từ nội dung"}. Mục tiêu: ${m.goal || "chưa ghi"}.
Chương trình: ${(m.agenda || []).join(" | ") || "chưa có, hãy tự chia 2–6 mục theo diễn biến cuộc họp"}.
Thành phần: ${(m.people || []).join("; ") || "chưa ghi"}.
Phòng ban hợp lệ: ${DEPTS.join(", ")}.
Chuẩn của Ban Lãnh đạo cho MỖI đầu việc: một người chịu trách nhiệm chính; chỉ số đo bằng số (kpiName, kpiUnit, kpiTarget, kpiBase nếu biết); bằng chứng bắt buộc khi xong (evidenceReq: tài liệu/báo cáo/ảnh cụ thể, kiểm chứng được); phòng ban xác nhận kết quả (coDepts) nếu liên quan phòng khác; bắt đầu và hạn dạng YYYY-MM-DD (quy đổi "thứ sáu", "cuối tháng" theo hôm nay); việc làm ngay trong 24 giờ (firstStep). Thông tin cuộc họp chưa nói rõ thì ghi "CẦN CHỐT: ..." trong trường đó. Điểm nghẽn phải có người xử lý và hạn xử lý dứt điểm.
Chỉ trả về JSON:
{"reason":"lý do triệu tập (1–2 câu)","summary":["3–6 ý chính toàn cuộc họp, có số liệu"],
"agendaItems":[{"item":"tên mục chương trình","summary":["diễn biến, số liệu được trình bày"],"points":[{"speaker":"tên hoặc rỗng","text":"ý kiến/đề xuất"}],"conclusion":"kết luận của chủ trì cho mục này"}],
"decisions":["quyết định/kết luận đã chốt, viết thành câu mệnh lệnh rõ ràng"],
"tasks":[{"title","owner","dept","coDepts":[],"kpiName","kpiUnit","kpiBase","kpiTarget","kpiDir":"up|down","evidenceReq","start","due","priority":"P1|P2|P3","firstStep"}],
"blockers":[{"text","owner","due","solution"}],"risks":[],"openQuestions":[],"nextMeeting":"thời gian, nội dung cuộc họp tiếp theo nếu có"}

LỜI THOẠI:
${tx}`;
}
async function benDraft(){
  if(!rec){ toast("Chưa có cuộc họp. Bấm Bắt đầu ghi, gõ ghi chú hoặc nhập lời thoại từ file"); return; }
  flush(true); const lines = rec.lines; if(!lines.length) return toast("Chưa có nội dung cuộc họp");
  const m = {...(meet(rec.id) || {}), ...meetForm(), id: rec.id}; putMeeting(meetForm() && {id: rec.id, ...meetForm()});
  const sample = CV.sample; if(!sample){ toast("Ben AI chỉ chạy khi mở trong Claude: em lập nhanh từ đánh dấu"); return openMinutes(m.id, quickDraft(m, lines)); }
  $("mState").textContent = "Ben đang tổng hợp biên bản…"; $("mSum").disabled = true;
  try{ const j = await sample.json(minutesPrompt(m, lines), {modelTier: "default"}); openMinutes(m.id, normDraft(j)); $("mState").textContent = "Đã lập biên bản nháp, Host rà soát và chốt"; }
  catch(e){ toast(e && e.code === "rate_limited" ? "Đang vượt giới hạn, thử lại sau ít phút" : "Ben chưa tổng hợp được, em lập nhanh từ đánh dấu"); openMinutes(m.id, quickDraft(m, lines)); $("mState").textContent = ""; }
  finally{ $("mSum").disabled = false; }
}
function normDraft(j){ j = j || {}; const A = x => Array.isArray(x) ? x.map(v => typeof v === "string" ? v : JSON.stringify(v)) : [];
  const D = v => /^\d{4}-\d\d-\d\d$/.test(v || "") ? v : "", N0 = v => v === "" || v == null || isNaN(+v) ? "" : +v;
  return {reason: String(j.reason || ""), summary: A(j.summary), decisions: A(j.decisions), risks: A(j.risks), openQuestions: A(j.openQuestions), nextMeeting: String(j.nextMeeting || ""),
    agendaItems: (Array.isArray(j.agendaItems) ? j.agendaItems : []).map(a => ({item: String(a.item || ""), summary: A(a.summary), points: (Array.isArray(a.points) ? a.points : []).map(p => ({speaker: String(p.speaker || ""), text: String(p.text || "")})).filter(p => p.text), conclusion: String(a.conclusion || "")})),
    blockers: (Array.isArray(j.blockers) ? j.blockers : []).map(b => ({text: String(b.text||""), owner: String(b.owner||""), due: D(b.due) || addDays(ymd(), 3), solution: String(b.solution||"")})),
    tasks: (Array.isArray(j.tasks) ? j.tasks : []).map(t => ({title: String(t.title||""), owner: String(t.owner||""), dept: DEPTS.includes(t.dept) ? t.dept : "Kinh doanh", coDepts: (Array.isArray(t.coDepts) ? t.coDepts : []).filter(x => DEPTS.includes(x)),
      kpiName: String(t.kpiName||""), kpiUnit: String(t.kpiUnit||""), kpiBase: N0(t.kpiBase), kpiTarget: N0(t.kpiTarget), kpiDir: t.kpiDir === "down" ? "down" : "up",
      evidenceReq: String(t.evidenceReq||""), start: D(t.start) || ymd(), due: D(t.due) || addDays(ymd(), 7), priority: ["P1","P2","P3"].includes(t.priority) ? t.priority : "P2", firstStep: String(t.firstStep||"")}))}; }
$("mSum").addEventListener("click", benDraft);
$("mLocal").addEventListener("click", () => { if(!rec || !rec.lines.length) return toast("Chưa có nội dung cuộc họp"); flush(true); openMinutes(rec.id, quickDraft({...meet(rec.id), ...meetForm()}, rec.lines)); });

function openMinutes(id, newDraft){
  minId = id; const m = meet(id) || {};
  if(newDraft){ draft = {...EMPTY(), ...newDraft}; minMode = "edit"; putMeeting({id, draft, status: m.status === "confirmed" ? "confirmed" : m.status === "live" ? "live" : "draft"}); }
  else { draft = {...EMPTY(), ...JSON.parse(JSON.stringify(m.minutes || m.draft || {}))}; minMode = m.status === "confirmed" ? "view" : "edit"; }
  drawMinutes(); const d = $("minDlg"); if(!d.open) d.showModal();
}

/* minutes model shared by the on-screen paper, .html, .md and .docx */
let paperLogo = null;
const LOGO = () => { const im = document.querySelector(".brand-logo"); if(!im) return null; const w = im.naturalWidth || 400, h = im.naturalHeight || 100;
  if(!paperLogo){ try{ const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const c = cv.getContext("2d"); c.drawImage(im, 0, 0, w, h);
    const d = c.getImageData(0, 0, w, h), p = d.data; for(let i = 0; i < p.length; i += 4){ p[i] = 11; p[i+1] = 58; p[i+2] = 110; } c.putImageData(d, 0, 0); paperLogo = cv.toDataURL("image/png"); }catch(e){ paperLogo = im.src; } }
  return {src: paperLogo, w, h}; };
function hhmm(iso){ const d = new Date(iso); return isNaN(d) ? "…" : pad(d.getHours()) + " giờ " + pad(d.getMinutes()); }
function dayLong(iso){ const d = new Date(iso || Date.now()); return `ngày ${pad(d.getDate())} tháng ${pad(d.getMonth()+1)} năm ${d.getFullYear()}`; }
function city(place){ const p = String(place || ""); const m = p.match(/(TP\.?\s*Hồ Chí Minh|Hà Nội|Đà Nẵng|Cần Thơ|Hải Phòng|Huế|[A-ZĐ][^,]{2,25})\s*$/); return m ? m[1].trim() : "TP. Hồ Chí Minh"; }
function model(m, dr, withStatus){
  const ts = withStatus ? (m.taskIds || []).map(id => S.tasks[id]).filter(Boolean) : [];
  const tasks = ts.length ? ts.map(t => ({title:t.title, owner:t.owner, dept:t.dept, coDepts:t.coDepts||[], kpi: (t.kpi||{}).name ? (t.kpi.name + ((t.kpi.target !== "" && t.kpi.target != null) ? ": " + fmtInt(+t.kpi.target) + " " + (t.kpi.unit||"") : "")) : "", evidenceReq:t.evidenceReq, start:t.start, due:t.due, priority:t.priority, st: STATUS[t.status] + " · " + (+t.progress||0) + "%"}))
    : (dr.tasks || []).map(t => ({...t, kpi: t.kpiName ? t.kpiName + (t.kpiTarget !== "" && t.kpiTarget != null ? ": " + t.kpiTarget + " " + (t.kpiUnit||"") : "") : "", st: "Chưa thực hiện"}));
  const sg = Object.entries(S.signoffs).filter(([,s]) => s && (s.meetings||{})[m.id]).map(([uid,s]) => ({who: who(uid), at: vnTime(s.meetings[m.id].at), note: s.meetings[m.id].note || ""}));
  const num = "BB-" + String(m.startedAt || nowIso()).slice(0,10).replace(/-/g,"") + "-" + String(m.id || "").slice(-4).toUpperCase();
  return {unit: m.unit || "ĐÔ THÀNH AUTO", num, city: city(m.place), date: dayLong(m.startedAt), title: m.title || "Cuộc họp", start: m.startedAt ? hhmm(m.startedAt) + ", " + dayLong(m.startedAt) : "…", end: m.endedAt ? hhmm(m.endedAt) : "…",
    place: m.place || "…", form: m.form || "Trực tiếp", host: m.host || "…", secretary: m.secretary || "Ben (trợ lý AI), ghi lời thoại tự động", people: m.people || [], absent: m.absent || [],
    reason: dr.reason || m.reason || "", goal: m.goal || "", agenda: (m.agenda && m.agenda.length ? m.agenda : (dr.agendaItems || []).map(a => a.item)).filter(Boolean),
    summary: dr.summary || [], items: dr.agendaItems || [], decisions: dr.decisions || [], tasks, blockers: (dr.blockers || []).filter(b => b.text), risks: dr.risks || [], open: dr.openQuestions || [], next: dr.nextMeeting || "",
    confirmedAt: m.confirmedAt ? vnTime(m.confirmedAt) : "", confirmedBy: m.confirmedBy ? who(m.confirmedBy) : "", sg, lines: m.lineCount || 0, source: m.source || ""};
}
const SEC = ["I","II","III","IV","V","VI","VII","VIII","IX","X"];
function minutesHtml(M){
  const L = LOGO(), e = esc, li = a => a.map(x => `<li>${e(x)}</li>`).join("");
  return `<div class="bb">
<table class="bbhd"><tr><td class="l">${L ? `<img src="${L.src}" alt="Logo">` : ""}<div class="unit">${e(M.unit)}</div></td><td class="r"><div>Số: ${e(M.num)}</div><div><i>${e(M.city)}, ${e(M.date)}</i></div></td></tr></table>
<h1>BIÊN BẢN CUỘC HỌP</h1><p class="vv">V/v: ${e(M.title)}</p>
<h2>I. THÔNG TIN CHUNG</h2>
<table class="bbinfo"><tr><th>Thời gian</th><td>Bắt đầu ${e(M.start)}; kết thúc ${e(M.end)}</td></tr><tr><th>Địa điểm</th><td>${e(M.place)}</td></tr><tr><th>Hình thức</th><td>${e(M.form)}</td></tr>
<tr><th>Chủ trì</th><td>${e(M.host)}</td></tr><tr><th>Thư ký</th><td>${e(M.secretary)}</td></tr><tr><th>Thành phần (${M.people.length})</th><td>${M.people.map(e).join("<br>") || "…"}</td></tr>${M.absent.length ? `<tr><th>Vắng mặt</th><td>${M.absent.map(e).join("<br>")}</td></tr>` : ""}</table>
<h2>II. LÝ DO VÀ MỤC TIÊU CUỘC HỌP</h2><p><b>Lý do:</b> ${e(M.reason || "…")}</p>${M.goal ? `<p><b>Mục tiêu:</b> ${e(M.goal)}</p>` : ""}
<h2>III. CHƯƠNG TRÌNH</h2>${M.agenda.length ? `<ol>${li(M.agenda)}</ol>` : "<p>…</p>"}
<h2>IV. NỘI DUNG CHÍNH</h2>${M.summary.length ? `<p><b>Tóm tắt:</b></p><ul>${li(M.summary)}</ul>` : ""}
${M.items.map((a,i) => `<h3>${i+1}. ${e(a.item)}</h3>${a.summary.length ? `<ul>${li(a.summary)}</ul>` : ""}${a.points.length ? `<p><b>Ý kiến:</b></p><ul>${a.points.map(p => `<li>${p.speaker ? `<b>${e(p.speaker)}:</b> ` : ""}${e(p.text)}</li>`).join("")}</ul>` : ""}${a.conclusion ? `<p><b>Kết luận:</b> ${e(a.conclusion)}</p>` : ""}`).join("")}
<h2>V. KẾT LUẬN CỦA CHỦ TRÌ</h2>${M.decisions.length ? `<ol>${li(M.decisions)}</ol>` : "<p>…</p>"}
<h2>VI. PHÂN CÔNG THỰC HIỆN</h2>
<table class="bbt"><thead><tr><th>STT</th><th>Nội dung công việc</th><th>Người chịu trách nhiệm</th><th>Phối hợp / xác nhận</th><th>Chỉ số – mục tiêu</th><th>Bằng chứng hoàn thành</th><th>Hạn</th><th>Trạng thái</th></tr></thead><tbody>
${M.tasks.map((t,i) => `<tr><td>${i+1}</td><td>${e(t.title)}${t.priority ? ` <small>(${e(t.priority)})</small>` : ""}</td><td>${e(t.owner)}<br><small>${e(t.dept)}</small></td><td>${e((t.coDepts||[]).join(", ") || "—")}</td><td>${e(t.kpi || "—")}</td><td>${e(t.evidenceReq || "—")}</td><td>${vnDate(t.due)}<br><small>${t.start && t.due ? dd(t.start, t.due) + " ngày" : ""}</small></td><td>${e(t.st)}</td></tr>`).join("") || `<tr><td colspan="8">Không có</td></tr>`}</tbody></table>
<h2>VII. ĐIỂM NGHẼN PHẢI XỬ LÝ DỨT ĐIỂM</h2>${M.blockers.length ? `<ul>${M.blockers.map(b => `<li><b>${e(b.text)}</b> · xử lý: ${e(b.owner || "…")} · hạn ${vnDate(b.due)}${b.solution ? " · phương án: " + e(b.solution) : ""}</li>`).join("")}</ul>` : "<p>Không có.</p>"}
<h2>VIII. RỦI RO VÀ VẤN ĐỀ CHƯA CHỐT</h2>${M.risks.length || M.open.length ? `<ul>${M.risks.map(x => `<li>Rủi ro: ${e(x)}</li>`).join("")}${M.open.map(x => `<li>Chưa chốt: ${e(x)}</li>`).join("")}</ul>` : "<p>Không có.</p>"}
<h2>IX. THEO DÕI THỰC HIỆN</h2><ul><li>Người chịu trách nhiệm cập nhật tiến độ, số liệu thực tế mỗi ngày làm việc trên Trung tâm điều hành.</li><li>Cảnh báo sớm khi chậm từ 10 điểm % so với kỳ vọng, 2 ngày không cập nhật hoặc điểm nghẽn tồn từ 2 ngày; lãnh đạo hỗ trợ trong 24 giờ.</li><li>Chỉ nghiệm thu khi chỉ số đạt mục tiêu, có bằng chứng kiểm chứng được, các phòng liên quan xác nhận và không còn điểm nghẽn.</li>${M.next ? `<li>Cuộc họp tiếp theo: ${e(M.next)}</li>` : ""}</ul>
<p>Cuộc họp kết thúc lúc ${e(M.end)}. Biên bản đã được thông qua trước các thành phần tham dự${M.confirmedAt ? ", Host chốt lúc " + e(M.confirmedAt) : ""}.</p>
<table class="bbsig"><tr><td><b>THƯ KÝ</b><br><i>(Ký, ghi rõ họ tên)</i><br><br><br><br>${e(M.secretary.split(",")[0])}</td><td><b>CHỦ TRÌ</b><br><i>(Ký, ghi rõ họ tên)</i><br><br><br><br>${e(M.host)}</td></tr></table>
${M.sg.length ? `<p class="xn"><b>Xác nhận điện tử của thành phần tham dự:</b> ${M.sg.map(s => `${e(s.who)} (${e(s.at)}${s.note ? ": " + e(s.note) : ""})`).join("; ")}</p>` : ""}
</div>`;
}
const PAPER_CSS = `.bb{font-family:"Times New Roman",Times,serif;font-size:13pt;line-height:1.45;color:#111;background:#fff}.bb h1{text-align:center;font-size:17pt;margin:14pt 0 2pt;letter-spacing:.02em}.bb .vv{text-align:center;font-weight:bold;margin:0 0 10pt}
.bb h2{font-size:13pt;margin:13pt 0 5pt;color:#0b3a6e}.bb h3{font-size:13pt;margin:9pt 0 3pt}.bb table{border-collapse:collapse;width:100%}.bb .bbhd td{vertical-align:top;border:0}.bb .bbhd .l img{height:46px}.bb .bbhd .unit{font-weight:bold;font-size:11pt;margin-top:3pt}
.bb .bbhd .r{text-align:right;font-size:11.5pt}.bb .bbinfo th{width:24%;text-align:left;background:#f2f5f9}.bb .bbinfo th,.bb .bbinfo td,.bb .bbt th,.bb .bbt td{border:1px solid #9aa7b5;padding:4pt 6pt;vertical-align:top;text-align:left;font-size:11.5pt;position:static;color:#111;text-transform:none;letter-spacing:0}
.bb .bbt th{background:#e8eef6;font-weight:bold}.bb .bbsig{margin-top:18pt}.bb .bbsig td{width:50%;text-align:center;vertical-align:top;border:0}.bb small{color:#444}.bb .xn{font-size:10.5pt;color:#333;margin-top:12pt}.bb ul,.bb ol{margin:3pt 0 6pt 18pt;padding:0}`;
function minutesMd(m, dr, withStatus){ const M = model(m, dr, withStatus);
  return `# BIÊN BẢN CUỘC HỌP\n**${M.unit}** · Số: ${M.num} · ${M.city}, ${M.date}\n\nV/v: **${M.title}**\n\n## I. Thông tin chung\n- Thời gian: bắt đầu ${M.start}; kết thúc ${M.end}\n- Địa điểm: ${M.place} · Hình thức: ${M.form}\n- Chủ trì: ${M.host} · Thư ký: ${M.secretary}\n- Thành phần: ${M.people.join("; ") || "…"}${M.absent.length ? "\n- Vắng mặt: " + M.absent.join("; ") : ""}\n\n## II. Lý do và mục tiêu\n- Lý do: ${M.reason || "…"}${M.goal ? "\n- Mục tiêu: " + M.goal : ""}\n\n## III. Chương trình\n${M.agenda.map((a,i) => `${i+1}. ${a}`).join("\n") || "…"}\n\n## IV. Nội dung chính\n${M.summary.map(x => "- " + x).join("\n")}\n${M.items.map((a,i) => `\n### ${i+1}. ${a.item}\n${a.summary.map(x => "- " + x).join("\n")}${a.points.length ? "\n" + a.points.map(p => `- ${p.speaker ? "**" + p.speaker + ":** " : ""}${p.text}`).join("\n") : ""}${a.conclusion ? "\n- **Kết luận:** " + a.conclusion : ""}`).join("\n")}\n\n## V. Kết luận của chủ trì\n${M.decisions.map((x,i) => `${i+1}. ${x}`).join("\n") || "…"}\n\n## VI. Phân công thực hiện\n| STT | Công việc | Người chịu trách nhiệm | Phối hợp / xác nhận | Chỉ số – mục tiêu | Bằng chứng | Hạn | Trạng thái |\n|---|---|---|---|---|---|---|---|\n${M.tasks.map((t,i) => `| ${i+1} | ${t.title} | ${t.owner} (${t.dept}) | ${(t.coDepts||[]).join(", ") || "—"} | ${t.kpi || "—"} | ${t.evidenceReq || "—"} | ${vnDate(t.due)} | ${t.st} |`).join("\n")}\n\n## VII. Điểm nghẽn phải xử lý dứt điểm\n${M.blockers.map(b => `- **${b.text}** · ${b.owner || "…"} · hạn ${vnDate(b.due)}${b.solution ? " · " + b.solution : ""}`).join("\n") || "- Không có"}\n\n## VIII. Rủi ro và vấn đề chưa chốt\n${M.risks.map(x => "- Rủi ro: " + x).concat(M.open.map(x => "- Chưa chốt: " + x)).join("\n") || "- Không có"}\n${M.next ? "\n## IX. Cuộc họp tiếp theo\n- " + M.next + "\n" : ""}\n## Xác nhận\n- Host chốt: ${M.confirmedAt ? M.confirmedBy + " · " + M.confirmedAt : "chưa chốt"}\n${M.sg.map(s => `- ${s.who} · ${s.at}${s.note ? " · " + s.note : ""}`).join("\n")}\n`; }
function htmlDoc(m, dr, withStatus){ const M = model(m, dr, withStatus); return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Biên bản ${esc(M.title)}</title><style>@page{size:A4;margin:2cm 2cm 2cm 3cm}body{margin:0;padding:24px;background:#fff}${PAPER_CSS}</style></head><body>${minutesHtml(M)}</body></html>`; }
let docxLib = null;
function loadDocx(){ if(docxLib) return docxLib; docxLib = new Promise((res, rej) => { const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/docx@9.5.1/dist/index.iife.js"; s.onload = () => window.docx ? res(window.docx) : rej(new Error("docx")); s.onerror = () => { docxLib = null; rej(new Error("docx")); }; document.head.appendChild(s); }); return docxLib; }
async function docxBlob(m, dr, withStatus){
  const D = await loadDocx(), M = model(m, dr, withStatus), L = LOGO();
  const {Document, Packer, Paragraph, TextRun, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ImageRun, ShadingType, TableLayoutType} = D;
  const CW = 9071, Table = (o) => new D.Table({...o, layout: TableLayoutType.FIXED, columnWidths: o.cols.map(x => Math.round(CW * x / 100))});
  const F = "Times New Roman", P = (text, o = {}) => new Paragraph({alignment: o.align, spacing: {after: o.after ?? 80, before: o.before ?? 0}, bullet: o.bullet ? {level: 0} : undefined, numbering: undefined,
    children: (Array.isArray(text) ? text : [text]).map(x => typeof x === "string" ? new TextRun({text: x, font: F, size: o.size || 26, bold: o.bold, italics: o.italics, color: o.color}) : x)});
  const R = (t, o = {}) => new TextRun({text: t, font: F, size: o.size || 26, bold: o.bold, italics: o.italics});
  const H = t => P(t, {bold: true, color: "0B3A6E", before: 200, after: 80});
  const none = {style: BorderStyle.NONE, size: 0, color: "FFFFFF"}, NB = {top: none, bottom: none, left: none, right: none};
  const line = {style: BorderStyle.SINGLE, size: 4, color: "9AA7B5"}, LB = {top: line, bottom: line, left: line, right: line};
  const cell = (kids, o = {}) => new TableCell({children: (Array.isArray(kids) ? kids : [kids]).map(k => typeof k === "string" ? P(k, {size: o.size || 22, bold: o.bold, after: 20}) : k), borders: o.nb ? NB : LB, width: o.w ? {size: o.w, type: WidthType.PERCENTAGE} : undefined, shading: o.fill ? {type: ShadingType.CLEAR, fill: o.fill, color: "auto"} : undefined});
  let logoRun = null;
  if(L){ try{ const b64 = L.src.split(",")[1], bin = atob(b64), u8 = new Uint8Array(bin.length); for(let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); const h = 46, w = Math.round(L.w / L.h * h); logoRun = new ImageRun({type: "png", data: u8, transformation: {width: w, height: h}}); }catch(e){} }
  const kids = [];
  kids.push(Table({cols: [50,50], width: {size: 100, type: WidthType.PERCENTAGE}, rows: [new TableRow({children: [
    cell([...(logoRun ? [new Paragraph({children: [logoRun]})] : []), P(M.unit, {bold: true, size: 22, before: 60})], {nb: true, w: 50}),
    cell([P("Số: " + M.num, {align: AlignmentType.RIGHT, size: 22}), P(M.city + ", " + M.date, {align: AlignmentType.RIGHT, italics: true, size: 22})], {nb: true, w: 50})]})]}));
  kids.push(P("BIÊN BẢN CUỘC HỌP", {align: AlignmentType.CENTER, bold: true, size: 34, before: 240, after: 40}), P("V/v: " + M.title, {align: AlignmentType.CENTER, bold: true, after: 200}));
  kids.push(H("I. THÔNG TIN CHUNG"));
  const info = [["Thời gian", `Bắt đầu ${M.start}; kết thúc ${M.end}`], ["Địa điểm", M.place], ["Hình thức", M.form], ["Chủ trì", M.host], ["Thư ký", M.secretary], [`Thành phần (${M.people.length})`, M.people.join("\n") || "…"]].concat(M.absent.length ? [["Vắng mặt", M.absent.join("\n")]] : []);
  kids.push(Table({cols: [26,74], width: {size: 100, type: WidthType.PERCENTAGE}, rows: info.map(([k,v]) => new TableRow({children: [cell(k, {w: 26, bold: true, fill: "F2F5F9"}), cell(String(v).split("\n").map(x => P(x, {size: 22, after: 20})), {w: 74})]}))}));
  kids.push(H("II. LÝ DO VÀ MỤC TIÊU CUỘC HỌP"), P([R("Lý do: ", {bold: true}), R(M.reason || "…")]));
  if(M.goal) kids.push(P([R("Mục tiêu: ", {bold: true}), R(M.goal)]));
  kids.push(H("III. CHƯƠNG TRÌNH")); (M.agenda.length ? M.agenda : ["…"]).forEach((a,i) => kids.push(P(`${i+1}. ${a}`)));
  kids.push(H("IV. NỘI DUNG CHÍNH")); if(M.summary.length){ kids.push(P("Tóm tắt:", {bold: true})); M.summary.forEach(x => kids.push(P("– " + x))); }
  M.items.forEach((a,i) => { kids.push(P(`${i+1}. ${a.item}`, {bold: true, before: 120})); a.summary.forEach(x => kids.push(P("– " + x)));
    if(a.points.length){ kids.push(P("Ý kiến:", {italics: true})); a.points.forEach(p => kids.push(P([R("– "), ...(p.speaker ? [R(p.speaker + ": ", {bold: true})] : []), R(p.text)]))); }
    if(a.conclusion) kids.push(P([R("Kết luận: ", {bold: true}), R(a.conclusion)])); });
  kids.push(H("V. KẾT LUẬN CỦA CHỦ TRÌ")); (M.decisions.length ? M.decisions : ["…"]).forEach((x,i) => kids.push(P(`${i+1}. ${x}`)));
  kids.push(H("VI. PHÂN CÔNG THỰC HIỆN"));
  const hd = ["STT","Nội dung công việc","Người chịu trách nhiệm","Phối hợp / xác nhận","Chỉ số – mục tiêu","Bằng chứng hoàn thành","Hạn","Trạng thái"], wd8 = [6,21,14,11,13,14,11,10];
  kids.push(Table({cols: wd8, width: {size: 100, type: WidthType.PERCENTAGE}, rows: [new TableRow({tableHeader: true, children: hd.map((h,i) => cell(h, {bold: true, fill: "E8EEF6", w: wd8[i], size: 20}))})].concat(
    (M.tasks.length ? M.tasks : [{title: "Không có"}]).map((t,i) => new TableRow({children: [String(M.tasks.length ? i+1 : ""), t.title + (t.priority ? ` (${t.priority})` : ""), (t.owner||"") + (t.dept ? "\n" + t.dept : ""), (t.coDepts||[]).join(", ") || "—", t.kpi || "—", t.evidenceReq || "—", t.due ? vnDate(t.due) : "", t.st || ""].map((v,k) => cell(String(v).split("\n").map(x => P(x, {size: 20, after: 10})), {w: wd8[k]}))})))}));
  kids.push(H("VII. ĐIỂM NGHẼN PHẢI XỬ LÝ DỨT ĐIỂM")); (M.blockers.length ? M.blockers : [null]).forEach(b => kids.push(b ? P([R("– "), R(b.text, {bold: true}), R(` · xử lý: ${b.owner || "…"} · hạn ${vnDate(b.due)}${b.solution ? " · phương án: " + b.solution : ""}`)]) : P("Không có.")));
  kids.push(H("VIII. RỦI RO VÀ VẤN ĐỀ CHƯA CHỐT")); const ro = M.risks.map(x => "– Rủi ro: " + x).concat(M.open.map(x => "– Chưa chốt: " + x)); (ro.length ? ro : ["Không có."]).forEach(x => kids.push(P(x)));
  kids.push(H("IX. THEO DÕI THỰC HIỆN")); ["– Người chịu trách nhiệm cập nhật tiến độ, số liệu thực tế mỗi ngày làm việc trên Trung tâm điều hành.", "– Cảnh báo sớm khi chậm từ 10 điểm % so với kỳ vọng, 2 ngày không cập nhật hoặc điểm nghẽn tồn từ 2 ngày; lãnh đạo hỗ trợ trong 24 giờ.", "– Chỉ nghiệm thu khi chỉ số đạt mục tiêu, có bằng chứng kiểm chứng được, các phòng liên quan xác nhận và không còn điểm nghẽn."].concat(M.next ? ["– Cuộc họp tiếp theo: " + M.next] : []).forEach(x => kids.push(P(x)));
  kids.push(P(`Cuộc họp kết thúc lúc ${M.end}. Biên bản đã được thông qua trước các thành phần tham dự${M.confirmedAt ? ", Host chốt lúc " + M.confirmedAt : ""}.`, {before: 160}));
  const sig = (t, n) => cell([P(t, {bold: true, align: AlignmentType.CENTER, after: 0}), P("(Ký, ghi rõ họ tên)", {italics: true, align: AlignmentType.CENTER, size: 22, after: 900}), P(n, {bold: true, align: AlignmentType.CENTER})], {nb: true, w: 50});
  kids.push(Table({cols: [50,50], width: {size: 100, type: WidthType.PERCENTAGE}, rows: [new TableRow({children: [sig("THƯ KÝ", M.secretary.split(",")[0]), sig("CHỦ TRÌ", M.host)]})]}));
  if(M.sg.length) kids.push(P("Xác nhận điện tử: " + M.sg.map(s => `${s.who} (${s.at}${s.note ? ": " + s.note : ""})`).join("; "), {size: 20, italics: true, before: 200}));
  const doc = new Document({creator: "Ben – Đô Thành Auto", title: "Biên bản " + M.title, styles: {default: {document: {run: {font: F, size: 26}}}},
    sections: [{properties: {page: {size: {width: 11906, height: 16838}, margin: {top: 1134, bottom: 1134, left: 1701, right: 1134}}}, children: kids}]});
  return Packer.toBlob(doc);
}
const areaVal = a => (a||[]).join("\n");
function drawMinutes(){
  const m = meet(minId) || {id: minId}, body = $("minBody");
  $("minDlgT").textContent = (m.status === "confirmed" ? "Biên bản đã chốt · " : "Biên bản nháp · ") + (m.title || "");
  if(minMode === "view"){ body.innerHTML = `<style>${PAPER_CSS}</style><div style="background:#fff;border-radius:8px;padding:28px 34px;max-width:900px;margin:0 auto">${minutesHtml(model(m, draft, true))}</div>`;
    const mine = (S.signoffs[meId()] || {meetings:{}}).meetings || {};
    $("minFoot").innerHTML = `${m.status === "confirmed" ? `<button type="button" class="primary" id="mnSign"${mine[m.id] ? " disabled" : ""}>${mine[m.id] ? "Tôi đã xác nhận" : "Tôi xác nhận biên bản"}</button>` : ""}<button type="button" class="primary" id="mnDocx">Tải Word (.docx)</button><button type="button" id="mnHtml">Tải .html (in PDF)</button><button type="button" id="mnMd">.md</button><button type="button" id="mnCopy">Sao chép</button><button type="button" id="mnTasks">Xem đầu việc</button>${m.status !== "confirmed" ? '<button type="button" id="mnEdit">Sửa nháp</button>' : ""}<button type="button" id="mnScript" style="margin-left:auto">Xem lời thoại</button>`; return; }
  const dr = draft, opt = (arr, v) => arr.map(x => `<option${x === v ? " selected" : ""}>${esc(x)}</option>`).join(""), dtl = iso => { if(!iso) return ""; const d = new Date(iso); return isNaN(d) ? "" : ymd(d) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()); };
  body.innerHTML = `<p class="muted small" style="margin-top:0">Ben đã soạn nháp. Host rà soát: mỗi việc phải có người chịu trách nhiệm, chỉ số đo, bằng chứng, hạn. Ô có “CẦN CHỐT” là chỗ cuộc họp chưa nói rõ.</p>
  <h3>I. Thông tin chung</h3>
  <div class="fgrid">
    <label class="field w2">Tên cuộc họp<input type="text" data-m="title" value="${esc(m.title||"")}"></label><label class="field">Đơn vị<input type="text" data-m="unit" value="${esc(m.unit||"ĐÔ THÀNH AUTO")}"></label><label class="field">Hình thức<select data-m="form">${opt(["Trực tiếp","Trực tuyến","Kết hợp trực tiếp và trực tuyến"], m.form||"Trực tiếp")}</select></label>
    <label class="field">Bắt đầu<input type="datetime-local" data-m="startedAt" value="${dtl(m.startedAt)}" style="color-scheme:dark"></label><label class="field">Kết thúc<input type="datetime-local" data-m="endedAt" value="${dtl(m.endedAt)}" style="color-scheme:dark"></label><label class="field w2">Địa điểm<input type="text" data-m="place" value="${esc(m.place||"")}"></label>
    <label class="field w2">Chủ trì<input type="text" data-m="host" value="${esc(m.host||"")}"></label><label class="field w2">Thư ký<input type="text" data-m="secretary" value="${esc(m.secretary||"Ben (trợ lý AI), ghi lời thoại tự động")}"></label>
    <label class="field w2">Thành phần (mỗi dòng một người)<textarea rows="3" data-m="people">${esc(areaVal(m.people))}</textarea></label><label class="field w2">Vắng mặt<textarea rows="3" data-m="absent">${esc(areaVal(m.absent))}</textarea></label>
    <label class="field w2">Lý do triệu tập<textarea rows="2" data-d="reason">${esc(dr.reason || m.reason || "")}</textarea></label><label class="field w2">Mục tiêu<textarea rows="2" data-m="goal">${esc(m.goal||"")}</textarea></label>
  </div>
  <h3 style="margin-top:12px">Nội dung</h3>
  <div class="fgrid"><label class="field w2">Tóm tắt ý chính (mỗi dòng một ý)<textarea rows="4" data-d="summary">${esc(areaVal(dr.summary))}</textarea></label>
    <label class="field w2">Kết luận của chủ trì (mỗi dòng một kết luận)<textarea rows="4" data-d="decisions">${esc(areaVal(dr.decisions))}</textarea></label></div>
  ${dr.agendaItems.map((a,i) => `<div class="fgrid" data-ai="${i}" style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--glass-line)"><label class="field w2">Mục ${i+1} trong chương trình<input type="text" data-a="item" value="${esc(a.item)}"></label><label class="field w2">Kết luận mục này<input type="text" data-a="conclusion" value="${esc(a.conclusion)}"></label>
    <label class="field w4">Diễn biến và ý kiến (dòng “Tên: ý kiến” là ý kiến của người đó)<textarea rows="4" data-a="body">${esc(a.summary.concat(a.points.map(p => (p.speaker ? p.speaker + ": " : "Ý kiến: ") + p.text)).join("\n"))}</textarea></label></div>`).join("")}
  <div class="toolbar"><button type="button" id="mnAddA">+ Thêm mục chương trình</button></div>
  <h3>Phân công thực hiện</h3>
  <div style="overflow-x:auto"><table class="drafttbl"><thead><tr><th>Đầu việc</th><th>Người chịu trách nhiệm</th><th>Phòng ban</th><th>Phối hợp/xác nhận (phẩy)</th><th>Chỉ số</th><th>Mục tiêu</th><th>Đơn vị</th><th>Bằng chứng bắt buộc</th><th>Bắt đầu</th><th>Hạn</th><th>Ưu tiên</th><th>Việc làm ngay 24h</th><th></th></tr></thead><tbody>
  ${dr.tasks.map((t,i) => `<tr data-ti="${i}"><td style="min-width:200px"><input data-t="title" value="${esc(t.title)}"></td><td style="min-width:140px"><input data-t="owner" value="${esc(t.owner)}"></td><td><select data-t="dept">${opt(DEPTS, t.dept)}</select></td><td style="min-width:140px"><input data-t="coDepts" value="${esc((t.coDepts||[]).join(", "))}"></td><td style="min-width:150px"><input data-t="kpiName" value="${esc(t.kpiName)}"></td><td style="min-width:80px"><input data-t="kpiTarget" value="${esc(t.kpiTarget)}"></td><td style="min-width:60px"><input data-t="kpiUnit" value="${esc(t.kpiUnit)}"></td><td style="min-width:170px"><input data-t="evidenceReq" value="${esc(t.evidenceReq)}"></td><td><input type="date" data-t="start" value="${esc(t.start)}"></td><td><input type="date" data-t="due" value="${esc(t.due)}"></td><td><select data-t="priority">${opt(["P1","P2","P3"], t.priority)}</select></td><td style="min-width:160px"><input data-t="firstStep" value="${esc(t.firstStep)}"></td><td><button type="button" data-rm="${i}" aria-label="Bỏ dòng">✕</button></td></tr>`).join("")}
  </tbody></table></div>
  <div class="toolbar"><button type="button" id="mnAddT">+ Thêm đầu việc</button></div>
  <h3>Điểm nghẽn phải xử lý dứt điểm</h3>
  <div style="overflow-x:auto"><table class="drafttbl"><thead><tr><th>Điểm nghẽn</th><th>Người xử lý</th><th>Hạn</th><th>Phương án</th><th></th></tr></thead><tbody>
  ${dr.blockers.map((b,i) => `<tr data-bi="${i}"><td style="min-width:240px"><input data-b="text" value="${esc(b.text)}"></td><td><input data-b="owner" value="${esc(b.owner)}"></td><td><input type="date" data-b="due" value="${esc(b.due)}"></td><td style="min-width:220px"><input data-b="solution" value="${esc(b.solution)}"></td><td><button type="button" data-rmb="${i}" aria-label="Bỏ dòng">✕</button></td></tr>`).join("")}
  </tbody></table></div>
  <div class="toolbar"><button type="button" id="mnAddB">+ Thêm điểm nghẽn</button></div>
  <div class="fgrid">
    <label class="field w2">Rủi ro<textarea rows="3" data-d="risks">${esc(areaVal(dr.risks))}</textarea></label>
    <label class="field w2">Vấn đề chưa chốt<textarea rows="3" data-d="openQuestions">${esc(areaVal(dr.openQuestions))}</textarea></label>
    <label class="field w4">Cuộc họp tiếp theo<input type="text" data-d="nextMeeting" value="${esc(dr.nextMeeting)}"></label>
  </div>`;
  $("minFoot").innerHTML = `<button type="button" class="primary" id="mnConfirm"${canAdmin ? "" : ' disabled title="Chỉ Host (quyền Editor) chốt biên bản"'}>Host chốt biên bản &amp; giao việc</button><button type="button" id="mnSave">Lưu nháp</button><button type="button" id="mnPreview">Xem bản in</button><button type="button" id="mnDocx">Tải Word (.docx)</button><button type="button" id="mnHtml">.html</button><button type="button" id="mnScript" style="margin-left:auto">Xem lời thoại</button>`;
}
let metaEdit = null;
function readDraft(){
  metaEdit = null; const b = $("minBody"); if(minMode !== "edit" || !b.querySelector("[data-d]")) return;
  b.querySelectorAll("[data-d]").forEach(el => { const k = el.dataset.d; draft[k] = el.tagName === "TEXTAREA" && k !== "reason" ? el.value.split("\n").map(s => s.trim()).filter(Boolean) : el.value.trim(); });
  draft.agendaItems = [...b.querySelectorAll("[data-ai]")].map(box => { const g = k => box.querySelector(`[data-a="${k}"]`).value.trim(), sm = [], pts = [];
    g("body").split("\n").map(s => s.trim()).filter(Boolean).forEach(l => { const x = splitSpeaker(l); if(x.sp) pts.push({speaker: /^ý kiến$/i.test(x.sp) ? "" : x.sp, text: x.text}); else sm.push(l); });
    return {item: g("item"), conclusion: g("conclusion"), summary: sm, points: pts}; }).filter(a => a.item || a.summary.length || a.points.length);
  b.querySelectorAll("tr[data-ti]").forEach(tr => { const t = draft.tasks[+tr.dataset.ti]; tr.querySelectorAll("[data-t]").forEach(el => { const k = el.dataset.t; t[k] = k === "coDepts" ? el.value.split(/[,;]/).map(s => s.trim()).filter(x => DEPTS.includes(x)) : el.value.trim(); }); });
  b.querySelectorAll("tr[data-bi]").forEach(tr => { const x = draft.blockers[+tr.dataset.bi]; tr.querySelectorAll("[data-b]").forEach(el => { x[el.dataset.b] = el.value.trim(); }); });
  const mm = {}; b.querySelectorAll("[data-m]").forEach(el => { const k = el.dataset.m; let v = el.value.trim();
    if(k === "people" || k === "absent") v = v.split("\n").map(s => s.trim()).filter(Boolean); else if((k === "startedAt" || k === "endedAt") && v){ const d = new Date(v); v = isNaN(d) ? "" : d.toISOString(); }
    mm[k] = v; }); metaEdit = mm;
}
async function saveMeta(){ if(metaEdit){ const x = {...metaEdit}; metaEdit = null; if(!x.startedAt) delete x.startedAt; if(!x.endedAt) delete x.endedAt; await putMeeting({id: minId, ...x}); } }
function fileBase(m){ return "bien-ban-" + String(m.title||"cuoc-hop").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/đ/gi,"d").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60) + "-" + String(m.startedAt||nowIso()).slice(0,10); }
$("minDlg").addEventListener("click", async e => {
  if(e.target.closest("[data-close]")) return $("minDlg").close();
  const id = e.target.id; let m = meet(minId) || {id: minId};
  if(e.target.dataset.rm != null){ readDraft(); await saveMeta(); draft.tasks.splice(+e.target.dataset.rm, 1); return drawMinutes(); }
  if(e.target.dataset.rmb != null){ readDraft(); await saveMeta(); draft.blockers.splice(+e.target.dataset.rmb, 1); return drawMinutes(); }
  if(id === "mnAddT"){ readDraft(); await saveMeta(); draft.tasks.push({title:"", owner:"", dept:"Kinh doanh", coDepts:[], kpiName:"", kpiUnit:"", kpiBase:"", kpiTarget:"", kpiDir:"up", evidenceReq:"", start: ymd(), due: addDays(ymd(), 7), priority:"P2", firstStep:""}); return drawMinutes(); }
  if(id === "mnAddB"){ readDraft(); await saveMeta(); draft.blockers.push({text:"", owner:"", due: addDays(ymd(), 3), solution:""}); return drawMinutes(); }
  if(id === "mnAddA"){ readDraft(); await saveMeta(); draft.agendaItems.push({item:"", summary:[], points:[], conclusion:""}); return drawMinutes(); }
  if(id === "mnSave"){ readDraft(); await saveMeta(); await putMeeting({id: minId, draft}); return toast("Đã lưu nháp"); }
  if(id === "mnEdit"){ minMode = "edit"; return drawMinutes(); }
  if(id === "mnPreview"){ readDraft(); await saveMeta(); m = meet(minId) || m; $("minBody").innerHTML = `<style>${PAPER_CSS}</style><div style="background:#fff;border-radius:8px;padding:28px 34px;max-width:900px;margin:0 auto">${minutesHtml(model(m, draft, false))}</div><div class="toolbar"><button type="button" id="mnEdit">Quay lại sửa</button></div>`; return; }
  if(["mnMd","mnHtml","mnCopy","mnDocx"].includes(id)){ readDraft(); await saveMeta(); m = meet(minId) || m; const conf = m.status === "confirmed", fn = fileBase(m);
    if(id === "mnCopy"){ try{ await navigator.clipboard.writeText(minutesMd(m, draft, conf)); toast("Đã sao chép"); }catch(_){ toast("Trình duyệt chặn sao chép"); } return; }
    if(id === "mnDocx"){ toast("Đang tạo file Word…"); try{ const blob = await docxBlob(m, draft, conf); const dl = CV.downloads; if(!dl){ toast("Chỉ tải được khi mở trong Claude; dùng .html rồi mở bằng Word"); return; } await dl.save({filename: fn + ".docx", data: blob}); toast("Đã lưu " + fn + ".docx"); }
      catch(err){ if(err && err.code === "declined") return; toast(err && err.message === "docx" ? "Không nạp được thư viện Word, dùng .html rồi mở bằng Word" : "Chưa tạo được file Word"); } return; }
    return CV.offerFile(fn + (id === "mnMd" ? ".md" : ".html"), id === "mnMd" ? minutesMd(m, draft, conf) : htmlDoc(m, draft, conf), "Biên bản"); }
  if(id === "mnTasks"){ $("minDlg").close(); $("ofText").value = m.title || ""; $("ofStatus").value = ""; tileF = ""; document.querySelector('[data-otab="T"]').click(); renderOps(); $("opsSec").scrollIntoView({behavior:"smooth"}); return; }
  if(id === "mnScript"){ readDraft(); await saveMeta(); const ls = await meetingLines(minId); $("minBody").innerHTML = `<div class="tscript" style="max-height:60vh">${ls.map(l => `<p><span class="tm">${esc(l.ts||"")}</span>${l.tag ? `<span class="tag ${TAGS[l.tag]||""}">${esc(l.tag)}</span>` : ""}${l.sp ? `<b>${esc(l.sp)}:</b> ` : ""}${esc(l.text)}</p>`).join("") || '<p class="muted">Không có lời thoại.</p>'}</div><div class="toolbar"><button type="button" id="mnBack">Quay lại biên bản</button></div>`; return; }
  if(id === "mnBack") return drawMinutes();
  if(id === "mnSign"){ const note = await ask("Xác nhận biên bản. Ghi chú (có thể để trống):", {ph:"VD: Đồng ý, phòng DV nhận việc 2 và 5"}); if(note === null) return; if(await writeSignoff(s => { s.meetings = s.meetings || {}; s.meetings[m.id] = {at: nowIso(), note}; })){ toast("Đã xác nhận biên bản"); setTimeout(drawMinutes, 300); } return; }
  if(id === "mnConfirm"){ readDraft(); await saveMeta(); m = meet(minId) || m;
    const bad = draft.tasks.map((t,i) => [i+1, [!t.title && "tên việc", !t.owner && "người chịu trách nhiệm", !t.kpiName && "chỉ số", !t.evidenceReq && "bằng chứng", !t.due && "hạn", /CẦN CHỐT/i.test(Object.values(t).join(" ")) && "còn “CẦN CHỐT”"].filter(Boolean)]).filter(x => x[1].length);
    const badB = draft.blockers.filter(b => b.text && (!b.owner || !b.due));
    if(bad.length || badB.length) return toast("Chưa chốt được: " + bad.map(([i,l]) => `việc ${i} thiếu ${l.join(", ")}`).concat(badB.length ? ["điểm nghẽn thiếu người xử lý/hạn"] : []).join("; ").slice(0, 220));
    if(!draft.tasks.length && !draft.blockers.length && !(await ask("Biên bản không có đầu việc nào. Vẫn chốt?", {confirm:true}))) return;
    const ids = [];
    for(const x of draft.tasks){ const t = blankTask({title: x.title, owner: x.owner, dept: x.dept, coDepts: x.coDepts, priority: x.priority, kpi: {name: x.kpiName, unit: x.kpiUnit, base: x.kpiBase, target: x.kpiTarget, actual: "", dir: x.kpiDir || "up"}, evidenceReq: x.evidenceReq, start: x.start || ymd(), due: x.due, firstStep: x.firstStep, meetingId: m.id}); ids.push(t.id); await saveTask(t, "Giao việc từ biên bản " + (m.title||"")); }
    for(const b of draft.blockers.filter(b => b.text)){ const t = blankTask({title: "Gỡ nghẽn: " + b.text, owner: b.owner, dept: "Ban Giám đốc", priority: "P1", kpi: {name: "Điểm nghẽn được xử lý dứt điểm", unit: "việc", base: 0, target: 1, actual: "", dir: "up"}, evidenceReq: "Văn bản/ảnh chụp/xác nhận của bên liên quan chứng minh đã xử lý xong" + (b.solution ? "; phương án: " + b.solution : ""), start: ymd(), due: b.due, firstStep: b.solution, meetingId: m.id}); ids.push(t.id); await saveTask(t, "Gỡ nghẽn từ biên bản"); }
    if(rec && rec.id === minId) stopMeeting();
    await putMeeting({id: m.id, status: "confirmed", minutes: draft, draft, taskIds: (m.taskIds || []).concat(ids), confirmedAt: nowIso(), confirmedBy: meId(), endedAt: m.endedAt || nowIso()});
    minMode = "view"; drawMinutes(); toast(`Đã chốt biên bản, giao ${ids.length} đầu việc`); if(rec && rec.id === minId){ rec = null; $("mScript").innerHTML = '<p class="muted">Cuộc họp đã chốt. Bấm “Bắt đầu ghi” cho cuộc họp mới.</p>'; setRecUi("idle"); }
  }
});

/* ---------- section events ---------- */
$("ofDept").innerHTML = '<option value="">Tất cả</option>' + DEPTS.map(d => `<option>${esc(d)}</option>`).join("");
["ofDept","ofOwner","ofStatus"].forEach(id => $(id).addEventListener("change", () => { tileF = ""; renderOps(); }));
$("ofText").addEventListener("input", () => { tileF = ""; scheduleRender(); });
$("opsTiles").addEventListener("click", e => { const s = e.target.closest("[data-tile]"); if(!s) return; tileF = tileF === s.dataset.tile ? "" : s.dataset.tile; document.querySelector('[data-otab="T"]').click(); renderOps(); });
$("opsTable").addEventListener("click", e => { const tr = e.target.closest("tr[data-id]"); if(tr && S.tasks[tr.dataset.id]) openTask(S.tasks[tr.dataset.id]); });
$("opsMeetings").addEventListener("click", e => { const b = e.target.closest("[data-mtg]"); if(b) openMinutes(b.dataset.mtg); });
$("opsToday").addEventListener("click", async e => { const b = e.target.closest("[data-act]"); if(!b) return; const a = $("opsToday")._acts[+b.dataset.i]; if(!a) return;
  if(b.dataset.act === "open") openTask(a.t);
  else if(b.dataset.act === "mtg") openMinutes(a.mtg);
  else if(b.dataset.act === "take"){ const t = JSON.parse(JSON.stringify(a.t)); t.support = {...t.support, takenBy: meId(), takenAt: nowIso()}; if(await saveTask(t, "Lãnh đạo nhận hỗ trợ")) toast("Đã nhận hỗ trợ: liên hệ " + t.owner + " ngay"); }
  else if(b.dataset.act === "kudos"){ const t = JSON.parse(JSON.stringify(a.t)); t.kudos = (t.kudos||[]).concat([{by: meId(), at: nowIso()}]); if(await saveTask(t, "Ghi nhận")) toast("Đã ghi nhận " + t.owner); } });
document.querySelectorAll("[data-otab]").forEach(b => b.addEventListener("click", () => { otab = b.dataset.otab; document.querySelectorAll("[data-otab]").forEach(x => x.setAttribute("aria-selected", x === b)); ["T","L","M","H"].forEach(k => { $("op"+k).hidden = k !== otab; }); }));
$("opsNew").addEventListener("click", () => openTask(blankTask({}), true));
$("opsBrief").addEventListener("click", () => { CV.openAi(true); CV.benTab("Chat"); CV.addMsg("u", "Bản tin điều hành hôm nay"); const b = CV.addMsg("a", ""); CV.finishBubble(b, briefMd(), false, "Bản tin điều hành " + vnDate(ymd()), true); });
$("opsMeet").addEventListener("click", () => { CV.openAi(true); CV.benTab("Meet"); });
$("opsBar").addEventListener("click", () => $("opsSec").scrollIntoView({behavior:"smooth", block:"start"}));
$("opsExport").addEventListener("click", () => { const q = v => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s; };
  const head = ["Đầu việc","Người chịu trách nhiệm","Phòng ban","Phối hợp/xác nhận","Ưu tiên","Trạng thái","Sức khỏe","Lý do","Tiến độ %","Kỳ vọng %","KPI","Thực tế","Mục tiêu","Đơn vị","Bằng chứng","Xác nhận","Bắt đầu","Hạn","Cập nhật gần nhất","Cuộc họp"];
  const body = tasksArr().map(t => { const h = health(t), lc = lastCi(t); return [t.title, t.owner, t.dept, (t.coDepts||[]).join("; "), t.priority, STATUS[t.status], HL[h.k][0], h.reasons.join("; "), +t.progress||0, h.expected, (t.kpi||{}).name, (t.kpi||{}).actual, (t.kpi||{}).target, (t.kpi||{}).unit, (t.evidence||[]).length, confirmsOf(t.id).filter(c => c.ok).length + "/" + (t.coDepts||[]).length, t.start, t.due, lc ? lc.d + " " + lc.note : "", (S.meetings[t.meetingId]||{}).title || ""].map(q).join(","); });
  CV.offerFile("dau-viec-" + ymd() + ".csv", "﻿" + head.join(",") + "\n" + body.join("\n"), "Bảng đầu việc"); });

/* ---------- Ben: AI tools + context ---------- */
CV.tools.push(
  {name:"update_map_data", label:"Đang cập nhật dữ liệu…", description:"Sửa dữ liệu trên bản đồ theo lệnh của người dùng (chỉ khi người dùng yêu cầu sửa/cập nhật). target: tên tỉnh/thành (mới hoặc cũ) hoặc tên đại lý. field cho tỉnh: sales (bán lẻ lũy kế), target (KH lũy kế), reg (ĐK mới thực tế), uio, pop (nghìn người), grdp (nghìn tỷ), growth (%), dealers, factor, elev, c_thaco, c_hyundai, c_isuzu, c_hino, c_fuso, c_china, c_other (thị phần %), note. field cho đại lý: leCum, khCum, thT10, khT10, siT9, tonT9. mode: set (mặc định) hoặc add (cộng thêm, số âm để trừ). Trả về giá trị trước/sau.",
   inputSchema:{type:"object",properties:{target:{type:"string"},field:{type:"string"},value:{},mode:{type:"string"}},required:["target","field","value"]},
   execute: ({target, field, value, mode: md}) => {
     const tg = findTarget(String(target)); if(!tg) throw new Error("Không tìm thấy " + target);
     if(tg.kind === "dealer" && DEALER_FIELDS.includes(field) || (tg.kind === "dealer" && !CV.NUM_KEYS.includes(field))){ if(!DEALER_FIELDS.includes(field)) throw new Error("Trường đại lý hợp lệ: " + DEALER_FIELDS.join(", ")); const d = tg.d, b = +d[field] || 0, v = md === "add" ? b + +value : +value; if(isNaN(v)) throw new Error("Giá trị không phải số"); setDealer(d, field, Math.round(v), "Ben AI"); return {dai_ly: tg.label, truong: field, truoc: b, sau: Math.round(v)}; }
     const r = tg.kind === "prov" ? tg.row : CV.findRow(tg.d.province);
     if(field === "note"){ const b = r.note; setProv(r, "note", String(value), "Ben AI"); return {tinh: r.name, truong: "note", truoc: b, sau: String(value)}; }
     if(!CV.NUM_KEYS.includes(field)) throw new Error("Trường không hợp lệ: " + field);
     const b = r[field], v = md === "add" ? (+b||0) + +value : +value; if(isNaN(v)) throw new Error("Giá trị không phải số"); setProv(r, field, v, "Ben AI"); return {tinh: r.name, truong: field, truoc: b ?? null, sau: v}; }},
  {name:"undo_last_change", label:"Đang hoàn tác…", description:"Hoàn tác thay đổi dữ liệu bản đồ gần nhất của người dùng hiện tại.", inputSchema:{type:"object",properties:{}},
   execute: () => { const c = undoLast(); return c ? {da_hoan_tac: c} : "Không có thay đổi để hoàn tác"; }},
  {name:"ops_brief", label:"Đang tổng hợp đầu việc…", description:"Bản tin điều hành hôm nay: đầu việc nguy cơ trễ, cảnh báo, cần hỗ trợ, điểm nghẽn, việc lãnh đạo cần làm.", inputSchema:{type:"object",properties:{}}, execute: () => briefMd()},
  {name:"list_tasks", label:"Đang đọc đầu việc…", description:"Danh sách đầu việc với sức khỏe tiến độ, lý do cảnh báo, KPI, bằng chứng, xác nhận, nhật ký cập nhật gần nhất. Lọc tùy chọn theo owner, dept, status (todo|doing|review|done), health (green|amber|red), q (từ khóa).",
   inputSchema:{type:"object",properties:{owner:{type:"string"},dept:{type:"string"},status:{type:"string"},health:{type:"string"},q:{type:"string"}}},
   execute: (f) => tasksArr().filter(t => (!f.owner || N(t.owner).includes(N(f.owner))) && (!f.dept || t.dept === f.dept) && (!f.status || t.status === f.status) && (!f.health || health(t).k === f.health) && (!f.q || N(t.title).includes(N(f.q)) || t.id === f.q)).slice(0, 40).map(t => { const h = health(t), D = dod(t);
     return {id: t.id, viec: t.title, nguoi: t.owner, phong: t.dept, phoi_hop: t.coDepts, trang_thai: STATUS[t.status], suc_khoe: HL[h.k][0], ly_do: h.reasons, tien_do: +t.progress||0, ky_vong: h.expected, kpi: t.kpi, bang_chung: (t.evidence||[]).length, thieu_xac_nhan: D.missing, du_dk_nghiem_thu: D.all, bat_dau: t.start, han: t.due, du_bao_xong: h.eta, diem_nghen_mo: (t.blockers||[]).filter(b => !b.resolved).map(b => b.text), can_ho_tro: t.support && t.support.open ? t.support.text : null, cap_nhat: (t.checkins||[]).slice(-3).map(c => ({ngay: c.d, p: c.p, kpi: c.a, ghi_chu: c.note}))}; })},
  {name:"create_task", label:"Đang giao việc…", description:"Tạo một đầu việc mới (chỉ khi người dùng yêu cầu giao việc). Bắt buộc: title, owner, due (YYYY-MM-DD), kpi_name, evidence_req. Tùy chọn: dept, co_depts, kpi_target, kpi_unit, kpi_dir (up|down), start, priority (P1|P2|P3), first_step.",
   inputSchema:{type:"object",properties:{title:{type:"string"},owner:{type:"string"},dept:{type:"string"},co_depts:{type:"array",items:{type:"string"}},kpi_name:{type:"string"},kpi_target:{type:"number"},kpi_unit:{type:"string"},kpi_dir:{type:"string"},evidence_req:{type:"string"},start:{type:"string"},due:{type:"string"},priority:{type:"string"},first_step:{type:"string"}},required:["title","owner","due","kpi_name","evidence_req"]},
   execute: async (i) => { const t = blankTask({title: i.title, owner: i.owner, dept: DEPTS.includes(i.dept) ? i.dept : "Kinh doanh", coDepts: (i.co_depts||[]).filter(x => DEPTS.includes(x)), priority: ["P1","P2","P3"].includes(i.priority) ? i.priority : "P2", kpi: {name: i.kpi_name, unit: i.kpi_unit || "", base: "", target: i.kpi_target ?? "", actual: "", dir: i.kpi_dir === "down" ? "down" : "up"}, evidenceReq: i.evidence_req, start: /^\d{4}-\d\d-\d\d$/.test(i.start||"") ? i.start : ymd(), due: /^\d{4}-\d\d-\d\d$/.test(i.due||"") ? i.due : addDays(ymd(), 7), firstStep: i.first_step || ""});
     if(!(await saveTask(t, "Ben giao việc"))) throw new Error("Chưa lưu được (quyền ghi)"); return {id: t.id, ok: true}; }},
  {name:"update_task", label:"Đang cập nhật đầu việc…", description:"Cập nhật tiến độ hằng ngày cho một đầu việc (id hoặc từ khóa tên việc): progress (%), actual (số KPI), note (đã làm gì, có số liệu), blocker (điểm nghẽn mới), need_support (văn bản cần hỗ trợ). Chỉ dùng khi người dùng báo cáo tiến độ.",
   inputSchema:{type:"object",properties:{task:{type:"string"},progress:{type:"number"},actual:{type:"number"},note:{type:"string"},blocker:{type:"string"},need_support:{type:"string"}},required:["task","note"]},
   execute: async (i) => { const t0 = S.tasks[i.task] || tasksArr().find(t => N(t.title).includes(N(i.task))); if(!t0) throw new Error("Không tìm thấy việc " + i.task); const t = JSON.parse(JSON.stringify(t0)), td = ymd();
     const p = i.progress != null ? Math.max(0, Math.min(100, +i.progress)) : +t.progress||0; t.checkins = (t.checkins||[]).concat([{d: td, p, a: i.actual ?? "", note: i.note, next: "", by: meId(), at: nowIso()}]); t.progress = p; if(i.actual != null) t.kpi.actual = i.actual; if(t.status === "todo" && p > 0) t.status = "doing";
     if(i.blocker) t.blockers = (t.blockers||[]).concat([{text: i.blocker, since: nowIso(), by: meId(), resolved: false}]); if(i.need_support) t.support = {open: true, text: i.need_support, at: nowIso(), by: meId(), takenBy: null};
     if(!(await saveTask(t, "Ben cập nhật " + p + "%"))) throw new Error("Chưa lưu được"); return {ok: true, suc_khoe: HL[health(t).k][0], ly_do: health(t).reasons}; }},
  {name:"get_meeting_transcript", label:"Đang đọc lời thoại…", description:"Lời thoại cuộc họp đang ghi (hoặc gần nhất), để trả lời ai đã nói gì, đã chốt gì.", inputSchema:{type:"object",properties:{last_lines:{type:"number"}}},
   execute: async ({last_lines}) => { const m = rec ? meet(rec.id) || {id: rec.id} : Object.values(S.meetings).filter(Boolean).sort((a,b) => String(b.startedAt).localeCompare(String(a.startedAt)))[0]; if(!m) return "Chưa có cuộc họp";
     const ls = await meetingLines(m.id); return `Cuộc họp ${m.title || ""}:\n` + ls.slice(-Math.min(+last_lines || 150, 400)).map(l => `[${l.ts}]${l.tag ? " (" + l.tag + ")" : ""} ${l.text}`).join("\n"); }},
);
CV.ctx = () => { const td = ymd(), ts = tasksArr().filter(t => t.status !== "cancel" && t.status !== "done"), H = ts.map(t => [t, health(t, td)]);
  return `
VAI TRÒ THƯ KÝ & ĐIỀU HÀNH: Ben còn là thư ký cuộc họp và trợ lý điều hành theo tinh thần "Lãnh đạo phụng sự": dựa trên số liệu, bằng chứng, xác nhận liên phòng; phát hiện sớm để hỗ trợ trước hạn, không đợi trễ rồi mới xử lý; góp ý thẳng, có lý lẽ, không cảm tính; ghi nhận người làm tốt.
- Khi người dùng RA LỆNH sửa số liệu ("cập nhật", "sửa", "đặt", "tăng/giảm"), dùng update_map_data rồi báo trước → sau; có thể hoàn tác bằng undo_last_change. Không tự sửa dữ liệu khi người dùng chỉ hỏi.
- Hỏi về công việc/tiến độ/ai đang chậm: dùng ops_brief hoặc list_tasks. Giao việc: create_task (phải có người chịu trách nhiệm, chỉ số, bằng chứng, hạn; thiếu thì hỏi lại). Báo cáo tiến độ: update_task.
- Trong cuộc họp, hỏi "ai đã nói gì / đã chốt gì": get_meeting_transcript.
Hôm nay ${vnDate(td)}. Đầu việc đang mở: ${ts.length} (nguy cơ trễ ${H.filter(([,h]) => h.k === "red").length}, cảnh báo ${H.filter(([,h]) => h.k === "amber").length}). ${rec ? "Đang ghi cuộc họp: " + (meetForm().title) + "." : ""}`; };

/* ---------- boot ---------- */
loadLocal(); renderOps(); setInterval(renderOps, 60000);
const use = n => (window.claude && typeof window.claude.use === "function") ? window.claude.use(n).catch(() => null) : Promise.resolve(null);
use("dictation").then(d => { dict = d; const mic = $("aiMic"); if(mic) mic.hidden = !d;
  if(!d){ $("mState").textContent = "Thiết bị này chưa hỗ trợ ghi giọng nói: gõ ghi chú tay ở ô dưới"; return; }
  d.onPartial(({text}) => { if(dictMode === "meet"){ partialTxt = text; drawScript(); } else { const ta = $("aiText"); ta.dataset.base = ta.dataset.base ?? ta.value; ta.value = (ta.dataset.base + " " + text).trim(); } });
  d.onFinal(({text}) => { if(dictMode === "meet"){ partialTxt = ""; addLine(text); } else { const ta = $("aiText"); ta.value = ((ta.dataset.base ?? ta.value) + text).replace(/^\s+/, ""); ta.dataset.base = ta.value; } });
  d.onState(({state, reason}) => { setRecUi(state, reason); if(state === "idle"){ partialTxt = ""; if(dictMode === "meet"){ flush(true); if(reason !== "stopped") clearInterval(recT); drawScript(); }
    if(dictMode === "cmd"){ const ta = $("aiText"); delete ta.dataset.base; if(ta.value.trim() && (reason === "stopped" || reason === "viewer_stopped")) CV.askAi(ta.value); } } });
});
use("user").then(async u => { userCap = u; if(!u) return; try{ me = await u.id(); }catch(e){} try{ canAdmin = await u.canEdit(); }catch(e){} try{ const w = await u.can("data.write"); if(w === false) canWrite = false; }catch(e){} scheduleRender(); });
use("assets").then(a => { assets = a; });
use("db").then(async d => {
  if(!d) { renderSync(); return; }
  db = d; mode = "db"; syncOk = false; renderSync();
  const loadT = setTimeout(() => { if(!syncOk){ $("opsSync").textContent = "Chưa kết nối được dữ liệu chung, đang thử lại…"; } }, 10000);
  const ok = snap => { if(!snap.metadata.fromCache && !syncOk){ syncOk = true; clearTimeout(loadT); renderSync(); } };
  const onErr = e => { clearTimeout(loadT); syncOk = false; renderSync(); if(e && e.code === "revoked") $("opsSync").textContent = "Mất quyền truy cập dữ liệu chung"; };
  const coll = (name, key, after) => db.collection(name).onSnapshot(s => { const o = {}; s.docs.forEach(x => { o[x.id] = {...x.data(), id: x.data().id || x.id}; }); S[key] = o; if(after) after(); ok(s); scheduleRender(); }, onErr);
  coll("tasks", "tasks"); coll("meetings", "meetings", () => Object.keys(mLocal).forEach(id => { const s = S.meetings[id]; if(s && String(s.updatedAt) >= String(mLocal[id].updatedAt)) delete mLocal[id]; })); coll("signoffs", "signoffs");
  db.doc("shared/changes").onSnapshot(s => { S.changes = s.exists ? (s.data().items || []) : []; ok(s); scheduleRender(); }, onErr);
  db.doc("shared/mapdata").onSnapshot(s => { ok(s); if(s.exists) applyMapdata(s.data()); }, onErr);
});
})();
