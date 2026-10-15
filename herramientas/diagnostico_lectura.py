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
from datetime import datetime, timedelta, timezone

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
    global _LISTA
    if _LISTA is None and isinstance(j.get("pedidos"), list):
        _LISTA = j                                          # 🛰️ (13/10) la primera lectura buena: de acá sale el resumen del GPS
    ped = j.get("pedidos")
    if isinstance(ped, list):
        global _PEDIDOS
        _PEDIDOS = ped
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


_LISTA = None

# 🛰️ (13/10) EL GPS DE HOY Y LAS ENTREGAS MARCADAS. El dueño: «¿cómo vamos con el GPS? ¿cómo está todo? las entregas
#    "marcadas"». Lo que la lectura trae del servidor (`gps` = la última posición de cada camión, `gpsDia` = salidas, registro y
#    paradas de hoy, desde el .gs 2026-10-13-b) contra los pedidos de hoy: cuántos tiene cada camión, en cuántos se paró el GPS y
#    cuántos tienen el ✅. ⚠️ Registro PÚBLICO: solo placas (ya están en el código), horas y CUENTAS; nunca clientes, direcciones,
#    coordenadas ni el nombre del conductor.
GPS_PLACAS = {"6663CCP": "Foton nuevo", "6409TIG": "Carry", "6021URL": "Foton insumo", "5655KSC": "Foton encarpado"}
GPS_LUGARES = [("PTF", -17.7489125, -63.1429219, 300), ("Banzer", -17.7197548, -63.1631138, 300), ("Moreno", -17.7623355, -63.0675466, 400)]
BO = timezone(timedelta(hours=-4))


def _dist_m(la1, lo1, la2, lo2):
    import math
    r = math.pi / 180
    a = math.sin((la2 - la1) * r / 2) ** 2 + math.cos(la1 * r) * math.cos(la2 * r) * math.sin((lo2 - lo1) * r / 2) ** 2
    return 6371000 * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _hora_bo(ms):
    try:
        return datetime.fromtimestamp(ms / 1000, BO).strftime("%H:%M") if ms else "?"
    except Exception:
        return "?"


def _sale_en_camion(p):
    """Un pedido que sale en un camión: ni filas del sistema, ni borradores de Kommo, ni ventas de tienda."""
    if not isinstance(p, dict):
        return False
    i = str(p.get("id") or "")
    if i.startswith("__") or i.startswith("kommo-") or str(p.get("estado") or "").lower().startswith("borrador"):
        return False
    d = str(p.get("direccion") or "").upper().replace("Ó", "O")
    return not (d.startswith("SALIO DE TIENDA") or str(p.get("zona") or "").strip().lower() == "tienda")


def gps_del_dia():
    print("\n── 🛰️ el GPS de hoy y las entregas marcadas (solo horas y cuentas: este registro es público) ──")
    j = _LISTA
    if not j:
        print("   (no hubo una lectura buena de la planilla)")
        return
    ahora = datetime.now(BO)
    hoy = ahora.date().isoformat()
    print(f"   servidor {j.get('version')!r} · ahora en Bolivia: {ahora.strftime('%d/%m %H:%M')}")
    g = j.get("gps") if isinstance(j.get("gps"), dict) else None
    if not g or not g.get("u"):
        print("   ❌ la lectura NO trae posiciones del GPS (`gps`): el repaso no corre, faltan las claves en Propiedades, o pasaron más de "
              "10 min sin un pedido bueno a la plataforma (fuera de 6 a 21 h, domingo o feriado no corre)")
    else:
        t = g.get("t") or 0
        print(f"   posiciones: pedidas a la plataforma a las {_hora_bo(t)} (hace {max(0, round((ahora.timestamp() * 1000 - t) / 60000))} min) · "
              f"{len(g['u'])} camión(es)")
        for x in g["u"]:
            if not isinstance(x, dict):
                continue
            nom = GPS_PLACAS.get(str(x.get("p") or ""), "¿placa sin camión en el panel?")
            donde = "en la calle"
            try:
                cer = min(((_dist_m(x["la"], x["lo"], la, lo), n, rad) for n, la, lo, rad in GPS_LUGARES))
                donde = (f"en {cer[1]}" if cer[0] <= cer[2] else f"en la calle, a {cer[0] / 1000:.1f} km de {cer[1]}").replace(".", ",")
            except Exception:
                pass
            viejo = round((t - (x.get("r") or 0)) / 60000) if x.get("r") else None
            print(f"   · {nom} ({x.get('p')}): {donde} · {x.get('v', 0)} km/h · motor {'prendido' if x.get('m') else 'apagado'} · "
                  f"último reporte {_hora_bo(x.get('r'))}" + (f" (⚠️ {viejo} min antes de la consulta)" if viejo and viejo > 15 else ""))
    d = j.get("gpsDia") if isinstance(j.get("gpsDia"), dict) else None
    vistos = {}
    if not d:
        print("   ❌ la lectura NO trae el día del GPS (`gpsDia`): llega con el .gs 2026-10-13-b, y solo si hoy ya corrió el repaso")
    else:
        print(f"   el día del GPS: {d.get('f')} · actualizado a las {_hora_bo(d.get('t'))}")
        for pl, u in sorted((d.get("u") or {}).items()):
            nom = GPS_PLACAS.get(pl, pl)
            ev = u.get("ev") or []
            par = u.get("par") or []
            con = [q for q in par if isinstance(q, list) and len(q) > 4 and q[4]]
            for q in con:
                for i in q[4]:
                    vistos[str(i)] = nom
            tipos = {}
            for e in ev:
                if isinstance(e, list) and len(e) > 1:
                    k = e[1] + ("·" + e[3] if e[1] == "sal" and len(e) > 3 and e[3] else "")
                    tipos[k] = tipos.get(k, 0) + 1
            print(f"   · {nom}: salió {u.get('s') or '—'}" + (f" (de {u.get('sd')})" if u.get('sd') else "") +
                  (f" · última salida {u.get('ul')}" if u.get('ul') and u.get('ul') != u.get('s') else "") +
                  (f" · volvió {u.get('vu')}" if u.get('vu') else "") +
                  f" · paradas {len(par)} ({len(con)} en un pedido, {sum(len(q[4]) for q in con)} pedido(s) nombrados) · registro: " +
                  (", ".join(f"{k} {n}" for k, n in sorted(tipos.items())) or "vacío"))
    # 📢 (14/10) el anuncio de Administración: si está puesto y desde cuándo (sin el texto: este registro es público)
    an = [p for p in (j.get("pedidos") or []) if isinstance(p, dict) and str(p.get("id")) == "__anuncio__"]
    if not an:
        print("   📢 anuncio: no hay fila __anuncio__ en la planilla (nunca se publicó uno)")
    else:
        try:
            o = json.loads(an[0].get("observaciones") or "{}")
        except Exception:
            o = {}
        t = str(o.get("t") or "").strip()
        print(f"   📢 anuncio: {'PUESTO (' + str(len(t)) + ' letras) desde el ' + str(o.get('d') or '?') if t else 'quitado (la fila está, sin texto)'}")
    ped = [p for p in (j.get("pedidos") or []) if _sale_en_camion(p)]
    de_hoy = [p for p in ped if str(p.get("fecha") or "")[:10] == hoy]
    print(f"   ── pedidos de HOY que salen en camión: {len(de_hoy)} ──")
    por = {}
    for p in de_hoy:
        v = str(p.get("vehiculo") or "").strip() or "(sin camión)"
        c = por.setdefault(v, {"n": 0, "ok": 0, "gps": 0, "ambos": 0})
        c["n"] += 1
        ok = bool(p.get("entregado"))
        vio = str(p.get("id")) in vistos
        c["ok"] += ok
        c["gps"] += vio
        c["ambos"] += ok and vio
    for v, c in sorted(por.items()):
        print(f"   · {v}: {c['n']} pedido(s) · ✅ marcados {c['ok']} · el GPS se paró en {c['gps']} · las dos cosas {c['ambos']}")
    tot = {k: sum(c[k] for c in por.values()) for k in ("n", "ok", "gps", "ambos")}
    if de_hoy:
        print(f"   TOTAL hoy: {tot['n']} · ✅ {tot['ok']} · GPS {tot['gps']} · los dos {tot['ambos']}")
    print("   ── los últimos 7 días: ¿se marca el ✅? (el cierre de entregas) ──")
    for k in range(7, 0, -1):
        f = (ahora.date() - timedelta(days=k)).isoformat()
        L = [p for p in ped if str(p.get("fecha") or "")[:10] == f]
        if L:
            n_ok = sum(1 for p in L if p.get("entregado"))
            print(f"   {f}: {len(L)} pedido(s) · ✅ {n_ok} ({round(100 * n_ok / len(L))} %)")


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
    textos = []
    for ident, u in links:
        t = abrir_enlace_directo(ident, u)
        if t:
            textos.append((ident, t))
    # Lo que Google puso en `q=` (nombre/dirección del lugar), preguntado al geocodificador del servidor (aproximado).
    if textos:
        crudo2 = pedir("📍 los lugares por su dirección escrita (geocode de texto del servidor)", base,
                       {"action": "geocode", "links": [t for _, t in textos]})
        try:
            j2 = json.loads((crudo2 or b"{}").decode("utf-8", "replace"))
        except Exception:
            j2 = {}
        g2 = {g.get("link"): g for g in (j2.get("geo") or []) if isinstance(g, dict)}
        for ident, t in textos:
            g = g2.get(t) or {}
            print(f"   {ident}: «{t[:70]}» → " + (f"{g.get('lat')}, {g.get('lng')}" if g.get("lat") is not None else "no la encontró"))


_PEDIDOS = None   # la última lista leída: solo para CONTAR (nunca se imprime nada de un pedido)
_PLUS = r"(^|[^0-9A-Za-z])[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}"


def ubicacion_pedidos(base):
    """📍 (07/10, §4ht) «Banzer o PTF» reparte cada entrega según su pin. ¿Cuántas entregas de los últimos 60 días se
    pueden ubicar? Las que traen las coordenadas en el enlace salen sin internet; los enlaces CORTOS los tiene que abrir
    el servidor, y el 07/10 no pudo con los de los almacenes (Google ahora redirige a `?q=<dirección>&ftid=…`).
    Solo CUENTAS: ni enlaces, ni coordenadas, ni nombres (el registro es público)."""
    print("\n── 📍 entregas de los últimos 60 días: ¿cuántas se pueden ubicar? (solo cuentas) ──")
    ped = _PEDIDOS
    if not isinstance(ped, list):
        print("   (no hay lista leída)")
        return
    import datetime as _dt
    hoy = (_dt.datetime.utcnow() - _dt.timedelta(hours=4)).date()
    desde, hoy = (hoy - _dt.timedelta(days=59)).isoformat(), hoy.isoformat()
    n = sin = coords = cortos = otros = zona = 0
    lista = []
    for p in ped:
        if not isinstance(p, dict):
            continue
        i = str(p.get("id") or "")
        if i.startswith("__") or i.startswith("kommo"):
            continue
        f = str(p.get("fecha") or "")
        if not (desde <= f <= hoy):
            continue
        n += 1
        u = str(p.get("maps") or "").strip()
        if not u:
            sin += 1
            if str(p.get("zona") or "").strip():
                zona += 1
            continue
        from urllib.parse import unquote as _uq
        if _coords_en(u) or re.search(_PLUS, _uq(u)) or re.search(r"\d+\s*°", _uq(u)):
            coords += 1
        elif re.search(r"maps\.app\.goo\.gl|goo\.gl/maps", u):
            cortos += 1
            lista.append((f, u))
        else:
            otros += 1
    print(f"   con fecha de entrega en la ventana: {n} · sin enlace: {sin} ({zona} con zona escrita)")
    print(f"   con enlace: {n - sin} → con las coordenadas adentro: {coords} · enlaces cortos: {cortos} · otros: {otros}")
    muestra = [u for _, u in sorted(lista, reverse=True)[:12]]
    if not muestra:
        return
    t0 = time.time()
    crudo = pedir(f"📍 el servidor abre {len(muestra)} enlaces cortos (los más nuevos)", base, {"action": "geocode", "links": muestra})
    try:
        j = json.loads((crudo or b"{}").decode("utf-8", "replace"))
    except Exception:
        print("   no es JSON")
        return
    geo = [g for g in (j.get("geo") or []) if isinstance(g, dict)]
    ok = [g for g in geo if g.get("lat") is not None]
    print(f"   abrió {len(ok)} de {len(muestra)} en {time.time() - t0:.1f} s · aproximados (por la dirección): "
          f"{len([g for g in ok if g.get('aprox')])}")


_COORD_RES = [r"!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)", r"@(-?\d+\.\d+),(-?\d+\.\d+)", r"[?&](?:q|ll|query|center)=(-?\d+\.\d+),\s*(-?\d+\.\d+)",
              r"\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]"]


def _coords_en(texto):
    for rx in _COORD_RES:
        m = re.search(rx, texto or "")
        if m and abs(float(m.group(1))) < 90 and abs(float(m.group(2))) < 180:
            return m.group(1), m.group(2)
    # La página de Maps abre centrada en el lugar: APP_INITIALIZATION_STATE=[[[zoom, lng, lat]
    m = re.search(r"APP_INITIALIZATION_STATE=\[\[\[(-?\d+(?:\.\d+)?),(-?\d+\.\d+),(-?\d+\.\d+)\]", texto or "")
    if m and abs(float(m.group(3))) < 90 and abs(float(m.group(2))) < 180:
        return m.group(3), m.group(2)
    return None


def abrir_enlace_directo(ident, u):
    """Sigue los saltos de un enlace corto de Maps y dice qué contestó Google en cada uno. Devuelve el texto de `q=` del
    lugar (nombre y dirección), si vino."""
    abrir = _rq.build_opener(_SinSeguir)
    cur = u
    texto = ""
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
            # (07/10) Ni la página final trae el pin: Google no lo manda a un programa. Por eso, abajo, la dirección de `q=`.
            return texto
        except _er.HTTPError as e:
            loc = e.headers.get("Location") if e.headers else None
            if e.code in (301, 302, 303, 307, 308) and loc:
                cur = loc if loc.startswith("http") else re.sub(r"^(https?://[^/]+).*$", r"\1", cur) + loc
                c = _coords_en(cur)
                destino = re.sub(r"^https?://([^/?#]+)(/[^?#]{0,40}).*$", r"\1\2", cur)
                print(f"   {ident}: salto {salto} → {e.code} a {destino}" + (f" · coordenadas {c[0]}, {c[1]}" if c else ""))
                mq = re.search(r"[?&]q=([^&]+)", cur)
                if mq and not texto:
                    try:
                        import urllib.parse as _up
                        texto = _up.unquote_plus(mq.group(1))
                    except Exception:
                        pass
                if c:
                    return texto
                continue
            print(f"   {ident}: salto {salto} → HTTP {e.code}")
            return texto
        except Exception as ex:
            print(f"   {ident}: salto {salto} → {type(ex).__name__}: {str(ex)[:120]}")
            return texto
    return texto


# 📍 (15/10, §4ln) Los enlaces que pegan las vendedoras y el panel NO resuelve. El dueño: «son las vendedoras que publican la
#    ubicación y no resolvés el enlace, eso quiero resolver». Lo mismo que lee la página (`coordsDeLink`, con Waze y el Plus Code
#    sin codificar) y, lo que no, por TIPO: enlace corto, búsqueda de Google (con nombre o solo `kgmid`), Maps con `q=`/`ftid`…
#    Después se prueba: (1) el servidor como hoy (`geocode`), (2) desde acá, abrir el `kgmid` en Maps, (3) el texto de `q=` (nombre
#    y dirección del lugar) al geocodificador del servidor. ⚠️ Registro PÚBLICO: solo CUENTAS por tipo y método; nunca el enlace, el
#    nombre del lugar, la dirección ni las coordenadas.
def _lee_la_pagina(u):
    """¿La página saca la ubicación de este enlace sin internet? (como `coordsDeLink` de pedidos.html, §4ln incluido)"""
    from urllib.parse import unquote_plus
    if _coords_en(u):
        return True
    d = unquote_plus(u)
    if re.search(r"(-?\d+\.\d+)(?:%2C|,)(?:\s|%20|\+)*(-?\d+\.\d+)", u, re.I) and re.search(r"[?&](?:q|query|ll|sll|daddr|saddr|destination|center)=", u):
        return True
    if re.search(r"\d+\s*°", d):
        return True
    for t in (d, u):
        m = re.search(r"(^|[^0-9A-Za-z+])([23456789CFGHJMPQRVWXcfghjmpqrvwx]{4,8})\+([23456789CFGHJMPQRVWXcfghjmpqrvwx]{2,3})(?![0-9A-Za-z+])", t)
        if m and len(m.group(2)) % 2 == 0:
            return True
    return False


def _tipo_enlace(u):
    from urllib.parse import urlparse, parse_qs
    if re.search(r"maps\.app\.goo\.gl|goo\.gl/maps", u):
        return "enlace corto de Maps"
    if re.search(r"waze\.com", u):
        return "Waze"
    try:
        q = parse_qs(urlparse(u).query)
    except Exception:
        q = {}
    if re.search(r"google\.[a-z.]+/search", u):
        return "búsqueda de Google con el nombre" if (q.get("q") and q["q"][0].strip()) else "búsqueda de Google SOLO con kgmid"
    if re.search(r"google\.[a-z.]+/maps|maps\.google\.", u):
        if "/place/" in u:
            return "Maps /place/ sin coordenadas"
        if q.get("q"):
            return "Maps ?q=texto" + (" + ftid" if q.get("ftid") else "")
        if q.get("cid") or q.get("ftid"):
            return "Maps con cid/ftid"
        return "Maps, otro"
    if not re.match(r"https?://", u, re.I):
        return "texto (no es un enlace)"
    return "otro sitio"


def _q_de(u):
    from urllib.parse import urlparse, parse_qs
    try:
        q = parse_qs(urlparse(u).query).get("q")
        return q[0].strip() if q else ""
    except Exception:
        return ""


def _kgmid_de(u):
    from urllib.parse import unquote
    m = re.search(r"[?&]kgmid=([^&#]+)", u)
    return unquote(m.group(1)) if m else ""


def _abrir_maps(url):
    """Abre una dirección de Maps como un navegador, siguiendo los saltos. Devuelve (url final, cuerpo) — no imprime nada."""
    abrir = _rq.build_opener(_SinSeguir)
    cur, cuerpo = url, ""
    for _ in range(6):
        req = _rq.Request(cur, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
                                                       "Chrome/124.0 Safari/537.36", "Accept-Language": "es-BO,es;q=0.9"})
        try:
            r = abrir.open(req, timeout=30)
            cuerpo = r.read().decode("utf-8", "replace")
            return cur, cuerpo
        except _er.HTTPError as e:
            loc = e.headers.get("Location") if e.headers else None
            if e.code in (301, 302, 303, 307, 308) and loc:
                cur = loc if loc.startswith("http") else re.sub(r"^(https?://[^/]+).*$", r"\1", cur) + loc
                continue
            return cur, ""
        except Exception:
            return cur, ""
    return cur, cuerpo


def _coords_cuerpo_maps(cuerpo):
    """La página de un lugar de Maps: la imagen de vista previa trae el centro (`staticmap?center=LAT%2CLNG`), y la página abre
       centrada en el lugar (`APP_INITIALIZATION_STATE`)."""
    m = re.search(r"staticmap\?center=(-?\d+\.\d+)(?:%2C|,)(-?\d+\.\d+)", cuerpo or "")
    if m:
        return "staticmap"
    if _coords_en(cuerpo):
        return "en la página"
    return ""


def enlaces_sin_resolver(base):
    print("\n── 📍 los enlaces de ubicación que el panel NO lee solo: de qué tipo son y qué los resuelve (solo cuentas) ──")
    ped = _PEDIDOS
    if not isinstance(ped, list):
        print("   (no hay lista leída)")
        return
    hoy = datetime.now(BO).date()
    desde = (hoy - timedelta(days=60)).isoformat()
    tot = lee = 0
    pend = []
    for p in ped:
        if not isinstance(p, dict) or not _sale_en_camion(p):
            continue
        if str(p.get("fecha") or "") < desde:
            continue
        u = str(p.get("maps") or "").strip()
        if not u:
            continue
        tot += 1
        if _lee_la_pagina(u):
            lee += 1
            continue
        pend.append(u)
    tipos = {}
    for u in pend:
        tipos.setdefault(_tipo_enlace(u), []).append(u)
    print(f"   pedidos con enlace (entrega desde el {desde}): {tot} · la página los lee sola: {lee} · NO: {len(pend)}")
    for t, L in sorted(tipos.items(), key=lambda x: -len(x[1])):
        print(f"   · {t}: {len(L)}")
    if not pend:
        return
    # 1) el servidor, como hoy (lo que abre queda en su hoja «Geo» y el panel lo usa)
    resuelve = {}
    unicos = list(dict.fromkeys(pend))[:80]
    for i in range(0, len(unicos), 20):
        lote = unicos[i:i + 20]
        crudo = pedir(f"el servidor intenta {len(lote)} enlace(s) (lote {i // 20 + 1})", base, {"action": "geocode", "links": lote})
        try:
            j = json.loads((crudo or b"{}").decode("utf-8", "replace"))
        except Exception:
            continue
        for g in j.get("geo") or []:
            if isinstance(g, dict) and g.get("lat") is not None:
                resuelve[g.get("link")] = "aprox" if g.get("aprox") else "exacto"
    print("   ── lo que resuelve el servidor HOY, por tipo ──")
    for t, L in sorted(tipos.items(), key=lambda x: -len(x[1])):
        L2 = [u for u in dict.fromkeys(L) if u in unicos]
        ok = [u for u in L2 if u in resuelve]
        print(f"   · {t}: {len(ok)} de {len(L2)}" + (f" ({sum(1 for u in ok if resuelve[u] == 'aprox')} por la dirección, aproximados)" if ok else ""))
    falta = [u for u in unicos if u not in resuelve]
    if not falta:
        return
    # 2) búsqueda de Google SOLO con kgmid: ¿Maps abre ese lugar? (desde acá; el servidor lo haría igual con UrlFetchApp)
    kg = [u for u in falta if _kgmid_de(u)]
    if kg:
        r = {"coords en la dirección": 0, "staticmap": 0, "en la página": 0, "trae q= (nombre)": 0, "nada": 0}
        for u in kg[:15]:
            fin, cuerpo = _abrir_maps("https://www.google.com/maps?kgmid=" + _kgmid_de(u) + "&hl=es")
            if _coords_en(fin):
                r["coords en la dirección"] += 1
            elif _coords_cuerpo_maps(cuerpo):
                r[_coords_cuerpo_maps(cuerpo)] += 1
            elif _q_de(fin):
                r["trae q= (nombre)"] += 1
            else:
                r["nada"] += 1
        print(f"   ── abrir el kgmid en Maps (desde GitHub, {min(15, len(kg))} de {len(kg)}) ──")
        print("   " + " · ".join(f"{k}: {n}" for k, n in r.items()))
    # 3) el texto de q= (nombre y dirección del lugar) al geocodificador del servidor
    textos = {}
    for u in falta:
        t = _q_de(u)
        if not t and re.search(r"maps\.app\.goo\.gl|goo\.gl/maps", u):
            fin, _c = _abrir_maps(u)
            t = _q_de(fin)
        if t and len(t) >= 8 and not re.match(r"https?://", t):
            textos[u] = t
    if textos:
        L = list(dict.fromkeys(textos.values()))[:40]
        crudo = pedir(f"el servidor busca {len(L)} nombre(s)/dirección(es) sacados de q=", base, {"action": "geocode", "links": L})
        try:
            j = json.loads((crudo or b"{}").decode("utf-8", "replace"))
            ok = sum(1 for g in j.get("geo") or [] if isinstance(g, dict) and g.get("lat") is not None)
            print(f"   ── por el texto de q=: el servidor ubicó {ok} de {len(L)} (aproximados: el lugar, no la puerta) ──")
        except Exception:
            print("   (el servidor no contestó JSON)")
    sin_nada = [u for u in falta if u not in textos and not _kgmid_de(u)]
    print(f"   sin coordenadas, sin nombre y sin kgmid: {len(sin_nada)} (esos solo los arregla quien cargó el pedido)")


# 🤖 (15/10) EL BOT CON CLAUDE. El dueño: «después revisás cómo va el bot inteligente». Lo que contestaron los clientes en los
#    últimos 7 días (`waRespuestas`, la hoja «Bot WhatsApp») y qué hizo Claude con cada mensaje (columna M). ⚠️ Registro PÚBLICO:
#    solo cuentas, horas y categorías; nunca el número, el nombre, el mensaje ni la respuesta.
def bot_ia(base):
    print("\n── 🤖 el bot con Claude: los mensajes de clientes de los últimos 7 días (solo cuentas) ──")
    crudo = pedir("lo que contestaron los clientes (waRespuestas)", base, {"action": "waRespuestas"})
    try:
        j = json.loads((crudo or b"{}").decode("utf-8", "replace"))
    except Exception:
        print("   no es JSON")
        return
    R = [x for x in (j.get("resp") or []) if isinstance(x, dict)]
    if not R:
        print(f"   ninguno (versión {j.get('version')!r})")
        return
    ahora = datetime.now(BO)
    por_dia = {}
    cats, saltos = {}, {}
    ult = {"msg": 0, "contesto": 0}
    esperando = []
    for x in R:
        ms = x.get("ms") or 0
        dia = datetime.fromtimestamp(ms / 1000, BO).strftime("%d/%m") if ms else "?"
        ia = str(x.get("ia") or "")
        if ia.startswith("—"):
            k = "reacción (no se contesta)"
        elif not ia:
            k = "sin Claude (la automática)"
        elif ia.startswith("⏳"):
            k = "esperando a Claude"
            esperando.append(ms)
        elif ia.startswith("🤖 contestó") or ia.startswith("🤖 ya contestado"):
            k = "Claude contestó"
            ult["contesto"] = max(ult["contesto"], ms)
        elif ia.startswith("🤖 no hacía falta"):
            k = "no hacía falta contestar"
        elif ia.startswith("⏭️"):
            k = "salteado (salió la automática)"
            m = re.sub(r"\d+", "N", ia[2:].strip())[:60]
            saltos[m] = saltos.get(m, 0) + 1
        elif ia.startswith("❌"):
            k = "❌ no se pudo mandar"
        else:
            k = "otro"
        d = por_dia.setdefault(dia, {})
        d[k] = d.get(k, 0) + 1
        if x.get("urg"):
            d["🚨 urgentes"] = d.get("🚨 urgentes", 0) + 1
        if x.get("at"):
            d["✓ atendidos"] = d.get("✓ atendidos", 0) + 1
        if x.get("cat"):
            cats[x["cat"]] = cats.get(x["cat"], 0) + 1
        ult["msg"] = max(ult["msg"], ms)
    print(f"   {len(R)} mensaje(s) · servidor {j.get('version')!r} · el último a las {_hora_bo(ult['msg'])}" +
          (f" · Claude contestó por última vez uno de las {_hora_bo(ult['contesto'])}" if ult["contesto"] else " · ⚠️ Claude no contestó ninguno"))
    for dia in sorted(por_dia, key=lambda s: (s[3:], s[:2])):
        print(f"   {dia}: " + " · ".join(f"{k} {n}" for k, n in sorted(por_dia[dia].items())))
    if cats:
        print("   qué querían (lo que dijo Claude): " + " · ".join(f"{k} {n}" for k, n in sorted(cats.items(), key=lambda x: -x[1])))
    if saltos:
        print("   por qué se salteó: " + " · ".join(f"{k} {n}" for k, n in sorted(saltos.items(), key=lambda x: -x[1])))
    if esperando:
        viejo = round((ahora.timestamp() * 1000 - min(esperando)) / 60000)
        print(f"   ⏳ esperando a Claude: {len(esperando)} · el más viejo hace {viejo} min" + (" ⚠️ (el repaso no corre)" if viejo > 15 else ""))


def _atc_de(p):
    pr = p.get("productos") or []
    if isinstance(pr, str):
        try:
            pr = json.loads(pr)
        except Exception:
            pr = []
    for x in pr if isinstance(pr, list) else []:
        if isinstance(x, dict) and isinstance(x.get("atc"), dict):
            return x["atc"]
    return None


def atc_del_panel():
    """🎧 (15/10) Las ATC de la planilla: cuántas tienen motivo, fecha de compra y detalle, cuántas se completaron desde Trello
    (`tre`) y con cuántas cruzaría «🔗 Completar con Trello» por el celular. Solo cuentas: este registro es público."""
    print("\n── 🎧 las ATC del panel y lo de Trello (solo cuentas) ──")
    j = _LISTA
    if not j:
        print("   (no hubo una lectura buena de la planilla)")
        return
    atcs = [p for p in (j.get("pedidos") or []) if isinstance(p, dict) and re.match(r"^ATC\b", str(p.get("oc") or "").strip(), re.I)]
    def entro(p):
        t = float(p.get("ts") or 0)
        return datetime.fromtimestamp(t / 1000, BO).date().isoformat() if t else str(p.get("fecha") or "")[:10]
    por = {}
    tot = {"n": 0, "mot": 0, "fcom": 0, "det": 0, "tre": 0, "sin_datos": 0}
    for p in atcs:
        a = _atc_de(p) or {}
        m = entro(p)[:7] or "(sin fecha)"
        c = por.setdefault(m, {"n": 0, "mot": 0, "fcom": 0, "det": 0, "tre": 0})
        for d in (c, tot):
            d["n"] += 1
            d["mot"] += 1 if a.get("mot") else 0
            d["fcom"] += 1 if a.get("fcom") else 0
            d["det"] += 1 if str(a.get("det") or "").strip() else 0
            d["tre"] += 1 if str(a.get("tre") or "").startswith("https://trello.com/") else 0
        if not _atc_de(p):
            tot["sin_datos"] += 1
    print(f"   ATC en la planilla: {tot['n']} · con motivo {tot['mot']} · con fecha de compra {tot['fcom']} · con detalle {tot['det']} · "
          f"guardadas desde «Completar con Trello» {tot['tre']}" + (f" · sin el bloque de datos de ATC {tot['sin_datos']}" if tot["sin_datos"] else ""))
    # (15/10) las TRAÍDAS de Trello con «📥 Traer al panel» (id atc-tre-<tarjeta>): cuántas y cómo quedaron
    tra = [p for p in atcs if str(p.get("id") or "").startswith("atc-tre-")]
    if tra:
        est = {}
        for p in tra:
            a = _atc_de(p) or {}
            e = "cerrada" if a.get("ent") else ("lista" if a.get("dev") else ("fábrica" if p.get("entregado") else "por recoger"))
            est[e] = est.get(e, 0) + 1
        ej = sum(1 for p in tra if "EJEMPLO" in str(p.get("cliente") or "").upper())
        print(f"   📥 traídas de Trello: {len(tra)} · " + " · ".join(f"{k} {v}" for k, v in sorted(est.items())) +
              f" · con fecha de compra {sum(1 for p in tra if (_atc_de(p) or {}).get('fcom'))}" +
              f" · la de ejemplo {ej} · archivadas en Trello {sum(1 for p in tra if 'archivada' in str(p.get('observaciones') or ''))}" +
              f" · la más vieja guardada {min(datetime.fromtimestamp(float(p.get('ts') or 0) / 1000, BO).date().isoformat() for p in tra)}")
    else:
        print("   📥 traídas de Trello: ninguna todavía")
    for m in sorted(por)[-6:]:
        c = por[m]
        print(f"   · entraron en {m}: {c['n']} · motivo {c['mot']} · fecha de compra {c['fcom']} · detalle {c['det']} · desde Trello {c['tre']}")
    # el cruce por celular contra el respaldo de Trello (el CSV y lo leído de los adjuntos, los dos al lado de la página)
    cels_t = set()
    try:
        import csv as _csv
        aqui = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
        for r in _csv.DictReader(open(os.path.join(aqui, "atc-semanal.csv"), encoding="utf-8-sig")):
            for mm in re.finditer(r"(?:^|[^0-9])((?:\+?591[\s.-]?)?[67](?:[\s.-]?\d){7})(?![\s.-]?\d)", (r.get("Tarjeta") or "") + " | " + (r.get("Descripcion") or "")):
                cels_t.add(re.sub(r"\D", "", mm.group(1))[-8:])
        adj = os.path.join(aqui, "atc-trello-adjuntos.json")
        if os.path.exists(adj):
            for t in json.load(open(adj, encoding="utf-8")).get("tarjetas", []):
                cels_t.update(str(c)[-8:] for c in t.get("cels", []))
    except Exception as ex:
        print(f"   (no pude leer el respaldo de Trello: {type(ex).__name__})")
    def cel8(p):
        d = re.sub(r"\D", "", str(p.get("celular") or ""))
        mm = re.search(r"(?:591)?([67]\d{7})$", d)
        return mm.group(1) if mm else ""
    falta = [p for p in atcs if not ((_atc_de(p) or {}).get("mot") and (_atc_de(p) or {}).get("fcom") and str((_atc_de(p) or {}).get("det") or "").strip())]
    cruzan = [p for p in falta if cel8(p) and cel8(p) in cels_t]
    print(f"   les falta algo (motivo, fecha o detalle): {len(falta)} · de esas, con una tarjeta de Trello del mismo celular: {len(cruzan)} · "
          f"sin celular en el panel: {len([p for p in falta if not cel8(p)])}")
    # (15/10) solo la FECHA DE COMPRA: de las que no la tienen, cuántas la podrían sacar de Trello (por celular o por nombre)
    try:
        import csv as _csv, unicodedata as _ud
        def may(s):
            return "".join(c for c in _ud.normalize("NFD", str(s or "")) if _ud.category(c) != "Mn").upper()
        NO = set("ATC ARC CLIENTE MIRIAN ISABEL CAROLA NORMA ROHO LATEX XLSX DEL LOS LAS SRA COLCHON SOMIER TIENDA PLZ POR GARANTIA "
                 "REPARACION CAMBIO HUNDIMIENTO ORTOPEDICO NUEVO COTIZAR CON PARA MARIA FECHA TELEFONO DIRECCION".split())
        def palabras(s):
            return {w for w in re.sub(r"[^A-ZÑ ]", " ", may(s)).split() if len(w) >= 3 and w not in NO}
        PAL = r"(?:FECHA DE COMPRA|FECHA COMPRA|COMPRAD[OA]|COMPRO|COMPRA|SE VENDIO|VENDID[OA])[^0-9A-Z]{0,4}(?:(?:EL|DEL|EN|EN EL|EN FECHA)\s+)?[:\s-]*(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})"
        adjs = {}
        if os.path.exists(adj):
            for t in json.load(open(adj, encoding="utf-8")).get("tarjetas", []):
                adjs[t.get("sl")] = t
        tarj = []
        for r in _csv.DictReader(open(os.path.join(aqui, "atc-semanal.csv"), encoding="utf-8-sig")):
            todo = (r.get("Tarjeta") or "") + " | " + (r.get("Descripcion") or "")
            sl = (re.search(r"/c/([A-Za-z0-9]+)", r.get("URL") or "") or [None, ""])[1]
            a = adjs.get(sl) or {}
            cs = {re.sub(r"\D", "", m.group(1))[-8:] for m in re.finditer(r"(?:^|[^0-9])((?:\+?591[\s.-]?)?[67](?:[\s.-]?\d){7})(?![\s.-]?\d)", todo)}
            cs.update(str(c)[-8:] for c in a.get("cels", []))
            tiene = bool(re.search(PAL, re.sub(r"[\t ]+", " ", may(todo)))) or bool(a.get("fcom"))
            tarj.append({"cels": cs, "nom": palabras(r.get("Tarjeta") or "") | palabras(a.get("cliente") or ""), "f": tiene})
        sin = [p for p in atcs if not (_atc_de(p) or {}).get("fcom")]
        c = {"cel_f": 0, "cel_sin": 0, "nom_f": 0, "nom_sin": 0, "nada": 0}
        for p in sin:
            ce, nm = cel8(p), palabras(p.get("cliente") or "")
            porcel = [t for t in tarj if ce and ce in t["cels"]]
            pornom = [t for t in tarj if len(nm & t["nom"]) >= 2]
            if porcel:
                c["cel_f" if any(t["f"] for t in porcel) else "cel_sin"] += 1
            elif pornom:
                c["nom_f" if any(t["f"] for t in pornom) else "nom_sin"] += 1
            else:
                c["nada"] += 1
        print(f"   SIN fecha de compra en el panel: {len(sin)} → con tarjeta del mismo celular que trae la fecha {c['cel_f']} · "
              f"del mismo celular pero sin fecha {c['cel_sin']} · solo por el nombre, con fecha {c['nom_f']} · solo por el nombre, sin fecha "
              f"{c['nom_sin']} · sin tarjeta en Trello {c['nada']}")
        print(f"   tarjetas de Trello con la fecha de compra: {sum(1 for t in tarj if t['f'])} de {len(tarj)}")
        # (15/10, dueño: «24 sin fecha de compra? en el Trello creo que todas están con fecha») — renglón por renglón, SIN nombres:
        # el N° solo si tiene la forma «ATC MM-NNN» (los títulos copiados de Trello llevan el nombre del cliente).
        listas = []
        for r in _csv.DictReader(open(os.path.join(aqui, "atc-semanal.csv"), encoding="utf-8-sig")):
            listas.append(((r.get("Lista") or "").strip(), (r.get("Archivada") or "").strip()))
        def cruce(p):
            ce, nm = cel8(p), palabras(p.get("cliente") or "")
            porcel = [i for i, t in enumerate(tarj) if ce and ce in t["cels"]]
            if porcel:
                return "cel", porcel
            n2 = [i for i, t in enumerate(tarj) if len(nm & t["nom"]) >= 2]
            if n2:
                return "nom2", n2
            n1 = [i for i, t in enumerate(tarj) if nm & t["nom"]]
            return ("nom1", n1) if n1 else ("", [])
        print("   las que NO tienen fecha de compra, una por una (sin nombres):")
        for p in sorted(sin, key=entro):
            oc = str(p.get("oc") or "").strip()
            oc = oc if re.match(r"^ATC\s*\d{2}-\d{3}$", oc, re.I) else "(N° con otro formato)"
            como, cuales = cruce(p)
            pal = len(palabras(p.get("cliente") or ""))
            det = (f"tarjeta por {'celular' if como == 'cel' else ('2+ palabras del nombre' if como == 'nom2' else '1 palabra del nombre')}: {len(cuales)}"
                   f" · con fecha {sum(1 for i in cuales if tarj[i]['f'])} · listas {sorted({listas[i][0] for i in cuales})}") if como else "ninguna tarjeta parecida"
            print(f"     · {oc} · entró {entro(p)} · celular {'sí' if cel8(p) else 'NO'} · palabras del nombre {pal} · {det}")
        # y al revés: qué tarjetas de Trello no tienen su ATC en el panel
        usadas = set()
        for p in atcs:
            como, cuales = cruce(p)
            if como in ("cel", "nom2"):
                usadas.update(cuales)
        por_l = {}
        for i, t in enumerate(tarj):
            l = listas[i][0] + (" (archivada)" if listas[i][1].lower().startswith("s") else "")
            d = por_l.setdefault(l, {"n": 0, "en_panel": 0, "fuera": 0, "fuera_con_fecha": 0})
            d["n"] += 1
            if i in usadas:
                d["en_panel"] += 1
            else:
                d["fuera"] += 1
                d["fuera_con_fecha"] += 1 if t["f"] else 0
        print(f"   tarjetas de Trello SIN su ATC en el panel: {len(tarj) - len(usadas)} de {len(tarj)} (por celular o 2+ palabras del nombre)")
        for l in sorted(por_l, key=lambda k: -por_l[k]["n"]):
            d = por_l[l]
            print(f"     · {l}: {d['n']} · en el panel {d['en_panel']} · no están {d['fuera']} (con fecha de compra {d['fuera_con_fecha']})")
    except Exception as ex:
        print(f"   (no pude cruzar las fechas con Trello: {type(ex).__name__}: {str(ex)[:80]})")


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
    # 4b) 🛰️ (13/10) El GPS de hoy y las entregas marcadas, con la primera lectura buena.
    gps_del_dia()
    # 4c) 🎧 (15/10) Las ATC: qué tienen y cuántas se completaron desde Trello.
    atc_del_panel()
    # 5) 📍 (§4ht) Dónde quedan los almacenes de salida, y cuántas entregas se pueden ubicar.
    ubicacion_almacenes(pagina or PANEL_URL)
    ubicacion_pedidos(pagina or PANEL_URL)
    # 6) 🤖 (15/10) el bot con Claude y 📍 los enlaces que el panel no resuelve.
    bot_ia(pagina or PANEL_URL)
    enlaces_sin_resolver(pagina or PANEL_URL)


if __name__ == "__main__":
    main()
