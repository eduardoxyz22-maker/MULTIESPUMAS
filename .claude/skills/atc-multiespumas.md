# ATC MULTIESPUMAS

Skill de referencia para el Reporte Semanal ATC de Heaven Colchones.

## URLs en producción

| Archivo | URL |
|---|---|
| Reporte ATC (fijo mayo 2026) | https://eduardoxyz22-maker.github.io/MULTIESPUMAS/reporte-atc-20260522.html |
| Reporte ATC (semanal auto) | https://eduardoxyz22-maker.github.io/MULTIESPUMAS/reporte-semanal-atc.html |
| CSV ATC (descarga directa) | https://eduardoxyz22-maker.github.io/MULTIESPUMAS/atc-semanal.csv |

## Tablero Trello ATC

- **Board ID**: `cFbJp9DO`
- **URL**: https://trello.com/b/cFbJp9DO/atc
- **Listas del tablero**:
  1. ATC SOLICITADAS COM
  2. ATC PROGRAMADAS PARA RECOJO LOG
  3. ATC EN PRODUCCION
  4. ATC LISTAS PARA DEVOLVER PROD
  5. POST VENT (COMERCIAL)

- **Credenciales** (en GitHub Secrets):
  - `TRELLO_API_KEY`
  - `TRELLO_TOKEN`

## Estructura del reporte-atc-20260522.html

Mismo bundler que `dashboard-comercial.html` (Claude Artifacts standalone).

### Assets en el manifest (UUIDs relevantes)

| UUID | Contenido |
|---|---|
| `08df21b3` | Datos hardcodeados ATC (tarjetas, listas, KPIs) |
| `655a879d` | Componentes principales (KPIs, tablas, gráficos) |
| `886778e1` | App principal React |
| `6d573ff7` | Componentes auxiliares |

### Regla crítica: botón Exportar HTML

El botón **debe estar dentro del `__bundler/template`** (HTML interno), NO en el HTML exterior.
El bundler hace `document.documentElement.replaceWith()` y destruye el HTML exterior.

Ver skill `dashboard-multiespumas` para el patrón completo de lectura/escritura de assets.

## Automatización semanal

### Script: `generar_reporte_atc.py`

Genera `reporte-semanal-atc.html` y `atc-semanal.csv` desde la API de Trello.

**KPIs calculados:**
- Total tarjetas / activas / completadas / críticas / archivadas
- % Resueltas
- Casos por vendedora (MIRIAN, ISABEL, CAROLA, MARIA, NORMA)
- Problemas más frecuentes (Hundimiento, Resortes, Descosturado, Retapizado, Ruido, Patas/Sómier, Sin garantía)
- Tarjetas críticas = activas en lista "ATC LISTAS PARA DEVOLVER PROD" o "ATC DEVUELTAS LOG"

### Script: `publish_atc.py`

Publica cualquier archivo a `main` vía GitHub API.
Acepta variable de entorno `PUBLISH_FILE` (default: `reporte-semanal-atc.html`).

### Workflow: `.github/workflows/reporte-semanal-atc.yml`

```yaml
on:
  schedule:
    - cron: '0 14 * * 1'   # Lunes 10:00 AM Bolivia (UTC-4)
  workflow_dispatch:
```

Pasos:
1. `python3 generar_reporte_atc.py` → genera HTML + CSV
2. `python3 publish_atc.py` (PUBLISH_FILE=reporte-semanal-atc.html)
3. `python3 publish_atc.py` (PUBLISH_FILE=atc-semanal.csv)

## Datos de las 55 tarjetas (snapshot mayo 2026)

### Resumen
- Total: 55 tarjetas
- Activas: 51 | Completadas: 14 | Archivadas: 4 | Críticas: 27

### Vendedoras detectadas automáticamente
Búsqueda por keyword en nombre/descripción de la tarjeta:
```python
VENDORS = ["MIRIAN","ISABEL","CAROLA","MARIA","NORMA"]
```

### Tipos de problemas detectados automáticamente
```python
PROBLEMS = {
    "Hundimiento":  ["UNDIDO","HUNDIMIENTO"],
    "Resortes":     ["RESORTE"],
    "Descosturado": ["DESCOSTURADO","RIBETE","COSTURA"],
    "Retapizado":   ["RETAPIZADO","RETAPIZ"],
    "Ruido":        ["RUIDO","SONIDO","SUENA"],
    "Patas/Sómier": ["PATA","SOMIER"],
    "Sin garantía": ["SIN GARANTIA","COTIZAR"],
}
```

## CSV: atc-semanal.csv

Columnas: `Tablero, Lista, Tarjeta, Descripcion, Vencimiento, Estado, Completada, Etiquetas, Asignado_a, Archivada, URL`

**URL de descarga permanente** (para conectar a Excel):
```
https://eduardoxyz22-maker.github.io/MULTIESPUMAS/atc-semanal.csv
```

En Excel: **Datos → Obtener datos → Desde la web** → pegar URL → Actualizar todo cada semana.

## Cómo generar el reporte manualmente

### Opción 1: GitHub Actions
Repo → **Actions → Reporte Semanal ATC → Run workflow**

### Opción 2: Local (Windows)
Requiere Python 3 instalado.

```bat
set TRELLO_API_KEY=c04c6c3101732a677397280dce583cb0
set TRELLO_TOKEN=ATTA64e2ddac3794d2bec33562e579713a8d273b410d385265834d6481a862f301e8C1A2C23C
python generar_reporte_atc.py
```

### Opción 3: Desde CSV existente
Si la API de Trello no está disponible, usar `reporte_trello.csv` de la feature branch
y correr el script de generación local que lee el CSV.

## Rama de trabajo

- Feature branch: `claude/trello-board-cards-api-K5JwL`
  - Contiene: `trello_cards.py`, `trello_report.py`, `generar_reporte_atc.py`, `publish_atc.py`, `WEEKLY_ATC.md`, `reporte_trello.csv`
- Main branch: archivos publicados en GitHub Pages

## Notas importantes

- La API de Trello (`api.trello.com`) está bloqueada en el entorno remoto de Claude Code.
  Workaround: pegar JSON desde el navegador o usar GitHub Actions (que sí tiene acceso a red).
- El reporte `reporte-atc-20260522.html` es un snapshot fijo de mayo 2026.
  El reporte `reporte-semanal-atc.html` se actualiza automáticamente cada lunes.
