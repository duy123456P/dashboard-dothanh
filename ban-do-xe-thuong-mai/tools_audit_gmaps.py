#!/usr/bin/env python3
"""Rà soát mọi liên kết Google Maps trong bản đồ (kiểm tra tĩnh, không gọi Google): định dạng URL, tọa độ trong Việt Nam,
tọa độ thuộc đúng tỉnh (đa giác vn34.geojson, dung sai 12 km ven biển/ranh giới), gm khớp lat/lng, ftid, trùng điểm.
Chạy: python3 tools_audit_gmaps.py  → in tóm tắt, ghi audit_gmaps.json"""
import json, math, re, urllib.parse, collections
J = lambda f: json.load(open(f, encoding="utf8"))
geo = J("vn34.geojson"); net = J("network.json"); cn = J("compnet.json"); cu = J("customers.json"); mk = J("mkt2027.json")
polys = collections.defaultdict(list)
for f in geo["features"]:
    p = f["properties"]; g = f["geometry"]; ps = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    for nm in [p["name"]] + list(p.get("merged", [])): polys[nm] += ps
def pip(x, y, ring):
    c = False; j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i][:2]; xj, yj = ring[j][:2]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi: c = not c
        j = i
    return c
def km(a, b, c, d):
    p = math.pi / 180; x = math.sin((d - b) * p / 2) ** 2 + math.cos(b * p) * math.cos(d * p) * math.sin((c - a) * p / 2) ** 2; return 12742 * math.asin(math.sqrt(x))
def dist_poly(lng, lat, prov):
    best = 1e9
    for poly in polys.get(prov, []):
        if pip(lng, lat, poly[0]): return 0
        for (x1, y1), (x2, y2) in zip(poly[0], poly[0][1:]):
            best = min(best, km(lng, lat, x1, y1))   # xấp xỉ theo đỉnh (đủ cho dung sai 12 km)
    return best
def alias(p):
    return {"TP. Hồ Chí Minh": "TP. Hồ Chí Minh", "TP.HCM": "TP. Hồ Chí Minh"}.get(p, p)
issues = []; stat = collections.Counter(); seen = {}
def chk(kind, name, prov, lat, lng, url=None, gm=None):
    stat[kind] += 1
    if lat is None or lng is None: issues.append((kind, name, prov, "thiếu tọa độ")); return
    if not (8.0 <= lat <= 23.5 and 102.0 <= lng <= 110.0): issues.append((kind, name, prov, "tọa độ ngoài Việt Nam %s,%s" % (lat, lng)))
    if gm and km(lng, lat, gm[1], gm[0]) > 0.5: issues.append((kind, name, prov, "gm lệch lat/lng %.1f km" % km(lng, lat, gm[1], gm[0])))
    if prov in polys:
        d = dist_poly(gm[1] if gm else lng, gm[0] if gm else lat, alias(prov))
        if d > 12: issues.append((kind, name, prov, "cách ranh giới tỉnh %.0f km (kiểm tra lại tỉnh hoặc tọa độ)" % d))
    elif prov: issues.append((kind, name, prov, "tên tỉnh không có trong bản đồ"))
    if url:
        if " " in url or not url.startswith("https://www.google.com/maps"): issues.append((kind, name, prov, "URL sai định dạng: " + url[:80]))
        m = re.search(r"[?&]q(?:uery)?=(-?\d+\.\d+),(-?\d+\.\d+)", url)
        if m and km(lng, lat, float(m.group(2)), float(m.group(1))) > 0.5: issues.append((kind, name, prov, "URL lệch tọa độ bản ghi"))
        if "ftid=" in url and not re.search(r"ftid=0x[0-9a-f]+:0x[0-9a-f]+", urllib.parse.unquote(url)): issues.append((kind, name, prov, "ftid sai định dạng"))
for d in net["dealers"]: chk("Đại lý Đô Thành", d["name"], d["province"], d.get("lat"), d.get("lng"), None, d.get("gm"))
for d in net["stations"]: chk("Trạm dịch vụ", d["name"], d["province"], d.get("lat"), d.get("lng"), None, d.get("gm"))
for d in cn["dealers"]: chk("Điểm đối thủ (Daehan)", d["name"], d["province"], d.get("lat"), d.get("lng"), d.get("map"))
for d in cn["points"]: chk("Điểm đối thủ (khác)", d["name"], d["province"], d.get("lat"), d.get("lng"))
for d in cu["prospects"]: chk("Khách tiềm năng OSM", d["name"], d.get("province"), d.get("lat"), d.get("lng"))
for d in [dict(zip(mk["prospectCols"], r)) for r in mk["prospects"]]:
    if d.get("lat") is not None: chk("Khách tiềm năng MKT", d["name"], d.get("province"), d.get("lat"), d.get("lng"))
for d in cu["buyers"]["districts"]:
    if d.get("lat") is not None: chk("Khách đã mua (huyện)", d["dist"], d["province"], d["lat"], d["lng"])
for kind, rows in (("dealers", net["dealers"]), ("c", cn["dealers"] + cn["points"])):
    for d in rows:
        k = (d.get("name"), round(d.get("lat") or 0, 4), round(d.get("lng") or 0, 4))
        if k in seen: issues.append(("Trùng điểm", d.get("name"), d.get("province"), "trùng tên và tọa độ"))
        seen[k] = 1
by = collections.Counter(i[0] + ": " + i[3].split(" ")[0] + " " + i[3].split(" ")[1] if len(i[3].split(" ")) > 1 else i[3] for i in issues)
print("Đã kiểm tra:", dict(stat)); print("Số vấn đề:", len(issues))
for i in issues[:60]: print(" -", " | ".join(str(x) for x in i))
json.dump({"stat": stat, "issues": issues}, open("audit_gmaps.json", "w"), ensure_ascii=False, indent=1)
