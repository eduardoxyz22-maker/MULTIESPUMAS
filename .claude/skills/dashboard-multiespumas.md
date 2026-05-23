# DASHBOARD FINAL MULTIESPUMAS

Skill de referencia para mantener y actualizar el dashboard comercial de Heaven Colchones.

## URLs en producción

| Archivo | URL |
|---|---|
| Dashboard Comercial | https://eduardoxyz22-maker.github.io/MULTIESPUMAS/dashboard-comercial.html |
| Reporte Semanal ATC | https://eduardoxyz22-maker.github.io/MULTIESPUMAS/reporte-semanal-atc.html |
| CSV ATC (descarga directa) | https://eduardoxyz22-maker.github.io/MULTIESPUMAS/atc-semanal.csv |

## Estructura del dashboard-comercial.html

Es un archivo standalone de **~1.5MB** basado en Claude Artifacts con un bundler interno.

### Arquitectura crítica — leer antes de modificar

El archivo tiene DOS capas de HTML:

1. **HTML exterior** (`<html>` visible en el archivo) — contiene:
   - `<script type="__bundler/manifest">` — JSON con todos los assets comprimidos (gzip + base64)
   - `<script type="__bundler/template">` — JSON string con el HTML interno de la app

2. **HTML interior** (dentro del template JSON) — contiene la app React real

**⚠️ El bundler hace `document.documentElement.replaceWith()` al cargar** — cualquier elemento en el HTML exterior (botones, estilos) es DESTRUIDO. Todo debe estar dentro del `__bundler/template`.

### Assets en el manifest (UUIDs relevantes)

| UUID | Contenido |
|---|---|
| `eb1309ec` | Datos hardcodeados (tiendas, vendedores, clientes) |
| `625d865e` | App principal — estado React, día inicial |
| `5918afd0` | TopBar, KPIStrip, ResumenView, getDerivedData |
| `5b4721c5` | TiendasView, ExternosView, VendedoresView |
| `fbda8780` | Componentes auxiliares JSX |

### Cómo leer/modificar un asset

```python
import re, json, base64, gzip, io

content = open('dashboard-comercial.html', encoding='utf-8').read()
manifest_m = re.search(r'<script type="__bundler/manifest">(.*?)</script>', content, re.DOTALL)
manifest = json.loads(manifest_m.group(1).strip())

def decompress(uuid):
    entry = manifest[uuid]
    raw = base64.b64decode(entry['data'])
    if entry.get('compressed'):
        raw = gzip.decompress(raw)
    return raw.decode('utf-8')

def compress_encode(text):
    raw = text.encode('utf-8')
    buf = io.BytesIO()
    with gzip.GzipFile(fileobj=buf, mode='wb', mtime=0) as gz:
        gz.write(raw)
    return base64.b64encode(buf.getvalue()).decode('ascii')
```

### Cómo escribir cambios de vuelta al HTML

```python
# Después de modificar manifest[uuid]['data']:
new_manifest_json = json.dumps(manifest, separators=(',',':'))
m = re.search(r'<script type="__bundler/manifest">(.*?)</script>', content, re.DOTALL)
new_content = content[:m.start(1)] + '\n' + new_manifest_json + '\n  ' + content[m.end(1):]
with open('dashboard-comercial.html', 'w', encoding='utf-8') as f:
    f.write(new_content)
```

### Cómo modificar el template HTML (botón exportar, estilos, etc.)

```python
m = re.search(r'(<script type="__bundler/template">)(.*?)(</script>)', content, re.DOTALL)
open_tag, body, close_tag = m.group(1), m.group(2), m.group(3)
template_html = json.loads(body.strip())

# Modificar template_html...
# IMPORTANTE: escapar </script> al re-codificar
new_json = json.dumps(template_html).replace('</script>', '<\\/script>')

new_content = content.replace(
    open_tag + body + close_tag,
    open_tag + '\n' + new_json + '\n  ' + close_tag
)
```

## Datos del dashboard (eb1309ec)

### Estructura de tiendas
```javascript
{
  nombre: "ROHO",
  monto: 91792.5,          // Mayo día 18
  metaMin: 400000,
  presupuesto: 479220,
  mesPasadoMonto: 97418,   // Abril full month
  crecimientoVsAbril: -0.0578,
  ...
}
```

### Valores Abril 2026 (para actualizar cuando haya nuevo mes)
| Tienda | Abril |
|---|---|
| SUEÑA | 190,775 |
| HEAVEN | 484,456 |
| OTROS (Externos) | 300,989 |
| ROHO | 97,418 |

### Día inicial
En `625d865e`, línea ~6:
```javascript
const [dia, setDia] = _us(Math.min(new Date().getDate(), D.periodo.diasTotales));
```
Siempre arranca en el día actual del mes.

## Botón Exportar HTML

Está inyectado dentro del `__bundler/template` (no en el HTML exterior).
Buscar `exportarHTML` dentro del template JSON para encontrarlo.
Descarga el HTML completo como `Dashboard_Comercial.html`.

## Automatización ATC (GitHub Actions)

### Workflow: `.github/workflows/reporte-semanal-atc.yml`
- **Cron**: Lunes 10:00 AM Bolivia (14:00 UTC)
- Genera `reporte-semanal-atc.html` y `atc-semanal.csv`
- Los publica en `main` vía GitHub API

### Scripts
| Script | Función |
|---|---|
| `generar_reporte_atc.py` | Llama Trello API → genera HTML + CSV |
| `publish_atc.py` | Publica archivo a main (acepta `PUBLISH_FILE` env var) |

### Secrets requeridos en GitHub
- `TRELLO_API_KEY`
- `TRELLO_TOKEN`

### Trello Board
- Board ID: `cFbJp9DO`
- Board name: ATC

## Rama de trabajo

- **Feature branch**: `claude/trello-board-cards-api-K5JwL` — scripts Trello, workflow ATC
- **Main branch**: archivos publicados en GitHub Pages

## Cómo actualizar el dashboard con nuevo Excel

1. Leer el Excel con `openpyxl` (data_only=True)
2. Extraer datos de hojas: `MAYO GLOBAL`, `Dashboard`
3. Modificar el asset `eb1309ec` del manifest
4. Actualizar `mesPasadoMonto` y `crecimientoVsAbril` en tiendas cuando cambie el mes
5. Push a `main`

## Commit y push

```bash
git add dashboard-comercial.html
git commit -m "Dashboard: descripción del cambio"
git push -u origin main
# Si hay conflicto:
git pull origin main --rebase && git push -u origin main
```
