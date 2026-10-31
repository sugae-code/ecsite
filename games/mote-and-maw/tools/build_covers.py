#!/usr/bin/env python3
"""Generate original CrazyGames cover art (no external fonts or paid assets)."""
import math
import random
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "covers"
OUT.mkdir(parents=True, exist_ok=True)
FONT_PATHS = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
]
FONT = next((p for p in FONT_PATHS if Path(p).exists()), None)
if FONT is None:
    raise RuntimeError("A TrueType font is required for legible covers")

def font(size):
    return ImageFont.truetype(FONT, size)

def circle(draw, x, y, radius, fill, width=0):
    rect=(round(x-radius),round(y-radius),round(x+radius),round(y+radius))
    if width:
        draw.ellipse(rect, outline=fill, width=width)
    else:
        draw.ellipse(rect, fill=fill)

def glow(image, x, y, r, color, opacity=190):
    pad=int(r*4)
    layer=Image.new("RGBA", image.size)
    d=ImageDraw.Draw(layer)
    for rr,alpha in [(r*1.15,opacity),(r*.75,220),(r*.40,245)]:
        circle(d,x,y,rr,(*color,alpha))
    layer=layer.filter(ImageFilter.GaussianBlur(radius=max(10,int(r*.55))))
    image.alpha_composite(layer)

def make(name, W, H):
    scale=min(W,H)
    rng=random.Random(2513)
    image=Image.new("RGBA",(W,H),(5,13,35,255))
    d=ImageDraw.Draw(image)
    for y in range(H):
        k=y/max(1,H-1)
        d.line((0,y,W,y),fill=(int(7+14*k),int(20+13*(1-k)),int(53+38*k),255))
    # A recognizable spiral of growing sparks, depicting gameplay evolution.
    if W/H>1.35:
        cx,cy=W*.69,H*.55
        title_y=H*.14
        size=int(H*.142)
        tx=W*.065
        hero_r=scale*.142
    elif W/H<.8:
        cx,cy=W*.52,H*.57
        title_y=H*.11
        size=int(W*.139)
        tx=W*.085
        hero_r=scale*.20
    else:
        cx,cy=W*.53,H*.56
        title_y=H*.095
        size=int(W*.135)
        tx=W*.08
        hero_r=scale*.178

    for _ in range(130):
        x=rng.randrange(W); y=rng.randrange(H)
        r=rng.choice([1,1,2,2,3,4])*scale/850
        color=rng.choice([(89,250,224,130),(237,245,255,135),(221,168,255,160)])
        circle(d,x,y,max(1,r),color)
    for angle in range(0,360,5):
        a=math.radians(angle)
        spiral=hero_r*1.25+(angle/360)*hero_r*1.9
        x=cx+math.cos(a*1.7)*spiral*1.1
        y=cy+math.sin(a*1.7)*spiral*.9
        rr=scale*(.006+.011*(angle/360))
        if -rr<x<W+rr and -rr<y<H+rr:
            circle(d,x,y,rr,rng.choice([(48,198,250,210),(126,251,217,220),(239,177,255,190)]))
    # Rings are native to the game mechanic and clarify growth.
    for mult in [1.72,2.18,2.63]:
        circle(d,cx,cy,hero_r*mult,(29,189,211,75),max(2,int(scale*.004)))
    # Large predator shadow and several smaller sparks.
    px=cx+hero_r*1.52;py=cy-hero_r*1.42
    glow(image,px,py,hero_r*.76,(220,67,143),125)
    d=ImageDraw.Draw(image)
    circle(d,px,py,hero_r*.72,(64,22,87,255))
    circle(d,px,py,hero_r*.68,(117,41,135,255),max(2,int(scale*.012)))
    circle(d,px-hero_r*.14,py-hero_r*.12,hero_r*.09,(255,130,153,255))
    for j in range(9):
        a=math.radians(j*43+30)
        dist=hero_r*(1.9+.14*j)
        x=cx+math.cos(a)*dist;y=cy+math.sin(a)*dist
        rr=hero_r*(.07+.017*(j%3))
        glow(image,x,y,rr*1.2,(92,212,255),95)
        d=ImageDraw.Draw(image)
        circle(d,x,y,rr,(111,235,247,245))

    glow(image,cx,cy,hero_r*1.55,(18,234,199),180)
    d=ImageDraw.Draw(image)
    circle(d,cx,cy,hero_r,(17,135,167,255))
    circle(d,cx,cy,hero_r*.88,(69,224,208,255))
    circle(d,cx-hero_r*.20,cy-hero_r*.25,hero_r*.50,(171,255,229,255))
    circle(d,cx-hero_r*.1,cy-hero_r*.16,hero_r*.18,(245,255,239,255))
    for mult,alpha in [(1.12,185),(1.31,95)]:
        circle(d,cx,cy,hero_r*mult,(155,255,229,alpha),max(2,int(scale*.013)))

    # Single readable title. No badges, logos or calls-to-action.
    shadow=int(scale*.01)
    for i,(word,color) in enumerate([("MOTE",(244,254,254,255)),("& MAW",(112,252,224,255))]):
        yy=int(title_y+i*size*1.13)
        d.text((tx+shadow,yy+shadow),word,font=font(size),fill=(0,16,31,220),
               stroke_width=max(2,int(size*.027)),stroke_fill=(0,16,31,235))
        d.text((tx,yy),word,font=font(size),fill=color)
    output=OUT / (name+".png")
    image.convert("RGB").save(output,format="PNG",optimize=True)
    print(output.name, W, H, output.stat().st_size)

if __name__=="__main__":
    for n,w,h in [("landscape",1920,1080),("portrait",800,1200),("square",800,800)]:
        make(n,w,h)
