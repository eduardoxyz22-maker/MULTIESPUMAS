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
        pedidos_en_feriados(ped)


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


if __name__ == "__main__":
    main()
