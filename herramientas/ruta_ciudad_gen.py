import random, urllib.parse, json, sys
def uri(svg): return "url(\"data:image/svg+xml,"+urllib.parse.quote(svg, safe=" =:/,;'()-.")+"\")"
def svg(w,h,body): return f"<svg xmlns='http://www.w3.org/2000/svg' width='{w}' height='{h}' viewBox='0 0 {w} {h}'>{body}</svg>"

# ---------- ciudad normal ----------
def ciudad_lejos():
    R=random.Random(3); W,H=720,40; x=0; b=''
    while x<W:
        w=R.randint(18,40); h=R.randint(12,34)
        if x+w>W: w=W-x
        b+=f"<rect x='{x}' y='{H-h}' width='{w}' height='{h}'/>"
        if R.random()<.25: b+=f"<rect x='{x+w//2-1}' y='{H-h-6}' width='2' height='6'/>"
        x+=w+R.randint(0,3)
    return svg(W,H,f"<g fill='rgba(6,30,58,.30)'>{b}</g>")
def ciudad_cerca():
    R=random.Random(7); W,H=600,46; x=4; b=''; v=''; t=''
    while x<W-10:
        if R.random()<.28:   # árbol
            r=R.randint(6,9); t+=f"<rect x='{x+r-1}' y='{H-8}' width='2.5' height='8' fill='rgba(20,30,25,.55)'/><circle cx='{x+r}' cy='{H-8-r+2}' r='{r}' fill='rgba(10,70,60,.55)'/><circle cx='{x+r-3}' cy='{H-8-r+5}' r='{r-3}' fill='rgba(14,90,76,.5)'/>"
            x+=2*r+R.randint(4,10); continue
        w=R.randint(24,46); h=R.randint(20,42)
        if x+w>W-4: break
        b+=f"<rect x='{x}' y='{H-h}' width='{w}' height='{h}' rx='1'/>"
        for yy in range(H-h+5,H-6,7):
            for xx in range(x+4,x+w-5,7):
                if R.random()<.45: v+=f"<rect x='{xx}' y='{yy}' width='3' height='3.5'/>"
        x+=w+R.randint(3,9)
    return svg(W,H,f"<g fill='rgba(5,22,42,.55)'>{b}</g><g fill='rgba(255,233,160,.6)'>{v}</g>{t}")

# ---------- ciudad en ruinas (Halloween) ----------
def ruina_lejos():
    R=random.Random(11); W,H=760,42; x=0; b=''
    while x<W:
        w=R.randint(20,44); h=R.randint(14,36)
        if x+w>W: w=W-x
        # techo roto: zigzag
        pts=[(x,H),(x,H-h)]; n=R.randint(2,4)
        for i in range(1,n+1):
            px=x+w*i/(n+1); pts.append((round(px,1),H-h+R.randint(0,9)))
        pts+=[(x+w,H-h+R.randint(0,6)),(x+w,H)]
        b+="<polygon points='"+" ".join(f"{a},{c}" for a,c in pts)+"'/>"
        if R.random()<.15: b+=f"<polygon points='{x+w/2-4},{H-h} {x+w/2},{H-h-12} {x+w/2+4},{H-h}'/>"   # torre de iglesia
        x+=w+R.randint(0,4)
    return svg(W,H,f"<g fill='rgba(12,3,24,.55)'>{b}</g>")
def ruina_cerca():
    R=random.Random(5); W,H=640,46; b=''; v=''; o=''
    x=6
    items=['casa','arbol','tumbas','ruina','arbol','calabaza','ruina','reja','arbol','casa2','tumbas','ruina','calabaza']
    for it in items:
        if x>W-40: break
        if it in('ruina',):
            w=R.randint(26,40); h=R.randint(24,40)
            pts=[(x,H),(x,H-h),(x+w*.3,H-h+6),(x+w*.45,H-h-2),(x+w*.7,H-h+10),(x+w,H-h+4),(x+w,H)]
            b+="<polygon points='"+" ".join(f'{a:.1f},{c}' for a,c in pts)+"'/>"
            for yy in range(H-h+12,H-6,8):
                for xx in range(x+4,x+w-5,8):
                    r=R.random()
                    if r<.18: o+=f"<rect x='{xx}' y='{yy}' width='3.5' height='4'/>"
                    elif r<.5: v+=f"<rect x='{xx}' y='{yy}' width='3.5' height='4'/>"
            x+=w+R.randint(6,12)
        elif it in('casa','casa2'):
            # casa embrujada con torre
            b+=f"<rect x='{x}' y='{H-24}' width='34' height='24'/><polygon points='{x-3},{H-24} {x+17},{H-38} {x+37},{H-24}'/>"
            b+=f"<rect x='{x+26}' y='{H-40}' width='9' height='16'/><polygon points='{x+24},{H-40} {x+30.5},{H-50} {x+37},{H-40}'/>"
            o+=f"<rect x='{x+6}' y='{H-18}' width='5' height='6'/><rect x='{x+28.5}' y='{H-35}' width='4' height='5'/>"
            v+=f"<rect x='{x+20}' y='{H-18}' width='5' height='6'/>"
            o+=f"<rect x='{x+14}' y='{H-10}' width='6' height='10' fill='rgba(251,146,60,.55)'/>"
            x+=48
        elif it=='arbol':
            bx=x+12
            b+=(f"<path d='M{bx} {H} L{bx+1.5} {H-20} L{bx-7} {H-30} M{bx+1} {H-14} L{bx+9} {H-26} L{bx+13} {H-27} M{bx+4} {H-21} L{bx+5} {H-33} "
                f"M{bx-3} {H-25} L{bx-10} {H-27}' stroke='rgba(10,2,18,.9)' stroke-width='2.2' fill='none' stroke-linecap='round'/>")
            x+=28
        elif it=='tumbas':
            for k in range(3):
                tx=x+k*11; th=R.randint(8,12)
                b+=f"<path d='M{tx} {H} V{H-th+3} Q{tx+4} {H-th-2} {tx+8} {H-th+3} V{H} Z'/>"
                if k==1: b+=f"<rect x='{tx+3.3}' y='{H-th-6}' width='1.4' height='6'/><rect x='{tx+1.8}' y='{H-th-4.5}' width='4.4' height='1.4'/>"
            x+=40
        elif it=='calabaza':
            o+=(f"<ellipse cx='{x+6}' cy='{H-5}' rx='7' ry='5' fill='#ea580c'/><rect x='{x+5}' y='{H-12}' width='2' height='3' fill='#365314'/>"
                f"<path d='M{x+2.5} {H-6} l1.5 -1.5 l1.5 1.5 Z M{x+7.5} {H-6} l1.5 -1.5 l1.5 1.5 Z M{x+3} {H-3.5} h7 l-1 1.4 h-5 Z' fill='#fde047'/>")
            x+=22
        elif it=='reja':
            for k in range(9):
                b+=f"<rect x='{x+k*4}' y='{H-12}' width='1.4' height='12'/><polygon points='{x+k*4-1},{H-12} {x+k*4+.7},{H-15} {x+k*4+2.4},{H-12}'/>"
            b+=f"<rect x='{x}' y='{H-9}' width='34' height='1.2'/>"
            x+=42
    return svg(W,H,f"<g fill='rgba(10,2,18,.92)'>{b}</g><g fill='rgba(120,90,160,.35)'>{v}</g><g fill='#fb923c'>{o}</g>")

def murcielago():
    return svg(24,12,"<path d='M12 5 C10 1 6 1 1 4 C4 4 5 6 5 8 C7 6 9 7 12 10 C15 7 17 6 19 8 C19 6 20 4 23 4 C18 1 14 1 12 5Z' fill='#0b0314'/>")

out={'cl':uri(ciudad_lejos()),'cc':uri(ciudad_cerca()),'hl':uri(ruina_lejos()),'hc':uri(ruina_cerca()),'mu':uri(murcielago())}
json.dump(out,open(sys.argv[1],'w'))
print({k:len(v) for k,v in out.items()})
