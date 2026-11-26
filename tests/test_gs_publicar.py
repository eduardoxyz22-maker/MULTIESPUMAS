#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""herramientas/gs_publicar/preparar.py: cambia SOLO el archivo principal y no deja subir un .gs cortado (26/11/2026)."""
import os, subprocess, sys, tempfile, shutil
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREP = os.path.join(RAIZ, 'herramientas', 'gs_publicar', 'preparar.py')
bien = mal = 0
def chk(ok, msg):
    global bien, mal
    if ok: bien += 1
    else: mal += 1; print('  ✗', msg)
def run(carpeta, nuevo):
    r = subprocess.run([sys.executable, '-I', PREP, carpeta, nuevo], capture_output=True, text=True)
    return r.returncode, r.stdout + r.stderr
def gs(v, fin=None, cola=True):
    s = "var SCRIPT_VERSION = '%s';\nfunction doPost(e){return 1;}\n" % v
    if cola: s += "var FIN_DEL_ARCHIVO = '%s';" % (fin or v)
    return s
def escribir(p, t):
    open(p, 'w', encoding='utf-8').write(t)
def leer(p):
    return open(p, encoding='utf-8').read()

d = tempfile.mkdtemp()
try:
    # 1. cambia solo el principal (que en Google se llama «Código.gs») y deja lo demás igual
    pr = os.path.join(d, 'pull'); os.makedirs(pr)
    escribir(os.path.join(pr, 'Código.gs'), gs('2026-11-21-a'))
    escribir(os.path.join(pr, 'prender_cierre.gs'), 'function prenderKommoCierreUnaVez(){}\n')
    escribir(os.path.join(pr, 'appsscript.json'), '{"timeZone":"America/La_Paz"}')
    escribir(os.path.join(pr, '.clasp.json'), '{"scriptId":"x"}')
    nuevo = os.path.join(d, 'nuevo.gs'); escribir(nuevo, gs('2026-11-23-h'))
    rc, out = run(pr, nuevo)
    chk(rc == 0, '1 sale 0: ' + out)
    chk(leer(os.path.join(pr, 'Código.gs')) == gs('2026-11-23-h'), '1 el principal quedó con el .gs nuevo')
    chk(leer(os.path.join(pr, 'prender_cierre.gs')) == 'function prenderKommoCierreUnaVez(){}\n', '1 el archivo aparte no se tocó')
    chk(leer(os.path.join(pr, 'appsscript.json')) == '{"timeZone":"America/La_Paz"}', '1 el manifiesto no se tocó')
    chk('Código.gs' in out and '2026-11-21-a' in out and 'VERSION=2026-11-23-h' in out, '1 el resumen dice el archivo y las versiones')
    chk('.clasp.json' not in out, '1 no nombra el .clasp.json')
    # 2. .gs cortado: no toca nada
    corto = os.path.join(d, 'corto.gs'); escribir(corto, gs('2026-11-23-h', cola=False))
    pr2 = os.path.join(d, 'pull2'); os.makedirs(pr2); escribir(os.path.join(pr2, 'Código.gs'), gs('2026-11-21-a'))
    rc, out = run(pr2, corto)
    chk(rc == 1 and leer(os.path.join(pr2, 'Código.gs')) == gs('2026-11-21-a'), '2 un .gs cortado no se sube ni se toca nada: ' + out)
    # 3. versiones distintas
    dist = os.path.join(d, 'dist.gs'); escribir(dist, gs('2026-11-23-h', fin='2026-11-22-a'))
    rc, out = run(pr2, dist)
    chk(rc == 1, '3 SCRIPT_VERSION distinta de FIN_DEL_ARCHIVO frena: ' + out)
    # 4. dos archivos con doPost: no adivina
    pr3 = os.path.join(d, 'pull3'); os.makedirs(pr3)
    escribir(os.path.join(pr3, 'A.gs'), gs('1')); escribir(os.path.join(pr3, 'B.gs'), gs('2'))
    rc, out = run(pr3, nuevo)
    chk(rc == 1 and leer(os.path.join(pr3, 'A.gs')) == gs('1') and leer(os.path.join(pr3, 'B.gs')) == gs('2'), '4 con dos principales no reemplaza ninguno: ' + out)
    # 5. ninguno con doPost
    pr4 = os.path.join(d, 'pull4'); os.makedirs(pr4)
    escribir(os.path.join(pr4, 'solo.gs'), 'function otra(){}\n')
    rc, out = run(pr4, nuevo)
    chk(rc == 1, '5 sin archivo principal frena: ' + out)
    # 6. el .gs real del repo pasa las dos revisiones de versión
    pr5 = os.path.join(d, 'pull5'); os.makedirs(pr5); escribir(os.path.join(pr5, 'Código.gs'), gs('0'))
    rc, out = run(pr5, os.path.join(RAIZ, 'google-apps-script.gs'))
    chk(rc == 0, '6 el google-apps-script.gs del repo se puede publicar: ' + out)
finally:
    shutil.rmtree(d, ignore_errors=True)
print('%d bien · %d mal' % (bien, mal))
sys.exit(1 if mal else 0)
