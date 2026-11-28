#!/usr/bin/env python3
"""Sửa khách tiềm năng ghi sai tỉnh: tọa độ nằm cách tỉnh khai báo > 100 km thì gán lại tỉnh chứa tọa độ (đa giác vn34.geojson).
Đặc khu Bạch Long Vĩ (Hải Phòng, ngoài khơi) được giữ nguyên. Chạy lại an toàn nhiều lần."""
import json, math, collections, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
import importlib.util
sp = importlib.util.spec_from_file_location("g", "tools_geocode_comp.py"); g = importlib.util.module_from_spec(sp); sp.loader.exec_module(g)
def dist(lng, lat, prov):
    best = 1e9
    for poly in g.polys.get(prov, []):
        if g.pip(lng, lat, poly[0]): return 0
        for x, y in poly[0][::2]: best = min(best, g.km(lng, lat, x, y))
    return best
def owner(lng, lat):
    for nm, ps in g.polys.items():
        for poly in ps:
            if g.pip(lng, lat, poly[0]): return nm
    return None
def fix(rec, log, src):
    p = rec.get("province"); lat, lng = rec.get("lat"), rec.get("lng")
    if lat is None or p not in g.polys: return
    if p == "Hải Phòng" and 19.9 < lat < 20.3 and lng > 107.5: return   # Bạch Long Vĩ
    if dist(lng, lat, p) > 100:
        o = owner(lng, lat)
        if o: log.append((src, rec.get("name"), p, o)); rec["province"] = o
log = []
c = json.load(open("customers.json")); [fix(r, log, "customers") for r in c["prospects"]]
json.dump(c, open("customers.json", "w"), ensure_ascii=False, separators=(",", ":"))
m = json.load(open("mkt2027.json")); cols = m["prospectCols"]; i = cols.index("province")
for r in m["prospects"]:
    d = dict(zip(cols, r)); fix(d, log, "mkt2027"); r[i] = d["province"]
json.dump(m, open("mkt2027.json", "w"), ensure_ascii=False, separators=(",", ":"))
for l in log: print(l)
print("đã sửa", len(log))
