"""Arma el MP4 con los cuadros que deja grabar.js (cada uno con su hora, así el video dura lo mismo que la grabación).
python3 armar.py <carpeta de cuadros> <salida.mp4> [ancho=1080]"""
import json, os, subprocess, sys
car, sal = sys.argv[1], sys.argv[2]
ancho = int(sys.argv[3]) if len(sys.argv) > 3 else 1080
alto = ancho * 16 // 9
c = json.load(open(os.path.join(car, 'cuadros.json'))); t0 = c[0]['t']
c = [f for f in c if f['t'] - t0 >= 0.45]          # el primer instante es la página en blanco
L = ["file '%s'\nduration %.4f" % (os.path.join(car, a['nom']), b['t'] - a['t']) for a, b in zip(c, c[1:])]
L += ["file '%s'\nduration 1.5" % os.path.join(car, c[-1]['nom']), "file '%s'" % os.path.join(car, c[-1]['nom'])]
lista = os.path.join(car, 'lista.txt'); open(lista, 'w').write('\n'.join(L) + '\n')
subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lista,
                '-vf', 'fps=30,scale=%d:%d:flags=lanczos,format=yuv420p' % (ancho, alto), '-c:v', 'libx264', '-preset', 'slow',
                '-crf', '21' if ancho >= 1080 else '25', '-profile:v', 'high', '-movflags', '+faststart', '-an', sal], check=True)
print(sal, round(c[-1]['t'] - c[0]['t'], 1), 's')
