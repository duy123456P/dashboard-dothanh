---
name: thu-thap-thi-truong-doi-thu
description: Thu thập, đối chiếu thông tin thị trường của đối thủ và Đô Thành Auto (giá bán, chính sách ưu đãi hiện hành, fanpage Facebook, video quảng cáo YouTube/TikTok, logo, khẩu hiệu, showroom, xưởng dịch vụ) kèm nguồn bấm được, để so sánh marketing online và offline và đề xuất chiến lược kinh doanh, sản phẩm. Dùng khi cập nhật Chiến trường 2D, hồ sơ đối thủ, kế hoạch marketing.
---

# Thu thập thông tin thị trường có dẫn chứng

Dữ liệu nằm ở `ban-do-xe-thuong-mai/`: `competitors.json` (giá, chính sách, nguồn), `compnet.json` (điểm bán, xưởng, tọa độ), `brandmedia.json` (logo, kênh số, trang giá, khuyến mãi, đại lý; tạo bằng `tools_brandmedia.py`). Hiển thị ở Chiến trường 2D (battle.js).

## Quy tắc cứng
1. Mọi con số, chính sách, kênh, video phải kèm đường dẫn bấm được tới đúng trang nguồn và ngày kiểm tra. Không có nguồn thì ghi "chưa có", không điền, không suy đoán.
2. Thứ tự tin cậy: (a) website, fanpage, kênh chính thức của hãng; (b) văn bản của hãng (bảng giá, thông báo khuyến mãi); (c) đại lý ủy quyền; (d) báo chí; (e) tổng hợp bên thứ ba. Nguồn (c)–(e) phải đánh dấu "cần đối chiếu".
3. Chính sách ưu đãi chỉ ghi loại đang hiện hành: có kỳ áp dụng (từ ngày đến ngày); hết hạn chuyển sang lịch sử.
4. Giá ghi rõ công bố hay giá bán thực tế, đã gồm VAT hay chưa, ngày bảng giá.
5. Tài khoản mạng xã hội: chỉ nhận liên kết thấy trong mã nguồn trang chủ chính thức hoặc kênh có dấu xác thực; trang mạo danh rất nhiều (kể cả mạo danh lãnh đạo): đối chiếu từ website hãng. Không đoán đường dẫn.
6. Video quảng cáo: ghi đường dẫn video cụ thể (watch?v=, video TikTok) kèm loại (sản phẩm, hệ thống, showroom, xưởng dịch vụ), ngày đăng nếu thấy. Chưa lấy được thì dùng liên kết tìm kiếm và gắn nhãn "tìm kiếm".
7. Không thu thập tên, số điện thoại cá nhân của khách; chỉ thông tin doanh nghiệp công khai. Không giả trình duyệt, không vượt chặn của website.
8. Mạng của phiên cloud chỉ cho một số tên miền: hãng nào không truy cập được thì nói rõ, không thay bằng nguồn khác mà không ghi nhãn.

## Mỗi hãng cần thu thập (cùng một biểu mẫu cho Đô Thành và đối thủ)
Logo, khẩu hiệu hoặc định vị, website, Facebook, YouTube, TikTok, Zalo, trang bảng giá, trang khuyến mãi, trang hệ thống đại lý, trang xưởng dịch vụ, số điểm bán và xưởng có tọa độ, video giới thiệu sản phẩm, video showroom, video xưởng dịch vụ.

## Phân tích rút ra chiến lược
- Online: số kênh xác nhận, tần suất và định dạng nội dung (video ngắn, livestream, quảng cáo trả phí), thông điệp chính, ưu đãi dẫn khách (giảm tiền, nhiên liệu, bảo hiểm, trả góp).
- Offline: mật độ điểm bán trong 10/25/50 km, xưởng 3S, sự kiện lưu động, chuẩn showroom, khu vực dịch vụ.
- So sánh với Đô Thành theo từng đại lý và từng mặt trận: thiếu kênh nào, thiếu nội dung nào, sản phẩm nào đang bị ép giá, ưu đãi nào cần đối ứng.
- Kết luận phải gắn "Quan sát" (có nguồn) hay "Giả định"; số chưa có thì ghi "chưa có số".

## Sau khi cập nhật
Chạy `python3 tools_brandmedia.py <thư mục logo>`, `python3 tools_audit_gmaps.py`, `python3 build.py`, mở Kiểm soát dữ liệu: DC-14 (dẫn chứng nguồn) và DC-15 (liên kết bản đồ) không được đỏ.
