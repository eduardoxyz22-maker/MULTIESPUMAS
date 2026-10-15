"""
trello_adjuntos.py — lee los ADJUNTOS de las tarjetas del tablero ATC de Trello (§4lf-b, 15/10).

El dueño: «nuestro trello… la fecha de compra… eso en el trello está en fotos». El respaldo diario (`atc-semanal.csv`) trae solo el
texto de cada tarjeta; la fecha de compra muchas veces está en una FOTO (el formulario de ATC, la factura o la nota de venta) o en el
EXCEL del formato ATC adjunto. Esto:
  · baja de la API de Trello los adjuntos de cada tarjeta (también las archivadas);
  · los Excel (.xlsx) los lee directo, sin IA: «FECHA DE COMPRA», el teléfono, el cliente y el reclamo;
  · las fotos (jpg, png, webp, gif) y los PDF se los pasa a Claude para que lea lo mismo (solo lo que se lea con claridad);
  · deja `atc-trello-adjuntos.json` al lado de la página: el botón «🔗 Completar con Trello» del panel lo suma a lo del texto.
Cada adjunto se lee UNA vez: lo leído queda en el mismo JSON (`vistos`, por id del adjunto) y la corrida siguiente solo lee lo nuevo.

⚠️ El repositorio es PÚBLICO y el registro de GitHub también: acá no se imprime NINGÚN dato de clientes (solo cantidades y tipos de
   archivo). El JSON guarda lo mínimo (fecha de compra, celular, nombre, una frase del reclamo), lo mismo que ya publica el CSV.

Variables: TRELLO_API_KEY, TRELLO_TOKEN (las del reporte ATC), ANTHROPIC_API_KEY (sin ella, solo los Excel),
           TRELLO_BOARD_ID (cFbJp9DO), ATCT_SALIDA (atc-trello-adjuntos.json), ATCT_MAX_IA (300 lecturas con Claude por corrida),
           IA_MODELO (claude-opus-5-5).
"""
import os, sys, json, re, io, time, base64, zipfile, datetime, urllib.request, urllib.parse, urllib.error
import xml.etree.ElementTree as ET

API = "https://api.trello.com/1"
CLAUDE = "https://api.anthropic.com/v1/messages"
SALIDA = os.environ.get("ATCT_SALIDA", "atc-trello-adjuntos.json")
BOARD = os.environ.get("TRELLO_BOARD_ID", "cFbJp9DO")
MODELO = os.environ.get("IA_MODELO", "claude-opus-5-5")
MAX_IA = int(os.environ.get("ATCT_MAX_IA", "300") or 300)
MINUTOS = float(os.environ.get("ATCT_MINUTOS", "40") or 40)   # después de esto no se leen más fotos: lo que falta, la próxima corrida
MAX_BYTES = 4_800_000          # Claude acepta hasta 5 MB por imagen
PREGUNTA_V = 2                 # 2 (15/10): la pregunta nombra el CERTIFICADO DE GARANTÍA (la fecha de abajo es la de compra)
FOTOS = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif"}

# ──────────────────────────── fechas, celulares y textos (sin red: se prueban solos) ────────────────────────────
MESES = {"ENE": 1, "FEB": 2, "MAR": 3, "ABR": 4, "MAY": 5, "JUN": 6, "JUL": 7, "AGO": 8, "SEP": 9, "SET": 9, "OCT": 10, "NOV": 11, "DIC": 12}

def iso(d, m, y, hoy=None):
    """AAAA-MM-DD si la fecha existe y es razonable para una compra (2005 a hoy); si no, ''."""
    try:
        d, m, y = int(d), int(m), int(y)
        if y < 100: y += 2000
        f = datetime.date(y, m, d)
    except (ValueError, TypeError):
        return ""
    hoy = hoy or datetime.date.today()
    return f.isoformat() if datetime.date(2005, 1, 1) <= f <= hoy else ""

def serial_excel(n, hoy=None):
    """Una fecha que Excel guarda como número (días desde 30/12/1899)."""
    try:
        n = float(n)
    except (ValueError, TypeError):
        return ""
    if not 36000 <= n <= 60000:         # 2001 … 2064
        return ""
    f = datetime.date(1899, 12, 30) + datetime.timedelta(days=int(n))
    return iso(f.day, f.month, f.year, hoy)

def sin_tildes(t):
    t = str(t or "")
    for a, b in zip("ÁÉÍÓÚÜáéíóúü", "AEIOUUaeiouu"):
        t = t.replace(a, b)
    return t

def celulares(t):
    out = []
    for m in re.finditer(r"(?:^|[^0-9])((?:\+?591[\s.-]?)?[67](?:[\s.-]?\d){7})(?![\s.-]?\d)", str(t or "")):
        d = re.sub(r"\D", "", m.group(1))[-8:]
        if d not in out:
            out.append(d)
    return out

def fecha_de_texto(t, hoy=None):
    """La fecha de una celda o un texto: «13/09/2021», «13-09-21», un número de Excel o «16 de agosto de 2021»."""
    s = sin_tildes(t).upper().strip()
    if re.fullmatch(r"\d+(\.\d+)?", s):
        return serial_excel(s, hoy)
    m = re.search(r"(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)", s)      # AAAA-MM-DD antes: si no, «22-06-30» parecería día-mes-año
    if m:
        return iso(m.group(3), m.group(2), m.group(1), hoy)
    m = re.search(r"(?<!\d)(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})(?!\d)", s)
    if m:
        return iso(m.group(1), m.group(2), m.group(3), hoy)
    m = re.search(r"(\d{1,2})\s*(?:DE\s+)?([A-Z]{3})[A-Z]*\.?\s*(?:DE(?:L)?\s+)?(\d{4})", s)
    if m and m.group(2) in MESES:
        return iso(m.group(1), MESES[m.group(2)], m.group(3), hoy)
    return ""

# ──────────────────────────── Excel (.xlsx) sin librerías ────────────────────────────
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

def _col(ref):
    n = 0
    for ch in re.match(r"[A-Z]+", ref).group(0):
        n = n * 26 + ord(ch) - 64
    return n

def xlsx_filas(datos):
    """Las filas de la PRIMERA hoja como listas de textos (las celdas vacías no se guardan)."""
    return [[v for _, v in f] for f in xlsx_celdas(datos)]

def xlsx_celdas(datos):
    """Las filas de la PRIMERA hoja como listas de (columna, texto), sin las celdas vacías."""
    h = xlsx_hojas(datos)
    return h[0] if h else []

def xlsx_hojas(datos):
    """Todas las hojas (sheet1, sheet2… en ese orden), cada una como filas de (columna, texto)."""
    z = zipfile.ZipFile(io.BytesIO(datos))
    comp = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS):
            comp.append("".join(x.text or "" for x in si.iter("{%s}t" % NS["m"])))
    hojas = sorted((n for n in z.namelist() if re.fullmatch(r"xl/worksheets/sheet\d+\.xml", n)), key=lambda n: int(re.search(r"(\d+)\.xml$", n).group(1)))
    return [_hoja(z.read(h), comp) for h in hojas]

def _hoja(xml, comp):
    filas = []
    for row in ET.fromstring(xml).iter("{%s}row" % NS["m"]):
        celdas = []
        for c in row.findall("m:c", NS):
            t, v = c.get("t"), c.find("m:v", NS)
            if t == "s" and v is not None:
                val = comp[int(v.text)] if v.text and v.text.isdigit() and int(v.text) < len(comp) else ""
            elif t == "inlineStr":
                val = "".join(x.text or "" for x in c.iter("{%s}t" % NS["m"]))
            else:
                val = v.text if v is not None else ""
            val = str(val or "").strip()
            if val:
                celdas.append((_col(c.get("r") or "A1"), val))
        if celdas:
            filas.append(sorted(celdas))
    return filas

ROTULO_COMPRA = re.compile(r"FECHA\s*(DE\s*)?COMPRA|COMPRADO\s*EL|FECHA\s*DE\s*VENTA")

OTRO_ROTULO = re.compile(r"^(CLIENTE|FECHA|NRO|N°|TELEFONO|TELF|CELULAR|DIRECCION|VENDEDOR|ASESOR|CODIGO|FACTURA|NIT|PRODUCTO|LINEA|"
                         r"MEDIDA|DETALLE|DATOS|ZONA|SUCURSAL|TIENDA|OBSERVAC|C\.?I\b)")

def xlsx_datos(datos, hoy=None):
    """Del formato ATC en Excel: la fecha de compra (al lado del rótulo o debajo), los celulares, el cliente y el reclamo.
       `rot` dice cómo estaba el casillero de la fecha (para contar, sin datos): fecha / texto / vacio / sin (no hay rótulo)."""
    out = {"fcom": "", "fcomTxt": "", "cels": [], "cliente": "", "reclamo": "", "rot": "sin"}
    fx = []
    for celdas in xlsx_hojas(datos):
        _xlsx_hoja_datos(celdas, out, hoy)
        for f in celdas:                                   # para contar qué rótulos de fecha usan (sin datos: los números van como #)
            for _, v in f:
                u = re.sub(r"\d", "#", sin_tildes(v).upper().strip())
                if len(u) <= 40 and re.search(r"FECHA|COMPRA|FACTURA|NOTA DE VENTA|GARANTIA", u) and u not in fx and len(fx) < 12:
                    fx.append(u)
    out["fx"] = fx
    return out

def _xlsx_hoja_datos(celdas, out, hoy):
    filas = [[v for _, v in f] for f in celdas]
    reclamo_sig = False
    for r, f in enumerate(filas):
        up = [sin_tildes(x).upper() for x in f]
        for i, u in enumerate(up):
            if ROTULO_COMPRA.search(u) and not out["fcom"]:
                if out["rot"] == "sin":
                    out["rot"] = "vacio"
                col = celdas[r][i][0]
                cand = [u[ROTULO_COMPRA.search(u).end():]]
                for _, v in celdas[r][i + 1:i + 4]:            # a la derecha, hasta el próximo rótulo
                    if OTRO_ROTULO.match(sin_tildes(v).upper().strip()):
                        break
                    cand.append(v)
                abajo = celdas[r + 1] if r + 1 < len(celdas) else []
                if not any(c2 <= col + 2 and OTRO_ROTULO.match(sin_tildes(v).upper().strip()) for c2, v in abajo):
                    cand += [v for c2, v in abajo if col <= c2 <= col + 2][:2]      # o debajo (formato en columna), si abajo no empieza otro rótulo
                for c in cand:
                    fe = fecha_de_texto(c, hoy)
                    if fe:
                        out["fcom"], out["fcomTxt"], out["rot"] = fe, str(c).strip()[:40], "fecha"
                        break
                    if re.search(r"[0-9A-Za-z]", str(c)) and not out["fcomTxt"]:
                        out["fcomTxt"], out["rot"] = str(c).strip()[:40], "texto"
            if re.fullmatch(r"CLIENTE\s*:?", u) and i + 1 < len(f) and not out["cliente"]:
                out["cliente"] = f[i + 1][:60]
            if re.search(r"TELEFONO|CELULAR", u):
                for c in [u] + f[i + 1:i + 3]:
                    for d in celulares(c):
                        if d not in out["cels"]:
                            out["cels"].append(d)
            if re.search(r"DETALLES?\s+DEL\s+RECLAMO|DESCRIPCION\s+DEL\s+(PROBLEMA|RECLAMO)", u):
                txt = " ".join(f[i + 1:]).strip()
                if txt:
                    out["reclamo"] = txt[:220]
                else:
                    reclamo_sig = True
                continue
        if reclamo_sig and not out["reclamo"] and not any(re.search(r"DETALLES?\s+DEL\s+RECLAMO", u) for u in up):
            out["reclamo"] = " ".join(f).strip()[:220]
            reclamo_sig = False

# ──────────────────────────── Claude ────────────────────────────
ESQUEMA = {"type": "object", "additionalProperties": False,
           "properties": {"tipo": {"type": "string", "enum": ["formulario", "factura", "certificado", "foto_producto", "otro"]},
                          "fecha_compra": {"type": "string"}, "fecha_compra_texto": {"type": "string"},
                          "celular": {"type": "string"}, "cliente": {"type": "string"}, "reclamo": {"type": "string"}},
           "required": ["tipo", "fecha_compra", "fecha_compra_texto", "celular", "cliente", "reclamo"]}
PEDIDO = ("Es un archivo adjunto de un reclamo de atención al cliente (ATC) de una fábrica de colchones de Bolivia (Multiespumas / "
          "Heaven / Sueña). Puede ser el formulario de ATC, una factura o nota de venta, el CERTIFICADO DE GARANTÍA o una foto del colchón.\n"
          "Leé SOLO lo que se vea con claridad, sin inventar:\n"
          "- tipo: formulario, factura (o nota de venta), certificado (el «CERTIFICADO DE GARANTÍA»), foto_producto u otro.\n"
          "- fecha_compra: cuándo COMPRÓ el cliente el producto, como AAAA-MM-DD. En una factura o nota de venta es su fecha. En el "
          "CERTIFICADO DE GARANTÍA es la fecha escrita abajo, sobre la palabra «FECHA» (por ejemplo «jueves, 23 de diciembre de 2021»): "
          "es el día en que se le vendió. En el formulario de ATC es «FECHA DE COMPRA», NO la «FECHA» del formulario. Si solo se lee el "
          "mes y el año o el año solo, dejala vacía. Si en la foto se ve un certificado o una factura, aunque también se vea el colchón, "
          "el tipo es ese.\n"
          "- fecha_compra_texto: lo que dice tal cual (por ejemplo «13/09/2021» o «junio 2022»), o vacío.\n"
          "- celular: el del cliente, solo números; vacío si no hay.\n- cliente: su nombre; vacío si no hay.\n"
          "- reclamo: el problema del colchón en una frase corta (máximo 20 palabras); vacío si no se dice.\n"
          "Las fechas en Bolivia van día/mes/año.")
PIDE_JSON = "\n\nContestá SOLO con un objeto JSON con las claves tipo, fecha_compra, fecha_compra_texto, celular, cliente y reclamo."

def claude(clave, bloque, simple=False):
    cont = [bloque, {"type": "text", "text": PEDIDO + (PIDE_JSON if simple else "")}]
    cuerpo = {"model": MODELO, "max_tokens": 4000, "messages": [{"role": "user", "content": cont}]}
    h = {"x-api-key": clave, "anthropic-version": "2023-06-01", "content-type": "application/json"}
    if not simple:
        cuerpo["fallbacks"] = "default"
        cuerpo["output_config"] = {"effort": "low", "format": {"type": "json_schema", "schema": ESQUEMA}}
        h["anthropic-beta"] = "server-side-fallback-2026-07-01"
    req = urllib.request.Request(CLAUDE, data=json.dumps(cuerpo).encode(), headers=h, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:
            return e.code, {}
    except Exception as e:
        return 0, {"error": {"message": str(e)[:120]}}

def leer_con_claude(clave, bloque, hoy=None):
    """{tipo, fcom, fcomTxt, cels, cliente, reclamo} o {'error': …}. Reintenta lo pasajero; un 400 que no es crédito → simple."""
    for intento in range(3):
        code, o = claude(clave, bloque)
        if code == 400 and "credit" not in json.dumps(o).lower():
            code, o = claude(clave, bloque, simple=True)
        if code in (429, 529) or code >= 500 or code == 0:
            time.sleep(5 * (intento + 1))
            continue
        break
    if code in (401, 403):
        return {"error": "clave", "fatal": True}
    if code == 400 and "credit" in json.dumps(o).lower():
        return {"error": "credito", "fatal": True}
    if code != 200:
        return {"error": "HTTP %s" % code}
    if o.get("stop_reason") == "refusal":
        return {"error": "refusal"}
    txt = "".join(c.get("text", "") for c in o.get("content", []) if c.get("type") == "text")
    a, z = txt.find("{"), txt.rfind("}")
    try:
        j = json.loads(txt[a:z + 1]) if a >= 0 and z > a else None
    except ValueError:
        j = None
    if not isinstance(j, dict):
        return {"error": "sin JSON"}
    return interpretar(j, hoy)

def interpretar(j, hoy=None):
    fc = str(j.get("fecha_compra") or "").strip()
    m = re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})", fc)
    fcom = iso(m.group(3), m.group(2), m.group(1), hoy) if m else ""
    return {"tipo": str(j.get("tipo") or "otro")[:20], "fcom": fcom,
            "fcomTxt": str(j.get("fecha_compra_texto") or "").strip()[:40],
            "cels": celulares(j.get("celular") or ""), "cliente": str(j.get("cliente") or "").strip()[:60],
            "reclamo": re.sub(r"\s+", " ", str(j.get("reclamo") or "")).strip()[:220]}

# ──────────────────────────── Trello ────────────────────────────
def trello_json(path, extra=None):
    p = {"key": os.environ["TRELLO_API_KEY"], "token": os.environ["TRELLO_TOKEN"]}
    p.update(extra or {})
    with urllib.request.urlopen(API + path + "?" + urllib.parse.urlencode(p), timeout=60) as r:
        return json.loads(r.read().decode())

def trello_bajar(card_id, att):
    """El archivo del adjunto: con la cabecera OAuth (los adjuntos ya no se bajan con la clave en la dirección)."""
    nombre = urllib.parse.quote(att.get("fileName") or att.get("name") or "archivo")
    url = "%s/cards/%s/attachments/%s/download/%s" % (API, card_id, att["id"], nombre)
    h = {"Authorization": 'OAuth oauth_consumer_key="%s", oauth_token="%s"' % (os.environ["TRELLO_API_KEY"], os.environ["TRELLO_TOKEN"])}
    with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=90) as r:
        return r.read()

def short_link(url):
    m = re.search(r"/c/([A-Za-z0-9]+)", str(url or ""))
    return m.group(1) if m else ""

def creada(card_id):
    """El día en que se creó la tarjeta (va en los primeros 8 caracteres del id), en hora de Bolivia."""
    try:
        t = datetime.datetime.fromtimestamp(int(card_id[:8], 16), datetime.timezone(datetime.timedelta(hours=-4)))
        return t.date().isoformat()
    except (ValueError, TypeError, OverflowError):
        return ""

def achicar(datos, ext):
    """Con Pillow (si está): la foto derecha (EXIF), a 2000 px como mucho y en JPEG. Sin Pillow, tal cual."""
    try:
        from PIL import Image, ImageOps
    except ImportError:
        return datos, FOTOS[ext]
    try:
        im = ImageOps.exif_transpose(Image.open(io.BytesIO(datos)))
        if im.mode not in ("RGB", "L"):
            im = im.convert("RGB")
        im.thumbnail((2000, 2000))
        out = io.BytesIO()
        im.save(out, "JPEG", quality=85)
        return out.getvalue(), "image/jpeg"
    except Exception:
        return datos, FOTOS[ext]

PRIMERO = re.compile(r"FACTUR|NOTA|RECIBO|FORMUL|ATC|GARANT|CERTIF|COMPRA|VENTA", re.I)

def orden_adjunto(att):
    """Primero los Excel (gratis), después los PDF, después las fotos que por el nombre parecen la factura o el formulario."""
    nom = att.get("fileName") or att.get("name") or ""
    ext = os.path.splitext(nom.lower())[1]
    if ext == ".xlsx":
        return 0
    if ext == ".pdf":
        return 1
    return 2 if PRIMERO.search(nom) else 3

def juntar(lecturas):
    """Lo de todos los adjuntos de una tarjeta en uno: la fecha del Excel primero, después la de una factura, después cualquier foto."""
    orden = {"excel": 0, "factura": 1, "certificado": 1, "formulario": 2, "pdf": 3, "foto_producto": 5, "otro": 4}
    ls = sorted([l for l in lecturas if l and not l.get("error")], key=lambda l: orden.get(l.get("tipo"), 4))
    out = {"fcom": "", "fcomTxt": "", "fuente": "", "cels": [], "cliente": "", "reclamo": ""}
    for l in ls:
        if l.get("fcom") and not out["fcom"]:
            out["fcom"], out["fcomTxt"], out["fuente"] = l["fcom"], l.get("fcomTxt") or l["fcom"], l.get("fuente", "")
        for c in l.get("cels", []):
            if c not in out["cels"]:
                out["cels"].append(c)
        out["cliente"] = out["cliente"] or l.get("cliente", "")
        out["reclamo"] = out["reclamo"] or l.get("reclamo", "")
    if not out["fcom"]:
        for l in ls:
            if l.get("fcomTxt"):
                out["fcomTxt"], out["fuente"] = l["fcomTxt"], l.get("fuente", "")
                break
    return out

def main():
    if not os.environ.get("TRELLO_API_KEY") or not os.environ.get("TRELLO_TOKEN"):
        print("❌ Faltan TRELLO_API_KEY / TRELLO_TOKEN"); return 1
    clave = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    previo = {}
    if os.path.exists(SALIDA):
        try:
            with open(SALIDA, encoding="utf-8") as f:
                previo = json.load(f)
        except ValueError:
            previo = {}
    vistos = previo.get("vistos", {})
    cards = trello_json("/boards/%s/cards" % BOARD, {"filter": "all", "fields": "id,name,url,closed",
                        "attachments": "true", "attachment_fields": "id,name,fileName,mimeType,bytes,isUpload"})
    cards.sort(key=lambda c: c.get("id", ""), reverse=True)        # las más nuevas primero: son las que están en el panel
    cuenta = {"tarjetas": len(cards), "adjuntos": 0, "excel": 0, "fotos": 0, "pdf": 0, "otros": 0, "leidos_ia": 0, "de_antes": 0,
              "errores": 0, "grandes": 0, "sin_clave": 0, "ya_tenia": 0, "pendientes": 0, "con_fecha": 0}
    hoy = datetime.date.today()
    hasta = time.time() + 60 * MINUTOS
    fatal = ""
    tarjetas = []
    for c in cards:
        atts = sorted([a for a in (c.get("attachments") or []) if a.get("isUpload")], key=orden_adjunto)
        for a in atts:                                    # un Excel leído con la versión de antes (sin `rot`) se vuelve a leer: es gratis
            if a["id"] in vistos and vistos[a["id"]].get("tipo") == "excel" and "fx" not in vistos[a["id"]]:
                del vistos[a["id"]]
            # (15/10, dueño: «en los certificados que subieron las fotos» está la fecha de compra) una foto leída con la pregunta de
            # antes —que no nombraba el certificado de garantía— y que no dio la fecha, se vuelve a leer UNA vez con la de ahora
            elif a["id"] in vistos and vistos[a["id"]].get("tipo") != "excel" and not vistos[a["id"]].get("fcom") \
                    and int(vistos[a["id"]].get("v") or 1) < PREGUNTA_V:
                del vistos[a["id"]]
        lecturas = [vistos[a["id"]] for a in atts if a["id"] in vistos]
        cuenta["adjuntos"] += len(atts)
        cuenta["de_antes"] += len(lecturas)
        for att in atts:
            aid, nom = att["id"], (att.get("fileName") or att.get("name") or "")
            ext = os.path.splitext(nom.lower())[1]
            if aid in vistos:
                continue
            try:
                if ext == ".xlsx":
                    cuenta["excel"] += 1
                    r = xlsx_datos(trello_bajar(c["id"], att), hoy)
                    r.update({"tipo": "excel", "fuente": "el Excel «%s»" % nom[:60]})
                elif ext in FOTOS or ext == ".pdf":
                    cuenta["pdf" if ext == ".pdf" else "fotos"] += 1
                    if juntar(lecturas)["fcom"]:              # la tarjeta ya tiene la fecha entera: no se gasta en las otras fotos
                        cuenta["ya_tenia"] += 1; continue
                    if not clave or fatal:
                        cuenta["sin_clave"] += 1; continue
                    if cuenta["leidos_ia"] >= MAX_IA or time.time() > hasta:
                        cuenta["pendientes"] += 1; continue
                    if (att.get("bytes") or 0) > 4 * MAX_BYTES:
                        cuenta["grandes"] += 1; continue
                    datos, tipo = trello_bajar(c["id"], att), "application/pdf"
                    if ext != ".pdf":
                        datos, tipo = achicar(datos, ext)
                    if len(datos) > MAX_BYTES:
                        cuenta["grandes"] += 1; continue
                    b64 = base64.b64encode(datos).decode()
                    bloque = {"type": "document" if ext == ".pdf" else "image", "source": {"type": "base64", "media_type": tipo, "data": b64}}
                    r = leer_con_claude(clave, bloque, hoy)
                    cuenta["leidos_ia"] += 1
                    if r.get("fatal"):
                        fatal = r["error"]; cuenta["errores"] += 1; continue
                    if r.get("error"):
                        cuenta["errores"] += 1; continue
                    r["fuente"] = {"factura": "la factura", "formulario": "el formulario", "certificado": "el certificado de garantía"}.get(r.get("tipo"), "la foto") + " «%s»" % nom[:60]
                    r["v"] = PREGUNTA_V
                else:
                    cuenta["otros"] += 1; continue
            except Exception as e:                       # un adjunto que no baja o no se lee no frena a los demás
                cuenta["errores"] += 1
                print("  · un adjunto %s no se pudo leer (%s)" % (ext or "sin extensión", type(e).__name__))
                continue
            finally:
                time.sleep(0.15)                          # Trello: 100 pedidos cada 10 s por clave
            vistos[aid] = r
            lecturas.append(r)
        j = juntar(lecturas)
        if j["fcom"] or j["fcomTxt"] or j["cels"] or j["reclamo"]:
            if j["fcom"]:
                cuenta["con_fecha"] += 1
            j.update({"sl": short_link(c.get("url")), "url": c.get("url", ""), "creada": creada(c.get("id", ""))})
            tarjetas.append(j)
    # los vistos de adjuntos que ya no existen se van
    vivos = {a["id"] for c in cards for a in (c.get("attachments") or [])}
    vistos = {k: v for k, v in vistos.items() if k in vivos}
    rot = {"fecha": 0, "vacio": 0, "texto": 0, "sin": 0}
    for v in vistos.values():
        if v.get("tipo") == "excel":
            rot[v.get("rot", "sin")] = rot.get(v.get("rot", "sin"), 0) + 1
    cuenta["excel_casillero"] = rot
    salida = {"generado": datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
              "tablero": BOARD, "resumen": cuenta, "tarjetas": tarjetas, "vistos": vistos}
    with open(SALIDA, "w", encoding="utf-8") as f:
        json.dump(salida, f, ensure_ascii=False, indent=1, sort_keys=True)
    print("Tarjetas: %(tarjetas)d · adjuntos: %(adjuntos)d (Excel %(excel)d, fotos %(fotos)d, PDF %(pdf)d, otros %(otros)d)" % cuenta)
    print("Leídos con Claude ahora: %(leidos_ia)d · ya leídos antes: %(de_antes)d · errores: %(errores)d · muy grandes: %(grandes)d" % cuenta)
    print("Fotos sin leer porque la tarjeta ya tenía la fecha: %(ya_tenia)d · quedan para la próxima corrida: %(pendientes)d" % cuenta)
    print("Excel: con la fecha %(fecha)d · el casillero vacío %(vacio)d · con algo que no es una fecha %(texto)d · sin el casillero %(sin)d" % rot)
    rots = {}
    for v in vistos.values():                             # rótulos (no datos) de los Excel sin el casillero, para saber dónde ponen la compra
        if v.get("tipo") == "excel" and v.get("rot") == "sin":
            for u in v.get("fx", []):
                rots[u] = rots.get(u, 0) + 1
    if rots:
        print("Rótulos con FECHA/COMPRA/FACTURA en los Excel sin el casillero: " + " · ".join("«%s» %d" % (k, n) for k, n in sorted(rots.items(), key=lambda x: -x[1])[:15]))
    print("Tarjetas con la fecha de compra entera: %d" % cuenta["con_fecha"])
    if not clave:
        print("⚠️ Sin ANTHROPIC_API_KEY: solo se leyeron los Excel (%d fotos/PDF sin leer)." % cuenta["sin_clave"])
    if fatal:
        print("❌ Claude no aceptó la clave o no hay crédito (%s): se cortaron las fotos." % fatal)
        return 2
    return 0

if __name__ == "__main__":
    sys.exit(main())
