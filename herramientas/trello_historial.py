"""
trello_historial.py — el VIAJE de cada tarjeta del tablero ATC de Trello (15/10, §4lf-c).

El dueño (15/10): «las que están en Trello y no en el panel deberían estar». El respaldo diario (`atc-semanal.csv`) dice en qué lista
está HOY cada tarjeta, pero no cuándo se creó ni cuándo pasó por cada lista. Sin eso, una ATC traída al panel quedaría sin días: no
se sabría cuándo entró, cuándo se recogió ni cuándo volvió al cliente, y el informe no podría medir nada.

Esto le pregunta a la API de Trello (sin IA, sin Claude):
  · las listas del tablero (también las archivadas);
  · cada tarjeta (también las archivadas): cuándo se creó (va en el id), en qué lista está y si está archivada;
  · los movimientos de lista (`updateCard` con `listAfter`) y la creación: la PRIMERA vez que entró a cada lista.
y deja `atc-trello-historial.json` al lado de la página. El botón «🔗 Completar con Trello» del panel lo usa para traer las que faltan.

⚠️ El repositorio es PÚBLICO y el registro de GitHub también: acá no se guarda ni se imprime ningún dato de clientes. Solo el código
   corto de la tarjeta (el mismo de su enlace, que ya está en el CSV), fechas y nombres de listas.

Variables: TRELLO_API_KEY, TRELLO_TOKEN (las del reporte ATC), TRELLO_BOARD_ID (cFbJp9DO), ATCH_SALIDA (atc-trello-historial.json).
"""
import os, sys, json, datetime, urllib.request, urllib.parse

API = "https://api.trello.com/1"
SALIDA = os.environ.get("ATCH_SALIDA", "atc-trello-historial.json")
BOARD = os.environ.get("TRELLO_BOARD_ID", "cFbJp9DO")
BO = datetime.timezone(datetime.timedelta(hours=-4))


def trello_json(path, extra=None):
    p = {"key": os.environ["TRELLO_API_KEY"], "token": os.environ["TRELLO_TOKEN"]}
    p.update(extra or {})
    with urllib.request.urlopen(API + path + "?" + urllib.parse.urlencode(p), timeout=60) as r:
        return json.loads(r.read().decode())


def dia_bo(iso_utc):
    """«2026-08-19T14:03:22.000Z» → «2026-08-19» en hora de Bolivia."""
    try:
        t = datetime.datetime.strptime(str(iso_utc)[:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=datetime.timezone.utc)
        return t.astimezone(BO).date().isoformat()
    except (ValueError, TypeError):
        return ""


def creada_ms(card_id):
    """Cuándo se creó la tarjeta, en milisegundos (los primeros 8 caracteres del id son los segundos)."""
    try:
        return int(card_id[:8], 16) * 1000
    except (ValueError, TypeError):
        return 0


def armar(listas, cards, acciones):
    """Sin red: junta todo en lo que guarda el JSON. `listas` y `cards` como los da la API; `acciones` = todas las del tablero."""
    nom = {l["id"]: str(l.get("name") or "").strip() for l in listas}
    pasos = {}                                   # id de tarjeta → {lista: primer día}
    for a in sorted(acciones, key=lambda a: str(a.get("date") or "")):
        d = a.get("data") or {}
        cid = (d.get("card") or {}).get("id")
        if not cid:
            continue
        lista = None
        if a.get("type") == "updateCard" and d.get("listAfter"):
            lista = d["listAfter"].get("id")
        elif a.get("type") in ("createCard", "copyCard", "convertToCardFromCheckItem", "moveCardToBoard", "emailCard"):
            lista = (d.get("list") or {}).get("id")
        if not lista:
            continue
        p = pasos.setdefault(cid, {})
        n = nom.get(lista) or ((d.get("listAfter") or d.get("list") or {}).get("name") or "").strip()
        f = dia_bo(a.get("date"))
        if n and f and n not in p:
            p[n] = f
    out = []
    for c in cards:
        cid = c.get("id") or ""
        ms = creada_ms(cid)
        p = pasos.get(cid, {})
        out.append({
            "sl": c.get("shortLink") or "",
            "creada": datetime.datetime.fromtimestamp(ms / 1000, BO).date().isoformat() if ms else "",
            "creadaMs": ms,
            "lista": nom.get(c.get("idList"), ""),
            "archivada": bool(c.get("closed")),
            "ultima": dia_bo(c.get("dateLastActivity")),
            "pasos": [{"l": k, "f": v} for k, v in sorted(p.items(), key=lambda kv: kv[1])],
        })
    out.sort(key=lambda x: x["creadaMs"])
    return out


def todas_las_acciones():
    """Las acciones del tablero de a 1000, hacia atrás, hasta que no haya más."""
    tipos = "createCard,copyCard,convertToCardFromCheckItem,moveCardToBoard,emailCard,updateCard:idList"
    todas, antes = [], None
    for _ in range(50):
        q = {"filter": tipos, "limit": "1000", "fields": "id,type,date,data"}
        if antes:
            q["before"] = antes
        lote = trello_json("/boards/%s/actions" % BOARD, q)
        if not lote:
            break
        todas.extend(lote)
        antes = lote[-1]["id"]
        if len(lote) < 1000:
            break
    return todas


def main():
    if not os.environ.get("TRELLO_API_KEY") or not os.environ.get("TRELLO_TOKEN"):
        print("❌ Faltan TRELLO_API_KEY / TRELLO_TOKEN")
        return 1
    listas = trello_json("/boards/%s/lists" % BOARD, {"filter": "all", "fields": "id,name,closed"})
    cards = trello_json("/boards/%s/cards" % BOARD, {"filter": "all", "fields": "id,shortLink,idList,closed,dateLastActivity"})
    acciones = todas_las_acciones()
    tarj = armar(listas, cards, acciones)
    hoy = datetime.datetime.now(BO)
    with open(SALIDA, "w", encoding="utf-8") as f:
        json.dump({"generado": hoy.isoformat(timespec="seconds"), "tablero": BOARD,
                   "listas": [str(l.get("name") or "").strip() for l in listas], "tarjetas": tarj}, f, ensure_ascii=False, indent=1)
    # solo cuentas: el registro es público
    con_pasos = sum(1 for t in tarj if t["pasos"])
    por_lista = {}
    for t in tarj:
        k = t["lista"] + (" (archivada)" if t["archivada"] else "")
        por_lista[k] = por_lista.get(k, 0) + 1
    meses = {}
    for t in tarj:
        meses[t["creada"][:7]] = meses.get(t["creada"][:7], 0) + 1
    print("listas: %d · tarjetas: %d · movimientos leídos: %d · tarjetas con su viaje: %d" % (len(listas), len(tarj), len(acciones), con_pasos))
    for k in sorted(por_lista, key=lambda k: -por_lista[k]):
        print("  · %s: %d" % (k, por_lista[k]))
    print("creadas por mes: " + " · ".join("%s %d" % (m, meses[m]) for m in sorted(meses)))
    pasaron = {}
    for t in tarj:
        for p in t["pasos"]:
            pasaron[p["l"]] = pasaron.get(p["l"], 0) + 1
    print("pasaron alguna vez por: " + " · ".join("%s %d" % (k, v) for k, v in sorted(pasaron.items(), key=lambda kv: -kv[1])))
    return 0


if __name__ == "__main__":
    sys.exit(main())
