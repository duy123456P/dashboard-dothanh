/* Nút "Cập nhật từ mạng": dùng đúng luồng tìm kiếm web sẵn có của Ben; kết quả phải kèm nguồn và ngày, số chưa kiểm chứng ghi rõ. Dữ liệu nội bộ vào qua "Nhập dữ liệu". */
(function(){
"use strict";
const CV = window.__CV; if(!CV || !CV.askAi) return;
const today = new Date().toLocaleDateString("vi-VN");
CV.updatePacks = () => { CV.openAi(true); CV.benTab("Chat");
  if(!navigator.onLine){ CV.addMsg("a", "Máy đang offline nên chưa cập nhật được từ mạng. Dữ liệu trong bản đồ giữ nguyên theo ngày đã ghi. Kết nối mạng rồi bấm lại."); return; }
  CV.askAi("Cập nhật thông tin mới nhất từ mạng đến ngày " + today + ": (1) chính sách bán hàng, khuyến mãi tháng này của Thaco, Teraco, JAC, Foton, TMT, Isuzu, Veam; (2) văn bản pháp luật mới về xe thương mại, đăng kiểm, thuế, phí; (3) đại lý hoặc điểm bán mới của đối thủ. Mỗi ý ghi nguồn, ngày đăng; ý nào chưa kiểm chứng được thì ghi rõ chưa kiểm chứng, không suy đoán."); };
const tools = document.querySelector(".maptools"); if(tools && !document.getElementById("btnUpd")){ const b = document.createElement("button"); b.type = "button"; b.id = "btnUpd"; b.textContent = "Cập nhật từ mạng"; b.title = "Ben tìm trên mạng chính sách, pháp lý, điểm bán mới nhất (kèm nguồn, ngày)"; b.addEventListener("click", CV.updatePacks); const i = document.getElementById("btnInput"); i ? i.after(b) : tools.appendChild(b); }
})();
