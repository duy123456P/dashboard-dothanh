import numpy as np, math, json, sys
from PIL import Image, ImageDraw, ImageFilter
S=sys.argv[1]; GEO=sys.argv[2]; OUT=sys.argv[3]
z=7; x0,x1,y0,y1=99,105,55,61
mos=np.zeros(((y1-y0+1)*256,(x1-x0+1)*256),np.float32)
for x in range(x0,x1+1):
  for y in range(y0,y1+1):
    a=np.asarray(Image.open(f"{S}/dem/tiles/{z}_{x}_{y}.png").convert("RGB")).astype(np.float32)
    mos[(y-y0)*256:(y-y0+1)*256,(x-x0)*256:(x-x0+1)*256]=a[...,0]*256+a[...,1]+a[...,2]/256-32768
LNG0,LNG1,LAT0,LAT1=101.5,117.5,7.0,24.0
def sample(W,H):
  lng=np.linspace(LNG0,LNG1,W); lat=np.linspace(LAT1,LAT0,H)
  px=((lng+180)/360*2**z - x0)*256
  r=np.radians(lat); py=((1-np.log(np.tan(r)+1/np.cos(r))/math.pi)/2*2**z - y0)*256
  PX,PY=np.meshgrid(px,py)
  i0=np.clip(np.floor(PX).astype(int),0,mos.shape[1]-2); j0=np.clip(np.floor(PY).astype(int),0,mos.shape[0]-2)
  fx=PX-i0; fy=PY-j0
  return (mos[j0,i0]*(1-fx)*(1-fy)+mos[j0,i0+1]*fx*(1-fy)+mos[j0+1,i0]*(1-fx)*fy+mos[j0+1,i0+1]*fx*fy)
# texture
TW,TH=2048,2176
E=sample(TW,TH)
geo=json.load(open(GEO))
def to_px(lng,lat,W,H): return ((lng-LNG0)/(LNG1-LNG0)*W,(LAT1-lat)/(LAT1-LAT0)*H)
mask=Image.new("L",(TW,TH),0); d=ImageDraw.Draw(mask)
for f in geo["features"]:
  g=f["geometry"]; polys=g["coordinates"] if g["type"]=="MultiPolygon" else [g["coordinates"]]
  for p in polys: d.polygon([to_px(x,y,TW,TH) for x,y in p[0]],fill=255)
vn=np.asarray(mask.filter(ImageFilter.GaussianBlur(1.5))).astype(np.float32)/255
# hillshade (multi-direction), cell size meters
cy=(LAT1-LAT0)/TH*111000; cx=(LNG1-LNG0)/TW*111000*math.cos(math.radians(15.5))
Ez=np.maximum(E,0)*2.2
gy,gx=np.gradient(Ez,cy,cx)
slope=np.arctan(np.hypot(gx,gy)); aspect=np.arctan2(-gx,gy)
def hs(az,alt):
  az=math.radians(az); alt=math.radians(alt)
  return np.clip(np.sin(alt)*np.cos(slope)+np.cos(alt)*np.sin(slope)*np.cos(az-aspect),0,1)
shade=0.5*hs(315,40)+0.25*hs(270,45)+0.25*hs(0,50)
# hypsometric tint like classic relief (mint lowland -> green -> yellow -> tan -> brown -> light)
stops=[(-1,(205,235,200)),(0,(214,240,196)),(60,(196,232,178)),(200,(160,214,150)),(500,(110,180,120)),(900,(170,190,120)),
       (1300,(214,196,128)),(1800,(196,150,100)),(2400,(160,110,80)),(3200,(236,226,214))]
h=np.clip(E,0,None); col=np.zeros(E.shape+(3,),np.float32)
for (a,ca),(b,cb) in zip(stops[1:],stops[2:]):
  m=(h>=a)&(h<b); t=((h-a)/(b-a))[m][:,None]; col[m]=np.array(ca)*(1-t)+np.array(cb)*t
col[h>=stops[-1][0]]=stops[-1][1]
land=(E>0.5)|(vn>0.5)
lum=(0.35+0.85*shade)[...,None]
landc=np.clip(col*lum,0,255)
# neighbours: muted, cooler
gray=landc.mean(axis=2,keepdims=True)
nb=np.clip((gray*0.45+landc*0.55)*0.62+np.array([6,16,30]),0,255)
landc=landc*vn[...,None]+nb*(1-vn[...,None])
# ocean: deep teal, lighter on shelf
dep=np.clip(-E,0,4000)/4000
sea=np.array([64,190,200])*(1-dep[...,None]**0.5)+np.array([10,48,78])*(dep[...,None]**0.5)
img=np.where(land[...,None],landc,sea).astype(np.uint8)
Image.fromarray(img).save(f"{OUT}/relief.jpg",quality=84,optimize=True,progressive=True)
# heightmap grid 512 x 544, encoded meters+12000 in R,G
HW,HH=512,544
Eh=sample(HW,HH)
mk=Image.new("L",(HW,HH),0); dk=ImageDraw.Draw(mk)
for f in geo["features"]:
  g=f["geometry"]; polys=g["coordinates"] if g["type"]=="MultiPolygon" else [g["coordinates"]]
  for p in polys: dk.polygon([to_px(x,y,HW,HH) for x,y in p[0]],fill=255)
mk=np.asarray(mk)>127
Eh=np.where(mk&(Eh<2),2+np.clip(Eh,0,None),Eh)
v=np.clip(np.round(Eh+12000),0,65535).astype(np.uint32)
enc=np.stack([(v>>8)&255,v&255,np.zeros_like(v)],-1).astype(np.uint8)
Image.fromarray(enc).save(f"{OUT}/height.png",optimize=True)
print("max",E.max(),"min",E.min())
