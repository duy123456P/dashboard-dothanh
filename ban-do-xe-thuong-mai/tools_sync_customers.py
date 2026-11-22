"""Khách hàng → customers.json (KHÔNG đưa tên người, số điện thoại cá nhân, số khung, biển số lên bản đồ).

    python3 tools_sync_customers.py <KU_SALES.xlsx> <osm_coords.json> <geo_cache.json> <DATA_TVBH_2023.xlsx> ... <DATA_TVBH_2026.xlsx>

1. Khách tiềm năng (doanh nghiệp, nguồn OpenStreetMap qua Ku_Sales): tên doanh nghiệp, ngành, số điện thoại/website công khai,
   tọa độ (osm_coords.json: {"node/123": [lat, lng]} lấy từ api.openstreetmap.org), trạng thái gọi.
2. Khách đã mua 2023–2026 (file thưởng TVBH): chỉ đếm số xe theo năm × tỉnh (34 tỉnh mới) × quận/huyện × mẫu xe × loại khách × ngành.
   Mỗi số khung chỉ tính một lần (lần ra cà vẹt/hóa đơn sau cùng). geo_cache.json: tọa độ trung tâm quận/huyện (Nominatim), tự bổ sung khi thiếu.
"""
import datetime, json, os, re, sys, time, unicodedata, urllib.parse, urllib.request
import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
KU, OSM, GEO, FILES = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:]
P = json.load(open(os.path.join(HERE, "provinces.json"), encoding="utf-8"))
NEW = [r["name"] for r in P]
nfc = lambda s: unicodedata.normalize("NFC", str(s or "")).strip()
def fold(s): return re.sub(r"\s+", " ", "".join(c for c in unicodedata.normalize("NFD", nfc(s).lower().replace("đ", "d")) if unicodedata.category(c) != "Mn")).strip()
OLD = {}
for r in P:
    for o in r.get("merged", []): OLD[fold(o)] = r["name"]
    OLD[fold(r["name"])] = r["name"]; OLD[fold(r["name"].replace("TP. ", ""))] = r["name"]
OLD.update({fold(k): v for k, v in {"Hồ Chí Minh": "TP. Hồ Chí Minh", "HCM": "TP. Hồ Chí Minh", "TPHCM": "TP. Hồ Chí Minh", "Sài Gòn": "TP. Hồ Chí Minh", "Bình Dương": "TP. Hồ Chí Minh",
    "Bà Rịa Vũng Tàu": "TP. Hồ Chí Minh", "Bà Rịa - Vũng Tàu": "TP. Hồ Chí Minh", "BR-VT": "TP. Hồ Chí Minh", "Vũng Tàu": "TP. Hồ Chí Minh", "Thừa Thiên Huế": "Huế", "Thừa Thiên - Huế": "Huế", "TT Huế": "Huế",
    "Đăk Lăk": "Đắk Lắk", "Daklak": "Đắk Lắk", "Đắc Lắc": "Đắk Lắk", "Đăk Nông": "Lâm Đồng", "Đắk Nông": "Lâm Đồng", "Kontum": "Quảng Ngãi", "Hà Tây": "Hà Nội", "Sài Gòn": "TP. Hồ Chí Minh"}.items()})
KEYS = sorted(OLD.items(), key=lambda x: -len(x[0]))
# viết tắt tỉnh hay gặp ở cuối địa chỉ (file 2023)
ABBR = {"hcm": "TP. Hồ Chí Minh", "tphcm": "TP. Hồ Chí Minh", "tp hcm": "TP. Hồ Chí Minh", "bd": "TP. Hồ Chí Minh", "brvt": "TP. Hồ Chí Minh", "br-vt": "TP. Hồ Chí Minh", "ht": "Hà Tĩnh", "st": "Cần Thơ",
        "hg": "Cần Thơ", "ct": "Cần Thơ", "la": "Tây Ninh", "tn": "Tây Ninh", "tg": "Đồng Tháp", "dt": "Đồng Tháp", "bt": "Vĩnh Long", "tv": "Vĩnh Long", "vl": "Vĩnh Long", "ag": "An Giang", "kg": "An Giang",
        "cm": "Cà Mau", "bl": "Cà Mau", "bp": "Đồng Nai", "dn": "Đồng Nai", "dnai": "Đồng Nai", "dl": "Đắk Lắk", "dak lak": "Đắk Lắk", "dnong": "Lâm Đồng", "dak nong": "Lâm Đồng", "ld": "Lâm Đồng", "gl": "Gia Lai",
        "kt": "Quảng Ngãi", "qng": "Quảng Ngãi", "qnam": "Đà Nẵng", "kh": "Khánh Hòa", "na": "Nghệ An", "th": "Thanh Hóa", "hn": "Hà Nội", "hp": "Hải Phòng", "qninh": "Quảng Ninh", "btn": "Lâm Đồng", "nt": "Khánh Hòa", "py": "Đắk Lắk"}
PLATE = {}
for codes, p in [((11,), "Cao Bằng"), ((12,), "Lạng Sơn"), ((14,), "Quảng Ninh"), ((15, 16, 34), "Hải Phòng"), ((17, 89), "Hưng Yên"), ((18, 35, 90), "Ninh Bình"), ((19, 28, 88), "Phú Thọ"), ((20, 97), "Thái Nguyên"),
                 ((21, 24), "Lào Cai"), ((22, 23), "Tuyên Quang"), ((25,), "Lai Châu"), ((26,), "Sơn La"), ((27,), "Điện Biên"), ((29, 30, 31, 32, 33, 40), "Hà Nội"), ((36,), "Thanh Hóa"), ((37,), "Nghệ An"), ((38,), "Hà Tĩnh"),
                 ((43, 92), "Đà Nẵng"), ((47, 78), "Đắk Lắk"), ((48, 49, 86), "Lâm Đồng"), (tuple(range(50, 60)) + (61, 72), "TP. Hồ Chí Minh"), ((60, 93), "Đồng Nai"), ((62, 70), "Tây Ninh"), ((63, 66), "Đồng Tháp"),
                 ((64, 71, 84), "Vĩnh Long"), ((65, 83, 95), "Cần Thơ"), ((67, 68), "An Giang"), ((69, 94), "Cà Mau"), ((73, 74), "Quảng Trị"), ((75,), "Huế"), ((76, 82), "Quảng Ngãi"), ((77, 81), "Gia Lai"), ((79, 85), "Khánh Hòa"), ((98, 99), "Bắc Ninh")]:
    for c in codes: PLATE[c] = p
def prov_plate(pl):
    m = re.match(r"\s*(\d{2})\s*[A-ZĐ]", nfc(pl).upper())
    return PLATE.get(int(m.group(1))) if m else None
def prov_abbr(text):
    parts = [fold(p) for p in re.split(r"[,.\-–]", str(text or "")) if p.strip()]
    if not parts: return None
    last = parts[-1].strip()
    if last in ABBR: return ABBR[last]
    if re.fullmatch(r"q\s?\d{1,2}|quan \d{1,2}|go vap|binh tan|tan phu|thu duc|binh chanh|hoc mon|cu chi|nha be|tan binh|binh thanh|phu nhuan", last): return "TP. Hồ Chí Minh"
    return None
def prov_of(text):
    t = fold(text); best = None
    for k, v in KEYS:
        i = t.rfind(k)
        if i >= 0 and (best is None or i > best[0] or (i == best[0] and len(k) > best[2])): best = (i, v, len(k))
    return best[1] if best else None

# ---------- ranh giới 34 tỉnh (gán tỉnh theo tọa độ) ----------
G = json.load(open(os.path.join(HERE, "vn34.geojson"), encoding="utf-8"))
def polys(g): return [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
SHAPES = [(f["properties"].get("name") or f["properties"].get("ten_tinh"), polys(f["geometry"])) for f in G["features"]]
def inside(x, y, ring):
    c = False; j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i][:2]; xj, yj = ring[j][:2]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi: c = not c
        j = i
    return c
def prov_at(lat, lng):
    for n, ps in SHAPES:
        for p in ps:
            if inside(lng, lat, p[0]) and not any(inside(lng, lat, h) for h in p[1:]): return n
    return None

# ---------- 1. khách tiềm năng ----------
co = json.load(open(OSM, encoding="utf-8"))
ws = openpyxl.load_workbook(KU)["Danh sách khách"]
hdr = [nfc(c.value) for c in next(ws.iter_rows(min_row=4, max_row=4))]
ix = {h: i for i, h in enumerate(hdr)}
pros = []
for r in ws.iter_rows(min_row=5):
    v = lambda h: r[ix[h]].value if h in ix else None
    name = nfc(v("Tên doanh nghiệp"))
    if not name: continue
    link = r[ix["Bản đồ"]].hyperlink.target if r[ix["Bản đồ"]].hyperlink else ""
    m = re.search(r"openstreetmap\.org/(node|way|relation)/(\d+)", link); k = m.group(1) + "/" + m.group(2) if m else ""
    if k not in co: continue
    lat, lng = co[k]
    name = re.sub(r"^https?://(www\.)?", "", name).rstrip("/")
    pros.append({"name": name, "ind": nfc(v("Ngành")), "area": nfc(v("Khu vực")), "region": nfc(v("Miền")), "phone": nfc(v("Số điện thoại")), "web": nfc(v("Website")),
                 "lat": round(lat, 5), "lng": round(lng, 5), "osm": link, "status": nfc(v("Kết quả")) or "Chưa gọi", "found": str(v("Ngày tìm thấy") or "")[:10],
                 "province": prov_of(v("Khu vực")) or prov_at(lat, lng)})   # ranh giới hiển thị đã giản lược: ưu tiên tên khu vực

# ---------- 2. khách đã mua ----------
def find_hdr(ws):
    for i, r in enumerate(ws.iter_rows(max_row=12, values_only=True)):
        u = [nfc(c).upper() for c in r]
        if any(c in ("STT", "SK\n (FULL)", "SK (FULL)") or c.startswith("SK") for c in u) and any("TỈNH" in c or "D/C KH" in c for c in u): return i, u
    return None, None
def col(u, *names):
    for n in names:
        for i, c in enumerate(u):
            if c.replace("\n", " ").startswith(n): return i
    return None
def as_date(x):
    if isinstance(x, datetime.datetime): return x.date()
    if isinstance(x, datetime.date): return x
    m = re.match(r"(\d{1,2})/(\d{1,2})/(\d{4})", str(x or ""))
    return datetime.date(int(m.group(3)), int(m.group(2)), int(m.group(1))) if m else None
def model_of(s):
    s = nfc(s).upper().replace(" ", "")
    s = re.sub(r"-20\d\d$", "", s)
    return s or "?"
def is_org(name, typ):
    t = fold(typ)
    if t: return "doanh nghiep" in t or "cong ty" in t or "to chuc" in t
    return bool(re.search(r"\b(cty|cong ty|dntn|htx|hop tac xa|tnhh|co phan|chi nhanh|doanh nghiep)\b", fold(name)))
recs = {}
for f in FILES:
    yfile = int(re.search(r"(20\d\d)", os.path.basename(f)).group(1))
    wb = openpyxl.load_workbook(f, read_only=True, data_only=True)
    for ws in wb.worksheets:
        h, u = find_hdr(ws)
        if h is None: continue
        c = {k: col(u, *n) for k, n in {"vin": ("SK (FULL)", "SỐ KHUNG", "SK"), "model": ("LOẠI XE",), "dl": ("ĐẠI LÝ",), "name": ("TÊN KHÁCH", "TÊN KH"), "ward": ("PHƯỜNG",), "dist": ("QUẬN",),
              "prov": ("TỈNH",), "addr": ("D/C KH",), "plate": ("BIỂN SỐ",), "date": ("NGÀY CAVET", "NGÀY HÓA ĐƠN", "NGÀY HĐ", "NGÀY BÁN"), "type": ("LOẠI KHÁCH", "LOẠI KH"), "ind": ("NGÀNH NGHỀ",)}.items()}
        for r in ws.iter_rows(min_row=h + 2, values_only=True):
            g = lambda k: r[c[k]] if c[k] is not None and c[k] < len(r) else None
            vin = re.sub(r"[^A-Z0-9]", "", nfc(g("vin")).upper())
            if len(vin) < 2 or not nfc(g("model")): continue
            d = as_date(g("date")); y = d.year if d and 2023 <= d.year <= 2026 else yfile
            loc = " ".join(nfc(g(k)) for k in ("ward", "dist", "prov", "addr") if g(k))
            pv = prov_of(nfc(g("prov")) or loc) or prov_of(loc) or prov_abbr(g("addr") or g("prov")) or prov_plate(g("plate"))
            dist = nfc(g("dist")) or ""
            if not dist and g("addr"):
                parts = [p.strip() for p in re.split(r"[,\-–]", nfc(g("addr"))) if p.strip()]
                dist = parts[-2] if len(parts) >= 2 else ""
            dist = re.sub(r"^(?:(?:quận|huyện|thị xã|thành phố)\s+|(?:tp|tx|q|h)\.\s*|(?:tp|tx)\s+)", "", dist, flags=re.I).strip().title()
            rec = {"y": y, "d": d.isoformat() if d else "", "prov": pv, "provOld": nfc(g("prov")).title(), "dist": dist, "model": model_of(g("model")), "org": is_org(g("name"), g("type")), "ind": nfc(g("ind")), "src": yfile}
            k = vin[-8:] if len(vin) >= 10 else "%d:%s:%s:%s" % (yfile, rec["model"], fold(g("dl")), vin)   # file 2023 chỉ ghi số khung rút gọn
            if k not in recs or rec["d"] >= recs[k]["d"]: recs[k] = rec
R = list(recs.values())
# tọa độ trung tâm quận/huyện (Nominatim, 1 yêu cầu/giây, có bộ nhớ đệm)
cache = json.load(open(GEO, encoding="utf-8")) if os.path.exists(GEO) else {}
def geo(dist, provOld, prov):
    k = fold(dist) + "|" + fold(provOld or prov)
    if k in cache: return cache[k]
    q = f"{dist}, {provOld or prov}, Việt Nam"
    try:
        u = "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=vn&q=" + urllib.parse.quote(q)
        j = json.load(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "dac-market-map/1.0 (internal tool)"}), timeout=30)); time.sleep(1.1)
        cache[k] = [round(float(j[0]["lat"]), 4), round(float(j[0]["lon"]), 4)] if j else None
        if len(cache) % 20 == 0: json.dump(cache, open(GEO, "w", encoding="utf-8"), ensure_ascii=False)   # lưu dần
    except Exception as e:
        print("geo lỗi", q, e); cache[k] = None
    return cache[k]
D = {}
for x in R:
    if not x["prov"]: continue
    k = (x["prov"], fold(x["dist"]))
    a = D.setdefault(k, {"province": x["prov"], "dist": x["dist"] or "(không ghi huyện)", "provOld": x["provOld"], "n": 0, "years": {}, "models": {}, "org": 0})
    a["n"] += 1; a["years"][str(x["y"])] = a["years"].get(str(x["y"]), 0) + 1; a["models"][x["model"]] = a["models"].get(x["model"], 0) + 1; a["org"] += x["org"]
dists = []
for (pv, _), a in sorted(D.items(), key=lambda z: -z[1]["n"]):
    dist, po = (a["dist"] if a["dist"] != "(không ghi huyện)" else ""), a["provOld"]
    c = geo(dist, po, pv) if dist and a["n"] >= 2 else None   # huyện chỉ 1 xe: tính vào tỉnh, không tra tọa độ
    if c and prov_at(c[0], c[1]) not in (pv, None): c = None   # tọa độ lệch tỉnh: bỏ
    if c: a["lat"], a["lng"] = c
    a["models"] = dict(sorted(a["models"].items(), key=lambda z: -z[1])[:6])
    if a["n"] >= 2: dists.append(a)   # huyện 1 xe chỉ tính trong tổng tỉnh (gọn dữ liệu)
json.dump(cache, open(GEO, "w", encoding="utf-8"), ensure_ascii=False)
byProv = {}
for x in R:
    if not x["prov"]: continue
    b = byProv.setdefault(x["prov"], {"n": 0, "years": {}, "models": {}, "org": 0, "ind": {}})
    b["n"] += 1; b["years"][str(x["y"])] = b["years"].get(str(x["y"]), 0) + 1; b["models"][x["model"]] = b["models"].get(x["model"], 0) + 1; b["org"] += x["org"]
    if x["ind"]: b["ind"][x["ind"]] = b["ind"].get(x["ind"], 0) + 1
for b in byProv.values(): b["models"] = dict(sorted(b["models"].items(), key=lambda z: -z[1])[:10]); b["ind"] = dict(sorted(b["ind"].items(), key=lambda z: -z[1])[:6])
years = {}
for x in R: years[str(x["y"])] = years.get(str(x["y"]), 0) + 1
out = {"asOf": datetime.date.today().isoformat(), "note": "Không lưu tên khách cá nhân, số điện thoại cá nhân, số khung, biển số. Khách tiềm năng là doanh nghiệp có thông tin công khai trên OpenStreetMap.",
       "sources": {"ku": "DANH_SACH_KHACH_KU_SALES (OpenStreetMap qua Ku_Sales)", "tvbh": "DATA_TVBH 2023–2026 (file thưởng TVBH, mỗi số khung tính một lần)"},
       "prospects": pros, "buyers": {"total": len(R), "years": dict(sorted(years.items())), "noProv": sum(1 for x in R if not x["prov"]), "byProv": byProv, "districts": dists}}
json.dump(out, open(os.path.join(HERE, "customers.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("tiềm năng", len(pros), "không rõ tỉnh", sum(1 for p in pros if not p["province"]), "| đã mua", len(R), years, "không rõ tỉnh", out["buyers"]["noProv"], "| huyện", len(dists), "có tọa độ", sum(1 for d in dists if "lat" in d))
