#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador del Dashboard Empresarial — MES EN CURSO (Julio 2026, parcial).

USO:
    python generar_empresarial_julio.py [ruta_al_excel] [-o salida.html]

- Lee la pestana **DASHBOARD** (consolidado Junio vs Julio), **JULIO** (detalle por tienda con
  proyeccion y presupuesto) y **seg semanal** (Semana 1 por tienda) del Excel de ventas.
- Julio es un MES PARCIAL (dia 6 de 31): se muestran cifras reales a la fecha + PROYECCION de
  cierre, comparativo Semana 1 Junio vs Julio, y el contexto anual. Nada hardcodeado: cada cifra
  sale del Excel y los % / variaciones / alcances se calculan en vivo.
- Salida por defecto: `dashboard-empresarial.html` (mes en curso / live).
- Incluye el selector de meses (Junio cerrado / Julio en curso) que enlaza al HTML de cada mes.

Reutiliza helpers, CSS (_assets_empresarial) y JS del generador de junio (generar_empresarial.py).
Requiere: openpyxl.
"""
import sys, os, re, json, argparse

try:
    import openpyxl
except ImportError:
    sys.exit("Falta openpyxl. Instalar con: pip install openpyxl")

import generar_empresarial as G
from generar_empresarial import (fmt, pct, pct2, vf, esc, num_td, vf_td, prettify, norm,
                                 month_switcher, DASH_JULIO, JS_TEMPLATE)
from _assets_empresarial import CSS

DEFAULT_XLSX = r"C:/Users/multiespumas/Downloads/VENTAS 2026 SEGUIMIENTO + dashboard a.xlsx"
DEFAULT_OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), DASH_JULIO)

def signed_pct(x):
    if x is None:
        return "—"
    return ("+" if x >= 0 else "−") + f"{abs(x*100):,.1f}%"

# ----------------------------------------------------------------------------
# EXTRACCION
# ----------------------------------------------------------------------------
def extract(xlsx_path):
    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    for req in ("DASHBOARD", "JULIO", "seg semanal"):
        if req not in wb.sheetnames:
            raise SystemExit(f"El Excel no tiene la pestana '{req}' (fuente del dashboard de julio).")
    DB = wb["DASHBOARD"]; JU = wb["JULIO"]; SS = wb["seg semanal"]
    def d(coord):
        v = DB[coord].value
        return float(v) if isinstance(v, (int, float)) else (v if v is not None else None)
    def dn(coord):
        v = DB[coord].value
        return float(v) if isinstance(v, (int, float)) else None

    D = {}
    # --- Resumen general (Junio vs Julio parcial) ---
    D["resumen"] = {
        "jun_ventas": dn("C7"), "jul_ventas": dn("D7"),
        "jun_u": dn("C8"), "jul_u": dn("D8"),
        "jun_ppto": dn("C9"), "jul_ppto": dn("D9"),
        "jul_proy": dn("D11"), "ticket": dn("D12"),
    }
    # dia / dias del mes desde JULIO
    D["dia"] = int(JU["AF20"].value or 6); D["dias"] = int(JU["AG20"].value or 31)

    # --- Por marca julio (parcial) ---
    marcas = []
    for r in range(25, 29):
        marcas.append({"marca": DB[f"B{r}"].value, "u": dn(f"C{r}"), "vtas": dn(f"D{r}"), "ticket": dn(f"E{r}")})
    D["marcas_jul"] = marcas
    D["marcas_jul_total"] = {"u": dn("C29"), "vtas": dn("D29")}

    # --- Proyeccion por marca (PROY) ---
    proy = []
    for r in range(34, 38):
        proy.append({"marca": DB[f"B{r}"].value, "proy": dn(f"C{r}"), "pct": dn(f"D{r}")})
    D["proy_marca"] = proy
    D["proy_marca_total"] = {"proy": dn("C38"), "real": dn("C39"), "real_pct": dn("D39")}

    # --- Semanal S1 por marca (junio vs julio) ---
    sem = []
    for r in range(43, 47):
        sem.append({"marca": DB[f"B{r}"].value, "jun": dn(f"C{r}"), "jul": dn(f"D{r}"),
                    "var": dn(f"E{r}"), "u_jun": dn(f"F{r}"), "u_jul": dn(f"G{r}")})
    D["sem_marca"] = sem
    D["sem_marca_total"] = {"jun": dn("C47"), "jul": dn("D47"), "var": dn("E47"),
                            "u_jun": dn("F47"), "u_jul": dn("G47")}

    # --- Producto S1 (junio vs julio) ---
    prod = []
    for r in range(51, 55):
        prod.append({"nombre": DB[f"B{r}"].value, "u_jun": dn(f"C{r}"), "u_jul": dn(f"D{r}"),
                     "bs_jun": dn(f"E{r}"), "bs_jul": dn(f"F{r}"), "var": dn(f"G{r}")})
    D["prod"] = prod
    D["prod_total"] = {"u_jun": dn("C55"), "u_jul": dn("D55"), "bs_jun": dn("E55"),
                       "bs_jul": dn("F55"), "var": dn("G55")}

    # --- Resumen anual (ene-jun) ---
    meses = []
    for r in range(59, 65):
        meses.append({"mes": DB[f"B{r}"].value, "v2026": dn(f"C{r}"), "obj": dn(f"D{r}"),
                      "cumpl": dn(f"E{r}"), "v2025": dn(f"F{r}"), "var25": dn(f"G{r}")})
    D["meses"] = meses
    D["acum"] = {"v2026": dn("C65"), "obj": dn("D65"), "cumpl": dn("E65"),
                 "v2025": dn("F65"), "var25": dn("G65")}
    mejor = max(meses, key=lambda x: x["v2026"])
    D["acum"]["mejor_mes"] = mejor["mes"]; D["acum"]["mejor_val"] = mejor["v2026"]
    D["acum"]["brecha"] = G.rhu(dn("D65")) - G.rhu(dn("C65"))

    # --- Comparativo por marca jun26 vs jun25 ---
    comp = []
    for r in range(69, 73):
        comp.append({"marca": DB[f"B{r}"].value, "j26": dn(f"C{r}"), "j25": dn(f"D{r}"),
                     "var": dn(f"E{r}"), "abs": dn(f"F{r}")})
    D["comp25"] = comp
    D["comp25_total"] = {"j26": dn("C73"), "j25": dn("D73"), "var": dn("E73"), "abs": dn("F73")}

    # --- Leads ---
    D["leads"] = {
        "heaven": {"leads": dn("C77"), "ventas": dn("D77"), "efect": dn("E77")},
        "suena": {"leads": dn("C78"), "ventas": dn("D78"), "efect": dn("E78")},
        "total": {"leads": dn("C79"), "ventas": dn("D79"), "efect": dn("E79")},
        "inv": dn("C80"), "costo": dn("C81"), "obj": dn("C82"), "avance": dn("D82"),
    }

    # --- Presupuesto anual por marca ---
    ppto = []
    for r in range(86, 90):
        ppto.append({"marca": DB[f"B{r}"].value, "ppto": dn(f"C{r}"), "pct": dn(f"D{r}"),
                     "real25": dn(f"E{r}"), "crec": dn(f"F{r}")})
    D["ppto_anual"] = ppto
    D["ppto_anual_total"] = {"ppto": dn("C90"), "real25": dn("E90"), "crec": dn("F90")}

    # --- Campana ---
    camp = []
    for r in range(94, 100):
        nombre = DB[f"B{r}"].value
        if not nombre:
            continue
        camp.append({"producto": nombre, "precio": dn(f"C{r}"), "dscto": dn(f"D{r}"),
                     "final": dn(f"E{r}")})
    D["campana"] = {"items": camp, "mecanica": (DB["C101"].value or "").strip(),
                    "vigencia": re.sub(r"\s+", " ", (DB["C102"].value or "").replace("Vigencia:", "").strip())}

    # --- Detalle por tienda (JULIO): vtas, junio, var, ppto, proy, alcance ---
    def ju(coord):
        v = JU[coord].value
        return float(v) if isinstance(v, (int, float)) else None
    tiendas = []
    for r in list(range(3, 8)) + list(range(9, 12)) + [13, 15]:  # HEAVEN, SUEÑA, ROHO, Distribuidores
        nombre = JU[f"B{r}"].value
        if not nombre:
            continue
        vt = ju(f"E{r}"); ppto_ = ju(f"R{r}"); proy_ = ju(f"N{r}")
        tiendas.append({"nombre": nombre, "vtas": vt, "junio": ju(f"F{r}"), "var": ju(f"G{r}"),
                        "ppto": ppto_, "proy": proy_, "ticket": ju(f"C{r}"),
                        "alc_proy": (proy_/ppto_) if (proy_ and ppto_) else None})
    D["tiendas"] = tiendas
    D["tiendas_total"] = {"vtas": ju("E20"), "junio": ju("F20"), "ppto": ju("R20"),
                          "proy": ju("N20"), "alc_proy": (ju("N20")/ju("R20")) if ju("R20") else None}
    # Prod term (no suma al total)
    D["prod_term"] = {"vtas": ju("E19"), "u": ju("D19")}

    # --- Detalle por tienda semanal (seg semanal): Bs + unidades S1 junio vs julio ---
    seg = []
    for r in range(2, 22):
        b = SS[f"B{r}"].value
        if not b or not str(b).startswith("Total "):
            continue
        name = str(b)[6:].strip()
        seg.append({"nombre": name, "jun": SS[f"D{r}"].value, "jul": SS[f"E{r}"].value,
                    "u_jun": SS[f"M{r}"].value, "u_jul": SS[f"N{r}"].value})
    D["seg_tiendas"] = seg

    D["_xlsx"] = os.path.basename(xlsx_path)
    return D

# ----------------------------------------------------------------------------
# RENDER
# ----------------------------------------------------------------------------
MARCA_COLOR = {"heaven": "var(--teal)", "sueña": "var(--amber)", "suena": "var(--amber)",
               "roho": "var(--red)", "clientes externos": "var(--series-blue)",
               "distribuidores / ext.": "var(--series-blue)", "distribuidores": "var(--series-blue)",
               "otros": "var(--series-blue)"}
MARCA_BADGE = {"heaven": "b-teal", "sueña": "b-amber", "suena": "b-amber", "roho": "b-red"}

def mcolor(name):
    return MARCA_COLOR.get(norm(name), "var(--muted)")

def mbadge(name):
    return MARCA_BADGE.get(norm(name), "b-gray")

def obj_col(a):
    return "var(--green)" if (a or 0) >= 1 else ("var(--amber)" if (a or 0) >= 0.65 else "var(--red)")

def build_html(D):
    rs = D["resumen"]; dia = D["dia"]; dias = D["dias"]
    proy = rs["jul_proy"]; obj = rs["jul_ppto"]; ventas = rs["jul_ventas"]
    alc_proy = (proy / obj) if obj else None
    avance_real = (ventas / obj) if obj else None
    st = D["sem_marca_total"]
    var_s1 = st["var"]  # julio S1 vs junio S1 (total)
    ticket = rs["ticket"]

    # ---- Header stats ----
    header_stats = (
        f'<div class="hstat"><div class="hstat-v">Bs {fmt(ventas)}</div><div class="hstat-l">Ventas julio · parcial</div></div>'
        f'<div class="hstat"><div class="hstat-v">Bs {proy/1_000_000:.2f}M</div><div class="hstat-l">Proyección cierre</div></div>'
        f'<div class="hstat"><div class="hstat-v" style="color:#7CF6EF">{pct(alc_proy)}</div><div class="hstat-l">Proy vs objetivo</div></div>')

    # ---- Section 01: resultado parcial ----
    ring = f'conic-gradient(var(--teal) 0 {min((alc_proy or 0)*100,100):.1f}%, rgba(15,95,109,.13) {min((alc_proy or 0)*100,100):.1f}% 100%)'
    # mchips por marca (julio, ordenado por ventas desc, con var vs junio S1)
    sem_by = {norm(x["marca"]): x for x in D["sem_marca"]}
    chips = ""
    for mk in sorted(D["marcas_jul"], key=lambda x: -(x["vtas"] or 0)):
        s = sem_by.get(norm(mk["marca"]))
        v = vf(s["var"]) if s else {"txt": "—", "cls": ""}
        chips += (f'<div class="mchip"><span class="dot" style="background:{mcolor(mk["marca"])}"></span>'
                  f'<span style="flex:1;font-size:.8rem;font-weight:600">{esc(prettify(mk["marca"]))}</span>'
                  f'<span style="font-size:.82rem;font-weight:800">Bs {fmt(mk["vtas"])}</span>'
                  f'<span class="{v["cls"]}" style="font-size:.68rem;min-width:52px;text-align:right">{v["txt"]}</span></div>')
    sec01 = f'''<div class="sec mensual-only">01 · Resultado parcial · julio 2026</div>
    <div class="lg lg-glow mensual-only" style="padding:30px 34px;margin-bottom:26px">
      <div style="display:flex;align-items:center;gap:40px;flex-wrap:wrap">
        <div style="flex:1.3;min-width:280px">
          <div style="font-size:.66rem;font-weight:700;color:var(--teal);text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px">Ventas de julio · a la fecha</div>
          <div style="font-size:3.4rem;font-weight:800;line-height:1;color:var(--text);letter-spacing:-.02em">Bs {fmt(ventas)}</div>
          <div style="font-size:.82rem;color:var(--muted);margin-top:8px">Mes en curso · día {dia} de {dias} · {fmt(rs["jul_u"])} unidades · ticket Bs {fmt(ticket)}</div>
          <div style="display:flex;gap:30px;margin-top:14px">
            <div><div style="font-size:.6rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Proyección cierre</div><div style="font-size:1.2rem;font-weight:800;color:var(--text)">Bs {fmt(proy)}</div></div>
            <div><div style="font-size:.6rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Objetivo del mes</div><div style="font-size:1.2rem;font-weight:800;color:var(--text)">Bs {fmt(obj)}</div></div>
            <div><div style="font-size:.6rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Desv. proy vs objetivo</div><div style="font-size:1.2rem;font-weight:800;color:{"var(--green)" if proy>=obj else "var(--red)"}">{("+" if proy>=obj else "−")} Bs {fmt(abs(proy-obj))}</div></div>
          </div>
          <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">
            <span class="dchip" style="background:rgba(34,150,100,.1);color:#1c8a5f;border:1px solid rgba(34,150,100,.28)">{vf(var_s1)["txt"]} vs junio (Semana 1)</span>
            <span class="dchip" style="background:rgba(184,104,8,.1);color:#B86808;border:1px solid rgba(184,104,8,.28)">{pct(avance_real)} del objetivo a la fecha</span>
            <span class="dchip" style="background:rgba(15,95,109,.06);color:#0F5F6D;border:1px solid rgba(15,95,109,.2)">día {dia} de {dias}</span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:9px">
          <div class="ring" style="background:{ring}">
            <div><div style="font-size:2rem;font-weight:800;color:var(--text);line-height:1">{pct(alc_proy)}</div><div style="font-size:.58rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-top:2px">proy. vs objetivo</div></div>
          </div>
          <div style="font-size:.66rem;color:var(--muted)">Alcance proyectado</div>
        </div>
        <div style="flex:1;min-width:250px;display:flex;flex-direction:column;gap:8px">
          <div style="font-size:.62rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:2px">Julio por marca · vs junio (Semana 1)</div>
          {chips}
        </div>
      </div>
    </div>'''

    # ---- Exec summary ----
    momentum = sorted([x for x in D["sem_marca"] if x["var"] is not None], key=lambda x: -x["var"])[:3]
    mom_txt = ", ".join(f'{prettify(x["marca"])} {signed_pct(x["var"])}' for x in momentum)
    exec_html = f'''<div class="exec">
      <div class="exec-lbl">Resumen ejecutivo · mes en curso</div>
      <p>Julio arranca en <b>Bs {fmt(ventas)}</b> en los primeros <b>{dia} días</b> ({fmt(rs["jul_u"])} unidades, ticket Bs {fmt(ticket)}) — <b style="color:var(--green)">{signed_pct(var_s1)}</b> vs la Semana 1 de junio. La <b>proyección de cierre</b> es <b>Bs {fmt(proy)}</b> = <b>{pct(alc_proy)}</b> del objetivo (Bs {fmt(obj)}). Momentum por marca vs la Semana 1 de junio: {mom_txt}. Es un mes parcial: las cifras crecerán con las próximas semanas.</p>
    </div>'''

    # ---- Alert ----
    if proy >= obj:
        alert = f'''<div class="alert amber"><span class="ico">💡</span><div>Proyección de cierre <b>Bs {fmt(proy)}</b> — <b>{pct(alc_proy)}</b> del objetivo. Buen arranque: mantener el ritmo de la Semana 1 para superar el presupuesto.</div></div>'''
    else:
        alert = f'''<div class="alert amber"><span class="ico">⚠️</span><div>Proyección de cierre <b>Bs {fmt(proy)}</b> = <b>{pct(alc_proy)}</b> del objetivo; faltarían <b>Bs {fmt(obj-proy)}</b>. Reforzar el ritmo para cerrar la brecha en las próximas semanas.</div></div>'''

    # ---- Section 02: desempeño por tienda julio (parcial + proyección) ----
    def alc_badge(a):
        if a is None:
            return "—"
        cls = "b-green" if a >= 1 else "b-amber" if a >= 0.65 else "b-red"
        return f'<span class="badge {cls}">{pct(a)}</span>'
    tr = ""
    for t in D["tiendas"]:
        tr += (f'<tr><td>{esc(prettify(t["nombre"]))}</td>{num_td(fmt(t["vtas"]))}{num_td(fmt(t["junio"]))}'
               f'{vf_td(t["var"])}{num_td(fmt(t["ppto"]))}{num_td(fmt(t["proy"]))}<td class="num">{alc_badge(t["alc_proy"])}</td></tr>')
    tt = D["tiendas_total"]
    tr += (f'<tr class="trow-total"><td>TOTAL</td>{num_td(fmt(tt["vtas"]))}{num_td(fmt(tt["junio"]))}'
           f'<td class="num">—</td>{num_td(fmt(tt["ppto"]))}{num_td(fmt(tt["proy"]))}{num_td(pct(tt["alc_proy"]))}</tr>')
    sec02 = f'''<div class="sec mensual-only">02 · Desempeño por tienda · julio (parcial + proyección)</div>
    <div class="tw mensual-only" style="margin-bottom:28px"><table>
      <thead><tr><th>Tienda / Canal</th><th class="num">Vtas Jul</th><th class="num">Junio (mes)</th><th class="num">Var %</th><th class="num">PPTO Jul</th><th class="num">Proy. cierre</th><th class="num">% Alcance proy</th></tr></thead>
      <tbody>{tr}</tbody>
    </table></div>
    <div class="cap mensual-only" style="margin-top:-18px;margin-bottom:26px">Julio a la fecha (día {dia}/{dias}) vs junio (mes completo). Proyección de cierre y % alcance sobre el PPTO de julio. Prod. term. fábrica Bs {fmt(D["prod_term"]["vtas"])} ({fmt(D["prod_term"]["u"])} u) no se suma al total.</div>'''

    # ---- Section 03: proyección por marca (PROY) ----
    pm = ""
    for x in D["proy_marca"]:
        pm += (f'<tr><td><span class="badge {mbadge(x["marca"])}">{esc(prettify(x["marca"]))}</span></td>'
               f'{num_td(fmt(x["proy"]))}{num_td(pct(x["pct"]))}</tr>')
    pmt = D["proy_marca_total"]
    pm += (f'<tr class="trow-total"><td>TOTAL PROYECTADO</td>{num_td(fmt(pmt["proy"]))}{num_td("100.0%")}</tr>'
           f'<tr><td>Real a la fecha (julio)</td>{num_td(fmt(pmt["real"]))}{num_td(pct(pmt["real_pct"]))}</tr>')
    sec03 = f'''<div class="sec mensual-only">03 · Proyección de cierre por canal · julio (PROY)</div>
    <div class="two-col mensual-only">
      <div><div class="tw"><table>
        <thead><tr><th>Canal</th><th class="num">Proyectado (Bs)</th><th class="num">% del total</th></tr></thead>
        <tbody>{pm}</tbody>
      </table></div>
      <div class="cap">Fuente: pestaña PROY (proyección por marca, método propio). Difiere de la proyección operativa por tienda (Bs {fmt(proy)}) — es un snapshot alternativo.</div></div>
      <div>{_producto_table(D)}</div>
    </div>'''

    # ---- Semanal block ----
    semanal = _semanal_block(D)

    # ---- Anual sections ----
    anual = _anual_sections(D)

    # ---- Leads + campaña (always visible in Todas/Mensual) ----
    extras = _leads_campana(D)

    view_tabs = _view_tabs()
    js_data = {"brands": {}, "weeksBs": "", "weeksU": ""}
    data_json = json.dumps(js_data, ensure_ascii=False)

    html = f'''<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dashboard Ventas 2026 · Gerencia — Julio (en curso) — Heaven Colchones</title>
<meta name="generator" content="generar_empresarial_julio.py — fuente: {esc(D["_xlsx"])}">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>{CSS}</style>
</head>
<body class="v-todas">
<div class="app-daily">
  <div class="scroll-bar" id="hc-sb" style="width:0%"></div>
  <div style="padding:18px 20px 0">
    <header class="header grad" style="border-radius:26px;box-shadow:0 18px 46px rgba(9,72,68,.3), inset 0 1px 0 rgba(255,255,255,.32);overflow:hidden;position:relative">
      <div style="position:absolute;inset:0;background:radial-gradient(135% 175% at 8% -35%, rgba(255,255,255,.34), transparent 48%);pointer-events:none;z-index:0"></div>
      <div style="position:absolute;left:0;right:0;bottom:0;height:1px;background:rgba(255,255,255,.25);z-index:0"></div>
      <div class="hl" style="position:relative;z-index:1">
        <div class="logo">
          <div class="logo-h">HEAVEN<span style="color:var(--heaven-cross);font-weight:800;margin-left:6px">&#10011;</span></div>
          <div class="logo-s">colchones · recarga tu energía</div>
        </div>
        <div class="htitle">
          <h1>DASHBOARD VENTAS 2026 · GERENCIA</h1>
          <p>Julio 2026 · mes en curso (día {dia} de {dias}) · MultiESPUMAS Viscarra S.R.L.</p>
        </div>
      </div>
      <div class="hr" style="position:relative;z-index:1;border-left:none">
        <div style="display:flex;align-items:stretch;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.26);border-radius:20px;padding:8px 4px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:inset 0 1px 0 rgba(255,255,255,.3)">
          {header_stats}
        </div>
      </div>
    </header>
  </div>
  <main class="container">
    {month_switcher("julio")}
    <div class="viewtabs" style="display:flex;justify-content:center;margin-bottom:26px">
      <div id="viewtabs" style="display:inline-flex;gap:5px;background:rgba(255,255,255,.55);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.72);border-radius:18px;padding:5px;box-shadow:0 8px 24px rgba(9,72,68,.14), inset 0 1px 0 rgba(255,255,255,.95)">{view_tabs}</div>
    </div>
    {sec01}
    {exec_html}
    {alert}
    {sec02}
    {sec03}
    {anual}
    {extras}
    {semanal}
    <div class="footer" style="border-radius:12px;border:1px solid var(--gray-md);margin-top:20px">
      Heaven Colchones · MultiESPUMAS Viscarra S.R.L. — Santa Cruz, Bolivia · Julio 2026 (parcial, día {dia}/{dias}) · Montos en bolivianos (Bs) · Generado desde {esc(D["_xlsx"])}
    </div>
  </main>
  <button class="fab" id="hc-fab">⬇ Exportar / Imprimir</button>
</div>
<script>window.__DATA__ = {data_json};</script>
<script>{JS_TEMPLATE}</script>
</body>
</html>'''
    return html


def _view_tabs():
    tabs = [("TODAS", "Todas"), ("MENSUAL", "Mensual"), ("SEMANAL", "Semanal"), ("ANUAL", "Anual")]
    return "".join(
        f'<button class="vtab{" active" if k=="TODAS" else ""}" data-view="{k}" style="border:none;background:transparent;font-family:inherit;font-weight:700;font-size:.82rem;color:var(--muted);padding:10px 32px;border-radius:13px;cursor:pointer;transition:all .18s;letter-spacing:.02em">{l}</button>'
        for k, l in tabs)


def _producto_table(D):
    pr = ""
    for p in D["prod"]:
        pr += (f'<tr><td>{esc(prettify(p["nombre"]))}</td>{num_td(fmt(p["bs_jun"]))}{num_td(fmt(p["bs_jul"]))}'
               f'{vf_td(p["var"])}{num_td(fmt(p["u_jul"]))}</tr>')
    pt = D["prod_total"]
    pr += (f'<tr class="trow-total"><td>TOTAL</td>{num_td(fmt(pt["bs_jun"]))}{num_td(fmt(pt["bs_jul"]))}'
           f'{vf_td(pt["var"])}{num_td(fmt(pt["u_jul"]))}</tr>')
    return f'''<div class="sec">Por producto · Semana 1 (junio vs julio)</div>
      <div class="tw"><table>
        <thead><tr><th>Grupo de producto</th><th class="num">Bs Junio</th><th class="num">Bs Julio</th><th class="num">Var %</th><th class="num">Und Jul</th></tr></thead>
        <tbody>{pr}</tbody>
      </table></div>'''


def _semanal_block(D):
    # tabla por marca S1
    mr = ""
    for x in D["sem_marca"]:
        mr += (f'<tr><td><span class="badge {mbadge(x["marca"])}">{esc(prettify(x["marca"]))}</span></td>'
               f'{num_td(fmt(x["jun"]))}{num_td(fmt(x["jul"]))}{vf_td(x["var"])}{num_td(fmt(x["u_jun"]))}{num_td(fmt(x["u_jul"]))}</tr>')
    smt = D["sem_marca_total"]
    mr += (f'<tr class="trow-total"><td>TOTAL</td>{num_td(fmt(smt["jun"]))}{num_td(fmt(smt["jul"]))}'
           f'{vf_td(smt["var"])}{num_td(fmt(smt["u_jun"]))}{num_td(fmt(smt["u_jul"]))}</tr>')
    # barras por marca (junio vs julio Bs)
    marks = [x for x in D["sem_marca"]]
    mx = max([max(x["jun"] or 0, x["jul"] or 0) for x in marks] or [1])
    bars = ""
    for x in marks:
        v = vf(x["var"])
        jh = f'{(x["jun"] or 0)/mx*82:.1f}%'; kh = f'{(x["jul"] or 0)/mx*82:.1f}%'
        bars += (f'<div style="flex:1;display:flex;flex-direction:column;align-items:center;height:100%">'
                 f'<div style="flex:1;display:flex;align-items:flex-end;justify-content:center;gap:9px;width:100%">'
                 f'<div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%"><div style="font-size:.56rem;color:var(--muted);margin-bottom:4px;white-space:nowrap">Bs {fmt(x["jun"])}</div><div class="sembar" style="width:30px;height:{jh};background:var(--gray-md);border-radius:8px 8px 0 0"></div></div>'
                 f'<div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%"><div style="font-size:.6rem;font-weight:800;color:var(--teal-dk);margin-bottom:4px;white-space:nowrap">Bs {fmt(x["jul"])}</div><div class="sembar" style="width:30px;height:{kh};background:linear-gradient(180deg,var(--teal),var(--teal-mid));border-radius:8px 8px 0 0;box-shadow:0 3px 10px rgba(0,181,173,.32)"></div></div>'
                 f'</div>'
                 f'<div style="margin-top:12px;font-size:.72rem;font-weight:700;color:var(--text);white-space:nowrap">{esc(prettify(x["marca"]))}</div>'
                 f'<div class="{v["cls"]}" style="font-size:.62rem;font-weight:700;margin-top:2px;white-space:nowrap">{v["txt"]}</div></div>')
    # tabla por tienda S1
    stg = ""
    for t in D["seg_tiendas"]:
        var = (t["jul"]/t["jun"]-1) if (t["jun"] and t["jul"] is not None) else None
        stg += (f'<tr><td>{esc(prettify(t["nombre"]))}</td>{num_td(fmt(t["jun"]))}{num_td(fmt(t["jul"]))}'
                f'{vf_td(var)}{num_td(fmt(t["u_jun"]))}{num_td(fmt(t["u_jul"]))}</tr>')
    return f'''<div class="semanal-block">
      <div class="sec">Seguimiento semanal · Semana 1 · junio vs julio 2026</div>
      <div class="lg" style="padding:24px 28px;margin-bottom:22px">
        <div style="font-size:.7rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:22px">Semana 1 por marca · junio vs julio (Bs)</div>
        <div style="display:flex;align-items:flex-end;gap:22px;height:200px">{bars}</div>
        <div style="display:flex;gap:22px;margin-top:18px;padding-top:14px;border-top:1px solid var(--gray-md)">
          <span style="display:flex;align-items:center;gap:7px;font-size:.72rem;color:var(--muted)"><span style="width:13px;height:13px;background:var(--gray-md);border-radius:3px"></span>Junio</span>
          <span style="display:flex;align-items:center;gap:7px;font-size:.72rem;color:var(--muted)"><span style="width:13px;height:13px;background:var(--teal);border-radius:3px"></span>Julio</span>
        </div>
      </div>
      <div class="two-col">
        <div><div class="sec">Por marca · Semana 1</div>
          <div class="tw"><table>
            <thead><tr><th>Marca</th><th class="num">Bs Junio</th><th class="num">Bs Julio</th><th class="num">Var %</th><th class="num">Und Jun</th><th class="num">Und Jul</th></tr></thead>
            <tbody>{mr}</tbody>
          </table></div>
        </div>
        <div><div class="sec">Por tienda · Semana 1</div>
          <div class="tw"><table>
            <thead><tr><th>Tienda / Canal</th><th class="num">Bs Junio</th><th class="num">Bs Julio</th><th class="num">Var %</th><th class="num">Und Jun</th><th class="num">Und Jul</th></tr></thead>
            <tbody>{stg}</tbody>
          </table></div>
        </div>
      </div>
      <div class="cap" style="margin-bottom:26px">Fuente: pestañas 'DASHBOARD' y 'seg semanal' · comparativo de la Semana 1 de cada mes (Bs y unidades).</div>
    </div>'''


def _anual_sections(D):
    ac = D["acum"]
    # panorama 6 cards
    panorama = f'''<div class="sec anual-only">01 · Panorama del semestre · ene–jun 2026</div>
    <div class="metrics anual-only" style="grid-template-columns:repeat(6,1fr)">
      <div class="mc"><div class="mc-bar" style="background:var(--teal)"></div><div class="mc-lbl">Ventas ene–jun</div><div class="mc-val">Bs {ac["v2026"]/1_000_000:.2f}M</div><div class="mc-sub">Bs {fmt(ac["v2026"])}</div></div>
      <div class="mc"><div class="mc-bar" style="background:var(--series-blue)"></div><div class="mc-lbl">Objetivo ene–jun</div><div class="mc-val">Bs {ac["obj"]/1_000_000:.2f}M</div><div class="mc-sub">Bs {fmt(ac["obj"])}</div></div>
      <div class="mc"><div class="mc-bar" style="background:var(--amber)"></div><div class="mc-lbl">% Cumplimiento</div><div class="mc-val" style="color:var(--amber)">{pct(ac["cumpl"])}</div><div class="mc-sub">acumulado ene–jun</div></div>
      <div class="mc"><div class="mc-bar" style="background:var(--green)"></div><div class="mc-lbl">Crec. vs 2025</div><div class="mc-val" style="color:var(--green)">{signed_pct(ac["var25"])}</div><div class="mc-sub">vs Bs {ac["v2025"]/1_000_000:.2f}M real 2025</div></div>
      <div class="mc"><div class="mc-bar" style="background:var(--purple)"></div><div class="mc-lbl">Mejor mes</div><div class="mc-val">{esc(ac["mejor_mes"])}</div><div class="mc-sub">Bs {fmt(ac["mejor_val"])} · pico del semestre</div></div>
      <div class="mc"><div class="mc-bar" style="background:var(--red)"></div><div class="mc-lbl">Brecha vs objetivo</div><div class="mc-val" style="color:var(--red)">Bs {fmt(ac["brecha"])}</div><div class="mc-sub">falta para la meta ene–jun</div></div>
    </div>'''
    # evolución mensual
    ev = ""
    for x in D["meses"]:
        ev += (f'<tr><td>{esc(x["mes"])}</td>{num_td(fmt(x["v2026"]))}{num_td(fmt(x["obj"]))}'
               f'{num_td(fmt(x["v2025"]))}{num_td(pct(x["cumpl"]))}{vf_td(x["var25"])}</tr>')
    ev += (f'<tr class="trow-total"><td>ACUM. ENE–JUN</td>{num_td(fmt(ac["v2026"]))}{num_td(fmt(ac["obj"]))}'
           f'{num_td(fmt(ac["v2025"]))}{num_td(pct(ac["cumpl"]))}{vf_td(ac["var25"])}</tr>')
    # presupuesto anual por marca
    pa = ""
    for x in D["ppto_anual"]:
        pa += (f'<tr><td><span class="badge {mbadge(x["marca"])}">{esc(prettify(x["marca"]))}</span></td>'
               f'{num_td(fmt(x["ppto"]))}{num_td(pct(x["pct"]))}{num_td(fmt(x["real25"]))}{vf_td(x["crec"])}</tr>')
    pat = D["ppto_anual_total"]
    pa += (f'<tr class="trow-total"><td>TOTAL</td>{num_td(fmt(pat["ppto"]))}{num_td("100.0%")}'
           f'{num_td(fmt(pat["real25"]))}{vf_td(pat["crec"])}</tr>')
    # comparativo jun26 vs jun25
    cp = ""
    for x in D["comp25"]:
        cp += (f'<tr><td><span class="badge {mbadge(x["marca"])}">{esc(prettify(x["marca"]))}</span></td>'
               f'{num_td(fmt(x["j26"]))}{num_td(fmt(x["j25"]))}{vf_td(x["var"])}{num_td(("+" if (x["abs"] or 0)>=0 else "−")+"Bs "+fmt(abs(x["abs"] or 0)))}</tr>')
    cpt = D["comp25_total"]
    cp += (f'<tr class="trow-total"><td>TOTAL</td>{num_td(fmt(cpt["j26"]))}{num_td(fmt(cpt["j25"]))}'
           f'{vf_td(cpt["var"])}{num_td(("+" if (cpt["abs"] or 0)>=0 else "−")+"Bs "+fmt(abs(cpt["abs"] or 0)))}</tr>')
    return f'''{panorama}
    <div class="two-col anual-only">
      <div><div class="sec">02 · Evolución mensual · real vs objetivo vs 2025</div>
        <div class="tw"><table>
          <thead><tr><th>Mes</th><th class="num">Ventas 2026</th><th class="num">Objetivo</th><th class="num">Real 2025</th><th class="num">% Cumpl.</th><th class="num">Var. 25</th></tr></thead>
          <tbody>{ev}</tbody>
        </table></div></div>
      <div><div class="sec">03 · Presupuesto anual 2026 por marca</div>
        <div class="tw"><table>
          <thead><tr><th>Marca</th><th class="num">Ppto 2026</th><th class="num">% Total</th><th class="num">Real 2025</th><th class="num">% Crec.</th></tr></thead>
          <tbody>{pa}</tbody>
        </table></div></div>
    </div>
    <div class="sec anual-only">04 · Comparativo por marca · junio 2026 vs junio 2025</div>
    <div class="tw anual-only" style="margin-bottom:28px"><table>
      <thead><tr><th>Marca</th><th class="num">Junio 2026</th><th class="num">Junio 2025</th><th class="num">Var %</th><th class="num">Var. Abs</th></tr></thead>
      <tbody>{cp}</tbody>
    </table></div>'''


def _leads_campana(D):
    L = D["leads"]
    lh = L["heaven"]; ls = L["suena"]; lt = L["total"]
    items = ""
    for it in D["campana"]["items"]:
        items += (f'<tr><td>{esc(it["producto"])}</td>{num_td("Bs "+fmt(it["precio"]))}'
                  f'{num_td(pct(it["dscto"]))}<td class="num"><b>Bs {fmt(it["final"])}</b></td></tr>')
    return f'''<div class="two-col mensual-only" style="margin-bottom:8px">
      <div>
        <div class="sec">Leads por marca · efectividad</div>
        <div style="display:flex;flex-direction:column;gap:14px">
          <div class="glass-card"><div class="gc-bar" style="background:var(--teal)"></div>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="display:flex;align-items:center;gap:8px;font-weight:800;font-size:1rem"><span class="dot" style="background:var(--teal)"></span>HEAVEN</span>
              <span class="badge b-teal">{pct2(lh["efect"])} efectividad</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:14px">
              <div><div style="font-size:1.5rem;font-weight:800;line-height:1">{fmt(lh["leads"])}</div><div class="ds-muted">leads</div></div>
              <div><div style="font-size:1.5rem;font-weight:800;line-height:1">{fmt(lh["ventas"])}</div><div class="ds-muted">ventas</div></div>
              <div><div style="font-size:1.5rem;font-weight:800;line-height:1">Bs {fmt(L["costo"])}</div><div class="ds-muted">costo / lead</div></div>
            </div>
            <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--gray-md);font-size:.72rem;color:var(--muted)">Inversión <b style="color:var(--text)">Bs {fmt(L["inv"])}</b> · Objetivo <b style="color:var(--text)">{fmt(L["obj"])}</b> leads · avance {pct(L["avance"])}</div>
          </div>
          <div class="glass-card"><div class="gc-bar" style="background:var(--amber)"></div>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="display:flex;align-items:center;gap:8px;font-weight:800;font-size:1rem"><span class="dot" style="background:var(--amber)"></span>SUEÑA</span>
              <span class="badge b-amber">{pct2(ls["efect"])} efectividad</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:14px">
              <div><div style="font-size:1.5rem;font-weight:800;line-height:1">{fmt(ls["leads"])}</div><div class="ds-muted">leads</div></div>
              <div><div style="font-size:1.5rem;font-weight:800;line-height:1">{fmt(ls["ventas"])}</div><div class="ds-muted">ventas</div></div>
              <div><div style="font-size:1.5rem;font-weight:800;line-height:1">—</div><div class="ds-muted">costo / lead</div></div>
            </div>
          </div>
        </div>
        <div class="alert amber" style="margin-top:14px;margin-bottom:0"><span class="ico">💡</span>
          <div>Total <b>{fmt(lt["leads"])} leads</b> → <b>{fmt(lt["ventas"])} ventas</b> ({pct2(lt["efect"])}). Acumulado del semestre.</div>
        </div>
      </div>
      <div>
        <div class="sec">Campaña del mes</div>
        <div class="tw lg" style="padding:22px 24px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
            <span class="badge b-teal" style="font-size:.7rem">COMBO TITANIO Y ORO</span>
            <span class="badge b-red" style="font-size:.7rem">−45%</span>
          </div>
          <p class="ds-body" style="margin-bottom:14px">{esc(D["campana"]["mecanica"])}</p>
          <div class="tw" style="margin-bottom:12px"><table>
            <thead><tr><th>Producto</th><th class="num">Precio</th><th class="num">% Dscto</th><th class="num">Con dscto</th></tr></thead>
            <tbody>{items}</tbody>
          </table></div>
          <div style="font-size:.8rem;color:var(--muted)"><b style="color:var(--text)">Vigencia:</b> {esc(D["campana"]["vigencia"])}</div>
        </div>
      </div>
    </div>'''


def main():
    ap = argparse.ArgumentParser(description="Genera el Dashboard Empresarial de JULIO (mes en curso) desde el Excel.")
    ap.add_argument("xlsx", nargs="?", default=DEFAULT_XLSX)
    ap.add_argument("-o", "--out", default=DEFAULT_OUT)
    args = ap.parse_args()
    if not os.path.exists(args.xlsx):
        sys.exit(f"No existe el Excel: {args.xlsx}")
    D = extract(args.xlsx)
    html = build_html(D)
    with open(args.out, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"OK -> {args.out}  ({len(html):,} bytes)  fuente: {D['_xlsx']}")


if __name__ == "__main__":
    main()
