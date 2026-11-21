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

## Nguồn dữ liệu (`sources.json`)
VAMA, Cục CSGT, Cục Đăng kiểm, Thuế (lệ phí trước bạ), Cục Thống kê. Mỗi nguồn ghi kỳ số liệu và thời điểm lấy dữ liệu (`retrieved`, giờ Việt Nam); `updated` là lần cập nhật gần nhất. Sửa file này khi có số mới rồi chạy `python3 build.py`.

## Xem bản đồ có mật khẩu (Chrome)
- Đường dẫn: https://duy123456p.github.io/dashboard-dothanh/ban-do/ (chỉ cần mật khẩu, không cần tên đăng nhập).
- Toàn bộ trang được mã hóa AES-256-GCM (khóa PBKDF2-SHA256, 600.000 vòng); trình duyệt giải mã tại chỗ.
- `index.html`, `artifact.html` chưa mã hóa không còn đưa lên repo (xem `.gitignore`).

### Đổi mật khẩu (khuyến nghị 9:00 sáng mỗi ngày)
1. GitHub → Settings → Secrets and variables → Actions → sửa `MAP_PASSWORD` thành mật khẩu mới.
2. Tab Actions → "Đổi mật khẩu bản đồ 3D" → Run workflow. Khoảng 1–2 phút sau trang dùng mật khẩu mới.
- Mật khẩu trùng bất kỳ mật khẩu đã dùng sẽ bị từ chối (lịch sử chỉ lưu dạng băm trong `ban-do/.mat-khau-da-dung.json`).
- Tại máy: `MAP_PASSWORD='...' python3 tools_lock.py` sau khi chạy `python3 build.py`.

## Đồng bộ dữ liệu bán hàng chi tiết và tồn thành phẩm
- `python3 tools_sync_sales_xlsx.py <file giao dịch.xlsx> [YYYY-MM-DD]` → `tx.json`: số xe theo tháng × đại lý × model × loại thùng × dự án (bán lẻ = TT 100%, bán sỉ = TT 10%, xuất kho = ngày XK; −1 = hủy cọc); xe đã cọc 10% chưa TT 100% theo tuổi. Không lưu số khung, hợp đồng.
- `factory.json`: tồn thành phẩm kho DAC theo model × thùng × màu (thành phẩm, chờ xuất, chassis).
- Sau khi cập nhật: `python3 build.py` rồi `MAP_PASSWORD='…' python3 tools_lock.py` (đúng mật khẩu đang dùng thì chỉ khóa lại nội dung).
- `SRC_NAME='tên file gốc.xlsx' python3 tools_sync_inventory.py <file tồn SR.xlsx> [YYYY-MM-DD]` → `inventory.json`: tồn đại lý từng xe (sheet PV + Tồn SR) gộp theo đại lý × model × thùng × màu × đời × loại hợp đồng × tuổi; tự kiểm tra khớp tồn. Không lưu số khung, hợp đồng.
