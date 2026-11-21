/* ===== Binh pháp Tôn Tử · Thiên – Địa – Nhân cho từng địa bàn, thống nhất dưới một Đạo: tăng giá trị thương hiệu DAC ===== */
(function(){
"use strict";
const CV = window.__CV; if(!CV) return;
const {esc, fmtInt, fmt1} = CV;
const SU = () => (CV.boardSrc || {U: {}}).U, srcH = ks => (ks || []).map(k => SU()[k]).filter(Boolean).map(([t, u]) => u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(t)}</a>` : esc(t)).join(" · "), srcM = ks => (ks || []).map(k => SU()[k]).filter(Boolean).map(([t, u]) => u ? `[${t}](${u})` : t).join("; ");
const sum = a => a.reduce((x,y) => x + (y || 0), 0), clamp = v => Math.max(0, Math.min(100, Math.round(v)));

/* ---------- Đạo của DAC: nguyên tắc thương hiệu chung, mọi địa bàn phải tuân thủ ---------- */
const DAO = {
  goal: "Tăng giá trị thương hiệu DAC nhanh nhất, chắc chắn nhất: khách tin chọn DAC vì bền, chi phí sở hữu thấp, dịch vụ gần; đại lý có lãi bền vững; giá xe giữ được trên thị trường xe cũ.",
  rules: [
    ["Một giá, một thông điệp", "Không bán dưới giá sàn; xe MBTB (giá riêng) không được xả phá giá thị trường. Thông điệp thống nhất: giá ròng sau ưu đãi + TCO + bền + dịch vụ gần."],
    ["Bán lẻ là gốc", "Chỉ tiêu, thưởng tính theo bán lẻ; xuất sỉ khi tồn đại lý ≤ 2 tháng bán; không dồn hàng để đạt số."],
    ["Dịch vụ là thành trì", "Mỗi địa bàn có điểm dịch vụ trong bán kính 60 km hoặc xe dịch vụ lưu động 24h; mùa bão, cao điểm có đội cứu hộ."],
    ["Chọn trận đánh", "Dồn lực vào phân khúc DAC có lợi thế giá ròng, sản phẩm (1,9–2,5 tấn, thùng dài, 7 tấn); không dàn trải."],
    ["Số liệu là quân lệnh", "Mọi quyết định dựa trên số bán, tồn, đăng ký, giá đối thủ đã kiểm chứng; huyền học chỉ để chọn thời điểm, tạo đồng lòng, không thay số liệu."]],
  kpi: ["Thị phần theo nhóm xe", "Giá xuất hóa đơn bình quân so với đối thủ (không chiết khấu sâu hơn)", "Giá trị bán lại xe 2–3 năm tuổi", "CSI, tỷ lệ khách giới thiệu", "Thời gian sửa chữa, khoảng cách tới điểm dịch vụ"]};

/* ---------- Cửu địa (Tôn Tử, thiên Cửu địa) ---------- */
const CUU = {
  tan: ["Tản địa", "Tản địa tắc vô chiến", "Đất nhà dễ tan quân, không giao chiến mà cố kết lòng người.", "Địa bàn mạnh của DAC: giữ đại lý, khách cũ; chương trình khách thân thiết, dịch vụ; không đua giảm giá."],
  khinh: ["Khinh địa", "Khinh địa tắc vô chỉ", "Mới vào nông đất địch, không được dừng lại.", "Mới hiện diện, bán ít: hoặc đi sâu nhanh (đại lý cấp 2, đội bán lưu động, khách đội xe), hoặc rút về bán theo dự án; không nằm lửng."],
  tranh: ["Tranh địa", "Tranh địa tắc vô công", "Đất hai bên cùng giành, ai chiếm trước được lợi; không đánh thẳng vào chỗ địch đã chiếm.", "Thị trường hấp dẫn đang tăng trưởng: chiếm trước phân khúc đối thủ chưa giữ chắc (thùng dài, 1,9–2,5 tấn giá ròng thấp), không đối đầu nơi đối thủ mạnh nhất."],
  giao: ["Giao địa", "Giao địa tắc vô tuyệt", "Đất giao thông bốn ngả, giữ liên lạc, không để bị cắt.", "Đô thị lớn nhiều hãng: phủ dày điểm bán, dịch vụ, liên kết ngân hàng, logistics; không để đứt mạng lưới, không để khách chờ xe."],
  cu: ["Cù địa", "Cù địa tắc hợp giao", "Đất giáp nhiều nước, kết giao đồng minh.", "Cảng, cửa khẩu, đầu mối logistics: liên minh với doanh nghiệp vận tải, đại lý đa thương hiệu, đơn vị cho thuê tài chính."],
  trong: ["Trọng địa", "Trọng địa tắc lược", "Vào sâu đất địch, lấy lương tại chỗ.", "Sân nhà đối thủ, DAC chưa có gốc: bán vào chính khách của đối thủ (so TCO, đổi xe cũ lấy xe mới), dùng nguồn lực tại chỗ (đại lý đa thương hiệu, garage)."],
  phiem: ["Phiếm địa", "Phiếm địa tắc hành", "Núi rừng, đầm lầy, đường khó: đi nhanh qua, không đóng quân lâu.", "Miền núi, cao nguyên: không đầu tư cố định lớn; đội bán, dịch vụ lưu động theo mùa vụ; xe bền, leo dốc."],
  vi: ["Vi địa", "Vi địa tắc mưu", "Lối vào hẹp, đường ra vòng: phải dùng mưu.", "Thị trường nhỏ, sức mua thấp, đối thủ chắn lối: dùng mưu (tài chính trả góp riêng, liên kết hợp tác xã, xe tập lái, dự án công)."],
  tu: ["Tử địa", "Tử địa tắc chiến", "Đất chết: đánh nhanh thì sống, chậm thì mất.", "Tồn kho đọng, bán đứng: tổng lực xả tồn trong 30 ngày, thưởng nóng theo xe bán lẻ, điều chuyển xe; ngừng nhận sỉ."]};
const KE = {
  muucong: ["Mưu công", "Thượng binh phạt mưu, kỳ thứ phạt giao, kỳ thứ phạt binh, kỳ hạ công thành", "Thắng bằng mưu trước, không công thành"],
  huthuc: ["Hư thực", "Binh chi hình, tị thực nhi kích hư", "Tránh chỗ mạnh, đánh chỗ yếu của đối thủ"],
  quanhinh: ["Quân hình", "Tiên vi bất khả thắng, dĩ đãi địch chi khả thắng", "Trước làm mình không thể bị đánh bại, rồi chờ thời cơ thắng"],
  binhthe: ["Binh thế", "Phàm chiến giả, dĩ chính hợp, dĩ kỳ thắng", "Lấy chính binh đối đầu, lấy kỳ binh giành thắng"],
  tacchien: ["Tác chiến", "Binh quý thắng, bất quý cửu", "Dụng binh quý ở thắng nhanh, không quý kéo dài"],
  ke: ["Thủy kế", "Đa toán thắng, thiểu toán bất thắng", "Tính toán kỹ thì thắng, tính ít thì không thắng"]};

/* ---------- số theo tỉnh ---------- */
function data(r){
  const TX = CV.TX, prov = n => { const d = CV.NET.dealers.find(x => x.salesKey === n); return d ? d.province : null; };
  let le = 0, si = 0; if(TX){ const ms = new Set(TX.months.filter(m => m < TX.asOf.slice(0,7)).slice(-12)); TX.tx.forEach(t => { if(ms.has(t[0]) && prov(TX.dealers[t[1]]) === r.name){ le += t[5]; si += t[6]; } }); }
  const lines = CV.inv ? CV.inv.dealers.filter(l => prov(l.link) === r.name) : [], inv = sum(lines.map(l => l.ton)), invLe = sum(lines.map(l => l.leT11)), mbtb = sum(lines.map(l => l.mbtb)), old = sum(lines.map(l => ((l.age||{})["181-365"]||0) + ((l.age||{})[">365"]||0)));
  // tháng bán của tồn: theo bán lẻ bình quân 12 tháng (ổn định hơn T11 mới 21 ngày); T11 dùng làm tín hiệu nóng
  const cover = inv ? (le ? inv / (le / 12) : invLe ? inv / (invLe / (CV.inv.daysT11 / 30)) : 99) : null;
  const ds = CV.NET.dealers.filter(d => d.province === r.name && d.leCum != null), comp = CV.CNET ? CV.CNET.points.filter(p => p.province === r.name).length : 0;
  return {le, si, inv, invLe, mbtb, old, cover, ds, comp, nd: (r._c4 || 0) + (r._c3 || 0)};
}
function nguSu(r){
  const x = data(r), T = CV.tdn ? CV.tdn(r) : null, ratio = x.le ? x.si / x.le : null;
  const dao = x.nd ? clamp(80 - (ratio == null ? 10 : Math.abs(ratio - 1) * 60) - (x.cover == null ? 0 : x.cover > 6 ? 30 : x.cover > 3 ? 15 : 0) - (x.inv ? x.mbtb / x.inv * 20 : 0)) : 20;
  const thien = T ? clamp(T.P[0][1]) : 50, dia = T ? clamp(T.P[1][1]) : 50;
  const tuong = x.ds.length ? clamp(sum(x.ds.map(d => d.score || 60)) / x.ds.length * 0.8 + Math.min(20, sum(x.ds.map(d => d.tvbh || 0)) * 2)) : 15;
  const phap = x.nd ? clamp((r.target ? Math.min(1, r._kpct / 100) * 60 : 30) + (x.cover == null ? 20 : x.cover <= 3 ? 25 : x.cover <= 6 ? 10 : 0) + (x.inv ? 15 * (1 - x.old / x.inv) : 15)) : 15;
  return {x, ratio, items: [
    ["Đạo", dao, "Đại lý cùng chí hướng thương hiệu: bán sỉ khớp bán lẻ, tồn lành mạnh, không phá giá", ratio == null ? "chưa có số bán 12 tháng" : `bán sỉ/bán lẻ 12 tháng ${fmt1(ratio)}; tồn ${x.inv} xe${x.inv ? `, MBTB ${x.mbtb}` : ""}`, ["tx", "inv"]],
    ["Thiên", thien, "Thời: tăng trưởng, mùa vụ, nhịp thay xe", `tăng trưởng 2025 ${r.growth == null ? "—" : fmt1(r.growth) + "%"}; mùa vụ tháng ${new Date().getMonth()+1}: mức ${(r.season||[])[new Date().getMonth()] ?? "—"}/3`, ["g25", "g9"]],
    ["Địa", dia, "Thế đất: mạng lưới, khoảng cách dịch vụ, địa hình, hạ tầng", `${x.nd} đại lý; ${x.comp} điểm đối thủ đã xác minh; độ cao TB ${fmtInt(r.elev)} m`, ["dtweb", "comp"]],
    ["Tướng", tuong, "Người cầm quân: năng lực đại lý, đội tư vấn", x.ds.length ? x.ds.map(d => `${d.salesKey} hạng ${d.grade || "—"} ${d.tvbh ? d.tvbh + " TVBH" : ""}`).join("; ") : "chưa có đại lý", ["tdbh"]],
    ["Pháp", phap, "Kỷ luật: đạt kế hoạch, quản trị tồn, tuổi xe", `${r.target ? "đạt KH " + fmtInt(r._kpct) + "%" : "chưa có KH"}; ${x.cover == null ? "chưa có tồn" : x.cover >= 99 ? "chưa có bán lẻ" : "tồn " + x.inv + " xe = " + fmt1(x.cover) + " tháng bán (bình quân 12 tháng)"}${x.inv && !x.invLe ? "; T11 (đến 21/11) chưa bán lẻ xe nào" : ""}${x.old ? `; ${x.old} xe > 180 ngày` : ""}`, ["tdbh", "tx", "inv"]]]};
}
function terrain(r, N){
  const P = CV.boardPosture ? CV.boardPosture(r) : null, x = N.x, arch = r.archetype, k = [];
  if(x.inv && (x.cover >= 6 || (x.cover >= 4 && !x.invLe && x.inv >= 10))) k.push("tu");
  if(!x.nd && x.comp >= 2) k.push(P && P.attr >= 0.5 ? "trong" : "khinh");
  else if(!x.nd || (r.sales || 0) < 30) k.push("khinh");
  if(arch === "metro") k.push("giao"); else if(arch === "port" || arch === "border") k.push("cu");
  if((arch === "mountain" || arch === "highland") && r.elev >= 400) k.push("phiem");
  if(P && P.k === "fast") k.push("tranh"); if(P && P.k === "hold") k.push("tan"); if(P && P.k === "guer" && !k.includes("phiem")) k.push("vi"); if(P && P.k === "slow" && !k.length) k.push("tranh");
  return [...new Set(k)].slice(0, 3).map(id => CUU[id]);
}
function kePick(r, N){
  const P = CV.boardPosture ? CV.boardPosture(r) : null, out = [], x = N.x, pano = CV.compPano ? CV.compPano() : null;
  const win = pano ? pano.rows.filter(z => z.gap != null && z.gap < 0).map(z => z.sg) : [];
  if(x.comp >= 2) out.push([KE.huthuc, `Đối thủ có ${x.comp} điểm tại tỉnh. Tránh đối đầu ở phân khúc họ rẻ hơn; tập trung nơi DAC rẻ hơn sau ưu đãi: ${win.join(", ") || "1,9–2,5 tấn, thùng dài"}.`]);
  out.push([KE.muucong, "Thắng bằng mưu trước khi giảm giá: gói tài chính trả góp riêng, thu cũ đổi mới, hợp đồng bảo dưỡng trọn gói, liên kết hợp tác xã, trường lái, doanh nghiệp logistics."]);
  if(P && (P.k === "slow" || P.k === "guer")) out.push([KE.quanhinh, "Dựng thế không thể bị đánh bại trước: điểm dịch vụ, phụ tùng sẵn, đội xe chứng minh; chưa dồn khuyến mãi khi nền móng chưa có."]);
  out.push([KE.binhthe, "Chính binh: IZ chủ lực (IZ50S, IZ65M-PLUS, IZ71SL-PLUS) đối đầu Kia, Isuzu, JAC. Kỳ binh: van MISSU, T33L cho giao hàng nội đô (né giờ cấm tải), JP120 theo dự án, xe tập lái."]);
  if((P && P.k === "fast") || (x.inv && x.cover >= 6)) out.push([KE.tacchien, `Chiến dịch ngắn 30–45 ngày${x.inv ? `, mục tiêu đưa tồn ${x.inv} xe về ≤ 2 tháng bán` : ""}; đo kết quả hằng tuần, dừng ngay nếu không hiệu quả.`]);
  out.push([KE.ke, "Mỗi quyết định ghi rõ số liệu căn cứ (bán, tồn, đăng ký, giá đối thủ) và chỉ số đo kết quả; huyền học chỉ dùng chọn thời điểm khởi sự."]);
  return out;
}
function thienThoi(r){
  if(!CV.lich) return null; const L = CV.lich(new Date());
  const plate = parseInt(String(r.plates || "").match(/\d+/) || [0], 10) || r.name.length, G = CV.gieo ? CV.gieo({a: plate, b: (new Date().getMonth() + 1) * 10 + (r.zone || "").length, q: "Chiến dịch " + r.name}) : null;
  return {L, G};
}
function warplan(r){
  const N = nguSu(r), Tr = terrain(r, N), K = kePick(r, N), TT = thienThoi(r), weak = N.items.slice().sort((a,b) => a[1] - b[1])[0];
  const bar = v => `<span style="display:inline-block;width:80px;height:8px;border-radius:4px;background:rgba(142,167,199,.15);vertical-align:middle"><i style="display:block;height:8px;border-radius:4px;width:${v}%;background:${v >= 65 ? "#4ee2a0" : v >= 40 ? "#ffc35a" : "#ff6b6b"}"></i></span>`;
  const html = `<div class="hp w12 wp" style="margin-top:12px"><h3>Binh pháp Tôn Tử · Thiên – Địa – Nhân <span>tác chiến tại ${esc(r.name)}, thống nhất theo Đạo thương hiệu DAC</span></h3>
    <div class="hudgrid"><div class="hp w6"><h3>Ngũ sự (Kế thiên) <span>yếu nhất: ${esc(weak[0])}</span></h3><div class="small">${N.items.map(([n,v,d,e,ks]) => `<div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:5px 0;border-bottom:1px solid rgba(142,167,199,.12)"><div style="min-width:0"><b>${n}</b> <span class="muted tiny">${esc(d)}</span><div class="tiny" style="color:var(--cyan);margin-top:2px">${esc(e)}</div><div class="tiny muted">Nguồn: ${srcH(ks)}</div></div><div style="white-space:nowrap">${bar(v)} <b>${v}</b></div></div>`).join("")}</div>
      <p class="note">“Kinh chi dĩ ngũ sự… nhất viết Đạo, nhị viết Thiên, tam viết Địa, tứ viết Tướng, ngũ viết Pháp.” Điểm 0–100 tính từ số liệu bán, tồn, kế hoạch, mạng lưới, đối thủ.</p></div>
      <div class="hp w6"><h3>Cửu địa: thế đất của địa bàn</h3>${Tr.map(t => `<p class="small"><b style="color:var(--cyan)">${esc(t[0])}</b> · <i>“${esc(t[1])}”</i> (${esc(t[2])})<br>→ ${esc(t[3])}</p>`).join("")}</div>
      <div class="hp w6"><h3>Kế sách chọn dùng</h3><ol class="actions small">${K.map(([k, a]) => `<li><b>${esc(k[0])}</b>: <i>“${esc(k[1])}”</i> (${esc(k[2])}).<br>→ ${esc(a)}</li>`).join("")}</ol></div>
      <div class="hp w6"><h3>Thiên thời (tham khảo văn hóa, không thay số liệu)</h3>${TT ? `<p class="small">Hôm nay: ngày ${esc(TT.L.ngay)}, tháng ${esc(TT.L.thang)}, năm ${esc(TT.L.nam)} (âm lịch ${TT.L.day}/${TT.L.month}); tiết <b>${esc(TT.L.tiet)}</b>. Giờ hoàng đạo: ${esc((TT.L.hoang || []).join(", "))}: hợp để họp, ký kết, khai trương chiến dịch.</p>${TT.G ? `<p class="small">Quẻ Mai Hoa “${esc(TT.G.q)}”: chủ <b>${esc(TT.G.chu.n)}</b> → biến <b>${esc(TT.G.bien.n)}</b>, hào ${TT.G.dong} động; ${esc(TT.G.rel[0])}: ${esc(TT.G.rel[1])}.</p>` : ""}` : ""}
        <p class="small">Mùa vụ thực tế tháng ${new Date().getMonth()+1}: ${esc((r.seasonNotes || []).join("; "))}. Yếu tố yếu nhất cần bù: <b>${esc(weak[0])}</b>. ${esc(CV.tdn ? CV.tdn(r).loi : "")}</p></div></div>
    <details class="lgdoc" style="margin-top:8px"><summary><b>Đạo của DAC: nguyên tắc chung cho mọi địa bàn</b></summary><p class="small">${esc(DAO.goal)}</p><ol class="small">${DAO.rules.map(([a,b]) => `<li><b>${esc(a)}</b>: ${esc(b)}</li>`).join("")}</ol><p class="small muted">KPI thương hiệu: ${esc(DAO.kpi.join(" · "))}</p></details></div>`;
  const md = `## Binh pháp Tôn Tử · Thiên – Địa – Nhân tại ${r.name}\n### Ngũ sự\n| Yếu tố | Điểm | Căn cứ | Nguồn |\n|---|---|---|---|\n${N.items.map(([n,v,,e,ks]) => `| ${n} | ${v} | ${e} | ${srcM(ks)} |`).join("\n")}\n\n_Yếu nhất: ${weak[0]}._\n\n### Cửu địa\n${Tr.map(t => `- **${t[0]}** (“${t[1]}”): ${t[3]}`).join("\n")}\n\n### Kế sách\n${K.map(([k,a],i) => `${i+1}. **${k[0]}** (“${k[1]}”): ${a}`).join("\n")}\n\n### Thiên thời (tham khảo)\n${TT ? `- Ngày ${TT.L.ngay}, tiết ${TT.L.tiet}; giờ hoàng đạo: ${(TT.L.hoang || []).join(", ")}.${TT.G ? `\n- Quẻ Mai Hoa: ${TT.G.chu.n} → ${TT.G.bien.n}; ${TT.G.rel[0]}: ${TT.G.rel[1]}.` : ""}` : ""}\n\n### Đạo của DAC (áp dụng mọi địa bàn)\n${DAO.rules.map(([a,b]) => `- **${a}:** ${b}`).join("\n")}\n`;
  return {html, md, N, Tr, K};
}
CV.warplan = warplan;

/* ---------- Đại chiến lược toàn hệ thống ---------- */
function grandMd(){
  const rows = CV.rows.map(r => ({r, P: CV.boardPosture ? CV.boardPosture(r) : null, W: warplan(r)}));
  const by = k => rows.filter(x => x.P && x.P.k === k), mk = a => sum(a.map(x => x.r._market || 0));
  const G = [["fast", "Chính binh: đánh nhanh, thắng nhanh", "50% ngân sách khuyến mãi, xe sẵn giao, quảng cáo"], ["slow", "Dựng thế: đánh chậm, thắng chắc", "30% ngân sách cho mạng lưới, dịch vụ, đội xe chứng minh"], ["hold", "Giữ thành: khai thác hiệu quả", "15% cho dịch vụ, khách thân thiết, tối ưu biên"], ["guer", "Kỳ binh, du kích chọn lọc", "5% cho đội lưu động, dự án; không đầu tư cố định"]];
  const tu = rows.filter(x => x.W.Tr.some(t => t[0] === "Tử địa")).map(x => x.r.name);
  const weakAll = {}; rows.forEach(x => { const w = x.W.N.items.slice().sort((a,b) => a[1] - b[1])[0][0]; weakAll[w] = (weakAll[w] || 0) + 1; });
  return `# Đại chiến lược DAC: một Đạo, nhiều trận\n_${DAO.goal}_\n\n## Đạo: nguyên tắc chung cho mọi địa bàn\n${DAO.rules.map(([a,b],i) => `${i+1}. **${a}:** ${b}`).join("\n")}\n\nKPI thương hiệu: ${DAO.kpi.join("; ")}.\n\n## Bố trí lực lượng theo thế trận\n| Nhóm | Tỉnh | Thị trường (xe/năm, ước) | Phân bổ nguồn lực |\n|---|---|---|---|\n${G.map(([k,t,a]) => `| ${t} | ${by(k).map(x => x.r.name).join(", ") || "—"} | ${fmtInt(mk(by(k)))} | ${a} |`).join("\n")}\n\n## Tử địa: phải đánh ngay (tồn đọng, bán đứng)\n- ${tu.join(", ") || "không có"}: tổng lực xả tồn 30 ngày, ngừng nhận sỉ, thưởng nóng theo bán lẻ, điều chuyển xe.\n\n## Điểm yếu chung của hệ thống (yếu tố thấp nhất trong Ngũ sự)\n${Object.entries(weakAll).sort((a,b) => b[1] - a[1]).map(([k,n]) => `- ${k}: ${n} tỉnh`).join("\n")}\n\n## Nguyên tắc phối hợp toàn hệ thống\n- Đại lý tỉnh "đánh nhanh" được ưu tiên phân bổ model bán chạy; tỉnh "tử địa" chuyển xe sang tỉnh bán nhanh trước khi giảm giá.\n- Giá, khuyến mãi do công ty quyết định thống nhất theo vùng; đại lý không tự giảm vượt khung.\n- Mỗi tháng họp S&OP: cập nhật thế trận từng tỉnh từ số bán, tồn, đối thủ; đổi thế khi số liệu đổi.\n- Huyền học (lịch âm, giờ hoàng đạo, quẻ) chỉ dùng chọn thời điểm khởi sự, tạo đồng lòng; quyết định dựa trên số liệu.\n`;
}
CV.tools.push({name: "binh_phap_dia_ban", label: "Đang lập phương án tác chiến…", description: "Binh pháp Tôn Tử và Thiên – Địa – Nhân cho một địa bàn (tỉnh): Ngũ sự (Đạo, Thiên, Địa, Tướng, Pháp) chấm điểm từ số liệu, Cửu địa (thế đất), kế sách (Mưu công, Hư thực, Quân hình, Binh thế, Tác chiến), thiên thời (lịch âm, tiết khí, giờ hoàng đạo, quẻ Mai Hoa, tham khảo), Đạo thương hiệu DAC. tinh bỏ trống = Đại chiến lược toàn hệ thống.", inputSchema: {type: "object", properties: {tinh: {type: "string"}}},
  execute: ({tinh}) => { if(!tinh) return grandMd(); const r = CV.findRow(tinh); if(!r) throw new Error("Không tìm thấy tỉnh " + tinh); return warplan(r).md; }});
CV.localHooks.unshift(raw => { const t = raw.replace(/^ben\s*(ơi)?[,:\s]+/i, "").trim();
  if(/đại chiến lược|chiến lược tổng|toàn hệ thống dac/i.test(t)) return grandMd();
  const m = t.match(/(?:binh pháp|tôn tử|tác chiến|ngũ sự|cửu địa)\s*(?:tại|ở|cho)?\s*(.*)/i); if(!m) return null; const r = CV.findRow(m[1].trim()); return r ? warplan(r).md : grandMd(); });
const prev = CV.ctx; CV.ctx = () => (prev ? prev() : "") + `\nBINH PHÁP · THIÊN ĐỊA NHÂN: tác chiến từng tỉnh và đại chiến lược toàn hệ thống dùng binh_phap_dia_ban; mọi đối sách phải tuân thủ Đạo thương hiệu DAC (một giá một thông điệp, bán lẻ là gốc, dịch vụ là thành trì, chọn trận đánh, số liệu là quân lệnh). Huyền học chỉ tham khảo thời điểm, không thay số liệu.`;
})();
