"""Tồn kho thành phẩm DAC (nhà máy) → factory.json. Chạy mỗi sáng với 2 file mới nhất trong "Y:\\TỒN KHO THÀNH PHẨM\\2026":

    python3 tools_sync_factory.py <FILE XE TỔNG HỢP.xlsx> <BC NHẬP-XUẤT-TỒN.xlsx>

- FILE XE TỔNG HỢP, sheet "FILE": từng xe theo số khung, trạng thái kho (KHO LƯU), đại lý, model, màu, thùng, ngày nhập, ngày HĐ bán, tuổi tồn.
- BC NHẬP-XUẤT-TỒN: nhập, xuất (đại lý nhận), thu hồi, chuyển ký gửi → mua bán trong kỳ.
Kết quả KHÔNG chứa số khung, số máy: chỉ số đếm theo nhóm × model × thùng × màu, tuổi tồn, xuất bán theo đại lý × tháng.
"""
import datetime, json, os, re, sys, unicodedata
from collections import Counter, defaultdict
import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
F_FILE, F_NXT = sys.argv[1], sys.argv[2]
S = lambda v: unicodedata.normalize("NFC", re.sub(r"\s+", " ", str(v or ""))).strip()
def D(v):
    if isinstance(v, datetime.datetime): return v.date() if v.year > 1901 else None
    if isinstance(v, datetime.date): return v if v.year > 1901 else None
    return None
DEALER_FIX = {"Ô Tô Tây Nguyên": "Ô tô Tây Nguyên", "ĐT Đông Nam": "ĐT Đông Nam"}
def dealer(v): v = S(v); return DEALER_FIX.get(v, v)
STATUS0 = {"Kho TP ( xe +thùng )": "fg", "Kho TP chassi": "chassis", "Xe Đã có Đơn Hàng Chờ Xuất bán": "wait", "Xe Giao Gác Thùng": "wipBody", "Thùng Đã đóng chờ QM -NK": "wipQC",
          "Linh Kiện Chưa NK": "ckd", "Chuyển kho Ký Gửi": "consign", "Chuyển kho MBTB": "mbtb", "HD Bán Hàng": "sold"}
STATUS = {unicodedata.normalize("NFC", re.sub(r"\s+", " ", k)): v for k, v in STATUS0.items()}

# ---------- FILE XE TỔNG HỢP ----------
wb = openpyxl.load_workbook(F_FILE, read_only=True, data_only=True)
ws = wb[[n for n in wb.sheetnames if n.strip().upper() == "FILE"][0]]
it = ws.iter_rows(values_only=True); H = [S(c).upper() for c in next(it)]
col = lambda *ks: next(i for i, h in enumerate(H) if any(h.startswith(unicodedata.normalize("NFC", k)) for k in ks))
c = {"kho": col("KHO LƯU"), "dl": col("ĐẠI LÝ"), "model": col("LOẠI XE"), "color": col("MÀU"), "body": col("LOẠI THÙNG"), "grp": col("NHÓM LOẠI"),
     "nhap": col("NHẬP (XE + THÙNG)", "NHẬP (XE+THÙNG)"), "age": col("NGÀY TỒN KHO"), "hd": col("HĐ BÁN HÀNG"), "kg": col("CHUYỂN KHO KÝ GỬI"), "mbtb": col("CHUYỂN KHO MBTB")}
today = datetime.date.today()
items = defaultdict(lambda: {"chassis": 0, "fg": 0, "wait": 0, "ages": []})
pipe, sell, sellModel, sellBody, sellColor, consign = Counter(), defaultdict(Counter), defaultdict(Counter), defaultdict(Counter), defaultdict(Counter), Counter()
asOf = None
for r in it:
    st = STATUS.get(S(r[c["kho"]]));
    if not st: continue
    grp, model, body, color = S(r[c["grp"]]).upper() or "?", S(r[c["model"]]).upper(), S(r[c["body"]]).upper(), S(r[c["color"]]).upper()
    if grp == "KHÁCH": continue                      # xe khách hàng gửi, không phải tồn DAC
    if st in ("fg", "chassis", "wait"):
        k = (grp, model, body, color); x = items[k]; x[st] += 1
        try: x["ages"].append(int(float(r[c["age"]])))
        except Exception: pass
    elif st in ("ckd", "wipBody", "wipQC", "mbtb"): pipe[st] += 1; pipe[st + ":" + grp] += 1
    elif st == "consign": consign[dealer(r[c["dl"]])] += 1
    d = D(r[c["hd"]]) or D(r[c["mbtb"]]) if st in ("sold", "mbtb") else None
    if d:
        m = d.strftime("%Y-%m"); dl = dealer(r[c["dl"]])
        sell[dl][m] += 1; sellModel[m][model] += 1; sellBody[m][body] += 1; sellColor[m][color] += 1
        asOf = max(asOf or d, d)
out_items, groups = [], defaultdict(lambda: {"chassis": 0, "fg": 0, "wait": 0, "age90": 0})
for (g, m, b, co), x in sorted(items.items()):
    a = x.pop("ages"); x.update(group=g, model=m, body=b, color=co, age45=sum(1 for v in a if v < 45), age45_90=sum(1 for v in a if 45 <= v <= 90), age90=sum(1 for v in a if v > 90), maxAge=max(a) if a else None, avgAge=round(sum(a) / len(a)) if a else None)
    out_items.append(x)
    for k in ("chassis", "fg", "wait", "age90"): groups[g][k] += x[k]

# ---------- BÁO CÁO NHẬP - XUẤT - TỒN ----------
wb2 = openpyxl.load_workbook(F_NXT, read_only=True, data_only=True)
def sheet(prefix): return next((wb2[n] for n in wb2.sheetnames if n.strip().upper().startswith(prefix)), None)
period = None
for r in sheet("BÁO CÁO").iter_rows(max_row=8, values_only=True):
    ds = [D(x) for x in (r or []) if D(x)]
    if any(S(x).upper().startswith("TỪ NGÀY") for x in (r or [])) and len(ds) >= 2: period = [str(ds[0]), str(ds[1])]
def rows_of(ws, need):
    it = ws.iter_rows(values_only=True); h = None
    for r in it:
        u = [S(x).upper() for x in r]
        if need in u or any(x.startswith(need) for x in u): h = u; break
    return h, [r for r in it if r and any(r)]
nxt = {"period": period, "in": Counter(), "out": Counter(), "outDealer": Counter(), "returned": Counter(), "kgToMb": Counter()}
h, rs = rows_of(sheet("NHẬP XE"), "LOẠI XE")
for r in rs:
    m = S(r[h.index("LOẠI XE")]).upper()
    if m and S(r[0]).isdigit(): nxt["in"][m] += 1
h, rs = rows_of(sheet("XUẤT XE"), "LOẠI XE")
for r in rs:
    if not S(r[0]).isdigit(): continue
    nxt["out"][S(r[h.index("LOẠI XE")]).upper()] += 1; nxt["outDealer"][dealer(r[next(i for i, x in enumerate(h) if x.startswith("KHÁCH"))])] += 1
for key, pre in (("returned", "NHẬP LẠI"), ("kgToMb", "KG")):
    ws = sheet(pre)
    if not ws: continue
    h, rs = rows_of(ws, "LOẠI XE")
    for r in rs:
        if S(r[0]).isdigit(): nxt[key][S(r[next(i for i, x in enumerate(h) if x.startswith("KHÁCH"))])] += 1
nxt = {k: (dict(v.most_common()) if isinstance(v, Counter) else v) for k, v in nxt.items()}

F = {"asOf": period[1] if period else str(today), "source": "%s; %s (kho thành phẩm DAC)" % (os.path.basename(F_FILE), os.path.basename(F_NXT)),
     "def": {"chassis": "Chassis thành phẩm (chưa đóng thùng)", "fg": "Thành phẩm xe + thùng, sẵn bán", "wait": "Chờ xuất bán (đã có đơn, chờ giao)",
             "age": "Tuổi tồn = số ngày từ nhập kho thành phẩm (cột NGÀY TỒN KHO)"},
     "note": "Nhóm KHÁCH (xe khách hàng gửi) không tính vào tồn DAC. Không lưu số khung, số máy.",
     "items": out_items, "groups": {k: dict(v) for k, v in groups.items()},
     "pipeline": {"ckd": pipe["ckd"], "wipBody": pipe["wipBody"], "wipQC": pipe["wipQC"], "mbtb": pipe["mbtb"], "byGroup": {k: v for k, v in pipe.items() if ":" in k}},
     "consign": dict(consign.most_common()),
     "sellIn": {dl: {m: n for m, n in sorted(v.items()) if m >= "2025-01"} for dl, v in sorted(sell.items(), key=lambda z: -sum(z[1].values())) if any(m >= "2025-01" for m in v)},
     "sellInModel": {m: dict(v.most_common()) for m, v in sorted(sellModel.items()) if m >= "2025-01"},
     "sellInBody": {m: dict(v.most_common()) for m, v in sorted(sellBody.items()) if m >= "2025-01"}, "sellInColor": {m: dict(v.most_common()) for m, v in sorted(sellColor.items()) if m >= "2025-01"},
     "nxt": nxt}
json.dump(F, open(os.path.join(HERE, "factory.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
g = F["groups"]
print("tồn:", {k: v for k, v in g.items()}, "| pipeline:", {k: v for k, v in F["pipeline"].items() if k != "byGroup"}, "| ký gửi:", sum(consign.values()),
      "| sell-in 2026:", sum(n for v in sell.values() for m, n in v.items() if m.startswith("2026")), "| NXT", period, "nhập", sum(nxt["in"].values()), "xuất", sum(nxt["out"].values()))

# ---------- đối chiếu: sell-in theo file kho nhà máy ↔ TDBH (si, le) ↔ tồn thực tế tại đại lý (MoM) ----------
ALIAS = {"phú mỹ hg": "đt hậu giang", "phú mỹ hg kg": "đt kiên giang", "đt la": "đt long an", "đt tg": "đt tiền giang", "hưng vương": "hưng vượng", "đt đồng nai": "đt đồng nai"}
def key(s):
    s = unicodedata.normalize("NFC", str(s)).lower()
    s = re.split(r"\s*(?:>|=>)\s*", s)[-1]                      # xe chuyển giữa đại lý: tính cho nơi nhận cuối
    s = s.replace("đô thành ", "đt ").replace("ô tô ", "").replace("cn- ", "").replace("cn-", "").replace("-", " ").replace("/", " ").replace("viêt", "việt")
    s = re.sub(r"\s+", " ", s).strip(); return ALIAS.get(s, s)
try:
    SL = json.load(open(os.path.join(HERE, "sales.json"), encoding="utf-8")); INV = json.load(open(os.path.join(HERE, "inventory.json"), encoding="utf-8"))
    si = defaultdict(Counter)
    for dl, v in F["sellIn"].items():
        for m, n in v.items(): si[key(dl)][m] += n
    year = F["asOf"][:4]; last = int(F["asOf"][5:7]) - 1 or 1      # các tháng đã đóng
    rows, other = [], []
    for d in SL["dealers"]:
        k = key(d["name"]); ms = ["%s-%02d" % (year, i) for i in range(1, last + 1)]
        fs = sum(si[k][m] for m in ms); ts = sum(((d["m"].get(m) or {}).get("si") or 0) for m in ms); tl = sum(((d["m"].get(m) or {}).get("le") or 0) for m in ms)
        mom = next((x for x in INV["dealers"] if key(x["name"]) == k), None)
        if fs or ts or tl: rows.append({"dealer": d["name"], "region": d.get("region"), "fgSellIn": fs, "tdbhSellIn": round(ts), "tdbhRetail": round(tl), "diffSellIn": fs - round(ts),
                                        "stockMoM": mom["ton"] if mom else None, "sellInT11": si[k]["%s-%02d" % (year, last + 1)]})
    known = {key(d["name"]) for d in SL["dealers"]}
    other = sorted(([k, sum(n for m, n in v.items() if m.startswith(year))] for k, v in si.items() if k not in known and sum(n for m, n in v.items() if m.startswith(year))), key=lambda z: -z[1])
    F["recon"] = {"months": "T1–T%d/%s" % (last, year), "rows": rows, "other": other, "asOfStock": INV.get("asOf"),
                  "total": {k: sum((r[k] or 0) for r in rows) for k in ("fgSellIn", "tdbhSellIn", "tdbhRetail", "stockMoM")}}
    json.dump(F, open(os.path.join(HERE, "factory.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("đối chiếu", F["recon"]["months"], F["recon"]["total"], "| ngoài TDBH:", other[:8])
except Exception as e:
    print("bỏ qua đối chiếu:", e)
