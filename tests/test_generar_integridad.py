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
_SOLO_DATOS = "--solo-datos" in sys.argv[1:] or bool(os.environ.get("SOLO_DATOS"))
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

def fabricar_urlopen(fallar=None):
    """fallar(path, params) → código HTTP con que tiene que fallar esa consulta, o None."""
    def urlopen(req, timeout=None):
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
        elif path == "/contacts": body = emb("contacts", [])
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

def correr(fallar=None):
    """Corre main() con el Kommo de mentira. Devuelve (salida_con_error, PANEL_DATA o None, texto impreso)."""
    tmp = tempfile.mkdtemp(prefix="gen_integridad_")
    G.HERE = tmp
    G._DIAG.clear()
    if hasattr(G, "_FALLAS"): G._FALLAS.clear()
    G._rq.urlopen = fabricar_urlopen(fallar)
    G.time.sleep = lambda s: None
    out = io.StringIO(); err = io.StringIO(); salio = None
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        try:
            G.main()
        except SystemExit as e:
            salio = e.code
    pd = None
    p = os.path.join(tmp, "index.html")
    if os.path.exists(p):
        h = open(p, encoding="utf-8").read()
        m = re.search(r"window\.PANEL_DATA = (\{.*?\});\n", h, re.S) or re.search(r"window\.PANEL_DATA = (\{.*\});", h)
        pd = json.loads(m.group(1)) if m else None
    return salio, pd, out.getvalue() + err.getvalue(), os.listdir(tmp)

# `--solo-datos`: imprime el PANEL_DATA del caso «todo bien» y sale (lo usa tests/test_panel_meta.js para abrir el
# dashboard de verdad con estos mismos datos inventados).
if _SOLO_DATOS:
    _s, _pd, _t, _a = correr()
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
    chk("10g. el domingo está cerrado en todas", all(fuera(n, 12, 0, 15) is True for n in ("Isabel Robledo", "Carola Chávez", "Jonathan Monje", "Maria Flores")))
    G.SUC_DE_USUARIO.clear(); G.SUC_DE_USUARIO.update(_antes)

# ── 6 · que la prueba no tocó el panel del repo ───────────────────────────────────────────────────
chk("6. el index.html del repo no se tocó (todo fue a una carpeta temporal)", not os.path.exists(os.path.join(RAIZ, "index.html")) or "tok_de_mentira" not in open(os.path.join(RAIZ, "index.html"), encoding="utf-8").read())

print(f"\n{PASS} bien · {FAIL} mal")
sys.exit(1 if FAIL else 0)
