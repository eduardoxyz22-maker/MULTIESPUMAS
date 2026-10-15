#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🗂️ LOS ADJUNTOS DE TRELLO (§4lf-b): `herramientas/trello_adjuntos.py`.

Lee la fecha de compra de las ATC de los Excel (directo) y de las fotos/PDF (con Claude) adjuntos a las tarjetas de Trello.
Este test lo corre contra un Trello y un Claude DE MENTIRA (nada sale a la red) con datos inventados, y comprueba:
  1. las fechas: «13/09/2021», «13-09-21», el número de Excel, «16 de agosto de 2021»; nada del futuro ni antes de 2005;
  2. el Excel armado en la prueba (texto compartido, fecha como número, fecha en la misma celda del rótulo);
  3. lo que contesta Claude: la fecha entera o nada (mes y año solos quedan como texto);
  4. una tarjeta con la fecha en el Excel NO gasta en sus fotos; cada adjunto se lee UNA vez (la segunda corrida no llama a Claude);
  5. sin crédito: corta las fotos, devuelve 2 y guarda igual lo de los Excel;
  6. 🔒 el registro (público) no dice ningún dato de clientes: ni nombres, ni celulares, ni fechas, ni la clave.

Se corre solo:  python3 tests/test_trello_adjuntos.py
"""
import io, os, sys, json, base64, zipfile, tempfile, contextlib, datetime, urllib.request, urllib.error
from xml.sax.saxutils import escape

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, "..", "herramientas"))
import trello_adjuntos as T  # noqa: E402

OK = FALLAS = 0
def chk(cond, que):
    global OK, FALLAS
    if cond:
        OK += 1
    else:
        FALLAS += 1
        print("  ❌ " + que)

HOY = datetime.date(2026, 10, 15)

# ─────────────── 1. fechas y celulares ───────────────
chk(T.fecha_de_texto("13/09/2021", HOY) == "2021-09-13", "13/09/2021")
chk(T.fecha_de_texto("13-09-21", HOY) == "2021-09-13", "13-09-21 (año de dos cifras)")
chk(T.fecha_de_texto("44452", HOY) == "2021-09-13", "número de Excel 44452 = 13/09/2021")
chk(T.fecha_de_texto("16 de agosto de 2021", HOY) == "2021-08-16", "16 de agosto de 2021")
chk(T.fecha_de_texto("2022-06-30", HOY) == "2022-06-30", "AAAA-MM-DD")
chk(T.fecha_de_texto("31/02/2022", HOY) == "", "31 de febrero no existe")
chk(T.fecha_de_texto("10/11/2026", HOY) == "", "una fecha del futuro no es de compra")
chk(T.fecha_de_texto("03/04/1999", HOY) == "", "antes de 2005 no")
chk(T.fecha_de_texto("junio 2022", HOY) == "", "mes y año solos: sin día no hay fecha")
chk(T.celulares("Cel: 7712-3456 / +591 68 123 456") == ["77123456", "68123456"], "celulares con guiones, espacios y 591")
chk(T.celulares("NIT 1234567015") == [], "un NIT no es celular")

# ─────────────── 2. el Excel (armado acá) ───────────────
def xlsx(filas):
    comp, rows = [], []
    for i, fila in enumerate(filas, 1):
        cs = []
        for j, v in enumerate(fila):
            if v is None:
                continue
            ref = chr(65 + j) + str(i)
            if isinstance(v, (int, float)):
                cs.append('<c r="%s"><v>%s</v></c>' % (ref, v))
            elif isinstance(v, tuple):          # («texto»,) = texto en la celda, sin la tabla compartida
                cs.append('<c r="%s" t="inlineStr"><is><t>%s</t></is></c>' % (ref, escape(v[0])))
            else:
                comp.append(v)
                cs.append('<c r="%s" t="s"><v>%d</v></c>' % (ref, len(comp) - 1))
        rows.append('<row r="%d">%s</row>' % (i, "".join(cs)))
    ns = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
    b = io.BytesIO()
    with zipfile.ZipFile(b, "w") as z:
        z.writestr("[Content_Types].xml", "<Types/>")
        z.writestr("xl/sharedStrings.xml", '<sst %s>%s</sst>' % (ns, "".join("<si><t>%s</t></si>" % escape(s) for s in comp)))
        z.writestr("xl/worksheets/sheet1.xml", '<worksheet %s><sheetData>%s</sheetData></worksheet>' % (ns, "".join(rows)))
    return b.getvalue()

X1 = xlsx([["FORMULARIO DE ATC"], ["FECHA", 46300], ["CLIENTE", "Rosaura Inventada Pérez"],
           ["TELEFONO", "7700-1122"], ["FECHA DE COMPRA", 44452], ["DETALLES DEL RECLAMO"], ["El colchón se hundió en el medio"]])
d = T.xlsx_datos(X1, HOY)
chk(d["fcom"] == "2021-09-13", "Excel: la fecha de compra es la celda después del rótulo (no la FECHA del formulario): %r" % d["fcom"])
chk(d["cels"] == ["77001122"], "Excel: el teléfono")
chk(d["cliente"] == "Rosaura Inventada Pérez", "Excel: el cliente")
chk("hundió" in d["reclamo"], "Excel: el reclamo de la fila de abajo")
X2 = xlsx([[("Fecha de compra: 05/03/2023",)], ["Celular", ("+591 61234567",)], ["Detalle del reclamo", "ruido en los resortes"]])
d2 = T.xlsx_datos(X2, HOY)
chk(d2["fcom"] == "2023-03-05", "Excel: la fecha en la misma celda del rótulo (texto en línea)")
chk(d2["cels"] == ["61234567"] and d2["reclamo"] == "ruido en los resortes", "Excel: celular y reclamo al lado")
X3 = xlsx([["FECHA DE COMPRA", "2022"], ["CLIENTE", "Otro Inventado"]])
d3 = T.xlsx_datos(X3, HOY)
chk(d3["fcom"] == "" and d3["fcomTxt"] == "2022", "Excel: el año solo queda como texto, sin inventar el día")
chk(d["rot"] == "fecha" and d3["rot"] == "texto", "Excel: el casillero dice cómo estaba (fecha / texto)")
X4 = xlsx([["CLIENTE", "Otro"], [None, "FECHA DE COMPRA", None, "DIRECCION", "Av. 13/09/2021"], [None, 44100]])
d4 = T.xlsx_datos(X4, HOY)
chk(d4["fcom"] == "2020-09-26" and d4["rot"] == "fecha", "Excel: la fecha DEBAJO del rótulo (formato en columna), sin tomar la de la dirección: %r" % d4)
X5 = xlsx([["FECHA DE COMPRA", None, "DIRECCION", "calle 5"], ["TELEFONO", "70000000"]])
d5 = T.xlsx_datos(X5, HOY)
chk(d5["fcom"] == "" and d5["fcomTxt"] == "" and d5["rot"] == "vacio", "Excel: el casillero vacío no toma el rótulo de al lado: %r" % d5)
chk(T.xlsx_datos(xlsx([["CLIENTE", "x"]]), HOY)["rot"] == "sin", "Excel: sin el rótulo de la fecha = «sin»")

# ─────────────── 3. lo que contesta Claude ───────────────
i1 = T.interpretar({"tipo": "factura", "fecha_compra": "2024-02-29", "fecha_compra_texto": "29/02/2024", "celular": "591 7 1234567",
                    "cliente": "X", "reclamo": "  se   hundió  "}, HOY)
chk(i1["fcom"] == "2024-02-29" and i1["cels"] == ["71234567"] and i1["reclamo"] == "se hundió", "Claude: fecha, celular y reclamo limpios")
chk(T.interpretar({"fecha_compra": "2027-01-01"}, HOY)["fcom"] == "", "Claude: una fecha del futuro se descarta")
chk(T.interpretar({"fecha_compra": "junio 2022", "fecha_compra_texto": "junio 2022"}, HOY)["fcom"] == "", "Claude: mes y año no es fecha")
j = T.juntar([{"tipo": "foto_producto", "fcom": "2020-01-01", "fuente": "la foto"}, {"tipo": "factura", "fcom": "2021-05-05", "fuente": "la factura"},
              {"tipo": "excel", "fcom": "", "fcomTxt": "mayo 2021", "cels": ["70000001"], "fuente": "el Excel"}])
chk(j["fcom"] == "2021-05-05" and j["fuente"] == "la factura" and j["cels"] == ["70000001"], "juntar: la factura gana a la foto")

# ─────────────── 4-6. una corrida entera, con Trello y Claude de mentira ───────────────
CLAUDE_PIDE = []
CREDITO = {"hay": True}
CARDS = [
    {"id": "66f000000000000000000001", "name": "ATC Rosaura", "url": "https://trello.com/c/AAAA1111/1-atc", "closed": False,
     "attachments": [{"id": "a1", "fileName": "foto colchon.jpg", "isUpload": True, "bytes": 10},
                     {"id": "a2", "fileName": "ATC Rosaura.xlsx", "isUpload": True, "bytes": 10}]},
    {"id": "66f000000000000000000002", "name": "ATC Teodulfo", "url": "https://trello.com/c/BBBB2222/2-atc", "closed": True,
     "attachments": [{"id": "b1", "fileName": "colchon.jpg", "isUpload": True, "bytes": 10},
                     {"id": "b2", "fileName": "factura.png", "isUpload": True, "bytes": 10},
                     {"id": "b3", "fileName": "audio.ogg", "isUpload": True, "bytes": 10},
                     {"id": "b4", "name": "enlace", "isUpload": False}]},
]
ARCH = {"a1": b"FOTO-a1", "a2": X1, "b1": b"FOTO-b1", "b2": b"FOTO-b2", "b3": b"OGG"}
LEE = {b"FOTO-b2": {"tipo": "factura", "fecha_compra": "2022-11-20", "fecha_compra_texto": "20/11/2022", "celular": "69998877",
                    "cliente": "Teodulfo Inventado", "reclamo": "patas rotas"},
       b"FOTO-b1": {"tipo": "foto_producto", "fecha_compra": "", "fecha_compra_texto": "", "celular": "", "cliente": "", "reclamo": ""},
       b"FOTO-a1": {"tipo": "foto_producto", "fecha_compra": "", "fecha_compra_texto": "", "celular": "", "cliente": "", "reclamo": ""}}

class Resp(io.BytesIO):
    status = 200
    def __enter__(self): return self
    def __exit__(self, *a): return False

def falso_urlopen(req, timeout=None):
    url = req.full_url if hasattr(req, "full_url") else req
    if "api.anthropic.com" in url:
        h = {k.lower(): v for k, v in req.header_items()}
        assert h.get("x-api-key") == "clave-de-mentira"
        cuerpo = json.loads(req.data.decode())
        datos = base64.b64decode(cuerpo["messages"][0]["content"][0]["source"]["data"])
        CLAUDE_PIDE.append(datos)
        if not CREDITO["hay"]:
            raise urllib.error.HTTPError(url, 400, "bad", {}, io.BytesIO(b'{"error":{"message":"Your credit balance is too low"}}'))
        return Resp(json.dumps({"stop_reason": "end_turn", "content": [{"type": "text", "text": json.dumps(LEE[datos])}]}).encode())
    if "/boards/" in url:
        return Resp(json.dumps(CARDS).encode())
    if "/attachments/" in url:
        h = {k.lower(): v for k, v in req.header_items()}
        assert "oauth_token=" in h.get("authorization", ""), "el adjunto se baja con la cabecera OAuth"
        aid = url.split("/attachments/")[1].split("/")[0]
        return Resp(ARCH[aid])
    raise AssertionError("pedido inesperado")

def correr(salida):
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        rc = T.main()
    return rc, out.getvalue()

urllib.request.urlopen = falso_urlopen
T.time.sleep = lambda s: None
os.environ.update({"TRELLO_API_KEY": "k-mentira", "TRELLO_TOKEN": "t-mentira", "ANTHROPIC_API_KEY": "clave-de-mentira"})
tmp = tempfile.mkdtemp()
T.SALIDA = os.path.join(tmp, "adj.json")

rc, log1 = correr(T.SALIDA)
J = json.load(open(T.SALIDA, encoding="utf-8"))
por = {t["sl"]: t for t in J["tarjetas"]}
chk(rc == 0, "corrida 1 termina bien (rc=%s)" % rc)
chk(por.get("AAAA1111", {}).get("fcom") == "2021-09-13", "tarjeta 1: la fecha sale del Excel")
chk(b"FOTO-a1" not in CLAUDE_PIDE, "tarjeta 1: con la fecha del Excel, su foto NO se le manda a Claude")
chk(por.get("BBBB2222", {}).get("fcom") == "2022-11-20" and "factura" in por["BBBB2222"]["fuente"], "tarjeta 2 (archivada): la fecha de la factura")
chk(CLAUDE_PIDE and CLAUDE_PIDE[0] == b"FOTO-b2", "la foto que por el nombre parece la factura va primero")
chk(b"FOTO-b1" not in CLAUDE_PIDE, "con la fecha de la factura, la otra foto de la tarjeta no se lee")
chk(por["BBBB2222"]["cels"] == ["69998877"] and por["BBBB2222"]["creada"], "tarjeta 2: celular y día de creación")
chk(J["resumen"]["otros"] == 1 and J["resumen"]["ya_tenia"] == 2, "audio = otro; dos fotos sin leer porque ya había fecha: %r" % J["resumen"])
chk(set(J["vistos"]) == {"a2", "b2"}, "quedan anotados solo los leídos: %r" % sorted(J["vistos"]))

n = len(CLAUDE_PIDE)
rc, log2 = correr(T.SALIDA)
J2 = json.load(open(T.SALIDA, encoding="utf-8"))
chk(len(CLAUDE_PIDE) == n, "corrida 2: lo ya leído NO se le vuelve a mandar a Claude")
chk(J2["resumen"]["de_antes"] == 2 and {t["sl"]: t["fcom"] for t in J2["tarjetas"]} == {"AAAA1111": "2021-09-13", "BBBB2222": "2022-11-20"},
    "corrida 2: mismo resultado con lo guardado")
chk(J2["resumen"]["excel_casillero"] == {"fecha": 1, "vacio": 0, "texto": 0, "sin": 0} and "Excel: con la fecha 1" in log2, "el resumen cuenta cómo estaba el casillero de cada Excel")

# un Excel leído con la versión de antes (sin `rot`) se vuelve a leer, gratis (sin Claude)
J2["vistos"]["a2"].pop("rot"); J2["vistos"]["a2"]["fcom"] = ""
json.dump(J2, open(T.SALIDA, "w", encoding="utf-8"))
rc, log2b = correr(T.SALIDA)
J2b = json.load(open(T.SALIDA, encoding="utf-8"))
chk(len(CLAUDE_PIDE) == n and J2b["vistos"]["a2"].get("rot") == "fecha" and {t["sl"]: t["fcom"] for t in J2b["tarjetas"]}["AAAA1111"] == "2021-09-13",
    "un Excel de la versión de antes se relee (sin gastar en Claude)")

# sin crédito: se cortan las fotos, devuelve 2, lo del Excel se guarda igual
os.remove(T.SALIDA)
CREDITO["hay"] = False
CLAUDE_PIDE.clear()
rc, log3 = correr(T.SALIDA)
J3 = json.load(open(T.SALIDA, encoding="utf-8"))
chk(rc == 2, "sin crédito: termina con 2 (rc=%s)" % rc)
chk(len(CLAUDE_PIDE) <= 2, "sin crédito: no sigue probando foto por foto (%d pedidos)" % len(CLAUDE_PIDE))
chk({t["sl"]: t["fcom"] for t in J3["tarjetas"]}.get("AAAA1111") == "2021-09-13", "sin crédito: lo del Excel queda guardado")
chk("b2" not in J3["vistos"], "sin crédito: la foto no queda como leída (se lee la próxima)")

# sin la clave de Claude: solo los Excel
os.remove(T.SALIDA)
os.environ.pop("ANTHROPIC_API_KEY")
CLAUDE_PIDE.clear()
rc, log4 = correr(T.SALIDA)
chk(rc == 0 and not CLAUDE_PIDE and "Sin ANTHROPIC_API_KEY" in log4, "sin la clave: solo los Excel, y lo dice")

# 🔒 el registro público no dice nada de los clientes
todo = log1 + log2 + log3 + log4
for secreto in ["Rosaura", "Teodulfo", "Inventado", "77001122", "69998877", "2021-09-13", "13/09/2021", "20/11/2022",
                "clave-de-mentira", "k-mentira", "t-mentira", "AAAA1111", "factura.png", "hundió", "patas"]:
    chk(secreto not in todo, "🔒 el registro NO dice «%s»" % secreto)

print("test_trello_adjuntos: %d ok, %d fallas" % (OK, FALLAS))
sys.exit(1 if FALLAS else 0)
