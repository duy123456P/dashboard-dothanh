#!/usr/bin/env python3
"""Đồng bộ file giao dịch bán hàng DAC (mỗi dòng một xe) vào tx.json cho bản đồ.

Quy ước (đã đối chiếu với Tổng hợp TDBH 2026):
  - Bán lẻ  = ngày thanh toán 100%  (T1–T10/2026: 2.262 xe so với TDBH 2.270)
  - Bán sỉ  = ngày thanh toán 10%   (T1, T2/2026 trùng TDBH 195, 99)
  - Xuất kho = ngày XK
  - Số lượng ròng theo cột "SL CỌC XE" (−1 = hủy cọc)
  - Fleet = đơn vị "Dự Án" (số hợp đồng trong file là hợp đồng Đô Thành – đại lý gom nhiều xe, không phải khách cuối, nên không dùng để nhận diện fleet)
  - Đang chờ (đã cọc 10%, chưa thanh toán 100%): đếm theo đại lý × model × thùng × tuổi (ngày từ TT 10%)
Chỉ lưu số đếm tổng hợp; KHÔNG lưu số khung, số hợp đồng.

Cách dùng: python3 tools_sync_sales_xlsx.py đường-dẫn-file.xlsx [ngày-chốt YYYY-MM-DD]  rồi  python3 build.py
"""
import collections, datetime, json, os, re, sys
import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
FLEET_MIN = 5
DEALER = {"Phú Mỹ HG": "ĐT Hậu Giang", "Phú Mỹ HG-KG": "ĐT Kiên Giang", "Ô tô 19/5": "Ô Tô 19/5", "Ô tô Tây Nguyên": "Ô Tô Tây Nguyên", "Ngọc Thy": "Cương Nguyễn"}
BODY = {"TMB": "BAT", "TMB1": "BAT", "TK": "KIN", "TK1": "KIN", "TK2": "KIN", "TK3": "KIN", "TKCD": "KIN", "TL": "LUNG", "SATXI": "CHASSIS", "XTL": "XTL", "VAN": "VAN"}
# tải trọng (tấn) theo model, để chia phân khúc
TON = {"V56": .945, "V65": .945, "T26": .99, "T18": .99, "T33L": 1.49, "IZ45S": 1.99, "IZ49S": 1.99, "IZ50S": 2.49, "IZ50M": 2.4, "IZ62M": 3.49, "IZ50M-PLUS": 1.99, "IZ65M-PLUS": 3.49,
       "IZ60SL-PLUS": 2.49, "IZ71SL-PLUS": 3.49, "JP120SL": 7.5, "JP120EXL": 7.5, "IZ200": 1.99, "IZ250": 2.49, "IZ350": 3.49, "IZ350SL": 3.49, "IZ500": 5, "IZ500L": 5, "IZ500SL": 5,
       "IZ650": 6.5, "IZ650SL": 6.5, "IZ65-1.9T": 1.9, "IZ65-2.5T": 2.49, "IZ65-3.5T": 3.49, "IZ49": 1.99}

def ton(m):
    m = m.upper().replace(" ", "")
    t = re.search(r"-(\d(?:\.\d)?)T$", m)
    if t: return float(t.group(1))
    if m.startswith("JP120"): return 7.5
    if m.startswith("IZ190"): return 1.9
    if m in TON: return TON[m]
    k = re.sub(r"-20\d\d$", "", m)
    if k in TON: return TON[k]
    x = re.match(r"IZ(\d{3})", k)
    if x: return int(x.group(1)) / 100
    return None

def seg(t):
    return None if t is None else "< 1 tấn" if t < 1 else "1–2,5 tấn" if t <= 2.5 else "2,5–3,5 tấn" if t <= 3.5 else "3,5–10 tấn" if t <= 10 else "> 10 tấn"

def main():
    src = sys.argv[1]
    asof = datetime.datetime.strptime(sys.argv[2], "%Y-%m-%d") if len(sys.argv) > 2 else datetime.datetime(2026, 11, 21)
    wb = openpyxl.load_workbook(src, data_only=True, read_only=True)
    rows = list(wb.worksheets[0].iter_rows(values_only=True))
    H = [str(h or "").replace("\n", " ").strip() for h in rows[0]]
    ix = {k: H.index(k) for k in ["Đơn vị", "Miền", "Đại Lý", "Hợp đồng", "Loại xe", "Đời xe", "Thùng", "Ngày TT 10%", "Ngày TT 100%", "SL CỌC XE", "Ngày XK"]}
    R = [r for r in rows[1:] if any(r)]
    ym = lambda v: v.strftime("%Y-%m") if isinstance(v, datetime.datetime) else None
    lot = collections.Counter(r[ix["Hợp đồng"]] for r in R if r[ix["Hợp đồng"]] and (r[ix["SL CỌC XE"]] or 0) > 0)
    dealers, models, bodies, regions = [], [], [], {}
    idx = lambda lst, v: lst.index(v) if v in lst else (lst.append(v) or len(lst) - 1)
    agg = collections.defaultdict(lambda: [0, 0, 0])  # le, si, xk
    future = collections.Counter(); pend = collections.Counter(); unmapped = collections.Counter(); fleet_n = 0
    for r in R:
        q = r[ix["SL CỌC XE"]] or 0
        if not q: continue
        dl = DEALER.get(str(r[ix["Đại Lý"]]).strip(), str(r[ix["Đại Lý"]]).strip()); mo = str(r[ix["Loại xe"]]).strip().upper()
        bd = BODY.get(str(r[ix["Thùng"]]).strip().upper(), "KHAC")
        if ton(mo) is None: unmapped[mo] += 1
        fl = 1 if str(r[ix["Đơn vị"]]).strip() == "Dự Án" else 0
        fleet_n += fl if q > 0 else 0
        rg = r[ix["Miền"]]
        if isinstance(rg, str) and rg.strip(): regions[dl] = rg.strip()
        key = lambda m: (m, idx(dealers, dl), idx(models, mo), idx(bodies, bd), fl)
        for col, j in (("Ngày TT 100%", 0), ("Ngày TT 10%", 1), ("Ngày XK", 2)):
            v = r[ix[col]]; m = ym(v)
            if m and v <= asof: agg[key(m)][j] += q
            elif m: future[col] += q
        if q > 0 and not isinstance(r[ix["Ngày TT 100%"]], datetime.datetime) and isinstance(r[ix["Ngày TT 10%"]], datetime.datetime):
            age = (asof - r[ix["Ngày TT 10%"]]).days
            b = "0-90" if age <= 90 else "91-180" if age <= 180 else "181-365" if age <= 365 else ">365"
            yr = r[ix["Đời xe"]]; yr = int(yr) if isinstance(yr, (int, float)) and yr else None
            pend[(idx(dealers, dl), idx(models, mo), idx(bodies, bd), b, yr)] += 1
    tx = [[k[0], k[1], k[2], k[3], k[4], v[0], v[1], v[2]] for k, v in sorted(agg.items()) if any(v)]
    months = sorted({t[0] for t in tx})
    out = {"source": os.path.basename(src), "asOf": asof.strftime("%Y-%m-%d"), "synced": datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).strftime("%Y-%m-%d %H:%M"),
           "def": {"le": "Bán lẻ = ngày thanh toán 100%", "si": "Bán sỉ = ngày thanh toán 10%", "xk": "Xuất kho = ngày XK", "fleet": "Đơn vị Dự Án (file chưa có khách hàng cuối)", "pend": "Đã cọc 10%, chưa thanh toán 100% (tuổi tính từ ngày TT 10%)"},
           "fleetMin": FLEET_MIN, "months": months, "dealers": dealers, "regions": regions, "models": models, "tons": [ton(m) for m in models], "segs": [seg(ton(m)) for m in models], "bodies": bodies,
           "cols": ["ym", "dealer", "model", "body", "fleet", "le", "si", "xk"], "tx": tx,
           "pendCols": ["dealer", "model", "body", "age", "year", "n"], "pend": [[k[0], k[1], k[2], k[3], k[4], n] for k, n in sorted(pend.items())]}
    json.dump(out, open(os.path.join(HERE, "tx.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    le = collections.Counter(); [le.update({t[0]: t[5]}) for t in tx]
    print("tx.json: %d dòng tổng hợp, %d đại lý, %d model, %s → %s; fleet %d xe; chờ TT100%% %d xe" % (len(tx), len(dealers), len(models), months[0], months[-1], fleet_n, sum(pend.values())))
    print("bán lẻ 2026:", [le.get("2026-%02d" % m, 0) for m in range(1, 12)])
    if future: print("Bỏ qua ngày sau ngày chốt:", dict(future))
    if unmapped: print("Model chưa có tải trọng:", dict(unmapped))

if __name__ == "__main__":
    main()
