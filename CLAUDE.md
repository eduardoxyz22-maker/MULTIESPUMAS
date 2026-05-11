# MULTIESPUMAS — Dashboard de Ventas Heaven Colchones

Dashboard automático de pipeline de ventas para **Heaven Colchones**, publicado en GitHub Pages y actualizado diariamente desde Kommo CRM.

## URL del dashboard
https://eduardoxyz22-maker.github.io/MULTIESPUMAS/

## Arquitectura

- **`generar.py`** — Script Python (stdlib pura, sin dependencias externas) que:
  1. Llama a la API de Kommo (`eanez.kommo.com`) para obtener pipelines, usuarios y leads del mes actual
  2. Calcula KPIs: conversión, estancados, calificados, ticket promedio, rendimiento por vendedora
  3. Genera `index.html` con el dashboard completo usando reemplazos de `__PLACEHOLDER__`

- **`index.html`** — Dashboard HTML/JS generado automáticamente. Tema claro, header teal `#00B5AD`.

- **`.github/workflows/update-dashboard.yml`** — GitHub Actions que corre `generar.py` cada día a las 11:00 AM hora México (17:00 UTC) y hace commit del `index.html` actualizado.

## Credenciales Kommo
- Subdominio: `eanez`
- Token: hardcodeado en `generar.py` (Bearer JWT, expira ~2026-10-28)
- Si el token expira, reemplazar la variable `TOKEN` en `generar.py`

## Etapas del pipeline
`Incoming leads` → `Nueva consulta` → `Interesado` → `Cotizacion enviada` → `Agendado / Visita` → `Compradores` → `No Responden`

## Vendedoras
Mirian Salazar, Maria Flores, Isabel Robledo, Carola Chavez

## Para actualizar manualmente
GitHub → Actions → **Actualizar Dashboard Diario** → **Run workflow**

## Para modificar el dashboard
Editar `generar.py`. La sección HTML está en la variable `TEMPLATE` (línea ~263). Los `__PLACEHOLDER__` son reemplazados al final del script con `str.replace()`.
