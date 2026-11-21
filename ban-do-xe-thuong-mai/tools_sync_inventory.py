#!/usr/bin/env python3
"""Đồng bộ file tồn đại lý (MoM Tồn SR, sheet "Tồn SR T11" từng xe + sheet PV) vào inventory.json.

Khớp tồn: Tồn = Tồn lũy kế T10 + Mua T11 + MBTB − MBTB→MB − Bán lẻ − Thu hồi.
Chỉ lưu số đếm theo đại lý × model × thùng × màu × đời × loại hợp đồng × tuổi; KHÔNG lưu số khung, hợp đồng.
Tuổi tồn tính từ ngày TT 10% (xe hợp đồng mua bán); xe MBTB không có ngày TT 10%.

Cách dùng: python3 tools_sync_inventory.py file.xlsx [YYYY-MM-DD]  rồi  python3 build.py
"""
import collections, datetime, json, os, sys
import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
CANON = {"TRƯỜNG VŨ": "Trường Vũ", "ĐT ĐÔNG NAM": "ĐT Đông Nam", "QUANG DƯƠNG": "Quang Dương", "VŨ HÙNG": "Vũ Hùng", "ĐT ĐÀ NẴNG": "ĐT Đà Nẵng", "PHÚ MỸ": "Phú Mỹ",
         "PHI HƯNG": "Phi Hưng", "ĐT LONG AN": "ĐT Long An", "TÂN VẠN": "Tân Vạn", "Ô TÔ 19/5": "Ô Tô 19/5", "HƯNG VƯỢNG": "Hưng Vượng", "ĐT TIỀN GIANG": "ĐT Tiền Giang",
         "VIỆT NHẬT ANH": "Việt Nhật Anh", "MỸ PHÚ HƯNG": "Mỹ Phú Hưng", "DŨNG LẠC": "Dũng Lạc", "Ô TÔ TÂY NGUYÊN": "Ô Tô Tây Nguyên", "HỒNG VINH": "Hồng Vinh",
         "ĐT BÌNH THUẬN": "ĐT Bình Thuận", "CƯƠNG NGUYỄN": "Cương Nguyễn", "HÙNG TUYẾN": "Hùng Tuyến", "PHÚ MỸ HG": "Phú Mỹ HG", "PHÚ MỸ HG-KG": "Phú Mỹ HG-KG",
         "ĐT HẬU GIANG": "ĐT Hậu Giang", "ĐT KIÊN GIANG": "ĐT Kiên Giang", "ĐT ĐỒNG NAI": "ĐT Đồng Nai", "MAI PHƯỚC VINH": "Mai Phước Vinh", "MÔI TRƯỜNG SỐNG": "Môi Trường Sống"}
# đại lý trên bản đồ tương ứng (để bay tới, ghép số bán)
LINK = {"Phú Mỹ HG": "ĐT Hậu Giang", "Phú Mỹ HG-KG": "ĐT Kiên Giang"}
BODY = {"TMB": "Mui bạt", "TMB1": "Mui bạt", "TK": "Thùng kín", "TK1": "Thùng kín", "TK2": "Thùng kín", "TK3": "Thùng kín", "TKCD": "Thùng kín", "TL": "Thùng lửng", "SATXI": "Chassis", "XTL": "Xe tập lái", "VAN": "Van"}
MANUAL = {"ĐT Hậu Giang", "ĐT Kiên Giang", "Cương Nguyễn", "Hùng Tuyến"}  # dòng số tổng nhập tay (đại lý chưa cập nhật từng xe)
canon = lambda s: CANON.get(str(s).strip().upper(), str(s).strip())
num = lambda v: v if isinstance(v, (int, float)) else 0

def main():
    src = sys.argv[1]; name = os.environ.get("SRC_NAME") or os.path.basename(src); asof = datetime.datetime.strptime(sys.argv[2], "%Y-%m-%d") if len(sys.argv) > 2 else datetime.datetime(2026, 11, 21)
    wb = openpyxl.load_workbook(src, data_only=True, read_only=True)
    pv = [r for r in wb["PV"].iter_rows(values_only=True) if r and r[0] and r[0] != "Row Labels"]
    pvd = {canon(r[0]): [num(x) for x in r[1:8]] for r in pv if r[0] != "Grand Total"}
    tot = [num(x) for x in next(r for r in pv if r[0] == "Grand Total")[1:8]]
    ws = [w for w in wb.worksheets if w.title != "PV"][0]
    rows = list(ws.iter_rows(values_only=True)); H = [str(h or "").replace("\n", " ").strip() for h in rows[0]]; ix = {h: i for i, h in enumerate(H)}
    R = [r for r in rows[1:] if r and r[ix["ĐẠI LÝ"]]]
    g = lambda r, k: r[ix[k]]
    stock = [r for r in R if num(g(r, "TỒN")) > 0]
    D = collections.defaultdict(lambda: {"ton": 0, "le": 0, "mua": 0, "mbtb": 0, "mb": 0, "kg": 0, "age": collections.Counter(), "models": collections.Counter(), "region": ""})
    M = collections.defaultdict(lambda: {"ton": 0, "le": 0, "mbtb": 0, "y2025": 0, "age": collections.Counter(), "bodies": collections.Counter(), "colors": collections.Counter()})
    old = collections.Counter(); ages = collections.Counter(); y25 = 0; bodyT = collections.Counter(); colorT = collections.Counter(); regionT = collections.Counter()
    def bucket(r):
        d = g(r, "NGÀY TT 10%")
        if not isinstance(d, datetime.datetime): return None
        a = (asof - d).days
        return "0-90" if a <= 90 else "91-180" if a <= 180 else "181-365" if a <= 365 else ">365"
    for r in R:
        dl, mo = canon(g(r, "ĐẠI LÝ")), str(g(r, "LOẠI XE")).strip().upper()
        D[dl]["region"] = str(g(r, "MIỀN") or "").strip().title() or D[dl]["region"]
        if num(g(r, "SL BÁN LẺ")) > 0: D[dl]["le"] += num(g(r, "SL BÁN LẺ")); M[mo]["le"] += num(g(r, "SL BÁN LẺ"))
        D[dl]["mua"] += num(g(r, "MUA T11"))
    for r in stock:
        dl, mo = canon(g(r, "ĐẠI LÝ")), str(g(r, "LOẠI XE")).strip().upper(); typ = str(g(r, "LOẠI HỢP ĐỒNG") or "").strip().upper()
        b = bucket(r); yr = g(r, "ĐỜI XE"); body = BODY.get(str(g(r, "THÙNG") or "").strip().upper(), str(g(r, "THÙNG") or "Khác")); col = str(g(r, "MÀU") or "?").strip()
        d = D[dl]; d["ton"] += 1; d["models"][mo] += 1
        if typ == "MBTB": d["mbtb"] += 1; M[mo]["mbtb"] += 1
        elif "KÝ GỬI" in typ: d["kg"] += 1
        else: d["mb"] += 1
        m = M[mo]; m["ton"] += 1; m["bodies"][body] += 1; m["colors"][col] += 1; bodyT[body] += 1; colorT[col] += 1; regionT[d["region"] or "?"] += 1
        if b: d["age"][b] += 1; m["age"][b] += 1; ages[b] += 1
        if isinstance(yr, (int, float)) and int(yr) <= 2025: y25 += 1; m["y2025"] += 1
        if b in ("181-365", ">365"): old[(dl, mo, int(yr) if isinstance(yr, (int, float)) else 0, b)] += 1
    days = asof.day; le_t = tot[4]; rate = le_t / days * 30
    cov = lambda ton, le: round(ton / (le / days * 30), 1) if le else None
    dealers = []
    for name, d in sorted(D.items(), key=lambda x: -x[1]["ton"]):
        if not d["ton"] and not d["le"]: continue
        p = pvd.get(name)
        dealers.append({"name": name, "link": LINK.get(name, name), "region": d["region"], "ton": d["ton"], "leT11": d["le"], "muaT11": d["mua"], "cover": cov(d["ton"], d["le"]),
                        "mb": d["mb"], "mbtb": d["mbtb"], "kg": d["kg"], "age": dict(d["age"]), "models": dict(d["models"].most_common()),
                        "manual": name in MANUAL, "pv": p})
    models = [{"m": k, "ton": v["ton"], "leT11": v["le"], "cover": cov(v["ton"], v["le"]), "mbtb": v["mbtb"], "y2025": v["y2025"], "age": dict(v["age"]), "bodies": dict(v["bodies"].most_common()), "colors": dict(v["colors"].most_common(4))}
              for k, v in sorted(M.items(), key=lambda x: -x[1]["ton"]) if v["ton"] or v["le"]]
    wp = sum(ages.values())
    out = {"asOf": asof.strftime("%Y-%m-%d"), "source": name + " (sheet PV + Tồn SR T11, từng xe)", "total": len(stock),
           "recon": {"tonT10": tot[0], "muaT11": tot[1], "mbtb": tot[2], "mbtbToMb": tot[3], "banLeT11": tot[4], "thuHoi": tot[5], "ton": tot[6],
                     "ok": tot[0] + tot[1] + tot[2] - tot[3] - tot[4] - tot[5] == tot[6] == len(stock),
                     "note": "Tồn = tồn lũy kế T10 %d + mua T11 %d + MBTB %d − MBTB→MB %d − bán lẻ T11 %d − thu hồi %d = %d xe; khớp %d xe chi tiết." % (tot[0], tot[1], tot[2], tot[3], tot[4], tot[5], tot[6], len(stock))},
           "mbtb": {"xe": sum(d["mbtb"] for d in D.values()), "note": "Hợp đồng MBTB: bán sỉ cho đại lý theo cơ chế giá riêng; không có ngày TT 10% nên không tính tuổi."},
           "contracts": {"Mua bán": sum(d["mb"] for d in D.values()), "MBTB": sum(d["mbtb"] for d in D.values()), "Ký gửi": sum(d["kg"] for d in D.values())},
           "daysT11": days, "retailT11": le_t, "regT10": 226,
           "models": models, "dealers": dealers,
           "age": {"withPayDate": wp, "buckets": dict(ages), "over180": ages["181-365"] + ages[">365"], "over365": ages[">365"], "model2025": y25},
           "old": [[k[0], k[1], k[2], k[3], n] for k, n in old.most_common()],
           "bodies": dict(bodyT.most_common()), "colors": dict(colorT.most_common()),
           "regions": [[k, v] for k, v in regionT.most_common()], "regionNote": "Miền theo cột MIỀN trong file (ĐT Đông Nam ghi miền Bắc).",
           "manualNote": "ĐT Hậu Giang, ĐT Kiên Giang, Cương Nguyễn, Hùng Tuyến: dòng số tổng nhập tay trong file (đại lý chưa cập nhật từng xe)."}
    json.dump(out, open(os.path.join(HERE, "inventory.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print("inventory.json: %d xe, khớp=%s, %d đại lý, %d model; tuổi: %s; đời ≤2025: %d" % (len(stock), out["recon"]["ok"], len(dealers), len(models), dict(ages), y25))

if __name__ == "__main__":
    main()
