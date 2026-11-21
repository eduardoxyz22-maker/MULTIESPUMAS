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
    mismo turno (el sábado solo AM) y lo anota en las observaciones: va para cuando haya cupo.
  · 🎟️ SOLO si el dueño dijo el día (16/11: «solo cuando yo te instruya para tal día, es tal día; si no, para cuando haya cupo»): el
    pedido lleva `"dia_del_dueno": true` en el JSON y, si ese día sale LLENO, queda EN ESE DÍA igual: el servidor no deja crear uno
    nuevo en un turno lleno, así que se guarda en el primer día con lugar y en el acto se MUEVE al día pedido con `forzar` (lo mismo que
    hace Administración con la clave). El bot junta «nuevo + cambio» en UN aviso de pedido nuevo con el día final. Cerrado, feriado o
    domingo no se fuerzan nunca.
  · cada guardado va con `tr4:1` (08/11, dueño: «por cada pedido que generes en el panel… un mensaje únicamente a mí… y recordarme
    que lo debo subir al TR4»): desde el servidor 2026-11-07-f, a los ~2 minutos el bot le manda `pedido_correo_tr4` al PRIMERO de
    WA_DUENO con los datos del pedido. Un servidor anterior lo ignora.
  · 📌 (mejora 384, 16/11) EL LUGAR GUARDADO: si en el panel alguien guardó el lugar de entrega de ese cliente con Eduardo («📌 Guardar
    como su lugar de entrega» en la ficha del cliente: la fila del sistema `__destinos__`), el pedido lo toma —el enlace (pin), y la zona
    y la dirección si vienen vacías— con «📌 lugar guardado» en las observaciones. La misma regla del formulario (`destParaForm`): solo si
    el pedido no trae su propio enlace y no trae OTRA dirección escrita (a domicilio: no se le pone el pin de la bodega). Nada se inventa:
    sin lugar guardado, queda como antes.

Uso:  python3 -I cargar_pedidos.py <pedidos.json>            (solo muestra lo que haría)
      python3 -I cargar_pedidos.py <pedidos.json> --guardar  (guarda)

Formato de cada pedido del JSON:
  {"clave": "33278", "cliente": "MULTICENTER", "fecha": "2026-11-09", "turno": "PM", "celular": "", "zona": "SUR",
   "direccion": "...", "nota": "33278", "facturarA": "", "observaciones": "...", "total_impreso": 4275,
   "productos": [{"desc": "COLCHON TITANIO ICE", "medida": "140x190", "codigo": "CH1220", "cant": 1, "precio": 4275}],
   "pdf": "<ruta del PDF de la orden>"}   ← opcional (Multicenter, Tienda Amiga): se sube y queda en el pedido para descargarlo
"""
import base64, json, re, sys, time, random, datetime, subprocess, unicodedata

URL = "https://script.google.com/macros/s/AKfycbw3IUxaRvdpvFJOzbuZ78CZIlZNWzMnKbdb91hD27vZfemnWs64fIOYs1-0SV0b8aYkQQ/exec"
BO = datetime.timezone(datetime.timedelta(hours=-4))
VENDEDOR = "Eduardo Añez"
REINTENTA = ('cupos_llenos', 'dia_cerrado', 'feriado')


def post(body, intentos=3):
    for intento in range(intentos):
        # El cuerpo va por la entrada estándar (`--data-binary @-`): un PDF en base64 no entra en un solo argumento (Linux corta
        # cada argumento en 128 KB).
        r = subprocess.run(["curl", "-sS", "-L", "--max-time", "120", "-H", "Content-Type: text/plain;charset=utf-8",
                            "--data-binary", "@-", URL + "?_=%d" % int(time.time() * 1000)],
                           input=json.dumps(body, ensure_ascii=False), capture_output=True, text=True)
        try:
            j = json.loads(r.stdout)
        except Exception:
            time.sleep(3 * (intento + 1))
            continue
        # 🔀 (21/11, revisión de Fable; §4fx) Google a veces convierte el POST en GET: contesta `doGet` (la planilla entera, `pedidos`)
        # y `doPost` nunca corre. Para una acción que no es `list` eso NO es un guardado: se reintenta (no se escribió nada).
        if body.get('action') != 'list' and isinstance(j, dict) and 'pedidos' in j:
            time.sleep(3 * (intento + 1))
            continue
        return j
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


SERVIDOR = {"v": ""}


def leer():
    r = post({"action": "list"})
    if not r.get('ok', True) or 'pedidos' not in r:
        raise SystemExit('No se pudo leer la planilla: ' + json.dumps(r)[:300])
    SERVIDOR["v"] = str(r.get('version') or SERVIDOR["v"])
    return r['pedidos']


PDF_SERVIDOR = '2026-11-20-b'
PDF_MAX = 10 * 1024 * 1024


def subir_pdf(ruta, cliente, clave):
    """📄 (20/11, dueño: «cada vez que cargues un pedido de Multicenter, Tienda Amiga, debes adjuntar el PDF para que Ernesto lo
    pueda descargar… en el pedido en el panel») Sube el PDF de la orden del cliente a la carpeta «PDF de pedidos MultiEspumas»
    (acción `pdfPedido`, servidor ≥ 2026-11-20-b) y devuelve (`{"i": id, "n": nombre}`, None) o (None, motivo)."""
    if SERVIDOR["v"] < PDF_SERVIDOR:
        return None, 'el servidor del panel (%s) todavía no guarda PDF: falta implementar la %s' % (SERVIDOR["v"] or '¿?', PDF_SERVIDOR)
    try:
        datos = open(ruta, 'rb').read()
    except Exception as e:
        return None, 'no se pudo leer el PDF (%s)' % e
    if not datos.startswith(b'%PDF'):
        return None, 'el archivo no es un PDF'
    if len(datos) > PDF_MAX:
        return None, 'el PDF pesa más de 10 MB'
    nombre = re.sub(r'[^\w.\- ]+', '', ruta.replace('\\', '/').split('/')[-1])[:80] or 'pedido.pdf'
    # (20/11, revisión de Fable 2) UNA vez y sin cortar la vuelta: si Google contesta mal, este pedido se carga igual sin el PDF (lo dice
    # la nota) y los siguientes también; reintentar dejaba hasta 3 copias en Drive.
    try:
        r = post({"action": "pdfPedido", "dataUrl": "data:application/pdf;base64," + base64.b64encode(datos).decode('ascii'),
                  "cliente": cliente, "oc": clave, "nombre": nombre}, intentos=1)
    except SystemExit as e:
        return None, 'el servidor no contestó bien al subir el PDF (%s)' % str(e)[:120]
    if r.get('ok') and r.get('fileId'):
        return {"i": r['fileId'], "n": r.get('nombre') or nombre}, None
    return None, 'el servidor no guardó el PDF: ' + str(r.get('error') or r)[:120]


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
    """¿Ya está cargado? (21/11, revisión de Fable) Solo entre los pedidos de EDUARDO (cada vendedor tiene su numeración de notas, §4jd) y
    con el número ENTERO: «33278» no es la nota «133278», ni el celular «73327811», ni la OC de ROHO «260332781»."""
    pat = re.compile(r'(?<![0-9A-Za-z])' + re.escape(clave) + r'(?![0-9A-Za-z])', re.I) if clave else None
    for p in P:
        if nn(p.get('vendedor')) != nn(VENDEDOR):
            continue
        txt = str(p.get('nota') or '') + ' ' + str(p.get('observaciones') or '')
        if (pat and pat.search(txt)) or (nota and str(p.get('nota') or '').strip() == nota):
            return p
    return None


# 📌 (mejora 384) Los lugares de entrega guardados en el panel (`__destinos__`, §4ok-110). Las mismas cuentas que la página:
# `normNombre` (sin tildes, minúsculas, un espacio), `talVendKey` (el vendedor así) y `CLF_GENERICO` (nombres que no alcanzan).
DEST_ID = '__destinos__'
CLF_GENERICO = re.compile(r'^(cliente|clientes|consumidor final|sin nombre|s n|sn|varios|nn|x|na|n a|tienda|\d+)$')


def norm_nombre(v):
    t = re.sub(r'\s+', ' ', str(v if v is not None else '')).strip()
    t = unicodedata.normalize('NFD', t)
    t = ''.join(c for c in t if not ('\u0300' <= c <= '\u036f'))
    return t.lower()


def lugares_guardados(P):
    """cliente|vendedor -> el lugar más nuevo: {'m': enlace, 'z': zona, 'd': dirección, 't': cuándo, 'n': nombre}."""
    fila = next((p for p in P if str(p.get('id')) == DEST_ID), None)
    M = {}
    if not fila:
        return M
    try:
        claves = (json.loads(fila.get('observaciones') or '{}') or {}).get('k') or []
    except Exception:
        return M
    for k in claves:
        try:
            a = json.loads(k)
        except Exception:
            continue
        if not isinstance(a, list) or len(a) < 5 or a[0] != 'd' or not a[1] or not a[2] or not a[4]:
            continue
        e = {'k': k, 'c': str(a[1]), 'v': str(a[2]), 't': float(a[3] or 0), 'm': str(a[4]),
             'z': str(a[5] if len(a) > 5 and a[5] else ''), 'd': str(a[6] if len(a) > 6 and a[6] else ''), 'n': str(a[7] if len(a) > 7 and a[7] else '')}
        idk = e['c'] + '|' + e['v']
        o = M.get(idk)
        if o is None or e['t'] > o['t'] or (e['t'] == o['t'] and e['k'] > o['k']):
            M[idk] = e
    return M


def lugar_para(P, d, vendedor=VENDEDOR):
    """El lugar guardado que toma este pedido, o None (sin lugar, con enlace propio, o con otra dirección escrita)."""
    c = norm_nombre(d.get('cliente'))
    if not c or CLF_GENERICO.match(c) or str(d.get('maps') or '').strip():
        return None
    e = lugares_guardados(P).get(c + '|' + norm_nombre(vendedor))
    if not e:
        return None
    dir_ = str(d.get('direccion') or '').strip()
    if dir_ and norm_nombre(dir_) != norm_nombre(e['d']):
        return None
    return e


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
        # (20/11, dueño, pedido de Karina Torrico: «ponlo sin precio»): solo cuando el dueño lo dice en el chat, el pedido lleva
        # `"sin_precio": true` y sus renglones van en 0 (como los carga Eduardo a mano). Una vuelta automática nunca lo pone.
        sin_precio = bool(d.get('sin_precio')) and precio == 0
        if cant < 1 or (precio <= 0 and not sin_precio) or (not sin_cod and not str(x.get('codigo') or '').strip()):
            raise ValueError('renglón incompleto: %r' % x)
        prods.append({"desc": str(x['desc']).strip(), "medida": str(x.get('medida') or '').strip(),
                      "codigo": str(x.get('codigo') or '').strip().upper(), "cant": cant, "precio": precio})
    suma = round(sum(x['cant'] * x['precio'] for x in prods), 2)
    # 🧹 (20/11, dueño: «¿por qué los pedidos que le doy copiar WhatsApp salen así? …hasta con tu instrucción»): las OBSERVACIONES las lee
    # logística y van en el «📋 Copiar para WhatsApp»: solo lo que sirve para entregar. Lo que es para el dueño (el total del PDF que no da,
    # el día que se movió, el lugar guardado…) va en `notas` del resumen de la vuelta, NUNCA en el pedido.
    obs = str(d.get('observaciones') or '').strip()
    notas = []
    ti = d.get('total_impreso')
    if ti is not None and abs(float(ti) - suma) > 0.005:
        notas.append('El PDF decía total Bs %s, pero la suma de cantidad × precio da Bs %s: se cargó la suma.' % (ti, suma))
    fecha = d['fecha']
    if fecha < hoy_bo().isoformat():
        nueva = siguiente_habil(hoy_bo().isoformat())
        notas.append('La fecha pedida (%s) ya pasó: quedó el %s.' % (fecha, nueva))
        fecha = nueva
    zona, direccion, maps = d.get('zona') or '', d.get('direccion') or '', str(d.get('maps') or '').strip()
    lug = lugar_para(P, d)
    if lug:
        maps = lug['m']
        zona = zona or lug['z']
        direccion = direccion or lug['d']
        notas.append('📌 lugar guardado (%s)' % (' · '.join(x for x in (lug['z'], lug['d']) if x) or 'el pin guardado'))
    rec = {"id": uid(), "fecha": fecha, "oc": next_oc(P), "vendedor": VENDEDOR, "cliente": d['cliente'],
           "productos": prods, "celular": str(d.get('celular') or ''), "turno": d.get('turno') or 'AM',
           "zona": zona, "direccion": direccion, "maps": maps, "pagado": False,
           "saldo": suma, "ts": int(time.time() * 1000), "metodoPago": "",
           "observaciones": obs,
           "estado": "", "entregado": False, "vehiculo": "", "chofer": "", "garantia": "", "nota": d.get('nota') or '',
           "acuenta": 0, "facturarA": d.get('facturarA') or '', "nit": "", "nroDia": next_dia(P, fecha),
           "verificado": False, "fotos": [], "_notas": notas}
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
        notas = rec.pop('_notas', [])
        if not guardar:
            resumen.append({"clave": clave, "resultado": "se cargaría", "oc": rec['oc'], "fecha": rec['fecha'],
                            "turno": rec['turno'], "total": rec['saldo'], "lugar_guardado": bool(rec['maps']), "notas": notas,
                            **({"pdf": d['pdf']} if d.get('pdf') else {})})
            continue
        # 📄 (20/11) El PDF de la orden del cliente (`"pdf": "<ruta>"` en el JSON) se sube ANTES de guardar y queda en el primer
        # producto como `opdf` (la ficha del panel lo muestra con «⬇️ Descargar»; `heredarMarcas` lo conserva al editar).
        if d.get('pdf'):
            f, motivo = subir_pdf(str(d['pdf']), str(rec.get('cliente') or ''), clave)
            if f:
                rec['productos'][0]['opdf'] = [f]
            else:
                notas.append('📄 El PDF no quedó en el pedido: ' + motivo + '.')
        pedida = rec['fecha']
        turno0 = rec['turno']
        res = None
        lleno = None   # 🎟️ (16/11) el día pedido estaba lleno: después de guardarlo se mueve ahí con `forzar`
        for intento in range(6):
            res = post({"action": "save", "pedido": rec, "av": 1, "tr4": 1})   # tr4: el bot le avisa al dueño que lo suba al TR4 (servidor 07-f)
            # (21/11, revisión de Fable) El guardado llegó pero se perdió la respuesta y `post` lo reenvió: el servidor contesta
            # `conflicto` con la fila que YA escribió. El id es nuevo de esta vuelta (`uid`), así que esa fila es la nuestra: quedó cargado.
            if res.get('error') == 'conflicto' and str((res.get('pedido') or {}).get('id') or '') == rec['id']:
                res = {"ok": True, "pedido": res.get('pedido')}
            if res.get('ok'):
                break
            if res.get('error') not in REINTENTA:
                break
            # (21/11, revisión de Fable) Con 0 cupos (domingo, sábado a la tarde: no sale camión) NO es «lleno»: no se fuerza nunca.
            if intento == 0 and res.get('error') == 'cupos_llenos' and d.get('dia_del_dueno') is True and int(res.get('cupos') or 0) > 0:
                lleno = {"usados": res.get('usados'), "cupos": res.get('cupos')}
            # 🛒 (17/11, dueño: «tienda amiga se puede am o pm») Tienda Amiga recibe de 09:00 a 16:00: lleno a la mañana → la tarde del MISMO día
            # (el sábado no hay tarde); recién si la tarde también está llena, el día siguiente a la mañana.
            if (res.get('error') == 'cupos_llenos' and 'TIENDA AMIGA' in str(rec.get('cliente', '')).upper() and rec['turno'] == 'AM'
                    and datetime.date.fromisoformat(rec['fecha']).weekday() != 5):
                rec['turno'] = 'PM'
                P = leer()
                rec['nroDia'] = next_dia(P, rec['fecha'])
                rec['oc'] = next_oc(P)
                notas.append('Se pidió para el %s a la mañana pero estaba lleno: quedó el %s a la tarde.' % (pedida, rec['fecha']))
                continue
            if 'TIENDA AMIGA' in str(rec.get('cliente', '')).upper() and rec['turno'] == 'PM':
                rec['turno'] = 'AM'   # el día siguiente, de nuevo primero la mañana
            f2 = siguiente_habil(rec['fecha'])
            if datetime.date.fromisoformat(f2).weekday() == 5 and rec['turno'] == 'PM':
                rec['turno'] = 'AM'   # el sábado el camión sale solo a la mañana
            P = leer()
            rec['fecha'] = f2
            rec['nroDia'] = next_dia(P, f2)
            rec['oc'] = next_oc(P)
            notas.append('Se pidió para el %s pero ese día no tenía lugar (o estaba cerrado/feriado): quedó el %s %s.' % (pedida, f2, rec['turno']))
        forzado = None
        if res and res.get('ok') and lleno and rec['fecha'] != pedida:
            g = dict(res.get('pedido') or rec)
            g['fecha'] = pedida
            g['turno'] = turno0
            notas.append('El %s %s estaba lleno (%s de %s): se cargó igual en ese día porque el dueño pidió ese día.' % (pedida, turno0, lleno.get('usados'), lleno.get('cupos')))
            r2 = post({"action": "save", "pedido": g, "forzar": True, "av": 1})
            if r2.get('ok'):
                res = r2
                rec['fecha'], rec['turno'] = pedida, turno0
                rec['nroDia'] = (r2.get('pedido') or {}).get('nroDia') or rec['nroDia']
                forzado = True
            else:
                forzado = 'no se pudo pasar al ' + pedida + ': ' + str(r2.get('error') or r2)[:120]
        if res and res.get('ok'):
            g = res.get('pedido') or {}
            resumen.append({"clave": clave, "resultado": "CARGADO", "oc": g.get('oc') or rec['oc'], "fecha": rec['fecha'],
                            "turno": rec['turno'], "nroDia": g.get('nroDia') or rec['nroDia'], "total": rec['saldo'],
                            "pedida": pedida, "lugar_guardado": bool(rec['maps']), "notas": notas,
                            "pdf_en_el_pedido": bool(rec['productos'][0].get('opdf')),
                            **({"dia_lleno_forzado": forzado} if forzado else {})})
        else:
            resumen.append({"clave": clave, "resultado": "NO cargado", "error": (res or {}).get('error'), "detalle": res})
        time.sleep(2)
        P = leer()
    print(json.dumps(resumen, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
