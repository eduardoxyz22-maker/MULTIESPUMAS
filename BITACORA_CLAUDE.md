# BITÁCORA — Dashboard Heaven Colchones

Memoria de trabajo para Claude (y futuros mantenedores). Última actualización: **2026-07-02**.
Leer junto con `CLAUDE.md`. Aquí está el *porqué* de las cosas y los procedimientos operativos.

---

## 1. Estado actual del sistema (julio 2026)

- **Dashboard en vivo**: https://eduardoxyz22-maker.github.io/MULTIESPUMAS/ — siempre muestra el MES EN CURSO (hora Bolivia).
- **Archivos históricos**: `panel_YYYY_MM.html` (uno por mes cerrado). Se navegan desde el botón **Historial**.
- **IA horneada (`--bake-ai`)**: **PAUSADA** en `panel.yml` para que el workflow tarde ~1-2 min en vez de ~20. El análisis IA corre en el navegador como fallback. Restaurar agregando `--bake-ai` al comando cuando se termine la fase de ajustes.
- **Hora**: `generar.py` usa `utcnow() - 4h` (Bolivia). El runner de Actions corre en UTC; antes el sello "Actualizado" salía 4h adelantado.

## 2. Cambios hechos en las sesiones 2026-06-19 → 2026-07-02

### Pestaña Resumen (`panel_template.html`, función `ViewResumen`)
- **Barra "Origen de carga" (Manual vs Automático)** entre "Pulso del mes" y "Distribución por etapa". Clickeable → drawer con desglose manual/bot por vendedora (modo `split` del KpiDrawer).
- **Fichas del "Pulso del mes" clickeables** (las 10): cada `Kpi` recibe prop `detail` (construida con el helper `mkDetail`) y al click abre **`KpiDrawer`** con el desglose por vendedora (barra comparativa + valor). `window.__kpiDetail` es el hook global; el drawer soporta una segunda sección (`extraTitle`/`extraRows`).
- **Card "Rendimiento de origen"** rediseñada en DOS cortes sobre la MISMA base (los cierres del mes, `G.cierres`), ambas suman 100%:
  1. *¿De qué tipo de carga?* → ✍ Manual (este mes) / ⚙ Bot (este mes) / ↩ De meses anteriores.
  2. *¿De qué canal?* → canales reales + "⚪ Sin canal marcado" (agrupa los fallback Carga manual/Bot) + ↩ De meses anteriores.
  - La fila **"↩ Cerrados de meses anteriores"** (carry) SIEMPRE va aparte, influye en el %, y es clickeable → drawer con desglose por vendedora Y por canal (`byV` + `byCh`). Sirve para **medir tiempo de cierre** (ventas de leads que tardaron >1 mes). El usuario valora esa distinción — NO fundirla en los canales.
- **Tablero de responsabilidad (`TeamTable`)**:
  - Columna **Cerrado** (v.value, verde) separada de **Pipeline** (v.pipeline) — antes "Pipeline" mostraba el cerrado, mal etiquetado.
  - Fila **`tfoot` "Total equipo"**: leads, cierres, conv, ticket, cerrado, pipeline, mediana 1ª respuesta.
  - Columna **Disciplina CRM** = tiempo de **1ª respuesta** (`promTxt`, verde ≤1h / ámbar ≤4h / rojo >4h) con `%<24h` como sub-dato.

### Lógica de datos (`generar.py`)
- **CONVERSIÓN HONESTA POR COHORTE** (clave): los "cierres" de un canal cuentan SOLO leads que ENTRARON este mes Y cerraron este mes (`ld.id in cur_ids`). Los cierres del mes cuyo lead entró antes van a la fila carry `{"carry": True, "name": "Cerrados de meses anteriores"}` con `byV` y `byCh`. Así: Σ cierres canales + carry = cierres totales (caja) y ningún canal supera 100%. Antes Referido daba 200% (1 lead / 2 cierres de meses previos).
- `origin` incluye `manualClosed/autoClosed/manualCloseRate/autoCloseRate` (tasa de cierre de la cohorte por tipo de carga; ~57% manual vs ~1% bot).
- `norm_channel`: reconoce **TikTok**, **Cliente antiguo**, tolera el typo **"Instragram"**, y "visita" → Walk-in.
- Cada vendedora emite además `interesado` (para el drawer de esa ficha).
- `write_outputs`: si `(YEAR, MONTH) != mes actual` (se pasó `--month/--year`), escribe SOLO `panel_YYYY_MM.html` — nunca pisa el `index.html` en vivo.
- `build_archives`: el mes en curso apunta a `#`; meses pasados a su archivo.

### Workflow (`.github/workflows/panel.yml`)
- `workflow_dispatch` acepta **inputs `month`/`year`** para regenerar el archivo histórico de un mes cerrado (Run workflow → month=6, year=2026).
- Corre 2 crons: 14:00 y 21:00 UTC (10:00 y 17:00 Bolivia) + push a `generar.py`/`panel_template.html` + botón manual.
- Commit del bot: `heaven-bot`, mensaje "Panel YYYY-MM-DD HH:MM (auto)" (fecha en UTC).

### Navegación entre meses (fix importante)
- Problema: los paneles archivados quedan CONGELADOS con la lista de meses de su época → no conocen meses futuros ni tienen link de vuelta.
- Fix en template: si `location.pathname` matchea `panel_\d{4}_\d{2}\.html`, el dropdown Historial muestra arriba **"Mes en curso — en vivo"** (→ `index.html`) y la etiqueta del mes propio dice "viendo" en vez de "actual".
- **Junio y Mayo 2026 fueron regenerados** con el template final (2026-07-02). Meses archivados ANTERIORES a un cambio de template requieren regeneración para recibirlo.

### Kommo
- Campo personalizado **"Canal"** (tipo lista, obligatorio en 6 etapas) creado el 2026-06-26 con opciones: Facebook, Instragram *(typo pendiente de corregir a "Instagram")*, Tiktok, Visita tienda, Referido, Cliente antiguo. **Lo llenan las vendedoras a mano** (se decidió NO automatizarlo porque toda la publicidad desemboca en WhatsApp y el CRM no puede saber el origen real).
- `detect_channel()` busca campo con "fuente/origen/source/canal/utm/procedencia" en el nombre; fallback por tags; último recurso: `created_by == 0` → bot, si no → carga manual.
- Los leads históricos sin canal seguirán como "Sin canal marcado" — se llena de a poco.

## 3. Procedimientos operativos (playbooks)

### Regenerar un mes cerrado
1. Preferido: GitHub → Actions → "Generar Panel Heaven" → **Run workflow** → month/year.
2. Si no se puede disparar (el MCP da 403 en `workflow_dispatch` y `rerun`): agregar temporalmente al `run:` de panel.yml una línea `python generar.py --month M --year YYYY` (one-shot), tocar un comentario en `generar.py` (el push-trigger solo mira `generar.py`/`panel_template.html`), pushear, esperar el commit del bot, y RETIRAR la línea (quitar panel.yml solo NO re-dispara el workflow).

### GitHub Pages atascado (deploys fallan con "deployment_queued → Timeout")
- Síntoma: `pages-build-deployment` falla a los ~10 min; hasta los reintentos del bot `github-pages` fallan; githubstatus.com en verde → es atasco del pipeline DEL REPO, no incidente global.
- **Fix que funcionó (2026-07-02)**: Settings → Pages → Branch: **None** → Save → esperar 10 s → Branch: `main` /(root) → Save. El siguiente deploy sale limpio.
- Evitar: muchos pushes seguidos amontonan deploys que se auto-cancelan y pueden atascar la cola.

### Reglas para no romper nada
- **NO pushear a main mientras el workflow del panel está corriendo**: el bot hace `git push || echo "nada que empujar"` — si main avanzó, su push FALLA EN SILENCIO y se pierde la corrida.
- Validar antes de commitear: `python3 -c "import ast; ast.parse(open('generar.py').read())"` y extraer los bloques `<script>` del template y pasarles `node --check` (el JSX está precompilado a `React.createElement`; un paréntesis de más/menos rompe TODO el dashboard en blanco).
- El botón "Actualizar" del dashboard SOLO recarga la página; los datos se regeneran con el workflow.
- La caché de Pages tarda 1-10 min; verificar con Ctrl+Shift+R.
- Verificar publicación real: `git show origin/main:index.html | grep ...` (el proxy del sandbox BLOQUEA github.io y githubstatus.com por curl/WebFetch; usar git o el MCP de GitHub).
- Los resultados del MCP `actions_list` exceden el límite → se guardan en archivo; parsearlos con python/json.

## 4. Decisiones de producto tomadas
- Conversión por canal = **cohorte** (entraron Y cerraron este mes), nunca >100%.
- "Cerrados de meses anteriores" = fila propia con % sobre el total de cierres, clickeable con doble desglose. Mide tiempo de cierre.
- "Sin canal marcado" agrupa los cierres de leads fallback (manual/bot) en el corte por canal.
- Etiquetado del origen: manual por las vendedoras preguntando "¿cómo nos encontraste?".
- Insight núcleo del negocio: la carga manual convierte ~57% vs ~1% del bot; ~8% de los leads (manuales) producen ~90% de las ventas.

## 4b. Adiciones del 2026-07-02 (tarde)

- **Ficha "Unidades vendidas"** en el Pulso del mes: suma `metadata.quantity` de los `catalog_elements`
  (pestaña Productos de Kommo) de los cierres del mes, por vendedora (clic → drawer). El dinero
  (cerrado/ticket/pipeline) SIGUE saliendo del campo **Presupuesto** (`price`), NO del valor de productos.
  Producto sin cantidad cuenta como 1. Los fetches de leads llevan `with=contacts,catalog_elements`.
- **REGLA CRÍTICA DE CONTEO**: un lead solo cuenta como venta (cierre + monto + unidades) si está en
  etapa **Compradores** Y tiene **"Fecha contrato"** dentro del mes. Compradores sin Fecha contrato =
  invisible para el dashboard (caso real: lead de Maria con producto que no sumaba unidades).
- **Etapa "Atendido"** agregada al embudo en Kommo: clasificada con clase propia (`atendido`), color
  cyan #22A7C9 en la distribución. NO cuenta como calificado (calificados = al menos Interesado).
  El tiempo de 1ª respuesta ya la cubre automáticamente (evento `lead_status_changed`).
- **GitHub Pages se atascó** (5+ deploys "deployment_queued→timeout" con status global verde):
  se resolvió con el toggle Settings→Pages→None→main. Documentado como playbook en §3.

## 5. Pendientes
1. **Reactivar `--bake-ai`** en panel.yml cuando terminen los ajustes de diseño (el usuario avisará).
2. **Conversión global** (ficha del Pulso, hoy = cierres÷leads "caja"): decidir si pasa a cohorte. Pendiente de decisión del usuario.
3. Corregir el typo **"Instragram" → "Instagram"** en el campo Canal de Kommo (el código lo tolera).
4. Borrar `.pages-redeploy` (archivo basura de los redeploys forzados) en algún commit futuro.
5. Token Kommo expira ~2026-10-28 (secret `KOMMO_TOKEN`).
