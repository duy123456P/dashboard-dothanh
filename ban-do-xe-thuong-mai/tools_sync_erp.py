#!/usr/bin/env python3
"""Đồng bộ doanh số IZ – MISSU từ Dashboard ERP Đô Thành (Netlify) vào sales.json.

Lấy 2 nguồn số thật của dashboard:
  1. Tab "Doanh số IZ - Missu" (Tổng hợp TDBH): kế hoạch / bán sỉ / bán lẻ / tồn / thưởng theo đại lý từng tháng 2026,
     tháng 10 tách IZ / MISSU; xu hướng bán sỉ, bán lẻ, kế hoạch cả nước; tồn kho cuối tháng IZ / MISSU.
  2. Tab CSI (unique số khung 2023–2026): chỉ ĐẾM số xe theo năm × đại lý × model và năm × tỉnh (34 tỉnh mới) × model.
     KHÔNG lưu tên, số điện thoại, địa chỉ chi tiết, số khung, biển số của khách hàng.
Các tab có dữ liệu mẫu/điều hành (đơn hàng ERP, tài chính…) không dùng.

Cách dùng:  python3 tools_sync_erp.py [đường-dẫn-hoặc-file-html]   rồi  python3 build.py
"""
import base64, collections, json, os, re, struct, sys, unicodedata, urllib.request, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
URL = "https://euphonious-squirrel-72ddb0.netlify.app/"
MISSU = {"V56", "V65", "T26", "T33L"}

def load(src):
    if os.path.exists(src):
        return open(src, encoding="utf-8").read()
    with urllib.request.urlopen(src, timeout=90) as r:
        return r.read().decode("utf-8")

def cells(r):
    return [re.sub(r"\s+", " ", re.sub("<[^>]+>", "", c)).strip() for c in re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", r, flags=re.S)]

def rows(table):
    return [cells(r) for r in re.findall(r"<tr.*?</tr>", table, flags=re.S)]

def num(x):
    x = (x or "").replace(",", "").replace("%", "").strip()
    return None if x in ("", "—", "-") else float(x)

def arr(v):
    if isinstance(v, dict) and "bdata" in v:
        b = base64.b64decode(v["bdata"]); f = {"f8": "d", "i4": "i", "i2": "h", "i1": "b", "u1": "B", "u2": "H", "u4": "I", "f4": "f"}[v["dtype"]]
        return list(struct.unpack("<" + f * (len(b) // struct.calcsize(f)), b))
    return v

def norm(s):
    s = unicodedata.normalize("NFC", str(s)).lower().replace("hoá", "hóa").replace("thuỷ", "thủy")
    s = re.sub(r"^(tp\.?|thành phố|tỉnh)\s*", "", s.strip())
    return re.sub(r"[\s.]", "", s)

def model_key(m):
    m = m.upper().strip()
    m = re.sub(r"-20\d\d$", "", m)
    return m

def main():
    src = sys.argv[1] if len(sys.argv) > 1 else URL
    s = load(src)
    sec = lambda k, n: s[s.find("id='tab-%s'" % k):s.find("id='tab-%s'" % n)]
    kh = sec("kh", "tt")
    tabs = [m.group(0) for m in re.finditer(r"<table.*?</table>", kh, flags=re.S)]
    upd = re.search(r"cập nhật (\d{2}/\d{2}/\d{4})", kh)
    # 1. đại lý × tháng
    dealers = collections.OrderedDict()
    for t in tabs:
        h = rows(t)
        if not h or len(h[0]) < 3: continue
        m = re.search(r"Lũy kế đến tháng (\d+)", " ".join(h[0]))
        if not m: continue
        mi = int(m.group(1))
        for r in h[2:]:
            if not r or r[0].upper().startswith("TỔNG"): continue
            d = dealers.setdefault(r[0], {"name": r[0], "region": r[1], "m": {}})
            d["m"]["2026-%02d" % mi] = {"khCum": num(r[2]), "siCum": num(r[3]), "leCum": num(r[4]), "kh": num(r[6]), "le": num(r[7]), "ton": num(r[9]), "thuong": num(r[10])}
    for d in dealers.values():
        prev = 0
        for k in sorted(d["m"]):
            x = d["m"][k]; x["si"] = None if x["siCum"] is None else x["siCum"] - prev; prev = x["siCum"] if x["siCum"] is not None else prev
    # tháng 10: bảng TH/KH theo đại lý · IZ · MISSU
    t10 = {}
    for t in tabs:
        h = rows(t)
        if h and h[0][:3] == ["Miền", "Đại lý", "TH"]:
            for r in h[1:]:
                if r[0].startswith("Tổng") or r[1].startswith("Tổng"): continue
                t10[r[1]] = {"region": r[0], "le": num(r[2]) or 0, "kh": num(r[3]) or 0, "izLe": num(r[5]) or 0, "izKh": num(r[6]) or 0, "msLe": num(r[8]) or 0, "msKh": num(r[9]) or 0}
    alias = {"Ô tô Tây Nguyên": "Ô Tô Tây Nguyên"}
    for k, v in t10.items():
        name = "ĐL Khác" if k.startswith("ĐL Khác") else alias.get(k, k)
        if name in dealers:
            cur = dealers[name]["m"].get("2026-10") or {"kh": 0, "le": 0, "izLe": 0, "izKh": 0, "msLe": 0, "msKh": 0}
            for f in ("kh", "le", "izLe", "izKh", "msLe", "msKh"): cur[f] = (cur.get(f) or 0) + v[f]
            dealers[name]["m"]["2026-10"] = cur
    # cả nước theo tháng + tồn kho
    nat = {}
    for m in re.finditer(r'Plotly\.newPlot\(\s*"[^"]+",\s*(\[.*?\]),\s*(\{.*?\}),\s*\{"displayModeBar', kh, flags=re.S):
        f = json.loads(m.group(1))
        if f and f[0].get("name") == "Bán sỉ" and len(f[0].get("x") or []) == 12:
            nat.update({{"Bán sỉ": "si", "Bán lẻ": "le", "Kế hoạch": "kh"}[t["name"]]: arr(t["y"]) for t in f if t.get("name") in ("Bán sỉ", "Bán lẻ", "Kế hoạch")})
        if f and f[0].get("name") == "IZ" and "stock" not in nat:
            nat["stock"] = {t["name"]: arr(t["y"]) for t in f}
    # 2. CSI: chỉ đếm, bỏ thông tin cá nhân
    P = json.load(open(os.path.join(HERE, "provinces.json"), encoding="utf-8"))
    pmap = {}
    for p in P:
        for n in [p["name"]] + p.get("merged", []):
            pmap[norm(n)] = p["name"]
    pmap.update({norm("Hồ Chí Minh"): "TP. Hồ Chí Minh", norm("TP HCM"): "TP. Hồ Chí Minh", norm("HCM"): "TP. Hồ Chí Minh"})
    def prov(addr):
        for part in reversed([x.strip() for x in str(addr).split("·")]):
            k = norm(part)
            if k in pmap: return pmap[k]
        return None
    csi = sec("csi", "vdkh")
    by_dm, by_pm, total, nop = collections.Counter(), collections.Counter(), collections.Counter(), 0
    for t in re.finditer(r"<table.*?</table>", csi, flags=re.S):
        h = rows(t.group(0))
        if not h or h[0][:2] != ["Năm", "Đại lý"]: continue
        H = h[0]; iy, idl, iad, imo = H.index("Năm"), H.index("Đại lý"), H.index("Địa chỉ"), H.index("Model")
        for r in h[1:]:
            if len(r) <= imo: continue
            y, dl, mo = r[iy], r[idl], model_key(r[imo]); pv = prov(r[iad])
            by_dm[(y, dl, mo)] += 1; total[y] += 1
            if pv: by_pm[(y, pv, mo)] += 1
            else: nop += 1
    # 3. Tab "Đánh giá KH 2027": mùa vụ (từ dự báo cơ sở theo mùa vụ 2025), KH 2027 theo tháng / đại lý / model, dự báo ERP
    dg = sec("dg", "cp"); plan = {}
    for m in re.finditer(r'Plotly\.newPlot\(\s*"[^"]+",\s*(\[.*?\]),\s*(\{.*?\}),\s*\{"displayModeBar', dg, flags=re.S):
        for t in json.loads(m.group(1)):
            nm, x, y = t.get("name"), arr(t.get("x")), arr(t.get("y"))
            if nm == "KH 2027 theo tháng": plan["kh27m"] = y
            elif nm and nm.startswith("Dự báo cơ sở (theo mùa vụ"): plan["erpBase27m"] = y
            elif nm == "Thận trọng" and isinstance(x, list) and len(x) == 12: plan["erpLow27m"] = y
            elif nm == "Kế hoạch nhập": plan["msImport27m"] = y
            elif nm == "Kế hoạch bán": plan["msSell27m"] = y
            elif nm == "KH 2027" and isinstance(x, list) and x and str(x[0]).startswith("IZ"): plan["models"] = x; plan["kh27model"] = y
            elif nm == "Mức đăng ký T09 quy năm": plan["reg09model"] = y
            elif nm == "Dự báo cơ sở" and isinstance(x, list) and x and str(x[0]).startswith("IZ"): plan["erpBase27model"] = y
    for t in re.finditer(r"<table.*?</table>", dg, flags=re.S):
        h = rows(t.group(0))
        if h and h[0][:4] == ["Đại lý", "Vùng", "Bán lẻ 2026 quy năm", "KH 2027"]:
            plan["dealers"] = []
            for r in h[1:]:
                rg = re.match(r"([\d,.]+)\s*\(([\d,.]+)\s*-\s*([\d,.]+)\)", r[5] or "")
                plan["dealers"].append({"name": r[0], "region": r[1], "run26": num(r[2]), "kh27": num(r[3]), "erpBase": num(rg.group(1)) if rg else None, "erpLow": num(rg.group(2)) if rg else None, "erpHigh": num(rg.group(3)) if rg else None, "class": r[7]})
    kpi = re.sub(r"\s+", " ", re.sub("<[^>]+>", " ", re.sub(r"<script.*?</script>", "", dg, flags=re.S)))
    mm = re.search(r"Dự báo cơ sở 2027 ([\d,]+) xe khoảng ([\d,]+) đến ([\d,]+)", kpi); kk = re.search(r"KH kinh doanh 2027 ([\d,]+) xe", kpi)
    if mm: plan["erpTotal27"] = [num(mm.group(1)), num(mm.group(2)), num(mm.group(3))]
    if kk: plan["kh27"] = num(kk.group(1))
    if plan.get("erpBase27m"):
        b = plan["erpBase27m"]; avg = sum(b) / len(b); plan["season"] = [round(v / avg, 4) for v in b]
    out = {"plan": plan, "updated": datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).strftime("%Y-%m-%d %H:%M"),
           "sourceUpdated": upd.group(1) if upd else "", "source": URL,
           "note": "Kế hoạch/thực hiện 2026 theo Tổng hợp TDBH; xe theo model đếm từ danh sách CSI (unique số khung, theo năm). Không lưu thông tin cá nhân khách hàng.",
           "missu": sorted(MISSU), "nat": nat, "dealers": list(dealers.values()),
           "csiDealerModel": [[y, d, m, n] for (y, d, m), n in sorted(by_dm.items())],
           "csiProvModel": [[y, p, m, n] for (y, p, m), n in sorted(by_pm.items())],
           "csiTotal": dict(total), "csiNoProvince": nop}
    json.dump(out, open(os.path.join(HERE, "sales.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print("sales.json: %d đại lý × %d tháng, CSI %s xe (%d không rõ tỉnh)" % (len(dealers), max((len(d["m"]) for d in dealers.values()), default=0), dict(total), nop))

if __name__ == "__main__":
    main()
