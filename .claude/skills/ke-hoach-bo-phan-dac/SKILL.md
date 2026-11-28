---
name: ke-hoach-bo-phan-dac
description: Lập kế hoạch chi tiết cho từng bộ phận, phòng ban DAC / Đô Thành năm 2027 (kinh doanh, dịch vụ, phụ tùng, đào tạo, marketing, chăm sóc khách hàng, phát triển đại lý, tài chính) bám sát kế hoạch tổng của khối kinh doanh. Dùng khi anh Duy yêu cầu làm kế hoạch, phân bổ chỉ tiêu, KPI, thư trình cho một bộ phận.
---

# Kế hoạch bộ phận DAC 2027: bám kế hoạch tổng

Người lập: Phạm Văn Duy, Phó giám đốc phụ trách khối kinh doanh DAC. Người duyệt: Huỳnh Cao Minh, Phó Tổng giám đốc thường trực DAC. Tài liệu gốc: `ke-hoach-2027/` (build.js, bản Word, PDF), dữ liệu `ban-do-xe-thuong-mai/plan2027.json`, `forecast2027.json`.

## Nguyên tắc số liệu
1. Số nào cũng có nguồn, ngày, đơn vị. Không có số thì ghi "chưa có số", không điền 0, không bịa.
2. Dự báo bằng phương pháp khoa học: SARIMAX(1,0,0) + xu hướng, biến ngoại sinh mùa vụ và hồi quy đa biến theo tỉnh (R² 0,81). Luôn kèm giả định và độ bất định.
3. Mỗi chỉ tiêu có ba mức: cam kết (đủ điều kiện nền), KPI (kỳ vọng), thách thức. Mức đạt < 75% / 75–85% / 85–100% / > 100% gắn thưởng hoặc hành động cụ thể.
4. Chỉ tiêu bộ phận phải cộng lại bằng mục tiêu toàn khối: 4.200 xe cam kết, 5.000 xe KPI; 34 đại lý cấp 1; 231 tư vấn bán hàng (kế hoạch nhân sự).
5. Thị phần mục tiêu mỗi tỉnh = thị phần hiện tại × 1,2.
6. Số liệu hiện trạng phải do bộ phận cung cấp trước khi chốt: tồn kho, công nợ, bán lẻ, tư vấn bán hàng, chi phí.
7. Không ghi tên cá nhân khách, số điện thoại cá nhân, số khung, biển số vào bất kỳ tài liệu nào.

## Công thức thu nhập quản lý (cố định, dễ hiểu)
- Thực nhận cố định mỗi tháng 65 triệu = 15 triệu cơ sở + 50 triệu KPI tối thiểu đạt 85% mục tiêu.
- Mỗi 1% đạt trong khung = 1,5 triệu thực nhận; quy đổi chính xác từng điểm %, kèm ví dụ số.
- Trọng số KPI: dòng tiền, chất lượng dịch vụ, doanh số, lợi nhuận.
- Gọi là "KPI cơ sở" (mức nhận bình thường), không dùng "KPI văn hóa".

## Điều kiện thành công (ghi vào mọi kế hoạch)
1. Ban Tổng giám đốc DAC đồng ý tự động hóa, số hóa toàn bộ quy trình.
2. Rà soát toàn bộ mô tả công việc và lập KPI mới.
3. Mục đích cuối cùng của số hóa: số liệu và dòng tiền chạy thời gian thực, thấy ngay độ trễ và điểm nghẽn của dòng tiền và mọi hoạt động.

## Mạng lưới
- 34 đại lý cấp 1 tiêu chuẩn mới, ưu tiên khu vực có cảng biển, khu công nghiệp, rải khắp cả nước (có Gia Lai, không Lạng Sơn).
- Cấp 2 đạt tiêu chuẩn thì nâng cấp 1; cấp 2 thực tế kinh doanh xe hãng khác thì loại khỏi hệ thống; điểm cấp 2 miền Trung (Hải Thành, Núi Ấn Sông Trà, Nam Sơn, Quốc Tú) đã loại.
- Doanh số đại lý miền Trung giữ ở mức TDBH đến khi anh Duy cập nhật.

## Cấu trúc một kế hoạch bộ phận
Bìa (logo Đô Thành, tên bộ phận, người lập, người duyệt) → mục tiêu và chỉ tiêu được giao từ kế hoạch tổng → hiện trạng có số → giải pháp theo tháng → ngân sách → điều kiện đạt → ba mức đạt và thưởng → rủi ro, điểm nghẽn → phương thức triển khai và phân chia chỉ tiêu xuống phòng ban, cá nhân → ký xác nhận hai bên. Xuất Word và PDF, trình bày chuyên nghiệp.

## Đối chiếu trước khi giao
Chạy lại các kiểm tra trong skill `chong-sai-lam-so-lieu`; tổng chỉ tiêu bộ phận phải khớp kế hoạch tổng; mọi giả định gắn nhãn "Giả định".
