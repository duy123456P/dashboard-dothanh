/* ===== Ben · Lý học: âm lịch – can chi, Mai Hoa Dịch số, mệnh khách hàng, Thiên–Địa–Nhân, minh triết Tam giáo ===== */
(function(){
"use strict";
const CV = window.__CV; if(!CV) return;
const {esc, fmtInt, fmt1, toast} = CV;
const $ = id => document.getElementById(id);
const INT = Math.floor, TZ = 7;

/* ---------- lịch âm (thuật toán Hồ Ngọc Đức, múi giờ +7) ---------- */
function jdFromDate(dd, mm, yy){ const a = INT((14-mm)/12), y = yy+4800-a, m = mm+12*a-3; let jd = dd+INT((153*m+2)/5)+365*y+INT(y/4)-INT(y/100)+INT(y/400)-32045; if(jd < 2299161) jd = dd+INT((153*m+2)/5)+365*y+INT(y/4)-32083; return jd; }
function newMoon(k){ const T = k/1236.85, T2 = T*T, T3 = T2*T, dr = Math.PI/180;
  let Jd1 = 2415020.75933 + 29.53058868*k + 0.0001178*T2 - 0.000000155*T3; Jd1 += 0.00033*Math.sin((166.56 + 132.87*T - 0.009173*T2)*dr);
  const M = 359.2242 + 29.10535608*k - 0.0000333*T2 - 0.00000347*T3, Mpr = 306.0253 + 385.81691806*k + 0.0107306*T2 + 0.00001236*T3, F = 21.2964 + 390.67050646*k - 0.0016528*T2 - 0.00000239*T3;
  let C1 = (0.1734 - 0.000393*T)*Math.sin(M*dr) + 0.0021*Math.sin(2*dr*M); C1 = C1 - 0.4068*Math.sin(Mpr*dr) + 0.0161*Math.sin(dr*2*Mpr); C1 -= 0.0004*Math.sin(dr*3*Mpr);
  C1 = C1 + 0.0104*Math.sin(dr*2*F) - 0.0051*Math.sin(dr*(M+Mpr)); C1 = C1 - 0.0074*Math.sin(dr*(M-Mpr)) + 0.0004*Math.sin(dr*(2*F+M)); C1 = C1 - 0.0004*Math.sin(dr*(2*F-M)) - 0.0006*Math.sin(dr*(2*F+Mpr));
  C1 = C1 + 0.0010*Math.sin(dr*(2*F-Mpr)) + 0.0005*Math.sin(dr*(2*Mpr+M));
  const deltat = T < -11 ? 0.001 + 0.000839*T + 0.0002261*T2 - 0.00000845*T3 - 0.000000081*T*T3 : -0.000278 + 0.000265*T + 0.000262*T2; return Jd1 + C1 - deltat; }
function sunLong(jdn){ const T = (jdn - 2451545.0)/36525, T2 = T*T, dr = Math.PI/180, M = 357.52910 + 35999.05030*T - 0.0001559*T2 - 0.00000048*T*T2, L0 = 280.46645 + 36000.76983*T + 0.0003032*T2;
  let DL = (1.914600 - 0.004817*T - 0.000014*T2)*Math.sin(dr*M); DL += (0.019993 - 0.000101*T)*Math.sin(dr*2*M) + 0.000290*Math.sin(dr*3*M); let L = (L0 + DL)*dr; L -= Math.PI*2*INT(L/(Math.PI*2)); return L; }
const sunSeg = (d, n) => INT(sunLong(d - 0.5 - TZ/24)/Math.PI*(n/2));
const nmDay = k => INT(newMoon(k) + 0.5 + TZ/24);
function month11(yy){ const k = INT((jdFromDate(31,12,yy) - 2415021)/29.530588853); let nm = nmDay(k); if(sunSeg(nm, 12) >= 9) nm = nmDay(k-1); return nm; }
function leapOff(a11){ const k = INT((a11 - 2415021.076998695)/29.530588853 + 0.5); let last, i = 1, arc = sunSeg(nmDay(k+i), 12); do{ last = arc; i++; arc = sunSeg(nmDay(k+i), 12); } while(arc !== last && i < 14); return i-1; }
function solar2lunar(dd, mm, yy){
  const dn = jdFromDate(dd, mm, yy), k = INT((dn - 2415021.076998695)/29.530588853); let ms = nmDay(k+1); if(ms > dn) ms = nmDay(k);
  let a11 = month11(yy), b11 = a11, ly; if(a11 >= ms){ ly = yy; a11 = month11(yy-1); } else { ly = yy+1; b11 = month11(yy+1); }
  const day = dn - ms + 1, diff = INT((ms - a11)/29); let leap = 0, mon = diff + 11;
  if(b11 - a11 > 365){ const lo = leapOff(a11); if(diff >= lo){ mon = diff + 10; if(diff === lo) leap = 1; } }
  if(mon > 12) mon -= 12; if(mon >= 11 && diff < 4) ly -= 1; return {day, month: mon, year: ly, leap, jd: dn};
}
const CAN = ["Giáp","Ất","Bính","Đinh","Mậu","Kỷ","Canh","Tân","Nhâm","Quý"], CHI = ["Tý","Sửu","Dần","Mão","Thìn","Tỵ","Ngọ","Mùi","Thân","Dậu","Tuất","Hợi"];
const TIET = ["Xuân phân","Thanh minh","Cốc vũ","Lập hạ","Tiểu mãn","Mang chủng","Hạ chí","Tiểu thử","Đại thử","Lập thu","Xử thử","Bạch lộ","Thu phân","Hàn lộ","Sương giáng","Lập đông","Tiểu tuyết","Đại tuyết","Đông chí","Tiểu hàn","Đại hàn","Lập xuân","Vũ thủy","Kinh trập"];
const HOANG = {Tý:[0,1,3,6,8,9], Ngọ:[0,1,3,6,8,9], Sửu:[2,3,5,8,10,11], Mùi:[2,3,5,8,10,11], Dần:[0,1,4,5,7,10], Thân:[0,1,4,5,7,10], Mão:[0,2,3,6,7,9], Dậu:[0,2,3,6,7,9], Thìn:[2,4,5,8,9,11], Tuất:[2,4,5,8,9,11], Tỵ:[1,4,6,7,10,11], Hợi:[1,4,6,7,10,11]};
const GIO = i => { const s = (i*2 + 23) % 24; return `${CHI[i]} (${String(s).padStart(2,"0")}–${String((s+2)%24).padStart(2,"0")}h)`; };
function lich(d){ d = d || new Date(); const L = solar2lunar(d.getDate(), d.getMonth()+1, d.getFullYear()), hi = INT(((d.getHours()+1) % 24)/2);
  const dCan = (L.jd + 9) % 10, dChi = (L.jd + 1) % 12, yCan = (L.year + 6) % 10, yChi = (L.year + 8) % 12, mCan = (L.year*12 + L.month + 3) % 10, mChi = (L.month + 1) % 12, hCan = ((dCan % 5)*2 + hi) % 10;
  return {...L, d, nam: CAN[yCan] + " " + CHI[yChi], thang: CAN[mCan] + " " + CHI[mChi], ngay: CAN[dCan] + " " + CHI[dChi], gio: CAN[hCan] + " " + CHI[hi], yChi, dChi, hi, tiet: TIET[INT(sunLong(L.jd + 0.5 - TZ/24)/(Math.PI/12)) % 24],
    hoang: HOANG[CHI[dChi]].map(GIO), hoangIdx: HOANG[CHI[dChi]]}; }

/* ---------- Kinh Dịch: bát quái, 64 quẻ, Mai Hoa Dịch số ---------- */
const QUAI = [null, {n:"Càn", t:"Thiên", h:"Kim", b:[1,1,1]}, {n:"Đoài", t:"Trạch", h:"Kim", b:[1,1,0]}, {n:"Ly", t:"Hỏa", h:"Hỏa", b:[1,0,1]}, {n:"Chấn", t:"Lôi", h:"Mộc", b:[1,0,0]},
  {n:"Tốn", t:"Phong", h:"Mộc", b:[0,1,1]}, {n:"Khảm", t:"Thủy", h:"Thủy", b:[0,1,0]}, {n:"Cấn", t:"Sơn", h:"Thổ", b:[0,0,1]}, {n:"Khôn", t:"Địa", h:"Thổ", b:[0,0,0]}];
const QUE = `Thuần Càn|Cương kiện, sáng tạo|Thời cơ mạnh: chủ động tiến công, tự cường không nghỉ; ở đỉnh cao chớ kiêu (kháng long hữu hối).
Thuần Khôn|Nhu thuận, bao dung|Làm nền, phục vụ, hậu đức tải vật: chăm khách cũ, củng cố nội lực, theo sau người dẫn đường đúng.
Thủy Lôi Truân|Gian nan buổi đầu|Khởi sự khó: dựng nền móng, tìm người phò trợ, chưa dàn trải.
Sơn Thủy Mông|Non nớt, cần khai sáng|Đào tạo đội ngũ, khai tâm khách hàng bằng tư vấn rõ ràng.
Thủy Thiên Nhu|Chờ đợi đúng thời|Chuẩn bị lực lượng, vốn, hàng; chờ mùa vụ, không nóng vội.
Thiên Thủy Tụng|Tranh tụng|Tránh tranh chấp, kiện cáo; rõ hợp đồng từ đầu, hòa giải sớm.
Địa Thủy Sư|Quân đội, tổ chức|Kỷ luật lực lượng bán, người cầm quân chính danh, chiến dịch có chỉ huy.
Thủy Địa Tỷ|Thân cận, liên kết|Kết thân đại lý, đối tác, khách lớn; liên minh đúng người.
Phong Thiên Tiểu Súc|Tích nhỏ|Mây kéo chưa mưa: tích lũy dần, kiên nhẫn từng hợp đồng.
Thiên Trạch Lý|Lễ, bước đi đúng|Hành xử đúng mực, cẩn trọng khi làm việc với đối tác lớn.
Địa Thiên Thái|Thông suốt, hanh thông|Thời thuận, trên dưới đồng lòng: mở rộng, tăng tốc.
Thiên Địa Bĩ|Bế tắc|Trên dưới không thông: giữ mình, giảm rủi ro, khơi thông thông tin.
Thiên Hỏa Đồng Nhân|Đồng lòng|Hợp tác rộng rãi, đoàn kết nội bộ, cùng chí hướng.
Hỏa Thiên Đại Hữu|Có lớn|Thịnh vượng: dùng nguồn lực đúng đạo, chia sẻ thành quả.
Địa Sơn Khiêm|Khiêm tốn|Khiêm nhường được lòng khách và đối tác, bền lâu.
Lôi Địa Dự|Hứng khởi, chuẩn bị|Phát động chiến dịch khi khí thế lên, nhưng chớ say thắng.
Trạch Lôi Tùy|Thuận theo|Theo thời, theo người: lắng nghe khách hàng, linh hoạt.
Sơn Phong Cổ|Sửa cái hư|Chấn chỉnh tồn đọng, sửa sai lầm cũ đến tận gốc.
Địa Trạch Lâm|Đến gần, lớn dần|Thời cơ tới: lãnh đạo xuống hiện trường, tiếp cận thị trường.
Phong Địa Quan|Quan sát|Khảo sát thị trường kỹ, làm gương cho đội ngũ.
Hỏa Lôi Phệ Hạp|Cắn hợp, phân xử|Xử lý dứt điểm vướng mắc, kỷ luật rõ ràng.
Sơn Hỏa Bí|Trang sức|Hình ảnh, trưng bày, thương hiệu; nhưng thực chất mới là gốc.
Sơn Địa Bác|Bóc mòn|Thời suy: giữ gốc, cắt lỗ, không mở rộng.
Địa Lôi Phục|Trở lại|Phục hồi, quay lại khách cũ, mở chu kỳ mới.
Thiên Lôi Vô Vọng|Không càn bậy|Làm thật, trung thực, không đầu cơ, không hứa quá.
Sơn Thiên Đại Súc|Tích lớn|Tích lũy nguồn lực, nhân tài, chuẩn bị bước lớn.
Sơn Lôi Di|Nuôi dưỡng|Nuôi dưỡng đội ngũ và khách hàng; cẩn trọng lời nói.
Trạch Phong Đại Quá|Quá mức|Quá tải: cần biện pháp khác thường, giảm tải gánh chính.
Thuần Khảm|Hiểm trở|Nhiều rủi ro: giữ chữ tín, kiên trì, đi từng bước chắc.
Thuần Ly|Sáng, nương tựa|Minh bạch, dựa vào chính đạo, nâng tầm thương hiệu.
Trạch Sơn Hàm|Cảm ứng|Cảm hóa khách bằng chân thành, quan hệ hai chiều.
Lôi Phong Hằng|Bền lâu|Kiên định chiến lược, bền bỉ, không đổi hướng vội.
Thiên Sơn Độn|Lui|Rút lui chiến lược, tránh đối đầu bất lợi, giữ lực.
Lôi Thiên Đại Tráng|Mạnh lớn|Sức mạnh đang lên: dùng đúng mực, đừng húc càn.
Hỏa Địa Tấn|Tiến lên|Thăng tiến, mở rộng thị trường thuận lợi.
Địa Hỏa Minh Di|Ánh sáng bị che|Thời khó: giữ nội lực, giấu tài, chờ sáng.
Phong Hỏa Gia Nhân|Người nhà|Chỉnh đốn nội bộ, văn hóa doanh nghiệp, vai trò rõ ràng.
Hỏa Trạch Khuê|Bất đồng|Mâu thuẫn: tìm điểm chung nhỏ, làm việc nhỏ trước.
Thủy Sơn Kiển|Trở ngại|Dừng lại tìm người giúp, tự xét mình trước.
Lôi Thủy Giải|Giải tỏa|Gỡ nút thắt, hành động nhanh khi khó khăn vừa qua.
Sơn Trạch Tổn|Bớt|Giảm chi phí, bớt cái không cần để đầu tư dài hạn.
Phong Lôi Ích|Thêm lợi|Thời làm lợi: đầu tư, mở rộng mang lợi cho khách và mình.
Trạch Thiên Quải|Quyết đoán|Quyết loại bỏ cái xấu, công khai minh bạch.
Thiên Phong Cấu|Gặp bất ngờ|Cảnh giác yếu tố nhỏ có thể lớn (đối thủ mới, rủi ro nhỏ).
Trạch Địa Tụy|Tụ họp|Tập hợp lực lượng, hội nghị khách hàng, sự kiện.
Địa Phong Thăng|Đi lên|Tăng trưởng từng bước vững chắc.
Trạch Thủy Khốn|Khốn cùng|Nguồn lực cạn: giữ khí tiết, nói ít làm nhiều.
Thủy Phong Tỉnh|Cái giếng|Nền tảng phục vụ bền vững: dịch vụ, phụ tùng nuôi khách lâu dài.
Trạch Hỏa Cách|Cải cách|Đổi mới mô hình đúng thời, có lòng tin của người dưới.
Hỏa Phong Đỉnh|Cái vạc|Củng cố cơ đồ, trọng dụng nhân tài.
Thuần Chấn|Chấn động|Biến động bất ngờ: bình tĩnh, tự xét, phản ứng nhanh.
Thuần Cấn|Dừng|Biết dừng đúng lúc, tĩnh tâm trước khi quyết.
Phong Sơn Tiệm|Tiến dần|Phát triển tuần tự, không đốt cháy giai đoạn.
Lôi Trạch Quy Muội|Thế yếu|Vị thế yếu: cẩn trọng cam kết, tránh hợp tác bất lợi.
Lôi Hỏa Phong|Thịnh lớn|Đỉnh cao: tận dụng, nhưng chuẩn bị cho lúc suy.
Hỏa Sơn Lữ|Lữ khách|Thị trường mới, lạ: khiêm tốn, thận trọng, giữ uy tín.
Thuần Tốn|Gió, thấm dần|Thâm nhập mềm mỏng, lặp lại thông điệp đều đặn.
Thuần Đoài|Vui hòa|Giao tiếp, thuyết phục, làm khách hài lòng.
Phong Thủy Hoán|Ly tán|Lực lượng phân tán: tập hợp lại bằng tầm nhìn chung.
Thủy Trạch Tiết|Tiết chế|Giới hạn hợp lý, quản trị chi phí, kỷ luật.
Phong Trạch Trung Phu|Thành tín|Chữ tín làm gốc, giữ đúng cam kết với khách.
Lôi Sơn Tiểu Quá|Quá nhỏ|Làm tốt việc nhỏ, chưa nên việc lớn; khiêm, kiệm.
Thủy Hỏa Ký Tế|Đã xong|Hoàn thành nhưng phải đề phòng suy, giữ thành quả.
Hỏa Thủy Vị Tế|Chưa xong|Sắp thành: cẩn trọng bước cuối, không chủ quan.`.split("\n").map((l,i) => { const [n,y,k] = l.split("|"); return {i: i+1, n, y, k}; });
const tri = name => QUAI.findIndex(q => q && q.t === name);
QUE.forEach(q => { const p = q.n.split(" "); if(p[0] === "Thuần"){ const t = QUAI.findIndex(x => x && x.n === p[1]); q.up = q.lo = t; } else { q.up = tri(p[0]); q.lo = tri(p[1]); } });
const queOf = (up, lo) => QUE.find(q => q.up === up && q.lo === lo);
const triOfBits = b => QUAI.findIndex(q => q && q.b.join("") === b.join(""));
const SINH = {Kim:"Thủy", Thủy:"Mộc", Mộc:"Hỏa", Hỏa:"Thổ", Thổ:"Kim"}, KHAC = {Kim:"Mộc", Mộc:"Thổ", Thổ:"Thủy", Thủy:"Hỏa", Hỏa:"Kim"};
function gieo(o){
  o = o || {}; const L = lich(o.date);
  let up, lo, dong, cach;
  if(o.a != null && o.b != null){ up = (o.a % 8) || 8; lo = (o.b % 8) || 8; dong = ((o.a + o.b + L.hi + 1) % 6) || 6; cach = `theo số ${o.a} và ${o.b} (giờ ${CHI[L.hi]})`; }
  else { const s = L.yChi + 1 + L.month + L.day; up = (s % 8) || 8; lo = ((s + L.hi + 1) % 8) || 8; dong = ((s + L.hi + 1) % 6) || 6; cach = `theo thời gian: năm ${CHI[L.yChi]}, tháng ${L.month}, ngày ${L.day} âm lịch, giờ ${CHI[L.hi]}`; }
  const bits = QUAI[lo].b.concat(QUAI[up].b), chu = queOf(up, lo);
  const ho = queOf(triOfBits(bits.slice(2,5)), triOfBits(bits.slice(1,4)));
  const vb = bits.slice(); vb[dong-1] ^= 1; const bien = queOf(triOfBits(vb.slice(3,6)), triOfBits(vb.slice(0,3)));
  const the = dong <= 3 ? QUAI[up] : QUAI[lo], dung = dong <= 3 ? QUAI[lo] : QUAI[up];
  const rel = the.h === dung.h ? ["Tỷ hòa", "cát: thuận lợi, đồng lực"] : SINH[dung.h] === the.h ? ["Dụng sinh Thể", "đại cát: ngoại cảnh trợ lực cho ta"] : KHAC[the.h] === dung.h ? ["Thể khắc Dụng", "cát: ta làm chủ tình thế nhưng phải tốn sức"] : SINH[the.h] === dung.h ? ["Thể sinh Dụng", "hao: ta phải bỏ công sức, chi phí nhiều"] : ["Dụng khắc Thể", "hung: ngoại cảnh bất lợi, nên thận trọng hoặc lùi"];
  return {L, cach, q: o.q || "", chu, ho, bien, dong, bits, the, dung, rel};
}
function hexSvg(bits, dong){ return `<svg viewBox="0 0 60 66" width="44" height="48" aria-hidden="true">${bits.map((b,i) => { const y = 58 - i*10, c = i+1 === dong ? "var(--warn)" : "currentColor";
  return b ? `<rect x="4" y="${y}" width="52" height="6" rx="1.5" fill="${c}"/>` : `<rect x="4" y="${y}" width="22" height="6" rx="1.5" fill="${c}"/><rect x="34" y="${y}" width="22" height="6" rx="1.5" fill="${c}"/>`; }).join("")}</svg>`; }
const queBits = q => QUAI[q.lo].b.concat(QUAI[q.up].b);
function gieoMd(G){ return `## Quẻ ${G.chu.n} (số ${G.chu.i}) · hào ${G.dong} động\n_${G.q ? "Việc hỏi: " + G.q + " · " : ""}Gieo ${G.cach}; ngày ${G.L.ngay}, tháng ${G.L.thang}, năm ${G.L.nam}_\n\n- **Chủ quẻ ${G.chu.n}** (${G.chu.y}): ${G.chu.k}\n- **Hỗ quẻ ${G.ho.n}** (diễn biến bên trong): ${G.ho.k}\n- **Biến quẻ ${G.bien.n}** (kết cục): ${G.bien.k}\n- **Thể ${G.the.n} (${G.the.h}) – Dụng ${G.dung.n} (${G.dung.h})**: ${G.rel[0]}, ${G.rel[1]}.\n\n> Quẻ là gương soi để suy ngẫm thời thế, không thay cho số liệu. Quyết định dựa trên dữ liệu thị trường, năng lực và bằng chứng.\n`; }

/* ---------- mệnh khách hàng: nạp âm, màu xe, số chủ đạo, biển số ---------- */
const NAP = ["Hải Trung Kim","Lư Trung Hỏa","Đại Lâm Mộc","Lộ Bàng Thổ","Kiếm Phong Kim","Sơn Đầu Hỏa","Giản Hạ Thủy","Thành Đầu Thổ","Bạch Lạp Kim","Dương Liễu Mộc","Tuyền Trung Thủy","Ốc Thượng Thổ","Tích Lịch Hỏa","Tùng Bách Mộc","Trường Lưu Thủy","Sa Trung Kim","Sơn Hạ Hỏa","Bình Địa Mộc","Bích Thượng Thổ","Kim Bạch Kim","Phú Đăng Hỏa","Thiên Hà Thủy","Đại Trạch Thổ","Thoa Xuyến Kim","Tang Đố Mộc","Đại Khê Thủy","Sa Trung Thổ","Thiên Thượng Hỏa","Thạch Lựu Mộc","Đại Hải Thủy"];
const MAU = {Kim:{hop:["Trắng","Bạc / xám"], sinh:["Cam / vàng"], ky:["Đỏ"]}, Mộc:{hop:["Xanh lá"], sinh:["Xanh dương"], ky:["Trắng","Bạc / xám"]}, Thủy:{hop:["Xanh dương"], sinh:["Trắng","Bạc / xám"], ky:["Cam / vàng"]},
  Hỏa:{hop:["Đỏ"], sinh:["Xanh lá"], ky:["Xanh dương"]}, Thổ:{hop:["Cam / vàng"], sinh:["Đỏ"], ky:["Xanh lá"]}};
const SOCD = {1:"Chủ động, quyết đoán: đưa ra phương án rõ ràng, để khách tự quyết", 2:"Hợp tác, cẩn thận: kiên nhẫn, nhiều thông tin, cam kết đồng hành", 3:"Giao tiếp, cảm xúc: kể câu chuyện khách hàng thật, trải nghiệm lái thử", 4:"Thực tế, kỷ luật: bảng TCO, số liệu chi phí, bảo hành rõ", 5:"Thích tự do, đổi mới: nhấn sự linh hoạt, công nghệ, giao xe nhanh", 6:"Trách nhiệm, gia đình: an toàn, độ bền, an tâm cho người lái", 7:"Phân tích, hoài nghi: tài liệu kỹ thuật, so sánh khách quan", 8:"Tài chính, hiệu quả: lợi nhuận mỗi chuyến, gói vay, giá trị bán lại", 9:"Nhân ái, tầm nhìn: uy tín thương hiệu, dịch vụ hậu mãi tận tâm", 11:"Trực giác, truyền cảm hứng: tầm nhìn dài hạn, giá trị thương hiệu", 22:"Kiến tạo lớn: kế hoạch đội xe quy mô, đối tác chiến lược", 33:"Phụng sự: dịch vụ chăm sóc, cam kết lâu dài"};
function menh(input){
  const s = String(input || "").trim(); let y, dob = null; const m = s.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if(m){ dob = {d:+m[1], m:+m[2], y:+m[3]}; const L = solar2lunar(dob.d, dob.m, dob.y); y = L.year; } else { const yy = s.match(/(19|20)\d{2}/); if(!yy) return null; y = +yy[0]; }
  const can = (y + 6) % 10, chi = (y + 8) % 12, idx = ((y - 4) % 60 + 60) % 60, nap = NAP[INT(idx/2)], hanh = nap.split(" ").pop(), M = MAU[hanh];
  let so = null; if(dob){ let n = String(dob.d) + dob.m + dob.y; let t = [...n].reduce((a,c) => a + +c, 0); while(t > 9 && ![11,22,33].includes(t)) t = [...String(t)].reduce((a,c) => a + +c, 0); so = t; }
  return {y, tuoi: CAN[can] + " " + CHI[chi], nap, hanh, M, so, dob, amlich: !dob}; }
function bienSo(s){ const ds = String(s).replace(/^\s*\d{2}[A-ZĐa-zđ]{1,2}\d?\s*-?/, "").replace(/\D/g, ""); if(!ds) return null; const sum = [...ds].reduce((a,c) => a + +c, 0), nut = sum % 10 || 10;
  const pat = []; if(/(\d)\1{3}/.test(ds)) pat.push("tứ quý"); else if(/(\d)\1{2}/.test(ds)) pat.push("tam hoa"); if(/0123|1234|2345|3456|4567|5678|6789/.test(ds)) pat.push("sảnh tiến"); if(/68|86/.test(ds)) pat.push("lộc phát"); if(/39|79/.test(ds)) pat.push("thần tài"); if(/^(\d\d)\1$/.test(ds.slice(-4))) pat.push("lặp đôi");
  return {ds, nut, pat}; }
function menhMd(K){ if(!K) return "Em chưa đọc được năm sinh. Nhập dạng `1985` (năm âm lịch) hoặc ngày sinh dương lịch `14/02/1985`.";
  return `## Khách tuổi ${K.tuoi} (${K.y}${K.amlich ? ", năm âm lịch" : ", theo ngày sinh " + K.dob.d + "/" + K.dob.m + "/" + K.dob.y})\n- **Mệnh:** ${K.nap} (hành ${K.hanh})\n- **Màu cabin hợp:** ${K.M.hop.join(", ")} (bản mệnh); ${K.M.sinh.join(", ")} (tương sinh)\n- **Màu nên tránh:** ${K.M.ky.join(", ")}\n${K.so ? `- **Số chủ đạo:** ${K.so}: ${SOCD[K.so] || ""}\n` : ""}\n**Gợi ý tư vấn:** hỏi khách có quan tâm màu hợp mệnh, ngày giờ nhận xe không; nếu có, chủ động đề xuất màu và giờ hoàng đạo giao xe như một dịch vụ chu đáo. Không áp đặt; ưu tiên màu có sẵn để giao nhanh.\n`; }
function ngayMd(d){ const L = lich(d); return `## ${["Chủ nhật","Thứ hai","Thứ ba","Thứ tư","Thứ năm","Thứ sáu","Thứ bảy"][d.getDay()]}, ${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}\n- Âm lịch: ngày ${L.day}/${L.month}${L.leap ? " (nhuận)" : ""} năm ${L.nam}\n- Ngày ${L.ngay}, tháng ${L.thang}; tiết ${L.tiet}\n- **Giờ hoàng đạo:** ${L.hoang.join(", ")}\n\n_Dùng để mời khách chọn giờ nhận xe, khai trương, ký hợp đồng nếu khách quan tâm._\n`; }

/* ---------- Thiên – Địa – Nhân cho từng tỉnh ---------- */
const median = a => { const s = a.filter(x => x != null && isFinite(x)).sort((x,y) => x-y); return s.length ? s[INT(s.length/2)] : 0; };
const clamp = v => Math.max(0, Math.min(100, Math.round(v)));
function tdn(r){
  const R = CV.rows, gMed = median(R.map(x => x.growth)) || 7, tMed = median(R.map(x => x._turn)) || 6, pdMed = median(R.filter(x => x._c4 + x._c3).map(x => x._perCenter)) || 2000;
  const nS = R.reduce((a,x) => a + (+x.sales||0), 0) / (R.reduce((a,x) => a + (x._market||0), 0) || 1) * 100, sh = r._market ? (+r.sales||0) / r._market * 100 : 0, mo = new Date().getMonth();
  const thien = clamp(40*Math.min(1.5, (r.growth ?? gMed)/gMed)/1.5 + 35*((r.season||[])[mo]||0)/3 + 25*Math.min(1.5, r._turn/tMed)/1.5);
  const ds = CV.NET.dealers.filter(d => d.province === r.name && d.leCum != null), nd = r._c4 + r._c3;
  const st = CV.NET.stations.concat(CV.NET.dealers).reduce((m,s) => Math.min(m, CV.km({lng:r.lp[0], lat:r.lp[1]}, s)), 1e9);
  const dia = clamp((nd ? 40*Math.min(1, pdMed / r._perCenter) : 0) + 30*Math.max(0, 1 - st/120) + 15*(r.elev >= 500 ? 0.4 : 1) + 15*Math.min(1, (r.logistics||"").split(/[,;]/).length/5));
  const kp = r.target ? (+r.sales||0)/r.target : null, gr = ds.length ? ds.reduce((a,d) => a + (d.score||60), 0)/ds.length : null;
  const nhan = clamp((kp == null ? 0 : 35*Math.min(1, kp)) + (gr == null ? 0 : 25*Math.min(1, gr/90)) + 40*Math.min(1, nS ? sh/nS/1.5 : 0));
  const P = [["Thiên thời", thien, "thời cơ kinh tế, mùa vụ, nhịp thay xe"], ["Địa lợi", dia, "mạng lưới, khoảng cách dịch vụ, địa hình, hạ tầng"], ["Nhân hòa", nhan, "đội ngũ đại lý, kế hoạch, lòng tin khách hàng"]], weak = [...P].sort((a,b) => a[1]-b[1])[0];
  const LOI = {"Thiên thời": "Kinh Dịch: “Quân tử tàng khí ư thân, đãi thời nhi động” (giữ sẵn khí cụ trong mình, chờ thời mà động). Chuẩn bị hàng, vốn, đội ngũ trước mùa cao điểm.",
    "Địa lợi": "Tôn Tử: “Tri thiên tri địa, thắng nãi khả toàn” (biết trời biết đất, thắng mới trọn). Mở điểm bán, dịch vụ lưu động đúng nơi khách cần.",
    "Nhân hòa": "Mạnh Tử: “Thiên thời bất như địa lợi, địa lợi bất như nhân hòa”. Gốc là con người: kèm cặp đại lý, giữ chữ tín với khách, để khách cũ giới thiệu khách mới."};
  return {P, weak, loi: LOI[weak[0]], score: Math.round((thien + dia + nhan)/3)}; }
function tdnMd(r){ const T = tdn(r); return `## Thiên – Địa – Nhân: ${r.name}\n| Trụ | Điểm | Yếu tố |\n|---|---|---|\n${T.P.map(p => `| ${p[0]} | **${p[1]}** | ${p[2]} |`).join("\n")}\n\n**Trụ yếu nhất: ${T.weak[0]} (${T.weak[1]}/100).** ${T.loi}\n\n_Điểm tính từ dữ liệu trên bản đồ (tăng trưởng, mùa vụ, ĐK mới/UIO, độ phủ, khoảng cách dịch vụ, % kế hoạch, năng lực đại lý, thị phần)._\n`; }

/* ---------- minh triết: câu kinh điển dùng trong điều hành ---------- */
const MINH = [["Nho","Luận Ngữ","Dân vô tín bất lập","Không có chữ tín thì không đứng được: giữ đúng cam kết giao xe, bảo hành."],
  ["Nho","Luận Ngữ","Kỷ sở bất dục, vật thi ư nhân","Điều mình không muốn, chớ làm cho người: bán xe như mua cho chính mình."],
  ["Nho","Luận Ngữ","Tri chi vi tri chi, bất tri vi bất tri, thị tri dã","Biết thì nói biết, không biết nói không biết: báo cáo đúng số thật."],
  ["Nho","Đại Học","Tu thân, tề gia, trị quốc, bình thiên hạ","Lãnh đạo bắt đầu từ sửa mình, rồi đến đội ngũ, rồi thị trường."],
  ["Nho","Mạnh Tử","Thiên thời bất như địa lợi, địa lợi bất như nhân hòa","Thời và đất quan trọng, nhưng lòng người quyết định."],
  ["Đạo","Đạo Đức Kinh","Thượng thiện nhược thủy","Điều thiện cao nhất như nước: phục vụ mọi người, mềm mà bền, không tranh mà thắng."],
  ["Đạo","Đạo Đức Kinh","Thiên lý chi hành, thủy ư túc hạ","Đi ngàn dặm bắt đầu từ một bước: việc làm ngay trong 24 giờ."],
  ["Đạo","Đạo Đức Kinh","Tri nhân giả trí, tự tri giả minh","Hiểu người là trí, hiểu mình là sáng: phân tích đối thủ và tự đánh giá đội ngũ."],
  ["Đạo","Đạo Đức Kinh","Trị đại quốc nhược phanh tiểu tiên","Trị nước lớn như nấu cá nhỏ: đừng xáo trộn đội ngũ liên tục."],
  ["Phật","Kinh Pháp Cú","Tâm dẫn đầu các pháp","Thái độ phục vụ quyết định chất lượng dịch vụ."],
  ["Phật","Giáo lý nhân quả","Gieo nhân nào, gặt quả nấy","Chăm sóc khách cũ hôm nay là doanh số giới thiệu ngày mai."],
  ["Phật","Bát chánh đạo","Chánh ngữ, chánh nghiệp, chánh mạng","Nói đúng, làm đúng, kiếm sống chân chính: không hứa sai thông số, không ép khách."],
  ["Binh","Tôn Tử","Tri bỉ tri kỷ, bách chiến bất đãi","Biết người biết ta, trăm trận không nguy: số liệu đối thủ và năng lực đại lý."],
  ["Dịch","Quẻ Càn","Thiên hành kiện, quân tử dĩ tự cường bất tức","Trời vận hành mạnh mẽ, người quân tử tự cường không ngừng."],
  ["Dịch","Quẻ Khôn","Địa thế khôn, quân tử dĩ hậu đức tải vật","Đất dày chở muôn vật, người lãnh đạo lấy đức dày bao dung đội ngũ."],
  ["Dịch","Hệ Từ","Cùng tắc biến, biến tắc thông, thông tắc cửu","Bế tắc thì đổi, đổi thì thông, thông thì bền: khi một cách bán không hiệu quả, đổi cách."]];
function minhTriet(key){ const L = lich(); const pool = key ? MINH.filter(m => m[0] === key) : MINH; return pool[(L.jd) % pool.length]; }

/* ---------- giao diện tab Lý học trong Ben ---------- */
const nav = document.querySelector("#ai .btabs"), last = document.getElementById("bMeet") || document.getElementById("bTalk");
if(nav && last){
  const b = document.createElement("button"); b.type = "button"; b.setAttribute("role","tab"); b.dataset.btab = "Ly"; b.setAttribute("aria-selected","false"); b.textContent = "Lý học";
  nav.appendChild(b); b.addEventListener("click", () => { CV.benTab("Ly"); drawLy(); });
  const p = document.createElement("div"); p.className = "bpane bscroll"; p.id = "bLy"; p.hidden = true;
  p.innerHTML = `<div class="lyhead" id="lyToday"></div>
    <h4>Gieo quẻ Mai Hoa cho việc kinh doanh</h4>
    <label class="field">Việc cần hỏi<input type="text" id="lyQ" placeholder="VD: Mở đại lý cấp 2 tại Lạng Sơn trong quý I"></label>
    <div class="bgrid"><label class="field">Số thứ nhất (tùy chọn)<input type="number" id="lyA" min="1"></label><label class="field">Số thứ hai (tùy chọn)<input type="number" id="lyB" min="1"></label></div>
    <div class="toolbar"><button type="button" class="primary" id="lyGieo">Gieo quẻ</button><button type="button" id="lyLuan">Ben luận quẻ kết hợp số liệu</button></div>
    <div id="lyOut" class="bout"></div>
    <h4>Khách hàng: mệnh, màu xe, số chủ đạo</h4>
    <div class="bgrid"><label class="field">Năm sinh âm lịch hoặc ngày sinh<input type="text" id="lyBirth" placeholder="1985 hoặc 14/02/1985"></label><label class="field">Biển số (tùy chọn)<input type="text" id="lyPlate" placeholder="51C-123.45"></label></div>
    <div class="bgrid"><label class="field">Ngày dự kiến giao xe<input type="date" id="lyDate" style="color-scheme:dark"></label><span></span></div>
    <div class="toolbar"><button type="button" class="primary" id="lyMenh">Xem cho khách</button></div>
    <div id="lyKhach" class="bout"></div>
    <h4>Thiên – Địa – Nhân của tỉnh đang chọn</h4><div id="lyTdn" class="bout"></div>
    <h4>Minh triết điều hành hôm nay</h4><div id="lyMinh" class="bout"></div>
    <p class="muted tiny">Lý học, Kinh Dịch, phong thủy được dùng như khung suy ngẫm và nét văn hóa được nhiều khách hàng coi trọng. Quyết định kinh doanh vẫn dựa trên số liệu, bằng chứng và năng lực thực tế. Kỳ Môn Độn Giáp: Ben vận dụng nguyên lý chiến lược; lập bàn đầy đủ cần chuyên gia và phần mềm chuyên dụng.</p>`;
  last.after(p);
}
let lastG = null;
function drawLy(){
  const L = lich(), d = L.d, el = $("lyToday"); if(!el) return;
  el.innerHTML = `<div class="kv num"><span>Dương lịch</span><b>${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}</b><span>Âm lịch</span><b>${L.day}/${L.month}${L.leap ? " nhuận" : ""} · năm ${L.nam}</b><span>Can chi</span><b>Ngày ${L.ngay} · tháng ${L.thang} · giờ ${L.gio}</b><span>Tiết khí</span><b>${L.tiet}</b><span>Giờ hoàng đạo</span><b>${L.hoang.join(", ")}</b></div>`;
  const r = CV.findRow(CV.selected || ""); $("lyTdn").innerHTML = r ? tdnHtml(r) : '<span class="muted">Chọn một tỉnh trên bản đồ.</span>';
  const m = minhTriet(); $("lyMinh").innerHTML = `<p style="margin:0"><b>“${esc(m[2])}”</b> <span class="muted">(${esc(m[1])})</span><br>${esc(m[3])}</p>`;
  if(!$("lyDate").value){ const t = new Date(); t.setDate(t.getDate()+1); $("lyDate").value = t.toISOString().slice(0,10); }
}
function tdnHtml(r){ const T = tdn(r); return `<div class="stats num">${T.P.map(p => `<div class="stat"><div class="v" style="color:${p[1] >= 65 ? "var(--good)" : p[1] >= 45 ? "var(--warn)" : "var(--bad)"}">${p[1]}</div><div class="l">${esc(p[0])}: ${esc(p[2])}</div></div>`).join("")}</div><p class="small" style="margin:6px 0 0"><b>${esc(r.name)}: trụ yếu nhất ${esc(T.weak[0])}.</b> ${esc(T.loi)}</p>`; }
function gieoHtml(G){ return `<div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap">${[["Chủ", G.chu, G.dong], ["Hỗ", G.ho, 0], ["Biến", G.bien, 0]].map(([l,q,dg]) => `<div style="text-align:center;color:#fff">${hexSvg(queBits(q), dg)}<div class="tiny muted">${l}</div><div class="small"><b>${esc(q.n)}</b></div></div>`).join("")}</div>
  <p class="small" style="margin:8px 0 0"><b>${esc(G.chu.n)}: ${esc(G.chu.y)}.</b> ${esc(G.chu.k)}<br><span class="muted">Hỗ ${esc(G.ho.n)}: ${esc(G.ho.k)}</span><br><span class="muted">Biến ${esc(G.bien.n)}: ${esc(G.bien.k)}</span><br>Thể ${esc(G.the.n)} (${G.the.h}), Dụng ${esc(G.dung.n)} (${G.dung.h}): <b>${esc(G.rel[0])}</b>, ${esc(G.rel[1])}. Hào ${G.dong} động.</p><p class="muted tiny">Gieo ${esc(G.cach)}.</p>`; }
document.addEventListener("click", e => {
  const id = e.target.id;
  if(id === "lyGieo"){ const a = +$("lyA").value, b = +$("lyB").value; lastG = gieo({q: $("lyQ").value.trim(), a: a > 0 && b > 0 ? a : null, b: a > 0 && b > 0 ? b : null}); $("lyOut").innerHTML = gieoHtml(lastG); }
  if(id === "lyLuan"){ if(!lastG) lastG = gieo({q: $("lyQ").value.trim()}); $("lyOut").innerHTML = gieoHtml(lastG); CV.benTab("Chat");
    CV.askAi(`Luận quẻ cho việc kinh doanh: "${lastG.q || "tình hình kinh doanh hiện tại"}". Kết quả gieo Mai Hoa: chủ quẻ ${lastG.chu.n}, hỗ quẻ ${lastG.ho.n}, biến quẻ ${lastG.bien.n}, hào ${lastG.dong} động, ${lastG.rel[0]} (${lastG.rel[1]}); ngày ${lastG.L.ngay}, tiết ${lastG.L.tiet}. Hãy dùng quẻ như tấm gương suy ngẫm: đối chiếu với số liệu thực tế trên bản đồ (dùng công cụ khi cần), chỉ ra thời thế, điều nên làm và nên tránh, kết bằng 3 hành động cụ thể có chỉ số đo. Nói rõ quẻ là tham khảo, quyết định dựa trên dữ liệu.`); }
  if(id === "lyMenh"){ const K = menh($("lyBirth").value), bs = $("lyPlate").value.trim() ? bienSo($("lyPlate").value) : null, dv = $("lyDate").value ? new Date($("lyDate").value + "T09:00") : null;
    $("lyKhach").innerHTML = (K ? CV.mdToHtml(menhMd(K)) : '<p class="muted">Nhập năm sinh hoặc ngày sinh.</p>') + (bs ? `<p class="small"><b>Biển số:</b> ${bs.nut} nút${bs.pat.length ? " · " + esc(bs.pat.join(", ")) : ""}</p>` : "") + (dv ? CV.mdToHtml(ngayMd(dv)) : ""); }
});
document.addEventListener("click", e => { if(e.target.closest && e.target.closest('[data-btab="Ly"]')) drawLy(); });

/* ---------- lớp Thiên–Địa–Nhân trên bản đồ ---------- */
CV.METRICS.tdn = {label:"Thiên – Địa – Nhân", unit:"điểm", get: r => tdn(r).score, fmt: v => fmtInt(v)};

/* ---------- Ben: lệnh nhanh + công cụ AI + vai trò ---------- */
CV.localHooks.unshift(raw => {
  const t = raw.replace(/^ben\s*(ơi)?[,:\s]+/i, "").trim(), low = t.toLowerCase(); let m;
  if(/^(gieo quẻ|xin quẻ|bói quẻ|gieo que)/.test(low)){ const nums = (t.match(/\d+/g) || []).map(Number); const q = t.replace(/^(gieo quẻ|xin quẻ|bói quẻ|gieo que)\s*(cho|về|:)?\s*/i, "").replace(/\bsố\s+\d+\s*(và|,)\s*\d+/i, "").trim();
    lastG = gieo({q, a: nums.length >= 2 ? nums[0] : null, b: nums.length >= 2 ? nums[1] : null}); return gieoMd(lastG); }
  if((m = low.match(/^(xem ngày|ngày tốt|giờ hoàng đạo|giờ tốt)\s*(?:ngày\s*)?(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{4}))?/))){ const y = m[4] ? +m[4] : new Date().getFullYear(); return ngayMd(new Date(y, +m[3]-1, +m[2], 9)); }
  if(/^(hôm nay|âm lịch|lịch âm|xem lịch)\b/.test(low)) return ngayMd(new Date());
  if((m = t.match(/^(?:mệnh|xem mệnh|khách sinh(?: năm| ngày)?|tuổi|màu hợp(?: mệnh)?)\s*:?\s*(.+)$/i))){ return menhMd(menh(m[1])); }
  if((m = t.match(/^biển số\s*:?\s*(.+)$/i))){ const b = bienSo(m[1]); return b ? `Biển số **${esc(m[1])}**: ${b.nut} nút${b.pat.length ? " · " + b.pat.join(", ") : ""}.` : null; }
  if(/^(thiên địa nhân|thiên - địa - nhân|thiên–địa–nhân)/.test(low)){ let r = null; CV.rows.forEach(x => [x.name, ...(x.merged||[])].forEach(n => { if(CV.norm(t).includes(CV.norm(n)) && (!r || n.length > r[1])) r = [x, n.length]; }));
    const row = r ? r[0] : CV.findRow(CV.selected || ""); if(!row){ CV.setMap({metric:"tdn", color:"metric"}); return "Đã tô bản đồ theo điểm **Thiên – Địa – Nhân**. Chọn một tỉnh để xem chi tiết."; } CV.select(row.name, true); CV.setMap({metric:"tdn", color:"metric"}); return tdnMd(row); }
  if(/^(minh triết|lời dạy|châm ngôn)/.test(low)){ const k = /nho/.test(low) ? "Nho" : /đạo/.test(low) ? "Đạo" : /phật/.test(low) ? "Phật" : /binh|tôn tử/.test(low) ? "Binh" : /dịch/.test(low) ? "Dịch" : null; const x = minhTriet(k); return `> **“${x[2]}”** (${x[1]})\n\n${x[3]}`; }
  return null;
});
CV.tools.push(
  {name:"am_lich", label:"Đang xem lịch…", description:"Âm lịch, can chi ngày/tháng/năm/giờ, tiết khí và giờ hoàng đạo của một ngày (YYYY-MM-DD, để trống = hôm nay).", inputSchema:{type:"object",properties:{date:{type:"string"}}},
   execute: ({date}) => { const d = date ? new Date(date + "T09:00") : new Date(); if(isNaN(d)) throw new Error("Ngày không hợp lệ"); const L = lich(d); return {duong_lich: d.toISOString().slice(0,10), am_lich: `${L.day}/${L.month}${L.leap ? " nhuận" : ""}`, nam: L.nam, thang: L.thang, ngay: L.ngay, gio_hien_tai: L.gio, tiet_khi: L.tiet, gio_hoang_dao: L.hoang}; }},
  {name:"gieo_que", label:"Đang gieo quẻ…", description:"Gieo quẻ Mai Hoa Dịch số theo thời gian hiện tại hoặc theo 2 số người dùng đưa ra; trả về chủ quẻ, hỗ quẻ, biến quẻ, hào động, thể dụng và ý nghĩa kinh doanh.", inputSchema:{type:"object",properties:{question:{type:"string"},a:{type:"number"},b:{type:"number"}}},
   execute: ({question, a, b}) => { lastG = gieo({q: question || "", a: a > 0 && b > 0 ? a : null, b: a > 0 && b > 0 ? b : null}); return gieoMd(lastG); }},
  {name:"menh_khach", label:"Đang xem mệnh khách…", description:"Mệnh nạp âm, ngũ hành, màu cabin hợp/kỵ, số chủ đạo (nếu có ngày sinh) của khách hàng. birth: năm âm lịch '1985' hoặc ngày sinh dương lịch '14/02/1985'.", inputSchema:{type:"object",properties:{birth:{type:"string"}},required:["birth"]},
   execute: ({birth}) => menhMd(menh(birth))},
  {name:"thien_dia_nhan", label:"Đang luận Thiên – Địa – Nhân…", description:"Chấm điểm Thiên thời – Địa lợi – Nhân hòa của một tỉnh từ dữ liệu bản đồ, chỉ ra trụ yếu nhất và lời khuyên kinh điển.", inputSchema:{type:"object",properties:{name:{type:"string"}},required:["name"]},
   execute: ({name}) => { const r = CV.findRow(String(name)); if(!r) throw new Error("Không tìm thấy tỉnh " + name); return tdnMd(r); }},
);
const prevCtx = CV.ctx;
CV.ctx = () => (prevCtx ? prevCtx() : "") + `
BEN MINH TRIẾT: Ben am hiểu Kinh Dịch (Chu Dịch, Mai Hoa Dịch số), Thiên – Địa – Nhân, nguyên lý Kỳ Môn Độn Giáp (thiên thời, địa lợi, nhân hòa, bát môn, chọn thời và hướng), binh pháp Tôn Tử, triết học Nho gia (nhân, nghĩa, lễ, trí, tín; tu thân, chính danh), Đạo gia (vô vi, thuận tự nhiên, thượng thiện nhược thủy), Phật gia (nhân quả, từ bi, chánh niệm, bát chánh đạo), cùng phong tục chọn ngày giờ, màu hợp mệnh, biển số của khách hàng Việt. Nguyên tắc: (1) số liệu và bằng chứng luôn đi trước; minh triết, lý số dùng để soi chiếu, truyền cảm hứng và giao tiếp; (2) không đưa ra dự đoán chắc chắn từ quẻ, không phán định tốt xấu về con người; (3) tôn trọng niềm tin của khách như một dịch vụ chu đáo (màu xe, giờ giao xe), không áp đặt; (4) Kỳ Môn: vận dụng nguyên lý chiến lược, không tự lập bàn chi tiết; nếu cần lập bàn, khuyên dùng chuyên gia. Dùng các công cụ am_lich, gieo_que, menh_khach, thien_dia_nhan khi người dùng hỏi. Hôm nay âm lịch: ${(() => { const L = lich(); return `${L.day}/${L.month} năm ${L.nam}, ngày ${L.ngay}, tiết ${L.tiet}`; })()}.`;
CV.lich = lich; CV.gieo = gieo; CV.menh = menh; CV.tdn = tdn;
})();
