/* ===== Bố cục gọn: bản đồ 3D + Ben là trung tâm; các khối liên quan gom thành 5 nhóm thu gọn, trỏ chuột để xem gợi ý, bấm để mở ===== */
(function(){
"use strict";
const CV = window.__CV; if(!CV) return;
const esc = CV.esc || (s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])));
const main = document.querySelector("section.main"); if(!main) return;
const wrap = main.parentElement, $ = s => document.querySelector(s);
const secOf = sel => { const e = typeof sel === "string" ? $(sel) : sel; return e && e.tagName ? e : null; };
const byH2 = t => [...wrap.querySelectorAll(":scope > section")].find(s => { const h = s.querySelector("h2"); return h && h.textContent.trim().startsWith(t); });
const store = { get(k){ try{ return JSON.parse(localStorage.getItem("dac.layout." + k)); }catch(e){ return null; } }, set(k, v){ try{ localStorage.setItem("dac.layout." + k, JSON.stringify(v)); }catch(e){} } };

const GROUPS = [
  {id: "radar", icon: "◉", title: "Radar kinh tế – tài chính", hint: "20 chỉ số quốc gia (GDP, CPI, lãi suất, tín dụng, ngân sách, nợ công, tỷ giá, FDI, xuất nhập khẩu…) có nguồn; cảnh báo sớm; điểm Radar 34 tỉnh.",
    ask: "Tóm tắt Radar kinh tế – tài chính, các cảnh báo sớm và 5 tỉnh có điểm Radar cao nhất", secs: ["#radarSec"]},
  {id: "thitruong", icon: "◎", title: "Thị trường & đối thủ", hint: "Thị trường xe tải 2026 (10 tháng, ĐK thực T10), đối đầu đúng mã mẫu xe; thế trận 34 tỉnh, cơ cấu tải trọng, thùng, thương hiệu; giá và mạng lưới đối thủ; đề xuất mở đại lý mới.",
    ask: "Tóm tắt toàn cảnh thị trường xe tải và đối thủ, nêu 3 cơ hội lớn nhất cho Đô Thành", secs: ["#marketSec", "#hudSec", () => byH2("Thế trận 34"), "#structSec", "#compSec", "#vsSec", "#siteSec"]},
  {id: "banhang", icon: "▤", title: "Bán hàng · tồn kho · dự báo", hint: "Tài sản tồn kho, công nợ, lộ trình 2027 (Eisenhower); khách tiềm năng cần chăm sóc (định vị Google Maps), khách đã mua 2023–2026; chính sách hỗ trợ bán hàng 2026 (thưởng, đối soát); doanh số chi tiết từng đại lý, model, tháng; tồn đại lý và tồn nhà máy; dự báo 2027 và mô hình DAC Hybrid.",
    ask: "Tóm tắt bán hàng, tồn kho đại lý và dự báo 2027, chỉ ra 3 việc cần làm ngay", secs: ["#planSec", "#custSec", "#mktSec", "#crmSec", "#policySec", "#salesSec", "#txSec", "#invSec", "#fcSec", "#modelSec"]},
  {id: "gia", icon: "₫", title: "Giá, chính sách & pháp lý", hint: "Bảng giá công bố, giá tối thiểu, ưu đãi T11; quy định pháp luật, cấm giờ xe tải, chính sách mới.",
    ask: "Tóm tắt bảng giá, ưu đãi tháng này và các quy định pháp lý mới ảnh hưởng bán xe tải", secs: ["#priceSec", "#legalSec"]},
  {id: "dieuhanh", icon: "✓", title: "Trung tâm điều hành", hint: "Đầu việc, biên bản họp, tiến độ, cảnh báo quá hạn.",
    ask: "Đầu việc nào đang quá hạn hoặc có rủi ro? Đề xuất xử lý", secs: ["#opsBar", "#opsSec"]},
  {id: "dulieu", icon: "≡", title: "Xếp hạng, dữ liệu & nguồn", hint: "Xếp hạng 34 tỉnh, bảng dữ liệu sửa trực tiếp, nhập/xuất CSV, nguồn và phương pháp.",
    ask: "Liệt kê nguồn số liệu đang dùng và những số liệu còn thiếu", secs: [() => wrap.querySelector(":scope > section.lower"), "#sources", () => wrap.querySelector(":scope > section.notes")]}];

/* ---------- dựng dock ---------- */
const dock = document.createElement("section"); dock.id = "dock"; dock.setAttribute("aria-label", "Báo cáo chi tiết theo nhóm");
dock.innerHTML = `<div class="dockhead"><div><h2>Báo cáo chi tiết</h2><p class="muted small">Thông tin được gom theo nhóm. Trỏ chuột để xem gợi ý, bấm để mở. Hoặc hỏi <b>Ben</b>: Ben có đủ mọi số liệu dưới đây.</p></div>
  <button type="button" class="dockall" id="dockAll">Mở tất cả</button></div><div class="dockcards" id="dockCards"></div>`;
main.after(dock);
const cards = dock.querySelector("#dockCards");
GROUPS.forEach(g => {
  const secs = g.secs.map(s => secOf(typeof s === "function" ? s() : s)).filter(Boolean); g.el = secs;
  const names = secs.map(s => { const h = s.querySelector("h2, h3"); return h ? h.textContent.trim().replace(/\s+/g, " ") : (s.id === "opsBar" ? "Tình hình đầu việc" : s.id); });
  const body = document.createElement("div"); body.className = "dockbody"; body.id = "dock-" + g.id; body.hidden = true;
  body.innerHTML = `<div class="dockbar"><b>${g.icon} ${esc(g.title)}</b><span class="muted small">${esc(g.hint)}</span><button type="button" class="askben" data-ask="${esc(g.ask)}"><span class="ben-av">B</span> Hỏi Ben</button><button type="button" class="dockclose" data-close="${g.id}">Thu gọn ▴</button></div>`;
  secs.forEach(s => { body.appendChild(s); if(s.tagName === "SECTION") fold(s); });
  const c = document.createElement("button"); c.type = "button"; c.className = "dockcard"; c.dataset.g = g.id; c.setAttribute("aria-expanded", "false"); c.setAttribute("aria-controls", body.id);
  c.innerHTML = `<span class="di">${g.icon}</span><span class="dt"><b>${esc(g.title)}</b><span class="dn">${secs.length} mục · ${esc(names.slice(0, 2).join(" · "))}${names.length > 2 ? "…" : ""}</span></span><span class="dx">▾</span>
    <span class="dtip" role="tooltip"><b>Bấm để mở:</b>${names.map(n => `<span>▸ ${esc(n)}</span>`).join("")}<i>${esc(g.hint)}</i></span>`;
  cards.appendChild(c); dock.appendChild(body); g.body = body; g.card = c; g.names = names;
});
function openG(id, on, noScroll){ const g = GROUPS.find(x => x.id === id); if(!g) return; on = on ?? g.body.hidden;
  g.body.hidden = !on; g.card.classList.toggle("on", on); g.card.setAttribute("aria-expanded", String(on));
  const open = GROUPS.filter(x => !x.body.hidden).map(x => x.id); store.set("open", open);
  if(on){ window.dispatchEvent(new Event("resize")); if(!noScroll) g.body.scrollIntoView({behavior: "smooth", block: "start"}); } }
cards.addEventListener("click", e => { const c = e.target.closest(".dockcard"); if(c) openG(c.dataset.g); });
dock.addEventListener("click", e => { const x = e.target.closest("[data-close]"); if(x){ openG(x.dataset.close, false, true); GROUPS.find(g => g.id === x.dataset.close).card.scrollIntoView({behavior: "smooth", block: "nearest"}); }
  const a = e.target.closest(".askben"); if(a && CV.askAi){ CV.askAi(a.dataset.ask); } });
dock.querySelector("#dockAll").addEventListener("click", e => { const any = GROUPS.some(g => g.body.hidden); GROUPS.forEach(g => openG(g.id, any, true)); e.target.textContent = any ? "Thu gọn tất cả" : "Mở tất cả"; });

/* ---------- từng khối bên trong nhóm: thu gọn còn tiêu đề, trỏ chuột hiện gợi ý, bấm mở ---------- */
function fold(s){ if(s.dataset.fold) return; s.dataset.fold = "1"; s.classList.add("sfold", "folded");
  const h = s.querySelector("h2"), p = h && h.parentElement && h.parentElement.querySelector("p");
  s.setAttribute("data-hint", "Bấm để xem chi tiết"); s.title = p ? "Bấm để mở: " + p.textContent.trim().slice(0, 200) : "Bấm để mở";
  const hn = document.createElement("div"); hn.className = "sfoldhint"; hn.innerHTML = `<span>▾ ${esc(s.getAttribute("data-hint"))}</span>`; s.appendChild(hn);
  const t = document.createElement("button"); t.type = "button"; t.className = "sfoldbtn"; t.textContent = "Thu gọn ▴"; t.addEventListener("click", ev => { ev.stopPropagation(); s.classList.add("folded"); if(s.dataset.t) s.title = s.dataset.t; s.scrollIntoView({block: "nearest"}); }); s.prepend(t);
  s.addEventListener("click", ev => { if(!s.classList.contains("folded")) return; ev.preventDefault(); ev.stopPropagation(); s.classList.remove("folded"); s.dataset.t = s.title; s.removeAttribute("title"); window.dispatchEvent(new Event("resize")); }, true); }

/* mọi lệnh cuộn tới một khối (nút trên bản đồ, Ben, thanh đầu việc…) tự mở nhóm và khối đó */
const _siv = Element.prototype.scrollIntoView;
Element.prototype.scrollIntoView = function(o){ const b = this.closest && this.closest(".dockbody"); if(b && b.hidden) openG(b.id.slice(5), true, true);
  const s = this.closest && this.closest(".sfold.folded"); if(s) s.classList.remove("folded"); return _siv.call(this, o); };
// thanh đầu việc ở đầu trang: bấm vẫn mở trung tâm điều hành
const ob = $("#opsBar"); if(ob){ ob.addEventListener("click", () => { openG("dieuhanh", true, true); const s = $("#opsSec"); if(s){ s.classList.remove("folded"); _siv.call(s, {behavior: "smooth"}); } }, true); }

/* ---------- đầu trang gọn: mô tả dài và thông số thị trường vào phần trỏ chuột ---------- */
const sub = document.querySelector("header.top .sub"); if(sub){ const i = document.createElement("span"); i.className = "subhint"; i.tabIndex = 0; i.textContent = "ⓘ Giới thiệu & cách dùng"; i.setAttribute("data-hint", sub.textContent.trim()); sub.replaceWith(i); }
const hc = document.querySelector("header.top .controls"); if(hc){ const tam = hc.querySelector('label[for="tam"]'), uio = hc.querySelector('label[for="uioNat"]');
  if(tam || uio){ const box = document.createElement("details"); box.className = "mktset"; box.innerHTML = '<summary title="Tổng thị trường dùng để phân bổ số ĐK mới, UIO theo tỉnh">Thông số thị trường</summary><div class="mktbody"></div>'; [tam, uio].filter(Boolean).forEach(x => box.lastChild.appendChild(x)); hc.appendChild(box); } }
const chips = $("#metrics"); if(chips){ const f = chips.closest(".field"); if(f) f.classList.add("chipfold"); }

/* khôi phục nhóm đang mở lần trước */
(store.get("open") || []).forEach(id => openG(id, true, true));
CV.openGroup = openG;
// Ben biết bố cục: khi người dùng hỏi “mở phần …”
CV.localHooks.unshift(raw => { const t = raw.toLowerCase().replace(/^ben\s*(ơi)?[,:\s]+/, ""); const m = t.match(/^(mở|xem|hiện)\s+(phần|nhóm|mục)?\s*(.+)$/); if(!m) return null;
  const g = GROUPS.find(x => x.title.toLowerCase().includes(m[3]) || x.names.some(n => n.toLowerCase().includes(m[3]))); if(!g) return null; openG(g.id, true); return `Đã mở nhóm **${g.title}** bên dưới bản đồ: ${g.names.join(", ")}.`; });
})();
