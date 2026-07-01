"""
generar_reporte_atc_bundle.py
Regenera reporte-atc-20260522.html (el bundle React con vista Kanban y análisis)
inyectando datos FRESCOS del tablero Trello ATC, sin alterar el diseño.

Cómo funciona:
  - Lee la plantilla pristina `reporte-atc-template.html` (el bundle original).
  - Descomprime el asset de datos (655a879d) del manifest __bundler.
  - Reemplaza el array `window.TRELLO_DATA = [...]` por las tarjetas actuales
    de Trello, mapeadas al mismo esquema enriquecido que espera el diseño.
  - Recomprime el asset (gzip+base64), reescribe el manifest y guarda el HTML.

El resto del bundle (React, componentes, vista Kanban, fuentes) queda intacto.
"""
import os, re, json, base64, gzip, datetime, urllib.request, urllib.parse

KEY   = os.environ["TRELLO_API_KEY"]
TOKEN = os.environ["TRELLO_TOKEN"]
BOARD = os.environ.get("TRELLO_BOARD_ID", "cFbJp9DO")
API   = "https://api.trello.com/1"

TEMPLATE = os.environ.get("ATC_BUNDLE_TEMPLATE", "reporte-atc-template.html")
OUTPUT   = os.environ.get("ATC_BUNDLE_OUTPUT", "reporte-atc-20260522.html")
DATA_ASSET   = "655a879d-04b8-41dc-ae96-98eccd1d89cd"  # window.TRELLO_DATA / _META
STAGES_ASSET = "c8e379b4-c341-40f0-81eb-1fd7a8b72129"  # LIST_ORDER / LIST_DOT_COLOR
ETAPAS_ASSET = "6d573ff7-3eb1-4cdc-8505-806c95ba6b61"  # "N etapas"

# Colores originales por etapa + reserva para listas nuevas del tablero.
STAGE_COLORS = {
    "Solicitadas": "#D89534",
    "Programadas recojo": "#C99668",
    "En producción": "#B85B3E",
    "Listas devolver": "#6B8E5A",
    "Post venta": "#8E837A",
}
FALLBACK_COLORS = ["#3B9ECB", "#7C6BA8", "#4A9E88", "#A85B7A", "#B8863E", "#6B7A8E"]

# ── Trello ─────────────────────────────────────────────────────────────────
def get(path, extra=None):
    p = {"key": KEY, "token": TOKEN}
    if extra: p.update(extra)
    url = API + path + "?" + urllib.parse.urlencode(p)
    with urllib.request.urlopen(urllib.request.Request(url)) as r:
        return json.loads(r.read().decode())

def fetch():
    lists = get(f"/boards/{BOARD}/lists", {"fields": "id,name,pos", "filter": "open"})
    lists = sorted(lists, key=lambda l: l.get("pos", 0))
    cards = get(f"/boards/{BOARD}/cards", {
        "fields": "id,name,desc,idList,labels,due,dueComplete,url,closed",
        "filter": "all",
    })
    return lists, cards

# ── Taxonomía / clasificadores (reproducen el esquema del bundle) ──────────
LISTA_CORTA = {
    "ATC SOLICITADAS COM":            "Solicitadas",
    "ATC PROGRAMADAS PARA RECOJO LOG":"Programadas recojo",
    "ATC EN PRODUCCION":              "En producción",
    "ATC LISTAS PARA DEVOLVER PROD":  "Listas devolver",
    "ATC DEVUELTAS LOG":              "Devueltas",
    "POST VENT (COMERCIAL)":          "Post venta",
}

# El orden importa: primero los nombres compuestos / más específicos.
VENDEDORAS = [
    "MARIA ISABEL", "TIENDA AMIGA", "MIRIAN", "ISABEL", "CAROLA",
    "NORMA", "MORENO", "CHARCAS", "ROHO", "MARIA",
]

PRODUCTOS = [  # (etiqueta, [keywords en MAYÚSCULAS])
    ("Oro",     ["ORO"]),
    ("Titanio", ["TITANIO"]),
    ("Plata",   ["PLATA"]),
    ("Bahía",   ["BAHIA", "BAHÍA"]),
    ("Roho",    ["ROHO"]),
    ("Heaven",  ["HEAVEN"]),
    ("Sómier",  ["SOMIER", "SÓMIER"]),
    ("Especial",["ESPECIAL", "PERSONALIZAD"]),
]

PROBLEMAS = [  # (etiqueta, [keywords])
    ("Hundimiento",          ["UNDIDO", "HUNDIMIENTO", "HUNDE", "HUNDID"]),
    ("Resortes",             ["RESORTE"]),
    ("Retapizado / costura", ["RETAPIZ", "DESCOSTURAD", "RIBETE", "COSTURA"]),
    ("Ruido",                ["RUIDO", "SUENA", "SONIDO"]),
    ("Patas",                ["PATA"]),
    ("Tela / pillow",        ["PILLOW", "TELA", "FUNDA"]),
    ("Cambio",               ["CAMBIO", "CAMBIAR"]),
    ("Cotización",           ["COTIZ"]),
]

def lista_corta(nombre):
    if nombre in LISTA_CORTA:
        return LISTA_CORTA[nombre]
    n = nombre.upper().replace("ATC", "").strip().title()
    return n or nombre

def vendedora_de(texto):
    t = texto.upper()
    for v in VENDEDORAS:
        if v in t:
            return v
    return "Sin asignar"

def producto_de(texto):
    t = texto.upper()
    for etiqueta, kws in PRODUCTOS:
        if any(k in t for k in kws):
            return etiqueta
    return "Sin clasificar"

def problemas_de(texto):
    t = texto.upper()
    encontrados = [etq for etq, kws in PROBLEMAS if any(k in t for k in kws)]
    return encontrados or ["Otro"]

def garantia_de(texto):
    t = texto.upper()
    if "SIN GARANTIA" in t or "SIN GARANTÍA" in t or "NO CUBRE" in t:
        return "Sin garantía"
    if "CON GARANTIA" in t or "CON GARANTÍA" in t or "GARANTIA" in t or "GARANTÍA" in t:
        return "Con garantía"
    return "No especificado"

def plazas_de(texto):
    m = re.search(r'(\d)[.,](\d)\s*(?:plz|plazas?)', texto, re.I)
    if m:
        return f"{m.group(1)}.{m.group(2)} plz"
    m = re.search(r'(\d)\s*(?:plz|plazas?)', texto, re.I)
    if m:
        return f"{m.group(1)} plz"
    return ""

def medida_de(texto):
    m = re.search(r'(\d{2,3})\s*[xX]\s*(\d{2,3})', texto)
    return f"{m.group(1)}x{m.group(2)}" if m else ""

def telefono_de(texto):
    m = re.search(r'(?:TEL|CEL|CELULAR|CONTACTO)[:\s.]*'
                  r'(\d[\d\s\-]{6,13}\d)', texto, re.I)
    if m:
        return m.group(1).strip()
    m = re.search(r'\b(\d{4}-\d{4}|\d{7,8})\b', texto)
    return m.group(1) if m else ""

def cliente_de(texto, tarjeta):
    m = re.search(r'CLIENTE[:\s]*([^|]+)', texto, re.I)
    if m:
        return m.group(1).strip().rstrip("-").strip()[:60]
    # a partir del nombre de la tarjeta: ATC-VENDOR-CLIENTE
    parts = re.split(r'[-–]', tarjeta)
    if len(parts) >= 3:
        return parts[-1].strip()[:60]
    return ""

def direccion_de(texto):
    m = re.search(r'(?:DIR|DIRECCION|DIRECCIÓN)[:\s.]*([^|]+)', texto, re.I)
    return m.group(1).strip()[:120] if m else ""

def estado_de(card):
    if card.get("dueComplete"): return "Completada"
    if card.get("closed"):      return "Archivada"
    return "Pendiente"

def es_urgente(card, texto):
    if any((lb.get("name", "") or "").upper().startswith("URGENTE")
           for lb in card.get("labels", [])):
        return True
    return "URGENTE" in texto.upper()

# ── Construir TRELLO_DATA ──────────────────────────────────────────────────
def build_data(lists, cards):
    list_map = {l["id"]: l["name"] for l in lists}
    registros = []
    for i, c in enumerate(cards, start=1):
        nombre = c.get("name", "")
        desc   = (c.get("desc", "") or "").strip().replace("\n", " | ")
        texto  = nombre + " | " + desc
        lista  = list_map.get(c.get("idList", ""), "")
        registros.append({
            "id": i,
            "tablero": "ATC",
            "lista": lista,
            "listaCorta": lista_corta(lista),
            "tarjeta": nombre,
            "descripcion": desc,
            "estado": estado_de(c),
            "completada": bool(c.get("dueComplete")),
            "archivada": bool(c.get("closed")),
            "url": c.get("url", ""),
            "cliente": cliente_de(texto, nombre),
            "telefono": telefono_de(texto),
            "direccion": direccion_de(texto),
            "producto": producto_de(texto),
            "problemas": problemas_de(texto),
            "vendedora": vendedora_de(texto),
            "garantia": garantia_de(texto),
            "medida": medida_de(texto),
            "plazas": plazas_de(texto),
            "urgente": es_urgente(c, texto),
        })
    return registros

def build_meta(lists, registros):
    list_map = {l["id"]: l["name"] for l in lists}
    listas_cortas = [lista_corta(list_map[l["id"]]) for l in lists]
    return {
        "totalTarjetas": len(registros),
        "generadoEn": datetime.date.today().isoformat(),
        "listas": listas_cortas,
    }

# ── Repack del bundle ──────────────────────────────────────────────────────
_OPEN = {"[": "]", "{": "}"}

def replace_window_assignment(js_src, name, new_literal):
    """Sustituye el literal de `window.<name> = [...]/{...}` por new_literal."""
    marker = "window." + name
    start = js_src.index(marker)
    # primer '[' o '{' tras la asignación
    open_i = start
    while js_src[open_i] not in "[{":
        open_i += 1
    open_ch = js_src[open_i]
    close_ch = _OPEN[open_ch]
    depth = 0
    end = None
    for k in range(open_i, len(js_src)):
        ch = js_src[k]
        if ch == open_ch:
            depth += 1
        elif ch == close_ch:
            depth -= 1
            if depth == 0:
                end = k
                break
    if end is None:
        raise RuntimeError(f"No se encontró el cierre de window.{name}")
    return js_src[:open_i] + new_literal + js_src[end + 1:]

def _decode_asset(asset):
    raw = base64.b64decode(asset["data"])
    return gzip.decompress(raw).decode("utf-8") if asset.get("compressed") \
           else raw.decode("utf-8")

def _repack_asset(asset, new_src):
    data = new_src.encode("utf-8")
    if asset.get("compressed"):
        data = gzip.compress(data, mtime=0)
    asset["data"] = base64.b64encode(data).decode("ascii")

def patch_stages(manifest, orden):
    """Sincroniza las etapas del diseño (Kanban/pipeline/filtros) con las listas
    reales del tablero, para que ninguna lista nueva quede oculta."""
    # 1) LIST_ORDER + LIST_DOT_COLOR (asset de componentes)
    a = manifest[STAGES_ASSET]
    src = _decode_asset(a)
    order_js = json.dumps(orden, ensure_ascii=False)
    src = re.sub(r"const LIST_ORDER = \[[^\]]*\];",
                 lambda _: f"const LIST_ORDER = {order_js};", src, count=1)
    fb = iter(FALLBACK_COLORS)
    pares = [f"'{st}': '{STAGE_COLORS.get(st) or next(fb, '#8E837A')}'" for st in orden]
    color_js = "const LIST_DOT_COLOR = {\n  " + ",\n  ".join(pares) + ",\n};"
    src = re.sub(r"const LIST_DOT_COLOR = \{[^}]*\};",
                 lambda _: color_js, src, count=1)
    _repack_asset(a, src)
    # 2) etiqueta "N etapas"
    b = manifest[ETAPAS_ASSET]
    src2 = _decode_asset(b).replace("5 etapas", f"{len(orden)} etapas", 1)
    _repack_asset(b, src2)

def main():
    print("Conectando a Trello…")
    lists, cards = fetch()
    print(f"  Listas: {len(lists)}  |  Tarjetas: {len(cards)}")

    registros = build_data(lists, cards)
    meta = build_meta(lists, registros)

    html = open(TEMPLATE, encoding="utf-8").read()
    m = re.search(r'(<script type="__bundler/manifest">\s*)(\{.*?\})(\s*</script>)',
                  html, re.S)
    if not m:
        raise RuntimeError("No se encontró el manifest __bundler en la plantilla")
    manifest = json.loads(m.group(2))

    asset = manifest[DATA_ASSET]
    js_src = _decode_asset(asset)
    js_new = replace_window_assignment(
        js_src, "TRELLO_DATA", json.dumps(registros, ensure_ascii=False, indent=2))
    js_new = replace_window_assignment(
        js_new, "TRELLO_META", json.dumps(meta, ensure_ascii=False, indent=2))
    _repack_asset(asset, js_new)

    # Sincronizar las etapas del diseño con las listas reales del tablero.
    patch_stages(manifest, meta["listas"])

    manifest_json = json.dumps(manifest, ensure_ascii=False)
    html_new = html[:m.start()] + m.group(1) + manifest_json + m.group(3) + html[m.end():]

    with open(OUTPUT, "w", encoding="utf-8") as f:
        f.write(html_new)
    print(f"{OUTPUT} regenerado — {len(registros)} tarjetas (diseño Kanban intacto)")

if __name__ == "__main__":
    main()
