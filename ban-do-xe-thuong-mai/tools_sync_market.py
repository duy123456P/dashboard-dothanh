"""Đồng bộ thị trường xe tải 2026 → market2026.json, cập nhật provinces.json.

    python3 tools_sync_market.py <DKM_10.2026.xlsx> <BCNB_IZ_Market.pptx> <BCNB_KAMA_Market.pptx>

Nguồn:
- DKM (đăng ký mới xe tải từng xe, tháng 10/2026): tỉnh, hãng, số loại, loại thùng → số thật theo tỉnh, hãng, phân khúc, mẫu xe.
- Báo cáo nội bộ IZ / KAMA tháng 10/2026: thị trường 8 phân khúc (2024, 2025, 10T/2025, 10T/2026, T10), theo tháng 2026,
  thị phần DAC theo miền, bảng hãng theo phân khúc, bảng đối đầu từng mẫu xe (tải trọng, giá, giá XHĐ, CTKM, sản lượng BQ 2026).
Không lưu tên chủ xe (file DKM không có), chỉ đếm.
"""
import collections, html, json, re, sys, unicodedata, zipfile
import openpyxl

DKM, IZ, KAMA = sys.argv[1:4]
N = lambda s: unicodedata.normalize("NFC", str(s or "")).replace("\t", " ").strip()
U = lambda s: re.sub(r"\s+", " ", N(s).upper())
PROV = {"TP.HCM": "TP. Hồ Chí Minh", "Thừa Thiên - Huế": "Huế"}

# ---------------- phân khúc theo hãng + số loại + loại thùng (đối chiếu định nghĩa trong báo cáo IZ/KAMA) ----------------
SEG = ["Van", "Small Trucks I", "Small Trucks II", "Light Trucks I", "Light Trucks II", "Medium Trucks I", "Medium Trucks II", "Heavy Trucks"]
RULES = [  # (hãng regex, số loại regex, phân khúc)
    ("VINFAST", r"EC VAN", "Van điện"),
    ("DOTHANH", r"V56|V65", "Van"), ("DOTHANH", r"T26|T33", "Small Trucks I"), ("DOTHANH", r"IZ4[59]S|IZ50|IZ60SL", "Small Trucks II"),
    ("DOTHANH", r"IZ62M|IZ65|IZ71SL", "Light Trucks I"), ("DOTHANH", r"JP120", "Light Trucks II"),
    ("TERACO", r"TERA-?V|TERA V", "Van"), ("TERACO", r"STAR|100S|150S", "Small Trucks I"), ("TERACO", r"190SL|245SL", "Small Trucks II"), ("TERACO", r"345SL|350", "Light Trucks I"),
    ("SRM", r"X30|M80|S6|S1|E60|E80", "Van"), ("SRM", r".", "Small Trucks I"),
    ("SUZUKI", r"EECO", "Van"), ("SUZUKI", r"CARRY", "Small Trucks I"),
    ("THACO", r"AUMAN|FUSO|FV|FJ|FI", "Heavy Trucks"), ("THACO", r"OLLIN|LINKER S T12|T3160|T7|T8", "Light Trucks II"), ("THACO", r"LINKER", "Small Trucks II"), ("THACO", r"TF2800|FRONTIER", "Small Trucks II"), ("THACO", r"TOWNER", "Small Trucks I"),
    ("KIA", r"K200|K250|K165|DTM", "Small Trucks II"),
    ("HYUNDAI", r"H150|PORTER", "Small Trucks II"), ("HYUNDAI", r"N250", "Small Trucks II"), ("HYUNDAI", r"N500|N550|N650|W750", "Light Trucks I"), ("HYUNDAI", r"W11|EX", "Light Trucks II"), ("HYUNDAI", r"HD", "Heavy Trucks"),
    ("ISUZU", r"QKR|QMR|QLR", "Small Trucks II"), ("ISUZU", r"NPR|NMR", "Light Trucks I"), ("ISUZU", r"NQR|FRR", "Light Trucks II"), ("ISUZU", r"FSR|FVR|FVM|FVZ|EXZ|GIGA", "Medium Trucks I"),
    ("HINO", r"XZU65|XZU71", "Small Trucks II"), ("HINO", r"XZU72|XZU73", "Light Trucks I"), ("HINO", r"FC|FG", "Medium Trucks I"), ("HINO", r"FL|FM", "Medium Trucks II"),
    ("JAC", r"^H200|^H250|N200|N250", "Small Trucks II"), ("JAC", r"H360|N350", "Light Trucks I"), ("JAC", r"N500|N650|N750|N800", "Light Trucks II"), ("JAC", r"N900|DAWOS", "Medium Trucks I"),
    ("TMT", r"T200|E250|KARRY", "Small Trucks II"), ("TMT", r"E350|C ?750", "Light Trucks I"), ("TMT", r"FL|ST", "Heavy Trucks"),
    ("FOTON", r"WONDER|T25", "Small Trucks I"), ("FOTON", r"AUMARK X", "Small Trucks II"), ("FOTON", r"AUMARK C20[0-6]", "Light Trucks I"), ("FOTON", r"AUMARK", "Light Trucks II"), ("FOTON", r".", "Heavy Trucks"),
    ("VEAM", r"S80|V2|V3", "Small Trucks II"), ("VEAM", r"C35", "Light Trucks I"),
    ("KIM LONG", r".", "Small Trucks I"), ("DONGVANG", r"NS350", "Light Trucks I"), ("DONGVANG", r".", "Light Trucks II"), ("CHIENTHANG", r"CT[67]\.|CT8", "Light Trucks II"),
    ("CHENGLONG", r"LZ112|LZ113", "Light Trucks II"), ("MITSUBISHI FUSO", r"CANTER", "Light Trucks I"),
]
HEAVY_BRANDS = {"CNHTC", "SHACMAN", "SANY", "HOWO", "FAW", "CHENGLONG", "DONGFENG", "UD TRUCKS", "WAW", "FORLAND", "HOA MAI", "TQ", "CHIENTHANG", "MITSUBISHI FUSO", "DAEWOO", "SCANIA", "VOLVO", "MAN", "MERCEDES-BENZ"}
def segment(brand, model, body):
    b, m, t = U(brand), U(model), U(body)
    if "ĐẦU KÉO" in t: return "Trung & nặng"
    if "VAN" in t and b not in ("VINFAST", "DOTHANH"): return "Van"
    for rb, rm, s in RULES:
        if s in ("Medium Trucks I", "Medium Trucks II", "Heavy Trucks"): s = "Trung & nặng"
        if b == rb and re.search(rm, m): return s
    if "VAN" in t: return "Van"
    if b in HEAVY_BRANDS or re.search(r"TỰ ĐỔ|BÊ TÔNG|XI TÉC|XITÉC", t): return "Trung & nặng"
    return "Khác"

# ---------------- DKM: đăng ký mới T10/2026 ----------------
wb = openpyxl.load_workbook(DKM, read_only=True, data_only=True)
rows = [r for i, r in enumerate(wb["XETAI"].iter_rows(values_only=True)) if i > 0 and r[1]]
recs = []
for r in rows:
    prov = PROV.get(N(r[1]), N(r[1])); brand = U(r[3]); model = U(r[4]); body = N(r[2])
    recs.append({"p": prov, "b": brand, "m": model, "t": body, "s": segment(brand, model, body), "org": "tổ chức" if "Tổ chức" in N(r[5]) else "cá nhân" if "Cá nhân" in N(r[5]) else "nhà nước"})
C = collections.Counter
by_prov = {}
for p in sorted(set(x["p"] for x in recs)):
    xs = [x for x in recs if x["p"] == p]
    by_prov[p] = {"total": len(xs), "dt": sum(1 for x in xs if x["b"] == "DOTHANH"), "brands": dict(C(x["b"] for x in xs).most_common()),
                  "seg": dict(C(x["s"] for x in xs)), "segDt": dict(C(x["s"] for x in xs if x["b"] == "DOTHANH")),
                  "body": dict(C(x["t"] for x in xs).most_common(8)), "org": dict(C(x["org"] for x in xs))}
def dtmodel(m):
    m = m.replace(" - ", "-").split("/")[0].replace("MISSU ", "").replace("IZ JP", "JP").strip()
    return m
dkm = {"month": "2026-10", "total": len(recs), "byProv": by_prov, "brands": dict(C(x["b"] for x in recs).most_common()),
       "seg": dict(C(x["s"] for x in recs)), "dtModels": dict(C(dtmodel(x["m"]) for x in recs if x["b"] == "DOTHANH").most_common()),
       "segBrands": {s: dict(C(x["b"] for x in recs if x["s"] == s).most_common(12)) for s in ["Van", "Van điện", "Small Trucks I", "Small Trucks II", "Light Trucks I", "Light Trucks II", "Trung & nặng"]}}

# ---------------- pptx: bảng ----------------
def tables(f):
    z = zipfile.ZipFile(f); out = {}
    for n in z.namelist():
        mm = re.match(r"ppt/slides/slide(\d+)\.xml$", n)
        if not mm: continue
        x = z.read(n).decode("utf8"); tbs = []
        for tb in re.findall(r"<a:tbl>.*?</a:tbl>", x, re.S):
            tbs.append([[re.sub(r"\s+", " ", "".join(html.unescape(t) for t in re.findall(r"<a:t>([^<]*)</a:t>", tc))).strip() for tc in re.findall(r"<a:tc\b.*?</a:tc>", tr, re.S)] for tr in re.findall(r"<a:tr\b.*?</a:tr>", tb, re.S)])
        out[int(mm.group(1))] = tbs
    return out
def num(s):
    t = re.sub(r"[^\d,.-]", "", str(s or ""))
    if not re.search(r"\d", t): return None
    if re.fullmatch(r"-?\d{1,3}([.,]\d{3})+0*", t): return float(re.sub(r"[.,]", "", t)[: len(re.sub(r"[.,]", "", t)) - (len(t) - len(t.rstrip("0")) if re.search(r"[.,]\d{4,}$", t) else 0)] or 0)
    return float(t.replace(".", "").replace(",", ".")) if t.count(",") == 1 and "." not in t else float(t.replace(",", "")) if t.count(".") <= 1 and "," in t else float(t.replace(".", "")) if t.count(".") > 1 else float(t.replace(",", "."))
pct = lambda s: num(s)
TI, TK = tables(IZ), tables(KAMA)
seg_tab = TI[3][0]
national = {r[0]: {"y2024": num(r[1]), "y2025": num(r[3]), "m10_2025": num(r[6]), "m10_2026": num(r[8]), "g10": pct(r[10]), "oct25": num(r[11]), "oct26": num(r[13]), "gOct": pct(r[15])} for r in seg_tab[1:]}
monthly = {r[0]: [num(r[i]) for i in range(1, 21, 2)] for r in TI[4][0][1:]}
def region(tb):
    out = {}
    for r in tb[2:]:
        if r[0]: out[r[0]] = {"tt10m26": num(r[7]), "dac10m26": num(r[8]), "share10m26": pct(r[10]), "tt10m25": num(r[2]), "dac10m25": num(r[3]), "share10m25": pct(r[5]), "ttOct26": num(r[17]), "dacOct26": num(r[18]), "shareOct26": pct(r[20])}
    return out
regionShare = {"IZ (Small II + Light I + Light II)": region(TI[6][0]), "Small Trucks II": region(TI[7][0]), "Light Trucks I": region(TI[8][0]), "Light Trucks II": region(TI[9][0]), "Small Trucks I + Van (MISSU)": region(TK[5][0])}
def brandtab(tb, m10=17):
    out = []
    for r in tb[1:]:
        b = r[1] or r[0]
        if not b or "Total" in b: continue
        out.append({"brand": b, "y2025": num(r[4]), "months": [num(x) or 0 for x in r[7:17]], "m10_2026": num(r[m10]), "share": pct(r[m10 + 1]), "m10_2025": num(r[m10 + 2]), "g": pct(r[m10 + 4])})
    return out
def brandtab_k(tb):
    out = []
    for r in tb[1:]:
        b = r[2] if len(r) > 2 else ""
        if not b or "Total" in b or "Total" in (r[1] or ""): continue
        try: out.append({"brand": b, "y2025": num(r[5]), "months": [num(x) or 0 for x in r[8:18]], "m10_2026": num(r[18]), "share": pct(r[19]), "m10_2025": num(r[20]), "g": pct(r[22])})
        except IndexError: pass
    return out
brands_by_seg = {"Small Trucks II": brandtab(TI[12][0]), "Light Trucks I": brandtab(TI[21][0]), "Light Trucks II": brandtab(TI[27][0])}
for s, n in (("Small Trucks I", 8), ("Van", 15)):
    try: brands_by_seg[s] = brandtab_k(TK[n][0])
    except (KeyError, IndexError): pass

# ---------------- đối đầu từng mẫu ----------------
SLIDES = [(TI, 14, "Small Trucks II"), (TI, 15, "Small Trucks II"), (TI, 16, "Small Trucks II"), (TI, 17, "Small Trucks II"), (TI, 18, "Small Trucks II"), (TI, 19, "Small Trucks II"),
          (TI, 23, "Light Trucks I"), (TI, 24, "Light Trucks I"), (TI, 25, "Light Trucks I"), (TI, 29, "Light Trucks II"), (TI, 30, "Light Trucks II"),
          (TK, 10, "Small Trucks I"), (TK, 11, "Small Trucks I"), (TK, 12, "Small Trucks I"), (TK, 13, "Small Trucks I"), (TK, 17, "Van"), (TK, 18, "Van")]
MATCH = {  # mẫu đối thủ → (hãng DKM, regex số loại, mức ghép)
    "K200 E5": ("KIA", r"K200", "mẫu"), "K250 E5": ("KIA", r"K250 ", "mẫu"), "K250L": ("KIA", r"K250L", "mẫu"),
    "H200 E5": ("JAC", r"^H200", "mẫu"), "H250": ("JAC", r"^H250", "mẫu"), "N200S PRO": ("JAC", r"N200S PRO", "mẫu"), "N250S E5": ("JAC", r"N250S E5", "mẫu"),
    "N250S PRO E5": ("JAC", r"N250S PRO", "mẫu"), "N250SL": ("JAC", r"N250SL", "mẫu"), "N350S PRO": ("JAC", r"N350S PRO", "mẫu"), "N350 PLUS E5": ("JAC", r"N350 PLUS", "mẫu"),
    "N350SL": ("JAC", r"N350SL", "mẫu"), "N750 PLUS E5": ("JAC", r"N750 PLUS", "mẫu"),
    "TERA 190SL-PLUS E5": ("TERACO", r"190SL", "mẫu"), "TERA 245SL-PLUS E5": ("TERACO", r"245SL", "mẫu"), "TERA 350 PLUS": ("TERACO", r"350 PLUS", "mẫu"),
    "TERA 345SL-PLUS E5": ("TERACO", r"345SL", "mẫu"), "TERA 100S": ("TERACO", r"100S", "mẫu"), "TERA STAR": ("TERACO", r"STAR(?! PLUS)", "mẫu"),
    "TERA 150S": ("TERACO", r"150S", "mẫu"), "TERA STAR PLUS": ("TERACO", r"STAR PLUS", "mẫu"), "TERA V6 2S": ("TERACO", r"V-?62S|V6 2S", "mẫu"), "TERA V8 2S": ("TERACO", r"V-?82S|V8 2S", "mẫu"),
    "CAPTAIN T200 E5": ("TMT", r"CAPTAIN T200", "mẫu"), "CAPTAIN E250 E5": ("TMT", r"CAPTAIN E250", "mẫu"), "CAPTAIN E350": ("TMT", r"CAPTAIN E350", "mẫu"),
    "CAPTAIN C750SL": ("TMT", r"C ?750SL", "mẫu"), "CAPTAIN C 750L": ("TMT", r"C ?750(?!SL)", "mẫu"),
    "AUMARK X25": ("FOTON", r"AUMARK X", "dòng"), "AUMARK X25L": ("FOTON", r"AUMARK X", "dòng"), "AUMARK S35": ("FOTON", r"AUMARK C20[0-6]", "dòng"), "AUMARK S70L": ("FOTON", r"AUMARK C2(0[7-9]|1)", "dòng"),
    "WONDER": ("FOTON", r"WONDER", "mẫu"), "S80": ("VEAM", r"S80", "mẫu"), "T25": ("FOTON", r"^T25(?!S)", "mẫu"), "T25S": ("FOTON", r"^T25S", "mẫu"),
    "T35": ("SRM", r"T35", "mẫu"), "T50": ("SRM", r"T50", "mẫu"), "X30L V2": ("SRM", r"X30L-?V2", "mẫu"), "X30i V2": ("SRM", r"X30I-?V2", "mẫu"),
    "LZ1125": ("CHENGLONG", r"LZ1125", "mẫu"), "DONGVANG 800": ("DONGVANG", r"800", "mẫu"), "CT7.25": ("CHIENTHANG", r"CT7\.25", "mẫu"),
    "TF2800": ("THACO", r"TF2800|FRONTIER", "dòng"), "TOWNER T2.5-2.8": ("THACO", r"TOWNER", "dòng tải"), "TOWNER T2.8-3.3": ("THACO", r"TOWNER", "dòng tải"),
    "TOWNER V2.6-2S": ("THACO", r"TOWNER", "dòng van"), "TOWNER V2.7 - 2S": ("THACO", r"TOWNER", "dòng van"),
}
def dkm_count(model):
    if model.startswith("LINKER"): key = ("THACO", r"LINKER", "dòng")
    elif model.startswith("KIMAN"): return None, None, "chưa có trong DKM"
    else: key = MATCH.get(model)
    if not key: return None, None, "chưa ghép"
    b, rx, lv = key
    xs = [x for x in recs if x["b"] == b and re.search(rx, x["m"])]
    if lv == "dòng tải": xs = [x for x in xs if "VAN" not in U(x["t"])]
    if lv == "dòng van": xs = [x for x in xs if "VAN" in U(x["t"])]
    FAM = {"TF2800": "THACO FRONTIER/TF", "AUMARK X25": "FOTON AUMARK X", "AUMARK X25L": "FOTON AUMARK X", "AUMARK S35": "FOTON AUMARK C (3,5 tấn)", "AUMARK S70L": "FOTON AUMARK C (7 tấn)",
           "TOWNER T2.5-2.8": "THACO TOWNER tải", "TOWNER T2.8-3.3": "THACO TOWNER tải", "TOWNER V2.6-2S": "THACO TOWNER van", "TOWNER V2.7 - 2S": "THACO TOWNER van"}
    return len(xs), dict(C(x["p"] for x in xs).most_common()), "đúng mẫu" if lv == "mẫu" else "cả dòng " + FAM.get(model, "THACO LINKER")
def dt_count(model):
    k = model.replace(" E5", "").replace("MISSU ", "")
    xs = [x for x in recs if x["b"] == "DOTHANH" and re.sub(r"\s", "", dtmodel(x["m"])) == re.sub(r"\s", "", k)]
    return len(xs), dict(C(x["p"] for x in xs).most_common())
matchups = []
for T, sn, seg in SLIDES:
    tb = next((t for t in T.get(sn, []) if any("Tải trọng" in " ".join(r) or "Payload" in " ".join(r) for r in t)), None)
    if not tb: continue
    get = lambda key: next((r for r in tb if any(key in c for c in r[:2])), None)
    brands, cur = [], ""
    for c in tb[0][2:]: cur = c or cur; brands.append(cur)
    models = tb[2][2:]
    pay, avg = get("Tải trọng") or get("Payload"), get("Sản lượng") or get("Avg. Quantity")
    ret, xhd, km = get("Giá bán lẻ") or get("Retail"), get("Giá XHĐ") or get("Invoiced"), get("CTKM") or get("Promotion")
    cols = []
    for i, (b, m) in enumerate(zip(brands, models)):
        if not m: continue
        v = lambda row: row[2 + i] if row and len(row) > 2 + i else ""
        d = {"brand": b.replace("DONGBEN/SRM", "SRM"), "model": m, "payload": num(v(pay)), "avg26": num(v(avg)), "retail": num(v(ret)), "xhd": num(v(xhd)), "promo": v(km)}
        if b == "DOTHANH": d["dkmT10"], d["dkmProv"] = dt_count(m); d["match"] = "đúng mẫu"
        else: d["dkmT10"], d["dkmProv"], d["match"] = dkm_count(m)
        cols.append(d)
    dts = [c for c in cols if c["brand"] == "DOTHANH"]
    matchups.append({"seg": seg, "src": ("IZ" if T is TI else "KAMA") + " slide %d" % sn, "dt": [c["model"] for c in dts] or ["(Đô Thành chưa có mẫu)"],
                     "title": "Tải trọng 3T5 – thùng 5m2" if sn == 24 and T is TI else None, "rows": cols})

ANNUAL = round(national["Grand Total"]["m10_2026"] * national["Grand Total"]["y2025"] / national["Grand Total"]["m10_2025"])
out = {"asOf": "T10/2026", "sources": {"dkm": "DKM_10.2026.xlsx (đăng ký mới xe tải từng xe, tháng 10/2026)", "iz": "BCNB IZ Market in October 2026 (DAC)", "kama": "BCNB KAMA Market in October 2026 (DAC)"},
       "annual2026": ANNUAL, "annualNote": "Quy năm 2026 = 10T/2026 × (cả năm 2025 / 10T/2025) theo báo cáo IZ (8 phân khúc xe tải)",
       "national": national, "monthly2026": monthly, "regionShare": regionShare, "brandsBySeg": brands_by_seg, "matchups": matchups, "dkm": dkm}
try: out["dtHeavy"] = json.load(open("market2026.json", encoding="utf-8")).get("dtHeavy")   # số đầu kéo Daewoo do phòng KD báo (DKM ghi nhãn DAEWOO)
except Exception: pass
json.dump(out, open("market2026.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# ---------------- provinces.json: số thật thay ước tính ----------------
R = json.load(open("provinces.json", encoding="utf-8")); tot = sum(v["total"] for v in by_prov.values())
miss = []
for r in R:
    v = by_prov.get(r["name"])
    if not v: miss.append(r["name"]); continue
    r["regT10"] = v["total"]; r["regT10dt"] = v["dt"]
    r["reg"] = round(v["total"] / tot * ANNUAL)          # ĐK mới xe tải quy năm 2026 theo cơ cấu thật T10
    r["regNote"] = "quy năm 2026 từ ĐK thực T10/2026 (DKM) × tổng thị trường 10T/2026 (báo cáo IZ)"
    SEGA = ["Van", "Small Trucks I", "Small Trucks II", "Light Trucks I", "Light Trucks II"]   # phân khúc Đô Thành có sản phẩm (mẫu số thị phần)
    r["regT10addr"] = sum(v["seg"].get(s, 0) for s in SEGA); r["regT10dtAddr"] = sum(v.get("segDt", {}).get(s, 0) for s in SEGA)
    top = list(v["brands"].items())[:9]; rest = v["total"] - sum(c for _, c in top)
    r["brandsT10"] = [[b, round(c / v["total"] * 100, 1)] for b, c in top] + ([["Khác", round(rest / v["total"] * 100, 1)]] if rest > 0 else [])
json.dump(R, open("provinces.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("DKM", len(recs), "xe, %d tỉnh" % len(by_prov), "· thiếu:", miss, "· quy năm 2026:", ANNUAL)
print("phân khúc DKM:", dict(C(x["s"] for x in recs)))
print("đối đầu:", len(matchups), "bảng;", sum(len(m["rows"]) for m in matchups), "mẫu")
for m in matchups: print(" ", m["seg"], m["dt"], [(c["brand"], c["model"], c["dkmT10"], c["match"]) for c in m["rows"]])
