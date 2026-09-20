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

Desde §4et el servidor ENCOLA los ids y contesta al instante (`diferido`), y el script exige
que la respuesta venga del repaso de Kommo (`origen:'repaso'`): un `ok:true` de otro camino
no puede pasar como éxito.

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
# Lo que contesta el panel de mentira. Se cambia entre corridas (ver la sección 4).
RESPUESTA = {"ok": True, "version": "2026-09-05-c", "origen": "repaso", "ultimoHook": "2026-09-05T14:55:00.000Z",
             "creados": 1, "ids": ["44001"], "saltados": ["44002:ya estaba"], "reparados": 1}


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
        return FalsaResp(dict(RESPUESTA))
    PEDIDAS.append(url)
    return FalsaResp(LEADS)


urllib.request.urlopen = falso_urlopen
import traer_kommo
traer_kommo._rq.urlopen = falso_urlopen


def correr():
    """Una corrida del script: devuelve (lo que imprimió, con qué código salió)."""
    PEDIDAS.clear(); ENVIADO.clear()
    buf = io.StringIO(); codigo = 0
    try:
        with contextlib.redirect_stdout(buf):
            traer_kommo.main()
    except SystemExit as e:
        codigo = e.code
    return buf.getvalue(), codigo


salida, codigo = correr()
print(salida)
if codigo:
    print("✗ el script salió con error:", codigo)

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
chk("termina bien", codigo == 0, codigo)
chk("dice cuántos leads miró", "leads en la ventana: 2" in salida, salida[:200])
chk("dice qué versión del Apps Script contestó (para verificar publicaciones desde afuera)",
    "versión 2026-09-05-c" in salida, salida[-160:])
# 🔎 Sin esto no se puede distinguir «Kommo no avisa» de «el servidor no procesa el aviso».
chk("dice cuándo fue el último aviso de Kommo al panel",
    "último aviso de Kommo al panel: 2026-09-05T14:55" in salida, salida[-200:])
chk("dice cuántos nombres «Lead #…» corrigió", "nombres corregidos" in salida, salida[-200:])
chk("⚠️ …sin imprimir ningún nombre de cliente",
    SECRETOS["nombre"] not in salida, "")
chk("dice cuántos borradores nuevos creó", "borradores NUEVOS creados: 1 de 2" in salida)
chk("⚠️ avisa que esos los perdió el webhook", "los perdió el webhook" in salida)

# 4) §4et: el servidor encola y contesta al instante; y un «ok» ajeno no pasa como éxito
RESPUESTA.clear()
RESPUESTA.update({"ok": True, "version": "2026-09-20-a", "origen": "repaso", "diferido": True, "encolados": 2,
                  "cola": 2, "creados": 0, "ids": [], "ultimoHook": "2026-09-20T12:00:00.000Z",
                  "ultimoRepaso": json.dumps({"ts": "2026-09-20T11:58:00.000Z", "cola": 0, "vistos": 3, "creados": 0, "error": ""})})
s2, c2 = correr()
chk("⚠️ con la respuesta diferida (§4et) termina bien y dice que el panel encoló los ids",
    c2 == 0 and "encoló 2 ids" in s2, s2[-220:])
chk("…sin inventar «creados» (el disparador del servidor todavía no corrió)",
    "borradores NUEVOS creados" not in s2 and "los perdió el webhook" not in s2)
chk("…y sigue diciendo versión, último aviso y último repaso",
    "versión 2026-09-20-a" in s2 and "último aviso de Kommo al panel: 2026-09-20T12:00" in s2 and "último repaso del script" in s2, s2[-300:])
for k, v in SECRETOS.items():
    chk(f"⚠️ (diferido) NO se filtra el {k}", v not in s2)

RESPUESTA.clear()
RESPUESTA.update({"ok": True})          # un ok:true que no viene de kommoLeads (otra implementación / script viejo)
s3, c3 = correr()
chk("⚠️ un ok:true que NO viene del repaso de Kommo (sin origen) corta con error, no pasa como éxito",
    bool(c3) and "no vino del repaso de Kommo" in str(c3), str(c3)[:140])
chk("…y ese mensaje tampoco filtra la dirección del panel ni la clave",
    SECRETOS["panel"] not in str(c3) + s3 and SECRETOS["clave"] not in str(c3) + s3)

RESPUESTA.clear()
RESPUESTA.update({"ok": False, "error": "busy"})
s4, c4 = correr()
chk("si el servidor contesta busy, la corrida falla a la vista (como antes)", bool(c4) and "busy" in str(c4), str(c4)[:100])

print(f"\n{PASS} bien · {FAIL} mal")
sys.exit(1 if FAIL else 0)
