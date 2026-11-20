#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
📞 ¿QUIÉN ATIENDE ESTE NÚMERO? — prueba de lectura, SOLO LECTURA (20/11).

El dueño quiere una pestaña del panel donde la vendedora escribe un celular y ve si OTRA vendedora lo está atendiendo:
hubo interacción en los últimos 15 días = un mensaje del cliente Y uno de la vendedora con no más de 24 h entre los dos
(«a veces el cliente escribe y el asesor no responde, o al revés»). Antes de programarlo, este script prueba con la
cuenta de verdad que se puede leer todo eso:
  1. buscar el celular en los contactos (`/contacts?query=`) y llegar a sus leads, su vendedora y su etapa;
  2. traer los mensajes de chat de UN lead (entrantes y salientes, con quién mandó cada saliente) con una sola consulta;
  3. comparar contra la verdad (todos los mensajes de chat de la cuenta en la ventana, sin filtro de entidad, §4ng);
  4. cuánto tarda cada paso (el servidor del panel tiene que contestar en pocos segundos).

⚠️ EL REPOSITORIO ES PÚBLICO Y ESTE REGISTRO TAMBIÉN: no se imprime NINGÚN texto, nombre, teléfono ni id de cliente o
   lead. Solo cantidades, tiempos y si coincide o no. El token no se imprime.
Se corre: Actions → «Inspeccionar quién atiende (solo lectura)», o al cambiar este archivo.
"""
import os, sys, json, time
import urllib.request as _rq, urllib.parse as _ps, urllib.error as _er

SUB = (os.environ.get("KOMMO_SUBDOMAIN", "") or "").strip() or "eanez"
BASE = f"https://{SUB}.kommo.com/api/v4"
TOKEN = os.environ.get("KOMMO_TOKEN", "").strip()
DIAS = 15
PAR_H = 24
AHORA = int(time.time())
DESDE = AHORA - DIAS * 86400
MUESTRA = 25
CHAT = ("incoming_chat_message", "outgoing_chat_message")


def api_get(path, params=None, _r=0):
    url = BASE + path + ("?" + _ps.urlencode(params, doseq=True) if params else "")
    req = _rq.Request(url, headers={"Authorization": "Bearer " + TOKEN, "Content-Type": "application/json"})
    t0 = time.time()
    try:
        with _rq.urlopen(req, timeout=40) as r:
            if r.status == 204:
                return {"__http__": 204, "__t__": time.time() - t0}
            d = json.loads(r.read().decode("utf-8"))
            if isinstance(d, dict):
                d["__t__"] = time.time() - t0
            return d
    except _er.HTTPError as e:
        if e.code == 429 and _r < 4:
            time.sleep(2 ** _r * 3)
            return api_get(path, params, _r + 1)
        return {"__http__": e.code, "__t__": time.time() - t0}
    except Exception as ex:
        if _r < 2:
            time.sleep(2)
            return api_get(path, params, _r + 1)
        return {"__excepcion__": type(ex).__name__, "__t__": time.time() - t0}


def emb(d, k):
    return ((d or {}).get("_embedded", {}) or {}).get(k, []) or []


def paginar(path, params, key, max_pag=150):
    out, pag, estado, t = [], 1, "ok", 0.0
    while pag <= max_pag:
        p = dict(params); p["page"] = pag; p.setdefault("limit", 100)
        d = api_get(path, p)
        t += d.get("__t__", 0) if isinstance(d, dict) else 0
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
        time.sleep(0.12)
    else:
        estado = f"cortado en {max_pag} páginas"
    return out, estado, t, pag


def cel8(t):
    d = "".join(ch for ch in str(t or "") if ch.isdigit())
    return d[-8:] if len(d) >= 7 else ""


def tels(c):
    out = []
    for f in (c or {}).get("custom_fields_values") or []:
        if str(f.get("field_code") or "") == "PHONE":
            for v in f.get("values") or []:
                if v and v.get("value") is not None:
                    out.append(str(v["value"]))
    return out


def titulo(t):
    print("\n" + "━" * 100 + "\n" + t + "\n" + "━" * 100)


def par24(evs):
    """¿Hay un mensaje del cliente y uno de una PERSONA (no el bot) a ≤ 24 h? Devuelve (hay, último instante del par, quién)."""
    ent = sorted(e["created_at"] for e in evs if e.get("type") == "incoming_chat_message")
    sal = sorted((e["created_at"], e.get("created_by") or 0) for e in evs
                 if e.get("type") == "outgoing_chat_message" and (e.get("created_by") or 0) != 0)
    mejor = None
    for ts, u in sal:
        cerca = [x for x in ent if abs(x - ts) <= PAR_H * 3600]
        if cerca:
            fin = max(ts, max(cerca))
            if not mejor or fin > mejor[0]:
                mejor = (fin, u)
    return (mejor is not None), (mejor[0] if mejor else 0), (mejor[1] if mejor else 0)


def main():
    if not TOKEN:
        print("❌ Falta KOMMO_TOKEN"); sys.exit(1)
    print(f"Cuenta: {SUB} · ventana: últimos {DIAS} días · par = cliente + vendedora a ≤ {PAR_H} h · token de {len(TOKEN)} letras")
    rango = {"filter[created_at][from]": DESDE, "filter[created_at][to]": AHORA}

    titulo("1 · La verdad: todos los mensajes de chat de la cuenta en 15 días (sin filtro de entidad, §4ng)")
    verdad = {}
    for tipo in CHAT:
        evs, est, t, pags = paginar("/events", dict(rango, **{"filter[type]": tipo}), "events")
        ents = {}
        for e in evs:
            ents[e.get("entity_type") or "?"] = ents.get(e.get("entity_type") or "?", 0) + 1
            if e.get("entity_type") == "lead":
                verdad.setdefault(e.get("entity_id"), []).append(e)
        hum = sum(1 for e in evs if (e.get("created_by") or 0) != 0)
        print(f"   {tipo:<24} {len(evs):>6} eventos ({hum} de personas) · {pags} páginas · {t:.1f} s · estado {est} · entidad {ents}")
    print(f"   leads con algún mensaje de chat en la ventana: {len(verdad)}")
    con_par = sum(1 for L in verdad.values() if par24(L)[0])
    print(f"   de esos, con un PAR cliente + vendedora a ≤ {PAR_H} h: {con_par} ({100 * con_par // max(1, len(verdad))} %)")

    titulo(f"2 · Una muestra de {MUESTRA} leads con mensajes: buscar el celular y traer los mensajes de UN lead")
    ids = sorted(verdad, key=lambda l: -max(e["created_at"] for e in verdad[l]))[: MUESTRA * 3]
    cuentas = {"leads probados": 0, "sin contacto": 0, "sin teléfono": 0, "búsqueda encuentra el lead": 0, "búsqueda NO lo encuentra": 0,
               "teléfono con leads de 2+ vendedoras": 0, "A coincide": 0, "A distinto": 0, "C coincide": 0, "C distinto": 0,
               "D coincide": 0, "D distinto": 0, "par igual": 0, "par distinto": 0}
    tiempos = {"búsqueda": [], "leads": [], "A": [], "C": [], "D": []}
    estados = {"A": {}, "C": {}, "D": {}}
    for lid in ids:
        if cuentas["leads probados"] >= MUESTRA:
            break
        dl = api_get(f"/leads/{lid}", {"with": "contacts"})
        if "__http__" in dl or "__excepcion__" in dl:
            continue
        cs = emb(dl, "contacts")
        if not cs:
            cuentas["sin contacto"] += 1; continue
        cid = next((c["id"] for c in cs if c.get("is_main")), cs[0]["id"])
        dc = api_get(f"/contacts/{cid}")
        c8 = next((cel8(t) for t in tels(dc) if cel8(t)), "")
        if not c8:
            cuentas["sin teléfono"] += 1; continue
        cuentas["leads probados"] += 1
        # 1 · la búsqueda que haría la pestaña
        r = api_get("/contacts", {"query": c8, "with": "leads", "limit": 50})
        tiempos["búsqueda"].append(r.get("__t__", 0))
        lids, resp = set(), set()
        for c in emb(r, "contacts"):
            if any(cel8(t) == c8 for t in tels(c)):
                for l in emb(c, "leads"):
                    lids.add(l["id"])
        cuentas["búsqueda encuentra el lead" if lid in lids else "búsqueda NO lo encuentra"] += 1
        if lids:
            rl = api_get("/leads", [("filter[id][]", x) for x in list(lids)[:40]] + [("limit", 50)])
            tiempos["leads"].append(rl.get("__t__", 0))
            for l in emb(rl, "leads"):
                resp.add(l.get("responsible_user_id"))
        if len(resp) >= 2:
            cuentas["teléfono con leads de 2+ vendedoras"] += 1
        # 2 · los mensajes de ESTE lead, de tres maneras
        real = sorted((e["type"], e["created_at"], e.get("created_by") or 0) for e in verdad[lid])
        variantes = {
            "A": [("filter[entity][]", "lead"), ("filter[entity_id][]", lid), ("filter[type][]", CHAT[0]), ("filter[type][]", CHAT[1]),
                  ("filter[created_at][from]", DESDE), ("filter[created_at][to]", AHORA), ("limit", 100)],
            "C": [("filter[entity][]", "lead"), ("filter[entity_id][]", lid),
                  ("filter[created_at][from]", DESDE), ("filter[created_at][to]", AHORA), ("limit", 100)],
            "D": [("filter[entity][]", "contact"), ("filter[entity_id][]", cid), ("filter[type][]", CHAT[0]), ("filter[type][]", CHAT[1]),
                  ("filter[created_at][from]", DESDE), ("filter[created_at][to]", AHORA), ("limit", 100)],
        }
        for k, params in variantes.items():
            d = api_get("/events", params)
            tiempos[k].append(d.get("__t__", 0))
            est = str(d.get("__http__") or d.get("__excepcion__") or "200")
            estados[k][est] = estados[k].get(est, 0) + 1
            got = sorted((e["type"], e["created_at"], e.get("created_by") or 0) for e in emb(d, "events") if e.get("type") in CHAT)
            cuentas[k + (" coincide" if got == real else " distinto")] += 1
            if k == "A":
                pa = par24([{"type": t, "created_at": a, "created_by": b} for t, a, b in got])
                pr = par24(verdad[lid])
                cuentas["par igual" if pa[:2] == pr[:2] else "par distinto"] += 1
            time.sleep(0.12)
    for k, v in cuentas.items():
        print(f"   {k:<40} {v}")
    print("   A = filter[entity]=lead + entity_id + los dos tipos de chat · C = lead + entity_id, todos los tipos · D = contacto + tipos de chat")
    for k, e in estados.items():
        print(f"   respuestas HTTP de {k}: {e}")
    for k, v in tiempos.items():
        if v:
            v = sorted(v)
            print(f"   tiempo {k:<10} mediana {v[len(v) // 2]:.2f} s · máx {v[-1]:.2f} s ({len(v)} consultas)")

    titulo("3 · Cuántos números tienen leads de dos o más vendedoras a la vez (con mensajes en 15 días)")
    print("   (sale arriba en «teléfono con leads de 2+ vendedoras», sobre la muestra)")
    print("\n✅ Fin. Nada se cambió en Kommo.")


if __name__ == "__main__":
    main()
