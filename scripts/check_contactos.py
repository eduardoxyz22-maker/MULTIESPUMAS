#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Verifica una lista de contactos (nombre + teléfono) contra Kommo CRM.
Solo LECTURA. Busca cada teléfono (y, si no hay, el nombre) con el parámetro
`query` de /contacts. Imprime ENCONTRADO / NO ENCONTRADO + a qué vendedora
pertenece el lead. Pensado para correr en GitHub Actions (usa KOMMO_TOKEN).
"""
import os, sys, json, time
import urllib.parse as _ps, urllib.request as _rq, urllib.error as _er

SUBDOMAIN = (os.environ.get("KOMMO_SUBDOMAIN", "") or "").strip() or "eanez"
BASE  = f"https://{SUBDOMAIN}.kommo.com/api/v4"
TOKEN = os.environ.get("KOMMO_TOKEN", "").strip()

def api_get(path, params=None, _retry=0):
    url = BASE + path + ("?" + _ps.urlencode(params) if params else "")
    req = _rq.Request(url, headers={"Authorization": "Bearer " + TOKEN,
                                    "Content-Type": "application/json"})
    try:
        with _rq.urlopen(req, timeout=40) as r:
            if r.status == 204:
                return {}
            return json.loads(r.read().decode("utf-8"))
    except _er.HTTPError as e:
        if e.code == 429 and _retry < 4:
            time.sleep(2 ** _retry * 3); return api_get(path, params, _retry + 1)
        if e.code == 204:
            return {}
        return {"_http_error": e.code}
    except Exception as ex:
        if _retry < 2:
            time.sleep(2); return api_get(path, params, _retry + 1)
        return {"_error": str(ex)}

# ── mapa de usuarios (para saber de qué vendedora es cada lead) ──
users = {}
page = 1
while page <= 10:
    d = api_get("/users", {"page": page, "limit": 250})
    batch = (d.get("_embedded", {}) or {}).get("users", [])
    if not batch:
        break
    for u in batch:
        users[u["id"]] = (u.get("name", "") or "").split(" - ", 1)[0].strip()
    if "next" not in (d.get("_links", {}) or {}):
        break
    page += 1

# (vendedora declarada, nombre, teléfono)  — teléfono "" = buscar por nombre
CONTACTS = [
    ("JONATHAN", "Vanesa Gutierrez",     "75382175"),
    ("JONATHAN", "Nicole Ardaya",        "76331133"),
    ("JONATHAN", "Juan Carlos",          "77647530"),
    ("JONATHAN", "margarita",            "72684780"),
    ("JONATHAN", "Bismar flores",        "73191450"),
    ("JONATHAN", "Jose Luis Fernandez",  "71494500"),
    ("JONATHAN", "Silvia Barba",         "62022215"),
    ("JONATHAN", "Adriana Calderon",     "71445389"),
    ("CAROLA",   "Richar",               "75485016"),
    ("CAROLA",   "Carlos",               "67790184"),
    ("CAROLA",   "Carla Landa",          "78409221"),
    ("CAROLA",   "Tito Cabrera",         "77384354"),
    ("CAROLA",   "Priscila Yucra",       "79055000"),
    ("CAROLA",   "Erika Menacho",        "61343863"),
    ("CAROLA",   "Patricia Auza",        "76801244"),
    ("MARIA",    "Naira adriana",        ""),
    ("MARIA",    "Nancy Vargas",         "62102545"),
    ("MARIA",    "Wanda",                "78185151"),
    ("MARIA",    "Carlos Gudine",        ""),
    ("MARIA",    "Mariela",              "65120388"),
    ("ISABEL",   "Mauricio Canseco",     "72176880"),
    ("ISABEL",   "tvo",                  "79411482"),
    ("ISABEL",   "Anahi",                "75656905"),
    ("ISABEL",   "Armando",              "71232993"),
    ("MIRIAN",   "Eriberto garcia",      "76091976"),
    ("MIRIAN",   "Javier jimenez",       "78050352"),
    ("MIRIAN",   "oscar o patricia ortiz","70097575"),
    ("MIRIAN",   "yngrid",               "75374817"),
    ("MIRIAN",   "robin sanchez",        "77692362"),
    ("MIRIAN",   "ana maria jimenez",    "70862789"),
]

def digits(s):
    return "".join(ch for ch in str(s) if ch.isdigit())

def phones_of(contact):
    out = []
    for cf in (contact.get("custom_fields_values") or []):
        code = (cf.get("field_code") or "").upper()
        if code == "PHONE" or "PHONE" in code or (cf.get("field_name") or "").lower().startswith("tel"):
            for v in (cf.get("values") or []):
                out.append(digits(v.get("value", "")))
    return out

def resp_names(contact):
    """Vendedora(s) responsable(s): del contacto y de sus leads."""
    names = set()
    r = contact.get("responsible_user_id")
    if r and users.get(r):
        names.add(users[r])
    for ln in ((contact.get("_embedded", {}) or {}).get("leads", []) or []):
        lid = ln.get("id")
        if lid:
            ld = api_get(f"/leads/{lid}")
            ru = ld.get("responsible_user_id")
            if ru and users.get(ru):
                names.add(users[ru])
    return sorted(names)

print("=" * 72)
print(f"CHECK CONTACTOS vs KOMMO · subdominio={SUBDOMAIN} · token_len={len(TOKEN)}")
print("=" * 72)

encontrados, faltan = [], []
for vend, name, phone in CONTACTS:
    key8 = digits(phone)[-8:] if phone else ""
    query = phone if phone else name
    d = api_get("/contacts", {"query": query, "with": "leads", "limit": 25})
    if d.get("_http_error") or d.get("_error"):
        print(f"⚠ ERROR consultando '{query}': {d}")
        continue
    cs = (d.get("_embedded", {}) or {}).get("contacts", []) or []

    match = None
    if phone:
        # exige que el teléfono coincida (últimos 8 dígitos)
        for c in cs:
            if any(ph.endswith(key8) for ph in phones_of(c) if ph):
                match = c; break
    else:
        # sin teléfono: match por nombre aproximado
        nlow = name.lower()
        for c in cs:
            if nlow.split()[0] in (c.get("name", "") or "").lower():
                match = c; break

    if match:
        who = ", ".join(resp_names(match)) or "sin responsable"
        nleads = len((match.get("_embedded", {}) or {}).get("leads", []) or [])
        cname = match.get("name", "(sin nombre)")
        print(f"✅ {vend:9} | {name:24} | {phone or '(sin tel)':10} | EN CRM → \"{cname}\" · resp={who} · leads={nleads}")
        encontrados.append((vend, name, phone, who))
    else:
        extra = f" (hay {len(cs)} contacto(s) con ese texto pero el teléfono no coincide)" if cs and phone else ""
        print(f"❌ {vend:9} | {name:24} | {phone or '(sin tel)':10} | NO ESTÁ EN CRM{extra}")
        faltan.append((vend, name, phone))
    time.sleep(0.15)

print("=" * 72)
print(f"RESUMEN: {len(encontrados)} en CRM · {len(faltan)} NO están")
print("--- NO ESTÁN EN CRM ---")
for vend, name, phone in faltan:
    print(f"   • {vend}: {name} {phone}")
print("=" * 72)
