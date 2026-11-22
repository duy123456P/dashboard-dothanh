"""Đồng bộ mạng lưới đại lý đối thủ theo 34 tỉnh → compnet.json (mục "dealers"; điểm có tọa độ thêm vào "points").

    python3 tools_sync_compnet.py <thư mục html>

Thư mục chứa các trang đã tải (curl):
    daehan.html            https://daehan.vn/he-thong-dai-ly            (Teraco, trang chính thức: bản đồ nhúng → tọa độ)
    daehan_reg1..5.json    https://daehan.vn/ajax/dealer/list-agency-by-region/<1..5>
    oto_<hãng>.html        https://oto360.net/dai-ly-<hãng>  (thaco, jac, tmt, foton, isuzu, veam, kim-long)
Không lưu tên người, chỉ tên doanh nghiệp, địa chỉ, tổng đài/điện thoại công khai của đại lý.
"""
import html, json, os, re, sys, unicodedata, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
D = sys.argv[1]
P = json.load(open(os.path.join(HERE, "provinces.json"), encoding="utf-8"))
NEW = [r["name"] for r in P]
OLD = {}
for r in P:
    for o in r.get("merged", []): OLD[o] = r["name"]
OLD.update({"Bình Dương": "TP. Hồ Chí Minh", "Bà Rịa - Vũng Tàu": "TP. Hồ Chí Minh", "Bà Rịa Vũng Tàu": "TP. Hồ Chí Minh", "Vũng Tàu": "TP. Hồ Chí Minh", "Hồ Chí Minh": "TP. Hồ Chí Minh", "HCM": "TP. Hồ Chí Minh",
            "Thừa Thiên Huế": "Huế", "Thừa Thiên - Huế": "Huế", "Quãng Ngãi": "Quảng Ngãi", "Đăk Lăk": "Đắk Lắk", "Đắc Lắc": "Đắk Lắk", "Thanh Hoá": "Thanh Hóa", "Khánh Hoà": "Khánh Hòa", "Phan Thiết": "Lâm Đồng", "Quy Nhơn": "Gia Lai"})
def nfc(s): return unicodedata.normalize("NFC", s)
KEYS = sorted([(nfc(k), v) for k, v in list(OLD.items()) + [(n, n) for n in NEW] + [(n.replace("TP. ", ""), n) for n in NEW]], key=lambda x: -len(x[0]))
def prov(addr, hint=""):
    a = nfc(addr)
    # tỉnh thường ở cuối địa chỉ: tìm từ phải sang trái
    best = None
    for k, v in KEYS:
        i = a.rfind(k)
        if i >= 0 and (best is None or i > best[0]): best = (i, v)
    if best: return best[1]
    for k, v in KEYS:
        if k in nfc(hint): return v
    return None
def txt(s): return html.unescape(re.sub(r"<[^>]+>", " ", s)).strip()
def gmap(q): return "https://www.google.com/maps/search/?api=1&query=" + urllib.parse.quote(q)

dealers, points = [], []
# ---- Teraco: trang chính thức Daehan ----
main = open(os.path.join(D, "daehan.html"), encoding="utf-8").read()
emb = dict(re.findall(r'id="(map-branch-dealer-[\d-]+)"[^>]*>\s*<iframe\s+src="([^"]+)"', main, re.S))
for r in range(1, 6):
    J = json.load(open(os.path.join(D, "daehan_reg%d.json" % r), encoding="utf-8"))["data"]
    st = {k: v.strip() for k, v in re.findall(r'<option value="(\d+)">\s*([^<]+?)\s*<', "".join(J["states"]))}
    for li in J["dealers"]:
        name = txt(re.search(r"<h3[^>]*>(.*?)</h3>", li, re.S).group(1)); addr = txt(re.search(r"</h3>\s*<p>(.*?)</p>", li, re.S).group(1))
        ph = re.search(r'class="phone">([^<]*)', li); src = emb.get(re.search(r"#(map-branch-dealer-[\d-]+)", li).group(1), "")
        lat, lng = re.search(r"!3d(-?[\d.]+)", src), re.search(r"!2d(-?[\d.]+)", src); ft = re.search(r"!1s(0x[0-9a-f]+%3A0x[0-9a-f]+)", src)
        ty = (re.search(r"Đại Lý (\dS)", name, re.I) or [None, ""])[1]
        pv = prov(addr, st.get(re.search(r"data-province=(\d+)", li).group(1), ""))
        short = re.sub(r"\s+-\s+CTY.*$", "", name)
        d = {"b": "teraco", "name": short, "company": name[len(short):].strip(" -"), "addr": addr, "province": pv, "type": ty, "svc": ty == "3S", "phone": ph.group(1).strip() if ph else "",
             "src": "daehan", "map": ("https://www.google.com/maps?q=%s,%s&ftid=%s" % (lat.group(1), lng.group(1), urllib.parse.unquote(ft.group(1))) if lat and ft else
                                      "https://www.google.com/maps?q=%s,%s" % (lat.group(1), lng.group(1)) if lat else gmap(short + ", " + addr))}
        if lat: d["lat"], d["lng"] = round(float(lat.group(1)), 5), round(float(lng.group(1)), 5)
        dealers.append(d)
# ---- danh bạ oto360 ----
BR = {"thaco": "thaco", "jac": "jac", "tmt": "tmt", "foton": "foton", "isuzu": "isuzu", "veam": "veam", "kim-long": "kimlong"}
REG = {"MB": "Miền Bắc", "MT": "Miền Trung – Tây Nguyên", "MN": "Miền Nam"}
for f, b in BR.items():
    p = os.path.join(D, "oto_%s.html" % f)
    if not os.path.exists(p): continue
    t = open(p, encoding="utf-8", errors="ignore").read()
    t = t[t.find('id="dealer-list"'):]
    for reg, body in re.findall(r'<ul id="dealer-list-(\w+)">(.*?)</ul>', t, re.S):
        for li in re.findall(r"<li>(.*?)</li>", body, re.S):
            n = re.search(r"<h3>(.*?)</h3>", li, re.S); a = re.search(r'class="address">(.*?)</span>', li, re.S); ph = re.search(r'class="phone">(.*?)</span>', li, re.S)
            if not n or not a: continue
            name, addr = txt(n.group(1)), re.sub(r"\s+", " ", txt(a.group(1)))
            if b == "thaco" and re.search(r"Kia|Mazda|Peugeot|BMW|MINI|Stellantis|Jeep|RAM", name, re.I) and not re.search(r"tải|truck|bus", name, re.I): continue
            dealers.append({"b": b, "name": name, "addr": addr, "province": prov(addr), "region": REG.get(reg, reg), "type": "3S" if re.search(r"3S", name) else "",
                            "svc": None, "phone": re.sub(r"^Hotline\s*", "", txt(ph.group(1))) if ph else "", "src": "oto360_" + b, "map": gmap(name + ", " + addr)})
miss = [d for d in dealers if not d["province"]]
seen, out = set(), []
for d in dealers:
    k = (d["b"], re.sub(r"\W", "", d["addr"].lower())[:40])
    if k in seen: continue
    seen.add(k); out.append(d)
C = json.load(open(os.path.join(HERE, "compnet.json"), encoding="utf-8"))
C["dealers"] = out
for k, nm, col, tot in [("isuzu", "Isuzu", "#c0392b", "Isuzu Việt Nam: hệ thống đại lý 3S"), ("veam", "VEAM", "#7f8c8d", "VEAM Motor: đại lý ủy quyền"), ("kimlong", "Kim Long", "#b8860b", "Kim Long Motor: đại lý")]:
    C["brands"].setdefault(k, {"name": nm, "color": col, "total": tot, "totalN": None, "svc": "Đại lý 3S", "src": ["Oto360: danh sách đại lý", "https://oto360.net/dai-ly-" + ("kim-long" if k == "kimlong" else k)]})
C["dealersAsOf"] = "2026-11-22"
C["sources"].update({"daehan": ["Daehan Motors (Teraco): hệ thống đại lý chính thức", "https://daehan.vn/he-thong-dai-ly"]})
for f, b in BR.items(): C["sources"]["oto360_" + b] = ["Oto360: danh sách đại lý %s 2026" % b.upper(), "https://oto360.net/dai-ly-" + f]
# điểm Teraco có tọa độ chính thức thay cho điểm Teraco cũ (tọa độ gần đúng)
C["points"] = [p for p in C["points"] if p["b"] != "teraco"] + [{"b": "teraco", "name": d["name"], "province": d["province"], "addr": d["addr"], "type": d["type"] or "đại lý", "lat": d["lat"], "lng": d["lng"], "src": "daehan"} for d in out if d["b"] == "teraco" and "lat" in d]
C["note"] = "Teraco: trang chính thức daehan.vn (tọa độ bản đồ nhúng). JAC, Thaco (tải, bus), TMT, Foton, Isuzu, VEAM, Kim Long: danh bạ đại lý Oto360 2026 (link Google Maps tìm theo tên + địa chỉ). Điểm cũ của các hãng khác: website công ty tỉnh, báo chí."
json.dump(C, open(os.path.join(HERE, "compnet.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
from collections import Counter
print("dealers", len(out), Counter(d["b"] for d in out), "không rõ tỉnh:", [(d["b"], d["addr"]) for d in miss][:10])
print("tỉnh có đối thủ:", len({d["province"] for d in out if d["province"]}))
