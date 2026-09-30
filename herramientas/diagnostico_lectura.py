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


if __name__ == "__main__":
    main()
