#!/usr/bin/env python3
"""UIO xe thương mại theo tỉnh (34 tỉnh) → provinces.json (uioW, uioIdx).

Cục Đăng kiểm công bố tổng UIO xe thương mại cả nước (1.951.883 xe, 8/2026) nhưng KHÔNG công bố theo tỉnh;
trang tra cứu app.vr.org.vn/hetnienhan chỉ liệt kê xe ĐÃ hết niên hạn (thử năm 2026, 2030 đều trả 0 xe).
Vì vậy phân bổ tổng UIO cả nước theo trọng số:
  85% tỷ trọng đăng ký xe thương mại 2025 + 6 tháng 2026 (báo cáo thị trường DAC, slide 6) – đội xe hiện hành
  15% tỷ trọng xe tải hết niên hạn 2025 (Cục Đăng kiểm, CV 419/ĐKVN-PTGTĐB) – nền đội xe lâu năm
Ba tỉnh có tổng ô tô công bố (Hà Nội, TP.HCM, Hải Phòng) giữ số neo; mô hình được kiểm chứng với ba tỉnh này.
"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
P = json.load(open(os.path.join(HERE, "provinces.json"), encoding="utf-8")); S = json.load(open(os.path.join(HERE, "provstats.json"), encoding="utf-8"))
NAT, CARS, A = 1951883, 7134939, 0.85
E = S["eol2025"]
fl = {r["name"]: (r.get("cv2025") or 0) + (r.get("cv6m26") or 0) for r in P}; ol = {r["name"]: E.get(r["name"], {}).get("truck", 0) for r in P}
F, O = sum(fl.values()), sum(ol.values())
for r in P:
    n = r["name"]; r["uioW"] = round(A * fl[n] / F + (1 - A) * ol[n] / O, 6)
chk = []
for r in P:
    if r.get("carStock"):
        anc = r["carStock"] * NAT / CARS; mod = r["uioW"] * NAT
        chk.append([r["name"], round(anc), round(mod), round((mod / anc - 1) * 100, 1)])
S["uioModel"] = {"nat": NAT, "natSrc": "Cục Đăng kiểm Việt Nam, xe thương mại đang lưu hành 8/2026", "a": A,
                 "method": "Phân bổ tổng UIO cả nước: 85% theo tỷ trọng đăng ký xe thương mại 2025 + 6T/2026 (báo cáo thị trường DAC), 15% theo tỷ trọng xe tải hết niên hạn 2025 (Cục Đăng kiểm, CV 419/ĐKVN-PTGTĐB). Hà Nội, TP.HCM, Hải Phòng neo theo tổng ô tô công bố × tỷ lệ xe TM cả nước.",
                 "why": "Cục Đăng kiểm không công bố UIO theo tỉnh; trang tra cứu app.vr.org.vn chỉ có xe đã hết niên hạn.", "check": chk}
json.dump(P, open(os.path.join(HERE, "provinces.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(S, open(os.path.join(HERE, "provstats.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("kiểm chứng (neo, mô hình, lệch %):", chk)
