#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🔎 RELEVAMIENTO DE KOMMO — solo lectura, para diseñar la integración con el panel de pedidos.

No modifica NADA en Kommo. Solo pregunta y describe: qué pipelines y etapas hay, qué campos
personalizados tiene un lead y un contacto, cómo se guardan los productos, y si el plan
permite webhooks.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  ESTE REPOSITORIO ES PÚBLICO, ASÍ QUE EL REGISTRO DE ACTIONS TAMBIÉN LO ES.
    Por eso este script NO IMPRIME NUNCA datos de clientes: ni nombres, ni teléfonos, ni
    direcciones, ni el texto de ningún campo libre. De los leads de muestra solo dice QUÉ
    campo está lleno y DE QUÉ FORMA ("texto de 24 caracteres", "fecha", "número"), que es lo
    único que hace falta para mapear.
    Los nombres de ETAPAS, CAMPOS y PRODUCTOS sí se imprimen: son configuración del negocio,
    no datos personales, y son justamente lo que hay que ver.
    El token nunca se imprime: solo su largo, para saber si llegó.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cómo se corre:  GitHub → Actions → "Relevar Kommo (solo lectura)" → Run workflow.
El resultado queda en el propio registro de la corrida.
"""
import os, sys, json, time
import urllib.request as _rq, urllib.parse as _ps, urllib.error as _er

SUBDOMAIN = (os.environ.get("KOMMO_SUBDOMAIN", "") or "").strip() or "eanez"
BASE_URL  = f"https://{SUBDOMAIN}.kommo.com/api/v4"
TOKEN     = os.environ.get("KOMMO_TOKEN", "").strip()

# Cuántos leads de muestra se miran para deducir la forma de los datos. Pocos a propósito:
# no hace falta más para ver la estructura, y menos llamadas es menos riesgo de rate limit.
MUESTRA = 25

# En Kommo estos dos ids son FIJOS en todos los embudos: la etapa ganada siempre es 142 y la
# perdida siempre 143, aunque el negocio les cambie el nombre. Se ven a simple vista porque
# son números chiquitos al lado de los ids de 9 dígitos de las etapas creadas por el usuario.
#
# ⚠️ NO usar `status.type` para esto: en Kommo `type=1` significa «Leads Entrantes»
#    (lo no clasificado), NO «ganado». La primera versión de este script se equivocó
#    justo ahí y marcó «Leads Entrantes» como el cierre de venta.
ID_GANADO, ID_PERDIDO = 142, 143


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
            return {"__http__": e.code}
        return {"__http__": e.code, "__error__": True}
    except Exception as ex:
        if _retry < 2:
            time.sleep(2)
            return api_get(path, params, _retry + 1)
        return {"__excepcion__": type(ex).__name__}


def emb(d, k):
    return ((d or {}).get("_embedded", {}) or {}).get(k, []) or []


def forma(v):
    """
    Describe un valor SIN mostrarlo. Es el corazón de la protección de datos de este script:
    de un teléfono dice "número de 8 dígitos", no el teléfono.
    """
    if v is None:
        return "vacío"
    if isinstance(v, bool):
        return "sí/no"
    if isinstance(v, (int, float)):
        s = str(v)
        # Un entero de 10 cifras suele ser una fecha en formato UNIX.
        if isinstance(v, int) and 1_000_000_000 < v < 2_000_000_000:
            return "fecha (timestamp)"
        return f"número de {len(s.replace('-','').replace('.',''))} dígitos"
    if isinstance(v, list):
        return f"lista de {len(v)}"
    if isinstance(v, dict):
        return "objeto"
    s = str(v).strip()
    if not s:
        return "vacío"
    if s.startswith("http"):
        return "enlace"
    solo_num = s.replace("+", "").replace(" ", "").replace("-", "")
    if solo_num.isdigit():
        return f"número de {len(solo_num)} dígitos"
    return f"texto de {len(s)} caracteres"


def titulo(t):
    print("\n" + "═" * 78)
    print("  " + t)
    print("═" * 78)


def main():
    if not TOKEN:
        sys.exit("✗ Falta KOMMO_TOKEN (secret de GitHub Actions).")

    print("🔎 RELEVAMIENTO DE KOMMO — solo lectura")
    print(f"   subdominio: {SUBDOMAIN}   ·   token recibido: {len(TOKEN)} caracteres")
    print("   ⚠️ Este registro es PÚBLICO: no se imprime ningún dato de clientes.")

    # ── 1. ¿El token sirve? ───────────────────────────────────────────────────
    titulo("1 · CONEXIÓN")
    acc = api_get("/account")
    if acc.get("__http__") or acc.get("__excepcion__"):
        print(f"   ✗ No se pudo entrar a la cuenta: {acc}")
        print("     Si dice 401, el token venció o es inválido. Hay que generar uno nuevo en")
        print("     Kommo → Configuración → Integraciones → API, y actualizar el secret KOMMO_TOKEN.")
        sys.exit(1)
    print(f"   ✓ Conectado. Cuenta id={acc.get('id')}")

    # ── 2. Pipelines y etapas: acá se decide QUÉ dispara el pedido ────────────
    titulo("2 · PIPELINES Y ETAPAS  (de acá sale qué etapa dispara el pedido)")
    pipes = emb(api_get("/leads/pipelines"), "pipelines")
    if not pipes:
        print("   ✗ No devolvió pipelines.")
    pipe_principal, etapa_ganada, etapa_compradores = None, None, None
    for p in pipes:
        es_main = bool(p.get("is_main"))
        if es_main or pipe_principal is None:
            pipe_principal = p.get("id")
        print(f"\n   ▸ PIPELINE «{p.get('name')}»   id={p.get('id')}"
              + ("   [principal]" if es_main else ""))
        for s in emb(p, "statuses"):
            sid, nom = s.get("id"), (s.get("name") or "")
            marca = ""
            if sid == ID_GANADO:
                marca = "  ← ✅ GANADO (cierre de venta)"
                if es_main or etapa_ganada is None:
                    etapa_ganada = sid
            elif sid == ID_PERDIDO:
                marca = "  ← ❌ PERDIDO"
            elif s.get("type") == 1:
                marca = "  ← 📥 sin clasificar (Leads Entrantes)"
            if "comprador" in nom.lower() and (es_main or etapa_compradores is None):
                etapa_compradores = sid
            print(f"        etapa id={str(sid):<12} type={s.get('type')}  «{nom}»{marca}")

    # ── 3. Campos del LEAD: acá está lo que se puede mapear al pedido ─────────
    titulo("3 · CAMPOS PERSONALIZADOS DEL LEAD")
    campos_lead = emb(api_get("/leads/custom_fields", {"limit": 250}), "custom_fields")
    if not campos_lead:
        print("   (ninguno)")
    for c in campos_lead:
        linea = f"   id={str(c.get('id')):<12} tipo={str(c.get('type')):<14} «{c.get('name')}»"
        print(linea)
        for e in (c.get("enums") or [])[:20]:
            print(f"        · opción: «{e.get('value')}»  (id={e.get('id')})")

    # ── 4. Campos del CONTACTO: el teléfono suele vivir acá ───────────────────
    titulo("4 · CAMPOS DEL CONTACTO  (el celular casi siempre está acá, no en el lead)")
    for c in emb(api_get("/contacts/custom_fields", {"limit": 250}), "custom_fields"):
        print(f"   id={str(c.get('id')):<12} tipo={str(c.get('type')):<14} «{c.get('name')}»")

    # ── 5. ¿Qué le falta a Kommo para armar un pedido completo? ───────────────
    titulo("5 · ¿ESTÁN LOS DATOS DE ENTREGA?")
    # ⚠️ Ojo con este bloque: la primera versión juntaba todos los nombres en un solo texto y
    #    preguntaba si aparecía la palabra. Así, «Dirección entrega» daba por buenos DOS
    #    casilleros a la vez —dirección y fecha de entrega— y el relevamiento dijo que Kommo
    #    tenía fecha de entrega cuando no la tiene. Ahora se mira campo por campo, se exige el
    #    tipo correcto, y se imprime CUÁL campo dio la coincidencia para poder auditarlo.
    FECHAS = ("date", "date_time", "birthday")
    busca = [
        ("fecha de entrega", ["entrega", "delivery", "despacho"], FECHAS),
        ("turno AM/PM",      ["turno", "horario", "am/pm"],       None),
        ("zona",             ["zona", "barrio", "sector"],        None),
        ("dirección",        ["direccion", "dirección", "domicilio"], None),
        ("link de Maps",     ["maps", "ubicacion", "ubicación", "gps", "coordenada"], None),
    ]
    faltan = []
    for etiqueta, claves, tipos in busca:
        hallado = None
        for c in campos_lead:
            n = (c.get("name") or "").lower()
            if any(k in n for k in claves) and (tipos is None or c.get("type") in tipos):
                hallado = c
                break
        if hallado:
            print(f"   ✓ {etiqueta}   → lo cubre «{hallado.get('name')}» "
                  f"(id={hallado.get('id')}, tipo={hallado.get('type')})")
        else:
            print(f"   ✗ {etiqueta}")
            faltan.append(etiqueta)
    if faltan:
        print(f"\n   → Kommo NO tiene: {', '.join(faltan)}.")
        print("     Son los datos con los que el panel arma la ruta y controla los cupos.")
        print("     O se crean esos campos en Kommo, o el lead entra al panel como BORRADOR")
        print("     y alguien completa la entrega ahí. (Ver el plan en la bitácora.)")

    # ── 6. Los PRODUCTOS ──────────────────────────────────────────────────────
    titulo("6 · PRODUCTOS  (¿catálogo vinculado o campo de texto?)")
    cats = emb(api_get("/catalogs", {"limit": 50}), "catalogs")
    if not cats:
        print("   ✗ No hay catálogos, o el plan no los incluye.")
        print("     Entonces los productos vienen como texto en algún campo del lead.")
    for c in cats:
        print(f"   ▸ CATÁLOGO «{c.get('name')}»  id={c.get('id')}  tipo={c.get('type')}")
        cf = emb(api_get(f"/catalogs/{c.get('id')}/custom_fields", {"limit": 100}), "custom_fields")
        for f in cf:
            print(f"        campo id={str(f.get('id')):<12} tipo={str(f.get('type')):<12} «{f.get('name')}»")
        els = emb(api_get(f"/catalogs/{c.get('id')}/elements", {"limit": 5}), "elements")
        print(f"        elementos de muestra: {len(els)}")
        for e in els[:3]:
            # El NOMBRE del producto es catálogo del negocio, no dato personal: se puede ver.
            print(f"          · «{e.get('name')}»  id={e.get('id')}")

    # ── 7. Cómo viene un lead de verdad (SIN datos personales) ────────────────
    #
    # ⚠️ La primera versión pedía /leads sin ordenar. Kommo devuelve los MÁS VIEJOS primero,
    #    así que la muestra eran los primeros leads de la historia de la cuenta —casi vacíos—
    #    y de ahí salió el "0 de 25 con productos", que no decía nada de cómo se trabaja hoy.
    #    Ahora se pide de lo más nuevo hacia atrás Y se mira aparte la etapa donde la venta
    #    ya está cerrada, que es la única muestra que sirve para decidir la integración.
    titulo("7 · FORMA DE UN LEAD REAL  (qué campos vienen llenos — sin mostrar contenido)")
    nombre_de = {c.get("id"): c.get("name") for c in campos_lead}
    BASE = {"limit": MUESTRA, "with": "contacts,catalog_elements", "order[id]": "desc"}

    def mirar(etiqueta, extra=None):
        params = dict(BASE)
        if extra:
            params.update(extra)
        leads = emb(api_get("/leads", params), "leads")
        print(f"\n   ▸ {etiqueta}")
        if not leads:
            print("      (no devolvió ninguno)")
            return
        lleno, formas, con_prod, con_contacto, con_precio = {}, {}, 0, 0, 0
        for L in leads:
            for cv in (L.get("custom_fields_values") or []):
                fid = cv.get("field_id")
                vals = cv.get("values") or []
                v = vals[0].get("value") if vals else None
                if v not in (None, ""):
                    lleno[fid] = lleno.get(fid, 0) + 1
                    formas.setdefault(fid, set()).add(forma(v))
            if emb(L, "catalog_elements"):
                con_prod += 1
            if emb(L, "contacts"):
                con_contacto += 1
            if L.get("price"):
                con_precio += 1
        n = len(leads)
        print(f"      leads mirados: {n}")
        print(f"      con productos del catálogo enganchados: {con_prod} de {n}"
              + ("   ⚠️ ← acá se cae la carga automática de productos" if not con_prod else ""))
        print(f"      con contacto vinculado:                 {con_contacto} de {n}")
        print(f"      con monto (price) cargado:              {con_precio} de {n}")
        if lleno:
            print("      qué tan seguido viene lleno cada campo:")
            for fid, veces in sorted(lleno.items(), key=lambda x: -x[1]):
                nom = nombre_de.get(fid, f"(campo {fid})")
                print(f"         {veces:>3}/{n}  «{nom}»   → {', '.join(sorted(formas.get(fid, [])))}")
        else:
            print("      ⚠️ ningún campo personalizado viene lleno en esta muestra.")

        ej = next((L for L in leads if emb(L, "catalog_elements")), None)
        if ej:
            print("      un lead con productos, elemento por elemento:")
            for ce in emb(ej, "catalog_elements"):
                meta = ce.get("metadata") or {}
                print(f"         · elemento id={ce.get('id')}  cantidad={meta.get('quantity')}"
                      f"  precio={'sí' if meta.get('price_id') or meta.get('price') else 'no'}"
                      f"  catálogo={ce.get('catalog_id')}")

    mirar("LOS 25 MÁS NUEVOS (cualquier etapa)")
    if pipe_principal and etapa_ganada:
        mirar(f"LOS 25 MÁS NUEVOS YA GANADOS (etapa {etapa_ganada}) ← la muestra que decide",
              {"filter[statuses][0][pipeline_id]": pipe_principal,
               "filter[statuses][0][status_id]":  etapa_ganada})
    if pipe_principal and etapa_compradores:
        mirar(f"LOS 25 MÁS NUEVOS EN «Compradores» (etapa {etapa_compradores})",
              {"filter[statuses][0][pipeline_id]": pipe_principal,
               "filter[statuses][0][status_id]":  etapa_compradores})

    # ── 7b. ¿El celular está cargado en el contacto? ──────────────────────────
    titulo("7b · CONTACTOS  (¿viene el celular, que en el panel es obligatorio?)")
    cts = emb(api_get("/contacts", {"limit": MUESTRA, "order[id]": "desc"}), "contacts")
    print(f"   Contactos mirados: {len(cts)}")
    if cts:
        campos_ct = emb(api_get("/contacts/custom_fields", {"limit": 250}), "custom_fields")
        nom_ct = {c.get("id"): c.get("name") for c in campos_ct}
        lleno_ct, formas_ct = {}, {}
        for c in cts:
            for cv in (c.get("custom_fields_values") or []):
                fid = cv.get("field_id")
                vals = cv.get("values") or []
                v = vals[0].get("value") if vals else None
                if v not in (None, ""):
                    lleno_ct[fid] = lleno_ct.get(fid, 0) + 1
                    formas_ct.setdefault(fid, set()).add(forma(v))
        for fid, veces in sorted(lleno_ct.items(), key=lambda x: -x[1]):
            print(f"      {veces:>3}/{len(cts)}  «{nom_ct.get(fid, f'(campo {fid})')}»"
                  f"   → {', '.join(sorted(formas_ct.get(fid, [])))}")
        if not lleno_ct:
            print("      ⚠️ ningún campo del contacto viene lleno en esta muestra.")

    # ── 8. Vendedoras ─────────────────────────────────────────────────────────
    titulo("8 · USUARIOS  (para cruzar el responsable del lead con la vendedora del panel)")
    for u in emb(api_get("/users", {"limit": 100}), "users"):
        print(f"   id={str(u.get('id')):<10} «{u.get('name')}»")

    # ── 9. Webhooks ───────────────────────────────────────────────────────────
    titulo("9 · WEBHOOKS  (¿puede Kommo avisarle al panel solo?)")
    wh = api_get("/webhooks")
    if wh.get("__http__") or wh.get("__error__"):
        print(f"   ✗ No se pudo consultar (HTTP {wh.get('__http__')}).")
        print("     Puede ser que el plan no incluya webhooks o que el token no tenga permiso.")
        print("     → En ese caso la integración va por CONSULTA PERIÓDICA, que funciona igual.")
    else:
        lista = emb(wh, "webhooks")
        print(f"   Webhooks configurados hoy: {len(lista)}")
        for w in lista:
            print(f"      · id={w.get('id')}  {w.get('destination')}")
            print(f"        eventos={w.get('settings')}"
                  f"   {'⛔ DESACTIVADO' if w.get('disabled') else '✓ activo'}")
        if lista:
            print("   ✓ El plan SÍ permite webhooks (hay al menos uno andando).")
            print("     Si alguno escucha 'status_lead', Kommo ya avisa solo cuando una venta")
            print("     cambia de etapa: no haría falta preguntarle cada 10 minutos.")
        else:
            print("   ✓ El plan permite webhooks, pero hoy no hay ninguno configurado.")

    titulo("LISTO")
    print("   Este relevamiento no modificó nada en Kommo.")
    print("   Con esto se define el mapeo Kommo→pedido y qué etapa dispara la creación.")


if __name__ == "__main__":
    main()
