# Prompt para Claude Code — Integrar el panel rediseñado a `generar.py`

Copia y pega TODO lo de abajo (desde "===") en Claude Code, dentro del repositorio **MULTIESPUMAS**. Antes, sube a una carpeta del repo (ej. `panel_redesign/`) estos archivos del diseño nuevo que ya tienes:

- `panel.html`  ← el panel autocontenido (un solo archivo, todo el CSS/JS inline). **Esta es la referencia visual y de comportamiento.**

Si tienes los archivos fuente sueltos, súbelos también (opcional, ayuda a Claude a leer el código limpio): `Panel.jsx`, `Views.jsx`, `Icons.jsx`, `panel.css`, `data.js`.

---

===

Eres un ingeniero senior. Trabajas en el repo **MULTIESPUMAS** (dashboard de ventas de Heaven Colchones que se autogenera desde Kommo y se publica en GitHub Pages).

## Contexto
- `generar.py` ya se ejecuta por GitHub Actions, consulta la API de Kommo, calcula KPIs y rellena un `TEMPLATE` HTML embebido reemplazando tokens `__PLACEHOLDER__` / inyectando JSON, y escribe el archivo publicado.
- Tengo un **rediseño nuevo y aprobado** del panel en `panel_redesign/panel.html` (autocontenido: HTML + CSS + JS inline, React vía Babel). Es la referencia exacta de diseño y comportamiento. Tiene 10 vistas: Resumen, Equipo, Seguimiento, Alertas, Análisis IA, Conversión, Semanal, Sucursales, Proyección, Datos; modo claro/oscuro; fichas desplegables por vendedora y por sucursal; metas editables; agentes de IA; historial; exportar CSV; moneda en **Bs (bolivianos)**.

## Objetivo
Hacer que `generar.py` **genere este diseño nuevo cada mes con los datos reales de Kommo**, conservando el flujo actual (GitHub Actions → publica a Pages).

## Tareas
1. **Lee** `panel_redesign/panel.html` y, si existen, los fuentes (`Panel.jsx`, `Views.jsx`, `data.js`, `panel.css`) para entender el contrato de datos. El objeto de datos vive en `window.PANEL_DATA` (alias `D` en el código) y contiene exactamente:
   - `month`, `year`, `prevMonth`, `curDay`, `daysInMonth`
   - `global`: `{ leads, prevLeads, cierres, pipeline, ticket }`  ← el total global DEBE ser la suma exacta del equipo (cada lead pertenece a una vendedora; nada "sin asignar").
   - `team[]`: por vendedora `{ ini, name, suc, color, photo, leads, prevLeads, cierres, conv, ticket, value, calif, califPct, noResp, noRespPct, agendado, u24, promTxt, tarde, nunca, backlog, metaCierres, metaMonto, v, nuevo? }`. La **conversión se calcula** como `cierres/leads*100` (no la escribas a mano).
   - `metrics`: `{ noResp, noRespPct, backlog, backlogPct, criticos7d, nuncaTocados, sinSucursalFichas, sinSucursalPct, abiertosSinValor, duplicadosTel, duplicadosFichas, interesado, agendado }`
   - `channels[]`, `funnel2[]`, `stagesGlobal[]`, `origin`, `stagesByV{}`, `archives[]`, `nav[]`
2. **Mapea** los datos que `generar.py` ya calcula desde Kommo a esa estructura `window.PANEL_DATA`. Donde el script use otros nombres (`sucursal`→`suc`, etc.), normalízalos. Si falta algún campo (`agendado`, `prevLeads` por vendedora, `metrics.*`), calcúlalo desde los datos de Kommo que ya tienes; no lo dejes fijo.
3. **Sustituye el `TEMPLATE`** embebido de `generar.py` por el HTML del rediseño. Mantén el patrón actual: en vez de `__PLACEHOLDER__`, inyecta un único bloque `<script>window.PANEL_DATA = {...JSON real del mes...}</script>` ANTES de los scripts del panel. Conserva el resto del panel (CSS/JS) tal cual está en `panel.html`.
4. **Diagnóstico y agentes de IA**: en el prototipo corren en vivo con `window.claude.complete`. En producción NO uses eso. En su lugar:
   - Al generar, llama UNA vez al modelo (usa la API key que esté en variables de entorno / secrets del repo; detecta si hay `ANTHROPIC_API_KEY` u `OPENAI_API_KEY`).
   - Pasa el mismo contexto de datos del mes y guarda los resultados (titular/diagnóstico/palancas/riesgo y los 4 agentes) como JSON dentro de `window.PANEL_DATA.ai = {...}`.
   - Ajusta el panel para que, si `window.PANEL_DATA.ai` existe, muestre ese texto horneado en vez de llamar al modelo en vivo (fallback: si no hay key, deja el comportamiento en vivo).
   - Si no quiero usar API key, hazlo configurable con una bandera `BAKE_AI = False` y que el panel siga llamando en vivo.
5. **Historial**: al generar el mes nuevo:
   - Escribe el mes en curso como `panel.html` (o el nombre que ya use el script).
   - Renombra/copia el mes anterior a `panel_AAAA_MM.html` y agrégalo al arreglo `archives` (`[{label:"Mayo 2026", url:"panel_2026_05.html"}, ...]`) que consume el botón **Historial**. Conserva todos los meses (o los últimos 12 si el repo crece mucho — pregúntame).
6. **Moneda**: todo en **Bs** (ya viene así en el panel; asegúrate de no reintroducir `$`).
7. **No rompas** el GitHub Action ni el cron actual. Haz los cambios mínimos en el flujo; solo cambia el TEMPLATE, el mapeo de datos, el horneado de IA y el historial.

## Validación antes de terminar
- Corre `generar.py` localmente (o con datos de prueba) y abre el HTML resultante: las 10 vistas deben renderizar, la suma del equipo debe cuadrar con el global, la conversión debe coincidir con `cierres/leads`, y el modo claro/oscuro debe funcionar.
- Verifica que el botón Historial liste los meses y que el diagnóstico IA muestre el texto horneado.
- Confírmame qué archivos cambiaste y pega el diff de `generar.py`.

Pregúntame cualquier ambigüedad (nombres de campos reales de Kommo, dónde está la API key, cuántos meses de historial) ANTES de asumir.

===
