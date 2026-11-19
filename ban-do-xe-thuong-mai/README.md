# Bản đồ thị trường xe thương mại Việt Nam (3D)

Bản đồ 3D 34 tỉnh/thành (NQ 202/2025/QH15) để phân tích thị trường xe thương mại: rê chuột vào tỉnh để xem hồ sơ (dân số, GRDP, thị trường xe TM ước tính, cơ cấu phân khúc, hạ tầng, văn hóa kinh doanh, gợi ý hành động).

- `index.html` – mở trực tiếp bằng trình duyệt (cần Internet để tải thư viện ECharts).
- `provinces.json` – dữ liệu 34 tỉnh (sửa ở đây để cập nhật cho cả nhóm).
- `vn34.geojson` – ranh giới 34 tỉnh (gộp từ 63 tỉnh cũ).
- `template.html` – giao diện; `build.py` ghép dữ liệu vào trang.

## Cập nhật dữ liệu
1. Nhanh: sửa ngay trong bảng trên trang (lưu trên trình duyệt), hoặc nhập file CSV/JSON (cột `name` là tên tỉnh mới).
2. Cho cả nhóm: sửa `provinces.json`, chạy `python3 build.py`, rồi commit `index.html`.

Các trường Đô Thành tự nhập: `dealers` (điểm bán), `sales` (doanh số), `target` (mục tiêu), `note`.
