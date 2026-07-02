# CONTEXTO — Automatización del Reporte ATC (Heaven Colchones)

> Documento de traspaso para retomar este trabajo en cualquier sesión/chat nuevo.
> Última actualización: 2026-07 (sesión de reactivación + rediseño del bundle).

## Qué es

Reportes automáticos de ATC (Atención Post-Venta) de Heaven Colchones, publicados
en GitHub Pages y generados desde el tablero **Trello ATC**.

| URL pública | Qué es | Se actualiza |
|---|---|---|
| `reporte-atc-20260522.html` | **Bundle React** (Dashboard, Análisis, **Kanban**, Lista). El bonito. | ✅ diario |
| `reporte-semanal-atc.html` | Reporte HTML simple (KPIs + tablas + barras). | ✅ diario |
| `atc-semanal.csv` | Datos crudos para Excel. | ✅ diario |

Base: `https://eduardoxyz22-maker.github.io/MULTIESPUMAS/`

⚠️ El nombre `reporte-atc-20260522.html` tiene una fecha fija SOLO por compatibilidad
del enlace que ya se comparte; su **contenido es fresco** (no es un snapshot de mayo).

## Fuente de datos: Trello

- **Board ID**: `cFbJp9DO` — https://trello.com/b/cFbJp9DO/atc
- **Secrets** (GitHub → Settings → Secrets → Actions): `TRELLO_API_KEY`, `TRELLO_TOKEN`
- La API de Trello (`api.trello.com`) está **bloqueada** dentro del entorno de Claude Code.
  → No se puede probar la generación real localmente; se prueba con **datos simulados**
  (monkeypatch de `urllib.request.urlopen`) o corriendo el **workflow** en GitHub Actions.

## Arquitectura / archivos clave

- **`generar_reporte_atc.py`** — genera `reporte-semanal-atc.html` + `atc-semanal.csv`
  desde la API de Trello. (Ya NO escribe el archivo 20260522; eso lo hace el de abajo.)
- **`generar_reporte_atc_bundle.py`** — regenera el **bundle Kanban** `reporte-atc-20260522.html`
  reinyectando datos frescos dentro del bundle React original (ver "Cómo funciona el bundle").
- **`reporte-atc-template.html`** — copia **pristina** del bundle React original. Plantilla
  estable de la que se regenera cada vez. **No editar a mano.**
- **`.github/workflows/reporte-semanal-atc.yml`** — corre ambos generadores y publica los 3
  archivos en **UN solo commit** (evita que GitHub Pages dispare varios deploys y se atasque).
  - Cron: `0 21 * * *` → **diario 17:00 Bolivia** (UTC-4). Antes era semanal (lunes).
  - También `workflow_dispatch` (Actions → Reporte Semanal ATC → Run workflow).
- **`publish_atc.py`** — helper viejo (commit por API). El workflow actual usa `git` directo.
- **`.claude/skills/atc-multiespumas.md`** — skill de referencia (se auto-carga en Claude Code).

## Cómo funciona el bundle (lo importante)

`reporte-atc-20260522.html` es un **standalone de Claude Artifacts** ("omelette bundler"):
un `<script type="__bundler/manifest">` con ~29 assets en **gzip+base64** (React, Babel,
componentes, fuentes, datos).

`generar_reporte_atc_bundle.py` NO toca el diseño; solo parcha estos assets:

1. **Asset `655a879d`** — datos: reemplaza
   - `window.TRELLO_DATA = [...]` (las tarjetas, esquema enriquecido)
   - `window.TRELLO_META = {...}` (totalTarjetas, generadoEn, listas) → encabezado (fecha + "N/N")
2. **Asset `c8e379b4`** — `LIST_ORDER` + `LIST_DOT_COLOR`: se reemplazan con las **listas
   reales** del tablero (así una lista nueva en Trello aparece sola como columna del Kanban).
3. **Asset `6d573ff7`** — etiqueta "N etapas" y el widget de vendedoras (`.slice(0,99)` = todas).
4. **Asset `08df21b3`** — `currentYear` del análisis de antigüedad → año actual (era fijo 2026).

Cada asset se descomprime, se edita el texto, se re-gzip (`mtime=0`) y se re-base64 en el manifest.

### Esquema de cada tarjeta (window.TRELLO_DATA)
```
id, tablero, lista, listaCorta, tarjeta, descripcion, estado, completada,
archivada, url, cliente, telefono, direccion, producto, problemas[], vendedora,
garantia, medida, plazas, urgente
```

### Clasificadores (heurísticos, en generar_reporte_atc_bundle.py)
- **producto**: Oro, Titanio, Plata, Bahía, Roho, Heaven, Sómier, Especial, o "Sin clasificar".
- **problemas**: Hundimiento, Resortes, Retapizado / costura, Ruido, Patas, Tela / pillow,
  Cambio, Cotización, o "Otro" (fallback).
- **garantia**: "Con garantía" / "Sin garantía" / "No especificado" (según el texto de la tarjeta).
- **vendedora**: MIRIAN, MARIA, ISABEL, CAROLA, NORMA, MARIA ISABEL, TIENDA AMIGA, MORENO,
  ROHO, CHARCAS, o "Sin asignar". (Ojo: "ROHO" es producto y vendedora → caso borde.)
- **listaCorta**: mapea nombres de lista de Trello a nombres cortos (ver `LISTA_CORTA`).

## Cómo actualizar / operar

- **Manual ahora**: Actions → **Reporte Semanal ATC** → Run workflow.
- **Automático**: diario 17:00 Bolivia.
- **Ver cambios en el navegador**: recargar con `Ctrl+Shift+R` o `?v=NUMERO` (por la caché de Pages).
- **Si Pages se atasca** (deploy "in_progress" que no termina): suele ser por commits muy
  seguidos. El workflow ya publica en 1 commit para evitarlo; si pasa, re-disparar el deploy.

## Cómo probar sin Trello (en el entorno de Claude)
Monkeypatch de `urllib.request.urlopen` devolviendo JSON simulado de `/lists` y `/cards`,
setear `ATC_BUNDLE_TEMPLATE`/`ATC_BUNDLE_OUTPUT`, llamar `main()`, y verificar:
manifest válido, 29 assets, `window.TRELLO_DATA`/`_META` reemplazados, `LIST_ORDER` correcto.
También se puede renderizar con Playwright/Chromium (necesita internet; en el sandbox da
`[bundle] error` por red bloqueada — el original hace lo mismo).

## Notas / decisiones tomadas
- Las tarjetas KPI de arriba no suman el total porque excluyen algún estado:
  - Pendientes + Completadas + **Archivadas** = total.
  - "Garantía vigente: X vs Y sin" excluye las **No especificado** (X + Y + NoEsp = total).
- Widget "Vendedora / asesora": muestra **todas** (antes tope de 7).
- Kanban: muestra **todas las listas** del tablero (antes 5 fijas → se ocultaban las de
  "ATC DEVUELTAS LOG" = "Devueltas").
- Pendiente opcional (no hecho): agregar "Otro" a la matriz Producto×Problema del tab Análisis.

## Historial (PRs de esta reactivación)
- #5 Restaurar automatización semanal (scripts + workflow que estaban solo en una feature branch).
- #7 `reporte-atc-20260522.html` con diseño Kanban + datos frescos (reinyección en el bundle).
- #8 Kanban dinámico: mostrar todas las listas del tablero (arregla 44 tarjetas ocultas).
- #9 Año de análisis dinámico + mostrar todas las vendedoras.
- #10 Cron diario 17:00 Bolivia.
