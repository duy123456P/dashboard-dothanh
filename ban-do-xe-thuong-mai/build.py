"""Ghép dữ liệu vào trang bản đồ.
Cách dùng: sửa provinces.json (hoặc vn34.geojson) rồi chạy:  python3 build.py
Kết quả: index.html (mở trực tiếp bằng trình duyệt) và artifact.html (bản để đăng link).
"""
import json, os, base64
here = os.path.dirname(os.path.abspath(__file__))
rd = lambda f: open(os.path.join(here, f), encoding="utf-8").read()
geo = json.dumps(json.loads(rd("vn34.geojson")), ensure_ascii=False, separators=(",", ":"))
data = json.dumps(json.loads(rd("provinces.json")), ensure_ascii=False, separators=(",", ":"))
centers = json.dumps(json.loads(rd("centers.json")), ensure_ascii=False, separators=(",", ":"))
page = rd("template.html").replace("/*__GEO__*/", geo.replace("</", "<\\/")).replace("/*__DATA__*/", data.replace("</", "<\\/")).replace("/*__CENTERS__*/", centers.replace("</", "<\\/")).replace("/*__NETWORK__*/", json.dumps(json.loads(rd("network.json")), ensure_ascii=False).replace("</", "<\\/")).replace("/*__PRICELIST__*/", json.dumps(json.loads(rd("pricelist.json")), ensure_ascii=False).replace("</", "<\\/")).replace("/*__PRODUCTS__*/", json.dumps(json.loads(rd("products.json")), ensure_ascii=False).replace("</", "<\\/")).replace("/*__INFRA__*/", json.dumps(json.loads(rd("infra.json")), ensure_ascii=False).replace("</", "<\\/")).replace("/*__SOURCES__*/", json.dumps(json.loads(rd("sources.json")), ensure_ascii=False).replace("</", "<\\/"))
assert "</script" not in (rd("ops.js") + rd("lens.js")).lower()
page = page.replace("<!--__OPS_SECTION__-->", rd("ops.html")).replace("<!--__OPS_BEN__-->", rd("ops-ben.html")).replace("/*__OPS_CSS__*/", rd("ops.css")).replace("/*__OPS_JS__*/", rd("ops.js") + "\n" + rd("lens.js"))
b64 = lambda f, mt: "data:%s;base64,%s" % (mt, base64.b64encode(open(os.path.join(here, f), "rb").read()).decode())
page = page.replace("/*__LOGO__*/", b64("logo-dothanh.png", "image/png")).replace("/*__RELIEF__*/", b64("relief.jpg", "image/jpeg")).replace("/*__HEIGHT__*/", b64("height.png", "image/png"))
open(os.path.join(here, "artifact.html"), "w", encoding="utf-8").write(page)
full = ('<!DOCTYPE html>\n<html lang="vi">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<style>html,body{margin:0}[hidden]{display:none!important}</style>\n</head>\n<body>\n' + page + '\n</body>\n</html>\n')
open(os.path.join(here, "index.html"), "w", encoding="utf-8").write(full)
print("OK: index.html, artifact.html", len(full)//1024, "KB")
