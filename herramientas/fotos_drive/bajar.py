#!/usr/bin/env python3
"""📷 (22/11, idea 455) Las fotos de los productos, desde las carpetas del Drive compartidas con el enlace.

Desde la sesión de Claude no se llega al Drive y la conexión no baja archivos de más de 10 MB (las fotos de Heaven son TIF de
140 a 210 MB). GitHub sí llega: este script pide a Drive la MINIATURA de cada foto (Drive la arma también de un TIF), sin bajar
el original.

- `hojas`: recorre `carpetas.txt` (con subcarpetas) y arma hojas de contacto numeradas + `indice.json` (marca, carpeta, nombre, id)
  en `herramientas/fotos_drive/salida/`, para elegir qué foto va con cada línea.
- `elegidas`: por cada renglón de `elegidas.txt` (`clave|id`) deja `fotos-productos/<clave>.jpg` (360 px) y
  `fotos-productos/grande/<clave>.jpg` (1000 px), recortadas al producto sobre fondo blanco.

Solo LEE el Drive. En el registro solo salen cantidades y nombres de carpetas.
"""
import html, json, os, re, subprocess, sys, time, urllib.request

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..'))
SALIDA = os.path.join(AQUI, 'salida')
TMP = os.environ.get('RUNNER_TEMP', '/tmp')
UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) panel-fotos'}
IMG = re.compile(r'\.(jpe?g|png|tiff?|heic|webp)$', re.I)


def pedir(url, intentos=3):
    for i in range(intentos):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            if i == intentos - 1:
                raise
            time.sleep(2 + 3 * i)


def carpeta(fid):
    """(subcarpetas, archivos) de una carpeta pública: [(id, nombre)]."""
    h = pedir('https://drive.google.com/embeddedfolderview?id=' + fid).decode('utf-8', 'replace')
    subs, arch = [], []
    for m in re.finditer(r'<div class="flip-entry" id="entry-([\w-]+)".*?<div class="flip-entry-title">(.*?)</div>', h, re.S):
        eid, nom = m.group(1), html.unescape(m.group(2)).strip()
        bloque = h[m.start():m.end()]
        (subs if '/drive/folders/' in bloque else arch).append((eid, nom))
    return subs, arch


def recorrer(fid, ruta, out, marca, prof=0):
    subs, arch = carpeta(fid)
    for eid, nom in arch:
        if IMG.search(nom):
            out.append({'marca': marca, 'carpeta': ruta, 'nombre': nom, 'id': eid})
    if prof < 4:
        for sid, snom in subs:
            recorrer(sid, (ruta + ' / ' if ruta else '') + snom, out, marca, prof + 1)


def miniatura(fid, ancho, dest):
    b = pedir('https://drive.google.com/thumbnail?id=%s&sz=w%d' % (fid, ancho))
    if len(b) < 2000 or b[:4] in (b'<!DO', b'<htm'):
        raise RuntimeError('sin miniatura')
    open(dest, 'wb').write(b)


def hojas():
    if os.path.exists(os.path.join(SALIDA, 'indice.json')) and not os.environ.get('HOJAS_DE_NUEVO'):
        print('hojas: ya están (HOJAS_DE_NUEVO=1 para rehacerlas)'); return
    filas = [l.strip() for l in open(os.path.join(AQUI, 'carpetas.txt')) if l.strip() and not l.startswith('#')]
    todo = []
    for f in filas:
        marca, fid = f.split('|', 1)
        antes = len(todo)
        recorrer(fid.strip(), '', todo, marca.strip())
        print('%s: %d fotos' % (marca, len(todo) - antes))
    os.makedirs(SALIDA, exist_ok=True)
    for f in os.listdir(SALIDA):
        os.remove(os.path.join(SALIDA, f))
    tiles, bien = [], 0
    for n, x in enumerate(todo, 1):
        x['n'] = n
        dest = os.path.join(TMP, 'm%04d.jpg' % n)
        try:
            miniatura(x['id'], 400, dest)
            bien += 1
        except Exception:  # noqa: BLE001
            subprocess.run(['convert', '-size', '400x300', 'xc:#eeeeee', dest], check=True)
            x['sin'] = 1
        etq = '%d · %s · %s' % (n, x['carpeta'][-28:], x['nombre'][-18:])
        tiles.append((dest, etq, x['marca']))
    print('miniaturas: %d de %d' % (bien, len(todo)))
    por = 30
    for marca in sorted(set(t[2] for t in tiles)):
        ts = [t for t in tiles if t[2] == marca]
        for i in range(0, len(ts), por):
            args = ['montage']
            for d, e, _ in ts[i:i + por]:
                args += ['-label', e, d]
            args += ['-tile', '5x', '-geometry', '260x190+6+6', '-pointsize', '11', '-background', 'white',
                     '-quality', '72', os.path.join(SALIDA, 'hoja-%s-%02d.jpg' % (marca, i // por + 1))]
            subprocess.run(args, check=True)
    json.dump(todo, open(os.path.join(SALIDA, 'indice.json'), 'w'), ensure_ascii=False, indent=1)
    print('hojas: %d' % len([f for f in os.listdir(SALIDA) if f.startswith('hoja-')]))


def elegidas():
    filas = [l.strip() for l in open(os.path.join(AQUI, 'elegidas.txt')) if l.strip() and not l.startswith('#')]
    os.makedirs(os.path.join(RAIZ, 'fotos-productos', 'grande'), exist_ok=True)
    hechas = 0
    for f in filas:
        clave, fid = [p.strip() for p in f.split('|', 1)]
        if not re.match(r'^[a-z0-9-]+$', clave):
            print('clave rara, salteada'); continue
        src = os.path.join(TMP, 'o-' + clave + '.jpg')
        miniatura(fid, 1600, src)
        for ancho, dest in ((360, os.path.join(RAIZ, 'fotos-productos', clave + '.jpg')),
                            (1000, os.path.join(RAIZ, 'fotos-productos', 'grande', clave + '.jpg'))):
            subprocess.run(['convert', src, '-background', 'white', '-alpha', 'remove', '-alpha', 'off', '-fuzz', '7%', '-trim', '+repage', '-bordercolor', 'white', '-border', '3%',
                            '-resize', '%dx%d' % (ancho, ancho), '-quality', '76' if ancho == 360 else '74',
                            '-strip', '-interlace', 'JPEG', dest], check=True)
        hechas += 1
    print('fotos hechas: %d de %d' % (hechas, len(filas)))


if __name__ == '__main__':
    {'hojas': hojas, 'elegidas': elegidas}[sys.argv[1] if len(sys.argv) > 1 else 'hojas']()
