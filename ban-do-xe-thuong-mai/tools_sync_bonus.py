"""Đồng bộ Báo cáo thưởng chính sách DAC 2026 (file xlsx) → bonus2026.json + cập nhật số bán 2026 trên bản đồ.
Chạy: python3 tools_sync_bonus.py "<file.xlsx>"
- Chỉ xuất số tổng hợp (không tên TVBH, không số khung) lên bản đồ.
- Bán lẻ 2026 của 15 đại lý cấp 1 Bắc / Nam / Tây theo file (hóa đơn bán lẻ tại điểm bán); Miền Trung, Việt Nhật Anh, ĐT Bình Thuận giữ TDBH.
- Số bán theo tỉnh: ghi nhận tại điểm bán (đại lý cấp 2 về đúng tỉnh); KH của đại lý cấp 1 chia theo tỷ trọng bán.
"""
import openpyxl, sys, json, collections, unicodedata
F = sys.argv[1]
wb = openpyxl.load_workbook(F, data_only=True)
N = lambda s: unicodedata.normalize("NFC", str(s or "")).upper().strip()
C1 = {"ĐT ĐÔNG NAM": "ĐT Đông Nam", "QUANG DƯƠNG": "Quang Dương", "Ô TÔ 19-5": "Ô Tô 19/5", "VŨ HÙNG": "Vũ Hùng", "ĐÔ THÀNH TÂN VẠN": "Tân Vạn", "ĐÔ THÀNH PHÚ MỸ": "Phú Mỹ",
      "HƯNG VƯỢNG": "Hưng Vượng", "TRƯỜNG VŨ": "Trường Vũ", "ĐÔ THÀNH HẬU GIANG": "ĐT Hậu Giang", "ĐÔ THÀNH KIÊN GIANG": "ĐT Kiên Giang", "MỸ PHÚ HƯNG": "Mỹ Phú Hưng",
      "ĐÔ THÀNH LONG AN": "ĐT Long An", "ĐÔ THÀNH TIỀN GIANG": "ĐT Tiền Giang", "HỒNG VINH": "Hồng Vinh", "PHÚC CHÂU": "Phúc Châu"}
# điểm bán (cột Đại lý tổng hợp) → id đại lý cấp 2 trên bản đồ; điểm còn lại là chính đại lý cấp 1
C2 = {"Khánh Chi": 25, "Ngân Phát": 28, "Thiên Trường": 29, "An Mạnh": 24, "Mỹ An": 26, "Hiền Nhung": 27, "Sunray": 30, "Ô tô Quang Phát": 35, "Ô tô Nhật Dương": 34}
POINT_C1 = {"Đông Nam": "ĐT Đông Nam", "Quang Dương": "Quang Dương", "Ô tô 19-5": "Ô Tô 19/5", "Vũ Hùng": "Vũ Hùng", "Đô Thành Tân Vạn": "Tân Vạn", "Đô Thành Phú Mỹ": "Phú Mỹ", "Hưng Vượng": "Hưng Vượng",
            "Trường Vũ": "Trường Vũ", "Đô Thành Hậu Giang": "ĐT Hậu Giang", "Đô Thành Kiên Giang": "ĐT Kiên Giang", "Mỹ Phú Hưng": "Mỹ Phú Hưng", "Đô Thành Long An": "ĐT Long An",
            "Đô Thành Tiền Giang": "ĐT Tiền Giang", "Hồng Vinh": "Hồng Vinh", "Phúc Châu": "Phúc Châu"}

def sheet_rows(name):
    return [list(r) for r in wb[name].iter_rows(values_only=True)]

# ---------- dữ liệu nguồn (từng xe / từng dòng TVBH) ----------
src = sheet_rows("DỮ LIỆU NGUỒN"); hdr = src[3]; rows = [dict(zip(hdr, r)) for r in src[4:] if r[0]]
# ---------- rà soát số khung trùng: mỗi xe chỉ tính cho đại lý xuất hóa đơn sau cùng ----------
import re as _re
def _raw(r): return _re.sub(r"[^A-Z0-9]", "", str(r["Số khung gốc"] or "").upper())
def _fam(r):
    m = _re.sub(r"[^A-Z0-9]", "", str(r["Model gốc"] or "").upper()).replace("MISSU", "")
    x = _re.match(r"([VT]\d\d)", m); return x.group(1) if x else None
# mã đầu (7 ký tự) chuẩn của dòng MISSU theo đa số số khung 17 ký tự trong file
_pre = collections.defaultdict(collections.Counter)
for r in rows:
    v = _raw(r)
    if len(v) == 17 and _fam(r): _pre[_fam(r)][v[:7]] += 1
PRE = {k: c.most_common(1)[0][0] for k, c in _pre.items()}
vinfix = []
def _vin(r):
    v = _raw(r)
    if len(v) == 18 and v[11] == "0": v = v[:11] + v[12:]          # thừa một số 0 ở phần số thứ tự
    f = _fam(r)
    if len(v) == 17 and f in PRE and v[:7] != PRE[f] and v[:4] == PRE[f][:4]: v = PRE[f] + v[7:]   # sai mã dòng xe (V56 ↔ V65…)
    if v != _raw(r) and len(_raw(r)) >= 17 and not any(x["from"] == "…" + _raw(r)[-8:] and x["dl"] == r["Đại lý tổng hợp"] and x["date"] == str(r["Ngày HĐ / kỳ nguồn"])[:10] for x in vinfix): vinfix.append({"dl": r["Đại lý tổng hợp"], "model": str(r["Model gốc"]), "date": str(r["Ngày HĐ / kỳ nguồn"])[:10], "from": "…" + _raw(r)[-8:], "to": "…" + v[-8:]})
    return v
def _mdl(r): return _re.sub(r"[^A-Z0-9]", "", str(r["Model gốc"] or "").upper()).replace("PLUS", "PL")
dup = []; drop = set(); kept_dup = set()
byvin = collections.defaultdict(list)
for i, r in enumerate(rows):
    if len(_vin(r)) >= 17: byvin[_vin(r)].append(i)
pairs = [ix for ix in byvin.values() if len(ix) > 1]
# đại lý "sau cùng" theo ngày hóa đơn; cùng ngày thì theo chiều đa số của cùng cặp đại lý
win = collections.Counter()
for ix in pairs:
    ds = sorted(ix, key=lambda i: str(rows[i]["Ngày HĐ / kỳ nguồn"]))
    if str(rows[ds[-1]]["Ngày HĐ / kỳ nguồn"]) != str(rows[ds[-2]]["Ngày HĐ / kỳ nguồn"]): win[(rows[ds[-2]]["Đại lý tổng hợp"], rows[ds[-1]]["Đại lý tổng hợp"])] += 1
for ix in pairs:
    ds = sorted(ix, key=lambda i: str(rows[i]["Ngày HĐ / kỳ nguồn"]))
    last = ds[-1]
    if str(rows[ds[-1]]["Ngày HĐ / kỳ nguồn"]) == str(rows[ds[-2]]["Ngày HĐ / kỳ nguồn"]):
        a_, b_ = rows[ds[-2]]["Đại lý tổng hợp"], rows[ds[-1]]["Đại lý tổng hợp"]
        last = ds[-2] if win[(b_, a_)] > win[(a_, b_)] else ds[-1]
    for i in ix:
        if i != last: drop.add(i)
    kept_dup.add(last)
    dup.append({"vin": "…" + _vin(rows[last])[-6:], "model": str(rows[last]["Model gốc"]), "kept": rows[last]["Đại lý tổng hợp"], "keptDate": str(rows[last]["Ngày HĐ / kỳ nguồn"])[:10],
                "dropped": [rows[i]["Đại lý tổng hợp"] + " " + str(rows[i]["Ngày HĐ / kỳ nguồn"])[:10] for i in ix if i != last], "rule": "hóa đơn sau cùng" if last == sorted(ix, key=lambda i: str(rows[i]["Ngày HĐ / kỳ nguồn"]))[-1] and str(rows[ix[0]]["Ngày HĐ / kỳ nguồn"]) != str(rows[ix[1]]["Ngày HĐ / kỳ nguồn"]) else "cùng ngày: theo chiều bán của các xe trùng còn lại"})
# số khung rút gọn trùng trong cùng đại lý + cùng model + cùng ngày + cùng TVBH = nhập trùng
seen = {}
for i, r in enumerate(rows):
    v = _vin(r)
    if 2 <= len(v) < 17 and v.isdigit() and int(v) > 1:
        k = (r["Đại lý tổng hợp"], v, _mdl(r), str(r["Ngày HĐ / kỳ nguồn"]), r["Họ và tên TVBH"])
        if k in seen:
            drop.add(i); dup.append({"vin": "…" + v, "model": str(r["Model gốc"]), "kept": r["Đại lý tổng hợp"], "keptDate": str(r["Ngày HĐ / kỳ nguồn"])[:10], "dropped": [r["Đại lý tổng hợp"] + " (dòng nhập lặp)"], "rule": "số khung rút gọn, cùng model, ngày, TVBH"})
        else: seen[k] = i
rows_all = rows; rows = [r for i, r in enumerate(rows_all) if i not in drop]
kept_rows = [rows_all[i] for i in kept_dup]
print("trùng:", len(dup), "loại", len(drop), "dòng")
GROUP = {"IZ": "iz", "MISSU": "missu", "JP120": "jp", "Khác / Daewoo": "daewoo", "IZ_XTL": "xtl", "IZ/JP (Chưa tách)": "izjp"}
pts = collections.OrderedDict(); c1m = collections.defaultdict(lambda: collections.defaultdict(collections.Counter)); c1t = collections.Counter(); excl = collections.Counter()
for r in rows:
    q = r["Xe trong kỳ"] or 0; g = r["Nhóm tính thưởng"]
    if g == "Ngoài kỳ / 0 xe": excl[r["Nội dung rà soát"] or "0 xe"] += 1; continue
    c1 = C1[N(r["Đại lý gốc"])]; pt = r["Đại lý tổng hợp"]
    p = pts.setdefault(pt, {"name": pt, "region": r["Miền"], "c1": POINT_C1.get(pt, c1), "c2id": C2.get(pt), "xe": 0, "iz": 0, "missu": 0, "jp": 0, "daewoo": 0, "xtl": 0, "izjp": 0, "m": collections.Counter(), "tvbh": set(), "flags": collections.Counter()})
    p["xe"] += q; p[GROUP[g]] += q; p["tvbh"].add(r["Họ và tên TVBH"])
    if r["Tháng"]: p["m"][int(r["Tháng"])] += q; c1m[c1][int(r["Tháng"])][GROUP[g]] += q
    if r["Nội dung rà soát"]: p["flags"][r["Nội dung rà soát"]] += 1
    c1t[c1] += q

# ---------- tổng hợp thưởng theo điểm bán (sheet tổng hợp, quý) ----------
summ = {}
for r in sheet_rows("TỔNG HỢP TOÀN QUỐC")[8:37]:
    if r[1] and not str(r[1]).startswith(("Tổng", "TỔNG")) and isinstance(r[4], (int, float)):
        summ[r[1]] = {"tvbhN": r[2], "xe": r[4], "izLe": r[5] if isinstance(r[5], (int, float)) else None, "misLe": r[6] if isinstance(r[6], (int, float)) else None,
                      "dlMonth": r[7] if isinstance(r[7], (int, float)) else None, "dlQuarter": r[8] if isinstance(r[8], (int, float)) else None,
                      "tvbhMonth": r[9] if isinstance(r[9], (int, float)) else None, "total": r[10] if isinstance(r[10], (int, float)) else None, "status": r[11] if len(r) > 11 else None}
# điều chỉnh tổng hợp thưởng theo kết quả rà soát trùng (mức trần như file: IZ 2,5 + 0,7 + TVBH 1,5; MISSU 1,8 + 0,5 + TVBH 1,2 triệu)
RT = {"IZ": (2.5e6, .7e6, 1.5e6), "MISSU": (1.8e6, .5e6, 1.2e6)}
for i in drop:
    r = rows_all[i]; p = summ.get(r["Đại lý tổng hợp"])
    if p:
        p["xe"] -= (r["Xe trong kỳ"] or 0); same = sum(1 for k in kept_rows if _vin(k) == _vin(r)) == 0
        p["lap" if same else "dedupe"] = p.get("lap" if same else "dedupe", 0) + 1
        g = r["Nhóm tính thưởng"]
        if r["Căn cứ\nBán lẻ"] and g in RT:
            m, q, t = RT[g]; p["dlMonth"] -= m; p["dlQuarter"] -= q; p["tvbhMonth"] -= t; p["total"] -= m + q + t; p["izLe" if g == "IZ" else "misLe"] -= 1
for r in kept_rows:
    p = summ.get(r["Đại lý tổng hợp"]); g = r["Nhóm tính thưởng"]
    if p and g in RT and not r["Căn cứ\nBán lẻ"]:
        m, q, t = RT[g]; p["dlMonth"] += m; p["dlQuarter"] += q; p["tvbhMonth"] += t; p["total"] += m + q + t
        p["izLe" if g == "IZ" else "misLe"] = (p["izLe" if g == "IZ" else "misLe"] or 0) + 1; p["added"] = p.get("added", 0) + 1
for k, p in summ.items():
    if p.get("lap"): p["status"] = f"Đã rà trùng: −{p['lap']} dòng nhập lặp (cùng số khung, model, ngày, TVBH)"
    if p.get("dedupe") or p.get("added"):
        p["status"] = ("Đã rà trùng: " + (f"+{p['added']} xe trùng tính cho đại lý này" if p.get("added") else "") + ("; " if p.get("added") and p.get("dedupe") else "") + (f"−{p['dedupe']} xe trùng chuyển cho đại lý bán sau cùng" if p.get("dedupe") else "") + (" · 2 xe KG/TB chờ hồ sơ" if k == "Vũ Hùng" else ""))
budget = [[c for c in r if c not in (None, "")] for r in sheet_rows("TỔNG HỢP TOÀN QUỐC")[40:44]]
quarters = {}
for r in sheet_rows("PHÂN BỔ THEO QUÝ")[5:24]:
    if r[1] and isinstance(r[2], (int, float)) and not str(r[1]).startswith(("Tổng", "TỔNG")): quarters[r[1]] = [r[3], r[4], r[5], r[6]]
months = {}
for r in sheet_rows("PHÂN BỔ THEO THÁNG")[5:24]:
    if r[1] and isinstance(r[2], (int, float)) and not str(r[1]).startswith(("Tổng", "TỔNG")): months[r[1]] = r[2:14]

# ---------- TVBH: chỉ đếm, không tên ----------
tv = sheet_rows("CHI TIẾT TVBH"); tvh = [str(c).replace("\n", " ") for c in tv[3]]; tvr = [dict(zip(tvh, r)) for r in tv[4:] if isinstance(r[0], (int, float))]
def tvstat(sub):
    iz = [x for x in sub if (x["IZ (TVBH)"] or 0) >= 26]; ms = [x for x in sub if (x["MISSU (TVBH)"] or 0) >= 20]
    near = [x for x in sub if 0 < (x["Thiếu mốc IZ (26)"] or 99) <= 6 or 0 < (x["Thiếu mốc MISSU (20)"] or 99) <= 6]
    xe = sorted([x["Tổng xe 2026"] or 0 for x in sub], reverse=True)
    return {"n": len(sub), "reachIZ": len(iz), "reachMISSU": len(ms), "near": len(near), "annualPaid": sum(x["Thưởng Năm Thực đạt (VNĐ)"] or 0 for x in sub),
            "monthPaid": sum(x["Tổng TVBH Tháng (VNĐ)"] or 0 for x in sub), "top10share": round(sum(xe[:10]) / max(1, sum(xe)) * 100, 1), "median": xe[len(xe) // 2] if xe else 0,
            "zero": sum(1 for v in xe if v == 0), "b": [sum(1 for v in xe if a <= v <= b) for a, b in ((0, 5), (6, 12), (13, 25), (26, 999))]}
tvbh = {"Miền Bắc": tvstat([x for x in tvr if x["Miền"] == "Miền Bắc"]), "Miền Nam": tvstat([x for x in tvr if x["Miền"] == "Miền Nam"])}
west = []
for r in sheet_rows("MIỀN TÂY (8 ĐL)")[5:13]:
    if r[0]: west.append({"name": r[0], "tvbhN": r[1], "active": r[2], "left": r[3], "missu": r[4], "izjp": r[5], "xe": r[6], "capLe": r[7], "capTvbh": r[8], "capFull": r[9]})
wt = [r for r in sheet_rows("MIỀN TÂY (8 ĐL)")[17:80] if r[0] and isinstance(r[5], (int, float))]
tvbh["Miền Tây"] = {"n": len(wt), "reachIZ": sum(1 for r in wt if (r[3] or 0) >= 26), "reachMISSU": sum(1 for r in wt if (r[4] or 0) >= 20), "zero": sum(1 for r in wt if (r[5] or 0) == 0),
                    "median": sorted([r[5] for r in wt])[len(wt) // 2] if wt else 0, "note": "IZ/JP chưa tách JP120: số đạt mốc IZ là trần"}

# ---------- chính sách ----------
pol = sheet_rows("CHÍNH SÁCH & ĐIỀU KIỆN")
rates = [[c for c in r if c is not None] for r in pol[5:10]]
tiers = [[c for c in r if c is not None] for r in pol[18:31] if r[0]]
cond = [[c for c in r if c is not None] for r in pol[35:43] if r[0]]
log = [[c for c in r if c is not None] for r in pol[47:52] if r[0]]
import re
# bỏ tên cá nhân (khách hàng, TVBH) khỏi nhật ký rà soát trước khi đưa lên bản đồ
log = [[re.sub(r",\s*[A-ZĐÀ-Ỹ][a-zà-ỹ]+(?:\s+[A-ZĐÀ-Ỹ][a-zà-ỹ]+){1,4}\s*\)", ")", str(c)) for c in r] for r in log]

# ---------- ước tính thưởng theo bậc đạt KH thực tế (TB 03 / TB 009) ----------
S = {d["name"]: d for d in json.load(open("sales.json", encoding="utf-8"))["dealers"]}
IZT = [(1.05, 2.5, .7), (.95, 1.8, .6), (.85, 1.2, .4), (.75, .8, .2)]; MST = [(.95, 1.8, .5), (.85, 1.2, .3), (.75, .8, .2)]
def rate(t, p, i): return next((x[i] for x in t if p >= x[0]), 0)
tier = {}
for c1, mm in c1m.items():
    s = S.get(c1)
    if not s or not mm: continue
    est = 0; mx = 0; hit = 0; detail = {}
    for qn in range(4):
        qm = [qn * 3 + k + 1 for k in range(3) if qn * 3 + k + 1 <= 10]; ok = 0; qle = qkh = qiz = qms = 0
        for m in qm:
            kh = (s["m"].get(f"2026-{m:02d}", {}) or {}).get("kh") or 0; iz = mm[m]["iz"]; ms = mm[m]["missu"]; le = sum(mm[m].values())
            p = le / kh if kh else 0; detail[m] = round(p * 100); ok += p >= .75; hit += p >= .75
            est += iz * rate(IZT, p, 1) + ms * rate(MST, p, 1); mx += iz * 2.5 + ms * 1.8
            qle += le; qkh += kh; qiz += iz; qms += ms
        qp = qle / qkh if qkh else 0
        if ok >= 2: est += qiz * rate(IZT, qp, 2) + qms * rate(MST, qp, 2)
        mx += qiz * .7 + qms * .5
    tier[c1] = {"maxTr": round(mx, 1), "estTr": round(est, 1), "monthsHit75": hit, "monthPct": detail}

# ---------- đối soát với TDBH và file giao dịch từng xe ----------
tx = json.load(open("tx.json", encoding="utf-8")); D = tx["dealers"]; txs = collections.Counter()
for row in tx["tx"]:
    if row[0].startswith("2026") and int(row[0][5:]) <= 10: txs[D[row[1]]] += row[5]
net = json.load(open("network.json", encoding="utf-8")); byk = {d.get("salesKey"): d for d in net["dealers"] if d.get("salesKey")}
recon = []
for c1 in C1.values():
    d = byk[c1]; td = d.get("leCumTDBH", d.get("leCum"))
    recon.append({"c1": c1, "region": next((p["region"] for p in pts.values() if p["c1"] == c1), ""), "file": c1t[c1], "tdbh": td, "tx": round(txs[c1]), "diff": c1t[c1] - (td or 0)})

# ---------- cập nhật network.json (bán lẻ 2026 chính thức) ----------
for c1 in C1.values():
    d = byk[c1]
    if "leCumTDBH" not in d: d["leCumTDBH"] = d.get("leCum"); d["thT10TDBH"] = d.get("thT10")
    d["leCum"] = c1t[c1]; d["leSrc"] = "Báo cáo thưởng 2026 (hóa đơn bán lẻ T1–T10)"
    if c1m[c1]: d["thT10"] = sum(c1m[c1][10].values())
byid = {d["id"]: d for d in net["dealers"]}
for p in pts.values():
    if p["c2id"]: byid[p["c2id"]]["le26"] = p["xe"]; byid[p["c2id"]]["le26Src"] = "Báo cáo thưởng 2026 (điểm bán)"
json.dump(net, open("network.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# ---------- cập nhật provinces.json: số bán theo điểm bán, KH chia theo tỷ trọng ----------
R = json.load(open("provinces.json", encoding="utf-8")); byp = {r["name"]: r for r in R}
own = collections.Counter(); c2prov = collections.defaultdict(collections.Counter)
for p in pts.values():
    if p["c2id"]: c2prov[p["c1"]][byid[p["c2id"]]["province"]] += p["xe"]
    else: own[p["c1"]] += p["xe"]
new_s = collections.Counter(); new_t = collections.Counter(); touched = set()
for d in net["dealers"]:
    k = d.get("salesKey")
    if not k or d.get("leCum") is None: continue
    if k in C1.values():
        tot = c1t[k] or 1; kh = d.get("khCum") or 0
        alloc = {d["province"]: tot - sum(c2prov[k].values())}; alloc.update({pv: alloc.get(pv, 0) + v for pv, v in c2prov[k].items()})
        for pv, v in alloc.items(): new_s[pv] += v; new_t[pv] += round(kh * v / tot); touched.add(pv)
    else:
        new_s[d["province"]] += d["leCum"]; new_t[d["province"]] += d.get("khCum") or 0
for r in R:
    if r["name"] in touched or r.get("sales"):
        r.setdefault("salesTDBH", r.get("sales")); r.setdefault("targetTDBH", r.get("target"))
        r["sales"] = new_s.get(r["name"], 0) or None; r["target"] = new_t.get(r["name"], 0) or None
json.dump(R, open("provinces.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

out = {"asOf": "T1–T10/2026 (file cập nhật 19/11/2026)", "source": "Báo cáo tổng hợp thưởng DAC 2026 (xlsx anh gửi 21/11/2026)",
       "points": [{**{k: v for k, v in p.items() if k not in ("tvbh", "m", "flags")}, "tvbhN": len(p["tvbh"]), "m": [p["m"].get(i, 0) for i in range(1, 11)], "flags": dict(p["flags"]),
                   "province": byid[p["c2id"]]["province"] if p["c2id"] else byk[p["c1"]]["province"], **({"bonus": summ[p["name"]]} if p["name"] in summ else {}),
                   "q": quarters.get(p["name"]), "bm": months.get(p["name"])} for p in pts.values()],
       "west": west, "tvbh": tvbh, "budget": budget, "rates": rates, "tiers": tiers, "cond": cond, "log": log, "tier": tier, "recon": recon, "dup": dup, "vinfix": vinfix, "excluded": dict(excl),
       "salesByProvince": {k: v for k, v in new_s.items()}, "targetByProvince": {k: v for k, v in new_t.items()}}
json.dump(out, open("bonus2026.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("điểm bán", len(pts), "· tổng xe", sum(c1t.values()), "· loại", dict(excl))
for r in recon: print(f"{r['c1']:15} file {r['file']:4} TDBH {r['tdbh']} tx {r['tx']} lệch {r['diff']:+}")
print({k: v for k, v in tier.items()})
print("tỉnh:", dict(new_s))
