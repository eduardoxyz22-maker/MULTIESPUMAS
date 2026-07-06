# Dashboard Empresarial de Ventas 2026 · Gerencia (Heaven Colchones)

Panel ejecutivo de una sola página (4 vistas: **Todas / Mensual / Semanal / Anual**) con
cierre del mes, desviación vs presupuesto, evolución, desempeño por tienda, rendimiento por
marca, seguimiento semanal, proyección de cierre y plan de acción. Estética "Marfil templado".

**Publicado en:** `dashboard-empresarial.html` (GitHub Pages).

## Cómo actualizar (solo pasar el Excel)

```bash
python generar_empresarial.py "ruta/al/VENTAS 2026 SEGUIMIENTO (Recuperado).xlsx"
```

Esto regenera `dashboard-empresarial.html`. Sin argumentos usa la ruta por defecto en Descargas.
Opciones: `-o salida.html` para otra ruta de salida.

Requiere: `pip install openpyxl`.

## De dónde salen los datos

**Todo** sale del Excel de ventas — no hay ningún número escrito a mano ni "congelado":

- **Pestaña `Hoja1`** (hoja consolidada "Dashboard Hoja1") es la fuente principal: evolución
  mensual, por marca acumulado, leads, detalle por tienda, seguimiento semanal, líneas de
  producto, proyección por canal, tareas y campaña.
- **Pestaña `seg semanal`**: unidades por tienda del detalle semanal.

### Cálculos en vivo (no leídos de fórmulas cacheadas)

El script lee las **cifras base** del Excel y **calcula** todo lo derivado, para que nada quede
desincronizado:

- `% Cumplimiento` = ventas / objetivo
- `Variación` (vs mes anterior / vs 2025) = valor / referencia − 1
- `Brecha` = objetivo − ventas (sobre los totales ya redondeados)
- `% Alcance / Avance` = ventas / presupuesto
- `vs 2025` (por marca) = **presupuesto anual / real 2025 − 1** (columna "Ppto vs 2025" de Hoja1)
- `% Efectividad de leads` = ventas / leads
- Barras de presupuesto recortadas al 100% mostrando el % real; anillos por `conic-gradient`.
- El **resumen ejecutivo y la alerta** derivan sus cifras y los canales líderes/rezagados de los
  datos (top-2 y bottom-3 por % alcance; conteo de canales bajo el 65%).

Redondeo *half-up* (como Excel/JS). El HTML es autocontenido (tokens del design system inline;
única dependencia externa: la fuente Inter).

## Archivos

- `generar_empresarial.py` — generador (extracción + render).
- `_assets_empresarial.py` — CSS del dashboard (extraído, no editar a mano).
- `dashboard-empresarial.html` — salida generada.

## Nota

El mapa de celdas asume la estructura actual de `Hoja1` (ciclo de junio 2026: mayo vs junio,
acumulado ene–jun). El script **valida** las etiquetas clave y aborta con un mensaje claro si la
estructura del Excel cambió, para no producir cifras erróneas en silencio.
