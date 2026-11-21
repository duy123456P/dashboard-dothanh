"""Thu nhập bình quân tháng 2025 (Niên giám bảng 348, 63 tỉnh cũ) quy đổi 34 tỉnh, bình quân theo dân số 2025. Chạy: python3 tools_thu_nhap_34.py ng.txt out.json"""
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
            k=norm(m.group(1)); 
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
inc=grab(60500,60800); pop=grab(5910,6075)
R=json.load(open('provinces.json')); res={}; miss=[]
for r in R:
    s=w=0
    for p in r['parts']:
        k=norm(p['name'])
        if k not in inc or k not in pop: miss.append((r['name'],p['name'])); continue
        s+=float(inc[k][0])*float(pop[k][-1].replace(',','.')); w+=float(pop[k][-1].replace(',','.'))
    if w: res[r['name']]=round(s/w)
print('miss',miss); print([k for k in pop if 'minh' in k],[k for k in inc if 'minh' in k])
pub={'Hà Nội':8374,'TP. Hồ Chí Minh':8064,'Đồng Nai':7174,'Hải Phòng':7139,'Quảng Ninh':6917,'Ninh Bình':6572,'Hưng Yên':6551,'Bắc Ninh':6020,'Cao Bằng':2690,'Điện Biên':2583}
for k,v in pub.items(): print(k,res.get(k),v)
json.dump(res,open(sys.argv[2],'w'),ensure_ascii=False)
print(len(res)); print(sorted(res.items(),key=lambda x:-x[1]))
