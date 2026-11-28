# 3DMapDAC: Hồ sơ thiết kế Bản đồ thị trường xe thương mại 3D của DAC / Đô Thành Auto

> Mục đích: mô tả đủ kiến trúc, dữ liệu, thuật toán, giao diện và từng module của bản đồ hiện tại (một file HTML) để đội kỹ thuật dựng lại bằng TypeScript, Three.js, CSS hiện đại, và nếu cần một máy chủ Java. Tài liệu viết theo mã nguồn thực tế trong thư mục `ban-do-xe-thuong-mai/` (cập nhật 28/11/2026). Chỗ nào chỉ được suy ra từ tiêu đề module mà em chưa đọc hết thuật toán thì ghi rõ “xem mã nguồn”.

## Mục lục
1. Tổng quan và ràng buộc bất biến
2. Kiến trúc tổng thể
3. Quy trình dựng và đóng gói
4. Mô hình dữ liệu (JSON)
5. Lõi 3D (Three.js)
6. Công thức nghiệp vụ lõi
7. Giao diện theo vùng và theo tab
8. Từng module
9. Trợ lý Ben: khung công cụ và danh mục công cụ
10. Kiểm soát chất lượng dữ liệu (DC, CF, RR)
11. Bảo mật và quyền riêng tư
12. Kiểm thử
13. Thiết kế lại bằng TypeScript / Java / CSS
14. Đối chiếu với master prompt DAC AI Growth
15. Hạn chế đã biết và nợ kỹ thuật

## 1. Tổng quan và ràng buộc bất biến

Sản phẩm: bản đồ 3D 34 tỉnh, thành phố của Việt Nam (sau sáp nhập), hiển thị thị trường xe thương mại, mạng lưới đại lý Đô Thành, đối thủ, khách hàng, kế hoạch 2027, dòng tiền, kiểm soát dữ liệu và trợ lý Ben. Người dùng chính: Ban lãnh đạo, Giám đốc kinh doanh, quản lý khu vực.

Quy mô mã nguồn hiện tại: `template.html` 2433 dòng, 28 module JS (tổng khoảng 5113 dòng), 27 tệp JSON dữ liệu, 23 script Python đồng bộ dữ liệu. Bản dựng ≈ 5,7 MB (chưa mã hóa), ≈ 3,1 MB (mã hóa và nén).

**Ràng buộc bất biến (phải giữ khi dựng lại):**
1. Chạy offline trên Chrome/Edge: không gọi mạng khi tải (thư viện, phông, ảnh địa hình, dữ liệu đều nhúng). Chỉ các nút “Cập nhật”, “Tìm nguồn bằng AI”, liên kết nguồn mới mở mạng, và chỉ khi người dùng bấm.
2. Khóa bằng mật khẩu (AES-256-GCM, PBKDF2-SHA256 600.000 vòng, nén gzip trước khi mã hóa), giải mã tại máy.
3. Không đưa thông tin cá nhân lên bản đồ: không tên khách cá nhân, không số điện thoại cá nhân, không số khung (VIN), không biển số, không tên tư vấn bán hàng. Thông tin doanh nghiệp công khai (tên doanh nghiệp OSM, số điện thoại doanh nghiệp công khai) được phép.
4. Mọi số liệu thị trường có nguồn bấm được hoặc ghi rõ “ước tính”, “file nội bộ DAC”. Không có số thì hiện “chưa có số”, không điền 0, không bịa. Phân biệt “Quan sát” (có nguồn, ngày) và “Giả định”.
5. Ngôn ngữ giao diện: tiếng Việt có dấu đầy đủ; số theo định dạng vi-VN (dấu chấm ngăn nghìn, dấu phẩy thập phân).
6. Không giả mạo trình duyệt, không vượt chặn của website khi thu thập dữ liệu.
7. Bản đồ chỉ gửi dữ liệu ra ngoài khi người dùng chủ động; không có telemetry.

## 2. Kiến trúc tổng thể

```
 ┌──────────────────────────── index.html (một file tự chứa) ───────────────────────────┐
 │  <style> CSS (token :root)      <script json> dữ liệu (≈ 20 thẻ)      <script> three r147 │
 │  template.html  (lõi: dữ liệu → compute() → cảnh 3D, tab Hồ sơ tỉnh, tab Đại lý, Ben)    │
 │  ops.html       (khung các khối báo cáo dưới bản đồ)                                     │
 │  N module IIFE  (mỗi module đăng ký vào window.__CV: tools, localHooks, ctx, hook UI)     │
 └────────────────────────────────────────────────────────────────────────────────────────┘
        ▲ build.py ghép + esbuild thu gọn          │ tools_lock.py: gzip → AES-GCM → trang nhập mật khẩu
        │                                          ▼
  *.json  vendor/  relief.webp  height.webp      ../ban-do/index.html (đưa lên GitHub Pages)
```
**Hợp đồng module.** Mỗi `*.js` là một IIFE `(function(){ "use strict"; const CV = window.__CV; if(!CV) return; ... })()`, chạy sau lõi theo thứ tự `MODULES` trong `build.py` (layout.js luôn cuối). Module giao tiếp qua đối tượng toàn cục `window.__CV` do lõi tạo (template.html, cuối tệp):

| Thành phần của `__CV` | Ý nghĩa |
|---|---|
| `rows`, `findRow(tên)`, `tam`, `uioNat` | 34 dòng tỉnh đã tính (compute), số neo cả nước |
| `NET`, `CNET`, `CUST`, `MKT`, `INFRA` | mạng lưới Đô Thành, mạng lưới đối thủ, khách hàng, chiến dịch MKT, hạ tầng |
| `tools[]` | công cụ cho Ben (tên, mô tả, inputSchema, execute) |
| `localHooks[]` | hàm `(chuỗi) => markdown\|null` xử lý lệnh gõ/đọc trước khi gọi AI |
| `ctx` | hàm trả chuỗi bối cảnh nối vào lời nhắc hệ thống của Ben (mỗi module nối thêm) |
| `esc, fmtInt, fmt1, mdToHtml, toast` | tiện ích dùng chung |
| `openAi, benTab, addMsg, finishBubble, askAi, sample, downloads` | giao diện Ben và khả năng Claude (`sample`, `dictation`, `db`, `downloads`, `user`, `assets`) |
| `view3d {camera, controls, wx, K, LAT0, LAT1, anim, stopIntro}`, `zoomProvince` | điều khiển cảnh 3D từ module |
| `store {get,set,del,keys}` | kho cục bộ có sự kiện `dac:store` (dùng cho số tài chính, dữ liệu nhập) |
| `openX` (openBoard, openCashflow, openInput, openBattle, openResearch, openCompetitiveness) | mở hộp thoại tương ứng |

**Luồng dữ liệu.** JSON nhúng → `compute()` tính 34 dòng (`_market`, `_uio`, `_share`, `_attr`, `_str`, `_post`, ...) → `renderAll()` vẽ lại KPI, bảng, bản đồ 3D, hồ sơ tỉnh → module đọc `CV.rows` và dữ liệu của mình để vẽ khối riêng. Số do người dùng sửa lưu localStorage `cv-map-v6`; hook `CV.onSave` báo module khác vẽ lại.

**Khóa lưu cục bộ (localStorage):** `cv-map-v6` (dòng tỉnh đã sửa), `cv-ops-v1` (đầu việc, cuộc họp, lời thoại, nhật ký), `dac.grab`, `dac.layout.*`, `dac.plan*`, `dac.in.*` (dữ liệu nhập đã tổng hợp), `dac.research` (sổ nguồn), `dac.promoName` (chấm tên khuyến mãi), `cv-brief-seen`.

**Khả năng của môi trường Claude (tùy chọn, có thì dùng):** `sample` (Ben AI), `dictation` (ghi giọng), `db` (dữ liệu chung nhiều người), `user` (quyền Host), `downloads`, `assets`. Ngoài Claude (tệp offline, GitHub Pages) bản đồ vẫn chạy, các phần AI rơi về quy tắc cục bộ (xem mục 9).

## 3. Quy trình dựng và đóng gói

```bash
npm install                                   # esbuild để thu gọn JS/CSS
python3 build.py                              # → index.html (tự chứa), artifact.html
MAP_PASSWORD='…' python3 tools_lock.py        # → ../ban-do/index.html (đã mã hóa)
```
- `build.py` đọc `template.html`, thay các chỗ giữ chỗ: `/*__GEO__*/`, `/*__DEBT__*/`, `/*__BMEDIA__*/`… bằng nội dung JSON đặt trong thẻ `<script id="…-data" type="application/json">`; thay `/*__RELIEF__*/`, `/*__HEIGHT__*/` bằng data-URI ảnh; chèn `ops.html`; nối các module (`MODULES`) trong một `<script>`; thay `/*__RADAR__*/`, `/*__BONUS__*/`, `/*__MARKET__*/`, `/*__PLAN__*/` trực tiếp vào module tương ứng (`INLINE`); nhúng phông woff2 và three r147 (`vendor/`).
- Thứ tự `MODULES` hiện tại: ops, lens, lyhoc, legal, comp, hud, sales, fc, glossary, model, inv, tx, audit, board, warplan, radar, policy, market, customers, plan27, cashflow, inputs, controls, battle, updater, research, competitiveness, layout.
- `tools_lock.py`: gzip → AES-256-GCM (khóa PBKDF2-SHA256 600.000 vòng, muối ngẫu nhiên) → ghi trang nhập mật khẩu `lock.html` + dữ liệu mã hóa; trình duyệt giải mã bằng Web Crypto và `DecompressionStream`, rồi `document.write` nội dung (tải lại trang là khóa lại). Lịch sử mật khẩu lưu dạng băm; mật khẩu mới không trùng cũ.
- GitHub Actions (`.github/workflows/doi-mat-khau-ban-do.yml`): dựng và khóa lại khi `main` đổi; đổi mật khẩu theo bí mật `MAP_PASSWORD`.
- Đồng bộ dữ liệu: các script `tools_*.py` (bảng ở README) đọc Excel/ERP/website công khai và ghi lại JSON; sau đó dựng lại.

## 4. Mô hình dữ liệu (JSON)

Cấu trúc rút gọn (kiểu trường, số bản ghi) lấy trực tiếp từ các tệp hiện tại. Khi dựng lại bằng TypeScript, mỗi tệp nên có một `interface` và bộ kiểm tra lược đồ (zod/ajv).

| Tệp | Kích thước | Cấu trúc |
|---|---|---|
| `bonus2026.json` | 35 KB | `{asOf: str, source: str, points: [24× dict], west: [8× dict], tvbh: {Miền Bắc: dict, Miền Nam: dict, Miền Tây: dict}, budget: [4× list], rates: [5× list], tiers: [13× list], cond: [8× list], log: [5× list], tier: {Quang Dương: dict, Ô Tô 19/5: dict, ĐT Đông Nam: dict, Tân Vạn: dict, Phú Mỹ: dict, Vũ Hùng: dict, Hưng Vượng: dict}, recon: [15× dict]}` |
| `brandmedia.json` | 78 KB | `{checked: str, note: str, brands: {dt: dict, teraco: dict, thaco: dict, foton: dict, tmt: dict, jac: dict, isuzu: dict, veam: dict, kimlong: dict}}` |
| `competitors.json` | 48 KB | `{updated: str, brands: [5× dict]}` |
| `compnet.json` | 172 KB | `{updated: str, note: str, brands: {thaco: dict, teraco: dict, jac: dict, foton: dict, tmt: dict, isuzu: dict, veam: dict, kimlong: dict}, sources: {daehan: list, oto360t: list, tc_th: list, tc_na: list, tc_bn: list, tc_hcm: list, tc_ct: list, tc_hp: list, tc_pt: list, tc_dn: list, jac: list, jacbh: list}, points: [80× dict], dealers: [296× dict], dealersAsOf` |
| `customers.json` | 191 KB | `{asOf: str, note: str, sources: {ku: str, tvbh: str}, prospects: [318× dict], loyalty: {customers: int, repeat: int, repeatVeh: int, repeat3: int, byProv: dict}, buyers: {total: int, years: dict, noProv: int, byProv: dict, districts: list}}` |
| `debt2026.json` | 9 KB | `{asOf: str, source: str, terms: {MB: float, MBTB: int}, note: str, guess: {SR-PHUYEN: str, DLAC-THDL: str}, unmapped: {}, noPrice: {}, MB: {n: int, amt: int, over: int, overAmt: int}, MBTB: {n: int, amt: int, over: int, overAmt: int}, buckets: {MB: dict, MBTB: dict}, bucketsAmt: {MB: dict, MBTB: dict}, dueAmt: {MB: dict, MBTB: dict}}` |
| `factory.json` | 48 KB | `{asOf: str, source: str, def: {chassis: str, fg: str, wait: str, age: str}, note: str, items: [105× dict], groups: {DAEWOO: dict, IZ: dict, MISSU: dict, T822: dict}, pipeline: {ckd: int, wipBody: int, wipQC: int, mbtb: int, byGroup: dict}, consign: {CN- Đồng Nai: int, ĐT Bình Thuận: int, Quang Dương: int, Hùng Tuyến: int, Phú Mỹ: int, ĐT Đồng Nai: int, ĐT Hả` |
| `forecast2027.json` | 3 KB | `{asOf: str, data: {months: list, y: list, points: list}, sarimax: {spec: str, n: int, aic: float, mapeIn: float, mapeOut: float, params: dict, pvalues: dict, scen: dict, basePoints: float}, ols: {spec: str, n: int, r2: float, r2adj: float, coef: dict, pvalues: dict, actual12: float, fit12: int, plan: dict}}` |
| `infra.json` | 16 KB | `{updated: str, cities: [75× dict], arteries: [19× dict], nodes: [39× dict]}` |
| `inventory.json` | 17 KB | `{asOf: str, source: str, total: int, recon: {tonT10: int, muaT11: int, mbtb: int, mbtbToMb: int, banLeT11: int, thuHoi: int, ton: int, ok: bool, note: str}, mbtb: {xe: int, note: str}, contracts: {Mua bán: int, MBTB: int, Ký gửi: int}, daysT11: int, retailT11: int, regT10: int, models: [18× dict], dealers: [27× dict], age: {withPayDate: int, buckets: dict, o` |
| `legal.json` | 70 KB | `{updated: str, note: str, docs: [31× dict], calendar: [17× dict], trend: [8× list]}` |
| `market2026.json` | 127 KB | `{asOf: str, sources: {dkm: str, iz: str, kama: str}, annual2026: int, annualNote: str, national: {Van: dict, Small Trucks I: dict, Small Trucks II: dict, Light Trucks I: dict, Light Trucks II: dict, Medium Trucks I: dict, Medium Trucks II: dict, Heavy Trucks: dict, Grand Total: dict}, monthly2026: {Van: list, Small Trucks I: list, Small Trucks II: list, Ligh` |
| `mkt2027.json` | 943 KB | `{asOf: str, source: str, assume: [16× list], plan: [34× dict], events: [156× dict], prospects: [2118× list], phases: [3× str], principles: [3× str], playbook: [8× list], dealers: [41× str], prospectCols: [19× str]}` |
| `network.json` | 38 KB | `{updated: str, sourceDealers: str, sourceStations: str, coordNote: str, totals: {khT9: int, siT9: int, leT9: int, thT10: int, khT10: int, izT10: int, izKhT10: int, msT10: int, msKhT10: int, khYear: int, tonT9: int}, vama: {period: str, dothanh: int, dothanhT9: int, regionT9: dict, brands: list, peerShare: float, lightShare: float, cvShare: float}, dealers: [` |
| `plan2027.json` | 51 KB | `{asOf: str, rateYear: float, W: [2× str], rateAll: float, note: str, noPrice: {CL4TF: int, BENTỰ ĐỔ: int, HC6: int, ĐẦU KÉO: int}, stock: {ton: int, mb: int, mbtb: int, kg: int, value: int, expo: int, carryMonth: int, cover: float, excess: int, excessExpo: int, age: dict, withAge: int}, factory: {fg: int, wait: int, chassis: int, value: int, pipeline: dict, ` |
| `pricelist.json` | 39 KB | `{title: NoneType, sub: NoneType, retrieved: str, items: [64× dict], notes: [4× str], offerHead: NoneType, offers: [14× dict], offerNotes: [3× str], policyHead: NoneType, policy: [12× dict], xtlHead: NoneType, xtl: [3× dict]}` |
| `products.json` | 4 KB | `{updated: str, source: str, catalog: str, groups: [4× dict], prices: {T26: list, T33L: list, V56: list, V65: list, IZ45S: list, IZ50S: list, IZ50M: list, IZ62M: list, IZ50M Plus: list, IZ65M Plus: list, IZ60SL Plus: list, IZ71SL Plus: list}, specs: {V56: list, V65: list, T26: list, T33L: list, IZ45S: list, IZ50S: list, IZ50M: list, IZ50M Plus: list, IZ60SL P` |
| `provinces.json` | 131 KB | `[34× {name: str, region: str, merged: list, capital: str, archetype: str, pop: float, area: int, grdp: float, growth: float, mix: list, factor: float, industries: str}]` |
| `provstats.json` | 37 KB | `{updated: str, national: {gdpGrowth2025: float, income2025: float, fdi10m26: int, publicInv10m26: float, gdp9m26: float, publicInv9m26: float, cpi10m26: float, cpi10yoy: float, core10m26: float}, growth2025: {Quảng Ninh: dict, Hải Phòng: dict, Ninh Bình: dict, Phú Thọ: dict, Bắc Ninh: dict, Quảng Ngãi: dict, Đồng Nai: dict, Tây Ninh: dict, Đà Nẵng: dict, Hà ` |
| `radar.json` | 13 KB | `{updated: str, doc: str, src: {nso10: list, nsoX: list, nsoQ3: list, nso25: list, ksms: list, ng25: list, g9: list, lab: list, pmi: list, spg: list, sbv: list, credit: list}, ind: [20× dict], extra: [3× dict], weights: [6× list]}` |
| `sales.json` | 178 KB | `{plan: {kh27m: list, erpBase27m: list, erpLow27m: list, models: list, kh27model: list, reg09model: list, erpBase27model: list, msImport27m: list, msSell27m: list, dealers: list, erpTotal27: list, kh27: float}, updated: str, sourceUpdated: str, source: str, note: str, missu: [4× str], nat: {si: list, le: list, kh: list, stock: dict}, dealers: [24× dict], csiD` |
| `sources.json` | 7 KB | `{updated: str, sources: [7× dict]}` |
| `tx.json` | 124 KB | `{source: str, asOf: str, synced: str, def: {le: str, si: str, xk: str, fleet: str, pend: str}, fleetMin: int, months: [35× str], dealers: [28× str], regions: {Quang Dương: str, ĐT Đà Nẵng: str, Ô Tô 19/5: str, Trường Vũ: str, Tân Vạn: str, Dũng Lạc: str, Việt Nhật Anh: str, Phúc Châu: str, Mỹ Phú Hưng: str, ĐT Đông Nam: str, ĐT Long An: str, Phú Mỹ: str}, mo` |
| `vn34.geojson` | 69 KB | FeatureCollection 37 đối tượng; `properties: {name, merged[]}` (tỉnh sau sáp nhập, `merged` là tên các tỉnh cũ), có hai quần đảo Hoàng Sa, Trường Sa và đối tượng `__VN__` đường viền cả nước |

**Ảnh địa hình:** `relief.webp` (4096², màu nền địa hình), `height.webp` (độ cao mã hóa `m = R*256 + G − 12000`, nén không mất dữ liệu, biển làm tròn 25 m); nguồn DEM AWS Terrain Tiles (`tools_relief.py`).

**Khóa nối dữ liệu quan trọng:** tên tỉnh (chuẩn hóa NFC, bỏ tiền tố “TP.”, hàm `norm`), tên đại lý bán hàng `salesKey` (nối `network.json` với `sales.json`, `inventory.json`, `debt2026.json`), mã hãng (`b`: thaco, teraco, jac, foton, tmt, isuzu, veam, kimlong), nhóm sản phẩm (`products.json`: MISSU, IZ Series, JP Series, DAEWOO TRUCKS).

**Nguồn và độ tin cậy:** `sources.json` (7 nhóm nguồn có liên kết), `provstats.json`, `radar.json`, mỗi hãng trong `competitors.json` có `sources[]`, `brandmedia.json` có cờ `v` (web = thấy trong mã nguồn trang chủ chính thức; bao = theo bài báo hoặc tìm kiếm, cần đối chiếu).

## 5. Lõi 3D (Three.js r147)

Mã ở `template.html` (hàm `initScene`, `loop`, các hàm vẽ pin, cột, nhãn, chọn).

**Hệ tọa độ.** Hộp địa lý `LNG0=101.5, LNG1=117.5, LAT0=7.0, LAT1=24.0`, hệ số `K=10` đơn vị cảnh trên mỗi độ vĩ, `COSL=cos(15,5°)` để bù độ co kinh tuyến. `wx(lng) = (lng − tâm) × K × COSL`, `wz(lat) = −(lat − tâm) × K` (trục z hướng nam). Độ cao: `yUnit(m) = m/111000 × K` (trên mực nước biển) và nén 12% cho độ sâu biển (tối đa −4.500 m); hệ số phóng đại độ cao `exag` do thanh trượt “Độ nổi địa hình”.

**Địa hình.** Giải mã `height.webp` vào `Float32Array H` (nội suy song tuyến `heightAt(lng,lat)`). Lưới `PlaneGeometry(W, D, 767, 815)` (máy yếu, màn hình ≤ 700px hoặc bộ nhớ ≤ 4 GB: 447 × 475), dịch đỉnh theo `yUnit(heightAt(...))`, `computeVertexNormals`. Hai lớp vật liệu trên cùng lưới: nền địa hình (`MeshStandardMaterial`, ảnh relief) và lớp phủ (`MeshLambertMaterial`, `CanvasTexture` 2048², `polygonOffset` để nằm trên địa hình, `renderOrder=1`) dùng để tô màu tỉnh theo chỉ số (`drawOverlay`, `metricColor`, thang `--scale-1..5`).

**Nền nối tiếp (apron).** Lưới 240² lớn gấp 4 lần, lấy ảnh relief lặp gương (`MirroredRepeatWrapping`), độ cao giảm dần ra ngoài và tối dần vào sương mù (`Fog` 0x061024, 420→980) để phóng to sát rìa không lộ mép cắt. Nước: mặt phẳng trong suốt y=0,01.

**Đường viền tỉnh.** Từ `vn34.geojson` dựng đoạn thẳng `LineSegments2` (độ rộng pixel cố định, sắc nét mọi mức phóng) dán lên địa hình (`ringSegments`, `makeLines`); tô sáng tỉnh đang chọn (`updateHighlight`). Điểm trong tỉnh: `provinceAt(lng,lat)` dùng bbox + ray casting `inRing`.

**Lớp đối tượng.** `pinGroup` (pin đại lý/trạm: Sprite có texture vẽ từ canvas, kích thước theo pixel `sizeAttenuation:false`), `barGroup` (cột chỉ số theo tỉnh), `compGroup` (điểm đối thủ), `custGroup` (khách tiềm năng, khách đã mua, sự kiện MKT), `infraGroup` (đô thị, trục giao thông, cảng, cửa khẩu, KCN), `siteGroup` (điểm đề xuất đại lý mới). Mỗi sprite giữ `userData` (đối tượng nguồn) để chọn và tooltip.

**Camera và điều khiển.** `PerspectiveCamera(38°)`, `OrbitControls` (damping 0,08, `maxPolarAngle` 0,48π, khoảng cách 10–460, `screenSpacePanning`). Chế độ “Nắm kéo”: chuột trái = PAN, phải = xoay (`THREE.MOUSE.PAN`), cảm ứng một ngón kéo (`applyGrab`, lưu `dac.grab`). Bốn góc nhìn định sẵn `VIEWS`. `camAnim` bay mượt tới mục tiêu; `zoomProvince(tên)` tính bbox đa giác tỉnh, khoảng cách `min(300, max(26, span × 1,55))`, đặt camera tại `tâm + (0, d×0,72, d×0,62)`; tên rỗng thì về góc nhìn đầu. Bộ lọc tỉnh `provSel` và nhấp đúp gọi hàm này.

**Nhãn và chọn.** Nhãn tên tỉnh là phần tử HTML (`labelsEl`) chiếu từ tọa độ 3D bằng `project(camera)` mỗi khung hình (`updateLabels`, ẩn khi trùng nhau). Chọn: `Raycaster` trên sprite theo thứ tự ưu tiên (pin, đối thủ, khách, hạ tầng), sau đó tới tỉnh qua `provinceAt` điểm giao với địa hình; rê chuột hiện tooltip, nhấp chọn và “ghim” tỉnh. Nhấp vào điểm có vị trí thì mở Google Maps (`gmapUrl`).

**Vòng lặp.** `requestAnimationFrame(loop)`: cập nhật OrbitControls, `camAnim`, mở đầu intro (tôn trọng `prefers-reduced-motion`), chiếu nhãn, vẽ lại lớp phủ khi `needOverlay`. Khi tải mất `loadmsg`.

**Hiệu năng.** `devicePixelRatio` tối đa 2 (1,5 trên di động), lưới nhẹ cho máy yếu, sprite thay vì mesh cho điểm, lớp phủ canvas thay vì nhiều mesh tô màu. Khi dựng lại, nên tách địa hình, lớp phủ và lớp điểm thành ba lớp riêng, dùng `InstancedMesh` hoặc `Points` cho hơn vài nghìn điểm.

## 6. Công thức nghiệp vụ lõi

Nguồn: `compute()` trong template.html và các module. Khi dựng lại phải giữ đúng để số khớp.

- **Thị trường tỉnh `_market`** (ĐK mới xe tải quy năm): nếu có `regT10` thì `regT10 / Σ regT10 × tam` (tam = tổng quy năm cả nước, mặc định 126.408 theo báo cáo IZ); nếu không, số thực `reg` hoặc phân bổ phần còn lại theo trọng số `grdp^0,65 × pop^0,35 × factor`.
- **UIO `_uio`:** số thực nhập (`uio`) > neo `carStock × uioNat / 7.134.939` > phân bổ theo `uioW` (85% tỷ trọng ĐK xe TM 2025 và 6T/2026, 15% xe tải hết niên hạn). `_turn = _market / _uio × 100`.
- **Thị trường phân khúc có sản phẩm Đô Thành `_addr10`:** `_market × tỷ trọng phân khúc (regT10addr/regT10; mặc định 56.364/98.955) × 10/12`. **Thị phần `_share = sales / _addr10 × 100`.**
- **Hạng tỉnh theo quy mô `_tier`:** A nếu `_mshare ≥ 4%`, B nếu ≥ 2%, còn lại C.
- **Sức hấp dẫn `_attr`** = 100 × (0,60 × √market/max√market + 0,25 × clamp((tăng trưởng − 5)/7, 0, 1) + 0,15 × GRDP/người ÷ max). **Nội lực `_str`** = 100 × (có số bán ? 0,55 × min(share/15, 1) + 0,45 × cov : cov), với `cov = 1 − exp(−n × 2000 / market)`, n = số đại lý cấp 1 và 2 trong tỉnh. **Thế trận** (bản gốc): attr ≥ 50 và str ≥ 50 → tấn công; attr ≥ 50 → mở rộng; str ≥ 50 → giữ; còn lại → du kích; thị phần mục tiêu 12/8/15/5%; chỉ tiêu `_tgt26 = market × 1,08 × thị phần mục tiêu`. **Bản dùng thực tế:** `CV.boardPosture` (board.js) ghi đè `_post/_attr/_str` bằng chấm điểm Phòng chiến lược (xếp hạng 34 tỉnh theo số bán, tồn, đối thủ).
- **Điểm đề xuất đại lý mới (`scoreSites`)** cho 75 đô thị trong `infra.json`: `score = 100 × (0,35 × √demand/max + 0,20 × traffic + 0,15 × logistics + 0,30 × gap)`. `demand` = ĐK mới vùng × tỷ trọng dân số đô thị trong tỉnh; `traffic` theo khoảng cách tới trục giao thông gần nhất (hệ số cấp 1: 1, cấp 2: 0,8, cấp 3: 0,6, cộng 0,15 mỗi trục giao cắt trong 8 km); `logistics` = tổng trọng số nút trong 45 km (cảng 0,35, cửa khẩu 0,35, KCN 0,25, sân bay 0,15, tối đa 1); `gap = clamp((khoảng cách tới đại lý/trạm gần nhất − 15)/85, 0, 1)`; đã có điểm nếu < 15 km. Định dạng điểm bán theo `demand` và `gap`.
- **Dòng tiền:** dư nợ chia 5 nhóm tuổi (trong hạn, 1–30, 31–60, 61–90, > 90), DSO = dư nợ ÷ (sell-in 3 tháng × giá TB ÷ 92), thu 13 tuần = dư nợ theo nhóm × tỷ lệ thu hồi (mặc định 90/70/50/30%, sửa được) + bán mới × 80% từ tuần 5, chi theo trường tài chính nhập tay; điểm trũng tiền mặt = min số dư lũy kế.
- **Dự báo 2027:** SARIMAX(1,0,0) + xu hướng, biến ngoại sinh mùa vụ ERP; hồi quy OLS theo tỉnh (R² 0,81) → `forecast2027.json` (script `tools_forecast_2027.py`, dùng statsmodels). Kế hoạch 5.000 xe KPI, 4.200 cam kết, thị phần 7%.
- **Chấm điểm LEAD** (competitiveness.js): khung 100 điểm (ngành 15, nhu cầu 20, tín hiệu mua 20, tiếp cận 10, tài chính 10, phù hợp sản phẩm 15, thời điểm 10), chỉ cộng khi có bằng chứng, nhóm A, B, C, D theo tỷ lệ trên điểm có bằng chứng (ngưỡng đề xuất chờ duyệt); chưa có tín hiệu mua thì tối đa nhóm B.
- **Radar:** 20 chỉ số quốc gia gom 6 nhóm có trọng số, điểm 0–100 mỗi tỉnh (`radarScore`); cảnh báo sớm theo quy tắc trong `alerts()`.

## 7. Giao diện theo vùng và theo tab

**Bố cục trang (từ trên xuống):**
1. **Đầu trang:** logo Đô Thành, tiêu đề, dải KPI (`renderKpis`), bộ lọc **khu vực kinh doanh** (`zoneSel`), **bộ lọc tỉnh** (`provSel`, tự phóng to 3D), ô nhập ĐK mới xe tải toàn quốc 2026 (`tam`) và UIO xe thương mại (`uioNat`) làm số neo, dải nút chọn chỉ số tô màu bản đồ (`#metrics`, `METRICS`: hơn 20 chỉ số, ví dụ ĐK mới, UIO, sức hấp dẫn, thị phần phân khúc, GRDP, mùa vụ).
2. **Bản đồ 3D** (`#stage`) với thanh công cụ: Phòng chiến lược HĐQT, Chiến trường 2D, Dòng tiền, Nhập dữ liệu, Cập nhật từ mạng, Tìm nguồn bằng AI, Kiểm soát dữ liệu (huy hiệu số lỗi), Giao thông & đô thị, Đề xuất đại lý, Cột chỉ số, Tên tỉnh, Đại lý, Đối thủ, Khách hàng, Nắm kéo, Tự xoay, Đổi góc nhìn; thanh trượt độ nổi địa hình; chú giải khu vực và đại lý.
3. **Bảng bên phải (`aside.side`) có 3 tab:**
   - **Hồ sơ tỉnh** (`tabP`, hàm `renderDossier`): Thị trường lớn nhất; Dân số & hành chính; Kinh tế vĩ mô; Xe thương mại (UIO và đăng ký mới); Đối thủ và thị phần trong tỉnh; Mạng lưới & kinh doanh; Mùa vụ & lịch chiến dịch; Con người & niềm tin; Giữ chân khách cũ & chiến dịch dịch vụ; Cơ cấu thị trường tỉnh (ước); Kinh tế chủ lực; Hạ tầng & logistics; Văn hóa, dân tộc, đặc sản; Động lực nhu cầu xe thương mại.
   - **Đại lý · số bán T10** (`tabC`, `renderCenters`): danh sách đại lý cấp 1, cấp 2, trạm dịch vụ có số bán T10, bấm để bay tới và mở Google Maps.
   - **Năng lực cạnh tranh** (`tabN`): thẻ chỉ số, nhận định, nút mở `ncDlg` (xem mục 8).
4. **Trợ lý Ben** (nút nổi “Ben · Báo cáo”, panel `#ai`) có 6 tab: *Hỏi đáp* (trò chuyện, báo cáo tức thì, gợi ý), *Tính nhanh* (máy tính họp, thị phần và mục tiêu), *Giá trị SP* (TCO), *Sale talk*, *Thư ký họp*, *Lý học*.
5. **“Báo cáo chi tiết”** (gom bởi `layout.js` thành các nhóm thu gọn): Radar kinh tế – tài chính; Thị trường xe tải 2026 theo mẫu xe; Trung tâm dữ liệu (HUD); Thế trận 34 mặt trận; Cơ cấu thị trường và đối thủ; Đối thủ: giá và chính sách; So sánh đối thủ (sản phẩm, dịch vụ, nhận diện, chính sách); Đề xuất mở đại lý mới; Tài sản tồn kho, công nợ và lộ trình 2027; Khách hàng và chiến dịch chăm sóc; Chiến dịch MKT offline cả nước 2027; Hành trình khách hàng và lịch chiến dịch; Chính sách hỗ trợ bán hàng 2026; Doanh số chi tiết IZ – MISSU; Bán hàng chi tiết; Tồn kho đại lý; Dự báo kinh doanh; Mô hình dự báo DAC; Bảng giá công bố và chính sách T11/2026; Pháp lý và chính sách cập nhật; **Trung tâm điều hành** (4 tab: Đầu việc, Bảng năng lực Leader, Cuộc họp và biên bản, Nhật ký thay đổi dữ liệu).
6. **Xếp hạng, Bảng dữ liệu và cập nhật** (sửa số, tải CSV/JSON, dán dữ liệu, khôi phục gốc), **Nguồn dữ liệu**, **Phương pháp và nguồn số liệu**.

**Hộp thoại (`<dialog class="odlg">`):** `boardDlg` (Phòng chiến lược), `cashDlg` (Dòng tiền), `inDlg` (Nhập dữ liệu), `ctrlDlg` (Kiểm soát dữ liệu), `warDlg` (Chiến trường 2D), `drDlg` (Tìm nguồn bằng AI), `ncDlg` (Năng lực cạnh tranh), `minDlg` (biên bản), `taskDlg` (đầu việc), `askDlg` (hộp hỏi dùng chung). Khung chung: tiêu đề `header` + `.body`, lưới `.hudgrid` với ô `.hp.w6/.w12`, bảng `.tasktbl.small`, thẻ số `.stats .stat`, chú giải bằng thuộc tính `data-tip` / `data-gloss`.

**Thiết kế thị giác (token CSS trong `:root`):** nền `--bg #050b16`, `--bg-2 #0a1730`; chữ `--ink #e8f3ff`, `--muted #8ea7c7`; nhấn `--cyan #46e3ff`, `--teal #3fe0c5`, `--magenta #ff4d8d`, `--amber #ffc35a`; trạng thái `--good #4ee2a0`, `--warn #ffc35a`, `--bad #ff6b6b`; pin `--pin-4s #ff4d6d`, `--pin-3s #46c8ff`, `--pin-tdv #ffd166`; 11 màu khu vực `--z-*`; thang chỉ số 5 mức `--scale-1..5` (xanh đậm → hồng đỏ); 6 màu phân khúc `--seg-*`. Phông: Chakra Petch (tiêu đề), Be Vietnam Pro (nội dung). Hiệu ứng “kính” (`.glass`: gradient mờ, viền sáng, đổ bóng), bo góc `--r 18px`. Hỗ trợ màn hình hẹp (≤ 700px), `prefers-reduced-motion`, nhãn `aria-*` cho tab, hộp thoại.

## 8. Từng module

Mỗi mục gồm: vai trò, số dòng, hàm chính (trích từ mã), công cụ Ben, hook `CV`, nút hoặc hộp thoại. Dữ liệu vào ở mục 4.

### 8.1 `ops.js`: Trung tâm điều hành và thư ký họp (1034 dòng)
Khối “Trung tâm điều hành” (ops.html) dưới bản đồ gồm 4 tab: Đầu việc, Bảng năng lực Leader, Cuộc họp & biên bản, Nhật ký thay đổi dữ liệu. Trong Ben có tab Thư ký họp (bMeet). Đầu việc có PIC, phối hợp, chỉ số, bằng chứng, hạn, điểm nghẽn, check-in; sức khỏe việc xanh/vàng/đỏ (hàm health). Biên bản: ghi giọng (khả năng `dictation` của Claude hoặc Web Speech của Chrome), gõ tay, đánh dấu câu (Ý chính, Quyết định, Giao việc, Điểm nghẽn, Rủi ro), Ben lập nháp (khả năng `sample`) hoặc lập nhanh từ đánh dấu và từ khóa, Host chốt thì tự giao việc. Lưu: khả năng `db` (collections tasks, meetings, signoffs, shared/changes, shared/mapdata) hoặc localStorage `cv-ops-v1`. Có cảnh báo biên bản chưa chốt, kỷ luật họp, sao lưu lời thoại, xuất Word/HTML.

- Hàm chính: ymd, toD, addDays, dd, wd, vnDate, vnTime, parseDue, loadLocal, saveLocal, applyLocal, put, dbErr, who, wantName, diffMap …
- Công cụ Ben: `update_map_data`, `undo_last_change`, `ops_brief`, `list_tasks`, `create_task`, `update_task`, `get_meeting_transcript`, `ky_luat_hop`
- Hook `CV`: `ask`, `ctx`, `meetingDiscipline`, `onSave`, `pendingMinutes`, `rows`, `setProvFields`, `tam`, `uioNat`

### 8.2 `lens.js`: Lớp dữ liệu nền ẩn và chẩn đoán (228 dòng)
Các lớp chỉ số nền hiện khi rê chuột; chẩn đoán “vì sao đối thủ bán được, Đô Thành không” theo tỉnh.

- Hàm chính: nearestStation, netOf, nodesOf, arteriesOf, nat, fitOf, diagnose, diagMd, setLens, lensFromText, indicators
- Công cụ Ben: `show_lens`, `get_indicators`, `diagnose_province`
- Hook `CV`: `PS`, `baseSrc`, `ctx`, `lensBar`, `lensHtml`, `lensTip`, `lensWire`, `provExt`, `setLens`

### 8.3 `lyhoc.js`: Lý học (tab Ben · Lý học) (259 dòng)
Âm lịch, can chi, Mai Hoa Dịch số, mệnh khách hàng, Thiên – Địa – Nhân. Phần văn hóa phục vụ tư vấn, không dùng làm chỉ số kinh doanh.

- Hàm chính: jdFromDate, newMoon, sunLong, month11, leapOff, solar2lunar, lich, gieo, hexSvg, gieoMd, menh, bienSo, menhMd, ngayMd, tdn, tdnMd …
- Công cụ Ben: `am_lich`, `gieo_que`, `menh_khach`, `thien_dia_nhan`
- Hook `CV`: `ctx`, `gieo`, `lich`, `menh`, `tdn`

### 8.4 `legal.js`: Pháp chế (101 dòng)
Kho văn bản pháp luật (legal.json: docs, calendar, trend), lịch tuân thủ, nút Ben tóm tắt, hỏi như luật sư, giao việc tuân thủ.

- Hàm chính: status, search, upcoming, docMdBase, docMd, briefMd, render
- Công cụ Ben: `tra_cuu_phap_luat`, `lich_tuan_thu`
- Hook `CV`: `ctx`

### 8.5 `comp.js`: Đối thủ (140 dòng)
Bảng giá, chính sách, so sánh đối đầu Teraco, Thaco, JAC, Foton, TMT; mạng lưới đối thủ; Sale talk đối đầu.

- Hàm chính: dtMatch, rowsOf, insights, compMd, pano, panoMd, renderPano, netStats, netMd, render, renderNet
- Công cụ Ben: `mang_luoi_doi_thu`, `so_sanh_doi_thu`
- Hook `CV`: `compPano`, `ctx`, `netStats`

### 8.6 `hud.js`: Hologram HUD (125 dòng)
Nền mạng điểm sáng và bảng biểu đồ điều hành (Trung tâm dữ liệu).

- Hàm chính: data, ring, hbars, bullet, diverge, donut, render
- Công cụ Ben: không có
- Hook `CV`: `onSave`

### 8.7 `sales.js`: Doanh số chi tiết IZ – MISSU (233 dòng)
Đại lý × tháng (TDBH 2026), model × năm (CSI 2023–2026), dự báo theo đại lý; xuất CSV.

- Hàm chính: series, models, dealerStats, insights, combo, heat, modelTable, txAgg, txHistory, ownSeason, forecast, fcChart, fcHtml, fcMd2, scope, render …
- Công cụ Ben: `du_bao_doanh_so`, `ban_le_t11`, `doanh_so_chi_tiet`
- Hook `CV`: `TX`, `ctx`, `factory`, `salesForecast`, `salesForecastRows`, `salesModelsOfProvince`, `salesOf`, `salesPlan`, `salesSeason`, `salesSpark`, `salesTDBH`, `txAgg`

### 8.8 `fc.js`: Dự báo kinh doanh 3 bước (270 dòng)
Làm sạch và phân khúc, độ trễ vĩ mô, S&OP chốt số; nhập số bán thật, tải mẫu, chạy thử dữ liệu minh họa.

- Hàm chính: persist, span, step1, diff1, yoy, corr, step2, hw, baseline, sop, compHints, demoData, parseCSV, normSeg, normBody, importSales …
- Công cụ Ben: `du_bao_kinh_doanh`
- Hook `CV`: `ctx`

### 8.9 `glossary.js`: Từ điển thuật ngữ (147 dòng)
Rê chuột vào tiêu đề, cột bảng, ô số để xem định nghĩa, cách đọc, nhận xét, hành động (thuộc tính data-gloss, hàm glossQ).

- Hàm chính: (IIFE không có hàm cấp cao)
- Công cụ Ben: không có
- Hook `CV`: `glossQ`

### 8.10 `model.js`: Mô hình dự báo DAC (Hybrid) (126 dòng)
Mô tả mô hình và chú giải chỉ số; công cụ giai_thich_chi_so.

- Hàm chính: readiness, frameMd, entryFor, show
- Công cụ Ben: `mo_hinh_du_bao_dac`, `giai_thich_chi_so`
- Hook `CV`: `ctx`, `gloss`, `glossary`

### 8.11 `inv.js`: Tồn kho đại lý (98 dòng)
File tồn SR từng xe: độ phủ theo model, đại lý × model, tuổi tồn, MBTB, phương án xả tồn; CV.invOf(tên đại lý).

- Hàm chính: coverChart, dealerTable, matrix, ageHtml, regionBars, actions, invMd
- Công cụ Ben: `ton_kho_dai_ly`
- Hook `CV`: `ctx`, `inv`, `invOf`

### 8.12 `tx.js`: Bán hàng chi tiết từ giao dịch từng xe (143 dòng)
tx.json (2024–2026, không số khung), tồn thành phẩm nhà máy, tồn toàn hệ thống theo model.

- Hàm chính: periods, pivot, spark, renderPivot, systemStock, action, fgExtra, sysHtml, pendHtml, txMd, fgMd
- Công cụ Ben: `ban_hang_chi_tiet`, `kho_nha_may`
- Hook `CV`: `ctx`

### 8.13 `audit.js`: Hồ sơ 360° đại lý (58 dòng)
Gom mọi nguồn trên bản đồ cho một đại lý và kiểm tra khớp số liệu giữa các nguồn.

- Hàm chính: findDealer, dealer360, md360
- Công cụ Ben: `ho_so_dai_ly`
- Hook `CV`: `ctx`, `dealer360`

### 8.14 `board.js`: Phòng chiến lược HĐQT (235 dòng)
Hộp thoại boardDlg: mọi thông tin một tỉnh, xếp hạng /34, thế trận bốn loại (đánh nhanh, đánh chậm, giữ chắc, du kích). CV.boardPosture là nguồn duy nhất của thế trận (ghi đè _post, _attr, _str trong compute).

- Hàm chính: agg, carEst, ranks, posture, tactics, tile, render, open, boardMd, overviewMd
- Công cụ Ben: `phong_chien_luoc`
- Hook `CV`: `boardAgg`, `boardPosture`, `boardSrc`, `carEst`, `ctx`, `openBoard`, `postureReset`
- Giao diện: hộp thoại `boardDlg`, nút `btnBoard`

### 8.15 `warplan.js`: Binh pháp Tôn Tử · Thiên – Địa – Nhân (119 dòng)
Kế sách theo địa bàn, thống nhất dưới mục tiêu tăng giá trị thương hiệu.

- Hàm chính: data, nguSu, terrain, kePick, thienThoi, warplan, grandMd
- Công cụ Ben: `binh_phap_dia_ban`
- Hook `CV`: `ctx`, `warplan`

### 8.16 `radar.js`: DAC Economic & Commercial Radar (89 dòng)
20 chỉ số quốc gia có nguồn (radar.json: ind, extra, weights, src), điểm Radar 34 tỉnh, cảnh báo sớm; trọng số 6 nhóm.

- Hàm chính: rows, nodesByProv, build, score, alerts, render, md
- Công cụ Ben: `radar_kinh_te`
- Hook `CV`: `ctx`, `radar`, `radarRender`, `radarReset`, `radarScore`

### 8.17 `policy.js`: Chính sách hỗ trợ bán hàng 2026 (63 dòng)
Thưởng đại lý, TVBH, đối soát số bán, đánh giá hiệu quả (bonus2026.json).

- Hàm chính: evaluate, bars, render, md
- Công cụ Ben: `chinh_sach_ban_hang`
- Hook `CV`: `bonus`, `ctx`

### 8.18 `market.js`: Thị trường xe tải 2026 (129 dòng)
8 phân khúc theo tổng tải, thương hiệu, ĐK thực T10/2026 theo tỉnh, đối đầu đúng mã mẫu xe (market2026.json); CV.market.

- Hàm chính: matchCard, provBlock, render, mdMatch, mdMarket, front, mdFront
- Công cụ Ben: `thi_truong_2026`, `doi_dau_mau_xe`, `doi_thu_tai_tinh`
- Hook `CV`: `compFront`, `ctx`, `market`

### 8.19 `customers.js`: Khách hàng và chiến dịch MKT 2027 (151 dòng)
Khách tiềm năng có tọa độ (OSM), khách đã mua theo năm/tỉnh/huyện (không PII), chiến dịch MKT offline (sự kiện lưu động, hội thảo, doanh nghiệp tiềm năng), lịch chăm sóc.

- Hàm chính: campaign, render, md, render, mdMkt, dealerPlan, mdDealerPlan
- Công cụ Ben: `khach_hang`, `chien_dich_mkt`, `de_xuat_chien_dich`
- Hook `CV`: `ctx`, `custFront`, `loyalty`

### 8.20 `plan27.js`: Tài sản tồn kho, công nợ và lộ trình 2027 (161 dòng)
Vốn tại đại lý, tuổi tồn, công nợ trong hạn và quá hạn; lộ trình 5.000 xe, 7% thị phần theo ma trận Eisenhower; dealerPlan (23 đại lý, 13 điểm cấp 1 mới).

- Hàm chính: eisen, dealerTbl, debtTbl, modelTbl, marketBlk, bars, render, vsRender, jacBlk, scoreTbl, crmRender
- Công cụ Ben: `tai_san_ton_kho`, `lo_trinh_2027`, `doi_thu_4_khia_canh`, `lich_cham_soc_khach`
- Hook `CV`: `ctx`, `plan27`

### 8.21 `cashflow.js`: Dashboard dòng tiền (187 dòng)
cashDlg: 15 chỉ số CF-01..15, lịch thu – chi 13 tuần, trường tài chính nhập tay (CV.store), ngưỡng xanh/vàng/đỏ do Tài chính hiệu chỉnh.

- Hàm chính: calc, indicators, agingSvg, weekSvg, render, open, md_
- Công cụ Ben: `dong_tien`
- Hook `CV`: `cashCalc`, `cashIndicators`, `ctx`, `debt`, `debtBase`, `finFields`, `openCashflow`, `store`
- Giao diện: hộp thoại `cashDlg`, nút `btnCash`

### 8.22 `inputs.js`: Cổng nhập dữ liệu nội bộ (242 dòng)
inDlg: CSV/TSV/dán/xlsx (giải nén bằng DecompressionStream), nhận cột theo bí danh, kiểm từng dòng (chặn hoặc cảnh báo), số khung chỉ băm trong bộ nhớ, lưu tổng hợp vào localStorage dac.in.*.

- Hàm chính: dealerOf, parseCsv, readXlsx, readFile, parseDate, parseNum, mapHeader, validate, aggDebt, aggRetail, aggStock, tabsHtml, finHtml, FIELDS_HTML, fileHtml, histHtml …
- Công cụ Ben: `nhap_du_lieu`
- Hook `CV`: `openInput`, `parseTable`, `validateData`
- Giao diện: hộp thoại `inDlg`, nút `btnInput`

### 8.23 `controls.js`: Trung tâm kiểm soát dữ liệu (118 dòng)
ctrlDlg: quy tắc DC-01..DC-16, RR-01..RR-07 (ghi nhận doanh thu), nút đỏ hiển thị số lỗi.

- Hàm chính: rules, rrHtml, render, open, badge, md_
- Công cụ Ben: `kiem_soat_du_lieu`
- Hook `CV`: `ctx`, `dataControl`, `dataRules`
- Giao diện: hộp thoại `ctrlDlg`, nút `btnCtrl`

### 8.24 `battle.js`: Chiến trường 2D (195 dòng)
warDlg: bản đồ SVG 2D đối thủ, đại lý, trạm, điểm đề xuất cấp 1, khách tiềm năng, khách đã mua; nhãn đánh số nối đường; logo hãng; bấm điểm mở Google Maps; chiến lược từng mặt trận bằng quy tắc; truyền thông và nhận diện đối thủ; danh sách nguồn.

- Hàm chính: compPoints, ownPoints, stationPoints, newPoints, custPoints, buyerPoints, nearestOwn, inProv, mediaLinks, mediaPanel, srcList, draw, shortName, analyse, strategy, strat …
- Công cụ Ben: `chien_truong`
- Hook `CV`: `battleMd`, `ctx`, `openBattle`
- Giao diện: hộp thoại `warDlg`, nút `btnWar`

### 8.25 `updater.js`: Cập nhật từ mạng (10 dòng)
Nút dùng luồng tìm kiếm web của Ben (CV.askAi) với yêu cầu bắt buộc kèm nguồn và ngày.

- Hàm chính: (IIFE không có hàm cấp cao)
- Công cụ Ben: không có
- Hook `CV`: `updatePacks`
- Giao diện: nút `btnUpd`

### 8.26 `research.js`: Tìm nguồn bằng AI ngoài (91 dòng)
drDlg: lời nhắc chuẩn, mở ChatGPT, Grok, Perplexity, Claude, Copilot (URL ?q=) và Gemini, DeepSeek, Kimi, Qwen (chép lời nhắc), dán kết quả để kiểm tra dòng thiếu nguồn, sổ nguồn dac.research, xuất CSV.

- Hàm chính: prompt_, srcRows, render, check, open
- Công cụ Ben: `tim_nguon_ai`
- Hook `CV`: `openResearch`, `researchPrompt`
- Giao diện: hộp thoại `drDlg`, nút `btnDR`

### 8.27 `competitiveness.js`: Tab Năng lực cạnh tranh (282 dòng)
Tab thứ ba của bảng bên phải (tabN, paneN) và hộp thoại ncDlg gồm: 4 trụ cột sản phẩm, thị trường 8 phân khúc, đối chiếu hình Anh gửi và bản đồ, độ trễ điều hành, chấm tên khuyến mãi (ma trận 100 điểm), công cụ AI, DAC AI Growth (8 nhóm năng lực, chấm điểm LEAD, phễu 12 bước, 20 tác nhân, ba cấp quyền AI, mã nguồn mở, 15 tiêu chuẩn nghiệm thu tự đánh giá, báo cáo rà soát LEAD tuần).

- Hàm chính: segStat, groupStat, models, offer, reconcile, bottlenecks, leadScore, leads, leadHtml, weekly, growthHtml, funnelHtml, kpis, insights, paneHtml, pillarCard …
- Công cụ Ben: `nang_luc_canh_tranh`, `ra_soat_lead_tuan`
- Hook `CV`: `competitivenessMd`, `ctx`, `leadScores`, `openCompetitiveness`, `weeklyLeadReview`
- Giao diện: hộp thoại `ncDlg`

### 8.28 `layout.js`: Bố cục (79 dòng)
Chạy cuối: gom các khối dưới bản đồ thành nhóm thu gọn (radar, thị trường và đối thủ, ...), nhớ trạng thái mở trong localStorage dac.layout.*.

- Hàm chính: openG, fold
- Công cụ Ben: không có
- Hook `CV`: `openGroup`

### 8.0 Lõi `template.html`
Dữ liệu và tính toán (`load/save`, `mergeRows`, `compute`, `METRICS`), cảnh 3D (mục 5), hồ sơ tỉnh (`renderDossier`, `frontCard`, `renderMatrix`), đại lý (`renderCenters`), xếp hạng (`renderRank`), bảng dữ liệu (CSV/JSON/dán: `toCsv`, `parseCsv`, `applyText`), Ben (`askAi`, `pickTools`, `buildReport`, `instantReport`, `mdToHtml`, `dataSnapshot`, `rules`), đề xuất đại lý (`scoreSites`, `buildSites`), hạ tầng (`buildInfra`), hạng mục khách hàng (`buildCustPins`).

## 9. Trợ lý Ben: khung công cụ và danh mục công cụ

**Cơ chế.** `askAi(văn bản)`: (1) chạy các `CV.localHooks` theo thứ tự (lệnh cục bộ, không cần AI), (2) nếu môi trường có `sample` thì gửi lời nhắc hệ thống (`rules()` + `dataSnapshot()` + các `CV.ctx()` của module) cùng bộ công cụ chọn lọc theo từ khóa (`pickTools`, giới hạn theo hạn mức `toolCap`) và vòng lặp gọi công cụ; (3) nếu không có AI thì dùng báo cáo tức thì và công cụ cục bộ. Công cụ trả markdown, được hiển thị bằng `mdToHtml`. Công cụ thay đổi dữ liệu (`update_map_data`) phải báo trước và sau, có `undo_last_change` và ghi nhật ký.


**Ben offline (`ben-offline.js`, 28/11/2026).** Khi không có `sample` (mở ngoài Claude, offline hoặc online) hoặc AI bị từ chối, `askAi` gọi `CV.offlineBen(văn bản)`: (1) lệnh trợ giúp (“ben làm được gì”) liệt kê câu mẫu theo nhóm; (2) nhận ý định bằng bảng mẫu không dấu `I` (kỹ năng, regex, điểm) cộng so khớp từ khóa với mô tả kỹ năng (điểm tối đa 3, không đủ thì không đoán); (3) tách tham số: tỉnh (`findRow` thử cụm 1–4 từ, tên tỉnh cũ), đại lý (`salesKey`, tên), hãng, mẫu xe, ngày, năm sinh, tên chỉ số; nhớ tỉnh và đại lý gần nhất cho câu tiếp theo; (4) thiếu tham số bắt buộc thì hỏi lại kèm nút gợi ý; (5) gọi kỹ năng, trả markdown kèm “Kỹ năng · số ms · offline”. Không có AI nên không trả lời câu hỏi tự do: câu không nhận ra được gợi ý kỹ năng gần nhất. Khi có mạng, dưới mỗi câu trả lời có nút mở ChatGPT, Grok, Perplexity, Claude để phân tích sâu; bấm thì hỏi xác nhận vì câu trả lời có thể chứa số liệu nội bộ, rồi chép lời nhắc và mở công cụ. Kiểm thử: `tests/skills.js` (chạy cả 61 kỹ năng khi mất mạng: thời gian, lỗi, kết quả rỗng; hiện mọi kỹ năng dưới 300 ms, không yêu cầu mạng) và `tests/router.js` (57 câu hỏi mẫu, 56 đúng; câu còn lại là kỳ vọng mơ hồ).

**Quy ước công cụ:** `{name, label, description, inputSchema(JSON Schema), execute(input) → string | object}`; mô tả viết để mô hình chọn đúng; không công cụ nào được xuất dữ liệu ra ngoài.

**Danh mục 50 công cụ của các module** (cộng 11 công cụ lõi trong template.html: `get_province`, `calc`, `merge_share`, `split_province`, `get_customer_care`, `get_price`, `recommend_sites`, `focus_location`, `get_market_structure`, `focus_province`, `set_map`; tổng 61 kỹ năng):

| Công cụ | Mô tả |
|---|---|
| `update_map_data` | Sửa dữ liệu trên bản đồ theo lệnh của người dùng (chỉ khi người dùng yêu cầu sửa/cập nhật). target: tên tỉnh/thành (mới hoặc cũ) hoặc tên đại lý. field cho tỉnh: sales (b |
| `undo_last_change` | Hoàn tác thay đổi dữ liệu bản đồ gần nhất của người dùng hiện tại. |
| `ops_brief` | Bản tin điều hành hôm nay: đầu việc nguy cơ trễ, cảnh báo, cần hỗ trợ, điểm nghẽn, việc lãnh đạo cần làm. |
| `list_tasks` | Danh sách đầu việc với sức khỏe tiến độ, lý do cảnh báo, KPI, bằng chứng, xác nhận, nhật ký cập nhật gần nhất. Lọc tùy chọn theo owner, dept, status (todo/doing/review/do |
| `create_task` | Tạo một đầu việc mới (chỉ khi người dùng yêu cầu giao việc). Bắt buộc: title, owner, due (YYYY-MM-DD), kpi_name, evidence_req. Tùy chọn: dept, co_depts, kpi_target, kpi_u |
| `update_task` | Cập nhật tiến độ hằng ngày cho một đầu việc (id hoặc từ khóa tên việc): progress (%), actual (số KPI), note (đã làm gì, có số liệu), blocker (điểm nghẽn mới), need_suppor |
| `get_meeting_transcript` | Lời thoại cuộc họp đang ghi (hoặc gần nhất), để trả lời ai đã nói gì, đã chốt gì. |
| `ky_luat_hop` | Kỷ luật họp và năng lực thực thi: cuộc họp nào chưa chốt biên bản (quá 2 giờ, 24 giờ), tỷ lệ chốt trong 24 giờ, thời gian từ họp xong đến chốt, việc giao từ biên bản theo |
| `show_lens` | Ẩn hồ sơ mặc định và hiện một lớp dữ liệu nền của tỉnh trên khung Hồ sơ, tô màu bản đồ theo chỉ số của lớp. lens: kinhte, nganh, xahoi, vanhoa, chinhtri, hatang, diahinh, |
| `get_indicators` | Toàn bộ chỉ số nền của một tỉnh: kinh tế (GRDP, CPI), cơ cấu ngành, xã hội, văn hóa, hành chính, hạ tầng, địa hình–mùa vụ, thị trường, cạnh tranh, năng lực Đô Thành và ch |
| `diagnose_province` | Chẩn đoán vì sao đối thủ bán được mà Đô Thành chưa bán được tại một tỉnh: nguyên nhân cốt lõi xếp theo mức độ, bằng chứng số liệu, hành động, dữ liệu còn thiếu. |
| `am_lich` | Âm lịch, can chi ngày/tháng/năm/giờ, tiết khí và giờ hoàng đạo của một ngày (YYYY-MM-DD, để trống = hôm nay). |
| `gieo_que` | Gieo quẻ Mai Hoa Dịch số theo thời gian hiện tại hoặc theo 2 số người dùng đưa ra; trả về chủ quẻ, hỗ quẻ, biến quẻ, hào động, thể dụng và ý nghĩa kinh doanh. |
| `menh_khach` | Mệnh nạp âm, ngũ hành, màu cabin hợp/kỵ, số chủ đạo (nếu có ngày sinh) của khách hàng. birth: năm âm lịch '1985' hoặc ngày sinh dương lịch '14/02/1985'. |
| `thien_dia_nhan` | Chấm điểm Thiên thời – Địa lợi – Nhân hòa của một tỉnh từ dữ liệu bản đồ, chỉ ra trụ yếu nhất và lời khuyên kinh điển. |
| `tra_cuu_phap_luat` | Tra cứu kho văn bản pháp luật Việt Nam đã cập nhật (thuế GTGT, TNDN, TNCN, TTĐB, lệ phí trước bạ, quản lý thuế, hóa đơn, kế toán, lương tối thiểu, BHXH, dữ liệu cá nhân,  |
| `lich_tuan_thu` | Các hạn nộp thuế, BHXH, báo cáo và mốc hiệu lực pháp luật trong N ngày tới (mặc định 60). |
| `mang_luoi_doi_thu` | Mạng lưới showroom, đại lý 3S, xưởng dịch vụ, trạm bảo hành của Thaco, Teraco, JAC, Foton, TMT (điểm đã xác minh, quy mô công bố) so với 50 đại lý + 25 trạm dịch vụ Đô Th |
| `so_sanh_doi_thu` | Bảng giá, khuyến mãi tháng và so sánh đối đầu từng phiên bản đối thủ (TERACO, THACO, JAC, FOTON, TMT) hoặc toàn cảnh thị trường theo phân khúc (brand all) với xe Đô Thành |
| `du_bao_doanh_so` | Dự báo doanh số Đô Thành T11/2026 – T12/2027 từ dữ liệu ERP (bán lẻ thật T1–T10/2026, mùa vụ 2025, CSI, KH): theo tháng, đại lý, nhóm model, xác suất đạt KH 2027, tồn MIS |
| `ban_le_t11` | Bán lẻ tháng 11/2026 đến ngày mới nhất theo đại lý, model, tuần; kết quả kiểm tra từng số khung (khớp kho nhà máy, lệch model, xe điều chuyển giữa đại lý). |
| `doanh_so_chi_tiet` | Doanh số IZ – MISSU chi tiết: theo tháng 2026 (KH, bán lẻ, bán sỉ, tồn, thưởng, IZ/MISSU tháng 10), theo đại lý, theo model từng năm 2023–2026 (CSI). Lọc theo dai_ly (tên |
| `du_bao_kinh_doanh` | Dự báo số bán theo tải trọng và loại thùng, 3 bước: (1) làm sạch đường cơ sở, loại đơn fleet và đột biến; (2) tương quan chéo tìm độ trễ biến vĩ mô (ví dụ giải ngân đầu t |
| `mo_hinh_du_bao_dac` | Khung mô hình dự báo doanh số DAC (Hybrid: SARIMAX/hồi quy động có biến vĩ mô cho 1–12 tháng, VECM/dữ liệu bảng cho 1–5 năm, Croston cho model ít xe, analog/Bass cho sản  |
| `giai_thich_chi_so` | Giải thích một chỉ số trên bản đồ: định nghĩa, góc nhìn quản trị, nhận xét theo số hiện tại, hành động đề xuất. chi_so: tên chỉ số (ví dụ 'bán sỉ', 'độ phủ tồn', 'MAPE',  |
| `ton_kho_dai_ly` | Tồn kho hệ thống đại lý DAC đến 21/11/2026 (file tồn từng xe): 957 xe, khớp tồn, loại hợp đồng (mua bán/MBTB/ký gửi), tháng bán theo model và đại lý, ma trận đại lý × mod |
| `ban_hang_chi_tiet` | Số bán từng tháng T11/2024–T11/2026 theo đại lý × model × loại thùng từ file giao dịch từng xe (bán lẻ = TT 100%, bán sỉ = TT 10%, xuất kho), top model/đại lý/thùng 13 th |
| `kho_nha_may` | Kho thành phẩm DAC tại nhà máy: tồn theo model, thùng, màu, tuổi tồn (< 45, 45–90, > 90 ngày), xe đang sản xuất, linh kiện chưa nhập kho, nhập – xuất trong kỳ, xuất bán c |
| `ho_so_dai_ly` | Hồ sơ 360° một đại lý Đô Thành: kiểm tra khớp số liệu giữa các nguồn (TDBH, file giao dịch, tồn SR, dự báo), bán hàng theo tháng, tồn kho theo model và tuổi, dự báo và KH |
| `phong_chien_luoc` | Phòng chiến lược HĐQT cho một tỉnh: mọi chỉ số kinh tế – xã hội, thị trường xe (ĐK mới, UIO, đăng ký ô tô), đối thủ, Đô Thành (bán, tồn, dự báo, KH 2027) kèm xếp hạng /34 |
| `binh_phap_dia_ban` | Binh pháp Tôn Tử và Thiên – Địa – Nhân cho một địa bàn (tỉnh): Ngũ sự (Đạo, Thiên, Địa, Tướng, Pháp) chấm điểm từ số liệu, Cửu địa (thế đất), kế sách (Mưu công, Hư thực,  |
| `radar_kinh_te` | Radar kinh tế – tài chính DAC: 20 chỉ số quốc gia (GDP, GRDP, thu nhập, thất nghiệp, bán lẻ, IIP, PMI, đầu tư công, FDI, xuất nhập khẩu, cán cân thương mại, CPI, tỷ giá/l |
| `chinh_sach_ban_hang` | Chính sách hỗ trợ bán hàng 2026: thưởng đại lý, TVBH (TB 02/03/009/138), số bán T1–T10 theo điểm bán, đối soát với TDBH, ước thưởng theo bậc KH thực tế, nhận xét đánh giá |
| `thi_truong_2026` | Thị trường xe tải 2026: số 10 tháng theo phân khúc, thương hiệu, thị phần DAC theo vùng (báo cáo DAC T10/2026); tinh = đăng ký thực tháng 10/2026 của một tỉnh (thương hiệ |
| `doi_dau_mau_xe` | So sánh mẫu xe Đô Thành với đúng mã mẫu xe đối thủ cùng tải trọng: tải trọng, giá lẻ, giá xuất hóa đơn, khuyến mại, bán TB/tháng 2026, số đăng ký T10/2026. mau = mã xe (I |
| `doi_thu_tai_tinh` | Mạng lưới đại lý, showroom, trạm dịch vụ của Thaco, Teraco, JAC, TMT, Foton, Isuzu, VEAM tại một tỉnh (địa chỉ, điện thoại, link Google Maps), số đăng ký T10/2026 của từn |
| `khach_hang` | Khách tiềm năng cần chăm sóc (doanh nghiệp, ngành, SĐT công khai, link Google Maps, trạng thái gọi) và khách đã mua xe Đô Thành 2023–2026 theo năm, tỉnh, huyện, mẫu xe; đ |
| `chien_dich_mkt` | Chiến dịch marketing offline cả nước 2027: kế hoạch 34 tỉnh (buổi lưu động, hội thảo DN, khách, lái thử, xe bán, ngân sách), lịch sự kiện có định vị, doanh nghiệp tiềm nă |
| `de_xuat_chien_dich` | Kỹ năng đề xuất chiến dịch giải quyết tồn kho và chăm sóc bán hàng cho từng đại lý Đô Thành: tồn, tuổi tồn, model tồn, số xe cần xả; khách mới từ chiến dịch MKT 2027 giao |
| `tai_san_ton_kho` | Tài sản tồn kho DAC tại đại lý: giá trị, vốn DAC còn nằm tại đại lý (HĐMB trả 10%, MBTB 5%), lãi vốn, tháng bán, xe vượt chuẩn, tuổi tồn, công nợ trong hạn / quá hạn theo |
| `lo_trinh_2027` | Lộ trình đạt 5.000 xe và thị phần 7% năm 2027: kịch bản thị trường, chỉ tiêu theo phân khúc, cầu nối nguồn tăng (đại lý hiện hữu, đại lý mới, MKT, khách cũ, đội xe, sản p |
| `doi_thu_4_khia_canh` | So sánh Đô Thành với Thaco, KIA, Hyundai, Isuzu, Teraco, JAC, SRM, Suzuki, TMT, Foton về sản phẩm, dịch vụ, nhận diện thương hiệu, chính sách bán hàng; điểm 1–5; việc Đô  |
| `lich_cham_soc_khach` | Hành trình khách hàng: DN tiềm năng, khách đã mua 2023–2026 theo năm mua, khách mua lại; phễu chuyển đổi; lịch chiến dịch chăm sóc và bán hàng 12 tháng 2027; 10 đề xuất t |
| `dong_tien` | Dashboard dòng tiền DAC: dư nợ và tuổi nợ đại lý (kế toán), DSO, vốn chôn trong tồn kho, lãi vốn, lịch tiền về 13 tuần, điểm trũng tiền mặt, chỉ số cảnh báo đứt gãy (đỏ,  |
| `nhap_du_lieu` | Mở cổng nhập dữ liệu nội bộ để Phòng Tài chính, Kế toán, Kinh doanh nhập số tài chính (tiền mặt, nợ vay, phải trả, thuế…), tệp công nợ, bán lẻ từng xe, tồn đại lý; hệ thố |
| `kiem_soat_du_lieu` | Trung tâm kiểm soát dữ liệu chống sai lầm: đối soát giữa các nguồn (tồn, công nợ, UIO, đăng ký mới, bán sỉ), độ tươi dữ liệu, giả định chưa kiểm chứng, sổ lỗi; kiểm soát  |
| `chien_truong` | Chiến trường 2D: đối thủ (Thaco, Teraco, JAC, Foton, TMT, Isuzu, Veam…) quanh từng đại lý Đô Thành và từng điểm đề xuất cấp 1 mới: mật độ cạnh tranh theo bán kính 10/25/5 |
| `tim_nguon_ai` | Mở công cụ Tìm nguồn bằng AI bên ngoài (ChatGPT, Grok, Perplexity, Gemini, Claude, Copilot, DeepSeek, Kimi) với lời nhắc chuẩn bắt buộc kèm đường dẫn nguồn. chu_de: gia / |
| `nang_luc_canh_tranh` | Năng lực cạnh tranh của Đô Thành: 4 trụ cột sản phẩm (MISSU, IZ, JP, DAEWOO) chân dung khách hàng, giá, tải trọng, thị phần, đối thủ; đối chiếu số trong hình Anh cung cấp |
| `ra_soat_lead_tuan` | Báo cáo rà soát LEAD và chuyển đổi hàng tuần: tổng LEAD theo nhóm A-D (chấm điểm có bằng chứng), chưa phân công, lịch tiếp cận, kỷ luật họp, hành động tuần tới; ghi rõ số |

## 10. Kiểm soát chất lượng dữ liệu (DC, CF, RR)

Nguyên tắc “chống sai lầm” (skill `chong-sai-lam-so-lieu`): thiếu đầu vào thì dừng; sai thì chặn tại nguồn và chỉ cách sửa; đối soát hai nguồn; mọi số gắn Quan sát hoặc Giả định; không có số thì “chưa có số”. Mức: xanh, vàng, đỏ, xám (chưa có số), thang kiểm soát 1–5.

**Quy tắc dữ liệu (`controls.js`, hàm `rules`):**

- **DC-01**: Tồn đại lý khớp giữa tổng và chi tiết từng đại lý
- **DC-02**: Tổng UIO 34 tỉnh bằng tổng cả nước (Cục Đăng kiểm)
- **DC-03**: Tổng ĐK mới 34 tỉnh khớp tổng thị trường quy năm
- **DC-04**: Số xe HĐMB còn tồn so với số xe HĐMB còn nợ theo kế toán
- **DC-05**: File giao dịch ghi cọc 10% chưa thanh toán đủ so với kế toán
- **DC-06**: Đại lý báo tồn bằng số tổng, không có từng số khung
- **DC-07**: Tên đại lý giữa các nguồn khớp danh mục
- **DC-08.1**: Tồn đại lý cập nhật đủ mới
- **DC-08.2**: Kho thành phẩm cập nhật đủ mới
- **DC-08.3**: Công nợ kế toán cập nhật đủ mới
- **DC-08.4**: Giao dịch bán hàng cập nhật đủ mới
- **DC-09**: Bán sỉ theo kho nhà máy so với tổng hợp bán hàng (TDBH)
- **DC-10**: Tổng dư nợ bằng cộng từng đại lý
- **DC-11**: MBTB chưa có số tiền trong báo cáo, đang ước bằng giá bán × 95%
- **DC-12**: Chỉ số chưa có số nền
- **DC-13**: Kiểm soát ghi nhận doanh thu trên dữ liệu nhập
- **DC-14**: Mỗi thông tin giá, khuyến mãi, kênh truyền thông của hãng có liên kết nguồn bấm được
- **DC-15**: Mọi điểm có tọa độ nằm đúng tỉnh; điểm chưa định vị dùng liên kết tìm kiếm theo tên và địa chỉ
- **DC-16**: Mỗi cuộc họp có biên bản chốt trong 24 giờ, việc giao có người chịu trách nhiệm và hạn

**Chỉ số dòng tiền (`cashflow.js`, hàm `indicators`):**

- **CF-01**: Nợ quá hạn / tổng dư nợ đại lý
- **CF-02**: Nợ quá hạn trên 90 ngày
- **CF-03**: Tuổi nợ quá hạn bình quân (ước)
- **CF-04**: DSO: số ngày thu tiền bình quân của đại lý
- **CF-05**: Tồn đại lý (tháng bán lẻ)
- **CF-06**: Tồn toàn hệ thống (tháng bán lẻ)
- **CF-07**: Xe tồn đại lý trên 180 ngày
- **CF-08**: Tập trung nợ quá hạn ở 3 đại lý lớn nhất
- **CF-09**: Đại lý lớn nhất trong tổng dư nợ
- **CF-10**: Lệch giữa file giao dịch bán hàng và kế toán (xe còn nợ HĐMB)
- **CF-11**: Hệ số thanh khoản 30 ngày (tiền + hạn mức chưa rút) / nghĩa vụ 30 ngày
- **CF-12**: Điểm trũng tiền mặt trong 13 tuần (sau thu – chi dự kiến)
- **CF-13**: Hệ số thanh toán so cam kết tín dụng
- **CF-14**: Tiền khách trả trước chưa ghi nhận doanh thu
- **CF-15**: Mùa vụ thu tiền thấp điểm 2027

**Ghi nhận doanh thu (RR-01..RR-07, `controls.js` và `inputs.js`):** tiền về không bằng doanh thu; chỉ ghi nhận khi đã chuyển giao quyền kiểm soát (giao xe, có biên bản) và có hóa đơn hợp lệ. Bảy lỗi chặn: thu tiền ghi thành doanh thu; xuất hóa đơn chưa giao xe; giao xe chưa ghi nhận; thiếu giá vốn làm lãi ảo; doanh thu gồm VAT; trùng số khung; lệch kỳ. Báo cáo bốn dòng: Tiền thu, Doanh thu, Giá vốn, Lợi nhuận gộp (VAT 10% chỉ là giả định minh họa).

**Cổng nhập (`inputs.js`):** ba mẫu (công nợ, bán lẻ từng xe, tồn đại lý) + số tài chính; phân tích CSV/TSV/dán/xlsx (giải nén `deflate-raw` bằng `DecompressionStream`); khớp tiêu đề bằng bí danh đã bỏ dấu; kiểm từng dòng (lỗi chặn so với cảnh báo); số khung băm trong bộ nhớ để kiểm trùng, không lưu; chỉ lưu tổng hợp (`dac.in.*`).

## 11. Bảo mật và quyền riêng tư

- Mã hóa toàn trang (mục 3); mật khẩu không rời máy; có thể đổi định kỳ.
- Không lưu và không hiển thị: tên khách cá nhân, SĐT cá nhân, số khung, biển số, tên tư vấn bán hàng. Dữ liệu khách đã mua chỉ ở dạng đếm theo tỉnh, huyện, năm, model.
- Thu thập dữ liệu công khai: dùng API và dịch vụ cho phép (OpenStreetMap Nominatim 1 yêu cầu/giây, có bộ nhớ đệm; website chính thức); không giả trình duyệt, không vượt chặn.
- Liên kết ra ngoài đều `target="_blank" rel="noopener noreferrer"`; lời nhắc gửi sang AI bên ngoài chỉ chứa thông tin công khai, người dùng tự bấm mở và dán.
- AI không tự gửi dữ liệu, không tự gửi tin cho khách; ba cấp quyền (mục 14). Chống chèn chỉ thị (prompt injection): nội dung lấy từ web hoặc dán vào là dữ liệu, không phải lệnh; công cụ thay đổi dữ liệu cần xác nhận.
- Hạn chế hiện tại: chưa có xác thực người dùng và phân quyền theo vai trò (chỉ quyền Host khi chạy trong Claude); nhật ký thay đổi dữ liệu có (tab Nhật ký) nhưng chưa có nhật ký truy cập.

## 12. Kiểm thử

Kịch bản Playwright trong `tests/` (xem `tests/README.md`): mở bản đã khóa khi mất mạng (sai mật khẩu, đúng mật khẩu, không có yêu cầu mạng, không lỗi console, chạy thử mọi công cụ Ben), Chiến trường 2D, thư ký họp (ghi giọng giả lập), tab Năng lực cạnh tranh, chấm điểm LEAD, dòng tiền và nhập dữ liệu. Chạy trên Chromium với SwiftShader nên vẽ chậm; dùng `page.evaluate` để bấm.

Kiểm tra dữ liệu: `python3 tools_audit_gmaps.py` (liên kết Google Maps: định dạng, tọa độ trong Việt Nam, đúng tỉnh theo đa giác, trùng điểm; chưa mở thử trên Google), `tools_geocode_comp.py` (định vị bằng OSM, đối chiếu tọa độ đại lý), `tools_fix_coords.py` (sửa tỉnh sai, tọa độ lệch).

Khi dựng lại cần thêm: kiểm thử đơn vị cho `compute`, `scoreSites`, dòng tiền, chấm điểm LEAD với số liệu mẫu; kiểm thử hình ảnh (ảnh chụp) cho cảnh 3D; kiểm thử trợ năng; kiểm thử hiệu năng trên máy yếu.

## 13. Thiết kế lại bằng TypeScript / Java / CSS

**Mục tiêu:** cùng tính năng, dễ bảo trì, có thể chạy offline như hiện tại và (tùy chọn) có máy chủ để dùng chung dữ liệu.

**Đề xuất ngăn xếp (có thể thay thế):**
- **Giao diện:** TypeScript + Vite; Three.js (cùng r147 hoặc bản mới hơn sau khi kiểm tra tương thích `OrbitControls`, `Line2`); trạng thái bằng một store nhỏ (Zustand hoặc signals) thay cho `window.__CV`; khung giao diện bằng Web Components hoặc React/Svelte (tùy đội); CSS: giữ token `:root` ở mục 7, viết bằng CSS thuần + `@layer`, hoặc Tailwind với cùng token.
- **Dữ liệu:** giữ JSON làm định dạng trao đổi, thêm `interface` và kiểm lược đồ; tách `data/` (JSON), `src/domain/` (compute, scoring, cashflow, leads: hàm thuần, có kiểm thử), `src/scene/` (Three.js), `src/ui/` (tab, hộp thoại), `src/ben/` (công cụ, hook, nhắc lệnh), `src/ops/` (đầu việc, họp).
- **Máy chủ (tùy chọn, Java):** Spring Boot + PostgreSQL (+ pgvector nếu cần tìm kiếm ngữ nghĩa). API đề xuất: `GET /api/provinces`, `/api/dealers`, `/api/competitors`, `/api/market`, `/api/debt`, `/api/inventory`, `/api/leads` (+ `POST /api/leads/{id}/score`), `/api/tasks`, `/api/meetings`, `/api/audit-log`. Xác thực OIDC, phân quyền theo vai trò (mục 18 master prompt), nhật ký truy cập và thay đổi (trước/sau). Các script `tools_sync_*.py` chuyển thành tác vụ nạp dữ liệu theo lịch.
- **Offline:** có thể giữ chế độ “gói tĩnh” (build ra một thư mục, dữ liệu nhúng) cho Ban lãnh đạo và chế độ “có máy chủ” cho vận hành.

**Ánh xạ module hiện tại → gói mới**

| Hiện tại | Gói mới đề xuất |
|---|---|
| template.html (compute, METRICS) | `domain/provinceModel.ts`, `domain/metrics.ts` |
| template.html (cảnh 3D) | `scene/` (terrain, overlay, borders, layers, picking, camera) |
| template.html (hồ sơ tỉnh, đại lý, xếp hạng) | `ui/side/` (DossierTab, CentersTab, CompetitivenessTab) |
| ops.js | `ops/` (tasks, meetings, minutes, dictation adapter), `ui/ops/` |
| board, warplan, radar, policy, market, plan27, sales, tx, inv, fc, model | `features/<tên>/` mỗi gói có `data.ts`, `compute.ts`, `view.ts`, `tools.ts` |
| cashflow, inputs, controls | `features/finance/` và `features/dataQuality/` |
| battle, research, competitiveness | `features/battlefield/`, `features/research/`, `features/competitiveness/` |
| comp, legal, glossary, lyhoc, lens, hud, audit, customers | `features/<tên>/` |
| layout.js | `ui/layout/` |
| build.py, tools_lock.py | `vite build` + `scripts/lock.ts` (Web Crypto, cùng tham số PBKDF2/AES-GCM) |
| tools_sync_*.py | giữ Python hoặc chuyển sang tác vụ Java; ghi cùng lược đồ JSON |

**Thứ tự dựng lại (rủi ro thấp trước):** (1) lược đồ dữ liệu và `domain/` có kiểm thử đối chiếu số với bản hiện tại; (2) cảnh 3D chỉ có địa hình, lớp phủ, viền, chọn tỉnh; (3) bảng bên phải, hồ sơ tỉnh; (4) lớp điểm (đại lý, đối thủ, khách), Chiến trường 2D; (5) các báo cáo dưới bản đồ; (6) Ben, công cụ, hook; (7) vận hành (đầu việc, họp); (8) khóa mật khẩu và đóng gói; (9) máy chủ. Mỗi bước phải đối chiếu số liệu với bản hiện tại (cùng đầu vào, cùng đầu ra) trước khi sang bước sau.

**Những điều dễ sai khi dựng lại:** tên tỉnh sau sáp nhập và khóa `merged`; chuẩn hóa NFC tiếng Việt; làm tròn và định dạng vi-VN; thứ tự vẽ lớp phủ so với địa hình (`polygonOffset`); sprite không co theo khoảng cách (`sizeAttenuation:false`); nhãn HTML chiếu mỗi khung hình; độ cao biển nén 12%; số khung không được lưu; tọa độ cấp phường/xã là gần đúng; khi thiếu dữ liệu phải hiện “chưa có số”.

## 14. Đối chiếu với master prompt DAC AI Market & Customer Growth Intelligence

Bản đồ là một tệp độc lập, **chưa tích hợp DAC ERP** (không có mã nguồn, cơ sở dữ liệu, API của ERP trong phạm vi làm việc). Phần phân tích chạy được trên dữ liệu có sẵn đã làm; phần còn lại ghi rõ. Chi tiết nằm trong tab **Năng lực cạnh tranh → DAC AI Market & Customer Growth Intelligence**:

| Nhóm năng lực | Trạng thái | Ghi chú |
|---|---|---|
| Market Intelligence | Một phần | Thị trường, Radar, đối thủ, dự báo có; chưa thu thập tự động |
| Business Lead Generation | Một phần | 2.118 doanh nghiệp có tọa độ, chấm điểm LEAD có bằng chứng; chưa mã LEAD duy nhất, trùng lặp, hợp nhất |
| Customer Intelligence 360 | Chưa có | cần CRM; khách đã mua chỉ ở dạng tổng hợp (cố ý) |
| AI Customer Care | Một phần | Sale talk, lịch chăm sóc; chưa Zalo OA, email, đồng ý nhận tin |
| Sales Growth & Conversion | Chưa có | phễu 12 bước cần CRM |
| Dealer & Distribution Intelligence | Có | hồ sơ 360, chiến lược từng mặt trận, đề xuất mở đại lý |
| Business Performance | Một phần | chưa có lợi nhuận, CAC, ROI |
| AI Action Center | Một phần | đầu việc, biên bản, kỷ luật họp; chưa cảnh báo tự phát sinh từ mọi nguồn |

**Ba cấp quyền AI:** cấp 1 (tự thực hiện): phân tích, tổng hợp, chấm điểm, soạn nháp, cảnh báo; cấp 2 (đề xuất, người duyệt): sửa số liệu bản đồ (báo trước và sau, hoàn tác được), gửi tin, kích hoạt chiến dịch, đổi chỉ tiêu: bản đồ không tự làm; cấp 3 (chỉ người có thẩm quyền): giá, chính sách, ngân sách, công nợ, xóa dữ liệu: bản đồ không có chức năng này.

**Công nghệ mã nguồn mở đề xuất** (giấy phép ghi theo hiểu biết, **chưa kiểm tra trực tiếp trên repo**; phải xác minh giấy phép, bảo trì, lỗ hổng, hạ tầng, chi phí trước khi chọn): Ollama (MIT), LangGraph (MIT), n8n (Sustainable Use License, không phải OSI, hạn chế thương mại), PostgreSQL và pgvector (PostgreSQL License), DuckDB (MIT), Apache Superset (Apache-2.0), Metabase (AGPL-3.0), Qdrant (Apache-2.0), Playwright (Apache-2.0).

**Cần từ DAC để làm tiếp:** quyền truy cập mã nguồn và cơ sở dữ liệu ERP; dữ liệu CRM (tương tác, báo giá, khiếu nại, hài lòng); kênh Zalo OA, email được cấp quyền; ngưỡng nhóm LEAD và KPI được phê duyệt; dữ liệu chi phí chiến dịch.

## 15. Hạn chế đã biết và nợ kỹ thuật

- Một tệp lớn: `template.html` > 2.400 dòng chứa cả cảnh 3D và nghiệp vụ; module dùng biến toàn cục `window.__CV`, thiếu kiểu. Cần tách và thêm kiểu khi dựng lại.
- Không có xác thực người dùng, phân quyền vai trò, nhật ký truy cập; dữ liệu chung chỉ có khi chạy trong Claude (khả năng `db`).
- Ben AI, ghi giọng bằng Claude, biên bản bằng AI chỉ chạy trong Claude; ngoài Claude dùng quy tắc cục bộ và Web Speech của Chrome (cần Internet, âm thanh không lưu, chưa thử với micro thật).
- Dữ liệu đối thủ: tọa độ cấp phường/xã (OSM) gần đúng; 5 điểm chưa định vị; Isuzu, VEAM, Kim Long ít điểm; logo, kênh số của JAC, Isuzu, VEAM, Kim Long chưa xác nhận; khẩu hiệu chính thức hầu như chưa có.
- Thị phần JP và DAEWOO chưa tính được vì chưa có số xe bán theo hãng ở phân khúc tải trung, nặng.
- Số tài chính (tiền mặt, nợ vay, phải trả, thuế, lương), CSI, thời gian giải chi, ngày triển khai chương trình ở đại lý chưa có dữ liệu.
- Hình “Anh gửi” có số lệch bảng giá công bố; bản đồ dùng số có nguồn (xem bảng đối chiếu trong tab Năng lực cạnh tranh).
- Liên kết Google Maps đã rà tĩnh, chưa mở thử trực tiếp trên Google từ máy chủ.
- Chưa có kiểm thử bảo mật độc lập; chưa kiểm thử với micro, điện thoại thật.
