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
import os, re, sys, json, time
import urllib.request as _rq, urllib.parse as _ps, urllib.error as _er
from datetime import datetime, timedelta, timezone

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
# Cuánto esperar antes del ÚNICO reintento cuando Google no deja pasar el aviso (§4fx).
ESPERA_REINTENTO = int(os.environ.get("ESPERA_REINTENTO", "8"))
# 🚨 Cuánto puede faltar el repaso del PROPIO script (cada 5 minutos) antes de dar la alarma
# (§4fz-b). El 23/09 quedó parado desde las 11:24 de Bolivia hasta la noche: este registro lo
# imprimía, pero la corrida salía en verde y nadie lo vio. Ahora sale en ROJO, y GitHub le
# manda el correo al dueño. Los ids se encolan igual; lo que falta es quien los procese.
REPASO_PARADO_MIN = int(os.environ.get("REPASO_PARADO_MIN", "30"))


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


def es_lectura(res):
    """🔀 Google convirtió el POST en un GET (§4fx): contestó `doGet` —la planilla entera,
    `{ok, version, pedidos:[…]}`— y el `doPost` del repaso NUNCA corrió. Pasó en las corridas
    131 y 136 (22 y 23/09); se veía como «no vino del repaso de Kommo» y parecía que PANEL_URL
    apuntaba a otra implementación o que el script publicado era viejo — no era ninguna de las
    dos. ⚠️ Esa respuesta trae los datos de TODOS los clientes: no se imprime nada de ella."""
    return isinstance(res, dict) and isinstance(res.get("pedidos"), list) and not res.get("origen")


def pasajero(res):
    """Lo que vale la pena reintentar UNA vez: la lectura de arriba, un 404 del redirect de
    Google (corridas 128 y 132) o un 5xx. Un `busy`, una clave mala o un `ok` ajeno, no."""
    err = str((res or {}).get("error") or "")
    return es_lectura(res) or err == "HTTP 404" or err.startswith("HTTP 5")


def repaso_parado(rep, ahora=None):
    """El aviso si el último repaso del script tiene más de REPASO_PARADO_MIN minutos; si no,
    None. Sin repaso instalado, vacío o ilegible: None (no se inventa una alarma). Solo dice
    una hora: el resumen del repaso no trae nombres ni teléfonos (§4eg)."""
    try:
        d = json.loads(rep) if isinstance(rep, str) else rep
        ts = datetime.fromisoformat(str(d.get("ts") or "").replace("Z", "+00:00"))
        minutos = int(((ahora or datetime.now(timezone.utc)) - ts).total_seconds() // 60)
    except Exception:
        return None
    if minutos <= REPASO_PARADO_MIN:
        return None
    bo = ts - timedelta(hours=4)          # hora de Bolivia: UTC−4 fijo, sin horario de verano (§4fu)
    lapso = f"{minutos // 60} h {minutos % 60} min" if minutos >= 60 else f"{minutos} min"
    return (f"🚨 el repaso automático del script NO CORRE desde el {bo:%d/%m %H:%M} (hora Bolivia), hace {lapso}: "
            "lo que se encola no entra solo al panel. En Apps Script → Ejecuciones, el error de «kommoRepaso»: "
            "«Script function not found» = el código GUARDADO en el editor está incompleto (los disparadores corren "
            "lo guardado, no lo implementado: volver a pegar el de la versión publicada); «autorización» = ejecutar "
            "«estadoKommo» y aceptar los permisos; ninguna fila = falta el disparador («instalarDisparadores») (§4fz-b).")


# Un error del CÓDIGO dentro del repaso (§4fz-b, revisión del 24/09): `kommoRepaso` atrapa sus
# errores y los anota, así que Ejecuciones dice «Completada» y la hora está al día aunque haya
# fallado adentro — un pegado al que le falta una función auxiliar pasaba por sano.
ERROR_DE_CODIGO = re.compile(r"is not defined|is not a function|Cannot read|ReferenceError|TypeError|SyntaxError", re.I)


def _repaso_dict(rep):
    try:
        d = json.loads(rep) if isinstance(rep, str) else rep
    except Exception:
        return None
    return d if isinstance(d, dict) else None


def _sin_ids(txt, tope=120):
    """Un error de Google puede traer el id de la planilla («document with id …»), y este registro
    es PÚBLICO: se tapa toda tira de 20 letras o más, y se recorta."""
    return re.sub(r"[A-Za-z0-9_-]{20,}", "…", str(txt or ""))[:tope]


def repaso_resumen(rep):
    """El último repaso en una línea: hora, contadores y el error sin ids. Antes se imprimía el
    JSON entero tal cual."""
    d = _repaso_dict(rep)
    if d is None:
        return _sin_ids(rep, 160)
    partes = [str(d.get("ts") or "?")]
    partes += [f"{k} {d[k]}" for k in ("cola", "vistos", "creados", "saltados") if k in d]
    if d.get("error"):
        partes.append("error: " + _sin_ids(d.get("error")))
    return " · ".join(partes)


def repaso_roto(rep):
    """La alarma si el último repaso anotó un error del CÓDIGO; si no, None."""
    err = str((_repaso_dict(rep) or {}).get("error") or "")
    if not ERROR_DE_CODIGO.search(err):
        return None
    return ("🚨 el repaso automático del script CORRE pero falla con un error del código («" + _sin_ids(err) + "»): "
            "lo que se encola no entra al panel. Suele ser un pegado incompleto del .gs: en el editor, ejecutar "
            "«probarAntesDeImplementar» (o «estadoKommo») y volver a pegar el código de la versión publicada (§4fz-b).")


def repaso_aviso(rep):
    """Un error de AFUERA (Kommo no contestó, candado ocupado): se dice y no pone la corrida en rojo,
    porque suele ser pasajero. Si se repite, casi siempre es el token del script."""
    err = str((_repaso_dict(rep) or {}).get("error") or "")
    if not err or ERROR_DE_CODIGO.search(err):
        return None
    return ("⚠️ el último repaso del script avisó un error de afuera («" + _sin_ids(err) + "»). Si se repite en las "
            "próximas corridas, mirar el token de Kommo: la propiedad KOMMO_TOKEN del script es OTRA copia que el "
            "secreto de GitHub, y se renuevan por separado.")


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
    if pasajero(res):
        motivo = "cambió el aviso por una lectura" if es_lectura(res) else f"contestó {res.get('error')}"
        print(f"   ⏳ Google {motivo}: se reintenta UNA vez en {ESPERA_REINTENTO} s (repetir no duplica nada)")
        time.sleep(ESPERA_REINTENTO)
        res = avisar_al_panel(ids)
    if es_lectura(res):
        sys.exit("✗ Google cambió el aviso por una LECTURA dos veces seguidas: contestó la planilla en vez de "
                 "procesar el aviso (§4fx). No es la clave ni el script publicado. Esta corrida no pudo hacer su "
                 "repaso; el del propio script, cada 5 minutos, sigue cubriendo.")
    if not res.get("ok"):
        sys.exit(f"✗ El panel no aceptó el aviso: {res.get('error')}")
    print(f"   servidor del panel: versión {res.get('version') or '(no dice: es un Apps Script viejo)'}")
    # 🔎 Que la respuesta sea DE VERDAD la del repaso de Kommo (§4et). Un `ok:true` de otro
    # camino (PANEL_URL apuntando a otra implementación, o un Apps Script viejo) pasaba
    # como éxito sin haber hecho nada — la corrida 110 dijo «ok» sin traer ni el último aviso.
    if res.get("origen") != "repaso":
        sys.exit("✗ La respuesta no vino del repaso de Kommo (origen="
                 f"{res.get('origen')!r}): ¿PANEL_URL apunta a otra implementación, o el Apps Script publicado es viejo?")
    # 🔎 Cuándo fue la última vez que Kommo le avisó al servidor. Es el dato que separa
    # «el webhook no llega» de «el webhook llega y el servidor no lo procesa». Solo una
    # fecha: no dice de qué venta ni de quién.
    ult = res.get("ultimoHook")
    if ult:
        print(f"   último aviso de Kommo al panel: {ult}")
    elif ult is not None:
        print("   ⚠️ el servidor NUNCA recibió un aviso de Kommo — revisar el webhook en Kommo")
    # 🔎 Y el repaso que hace el PROPIO script cada 5 minutos (§4eg): si está vacío, falta
    # correr instalarDisparadores() en el editor de Apps Script.
    rep = res.get("ultimoRepaso")
    alarma = None
    if rep:
        print(f"   último repaso del script (cada 5 min): {repaso_resumen(rep)}")
        alarma = repaso_parado(rep) or repaso_roto(rep)
        aviso = None if alarma else repaso_aviso(rep)
        if alarma or aviso:
            print("   " + (alarma or aviso))
    elif rep is not None:
        print("   ⚠️ el script todavía no repasa Kommo por su cuenta — correr instalarDisparadores() en Apps Script")

    if not ids:
        print("   ✓ nada nuevo. (Es lo normal: el webhook ya los trajo al instante.)")
    # ⚡ Desde §4et el servidor ENCOLA los ids y contesta al instante (antes armaba los
    # borradores acá adentro: con 9 leads este script cortaba a los 90 s mientras el servidor
    # seguía trabajando a ciegas). Lo que creó se lee en el próximo «último repaso del script».
    elif res.get("diferido"):
        print(f"   el panel encoló {res.get('encolados', len(ids))} ids (en cola: {res.get('cola', '?')}): "
              "su disparador los procesa en segundos, y el repaso cada 5 minutos los agarra si algo falla")
    else:
        creados = res.get("creados", 0)
        print(f"   borradores NUEVOS creados: {creados} de {len(ids)}")
        # Borradores que estaban con el número que pone Kommo («Lead #39357288») y quedaron
        # con el nombre del cliente. Solo la cantidad: el nombre no se imprime nunca.
        reparados = res.get("reparados", 0)
        if reparados:
            print(f"   nombres corregidos (venían como «Lead #…»): {reparados}")
        if creados:
            # Son los que el webhook perdió. Si esto no es casi siempre 0, el webhook no
            # está andando bien y hay que mirarlo.
            print("   ⚠️ estos los perdió el webhook — si pasa seguido, revisar el webhook en Kommo")
        else:
            print("   ✓ todos ya estaban cargados: el webhook está haciendo su trabajo")

    # 🚨 En ROJO a propósito, y recién al final: los ids ya quedaron avisados (§4fz-b).
    if alarma:
        sys.exit("✗ El repaso automático del script está parado o falla (ver arriba). La corrida sale en rojo para "
                 "que llegue el aviso: lo encolado no entra al panel hasta que el script vuelva a correr bien.")


if __name__ == "__main__":
    main()
