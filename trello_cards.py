import os
import urllib.request
import urllib.parse
import json

TRELLO_KEY   = os.environ["TRELLO_API_KEY"]
TRELLO_TOKEN = os.environ["TRELLO_TOKEN"]
BOARD_ID     = os.environ.get("TRELLO_BOARD_ID", "cFbJp9DO")

TRELLO_API = "https://api.trello.com/1"


def trello_get(path, extra_params=None):
    params = {"key": TRELLO_KEY, "token": TRELLO_TOKEN}
    if extra_params:
        params.update(extra_params)
    url = TRELLO_API + path + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())


def fetch_board_cards(board_id=BOARD_ID):
    """Return all open cards on the board with key fields."""
    cards = trello_get(f"/boards/{board_id}/cards", {
        "fields": "id,name,desc,idList,idMembers,labels,due,url,pos",
    })
    return cards


def fetch_board_lists(board_id=BOARD_ID):
    """Return all lists (columns) on the board."""
    return trello_get(f"/boards/{board_id}/lists", {"fields": "id,name,pos"})


def fetch_board_members(board_id=BOARD_ID):
    """Return all members of the board."""
    return trello_get(f"/boards/{board_id}/members", {"fields": "id,fullName,username"})


def get_cards_by_list(board_id=BOARD_ID):
    """Return cards grouped by list name, with member names resolved."""
    lists   = fetch_board_lists(board_id)
    members = fetch_board_members(board_id)
    cards   = fetch_board_cards(board_id)

    list_map   = {l["id"]: l["name"] for l in lists}
    member_map = {m["id"]: m.get("fullName") or m["username"] for m in members}

    grouped = {l["name"]: [] for l in sorted(lists, key=lambda x: x["pos"])}

    for card in cards:
        list_name = list_map.get(card["idList"], "Sin lista")
        if list_name not in grouped:
            grouped[list_name] = []
        grouped[list_name].append({
            "id":      card["id"],
            "name":    card["name"],
            "desc":    card["desc"],
            "due":     card.get("due"),
            "labels":  [lb["name"] for lb in card.get("labels", [])],
            "members": [member_map.get(mid, mid) for mid in card.get("idMembers", [])],
            "url":     card.get("url", ""),
        })

    return grouped


if __name__ == "__main__":
    print(f"Obteniendo tarjetas del tablero {BOARD_ID}...")
    try:
        grouped = get_cards_by_list()
        total = sum(len(v) for v in grouped.values())
        print(f"Total tarjetas: {total}\n")
        for list_name, cards in grouped.items():
            print(f"── {list_name} ({len(cards)})")
            for c in cards:
                due  = f" [vence: {c['due'][:10]}]" if c.get("due") else ""
                mems = f" @{', '.join(c['members'])}" if c["members"] else ""
                print(f"   • {c['name']}{due}{mems}")
        print("\nJSON completo:")
        print(json.dumps(grouped, ensure_ascii=False, indent=2))
    except Exception as e:
        print(f"Error: {e}")
