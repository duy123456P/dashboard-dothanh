---
name: chong-sai-lam-so-lieu
description: Chống sai lầm trong phân tích dữ liệu và ghi nhận doanh thu của bản đồ 3D, báo cáo, kế hoạch DAC (mã DC-xx, CF-xx, RR-xx). Dùng khi xử lý số liệu bán hàng, tồn kho, công nợ, dòng tiền, doanh thu, hoặc khi nhập dữ liệu nội bộ.
---

# Chống sai lầm số liệu (DAC / BEN)

Tài liệu đầy đủ: `tham-khao/DAC_BEN_MistakeProof_ERP_Skill.md`. Cài đặt trong bản đồ: `ban-do-xe-thuong-mai/controls.js` (DC, RR), `cashflow.js` (CF), `inputs.js` (cổng nhập).

## Nguyên tắc
- Thiết kế để làm đúng thì dễ, làm sai thì khó, còn sai thì thấy ngay, khoanh được, sửa được.
- Thiếu đầu vào bắt buộc thì dừng; dữ liệu sai thì chặn tại nguồn và nói rõ sửa thế nào.
- Mỗi con số gắn nhãn Quan sát (có nguồn, ngày) hoặc Giả định. Không có số thì ghi "chưa có số", không điền 0, không tự chấm điểm S/O/D.
- Đối soát hai nguồn (giao dịch bán hàng và kế toán công nợ, tồn kho nhà máy và đại lý); lệch quá ngưỡng thì báo đỏ, không tự chọn số.
- Số khung chỉ băm trong bộ nhớ để kiểm trùng, không lưu, không hiển thị. Không để lộ tên khách, số điện thoại cá nhân, biển số.

## Kiểm soát ghi nhận doanh thu (RR)
Tiền về không bằng doanh thu. Ghi nhận khi đã chuyển giao quyền kiểm soát (giao xe, có biên bản) và có hóa đơn hợp lệ.
- 5 KHÔNG: không ghi doanh thu khi mới thu tiền cọc; không khi chưa giao xe; không khi chưa có hóa đơn; không khi thiếu giá vốn; không tính VAT vào doanh thu.
- 5 CÓ: có giao xe, có biên bản, có hóa đơn, có giá vốn tương ứng, có đối soát tiền với đơn.
- 7 lỗi cần chặn (RR-01..RR-07): thu tiền ghi thành doanh thu; xuất hóa đơn chưa giao xe; giao xe chưa ghi nhận; thiếu giá vốn làm lãi ảo; doanh thu gồm VAT; trùng số khung; lệch kỳ (cut-off).
- Báo cáo bốn dòng tách bạch: Tiền thu, Doanh thu, Giá vốn, Lợi nhuận gộp. VAT 10% chỉ là giả định minh họa.

## Chỉ số dòng tiền (CF-01..CF-15)
Nợ quá hạn, nợ trên 90 ngày, tuổi nợ, DSO (hạn HĐMB 30 ngày), tồn kho, vốn chôn trong tồn, tập trung nợ, lệch giữa hai nguồn, thanh khoản 30 ngày, nợ vay, nhà cung cấp, thuế, lương. Chỉ số cần số tài chính mà chưa nhập thì ghi "chưa có số". Ngưỡng xanh/vàng/đỏ là đề xuất, Phòng Tài chính hiệu chỉnh.

## Quy trình mỗi lần thay đổi dữ liệu
1. Chạy `python3 build.py`, kiểm tra không lỗi.
2. Mở Kiểm soát dữ liệu: số đỏ phải được giải thích hoặc sửa.
3. Kiểm thử offline (không gọi mạng, không lỗi console).
4. Báo cáo trung thực: số nào là giả định, số nào chưa có.
