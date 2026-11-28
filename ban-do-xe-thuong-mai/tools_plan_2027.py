#!/usr/bin/env python3
"""Tài sản tồn kho (giá trị, vốn DAC đang nằm tại đại lý, tuổi tồn, công nợ cọc 10%) + lộ trình 2027 (5.000 xe, thị phần 7%) → plan2027.json.

    python3 tools_plan_2027.py        (đọc inventory.json, factory.json, tx.json, pricelist.json, market2026.json, provinces.json, network.json, mkt2027.json, customers.json)

Nguyên tắc tính (ghi rõ để kiểm toán lại được):
- Giá trị xe = giá bán cho đại lý (bảng giá 19/11/2026) theo model × loại thùng; model đời cũ không còn trong bảng giá → giá model kế nhiệm cùng tải trọng (ghi "giá tham chiếu").
- Vốn DAC còn nằm tại đại lý (dư nợ): hợp đồng mua bán (HĐMB) đại lý mới trả 10% → DAC còn 90%; mua bán trả chậm (MBTB) trả 5% → còn 95%; ký gửi → 100%.
- Công nợ cọc 10%: danh sách xe đã thanh toán 10%, chưa thanh toán 100% (file giao dịch bán hàng), tuổi tính từ ngày thanh toán 10%.
  So với số xe HĐMB còn tồn thực tế tại đại lý (file tồn SR 21/11) → phần chênh = xe đã rời kho đại lý (bán cho khách) hoặc hồ sơ chưa đóng: phải đối soát.
- Tốc độ bán lẻ = trung bình 6 tháng gần nhất đủ tháng (T5–T10/2026, ngày thanh toán 100%).
- Chi phí vốn = dư nợ × lãi suất giả định (mặc định 8%/năm, sửa trong trang).
- Thị trường 2027: 5 phân khúc Đô Thành có sản phẩm, xe xăng/dầu (không gồm xe điện), quy năm 2026 theo tỷ lệ cả năm 2025 / 10T 2025.
Không lưu số khung, tên khách hàng.
"""
import collections, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
J = lambda f: json.load(open(os.path.join(HERE, f), encoding="utf-8"))
INV, FG, TX, PL, MK, PV, NET = J("inventory.json"), J("factory.json"), J("tx.json"), J("pricelist.json"), J("market2026.json"), J("provinces.json"), J("network.json")
MKT = J("mkt2027.json") if os.path.exists(os.path.join(HERE, "mkt2027.json")) else {}
CU = J("customers.json") if os.path.exists(os.path.join(HERE, "customers.json")) else {}
RATE_YEAR = 0.08
DBT = J("debt2026.json") if os.path.exists(os.path.join(HERE, "debt2026.json")) else None
DBD = {d["name"]: d for d in (DBT or {}).get("dealers", [])}
r0 = lambda x, n=0: round(x, n) if n else int(round(x))

# ---------------- bảng giá ----------------
def key(m):
    m = re.sub(r"^MISSU\s+", "", str(m).upper()).replace(" 2S", "").replace(" PLUS", "-PLUS").replace(" E5", "").strip()
    return m
BODY = lambda b: ("TK" if re.search(r"\bTK|KÍN|KIN\b", b.upper()) else "TMB" if re.search(r"TMB|MUI|BAT|BẠT", b.upper()) else "TL" if re.search(r"\bTL\b|LỬNG|LUNG", b.upper())
                  else "SATXI" if re.search(r"SATXI|CHASSIS|SÁT", b.upper()) else "XTL" if "XTL" in b.upper() or "TẬP LÁI" in b.upper() else "VAN" if "VAN" in b.upper() else "TMB")
P = collections.defaultdict(dict)
for it in PL["items"]:
    k, b = key(it["cmodel"]), BODY(it["body"])
    if b not in P[k] or it["dealer"] < P[k][b]: P[k][b] = it["dealer"]
# model đời cũ → model kế nhiệm cùng tải trọng (giá tham chiếu)
SUCC = {"IZ350-2.5T": "IZ50S", "IZ350SL": "IZ71SL-PLUS", "JP120M": "JP120SL", "JP55M": "IZ71SL-PLUS", "JP65M": "IZ71SL-PLUS", "HC8AA": "JP120EXL", "IZ65-1.9T": "IZ50S", "IZ65-3.5T": "IZ65M-PLUS",
        "IZ250": "IZ50S", "IZ200": "IZ50S", "IZ350": "IZ65M-PLUS", "IZ350-1.9T": "IZ50S", "IZ190SL": "IZ60SL-PLUS", "IZ500": "JP120SL", "IZ500L": "JP120SL", "IZ500SL": "JP120SL", "IZ650": "JP120SL",
        "IZ650-SE": "JP120SL", "IZ650SL": "JP120SL"}
NOPRICE = collections.Counter()
def price(model, body="TMB"):
    k = key(model); ref = False
    if k not in P and k in SUCC: k, ref = SUCC[k], True
    if k not in P: NOPRICE[key(model)] += 1; return None, False
    b = BODY(body or "TMB"); t = P[k]
    return (t.get(b) or t.get("TMB") or t.get("VAN") or sorted(t.values())[len(t)//2]), ref
def avg_price(model, bodies):
    tot = n = 0
    for b, c in (bodies or {"TMB": 1}).items():
        p, _ = price(model, b)
        if p: tot += p * c; n += c
    return tot / n if n else price(model)[0]
BODYMIX = {m["m"]: {BODY(k): v for k, v in m["bodies"].items()} for m in INV["models"]}

# ---------------- tốc độ bán lẻ (T5–T10/2026) ----------------
W = ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]
TM, TD, TB = TX["models"], TX["dealers"], TX["bodies"]
leM, leD, leY = collections.Counter(), collections.Counter(), collections.Counter()
le26 = 0
for ym, d, m, b, f, l, s, x in TX["tx"]:
    if ym in W: leM[key(TM[m])] += l; leD[TD[d]] += l
    if ym.startswith("2026") and ym <= "2026-10": le26 += l
    leY[ym] += l
rateM = {k: v / len(W) for k, v in leM.items()}; rateD = {k: v / len(W) for k, v in leD.items()}; rateAll = sum(leY[m] for m in W) / len(W)

# ---------------- tồn đại lý: giá trị + vốn DAC ----------------
DL = collections.OrderedDict()
for x in INV["dealers"]:
    if not x["ton"]: continue
    n = x["link"]; d = DL.setdefault(n, {"name": n, "region": x["region"], "ton": 0, "mb": 0, "mbtb": 0, "kg": 0, "age": collections.Counter(), "models": collections.Counter(), "manual": False, "leT11": 0})
    for k in ("ton", "mb", "mbtb", "kg", "leT11"): d[k] += x[k]
    d["age"].update(x["age"]); d["models"].update(x["models"]); d["manual"] = d["manual"] or x["manual"]
dealers = []
for n, d in DL.items():
    val = sum(avg_price(m, BODYMIX.get(m)) * c for m, c in d["models"].items() if avg_price(m, BODYMIX.get(m)))
    unit = val / d["ton"] if d["ton"] else 0
    expo = unit * (d["mb"] * 0.90 + d["mbtb"] * 0.95 + d["kg"] * 1.0)
    dz = DBD.get(n)
    if DBT: expo = (dz["total"] * 1e6 if dz else 0) + unit * d["kg"]
    over = dz["over"] if dz else 0; over90 = (dz["MB"]["bAmt"].get("> 90", 0) + dz["MBTB"]["bAmt"].get("> 90", 0)) if dz else 0; maxd = max(dz["MB"]["max"], dz["MBTB"]["max"]) if dz else 0
    rate = rateD.get(n, 0)
    cover = d["ton"] / rate if rate else None
    old = d["age"].get("181-365", 0) + d["age"].get(">365", 0)
    excess = max(0, d["ton"] - 2 * rate)
    dealers.append({"name": n, "region": d["region"], "ton": d["ton"], "mb": d["mb"], "mbtb": d["mbtb"], "kg": d["kg"], "manual": d["manual"], "value": r0(val / 1e6), "expo": r0(expo / 1e6),
                    "rate": r0(rate, 1), "cover": r0(cover, 1) if cover else None, "old": old, "o365": d["age"].get(">365", 0), "age": dict(d["age"]), "excess": r0(excess),
                    "excessExpo": r0(excess * unit * (expo / val if val else .92) / 1e6), "carry": r0(expo * RATE_YEAR / 12 / 1e6, 1), "over": over, "over90": over90, "maxDays": maxd, "debtN": (dz["MB"]["n"] + dz["MBTB"]["n"]) if dz else 0, "models": dict(d["models"].most_common())})
TOTV, TOTE = sum(d["value"] for d in dealers), sum(d["expo"] for d in dealers)
# phân loại Eisenhower: KHẨN = tồn > 3 tháng bán hoặc ≥ 10% xe quá 180 ngày hoặc có xe > 365 ngày; QUAN TRỌNG = dư nợ ≥ 3% tổng hoặc ≥ 40 xe
for d in dealers:
    urgent = (d["cover"] is None or d["cover"] > 3) or (d["ton"] and d["old"] / d["ton"] >= .10) or d["o365"] > 0 or d["over90"] > 0
    imp = d["expo"] >= .03 * TOTE or d["ton"] >= 40
    d["q"] = 1 if urgent and imp else 2 if imp else 3 if urgent else 4
    d["why"] = "; ".join(filter(None, [
        ("tồn " + (f"{d['cover']:.1f}".replace(".", ",") + " tháng bán" if d["cover"] else "không có bán lẻ T5–T10")) if (d["cover"] is None or d["cover"] > 3) else "",
        f"{d['old']} xe > 180 ngày" if d["old"] else "", f"{d['o365']} xe > 365 ngày" if d["o365"] else "",
        f"nợ quá hạn {d['over']/1000:.1f} tỷ (lâu nhất {d['maxDays']} ngày)".replace(".", ",") if d["over"] else "",
        f"dư nợ {d['expo']/1000:.1f} tỷ".replace(".", ",") if imp else "", "số tồn nhập tay, chưa có từng xe" if d["manual"] else ""]))
dealers.sort(key=lambda d: (d["q"], -d["expo"]))

# ---------------- công nợ cọc 10% (file giao dịch) so với tồn HĐMB thực tế ----------------
pend = collections.defaultdict(lambda: {"n": 0, "v": 0, "age": collections.Counter(), "year": collections.Counter()})
for di, mi, bi, a, y, n in TX["pend"]:
    p, _ = price(TM[mi], TB[bi] if bi is not None and bi < len(TB) else "TMB")
    z = pend[TD[di]]; z["n"] += n; z["v"] += (p or 0) * n; z["age"][a] += n; z["year"][y] += n
debt = []
for n, z in pend.items():
    mb = DL[n]["mb"] if n in DL else 0
    gap = max(0, z["n"] - mb)
    unit = z["v"] / z["n"] if z["n"] else 0
    debt.append({"name": n, "pend": z["n"], "mbStock": mb, "gap": gap, "gapExpo": r0(gap * unit * .9 / 1e6), "expo": r0(z["v"] * .9 / 1e6), "age": dict(z["age"]), "o365": z["age"].get(">365", 0),
                 "old": z["year"].get(2022, 0) + z["year"].get(2023, 0) + z["year"].get(2024, 0)})
debt.sort(key=lambda x: -x["gapExpo"])
DEBT = {"pend": sum(x["pend"] for x in debt), "mbStock": INV["contracts"].get("Mua bán", 0), "gap": sum(x["gap"] for x in debt), "gapExpo": sum(x["gapExpo"] for x in debt),
        "expo": sum(x["expo"] for x in debt), "age": dict(sum((collections.Counter(x["age"]) for x in debt), collections.Counter())), "old": sum(x["old"] for x in debt), "rows": debt}

# ---------------- tồn nhà máy + chuỗi cung ứng theo model ----------------
fgM = collections.defaultdict(lambda: {"fg": 0, "wait": 0, "chassis": 0, "v": 0, "age90": 0})
for it in FG["items"]:
    k = key(it["model"]) if it["group"] != "DAEWOO" else it["model"]
    z = fgM[k]; z["fg"] += it["fg"]; z["wait"] += it["wait"]; z["chassis"] += it["chassis"]; z["age90"] += it["age90"]
    p, _ = price(it["model"], it["body"]); z["v"] += (p or 0) * (it["fg"] + it["wait"] + it["chassis"])
models = []
for m in sorted(set(fgM) | {key(x["m"]) for x in INV["models"]}):
    im = next((x for x in INV["models"] if key(x["m"]) == m), None)
    dt = im["ton"] if im else 0; f = fgM.get(m, {"fg": 0, "wait": 0, "chassis": 0, "v": 0, "age90": 0}); rate = rateM.get(m, 0)
    sysS = dt + f["fg"] + f["chassis"]
    if sysS < 3 and rate < 1: continue
    models.append({"m": m, "dealer": dt, "fg": f["fg"], "wait": f["wait"], "chassis": f["chassis"], "fgOld": f["age90"], "rate": r0(rate, 1), "sys": sysS,
                   "cover": r0(sysS / rate, 1) if rate else None, "coverDealer": r0(dt / rate, 1) if rate else None, "valueFg": r0(f["v"] / 1e6),
                   "valueDealer": r0(avg_price(m, BODYMIX.get(im["m"] if im else m)) * dt / 1e6) if dt and avg_price(m, BODYMIX.get(im["m"] if im else m)) else 0,
                   "excess": r0(max(0, sysS - 3 * rate))})
models.sort(key=lambda x: -(x["excess"]))
FGV = sum(x["valueFg"] for x in models)
PIPE = FG["pipeline"]

# ---------------- thị trường 2027 + mục tiêu 5.000 xe / 7% ----------------
SEG = ["Van", "Small Trucks I", "Small Trucks II", "Light Trucks I", "Light Trucks II"]
VN = {"Van": "Van (< 1 tấn)", "Small Trucks I": "Tải nhỏ I (< 1,5 tấn)", "Small Trucks II": "Tải nhỏ II (1,5–2,5 tấn)", "Light Trucks I": "Tải nhẹ I (2,5–3,5 tấn)", "Light Trucks II": "Tải nhẹ II (3,5–5 tấn)"}
PROD = {"Van": "V56, V65", "Small Trucks I": "MISSU T26, T33L", "Small Trucks II": "IZ45S, IZ50S, IZ50M, IZ50M Plus, IZ60SL Plus", "Light Trucks I": "IZ62M, IZ65M Plus, IZ71SL Plus", "Light Trucks II": "JP120SL, JP120EXL"}
N = MK["national"]; RS = MK["rankSeg10T"]
TGT = {"Van": .040, "Small Trucks I": .050, "Small Trucks II": .070, "Light Trucks I": .150, "Light Trucks II": .050}
LEVER = {"Van": "Van giao hàng nội đô: gói TMĐT, chuyển phát; lái thử tại bãi logistics; trả góp 0 đồng phí hồ sơ.",
         "Small Trucks I": "MISSU T26/T33L thay xe ba gác, tải nhỏ cũ hết niên hạn: roadshow chợ đầu mối, hợp tác xã nông sản.",
         "Small Trucks II": "Phân khúc lớn nhất (KIA, Hyundai, Isuzu): IZ50S/IZ45S bán sắt si cho cơ sở đóng thùng, giá lăn bánh dưới đối thủ Hàn 10–15%.",
         "Light Trucks I": "Thế mạnh (top 4): giữ chắc IZ65M Plus, IZ71SL Plus; đánh JAC bằng bảo hành, phụ tùng sẵn, đội xe doanh nghiệp.",
         "Light Trucks II": "Gần như chưa có thị phần: JP120 cho logistics liên tỉnh, vật liệu xây dựng; cần chính sách giới thiệu và xe mẫu tại 6 đại lý lớn."}
seg = []
for s in SEG:
    n = N[s]; ann = n["m10_2026"] * n["y2025"] / n["m10_2025"]
    dt10 = dict(RS.get(s, [])).get("DOTHANH", 0); dt26 = dt10 * n["y2025"] / n["m10_2025"]
    rank = next((i + 1 for i, (b, v) in enumerate(RS.get(s, [])) if b == "DOTHANH"), None)
    seg.append({"seg": s, "name": VN[s], "products": PROD[s], "market26": r0(ann), "dt10": dt10, "dt26": r0(dt26), "share26": r0(dt10 / n["m10_2026"] * 100, 1), "rank": rank,
                "leader": RS[s][0][0] if RS.get(s) else "", "leaderShare": r0(RS[s][0][1] / n["m10_2026"] * 100, 1) if RS.get(s) else None,
                "tShare": TGT[s] * 100, "lever": LEVER[s]})
M26 = sum(x["market26"] for x in seg); DT26 = sum(x["dt26"] for x in seg)
SCEN = [{"name": "Thị trường đi ngang", "g": 0.0}, {"name": "Tăng 5%", "g": .05}, {"name": "Giảm 5%", "g": -.05}]
for sc in SCEN:
    m27 = M26 * (1 + sc["g"]); sc["market27"] = r0(m27); sc["need5000"] = r0(5000 / m27 * 100, 2); sc["at7"] = r0(m27 * .07)
for x in seg:
    x["target27"] = r0(x["market26"] * TGT[x["seg"]]); x["gap"] = x["target27"] - x["dt26"]
T27 = sum(x["target27"] for x in seg)

# tỉnh: dư địa theo ĐK thực T10/2026 (phân khúc có sản phẩm) × 12, đến thị phần 7%
dealersBy = collections.Counter(d.get("province") for d in NET["dealers"])
prov = []
for r in PV:
    a = r.get("regT10addr") or 0; dt = r.get("regT10dtAddr") or 0
    if a < 15: continue
    gap = max(0, .07 * a - dt) * 12
    prov.append({"p": r["name"], "mkt": a, "dt": dt, "share": r0(dt / a * 100, 1) if a else 0, "dealers": dealersBy.get(r["name"], 0), "gap12": r0(gap)})
prov.sort(key=lambda x: -x["gap12"])

# cầu nối 2026 → 2027 (nguồn tăng trưởng định lượng)
mk = (MKT.get("plan") or [])
mktSold = sum(p.get("sold", 0) for p in mk)
loy = CU.get("loyalty") or {}
custN = loy.get("customers") or 4695; rep = loy.get("repeat") or 251
est26 = le26 + 2 * rateAll   # bán lẻ 2026 ước: T1–T10 thực + T11, T12 theo tốc độ 6 tháng
BRIDGE = [
    {"src": "Nền 2026 (bán lẻ ước cả năm)", "n": r0(est26), "how": f"T1–T10 thực {le26:.0f} xe (ngày TT 100%) + T11–T12 theo tốc độ 6 tháng {rateAll:.0f} xe/tháng"},
    {"src": "Đại lý hiện hữu nâng năng suất", "n": 700, "how": "26 đại lý; nhóm A giữ nhịp, nhóm B/C lên mức trung vị (tư vấn bán hàng, xe mẫu, lái thử); TP.HCM và Hà Nội từ 2,3–2,5% lên 5%"},
    {"src": "Mở đại lý / điểm bán mới tỉnh trắng", "n": 450, "how": "8–10 điểm (Thái Nguyên, Quảng Ninh, Hà Tĩnh, Tuyên Quang, Ninh Bình, Cà Mau, Khánh Hòa, Huế, Đồng Nai thứ 2, Phú Thọ thứ 2) × 45–60 xe năm đầu"},
    {"src": "Chiến dịch MKT offline 2027", "n": mktSold, "how": f"Kế hoạch 34 tỉnh: {sum(p.get('events',0) for p in mk)} buổi lưu động, {sum(p.get('seminars',0) for p in mk)} hội thảo → {sum(p.get('leads',0) for p in mk):,} khách → {sum(p.get('testDrive',0) for p in mk):,} lái thử → {mktSold} xe".replace(",", ".")},
    {"src": "Khách cũ mua lại + giới thiệu", "n": 300, "how": f"{custN:,} khách 2023–2026 ({rep} khách đã mua lại): gọi chăm sóc sau 1/6/12 tháng; tỷ lệ mua lại 5% → 8% và mỗi khách trung thành giới thiệu".replace(",", ".")},
    {"src": "Đội xe doanh nghiệp, dự án (fleet)", "n": 350, "how": "Logistics, TMĐT, vật liệu xây dựng, nước đá, môi trường: 20–25 hợp đồng 10–20 xe; giá dự án + bảo dưỡng trọn gói"},
    {"src": "Sản phẩm mở phân khúc (JP120, Van)", "n": 200, "how": "Tải nhẹ II từ 0,7% lên 2–3% + Van từ 2% lên 3%: xe mẫu tại 6 đại lý lớn, chính sách giới thiệu"}]
BR_T = sum(b["n"] for b in BRIDGE)

# lộ trình theo tháng 2027 (mùa vụ theo kế hoạch ERP, chuẩn hóa về 5.000)
S = J("sales.json")["plan"].get("kh27m") or [1] * 12
mon = [r0(5000 * v / sum(S)) for v in S]; mon[-1] += 5000 - sum(mon)

out = {"asOf": INV["asOf"], "rateYear": RATE_YEAR, "W": [W[0], W[-1]], "rateAll": r0(rateAll, 1),
       "note": "Giá trị theo giá bán cho đại lý (bảng giá 19/11/2026), không phải giá vốn. Vốn DAC tại đại lý = số tiền còn nợ theo báo cáo công nợ kế toán (HĐMB); xe MBTB ước = giá bán cho đại lý × 95%; xe ký gửi 100%.",
       "noPrice": dict(NOPRICE),
       "stock": {"ton": INV["total"], "mb": INV["contracts"].get("Mua bán", 0), "mbtb": INV["contracts"].get("MBTB", 0), "kg": INV["contracts"].get("Ký gửi", 0), "value": TOTV, "expo": TOTE,
                 "carryMonth": r0(TOTE * RATE_YEAR / 12, 0), "cover": r0(INV["total"] / rateAll, 1), "excess": sum(d["excess"] for d in dealers), "excessExpo": sum(d["excessExpo"] for d in dealers),
                 "age": INV["age"]["buckets"], "withAge": INV["age"]["withPayDate"], "y2025": INV["age"]["model2025"]},
       "factory": {"fg": sum(x["fg"] for x in models), "wait": sum(x["wait"] for x in models), "chassis": sum(x["chassis"] for x in models), "value": FGV, "pipeline": PIPE, "asOf": FG["asOf"],
                   "sysCover": r0((INV["total"] + sum(x["fg"] + x["chassis"] for x in models)) / rateAll, 1), "sysCoverCkd": r0((INV["total"] + sum(x["fg"] + x["chassis"] for x in models) + PIPE["ckd"] + PIPE["wipBody"] + PIPE["wipQC"]) / rateAll, 1)},
       "dealers": dealers, "debt": DEBT, "acct": DBT, "models": models,
       "market": {"m26": M26, "dt26": DT26, "share26": r0(DT26 / M26 * 100, 2), "scen": SCEN, "seg": seg, "t27": T27, "tShare": r0(T27 / M26 * 100, 2)},
       "prov": prov[:15], "bridge": BRIDGE, "bridgeTotal": BR_T, "monthly27": mon, "est26": r0(est26), "le26": le26}
json.dump(out, open(os.path.join(HERE, "plan2027.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

# ---------------- so sánh đối thủ (sản phẩm, dịch vụ, nhận diện, chính sách) từ competitors.json + compnet.json + báo cáo DAC ----------------
CP, CN = J("competitors.json"), J("compnet.json")
R10 = dict(MK["rank10T"]); RK = [b for b, _ in MK["rank10T"]]
MK10 = sum(N[s]["m10_2026"] for s in SEG)
def rng(items):
    v = [x for i in items for x in (i.get("minRetail"), i.get("maxRetail")) if x]
    return [r0(min(v) / 1e6), r0(max(v) / 1e6)] if v else None
vs = [{"k": "dothanh", "name": "Đô Thành (IZ, MISSU, JP)", "brand": "DOTHANH", "share": r0(R10.get("DOTHANH", 0) / MK10 * 100, 1), "rank": RK.index("DOTHANH") + 1 if "DOTHANH" in RK else None,
       "origin": "Lắp ráp tại Việt Nam (DAC): dòng IZ (diesel), MISSU (xăng), JP 7,5 tấn", "range": [r0(min(i["retail"] for i in PL["items"]) / 1e6), r0(max(i["retail"] for i in PL["items"]) / 1e6)],
       "models": len({i["cmodel"] for i in PL["items"]}), "network": f"{len(NET['dealers'])} đại lý, {len(NET['stations'])} trạm dịch vụ ủy quyền", "netN": len(NET["dealers"]),
       "svc": "Đại lý 3S/2S và trạm dịch vụ ủy quyền; phụ tùng từ nhà máy DAC", "promo": "Giảm tối đa 3 triệu/xe so với giá bán lẻ tối thiểu (bảng giá 19/11/2026); chính sách thưởng đại lý 2026 (mục Chính sách hỗ trợ bán hàng)",
       "insight": "Giá thực bán thấp hơn JAC 35–80 triệu ở dải 1,9–3,5 tấn; mạnh tải nhẹ I (hạng 4); yếu Van, tải nhỏ I và tải nhẹ II."}]
for b in CP["brands"]:
    nb = CN["brands"].get(b["k"], {}); bk = {"thaco": "THACO", "teraco": "TERACO", "jac": "JAC", "foton": "FOTON", "tmt": "TMT"}.get(b["k"], b["name"].upper())
    vs.append({"k": b["k"], "name": b["name"], "brand": bk, "share": r0(R10.get(bk, 0) / MK10 * 100, 1), "rank": RK.index(bk) + 1 if bk in RK else None, "origin": b.get("origin", ""), "maker": b.get("maker", ""),
               "range": rng(b["items"]), "models": len({i["model"] for i in b["items"]}), "network": nb.get("total", ""), "netN": nb.get("totalN"), "svc": nb.get("svc", ""),
               "promo": b.get("promoDoc", ""), "promoRules": (b.get("promoRules") or [])[:3], "price": b.get("priceDoc", ""), "insight": " ".join((b.get("insight") or [])[:2]),
               "profile": (b.get("profile") or [])[:2], "vsDT": b.get("vsDT") or [], "recs": b.get("recs") or [], "src": (b.get("sources") or [])[:3] + (nb.get("src") and [nb["src"]] or [])})
for bk, nm in (("KIA", "KIA (THACO phân phối)"), ("HYUNDAI", "Hyundai"), ("ISUZU", "Isuzu"), ("SRM", "SRM"), ("SUZUKI", "Suzuki")):
    nb = CN["brands"].get(bk.lower(), {})
    vs.append({"k": bk.lower(), "name": nm, "brand": bk, "share": r0(R10.get(bk, 0) / MK10 * 100, 1), "rank": RK.index(bk) + 1 if bk in RK else None, "network": nb.get("total", ""), "netN": nb.get("totalN"), "svc": nb.get("svc", ""), "lite": True})
ORIG = {"KIA": "Hàn Quốc, THACO lắp ráp tại Chu Lai", "HYUNDAI": "Hàn Quốc, lắp ráp tại Việt Nam", "ISUZU": "Nhật Bản, Isuzu Việt Nam lắp ráp", "SRM": "Trung Quốc", "SUZUKI": "Nhật Bản"}
for v in vs:
    ss = sorted(((dict(RS.get(sg, [])).get(v["brand"], 0) / N[sg]["m10_2026"] * 100, sg) for sg in SEG), reverse=True)
    v["segs"] = "; ".join(f"{VN[sg].split(' (')[0]} {sh:.1f}%".replace(".", ",") for sh, sg in ss if sh >= 1)[:200]
    if v.get("lite"): v["origin"] = ORIG.get(v["brand"], ""); v["insight"] = "Thị phần 10T/2026 theo phân khúc: " + v["segs"]
vs.sort(key=lambda x: x["rank"] or 99)
out["vs"] = vs; out["mk10"] = MK10
json.dump(out, open(os.path.join(HERE, "plan2027.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("So sánh:", [(v["name"], v["share"], v["rank"]) for v in vs])

# ---------------- chỉ tiêu 2027 từng đại lý và điểm cấp 1 mới (kế hoạch phát triển Khối Kinh doanh 2027) ----------------
# [đại lý, bán lẻ 12 tháng 11/2025–10/2026, tư vấn hiện có, cam kết 2027, KPI 2027, tư vấn bổ sung]
DEALER_TARGETS = [["ĐT Đông Nam", 602, 7, 868, 1010, 13], ["Trường Vũ", 466, 21, 672, 783, 10], ["Quang Dương", 214, 6, 308, 359, 5], ["ĐT Đà Nẵng", 172, 7, 248, 289, 4], ["Tân Vạn", 155, 9, 223, 260, 3], ["Vũ Hùng", 149, 5, 215, 250, 3],
  ["ĐT Hậu Giang", 125, 6, 180, 210, 3], ["Phú Mỹ", 117, 9, 169, 196, 3], ["ĐT Long An", 98, 6, 141, 165, 2], ["ĐT Kiên Giang", 92, 5, 133, 154, 2], ["Phi Hưng", 84, 4, 121, 141, 2], ["Việt Nhật Anh", 71, 5, 102, 119, 2],
  ["Mỹ Phú Hưng", 68, 5, 98, 114, 1], ["Ô Tô 19/5", 63, 5, 91, 106, 1], ["Hưng Vượng", 48, 2, 69, 81, 1], ["Ô Tô Tây Nguyên", 38, 9, 55, 64, 1], ["Hồng Vinh", 36, 1, 52, 60, 1], ["ĐT Tiền Giang", 35, 4, 50, 59, 1],
  ["Phúc Châu", 34, 3, 49, 57, 1], ["Dũng Lạc", 22, 3, 32, 37, 0], ["Hùng Tuyến", 14, 2, 20, 24, 0], ["Cương Nguyễn", 14, 2, 20, 24, 0], ["ĐT Bình Thuận", 14, 5, 20, 24, 0]]
# điểm cấp 1 bổ sung: [tên, tỉnh, cách làm, nâng cấp từ (tên đại lý cấp 2 trong danh mục) hoặc null, mỏ neo (cảng/KCN trong infra.json hoặc [lng, lat]), cấp 1 từ, thị phần tỉnh hiện tại %, mục tiêu +20% %]
NEW_L1 = [["Auto Đông Nam – CN Chương Mỹ", "Hà Nội", "Nâng cấp", "Auto Đông Nam - CN Chương Mỹ", None, "01/03/2027", 2.3, 2.8], ["Auto Đông Nam – CN Nam Định", "Ninh Bình", "Nâng cấp", "Auto Đông Nam - CN Nam Định", None, "01/03/2027", 2.2, 2.6],
  ["Bắc Ninh (chọn 1 trong 3: Quang Phát, Hùng Ngân Phát, Nhật Dương)", "Bắc Ninh", "Nâng cấp", "Ô Tô Nhật Dương", None, "01/03/2027", 3.8, 4.6], ["Ô Tô Tây Nguyên – CN Khánh Hòa", "Khánh Hòa", "Nâng cấp", "Ô Tô Tây Nguyên - CN Khánh Hòa", None, "01/05/2027", 2.4, 2.9],
  ["Ô Tô Hiền Nhung", "Phú Thọ", "Nâng cấp", "Ô Tô Hiền Nhung", None, "01/05/2027", 5.5, 6.6], ["Phú Mỹ – Cái Mép", "TP. Hồ Chí Minh", "Mở mới", None, "Cảng Cái Mép – Thị Vải", "01/06/2027", 2.5, 3.0],
  ["Khu kinh tế Nghi Sơn", "Thanh Hóa", "Mở mới", None, "Cảng Nghi Sơn", "01/06/2027", 1.5, 1.8], ["Khu vực Quy Nhơn", "Gia Lai", "Mở mới", None, "Cảng Quy Nhơn", "01/06/2027", 3.2, 3.8],
  ["Khu vực Dung Quất – Chu Lai", "Quảng Ngãi", "Mở mới", None, "Cảng Dung Quất", "01/06/2027", 4.0, 4.8], ["Hạ Long – Cẩm Phả", "Quảng Ninh", "Mở mới", None, "Cảng Cái Lân", "01/08/2027", 1.6, 1.9],
  ["Kỳ Anh", "Hà Tĩnh", "Mở mới", None, "Cảng Vũng Áng", "01/08/2027", 4.1, 4.9], ["Khu vực Chân Mây", "Huế", "Mở mới", None, "Cảng Chân Mây", "01/08/2027", 4.8, 5.8], ["Khu vực Đồng Hới", "Quảng Trị", "Mở mới", None, [106.62, 17.47], "01/08/2027", 2.4, 2.9]]
out["dealerPlan"] = {"dealers": DEALER_TARGETS, "newL1": NEW_L1, "note": "Chỉ tiêu theo tỷ trọng bán lẻ 12 tháng; điểm mới: vị trí dự kiến tại cảng, khu công nghiệp, chưa phải địa chỉ thật."}
json.dump(out, open(os.path.join(HERE, "plan2027.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

# ---------------- in kiểm tra ----------------
ty = lambda v: f"{v/1000:,.1f} tỷ".replace(",", "X").replace(".", ",").replace("X", ".")
s = out["stock"]
print(f"Tồn đại lý {s['ton']} xe = {ty(s['value'])}; vốn DAC tại đại lý {ty(s['expo'])}; lãi vốn {RATE_YEAR:.0%}/năm ≈ {s['carryMonth']} tr/tháng; {s['cover']} tháng bán (tốc độ {rateAll:.0f} xe/tháng)")
print(f"Vượt mức 2 tháng bán: {s['excess']} xe, dư nợ {ty(s['excessExpo'])}")
print(f"Kho NM {out['factory']['fg']} TP + {out['factory']['chassis']} chassis = {ty(FGV)}; toàn hệ thống {out['factory']['sysCover']} tháng; cả CKD/WIP {out['factory']['sysCoverCkd']} tháng")
print(f"Công nợ cọc 10%: {DEBT['pend']} xe, dư nợ {ty(DEBT['expo'])}; HĐMB còn tồn {DEBT['mbStock']}; chênh {DEBT['gap']} xe ≈ {ty(DEBT['gapExpo'])}; tuổi {DEBT['age']}; đời 2022–2024: {DEBT['old']}")
print("Không có giá:", dict(NOPRICE))
print("Q:", collections.Counter(d["q"] for d in dealers))
for d in dealers[:10]: print(" ", d["q"], d["name"], d["ton"], d["cover"], d["old"], d["expo"], d["why"])
print("Model vượt 3 tháng:", [(m["m"], m["sys"], m["rate"], m["cover"], m["excess"]) for m in models[:8]])
print(f"TT 2026 quy năm {M26}; DT {DT26} = {DT26/M26*100:.2f}%; mục tiêu phân khúc {T27} = {T27/M26*100:.2f}%")
for x in seg: print(" ", x["name"], x["market26"], x["dt26"], x["share26"], "#", x["rank"], "→", x["tShare"], x["target27"], "+", x["gap"])
print("Kịch bản:", SCEN)
print("Cầu nối:", BR_T, [(b["src"], b["n"]) for b in BRIDGE])
print("Tỉnh:", [(p["p"], p["share"], p["gap12"]) for p in prov[:10]])
print("Tháng 2027:", mon, sum(mon))
