#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Carga en el panel los pedidos que llegan por correo (06/11/2026; dueño: «3 veces al día, cárgalos directo como hoy»).

Recibe un JSON con una lista de pedidos ya leídos de los PDF (ver LEEME.md: quién manda qué y cómo se arma cada uno) y los
guarda en la planilla con la acción `save` del Apps Script, igual que el formulario del panel (`av:1`), a nombre de
Eduardo Añez. Antes de cada uno relee la planilla:

  · si la `clave` (el número de OC, o el «OP-…» de Copacaba) ya está en la «nota» o en las observaciones de algún pedido,
    NO lo carga (ya está);
  · la OC del panel es la siguiente del mes (como `nextOcMes`) y el N° del día el siguiente de esa fecha (`nextNroDia`);
  · el total es SIEMPRE Σ cantidad × precio unitario (si el PDF trae otro total, se anota y no se usa);
  · si el servidor dice que el día está lleno, cerrado o es feriado, prueba el siguiente día hábil (sin domingos) en el
    mismo turno (el sábado solo AM) y lo anota en las observaciones. Nunca fuerza.
  · cada guardado va con `tr4:1` (08/11, dueño: «por cada pedido que generes en el panel… un mensaje únicamente a mí… y recordarme
    que lo debo subir al TR4»): desde el servidor 2026-11-07-f, a los ~2 minutos el bot le manda `pedido_correo_tr4` al PRIMERO de
    WA_DUENO con los datos del pedido. Un servidor anterior lo ignora.

Uso:  python3 -I cargar_pedidos.py <pedidos.json>            (solo muestra lo que haría)
      python3 -I cargar_pedidos.py <pedidos.json> --guardar  (guarda)

Formato de cada pedido del JSON:
  {"clave": "33278", "cliente": "MULTICENTER", "fecha": "2026-11-09", "turno": "PM", "celular": "", "zona": "SUR",
   "direccion": "...", "nota": "33278", "facturarA": "", "observaciones": "...", "total_impreso": 4275,
   "productos": [{"desc": "COLCHON TITANIO ICE", "medida": "140x190", "codigo": "CH1220", "cant": 1, "precio": 4275}]}
"""
import json, re, sys, time, random, datetime, subprocess, unicodedata

URL = "https://script.google.com/macros/s/AKfycbw3IUxaRvdpvFJOzbuZ78CZIlZNWzMnKbdb91hD27vZfemnWs64fIOYs1-0SV0b8aYkQQ/exec"
BO = datetime.timezone(datetime.timedelta(hours=-4))
VENDEDOR = "Eduardo Añez"
REINTENTA = ('cupos_llenos', 'dia_cerrado', 'feriado')


def post(body):
    for intento in range(3):
        r = subprocess.run(["curl", "-sS", "-L", "--max-time", "120", "-H", "Content-Type: text/plain;charset=utf-8",
                            "-d", json.dumps(body, ensure_ascii=False), URL + "?_=%d" % int(time.time() * 1000)],
                           capture_output=True, text=True)
        try:
            return json.loads(r.stdout)
        except Exception:
            time.sleep(3 * (intento + 1))
    raise SystemExit('El servidor del panel no contestó bien: ' + (r.stdout or r.stderr)[:300])


def nn(s):
    s = unicodedata.normalize('NFD', str(s or ''))
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn').upper().strip()


def b36(n):
    a = '0123456789abcdefghijklmnopqrstuvwxyz'
    s = ''
    while n:
        n, r = divmod(n, 36)
        s = a[r] + s
    return s or '0'


def uid():
    return 'p' + b36(int(time.time() * 1000)) + b36(random.randint(0, 999999))


def hoy_bo():
    return datetime.datetime.now(BO).date()


def leer():
    r = post({"action": "list"})
    if not r.get('ok', True) or 'pedidos' not in r:
        raise SystemExit('No se pudo leer la planilla: ' + json.dumps(r)[:300])
    return r['pedidos']


def next_oc(P):
    """La siguiente OC del mes en curso (la misma cuenta que `nextOcMes` del panel: sin ROHO, sin ATC/RPT)."""
    mes = datetime.datetime.now(BO).strftime('%Y-%m')
    pre = mes[5:7]
    mx = 0
    for p in P:
        if 'ROHO' in nn(p.get('vendedor')):
            continue
        try:
            m_p = datetime.datetime.fromtimestamp(int(p['ts']) / 1000, BO).strftime('%Y-%m')
        except Exception:
            continue
        if m_p != mes:
            continue
        m = re.match(r'^(\d{2})-(\d+)$', str(p.get('oc') or '').strip())
        if m and m.group(1) == pre:
            mx = max(mx, int(m.group(2)))
    return '%s-%03d' % (pre, mx + 1)


def next_dia(P, f):
    mx = n = 0
    for p in P:
        if p.get('fecha') == f:
            n += 1
            mx = max(mx, int(p.get('nroDia') or 0))
    return max(mx, n) + 1


def ya_esta(P, clave, nota):
    for p in P:
        txt = str(p.get('nota') or '') + ' ' + str(p.get('observaciones') or '')
        if (clave and clave in txt) or (nota and str(p.get('nota') or '').strip() == nota):
            return p
    return None


def siguiente_habil(f):
    d = datetime.date.fromisoformat(f) + datetime.timedelta(days=1)
    while d.weekday() == 6:  # domingo
        d += datetime.timedelta(days=1)
    return d.isoformat()


def armar(d, P):
    prods = []
    for x in d['productos']:
        cant = int(x['cant'])
        precio = round(float(x['precio']), 2)
        # (14/11, dueño: «es medida especial tal cual dice el correo, no tengo el código aún»): una MEDIDA ESPECIAL va sin
        # código (`"especial": true` en el renglón), como la carga el panel (§4gk: se fabrica a pedido, nunca sale del stock).
        sin_cod = bool(x.get('especial')) and str(x.get('medida') or '').strip()
        if cant < 1 or precio <= 0 or (not sin_cod and not str(x.get('codigo') or '').strip()):
            raise ValueError('renglón incompleto: %r' % x)
        prods.append({"desc": str(x['desc']).strip(), "medida": str(x.get('medida') or '').strip(),
                      "codigo": str(x.get('codigo') or '').strip().upper(), "cant": cant, "precio": precio})
    suma = round(sum(x['cant'] * x['precio'] for x in prods), 2)
    obs = str(d.get('observaciones') or '').strip()
    ti = d.get('total_impreso')
    if ti is not None and abs(float(ti) - suma) > 0.005:
        obs += ' · El PDF decía total Bs %s, pero la suma de cantidad × precio da Bs %s: vale la suma.' % (ti, suma)
    fecha = d['fecha']
    if fecha < hoy_bo().isoformat():
        nueva = siguiente_habil(hoy_bo().isoformat())
        obs += ' · La fecha pedida (%s) ya pasó: quedó el %s.' % (fecha, nueva)
        fecha = nueva
    rec = {"id": uid(), "fecha": fecha, "oc": next_oc(P), "vendedor": VENDEDOR, "cliente": d['cliente'],
           "productos": prods, "celular": str(d.get('celular') or ''), "turno": d.get('turno') or 'AM',
           "zona": d.get('zona') or '', "direccion": d.get('direccion') or '', "maps": "", "pagado": False,
           "saldo": suma, "ts": int(time.time() * 1000), "metodoPago": "",
           "observaciones": (obs + ' · Cargado automáticamente desde el correo.').strip(' ·'),
           "estado": "", "entregado": False, "vehiculo": "", "chofer": "", "garantia": "", "nota": d.get('nota') or '',
           "acuenta": 0, "facturarA": d.get('facturarA') or '', "nit": "", "nroDia": next_dia(P, fecha),
           "verificado": False, "fotos": []}
    return rec


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    guardar = '--guardar' in sys.argv[2:]
    pedidos = json.load(open(sys.argv[1], encoding='utf-8'))
    resumen = []
    P = leer()
    for d in pedidos:
        clave = str(d.get('clave') or '').strip()
        ya = ya_esta(P, clave, str(d.get('nota') or '').strip())
        if ya:
            resumen.append({"clave": clave, "resultado": "ya estaba", "oc": ya.get('oc'), "fecha": ya.get('fecha')})
            continue
        try:
            rec = armar(d, P)
        except Exception as e:
            resumen.append({"clave": clave, "resultado": "NO cargado: " + str(e)})
            continue
        if not guardar:
            resumen.append({"clave": clave, "resultado": "se cargaría", "oc": rec['oc'], "fecha": rec['fecha'],
                            "turno": rec['turno'], "total": rec['saldo']})
            continue
        pedida = rec['fecha']
        obs_base = rec['observaciones']
        res = None
        for intento in range(6):
            res = post({"action": "save", "pedido": rec, "av": 1, "tr4": 1})   # tr4: el bot le avisa al dueño que lo suba al TR4 (servidor 07-f)
            if res.get('ok'):
                break
            if res.get('error') not in REINTENTA:
                break
            f2 = siguiente_habil(rec['fecha'])
            if datetime.date.fromisoformat(f2).weekday() == 5 and rec['turno'] == 'PM':
                rec['turno'] = 'AM'   # el sábado el camión sale solo a la mañana
            P = leer()
            rec['fecha'] = f2
            rec['nroDia'] = next_dia(P, f2)
            rec['oc'] = next_oc(P)
            rec['observaciones'] = obs_base + (' · Se pidió para el %s pero ese día no tenía lugar (o estaba cerrado/feriado): quedó el %s %s.'
                                               % (pedida, f2, rec['turno']))
        if res and res.get('ok'):
            g = res.get('pedido') or {}
            resumen.append({"clave": clave, "resultado": "CARGADO", "oc": g.get('oc') or rec['oc'], "fecha": rec['fecha'],
                            "turno": rec['turno'], "nroDia": g.get('nroDia') or rec['nroDia'], "total": rec['saldo'],
                            "pedida": pedida})
        else:
            resumen.append({"clave": clave, "resultado": "NO cargado", "error": (res or {}).get('error'), "detalle": res})
        time.sleep(2)
        P = leer()
    print(json.dumps(resumen, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
