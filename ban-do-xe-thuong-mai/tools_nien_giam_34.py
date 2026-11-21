"""Quy đổi Niên giám Thống kê 2025 (63 tỉnh cũ) sang 34 tỉnh: GRDP, bán lẻ, dân số. Chạy: pdftotext -layout NG-TOAN-QUOC-2025_WM.pdf ng.txt; python3 tools_nien_giam_34.py ng.txt out.json"""
import re,json,sys,unicodedata
L=open(sys.argv[1]).read().split('\n')
def norm(s):
    s=unicodedata.normalize('NFC',s).lower().replace('–','-')
    s=s.replace('thừa thiên - huế','huế').replace('tp.hcm','hồ chí minh').replace('tp. hồ chí minh','hồ chí minh').replace('thành phố ','')
    return re.sub(r'\s+',' ',s).strip()
def grab(a,b):
    out={}; pend=None
    for l in L[a:b]:
        m=re.match(r'^\s*([^\d\(\)]+?)\s{2,}([\d][\d\s,]*)$',l)
        if m and m.group(1).strip():
            k=norm(m.group(1))
            if k not in out: out[k]=m.group(2).split()
            pend=None; continue
        if len(l.strip())<=3: continue
        m2=re.match(r'^\s*([A-ZĐ][^\d]+?)\s*$',l)
        if m2 and len(m2.group(1).strip())<30: pend=norm(m2.group(1)); continue
        m3=re.match(r'^\s*(\d[\d\s,]+)$',l)
        if m3 and pend:
            if pend not in out: out[pend]=m3.group(1).split()
            pend=None
    return out
f=lambda x: float(x.replace(',','.'))
pop=grab(5910,6075); gpc=grab(15398,15560); ret=grab(46177,46340)
R=json.load(open('provinces.json')); out={}
for r in R:
    g=rt=pp=0; miss=[]
    for p in r['parts']:
        k=norm(p['name'])
        try: P=f(pop[k][-1]); g+=f(gpc[k][-1])*P/1000; rt+=f(ret[k][-1]); pp+=P
        except KeyError: miss.append(p['name'])
    out[r['name']]={'grdp25':round(g,1),'retail25':round(rt),'pop25':round(pp,1),'gpc25':round(g*1000/pp,1) if pp else None,'miss':miss}
json.dump(out,open(sys.argv[2],'w'),ensure_ascii=False,indent=0)
ps=json.load(open('provstats.json'))
for k,v in ps['grdp2025'].items(): print(k,v,out[k]['grdp25'])
print([ (k,v['miss']) for k,v in out.items() if v['miss']])
print(sum(v['retail25'] for v in out.values()))
