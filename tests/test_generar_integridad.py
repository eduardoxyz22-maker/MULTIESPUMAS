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

Se corre:  python3 tests/test_generar_integridad.py
Dientes:   GENERAR_DIR=/carpeta/con/el/viejo python3 tests/test_generar_integridad.py
"""
import io, json, os, re, sys, tempfile, contextlib, urllib.parse, urllib.error

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
            body = emb("users", [{"id": ANA, "name": "Ana Prueba - Central"}, {"id": BETO, "name": "Beto Prueba - Central"}])
        elif path == "/leads/custom_fields":
            body = emb("custom_fields", [{"id": CANAL, "name": "Canal", "type": "select", "enums": [{"id": 1, "value": "Facebook"}]},
                                         {"id": CONTRATO, "name": "Fecha contrato", "type": "date"}])
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

# ── 6 · que la prueba no tocó el panel del repo ───────────────────────────────────────────────────
chk("6. el index.html del repo no se tocó (todo fue a una carpeta temporal)", not os.path.exists(os.path.join(RAIZ, "index.html")) or "tok_de_mentira" not in open(os.path.join(RAIZ, "index.html"), encoding="utf-8").read())

print(f"\n{PASS} bien · {FAIL} mal")
sys.exit(1 if FAIL else 0)
