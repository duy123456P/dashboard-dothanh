"""Chiến dịch marketing offline cả nước 2027 → mkt2027.json (lớp "Chiến dịch MKT" trên bản đồ, khối Khách hàng, công cụ Ben).

    python3 tools_sync_mkt.py <ChienDich_MKT_CaNuoc_2027.xlsx> <geo_cache.json>

- Kế hoạch 34 tỉnh: tính lại toàn bộ cột công thức theo sheet "Giả định" (file tạo bằng công cụ nên không có giá trị lưu sẵn).
- Lịch sự kiện: ngày, loại hoạt động, địa điểm, tọa độ chính xác (link Google Maps ?q=lat,lng), đại lý thực hiện, KPI.
- Khách hàng doanh nghiệp tiềm năng: thông tin công khai (tên DN, ngành, địa chỉ, SĐT công khai, website, link Google Maps).
  Tọa độ: lấy từ link nếu có (?q=lat,lng); nếu chỉ có link tìm kiếm thì gắn tâm khu vực (Nominatim, có bộ nhớ đệm) và đánh dấu "gần đúng".
"""
import datetime, json, os, re, sys, time, unicodedata, urllib.parse, urllib.request
import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
F, GEO = sys.argv[1], sys.argv[2]
nfc = lambda s: unicodedata.normalize("NFC", re.sub(r"\s+", " ", str(s if s is not None else ""))).strip()
def fold(s): return "".join(c for c in unicodedata.normalize("NFD", nfc(s).lower().replace("đ", "d")) if unicodedata.category(c) != "Mn")
wb = openpyxl.load_workbook(F)
def ll(cell):
    u = cell.hyperlink.target if cell.hyperlink else ""
    m = re.search(r"[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)", u)
    return (u, (round(float(m.group(1)), 6), round(float(m.group(2)), 6)) if m else None)

# ---------- giả định ----------
A = {}
names = {n: wb.defined_names[n].attr_text for n in wb.defined_names}
gs = wb["Giả định"]
for n, ref in names.items():
    m = re.search(r"\$B\$(\d+)", ref)
    if m: A[n] = gs.cell(int(m.group(1)), 2).value
assume = [[nfc(r[0].value), r[1].value, nfc(r[2].value)] for r in gs.iter_rows(min_row=5) if r[0].value]

# ---------- kế hoạch 34 tỉnh (tính lại công thức) ----------
ws = wb["Kế hoạch 34 tỉnh"]
H = [nfc(c.value) for c in ws[4]]
plan = []
for r in ws.iter_rows(min_row=5):
    v = [c.value for c in r]
    if not v[1] or not str(v[0]).strip().isdigit(): continue
    pr = nfc(v[2]); eol = int(v[3] or 0); dn = int(v[4] or 0)
    ev = A["ev_" + pr]; sem = A["sem_" + pr] if pr != "C" or dn >= 5 else 0
    lev, lsem, ldn, leol = ev * A["lead_ev"], sem * A["lead_sem"], round(dn * A["rate_dn"]), round(eol * A["rate_eol"])
    leads = lev + lsem + ldn + leol; td = round(leads * A["rate_td"]); sold = round(td * A["rate_close"])
    budget = ev * A["cost_ev"] + sem * A["cost_sem"] + A["cost_flyer"]
    plan.append({"rank": int(v[0]), "province": nfc(v[1]), "priority": pr, "eol": eol, "dn": dn, "dealer": nfc(v[5]), "stations": v[6], "events": ev, "seminars": sem,
                 "leadsEv": lev, "leadsSem": lsem, "leadsDn": ldn, "leadsEol": leol, "leads": leads, "testDrive": td, "sold": sold, "budget": budget,
                 "costPerCar": round(budget / sold, 1) if sold else None, "revenue": round(sold * A["rev_car"] / 1000, 2), "peak": nfc(v[19]), "message": nfc(v[20])})

# ---------- lịch sự kiện ----------
ws = wb["Lịch sự kiện"]
events = []
for r in ws.iter_rows(min_row=4):
    if not str(r[0].value or "").strip().isdigit(): continue
    u, p = ll(r[7]); d = r[1].value
    events.append({"week": int(r[0].value), "date": d.date().isoformat() if isinstance(d, datetime.datetime) else nfc(d), "phase": nfc(r[2].value), "province": nfc(r[3].value), "priority": nfc(r[4].value),
                   "type": "seminar" if "Hội thảo" in nfc(r[5].value) else "roadshow", "typeName": nfc(r[5].value), "place": nfc(r[6].value), "map": u, "lat": p[0] if p else None, "lng": p[1] if p else None,
                   "target": nfc(r[8].value), "dealer": nfc(r[9].value), "kpi": A["lead_sem"] if "Hội thảo" in nfc(r[5].value) else A["lead_ev"], "status": nfc(r[11].value) or "Kế hoạch"})

# ---------- khách hàng DN tiềm năng ----------
ws = wb[[n for n in wb.sheetnames if "KH tiềm năng" in n][0]]
cache = json.load(open(GEO, encoding="utf-8")) if os.path.exists(GEO) else {}
def geo(area, prov):
    k = "mkt|" + fold(area) + "|" + fold(prov)
    if k in cache: return cache[k]
    q = ", ".join(x for x in (re.sub(r"\(cũ\)", "", area).strip(), prov, "Việt Nam") if x)
    try:
        j = json.load(urllib.request.urlopen(urllib.request.Request("https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=vn&q=" + urllib.parse.quote(q), headers={"User-Agent": "dac-market-map/1.0 (internal tool)"}), timeout=30))
        cache[k] = [round(float(j[0]["lat"]), 5), round(float(j[0]["lon"]), 5)] if j else None
    except Exception as e:
        print("geo lỗi", q, e); cache[k] = None
    time.sleep(1.1)
    if len(cache) % 20 == 0: json.dump(cache, open(GEO, "w", encoding="utf-8"), ensure_ascii=False)
    return cache[k]
pros = []
for r in ws.iter_rows(min_row=4):
    if not str(r[0].value or "").strip().isdigit(): continue
    u, p = ll(r[12]); prov = nfc(r[1].value); area = nfc(r[8].value)
    exact = bool(p)
    if not p and area: p = geo(area, prov)
    pros.append({"province": prov, "priority": nfc(r[2].value), "hot": nfc(r[3].value) == "NÓNG", "name": nfc(r[4].value), "ind": nfc(r[5].value), "seg": nfc(r[6].value), "models": nfc(r[7].value),
                 "area": area, "addr": nfc(r[9].value), "phone": nfc(r[10].value), "web": nfc(r[11].value), "map": u, "lat": p[0] if p else None, "lng": p[1] if p else None, "exact": exact,
                 "src": nfc(r[13].value), "note": nfc(r[14].value), "invite": nfc(r[15].value), "dealer": nfc(r[16].value), "status": nfc(r[18].value) or "Chưa gọi"})
json.dump(cache, open(GEO, "w", encoding="utf-8"), ensure_ascii=False)
out = {"asOf": "2026-11-23", "source": os.path.basename(F), "assume": assume, "plan": plan, "events": events, "prospects": pros,
       "phases": [nfc(c.value) for c in wb["Tổng quan"]["A"] if c.value and str(c.value).startswith("GĐ")],
       "principles": [nfc(c.value).lstrip("• ") for c in wb["Tổng quan"]["A"] if c.value and str(c.value).startswith("•")],
       "playbook": [[nfc(c.value) for c in r[:6]] for r in wb["Playbook chiến dịch"].iter_rows(min_row=3) if r[0].value]}
json.dump(out, open(os.path.join(HERE, "mkt2027.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
T = lambda k: sum(x[k] for x in plan)
print("kế hoạch", len(plan), "tỉnh | buổi lưu động", T("events"), "hội thảo", T("seminars"), "| khách", T("leads"), "lái thử", T("testDrive"), "xe bán", T("sold"), "| ngân sách", T("budget"), "tr | doanh thu", round(T("revenue"), 1), "tỷ")
print("sự kiện", len(events), "có tọa độ", sum(1 for e in events if e["lat"]), "| DN", len(pros), "tọa độ chính xác", sum(1 for x in pros if x["exact"]), "gần đúng", sum(1 for x in pros if x["lat"] and not x["exact"]))

# ---------- gọn dữ liệu + bổ sung tọa độ sự kiện thiếu định vị ----------
NET = json.load(open(os.path.join(HERE, "network.json"), encoding="utf-8"))
for e in out["events"]:
    if e["lat"] is None:
        same = next((x for x in out["events"] if x["province"] == e["province"] and x["lat"] is not None and x["dealer"] == e["dealer"]), None) \
            or next((x for x in out["events"] if x["province"] == e["province"] and x["lat"] is not None), None)
        dl = next((d for d in NET["dealers"] if d.get("province") == e["province"]), None)
        src = same or (dl and {"lat": dl["lat"], "lng": dl["lng"]})
        if src: e["lat"], e["lng"], e["approx"] = src["lat"], src["lng"], True
DL = sorted({x["dealer"] for x in out["prospects"]} | {e["dealer"] for e in out["events"]} | {p["dealer"] for p in out["plan"]})
out["dealers"] = DL
for e in out["events"]:
    e["dealer"] = DL.index(e["dealer"])
    if e.get("map", "").endswith("q=%s,%s" % (e["lat"], e["lng"])): e["map"] = ""
for p in out["plan"]: p["dealer"] = DL.index(p["dealer"])
out["prospects"] = [[x["province"], x["priority"], 1 if x["hot"] else 0, x["name"], x["ind"], x["seg"], x["models"], x["area"], x["addr"], x["phone"], x["web"],
                     x["lat"], x["lng"], 1 if x["exact"] else 0, x["src"], x["note"], x["invite"], DL.index(x["dealer"]), x["status"]] for x in out["prospects"]]
out["prospectCols"] = ["province", "priority", "hot", "name", "ind", "seg", "models", "area", "addr", "phone", "web", "lat", "lng", "exact", "src", "note", "invite", "dealer", "status"]
json.dump(out, open(os.path.join(HERE, "mkt2027.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("gọn:", os.path.getsize(os.path.join(HERE, "mkt2027.json")) // 1024, "KB; sự kiện có tọa độ", sum(1 for e in out["events"] if e["lat"] is not None))
