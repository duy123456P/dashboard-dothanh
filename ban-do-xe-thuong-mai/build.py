"""Ghép dữ liệu vào trang bản đồ.
Cách dùng: sửa provinces.json (hoặc vn34.geojson) rồi chạy:  python3 build.py
Kết quả: index.html (mở trực tiếp bằng trình duyệt) và artifact.html (bản để đăng link).
"""
import json, os
here = os.path.dirname(os.path.abspath(__file__))
rd = lambda f: open(os.path.join(here, f), encoding="utf-8").read()
geo = json.dumps(json.loads(rd("vn34.geojson")), ensure_ascii=False, separators=(",", ":"))
data = json.dumps(json.loads(rd("provinces.json")), ensure_ascii=False, separators=(",", ":"))
page = rd("template.html").replace("/*__GEO__*/", geo.replace("</", "<\\/")).replace("/*__DATA__*/", data.replace("</", "<\\/"))
open(os.path.join(here, "artifact.html"), "w", encoding="utf-8").write(page)
full = ('<!DOCTYPE html>\n<html lang="vi">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<style>html,body{margin:0}[hidden]{display:none!important}</style>\n</head>\n<body>\n' + page + '\n</body>\n</html>\n')
open(os.path.join(here, "index.html"), "w", encoding="utf-8").write(full)
print("OK: index.html, artifact.html", len(full)//1024, "KB")
