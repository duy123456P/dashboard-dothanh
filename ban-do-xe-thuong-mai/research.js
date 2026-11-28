/* ===== Deep research bằng AI bên ngoài (ChatGPT, Grok, Perplexity, Gemini, Claude, Copilot, DeepSeek, Kimi...) =====
   Bản đồ không gọi các AI này ngầm: tạo lời nhắc chuẩn (yêu cầu mọi số liệu kèm đường dẫn nguồn), mở công cụ bằng một cú bấm,
   anh dán kết quả về để kiểm tra nguồn (dòng nào thiếu đường dẫn bị đánh dấu) và lưu vào sổ nguồn. Chỉ gửi thông tin công khai, không gửi số liệu nội bộ. */
(function(){
"use strict";
const CV = window.__CV; if(!CV) return;
const {esc} = CV, LS = "dac.research";
const TOOLS = [
  {k: "chatgpt", n: "ChatGPT", u: q => "https://chatgpt.com/?q=" + encodeURIComponent(q) + "&hints=search", pre: true},
  {k: "grok", n: "Grok", u: q => "https://grok.com/?q=" + encodeURIComponent(q), pre: true},
  {k: "pplx", n: "Perplexity", u: q => "https://www.perplexity.ai/search?q=" + encodeURIComponent(q), pre: true},
  {k: "claude", n: "Claude", u: q => "https://claude.ai/new?q=" + encodeURIComponent(q), pre: true},
  {k: "copilot", n: "Copilot", u: q => "https://copilot.microsoft.com/?q=" + encodeURIComponent(q), pre: true},
  {k: "gemini", n: "Gemini", u: () => "https://gemini.google.com/app", pre: false},
  {k: "deepseek", n: "DeepSeek", u: () => "https://chat.deepseek.com/", pre: false},
  {k: "kimi", n: "Kimi", u: () => "https://www.kimi.com/", pre: false},
  {k: "qwen", n: "Qwen", u: () => "https://chat.qwen.ai/", pre: false},
];
const TOPICS = {
  gia: ["Giá bán công bố và giá bán thực tế đang áp dụng", "bảng giá xe tải, van, ben hiện hành (ghi từng dòng xe: giá công bố, đã gồm VAT hay chưa, ngày bảng giá, ngày hiệu lực)"],
  km: ["Chính sách ưu đãi, khuyến mãi, trả góp hiện hành", "chương trình khuyến mãi, hỗ trợ lãi suất, tặng quà đang còn hiệu lực trong tháng này (ghi mức ưu đãi, điều kiện, kỳ áp dụng từ ngày đến ngày, văn bản thông báo)"],
  mxh: ["Kênh mạng xã hội và video quảng cáo", "fanpage Facebook, kênh YouTube, TikTok, Zalo chính thức; 5 video quảng cáo ngắn mới nhất về sản phẩm, hệ thống đại lý, showroom, xưởng dịch vụ (ghi tiêu đề, ngày đăng, đường dẫn từng video, lượt xem nếu hiển thị)"],
  cs: ["Showroom, xưởng dịch vụ, nhận diện thương hiệu", "chuẩn showroom 3S, khu vực dịch vụ, logo, khẩu hiệu, màu nhận diện, địa chỉ các điểm bán, xưởng ở khu vực được hỏi (ghi địa chỉ, nguồn)"],
  dl: ["Đại lý, điểm bán mới và mạng lưới", "danh sách đại lý, điểm bán, xưởng dịch vụ; điểm mới mở hoặc đóng trong 6 tháng qua (ghi tên, địa chỉ, nguồn)"],
  pl: ["Pháp luật, thuế, phí ảnh hưởng xe thương mại", "văn bản pháp luật mới về xe tải, đăng kiểm, niên hạn, thuế, lệ phí trước bạ, tải trọng (ghi số hiệu, ngày ban hành, ngày hiệu lực, cơ quan, đường dẫn văn bản gốc)"],
  tt: ["Thị trường, đăng ký mới, thị phần", "số liệu đăng ký mới, doanh số theo hãng, theo tỉnh, phân khúc xe thương mại (ghi kỳ số liệu, đơn vị, cơ quan công bố, đường dẫn)"],
};
const BRANDS = ["Đô Thành (DOTHANH)", "Thaco", "Teraco (Daehan Motors)", "JAC", "Foton", "TMT Cửu Long", "Isuzu", "VEAM", "Kim Long"];
const st = {topic: "gia", brands: new Set(["Thaco", "Teraco (Daehan Motors)", "JAC"]), prov: ""};
const log = () => { try{ return JSON.parse(localStorage.getItem(LS) || "[]"); }catch(e){ return []; } };
const saveLog = a => { try{ localStorage.setItem(LS, JSON.stringify(a.slice(-200))); }catch(e){} };
const today = () => new Date().toLocaleDateString("vi-VN");
function prompt_(){
  const t = TOPICS[st.topic], br = [...st.brands].join(", ") || "các hãng xe thương mại tại Việt Nam", pv = st.prov ? ", khu vực " + st.prov : "";
  return `Hôm nay là ${today()}. Hãy nghiên cứu sâu, tìm trên web các nguồn mới nhất về ${t[0].toLowerCase()} của: ${br}${pv} (xe tải, xe thương mại tại Việt Nam).
Cần: ${t[1]}.
Yêu cầu bắt buộc:
1. Trả lời bằng bảng: Hạng mục | Số liệu | Ngày áp dụng hoặc ngày đăng | Đường dẫn nguồn đầy đủ (https://...) | Loại nguồn (chính thức, đại lý, báo chí, bên thứ ba).
2. Ưu tiên website, fanpage, kênh chính thức của hãng, rồi văn bản của hãng, đại lý ủy quyền, báo chí. Mỗi dòng phải có đường dẫn mở được tới đúng trang chứa số liệu.
3. Không có nguồn thì ghi "không tìm thấy", tuyệt đối không suy đoán hay tự điền số.
4. Ghi rõ thông tin nào đã hết hiệu lực hoặc chưa kiểm chứng được.
5. Cuối bảng liệt kê các điểm mâu thuẫn giữa các nguồn.`;
}
const dlg = document.createElement("dialog"); dlg.className = "odlg"; dlg.id = "drDlg"; dlg.style.width = "min(1000px,97vw)"; dlg.setAttribute("aria-labelledby", "drT");
dlg.innerHTML = `<header><h3 id="drT">Tìm dẫn chứng bằng AI bên ngoài (deep research)</h3><button type="button" class="x" data-close>Đóng</button></header><div class="body" id="drBody"></div>`;
document.body.appendChild(dlg);
function srcRows(txt){
  const all = String(txt || "").split("\n").map(s => s.trim()).filter(s => /\|/.test(s)), isSep = s => /^\|?\s*[-:| ]+\|?$/.test(s);
  const rows = all.filter((s, i) => !isSep(s) && !(all[i + 1] && isSep(all[i + 1])));   // bỏ dòng phân cách và dòng tiêu đề
  return rows.map(r => { const u = (r.match(/https?:\/\/[^\s|)\]>"']+/g) || []).map(x => x.replace(/[.,;]+$/, "")); const hasNum = /\d/.test(r.replace(/https?:\/\/\S+/g, "")); return {r, u, hasNum}; });
}
function render(){
  const body = dlg.querySelector("#drBody"), p = prompt_(), L = log();
  const prov = CV.rows.map(r => r.name).sort((a, b) => a.localeCompare(b, "vi"));
  body.innerHTML = `<p class="small muted" style="margin:0 0 8px">Mọi số liệu thị trường phải có nguồn bấm được. Các AI bên ngoài dưới đây dùng được bản miễn phí (có thể giới hạn số lượt hoặc phải đăng nhập). Chỉ gửi thông tin công khai; <b>không dán số liệu nội bộ, tên khách, số khung</b>. Bản đồ không tự gửi gì, anh bấm nút để mở công cụ.</p>
  <div class="hudgrid"><div class="hp w6"><h3>1. Chọn nội dung cần tìm</h3>
   <label class="field small">Chủ đề<select id="drTopic">${Object.entries(TOPICS).map(([k, v]) => `<option value="${k}"${k === st.topic ? " selected" : ""}>${esc(v[0])}</option>`).join("")}</select></label>
   <div class="small" style="margin:6px 0">Hãng: ${BRANDS.map(b => `<label style="margin-right:10px;white-space:nowrap"><input type="checkbox" data-br="${esc(b)}"${st.brands.has(b) ? " checked" : ""}> ${esc(b)}</label>`).join("")}</div>
   <label class="field small">Khu vực (không bắt buộc)<select id="drProv"><option value="">Toàn quốc</option>${prov.map(n => `<option${n === st.prov ? " selected" : ""}>${esc(n)}</option>`).join("")}</select></label></div>
   <div class="hp w6"><h3>2. Mở AI để chạy <span>bấm một cú</span></h3>
    <div style="display:flex;gap:6px;flex-wrap:wrap">${TOOLS.map(t => `<button type="button" class="primary" data-ai="${t.k}" title="${t.pre ? "Mở sẵn lời nhắc" : "Lời nhắc được chép vào bộ nhớ tạm, dán vào khung chat"}">${esc(t.n)}${t.pre ? "" : " (dán)"}</button>`).join("")}</div>
    <p class="tiny muted" style="margin:6px 0">Công cụ có “(dán)”: lời nhắc đã được chép, mở trang rồi bấm dán (Ctrl+V). Với các công cụ còn lại, nếu lời nhắc không hiện sẵn thì dán như trên. Nên bật chế độ “Deep research” hoặc “Tìm kiếm web” của từng công cụ.</p></div>
   <div class="hp w12"><h3>Lời nhắc chuẩn <span>bắt buộc kèm nguồn</span></h3><textarea id="drPrompt" rows="9" style="width:100%" readonly>${esc(p)}</textarea><div style="margin-top:6px"><button type="button" id="drCopy">Chép lời nhắc</button></div></div>
   <div class="hp w12"><h3>3. Dán kết quả về để kiểm tra nguồn</h3><textarea id="drPaste" rows="7" style="width:100%" placeholder="Dán bảng kết quả AI trả về vào đây (có cột đường dẫn)"></textarea>
    <div style="margin:6px 0;display:flex;gap:6px;flex-wrap:wrap"><button type="button" id="drCheck" class="primary">Kiểm tra nguồn</button><button type="button" id="drSave">Lưu vào sổ nguồn</button></div><div id="drOut" class="small"></div></div>
   <div class="hp w12"><h3>Sổ nguồn đã lưu <span>${L.length} lượt · lưu trên trình duyệt này</span></h3>${L.length ? `<div style="max-height:240px;overflow:auto"><table class="tasktbl small"><thead><tr><th>Ngày</th><th>Chủ đề</th><th>Hãng, khu vực</th><th class="num">Dòng có nguồn</th><th>Nguồn</th></tr></thead><tbody>${L.slice().reverse().map(x => `<tr><td>${esc(x.d)}</td><td>${esc(x.t)}</td><td class="tiny">${esc(x.b)}</td><td class="num">${x.ok}/${x.n}</td><td class="tiny">${x.u.slice(0, 4).map(u => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(u.replace(/^https?:\/\/(www\.)?/, "").slice(0, 38))}</a>`).join("<br>")}</td></tr>`).join("")}</tbody></table></div><button type="button" id="drExp" style="margin-top:6px">Tải sổ nguồn (.csv)</button>` : '<p class="muted small">Chưa có.</p>'}</div></div>`;
}
function check(){
  const R = srcRows(dlg.querySelector("#drPaste").value), out = dlg.querySelector("#drOut"); if(!R.length){ out.innerHTML = '<span style="color:var(--bad)">Chưa thấy bảng kết quả. Dán đúng bảng có dấu | giữa các cột.</span>'; return null; }
  const ok = R.filter(x => x.u.length), bad = R.filter(x => !x.u.length && x.hasNum);
  out.innerHTML = `<b>${ok.length}/${R.length}</b> dòng có đường dẫn nguồn. ${bad.length ? `<span style="color:var(--bad)">${bad.length} dòng có số liệu nhưng thiếu đường dẫn: chưa được dùng làm dẫn chứng.</span>` : '<span style="color:var(--good,#4ee2a0)">Mọi dòng có số liệu đều có đường dẫn.</span>'}
   <p class="tiny muted" style="margin:4px 0">Đường dẫn chỉ cho biết AI có nêu nguồn, chưa chứng minh nguồn đúng. Bấm từng liên kết để đối chiếu trước khi nhập vào bản đồ.</p>
   <table class="tasktbl small"><tbody>${R.map(x => `<tr style="${!x.u.length && x.hasNum ? "background:rgba(255,80,80,.12)" : ""}"><td class="tiny">${esc(x.r.replace(/https?:\/\/\S+/g, "").slice(0, 160))}</td><td class="tiny">${x.u.length ? x.u.map(u => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(u.replace(/^https?:\/\/(www\.)?/, "").slice(0, 44))}</a>`).join("<br>") : '<b style="color:var(--bad)">thiếu nguồn</b>'}</td></tr>`).join("")}</tbody></table>`;
  return {R, ok, bad};
}
dlg.addEventListener("click", async e => { const t = e.target;
  if(t.closest("[data-close]")) return dlg.close();
  if(t.dataset && t.dataset.ai){ const tool = TOOLS.find(x => x.k === t.dataset.ai), p = prompt_(); try{ await navigator.clipboard.writeText(p); }catch(_){ dlg.querySelector("#drPrompt").select(); }
    const u = tool.u(p); window.open(u.length > 7500 ? tool.u("") : u, "_blank", "noopener"); return; }
  if(t.id === "drCopy"){ try{ await navigator.clipboard.writeText(prompt_()); t.textContent = "Đã chép"; }catch(_){ dlg.querySelector("#drPrompt").select(); } return; }
  if(t.id === "drCheck") return void check();
  if(t.id === "drSave"){ const c = check(); if(!c) return; const a = log(); a.push({d: today(), t: TOPICS[st.topic][0], b: [...st.brands].join(", ") + (st.prov ? " · " + st.prov : ""), n: c.R.length, ok: c.ok.length, u: [...new Set(c.R.flatMap(x => x.u))].slice(0, 40)}); saveLog(a); render(); return; }
  if(t.id === "drExp"){ const rows = [["Ngày", "Chủ đề", "Hãng, khu vực", "Dòng", "Có nguồn", "Nguồn"]].concat(log().map(x => [x.d, x.t, x.b, x.n, x.ok, x.u.join(" ")])); const csv = "\ufeff" + rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(",")).join("\r\n"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], {type: "text/csv"})); a.download = "so-nguon-thi-truong.csv"; a.click(); } });
dlg.addEventListener("change", e => { const t = e.target; if(t.id === "drTopic"){ st.topic = t.value; } else if(t.id === "drProv"){ st.prov = t.value; } else if(t.dataset && t.dataset.br){ t.checked ? st.brands.add(t.dataset.br) : st.brands.delete(t.dataset.br); } else return; const keep = dlg.querySelector("#drPaste").value; render(); dlg.querySelector("#drPaste").value = keep; });
function open(topic, brand, prov){ if(topic && TOPICS[topic]) st.topic = topic; if(brand){ st.brands = new Set([].concat(brand)); } if(prov !== undefined) st.prov = prov || ""; render(); if(!dlg.open) dlg.showModal(); }
const tools = document.querySelector(".maptools"); if(tools){ const b = document.createElement("button"); b.type = "button"; b.id = "btnDR"; b.textContent = "Tìm nguồn bằng AI"; b.title = "Mở ChatGPT, Grok, Perplexity... với lời nhắc chuẩn, mọi số liệu kèm đường dẫn nguồn"; b.addEventListener("click", () => open()); const u = document.getElementById("btnUpd"); u ? u.after(b) : tools.appendChild(b); }
CV.openResearch = open; CV.researchPrompt = prompt_;
CV.tools.push({name: "tim_nguon_ai", label: "Đang soạn lời nhắc deep research…", description: "Mở công cụ Tìm nguồn bằng AI bên ngoài (ChatGPT, Grok, Perplexity, Gemini, Claude, Copilot, DeepSeek, Kimi) với lời nhắc chuẩn bắt buộc kèm đường dẫn nguồn. chu_de: gia | km | mxh | cs | dl | pl | tt; hang: danh sách hãng; tinh: khu vực.", inputSchema: {type: "object", properties: {chu_de: {type: "string"}, hang: {type: "array", items: {type: "string"}}, tinh: {type: "string"}}},
  execute: ({chu_de, hang, tinh}) => { open(chu_de, hang && hang.length ? hang : null, tinh || ""); return "Đã mở **Tìm nguồn bằng AI**. Lời nhắc chuẩn:\n\n```\n" + prompt_() + "\n```\nBấm tên AI để mở; dán kết quả về để kiểm tra nguồn."; }});
CV.localHooks.unshift(raw => { if(!/(deep research|tìm nguồn bằng ai|tìm dẫn chứng|chatgpt|grok)/i.test(raw)) return null; open(); return "Đã mở **Tìm nguồn bằng AI**: chọn chủ đề, hãng, bấm ChatGPT, Grok, Perplexity... rồi dán kết quả về để kiểm tra nguồn."; });
})();
