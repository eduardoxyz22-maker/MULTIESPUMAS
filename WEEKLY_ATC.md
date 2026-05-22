# Prompt: Reporte Semanal ATC — Heaven Colchones

Genera el reporte semanal de Atención al Cliente (ATC) del tablero Trello.

## Instrucciones

1. Ejecuta `python trello_report.py` para obtener los datos frescos del tablero ATC.
   - Si falla por red, lee `reporte_trello.csv` como fuente de datos.

2. Analiza los datos y genera un archivo `REPORTE_SEMANAL_ATC_<FECHA>.md` (fecha en formato YYYYMMDD) con las siguientes secciones:

### Estructura del reporte

```
# Reporte Semanal ATC — Heaven Colchones
**Semana del:** <lunes> al <domingo>
**Generado:** <fecha y hora>

## Resumen Ejecutivo
- Total tarjetas activas por lista
- Tarjetas completadas esta semana
- Tarjetas con más de 14 días sin movimiento (críticas)
- Tarjetas sin descripción (requieren completar información)

## Estado por Lista
Para cada lista: nombre, cantidad activa, completadas, archivadas.

## Tarjetas Críticas (requieren atención inmediata)
Lista de tarjetas que:
- Tienen "URGENTE" en la descripción
- Están en "ATC LISTAS PARA DEVOLVER PROD" sin marcar completadas
- Tienen historial repetido de ATCs (cliente recurrente)

## Tarjetas por Vendedora
Agrupar por vendedora mencionada en la descripción:
MIRIAN, MARIA, ISABEL, CAROLA, NORMA, otras.
Mostrar: nombre vendedora → cantidad de casos activos.

## Problemas más frecuentes
Top 5 tipos de reclamo identificados en las descripciones:
(hundimiento, resortes, descosturado, retapizado, ruido, patas, etc.)

## Acciones recomendadas
3-5 acciones concretas basadas en los datos del tablero.

## Tarjetas sin descripción
Lista de tarjetas que tienen descripción vacía o muy corta (<20 caracteres).
```

3. Guarda el archivo con nombre `REPORTE_SEMANAL_ATC_<YYYYMMDD>.md` en el directorio actual.

4. Imprime un resumen de 5 líneas al final indicando qué se generó.

## Notas
- Las credenciales Trello están en variables de entorno `TRELLO_API_KEY` y `TRELLO_TOKEN`.
- Si no hay acceso a red, trabaja con los datos de `reporte_trello.csv`.
- El tablero es ATC (ID: cFbJp9DO) de Heaven Colchones.
- Vendedoras conocidas: Mirian Salazar, Maria Flores, Isabel Robledo, Carola Chavez.
