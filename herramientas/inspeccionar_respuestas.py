#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🔎 ¿KOMMO DICE CUÁNDO CONTESTA LA VENDEDORA? — solo lectura (27/10, bitácora §4ng).

El dashboard mide la «primera respuesta» con la primera ACCIÓN de la vendedora en el lead (sobre todo mover de etapa),
porque en junio el historial de Kommo devolvió 0 mensajes salientes pidiéndolos con `filter[entity][]=lead`. La
documentación de Kommo dice que existen:
  · en el historial (`/api/v4/events`): los tipos `incoming_chat_message` y `outgoing_chat_message`;
  · en los webhooks de la cuenta: `add_outgoing_message` («mensaje saliente enviado», con el autor) y los de la
    conversación (`add_talk`, `update_talk`, con `is_read` / `is_in_work`).
Este script pregunta, sin cambiar nada, qué devuelve ESTA cuenta: si los salientes están en el historial con otro filtro,
de qué entidad cuelgan, si dicen qué usuario los mandó, y cómo están configurados los webhooks de hoy.

⚠️ EL REPOSITORIO ES PÚBLICO Y ESTE REGISTRO TAMBIÉN: no se imprime NINGÚN texto de mensaje, nombre, teléfono ni id de
   cliente. Solo cantidades, tipos, NOMBRES de campos y la forma de los valores. De los webhooks, solo el host y la
   última parte del camino (nunca la consulta: la del panel lleva una clave). El token no se imprime.
Se corre: Actions → «Inspeccionar respuestas en Kommo (solo lectura)», o solo al cambiar este archivo.
"""
import os, sys, json, time, statistics
import urllib.request as _rq, urllib.parse as _ps, urllib.error as _er

SUB = (os.environ.get("KOMMO_SUBDOMAIN", "") or "").strip() or "eanez"
BASE = f"https://{SUB}.kommo.com/api/v4"
TOKEN = os.environ.get("KOMMO_TOKEN", "").strip()
DIAS = 7
AHORA = int(time.time())
DESDE = AHORA - DIAS * 86400

# Lo que generar.py cuenta HOY como «primera acción» (menos los mensajes de chat, que es lo que se quiere comparar).
ACCIONES = {"lead_status_changed", "common_note_added", "entity_tag_added", "task_added", "task_completed",
            "task_result_added", "entity_direct_message"}


def api_get(path, params=None, _r=0):
    url = BASE + path + ("?" + _ps.urlencode(params, doseq=True) if params else "")
    req = _rq.Request(url, headers={"Authorization": "Bearer " + TOKEN, "Content-Type": "application/json"})
    try:
        with _rq.urlopen(req, timeout=40) as r:
            if r.status == 204:
                return {"__http__": 204}
            return json.loads(r.read().decode("utf-8"))
    except _er.HTTPError as e:
        if e.code == 429 and _r < 4:
            time.sleep(2 ** _r * 3)
            return api_get(path, params, _r + 1)
        return {"__http__": e.code}
    except Exception as ex:
        if _r < 2:
            time.sleep(2)
            return api_get(path, params, _r + 1)
        return {"__excepcion__": type(ex).__name__}


def emb(d, k):
    return ((d or {}).get("_embedded", {}) or {}).get(k, []) or []


def paginar(path, params, key, max_pag=40):
    out, pag, estado = [], 1, "ok"
    while pag <= max_pag:
        p = dict(params); p["page"] = pag; p.setdefault("limit", 100)
        d = api_get(path, p)
        if "__http__" in d or "__excepcion__" in d:
            estado = str(d.get("__http__") or d.get("__excepcion__"))
            break
        lote = emb(d, key)
        if not lote:
            break
        out.extend(lote)
        if "next" not in ((d.get("_links") or {})):
            break
        pag += 1
        time.sleep(0.15)
    return out, estado


def forma(v, prof=0):
    """La FORMA de un valor, nunca el valor: claves y tipos."""
    if prof > 4:
        return "…"
    if isinstance(v, dict):
        return "{" + ", ".join(f"{k}: {forma(x, prof + 1)}" for k, x in sorted(v.items())) + "}"
    if isinstance(v, list):
        return "[" + (forma(v[0], prof + 1) if v else "") + (f"] ×{len(v)}" if len(v) != 1 else "]")
    if isinstance(v, bool):
        return "sí/no"
    if isinstance(v, (int, float)):
        return "número"
    if v is None:
        return "vacío"
    return f"texto({len(str(v))})"


def titulo(t):
    print("\n" + "━" * 100 + "\n" + t + "\n" + "━" * 100)


def resumen(evs):
    ent, quien = {}, {"humano": 0, "bot/sistema": 0}
    for e in evs:
        ent[e.get("entity_type") or "?"] = ent.get(e.get("entity_type") or "?", 0) + 1
        quien["bot/sistema" if (e.get("created_by") or 0) == 0 else "humano"] += 1
    return ent, quien


def main():
    if not TOKEN:
        print("❌ Falta KOMMO_TOKEN"); sys.exit(1)
    print(f"Cuenta: {SUB} · ventana: últimos {DIAS} días · token de {len(TOKEN)} letras")

    titulo("1 · Tipos de evento que la cuenta conoce (solo los de mensajes y conversaciones)")
    d = api_get("/events/types", {"language_code": "es"})
    tipos = emb(d, "events_types")
    if not tipos:
        print("   /events/types no contestó una lista:", {k: v for k, v in d.items() if k.startswith("__")} or "vacía")
    for t in tipos:
        k = str(t.get("key") or t.get("type") or "")
        if any(s in k for s in ("chat", "message", "talk")):
            print(f"   · {k}  ({t.get('lang') or t.get('name') or ''})")

    rango = {"filter[created_at][from]": DESDE, "filter[created_at][to]": AHORA}
    titulo("2 · ¿El historial trae los mensajes de chat? (mismas fechas, distintos filtros)")
    pruebas = [
        ("saliente · filter[type]=… (sin entidad)", {"filter[type]": "outgoing_chat_message"}),
        ("saliente · filter[type][]=… (sin entidad)", {"filter[type][]": "outgoing_chat_message"}),
        ("saliente · + filter[entity][]=lead (como en junio)", {"filter[type][]": "outgoing_chat_message", "filter[entity][]": "lead"}),
        ("saliente · + filter[entity][]=contact", {"filter[type][]": "outgoing_chat_message", "filter[entity][]": "contact"}),
        ("entrante · filter[type]=… (sin entidad)", {"filter[type]": "incoming_chat_message"}),
    ]
    guardados = {}
    for nombre, f in pruebas:
        evs, est = paginar("/events", dict(rango, **f), "events")
        ent, quien = resumen(evs)
        print(f"   {nombre:<55} → {len(evs):>5} eventos · estado {est} · entidad {ent} · {quien}")
        guardados[nombre] = evs
    sal = max((v for k, v in guardados.items() if k.startswith("saliente")), key=len, default=[])
    ent_ = guardados.get("entrante · filter[type]=… (sin entidad)", [])
    for nom, evs in (("saliente", sal), ("entrante", ent_)):
        if evs:
            print(f"\n   Forma de un evento {nom} (sin valores):")
            print("     " + forma({k: v for k, v in evs[0].items() if k != "_links"}))

    titulo("3 · Los salientes de PERSONAS: ¿dicen qué usuario contestó?")
    hum = [e for e in sal if (e.get("created_by") or 0) != 0]
    usuarios = {}
    for e in hum:
        usuarios[e.get("created_by")] = usuarios.get(e.get("created_by"), 0) + 1
    print(f"   {len(hum)} salientes de personas, de {len(usuarios)} usuarios distintos (ids de usuario, no de clientes)")
    if hum:
        u = emb(api_get("/users", {"limit": 250}), "users")
        nombres = {x.get("id"): (x.get("name") or "?") for x in u}
        for uid, n in sorted(usuarios.items(), key=lambda x: -x[1]):
            print(f"     · {nombres.get(uid, 'usuario ' + str(uid))}: {n}")

    titulo("4 · ¿Cuánto antes llega el primer mensaje que la primera acción que hoy mide el dashboard?")
    if not hum or not all((e.get("entity_type") == "lead") for e in hum[:50]):
        print("   (los salientes no cuelgan del lead o no hay de personas: la comparación necesita pasar por el contacto)")
    else:
        prim_msg = {}
        for e in hum:
            lid, ts = e.get("entity_id"), e.get("created_at") or 0
            if lid and (lid not in prim_msg or ts < prim_msg[lid]):
                prim_msg[lid] = ts
        todos, est = paginar("/events", dict(rango, **{"filter[entity][]": "lead"}), "events", max_pag=120)
        prim_acc = {}
        for e in todos:
            if (e.get("created_by") or 0) == 0 or e.get("type") not in ACCIONES:
                continue
            lid, ts = e.get("entity_id"), e.get("created_at") or 0
            if lid and (lid not in prim_acc or ts < prim_acc[lid]):
                prim_acc[lid] = ts
        ambos = [l for l in prim_msg if l in prim_acc]
        antes = [(prim_acc[l] - prim_msg[l]) / 60 for l in ambos if prim_msg[l] < prim_acc[l]]
        print(f"   leads con mensaje de una persona: {len(prim_msg)} · también con una acción: {len(ambos)} · "
              f"solo mensaje, sin acción (hoy salen «nunca tocado»): {len(prim_msg) - len(ambos)}")
        if ambos:
            print(f"   el mensaje llegó ANTES que la acción en {len(antes)} de {len(ambos)} "
                  f"({round(len(antes) * 100 / len(ambos))} %); mediana de la diferencia: "
                  f"{round(statistics.median(antes)) if antes else 0} min")

    titulo("5 · Conversaciones (talks): ¿qué campos trae una?")
    tids = []
    for e in (sal + ent_)[:40]:
        va = e.get("value_after") or []
        for x in (va if isinstance(va, list) else [va]):
            m = (x or {}).get("message") or {}
            if m.get("talk_id") and m["talk_id"] not in tids:
                tids.append(m["talk_id"])
    if not tids:
        print("   los eventos no traen el número de conversación (talk_id)")
    for tid in tids[:2]:
        t = api_get(f"/talks/{tid}")
        if "__http__" in t:
            print(f"   /talks/…: HTTP {t['__http__']}")
            continue
        print("   " + forma({k: v for k, v in t.items() if k != "_links"}))
        print(f"   is_read={t.get('is_read')} · is_in_work={t.get('is_in_work')} · missed_at={'sí' if t.get('missed_at') else 'no'}")

    titulo("6 · Webhooks configurados hoy (solo host, final del camino y eventos)")
    w = api_get("/webhooks")
    hooks = emb(w, "webhooks")
    if not hooks:
        print("   sin lista:", {k: v for k, v in w.items() if k.startswith("__")} or "vacía")
    for h in hooks:
        u = _ps.urlsplit(h.get("destination") or "")
        fin = (u.path.rstrip("/").rsplit("/", 1)[-1] or "/")
        print(f"   · {u.hostname} …/{fin}  {'(APAGADO) ' if h.get('disabled') else ''}eventos={h.get('settings')}")
    print("\nListo. Nada se cambió en Kommo.")


if __name__ == "__main__":
    main()
