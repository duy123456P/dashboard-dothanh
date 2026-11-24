#!/usr/bin/env python3
"""Dự báo bán lẻ 2027 bằng SARIMAX (có biến ngoại sinh) và hồi quy đa biến theo tỉnh → forecast2027.json.

    python3 tools_forecast_2027.py

1) SARIMAX: chuỗi bán lẻ tháng toàn hệ thống (ngày thanh toán 100%, tx.json) 11/2024–10/2026 (24 tháng).
   Chuỗi mới 2 chu kỳ năm nên KHÔNG ước lượng thành phần mùa vụ riêng (sẽ quá khớp); mùa vụ đưa vào dưới dạng
   biến ngoại sinh = chỉ số mùa vụ ERP 2025. Biến ngoại sinh khác: số điểm bán có phát sinh bán lẻ trong tháng.
   Mô hình: SARIMAX(1,0,0) + hằng số + xu hướng, exog = [mùa vụ, điểm bán hoạt động].
   2027: mùa vụ ERP; điểm bán theo 3 kịch bản (giữ nguyên / lịch mở 8 điểm / lịch mở 12 điểm).
2) Hồi quy đa biến (OLS) theo tỉnh: bán lẻ 12 tháng của Đô Thành ~ thị trường 5 phân khúc (ĐK thực T10 × 12)
   + số điểm bán Đô Thành + số tư vấn bán hàng. Dự báo 2027 = thay số điểm bán, tư vấn theo kế hoạch.
Không lưu thông tin khách hàng.
"""
import collections, json, os, warnings
import numpy as np
import statsmodels.api as sm
from statsmodels.tsa.statespace.sarimax import SARIMAX

warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__))
J = lambda f: json.load(open(os.path.join(HERE, f), encoding="utf-8"))
TX, NET, PV, SA = J("tx.json"), J("network.json"), J("provinces.json"), J("sales.json")
SEASON = SA["plan"]["season"]                       # chỉ số mùa vụ ERP (T1..T12)

# ---------- chuỗi tháng ----------
le, act = collections.Counter(), collections.defaultdict(set)
for ym, d, m, b, f, l, s, x in TX["tx"]:
    le[ym] += l
    if l > 0: act[ym].add(d)
months = [m for m in TX["months"] if "2024-11" <= m <= "2026-10"]
y = np.array([le[m] for m in months], float)
season = np.array([SEASON[int(m[5:]) - 1] for m in months])
pts = np.array([len(act[m]) for m in months], float)
X = np.column_stack([season, pts])

res = SARIMAX(y, exog=X, order=(1, 0, 0), trend="ct").fit(disp=False)
fitted = res.fittedvalues
mape = float(np.mean(np.abs((y[3:] - fitted[3:]) / y[3:])) * 100)
# kiểm tra ngoài mẫu: ước lượng đến 04/2026, dự báo 05–10/2026
k = months.index("2026-04") + 1
r2 = SARIMAX(y[:k], exog=X[:k], order=(1, 0, 0), trend="ct").fit(disp=False)
fc_hold = r2.get_forecast(len(y) - k, exog=X[k:]).predicted_mean
mape_out = float(np.mean(np.abs((y[k:] - fc_hold) / y[k:])) * 100)

base_pts = float(np.mean(pts[-12:]))                 # điểm bán hoạt động bình quân 12 tháng gần nhất
def path(new_open):                                  # new_open: {tháng mở (1..12): số điểm}
    p, add = [], 0
    for mo in range(1, 13):
        add += new_open.get(mo, 0); p.append(base_pts + add)
    return np.array(p)
SC = {"giu_nguyen": path({}), "kha_thi": path({6: 4, 8: 4}), "ky_vong": path({4: 4, 6: 4, 8: 4})}
s27 = np.array(SEASON)
# tháng 11–12/2026 nối chuỗi trước khi dự báo 2027
pre = np.column_stack([[SEASON[10], SEASON[11]], [base_pts, base_pts]])
out_ts = {}
for name, p in SC.items():
    ex = np.vstack([pre, np.column_stack([s27, p])])
    f = res.get_forecast(14, exog=ex)
    mean, ci = f.predicted_mean[2:], f.conf_int(alpha=0.2)[2:]
    out_ts[name] = {"total": round(float(mean.sum())), "lo80": round(float(ci[:, 0].sum())), "hi80": round(float(ci[:, 1].sum())),
                    "monthly": [round(float(v)) for v in mean], "points": [round(float(v), 1) for v in p]}
params = dict(zip(res.model.param_names, [float(v) for v in res.params]))
pvals = dict(zip(res.model.param_names, [float(v) for v in res.pvalues]))

# ---------- hồi quy đa biến theo tỉnh ----------
prov_of, tv_p, pts_p = {}, collections.Counter(), collections.Counter()
for d in NET["dealers"]:
    pts_p[d["province"]] += 1; tv_p[d["province"]] += d.get("tvbh") or 0
    if d.get("salesKey"): prov_of[d["salesKey"]] = d["province"]
le12 = collections.Counter()
for ym, d, m, b, f, l, s, x in TX["tx"]:
    if "2025-11" <= ym <= "2026-10":
        p = prov_of.get(TX["dealers"][d])
        if p: le12[p] += l
rows = [(r["name"], le12[r["name"]], (r.get("regT10addr") or 0) * 12, pts_p[r["name"]], tv_p[r["name"]]) for r in PV]
fit_rows = [r for r in rows if r[3] > 0]             # tỉnh có điểm bán
Y = np.array([r[1] for r in fit_rows], float)
Xr = sm.add_constant(np.array([[r[2], r[3], r[4]] for r in fit_rows], float))
ols = sm.OLS(Y, Xr).fit()
coef = dict(zip(["hang_so", "thi_truong", "diem_ban", "tu_van"], [float(v) for v in ols.params]))
pv_ols = dict(zip(["hang_so", "thi_truong", "diem_ban", "tu_van"], [float(v) for v in ols.pvalues]))
# kế hoạch: điểm mới (đợt 1–3) + tư vấn; năm đầu điểm mới chỉ hoạt động một phần năm
NEW = {"kha_thi": {"TP. Hồ Chí Minh": (1, 5, 7 / 12), "Hà Nội": (1, 5, 7 / 12), "Thái Nguyên": (1, 3, 7 / 12), "Quảng Ninh": (1, 3, 7 / 12),
                   "Đồng Nai": (1, 3, 5 / 12), "Thanh Hóa": (1, 3, 5 / 12), "Hà Tĩnh": (1, 3, 5 / 12), "Tuyên Quang": (1, 3, 5 / 12)},
       "ky_vong": {"TP. Hồ Chí Minh": (1, 5, 9 / 12), "Hà Nội": (1, 5, 9 / 12), "Thái Nguyên": (1, 3, 9 / 12), "Quảng Ninh": (1, 3, 9 / 12),
                   "Đồng Nai": (1, 3, 7 / 12), "Thanh Hóa": (1, 3, 7 / 12), "Hà Tĩnh": (1, 3, 7 / 12), "Tuyên Quang": (1, 3, 7 / 12),
                   "Lạng Sơn": (1, 3, 5 / 12), "Nghệ An": (1, 3, 5 / 12), "Ninh Bình": (1, 3, 5 / 12), "Phú Thọ": (1, 3, 5 / 12)}}
EXTRA_TV = {"kha_thi": 22, "ky_vong": 37}            # tư vấn tăng thêm tại đại lý hiện có (bảng tuyển theo quý)
def reg_pred(r, dp=0, dt=0):
    return max(0.0, coef["hang_so"] + coef["thi_truong"] * r[2] + coef["diem_ban"] * (r[3] + dp) + coef["tu_van"] * (r[4] + dt))
base_reg = sum(reg_pred(r) for r in fit_rows)
out_reg = {}
tv_now = sum(r[4] for r in fit_rows)
for name in ("kha_thi", "ky_vong"):
    tot = 0
    for r in rows:
        dp, dt, frac = NEW[name].get(r[0], (0, 0, 1))
        add_tv = EXTRA_TV[name] * (r[4] / tv_now) if r[3] else 0
        if r[3] == 0 and not dp: continue
        full = reg_pred(r, dp, dt + add_tv); now = reg_pred(r, 0, add_tv) if r[3] else 0
        tot += now + (full - now) * frac
    out_reg[name] = round(tot)
actual12 = float(Y.sum())
out = {"asOf": "2026-11-24", "data": {"months": months, "y": [int(v) for v in y], "points": [int(v) for v in pts]},
       "sarimax": {"spec": "SARIMAX(1,0,0) + hằng số + xu hướng; exog = chỉ số mùa vụ ERP, số điểm bán hoạt động", "n": len(y),
                   "aic": round(float(res.aic), 1), "mapeIn": round(mape, 1), "mapeOut": round(mape_out, 1), "params": params, "pvalues": pvals,
                   "scen": out_ts, "basePoints": round(base_pts, 1)},
       "ols": {"spec": "Bán lẻ 12 tháng theo tỉnh ~ thị trường 5 phân khúc/năm + số điểm bán + số tư vấn", "n": len(fit_rows),
               "r2": round(float(ols.rsquared), 3), "r2adj": round(float(ols.rsquared_adj), 3), "coef": coef, "pvalues": pv_ols,
               "actual12": actual12, "fit12": round(base_reg), "plan": out_reg}}
json.dump(out, open(os.path.join(HERE, "forecast2027.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(res.summary().tables[1])
print("MAPE trong mẫu %.1f%%, ngoài mẫu (05–10/2026) %.1f%%" % (mape, mape_out))
for k2, v in out_ts.items(): print(k2, v["total"], v["lo80"], v["hi80"], v["monthly"])
print(ols.summary().tables[1]); print("R2", ols.rsquared, "adj", ols.rsquared_adj, "n", len(fit_rows))
print("thực 12 tháng", actual12, "khớp", base_reg, "kế hoạch", out_reg)
