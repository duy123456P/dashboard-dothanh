# Kiểm thử trình duyệt (Playwright, Chromium + SwiftShader)

Các tệp là kịch bản đã dùng để kiểm thử từng module. Chạy trong thư mục có `playwright` (npm i playwright), sau khi `python3 build.py`.
Sửa đường dẫn `file:///home/user/dashboard-dothanh/ban-do-xe-thuong-mai/index.html` cho đúng máy. SwiftShader vẽ rất chậm nên kịch bản dùng `page.evaluate` để bấm thay vì `page.click`.

| Tệp | Kiểm tra |
|---|---|
| offline.js | Mở bản đã khóa (`../ban-do/index.html`) khi mất mạng: sai mật khẩu, đúng mật khẩu, không có yêu cầu mạng, không lỗi console, chạy thử mọi công cụ Ben. Dùng: `node offline.js <thư mục lưu ảnh> <đường dẫn index.html đã khóa>` |
| battle.js | Chiến trường 2D: hình dạng dữ liệu, mở theo tỉnh, chiến lược từng đại lý |
| meeting.js | Thư ký họp: ghi giọng giả lập (SpeechRecognition), tự lập biên bản nháp, cảnh báo chưa chốt |
| competitiveness.js | Tab Năng lực cạnh tranh: chuyển tab, đối chiếu hình và bản đồ |
| growth.js | Mục DAC AI Growth: chấm điểm LEAD, báo cáo rà soát tuần |
| finance.js | Dòng tiền, cổng nhập dữ liệu, kiểm soát dữ liệu (mẫu công nợ, bán lẻ) |
| skills.js | Chạy cả 61 kỹ năng của Ben khi mất mạng: thời gian lần 1 và 2, lỗi, kết quả rỗng hoặc chứa NaN/undefined, yêu cầu mạng |
| router.js | Bộ định tuyến Ben offline: 57 câu hỏi tiếng Việt → kỹ năng mong đợi, đo thời gian, kiểm tra không có yêu cầu mạng |
