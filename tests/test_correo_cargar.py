#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
📧 (21/11, revisión de Fable de pedidos) EL CARGADOR DE PEDIDOS POR CORREO CONTRA EL .gs REAL.

Corre `herramientas/pedidos_correo/cargar_pedidos.py` de verdad contra el `.gs` real detrás de un HTTP local (`tests/correo_gs_http.js`,
planilla de mentira, datos inventados). Cuida los cuatro errores que encontró la revisión:
  1. «ya estaba» por un número que solo se PARECE (la nota de otra vendedora, un celular, una OC de ROHO más larga);
  2. Google convierte el POST en GET (§4fx): sin guardar no puede decir «CARGADO»;
  3. el guardado entra y la respuesta se pierde: el reintento da `conflicto` con la fila propia → es «CARGADO»;
  4. `dia_del_dueno` nunca fuerza un domingo ni la tarde de un sábado (no sale camión).
Y lo que ya andaba: segunda vuelta «ya estaba», día lleno al siguiente sin forzar, OC y N° del día distintos, total = cantidad × precio.

Se corre solo:  python3 tests/test_correo_cargar.py
"""
import sys, json, os, subprocess, time, datetime, io, contextlib, tempfile, types, importlib.util
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('cargar_pedidos', os.path.join(RAIZ, 'herramientas', 'pedidos_correo', 'cargar_pedidos.py'))
c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(c)
HTTP = os.path.join(RAIZ, 'tests', 'correo_gs_http.js')
TMP = tempfile.mkdtemp(prefix='correo_cargar_')
_dormir = time.sleep
c.time = types.SimpleNamespace(time=time.time, sleep=lambda s: None)
c.URL = 'https://ninguna-parte.invalid/'   # nunca la planilla real
for k in ('http_proxy', 'HTTP_PROXY'):
    os.environ.pop(k, None)
os.environ['no_proxy'] = os.environ['NO_PROXY'] = '127.0.0.1,localhost'
BIEN = MAL = 0


def ok(l, cnd, e=None):
    global BIEN, MAL
    if cnd:
        BIEN += 1
    else:
        MAL += 1
    print(('✓ ' if cnd else '✗ ') + l + ('' if cnd else ' · ' + json.dumps(e, ensure_ascii=False, default=str)[:600]))


def dia(n, sin=(6,)):
    d = datetime.datetime.now(c.BO).date()
    while n > 0 or d.weekday() in sin:
        d += datetime.timedelta(days=1)
        if d.weekday() not in sin:
            n -= 1
    return d.isoformat()


def caso(nombre, semilla, pedidos, modo='ok', veces=1):
    d = os.path.join(TMP, 'py_' + nombre)
    os.makedirs(d, exist_ok=True)
    json.dump(semilla, open(d + '/semilla.json', 'w'))
    open(d + '/modo.txt', 'w').write(modo)
    pr = subprocess.Popen(['node', HTTP, d], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(150):
        if os.path.exists(d + '/puerto.txt'):
            break
        _dormir(0.1)
    c.URL = 'http://127.0.0.1:%s/' % open(d + '/puerto.txt').read()
    json.dump(pedidos, open(d + '/pedidos.json', 'w'))
    outs = []
    try:
        for _ in range(veces):
            sys.argv = ['x', d + '/pedidos.json', '--guardar']
            buf = io.StringIO()
            with contextlib.redirect_stdout(buf):
                c.main()
            outs.append(json.loads(buf.getvalue()))
        filas = json.loads(subprocess.run(['curl', '-s', '--noproxy', '*', c.URL + 'filas'], capture_output=True, text=True).stdout)
    finally:
        pr.kill()
        c.URL = 'https://ninguna-parte.invalid/'
    return outs, filas


base = lambda **k: dict({"id": "s1", "oc": "11-001", "vendedor": "Isabel Robledo", "cliente": "CLIENTA INVENTADA", "celular": "70000001", "fecha": dia(3), "turno": "PM",
    "zona": "Norte", "direccion": "X", "ts": int(time.time()*1000), "saldo": 100, "nota": "", "observaciones": "", "productos": [{"desc": "COLCHON X", "medida": "140x190", "cant": 1, "precio": 100}]}, **k)
mc = lambda clave, **k: dict({"clave": clave, "cliente": "MULTICENTER", "fecha": dia(2), "turno": "AM", "zona": "PARQUE INDUSTRIAL", "direccion": "ALMACENES MULTICENTER", "nota": clave,
    "observaciones": "OC Multicenter %s" % clave, "total_impreso": 4275, "productos": [{"desc": "COLCHON TITANIO ICE", "medida": "140x190", "codigo": "CH1220", "cant": 1, "precio": 4275}]}, **k)

print('— 0. control: carga uno y la segunda vuelta dice «ya estaba» —')
o, f = caso('control', [base()], [mc('33278')], veces=2)
ok('0a cargado una vez', o[0][0]['resultado'] == 'CARGADO' and o[1][0]['resultado'] == 'ya estaba' and len([x for x in f if x['cliente'] == 'MULTICENTER']) == 1, (o, f))

print('— 1. la nota de venta de OTRA vendedora contiene el número de la OC —')
o, f = caso('nota_ajena', [base(nota='133278')], [mc('33278')])
ok('1a la OC 33278 de Multicenter se carga aunque Isabel tenga la nota 133278', o[0][0]['resultado'] == 'CARGADO', o[0])
o, f = caso('nota_igual', [base(nota='33278')], [mc('33278')])
ok('1b …y aunque otra vendedora tenga una nota de venta 33278 (cada vendedor tiene su numeración, §4jd)', o[0][0]['resultado'] == 'CARGADO', o[0])
o, f = caso('obs_cel', [base(observaciones='LLAMAR ANTES AL 73327811')], [mc('33278')])
ok('1c …y aunque las observaciones de otro pedido traigan un celular con esos números', o[0][0]['resultado'] == 'CARGADO', o[0])
o, f = caso('roho9', [base(vendedor='Eduardo Añez', cliente='Roho', nota='260332781', observaciones='Tienda 1 · OC ROHO 260332781')], [mc('33278')])
ok('1d …y aunque una OC de ROHO de 9 dígitos (de Eduardo) contenga el número', o[0][0]['resultado'] == 'CARGADO', o[0])

o, f = caso('obs_eduardo', [base(vendedor='Eduardo Añez', cliente='MULTICENTER', nota='', observaciones='OC Multicenter 33278 a domicilio')], [mc('33278')])
ok('1e la OC ENTERA en las observaciones de un pedido de Eduardo sí es «ya estaba»', o[0][0]['resultado'] == 'ya estaba', o[0])

print('— 2. Google convierte el POST en GET (§4fx): contesta la lectura y doPost no corre —')
o, f = caso('get1', [base()], [mc('40001')], modo='get1')
n = len([x for x in f if x['cliente'] == 'MULTICENTER'])
ok('2a si el pedido NO quedó en la planilla, el resumen no dice CARGADO', not (o[0][0]['resultado'] == 'CARGADO' and n == 0), {'resumen': o[0][0]['resultado'], 'filas_multicenter': n})
ok('2b …y como no se escribió nada, se reintenta y queda UNA fila, «CARGADO»', o[0][0]['resultado'] == 'CARGADO' and n == 1, {'resumen': o[0][0], 'filas_multicenter': n})

print('— 3. el guardado ENTRA pero la respuesta llega rota (página de error) —')
o, f = caso('perder1', [base()], [mc('40002')], modo='perder1')
n = len([x for x in f if x['cliente'] == 'MULTICENTER'])
ok('3a una sola fila', n == 1, f)
ok('3b …y el resumen dice que quedó cargado (no «NO cargado»)', o[0][0]['resultado'] == 'CARGADO', o[0][0])

print('— 4. día lleno: pasa al siguiente, sin forzar; dos pedidos seguidos: OC y N° del día distintos —')
D = dia(2)
llenos = [base(id='L%d' % i, oc='11-1%02d' % i, cliente='LLENA %d' % i, celular='7000010%d' % (i % 10), fecha=D, turno='AM') for i in range(12)]
o, f = caso('lleno', llenos, [mc('50001', fecha=D), mc('50002', fecha=D)])
m = [x for x in f if x['cliente'] == 'MULTICENTER']
ok('4a los dos cargados fuera del turno lleno y sin pasarse (12 en el AM)', len(m) == 2 and all(x['fecha'] != D for x in m) and len([x for x in f if x['fecha'] == D and x['turno'] == 'AM']) == 12, m)
ok('4b OC distintas y N° del día distintos', len(set(x['oc'] for x in f)) == len(f) and len(set((x['fecha'], x['nroDia']) for x in m)) == 2, m)
ok('4c total = cantidad × precio', all(float(x['saldo']) == 4275 for x in m), m)

print('— 5. dia_del_dueno en un turno lleno: queda ese día; en DOMINGO no se fuerza nunca (lo dice el propio script) —')
o, f = caso('dueno', llenos, [mc('50003', fecha=D, dia_del_dueno=True)])
m = [x for x in f if x['cliente'] == 'MULTICENTER']
ok('5a queda en el día pedido, forzado, una fila', len(m) == 1 and m[0]['fecha'] == D and o[0][0].get('dia_lleno_forzado') is True, (o, m))
dom = datetime.datetime.now(c.BO).date()
while dom.weekday() != 6: dom += datetime.timedelta(days=1)
dom = dom.isoformat()
o, f = caso('domingo', [base()], [mc('50004', fecha=dom, dia_del_dueno=True)])
m = [x for x in f if x['cliente'] == 'MULTICENTER']
ok('5b un pedido «del dueño» para un DOMINGO no termina en domingo', len(m) == 1 and m[0]['fecha'] != dom, (o[0][0], m))
sab = datetime.datetime.now(c.BO).date() + datetime.timedelta(days=1)
while sab.weekday() != 5: sab += datetime.timedelta(days=1)
sab = sab.isoformat()
o, f = caso('sabpm', [base()], [mc('50005', fecha=sab, turno='PM', dia_del_dueno=True)])
m = [x for x in f if x['cliente'] == 'MULTICENTER']
ok('5c …ni en la TARDE de un sábado (no hay camión)', len(m) == 1 and not (m[0]['fecha'] == sab and m[0]['turno'] == 'PM'), (o[0][0], m))

print('— 6. el mismo pedido dos veces en el mismo JSON —')
o, f = caso('doble', [base()], [mc('60001'), mc('60001')])
ok('6a una sola fila', len([x for x in f if x['cliente'] == 'MULTICENTER']) == 1, o)
print('— 7. fecha pasada / renglón sin precio / cantidad 0 —')
o, f = caso('varios', [base()], [mc('70001', fecha='2026-01-05'), mc('70002', productos=[{"desc": "X", "medida": "1", "codigo": "CH1", "cant": 1, "precio": 0}]), mc('70003', productos=[{"desc": "X", "medida": "1", "codigo": "", "cant": 2, "precio": 10}])])
ok('7a fecha pasada → un día que viene; sin precio y sin código NO se cargan', o[0][0]['resultado'] == 'CARGADO' and o[0][0]['fecha'] > datetime.date.today().isoformat() and o[0][1]['resultado'].startswith('NO') and o[0][2]['resultado'].startswith('NO'), o)

print('\n%d bien · %d mal' % (BIEN, MAL))
sys.exit(1 if MAL else 0)
