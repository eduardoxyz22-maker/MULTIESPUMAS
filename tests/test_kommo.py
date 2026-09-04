#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🔒 EL INSPECTOR DE KOMMO NO PUEDE FILTRAR DATOS DE CLIENTES.

`inspeccionar_kommo.py` corre en GitHub Actions, y **este repositorio es público**: el
registro de la corrida lo puede leer cualquiera. Este test lo corre contra un Kommo de
mentira cargado a propósito con datos personales realistas —nombre, teléfono, dirección,
correo, link de Maps, el texto del reclamo— y comprueba que NINGUNO aparezca en la salida.

Y al revés: que la estructura que sí hace falta (etapas, campos, catálogo, vendedoras) SÍ
salga, porque para eso existe el script.

⚠️ Si alguna vez se le agrega al inspector algo que imprima contenido de un lead, este test
tiene que fallar. Si no falla, es que el dato se está yendo al registro público.

Se corre solo (no es Playwright, no entra en ./tests/correr.sh):
    python3 tests/test_kommo.py
"""
import io, json, os, sys, contextlib, urllib.request

os.environ["KOMMO_TOKEN"] = "tok_de_mentira_1234567890"
os.environ["KOMMO_SUBDOMAIN"] = "eanez"
sys.path.insert(0, "/home/user/MULTIESPUMAS")

# ── Datos personales que NO tienen que aparecer NUNCA en la salida ────────────
SECRETOS = {
    "nombre":    "LORENA OYOLA MENDEZ",
    "telefono":  "70863187",
    "direccion": "CALLE ÑUFLO DE CHAVEZ EDIF ECODENT DEPTO 4B",
    "email":     "lorena.oyola@gmail.com",
    "maps":      "https://maps.app.goo.gl/RqsEezKpiDsaFS9L7",
    "nota":      "ESTA SOBRESALIDO EN EL MEDIO Y NO DESCANSA BIEN",
    "token":     os.environ["KOMMO_TOKEN"],
}

RESP = {
    "/account": {"id": 31234567, "name": "Heaven Colchones"},
    "/leads/pipelines": {"_embedded": {"pipelines": [{
        "id": 9911, "name": "Ventas", "is_main": True,
        "_embedded": {"statuses": [
            {"id": 1, "name": "Incoming leads", "type": 0},
            {"id": 2, "name": "Nueva consulta", "type": 0},
            {"id": 3, "name": "Cotizacion enviada", "type": 0},
            {"id": 4, "name": "Compradores", "type": 1},
            {"id": 5, "name": "No Responden", "type": 2},
        ]}}]}},
    "/leads/custom_fields": {"_embedded": {"custom_fields": [
        {"id": 501, "name": "Canal", "type": "select",
         "enums": [{"id": 1, "value": "Facebook"}, {"id": 2, "value": "Instragram"}]},
        {"id": 502, "name": "Observaciones", "type": "textarea"},
        {"id": 503, "name": "Fecha de compra", "type": "date"},
    ]}},
    "/contacts/custom_fields": {"_embedded": {"custom_fields": [
        {"id": 601, "name": "Teléfono", "type": "multitext"},
        {"id": 602, "name": "Email", "type": "multitext"},
    ]}},
    "/catalogs": {"_embedded": {"catalogs": [{"id": 77, "name": "Productos", "type": "products"}]}},
    "/catalogs/77/custom_fields": {"_embedded": {"custom_fields": [
        {"id": 701, "name": "Precio", "type": "price"},
        {"id": 702, "name": "SKU", "type": "text"},
    ]}},
    "/catalogs/77/elements": {"_embedded": {"elements": [
        {"id": 8801, "name": "TITANIO ICE 140x190"},
        {"id": 8802, "name": "SOFT ICE 160x190"},
    ]}},
    "/leads": {"_embedded": {"leads": [
        {   # Un lead CON todos los datos personales cargados
            "id": 44001, "name": SECRETOS["nombre"],
            "custom_fields_values": [
                {"field_id": 501, "values": [{"value": "Facebook"}]},
                {"field_id": 502, "values": [{"value": SECRETOS["nota"]}]},
                {"field_id": 999, "values": [{"value": SECRETOS["direccion"]}]},
                {"field_id": 998, "values": [{"value": SECRETOS["maps"]}]},
            ],
            "_embedded": {
                "contacts": [{"id": 5501, "name": SECRETOS["nombre"]}],
                "catalog_elements": [
                    {"id": 8801, "catalog_id": 77, "metadata": {"quantity": 2, "price_id": 701}},
                ]}},
        {   # Otro con teléfono suelto
            "id": 44002, "name": "OTRO CLIENTE",
            "custom_fields_values": [{"field_id": 997, "values": [{"value": SECRETOS["telefono"]}]}],
            "_embedded": {"contacts": [], "catalog_elements": []}},
    ]}},
    "/users": {"_embedded": {"users": [
        {"id": 101, "name": "Maria Flores"}, {"id": 102, "name": "Isabel Robledo"}]}},
    "/webhooks": {"_embedded": {"webhooks": []}},
}


class FalsaResp:
    def __init__(self, cuerpo): self._c = json.dumps(cuerpo).encode(); self.status = 200
    def read(self): return self._c
    def __enter__(self): return self
    def __exit__(self, *a): return False


def falso_urlopen(req, timeout=None):
    url = req.full_url if hasattr(req, "full_url") else str(req)
    ruta = url.split("/api/v4", 1)[1].split("?")[0]
    if ruta not in RESP:
        raise urllib.error.HTTPError(url, 404, "Not Found", {}, io.BytesIO(b"{}"))
    return FalsaResp(RESP[ruta])


urllib.request.urlopen = falso_urlopen
import inspeccionar_kommo
inspeccionar_kommo._rq.urlopen = falso_urlopen

buf = io.StringIO()
try:
    with contextlib.redirect_stdout(buf):
        inspeccionar_kommo.main()
except SystemExit as e:
    if e.code:
        print("✗ el script salió con error", e.code)

salida = buf.getvalue()
print(salida)

# ── LAS VERIFICACIONES ────────────────────────────────────────────────────────
print("\n" + "=" * 78)
print("  VERIFICACIONES")
print("=" * 78)
PASS = FAIL = 0
def chk(l, c, e=""):
    global PASS, FAIL
    if c: PASS += 1
    else: FAIL += 1
    print(("✓" if c else "✗"), l, ("· " + str(e)) if e else "")

# 1) ⚠️ LO MÁS IMPORTANTE: ni un dato personal en el registro público
for k, v in SECRETOS.items():
    chk(f"⚠️ NO se filtra el {k} al registro público", v not in salida,
        "" if v not in salida else "¡APARECE EN LA SALIDA!")

# 2) …pero sí la estructura, que es para lo que sirve
chk("dice las etapas del pipeline", "Compradores" in salida and "Cotizacion enviada" in salida)
chk("marca cuál es la etapa de venta ganada", "GANADO" in salida)
chk("lista los campos del lead con su id", "id=501" in salida and "Canal" in salida)
chk("…y las opciones de los desplegables", "Facebook" in salida)
chk("lista los campos del contacto", "Teléfono" in salida or "id=601" in salida)
chk("encuentra el catálogo de productos", "Productos" in salida and "id=77" in salida)
chk("…y los nombres de producto (no son dato personal)", "TITANIO ICE" in salida)
chk("dice la cantidad de un producto enganchado", "cantidad=2" in salida)
chk("lista las vendedoras", "Maria Flores" in salida)

# 3) el diagnóstico de lo que FALTA en Kommo
chk("⚠️ avisa que Kommo NO tiene fecha de entrega", "✗ fecha de entrega" in salida)
chk("…ni turno", "✗ turno AM/PM" in salida)
chk("…ni zona ni dirección ni maps",
    "✗ zona" in salida and "✗ dirección" in salida and "✗ link de Maps" in salida)
chk("…y lo resume en una línea accionable", "Kommo NO tiene:" in salida)

# 4) los valores se describen sin mostrarse
chk("los valores se describen por su FORMA, no por su contenido",
    "texto de" in salida or "número de" in salida)

# 5) del token solo el largo
chk("del token solo dice cuántos caracteres tiene, nunca el token",
    f"token recibido: {len(SECRETOS['token'])} caracteres" in salida)

print(f"\n{PASS} bien · {FAIL} mal")
sys.exit(1 if FAIL else 0)
