"""🩺 ¿Qué contesta el servidor del panel a la MISMA lectura que hace el navegador? (29/09)

El 29/09 a la noche el panel no conectaba ni en el iPad del dueño ni en el equipo de Carola
(«no hay conexión con Google») mientras el respaldo de Kommo, a la misma hora, recibía
respuesta del servidor. El respaldo usa otra acción (`kommoLeads`), que el `.gs` atiende
ANTES que todo lo demás: que él ande no prueba que la LECTURA (`list`) ande. Y el navegador,
cuando Google devuelve una página de error en vez de datos, no dice «error»: dice «sin
conexión» (la página de error no trae el permiso CORS y `fetch` falla igual que sin señal).

Esto hace la lectura como el panel (POST con `{"action":"list"}`, `?_=<ms>`, texto plano,
siguiendo el redirect a googleusercontent) y dice QUÉ volvió.

⚠️ El repositorio es PÚBLICO y este registro también: no imprime ni un dato de clientes.
Solo códigos, tamaños, tiempos, cuántas filas, el `error` del servidor si lo hay, y —si
Google devolvió una página— el texto del error (recortado).
"""
import json
import os
import re
import sys
import time
import urllib.error as _er
import urllib.request as _rq

PANEL_URL = os.environ.get("PANEL_URL", "").strip()
ORIGEN = "https://eduardoxyz22-maker.github.io"


def _sin_etiquetas(html, tope=400):
    t = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", html)
    t = re.sub(r"(?s)<[^>]+>", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t[:tope]


def pedir(nombre, url, cuerpo=None, comprimido=False):
    hdr = {"Origin": ORIGEN, "User-Agent": "Mozilla/5.0 (diagnostico-panel)"}
    if comprimido:
        # Como un navegador: todos mandan «Accept-Encoding: gzip». Si Google comprime, lo que viaja
        # por la red es mucho menos que lo que ocupa la planilla.
        hdr["Accept-Encoding"] = "gzip"
    if cuerpo is not None:
        hdr["Content-Type"] = "text/plain;charset=utf-8"
    req = _rq.Request(url, data=(json.dumps(cuerpo).encode("utf-8") if cuerpo is not None else None),
                      method=("POST" if cuerpo is not None else "GET"), headers=hdr)
    t0 = time.time()
    print(f"\n── {nombre} ──")
    try:
        with _rq.urlopen(req, timeout=120) as r:
            crudo = r.read()
            seg = time.time() - t0
            host = re.sub(r"^https?://([^/]+)/.*$", r"\1", r.geturl())
            enc = r.headers.get("Content-Encoding")
            print(f"   HTTP {r.status} en {seg:.1f} s · terminó en {host} · viajaron {len(crudo):,} bytes".replace(",", ".") +
                  (f" (comprimido: {enc})" if enc else " (sin comprimir)"))
            print(f"   tipo: {r.headers.get('Content-Type')} · permiso CORS: {r.headers.get('Access-Control-Allow-Origin')!r}")
            if enc and "gzip" in enc.lower():
                import gzip
                crudo = gzip.decompress(crudo)
                print(f"   descomprimido: {len(crudo):,} bytes".replace(",", "."))
            return crudo
    except _er.HTTPError as e:
        seg = time.time() - t0
        cuerpo_err = e.read() if hasattr(e, "read") else b""
        print(f"   ❌ HTTP {e.code} en {seg:.1f} s · tipo: {e.headers.get('Content-Type') if e.headers else None}")
        print(f"   permiso CORS: {(e.headers.get('Access-Control-Allow-Origin') if e.headers else None)!r}")
        print(f"   texto: {_sin_etiquetas(cuerpo_err.decode('utf-8', 'replace'))!r}")
        return None
    except Exception as ex:
        print(f"   ❌ {type(ex).__name__} en {time.time() - t0:.1f} s: {str(ex)[:200]}")
        return None


def feriados_de_la_pagina():
    """Las fechas de `FERIADOS` de pedidos.html (el camión no sale, §4gy)."""
    try:
        with open("pedidos.html", encoding="utf-8") as f:
            m = re.search(r"var FERIADOS\s*=\s*\{(.*?)\};", f.read(), re.S)
        return sorted(set(re.findall(r"'(\d{4}-\d{2}-\d{2})'", m.group(1)))) if m else []
    except Exception:
        return []


def pedidos_en_feriados(ped):
    """Cuántos pedidos hay agendados para un feriado que todavía no pasó (solo la cuenta por fecha: el
       registro es público). La víspera no aparecen en ningún «Mañana» (revisión del 29/09, R1-2)."""
    fer = feriados_de_la_pagina()
    if not fer:
        print("   (no encontré FERIADOS en pedidos.html)")
        return
    hoy = time.strftime("%Y-%m-%d", time.gmtime(time.time() - 4 * 3600))   # Bolivia, UTC−4
    cuenta = {}
    for p in ped:
        if not isinstance(p, dict) or str(p.get("id", "")).startswith("__"):
            continue
        f = str(p.get("fecha") or "")[:10]
        if f in fer and f >= hoy:
            cuenta[f] = cuenta.get(f, 0) + 1
    if cuenta:
        print("   ⚠️ pedidos agendados para un FERIADO: " + ", ".join(f"{f}: {n}" for f, n in sorted(cuenta.items())))
    else:
        print(f"   pedidos agendados para un feriado de acá en adelante: ninguno ({len([f for f in fer if f >= hoy])} feriados por venir)")


def contar(crudo):
    if crudo is None:
        return
    txt = crudo.decode("utf-8", "replace")
    try:
        j = json.loads(txt)
    except Exception as ex:
        print(f"   ⚠️ NO es JSON ({type(ex).__name__}): Google devolvió una PÁGINA. Texto: {_sin_etiquetas(txt)!r}")
        return
    if not isinstance(j, dict):
        print(f"   ⚠️ JSON raro: {type(j).__name__}")
        return
    print(f"   ok={j.get('ok')!r} · error={j.get('error')!r} · versión={j.get('version')!r}")
    ped = j.get("pedidos")
    if isinstance(ped, list):
        tam = sorted(((len(json.dumps(p, ensure_ascii=False)), (p.get('id') if isinstance(p, dict) else '')) for p in ped), reverse=True)
        sistema = [t for t in tam if str(t[1]).startswith("__")]
        print(f"   filas: {len(ped)} · la más grande: {tam[0][0]:,} letras".replace(",", ".") if tam else "   filas: 0")
        # Solo el TAMAÑO y el tipo de fila (del sistema o pedido), nunca su contenido.
        print("   las 5 más grandes: " + ", ".join(f"{n:,}".replace(",", ".") + (" (sistema)" if str(i).startswith("__") else " (pedido)") for n, i in tam[:5]))
        for n, i in sistema:
            if i in ("__stock__", "__arqueo_cuadre__", "__dias_cerrados__", "__carga_chk__"):
                print(f"   {i}: {n:,} letras".replace(",", "."))
        celda_stock(ped, j.get('version'))
        pedidos_en_feriados(ped)


# 📏 (06/10, auditoría) Todo el stock vive en UNA celda y Google la corta en 50.000 letras: el .gs contesta `celda_llena`
#    y el stock deja de guardarse (el panel avisa desde las 45.000). El control del corte (§4hn) suma detecciones (`det`),
#    salidas sin pedido (`sm`), recepciones `x:` e historial (`h`) con cada Excel: esto dice cuánto mide HOY y QUÉ parte crece.
#    Solo tamaños y cantidades, nunca nombres de productos ni unidades: este registro es público.
TOPE_CELDA = 50000
AVISO_CELDA = 45000
_STOCK_MEDIDO = False


def _letras(s):
    """Letras como las cuenta JavaScript (y Google): unidades UTF-16, no caracteres de Python."""
    return len(s.encode("utf-16-le")) // 2


def _tam(v):
    return _letras(json.dumps(v, ensure_ascii=False, separators=(",", ":")))


def celda_stock(ped, ver=None):
    global _STOCK_MEDIDO
    if _STOCK_MEDIDO:
        return
    fila = next((p for p in ped if isinstance(p, dict) and p.get("id") == "__stock__"), None)
    if not fila:
        return
    _STOCK_MEDIDO = True
    txt = str(fila.get("observaciones") or "")
    n = _letras(txt)
    marca = "❌ LLENA: el stock ya no se guarda" if n >= TOPE_CELDA else ("⚠️ pasó el aviso de 45.000" if n >= AVISO_CELDA else "ok")
    print(f"   📏 celda del stock: {n:,} letras = {100 * n / TOPE_CELDA:.0f} % del tope de 50.000 · {marca}".replace(",", "."))
    try:
        s = json.loads(txt)
    except Exception as ex:
        print(f"      (no pude abrir el JSON del stock: {type(ex).__name__})")
        return
    if not isinstance(s, dict):
        return
    partes = sorted(((_tam(v), k, (f" ({len(v)})" if isinstance(v, (list, dict)) else "")) for k, v in s.items()), reverse=True)
    print("      por parte (letras y, entre paréntesis, cuántos): " + " · ".join(f"{k} {t:,}".replace(",", ".") + c for t, k, c in partes))
    fotos = 0
    for alm in [s.get("c")] + list((s.get("g") or {}).values()):
        if isinstance(alm, dict):
            fotos += _tam(alm.get("u") or {}) + _tam(alm.get("cod") or {})
    det = [x for x in (s.get("det") or []) if isinstance(x, dict)]
    sm = [x for x in (s.get("sm") or []) if isinstance(x, dict)]
    recs = [r for q in (s.get("p") or []) if isinstance(q, dict) for r in (q.get("recs") or []) if isinstance(r, dict)]
    rx = [r for r in recs if str(r.get("id") or "").startswith("x:")]
    _n = lambda x: f"{x:,}".replace(",", ".")
    print(f"      fotos de los almacenes (u + cod): {_n(fotos)} letras · detecciones {len(det)} ({sum(1 for x in det if x.get('an'))} anuladas, "
          f"{_n(_tam(det))} letras) · salidas sin pedido {len(sm)} ({_n(_tam(sm))} letras) · recepciones {len(recs)}, del control "
          f"{len(rx)} ({_n(_tam(rx))} letras) · cortes en el historial {len(s.get('h') or [])}")
    # ¿Quién subió los últimos Excel? La página con el control del corte (desde el 05/10 17:01) marca la fila con `v: 2` y
    # `v2t`, y cada corte con su huella (`hu`) y sus diferencias (`d`); una página sin F5 no deja nada de eso (§4hq).
    print(f"      marca de la página nueva en la fila: v={s.get('v')!r} · v2t={'sí' if s.get('v2t') else 'no'}")
    # (06/10, §4hs) Desde la página del 06/10, cada guardado del stock lleva `pv: 3`; una página sin F5 lo pierde al guardar.
    pv = s.get("pv")
    print(f"      la guardó por última vez: {'una página al día (pv ' + str(pv) + ')' if (pv or 0) >= 3 else 'una página VIEJA (sin pv): que todos hagan F5'}")
    # Y si el servidor ya lo exige (`sf`, .gs 2026-10-06-a): con él, una página sin F5 recibe `actualizar` y no escribe el stock.
    if isinstance(ver, str) and ver:
        print("      servidor: " + (f"🔒 una página sin F5 ya NO puede guardar el stock ({ver})" if ver >= "2026-10-06-a"
                                   else f"⚠️ todavía deja guardar el stock a una página sin F5 ({ver}; hace falta la 2026-10-06-a)"))
    alm = lambda a: re.sub(r"^\s*[\d-]+\s+", "", str(a or ""))[:22] or "?"
    # La hora en que se SUBIÓ cada Excel (`ts`, hora de Bolivia): el orden de la lista no alcanza para saberlo.
    subido = lambda ts: time.strftime("%d/%m %H:%M", time.gmtime((float(ts) / 1000) - 4 * 3600)) if ts else "?"
    hs = sorted([y for y in (s.get("h") or []) if isinstance(y, dict)], key=lambda y: -(float(y.get("ts") or 0)))
    for x in hs[:8]:
        print(f"      corte {x.get('f') or '?'} {str(x.get('hora') or '')[:5] or '(sin hora)'} · subido {subido(x.get('ts'))} · "
              f"{alm(x.get('alm'))} · rol {x.get('rol') or '?'} · {'página NUEVA (huella)' if x.get('hu') else 'página VIEJA (sin huella)'}"
              f"{' · diferencias ' + str(len(x.get('d') or [])) if x.get('hu') else ''}")
    # De qué día es lo que el panel usa HOY como saldo de cada almacén.
    c = s.get("c") if isinstance(s.get("c"), dict) else {}
    print(f"      saldo de acá (PTF) que usa el panel: corte del {c.get('f') or '?'} {str(c.get('hora') or '')[:5]} · subido {subido(c.get('t'))}")
    for nm, g in (s.get("g") or {}).items():
        if isinstance(g, dict):
            print(f"      saldo de {alm(nm)}: corte del {g.get('f') or '?'} {str(g.get('hora') or '')[:5]}")


def url_de_la_pagina():
    """La dirección que tiene escrita pedidos.html (`var SHEETS_URL = '…'`): es la que usa el
       navegador. Puede no ser la misma que el secreto PANEL_URL del respaldo."""
    try:
        with open("pedidos.html", encoding="utf-8") as f:
            m = re.search(r"var SHEETS_URL\s*=\s*'([^']+)'", f.read())
        return m.group(1).strip() if m else ""
    except Exception:
        return ""


def leer(nombre, base, comprimido=True):
    sep = "&" if "?" in base else "?"
    crudo = pedir(nombre, base + sep + "_=" + str(int(time.time() * 1000)),
                  {"action": "list", "quien": "", "dispositivo": "diagnostico-github", "cola": 0, "colaIds": []},
                  comprimido=comprimido)
    contar(crudo)


def huella_fila(ident, rev):
    """La cuenta de control de UNA fila, igual que `huellaFila_` del .gs y `huellaFila` de la página (FNV-1a de 32 bits
       sobre «id:sello»). La de la planilla es la suma de todas, módulo 2^32 (30/09, §4he)."""
    try:
        r = int(rev) if rev not in (None, "") else 0
    except Exception:
        r = 0
    h = 2166136261
    for ch in f"{ident}:{r}":
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def _abrir(j):
    """Una respuesta comprimida (`z:'gzip64'`) → el JSON de adentro; una sin comprimir pasa tal cual."""
    if isinstance(j, dict) and j.get("z") == "gzip64" and isinstance(j.get("d"), str):
        import base64
        import gzip
        return json.loads(gzip.decompress(base64.b64decode(j["d"])).decode("utf-8"))
    return j


def lectura_nueva(base):
    """🗜️ La lectura del servidor 2026-09-30-a (§4he): comprimida (`z`) y solo lo cambiado (`desde`), con la cuenta de
       control rehecha acá como la rehace el panel. Con un servidor de antes, lo dice y listo. Solo tamaños y cuentas."""
    sep = "&" if "?" in base else "?"
    cuerpo = {"action": "list", "z": 1, "quien": "", "dispositivo": "diagnostico-github", "cola": 0, "colaIds": []}
    crudo = pedir("lectura COMPRIMIDA (z:1), como el panel nuevo", base + sep + "_=" + str(int(time.time() * 1000)), cuerpo)
    if crudo is None:
        return
    try:
        j = json.loads(crudo.decode("utf-8"))
    except Exception:
        print("   ⚠️ no es JSON")
        return
    if not isinstance(j, dict) or j.get("z") != "gzip64":
        print(f"   el servidor NO la comprimió (versión {j.get('version')!r}): eso llega con el .gs 2026-09-30-a" if isinstance(j, dict) else "   respuesta rara")
        if isinstance(j, dict) and "ahora" not in j:
            return
    try:
        t0 = time.time()
        adentro = _abrir(j)
        abrir_s = time.time() - t0
    except Exception as ex:
        print(f"   ❌ no se pudo abrir la comprimida: {type(ex).__name__}")
        return
    ped = adentro.get("pedidos") if isinstance(adentro, dict) else None
    if not isinstance(ped, list):
        print(f"   ⚠️ sin lista: ok={adentro.get('ok')!r} error={adentro.get('error')!r}")
        return
    plano = len(json.dumps(adentro, ensure_ascii=False).encode("utf-8"))
    marca = "bien" if adentro.get("zc") == "ñ\U0001F512€" else "MAL (el panel la descartaría y leería sin comprimir)"
    print(f"   la comprime el servidor (gzip adentro de la respuesta): viajaron {len(crudo):,} bytes en vez de {plano:,} ({plano / max(1, len(crudo)):.1f} veces menos) · abrirla: {abrir_s:.2f} s · marca de las letras: {marca}".replace(",", "."))
    base_filas = {str(p.get("id")): p.get("rev") for p in ped if isinstance(p, dict) and p.get("id")}
    h = sum(huella_fila(i, r) for i, r in base_filas.items()) % 4294967296
    print(f"   filas: {len(ped)} (el servidor dice {adentro.get('n')}) · cuenta de control: {'da ✅' if h == adentro.get('huella') and len(base_filas) == adentro.get('n') else 'NO da ❌'}")
    repetidos = len([p for p in ped if isinstance(p, dict) and p.get("id")]) - len(base_filas)
    if repetidos:
        # Solo la cuenta: el panel apaga la de lo cambiado con ids repetidos (lee entera, comprimida).
        print(f"   ⚠️ {repetidos} fila(s) con un id REPETIDO en la hoja: el panel no usa la lectura de lo cambiado (lee entera, comprimida)")
    ahora = adentro.get("ahora")
    if not ahora:
        print("   (el servidor no dice de cuándo es la lectura: la de lo cambiado llega con el .gs 2026-09-30-a)")
        return
    time.sleep(3)
    cuerpo2 = dict(cuerpo, desde=ahora)
    crudo2 = pedir("lectura de LO CAMBIADO (desde = la hora de la anterior)", base + sep + "_=" + str(int(time.time() * 1000)), cuerpo2)
    if crudo2 is None:
        return
    try:
        d = _abrir(json.loads(crudo2.decode("utf-8")))
    except Exception as ex:
        print(f"   ❌ no se pudo leer: {type(ex).__name__}")
        return
    if not d.get("delta"):
        print(f"   vino la planilla ENTERA ({len(d.get('pedidos') or [])} filas): muchas filas cambiadas, o el servidor no la hace")
        return
    for b in d.get("borrados") or []:
        if b and str(b[0]) in base_filas and not (base_filas[str(b[0])] or 0) > (b[1] or 0):
            base_filas.pop(str(b[0]), None)
    for p in d.get("pedidos") or []:
        if isinstance(p, dict) and p.get("id"):
            base_filas[str(p.get("id"))] = p.get("rev")
    h2 = sum(huella_fila(i, r) for i, r in base_filas.items()) % 4294967296
    print(f"   {len(d.get('pedidos') or [])} fila(s) cambiada(s) y {len(d.get('borrados') or [])} borrada(s) desde la anterior · "
          f"cuenta de control con la copia + lo cambiado: {'da ✅' if h2 == d.get('huella') and len(base_filas) == d.get('n') else 'NO da ❌ (el panel leería entera)'}")


class _SinSeguir(_rq.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


def en_dos_tramos(base, veces=5):
    """La lectura en sus DOS tramos, medidos por separado: (1) el POST a script.google.com, que corre
       el script y contesta con un redirect, y (2) el GET a googleusercontent, que entrega los datos.
       Así se sabe si lo lento es Google corriendo el script (o haciéndolo esperar) o Google
       entregando la respuesta."""
    abrir = _rq.build_opener(_SinSeguir)
    sep = "&" if "?" in base else "?"
    print(f"\n── la lectura en dos tramos, {veces} veces ──")
    for n in range(veces):
        cuerpo = json.dumps({"action": "list", "quien": "", "dispositivo": "diagnostico-github", "cola": 0, "colaIds": []}).encode()
        req = _rq.Request(base + sep + "_=" + str(int(time.time() * 1000)), data=cuerpo, method="POST",
                          headers={"Content-Type": "text/plain;charset=utf-8", "Origin": ORIGEN})
        t0 = time.time()
        destino = None
        try:
            abrir.open(req, timeout=120)
            print(f"   {n + 1}. el POST no redirigió")
            continue
        except _er.HTTPError as e:
            if e.code in (301, 302, 303, 307, 308):
                destino = e.headers.get("Location")
            else:
                print(f"   {n + 1}. POST: HTTP {e.code} en {time.time() - t0:.1f} s")
                continue
        except Exception as ex:
            print(f"   {n + 1}. POST: {type(ex).__name__} en {time.time() - t0:.1f} s")
            continue
        t1 = time.time()
        try:
            with _rq.urlopen(_rq.Request(destino, headers={"Origin": ORIGEN}), timeout=120) as r:
                datos = r.read()
            t2 = time.time()
            print(f"   {n + 1}. correr el script: {t1 - t0:.1f} s · entregar los datos: {t2 - t1:.1f} s ({len(datos):,} bytes)".replace(",", "."))
        except Exception as ex:
            print(f"   {n + 1}. correr el script: {t1 - t0:.1f} s · entregar: {type(ex).__name__} a los {time.time() - t1:.1f} s")
        time.sleep(3)


def ubicacion_almacenes(base):
    """📍 (07/10, §4ht) Dónde quedan los dos depósitos de salida, con el MISMO servidor que abre los enlaces cortos de
    los pedidos (`geocode`). Los enlaces los mandó el dueño y están en pedidos.html (`ALM_UBIC`); desde la sesión de
    Claude el proxy no abre maps.app.goo.gl. Son lugares de la empresa, no datos de clientes."""
    try:
        txt = open(os.path.join(os.path.dirname(__file__), "..", "pedidos.html"), encoding="utf-8").read()
    except Exception:
        return
    links = re.findall(r"id:'(\w+)'[^\n]*?link:'(https://maps\.app\.goo\.gl/[^']+)'", txt)
    if not links:
        return
    crudo = pedir("📍 ubicación de los almacenes (geocode de los enlaces de ALM_UBIC)", base,
                  {"action": "geocode", "links": [u for _, u in links]})
    try:
        j = json.loads((crudo or b"{}").decode("utf-8", "replace"))
    except Exception:
        print("   no es JSON")
        return
    geo = {g.get("link"): g for g in (j.get("geo") or []) if isinstance(g, dict)}
    print(f"   el servidor ({j.get('version')!r}) devolvió {len(geo)} de {len(links)}")
    for ident, u in links:
        g = geo.get(u)
        if g is None:
            print(f"   {ident}: no vino en la respuesta")
        elif g.get("lat") is None:
            print(f"   {ident}: el servidor no la pudo abrir")
        else:
            print(f"   {ident}: {g.get('lat')}, {g.get('lng')}" + (" (aproximada)" if g.get("aprox") else ""))
    # El 07/10 el servidor no pudo con ninguno de los dos: se abren acá directo (GitHub sí sale a internet), y se dice
    # QUÉ contestó Google en cada salto, para saber por qué el servidor no puede.
    print("   ── abiertos directo desde GitHub ──")
    for ident, u in links:
        abrir_enlace_directo(ident, u)


_COORD_RES = [r"!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)", r"@(-?\d+\.\d+),(-?\d+\.\d+)", r"[?&](?:q|ll|query|center)=(-?\d+\.\d+),\s*(-?\d+\.\d+)",
              r"\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]"]


def _coords_en(texto):
    for rx in _COORD_RES:
        m = re.search(rx, texto or "")
        if m and abs(float(m.group(1))) < 90 and abs(float(m.group(2))) < 180:
            return m.group(1), m.group(2)
    return None


def abrir_enlace_directo(ident, u):
    abrir = _rq.build_opener(_SinSeguir)
    cur = u
    for salto in range(6):
        req = _rq.Request(cur, headers={"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 "
                                                       "(KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
                                        "Accept-Language": "es-BO,es;q=0.9"})
        try:
            r = abrir.open(req, timeout=30)
            cuerpo = r.read().decode("utf-8", "replace")
            c = _coords_en(cur) or _coords_en(cuerpo)
            host = re.sub(r"^https?://([^/?#]+).*$", r"\1", cur)
            print(f"   {ident}: salto {salto} → HTTP {r.status} en {host} · {len(cuerpo)} letras · " +
                  (f"coordenadas {c[0]}, {c[1]}" if c else "sin coordenadas"))
            return
        except _er.HTTPError as e:
            loc = e.headers.get("Location") if e.headers else None
            if e.code in (301, 302, 303, 307, 308) and loc:
                cur = loc if loc.startswith("http") else re.sub(r"^(https?://[^/]+).*$", r"\1", cur) + loc
                c = _coords_en(cur)
                destino = re.sub(r"^https?://([^/?#]+)(/[^?#]{0,40}).*$", r"\1\2", cur)
                print(f"   {ident}: salto {salto} → {e.code} a {destino}" + (f" · coordenadas {c[0]}, {c[1]}" if c else ""))
                if c:
                    return
                continue
            print(f"   {ident}: salto {salto} → HTTP {e.code}")
            return
        except Exception as ex:
            print(f"   {ident}: salto {salto} → {type(ex).__name__}: {str(ex)[:120]}")
            return


def main():
    pagina = url_de_la_pagina()
    if not PANEL_URL and not pagina:
        print("❌ Falta el secreto PANEL_URL y no encontré la dirección en pedidos.html")
        sys.exit(1)
    print(f"dirección del secreto PANEL_URL y la de pedidos.html: {'LA MISMA' if PANEL_URL == pagina else 'DISTINTAS'}")
    # 1) La lectura del panel, idéntica a la del navegador (apiPost/apiList de pedidos.html), con la
    #    dirección que tiene escrita la página publicada.
    if pagina:
        leer("lectura con la dirección de la PÁGINA (POST list), como un navegador (acepta gzip)", pagina)
        leer("otra vez, SIN aceptar gzip (para comparar el tamaño)", pagina, comprimido=False)
    # 2) Con la del secreto (la que usa el respaldo de Kommo), si es otra.
    if PANEL_URL and PANEL_URL != pagina:
        leer("lectura con la dirección del SECRETO (POST list)", PANEL_URL)
    # 2b) La lectura nueva (servidor 2026-09-30-a, §4he): comprimida y solo lo cambiado.
    lectura_nueva(pagina or PANEL_URL)
    # 3) La puerta GET (doGet), la misma dirección sin cuerpo.
    contar(pedir("puerta GET (doGet) de la página", pagina or PANEL_URL))
    # 4) Dónde se va el tiempo: correr el script o entregar los datos.
    en_dos_tramos(pagina or PANEL_URL)
    # 5) 📍 (§4ht) Dónde quedan los almacenes de salida.
    ubicacion_almacenes(pagina or PANEL_URL)


if __name__ == "__main__":
    main()
