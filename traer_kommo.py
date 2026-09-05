#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
📥 REPASO DE RESPALDO — las ventas de Kommo que el webhook haya perdido (§4cc).

Cuando una venta pasa a «Compradores», Kommo le avisa al panel al instante por webhook.
Esto NO reemplaza a ese aviso: lo respalda. **Los webhooks se pierden** —Kommo falla un
envío, Google está caído medio minuto, la red se corta— y sin una red de seguridad esa
venta desaparecería sin que nadie se entere hasta que el cliente reclame.

Cada corrida le pregunta a Kommo qué leads están en «Compradores» y se movieron en las
últimas horas, y le pasa los ids al panel. El panel ya sabe descartar los que están
cargados (por id `kommo-<lead>` o por la marca `klead`), así que repetir no duplica nada.

⚠️ La ventana es MUCHO más ancha que el intervalo del cron a propósito. El cron dice
«cada 10 minutos», pero GitHub demora los crons frecuentes en repos gratuitos: el 05/09
las corridas reales fueron 05:16, 09:08 y 12:41 UTC — **una cada ~3,5 horas**, y a veces
salta una. Con la ventana de 30 minutos de la primera versión, el repaso no alcanzaba a
NADA de lo que el webhook hubiera perdido. Doce horas cubren dos corridas salteadas.
Repetir no cuesta nada: el panel descarta lo que ya tiene.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  ESTE REPOSITORIO ES PÚBLICO, ASÍ QUE EL REGISTRO DE ACTIONS TAMBIÉN LO ES.
    Este script NO IMPRIME datos de clientes: ni nombres, ni teléfonos, ni direcciones.
    Solo cuenta cuántos leads miró y cuántos mandó. Los ids de lead son números internos
    de Kommo, no dicen nada de nadie.
    Los secretos (token, clave del webhook, dirección del panel) nunca se imprimen.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
import os, sys, json, time
import urllib.request as _rq, urllib.parse as _ps, urllib.error as _er

SUBDOMAIN = (os.environ.get("KOMMO_SUBDOMAIN", "") or "").strip() or "eanez"
BASE_URL  = f"https://{SUBDOMAIN}.kommo.com/api/v4"
TOKEN     = os.environ.get("KOMMO_TOKEN", "").strip()
PANEL_URL = os.environ.get("PANEL_URL", "").strip()
HOOK_KEY  = os.environ.get("KOMMO_HOOK_KEY", "").strip()

PIPELINE = os.environ.get("KOMMO_PIPELINE", "13349719").strip()
ETAPA    = os.environ.get("KOMMO_ETAPA", "103450711").strip()   # «Compradores»

# Cuánto hacia atrás mirar. Más ancha que la cadencia REAL del cron (ver arriba).
VENTANA_MIN = int(os.environ.get("VENTANA_MIN", str(12 * 60)))
TOPE = 100         # cuántos leads como mucho por corrida (el panel acepta hasta 100)


def api_get(path, params=None, _retry=0):
    """Mismo patrón que generar.py: reintenta ante 429 y no explota por un 404."""
    url = BASE_URL + path + ("?" + _ps.urlencode(params) if params else "")
    req = _rq.Request(url, headers={"Authorization": "Bearer " + TOKEN,
                                    "Content-Type": "application/json"})
    try:
        with _rq.urlopen(req, timeout=40) as r:
            if r.status == 204:
                return {}
            return json.loads(r.read().decode("utf-8"))
    except _er.HTTPError as e:
        if e.code == 429 and _retry < 4:
            time.sleep(2 ** _retry * 3)
            return api_get(path, params, _retry + 1)
        if e.code in (204, 404):
            return {}
        return {"__http__": e.code}
    except Exception as ex:
        if _retry < 2:
            time.sleep(2)
            return api_get(path, params, _retry + 1)
        return {"__excepcion__": type(ex).__name__}


def avisar_al_panel(ids):
    """Le pasa los ids al Apps Script. Es el MISMO camino que usa el webhook: una sola
       implementación del borrador, dos formas de dispararla."""
    cuerpo = json.dumps({"action": "kommoLeads", "key": HOOK_KEY, "leads": ids}).encode("utf-8")
    req = _rq.Request(PANEL_URL, data=cuerpo, method="POST",
                      headers={"Content-Type": "text/plain;charset=utf-8"})
    try:
        with _rq.urlopen(req, timeout=90) as r:
            return json.loads(r.read().decode("utf-8"))
    except _er.HTTPError as e:
        return {"ok": False, "error": f"HTTP {e.code}"}
    except Exception as ex:
        return {"ok": False, "error": type(ex).__name__}


def main():
    faltan = [n for n, v in (("KOMMO_TOKEN", TOKEN), ("PANEL_URL", PANEL_URL),
                             ("KOMMO_HOOK_KEY", HOOK_KEY)) if not v]
    if faltan:
        sys.exit("✗ Faltan secrets: " + ", ".join(faltan))

    desde = int(time.time()) - VENTANA_MIN * 60
    print("📥 REPASO DE RESPALDO — ventas de Kommo que el webhook pueda haber perdido")
    print(f"   embudo {PIPELINE} · etapa {ETAPA} · últimos {VENTANA_MIN} minutos")

    r = api_get("/leads", {
        "limit": TOPE,
        "order[updated_at]": "desc",
        "filter[statuses][0][pipeline_id]": PIPELINE,
        "filter[statuses][0][status_id]":  ETAPA,
        "filter[updated_at][from]": desde,
    })
    if r.get("__http__") or r.get("__excepcion__"):
        sys.exit(f"✗ No se pudo consultar Kommo: {r}")

    leads = ((r.get("_embedded") or {}).get("leads") or [])
    ids = [str(x.get("id")) for x in leads if x.get("id")]
    print(f"   leads en la ventana: {len(ids)}")

    # Se le avisa al panel SIEMPRE, aunque no haya ids: con la lista vacía no toca nada y
    # contesta su versión. Es la única forma de ver desde afuera qué Apps Script está
    # publicado (el sandbox de Claude no llega a Google), y la versión no es dato de nadie.
    res = avisar_al_panel(ids)
    if not res.get("ok"):
        sys.exit(f"✗ El panel no aceptó el aviso: {res.get('error')}")
    print(f"   servidor del panel: versión {res.get('version') or '(no dice: es un Apps Script viejo)'}")

    if not ids:
        print("   ✓ nada nuevo. (Es lo normal: el webhook ya los trajo al instante.)")
        return

    creados = res.get("creados", 0)
    print(f"   borradores NUEVOS creados: {creados} de {len(ids)}")
    if creados:
        # Son los que el webhook perdió. Si esto no es casi siempre 0, el webhook no
        # está andando bien y hay que mirarlo.
        print("   ⚠️ estos los perdió el webhook — si pasa seguido, revisar el webhook en Kommo")
    else:
        print("   ✓ todos ya estaban cargados: el webhook está haciendo su trabajo")


if __name__ == "__main__":
    main()
