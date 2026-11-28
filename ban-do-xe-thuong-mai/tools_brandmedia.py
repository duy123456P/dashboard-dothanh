#!/usr/bin/env python3
"""Tạo brandmedia.json: logo (nhúng base64), kênh mạng xã hội, trang giá/khuyến mãi/đại lý của từng hãng.
v: web = đã thấy trong mã nguồn trang chủ chính thức ngày kiểm tra; bao = theo bài báo (chưa đối chiếu website); none = chưa có.
Logo tải từ website chính thức; hãng chưa tải được logo thì để trống, bản đồ vẽ chữ thương hiệu."""
import base64, json, os, sys, io
SP = sys.argv[1]; DAY = "2026-11-28"
def logo(fn, mime, w=None):
    p = os.path.join(SP, fn)
    if not os.path.exists(p): return None
    b = open(p, "rb").read()
    if w and mime != "image/svg+xml":
        from PIL import Image
        im = Image.open(io.BytesIO(b)).convert("RGBA"); im.thumbnail((w, w)); o = io.BytesIO(); im.save(o, "PNG", optimize=True); b = o.getvalue(); mime = "image/png"
    return "data:%s;base64,%s" % (mime, base64.b64encode(b).decode())
def L(label, url, v="web"): return {"t": label, "u": url, "v": v}
DT = "https://www.dothanhauto.com"
B = {
 "dt": {"name": "Đô Thành Auto", "site": DT, "logo": logo("dt.png", "image/png"), "logoSrc": DT + "/upload/hinhanh/logo-dothanh-ci2025final02-6863.png",
   "pos": "Nhà sản xuất lắp ráp, phân phối và bảo hành xe thương mại (mô tả trên website)", "slogan": "", "posSrc": DT,
   "links": [L("Website", DT), L("Facebook", "https://www.facebook.com/Dothanh.Auto.VN/"), L("YouTube", "https://www.youtube.com/@DothanhAutoOfficial"), L("TikTok", "https://www.tiktok.com/@xetaidothanhiz"), L("Zalo", "https://zalo.me/263582927099910617"), L("Hệ thống đại lý", DT + "/dai-ly.html"), L("Trạm dịch vụ, dịch vụ", DT + "/dich-vu.html"), L("Khuyến mãi", DT + "/tin-tuc/khuyen-mai")], "q": "Đô Thành Auto"},
 "teraco": {"name": "Teraco (Daehan Motors)", "site": "https://daehan.vn", "logo": logo("teraco.png", "image/png"), "logoSrc": "https://daehan.vn/storage/logo-icons/logo.png",
   "pos": "Doanh nghiệp sản xuất, lắp ráp, cung ứng xe thương mại, nổi bật xe tải nhẹ và xe tải van Teraco (mô tả trên website)", "slogan": "", "posSrc": "https://daehan.vn",
   "links": [L("Website", "https://daehan.vn"), L("Facebook", "https://www.facebook.com/daehanmotorsofficial"), L("YouTube", "https://www.youtube.com/channel/UC7ZbcFGoYrpSrChqLW3t0bA"), L("TikTok", "https://www.tiktok.com/@daehanmotors.official"), L("Zalo", "https://zalo.me/880872038077117057"), L("Hệ thống đại lý", "https://daehan.vn/he-thong-dai-ly")], "q": "Teraco Daehan Motors"},
 "thaco": {"name": "Thaco Truck (THACO AUTO)", "site": "https://thacoauto.vn", "logo": logo("thaco.webp", "image/webp", 360), "logoSrc": "https://thacoauto.vn/storage/logo/header-website.webp",
   "pos": "THACO AUTO: tập đoàn thuộc THACO, nhập khẩu, sản xuất lắp ráp, phân phối, bán lẻ, dịch vụ sửa chữa và phụ tùng ô tô (mô tả trên website)", "slogan": "", "posSrc": "https://thacoauto.vn",
   "links": [L("Website", "https://thacoauto.vn"), L("Facebook", "https://www.facebook.com/thacoauto"), L("YouTube", "https://www.youtube.com/thacoauto"), L("Video giới thiệu trên trang chủ", "https://www.youtube.com/watch?v=PYox6IqxXxA")], "q": "Thaco Auto xe tải"},
 "foton": {"name": "Foton Việt Nam", "site": "https://foton-dcc.vn", "logo": logo("foton.svg", "image/svg+xml"), "logoSrc": "https://foton-dcc.vn/wp-content/uploads/2025/07/foton-logo.svg",
   "pos": "Giải pháp vận tải toàn diện, không chỉ bán xe (theo báo Tiền Phong)", "slogan": "", "posSrc": "https://tienphong.vn/khong-chi-ban-xe-foton-muon-tro-thanh-doi-tac-giai-bai-toan-van-tai-cho-doanh-nghiep-viet-post1865426.tpo", "posV": "bao",
   "links": [L("Website", "https://foton-dcc.vn"), L("Hệ thống đại lý", "https://foton-dcc.vn/he-thong-dai-ly"), L("Hệ thống xưởng dịch vụ", "https://foton-dcc.vn/he-thong-xuong-dich-vu"), L("Dịch vụ sau bán hàng", "https://foton-dcc.vn/dich-vu-sau-ban-hang"), L("Dịch vụ phụ tùng", "https://foton-dcc.vn/dich-vu-phu-tung")], "q": "Foton Việt Nam xe tải"},
 "tmt": {"name": "TMT Cửu Long", "site": "https://tmtcuulong.com.vn", "logo": logo("tmt.png", "image/png", 300), "logoSrc": "https://tmtcuulong.com.vn/wp-content/uploads/2020/09/logo-tmt.png",
   "pos": "Nhà máy ô tô Cửu Long thuộc TMT, sản xuất lắp ráp và phân phối xe tải (nguồn báo); trang tmtcuulong.com.vn là trang đại lý TMT Hà Nội", "slogan": "", "posSrc": "https://vnbusiness.vn/tmt-cuu-long-doc-quyen-san-xuat-lap-rap-va-phan-phoi-xe-tai-sinotruck.html", "posV": "bao",
   "links": [L("Website đại lý TMT Hà Nội", "https://tmtcuulong.com.vn"), L("Bảng giá xe (đại lý)", "https://tmtcuulong.com.vn/bang-gia-xe/"), L("Facebook TMT Hà Nội (đại lý)", "https://www.facebook.com/tmthanoi2"), L("YouTube Xe tải Vlog (đại lý)", "https://www.youtube.com/c/XetiVlogxetaithung")], "q": "TMT Cửu Long xe tải"},
 "jac": {"name": "JAC Việt Nam", "site": "https://www.otojac.com", "logo": None, "logoSrc": "",
   "pos": "Phương châm “Chất lượng và phục vụ lên hàng đầu” (theo VTC News 2023)", "slogan": "Chất lượng và phục vụ lên hàng đầu", "sloganV": "bao", "posSrc": "https://vtcnews.vn/jac-va-cu-loi-nguoc-dong-ngoan-muc-ar741831.html", "posV": "bao",
   "links": [L("Website (theo VTC News)", "https://www.otojac.com", "bao"), L("Facebook (theo VTC News)", "https://www.facebook.com/congtycophanotojacvietnam/", "bao")], "q": "JAC Việt Nam xe tải"},
 "isuzu": {"name": "Isuzu Việt Nam", "site": "https://isuzu-vietnam.com", "logo": None, "logoSrc": "",
   "pos": "Chủ đề Vietnam Motor Show 2024: “Accelerate the Future of Transport & Life”", "slogan": "", "posSrc": "https://isuzu-vietnam.com/news/pickup-suv/news/isuzu-vietnam-participates-in-vietnam-motor-show-2024-with-the-theme-accelerate-the-future-of-transport-life/", "posV": "bao",
   "links": [L("Website", "https://isuzu-vietnam.com", "bao"), L("Facebook (theo kết quả tìm kiếm, cần đối chiếu)", "https://www.facebook.com/ISUZUVietnamCompany", "bao"), L("YouTube (theo kết quả tìm kiếm, cần đối chiếu)", "https://www.youtube.com/@ISUZUVnCo", "bao"), L("TikTok (theo kết quả tìm kiếm, cần đối chiếu)", "https://www.tiktok.com/@isuzuvietnam.official", "bao")], "q": "Isuzu Việt Nam xe tải"},
 "veam": {"name": "VEAM", "site": "", "logo": None, "logoSrc": "", "pos": "", "slogan": "", "posSrc": "", "links": [], "q": "VEAM Motor xe tải"},
 "kimlong": {"name": "Kim Long", "site": "", "logo": None, "logoSrc": "", "pos": "", "slogan": "", "posSrc": "", "links": [], "q": "Kim Long Motor xe tải"},
}
json.dump({"checked": DAY, "note": "Logo tải từ website chính thức. v=web: thấy trong mã nguồn trang chủ chính thức ngày kiểm tra; v=bao: theo bài báo hoặc kết quả tìm kiếm, chưa đối chiếu website; hãng không có mục: chưa có dữ liệu. Video quảng cáo: chỉ ghi video đã thấy trên trang chủ; còn lại là liên kết tìm kiếm trên từng nền tảng.", "brands": B}, open("brandmedia.json", "w"), ensure_ascii=False, separators=(",", ":"))
print("brandmedia.json", os.path.getsize("brandmedia.json") // 1024, "KB")
