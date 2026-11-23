"""Dựng bản đồ 3D thị trường xe thương mại DAC thành MỘT file HTML tự chứa (chạy offline trên Chrome).

    python3 build.py            # dựng + thu gọn JS/CSS (cần esbuild: npm i, xem package.json)
    python3 build.py --no-min   # dựng không thu gọn (gỡ lỗi)

Kết quả (không đưa lên repo, xem .gitignore):
    index.html     trang đầy đủ, mở trực tiếp bằng Chrome
    artifact.html  phần thân trang để đăng artifact
Sau đó khóa mật khẩu và đóng gói:  MAP_PASSWORD='...' python3 tools_lock.py  → ../ban-do/index.html

Kiến trúc:
    template.html        khung trang, bản đồ 3D (three.js), hồ sơ tỉnh, Ben
    ops.html / ops.css   khung các khối báo cáo; MODULES là các module JS nối theo thứ tự (mỗi module là IIFE, giao tiếp qua window.__CV)
    *.json               dữ liệu; DATA ánh xạ placeholder → file
    vendor/              three.js r147 + controls/lines (nhúng để chạy không cần mạng)
    relief.webp / height.webp  ảnh địa hình (height: R*256+G-12000 mét, nén không mất dữ liệu)
"""
import base64, json, os, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
rd = lambda f: open(os.path.join(HERE, f), encoding="utf-8").read()

MODULES = ["ops.js", "lens.js", "lyhoc.js", "legal.js", "comp.js", "hud.js", "sales.js", "fc.js", "glossary.js", "model.js", "inv.js", "tx.js",
           "audit.js", "board.js", "warplan.js", "radar.js", "policy.js", "market.js", "customers.js", "plan27.js", "layout.js"]
DATA = {  # placeholder → file JSON (nhúng dạng thẻ <script type="application/json"> hoặc hằng trong module)
    "GEO": "vn34.geojson", "DATA": "provinces.json", "NETWORK": "network.json", "PRICELIST": "pricelist.json", "PRODUCTS": "products.json",
    "INFRA": "infra.json", "SOURCES": "sources.json", "COMPNET": "compnet.json", "TX": "tx.json", "PS": "provstats.json", "FG": "factory.json",
    "INV": "inventory.json", "SALES": "sales.json", "COMP": "competitors.json", "LEGAL": "legal.json", "CUST": "customers.json", "MKT": "mkt2027.json"}
INLINE = {"radar.js": ("/*__RADAR__*/null", "radar.json"), "policy.js": ("/*__BONUS__*/null", "bonus2026.json"), "market.js": ("/*__MARKET__*/null", "market2026.json"), "plan27.js": ("/*__PLAN__*/null", "plan2027.json")}
IMAGES = {"LOGO": ("logo-dothanh.png", "image/png"), "BBHLOGO": ("logo-bbh.png", "image/png"), "RELIEF": ("relief.webp", "image/webp"), "HEIGHT": ("height.webp", "image/webp")}

FONTS = [("Be Vietnam Pro", "be-vietnam-pro", (400, 500, 600, 700)), ("Chakra Petch", "chakra-petch", (500, 600, 700))]
RANGES = {"vietnamese": "U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB",
          "latin": "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"}

def font_css():
    """Phông chữ nhúng (woff2 từ @fontsource, giấy phép OFL) để giao diện giống nhau cả khi offline."""
    out = []
    for fam, key, ws in FONTS:
        for w in ws:
            for sub, rng in RANGES.items():
                p = os.path.join(HERE, "vendor", "fonts", "%s-%s-%d-normal.woff2" % (key, sub, w))
                if os.path.exists(p):
                    out.append("@font-face{font-family:'%s';font-style:normal;font-weight:%d;font-display:swap;src:url(data:font/woff2;base64,%s) format('woff2');unicode-range:%s}" % (fam, w, base64.b64encode(open(p, "rb").read()).decode(), rng))
    return "".join(out)

def js_json(f):
    return json.dumps(json.loads(rd(f)), ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")

def esbuild():
    for p in (os.path.join(HERE, "node_modules", ".bin", "esbuild"), shutil.which("esbuild") or ""):
        if p and os.path.exists(p): return p
    return None

def minify(code, loader):
    exe = esbuild()
    if not exe or "--no-min" in sys.argv: return code
    r = subprocess.run([exe, "--minify", "--loader=" + loader, "--charset=utf8", "--log-level=error"], input=code.encode(), capture_output=True)
    if r.returncode: raise SystemExit("esbuild lỗi (%s):\n%s" % (loader, r.stderr.decode()[:2000]))
    return r.stdout.decode()

def main():
    js = []
    for m in MODULES:
        src = rd(m)
        assert "</script" not in src.lower(), m
        if m in INLINE:
            ph, f = INLINE[m]; assert ph in src, (m, ph); src = src.replace(ph, js_json(f))
        js.append(src)
    page = rd("template.html").replace("<!--__OPS_SECTION__-->", rd("ops.html")).replace("<!--__OPS_BEN__-->", rd("ops-ben.html"))
    import re
    page = re.sub(r'<link rel="preconnect"[^>]*>\s*|<link rel="stylesheet" href="https://fonts.googleapis.com[^>]*>\s*', "", page)   # không gọi Google Fonts: dùng phông nhúng
    page = page.replace("<style>", "<style>" + font_css(), 1)
    # thu gọn các khối <script>/<style> viết trực tiếp trong template TRƯỚC khi nhúng dữ liệu, ảnh, thư viện
    out, i = [], 0
    while True:
        a = page.find("<script>", i)
        if a < 0: out.append(page[i:]); break
        b = page.index("</script>", a); body = page[a + 8:b]
        out.append(page[i:a + 8]); out.append(body if body.strip().startswith("/*__") and body.strip().endswith("__*/") or "__OPS_JS__" in body else minify(body, "js")); i = b
    page = "".join(out)
    page = page.replace("/*__OPS_CSS__*/", rd("ops.css"))                       # CSS module nằm trong khối <style> chính
    a = page.find("<style>"); b = page.find("</style>", a)
    if a >= 0: page = page[:a + 7] + minify(page[a + 7:b], "css") + page[b:]
    page = page.replace("/*__OPS_JS__*/", minify("\n;\n".join(js), "js"))
    vend = rd("vendor/three-r147-bundle.min.js"); assert "</script" not in vend.lower()
    page = page.replace("/*__THREE__*/", vend)
    for k, f in DATA.items():
        ph = "/*__%s__*/" % k; assert page.count(ph) == 1, ph; page = page.replace(ph, js_json(f))
    for k, (f, mt) in IMAGES.items():
        ph = "/*__%s__*/" % k; assert page.count(ph) == 1, ph
        page = page.replace(ph, "data:%s;base64,%s" % (mt, base64.b64encode(open(os.path.join(HERE, f), "rb").read()).decode()))
    left = [p for p in ("/*__", "<!--__") if p in page and ("__*/" in page[page.find(p):page.find(p) + 40] or "__-->" in page[page.find(p):page.find(p) + 40])]
    assert not left, "còn placeholder chưa thay"
    open(os.path.join(HERE, "artifact.html"), "w", encoding="utf-8").write(page)
    full = ('<!DOCTYPE html>\n<html lang="vi">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            '<title>Bản đồ thị trường xe thương mại DAC</title>\n<style>html,body{margin:0}[hidden]{display:none!important}</style>\n</head>\n<body>\n' + page + '\n</body>\n</html>\n')
    open(os.path.join(HERE, "index.html"), "w", encoding="utf-8").write(full)
    print("OK: index.html %d KB%s" % (len(full.encode()) // 1024, "" if esbuild() and "--no-min" not in sys.argv else " (chưa thu gọn: thiếu esbuild)"))

if __name__ == "__main__":
    main()
