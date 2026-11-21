"""Gắn địa chỉ, điện thoại, tọa độ chính thức (Google Maps nhúng trên dothanhauto.com) vào network.json.
Chạy: python3 tools_sync_places.py <dt_places.json>  (file tạo từ trang /dai-ly/mien-* và /tram-dich-vu.html)"""
import json, sys
P = json.load(open(sys.argv[1], encoding="utf-8")); DL = [p for p in P if p["kind"] == "dl"]; TD = [p for p in P if p["kind"] == "tdv"]
# chỉ số trên trang đại lý → id đại lý trên bản đồ (ghép tay theo tên + địa chỉ)
DMAP = {0:1, 1:31, 2:33, 3:32, 4:2, 5:26, 6:27, 8:29, 9:34, 10:36, 11:24, 12:25, 13:30, 15:3, 16:4, 18:5, 19:6, 20:7, 21:8, 22:37, 23:42, 24:38, 25:39,
        26:40, 27:41, 28:48, 29:9, 30:10, 31:11, 32:12, 34:13, 35:49, 36:16, 37:17, 39:18, 40:19, 41:20, 42:44, 43:21, 44:45, 45:46, 46:22, 47:23}
SMAP = {i: i + 1 for i in range(25)}
BAD = {("tdv", 5): "tọa độ trên web lệch (kinh độ 105,50), dùng địa chỉ", ("tdv", 20): "tọa độ trên web lệch khỏi Sa Đéc, dùng tọa độ trang đại lý"}
SRC = {"dl": "https://www.dothanhauto.com/dai-ly.html", "tdv": "https://www.dothanhauto.com/tram-dich-vu.html"}
N = json.load(open("network.json", encoding="utf-8"))
def put(o, p, kind, i):
    o["addr"] = p["addr"]; o["phone"] = p["phone"]; o["webName"] = p["name"]; o["placeSrc"] = SRC[kind]
    lat, lng = p["lat"], p["lng"]
    if (kind, i) == ("tdv", 20): lat, lng = DL[38]["lat"], DL[38]["lng"]
    if (kind, i) in BAD and (kind, i) != ("tdv", 20) or lat is None:
        o.pop("gm", None); o["gmNote"] = BAD.get((kind, i), "trang chính thức chưa có bản đồ, dùng địa chỉ")
    else:
        o["gm"] = [round(lat, 6), round(lng, 6)]; o.pop("gmNote", None)
        o["lat"], o["lng"] = round(lat, 4), round(lng, 4)   # đưa ghim về đúng tọa độ chính thức
D = {d["id"]: d for d in N["dealers"]}; S = {s["id"]: s for s in N["stations"]}
for i, did in DMAP.items(): put(D[did], DL[i], "dl", i)
put(S[7], DL[17], "dl", 17); put(D[14], TD[11], "tdv", 11)
for i, sid in SMAP.items(): put(S[sid], TD[i], "tdv", i)
N["coordNote"] = "Tọa độ, địa chỉ, điện thoại lấy từ bản đồ Google nhúng trên trang chính thức dothanhauto.com (Hệ thống đại lý, Trạm dịch vụ), truy cập 21/11/2026; điểm không có trên web dùng tọa độ ước theo phường/xã và link Google Maps tìm theo tên + tỉnh."
N["unlisted"] = [{"name": DL[i]["name"], "addr": DL[i]["addr"], "gm": [DL[i]["lat"], DL[i]["lng"]]} for i in (7, 14, 33)]
json.dump(N, open("network.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("gắn", sum(1 for d in N["dealers"] if d.get("addr")), "đại lý,", sum(1 for s in N["stations"] if s.get("addr")), "trạm; chưa có trên web:", [d["name"] for d in N["dealers"] if not d.get("addr")])
