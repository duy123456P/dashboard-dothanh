/* ===== Cổng nhập dữ liệu nội bộ: số tài chính, công nợ, bán lẻ từng xe, tồn đại lý =====
   Chống sai tại nguồn (Poka-Yoke): bắt buộc cột, kiểm tra kiểu, ngày, đơn vị, trùng số khung, tên đại lý, quy tắc ghi nhận doanh thu;
   lỗi nào cũng nêu dòng + cách sửa; không áp dụng khi còn lỗi chặn (trừ khi chọn rõ "chỉ nhận dòng hợp lệ").
   Quyền riêng tư: số khung chỉ dùng để kiểm trùng trong bộ nhớ, KHÔNG lưu; chỉ lưu số tổng hợp trên máy này (localStorage). */
(function(){
"use strict";
const CV = window.__CV; if(!CV || !CV.store) return;
const {esc, fmtInt, fmt1} = CV, sum = a => a.reduce((x, y) => x + (y || 0), 0);
const fold = s => String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const CODE = {dtdongnam: "ĐT Đông Nam", quangduong: "Quang Dương", "sr danang": "ĐT Đà Nẵng", "sr phuyen": "Phi Hưng", vuhung: "Vũ Hùng", hongvinh: "Hồng Vinh", myphuhung: "Mỹ Phú Hưng", "o to 19 5": "Ô Tô 19/5", "sr haugiang": "ĐT Hậu Giang", "sr kiengiang": "ĐT Kiên Giang",
  "sr longan": "ĐT Long An", "sr phumy": "Phú Mỹ", "sr tanvan": "Tân Vạn", truongvu: "Trường Vũ", hungvuong: "Hưng Vượng", "sr tiengiang": "ĐT Tiền Giang", dunglac: "Dũng Lạc", cuongnguyen: "Cương Nguyễn", hungtuyen: "Hùng Tuyến", "dlac thdl": "Ô Tô Tây Nguyên"};
const NAMES = (() => { const s = new Set(); (CV.inv ? CV.inv.dealers : []).forEach(d => { s.add(d.name); if(d.link) s.add(d.link); }); (CV.debtBase() ? CV.debtBase().dealers : []).forEach(d => s.add(d.name)); (CV.CENTERS || []).forEach(c => c.salesKey && s.add(c.salesKey)); Object.values(CODE).forEach(v => s.add(v)); return [...s]; })();
const FOLDN = new Map(NAMES.map(n => [fold(n), n]));
function dealerOf(v){ const f = fold(v); if(!f) return {err: "thiếu tên đại lý"}; const c = CODE[f.replace(/ /g, "")] || CODE[f]; if(c) return {v: c}; if(FOLDN.has(f)) return {v: FOLDN.get(f)};
  const near = [...FOLDN.entries()].filter(([k]) => k.includes(f) || f.includes(k)).map(e => e[1]).slice(0, 3);
  return {err: `đại lý "${v}" không có trong danh mục${near.length ? "; gần nhất: " + near.join(", ") : ""}. Sửa đúng tên hoặc báo Phòng Dữ liệu thêm bí danh`}; }

/* ---------- đọc tệp ---------- */
function parseCsv(text){
  const first = text.split(/\r?\n/).find(l => l.trim()) || ""; const d = [["\t", (first.match(/\t/g) || []).length], [";", (first.match(/;/g) || []).length], [",", (first.match(/,/g) || []).length]].sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], cur = "", q = false;
  for(let i = 0; i < text.length; i++){ const ch = text[i];
    if(q){ if(ch === '"'){ if(text[i + 1] === '"'){ cur += '"'; i++; } else q = false; } else cur += ch; }
    else if(ch === '"') q = true; else if(ch === d){ row.push(cur); cur = ""; } else if(ch === "\n"){ row.push(cur); rows.push(row); row = []; cur = ""; } else if(ch !== "\r") cur += ch; }
  if(cur || row.length){ row.push(cur); rows.push(row); } return rows.filter(r => r.some(c => String(c).trim() !== ""));
}
async function readXlsx(buf){
  const u8 = new Uint8Array(buf), dv = new DataView(buf); let e = u8.length - 22; while(e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--; if(e < 0) throw new Error("Không phải tệp .xlsx hợp lệ");
  const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const files = {};
  for(let i = 0; i < n; i++){ const method = dv.getUint16(p + 10, true), csz = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lho = dv.getUint32(p + 42, true), name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nl)); files[name] = {method, csz, lho}; p += 46 + nl + el + cl; }
  const get = async name => { const f = files[name]; if(!f) return null; const ln = dv.getUint16(f.lho + 26, true), le = dv.getUint16(f.lho + 28, true), st = f.lho + 30 + ln + le, data = u8.subarray(st, st + f.csz);
    if(f.method === 0) return new TextDecoder().decode(data); const out = await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer(); return new TextDecoder().decode(out); };
  const parse = x => new DOMParser().parseFromString(x, "application/xml");
  const ss = await get("xl/sharedStrings.xml"), shared = ss ? [...parse(ss).getElementsByTagName("si")].map(si => [...si.getElementsByTagName("t")].map(t => t.textContent).join("")) : [];
  const sheetName = Object.keys(files).filter(k => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort((a, b) => a.localeCompare(b, "en", {numeric: true}))[0]; if(!sheetName) throw new Error("Không thấy bảng tính trong tệp");
  const doc = parse(await get(sheetName)), rows = [];
  [...doc.getElementsByTagName("row")].forEach(r => { const arr = []; [...r.getElementsByTagName("c")].forEach(c => { const ref = c.getAttribute("r") || "", m = ref.match(/^([A-Z]+)/); if(!m) return; let ci = 0; for(const ch of m[1]) ci = ci * 26 + ch.charCodeAt(0) - 64; ci--;
    const t = c.getAttribute("t"), v = c.getElementsByTagName("v")[0], is = c.getElementsByTagName("is")[0]; let val = "";
    if(t === "s" && v) val = shared[+v.textContent] || ""; else if(t === "inlineStr" && is) val = [...is.getElementsByTagName("t")].map(x => x.textContent).join(""); else if(v) val = t === "str" || t === "b" ? v.textContent : (isNaN(+v.textContent) ? v.textContent : +v.textContent); arr[ci] = val; }); if(arr.some(x => x !== undefined && x !== "")) rows.push(arr.map(x => x === undefined ? "" : x)); });
  return rows;
}
async function readFile(file){ if(/\.xlsx$/i.test(file.name)) return readXlsx(await file.arrayBuffer()); if(/\.xls$/i.test(file.name)) throw new Error("Tệp .xls cũ chưa hỗ trợ: mở bằng Excel, Lưu thành .xlsx hoặc .csv rồi chọn lại"); return parseCsv(await file.text()); }

/* ---------- kiểu dữ liệu ---------- */
function parseDate(v){ if(v == null || v === "") return null;
  if(typeof v === "number" && v > 20000 && v < 80000){ const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 864e5); return d.toISOString().slice(0, 10); }
  const s = String(v).trim(); let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); let y, mo, d;
  if(m){ y = +m[1]; mo = +m[2]; d = +m[3]; } else if((m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/))){ d = +m[1]; mo = +m[2]; y = +m[3]; if(y < 100) y += 2000; } else return null;
  if(mo < 1 || mo > 12 || d < 1 || d > 31) return null; const dt = new Date(Date.UTC(y, mo - 1, d)); if(dt.getUTCMonth() !== mo - 1) return null; return dt.toISOString().slice(0, 10); }
function parseNum(v){ if(typeof v === "number") return v; let s = String(v == null ? "" : v).trim().replace(/[₫đ\s]|VND|vnđ/gi, ""); if(!s) return null; if(/^-?\d+$/.test(s)) return +s;
  const lc = s.lastIndexOf(","), ld = s.lastIndexOf("."); if(lc >= 0 && ld >= 0) s = lc > ld ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, ""); else if(lc >= 0) s = (s.match(/,/g) || []).length > 1 || /,\d{3}$/.test(s) ? s.replace(/,/g, "") : s.replace(",", "."); else if(ld >= 0) s = (s.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(s) ? s.replace(/\./g, "") : s;
  const n = Number(s); return isNaN(n) ? null : n; }
const hash = s => { let h = 2166136261; for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + s.length; };
const daysBetween = (a, b) => Math.round((Date.parse(a) - Date.parse(b)) / 864e5);
const today = () => new Date().toISOString().slice(0, 10);

/* ---------- mẫu cột ---------- */
const TPL = {
  debt: {title: "Công nợ đại lý (trong hạn và quá hạn)", hint: "Mỗi dòng một xe còn nợ. Lấy từ báo cáo công nợ của Kế toán; MBTB chưa có số tiền thì để trống (sẽ ghi cảnh báo).", cols: [
    ["dealer", "Đại lý", ["dai ly", "dealer", "ma dai ly", "ten dai ly"], true, "Tên hoặc mã đại lý (ví dụ ĐT Đông Nam hoặc DTDONGNAM)"],
    ["kind", "Loại hợp đồng", ["loai hop dong", "loai hd", "hop dong", "hdmb mbtb", "loai"], true, "HĐMB hoặc MBTB"],
    ["due", "Ngày đến hạn", ["ngay den han", "han thanh toan", "den han", "due"], true, "Định dạng dd/mm/yyyy"],
    ["amt", "Số tiền còn nợ", ["so tien con no", "con no", "so tien", "amount", "sum of so tien con no"], false, "Số tiền còn nợ của xe (chọn đúng đơn vị bên dưới)"],
    ["model", "Mã xe", ["ma xe", "model", "full ma xe"], false, "Ví dụ IZ50S-2026"],
    ["vin", "Số khung", ["so khung", "vin", "sk"], false, "Không bắt buộc; dùng kiểm trùng, không lưu"]]},
  retail: {title: "Bán lẻ từng xe và ghi nhận doanh thu", hint: "Mỗi dòng một xe bán lẻ. Có đủ ngày thu tiền, giao xe, xuất hóa đơn, giá bán, giá vốn thì hệ thống kiểm tra quy tắc ghi nhận doanh thu (tiền về chưa phải doanh thu).", cols: [
    ["vin", "Số khung", ["so khung", "vin", "sk"], true, "Duy nhất cho mỗi xe"],
    ["dealer", "Đại lý", ["dai ly", "dealer"], true, "Tên hoặc mã đại lý"],
    ["model", "Mã xe", ["ma xe", "model", "dong xe"], false, "Ví dụ IZ65M-PLUS"],
    ["pay", "Ngày thu tiền", ["ngay thu tien", "ngay thanh toan", "ngay tt 100", "ngay thanh toan 100"], false, "Ngày khách thanh toán đủ (hoặc đợt đầu)"],
    ["received", "Số tiền đã thu", ["so tien da thu", "da thu", "tien thu"], false, "Đồng"],
    ["deliver", "Ngày giao xe", ["ngay giao xe", "ngay ban giao", "giao xe"], false, "Ngày bàn giao thực tế"],
    ["invoice", "Ngày xuất hóa đơn", ["ngay xuat hoa don", "ngay hoa don", "hoa don"], false, "Ngày hóa đơn bán lẻ"],
    ["price", "Giá bán gồm VAT", ["gia ban gom vat", "gia ban", "gia tri hoa don", "doanh thu gom vat"], false, "Đồng"],
    ["cogs", "Giá vốn", ["gia von", "cogs"], false, "Đồng"],
    ["record", "Biên bản giao xe", ["bien ban giao xe", "bien ban", "chung tu giao xe"], false, "Có hoặc Không"]]},
  stock: {title: "Tồn xe tại đại lý", hint: "Mỗi dòng một xe đang tồn tại đại lý. Hệ thống đối chiếu số xe từng đại lý với số tồn đang dùng trên bản đồ.", cols: [
    ["dealer", "Đại lý", ["dai ly", "dealer"], true, "Tên hoặc mã đại lý"],
    ["vin", "Số khung", ["so khung", "vin", "sk"], true, "Duy nhất"],
    ["model", "Mã xe", ["ma xe", "model", "dong xe"], false, ""],
    ["kind", "Loại hợp đồng", ["loai hop dong", "loai hd", "hop dong"], false, "HĐMB, MBTB hoặc Ký gửi"],
    ["pay10", "Ngày thanh toán 10%", ["ngay thanh toan 10", "ngay tt 10", "ngay coc"], false, "Để tính tuổi tồn (xe MBTB không có)"]]}};

function mapHeader(rows, cols){
  let best = null; for(let i = 0; i < Math.min(rows.length, 12); i++){ const h = rows[i].map(fold), idx = {}; let hit = 0;
    cols.forEach(([k, , al]) => { let j = h.findIndex(x => al.includes(x)); if(j < 0) j = h.findIndex(x => x && al.some(a => x.includes(a) || (x.length > 3 && a.includes(x)))); if(j >= 0){ idx[k] = j; hit++; } });
    if(!best || hit > best.hit) best = {row: i, idx, hit}; }
  return best;
}

/* ---------- kiểm tra từng loại ---------- */
function validate(kind, rows, opt){
  const T = TPL[kind], H = mapHeader(rows, T.cols), res = {kind, errs: [], warns: [], ok: [], info: [], total: 0, missingCols: []};
  const need = T.cols.filter(c => c[3] && !(c[0] in H.idx)).map(c => c[1]);
  if(need.length){ res.missingCols = need; res.errs.push({row: H.row + 1, msg: `Thiếu cột bắt buộc: ${need.join(", ")}. Dòng tiêu đề tìm thấy ở dòng ${H.row + 1}. Hãy đặt đúng tên cột như trong mẫu.`}); return res; }
  const asOf = opt.asOf || today(), seen = new Set(), E = (r, m) => res.errs.push({row: r, msg: m}), W = (r, m) => res.warns.push({row: r, msg: m});
  const unit = opt.unit || 1, vat = (opt.vat == null ? 10 : opt.vat) / 100;
  for(let i = H.row + 1; i < rows.length; i++){
    const raw = rows[i], r = i + 1, g = k => k in H.idx ? raw[H.idx[k]] : undefined; if(!raw.some(c => String(c).trim() !== "")) continue; res.total++;
    const bad0 = res.errs.length, rec = {};
    const dl = dealerOf(g("dealer")); if(dl.err) E(r, dl.err); else rec.dealer = dl.v;
    if("vin" in H.idx){ const v = String(g("vin") || "").trim().toUpperCase(); if(!v){ if(T.cols.find(c => c[0] === "vin")[3]) E(r, "thiếu số khung: mỗi xe phải có đúng một số khung"); } else { if(v.length < 11 || v.length > 20) W(r, "số khung có độ dài lạ (" + v.length + " ký tự), kiểm tra lại"); const h = hash(v); if(seen.has(h)) E(r, "số khung trùng với dòng trước: một số khung chỉ được ghi một lần (tránh trùng doanh thu, trùng tồn)"); seen.add(h); rec.vh = h; } }
    if(kind === "debt"){
      const k = fold(g("kind")); rec.kind = /^(hdmb|mb|mua ban|hop dong mua ban)$/.test(k) ? "MB" : /^(mbtb|mua ban trung bay|trung bay)$/.test(k) ? "MBTB" : null; if(!rec.kind) E(r, `loại hợp đồng "${g("kind")}" không hợp lệ: chỉ HĐMB hoặc MBTB`);
      rec.due = parseDate(g("due")); if(!rec.due) E(r, `ngày đến hạn "${g("due")}" không đọc được: dùng dd/mm/yyyy`); else if(daysBetween(rec.due, asOf) > 400) W(r, "ngày đến hạn xa hơn 400 ngày so với ngày số liệu");
      const a = parseNum(g("amt")); if(a == null){ if(rec.kind === "MB") E(r, "xe HĐMB thiếu số tiền còn nợ"); else { rec.amt = 0; W(r, "MBTB chưa có số tiền: không tính vào dư nợ, bổ sung số tiền hoặc dùng ước = giá bán × 95%"); } } else if(a < 0) E(r, "số tiền còn nợ âm"); else { rec.amt = a * unit / 1e6; if(rec.amt > 2000) W(r, "số tiền lớn bất thường cho một xe (" + fmt1(rec.amt) + " triệu): kiểm tra đơn vị"); }
    }
    if(kind === "stock"){
      const k = fold(g("kind")); rec.kind = /^(hdmb|mb|mua ban)$/.test(k) || !k ? (k ? "MB" : "MB") : /^(mbtb|trung bay)$/.test(k) ? "MBTB" : /^(ky gui|kg)$/.test(k) ? "KG" : null; if(!rec.kind) E(r, `loại hợp đồng "${g("kind")}" không hợp lệ: HĐMB, MBTB hoặc Ký gửi`);
      const p = g("pay10"); rec.pay10 = p === "" || p == null ? null : parseDate(p); if(p !== "" && p != null && !rec.pay10) E(r, `ngày thanh toán 10% "${p}" không đọc được`); else if(rec.pay10 && daysBetween(rec.pay10, asOf) > 0) E(r, "ngày thanh toán 10% nằm sau ngày số liệu");
      if(rec.kind === "MB" && !rec.pay10) W(r, "xe HĐMB thiếu ngày thanh toán 10%: không tính được tuổi tồn");
    }
    if(kind === "retail"){
      ["pay", "deliver", "invoice"].forEach(k => { const v = g(k); if(v === "" || v == null) return; rec[k] = parseDate(v); if(!rec[k]) E(r, `ngày "${v}" ở cột ${T.cols.find(c => c[0] === k)[1]} không đọc được`); else if(daysBetween(rec[k], asOf) > 0) E(r, `ngày ở cột ${T.cols.find(c => c[0] === k)[1]} nằm sau ngày số liệu ${asOf}`); else if(rec[k] < "2020-01-01") E(r, `ngày ở cột ${T.cols.find(c => c[0] === k)[1]} quá cũ`); });
      ["received", "price", "cogs"].forEach(k => { const v = g(k); if(v === "" || v == null) return; const n = parseNum(v); if(n == null) E(r, `"${v}" ở cột ${T.cols.find(c => c[0] === k)[1]} không phải số`); else if(n < 0) E(r, `số âm ở cột ${T.cols.find(c => c[0] === k)[1]}: dùng bút toán điều chỉnh, không nhập âm`); else rec[k] = n * unit; });
      const rc = fold(g("record")); rec.record = /^(co|c|y|yes|x|1|du)$/.test(rc);
      // quy tắc ghi nhận doanh thu
      if(rec.invoice && !rec.deliver) E(r, "RR-02: đã xuất hóa đơn nhưng chưa có ngày giao xe: không ghi nhận doanh thu khi chưa bàn giao (khóa: không hóa đơn khi chưa có sự kiện giao xe)");
      if(rec.deliver && rec.invoice && rec.invoice < rec.deliver) W(r, "RR-02: hóa đơn xuất trước ngày giao xe: đối chiếu thời điểm chuyển giao quyền kiểm soát");
      if(rec.deliver && !rec.invoice) W(r, "RR-03: đã giao xe nhưng chưa có hóa đơn, chưa ghi nhận doanh thu: bổ sung hóa đơn (tránh thiếu doanh thu)");
      if(rec.deliver && rec.invoice && (rec.cogs == null)) E(r, "RR-04: có doanh thu nhưng thiếu giá vốn: lợi nhuận bị tăng giả; nhập giá vốn xuất kho theo số khung");
      if(rec.deliver && rec.invoice && rec.price == null) E(r, "thiếu giá bán gồm VAT: không tính được doanh thu");
      if(rec.deliver && !rec.record) W(r, "RR-06: giao xe nhưng thiếu biên bản giao nhận: rủi ro kiểm toán, tranh chấp");
      if(rec.deliver && !(rec.pay || rec.received)) W(r, "đã giao xe nhưng chưa có ghi nhận thu tiền: phát sinh công nợ phải thu");
      if(rec.price != null && rec.cogs != null && rec.cogs > rec.price / (1 + vat) * 1.3) W(r, "giá vốn cao hơn doanh thu chưa VAT trên 30%: kiểm tra giá vốn hoặc giá bán");
    }
    if(res.errs.length === bad0) res.ok.push(rec);
  }
  res.good = res.ok.length; res.asOf = asOf; res.unit = unit; res.vat = vat; return res;
}

/* ---------- tổng hợp ---------- */
function aggDebt(ok, asOf, srcName){
  const mk = () => ({n: 0, amt: 0, over: 0, overAmt: 0, b: {}, bAmt: {}, max: 0, f: {}}), D = {}, bucket = d => d <= 0 ? "trong hạn" : d <= 30 ? "1–30" : d <= 60 ? "31–60" : d <= 90 ? "61–90" : "> 90", fw = d => { const r = -d; return r <= 7 ? "0–7" : r <= 30 ? "8–30" : r <= 60 ? "31–60" : r <= 90 ? "61–90" : "> 90"; };
  ok.forEach(x => { const d = D[x.dealer] = D[x.dealer] || {name: x.dealer, MB: mk(), MBTB: mk(), models: {}}, z = d[x.kind], days = daysBetween(asOf, x.due), b = bucket(days);
    z.n++; z.amt += x.amt; z.b[b] = (z.b[b] || 0) + 1; z.bAmt[b] = (z.bAmt[b] || 0) + x.amt; z.max = Math.max(z.max, days); if(days <= 0) z.f[fw(days)] = (z.f[fw(days)] || 0) + x.amt; if(days > 0){ z.over++; z.overAmt += x.amt; } });
  const rows = Object.values(D).map(d => { ["MB", "MBTB"].forEach(k => { const z = d[k]; z.amt = Math.round(z.amt); z.overAmt = Math.round(z.overAmt); Object.keys(z.bAmt).forEach(b => z.bAmt[b] = Math.round(z.bAmt[b])); Object.keys(z.f).forEach(b => z.f[b] = Math.round(z.f[b])); }); d.total = d.MB.amt + d.MBTB.amt; d.over = d.MB.overAmt + d.MBTB.overAmt; return d; }).sort((a, b) => b.over - a.over);
  const T = k => ({n: sum(rows.map(d => d[k].n)), amt: sum(rows.map(d => d[k].amt)), over: sum(rows.map(d => d[k].over)), overAmt: sum(rows.map(d => d[k].overAmt))});
  const mer = (k, f) => rows.reduce((a, d) => { Object.entries(d[k][f]).forEach(([b, v]) => a[b] = (a[b] || 0) + v); return a; }, {});
  const base = CV.debtBase() || {};
  return {asOf, source: srcName, terms: base.terms, note: "Số nhập từ tệp; MBTB không có số tiền không tính vào dư nợ.", MB: T("MB"), MBTB: T("MBTB"), buckets: {MB: mer("MB", "b"), MBTB: mer("MBTB", "b")}, bucketsAmt: {MB: mer("MB", "bAmt"), MBTB: mer("MBTB", "bAmt")}, dueAmt: {MB: mer("MB", "f"), MBTB: mer("MBTB", "f")}, dealers: rows, unmapped: {}, guess: {}, noPrice: {}, fromInput: true};
}
function aggRetail(ok, asOf, vat){
  let cash = 0, rev = 0, cogs = 0, adv = 0, nRec = 0, nAdv = 0, nOpen = 0; const by = {};
  ok.forEach(x => { cash += x.received || 0; const rec = x.deliver && x.invoice && x.price != null && x.cogs != null; const d = by[x.dealer] = by[x.dealer] || {n: 0, rec: 0};
    d.n++; if(rec){ nRec++; d.rec++; rev += x.price / (1 + vat); cogs += x.cogs; } else if(!x.deliver && (x.received || x.pay)){ nAdv++; adv += x.received || 0; } else nOpen++; });
  return {asOf, n: ok.length, nRec, nAdv, nOpen, cash: Math.round(cash / 1e6), rev: Math.round(rev / 1e6), cogs: Math.round(cogs / 1e6), gp: Math.round((rev - cogs) / 1e6), adv: Math.round(adv / 1e6), vat, byDealer: by};
}
function aggStock(ok, asOf){
  const by = {}; ok.forEach(x => { const d = by[x.dealer] = by[x.dealer] || {ton: 0, mb: 0, mbtb: 0, kg: 0, age: {"0-90": 0, "91-180": 0, "181-365": 0, ">365": 0}}; d.ton++; d[x.kind.toLowerCase()]++; if(x.pay10){ const a = daysBetween(asOf, x.pay10); d.age[a <= 90 ? "0-90" : a <= 180 ? "91-180" : a <= 365 ? "181-365" : ">365"]++; } });
  return {asOf, n: ok.length, by};
}

/* ---------- giao diện ---------- */
const dlg = document.createElement("dialog"); dlg.className = "odlg"; dlg.id = "inDlg"; dlg.style.width = "min(1180px,98vw)"; dlg.setAttribute("aria-labelledby", "inT");
dlg.innerHTML = `<header><h3 id="inT">Nhập dữ liệu nội bộ</h3><div id="inTabs" style="display:flex;gap:6px;flex-wrap:wrap"></div><button type="button" id="inUpd" title="Rút số mới nhất đã công bố từ mạng">Cập nhật từ mạng</button><button type="button" class="x" data-close>Đóng</button></header><div class="body" id="inBody"></div>`;
document.body.appendChild(dlg);
const TABS = [["fin", "Tài chính, dòng tiền"], ["debt", "Công nợ đại lý"], ["retail", "Bán lẻ, doanh thu"], ["stock", "Tồn đại lý"], ["hist", "Dữ liệu đã nhập"]];
let tab = "fin", last = {};
const dateVN = s => s ? s.split("-").reverse().join("/") : "";
function tabsHtml(){ dlg.querySelector("#inTabs").innerHTML = TABS.map(([k, t]) => `<button type="button" data-tab="${k}" aria-pressed="${k === tab}" class="${k === tab ? "primary" : ""}">${t}</button>`).join(""); }
function finHtml(){
  const f = CV.store.get("fin") || {}, meta = CV.store.get("finMeta") || {};
  return `<p class="muted small">Phòng Tài chính nhập số thực tế; <b>để trống nếu chưa có</b> (hệ thống ghi "chưa có số", không tự đặt bằng 0). Đơn vị: <b>triệu đồng</b>. Số lưu trên máy này và dùng cho Dashboard dòng tiền.</p>
  <label class="field small" style="max-width:240px">Ngày số liệu <input type="date" id="finAsOf" value="${esc(meta.asOf || today())}"></label>
  <div class="hudgrid" style="margin-top:8px">${FIELDS_HTML(f)}</div>
  <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><button type="button" id="finSave" class="primary">Kiểm tra và lưu</button><button type="button" id="finClear">Xóa số đã nhập</button></div><div id="finMsg" style="margin-top:8px"></div>`;
}
function FIELDS_HTML(f){ return CV.finFields.map(([k, l, h]) => `<label class="field small" style="grid-column:span 4" title="${esc(h)}">${esc(l)}<input type="number" step="any" data-f="${k}" value="${f[k] == null ? "" : esc(f[k])}" placeholder="chưa có số">${h ? `<span class="tiny muted">${esc(h)}</span>` : ""}</label>`).join(""); }
function fileHtml(kind){
  const T = TPL[kind];
  return `<p class="muted small">${esc(T.hint)}</p>
  <table class="tasktbl small"><thead><tr><th>Cột</th><th>Bắt buộc</th><th>Cách điền</th></tr></thead><tbody>${T.cols.map(c => `<tr><td><b>${esc(c[1])}</b></td><td>${c[3] ? "Có" : "Không"}</td><td class="tiny">${esc(c[4])}</td></tr>`).join("")}</tbody></table>
  <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin:10px 0">
   <label class="field small">Chọn tệp (.xlsx, .csv)<input type="file" id="inFile" accept=".xlsx,.csv,.tsv,.txt"></label>
   <label class="field small">Ngày số liệu<input type="date" id="inAsOf" value="${today()}"></label>
   <label class="field small">Đơn vị tiền trong tệp<select id="inUnit"><option value="1">đồng</option><option value="1000">nghìn đồng</option><option value="1000000">triệu đồng</option></select></label>
   ${kind === "retail" ? `<label class="field small">VAT (%) để tách doanh thu<input type="number" id="inVat" value="10" min="0" max="20" step="1" style="width:80px"></label>` : ""}
   <button type="button" id="inTpl">Tải mẫu CSV</button></div>
  <label class="field small">Hoặc dán bảng từ Excel (cả dòng tiêu đề)<textarea id="inPaste" rows="4" style="width:100%" placeholder="Dán nội dung đã sao chép từ Excel"></textarea></label>
  <div style="margin:8px 0;display:flex;gap:8px;flex-wrap:wrap"><button type="button" id="inCheck" class="primary">Kiểm tra dữ liệu</button><button type="button" id="inApply" disabled>Áp dụng</button><label class="small" style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="inPart">Chỉ nhận các dòng hợp lệ, loại dòng lỗi</label></div><div id="inRes"></div>`;
}
function histHtml(){
  const ks = CV.store.keys(); const lab = {fin: "Số tài chính", debt: "Công nợ đại lý", rr: "Bán lẻ, doanh thu (tổng hợp)", stock: "Tồn đại lý (tổng hợp)", assume: "Giả định dòng tiền", finMeta: "Ngày số tài chính", packs: "Bản cập nhật từ mạng", grab: "Tùy chọn"};
  return `<p class="muted small">Dữ liệu nhập lưu ngay trên trình duyệt này (không gửi đi đâu). Số khung không được lưu. Xóa để quay về dữ liệu gốc của bản đồ.</p><table class="tasktbl small"><thead><tr><th>Bộ dữ liệu</th><th>Ngày số liệu</th><th class="num">Dung lượng</th><th></th></tr></thead><tbody>${ks.map(k => { const v = CV.store.get(k), sz = JSON.stringify(v || "").length; return `<tr><td>${esc(lab[k] || k)}</td><td>${esc(dateVN((v && (v.asOf || v.updated)) || ""))}</td><td class="num">${fmtInt(sz / 1024)} KB</td><td><button type="button" data-del="${esc(k)}">Xóa</button></td></tr>`; }).join("") || '<tr><td colspan="4" class="muted">Chưa nhập gì: bản đồ đang dùng dữ liệu gốc.</td></tr>'}</tbody></table>
  <div style="margin-top:10px;display:flex;gap:8px"><button type="button" id="hExp">Xuất sao lưu (JSON)</button><label class="small">Khôi phục <input type="file" id="hImp" accept=".json"></label></div>`;
}
function render(){ tabsHtml(); const b = dlg.querySelector("#inBody"); b.innerHTML = tab === "fin" ? finHtml() : tab === "hist" ? histHtml() : fileHtml(tab); last = {}; }
function open(t){ if(t && TABS.some(x => x[0] === t)) tab = t; render(); if(!dlg.open) dlg.showModal(); }
CV.openInput = open;
async function getRows(){ const file = dlg.querySelector("#inFile").files[0], paste = dlg.querySelector("#inPaste").value; if(file) return {rows: await readFile(file), name: file.name}; if(paste.trim()) return {rows: parseCsv(paste), name: "dữ liệu dán"}; throw new Error("Chưa chọn tệp hoặc dán dữ liệu"); }
function resHtml(r){
  const bl = r.errs.length, wn = r.warns.length;
  return `<div class="stats num">${[[fmtInt(r.total), "dòng dữ liệu"], [fmtInt(r.good), "dòng hợp lệ"], [fmtInt(bl), "lỗi chặn"], [fmtInt(wn), "cảnh báo"]].map(([v, l]) => `<div class="stat"><div class="v" style="color:${l === "lỗi chặn" && v !== "0" ? "#ff6b6b" : ""}">${v}</div><div class="l">${l}</div></div>`).join("")}</div>
  ${bl ? `<h4 style="margin:10px 0 4px;color:#ff6b6b">Lỗi chặn (không áp dụng khi còn lỗi, trừ khi chọn chỉ nhận dòng hợp lệ)</h4><table class="tasktbl small"><thead><tr><th class="num">Dòng</th><th>Lỗi và cách sửa</th></tr></thead><tbody>${r.errs.slice(0, 60).map(e => `<tr><td class="num">${e.row}</td><td class="tiny">${esc(e.msg)}</td></tr>`).join("")}</tbody></table>${bl > 60 ? `<p class="tiny muted">Còn ${bl - 60} lỗi nữa.</p>` : ""}` : ""}
  ${wn ? `<h4 style="margin:10px 0 4px;color:#ffc35a">Cảnh báo</h4><table class="tasktbl small"><tbody>${r.warns.slice(0, 40).map(e => `<tr><td class="num">${e.row}</td><td class="tiny">${esc(e.msg)}</td></tr>`).join("")}</tbody></table>${wn > 40 ? `<p class="tiny muted">Còn ${wn - 40} cảnh báo nữa.</p>` : ""}` : ""}`;
}
function previewHtml(kind, r, agg){
  const ty = x => fmt1(x / 1000) + " tỷ";
  if(kind === "debt"){ const b = CV.debtBase(); return `<h4 style="margin:10px 0 4px">Đối chiếu với số đang dùng (${esc(dateVN(b.asOf))})</h4><table class="tasktbl small"><thead><tr><th></th><th class="num">Hiện tại</th><th class="num">Sau khi nhập</th><th class="num">Chênh</th></tr></thead><tbody>${[["Số xe còn nợ", b.MB.n + b.MBTB.n, agg.MB.n + agg.MBTB.n, 1], ["Dư nợ", b.MB.amt + b.MBTB.amt, agg.MB.amt + agg.MBTB.amt], ["Nợ quá hạn", b.MB.overAmt + b.MBTB.overAmt, agg.MB.overAmt + agg.MBTB.overAmt]].map(([n, a, c, x]) => `<tr><td>${n}</td><td class="num">${x ? fmtInt(a) : ty(a)}</td><td class="num">${x ? fmtInt(c) : ty(c)}</td><td class="num">${x ? fmtInt(c - a) : ty(c - a)}</td></tr>`).join("")}</tbody></table>`; }
  if(kind === "retail"){ const rr = agg; return `<h4 style="margin:10px 0 4px">Bốn con số khác bản chất (không đánh đồng)</h4><table class="tasktbl small"><thead><tr><th>Số</th><th class="num">Giá trị</th><th>Cách tính</th></tr></thead><tbody>
    <tr><td><b>Tiền thu (Cash)</b></td><td class="num">${ty(rr.cash)}</td><td class="tiny">Tổng số tiền đã thu, kể cả khách trả trước</td></tr>
    <tr><td><b>Doanh thu (Revenue)</b></td><td class="num">${ty(rr.rev)}</td><td class="tiny">${rr.nRec} xe đã giao + có hóa đơn + có giá vốn; giá bán trừ VAT ${fmt1(rr.vat * 100)}%</td></tr>
    <tr><td><b>Giá vốn (COGS)</b></td><td class="num">${ty(rr.cogs)}</td><td class="tiny">Giá vốn các xe đã ghi nhận doanh thu</td></tr>
    <tr><td><b>Lợi nhuận gộp</b></td><td class="num">${ty(rr.gp)}</td><td class="tiny">Doanh thu trừ giá vốn</td></tr>
    <tr><td>Khách trả trước (chưa phải doanh thu)</td><td class="num">${ty(rr.adv)}</td><td class="tiny">${rr.nAdv} xe đã thu tiền nhưng chưa giao</td></tr>
    <tr><td>Xe chưa đủ điều kiện đóng giao dịch</td><td class="num">${fmtInt(rr.nOpen)} xe</td><td class="tiny">Thiếu một trong: thu tiền, số khung, giao xe, hóa đơn, giá vốn</td></tr></tbody></table>`; }
  if(kind === "stock"){ const rows = Object.entries(agg.by).map(([n, d]) => {
      const bs = (CV.inv ? CV.inv.dealers : []).filter(x => x.link === n || x.name === n), base = sum(bs.map(x => x.ton)); return [n, base, d.ton, d.ton - base]; }).sort((a, b) => Math.abs(b[3]) - Math.abs(a[3]));
    return `<h4 style="margin:10px 0 4px">Đối chiếu tồn từng đại lý với số đang dùng</h4><table class="tasktbl small"><thead><tr><th>Đại lý</th><th class="num">Hiện tại</th><th class="num">Sau nhập</th><th class="num">Chênh</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r[0])}</td><td class="num">${r[1]}</td><td class="num">${r[2]}</td><td class="num" style="color:${r[3] ? "#ffc35a" : ""}">${r[3] > 0 ? "+" : ""}${r[3]}</td></tr>`).join("")}</tbody></table>`; }
  return "";
}
dlg.addEventListener("click", async e => {
  const t = e.target; if(t.closest("[data-close]")) return dlg.close();
  if(t.dataset && t.dataset.tab){ tab = t.dataset.tab; return render(); }
  if(t.id === "inUpd"){ if(CV.updatePacks) CV.updatePacks(); return; }
  if(t.id === "finSave"){ const f = {}, errs = [], msg = dlg.querySelector("#finMsg");
    dlg.querySelectorAll("[data-f]").forEach(i => { const v = i.value.trim(); if(v === "") return; const n = Number(v); if(isNaN(n)) errs.push(`${i.dataset.f}: "${v}" không phải số`); else if(i.dataset.f !== "rate" && n < 0) errs.push(`${CV.finFields.find(x => x[0] === i.dataset.f)[1]}: số âm; nhập số dương (chiều thu hay chi đã được hệ thống tự hiểu)`); else if(i.dataset.f === "rate" && (n < 0 || n > 40)) errs.push("Lãi suất ngoài khoảng 0–40%/năm"); else f[i.dataset.f] = n; });
    const w = []; const dsum = (f.debt30 || 0) + (f.debt60 || 0) + (f.debt90 || 0); if(f.stDebt != null && dsum > f.stDebt * 1.3) w.push("Tổng nợ vay đến hạn trong 90 ngày lớn hơn dư nợ vay ngắn hạn 30%: kiểm tra đơn vị hoặc phân kỳ");
    if(f.cash != null && f.cash > 5e5) w.push("Tiền mặt trên 500.000 triệu (500 tỷ): kiểm tra đơn vị (triệu đồng)");
    if(errs.length){ msg.innerHTML = `<b style="color:#ff6b6b">Chưa lưu. Sửa:</b><ul>${errs.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`; return; }
    CV.store.set("fin", f); CV.store.set("finMeta", {asOf: dlg.querySelector("#finAsOf").value, updated: today()}); msg.innerHTML = `<b style="color:#4ee2a0">Đã lưu ${Object.keys(f).length}/${CV.finFields.length} trường.</b>${w.length ? `<ul>${w.map(x => `<li style="color:#ffc35a">${esc(x)}</li>`).join("")}</ul>` : ""} Mở Dashboard dòng tiền để xem.`; return; }
  if(t.id === "finClear"){ CV.store.del("fin"); CV.store.del("finMeta"); render(); return; }
  if(t.id === "inTpl"){ const T = TPL[tab], csv = T.cols.map(c => c[1]).join(",") + "\n"; const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + csv], {type: "text/csv"})); a.download = "mau_" + tab + ".csv"; a.click(); return; }
  if(t.id === "inCheck"){ const out = dlg.querySelector("#inRes"); out.innerHTML = '<p class="muted">Đang kiểm tra…</p>'; try{
      const {rows, name} = await getRows(); const opt = {asOf: dlg.querySelector("#inAsOf").value, unit: +dlg.querySelector("#inUnit").value, vat: dlg.querySelector("#inVat") ? +dlg.querySelector("#inVat").value : 10};
      const r = validate(tab, rows, opt); let agg = null, prev = ""; if(r.good){ agg = tab === "debt" ? aggDebt(r.ok, opt.asOf, name) : tab === "retail" ? aggRetail(r.ok, opt.asOf, opt.vat / 100) : aggStock(r.ok, opt.asOf); prev = previewHtml(tab, r, agg); }
      last = {kind: tab, r, agg, opt, name}; out.innerHTML = resHtml(r) + prev; dlg.querySelector("#inApply").disabled = !(r.good && (!r.errs.length || dlg.querySelector("#inPart").checked));
    }catch(err){ out.innerHTML = `<p style="color:#ff6b6b"><b>Không đọc được:</b> ${esc(err.message)}</p>`; } return; }
  if(t.id === "inApply" && last.agg){ const {kind, agg, r, name} = last; if(r.errs.length && !dlg.querySelector("#inPart").checked) return;
    if(kind === "debt") CV.store.set("debt", agg); if(kind === "retail"){ const rr = Object.assign({}, agg); delete rr.byDealer; rr.source = name; rr.rules = {err: r.errs.length, warn: r.warns.length}; CV.store.set("rr", rr); const f = CV.store.get("fin") || {}; if(f.adv == null){ f.adv = agg.adv; CV.store.set("fin", f); } }
    if(kind === "stock"){ agg.source = name; CV.store.set("stock", agg); }
    dlg.querySelector("#inRes").insertAdjacentHTML("afterbegin", `<p style="color:#4ee2a0"><b>Đã áp dụng ${fmtInt(r.good)} dòng${r.errs.length ? ", loại " + r.errs.length + " dòng lỗi" : ""}.</b> ${kind === "debt" ? "Dashboard dòng tiền đã dùng số công nợ mới." : "Xem kết quả tại Trung tâm kiểm soát dữ liệu."}</p>`); dlg.querySelector("#inApply").disabled = true; return; }
  if(t.dataset && t.dataset.del){ CV.store.del(t.dataset.del); render(); return; }
  if(t.id === "hExp"){ const o = {}; CV.store.keys().forEach(k => o[k] = CV.store.get(k)); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(o)], {type: "application/json"})); a.download = "dac_du_lieu_nhap_" + today() + ".json"; a.click(); }
});
dlg.addEventListener("change", async e => { if(e.target.id === "hImp"){ try{ const o = JSON.parse(await e.target.files[0].text()); Object.entries(o).forEach(([k, v]) => CV.store.set(k, v)); render(); }catch(err){ alert("Tệp sao lưu không hợp lệ"); } } if(e.target.id === "inPart" && last.r) dlg.querySelector("#inApply").disabled = !(last.r.good && (!last.r.errs.length || e.target.checked)); });
const tools = document.querySelector(".maptools"); if(tools){ const b = document.createElement("button"); b.type = "button"; b.id = "btnInput"; b.textContent = "Nhập dữ liệu"; b.title = "Cổng nhập dữ liệu nội bộ: số tài chính, công nợ, bán lẻ, tồn"; b.addEventListener("click", () => open()); const c = document.getElementById("btnCash"); c ? c.after(b) : tools.prepend(b); }
CV.validateData = validate; CV.parseTable = parseCsv;
CV.tools.push({name: "nhap_du_lieu", label: "Đang mở cổng nhập dữ liệu…", description: "Mở cổng nhập dữ liệu nội bộ để Phòng Tài chính, Kế toán, Kinh doanh nhập số tài chính (tiền mặt, nợ vay, phải trả, thuế…), tệp công nợ, bán lẻ từng xe, tồn đại lý; hệ thống kiểm tra lỗi và đối chiếu trước khi áp dụng. loai: fin, debt, retail, stock.", inputSchema: {type: "object", properties: {loai: {type: "string"}}}, execute: ({loai}) => { open(loai); return "Đã mở cổng **Nhập dữ liệu nội bộ**" + (loai ? " ở mục " + loai : "") + ". Mọi tệp được kiểm tra: thiếu cột, ngày sai, trùng số khung, tên đại lý, quy tắc ghi nhận doanh thu; lỗi nào cũng kèm cách sửa."; }});
CV.localHooks.unshift(raw => /nhập (dữ liệu|số liệu)|tải (tệp|file) công nợ/i.test(raw) ? (open(), "Đã mở cổng **Nhập dữ liệu nội bộ**: chọn Tài chính, Công nợ, Bán lẻ hoặc Tồn đại lý.") : null);
})();
