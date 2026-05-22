"""
trello_report.py — Reporte completo de tableros Trello
Exporta a:  reporte_trello.md   (Markdown)
            reporte_trello.csv  (CSV)

Uso:
    python trello_report.py
Variables de entorno requeridas:
    TRELLO_API_KEY
    TRELLO_TOKEN
"""

import os
import csv
import json
import urllib.request
import urllib.parse
import datetime

TRELLO_KEY   = os.environ["TRELLO_API_KEY"]
TRELLO_TOKEN = os.environ["TRELLO_TOKEN"]
TRELLO_API   = "https://api.trello.com/1"

MD_FILE  = "reporte_trello.md"
CSV_FILE = "reporte_trello.csv"


def trello_get(path, extra=None):
    params = {"key": TRELLO_KEY, "token": TRELLO_TOKEN}
    if extra:
        params.update(extra)
    url = TRELLO_API + path + "?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(urllib.request.Request(url)) as r:
        return json.loads(r.read().decode())


def fmt_date(iso):
    if not iso:
        return ""
    try:
        return datetime.datetime.fromisoformat(iso.rstrip("Z")).strftime("%d/%m/%Y")
    except Exception:
        return iso[:10]


def card_status(card):
    if card.get("dueComplete"):
        return "Completada"
    due = card.get("due")
    if due:
        due_dt = datetime.datetime.fromisoformat(due.rstrip("Z"))
        if due_dt < datetime.datetime.utcnow():
            return "Vencida"
        return "Pendiente"
    return "Sin fecha"


def fetch_all():
    print("Obteniendo tableros...")
    boards = trello_get("/members/me/boards", {
        "fields": "id,name,url,closed",
        "filter": "open",
    })

    report = []

    for board in boards:
        bid   = board["id"]
        bname = board["name"]
        burl  = board.get("url", "")
        print(f"  Tablero: {bname}")

        lists = trello_get(f"/boards/{bid}/lists", {
            "fields": "id,name,closed",
            "filter": "open",
        })
        list_map = {l["id"]: l["name"] for l in lists}

        members_raw = trello_get(f"/boards/{bid}/members", {
            "fields": "id,fullName,username",
        })
        member_map = {m["id"]: m.get("fullName") or m["username"] for m in members_raw}

        cards = trello_get(f"/boards/{bid}/cards", {
            "fields": "id,name,desc,idList,idMembers,labels,due,dueComplete,url,pos,closed",
            "filter": "all",
        })

        board_data = {
            "id":    bid,
            "name":  bname,
            "url":   burl,
            "lists": {l["id"]: {"name": l["name"], "cards": []} for l in lists},
            "list_order": [l["id"] for l in lists],
        }

        for card in cards:
            lid = card.get("idList")
            if lid not in board_data["lists"]:
                continue
            board_data["lists"][lid]["cards"].append({
                "id":       card["id"],
                "name":     card["name"],
                "desc":     card.get("desc", "").strip(),
                "due":      fmt_date(card.get("due")),
                "due_raw":  card.get("due"),
                "done":     card.get("dueComplete", False),
                "labels":   ", ".join(lb.get("name") or lb.get("color","") for lb in card.get("labels", [])),
                "members":  ", ".join(member_map.get(mid, mid) for mid in card.get("idMembers", [])),
                "status":   card_status(card),
                "url":      card.get("url", ""),
                "closed":   card.get("closed", False),
            })

        report.append(board_data)

    return report, list_map


def write_markdown(report):
    now = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
    lines = []
    lines.append(f"# Reporte Completo de Trello\n")
    lines.append(f"_Generado: {now}_\n")
    lines.append("---\n")

    total_boards = len(report)
    total_cards  = sum(
        len(lst["cards"])
        for bd in report
        for lst in bd["lists"].values()
    )
    lines.append(f"**Tableros activos:** {total_boards}  ")
    lines.append(f"**Total tarjetas:** {total_cards}\n")
    lines.append("---\n")

    for bd in report:
        lines.append(f"## 📋 {bd['name']}\n")
        if bd.get("url"):
            lines.append(f"> {bd['url']}\n")

        for lid in bd["list_order"]:
            lst = bd["lists"].get(lid)
            if lst is None:
                continue
            cards = lst["cards"]
            lines.append(f"### 📁 {lst['name']} ({len(cards)} tarjetas)\n")

            if not cards:
                lines.append("_Sin tarjetas._\n")
                continue

            for c in cards:
                status_icon = {"Completada": "✅", "Vencida": "🔴", "Pendiente": "🟡"}.get(c["status"], "⬜")
                lines.append(f"#### {status_icon} {c['name']}\n")
                if c["desc"]:
                    lines.append(f"**Descripción:** {c['desc']}  ")
                if c["due"]:
                    lines.append(f"**Vencimiento:** {c['due']}  ")
                if c["labels"]:
                    lines.append(f"**Etiquetas:** `{c['labels']}`  ")
                if c["members"]:
                    lines.append(f"**Asignado a:** {c['members']}  ")
                lines.append(f"**Estado:** {c['status']}  ")
                if c.get("closed"):
                    lines.append("**Archivada:** Sí  ")
                if c.get("url"):
                    lines.append(f"**URL:** {c['url']}  ")
                lines.append("")

        lines.append("---\n")

    with open(MD_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"Markdown exportado → {MD_FILE}")


def write_csv(report):
    rows = []
    for bd in report:
        for lid in bd["list_order"]:
            lst = bd["lists"].get(lid)
            if lst is None:
                continue
            for c in lst["cards"]:
                rows.append({
                    "Tablero":       bd["name"],
                    "Lista":         lst["name"],
                    "Tarjeta":       c["name"],
                    "Descripcion":   c["desc"].replace("\n", " "),
                    "Vencimiento":   c["due"],
                    "Estado":        c["status"],
                    "Completada":    "Sí" if c["done"] else "No",
                    "Etiquetas":     c["labels"],
                    "Asignado_a":    c["members"],
                    "Archivada":     "Sí" if c["closed"] else "No",
                    "URL":           c["url"],
                })

    if not rows:
        print("Sin tarjetas para exportar a CSV.")
        return

    fieldnames = list(rows[0].keys())
    with open(CSV_FILE, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"CSV exportado → {CSV_FILE} ({len(rows)} tarjetas)")


def print_summary(report):
    print("\n" + "="*60)
    print("RESUMEN")
    print("="*60)
    for bd in report:
        total = sum(len(lst["cards"]) for lst in bd["lists"].values())
        done  = sum(1 for lst in bd["lists"].values() for c in lst["cards"] if c["status"] == "Completada")
        overdue = sum(1 for lst in bd["lists"].values() for c in lst["cards"] if c["status"] == "Vencida")
        print(f"\n{bd['name']}")
        for lid in bd["list_order"]:
            lst = bd["lists"].get(lid)
            if lst:
                print(f"  └─ {lst['name']}: {len(lst['cards'])} tarjetas")
        print(f"  Total: {total} | ✅ Completadas: {done} | 🔴 Vencidas: {overdue}")


if __name__ == "__main__":
    report, _ = fetch_all()
    write_markdown(report)
    write_csv(report)
    print_summary(report)
    print(f"\nArchivos generados:\n  • {MD_FILE}\n  • {CSV_FILE}")
