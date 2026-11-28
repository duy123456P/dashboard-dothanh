#!/usr/bin/env python3
"""Báo cáo công nợ xe trong hạn và quá hạn (Phòng Kế toán DAC) → debt2026.json.

    python3 tools_sync_debt.py BC_CN_TRONG_HAN_VA_QUA_HAN_DEN_dd.mm.yy.xlsx YYYY-MM-DD

Sheet "XE MB": xe hợp đồng mua bán (đại lý đã trả 10%), số tiền còn nợ từng xe; khối XE IZ và XE KAMA (MISSU).
Sheet "XE MBTB": xe mua bán trưng bày (đại lý trả 5%), không có số tiền → ước = giá bán cho đại lý × 95%.
Chỉ lưu số đếm, số tiền theo đại lý × model × tình trạng × nhóm ngày; KHÔNG lưu số khung.
"""
import collections, datetime, json, os, re, statistics, sys, unicodedata
import openpyxl
HERE = os.path.dirname(os.path.abspath(__file__))
SRC, ASOF = sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "2026-11-20"
CODE = {"DTDONGNAM": "ĐT Đông Nam", "QUANGDUONG": "Quang Dương", "SR-DANANG": "ĐT Đà Nẵng", "SR-PHUYEN": "Phi Hưng", "VUHUNG": "Vũ Hùng", "HONGVINH": "Hồng Vinh",
        "MYPHUHUNG": "Mỹ Phú Hưng", "Ô TÔ 19/5": "Ô Tô 19/5", "SR-HAUGIANG": "ĐT Hậu Giang", "SR-KIENGIANG": "ĐT Kiên Giang", "SR-LONGAN": "ĐT Long An", "SR-PHUMY": "Phú Mỹ",
        "SR-TANVAN": "Tân Vạn", "TRUONGVU": "Trường Vũ", "HUNGVUONG": "Hưng Vượng", "SR-TIENGIANG": "ĐT Tiền Giang", "DUNGLAC": "Dũng Lạc", "CUONGNGUYEN": "Cương Nguyễn",
        "HUNGTUYEN": "Hùng Tuyến", "DLAC-THDL": "Ô Tô Tây Nguyên"}
GUESS = {"SR-PHUYEN": "Phi Hưng (Phú Yên cũ, nay Đắk Lắk)", "DLAC-THDL": "Ô Tô Tây Nguyên (Đắk Lắk)"}
nfc = lambda s: unicodedata.normalize("NFC", str(s or "")).strip()
PL = json.load(open(os.path.join(HERE, "pricelist.json"), encoding="utf-8"))["items"]
def price(model):
    m = re.sub(r"-(20\d\d)$", "", model).replace("-2S", "").replace("-PLUS", " Plus").upper()
    c = [i["dealer"] for i in PL if i["cmodel"].upper() == m and re.search(r"TMB|mui|Van", i["body"], re.I)] or [i["dealer"] for i in PL if i["cmodel"].upper() == m]
    return c[0] if c else None
def fwd(d):  # số ngày còn lại đến hạn (d ≤ 0): lịch tiền về dự kiến
    r = -d; return "0–7" if r <= 7 else "8–30" if r <= 30 else "31–60" if r <= 60 else "61–90" if r <= 90 else "> 90"
def bucket(d): return "trong hạn" if d <= 0 else "1–30" if d <= 30 else "31–60" if d <= 60 else "61–90" if d <= 90 else "> 90"
wb = openpyxl.load_workbook(SRC, data_only=True)
D = collections.OrderedDict(); terms = {"MB": [], "MBTB": []}; unmapped = collections.Counter(); noprice = collections.Counter()
for sheet, kind in (("XE MB", "MB"), ("XE MBTB", "MBTB")):
    ws = wb[sheet]; dl = md = None; grp = "IZ"
    for r in ws.iter_rows(values_only=True):
        r = list(r) + [None] * 8
        if r[7] in ("XE IZ", "XE KAMA"): grp = r[7][3:]; continue
        if r[0] and str(r[0]).endswith("Total") or r[0] in ("Đại Lý", "Grand Total") or not isinstance(r[3], datetime.datetime): 
            if r[0] and not str(r[0]).endswith("Total") and r[0] not in ("Đại Lý", "Grand Total") and isinstance(r[3], datetime.datetime): pass
            else:
                if r[0] and str(r[0]).endswith("Total"): dl = None
                continue
        if r[0]: dl = nfc(r[0]).upper()
        if r[1]: md = nfc(r[1])
        name = CODE.get(dl); 
        if not name: unmapped[dl] += 1; name = dl
        days = int(r[5] or 0); due = (r[4] - r[3]).days; terms[kind].append(due)
        amt = r[7] if kind == "MB" else None
        est = False
        if amt is None:
            p = price(md); amt = p * .95 if p else 0; est = True
            if not p: noprice[md] += 1
        d = D.setdefault(name, {"name": name, "code": dl, "MB": {"n": 0, "amt": 0, "over": 0, "overAmt": 0, "b": collections.Counter(), "bAmt": collections.Counter(), "max": 0, "f": collections.Counter()},
                                "MBTB": {"n": 0, "amt": 0, "over": 0, "overAmt": 0, "b": collections.Counter(), "bAmt": collections.Counter(), "max": 0, "f": collections.Counter()}, "models": collections.Counter()})
        z = d[kind]; z["n"] += 1; z["amt"] += amt; b = bucket(days); z["b"][b] += 1; z["bAmt"][b] += amt; z["max"] = max(z["max"], days)
        if days <= 0: z["f"][fwd(days)] += amt
        if days > 0: z["over"] += 1; z["overAmt"] += amt
        d["models"][re.sub(r"-(20\d\d)$", "", md)] += 1
rows = []
for d in D.values():
    for k in ("MB", "MBTB"):
        z = d[k]; z["amt"] = round(z["amt"] / 1e6); z["overAmt"] = round(z["overAmt"] / 1e6); z["b"] = dict(z["b"]); z["bAmt"] = {a: round(v / 1e6) for a, v in z["bAmt"].items()}; z["f"] = {a: round(v / 1e6) for a, v in z["f"].items()}
    d["models"] = dict(d["models"].most_common()); d["total"] = d["MB"]["amt"] + d["MBTB"]["amt"]; d["over"] = d["MB"]["overAmt"] + d["MBTB"]["overAmt"]; rows.append(d)
rows.sort(key=lambda d: -d["over"])
tot = lambda k, f: sum(d[k][f] for d in rows)
out = {"asOf": ASOF, "source": os.environ.get("SRC_NAME") or os.path.basename(SRC), "terms": {k: statistics.median(v) for k, v in terms.items() if v},
       "note": "Số tiền còn nợ xe HĐMB theo báo cáo kế toán; xe MBTB chưa có số tiền trong báo cáo → ước = giá bán cho đại lý × 95%. Số ngày > 0 = quá hạn thanh toán.",
       "guess": GUESS, "unmapped": dict(unmapped), "noPrice": dict(noprice),
       "MB": {"n": tot("MB", "n"), "amt": tot("MB", "amt"), "over": tot("MB", "over"), "overAmt": tot("MB", "overAmt")},
       "MBTB": {"n": tot("MBTB", "n"), "amt": tot("MBTB", "amt"), "over": tot("MBTB", "over"), "overAmt": tot("MBTB", "overAmt")},
       "buckets": {k: dict(sum((collections.Counter(d[k]["b"]) for d in rows), collections.Counter())) for k in ("MB", "MBTB")},
       "bucketsAmt": {k: dict(sum((collections.Counter(d[k]["bAmt"]) for d in rows), collections.Counter())) for k in ("MB", "MBTB")},
       "dueAmt": {k: dict(sum((collections.Counter(d[k]["f"]) for d in rows), collections.Counter())) for k in ("MB", "MBTB")}, "dealers": rows}
json.dump(out, open(os.path.join(HERE, "debt2026.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(json.dumps({k: out[k] for k in ("terms", "MB", "MBTB", "buckets", "bucketsAmt", "unmapped", "noPrice")}, ensure_ascii=False))
for d in rows: print(d["name"], d["MB"]["n"], d["MB"]["amt"], d["MB"]["over"], d["MB"]["overAmt"], d["MB"]["max"], "|", d["MBTB"]["n"], d["MBTB"]["amt"], d["MBTB"]["over"], d["MBTB"]["max"])
