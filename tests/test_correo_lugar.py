#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
📌 (mejora 384, 16/11) LOS PEDIDOS QUE ENTRAN POR CORREO TOMAN EL LUGAR GUARDADO.

`herramientas/pedidos_correo/cargar_pedidos.py` arma cada pedido del correo a nombre de Eduardo. Si en el panel alguien guardó el lugar de
entrega de ese cliente con Eduardo («📌 Guardar como su lugar de entrega», la fila `__destinos__`), el pedido lo toma: el pin, y la zona y la
dirección si vienen vacías, con «📌 lugar guardado» en las observaciones. Con la MISMA regla del formulario (`destParaForm`): no si el pedido
trae su propio enlace, ni si trae OTRA dirección escrita (a domicilio), ni con otro vendedor, ni con un nombre genérico. Sin lugar guardado,
como antes. Nada sale a la red: la planilla es una lista inventada.

Se corre solo:  python3 tests/test_correo_lugar.py
"""
import importlib.util, json, os, re, subprocess, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('cargar_pedidos', os.path.join(RAIZ, 'herramientas', 'pedidos_correo', 'cargar_pedidos.py'))
cp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cp)

BIEN = MAL = 0


def chk(nombre, cond, extra=None):
    global BIEN, MAL
    if cond:
        BIEN += 1
    else:
        MAL += 1
    print(('✓ ' if cond else '✗ ') + nombre + (('  · ' + json.dumps(extra, ensure_ascii=False)[:400]) if extra is not None else ''))


def clave(c, v, t, m, z='', d='', n='', vn=''):
    return json.dumps(['d', c, v, t, m, z, d, n, vn], ensure_ascii=False, separators=(',', ':'))


PIN_BODEGA = 'https://www.google.com/maps?q=-17.7401,-63.1702'
PIN_VIEJO = 'https://www.google.com/maps?q=-17.7000,-63.1000'
P = [
    {"id": "__destinos__", "cliente": "📌 LUGARES", "observaciones": json.dumps({"v": 1, "k": [
        clave('tienda amiga er s.a.', 'eduardo anez', 100, PIN_VIEJO, 'Norte', 'Bodega vieja', 'TIENDA AMIGA ER S.A.', 'Eduardo Añez'),
        clave('tienda amiga er s.a.', 'eduardo anez', 200, PIN_BODEGA, 'Norte', 'Almacenes Ferrotodo Bodega 14', 'TIENDA AMIGA ER S.A.', 'Eduardo Añez'),
        clave('multicenter', 'mirian salazar', 300, PIN_VIEJO, 'Sur', 'Otra', 'MULTICENTER', 'Mirian Salazar'),
        clave('cliente', 'eduardo anez', 300, PIN_VIEJO, 'Sur', '', 'CLIENTE', 'Eduardo Añez'),
        'esto no es una clave'
    ]})},
    {"id": "p1", "oc": "11-010", "vendedor": "Eduardo Añez", "cliente": "OTRO", "fecha": "2026-11-17", "ts": 1}
]
PROD = [{"desc": "COLCHON TITANIO ICE", "medida": "140x190", "codigo": "CH1220", "cant": 1, "precio": 4275}]


def pedido(**o):
    d = {"clave": "X1", "cliente": "TIENDA AMIGA ER S.A.", "fecha": "2099-12-30", "turno": "AM", "productos": PROD, "observaciones": "OC Marketplace 1"}
    d.update(o)
    return d


print('── 1. la lista de lugares ──')
M = cp.lugares_guardados(P)
e = M.get('tienda amiga er s.a.|eduardo anez')
chk('1a · lee la fila `__destinos__` y, de dos del mismo cliente, se queda con el más nuevo', e and e['m'] == PIN_BODEGA and e['d'] == 'Almacenes Ferrotodo Bodega 14', e)
chk('1b · una clave rota no rompe nada', len(M) == 3, list(M))
chk('1c · sin la fila, no hay lugares', cp.lugares_guardados([{"id": "p1"}]) == {})

print('── 2. el pedido toma el lugar ──')
r = cp.armar(pedido(), P)
chk('2a · sin dirección ni enlace: pone el pin, la zona y la dirección guardados', r['maps'] == PIN_BODEGA and r['zona'] == 'Norte' and r['direccion'] == 'Almacenes Ferrotodo Bodega 14', {k: r[k] for k in ('maps', 'zona', 'direccion')})
chk('2b · …y lo dice en las observaciones', '📌 lugar guardado (Norte · Almacenes Ferrotodo Bodega 14)' in r['observaciones'], r['observaciones'])
r = cp.armar(pedido(cliente='Tienda  Amiga ER S.A.', direccion='ALMACENES FERROTODO BODEGA 14', zona='Norte Lejano'), P)
chk('2c · la misma dirección (otras mayúsculas o espacios) vale; la zona escrita manda', r['maps'] == PIN_BODEGA and r['zona'] == 'Norte Lejano', {k: r[k] for k in ('maps', 'zona')})

print('── 3. lo que NO se toca ──')
r = cp.armar(pedido(direccion='Av. Banzer 5to anillo, casa 22'), P)
chk('3a · con OTRA dirección escrita (a domicilio) no se le pone el pin de la bodega', r['maps'] == '' and '📌' not in r['observaciones'], r['maps'])
r = cp.armar(pedido(maps='https://www.google.com/maps?q=-17.8,-63.2'), P)
chk('3b · un enlace que trae el pedido manda', r['maps'] == 'https://www.google.com/maps?q=-17.8,-63.2' and '📌' not in r['observaciones'], r['maps'])
r = cp.armar(pedido(cliente='MULTICENTER'), P)
chk('3c · un lugar guardado con OTRO vendedor no vale para Eduardo', r['maps'] == '', r['maps'])
r = cp.armar(pedido(cliente='Cliente'), P)
chk('3d · con un nombre genérico («Cliente») no se adivina', r['maps'] == '', r['maps'])
r = cp.armar(pedido(cliente='OTRO CLIENTE'), P)
chk('3e · sin lugar guardado, como antes (sin pin)', r['maps'] == '' and r['zona'] == '', r['maps'])

print('── 4. la misma cuenta que la página ──')
html = open(os.path.join(RAIZ, 'pedidos.html'), encoding='utf-8').read()
m = re.search(r'var NORM_NOMBRE_MEMO=null[\s\S]*?\nfunction nombreCanonico', html)
casos = ['Eduardo Añez', '  TIENDA   AMIGA ER S.A. ', 'José Carlos Copacaba', 'MÜLTICENTER', 'Ñandú']
if m:
    js = m.group(0).replace('\nfunction nombreCanonico', '') + '\nconsole.log(JSON.stringify(' + json.dumps(casos, ensure_ascii=False) + '.map(normNombre)));'
    try:
        out = subprocess.run(['node', '-e', js], capture_output=True, text=True, timeout=30).stdout.strip()
        chk('4 · `norm_nombre` da lo mismo que `normNombre` de la página', json.loads(out) == [cp.norm_nombre(c) for c in casos], {'js': out, 'py': [cp.norm_nombre(c) for c in casos]})
    except Exception as ex:
        chk('4 · `norm_nombre` da lo mismo que `normNombre` de la página', False, str(ex))
else:
    chk('4 · encuentra `normNombre` en pedidos.html', False)
cg = re.search(r"var CLF_GENERICO=/(.*?)/;", html)
chk('4b · `CLF_GENERICO` es el mismo de la página', cg and cg.group(1).replace('\\d', r'\d') == cp.CLF_GENERICO.pattern, cg and cg.group(1))

print('\n%d bien · %d mal' % (BIEN, MAL))
sys.exit(1 if MAL else 0)
