#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🔒 EL REPASO DE RESPALDO NO PUEDE FILTRAR DATOS DE CLIENTES.

`traer_kommo.py` corre en GitHub Actions (el cron dice cada 10 minutos; en la práctica GitHub
lo corre cada ~3,5 horas), y **este repositorio es público**:
el registro de cada corrida lo puede leer cualquiera. Este test lo corre contra un Kommo de
mentira cargado a propósito con datos personales realistas y comprueba que ninguno salga —
ni el token, ni la clave del webhook, ni la dirección del panel.

Y al revés: que haga su trabajo. Que pida solo la etapa correcta, que mire una ventana más
ancha que el intervalo (si una corrida falla, la siguiente tiene que alcanzar a las que se
le pasaron), y que le mande los ids al panel con la clave.

Se corre solo:  python3 tests/test_traer.py
"""
import io, json, os, sys, contextlib, urllib.request, urllib.error

os.environ["KOMMO_TOKEN"]    = "tok_de_mentira_1234567890"
os.environ["KOMMO_SUBDOMAIN"] = "eanez"
os.environ["KOMMO_HOOK_KEY"] = "clave-secreta-del-webhook-xyz"
os.environ["PANEL_URL"]      = "https://script.google.com/macros/s/SECRETO_DEL_PANEL/exec"
sys.path.insert(0, "/home/user/MULTIESPUMAS")

SECRETOS = {
    "nombre":    "LORENA OYOLA MENDEZ",
    "telefono":  "70863187",
    "direccion": "CALLE ÑUFLO DE CHAVEZ EDIF ECODENT DEPTO 4B",
    "nota":      "QUIERE ENTREGA ANTES DEL VIERNES",
    "token":     os.environ["KOMMO_TOKEN"],
    "clave":     os.environ["KOMMO_HOOK_KEY"],
    "panel":     os.environ["PANEL_URL"],
}

LEADS = {"_embedded": {"leads": [
    {"id": 44001, "name": SECRETOS["nombre"], "price": 13020,
     "custom_fields_values": [{"field_id": 1685406, "values": [{"value": SECRETOS["direccion"]}]},
                              {"field_id": 502,     "values": [{"value": SECRETOS["nota"]}]}],
     "_embedded": {"contacts": [{"id": 5501, "name": SECRETOS["nombre"]}]}},
    {"id": 44002, "name": "OTRO CLIENTE", "price": 2200,
     "custom_fields_values": [{"field_id": 997, "values": [{"value": SECRETOS["telefono"]}]}],
     "_embedded": {"contacts": []}},
]}}

PEDIDAS = []      # las URLs que le pidió a Kommo
ENVIADO = {}      # lo que le mandó al panel


class FalsaResp:
    def __init__(self, cuerpo): self._c = json.dumps(cuerpo).encode(); self.status = 200
    def read(self): return self._c
    def __enter__(self): return self
    def __exit__(self, *a): return False


def falso_urlopen(req, timeout=None):
    url = req.full_url if hasattr(req, "full_url") else str(req)
    if "script.google.com" in url:
        ENVIADO.update(json.loads(req.data.decode()))
        ENVIADO["_url"] = url
        return FalsaResp({"ok": True, "version": "2026-09-05-a", "creados": 1, "ids": ["44001"], "saltados": ["44002:ya estaba"]})
    PEDIDAS.append(url)
    return FalsaResp(LEADS)


urllib.request.urlopen = falso_urlopen
import traer_kommo
traer_kommo._rq.urlopen = falso_urlopen

buf = io.StringIO()
try:
    with contextlib.redirect_stdout(buf):
        traer_kommo.main()
except SystemExit as e:
    if e.code:
        print("✗ el script salió con error:", e.code)

salida = buf.getvalue()
print(salida)

print("\n" + "=" * 78)
print("  VERIFICACIONES")
print("=" * 78)
PASS = FAIL = 0
def chk(l, c, e=""):
    global PASS, FAIL
    if c: PASS += 1
    else: FAIL += 1
    print(("✓" if c else "✗"), l, ("· " + str(e)) if e else "")

# 1) ⚠️ LO MÁS IMPORTANTE: ni un dato personal ni un secreto en el registro público
for k, v in SECRETOS.items():
    chk(f"⚠️ NO se filtra el {k} al registro público", v not in salida,
        "" if v not in salida else "¡APARECE EN LA SALIDA!")

# 2) …pero sí hace su trabajo
pedida = PEDIDAS[0] if PEDIDAS else ""
chk("le pide a Kommo solo la etapa «Compradores»", "103450711" in pedida, pedida[:110])
chk("…y solo de su embudo", "13349719" in pedida)
chk("…de lo más nuevo hacia atrás", "updated_at" in pedida and "desc" in pedida)
chk("…con una ventana acotada en el tiempo", "filter%5Bupdated_at%5D%5Bfrom%5D" in pedida
    or "filter[updated_at][from]" in pedida, pedida[:130])
"""⚠️ La cadencia REAL del cron en GitHub es ~3,5 horas, no 10 minutos (05/09/2026: 05:16,
   09:08, 12:41 UTC), y a veces salta una corrida. La ventana tiene que cubrir DOS corridas
   salteadas; con los 30 minutos de la primera versión el repaso no alcanzaba a nada."""
chk("⚠️ la ventana cubre la cadencia REAL del cron (~3,5 h) aunque se salte dos corridas",
    traer_kommo.VENTANA_MIN >= 8 * 60, f"{traer_kommo.VENTANA_MIN} min")

chk("le manda los ids al panel", ENVIADO.get("leads") == ["44001", "44002"], ENVIADO.get("leads"))
chk("…por el mismo camino que el webhook", ENVIADO.get("action") == "kommoLeads", ENVIADO.get("action"))
chk("…con la clave, si no el panel lo rechaza", ENVIADO.get("key") == SECRETOS["clave"])
chk("⚠️ NO le manda nombres ni teléfonos al panel: solo ids",
    set(ENVIADO.keys()) <= {"action", "key", "leads", "_url"}, list(ENVIADO.keys()))

# 3) lo que informa en el registro
chk("dice cuántos leads miró", "leads en la ventana: 2" in salida, salida[:200])
chk("dice qué versión del Apps Script contestó (para verificar publicaciones desde afuera)",
    "versión 2026-09-05-a" in salida, salida[-160:])
chk("dice cuántos borradores nuevos creó", "borradores NUEVOS creados: 1 de 2" in salida)
chk("⚠️ avisa que esos los perdió el webhook", "los perdió el webhook" in salida)

print(f"\n{PASS} bien · {FAIL} mal")
sys.exit(1 if FAIL else 0)
