# -*- coding: utf-8 -*-
"""
dashboard_data.py  —  Construye el objeto DASH para el dashboard CRM rediseñado.

QUÉ HACE
  Toma los datos que generar.py YA calcula (vendors_json_list, _vresp_list,
  all_rows, leads, leads_prev, totales, canales, duplicados) y los reempaqueta
  en un solo dict `DASH` que el nuevo dashboard (index.html) consume vía
  window.DASH. Incluye el desglose SEMANAL real (cierres y $ por semana y por
  vendedora) calculado desde la fecha de cierre (updated_at de los leads en la
  etapa "Compradores").

CÓMO SE USA  (ver INTEGRATION.md para el paso a paso)
  from dashboard_data import build_dash
  dash = build_dash(
      vendors_json_list = vendors_json_list,
      vresp_list        = _vresp_list,
      leads             = leads,
      leads_prev        = leads_prev,
      user_map          = user_map,
      stage_map         = stage_map,
      comprador_stage   = COMPRADORES_STAGE,
      now_dt            = now_dt,
      prev_year         = prev_year,
      prev_month        = prev_month,
      totals = dict(leads=total_leads, prev_leads=total_leads_prev,
                    compradores=total_compradores, value=total_value,
                    ticket=ticket_avg),
      channels = _ch_rows_data,     # opcional
      dups     = _dup_groups_js,    # opcional
      quality  = dict(sinSucursalPct=.., sinSucursal=.., ...),  # opcional
  )
  html = html.replace("__DASH_JSON__", json.dumps(dash, ensure_ascii=False))
"""

import datetime
import unicodedata

MES_ES = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
          "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]


# ───────────────────────── helpers ─────────────────────────
def _ini(name):
    parts = [p for p in str(name).split() if p]
    if not parts:
        return "?"
    if len(parts) == 1:
        return parts[0][:2].upper()
    return (parts[0][0] + parts[1][0]).upper()


def _fmt_resp_plain(minutes):
    """Minutos -> '6.6 h' / '1 d' / '45 min'. Igual criterio que _fmt_resp pero sin HTML."""
    if minutes is None:
        return "—"
    if minutes < 60:
        return f"{int(round(minutes))} min"
    if minutes < 1440:
        return f"{minutes/60:.1f} h"
    return f"{int(round(minutes/1440))} d"


def _status_from_velocity(vavg, vnever, nuevo):
    """Replica el semáforo de generar.py: rojo si nunca>10 o avg>=72h; ámbar 24-72h; verde <24h."""
    if vnever > 10:
        return "red"
    if vavg is None:
        return "green" if nuevo else "amber"
    if vavg >= 4320:   # 72 h
        return "red"
    if vavg >= 1440:   # 24 h
        return "amber"
    return "green"


def _stage_count(stages_list, stage_name):
    for s in stages_list:
        if s.get("stage") == stage_name:
            return s.get("count", 0)
    return 0


def _sucursal_for_vendor(vname, all_rows):
    """Sucursal de la vendedora.
    1) En Kommo el nombre del usuario suele venir como "Nombre - Sucursal";
       si es así, esa es la fuente más confiable.
    2) Fallback: sucursal dominante entre sus leads en all_rows."""
    from collections import Counter
    # 1) sucursal embebida en el propio nombre ("Mirian Salazar - Mia Plaza")
    if " - " in (vname or ""):
        suc = _sucursal_short(vname.split(" - ", 1)[1])
        if suc and suc != "—":
            return suc
    # 2) sucursal dominante entre las filas de la vendedora
    base = (vname or "").split(" - ")[0]
    c = Counter()
    for r in all_rows or []:
        if (r.get("user") or "").split(" - ")[0] != base:
            continue
        suc = (r.get("sucursal") or "").strip()
        if suc and suc.lower() not in ("sin sucursal", "—", "-"):
            c[suc] += 1
    return _sucursal_short(c.most_common(1)[0][0]) if c else "—"


# ───────────────────────── semanas ─────────────────────────
def _weeks_of_month(year, month):
    """Devuelve [(label, rango)], semanas fijas por día: 1-7, 8-14, 15-21, 22-28, 29-fin."""
    import calendar
    last = calendar.monthrange(year, month)[1]
    bounds = [(1, 7), (8, 14), (15, 21), (22, 28), (29, last)]
    bounds = [(a, b) for (a, b) in bounds if a <= last]
    if bounds:
        bounds[-1] = (bounds[-1][0], last)
    return [[f"S{i+1}", f"{a}\u2013{b}"] for i, (a, b) in enumerate(bounds)]


def _week_index(day):
    """Día del mes -> índice de semana (0..4)."""
    return min((day - 1) // 7, 4)


def _weekly_for_leads(leads, user_map, stage_map, comprador_stage, year, month, n_weeks):
    """
    Para los leads CERRADOS (etapa == comprador_stage) de un mes, agrupa por vendedora
    y semana: nº de cierres y suma de $ (price). La fecha de cierre se aproxima con
    updated_at (último movimiento del lead, que para un comprador es el paso a 'Compradores').
    Devuelve {vendor: {"C":[...], "M":[...]}}.
    """
    out = {}
    for lead in leads:
        if stage_map.get(lead.get("status_id")) != comprador_stage:
            continue
        ts = lead.get("updated_at") or lead.get("created_at") or 0
        if not ts:
            continue
        d = datetime.datetime.fromtimestamp(ts)
        if d.year != year or d.month != month:
            # cerrado en otro mes; lo contamos en la última semana del mes objetivo
            wi = n_weeks - 1
        else:
            wi = _week_index(d.day)
        wi = min(wi, n_weeks - 1)
        vname = user_map.get(lead.get("responsible_user_id"), "Desconocido")
        rec = out.setdefault(vname, {"C": [0] * n_weeks, "M": [0] * n_weeks})
        rec["C"][wi] += 1
        rec["M"][wi] += int(float(lead.get("price", 0) or 0))
    return out


def _sucursal_short(s):
    s = s or ""
    for key in ("Mia Plaza", "Central", "Buenos Aires"):
        if key.lower() in s.lower():
            return key
    return s or "—"


# ───────────────────────── builder principal ─────────────────────────
def build_dash(vendors_json_list, vresp_list, leads, leads_prev, user_map, stage_map,
               comprador_stage, now_dt, prev_year, prev_month, totals,
               channels=None, dups=None, quality=None, metas_monto=None,
               all_rows=None, followup_stages=None, stages_global=None, origin=None):

    # velocidad por vendedora -> dict por nombre
    vel = {}
    for (vname, vavg, vlt24_pct, vslow, vnever) in vresp_list:
        vel[vname] = dict(avg=vavg, u24=vlt24_pct, tarde=vslow, nunca=vnever)

    cur_year, cur_month = now_dt.year, now_dt.month
    cur_weeks = _weeks_of_month(cur_year, cur_month)
    prev_weeks = _weeks_of_month(prev_year, prev_month)
    n_cur, n_prev = len(cur_weeks), len(prev_weeks)

    wk_cur = _weekly_for_leads(leads, user_map, stage_map, comprador_stage,
                               cur_year, cur_month, n_cur)
    wk_prev = _weekly_for_leads(leads_prev, user_map, stage_map, comprador_stage,
                                prev_year, prev_month, n_prev)

    metas_monto = metas_monto or {}
    team = []
    weekly_by_vendor = {}

    for v in vendors_json_list:
        name = v["name"]
        k = v.get("kpis", {})
        vv = vel.get(name, {})
        nuevo = v.get("prev_total", 0) == 0 and v.get("total", 0) < 60
        cierres = k.get("compradores", 0)
        team.append({
            "ini": _ini(name),
            "name": name,
            "sucursal": _sucursal_for_vendor(name, all_rows),
            "u24": vv.get("u24", 0),
            "promTxt": _fmt_resp_plain(vv.get("avg")),
            "tarde": vv.get("tarde", 0),
            "nunca": vv.get("nunca", 0),
            "leads": v.get("total", 0),
            "prevLeads": v.get("prev_total", 0),
            "cierres": cierres,
            "conv": k.get("conv_pct", 0),
            "ticket": k.get("ticket_avg", 0),
            "value": v.get("value", 0),
            "calif": k.get("calificados", 0),
            "califPct": k.get("calif_pct", 0),
            "noResp": k.get("no_resp", 0),
            "noRespPct": k.get("no_resp_pct", 0),
            "auto": k.get("auto", 0),
            "manual": k.get("manual", 0),
            "autoPct": k.get("auto_pct", 0),
            "manualPct": k.get("manual_pct", 0),
            "backlog": k.get("stagnant", 0),
            "status": _status_from_velocity(vv.get("avg"), vv.get("nunca", 0), nuevo),
            "nuevo": nuevo,
            # meta por monto: usa la guardada o un default = ~110% del valor actual (redondeado a 5k)
            "metaMonto": int(metas_monto.get(name, max(20000, round(v.get("value", 0) * 1.1 / 5000) * 5000))),
        })
        # detalle semanal real por vendedora
        c = wk_cur.get(name, {"C": [0] * n_cur, "M": [0] * n_cur})
        p = wk_prev.get(name, {"C": [0] * n_prev, "M": [0] * n_prev})
        weekly_by_vendor[name] = {"curC": c["C"], "curM": c["M"],
                                  "prevC": p["C"], "prevM": p["M"]}

    # canales -> [{ic,name,leads,pct,cierres,conv,ticket,pipeline,cls}]
    channels_out = None
    if channels:
        channels_out = []
        ic_map = {"Carga manual vendedora": "\u270d", "Automático (bot)": "\u2699",
                  "Walk-in (Tienda)": "\U0001f6b6"}
        tot = sum(c.get("leads", 0) for _, c in channels) or 1
        for ch_name, cd in channels:
            lv = cd.get("leads", 0)
            comp = cd.get("compradores", 0)
            conv = round(comp / lv * 100) if lv else 0
            cls = "green" if conv >= 10 else ("red" if lv >= 50 else "muted")
            tick = cd.get("ticket_avg")
            if not tick:
                tick = int(cd.get("value", 0) / comp) if comp else 0
            channels_out.append({
                "ic": ic_map.get(ch_name, "\u2022"), "name": ch_name,
                "leads": lv, "pct": round(lv / tot * 100), "cierres": comp,
                "conv": conv, "ticket": tick,
                "pipeline": int(cd.get("value", 0)), "cls": cls,
            })

    dash = {
        "month": MES_ES[cur_month], "year": cur_year,
        "updated_at": datetime.datetime.now().isoformat(timespec='seconds'),
        "global": {
            "leads": totals.get("leads", 0),
            "prevLeads": totals.get("prev_leads", 0),
            "cierres": totals.get("compradores", 0),
            "pipeline": int(totals.get("value", 0)),
            "ticket": totals.get("ticket", 0),
        },
        "team": team,
        "weekly": {
            "curMonth": MES_ES[cur_month], "prevMonth": MES_ES[prev_month],
            "curWeeks": cur_weeks, "prevWeeks": prev_weeks,
            "byVendor": weekly_by_vendor,
        },
    }
    if channels_out:
        dash["channels"] = channels_out
    if dups is not None:
        # dups esperado: [{phone,n,fichas:[...],vends:[...],etapas:[...]}]
        dash["dups"] = dups
    if quality is not None:
        dash["quality"] = quality

    # etapas globales del pipeline: [{name, count, value, pct}]
    if stages_global is not None:
        total_leads = totals.get("leads", 0) or 1
        dash["stages"] = [
            {"name": s.get("name", ""),
             "count": s.get("count", 0),
             "value": int(s.get("value", 0)),
             "pct": s.get("pct", round(s.get("count", 0) / total_leads * 100))}
            for s in stages_global
        ]

    # origen de carga: manual (vendedora) vs automático (bot)
    if origin is not None:
        dash["origin"] = {
            "auto": origin.get("auto", 0),
            "manual": origin.get("manual", 0),
            "autoPct": origin.get("auto_pct", 0),
            "manualPct": origin.get("manual_pct", 0),
        }

    # stagesByV: embudo por vendedora (para el drill-down)
    stages_by_v = {}
    for v in vendors_json_list:
        stages_by_v[v["name"]] = [
            {"s": s["stage"], "c": s["count"]}
            for s in v.get("stages", []) if s.get("count", 0) > 0
            or s["stage"] in (comprador_stage, "No Responden")
        ]
    dash["stagesByV"] = stages_by_v

    # stagesByVPrev: etapa ACTUAL de los leads del mes anterior, por vendedora.
    # Misma definición que stagesByV (leads del mes X en su etapa actual) → permite
    # comparar mes a mes etapas como "Agendado / Visita".
    stages_by_v_prev = {}
    for lead in (leads_prev or []):
        vname = user_map.get(lead.get("responsible_user_id"), "Desconocido")
        stg = stage_map.get(lead.get("status_id"), "")
        if not stg:
            continue
        counts = stages_by_v_prev.setdefault(vname, {})
        counts[stg] = counts.get(stg, 0) + 1
    dash["stagesByVPrev"] = {
        name: [{"s": s, "c": c} for s, c in counts.items()]
        for name, counts in stages_by_v_prev.items()
    }

    # backlog: deals abiertos sin actividad +72h, ordenados por antigüedad (top 45)
    if all_rows is not None:
        open_stages = set(followup_stages) if followup_stages else None
        # Fallback: derive sucursal from the vendedora's known branch when the row lacks it
        vendor_suc = {t["name"].split(" - ")[0]: t["sucursal"] for t in team}
        bk = []
        for r in all_rows:
            stg = r.get("stage", "")
            if open_stages is not None and stg not in open_stages:
                continue
            if r.get("days_int", 0) < 3:
                continue
            uname = r.get("user", "")
            ubase = uname.split(" - ")[0] if uname else ""
            suc = _sucursal_short(r.get("sucursal", ""))
            if suc == "—":
                suc = vendor_suc.get(ubase, "—")
            bk.append({
                "c": (r.get("contact") or r.get("name") or "").strip() or ("Lead #" + str(r.get("id", ""))),
                "e": stg,
                "s": suc,
                "r": ubase or "—",
                "d": r.get("days_int", 0),
                "nh": bool(r.get("nohuman")),
                "id": r.get("id", ""),
            })
        bk.sort(key=lambda x: -x["d"])
        dash["backlog"] = bk  # all items; JS caps display when unfiltered

        # stage_leads: all pipeline leads for stage/kanban view (no activity threshold)
        kanban_stages = set(followup_stages or []) | ({comprador_stage} if comprador_stage else set())
        sl = []
        for r in all_rows:
            stg = r.get("stage", "")
            if stg not in kanban_stages:
                continue
            uname = r.get("user", "")
            ubase = uname.split(" - ")[0] if uname else ""
            suc = _sucursal_short(r.get("sucursal", ""))
            if suc == "—":
                suc = vendor_suc.get(ubase, "—")
            sl.append({
                "c": (r.get("contact") or r.get("name") or "").strip() or ("Lead #" + str(r.get("id", ""))),
                "e": stg,
                "s": suc,
                "r": ubase or "—",
                "v": int(r.get("value") or 0),
                "d": int(r.get("days_int") or 0),
                "id": r.get("id", ""),
            })
        dash["stage_leads"] = sl

    return dash
