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
    # 3) La puerta GET (doGet), la misma dirección sin cuerpo.
    contar(pedir("puerta GET (doGet) de la página", pagina or PANEL_URL))
    # 4) Dónde se va el tiempo: correr el script o entregar los datos.
    en_dos_tramos(pagina or PANEL_URL)


if __name__ == "__main__":
    main()
