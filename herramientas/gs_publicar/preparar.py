#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Prepara la carpeta que `clasp push` va a subir al Apps Script del panel (26/11/2026; dueño: «que modifiques el archivo directamente
sin que yo tenga que copiar y pegar el código»).

⚠️ `clasp push` REEMPLAZA todo el proyecto: un archivo que no esté en la carpeta se borra de Google. El proyecto del dueño tiene archivos
aparte (herramientas/*.gs que él agregó) y el manifiesto `appsscript.json`. Por eso el workflow primero BAJA el proyecto (`clasp pull`)
y este script cambia SOLO el archivo principal (el que tiene `function doPost(`; clasp 2.x baja los archivos como `.js`, no `.gs`), con el nombre que ya tiene en Google, y deja todo lo demás igual.

Uso:  python3 -I preparar.py <carpeta_del_pull> <google-apps-script.gs> [archivo_extra.gs ...]
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

def main(carpeta, nuevo, extras=()):
    txt = leer(nuevo)
    sv, fin = versiones(txt)
    if not sv or not fin:
        print('❌ El .gs nuevo está CORTADO o sin versión: la última línea tiene que ser «var FIN_DEL_ARCHIVO = \'<versión>\';»'); return 1
    if sv != fin:
        print('❌ SCRIPT_VERSION (%s) y FIN_DEL_ARCHIVO (%s) no coinciden' % (sv, fin)); return 1
    principales = []
    for n in sorted(os.listdir(carpeta)):
        if n.endswith(('.gs', '.js')) and 'function doPost(' in leer(os.path.join(carpeta, n)):
            principales.append(n)
    if len(principales) != 1:
        print('❌ En el proyecto bajado hay %d archivos con doPost (%s): no se sabe cuál reemplazar. No se sube nada. Archivos bajados: %s' % (len(principales), ', '.join(principales), ', '.join(n for n in sorted(os.listdir(carpeta)) if not n.startswith('.')) or '(ninguno)')); return 1
    destino = os.path.join(carpeta, principales[0])
    antes_sv, _ = versiones(leer(destino))
    with open(destino, 'w', encoding='utf-8', newline='\n') as f:
        f.write(txt)
    # archivos aparte que hay que agregar o actualizar en el proyecto (herramientas/<nombre>.gs): se escriben con la extensión que usa el
    # proyecto bajado (clasp 2.x: .js) y NO pueden traer doPost ni repetir un nombre de función de otro archivo del proyecto.
    ext = os.path.splitext(principales[0])[1]
    funcs = lambda t: set(re.findall(r'^function\s+(\w+)', t, re.M))
    ocupados = {}
    for n in sorted(os.listdir(carpeta)):
        if n.endswith(('.gs', '.js')) and n != principales[0]:
            for f in funcs(leer(os.path.join(carpeta, n))): ocupados[f] = n
    for f in funcs(txt): ocupados[f] = principales[0]
    agregados = []
    for ruta in extras:
        base = os.path.basename(ruta)
        if not re.fullmatch(r'[A-Za-z0-9_]+\.gs', base):
            print('❌ Nombre de archivo extra no válido: %s' % base); return 1
        et = leer(ruta)
        if 'function doPost(' in et:
            print('❌ %s trae doPost: solo el archivo principal puede tenerlo' % base); return 1
        destino_x = os.path.join(carpeta, base[:-3] + ext)
        propias = funcs(leer(destino_x)) if os.path.exists(destino_x) else set()
        choques = sorted(f for f in funcs(et) if f in ocupados and ocupados[f] != base[:-3] + ext and f not in propias)
        if choques:
            print('❌ %s repite funciones que ya tiene otro archivo del proyecto: %s. No se sube nada.' % (base, ', '.join(choques))); return 1
        agregados.append((destino_x, et, base))
    for destino_x, et, base in agregados:
        existia = os.path.exists(destino_x)
        with open(destino_x, 'w', encoding='utf-8', newline='\n') as f:
            f.write(et)
        print('✅ Archivo aparte %s: %s (%d bytes)' % ('actualizado' if existia else 'AGREGADO', os.path.basename(destino_x), len(et.encode('utf-8'))))
    otros = sorted(n for n in os.listdir(carpeta) if n != principales[0] and not n.startswith('.'))
    print('✅ Archivo principal: %s · versión en Google: %s → nueva: %s · %d bytes' % (principales[0], antes_sv or '?', sv, len(txt.encode('utf-8'))))
    print('   Se conservan sin tocar: %s' % (', '.join(otros) or '(nada más)'))
    print('VERSION=%s' % sv)
    return 0

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(__doc__); sys.exit(2)
    sys.exit(main(sys.argv[1], sys.argv[2], sys.argv[3:]))
