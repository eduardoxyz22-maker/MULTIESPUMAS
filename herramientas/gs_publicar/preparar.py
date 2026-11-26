#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Prepara la carpeta que `clasp push` va a subir al Apps Script del panel (26/11/2026; dueño: «que modifiques el archivo directamente
sin que yo tenga que copiar y pegar el código»).

⚠️ `clasp push` REEMPLAZA todo el proyecto: un archivo que no esté en la carpeta se borra de Google. El proyecto del dueño tiene archivos
aparte (herramientas/*.gs que él agregó) y el manifiesto `appsscript.json`. Por eso el workflow primero BAJA el proyecto (`clasp pull`)
y este script cambia SOLO el archivo principal (el que tiene `function doPost(`), con el nombre que ya tiene en Google, y deja todo lo demás igual.

Uso:  python3 -I preparar.py <carpeta_del_pull> <google-apps-script.gs>
Sale con 1 y no toca nada si: el .gs nuevo está cortado (la última línea no es `var FIN_DEL_ARCHIVO = '<SCRIPT_VERSION>';`), SCRIPT_VERSION
y FIN_DEL_ARCHIVO difieren, o en el proyecto bajado no hay EXACTAMENTE un archivo con `function doPost(`.
Imprime solo nombres de archivo, versiones y tamaños (el registro de Actions es público).
"""
import os, re, sys

def leer(p):
    with open(p, encoding='utf-8') as f:
        return f.read()

def versiones(txt):
    sv = re.search(r"^var SCRIPT_VERSION\s*=\s*'([^']+)'", txt, re.M)
    fin = re.search(r"var FIN_DEL_ARCHIVO\s*=\s*'([^']+)';\s*$", txt)
    return (sv.group(1) if sv else None), (fin.group(1) if fin else None)

def main(carpeta, nuevo):
    txt = leer(nuevo)
    sv, fin = versiones(txt)
    if not sv or not fin:
        print('❌ El .gs nuevo está CORTADO o sin versión: la última línea tiene que ser «var FIN_DEL_ARCHIVO = \'<versión>\';»'); return 1
    if sv != fin:
        print('❌ SCRIPT_VERSION (%s) y FIN_DEL_ARCHIVO (%s) no coinciden' % (sv, fin)); return 1
    principales = []
    for n in sorted(os.listdir(carpeta)):
        if n.endswith('.gs') and 'function doPost(' in leer(os.path.join(carpeta, n)):
            principales.append(n)
    if len(principales) != 1:
        print('❌ En el proyecto bajado hay %d archivos con doPost (%s): no se sabe cuál reemplazar. No se sube nada.' % (len(principales), ', '.join(principales))); return 1
    destino = os.path.join(carpeta, principales[0])
    antes_sv, _ = versiones(leer(destino))
    with open(destino, 'w', encoding='utf-8', newline='\n') as f:
        f.write(txt)
    otros = sorted(n for n in os.listdir(carpeta) if n != principales[0] and not n.startswith('.'))
    print('✅ Archivo principal: %s · versión en Google: %s → nueva: %s · %d bytes' % (principales[0], antes_sv or '?', sv, len(txt.encode('utf-8'))))
    print('   Se conservan sin tocar: %s' % (', '.join(otros) or '(nada más)'))
    print('VERSION=%s' % sv)
    return 0

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(__doc__); sys.exit(2)
    sys.exit(main(sys.argv[1], sys.argv[2]))
