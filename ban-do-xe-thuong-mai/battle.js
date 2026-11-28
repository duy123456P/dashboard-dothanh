/* ===== Chiến trường 2D (Phòng chiến lược): đối thủ, đại lý Đô Thành, khách hàng, điểm đề xuất mở mới; bấm điểm → Google Maps; đề xuất chiến lược từng mặt trận =====
   Dữ liệu: điểm bán đối thủ có tọa độ (Daehan, Oto360, website hãng; tọa độ cấp phường/xã), mạng lưới Đô Thành, khách tiềm năng (OSM, chiến dịch MKT 2027), khách đã mua theo huyện.
   Chiến lược sinh bằng quy tắc minh bạch từ số liệu thật; chỗ nào chưa có dữ liệu (CI, chính sách chi tiết) ghi rõ "chưa có dữ liệu". */
(function(){
"use strict";
const CV = window.__CV; if(!CV || !CV.CNET) return;
const {esc, fmtInt, fmt1} = CV, sum = a => a.reduce((x, y) => x + (y || 0), 0);
const fold = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const rad = x => x * Math.PI / 180, KM = (a, b, c, d) => { const dl = rad(c - a), dp = rad(d - b), x = Math.sin(dp / 2) ** 2 + Math.cos(rad(b)) * Math.cos(rad(d)) * Math.sin(dl / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
const gm = (lat, lng, q) => "https://www.google.com/maps/search/?api=1&query=" + (q ? encodeURIComponent(q) : lat.toFixed(6) + "," + lng.toFixed(6));
let C = []; try{ C = JSON.parse(document.getElementById("comp-data").textContent).brands || []; }catch(e){}
const CB = k => C.find(b => b.k === k) || {};
const BR = CV.CNET.brands || {}, DT = "#3f6bff", NEWC = "#ffd400";
let BM = {brands: {}}; try{ BM = JSON.parse(document.getElementById("bmedia-data").textContent); }catch(e){}
const bm = k => (BM.brands || {})[k] || null;
const VB = {web: ["Đã đối chiếu website chính thức", "#4ee2a0"], bao: ["Theo báo, tìm kiếm: cần đối chiếu", "#ffb020"]};
const logoImg = (k, h) => { const b = bm(k); return b && b.logo ? `<img src="${b.logo}" alt="Logo ${esc(b.name)}" style="height:${h || 20}px;max-width:${(h || 20) * 4}px;object-fit:contain;vertical-align:middle;background:#fff;border-radius:4px;padding:2px 4px">` : `<b style="color:${brandCol(k)}">${esc((BR[k] || {}).name || (bm(k) || {}).name || k)}</b>`; };
const srch = (q, p) => p === "yt" ? "https://www.youtube.com/results?search_query=" + encodeURIComponent(q) : p === "tt" ? "https://www.tiktok.com/search?q=" + encodeURIComponent(q) : "https://www.facebook.com/search/top?q=" + encodeURIComponent(q);
const lnk = (u, t, v) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer" ${v ? `title="${esc((VB[v] || [""])[0])}"` : ""}>${esc(t)}</a>${v === "bao" ? '<sup style="color:#ffb020" title="Theo báo, tìm kiếm: cần đối chiếu">*</sup>' : ""}`;
const PLAN = () => (CV.plan27 && CV.plan27.dealerPlan) || {dealers: [], newL1: []};

/* ---------- dữ liệu điểm ---------- */
let _comps = null;
function compPoints(){ if(_comps) return _comps; const out = [];
  CV.CNET.dealers.forEach(d => out.push({b: d.b, name: d.name, addr: d.addr || "", type: d.type || "", svc: !!d.svc, phone: d.phone || "", lat: d.lat, lng: d.lng, province: d.province, map: d.map || ""}));
  CV.CNET.points.filter(p => p.b !== "teraco").forEach(p => { if(out.some(o => o.b === p.b && KM(o.lng, o.lat, p.lng, p.lat) < 0.3)) return; out.push({b: p.b, name: p.name, addr: p.addr || "", type: p.type || "", svc: /xưởng|bảo hành|3S/i.test(p.type || ""), phone: "", lat: p.lat, lng: p.lng, province: p.province, map: ""}); });
  return _comps = out.filter(p => p.lat && p.lng); }
function ownPoints(){ return CV.NET.dealers.map(d => ({k: "dt", name: d.salesKey || d.name, full: d.name, tier: d.tier, addr: d.addr || d.address || "", phone: d.phone || "", lat: d.lat, lng: d.lng, province: d.province, gm: d.gm})); }
function stationPoints(){ return CV.NET.stations.map(d => ({k: "st", name: d.name, addr: d.addr || d.address || "", lat: d.lat, lng: d.lng, province: d.province, gm: d.gm})); }
let _new = null;
function newPoints(){ if(_new) return _new; const nodes = ((CV.INFRA || {}).nodes) || [], own = ownPoints();
  return _new = PLAN().newL1.map((n, i) => { const [name, province, mode, from, anchor, open, sh0, sh1] = n; let lat, lng, src = "";
    if(from){ const o = own.find(x => fold(x.full) === fold(from)) || own.find(x => fold(x.full).includes(fold(from)) || fold(from).includes(fold(x.full))); if(o){ lat = o.lat; lng = o.lng; src = "vị trí đại lý cấp 2 hiện có"; } }
    if(lat == null && anchor){ if(Array.isArray(anchor)){ lng = anchor[0]; lat = anchor[1]; src = "tâm khu vực dự kiến"; } else { const nd = nodes.find(x => x.name === anchor); if(nd){ lat = nd.lat; lng = nd.lng; src = "gần " + anchor + " (vị trí dự kiến)"; } } }
    return lat == null ? null : {k: "new", id: i, name, province, mode, open, sh0, sh1, lat, lng, src, addr: src}; }).filter(Boolean); }
function custPoints(){ const out = []; ((CV.CUST || {}).prospects || []).forEach(p => p.lat && out.push({k: "kh", name: p.name, ind: p.ind || "", area: p.area || "", phone: p.phone || "", lat: p.lat, lng: p.lng, province: p.province, hot: false, src: "OSM"}));
  ((CV.MKT || {}).prospects || []).forEach(p => p.lat != null && out.push({k: "kh", name: p.name, ind: p.ind || "", area: p.area || "", phone: p.phone || "", lat: p.lat, lng: p.lng, province: p.province, hot: !!p.hot, src: "MKT 2027", exact: !!p.exact})); return out; }
function buyerPoints(){ return (((CV.CUST || {}).buyers || {}).districts || []).filter(d => d.lat != null).map(d => ({k: "mua", name: d.dist, province: d.province, n: d.n, org: d.org || 0, lat: d.lat, lng: d.lng})); }

/* ---------- bản đồ nền ---------- */
let GEO = null; try{ GEO = JSON.parse(document.getElementById("geo-data").textContent); }catch(e){}
const polys = name => ((GEO || {features: []}).features.filter(f => f.properties && f.properties.name === name).flatMap(f => f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates]));
const allProv = () => (GEO ? GEO.features.filter(f => f.properties && f.properties.name && !/__VN__|Quần đảo/.test(f.properties.name)) : []);
const bboxOf = rings => rings.reduce((b, r) => r.reduce((a, [x, y]) => [Math.min(a[0], x), Math.min(a[1], y), Math.max(a[2], x), Math.max(a[3], y)], b), [180, 90, -180, -90]);

/* ---------- trạng thái ---------- */
const S = {prov: "", brands: new Set(Object.keys(BR)), layers: {dt: true, st: true, comp: true, kh: false, mua: false, newd: true}, sel: null};
const dlg = document.createElement("dialog"); dlg.className = "odlg"; dlg.id = "warDlg"; dlg.style.width = "min(1360px,98vw)"; dlg.setAttribute("aria-labelledby", "warT");
dlg.innerHTML = `<header><h3 id="warT">Chiến trường 2D · đối thủ, đại lý Đô Thành, khách hàng</h3><label class="field" style="flex-direction:row;align-items:center;gap:6px;margin:0">Tỉnh, thành<select id="warProv"><option value="">Toàn quốc</option></select></label><button type="button" id="warBen">Ben đề xuất chiến lược</button><button type="button" class="x" data-close>Đóng</button></header><div class="body" id="warBody"></div>`;
document.body.appendChild(dlg);
const tip = document.createElement("div"); tip.className = "hudtip"; tip.hidden = true; dlg.appendChild(tip);
const sel = dlg.querySelector("#warProv"); CV.rows.map(r => r.name).sort((a, b) => a.localeCompare(b, "vi")).forEach(n => { const o = document.createElement("option"); o.value = n; o.textContent = n; sel.appendChild(o); });

function nearestOwn(p){ let best = null; ownPoints().forEach(o => { const d = KM(p.lng, p.lat, o.lng, o.lat); if(!best || d < best.d) best = {d, o}; }); return best; }
const brandName = k => (BR[k] || {}).name || k, brandCol = k => (BR[k] || {}).color || "#8ea7c7";
function inProv(){ const p = S.prov; return {
  comp: compPoints().filter(x => !p || x.province === p), dt: ownPoints().filter(x => !p || x.province === p), st: stationPoints().filter(x => !p || x.province === p), nd: newPoints().filter(x => !p || x.province === p),
  kh: custPoints().filter(x => !p || x.province === p), mua: buyerPoints().filter(x => !p || x.province === p)}; }

/* ---------- truyền thông, nhận diện: mọi thông tin có liên kết nguồn ---------- */
function mediaLinks(k){ const b = bm(k); if(!b) return '<span class="muted">chưa có dữ liệu</span>'; const L = (b.links || []).map(l => lnk(l.u, l.t, l.v)).join(" · ");
  const q = b.q || b.name, S = `tìm video: ${lnk(srch(q + " quảng cáo", "yt"), "YouTube")} · ${lnk(srch(q + " showroom xưởng dịch vụ", "yt"), "showroom, xưởng")} · ${lnk(srch(q, "tt"), "TikTok")} · ${lnk(srch(q, "fb"), "Facebook")}`;
  return (L || '<span class="muted">chưa có liên kết chính thức đã xác nhận</span>') + `<br><span class="tiny muted">${S}</span>`; }
const OFF = k => k === "dt" ? CV.NET.dealers.length + CV.NET.stations.length : compPoints().filter(c => c.b === k).length;
function mediaPanel(){
  const keys = ["dt"].concat(Object.keys(BR)), off = k => k === "dt" ? OFF("dt") : OFF(k);
  const on = k => { const b = bm(k); if(!b) return 0; const ok = (b.links || []).filter(l => l.v === "web" && /Facebook|YouTube|TikTok|Zalo/.test(l.t)); return ok.length; };
  return `<details style="margin-top:12px" open><summary style="cursor:pointer;font-weight:600">Truyền thông, nhận diện: so sánh online và offline <span class="muted small">bấm tên kênh để mở nguồn</span></summary>
  <p class="tiny muted" style="margin:6px 0">${esc(BM.note || "")} Kiểm tra ngày ${esc((BM.checked || "").split("-").reverse().join("/"))}. Dấu <sup style="color:#ffb020">*</sup> là thông tin theo báo hoặc kết quả tìm kiếm, cần đối chiếu website.</p>
  <div style="overflow-x:auto"><table class="tasktbl small"><thead><tr><th>Hãng</th><th>Định vị, khẩu hiệu (nguồn)</th><th class="num" title="Kênh Facebook, YouTube, TikTok, Zalo đã thấy trên website chính thức">Kênh số xác nhận</th><th class="num" title="Điểm bán, xưởng có tọa độ trong dữ liệu">Điểm offline</th><th>Kênh, trang, video</th></tr></thead><tbody>${keys.map(k => { const b = bm(k) || {}; return `<tr><td style="min-width:120px">${logoImg(k, 22)}<div class="tiny muted">${esc(b.name || "")}</div></td><td class="tiny" style="min-width:200px">${b.slogan ? "“" + esc(b.slogan) + "” " : ""}${esc(b.pos || "chưa có dữ liệu")} ${b.posSrc ? lnk(b.posSrc, "nguồn", b.posV || "web") : ""}</td><td class="num">${on(k)}</td><td class="num">${fmtInt(off(k))}</td><td class="tiny" style="min-width:300px">${mediaLinks(k)}</td></tr>`; }).join("")}</tbody></table></div>
  <p class="tiny muted" style="margin-top:6px"><b>Cách đọc:</b> hãng có nhiều kênh số xác nhận nhưng ít điểm offline thì mạnh về thương hiệu số, yếu về hiện diện; ngược lại cần tăng nội dung số. So sánh với Đô Thành để chọn nội dung quảng cáo, vị trí điểm bán và loại sản phẩm cần đẩy. Video quảng cáo cụ thể của từng hãng chưa tự thu thập được: dùng liên kết tìm kiếm ở cột cuối, mở xem rồi ghi lại đường dẫn vào Nhập dữ liệu.</p></details>`; }
let SRC = []; try{ SRC = JSON.parse(document.getElementById("src-data").textContent).sources || []; }catch(e){}
function srcList(bk){
  const g = id => ((SRC.find(s => s.id === id) || {}).links || []).slice(0, 2).map(l => lnk(l[1], l[0])).join(" · ") || "chưa có nguồn";
  const own = bk.map(k => { const s = (BR[k] || {}).src; return s && s[1] ? lnk(s[1], brandName(k) + ": " + s[0].slice(0, 40)) : ""; }).filter(Boolean).join(" · ");
  return `<li><b>Điểm bán, xưởng đối thủ (địa chỉ, tọa độ):</b> ${own || "chưa có"}; tọa độ phường, xã định vị bằng ${lnk("https://nominatim.openstreetmap.org", "OpenStreetMap Nominatim")}</li>
   <li><b>Giá, khuyến mãi đối thủ:</b> xem cột Nguồn giá, khuyến mãi ở bảng hồ sơ trên</li>
   <li><b>Đăng ký mới, UIO, thị phần tỉnh:</b> ${g("csgt")} · ${g("dk")}</li>
   <li><b>Mạng lưới, trạm dịch vụ Đô Thành:</b> ${g("erp")} (số bán, tồn, nợ: dữ liệu nội bộ DAC, không có đường dẫn công khai)</li>
   <li><b>Khách tiềm năng:</b> ${lnk("https://www.openstreetmap.org", "OpenStreetMap")} và danh sách xe hết niên hạn của DAC (nội bộ)</li>
   <li><b>Thị trường chung:</b> ${g("vama")} · ${g("nso")}</li>`; }
/* ---------- vẽ ---------- */
function draw(){
  const body = dlg.querySelector("#warBody"), D = inProv(), p = S.prov;
  let bb; if(p){ const ps = polys(p); bb = ps.length ? bboxOf(ps.flat()) : [102, 8.4, 109.6, 23.4]; const mx = (bb[2] - bb[0]) * .06 + .03, my = (bb[3] - bb[1]) * .06 + .03; bb = [bb[0] - mx, bb[1] - my, bb[2] + mx, bb[3] + my]; } else bb = [102.0, 8.2, 109.6, 23.6];
  const cl = Math.cos(rad((bb[1] + bb[3]) / 2)), wU = (bb[2] - bb[0]) * cl, hU = bb[3] - bb[1];
  const W = 1100, mapX = p ? 300 : 40, mapW = p ? 500 : 1020, mapH = p ? 640 : 860, sc = Math.min(mapW / wU, mapH / hU), offX = mapX + (mapW - wU * sc) / 2, offY = 30 + (mapH - hU * sc) / 2;
  const X = lng => offX + (lng - bb[0]) * cl * sc, Y = lat => offY + (bb[3] - lat) * sc, H = p ? 720 : 920;
  const path = rings => rings.map(r => "M" + r.map(([x, y]) => X(x).toFixed(1) + " " + Y(y).toFixed(1)).join("L") + "Z").join("");
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Chiến trường 2D ${esc(p || "toàn quốc")}" id="warSvg" style="width:100%;height:auto;background:rgba(5,16,34,.5);border-radius:12px">`;
  svg += `<g>${allProv().map(f => { const nm = f.properties.name, on = nm === p, rings = (f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates]).flat(); return `<path d="${path(rings)}" fill="${on ? "rgba(63,107,255,.16)" : "rgba(142,167,199,.07)"}" stroke="${on ? "#6ea8ff" : "rgba(142,167,199,.35)"}" stroke-width="${on ? 1.6 : .7}" class="wprov" data-p="${esc(nm)}" style="cursor:${p ? "default" : "pointer"}"><title>${esc(nm)}${p ? "" : " · bấm để xem chiến trường tỉnh"}</title></path>`; }).join("")}</g>`;
  const pts = []; // {x,y,col,shape,r,tip,url,label,k,pri}
  const add = o => pts.push(o);
  if(S.layers.kh) D.kh.forEach(c => add({x: X(c.lng), y: Y(c.lat), col: c.hot ? "#ff3b3b" : "#4da3ff", shape: "d", r: c.hot ? 4.2 : 2.6, tip: `<b>${esc(c.name)}</b><br>Khách tiềm năng${c.hot ? " (nóng)" : ""} · ${esc(c.ind)}<br>${esc(c.area)} · ${esc(c.src)}${c.exact === false ? "<br><i>tọa độ gần đúng</i>" : ""}`, url: gm(c.lat, c.lng), k: "kh"}));
  if(S.layers.mua) D.mua.forEach(c => add({x: X(c.lng), y: Y(c.lat), col: "#b577ff", shape: "o", r: Math.min(14, 3 + Math.sqrt(c.n)), tip: `<b>${esc(c.name)}</b><br>Khách đã mua xe Đô Thành 2023–2026: ${fmtInt(c.n)} xe (${fmtInt(c.org)} doanh nghiệp)<br><i>theo huyện, không hiển thị từng khách</i>`, url: gm(c.lat, c.lng), k: "mua"}));
  const labeled = [];
  if(S.layers.comp) D.comp.filter(c => S.brands.has(c.b)).forEach(c => { const o = {x: X(c.lng), y: Y(c.lat), col: brandCol(c.b), shape: "c", r: 5.2, k: "comp", bk: c.b, lat: c.lat, lng: c.lng, src: c, label: brandName(c.b) + " · " + shortName(c), tip: `<b>${esc(brandName(c.b))}</b> · ${esc(c.type || "điểm bán")}<br>${esc(c.name)}<br>${esc(c.addr)}${c.phone ? "<br>ĐT " + esc(c.phone) : ""}<br>${esc(c.province)}`, url: c.map || gm(c.lat, c.lng)}; add(o); labeled.push(o); });
  if(S.layers.dt) D.dt.forEach(c => { const o = {x: X(c.lng), y: Y(c.lat), col: DT, shape: "s", r: 6, k: "dt", bk: "dt", lat: c.lat, lng: c.lng, label: "Đô Thành · " + c.name + (c.tier === "C1" ? "" : " (cấp 2)"), tip: `<b>Đô Thành · ${esc(c.full || c.name)}</b> (${c.tier})<br>${esc(c.addr)}${c.phone ? "<br>ĐT " + esc(c.phone) : ""}`, url: c.gm ? gm(c.gm[0], c.gm[1]) : gm(c.lat, c.lng), pri: 1}; add(o); labeled.push(o); });
  if(S.layers.st) D.st.forEach(c => add({x: X(c.lng), y: Y(c.lat), col: "#4ee2a0", shape: "t", r: 5, k: "st", tip: `<b>Trạm dịch vụ ủy quyền</b><br>${esc(c.name)}<br>${esc(c.addr)}`, url: c.gm ? gm(c.gm[0], c.gm[1]) : gm(c.lat, c.lng)}));
  if(S.layers.newd) D.nd.forEach(c => { const o = {x: X(c.lng), y: Y(c.lat), col: NEWC, shape: "*", r: 8, k: "new", bk: "dt", lat: c.lat, lng: c.lng, label: "Đề xuất cấp 1 · " + c.name, tip: `<b>Đề xuất đại lý cấp 1: ${esc(c.name)}</b><br>${esc(c.mode)} · hoạt động từ ${esc(c.open)}<br>Thị phần tỉnh ${c.sh0}% → mục tiêu ${c.sh1}%<br><i>${esc(c.src)}: vị trí dự kiến, chưa phải địa chỉ thật</i>`, url: gm(c.lat, c.lng), pri: 0}; add(o); labeled.push(o); });
  // nhãn có đường dẫn (kiểu sơ đồ điểm bán) khi xem một tỉnh
  let lblSvg = "", list = [];
  if(p){
    const all = labeled.filter(o => o.x > mapX - 30 && o.x < mapX + mapW + 30 && o.y > 20 && o.y < H - 20), own = all.filter(o => o.k === "dt" || o.k === "new"), cen = own.length ? [sum(own.map(o => o.x)) / own.length, sum(own.map(o => o.y)) / own.length] : [mapX + mapW / 2, H / 2];
    const rank = all.slice().sort((a, b) => (a.pri ?? 9) - (b.pri ?? 9) || Math.hypot(a.x - cen[0], a.y - cen[1]) - Math.hypot(b.x - cen[0], b.y - cen[1]));
    const shown = rank.slice(0, 28), mid = mapX + mapW / 2; let Lh = shown.filter(o => o.x < mid).sort((a, b) => a.y - b.y), Rh = shown.filter(o => o.x >= mid).sort((a, b) => a.y - b.y);
    while(Lh.length > 14){ Rh.push(Lh.pop()); } while(Rh.length > 14){ Lh.push(Rh.pop()); } Lh.sort((a, b) => a.y - b.y); Rh.sort((a, b) => a.y - b.y);
    const place = (arr, left) => { const n = arr.length, gap = n ? Math.min(46, (H - 70) / n) : 46, y0 = 28; arr.forEach((o, i) => { o.ly = y0 + i * gap + 18; o.left = left; }); };
    place(Lh, true); place(Rh, false); list = [...Lh, ...Rh]; list.sort((a, b) => (a.pri ?? 9) - (b.pri ?? 9) || a.label.localeCompare(b.label, "vi")); list.forEach((o, i) => o.no = i + 1);
    lblSvg = [...Lh, ...Rh].map(o => { const lx = o.left ? 20 : 810, w = 270, cx = o.left ? lx + w : lx; const lg = bm(o.bk) && bm(o.bk).logo, tx0 = lx + 38 + (lg ? 62 : 0), mx = lg ? 24 : 34, txt0 = lg ? o.label.replace(/^[^·]*·\s*/, "") : o.label, txt = txt0.length > mx ? txt0.slice(0, mx - 1) + "…" : txt0;
      return `<g class="wlab" data-u="${esc(o.url)}" style="cursor:pointer"><line x1="${cx}" y1="${o.ly}" x2="${o.x}" y2="${o.y}" stroke="${o.col}" stroke-width="1.2" opacity=".75"/><rect x="${lx}" y="${o.ly - 17}" width="${w}" height="34" rx="9" fill="rgba(8,20,38,.92)" stroke="${o.col}" stroke-width="1.6"/><circle cx="${lx + 19}" cy="${o.ly}" r="11" fill="${o.col}"/><text x="${lx + 19}" y="${o.ly + 4.5}" text-anchor="middle" font-size="12.5" font-weight="700" fill="#03121d">${o.no}</text>${lg ? `<rect x="${lx + 38}" y="${o.ly - 11}" width="58" height="22" rx="4" fill="#fff"/><image href="${bm(o.bk).logo}" x="${lx + 41}" y="${o.ly - 9}" width="52" height="18" preserveAspectRatio="xMidYMid meet"/>` : ""}<text x="${tx0}" y="${o.ly + 5}" font-size="13.5" font-weight="600" fill="${o.col}">${esc(txt)}</text><title>${esc(o.label)} · bấm mở Google Maps</title></g>`; }).join("");
  }
  const sh = o => o.shape === "s" ? `<rect x="${o.x - o.r}" y="${o.y - o.r}" width="${o.r * 2}" height="${o.r * 2}" fill="${o.col}" stroke="#fff" stroke-width="1.2"/>` : o.shape === "d" ? `<path d="M${o.x} ${o.y - o.r}l${o.r} ${o.r}l${-o.r} ${o.r}l${-o.r} ${-o.r}z" fill="${o.col}" opacity=".85"/>` : o.shape === "o" ? `<circle cx="${o.x}" cy="${o.y}" r="${o.r}" fill="none" stroke="${o.col}" stroke-width="2" opacity=".85"/>` : o.shape === "t" ? `<path d="M${o.x} ${o.y - o.r}l${o.r} ${o.r * 1.6}h${-o.r * 2}z" fill="${o.col}" stroke="#04121c" stroke-width=".8"/>` : o.shape === "*" ? `<path d="M${o.x} ${o.y - o.r}l${o.r * .35} ${o.r * .7}l${o.r * .75} .1l${-o.r * .55} ${o.r * .5}l${o.r * .2} ${o.r * .8}l${-o.r * .75} ${-o.r * .45}l${-o.r * .75} ${o.r * .45}l${o.r * .2} ${-o.r * .8}l${-o.r * .55} ${-o.r * .5}l${o.r * .75} ${-.1}z" fill="${o.col}" stroke="#7a5f00" stroke-width="1"/>` : `<circle cx="${o.x}" cy="${o.y}" r="${o.r}" fill="${o.col}" stroke="#04121c" stroke-width="1"/>`;
  const order = {mua: 0, kh: 1, st: 2, comp: 3, dt: 4, new: 5};
  svg += lblSvg.replace(/<line[^>]*\/>/g, m => m) /* đường dẫn dưới điểm */ + pts.sort((a, b) => order[a.k] - order[b.k]).map(o => `<g class="wpt" data-u="${esc(o.url)}" data-t="${esc(o.tip)}" style="cursor:pointer">${sh(o)}<circle cx="${o.x}" cy="${o.y}" r="${Math.max(o.r + 5, 9)}" fill="transparent"/></g>`).join("");
  svg += `<text x="${p ? mapX + 4 : 46}" y="22" font-size="13" fill="#8ea7c7">${p ? esc(p) + " · bấm điểm hoặc nhãn để mở đúng vị trí trên Google Maps" : "Toàn quốc · bấm tỉnh để xem chiến trường chi tiết · bấm điểm để mở Google Maps"}</text></svg>`;
  S.list = list;
  const lay = (k, t, col, shape) => `<label class="small" style="display:inline-flex;align-items:center;gap:5px;margin-right:10px"><input type="checkbox" data-layer="${k}" ${S.layers[k] ? "checked" : ""}><i style="display:inline-block;width:11px;height:11px;background:${col};${shape || ""}"></i>${t}</label>`;
  const brandChips = Object.keys(BR).map(k => { const n = compPoints().filter(c => c.b === k && (!p || c.province === p)).length; return `<button type="button" data-brand="${k}" aria-pressed="${S.brands.has(k)}" style="border-color:${BR[k].color};${S.brands.has(k) ? "" : "opacity:.45"}">${bm(k) && bm(k).logo ? logoImg(k, 14) + " " : `<i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${BR[k].color};margin-right:4px"></i>`}${esc(BR[k].name)} ${n}</button>`; }).join(" ");
  const dts = D.dt.concat(D.nd.map(n => Object.assign({}, n, {isNew: true})));
  body.innerHTML = `<div style="margin-bottom:8px">${lay("dt", "Đại lý Đô Thành", DT)}${lay("st", "Trạm dịch vụ", "#4ee2a0", "clip-path:polygon(50% 0,100% 100%,0 100%)")}${lay("comp", "Đối thủ", "#ff7a3c", "border-radius:50%")}${lay("newd", "Điểm đề xuất mở cấp 1", NEWC, "clip-path:polygon(50% 0,62% 36%,100% 38%,70% 60%,80% 100%,50% 76%,20% 100%,30% 60%,0 38%,38% 36%)")}${lay("kh", "Khách tiềm năng (" + fmtInt(D.kh.length) + ")", "#4da3ff", "transform:rotate(45deg)")}${lay("mua", "Khách đã mua 2023–2026 (theo huyện)", "#b577ff", "border-radius:50%;background:transparent;border:2px solid #b577ff;box-sizing:border-box")}</div>
   <div style="margin-bottom:8px;display:flex;gap:6px;flex-wrap:wrap">${brandChips}</div>
   <div id="warMap">${svg}</div>
   ${mediaPanel()}
   ${p ? `<div class="hudgrid" style="margin-top:12px"><div class="hp w6"><h3>Danh sách địa chỉ <span>số khớp nhãn trên sơ đồ · bấm mở Google Maps</span></h3><div style="max-height:360px;overflow:auto"><table class="tasktbl small"><tbody>${list.map(o => `<tr><td class="num"><b style="color:${o.col}">${o.no}</b></td><td><a href="${esc(o.url)}" target="_blank" rel="noopener">${esc(o.label)}</a><div class="tiny muted">${esc((o.src && o.src.addr) || "")}${o.src && o.src.type ? " · " + esc(o.src.type) : ""}</div></td></tr>`).join("") || '<tr><td class="muted">Chưa có điểm trong tỉnh</td></tr>'}</tbody></table></div><p class="tiny muted">Sơ đồ chỉ ghi nhãn ${list.length} điểm gần đại lý Đô Thành nhất; ${fmtInt(Math.max(0, D.comp.filter(c => S.brands.has(c.b)).length - list.filter(o => o.k === "comp").length))} điểm đối thủ còn lại hiển thị bằng chấm, rê chuột để xem.</p></div>
    <div class="hp w6"><h3>Chiến lược theo mặt trận <span>chọn đại lý Đô Thành hoặc điểm đề xuất mở mới</span></h3><label class="field small">Đại lý, điểm đề xuất<select id="warDealer">${dts.map((d, i) => `<option value="${i}">${d.isNew ? "★ Đề xuất: " : "Đô Thành · "}${esc(d.name)}${d.tier === "C2" ? " (cấp 2)" : ""}</option>`).join("") || "<option value=''>Chưa có đại lý trong tỉnh</option>"}</select></label><div id="warStrat"></div></div></div>` : `<p class="muted small" style="margin-top:8px">Bấm một tỉnh trên bản đồ hoặc chọn tỉnh ở thanh trên để xem chiến trường chi tiết: nhãn từng điểm, địa chỉ, khoảng cách và chiến lược cho từng đại lý.</p>`}`;
  S.dts = dts; if(p) strat();
}
function shortName(c){ return String(c.name || "").replace(/^(Đại Lý|Đại lý|CÔNG TY|Công ty)\s+/i, "").replace(/\b(1S|3S|2S)\s+/i, "").replace(new RegExp("^" + (BR[c.b] || {name: ""}).name + "\\s*", "i"), "").slice(0, 40) || c.province; }

/* ---------- chiến lược ---------- */
function analyse(d){
  const p = d.province, row = CV.findRow(p) || {}, cp = compPoints(), near = k => cp.filter(c => c.b === k).map(c => ({c, d: KM(d.lng, d.lat, c.lng, c.lat)})).sort((a, b) => a.d - b.d)[0];
  const byB = {}; cp.forEach(c => { const dd = KM(d.lng, d.lat, c.lng, c.lat); if(dd <= 50){ const o = byB[c.b] = byB[c.b] || {n10: 0, n25: 0, n50: 0, s25: 0, near: null}; o.n50++; if(dd <= 25){ o.n25++; if(/3S|xưởng|bảo hành|svc/i.test(c.type) || c.svc) o.s25++; } if(dd <= 10) o.n10++; if(!o.near || dd < o.near.d) o.near = {d: dd, c}; } });
  const n25 = sum(Object.values(byB).map(o => o.n25)), top = Object.entries(byB).sort((a, b) => b[1].n25 - a[1].n25 || (a[1].near ? a[1].near.d : 99) - (b[1].near ? b[1].near.d : 99))[0];
  const cust = custPoints().filter(c => KM(d.lng, d.lat, c.lng, c.lat) <= 30), ind = {}; cust.forEach(c => ind[c.ind] = (ind[c.ind] || 0) + 1);
  const buyers = (((CV.CUST || {}).buyers || {}).byProv || {})[p] || null, loy = (((CV.CUST || {}).loyalty || {}).byProv || {})[p] || null;
  const st = stationPoints().map(s => ({s, d: KM(d.lng, d.lat, s.lng, s.lat)})).sort((a, b) => a.d - b.d)[0];
  const own = ownPoints().filter(o => !(Math.abs(o.lat - d.lat) < .0005 && Math.abs(o.lng - d.lng) < .0005)).map(o => ({o, d: KM(d.lng, d.lat, o.lng, o.lat)})).sort((a, b) => a.d - b.d)[0];
  const inv = d.isNew || d.k === "new" ? null : CV.invOf && CV.invOf(d.name), debtD = d.isNew || d.k === "new" ? null : (CV.debt().dealers || []).find(x => x.name === d.name);
  const plan = PLAN().dealers.find(x => x[0] === d.name), ev = ((CV.MKT || {}).events || []).filter(e => e.province === p);
  const mkt = row.regT10addr || 0, dt = row.regT10dtAddr || 0, share = mkt ? dt / mkt * 100 : null;
  return {d, p, row, byB, n25, top, cust, ind, buyers, loy, st, own, inv, debtD, plan, ev, mkt, dt, share};
}
const INT = n => n >= 15 ? "rất cao" : n >= 8 ? "cao" : n >= 3 ? "vừa" : "thấp";
function strategy(a){
  const L = [], d = a.d, P = [];
  const top = a.top, tb = top ? top[0] : null, tn = top ? top[1] : null, cb = tb ? CB(tb) : {};
  const rule = tb ? (cb.promoRules || []).slice(0, 2).join("; ") || (cb.promoDoc || "") : "";
  const ins = tb && cb.insight ? cb.insight[0] : "";
  L.push(["Thế trận", `Mật độ cạnh tranh ${INT(a.n25)}: ${a.n25} điểm đối thủ trong 25 km${tb ? `; mạnh nhất là ${brandName(tb)} (${tn.n25} điểm trong 25 km, gần nhất ${fmt1(tn.near.d)} km)` : ""}.`]);
  if(tb) L.push(["Đánh vào đâu", `${brandName(tb)}: ${ins || "xem hồ sơ đối thủ"}${rule ? ". Chính sách hiện hành: " + rule : ""}. Đối sách: không đua giảm tiền mặt; chào giá ròng + chi phí sở hữu (bảo dưỡng 2 năm, hỗ trợ lãi), lái thử tại bãi khách; gom danh sách khách đang dùng xe ${brandName(tb)} đến kỳ bảo dưỡng, hết niên hạn.`]);
  const kh = a.cust.length, hot = a.cust.filter(c => c.hot).length, topInd = Object.entries(a.ind).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([k, v]) => k + " " + v).join(", ");
  L.push(["Khách tiềm năng", kh ? `${fmtInt(kh)} doanh nghiệp tiềm năng trong 30 km (${hot} khách nóng); ngành chính: ${topInd || "chưa phân ngành"}. Giao đội bán gọi, ghé theo thứ tự khách nóng trước; mời tham dự ${a.ev.length ? a.ev.length + " sự kiện MKT đã lên lịch trong tỉnh" : "buổi lưu động đề xuất tại tỉnh"}.` : "Chưa có doanh nghiệp tiềm năng có định vị quanh điểm này: bổ sung danh sách từ OSM, hiệp hội vận tải, khu công nghiệp."]);
  if(a.buyers || a.loy) L.push(["Khách đã mua", `${a.buyers ? fmtInt(a.buyers.n) + " xe Đô Thành đã bán trong tỉnh 2023–2026" : ""}${a.loy ? "; " + a.loy.repeat + " khách mua lại" : ""}. Chăm sóc theo năm mua (thu cũ đổi mới, kiểm tra xe, giới thiệu bạn), mục tiêu mua lại 8%.`]);
  if(a.st) L.push(["Dịch vụ", `Trạm Đô Thành gần nhất ${fmt1(a.st.d)} km (${esc(a.st.s.name)}). ${a.st.d > 60 ? "Quá 60 km: bố trí xe dịch vụ lưu động hoặc gara liên kết." : "Trong bán kính phục vụ: công bố cam kết tiếp nhận 30 phút, phụ tùng 24 giờ."}${tb && tn.s25 ? " Đối thủ " + brandName(tb) + " có " + tn.s25 + " điểm có xưởng trong 25 km: giữ lợi thế bằng thời gian sửa xong trong ngày." : ""}`]);
  if(a.own && a.own.d < 25) L.push(["Chồng lấn vùng", `Đại lý Đô Thành ${esc(a.own.o.name)} chỉ cách ${fmt1(a.own.d)} km: phân định địa bàn theo xã, phường trong thông báo phân vùng để tránh cạnh tranh nội bộ (TB 02/2026 phạt lấn vùng).`]);
  if(a.inv){ const old = (a.inv.lines || []).reduce((s, l) => s + ((l.age || {})["181-365"] || 0) + ((l.age || {})[">365"] || 0), 0); L.push(["Nội lực", `Tồn ${a.inv.ton} xe${a.inv.cover != null ? ", " + fmt1(a.inv.cover) + " tháng bán" : ", không bán lẻ T11"}; ${old} xe tồn trên 180 ngày${a.debtD && a.debtD.over ? "; nợ quá hạn " + fmt1(a.debtD.over / 1000) + " tỷ (lâu nhất " + Math.max(a.debtD.MB.max, a.debtD.MBTB.max) + " ngày)" : ""}. ${a.inv.cover != null && a.inv.cover > 3 ? "Tồn cao: chạy chiến dịch xả tồn theo model tồn trước, chưa nhập thêm." : "Tồn trong ngưỡng: ưu tiên bán theo đơn khách."}${a.debtD && a.debtD.over ? " Xử lý nợ quá hạn trước khi mở rộng mặt trận." : ""}`]); }
  if(a.plan) L.push(["Chỉ tiêu 2027", `Bán lẻ 12 tháng qua ${fmtInt(a.plan[1])} xe → cam kết ${fmtInt(a.plan[3])} xe, KPI ${fmtInt(a.plan[4])} xe; tư vấn ${a.plan[2]} → ${a.plan[2] + a.plan[5]} người.`]);
  if(d.isNew || d.k === "new") L.push(["Điểm mở mới", `${d.mode} từ ${d.open}; thị phần tỉnh ${d.sh0}% → mục tiêu ${d.sh1}% (+20%). ${d.src}. Kế hoạch 13 tuần: thẩm định, bảng hiệu, tuyển ≥ 3 tư vấn (5 ở Hà Nội, TP.HCM), xe trưng bày MBTB, khai trương cùng buổi lưu động và hội thảo doanh nghiệp tại tỉnh.`]);
  if(a.share != null) L.push(["Thị trường tỉnh", `${fmtInt(a.mkt)} xe/tháng trong 5 phân khúc, Đô Thành ${fmtInt(a.dt)} xe (${fmt1(a.share)}%); dư địa đến 7% ≈ ${fmtInt(Math.max(0, (.07 * a.mkt - a.dt) * 12))} xe/năm.`]);
  return L;
}
function strat(){
  const el = dlg.querySelector("#warStrat"), i = +((dlg.querySelector("#warDealer") || {}).value || 0), d = (S.dts || [])[i]; if(!el) return; if(!d){ el.innerHTML = '<p class="muted">Tỉnh chưa có đại lý Đô Thành hoặc điểm đề xuất.</p>'; return; }
  const a = analyse(d), L = strategy(a), brands = Object.entries(a.byB).sort((x, y) => y[1].n25 - x[1].n25);
  el.innerHTML = `<p class="tiny muted" style="margin:4px 0"><a href="${esc(d.gm ? gm(d.gm[0], d.gm[1]) : gm(d.lat, d.lng))}" target="_blank" rel="noopener">Mở vị trí trên Google Maps</a> · ${esc(d.addr || "")}</p>
   <table class="tasktbl small"><thead><tr><th>Đối thủ (trong 50 km)</th><th class="num">≤ 10 km</th><th class="num">≤ 25 km</th><th class="num">≤ 50 km</th><th>Gần nhất</th></tr></thead><tbody>${brands.map(([k, o]) => `<tr><td><b style="color:${brandCol(k)}">${esc(brandName(k))}</b></td><td class="num">${o.n10 || ""}</td><td class="num">${o.n25 || ""}</td><td class="num">${o.n50}</td><td class="tiny"><a href="${esc(o.near.c.map || gm(o.near.c.lat, o.near.c.lng))}" target="_blank" rel="noopener">${esc(shortName(o.near.c))}</a> · ${fmt1(o.near.d)} km</td></tr>`).join("") || '<tr><td colspan="5" class="muted">Không có điểm đối thủ trong 50 km theo dữ liệu hiện có</td></tr>'}</tbody></table>
   <h4 style="margin:10px 0 4px">Hồ sơ đối thủ: chính sách, cơ sở vật chất, nhận diện</h4><table class="tasktbl small"><tbody>${brands.slice(0, 5).map(([k, o]) => { const c = CB(k), b = BR[k] || {}; return `<tr><td style="min-width:90px"><b style="color:${brandCol(k)}">${esc(brandName(k))}</b></td><td class="tiny"><b>Chính sách:</b> ${esc((c.promoDoc || "chưa có dữ liệu chính sách công khai").slice(0, 150))}${(c.promoRules || [])[0] ? "; " + esc(c.promoRules[0].slice(0, 120)) : ""}<br><b>Cơ sở vật chất:</b> ${esc(b.total || "chưa có")}${b.svc ? "; " + esc(String(b.svc).slice(0, 90)) : ""}; quanh điểm này ${o.n25} điểm trong 25 km${o.s25 ? " (" + o.s25 + " có xưởng, 3S)" : ""}.<br><b>Nhận diện (CI):</b> ${logoImg(k, 18)} ${bm(k) && bm(k).slogan ? "“" + esc(bm(k).slogan) + "” " + (bm(k).posSrc ? lnk(bm(k).posSrc, "nguồn", bm(k).sloganV) : "") : '<span class="muted">chưa tìm thấy khẩu hiệu chính thức</span>'}; ${c.origin ? "xuất xứ " + esc(c.origin) + "; " : ""}màu thương hiệu <i style="display:inline-block;width:10px;height:10px;background:${brandCol(k)};vertical-align:middle"></i>.<br><b>Kênh truyền thông:</b> ${mediaLinks(k)}<br><b>Nguồn giá, khuyến mãi:</b> ${(c.sources || []).slice(0, 4).filter(s => s[1]).map(s => lnk(s[1], s[0].slice(0, 42))).join(" · ") || "chưa có"}</td></tr>`; }).join("")}</tbody></table>
   <h4 style="margin:10px 0 4px">Nguồn dẫn chứng <span class="tiny muted">bấm để mở trang gốc</span></h4><ul class="small tiny" style="margin:0 0 6px;padding-left:18px">${srcList(brands.map(x => x[0]))}</ul>
   <h4 style="margin:10px 0 4px">Đề xuất chiến lược mặt trận ${esc(d.name)}</h4><ol class="small">${L.map(([t, x]) => `<li><b>${esc(t)}:</b> ${x}</li>`).join("")}</ol>`;
}
function md_(name){
  const D = ownPoints().concat(newPoints()), d = name ? D.find(x => fold(x.name).includes(fold(name)) || fold(name).includes(fold(x.name))) : null;
  if(!d) return "# Chiến trường\nChọn một đại lý hoặc điểm đề xuất (ví dụ: *chiến lược mặt trận Trường Vũ*). Mở **Chiến trường 2D** để xem bản đồ chi tiết.";
  const a = analyse(d), L = strategy(a);
  return `# Mặt trận ${d.name} (${d.province})\n_Đối thủ trong 25 km: ${a.n25}; ${Object.entries(a.byB).sort((x, y) => y[1].n25 - x[1].n25).slice(0, 4).map(([k, o]) => brandName(k) + " " + o.n25).join(", ") || "không có"}._\n\n${L.map(([t, x]) => `- **${t}:** ${x}`).join("\n")}\n\n[Mở vị trí trên Google Maps](${gm(d.lat, d.lng)})`;
}
function open(prov, dealer){ if(prov !== undefined) S.prov = prov || ""; sel.value = S.prov; draw(); if(dealer){ const i = (S.dts || []).findIndex(x => fold(x.name).includes(fold(dealer))); const s = dlg.querySelector("#warDealer"); if(i >= 0 && s){ s.value = i; strat(); } } if(!dlg.open) dlg.showModal(); }
dlg.addEventListener("click", e => { const t = e.target;
  if(t.closest("[data-close]")) return dlg.close();
  const u = t.closest("[data-u]"); if(u){ window.open(u.dataset.u, "_blank", "noopener"); return; }
  const pv = t.closest(".wprov"); if(pv && !S.prov){ S.prov = pv.dataset.p; sel.value = S.prov; return draw(); }
  const br = t.closest("[data-brand]"); if(br){ const k = br.dataset.brand; S.brands.has(k) ? S.brands.delete(k) : S.brands.add(k); return draw(); }
  if(t.id === "warBen"){ const d = (S.dts || [])[+((dlg.querySelector("#warDealer") || {}).value || 0)]; const md = d ? md_(d.name) : md_(""); dlg.close(); CV.openAi(true); CV.benTab("Chat"); CV.addMsg("u", "Chiến lược mặt trận " + (d ? d.name : S.prov)); const b = CV.addMsg("a", ""); CV.finishBubble(b, md, false, "Chiến lược mặt trận", true); } });
dlg.addEventListener("change", e => { const t = e.target; if(t.id === "warProv"){ S.prov = t.value; draw(); } if(t.dataset && t.dataset.layer){ S.layers[t.dataset.layer] = t.checked; draw(); } if(t.id === "warDealer") strat(); });
dlg.addEventListener("pointermove", e => { const g = e.target.closest && e.target.closest("[data-t]"); if(!g){ tip.hidden = true; return; } tip.innerHTML = g.dataset.t; tip.hidden = false; const w = tip.offsetWidth, h = tip.offsetHeight; let x = e.clientX + 14, y = e.clientY + 14; if(x + w > innerWidth - 8) x = e.clientX - w - 14; if(y + h > innerHeight - 8) y = e.clientY - h - 14; tip.style.left = x + "px"; tip.style.top = y + "px"; });
const tools = document.querySelector(".maptools"); if(tools){ const b = document.createElement("button"); b.type = "button"; b.id = "btnWar"; b.className = "primary"; b.textContent = "Chiến trường 2D"; b.title = "Bản đồ 2D đối thủ, đại lý, khách hàng; bấm điểm mở Google Maps; chiến lược từng mặt trận"; b.addEventListener("click", () => open(zoneSelProv())); const c = document.getElementById("btnCash"); c ? c.before(b) : tools.prepend(b); }
function zoneSelProv(){ const s = document.getElementById("provSel"); return s && s.value ? s.value : CV.selected || ""; }
const bh = document.querySelector("#boardDlg header"); if(bh){ const b = document.createElement("button"); b.type = "button"; b.textContent = "Chiến trường 2D"; b.addEventListener("click", () => { const bd = document.getElementById("boardDlg"), pv = document.getElementById("bdProv"); if(bd && bd.open) bd.close(); open(pv ? pv.value : ""); }); const t = bh.querySelector("#bdBen"); t ? bh.insertBefore(b, t) : bh.appendChild(b); }
CV.openBattle = open; CV.battleMd = md_;
CV.tools.push({name: "chien_truong", label: "Đang phân tích mặt trận…", description: "Chiến trường 2D: đối thủ (Thaco, Teraco, JAC, Foton, TMT, Isuzu, Veam…) quanh từng đại lý Đô Thành và từng điểm đề xuất cấp 1 mới: mật độ cạnh tranh theo bán kính 10/25/50 km, chính sách bán hàng, cơ sở vật chất, nhận diện đối thủ, khách tiềm năng và khách đã mua quanh điểm, tồn kho, công nợ, chỉ tiêu 2027 và chiến lược cụ thể. dai_ly = tên đại lý hoặc điểm đề xuất; có dai_ly thì mở bản đồ 2D tại tỉnh đó.", inputSchema: {type: "object", properties: {dai_ly: {type: "string"}, tinh: {type: "string"}}}, execute: ({dai_ly, tinh}) => { const d = dai_ly ? ownPoints().concat(newPoints()).find(x => fold(x.name).includes(fold(dai_ly)) || fold(dai_ly).includes(fold(x.name))) : null; open(d ? d.province : tinh || "", d ? d.name : null); return md_(dai_ly || ""); }});
CV.localHooks.unshift(raw => { const m = raw.trim().match(/(?:chiến lược mặt trận|mặt trận|chiến trường)\s*(?:2d)?\s*(?:của|tại|ở|cho)?\s*(.*?)\??$/i); if(!m) return null; const q = m[1].trim(); if(!q){ open(""); return "Đã mở **Chiến trường 2D**."; } const d = ownPoints().concat(newPoints()).find(x => fold(x.name).includes(fold(q)) || fold(q).includes(fold(x.name))); if(d){ open(d.province, d.name); return md_(q); } const r = CV.findRow(q); if(r){ open(r.name); return "Đã mở **Chiến trường 2D** tỉnh " + r.name + ": nhãn từng điểm, địa chỉ, Google Maps và chiến lược từng đại lý trong tỉnh."; } return null; });
const prev = CV.ctx; CV.ctx = () => (prev ? prev() : "") + `\nCHIẾN TRƯỜNG 2D: hỏi chiến lược mặt trận từng đại lý, đối thủ quanh đại lý, điểm mở mới dùng chien_truong; tọa độ đối thủ cấp phường/xã; chưa có dữ liệu CI chi tiết (logo, khẩu hiệu) thì nói rõ.`;
})();
