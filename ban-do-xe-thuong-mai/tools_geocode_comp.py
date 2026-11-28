#!/usr/bin/env python3
"""Định vị điểm bán đối thủ chưa có tọa độ bằng OpenStreetMap Nominatim (công khai, 1 yêu cầu/giây, có bộ nhớ đệm geocode_cache.json).
Thử địa chỉ đầy đủ, rồi bỏ dần phần đầu (số nhà, đường, tổ) còn "phường/xã, tỉnh". Kết quả chỉ nhận khi nằm trong tỉnh khai báo (đa giác vn34.geojson, dung sai 12 km).
Ghi lat/lng + trường geo ("địa chỉ" | "phường/xã") vào compnet.json; khử trùng tên + tọa độ. Điểm không định vị được thì giữ liên kết tìm kiếm Google Maps theo tên và địa chỉ.
Đồng thời đối chiếu tọa độ đại lý Đô Thành (network.json) với tâm phường/xã OSM, in ra điểm lệch trên 10 km (không tự sửa)."""
import json, os, re, sys, time, urllib.parse, urllib.request, math, collections
HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
CACHE_F = "geocode_cache.json"; cache = json.load(open(CACHE_F)) if os.path.exists(CACHE_F) else {}
UA = "dac-map-geocode/1.0"
geo = json.load(open("vn34.geojson")); polys = collections.defaultdict(list)
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
def near(lng, lat, prov, tol=12):
    best = 1e9
    for poly in polys.get(prov, []):
        if pip(lng, lat, poly[0]): return True
        for x, y in poly[0][::2]: best = min(best, km(lng, lat, x, y))
    return best <= tol
def nom(q):
    if q in cache: return cache[q]
    u = "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=vn&q=" + urllib.parse.quote(q)
    for t in range(3):
        try:
            time.sleep(1.1); j = json.load(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA}), timeout=30)); break
        except Exception as e: j = None; time.sleep(3)
    r = [round(float(j[0]["lat"]), 5), round(float(j[0]["lon"]), 5), j[0].get("type", ""), j[0].get("class", "")] if j else None
    if j is not None: cache[q] = r
    return r
def clean(s): return re.sub(r"\s+", " ", s.replace("TDP", "tổ dân phố")).strip(" ,")
def locate(addr, prov):
    parts = [clean(x) for x in addr.split(",") if x.strip()]
    for lvl, ks in (("địa chỉ", [0, 1]), ("phường/xã", [2, 3])):
        for k in ks:
            sub = parts[k:] if lvl == "địa chỉ" else parts[-(k - 0):] if k else parts
            if lvl == "phường/xã": sub = parts[-k:] if k <= len(parts) else parts
            if len(sub) < (2 if lvl == "phường/xã" else 3): continue
            q = ", ".join(sub); r = nom(q)
            if r and near(r[1], r[0], prov): return r[0], r[1], lvl
    return None
if __name__ == "__main__":
    n = json.load(open("compnet.json")); todo = [d for d in n["dealers"] if d.get("lat") is None]
    ok = 0
    for i, d in enumerate(todo):
        r = locate(d.get("addr", ""), d["province"])
        if r: d["lat"], d["lng"], d["geo"] = r[0], r[1], r[2]; ok += 1
        if i % 20 == 0: print(i, len(todo), ok, flush=True); json.dump(cache, open(CACHE_F, "w"), ensure_ascii=False)
    # khử trùng
    seen = set(); out = []
    for d in n["dealers"]:
        k = (d["b"], d["name"], round(d.get("lat") or 0, 4), round(d.get("lng") or 0, 4))
        if d.get("lat") is not None and k in seen: continue
        seen.add(k); out.append(d)
    print("khử trùng:", len(n["dealers"]) - len(out)); n["dealers"] = out
    n["geoNote"] = "Điểm bán đối thủ trong danh sách đại lý: tọa độ lấy từ liên kết Google Maps của nguồn (Daehan) hoặc định vị bằng OpenStreetMap Nominatim theo địa chỉ / phường, xã (trường geo); điểm chưa định vị được giữ liên kết tìm kiếm Google Maps theo tên và địa chỉ."
    json.dump(n, open("compnet.json", "w"), ensure_ascii=False, separators=(",", ":"))
    print("định vị được", ok, "/", len(todo))
    json.dump(cache, open(CACHE_F, "w"), ensure_ascii=False)
    # đối chiếu đại lý Đô Thành
    net = json.load(open("network.json")); bad = []
    for d in net["dealers"] + net["stations"]:
        a = d.get("addr") or d.get("address") or ""; parts = [clean(x) for x in a.split(",") if x.strip()]
        r = nom(", ".join(parts[-2:])) if len(parts) >= 2 else None
        if r:
            dd = km(d["lng"], d["lat"], r[1], r[0])
            if dd > 10: bad.append((d["name"], d["province"], round(dd, 1), r[:2], [d["lat"], d["lng"]], a))
    json.dump(bad, open("audit_dt_coords.json", "w"), ensure_ascii=False, indent=1); print("Đô Thành lệch > 10 km so với tâm phường/xã:", len(bad))
    for b in bad: print(" -", b)
