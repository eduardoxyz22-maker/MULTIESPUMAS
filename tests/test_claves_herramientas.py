#!/usr/bin/env python3
# 🔐 (23/11/2026) Las herramientas que hablan con el servidor del panel mandan la clave del equipo cuando la tienen, sin imprimirla.
# Nada sale a la red: se reemplaza curl / urlopen por un doble que anota lo que se mandaría.
#   · cargar_pedidos.py: `key` en toda llamada; `adminKey` solo al forzar; las claves del entorno o de ~/.claves_panel.json;
#     un «clave» del servidor corta con un mensaje que no la nombra.
#   · generar.py: la lectura del panel lleva `key` si está el secreto PANEL_KEY; sin él, como siempre.
# Se corre:  python3 tests/test_claves_herramientas.py   (desde la raíz del repo)
import importlib.util, io, json, os, sys, tempfile, types

BIEN = MAL = 0
def chk(txt, cond, extra=''):
    global BIEN, MAL
    if cond: BIEN += 1
    else: MAL += 1
    print(('✓ ' if cond else '✗ ') + txt + (('  · ' + str(extra)[:200]) if extra != '' else ''))

def cargar(ruta, nombre, env):
    viejo = dict(os.environ)
    os.environ.clear(); os.environ.update(env)
    try:
        spec = importlib.util.spec_from_file_location(nombre, ruta)
        m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
        return m
    finally:
        os.environ.clear(); os.environ.update(viejo)

CP = os.path.join('herramientas', 'pedidos_correo', 'cargar_pedidos.py')
print('\n── cargar_pedidos.py ──')
casa = tempfile.mkdtemp()
m = cargar(CP, 'cp_sin', {'HOME': casa})
chk('sin variables ni archivo: sin claves (como siempre)', m.CLAVE == '' and m.CLAVE_ADMIN == '')
m = cargar(CP, 'cp_env', {'HOME': casa, 'PANEL_KEY': 'eqk7m2p9xq', 'ADMIN_KEY': 'adh3n8w4rt'})
mandado = []
def run(args, input=None, capture_output=None, text=None):
    mandado.append(json.loads(input))
    return types.SimpleNamespace(stdout=json.dumps({'ok': True, 'pedidos': []} if json.loads(input).get('action') == 'list' else {'ok': True}), stderr='')
m.subprocess.run = run
m.post({'action': 'list'}); m.post({'action': 'save', 'pedido': {'id': 'x'}}); m.post({'action': 'save', 'pedido': {'id': 'x'}, 'forzar': True})
chk('con PANEL_KEY: toda llamada lleva `key`', all(c.get('key') == 'eqk7m2p9xq' for c in mandado), [c.get('action') for c in mandado])
chk('`adminKey` en todas (27/11: con el login por usuario prendido, las herramientas entran con ella)', [bool(c.get('adminKey')) for c in mandado] == [True, True, True])
with open(os.path.join(casa, '.claves_panel.json'), 'w') as f:
    json.dump({'key': 'archk2m3p4', 'adminKey': 'arad5n6w7r'}, f)
m2 = cargar(CP, 'cp_arch', {'HOME': casa})
chk('sin variables, las lee de ~/.claves_panel.json', m2.CLAVE == 'archk2m3p4' and m2.CLAVE_ADMIN == 'arad5n6w7r')
m2.subprocess.run = lambda *a, **k: types.SimpleNamespace(stdout=json.dumps({'ok': False, 'error': 'clave'}), stderr='')
try:
    m2.post({'action': 'list'}); chk('un «clave» del servidor corta', False)
except SystemExit as e:
    chk('un «clave» del servidor corta, sin reintentar y sin nombrar la clave', 'clave' in str(e) and 'archk2m3p4' not in str(e), str(e)[:120])

print('\n── generar.py ──')
def leer_con(env):
    g = cargar('generar.py', 'gen_' + str(len(env)), dict(env, KOMMO_TOKEN='x', KOMMO_SUBDOMAIN='x'))
    visto = []
    class R:
        def __init__(s, b): s.b = b
        def read(s): return s.b
        def __enter__(s): return s
        def __exit__(s, *a): return False
    def abrir(req, timeout=None):
        visto.append(json.loads(req.data.decode('utf-8')))
        return R(json.dumps({'ok': True, 'pedidos': []}).encode())
    g._rq.urlopen = abrir
    g._panel_leer_lista()
    return visto
v = leer_con({'PANEL_URL': 'https://ejemplo.invalid/exec', 'PANEL_KEY': 'eqk7m2p9xq'})
chk('con el secreto PANEL_KEY la lectura lleva `key`', v and v[0].get('key') == 'eqk7m2p9xq', v)
v = leer_con({'PANEL_URL': 'https://ejemplo.invalid/exec'})
chk('sin el secreto, la lectura va como siempre (sin `key`)', v and 'key' not in v[0], v)

print('\n%d bien · %d mal' % (BIEN, MAL))
sys.exit(1 if MAL else 0)
