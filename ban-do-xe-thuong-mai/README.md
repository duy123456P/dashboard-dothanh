# Bản đồ thị trường xe thương mại DAC (3D)

Một file HTML duy nhất, chạy offline trên Google Chrome: bản đồ 3D 34 tỉnh/thành, hồ sơ tỉnh, Phòng chiến lược HĐQT, Radar kinh tế – tài chính, chính sách bán hàng, tồn kho, dự báo và trợ lý Ben.

> Hồ sơ thiết kế đầy đủ (kiến trúc, dữ liệu, thuật toán, từng module) để dựng lại bằng ngôn ngữ khác: [`../3DMapDAC.md`](../3DMapDAC.md).

## Dùng trên Chrome
- **Online:** https://duy123456p.github.io/dashboard-dothanh/ban-do/ → nhập mật khẩu.
- **Offline:** tải `ban-do/index.html` (hoặc gói `BanDo-DAC-3D.zip`), bấm đúp để mở bằng Chrome → nhập mật khẩu. Không cần Internet: thư viện 3D, phông chữ, ảnh địa hình, dữ liệu đều nằm trong file.
- Yêu cầu: Chrome/Edge 80 trở lên, máy có WebGL (hầu hết máy tính hiện nay). Ben phân tích AI chỉ chạy khi mở trong Claude; các báo cáo tức thì, tra cứu, công cụ khác chạy ở mọi nơi.
- Bảo mật: toàn bộ trang mã hóa AES-256-GCM (khóa PBKDF2-SHA256, 600.000 vòng), nén gzip trước khi mã hóa; giải mã tại máy, mật khẩu không gửi đi đâu. Bản chưa mã hóa (`index.html`, `artifact.html` trong thư mục này) không đưa lên repo.

## Kiến trúc
```
template.html          khung trang + bản đồ 3D (three.js) + hồ sơ tỉnh + Ben
ops.html, ops.css      khung các khối báo cáo
*.js (20 module)       mỗi module là một IIFE, giao tiếp qua window.__CV (công cụ Ben, hook, dữ liệu dùng chung)
  ops, lens, lyhoc, legal, comp, hud, sales, fc, glossary, model, inv, tx, audit, board, warplan, radar, policy, market, customers (+ chiến dịch MKT, phòng thủ khách hàng), layout
*.json                 dữ liệu (build.py ánh xạ placeholder → file trong DATA)
vendor/                three.js r147 + OrbitControls/Lines; phông Be Vietnam Pro, Chakra Petch (woff2, OFL)
logo-bbh.png           logo DAC dùng trong biên bản họp (Word/HTML)
relief.webp            ảnh nền địa hình 4096², height.webp: độ cao (R*256+G−12000 m, nén không mất dữ liệu; biển làm tròn 25 m)
build.py               ghép tất cả thành index.html tự chứa; thu gọn JS/CSS bằng esbuild
tools_lock.py, lock.html   nén + mã hóa → ../ban-do/index.html
tools_*.py             đồng bộ dữ liệu từ file Excel/ERP (xem bên dưới)
```
Thứ tự module quan trọng (MODULES trong build.py): `layout.js` chạy cuối để gom các khối vào 6 nhóm dưới bản đồ.

## Dựng và đóng gói
```bash
npm install                      # một lần: cài esbuild (thu gọn JS/CSS)
python3 build.py                 # → index.html (≈ 3,8 MB, tự chứa)
MAP_PASSWORD='…' python3 tools_lock.py   # → ../ban-do/index.html (≈ 2,6 MB, đã khóa)
```
Nhập đúng mật khẩu đang dùng = chỉ khóa lại nội dung; mật khẩu mới không được trùng mật khẩu cũ (lịch sử lưu dạng băm trong `ban-do/.mat-khau-da-dung.json`).

### Đổi mật khẩu (khuyến nghị 9:00 sáng mỗi ngày)
GitHub → Settings → Secrets and variables → Actions → sửa `MAP_PASSWORD` → tab Actions → "Đổi mật khẩu bản đồ 3D" → Run workflow. Mỗi lần cập nhật code trên `main`, workflow tự dựng và khóa lại.

## Đồng bộ dữ liệu
| Lệnh | Nguồn | Kết quả |
|---|---|---|
| `python3 tools_sync_erp.py` | ERP Netlify (TDBH, CSI, KH 2027) | `sales.json` |
| `python3 tools_sync_sales_xlsx.py <file.xlsx>` | giao dịch từng xe | `tx.json` (không số khung, hợp đồng) |
| `SRC_NAME='…' python3 tools_sync_inventory.py <file.xlsx>` | tồn đại lý (MoM Tồn SR) | `inventory.json` |
| `python3 tools_sync_bonus.py <file.xlsx>` | báo cáo thưởng 2026 | `bonus2026.json`, cập nhật `network.json`, `provinces.json`; rà số khung trùng (chỉ tính cho đại lý bán sau cùng); không tên TVBH, số khung |
| `python3 tools_sync_places.py <dt_places.json>` | bản đồ nhúng trên dothanhauto.com | địa chỉ, tọa độ đại lý, trạm |
| `python3 tools_nien_giam_34.py ng.txt out.json` | Niên giám Thống kê 2025 | GRDP, bán lẻ, dân số theo 34 tỉnh |
| `python3 tools_thu_nhap_34.py ng.txt out.json` | Niên giám (bảng 348) | thu nhập 2025 theo 34 tỉnh |
| `python3 tools_sync_market.py <DKM.xlsx> <IZ.pptx> <KAMA.pptx>` | file đăng ký mới từng xe + báo cáo thị trường DAC tháng | `market2026.json`, ĐK thực theo tỉnh trong `provinces.json` |
| `python3 tools_sync_compnet.py <thư mục html>` | daehan.vn (Teraco), danh bạ đại lý Oto360 | `compnet.json` mục `dealers`: đại lý đối thủ theo 34 tỉnh, link Google Maps |
| `python3 tools_sync_customers.py <KU_SALES.xlsx> <osm_coords.json> <geo_cache.json> <DATA_TVBH_*.xlsx…>` | danh sách khách tiềm năng (OpenStreetMap), file thưởng TVBH 2023–2026 | `customers.json`: khách tiềm năng có tọa độ; khách đã mua đếm theo năm, tỉnh, huyện (không tên, SĐT cá nhân, số khung, biển số) |
| `python3 tools_sync_factory.py <FILE XE TỔNG HỢP.xlsx> <BC NHẬP-XUẤT-TỒN.xlsx>` | kho thành phẩm DAC (Y:\TỒN KHO THÀNH PHẨM\2026) | `factory.json`: tồn theo model, thùng, màu, tuổi tồn; sản xuất dở dang; nhập – xuất kỳ; sell-in theo đại lý × tháng; đối chiếu TDBH. Tự chạy 8h30: `auto/CAI_DAT_8H30.md` |
| `python3 tools_sync_eol.py <năm>` | tra cứu xe hết niên hạn (app.vr.org.vn) | cơ cấu hãng, năm SX xe tải hết niên hạn theo tỉnh (chỉ số đếm) |
| `python3 tools_sync_mkt.py <ChienDich_MKT_CaNuoc_2027.xlsx> <geo_cache.json>` | file chiến dịch MKT offline 2027 | `mkt2027.json`: kế hoạch 34 tỉnh (tính lại theo Giả định), lịch sự kiện có định vị, DN tiềm năng có tọa độ |
| `python3 tools_relief.py` | DEM AWS Terrain Tiles | `relief.webp`, `height.webp` |

Sau mỗi lần đồng bộ: `python3 build.py` rồi `tools_lock.py`.

## Nguồn dữ liệu
Mỗi chỉ số trên bản đồ có link nguồn (Cục Thống kê, Niên giám 2025, biểu KT-XH tháng, NHNN, Bộ Tài chính, VPA, Cục CSGT, VAMA, báo địa phương) hoặc ghi rõ "ước tính" / "file nội bộ DAC". `sources.json`, `provstats.json`, `radar.json` lưu nguồn và kỳ số liệu.
