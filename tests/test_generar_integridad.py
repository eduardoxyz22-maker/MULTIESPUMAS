#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🛡️ EL DASHBOARD DE VENTAS NO SE PUBLICA CON NÚMEROS ROTOS (25/10, auditoría de Codex/Astra CRM-01 y CRM-03).

Corre `generar.py` ENTERO contra un Kommo de mentira (datos inventados, ni un lead real) y escribe en una carpeta temporal,
nunca en el index.html del repo.

LO QUE CUIDA:
  CRM-01  Si una lectura de Kommo falla a mitad (una página de leads, los campos, el token vencido), el generador NO escribe
          el panel: termina con error. Así el bot no publica, el panel de GitHub Pages se queda con el último dato bueno
          («Actualizado dd/mm HH:MM» de esa vez) y la corrida sale en rojo en Actions. Antes una página fallida devolvía lo
          que había alcanzado a traer como si fuera todo, y con todo fallado publicaba un panel en cero.
          Lo que NO es esencial (los teléfonos para duplicados, las razones de pérdida nativas) puede fallar: el panel sale
          igual y el diagnóstico lo dice.
  CRM-03  La vendedora que vendió el mes pasado y este mes no tiene nada sigue contando en el mes anterior: previo
          Ana 1.000 + Beto 9.000 = 10.000 (antes 1.000, porque el equipo salía solo de las que tienen algo este mes).
          Aparece en el equipo con 0 este mes y la marca `soloPrev`.
  CRM-02  (§4mk) Si Kommo no trae el campo «Fecha contrato», no se publica (lo cerrado saldría por fecha de creación).
  CRM-05  (§4mk) Una venta con contrato el día 7 a las 22:00 de Bolivia es de la semana 1 (días 1-7), también con el reloj del
          runner en UTC (ahí ya es el día 8).
  CRM-07  (§4mk) Una venta con contrato a las 23:59:59 del último día es de ESTE mes.

Se corre:  python3 tests/test_generar_integridad.py
Dientes:   GENERAR_DIR=/carpeta/con/el/viejo python3 tests/test_generar_integridad.py
"""
import io, json, os, re, sys, tempfile, contextlib, urllib.parse, urllib.error, time

os.environ["TZ"] = "UTC"; time.tzset()   # como el runner de GitHub Actions: lo que dependa del reloj de la máquina se ve acá

os.environ["KOMMO_TOKEN"] = "tok_de_mentira_1234567890"
os.environ["KOMMO_SUBDOMAIN"] = "eanez"
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# GENERAR_DIR=<carpeta con otro generar.py y su panel_template.html> = los «dientes»: la misma prueba contra una versión vieja.
sys.path.insert(0, os.environ.get("GENERAR_DIR") or RAIZ)
_ARGV0 = sys.argv[1:]
_SOLO_DATOS = any(a.startswith("--solo-datos") for a in _ARGV0) or bool(os.environ.get("SOLO_DATOS"))   # --solo-datos-335: el escenario de la 335
sys.argv = [sys.argv[0]]   # generar.py lee sus propias opciones de acá
import generar as G

PASS = FAIL = 0
def chk(l, c, e=""):
    global PASS, FAIL
    if c: PASS += 1
    else: FAIL += 1
    print(("✓" if c else "✗"), l, ("· " + str(e)[:300]) if e != "" else "")

ANA, BETO = 11, 22
CANAL, CONTRATO = 501, 504
ST_NUEVA, ST_COMPRA = 1001, 1002

def ts_dia(base, dia, hora=12):
    return int(base.replace(day=dia, hour=hora, minute=0, second=0).timestamp())

M1 = ts_dia(G.m_start, 1)
P1 = ts_dia(G.p_start, 1)

def lead(i, uid, creado, contrato=None, precio=0, status=ST_COMPRA, por=1, canal="Facebook"):
    cfv = [{"field_id": CANAL, "values": [{"value": canal}]}] if canal else []
    if contrato:
        cfv.append({"field_id": CONTRATO, "values": [{"value": contrato}]})
    return {"id": i, "name": "Lead %d" % i, "price": precio, "responsible_user_id": uid, "status_id": status,
            "pipeline_id": 9911, "created_at": creado, "updated_at": creado, "created_by": por,
            "custom_fields_values": cfv, "_embedded": {"tags": [], "contacts": []}}

# Un mes de verdad trae leads cargados a mano y leads del bot (created_by 0): el resumen compara los dos.
CUR = [lead(1, ANA, M1, M1, 1000), lead(4, ANA, M1, None, 0, ST_NUEVA, por=0, canal=None)]
PREV = [lead(2, ANA, P1, P1, 1000), lead(3, BETO, P1, P1, 9000)]

class Falla(Exception):
    pass
SIN_CONTRATO = False

NOMBRE_ANA = "Ana Prueba - Central"   # el caso 9 la cambia por «Ána Prúeba» (con tildes), como pasó con Carola en Kommo

PANEL_PEDIDOS = []   # (175) lo que el generador le pidió al panel de pedidos (el Apps Script de mentira)
CONTACTOS = []       # (335) los contactos de Kommo del mes (con su teléfono), para la regla del celular
ULTIMO_HTML = ""     # el index.html de la última corrida

def fabricar_urlopen(fallar=None, panel=None):
    """fallar(path, params) → código HTTP con que tiene que fallar esa consulta, o None.
    panel(req) → lo que contesta el panel de pedidos (un dict = JSON, bytes = tal cual, una excepción = se lanza); sin `panel`, 404."""
    def urlopen(req, timeout=None):
        if "script.google.com" in req.full_url:
            PANEL_PEDIDOS.append({"url": req.full_url, "metodo": req.get_method(), "cuerpo": (req.data or b"").decode("utf-8")})
            r = panel(req) if panel else urllib.error.HTTPError(req.full_url, 404, "no existe", {}, io.BytesIO(b""))
            if isinstance(r, Exception): raise r
            return RespCruda(r) if isinstance(r, bytes) else Resp(r)
        u = urllib.parse.urlparse(req.full_url)
        path = u.path.replace("/api/v4", "")
        q = {k: v[0] for k, v in urllib.parse.parse_qs(u.query).items()}
        if fallar:
            cod = fallar(path, q)
            if cod:
                raise urllib.error.HTTPError(req.full_url, cod, "falla de prueba", {}, io.BytesIO(b'{"title":"falla"}'))
        page = int(q.get("page", "1"))
        def emb(key, items, mas=False):
            d = {"_embedded": {key: items}, "_links": {}}
            if mas: d["_links"]["next"] = {"href": "x"}
            return d
        if path == "/account": body = {"id": 1, "name": "Prueba"}
        elif path == "/leads/pipelines":
            body = emb("pipelines", [{"id": 9911, "name": "Ventas", "is_main": True, "_embedded": {"statuses": [
                {"id": ST_NUEVA, "name": "Nueva consulta"}, {"id": ST_COMPRA, "name": "Compradores"}]}}])
        elif path == "/users":
            body = emb("users", [{"id": ANA, "name": NOMBRE_ANA}, {"id": BETO, "name": "Beto Prueba - Central"}])
        elif path == "/leads/custom_fields":
            cfs = [{"id": CANAL, "name": "Canal", "type": "select", "enums": [{"id": 1, "value": "Facebook"}]}]
            if not SIN_CONTRATO: cfs.append({"id": CONTRATO, "name": "Fecha contrato", "type": "date"})
            body = emb("custom_fields", cfs)
        elif path == "/leads/loss_reasons": body = emb("loss_reasons", [])
        elif path == "/events": body = emb("events", [])
        elif path == "/contacts": body = emb("contacts", CONTACTOS)
        elif path == "/leads":
            if q.get("limit") == "1": body = emb("leads", CUR[:1])
            elif "filter[statuses][0][status_id]" in q: body = emb("leads", [])
            else:
                desde = int(q.get("filter[created_at][from]", "0"))
                if desde == int(G.m_start.timestamp()): todos = CUR
                elif desde == int(G.p_start.timestamp()): todos = PREV
                else: todos = CUR + PREV            # la ventana amplia
                # de a UN lead por página: así se puede romper la segunda
                if page > len(todos): return Resp({"_embedded": {"leads": []}})
                body = emb("leads", [todos[page - 1]], mas=page < len(todos))
        else:
            raise urllib.error.HTTPError(req.full_url, 404, "no existe", {}, io.BytesIO(b""))
        return Resp(body)
    return urlopen

class Resp:
    def __init__(self, body): self.status = 200; self._b = json.dumps(body).encode("utf-8")
    def read(self): return self._b
    def __enter__(self): return self
    def __exit__(self, *a): return False

class RespCruda(Resp):
    def __init__(self, crudo): self.status = 200; self._b = crudo

def correr(fallar=None, panel=None):
    """Corre main() con el Kommo de mentira. Devuelve (salida_con_error, PANEL_DATA o None, texto impreso)."""
    tmp = tempfile.mkdtemp(prefix="gen_integridad_")
    G.HERE = tmp
    G._DIAG.clear()
    if hasattr(G, "_FALLAS"): G._FALLAS.clear()
    del PANEL_PEDIDOS[:]
    G._rq.urlopen = fabricar_urlopen(fallar, panel)
    G.time.sleep = lambda s: None
    out = io.StringIO(); err = io.StringIO(); salio = None
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        try:
            G.main()
        except SystemExit as e:
            salio = e.code
    pd = None
    p = os.path.join(tmp, "index.html")
    global ULTIMO_HTML
    ULTIMO_HTML = ""
    if os.path.exists(p):
        h = ULTIMO_HTML = open(p, encoding="utf-8").read()
        m = re.search(r"window\.PANEL_DATA = (\{.*?\});\n", h, re.S) or re.search(r"window\.PANEL_DATA = (\{.*\});", h)
        pd = json.loads(m.group(1)) if m else None
    return salio, pd, out.getvalue() + err.getvalue(), os.listdir(tmp)

# 🛒 (335) EL ESCENARIO DE LAS VENTAS DEL PANEL SIN FICHA EN KOMMO (las pruebas 17-24 y `--solo-datos-335`, que usa
# tests/test_panel_meta.js para abrir el dashboard con estos datos). Ana (en VENDOR_CFG) tiene en Kommo los leads 1 y 5 (este con
# el teléfono 7222 3333) y en el panel las filas de abajo.
import datetime as _dt2
_HOY = G.now.strftime("%Y-%m-%d")
_FUT = (G.m_end + _dt2.timedelta(days=5)).strftime("%Y-%m-%d")      # una entrega por delante (siempre después de hoy)
_PAS = G.p_start.strftime("%Y-%m-%d")                                # una entrega que ya pasó (el 1° del mes anterior)
_TS = M1 * 1000                                                      # cargada el 1° de este mes a las 12:00 (ms, como la planilla)
_TSP = P1 * 1000                                                     # cargada el 1° del mes anterior
def fila(i, **k):
    """Una venta del panel de mentira (lo que contesta el `list`), con datos de cliente que NO pueden salir a ningún lado."""
    r = {"id": i, "fecha": "", "oc": "11-9%02d" % (len(i) % 90), "vendedor": "Ana Prueba", "cliente": "CLIENTE SECRETO " + i,
         "celular": "", "direccion": "Calle Inventada 123", "zona": "Norte", "pagado": False, "saldo": 0, "ts": _TS,
         "metodoPago": "", "estado": "En stock", "entregado": False, "acuenta": 0, "productos": [{"desc": "COLCHON", "cant": 1}]}
    r.update(k); return r
FILAS_335 = [
    # ── entran (de Ana, que está en VENDOR_CFG) ──
    fila("a1", fecha=_PAS, saldo=0, pagado=True, metodoPago="~Efectivo 1.500 @2026-11-01 #901 + QR BISA 500 @2026-11-02 #902 %FOTO1"),   # entrega pasada: cerrada, Bs 2.000
    fila("a2", fecha=_FUT, entregado=True, saldo=800, acuenta=200, metodoPago="QR BISA %FOTO2"),                                       # con ✅ (aunque la fecha sea después): cerrada, Bs 1.000
    fila("a4", direccion="SALIÓ DE TIENDA · Central", zona="TIENDA", pagado=True, metodoPago="Efectivo 700 @2026-11-01 #904 + ^Efectivo 50 @2026-11-01"),   # venta de tienda: cerrada, Bs 700 (el recargo no es de la venta)
    fila("a3", fecha=_FUT, saldo=3000),                                                                                                  # se entrega más adelante: pipeline, Bs 3.000
    fila("a18", fecha=_HOY, saldo=100),                                                                                                  # se entrega HOY sin ✅: todavía pipeline
    fila("a19", saldo=50, productos=[{"desc": "COLCHON", "cant": 1, "avisa": _FUT}]),                                                     # «el cliente avisa cuándo» (sin fecha, no es de tienda): pipeline
    fila("a15", ts=_TSP, fecha=_PAS, saldo=400),                                                                                         # del MES ANTERIOR, entregada: cuenta en el anterior
    fila("a20", ts=_TSP, fecha=_FUT, saldo=600),                                                                                         # del mes anterior, sin entregar ni factura: pipeline de ESTE mes (sigue abierta)
    # 🧾 (15/11, dueño: «si está marcada facturada cuenta como cierre en el mes, por más que se entregue en el siguiente»)
    fila("a21", ts=_TSP, fecha=_FUT, saldo=250, productos=[{"desc": "COLCHON", "cant": 1, "fdoc": "F", "fdocn": "777"}]),              # del mes anterior CON factura, sin entregar: cierre del ANTERIOR
    fila("a22", ts=_TSP, fecha=_FUT, entregado=True, saldo=300, productos=[{"desc": "COLCHON", "cant": 1, "eF": _HOY}]),               # del anterior SIN factura, entregada HOY: cierre de ESTE mes
    fila("a23", fecha=_FUT, saldo=500, productos=[{"desc": "COLCHON", "cant": 1, "fdoc": "F", "fdocn": "778"}]),                         # de este mes CON factura, sin entregar: cierre de este mes
    fila("a24", ts=_TSP, fecha=_FUT, saldo=150, productos=[{"desc": "COLCHON", "cant": 1, "vmes": _PAS[:7]}]),                           # marcada «cuenta en <mes anterior>»: cierre del anterior
    fila("a25", ts=_TSP, fecha=_FUT, saldo=70, productos=[{"desc": "COLCHON", "cant": 1, "fdoc": "R", "fdocn": "55"}]),                  # con REMISIÓN (no es factura), sin entregar: pipeline de este mes
    # ── no entran ──
    fila("a5", fecha=_PAS, saldo=900, productos=[{"desc": "COLCHON", "cant": 1, "klead": "1"}]),     # con su lead (`klead`): ya la cuenta Kommo
    fila("kommo-4", fecha=_PAS, saldo=900),                                                          # venta que vino de Kommo (id kommo-<lead>)
    fila("a7", oc="ATC 11-001", fecha=_PAS, saldo=500),                                              # ATC
    fila("a8", oc="RPT 11-002", fecha=_PAS, saldo=500),                                              # RPT
    fila("a9", vendedor="ALBA", fecha=_PAS, saldo=500),                                              # pedido interno
    fila("a10", vendedor="Eduardo Añez", fecha=_PAS, saldo=500),                                     # mayorista
    fila("a11", vendedor="ROHO", fecha=_PAS, saldo=500),                                             # ROHO
    fila("a12", vendedor="Mauricio Merida", fecha=_PAS, saldo=500),                                  # Sueña (no es del equipo de Heaven)
    fila("kommo-77", estado="Borrador Kommo", vendedor="Ana Prueba - Central", celular="+591 70011999", saldo=1200),   # una venta de Kommo que espera en la bandeja…
    fila("a14", fecha=_PAS, saldo=1200, celular="700-11999"),                                        # …y la misma venta cargada en el panel sin unir: no se suma
    fila("a17", fecha=_PAS, saldo=2500, celular="72223333"),                                         # la venta de Kommo del lead 5 (mismo celular), sin unir: no se suma
    {"id": "__dias_cerrados__", "cliente": "📅 DÍAS CERRADOS", "observaciones": ""},
]
SECRETOS_335 = ("CLIENTE SECRETO", "Calle Inventada", "70011999", "11-9", "FOTO1", "#901")
def panel_lista(filas):
    return lambda req: {"ok": True, "version": "2026-11-14-a", "pedidos": filas}
URL_335 = "https://script.google.com/macros/s/PRUEBA_DE_MENTIRA/exec"
def correr_335(panel="lista", con_url=True):
    """Corre el generador con el escenario 335 y deja todo como estaba. `panel` = cómo contesta el panel ("lista" = FILAS_335)."""
    global CUR
    cur0, cfg0, url0 = CUR[:], G.VENDOR_CFG.get("Ana Prueba"), G.PANEL_URL
    l5 = lead(5, ANA, M1, M1, 2500); l5["_embedded"]["contacts"] = [{"id": 900}]
    CUR = cur0 + [l5]
    CONTACTOS[:] = [{"id": 900, "custom_fields_values": [{"field_code": "PHONE", "values": [{"value": "+591 7222 3333"}]}]}]
    G.VENDOR_CFG["Ana Prueba"] = dict(ini="AP", color="#123456", suc="Central", metaCierres=35, metaMonto=135000)
    G.PANEL_URL = URL_335 if con_url else ""
    try:
        return correr(panel=panel_lista(FILAS_335) if panel == "lista" else panel)
    finally:
        CUR = cur0; CONTACTOS[:] = []; G.PANEL_URL = url0
        if cfg0 is None: G.VENDOR_CFG.pop("Ana Prueba", None)
        else: G.VENDOR_CFG["Ana Prueba"] = cfg0

# `--solo-datos`: imprime el PANEL_DATA del caso «todo bien» y sale (lo usa tests/test_panel_meta.js para abrir el
# dashboard de verdad con estos mismos datos inventados).
if _SOLO_DATOS:
    _s, _pd, _t, _a = correr_335() if "--solo-datos-335" in _ARGV0 else correr()
    sys.stdout.write(json.dumps(_pd, ensure_ascii=False))
    sys.exit(0 if _pd else 1)

# ── 1 · todo bien: el panel sale y el mes anterior suma a Beto ─────────────────────────────────────
salio, pd, txt, archivos = correr()
chk("1a. sin fallas el panel se escribe (index.html, panel.html y el del mes)", pd is not None and "index.html" in archivos and salio in (None, 0), (salio, archivos, txt[-300:]))
if pd:
    team = {t["name"]: t for t in pd["team"]}
    prev_val = sum((t.get("prev") or {}).get("value", 0) for t in pd["team"])
    chk("1b. el mes anterior suma a las dos: Ana 1.000 + Beto 9.000 = 10.000 (antes 1.000)", prev_val == 10000, (prev_val, {k: (v.get("prev") or {}).get("value") for k, v in team.items()}))
    chk("1c. Beto está en el equipo con 0 este mes y la marca «sin leads este mes»", "Beto Prueba" in team and team["Beto Prueba"]["leads"] == 0 and team["Beto Prueba"]["value"] == 0 and team["Beto Prueba"].get("soloPrev") is True, team.get("Beto Prueba"))
    chk("1d. Ana sigue igual: 2 leads, Bs 1.000, sin la marca", team.get("Ana Prueba", {}).get("leads") == 2 and team["Ana Prueba"]["value"] == 1000 and not team["Ana Prueba"].get("soloPrev"), team.get("Ana Prueba"))
    chk("1e. lo de ESTE mes no cambia: 2 leads, 1 cierre, Bs 1.000", pd["global"]["leads"] == 2 and pd["global"]["cierres"] == 1 and pd["global"]["cerrado"] == 1000, pd["global"])
    chk("1f. Beto no trae meta inventada (no está en la lista de vendedoras): no infla la meta del equipo", team.get("Beto Prueba", {}).get("metaMonto") == 0 and team.get("Beto Prueba", {}).get("metaCierres") == 0, team.get("Beto Prueba"))
    chk("1g. Beto va al final de la lista (no le cambia el color ni el orden a las que trabajaron este mes)", pd["team"][-1]["name"] == "Beto Prueba", [t["name"] for t in pd["team"]])

# ── 2 · una página de leads falla a mitad ──────────────────────────────────────────────────────────
def falla_pag2_mes(path, q):
    return 500 if path == "/leads" and q.get("page") == "2" and int(q.get("filter[created_at][from]", "0")) == int(G.p_start.timestamp()) else None
salio, pd, txt, archivos = correr(falla_pag2_mes)
chk("2a. la página 2 de los leads del mes anterior falla → NO se escribe el panel", pd is None and "index.html" not in archivos, archivos)
chk("2b. …y el generador termina con error (la corrida queda en rojo y el bot no publica)", salio not in (None, 0), salio)
chk("2c. el registro dice qué lectura falló y que el panel publicado quedó como estaba", "/leads" in txt and re.search(r"no se publica|queda como estaba|último dato bueno", txt, re.I) is not None, txt[-400:])

# ── 3 · los campos personalizados fallan (sin «Fecha contrato» las ventas se contarían por otra regla) ─
salio, pd, txt, archivos = correr(lambda path, q: 500 if path == "/leads/custom_fields" else None)
chk("3. sin los campos de Kommo no se publica (las ventas se contarían por fecha de creación)", pd is None and salio not in (None, 0), (salio, archivos))

# ── 4 · el token vencido: todo falla ───────────────────────────────────────────────────────────────
salio, pd, txt, archivos = correr(lambda path, q: 401)
chk("4. token vencido (todo da 401) → NO se publica un panel en cero", pd is None and salio not in (None, 0), (salio, archivos))

# ── 5 · lo que no es esencial puede fallar ─────────────────────────────────────────────────────────
salio, pd, txt, archivos = correr(lambda path, q: 500 if path in ("/contacts", "/leads/loss_reasons") else None)
chk("5a. sin teléfonos ni razones de pérdida el panel sale igual", pd is not None and salio in (None, 0), (salio, archivos))
chk("5b. …y el diagnóstico lo dice", pd is not None and "/contacts" in txt, txt[-300:])

# ── 7 · CRM-02: Kommo contesta, pero sin el campo «Fecha contrato» ───────────────────────────────
SIN_CONTRATO = True
salio, pd, txt, archivos = correr()
SIN_CONTRATO = False
chk("7. sin el campo «Fecha contrato» NO se publica (lo cerrado saldría por fecha de creación)", pd is None and salio not in (None, 0) and "Fecha contrato" in txt, (salio, archivos, txt[-300:]))

# ── 8 · CRM-05 y CRM-07: el día y el último segundo, en hora de Bolivia con el reloj en UTC ───────────
_CUR0 = CUR[:]
D7_22 = ts_dia(G.m_start, 7, 22)                 # día 7, 22:00 de Bolivia = día 8, 02:00 UTC
FIN = int(G.m_end.timestamp())                   # el último segundo del mes
CUR = _CUR0 + [lead(5, ANA, M1, D7_22, 500), lead(6, ANA, M1, FIN, 700)]
salio, pd, txt, archivos = correr()
CUR = _CUR0
if pd:
    ana = {t["name"]: t for t in pd["team"]}.get("Ana Prueba", {})
    wc = (ana.get("weekly") or {}).get("c") or []
    chk("8a. CRM-05: la venta del día 7 a las 22:00 de Bolivia cuenta en la semana 1 (días 1-7), no en la 2", len(wc) >= 2 and wc[0] >= 2, wc)
    chk("8b. CRM-07: la venta de las 23:59:59 del último día es de este mes (3 cierres: 1.000 + 500 + 700)", pd["global"]["cierres"] == 3 and pd["global"]["cerrado"] == 2200, pd["global"])
else:
    chk("8. (el panel con las ventas de borde no se escribió)", False, txt[-300:])

# ── 9 · (06/11) la vendedora con tilde en Kommo sigue siendo la de VENDOR_CFG ─────────────────────────
# En noviembre Kommo pasó a «Carola Chávez - Tienda Banzer» y VENDOR_CFG dice «Carola Chavez»: no se la encontraba y salía con
# la meta de una vendedora nueva (8 cierres / Bs 20.000 en vez de 35 / Bs 135.000).
G.VENDOR_CFG["Ana Prueba"] = dict(ini="AP", color="#123456", suc="Mia Plaza", metaCierres=35, metaMonto=135000)
NOMBRE_ANA = "Ána Prúeba - Central"
salio, pd, txt, archivos = correr()
NOMBRE_ANA = "Ana Prueba - Central"
del G.VENDOR_CFG["Ana Prueba"]
if pd:
    ana = {t["name"]: t for t in pd["team"]}.get("Ána Prúeba", {})
    chk("9a. «Ána Prúeba» (con tildes en Kommo) lleva la meta de «Ana Prueba» de VENDOR_CFG: 35 cierres / Bs 135.000 (antes 8 / 20.000)",
        ana.get("metaCierres") == 35 and ana.get("metaMonto") == 135000, {k: ana.get(k) for k in ("metaCierres", "metaMonto", "color")})
    chk("9b. …y su color y sus iniciales", ana.get("color") == "#123456" and ana.get("ini") == "AP", (ana.get("color"), ana.get("ini")))
    chk("9c. la sucursal sigue siendo la que dice Kommo después del guion (Central), no la de VENDOR_CFG", ana.get("suc") == "Central", ana.get("suc"))
    lin = [l for l in (pd.get("wsp") or "").split("\n") if "Beto" in l]
    chk("9d. en el resumen de WhatsApp, Beto (0 cierres) no lleva medalla", lin and lin[0].startswith("•"), lin)
else:
    chk("9. (el panel con la vendedora con tilde no se escribió)", False, txt[-300:])

# ── 10 · (06/11, dueño) el horario para medir la respuesta va por la SUCURSAL que dice Kommo ─────────
# «isabel ahora esta en central · el horario de central es de 8 a 20:00 · banzer de 8:30 a 20:30 · jonathan en mia plaza · fabian
# esta en central pero se ira al ventura… de momento usa el horario de central».
import datetime as _dt
salio, pd, txt, archivos = correr()
chk("10a. al leer los usuarios de Kommo se anota la sucursal de cada uno (Ana Prueba - Central)",
    getattr(G, "SUC_DE_USUARIO", {}).get("ana prueba") == "Central", getattr(G, "SUC_DE_USUARIO", None))
_BO = _dt.timezone(_dt.timedelta(hours=-4))
def _ts(h, m=0, dia=9):   # el lunes 09/11/2026 (sábado = 14), en hora de Bolivia
    return int(_dt.datetime(2026, 11, dia, h, m, tzinfo=_BO).timestamp())
if hasattr(G, "SUC_DE_USUARIO"):
    _antes = dict(G.SUC_DE_USUARIO)
    G.SUC_DE_USUARIO.clear()
    G.SUC_DE_USUARIO.update({"isabel robledo": "Central", "carola chavez": "Tienda Banzer", "jonathan monje": "Mia Plaza",
                             "fabian godoy": "Ventura Mall", "maria flores": "Buenos Aires"})
    fuera = lambda nombre, h, m=0, dia=9: G.off_hours(_ts(h, m, dia), G.sched_for(nombre))
    chk("10b. Isabel (Central): un lead del lunes a las 8:15 está EN horario (antes la medían con Mia Plaza, que abre a las 9)",
        fuera("Isabel Robledo", 8, 15) is False and fuera("Isabel Robledo", 19, 59) is False and fuera("Isabel Robledo", 20, 5) is True)
    chk("10c. Carola Chávez (Tienda Banzer): 8:30 a 20:30 — 8:20 fuera, 8:40 y 20:20 adentro, 20:40 fuera",
        fuera("Carola Chávez", 8, 20) is True and fuera("Carola Chávez", 8, 40) is False and fuera("Carola Chávez", 20, 20) is False and fuera("Carola Chávez", 20, 40) is True)
    chk("10d. Jonathan (Mia Plaza): 9 a 21 — 8:30 fuera, 20:30 adentro", fuera("Jonathan Monje", 8, 30) is True and fuera("Jonathan Monje", 20, 30) is False)
    chk("10e. Fabián en Ventura Mall usa el horario de Central (8 a 20)", fuera("Fabián Godoy", 8, 15) is False and fuera("Fabián Godoy", 20, 5) is True)
    chk("10f. Maria (Buenos Aires) sigue con el de siempre: lun-vie 9 a 19, sábado 9 a 16", fuera("Maria Flores", 8, 30) is True and fuera("Maria Flores", 18, 30) is False and fuera("Maria Flores", 17, 0, 14) is True)
    chk("10g. el domingo cierran Central, Buenos Aires y Ventura Mall", all(fuera(n, 12, 0, 15) is True for n in ("Isabel Robledo", "Maria Flores", "Fabián Godoy")))
    chk("10h. «los domingos es de 10 a 16:00 banzer y mia plaza»: Mia Plaza el domingo 10 a 16 (9:45 y 16:10 fuera, 12:00 y 15:50 adentro)",
        fuera("Jonathan Monje", 9, 45, 15) is True and fuera("Jonathan Monje", 12, 0, 15) is False and fuera("Jonathan Monje", 15, 50, 15) is False and fuera("Jonathan Monje", 16, 10, 15) is True)
    chk("10i. …y Banzer igual (10:30 adentro, 16:30 fuera); el lunes sigue 8:30 a 20:30 y Mia Plaza el lunes 9 a 21",
        fuera("Carola Chávez", 10, 30, 15) is False and fuera("Carola Chávez", 16, 30, 15) is True and fuera("Carola Chávez", 20, 20) is False and fuera("Jonathan Monje", 20, 30) is False)
    G.SUC_DE_USUARIO.clear(); G.SUC_DE_USUARIO.update(_antes)

# ── 11-15 · (13/11, mejora 175) la meta en Bs de cada vendedora sale del panel de pedidos ───────────
# El dueño quiere cargarlas en un solo lugar (el panel: Proyección → 🎯 Metas). La fila `__metas__` del panel: `m[ym].vd =
# {nombre:[mínima, presupuesto]}`; la meta = el presupuesto (si es 0, la mínima). No es esencial: sin panel, VENDOR_CFG.
YM = f"{G.YEAR}-{G.MONTH:02d}"
URL_PANEL = "https://script.google.com/macros/s/PRUEBA_DE_MENTIRA/exec"
SECRETOS = ("CLIENTE SECRETO", "70011223", "Calle Inventada 123", "PRUEBA_DE_MENTIRA")
def panel_con(m, extra_ok=True):
    """El Apps Script de mentira: contesta la lista con la fila de metas y una venta de un cliente (que no puede salir a ningún lado)."""
    def contesta(req):
        filas = [{"id": "v1", "cliente": "CLIENTE SECRETO", "celular": "70011223", "direccion": "Calle Inventada 123", "vendedor": "Ana Prueba"}]
        if m is not None:
            filas.append({"id": "__metas__", "cliente": "🎯 METAS", "observaciones": json.dumps({"v": 1, "m": m})})
        return {"ok": True, "version": "2026-11-13-a", "pedidos": filas}
    return contesta
_cfg_antes = G.VENDOR_CFG.get("Ana Prueba")
G.VENDOR_CFG["Ana Prueba"] = dict(ini="AP", color="#123456", suc="Central", metaCierres=35, metaMonto=135000)
G.PANEL_URL = URL_PANEL

# 11 · metas del panel presentes → se usan
M11 = {YM: {"heaven": 400000, "vd": {"Ana Prueba": [120000, 150000], "Beto Prueba": [70000, 0], "Mauricio Merida": [75000, 120000]}, "esc": {"heaven": {"t": [], "bono": 1}}},
       "2020-01": {"vd": {"Ana Prueba": [1, 2]}}}
salio, pd, txt, archivos = correr(panel=panel_con(M11))
if pd:
    team = {t["name"]: t for t in pd["team"]}
    ana, beto = team.get("Ana Prueba", {}), team.get("Beto Prueba", {})
    chk("11a. con metas del panel para el mes, la meta en Bs de Ana es su PRESUPUESTO del panel (150.000), no la de VENDOR_CFG (135.000)",
        ana.get("metaMonto") == 150000 and ana.get("metaFuente") == "panel", {k: ana.get(k) for k in ("metaMonto", "metaFuente", "metaCierres")})
    chk("11b. la meta de CIERRES sigue saliendo de VENDOR_CFG (35)", ana.get("metaCierres") == 35, ana.get("metaCierres"))
    chk("11c. Beto sin presupuesto (0) lleva su MÍNIMA (70.000), aunque solo haya trabajado el mes anterior", beto.get("metaMonto") == 70000 and beto.get("metaFuente") == "panel", {k: beto.get(k) for k in ("metaMonto", "metaFuente", "soloPrev")})
    chk("11d. la meta del equipo en Bs es la suma de las del equipo: 150.000 + 70.000 = 220.000 (Mauricio no está en Kommo: no suma)",
        sum(t.get("metaMonto", 0) for t in pd["team"]) == 220000, [(t["name"], t.get("metaMonto")) for t in pd["team"]])
    chk("11e. una sola lectura al panel: POST de «list», con `_=` para que no salga de una caché", len(PANEL_PEDIDOS) == 1 and PANEL_PEDIDOS[0]["metodo"] == "POST" and
        json.loads(PANEL_PEDIDOS[0]["cuerpo"]).get("action") == "list" and "?_=" in PANEL_PEDIDOS[0]["url"], PANEL_PEDIDOS[:1])
    fuga = [s for s in SECRETOS if s in txt or s in ULTIMO_HTML]
    chk("11f. ni el registro ni el index.html (los dos PÚBLICOS) dicen nada del cliente de la lista ni la dirección del panel", not fuga, fuga)
    chk("11g. el registro dice cuántas vendedoras tienen meta del panel", re.search(r"3 vendedora\(s\) con meta", txt) is not None, [l for l in txt.split("\n") if "meta" in l.lower()][:4])
else:
    chk("11. (el panel con las metas del panel no se escribió)", False, txt[-400:])

# 12 · el nombre con tilde empareja (el panel con tilde y mayúsculas, Kommo sin; y al revés)
M12 = {YM: {"vd": {"ÁNA PRUÉBA": [0, 99000]}}}
salio, pd, txt, archivos = correr(panel=panel_con(M12))
ana = {t["name"]: t for t in (pd or {}).get("team", [])}.get("Ana Prueba", {})
chk("12a. «ÁNA PRUÉBA» en el panel empareja con «Ana Prueba» de Kommo: 99.000", ana.get("metaMonto") == 99000 and ana.get("metaFuente") == "panel", ana.get("metaMonto"))
NOMBRE_ANA = "Ána Prúeba - Central"
salio, pd, txt, archivos = correr(panel=panel_con({YM: {"vd": {"Ana Prueba": [80000, 98000]}}}))
NOMBRE_ANA = "Ana Prueba - Central"
ana = {t["name"]: t for t in (pd or {}).get("team", [])}.get("Ána Prúeba", {})
chk("12b. y «Ána Prúeba» de Kommo con «Ana Prueba» del panel: 98.000", ana.get("metaMonto") == 98000, ana.get("metaMonto"))

# 13 · la lectura del panel se cae → VENDOR_CFG y el panel se publica igual
for nombre, resp in (("un 500", urllib.error.HTTPError(URL_PANEL, 500, "x", {}, io.BytesIO(b""))),
                     ("una página de Google en vez del JSON", b"<!DOCTYPE html><html><body>Error CLIENTE SECRETO</body></html>"),
                     ("un «clave» del servidor", {"ok": False, "error": "clave"}),
                     ("sin red", urllib.error.URLError("sin red"))):
    salio, pd, txt, archivos = correr(panel=(lambda req, r=resp: r))
    ana = {t["name"]: t for t in (pd or {}).get("team", [])}.get("Ana Prueba", {})
    chk(f"13. con {nombre} del panel: se publica igual, con la meta de VENDOR_CFG (135.000) y sin marca de panel, tras dos intentos",
        pd is not None and salio in (None, 0) and ana.get("metaMonto") == 135000 and not ana.get("metaFuente") and len(PANEL_PEDIDOS) == 2 and not G._FALLAS,
        (salio, ana.get("metaMonto"), len(PANEL_PEDIDOS), txt[-200:]))
chk("13b. …y el diagnóstico lo dice sin la dirección ni lo que contestó", "no se pudo leer el panel" in txt and not [s for s in SECRETOS if s in txt or s in ULTIMO_HTML], [l for l in txt.split("\n") if "panel" in l][:3])

# 14 · el mes no tiene metas por vendedora (o no hay fila de metas) → VENDOR_CFG
for nombre, m in (("solo la meta de la marca", {YM: {"heaven": 500000}}), ("las de otro mes", {"2020-01": {"vd": {"Ana Prueba": [1, 5]}}}), ("sin fila de metas", None)):
    salio, pd, txt, archivos = correr(panel=panel_con(m))
    ana = {t["name"]: t for t in (pd or {}).get("team", [])}.get("Ana Prueba", {})
    chk(f"14. {nombre}: queda la de VENDOR_CFG (135.000)", pd is not None and ana.get("metaMonto") == 135000 and not ana.get("metaFuente"), (ana.get("metaMonto"), txt[-160:]))

# 15 · sin PANEL_URL no se le pregunta nada al panel
G.PANEL_URL = ""
salio, pd, txt, archivos = correr(panel=panel_con(M11))
ana = {t["name"]: t for t in (pd or {}).get("team", [])}.get("Ana Prueba", {})
chk("15. sin el secreto PANEL_URL: ninguna lectura al panel y la meta de VENDOR_CFG", not PANEL_PEDIDOS and ana.get("metaMonto") == 135000 and "sin PANEL_URL" in txt, (len(PANEL_PEDIDOS), ana.get("metaMonto")))

# 16 · `--month M --year YYYY` (un mes cerrado): las metas de ESE mes
G.PANEL_URL = URL_PANEL
G._rq.urlopen = fabricar_urlopen(None, panel_con({"2026-10": {"vd": {"Ana Prueba": [100000, 130000]}}, "2026-11": {"vd": {"Ana Prueba": [100000, 160000]}}}))
_mdp = getattr(G, "metas_del_panel", lambda y, m: ({}, ""))
mo, _t1 = _mdp(2026, 10)
mn, _t2 = _mdp(2026, 11)
chk("16. al regenerar octubre toma las de octubre (130.000) y noviembre las suyas (160.000)", mo.get("ana prueba") == 130000 and mn.get("ana prueba") == 160000 and "octubre 2026" in _t1, (mo, mn, _t1))
G.PANEL_URL = ""
if _cfg_antes is None: del G.VENDOR_CFG["Ana Prueba"]
else: G.VENDOR_CFG["Ana Prueba"] = _cfg_antes

# ── 17-25 · (15/11, mejora 335) las ventas del panel SIN ficha en Kommo entran al dashboard ────────────
# Dueño: «cerrado si ya se entregó… si no estaremos a la espera de que el vendedor anote y a veces se olvidan». Entregada (✅, fecha ya
# pasada o venta de tienda) = cierre + cerrado + pipeline; vendida y sin entregar = solo pipeline. El mes = el día en que se cargó. Una
# con lead (klead / kommo-<lead>) ya la cuenta Kommo; una con el celular y la vendedora de una venta de Kommo que nadie reclama, también.
salio, pd, txt, archivos = correr_335()
if pd:
    ana = {t["name"]: t for t in pd["team"]}.get("Ana Prueba", {})
    pz = ana.get("panel") or {}
    chk("17a. entregadas (fecha ya pasada, ✅ aunque la fecha sea después, venta de tienda, la del mes anterior entregada hoy) y con factura → 5 cierres más, Bs 2.000 + 1.000 + 700 + 300 + 500",
        pz.get("c") == 5 and pz.get("bs") == 4500, pz)
    chk("17b. sin entregar ni factura (por delante, HOY sin ✅, «avisa cuándo», la del mes anterior, la de remisión) → 5 en el pipeline, Bs 3.000 + 100 + 50 + 600 + 70",
        pz.get("p") == 5 and pz.get("pbs") == 3820, pz)
    chk("17c. los cierres de Ana = 2 de Kommo (leads 1 y 5) + 5 del panel = 7; lo cerrado = 1.000 + 2.500 + 4.500 = 8.000",
        ana.get("cierres") == 7 and ana.get("value") == 8000, {k: ana.get(k) for k in ("cierres", "value", "pipeline", "conv")})
    chk("17d. el pipeline = Kommo (3.500) + todo lo vendido en el panel sin ficha (4.500 + 3.820) = 11.820", ana.get("pipeline") == 11820, ana.get("pipeline"))
    chk("17e. la conversión y lo global cuentan con el total (7 cierres / 3 leads; global 7 cierres, Bs 8.000)",
        pd["global"]["cierres"] == 7 and pd["global"]["cerrado"] == 8000 and ana.get("conv") == round(7 / 3 * 100, 1), (pd["global"], ana.get("conv")))
    psf = pd.get("panelSinFicha") or {}
    chk("18a. con ficha en Kommo (`klead` y `kommo-<lead>`) no se suman de nuevo: el resumen dice 2 ya con ficha",
        psf.get("conLead") == 2 and psf.get("c") == 5, psf)
    chk("18b. la que tiene el celular y la vendedora de una venta de Kommo sin unir (la tarjeta de la bandeja y el lead 5) NO se suma: 2",
        psf.get("parecen") == 2, psf)
    chk("19. ATC, RPT, interno (ALBA), mayorista (Eduardo), ROHO y Sueña quedan fuera: nadie más en el equipo",
        sorted(t["name"] for t in pd["team"]) == ["Ana Prueba", "Beto Prueba"] and not (({t["name"]: t for t in pd["team"]}.get("Beto Prueba") or {}).get("panel")),
        [t["name"] for t in pd["team"]])
    pr = ana.get("prev") or {}
    chk("20. el mes anterior suma su entregada, la de factura y la marcada (Kommo 1.000 + panel 400 + 250 + 150 = 1.800, 4 cierres) y no la que se entregó este mes ni las pendientes",
        pr.get("cierres") == 4 and pr.get("value") == 1800 and pr.get("valueFull") == 1800, pr)
    wk = (ana.get("weekly") or {})
    _h7 = int(_HOY[8:10]) <= 7          # la del mes anterior entregada HOY va a la semana de hoy
    chk("21. la semana 1 (días 1-7) lleva los cierres de Kommo y los del panel cargados el 1°: 6, Bs 7.700 (+ la entregada hoy si hoy es de la semana 1)",
        (wk.get("c") or [0])[0] == 6 + _h7 and (wk.get("m") or [0])[0] == 7700 + 300 * _h7, wk)
    chs = pd.get("channels") or []
    fp = next((c for c in chs if c.get("panel")), {})
    chk("22a. «🛒 Venta sin ficha en Kommo» en los canales (aparte, sin leads ni conversión): 5 cierres, 5 por entregar",
        fp.get("cierres") == 5 and fp.get("pend") == 5 and fp.get("carry") is True and fp.get("leads") == 0, fp)
    chk("22b. …y los canales siguen sumando los cierres del mes (2 de Kommo + 3)", sum(c.get("cierres", 0) for c in chs) == pd["global"]["cierres"], [(c["name"], c["cierres"]) for c in chs])
    w = pd.get("wsp") or ""
    chk("22c. el resumen de WhatsApp lo dice aparte (cuántas y cuánto, en el ranking y abajo del mes)",
        "🛒 5 sin ficha en Kommo" in w and "Incluye 5 venta(s) cargadas en el panel sin ficha en Kommo ya entregadas o con factura" in w, [l for l in w.split("\n") if "🛒" in l])
    fuga = [s for s in SECRETOS_335 + ("PRUEBA_DE_MENTIRA",) if s in txt or s in ULTIMO_HTML]
    chk("23a. ni el registro ni el index.html (PÚBLICOS) dicen nada de la lista: clientes, celulares, OC, recibos, fotos, la dirección del panel", not fuga, fuga)
    chk("23b. una sola lectura al panel (metas y ventas con la misma)", len(PANEL_PEDIDOS) == 1, len(PANEL_PEDIDOS))
    chk("23c. el registro dice cuántas entraron, en números", re.search(r"5 entregada\(s\) o con factura \(cierres\) y 5 por entregar", txt) is not None, [l for l in txt.split("\n") if "ficha" in l][:3])
else:
    chk("17. (el panel con las ventas del panel no se escribió)", False, txt[-400:])

# 24 · la lectura del panel se cae (o no hay PANEL_URL) → el dashboard como antes: solo Kommo
for nombre, panel in (("con el panel caído", lambda req: urllib.error.HTTPError(URL_335, 500, "x", {}, io.BytesIO(b""))), ("sin PANEL_URL", None)):
    salio, pd, txt, archivos = correr_335(panel=panel, con_url=panel is not None)
    ana = {t["name"]: t for t in (pd or {}).get("team", [])}.get("Ana Prueba", {})
    chk(f"24. {nombre}: se publica igual y como antes, solo Kommo (2 cierres, Bs 3.500, sin «panel» ni fila de canal)",
        pd is not None and salio in (None, 0) and ana.get("cierres") == 2 and ana.get("value") == 3500 and "panel" not in ana and
        "panelSinFicha" not in pd and not any(c.get("panel") for c in pd.get("channels") or []) and not G._FALLAS,
        (salio, {k: ana.get(k) for k in ("cierres", "value", "panel")}, txt[-200:]))

# 25 · las cuentas copiadas de la página dan lo mismo que la página (sus casos escritos) y las listas son las mismas
# (los números esperados los dio la página misma, `ventaTotal`/`parseMonto`/`r2` en pedidos.html, el 15/11)
_vt = getattr(G, "venta_total", lambda p: None)
chk("25a. `ventaTotal`: adelanto + cobros + saldo, sin el recargo por entrega (3.300,50); un renglón que la página no entiende no cuenta (1.800,50)",
    _vt({"saldo": 300, "acuenta": 0, "metodoPago": "~Efectivo 1.500 @2026-11-01 + QR BISA 1,500,50 @2026-11-02 #9 %X + ^QR BISA 80 · REGISTRADO"}) == 3300.5 and
    _vt({"saldo": 300, "acuenta": 0, "metodoPago": "~Efectivo Bs. 1.500.- @2026-11-01 + QR BISA 1,500,50 @2026-11-02 #9 %X + ^QR BISA 80 · REGISTRADO"}) == 1800.5)
_pm = getattr(G, "_panel_monto", lambda t: None); _r2 = getattr(G, "_js_r2", lambda n: None)
chk("25a2. `parseMonto` y `r2` como la página: «Bs. 1.500.-» 1.500, «1,500,50» y «1.500.50» 1.500,50, «1.234,5»; 1,005 → 1 y 2,675 → 2,68",
    [_pm("Bs. 1.500.-"), _pm("1,500,50"), _pm("1.500.50"), _pm("1.234,5"), _r2(1.005), _r2(2.675)] == [1500, 1500.5, 1500.5, 1234.5, 1, 2.68])
chk("25b. sin el adelanto escrito vale «A cuenta»; una «PAGADA sin monto» vale 0 (como en la página: no inventa el monto)",
    getattr(G, "venta_total", lambda p: None)({"saldo": 100, "acuenta": 250, "metodoPago": "QR BISA %X"}) == 350 and
    getattr(G, "venta_total", lambda p: None)({"saldo": 0, "pagado": True, "metodoPago": "Efectivo %X"}) == 0)
_ped = open(os.path.join(os.environ.get("GENERAR_DIR") or RAIZ, "pedidos.html"), encoding="utf-8").read()
_mh = re.search(r"\{k:'heaven'[^}]*vendedores:\[([^\]]*)\]", _ped)
_heav = re.findall(r"'([^']+)'", _mh.group(1)) if _mh else []
chk("25c. PANEL_HEAVEN = los vendedores de Heaven de `MARCAS` en pedidos.html (un vendedor nuevo va en los dos)",
    bool(_heav) and sorted(getattr(G, "PANEL_HEAVEN", [])) == sorted(_heav), (getattr(G, "PANEL_HEAVEN", None), _heav))
_mi = re.search(r"var CONTA_INTERNOS=\[([^\]]*)\]", _ped); _me = re.search(r"var CONTA_EXCLUIR=\[([^\]]*)\]\.concat\(CONTA_INTERNOS\)", _ped)
chk("25d. PANEL_INTERNOS y PANEL_EXCLUIR = CONTA_INTERNOS y CONTA_EXCLUIR de la página",
    bool(_mi and _me) and getattr(G, "PANEL_INTERNOS", None) == re.findall(r"'([^']+)'", _mi.group(1)) and
    getattr(G, "PANEL_EXCLUIR", None) == re.findall(r"'([^']+)'", _me.group(1)) + re.findall(r"'([^']+)'", _mi.group(1)), (getattr(G, "PANEL_EXCLUIR", None),))

# ── 6 · que la prueba no tocó el panel del repo ───────────────────────────────────────────────────
chk("6. el index.html del repo no se tocó (todo fue a una carpeta temporal)", not os.path.exists(os.path.join(RAIZ, "index.html")) or "tok_de_mentira" not in open(os.path.join(RAIZ, "index.html"), encoding="utf-8").read())

print(f"\n{PASS} bien · {FAIL} mal")
sys.exit(1 if FAIL else 0)
