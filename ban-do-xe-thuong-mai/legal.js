/* ===== Ben · Pháp chế: kho văn bản pháp luật mới nhất, lịch tuân thủ, tra cứu ===== */
(function(){
"use strict";
const CV = window.__CV; if(!CV) return;
const {esc, toast} = CV;
let LG; try{ LG = JSON.parse(document.getElementById("legal-data").textContent); }catch(e){ return; }
const pad = n => String(n).padStart(2,"0"), ymd = d => d.getFullYear() + "-" + pad(d.getMonth()+1) + "-" + pad(d.getDate());
const vn = s => { if(!s || s.length < 10) return s || "—"; const [y,m,d] = s.split("-"); return `${d}/${m}/${y}`; };
const today = () => ymd(new Date());
const N = s => String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/đ/gi,"d").toLowerCase();
const LV = [...new Set(LG.docs.flatMap(d => d.lv))];

function status(d){ const t = today(); if(d.het && t > d.het) return ["hết hiệu lực", "bad"]; if(d.hl && t < d.hl) return ["sắp hiệu lực " + vn(d.hl), "warn"]; if(d.het) return ["hiệu lực đến " + vn(d.het), "warn"]; return ["đang hiệu lực", "good"]; }
function search(q, lv){ const words = N(q).split(/\s+/).filter(w => w.length > 1 && !["luat","quy","dinh","moi","nhat","cho","cua","ve","tra","cuu","the","nao","la","gi"].includes(w));
  return LG.docs.map(d => { const hay = N([d.so, d.ten, d.lv.join(" "), d.diem.join(" "), d.tacdong, d.viec.join(" ")].join(" ")); const sc = words.reduce((a,w) => a + (hay.includes(w) ? 1 : 0), 0); return [d, sc]; })
    .filter(([d, sc]) => (!lv || d.lv.includes(lv)) && (!words.length || sc > 0)).sort((a,b) => b[1] - a[1]).map(x => x[0])
    .filter((d, i, arr) => { const ph = N(q).trim(); if(ph.length < 4) return true; const hit = x => N([x.so, x.ten, x.lv.join(" "), x.diem.join(" "), x.tacdong].join(" ")).includes(ph); return !arr.some(hit) || hit(d); }); }
function upcoming(days){ const out = [], t0 = new Date(); t0.setHours(0,0,0,0); const end = new Date(t0); end.setDate(end.getDate() + days);
  const last = (y, m) => new Date(y, m+1, 0).getDate();
  for(let i = 0; i <= 13; i++){ const y = t0.getFullYear(), m = t0.getMonth() + i, Y = y + Math.floor(m/12), M = ((m % 12) + 12) % 12;
    LG.calendar.forEach(c => { let d = null;
      if(c.t === "monthly") d = new Date(Y, M, c.day === "last" ? last(Y, M) : c.day);
      else if(c.t === "quarterly" && M % 3 === c.m - 1) d = new Date(Y, M, c.day === "last" ? last(Y, M) : c.day);
      else if(c.t === "yearly" && M === c.mm - 1) d = new Date(Y, M, c.day);
      if(d && d >= t0 && d <= end) out.push({d: ymd(d), ...c}); }); }
  LG.calendar.filter(c => c.t === "once").forEach(c => { const d = new Date(c.date); if(d >= t0 && d <= end) out.push({d: c.date, ...c}); });
  return out.sort((a,b) => a.d.localeCompare(b.d)).filter((x,i,a) => i === 0 || x.d !== a[i-1].d || x.viec !== a[i-1].viec); }
const dleft = s => Math.round((new Date(s) - new Date(today())) / 864e5);

function docMd(d){ const [st] = status(d); return `### ${d.so}\n**${d.ten}** · ${d.cq} · ban hành ${vn(d.bh)} · hiệu lực ${vn(d.hl)}${d.het ? " đến " + vn(d.het) : ""} · _${st}_ · độ tin cậy: ${d.tin}\n${d.diem.map(x => "- " + x).join("\n")}\n- **Tác động tới Đô Thành:** ${d.tacdong}\n- **Việc cần làm:** ${d.viec.join("; ")}\n- Nguồn: ${d.nguon.map(n => n[0] + " (" + n[1] + ")").join("; ")}\n`; }
function briefMd(){ const t = today(), soon = LG.docs.filter(d => (d.hl > t) || (d.het && d.het >= t && dleft(d.het) <= 120)), recent = [...LG.docs].sort((a,b) => String(b.bh).localeCompare(String(a.bh))).slice(0, 8), cal = upcoming(45);
  return `# Pháp lý cập nhật cho Tổng Giám đốc\n_Kho văn bản cập nhật đến ${vn(LG.updated)} · ${LG.docs.length} nhóm văn bản_\n\n## Mốc hiệu lực, hết hiệu lực sắp tới\n${soon.map(d => `- **${d.so}**: ${status(d)[0]} · ${d.ten}`).join("\n") || "- Không có"}\n\n## Văn bản mới ban hành gần đây\n${recent.map(d => `- ${vn(d.bh)} · **${d.so}**: ${d.ten}`).join("\n")}\n\n## Lịch tuân thủ 45 ngày tới\n${cal.map(c => `- ${vn(c.d)} (còn ${dleft(c.d)} ngày): ${c.viec} · _${c.cs}_`).join("\n") || "- Không có"}\n\n## Ưu tiên xử lý\n- Chốt chính sách giá và hợp đồng giao xe 2027 trước khi hết giảm 2% thuế GTGT (31/12/2026).\n- Tuân thủ Luật Bảo vệ dữ liệu cá nhân: đồng ý của khách, hợp đồng đại lý, ghi âm cuộc họp (đã có chế tài NĐ 330/2026).\n- Hóa đơn điện tử theo NĐ 254/2026 và quản lý thuế theo Luật 108/2025 (hiệu lực 01/7/2026).\n\n> ${LG.note}\n`; }

/* ---------- section on the page ---------- */
const anchor = document.getElementById("sources");
if(anchor){
  const s = document.createElement("section"); s.className = "glass pad"; s.id = "legalSec"; s.setAttribute("aria-label", "Pháp lý cập nhật");
  s.innerHTML = `<div class="opshead"><div><h2>Pháp lý &amp; chính sách cập nhật</h2><p class="muted" style="margin:4px 0 0">Văn bản pháp luật có tác động tới sản xuất, thương mại, dịch vụ ô tô tải: thuế, hóa đơn, kế toán, lao động – BHXH, dữ liệu cá nhân, khuyến mại, giao thông – đăng kiểm, doanh nghiệp. Kho cập nhật đến <b>${vn(LG.updated)}</b>.</p></div>
    <div class="toolbar" style="margin:0"><button type="button" class="primary" id="lgBrief">Ben tóm tắt pháp lý</button><button type="button" id="lgAsk">Hỏi Ben như luật sư</button></div></div>
    <div class="opsgrid" style="margin-top:12px"><div><h3>Lịch tuân thủ 60 ngày tới</h3><ul class="todo" id="lgCal"></ul></div>
      <div><h3>Mốc hiệu lực cần chuẩn bị</h3><ul class="todo" id="lgSoon"></ul></div></div>
    <div class="toolbar"><label class="field">Lĩnh vực<select id="lgLv"><option value="">Tất cả</option>${LV.map(l => `<option>${esc(l)}</option>`).join("")}</select></label><label class="field" style="flex:1;min-width:220px">Tìm văn bản<input type="text" id="lgQ" placeholder="VD: lệ phí trước bạ, BHXH, dữ liệu cá nhân, khuyến mại"></label></div>
    <div id="lgList" class="lglist"></div>
    <p class="muted small" style="margin:10px 0 0">${esc(LG.note)}</p>`;
  anchor.before(s);
}
function render(){
  const el = document.getElementById("lgList"); if(!el) return;
  const list = search(document.getElementById("lgQ").value, document.getElementById("lgLv").value);
  el.innerHTML = list.map(d => { const [st, c] = status(d); return `<details class="lgdoc"><summary><span class="pill ${c}">${esc(st)}</span> <b>${esc(d.so)}</b> · ${esc(d.ten)} <span class="muted small">· ${esc(d.lv.join(", "))}${d.tin !== "cao" ? " · cần đối chiếu" : ""}</span></summary>
    <div class="small"><div class="muted">${esc(d.cq)} · ban hành ${vn(d.bh)} · hiệu lực ${vn(d.hl)}${d.het ? " đến " + vn(d.het) : ""}</div><ul>${d.diem.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
    <p><b>Tác động tới Đô Thành:</b> ${esc(d.tacdong)}</p><p><b>Việc cần làm:</b></p><ul>${d.viec.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
    <p class="muted">Nguồn: ${d.nguon.map(n => `<a href="${esc(n[1])}" target="_blank" rel="noopener noreferrer">${esc(n[0])}</a>`).join(" · ")}</p>
    <div class="toolbar"><button type="button" data-lgask="${esc(d.id)}">Ben phân tích áp dụng</button><button type="button" data-lgtask="${esc(d.id)}">Giao việc tuân thủ</button></div></div></details>`; }).join("") || '<p class="muted">Không có văn bản phù hợp trong kho. Hỏi Ben để được tư vấn theo nguyên tắc chung.</p>';
  const cal = upcoming(60); document.getElementById("lgCal").innerHTML = cal.map(c => `<li class="${dleft(c.d) <= 7 ? "red" : dleft(c.d) <= 20 ? "" : "blue"}"><b>${vn(c.d)}</b> · còn ${dleft(c.d)} ngày: ${esc(c.viec)}<br><span class="muted small">${esc(c.cs)}</span></li>`).join("") || '<li class="green">Không có mốc trong 60 ngày.</li>';
  const t = today(), soon = LG.docs.filter(d => d.hl > t || (d.het && d.het >= t && dleft(d.het) <= 180)).sort((a,b) => (a.het||a.hl).localeCompare(b.het||b.hl));
  document.getElementById("lgSoon").innerHTML = soon.map(d => `<li class="${dleft(d.het || d.hl) <= 45 ? "red" : ""}"><b>${esc(status(d)[0])}</b>: ${esc(d.so)}<br><span class="muted small">${esc(d.viec[0] || d.ten)}</span></li>`).join("") || '<li class="green">Không có.</li>';
}
document.addEventListener("input", e => { if(e.target.id === "lgQ") render(); });
document.addEventListener("change", e => { if(e.target.id === "lgLv") render(); });
document.addEventListener("click", e => {
  const id = e.target.id;
  if(id === "lgBrief"){ CV.openAi(true); CV.benTab("Chat"); CV.addMsg("u", "Tóm tắt pháp lý cập nhật"); const b = CV.addMsg("a", ""); CV.finishBubble(b, briefMd(), false, "Pháp lý cập nhật " + vn(today()), true); }
  if(id === "lgAsk"){ CV.openAi(true); CV.benTab("Chat"); const ta = document.getElementById("aiText"); ta.value = "Luật sư Ben ơi, "; ta.focus(); }
  const a = e.target.dataset && e.target.dataset.lgask; if(a){ const d = LG.docs.find(x => x.id === a); if(d) CV.askAi(`Với vai trò luật sư doanh nghiệp, phân tích ${d.so} (${d.ten}) áp dụng cho Đô Thành Auto (sản xuất lắp ráp, phân phối qua đại lý, dịch vụ xe tải): nghĩa vụ cụ thể, rủi ro và chế tài, việc phòng ban nào phải làm trước hạn nào. Dùng tra_cuu_phap_luat; nêu rõ phần nào cần đối chiếu văn bản gốc.`); }
  const tk = e.target.dataset && e.target.dataset.lgtask; if(tk){ const d = LG.docs.find(x => x.id === tk); if(d) CV.askAi(`Giao việc tuân thủ ${d.so}: dùng create_task cho phòng Pháp chế (người chịu trách nhiệm: hỏi lại tôi nếu chưa rõ), chỉ số "Hoàn thành rà soát tuân thủ ${d.so}", bằng chứng "Báo cáo rà soát có ký xác nhận + quy trình/mẫu biểu đã cập nhật", phòng xác nhận phù hợp, hạn hợp lý theo mốc hiệu lực. Việc cụ thể: ${d.viec.join("; ")}.`); }
});
render();

/* ---------- Ben: công cụ, lệnh nhanh, vai trò luật sư ---------- */
CV.tools.push(
  {name:"tra_cuu_phap_luat", label:"Đang tra cứu văn bản pháp luật…", description:"Tra cứu kho văn bản pháp luật Việt Nam đã cập nhật (thuế GTGT, TNDN, TNCN, TTĐB, lệ phí trước bạ, quản lý thuế, hóa đơn, kế toán, lương tối thiểu, BHXH, dữ liệu cá nhân, doanh nghiệp, khuyến mại, giao thông, đăng kiểm, nhập khẩu linh kiện, Hiến pháp sửa đổi). Trả về số hiệu, hiệu lực, điểm chính, tác động, việc cần làm, nguồn, độ tin cậy.",
   inputSchema:{type:"object",properties:{query:{type:"string"},linh_vuc:{type:"string"}}}, execute: ({query, linh_vuc}) => { const r = search(query || "", LV.includes(linh_vuc) ? linh_vuc : ""); return r.length ? `Kho cập nhật đến ${vn(LG.updated)}.\n\n` + r.slice(0, 5).map(docMd).join("\n") : `Không có trong kho (cập nhật đến ${vn(LG.updated)}). Trả lời theo nguyên tắc pháp luật chung, nói rõ chưa xác minh văn bản mới nhất và khuyên tra vbpl.vn / Công báo.`; }},
  {name:"lich_tuan_thu", label:"Đang xem lịch tuân thủ…", description:"Các hạn nộp thuế, BHXH, báo cáo và mốc hiệu lực pháp luật trong N ngày tới (mặc định 60).", inputSchema:{type:"object",properties:{days:{type:"number"}}},
   execute: ({days}) => upcoming(Math.min(+days || 60, 400)).map(c => `${vn(c.d)} (còn ${dleft(c.d)} ngày): ${c.viec} — ${c.cs}`).join("\n") || "Không có mốc"},
);
CV.localHooks.unshift(raw => {
  const t = raw.replace(/^ben\s*(ơi)?[,:\s]+/i, "").trim(), low = t.toLowerCase();
  if(/^(lịch thuế|lịch tuân thủ|hạn nộp|hạn thuế)/.test(low)){ const c = upcoming(60); return `## Lịch tuân thủ 60 ngày tới\n${c.map(x => `- ${vn(x.d)} (còn ${dleft(x.d)} ngày): ${x.viec} · _${x.cs}_`).join("\n")}\n\n_Kho cập nhật đến ${vn(LG.updated)}; hạn cụ thể đối chiếu Luật Quản lý thuế 2025 và NĐ 252/2026._`; }
  if(/^(pháp lý mới|văn bản mới|luật mới|tóm tắt pháp lý)/.test(low)) return briefMd();
  const m = t.match(/^(?:tra cứu|tra luật|văn bản)\s+(.+)$/i); if(m){ const r = search(m[1], ""); return r.length ? `_Kho cập nhật đến ${vn(LG.updated)}_\n\n` + r.slice(0, 3).map(docMd).join("\n") : null; }
  return null;
});
const inst = document.getElementById("aiInstant");
if(inst){ const b = document.createElement("button"); b.type = "button"; b.textContent = "Pháp lý mới nhất"; b.addEventListener("click", () => { CV.openAi(true); CV.addMsg("u", "Pháp lý mới nhất"); const m = CV.addMsg("a", ""); CV.finishBubble(m, briefMd(), false, "Pháp lý cập nhật", true); }); inst.appendChild(b); }
const prevCtx = CV.ctx;
CV.ctx = () => (prevCtx ? prevCtx() : "") + `
BEN LUẬT SƯ DOANH NGHIỆP: Ben tư vấn như luật sư doanh nghiệp nhiều kinh nghiệm cho Tổng Giám đốc tập đoàn sản xuất – thương mại – dịch vụ ô tô tải (Hiến pháp, luật, nghị quyết, nghị định, thông tư, công văn của Bộ Tài chính, Bộ Công Thương, Bộ Xây dựng, Bộ Công an, cơ quan thuế, BHXH). Quy tắc bắt buộc:
(1) Với câu hỏi pháp lý, LUÔN gọi tra_cuu_phap_luat trước. Trả lời theo cấu trúc: Kết luận ngắn → Căn cứ pháp lý (số hiệu, cơ quan, ngày hiệu lực, tình trạng) → Áp dụng cho Đô Thành → Rủi ro, chế tài → Việc cần làm (phòng ban, hạn) → Lưu ý cập nhật.
(2) Không bao giờ bịa số hiệu văn bản, điều khoản hay mức phạt. Văn bản không có trong kho hoặc ghi "cần đối chiếu" thì nói rõ, nêu nguyên tắc chung và khuyên đối chiếu vbpl.vn, congbao.chinhphu.vn, thuvienphapluat.vn.
(3) Kho văn bản cập nhật đến ${vn(LG.updated)}; mọi văn bản ban hành sau ngày đó Ben chưa biết. Giao dịch lớn, tranh chấp, thanh tra: khuyến nghị xin ý kiến luật sư hoặc tư vấn thuế có chứng chỉ.
(4) Dùng lich_tuan_thu cho câu hỏi về hạn nộp, mốc hiệu lực. Có thể dùng create_task để giao việc tuân thủ khi người dùng yêu cầu.`;
})();
