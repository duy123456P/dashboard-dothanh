"""Xe tải hết niên hạn theo tỉnh (Cục Đăng kiểm, app.vr.org.vn/hetnienhan) → đếm theo HÃNG và NĂM SẢN XUẤT.

    python3 tools_sync_eol.py 2025 [out.json]

Trang tra cứu trả danh sách từng xe (biển số, chủ xe, địa chỉ). Công cụ CHỈ giữ số đếm theo tỉnh × hãng × năm sản xuất;
không lưu biển số, tên, địa chỉ. Kết quả ghi vào provstats.json mục eolBrands<năm> (63 mã tỉnh cũ quy về 34 tỉnh mới).
"""
import html, json, os, re, sys, time, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
URL = "https://app.vr.org.vn/hetnienhan/HetNienHan.aspx"
YEAR = sys.argv[1] if len(sys.argv) > 1 else "2025"
UA = {"User-Agent": "dac-market-map/1.0 (internal tool)", "Content-Type": "application/x-www-form-urlencoded"}
# mã biển số tỉnh cũ → tỉnh mới (như tools_sync_customers.py)
PLATE = {}
for codes, p in [((11,), "Cao Bằng"), ((12,), "Lạng Sơn"), ((14,), "Quảng Ninh"), ((15, 16, 34), "Hải Phòng"), ((17, 89), "Hưng Yên"), ((18, 35, 90), "Ninh Bình"), ((19, 28, 88), "Phú Thọ"), ((20, 97), "Thái Nguyên"),
                 ((21, 24), "Lào Cai"), ((22, 23), "Tuyên Quang"), ((25,), "Lai Châu"), ((26,), "Sơn La"), ((27,), "Điện Biên"), ((29, 30, 31, 32, 33, 40), "Hà Nội"), ((36,), "Thanh Hóa"), ((37,), "Nghệ An"), ((38,), "Hà Tĩnh"),
                 ((43, 92), "Đà Nẵng"), ((47, 78), "Đắk Lắk"), ((48, 49, 86), "Lâm Đồng"), (tuple(range(50, 60)) + (61, 72), "TP. Hồ Chí Minh"), ((60, 93), "Đồng Nai"), ((62, 70), "Tây Ninh"), ((63, 66), "Đồng Tháp"),
                 ((64, 71, 84), "Vĩnh Long"), ((65, 83, 95), "Cần Thơ"), ((67, 68), "An Giang"), ((69, 94), "Cà Mau"), ((73, 74), "Quảng Trị"), ((75,), "Huế"), ((76, 82), "Quảng Ngãi"), ((77, 81), "Gia Lai"), ((79, 85), "Khánh Hòa"), ((98, 99), "Bắc Ninh")]:
    for c in codes: PLATE[c] = p

def post(fields):
    data = urllib.parse.urlencode(fields).encode() if fields else None
    for i in range(4):
        try:
            return urllib.request.urlopen(urllib.request.Request(URL, data=data, headers=UA), timeout=120).read().decode("utf-8", "ignore")
        except Exception as e:
            err = e; time.sleep(3 + 3 * i)
    raise err
def state(t): return {k: html.unescape(v) for k, v in re.findall(r'name="(__[A-Z]+)"[^>]*value="([^"]*)"', t)}
def rows(t):
    out = []
    g = t[t.find('id="DGTimPT"'):]
    for r in re.findall(r"<tr[^>]*>(.*?)</tr>", g, re.S):
        c = [html.unescape(re.sub(r"<[^>]+>", "", x)).strip() for x in re.findall(r"<td[^>]*>(.*?)</td>", r, re.S)]
        if len(c) >= 5 and c[0].isdigit(): out.append((c[3].upper() or "?", c[4]))   # chỉ hãng, năm SX
    return out
def pager(t):
    """các trang kế tiếp: (số trang hoặc '...', target postback)"""
    return [(html.unescape(txt).strip(), tg) for tg, txt in re.findall(r"__doPostBack\(&#39;(DGTimPT\$ctl\d+\$ctl\d+)&#39;,&#39;&#39;\)\"[^>]*>([^<]*)<", t)]

first = post(None)
codes = re.findall(r'<option[^>]*value="(\d+)"', first[first.find('id="cboTinh"'):first.find("</select>", first.find('id="cboTinh"'))])
res = {}
for code in codes:
    st = state(first); st.update({"cboTinh": code, "txtLoaiPT": "2", "txtnam": YEAR, "cmdTraCuu": "Tra cứu"})
    t = post(st); got = rows(t); page = 1
    while True:
        nxt = [tg for txt, tg in pager(t) if txt == str(page + 1)] or [tg for txt, tg in pager(t) if txt == "..." and page % 10 == 0 and tg]
        if not nxt: break
        st = state(t); st.update({"__EVENTTARGET": nxt[-1], "__EVENTARGUMENT": "", "cboTinh": code, "txtLoaiPT": "2", "txtnam": YEAR})
        t = post(st); r = rows(t)
        if not r: break
        got += r; page += 1; time.sleep(0.4)
    p = PLATE.get(int(code), "?"); a = res.setdefault(p, {"n": 0, "brands": {}, "years": {}})
    for b, y in got:
        b = re.sub(r"\s+", " ", b)
        a["n"] += 1; a["brands"][b] = a["brands"].get(b, 0) + 1; a["years"][y] = a["years"].get(y, 0) + 1
    print(code, p, len(got), flush=True); time.sleep(0.5)
for a in res.values(): a["brands"] = dict(sorted(a["brands"].items(), key=lambda z: -z[1]))
ps = json.load(open(os.path.join(HERE, "provstats.json"), encoding="utf-8"))
ps["eolBrands" + YEAR] = res
json.dump(ps, open(os.path.join(HERE, "provstats.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("tổng", sum(a["n"] for a in res.values()))
