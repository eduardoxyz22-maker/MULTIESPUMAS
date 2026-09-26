# BITÁCORA — Dashboard Heaven Colchones

Memoria de trabajo para Claude (y futuros mantenedores). Última actualización: **2026-09-23** (§4fz-b).
⚠️ Las secciones NO están en orden: lo más nuevo del panel de pedidos (§4fe → §4fz) está hacia la
mitad del archivo, arriba de §4es. Buscar por el número (`## 4fz-b`, `## 4fz`).
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

## 4c. Adiciones del 2026-07-13

- **Detección del campo "Canal" (bug crítico corregido)**: `detect_channel` matcheaba primero
  `utm_source`/`utm_content` (vacíos) en vez del campo lista **Canal** que llenan las vendedoras.
  Fix: en la detección de campos se prefiere el campo de tipo lista (`select/multiselect/radiobutton`)
  cuyo nombre matchea "canal/fuente/origen/…" (`_is_src`, `_SEL`). Reveló que ~718/1140 leads del mes
  SÍ tenían Canal marcado pero se ignoraban; **Referido pasó de 0 a 10**. La lista de canales ahora
  siembra TODAS las opciones del dropdown de Kommo (`channel_enums`, incl. las de 0 leads) leyéndolas
  del campo, o de `/leads/custom_fields/{id}`, o del hardcode de respaldo.
- **Nombres de canal = TAL CUAL Kommo**: `detect_channel` devuelve el valor crudo del campo; `norm_channel`
  (solo para el fallback por tags) alinea sus etiquetas con el dropdown (Facebook, Instagram, Tiktok,
  Visita tienda, Referido, Cliente antiguo) para no partir una misma fila en dos.
- **"Sin canal marcado" clickeable** → drawer con cuántos cierres sin marcar tiene cada vendedora.
- **Card "Razón de pérdida"** en Resumen (etapa "Pedido cancelado – perdido"): tabla de razones con
  barras rojas, clickeable por razón → desglose por vendedora. **La razón vive en el `loss_reason_id`
  NATIVO de Kommo**, NO en un campo personalizado (el campo personalizado de pérdida está vacío para
  ~todos los leads). Se carga el mapa `loss_reason_id→nombre` desde `/leads/loss_reasons` y se usa con
  prioridad: **nativa → campo personalizado → "Sin razón definida"**. Realidad del negocio: las
  vendedoras casi no registran la razón (256/258 salen "Sin razón definida"); solo aparecen reales
  cuando alguien la marca ("Comprado del competidor", "Presupuesto insuficiente").
- **Productos vendidos**: card en Resumen con lista + cantidades (`build_products`), clickeable →
  desglose por vendedora; ficha "Unidades vendidas" en el Pulso. El dinero SIGUE saliendo del
  Presupuesto (`price`), no del valor de productos.

## 4d. Ubicaciones del panel de pedidos (2026-07-27)

Cadena de fallas que impedía que los pedidos aparecieran en el mapa, resuelta en este orden:

1. **Prioridad del pin invertida**: se leía `@lat,lng` (el CENTRO del mapa) antes que `!3d!4d`
   (el pin real) → 711 m de error en el enlace del usuario. Orden correcto, en `coordsDeLink`
   (pedidos.html) y `extractCoords` (google-apps-script.gs):
   **`!3d!4d` → grados DMS → Plus Code → parámetros (`q`/`query`/`destination`/…) → `@` → par suelto**.
2. **El servidor salía a internet antes de mirar el enlace**: `resolveOne` ahora prueba
   `extractCoords(url)` primero; recién si falla sigue redirecciones.
3. **Extracción del lado del cliente**: `coordsDeLink` resuelve en el navegador todo enlace que ya
   traiga coordenadas. Solo los cortos (`maps.app.goo.gl`) necesitan al servidor → el mapa ya no
   depende del redeploy del Apps Script.
4. **La app rechazaba coordenadas pegadas**: el campo era `type="url"` y exigía `^https?://`, o sea
   que el método MÁS confiable (copiar los números de Maps) estaba bloqueado. `normalizaUbicacion`
   acepta ahora link, coordenadas sueltas o Plus Code.
5. **Plus Codes (causa raíz de los 8 links cortos que seguían fallando)**: al compartir desde la
   **app de Maps del celular**, el destino del link corto es del tipo
   `/maps/place/5P2Q+PFX+Condominio+Asaí+2,+Santa+Cruz+de+la+Sierra/data=!1s0x93f1…` — **sin ninguna
   coordenada**: solo el Plus Code y el place ID. `extractCoords` devolvía null con razón.
   Se implementó el decodificador **Open Location Code** (`olcDecode`/`olcPrefijo`/`olcCoords`/
   `plusCodeDeTexto`) en LOS DOS archivos.
   - Google acorta el código sacándole los **4 primeros caracteres** y poniendo la ciudad en su lugar.
     Se recuperan con la referencia **`OLC_REF_LAT/LNG = -17.7833, -63.1821` (Santa Cruz de la Sierra)**.
   - ⚠️ Esa recuperación es exacta hasta **~50 km** del centro (verificado: 0 errores en 20 000 puntos
     a ±0,45°; falla más allá de ±0,5°, que es un límite matemático del código corto, no un bug).
     **Si algún día reparten en otra ciudad, hay que cambiar esa referencia.**
   - Verificado contra los vectores oficiales de `google/open-location-code` y con ida y vuelta.

## 4e. Panel de pedidos — cobros, fotos y entregas (2026-07-27)

Decisiones no obvias de esta tanda. **Ojo antes de tocar cualquiera de estas.**

- **Cobros múltiples del chofer**: el chofer anota varios pagos por pedido (efectivo + QR +
  tarjeta), cada uno con su monto. Se guardan **como texto en el campo `Método pago` que la
  planilla YA tenía**: `"Efectivo 6000 + QR 1750"`. Se eligió así a propósito, para no
  depender de un redeploy del Apps Script y para que quede legible en la hoja.
  `parseCobros()` lo vuelve a leer. Si se cambia ese formato, se pierde el histórico.
  - `objetivoCobro(p) = saldo + totalCobrado` — así el monto que puso el vendedor sigue
    siendo el mismo número a medida que entran los cobros.
  - **`p.saldo` NO se recorta en 0**: si cobraron de más queda negativo. Es lo que permite
    detectar el exceso (`excesoCobro`) y restaurar el saldo original al deshacer.
  - `applyPaid()` ahora escribe el monto (`"Efectivo 3500"`), no solo el método. Eso arregló
    de paso que la rendición por chofer se ponía en cero al recargar (`cobradoBs` es
    client-only, no tiene columna).
- **Fotos de la entrega**: van a **Drive**, carpeta `Fotos entregas MultiEspumas`; en la
  planilla (columna nueva `Fotos entrega`) va **solo el id del archivo**. Se comparten como
  **"cualquiera con el enlace puede ver"** — es lo que permite mostrarlas dentro del panel
  sin autenticación. La foto se **achica en el navegador del chofer** (canvas, máx 1280 px,
  JPEG 0.72): de 4–8 MB a ~150 KB. **Sin eso no se puede subir con datos móviles.**
- **`SCRIPT_VERSION` en el .gs** (hoy `2026-07-27-c`), devuelta en `geocode` y `list`, y
  comparada contra `SCRIPT_VERSION_ESPERADA` en pedidos.html. **Subirla en los dos lados
  cuando el .gs cambie**: es lo único que avisa si el usuario pegó el código pero NO creó
  versión nueva en Implementar (guardar no publica — nos costó varias vueltas descubrirlo).
- **Vendedor ROHO**: la OC es obligatoria, no puede repetirse entre pedidos de ROHO
  (`ocRepetidaRoho`), y en el Excel la columna "VENDEDOR - CLIENTE" lleva **la OC** en vez
  del nombre. Solo ROHO: Eduardo Añez también es "lite" pero no le aplica nada de esto.
- **Panel 🚚 Entregado**: parte del día agrupado por camión, entregados y pendientes.
  "Por cobrar" es el total del día con desglose (ya entregado / sin entregar); el aviso rojo
  es solo para lo que **salió y volvió sin cobrar**, que es el problema real.

## 4f. Panel de pedidos — "Mis pedidos" en fichas, chofer y atraso (2026-07-28)

- **"Mis pedidos" dejó de ser tabla**: son fichas (`misCardHtml`) que reusan el CSS
  `.cho-card` del panel del chofer. Las vendedoras miran esto del celular; la tabla obligaba
  a deslizar para los costados.
- **La fila "Chofer" se dibuja SIEMPRE** (`choferTexto`). Antes salía solo si ya había chofer,
  y entonces no se distinguía "todavía no le asignaron" de "no me lo está mostrando". Sin
  chofer dice *"Sin asignar todavía"*. Usa `vehiculoDe()`, que deduce el vehículo del chofer
  cuando no quedó guardado.
- **Atraso** (`minutosAtraso` / `atrasoBadge` / chip "⏰ Atrasados"):
  - `TURNO_FIN = {AM:13, PM:19}` — **hasta qué hora se espera cada turno, hora local**. Es una
    convención, no un dato de la planilla: si cambia el horario de reparto, se toca acá.
  - **`turnoDe()` existe por esto**: `normTurno()` devuelve `'AM'` cuando el campo viene
    vacío, y para avisar de un atraso eso miente — marcaría atrasado a la 1 de la tarde un
    pedido al que nadie le puso turno. `turnoDe()` devuelve `''` y ese pedido se juzga con
    todo el día (`TURNO_FIN.PM`). **No reemplazar una por la otra.**
  - Se calcula **en el navegador contra la hora del equipo**. No se guarda nada en la planilla:
    un pedido "atrasado" deja de estarlo solo con marcarlo entregado.
  - En el filtro "Atrasados" la lista se ordena **del más atrasado al menos**, al revés que el
    resto de las vistas (que van por fecha descendente).
- **📤 Cierre del día / 📤 Mañana** (`envioTexto(modo)`, overlay `envio-overlay`): arman el
  mensaje de WhatsApp que antes se mandaba a mano como Excel.
  - **"Mañana" agrupa por TURNO, "Cierre" por CAMIÓN.** No es una inconsistencia: la lista de
    mañana se manda la noche anterior, cuando todavía no se asignan camiones — en la prueba
    real fueron **14 de 15 "sin asignar"**, o sea un bloque gigante que no organizaba nada.
    El turno es la información que sí existe en ese momento. En el cierre los camiones ya
    salieron, así que ahí el camión sí es el eje. **Antes de "unificar" los dos, releer esto.**
  - **El cliente va primero y en negrita**, el vendedor (o la OC de ROHO) atrás. La planilla
    tiene "Vendedor - Cliente", pero puesto así el nombre del cliente queda enterrado a mitad
    de línea y el mensaje se vuelve ilegible en el celular.
  - Se numera con **`dayNumMap()`**, no con un contador por bloque: es el mismo número que va
    en la columna "N° del día" de la planilla y en las listas impresas, así "revisá el 7"
    significa lo mismo para todos. Dentro de cada bloque se ordena **por ese número, ascendente**
    (antes iba por zona y los números saltaban: #2, #3, #9, #11, #6… ilegible).
  - **Los avisos que aparecen en casi todos los pedidos van SOLO en el conteo de arriba**, no
    repetidos pedido por pedido ("sin verificar" salía en 9 de 15 = ruido, no alerta). Por
    pedido queda únicamente lo accionable: `⛔ NO HAY` pegado al producto y `⚠️ FALTA UBICACIÓN`.
  - `envioParaCargar()` cierra el mensaje de mañana con las **unidades por producto**: es lo
    que el almacén necesita y lo que antes se contaba a mano.
  - **`ENVIO_PARTE` ('todo' | 'AM' | 'PM')** corta el mensaje de mañana en dos. Con 15 pedidos
    el texto entero da ~4.400 caracteres y WhatsApp lo muestra con "Leer más"; partido quedan
    dos de ~2.400 que entran completos. Solo aplica a "mañana" (en el cierre el día ya pasó y
    va entero) y se resetea a 'todo' al cambiar de modo. Cuando está filtrado, el encabezado,
    el conteo de "Falta" y el TOTAL A CARGAR son **los del turno**, no los del día, y **no se
    repite el título del bloque** porque ya lo dice el encabezado.
  - `envioTitulo()` encierra el título entre **dos** rayas (no una arriba). Con una sola, al
    scrollear en el celular el corte AM/PM se pasaba de largo. La raya es corta a propósito:
    más larga que el ancho del teléfono, WhatsApp la parte en dos y queda peor que sin nada.
  - **Se descartó el PDF** (decisión del usuario, 2026-07-29): el texto se lee en el chat sin
    descargar nada, el buscador de WhatsApp lo encuentra y los teléfonos son tocables. Un PDF
    pierde las tres cosas. **No reintroducirlo sin que lo pidan.**
  - El texto se muestra en un **textarea editable** y es exactamente lo que se copia. No hay
    un "preview" distinto del mensaje real, a propósito.
  - `wa.me` corta los mensajes largos: arriba de 3500 caracteres la ventana avisa y empuja a
    usar Copiar. **Copiar es el camino confiable**, WhatsApp por enlace es la comodidad.

## 4g. Fábrica de producción y estado deducido (2026-07-29)

- **El 🏭 se partió en dos botones por producto: `🏭 MORENO` y `🏭 MULTI`** — a qué fábrica se
  pidió fabricar. `setProdProduccion(id, idx, lugar)`; tocar el mismo desmarca, tocar el otro
  cambia de fábrica. `PROD_LUGARES` tiene los dos valores (`'Moreno'`, `'Multiespumas'`).
- **⚠️ NO confundir con `📥 IM`.** El botón de recoger IM quedó **intacto** y es otra cosa: ahí
  el stock **ya existe** en el almacén de Moreno y hay que ir a buscarlo. Lo nuevo es que se
  pidió **fabricar**. Dos conceptos, dos marcas; el usuario fue explícito en esto.
- **El lugar vive en el producto (`x.prodEn`), no en el pedido.** Los productos viajan como
  JSON en `_productos_json`, así que un campo nuevo se guarda **sin tocar el Apps Script**
  (nada de columna nueva ni redeploy). Y es lo correcto: el lugar es del producto que se
  fabrica, no del pedido. **Si algún día se quiere a nivel pedido, hace falta columna nueva.**
- **`estadoStock(p)` — el estado se DEDUCE de los tildes**, y esa es la columna "Estado" que
  ahora va **pegada a Productos** en la tabla (antes al final, había que scrollear).
  Prioridad, de más urgente a menos: `🔴 No hay` (algo ✗ que **no** se pidió a fábrica) →
  `🏭 En producción · MORENO/MULTI` → `⬜ Sin revisar (n de m)` → `📥 Recoger de IM` →
  `🟢 En stock`. El "no hay sin pedir" va primero a propósito: es lo único que nadie resolvió.
- **`p.estado` (el marcado a mano en la ficha) NO se tocó** — sigue guardándose en su columna,
  alimenta los colores de fila (`rowKind`) y el flujo de reprogramar. En la tabla y en la ficha
  se muestra **atrás y en gris solo si dice algo distinto** al deducido, para que no se
  contradigan en silencio. Antes la ficha podía decir "Estado: Sin marcar" con los productos
  marcados en producción.
- Si un producto tiene `enProd` pero no `prodEn` (datos viejos de la planilla), el estado dice
  **"En producción · sin marcar dónde"**. No se inventa una fábrica. Y en la lista de productos
  aparece un **botón `🏭 ¿?` resaltado**: sin él ese estado no se veía en ningún botón y —peor—
  **no había forma de desmarcarlo**, quedaba trabado. Al elegir MORENO/MULTI o tocar el `¿?`
  desaparece. **No borrar ese botón pensando que sobra.**
- **`syncVerificado(p)` ahora también se llama desde `setProdProduccion`**: elegir la fábrica
  marca solo el "🟡 En producción" de abajo (lo pidió el usuario). La prioridad de `p.estado`
  es la misma que la de `estadoStock`: `No hay` (✗ sin pedir a nadie) > `En producción` >
  `En stock`.
- **⚠️ `rowKind()` mira los PRODUCTOS para el rojo, no `p.estado`.** Al poner "En producción"
  automáticamente, si el color siguiera saliendo de `p.estado` la fila dejaría de ser roja y un
  faltante pasaría desapercibido — justo lo que la regla de colores promete que no pasa
  (§ "Rojo gana sobre todos los demás"). Un ✗ pinta rojo **aunque ya se haya pedido a fábrica**;
  la columna Estado, en paralelo, dice en qué fábrica está. Son complementarios: el rojo avisa,
  la columna informa. **Esto lo detectó test_full ("p4 ✗ + en producción → gana el rojo") — no
  aflojar esa prueba.**

## 4d. Fix crítico de conteo de ventas (2026-07-30)

- **Síntoma (usuario)**: en Kommo, filtrando *Fecha contrato: Este mes + Usuario: Isabel*, salían
  **46 leads = Bs 219.780**, pero el panel mostraba menos (37 cierres / Bs 179.320).
- **Causa raíz**: la **ventana amplia** (`wide`) que detecta las ventas filtra por `created_at` en
  **300 días** y se **trunca a 10.000 leads** (`max_pages=40`). Con ~2.700 leads/mes el CRM supera
  los 10k y además ignora leads creados hace >10 meses. Resultado: **las ventas de leads viejos**
  (p.ej. "cliente antiguo" creado hace mucho que compra este mes) **no se contaban**. Kommo, al
  filtrar por Fecha contrato, no tiene ese límite.
- **Fix (`generar.py`, tras el fetch `wide`)**: además de la ventana por `created_at`, se traen
  **TODOS los leads que HOY están en etapa Compradores** (statuses con `cls=="compradores"` en todos
  los pipelines) y se **tocaron desde el mes anterior** (`filter[updated_at][from]=p_start`), **sin
  límite de antigüedad de creación**, y se fusionan en `wide` (dedup por `id`). Así los cierres/monto/
  pipeline por Fecha contrato cuadran con Kommo. Diagnóstico: `won_refuerzo … extra_leads=N`.
- **Resultado verificado en vivo**: equipo **139 → 157 cierres**; Isabel **37 → 45 cierres**,
  cerrado **179.320 → 211.620**, **pipeline Bs 219.780 = EXACTO** al total de Kommo. La diferencia
  46 (Kommo) vs 45 cierres = 1 lead con Fecha contrato pero aún NO en etapa Compradores (cuenta en
  pipeline, no como cierre) — coherente con la REGLA CRÍTICA (venta = Compradores + Fecha contrato).

## 4h. Combos: en la lista, pero no se pueden cargar (2026-07-29 / 31)

- **Los 60 combos SIGUEN en `CODIGOS`** (272 productos) — se borraron el 2026-07-29 y el usuario
  pidió **volver a ponerlos** el 2026-07-31: la lista de precios es la de la empresa y se mantiene
  completa. Lo que cambia es que **no se pueden cargar**: el pedido va producto por producto.
- **`rechazarCombo()` corta EN EL MOMENTO de colocarlo**, no al guardar: al elegirlo del datalist,
  al escribir su código `CMB*` o al salir del campo (`blur`). Limpia descripción y código y
  devuelve el foco. Es a propósito: antes llenaban todo el formulario y se lo rebotaba al final.
- **`esCombo` matchea el PREFIJO `^comb`, no la palabra entera** (y `esCodigoCombo`, `^cmb`):
  si escribieron "comb" ya van camino a "combo", así que salta en la 4ª letra sin esperar.
  **Es seguro**: se verificó que NINGÚN producto real empieza con "COMB" — los colchones son
  "COL…". Si algún día se agrega uno que empiece así, hay que revisar esto.
- El aviso **solo nombra el combo cuando ya se sabe cuál es** (texto completo `^combo\b` o código
  que resuelve en `CODIGOS`). Con "comb"/"CMB" a medias va el mensaje genérico: decir
  `"CMB" es un combo` parece un error del sistema. Por eso el handler del código **resuelve
  primero en `CODIGOS`** y recién después mira el prefijo.
- **`submitPedido` mantiene el corte como red**, por si algo se cuela (autocompletado del
  navegador, pegado, etc.). Los dos caminos usan `esCombo()`.
- `CODIGOS` solo alimenta el **autocompletado**. **No** se usa para mostrar pedidos ya guardados:
  la descripción viaja como texto en el JSON de productos. Por eso **los pedidos viejos con
  combos se siguen viendo intactos** en la tabla, el Excel y las listas. Verificado en
  `test_combo2.js` (reemplazó a `test_combos.js`, que afirmaba lo contrario).
- **Ojo con el datalist**: son 60 códigos pero **57 opciones**, porque `NOMBRES` deduplica por
  etiqueta `desc + medida` y tres combos repiten nombre y medida con distinto código.
- El motivo de fondo, por si alguien quiere revertirlo: con un combo en **una sola línea** no se
  puede marcar ✔/✗ producto por producto ni contar bien los bultos en el "TOTAL A CARGAR".
- **`memeCombo()` — broma interna pedida por el dueño**: a **Fernando Peinado, Mauricio Merida y
  Juan Pablo Paredes** (lista `MEME_COMBO`) se les muestra `combo-instrucciones.jpg` en un modal
  en vez del toast. **El bloqueo es exactamente el mismo para todos**; solo cambia cómo se avisa,
  y el modal igual explica cómo cargarlo bien, así que nadie se queda sin la instrucción.
  Si algún día molesta, se vacía `MEME_COMBO` y todos vuelven al aviso normal.

## 4i. Banco del QR por vendedora (2026-07-31)

- Al marcar **pago por QR** (pagado o a cuenta) el formulario pregunta **a qué banco entró**,
  y es **obligatorio**. Las opciones dependen de quién carga:
  - Fernando Peinado · Mauricio Merida · Juan Pablo Paredes → **Ganadero / Económico**
  - Carola Chavez · Jonathan Monje · Maria Flores · Isabel Robledo · Mirian Salazar → **BISA / Económico**
  - Cualquier otro (Eduardo Añez, ROHO) ve **los tres**: mejor eso que trabarlos, y no se les
    inventa un banco que no es el suyo.
- **El banco NO tiene columna propia**: se guarda **pegado al método** → `metodoPago = "QR Ganadero"`.
  Así **no hubo que reimplementar el Apps Script** (el usuario evita eso). Por eso existen
  `metodoBase()` ("QR Ganadero" → "QR") y `bancoDe()` ("QR Ganadero" → "Ganadero").
- **Lo que había que tocar para que no se rompiera** — si se agrega otro lector de `metodoPago`,
  acordarse de usar `metodoBase()`:
  - `updateStats` contaba `mtd[p.metodoPago]`: con "QR Ganadero" habría caído en "sin método".
  - `segSet('f-metodo', ...)` al editar: hay que pasarle la base, si no ningún botón queda marcado.
- Los botones del banco se **redibujan al cambiar de vendedora** (`applyVendedorLite` llama a
  `updateBancoVisibility`), y se limpia lo elegido si ese banco no está en la lista nueva: si no,
  a Isabel le podía quedar "Ganadero" pegado de un pedido de Fernando.
- **No se tocó el panel del chofer**: si el chofer cobra por QR sigue sin elegir banco (no se pidió).
  Ojo: si el chofer registra un cobro sobre un pedido que ya tenía "QR Ganadero", `aplicarCobros`
  reescribe el campo y **se pierde el banco**. Es un caso raro (si ya estaba pagado el chofer no
  cobra) pero está acá anotado.

## 4j. Pestaña Contabilidad (2026-07-31)

- Quinta pestaña (`view-conta`) con los datos de facturación: ingresado, N° de nota (y OC),
  vendedor, cliente, celular, productos (producto · medida · código × cantidad), facturar a,
  NIT, pago (con método **y banco**) y observaciones. Más buscador, resumen y Excel propio.
- **Corta por FECHA DE INGRESO (`p.ts`), no por `p.fecha`** como todo el resto del panel:
  contabilidad cierra por cuándo se hizo la venta, no por cuándo sale el camión. Por eso la
  columna "Ingresado" va primera aunque el usuario no la pidió — sin ella el filtro no se
  entiende. **Si alguien "arregla" esto para que use `p.fecha`, rompe el sentido de la vista.**
- El Excel va con **una fila por producto** (mismo criterio que `exportExcel`) y repite los datos
  del pedido solo en la primera fila, para que se pueda filtrar y sumar por producto.
- **Filtro por vendedor** (`cta-vendedor`) además del buscador. El cartel de vacío dice **por qué**
  está vacío (vendedor / búsqueda / período): si no, uno cree que no hay pedidos cuando en
  realidad los está tapando un filtro.
- **`CONTA_EXCLUIR` = ROHO y Eduardo Añez** — decisión del usuario. Quedan fuera de **todo** la
  vista: tabla, desplegable, resumen y Excel. El motivo: no llevan nota de venta, NIT ni
  "facturar a" (por eso tienen el formulario "lite"), así que aparecerían casi vacíos y
  ensuciarían los totales. **Para devolver a alguien a la vista, sacarlo de esa lista.**
- **Ficha propia (`showContaModal`)**: al hacer clic en una fila. Se maneja **distinto a la ficha
  de pedidos** — no toca stock, chofer ni entrega. Tiene **registrar pago** (monto + fecha +
  método + banco si es QR) y **✅ Pago registrado en sistema**, que pinta la fila de verde.
- **⚠️ El ledger de pagos vive en la columna "Método pago"**, que la planilla YA tenía:
  `"Efectivo 500 @2026-07-28 + QR BISA 1800 @2026-07-30 · REGISTRADO"`. Se eligió así para **no
  agregar columnas** (obliga a reimplementar el Apps Script). `parseCobros` lee banco y fecha
  como **opcionales**, así que los cobros viejos (`"Efectivo 6000"`) se siguen leyendo igual.
  **Si se cambia el formato, se pierde el histórico.**
  - `sinMarcaReg()` saca el `· REGISTRADO` **antes** de partir por `+`: sin eso la marca se
    comía el último pago.
  - `aplicarCobros()` (el chofer) **preserva la marca** al reescribir el campo.
  - **Es UN SOLO historial**: lo que cobra el chofer y lo que registra contabilidad son la misma
    lista. Es lo correcto — son pagos de la misma venta.
- **`contaPagos()` usa `cobrosDe()`, NO `cobrosVisibles()`**, y además cae al `acuenta`. Motivo:
  un pedido que la vendedora marcó PAGADO al cargarlo **no guarda el monto** (`cobradoBs` es
  client-only, no tiene columna), así que filtrar por `monto>0` dejaba esas ventas **sin método
  a la vista**. Acá se prefiere "QR BISA · monto no anotado" antes que esconder el pago.
- **No tiene candado**: quedó abierta como "Mis pedidos" y "Chofer", que también muestran plata.
  Se le avisó al usuario que puede pedir que se le ponga contraseña.

## 4k. Ancho de la página (2026-07-31)

Queja del usuario: *"¿por qué no ocupas todo el ancho de la página? se ve todo muy contenido"*.
La tabla de pedidos vivía en 1136 px y **se desplazaba ~830 px de costado** mientras sobraban
700 px de blanco a cada lado.

- **`--wrap` / `--wrap-ancho` en `:root`** + `body.ancha`. `showView()` pone/saca la clase:
  `document.body.classList.toggle('ancha', v!=='form')`.
  - **El formulario de carga SIGUE angosto (1180/680)** a propósito: está pensado para el
    celular, y estirar sus campos a 1900 px lo empeora. Todo lo demás son tablas y listas.
  - `.header-in`, `.nav` y `.wrap` **comparten la variable**. Tienen que ir juntos: si la barra
    de pestañas no acompaña, la pestaña activa deja de estar pegada a la esquina de la tarjeta.
  - `transition:max-width .2s` para que el cambio de pestaña no sea un salto seco.
    **Ojo al testear: hay que esperar ~350 ms o se mide a mitad de la animación.**
- **Resultado**: tabla de pedidos 1136 → 1798 px (sobran 167 px de scroll en vez de 830) y
  Contabilidad entra **entera, sin scroll**.
- **Lo que NO se estira**, porque a lo ancho quedaba peor que antes:
  - `.metrics` → tope 1180 px (a 450 px por tarjeta quedan casi vacías).
  - `.two-col` (consolidados) → tope 1400 px (3 columnas de texto a 900 px dejan huecos enormes).
  - `.filters .field` → tope 520 px (el buscador se comía media pantalla).
- **`#mis-lista` y `#cho-lista` pasaron a grilla**
  (`repeat(auto-fill,minmax(min(520px,100%),1fr))`): en escritorio van 3 fichas por fila. Una
  ficha estirada a 1800 px deja el nombre del cliente a un palmo de sus etiquetas.
  El `min(...,100%)` es lo que mantiene **una sola columna en el celular** — sin eso, la ficha
  desborda la pantalla. Verificado a 390 px: 1 columna y cero desplazamiento lateral.
  - ⚠️ `renderMis` ponía `tbl.style.display='block'` y **eso pisaba la grilla**: ahora va `''`.

## 4l. Cada pago con su fecha y su N° de nota de venta (2026-07-31)

Pedido del usuario: *"cuando registran un anticipo no muestra la fecha del anticipo… al lado
de ese pago debe mostrarse tb el nro de nota de venta… y cuando registran otro pago tb falta
el botón nro nota de venta de ese pago. PARA SU CONTROL"*.
Ejemplo textual: 2.000 el 31/07 con nota 939, saldo 4.000; el 03/08 paga 4.000 con nota 980.

- **Formato del ledger (columna "Método pago") ampliado**:
  `~Efectivo 2000 @2026-07-31 #939 + QR BISA 4000 @2026-08-03 #980 · REGISTRADO`
  - `#nota` = el recibo de **ese** pago. `limpiaNota()` saca `+ · # @ ~` para que un n° raro
    no rompa el parseo.
  - **`~` marca el ANTICIPO** (lo que dejó el cliente al comprar).
- **Al implementarlo aparecieron 3 bugs REALES, no cosméticos:**
  1. **Registrar el 2º pago borraba el anticipo.** `ctaRegistrarPago` partía de `cobrosDe(p)`,
     que no incluye el "a cuenta", y `aplicarCobros` reescribe el campo entero. El caso exacto
     del usuario perdía los 2.000. Ahora `aplicarCobros` **relee el anticipo antes de
     reescribir y lo vuelve a poner siempre**, igual que ya hacía con `REGISTRADO`.
  2. **"Total de la venta" mostraba el saldo, no el total.** Usaba `objetivoCobro()`, que es
     *lo que falta cobrar en la entrega*. Con 2.000 de anticipo decía "Bs 4.000". Se agregó
     **`ventaTotal()` = objetivoCobro + anticipo**. La planilla NO tiene columna Total: se
     reconstruye. **No confundir las dos funciones.**
  3. **Un pedido con anticipo ya cobrado no se podía volver a editar.** Dos causas: `metodoBase`
     no reconocía el ledger con `~` (el segmento "con qué pagó" quedaba sin marcar → validación)
     y la regla "hay a cuenta, poné el saldo" saltaba aunque estuviera marcado PAGADO.
     Arreglados con `metodoFormulario()` y un `segVal('f-pagado')!=='SI'`.
- **`cobrosDe()` filtra el anticipo a propósito.** Así `totalCobrado` y `objetivoCobro` siguen
  midiendo lo del chofer y **no se tocó nada de su flujo**. El anticipo se pide con
  `anticipoDe()` y la vista completa con `contaPagos()` = `[anticipo] ++ cobrosDe`.
- **Editar ya no borra el historial**: si el vendedor no cambia ningún número de plata se
  conserva `prev.metodoPago` tal cual; si los cambia, **`confirm()` que lista los pagos que se
  van a perder**. Al guardar como PAGADO el formulario manda "a cuenta 0" siempre — eso NO es
  un cambio real, y `_seguiaPagado` lo contempla (si no, cada edición pedía confirmación).
- **Nada muestra ya `p.metodoPago` crudo** (sería `~Efectivo 2000 @…`): `contaMetodosTxt()` para
  la columna Pago, `cobrosResumen()` con salida armada, y la badge "A cuenta" del admin.
- El n° de nota es **OBLIGATORIO** (decisión del usuario, 2026-07-31): sin él no deja
  registrar, marca el campo en rojo y avisa. Los pagos **anteriores** a esta pantalla pueden
  no tenerlo y salen como **"sin nota" en naranja** en la tabla.
- Compatibilidad: banco, fecha y nota siguen siendo **opcionales**; `"Efectivo 6000"` y
  `"Efectivo 500 @2026-07-28 + QR BISA 1800 @2026-07-30"` se leen igual (probado).

## 4m. Cuadre y conciliación (2026-07-31)

Pedido: *"falta un dashboard y control de contabilidad, para cuadrar conciliar, ahí mismo
dentro de contabilidad"*. Se resolvió como **sub-pestaña** de Contabilidad
(`#cta-tab`: `📋 Ventas` / `🧮 Cuadre y conciliación`), no como pestaña nueva ni overlay.

- **⚠️ CORTA POR FECHA DEL PAGO, no por `contaFecha` (fecha de ingreso).** Es lo que
  distingue esta vista de la de Ventas y **el motivo de que exista**: para arquear caja y
  conciliar banco importa cuándo ENTRÓ la plata. Una venta del 31/07 cuyo saldo se cobró el
  03/08 pone sus Bs en el cuadre del 03/08. **Si alguien "unifica" los dos filtros, rompe
  el sentido de la pantalla.**
- `cuadrePagos()` devuelve **un renglón por PAGO** (no por venta), recorriendo `contaPagos()`
  de todo `STATE` (sin los excluidos). Los pagos **sin fecha** no entran en ningún período —
  por eso hay una alerta dedicada, si no desaparecerían en silencio.
- `cuadrePorForma()` agrupa por **método + banco** (`Efectivo`, `QR BISA`, `QR Ganadero`,
  `Tarjeta`): así se cuenta la caja aparte y cada banco se cruza con SU extracto.
- **El arqueo ("contado / extracto") se guarda en la PLANILLA** (2026-07-31, pedido del
  usuario: *"se debe ver desde todas las compu y navegadores TV"*). Va en la fila del sistema
  `__arqueo_cuadre__`, con el **mismo truco de la fecha vacía** que los días cerrados, así que
  tampoco hizo falta tocar el Apps Script. Formato legible desde la propia hoja:
  `dia|2026-08-03|Efectivo=1500 ; dia|2026-08-03|QR BISA=3900`. `|` y `=` no aparecen en
  ningún método ni banco. `localStorage` (`multiespumas_cuadre_v1`) quedó como **espejo**.
  Tope `ARQUEO_MAX=1200` anotaciones: al pasarse se tiran las más viejas (las claves ordenan
  por período). Cada día/mes guarda lo suyo — probado que un día no contamina a otro.
- **Bloques**: métricas (entró · efectivo · bancos · diferencia o por cobrar) → cierre por
  forma de pago con diferencia → por cobrar por antigüedad (rojo ≥30 d, ámbar ≥8 d) →
  alertas → detalle tildable. Todo clickeable abre `showContaModal`.
- `📋 Copiar` arma el texto para WhatsApp; `⬇️ Excel` baja detalle + cierre.
- **Filtro por vendedor** (2026-07-31, pedido del usuario): `cua-vendedor`, mismo llenador que
  el de Ventas (`llenarUnSelectVendedor`) pero **cada pestaña recuerda lo suyo**. Recorta
  pagos, "por cobrar" y alertas.
  - **⚠️ Con un vendedor elegido NO se deja anotar el arqueo.** El valor guardado es global
    (`modo|valor|forma`, sin vendedor) y anotar un total parcial lo pisaría. Además la caja y
    el extracto son UNO SOLO, no uno por vendedora. Se muestran los números y se explica en
    pantalla. **No "arreglar" esto habilitando el input sin cambiar antes la clave.**
- **Alerta separada "PAGADA sin anotar el monto"**: antes esas ventas caían en "pagos sin
  fecha · Bs 0,00" (el usuario vio 53 así). No son pagos sin fecha: son ventas que la
  vendedora marcó pagada cuando el monto del cobro **no se guardaba** en la planilla
  (`cobradoBs` es client-only). Ahora van en su propio aviso y con la nota de venta.
- Ojo al tocar `renderContaSiActiva()`: ahora despacha a `renderCuadre()` o `renderConta()`
  según la sub-pestaña activa. Y `refreshConta()` inicializa también `cua-dia` / `cua-mes`.
- `diasEntre()` se clampea a 0: una venta con fecha futura mostraba "-3 d".

## 4n. Editar y reprogramar a HOY desde Administración (2026-07-31)

Pedido: *"cuando editan o reprograman desde el panel administración (cuando ya está la clave
puesta) debe permitir al navegador editar y/o reprogramar los pedidos y permitir colocar
fecha de hoy"*.

- **La causa era `applyVendedorLite()`.** `editPedido()` hacía `removeAttribute('min')` sobre
  `f-fecha`, pero tres líneas después llamaba a `applyVendedorLite()`, que **volvía a poner
  `min = tomorrowStr()`**. Como esa función corre en cada cambio de vendedor, sacarlo solo en
  `editPedido` no alcanzaba: ahora el propio `applyVendedorLite` **respeta `EDIT_ID`**.
  ⚠️ Las validaciones de `submitPedido` (fecha mínima, domingo, sábado PM, cupos) YA tenían
  `!isEdit` — o sea, el guardado nunca fue el problema, **era el calendario del navegador**.
- **`reprogramarPedido()` pasó de `prompt()` a ventana propia** (`showReproModal`, estado en
  `REPRO`). El prompt obligaba a tipear "2026-08-05" a mano y bloqueaba con
  `nueva < tomorrowStr()`. Ahora: `<input type="date">` **sin `min`**, atajos Hoy/Mañana,
  **selector de turno** (antes había que ir a Editar) y el estado de cupos del día elegido.
- **Domingo, sábado PM, fecha pasada y turno lleno ya no bloquean: avisan.** `reproAvisos()`
  los junta, se muestran en la ventana y se piden por `confirm()`. Quien entró con la clave
  decide. **Es deliberado — no "arreglar" volviendo a bloquear.**
- `REPRO.kind` guarda el `MODAL_KIND` de origen para que `reproVolver()` regrese a la ficha
  correcta (admin / carga / mis / conta), igual que hacía el `reabrirFicha` viejo.
- `nroDia` solo se reasigna **si cambió la fecha** (antes se pisaba siempre, aunque solo se
  cambiara el turno).
- Dos arreglos de la misma familia: `ajustarTurnoSeg()` **ya no deshabilita PM ni lo cambia
  solo a AM cuando se está editando** (un pedido histórico de sábado PM se auto-corregía sin
  que nadie lo pidiera), y los carteles de cupo agregan *"estás editando: se puede guardar
  igual"* — sin eso uno lee "elegí otra fecha" y cree que está trabado.

## 4o. Cerrar día de entrega (2026-07-31)

Pedido: *"un botón de cerrar día cosa que cierre el día y no permita meter nuevos pedidos"* +
*"no es para las vendedoras, es para administración"*. Se preguntó y el usuario eligió:
**cierra una FECHA DE ENTREGA** (no la jornada de carga) y **tiene que bloquear de verdad**,
o sea llegar al celular de las vendedoras.

- **⚠️ EL TRUCO ESTÁ EN LA FECHA VACÍA.** El estado viaja por la MISMA planilla, en una fila
  con `id = '__dias_cerrados__'` y **`fecha:''`**. No es cosmético: `doSave()` del Apps Script
  cuenta los cupos del día escaneando las filas con esa fecha, así que una fila marcadora
  *con* fecha **se comería un cupo**. Con la fecha vacía el portero ni la mira
  (`if (foundRow < 0 && p.fecha)`) → **no hizo falta tocar ni redeployar el Apps Script**.
  Los días van en `observaciones` separados por espacio; `cliente` dice
  "🔒 DÍAS DE ENTREGA CERRADOS — fila del sistema, NO BORRAR" para que se entienda en la hoja.
- `mergePending()` es el **único** embudo por donde entran los datos del servidor
  (loadFromServer, refreshConta, refreshMis, refreshChofer): ahí `leerCierresDeLista()` saca la
  fila y llena `DIAS_CERRADOS`. Por eso la fila **no aparece** como pedido en ninguna vista.
  `loadMirror()` hace lo mismo por si una copia local vieja la trae.
- Espejo en `localStorage` (`ME_DIAS_CERRADOS_V1`) para que el bloqueo valga desde el primer
  segundo, antes de bajar la planilla.
- **Dureza del bloqueo, a propósito:**
  - Pedido NUEVO con entrega ese día → **no se guarda** (toast + campo en rojo + cartel de
    cupos explicando por qué). Es el objetivo del pedido.
  - **Editar** un pedido que ya estaba en ese día → `confirm()` y pasa. No se puede dejar
    trabado un pedido existente.
  - **Reprogramar** hacia un día cerrado → entra en `reproAvisos()`: avisa y confirma.
- El botón de Administración muestra cuántos días cerrados **vigentes** hay (los pasados no se
  cuentan: molestan y no bloquean nada útil).
- Si alguien borra a mano esa fila de la planilla, **se reabren todos los días** — está avisado
  en la guía del admin.

## 4p. N° de OC correlativo mensual (2026-07-31, arranca el 2026-08-01)

Pedido: *"los pedidos desde el 1 agosto las OC se deben generar correlativa según se van
colocando los pedidos indistinto del vendedor para tener un correlativo mensual. Que reinicia
cada mes"*. Se preguntó y el usuario eligió **formato `08-001`** y **dejar ROHO como está**.

- `OC_DESDE='2026-08-01'` + `nextOcMes(fecha)` → `MM-NNN`. **El mes es el de CARGA
  (`contaFecha`, o sea `ts`), no el de entrega**: un pedido cargado el 31/08 para entregar el
  02/09 lleva `08-xxx`. Es lo que pidió el usuario ("según se van colocando los pedidos").
- `nextOcMes` filtra por **mes-año de carga Y prefijo**: con solo el prefijo, los `08-xxx` del
  año anterior seguirían sumando.
- **El número se asigna al GUARDAR, no al abrir el formulario.** Si se asignara al abrir, dos
  vendedoras con el formulario abierto se llevarían el mismo. El campo muestra "va por 08-007"
  como referencia, pero el definitivo sale en `submitPedido`.
- **Editar NO reasigna** (`!isEdit`): el pedido conserva su número. Desde Administración el
  campo queda editable para corregir a mano.
- **⚠️ ROHO queda AFUERA a propósito.** Su "N° OC" es la orden de compra que manda el cliente:
  es lo que identifica el pedido, lo que va a su Excel y lo que `ocRepetidaRoho` protege de
  duplicados. Generárselo se lo borraría. **No "unificar" esto sin preguntar.**
- El campo sale `readOnly` para todos menos ROHO y modo edición (`pintarCampoOc`, llamada
  desde `applyVendedorLite`, que corre en cada cambio de vendedor).
- **Límite conocido**: la asignación es del lado del navegador (max+1 sobre `STATE`), así que
  dos que guarden **en el mismo segundo** podrían repetir número. `ocsRepetidas()` lo detecta y
  `renderRevisar()` lo muestra en rojo en Administración para corregirlo desde Editar.
  Hacerlo atómico exige mover la asignación al Apps Script (como `nroDia`) **y redeployarlo** —
  se evitó porque el usuario viene pidiendo no tocar Google. Si aparecen repetidos seguido,
  ese es el arreglo.
- `nextOc()` (el viejo max+1 global, que estaba sin uso) fue reemplazado por este bloque.

## 4q. Un vendedor = una sola persona (2026-07-31)

Reporte del usuario: *"unifica carola chavez hay 2"*. En los desplegables aparecía dos veces
porque en la planilla su nombre está escrito de más de una forma (tilde / mayúsculas /
espacio doble), y **cada escritura arrastraba la mitad de sus pedidos**: al filtrar por una,
la otra mitad desaparecía.

- **`normNombre(v)`**: saca tildes (NFD + quita diacríticos), colapsa espacios y pasa a
  minúsculas. **Todas** las comparaciones de vendedor pasan por ahí (`mismoVendedor`).
- **`nombreCanonico(v)`**: si el nombre está en `VENDEDORES`, devuelve ESA escritura. Es lo
  que se muestra en desplegables, datalist y consolidados. Un nombre que no está en la lista
  se deja como vino (no se inventa nada).
- Tocados: los dos desplegables de vendedor, el datalist del formulario, `contaLista`,
  `cuadreEsDe`, `renderMis`, `abrirMisAvisos`, los dos consolidados por vendedor
  (`tbl-vendedor` y el del reporte), `bancosDeVendedor`, `memeCombo`, `esRoho`,
  `esVendedorLite` y `contaExcluido`.
- **Efecto colateral bueno**: "Eduardo Añez" y "Eduardo Anez" también quedan unificados; antes
  eso estaba parcheado a mano en dos funciones distintas.
- **No se reescribió la planilla.** La unificación es al leer y al comparar: los pedidos
  viejos conservan su texto original. Si alguna vez se quiere dejar la hoja prolija, hay que
  reescribir cada fila (lento y riesgoso) — no hacía falta para el problema reportado.

## 4r. Comprobante del pago por QR (2026-07-31)

Pedido: *"botón para adjuntar imagen cuando carguen pago por QR, y se vea en la ficha de cada
cliente o pedido, en contabilidad"*.

- **Se reusó el canal de fotos que ya existía** (`apiFoto` → `action:'foto'` del Apps Script,
  que sube a Drive y devuelve el `fotoId`). **Ya estaba publicado**, así que otra vez no hubo
  que tocar Google.
- **El comprobante va pegado al PAGO, no al pedido**: `%<fileId>` al final del renglón dentro
  de "Método pago" (`QR BISA 4000 @2026-08-03 #980 %1AbC_xyz`). Es lo correcto: si el cliente
  pagó dos veces por QR, cada pago tiene el suyo. **No confundir con `p.fotos`**, que son las
  fotos de la ENTREGA (columna "Fotos entrega") y siguen igual.
- `limpiaNota` ahora saca también el `%`, y la nota del pago excluye `%` de su charset: si no,
  una nota rara podía comerse el id del comprobante.
- `<input id="comp-input">` es **otro** input que el de entregas y va **sin `capture`**: la
  captura del QR ya está guardada en la galería, forzar la cámara la haría inaccesible.
- Se puede adjuntar en dos momentos: **al registrar** (queda en `CTA_PAGO.comp`, y se limpia
  al registrar para que no se pegue al pago siguiente) y **después**, sobre un pago ya
  registrado (`COMP_DESTINO={id,idx}` → reescribe ese renglón con `aplicarCobros`).
  ⚠️ `ctaIdxCobro()` traduce el índice de `contaPagos()` (que antepone el anticipo) al de
  `cobrosDe()`; el anticipo NO se puede editar porque no está en la lista de cobros.
- **`metodoConComprobante(m)`** decide qué formas de pago llevan comprobante: **QR y Tarjeta**
  (el efectivo no tiene nada que adjuntar). Está en UN solo lugar a propósito — antes la
  condición `==='QR'` estaba repetida en 8 sitios y extenderla a Tarjeta (2026-08-01, pedido
  del usuario) obligó a tocarlos todos. **Si se agrega otra forma de pago, se cambia ahí.**
  Los textos cambian solos: "la captura del pago" para QR, "la foto del voucher" para Tarjeta,
  y el meme también lo nombra. El **banco sigue siendo solo del QR**.
- **También en el FORMULARIO de carga, y OBLIGATORIO** (pedido del usuario: *"al meter pedido
  no sale el botón adjuntar obligatorio comprobante"*). Bloque `wrap-comp`, visible cuando el
  método es QR; sin captura `submitPedido` **no guarda**.
  - Ahí todavía no existe el ledger (la venta no tiene pagos anotados), así que el id se pega
    al **método suelto**: `metodoPago = "QR BISA %1AbC_xyz"`. `anticipoDe` y el fallback de
    `cobrosDe` lo separan con `compDeTexto()` y lo devuelven en `comp`.
  - **`metodoBase()` y `bancoDe()` también llaman a `compDeTexto()`.** Sin eso,
    `bancoDe("QR BISA %ABC")` devolvía vacío y se perdía el banco en todo el panel — lo cazó
    `test_banco`.
  - **El aviso es el MEME del gato** (`memeComprobante`), no un toast: el aviso suelto se les
    pasaba de largo. **Reusa `combo-instrucciones.jpg`** a propósito — es la misma imagen que
    mandó el usuario para el combo ("el shampoo trae instrucciones"), no tiene sentido
    duplicarla en el repo. Va para **todas menos Eduardo Añez y ROHO**, que por ser
    formulario "lite" no llevan ni método de pago.
  - `focoComprobante()` marca el bloque en rojo al cerrar el modal, con el mismo
    `setTimeout(...,0)` que `focoProducto` (el navegador manda el foco al body al cerrar).
  - ⚠️ `renderCompForm()` **NO borra `FORM_COMP` al ocultarse**: corre muchas veces mientras se
    arma el formulario y en `editPedido` llega ANTES de que se muestre el bloque de método, así
    que borrarlo ahí perdía el comprobante del pedido que se estaba editando y después no
    dejaba guardarlo. Se limpia solo en `resetForm()`.
- Se ve como 📎 en la tabla de Contabilidad, en el detalle del cuadre y como link en el Excel.

## 4s. Monto total cobrado al marcar PAGADO (2026-07-31)

Pedido: *"cuando los vendedores seleccionen pagados sí … tiene que aparecer la opción de
colocar cuánto fue el monto total cobrado, porque eso no tenemos"*. Es exactamente el hueco
que había detectado el cuadre ("53 ventas marcadas PAGADAS sin anotar el monto").

- Campo `f-cobrado` (`wrap-cobrado`), visible **solo con "SÍ, pagado"**. Con adelanto a
  cuenta NO aparece: ese monto ya se anota en "A cuenta". **Obligatorio** — si no, seguíamos
  sin el dato, que era justamente el problema.
- **Se guarda como un PAGO de verdad en el ledger**, no como texto suelto:
  `metodoPago = "~Efectivo 5000 @2026-07-31 #950"` (con `%comprobante` si es QR). Así la venta
  aparece en Contabilidad y en el cuadre **con monto, fecha, nota y comprobante**, y
  `ventaTotal()` por fin sabe cuánto fue.
- ⚠️ **`metodoBase()` y `bancoDe()` ahora detectan el historial**: `parseCobros` primero, y si
  hay entradas se usa el método/banco del primer pago. Sin eso `metodoBase("~QR BISA 5000 …")`
  devolvía vacío y **`updateStats` contaba la venta como "sin método"** — lo cazó `test_banco`.
- Orden en pantalla y en las validaciones: **método → monto → banco → comprobante** (los dos
  van juntos a propósito; si se cambia uno hay que cambiar el otro).
- Editar trae el monto desde `anticipoDe(rec)` y no lo pierde al guardar.
- Eduardo Añez y ROHO quedan afuera (formulario "lite", como el resto de las exigencias).
- Los pedidos VIEJOS marcados pagados sin monto siguen igual: el aviso del cuadre los sigue
  listando con su nota de venta para completarlos a mano.

## 4t. Productos más entregados (2026-08-04)

Pedido: *"Necesitamos un botón en panel administración que muestre por día/ semana / mes la
lista de productos y medida más entregado y cuantas veces se tuvo que pedir a producir en el
mes"*.

- Botón **🛏️ Productos más entregados** en la barra de Administración → overlay `prods-overlay`
  (mismo patrón que Reporte / Faltantes). Abre en **Mes**, mes en curso.
- Selector **Día / Semana / Mes**. La *semana* es **lunes a domingo** (`semanaDe()`): el domingo
  cierra la semana, no abre una nueva. Rango en `prodRango()`, etiqueta en castellano con
  `mesNombre()`.
- **Producto = descripción + medida** (`prodRankKey()`, normaliza mayúsculas, espacios y tildes).
  El **código queda afuera de la clave**: viene vacío en unos pedidos y cargado en otros, y
  partiría en dos el mismo colchón. Se guarda el primer código no vacío que aparece.
  “TITANIO ICE 140x190” y “TITANIO ICE 200x200” sí son dos renglones — son dos cosas distintas
  para producción.
- Tres columnas y qué significa cada una (está escrito también al pie del panel):
  - **🚚 Entregado** — unidades de pedidos con `p.entregado===true`. **Ordena el ranking.**
  - **📦 Cargado** — todas las unidades pedidas, entregadas o no.
  - **🏭 A fábrica** — **cuántas veces** ese producto tuvo `enProduccion(x)`, con desglose
    **MORENO / MULTI** (`prodDondeSePide` + `faltFabCorto`, reusados de Faltantes).
- ⚠️ **El corte va por `p.fecha` (fecha de ENTREGA)**, para los dos conteos. La marca de fábrica
  (`x.enProd`) **no tiene fecha propia** — viaja adentro del pedido —, así que cae en el mismo
  período que la entrega. Es la única fecha disponible; está aclarado en la guía.
- Si en el período **nadie marcó "Entregado ✓"**, la columna 🚚 queda en cero y sale un aviso
  amarillo apuntando a 📦 Cargado, en vez de mostrar una tabla vacía que parece un error.
- `esFilaSistema()` filtra las filas del sistema (`__dias_cerrados__`, `__arqueo_cuadre__`) para
  que no cuenten como pedidos.
- Copiar para WhatsApp: **top 15** y una línea diciendo cuántos quedaron afuera (`PRODS_TOP_WA`);
  en pantalla salen todos. Imprimible (`printing-prods`).
- Sin tocar el Apps Script ni la planilla: **todo se calcula de datos que ya se guardan**.
- Detalle que cazó `test_prods`: el plural de "vez" es **"veces"**, no "vezes" → helper `nVeces()`.
- Tests: `test_prods.js` (55 comprobaciones).

## 4u. Registrar venta de tienda (2026-08-04)

Pedido: *"en contabilidad, agregar un botón que diga «registrar venta de tienda» y se llene el
mismo formulario que pedidos pero sin las ubicaciones y dirección de entrega, es «SALIÓ DE
TIENDA», directo para registrar la venta a contabilidad y su panel"*.

- Botón **🏪 Registrar venta de tienda** en la barra de Contabilidad → `abrirVentaTienda()`.
  Es el **mismo formulario** con la clase `venta-tienda` en `#view-form`; los campos del camión
  llevan `solo-entrega` y se esconden por CSS (fecha, turno, zona, Maps, dirección, cartel de cupos).
- Se guarda con `zona:'TIENDA'`, `direccion:'SALIÓ DE TIENDA'`, `maps:''`, `turno:''`,
  `entregado:true`, `verificado:true` (ya salió con el cliente).
- ⚠️ **`fecha:''` A PROPÓSITO — es lo que evita que se coma un cupo del camión.** El portero de
  cupos del Apps Script es `if (foundRow < 0 && p.fecha)`: sin fecha ni lo mira. Del lado del
  panel pasa igual (`cuposUsadosTurno` compara `p.fecha===fecha`). **Mismo truco que las filas
  del sistema (§4o/§4m) → sin redeploy del Apps Script.**
- Contabilidad la ve igual porque **`contaFecha()` usa el `ts` de carga**, no `p.fecha`. Y el
  cuadre la ve porque corta por la fecha del PAGO.
- Queda **fuera de toda la logística** sin código extra: faltantes, lista de carga, parte del
  día y los envíos de WhatsApp filtran por `p.fecha===hoy/mañana`, que '' nunca cumple.
- `esVentaTienda(p)` la reconoce por dirección **o** zona (con `normNombre`, así que "SALIO DE
  TIENDA" sin tilde también entra) → badge `🏪 TIENDA` en Contabilidad y en Administración
  (donde la columna Entrega mostraría una fecha vacía), y `🏪 Tienda` en el resumen por día.
- `fechaSalida(p)` = fecha de entrega, o la de carga si salió de tienda → **`prodRankData()`
  (§4t) la cuenta como entregada** por el día en que se cargó.
- Se mantienen TODAS las exigencias de la venta: nota obligatoria, cliente, celular, productos,
  método + monto + banco + comprobante (QR/tarjeta). Solo se saltean las validaciones de
  entrega (fecha mínima, domingo, sábado PM, día cerrado, cupos).
- Al guardar va **derecho a Contabilidad**, no al modal de WhatsApp: no hay camión al que avisarle.
- `resetForm()` apaga el modo (por eso `abrirVentaTienda` lo prende DESPUÉS de llamarlo) y
  `editPedido()` lo prende con `esVentaTienda(rec)`: una venta de tienda se edita como tal.
- **Columna "Entrega" en Contabilidad** (pedido del usuario: *"la columna que indique entrega a
  domicilio si se creó como pedido o salió de tienda si se registró desde panel contabilidad"*).
  `tipoVenta(p)` / `tipoVentaHtml(p)` → **🚚 Entrega a domicilio** o **🏪 Salió de tienda**. Va en:
  tabla de Ventas (después de Cliente), ficha del cliente, detalle del Cuadre y **los dos Excel**.
  Reemplaza al badge suelto que estaba debajo del nombre. **Es del panel de Contabilidad, no del
  de entregas** — en Administración la columna Entrega sigue mostrando la FECHA (y `🏪 TIENDA`
  cuando no la hay).
  ⚠️ Al meter la columna en `exportCuadre` hubo que **correr una posición** la fila de
  "CIERRE POR FORMA DE PAGO", que apoya sus montos en columnas fijas.
- Tests: `test_tienda.js` (63 comprobaciones) y `test_xlstienda.js` (20), que **abre los dos
  .xlsx generados** y comprueba que la columna esté y que no se haya corrido nada. `test_conta.js`
  se actualizó: indexaba las celdas por posición.

## 4v. Vendedor en la ficha de "Mis pedidos" (2026-08-04)

Pedido: *"en mis pedidos en la ficha flotante al dar clic falta el identificador de vendedor, yo
como admin cuando le doy todos y quiero ver cada pedido no identifico de qué vendedor es"*.

- La TARJETA ya traía el badge `👤 vendedor` (solo con "Ver todos"), pero `showMisModal()` no
  mostraba el dato en ningún lado. Se agregó la fila **Vendedor** entre *Fecha de entrega* y
  *Cliente*, **la misma posición que en la ficha de Administración** (`showPedidoModal`).
- Va **siempre**, no solo con "Ver todos": no molesta a la vendedora que mira lo suyo y evita
  que la ficha quede muda si se abre por otro camino.
- Usa `nombreCanonico()` (§4q), así que "Carola Chávez" y "  Carola  Chavez " salen con la misma
  escritura. Sin vendedor muestra `⚠️ sin vendedor` en rojo en vez de omitir la fila —
  `row()` esconde los valores vacíos y el pedido habría quedado sin identificar.
- La vista del **Chofer** no necesitó nada: sus tarjetas son inline, no tiene ficha flotante.
- Tests: `test_misvend.js` (18 comprobaciones).

## 4w. Retiro de efectivo (2026-08-04)

Pedido: *"en contabilidad falta un botón de «retiro efectivo», donde cada vendedor registra su
usuario (o sea vendedor), quién retira Eduardo Añez, quién entrega (el vendedor seleccionado),
monto, nro de notas (deben anotar varios), elegir si ese retiro es de recibos facturado o no
facturado, y eso verse reflejado en la planilla de todos o de cada vendedor en contabilidad y en
la conciliación para determinar si se recogió todo el efectivo de cada vendedor"* + *"y deben
poder subir la foto del recibo"*.

- Botón **💵 Retiro de efectivo** en las DOS pestañas de Contabilidad → overlay `retiros-overlay`
  con el formulario arriba y la lista de lo registrado abajo (filtro por mes y por vendedora).
- ⚠️ **Un retiro = UNA FILA de la planilla**, con id `__ret_<uid>__` y **fecha vacía** (mismo truco
  de §4o/§4t: el portero de cupos del Apps Script es `if (foundRow < 0 && p.fecha)`). Va una fila
  por retiro **y no todas juntas en una** para que dos personas puedan anotar a la vez sin pisarse
  — a diferencia de `__arqueo_cuadre__`, que sí es una sola.
- Todo en columnas que la planilla YA tiene, **sin redeploy del Apps Script**:
  `Vendedor`→quien entrega · `Chofer`→quien retira · `A cuenta`→monto · `Zona`→FACTURADO/NO
  FACTURADO · `Nota de venta`→las notas separadas por coma · `Fotos entrega`→la foto del recibo ·
  `Observaciones`→la nota libre · `Cliente`→el título "💵 RETIRO DE EFECTIVO — NO BORRAR".
- **La fecha del retiro viaja en `ts`**, porque `contaFecha()` lee de ahí: así el retiro cae solo
  en el período correcto sin ocupar la columna `Fecha`. `retTs()` la fija al **mediodía** para que
  el huso horario no la corra un día. `direccion` lleva "Retiro del dd/mm/aaaa" solo para que la
  hoja se entienda; **nadie la vuelve a leer**.
- `esFilaRetiro()` entra en `esFilaSistema()` y `leerCierresDeLista()` las aparta en `RETIROS`:
  nunca son pedidos (ni cupos, ni faltantes, ni ranking de productos, ni totales).
- Varias notas por retiro: chips con `retAgregarNota()`. Acepta pegar varias de una
  (`732, 731 742`), no repite y **exige al menos una** — es lo que respalda el retiro.
- Foto del recibo por el canal `apiFoto` de siempre; se guarda en `fotos[]`.
- **El control que pidió el usuario**: `cuadreEfectivoPorVendedor()` cruza el efectivo cobrado
  (de `cuadrePagos()`, solo `metodo==='Efectivo'`) contra los retiros del mismo período/vendedor →
  caja **💵 Efectivo cobrado vs. retirado** en el cuadre, con *le queda en la mano* = cobrado −
  retirado. Respeta el filtro de vendedor y el período. Va también al **Copiar** del cuadre y a su
  **Excel** (dos bloques: resumen por vendedora + detalle de retiros).
- ⚠️ Al agregar bloques al Excel del cuadre hay que respetar que el bloque "CIERRE POR FORMA DE
  PAGO" apoya sus montos en columnas fijas (ver §4u).
- Tests: `test_retiros.js` (84 comprobaciones), incluida la lectura del .xlsx generado.

## 4x. Hasta 2 imágenes en todos los botones de subir (2026-08-04)

Pedido: *"el botón subir imagen en todas las opciones debe permitir subir hasta 2 imágenes,
igual cuando registran pago, ya que deben subir foto del comprobante de pago y foto del recibo
hecho"*.

- `COMP_MAX=2`. Helpers compartidos: `compsArr()` (limpia, deduplica y corta en 2),
  `idsDeTexto()` y **`compTiraHtml()`** — la misma tirita de miniaturas (con ✕ por imagen y el
  botón "Agregar otra imagen" que desaparece al llegar a 2) para los TRES lugares:
  formulario del pedido, registrar pago en Contabilidad y retiro de efectivo.
- ⚠️ **Cambio de formato del historial de pagos**: el `%` ahora puede venir repetido →
  `"QR BISA 4000 @2026-08-03 #980 %ID_PAGO %ID_RECIBO"`. `parseCobros` devuelve `comps[]` y
  **mantiene `comp` = la primera** para no romper lo que ya lo leía. `compDeTexto` saca TODOS
  los `%` del final (antes sacaba uno solo y el sobrante ensuciaba el método/banco).
  Lo viejo —una sola imagen o ninguna— se sigue leyendo igual.
- `FORM_COMP` → `FORM_COMPS[]`, `CTA_PAGO.comp` → `CTA_PAGO.comps[]`, `RET_FORM.foto` →
  `RET_FORM.fotos[]`. `quitarCompForm(i)`, `ctaSacarComp(id,i)`, `ctaQuitarComp(id,idx,k)` y
  `retQuitarFoto(i)` sacan **una sola**; sin índice, todas.
- ⚠️ **El tope va en los `on…Elegido`, no solo en el botón**: si no, una tercera imagen se subía
  a Drive y recién después se descartaba. Lo cazó `test_dosfotos`.
- **La obligatoriedad NO cambió**: sigue bastando UNA para guardar (QR/tarjeta). Subir las dos es
  lo deseable, no un bloqueo — con 2 obligatorias se trababa a quien todavía no tiene el recibo.
- Se ven las dos en la ficha del pago, en la celda 📎 de la tabla de Contabilidad, en el detalle
  del cuadre y en los Excel (separadas por `|`).
- Tests: `test_dosfotos.js` (45 comprobaciones). `test_compform`, `test_comprobante`,
  `test_retiros` y `test_tienda` se actualizaron a la API nueva.

## 4y. FIX — el cuadre no se movía con el período (2026-08-04)

Reporte: *"los cuadros y dashboard no se actualizan según día, mes, o que uno selecciona fecha,
se sigue mostrando general… si pongo Carola y pongo día sigue mostrando lo mismo por cobrar"*.

- **Diagnóstico**: se probó panel por panel (`dbg_filtros.js`). Administración, Contabilidad
  Ventas, el Reporte y Productos más entregados **sí** filtraban bien. El problema estaba
  acotado al **Cuadre**: `cuadrePendientes()` y la parte de `cuadreAlertas()` que barre `STATE`
  respetaban el **vendedor** pero **ignoraban el período**. Por eso "Por cobrar" y "Revisar
  antes de cerrar" mostraban lo mismo con Día, Mes o Todo.
- **Fix**: las dos cortan ahora por `enPeriodoCuadre(contaFecha(p), pe)`.
  ⚠️ El corte va por la fecha de la **VENTA**, no la del pago: *un saldo justamente no tiene
  pago*, y un "pago sin fecha" tampoco — cortarlos por la fecha del pago los dejaría fuera de
  todos los períodos, que es justo lo contrario de lo que se quiere (son los que hay que
  arreglar). Lee: "de lo vendido en el período, cuánto falta cobrar".
- Para no perder el total global, `cuadrePendientes(true)` devuelve el historial completo y la
  caja avisa *"Fuera de este período queda Bs X más por cobrar — elegí Todo para verlas"*.
  Los títulos ahora dicen el período (`— 05/08/2026`, `de lo vendido en agosto de 2026`).
- El texto de WhatsApp acompaña.
- Tests: `test_periodo.js` (31 comprobaciones), incluidos **clics reales** en Día/Mes/Todo y
  cambios de fecha por el calendario, no solo llamadas a las funciones. Se actualizaron
  `test_cuadre` y `test_unifvend`, que asumían el comportamiento viejo.

## 4z. FIX — el día cerrado no frenaba a las otras computadoras (2026-08-04)

Reporte: *"si el día está cerrado y lo cerramos y en nuestra compu o celu aparece cerrado que
no deja meter pedidos, ¿por qué a otros vendedores desde otra computadora sí?"*.

- **Causa**: los días cerrados solo se bajaban de la planilla **al cargar la página**
  (`refreshCupos()` en el arranque). Un celular con la pestaña abierta desde antes del cierre
  **nunca se enteraba**. Y el freno era **solo del navegador**: `doSave` del Apps Script
  únicamente controlaba cupos, así que ese cliente desactualizado guardaba y el servidor aceptaba.
- **Fix 1 — se vuelve a mirar la planilla justo ANTES de guardar** (`refrescarEstado()` en
  `submitPedido`, solo para pedidos NUEVOS con entrega). Es la carrera que hay que ganar.
  ⚠️ **Sin atajos por "recién miré"**: se probó saltearlo si hacía <1 min del último refresco y
  eso reabría el mismo agujero (el día se cierra 10 s antes de guardar). Se mira siempre.
  ⚠️ Con **tope de 4 s** (`conTope()`): si la planilla no contesta, **se guarda igual**. Trabar
  a una vendedora por una hoja lenta es peor que un pedido de más.
- **Fix 2 — refresco al entrar al formulario** (`refrescarSiHaceRato`, throttle de 1 min): el
  cartel rojo aparece sin tener que intentar guardar.
- **Fix 3 — candado en el Apps Script** (`diaCerradoGs` + `error:'dia_cerrado'` en `doSave`).
  Es el único definitivo, pero **exige que el usuario reimplemente el Apps Script**. El panel ya
  entiende la respuesta (revierte el pedido, avisa y aprende el cierre). **Sin actualizarlo no se
  rompe nada**: sigue vigente el freno del navegador.
- ⚠️ Efecto lateral en los tests: el guardado ahora hace una llamada más. Las suites que ponían
  `CONNECTED=true` y mockeaban `apiSave` pero **no** `apiList` salían a la red de verdad y
  flaqueaban. Se les agregó el mock a `test_roho`, `test_montocobrado` y `test_occorr`.
  **No** al resto: en `test_full` el mock le cambiaba los datos del Excel y rompía la prueba de
  colores. Regla: mockear `apiList` solo donde la suite guarda pedidos.
- Tests: `test_cierre2.js` (19 comprobaciones) — simula las dos computadoras, el Apps Script
  viejo y el nuevo, y que sin internet no se trabe.

## 4aa. Los tildes de la lista de carga se comparten (2026-08-05)

El usuario preguntó *"¿qué más hay que se guarda en una compu y no se ve en las demás?"*.
Se auditó **todo** el `localStorage`. Se comparten por la planilla: pedidos, cobros, fotos,
días cerrados, arqueo y retiros. Quedaban **solo en cada máquina**:
1. los **tildes de la Lista de carga** (este cambio),
2. la **contraseña de administración** (`LS_ADMIN`),
3. la **cola offline** (`LS_PEND` — inherente: son los que todavía no salieron de ese celular).
El resto es preferencia local a propósito (nombre recordado, chofer, caché de geo, "ya vi el parte").

- `CARGA_CHK` viaja en la fila del sistema **`__carga_chk__`** con **fecha vacía** (mismo molde
  de §4o/§4m/§4w → sin redeploy del Apps Script). localStorage queda de espejo.
- Formato legible en la hoja: `2026-08-05|CAMION 1|COLCHON SOFT 140x190 ; …`.
  ⚠️ El `;` separa entradas: `cargaChkKey()` lo cambia por coma en día/vehículo/producto,
  así un producto con `;` en el nombre no parte la lista en dos.
- ⚠️ **Se poda solo a 10 días** (`CARGA_DIAS_GUARDA`): la celda de la planilla no es infinita
  y los tildes viejos no le sirven a nadie.
- ⚠️ **Escritura con respiro de 700 ms** (`guardarCargaChk`): tildando 10 productos seguidos va
  **una sola** escritura, no diez. Está verificado en el test.
- "Destildar todo" ahora avisa que borra **para todo el equipo**.
- Última escritura gana. En la práctica tilda una sola persona por camión, así que no se
  buscó nada más fino.
- Tests: `test_cargachk.js` (21 comprobaciones), incluida la simulación de la segunda computadora.

## 4ab. La imagen del pago es obligatoria SIEMPRE, y entran hasta 4 (2026-08-05)

Pedido: *"en contabilidad y al cargar pedido en cualquier método de pago o registro de pago o
efectivo debe exigirles subir foto ya sea del comprobante o del QR o voucher de tarjeta. Así que
indiferente del método de pago permite que suban hasta 4 fotos"*.

- **`metodoConComprobante(m)` → `!!String(m||'').trim()`**: antes era `m==='QR'||m==='Tarjeta'`.
  Ahora **Efectivo también pide imagen**; lo único que no pide nada es *todavía no eligió método*
  (`''`), porque el bloque ni siquiera está en pantalla.
- **`nombreComprobante(m)`** para hablarle a cada uno en su idioma: QR → *"la captura del pago"*,
  Tarjeta → *"la foto del voucher"*, **Efectivo → *"la foto del recibo"***. Se usa en el rótulo,
  en el aviso rojo y en el gato 🐱 (`memeComprobante`, que ahora dice "el pago es en EFECTIVO y no
  adjuntaste la foto del RECIBO").
- ⚠️ **Contabilidad NO bloqueaba** — el gate del formulario existía desde §4r, pero
  `ctaRegistrarPago` registraba sin imagen. Se agregó el corte **antes** del chequeo de saldo
  (si no, un pago que además tenía otro problema mostraba el mensaje equivocado), y hace scroll
  al fondo del modal para que se vea el botón de adjuntar.
- **`COMP_MAX` 2 → 4** (§4x). Nada más cambió: `compsArr()`, `compTiraHtml()` y el tope dentro de
  los `on…Elegido` ya trabajaban con la constante, así que los TRES lugares (formulario,
  Contabilidad, retiro de efectivo) pasaron a 4 solos.
- El formato del historial ya soportaba varios `%` desde §4x → `"Efectivo 500 @… #1 %A %B %C %D"`.
  **No hubo cambio de formato**: lo viejo se sigue leyendo igual.
- ⚠️⚠️ **`faltaComprobanteForm()` — la trampa que casi rompe todo**: **casi todas las ventas
  históricas fueron en efectivo y ninguna tiene imagen**. Con la regla a secas, abrir cualquiera
  de esas para corregirle la dirección quedaba trabado para siempre. Regla final:
  al pedido **NUEVO** siempre se le pide; al que se **EDITA**, solo si el pago se está cargando o
  cambiando ahora (si ya venía con pago y sin imagen, pasa; si tenía imagen y se la quitan, no).
- El **retiro de efectivo** sigue con la foto **opcional** (allí el pedido fue *"deben poder
  subir"*, no *"deben"*); lo que subió es el tope a 4. El **cobro que anota el chofer en la calle**
  tampoco pide imagen: no se lo traba en pleno reparto.
- Tests: `test_fotoefec.js` (38 comprobaciones, incluidas las 4 del pedido viejo que se sigue
  editando). Se actualizaron `test_dosfotos`, `test_comprobante` (afirmaba *"con Efectivo NO pide
  comprobante"*, justo lo que el usuario quería cambiar), `test_compform`, `test_conta2`,
  `test_notapago`, `test_montocobrado`, `test_banco` y `test_tienda`.
- ⚠️ **Nota de laboratorio**: varias suites se volvieron inestables desde §4z porque el repaso de
  la planilla previo a guardar se va a la red bloqueada del sandbox y tarda segundos. Se les
  agregó `apiList` mockeado (`test_compform`, `test_tienda`). Si una suite falla en el guardado
  "sin razón", es lo primero que hay que mirar.

## 4ac. FIX GRAVE — el botón "Adjuntar imagen" de Contabilidad estaba mudo (2026-08-05)

Reporte: *"el botón de adjuntar imagen en efectivo, pestaña contabilidad no funciona"*.

**La causa, en una línea**: `compTiraHtml` metía el handler crudo en el atributo →
`onclick="ctaAdjuntar("p-123")"`. **Las comillas dobles del `JSON.stringify` cortaban el
atributo al medio**: el navegador leía `onclick="ctaAdjuntar("` y el botón no hacía NADA.

- Existía desde §4x (2026-08-04) y afectaba a **los tres métodos**, no solo al efectivo —
  nadie lo notó porque hasta §4ab el comprobante era opcional. Con la imagen ya obligatoria
  se volvió un **bloqueo total: no se podía registrar ningún pago en Contabilidad.**
- Lo mismo le pasaba a la **✕ de cada miniatura** (`ctaSacarCompIdx.bind(null,"id")`).
- Arreglo: `compTiraHtml` pasa **todos** sus handlers por `esc()`, así queda a prueba de
  quien lo llame con comillas dobles. Los otros dos usos (formulario y retiros) nunca
  fallaron porque pasan nombres pelados (`adjuntarCompForm()`).
- ⚠️ En el resto del archivo el patrón correcto ya estaba: **todo `JSON.stringify` dentro de
  un `onclick` lleva `.replace(/"/g,'&quot;')`**. Este era el único sin la guarda.
- ⚠️⚠️ **Por qué no lo cazó ningún test**: las 95 suites llamaban a las funciones por dentro
  (`onCompElegido(...)`) en vez de **hacerle clic al botón**. El HTML podía estar roto y
  todo seguía en verde. Desde ahora hay dos suites nuevas:
  - `test_botones.js` (23) — le hace **clic de verdad** a cada botón de adjuntar y a cada ✕,
    en Contabilidad (los 3 métodos + pago ya registrado), en el formulario y en los retiros.
    Espía el `.click()` del input de archivos escondido para saber si la cadena llegó al final.
  - `test_onclicks.js` (24) — **barrido de toda la app**: abre las 5 pantallas y las 12
    ventanas y compila el `onclick` de **cada botón visible** (320) con `new Function`.
    Se verificó que, con el bug puesto de vuelta, el barrido lo encuentra.

## 4ad. Detalle de los retiros de efectivo en el cuadre (2026-08-05)

Pedido: *"en el panel contabilidad es para un contador y falta en la tabla mostrar los retiros
de efectivo registrados"*.

- Nueva caja **`💵 Detalle de los retiros de efectivo — N`** (`renderCuadreDetRetiros()`,
  contenedor `#cua-det-retiros`) **debajo del `📄 Detalle de los pagos`**. La idea es esa
  simetría: arriba **lo que entró**, abajo **lo que salió**.
- Un renglón por retiro: fecha · entrega (vendedora) · retira · N° de notas del recibo ·
  facturado/no facturado · monto · observación. El **📎** abre la foto del recibo; si no hay
  ninguna, sale **⚠️** — para el contador es justo lo que tiene que reclamar.
- Cierra con **TOTAL RETIRADO**, con el corte facturado / no facturado al lado.
- Respeta **los mismos filtros** que el resto del cuadre (período y vendedora), igual que §4y.
- Tocar un renglón → `verRetiro(id)` = `abrirRetiros()` + `editarRetiro(id)`.
- El **Excel del cuadre ya traía este bloque** desde §4w; lo que faltaba era verlo en pantalla.
- ⚠️ **Para los tests**: `RETIROS` se **rearma desde la planilla** en cada relectura
  (`mergePending`). No alcanza con asignar `RETIROS=[…]`: las filas tienen que venir también
  en lo que devuelve el `apiList` mockeado, si no el primer refresco las borra.
- Tests: `test_detret.js` (26 comprobaciones).

## 4ae. Los avisos del cuadre se pueden tocar, y Ventas muestra los números en grande (2026-08-05)

Reporte: *"ahora menciona 3 nombres pero en la tabla de abajo los busco y no me aparecen"*
(el aviso "3 ventas marcadas PAGADA sin anotar el monto").

**No era un bug del filtro**: esas ventas **no tienen ningún pago** (ni monto ni fecha), y el
`📄 Detalle de los pagos` lista PAGOS — `cuadrePagos()` corta por `enPeriodoCuadre(c.fecha, pe)`
y un pago sin fecha no entra en ningún período. Estaban en el limbo: el aviso las nombraba y
no había forma de encontrarlas.

- **`alertaDetHtml()`**: cada nombre del aviso es ahora un `<span>` que abre esa venta
  (`showContaModal`). El `det` de `cuadreAlertas` pasó de `['texto']` a `[{txt,id}]`.
  Tope de 8 nombres (`ALERTA_DET_MAX`) y "… +N" para el resto.
- Los avisos **dicen por qué** no salen abajo: *"por eso no salen en el detalle de abajo"* /
  *"no entran en ningún cuadre ni en el detalle de abajo"*.
- **`ctaAnotarMonto(id, idx)`** en la ficha: el pago que dice *"monto no anotado"* trae un botón
  **💵 Anotar el monto**. Pregunta cuánto entró, le pone la **fecha de la venta** (sin fecha
  seguiría fuera de todo cuadre) y la venta vuelve a la normalidad.
  - ⚠️ Necesitó **`aplicarCobros(p, arr, objetivoForzado)`**: el objetivo se calcula como
    `saldo + totalCobrado`, que en estas ventas da **0**. Sin forzarlo, anotar Bs 5.750 dejaba
    `saldo = -5750` y la venta pasaba a figurar con **"cobro de más"** — cambiar un problema
    por otro. Con el objetivo forzado queda saldo 0, pagada y sin exceso.
- ⚠️ **Corrección del usuario, importante para el futuro**: *"CUADRE Y CONCILIACIÓN NO ES PARA
  QUE EL CONTADOR EDITE AHÍ MISMO, ES PARA QUE DETECTE FALTANTES … PARA INFORMAR AL VENDEDOR"*.
  El cuadre **detecta**; la corrección se hace en **Contabilidad → Ventas**, que es donde las
  vendedoras cargan sus pagos. Los avisos abren la venta para **verla y saber a quién
  reclamarle**. (El usuario después aceptó que desde la ficha sí se pueda anotar y editar.)
- **Tarjetas grandes en Contabilidad → Ventas** (`renderContaMetrics`, `#cta-metrics`), pedidas
  para que la vendedora vea de un vistazo: **Vendido en el período · Ya ingresó (con el % de lo
  vendido) · Falta cobrar (y cuántas ventas hay que salir a cobrar) · Por cargar al sistema**.
  Se mueven con el filtro de vendedor y con el período. Debajo queda el resumen fino de siempre.
  - Helpers: `contaFaltaCobrar(p)` y `contaCobrado(p) = ventaTotal - falta` (por diferencia, así
    el anticipo no se cuenta dos veces).
- Tests: `test_alertaclic.js` (17) y `test_ctafichas.js` (28).

## 4af. Efectivo retirado / por retirar en el cuadre, y "Todo" incluye los sin fecha (2026-08-05)

Pedido: *"falta efectivo retirado, efectivo por retirar, y que funcione el filtro día mes todo"*.

- **Dos tarjetas nuevas** en el cuadre (ahora son **6**, en grilla de **3 columnas** con
  `.metrics.m3` — con 4 columnas quedaban 4+2 desbalanceadas):
  - **💵 Efectivo retirado** = `retirosTotal(retirosDe(pe, vend))`, con cuántos retiros y
    cuánto de eso es facturado.
  - **💵 Efectivo por retirar** = `efectivo − retirado`, o sea lo que **todavía está en la
    mano**. En cero dice *"✅ Nada · se recogió todo el efectivo"*; en negativo cambia de
    título a **"Se retiró de más"** en rojo.
- **Se verificó que el filtro Día/Mes/Todo ya andaba** (`dbg_filtro2.js`: día hoy 1.000,
  día ayer 2.000, mes 3.000, todo 7.000). Lo que NO andaba era otra cosa, y apareció mirando:
- ⚠️ **`enPeriodoCuadre('', pe)` devolvía `false` siempre** → un pago **sin fecha** era
  invisible en las **tres** vistas, "Todo" incluido. El aviso lo nombraba y no aparecía en
  ninguna tabla — el mismo agujero de §4ae. Ahora `if(!fecha) return pe.modo==='todo'`:
  **"Todo" es todo**. En Día y Mes sigue afuera, que es lo correcto (no se sabe cuándo entró).
- Tests: `test_cuaefec.js` (28), incluidos los tres modos, el filtro de vendedora, el caso
  "se retiró de más" y que el pago sin fecha aparezca en Todo pero no en Mes.
- ⚠️ **Para los tests**: `.mc-lbl` se ve en MAYÚSCULAS por CSS (`text-transform`), pero
  `textContent` devuelve el texto original. Comparar siempre con `.toUpperCase()`.

## 4ag. El pago se copia para WhatsApp (2026-08-05)

Pedido: *"añadir botón copiar whatsapp cuando carguen un pago, así pueden mandar al grupo el
comprobante y el mensaje"*.

- **`pagoTexto(p, c)`** arma el mensaje: cliente, N° de nota de venta, fecha, forma de pago (con
  banco), monto, N° del recibo de ESE pago, vendedor, si quedó **pagada** o **cuánto falta**, y
  el **link de cada imagen** (`fotoVer`). Si el pago es el anticipo, el título cambia a
  *"PAGO A CUENTA (ANTICIPO)"*.
  ⚠️ WhatsApp **no puede adjuntar el archivo desde un texto**: va el **link** a Drive, que abre
  la imagen. Es lo máximo que se puede hacer sin app nativa.
- **`showPagoWhatsapp(id, i)`** — mismo molde que el modal de "Pedido guardado" (§ viejo):
  textarea + **📋 Copiar** + **📲 Abrir WhatsApp** (`wa.me/?text=`) + **Volver a la venta**
  (que reabre la ficha en vez de dejar la pantalla vacía).
- `ctaRegistrarPago` lo abre **en lugar de** volver a la ficha: recién cobrado, lo que sigue es
  avisarle al grupo.
- Además, **cada pago ya registrado** tiene su botón **📲 WhatsApp** en la ficha, para volver a
  mandarlo más tarde. El índice que se pasa es el de `contaPagos()`, así el **anticipo también
  se puede reenviar**.
- Tests: `test_wapago.js` (24).

## 4ah. Recargo por entrega — el flete que paga el cliente aparte (2026-08-10)

Pedido: *"¿cómo podemos implementar cuando tiene un cobro adicional de recargo por entrega,
para que se refleje en contabilidad y los vendedores también lo registren y reporten?"* +
*"queremos tener mejor control haciendo que los vendedores reporten ese cobro y ese pago"*.

**Decisiones del usuario** (preguntadas antes de escribir una línea):
1. El recargo va **APARTE de la venta** — no se suma al saldo del cliente.
2. **NO se factura** — columna y total propios, sin mezclarse con lo facturado.
3. Lo carga **la vendedora al cargar el pedido** y también se puede anotar **después desde
   Contabilidad** (para el clásico *"el cliente pagará transporte contra entrega, cotizar"*).
   **El chofer NO lo anota** (el usuario lo descartó).

- **Formato**: un renglón más en el mismo historial de pagos, con la marca **`^`**
  (`~` = anticipo, `^` = recargo): `"~Efectivo 5000 @… #900 %F1 + ^Efectivo 150 @… #900 %F2"`.
  Sin columnas nuevas y **sin redeploy del Apps Script**.
- ⚠️⚠️ **La parte delicada: que el recargo sea INVISIBLE para todo lo demás.**
  - `cobrosDe()` lo excluye → no toca `totalCobrado`, `objetivoCobro`, `saldo`, `ventaTotal`
    ni `excesoCobro` (si no, cada flete aparecía como **"cobro de más"**).
  - `aplicarCobros()` **relee los recargos antes de reescribir** y los vuelve a escribir,
    igual que el anticipo: sin eso, el primer cobro se los llevaba puestos.
  - **`sinEnvios(txt)`** para los caminos que leen el campo CRUDO (el "método suelto" de una
    venta con saldo). Sin esto, un pedido viejo con recargo perdía su método y su comprobante.
  - `aplicarEnvios(p, arr)` reescribe SOLO los recargos, dejando anticipo y cobros intactos.
- **Sí es visible como plata que entró**: `contaPagos()` lo agrega al final, así sale en la
  ficha, en la celda de pagos y en el **cuadre** (marcado `🚚 RECARGO`). En el cuadre se aclara
  cuánto de lo que entró es flete, y va también en el texto de WhatsApp.
- **Dónde se carga**:
  - Formulario: campo **"🚚 Recargo por entrega"**, aparece junto al método de pago. Hereda el
    método, la fecha, la nota y las fotos del cobro. Al editar se relee y se puede borrar.
  - Ficha de Contabilidad: dos botones arriba del bloque de cobro — **💵 Pago de la venta** /
    **🚚 Recargo por entrega** (`CTA_TIPO`). Con saldo 0 el bloque aparece directo en modo
    recargo (antes no aparecía nada y no había dónde anotarlo). Mismo comprobante obligatorio.
  - Botones propios del renglón: `ctaEnvioAdjuntar`, `ctaEnvioQuitarComp`, `ctaBorrarEnvio`
    (⚠️ el recargo **no está en `cobrosDe`**, así que los botones de los cobros no le sirven:
    `ctaIdxCobro` devuelve **-1** para él a propósito).
- **Contabilidad**: columna **"Recargo entrega"** (con método y 📎), total en el resumen, y
  columna nueva en el Excel.
- Tests: `test_recargo.js` (41), incluidos los tres formatos viejos que podían ensuciarse.

## 4ai. El flete se cobra al entregar: pactado vs. cobrado (2026-08-10)

Reporte: *"no todas las entregas tienen recargo, y falta mostrar en las fichas cuánto se
cobrará por entregas y cuánto se cobró … y como se cobra al entregar debe alertar al vendedor
y obligar a colocar si se pagó lo reportado por cobrar de entrega y subir comprobante"*.

§4ah dejaba el recargo como **un pago ya hecho**. En la realidad **se cobra en la puerta**, así
que hacían falta DOS estados.

- **La distinción, sin inventar formato nuevo**: un `^` **sin método** es el flete **PACTADO
  y sin cobrar**; **con método** (y su fecha, recibo y comprobante) es el **ya cobrado**.
  Para eso `parseCobros` dejó de exigir método en las líneas `^`
  (`if(!met && !ant && !env) return;`). Al cobrarlo, la línea pactada **se reemplaza**, no se
  suma encima.
  - `envioTotal` = pactado · `envioCobrado` · `envioPorCobrar` · `envioPendiente`.
- ⚠️⚠️ **Lo que casi se cuela: el flete pactado NO puede figurar como plata que entró.**
  Estaba entrando en `contaPagos()` → aparecía en "Pagos recibidos" como *"método no anotado"*
  y, en el cuadre en modo **Todo** (§4af), **se contaba como ingreso**. `contaPagos()` ahora
  filtra `envioYaCobrado`. Verificado con `dbg_flete3`: día/mes/todo = 4000, nunca 4250.
- ⚠️ `textoCobros` metía un espacio de más sin método (`"^ 150"`). Parseaba igual, pero en la
  hoja se veía sucio.
- **Formulario**: bajo el monto, segmento **"¿Ya cobraste el flete?"** — por defecto
  *"Todavía no, se cobra al entregar"*. Cambiarlo de SÍ a NO le saca método y comprobante.
- **La persecución** (el pedido literal era *"obligar"*):
  - `misPendientes()` suma `sinFlete` — y a diferencia de los otros pendientes, **persigue
    también los pedidos ya entregados**: si no, el flete cobrado y no reportado se perdía.
  - Aviso rojo en **Mis pedidos** con un botón por entrega.
  - En la ficha, **"Ya cobré el flete — registrarlo"** → `cobrarFlete(id)` abre la ficha de
    Contabilidad en modo recargo con el monto puesto. El comprobante ya era obligatorio (§4ab),
    así que **no se puede reportar el cobro sin la foto**.
  - En el cuadre, aviso **"N entregas con el recargo por entrega sin cobrar"**, tocable (§4ae).
- **Los tres números** en la ficha (`envioResumenHtml`), en la columna de Ventas (badge
  ⏳ POR COBRAR), en el resumen y en el Excel (RECARGO / COBRADO / POR COBRAR).
- ⚠️ **Dos cosas que faltaban (reportadas por el usuario)**:
  1. **El campo del flete no aparecía si la venta iba toda por cobrar.** Colgaba de
     `metodoVisible` (el bloque de "¿con qué pagó?"), que solo sale con PAGADO=SÍ o con
     adelanto. Justo el caso más común del flete —venta a crédito, transporte contra
     entrega— se quedaba sin campo. Ahora `#wrap-envio` está **siempre visible**; lo que
     sí depende del cobro es el *"¿ya lo cobraste?"* (sin método no hay con qué respaldarlo,
     así que solo puede quedar pactado, y se avisa con `#f-envio-pend`).
  2. **Faltaban las tarjetas en el cuadre.** Se agregaron **🚚 Transporte cobrado** y
     **🚚 Transporte por cobrar** → el cuadre pasó de 6 a **8 tarjetas** (vuelve a la grilla
     de 4 columnas, 4+4; se sacó `.m3`). El "por cobrar" sale de `cuadreFletesPend()`, que
     corta por la **fecha de la VENTA** (un flete sin cobrar no tiene fecha de pago).
- Tests: `test_flete2.js` (46). `test_recargo.js` (41) sigue verde.

## 4aj. Contabilidad puede cortar por fecha de ENTREGA (2026-08-10)

Reporte: *"este pedido entró en julio pero se entregó en agosto y no se ve reflejado en la
planilla de contabilidad de agosto … ¿cómo hacemos cuando un pedido ingresa los últimos días
del mes pasado y se entrega en el mes actual?"*

No era un bug: **Contabilidad → Ventas siempre cortó por fecha de INGRESO** (el `ts`), a
propósito (§ pestaña Contabilidad). Lo que faltaba era **poder mirarlo por la otra fecha**.

- **`#cta-base`** — segmento nuevo **📝 Ingreso / 🚚 Entrega**, arriba del Día/Mes/Todo.
  `contaBase()` y **`contaFechaBase(p)`** (entrega → `fechaSalida(p)`, que ya cubre las ventas
  de tienda cayendo en la de ingreso). `contaLista()` filtra por esa fecha.
  **El valor por defecto sigue siendo INGRESO**: cambiarlo movería todos los números que el
  usuario ya conoce.
- **Columna "Entregado el"** con `entregaFechaHtml(p)`: la fecha, más **📆 OTRO MES** cuando la
  entrega cayó en un mes distinto al de la carga, **🏪 EN TIENDA** para las ventas de tienda y
  *"sin entregar"* si todavía no salió. Va también al Excel.
- **`pagoOtroMes(p, c)`** — marca los pagos cuyo mes difiere del de la venta: **📆 julio** en la
  tabla y **📆 se pagó en julio de 2026** en la ficha. Es la respuesta visual a *"indicar se pagó
  tanto el mes pasado"*, y explica por qué esa plata no está en el cuadre de este mes.
- ⚠️ **El Cuadre NO se tocó**: sigue cortando por **fecha del PAGO**, que es lo correcto — la
  plata se busca en la caja o el extracto del día en que entró. Una venta de julio entregada en
  agosto puede figurar en la planilla de agosto (por entrega) y su plata en el cuadre de julio.
  Son tres ejes distintos y a propósito: **admin = entrega · Ventas = ingreso o entrega ·
  Cuadre = pago**. Está verificado en el test que no se duplica.
- Tests: `test_mescruz.js` (21).

## 4ak. ATC — atención al cliente, con su propia numeración (2026-08-10)

Pedido: *"en pedidos donde dice N° OC debe haber un botón que deje seleccionar ATC, así no se
numera por OC sino por ATC porque es una atención al cliente"*.

- **Selector `#f-doc-tipo`** (📄 OC / 🎧 ATC) arriba del campo. Cambia el rótulo
  (**N° OC** ↔ **N° ATC**) y el cartel de "va por…".
- **Dos series independientes**, cada una con su correlativo mensual:
  `08-001` para las OC y **`ATC 08-001`** para las ATC. `nextOcMes(fecha, tipo)` filtra por
  `esATC(p.oc)!==atc`, así **cargar una ATC no le saltea el número al siguiente pedido**.
- ⚠️ **El tipo viaja en el propio número** — no hizo falta ninguna columna nueva (la planilla
  tiene 29 fijas). `esATC()`, `ocSinPre()` y **`ocEtiq()`** son los tres helpers de todo esto.
- ⚠️ **`ocEtiq(oc)` en los 11 lugares que imprimían `'OC '+p.oc`**: si no, quedaba
  **"OC ATC 08-001"**. Ahora devuelve `"OC 08-001"` o `"ATC 08-001"` según corresponda —
  tablas, fichas, WhatsApp, la ruta y el parte del día.
- `ocAuto()` acepta las dos series (lo usa el detector de números repetidos), y como la
  comparación es sobre el texto completo, las series no se pisan entre sí.
- **ROHO no cambia**: su N° lo manda el cliente, así que ahí el selector **se oculta** y el
  campo sigue siendo manual.
- Al **editar**, el selector arranca en el tipo que ya tenía y el número no se toca.
- ⚠️⚠️ **Las ATC NO entran a Contabilidad** (pedido explícito del usuario: *"las ATC no le
  importan a contabilidad, no se deben ver en contabilidad y conciliación"*). Una atención al
  cliente es un servicio, no una venta: ensuciaría los totales y el cuadre.
  - Se agregó **`fueraDeConta(p)`** = `contaExcluido(p.vendedor) || esATC(p.oc)` y se cambió
    en los **5** puntos de entrada: `contaLista`, `cuadrePagos`, `cuadrePendientes`,
    `cuadreFletesPend` y `cuadreAlertas`. **Todo lo que filtre por contabilidad va por ahí**,
    ya no por `contaExcluido` suelto.
  - Con eso quedan afuera de una sola vez: la tabla de Ventas, sus tarjetas y su resumen, el
    Excel, el detalle de pagos, el "por cobrar", los avisos, el efectivo por vendedora y las
    dos tarjetas de transporte.
  - **Sí siguen en Administración**, la lista de carga y la ruta: la entrega hay que hacerla.
- Tests: `test_atc.js` (31) y `test_atcconta.js` (20).

### Resaltado fucsia de las ATC (2026-08-11)
El usuario preguntó **qué color quedaba libre** para resaltarlas. Relevamiento de los 7 ya usados
en `rowKind()`: rojo `#dc2626` (falta stock) · violeta `#7c3aed` (recoger de IM) · naranja `#fb923c`
(50x70) · celeste `#38bdf8` (medida especial) · verde `#e9f9f1` (en stock) · amarillo `#f5c400`
(en producción) · gris `#90a4ae` (entregado). **Libre y no confundible: fucsia** — turquesa choca con
el celeste y con el teal de la marca, y el marrón se lee como gris sucio al lado del de "entregado".

**Decisión de diseño (la parte importante):** la ATC **no compite por el fondo de la fila**.
`rowKind()` devuelve UNA sola clase por prioridad, así que si el fucsia entraba en esa cadena, una ATC
sin stock **habría perdido el rojo**. En su lugar la ATC usa un **canal distinto**:
- el **fondo** lo sigue mandando el estado de stock;
- la **barrita izquierda** (`box-shadow: inset 4px 0 0`) pasa a fucsia — `row-atc` se agrega *además* de
  la clase de stock, y su regla CSS va **última** a propósito (con `!important` empatado gana la de abajo);
- se agrega el chip `🎧 ATC` (`.b-atc`).

Variables nuevas en `:root`: `--atc #D946EF` / `--atc-lt` / `--atc-dk` / `--atc-border`.
Ayudantes: `atcChip(p)` y `atcCls(p, cls)`.

⚠️ En `#tbl-pedidos` la primera celda es `position:sticky` con fondo opaco y **tapa el `inset` del `<tr>`**
(por eso ya existían las reglas `tr.row-X td:first-child{background:…}`). Hace falta la regla extra
`#tbl-pedidos tbody tr.row-atc td:first-child{box-shadow:inset 4px 0 0 var(--atc),1px 0 0 var(--gray-lt)}`
o la barra no se ve.

Aplicado en las 5 vistas donde aparece un pedido: tabla de Administración, **Lista de carga**
(`.carga-stop.atc`), **ruta del chofer** y **Mis entregas** (`.cho-card.atc`, filo izquierdo de 5px)
y **reporte de entregas** (`.ent-card.atc` + el N° en chip fucsia).
- Test: `test_atccolor.js` (32) — verifica que una ATC sin stock **conserva el mismo fondo rojo** que una
  venta sin stock, que la entregada conserva el gris, y que ningún otro estado usa el fucsia.

## 4al. Precio por ítem + corregir montos desde Contabilidad (2026-08-12)
Pedido: *"Que los vendedores puedan editar y modificar sus precio de cada ítem desde
contabilidad y pedidos"*. Al preguntarle si los precios debían mandar el total, aclaró:
*"que puedan modificar el a cuenta y saldo lo que cargan y colocan actualmente"* — o sea
**el total lo sigue mandando lo que ella anota**; los precios son el detalle. Quién edita:
**el vendedor y Administración**.

**Dónde vive el precio.** `x.precio` = precio **UNITARIO** en Bs, adentro de `productos`.
La planilla ya guarda ese array como JSON en `_productos_json` (`google-apps-script.gs:473`),
así que **no hizo falta columna nueva ni volver a publicar el Apps Script**. Si el precio es
0 o vacío **no se escribe la clave**: los pedidos viejos quedan byte por byte como estaban.

Helpers: `prodPrecio(x)` · `prodSub(x)` (precio × cant) · `prodTotal(p)` · `tienePrecios(p)` ·
`preciosAMedias(p)` · `difPrecios(p)` · `precioDescuadra(p)`.

**Por qué el total NO se calcula solo.** Un combo armado a mano o un descuento hacen que la
suma de los ítems no dé el total, y eso es legítimo. Entonces se **avisa** (naranja, con la
diferencia) en vez de pisar lo que cargó la vendedora. `difPrecios()` devuelve 0 cuando el
pedido no tiene ningún precio, así que **los viejos nunca descuadran**.

**Formulario:** campo `PRECIO C/U` en cada `.prod-card` (la grilla `.prod-sub` pasó de 3 a 4
columnas, y a 2 en celular), subtotal en vivo por línea (`.prod-sub-tot`), caja
`#f-prods-total` con la suma y un botón **Usar como total** (`usarTotalProds()`) que llena el
saldo = suma − a cuenta. `addProdRow()` recibe un 5º parámetro y `getProductos()` lo lee.

**Contabilidad → ficha:** bloque `#cta-edit` (`ctaEditHtml`) con el precio de cada ítem, el
**A cuenta** y el **Saldo**, y `ctaGuardarMontos()`. `ctaRecalc()` repinta **por DOM, no
redibujando la ficha**: si redibujara, el cursor saltaría del campo a cada tecla.

⚠️ **Lo delicado — no pisar los pagos registrados.** Cada pago tiene recibo, fecha y foto: es
el respaldo del contador. `aplicarMontos(p, acu, sal)` reescribe **solo** el anticipo y el
saldo, y **el ledger se toca únicamente si el adelanto cambió de verdad** — reescribirlo de
gusto convertiría un pago viejo (formato suelto, sin fecha) en un renglón del ledger sin
fecha, o sea plata que después no aparece en los filtros por día ni por mes. Cuando sí hay
que reescribir, a los cobros sin fecha se les pone `contaFecha(p)` por la misma razón.
El total queda **adelanto + pagos registrados + saldo**.

**Excel de Contabilidad:** 4 columnas nuevas — `PRECIO UNIT.` y `SUBTOTAL` por producto,
`TOTAL VENTA` y `SUMA DE PRECIOS` por pedido (27 columnas; el ancho de `cols` se actualizó
para que siga coincidiendo con el encabezado).

- Test: `test_precios.js` (44). Cubre las cuentas, el formulario, el guardado, la reedición,
  que un pedido viejo no se rompa, la edición desde Contabilidad, **que el pago registrado
  sobreviva** (`#901` y `%F1` siguen en el ledger), corregir el a cuenta, quedar pagado,
  el rechazo de negativos y las columnas del Excel.
- ⚠️ Trampa al escribir tests del formulario: `resetForm()` deja **una fila vacía adelante**,
  así que hay que buscar cada `.prod-card` por su `.prod-desc`, no por posición.

**`test_onclicks` se ganó el sueldo.** El botón "Guardar precios y montos" salió mudo:
`onclick="ctaGuardarMontos('+JSON.stringify(String(p.id))+')"` mete **comillas dobles** que
cortan el atributo — exactamente el bug de §4ac, otra vez. Ningún test funcional lo hubiera
visto (todos llaman a la función directo). Corregido con `esc()`.
👉 **Regla: todo `onclick` que se arma como string va por `esc()`.** `JSON.stringify` NO sirve
para eso dentro de un atributo HTML entre comillas dobles.

### ⚠️ `cobradoBs` NO tiene columna en la planilla (2026-08-12)
Al preguntar el usuario *"¿se ve los cambios desde cualquier compu?"* apareció un bug real
del cambio de arriba. **`cobradoBs` no se escribe ni se lee en el Apps Script** (`recToRow`
tiene 29 columnas y ninguna es esa; ver también el comentario de `pedidos.html:1728`): vive
**solo en el navegador que cargó la venta**. Desde OTRA computadora el pedido llega sin ese
campo y lo único que sobrevive es el **ledger dentro de `metodoPago`**.

`aplicarMontos()` decidía `p.pagado` mirando `p.cobradoBs` → desde otra compu, poner el saldo
en 0 dejaba la venta **marcada como NO pagada** aunque estuviera cobrada. Corregido:
`var yaCobrado = totalCobrado(p) || (Number(p.cobradoBs)||0);` — el ledger primero (es lo que
viaja), el cache local solo de respaldo para los viejos marcados PAGADO sin monto anotado.
👉 **Regla: para saber cuánto se cobró, `totalCobrado(p)` (lee el ledger). NUNCA `p.cobradoBs`
   a secas en algo que se guarde.**

Verificado con las funciones **reales** del `.gs` (`recToRow` + `parseProd`) que sí sobreviven
el viaje: **`precio` de cada ítem** (va dentro de `_productos_json`), `acuenta`, `saldo`,
`metodoPago` entero (recibos `#` y fotos `%`).

Aparte, se observó que **una recarga en vuelo puede pisar un guardado en la pantalla local**
(`refreshConta()` hace `STATE=mergePending(res.pedidos)` con la foto tomada al llamar a
`apiList`). El dato **sí llega a la planilla**; lo que queda viejo es la vista hasta el próximo
refresco. Es preexistente y afecta a todos los guardados, no solo a este. No se tocó.

**Flake de medianoche corregido en `test_conta.js`** (preexistente, no era de este cambio):
el fixture usaba `ts: Date.now()-7200000` para el pedido "de hace 2 horas", que entre las
00:00 y las 02:00 UTC cae al **día anterior** y el filtro por día encontraba 2 en vez de 3.
Ahora el fixture ancla al **mediodía** (`new Date().setHours(12,0,0,0)`). Se comprobó
corriendo el test contra `05b1bb3` (ya publicado) antes de tocar nada: fallaba igual.

## 4am. Eliminar una venta desde Contabilidad (2026-08-12)
Pedido: *"falta el boton eliminar venta en contabilidad... mi vendedor duplico una venta y
es como si el cliente hubiera comprado 2 veces cuando fue solo 1"*.

`ctaEliminarVenta(id)` en la ficha de Contabilidad. La infraestructura ya existía
(`apiDelete` → `doDelete` → `sh.deleteRow`), así que **no hubo que tocar el Apps Script**.

**Fricción a propósito**, porque borrar es lo único que no se deshace:
- el botón va **abajo del todo**, separado por una línea punteada, chico y en rojo outline
  (`.btn-borrar`), lejos de los que se usan a diario;
- el `confirm()` nombra **cliente, nota, OC, total y vendedor**;
- si hay **plata anotada** (anticipo + pagos) o el pedido está **entregado**, pide una
  **segunda confirmación** que repite el monto. Sin plata y sin entregar, una sola.

⚠️ `realDelete()` no repintaba Contabilidad ni el Cuadre (nadie borraba desde ahí antes):
se le agregaron `renderContaSiActiva()` y `renderCuadreSiActivo()`. Sin eso la venta borrada
seguía en la tabla hasta cambiar de pestaña.

El `onclick` va por `esc()` (§4ac / §4al) — `test_borrarventa` lo verifica explícitamente.

- Test: `test_borrarventa.js` (22). Controla cada `confirm()` por separado para poder probar
  el **cancelar**: que cancelando en la primera vuelta no se borre nada, que cancelando en la
  **segunda** tampoco, que se borre de STATE **y de la planilla**, que la venta buena quede
  intacta, que la tabla se refresque sola, y que Administración y Contabilidad queden de acuerdo.

### Detector de ventas cargadas dos veces (mismo día, "hazlo")
`indiceDuplicados(list)` marca una venta cuando encuentra otra con:
- el **mismo N° de nota de venta** (`limpiaNota`) — cada recibo es único, es la señal fuerte; o
- el **mismo cliente** (`normNombre`, sin tildes) **+ mismo `ventaTotal` + mismo `contaFecha`**.

Devuelve `{grupos, marca, n}`. `marca` es un mapa `id → motivo`, y la primera señal que toca
una venta manda su etiqueta (por eso se juntan las notas **primero**).

Se calcula **una vez por render** en `renderConta` (`DUP_IDX`) — mirarlo fila por fila sería
recorrer la lista entera por cada fila. Se corre sobre **la misma lista que se muestra**:
marcar una venta sin poder ver su par confundiría más de lo que ayuda.

Se ve en tres lugares: chip `⚠️ ¿DUPLICADA?` al lado del cliente (`dupChip`), una línea en el
resumen de Ventas, y un aviso `👯` en `cuadreAlertas` que lista cada par con el motivo y se
toca para abrir la venta.

Como pasa por `contaLista()` / `fueraDeConta()`, **las ATC y los vendedores excluidos no
cuentan**. Es un **aviso, no un veredicto** — hay clientes que compran dos veces de verdad,
así que dice "¿duplicada?" y nunca borra ni esconde nada solo.

- Test: `test_duplicados.js` (28). Verifica las dos señales, los tres **falsos positivos que
  NO debe marcar** (otro día, otro monto, venta sola), que la marca desaparezca al borrar la
  copia, y que ATC y Eduardo queden fuera.

⚠️ **Los tests de FOTOS son flakes del run paralelo**, como `test_cerrardia`. En dos corridas
seguidas de `-P 4` falló uno distinto cada vez (`test_fotos` 10 fallas, después `test_dosfotos`
2 fallas), y **los dos pasan limpios las tres veces que se corren en serie** (26/0 y 43/0), sin
errores JS. Son los que más manipulan imágenes, así que se les va el timing cuando compiten por
CPU. 👉 **Antes de acusar una regresión en `test_fotos` / `test_dosfotos` / `test_cerrardia`,
correrlos en serie.**

## 4an. Las imágenes no se veían desde otra computadora (2026-08-12)
Reporte: *"Las imagenes que suben los vendedores en contabilidad no se logra ver EN OTRAS PC"*.

**Causa.** Todas las imágenes se pedían por `https://drive.google.com/thumbnail?id=…`. Ese
endpoint sirve el archivo casi siempre **solo si el navegador ya tiene sesión de Google con
acceso** — por eso la vendedora veía su propio comprobante (su navegador estaba logueado) y
desde otra PC salía el ícono roto. El Apps Script **sí** comparte bien
(`f.setSharing(ANYONE_WITH_LINK, VIEW)` en `guardarFoto`), el problema era cómo se pedía.

**Arreglo — dos caminos y una salida digna:**
1. `fotoThumb()` ahora devuelve `https://lh3.googleusercontent.com/d/<id>=w<N>`, que sirve el
   archivo compartido "con cualquiera que tenga el link" **sin pedir sesión**.
2. `fotoThumbAlt()` conserva el endpoint viejo como respaldo.
3. `fotoFallback(img, fid, w)`: primer error → prueba el alterno; segundo error → **reemplaza
   el `<img>` por un link** `📎 abrir imagen` (`.foto-rota`), en vez de dejar un cuadradito roto.

`fotoImgHtml(fid, {w, alt, title, cls, style, onclick})` es **el único lugar** que arma el
`<img>`, así que los dos caminos y el aviso valen para las 4 pantallas de una: comprobantes
del pago (ficha de Contabilidad), fotos de la entrega, retiros de efectivo y `compTiraHtml`.
El visor grande lo arma a mano porque su `<img>` ya existe en el HTML.
`fidLimpio()` deja solo `[A-Za-z0-9_-]` antes de meter el id en un atributo.

**Si el link 📎 tampoco abre en Drive**, entonces sí es un problema de permisos (política de
la cuenta que bloquea "cualquiera con el link"), no del panel. Pendiente ofrecido: que
`guardarFoto` relea `f.getSharingAccess()` y avise en el acto si quedó privada — **eso sí
necesitaría volver a publicar el Apps Script**.

- Test: `test_imgotra.js` (25). Simula **otra computadora** interceptando lh3 y drive con 403:
  verifica el orden de los intentos (`lh3 → lh3 → drive → drive`), que el `onerror` no quede
  cortado por comillas, y que la ficha de Contabilidad termine mostrando **2 links legibles y
  0 imágenes rotas**.
- ⚠️ Al escribir el fixture: los comprobantes van en el ledger **separados por espacio**
  (`%FOTO_A %FOTO_B`), no con `|`.
- El `<img>` que falla **se esconde, no se borra**, y el link se inserta al lado: así el DOM
  queda estable (el resto del panel y los tests siguen encontrando el elemento) y un
  repintado lo vuelve a intentar.

### 4an-bis. Y además, el comprobante SE PERDÍA (2026-08-12)
El usuario acotó: *"lo que cargan de venta en tienda es lo que no está saliendo"* y después
*"puede que el error sea cuando el vendedor crea la venta y horas o días después recién carga
el comprobante y el pago"*. Reproduciendo la matriz de casos aparecieron **dos bugs de datos**
que no tenían nada que ver con la URL. Ninguno es exclusivo de tienda, pero las ventas de
tienda son justo las que se cargan sin pago, por eso ahí saltó.

**1. Pedido guardado SIN pago → la imagen se tiraba en silencio.** En `submitPedido`,
`_metSuelto` solo se arma `if(_pagSI || _acuVal>0)`; sin pago quedaba `''` y **los IDs de
`FORM_COMPS` se descartaban**. La vendedora subía la foto (ya estaba en Drive), la veía en
pantalla, guardaba… y en Contabilidad no aparecía nunca. La imagen quedaba huérfana en Drive.
→ Ahora se **frena el guardado** y se explica: anotá el pago, o quitá la imagen y adjuntala
después desde Contabilidad. (Se contempla el recargo por entrega ya cobrado, que también
consume `FORM_COMPS`.)

**2. Con "a cuenta", solo se leía la PRIMERA imagen.** `anticipoDe()` devolvía `comp`
(singular) y no `comps`, y `textoCobros` hace `c.comps!=null?c.comps:c.comp` → la segunda se
perdía en el primer reescribido del ledger. Mismo arreglo en el fallback de `cobrosDe()`.
👉 **Regla: todo lo que arme un cobro devuelve `comps` (array), no solo `comp`.**

El camino "pago cargado días después desde Contabilidad" **ya funcionaba** — se verificó y
quedó cubierto para que no se rompa.

- Test: `test_compperdido.js` (16). Los tres casos (pagada / a cuenta / sin pago) sobre una
  venta de tienda, releyendo el pedido **como llega de la planilla**, más el camino correcto
  de cargar el pago después.

⚠️ **Al cambiar `fotoThumb()` se rompieron 9 suites** que afirmaban sobre la URL vieja
(`test_compform`, `test_comprobante`, `test_dosfotos`, `test_fotos`, `test_retiros`,
`test_visor`, `test_entregas`, `test_fotoefec`, `test_miscards`). Se hicieron agnósticas.
👉 **Las que CONTABAN ocurrencias de la URL (`match(/thumbnail\?id=/g).length`) pasaron a
contar `<img`**: al fallar la carga el `src` cambia a la dirección de respaldo, así que
contar la URL había quedado **dependiente del timing**. Contar la etiqueta es lo que de
verdad quiere decir "se ven las N miniaturas".

⚠️ **Otro test con fecha fija que envejeció**: `test_cargachk` usaba `'2026-08-05'` y
`textoCargaChk()` descarta los tildes de más de `CARGA_DIAS_GUARDA` (10) días — al pasar del
15/08 el test empezó a fallar solo. Ahora usa `todayStr()`. Se comprobó corriéndolo contra
`1fac1d7` (ya publicado) antes de tocar nada: fallaba igual.
👉 **Patrón que ya mordió tres veces (`test_conta`, `test_cargachk`): nada de fechas fijas en
los fixtures — siempre relativas a `todayStr()`.**

## 4ao. Corregir un pago ya anotado — fecha, monto, N° de recibo y método (2026-08-12)
Reporte: *"cargaron un pago que entró el sábado y se les puso como fecha de hoy, no pudieron
poner fecha de cuando era"*. El anticipo del formulario se escribe con `fecha:todayStr()` sin
campo para cambiarla, y una vez anotado **no había forma de moverlo**: el cuadre lo contaba el
día equivocado para siempre.

Al preguntar el usuario *"¿y si se equivocan en el monto o nro de recibo?"* se amplió a un
editor completo: hasta ahora `ctaAnotarMonto()` solo aparecía cuando el monto era 0, y el
N° de recibo y el método **no se podían tocar nunca**.

Botón **✏️ Corregir** en cada renglón de pago de la ficha (`contaPagosHtml`). Abre inline
**fecha** (`max=hoy`), **monto**, **N° de nota de venta** y **método** (+ banco si es QR).
Estado en `CTA_EDIT_I` / `CTA_EDIT_M` / `CTA_EDIT_B`, que se resetean al cambiar de venta
igual que `CTA_PAGO`.

⚠️ **Regla de negocio: corregir un monto NO mueve el total de la venta** — lo que cambia es
**cuánto falta cobrar**. Si la vendedora tipeó 2.000 y era 1.800, el cliente no compró por
menos: quedó debiendo 200. Por eso se le pasa el objetivo forzado a `aplicarCobros()`:
- cobro → `aplicarCobros(p, arr, objetivoCobro(p))` capturado **antes** de tocar nada;
- anticipo → `aplicarCobros(p, cobros, ventaTotal(p)−nuevoMonto)`, también con el total de
  antes, y actualizando `p.acuenta`;
- recargo → no toca el saldo, va por `aplicarEnvios()`.

`ctaGuardarPago(id,i)` cubre **los tres tipos de renglón**, que se reescriben distinto:
- **recargo** → `aplicarEnvios()` (solo su renglón, sin tocar el pago de la venta);
- **anticipo** → puede no estar en el ledger todavía (se deduce de `acuenta`); al ponerle
  fecha propia queda **materializado** con `~`, que es justo lo que hace falta;
- **cobro** → `aplicarCobros()` con el índice de `ctaIdxCobro()`.

⚠️ `ctaCobrosConFecha(p)` rellena con `contaFecha(p)` los cobros del formato viejo antes de
reescribir — misma trampa que en `aplicarMontos()` (§4an): reescribirlos sin fecha los
convierte en plata que no aparece en ningún filtro por día ni por mes.

Valida: fecha `YYYY-MM-DD` y **nada a futuro** (es plata que YA entró), **monto > 0**,
**N° de recibo obligatorio** y **banco si es QR**. Si algo falla **deja el editor abierto**
en vez de cerrarse perdiendo lo escrito. El **comprobante no se toca** desde acá.

### El flete PACTADO (lo que falta cobrar) — mismo día
*"falta que puedan editar el monto por cobrar de recargo por envío"*. El pactado **no está en
`contaPagos()`** (a propósito: no es plata que entró), así que no le llegaba el ✏️ Corregir.
Solo se podía poner al cargar el pedido: si el flete cambiaba —o se lo olvidaban— no había
arreglo, y a la vendedora le quedaba el aviso rojo con el monto viejo.

`envioResumenHtml(p, editable)` ahora dibuja su propio editor (`CTA_ENV_EDIT`), y la fila
🚚 en la ficha de Contabilidad **se muestra siempre**, incluso sin recargo, para poder poner
el que faltaba. `ctaGuardarEnvio()` reescribe **solo el renglón pactado**:
`arr = enviosDe(p).filter(envioYaCobrado)` + el nuevo pactado sin método → `aplicarEnvios()`.
Lo ya cobrado (con su recibo, fecha y comprobante) queda intacto, y **0 saca el recargo**
(`aplicarEnvios` filtra `monto>0`). No toca el saldo de la venta.

⚠️ **Bug de raíz encontrado de paso: `parseMonto()` saca el signo** (`replace(/[^\d.,]/g,'')`),
así que **"-50" se guardaba como 50** en silencio. Nuevo `montoNegativo(txt)` que mira el
texto crudo, aplicado en los tres campos donde el monto lo escribe una persona:
`ctaGuardarEnvio`, `ctaGuardarPago` y `ctaRegistrarPago`.
👉 **Regla: antes de `parseMonto()` sobre algo tipeado, pasar por `montoNegativo()`.**

- Test: `test_fleteedit.js` (25). Corregir el pactado, sacarlo con 0, que **lo ya cobrado no
  se pise**, ponerle uno a una venta que no tenía, que el **saldo de la venta no se mueva**,
  que el Cuadre lo liste como pendiente y **no** como plata que entró, y el rechazo del negativo.

- Test: `test_pagoedit.js` (43). Los cuatro tipos de renglón (cobro, anticipo suelto,
  recargo, formato viejo sin fecha); que el **cuadre pase la plata al día correcto** y que al
  cambiar Efectivo→QR **la pase de caja a bancos**; que corregir el monto **deje el total de
  la venta quieto** y ajuste el saldo (tanto en un cobro como en el adelanto); que no se
  pierdan recibo, foto ni monto; los rechazos; y que el editor no se arrastre a otra venta.

## 4ap. Los dos WhatsApp rotos (2026-08-19)
Reporte con capturas: *"no les sale el botón copiar whatsapp cuando cargan una venta de
tienda"* y *"el botón de los pagos registrados no distingue si es pago a cuenta o pago final,
en ambos genera pago por completo"*.

**1. La venta de tienda no mostraba el mensaje.** `after()` tenía
`if(_tienda){ showView('conta'); renderConta(); return; }` — el razonamiento era "no hay
camión al que avisarle", pero la vendedora igual tiene que pasar la venta al grupo. Ahora
muestra `showWhatsappModal(rec)` y al cerrarlo queda en Contabilidad, como antes.

**2. El encabezado del pago se decidía por la marca `~` del ledger**, no por la plata. Todo
lo que la vendedora anota al cargar la venta se guarda como anticipo, así que un pago que
cubría la venta entera salía `💰 *PAGO A CUENTA (ANTICIPO)*` y tres líneas abajo
`✅ Venta PAGADA por completo`: **el mensaje se contradecía solo**. Ahora manda
`contaFaltaCobrar(p)`: **PAGO COMPLETO DE LA VENTA** o **PAGO A CUENTA**, y lo de "es el
adelanto" pasó a ser una línea aparte que solo sale cuando de verdad queda saldo.
👉 **Regla: para decir si una venta está saldada, `contaFaltaCobrar(p)` — nunca la marca `~`
   ni `p.saldo` a secas.**

**3. De paso, `pedidoText()` salía roto** (se vio al fin, porque hasta ahora la venta de
tienda nunca llegaba a mostrarse):
- `📅 Entrega:` **vacío**, porque la venta de tienda no tiene fecha → ahora
  `🏪 Salió de tienda — se la llevó el cliente`, y se saltea la línea `📍` que repetía
  "SALIÓ DE TIENDA";
- la plata se pegaba con `p.metodoPago` **crudo**, que desde que guarda el historial completo
  salía `💰 PAGADO (~QR BISA 5690 @2026-08-19 #627 %IMG_A %IMG_B)` — ilegible y encima con
  los IDs de las fotos. Nuevo `plataLineaWa(p)`: `💰 PAGADO — QR BISA Bs 5.690,00` o
  `💰 POR COBRAR: Bs 1.300,00 · ya pagó Efectivo Bs 500,00`. Esto mejora **todos** los
  mensajes, no solo los de tienda.

- Test: `test_watienda.js` (21). Que al guardar una venta de tienda aparezca el mensaje con
  sus botones y detrás quede Contabilidad; que el texto no tenga la fecha vacía, ni la
  dirección repetida, ni el ledger crudo; que el pago completo diga COMPLETO y el adelanto
  con saldo diga A CUENTA; y que el recargo por entrega conserve su propio encabezado.

## 4aq. "No avisa si se cargó, guardó o ya está" (2026-08-19)
Reporte: *"aveces cargan una imagen y pago y no avisa se cargó, guardó o ya está, las chicas
no saben si deben dar x, cerrar o algo"*.

**El diagnóstico: todo se avisaba con `toast()`, que se va solo.** Si la vendedora miraba a
otro lado —o el celular tardaba— se perdía el único aviso y quedaba sin saber en qué estado
estaba. Nada de lo que había en pantalla se lo decía.

**1. Mientras sube la imagen** (va a Drive, tarda segundos): `COMP_SUBIENDO` cuenta las
subidas en curso y `compTiraHtml()` muestra **`⏳ Subiendo la imagen… esperá un momento`**
(con parpadeo suave, apagado si el sistema pide menos movimiento) **en lugar del botón**, así
tampoco lo tocan dos veces. Se repinta al ARRANCAR la subida, no solo al terminar.
⚠️ El contador se baja en **los tres caminos**: éxito, respuesta con error y `catch` — si no,
quedaba colgado en "Subiendo…" para siempre.

**2. Cuando terminó**: `.comp-ok` — **`✅ 1 imagen guardada — ya quedó con este pago`**, que
**no desaparece**. La miniatura sola no alcanzaba: podía ser la que estaban por subir.

**3. Al registrar el pago**: la ventana arrancaba con *"Copialo y pegalo en el grupo"* — se
leía como una **tarea pendiente**. Ahora lo primero es un recuadro verde con
**"✅ Listo — el pago ya quedó guardado"**, lo que quedó anotado (método, monto, recibo,
cuántas imágenes), **cómo quedó la venta** (pagada o cuánto falta) y *"No tenés que hacer nada
más"*. El mensaje de WhatsApp pasó a estar rotulado **Opcional**, y abajo hay un botón verde
ancho **"✅ Listo, volver a la venta"** — antes la única salida clara era la ✕.

- Test: `test_avisos.js` (20). Usa un `apiFoto` **lento a propósito** para mirar la pantalla
  *en el medio* de la subida, que es justo el momento que se reportó. Verifica el aviso de
  subiendo, que no se pueda tocar el botón otra vez, el texto que queda, el plural con dos
  imágenes, que la confirmación aparezca **antes** que el bloque de WhatsApp, el botón de
  salida, y que **si la subida falla no quede colgado** en "Subiendo…".
- Suites actualizadas por los cambios de texto: `test_tienda` (ahora espera el modal) y
  `test_wapago` (encabezado por lo que falta cobrar, botón "Listo, volver a la venta").

### Reenviar la venta desde la ficha de Contabilidad (mismo día)
*"el boton whatsap no sale en las ventas de tienda, solo sale al ingresar la venta, pero no
en el panel flotante cuando ves la venta por si quieren reenviar la información"*.

Relevamiento: `showMisModal`, `showCargaModal` y `showPedidoModal` **ya tenían** `copyPedido`.
**`showContaModal` era la única sin nada** — y es justo donde cae la venta de tienda, así que
el mensaje se veía una sola vez, al guardarla.

Botón **📲 Reenviar la venta** en las acciones de la ficha → `ctaWhatsappVenta(id)`.
`showWhatsappModal(rec, volverA, reenvio)` ganó dos parámetros: sin `volverA` cierra como
siempre (el caso "recién guardado"), y con él **vuelve a la ficha** en vez de dejar a la
vendedora en el aire — tanto por el botón como por la ✕.

- Test: `test_reenviar.js` (17). Que el botón esté, que abra el mensaje de la VENTA (no el de
  un pago), que copie y abra WhatsApp, que **la ✕ y "Volver a la venta" reabran la ficha**,
  que sirva también para una venta normal, y que el flujo de **recién guardado siga cerrando**
  como antes.

## 4ar. La planilla de MAYORISTAS — Eduardo Añez, aparte de las vendedoras (2026-08-21)
Pedido: *"en contabilidad eduardo añez tiene y debe tener una planilla aparte de sus pedidos y
ventas, ya que él vende a mayoristas y necesita control de sus ventas y pedidos, pero es el
jefe comercial (o sea soy yo) para que lleve control y seguimiento para cobrar. y registrar
pagos"* + *"separado de los vendedores"*.

**El problema.** Eduardo estaba en `CONTA_EXCLUIR` desde el principio (§4 original): quedaba
fuera de Contabilidad **y de todo**. La razón original sigue siendo válida —sus ventas no
llevan nota de venta ni NIT ni "facturar a", mezcladas le inflaban los totales al equipo— pero
el efecto colateral era que **él no tenía dónde ver lo suyo**. Vende a mayoristas y necesita
saber a quién le falta cobrar.

**La decisión: NO reactivarlo en la planilla del equipo, sino darle la suya.** Contabilidad
pasó de dos sub-pestañas a **tres**: `📋 Ventas` · `🏭 Mayoristas` · `🧮 Cuadre y conciliación`.

**Cómo, sin duplicar nada.** `mayor` **comparte el `#cta-pane-ventas`** con `ventas`: la misma
tabla, la misma ficha con registro de pagos, el mismo corrector de precios/montos, el mismo
recargo por entrega, el mismo Excel. Lo único que cambia es **a quién deja pasar el filtro**.

```js
var CONTA_MAYORISTAS=['Eduardo Añez'];          // sumar a alguien más = una línea acá
function esMayorista(p){ /* mismoVendedor contra la lista */ }
function contaAmbito(){ return contaTab()==='mayor' ? 'mayor' : 'tienda'; }
function fueraDeConta(p, ambito){               // ⚠️ `ambito` es OPCIONAL a propósito
  if(!p || esATC(p.oc)) return true;            // las ATC siguen fuera de las DOS
  if(ambito==='mayor') return !esMayorista(p);
  return contaExcluido(p.vendedor);             // 'tienda' (por defecto) = lo de siempre
}
```
**El parámetro opcional es el truco del cambio.** Los **cuatro** puntos del Cuadre
(`cuadrePagos`, `cuadrePendientes`, `cuadreFletesPend`, `cuadreAlertas`) llaman
`fueraDeConta(p)` **sin ámbito** y por lo tanto **no se tocaron ni una letra**: el cuadre sigue
siendo la caja del equipo de tienda, que es lo correcto (arquear caja y conciliar banco es de
la tienda; el seguimiento de mayoristas es otra cosa). El **único** que pasa ámbito es
`contaLista()`.

**Los detalles que se rompían si no se cuidaban:**
- **El desplegable de vendedor.** `llenarUnSelectVendedor` filtra con `contaExcluido`, así que
  Eduardo **nunca** aparece ahí. Si se quedaba con una vendedora elegida, en Mayoristas
  filtraba a cero y parecía que no había ventas. `pintarAmbitoConta(true)` lo **esconde y lo
  limpia**, y `contaLista()` además ignora `vend` cuando el ámbito es `mayor` (cinturón y
  tiradores).
- **Saltar a una ficha.** `cobrarFlete()` y el post-guardado de la venta de tienda hacían
  `setContaTab('ventas')` a mano: con una venta de Eduardo la ficha abría bien pero **la tabla
  de atrás quedaba vacía**. Nuevos `contaTabDe(p)` / `irAContaDe(p)` mandan a la planilla que
  corresponde.
- **Las tarjetas y el resumen.** `vSel` en Mayoristas se toma del ámbito, no del `<select>`:
  dicen *"de Eduardo Añez"* en vez de *"de todo el equipo"*, y el cartel de vacío lo nombra.
- **El Excel** baja como `mayoristas-….xlsx` con la hoja `Mayoristas`, para que no se pise en
  la carpeta de descargas con el del contador.
- Un **cartel azul** arriba de las tarjetas dice qué planilla se está mirando: las dos se ven
  idénticas y sin él no se distinguen.

**ROHO se dejó fuera de las tres** — el pedido era por Eduardo. Sumarlo es agregarlo a
`CONTA_MAYORISTAS`, pero conviene preguntar antes: son negocios distintos y mezclarlos
repetiría el problema que este cambio resuelve.

- Test: `test_mayorista.js` (37). Que las dos planillas **no se pisen** en ninguna dirección,
  que las ATC y ROHO queden fuera de ambas, que el **Cuadre no se haya movido**, que las
  tarjetas sumen solo lo suyo, que el filtro de vendedora colgado no la vacíe, que se pueda
  **registrar un pago** desde la ficha de un mayorista y que quede guardado en la planilla
  compartida, y que `irAContaDe` reparta bien.
- `test_cuadre.js` actualizado: afirmaba `tabs.length===2`; ahora son tres y el Cuadre es la
  última.

## 4as. "DEBE Bs 0,00" — la venta sin monto salía disfrazada de saldada (2026-08-21)
Salió de una consulta lateral: el usuario intentaba pasar una venta de PAGADO a POR COBRAR
y creía que el panel no lo dejaba. **Sí dejaba** (`dbg_pagado.js` lo probó: poner el saldo
deja `pagado=false`), pero al reproducirlo apareció otra cosa: la venta con
`pagado=false, saldo=0, acuenta=0` y sin ledger se pintaba **"DEBE Bs 0,00"**.

**Por qué importa.** Eso se lee como *"no debe nada"*. Es exactamente al revés: **nadie le
anotó el monto**. La venta que hay que ir a completar quedaba disfrazada de venta saldada,
y —peor— el **chofer** la veía como un `Sin saldo` **gris** y la hoja de ruta le decía
`💰 COBRAR Bs 0,00`. Entregaba, volvía sin la plata, y nadie se enteraba.

Regla que fijó el usuario: *"si hay saldo debe decir cuánto se debe"*. O sea, el cero no es
una respuesta — o hay monto, o falta anotarlo.

```js
function sinMontoAnotado(p){          // ni pagada, ni adelanto, ni saldo, ni ledger
  if(!p || p.pagado) return false;
  if((Number(p.saldo)||0)>0.01) return false;
  if((Number(p.acuenta)||0)>0.01) return false;
  return totalCobrado(p)<=0.01;
}
function badgeSinMonto(){ return '<span class="badge b-amber">⚠️ SIN MONTO ANOTADO</span>'; }
/* Las TRES cosas distintas que se le pueden decir al chofer. Nunca "COBRAR Bs 0,00". */
function cobroRutaTxt(p){ /* ✅ PAGADO · ⚠️ SIN MONTO ANOTADO · ✅ NADA QUE COBRAR · 💰 COBRAR X */ }
```
**Ámbar, no rojo**: no es una deuda, es un dato que falta. El rojo se reserva para la plata
que de verdad hay que salir a cobrar.

**Los seis lugares que mentían** (todos con el mismo cero):
1. `contaPagoHtml` — la tabla de Contabilidad.
2. `contaPagoTxt` — el Excel y el copiar.
3. `showPedidoModal` — la ficha de Administración.
4. `showMisModal` — la ficha de Mis pedidos (la que ve la vendedora).
5. `entregaCardHtml` — el panel 🚚 Entregado.
6. `cobroChoferHtml` + `renderRuta` + el WhatsApp de la ruta — **el que costaba plata**.

De paso quedaron sin poder salir **dos ceros más**:
- el renglón `debe Bs 0,00` abajo de un "A cuenta" (ahora `debeLinea()` solo lo pinta si el
  saldo es > 0.01), y
- la venta con la plata en el ledger pero sin la marca de pagada, que decía DEBE Bs 0,00 y
  ahora dice **`COBRADO Bs X · falta marcarla como pagada`**.

**El cuadre las lista.** `cuadreAlertas` ya tenía el aviso 💸 de *"venta marcada PAGADA sin
anotar el monto"*, pero esa recorre `contaPagos(p)` y **estas ventas no tienen ningún pago**:
eran mudas. Nuevo bucket `sinNada` (❓) con la misma mecánica de tocar el nombre y abrir la
venta. Sin esto el panel marcaba el problema pero nadie se enteraba.

- Test: `test_sinmonto.js` (28). Los seis lugares, más que **una venta CON saldo siga
  diciendo cuánto** (que es la mitad de la regla que se pidió), el adelanto con y sin saldo,
  la pagada, la del ledger, y que el cuadre las liste.
- `test_sinsaldo.js` actualizado: afirmaba `dice "Sin saldo"` para el chofer — codificaba
  justo el comportamiento que este cambio corrige.

⚠️ **`test_chofer.js` está muerto desde antes de este cambio**: llama a `choPedirMetodo`, que
ya no existe (verificado contra `origin/main`). No imprime ningún `✗`, así que `_run1.sh` lo
da por "ok (sin resumen)" y pasa desapercibido. **Pendiente de arreglar.**

## 4at. AUDITORÍA del primer mes — la línea de base bajó a CERO (2026-08-21)
Pedido: *"abre un loop para buscar errores, discrepancias, mejoras… como vamos a 1 mes de
funcionamiento, y audita todo"*.

### Lo que se auditó y dio limpio
- **Botones muertos** (`audit_refs.js`): se cruzaron todas las funciones invocadas desde un
  `onclick/oninput/onchange` —incluidas las que el JS arma concatenando cadenas— contra las
  declaradas. **Ninguna falta.** Es la clase de bug de §4ac (botón mudo) y no hay ninguno vivo.
- **Integridad entre computadoras** (`audit_campos2.js`): se cruzó todo lo que el panel
  escribe en un pedido contra las **29 columnas de `recToRow`**. El único huérfano sigue
  siendo **`cobradoBs`**, ya identificado y ya tapado (todo lee `totalCobrado()`). `precio`
  aparece como falso positivo: es de un PRODUCTO y viaja dentro de `_productos_json`.

### 🔴 Bug encontrado y corregido: el Excel del contador
Se había dicho que el arreglo de §4as llegaba al Excel y **era falso**. El export nunca pasó
por `contaPagoTxt` —**esa función está MUERTA, nadie la llama**— y la columna PAGADO se
armaba con `p.pagado?'SÍ':'NO'`. La venta sin monto caía en el "NO" con saldo 0 y cobrado 0:
para el contador, *"no debe nada"*. Ahora la columna tiene **tres valores: SÍ / NO / SIN
MONTO**, corta y filtrable como la usa él.

### 🔴 Bug encontrado: las medidas escritas con × se marcaban como "especiales"
`esMedidaConocida()` comparaba **literal** contra `MEDIDAS`. Una medida perfectamente normal
escrita `160×190` (signo de multiplicación, que es como la arma la columna de texto de la
planilla) o `160X190` (X mayúscula) **no coincidía** → el pedido se pintaba de celeste, caía
en el filtro 🔵 Especiales y confundía a producción. Nuevo `normMedida()` (minúsculas,
`×✕✖ → x`, sin espacios) aplicado en `esMedidaConocida()` y en `has50x70()`.

### La deuda real: 27 afirmaciones falladas que veníamos arrastrando como "línea de base"
Se triaron **una por una**. **Ninguna era un bug**: las 13 suites describían versiones
anteriores del panel. Lo que cambió de verdad:

| Suite | Por qué fallaba |
|---|---|
| `misfiltro` (6) · `agrupa` (3) · parte de `gris` | **Mis pedidos dejó de ser una TABLA y pasó a TARJETAS** (`#mis-lista .cho-card`) y los chips pasaron de 3 a 6 |
| `im` (4) | El botón se acortó a `📥 IM`; el badge dice `Recoger de IM`; y el valor viejo `chk:'prod'` **cambió de significado** (era "recoger de IM", ahora es "en producción") — la migración está bien hecha en `enProduccion()` |
| `prod` (5) | El botón 🏭 ahora **pregunta a qué fábrica** (MORENO/MULTI): 2 por producto, no 1 |
| `turno` (2) | Reprogramar pasó de un `prompt()` a un **modal con validaciones** (día cerrado, cupo lleno, sábado PM, fecha pasada) |
| `motivo` (2) | `REV_MOTIVO` ya no tiene el valor `'permiso'`: es `'ninguno'` + un texto **con el paso a paso** para dar el permiso |
| `cargaficha` (2) · `revision` (1) | La fila ya no se titula "Revisión de productos": los botones ✔/✗/IM/🏭 van dentro de "Productos". Y borrar pasa por `eliminarDesdeCarga` |
| `faltantes` (2) | `⛔ NO HAY:` pasó a `⛔ NO HAY` pegado al producto |
| `fichaprod` (1) | 3 botones por producto → 5 |
| `misficha` (1) | La fila **Stock se muestra siempre** y dice el estado (⬜ Sin revisar / 🟢 En stock) en vez de desaparecer |
| `gris` (1) | El test truncaba el texto de la fila a **40 caracteres** y el cliente quedaba cortado |

### ⚠️ `test_chofer` estaba MUERTO
Llamaba a `choPedirMetodo`, borrada hace tiempo. **No imprimía ningún `✗`**, así que
`_run1.sh` —que cuenta `✗`— lo daba por "ok (sin resumen)": **la pantalla donde se cobra la
plata estaba sin red desde hacía semanas.** Reescrito al flujo actual (los tres botones van
EN LA TARJETA y cada uno pregunta el monto). Ahora corre entero: 15/15, y confirma el
circuito completo — cobra, guarda el método, el admin ve `PAGADO · QR` y entra en la rendición.

### Carreras de tiempo en los tests
`test_turno` capturaba **el último** toast y a veces se le colaba un
`"Sin conexión: mostrando copia local"`. Se cambió a juntar **todos** los avisos. Mismo
patrón aplicado a la sección del cupo lleno.

> **📌 LA LÍNEA DE BASE AHORA ES CERO.** 120 suites, **0 fallas**. La lista de "fallas
> conocidas" que se venía arrastrando **ya no existe**: si algo falla, es una regresión de
> verdad. No volver a normalizar fallas sin triarlas.
> Único flake que queda: **`test_cerrardia`** falla ~1 de cada 5 corridas (probablemente la
> misma carrera de toasts). **Pendiente de hacer robusto.**

## 4au. Auditoría, pasada 3: la plata no cuadraba entre vistas — y se perdió la batería (2026-08-21)

### 🔴 Contabilidad y el Cuadre daban DISTINTO sobre las mismas ventas
El control nuevo `tests/test_plata.js` arma un juego de ventas difíciles a propósito y cruza
los cuatro totales por sus dos caminos. Encontró **Bs 200 de diferencia**: Contabilidad decía
que habían entrado Bs 6.920 y el Cuadre Bs 7.120.

La diferencia era **exactamente un cobro de más** (el cliente pagó 1.200 sobre una venta de
1.000). El motivo:
```js
function contaCobrado(p){ return r2(ventaTotal(p) - contaFaltaCobrar(p)); }   // ❌ TOPEA
```
"Total de la venta menos lo que falta" **nunca puede pasar del total**, así que el excedente
desaparecía de la tarjeta "Ya ingresó". El **Cuadre tenía razón**: en la caja están los 1.200.
Ahora:
```js
function contaCobrado(p){ var a=anticipoDe(p); return r2(totalCobrado(p)+(a?(Number(a.monto)||0):0)); }
```
La tarjeta "Ya ingresó" avisa en ámbar *"⚠️ Bs 200 de MÁS en 1 venta — revisalas"* en lugar
de un "120% de lo vendido" ilegible.

**La identidad correcta** (la que verifica el test) lleva el exceso restado:
`vendido = entró + falta − exceso`. Sin ese término la cuenta no cierra nunca.

Los otros tres cruces ya daban bien: **falta cobrar**, **flete pendiente** y **quiénes entran**
(la ATC, ROHO y el mayorista quedan fuera de las dos vistas; la venta de tienda y la venta sin
monto sí entran).

### 💀 SE PERDIÓ LA BATERÍA DE TESTS — ~117 suites
A mitad de esta pasada **el directorio temporal de la sesión se vació solo**. Las ~120 suites
vivían **únicamente** en `/tmp/.../scratchpad/` y **nunca se habían commiteado**. No había
copia en el repo ni en ningún otro lado del disco.

Del historial de la conversación solo se pudieron rescatar **2** (los que se habían escrito
enteros con `Write`; los que solo se editaron con `Edit` no tienen copia completa).

**Sobrevivieron / se rehicieron:** `test_plata.js` (nuevo, 11), `test_mayorista.js` (37),
`test_sinmonto.js` (32) — a los dos rescatados hubo que **reaplicarles a mano** las
correcciones de esta misma sesión, porque el rescate trae la versión original.

> **📌 REGLA NUEVA, INNEGOCIABLE: los tests van en `tests/`, dentro del repo, y se commitean
> en el MISMO commit que el cambio que prueban.** Un test que no está en el repo es un test
> que todavía no existe. Ver `tests/LEEME.md`.

**Pendiente grande:** rehacer las suites perdidas. Las prioritarias, por orden:
`conta` · `cuadre` · `chofer` · `cobros` · `porcobrar` · `contador` · `excel` · `atc` ·
`precios` · `pagoedit` · `fleteedit` · `duplicados` · `borrarventa` · `imgotra` ·
`compperdido` · `watienda` · `avisos` · `reenviar` · `onclicks` · `carga` · `ruta` · `mapa`.

## 4av. Las 25 OC repetidas de agosto — no era una carrera de un segundo (2026-08-21)
Reporte del dueño, con la razón de su lado: *"no entiendo la alerta de OC repetidas, si eres
el sistema que automáticamente designa las OC"*. El aviso listaba **25 números duplicados**
(08-001, 08-002, 08-010, 08-011, 08-014, 08-022, 08-042…).

**El correlativo no estaba mal. Estaba mal CUÁNDO se calculaba.**

`nextOcMes()` saca el máximo del mes y le suma 1, pero lee **`STATE`: la planilla que ESA
computadora tiene en memoria**, que es de la última vez que se miró. El comentario viejo decía
*"si dos cargaron en el mismo instante puede repetirse — es MUY poco probable"*. **No era eso.**
La ventana real no era de un segundo: era de **horas**. Una vendedora con la pestaña abierta
toda la mañana calculaba `max+1` sobre el panel de las 8 AM y se llevaba un número que otra ya
había usado a las 10. Con 4–5 vendedoras cargando todo el día, 25 choques en un mes salen solos.

**Lo irónico:** el arreglo ya estaba medio hecho. Había una *"ÚLTIMA MIRADA A LA PLANILLA ANTES
DE GUARDAR"* (`conTope(refrescarEstado(), 4000)`) para detectar el día cerrado… pero corría
**DESPUÉS** de que la OC ya se había asignado, unas líneas más arriba. Se bajaba la planilla
fresca y no se la usaba para numerar.

```js
var _ocAuto = !isEdit && !esRoho(vendedor) && !ocSel && ocAutoActivo();
if(_ocAuto) ocSel=nextOcMes(null, docTipoSel());        // provisorio
...
conTope(refrescarEstado(), 4000).then(function(){
  if(_ocAuto) rec.oc = nextOcMes(null, docTipoSel());   // ⬅️ DEFINITIVO, con la planilla al día
  guardarYa();
});
```
La ventana pasa de horas al viaje de ida y vuelta (~1 s). Si la red no contesta en 4 segundos
**se guarda igual** con el provisorio: mejor una OC a corregir que una vendedora trabada — y
para eso está el aviso de repetidas.

También se extendió la bajada a la **venta de tienda**, que antes la salteaba (`!_tienda`)
porque no tiene día que se cierre… pero **sí toma número de OC**. Se llevaba el duplicado igual.

**Sobre reiniciar cada mes:** se revisó y **se deja como está**. El número ya lleva el mes
adentro (`08-047`), así que es único aunque el contador vuelva a 1; y el contador lee "el 47 de
agosto" de un vistazo. Numerar de corrido hasta el infinito no agregaría nada y perdería eso.

- Test: `tests/test_ocrepe.js` (7). Reproduce **el caso real**: una computadora que ve 3 de 8
  pedidos y aun así toma el 009. **Verificado contra la versión publicada**: ahí da 08-004
  duplicado, y la venta de tienda también. Cubre además que sin internet no trabe.

## 4aw. La pantalla se actualiza sola (2026-08-21)
Pedido, y es la **causa de raíz** de §4av: *"tb debemos hacer algo con las que dejan su panel
todo el día y no actualizan, para hacer que se actualice automático"*.

**Lo que había:** `refrescarSiHaceRato()` y nada más — solo corría al ENTRAR al formulario, y
con un piso de 1 minuto. Quien dejaba el panel abierto en cualquier otra vista veía la
planilla de cuando lo abrió, para siempre. De ahí salieron las 25 OC repetidas.

**Lo nuevo** (`§ACTUALIZACIÓN AUTOMÁTICA`): un reloj cada **2 minutos** + refresco **inmediato
al volver a la pestaña** (`visibilitychange`), que es el momento que de verdad importa.

**Lo delicado no es refrescar: es NO PISAR a nadie.** `autoOcupado()` devuelve el motivo y el
tic se saltea si hay:
ficha abierta · pantalla completa (mapa, ruta, carga, faltantes, entregas, retiros, prods,
reporte, parte, envío, visor) · imagen subiendo (`COMP_SUBIENDO`) · pedido guardándose
(`#f-submit.disabled`). Se reintenta al tic siguiente; no se pierde nada.

- **El formulario SÍ se refresca** — es donde más falta hace (cupos, día cerrado, N° de OC) —
  y `autoRepintar()` solo llama a `renderCupoForm()`/`pintarBotonCierre()`, que **no tocan los
  campos**. Verificado en el test con el formulario a medio llenar.
- **Devuelve el scroll donde estaba**: que la lista salte sola mientras uno la lee es peor que
  tenerla desactualizada.
- **`document.hidden` ⇒ no se consulta nada.** Un celular en el bolsillo no necesita datos, y
  así no se quema cuota de Apps Script con 6 pestañas abiertas todo el día.
- **Sello en el pie** (`autoSelloHtml`): *"actualizado recién / hace 3 min"*, y en **ámbar**
  pasados los 10 minutos. Sin esto no hay forma de saber si lo que se ve es de ahora — que era
  exactamente la trampa.

- Test: `tests/test_autoref.js` (15). Los cuatro motivos de "ocupado" uno por uno, que la ficha
  quede abierta y sin moverse, que el formulario se actualice **sin borrar lo escrito**, que
  con la pestaña de fondo **no se consulte** y sí al volver, y el sello del pie.

## 4ax. Reconstrucción de la batería, tanda 1 (2026-08-21)
Después de la pérdida de §4au, se empieza a rehacer. **No se re-transcriben los tests viejos:
se escriben los que más rinden**, y priorizando los que cuidan la plata.

| Suite | Qué cuida |
|---|---|
| `test_onclicks` (5) | **Botones muertos.** Cruza las 178 funciones invocadas desde un `onclick` contra las que existen —preguntándole al NAVEGADOR, que es la única prueba que vale—. Más: que los `onclick` con `JSON.stringify` estén escapados (las comillas dobles cortan el atributo y dejan el botón mudo, §4ac), que cada `<div class="seg">` tenga su `initSeg`, y que los `id` fijos que busca el código existan |
| `test_humo` (40) | **Recorre TODO** con un pedido de cada forma conviviendo (ATC, ROHO, mayorista, tienda, con flete, sin ubicación, cobrada de más, duplicada, entregada con fotos, en producción): las 5 vistas, las 3 sub-pestañas de Contabilidad con períodos y cortes, las 8 pantallas completas **paseándose por sus filtros de día**, las 4 fichas contra los 9 tipos, los 4 Excel y los 6 textos de WhatsApp. Cuenta errores JS de punta a punta |
| `test_cuadre` (24) | Lo que **define** la pantalla: corta por la fecha del **PAGO**, no de la venta. Una venta del mes pasado cobrada hoy entra hoy; el pago sin fecha no cae en ningún día pero sí en "Todo"; las formas se separan por banco; el flete pactado no cuenta como ingreso; el filtro por vendedora recorta todo; los cuatro avisos |
| `test_chofer` (18) | **Donde se cobra la plata en la puerta.** Ve lo suyo y nada más, los avisos que le evitan un viaje al pedo, entregar y deshacer, los tres botones de cobro EN LA TARJETA, cobrar de más marcado, quitar un cobro mal puesto, y que lo cobrado llegue a Administración y a la rendición |

**Detalle del `test_humo` que vale anotar:** la primera versión abría cada pantalla y miraba
"Hoy", que con esos datos está casi vacío — la Lista de carga daba **132 caracteres** contra
los 1.382 de la Hoja de ruta. Un test que no toca la pantalla llena no sirve para saber si la
pantalla llena anda. Ahora se pasea por Hoy / Mañana / Todos (1.428 → 1.953 caracteres).

**Estado: 9 suites · 189 comprobaciones · 0 fallas.** Recorrido completo del panel: **0 errores JS.**

Faltan por rehacer: `conta` · `cobros` · `porcobrar` · `contador` · `excel` · `atc` ·
`precios` · `pagoedit` · `fleteedit` · `duplicados` · `borrarventa` · `imgotra` ·
`compperdido` · `watienda` · `avisos` · `reenviar` · `carga` · `mapa`.

## 4ay. El pedido sin señal se quedaba esperando a que alguien se diera cuenta (2026-08-21)
Encontrado auditando la cola offline, justo después de meter la actualización automática
(§4aw). La primera pregunta era defensiva —*¿el refresco cada 2 minutos no pisará un pedido
sin enviar?*— y la respuesta es **no**: `mergePending()` lo protege y el test lo verifica.
Pero al escribir la prueba apareció otra cosa peor.

**`flushPending()` solo corría en cuatro momentos:** al cargar la página, después de guardar
OTRO pedido con éxito, al entrar a Administración (`loadFromServer`), y si alguien veía el
*"N sin enviar"* del pie y tocaba **reintentar**. **No había ningún reintento al volver la
señal.** Una vendedora que se quedaba sin datos, cargaba el pedido y recuperaba señal podía
tenerlo en la cola **horas**, sin enterarse — y el resto del equipo sin verlo.

Ahora el tic de la actualización automática **manda primero y refresca después**, y —esto es
lo importante— **el envío NO espera a que la pantalla esté quieta**:
```js
return flushPending().then(function(){
  if(autoOcupado()) { updateFooter(); return false; }   // el REPINTADO sí espera
  return refrescarEstado().then(...);                    // el ENVÍO no
});
```
Mandar no mueve nada en pantalla; un pedido sin enviar es urgente. Se sumó además un
`window.addEventListener('online', …)` para no esperar los 2 minutos cuando el navegador ya
sabe que volvió la conexión.

- Test: `tests/test_cola.js` (11). **Verificado contra la versión publicada: 4 fallas.** Cubre
  que con señal se mande derecho, que sin señal no se pierda y se avise, que el refresco
  **no lo pise**, que el tic lo mande solo, que lo mande **aun con la pantalla ocupada** sin
  moverla, y que si la señal no vuelve el pedido siga esperando en vez de descartarse.
  ⚠️ Ojo al escribirlo: cambiar a la vista de Administración **ya dispara un envío por su
  cuenta**, así que el caso de "pantalla ocupada" cambia de vista ANTES de encolar — si no,
  el test pasaba por el motivo equivocado.

## 4az. 🔴 "Cerré el día y me metieron 2 pedidos igual" (2026-08-21)
Reporte del dueño, y tenía toda la razón: *"hace 40 min usé el botón cerrar día… y sin
embargo los vendedores lograron meter 2 pedidos más. Se supone que al cerrar día no deja a
nadie, de otra PC ni celular. ¿Se quita solo el seguro, o los demás no lo ven?"*

### Cerrar un día tiene DOS trancas, y hay que tener clara la diferencia
1. **El panel** no deja elegir esa fecha — pero cada computadora tiene que **enterarse**.
   Una pestaña abierta desde antes del cierre no se entera sola (§4aw).
2. **El servidor** (`doSave` → `diaCerradoGs`) rechaza el pedido aunque el panel lo mande.
   **Es la única que no se puede saltear.** Y solo existe si lo **PUBLICADO** en Google es la
   versión al día: en Apps Script *guardar el código no publica nada*.

Hay además una **tercera rendija, deliberada**: la "última mirada a la planilla" antes de
guardar tiene un **tope de 4 segundos**. Con un mes de datos, `apiList` tarda de sobra más
que eso; cuando vence, el panel **guarda igual** para no trabar a la vendedora. Ahí la única
defensa que queda es la tranca 2.

### 🔴 El agujero propio del panel
```js
if(res && res.ok){ ...éxito... }
else { queuePending(rec); toast('Guardado. Se sincronizará en breve.','ok'); }   // ❌
```
`dia_cerrado` y `cupos_llenos` tenían su rama y estaban bien resueltos. **Todo lo demás**
—`busy` (el lock de 30 s del Apps Script vencido), `bad json`, `no id`, `not found`— caía en
ese `else`: se **encolaba** y se mostraba **"Guardado ✓" EN VERDE**. O sea: el servidor
rechazaba el pedido y **la vendedora se iba convencida de que había entrado**, le pasaba la
venta al grupo, y el pedido quedaba de zombi reintentándose contra un servidor que nunca lo
iba a aceptar.

**Arreglado:** un `ok:false` del servidor **revierte** (sale de `STATE`), **no se encola** y
avisa en rojo. La cola es para cuando **no hay red** (el `catch`), no para un "no".

### El botón ahora dice si el candado es de verdad
`cierreCandadoHtml()`, arriba de todo en la ventana de Cerrar día, con los cuatro estados:
- ✅ **verde** — lo publicado coincide: *"el candado está en el servidor, no se puede saltear"*
- 🚨 **rojo** — versión vieja publicada: *"el candado está SOLO en los navegadores"* + el paso
  a paso de **Implementar → Nueva versión** (y la aclaración de que guardar el código no alcanza)
- ⏳ **ámbar** — todavía no se preguntó (y se pregunta solo al abrir la ventana)
- 📴 **gris** — sin conexión

Esto estaba escondido en la pantalla de revisar ubicaciones. Va **en el botón mismo**: es el
único lugar donde importa, porque cerrar un día sin la tranca 2 da una seguridad que no existe.

- Test: `tests/test_cerrardia.js` (15). Reproduce **el caso exacto**: una compu que no se
  enteró del cierre **y** la planilla que no contesta (o sea, la mirada previa ciega) — y
  verifica que el servidor igual la frene, que la vendedora vea "CERRADO" y no "guardado",
  que no quede fantasma ni encolada, y que esa compu **aprenda** que el día está cerrado.
  Cubre también el rechazo `busy` y los cuatro estados del candado.

> **📌 CONFIRMADO (22/08/2026):** era eso. El usuario republicó el Apps Script
> (Implementar → **Nueva versión**) y el cartel pasó a **verde**: *"el candado está en el
> servidor"*. O sea que hasta ese momento **lo publicado era código viejo sin el portero**, y
> el candado existía únicamente en los navegadores — exactamente lo que dejaba pasar los
> pedidos de una pestaña abierta desde antes del cierre.
>
> Para poder confirmarlo hubo que **subir el sello de versión** (`2026-07-27-c` →
> `2026-08-21-a`) en el `.gs` **y** en `SCRIPT_VERSION_ESPERADA` del panel: republicando con
> el mismo sello, el cartel se ve igual antes y después y no se puede distinguir "lo
> publicaron" de "ya estaba".
>
> ⚠️ **Regla para adelante: cada vez que se toque `google-apps-script.gs`, subir el sello en
> los DOS archivos.** Si no, no hay manera de saber si lo publicado es lo que se escribió.

## 4ba. 🔴 El cierre se caía solo: la carrera con el guardado (2026-08-22)
Segundo reporte, después de publicar el Apps Script: *"no, no está cerrado de verdad;
actualizo la página en mi misma computadora y sale"*.

**Primero se descartó el servidor.** Se corrió el `.gs` DE VERDAD contra una planilla
simulada (`/tmp/rt.js`): guarda la fila, la devuelve, el portero frena el día cerrado, deja
pasar los demás y agrega un segundo día sin pisar el primero. **El servidor está impecable.**

**El bug estaba en el panel, y era una carrera.** Cerrar un día son dos cosas:
1. anotarlo en `DIAS_CERRADOS` (instantáneo, se ve en pantalla), y
2. mandar la fila al servidor — **que tarda segundos** con la hoja cargada.

Cualquier `apiList` que cayera **en el medio** traía la fila vieja, y `leerCierresDeLista`
**pisaba `DIAS_CERRADOS`**: el día volvía a verse abierto. Reproducido con
`/tmp/carrera.js`:
```
al instante de cerrar        → en pantalla: true   · en el servidor: ""
tras un refresco en el medio → en pantalla: FALSE  · en el servidor: ""     ← ⬅️ se cayó
```
**Y lo empeoró la actualización automática de §4aw**: antes esa ventana casi no se pisaba
porque no había refrescos solos; ahora hay uno cada 2 minutos y al volver a la pestaña. De
ahí que el usuario lo viera enseguida.

Peor todavía: con el día viéndose abierto otra vez, administración **lo vuelve a cerrar**, y
ese segundo `guardarCierres()` escribe `filaCierre(DIAS_CERRADOS)` — con la lista ya
pisada—, **borrando cierres buenos en el servidor**.

**El arreglo — `CIERRES_PEND`:** lo que esta computadora mandó y el servidor todavía no
confirmó. Mientras esté puesto, **gana sobre lo que traiga la planilla**:
```js
if(CIERRES_PEND){
  if(delServidor.join(' ')===CIERRES_PEND.slice().sort().join(' ')) CIERRES_PEND=null;  // ya llegó
  else delServidor=CIERRES_PEND.slice().sort();                                          // todavía no
}
```
Se suelta solo cuando el servidor devuelve exactamente lo que se mandó — así se cura solo y
no hace falta acertarle al momento. Si el guardado falla, va a la cola y `CIERRES_PEND`
**sigue mandando** hasta que la cola lo logre.

La ventana además avisa **⏳ "Guardando el cambio en la planilla… todavía no está firme para
las demás computadoras"**: antes se veía "cerrado" y no había forma de saber si las otras ya
se habían enterado.

- Test: `tests/test_cerrardia.js` pasó de 15 a **19**. El bloque nuevo simula la hoja lenta
  (1,2 s) y mete un `refrescarEstado()` en el medio. **Verificado contra la versión
  publicada: 3 fallas.**
- ⚠️ Al escribirlo, el bloque nuevo quedó insertado **entre el `evaluate` del bloque 6 y sus
  `chk`**, y le pisó la variable `r`: los tres del candado fallaban con el texto vacío y el
  problema no era el candado. Cuidado con eso al agregar bloques en el medio de un test.

## 4bb. 🔴🔴 LA RAÍZ DE TODO: Google convertía el día suelto en FECHA (2026-08-22)
Tercer reporte de la misma saga: *"bloqueo el día, luego actualizan página y sale eso"* — el
candado en verde, el cierre hecho… y tras el refresco el formulario mostraba el día abierto
con cupos.

**El hallazgo.** La fila `__dias_cerrados__` guarda los días en la columna Observaciones.
Con **UN solo día**, la celda queda `2026-08-24` pelado y **Google Sheets la convierte en una
FECHA de verdad**. Al releerla, `String(r[16])` devuelve `"Mon Aug 24 2026 00:00:00
GMT-0400 (…)"`:
- el panel filtra por `\d{4}-\d{2}-\d{2}` → **no encuentra nada** → el cierre se esfuma de
  TODAS las computadoras al primer refresco;
- `diaCerradoGs` en el servidor hace el mismo split → **el portero tampoco frena** → los 2
  pedidos que entraron el 21/08.

Con **dos o más días** (`"2026-08-24 2026-08-25"`) no parece fecha, queda texto y todo anda.
**Por eso era intermitente** — el peor tipo de bug. Y la pista estaba en el propio `.gs`:
`fmtDate()` existe porque la columna **Fecha** ya sufrió esta misma conversión; a
Observaciones nadie la protegió.

**Por qué mis pruebas anteriores no lo vieron:** el arnés (`/tmp/rt.js`) simulaba la hoja con
un array de JS, que **no convierte** textos en fechas. El Sheets real sí. Quedó el caso
agregado al arnés y al test permanente.

**El arreglo, en tres capas** (cinturón y tiradores):
1. **Panel — escritura**: `filaCierre()` escribe `"🔒 2026-08-24"` — con el prefijo la celda
   **nunca** parece fecha. Los lectores filtran por patrón, el prefijo no les molesta (al
   portero viejo publicado tampoco: su split lo descarta).
2. **Panel — lectura**: si el filtro no encuentra días pero la celda tiene algo, se intenta
   `new Date(crudo)` → `isoLocal()`. Así la celda **ya corrompida hoy** se lee bien incluso
   antes de reescribirse.
3. **Servidor**: `readAll` y `diaCerradoGs` pasan la celda por `fmtDate()` (Date →
   `yyyy-MM-dd`, texto pasa tal cual), y `doSave` prefija él mismo si un panel viejo con la
   página cacheada manda un día pelado.

Versiones → **2026-08-22-a** en los dos lados (hay que **volver a publicar el Apps Script**:
Implementar → Nueva versión). Ojo: `guardarCierres` comparaba `CIERRES_PEND` contra
`fila.observaciones` — con el prefijo eso ya no era igual; ahora compara contra la lista de
días capturada (`mandado`).

- Test: `tests/test_cerrardia.js` **19 → 21**: la fila escrita no puede "parecer fecha", y la
  celda ya convertida se lee como día cerrado igual.
- Verificado con el `.gs` REAL en el arnés: celda-Date → readAll `"2026-08-24"` ✓, portero
  frena ✓; panel viejo manda día pelado → el servidor lo prefija ✓.

## 4bc. ✏️ La vendedora edita su pedido — y logística se entera (2026-08-25)

Pedido del usuario: *"ponles el botón editar en «mis pedidos» a los vendedores, que puedan
adicionar, quitar, modificar producto, ubicación, y salga una alerta a logística en
administración que «este pedido fue modificado» si ya «estaba verificado o tickeado»"*.

**Lo que apareció buscando dónde meterlo (más grave que lo pedido).** `getProductos()` arma
la lista de productos **de cero** con lo que hay en el formulario: `{desc, medida, codigo,
cant, precio}`. O sea que **cada** edición —hasta corregir una letra de la dirección— le
borraba `chk` / `enProd` / `prodEn` a **TODOS** los productos, y el pedido **seguía diciendo
"✅ Verificado"**. El jefe de almacén revisaba el stock, la vendedora tocaba cualquier cosa,
y la revisión desaparecía sin dejar rastro. Ya venía pasando; no lo causó este cambio.
Verificado contra `origin/main`: `["ok","ok"]` → `[null,null]`, con `verificado` en `true`.

**Cómo quedó**
- `heredarMarcas(nuevos, viejos)` — le devuelve las marcas a los productos que quedaron
  **iguales**. La clave es `desc|normMedida(medida)|codigo` **+ la cantidad**: el almacén no
  dijo "hay almohada", dijo "hay 2"; si pasan a 5 ese ✔ ya no vale.
- `difPedido(antes, ahora)` — qué cambió, en criollo y con el producto adentro:
  `➕ SOFT PLUS 200x200 × 3`, `🔢 ALMOHADA × 5 — de 2 a 5`, `➖`, `📍`, `🏠`, `🗺️`, `📅`, `🕐`.
- `marcarModificado(rec, quien, cambios)` — deja `{f, h, q, d}` en el pedido.
- `avisoModifHtml(p, compacto)` — el cartel rojo (ficha de Administración y ficha del jefe de
  almacén) con el botón **"✓ Ya lo revisé"** (`verVistoModif`), y la chapita **⚠️ MODIFICADO**
  para la tabla de Administración, el renglón de la Lista de carga y la tarjeta de Mis pedidos.
- Si cambió **lo que se carga** (`cambiaronProductos`), el pedido vuelve a **sin verificar**.
  Si cambió solo la dirección/zona/fecha, la verificación **sigue valiendo**.
- `editarDesdeMis(id)` — botón **✏️ Editar** en la tarjeta y en la ficha de Mis pedidos. Avisa
  antes con un `confirm` si el pedido ya está entregado y/o si el almacén ya lo revisó.

**⚠️ Dónde vive la marca.** Dentro de `productos` (que ya viaja como JSON en `_productos_json`,
col 15) — **sin columna nueva y sin volver a publicar el Apps Script**, el mismo truco que
`precio`. Se pone en **TODOS** los productos a propósito: si fuera solo en el primero y la
vendedora justo borra ese, el aviso se perdería. Se descartaron: `observaciones` (~12 lugares
donde se muestra, el marcador se filtraría a WhatsApp y al Excel), una columna 30 (un tercer
redeploy seguido) y una fila de sistema (otro subsistema más la carrera de escritura de §4ba).

**Ojo con el nombre.** El helper de resumen se llama `prodCorto(producto)` y **no**
`prodResumen`: más abajo ya existe `prodResumen(pedido)` —el de la revisión de stock— y la
segunda declaración le gana a la primera, así que el original se comía al nuevo en silencio.

- Test: `tests/test_modif.js` (**32 checks**). Contra `origin/main` falla en las marcas
  borradas y revienta con `modDe is not defined`.
- Batería completa: **12 suites · 253 checks · 0 fallas**.
- **Trampa del arnés** (anotada en `tests/LEEME.md`): `editPedido` termina en
  `showView('form')`, que **vuelve a bajar la planilla**. Si el "servidor" simulado está
  vacío, `STATE` se vacía en medio de la edición, `prev` queda `null` y el test mide otra
  cosa. Hay que sembrar el pedido **también** en la planilla simulada.

## 4bd. 🔴 No se podía EDITAR ningún pedido cobrado por QR (2026-08-25)

Salió probando el botón Editar de §4bc. **Cualquier** pedido con QR —de cualquier vendedora,
con su propio banco, abierto desde Administración o desde Mis pedidos— al guardar contestaba
**«Elegí a qué banco entró el QR»** y **no guardaba nada**. Ni la dirección.

**La causa: el orden en `editPedido`.** `renderBancos()` solo dibuja los botones del banco si
el bloque del método está **a la vista**, y quien lo muestra es `updateMetodoVisibility()`.
Estaba así:

```
segSet('f-metodo', _mf.metodo);
updateBancoVisibility(); segSet('f-banco', _mf.banco);   // ← los botones todavía no existen
updateMetodoVisibility();                                 // ← recién acá se muestran
```

`segSet` no encontraba el botón, el segmento quedaba vacío, y el `renderBancos()` que corre
después leía `prev=segVal('f-banco')` = `''` y no marcaba nada. Ahora se muestra primero y se
marca después.

**Y de paso, el segundo caso**: el banco registrado puede **no estar en la lista de esa
vendedora** (el pedido pasó de otra, o las cuentas cambiaron). Ahí el botón directamente no
existe. `BANCO_EXTRA` lo agrega a la lista mientras dura la edición, etiquetado
**"(ya registrado)"**, y `resetForm()` lo limpia para que no se le cuele al pedido siguiente.
Sin esto la única salida era marcar OTRO banco — o sea **mentir sobre dónde entró la plata**.

- Test: `tests/test_banco.js` (**16 checks**). Contra `b5038a4`: **7 fallas**.
- **⚠️ Lección de arnés** (en `tests/LEEME.md`): los scripts sueltos de diagnóstico tenían la
  ruta **absoluta** del panel, así que correrlos "contra la versión vieja" abría igual el
  archivo de trabajo. Durante un rato pareció que el caso normal ya funcionaba. Los tests del
  repo usan `path.resolve('pedidos.html')` y `correr.sh` los para en la raíz — que siga así.

## 4be. 🔒 La edición no era puerta trasera… hasta que se la dimos a las vendedoras (2026-08-25)

Cerrando el círculo de §4bc: **todos** los porteros de fecha en `submitPedido` (mínima,
domingo, sábado PM, día cerrado, cupos) tenían `!isEdit`, y el freno del servidor es a
propósito solo para filas nuevas (`foundRow < 0` — si no, logística no podría tocar nada de
un día cerrado). Mientras editar era cosa de administración, daba igual. Con el botón Editar
en Mis pedidos, una vendedora SIN clave podía **mover** su pedido a un día CERRADO, a un
turno LLENO, a un domingo, a un sábado PM o a ayer — reproducido contra `origin/main`:
`"Cambios guardados ✓"` con el pedido adentro del día cerrado.

**La regla nueva:** si la edición **cambia** la fecha o el turno y NO está `UNLOCKED`, el
destino pasa por los mismos porteros que un pedido nuevo (`_mueveFecha` / `_mueveTurno` /
`_mueveVend`). Además:
- La "última mirada" a la planilla (§4az) ahora también corre para la movida de una
  vendedora — su copia puede ser de hace horas — y **re-mira el cupo** del destino con la
  planilla recién bajada, porque para las movidas el servidor no lo cuida.
- Corregir un pedido que YA estaba en un día cerrado (sin moverlo) pasa **sin el confirm**
  de antes: el cartel solo salta cuando el pedido está ENTRANDO al día. Le saca ruido a
  logística y a la vendedora que corrige una dirección.
- Con `UNLOCKED`, igual que siempre: confirm y manda administración.

Verificado con el `.gs` REAL en el arnés (`/tmp/rt2.js`): pedido nuevo a día cerrado →
`dia_cerrado` ✓ · **editar** uno que ya estaba → pasa ✓ · la marca `.mod` de §4bc sobrevive
`doSave→readAll` ✓ (y el "Ya lo revisé" también) · el portero sigue frenando después ✓.

- Test: `tests/test_mover.js` (**15 checks**). Contra `origin/main`: **8 fallas** (todas las
  movidas prohibidas entraban).
- Batería: **14 suites · 284 checks · 0 fallas**.
- El exec de Google sigue inalcanzable desde el sandbox (proxy 403): la confirmación del
  deploy `2026-08-22-a` es el cartel del candado en la pantalla del usuario.

## 4bf. 👁️ Botón para ocultar el resumen de Administración (2026-08-26)

Pedido del usuario, con capturas tachadas: *"quieren el botón «ocultar» para esos que taché
… el consolidado por vendedor y las fichas, para tener más orden y limpio"*.

Se envolvió TODO el bloque de estadísticas en `#adm-resumen` (fichas `adm-metrics`, línea
`adm-metodos`, consolidados por vendedor/día, camión, rendición, ocupación de cupos y zonas)
con un interruptor arriba a la derecha. Se plegó **todo** y no solo las dos cosas tachadas
a propósito: con el resto en pie la tabla seguía quedando lejos, que es el problema real.

- Persiste en `localStorage` (`pedidos_resumen_adm`), o sea **por computadora** — nadie le
  cambia la pantalla al resto. Por defecto: **visible** (nada cambia para quien no lo toque).
- **NO** se pliegan los avisos (`#adm-revisar`: entregas por revisar, OC repetidas), ni los
  botones, ni los chips, ni la tabla.
- Plegado, el botón se lleva el número grueso: `👁️ Ver resumen · 65 pedidos · 44 por cobrar ·
  Bs 28.121,00` (`RESUMEN_MINI`, que arma `renderAdmin`). Sin saldo pendiente omite esa parte
  en vez de decir "0 por cobrar".

**Y de paso, un agujero del aviso de §4bc**: el botón rápido `📍 Cambiar ubicación` de «Mis
pedidos» NO marcaba el pedido como MODIFICADO — por el formulario completo sí. La ubicación
es justo lo que decide si el chofer llega o da vueltas. `guardarUbicacion` toma un cuarto
argumento `deVendedora`: solo `editarUbicacionMis` lo pasa, así logística corrigiendo una
ubicación no se manda un aviso a sí misma.

- Tests: `tests/test_resumen.js` (**22 checks**) y 5 nuevos en `test_modif.js` (**33 → 38**).
  Contra `origin/main`: `test_resumen` revienta (`toggleResumenAdm` no existe) y `test_modif`
  da 3 fallas.
- Batería: **15 suites · 312 checks · 0 fallas**.
- **⚠️ Trampa de arnés** (anotada en `tests/LEEME.md`): poner `UNLOCKED=true` NO abre la
  pantalla de Administración — el candado esconde `#admin-content` con un `display` inline
  que quita `tryUnlock()`. Sin eso TODO mide "oculto" y el test no distingue lo que plegó el
  botón de lo que ya estaba tapado.

## 4bg. 📎 Adjuntar el comprobante que falta desde «Corregir este pago» (2026-08-28)

Pedido del usuario, con captura: *"Contabilidad, botón corregir, al usarlo debería tb salir
la opción de adjuntar imagen por si se olvidaron alguna en ese pago ya registrado"*.

**Y el agujero de fondo que apareció ahí:** el **ADELANTO** no está en la lista de cobros
(`cobrosDe`), así que `ctaIdxCobro` le devuelve `-1` — y los botones de adjuntar en
`contaPagosHtml` estaban todos detrás de `idx>=0`. O sea que el anticipo era el **ÚNICO**
pago sin forma de adjuntarle ni quitarle una imagen… y es el más común: el que carga la
vendedora junto con el pedido. Olvidada la captura, esa venta se quedaba sin respaldo para
siempre. (Justo el renglón de la captura del usuario.)

**Cómo quedó**
- Dentro de `cajaEdit` («Corregir este pago») va la sección **📎 Imágenes de respaldo**: las
  que ya tiene con su ✕, el botón para sumar otra (tope `COMP_MAX`) y, si no tiene ninguna,
  el aviso ámbar. Vale para los **tres** renglones: anticipo, cobro y recargo por entrega.
- `ctaAdjuntarEdit(id,i)` / `ctaQuitarCompEdit(id,i,k)` despachan por tipo de renglón;
  `aplicarCompsAnticipo(p, comps)` es el camino nuevo del adelanto — reescribe **solo** su
  renglón del ledger (⚠️ lee `cobrosDe`/`enviosDe` ANTES de pisar `p.metodoPago`) y no toca
  monto, saldo ni total.
- `onCompElegido` gana la rama `destino.anticipo` (y su cuenta de `yaTiene`).
- **`CTA_EDIT_V`**: subir o quitar una imagen repinta la ficha entera con `showContaModal`,
  y eso borraba la fecha/monto/recibo que se estuvieran tipeando. Se capturan con
  `ctaEditRecordar()` antes de repintar y se restauran al pintar los inputs; se descartan al
  abrir, cerrar o guardar el editor (reabrirlo muestra el valor de verdad, no el descartado).
- El pie del editor decía **«El comprobante no se toca»** — ya no es cierto: ahora explica
  que las imágenes se guardan solas y no hace falta tocar «Guardar».

Sube por el mismo canal de siempre (`apiFoto`, `action:'foto'`), así que **no hace falta
tocar el Apps Script**.

- Test: `tests/test_compedit.js` (**32 checks**) — cubre los tres renglones, que la imagen no
  se le cuele a otro pago, que la plata no se mueva ni un centavo (adelanto, cobrado, saldo,
  total y el historial con sus fechas/recibos/banco), el borrado en Drive y lo tipeado.
  Contra `origin/main`: falla y revienta con `ctaAdjuntarEdit is not defined`.
- Batería: **16 suites · 344 checks · 0 fallas**.

## 4bh. 🐱 El gato, para todo el equipo (2026-08-29)

Pedido del usuario: *"la alerta que falta adjuntar comprobante, y el gato de meme que sale
a Isabel, que salga a todos los demás vendedores"*.

**Antes de tocar nada se midió** (`/tmp/quien.js`, los dos casos × los 10 vendedores), porque
eran DOS avisos distintos con la MISMA imagen y solo uno estaba restringido:

| | falta el comprobante | escribió un combo |
|---|---|---|
| Fernando · Mauricio · Juan Pablo | 🐱 | 🐱 |
| Carola · Isabel · Mirian · María · Jonathan | 🐱 | solo un toast |
| Eduardo Añez · ROHO | — (form lite) | solo un toast |

O sea: el del **comprobante ya salía para las 8** — lo que Isabel veía no era un privilegio.
El restringido era el del **combo**, por la lista `MEME_COMBO` de tres nombres; el resto veía
un toast que, justamente, se les pasaba de largo (que es para lo que existe el gato).

**Se borró la lista.** `memeCombo` ya no filtra por vendedor. Sin lista no hay a quién
olvidarse de agregar cuando entra alguien nuevo. El título se adapta: con nombre
*"Otra vez el combo, Isabel…"*, sin nombre elegido *"Los combos se cargan por separado"*
(antes quedaba colgando con una coma y puntos suspensivos).

Eduardo Añez y ROHO **siguen sin** el del comprobante, y está bien: su formulario es "lite"
y ni siquiera pide método de pago, así que no hay comprobante que reclamar — se verificó que
su pedido **sí se guarda** ("✅ Pedido guardado") y no queda trabado.

- Test: `tests/test_memes.js` (**11 checks**) — cruza los DOS avisos contra TODOS los
  vendedores, así la lista no puede volver a encogerse en silencio. Contra `origin/main`:
  **5 fallas**.
- Batería: **17 suites · 355 checks · 0 fallas**.

## 4bi. 🐱📎 El comprobante olvidado, en Contabilidad (2026-08-29)

Pedido del usuario, siguiendo §4bh: *"lo mismo cuando corrigen en contabilidad, y registran
un pago, y olvidan adjuntar comprobante"*. Se midió antes de tocar (`/tmp/conta.js`) y había
**tres** cosas, no una:

1. **Registrar** un pago sin imagen → frenaba bien, pero con un **toast** — justo el aviso
   que se les pasa de largo y para lo que existe el gato. Ahora: `memeCompConta`, bloqueante.
2. **Corregir** un pago sin imagen → **guardaba en silencio**, sin chistar. Ahora el gato,
   con **dos botones**: «Ya la adjunto» (vuelve al editor y dispara `ctaAdjuntarEdit`) y
   «Guardar igual — la subo después» (`ctaGuardarPago(id,i,true)`). **No traba**: hay pagos
   de antes de que la imagen fuera obligatoria y trabar ahí sería la trampa de §4bd otra vez.
3. 💰 **El de plata**: adjuntar la imagen repinta la ficha y eso **borraba la FECHA y el N°
   de recibo** que se estaban tipeando. La fecha volvía a **HOY** sin avisar → un pago del
   sábado cargado el lunes se cuadraba en el día equivocado. `CTA_PAGO_V` los conserva.
   (El monto *parecía* sobrevivir, pero solo porque vuelve a nacer con el saldo.)

**⚠️ La trampa de las funciones "recordar".** `ctaPagoRecordar()`/`ctaEditRecordar()` hacían
`X = (inputs) ? {...} : null`. Cuando el gato **tapa la ficha** los inputs no existen, así
que la llamada **borraba** justo lo que había que conservar — el test lo cazó con 6 fallas
que el probe manual no veía (ahí el gato todavía no estaba en el medio). Ahora solo escriben
si encuentran los campos; el limpiado es explícito: al registrar el pago, al cambiar de tipo
y al abrir OTRA venta (`CTA_ULTIMA`).

`ctaGuardarPago` lee sus campos por `ctaEdVal()`, que cae a `CTA_EDIT_V` cuando los inputs no
están — es lo que hace posible el «Guardar igual» con el gato encima.

- Test: `tests/test_compconta.js` (**29 checks**). Contra `origin/main`: falla en masa y
  revienta con `ctaAdjuntarDespues is not defined`.
- Batería: **18 suites · 384 checks · 0 fallas**.

## 4bj. 🔎 Nueve controles para contabilidad, y un buscador (2026-08-29)

El usuario pidió opciones para reforzar «Revisar antes de cerrar» —preguntando puntualmente
por un detector de doble venta por cliente y monto— y eligió **todas**.

**Lo que ya existía y estaba roto.** El detector de duplicados YA miraba cliente+monto, pero
exigía el **mismo día**, y agrupaba por notas que no son notas. Reproducido:

```
nota "0"   → ALZER + OTRO + TERCERO + CUARTO      ← 4 falsos
nota "S/N" → QUINTO + SEXTO                       ← 2 falsos
ANA LOPEZ Bs 2.500 el 12 y el 13                  ← NO lo veía
```
En la planilla real, **11 de las 19** "cargadas dos veces" eran «ALZER · misma nota 0».

- `notaDeTalonario()` — una nota solo agrupa si tiene dígitos y no es cero. `notaNumero()`
  es más estricto (solo enteros pelados) y se usa nada más que para los huecos.
- `DUP_DIAS=7` — cliente+monto ahora agrupa por **cercanía de fechas**, no por día exacto.

**Los ocho controles nuevos** (todos en `cuadreAlertas`, recolectados en UNA pasada):
🖼️ el mismo comprobante en dos ventas (`compRepetidos` — el más fuerte, y el dato ya estaba
guardado) · 🚚 entregado y sin cobrar · 📆 fechas imposibles (pago anterior a la venta o a
futuro) · 🧮 precios que no dan el total (`precioDescuadra`, ya existía sin usarse acá) ·
📎 pagos sin imagen de respaldo · 👥 cliente con saldo en varias notas · 🔢 huecos en el
talonario (`huecosTalonario`) · ⏳ tramos de antigüedad de la deuda (`tramosDeudaHtml`).

**⚠️ `HUECO_MAX=3`, no 10.** Con 10, la prueba visual escupió «faltan las 902…909»: ocho
seguidos no es un olvido, es otro talonario. Un aviso ruidoso es un aviso que nadie mira —
que es exactamente el problema que este trabajo vino a arreglar.

**🔎 Buscador del detalle de pagos** (`CUA_BUSCA` / `cuaFiltrar`): busca en todo lo que se ve
en la fila, admite varias palabras (todas tienen que estar), compara el monto con y sin
formato, y el título **suma lo filtrado** (`2 de 4 · suman Bs 5.420,00`). Repintar la tabla
roba el foco, así que se lo devuelve con el cursor al final: sin eso se escribe una letra y
el teclado deja de responder.

**🙈 Ocultar resumen en el Cuadre** (`LS_RESUMEN_CUA`, hermano de §4bf): pliega cierres,
retiros, por cobrar y avisos, y deja la planilla de pagos arriba. Plegado, el botón se lleva
**cuántos avisos quedan** en rojo — esconder el panel no puede ser olvidarse de revisarlo.

- Tests: `tests/test_revisar.js` (**58 checks**: cada control con su caso real Y su falso
  positivo) y 7 nuevos en `test_resumen.js` (**22 → 29**). Contra `origin/main`, `test_revisar`
  falla en masa.
- Batería: **19 suites · 449 checks · 0 fallas**.
- La trampa del `apiList` vacío picó por tercera vez (ya estaba en `tests/LEEME.md`).

## 4bk. 📐 El panel de avisos, plegado (2026-08-29)

El usuario mandó la captura: *"se ve fatal, hace que uno tenga que scrollear mucho, y hay
demasiado espacio perdido y sin usar"*. **Se midió antes de opinar** (`/tmp/medir.js`, 176
ventas simuladas) y eran DOS problemas, no uno:

| | antes |
|---|---|
| `cua-alertas` | **926 px** — cada aviso volcaba los nombres como párrafo corrido |
| `cua-pendientes` | **926 px** con ~250 px de contenido |

Lo segundo no era falta de contenido: `.two-col` es un **grid**, y el grid **estira las dos
cajas a la altura de la más alta**. Esos ~670 px de blanco eran la grilla, no un descuido.

**Lo que se hizo** (el usuario eligió el rediseño completo):
- `align-items:start` en `.two-col` — mata el estiramiento en TODA la app, una línea.
- `avisosHtml()` — cada aviso es **un titular** (el texto ya dice cuántos y cuánta plata) con
  un contador `▸ 64` a la derecha; se toca y se abren los nombres. `cuaToggleAviso(k)` +
  `CUA_AV_ABIERTO`. Por eso cada aviso lleva ahora `k` (clave estable) y `sev`.
- **Agrupados por gravedad**: 🔴 plata en juego (abiertos por defecto) · 🟡 datos incompletos ·
  ⚪ para mirar. Barra de color a la izquierda de cada renglón.
- Los nombres pasan de párrafo subrayado a **chips** (`.cua-chip`).
- El talonario, **resumido**: «María Flores · 25 faltantes», con los números en el `title`.
  Con 8 vendedoras y 82 faltantes era un muro de ocho renglones.

**⚠️ La opción C se dio vuelta al medirla.** Sacar los avisos a lo ancho y apilarlos daba
482+490 = **972 px**, PEOR que los 926 originales: cada caja quedaba bien pero el total
crecía. Lado a lado con `align-items:start` la fila mide lo que la más alta, no la suma. Se
probaron proporciones (1.3 / 1.6 / 1.8 / 2fr) y quedó **1.8fr 1fr**: los avisos tienen texto
largo y «Por cobrar» es una tabla angosta de tres columnas.

**Resultado: la fila de 926 → 582 px (−37 %)**, y el blanco de la izquierda desaparece.

- Tests: `test_revisar.js` **58 → 69** (agrupado, plegado por defecto según gravedad, abrir y
  cerrar, chips, y que el grid no estire).
- Batería: **19 suites · 460 checks · 0 fallas**.
- ⚠️ Dos fallas del test fueron del test, no del panel: extraer la clave con
  `replace(/[^a-z]/g,'')` se comía la T de «Toggle», y `a||'?'+':'+b` se agrupa como
  `a||('?'+':'+b)` — la precedencia se comió el sufijo. El panel estaba bien las dos veces.

## 4bl. 🐛 Guardar una edición mandaba al candado · 🛏️💚 Las dos marcas (2026-08-29)

**El bug.** El usuario: *"¿por qué cuando los vendedores editan un pedido no les sale la
confirmación y los lleva al panel de admin a poner la clave?"*. Una línea, de §4bc:

```js
if(wasEdit){ showView('admin'); } else { showWhatsappModal(rec); }
```

Escrita cuando editar era **solo** cosa de administración. Al darles el botón Editar en «Mis
pedidos», guardar las escupía a la pantalla del candado — y sin confirmación, así que
**parecía que el cambio no se había guardado** (sí se guardaba).

- `EDIT_DESDE` recuerda de dónde salió la edición (`mis` / `carga` / `admin`), lo setean los
  puntos de entrada, y `resetForm()` lo vuelve a `admin`.
- `volverDeEdicion(desde)` vuelve ahí — y **si no está `UNLOCKED`, siempre a «Mis pedidos»**:
  nadie puede volver a caer en el candado, venga de donde venga.
- `confirmEdicionModal(rec, cambios)` — cartel verde «✓ Cambios guardados» con **qué cambió**
  (el mismo `difPedido` de §4bc), el aviso de que a logística le llegó la alerta cuando
  corresponde, y **📲 «Pasar la venta actualizada»**: si le agregó un producto o le movió la
  fecha, el mensaje que ya había mandado al grupo quedó viejo.
- ⚠️ `after()` guarda `EDIT_DESDE` y el diff en locales **antes** de `resetForm()`, que los pisa.

**Las dos marcas.** Dos fichas nuevas en el Cuadre: `MARCAS` + `marcaDe()` + `totalPorMarca()`.
🛏️ Sueña = Mauricio · Juan Pablo · Fernando. 💚 Heaven = Jonathan · María · Isabel · Carola ·
Mirian. Con el % de lo que entró.

⚠️ Coincide exactamente con `BANCOS_POR_VENDEDOR` y no por casualidad: Sueña cobra a
Ganadero/Económico y Heaven a BISA/Económico — son dos cajas de verdad. Quien no esté en
ninguna lista **no se reparte a la fuerza**: sale una tercera ficha «⚠️ Sin marca» con su
monto, para que nadie la dé por repartida.

- Test: `tests/test_marcas.js` (**24 checks**) — el bug del candado reproducido (contra
  `origin/main`: `candado true`, `vista admin`), la vuelta según de dónde salió, la
  confirmación, y las marcas incluyendo al vendedor huérfano.
- Batería: **20 suites · 484 checks · 0 fallas**.

## 4bm. 📐 Las fichas llenaban un tercio de la pantalla (2026-08-29)

El usuario, con captura: *"quedaron mal apiladas, mira todo el espacio desperdiciado a la
derecha"*. Estaba en el CSS, a la vista:

```css
.metrics{grid-template-columns:repeat(4,1fr); max-width:1180px}
```

**Siempre cuatro por fila**, y el bloque **topeado a 1180 px**. Medido en 1920: usaba 1180
de 1818 px — **638 px en blanco** — y las diez fichas del Cuadre (§4bl le sumó dos) quedaban
**4+4+2**. El `.m3` que ya existía («el cuadre tiene SEIS tarjetas… 3+3, no 4+2») era el
mismo problema parcheado a mano para otro conteo; quedó sin uso y se borró.

`acomodarFichas()` elige las columnas con dos reglas, en orden: **menos filas** primero y,
entre esas, las filas más **parejas**. Con 10 en pantalla ancha entrarían 7 (→ 7+3), pero
elige 5 → **5+5**. Se llama desde los cuatro renders que llenan fichas, desde `openModal`
(el reporte y los productos traen las suyas) y al cambiar el tamaño de la ventana.

**⚠️ `FICHA_MIN` se midió, no se adivinó.** Con 250 px quedaba `[3,3,3,1]` a 1100 y **una
sola ficha de 498 px por fila** a 600. Con **230** da `[4,4,2]` y `[2,2,2,2,2]` — que es
como se veía antes en pantalla chica, donde funcionaba bien.

| ancho | antes | ahora |
|---|---|---|
| 1920 | 4+4+2 · usa 1180 de 1818 | **5+5 · usa 1818** |
| 1400 | 4+4+2 · usa 1180 de 1298 | **5+5 · usa 1298** |
| 1100 | 4+4+2 | 4+4+2 |
| 600 | 2+2+2+2+2 | 2+2+2+2+2 |

- Tests: `test_marcas.js` **24 → 33** — la regla probada sobre un contenedor de prueba con
  4/6/8/10/11 fichas en tres anchos, así no depende de cuántas fichas tenga hoy el Cuadre.
- Batería: **20 suites · 493 checks · 0 fallas**.

## 4bn. ⚡ Administración abría en «Todo» y dibujaba la historia entera (2026-08-29)

El usuario corrigió un número mío: *"lo del retraso en pintar solo sería cuando le dan ver
'todo' desde el fin de los tiempos, no solo lo del mes"*. Tenía razón, y la corrección era
sobre **mi propia medición**: los 944 ms que le había mostrado los medí **sin tocar el
filtro** — o sea en «Todo» — y se los presenté como el uso de todos los días. Se lo dije.

Pero al medirlo bien (3 renders de descarte + mediana de 5) aparecieron dos vueltas de
tuerca que lo volvían un problema real igual:

1. **«Todo» era el filtro de fábrica** — el `class="active"` estaba en ese botón. Nadie
   estaba en el modo rápido salvo que lo eligiera a mano cada vez.
2. La tabla dibujaba **una fila por cada venta de la historia**, y se repinta sola cada dos
   minutos y en cada tilde.

| ventas | Mes antes | Todo antes | Mes ahora | Todo ahora |
|---|---|---|---|---|
| 250 | 37 ms | 120 ms | 43 ms | 85 ms |
| 750 | 204 ms | 427 ms | 82 ms | 80 ms |
| 1.500 | 172 ms | **864 ms** | 84 ms | **90 ms** |
| 3.000 | 796 ms | **1.469 ms** | 84 ms | **98 ms** |

Dos arreglos, los dos baratos:

- **Arranca en «Mes»** (`active` movido, y `#wrap-mes` ya no nace con `display:none`).
- **`ADM_TOPE=150` filas dibujadas**, con aviso *«Se muestran 150 de 400»* y botones
  `admVerMas()` / `admVerTodos()`. `admTopeReset()` vuelve a 150 al cambiar de filtro,
  de día, de mes o al escribir en el buscador — un «ver todos» no se queda pegado.

**⚠️ El tope es SOLO de la tabla, y ahí está todo el riesgo.** El recorte es un `slice` de
una variable local, puesto **después** de que se calculan las fichas y los cinco
consolidados (vendedor, día, camión, chofer, zonas), y `admFilter()` / `cargaLista()` no lo
ven. Así el **buscador sigue mirando la planilla entera**: un tope que esconda lo que
alguien está buscando sería mucho peor que la lentitud que vino a arreglar. Si alguna vez
alguien "optimiza" metiendo el tope dentro de `admFilter()`, el Excel saldría con 150 de
400 ventas y nadie se enteraría hasta que reclame el contador.

- Test nuevo: `test_tabla.js` (**22 checks**). Contra `origin/main` da **11 fallas** — y las
  9 que pasan en ambas versiones son justamente los invariantes que no había que romper
  (buscador, fichas, Excel, Lista de carga, y que con 40 pedidos no aparezca ningún aviso).
- Batería: **21 suites · 515 checks · 0 fallas**.

## 4bo. 🎨 Turquesa y amarillo patito · 🐛 el filtro «Mes» escondía las entregas que venían (2026-08-31)

Pedido chico: *"heaven borde turquesa, y sueña borde amarillo patito porfavor"*. Al hacerlo
apareció un bug propio, y el bug importaba mucho más que el color.

**El color.** `MARCAS` usaba un solo `col` para el **borde** de la ficha y para el **monto**.
El amarillo patito de verdad (`#FFD400`) sobre blanco da **1,34:1**: de borde se ve perfecto,
de número el monto sería ilegible. Así que `col` (borde) y `txt` (número) van separados:

| marca | borde | monto | contraste del monto |
|---|---|---|---|
| Sueña | `#FFD400` patito | `#a16207` | 4,92:1 |
| Heaven | `#00B5AD` (el teal de la marca) | `#0f766e` | 5,47:1 |

`mc()` toma un 5º parámetro opcional `txt`; sin él se comporta como siempre.

**El bug, que lo destapó el calendario.** Al correr la batería, `test_resumen` falló 4 checks
por primera vez: sembraba pedidos "para mañana" y medía **cero**. No era el test — era el
**31 de agosto**, y mañana ya era septiembre. §4bn había puesto el filtro de fábrica en
«Mes», y **«Mes» corta por fecha de ENTREGA**: los últimos días de cada mes, todo lo que se
entrega el mes siguiente —justo lo que se está preparando— desaparecía de la tabla. La Lista
de carga y el Excel lo seguían viendo, pero la tabla es donde se asigna chofer y se tilda
verificado. `renderRevisar` tampoco lo cubría: solo mira pedidos con **datos faltantes**.

**Se revirtió la mitad de §4bn.** Medido *después* del tope de filas, «Mes» y «Todo» dan
**84 y 98 ms** con 3.000 ventas: el **tope fue lo que arregló la lentitud**, y el filtro por
defecto ya casi no aportaba. Catorce milisegundos no pagan esconder entregas. Vuelve a
arrancar en **«Todo»** — y como el orden de fábrica es por **fecha descendente**, las 150
filas dibujadas son las entregas **más próximas**, no 150 pedidos viejos.

**Y se agregó la red de seguridad** para cuando alguien *elige* «Mes», que es legítimo y
sigue escondiendo lo mismo: `renderFueraDelMes()` pone un aviso ámbar —*«📅 Hay 4 pedidos con
entrega fuera de este mes…»*— con un botón por mes que salta ahí. Mira **solo de hoy en
adelante**: esconder lo viejo es para lo que sirve el filtro. Va en `#adm-fuera`, **fuera de
`#adm-resumen`** a propósito: plegar el resumen no puede tapar una alerta.

- Tests: `test_finmes.js` nuevo (**15 checks**) — contra lo publicado da **13 fallas**, y la
  primera línea es la prueba del bug en vivo: `mes · 3 filas`, con las 4 de septiembre
  escondidas y sin aviso. `test_tabla.js` **22 → 24**: ahora fija que arranca en «Todo» y que
  lo dibujado es lo más próximo (nada escondido es más nuevo que lo que se ve).
- Batería: **22 suites · 532 checks · 0 fallas**.

> **Lección para la próxima.** §4bn cambió un valor por defecto por **14 ms** y abrió un
> agujero operativo que solo se vuelve visible **dos días al mes**. Lo agarró el calendario,
> no una revisión. Antes de cambiar un filtro por defecto: preguntarse **qué queda afuera**,
> y medir la ganancia *después* de los otros arreglos, no antes.

## 4bp. 🧮 El Cuadre abre en «Mes» (2026-08-31)

*"cuadre y conciliacion al abrir por defecto deberia salir en mes no en dia"*. Contabilidad
cuadra el mes, no el día suelto. Se movió el `active` de `#cua-mode` a **Mes**, se dio vuelta
el `display:none` de `#cua-wrap-dia` / `#cua-wrap-mes`, y el respaldo de `cuadrePeriodo()`
pasó de `||'dia'` a `||'mes'` para que coincida con lo que marca el HTML.

**⚠️ Por qué esto NO repite el error de §4bo.** Ahí el cambio de «Todo» a «Mes» *achicaba* la
vista y escondía entregas. Acá va al revés: **el mes contiene al día**, así que abrir en Mes
solo puede mostrar más plata, nunca menos. El test lo fija explícitamente
(`mes 6 pagos · día 5`) para que nadie lo invierta por descuido.

**Lo que sí se revisó antes de tocar** (era el riesgo real): el **arqueo** se guarda con clave
`modo|valor|forma` — `dia|2026-08-31|Efectivo` y `mes|2026-08|Efectivo` son entradas
distintas. O sea que los conteos por día que Contabilidad ya venía anotando **siguen ahí**,
intactos, al tocar «Día». No se pisa nada. Queda dicho en la guía porque a simple vista el
casillero del arqueo va a aparecer vacío al abrir, y eso asusta.

- Tests: `test_cuadre.js` **24 → 28**. La sección 0 va **antes que todo lo demás** a propósito:
  el helper `cuadrar()` fuerza el modo en cada llamada, así que medido después ya no se
  sabría con cuál abrió. Contra lo publicado da 3 fallas.
- Batería: **22 suites · 536 checks · 0 fallas**.

## 4bq. 🎧 La matriz de ATC — qué entró, por qué, y cuándo volvió (2026-09-02)

*"se genera la ATC que es para recoger el producto pero no hay el seguimiento de POR QUÉ se
creó esa ATC… y cuándo producción devolvió el producto. Y QUÉ SE REALIZÓ."* → *"lo que
queremos es una matriz de datos donde se vea qué ATC entraron y por qué motivo… y cuándo se
devolvieron"*. Y: *"logística carga esa etapa cuando se devuelve"*.

**El diagnóstico, medido sobre los datos reales (`atc-semanal.csv`, 85 tarjetas de Trello):**

| lo que se creía | lo que decían los datos |
|---|---|
| "no se anota el motivo" | **Sí se anota** — en "DETALLES DEL RECLAMO" o en 📝 observaciones. Pero como texto suelto, en **dos formatos distintos**, donde el panel no lo ve. |
| "faltan etapas" | **Ya existían** en Trello: SOLICITADAS → PROGRAMADAS RECOJO → EN PRODUCCION → DEVUELTAS. |
| — | **0 de 85 tarjetas tienen fecha.** Ninguna. Por eso no se podía responder "¿hace cuánto está en fábrica?". |
| — | **54 de 85 amontonadas en «DEVUELTAS LOG»**, sin decir qué se hizo. |
| — | Hay tarjetas cuya descripción es **literalmente el texto de WhatsApp que genera el panel**, pegado a mano: doble carga. |

O sea: lo que faltaba no era el motivo, eran **las fechas y el cierre**.

**Lo hecho.** Pestaña propia `view-atc` (sin contraseña: una vendedora necesita saber si ya
volvió el colchón de su cliente), con las cuatro fichas, el conteo **por qué se generaron**,
la tabla y los filtros. En el formulario, al elegir 🎧 ATC aparecen **motivo** (obligatorio,
lista cerrada) y **detalle del desperfecto**. Logística estampa la devolución con el botón
📦: fecha + **qué se hizo**.

**⚠️ Dónde viajan los datos.** Dentro del JSON de productos (columna 15), misma convención
que `mod` y `precio`: la planilla tiene 29 columnas fijas y una nueva obligaría a republicar
el Apps Script. **Sin redeploy.**

**⚠️ EL RIESGO QUE CASI SE ME PASA.** Los productos que salen del formulario son objetos
**nuevos**: sin rescatar lo anterior desde `prev`, la vendedora corrigiendo una dirección
**borraba la devolución que anotó logística**, en silencio, y nadie se enteraría hasta que
alguien preguntara "¿y este colchón dónde está?". De ahí `mergeAtcDatos` y el rescate
explícito en `submitPedido`. Es el check que encabeza el test.

**🐛 Bug encontrado de paso.** Eligiendo 🎧 ATC pero **escribiendo el N° a mano**, `ocSel`
quedaba sin el prefijo `ATC `: `esATC()` daba false y la atención no habría aparecido nunca
en su propia pestaña. El camino automático (`nextOcMes`) sí lo ponía; el manual no pasaba por
ningún lado. ROHO queda afuera —ahí el N° lo manda el cliente—.

**📐 Orden de las columnas, corregido tras mirarlo renderizado.** Con el detalle en el medio,
**Devuelta · Días · Qué se hizo quedaban fuera de la pantalla** a 1500 px — justo las tres que
se pidieron. Se movieron a la izquierda (entró → motivo → devuelta → días, juntas) y los dos
textos largos al final, topados con `text-overflow` y el completo en el `title`.

- Test: `tests/test_atc.js` (**41 checks**). Contra lo publicado: **36 fallas**.
- Batería: **23 suites · 577 checks · 0 fallas**.

> **Pendiente de decisión del usuario:** si la pestaña **reemplaza** al tablero de Trello o
> convive con él. Hoy conviven, y la doble carga sigue.

## 4br. 🎧 Cuatro etapas, no dos · la ficha para leer · el motivo estaba escondido (2026-09-02)

Cuatro correcciones seguidas del dueño, todas sobre §4bq. Las tres primeras son errores míos
de diseño, no de código:

**1. *"¿dónde sale en el formulario el motivo?"*** — Estaba, pero lo había puesto después de
Garantía: medido, a **540 px del botón 🎧 ATC** (en un celular, pantalla y media de scroll).
Tocabas ATC y visualmente no pasaba nada. Movido a **113 px**, pegado al selector que lo hace
aparecer, con fondo teal para que se note que apareció algo.

**2. *"¿dónde marcan que ya se atendió, recogió y devolvió?"*** — El recojo **ya se marcaba**
(es el ✅ del chofer, que en una ATC significa "fue y lo trajo" aunque el botón diga
"Entregado"), pero **no quedaba la fecha** y no estaba en la matriz.

**3. *"¿y dónde marcan «producto devuelto al cliente»?"*** — Acá estaba el error de fondo:
yo había modelado **dos** momentos y son **cuatro**.

| | |
|---|---|
| 📝 Entró | se generó la ATC, con motivo |
| 🚚 Se recogió | se lo fueron a buscar al cliente |
| 🏭 Volvió de fábrica | producción lo devolvió + **qué se hizo** |
| ✅ Se le devolvió al CLIENTE | **el único que cierra la ATC** |

Que producción lo devuelva no termina nada: el colchón está en el depósito y el cliente sigue
esperando. De ahí el estado **📦 Lista para entregar** y su ficha — la cola de trabajo que
antes no se veía en ningún lado. El guardado **no deja saltear pasos** (no se puede entregar
al cliente algo que sigue en producción).

**4. *"al dar click no se abre la ficha para leer el motivo"*** — El 🔍 abría el formulario de
edición, y en la tabla el detalle iba cortado con «…» y el texto completo solo en el `title`:
**invisible en un celular**. Ahora `verAtc()` abre una ficha de lectura con el motivo, el
detalle entero, qué se hizo y las cuatro fechas; y **la fila entera es clicable**, que es lo
que se toca con el dedo.

**🐛 El test agarró un bug mío antes que el usuario.** Al agregar `rec` y `ent`, el rescate de
`submitPedido` seguía enumerando campo por campo (`dev`, `hizo`, `devQ`, `devH`) y los dos
nuevos **quedaban fuera**: editar la ATC los borraba en silencio. Ahora se **copia el objeto
entero** y se pisan solo los dos campos que maneja el formulario, así cualquier campo futuro
sobrevive solo. Enumerar era la trampa.

- Tests: `test_atc.js` **41 → 54**.
- Batería: **23 suites · 590 checks · 0 fallas**.

## 4bs. 🎧 El formato en papel, acotado por el dueño · el recojo no se marca (2026-09-02)

El usuario pasó el `FORMATO_ATC_2026.xlsx` real y pidió que el panel capture *"los mismos
datos... además de los datos de recojo"*. Yo listé **todo** lo que traía la hoja y me frenó
dos veces:

> *"una ATC no necesita número de factura, si te fijas es **básico** el ATC formato en excel"*
> *"no nos interesan las condiciones ambientales"*
> *"de dónde sacás que hace falta «condiciones ambientales»?"* → **de su propio Excel**, filas
> 42-44 (humedad · desnivel · tipo de somier · exposición al sol). Las listé porque estaban en
> el archivo, no porque hicieran falta. Se lo dije y quedaron afuera.

**Lección:** que un dato esté en el formato no significa que se use. Antes de portar un
formulario en papel, preguntar **qué se llena de verdad**, no transcribirlo entero.

Del Excel quedaron **solo tres cosas** —el resto (cliente, teléfono, dirección, vendedora,
producto, medida, detalle del reclamo) ya lo traía el pedido—:

| campo | por qué se queda |
|---|---|
| **Fecha de compra** | es lo que dice si hay garantía; debajo muestra *"comprado hace 2 años y 1 mes"* |
| **¿Comodín?** | aparece todo el tiempo en los datos reales (*"LLEVAR COMODIN"*); hay que recuperarlo al devolver |
| **Qué se le recoge** (colchón/sómier/patas/accesorios + nota) | la «recepción de productos» del formato: evita el clásico "faltan las patas" |

**Y quién los llena:** *"ese excel esos datos llena la vendedora"*. Yo iba a poner la
recepción en la ventana de logística; va en el formulario de carga.

**🚚 EL RECOJO NO SE MARCA.** La otra corrección, y la que más simplificó:

> *"el «recogido» es la fecha para la que se programó la recogida. No hace falta que
> logística marque recogido. Ejemplo: al llenar el formulario ponen «cargar 5/09»"*

O sea que **ya existía**: es el campo `fecha` del pedido, el mismo de cualquier entrega. Yo
había agregado una casilla y una fecha aparte — trabajo duplicado sobre un dato que ya
estaba. `atcRecogida(p)` pasó a ser `p.fecha`, se borró el paso 1 del modal (queda
informativo) y `atcFueRecogida` se deduce de si esa fecha ya pasó. La validación cambió a
"no puede volver de fábrica antes del día del viaje".

**📐 «tu ficha se ve trambólica»** — y tenía razón: yo había armado el modal a mano, sin usar
`.modal-h`/`.modal-b`, que es el molde que usa todo el resto del panel. Sin barra de título,
todo apilado en una columna con separadores punteados. Rehecha: encabezado con el degradé de
la casa, los datos en **rejilla** (`auto-fit minmax(150px)`), los textos largos solo si hay
algo que leer, y el circuito como **cuatro tarjetas** en fila. De una columna larguísima a
**687 px**.

- Tests: `test_atc.js` **54 → 66**. Fija que **no existe** casilla de recojo, que el recojo
  es `p.fecha`, y las dos transiciones por separado (volver de fábrica → *lista para
  entregar*; entregar al cliente → *cerrada*). También que **no** hay campo de factura ni de
  condiciones ambientales, para que nadie los reponga "por completitud".
- Batería: **23 suites · 602 checks · 0 fallas**.

## 4bt. 🎧 Una ATC no es una venta · el comodín parpadea · el panel de avance (2026-09-02)

**1. Sin nota de venta y sin cobro.** *"nr de nota de venta no procede al llenar una atc,
cobro tampoco"*. Se esconden `#wrap-nota` y `#wrap-cobro-todo` cuando el tipo es ATC, y la
nota deja de ser obligatoria (el formulario se trababa pidiendo un campo invisible).

El código ya le daba la razón antes de tocarlo: **`fueraDeConta` deja las ATC fuera de
Contabilidad y del Cuadre**, así que lo que se anotara ahí no aparecía en ningún total. Eran
campos decorativos. Lo verifiqué antes de esconderlos, porque en los datos de Trello hay una
ATC que dice *"EL CLIENTE PAGAR 490 BS"* — si algún día hay que cobrar una ATC, hoy no habría
dónde, y eso es una conversación aparte.

**⚠️ Esconder no alcanza.** Si alguien empieza a cargar una venta con plata y a mitad la pasa
a ATC, esos montos se guardarían igual, invisibles. Se limpian — **pero solo cuando la
persona cambia el tipo a mano** (`pintarMotivoAtc(true)` desde `setDocTipo`), **nunca** al
abrir una ATC vieja para editarla: ahí borraría en silencio lo que ya estaba.

**2. 🛏️ El comodín parpadea.** *"«con comodín» debería parpadear para alertar a logística"*.
Si no se recupera al entregar, se pierde un colchón entero. Aparece en los **tres** lugares
donde logística mira —la fila de la matriz, la ficha y la ventana de anotar avance— con
`@keyframes comodinLatido`, y un recordatorio extra dentro del paso "se le devolvió al
cliente". Respeta `prefers-reduced-motion`.

**3. 📐 «está medio raro el panel»** — el de anotar avance. Y sí: había quedado con un
**«2)» y un «3)» sin «1)»** (huérfanos de cuando saqué el paso del recojo), sin el molde
`.modal-h`/`.modal-b` que usa todo el resto, y con las fechas visibles-pero-apagadas aunque
no correspondieran. Rehecho: encabezado, sin numeración, y **los campos salen recién al
tildar la casilla**. De un bloque confuso a **494 px**.

**🐛 `test_onclicks` me agarró.** Había armado los ids por concatenación
(`id="'+pref+'-si"`), así que el literal `id="dev-si"` no existía en el archivo y el test
—que comprueba que todo id buscado por el código exista— no podía verificarlo. Se podía
"arreglar" metiendo una excepción en el test; preferí **escribir los ids enteros** aunque
repita un poco, para no dejar ciego a ese control. Mismo criterio que con `<span'+` en §4bo:
cuando el chequeo estático choca con código armado por concatenación, gana el chequeo.

- Tests: `test_atc.js` **66 → 81**. Fija que en una ATC no hay nota ni cobro, que pasar una
  venta a ATC limpia la plata tecleada, que el comodín **de verdad** parpadea (se lee
  `animationName` del elemento, no la clase en el CSS) y que el panel ya no dice «2)» ni «3)».
- Batería: **23 suites · 605 checks · 0 fallas**.

## 4bu. ⏳ El botón que parecía muerto (2026-09-03)

*"al presionar «Probar de nuevo» o «Resolver uno» no sabe si está ejecutando o en proceso,
ya que no aparece nada… pareciera como si el botón no funcionara"*.

Era exactamente eso, y el defecto era de diseño mío: `resolverCortosRev()` mandaba la
consulta, mostraba un `toast` de **2,8 segundos** y después **nada** — mientras el servidor
abre los enlaces cortos **uno por uno** con `UrlFetchApp` y tarda entre 20 s y un minuto. El
botón quedaba idéntico, el panel idéntico. Lo natural era volver a apretarlo.

**⚠️ Y apretarlo de nuevo NO era inocuo.** Medido contra la versión publicada: tres clics =
**tres consultas** de un minuto cada una, encimadas. Ese es el check que más importa del test
nuevo (`3 llamadas` contra `1`).

Lo que ahora pasa mientras el servidor trabaja:

| | |
|---|---|
| el botón | se apaga, con `.spin` y *"Consultando el servidor… N s"* |
| arriba | un bloque dice que los abre uno por uno, cuánto suele tardar y cuántos van |
| el contador | sube cada segundo — es lo que prueba que no se colgó |
| insistir | avisa *"Ya está consultando — lleva N s"* y **no** dispara otra consulta |
| el aviso viejo | se retira: dejar *"no pudo con ninguno"* durante el reintento hacía creer que ya había fallado otra vez |

**Dos decisiones que no son obvias:**

1. **Cerrar la ventana no cancela nada** — con un minuto de espera es lo más probable que
   hagan. Pero al terminar **NO se reabre sola**: saltarle una ventana encima a alguien que
   se fue a otra cosa es peor que el problema. En su lugar, el `toast` dura **8 s** (contra
   2,8) y dice dónde ver el resultado. De ahí el parámetro `ms` opcional en `toast()`.
2. **El `catch` también apaga el estado.** Sin `revTerminar()` en la rama de error, un
   servidor caído dejaba el botón apagado **para siempre** y había que recargar la página.
   Es un check propio del test.

- Test nuevo: `tests/test_ubic.js` (**27 checks**). Contra lo publicado: **16 fallas**.
- Batería: **24 suites · 632 checks · 0 fallas**.

> **Nota aparte:** el usuario confirmó que en Apps Script `probarUbicacion` corre bien y
> devuelve coordenadas (`lat -17.8481375, lng -63.261265625`), o sea que **el permiso está
> dado**. Que el panel siga marcando "0 de 15" con el servidor sano apunta a los enlaces en
> sí, no al deploy. Queda por diagnosticar con el panel ya arreglado, que ahora sí deja ver
> qué está pasando mientras consulta.

## 4bv. 🔢 Las OC repetidas gritaban para siempre (2026-09-03)

*"ESTO SIGUE SALIENDO, por más que ponga mes en curso… en teoría en septiembre no deberían
haber duplicados"*. Con captura: el aviso rojo listando **25 números, todos `08-xxx`**,
mientras el filtro estaba en septiembre.

Dos fallas encadenadas:

1. **`ocsRepetidas()` miraba TODA la planilla**, sin importar el filtro. En septiembre seguía
   gritando los repetidos de agosto.
2. **Escupía los 25 números en una línea, todos los días.** Eso es fatiga de alarma: el aviso
   rojo permanente se deja de leer, y el día que aparezca uno NUEVO va a pasar desapercibido
   — que es justo lo que el aviso venía a evitar.

Ahora: los del período que se mira, **fuertes y con los números** (plegando arriba de 8); los
de otros meses, **una línea corta con el conteo y un botón para ir**. Reusa `admIrAlMes` de
§4bo. ⚠️ Acotar no puede ser esconder — es la lección de §4bo, y el test lo fija: un repetido
NUEVO del mes en curso se ve fuerte, y los viejos siguen contados aparte sin taparlo.

**Lo primero que descarté** antes de tocar nada: que fueran **falsos positivos míos**. Al
numerar las ATC con el mismo contador mensual (§4bq), si `ocsRepetidas` comparara el número
pelado, **cada ATC saldría como duplicado de la venta del mismo número** — cientos de falsos
positivos. No pasa: compara el `oc` completo, con el prefijo `ATC ` incluido. Los 25 de
agosto son reales. Queda fijado en el test para que nadie lo "simplifique" con `ocSinPre`.

- Test nuevo: `tests/test_ocrep2.js` (**15 checks**). Contra lo publicado: **6 fallas**.
  Los meses se arman relativos a HOY para que no caduque al cambiar de año.
- Suites del panel de avisos (ocrepe, autoref, resumen, revisar, humo, tabla): **0 fallas**.

## 4bw. 🗺️ El mapa por mes y por marca (2026-09-03)

*"mapa de entrega debería poder filtrar por mes para ver dónde fueron las entregas del mes.
Así como también poder separar las entregas de Sueña (Fernando, Juan Pablo y Mauricio) y las
de Heaven (Carola, Jonathan, Mirian, Maria e Isabel), filtrando y quitando las de ROHO y
otros, **para mapear las zonas de mayor entrega**"*.

**⚠️ La última frase es la que manda**, no la primera. Filtrar por mes solo no alcanzaba: el
mapa colorea por **chofer**, y un mes entero son veinte choferes y veinte colores — el mapa
queda ilegible justo cuando más datos tiene. Por eso se agregó **colorear por ZONA**, y al
elegir «Mes» el color **pasa solo a zona** (si después lo cambian a mano, se respeta).

Y la leyenda pasó de **alfabética a por CANTIDAD, descendente**: la primera de la lista *es*
la zona de mayor entrega. Sin eso había que leer los números uno por uno.

**Lo que NO hizo falta:** un filtro aparte para sacar a ROHO. `marcaDe()` (§4bl) devuelve `''`
para quien no esté en ninguna lista, así que elegir Sueña o Heaven ya los deja fuera. Un
control menos.

- El filtro por mes corta por **fecha de entrega**, no de carga: la pregunta es *dónde fue el
  camión*, no cuándo se vendió.
- 📐 El `<input type="month">` sin `flex:none` se estiraba y ocupaba una fila entera de la
  barra. Medido en 1500 px: con `width:132px` entra todo en dos líneas.
- Test nuevo: `tests/test_mapa.js` (**22 checks**). Contra lo publicado: **18 fallas**.
  ⚠️ El fixture **esquiva el día de hoy** a propósito: sembraba entregas del 3 al 16 y el
  check de «Hoy» fallaba solo los días en que el calendario coincidía.
- Batería: **26 suites · 681 checks · 0 fallas**.

## 4bx. 🔍 La auditoría: tres bugs que ningún test miraba (2026-09-04)

*"audita que no existan errores"*. En vez de correr la batería y decir "todo verde", se hizo
una auditoría en dos capas, y **las dos encontraron cosas** que 681 checks no habían visto.

**Capa estática** (sobre el fuente, sin abrir el navegador):

| chequeo | resultado |
|---|---|
| funciones declaradas **dos veces** a nivel raíz | 🐛 `diaSemana` |
| globales `var` declaradas dos veces | ninguna |
| nombre que es a la vez `var` y `function` | ninguno |
| ids repetidos en el HTML | 🐛 `rev-elapsed` (y `rev-btn-resolver`, falso positivo: dos ramas de un ternario) |
| llamadas a funciones inexistentes (sin comentarios ni strings) | ninguna |
| `node --check` del panel y del `.gs` | OK |

**🐛 1 — `diaSemana` declarada dos veces.** Una en la línea 6569 recibía un `Date` y devolvía
`'vie'`; otra en la 8323 recibía texto ISO y devolvía `'viernes'`. En JS **la última pisa a
la primera para todos**, así que las dos llamadas que pasaban un `Date` —el panel de cupos
(`renderOcupacion`) y los encabezados de la Lista de carga— recibían `''`. **El día de la
semana llevaba semanas sin aparecer ahí** y nadie lo notó: es un texto que se deja de mirar.
La del `Date` pasó a llamarse `diaSemanaCorto`.

**🐛 2 — `rev-elapsed` duplicado (mío, de §4bu, ayer).** El contador de segundos salía dos
veces a la vez —en el botón y en el bloque— con el **mismo id**. `getElementById` devuelve el
primero, así que **el del bloque quedaba congelado en 0**. El test de ayer pasó porque leía
justamente el primero. Ahora es una clase y avanzan los dos; `test_ubic` lo fija.

**Capa dinámica — `tests/test_auditoria.js`.** Lo contrario de los otros tests: no prueba
una función, **recorre todo**. Con un pedido de cada forma (normal, pagada con flete, ATC
completa, ATC vieja sin motivo, ROHO, venta de tienda, mayorista, entregada atrasada, sin
ubicación, cobro de más, OC duplicada ×2, enlace corto, del mes que viene, de hoy) abre las
6 vistas, las 3 pestañas de Contabilidad, las 10 ventanas, y **las 7 fichas de cada uno de
los 15 pedidos**. Después de cada paso mira tres cosas: errores JS (excepción o
`console.error`), **ids repetidos en el DOM vivo**, y `onclick` que apunten a funciones
inexistentes. Y lo hace **cuatro veces**: con la llave, sin la llave, con la planilla
**vacía** (donde viven los `STATE[0].id`), y en celular (390 px, sin desborde horizontal).

**🐛 3 — `L is not defined`.** La barra del mapa se ve **antes** de que cargue Leaflet, y
«Solo sin chofer» llamaba a `showMapaView()` directo: en ese segundo o dos revienta. En el
sandbox la librería no carga nunca, así que saltó enseguida. Ahora `showMapaView` se encola
sola si `L` no está.

**⚠️ Para que el mapa quedara auditado de verdad**, el test inyecta un **Leaflet mínimo de
mentira** (`map`, `tileLayer`, `circleMarker`…): así el código de los pines se ejecuta en
vez de quedar encolado para siempre. Si usa un método que el falso no tiene, revienta y se
ve.

**Dos falsos positivos propios**, dichos para que no se repitan: el regex de `onclick` tomó
`onclick="if(…)"` como llamada a una función `if` (168 pasos en rojo de golpe — se excluyen
las palabras reservadas); y el fixture no tenía ninguna entrega de HOY, así que el Excel
«Hoy» no generaba archivo. Ninguno era del panel.

- Tests: `test_auditoria.js` nuevo (**176 checks**), `test_ubic.js` 27 → 28. Contra lo
  publicado la auditoría da **3 fallas: exactamente los tres bugs** (los dos del día de la
  semana y el de Leaflet — este último con un check que corre ANTES de inyectar el Leaflet
  falso, porque después ya no se puede provocar).
- Batería: **27 suites · 858 checks · 0 fallas**.

## 4by. 🔌 Kommo — paso 1: relevar antes de integrar (2026-09-04)

*"ahora cómo procedemos a integrar kommo"*. El obstáculo real no es el código: es que
**nadie sabe todavía cómo está armado Kommo por dentro**, y desde el sandbox no se puede
mirar (el proxy bloquea `eanez.kommo.com` con 403). Diseñar el mapeo a ciegas sería
inventarlo dos veces.

**⚠️ EL DATO QUE CAMBIÓ EL DISEÑO: el repositorio es PÚBLICO** (`visibility: public`,
confirmado por la API de GitHub). Los registros de Actions de un repo público **los lee
cualquiera**. Un inspector que volcara leads al log estaría publicando nombres, teléfonos y
direcciones de clientes en internet. Por eso `inspeccionar_kommo.py`:

- imprime **estructura**: pipelines, etapas con su id, campos personalizados con id/tipo/
  opciones, campos del contacto, catálogos y nombres de producto, vendedoras, webhooks;
- de los valores de un lead imprime solo **la forma** — *"texto de 43 caracteres"*,
  *"número de 8 dígitos"*, *"enlace"* — nunca el contenido;
- del token dice solo cuántos caracteres tiene.

`tests/test_kommo.py` lo corre contra un Kommo de mentira **cargado a propósito con datos
personales realistas** y comprueba que ninguno salga. Verificado con dientes: inyectando un
`print` del lead crudo, el test marca 3 fallas. **22 checks.**

El workflow `relevar-kommo.yml` es `workflow_dispatch` puro (sin cron) y
`permissions: contents: read` — no commitea nada, no toca nada en Kommo.

**Lo que ya se sabe y no hace falta relevar** (de §4b/§4c): los productos viven en el
catálogo como `catalog_elements` con `metadata.quantity`, y `doSave` upsertea por `id`, así
que un id `kommo-<leadId>` da idempotencia gratis — el mismo lead procesado dos veces no
duplica el pedido.

**Lo que el relevamiento tiene que decidir** (por eso se corre antes de escribir la
integración): qué etapa dispara el pedido, qué campos existen de verdad, y si el plan
permite webhooks.

**Arquitectura recomendada — CONSULTA PERIÓDICA, no webhook.** Un workflow lee cada N
minutos los leads en la etapa disparadora y los manda al Apps Script. Contra el webhook
tiene tres ventajas: no depende de que el plan de Kommo los incluya, no hay que exponer ni
asegurar un endpoint público, y el código vive en Python al lado de `generar.py`, que ya le
habla a Kommo todos los días y funciona. El costo es un retraso de minutos, que para un
pedido no es nada.

**⚠️ Y la advertencia de fondo, que ya estaba anotada desde julio:** a Kommo le faltan
*fecha de entrega, turno, zona, dirección y link de Maps*. Son exactamente los datos con los
que el panel arma la ruta, controla los cupos y decide sábados y domingos. **Un lead no
alcanza para un pedido completo.** O se crean esos campos en Kommo, o el lead entra como
**borrador** y una persona completa la entrega en el panel. Esa decisión es del usuario y
define cuánto trabajo es la fase 2.

## 4bz. 🔌 Kommo — el relevamiento corrió, y lo que dijo (2026-09-04)

El usuario corrió *Relevar Kommo (solo lectura)* (run 33893469199, ✅ 16 s).
**Verificado primero lo que importa: el registro público NO tiene ni un dato de cliente.**
Lo único que salió de un valor real fue *"texto de 16 caracteres"*.

### Lo que se supo (cuenta id=36212623)

- **Un solo embudo**: «Embudo de ventas» `id=13349719` (principal). Etapas:
  `102961055` Leads Entrantes · `102961403` Nueva consulta · `108461343` Atendido ·
  `103451379` No Responden · `102961423` Interesado · `102961411` Cotización enviada ·
  `102961407` Agendado / Visita · `103450711` Compradores ·
  **`142` «Pedido enviado – ganado»** · **`143` «Pedido cancelado – perdido»**.
- **Campos del lead que sirven**: `1685406` «Dirección entrega» (text) ·
  `1685416` «Fecha contrato» (date) · `1685408` «Método de pago» (Factura / Pago con
  tarjeta / Efectivo) · `1685418` «Pago» (Completo / Déposito) · `1685410` «Descuento»
  (5/10/15%) · `1750116` «Sucursal» (las 5 vendedoras con su tienda) ·
  `2049570` «Canal» (Facebook, **Instagram bien escrito acá**, Tiktok, Visita tienda,
  Referido, Cliente antiguo) · `1685412` «Razón de pérdida» · 12 campos `tracking_data` (utm/fbclid).
- **Contacto**: `1685346` «Teléfono» (multitext) y `1685348` «Email». **24 de 25 leads
  tienen contacto vinculado** → el celular está donde tiene que estar.
- **Catálogo «Productos» `id=10902` tipo=products** — existe, con SKU, Descripción, PRECIO,
  Grupo, External ID, Unit, Oferta especial, Precio al por mayor, Imagen.
- **Vendedoras**: `14992439` Maria Flores · `14992447` Carola Chavez · `14992455` Isabel
  Robledo · `14992463` Mirian Salazar · `15341099` Jonathan Monje · `14962271` Principal.
  **No hay usuarios de Sueña** (Fernando, Juan Pablo, Mauricio) → ese Kommo es solo Heaven.
- **⚠️ HAY UN WEBHOOK ANDANDO**: `https://tight-limit-134e.eduardoxyz22.workers.dev/kommo-hook`
  con eventos `add_message`, **`status_lead`**, `update_talk`. Es un Worker de Cloudflare del
  propio usuario. **Esto tumba la recomendación de §4by**: el plan SÍ permite webhooks, ya
  hay un endpoint escuchando cambios de etapa, y `status_lead` es exactamente el disparador
  que hace falta. Antes de elegir consulta periódica hay que preguntarle al usuario qué hace
  ese Worker.

### ⚠️ DOS ERRORES DEL PROPIO INSPECTOR — corregidos el mismo día

1. **Marcó «Leads Entrantes» como el cierre de venta.** El script leía `status.type == 1`
   como "ganado". **En Kommo `type=1` significa «sin clasificar» (Leads Entrantes)**, no
   ganado. La etapa ganada es **siempre el id `142`** y la perdida el `143`, fijos en todos
   los embudos (por eso son números chiquitos al lado de ids de 9 dígitos). Si esto no se
   agarraba, toda la integración arrancaba disparando desde la etapa equivocada.
2. **Informó «✓ fecha de entrega» cuando Kommo no la tiene.** El chequeo juntaba todos los
   nombres de campo en un solo texto y preguntaba si aparecía la palabra; **«Dirección
   entrega» contiene "entrega"**, así que daba por buenos dos casilleros a la vez. Ahora se
   mira campo por campo, se exige el tipo (una fecha tiene que ser `date`) y se imprime
   **cuál** campo dio la coincidencia, para poder auditarlo.

**Lección**: el molde de `tests/test_kommo.py` estaba mal —ponía `type:1` en «Compradores»—
y por eso el test no vio ninguno de los dos errores. Un molde que no se parece al sistema
real no prueba nada. Ahora el molde imita a Kommo de verdad (ids 142/143, un campo de texto
con la palabra "entrega" adentro) y hay regresiones explícitas para los dos errores.

### ✅ La segunda corrida (run 33894331125) — acá se decide todo

Con el inspector arreglado, las tres muestras dicen esto:

| muestra | productos | contacto | monto | Fecha contrato | Canal |
|---|---|---|---|---|---|
| 25 más nuevos (cualquier etapa) | 2/25 | 25/25 | 2/25 | 2/25 | 13/25 |
| **etapa GANADA (142)** | **0/5** | 5/5 | 2/5 | 3/5 | 1/5 |
| **«Compradores» (103450711)** | **10/25** | **25/25** | **25/25** | **25/25** | **25/25** |

**⚠️ EL DISPARADOR ES «Compradores», NO la etapa 142.** La 142 es la etapa "ganada" de
sistema de Kommo, pero **este negocio no la usa**: tiene 5 leads en toda su historia y casi
vacíos. Donde la venta queda registrada de verdad es **«Compradores»**, y ahí el dato está
completo: 25/25 con monto, fecha de contrato, canal y contacto. Coincide con lo que
`generar.py` ya asume desde siempre.

*Nota sobre §4bz punto 1: la corrección era correcta sobre cómo funciona Kommo (142 es la
etapa ganada de sistema) y equivocada sobre cómo trabaja el negocio. El dato mandó.*

**Los productos: 10 de 25 (40%).** No es cero ni es todo — las vendedoras a veces enganchan
los productos del catálogo al lead y a veces no. Cuando los enganchan, viene todo lo que
hace falta: `cantidad=1`, `cantidad=2`, `precio=sí`. **El resto del pedido llega siempre.**

**El celular: 25/25 contactos tienen Teléfono** (8 dígitos, o 11 con el 591). Nunca falta.

### ⚠️ Lo que la primera muestra NO pudo decir (por qué hizo falta correr de nuevo)

Dijo **"0 de 25 leads con productos del catálogo enganchados"**, y **solo «Sucursal» venía
llena** — ni Canal ni Fecha contrato, que `generar.py` lee todos los días sin problema. La
explicación: **`/leads` sin ordenar devuelve los MÁS VIEJOS primero**, así que la muestra
eran los primeros leads de la historia de la cuenta, casi vacíos. No decía nada de cómo se
trabaja hoy. Corregido: ahora pide `order[id]=desc` y mira **tres** muestras — los 25 más
nuevos, los 25 más nuevos **ya ganados (etapa 142)** ← la que decide, y los 25 más nuevos en
«Compradores» — más una muestra de contactos para ver si el celular viene cargado.

### Mapeo Kommo → pedido — CONFIRMADO con datos

Disparador: el lead entra a **«Compradores» (`103450711`)** del embudo `13349719`.

| Campo del panel | De dónde sale | Llega |
|---|---|---|
| cliente | `lead.name` / contacto vinculado | 25/25 |
| celular | contacto, campo `1685346` | **25/25** |
| vendedor | `responsible_user_id` (o «Sucursal» `1750116`) | siempre |
| canal | campo `2049570` | **25/25** |
| monto de la venta | `lead.price` | **25/25** |
| fecha de la venta | campo `1685416` «Fecha contrato» | **25/25** |
| dirección | campo `1685406` «Dirección entrega» | a veces |
| productos (código + cantidad + precio) | `catalog_elements` + `metadata.quantity` | **10/25 (40%)** |
| forma de pago | `1685408` «Método de pago» + `1685418` «Pago» | a veces |
| **fecha entrega, turno, zona, Maps, N° nota** | **no existen en Kommo** | nunca |

**Idempotencia**: `doSave` upsertea por `id`, así que `id = 'kommo-<leadId>'` hace que el
mismo lead procesado dos veces no duplique el pedido. No hace falta tocar el Apps Script.

## 4cb. 🛡️ Corregir un pedido borraba pagos, recibos y fotos (2026-09-04)

Reportado por el dueño con capturas, en medio de otra tarea: *"algo importante y un bug
grave! cuando un vendedor corrige un precio o algo se borran los archivos subidos y pagos
realizados"* y *"cuando marcan pagado, y suben los respaldos sale esa alerta abajo, y si
corrigen esa alerta se borra todos los pagos hechos"*.

Eran **tres bugs encadenados**. Los tres reproducidos con Playwright **antes** de tocar
nada — y el primer intento de reproducción dio un falso "✓ las fotos se conservaron"
porque escribí el historial de pagos a mano y `anticipoDe()` leyó 0: el molde tiene que
armarse con `textoCobros()`, la función del propio panel.

### 1 · La falsa alarma

Al marcar «SÍ, pagado» en el formulario, el pago entero se guarda como **ANTICIPO en el
historial** y `p.acuenta` queda en **0** — a propósito, está comentado en `submitPedido`.
Pero `ctaEditHtml` sembraba el campo «A cuenta» desde `p.acuenta` y `ctaRecalc` calculaba
`total = acuenta + totalCobrado + saldo`. Como `cobrosDe()` **excluye el anticipo** por
diseño, una venta de **Bs 16.920 ya cobrada** daba total **Bs 0** y avisaba:

> ⚠️ Los precios suman Bs 16.920,00 — hay Bs 16.920,00 de más que el total.

Sobre una venta perfecta. `ventaTotal()` siempre estuvo bien porque lee `anticipoDe()`;
este panel era el único que se lo perdía.

### 2 · Y «corregir» esa alerta borraba el pago

`ctaGuardarMontos` compara el campo con `anticipoDe(p)`. Como el campo decía 0 y el
anticipo real era 16.920, **cualquier guardado desde ese panel reescribía el historial**, y
en `aplicarMontos` el renglón del anticipo solo se conserva `if(acu>0)` → con 0 **el pago y
sus dos comprobantes desaparecían**, sin una sola pregunta, y la venta volvía a figurar por
cobrar.

**⚠️ Lo más grave, que el test destapó y yo no había visto:** no hacía falta tocar los
montos. **Corregir SOLO un precio ya borraba el pago**, porque el guardado reescribe el
historial igual. El check «⚠️ el pago no se movió» da `Bs 0` contra la versión publicada.

### 3 · Editar desde el formulario borraba las fotos de la entrega

`rec` se arma **de cero enumerando campos**, y `fotos` (columna 29, las que sube el chofer
como prueba de entrega) **no estaba en la lista**. `recToRow` escribía la celda vacía y las
imágenes quedaban huérfanas en Drive. Corregir una dirección bastaba. Nadie se enteraba
hasta que alguien reclamaba una entrega y la prueba ya no estaba.

### Los arreglos

1. `ctaEditHtml` siembra «A cuenta» desde `anticipoDe(p)`, la misma fuente que `ventaTotal()`.
2. `ctaGuardarMontos` **pregunta** antes de bajar o borrar un anticipo registrado, diciendo
   cuánta plata se va, cuántos comprobantes tiene, y *"si solo querías corregir un PRECIO,
   cancelá y tocá únicamente el precio"*.
3. `rec` lleva `fotos: prev ? fotosDe(prev).slice() : []`, **y** —esto es lo que importa a
   futuro— un **rescate general**: `if(prev){ for(var _kr in prev){ if(!(_kr in rec)) rec[_kr]=prev[_kr]; } }`.

**La lección, que ya se pagó tres veces (§4bt fue la primera): enumerar campos a mano no
escala.** Cada campo que alguien agregue a la planilla y olvide agregar a `rec` se borra en
silencio al editar. El rescate general lo cubre solo. Lo que el formulario SÍ maneja ya
está en `rec` y no se pisa — `test_noborra.js` §5 y §6 lo comprueban: lo corregido gana, y
un pedido nuevo no hereda nada de otro.

### El test

`tests/test_noborra.js` — **35 checks**. Verificado con dientes: contra `origin/main`
marca **16 fallas**; con el arreglo, 0. Cubre la falsa alarma, el aviso antes de borrar,
que cancelar deje todo intacto, que corregir solo un precio no toque la plata, que editar
por el formulario conserve fotos/pagos/recibos/NIT/**un campo inventado que el formulario
no conoce**, y que un pedido nuevo nazca limpio.

## 4ca. 📥 Borradores de Kommo — la bandeja (2026-09-04, EN CURSO, sin publicar)

*"ok ejecuta y muestrame como quedaria antes de publicarlo y subirlo"*, después de
*"¿y cómo sabrá cada vendedor cuál es su borrador? se mezclarán y aparecerán de todos"*.

**No se mezclan** porque la bandeja vive **dentro de «Mis pedidos»**, que ya es una pantalla
personal: cada vendedora elige su nombre una vez y el celular se lo acuerda. Kommo siempre
dice de quién es cada venta (`responsible_user_id`), así que el borrador nace con dueña.

**La invariante, y cómo se sostiene:** un borrador **no es un pedido** — no ocupa cupo, no
le aparece al chofer, no entra al cuadre, ni al mapa, ni a Contabilidad. Eso **no** se
consigue poniendo `if(!esBorrador(p))` en cuarenta pantallas: se consigue sacándolos de
`STATE` dentro de **`leerCierresDeLista`**, el único embudo por el que pasa toda lista que
llega (espejo local y servidor). Si un borrador aparece donde no debe, el problema está
ahí, no en la pantalla donde se vio.

- Marca: `estado = 'Borrador Kommo'`. **No** la falta de fecha: una venta de tienda también
  va sin fecha y se confundirían.
- Id: `kommo-<id del lead>` → como `doSave` upsertea por id, el mismo lead procesado dos
  veces no duplica el pedido.
- Al completarlo conserva ese id pero deja de ser borrador **solo**: `submitPedido` arma
  `estado` desde el pedido anterior, y como los borradores no están en `STATE` no hay
  anterior. Requirió un arreglo: `nroDia`/`ts` se heredaban del anterior y con `isEdit`
  sin `prev` quedaban en **0** — el pedido salía fuera del orden de carga del camión.
- Nombres: Kommo dice «Maria Flores - Buenos Aires» y el panel «Maria Flores».
  `vendedorDeBorrador()` le saca la sucursal; sin eso no le aparecería a nadie.
- Sin dueña (responsable = la cuenta genérica) → bandeja aparte en **Administración**.
- A los 3 días el borrador se pinta en rojo: una venta vieja sin cargar es una venta que
  quizá ya se entregó.

### ⚠️ Primero el panel, después Kommo — la misma venta cargada dos veces

Pregunta del dueño, y es la que faltaba: *"¿y si primero llenan el panel y luego el Kommo?
¿les aparecerá el borrador de algo que ya tenían creado?"*. **Sí, aparecía** — y es el orden
que van a usar la mitad de las veces, porque la vendedora carga el pedido para que salga el
camión y recién después acomoda el lead.

Por id es indetectable: el pedido a mano tiene id propio y el borrador `kommo-<lead>`. Lo
que sí comparten es **el celular**, que está en 25/25 contactos de Kommo y es obligatorio
en el panel. `telClave()` compara los **últimos 8 dígitos**, así que `+591 70863187` y
`70863187` son el mismo.

**Y no se decide solo.** Un cliente que compró en marzo y vuelve en septiembre daría el
mismo celular sin ser la misma venta. Por eso hay una **ventana de 45 días** y, si algo
aparece, **se le pregunta a la vendedora** mostrándole el pedido que ya tiene —su nota, su
fecha de entrega, su monto— con «Ver el que tengo» para comparar. Equivocarse no cuesta
nada: dice «No, es otra venta» y sigue. El fallback, si no hay celular, es nombre +
vendedora; el celular siempre gana.

Al decir «Sí, es la misma», el pedido que YA existe se queda con la marca del lead
(`klead`, adentro de `_productos_json`, la columna que ya lleva `precio`, `mod` y `atc`) y
el borrador se descarta. **Esa marca es la que evita que el robot lo vuelva a traer.**

**→ Requisito para la fase 3 (el robot):** antes de crear un borrador tiene que saltear el
lead si existe un pedido con id `kommo-<lead>` **o** con `klead` igual a ese lead.

### 🔍 Las comprobaciones antes de guardar

*"¿qué otras comprobaciones podemos agregar? porque colocar esto y que haya errores es
grave"*. La respuesta empieza por lo que **no puede pasar**:

1. **El robot solo crea borradores.** Nunca toca un pedido que ya existe.
2. **Un borrador nunca se vuelve pedido solo**: alguien tiene que apretar Guardar.

Con eso, el peor error posible es una tarjeta de más en la bandeja, y se descarta con un
clic. El resto es para que además no se cargue mal:

| Comprobación | Por qué importa |
|---|---|
| Producto que **no está en el catálogo del panel** (250 códigos) | El almacén no sabría qué sacar. **Va a pasar**: el catálogo de Kommo tiene cosas como «JUEGO DE SABANAS TEKA» que en el panel no existen |
| **El código no coincide** con la descripción | Se cargaría otro colchón |
| **Precio fuera de lo normal** (mediana de las últimas ventas del mismo código) | Agarra el cero que falta: 651 en vez de 6.510 |
| **Los productos no suman** lo que dice Kommo | Error de facturación (avisa que puede ser un descuento) |
| **Cantidad imposible** (0, negativa, >20) | Typo |
| **Celular que no sirve** (8 dígitos que empiecen en 6 o 7) | El chofer no puede avisar que llega |
| **El cliente debe plata** de otra venta | Que el chofer cobre |
| **El cliente tiene una ATC sin cerrar** | Puede tener que ver con esta venta |

**⚠️ Todo AVISA, nada BLOQUEA.** Un aviso que frena a la vendedora cuando el dato estaba
bien es peor que el error que evita: dejaría de usar la bandeja y volvería a cargar todo a
mano. Un producto correcto no genera **ningún** aviso (hay un check para eso).

### 📍 Lo que el panel llena solo

**De una entrega anterior al mismo cliente (por celular): zona, dirección, Maps, NIT y
«facturar a».** Son exactamente los tres datos que Kommo **no tiene** — el mayor ahorro
disponible, y sale del propio historial del panel, sin depender de Kommo. Entra como
sugerencia y la tarjeta lo dice antes de abrir el formulario.

**Los productos se normalizan contra el catálogo del panel**: si el producto de Kommo
existe acá, entra con el código, la descripción y la medida como las conoce el almacén
(`buscaCatalogo` busca por código y, si no, por descripción + medida).

**La fecha de entrega sigue vacía a propósito.** Eso no se adivina, y es lo único que de
verdad tiene que poner la vendedora.

### ⏱️ La vendedora no tiene que esperar nada

*"¿y qué pasa si un vendedor llena Comprador en el CRM y a los 30 segundos va al panel? No
le va a aparecer, ¿no?"*. **No le aparece**: el robot le pregunta a Kommo cada varios
minutos, no al instante. Y el panel **no puede** preguntarle solo —el token es un secret de
GitHub Actions y la página es pública; meterlo ahí sería regalarlo—.

**El riesgo no es el retraso** (la entrega es para mañana) **sino que se quede mirando una
bandeja vacía pensando que se rompió**, o que espere en vez de cargar. Por eso, cuando no
hay borradores, «Mis pedidos» muestra una línea sola: *el panel revisa cada pocos minutos,
no la esperes — cargala como siempre; si después llega de Kommo, el panel se da cuenta de
que ya la tenías*. Que es exactamente lo que hace `gemeloDe()`.

El orden natural (**panel primero, Kommo después**) sigue siendo el bueno. La bandeja es la
red que agarra las que se le pasaron, no un paso obligatorio.

`tests/test_borradores.js` — **80 checks**, 0 fallas.

## 4cc. ⚡ El aviso instantáneo de Kommo (2026-09-04)

El dueño insistió tres veces con lo mismo, y tenía razón: *"un vendedor carga en Kommo y al
minuto se va al panel… no le va a aparecer, ¿no?"*. **Si tiene que esperar, no lo usa.** Y
si no lo usa, la bandeja solo sirve para las ventas que carga al día siguiente — la mitad
del valor.

Kommo **sí** avisa al instante: el Worker de Cloudflare del usuario lo demuestra (recibe
`status_lead` en segundos). El problema nunca fue Kommo, era por dónde entra ese aviso.

### La decisión: webhook nuevo → Apps Script, y repaso como red

Se descartó **usar el Worker existente**: hoy mide el tiempo de primera respuesta, su código
vive en Cloudflare y desde acá no se puede ver ni probar. Tocarlo pondría dos trabajos
importantes en la misma canasta. Además el usuario avisó que le preocupaba el cupo de
llamadas de Cloudflare — **este camino no le suma ni una**: Kommo permite varios webhooks y
el nuevo apunta a Google, no a Cloudflare.

Se descartó **solo el repaso periódico**: es exactamente lo que él objetaba.

**⚠️ El repaso NO es opcional aunque el webhook ande.** Los webhooks se pierden —Kommo falla
un envío, Google está caído medio minuto, la red se corta— y sin red de seguridad esa venta
desaparecería hasta que el cliente reclame. `traer_kommo.py` corre cada 10 minutos con una
ventana de **30** (más ancha que el intervalo a propósito: si una corrida falla, la
siguiente alcanza a las que se le pasaron) y llama al **mismo** camino que el webhook
(`action:'kommoLeads'`), así que hay **una sola implementación del borrador**.

Si el repaso empieza a crear borradores seguido, el webhook no está andando: el registro lo
dice explícitamente.

### Lo que el backend hace, y lo que NO hace

- **NUNCA toca una fila que ya existe.** Solo agrega, y solo si el lead no está cargado
  (por id `kommo-<lead>` o por la marca `klead` que deja el panel). El peor error posible es
  una fila de más, que se descarta con un clic.
- **El borrador va con la FECHA VACÍA.** Ahí está la seguridad de fondo: `doSave` mira
  `p.fecha` para el portero de cupos y el de días cerrados, así que sin fecha **no ocupa
  lugar en ningún camión** ni le aparece al chofer. Con fecha sería un pedido fantasma en la
  ruta de mañana.
- **Sin clave configurada no acepta nada.** La dirección del Apps Script está dentro de
  `pedidos.html`, que es una **página pública**: sin clave, cualquiera podría meter pedidos
  falsos en la planilla. Falla cerrado a propósito.
- El celular sale del **contacto** (Kommo no lo tiene en el lead), los productos del
  catálogo `10902`, y a la vendedora se le saca la sucursal («Mirian Salazar - Mia Plaza»).

### ✅ CONFIGURADO Y ANDANDO — 2026-09-04 21:38 UTC

El usuario hizo los cuatro pasos. La primera corrida del repaso
(run **33921976316**, `workflow_dispatch`) lo confirma todo de una:

```
leads en la ventana: 3
borradores NUEVOS creados: 2 de 3
```

Eso prueba **tres cosas a la vez**: Kommo contesta, el Apps Script `2026-09-04-a`
**está publicado** (si no, la llamada habría rebotado), y la clave coincide (si no, habría
devuelto «clave incorrecta»). El «2 de 3» prueba además que la deduplicación anda: la
tercera venta ya estaba cargada.

**El aviso «estos los perdió el webhook» en esta primera corrida es normal**: esas ventas
pasaron a «Compradores» *antes* de que existiera el webhook. De acá en adelante, si ese
aviso aparece seguido, el webhook no está entrando.

El panel muestra el cartel de versión en **verde** (confirmado por el usuario).

**✅ El webhook también quedó confirmado**: el usuario movió un lead de prueba a
«Compradores» y apareció solo en la bandeja, sin correr nada. **La integración está
completa y andando.**

### ⚠️ Lo que enseñó la primera venta real: Kommo escribe todo junto

El producto llegó como **«TITANIO LATEX Med.Esp. 3.0PLZ 180X200CM»** y el panel avisó
*"no está en el catálogo"*. **TITANIO LATEX sí está** — lo que pasa es que el panel guarda
producto y medida **por separado** y Kommo los manda pegados, con ruido en el medio
(`Med.Esp.`, `3.0PLZ`) y a veces el color al final (`- PLOMO CL`).

Comparando el texto entero **nada** coincidía, así que ese aviso iba a saltar en casi todas
las ventas. **Eso es peor que no avisar**: la vendedora aprende a ignorarlo y el día que el
aviso sea de verdad, tampoco lo mira.

Ahora `buscaCatalogo()` primero **parte el nombre**: `medidaDeTexto()` saca la medida
(«180X200CM» → `180x200`) y `limpiaNombreProd()` limpia el resto. Y aparece un tercer
resultado además de "está" / "no está":

- **`medida-especial`** — el producto existe pero **no en esa medida**. Acá se hacen
  colchones a medida seguido, así que **no es un error**: es un dato que producción tiene
  que saber. Sale como aviso suave: *"📐 Medida especial — TITANIO LATEX en 180x200… va a
  fábrica como pedido a medida"*.
- **⚠️ Y en ese caso NO se copia el código del catálogo**, porque el que hay es el de
  **otra** medida (CH1131 es 180x190, no 180x200) y el almacén sacaría el colchón
  equivocado.

«JUEGO DE SABANAS TEKA» sigue avisando que no está, porque de verdad no está.

### Los pasos de configuración (por si hay que rehacerlos)

`SCRIPT_VERSION` = `2026-09-04-a`

Es la primera vez desde el 22/08. Pasos, en orden:

1. **Apps Script → ⚙️ Configuración del proyecto → Propiedades del script**, agregar:
   `KOMMO_TOKEN` (el token largo), `KOMMO_HOOK_KEY` (una clave inventada y larga),
   y opcionalmente `KOMMO_SUBDOMAIN` (`eanez`) y `KOMMO_ETAPA` (`103450711`).
   **⚠️ El token NO va en el código: el repositorio es público.**
2. **Implementar → Administrar implementaciones → ✏️ → Nueva versión → Implementar.**
3. **Kommo → Configuración → Integraciones → Webhooks → Agregar**: la URL `/exec` del panel
   con `?k=<la misma KOMMO_HOOK_KEY>`, evento *«Etapa del lead cambiada»* (`status_lead`).
   **Es un webhook NUEVO**: el que apunta a Cloudflare no se toca.
4. **Secrets de GitHub** para el repaso: `KOMMO_HOOK_KEY` y `PANEL_URL` (la misma URL `/exec`).

Hasta que 1 y 2 no estén, el panel va a mostrar el aviso de versión vieja.

### Los tests

- `tests/test_hook.js` — **49 checks**. Carga el `.gs` en Node con Google simulado (planilla
  en memoria, Kommo de mentira, propiedades de mentira). Comprueba lo que más importa: que
  **no toque la fila que ya existía** (se compara byte a byte), que la fecha vaya vacía, que
  sin clave o con clave equivocada no escriba nada, que el mismo lead dos veces no duplique,
  que reconozca la marca `klead`, que si Kommo no contesta no deje una fila a medias, y que
  `list`/`save`/`delete` sigan funcionando igual.
- `tests/test_traer.py` — **19 checks**. Kommo de mentira con datos personales realistas:
  ninguno sale al registro público, y tampoco el token, la clave ni la dirección del panel.
  Verificado con dientes: inyectando un `print` del lead crudo, marca 2 fallas. Comprueba
  además que al panel le manden **solo ids**, nunca nombres ni teléfonos.

## 4cd. 👯 El aviso de duplicada no decía qué ni con quién (2026-09-04)

Reportado por el dueño: *"el bot que revisa duplicados solo dice «pepito está duplicado»,
pero no dice QUÉ está duplicado —si el n° de nota, el comprobante— y CON QUIÉN. Pasé 10
minutos buscando qué salía duplicado y resulta que pepito y juanito tenían el mismo número
de nota."*

**El sistema sabía las dos respuestas y no las mostraba.** Dos fallas del mismo tipo:

1. **El chip.** `dupChip()` pintaba «⚠️ ¿DUPLICADA?» y el motivo vivía en el atributo
   `title`, o sea **en el globito del mouse**. En el celular —que es donde miran esto— el
   globito **no existe**. Además `marca[p.id]` guardaba solo el motivo (`'nota'`), un texto:
   el grupo con los otros pedidos se calculaba y se tiraba.
2. **El detalle de la auditoría.** Nombraba solo `g.ps[0]`, la primera del grupo. Con
   PEPITO y JUANITO compartiendo la nota 645 decía literalmente
   `"PEPITO PEREZ · Bs 3.400,00 · 2 veces (misma nota 645)"` — **Juanito no aparecía**.

**Arreglo.** `marca[p.id]` ahora guarda `{motivo, clave, otros:[...]}` con el grupo entero,
así el chip dice las tres cosas y se puede tocar para ir a la otra venta:

> ⚠️ ¿DUPLICADA? misma **nota 645** que **JUANITO GOMEZ**

Y el detalle de la auditoría nombra a **todos** los del grupo:
`misma NOTA 645:  PEPITO PEREZ  ↔  JUANITO GOMEZ`.

**La lección**: un aviso que obliga a buscar a mano lo que el sistema ya calculó es medio
aviso, y entrena a la gente a no mirarlo. Ya había un comentario en el código diciendo
justo eso sobre el aviso de huecos del talonario (*"listarlos ensucia el aviso — que es
exactamente lo que le pasaba al de duplicados y por lo que nadie lo miraba"*): el problema
era el mismo y estaba escrito ahí.

**Y el chip distingue los dos casos**, porque el dato útil no es el mismo:
- **misma nota** → los clientes son distintos, lo que hace falta es **quién**:
  *«misma nota 645 que JUANITO GOMEZ»*.
- **mismo cliente y monto** → el cliente ya está en la fila, repetirlo no aporta; lo que
  sirve es **cuándo**: *«otra igual de Bs 2.000,00 el 13/08»*.

**⚠️ Y una regresión mía que atrapó `test_revisar.js`:** al reescribir el detalle para
nombrar a los dos en el caso de la nota, **le saqué el nombre del cliente al otro caso** y
cambié «nota» por «NOTA», rompiendo cuatro checks que ya existían. Es exactamente para eso
que están. Quedó anclado también en el test nuevo.

`tests/test_dupaviso.js` — **18 checks**. Con dientes: contra `origin/main` marca **8
fallas**. Comprueba que el chip diga qué coincide, cuál es el valor y con quién; que lleve
a la otra venta sin abrir también la fila; y —mirando el bloque de `cuadreAlertas`, **no**
el texto de la pantalla, porque los nombres también están en la tabla y el check pasaría
en falso— que el detalle nombre a los dos.

## 4ce. 🛡️ La auditoría del servidor: cinco agujeros confirmados (2026-09-05)

El dueño trajo una tabla con cinco errores **confirmados y reproducidos** en el backend
(`google-apps-script.gs`). Los cinco se verificaron contra el código antes de tocar nada:

| Prioridad | Error | Dónde estaba |
|---|---|---|
| **Crítica** | Consultar, guardar y borrar pedidos no exigía autenticación. Solo Kommo verificaba una clave. | `doPost`: `list`/`save`/`delete`/`foto`/`borrarFoto`/`geocode` abiertos; `doGet` volcaba la planilla entera. |
| **Crítica** | `borrarFoto` aceptaba cualquier id sin comprobar que fuera una foto de entrega, y contestaba «ok» aunque fallara. | `DriveApp.getFileById(id).setTrashed(true)` en un `try{}catch(e){}` vacío. |
| **Alta** | Cada edición reemplazaba la fila entera sin mirar si alguien la había cambiado. **Un cambio de chofer pisaba un pago reciente.** | `doSave` → `recToRow(p)` → `setValues` sin ninguna comparación. |
| **Alta** | Los porteros de cupos y días cerrados solo miraban pedidos nuevos. Mover uno a domingo entraba. | `if (foundRow < 0 && ...)` en los dos porteros. |
| **Alta** | El servidor aceptaba OC repetidas. | No había ningún chequeo; el panel solo avisaba después (§4bv: 25 en agosto). |

**Por qué el primero era el peor.** La contraseña de administración es un hash **solo del
lado del navegador** (`tryUnlock`, `sha256(pass)===stored`): el servidor nunca la ve.
Y la dirección `/exec` del script está en la línea 1145 de `pedidos.html`, que es una página
**pública en GitHub Pages**. Con solo mirar el código fuente, cualquiera podía bajar nombres,
celulares y direcciones de todos los clientes —o borrar la planilla— sin ninguna contraseña.

### Los cinco arreglos

**1. 🔐 La clave del equipo (`PANEL_KEY`).** Una propiedad del script. Con ella configurada,
`doPost` exige `body.key` para todo lo que no sea Kommo (que tiene SU clave aparte,
`KOMMO_HOOK_KEY`), y `doGet` exige `?k=`. **⚠️ Sin `PANEL_KEY` configurada el servidor sigue
ABIERTO como antes — a propósito**: si fallara cerrado, publicar esta versión dejaría a todo
el equipo sin poder trabajar hasta que alguien configure la propiedad, y la última vez el
dueño se perdió en esos pasos. A cambio, cada respuesta lleva `auth:'abierto'|'clave'` y el
panel lo muestra **en rojo en Administración** hasta que se configure.
Del lado del panel: la clave se guarda **una vez por dispositivo** (`LS_CLAVE`) y viaja en
cada `apiPost`. Si el servidor contesta `error:'clave'`, se trata **como si no hubiera red**:
`apiPost` rechaza la promesa, los guardados van a la cola de siempre y el cartel de conexión
muestra el botón **🔐 Ingresar clave**. Al ingresarla, `flushPending()` manda lo acumulado.
**Nada se pierde y nada se descarta.**

**2. 🗑️ `borrarFoto` mira la carpeta.** Recorre `getParents()` del archivo y solo lo manda a
la papelera si uno de ellos es «Fotos entregas MultiEspumas». Cualquier otra cosa →
`error:'no_es_foto'`. Y cualquier fallo se devuelve como fallo: `apiBorrarFoto` en el panel
ahora avisa *«La foto salió del pedido, pero no se pudo borrar de Drive»*.

**3. 🤝 El sello de revisión (columna 30, `Revisión`).** El servidor pone `rev` en cada
guardado y lo devuelve; el panel lo guarda (`aplicarSello`) y lo manda en el próximo. Si el
`rev` que llega no es el de la hoja → `error:'conflicto'` **con la fila actual adentro**, para
que el panel la muestre en vez de la vieja. Reglas de compatibilidad, para no dejar a nadie
sin trabajar: si el panel **no manda** `rev` (versión vieja cacheada) o la fila **nunca tuvo**
sello (todas las de antes de hoy), pasa.

⚠️ **El detalle que hacía o rompía todo: el sello que se manda al editar es el de cuando se
ABRIÓ el formulario (`EDIT_REV`), no el de `prev` al guardar.** `prev` se lee al momento de
guardar (`findById(EDIT_ID)`), y la pantalla se refresca sola cada 2 minutos: si en el medio
contabilidad registró el pago, `prev` traía el sello NUEVO —y el servidor lo aceptaría— con
los valores VIEJOS de plata que seguían en el formulario. `_plataIgual` compara el formulario
contra `prev`, así que los habría mandado. Con el sello de la apertura, ese guardado choca,
y el formulario **se vuelve a abrir con los datos nuevos** (`editPedido`/`completarBorrador`).
La persona rehace su cambio en diez segundos; el pago no se pierde nunca.

**4. 🚪 Mover pasa por el portero.** `porteroFecha_` (la lógica de antes, extraída) corre
para un pedido nuevo con fecha **y** cuando uno existente cambia de fecha o de turno,
excluyéndose a sí mismo de la cuenta y reasignando el N° del día si cambió el día.
Corregir un precio en un día cerrado **no** es mover y sigue entrando. Completar un borrador
de Kommo (fecha vacía → fecha) sí pasa por el portero, que es lo correcto.
`body.forzar`: el panel lo manda **solo** cuando quien tiene la clave de administración
confirmó el aviso (formulario con `UNLOCKED` moviendo fecha/turno; «Reprogramar» con
avisos confirmados). Es la que arma el camión y puede meterle un bulto más a sabiendas.

**5. 🔢 OC repetida, dentro del lock.** `ocRepetidaGs_` compara el texto **completo** (con
el «ATC » incluido, como §4bv) y el **año de carga** (`ts`): el correlativo arranca de nuevo
cada año y «08-001» de 2027 no choca con la de 2026. Dos comportamientos:
- Número **generado por el panel** (`MM-NNN` o `ATC MM-NNN`) en un pedido **nuevo** que
  choca → se le da **el siguiente libre de su serie** y se devuelve `ocCambiada:{de,a,con}`;
  el panel cambia la OC del pedido y avisa 9 segundos. Es el cierre atómico de las 25 de
  agosto: la ventana de horas de §4bv pasó a ~1 s con la bajada previa, y ahora a cero.
- Número **escrito a mano** (ROHO manda el suyo) o **cambio de OC en una edición** que
  choca → `error:'oc_repetida'` con quién y cuándo; el formulario marca el campo.
- Editar un pedido **sin cambiarle** la OC entra siempre, aunque esa OC ya estuviera
  repetida de antes: las repetidas viejas se corrigen, no se traban.

### Lo que casi sale mal, del lado del panel

Dieciséis lugares llaman a `apiSave` y casi todos hacen `if(!ok) queuePending(p)`. Con los
rechazos nuevos, eso reencolaba un «no» firme y lo reintentaba **para siempre** —un zombi en
el pie del panel, y en el caso del conflicto, **reintentar es exactamente pisar el pago**.
Se resolvió en un solo lugar: `apiSave` anota el id en `NO_ENCOLAR` ante `conflicto`,
`cupos_llenos`, `dia_cerrado` u `oc_repetida`; `queuePending` lo respeta 10 segundos y
`flushPending` saca de la cola lo que vuelve con un «no» firme. `test_conflicto.js` atrapó
además que si `refrescarEstado()` lanza dentro de `rechazoFirme`, la promesa de `apiSave` se
rechaza y la cola lo reencolaba igual — quedó en `try`.

### Tests

- `tests/test_servidor.js` — **60 checks**, carga el `.gs` con un Google de mentira
  (planilla, Drive con un archivo ajeno, propiedades). Contra el `.gs` de `origin/main`
  (`GS=viejo.gs node tests/test_servidor.js`) falla en todo lo que tiene que fallar.
- `tests/test_conflicto.js` — **31 checks** en Chromium, con `fetch` interceptado: la clave
  viaja, el rechazo encola sin perder, el botón aparece, el sello se guarda, el conflicto
  reemplaza y no reencola, el sello de la apertura gana al del refresco, el formulario se
  reabre con lo nuevo, la OC corregida se refleja, reprogramar confirmado manda `forzar`.
  Contra `origin/main`: `pedirClaveEquipo is not defined`.
- `test_hook.js`: un check comparaba la versión exacta; pasó a `>=`.

### ⚠️ Orden de despliegue (el `.gs` lo publica el dueño a mano)

1. Publicar el panel (hecho en este commit). Con el `.gs` viejo todo sigue igual; el panel
   muestra «versión vieja» hasta el paso 2.
2. Pegar el `.gs` nuevo → **Implementar → Administrar implementaciones → ✏️ → Nueva versión
   → Implementar.** Desde acá: conflictos, porteros al mover, OC y `borrarFoto` ya rigen.
   El servidor sigue abierto y Administración lo dice en rojo.
3. **Propiedades del script → `PANEL_KEY`** = una clave larga inventada. Desde ese instante
   cada dispositivo pide la clave una vez (botón 🔐 en el cartel de conexión); lo que
   guarden mientras tanto queda en la cola y entra al ingresarla.
   Para mirar la planilla desde el navegador: `…/exec?k=LA_CLAVE`.
   **En el mismo paso, `ADMIN_KEY`** = otra clave, solo para los dispositivos de
   administración (botón 🛡️): sin ella, con la puerta con llave nadie puede forzar un
   pedido a un día cerrado o turno lleno (§4cg).

## 4cf. ⏱️ El repaso «cada 10 minutos» corría cada 3,5 horas, y su ventana era de 30 (2026-09-05)

Al buscar cómo verificar desde afuera que el dueño publicó el `.gs` (el sandbox no llega a
Google), miré las corridas de `traer-kommo.yml`: **05:16, 09:08 y 12:41 UTC**. El cron dice
`*/10 * * * *`, pero GitHub demora los crons frecuentes en repos gratuitos: **una corrida
cada ~3,5 horas**, y a veces salta una. `traer_kommo.py` miraba **30 minutos** hacia atrás,
elegidos con la idea de «más ancho que 10 minutos». Resultado: **la red de seguridad no
alcanzaba a nada** que el webhook hubiera perdido más de media hora antes de la corrida.

- `VENTANA_MIN` pasó a **12 horas** (cubre dos corridas salteadas) y `TOPE` a 100 (lo que
  acepta `kommoLeads`). Repetir no cuesta: el panel descarta lo que ya tiene.
- El script ahora le avisa al panel **siempre**, aunque no haya ids (con lista vacía no toca
  nada), e imprime **`servidor del panel: versión …`**. Es la única forma de ver desde acá
  qué Apps Script está publicado; la versión no es dato de nadie.
- `test_traer.py` exige ventana ≥ 8 h y la línea de versión (20 checks).

**Lección**: la cadencia de un cron se mira en las corridas, no en el yml. El «cada 10
minutos» de §4cc era una suposición escrita como hecho.

## 4cg. 🛡️ La segunda auditoría: dos P1 que yo mismo dejé, un contador, y la venta que Kommo no avisó (2026-09-05)

El dueño trajo un segundo informe externo (revisión del panel publicado, commit `1403f45`),
con 120 comprobaciones pasadas y tres hallazgos de código. Los tres eran ciertos.

**P1 — «Una copia antigua sin revisión todavía puede sobrescribir un pago».** Exacto: en
§4ce dejé pasar los guardados sin `rev` «para no trabar a un panel viejo cacheado». El
auditor lo reprodujo: bastaba **omitir** el sello para pisar el pago igual. Y el panel viejo
que más daño hace es justo el de la pestaña abierta desde ayer — el escenario de la
copia vieja. Ahora: fila sellada + guardado sin sello = `conflicto`. Siguen pasando: el
**primer** guardado de una fila que nunca tuvo sello (todas las de antes de hoy), y las
**filas del sistema** (`__dias_cerrados__`, `__arqueo_cuadre__`), que se reescriben enteras
a propósito y las maneja una sola persona. Un panel viejo que reciba el rechazo lo muestra
como «el servidor NO aceptó» (formulario) o lo deja «sin enviar» hasta recargar la página;
al recargar, el panel nuevo lo saca de la cola con aviso. Se pierde ese cambio, no el pago.

**P1 — «Forzar una fecha cerrada no exige autorización administrativa en el servidor».**
También exacto: `body.forzar` pasaba con solo la clave del equipo, que dice «sos del
equipo», no «sos administración» (la contraseña de Administración es un hash en el
navegador; el servidor nunca la vio). Arreglo: una segunda propiedad, **`ADMIN_KEY`**, y
`forzarOk_()`:
- **Puerta abierta (sin `PANEL_KEY`): forzar sigue como siempre.** Un candado interno sin
  candado externo no protege nada y solo molestaría — y la clave está en espera (§4ce).
- **Puerta con llave y sin `ADMIN_KEY`: nadie puede forzar** (`error:'admin'`, motivo
  `sin_clave`). Se reabre el día desde 🔒 Cerrar día, o se configura la clave.
- **Con `ADMIN_KEY`: forzar exige `adminKey`** (motivo `clave_mal` si no coincide).
Del lado del panel: `asegurarClaveAdmin()` pide la clave **antes** de mandar un guardado
que fuerza (para no perder el formulario en un rechazo), solo si el servidor tiene la puerta
con llave; se guarda una vez por dispositivo (`LS_ADMIN_KEY`, botón 🛡️ en Administración);
una clave que el servidor rechaza se olvida para pedirla de nuevo. `_forzar` en el
formulario se calcula por el DESTINO (cerrado, domingo, sábado PM, turno lleno), no por
«movió algo»: mover a un día normal no fuerza nada y no pide clave.
**Cuando el dueño active `PANEL_KEY`, que configure `ADMIN_KEY` en el mismo paso** — está
en el aviso de Administración y en los pasos de §4ce.

**P2 — «Con saldo» contaba registros sin monto.** La tarjeta decía 5 y el resumen 7; en
Mayoristas «Con saldo: 3» al lado de «no queda saldo pendiente». `renderConta` contaba
cualquier venta no marcada pagada; la tarjeta usaba `contaFaltaCobrar`. Ahora las dos usan
la misma regla, y el resumen separa **«Sin monto anotado»** y **«Cobradas sin marcar
pagadas»** para que las cuatro categorías sumen el total. `tests/test_consaldo.js` (10).

**⚡ Y la venta que Kommo no avisó (mismo día).** Una vendedora creó un lead **directamente
en «Compradores»** y no apareció en el panel. Dos causas, las dos mías:
1. `kommoHook` solo leía `leads[status][…]` (cambio de etapa). Un lead **creado ya en esa
   etapa** llega como `leads[add][…]`, y una edición como `leads[update][…]`. Ahora lee
   los tres (mismo lead en dos tipos → una sola fila). `test_hook.js` §2b.
2. En §4cc le indiqué al dueño configurar el webhook de Kommo **solo** con «Etapa del lead
   cambiada». Hay que agregar **«Lead agregado»** (y no viene mal «Lead modificado»).
   Sin eso, Kommo ni siquiera manda el aviso, lea lo que lea el servidor.
Mientras tanto la trajo el repaso de respaldo (§4cf), que para eso está.

**Corrección de un test mío:** `test_conflicto.js` §4 dejaba `apiList` apuntando a un
stub que devuelve el STATE actual; el check «el pedido vuelve a su fecha» de §7 fallaba por
el test, no por el panel (verificado con un script aparte: el refresco sí restaura).

`SCRIPT_VERSION` → **`2026-09-05-b`**. Hay que volver a publicar el `.gs`.

## 4ch. 🏷️ «Lead #39357288» en vez del cliente · y «Mis pedidos» que no mostraba lo tuyo (2026-09-05)

Tercer informe externo del día, con un caso real: Carola creó el lead de **Erwin Marcelo
Meschwitz Lino** (39357288, Bs 6.660) directamente en «Compradores». No llegó sola; la trajo
el repaso (§4cg) y apareció como **«Lead #39357288»**. Además, dos capturas del dueño
mostraban «Mis pedidos» con el nombre de Carola arriba y *«Elegí tu nombre para ver tus
pedidos»* abajo, y el pie diciendo «actualizado hace 20 min».

### 🏷️ El nombre: el número de Kommo llegaba tal cual

`crearBorradorDeLead_` hacía `cli = lead.name` y solo caía al contacto **si `cli` estaba
vacío**. Cuando la venta nace del chat, Kommo la titula sola «Lead #39357288»: no está
vacío, así que el contacto nunca ganaba. Ahora `nombreDeLead_()` detecta los títulos que
pone Kommo (`Lead #N`, `Negocio #N`, el número pelado, «Sin nombre»…) y usa el **contacto
principal** (`is_main`). Un título escrito a mano no se toca.

**Y el borrador de Erwin, que ya existía**: `repararNombreBorrador_()` le corrige **solo la
celda del cliente**, y solo si sigue siendo un borrador sin completar **y** su nombre sigue
siendo genérico. Si alguien ya lo escribió a mano, o ya lo completaron, no se toca nada.
⚠️ **No le pone sello de revisión a propósito**: el borrador nace con sello 0 («nunca
guardado»), y ponérselo haría que completarlo diera conflicto (§4ce). Corre solo, en el
próximo aviso o repaso de ese lead.

### 🚪 El portero de la etapa, movido al lugar correcto

§4cg leía `leads[add]`, pero filtraba por el `status_id` **del aviso**: si el aviso no lo
traía, el lead se descartaba en silencio. Ahora el hook deja pasar el id cuando no viene la
etapa (solo para alta y cambio de etapa, con tope de 10), y el portero de verdad es
`leadEnEtapa_()` **con el lead en la mano**, que además comprueba el **embudo**. Un lead de
otro embudo con una etapa del mismo número ya no entra. Cuando el aviso sí dice la etapa, se
filtra ahí y no se gasta una llamada a Kommo.

### 📥 «Mis pedidos»: tres fallas, las tres reproducidas

1. **`renderMis()` borraba el nombre recordado.** Hacía `setVendedorMem(v)` **siempre**,
   también con `v` vacío. Y a `renderMis()` la llaman desde muchos lados —repintado
   automático, borrar un pedido, el panel del chofer— con esa pestaña **sin abrir** y el
   campo vacío. Medido: «Carola Chavez» → «» con **una sola** llamada. Ahora solo se
   recuerda un nombre de verdad, y si el campo está vacío se rellena con el recordado
   (`misVendedorSel()`), que es lo que también hacía falta para que **los borradores de
   Kommo aparecieran sin volver a tipear el nombre**.
2. **`refreshMis()` no dibujaba hasta que contestaba el servidor.** Entre entrar y la
   respuesta quedaba el cartel viejo —el «Elegí tu nombre» de la captura— y si la red
   fallaba se quedaba así para siempre. Ahora dibuja primero con lo guardado en el equipo,
   muestra «Buscando tus pedidos…», y vuelve a dibujar al llegar.
3. **El sello del pie mentía.** `refreshMis` bajaba la planilla por su cuenta sin tocar
   `ULTIMO_REFRESCO`. Ahora pasa por `refrescarEstado()`, el único lugar que lo mueve (y que
   respeta la cola de lo no enviado). Un fallo de red se ve en rojo, dice que lo cargado no
   se pierde, y ofrece reintentar.

**Refresco cada 30 s** (`MIS_MS`) **solo en esa pestaña, solo visible y solo si no hay nada
a medio hacer** (`misAlAire()` reusa `autoOcupado()`: ficha abierta, foto subiendo, guardado
en curso). `MIS_CARGANDO` evita consultas encimadas — probado: tres refrescos a la vez hacen
**una** consulta. ⚠️ Y queda dicho en el código: **que la pantalla mire cada 30 s no hace que
la venta ENTRE más rápido**; eso lo decide el aviso de Kommo al servidor. Son dos pasos.

### 🔎 Para diagnosticar el webhook sin adivinar

El servidor anota el **último aviso recibido** (fecha, tipos, cuántos leads — nada de
nombres ni teléfonos) y lo devuelve como `ultimoHook`; el repaso lo imprime. Si dice «hace
tres días», el problema está en Kommo; si dice «hace un minuto» y la venta no entró, está en
el servidor. Antes eso se adivinaba, y **adiviné mal dos veces**: le dije al dueño que
faltaba tildar «Lead agregado» y él mostró que estaba tildado.

### Tests

- `test_hook.js` **78** (era 54): nombre genérico, reparación del borrador existente,
  avisos sin etapa, embudo ajeno, rastro sin datos personales. Con `GS=` para los dientes:
  contra el `.gs` de `origin/main` falla con `Lead #39357288`, el síntoma exacto.
- `test_mispedidos.js` **33**, nuevo. Contra `origin/main` falla en 3 y revienta.
- `test_traer.py` **21**.
- **Dos fallos del andamiaje de los tests, no del código**: la planilla simulada de
  `test_hook` copiaba las filas con `slice()` —o sea, **compartidas** con el fixture—, así
  que escribir una celda mutaba el array del test y el caso siguiente arrancaba sucio (me
  dio un ✗ falso); y a `PropertiesService` le faltaba `setProperty`. Y el fixture **no traía
  `status_id` ni `pipeline_id`**, que Kommo manda siempre: por eso nunca habría detectado el
  agujero del embudo. Es la tercera vez que un fixture que no refleja a Kommo esconde un
  bug (§4bz).

`SCRIPT_VERSION` → **`2026-09-05-c`**.

## 4ci. 📥 Importar los pedidos de ROHO desde su Excel (2026-09-05)

Pedido del dueño: *"logística extrae de otro panel que no tiene api ni conector sus pedidos
para entregar. ¿Podemos adicionar un botón de importar pedidos de ROHO y ellos con subir el
Excel cree los pedidos?"*. ROHO trabaja en Zoho; el reporte se llama **«DETALLE NOTA DE
VENTA PARA PROVEEDOR»**.

**El primer Excel no servía**: traía qué entregar (fecha, nota, código, producto, cantidad)
pero **no a quién ni dónde**. Se le dijo qué columnas pedir y trajo el segundo, con
`NOMBRE CLIENTE`, `TELEFONO`, `WHATSAPP`, `DIRECCION`, `DESCRIPCION DE DOMICILIO`,
`NOTAS / QUIEN RECIBE` y `CI/NIT`. Con eso alcanza.

### Lo que el archivo tiene de particular (y por qué el test corre contra el de verdad)

- **Los textos van «en línea»** (`t="inlineStr"`), no en la tabla de cadenas compartidas.
  Mi primer analizador leía solo lo compartido y **todas las columnas de texto salieron
  vacías** — el mismo tipo de error que ya había escondido bugs con Kommo (§4bz). Por eso
  `tests/datos/roho.xlsx` es el archivo REAL (con nombres, teléfonos y correos cambiados:
  el repo es público). Un Excel inventado por mí probaría que entiendo lo que yo mismo
  escribí.
- **Una nota puede ocupar varias filas**: la 185088 son tres. Se agrupa por N° de nota →
  un pedido con tres líneas, no tres pedidos.
- **La columna `RESUMEN` trae 30.000 caracteres de HTML** con imágenes de Zoho. Se descarta.
- **Teléfonos como `+59171039979`** → los 8 dígitos de acá.
- **De 35 líneas, 25 tenían la entrega ya pasada** (la más vieja de diciembre 2025).

**La regla de la fecha, dicha por el dueño**: *«si hoy es 05 de septiembre, agendar los de
06 en adelante»*. O sea **entregas futuras: de MAÑANA en adelante**, no de hoy — el camión de
hoy ya está armado y salió, y meterle una entrega más no la hace llegar. Las de hoy y las
anteriores se listan aparte con una casilla, por si alguna quedó sin entregar.

### Los combos

14 de 35 líneas son «COMBO …», y **el panel prohíbe cargar un combo en una sola línea**:
almacén no puede tickear stock ni contar bultos de algo que son dos cosas. Diez dicen
`+SOMIER` y se parten por ahí; **cuatro no lo dicen, y el dueño confirmó que igual llevan
somier**, así que se les arma. La medida vive al final del nombre y vale para las dos piezas:
`COMBO COLCHON PILLOWFLEX+SOMIER 3 PLAZAS 180X190CM FLEX` →
`COLCHON PILLOWFLEX 3 PLAZAS 180X190CM FLEX` + `SOMIER 3 PLAZAS 180X190CM FLEX`.
El test comprueba que ninguna línea importada le caiga mal a `esCombo()` — **la función del
propio panel**, no un regex mío: es la que va a rechazar el pedido si mañana alguien lo edita.

### La zona: lo que decidí NO hacer

El panel arma las rutas por zona, y **29 de 35 direcciones no la dicen**. Podía deducirla
por avenida o por anillo, pero **mandar un camión a la ruta equivocada es peor que dejar la
zona vacía**: la vacía se ve y se completa, la equivocada viaja. Así que la zona sale solo de
dos lugares seguros: que la dirección lo diga (`ZONA NORTE`), o que nombre una zona **que el
equipo ya usa en sus pedidos** (`zonasDelEquipo()` las saca de `STATE`, o sea de su propio
vocabulario y no del mío). Lo que queda sin zona se cuenta en la vista previa.

### Cómo está hecho

- **Sin ninguna librería.** Un `.xlsx` es un ZIP con XML, y el navegador descomprime solo
  (`DecompressionStream`). Una dependencia externa es una cosa más que se cae justo cuando
  hace falta. (Detalle que costó: los largos de nombre/extra de la cabecera **local** del
  ZIP pueden no ser los del directorio central; leyendo los del directorio, los datos salen
  corridos.)
- **Vista previa obligatoria.** Antes de guardar nada muestra: cuántos nuevos, cuántos ya
  estaban, cuántos con fecha pasada, cuántos combos partió, cuántos quedan sin zona, sin
  celular o sin dirección, y **si algún día se pasa de cupo**. Recién ahí hay botón.
- **Nunca pisa.** Solo crea lo que no existe; compara por N° de nota, que en ROHO es el N°
  de OC. Subir el mismo archivo dos veces no crea ni un pedido de más — y el servidor lo
  vuelve a comprobar por su cuenta (§4ce), así que hay dos redes.
- **Turno a elección** (todos AM, todos PM, o repartir llenando el AM de cada día hasta el
  tope): el Excel de ROHO no trae turno y no se inventa.
- Un rechazo del servidor (cupo lleno, día cerrado, nota repetida) **saca el pedido de la
  pantalla y se informa cuál y por qué**, en vez de dejarlo como si hubiera entrado.

`tests/test_roho.js` — **54 checks** contra el Excel real. Contra `origin/main` revienta con
`xlsxDescomprimir is not defined`.

## 4cj. ⚡ Administración abre en «Mes» — y la lentitud no era el filtro (2026-09-05)

*"administración abre en «todo» por defecto, y tarda en cargar, que abra en «mes»"*.

**Se hicieron las dos cosas, pero no son la misma cosa**, y conviene que quede escrito
porque §4bn ya se equivocó con esto:

**1. La lentitud NO era el filtro.** Medido acá (3 renders de descarte + mediana de 5, con
el tope de 150 filas ya puesto):

| ventas | Todo | Mes |
|---|---|---|
| 500 | 19 ms | 14 ms |
| 1.500 | 30 ms | 17 ms |
| 3.000 | 42 ms | 21 ms |

Veintiún milisegundos no se sienten. **Lo que se sentía era otra cosa**: `loadFromServer()`
**no dibujaba nada hasta que Google contestaba**. Se ponía la clave y quedaba una tabla
vacía mirándote los segundos que tarda el Apps Script en leer la hoja entera — teniendo la
copia local ya cargada en memoria desde el arranque (`loadMirror`). La espera era gratis.
Ahora dibuja primero lo que hay y repinta al llegar lo nuevo. **Es exactamente el mismo bug
que el de «Mis pedidos» (§4ch), en otra pantalla**: dibujar antes de pedir. Dos apariciones
del mismo error en un día — vale la pena revisar si queda alguna tercera.

**2. El filtro sí cambió a «Mes»**, porque lo pidió el dueño y ahora es seguro. Lo que lo
hacía peligroso en §4bn era que a fin de mes escondía en silencio las entregas del mes
siguiente. Desde §4bo existe `renderFueraDelMes()`, el aviso ámbar que dice cuántas quedan
afuera y lleva a ellas de un toque. **Ese aviso es la condición**: si algún día desaparece,
hay que volver a «Todo». Quedó escrito en el HTML, en `test_tabla.js` y en `test_finmes.js`,
cuyos checks pasaron de «abre en Todo, no hace falta aviso» a «abre en Mes, el aviso TIENE
que estar».

## 4ck. 📥 ROHO: la zona que mandaba el camión a media hora de distancia (2026-09-05)

Con la primera vista previa de verdad, el dueño vio tres cosas.

**🔴 El error mío que importaba.** A una clienta de **«AV. VIRGEN DE COTOCA»** le puse zona
**«Cotoca»** — que es un pueblo a media hora para el otro lado. `rohoZona()` buscaba el
nombre de una zona conocida **suelto adentro** de la dirección, y «Cotoca» aparece dentro
del nombre de la avenida. Es justamente el error de ruta que en §4ci escribí que quería
evitar, y lo cometí igual una línea más abajo de haberlo escrito. **Arreglo: el nombre de la
zona tiene que ser un TRAMO ENTERO** de la dirección (entre comas), no una palabra adentro
de otra. «AV.VIRGEN DE COTOCA…» ya no da zona; «…, COTOCA, …» sí.

**La lección**: escribir el principio no alcanza. `zonasDelEquipo()` parecía seguro porque
usa el vocabulario del equipo y no el mío — pero el vocabulario correcto aplicado con una
búsqueda floja sigue dando una respuesta inventada.

**🟡 «¿También importa la dirección? Solo veo zona. ¿Y el teléfono?»** Sí, las dos —
**siempre se importaron**. Pero la vista previa mostraba cinco columnas (nota, entrega,
cliente, zona, productos) y no estaban a la vista, así que no había forma de saberlo sin
confiar en mi palabra. Ahora la tabla muestra **Celular, Dirección y Observaciones**. Y el
test dejó de comprobarlo solo en la pantalla: ahora mira el **pedido guardado** (6 de 6 con
dirección, celular y «quién recibe»).

**🟢 «Quien recibe» va siempre a observaciones.** Antes lo salteaba cuando era igual al
nombre del cliente, para no repetir. Pero esa columna a veces dice *«… O MICAELA GUZMAN»* o
qué pieza le tienen que entregar, y eso el chofer lo necesita en la mano. Va siempre.

`tests/test_roho.js` **55 → 62**.

### Y la ventana, que salía ilegible

*"la ventana podría ser más ancha y grande… y sale con errores"*, con una captura donde los
textos se dibujaban **unos encima de otros**. Dos causas:

1. `.modal` está fijo en **540 px** —el ancho de una ficha— y esta ventana lleva una tabla
   de 8 columnas. `openModal(html, ancha)` toma ahora un segundo parámetro y esta usa
   `.modal.ancha` (`min(1180px, 96vw)`).
2. **La culpable de verdad**: la regla global `table{white-space:nowrap}` (la que hace que
   la tabla de Administración no se parta) la heredaban también estas celdas, así que las
   direcciones largas se salían de su columna y se dibujaban encima de la de al lado.
   `table-layout:fixed` con `<colgroup>` **no alcanzaba** sin `white-space:normal`.
   El N° de nota y la fecha sí van `nowrap`: «188807» partido en «18880 / 7» se lee como
   otro número, y es justo el dato con el que se busca el pedido.

Verificado con captura y midiendo el DOM: **0 celdas desbordadas**, y en computadora la
tabla entra entera sin scroll horizontal. Un problema visual se comprueba mirando.

### Y el resultado, que era un renglón perdido

*"ese letrero abajo de «4 pedidos creados» ni se ve ahí abajo. Debería salir una ventana
flotante llevando a ver los pedidos"*. Tenía razón: el resultado era un `<div>` **debajo del
botón**, o sea fuera de la pantalla justo en el momento en que uno más quiere saber qué pasó.

`renderImportRohoFin()` reemplaza el contenido de la ventana y contesta sola la pregunta que
uno se hace —*¿de verdad entraron y ocupan lugar en el camión?*—: una tabla **día por día**
con cuántos entraron, **cómo quedó el cupo de ese turno después de importar** (`4 de 12 ·
quedan 8`) y qué notas cayeron ahí. Abajo, un botón que lleva a la tabla de Administración
al mes de esas entregas y buscando ROHO, que es donde se les asigna chofer.

Si el servidor rechazó alguno, sale en rojo con el motivo por nota **y** con lo que hay que
saber para no dudar: *«Esos no quedaron a medias: no están en la planilla. Corregí lo que
dice el motivo y volvé a subir el mismo Excel — se van a crear solo los que faltan.»*

**Verificado en producción por el dueño**: la nota 188807 quedó con **N° del día #4** para el
09/09 —o sea que sí ocupó lugar en el camión—, con dirección, celular, «Recibe: …» en
observaciones y marcada PAGADO. `tests/test_roho.js` **62 → 69**.

⚠️ Y una limitación que conviene tener escrita: **desde acá no se puede ver la planilla**
(el proxy bloquea todo Google). Verificar «se creó de verdad» es siempre o una captura del
dueño, o ponerlo en la pantalla para que lo vea él — que es lo que se hizo acá.

## 4cl. 🔍 Auditoría del importador ROHO: cuatro errores míos, los cuatro reales (2026-09-05)

Tercer informe externo del día, esta vez sobre el importador (§4ci–§4ck). **Los cuatro
hallazgos eran ciertos**, y los cuatro se reprodujeron antes de tocar nada — con los
números exactos que decía el informe. Ninguno rompía nada visible: el pedido se creaba
igual, solo que con el turno, la cantidad o el estado equivocados. Ese es justo el tipo de
error que nadie encuentra hasta que el camión llega mal.

### 1. ⚖️ «Repartir AM/PM» contaba cada pedido dos veces

```js
var libre = limTurno(...) - cuposUsadosTurno(p.fecha,'AM') - (usadosAM[p.fecha]||0);
```
`upsert(rec)` mete el pedido en `STATE` **antes** del siguiente, y `cuposUsadosTurno` cuenta
`STATE`. O sea que cada pedido ya colocado se restaba **dos veces**: una por STATE y otra
por mi contador. Medido: **con 12 lugares libres repartía 6 AM y 6 PM**, en vez de 12 AM.
Y el **sábado** —que tiene 15 lugares AM y **ningún PM**— mandaba 2 de 10 a un turno que no
existe, garantizando el rechazo con un motivo que no explica nada («PM lleno»).

Arreglo: contar una sola vez (`cuposUsadosTurno` sola ya dice la verdad, porque el bucle es
de a uno y un rechazo saca la fila de STATE antes del siguiente), y **no mandar a PM un día
sin PM**: se queda en AM y el servidor rechaza diciendo lo que de verdad pasa.

### 2. ⏳ «Creado» decía lo mismo de algo que nunca llegó al servidor

Si la red se caía, el pedido iba a la cola —bien— pero **se contaba como creado**, y la
pantalla afirmaba *«Ya están en la planilla y ocupan lugar en el camión»*. Medido: **0
confirmaciones del servidor, 1 en la cola, y la pantalla decía «✅ 1 pedido creado»**. Con
`CONNECTED=false` era peor: **ni siquiera se encolaba** — quedaba solo en la pantalla.

Arreglo: **confirmados y pendientes son dos listas distintas**. Solo entra a «creados» lo
que el servidor aceptó. Lo pendiente se muestra arriba, en ámbar, diciendo que **todavía no
ocupa lugar en ningún camión**, con las notas y la instrucción de mirar el «sin enviar» del
pie. Y sin planilla conectada ahora **sí** se encola, así que no se pierde.

### 3. 🔢 Las cantidades ilegibles se volvían 1 en silencio

`Math.max(1, Math.round(Number(v)||1))` convertía en **1** todo lo que no entendía: `0`,
`-3`, `abc` y —la peligrosa— **`2,5`**, que es como escribe los decimales una planilla en
español. Un camión con 1 colchón cuando se vendieron 4, y nadie se entera hasta el reclamo.

Arreglo: `rohoCant()` devuelve un entero positivo o **null**. Si es null, esa nota **no se
importa** y sale en rojo en la vista previa con el valor crudo que vino
(*«cantidad ilegible («2,5») en COLCHON ECO FLEX…»*). `2,0` y `1.0` se siguen leyendo bien.

### 4. 💰 «NO PAGADO» se leía como pagado

`/PAGAD/i` da verdadero para «NO PAGADO». El chofer no cobraría. Arreglo: `rohoPagado()`
descarta primero lo negado (`NO`, `PENDIENTE`, `IMPAGO`, `PARCIAL`, `A CUENTA`) y **lo que
no se entiende queda como NO pagado** — que el chofer pregunte es recuperable; que no cobre
porque el panel dijo «PAGADO», no.

### El chequeo de dientes que casi doy por bueno

Corrí `git stash` y el test dio **0 fallas contra el código publicado**, que parecía decir
que no probaba nada. El `stash` se había llevado **también el test**: estaba corriendo el
test viejo contra el código viejo. Guardando solo `pedidos.html`, el test nuevo contra lo
publicado da **14 fallas y revienta** (`rohoPagado is not defined`), cada una reproduciendo
un hallazgo del informe. **Un chequeo de dientes mal hecho es peor que no hacerlo**: da una
luz verde falsa sobre la única prueba que existe de que el test sirve.

`tests/test_roho.js` **69 → 90**.

## 4cn. 👯 Duplicados del panel de ventas: no decía cuál ficha era de quién (2026-09-06)

**Es la misma falla de §4cd, en el otro panel.** Preguntando por los duplicados de agosto,
el dueño leyó la tabla y saltó: *"ahí me decís Maria pero sólo mencionás a Maria"*. Y tenía
razón: la tabla tenía una columna «Vendedoras involucradas» y otra «Etapas», las dos con la
lista **sin repetidos**, así que:

- Con dos vendedoras decía `Isabel Robledo · Mirian Salazar` y `Agendado/Visita ·
  Compradores`, y **no había forma de saber cuál ficha era de quién** sin abrir las dos en
  Kommo.
- Con una sola vendedora decía `Maria Flores` una sola vez — que **se leía como si el
  duplicado fuera con otra persona**, cuando en realidad ella tenía las dos fichas.

Esa segunda confusión tapaba el dato más útil de los tres meses: de los 14 duplicados de
junio–agosto, **9 eran auto-duplicados** (7 de ellos de Maria Flores, que abre ficha nueva
por cada pedido del mismo cliente en vez de reusar la existente) y solo **5 eran choques**
entre dos vendedoras. Son **dos problemas distintos con dueños distintos**: el primero es
forma de registrar, el segundo es reparto de cartera. La tabla los mostraba iguales.

**Arreglo — `dupRows` ahora guarda el responsable ficha por ficha:**

```
detalle: [{id, vend, etapa}, …]   ← quién tiene cada ficha
tipo:    "Choque" | "Auto-duplicado"
```

Y la tabla cambió las dos columnas viejas por **Tipo** + **Quién tiene cada ficha**, con un
renglón por ficha (`Carola Chavez · Agendado / Visita`) donde **cada nombre abre SU ficha**,
no la primera del grupo — que era el otro pedazo de §4cd. `vendedoras` y `etapas` siguen
existiendo, y el template cae a ellas si `detalle` no está (paneles viejos).

**Y de paso, dos cosas que hacían que el conteo fuera un piso y no el total:**

1. **Los teléfonos se comparaban como texto crudo.** Un duplicado de julio salió como
   `+59169118641` — o sea que `69118641` escrito sin el prefijo contaba como **otro
   cliente**. Ahora `norm_phone()` saca el `+591`, los ceros, espacios y guiones antes de
   comparar; el panel sigue mostrando el número **como lo escribieron**.
2. **Solo se leía el primer teléfono del primer contacto** de cada lead. Ahora se leen
   todos los valores del campo PHONE (móvil/casa/trabajo) y todos los contactos del lead.
   Como un lead puede caer en dos grupos, `duplicadosFichas` cuenta **fichas distintas**,
   no apariciones.

**Lo que sigue siendo un piso, y está escrito en la nota al pie del panel:** solo mira los
contactos **creados dentro del mes**. Un cliente que entró en julio y volvió a escribir en
agosto no aparece. Cruzar meses es otro cambio, más caro (hay que traer contactos de una
ventana amplia); no se hizo.

**Métricas nuevas:** `duplicadosChoques` y `duplicadosAuto`, para que el encabezado de la
tarjeta diga la separación sin que haya que contar filas.

**Tests** (mismo commit, `tests/LEEME.md`): `test_duplicados.py` (21) sobre `build_panel_data`
con Kommo de mentira — normalización, responsable por ficha, los dos tipos, tres falsos
positivos y el conteo de fichas distintas. `test_paneldup.js` (13) abre el panel de verdad
en Chromium y comprueba que se lea quién tiene qué y que cada nombre lleve a su ficha.

**La lección es la de §4cd otra vez**, y por eso quedó anotada: *un aviso que obliga a
buscar a mano lo que el sistema ya calculó es medio aviso*. Estaba escrita hacía dos días
para `pedidos.html` y el panel de ventas tenía exactamente el mismo agujero. Cuando algo se
arregla en un panel, **vale preguntarse si el otro tiene la misma falla**.

## 4cm. 💡 Ideas para logística — sin empezar, para conversar (2026-09-05)

El dueño pidió *"anda pensando cómo y qué más podemos implementar para mejorar a
logística"*. Esto NO está empezado ni decidido: son candidatos, ordenados por lo que dicen
**sus propios números** (los chips de Administración del 05/09: `Todos 106 · Por cobrar 60 ·
Sin chofer 105 · No entregados 103 · Por verificar 71 · AM 74 · PM 32`).

1. **🚚 Asignar chofer de a muchos, por zona.** `Sin chofer 105 de 106` es el número más
   fuerte del panel. Si asignar es entrar ficha por ficha, nadie lo va a hacer. Una pantalla
   «armar el camión del martes»: elegís día → ves los pedidos agrupados por zona → un chofer
   a toda una zona de un toque. **Es el de mayor impacto por esfuerzo.**
2. **📦 Los 71 «por verificar».** Almacén tiene que tildar producto por producto antes de
   cargar. Si va atrasado, el camión sale con lo que no es. Una vista para almacén: qué hay
   que revisar del camión de mañana, **agrupado por producto** (no por pedido), para contar
   bultos de una.
3. **🗺️ Orden de las paradas.** Ya hay coordenadas y mapa. Falta que la hoja de ruta salga
   **numerada por cercanía** desde el depósito. Ahorra kilómetros y hace medible el día.
4. **🚫 Entrega fallida con motivo.** Hoy un pedido está entregado o no. Falta «no se pudo,
   porque…» (no estaba, dirección mal, rechazó). Sin eso no se puede saber cuánto se pierde
   por dirección mala ni a quién avisarle antes de salir.
5. **📲 Aviso al cliente el día de la entrega.** El panel ya arma mensajes de WhatsApp. Un
   «salimos, llegamos entre las X y las Y» por parada baja las entregas fallidas — pero
   depende de (3) para poder decir una hora creíble.
6. **⏱️ Tiempos.** Nada mide entregas por chofer por día, ni % entregado en la fecha
   pactada. Es lo que después permite discutir si hacen falta más camiones o no.

⚠️ **Antes de construir cualquiera hay que preguntarle al dueño cómo se hace HOY.** El error
de §4ck (inventar la zona por el nombre de una avenida) salió de suponer en vez de preguntar.

## 4cn. 📦 Avisar ANTES de quedarse sin lo que más sale (2026-09-07)

Pedido del dueño, después de descartar dos listas de ideas mías: *"el de fábrica me interesa
pero **más tipo moda que se entrega más seguido y alerte sobre tener stock**"*.

**No es la pantalla de faltantes**, que ya existe y mira lo que **ya** falta (alguien tildó
✗ en un pedido). Esto mira lo que **está por faltar**, que es lo único que llega a tiempo.

### Los dos datos que faltaban, y que él dio

| Pregunta | Respuesta | Para qué sirve |
|---|---|---|
| ¿Cuánto tarda la fábrica (MORENO / MULTI)? | **2 a 3 días** | Es el umbral del aviso: si lo que hay no cubre 3 días, hay que pedir ya |
| ¿Dónde se anota cuánto hay en depósito? | **«Lo quiero llevar en el panel»** | Justificó construir el conteo, no solo el ranking |

### La cuenta

- **Rotación** = unidades **entregadas** en los últimos 28 días ÷ 28.
- **En depósito** = último conteo + lo que llegó de fábrica − lo entregado desde ese conteo.
- **Alcanza para** = depósito ÷ rotación, en días.
- 🚨 **PEDIR YA** si alcanza para menos de 3 días (lo que tarda la fábrica) o si lo ya
  vendido para los próximos 3 días no entra en lo que hay.
- 🏭 **Pedir esta semana** si alcanza para menos de 5 (3 de fábrica + 2 de margen).

### Tres decisiones que valen más que el código

**1. Un CONTEO con fecha, no un saldo que se descuenta solo.** Un saldo se desvía para
siempre con un solo error —una entrega no marcada, una unidad rota, un descuento doble desde
dos celulares— y nadie lo nota hasta que falta. Guardando el último conteo con su fecha y
recalculando desde ahí, **cada conteo nuevo borra el error acumulado**, y el cálculo es
idempotente: repetirlo no descuenta dos veces. El test lo comprueba llamándolo 10 veces y
repintando 5.

**2. Sin conteo NO se inventa un número.** «Sin contar» no es cero. Un depósito inventado es
peor que no decir nada, porque se le cree. Y sin conteo no salta ningún aviso.

**3. Lo entregado el mismo día del conteo se descuenta igual.** Si se cuenta a las 8 el
camión no salió; a las 6 sí. Como no se sabe la hora, se elige el lado que **no deja sin
avisar**: quedar corto y pedir de más a fábrica cuesta mucho menos que quedarse sin vender.
Puede dar **negativo** — y eso no es un error de cuenta sino la señal de que el conteo quedó
viejo, así que la pantalla lo dice con todas las letras («se entregaron 5 más de lo contado
— volvé a contar») en vez de mostrar un número raro.

### Cómo se guarda

Fila del sistema `__stock__`, con JSON en Observaciones — el mismo patrón que los días
cerrados y el arqueo, así que **no hizo falta tocar el Apps Script ni agregar columnas**.
Va sin fecha, o sea que no ocupa cupo de ningún camión, y `esFilaSistema` la excluye de
todos los listados.

### Dónde se ve

- **Aviso en Administración** (fuera del resumen plegable): *«📦 1 producto se acaba antes
  de que llegue la fábrica: COLCHON ECO FLEX 2 PLAZAS · 140x190»* con botón para entrar.
- **Pantalla «📦 Stock y reposición»**: sale por día, en depósito, alcanza para, vendido sin
  entregar, qué hacer. Ordenada por urgencia.
- **«📋 Copiar pedido a fábrica»**: el mensaje listo con cuánto pedir de cada uno y por qué.
- Cargar datos: **«Conté el depósito»** (ofrece los 40 que más mueven, no los 250 del
  catálogo — contar 250 no lo hace nadie) y **«Llegó de fábrica»**.

`tests/test_stock.js` — **34 checks**.

⚠️ **Pendiente de conversar**: hoy la salida se cuenta por `fechaSalida` (la fecha de entrega
programada), no por cuándo se marcó entregado de verdad. Si una entrega se atrasa mucho, el
descuento queda con la fecha vieja. No molesta para el aviso, pero conviene saberlo.

**Y una del andamiaje, otra vez la misma**: `test_roho` falló ese día porque el Excel de
prueba tiene fechas fijas de septiembre y, al llegar el 07, entre las pocas filas que
quedaban «futuras» ya no había ningún combo — el check del aviso de combos se cayó **sin que
nada estuviera roto**. Es la trampa que el LEEME avisa desde agosto. Arreglado tildando
«traer también las viejas» para ese check: así los 14 combos del archivo están siempre en
juego y el aviso deja de depender del calendario.

## 4co. 📦 Stock, segunda vuelta: la crítica que pidió el dueño y el «Todo» (2026-09-07)

Después de publicar §4cn el dueño preguntó *"¿cómo mejorarías lo que acabamos de hacer?"*.
Le contesté con una lista ordenada por daño, empezando por reconocer que lo que armé tenía
**un defecto de fondo**, y él respondió con una palabra: *"Todo"*. Esto es lo que cambió.

### 1. La demanda se mide por lo VENDIDO, no por lo entregado (el defecto de fondo)

La rotación de §4cn contaba unidades **entregadas**. Un producto que se agota deja de
entregarse, la rotación baja y **el aviso desaparecía justo cuando más faltaba**. Ahora
«vende por día» cuenta **todos los pedidos con entrega en los últimos 28 días, se hayan
entregado o no**: lo que un chofer tildó ✗ NO HAY también se vendió. El depósito, en cambio,
sigue moviéndose solo con entregas reales (eso no cambió, y está bien así).

### 2. Un solo producto, venga de donde venga

Lo verifiqué antes de decirlo: «ECO FLEX» de una vendedora y «COLCHON ECO FLEX 2 PLAZAS
140X190CM FLEX» del Excel de ROHO daban **dos claves distintas** (`prodRankKey`), y en el
catálogo el mismo colchón se llama «NUEVO ECO FLEX» (CH1332). Tres renglones, ninguno rotaba
lo suficiente, ninguno avisaba.

Ahora la clave es la del **catálogo** (`stockInfo` → `stockEnCatalogo`):
- por **código** si lo trae;
- si no, por **nombre**: la entrada del catálogo cuyas palabras están **todas** en el nombre
  del producto, con la **misma medida** (la medida puede venir adentro del nombre, como
  «Colchón Bahía 140x190»), y si hay varias gana **la más específica** («ESPECIAL
  ORTOPEDICO D/C» le gana a «ESPECIAL ORTOPEDICO»). Las palabras de relleno no cuentan:
  COLCHON, 2 PLAZAS, CM, NUEVO, el color al final. La dirección importa: «PILLOW» solo NO se
  une a PILLOW FLEX ni a PILLOW PEDIC — el catálogo tiene que estar entero adentro del
  nombre, no al revés.
- lo que el catálogo no conoce queda con su clave cruda, y se puede **unir a mano** («🔗
  unir» en el renglón): la unión vive en la misma fila `__stock__` (`a`), lo contado se suma
  y «✕ separar» la deshace (lo contado queda junto: para eso está «contá de nuevo»).

**Migración sola**: al leer la fila del stock, las claves guardadas se vuelven a resolver;
dos claves viejas que caen en la misma nueva **se suman** (eran dos renglones del mismo
conteo). Es idempotente. El ranking «🛏️ Productos más entregados» usa la misma clave, así que
también muestra el nombre del catálogo.

### 3. «Ya lo pedí» y cuánto tarda cada fábrica de verdad

- **🏭 Pedí a fábrica** anota `{producto, unidades, fábrica, fecha}` (`STOCK.p`). El producto
  pasa a **🚚 Ya pedido** y deja de gritar mientras lo pedido alcance; lo que viene entra en
  la proyección con su fecha estimada.
- **📥 Llegó de fábrica** ofrece primero lo que estaba pedido (con la cantidad editable): al
  marcarlo se cierra el pedido, se suma al depósito y queda **medido cuánto tardó**.
- El tiempo de fábrica es la **mediana de las últimas 6 llegadas, fábrica por fábrica**
  (`stockTiemposFabrica`). Sin medidas de una, se usan las de la otra y la pantalla lo dice
  («según la otra fábrica»); sin ninguna, los 3 días del dueño. Segunda fuente de medidas: las
  líneas marcadas 🏭 en la ficha de un pedido se sellan solas el día que se marcan (`prodF`)
  y el día que pasan a ✔ hay (`prodR`) — van adentro del JSON de productos, sin columnas.

### 4. Se corta EL DÍA que se corta (proyección día por día)

§4cn miraba 3 días adelante. Ahora `stockProyectar` recorre 45 días: **depósito + lo que
llega − lo que se va**, donde lo que se va cada día es **lo mayor** entre lo ya vendido para
ese día (se sabe) y el ritmo de venta (se estima) — no la suma, porque lo vendido *es* el
ritmo hecho realidad. El primer día negativo es el corte.
- 🚨 **PEDIR YA** si se corta antes de lo que tarda la fábrica (ni pidiendo hoy llega).
- 🏭 **Pedir esta semana** si se corta dentro de fábrica + margen.
- Cuánto pedir: lo que cubre fábrica + margen + 7 días de venta (o todo lo vendido, si es
  más), menos lo que hay y lo que viene.

### 5. Cuándo hay que volver a contar

- Conteo de más de **21 días** → aviso en Administración y cartel en la pantalla.
- Un chofer marcó **✗ no hay** en un pedido pendiente pero según el conteo **hay** → uno de
  los dos miente: «contá de nuevo». Solo si el pedido es de después del conteo y no llegó
  nada de fábrica desde entonces (si llegó, el ✗ puede ser de antes).

### 6. Plata parada y 7. margen según la venta

- 💤 **Sobra**: hay para más de 60 días, o hay y no se vendió ninguno en 4 semanas. Va al
  final de la lista y en un renglón aparte; no entra al aviso de Administración.
- El margen sobre el tiempo de fábrica es **2 días si las 4 semanas vendieron parejo y hasta
  5 si la venta es a los saltos** (desvío relativo de la venta semanal, redondeado a días).
  Nadie configura nada. La etiqueta «venta pareja / a los saltos» solo se muestra con 8 o más
  vendidos: con 2 unidades no dice nada.

### Decisiones que conviene conocer

- **Lo hecho a pedido (🏭 en la ficha) no toca el depósito**: ni descuenta al entregarse ni
  cuenta como comprometido. Lo trae la fábrica para ese cliente. La pantalla lo dice abajo:
  *lo que llega para un pedido puntual NO se anota en «Llegó de fábrica»*. Si alguien lo
  anota igual, el depósito queda inflado en esas unidades hasta el próximo conteo.
- ~~Un pedido con la fecha vencida y sin marcar entregado sigue contando como comprometido
  HOY (lado conservador).~~ **Duró una hora.** La primera pantalla con datos reales decía
  «ALMOHADA: 66 en los próximos 3 días», y el dueño preguntó *"¿seguro que estás tomando en
  cuenta los pedidos que FALTAN ENTREGAR?"*. Tenía razón: de 68 «vendidas sin entregar»,
  **41 eran de pedidos con la fecha ya pasada que nadie marcó ✓** — la marca «Entregado ✓»
  no se pone siempre, y el lado «conservador» era en realidad una alarma falsa en todos los
  productos. Regla nueva (`stockSalio`): un pedido **salió** si está marcado ✓, si salió de
  tienda, **o si su día de entrega ya pasó y nadie lo movió de fecha** (lo que no se entrega
  se reprograma; lo que queda con fecha vieja, salió). Lo de hoy todavía no. Esos pedidos
  descuentan del depósito como cualquier entrega, y la columna dice cuántos son («N de días
  pasados sin marcar ✓: se dan por entregados»). Lo tildado **✗ no hay** de días pasados no
  salió ni cuenta como comprometido hasta que se reprograme; se muestra aparte («N ✗ no hay
  de días pasados, sin reprogramar») y sigue alimentando la contradicción con el conteo.
- Al recibir menos unidades de las pedidas se anota lo que llegó; el resto no se persigue.
- Muestras de fábrica de 0 días (pedido y llegada el mismo día) cuentan; las de más de 60
  se descartan como error de carga.
- La fila `__stock__` guarda ahora `{c, e, p, a}`; una fila vieja `{c, e}` se lee igual.

### Los tests

`tests/test_stock.js` reescrito: **91 checks**. Contra `origin/main` (sin §4co) no revienta:
un solo check rojo que dice **qué funciones faltan** (patrón del LEEME). El test viejo de
§4cn contra el panel nuevo: 23 pasan y las 11 que fallan son todas las que sembraban el
conteo con la clave cruda — exactamente lo que cambió. Batería completa en verde.

**Diseño que salió de la captura, no del test**: las tablas del stock heredaban el `nowrap`
de las dos primeras columnas de la tabla de ROHO y «también: COLCHON ECO FLEX 2 PLAZAS…» se
metía en la columna de al lado. Clase `.stk-tabla` que deja envolver en todas.

### Qué tiene que hacer el dueño

1. **Contar el depósito una vez** (📋 Conté el depósito): sin conteo no avisa nada.
2. Cuando llame a Moreno o a Multi, **anotarlo** (🏭 Pedí a fábrica) y cuando llegue tocar
   **📥 Llegó**. Con eso el panel deja de molestar y aprende cuánto tarda cada fábrica.
3. Si ve dos renglones del mismo producto, **🔗 unir**.

## 4cp. 📥 El almacén se actualiza subiendo el Excel del sistema de Moreno (2026-09-07)

El dueño, con dos archivos: *"estos son los almacenes, que existen uno es de industrias
moreno y el otro productos terminado fábrica que es el almacén de logística de donde salen
los camiones. Subiendo este excel deberían ellos actualizar cada día el almacén."*

O sea: contar a mano deja de ser la única forma de cargar el depósito. El sistema de Moreno
saca el reporte **EXISTENCIAS ALMACEN**, y ese reporte **ya es un conteo con fecha** — justo
la forma que §4cn eligió a propósito: se reemplaza entero, no se va sumando, así que subirlo
dos veces no descuenta dos veces y cada archivo nuevo borra la deriva del anterior.

### Los dos almacenes NO se suman

| Almacén | Qué es | Dónde entra |
|---|---|---|
| `01-05-003 PRODUCTOS TERMINADOS FAB.` | de acá **salen los camiones** | **En depósito** — el que contesta «¿puedo entregar mañana?» |
| `01-05-103 IM - PRODUCTOTERMINADO` | Industrias Moreno, la fábrica | **En fábrica** — existe, pero hay que ir a buscarlo |

Sumarlos diría «tenés 28» cuando en el camión entran 4. Separados, además, aparece un
consejo que antes no existía: **🚚 Traer de fábrica** — si falta acá y allá hay de sobra, no
se le pide a la fábrica, se manda la camioneta. Son dos mandados distintos, a dos personas
distintas, y el mensaje de «Copiar» ahora los escribe en dos listas separadas.

El almacén de logística se reconoce por su nombre; cualquier otro se pregunta **una vez** al
subirlo (en la misma pantalla de confirmación) y queda recordado en `STOCK.al`.

### ⚠️ El bug que casi pasa desapercibido: comillas simples

El primer intento leyó el archivo «bien» —352 filas, sin ningún error— y **no trajo un solo
dato**. El generador de Moreno escribe los atributos del XML con **comillas simples**
(`<c r='C2' t='s'>`), y `xlsxHoja` los buscaba solo con dobles. Un archivo que se abre y sale
vacío es peor que uno que falla: parece que el almacén está vacío. Arreglado en el lector
compartido (también acepta `<row r="1"/>` vacías, que antes se pegaban con la fila siguiente);
el importador de ROHO sigue en verde.

### Y el otro detalle de forma: la cantidad no tiene encabezado

El título «Cantidad» está **una fila más arriba y corrido varias columnas** (celdas
combinadas): los datos caen en `AY` y el título vive en `BA`. Buscar la columna por el título
lee la columna equivocada. Se busca por lo que hay en los datos —la única columna numérica
que no pertenece a ningún encabezado— y el título solo desempata. Es lo que hace el test.

### Lo que la pantalla hace antes de aplicar

- Dice **de qué almacén** es, **a qué fecha** y cuántos productos/unidades trae.
- Marca los **cambios grandes** contra el conteo anterior (así se nota un archivo del almacén
  equivocado, o de otra fecha, antes de aplicarlo).
- Si hay **pedidos a fábrica que ya deberían haber llegado**, ofrece darlos por llegados: si
  llegaron, ya están adentro de este conteo y dejarlos abiertos los contaría dos veces. Ojo:
  cerrarlos así **no** mide el tiempo de fábrica (`enConteo`) — se sabe que ya estaban, no
  cuándo llegaron, y una medida inventada ensuciaría el promedio de §4co.
- Rechaza con un mensaje concreto el **reporte de ventas** (el dueño subió ese primero), el
  Excel de ROHO, y cualquier reporte que **mezcle almacenes** (inicial ≠ final).

### Dos cosas que aparecieron recién con datos reales

1. **147 productos tapan la pantalla.** El reporte trae TODO el almacén: forros, patas,
   esponja por metro. Por defecto se listan los que se mueven o tienen aviso, y el resto
   queda detrás de un botón que dice cuántos son.
2. **«Plata parada» pasó a 145 productos.** Casi todo el almacén no sale por este panel
   (las tiendas venden aparte). Ahora se muestran los 8 con más unidades, el total, y el
   resto a un botón; y el texto dice **«sin entregas»**, no «sin ventas», que era engañoso.

También: las cantidades pueden ser **decimales** (`ESPONJA SIN PICAR 0,38`), así que se
guardan tal cual y se muestran enteras solo cuando lo son (`stockUnid`).

### Qué tiene que hacer el equipo, cada día

1. En el sistema de Moreno: **EXISTENCIAS ALMACEN**, eligiendo **un** almacén (el mismo como
   inicial y final), y bajar el Excel.
2. En el panel: Administración → 📦 Stock y reposición → **📥 Subir existencias (Excel)**.
3. Repetir con el otro almacén si se quiere ver la columna «En fábrica».

`tests/test_existencias.js` — **43 checks**, con dos fixtures **sintéticos**
(`tests/datos/existencias_*.xlsx`): misma estructura exacta que el reporte real —comillas
simples incluidas— y cantidades inventadas, porque **el repo es público y el inventario de la
empresa no va acá**. Contra `origin/main` el test no revienta: dice qué funciones faltan.

## 4cq. 🎯 Que el panel revise los pedidos y tilde solo (2026-09-07)

Con los dos almacenes ya cargados, el dueño puso el dedo en lo que faltaba: *"como que el
agente no revisa los pedidos creo, y selecciona o tickea lo que hay, y lo que falta por
pedir. Y regulariza. Que se tiene que traer de IM."*

Tenía razón. El panel sabía qué había en cada almacén y no lo usaba para **nada de lo que
logística hace a mano todos los días**: abrir pedido por pedido y marcar ✔ hay / ✗ no hay /
📥 recoger de IM. Esas tres marcas ya existían desde §4bx —incluso la de IM, que decía
literalmente «sí hay, pero está en otro almacén y hay que ir a recoger»—; lo único que
faltaba era alguien que supiera llenarlas.

### La regla del reparto: por fecha de entrega

1. Del **DEPÓSITO** primero (de ahí sale el camión) → ✔ hay
2. De **IM** si en el depósito no alcanza → 📥 recoger de IM
3. Si no alcanza en ninguno → ✗ no hay, **y eso es lo que hay que pedir a fábrica**

FIFO por fecha de entrega es lo único explicable cuando dos clientes quieren el mismo
colchón: *«el tuyo sale el martes, el de él salía el lunes»*. Por el orden de la planilla, el
pedido del viernes se llevaría el stock del de mañana.

**Una línea que no se puede cubrir entera no reserva nada.** Con 4 en depósito: el de mañana
(×3) se lleva 3, el del miércoles (×2) no entra en el 1 que queda y va a ✗ — pero **ese 1 no
queda trabado**: el del viernes (×1) sí se lo lleva. Reservar 1 de 3 deja el colchón parado
sin servirle a nadie.

### Los tres números que estaban mal a la primera

- **La lista para ir a IM dice lo que hay que TRAER, no lo del pedido.** Si de 4 uno sale del
  depósito, se van a buscar 3. Un número de más manda a alguien a cargar un colchón que ya
  estaba acá.
- **Lo que falta pedir descuenta lo que quedó suelto.** Un pedido de 5 con 4 en depósito
  necesita que se pidan **1**, no 5: los 4 están ahí, solo que no alcanzan para esa línea.
- Y el que se prueba solo: **el reparto va por fecha**, no por el orden en que están cargados.

### Lo que no toca

Líneas 🏭 pedidas a fábrica para ese cliente (no salen del depósito), pedidos entregados,
borradores de Kommo, y **productos sin contar** — sin un número no se inventa un tilde.

Y no pisa a una persona en silencio: si alguien marcó a mano y el stock dice otra cosa, la
línea sale **resaltada** («⚠️ cambia lo marcado a mano») y hay una casilla para tocar **solo**
lo que está sin marcar. Antes de aplicar se ve la propuesta entera.

Al aplicar, `syncVerificado` deja el pedido igual que si lo hubiera marcado una persona:
«En stock» + verificado, o «No hay» y rojo en la tabla. Volver a revisar después no propone
nada — es idempotente.

### Y los carteles que parecían botones

El dueño, en la misma vuelta: *"el botón PEDIR YA no hace nada, ¿deben pedir manual? Lo mismo
de traer de IM. ¿El botón unir qué hace?"*. Los avisos de «Qué hacer» tenían forma de botón
y no eran botones — el error de diseño es mío. Ahora:

- **🚨 PEDIR YA / 🏭 Pedir esta semana** abren «Pedí a fábrica» con el producto y la cantidad
  sugerida ya puestos.
- **🚚 Traer de fábrica** abre esta revisión, que es donde sale la lista para ir a IM.
- Y el anotador de pedidos dice ahora, con todas las letras, que **no le avisa a la fábrica**:
  el pedido lo hace una persona por teléfono, el panel lo anota, deja de molestar y aprende
  cuánto tarda cada fábrica.
- **🔗 unir** (la otra pregunta): junta dos renglones que son el mismo producto con distinto
  nombre, cuando el catálogo no los reconoce solo. En su pantalla salía en «RECOGER POCKET DE
  MAXIKING» y «MORFEO», que no están en `CODIGOS`.

`tests/test_revstock.js` — **30 checks**. Contra `origin/main` no revienta: dice qué falta.

**Del andamiaje, otra vez:** el fixture tenía un pedido «Entregado» con 50 unidades **del
mismo producto**, y esas 50 se descontaban del depósito (correctísimo) dejando el escenario
en cero. Los cuatro primeros checks fallaron y parecía un bug del reparto. El pedido
entregado usa ahora otro producto, y quedó anotado en el propio test.

## 4cr. 🤖 Lo mejor de la versión que trajo el dueño, adentro del panel (2026-09-07)

El dueño mandó un `.zip` con una versión del panel hecha con ChatGPT: *"chat gpt hizo esto
pero no lo publicó, creo que está mejor, revisá"*.

**Lo revisé midiéndolo, no opinando**: le corrí la batería completa. Resultado honesto —
**está bien hecho y no rompe nada**: 35 suites en verde, y su `.gs` pasó también los dos
tests de backend (78 y 70 checks). Las únicas rojas eran mis dos funciones de hoy que él no
tiene y un texto que yo había cambiado esa misma mañana.

### Lo que hacía mejor que yo (y ahora está adentro)

| | Suyo | Lo que yo tenía |
|---|---|---|
| Nombres | «Acá en fábrica» / «Industrias Moreno · recoger allá» | «En depósito» / «En fábrica» — no decían dónde está parado el que mira |
| Corte | con **hora** (07:00:00) y pregunta si el Excel ya trae las entregas del día | solo la fecha, y yo **adivinaba** la respuesta |
| Historial | guarda los cortes anteriores | pisaba una sola fila, sin historial |
| Recoger vs. fabricar | dos acciones distintas y programables | un consejo de texto que mezclaba las dos |
| Detalle | «3 recoger de Moreno · 1 para fabricar» | «✗ no hay» y listo |
| Dónde se ve | panel fijo arriba de la tabla | una ventana que había que acordarse de abrir |

Todo eso quedó implementado. **El robot 🤖 también es suyo** y lo pidió expresamente el
dueño: *"el emoticón y la imagen de robot me gusta que salga"*.

### Lo que NO se tomó, y por qué

- **Su versión no tilda ningún pedido.** Lo verifiqué: no hay una sola escritura sobre
  `x.chk` en su código, y el propio archivo lo pone como principio («nunca escribe
  entregado/verificado»). Calcula y muestra muy bien, pero después alguien tiene que ir a
  marcar a mano — que es justo de lo que el dueño se había quejado. La escritura de los
  tildes (§4cq) se queda.
- **Su `.gs` cambia** (`2026-09-07-inventario-a`), o sea que habría que republicar el Apps
  Script a mano. Todo lo de §4cr se hizo **sin tocar el backend**.
- **Parte el panel en 5 archivos** (`inventario.js`, `stock-bot.js`…). El panel es un archivo
  solo a propósito: si uno de los cuatro no carga, la función desaparece sin avisar.
- **Sus ~33 KB de lógica nueva no tienen tests.**

### El detalle que más me gustó de lo suyo

La pregunta **«¿este Excel ya incluye las entregas de hoy?»**. §4cn tenía una decisión
documentada y adivinada («descontarlas igual, porque no se sabe la hora»). Ya no hace falta
adivinar: el nombre del archivo trae la hora (`Excel_07092026_08_59_57_…` → 08:59:57), el
panel la muestra, propone la respuesta según sea antes o después del mediodía, y quien sube
el archivo confirma. Se guarda en `STOCK.c.inc` y `stockDesdeSalidas()` decide desde qué día
descontar. Una adivinanza menos.

### Cambios de datos

`STOCK` pasó a `{c:{f,u,hora,inc,alm}, e, p, a, g, al, h}`. `h` es el **historial de cortes**
—solo el resumen: fecha, hora, almacén, cuántos productos y cuántas unidades— porque la fila
del sistema es UNA celda de la planilla y guardar cada inventario entero la reventaría (con
los dos almacenes reales va por 8.246 de 50.000 caracteres). `STOCK.p` ahora distingue
`tipo:'recogida'|'fabrica'`: una recogida tarda 1 día, no lo que tarda fabricar, **no cuenta**
para medir el tiempo de fábrica, y al registrar su llegada las unidades se suman acá **y se
restan de Moreno** — si no, se contarían dos veces hasta el próximo Excel.

Tests actualizados por los textos nuevos (`test_stock`, `test_existencias`, `test_revstock`),
cada uno con la nota de qué cambió y por qué, como manda el LEEME.

## 4cs. ❔ «20 sin contar»: qué eran, y por qué la mayoría estaban en cero (2026-09-07)

Con el almacén cargado, el panel del robot decía **«20 sin contar»** y el dueño preguntó dos
cosas seguidas: *"¿y qué son esos 20 sin contar?"* y *"¿cómo sé qué productos son, si no me
deja ver el listado siquiera?"*. Las dos tenían razón, y por motivos distintos.

### 1. El número estaba y la lista no

Un contador sin lista no sirve para nada: dice que hay un problema y esconde cuál. Ahora la
ventana de revisión lista los productos sin contar —nombre, cuántas unidades, en cuántos
pedidos— con su botón **🔗 unir** al lado, que es lo que casi siempre hay que hacer con
ellos.

### 2. La mitad no estaban «sin contar»: estaban en CERO

El reporte del sistema de Moreno **lo dice él mismo**, en la fila 4:
`(Productos con existencia <> 0)`. Es decir que **lista todo lo que tiene stock**. Entonces
un producto que no figura en el archivo no es «no se sabe cuánto hay»: **está agotado**.

Yo lo estaba tratando como desconocido, y el efecto era el peor posible: **justo el producto
que se acabó era el que el panel no tildaba ni avisaba**. El mismo error de fondo que §4co,
en otro lugar.

La regla nueva (`stockDeposito`), con dos condiciones para no pasarse de listo:

- el reporte tiene que **declarar** que solo lista lo que tiene existencia (`STOCK.c.solo0`,
  detectado del propio archivo — si algún día sacan el reporte completo, esto se apaga solo), y
- el producto tiene que estar **en el catálogo** (`stockClaveDeCatalogo`): así se sabe con qué
  nombre habría aparecido. Lo que el catálogo no conoce puede estar en el Excel con otro
  nombre, así que ahí se sigue sin inventar nada — y para eso está 🔗 unir.

Probado con el archivo real: `DYNAMIC PEDIC 200x200` (en el catálogo, no en el archivo) pasa
a **0** y el panel lo marca ✗ no hay; `MORFEO` y `RECOGER POCKET DE MAXIKING` (que el catálogo
no conoce) siguen sin contar **y ahora se ven en la lista**. En la tabla, un cero que sale de
esta regla lo dice: «no figura en el corte».

`tests/test_existencias.js` — **47 checks** (4 nuevos, incluido que si el reporte NO declara
lo de la existencia se vuelve a no inventar nada).

## 4ct. 🏭 Lo que no está en el Excel HAY QUE FABRICARLO (2026-09-07)

§4cs se quedó a mitad de camino y el dueño lo corrigió de una: *"pero si no hay en el Excel
es porque no hay stock de ese producto y **SE DEBE PRODUCIR**. Ejemplo el colchón smart, el
somier bi relax 160x200… **los pedidos son los que mandan**, y algo que figura que no hay en
los Excel de almacén es porque **no se han fabricado**, en especial si es colchón o somier."*

Tenía razón. Yo había puesto una condición de más: tratar como cero solo lo que estuviera en
el catálogo `CODIGOS` —250 códigos de un Excel viejo—. Resultado: los productos **nuevos**
(COLCHON SMART, COLCHON LITE, SOFT ICE, medidas especiales como 160X200 o 140X211) quedaban
«sin contar», el panel no los tildaba, y **nadie se enteraba de que había que fabricarlos**.
Es el mismo error de fondo de §4co una tercera vez: el caso que más importa era justo el que
se caía por el agujero.

Ahora la única condición es que el reporte **declare** que lista todo lo que tiene existencia
(`(Productos con existencia <> 0)`, se detecta del propio archivo). Todo lo demás que no
figure está en **cero → ✗ no hay → hay que fabricarlo**.

### ⚠️ El riesgo que eso abría, y cómo se cerró

Decir «no hay» de algo que SÍ está —escrito distinto— manda a fabricar un colchón que está en
el depósito. No es hipotético: lo busqué en los archivos reales del dueño y de los 7 productos
que quedaban sin contar, **uno sí estaba**:

| En el pedido | En el Excel del almacén |
|---|---|
| `SOMIER BI RELAX 160X200` | `CH2259 SOMIER BiRELAX 160X200` — **1 unidad** |

Solo cambia un espacio. Los otros seis (SMART, LITE, SOFT ICE, SOMIER 3.5P 200X200, SOMIER
TROPICAL 160X200, ORO VISCOLASTICO 2.5PLZ) no están en ninguno de los dos almacenes: hay que
fabricarlos, como decía el dueño.

`stockClaveInv` cierra ese agujero comparando **apretado** —sin espacios ni signos—:
`SOMIERBIRELAX160X200` en los dos casos. Y como la medida a veces va en su campo y a veces
adentro del nombre (en el pedido el campo medida venía vacío), compara primero la clave
entera y después solo la descripción, uniendo **únicamente cuando no queda ninguna duda**:
si el pedido trae medida, tiene que coincidir; si no la trae, solo se une si hay una sola
candidata. Otra medida nunca se une — decir que hay algo que no hay es peor.

El índice se rehace cuando cambia el inventario (`stockOlvidarIndice`), no en cada consulta.

`tests/test_existencias.js` — **50 checks**, con el caso BI RELAX / BiRELAX tal cual apareció
en los archivos reales.

## 4cu. 📏 «2,5 plz» ES «160x190» — y unir tiene que ser automático (2026-09-07)

Dos correcciones del dueño, seguidas, sobre lo mismo: *"viscolástico 2.5 es el viscolástico
160x190"* y después *"no debería unirse manual, debería ser automático; por algo tenés las
tablas de medidas y sus nombres en plazas, plz o P"*.

Las dos veces tenía razón, y las dos apuntaban a la misma pereza mía: dejarle a una persona
un trabajo que el panel puede hacer con datos que ya tiene.

### 1. Plazas y centímetros eran dos medidas distintas

`MEDIDAS` y `MEDIDAS_LEGACY` estaban en el código **desde siempre y en el mismo orden**
—90x190/105x190/140x190/160x190/180x190/200x200 y 1/1.5/2/2.5/3/3.5 plz— y nadie había unido
las dos listas. Resultado: un pedido cargado en plazas y otro en centímetros eran **dos
productos**; ninguno rotaba lo suficiente y ninguno encontraba su stock.

No lo di por sabido: lo verifiqué contra los archivos del propio dueño, donde el Excel de
ROHO escribe las dos formas juntas en el mismo nombre.

| | veces que aparece en sus archivos |
|---|---|
| 1 plz = 90x190 | 2 |
| 1,5 plz = 105x190 | 6 |
| **2 plz = 140x190** | **15** |
| **2,5 plz = 160x190** | **8** |
| 3 plz = 180x190 | 6 |
| 3,5 plz = 200x200 | (completa la serie que ya estaba en las dos listas) |

`normMedida` traduce, así que la equivalencia vale en **todo** el panel —clave de producto,
catálogo, ranking, medidas especiales— y no solo en el stock. `medidaDeTexto` también saca la
medida cuando viene en plazas adentro del nombre y sin centímetros.

### 2. El nombre al que le falta una palabra

Su caso: el pedido dice `COLCHON ORO VISCOLASTICO 2,5 PLZ 160X190CM HEAVEN` y el catálogo
`ORO ANATOMICO VISCOLASTICO 160x190`. Falta **ANATOMICO**, así que la regla de §4co (todas
las palabras del catálogo adentro del nombre) no lo encontraba y quedaba para 🔗 unir a mano.

Ahora se une solo, pero **con el freno puesto**, porque acá el panel adivina:

- tiene que haber **medida**, y coincidir — sin medida no se arriesga nada;
- al menos **dos palabras en común**, así «CARIOCA» a secas nunca se une a CARIOCA PREMIER ni
  a CARIOCA RIO, que son colchones distintos;
- y un **ganador claro**: el doble de palabras en común que cualquier otro candidato.

Se marca `por:'parecido'` y la tabla lo muestra con **≈ (unidos por parecido)**, para poder
desconfiar y separarlos si hace falta. Comprobado que **no** une CARIOCA sola, PILLOW sola, ni
confunde ESPECIAL ORTOPEDICO con ESPECIAL SEMIORTOPEDICO ni con ORTOPEDICO D/C.

Con esto, el viscolástico del dueño encuentra sus **3 unidades** en el almacén, sin que nadie
toque nada.

### Y de yapa, 🔗 unir dejó de ser una lista alfabética de 180 productos

Cuando algo igual queda sin unir, el desplegable ahora ordena por **parecido** —palabras en
común, misma medida, que tenga stock—, marca los mejores con ⭐ y avisa arriba a cuáles se
parece. Buscar a mano entre 180 nombres no lo hace nadie; ese era el motivo real por el que
el botón no se usaba.

`tests/test_stock.js` — **101 checks** (8 nuevos, incluidos los que comprueban lo que NO se
debe unir). Batería: 40 suites, 1521 checks.

## 4cv. 🔢 El CÓDIGO manda sobre cualquier nombre (2026-09-07)

El dueño, mirando la lista de «sin contar»: *"sigo viendo productos ahí que dicen sin marcar
—un somier flex, oro bi relax, etc.— **que tienen hasta CÓDIGO**"*.

Lo busqué en sus archivos y tenía toda la razón, con un caso que dolía:

| | |
|---|---|
| En el pedido | `SOMIER TROPICAL 180X190 **CM**` · cód CH2356 |
| En el Excel de Moreno | `SOMIER TROPICAL 180X190` · cód CH2356 · **1 unidad** |

Sobraba un «CM». El código era idéntico en los dos lados, y el panel lo daba por no contado
**teniéndolo**. El código es el identificador más fuerte que existe —no depende de cómo lo
escribió cada uno— y yo no lo estaba usando contra el almacén: solo contra el catálogo viejo
de 250 códigos, y CH2356 no está ahí.

Ahora el importador guarda **código → clave** de cada producto del Excel (`STOCK.c.cod`,
`STOCK.g[…].cod`) y `stockClaveInv` lo consulta **antes que cualquier nombre**. De los 286
productos de los dos almacenes, **60 tienen códigos que el catálogo no conoce**: esos eran
los que se perdían. El índice completo ocupa 8,7 KB y la fila del sistema quedó en 19.180 de
50.000 caracteres.

Además: un corte cargado **antes** de este cambio no trae los códigos, así que el panel lo
detecta (`stockCorteViejo`) y avisa con un botón para volver a subir el Excel, en vez de
dejar al equipo mirando una lista de «sin contar» sin entender de dónde sale. A un conteo
hecho **a mano** no se le reprocha nada: se le ofrece, en tono suave, que suba el Excel.

## 4cw. 📇 La tabla de códigos del equipo, y «somier pedic es el somier negro» (2026-09-07)

El dueño pasó la tabla de códigos que usan ROHO y Heaven *"para facilitar la búsqueda por
código o por nombre o similar"*, más un dato suelto: *"el somier pedic es el somier negro"*.

Comparada contra el catálogo del panel, la tabla es una **verificación independiente**:

- **74 códigos coinciden exactamente**, medida incluida.
- **0 discrepancias de medida** — o sea que la equivalencia plazas↔centímetros de §4cu está
  bien en los 74 casos.
- **4 códigos nuevos**: CH2393/CH2394/CH2395 (ESPECIAL ANTIALERGICO 2,5/3,0/3,5) y CH1034.
- **6 con otro nombre**: lo que el catálogo llama `ORO ANATOMICO VISCOLASTICO`, el equipo lo
  llama `ORO VISCOLASTICO` — y a veces `ORO VICOLASTICO`, sin la S.

Lo que se hizo:

1. Los 4 códigos nuevos entraron al catálogo.
2. `PROD_ALIAS`: **SOMIER PEDIC = SOMIER NEGRO** y **ORO (VI)SCOLASTICO = ORO ANATOMICO
   VISCOLASTICO**. Se traduce antes de comparar, así que vale tanto para el stock como para
   lo que escribe una vendedora a mano. El viscolástico dejó de resolverse «por parecido»
   (una adivinanza, §4cu) y pasó a resolverse **por nombre**, que es más firme.
3. La medida ahora también se entiende escrita como en esa tabla: **«2,5» a secas**, sin
   «plz», y como número al final del nombre («SOMIER NEGRO 2,5»). ⚠️ Y el bug que casi se
   escapa: `MEDIDA_PLZ` tiene la clave `'2'` pero el texto trae `'2,0'` → sin `parseFloat`,
   la tabla del propio dueño no encontraba nada. Con eso resueltos SEMIPEDIC, PILLOW PEDIC,
   EUROPEDIC y DYNAMIC PEDIC, que estaban todos escritos así.

### Y el autocompletar de las vendedoras

*"tampoco el código del antialérgico sale en la lista de autocompletar; revisá que salgan los
nombres según el código o nombre"*. Dos cosas: el código faltaba en el catálogo (arreglado
arriba), y la lista solo se podía buscar por nombre. Ahora cada opción lleva el código al
final —`ESPECIAL ANTIALERGICO 160x190 · CH2393`—, así el **mismo campo sirve para buscar por
nombre o por código**, y al elegirla se completan producto, medida y código. Escribir
`ch2393` en el campo Código ya completa el nombre solo.

**Y algo que estaba tapando avisos**: el cartel de «volvé a subir el Excel» se comió con un
`else if` al de «el corte tiene N días». Los dos pueden pasar a la vez.

Batería: **43 suites, 1.605 checks, 0 fallas.**

## 4cx. 🚫 Qué NO se le pide a la fábrica: ni las ATC ni lo de tienda (2026-09-07)

El dueño miró la primera lista real de «hay que fabricar» y encontró dos clases de renglones
que no tenían nada que hacer ahí. Las dos son del mismo tipo de error: el panel estaba
contando **líneas de pedido**, cuando lo que la fábrica necesita es **productos a producir**.

### 1. Las ATC no son ventas

> *"Estás mezclando las ATC diciéndole que deben pedir a fábrica cuando eso son reparaciones
> o entregas. Las ATC no deberían entrar COMO PRODUCTOS A MANDAR A FABRICAR."*

Tiene razón, y es obvio una vez dicho: los motivos de una ATC son hundimiento, resortes,
retapizado, ruido, patas, tela. **Se arregla lo que el cliente ya tiene** — no se le vende
otro. Contarlas inflaba tres cosas a la vez: la rotación (venta que no existió), el
«vendido sin entregar», y —lo que importa— la lista que se le manda a fábrica.

Quedan afuera de **todo** el cálculo de stock: rotación, comprometido, salidas y la revisión
automática. El embudo es uno solo, `stockCuenta(p)`: ni filas del sistema, ni borradores de
Kommo, ni reclamos.

> ⚠️ **El caso que sí saca mercadería y aun así queda afuera**: una ATC de «cambio de
> producto» se lleva un colchón del depósito de verdad. Ese descuento **no se hace acá**, y
> no hace falta: el corte del Excel del día siguiente ya lo refleja, porque mide lo que hay
> en el almacén, no lo que el panel cree que debería haber.

### 2. Protectores y sábanas no se fabrican, se entregan en tienda

> *"Y los pedidos a fábrica son solo colchón, somier, almohadas o cabeceras: protectores,
> sábanas, manta, MDF, juego sábana no son para pedir a fábrica, eso se entregan en tienda.
> No tomar en cuenta."*

Son accesorios que el cliente se lleva del local. No viajan en el camión, no salen del
almacén de logística, y «pedirlos a fábrica» no quiere decir nada. `esProdDeTienda(x)` los
saca de las salidas, del comprometido, de la tabla de stock y del reparto automático.

> ⚠️ **ES UNA LISTA NEGRA A PROPÓSITO, y esto es lo que hay que entender antes de tocarlo.**
> La pregunta natural sería «¿esto es un colchón?» — y **no funciona**: los colchones del
> catálogo casi nunca dicen COLCHON. Se llaman TITANIO LATEX, MEMORY FLEX, ORO BI RELAX,
> PILLOW PEDIC, SEMIPEDIC. Una lista blanca dejaría afuera medio catálogo.
> La pregunta «¿esto es un accesorio?» **sí** funciona, porque a los accesorios siempre se
> los nombra por lo que son: PROTECTOR, SÁBANA, MANTA, CUBRECAMA.
> Por lo mismo, **PROTECTOR gana aunque el renglón diga COLCHON**: «PROTECTOR DE COLCHON» es
> un protector.

> ⚠️ **MDF lleva guarda.** El dueño lo nombró entre los accesorios, pero una **CABECERA o un
> RESPALDAR de MDF sí se fabrica** (RESPALDAR PRAG. está en el catálogo, con 9 códigos). Si
> la palabra MDF sola alcanzara para sacar la línea, se dejarían de pedir cabeceras. La regla
> es: si el renglón nombra el mueble, manda el mueble.

### Que no parezca que el panel las perdió

Sacar cosas del cálculo sin decirlo es peor que no sacarlas: alguien cuenta 8 líneas en el
pedido, ve 5 en la revisión y deja de confiar. Así que se cuentan y se muestran, arriba de
todo, al lado de las otras: **🎧 ATC — reclamos, no entran** y **🏪 se entregan en tienda**.
Están en el panel fijo y en la ventana de la revisión.

### Y la puerta de atrás que casi queda abierta

El Excel del almacén trae protectores y sábanas. `stockData()` lista **también** lo que se
contó alguna vez aunque hoy no esté en ningún pedido (§4co) — y por ahí los accesorios
volvían a la tabla sin pasar por ningún pedido. Lo mismo con el almacén de Moreno. Los dos
recorridos filtran ahora por la misma regla.

**Dientes verificados** (apagando las dos funciones y recalculando sobre el mismo escenario):
lo que hay que fabricar pasa de 2 a 4 colchones, las líneas del pedido con accesorios de 1 a
4, y aparecen 3 accesorios en la lista para fábrica y 3 en la tabla de stock. O sea: los
checks nuevos fallan si se apaga la función, que es lo único que los hace valer algo.

Batería: **43 suites, 1.612 checks, 0 fallas** (40 de `correr.sh` + las 3 de Python, que van
aparte). `tests/test_revstock.js` pasó de 30 a 37 checks — la sección 8 es esta.

## 4cy. 🔬 La prueba con los Excel reales, y lo que sacó a la luz (2026-09-07)

El dueño pidió *"prueba de que el bot ahora detecta automático los productos, indica qué
falta, qué recoger, qué mandar a pedir, sin errores en los productos/listas, y marca los
pedidos"*. Se hizo de punta a punta, **con los dos Excel reales del 07/09** (logística
08:59, Moreno 09:15) subidos por el mismo botón que usa el equipo, y con pedidos escritos
como los escriben las vendedoras: por código, por nombre con plazas («PILLOW PEDIC 2
PLAZAS»), con el alias («oro vicolastico 2.5», «somier pedic 2 plz»), al estilo ROHO
(«COLCHON ECO FLEX 2 PLAZAS 140X190CM FLEX»), una ATC, un protector, una línea 🏭.
Cada número se cotejó **a mano** contra los archivos (14 productos, acá y Moreno).

> ⚠️ La prueba vive en el scratchpad, **no en el repo**: usa el inventario real y el repo es
> público. Lo que sí queda en el repo es `tests/test_identidad.js`, con nombres reales del
> almacén y cantidades inventadas.

### Lo que falló la primera vez (15 de 71 checks)

Cuatro eran míos: mi lectura de control de los Excel saltó los códigos escritos en
**minúscula** (`ch1201` en Moreno, `ch1682` en logística) y el panel tenía razón. Los otros
eran del panel, y de tres clases:

**1. Renglones con un código que el catálogo no conoce se sumaban POR NOMBRE a otro
producto.** El caso que lo delata: Moreno tiene `SR2012 SOMIER ROHO PEDIC 140X190` (3) y
`CH1297 SOMIER PARRILLA NEGRO 140X190` (10). «SOMIER NEGRO» ⊆ «SOMIER PARRILLA NEGRO», así
que el panel decía **«hay 13 somieres negros»**. Igual: `CH1001 Almohada Heaven Celeste`
(28) sumada a la `ALMOHADA 50x70` (21) → «hay 49»; `CH2151 SOMIER SEMIPEDIC` sumado a un
**colchón**; `ICH2195 FORRO COLCHON PILLOW PEDIC` —una funda— sumado al colchón PILLOW
PEDIC; `CH1311 SUEÑA CONFORT PLUS +2CM` al CONFORT PLUS.

> **La regla nueva: dos códigos son dos productos.** El sistema del almacén no se equivoca
> con sus propios códigos. Un renglón cuyo código el catálogo no conoce queda **con su nombre
> crudo, en su propio renglón** (`stockClaveCruda`), y nunca se une «por parecerse». Si de
> verdad es el mismo producto, el dueño lo une mandando el código —como hizo en §4cw— y
> mientras tanto se ve como renglón aparte, que es un error visible y barato. Sumar en
> silencio era el error caro. Los únicos renglones con códigos distintos que siguen sumándose
> son los que **el propio catálogo del dueño** declara iguales: los colores del RESPALDAR
> PRAG. y los dos códigos del ESPECIAL ANTIALERGICO (CH1075/CH2391, CH1078/CH2392).

**2. Medidas que no se leían.** El almacén escribe «SOMIER BAHIA BEIGE **2,0 - T.A.**»,
«CONFORT PLUS **1,5 [Pr.]**», «FORTE FLEX **2,0 VER. 2026**», «COLCHON SOFT **140\*190**».
El número suelto solo se entendía al final del nombre, y el asterisco no era una X. Así el
SOMIER BAHIA 1,5 y el 2,0 terminaban en **un** renglón sin medida. `medidaDeTexto` entiende
las cuatro formas; «VER. 2026» y «22 CM» no son medidas.

**3. «ALMOHADA NASA» no encontraba la `CH1195`.** El catálogo la abrevia «ALM/NASA», el
almacén la llama «ALMOHADA VISCOLASTICA NASA» y la vendedora «ALMOHADA NASA». Caía en la
ALMOHADA a secas sin medida y el panel **mandaba a fabricar 2 almohadas habiendo 33**. Alias
`ALM/NASA → ALMOHADA NASA` (y `ALM/HEAVEN`), aplicado a los dos lados.

### Las tres reglas que faltaban en `stockEnCatalogo`

- **La familia manda.** SOMIER, RESPALDAR, CABECERA, ALMOHADA, COLCHONETA, FORRO, ARMAZON,
  COMBO. Un producto solo puede ser una entrada del catálogo de su misma familia; la familia
  «vacía» es el colchón (el catálogo casi nunca escribe COLCHON, §4cx).
- **Empate = no se adivina.** «SOMIER BAHIA NEGRO» tiene adentro «SOMIER BAHIA» y «SOMIER
  NEGRO», dos somieres distintos. Elegir el primero de la lista era elegir al azar.
- **Una palabra de más que es de OTRO producto = no es este.** «SUEÑA CONFORT PLUS»: SUEÑA
  es de los SUEÑA ESSENTIAL/PREMIER, así que no es el CONFORT PLUS. Las marcas (HEAVEN, BY,
  ROHO) no cuentan: «SEMIPEDIC BY HEAVEN» sigue siendo el SEMIPEDIC.

Y una cuarta, en `stockInfo`: **el nombre exacto del almacén gana sobre lo que el catálogo
«cree»**. Si el pedido dice «SOMIER PARRILLA NEGRO 2 PLAZAS» y en el almacén hay un «SOMIER
PARRILLA NEGRO 140X190» con su código, ES ese —aunque por palabras también parezca el
SOMIER NEGRO—. Solo cuando el nombre crudo no está en ningún almacén se usa el catálogo.

### Dos detalles del índice que estaban mal

- `stockPartes` compara ahora sin la medida adentro del nombre: «COLCHON TITANIO ICE
  140X200|140X200» y «TITANIO ICE|140X200» son lo mismo. Efecto colateral bueno: «SOMIER
  RARO 180X190 **CM**» se une al «SOMIER RARO 180X190» también sin el código (el test de
  §4cv documentaba esa limitación; se actualizó).
- La misma clave en los dos almacenes contaba como **dos candidatas** y «ALMOHADA» sin medida
  creía que había duda. Ahora es una.

### La clave cruda cambia de forma

Lo que no es del catálogo pasa de `COLCHON XYZ|140X190` a `XYZ|140X190`: sin medida adentro
del nombre, sin relleno (COLCHON, CM, NUEVO…), sin el color colgado con guion. `leerStock`
migra las claves viejas al leer la fila (test 7 de `test_stock.js`); las **uniones a mano**
(`STOCK.a`) hechas sobre claves crudas viejas dejarían de aplicar — no se conoce ninguna.

### Resultado

- Prueba de punta a punta con los Excel reales: **76 checks, 0 fallas** (tras los arreglos).
  Detecta las 11 formas de escribir, reparte por fecha, la lista de Moreno y la de fábrica
  salen con sus unidades y códigos, Aplicar deja los tildes y los estados, PEDIR YA y
  Programar recogida anotan y el producto pasa a «en camino».
- Sobre los archivos reales ya **no queda ninguna suma entre códigos distintos** que el
  catálogo no autorice (se verificó renglón por renglón, envolviendo `stockClave`).
- `tests/test_identidad.js`: 37 checks nuevos. Contra el panel anterior fallan (las funciones
  no existen); la evidencia fuerte es la prueba real: 15 fallas antes, 0 después.
- Cuatro checks viejos cambiaron de expectativa, cada uno con su comentario (§4cy).
- Batería: **44 suites, 1.649 checks, 0 fallas** (41 de `correr.sh` + 3 de Python).

**Preguntado y resuelto — en §4cz.** El almacén llama «COLCHON ESPECIAL **JUNIOR**» a
`CH1075`/`CH1078`, que el catálogo viejo tenía como ESPECIAL ANTIALERGICO. Primero leí la
respuesta del dueño como «mismo código, nombre viejo» y los dejé sumando al antialérgico;
con la tabla que mandó después quedó claro que **no**: son otro colchón, discontinuado.

## 4cz. 🛑 El JUNIOR ya no se fabrica: el antialérgico es CH2391…CH2396 (2026-09-07)

A la pregunta de §4cy el dueño contestó *"Ya no se fabrica el Jr, ahora es antialérgico"* y,
cuando le dije que entonces sumaba `CH1075`/`CH1078` como antialérgico, mandó la tabla:

| Código | ESPECIAL ANTIALERGICO |
|---|---|
| CH2396 | 1.0 PLZ · 90x190 |
| CH2391 | 1.5 PLZ · 105x190 |
| CH2392 | 2.0 PLZ · 140x190 |
| CH2393 | 2.5 PLZ · 160x190 |
| CH2394 | 3.0 PLZ · 180x190 |
| CH2395 | 3.5 PLZ · 200x200 |
| (sin código) | Med.Esp. 140x200 / 160x200 / 180x200 |

*"Ese es el antialérgico que se fabrica y sus códigos."* O sea: **el JUNIOR es OTRO colchón**,
discontinuado, con sus propios códigos (`CH1075` 105, `CH1076` 90, `CH1078` 140 — los del
almacén), del que quedan unidades (4 + 1 + 6 en logística) y que se vende hasta agotar.
Sumarlo al antialérgico era justo el error de §4cy con otro disfraz: un cliente que compra
un antialérgico se llevaba un JUNIOR «porque había».

### Lo que cambió

- **Catálogo:** `CH1075`/`CH1078` pasan a **ESPECIAL JUNIOR** (105/140), entra `CH1076`
  (JUNIOR 90) y entra **`CH2396`** (antialérgico 90, faltaba). **Sale `CH1137`**: el
  catálogo viejo lo tenía como antialérgico 90 y no está en la tabla del dueño; si algún día
  aparece en un Excel, se ve con el nombre que le ponga el almacén.
- **`x:1` en el catálogo = ya no se fabrica.** Los tres JUNIOR lo llevan
  (`stockDescontinuadoK`). Con eso:
  - el 🤖 lo reparte y lo tilda como a cualquiera (✔ hay / ✗ no hay), pero lo que falta **no
    va a la lista de «hay que fabricar»**: va a una lista aparte, «🛑 No alcanza y ya no se
    fabrica», con la ficha correspondiente en el panel fijo y en la ventana;
  - en la tabla de stock el aviso es **«🛑 Se acaba y no se fabrica más»** (`agotado`), en
    vez de PEDIR YA, y `stockCuantoPedir` devuelve 0; con stock de sobra dice «Sobra · ya no se
    fabrica: vender lo que queda»;
  - el mensaje a la fábrica nunca lo nombra. Traerlo de Moreno sí sigue valiendo: existe.
- Las medidas especiales del antialérgico (140x200, 160x200, 180x200) no tienen código: se
  hacen a pedido y la vendedora las marca 🏭, como hasta ahora.

`tests/test_identidad.js` sección 5 (7 checks): 6 JUNIOR vendidos con 4 en el almacén → ✗
no hay, los 2 que faltan van a «no se fabrica más» y no al pedido a fábrica; el
antialérgico sí va; «1.0PLZ 90X190CM» es el CH2396; CH1137 no existe.

## 4da. 🔁 Rotación ≠ pedido único: 45 en una venta no son «1,6 por día» (2026-09-07)

El dueño subió los dos Excel y encontró esto en la tabla:

> MORFEO · 140x190 — vende 1,6 por día · 45 en 28 días · venta a los saltos · **0 acá** ·
> se corta **hoy** · 🚨 **PEDIR YA — la fábrica tarda 3 días → pedí 23 ya**

> *"El colchón morfeo ya se entregó y dice mandar a pedir. ¿Qué pasa si es un pedido único?
> Que ya se entregó, es más está entregado, y lo marcás como mandar a pedir… Solo debés
> pedir mandar a producir PRODUCTOS que tienen ROTACIÓN. Una única entrega o 2 en 1 mes no
> es tener rotación, eso es pedido único."*

**Error de fondo, no de detalle.** Desde §4co el panel medía la demanda dividiendo lo
vendido por los 28 días de la ventana, y **nunca se preguntó en cuántas ENTREGAS** se había
vendido. Una venta mayorista de 45 colchones, ya entregada y sin nada pendiente, daba
`45/28 = 1,6 por día`; de ahí «se corta hoy» y «pedí 23 ya» de algo que nadie más pidió. Es
la peor clase de error de este panel: **manda a producir plata contra una demanda que no
existe.**

### La regla

Menos de **3 entregas distintas** en el mes (`STOCK_VENTAS_MIN`) = no hay rotación. Se
cuenta `nVentas` —pedidos distintos, no unidades— junto con `vendidos`.

| | rota (≥3 entregas) | no rota (1 o 2) |
|---|---|---|
| `porDiaReal` (crudo, para mostrar) | se calcula | se calcula |
| `porDia` (proyección y cuánto pedir) | = `porDiaReal` | **0** |
| lo vendido y sin entregar (`comp`) | se cubre | **se cubre igual** |
| aviso sin nada pendiente | según se corte | 📦 **Pedido único** |

⚠️ **Lo vendido sin entregar NO es una estimación: está vendido.** Si alguien vende 6 de algo
que nunca se vendió antes y no hay stock, el panel sigue diciendo que hay que conseguirlos —
solo que por los 6 que existen, no por un ritmo inventado. Esa es la línea divisoria de todo
el cambio: **no se estima demanda futura; sí se cubre la vendida.**

⚠️ **«Plata parada» sigue usando el ritmo crudo (`porDiaReal`), y es a propósito.** Mira para
atrás —cuánto tardaría en salir lo que hay, al ritmo al que salió— y no promete nada ni pide
nada. Justamente el caso que más importa ahí es el que casi no rota: con `porDia` (que vale 0)
el producto vendido 2 veces en el mes no podría decir «hay para 14 meses», que es lo que hay
que decirle al dueño.

### Lo que se ve

- La columna de venta muestra **«45 en 28 días · 1 entrega»** y debajo, en ámbar, «pedido
  único: no se estima ritmo». El dato no desaparece.
- El aviso pasa de 🚨 PEDIR YA a **📦 Pedido único**, con la explicación: *«45 unidades en 1
  entrega en 28 días: es un pedido puntual, no una venta que se repita. No se repone por las
  dudas — si vuelven a pedir, se pide contra ese pedido.»*
- El mensaje a la fábrica no lo nombra. Si entra por unidades comprometidas, dice «pedido
  puntual — N en M entregas» en vez de «se venden X por día».

Medido sobre los dos Excel reales con tres ventas mayoristas: **3 «PEDIR YA» falsos
desaparecen, 0 avisos reales se pierden.**

### Dos fixtures que mentían

`test_stock.js` modelaba «el MEMORY vende 1 por día» como **una sola entrega de 28
unidades** — que es exactamente lo que la regla nueva descarta. La prueba no estaba mal de
intención (quería probar el margen más grande de la venta despareja, §4co) sino de datos:
se repartieron las 28 en 4 entregas de la última semana, con las otras 3 en cero. Sigue
siendo «a los saltos» (cv 1,73 → margen 5) y ahora además es rotación de verdad.

`tests/test_rotacion.js`: 22 checks — el caso del MORFEO tal cual, 2 entregas tampoco rotan,
15 entregas sí, y el que no rota pero tiene 6 vendidos sin entregar igual se pide.

### Y de paso, la otra pregunta del dueño

Sobre la revisión automática: *"pide tickear algo que ya estaba tickeado o marcado"*. Se
revisaron las líneas contra los dos Excel: **el panel tenía razón en las tres verificables**
(SOMIER FLEX 180x190 no está en ningún almacén → ✗; SOMIER TITANIO LATEX 140x190 tiene 0 acá
y 3 en Moreno → 📥; SOMIER NEGRO 140x190 tiene 2 acá → ✔). Los tildes viejos eran de antes de
que existiera el inventario. Lo que sí faltaba era **decir por qué**: la línea que pasaba a
«✔ hay» no mostraba nada, y contradecir a una persona sin dar el dato parece un capricho.
Ahora las tres marcas llevan su explicación («hay 2 acá en fábrica»).

## 4db. 🔎 Buscar pedidos: por cliente, por producto y entre dos fechas (2026-09-07)

> *"Extrae del panel todos los pedidos de Juan Pablo Paredes que digan carioca premier,
> carioca bahía, premier deluxe, desde el primero de agosto al seis de septiembre, y después
> dale un PDF."*

**Lo primero fue decir que yo no podía hacerlo.** Los pedidos viven en la planilla de Google
del dueño y desde el sandbox el proxy bloquea todos los dominios de Google: no tengo —ni tuve
nunca— acceso a los datos reales. Lo que sí se puede es dejar el panel haciendo esa consulta,
que además sirve para la próxima vez y para cualquier otro cliente.

No existía nada parecido: había reportes por día y por mes (📊 Reporte, 🛏️ Productos), pero
ninguno que cruzara **cliente + producto + rango de fechas**. Ahora está en Administración →
**🔎 Buscar pedidos**.

### Cómo busca, y por qué así

- **El cliente, por PALABRAS y no letra por letra.** «juan pablo paredes» encuentra «JUAN
  PABLO PAREDES ROJAS» y «Paredes, Juan Pablo»: tienen que estar todas las palabras
  escritas, en cualquier orden. Comparar el texto entero fallaba con el segundo apellido, que
  es como está cargada media planilla. El campo tiene autocompletado con los clientes que ya
  existen.
- **Los productos, separados por COMA**, y entra el renglón que tenga **cualquiera** de
  ellos; dentro de cada término tienen que estar todas sus palabras. Sin acentos ni
  mayúsculas (`stockNorm`), así **«bahía» encuentra «BAHIA»** — que es exactamente el caso
  que pidió el dueño.
- **La fecha es la de salida** (`fechaSalida`), la misma de todo el panel: la de entrega si la
  tiene, la de carga en una venta de tienda.
- **Sale el RENGLÓN que coincide, no el pedido entero.** Si un pedido trae un CARIOCA PREMIER
  y cuatro almohadas, en una búsqueda por «carioca premier» sale el colchón y no las
  almohadas: es una cuenta, no un remito.
- **Los borradores de Kommo quedan afuera** (todavía no son ventas). **Las ATC entran**,
  marcadas, porque para cerrar una cuenta hay que verlas.
- ⚠️ **Sin cliente ni producto no devuelve el panel entero: pide un dato.** Un listado de
  3.000 renglones no es una respuesta.

### El PDF

Por **🖨 Imprimir / PDF → «Guardar como PDF»**, igual que la hoja de ruta: el navegador ya lo
hace y no hay que cargar ninguna librería (§4cp ya evitó esa dependencia para el xlsx, por lo
mismo). La hoja impresa lleva su propia carátula —cliente, productos, período, totales y
fecha de emisión— porque la barra de filtros no se imprime y sin eso el papel no diría de qué
es. También hay **📋 Copiar** para mandarlo por WhatsApp.

Las cuentas van con precio unitario, subtotal y total, y si algún renglón no tiene precio
cargado lo dice arriba en ámbar en vez de sumar mal en silencio.

⚠️ Dos detalles que el papel no perdona y por eso están cuidados: los importes van con
`nowrap` (un «Bs 1.500,00» partido en dos renglones en una hoja de cobro es inaceptable), y
el plural de «renglón» es **«renglones»**, sin acento — el atajo de pegarle «es» al singular,
que se usa en todo el panel, acá escribía «renglónes» en la carátula impresa.

`tests/test_buscar.js`: 28 checks. Los que más importan son los de lo que **no** tiene que
entrar (un día antes, un día después, otro cliente, CARIOCA RIO cuando se pidió CARIOCA
PREMIER, un borrador), porque en una hoja que se le manda al cliente un renglón de más es una
discusión.

## 4dc. 🔀 Dos manos en el mismo panel: la ventana de 15 días, la rotación en 3 niveles, y
     hacer que convivan (2026-09-07)

Entre el §4db y esta entrada, el dueño usó **otra herramienta de IA** (dicho con sus propias
palabras: *"chat gpt trabajo y corrigio cosas que tú no podías"*) para seguir tocando
`pedidos.html` mientras yo no estaba corriendo. Tres commits sin bitácora:

- **`03bde11` — ventana de 15 días y rotación en 3 niveles.** `STOCK_VENTANA` de 28→15;
  `o.sem` de 4 tramos semanales a 3 tramos de 5 días; y el `rota` binario de §4da se abre en
  `o.rotacion`: `baja` (poca rotación, como antes), `media` (≥3 entregas pero sin volumen
  sostenido: margen FIJO de `STOCK_COLCHON`, sin mirar el desvío) y `alta` (≥15 unidades
  repartidas en ≥2 de los 3 tramos: recién ahí se confía en el desvío para escalar el
  margen). Cada nivel también fija cuánta reserva pedir además de lo justo (`cubrir`: 0/3/7
  días). Y una revisión nueva, `revisarStock`/aviso `revisar`: si hay más unidades marcadas
  «✔ hay» a mano que las que dice el inventario, avisa ANTES de proponer una reposición
  sobre un saldo que no cierra.
- **`d239037` — Carioca Río/Premier/Bahía discontinuados.** Marca esos códigos con `x:1`
  (el mismo campo de §4cz para el JUNIOR) y agrega `stockCariocaDescontinuado`: por nombre,
  no por código puntual, así que cualquier código nuevo de esas líneas también queda
  cubierto. `abrirStockPedido`/`abrirStockPedidos` rechazan pedirlos a fábrica.
- **`0e3e334` — no esconder lo ya revisado.** Los contadores de la revisión automática
  (§4cq) ahora suman también las líneas YA marcadas, no solo las propuestas nuevas — antes,
  con «tocar solo lo sin marcar» activado, una línea marcada «📥 recoger» que seguía
  pendiente de ir a buscarse desaparecía del conteo. Y un detalle plegable lista esas líneas
  ya revisadas, con acceso directo al pedido.

**Nada de esto pisó lo mío**: usaron los mismos campos que dejé (`nVentas`, `x:1`,
`stockDescontinuadoK`) y construyeron encima, no en contra. Mi propio rebase conservó su
trabajo sin conflictos. Pero dos cosas se rompieron por el efecto combinado, y son
precisamente el tipo de daño que nadie ve hasta que alguien mira con lupa:

### 1. Mis tests quedaron desactualizados, no el panel

`test_rotacion.js` y `test_stock.js` fallaban 8 comprobaciones. Verifiqué una por una antes
de tocar nada: **ninguna era un bug real**, todas eran fixtures construidos para una ventana
de 28 días que ahora mide 15. El caso más ilustrativo: `test_rotacion.js` armaba «ARES, 45
unidades en 15 entregas» con `atras(1..15)` — quince ENTREGAS, pero abarcando quince DÍAS
DISTINTOS empezando en «ayer», o sea que la entrega más vieja caía en «hace 15 días». Con la
ventana en 28 días eso entraba entero; con la ventana en 15 (el borde es `diasAtras(14)`,
o sea desde «hace 14 días»), la entrega de «hace 15» quedó **un día afuera** — y el test
pasó de contar 15 entregas a contar 14 sin que nadie tocara el archivo. Reescribí el reparto
para que lea `STOCK_VENTANA` en vivo y calcule las fechas desde ahí (`Math.round(i*(V-1)/14)`
en vez de `i` a secas), así que la próxima vez que alguien —yo, la otra herramienta, quien
sea— cambie el ancho de la ventana, este test sigue cayendo adentro solo.

`test_stock.js` fue más laborioso: el ECO FLEX del escenario vendía 28 unidades a lo largo de
28 días exactos (una por día) para probar «vende parejo, margen 2 días» y el proyectar «se
corta en 4 días con 12 en depósito, comprometidos 26». Con la ventana en 15, la mitad de esa
historia (las entregas «de ROHO», días 21 a 27) quedaba afuera. Reescribí el reparto para que
entre completo en 15 días —5 días del sistema/pendiente, 5 «de vendedora», 5 «de ROHO», uno
por tramo— y **verifiqué a mano, antes de escribir un solo assert, que `porDia` sigue dando
exactamente 1 y `cv` exactamente 0**: con eso, TODAS las cuentas derivadas (corte en 4 días,
pedir 14, margen 2) dan los mismos números que antes de que la ventana cambiara, sin
coincidencia — las elegí así a propósito para que el test siguiera siendo comparable con sus
versiones anteriores. El MEMORY FLEX (venta a los saltos) necesitó el mismo trabajo: con solo
1 de sus 3 tramos con ventas ya no calificaba para rotación `alta` (hacen falta ≥2 tramos), y
sin `alta` el margen queda FIJO en 2 —el desvío ya no se mira— así que dejó de dar el margen
de 5 que el test esperaba. Lo repartí en 2 tramos (14 unidades recientes + 1 unidad hace 6
días) para que siguiera siendo genuinamente disparejo Y calificara. Los únicos números que
cambian de verdad (no por mi elección, sino porque la ventana más corta pesa distinto) son la
plata parada del PILLOW: 30 unidades para 2 ventas dan ~7,5 meses de cobertura, no ~14 —
menos ventana, el mismo ritmo pesa más por día.

### 2. El texto «4 semanas» quedó mintiendo

`STOCK_VENTANA` bajó a 15 días (~2 semanas), pero dos avisos —«plata parada» en la ficha del
producto y en el resumen de Administración— seguían escritos con el número **literal** «4
semanas» en vez de leer la constante. Nadie lo iba a notar mirando el código (el texto
compila igual), pero el dueño sí lo iba a leer, y es información que le llega directo:
un producto sin ventas en 15 días pasaría por sin ventas en «4 semanas» (28 días), que es
casi el doble. Corregido a interpolar `STOCK_VENTANA` en las dos, como ya hacían otros
avisos de la misma pantalla.

### 3. Un aviso que nunca podía aparecer

`stockAvisoDe` tenía una rama `'lenta'` (badge, explicación y prioridad completos) para
«≥3 entregas pero pocas unidades». Comprobé por barrido exhaustivo (todas las combinaciones
de entregas/unidades/tramos que la fórmula puede recibir) que es **matemáticamente
imposible**: cada entrega aporta ≥1 unidad (las cantidades del formulario son siempre
enteras), así que `nVentas≤vendidos` siempre — y `rotacion` da `baja` exactamente cuando
`nVentas<3`, nunca por volumen bajo con muchas entregas. La rama `'lenta'` nunca se
ejecutó ni se iba a ejecutar. La saqué (era la única simplificación de este tipo que hice:
el resto de reglas de umbral quedaron intactas, documentadas pero sin tocar).

### Y para que las dos «rotaciones» no se pisen

Con `rotacion` de tres niveles Y mi aviso `unico` conviviendo en la misma fila, un producto
de pedido único mostraba DOS explicaciones distintas del mismo hecho: la leyenda fija
(«Poca rotación: solo pedidos confirmados») Y mi texto («45 unidades en 1 entrega… no se
repone por las dudas»), repitiendo el mismo dato con otras palabras. Recorté el segundo para
que diga solo la CONSECUENCIA (qué se hace con eso), no el dato que ya está a la vista dos
líneas más arriba. Y escribí un comentario único, arriba de donde se calcula `o.rotacion`,
que explica el sistema completo —los tres niveles, el margen, la reserva, `revisarStock`—
en un solo lugar, en vez de dos mitades de explicación de dos sesiones distintas.

### Y `correr.sh` no corría las suites de la otra herramienta

Los 4 tests que trajo la otra sesión (`test_stock_quince.cjs`, `test_stock_rotacion.cjs`,
`test_stock_detalle.cjs`, `test_stock_revisadas.cjs` — 62 comprobaciones en total) usan
`require('playwright')` a secas y `process.env.CHROME_PATH`, no la ruta absoluta que uso yo.
Corren perfecto con las variables puestas, pero **`correr.sh` nunca los mandaba a correr**
(buscaba solo `*.js`) y ni siquiera podían correr sueltos en este sandbox sin las variables.
Agregué una segunda pasada a `correr.sh` (`unoCjs`, con `NODE_PATH`/`CHROME_PATH` por default
pero pisables) que entiende su formato de salida («OK »/«FALLO » y un `assert()` que corta
con `exit≠0`) y lo traduce al mismo «N bien · N mal» de siempre. Las 4 suites corrían bien
—las escribieron con cuidado— pero durante horas nadie las estaba corriendo.

**Resultado:** 46 suites `.js` + 4 `.cjs` (nuevas en la batería) + 3 Python. Los 8 checks
viejos, corregidos con su comentario explicando qué cambió y por qué (nunca solo el número).
Batería completa: **50 suites (46 `.js` + 4 `.cjs`, más 3 de Python aparte), 1.747 checks,
0 fallas.**

## 4dd. 📦 Productos del mes en Contabilidad → Ventas (2026-09-08) — lo escribió la otra herramienta

> Sección escrita por la otra herramienta de IA del dueño (commit `1cb4973`, PR #20). Estaba
> pegada ARRIBA de todo el archivo, antes del índice; la moví acá, a su lugar cronológico,
> sin cambiarle una palabra (§4de).

Botón junto a Excel: abre consolidado y detalle del mes/vendedor, con el mismo criterio
Ingreso/Entrega de Ventas. Consulta la lista completa por `apiList`, superpone pendientes
por id y congela el resultado para que la pantalla y las dos hojas del Excel coincidan.
No modifica `STATE`, los filtros ni los pagos. Día/Todo piden elegir Mes.

`productos-mes.js` usa `fueraDeConta`, `esBorrador`, `ventaTotal`, `prodPrecio`/`prodSub`
e `indiceDuplicados`. Agrupa por código + medida exactos (sin código, nombre + medida),
nunca por parecido al catálogo. Cada pedido cuenta una vez por producto y en el resumen.
Precios ausentes/0 conservan la semántica actual: sin dato, no producto gratis. Cantidades
vacías no se convierten en 1. Ajustes respecto al total de venta se presentan aparte;
cuando falta desglose no se los etiqueta como descuentos. El flete no entra a la venta.

Limitación de la fuente: no hay campo de descuento por línea ni registro independiente
de anulaciones/devoluciones comerciales. Se conservan las reglas de Ventas: bajas ya
borradas ausentes; ATC, borradores, ROHO y mayoristas excluidos. Se explica en ambas hojas.
No se cambian permisos ni Apps Script, no se cargan datos reales de prueba.

Pruebas: `tests/test_productos_mes.cjs`, 29 checks con datos sintéticos, lectura del XLSX
generado, Fernando/Juan Pablo/Todos, fechas, variantes, pagos, faltantes, duplicados,
pendientes, carga/error/vacío y celular. Contra el panel anterior falla por función ausente.
Regresiones: `test_plata.js` 11/11; `test_auditoria.js` 176/176. Sintaxis válida y sin
funciones raíz duplicadas. Los tests aceptan NODE_PATH y CHROME_PATH para Windows.

## 4de. 🔀 Segunda ronda de dos manos: «Productos del mes» verificado, y la rotación que volvió a cambiar (2026-09-08)

El dueño pidió un botón en Contabilidad → Ventas que, con el vendedor y el mes elegidos, muestre
la lista y el consolidado de todo lo vendido. Antes de que yo lo armara, avisó: *«Chat gpt corrigió
y ejecutó»*. Así que esta sección es de VERIFICACIÓN, no de construcción.

### Qué trajo la otra herramienta desde `afd1d1f`

- **`1cb4973` (PR #20) — 📦 Productos del mes** (§4dd, su propia nota). Lo verifiqué contra el
  panel real con datos sintéticos (Fernando/Juan Pablo, mes, Ingreso/Entrega, celular a 390px):
  las cantidades por producto salen bien (una línea repetida en el mismo pedido suma unidades y
  cuenta UN pedido; misma medida distinta = otro renglón), el «Importe total vendido» coincide
  con la tarjeta «Vendido en el período» de la misma pantalla (misma `ventaTotal`, mismo
  `fueraDeConta`), precio 0 = «Sin dato» y nunca un producto gratis, y sin errores de JS. Sus
  29 checks pasan. Dos cosas para saber: **ignora el cuadro Buscar** y **exige el modo Mes**
  (en Día/Todo avisa y no abre). Y el panel **dejó de ser un solo archivo**: la lógica vive
  en `productos-mes.js` con `?v=` de caché — anotado en CLAUDE.md.
- **`91ddcd8` — «Corrige rotación por vendedor y saldos de recogidas y recepciones parciales».**
  Sin entrada en la bitácora. Tres cambios de fondo en el stock, más varios menores:
  - **(a) Rotación.** `o.rotacion` pasó a mirar UNIDADES del equipo (`vendidosRotacion`, con
    los pedidos de Eduardo aparte en `vendidosUnicos`, `stockPedidoUnico`): `baja` si ≤2
    unidades. Sacó la condición de **≥3 entregas distintas** (`STOCK_VENTAS_MIN` quedó
    definida y sin usar) y volvió el aviso `lenta` (ahora sí alcanzable: 1–2 unidades del
    equipo). `unico` quedó solo para «todo lo vendió Eduardo».
  - **(b) Vencidos.** `stockSalio(p,x)` es por RENGLÓN: uno tildado «✗ no hay» o «📥 recoger»
    con la fecha pasada ya no se da por salido — sigue comprometido y consume depósito HOY
    (`fd = fecha>hoy ? fecha : hoy`). Lo SIN MARCAR con fecha pasada sigue contando como
    salido (la regla de §4co, la de las 41 almohadas, no se tocó).
  - **(c) Ya pedido.** Lo que ya está en camino no se vuelve a pedir aunque llegue tarde:
    `stockCuantoPedir` sin el «mínimo 1», aviso `pedido` con «Confirmar la llegada… No
    duplicar la orden», y las llegadas vencidas no cuentan en la proyección
    (`stockProyectar` filtra `llega>=hoy`).
  - Menores: recepciones parciales (`q.total`, `q.ru` acumulado, `q.u` = lo pendiente),
    recogidas con `f=hoy` y `esp=fecha`, `stockLibreOrigen` (Moreno menos lo ya programado),
    `o.recoger`/`o.fabricar` separados, `copiarRevStkFabricar`, discontinuados con aviso
    `traer` cuando Moreno tiene, y `SCRIPT_VERSION_ESPERADA` alineada a `2026-09-05-c` (el
    `.gs` ya decía `c` desde §4ch; el panel había quedado en `b`: bien alineado).
- **Batería sobre `4506bdc` (main con todo eso):** 3 suites rojas, **19 checks**:
  `test_rotacion.js` 11, `test_stock.js` 6, y `test_stock_rotacion.cjs` 2 — **de la propia
  herramienta**, escritos en §4dc: «venta grande única no crea ritmo ficticio» (40 en una
  venta → esperaba `baja`, ahora da `media`) y «2 unidades en 2 pedidos… `unico`» (ahora da
  `lenta`). O sea: el commit del domingo contradice lo que la misma herramienta había
  codificado el sábado, y lo que el dueño dijo el 07/09 (§4da).

### Qué acepté, qué arreglé — y qué NO publiqué

- **(b) y (c) los acepto**: son defendibles (una venta tildada «✗ no hay» es demanda viva; dos
  órdenes de fábrica por el mismo faltante es peor que un aviso de «confirmá la llegada»).
  `test_stock.js`: 6 checks actualizados **con el comentario de por qué** (26→30 comprometidos,
  pedir 14→18, «pedir 20»→«pedir 24», «llega después del corte» → `pedido`, `noHayViejo` 4→0).
- **Plata parada decía una mentira.** `porDiaReal` ahora excluye a Eduardo, y `stockSobra`/
  `stockMesesSobra` lo usaban: un producto que solo vendió él (45 entregados) decía «hay 10 y
  no se entregó ninguno». «Plata parada» mira para atrás y cuenta TODO lo que salió: nuevo
  `o.porDiaTodo` (= `vendidos/STOCK_VENTANA`) y `stockPorDiaTodo(o)`, solo para eso.
- **«4 semanas» volvió** por tercera vez (91ddcd8 pisó el texto de §4dc) → `STOCK_VENTANA` días.
- `correr.sh`: `xargs -n 1 -I{}` tiraba un aviso en cada corrida (son excluyentes) → sin `-n 1`.
- §4dd estaba pegada ARRIBA del archivo, antes del índice → movida a su lugar, sin cambiarla.
- CLAUDE.md: sección «📦 Productos del mes» (segundo archivo, `?v=`, `node --check` aparte).

**(a) NO es mío para decidir.** Le pregunté al dueño con tres opciones: (1) las dos condiciones
juntas — ≥3 entregas distintas del equipo Y Eduardo afuera (mi recomendación: es todo lo que él
dijo, y lo único que rompe son 12 checks de `test_circuito.cjs` que afirman «Fernando aporta
rotación incluso en una venta»); (2) como quedó (cualquier venta del equipo es rotación; vuelve
el MORFEO de una vendedora → «pedí 24 ya»); (3) como el 07/09 (≥3 entregas, Eduardo incluido).
Contestó primero *«Hoy modifico cosas chat gpt»* (leí «hoy está trabajando la otra herramienta»
y frené sin publicar; era «hoy modifiqué cosas con ChatGPT», o sea, lo que ya tenía adelante),
después *«Revisa que hizo»* (y de paso me corrigió: el dashboard de agosto de ese día era MÍO,
de otra sesión, no de ChatGPT — los tres commits van con su usuario y los metí en la misma
bolsa sin mirar), y el 09/09: **«Dale»** a la opción 1.

### La regla que quedó (09/09): las dos condiciones juntas

- `o.rotacion` en `stockData`: `baja` si `nVentasRotacion < STOCK_VENTAS_MIN` (3 entregas
  distintas **del equipo**) o `vendidosRotacion <= 2` (cinturón redundante, se deja); `alta`
  con ≥15 unidades del equipo en ≥2 tramos; `media` en el medio. Los campos de la otra
  herramienta (`vendidosRotacion`, `nVentasRotacion`, `vendidosUnicos`, `stockPedidoUnico`)
  se quedan: son exactamente lo que hacía falta para la segunda condición.
- **Un solo aviso `unico`** para «1–2 entregas del equipo» y para «solo lo vendió Eduardo»
  (el dueño llama «pedido único» a las dos cosas). `lenta` afuera de nuevo. Nuevo
  `stockSoloEduardo(o)` decide el texto: cartel «📦 Pedido único · Eduardo», el porqué
  («Lo vendió Eduardo: se cubre lo que él ya vendió, sin reserva por las dudas» / mi texto de
  §4dc para el equipo), la leyenda de la fila («Eduardo: pedido único» solo si es todo suyo;
  si no «Poca rotación: solo pedidos confirmados», que es lo que espera el test de la otra
  herramienta), el texto de «sobra» y el mensaje a fábrica (`copiarStock` vuelve a decir
  «pedido puntual — 45 en 1 entrega» / «es para un pedido puntual», que era lo que probaba
  `test_rotacion.js`).
- Fila: «Equipo: N en M entregas · Eduardo: K (no cuentan para la reserva)» cuando hay de
  los dos. Comentario maestro del bloque STOCK, el de `STOCK_VENTAS_MIN` y el de `stockData`
  reescritos con las dos condiciones y la fecha de cada una. CLAUDE.md, ídem.
- **Tests de los dos lados diciendo lo mismo:** `test_rotacion.js` +6 (sección 6: HADES =
  Eduardo 45 en 5 entregas → único; POSEIDON = Eduardo 80 + Carola 8 en una → único;
  ATENEA = Carola 1+1+1 → rota; y el cartel «· Eduardo» solo en el de Eduardo) → **28/28**.
  `test_circuito.cjs`: los 11 «X aporta rotación incluso en una venta» invertidos con el
  comentario de la decisión (+1 nuevo: 3 entregas de Fernando sí rotan) y «poca venta no se
  etiqueta pedido único» dado vuelta → **31/31**. `test_stock_rotacion.cjs` volvió a verde
  **sin tocarlo** (15/15): lo que probaba el sábado era esta regla. `test_stock.js` 106/106.
- Lección para la próxima: cuando la otra herramienta cambia una regla de negocio, **sus
  propios tests del día anterior son el mejor detector** — dos de los suyos se pusieron rojos
  y nadie los corrió antes de mergear. Correr `./tests/correr.sh` completo antes de aceptar
  cualquier commit ajeno, no solo «los dos que menciona el mensaje del commit».

### Y la batería tiene una hora en la que miente: de 20:00 a 24:00 de Bolivia

La batería completa con la regla nueva dio 2 suites rojas que NO tenían nada que ver:
`test_roho.js` (importó «0 de 0» pedidos y se cayó) y `test_existencias.js` (5 checks). Las dos
habían pasado una hora antes, sin tocar nada de lo suyo. La diferencia era el reloj: eran las
00:15 UTC = 20:15 en Bolivia. La página corre con `timezoneId:'America/La_Paz'` (hoy = 08/09),
pero Node en este sandbox corre en UTC (hoy = 09/09), y las suites que arman fechas con
`new Date()` del lado de Node —«mañana», «el sábado que viene», «dentro de 3 días»— le mandan
a la página fechas de OTRO día. Cuatro horas por día en las que la batería falla sola.
Arreglo: `correr.sh` exporta `TZ=America/La_Paz` (pisable) para que los dos relojes digan lo
mismo, y el único check que comparaba contra `new Date().toISOString()` (UTC, siempre mal en
esa franja) ahora compara contra el `todayStr()` de la página. Con eso, a las 00:21 UTC:
`test_existencias` 55/55 y `test_roho` 90/90.

**Resultado (09/09, 00:40 UTC — adentro de la franja, a propósito):** batería completa
**49 suites (43 `.js` + 6 `.cjs`), 1.711 checks, 0 fallas.** Publicado a `main` con el
workflow del panel libre.

## 4df. 🔎 «Quién vendió qué»: el buscador deja el cliente y pasa a producto + vendedor (2026-09-09)

El dueño, con la pantalla de §4db abierta (Juan Pablo Paredes · carioca premier…): *"el botón
de búsqueda que armaste ayer a mí no me interesa buscar por cliente, quiero poner el producto
y que vendedores vendieron ese producto o esos productos; en vez de cliente que se elija
vendedor."* La pregunta cambió de «qué le vendimos a X» a «quién vendió X».

### Qué cambió
- **Filtros:** Productos (igual: coma = cualquiera, sin acentos) + **Vendedor** (desplegable
  `bus-vend`, `busLlenarVendedores`: Todos + `VENDEDORES` + los que aparezcan en los pedidos,
  agrupados por `normNombre` y mostrados con `nombreCanonico`) + desde/hasta. **Sin
  `contaExcluido`**, a diferencia de Contabilidad: si Eduardo o ROHO vendieron, tienen que
  poder elegirse — la pregunta es quién vendió. El campo Cliente y su `datalist` se fueron; el
  cliente queda chiquito bajo la nota, como dato.
- **La respuesta es un cuadro nuevo, `porVend`:** por vendedor, pedidos · unidades · plata
  (con «N sin precio» si corresponde) y **qué vendió** (producto + medida × unidades), el que
  más vendió primero (empate en unidades → más plata). Abajo, el detalle renglón por renglón
  agrupado por vendedor en ese mismo orden y por fecha adentro, con una raya entre vendedores.
- Encabezado impreso, resumen de la barra («7 renglones · 7 pedidos · 3 vendedores»), texto
  de 📋 Copiar (el cuadro con viñetas y el detalle debajo) y los mensajes de «pedí un dato» /
  «Nadie vendió eso en ese período», todos en la misma lógica. El botón de Administración y
  el título pasan a **🔎 Quién vendió qué**.
- `mismoVendedor` para comparar (como Contabilidad): «carola chávez» se suma a Carola Chavez.

### Pruebas
`tests/test_buscar.js` reescrito: **37 checks** (eran 28). Cuida, en este orden: que el cuadro
diga quién vendió cuánto y en qué orden (Carola 9 u / Bs 13.900 en 6 pedidos, Mirian 9 u /
Bs 13.500, Eduardo 2 u — Carola primero por plata); que un vendedor en minúsculas o con acento
sea el mismo y salga con el nombre de la lista; que con un vendedor elegido no se cuelen los
otros; que fechas, RIO, TITANIO, borrador y la almohada del pedido de dos renglones sigan
afuera; que las cuentas cierren y avise el sin precio; que sin dato pida un dato; que con una
vendedora que no vendió eso lo diga sin inventar; y que Copiar lleve el cuadro y el total con
los vendedores. Capturas a 1300px y 390px: el cuadro y el detalle se leen en los dos.

### Y que se pueda tocar (misma noche)

El dueño, ya con la pantalla en el iPad (Almohada · Fernando · 8 renglones): *"¿y cómo veo
los pedidos que vendió eso, si no deja dar clic?"*. Cada renglón del detalle abre ahora la
ficha del pedido (`busAbrirPedido` → `showPedidoModal`, la misma de Administración) por
encima de la búsqueda —el modal está en z-index 4000 y el overlay en 3000, como ya lo hace
«Ver pedido» en Stock— y al cerrarla la búsqueda sigue intacta. Como en el iPad nadie adivina
que una fila se toca, cada renglón lleva además un botón «Ver pedido» (`no-print`). Y tocar un
vendedor en el cuadro lo deja como filtro (`busElegirVendedor`). `test_buscar.js` +4 → **41**.

## 4dg. 🔁 La rotación da la vuelta entera: queda la regla de la otra herramienta (2026-09-09)

Una hora después de publicar §4de, el dueño mandó una captura del detalle de un producto en
su panel — «Necesidad 16,80 − 6 acá − 0 ya pedidas = **11 unidades adicionales** … El panel
propone fabricar 11 … Base de rotación: 21 unidades de los demás vendedores en 15 días; 0 de
Eduardo» — y escribió: *"Y que las ventas de Eduardo no entran a pedir productos ni rotación
ni nada! Se vendieron 3 y pedís 11? Deja como lo dejo chat gpt nomas!"*

### Dos cosas distintas en un mensaje

1. **«Deja como lo dejó ChatGPT»** — es la decisión: la regla de 91ddcd8 (rotación = unidades
   del equipo, ≤2 = sin rotación; Eduardo afuera), sin la condición de «≥3 entregas distintas»
   que yo había vuelto a poner en §4de. Hecho: `o.rotacion` vuelve a la línea de la otra
   herramienta, `stockAvisoDe` vuelve a `unico` (todo de Eduardo) / `lenta` (1–2 del equipo),
   los textos vuelven a los suyos («📦 Pedido único · Eduardo», «Rotación: N · Eduardo: K
   excluidas de reserva», el porqué de `lenta`), `stockSoloEduardo` se va, `STOCK_VENTAS_MIN`
   queda definida y sin uso con la historia de la regla arriba, para que nadie la vuelva a
   poner sin que el dueño lo pida. Se quedan las cosas que no eran regla sino error:
   `porDiaTodo` para «plata parada», «4 semanas» → `STOCK_VENTANA`, la zona horaria de la
   batería, y (b)/(c) de §4de.
2. **«Se vendieron 3 y pedís 11»** — esto NO cambia con la regla, y hay que decírselo con
   todas las letras en vez de dejar que crea que se arregló: ese producto tiene **21 unidades
   del equipo en 15 entregas** (rotación alta bajo cualquiera de las dos reglas), o sea 1,4
   por día; la reposición cubre fábrica (3) + margen (2) + reserva (7) = 12 días → 16,8, y
   como hay 6 en depósito pide 11. Los «3» que él ve son los pendientes de hoy (1 sin entregar
   + 2 a fábrica); los otros 19–21 ya salieron. Es la reserva por rotación que él mismo pidió
   en §4co («solo debés mandar a producir productos que tienen rotación»), no un invento. Si
   lo que quiere es que el panel pida SOLO lo vendido y sin cubrir, sin reserva, eso es otra
   regla (cubrir=0 para todos) y se hace en una línea — pero se la tiene que pedir él.

### Tests, otra vez de acuerdo con el código
- `test_rotacion.js` reescrito para la regla que quedó (**30 checks**): MORFEO 45 en una
  entrega → rota (media), 3/día, pide 24 y entra al mensaje; HERA 45 en 2 entregas en dos
  tramos → alta; ARES alta; ARTEMISA (0 vendidas, 6 sin entregar) se cubre igual; HERMES (2
  del equipo) → `lenta`, sin pedir; y la sección de Eduardo: HADES (45 suyos en 5 entregas) →
  `unico`, sin pedir, «📦 Pedido único · Eduardo»; POSEIDON (80 suyos + 8 de Carola) rota
  solo por los 8 y lo que pide sale de los 8; ATENEA 1+1+1 → media. La cabecera del test
  cuenta las tres vueltas de la regla con fecha, para que el próximo no la dé de nuevo.
- `test_circuito.cjs`: las 12 líneas vuelven a como las escribió la otra herramienta.
- `test_stock_rotacion.cjs` (de la otra herramienta, del sábado): sus 2 checks que
  contradecían su propio commit del domingo quedan alineados con la regla confirmada
  (`seed([1,1])` → `lenta`; `seed([40])` → media y pide), con el comentario del 09/09.

**Resultado:** batería completa **49 suites, 1.721 checks, 0 fallas** (incluye §4df, el
buscador por producto + vendedor). Publicado a `main` junto con §4df, con el workflow libre.

## 4dh. 🗺️ Los pedidos de ROHO no estaban en el mapa: ubicar por la dirección escrita (2026-09-09)

El dueño, con el mapa en «Todos» (304 ubicados · 5 sin ubicar · Heaven 188 · Sueña 104 ·
Otros 12): *"¿El botón Todos en el mapa muestra las entregas de ROHO? Debería… logística usa
este mapa para ver sus entregas."*

### Qué pasaba
No las mostraba, y tampoco decía que no. El importador de ROHO (§4ci) crea los pedidos con la
dirección escrita del Excel y `maps:''` — el Excel no trae link de Maps — y `mapaFilteredList`
dibuja SOLO los pedidos con link. Los que no tienen link no entran ni en «sin ubicar» (eso son
links que no se pudieron leer): desaparecen sin dejar rastro. Los 12 «Otros» rojos eran los
pedidos de ROHO/Eduardo a los que alguien les había cargado el link a mano. Logística miraba
el mapa y creía que eso era todo.

### Qué se hizo
El servidor ya sabía buscar una dirección escrita: `geocodeTexto` (§4bx), con el geocoder de
Google acotado al recuadro de Santa Cruz, lo usaba `editarUbicacion` cuando alguien pegaba un
texto en vez de un link. Solo faltaba mandarle las direcciones de los pedidos sin link.
- **`ubicarPorDireccion(lista)`**: filtra los ubicables (`ubicables`: sin `maps`, con dirección
  de ≥8 letras — mismo umbral que el servidor, «casa 3» no alcanza; ni filas del sistema ni
  borradores), arma la consulta (`ubicConsulta`: dirección + zona si no la dice ya), manda
  lotes de 40 a `action:'geocode'` con UNA consulta por dirección repetida, y lo que vuelve
  con coordenadas lo guarda ADENTRO del pedido: `https://www.google.com/maps?q=LAT,LNG&aprox=1`.
  Se guarda **de a uno** (`guardarEnFila`): cuarenta `apiSave` a la vez se pisan el lock del
  servidor. Nunca pisa un `maps` existente.
- **`&aprox=1` es la marca.** Google ignora el parámetro (el link abre igual), `coordsDeLink`
  lo lee sin servidor (`?q=lat,lng`), y cualquier dispositivo sabe que es «por la dirección
  escrita»: el globo del mapa dice «≈ aproximada, por la dirección escrita», la tarjeta del
  chofer «📍 Ir en Maps ≈» + «≈ aproximada: preguntá la casa», y 📍 Revisar ubicaciones los
  lista aparte («≈ N ubicados por la dirección escrita — es la cuadra, no la puerta; si el
  chofer confirma el punto, pegalo con ✏️ Corregir»). Guardar la marca en el link y no en la
  caché de coordenadas (`MAPA_COORDS`, que es por dispositivo) fue a propósito: el chofer la
  ve desde su celular.
- **El mapa cuenta lo que no puede dibujar**: `mapaEntra` (período + marca, sin mirar el link)
  se separó de `mapaFilteredList`, y `mapaSinLinkList` = del período, sin entregar, sin link.
  La barra dice «· N sin ubicación», y aparece el botón **📍 Ubicar N por dirección**
  (`ubicarSinLinkMapa`: confirma, tope 80 por toque —los más nuevos primero, por la cuota del
  geocoder—, y repinta el mapa). Lo mismo desde 📍 Revisar ubicaciones (`ubicarDesdeRev`).
- **El importador de ROHO lo hace solo**: al terminar de crear los pedidos,
  `ubicarImportadosRoho` busca sus direcciones y escribe el resultado en la misma ventana
  (`#roho-geo`: «📍 N de M quedaron en el mapa por su dirección escrita (≈ aproximados)» y
  cuáles no, para cargarles el link desde la ficha). Si falla, los pedidos ya están creados
  igual: la ubicación es un paso aparte.

### Pruebas
`tests/test_ubicar.js` (**23 checks**): el mapa cuenta 4 sin ubicación y ofrece ubicar 3
(«casa 3» afuera, el entregado no molesta, el que ya tiene link no se pisa); una consulta al
servidor con 2 direcciones (la repetida va una vez); r1 y r2 quedan con `?q=…&aprox=1`, se
leen sin servidor y se guardan de a uno; el mapa los dibuja y la barra baja a 2; el globo y
Revisar ubicaciones dicen «aproximada»; y un Excel de ROHO importado queda en el mapa solo
(primero se guarda el pedido, después su ubicación).

### Y `test_roho.js` se rompió solo con el calendario
Corre contra el Excel real de ROHO (§4ci), cuya última entrega es el **09/09/2026**, y
«nuevas» son solo las de mañana en adelante: el 08/09 pasaba entero, el 09/09 amaneció con
«Crear 0 pedidos» y 8 fallas en cadena sin que nadie tocara nada. El reloj de la página queda
clavado en el 08/09 a las 10:00 de Bolivia con `page.clock.setFixedTime` (los timers siguen
andando; solo `new Date()` devuelve ese día). Si se cambia el Excel, mover esa fecha.

Y `test_existencias.js`, lo mismo con otra cara: el reporte de existencias del fixture tiene
fecha fija (07/09/2026) y los pedidos fechas relativas (`atras(n)`), así que cada día que pasa
una entrega más cae DESPUÉS del corte y el depósito baja solo — 4 el 08/09, 3 el 09/09, cinco
checks rojos. Lo comprobé corriéndolo contra el `pedidos.html` publicado la noche anterior:
fallaba igual, no era el cambio del mapa. Mismo remedio: reloj clavado en el 08/09. Regla
para el próximo test que mezcle una fecha fija con `atras(n)`: clavar el reloj desde el
primer día, no cuando amanezca rojo.

## 4di. ⏳ «Entro de otra compu y aparece todo en 0»: la primera carga, con reintentos y cartel (2026-09-09)

El dueño: *"A veces entro de otra pc o lugar y aparece todo en 0, no carga el servidor, ¿o
qué pasa?"*

### Qué pasaba
Al abrir, el panel carga la copia guardada en el dispositivo (`loadMirror`) y le pide la
planilla al servidor **una sola vez** (`refreshCupos` → `refrescarEstado` → `apiList`). Si
esa vez fallaba, `refrescarEstado` devolvía `false` en silencio: sin cartel, sin toast, y el
próximo intento era el del reloj de la actualización automática, **dos minutos** después. Y
el cartel de conexión decía «Conectado al equipo» en verde igual, porque `renderConnEstado`
miraba solo que `SHEETS_URL` tuviera forma de Apps Script, no que alguien hubiera contestado.
En la compu de siempre no se nota: la copia guardada tapa el hueco y se ven los pedidos de
la última vez. En una compu nueva no hay copia: **todo en 0, cartel verde, y nada que
explique** — exactamente lo que describió.
Por qué falla esa primera vez, en orden de frecuencia: Google tarda en despertar el script
(la primera llamada del día puede tardar o cortarse), la red del lugar bloquea
`script.google.com` (oficinas, hoteles) o un bloqueador de anuncios lo corta, o no hay
internet en ese momento. Lo que NO es: no hace falta estar logueado en Google (el repaso
automático desde GitHub lee el servidor sin ninguna cuenta, §4ch).

### Qué se hizo
- **`cargaInicial()`** en el arranque, en vez de `refreshCupos()`: si la lectura falla,
  reintenta sola a los 3, 8 y 20 segundos (`CARGA_INTENTOS`), y entre medio muestra la cuenta
  regresiva. `CARGA_GEN` descarta el resultado tardío de un intento viejo (un «Reintentar
  ahora» no puede quedar tapado por el intento anterior que vuelve después).
- **`#carga-banner`**, arriba de todas las pestañas: «⏳ Cargando la planilla del equipo…»
  (solo cuando no hay copia: con copia, cargar no molesta), «⚠️ No se pudo leer la planilla:
  MOTIVO. Reintento solo en N s. Por eso la pantalla está en 0 / Mientras tanto ves la copia
  guardada» y, después del cuarto intento, «❌ … después de 4 intentos» — siempre con
  «🔄 Volver a intentar». Se va solo en cuanto una lectura (la que sea) anda.
- **`motivoDeError`**: el «Failed to fetch» del navegador se traduce a «no hay conexión con
  Google (sin internet, o esta red o un bloqueador de anuncios corta script.google.com)»;
  una respuesta que no es JSON a «Google devolvió una página en vez de los datos (suele ser
  momentáneo)»; `clave` a «el servidor pide la clave del equipo». `refrescarEstado` guarda
  el motivo en `ULTIMO_ERROR` y, si `STATE` está vacío, pone el cartel en error desde
  cualquier refresco, no solo el del arranque.
- **`renderConnEstado`** dice «Conectado al equipo» recién cuando el servidor contestó de
  verdad; mientras reintenta dice «Sin respuesta del servidor — MOTIVO», y en Administración
  agrega si está mostrando la copia guardada o por eso no se ve ningún pedido.

### Pruebas
`tests/test_carga.js` (**18 checks**): al abrir ya está intentando; falla dos veces y a la
tercera contesta (cartel con motivo y cuenta regresiva, «Sin respuesta» en vez de
«Conectado», y al contestar todo entra y el cartel se va); no contesta nunca (se rinde a los
4 intentos, ofrece reintentar, y «Volver a intentar» carga y limpia); con copia guardada dice
que es la copia; y los cuatro motivos traducidos. `test_conflicto.js` da por hecha la carga
de arranque en su setup (`CARGA_GEN++; CARGA_ESTADO='ok'`), porque su red está cortada y el
intento de arranque volvía tarde a tapar el cartel que el test mira.

## 4dj. 🔁 La regla de rotación, definitiva: las dos condiciones juntas (2026-09-09, tarde)

Captura del MORFEO en su panel: **15 unidades en 1 entrega**, «Rotación media: reserva de 3
días», «🚨 PEDIR YA · la fábrica tarda 3 días → pedí 8 ya». Y el mensaje: *"el morfeo solo
tiene una única entrega y está mandado a pedir, creí que ya teníamos bien definido cuándo
pedir fabricar…"*.

Tenía razón, y es consecuencia directa de una decisión mía de esa misma mañana: cuando dijo
«deja como lo dejó ChatGPT nomás» (§4dg) yo lo leí como «la regla entera de 91ddcd8», y esa
regla **no incluía** la condición de las 3 entregas. Lo que él quería sacar era otra cosa —
que las ventas de Eduardo no cuenten— y lo dijo en la misma frase. Las dos mitades venían
juntas en su cabeza desde el 07/09; yo las traté como excluyentes.

**La regla, que ya no se toca sin que él lo pida:**
```
rotación = (entregas DISTINTAS del equipo ≥ 3)  Y  (los pedidos de Eduardo no cuentan)
```
`o.rotacion = (nVentasRotacion<STOCK_VENTAS_MIN || vendidosRotacion<=2) ? 'baja' : …`, con
`stockPedidoUnico` apartando lo de Eduardo a `vendidosUnicos` (eso quedó tal cual lo dejó la
otra herramienta: es la mitad que él confirmó). `STOCK_VENTAS_MIN` vuelve a usarse.

### Lo que se ve
- Aviso **`unico`** para los dos casos —el dueño llama «pedido único» a las dos cosas— y
  `stockSoloEduardo(o)` decide el texto: «📦 Pedido único · Eduardo» cuando todo lo vendido
  fue suyo, «📦 Pedido único» a secas cuando el equipo vendió en menos de 3 entregas.
  `lenta` se va de nuevo (con las 3 entregas es el mismo caso: redundante).
- La leyenda de la fila vuelve a «Poca rotación: solo pedidos confirmados», y el renglón deja
  de decir «venta a los saltos» (eso solo tiene sentido con rotación).
- Fila con ventas de los dos: «Equipo: 8 en 1 entrega · Eduardo: 80 (no cuentan para la
  reserva)». En el detalle, **Base de rotación** ahora dice también en cuántas entregas y, si
  son menos de 3, que por eso no se estima ningún ritmo — que es la pregunta que hizo él.
- El mensaje a fábrica vuelve a «pedido puntual — 15 en 1 entrega» en vez de «poca rotación».

### Pruebas
`tests/test_rotacion.js` reescrito para esta regla (**32 checks**): MORFEO 45 en 1 entrega →
`unico`, porDia 0, pedir 0, fuera del mensaje, cartel sin «· Eduardo»; HERA 45 en 2 entregas
→ igual; ARES 45 en 15 → alta y pide; **HERMES 3 unidades en 3 entregas → SÍ rota** (pocas
unidades no es lo mismo que pocas entregas); ARTEMISA (0 vendidas, 6 sin entregar) se cubre
igual; y la sección de Eduardo: HADES (45 suyos en 5 entregas) → `unico · Eduardo`, POSEIDON
(80 suyos + 8 del equipo en 1 entrega) → `unico` sin su nombre, ATENEA 1+1+1 → rota.
`test_circuito.cjs` (31) y `test_stock_rotacion.cjs` (15) vuelven a lo que probaban el 08/09.
La cabecera de `test_rotacion.js` y el comentario de `STOCK_VENTAS_MIN` guardan las tres
vueltas con las frases textuales, para que el próximo no la vuelva a dar.

## 4dk. 🏪 RPT — reposición de tienda: el tercer botón (2026-09-09, noche)

Pedido del dueño, con el formato en Excel adjunto: *«necesitamos un 3er boton RPT
(REPOSICION DE TIENDA) donde los vendedores coloquen los productos que requieren para sus
tiendas y logistica pueda tenerlo en el panel y agendarlo. y una ves hecho se genere un
excel para envira por correo como te subi el archivo. y tb el boton de whatsap»*.

### Qué había antes
El formato «FORMATO DE PEDIDO / REPOSICIÓN DE TIENDA» vive en un Excel que se llena a mano
y se manda por correo a logística. Fuera del panel: nadie sabe qué pidió cada tienda, no se
agenda con el resto del camión y el stock no se entera de que esa mercadería sale del
depósito.

### La decisión de fondo: qué ES y qué NO ES una reposición
Esto es lo único que importa entender antes de tocar nada:

- **NO es una venta.** No tiene cliente, ni nota de venta, ni cobro, ni precio. Sale de
  Contabilidad y del Cuadre por la misma puerta que las ATC (`fueraDeConta`): sumarla
  inflaría los totales con una plata que nunca entró.
- **SÍ es mercadería que sale del depósito.** `stockCuenta` la deja pasar: lo pedido y sin
  entregar se cubre, ese camión sale igual.
- **…pero NO es rotación.** Va por `stockPedidoUnico`, el mismo camino que los pedidos de
  Eduardo (§4dj), y por una razón distinta: **el colchón que va a una sucursal no se vendió,
  solo cambió de lugar** — sigue siendo de la empresa. Contarlo como venta lo contaría DOS
  VECES (ahora, y cuando la tienda lo venda de verdad) y el panel mandaría a fabricar el
  doble. `test_rpt.js` lo prueba con el caso que más duele: **60 unidades en 3 reposiciones**
  —que como ventas serían «rotación alta»— no piden fabricar nada.
- **SÍ se agenda como cualquier entrega** (fecha, turno, cupo del camión, zona, mapa), que
  es exactamente lo que pidió el dueño: *«logística pueda tenerlo en el panel y agendarlo»*.

### Cómo viaja (sin tocar la planilla)
Tercer tipo con la misma mecánica que la ATC: **el prefijo va adentro del propio número**
(`RPT 09-001`) y no hizo falta ninguna columna nueva. `esRPT`, `ocTipoDe`, `ocPrefijo`;
`nextOcMes(fecha, tipo)` ahora lleva **tres series independientes** (una OC no corre el
contador de las RPT ni al revés). Los dos datos por renglón que pide el formato —**Tipo**
(Reposición/Adicional) y **Observaciones**— viajan adentro del JSON de productos como
`rtipo`/`robs`, con la misma convención que `precio`: si no corresponde, la clave no se
guarda y el renglón queda idéntico a los de siempre.

**El destino se guarda en `cliente`** (la sucursal). No es un abuso del campo: es
literalmente a dónde va el camión, y así aparece solo en la lista de carga, en la ficha del
chofer y en el mapa sin tocar nada de eso. `SUCURSALES` autocompleta zona/dirección/maps al
elegirla, **sin pisar** lo que ya esté escrito.

### El formulario
Botón `🏪 RPT` en `#f-doc-tipo`. Al tocarlo: aparece `#wrap-rpt` (pegado al selector, por lo
mismo que el bloque de la ATC, §4br) y **desaparecen** nota de venta, cobro, nombre del
cliente, celular, garantía, facturación y el precio de cada renglón. `pintarDocTipo(limpiar)`
es el nuevo repartidor: esconde lo que las dos —ATC y RPT— no usan, y **las limpia** cuando
la persona cambia el tipo a mano (esconder no alcanza: si alguien empezó una venta y a mitad
de camino la pasó a RPT, esos valores se guardaban igual, invisibles). `pintarMotivoAtc` y
`pintarRpt` quedan para lo propio de cada una.

### El Excel y el WhatsApp
`rptHoja(p)` reproduce el formato del dueño **fila por fila**: logo adentro del archivo,
título, cabecera (sucursal / fecha de solicitud / solicitado por / N.º de pedido),
observación general, la tabla de 7 columnas con sus **20 renglones** y la lista desplegable
`"Reposición,Adicional"` en `E12:E31`, el resumen (ítems y unidades), el aviso de los **7
días hábiles** y los correos a los que va (DIRIGIDO A / CON COPIA A). Las 28 celdas
combinadas son las mismas. `pedidoText` desvía a `rptText` para el mensaje de WhatsApp, así
que los botones que ya existían en todas las fichas funcionan solos; `botonesRpt(p)` agrega
«⬇️ Excel del formato» en la ficha de la vendedora, en la de administración y en la ventana
de «pedido guardado».

⚠️ **El formato del dueño calcula el código con un `XLOOKUP` contra una hoja de catálogo. El
del panel NO**: el código ya está en el pedido, así que se escribe el valor. El archivo abre
en cualquier lado —celular incluido— sin fórmulas que se rompan.

Para esto `buildXlsx`/`buildSheetXml` aprendieron tres cosas nuevas: **alto de fila**
(`rowH`), **listas desplegables** (`dv`) e **imágenes** (`img` → `drawing1.xml` + rels +
`xl/media`). ⚠️ El orden de los bloques dentro de `<worksheet>` **no es libre**: cols →
sheetData → mergeCells → dataValidations → drawing. Fuera de orden, Excel dice que el
archivo está dañado. Los estilos nuevos se agregaron **al final** de `STYLES_XML` (índices
`XS_TIT`…`XS_MAIL`, 18 a 27): mover uno del medio repinta todos los demás Excel del panel.

### Un bug viejo que apareció de paso
El lector de `.xlsx` del propio panel (`xlsxHoja`, el que abre los reportes de Moreno y el
de ROHO) tenía la regex de celdas glotona: con una **celda vacía pero con estilo**
(`<c r="B12" s="22"/>`) se pasaba de largo la barra y **se tragaba la celda de al lado** —el
valor de C aparecía en B y C quedaba vacía. Un renglón corrido, en silencio. Se separaron
las dos alternativas (`<c…/>` primero, `<c…>…</c>` después). Lo encontró el test del RPT al
releer con ese lector el Excel que el panel acababa de generar.

### Pruebas
`tests/test_rpt.js` — **74 checks** en 8 secciones: el número y las tres series; qué se ve y
qué desaparece en el formulario (y que **volviendo a OC vuelve todo a su lugar**); qué queda
guardado; que está fuera de Contabilidad pero dentro del stock **sin armar rotación**; el
Excel —releído con `xlsxHoja` del propio panel, con el diente de la celda vacía—; el
WhatsApp; que **editarla no le borra el tipo ni la observación** de cada renglón; y que sin
sucursal no se guarda. Batería completa en verde (52 suites).

## 4dl. Repaso del RPT ya publicado: tres cosas que no cerraban (2026-09-09, mediodía)

El dueño: *«si a todo, no me pidas permiso, realiza pruebas, y mira que todo esté bien, me
iré a almorzar»*. Repaso sobre lo publicado en §4dk. Salieron tres.

### 1. «Quién vendió qué» contaba como venta lo que no lo era
`buscarData` solo dejaba afuera los borradores de Kommo. Una 🏪 reposición de 30 unidades a
Mia Plaza aparecía como **«Fernando vendió 30 TITANIO»**, y una 🎧 ATC sumaba su unidad al
cuadro del vendedor. Las dos quedan afuera del cuadro y de los totales.

⚠️ **Esto cambia algo del 09/09 a la mañana**: hasta hoy las ATC SÍ entraban, *marcadas*
(estaba escrito así, a propósito, en el encabezado de `test_buscar.js`). La pantalla se
llama «quién **vendió** qué» y una ATC es un servicio —el colchón vuelve, no se vendió otro—,
así que le inflaba las unidades al vendedor. Para buscar una ATC por producto está su propia
pestaña 🎧 ATC, que tiene buscador. **Si el dueño prefiere que vuelvan, es una línea.**

Para que nada desaparezca en silencio, `busFueraTxt` dice abajo del cuadro —y en la carátula
que se imprime— *«30 unidades en 🏪 reposiciones de tienda y 2 unidades en 🎧 ATC — no son
ventas, no entran en el cuadro»*. Y si lo ÚNICO que hubo fueron reposiciones, en vez de
«nadie vendió eso» a secas ahora agrega **«Sí hubo …»**: si no, parecería que el panel
perdió los datos.

### 2. Con ROHO el formulario quedaba a medias
En ROHO el selector de tipo **se esconde** (el N° lo manda el cliente). Si alguien elegía
🏪 RPT o 🎧 ATC y **recién después** escribía ROHO, quedaba el bloque abierto y el botón para
volver, escondido: sin salida. Ahora `applyVendedorLite` lo devuelve solo a OC (solo en
pedidos nuevos: editando no se toca nada). Era un bug latente de la ATC desde §4bq.

### 3. Comprobado, no supuesto
- **25 productos en una RPT**: la hoja crece (52 filas), la lista desplegable se estira a
  `E12:E36`, y el resumen y el pie se corren con ella. No se corta en el renglón 20.
- **Los Excel de siempre**: `exportExcel` y `exportConta` siguen saliendo. Importaba porque
  los estilos del `.xlsx` son compartidos y §4dk les agregó 10 nuevos.
- **Un renglón sin código ni medida**: sale con «Reposición» por defecto.

### 4. Y de punta a punta, con clics de verdad
Prueba manual en un celular simulado: tocar 🏪 RPT → llenar → guardar → la ventana de
«pedido guardado» ya trae el mensaje de reposición → el botón ⬇️ Excel del formato baja
`RPT-09-001-Mia-Plaza.xlsx` (28 KB). Y aparece donde tiene que aparecer: **tabla de
Administración** (con su franja ámbar), **lista de carga por camión**, **ficha del chofer**,
**Mis pedidos** y **el mapa** — todos con el chip 🏪 RPT — y en **Contabilidad, cero**.
El `.xlsx` se validó parte por parte: todas las partes con su tipo declarado, todos los
`r:id` resueltos, ningún destino roto, los contadores de estilos cuadrados, y se relee con
el propio lector del panel. (En este sandbox LibreOffice no abre `.xlsx` —tampoco el archivo
original del dueño—, así que la prueba final es abrirlo él.)

### Pruebas
`tests/test_rpt.js` pasa de 74 a **84 checks** (sección 9). `tests/test_buscar.js` reescrito
para la regla nueva (43): la ATC ya no entra, pero **se dice**; los totales bajan de 20 a 19
unidades y de 8 a 7 pedidos. Batería completa: **1.884 comprobaciones, 0 mal**.

⚠️ Y `tests/correr.sh` mentía un poco: `unoCjs` solo sabía leer `OK `/`FALLO `, así que las
suites `.cjs` que usan ✓/✗ y cierran con «N bien · N mal» salían como **«ok (sin resumen)»**
—`test_productos_mes` escondía sus 29 comprobaciones—. Ahora también lee esa línea. Queda
una sola sin resumen (`test_stock_detalle`, que imprime una frase y ya).

## 4dm. 🚨 El servidor del panel dejó de responder (404) — y el cartel decía la mentira cómoda (2026-09-09, tarde)

Revisando el estado general apareció esto, que **no tiene nada que ver con el RPT** y es
mucho más urgente:

```
14:23  ✓ servidor del panel: versión 2026-09-05-c
       último aviso de Kommo al panel: 2026-09-09T14:20:53Z
17:53  ✗ El panel no aceptó el aviso: HTTP 404
```

(Workflow «Traer ventas de Kommo (respaldo)», corridas #40 y #41.) Entre esas dos horas el
`/exec` del Apps Script dejó de existir. **El `.gs` del repo no se tocó desde el 05/09**
(último commit `e412b39`), así que el cambio fue del lado de Google: una implementación
nueva —que **estrena otra dirección**—, una archivada, o el acceso cambiado.

Mientras esté así, **el panel entero no lee ni guarda nada**: es la misma cara de «entro de
otra PC y aparece todo en 0» de §4di. Lo que se cargue queda en el dispositivo y se manda
cuando vuelva.

### Lo que sí se pudo arreglar desde acá: que el cartel diga la verdad
`apiPost` iba derecho a `r.json()` **sin mirar el código HTTP**. Con un 404, Google devuelve
una página de error, `r.json()` reventaba con «Unexpected token» y `motivoDeError` lo
clasificaba como *«Google devolvió una página… suele ser momentáneo»*. Momentáneo no era: la
vendedora reintentaba para siempre y nadie se enteraba de que había que tocar Google.

Ahora `apiPost` tira `http<código>` y el cartel dice **qué hacer**:
- **404** → «la dirección del panel ya no existe. Suele pasar cuando se crea una
  implementación NUEVA del Apps Script en vez de actualizar la de siempre: cada una estrena
  su propia dirección. Implementar → Administrar implementaciones → editar la que ya estaba
  (✏️) → Versión nueva».
- **403** → «Quién tiene acceso» tiene que decir «Cualquier persona».
- **401** → la implementación quedó restringida.
- **5xx** → es de Google, suele arreglarse solo.

⚠️ Y apareció un **doble de prueba incompleto**: el `fetch` falso de `test_conflicto.js`
devolvía `{json:…}` sin `ok`/`status`. Una `Response` de verdad SIEMPRE los trae, así que el
doble estaba simulando un 404 sin querer y tiró 5 checks abajo. Cualquier doble de `fetch`
nuevo tiene que traer `ok:true, status:200`.

### Pruebas
`tests/test_carga.js` pasa de 18 a **24 checks** (sección 5): los cuatro códigos traducidos,
que el 404 **no** diga «momentáneo», y que `apiPost` avise del código en vez de reventar
contra el JSON. Batería completa: **1.890 comprobaciones, 0 mal**.

### Lo que tiene que hacer el dueño
1. Abrir la planilla → **Extensiones → Apps Script**.
2. **Implementar → Administrar implementaciones**.
3. Si la de siempre está ahí: ✏️ → **Versión nueva** → Implementar. La dirección no cambia.
4. Si no está (o se creó una nueva): copiar la dirección `/exec` que quede y actualizar
   `SHEETS_URL` en `pedidos.html` **y** el secret `PANEL_URL` de Actions.
5. Verificar sin entrar a Google: Actions → «Traer ventas de Kommo (respaldo)» → Run workflow.
   Tiene que imprimir `servidor del panel: versión …`.

## 4dn. Las tiendas son SIETE, y las zonas que puse eran inventadas (2026-09-09, noche)

El dueño, mirando el desplegable de «Sucursal de destino» recién publicado: *«falta
mutualista, charcas, carmelo»*.

`SUCURSALES` queda con las siete: **Tiendas Roho, Mia Plaza, Buenos Aires, Central,
Mutualista, Charcas, Carmelo**. (El campo es un `input` con lista, así que escribir una que
no esté siempre funcionó — pero si hay que escribirla a mano, la lista no sirve.)

### Y de paso, lo que estaba mal y él no pidió
Las cuatro que ya estaban traían zona: `Roho`, `Norte`, `Centro`, `Centro`. **Las inventé
yo**: el dueño nunca dio esas zonas. Y una zona inventada es peor que ninguna, porque
`sucursalElegida()` la escribe SOLA en el formulario: nadie la corrige, y la zona es lo que
agrupa la ruta del chofer. Se vacían las cuatro.

El mecanismo queda intacto y probado: cuando una tienda tenga su zona/dirección/Maps de
verdad, se completan solas al elegirla, y **nunca pisan** lo que ya esté escrito.

### Y esa misma noche llegaron las ubicaciones
El dueño mandó el pin exacto de las seis tiendas propias (Central, Mia Plaza, Buenos Aires,
Charcas, Carmelo, Mutualista). Van en `m` con el formato que produce `normalizaUbicacion` y
que lee `coordsDeLink` (`?q=lat,lng`), **sin** el `&aprox=1` de §4dh: no son «la cuadra»,
son la puerta. Elegir la tienda pone la ubicación sola y el pedido entra al mapa del chofer
sin pasar por el geocodificador. **Tiendas Roho queda sin ubicación**: es el único destino
que no es tienda propia.

### Y las zonas, dictadas también
`Central → Central · Mia Plaza → Mia Plaza · Buenos Aires → Centro · Mutualista → Mutualista
· Charcas → Centro · Carmelo → Feria · **Tiendas Roho → Norte**`. **Buenos Aires y Charcas
comparten «Centro» a propósito** — es lo que dijo él, y es justamente para lo que sirve
agrupar la ruta.

**Tiendas Roho tiene zona pero NO pin**, y también a propósito: es el único destino que no es
tienda propia y sus entregas no van siempre al mismo lugar. Que le falte la ubicación no es
un olvido — el test lo dice con todas las letras para que nadie «lo complete» más adelante.

### El bug que apareció al ir a cargarlas
El panel agrupaba las zonas por **texto EXACTO**: `renderZonas` usaba `String(p.zona).trim()`
de clave y `dl-zonas` juntaba `p.zona` tal cual. O sea, «Centro», «centro» y «CENTRO» eran
**tres zonas distintas**: tres sugerencias en la lista, y en «Concentración por zona» los
pedidos repartidos entre las tres — con lo que la zona más cargada podía no salir ni en el
top 12. Es **exactamente el mismo bug** que ya se había arreglado en las vendedoras («Carola
Chavez» / «Carola Chávez», cada una con la mitad de los pedidos), en otro campo.

`zonasDeLista(lista)` agrupa por `normNombre` y devuelve **una** escritura por zona: la que
más se repite en la planilla (a igualdad, la primera). `zonaCanonica(z, lista)` da la forma
con la que mostrar una zona; una que no existe todavía vuelve tal cual. `renderZonas` agrupa
igual y rotula con la forma más frecuente.

Gracias a eso, **da lo mismo con qué mayúsculas escriba yo las zonas de las tiendas**: si el
equipo ya venía poniendo «centro», no se parte en dos.

### Pruebas
`tests/test_rpt.js` pasa de 84 a **96 checks**: que estén las siete con nombre y apellido,
que elegir una **no invente** una zona, que cuando la tenga sí la complete, y que no pise lo
escrito. El check viejo «la zona se completó sola» era mentira —el propio test le ponía
«Norte» dos líneas antes— y ahora comprueba lo que dice.
De las ubicaciones no se prueba el número (sería copiarlo dos veces) sino **que sirvan**: que
`coordsDeLink` las lea todas —si el formato no sirviera, el chofer no las vería— y que
**todas caigan en Santa Cruz** (un signo cambiado las manda a otro continente y nadie lo
nota hasta que el camión sale). Aparte, verificado fuera del test: transcripción idéntica a
lo que mandó el dueño, y las seis a entre 384 m y 3,4 km entre sí — ninguna repetida.
De las zonas: que cada tienda traiga la que él dictó, **textual**, y que «Centro»/«centro»/
«CENTRO» cuenten como UNA. Batería completa: **1.902 comprobaciones, 0 mal**.

## 4do. Dónde ve logística las reposiciones, el aviso a los 3 días, y el Excel que no era (2026-09-09, noche)

Tres cosas del dueño en un mismo mensaje, más una pregunta que resultó ser lo más grave.

### 1. «¿Dónde o cómo ve logística las reposiciones? ¿O filtran por solo reposiciones?»
Estaban mezcladas con todo, con su franja ámbar y nada más. Ahora hay un chip
**🏪 Reposiciones** en Administración, al lado de «Especiales» (`QUICK_DEFS`, `esRPT`).

### 2. «Un letrero, AVISO ALERTA flotante a los 3-4 días si no programaron entrega, o no lo marcaron entregado»
`rptAtrasadas()` + `renderRptAtrasadas()` → caja ámbar en `#adm-rpt`, **`position:sticky`**
(el «flotante»: queda pegada arriba mientras se baja la tabla) con cuántas son, hace cuántos
días la peor, de qué tiendas, y un botón que aplica el filtro.

⚠️ **«No programaron entrega» no existe como estado**: la fecha es obligatoria, así que toda
reposición nace con una. Lo que sí pasa —y para el negocio es lo mismo— es que **la fecha
llegue y pase sin que nadie la marque entregada**: o no salió, o salió y no se anotó. Por eso
el corte se mide desde la **fecha de entrega**, no desde que se cargó: una reposición pedida
hace 10 días para entregar mañana está perfecta y no tiene que gritar. `RPT_DIAS_AVISO`=3.

### 3. «¿Qué paja es ese Excel que genera? Yo te pasé un formato»
Mandó una captura de Excel con **el mensaje de WhatsApp pegado en la columna A**. El Excel
estaba bien —lo verifiqué contra su formato fila por fila en §4dk— pero **la culpa del error
es del panel**: la ventana de «pedido guardado» ponía adelante un `<textarea>` enorme con el
mensaje, y el botón del Excel chiquito, al costado, entre otros tres. Lo natural era copiar
de ahí y pegar.

En una RPT, ahora el Excel va **primero, ancho y solo**, y dice para qué es: *«Bajar el Excel
del formato — es lo que va por correo a logística»*, con el nombre del archivo debajo. El
cuadro de texto queda abajo, rotulado *«Y este es el mensaje para WhatsApp — para avisar, no
para el correo»*, y el botón dice «📋 Copiar el mensaje» (antes, «📋 Copiar» a secas).

⚠️ Y `bajarRptExcel` **fallaba en silencio**: si el pedido no estaba en `STATE` hacía `return`
sin decir nada — tocabas el botón y no pasaba NADA. Ahora avisa.

### 4. Lo que apareció al mirar el «¿por qué pierdo conexión con Google Sheets?»
La captura del cartel decía 404 otra vez. Pero el registro del respaldo de Kommo desmiente
que el Apps Script esté caído:

```
17:53  ✗ HTTP 404        (corrida #41)
20:26  ✓ contestó bien   (corrida #42)
```

A las 20:26 el **mismo** `/exec` le contestó a un servidor de GitHub, y a esa misma hora el
navegador del dueño recibía 404. **La implementación está viva y bien publicada: lo que falla
es el navegador.** La diferencia entre los dos es la sesión de Google: con varias cuentas
abiertas, Google antepone `/u/0/`, `/u/1/`… y devuelve 404 si la app no es de la cuenta que
quedó primera. Es el motivo clásico de «anda en una compu y en otra no» con Apps Script, y
explica también el «entro de otra PC y aparece todo en 0» de §4di.

Dos cambios: `apiPost` pide con **`credentials:'omit'`** (la app está publicada como
«Cualquier persona», así que la petición no necesita —ni debe— arrastrar la sesión de Google
de cada uno), y los reintentos pasan de 3 a **4, con el último a los 45 s**: se vio que la
caída va y viene, y rendirse a los 31 segundos deja al equipo mirando un cartel rojo por algo
que se arregla solo.

⚠️ **Lo que NO hay que hacer es volver a implementar**: cada «Nueva implementación» estrena
otra dirección y empeora el enredo. La prueba de 20 segundos es abrir el panel en una
**ventana de incógnito**: si ahí anda, es la sesión de Google del navegador.

### Pruebas
`tests/test_rpt.js` pasa de 96 a **109 checks**: el chip trae las reposiciones y ninguna
venta; el aviso agarra las de 3+ días y **no** la de ayer, **no** una ya entregada por vieja
que sea, **no** una para mañana, **no** una venta común atrasada; el cartel nombra tiendas y
días y es `sticky`; el Excel va antes que el texto en la ventana de guardado; y el botón
avisa en vez de quedarse mudo. Batería completa: **1.915 comprobaciones, 0 mal**.

## 4dp. El 404 era la CACHÉ del navegador (y el chip que no se veía era Pages) (2026-09-09, noche)

### La prueba que faltaba
El dueño probó lo que le pedí: **en incógnito abre**. Con eso más lo de §4do (el mismo
`/exec` contestándole bien a GitHub Actions a las 20:26 mientras su navegador daba 404), el
cerco se cierra: **ni el servidor, ni la red, ni la implementación — el perfil del navegador**.

⚠️ En §4do escribí que era la sesión de Google (varias cuentas → `/u/0/`, `/u/1/`). **Eso no
se sostiene**: un `fetch` a otro dominio no manda cookies por defecto, así que la sesión no
viajaba. Lo que sí explica todo es la **caché**: un `/exec` de Apps Script contesta con un
**redirect** a `script.googleusercontent.com`, y ese redirect el navegador lo guarda. Al
reimplementar, la dirección guardada muere → el navegador la sigue usando y recibe 404 para
siempre, mientras una ventana de incógnito (sin caché) anda perfecto.

`apiPost` agrega `?_=<milisegundos>` y pide con `cache:'no-store'`: sin dos pedidos iguales,
no hay redirect reusable. ⚠️ El parámetro **no puede llamarse `k` ni `kommo`**: `doPost` del
Apps Script desvía al camino del webhook de Kommo si los ve, y el panel entero dejaría de
guardar. Hay un check que lo cuida.
(`credentials:'omit'` queda: no arregla esto, pero saca una ambigüedad de encima y no cuesta.)

### Y el chip que «no se veía»
El dueño: *«no veo el chip de reposiciones»*. Estaba en `main` desde `76b4b18` — lo que falló
fue el **despliegue de Pages**, con un error de infraestructura de GitHub que no tiene nada
que ver con el código:

```
Error message: Failed to get ID Token. Request timeout: /147//idtoken/…
##[error]Ensure GITHUB_TOKEN has permission "id-token: write".
```

Es el servicio OIDC de GitHub tardando de más dentro de `actions/deploy-pages@v5`. Se arregla
volviendo a desplegar (cualquier push nuevo alcanza). **Antes de tocar el código porque «no
se ve algo que publiqué», mirar si el deploy de Pages salió verde**: `mcp__github__actions_list`
sobre el workflow `273388817`.

⚠️ Y la otra mitad: el chip **no está en la barra de botones** (Excel, Mapa, Lista de carga…)
sino en la fila de filtros de abajo, junto a «Todos · Por cobrar · Sin chofer…», arriba de la
tabla. La captura que mandó cortaba justo antes.

### Pruebas
`tests/test_carga.js` pasa de 24 a **27 checks**: que cada pedido lleve su propio número y no
se repita, que se pida con `no-store` y sin credenciales, y que el parámetro **no se llame
`k` ni `kommo`**. Batería completa: **1.918 comprobaciones, 0 mal**.

## 4dq. «A veces tardan hasta 4 minutos en subir una foto» (2026-09-09, noche)

Reporte de las vendedoras, con captura: el botón clavado en **«⏳ Subiendo la imagen… esperá
un momento»** y, escrito abajo, *«LLEVO 5 MINUTOS ASÍ»*.

### Lo que NO era
Lo primero que uno mira es el tamaño, y ahí estaba bien: las **cuatro** rutas de subida ya
achicaban a 1280 px con calidad 0,72 → una foto queda en ~150-200 KB. Tampoco era el candado
del servidor: `action:'foto'` está a propósito FUERA del `LockService` (línea 143 del `.gs`).

### Lo que sí es — tres cosas, en orden de culpa
1. **`fetch` no tiene tope de tiempo.** Si Google se cuelga o la red se corta a mitad, la
   promesa **nunca** resuelve: el cartel dice «subiendo» para siempre. Los «5 minutos» no son
   5 minutos de trabajo, son 5 minutos de espera colgada. Es la causa más probable de lo que
   fotografió el dueño.
2. **Achicar ahogaba al celular.** El camino viejo lee la foto entera a un **texto base64 de
   ~13 MB**, se lo pasa a un `<img>` que lo vuelve a decodificar, y recién ahí achica. En un
   celular barato eso son decenas de segundos y mucha memoria — y todo ANTES de empezar a
   subir, con el cartel ya diciendo «subiendo».
3. **El servidor tiene dos frenos evitables** (necesitan republicar el `.gs`, no se tocaron):
   `fotosFolder_()` hace una **búsqueda en Drive en cada foto**, y `setSharing(ANYONE_WITH_LINK)`
   es una operación de Drive notoriamente lenta, ahí en el camino crítico.

### Qué se hizo (solo navegador — no hace falta republicar nada)
- **`createImageBitmap`**: decodifica el archivo directo, sin texto intermedio y sin bloquear
  la pantalla. Si el navegador no lo tiene, cae al camino viejo (`achicarFotoLento`).
- **`conTopeDuro(prom, 90 s)`** en las cuatro rutas: a los 90 segundos corta y dice
  *«Google tardó más de 90 segundos y se cortó la espera. Probá de nuevo: la imagen no se
  subió»*. Nunca más un cartel eterno.
- **Cronómetro**: al terminar, el aviso dice **«achicar 1,2 s · subir 3,4 s»**. ⚠️ Esto es lo
  más importante del arreglo: sin separar las dos mitades, «está lento» no se puede arreglar
  — no se sabe si es el celular o Google. La próxima vez que pase, el número lo dice.

### Lo que queda pendiente del lado del servidor
Si con esto sigue lento y el cronómetro marca el tiempo en **subir**, el próximo paso es el
`.gs`: guardar el id de la carpeta en las propiedades del script (mata una búsqueda de Drive
por foto) y sacar `setSharing` del camino crítico. Eso sí exige Implementar → Versión nueva.

### Pruebas
`tests/test_carga.js` pasa de 27 a **32 checks** (sección 6): que la espera se corte sola y
no quede colgada, que el motivo se diga en castellano con los segundos, que una subida que sí
anda pase igual, y que el cronómetro reporte las dos mitades por separado. Batería completa:
**1.923 comprobaciones, 0 mal**.

## 4dr. 🏭 Qué producir: la semana, los 15 días y el mes que viene, por fábrica (2026-09-10)

### De dónde viene
Retomamos la proyección de stock. Primero repasé lo que había: la maqueta de Producción y el
análisis con las ventas del sistema (artefactos, sin código), y el dueño mostró
**`rotacion.html`** — la página que armé el **12/08** con su matriz mensual (Ene-25 a
**Jul-26**; agosto NO está), con proyección a 5 meses por promedio de 3/6/12 meses y backtest.
No está enlazada desde ningún lado ni anotada en esta bitácora hasta hoy.

**Medí esa proyección producto por producto** (corriendo su mismo método contra su propia
historia, Heaven + Sueña, error a un mes): total **13%**, por medida **25%**, por familia
**53%**, por producto **62%** (TITANIO ICE 160×190: 42%; Forte Flex 140×190: 233%). O sea:
sirve para «cuántas 140×190 va a hacer falta este mes», no para «cuántos TITANIO ICE 160×190
pedir». Y no sabe de stock, ni de fábrica, ni de discontinuados (pediría Bahía y Carioca).

### Lo que pidió el dueño (10/09), textual
- *"la idea es tener eso para tener el pedido mensual, y quincenal y/o faltantes para la
  semana y anticiparnos"*.
- *"yo no quiero subir cada mes el reporte de ventas, las ventas ya las tienes en el panel
  mismo... agosto está al 100% en el panel"* → **la fuente son los pedidos del panel**, nada
  de Excel de ventas. `rotacion.html` queda como estaba (foto de Ene-25 a Jul-26).
- *"no por bs perdido ni montos, solo queremos saber qué producir"* → unidades, sin plata.
- *"separado sueña y heaven porque heaven se produce en IM y sueña en fábrica productos
  terminados"* → **Heaven → Industrias Moreno (`MORENO`) · Sueña → Multiespumas (`MULTI`)**
  (`MARCA_FABRICA`). Es la primera vez que se dice qué fábrica hace qué marca.
- *"lógicamente descartando las ventas puntuales... como las mías"* → la misma regla de
  rotación de §4dj, sin cambios.
- *"así logística pide la producción para el mes de octubre, por ejemplo, y conforme rote,
  aumente o disminuya la rotación por pedidos puntuales o picos, sabe qué necesita para los
  siguientes 15 días y 7 días y qué cubre"*.
- *"si en septiembre se vendieron 70 soft, en octubre necesitaríamos el 70% por lo menos
  para la primera quincena"* → `PRODUCIR_1RA=0.7`. ⚠️ Leí «el 70%» como porcentaje; el
  número 70 de unidades y el 70% podrían ser una coincidencia. Se le preguntó. Lo medido en
  el sistema (jul-25 a ago-26) da **~60%** para «del 29 al 15» (la primera quincena más el
  pico de cobro de fin de mes, que sale del stock de octubre). Es UNA constante.

### Qué se hizo — el cuadro «🏭 Qué producir», arriba de la tabla de stock
Un bloque por fábrica (**💚 Industrias Moreno · Heaven**, **🛏️ Multiespumas · Sueña** y
**❓ Sin fábrica asignada**), y por producto **tres números**:
- **7 días** = exactamente `o.fabricar` de la tabla (🚨 PEDIR YA / 🏭 Pedir esta semana).
  Una sola verdad para la semana; si no, el dueño pregunta «¿por qué acá dice 5 y abajo 3?».
- **15 días** = max(vendido sin entregar hasta hoy+15+fábrica, ritmo de 15 días ×
  (fábrica + margen + 15)) − lo que hay. Acumulada: nunca menor que la de 7.
- **El mes que viene** (se nombra: «octubre») = ritmo de **30 días** (`porDiaMes`: misma
  regla de rotación, ≥3 entregas del equipo, medida sobre `STOCK_VENTANA_MES`=30) × los días
  del mes, o lo ya vendido para ese mes si es más, **menos lo que va a quedar el día 1** (lo
  que hay menos lo que se consume hasta fin de mes). De eso, el **70% para la 1ª quincena**
  y el resto para la 2ª. Los días entre hoy+15 y fin de mes no los produce nadie en esta
  corrida: entran en la próxima quincena (la ventana rueda).
- **«Hay»** = acá + Moreno + en camino. Lo de Moreno es de la fábrica de Heaven: se recoge,
  no se produce (misma lógica que `recoger`/`fabricar` de §4cr).
- **«Cubre hasta»** = el corte día por día de la tabla; si el ritmo de 15 días es cero pero el
  del mes no, una estimación gruesa con el del mes.
- Pie por bloque: **total y por medida** (eso es lo que la fábrica mira para espuma y tela).
- Botones **📋 7 días / 📋 15 días / 📋 octubre** por fábrica: el texto para WhatsApp con
  producto, código, cantidad, reparto por quincena y total por medida. Sin plata.
- Sin conteo del depósito no se calcula nada (§4co: el panel no inventa un número). Lo
  discontinuado no aparece (§4cz); lo de tienda y las ATC tampoco (§4cx).

**La fábrica de cada producto** sale de la **marca por el nombre del catálogo**
(`stockMarcaDeNombre`: Sueña primero —SUEÑA/COMBO/SOFT/SEMIORTOP./ESSENTIAL/PREMIER DELUXE/
BAHIA/CARIOCA/MOVEL PRO/RESPALDAR PRAG.—, después las líneas de ROHO —FLEX/PEDIC/SOMIER
NEGRO—, después Heaven —TITANIO/ORO/ESPECIAL/HEAVEN/TROPICAL/ALM/DREAM/BIRELAX/PLATA—). La
lista la saqué de los **catálogos del sistema** que están dentro de `rotacion.html` (102
códigos Heaven, 80 Sueña, y 42 de las líneas que vende ROHO). Si el nombre no dice nada, va
por la **última fábrica a la que se le pidió** (`o.fab`), marcado «acá por la última vez que
se pidió a X». Lo que no cae en ninguna —los nombres sueltos— va al bloque «sin fábrica
asignada», con el cartel pidiendo que el dueño diga dónde se hacen.

✅ **RESUELTO el 21/09** (estuvo pendiente desde el 10/09). El dueño, textual: *«flex pedic
de roho se fabrica en industrias moreno»*. Así que `MARCA_FABRICA` pasó a
`{heaven:'MORENO', roho:'MORENO', suena:'MULTI'}` y hay un **cuarto bloque**, «🔷 Industrias
Moreno · ROHO (FLEX / PEDIC)», pegado al de Heaven.
- Va en bloque **aparte y no dentro de Heaven** aunque sea la misma fábrica: son la línea que
  vende ROHO y meterlas bajo el título «Heaven» sería mentir en el papel que se manda. Al
  estar pegados, se mandan juntos a Moreno si se quiere.
- ⚠️ `stockBloqueDe` ya no recorre las **claves** de `MARCA_FABRICA` para el respaldo «por la
  última fábrica a la que se le pidió», sino `PRODUCIR_BLOQUES` **en orden**: desde que dos
  marcas comparten fábrica, un producto que no dice su marca y solo trae «se pidió a MORENO»
  tiene que caer en **Heaven** (la marca de la casa) y no en el que el navegador devuelva
  primero.
- El cartel del bloque «sin fábrica asignada» ya no nombra a ROHO (decía «líneas Flex y Pedic
  que vende ROHO, o nombres fuera del catálogo»).
- `tests/test_producir.js` pasó de 56 a **62 checks**: sección 8 nueva, y se corrigieron seis
  expectativas que usaban el PILLOW FLEX justamente como ejemplo de «sin fábrica». ⚠️ El
  respaldo «por la última fábrica» ahora se prueba con el **MORFEO** (nombre sin marca): al
  PILLOW FLEX un pedido viejo a MULTI **no** lo mueve, porque el nombre manda.

### Lo que NO se hizo, a propósito
- Ni estacionalidad (dic ×1,29 / oct ×0,75 del sistema: un solo año, y el backtest de
  `rotacion.html` mostró que empeora) ni reserva hasta el día de cobro ni tope de fábrica.
  Quedan como mejoras; el dueño no las pidió esta vez.
- `stockData` cambió lo mínimo: tres campos nuevos (`v30`, `n30`, `ventas30`) y dos
  derivados (`rotaMes`, `porDiaMes`). Nada de lo de §4dj se tocó.

### Pruebas
`tests/test_producir.js`, **45 checks**, reloj clavado en el 10/09/2026: marca por nombre
(22 casos), cambio de año y febrero, escenario con Heaven (10 en 5 entregas + 18 en 30 días,
3 acá + 2 en Moreno → 1 · 9 · 19 (14+5)), Sueña que solo rota en 30 días (→ 0 · 0 · 7),
el MORFEO de Eduardo (se cubren los 4 vendidos, nada de ritmo), la reposición y la ATC que
no cuentan, Carioca/protector que no aparecen, la línea ROHO que cae en «sin asignar» y pasa
a Sueña con un pedido previo a MULTI, la quincena nunca menor que la semana, la pantalla, el
texto copiado, «ver cubiertos» y que sin conteo no hay cuadro.
Batería completa: **1.966 bien · 2 mal**, y las 2 son de `test_noborra` y **fallan igual
contra `main` sin este cambio**: el test agenda un pedido nuevo para `D(3)` = hoy + 3, que el
10/09 cae **domingo**, y el panel no agenda domingos (§ portero). Es el mismo mal de
calendario de §4dh, en otro test; anotado en Pendientes.
Publicado en `main` (`c129f1e`).

### Segunda vuelta, misma tarde: el pie se abre por medida
El dueño mandó una captura del pie con sus números reales (TOTAL 22 · 110 · 316 · 211 ·
105) y pidió: *"dar click mostrar el desglose de esas medidas, qué modelos, sería ideal"*.
- Cada fila **«▸ por medida · 140x190 · 2 modelos»** del pie se toca y despliega debajo los
  modelos que la componen (`tr.producir-modelo`: nombre, código, «hay» y los cinco números);
  se vuelve a tocar y se cierra. Qué medidas están abiertas vive en `PRODUCIR_MED_ABIERTA`
  (por bloque + medida) y sobrevive al redibujo, porque `producirMedida()` llama a
  `renderStock()` como todo lo demás.
- En esa misma captura la medida venía escrita de tres formas —«105×190», «130X190CM»,
  «160X200»—, porque los nombres sueltos traen la medida tal cual la escribe el almacén.
  `producirMedidaEtq()` la deja de una sola forma (`130x190`, `70x190x3`, «sin medida») para
  el pie, el desglose y el texto copiado; el nombre del producto sigue mostrando la medida
  como la conoce el panel.
- `tests/test_producir.js`: **52 checks** (+7: la escritura de la medida, un nombre suelto
  con «130X190CM» que cae en «sin asignar» como `130x190`, abrir y cerrar una medida del pie
  con sus números, y el texto copiado con la medida unificada).

### Tercera vuelta: los títulos no se pueden ir de la pantalla
Con la tabla real (Heaven: 22 · 110 · 316 · 211 · 105) el dueño bajó al desglose por medida:
*"cuando bajo a ver el detalle por medida me pierdo al ver solo números sin saber si es para
la semana, quincena o qué: no se ven los títulos de arriba"*. Con cinco columnas de números
pelados, el encabezado no es decoración.
- ⚠️ **`position:sticky` en el `thead` ya estaba** (`.roho-tabla thead th`, top:0) **y no
  hacía nada**: el que scrollea es `#stock-body`, y el `<div style="overflow:auto">` que
  envuelve la tabla es su propio scrollport — el `thead` se clavaba al borde de ese div, que
  se iba entero para arriba con la página. Sticky se clava contra **el scrollport más
  cercano**, así que sin altura tope no hay nada contra qué clavarse. La misma trampa está en
  la tabla grande de stock (§4co) y en la de `renderStock`: si algún día molesta, es este
  mismo arreglo.
- **`.prod-wrap`** (`max-height:70vh; overflow:auto`) hace que cada bloque de fábrica
  scrollee adentro de su caja; recién ahí el encabezado queda clavado arriba (verificado:
  con la caja scrolleada 637 px, el `thead` queda a 1 px del borde).
- La fila del **TOTAL** se clava abajo (`tr.prod-total`, `bottom:0`) mientras se recorre la
  lista, dice **de qué fábrica es** («TOTAL Industrias Moreno · Heaven») y repite en chiquito
  qué es cada número (`7 d · 15 d · octubre · 1ª q · 2ª q`). Al llegar al pie se despega sola
  y queda arriba de las medidas, que es su lugar natural.
- `tests/test_producir.js`: **56 checks**. Los cuatro nuevos leen `getComputedStyle` de
  verdad (posición, `top`/`bottom`, `z-index` y que el fondo sea opaco), no el HTML: un
  sticky sin caja con altura pasa cualquier prueba de texto y no se clava en la pantalla.
  ⚠️ Al agregarlos pisé la variable `r` que usaban los checks de más abajo y dos empezaron a
  medir `undefined` (uno en rojo, el otro en verde por casualidad). En este archivo cada
  bloque nuevo usa su propio nombre (`r5b`, `r5c`, `rf`).

## 4ds. «Lleva 3 intentos y no conecta»: el mismo agujero de la foto, en los datos (2026-09-10)

Captura del dueño: el chip amarillo clavado en **«⏳ Conectando con la planilla del equipo…»**,
con los cupos abajo (o sea: la copia del dispositivo sí estaba). *"lleva 3 intentos y no
conecta"*.

### Lo que NO era
- **No era Pages.** El deploy `1401` del cambio anterior terminó en verde a las 16:45, y
  `pedidos.html` en `main` seguía siendo el mío (mismo hash).
- **No era el cambio del cuadro de producir**: eso es CSS y una fila del `tfoot`, no toca
  ninguna llamada al servidor. Y la página estaba viva (dibujaba los cupos).
- **No era un 404 ni la caché** (§4dp): un 404 se ve, dice el motivo y reintenta. Acá el
  cartel decía «conectando», que es el estado de **en curso**.

### Lo que sí es
`refrescarEstado()` llamaba a `apiList()` → `apiPost` → `fetch` **sin tope de tiempo**. Si
Google abre la conexión y no contesta nunca, esa promesa **no resuelve ni falla**. Y el
reintento se agenda dentro del `.then` de ese mismo intento (`cargaInicial`), así que **nunca
llega**: ni el reintento de 3 s, ni el de 8, ni el cartel rojo con el motivo. El panel se
queda diciendo «conectando» para siempre, y quien lo mira solo puede recargar a mano.

Es **exactamente el agujero de §4dq** (las fotos, «4 minutos subiendo»), que se tapó en el
camino de las imágenes y quedó abierto en el de los datos. `conTopeDuro` ya existía desde
entonces; faltaba usarlo acá.

### Qué se hizo
- **`CARGA_TOPE`=30 s** en `refrescarEstado`, vía `conTopeDuro(apiList(), CARGA_TOPE,
  'tardo_datos')`. Cubre también el refresco periódico, no solo la primera carga.
  ⚠️ **Solo la LECTURA lleva tope**, y es a propósito: pedir la lista de nuevo no rompe nada,
  pero cortar un **guardado** que el servidor quizá ya grabó y reintentarlo a ciegas sí.
- `conTopeDuro` ya recibía un tercer parámetro `queHacer` **y lo ignoraba**: ahora es el
  código del error, así el motivo del corte de una foto y el de una lectura se dicen distinto.
  `motivoDeError('tardo_datos')` → «Google no contestó en 30 segundos y se cortó la espera».
- **Los segundos a la vista** (`cargaSeg`, `cargaTic`): mientras espera, el chip dice
  «⏳ Conectando… **12 s**» y el cartel «12 s de hasta 30». Un texto quieto es indistinguible
  de una pantalla colgada — eso es lo que hizo que el dueño contara los intentos a ojo.
- Al cortarse, el chip dice **en cuánto reintenta solo** («Reintenta solo en 8 s»): «sin
  respuesta» a secas se lee como «se rindió».

### Lo que queda igual
Esto **no hace que Google conteste**: hace que el panel lo diga y siga intentando. Si el
servidor está caído de verdad, el camino sigue siendo el de §4dm/§4dp: incógnito primero, y
Actions → «Traer ventas de Kommo (respaldo)» para ver si contesta desde afuera del navegador.
⚠️ Desde acá **no se puede** disparar ese workflow: `actions_run_trigger` devuelve
`403 Resource not accessible by integration`. Lo corre el dueño.

### Segunda vuelta, con el cartel nuevo en la mano
El dueño mandó la captura con el arreglo funcionando: *«No se pudo leer la planilla: Google no
contestó en 30 segundos y se cortó la espera. Reintento solo en 7 s»*. Dos cosas más, que solo
se ven con el cartel andando:
- ⚠️ **El tope del panel tiene que ser MAYOR que la espera del servidor.** El `.gs` toma un
  candado con `waitLock(30000)` para leer y para guardar: si otro pedido lo tiene, espera 30 s
  y recién ahí contesta **`busy`**. Con `CARGA_TOPE`=30 s el panel cortaba **justo antes** de
  esa respuesta, así que «el servidor está ocupado» era invisible y se leía como «Google no
  contestó» — que manda a buscar el problema al lado equivocado (la red, el navegador). Ahora
  `CARGA_TOPE`=**45 s** y `motivoDelServidor` traduce `busy`, `clave` y `bad json`.
- ⚠️ **La misma cuenta regresiva se dibuja en DOS lugares** (el cartel de arriba y el chip de
  adentro de la pestaña) y el `setInterval` del reintento repintaba solo el cartel: en la
  captura del dueño se ve **«7 s» arriba y «20 s» abajo**, al mismo tiempo. Ahora las dos
  laten con `cargaTic`.
- **Lo que NO se tocó**: el `list` del `.gs` sigue tomando el candado exclusivo. `readAll()` es
  un solo `getDataRange().getValues()` —una foto atómica—, así que **leer no necesita
  candado**, y sacárselo quitaría la mayor fuente de `busy` (cada panel abierto pide la lista
  al entrar y cada minuto). Es un cambio de servidor: exige Implementar → **la implementación
  de siempre** → Versión nueva. Queda propuesto, no hecho.

### Pruebas
`tests/test_carga.js`, sección 7, **39 checks** (+7): una lectura que no contesta nunca se
corta sola a los 2 s (tope bajado en el test), pasa a `reintento`, dice el motivo con los
segundos, deja el reintento agendado, muestra los segundos mientras espera, ofrece «Volver a
intentar», la cuenta regresiva **baja y coincide en los dos carteles**, y `busy` se dice en
castellano. ⚠️ El chip vive en `#conn-form-txt` / `#conn-admin-txt`, no en `#adm-conn-txt`.

## 4dt. El servidor tardaba minutos: el candado trababa lo que no tenía que trabar (2026-09-10)

*"qué pasa con el servidor, al subir fotos, al entrar, al cambiar algo tarda minutos"*, con
una captura del botón clavado en **«⟳ Enviando…»**.

### La causa
El Apps Script atiende **de a uno**: `doPost` toma `LockService.getScriptLock()` con
`waitLock(30000)`. Eso está bien para guardar —dos personas no pueden pisar la misma fila—,
pero adentro del candado había **dos cosas que no lo necesitan**, y son justo las que más
corren:

1. **LEER la planilla.** `readAll()` es UN solo `getDataRange().getValues()`: una foto
   atómica, no una lectura fila por fila que se pueda mezclar con un guardado a medias.
   Cada dispositivo pide la lista **al entrar y cada minuto**. Con el equipo conectado, las
   lecturas se hacían de a una **y hacían esperar a cualquiera que quisiera guardar**.
2. **HABLAR CON KOMMO.** Armar un borrador son hasta **cuatro pedidos de red** a
   `eanez.kommo.com` (el lead, el contacto, el catálogo y la vendedora), y se hacían con el
   candado tomado: con 5 ventas eran ~20 llamadas seguidas con la planilla cerrada. Eso son
   los «minutos». Peor: aunque no hubiera nada que cargar, igual tomaba el candado.
   ⚠️ **Quién lo dispara seguido es el WEBHOOK, no el repaso.** El cron de `traer-kommo.yml`
   dice «cada 10 minutos», pero GitHub demora los crons frecuentes en repos gratuitos y en
   la práctica corre **una vez cada ~3,5 horas** (está anotado en el propio yml, y se
   confirmó el 10/09: corridas 14:03 y 17:39 UTC). El que entra a cada rato es el aviso de
   Kommo por cambio de etapa — el registro de las 17:40 mostró el último 2 minutos antes.

Y aparte, cada foto hacía una **búsqueda de carpeta en Drive** (`getFoldersByName`), o sea
cuatro búsquedas por entrega. Estaba anotado como pendiente desde §4dq.

### Qué se hizo (`google-apps-script.gs` → `2026-09-10-a`)
- **`list` sale del candado.** Es una línea movida arriba del `waitLock`.
- **Kommo, antes del candado.** `crearBorradorDeLead_` se partió en dos: `borradorDeLead_`
  (todo lo que se le pregunta a Kommo, sin candado, devuelve el pedido armado o el motivo) y
  la escritura. `kommoProcesar_` arma todo afuera y toma el candado **solo para escribir**.
  ⚠️ La garantía de «no duplicar» NO se aflojó: `leadYaCargado_` se vuelve a comprobar
  **dentro** del candado, porque entre que se armó el borrador y el momento de escribirlo
  puede entrar otro aviso con el mismo lead.
- **Si no hay nada que escribir, ni se toma el candado.**
- **La carpeta de fotos se busca una vez** y el id queda en las propiedades del script
  (`FOTOS_FOLDER_ID`); si alguien la borra o la mueve, el `try` la vuelve a buscar sola. De
  paso se comparte **la carpeta** «cualquiera con el link». ⚠️ El `setSharing` por archivo
  **se mantiene**: es el que sostiene hoy que `lh3.googleusercontent.com/d/<id>` muestre la
  foto sin sesión de Google (§4cd), y romperlo dejaría a los choferes sin fotos. Sacarlo es
  el próximo paso, y hay que probarlo con UNA foto antes.

### Lo que NO se tocó
El candado de **guardar** y de **borrar** sigue igual: ahí sí hace falta.

### Pruebas
`tests/test_servidor.js` pasa de 70 a **76 checks**, sección 7. No miran el código: miran el
**orden de lo que pasa**, reemplazando `LockService` y `UrlFetchApp` por dobles que anotan
cada paso. Contra el `.gs` publicado (`2026-09-05-c`) **fallan cuatro**, y el detalle dice
exactamente el bug viejo: `candado → kommo → suelta`, «3 búsquedas» de carpeta para 3 fotos.
⚠️ Dos trampas del doble de Google: sin `deleteProperty` en `PropertiesService` reventaba con
«not a function», y sin `KOMMO_TOKEN` configurado `kGet_` ni sale a la red, así que el test
del orden pasaba sin haber probado nada.

### Para que sirva de algo hay que PUBLICARLO
Es un cambio de servidor: el dueño tiene que pegar el `.gs` y hacer
**Implementar → Administrar implementaciones → ✏️ la de siempre → Versión nueva**.
⚠️ NO «Nueva implementación»: eso estrena otra dirección (§4dp). Hasta que lo publique, el
panel va a avisar que el servidor está viejo — `SCRIPT_VERSION_ESPERADA` ya subió a
`2026-09-10-a` en `pedidos.html`, como manda la regla de subir las dos juntas.

## 4du. El chorro de `doGet`: alguien de afuera lee la planilla entera cada 3 segundos (2026-09-10)

Con el `.gs` de §4dt ya publicado (Versión 23), el panel seguía sin conectar, **también en
incógnito**, con el servidor sin contestar en 45 s. El dueño mandó la captura del registro de
**Ejecuciones** de Apps Script, y ahí estaba la respuesta de verdad:

- `doPost` (lo del panel): **0,5 a 1 s** cada uno. El servidor atiende rápido.
- `doGet`: **uno cada 3 o 4 segundos**, de **3,3 a 5,7 s** cada uno, varios «En proceso» a la
  vez. En 50 segundos, 14. Cada `doGet` es `readAll()`: la planilla ENTERA.

Eso es lo que ahoga al servidor: tres o cuatro lecturas completas de la hoja siempre en el
aire, y los guardados del equipo esperando detrás. Y **NADA de este repositorio llama al
`/exec` con GET**: `pedidos.html` solo hace POST (`apiPost`), `traer_kommo.py` hace POST, el
worker de Cloudflare habla con Kommo y no con el panel, `productos-mes.js` ni tiene la
dirección, y ningún dashboard la usa (se buscó el id del script y `/exec` en todo el repo).
**El que llama es de afuera**: un Google Sheet con `IMPORTDATA`, algo que armó la otra
herramienta, un monitor de «uptime», una pestaña con el `/exec` abierto refrescándose…
⚠️ Y como `PANEL_KEY` está apagada por decisión del dueño (§4ce), cada uno de esos GET se
lleva **la lista entera de clientes**. Hay que saber quién es.

### Qué se hizo (`google-apps-script.gs` → `2026-09-10-b`)
1. **Cada `doGet` se anota en el registro** (`getRegistrar_`): los NOMBRES de los parámetros y
   el largo de la consulta — nunca los valores, que pueden ser claves. En Ejecuciones, abrir
   una fila de `doGet` muestra `doGet · parámetros: ninguno` (un `IMPORTDATA` o un pinger),
   `_` (algo que copia al panel) o `k` (Kommo).
2. **La respuesta del GET sale de la caché** (`CacheService`, `GET_CACHE_SEG`=20 s, partida en
   trozos de 64 KB porque cada clave admite 100 KB y con acentos un carácter puede ser 2
   bytes): diez GET seguidos leen la hoja UNA vez. **Un guardado, un borrado o un borrador
   nuevo la borran** (`getCacheOlvidar_`), así el que lee por GET no ve nada viejo. El `list`
   por POST —el del panel— NO pasa por la caché: siempre la hoja de verdad. Sin
   `CacheService` (un Google raro) contesta igual, leyendo.
3. Solo el camino GET cambió. El de §4dt (candado sin lecturas ni Kommo) sigue.

### Pruebas
`tests/test_servidor.js` pasa de 76 a **81 checks**, sección 8: tres GET seguidos leen la hoja
una sola vez, cada uno queda anotado con nombres y sin valores (se manda `k:'secreto…'` y se
comprueba que no aparezca), un guardado borra la caché y el GET siguiente ya trae el pedido
nuevo, el `list` por POST no usa la caché, y sin `CacheService` contesta igual. Contra el
`.gs` publicado `2026-09-05-c` fallan **8** (los 4 de §4dt más estos 4).
⚠️ El doble de `CacheService` tiene que devolver **la misma instancia** en cada
`getScriptCache()`: devolver un objeto nuevo por llamada hacía que guardar y leer cayeran en
mapas distintos y el test acusara «3 lecturas» con el servidor bien.

### Lo que falta: identificar al que llama
Con `2026-09-10-b` publicado, el dueño abre Ejecuciones → una fila de `doGet` → el registro
dice qué parámetros trae. Con eso se sabe si es Kommo, algo que imita al panel, o un lector
sin parámetros (planilla/pinger). Hasta entonces, la caché lo vuelve inofensivo.
**No funcionó así** — ver §4dv.

## 4dv. Quién lee por GET, visible sin Cloud Logging + `GET_CERRADO` (2026-09-10)

El dueño publicó `2026-09-10-b` (Versión 24) y los `doGet` bajaron a 0,7 s (salen de la caché).
Pero el plan de §4du —abrir una fila de `doGet` en Ejecuciones y leer el `console.log`— **no
le sirvió**: *"doy click en dopost y no sale nada ni abre nada.... no salen parametros ni
nada"*, *"doget igual.... no deja abrir nada"*. En el menú ⋮ de cada fila, **«Registros de
Cloud» y «Errores de Cloud» están en gris**: el script corre en el proyecto de Google por
defecto, sin visor de registros, y las ejecuciones disparadas por gente de afuera (un GET
anónimo) no despliegan nada en esa lista. O sea: el registro existe, pero él no lo puede ver.

### Qué se hizo (`google-apps-script.gs` → `2026-09-10-c`, `pedidos.html`)
1. **Cada GET se anota en la caché del script** (`getLogAnotar_`, clave `get_log`): las últimas
   `GET_LOG_MAX`=40 **firmas** y un conteo **por firma**. Una firma es hora · NOMBRES de los
   parámetros (ordenados) · largo de la consulta · ruta (`pathInfo`, cortada antes de un `=`) ·
   **dispositivo** (`Session.getTemporaryActiveUserKey()` recortada a 6 letras: distingue un
   navegador de otro sin decir quién es; rota cada 30 días) · de dónde salió la respuesta
   (`cache` / `hoja` / `clave` mal / `cerrado`). **Nunca un valor**: `k` puede ser una clave.
   Cada GET renueva la vida del registro (6 h, tope de `CacheService`); si el chorro para, se
   borra solo. Como mucho 15 firmas distintas; el resto cae en «otras».
2. **Un resumen va a las Propiedades del script** (`getLogAProps_`: `GET_RESUMEN` y
   `GET_ULTIMOS`, texto legible) **como mucho una vez por minuto** (marca `get_log_prop` en la
   caché): escribir propiedades tiene cupo diario y el chorro era de miles por hora. Se leen en
   Apps Script → ⚙️ Configuración del proyecto → Propiedades del script, sin herramienta alguna.
3. **El panel lo pide con `{action:'getlog'}`** (en `doPost`, antes del candado, después de la
   clave del equipo): Administración → **📡 ¿Quién lee la planilla?** (`verLecturasGet` →
   `renderGetLog`): cuántas desde cuándo, ritmo total y de las últimas 15, cuadro por firma
   (veces, primera, última, dispositivos, de dónde salió la respuesta), detalle desplegable, y
   **cómo leerlo**: «sin parámetros» + mismo dispositivo cada pocos segundos = una pestaña/app en
   bucle; dispositivo «?» o cambiante = un servicio (Make/Zapier, `IMPORTDATA`, monitor);
   parámetros con nombre = alguien que conoce la dirección. Con el `.gs` viejo (sin `get` en la
   respuesta) dice que hay que republicar y qué versión falta; un error de red pasa por
   `motivoDeError`; dos toques seguidos son un solo pedido (`GETLOG_EN_CURSO`).
4. **`GET_CERRADO`** (`getCerrado_`): con `GET_CERRADO = 1` en las Propiedades, `doGet` contesta
   `{ok:false, error:'get_cerrado'}` **sin leer la hoja** y **sin volver a implementar** (las
   propiedades se leen en cada ejecución). El panel, el repaso de Kommo y el worker usan POST:
   al equipo no le cambia nada. Se sigue anotando (`como:'cerrado'`), para ver si el de afuera
   insiste. Para reabrir: borrar la propiedad (o ponerla en `0`/`no`). **Es decisión del dueño
   cerrarla**: si la otra herramienta armó algo legítimo que lee por GET, se entera al toque.
5. Un GET con la clave mal (con `PANEL_KEY` puesta) también queda anotado, sin el valor.

⚠️ El registro va **sin candado** (§4dt manda): dos GET al mismo tiempo pueden pisarse una
anotación. Es un diagnóstico, no contabilidad — con un GET cada 3 s alcanza y sobra.
⚠️ `Session.getTemporaryActiveUserKey()` no está probada contra un GET anónimo real: si Google
no la da, el dispositivo sale «?» (está envuelto en try/catch) y eso también es una pista.

### Pruebas
- `tests/test_servidor.js` de 81 a **94 checks**, sección 9: cuatro GET (dos sin parámetros,
  uno con `_,k` y un valor «secreto», uno con ruta y otro dispositivo) → `getlog` los agrupa
  por firma con la más repetida primero, en TODA la respuesta no aparece un valor, cada firma
  trae dispositivos y caché/hoja, la marca va recortada, UNA escritura a Propiedades por
  minuto (con el primer GET; pasado el minuto se actualiza y `GET_ULTIMOS` lista las firmas),
  `GET_CERRADO=1` niega sin leer la hoja mientras el `list` por POST sigue, `0` reabre, la
  clave mal se anota sin el valor, y sin `CacheService` contesta igual con `sinCache:true`.
  Dientes: contra el `.gs` publicado `2026-09-05-c` fallan **15**; contra el `-b` de `main`, 7.
  ⚠️ Los dobles ganaron `setProperties` y `Session.getTemporaryActiveUserKey`.
- `tests/test_getlog.js` (**21 checks**, nuevo): el botón manda exactamente `{action:'getlog'}`,
  el informe dice 1812 lecturas desde hace 2 h, «una cada ~3,4 s, la última hace 5 s», la firma
  «sin parámetros» ×1810 con un dispositivo primero, de la caché/leyó la hoja, el detalle, cómo
  leerlo y `GET_CERRADO`; un solo pedido por vez; `.gs` viejo → «hay que republicar» con la
  versión; 404 traducido; `busy`; puerta cerrada arriba de todo; ninguna lectura con el último
  resumen de las propiedades; sin caché avisa; textos de tiempo. ⚠️ Las celdas del cuadro se
  pegan en `textContent` («_,k215:28:50»): la firma se busca en el HTML, no en el texto.

### Qué tiene que hacer el dueño
Pegar el `.gs`, **Implementar → Administrar implementaciones → ✏️ → Nueva versión** (Versión 25),
abrir el panel → Administración → **📡 ¿Quién lee la planilla?** y mandar la captura. Si no abre
el panel: ⚙️ Configuración del proyecto → Propiedades del script → `GET_RESUMEN`. Con eso se
decide si va `GET_CERRADO = 1`. ⚠️ Mientras `PANEL_KEY` siga apagada (decisión suya, §4ce),
cada GET de afuera sigue llevándose la lista de clientes.

## 4dw. Catálogo: COLCHON SUEÑA LITE 140x190 · CH2532 (2026-09-10)

Pedido del dueño: *"agrega a la lista de productos el colchon sueña lite código CH2532 medida
2 plazas 140x190"*. Una entrada más en `CODIGOS` (`pedidos.html`), al final:
`"CH2532":{d:"COLCHON SUEÑA LITE",m:"140x190"}`. Con eso la vendedora la ve en la lista como
«COLCHON SUEÑA LITE 140x190 · CH2532» (`NOMBRES_LISTA` se arma sola desde `CODIGOS`), y el
código la resuelve.
- El nombre lleva **SUEÑA** a propósito: `stockMarcaDeNombre` la manda al bloque **Sueña →
  Multiespumas** de 🏭 Qué producir (§4dr) por esa palabra; «COLCHON LITE» a secas habría
  quedado «❓ Sin fábrica asignada».
- El reporte de existencias la llama «COLCHON LITE …» (§4ct): entra **por código** (`stockInfo`
  por `CH2532`), no por nombre. Las **otras medidas** del LITE siguen sin código en el catálogo
  y quedan con su nombre crudo (§4cy) hasta que el dueño pase sus códigos.
- Ningún test cuenta las entradas del catálogo; la batería sigue igual.

## 4dx. Catálogo: COLCHON SMART 105x190 · CH2521 (2026-09-11)

Pedido del dueño, al ver que la reposición del 08/09 («3 SMART de 1,5 plazas a cada tienda
Sueña») entraba sin código: *"CH2521"*. Una entrada más en `CODIGOS`, al final:
`"CH2521":{d:"COLCHON SMART",m:"105x190"}`. Mismo camino que el LITE (§4dw): la vendedora la ve
como «COLCHON SMART 105x190 · CH2521», y el reporte de existencias la encuentra por código.
- Las tres reposiciones RPT 09-004 (Mutualista), 09-008 (Charcas) y 09-009 (Carmelo) ya
  llevan el código en su renglón de SMART; se corrigieron desde la consola contra la planilla.
- El nombre NO lleva «SUEÑA»: `stockMarcaDeNombre` no lo reconoce y el SMART cae en «❓ Sin
  fábrica asignada» de 🏭 Qué producir hasta que se le anote un pedido a fábrica o el dueño
  diga en cuál se hace. Las otras medidas del SMART siguen sin código.

## 4dz. ATC: 🔁 Programar devolución, y las 28 OC repetidas de agosto (2026-09-11)

Dueño: *"en las ATC falta el botón programar devolución, para que logística, una vez recojan,
programen la devolución… y marque y ocupe espacio en ese día"*.
- La ATC vive en UN pedido. Al programar, `p.fecha`/`p.turno` pasan a ser el viaje de vuelta
  (así entra sola a cupos, lista de carga, chofer y mapa) y el recojo queda en `a.rec`.
  `p.entregado` vuelve a falso: el ✅ del chofer ese día cierra la ATC (`a.ent`), y destildar
  la reabre (`atcAlMarcarEntregado`, llamado desde `choEntregado`, `quickEntregado` y
  `toggleEntregado`). Datos nuevos dentro de `x.atc`: `rec, pdev, pturno, pdevQ, pdevH`.
- `atcRecogida` = `a.rec || p.fecha`; `atcFueRecogida` es verdadero si hay `a.rec`. Estado nuevo
  `programada` (🔁) entre «lista» y «cerrada»; filtro y ficha de la pestaña ATC lo muestran.
  El chip en las listas dice «🔁 ATC · devolución» el día de la vuelta.
- El botón está en la ficha (`verAtc`), habilitado solo después del recojo. El modal
  (`abrirProgramarDevAtc`) muestra los cupos AM/PM del día elegido; el servidor valida el
  cambio de fecha como un pedido nuevo (día cerrado, turno lleno) y avisa si no entra.
  «Quitar la devolución» vuelve al día del recojo. Probado en local con `persistPedido` en
  memoria: programar → programada y cupo ocupado → ✅ cierra → destildar reabre → quitar.
- Las 28 OC repetidas de agosto (33 pedidos) se renumeraron desde la consola: el que se
  cargó primero conservó el número; los demás pasaron a 08-265…08-297 en orden, con
  «Era OC 08-xxx (repetida; renumerada el 11/09/2026)» en observaciones. Verificado contra
  la planilla: cero repetidas.

## 4ea/4eb. ATC: abre en «Mes» con las viejas sin cerrar; aviso «recoger de fábrica» (2026-09-11)

- §4ea — La pestaña ATC esperaba la planilla entera para dibujar («tarda en cargar»). Ahora
  `refreshAtc` dibuja con lo que hay y baja atrás (no si se bajó hace <1 min). Abre en «Mes»,
  y «Mes» incluye las ATC de meses anteriores que siguen sin cerrar, con «⏳ de ago-26».
- §4eb — El dueño: *"volvió de fábrica significa un turno para logística: ir a recoger a la
  fábrica y ese día llevar al cliente… mejor una alerta 2 días hábiles antes"*. Sábado cuenta
  como hábil; el recojo en fábrica NO ocupa cupo. Con la devolución programada (`a.pdev`),
  `atcRecogerFabDesde` = 2 días hábiles antes; desde ese día y hasta que alguien tilde
  «✓ Recogido» (`a.rf`, `marcarRecogidoFab`) la ATC está en estado `recogerfab` (🏭, rojo) y
  aparece como bloque «🏭 Recoger de fábrica» arriba de la ficha del chofer y de la lista de
  carga (`recogerFabHtml`). El ✅ del chofer el día de la entrega anota `rf` si faltaba.
  «Volvió de fábrica» pasó a «Listo en fábrica» (`a.dev`), opcional: no frena nada.
  Probado en local (persistencia en memoria): lunes 14 → aviso desde viernes 11; martes 15 →
  sábado 12; miércoles 16 → lunes 14.

## 4dy. QA del módulo Stock en vivo: buscador por palabras y tabla «En camino» con scroll (2026-09-11)

Pasada de pruebas sobre todo lo que cambió el 11/09 en «Stock y reposición», contra los datos
reales (703 filas, corte del 10/09, 272 productos en `stockData().lista`), sin guardar nada en
la planilla. Invariantes verificadas en 272 filas: `porDiaReal = vendidosRotacion/15`, la regla
baja/media/alta, `pedir = recoger + fabricar`, el corte de `stockProyectar` recomputado aparte,
el depósito negativo tratado como 0. En `stockProducir` (104 filas): `mes = max(0, mesNec −
mesQueda)`, `mes1 + mes2 = mes`, enteros, `sem = fabricar`, `quin ≥ sem`, totales por bloque,
`mesMin ≤ mes ≤ mesMax`, `prob` = mediana. COLCHON SOFT 140x190 para octubre: 5 estimaciones
(30 d 61,0 · 60 d 48,4 = (54+41)/2×31/30,4 · 90 d 42,1 · oct-25 34 · tendencia 30,9) →
probable 42,1, rango 31–61, necesita 43, queda 0, producir 43 (31 + 12). Tiendas: ninguna venta
de tienda de los últimos 30 días quedó «Sin tienda»; `q15`/`mes`/`sobra` cuadran por fila y por
tienda (Charcas vendió 105, recibió 30, va a pedir 59 en 15 d y 108 en octubre). Formulario de
tienda, Kommo (borrador → OC bloqueada; edición real → editable) y filtros: bien.

Dos cosas se corrigieron:
- **El buscador de la tabla buscaba la frase entera.** «titanio 160» o «titanio ice 160» daban
  0 filas porque el nombre es «TITANIO ICE · 160x190» y el « · » cortaba la coincidencia. Ahora
  `stockAplicarFiltro` parte lo escrito en palabras y exige que estén todas (en nombre, código
  o «también:»). Una sola palabra y el código siguen igual.
- **La tabla «🚚 En camino» no tenía caja con scroll**: en un celular desbordaba el panel 51 px
  y aparecía scroll horizontal en toda la pantalla. Va envuelta en un `div` con `overflow:auto`,
  como la tabla principal.

Dudoso, no tocado: `sugerirTiendaSuc` solo sugiere si el selector está vacío, así que si se
cambia de vendedora después de que se sugirió una tienda, la tienda no cambia (es para no pisar
una elección a mano). El «30 d» del rango es el ritmo del equipo (sin Eduardo ni puntuales) y
el 60/90 d cuenta todas las ventas menos RPT: son medidas distintas a propósito.
## 4ee. Los N° de nota que faltan se ven al TOCAR, no solo con el mouse (2026-09-14)

El dueño, con una captura del Cuadre (aviso «16 N° de nota salteados en el talonario», chip
«Juan Pablo Paredes · 16 faltantes» y el globito del `title` abierto): *"Solo aparece al pasar
el mouse, debería salir una ventana desplegable al dar click para ver bien"*. §4bk había
resumido ese aviso a un chip por vendedora con los números en el `title` para no hacer un muro
de ocho renglones — y el `title` no existe en el celular ni se puede copiar.

### Qué se hizo (`pedidos.html`)
- Un `det` de aviso puede traer **`numeros`** (+ `vendedor`). `alertaDetHtml(det, k)` lo dibuja
  como chip **que se abre** (`cuaToggleChip`, estado en `CUA_CHIP_ABIERTO[k+'|'+i]`, sobrevive
  al re-render de `renderCuadre`) y, abierto, despliega `numerosSubHtml`: quién y cuántos, los
  números en grande (`.cua-num`, monoespaciado) corridos en **rangos** («1564–1566»,
  `rangosNumeros`/`rangosTexto`), un texto de qué hacer con cada recibo, y **📋 Copiar los
  números**. `stopPropagation` para que tocar el chip o la caja no pliegue el aviso.
- El globito sigue (con los rangos y «tocá para verlos»): en la compu ayuda; en el celular ya no
  es la única vía. La ayuda de abajo del panel dice también «y un “N faltantes” para ver qué N°
  de nota son».
- `tests/test_cuadre.js` de 28 a **33 checks** (sección 10): chip plegado con el conteo, tocar
  despliega «3–4 · 6» y dice de quién, botón copiar, el aviso no se pliega, el chip queda
  marcado, tocar de nuevo cierra, y `rangosTexto` con un repetido.

## 5. Pendientes

> ✅ **La revisión con cuatro agentes del 19/09 (§4er) quedó arreglada el 20/09** (§4es, bloques
> 1–9: §4et Kommo en el `.gs`, §4eu Contabilidad, §4ev Administración/stock, §4ew los MEDIA/BAJA,
> §4ex sábado). Los 12 rojos viejos de `main` (`test_producir` 6, `test_atc` 4, `test_onclicks` 1,
> `test_rpt` 1) y los 9 del 18/09 (`test_borradores` 8, `test_conflicto` 1) están en verde: **la
> línea de base de la batería vuelve a ser CERO rojos.** Queda a decisión del dueño: BAJA 9 de
> Contabilidad (fallback de `cobrosDe`, §4eu) y «mes sin ventas = sin dato» del plan (§4ev).
> ✅ El `.gs` `2026-09-20-a` (§4et) **está publicado** (confirmado el 23/09 por el registro del
> respaldo de Kommo, §4fx). ⚠️ El `2026-09-23-a` se subió el 23/09 y dejó a TODO el equipo sin
> conexión: se volvió a 20-a (§4fz-b, «el incidente»), y el repaso de Kommo del script siguió
> parado porque los disparadores corren lo GUARDADO en el editor. **El `2026-09-23-b` y el panel de la rama
> `claude/pedidos-fecha-entrega-bgt0em` esperan la revisión de Codex y el OK del dueño**; se publican
> JUNTOS y en el orden de §4fz-b «Publicar». Hasta entonces producción es `ebc3eab` + 20-a: el stock
> y el arqueo se siguen pisando entre dispositivos y borrar no mira el sello.
> `test_producir` ya no tiene rojos (62/62 desde §4es).

> 🗓️ **`tests/test_noborra.js` se pudría los jueves**: agendaba para `D(3)` sin mirar el día de
> la semana, y cuando hoy + 3 cae domingo el portero lo rechaza (2 checks en rojo el 10/09,
> también contra `main`). ✅ **Arreglado el 24/09** (§4fz-b, antes de publicar la 23-b): la
> sección 6 usa `DH(3)`, el primer día hábil (lunes a viernes) desde hoy + 3; `D(0)` no se tocó.
> Medido un jueves: 33/2 → 35/0.
> 🗓️ **`tests/test_borradores.js` se pudría los jueves y los viernes** (hora UTC, o sea desde las
> 20:00 de Bolivia del día anterior): la sección 7 convierte el borrador en pedido para `dd(2)` en
> turno **PM**, y eso cae sábado (sin PM) o domingo (cerrado). El portero lo rechaza con razón y
> caían 8 checks: **eran «los 8 rojos del 18/09»**, que fue viernes; «pasaron a verde» solo porque
> después se corrió otro día. ✅ **24/09**: `ddHabil(2)` (primer lunes a viernes desde hoy + 2).
> Medido un jueves: 87/8 → 95/0. Las otras `dd(1)` de la prueba no guardan por el portero.

> 🧹 **Los dashboards mensuales (`dashboard-*-2026.html`, míos)** arrastran del molde de
> julio 3 bloques de JavaScript que fallan en silencio («React is not defined» ×3, un
> «missing )») y 29 imágenes con dirección `blob:` muerta. Se ven completos igual, pero es
> basura que conviene limpiar un día tranquilo (visto el 09/09 al revisar el de agosto).

> ## ✅ APPS SCRIPT PUBLICADO Y CONFIRMADO: `2026-09-05-c` (2026-09-05, 15:32 UTC)
> Run 33975079467 del repaso:
> ```
> leads en la ventana: 2
> servidor del panel: versión 2026-09-05-c
> último aviso de Kommo al panel: 2026-09-05T15:31:31.824Z
> borradores NUEVOS creados: 0 de 2
> ```
> **🔔 EL WEBHOOK LLEGA.** `kMarcaHook_` solo lo escribe `kommoHook` (el repaso NO lo toca),
> así que ese sello es un aviso real de Kommo, 35 segundos antes de la corrida. Queda
> descartada de una vez la hipótesis «Kommo no avisa» — que sostuve dos veces sin datos y el
> dueño desmintió las dos. Lo que faltaba era procesarlo bien, que es §4cg + §4ch.
> **Falta medir** el camino completo (crear en «Compradores» → aparece solo): hasta ahora
> todos los casos reales entraron por el repaso.
>
> ## ✅ Publicación anterior: `2026-09-05-b` (2026-09-05, 14:55 UTC, run 33973242047)
> Confirmado en el registro del repaso (run 33973242047): `servidor del panel: versión
> 2026-09-05-b`. Rige §4cg completo: el sello no se puede omitir, forzar exige `ADMIN_KEY`
> con la puerta con llave, y el aviso de Kommo lee `leads[add]`/`leads[update]`.
> En Kommo, «Lead agregado» **ya estaba tildado** (lo verificó el dueño con una captura):
> el aviso llegaba y era el servidor el que no lo leía.
>
> **La venta perdida se recuperó**: el repaso de las 14:48 UTC (run 33972925411) la creó
> —`borradores NUEVOS creados: 1 de 1`, con el `.gs` viejo todavía—, y el de las 14:55 ya
> dijo `0 de 1`. Es la primera vez que la red de seguridad de §4cf se usa de verdad, y
> sirvió: sin la ventana de 12 horas no la habría alcanzado.
>
> **Lo que queda por ver**: que la PRÓXIMA venta creada directo en «Compradores» llegue
> sola, sin correr el workflow. Si el repaso vuelve a decir `creados: 1 de 1`, el webhook
> sigue sin llegar y hay que mirar Kommo, no el servidor.
>
> ## ✅ Publicación anterior: `2026-09-05-a` (2026-09-05, 14:23 UTC)
> El dueño pegó el `.gs` e hizo *Nueva versión*. Confirmado desde afuera con el repaso de
> Kommo (run 33971648264): `servidor del panel: versión 2026-09-05-a`. **Así se verifica de
> ahora en más**: Actions → «Traer ventas de Kommo (respaldo)» → Run workflow → leer la
> línea de versión en el registro (§4cf). Rigen los cuatro arreglos de §4ce que no dependen
> de la clave (borrarFoto, conflictos, porteros al mover, OC repetida).
>
> (Antes de confirmarse decía: `SCRIPT_VERSION` pasó a `2026-09-05-a` por los cinco arreglos
> de seguridad; los tres pasos están al final de §4ce.)
>
> **⏸️ LA CLAVE DEL EQUIPO QUEDÓ EN ESPERA por decisión del dueño (2026-09-05):** *"de
> momento no implementemos eso, dejamos standby"*. O sea: **hacer solo el paso 1** (publicar
> el `.gs`), que activa los otros cuatro arreglos. No configurar `PANEL_KEY` — sin ella el
> servidor sigue abierto como siempre y ningún dispositivo pide nada. El código queda listo
> para el día que decida activarla (pasos 2 y 3 de §4ce). Mientras tanto, Administración va
> a mostrar el aviso rojo de «servidor sin clave» cada vez que se abra; si molesta, bajarlo a
> un aviso discreto (está en `renderConnEstado`).
>
> (Historial: `2026-09-04-a` fue por los borradores de Kommo, §4cc — pasos ahí.)
> Lo de abajo es el historial de la publicación anterior.
>
> **✅ NO era pendiente hasta hoy: el Apps Script estaba publicado.** Deploy `2026-08-22-a`, confirmado
> en verde el **22/08/2026** (§ del candado). Verificado de nuevo el 31/08: `SCRIPT_VERSION`
> del `.gs` y `SCRIPT_VERSION_ESPERADA` del panel coinciden, y **nada tocó
> `google-apps-script.gs` desde entonces** (`git log 96e9d05..main -- google-apps-script.gs`
> vacío), así que no hace falta volver a publicar.
> **Antes de pedirle al usuario que republique: correr ese `git log`.** Si está vacío, no hay
> nada que republicar — se preguntó de más el 29 y el 31/08 por no mirar acá primero.
> El exec de Google es inalcanzable desde el sandbox (proxy 403): la única confirmación
> posible es el cartel en 🔒 Cerrar día, en la pantalla del usuario.

1. **Reactivar `--bake-ai`** en panel.yml cuando terminen los ajustes de diseño (el usuario avisará).
2. **Conversión global** (ficha del Pulso, hoy = cierres÷leads "caja"): decidir si pasa a cohorte. Pendiente de decisión del usuario.
3. ~~Corregir el typo "Instragram" → "Instagram" en el campo Canal de Kommo~~ — **el
   relevamiento del 04/09 lo mostró bien escrito** en las opciones del campo `2049570`.
   Si el typo aparece todavía, está en las **tags** de algún lead viejo, no en el campo.
4. Borrar `.pages-redeploy` (archivo basura de los redeploys forzados) en algún commit futuro.
5. Token Kommo expira ~2026-10-28 (secret `KOMMO_TOKEN`).
6. **Integración Kommo → panel de pedidos** — ▶️ EN MARCHA desde el 04/09 (ver §4by y §4bz).
   - **Paso 1 hecho y CORRIDO** (run 33893469199): estructura relevada, sin filtrar datos.
     Los hallazgos, el mapeo y los dos errores del inspector están en **§4bz**.
   - **Paso 1b hecho** (run 33894331125, inspector corregido): el mapeo quedó **confirmado
     con datos** — ver la tabla de §4bz. **El disparador es «Compradores» (`103450711`)**,
     no la etapa 142 (que este negocio no usa: 5 leads en toda su historia).
   - **Preguntar al usuario:** ¿qué hace el Worker
     `tight-limit-134e.eduardoxyz22.workers.dev/kommo-hook` (webhook id=47362831, activo)?
     Ya escucha `status_lead`, o sea que Kommo **sí** puede avisar solo cuando una venta
     cambia de etapa. Eso reemplazaría la consulta periódica que recomendaba §4by.
   - **Decisión pendiente del usuario:** a Kommo le faltan **fecha de entrega, turno, zona,
     link de Maps y N° de nota de venta** (dirección SÍ la tiene: campo `1685406`).
     ¿Se crean esos campos en Kommo, o el lead entra al panel como BORRADOR y alguien
     completa la entrega ahí? Ya se le explicó el camino del borrador paso a paso.
   - **Lo que el borrador NO va a traer siempre: los productos (40%).** O la vendedora los
     carga en el panel para el otro 60% (que es lo que hace hoy con el 100%), o se acostumbra
     al equipo a enganchar siempre el catálogo en Kommo. Decisión del usuario.
   - (Diferida el 2026-07-24 por decisión del usuario; retomada el 2026-09-04.)
   - Objetivo: que crear/mover un lead en Kommo genere el pedido en el panel (`pedidos.html`) automáticamente.
   - Diseño propuesto: webhook de Kommo por cambio de etapa → `doPost` del Apps Script del panel →
     callback `GET /leads/{id}?with=catalog_elements,contacts` con `KOMMO_TOKEN` → escribir la fila del pedido.
   - **Ya resuelto (según §4b/§4c)**: los productos viven en el **catálogo** de Kommo como `catalog_elements`
     con **`metadata.quantity`** (código + cantidad) → el mapeo de productos es viable sin campos nuevos.
   - **Falta en Kommo**: campos de entrega — *fecha entrega, turno AM/PM, zona, dirección, link Google Maps,
     celular*. Sin ellos los pedidos llegarían a medias y el panel pierde sus controles (cupos, sábado/domingo, GPS).
   - Recomendación dada al usuario: el panel es mejor lugar para cargar la ENTREGA; Kommo es el CRM de la VENTA.
     Alternativa liviana anotada: al marcar Entregado/Cobrado en el panel, actualizar el lead en Kommo.
   - No se pudo relevar Kommo en vivo desde el sandbox (token es secret de GH Actions + el proxy bloquea
     `eanez.kommo.com` con 403). Para inspeccionar sin exponer claves: workflow de solo-lectura
     (`workflow_dispatch`) que imprima pipelines/etapas/campos/catálogo al log de Actions.

## 4ec. El resumen mensual del panel se armaba con datos viejos (2026-09-12) — publicado el 13/09 (b7e5d0e)

Lo encontró ChatGPT revisando la predicción de stock, y tenía razón. `ventasPanelIndex()`
(lo vendido por producto y mes según el panel, §4du) guardaba el resultado y lo reusaba
mientras `STATE.length` no cambiara. La cantidad de pedidos no dice nada de su contenido:
corregir 2 → 20 unidades, cambiar el producto, cambiar el mes de venta, recibir del servidor
la planilla corregida con la misma cantidad de filas (`refrescarEstado`), o borrar uno y
agregar otro, dejaban el resumen viejo — y con él las estimaciones de 60 d, 90 d y
tendencia del plan del mes (🏭 Qué producir). `stockOlvidarIndice()` tampoco lo borraba.

**Alcance real:** solo el rango del plan del mes que viene. La rotación de 15 días, «cuánto
pedir», el corte y la columna 30 d salen de `stockData()`, que siempre recorre STATE de
cero: no estaban afectados. En el uso diario el bug se tapaba solo porque cada pedido nuevo
cambia la longitud, pero dentro de una misma sesión una corrección podía no verse.

**Arreglo:** se saca la caché. `ventasPanelIndex()` recorre STATE cada vez (700 pedidos,
un par de milisegundos) y `stockProducir()` lo arma UNA sola vez por plan y se lo pasa a
`stockProducirDe(o, MS, PI)` → `stockRangoMes(o, MS, PI)`; sin `PI` (llamada suelta) se
arma en el momento. `copiarProducir` pasa por `stockProducir`, así que pantalla, desglose y
texto para fábrica salen del mismo cálculo. Fórmulas, exclusiones y reglas: sin cambios.

**Prueba:** `tests/test_ventas_panel.js` (red cortada, servidor simulado, datos sintéticos):
cantidad arriba/abajo, producto, mes de venta, fecha de entrega (no mueve el mes: manda
`contaFecha`), `refrescarEstado` con mismas filas, reemplazo a igual longitud, repetición,
unión a mano (STOCK.a), plan del mes (60 d) y reconstrucción independiente. Corrida a mano
en el browser contra las dos versiones: **vieja 1 bien · 11 mal**, **corregida 12 bien · 0
mal**. Ejemplo sintético: 2 SOFT 140x190 en agosto corregidos a 20 → antes el 60 d del plan
daba 21,9 (seguía con 2); ahora 31,1.

⚠️ `tests/test_producir.js` espera `mesNec` 18,6 (decimal) y el plan sin rango: esas
expectativas quedaron viejas desde §4ds (enteros que cierran) y §4du (rango), no por este
arreglo. Hay que actualizarlas aparte, con criterio, no para que «pase».

## 4ed. Mis pedidos: «no me deja borrar esa letra» en Tu nombre (2026-09-14)

El dueño, con captura: borra el nombre para cambiar de vendedora y la última letra («C»)
no se deja borrar. Dos cosas se juntaban:

1. `misVendedorSel()` rellenaba el campo con el nombre recordado (§4ch) cada vez que lo
   encontraba vacío — y `renderMis()` corre con cada tecla (`oninput`). Al borrar la última
   letra el campo quedaba vacío un instante y volvía a llenarse.
2. `setVendedorMem()` guardaba lo que hubiera, letra por letra, desde los dos campos de
   nombre (formulario y Mis pedidos). Por eso lo recordado era justamente «C», y no el
   nombre completo. Ese pedazo también se usa como «quién lo hizo» en las ATC
   (`rfQ`/`devQ`/`pdevQ`), así que ahí podía quedar «C» o «Car».

**Arreglo:** el relleno automático no toca el campo mientras tiene el foco
(`document.activeElement!==mv`): con la persona escribiendo, vacío es vacío. Y la memoria
solo guarda un nombre completo: conocido (VENDEDORES o cualquier vendedor de STATE, con la
escritura oficial de `nombreCanonico`) o nuevo de verdad (tres letras o más y que no sea el
comienzo de ningún conocido). Vacío sigue olvidando. Sin cambios en la lista desplegable.

**Prueba (browser local, eventos `input`):** memoria «Carola Chavez» + `setVendedorMem('C')`
y `('Car')` → sigue «Carola Chavez»; `('mauricio merida')` → «Mauricio Merida»;
`('Ximena Lopez')` → se guarda; `('Xi')` → no; `('')` → olvida. Caso del dueño: memoria «C»,
al entrar a la pestaña el campo muestra «C», con foco se borra y queda vacío, se tipea «Ma»
y la memoria no cambia, «Mauricio Merida» completo sí. ⚠️ El simulador de teclas del
navegador embebido no ejecuta Backspace (tampoco en un input suelto), así que la prueba de
tecla real no sirve ahí; la lógica quedó cubierta con los eventos.

## 4ee. El letrero rojo de «Cerrar día» mentía: versión distinta no es candado roto (2026-09-15)

El dueño, con captura de la ventana Cerrar día: *"🚨 OJO: el candado está SOLO en los
navegadores. Lo publicado en Google es una versión vieja (dice 2026-09-10-b, tendría que decir
2026-09-10-c), y esa versión no rechaza los pedidos de un día cerrado"* — *"¿qué pedo, si ya lo
habíamos arreglado?"*.

**Qué pasaba de verdad.** El Apps Script publicado es `2026-09-10-b` (Versión 24, la que él
publicó el 10/09, §4dv). El mismo día quedó en el repo la `-c`, que solo agrega el registro de
quién lee por GET y `GET_CERRADO` (§4dv) — nunca se publicó, y no hacía falta para nada del
candado. El candado del servidor existe desde `2026-08-21-a` (§4ce) y está en la `-b`.
**Probado el 15/09 contra el servidor real**: un `save` de prueba con fecha 16/09 (cerrado)
volvió `{ok:false, error:'dia_cerrado'}` sin escribir nada. El letrero comparaba lo publicado
con `SCRIPT_VERSION_ESPERADA` y ante CUALQUIER diferencia decía en rojo que el candado no
estaba. Falsa alarma; y los dos avisos de «Revisar ubicaciones» tenían el mismo defecto.

**Arreglo (`pedidos.html`, 7ed3f6f→este commit):** cada aviso pregunta por LA función que le
importa, con la versión desde la que existe: `SCRIPT_CANDADO_DESDE='2026-08-21-a'`,
`SCRIPT_GEO_DESDE='2026-07-27-c'`, `servidorTiene(desde)` (las versiones son fecha-letra:
comparar como texto ordena). Si lo publicado tiene la función pero no es la última, sale
verde con una línea gris «ℹ️ hay una versión más nueva sin publicar; lo que agrega no toca
esto» (`scriptPendienteHtml`), con los pasos por si la quiere. El rojo queda solo para un
servidor anterior a la función. Sin versión sigue el «⏳ todavía no sé».

**Pendiente del dueño (opcional):** publicar la `-c` (Implementar → Administrar
implementaciones → ✏️ → Nueva versión) para tener «📡 ¿Quién lee la planilla?». No urge.

## 4ef. Guía de la vendedora: el retiro de efectivo (2026-09-16)

El dueño: *"falta en la guía lo de registrar RETIRO efectivo en las novedades"*. Las
«Novedades» son `guia-vendedor.html` (el enlace 🆕 del formulario); la guía del administrador
ya lo explicaba (§retiros) pero la de la vendedora no decía nada. Se agregó la sección
**💵 La plata en efectivo → Retiro de efectivo** (`#retiro`, también en el índice): qué queda
anotado (fecha, quién entrega/retira, monto, N° de notas, facturado o no, foto del recibo),
qué tener listo cuando pasan (efectivo separado por nota, todos los cobros en efectivo
cargados con el método correcto, pedir ver el registro como comprobante), cómo se controla
(cobrado − retirado = le queda en la mano) y que QR/tarjeta no entran. Solo la guía; el
panel no cambia.

## 4eg. Kommo apagó el webhook; el script contesta al instante y repasa solo cada 5 min (2026-09-16)

El dueño: *"al crear el lead y cargar los datos en el CRM debería salir en el panel… he subido
2 y no aparecen hace 10 min"* (Freddy Cori Mollo). Y después, captura de Kommo: **«Webhook
está desactivado debido a una respuesta no válida»**.

**Lo que se vio.**
- Las últimas 14 corridas de `traer-kommo.yml`: desde el 14/09, CADA ventana con ventas
  nuevas dice «estos los perdió el webhook» (2/2, 4/6, 3/3, 1/4, 4/4). El webhook no traía
  nada; lo único que traía era el repaso de GitHub, que corre cada ~4 h (no cada 10 min).
- La corrida de las 18:24 UTC falló: el Apps Script contestó **HTTP 404** con 3 leads.
- Apps Script lento: `list` por POST tardó 24 s, 125 s; un GET cacheado 3 s, sin caché 15-21 s.
  Kommo espera pocos segundos y apaga el webhook tras varios fallos seguidos.
- Se corrió el repaso a mano (workflow_dispatch, run 35143716328): 4 leads, 4 borradores
  nuevos, entre ellos `kommo-40001308` (Freddy, Carola Chávez).

**Arreglo (`google-apps-script.gs` → `2026-09-16-a`, `pedidos.html`, `traer_kommo.py`).**
1. **El webhook contesta ya.** `kommoHook` valida la clave, arma los ids como antes y llama
   a `kommoEncolar_`: guarda los ids en la propiedad `KOMMO_COLA` (tope 200) y deja UN
   disparador de una vez (`ScriptApp.newTrigger('kommoProcesarCola').after(1000)`), solo si
   no hay otro esperando. Ni Kommo ni el candado en ese camino. Si no hay `ScriptApp` o no
   deja crear disparadores (falta autorizar), hace el trabajo en el momento, como antes.
2. **`kommoProcesarCola()`** (disparador de una vez): se borra a sí mismo primero, lee la
   cola, `kommoProcesarObj_` (el de siempre: sin duplicar, fecha vacía, Borrador Kommo),
   y saca de la cola SOLO los que procesó.
3. **`kommoRepaso()`** (disparador cada 5 min): procesa la cola y después consulta Kommo
   `/leads?limit=100&order[updated_at]=desc&filter[statuses][0][pipeline_id]=…&
   filter[statuses][0][status_id]=…&filter[updated_at][from]=ahora−KOMMO_REPASO_MIN(360)`,
   mismo filtro que el repaso de GitHub. Deja `KOMMO_REPASO_ULTIMO` (ts, cola, vistos,
   creados, error; sin nombres). `kGet_` ahora trata **204** como «sin resultados» (Kommo
   contesta 204 cuando no hay nada; antes era «falló»).
4. **`instalarDisparadores()`** (correr una vez desde el editor): borra los viejos y deja el
   de 5 min. **`estadoKommo()`**: último aviso, último repaso, cola, si está instalado.
5. `kommoProcesar_` quedó como envoltorio de `kommoProcesarObj_` (objeto plano) para que los
   disparadores puedan usar el resultado; la respuesta trae `ultimoRepaso`, y
   `traer_kommo.py` lo imprime (o avisa que falta correr `instalarDisparadores`).
6. El repaso de GitHub sigue igual, como tercera red.

**Pruebas.** `tests/test_servidor.js` de 94 a **119 checks** (sección nueva): el webhook
contesta OK sin red ni candado y encola; un segundo aviso no duplica el disparador; el
disparador crea los borradores (fecha vacía, marcados), vacía la cola y se borra; el mismo
lead de nuevo no duplica; sin clave no encola; sin `ScriptApp` crea en el momento; el
repaso consulta etapa+embudo+`updated_at` de 6 h, vacía la cola primero, no duplica lo que
ya estaba, deja el resumen sin nombres; 204 no es error; Kommo caído se anota; instalar
dos veces deja uno. Dientes contra el `.gs` viejo: la sección se declara ausente (1 mal) en vez de reventar. `tests/test_hook.js`
sigue en 78/78 (su Google de mentira no tiene `ScriptApp`: cubre el camino «en el momento»).

**Pendiente del dueño (obligatorio para que rinda).** (1) Kommo → Webhooks → **Encender**.
(2) Apps Script: pegar el `.gs`, Implementar → Administrar implementaciones → ✏️ → Nueva
versión. (3) En el editor: elegir `instalarDisparadores` → Ejecutar → autorizar. (4)
Verificar: Cerrar día muestra `2026-09-16-a`, y en 5 min `estadoKommo()` trae un repaso.

⚠️ Sigue abierto: el GET del `/exec` devuelve la planilla entera sin clave (`GET_CERRADO` no
está puesto, §4dv). Y la lentitud de fondo del Apps Script no se tocó acá.

## 4eh. Huecos del talonario: los recibos de los pagos también cuentan (2026-09-18)

El dueño, con captura de «Revisar antes de cerrar»: *"la nota 1758 ya se corrigió y añadió
pero sigue saliendo como sugerencia. ¿No revisa en tiempo real?"*. Sí revisa en tiempo real
(se recalcula en cada dibujado desde STATE); el problema era QUÉ miraba. En la planilla no
hay ninguna venta con nota 1758: el número quedó como recibo del PAGO del saldo (QR BISA
3000 del 14/09, «#1758») en la venta de nota 1753 de Isabel Robledo. `huecosTalonario` miraba
solo `p.nota`, y los recibos de los pagos posteriores salen del mismo talonario.

**Arreglo (`pedidos.html`):** `notasDelTalonario(p)` = la nota de la venta + la nota de cada
pago (`parseCobros(p.metodoPago)[].nota`, anticipo incluido), todas por `notaNumero` (solo
números pelados). `huecosTalonario` usa eso. Las reglas siguen: por vendedora, huecos de
hasta HUECO_MAX, nada en las puntas.

**Prueba:** `tests/test_talonario.js` (nuevo, Playwright, 10 checks): el recibo de un pago
tapa su hueco; una venta sin nota pero con recibo en el pago cuenta; anticipo `~`; otra
vendedora no tapa; «001-08» no entra; salto grande = otro talonario; puntas. Corrido a mano
en el browser local: los 9 casos en verde (una expectativa mía estaba mal y se corrigió:
con 1753, 1757, 1758 y 1760 faltan 1754-1756 y 1759).

Vistos de paso en los datos de Isabel (septiembre): una nota «17478» (casi seguro 1748 mal
tipeada) y cuatro ventas con la nota vacía. Se le dijo al dueño; no se tocó nada.

## 4ei. Corregir el recibo del primer pago corrige la nota de la venta (2026-09-18)

El dueño, con la ficha de Carolina Loayza Vargas: *"Isabel corrigió el pago y el N° de nota,
pero en el título no se corrigió"*. El pago decía «nota 1748» y la ficha seguía titulada
«Nota 17478»: la venta tiene su propio campo `nota` y «✏️ Corregir» del pago no lo tocaba.
Regla del dueño: *"debe ser la primera como pago o anticipo, porque los vendedores a veces
cargan hasta 3 notas de pago en un mismo cliente"*.

**Arreglo (`pedidos.html`, `ctaGuardarPago`):** si el pago que se corrige es el ANTICIPO —o,
si la venta no tiene anticipo, el PRIMER cobro (`ctaIdxCobro`===0)— y el N° cambió, la nota
de la venta pasa a ser ese recibo (`p.nota=nota`, antes de `aplicarCobros`, así viaja en el
mismo guardado). Un segundo o tercer pago, y el recargo por entrega, no la tocan. El cartel
lo dice: «… y el N° de nota de la venta también pasó a 1748».

**Prueba (browser local, `persistPedido`/`apiSave` simulados):** anticipo 100→150 ⇒ venta
150; 2º cobro 101→199 ⇒ venta sigue 100; sin anticipo, 1º cobro 200→250 ⇒ 250; 2º cobro ⇒
queda 200; venta sin nota + anticipo 300→301 ⇒ 301.

**Dato corregido a mano** en la planilla: `kommo-39452846` (Carolina Loayza Vargas, Isabel)
nota «17478» → «1748», que era la nota faltante del talonario (§4eh).

## 4ej. Pago mixto: dos métodos en la misma venta desde el formulario (2026-09-18)

El dueño: *"hay clientes que pagan de manera mixta"* (QR + tarjeta) y proponía cargar la
venta dos veces con el mismo recibo y sacarle el aviso de duplicada. No: dos pedidos son dos
ventas (unidades, totales, cupos, facturación) y el aviso de duplicada tendría razón. La
venta ya guardaba varios pagos (el ledger `+`), pero el formulario admitía UN método.

**Arreglo (`pedidos.html`).**
- Debajo del bloque de cobro: botón **«➕ Pagó con dos métodos»** (`wrap-mixto-btn`, visible
  cuando hay método) que abre `wrap-mixto`: `f-metodo2` (Efectivo/QR/Tarjeta), `f-monto2`
  («¿cuánto con este método?» — el primero se lleva el resto), `f-banco2` si es QR
  (`renderBancos2`, con `BANCO_EXTRA2` al editar) y `f-comp-box2` con sus imágenes
  (`FORM_COMPS2`; `adjuntarCompForm(2)` / `COMP_DESTINO` reusa el mismo input de archivo).
  `pintarMixto()` corre desde `updateBancoVisibility`, `f-metodo2`, `f-monto2`, `f-cobrado`.
- Al guardar (`submitPedido`): valida método, base (> 0), monto (0 < m2 < base), banco del
  QR, mismo método dos veces (dos QR a bancos distintos sí), imagen del segundo pago. El
  historial se arma con `textoCobros([anticipo(resto, comps1), cobro(m2, comps2)])`, los dos
  con la fecha de hoy y la nota de la venta. Vale para «SÍ, pagado» (sobre lo cobrado) y para
  el adelanto (sobre «A cuenta»; el saldo queda como lo tipeó).
- Editar: `mixtoDe(p)` (el cobro del mismo día y mismo recibo que el anticipo) vuelve a
  mostrar el bloque con su monto, método, banco e imágenes, y `f-cobrado` muestra la SUMA.
  `_mixCambio`: agregar/quitar el segundo método o cambiarle monto, método, banco o imágenes
  rehace el historial aunque el total no cambie (antes «la plata está igual» lo conservaba).
- `resetForm` limpia todo; sin tocar el botón, la venta se guarda como siempre.

**Cuentas.** `anticipoDe` = el primero (resto), `cobrosDe` = [el segundo]; `ventaTotal` =
saldo + cobros + anticipo = lo cobrado; `excesoCobro` 0. Contabilidad y el cuadre ven cada
parte con su método y su banco (lo que preguntó el dueño: *"¿la fórmula y el cuadro tomarán
lo que entró a efectivo, a QR y a tarjeta si fue mixto?"* — sí).

**Prueba:** `tests/test_mixto.js` (Playwright, 22 checks + sin errores JS), corrida a mano en
el browser local: 22 bien · 0 mal. Cubre el guardado (una venta, dos pagos, mismo recibo y
día, imágenes, total, pagada sin exceso, `cobradoBs`), las seis negativas, la edición
(vuelve a mostrar, conserva sin tocar, rehace al cambiar el reparto: 4000 + 990), el
adelanto mixto (1500 + 500, saldo 2990, total 4990), el desglose por método y el caso sin
mixto. Guía de la vendedora: tarjeta «💳 Pagó con dos métodos» (`#mixto`).

**Ajuste (mismo día):** el botón estaba al final del bloque de cobro, debajo del recargo
por entrega, y el dueño lo vio confuso. Ahora vive en el título «¿Con qué pagó?»
(`mixtoBtnHtml()` dentro de `updateMetodoVisibility`); el bloque del segundo método sigue
abriéndose al final del cobro y la pantalla baja hasta él.

## 4ek. Los retiros de Mirian: estaban, pero en otro mes; y un retiro en cola se perdía de la vista (2026-09-18)

El dueño: *"Mirian indica que cargó retiros de efectivo pero no aparecen en el panel… ¿es
eso posible?"*. Un agente revisó la planilla y el código (informe en el scratchpad):
- **Los 4 retiros de Mirian SÍ están** (`__ret_…`, guardados el 16/09 15:32-15:55) pero con
  fecha **17 y 18 de agosto**. La ventana de retiros abre filtrada en el **mes actual**: en
  septiembre no se ven los de agosto. Ella no los vio y los **cargó dos veces**: Bs 400
  (nota 973) y Bs 2.650 (nota 2426) duplicados → **Bs 3.050 de más** en el cuadre. Ids a
  borrar (decisión del dueño): `__ret_pmu4hysn86zk__` (sin foto) y `__ret_pmu4isuf73r6a__`.
- Sus ventas y pagos de septiembre (25 ventas, 22 con comprobante) llegaron todos; nada perdido.
- **Agujero real:** `mergePending` → `leerCierresDeLista` dejaba en RETIROS solo lo del
  servidor; un retiro en la cola (sin señal, `busy`, sin clave) desaparecía de la ventana en
  el primer refresco aunque siguiera en `ME_PENDING_V1`.
- El «registrado ✓» de `guardarRetiroForm` salía ANTES de que el servidor contestara.

**Arreglos (`pedidos.html`):** (1) `mergePending` vuelve a sumar a RETIROS los pendientes
`__ret_` hasta que se manden. (2) `persistRetiro` devuelve la respuesta; el cartel dice
«⏳ Guardando…» y después «guardado en la planilla ✓», «❌ el servidor NO aceptó (motivo)» o
«⚠️ quedó SOLO en este dispositivo… las demás no lo ven». (3) Al guardar un retiro de otro
mes la ventana **se va a ese mes** y lo dice. (4) **Aviso de duplicado** antes de guardar:
misma vendedora, mismo monto y una nota en común → confirm con el retiro que ya está y en qué
mes mirar. (5) El encabezado dice «N en otros meses o vendedoras» cuando el filtro esconde
retiros.

**Prueba (browser local, servidor simulado):** guardar uno de agosto desde septiembre → la
ventana pasa a ago-26 y el cartel lo dice; en septiembre el encabezado dice «1 en otros
meses»; el mismo retiro de nuevo → confirm y, si dice no, no se guarda; servidor `busy` →
queda en cola con el cartel rojo y **sigue en la ventana después de un refresco** con la
lista del servidor vacía.

Sigue: registro de rechazos en el servidor + latido de la cola + pestaña en Administración.

## 4el. Guardados rechazados y colas sin enviar: registro en el servidor y pestaña en Administración (2026-09-18)

El dueño: *"¿cómo hacemos para tener una pestaña de administración para ver las
modificaciones o correcciones fallidas?… indican que cargan comprobantes o ventas o pagos,
recargan la página y les salió cargado pero no aparecen"*. Hasta acá un «no» del servidor
era un cartel de 9 s en el navegador de quien guardó, y una cola sin enviar era un «N sin
enviar» al pie de SU pantalla.

**Servidor (`google-apps-script.gs` → `2026-09-18-a`).** `doPost` pasó a ser un envoltorio
de `doPostCuerpo_`: lee la respuesta y, si es `{ok:false}` con un motivo de
`RECHAZOS_REGISTRAR` (conflicto, dia_cerrado, cupos_llenos, oc_repetida, admin, clave, busy,
bad json, no id, drive…), `rechazoAnotar_` agrega una fila a la hoja **«Rechazos»** (Fecha,
Acción, Motivo, Id, Cliente, Vendedor, Quién guardaba, Detalle, Dispositivo). El detalle lleva
fecha/turno, OC, «rev enviado / rev hoja» en un conflicto, y «RETIRO DE EFECTIVO Bs X» si es
un `__ret_`; nunca teléfono ni dirección. Tope 2000 filas (se borra la más vieja). La clave
que falta en un `list` NO se anota (un dispositivo sin clave refresca cada 2 min); al
guardar sí. **Latidos:** cada `list` trae `cola` y `colaIds` del dispositivo; `latidoAnotar_`
guarda en la propiedad `LATIDOS` (por dispositivo: ts, quién, cuántos, ids, si mandó clave) y
la borra cuando la cola llega a 0. `action:'rechazos'` devuelve `{total, rechazos (200, del
más nuevo), latidos}` sin candado.

**Panel (`pedidos.html`).** `apiPost` manda `quien` (el nombre recordado) siempre y, en el
`list`, `cola`/`colaIds`. Administración: botón **«⚠️ Guardados rechazados / sin enviar»**
(`verRechazos` → `renderRechazos`): tabla de dispositivos con cola (quién, cuántos, hace
cuánto, si tiene clave, qué ids) y tabla de rechazos (cuándo, quién, qué —con «abrir» si el
pedido existe—, motivo en castellano, detalle); con el `.gs` viejo dice qué versión falta.
Mis pedidos: `#mis-cola` (`renderColaAviso`, desde `updateFooter` y `renderMis`) muestra
arriba de todo «⏳ N guardados de este dispositivo todavía NO llegaron a la planilla (motivo)»
con Reintentar y 🔐 Ingresar la clave, y «❌ El servidor NO aceptó N guardados desde este
dispositivo» con los últimos 7 días (`ME_RECHAZOS_V1`, que `rechazoFirme` alimenta).

**Pruebas.** `tests/test_servidor.js` de 119 a **133**: día cerrado y conflicto quedan
anotados con motivo/id/cliente/vendedor/quién y el detalle (sin teléfono); un guardado que
entra no se anota; `rechazos` los devuelve del más nuevo al más viejo con el total; `list`
sin clave no llena la hoja pero `save` sin clave sí; el latido queda con quién/cuántos/ids/
clave, el informe lo muestra, con cola 0 se borra, y sin el dato no escribe. En el browser
local: informe con datos simulados, mensaje de «.gs viejo», el aviso de Mis pedidos con
cola y rechazos (y vacío cuando no hay nada), y el payload del `list` con quien/cola/ids.

**Pendiente del dueño:** publicar el `.gs` (Nueva versión) para que el servidor empiece a
anotar; hasta entonces el botón avisa que falta la `2026-09-18-a`. Los latidos y la hoja
«Rechazos» aparecen solos.

**Publicado por el dueño el 18/09 (`2026-09-18-a`) y verificado contra el servidor real:**
`action:'rechazos'` contesta, un `save` de prueba a un día cerrado volvió `dia_cerrado`, no
se escribió y quedó como primera fila de «Rechazos» (cliente «PRUEBA RECHAZO (no debe
guardarse)», quién «Mirian Salazar» porque el navegador de prueba tenía ese nombre recordado).
**Defecto visto ahí:** `Session.getTemporaryActiveUserKey()` da «?» para un POST anónimo, así
que TODOS los dispositivos caían en un solo latido. → `2026-09-18-b`: el panel inventa un id
por navegador (`ME_DISPOSITIVO_V1`, `dispositivoId()`, 6 letras) y lo manda en cada llamada
(`payload.dispositivo`); el servidor lo usa en latidos y rechazos (`dispositivoDe_`), con el
de Google solo de respaldo. Test: dos dispositivos de la misma persona → dos latidos; el
rechazo lleva el id (135 checks). Falta republicar la `-b`.

## 4em. El comprobante que «salió listo» y después no estaba (2026-09-18)

El dueño: *"a veces uno sube un comprobante de pago y cuando volvés a abrir el pedido nunca
subió, no aparece, se borra, siendo que cargó y salió LISTO"* (le pasa a él y a Mirian).

**Reproducido** (browser local): la vendedora abre su pedido con ✏️ Editar desde Mis pedidos,
sube la imagen (Drive la acepta, «Imagen lista ✓»), guarda sin tocar montos («Cambios
guardados ✓»)… y el historial de pagos quedaba tal cual, SIN la imagen. Causa: en
`submitPedido`, si el pedido ya tiene historial y la plata no cambió (`_plataIgual`), se
conserva `prev.metodoPago` entero — y `FORM_COMPS` con la imagen nueva se tiraba. Segundo
defecto: `metodoFormulario` devolvía solo `comp` (una imagen), así que el formulario abría
con la primera y, cuando sí se rehacía el historial, las demás desaparecían.

**Arreglo (`pedidos.html`):** `metodoFormulario` devuelve `comps` (todas). En `submitPedido`,
con `_plataIgual`, las imágenes de `FORM_COMPS` que no estaban se pegan al ADELANTO
(`anticipoDe(prev)`) reescribiendo el historial con `textoCobros([ant + cobros + envíos])`:
la plata, las fechas, los recibos y las imágenes de los otros pagos siguen iguales.

**Prueba:** `tests/test_comp_perdido.js` (Playwright, 8 checks + sin errores JS), corrida en
el browser local 8/8: la imagen nueva queda en el adelanto sin tocar la plata; el cobro
posterior conserva la suya; anticipo/cobrado/saldo/total iguales; con dos imágenes previas
el formulario abre con las dos y al guardar quedan tres; guardar sin imagen nueva deja el
historial idéntico. `tests/test_mixto.js` sigue 22/22.

Otras formas de perder una imagen que SÍ avisan: un choque de versión al guardar
(`rechazoFirme` recarga la copia del servidor; ahora queda en «Guardados rechazados», §4el)
y la cola sin enviar (ahora visible en Mis pedidos). En Contabilidad, la imagen de un pago
NUEVO queda pegada recién al tocar «Registrar pago» (el cartel lo dice).

## 4en. El «✓» ya no puede mentir: el panel verifica el eco de cada guardado (2026-09-18)

El dueño: *"cuando haces revisión me decís que no hay errores, y siguen apareciendo. ¿Cómo
puedo confiar que ya no hay errores? En especial en el guardado. Es tiempo valioso que un
vendedor pierde revisando 2-3 veces si subió y volviéndolo a subir."*

Respuesta honesta: las pruebas cubren lo que cubren (§4em no estaba cubierto). Lo que sí se
puede garantizar es que el panel COMPARE lo que la persona vio con lo que la planilla
devolvió, y grite si falta algo. El servidor contesta cada guardado con la fila tal como
quedó (`res.pedido`).

**Arreglo (`pedidos.html`).** `ecoFaltantes(imgs, fotos, srv, nota, nProd)`: imágenes de
pago (`%id` en `metodoPago`), fotos de entrega, N° de nota y cantidad de productos que
tendrían que estar y no están. `ecoAvisar`: cartel rojo de 15 s «⚠️ SE GUARDÓ INCOMPLETO
(cliente). La planilla NO tiene: … Abrí el pedido, revisá y volvé a cargar lo que falte» y
anotación en `ME_RECHAZOS_V1` (se ve en Mis pedidos, §4el). Dos puntos de control:
- `verificarEcoForm(res.pedido, rec, prev)` en `submitPedido`, DESPUÉS del «✓»: compara
  `FORM_COMPS`+`FORM_COMPS2` (lo que la vendedora subió), las fotos de entrega que el pedido
  ya tenía, el N° de nota tipeado y la cantidad de productos. Este es el que habría gritado
  con el comprobante perdido de §4em.
- `verificarEco(rec, srv)` en `apiSaveAhora` para TODO guardado (chofer, contabilidad,
  retiros): las imágenes de pago y fotos que iban en el registro enviado vs lo que volvió.

**Prueba:** `tests/test_comp_perdido.js` de 8 a **12 checks**: si la planilla devuelve el
pedido sin la imagen subida → cartel «SE GUARDÓ INCOMPLETO … 1 imagen de pago» y anotación
local con el cliente; con el eco completo, ni cartel ni anotación; si vuelve sin una foto de
entrega que ya tenía → también avisa. Browser local 12/12.

En paralelo corre un agente auditando TODOS los caminos de guardado (mensajes optimistas,
pérdidas silenciosas, carreras con el refresco automático, eco del servidor) con propuesta
de pruebas de punta a punta; lo que encuentre va en §4eo.

## 4eo. Auditoría de TODOS los caminos de guardado: seis arreglos y una prueba de punta a punta (2026-09-18)

Un agente auditó los 20 caminos de guardado del panel y el servidor (informe
`auditoria-guardado.md` en el scratchpad de la sesión; base `fec8bf5`). Hallazgos por
gravedad y qué se hizo:

**A1 (alta) — una edición rechazada pisaba la fila entera.** Si el servidor rechazaba una
EDICIÓN (`busy`, día cerrado, cupos, otro), el panel hacía `STATE=STATE.filter(...)` sin
mirar `isEdit`; el formulario quedaba abierto («tocá Guardar de nuevo») y el segundo Guardar
armaba `rec` con `prev=null`: fotos vacías, sin chofer, sin marcas de stock, sin ATC, y el
servidor lo escribía. **Arreglo:** en los tres rechazos `if(prev) upsert(prev)`; y si
`isEdit && !prev` se frena con aviso «volvé a abrirlo desde Mis pedidos».
**A2 (alta) — sin respuesta salía el modal verde.** El `catch` (sin red, 404, 500, clave)
encolaba y después llamaba `after()`: «✓ Pedido guardado» y el botón de pasar la venta al
grupo, sin estar en la planilla. **Arreglo:** `afterEnCola()`: cierra el formulario, va a
Mis pedidos y abre «⏳ Quedó en cola en este dispositivo — NO está en la planilla; no lo
pases al grupo todavía» con Reintentar. Lo mismo para una respuesta rara sin `ok`.
**A3 (alta) — el `list` tardío deshacía lo recién marcado y el reintento lo revertía.**
Cada refresco reemplaza los objetos de STATE; el guardado que esperaba turno mandaba
`findById(id)` = la copia vieja. Es exactamente «revisa 2-3 veces y lo vuelve a subir».
**Arreglo:** `SAVE_ULTIMO[id]` (lo último que tocó la persona) y `SAVE_REV[id]` (último
sello); `mergePending` conserva la copia local para los ids con guardado en vuelo, en
espera o de hace <90 s y para los que están en la cola; el guardado en espera manda
`SAVE_ULTIMO` con el rev sellado. Los retiros en vuelo también se conservan.
**M1 (media) — imágenes al editar sin adelanto, y quitar.** El pegado de §4em exigía
anticipo; sin adelanto (venta pagada desde Contabilidad) la imagen nueva se tiraba, y
quitar una imagen con «la plata igual» nunca se guardaba. **Arreglo:** destino = adelanto
o, si no hay, el primer cobro; se aplican altas y bajas.
**M2 (media, `.gs` → `2026-09-18-c`) — el eco no era eco.** `doSave` devolvía el objeto
recibido; el panel comparaba lo enviado con lo enviado. **Arreglo:** se relee la fila
recién escrita (`rowToRec_`) y se devuelve eso (con `ocCambiada` si hubo).
**M5 (media) — 25+ «✓» optimistas.** `persistPedido` ahora devuelve la promesa y, si el
servidor no aceptó o no contestó, cartel rojo «⚠️ <cliente>: NO se guardó en la planilla
todavía… quedó en cola» (los rechazos firmes ya los decía `rechazoFirme`).
**M6 (media) — respuesta perdida = «lo modificó otra persona» = duplicado.** Google grababa,
la respuesta se perdía, la cola reenviaba con rev viejo → conflicto → la persona rehacía el
cambio. **Arreglo:** `mismoContenido(rec, res.pedido)` (todo salvo rev/nroDia/ts/oc/
cobradoBs): si es la misma fila, es un ok tardío: sello y silencio.

**Pendientes de la auditoría (no tocados):** M3 fotos huérfanas en Drive (`guardarFoto`
contesta ok sin vínculo; `onCompElegido` captura `p` antes del upload), M4 borrar la foto
de Drive antes de que el save/delete confirme, M7 `mergePending` resucita pedidos borrados
si otro dispositivo tenía una edición en cola (falta `error:'borrado'` en el servidor),
`doPost` sin try/catch (un 500 cae como «sin red»), y las 12 suites propuestas en §7 del
informe (se hicieron 6 en `test_guardado.js`).

**Pruebas.** `tests/test_guardado.js` (Playwright, 13 checks + sin errores JS; browser local
13/13): A1 rechazo `busy` al editar conserva fotos/chofer/marcas y el segundo Guardar entra
completo; sin copia original no guarda; A2 sin respuesta → modal «Quedó en cola», sin verde
ni WhatsApp, pedido en cola; A3 list viejo no deshace la marca en vuelo y el guardado en
espera manda entregado+chofer nuevo (2 saves, no la copia vieja); M1 sin adelanto la imagen
va al primer cobro y quitar se guarda; M5 guardado del chofer sin respuesta en rojo y en
cola; M6 conflicto con la misma fila = sin aviso, sello aplicado; conflicto real sigue
avisando. `tests/test_servidor.js` 135→**137**: el eco es la fila releída (add y update).
`test_comp_perdido.js` 12/12, `test_mixto.js` 22/22, `test_hook.js` 78/78.

**Pendiente del dueño:** publicar el `.gs` `2026-09-18-c` (Nueva versión).

## 4ep. Fotos huérfanas: aviso al abandonar, pago en curso por venta y barrido diario (2026-09-18)

El dueño: *"¿cómo solucionamos lo de las fotos huérfanas?"* (pendiente M3 de la auditoría
§4eo). La imagen sube a Drive apenas se elige y se pega al pedido al guardar: si el
formulario se abandona, el guardado se rechaza, o en Contabilidad se cambia de venta con una
imagen «lista», el archivo queda sin fila que lo nombre y la vendedora cree que está.

**Panel (`pedidos.html`).**
1. `showView` pasó a ser una guardia sobre `showViewAhora`: al salir del formulario con
   imágenes subidas y sin pegar (`imagenesSinPegar()`: FORM_COMPS+FORM_COMPS2 menos las que
   el pedido en edición ya tenía) pregunta «Tenés N imágenes subidas y el pedido SIN
   GUARDAR… ¿Salir igual?»; si sale, `descartarImagenesSinPegar()` las borra de Drive
   (`apiBorrarFoto`) y del formulario, con cartel. Después de guardar bien no pregunta
   (las imágenes ya están en el pedido). `beforeunload` frena al cerrar la pestaña con
   imágenes sin pegar (formulario o pago en curso).
2. Contabilidad: `CTA_PAGO_POR_ID` guarda el pago en curso (método, banco, imágenes) POR
   VENTA; al cambiar de venta y volver sigue ahí, con aviso «N imágenes esperando que toques
   Registrar pago». Se limpia al registrar. `onCompElegido` vuelve a resolver la venta
   (`findById(pid)`) después del upload: el refresco pudo cambiar el objeto.
3. La pestaña «Guardados rechazados / sin enviar» muestra el último barrido: cuándo, cuántos
   archivos revisó, cuántos quedaron sin pedido (con nombre legible «cliente · pedido · por
   quién» y enlace «ver»), cuántos fueron a la papelera; o que falta instalar el disparador.

**Servidor (`google-apps-script.gs` → `2026-09-18-d`).** `guardarFoto` nombra el archivo
`entrega_<cliente>__<id pedido>__por_<quien>_<fecha>` (desde el formulario, sin id).
`barrerFotosHuerfanas()` (disparador diario 3 am, `instalarDisparadores` lo instala junto al
de Kommo): junta los ids nombrados en la planilla (`%id` de los pagos y la columna de fotos,
retiros incluidos), mueve a «Fotos huérfanas MultiEspumas» los archivos de la carpeta de
fotos con más de 1 día y sin fila, manda a la papelera los de esa carpeta con más de 30 días
desde la subida, y deja `HUERFANAS_ULTIMO` (ts, revisadas, movidas, papelera, lista ≤50,
error); `action:'rechazos'` lo devuelve como `huerfanas`.

**Pruebas.** `tests/test_servidor.js` 137→**146**: con un Drive simulado (carpetas, archivos
con fecha, mover, papelera) solo la huérfana de más de un día se mueve, las usadas y la
recién subida se quedan, la de más de 30 días va a la papelera y la de 10 no, el resumen y
la propiedad, `rechazos` lo incluye, correrlo de nuevo no mueve nada, `instalarDisparadores`
deja el barrido diario, y el nombre lleva cliente/pedido/quién (desde el formulario, sin id).
`tests/test_huerfanas.js` (Playwright, 7 checks + sin errores JS; browser local 7/7): salir
pregunta y si dice NO se queda; si dice SÍ borra de Drive y saca del formulario; al editar
las que ya tenía no cuentan y una nueva sí; después de guardar bien no pregunta; el pago en
curso de Contabilidad se conserva por venta y avisa al volver. `test_guardado.js` 13/13,
`test_comp_perdido.js` 12/12.

**Pendiente del dueño:** publicar el `.gs` `2026-09-18-d` (Nueva versión) y volver a correr
`instalarDisparadores` desde el editor (instala el barrido diario; el de Kommo se reinstala
igual).

## 4eq. El efectivo que recibe el chofer: quién tiene la plata, y el retiro a Contabilidad (2026-09-18)

El dueño: *"En la lista de personas que retiran efectivo faltan los choferes. A veces le pagan a
ellos el cliente y las vendedoras hacen también una nota de ese efectivo, pero ¿cómo hacemos que
reporten que fue el chofer que recibió? ¿Agregamos «efectivo recibido del cliente» y luego
«efectivo recogido por el chofer»? ¿En dónde reportan retiro de efectivo?"*. Y el circuito, al
preguntarle: *"el chofer la recibe y entrega a Contabilidad; no la recibe ni la vendedora ni
Eduardo. Eduardo recoge [a las vendedoras] y también rinde a Contabilidad"*. Y: Giordano ya no
está en el equipo.

### Lo que pasaba
El panel no guardaba **quién recibió físicamente** un cobro en efectivo: todo se contaba como de
la vendedora de la venta. Entonces (1) el cobro que el chofer anotaba desde su ficha nacía **sin
fecha y sin nota** (no entraba en ningún cuadre por día ni por mes, y sonaba el aviso «pago sin
fecha»); (2) esa plata le quedaba «en la mano» a la vendedora, que nunca la tocó; (3) el retiro
tenía «Quién entrega» como lista cerrada de vendedoras: a un chofer no se le podía anotar nada.

### Qué se hizo (`pedidos.html`)
1. **Un dato por cobro en efectivo: `recibio`** (quién lo recibió). Viaja en el mismo texto de
   `metodoPago`, pegado a la nota después de un `>`: `Efectivo 500 @2026-09-18 #1004 >Luis
   Pierre %IMG`. **Va ahí a propósito**: un panel viejo (celular con caché) lo lee como parte de
   la nota y sigue viendo el pago; cualquier separador nuevo antes del `#` hacía que el pago
   entero desapareciera del parser viejo. `parseCobros` lo separa, `textoCobros` lo escribe,
   `limpiaNota`/`limpiaRecibio` prohíben el `>` en lo tipeado. Sin `>` = la vendedora (todo lo
   anterior). `pagoRecibio(c,p)` = en la mano de quién está.
2. **El chofer no hace nada nuevo**: `choCobrarMetodo` anota el cobro **con la fecha de hoy** y,
   si es efectivo, a su nombre (el que eligió en «Elegí tu nombre», o el asignado). QR y tarjeta
   no llevan nombre: van al banco.
3. **Contabilidad puede decirlo**: en «Registrar pago» y en «✏️ Corregir este pago», con método
   Efectivo aparece **«¿Quién recibió la plata?» · la vendedora / 🚚 El chofer** (propone al de
   la entrega, se puede elegir otro de los camiones). `CTA_PAGO.recibio` / `CTA_EDIT_R`,
   `ctaRecibioHtml`, `ctaSetRecibio`, `ctaEditRecibio`. La ficha, el detalle del Cuadre, el
   Excel («EFECTIVO EN MANO DE») y el mensaje de WhatsApp lo muestran («🚚 recibió X»).
4. **El Cuadre agrupa por quién TIENE la plata** (`cuadreEfectivo` → `{filas, fuera}`;
   `cuadreEfectivoPorVendedor` queda como envoltorio): filas de vendedoras y, marcadas
   🚚 chofer, filas de choferes con lo que recibieron y lo que se les retiró. **Con filtro por
   vendedora**, lo que de sus ventas recibió un chofer se aparta en `fuera` (no es plata que
   haya que recogerle a ella): la tabla lo dice en ámbar («Bs X lo recibió un chofer … se ve en
   Todos») y la ficha «Efectivo por retirar» lo descuenta. `choferesConocidos()` = los de los
   camiones + los que aparecen en pedidos o como `recibio` (Giordano sigue teniendo su historial).
5. **El retiro**: «Quién entrega» tiene un grupo **🚚 Choferes (rinden a Contabilidad)**, y al
   elegir uno, «Quién retira» pasa solo a **Contabilidad** (`RETIRA_CHOFER`; una vendedora vuelve
   a Eduardo; lo escrito a mano se respeta — `retEntregaCambio`). Nada más cambia: el retiro se
   guarda igual y descuenta de la mano del chofer.
6. **Giordano fuera de `VEHICULOS`** (Foton nuevo queda con Luis Eyzaguirre). `choferesParaSelect(p)`
   agrega el chofer guardado de un pedido viejo para que ese pedido no muestre «Chofer…» vacío.

Lo que NO se hizo: el panel sigue sin llevar la mano de **Eduardo** (lo que recogió a las
vendedoras y todavía no rindió a Contabilidad). Es el mismo mecanismo (un retiro de Eduardo a
Contabilidad) y se agrega cuando el dueño lo pida. Tampoco cambió «💵 Rendición por chofer» de
Administración (mide entregas, no efectivo en mano).

### Pruebas
`tests/test_chofer_efectivo.js` (**35 checks**): el formato («#1004 >Luis Pierre», sin nota,
lo viejo, varios cobros, ida y vuelta, el `>` prohibido); el cobro del chofer con fecha de hoy y
a su nombre, y su QR sin nombre; el Cuadre por quién tiene la plata (Carola 1.000, Luis 500−200,
Miguel 300, Giordano 100, Maria sin nada por el QR; primero vendedoras) y la ficha «Efectivo por
retirar» 1.700; con filtro por Carola: solo ella con 1.000, la nota «lo recibió un chofer» y la
ficha 1.000 (no 1.500); el detalle y el WhatsApp; el retiro (grupo de choferes con Giordano, sin
vendedores repetidos; Contabilidad/Eduardo solos; lo tipeado se respeta; un retiro a Miguel deja
su mano en cero); Contabilidad (la pregunta, «El chofer» propone a Cristhian sin ofrecer a
Giordano, el pago queda `#50 >Cristhian %R1`, la ficha y el WhatsApp lo dicen, con QR
desaparece, «Corregir» arranca en Miguel y vuelve a la vendedora); los camiones sin Giordano.
⚠️ En el test el doble de `apiList` toma la foto de la planilla **al resolver**, no al llamarse
(`showView` pide la lista y en el mismo tirón se anota un cobro: con la foto de antes, al
resolver pisaba el cobro), y devuelve también las filas `__ret_…`.

## 4er. Revisión de errores con cuatro agentes (19/09/2026): lo encontrado, pendiente de arreglar

Pedido del dueño (`/loop`): *"un agente para revisar contabilidad, otro entregas, otro kommo, otro
administración. busca errores"*. Cuatro revisores en paralelo, solo lectura, cada uno con scripts de
reproducción (fixtures sintéticos). Se cortaron por el límite de uso de la sesión y se retomaron
desde donde iban. CONFIRMADO = reproducido con script o suite; PLAUSIBLE = por lectura. Las líneas
son de `pedidos.html` en `6450818` salvo que se diga otro archivo. **Nada de esto está arreglado
todavía**: se arregla en el orden de abajo cuando el dueño lo pida.

### Veredicto sobre los tests rojos de `main`
- `test_borradores` (8) → **BUG REAL**: la guarda A1 de §4eo (`6295-6298`, `if(isEdit && !prev)`)
  corta `submitPedido` antes de `apiSave`, y un borrador de Kommo nunca está en `STATE` (§4ca,
  `6579`). **Desde el 18/09 ningún borrador de Kommo se puede completar** (cartel «El pedido que
  estabas editando ya no está en este dispositivo»). Contra `fec8bf5` el test da 85/0. Arreglo:
  exceptuar `borradorDe(EDIT_ID)` en la guarda (y tratar al borrador como `!isEdit` en los porteros
  de fecha/cupos del formulario, que con `prev=null` se saltean).
- `test_conflicto` (1) → **BUG REAL**: tras un rechazo firme (`rechazoFirme` `2188-2201`) el refresco
  no repone la fila del servidor porque `mergePending` (`7855`) conserva la copia local de todo id
  con `saveReciente` (`2030`, 90 s). Queda en pantalla la fecha/turno rechazados, se cuentan en los
  cupos y cualquier acción rápida los reenvía. Arreglo: borrar `SAVE_ULTIMO[id]`/`SAVE_REV[id]` en
  `rechazoFirme` antes de `refrescarEstado()` (con eso el test pasa).
- `test_producir` (6) → test viejo: los fixtures esperan la regla del 10/09 (`porDiaMes × 31`
  decimal); el código de §4ec (mediana del rango 30/60/90 d + mismo mes año pasado + tendencia,
  enteros) es coherente consigo mismo (invariantes verificados: `sem=o.fabricar`, `quin≥sem`,
  `1ª+2ª=mes`, todo entero ≥0). Reescribir expectativas. Pero ver H-Adm3.
- `test_onclicks` (1, `pdev-turno`) → test viejo: los botones llaman `segSet` inline, no hace
  falta `initSeg`. `test_atc` (4) → tests viejos (§4dz/§4ea/§4eb renombraron pasos y fichas; con
  `b2810b9` da 81/0). `test_rpt` (1) → test viejo (`stockUnicoEtq` en minúscula, `cf7c844`).

### 🔴 ALTA
- **Kommo/Entregas** · completar un borrador está bloqueado (ver arriba) · `6295-6298` · CONFIRMADO.
- **Conta** · editar el pedido desde el formulario borra el flete YA COBRADO cuando además hay un
  flete pactado sin cobrar (`submitPedido` `6426-6437`, `editPedido` `7237`): Bs que entraron
  desaparecen del Cuadre y al chofer se le manda a cobrar de más · CONFIRMADO.
- **Conta** · pago mixto «a cuenta»: «Guardar precios y montos» sin tocar nada pisa `p.acuenta` con
  solo el primer método (`aplicarMontos` `5661`, `ctaEditHtml` `5542`, `ctaGuardarPago` `5278`) y
  la próxima edición del pedido tira la parte del segundo método · CONFIRMADO.
- **Conta** · «✏️ Corregir» sobre el cobro de una venta PAGADA SIN MONTO deja saldo negativo y un
  «cobro de más» falso (`ctaGuardarPago` `5286`: objetivo congelado en 0; `ctaAnotarMonto` lo hace
  bien) · CONFIRMADO.
- **Conta** · corregir fecha/nota del ANTICIPO de una venta pagada por completo la desmarca de
  PAGADA (`5272-5280` → `11965` `p.pagado = total>0 && …` con `cobros=[]`) y el formulario ya no
  deja guardarla («poné el saldo por cobrar») · CONFIRMADO.
- **Kommo** · «Sí, es la misma» apuntando al MISMO id (pedido convertido en cola + copia del
  servidor todavía borrador) borra en la planilla la fila recién guardada (`gemeloDe` `8018-8034`,
  `borrEsLaMisma` `8244-8253`) · CONFIRMADO a nivel de función.
- **Adm** · la fila `__stock__` en vuelo la pisa cualquier `list` y la siguiente anotación borra la
  anterior del servidor (`leerCierresDeLista` `8267`, `mergePending` `7844`; `autoOcupado` `7723`
  no incluye el stock) · CONFIRMADO.
- **Adm** · recogida «dada por llegada» desde el Excel de existencias no se descuenta de Moreno: se
  cuenta dos veces (`confirmarImportExist` `14954-14956` vs `recibirStockPedido` `14106-14110`) ·
  CONFIRMADO.
- **Adm (H-Adm3)** · el plan del mes de 🏭 Qué producir cuenta a Eduardo y a los pedidos puntuales
  (`ventasPanelIndex` `13601` no excluye `stockPedidoUnico`; `13690` mete productos solo por
  historia) mientras el cartel `13735` dice lo contrario; contradice §4dj · CONFIRMADO.

### 🟡 MEDIA
- **Conta** · el arqueo no tiene la protección §4eo: un `list` en vuelo revierte lo anotado y la
  siguiente anotación manda el valor viejo (`leerCierresDeLista` `8298`) · CONFIRMADO.
- **Conta** · tras «Registrar pago», la ventana «✅ Guardado» y el WhatsApp muestran el FLETE si la
  venta tiene recargo cobrado (`showPagoWhatsapp(id, contaPagos(p).length-1)` `5779`; los envíos
  van al final) · CONFIRMADO.
- **Conta** · con filtro por vendedora, `cuadreTexto` `4350` y `exportCuadre` `4390` comparan el
  arqueo GLOBAL con un total parcial (la pantalla sí lo evita con `arqueoOn`) · CONFIRMADO.
- **Conta** · borrar un retiro no mira la respuesta del servidor (`4526`): «Retiro borrado» y vuelve
  con la próxima lista · CONFIRMADO.
- **Entregas** · la plata cobrada por el chofer aparece en Bs 0 cuando la lista vuelve del servidor:
  cinco cuentas suman `p.cobradoBs`, que no tiene columna (`10064`, `8642-8644`, `10970`, `10977`,
  `11241`); usar `totalCobrado(p)` · CONFIRMADO.
- **Entregas** · la foto de la entrega se pierde si otro dispositivo guardó ese pedido mientras
  subía (conflicto → `rechazoFirme` pisa; «Foto guardada ✓» sale antes de la respuesta)
  (`10446-10458`) · CONFIRMADO.
- **Entregas** · cambiar solo el turno de un pedido que YA está en un día cerrado: el panel dice ✓ y
  el servidor rechaza (`cambiarTurno` `15629-15647` sin `forzar`; `.gs` `916-918` → `porteroFecha_`
  mira `diaCerradoGs` aunque la fecha no cambie) · CONFIRMADO.
- **Entregas** · «Quitar la devolución» de una ATC vuelve al día del recojo sin `forzar`: si ya pasó
  o está cerrado, el servidor rechaza y la devolución sigue (`9470-9477`) · CONFIRMADO.
- **Entregas** · en «👑 Ver todos» con un nombre elegido en el desplegable, el efectivo de un pedido
  de OTRO chofer se anota como recibido por ese nombre (`choCobrarMetodo` `10588-10589`, §4eq):
  en modo todos usar `p.chofer` · CONFIRMADO.
- **Kommo** · «Descartar» no descarta: el repaso de 5 min lo vuelve a crear porque `leadYaCargado_`
  ya no encuentra fila ni marca (`.gs` `1364-1385`, `1532-1546`, `doDelete` `954-964`); guardar los
  descartados en una propiedad · CONFIRMADO.
- **Kommo** · editar desde el formulario un pedido marcado «es la misma» pierde `klead`
  (`heredarMarcas` `2765-2778` no lo copia) y el borrador vuelve · CONFIRMADO.
- **Kommo** · un `list` tardío resucita el borrador recién convertido: `leerCierresDeLista` corre
  antes de la regla de guardado reciente (`7843-7858`, `8256-8270`) · CONFIRMADO.
- **Kommo** · el repaso «ya estaba» toma el candado sin nada que escribir y `repararNombreBorrador_`
  habla con Kommo adentro (`.gs` `1447-1462`, `1511-1528`; contra §4dt) · CONFIRMADO.
- **Kommo** · el repaso de GitHub es síncrono: con 9 leads se corta a los 90 s (run 101) y hubo un
  404 (run 104); encolar como el webhook (`.gs` `1415-1421`, `traer_kommo.py:78`) · CONFIRMADO por
  registros. Y `traer_kommo.py:113-149` no distingue una respuesta de `kommoLeads` de otro
  `ok:true` (run 110 sin `ultimoHook`) · PLAUSIBLE.
- **Adm** · filas del sistema en cola (`__stock__`, retiros) se cuelan en `STATE` y se dibujan como
  pedidos (`mergePending` `7859-7874`) · CONFIRMADO.
- **Adm** · el aviso «reposiciones sin entregar» recorre todo `STATE` pero el chip y la tabla van por
  el filtro Mes: «1 sin entregar» y la tabla vacía (`8530`, `8548`, `8741`) · CONFIRMADO.
- **Adm** · 🔄 Actualizar (`loadFromServer` `8450-8467`) sin `conTopeDuro`: un `fetch` colgado deja
  «Cargando…» para siempre · CONFIRMADO (mecanismo).

### ⚪ BAJA
- **Conta** · adjuntar imagen al anticipo (o reescribir envíos) de una venta vieja «PAGADA sin
  monto» hace desaparecer el cobro sin monto y su aviso (`5352`, `5386`, fallback `11876`) ·
  CONFIRMADO. «Registrar pago» acepta fecha a futuro (`5735`; «Corregir» la rechaza) · CONFIRMADO.
- **Entregas** · sábado: «Mañana» es domingo en chofer, carga, ruta, mapa, WhatsApp y parte
  (`10017`, `8982`, `16261`, `16372`, `11048`, `10964`); falta un `proximoDiaEntrega()` · CONFIRMADO.
- **Kommo** · `busy` vacía la cola del webhook sin haber escrito (`.gs` `1352-1359`); el `busy` del
  hook queda en «Rechazos» como un `save` vacío (`384-399`); catálogo fijo `10902` (`1216`,
  `1584-1598`); `generar.py` corta el mes en UTC y no en Bolivia (`233-240`, `.timestamp()` naive) ·
  CONFIRMADO.
- **Adm** · «Hay» del plan con depósito negativo se come lo de Moreno (`13651`); el buscador de la
  tabla no saca acentos (`8584`) · CONFIRMADO.

### Revisado y quedó bien (resumen)
Ida y vuelta de `parseCobros`/`textoCobros` con todos los tokens; `aplicarCobros`/`aplicarEnvios`
releen antes de pisar; corte del Cuadre por fecha del pago; cupos (retiros, cierres, stock y
borradores no ocupan cupo en ninguno de los dos lados); día cerrado y `forzar`; chofer por nombre
sin mayúsculas; textos de WhatsApp = pantalla; mapa/ubicar; fotos con tope; webhook de Kommo
(formulario antes del JSON, clave, dedupe, `leadYaCargado_` dentro del candado); borrador con
`fecha=''`/`nroDia=0`; `traer_kommo.py` sin datos de clientes; `generar.py` paginación y
`monthrange`; Excel de Administración sin celdas corridas; chips = tabla; primera carga y getlog.

## 4es. Los arreglos de §4er, uno por uno (desde el 20/09/2026)

Pedido del dueño (`/loop`): *"Cuando tengamos tokens y disponibilidad realiza los arreglos uno a
uno desde el más grave al más sencillo, en especial lo de Kommo"*. Cada arreglo va con su test,
la batería completa y la publicación a `main`. Si el límite de uso corta el trabajo, una rutina
horaria del servidor («Retomar los arreglos si el límite los cortó») lo retoma; se borra al
terminar. Esta sección es el registro de avance: lo hecho arriba, lo que sigue abajo.

### ✅ 1. Completar un borrador de Kommo vuelve a funcionar (§4er ALTA, Kommo) — 20/09
- **Qué pasaba**: la guarda A1 de §4eo (`submitPedido`: `if(isEdit && !prev)` → «el pedido que
  estabas editando ya no está en este dispositivo») cortaba TODO borrador, porque los borradores
  no viven en `STATE` (§4ca) y `prev` es null a propósito. Desde el 18/09 ninguna venta de Kommo
  se podía completar.
- **Arreglo**: `_deBorrador` se calcula ANTES de la guarda y la guarda lo exceptúa
  (`if(isEdit && !prev && !_deBorrador)`). Y de paso lo que el revisor marcó PLAUSIBLE: con
  `prev` null, `_mueveFecha` no decía nada y el borrador se salteaba fecha mínima, domingo,
  sábado PM, día cerrado y cupos. Ahora `_nuevo = !isEdit || _deBorrador` y esos cinco porteros
  lo tratan como un pedido nuevo (que es lo que es).
- **Test**: `tests/test_borradores.js` de 85 a **88 checks**: los 8 rojos vuelven a verde sin
  tocarlos, y la sección 7b nueva prueba que un borrador con fecha domingo o en un día cerrado
  se rechaza con el cartel de siempre y sigue en la bandeja (⚠️ fechas en hora LOCAL: `dd()`
  del test usa `toISOString` y de noche corre un día).

### ✅ 2. Un rechazo firme ya no deja la copia rechazada en pantalla (§4er ALTA, Adm) — 20/09
- **Qué pasaba**: `apiSave` anota `SAVE_ULTIMO[id]` («lo último que tocó la persona», §4eo) y
  `mergePending` respeta esa copia 90 s (`saveReciente`). Tras un rechazo firme (`admin`,
  `dia_cerrado`, `cupos_llenos`, `oc_repetida`, `conflicto`), `rechazoFirme` decía «se recargó
  la planilla» pero el refresco no reponía la fila del servidor: la fecha o el turno rechazados
  quedaban a la vista, contaban en los cupos y cualquier toque rápido los reenviaba. Era el
  rojo de `test_conflicto` («vuelve a su fecha de antes»).
- **Arreglo**: en `rechazoFirme`, después de `NO_ENCOLAR`, `delete SAVE_ULTIMO[rec.id]; delete
  SAVE_REV[rec.id];` — un «no» firme es definitivo, el servidor manda. Un guardado que esperaba
  turno manda ahora la copia fresca (`findById`) en vez de la rechazada.
- **Test**: `tests/test_conflicto.js` 43/43 sin tocarlo.

### ✅ 3. «Sí, es la misma» ya no puede apuntar al mismo id (§4er ALTA, Kommo) — 20/09
- **Qué pasaba**: el pedido recién convertido está en `STATE` (guardado en cola) y el `list`
  trajo la copia vieja, todavía borrador, con el MISMO id: `gemeloDe` lo encontraba por el
  celular y la tarjeta ofrecía «Sí, es la misma»; al tocarlo, `borrEsLaMisma` hacía
  `apiDelete` de la fila que se acababa de guardar.
- **Arreglo**: `gemeloDe` saltea `p.id===b.id`; y `borrEsLaMisma` con el mismo id solo saca la
  copia de la bandeja, sin borrar nada en el servidor.

### ✅ 4. Editar un pedido ya no le borra la marca del lead (§4er MEDIA, Kommo) — 20/09
- **Qué pasaba**: `klead` vive adentro de los productos y `submitPedido` los rearma de cero;
  `heredarMarcas` copiaba solo `chk/enProd/prodEn`. Cualquier corrección del pedido perdía la
  marca y el repaso volvía a traer el borrador (y si la vendedora lo completaba, la venta
  quedaba dos veces).
- **Arreglo**: `heredarMarcas` copia `klead` (también cuando cambia la cantidad: no es una
  revisión), y `submitPedido` la rescata de `prev` si ningún renglón la trajo (`setKlead`).

### ✅ 5. Un `list` tardío ya no resucita el borrador recién convertido (§4er MEDIA, Kommo) — 20/09
- **Qué pasaba**: `leerCierresDeLista` corre antes que la regla de guardado reciente de
  `mergePending` (§4eo) y mandaba a la bandeja la fila del servidor que todavía era
  borrador: el pedido desaparecía de `STATE` hasta el próximo refresco.
- **Arreglo**: si la fila viene como borrador pero acá ya es un pedido con `saveReciente`,
  va a `resto` la copia local; pasados los 90 s, manda el servidor.
- **Tests (3, 4 y 5)**: `tests/test_borradores.js` de 88 a **95 checks** (secciones 9e, 9f y
  9g: `gemeloDe` nunca devuelve el mismo id y «es la misma» sobre sí mismo no borra nada;
  `heredarMarcas` conserva `klead` y editar cambiando el producto entero lo conserva en la
  planilla; con el guardado en curso el `list` viejo no saca el pedido de `STATE` y pasados los
  90 s vuelve a mandar el servidor).

### ✅ 6. Todo lo del `.gs` de Kommo, junto (§4er MEDIA ×2 + BAJA ×3, Kommo) — 20/09 → **§4et**
`google-apps-script.gs` `2026-09-20-a` + `SCRIPT_VERSION_ESPERADA`: descartar se respeta
(`KOMMO_DESCARTADOS`), el repaso «ya estaba» no toma el candado ni habla con Kommo adentro, el
repaso de GitHub encola y contesta al instante (`traer_kommo.py` exige `origen:'repaso'`),
`busy` no vacía la cola, el `busy` del hook no va a Rechazos, productos por `catalog_id`.
**Exige que el dueño vuelva a implementar** (Nueva versión sobre la implementación de siempre).
`tests/test_servidor.js` sección 10 (146 → 177 checks), `tests/test_traer.py` (23 → 37).

### ✅ 7. Contabilidad, los cuatro ALTA (+ uno que apareció probando) — 20/09 → **§4eu**
Flete cobrado que se borraba al editar (y el flete cobrado ENTERO que abría en «NO»), pago
mixto a cuenta que perdía el 2° método, «Corregir» un cobro sin monto con saldo negativo, y
corregir el anticipo de una venta pagada que la desmarcaba. `tests/test_conta_alta.js` (29
checks; contra el panel de `ab5e84a` da 8/21).

### ✅ 8. Administración y stock, los tres ALTA (+ dos MEDIA del mismo mecanismo) — 20/09 → **§4ev**
La fila `__stock__` (y la del arqueo) en vuelo ya no la pisa el `list`, la fila del sistema en
cola no se dibuja como pedido, la recogida cerrada desde el Excel se descuenta de Moreno, y el
plan del mes de «Qué producir» deja afuera a Eduardo, los puntuales y las reposiciones.
`tests/test_adm_alta.js` (18 checks; contra el panel de `b632321` da 9/9).

### ✅ 9a. Los MEDIA y BAJA del panel, juntos (13 hallazgos) — 20/09 → **§4ew**
Entregas: la plata del chofer en Bs 0 desde otra compu, «Ver todos» y la mano equivocada, la
foto perdida por conflicto, el turno en día cerrado y «Quitar la devolución» con `forzar`.
Contabilidad: la ventana tras el pago mostraba el flete, cuadre filtrado vs. arqueo global,
borrar un retiro sin mirar la respuesta, fecha a futuro en «Registrar pago». Administración:
🔄 Actualizar con tope, el aviso de reposiciones vs. el filtro Mes, «Hay» negativo, buscador
sin acentos. `tests/test_medias.js` (23 checks; contra el panel de `1e1d4ce` da 3/20). Y
`generar.py` (el dashboard) corta el mes en hora de Bolivia, no en UTC (Kommo BAJA).

### ✅ 9b. Sábado: «mañana» es el lunes — 20/09 → **§4ex**
`proximoDiaEntrega()` en 25 lugares de entrega (chofer, Mis pedidos, carga, ruta, mapa,
faltantes, parte, WhatsApp, Excel, reprogramar, ATC, revisión de stock, estadísticas); el
formulario, el cierre de días, la recogida de Moreno y el importador de ROHO siguen con
`tomorrowStr()`. `tests/test_sabado.js` (14 checks, reloj clavado; contra `750229c` da 5/9).

### ✅ 9c. Los tests viejos, al día — 20/09
`test_producir` (56/56: la regla de §4ec/§4ds, enteros y rango), `test_onclicks` (5/5: acepta
`segSet(\'id\'` inline), `test_atc` (81/81: §4eb «listo en fábrica» opcional, ficha «Listas»
solo si hay, «Recogido de fábrica», y limpiar `dev` antes de probar la caja escondida),
`test_rpt` (109/109: «reposición de tienda» en minúscula). **La batería queda en 0 rojos.**

### Lo que sigue
Nada de §4er queda pendiente salvo lo anotado a propósito: BAJA 9 de Contabilidad (el
fallback de `cobrosDe`, §4eu) y el «mes sin ventas = sin dato» del plan (§4ev), los dos a
decisión del dueño. El `.gs` `2026-09-20-a` sigue esperando que el dueño lo implemente (§4et).

## 4ge. 26/09: Banzer es un depósito del que salen camiones (2026-09-26)

**El pedido del dueño.** *«Salen camiones de la banzer y de productos terminados fábrica; solo de moreno hay que ir a
traer»*. Respuestas:
- a Banzer el camión va «depende del día»: a veces pasa el mismo, a veces sale otro;
- la lista de carga va separada, «Cargar en fábrica» y «Cargar en Banzer»;
- el orden del reparto no cambia: acá → Banzer → IM (21/09).

**Qué estaba mal.** El panel trataba a Banzer como a Moreno. Mandaba a «📥 recoger de Banzer», descontaba de ACÁ lo que
salía de Banzer, y Banzer no bajaba nunca: dos errores de cuenta a la vez.

**Cómo se hizo.**
- Un primer agente armó la capa de marcas y la prueba; lo cortó el reinicio de la sesión (15:35 UTC) y no se pudo
  reanudar. Su trabajo quedó en el scratchpad (`banzer_parcial/`).
- Un segundo agente siguió desde ahí. El límite de uso de la cuenta lo cortó a mitad de camino; se retomó a las 16:40
  UTC, apenas se reinició.
- Squash en la rama: `09691ad`. Las reglas que hay que respetar están en CLAUDE.md, «🚚 Banzer, depósito del que
  salen camiones».

**Pruebas.**
- `tests/test_banzer_salida.js`: 77 comprobaciones, 62 fallan contra el panel publicado (`e2e613a`).
- Dos pruebas viejas cambiadas a conciencia:
  - `test_banzer.js` afirmaba Banzer como recogida. Arranca con la configuración de antes, porque cuida la mecánica de
    varios almacenes de ir a buscar, que sigue existiendo.
  - `test_rev_stock.js` §3 usa otro almacén de ir a buscar.
- `test_rev3_stock` §4e destapó un caso: una «📥 Banzer» vieja sin Excel de Banzer vuelve a esperar la recogida en
  camino. Se arregló en el panel, no en la prueba.

**Lo que decidió el dueño (26/09, 17:14, con las capturas a la vista).**
- Una «📥 Banzer» de fecha pasada se da por salida, como cualquier ✔. Antes seguía comprometida.
- Nunca se trae mercadería de Banzer a fábrica: sin recogidas desde Banzer.
- El bloque «Cargar en Banzer» bajo el camión de cada pedido «alcanza por ahora». Asignar otro camión a Banzer queda
  para cuando lo pida.
- Publicar ahora, con F5 de todos.

**Publicado el 26/09 a las 17:15 de Bolivia**: `main` = `39b833c` (merge `--no-ff` de `1ead5fb` sobre el `307b37c` del
robot), Pages 1524 en verde, `pedidos.html`, `productos-mes.js` y el `.gs` idénticos a la rama. El servidor no cambia.

**Al publicar, todos F5.** Una página vieja lee «✔ Banzer» como «✔ acá», y al corregir el pedido pierde el lugar.

## 4gd. 26/09: la revisión de Codex — cinco hallazgos, el sello de los días cerrados (.gs 2026-09-26-a) y Banzer (2026-09-26)

**El servidor, desde la PC.** El dueño hizo el procedimiento de §7 sobre la 23-b:
- anotó la versión activa: «Versión 30 del 21 sept 2026, 9:41 a.m.», la 20-a, que es la de volver atrás;
- pegó la 23-b del enlace fijo `14dec98…`;
- `probarAntesDeImplementar` dio todo ✅. El stock ocupa **20.932 de 50.000 letras (42 %)** y el arqueo, 0. El
  tamaño de la celda quedó medido: no apura.
- implementó alrededor de las 10:30, y el panel dice «Conectado».

Falta su captura de la versión (🔒 Cerrar día) y la del repaso de Kommo. Desde acá no se puede correr el workflow de
Actions (403): la versión la tiene que mirar él.

**La revisión de Codex** (pegada por el dueño) reprodujo cinco problemas con las funciones reales y pidió
priorizar tres pendientes. Los cinco quedaron con una prueba que falla antes y pasa después.

1. **ALTA · Un cobro perdido no avisaba.** `rechazoPerdido` comparaba «método + monto»: con dos «Efectivo 100»
   de días distintos acá y uno en la planilla, el segundo se daba por guardado.
   - Ahora compara cobro por cobro, con clave método|monto|fecha|quién recibió. Cada cobro de la planilla vale por
     UNO de acá.
   - Un cobro no tiene id en `metodoPago`; ponérselo cambiaría el formato. Si Contabilidad le cambió la fecha,
     avisa de más: mejor eso que callar.
   - `test_codex26.js` §1.
2. **ALTA · El ✅ reaplicado marcaba el viaje equivocado.** Si logística pasaba el pedido al 02/10 mientras el
   ✅ de hoy chocaba, `choEntregado` lo reaplicaba sobre la fila nueva.
   - Ahora solo reaplica sobre el MISMO viaje: el día, y en una ATC `atcViajeDevolucion` (recojo o devolución).
   - Si cambió, no marca. Se lo dice al chofer con un aviso y en su cartel (`perdio.movido`: «lo pasó al
     02/10… avisale a logística»).
   - `test_codex26.js` §2.
3. **ALTA · Dos computadoras perdían un día cerrado (o una tilde de la carga).** Releer antes de escribir (§4gb,
   §4gc) achicaba la carrera pero no la cerraba. Codex tenía razón: se resuelve en el servidor.
   - **Panel:** manda el sello con el que leyó (`REESCRITA_REV`, `reescritaConSello`) y `juntar`. Ante un
     `conflicto`, `reescritaJuntarYGuardar` aplica sobre la fila del servidor SOLO lo tocado acá y reguarda,
     hasta 4 veces.
   - **Servidor `2026-09-26-a`:** `SISTEMA_JUNTA_OPCIONAL` (`__dias_cerrados__`, `__carga_chk__`) compara el
     sello bajo el candado cuando llega `juntar`. El choque no se anota en «Rechazos».
   - **Un panel sin `juntar` no se traba:** no hay `actualizar`, a diferencia del stock.
   - **Con la 23-b todo sigue como antes:** el sello de estas filas no se mira.
   - Pruebas: `test_codex26_cierres.js` (dos navegadores con el `.gs` real). Da 5 rojos con la página publicada y
     4 con la 23-b. `test_servidor.js` §14 da 4 rojos con la 23-b.
4. **MEDIA · El aviso del chofer se vencía a las 48 h.** Además:
   - lo veía cualquier chofer del mismo celular;
   - «Ya lo revisé» lo marcaba para todos;
   - el tope de 20 rechazos lo podía tirar.

   Ahora:
   - dura hasta «Ya lo revisé» y es de cada chofer (`rec.chofer`, `choRechazosDe`);
   - en «👑 Ver todos» se ven todos, con el nombre;
   - al recortar, lo no revisado se guarda aparte (hasta 30).

   `test_codex26.js` §4.
5. **MEDIA · Un monto mal escrito valía otro número.** «−1500» (el menos de Unicode) y «Bs -1500» valían 1500,
   «1e3» valía 13, «12abc» valía 12 y «.50» valía 50.
   - `montoError(t)` mira el texto ENTERO antes de `parseMonto`. `montoNegativo` reconoce los ocho signos menos.
     `montoFrena` y `montoAviso` hacen el freno.
   - Frena en los seis campos del formulario, en Registrar pago, Corregir este pago, el flete, Corregir precios y
     montos (el precio negativo ya no se borra callado), Anotar el monto, el arqueo, el retiro y el cobro del
     chofer.
   - Lo que el panel propone va con `r2`.
   - `parseMonto` no cambió para lo limpio.
   - `test_rev4_montos.js`: 136 comprobaciones, 111 rojos contra `64fe617`.

**Las prioridades de Codex** (`test_rev4_atc_flete.js`: 57 comprobaciones, 41 rojos contra `64fe617`):
- **ATC:** mover una devolución YA entregada (📅, turno de la ficha de carga, ✏️) mide `antes` con
  `atcViajeDevolucion`. Se la lleva con su `pdev`, y destildar la reabre. Esto corrige la regla de §4ga/§4gc que
  decía `atcEnDevolucion`.
- **Flete:** «Entregado» y el Parte del día (pantalla y WhatsApp) dicen el flete pactado sin cobrar, aparte de
  la venta.
- **«Ya cobré el flete»** (`cobrarFlete`) guarda por venta el pago en curso de la anterior.
- **`textoCargaChk`** poda las tildes viejas sin fecha.
- **El aviso de pagos sin fecha** dice la verdad en Día, Mes y Todo.

**Además, del día:**
- **La hora del corte de existencias** sale del nombre con la fecha entre guiones
  («Excel_26-09-2026_10_30_36_BANZER.xlsx») o del pie del reporte («Fecha : 26/09/2026 10:30:33»,
  `existHoraDePie`).
- **El diálogo de existencias** ya no dice «Otro (la fábrica)». Con ese texto el dueño casi eligió «el de
  logística» para Banzer, y ese es el ÚNICO depósito de fábrica (`STOCK.c`), así que lo habría reemplazado.
  Ahora se pregunta antes de hacer depósito de fábrica a otro almacén.
- **El Excel de Banzer del 26/09** se probó en el scratchpad con el lector del panel, nunca en el repo:
  - 81 productos y 309 unidades;
  - 75 del catálogo;
  - 6 con código que el catálogo no conoce: CH1231, CH1050, CH2522, CA1033, CH20532 y CH1158. Se le ofreció al
    dueño agregarlos.

**🚚 Banzer es depósito de salida (dueño, 26/09).** Dijo: *«salen camiones de la banzer y de productos terminados
fábrica; solo de moreno hay que ir a traer»*. Hoy el panel lo trata como Moreno: «📥 recoger de Banzer»,
recogidas, y lo entregado desde Banzer se descuenta de ACÁ. Son dos errores de cuenta.

Respuestas del dueño:
- la carga de Banzer «depende del día»: a veces el mismo camión pasa por Banzer y a veces sale otro;
- la lista de carga va SEPARADA: «Cargar en fábrica» y «Cargar en Banzer».

Un agente lo está haciendo: rol de almacén `'sale'`, «✔ hay en Banzer», cuentas por depósito y carga en dos
bloques. Mientras tanto, Banzer se sube como «Otro», que conserva los dos conteos.

**Batería sobre `f70311e`: 99 suites, 3.696 bien · 0 mal.**

**Quedan:**
- los WhatsApp «CIERRE DEL DÍA» y «PEDIDOS DE MAÑANA» (`envioTexto`/`envioPedido`) no nombran el flete pactado
  (confirmado);
- mover un pedido entregado sin destildarlo deja el ✅ en el día viejo;
- «150 200» se acepta como 150.200 (el espacio es separador de miles);
- «Bs.- 1500» cuenta como negativo.

**Publicación (26/09).** El dueño eligió «Codex ya, Banzer después»: esto sale solo, y Banzer va en otra
publicación con otro F5.
- **Página:** `main` = `e2e613a` (merge `--no-ff` de `ea81bb0`, código = `f70311e`), a las **11:27 de Bolivia**.
  Pages 1522 en verde. `pedidos.html`, `productos-mes.js` y el `.gs` idénticos a la rama.
- **Servidor `2026-09-26-a`:** implementado por el dueño alrededor de las **11:35**, con el procedimiento de siempre
  (enlace raw fijo a `ea81bb0…`, 1965 líneas).
  - `probarAntesDeImplementar` a las 11:29, todo ✅: código entero (18 funciones clave), 1003 filas, disparadores
    instalados, repaso de Kommo de hace 1 minuto sin errores.
  - Stock en **22.208 de 50.000 letras (44 %)**; a las 10:15 eran 20.932. Arqueo en 0.
  - El cuadro de 🔒 Cerrar día dice «El candado está en el servidor (versión 2026-09-26-a)», sin la línea gris.
- **Volver atrás:** ✏️ a la versión de la 23-b de esa mañana (descripción `2026-09-23-b`; el dueño no pasó el
  número todavía) Y pegar la 23-b de `14dec98…` (1956 líneas).
- **Desde ahora rige** la protección entre dos equipos del stock y el arqueo (23-b) y también la de los días
  cerrados y las tildes de la carga (26-a).

## 4gc. 26/09: la tercera vuelta — lo que rompieron los arreglos, y los pendientes sin decisión del dueño (2026-09-26)

Pedido del dueño (26/09, 07:45, con §4gb terminado y sin publicar): *«Quedan pendientes subidas las correcciones
del servidor. Pero ¿y lo demás? No deberá haber más errores»*. Seis agentes desde las 08:17:
- dos buscaron **regresiones** de los 37 arreglos de §4gb: uno en la plata y otro en entregas, ATC,
  Administración, Mis pedidos y Stock;
- cuatro arreglaron lo que §4gb dejó **reportado** y no espera al dueño: Administración + hoja de ruta, ATC +
  Mis pedidos, Contabilidad + Cuadre, y Stock.

El dueño eligió publicar todo junto, con un solo F5. Se publicó el 26/09 a las **10:11 de Bolivia**: `main` =
`a8e3c5e`, merge de `8de15f9`, con el servidor `2026-09-20-a` todavía implementado. Batería: **95 suites, 3.454
bien · 0 mal**. Las pruebas nuevas son `tests/test_rev3_{plata,entregas,atc_mis,admin,conta,stock}.js`, y cada
una falla contra `3da79ab`.

### Regresiones que habían metido los arreglos de §4gb (arregladas)
- **ALTA — «Bs. 1.500.-» pegado de WhatsApp se guardaba como Bs 0,10** (`test_rev3_plata` §1).
  - Qué pasaba: con los campos de plata como texto (§4gb), `parseMonto` tomaba el punto de «Bs.» y el «.-» como
    parte del número. «1.500 Bs.» valía 1,50 y «Bs. 1500», 0,15, sin aviso. Con `type=number` ese texto dejaba
    el campo vacío y frenaba.
  - Arreglo: `parseMonto` ignora los separadores de las puntas. Con separadores repetidos, el último es el de
    los centavos: «1.500.50» y «1,500,50» valen 1.500,50.
  - ⚠️ «.50» ahora vale 50. Nadie anota medio boliviano así; «0,50» sigue valiendo 0,5.
- **MEDIA — el ✅ reintentado borraba el aviso del cobro perdido** (`test_rev3_entregas` §1-2).
  - Qué pasaba: `03ecb0b` borraba el rechazo ENTERO que había anotado `3f88ede`, también «💵 el cobro: volvé a
    anotarlo».
  - Arreglo: `rechazoResuelto(id, t0, que)` saca solo lo que el reintento volvió a poner (el ✅ o esa foto).
    Además, la foto que entra al segundo intento ya no pide «volvé a subirla».
- **MEDIA, solo en la transición — la recepción `nr` con la página publicada** (`test_rev3_entregas` §3, que
  monta `394f74c` desde git).
  - Qué pasaba: la página vieja no conoce `nr`. La restaba con piso 0 y anotaba las unidades enteras en `rs`;
    al guardar, la nueva se las devolvía y Moreno quedaba con colchones fantasma.
  - Arreglo: la `nr` va en `g[de].rs` como marca de 0 unidades (`nr:1`). ⚠️ **No sacar esa marca**: es lo que
    frena a una página vieja.
- **MEDIA — con «A cuenta» vuelto a 0 y la foto ya subida, no se podía guardar** (`test_rev3_plata` §3).
  - Qué pasaba: el freno pedía «quitá la imagen» con la imagen escondida.
  - Arreglo: el freno muestra la tira de imágenes con su ✕ (`renderCompForm(true)`).
- **MEDIA — cancelar «¿borrar el pago?» dejaba el 0 en «A cuenta»** (mío, `test_noborra`, 4 rojos contra `13bd857`).
  - Qué pasaba: `test_noborra` salió 32/3 en la batería del conjunto. El aviso dice «cancelá y tocá únicamente el
    precio», pero el campo seguía con el 0, y desde `ctaMontosRecordar` (abajo) lo tipeado sobrevivía al
    repintado: guardar el precio volvía a preguntar, y con «Aceptar» se borraba el pago.
  - Arreglo: cancelar repone lo guardado (`data-def`) y lo dice.

### Pendientes de §4gb, arreglados
**Hoja de ruta, carga y Administración** (`test_rev3_admin`, 48)
- **Hoja de ruta con el flete pactado**:
  - `cobroRutaTxt` devuelve `f`, con las palabras de la tarjeta del chofer;
  - la venta pagada con flete dice «✅ LA VENTA YA ESTÁ PAGADA», y la cabecera y el WhatsApp suman el flete aparte;
  - dos agentes lo hicieron: quedó este y se revirtió el otro (`1c35845`);
  - ⚠️ «Entregado» y el Parte del día tampoco lo nombran (abajo).
- **Tildes de la Lista de carga, y cierres o tildes hechos sin señal** — el mismo mecanismo que Cerrar día (§4gb):
  - `CARGA_CAMBIOS` + relectura con tope de 15 s;
  - `REESCRITAS` define cómo se rearman las dos filas que se reescriben enteras (`__dias_cerrados__` y
    `__carga_chk__`);
  - a la cola van con `_cambios` adentro, que no viaja a la planilla, y `flushPending` las rearma con la planilla
    del momento (`mandarReescritaDeCola`);
  - sin lectura no se mandan: quedan para el próximo intento;
  - las demás filas de la cola no cambian, y ⚠️ **nunca `setPending(remaining)`** (§4ga);
  - una fila de cierre o de carga de un panel viejo (sin `_cambios`) se sigue mandando tal cual: solo pasa en la
    transición.
- Los chips 🌅 AM / 🌆 PM cuentan como el cupo: `normTurno`, y lo que no tiene fecha no entra.
- «Todos» de carga y ruta ya no muestra las ventas de tienda (`esVentaTienda`).
- El 💰✓ pregunta, con nombre y monto, antes de deshacer un cobro que recibió el chofer (`>Nombre`). Lo que se
  deshace no cambia (`cobroDeLaPuerta`).

**ATC y Mis pedidos** (`test_rev3_atc_mis`, 38)
- «↺ Quitar la devolución» vuelve al recojo con su turno y borra `rec`:
  - `rturno` va dentro del JSON de la ATC;
  - si ese turno está lleno, va con `forzar` (el recojo ya se hizo, como el día pasado o cerrado de §4ew);
  - ⚠️ `rec` vale solo mientras hay `pdev` (`atcRecogida`/`atcFueRecogida`).
- `atcViajeDevolucion(p)` mira `pdev===p.fecha` en crudo: el chip y el WhatsApp de una devolución YA entregada
  siguen diciendo «🔁 ATC · devolución». Los caminos que MUEVEN la devolución siguen con `atcEnDevolucion`.
- Un borrador de Kommo completado desde Administración vuelve a Administración.
- `autoAbrirAvisos` usa `normNombre`: «Chávez» y «Chavez» son la misma clave, y sin tildes es la de antes.
- `enColaLocal(id)`: la ficha dice «⏳ sin enviar» y la ventana, «no lo pases al grupo todavía».

**Contabilidad y Cuadre** (`test_rev3_conta`, 42)
- «Corregir precios y montos» recuerda lo tipeado (`ctaMontosRecordar`): solo lo que difiere de `data-def`. Si
  abajo cambió lo guardado, queda lo guardado y sale un aviso ámbar.
- `tsFmt` va en hora de Bolivia (ts − 4 h, como `isoDeTsBolivia`). Lo ven «Ingresado», los Excel, la ficha de
  Administración y el historial del stock.
- «Anotar el monto» frena el signo menos.
- El pago en curso de un flete vuelve como flete (`CTA_PAGO.tipo`).
- Cuadre:
  - fila TOTAL del efectivo en el Excel;
  - `cuadrePagos` deja afuera los pagos de monto 0, así que la «PAGADA sin monto» ya no sale con Bs 0 en «Todo»;
  - `cuadreAlertas` ya no junta dos pagos sin fecha iguales;
  - con Tab entre campos del arqueo, el foco ya no se pierde: se guarda enseguida y se repinta un instante
    después, y `renderCuadre` devuelve el foco. ⚠️ No volver a repintar dentro del `change`.

**Stock** (`test_rev3_stock`, 36)
- `stockEntradaVale` corta por hora cuando hay hora de los dos lados.
  - Qué pasaba: con el Excel de la tarde que «ya incluye las entregas» (`c.inc`), una llegada anotada DESPUÉS de
    subirlo no sumaba y `filaStock` la podaba.
  - La entrada que sale de una recepción lleva la hora de esa recepción.
- Con «solo las líneas sin marcar» destildada, una línea 📥 toma primero lo pendiente de su recogida programada
  (`recogidasPor`). Con la casilla marcada no cambia nada.
- Los «✗ no hay» de días pasados van a su grupo del detalle. La cuenta (`comp`) no cambia.
- «🏭 Pedí a fábrica» y «📥 Llegó» tienen buscador sobre la tabla y el catálogo entero (sin lo de tienda; para
  fabricar, sin los descontinuados). Antes, «🚨 PEDIR YA» desde el renglón 61 en adelante abría otro producto.

### Quedan (sin tocar)
**Confirmados, de bajo impacto:**
- Mover con 📅, con el turno o con ✏️ una devolución YA entregada deja `pdev` en el día viejo. Arreglo posible:
  `atcViajeDevolucion` en el `antes` de `atcSeguirViaje`.
- `choRechazosHtml` no mira qué chofer está elegido: en un celular compartido, uno ve lo perdido del otro.
- «Entregado» y el Parte del día no nombran el flete pactado sin cobrar.
- `cobrarFlete`, desde Mis pedidos, reemplaza el pago en curso sin guardarlo por venta.
- Aceptan un monto negativo como positivo:
  - `choCobrarMetodo` («-1500»);
  - el retiro y el arqueo («-500»);
  - `montoNegativo` no ve «Bs. -500»;
  - un precio negativo en «Corregir precios y montos» se borra en silencio.
- `textoCargaChk` no borra las tildes viejas de ventas de tienda.
- La revisión del stock con la casilla marcada: el botón «🚚 Programar la recogida» de la misma revisión deja la
  línea en ✗ al volver.
- La nota `noHayViejo` de la tabla no sale nunca (`test_stock` la fija en 0).

**Plausibles:**
- Cerrar día con `busy`.
- El aviso rojo de más con la foto.
- Una llegada anotada después de subir el Excel pero que entró antes se cuenta dos veces (la regla por hora de
  §4fz-b).
- «↺ Borrar lo anotado» del arqueo puede pedir dos clics.

**Esperan al dueño:** RESPUESTA §13.4 y §13.5.

## 4gb. 26/09: un agente por PESTAÑA — 35 arreglos, la coma de la plata y el chofer sin señal (2026-09-26)

Pedido del dueño (25/09 a la noche, con la página nueva ya publicada): *«¿No hay errores? ¿Después de estas
correcciones? Pon 1 agente por cada pestaña a revisar. Debe quedar perfecto»*.

Ocho agentes, uno por pestaña: ＋ Nuevo pedido · 📋 Mis pedidos · 🚚 Chofer · 🧾 Contabilidad (Ventas y
Mayoristas) · 🧮 Cuadre · 🎧 ATC · 🔒 Administración · 📦 Stock (la pantalla entera que sale de Administración).
Misma consigna que §4ga, con la copia llevada a la rama primero (`git reset --hard origin/<rama>`). El
contenedor se reinició con los ocho terminados: las copias (`.claude/worktrees/`) y los informes sobrevivieron.
Revisé cada diff, junté 35 commits (uno salteado, abajo) y la batería quedó en **89 suites, 3.254 bien · 0 mal**.
Cada prueba nueva (`tests/test_rev2_*.js`) falla contra la página publicada (`cb99ab3`): 13 a 25 rojos cada una.

### Lo que arreglaron (lo más importante)
- **Formulario** (`test_rev2_form`, 29): `montoForm` = `parseMonto` en TODAS las lecturas de plata del formulario
  (A cuenta, Saldo, Monto cobrado, 2° método, flete, precio c/u, «Los ítems suman», «Usar como total»):
  «1.500» se guardaba 1,50. Lo que el panel escribe en esos campos va con `r2`. Un signo menos en un campo a la
  vista FRENA (antes: «A cuenta −500» en la planilla, y un flete «−50» borraba el pactado). `cantidadesMal()`:
  la cantidad es un entero ≥1 (0/vacía se guardaba 1, 2,5 → 2, −2 → −2), como `rohoCant`. Banco, comprobante y
  2° método se piden solo si hay pago (`_hayPago`): un método elegido y después sin pago TRABABA el guardado;
  al pasar a ATC/RPT, `pintarDocTipo` limpia también el método, el mixto y las imágenes recién subidas.
- **Mis pedidos** (`test_rev2_mis`, 39): la ficha usa `cobrosResumen` (imprimía el historial crudo con IDs de
  imágenes), `noSeCobra` y `badgeSinMonto`; el WhatsApp del pedido ya no dice «💰 PAGADO» a una venta sin monto
  ni a una ATC (`plataLineaWa`) y nombra el flete pactado que se cobra en la puerta; la lista ordena por
  `fechaSalida` (la venta de tienda caía al fondo y con el tope de 120 no se veía nunca; ahora «Ver más» con
  `MIS_TOPE`); completar un borrador de Kommo abre «Pedido guardado» con el WhatsApp; «Reintentar ahora» dice si
  llegó.
- **Chofer** (`test_rev2_chofer`, 28): desmarcar ✅ PREGUNTA (un doble toque desmarcaba la entrega); el ✅ que
  choca con la copia vieja se vuelve a aplicar UNA vez sobre la fila del servidor (como la foto, §4ew; la plata
  no); el flete pactado aparece en la tarjeta («cobrar también el flete… avisale a la vendedora, que lo
  registra» — el chofer NO lo anota, §4ah/§4ai); el botón de la foto legible a 320 px.
- **Ventas** (`test_rev2_ventas`, 20): «✏️ Corregir este pago» perdía fecha, monto y recibo al elegir el método
  (`ctaEditMetodo`/`ctaEditBanco` sin `ctaEditRecordar`); una venta SIN MONTO ANOTADO mandaba el pago al flete
  (regresión de `CTA_FORM_ENV`, §4ga: ahora tiene el selector y arranca en «💵 Pago», que pide el total
  primero); Productos del mes contaba una «PAGADA sin monto» como Bs 0 conocido (`?v=20260926a`).
- **Cuadre** (`test_rev2_cuadre`, 55): el arqueo y el retiro son texto con `inputmode="decimal"` (con
  `type=number` Chromium tira la coma: «1.500,50» valía 1,50 y «1500,50», 150.050); un retiro corregido en la
  cola ya no vuelve al monto viejo y uno borrado no reaparece (`mergePending`, `borrarRetiro`); el Excel baja
  con solo retiros y lleva el nombre de la vendedora; «N de M formas» cuenta el arqueo sin pagos; Contabilidad
  no se corre de costado a 360/320 px; el refresco no se lleva el arqueo que se tipea (`autoOcupado`).
- **ATC** (`test_rev2_atc`, 35): cerrar o reabrir desde «📦 Anotar avance» mueve el ✅ de la devolución
  (`atcEntregadoComoEnt`); el comodín llega a la ficha del chofer, la carga, la hoja de ruta y el grupo
  (`atcComodinAviso` en `atcChip`); programar la devolución el mismo día del recojo pregunta si ya lo
  recogieron (el recojo desaparecía del camión de hoy); «📋 Copiar» con encabezado y dos columnas al final.
- **Administración** (`test_rev2_admin`, 22): **Cerrar día relee la planilla antes de reescribir**
  `__dias_cerrados__` y aplica solo lo tocado acá (`CIERRES_CAMBIOS`): con dos computadoras, un día cerrado se
  reabría solo y el servidor dejaba entrar pedidos a un camión armado; el Parte del día sin ATC/RPT en «por
  cobrar»; el cupo del sábado dice cuántos se forzaron de más.
- **Stock** (`test_rev2_stock`, 22): «📋 Conté a mano» arranca cada renglón con lo calculado para HOY (no con el
  corte viejo), conserva `c.cod` (si no, el CH1297 volvía a sumarse al SOMIER NEGRO, deshaciendo §4ga) y lo
  contado fuera de la lista de 60; una recogida que el Excel de Moreno del día ya no tiene se puede dar por
  llegada (recepción `nr`: suma acá y no resta del origen; va dentro de `q.recs`, así que `stockFusionar` no
  cambia); el detalle cuenta un depósito negativo como 0 como la tabla; el historial compara con el anterior
  del MISMO almacén.

### Lo que hice yo al juntar
- **Salteado `37f4a1b`** (chofer, comodín en la tarjeta): el agente de ATC hizo lo mismo por `atcChip` y en más
  lugares; los dos juntos lo mostraban dos veces.
- **Un choque** en `pedidoText` (WhatsApp): quedaron los dos cambios (`noSeCobra` de ATC + la línea del flete de
  Mis pedidos). `test_rev2_mis` acepta «No se cobra» con cualquier mayúscula.
- **La coma en los otros doce campos de plata** (lo reportó el del Cuadre): A cuenta, Saldo, Monto cobrado,
  flete, 2° método y precio c/u del formulario; Registrar pago, Corregir este pago, el flete y Corregir precios
  y montos de Contabilidad → texto con `inputmode="decimal"` (todos ya se leían con `parseMonto`/`montoForm`).
  Los de cantidades del stock siguen numéricos (enteros). `tests/test_montos_texto.js` (9, tipeando).
- **El chofer sin señal se entera de lo que no entró** (el ALTA que el del Chofer dejó reportado): sin señal, el
  ✅ y el cobro quedan en la cola; si otra persona toca el pedido, al volver la señal gana su fila y lo del
  chofer se iba sin aviso (el rechazo quedaba en Mis pedidos, que el chofer no mira). `rechazoRecordar` anota
  `perdio` (`rechazoPerdido`: ✅, cobros de la puerta, fotos) y `choRechazosHtml` lo muestra arriba de la
  pestaña Chofer hasta «Ya lo revisé». ⚠️ **No se reaplica solo, a propósito**: sin la versión de antes, un ✅
  «de más» puede ser una copia vieja y un cobro, uno que Contabilidad ya anotó. `tests/test_chofer_sin_senal.js` (8).

### Quedan para decidir (confirmados, sin tocar)
- El cuadro «Qué producir» puede decir «producir 3» en un producto que la tabla marca «🚚 Ya pedido» o «📦 Pedido
  único» (dos verdades; decide el dueño).
- Las tildes de la Lista de carga tienen el mismo defecto que tenían los días cerrados (dos cargadores a la vez).
- `quitarProgramarDevAtc` pierde el turno del recojo; «Productos más entregados» cuenta ATC; las métricas «Hoy»
  y «Este mes» de Mis pedidos cuentan por fecha de ENTREGA aunque digan «cargados».
- Del servidor (exigen republicar): completar un borrador de Kommo cuya OC choca contesta `oc_repetida` en vez
  de renumerar (`foundRow` ya existe); `ocAutoGs_` sin RPT (§4ga).

## 4ga. 25/09: pruebas que se pudrían a fin de mes, agosto «entregado» y la revisión con cuatro agentes que arreglan (2026-09-25)

Pedido del dueño: *«Revisa que no haya más errores y cosas que corregir. Pon el agente a trabajar. Y marca
todos los pedidos de agosto entregado por si logística olvidó hacerlo»*, y después: *«Si no puedes, sigue
con los agentes revisando y corrigiendo la contabilidad, conciliación, entregas, stock, predicción de
producción y pedidos y demás»*.

### Cinco pruebas que se pudrían a fin de mes (no eran errores del panel)

- `test_botones` §8b, `test_chofer` §7 y `test_resumen`: arman pedidos para mañana o pasado mañana y miran
  Administración en «Mes». Los días 29 y 30 esos pedidos ya son del mes que viene y la tabla quedaba vacía
  («0 pedidos»). Ahora miran en «Todo».
- `test_cuadre`: pedía que «Mes» muestre MÁS pagos que «Día». El 1° del mes el cobro de «ayer» es del mes
  pasado y los dos dan lo mismo: ese día se pide «no menos» (que abra en «Mes» lo mide el primer chequeo).
- `test_ventas_panel` §9: el «60 d» del plan promedia los DOS meses cerrados anteriores, y la prueba tenía
  la venta clavada en agosto — desde octubre ya no caía en la ventana («sin fila en el plan»). Ahora la venta
  corregida va al mes pasado y otra, sin entregar, al anterior, relativo a hoy (la sin entregar además
  asegura la fila del plan aunque el histórico no tenga ese producto el mismo mes del año pasado).
- Verificadas con el reloj corrido (libfaketime) al 25, 26, 29 y 30/09, 1 y 5/10, 10/11 y 15/01.
- ⚠️ **Regla para pruebas nuevas**: una prueba que arma pedidos «para mañana» y mira un filtro de MES se
  pudre los últimos días del mes. Mirar en «Todo» o clavar el reloj (`page.clock.setFixedTime`).

### Agosto «entregado»: un archivo APARTE para el editor (no lo pude hacer desde acá)

- **Desde esta sesión no hay salida a Google**: el proxy de la sesión rechaza `script.google.com` (403 de la
  política de red de la organización). No se buscó otro camino (ni GitHub Actions: además exigía tocar `main`).
- `herramientas/marcar-entregados-agosto.gs` — el dueño lo agrega como archivo NUEVO del proyecto (➕ →
  Secuencia de comandos), **sin tocar Código.gs**, y lo corre desde el editor:
  `verPendientesAgosto` (no cambia nada) → `marcarEntregadosAgosto` → `deshacerEntregadosAgosto`. Después
  se borra el archivo. Enlace fijo: `…/67fc83d0a219942a309e36df23f453e11a7dc142/herramientas/marcar-entregados-agosto.gs`
  (186 líneas, termina en `}` tras `} finally { lock.releaseLock(); }`).
- **Qué marca**: OC y RPT con fecha de agosto y «Entregado» en NO, también los «🔴 No hay · reprogramar»
  (señalados en la lista: *«¿salió de verdad?»*). **Qué no**: ATC (marcarlas desde el panel además cierra
  su seguimiento, `atcAlMarcarEntregado`; se listan aparte), filas `__…`, borradores de Kommo y ventas sin
  fecha. El panel, al marcar una OC o RPT, solo cambia `entregado` — lo mismo que hace el archivo.
- **Cómo escribe**: con el candado; SOLO las celdas de esas filas (`getRangeList`, no la columna entera: si
  alguien borrara una fila a mano en el medio, el daño queda en esas celdas); primero «Entregado» y después
  el sello (un panel que lea en el medio ve lo nuevo con el sello viejo, choca y relee — al revés lo dejaría
  guardar encima); UN sello más alto que el de cada fila; `SpreadsheetApp.flush()` antes de soltar el
  candado. Antes de tocar nada, cada fila va a la hoja «Respaldo entregados» (en texto); deshacer va de la
  última tanda para atrás aunque Sheets vuelva Fecha la hora de la tanda.
- **Por qué aparte**: no toca Código.gs (el pegado del 23/09), anda con la versión publicada (20-a) y con la
  23-b, y el enlace fijo del `.gs` 23-b sigue valiendo. ⚠️ **Todos los archivos de un proyecto de Apps Script
  comparten los nombres**: uno repetido pisaría al de Código.gs (lo correrían el panel y los disparadores).
  Por eso todo empieza con «entregas…» o dice «Agosto», y la prueba lo controla contra los dos `.gs`.
- `test_servidor.js` §13 (37 chequeos, con el `.gs` de la rama Y con el de `ebc3eab`): el doble de la planilla
  ahora tiene `getRangeList`, tope de filas + `insertRowsAfter`, conversión de fechas y `flush`.

### La revisión con cuatro agentes que arreglan (25/09)

Cuatro agentes en copias aisladas (contabilidad y conciliación · entregas y logística · stock y producción
· pedidos y lo demás), con la consigna: solo lo CONFIRMADO, primero la prueba que falla, sin tocar el `.gs`
ni las reglas del dueño, pruebas que no dependan del calendario. Más el de «uso diario» (solo informe).
⚠️ Las copias (`isolation: worktree`) arrancaron de `main`, no de la rama: el agente de stock lo notó y se
movió a la rama antes de empezar. La próxima vez, decirlo en la consigna.

#### Stock y producción (`tests/test_rev_stock.js`, 19; contra 50f9d22: 11 rojos)

- **Un código que el catálogo no conoce volvía a sumarse a otro producto al releer la fila** (ALTA,
  `stockMigrar`). Subir el Excel lo dejaba aparte (§4cy), pero `stockMigrar` corre en CADA lectura de la
  fila y lo re-resolvía por nombre: «hay 13 somieres negros» (3 + los 10 del CH1297), «49 almohadas», y el
  pedido con el código CH1297 en 0 → «fabricar». Ahora las claves de un código desconocido (según el mapa de
  códigos de la foto, `cod`) solo siguen las uniones a mano (🔗).
- **🔗 Unir dejaba lo de Moreno/Banzer en el renglón viejo** hasta releer la fila, y el pedido que trae el
  código seguía apuntando a la clave vieja PARA SIEMPRE («✗ no hay → fabricar 2» con 5 acá y 5 en Moreno).
  `guardarStockUnir` mueve `g[..].u` y el `rs` de las recogidas; `stockClaveInv` hace seguir al código la unión.
- **El detalle de un producto daba por salida una línea 📥 pendiente** (BAJA, solo el texto): comparaba con
  «Recoger de Moreno», el texto de antes de §4ey.
- **Existencias sin la hora en el nombre: la casilla «ya incluye las entregas del día» arrancaba MARCADA**
  (= no descontarlas) y el consejo decía «dejalo marcado: el panel descuenta esas entregas igual» — lo
  contrario. Ahora arranca sin marcar, que es lo que decidía §4cn («descontarlas igual, porque no se sabe la
  hora»), y el consejo lo dice. `test_existencias` marca la casilla a mano (su Excel ya las incluye).
- Tiempos con 150 productos, 3 almacenes, 100 pedidos a fábrica y 700 pedidos: `renderStock` 45–55 ms,
  `stockData` 14, `stockAsignar` 20, `stockProducir` 5. Nada que tocar.
- **Quedan para decidir** (confirmados, sin tocar): (5) una línea «📥 recoger» entregada SIN anotar la
  recogida deja a Moreno con unidades fantasma; (6) un producto de código desconocido que se agota cae en el
  parecido del catálogo (exige recordar los crudos de Excel viejos: campo nuevo de `STOCK`, y
  `stockFusionar`); (7) el filtro «Mañana» de la revisión rompe FIFO. **Plausibles**: (8) la celda de 50.000:
  con 150 productos y 100 pedidos a fábrica da 44.523 letras — `STOCK.p` guarda los recibidos 120 días y para
  medir la fábrica se usan los últimos 6 (propuesta: podar); (9) venta de tienda contra el depósito (¿alguna
  tienda vende del depósito?); (10) subir el Excel borra una llegada anotada entre la hora del reporte y la
  subida; (11) la tendencia los días 1-3 del mes; (12) depósito sin contar con stock en Moreno.

#### Entregas y logística (`tests/test_rev_entregas.js`, 42, reloj clavado el miércoles 23/09; contra 50f9d22: 29 rojos)

- **Mover una ATC con la devolución programada la dejaba en el día viejo** (ALTA). Solo «🔁 Cambiar
  devolución» movía `pdev`; con 📅 Reprogramar, el turno de la ficha de carga o ✏️ Editar, el chofer veía
  «🎧 ATC» (un recojo) en vez de «🔁 devolución», el aviso «🏭 Recoger de fábrica» contaba desde el día viejo
  y su ✅ del día nuevo no cerraba la ATC nunca. `atcSeguirViaje(p, antes)` mueve `pdev`/`pturno` con la
  fecha y el turno en `reproConfirmar` y `cambiarTurno`; `submitPedido` hace lo mismo con la fecha del
  formulario cuando la ATC vivía en su devolución.
- **Tildar y destildar la devolución apagaba el aviso de fábrica** (MEDIA): el ✅ anota el «recogido de
  fábrica» y destildar lo dejaba. Ahora el ✅ lo marca como suyo (`rfAuto`, adentro del JSON de productos,
  sin columna nueva) y destildar saca solo eso; el «✓ Recogido» a mano (`marcarRecogidoFab`) limpia la marca
  y se conserva. ⚠️ `mergeAtcDatos` saltea los `undefined` a propósito: `rf: undefined` = «no tocar».
- **Cada ATC y cada RPT eran «⚠️ SIN MONTO — preguntar antes de entregar»** en la tarjeta del chofer, la hoja
  de ruta (pantalla, impresa y WhatsApp), «Entregado» y las fichas: nacen con pagado NO y saldo 0, así que
  `sinMontoAnotado` las marcaba a todas. Y «➕ Cobré algo igual» anotaba plata que Contabilidad no ve nunca
  (`fueraDeConta`). `noSeCobra(p)` va antes de `sinMontoAnotado` y `choCobrarMetodo` se niega con
  `noSeCobraTxt` — la regla de §4fy («ni una ATC ni una RPT se cobran»), que no había llegado a la puerta.
  Lo ya anotado se sigue listando.
- **«Programar devolución» dejaba agendar sábado PM, domingo o un día cerrado**: decía «✓» y el portero del
  servidor la rechazaba después. El cartel usa `limTurno` y guardar pasa por `reproAvisos` + clave + `forzar`,
  como 📅 Reprogramar.
- **Tres avisos más decían «(12/12)» con 13 en el turno** (el toast del formulario, `reproAvisos`,
  `cambiarTurno`): el mismo error de §4fh. Ahora cuentan.
- **El chip «💰 Por cobrar» y el resumen de Administración contaban ATC y RPT** («4 pedidos · 3 por cobrar»
  con una sola venta debiendo).
- **Quedan para decidir** (confirmados, sin tocar): el producto de un RECOJO de ATC aparece en «A cargar en el
  camión» y en el TOTAL A CARGAR (¿logística quiere ver ahí lo que vuelve?); una vendedora sin clave puede
  SACAR su pedido de un día cerrado sin aviso (el portero del panel y el del `.gs` solo miran la fecha de
  destino: el camión armado pierde un bulto en silencio); la vista «Todos» de carga y ruta incluye ventas de
  tienda en un bloque «(sin fecha)»; `toggleEntregado`/`toggleVerificado`/`setEstado`/`setProdChk` encolan
  sin el cartel rojo de `persistPedido` si el guardado falla (no se pierde nada). **Plausibles**:
  `ubicarPorDireccion` puede contar como «ubicado» uno que chocó; `quitarFoto` borra el archivo de Drive
  antes de saber si el servidor aceptó.
- Revisado y bien: celular a 320/360 px; el mismo pedido cuenta igual en cupos, carga, ruta, parte, Excel
  «Mañana» y Administración (el mapa se aparta a propósito, §4dh); portero del panel = portero del servidor;
  fechas borde (30/09, sábado 31/10, 31/12 23:30, sábado 02/01/2027).

#### Contabilidad y conciliación (`tests/test_rev_conta.js`, 38, reloj fijo un miércoles de mitad de mes; contra 50f9d22: 28 rojos)

- **El flete de una venta YA PAGADA entraba como cobro de más** (ALTA, regresión de §4fk). En una venta pagada
  la ficha no tiene selector: el bloque entero dice «🚚 Cobrar el recargo» y el botón «Registrar el cobro del
  flete», con `CTA_TIPO` en 'pago'. §4fk miraba solo `CTA_TIPO`: preguntaba «¿cobro de MÁS?… usá el botón 🚚»
  —que no está— y, aceptando, los 150 iban a la venta (saldo −150) y el flete seguía «por cobrar» para el chofer.
  `showContaModal` anota lo que mostró (`CTA_FORM_ENV`) y `ctaRegistrarPago` le hace caso; la pregunta de §4fk
  queda para cuando se vio «💵 Pago» y la venta se saldó en otro dispositivo antes del toque. ⚠️ `test_conta_alta`
  §4fk (a)(b) se reescribió para ESE caso (abre con saldo y se salda «en otro lado»): el viejo medía una
  pantalla que no existe. Sigue con sus 4 rojos contra la condición vieja.
- **El 💰✓ de Administración borraba sin preguntar el único pago** (ALTA) — el QR con recibo y captura que
  registró Contabilidad, o el 2° método de un mixto — y la venta volvía a «DEBE». Ahora deshace SOLO los
  cobros de la puerta (`cobroDeLaPuerta`, §4fy), como el ↺ del chofer; si no hay, manda a Contabilidad →
  Corregir; con varios o con pagos registrados al lado, pregunta y nombra qué se va y qué no. `applyPaid` (el
  mismo 💰) anota sin recibo ni imagen, así que lo suyo se sigue deshaciendo de un toque.
- **Corregir desde el formulario una venta con pago MIXTO le ponía fecha de hoy a los dos renglones del
  adelanto** (Bs 2.000 del 28/08 se mudaban del cuadre de agosto, ya arqueado): §4fr en la rama del mixto.
- **«PAGADA sin monto» (§4fg), tres caminos más**: (a) «Guardar precios y montos» con un «A cuenta» nuevo
  dejaba el adelanto SIN método — `aplicarMontos` ahora usa `cobrosReales` + `textoHistorial` y el adelanto
  nuevo toma el método y las imágenes del suelto; (b) cargarle solo el PRECIO de un ítem la desmarcaba de
  pagada (`yaCobrado` vale 0 apenas se relee la lista) — sigue pagada mientras no se le ponga saldo; (c) el
  «monto total» que el formulario exige para guardarla quedaba fechado HOY — ahora el día de la venta, como
  «💵 Anotar el monto».
- **El Excel del Cuadre no distinguía el flete**: columna nueva «RECARGO POR ENTREGA» AL FINAL (no se mueve
  ninguna ni se toca MONTO, cuyo SUMA espera al dueño). En Ventas, el renglón del flete dice «🚚 flete» en la
  tabla y en la columna PAGOS del Excel (PAGOS sumaba 1.620 con TOTAL COBRADO 1.500).
- **«1.500» tipeado en «✏️ Corregir precios y montos» valía 1,50** (`parseFloat` sobre el campo que Chromium
  deja tal cual): `ctaRecalc`/`ctaGuardarMontos` leen con `parseMonto` (como «Registrar pago» y el arqueo) y el
  menos se mira con `montoNegativo`. Los valores que pone el panel van por `r2` (2 decimales como mucho), así
  que `parseMonto` nunca los toma por miles.
- Chicos: «Buscar» de Ventas con `sinTildes`; la ficha de una venta sin nada anotado dice «SIN MONTO ANOTADO»
  y no «Saldo: PAGADO».
- **Quedan para decidir** (confirmados, sin tocar): el FORMULARIO también lee `f-acuenta`, `f-saldo`,
  `f-cobrado`, `f-envio` y `f-monto2` con `parseFloat` («1.500» = 1,5) — un solo cambio a `parseMonto` +
  `montoNegativo` en `submitPedido`; marcar «SÍ, pagado» en el formulario sobre una venta con adelanto de otro
  día junta todo en un renglón fechado hoy (el aviso lo dice; repartir método e imagen es decisión del dueño).
  **Plausibles**: el retiro ofrece a Eduardo en «Quién entrega» (doble conteo si hay dos retiros encadenados);
  efectivo que un chofer cobre en ventas de Eduardo o ROHO no entra al Cuadre; la columna «Recargo entrega»
  muestra solo el primer flete; «1500,50» en Chromium de escritorio.
- Revisado y bien: cortes Día/Mes/Todo con reloj fijo (30/11, 01/12, 31/12, 01/01); pantalla = texto = Excel
  del Cuadre (con y sin filtro por vendedora); COBRADO + SALDO = TOTAL en el Excel de Contabilidad; 17 formas de
  venta × operaciones que no mueven plata; `fueraDeConta` en todas las listas y en `productos-mes.js`.

#### Pedidos y lo demás (`tests/test_rev_pedidos.js`, 41, monta el `.gs` real con red `drop/lose/hold/tarde`, reloj clavado el 16/09; contra 50f9d22: 28 rojos)

- **La cola BORRABA lo que entraba mientras se mandaba** (ALTA, `flushPending`). Terminaba con
  `setPending(remaining)`: la cola entera se reemplazaba por la foto del principio menos lo que había salido, y
  un guardado que fallaba mientras tanto (sin señal, o con el servidor tardando hasta 30 s por pedido) ya había
  dicho «quedó en cola, se manda solo» y desaparecía sin mandarse. Ahora sale de la cola SOLO lo que llegó (o
  lo que el servidor rechazó en firme), y solo si lo que espera sigue siendo EXACTAMENTE lo que se mandó (JSON
  de antes de mandarlo: `aplicarSello` cambia el sello del objeto enviado, no el de la cola).
- **Un borrador de Kommo completado sin señal se perdía entero con «Descartar»** (ALTA). Con la conversión en
  la cola, la tarjeta volvía a la bandeja a los 90 s (la planilla todavía tenía el borrador), y «Descartar»
  sacaba de la cola la venta completada, borraba la fila y anotaba el lead como descartado 60 días (§4et).
  `afterEnCola` la saca de la bandeja como `after()`; `leerCierresDeLista` no la devuelve mientras la versión
  completada espere en la cola (`borradorEnColaComoPedido`: pone la de la cola en STATE; `mergePending` no la
  duplica porque el id ya está); `descartarBorrador` se niega y dice por qué.
- **Salir de la edición mandaba a la papelera el comprobante del adelanto** (ALTA). En el método SUELTO
  (`QR BISA %CAPTURA %RECIBO` — como se guarda toda venta nueva con «A cuenta» — y la «PAGADA sin monto»),
  `metodoFormulario` devolvía solo `comp`: el formulario abría con una imagen, guardar sin tocar perdía la 2ª, y
  `imagenesSinPegar` tomaba la que ya estaba por una recién subida → «¿Salir igual?» → a la papelera de Drive.
  Ahora devuelve `comps`, y `descartarImagenesSinPegar` respeta §4fy: nunca borra una imagen que algún pedido
  nombra (`fotoEnUso`).
- **La OC renumerada con la respuesta perdida** (MEDIA, el PLAUSIBLE de §4fd, reproducido contra el `.gs`
  real): el servidor renumeraba 09-002 → 09-003 (`ocCambiada`), la respuesta se perdía (404 del redirect,
  §4fa), el reintento era un «ok tardío» (`mismoContenido` saltea la OC a propósito) y `aplicarSello` solo copia
  la OC con `ocCambiada`: el panel se quedaba con la OC de OTRO pedido, la mandaba al grupo y el guardado
  siguiente rebotaba con `oc_repetida`. Ahora el ok tardío toma la OC de la fila y avisa.
- **La «Ubicación de Google Maps» se perdía en silencio** (MEDIA): `normalizaUbicacion(...)||''` guardaba vacío
  lo que no entendía («maps.app.goo.gl/…» sin https) con ✓ verde. Editando otra cosa, un `maps` viejo que no
  pasa por ahí se BORRABA, y unas coordenadas crudas se reescribían como enlace (falso «MODIFICADO» a
  logística). Ahora el campo que quedó como estaba se guarda como estaba, y lo que no se entiende FRENA el
  guardado con el mensaje de 📍 Editar ubicación. Vacío sigue siendo válido (`normalizaUbicacion('')` = '').
- **Editar borraba `prodF`/`prodR`** (BAJA, `heredarMarcas`): los sellos con que `stockTiemposFabrica` mide cuánto
  tarda cada fábrica. Y la matriz «editar sin tocar nada»: 24 formas de pedido contra el `.gs` real quedan
  iguales columna por columna.
- **Buscadores de Contabilidad y ATC sin tildes** (el de Contabilidad lo arreglaron dos agentes a la vez: quedó
  uno).
- **Quedan para decidir** (confirmados, sin tocar): el `.gs` (`ocAutoGs_`/`ocSiguienteGs_`) no conoce el prefijo
  RPT — una RPT automática que choca se rechaza con `oc_repetida` en vez de renumerarse (no se pierde nada;
  exige republicar); `mergePending` saca de la pantalla un pedido recién guardado si el `list` salió antes
  (transitorio); `editPedido` pone AM a un pedido sin turno (los de ROHO); cantidad 0/2.5/-2 y «A cuenta»
  negativo no se validan. **Plausible**: `persistPedido` dice «quedó en cola» durante los 10 s de `NO_ENCOLAR`.
- Revisado y bien: las tres series de OC al cruzar mes y año; ida y vuelta por `recToRow`/`rowToRec_` en 24
  formas; `persistPedido`; borrar lo que solo estaba en la cola; doble toque en Guardar; «Quién vendió qué»,
  `productos-mes.js`, el buscador de Administración y la primera carga.

#### Cómo se juntó

27 commits (4 + 5 + 11 + 7) con `cherry-pick` sobre la rama; un solo choque (`contaLista`, el mismo `sinTildes`
de dos agentes: quedó uno). Cada prueba nueva se corrió también contra el panel de `50f9d22` (una copia aparte
con `git worktree`): 11, 29, 28 y 28 rojos. Batería completa: **79 suites, 2.985 bien · 0 mal**.

#### Publicación de la PÁGINA (25/09, 15:04 de Bolivia) — el servidor queda para el 26/09

- El dueño dijo «arrancamos cuando terminen los agentes». El quinto (uso diario) se había cortado a las 11:20 con
  la interrupción de su mensaje, sin informe: se relanzó con 35 minutos de tope. No encontró nada que bloquee, pero sí
  que la ubicación de Maps FRENABA lo que pegan de verdad (el nombre + el enlace al compartir, «Mi ubicación:», enlaces
  sin https, grados) → `normalizaUbicacion` saca el enlace de adentro y frena solo si no hay ninguna (`cdfbda7`).
- **Desde el celular no se puede usar el editor de Apps Script.** El dueño eligió publicar SOLO la página ahora
  (la nueva anda con el servidor 20-a: `test_transicion` 1, 2 y 4) y dejar la 23-b para el 26/09 en la PC.
- Batería antes de publicar: **79 suites, 2.987 bien · 0 mal**. Merge `394f74c` a `main` (19:04 UTC, sin `panel.yml`
  corriendo), deploy de Pages en verde. ⚠️ Desde la sesión NO se puede abrir `github.io` (el proxy lo rechaza):
  se verificó por el deploy de Actions y porque `pedidos.html` de `main` es idéntico al de la rama.
- **Hoy es feriado** (las vendedoras no trabajan): mañana, antes de empezar, TODOS recargan (F5 o cerrar y abrir la
  pestaña) y hasta confirmarlo nadie toca 📦 Stock ni el arqueo. Recordatorio agendado (send_later) para el 26/09
  07:45 de Bolivia con los pasos del servidor.

## 4fz-b. Segunda vuelta: la junta que no cuenta dos veces, el servidor estricto y el incidente del 23/09 (2026-09-23)

> Dos revisiones sobre la primera vuelta (§4fz, `d890468`): un **agente adversarial propio** (14
> hallazgos + 2 de antes, arnés y escenarios en el scratchpad, `aud_4fz/`) y la **verificación de
> Codex** (*«la misma recogida recibida en dos dispositivos se contabiliza dos veces… tratar la
> recepción como una operación identificable e idempotente… el servidor debe rechazar mutaciones
> sin revisión en filas protegidas»*). Las dos tenían razón. El informe para Codex y el dueño es
> `RESPUESTA_CLAUDE.md` (raíz del repo, en la rama).

### 🚨 El incidente del 23/09 (≈11:24–12:30 de Bolivia) — y lo que siguió roto después
El dueño pegó el `.gs` `2026-09-23-a` y lo implementó: **todo el equipo** quedó con «no hay conexión
con Google» (él y un vendedor a la vez; un pedido quedó en la cola del vendedor). Se arregló
**editando la implementación de siempre (✏️) y eligiendo la versión anterior**.
⚠️ **Corrección** (dato del dueño, más tarde): el diálogo **NO mostraba** «Ejecutar como» ni «Quién
tiene acceso»: lo único que cambió fue la versión. La hipótesis de la configuración queda
descartada; la causa es **lo que se guardó** como 23-a.

**Los registros del respaldo de Kommo** (Actions → «Traer ventas de Kommo (respaldo)») lo cuentan:

| corrida | hora Bolivia | versión que contestó | «último repaso del script» |
|---|---|---|---|
| 135 | 02:34 | 20-a | 02:34 (corre cada 5 min) |
| 137 | 12:51 | 20-a (ya vuelta atrás) | **11:24** |
| 138 | 15:57 | 20-a | **11:24**, y encoló 1 lead que nadie procesa |

**Los disparadores (`kommoRepaso` cada 5 min, `kommoProcesarCola`, `barrerFotosHuerfanas`) corren
el código GUARDADO en el editor, no la versión implementada.** Volver a la versión anterior arregló
el panel y NO los disparadores: el repaso se frenó el minuto en que se guardó el 23-a y siguió
frenado horas después. O sea, lo guardado **no corre** (no carga, o le falta la función). El 23-a
del repo carga y contesta `list` en `test_servidor.js`, y su diferencia con 20-a (33 líneas) no toca
la lectura ni pide permisos nuevos. **CONFIRMADO** con la captura de Ejecuciones del dueño:
`kommoRepaso` · Basada en el tiempo · 16:29 · **Fallida** · `Script function not found:
kommoRepaso`. Lo guardado como «23-a» **no tiene la función**: el pegado no entró entero (el código
no era el problema; el pegado sí). **De dónde salió el corte**: el dueño lo copió del archivo que
le mandé por el chat (`SendUserFile`, «reemplazá todo el código por este»). La vista del chat corta
un archivo de ~100 KB. 🚫 **Nunca más el `.gs` por el chat para copiar**: siempre el raw de GitHub
(texto plano entero; verificado el 23/09: 1732 líneas, idéntico a `ebc3eab`), y decir la última
línea para que lo compruebe. Arreglo pedido (no toca al equipo: guardar no cambia lo
implementado): pegar la 20-a desde el raw de `main`, comprobar que termina en la línea 1732 con `}`,
guardar, ejecutar `estadoKommo` y `kommoRepaso` desde el editor, sin Implementar.
⚠️ **Lecciones**:
1. `Failed to fetch` en TODOS los dispositivos a la vez NO es internet: una página de error o de
   inicio de sesión de Google no trae el permiso CORS, y el navegador lo informa igual que «sin
   red». `motivoDeError` ahora lo dice (y qué revisar).
2. **Volver atrás son DOS cosas**: ✏️ → la versión anterior (el panel) **y** pegar el código anterior
   en el editor (los disparadores).
3. **Probar antes de implementar**: el `.gs` 23-b trae `probarAntesDeImplementar()` (arriba de todo,
   solo lectura). Mira la versión, las 18 funciones clave hasta la última del archivo (un pegado
   cortado), la planilla leída como `list`, que cada disparador apunte a una función que exista, el
   último repaso y la cola; termina en «✅ Se puede implementar» o «❌ NO IMPLEMENTAR». Correr
   cualquier función desde el editor además muestra en rojo un error del archivo y pide los permisos
   que falten: lo mismo que el equipo vería como «sin conexión», pero antes. `test_servidor.js` §11
   (13, con un pegado cortado de verdad; 5 rojos contra el 23-b de `5205ce8`). La cabecera del `.gs`
   dice el procedimiento, y ya no dice «New deployment».
4. **Una alarma que se vea**: las corridas 137 y 138 imprimieron «último repaso: 11:24» y salieron en
   VERDE. `traer_kommo.py` ahora sale en **rojo** si el repaso tiene más de `REPASO_PARADO_MIN` (30)
   minutos (los ids se encolan igual), y GitHub le manda el correo al dueño. `tests/test_traer.py` §6
   (4 rojos contra `main`). El fixture de §4 tenía una fecha fija y pasó a `hace(2)`.
5. Visto y sin conclusión: «último aviso de Kommo al panel» dice **22/09 19:01 UTC** en todas las
   corridas del 23: el webhook no avisó nada en todo el día y las ventas entraron por los repasos.
   Puede ser normal (el respaldo filtra por `updated_at`, no por cambio de etapa), pero hay que
   mirarlo en Kommo → Webhooks.

**Producción quedó en `ebc3eab` + `.gs` `2026-09-20-a` implementado**, que es lo que el panel
publicado espera (`SCRIPT_VERSION_ESPERADA`). **✅ Resuelto a las 16:59**: el dueño re-pegó la 20-a
desde el raw de `main` y `estadoKommo` dijo `repasoInstalado: true`, `enCola: 0` y el último repaso
recién hecho (20:59:04 UTC: 2 vistos, **1 creado** —la venta que esperaba—, 1 salteado). El último
aviso del webhook (22/09 19:01 UTC) traía `leads: 0`: el webhook de Kommo no avisa ventas desde
ayer y todo entra por los repasos (a mirar en Kommo → Webhooks; no urgente).

### Lo que estaba mal en la primera vuelta
- La junta del stock contaba **multiconjuntos**: juntar DOS VECES el mismo cambio lo contaba dos.
  Pasaba con una respuesta perdida (el reintento chocaba con el propio guardado: entrada de 5 → dos
  de 5), con la misma recogida recibida en dos dispositivos (Moreno 10 → 4) y con el mismo «Unir».
- La memoria del stock arrancaba **vacía** en cada carga: recargar con el stock en la cola y anotar
  algo mandaba el stock vacío con el sello bueno (E2, de antes de §4fz).
- Sin base conocida (se recargó con la fila en la cola) la junta hacía «gana lo mío» con una copia
  vieja (E3); dos pestañas compartían la cola y la junta usaba la memoria de la otra (E4).
- La cola reenviaba una **foto vieja** (un guardado falló, el siguiente entró): la junta revivía lo
  que se canceló después. Y el guardado en espera salía con contenido viejo y el sello nuevo.
- El `.gs` 23-a dejaba pasar al panel viejo «para no trabarlo», que es justo el que pisa; y su 2°
  guardado seguido sí llevaba sello, chocaba y el panel viejo lo **tiraba** (#8).
- Pago mixto con adelanto **implícito** (venta de antes del «~»): corregir un cobro del mismo día y
  recibo le sumaba el cobro a `p.acuenta`, y como ese adelanto se lee de `p.acuenta`, el total crecía
  3.000 → 3.600 (E6).
- Borrar: con la respuesta perdida decía «sigue ahí» y, al corregirla, la **recreaba** (E9); con un
  guardado propio en el aire, el guardado la recreaba (P1, de antes) o el borrado chocaba consigo
  mismo (E10); retiros sin sello o todavía en la cola (E11, P2); «Descartar» sin red (E13).

### Cómo quedó (panel)
- **Todo tiene nombre.** Entradas `e` con id (`'e'+uid()`; las viejas reciben uno FIJO al leer,
  `v:f|k|u|fab|de#n`, sacado del contenido y ANTES de `stockMigrar`: igual en todos los
  dispositivos). Pedidos a fábrica `p` igual. Historial `h` por contenido.
- **Las recepciones son una lista** (`q.recs`: `{id, u, f, ts, se}`). `recibirStockPedido` agrega
  una; `confirmarImportExist` (dar por llegados desde el Excel de acá) agrega una con `se:1` (sin
  entrada). Lo viejo (`q.ru` sin lista) es la recepción `legacy` (`ts 0`, `se 1`: no genera nada).
  **`stockNormalizarRecepciones(S)`** deriva `q.ru/u/r`, una entrada `rec:1` por recepción (id = el
  de la recepción) y, en una recogida, la resta del almacén de origen contra la FOTO (`g[de].rs` =
  qué recepciones ya se le restaron; `g[de].t` = cuándo se subió esa foto: lo anterior ya está en el
  Excel). Es idempotente; corre al leer (`leerStock`) y al final de cada junta.
- **Junta** (`stockFusionar`): `fusPorId` para `e`, `p` (con `fusPedidoFab`: une las recepciones por
  id; si suman más que lo pedido, saca las que trajo SOLO el otro lado —la más nueva primero— y avisa
  «se contó una sola vez»; si los dos agregaron recepciones distintas que caben, cuenta las dos y
  avisa «casi a la vez») y `h`. Fotos: el mismo corte gana el de `t` más nuevo, si no el de acá.
  Primero `stockMigrar`, después normalizar.
- **Conteo con hora** (`c.t`) y **`stockEntradaVale`**: una entrada (o recepción) de antes del conteo
  ya está adentro, por fecha (como siempre) y por hora (`ts ≤ c.t`).
- **Lo que sale al servidor es la memoria** (`sisPlegar`), y la memoria es **de cada pestaña**
  (`sessionStorage` `ME_SIS_V2`: stock, arqueo y `SIS_BASE`; sobrevive a recargar esa pestaña, no se
  comparte con otra). Cada fila lleva `_base`, `_dev` (= la pestaña, `pestanaId()`), `_t` (no viajan)
  y el pedido `juntar:1`. Una fila que NO salió de esta memoria (`sisFilaEnMemoria`: otra pestaña, un
  panel viejo, o anterior a una carga de la planilla con la cola llena, `SIS_MEM_T`) se junta primero
  con su base.
  ⚠️ La primera versión de esto era un espejo del NAVEGADOR (`ME_STOCK_V1`) con las pestañas
  sincronizadas por el evento `storage`, que REEMPLAZABA la memoria con la de la otra pestaña: un
  cambio propio todavía sin guardar se borraba. Por pestaña no hay nada que reemplazar y lo ajeno
  siempre se junta.
  ⚠️ Y el **49/1** de `test_concurrencia` §4 que salió en la batería (1 de cada 2–3 corridas en
  paralelo) NO era eso: el volcado de la pestaña B mostró que vaciaba la cola 131 ms después de que A
  anotó y todavía no VEÍA la fila de A (el localStorage entre pestañas llega con un instante de
  retraso, más con la máquina cargada): no mandaba nada. Es del test —en la vida real B vacía la cola
  a los 2 minutos o al tocar «Reintentar»—, y ahora B espera a verla. 4 de 4 en paralelo. `sisColaLimpiar` saca de la cola lo que ya entró; `queuePending`
  guarda la memoria de ahora, no la foto del toque. Un `conflicto` cuya fila es EXACTAMENTE lo que se
  mandó es un ok tardío. El tope de 3 juntas ya no es un «no» firme (`junta`: queda en la cola).
  Con la memoria sin cargar se manda con `rev 0` y sin base: el servidor choca y se une (no borra).
- Lo mismo para el arqueo (`ARQUEO_CARGADO`, `_base`).
- **Mixto**: `anticipoEscrito(p)` (solo el «~»), y `mixtoEn(a, cobros, p)` exige que «A cuenta»
  cierre con los dos (o 0 en «SÍ, pagado»). `ctaGuardarPago` toca `p.acuenta` solo si el renglón
  ERA el 2° método antes de tocarlo, mirado sin la fecha que rellena `ctaCobrosConFecha`.
- **Borrar**: `esperarGuardadoDe(id)` (tope 60 s) antes; saca de la cola DESPUÉS de esperar; usa
  `SAVE_REV`; ante un error pasajero reintenta una vez (borrar dos veces con el mismo sello es
  seguro) y si sigue sin saberse devuelve `incierto` y **no la repone**. `respuesta_de_lectura` y
  `navigator.onLine===false` son «no» seguros (se repone). `borrarRetiro` pasa por
  `borrarEnServidor`; `aplicarSello` sella también la copia de `RETIROS`; `descartarBorrador`
  devuelve el borrador a la bandeja con un «no» claro. `motivoBorrar`.
- `actualizar` en `motivoDelServidor`; `scriptPendienteHtml` avisa cuando el SERVIDOR es más nuevo
  que la página («recargá con F5»).

### Cómo quedó (servidor, `2026-09-23-b`)
- `doSave(p, forzar, juntar)`: en `__stock__`/`__arqueo_cuadre__` ya sellados, **sin `juntar` →
  `actualizar`** y no toca la hoja; con `juntar`, se compara el sello (sin sello = `conflicto`).
- `doDelete(id, rev)`: en una fila sellada, **sin `rev` → `actualizar`**. Una fila nunca sellada se
  borra como siempre.
- `actualizar` va a «Rechazos» con «panel viejo: esa computadora tiene que recargar la página».

### Pruebas
- `tests/test_concurrencia.js` **rehecho** (50): arnés con `addInitScript` (sobrevive a recargar),
  reglas `lose/drop/busy/hold`, pestañas, y el panel viejo `ebc3eab` sacado con `git show`.
  Dientes: `d890468` + 23-a → **25 rojos**; `ebc3eab` + 20-a (producción) → **31 rojos**; panel nuevo
  + 20-a → **20 rojos** (todo el stock y el arqueo: hay que publicar los dos); panel nuevo + 23-a →
  4 rojos (el panel viejo).
- `tests/test_servidor.js` 194 → **201** (7 rojos contra 23-a) → **214** con §11
  (`probarAntesDeImplementar`, después del incidente). `tests/test_traer.py` §6 (repaso parado en
  rojo, 4 rojos contra `main`). `tests/test_mixto.js` 28 → **33**
  (4 rojos contra `d890468`: el 3.000 → 3.600). `tests/test_medias.js` 23 → **24**: el borrado de un
  retiro cambió A PROPÓSITO («not found» = borrado, porque sale de la cola antes; una respuesta
  perdida = «no se sabe», ya no «sin conexión»), y el test ahora relee con una planilla que los tiene.
- `test_adm_alta` (§4ev) se puso rojo en el medio: con el stock SIN cargar, una lectura vieja que
  llegaba con un guardado en vuelo REEMPLAZABA la memoria (la recogida anotada desaparecía). Ahora,
  sin cargar y en vuelo, se UNE (`stockFusionar(null, …)` / `fusMapa(null, …)`).
- Los escenarios de la auditoría (`aud_4fz/`) pasan todos; en dos de borrado hubo que cambiar el
  momento de soltar el guardado retenido (el borrado ahora espera al guardado a propósito).

### ⚠️ Lo que NO queda protegido (no decir «todo protegido»)
1. **Un panel viejo abierto** (página de antes de publicar) con el servidor 23-b: no puede guardar
   el stock ni el arqueo ni borrar filas selladas hasta que recargue (F5). Lo del stock y el arqueo
   espera en su cola y se junta al recargar (probado); los pedidos los sigue guardando.
2. **Dos pestañas abiertas a la vez**: cada una trabaja con su memoria y ve lo de la otra recién
   cuando la otra guarda y esta relee (o cuando junta lo que la otra dejó en la cola). No se pierde
   nada, pero una pestaña puede mostrar el stock de hace un momento.
3. **Dos parciales que son la misma llegada y no pasan lo pedido**: no se puede distinguir de dos
   llegadas de verdad; se cuentan las dos y se avisa.
4. **Relojes**: las reglas «antes/después del conteo» y «antes/después de la foto» usan la hora de
   cada dispositivo.
5. Una fila que dejó en la cola un panel viejo (sin base) se junta como **unión**: puede revivir algo
   que otro borró en el medio (solo en la transición).
6. La foto de un almacén vale desde que se SUBE (`g.t`), no desde la hora del reporte: una recogida
   anotada entre las dos se da por incluida (igual que antes).
7. `mixtoDe` sigue siendo una heurística para los anticipos escritos: decisión del dueño.

### 🔎 Revisión con dos agentes antes de publicar (24/09, madrugada)
El dueño pidió «pon agente a revisar». Dos agentes en worktrees aislados: uno sobre lo posterior a
Codex (servidor, alarma, procedimiento), otro sobre la TRANSICIÓN (página vieja `ebc3eab` y nueva a
la vez contra el 20-a y el 23-b; batería con libfaketime a otros días). Todo reproducido antes de
tocar (`scratchpad/adv_a02b/repro_stock.js`). Arreglado en `04ab496` + `14dec98`:
- **Stock con la página vieja** (ALTA, silencioso): la vieja reescribe las fotos de almacén SIN `rs`
  ni `t`, y su «Llegaron» solo sube `q.ru` y resta a mano. La nueva volvía a restar (Moreno 10 → 7 →
  4) y tiraba la entrada de la vieja. **`stockLeerDePanelViejo(d, o)`** (en `leerStock`): `q.ru` >
  suma de `recs` → recepción `legacy:d<n>` (sin resta ni entrada; `stockRecLegacy` = id que empieza
  con `legacy`); foto sin `rs` → las recepciones de esa MISMA fila van como ya restadas (una fila
  nueva siempre trae `rs` en los almacenes con recogidas). `fusFoto` devuelve `t` a la misma foto.
  `stockAlmPorDefectoDe(S)`: el almacén por defecto del stock que se lee (antes el del global).
- **Arqueo con la página vieja** (ALTA): su cola pisaba la corrección de otro (950 → 900). Una fila
  sin `_dev` = página vieja → **`sisJuntarFila`** usa `F.fusionarViejo` = `fusMapa(…,'viejo')`: en lo
  compartido gana la planilla, lo viejo solo agrega, `FUS_VIEJO_PISADOS` → aviso `sisAvisarViejo`.
  Stock: `stockFusionar(…,'viejo')` para `a`/`al`.
- **Arqueo antes de tener la planilla** (MEDIA): base = lo que mostró el espejo
  (**`ARQUEO_ESPEJO_TXT`**, en `filaArqueo` y en el `list` en vuelo), y el `poner` del arqueo marca
  `ARQUEO_CARGADO` (antes chocaba 3 veces y avisaba en rojo).
- **Ids fijos**: `idFijo` salta los ids ya usados en la lista.
- **Celda de 50.000 letras**: `doSave` contesta **`celda_llena`** sin tocar la hoja (antes
  excepción = «sin conexión»); `probarAntesDeImplementar` mide `__stock__` y `__arqueo_cuadre__`
  (`CELDA_AVISO` 35.000 ⚠️, `CELDA_AVISO_ROJO` 42.000 ❌); el panel avisa una vez pasadas las 45.000
  (`stockAvisarTamano`). ⚠️ **El tamaño real del stock NO se conoce**: un stock inventado de 150
  productos × 3 fotos daba 48.288 → 53.236 después de un día. Se mide en el paso 2 de «Publicar».
- La prueba del editor (`04ab496`): versión literal adentro (`ESTA_VERSION`, igual a
  `SCRIPT_VERSION`, lo compara `test_servidor` §11 E); repaso con error del CÓDIGO → ❌, de afuera →
  ⚠️; disparador ajeno a una función inexistente → ⚠️. `traer_kommo.py`: rojo también con error del
  código en el repaso, ids largos tapados en el registro público.
- Textos: `actualizar` y `celda_llena` en castellano; en Rechazos `actualizar` no cuenta como «hay
  que volver a hacerlo»; «sin conexión» ya no manda a «Ejecutar como»; `PUBLICAR_PASOS` en los seis
  carteles.
- `tests/test_transicion.js` (18; 11 rojos contra `04ab496`); `test_concurrencia` con «hoy» en hora
  de Bolivia y ventas en día abierto. Batería 75/75, 2.810.
- **Quedan**: la lista de 18 funciones no ve un hueco en el MEDIO (improbable); pruebas que se
  pudren a fin de mes (`test_botones` 29–30/09, `test_chofer` y `test_resumen` 30/09, `test_cuadre`
  1/10, `test_ventas_panel` desde octubre); lo que VE la página vieja con el 23-b (código viejo: se
  cubre con el paso 4, todos recargan).

### Publicar (orden) — reescrito después de la revisión del 24/09
**Cambió el orden: el servidor se pega y se prueba ANTES de publicar la página, y todos recargan
ANTES de implementar.** No mergear a las 10:00 ni a las 17:00 de Bolivia (`panel.yml`).
0. Dueño: Administrar implementaciones → **anotar el número de la versión activa** (la 20-a). Se
   vuelve a ESA, nunca a «la anterior» a ciegas (la del 23/09 es el pegado roto).
1. Dueño: pega la 23-b en el editor SIN implementar, desde el raw FIJO
   `…/MULTIESPUMAS/14dec98a83955ce8f7a7e979fa9bd2bd19b3ad6d/google-apps-script.gs` (verificado: 1956
   líneas, idéntico). Un solo `.gs` a la izquierda; Ctrl+A → Supr → Ctrl+V → Ctrl+S; sin rojo; última
   línea 1956 (`}` con `return borrador;` antes). Los disparadores ya corren la 23-b (Kommo igual).
2. Dueño: **`probarAntesDeImplementar`** → «✅ Se puede implementar» + captura (dice cuánto ocupa el
   stock). Con ❌: volver a pegar la 20-a (`…/ebc3eab108594105b3d7db0013a3f4ff82edfafe/…`, 1732
   líneas) y parar.
3. Claude: `panel.yml` quieto → merge a `main` → deploy de Pages → la página publicada espera
   `2026-09-23-b` (🔒 Cerrar día: «…la última es 2026-09-23-b»).
4. **Todos recargan (F5) y se confirma uno por uno. Nadie toca 📦 Stock ni el arqueo hasta que el
   dueño avise** (pedidos y cobros, normal).
5. Dueño: ✏️ la de siempre → Versión nueva, Descripción `2026-09-23-b` → Implementar.
6. Verificar (Codex): «Conectado»; 🔒 Cerrar día `2026-09-23-b`; 5 minutos después, sin
   `kommoRepaso` a mano, `probarAntesDeImplementar` ✅ con el repaso al día y sin error, y en
   Ejecuciones `kommoRepaso` «Basada en el tiempo» → «Completada».
7. Recomendado: volver a subir el Excel de existencias con el panel nuevo.
Volver atrás: pasos 1–2 → re-pegar la 20-a; después del 5 (varios sin conexión) → ✏️ la versión
anotada + re-pegar la 20-a; si falla el panel → Claude revierte el merge y todos recargan.

## 4fz. El informe de la otra herramienta: el stock que se pisaba y el borrado a ciegas (2026-09-23)

> *«chat encontró esto, revisa»* — el dueño, con un informe de otra IA hecho sobre `ca32e3b`
> (antes de §4fy): 2 ALTAS, 4 MEDIAS y 5 puntos para verificar. Se revisó uno por uno contra el
> código de `ebc3eab` y se reprodujo cada uno antes de tocar nada.

| # | qué decía | ¿es así? | qué se hizo |
|---|---|---|---|
| 1 ALTA | `__stock__` y `__arqueo_cuadre__` se saltean el sello: dos dispositivos se pisan | **Sí.** `doSave` exceptuaba toda fila `__…` («las maneja una sola persona»), pero el stock lo tocan logística, el dueño y quien sube el Excel. Reproducido con dos navegadores: la entrada de 5 de A desaparecía | panel + `.gs` (abajo) |
| 2 ALTA | borrar manda solo el id: se lleva un pago que otro registró | **Sí.** `doDelete(id)` sin sello. Y peor de lo que decía: «Descartar» un borrador de Kommo que otra vendedora YA completó (mismo id, §4es) borraba la venta y además la marcaba descartada en Kommo | panel + `.gs` (abajo) |
| 3 MEDIA | corregir el QR del pago mixto deja «A cuenta» viejo | **Sí**, y el formulario sumaba A cuenta 2.000 + saldo 2.790 = **4.790** en vez de 4.990 | `ctaGuardarPago` rama cobro + `mixtoEn` |
| 4 MEDIA | `SUMA(H:H)` del Excel del Cuadre duplica | Sí, ya anotado (§4fs→§4fw): es de formato y mueve un archivo que el dueño usa | **se le pregunta** |
| 5 MEDIA | el Excel no trae el arqueo sin pagos | **Sí**, y tampoco la TABLA del cierre ni el texto de WhatsApp: solo la tarjeta (§4fo) | `cuadreCierre()` compartido |
| 6 MEDIA | «Entrega» es la fecha agendada | Sí (§4fs→§4fw) | se rotula **«Entrega agendada»**; contar lo entregado o guardar el día real sigue a decisión del dueño |
| — | `claveOk_` abierto sin `PANEL_KEY` | decisión del dueño (05/09), sin cambios | — |
| — | ¿qué `.gs` está publicado? | `2026-09-20-a`, confirmado por el respaldo de Kommo (§4fx) | ahora hay uno nuevo que publicar |
| — | `panel.yml`: `git push \|\| echo` da verde aunque falle | Sí | reintenta con `pull --rebase` 3 veces y si no, **falla** con `::error::` |
| — | bitácora: encabezado de julio, `test_producir` «6 rojos» | Sí, viejo | encabezado y §5 al día |

### 2 · Borrar con sello
- **`.gs`** (`2026-09-23-a`): `doDelete(id, rev)` — si viene `rev` y no es el de la hoja, NO borra
  y contesta `conflicto` con la fila actual (queda en «Rechazos» con los dos sellos). **Sin `rev`
  borra como antes**: un panel cacheado quedaría sin poder borrar nada, sin saber por qué.
- **Panel**: `borrarEnServidor(loc)` **relee la planilla antes de borrar** (`apiList`, tope 20 s):
  si la fila cambió y no es solo el sello (`mismoContenido`), no borra; si ya no estaba, cuenta
  como borrado; si no pudo leer, borra con el sello visto y frena el servidor. `realDelete` borra
  local primero (como siempre) y **vuelve a ponerla** si no se borró, con el aviso de QUÉ cambió
  (`queCambioTxt`: pagada, cobrado, saldo, entrega, entregada, «la completó otra persona»).
  `descartarBorrador` y `borrEsLaMisma` pasan por lo mismo; `borrarRetiro` manda su sello.
- ⚠️ El releer protege **desde ya**, sin el `.gs` nuevo (queda la ventana de unos segundos entre
  leer y borrar); el sello del servidor la cierra cuando se publique.

### 1 · Stock y arqueo: se juntan, no se pisan
- **`.gs`**: `SISTEMA_CON_SELLO = {__stock__, __arqueo_cuadre__}` piden sello **si el panel lo
  manda** (un panel viejo no lo manda y pasa como antes). Ese `conflicto` **no se anota** en
  «Rechazos»: lo resuelve el panel. Días cerrados y carga siguen reescribiéndose enteros.
- **Panel**: `SIS_BASE[id]` = la versión del servidor sobre la que se trabaja (se anota al leer y
  con el eco de cada guardado); `filaStock()`/`filaArqueo()` guardan con `rev: sisRev(id)`. Ante
  `conflicto`, `apiSaveAhora` llama `sisFusionarYGuardar`: junta base/mío/suyo y reguarda con el
  sello nuevo (tope 3 seguidas; `SAVE_ULTIMO` pasa a lo juntado para que un guardado en espera
  no mande lo viejo). Reglas en el comentario de `SIS_FUSION`: mapas por clave, listas sin id
  como multiconjunto con deltas (dos entradas iguales son dos), pedidos por id, conteos como
  FOTOS (gana el corte más nuevo; mismo corte con dos recogidas recibidas → se restan las dos).
  Sin base (recargó con el guardado en la cola) se UNE sin contar dos veces.
- ⚠️ **«En vuelo» no es «no mirar»**: §4ev deja 90 s la memoria por encima del `list`; con el
  sello se sabe si lo que llega es MÁS NUEVO que lo último guardado (`sisMasNueva`): entonces
  otro guardó después y se junta al toque (`sisJuntarDeLista`), salvo que haya un guardado
  propio en el aire o en la cola.
- ⚠️ **Esto necesita las DOS mitades**: el panel nuevo solo, con el `.gs` viejo, sigue pisándose
  (el servidor nunca dice «conflicto»). Con el `.gs` nuevo y un panel viejo cacheado, también.

### Tests
- `tests/test_concurrencia.js` (18, **nuevo**): dos navegadores con el panel de verdad contra el
  `.gs` de verdad (en Node, planilla de mentira; el `fetch` entra por `doPost`). Stock (entrada +
  pedido; dos recogidas del mismo corte: 10 − 3 − 2 = 5), arqueo, borrar (con y sin poder releer),
  descartar un borrador ya completado. **Dientes**: con el `.gs` viejo **7 rojos** (stock, arqueo y
  el sello del borrado; el releer del panel ya protege), con el panel viejo **14**.
- `tests/test_servidor.js` 177 → **194** (+17; **9 rojos** contra el `.gs` viejo).
- `tests/test_mixto.js` 23 → **28** (4 rojos contra el panel viejo); `tests/test_cuadre_alta.js`
  31 → **35** (4 rojos).
- **La batería dio un rojo que no era de este cambio** (§4fy lo cuenta): el reintento de la carga
  de arranque borraba los datos de 6 pruebas con la máquina cargada; arreglado ahí.

### Lo que queda para el dueño
- **Publicar el `.gs` `2026-09-23-a`**: Implementar → Administrar implementaciones → ✏️ → Versión
  nueva. Hasta entonces el panel muestra en gris «hay una versión más nueva sin publicar».
- **El Excel del Cuadre** (hoja aparte para el cierre, o dejarlo) y **«Entrega»** (dejar agendada,
  solo lo entregado, o guardar el día real): siguen siendo decisiones suyas.

## 4fy. Los ocho botones de plata que no tenían prueba (2026-09-23)

> *«ya esta todo entonces?»* — el dueño. No lo sabía: había ocho botones que mueven plata sin
> ningún test. Se largó un agente a romperlos (solo lectura, todo reproducido con Playwright,
> informe en el scratchpad) y encontró **5 ALTAS, 3 MEDIAS confirmadas, 2 MEDIAS a decidir y
> 4 BAJAS**. Una de las ALTAS (la 3b) la había metido YO en §4fe.

| # | botón | qué pasaba | arreglo |
|---|---|---|---|
| ALTA-1 | ↺ «Borrar los cobros» (chofer) | `aplicarCobros(p, [])` se llevaba TODO: el QR de Bs 600 que registró Contabilidad con recibo y captura, el 2° método del adelanto mixto (el chofer le cobraba Bs 500 de más), y una venta pagada entera en la tienda pasaba a «Cobrar Bs 1.990» | `cobroDeLaPuerta(c)`: sin recibo, sin imagen, con monto, no anticipo ni flete ni `sinMonto`. ↺ y ✕ tocan SOLO esos; los otros muestran «🧾 registrado». El confirm nombra cada cobro, el total y cuántos «NO se tocan». «ya cobraste» → «ya entraron» |
| ALTA-2 | ✕ imagen del flete / 🗑 Quitar el recargo / ✕ del adelanto | el flete «¿ya lo cobraste? SÍ» del formulario hereda **el mismo id** de imagen que el pago de la venta; quitárselo al flete mandaba a la papelera el comprobante de la venta | `fotoEnUso(fid)` + `borrarFotoSiNadieLaUsa(fid)`: se mira DESPUÉS de reescribir el renglón; si otro renglón (o una foto de entrega) la nombra, se desengancha y NO se borra. En los 5 lugares que borraban |
| ALTA-3 | guardar el pedido desde el formulario | con DOS fletes cobrados (el camino normal desde §4fe), corregir la DIRECCIÓN convertía el efectivo de 40 en 100 (Bs 60 inventados en caja) o, con el «NO» que el formulario FUERZA cuando no se ve el método, le sacaba método, recibo e imagen y volvía «por cobrar 100» | los cobrados quedan TAL CUAL y el campo mueve solo lo pactado. El renglón ÚNICO con el control **a la vista** sigue como en §4eu (el SI/NO y el monto valen: se puede corregir 80 → 50). Si con varios cobrados alguien pone MENOS de lo cobrado, un confirm lo dice (se corrige en Contabilidad) y deja no guardar — antes bajar a 80 dejaba **140** |
| ALTA-3b | ✏️ / 📎 / ✕ del flete | **mío (§4fe)**: `ctaIdxEnvio` devolvía el n-ésimo COBRADO y los que llaman lo usan como posición en `enviosDe`, que trae también los PACTADOS. Con [pactado 100, QR 60], corregir el QR a 65 convertía el pactado en «QR 65» (cobrado 125, por cobrar 0) | traduce a la posición de verdad dentro de `enviosDe(p)` |
| ALTA-4 | 📎 dentro de «✏️ Corregir» (y «📎 Ya la adjunto» del gato) | `COMP_DESTINO={id, envio:true}` sin `e`: la imagen del 2° flete iba al 1°, con aviso verde | `e:ctaIdxEnvio(p,i)`; si el renglón no aparece, se dice y NO se pega en el primero |
| MEDIA-1 | 🗑 Eliminar esta venta | no contaba el flete cobrado (con solo Bs 150 de flete, ni lo nombraba y pedía UNA confirmación); una «PAGADA sin monto» decía «Total Bs 0,00» | suma el flete y lo dice; avisa «PAGADA sin monto» y «ya está CARGADA en el sistema contable»; las tres piden la 2ª confirmación |
| MEDIA-2 | ✅ REGISTRADO + formulario | `_metForm` se arma sin la marca: corregir la dirección de una venta con «A cuenta» (TODA venta nueva con adelanto) la devolvía a «sin cargar al sistema contable» → carga doble | `if(prev && regEnSistema(prev)) _metodoPago = conMarcaReg(_metodoPago, true)` |
| MEDIA-3 | ✕ imagen del pago en curso / ✅ / ✏️ / ✏️ flete | repintaban la ficha sin `ctaPagoRecordar()`: «pagó 400 el sábado» se registraba como 1.000 de hoy y la venta quedaba PAGADA con Bs 600 de deuda borrados | `ctaPagoRecordar()` en los cuatro. ⚠️ Y el MONTO se recuerda solo si alguien lo TIPEÓ (`data-def`): si no, al cambiar el saldo quedaba pegado el viejo (pasaba también con el 📎 de §4ep) |
| BAJA-1 | 📱 QR (ficha de Administración) | «QR» sin banco: fila suelta en el Cierre por forma de pago | un botón por banco de la vendedora (`bancosParaCobrar`: `bancosDeVendedor` + el banco que la venta ya tenga) |
| BAJA-2 | 📎 del flete | el tope de 4 imágenes se medía en el PRIMER flete | se mide en el elegido (`destino.e`) |
| BAJA-3 | 💵/📱/💳 y 💰 en ATC/RPT | a una ATC se le ofrecía «Marcar como pagado» y el aviso mandaba a Contabilidad, donde no aparece. **Y una RPT con precio se podía cobrar desde el 💰 de la tabla** | `markPaid`/`quickCobrado` se niegan con `noSeCobraTxt`; la ficha no ofrece el bloque; en la tabla el 💰 queda como hueco |
| BAJA-4 | ↺ sobre «PAGADA sin monto» | en el dispositivo que la cargó la dejaba debiendo Bs 1.500 | cubierto por ALTA-1 (el pago de mentira no es de la puerta) |

### ⚠️ Lo que NO se tocó: dos decisiones del dueño
- **MEDIA-4**: 💵 Efectivo de la ficha de Administración anota el cobro **sin `recibio`**, así que en
  un pedido que entregó el chofer la plata queda «en la mano de la vendedora» (§4eq dice que el
  chofer le rinde a Contabilidad). Si logística toca ese botón DESPUÉS de que el chofer vuelve, ¿de
  quién es la plata? Lo decide el dueño.
- **MEDIA-5**: un cobro nuevo sobre una venta ya ✅ REGISTRADA no aparece en «sin cargar al sistema
  contable» — la marca es por VENTA a propósito (§4j). ¿Se quiere por pago?

### Tests
`tests/test_botones.js` (50, nuevo): una comprobación por arreglo + controles (la imagen que usa
UN solo renglón sí va a la papelera; el «NO» elegido a mano con el control a la vista sigue
pasando el flete a «por cobrar»; un flete único se sigue corrigiendo de 80 a 50; a una venta sin
marca el formulario no se la inventa…). El estado se arma por los mismos caminos que la gente
(formulario, `ctaRegistrarPago`, `choCobrarMetodo`). **Dientes**: contra el panel de
`origin/main` (ca32e3b) da **42 rojos**; los 8 verdes son los controles y los «estado de partida».

### La batería dio un rojo que no era de este cambio — y no era azar
La 2ª corrida dio `test_existencias :: 52 bien · 3 mal` (ya había pasado una vez, en otra corrida
del día, y se había dejado pasar). Sola daba 55/0. **Seis corridas en paralelo: 6 de 6 en rojo, los
mismos 3** («TRAER, no pedir» salía «sobra»). Midiendo: al llegar a esa parte, sola iba por los
**3 s** con `STATE` = 30 pedidos; con la máquina cargada, por los **5-6 s** con `STATE` = **0**.
Causa: el panel arranca con la URL del equipo, la carga de arranque falla (no hay red) y se
**reintenta sola a los 3 s** (`CARGA_INTENTOS`) — y el reintento usa el `apiList` que el test puso,
que devuelve la planilla VACÍA. Le borraba los 28 pedidos del ejemplo a mitad de la prueba.
Defecto del **test**, no del panel (en la vida real el reintento trae la planilla de verdad). Se
apaga en el setup, como ya hacían otras pruebas, en las SEIS que simulan la planilla vacía
(`existencias`, `buscar`, `identidad`, `memes`, `revisar`, `rotacion`). Después: 6 de 6 en verde
con la misma carga. ⚠️ Quedan unas 25 pruebas cuyo `apiList` devuelve un fixture (`window._pl`,
`_FIX`, `_planilla`…) sin apagar el reintento (las ~15 que devuelven `STATE` no hacen daño): si
un día el fixture y `STATE` difieren pasados los 3 s, van a fallar igual. Anotado en CLAUDE.md.

## 4fx. Google cambia el envío por una LECTURA — y el panel lo tomaba por guardado (2026-09-23)

> *«ok dame el gs que tengo que subir»* — el dueño, aceptando el arreglo del `.gs` que le había
> propuesto el 22/09 para los guardados de 30-40 segundos.

### No había `.gs` que subir, y mi cuenta del 22/09 estaba mal
El registro de «Traer ventas de Kommo (respaldo)» imprime la versión publicada: **`2026-09-20-a`,
la misma del repo**. Lo que el 22/09 le prometí («sacar `leadYaCargado_` del loop baja el candado
de ~30 s a ~2 s») estaba calculado sobre el `.gs` de ANTES de §4dt/§4et: desde el 20/09 las
llamadas a Kommo ya están afuera del candado, y adentro quedan dos lecturas de columna y un
`appendRow` por venta NUEVA — segundos, no 30. No valía una republicación (cada una arriesga que
se cree una implementación nueva, §4dm). Se le dijo así, sin vueltas.

### Lo que SÍ mostraban los registros: 4 corridas rotas de las últimas 16
| corrida | cuándo (UTC) | leads | qué recibió |
|---|---|---|---|
| 128 | 22/09 01:56 | 5 | **HTTP 404** |
| 131 | 22/09 17:22 | 12 | `ok:true` + versión, **sin `origen`** (tardó ~2 min) |
| 132 | 22/09 20:21 | 13 | **HTTP 404** |
| 136 | 23/09 12:05 | 0 | `ok:true` + versión, **sin `origen`** (23 s) |

Las cuatro pedidas **desde los servidores de GitHub**: ni un navegador, ni una caché, ni una
sesión de Google. ⚠️ Esto **corrige** lo que se venía diciendo desde §4do/§4dp («un 404 en el
navegador no significa que el script esté caído: es la caché»): el 404 también le pasa a un
cliente limpio. Es el redirect de Google, que a veces se pierde.

Y el `ok:true` sin `origen` tiene una sola explicación posible: **lo contestó `doGet`**. Es la
única respuesta del script con `{ok:true, version, pedidos}` y sin `origen` (el `list` por POST
también, pero el repaso manda `kommoLeads`), y leer la planilla entera explica los 23 s. O sea:
**Google convirtió el POST en un GET y `doPost` nunca corrió.**

### Por qué eso era grave para el PANEL
`apiSaveAhora` → `apiPost` → `{ok:true, version, pedidos:[…]}`: sin `pedido`, sin error. Nadie
lo miraba: `persistPedido` y `submitPedido` lo daban por **guardado**, ✓ verde, y en la planilla
no había nada. Al minuto el `list` traía la fila vieja y el cambio desaparecía. Es exactamente
el reclamo de §4em: *«uno sube un comprobante y cuando volvés a abrir el pedido nunca subió,
siendo que cargó y salió LISTO»*. Lo mismo con `apiDelete` (resolvía `ok:true`) y con las fotos.

### El arreglo (sin republicar nada)
- **`apiPost`**: si lo que se pidió NO era la lista y vuelve una lista (`Array.isArray(j.pedidos)`)
  —o el `get_cerrado` de §4dv, que es la misma puerta cerrada—, la petición no corrió:
  `throw new Error('respuesta_de_lectura')`. Solo `list` y `doGet` devuelven `pedidos` (verificado
  en el `.gs`), así que la señal es exacta. Un `get_cerrado` a una LECTURA también es error (antes
  era una planilla vacía).
- **`errorPasajero`** lo reconoce: el guardado se **reintenta una vez** (§4fa) y, si Google
  insiste, queda en la **cola** del dispositivo. Reintentar es seguro: si por casualidad el primero
  sí entró, el segundo choca con su fila y `rechazoFirme` lo toma como ok tardío (§4fd).
- **`motivoDeError`/`motivoCorto`** lo dicen en castellano, sin mandar a tocar la implementación,
  y el aviso de `persistPedido` ya no dice «sin conexión» cuando no es eso.
- **`traer_kommo.py`**: reintenta UNA vez (8 s) ante la lectura o un 404/5xx; si Google insiste,
  falla con el motivo verdadero («Google cambió el aviso por una LECTURA dos veces seguidas… no es
  la clave ni el script»), no con «¿PANEL_URL apunta a otra implementación?». ⚠️ Esa respuesta de
  lectura trae la planilla ENTERA: el script no imprime nada de ella (test).
- **La batería no corría los tests de Python** (`test_traer.py`, `test_kommo.py`,
  `test_duplicados.py`): `correr.sh` buscaba solo `.js`/`.cjs`. Ahora corre los tres.

### Tests
`tests/test_lectura.js` (11, nuevo). **Dientes**: contra el panel de `origin/main` da 8 rojos —
el guardado respondido con la lista resolvía `ok:true` en UN intento y con la cola vacía, y el
borrado «resolvió ok=true». `tests/test_traer.py` 37 → **49** (lectura → reintento → bien;
lectura dos veces → falla con el motivo real; 404 → reintento; `busy` NO se reintenta; ninguna
de las respuestas de lectura filtra datos de clientes).

### Lo que queda del lado de Google
El `GET_CERRADO=1` de §4dv (una propiedad del script, **sin republicar**) haría que un POST
convertido reciba `{ok:false, error:'get_cerrado'}` en vez de la planilla entera: el panel ya lo
trata igual, y deja de viajar la lista de clientes a quien sea que llame por GET. Antes de
ponerlo hay que mirar **Administración → 📡 ¿Quién lee la planilla?**: si alguien de confianza
lee por GET, se le corta.

## 4fs → 4fw. Lo que quedaba del agente del cuadre (2026-09-23)

> *«Ya arreglaste todo?»* — el dueño. No: quedaban siete del cuadre. Cinco se arreglaron acá;
> dos esperan una decisión suya (abajo).

### §4fs — Un cobro PARCIAL valía Bs 0 en «Cobrado» del parte, del chofer y de la rendición
Seis lugares con el mismo patrón: `if(p.pagado) cob+=totalCobrado(p); else pend+=saldo`. Una
entrega de Bs 1.000 donde el cliente dio 400 en la puerta y quedó debiendo 600 aportaba **0** a
«Cobrado»: el Cuadre veía los 400; el **parte del día** (pantalla y WhatsApp), la tarjeta del
**chofer**, la **rendición por chofer** de Administración y el **reporte por período**, no. Y
«Salió a cobrar» (`pend+cob`) daba 1.500 cuando el chofer había salido a cobrar 1.900. §4ew
había cambiado `p.cobradoBs` por `totalCobrado(p)` en todos pero dejó la guarda `p.pagado`.
Ahora lo cobrado se suma **siempre** y lo pendiente sigue saliendo de las no saldadas, como
antes (`pendN` cuenta igual).

### §4ft — Un «A cuenta» sin método se reportaba como «Bancos y tarjeta»
Todo lo que no era `Efectivo` caía en «Bancos y tarjeta — para conciliar con el extracto»: un
adelanto viejo sin método (casi seguro efectivo en la mano de la vendedora) aparecía como plata
que tiene que estar en un extracto donde nunca va a estar. `cuadrePorForma` marca `sinMetodo`
y las tarjetas lo muestran aparte («⚠️ Sin método anotado — abrí la venta y anotá con qué
pagó»). La tabla de formas ya lo listaba bien; eran las dos tarjetas grandes las que mentían.

### §4fu — El día de la venta se leía con el reloj del DISPOSITIVO
`contaFecha(p)` hacía `isoLocal(new Date(p.ts))`: una venta del 31/08 a las 21:00 de Bolivia
(= 01/09 01:00 UTC) caía en **septiembre** en un celular con la zona mal puesta, y dos personas
mirando el mismo mes veían totales distintos. Es el mismo bug que §4ew arregló en
`generar.py`. Ahora `isoDeTsBolivia(ts)` resta 4 horas y lee en UTC: **Bolivia no tiene horario
de verano, así que en un dispositivo bien configurado da exactamente lo mismo que antes**.
También `atcEntro` y `rptFechaSolicitud`, que tenían el mismo `isoLocal(new Date(ts))`.
«Productos del mes» usa `contaFecha`, así que hereda el arreglo solo.
⚠️ `todayStr()` sigue siendo el reloj del dispositivo, a propósito: «hoy» es el de quien mira.
Lo que se arregló es leer un INSTANTE guardado (`ts`) en la zona del negocio.

### §4fv — El buscador se colaba en las tarjetas y en el Excel sin decirlo
En Contabilidad → Ventas, `contaLista` aplica «Buscar», así que con «titanio» las cuatro
tarjetas mostraban Bs 1.000 de los Bs 3.000 del mes **diciendo «de todo el equipo»**, y el Excel
se llamaba igual que el del mes entero (`contabilidad-2026-09.xlsx`). Ahora las tarjetas agregan
«· solo lo que coincide con «titanio»», el archivo se llama `contabilidad-2026-09-SOLO-titanio.xlsx`
y el aviso de descarga lo dice. En el **Cuadre** era al revés (la búsqueda filtra solo la tabla
de pagos; las tarjetas y el Excel son del período entero): ahora lo dice al lado del buscador.

### §4fw — «Productos del mes» decía «Sin dato» donde Contabilidad decía Bs 3.000
Bastaba UNA venta sin monto anotado para que «Importe total vendido» del mes entero saliera
«Sin dato», aunque el valor conocido estaba calculado (`totalConocido`). Ahora la tarjeta dice
«Incompleto · Bs 3.000,00 conocidos» —igual que ya hacía «Unidades vendidas»— y el Excel trae
el número con el rótulo «INCOMPLETO: hay ventas sin monto». Vive en `productos-mes.js`: se subió
el `?v=` a `20260923a`.

### Tests
`tests/test_cuadre_alta.js` (18 → **31**). **Dientes**: contra el panel de `origin/main` (antes
de esta tanda) los 12 checks nuevos dan rojo, cada uno con el comportamiento viejo en el detalle
(parte 900 en vez de 1.300, «Bancos» 500, el Excel con el mismo nombre, «Sin dato», y la venta
del 31/08 leída como 01/09 en un dispositivo en UTC).
⚠️ Los reproductores del auditor para §4fs y §4fw **no sirven para verificar el arreglo**:
recalculan con la lógica vieja por su cuenta en vez de leer la pantalla. Por eso hay tests
propios que leen `parteData()`, `#tbl-rendicion`, `#cho-metrics` y `#pm-body`.

### Lo que espera una decisión del dueño
- **§7 del auditor — «Entrega» corta por la fecha PROGRAMADA.** No existe ningún campo con el
  día en que se entregó de verdad: `p.fecha` es la agendada y logística la reescribe cada vez
  que mueve el pedido. Una venta cargada y cobrada el 30/09, agendada para el 01/10 y sin
  entregar, suma en «Entrega» de **octubre**; si se reprograma al 05/11, octubre baja solo. Hay
  tres salidas y las tres cambian lo que ve contabilidad: (a) dejarlo y rotularlo «por fecha de
  entrega programada»; (b) contar en «Entrega» solo lo entregado; (c) guardar el día real al
  marcar ✅ entregado, que necesita un lugar en la planilla y una versión nueva del `.gs`.
- **§12 del auditor — el Excel escribe el SALDO crudo.** Se deja **a propósito**: desde §4fm es
  lo que hace que COBRADO + SALDO = TOTAL VENTA en cada fila. Un saldo negativo es un **cobro de
  más** y el contador lo tiene que ver; la pantalla («Falta cobrar») lo deja en 0 porque ahí la
  pregunta es otra.
- **§10 — `SUMA(columna MONTO)` del Excel del Cuadre duplica** (sigue como en §4fj→§4fr):
  separarlo mueve un archivo que el dueño ya usa.

## 4fj → 4fr. La segunda vuelta de la auditoría de cobros y del cuadre (2026-09-23)

Nueve arreglos, todos de plata, todos con su reproductor. Los reproductores viven en el
scratchpad (`aud_cobro/`, `aud_cuadre/`) y NO van al repo: usan fixtures sintéticos pero el
formato es el de los datos reales.

### §4fj — Corregirle el RECIBO al anticipo borraba el 2° método del pago mixto · ALTA
`mixtoDe(p)` reconoce al segundo método por **heurística**: mismo día y mismo recibo que el
anticipo (no hay marca propia en el texto del ledger). La rama del anticipo de `ctaGuardarPago`
le cambiaba al anticipo la fecha y el recibo **sin tocar el otro renglón**, así que en cuanto
se corregía el recibo —que es justo lo que §4ei recomienda hacer— `mixtoDe` dejaba de
encontrarlo:

| paso | `p.acuenta` | `mixtoDe` |
|---|---|---|
| inicio (`~Efectivo 1500 @10 #1700 + QR 500 @10 #1700`) | 2000 | 500 |
| corregir el recibo (1700 → 1750) | 2000 | **null** |
| corregir la fecha | **1500** | null |
| la vendedora corrige el saldo | 1500 | — y los Bs 500 **ya no están en el ledger** |

Ahora los dos renglones se mueven juntos: es la MISMA plata del mismo adelanto pagado en dos
veces. `tests/test_conta_alta.js` (recibo, fecha después, y que corregir solo el MONTO siga
igual que antes).

### §4fk — Un pago sobre una venta YA PAGADA se guardaba como flete · ALTA
La condición era `CTA_TIPO==='envio' || falta<=0.01`. En una venta sin saldo, un pago
registrado con **«💵 Pago de la venta» elegido** se guardaba como **recargo por entrega**, sin
preguntar y con el aviso en verde: en el Excel del contador esos Bs 700 salían en «RECARGO
COBRADO» y no en lo cobrado de la venta. Ahora al recargo se va **solo si el usuario lo
eligió**; si no, se pregunta («Esta venta ya está pagada… ¿anotar igual estos Bs 700 como un
cobro de MÁS? Si en realidad es el flete, usá 🚚») y el cobro de más queda como cobro de más,
que el panel ya sabe mostrar (`excesoBadge`). El flete de verdad (🚚 elegido) no pregunta nada.

### §4fl — Bajar el adelanto a 0 en un pago mixto inventaba un anticipo FANTASMA
`p.acuenta = r2(acu + mxM)` se aplicaba también con `acu` en 0: el ledger se quedaba sin el
renglón del anticipo pero `p.acuenta` quedaba en 500 —el 2° método— y `anticipoDe` fabricaba
con eso un anticipo sin método ni comprobante. Los MISMOS Bs 500 contados dos veces y el total
de la venta inflado. Sin anticipo no hay adelanto: el 2° método queda como lo que es, un cobro.

### §4fm — El Excel de Contabilidad no cuadraba ni consigo mismo
`TOTAL COBRADO` usaba `totalCobrado(p)` (que **no** incluye el anticipo) y `TOTAL VENTA` usaba
`ventaTotal(p)` (que **sí**). Σ(COBRADO) + Σ(SALDO) daba menos que Σ(TOTAL VENTA) y la brecha
era **la suma de todos los adelantos del mes** —en esta empresa, casi toda venta—; además el
archivo decía un número distinto del que la pantalla muestra en «Ya ingresó». Ahora va
`contaCobrado(p)`, la misma cuenta de la tarjeta, y las tres columnas cierran.

### §4fn — El aviso «pago sin fecha» no se veía en el mes que se estaba cerrando · ALTA
`cuadreAlertas` recorre solo las ventas cuya **fecha de venta** cae en el período, así que un
pago sin fecha sobre una venta de OTRO mes no disparaba nada: no estaba en el cuadre de agosto,
ni en el de septiembre, y al cerrar septiembre el panel no lo nombraba. Es exactamente la forma
del bug de §4fd (el botón 💰 creaba cobros sin fecha, y se lo toca cuando el cliente paga
DESPUÉS — o sea sobre ventas de meses anteriores). Un pago sin fecha no es de ningún mes:
ahora se lo busca en TODAS las ventas y el aviso dice cuántos son «de ventas de otro mes».

### §4fo — El arqueo anotado se perdía en silencio, y el panel decía «El cuadre cierra ✅»
La comparación recorría `formas`, que sale de los **pagos del período**. Si se contaba la caja
en Efectivo y después esos cobros se corregían a QR (o se les sacaba la fecha, o se borraba la
venta), la fila de Efectivo desaparecía y los Bs 900 contados a mano quedaban huérfanos: no se
comparaban contra nada y no entraban en la diferencia. Ahora un arqueo sin ningún pago detrás
es una **diferencia entera** y se lo nombra en la ficha.

### §4fp — La ventana verde «✅ Guardado» mentía cuando el servidor rechazaba
`showPagoWhatsapp` se abre apenas el pago queda escrito **en memoria**; el guardado va después.
Con `busy` o un 404 el modal igual decía «✅ Listo — el pago ya quedó guardado» y «No tenés que
hacer nada más», y el aviso rojo salía **detrás del propio modal**. Ahora `aplicarCobros` y
`aplicarEnvios` devuelven la promesa del guardado y `pagoWaEstado` repinta la ventana en ámbar
con el motivo y con «**No lo vuelvas a registrar**: se duplicaría». La plata no se pierde
(queda en cola), pero hay que saberlo — es justo lo que §4fa construyó.

### §4fq — «Anotar el monto» se comía un saldo pendiente
`ctaAnotarMonto` forzaba el objetivo a `otros+monto` sin sumar `p.saldo`. Normalmente una venta
«PAGADA sin monto» tiene saldo 0 y no cambia nada; con un saldo pendiente (dato viejo o
importado) lo dejaba en 0 sin decir nada.

### §4fr — Corregir el adelanto desde el FORMULARIO le borraba el chofer y la fecha
Con un «A cuenta» y sin mixto, `_metForm` caía en `_metSuelto` («Efectivo %IMG»): el renglón
perdía su fecha, su N° de recibo propio y —lo más caro— el **`>Nombre` de quién tiene el
efectivo** (§4eq). Los Bs 600 dejaban de estar en la mano del chofer y pasaban a la de la
vendedora en «💵 Efectivo cobrado vs. retirado»: a él se le borraba lo que tiene que rendir y a
ella se le reclamaba plata que nunca tocó. Y `anticipoDe` lo refechaba con el día de INGRESO de
la venta, moviéndolo de día y de mes.
⚠️ El arreglo es **angosto a propósito**: solo cuando el adelanto YA ERA un renglón del
historial (`_antPrev`). Una venta NUEVA con «A cuenta» sigue guardándose como método suelto,
como siempre — cambiar eso tocaría `cobrosDe`, `metodoFormulario`, `mixtoDe` y los borradores
de Kommo de una vez.

### Lo que se miró y se dejó como está
- **El total de la venta con el adelanto en 0** (5.490 y no 4.990): con A cuenta 0 y saldo
  4.990 tipeados a mano, y un QR de 500 ya registrado, «500 que entraron + 4.990 que se deben»
  es la lectura honesta de lo que se escribió. Lo que estaba mal era contar esos 500 dos veces
  (§4fl).
- **`SUMA(columna MONTO)` del Excel del Cuadre duplica** porque el cierre por forma de pago
  comparte columna con los pagos. Es de formato, no de plata, y arreglarlo mueve un archivo
  que el dueño ya usa: queda anotado.
- **La duplicación de lectura de `cobrosDe`** (A cuenta suelto + PAGADA sin monto muestran el
  mismo pago dos veces) sigue a decisión del dueño, como dice §4eu. Lo que sí se arregló es que
  `aplicarCompsAnticipo` **ya no la escribe** en la planilla (§4fg).

## 4fi. El cartel decía «Conectado» con el 404 a la vista (2026-09-22)

> *«y tb sale eso a pesar de estar conectado»* — el dueño, 22/09, con una captura donde arriba
> dice en verde **«Conectado a Google Sheets. Todos los pedidos del equipo aparecen acá»** y
> abajo, en la misma pantalla, el aviso naranja **«No se pudo actualizar (Google contestó 404
> en ESTE navegador…)»**.

### Qué pasaba
`renderConnEstado` **sí** sabe ponerse en naranja: mira `CARGA_ESTADO`. Pero el que lo pone en
`'error'` es `cargaInicial`/`refrescarEstado`, y **`loadFromServer` —el 🔄 Actualizar de
Administración— no tocaba nada**: en su `.catch` solo tiraba el toast. Entonces el panel
quedaba diciendo «Conectado» en verde mientras la lectura fallaba.

Y no es cosmético. Si la planilla no se pudo leer, **todo lo que se está mirando es la copia
guardada en el dispositivo**: los cupos, quién debe, el stock, el parte del día. Eso es
exactamente lo que hace parecer que un pedido movido «no liberó el cupo» (§4fh): el pedido se
movió, pero el número que se está leyendo es de una lectura vieja.

### Lo que se hizo
- `loadFromServer` ahora deja `ULTIMO_ERROR` y `cargaEstado('error')` cuando falla —y
  `cargaEstado('ok')` + `renderCupoForm()` cuando anda—, así el cartel de arriba dice la
  verdad y el de abajo se repinta. La rama «respuesta inesperada» hace lo mismo.
- **`desdeCuandoLaCopia()`**: el cartel de error dice **de cuándo es** lo que se está mirando
  («leída hace 1 hora — puede estar vieja», o «Nunca se pudo leer la planilla en este
  dispositivo»). Sin eso, una copia de hace horas se lee como si fuera de ahora.
- **`cupoViejoAviso()`** en el contador de cupos: «⚠️ Ojo: este número es de la copia guardada
  en este equipo (leída hace N min), porque no se pudo leer la planilla (motivo). Tocá 🔄
  Actualizar y mirá de nuevo». Va **donde se lo está mirando**, no solo arriba.

### Tests
`tests/test_cupos.js` (17 → **23**), sección 7: con `apiList` rechazando un `http404`, el
cartel deja de decir «Conectado», dice el motivo en castellano y de cuándo es la copia; el
contador de cupos lleva el aviso; y **cuando el servidor vuelve, todo vuelve a verde** y el
aviso desaparece (esa última es la que cuida que el arreglo no deje el panel en naranja para
siempre).

### Lo que NO se arregló acá
El **404 en sí** sigue siendo lo de §4do/§4dp: `/exec` contesta con un redirect a una dirección
temporal de `script.googleusercontent.com` que el navegador guarda, y cuando esa dirección se
vence el navegador devuelve 404 aunque el Apps Script esté perfecto. La prueba de 20 segundos
sigue siendo **abrir el panel en incógnito**. Y **no volver a implementar**: cada
«Nueva implementación» estrena otra dirección y empeora el enredo.

## 4fh. Los cupos del camión: son DOS bolsas, y ahora se ve quién las ocupa (2026-09-22)

> *«edité un pedido le puse fecha 24 y NO LIBERO EL ESPACIO DEL 23 que se supone que ya esta
> libre. porque?»* — el dueño, 22/09, con la captura del cartel rojo «Turno AM lleno para el
> 23/09/2026 (12/12) · AM: 0/12 · PM: 0/13 libres» y, al lado, el pedido ya movido al 24.

### La regla, que el cartel no decía
`cuposUsadosTurno(fecha, turno)` cuenta las filas de `STATE` con **esa fecha Y ese turno**, y
el portero del `.gs` (`doSave`, col B = fecha, col H = turno) cuenta exactamente igual: los
dos coinciden, no hay discrepancia entre panel y servidor. O sea que son **dos bolsas
separadas** —12 en 🌅 AM, 13 en 🌆 PM, 15 el sábado y solo AM— y **mover un pedido de la tarde
no destraba la mañana**. Con las dos llenas (0/12 y 0/13 = 25 pedidos) sacar uno de PM deja el
cartel de AM igual de rojo, que es lo que se vio.

Qué **no** ocupa cupo, y por qué: las **ventas de tienda**, los **retiros de efectivo**
(`__ret_…__`) y los **borradores de Kommo** van con la **fecha vacía a propósito** — el
portero solo cuenta `if (foundRow < 0 && p.fecha)`. Lo **entregado sí** sigue contando: ese
bulto ya se subió al camión de ese día.

Las otras dos causas reales, en orden: (1) **esa pantalla no volvió a bajar la planilla** —el
contador mira la memoria de ese dispositivo, así que editar en el celular y mirar el cupo en
la compu da el número viejo hasta que refresque—; (2) **otra vendedora agarró el lugar** en el
minuto que pasó.

### 🔴 Y la causa de verdad: el cartel mostraba el LÍMITE, no lo que hay
> *«PERO YO MOVI UN PEDIDO DEL 23 QUE ERA AM PARA EL 24 y debio liberar el espacio para el 23
> que estaba ocupando... O NO?»* — sí, y lo liberaba. Lo que no se movía era el cartel.

`'('+limSel+'/'+limSel+')'` — el número salía del **límite**, imprimido dos veces, y los libres
iban con `Math.max(0, …)`. O sea que un turno con **13** se veía EXACTAMENTE igual que uno con
12: `(12/12)` y `0/12 libres` en los dos casos. Y 13 es un estado real y alcanzable:
administración puede forzar un pedido de más en un turno lleno (`_forzar` + `asegurarClaveAdmin`,
y el portero del `.gs` lo deja pasar con `forzar:true`). Entonces el 23 AM tenía 13, se movió
uno al 24, quedaron 12 — **el cupo se liberó de verdad**— y el cartel siguió igual de rojo, sin
una sola pista de que algo había cambiado.

Ahora el cartel **cuenta** en vez de calcular: dice `(13/12)` y agrega en ámbar «Hay 13 pedidos
en AM, 1 más de los 12 que entran — administración forzó alguno. **Sacando uno va a seguir
lleno**». Lo mismo en el sábado (`/15`) y en el chip de Administración («⚠️ 1 forzado de más
(13 AM · 9 PM)»).

### Y para poder mirarlo uno mismo
El cartel daba un número pelado: cuando no cuadra, no hay forma de averiguar por qué sin abrir
la planilla. Ahora lleva **👀 Ver los N pedidos del turno** (`cupoVerBtn` → `verCuposTurno` →
`cuposDelTurno`), que abre la lista ordenada por N° del día con OC, cliente, zona, vendedora,
la marca de entregado y un botón **Ver** que abre cada pedido. El texto de arriba dice en
letras que el cupo va **por fecha Y por turno** y qué significa que el pedido que se movió
siga apareciendo («todavía no llegó a la planilla — tocá 🔄»).

### Tests
`tests/test_cupos.js` (17): la regla fecha+turno, mover de día libera el viejo y ocupa el
nuevo, pasar de AM a PM descuenta de AM, lo sin fecha no ocupa, el cartel ofrece la lista, la
lista trae exactamente los del turno pedido, el singular del botón con un solo pedido, y —el
que cuida el hallazgo— **13 en un turno de 12**: el cartel dice `(13/12)`, avisa que sacar uno
no alcanza, y al mover uno el número BAJA a 12.
⚠️ El fixture busca el **próximo miércoles** a propósito: con una fecha fija, o con «mañana»,
el test se pone rojo los sábados (límite 15 y sin PM) y los domingos (cerrado).

## 4fg. El pago de MENTIRA de una venta «PAGADA sin monto» (2026-09-22)

De la auditoría adversarial del ledger de cobros (la que pidió el dueño tras §4fd). Era el
hallazgo ALTA-1 y es el caso **normal**, no un borde.

### Qué pasaba
Una venta que la vendedora marcó PAGADA sin anotar cuánto entró **no tiene renglón** en el
historial: el campo guarda el método suelto, `Efectivo %IMG`. Para poder mostrarla, `cobrosDe`
**fabrica** un pago con el monto sacado de `p.cobradoBs` — un campo que **no tiene columna en
la planilla** (`rowToRec_` no lo devuelve), así que en cuanto el panel relee la lista (al
abrir y cada minuto, en cualquier dispositivo) vale **0**.

Cualquier cosa que reescribiera el historial escribía ese pago de mentira como renglón real de
**Bs 0**, `parseCobros` lo tiraba por no tener monto, y `pagado` se recalculaba en **false**:

| | antes | después |
|---|---|---|
| `pagado` | **true** | **false** |
| pagos en la ficha | 1, con sus imágenes | **«— sin pagos registrados —»** |
| «💵 Anotar el monto» | está | **desaparece** (la única vía de arreglo) |
| Excel del contador | PAGADO = SÍ | **PAGADO = NO** |
| aviso | — | **VERDE** «Comprobante adjuntado ✓» |

Y las imágenes quedaban huérfanas en Drive. Lo disparaban **cuatro** caminos, todos ofrecidos
por la propia pantalla: **📎 Adjuntar comprobante**, la **✕** de una imagen, anotarle un
**recargo por entrega**, y el **cobro del chofer** desde su ficha.

### El arreglo
`cobrosDe` le pone la marca **`sinMonto:true`** a ese renglón fabricado, y de ahí sale todo:
- **`cobrosReales(p)`** = los cobros que existen de verdad. **Todo lo que REESCRIBE
  `metodoPago` usa esa lista**, nunca `cobrosDe`: `aplicarCobros`, `aplicarEnvios` y
  `aplicarCompsAnticipo`.
- **`sueltoDe(p)` + `textoHistorial(p, filas)`**: el anticipo y los cobros *absorben* el método
  suelto (los dos lo leen del texto crudo), así que solo hace falta volver a ponerlo adelante
  cuando no queda ninguno de los dos — si no, anotarle un flete le borraba el método y el
  comprobante a la venta.
- **`aplicarCompsSinMonto(p, comps)`**: adjuntar o quitar una imagen **no es una operación de
  plata**. Reescribe solo las imágenes del método suelto y no toca monto, saldo, `pagado`,
  adelanto ni recargos. `aplicarCobros` deriva ahí cuando, sacado el pago de mentira, **no
  queda ningún cobro real que escribir**; y la función **se niega** (`return false`) si el
  campo ya es un historial de verdad, para que el que llamó siga por el camino normal.
- Si **sí** quedan cobros reales, las imágenes del suelto **se mudan al primero**: nunca
  quedan huérfanas en Drive. Por eso `choCobrarMetodo` y `choQuitarCobro` pasan `cobrosDe`, no
  `cobrosVisibles` (que descartaba el renglón —y sus fotos— antes de que nadie lo rescatara).
- ⚠️ Los **dos** caminos que sí lo convierten en un pago de verdad —**💵 Anotar el monto**
  (`ctaAnotarMonto`) y corregirle el monto desde la ficha (`ctaGuardarPago`)— hacen
  `delete c.sinMonto` **a propósito** antes de llamar. Si se toca esa marca, esos dos dejan de
  funcionar y la venta se queda sin forma de arreglarse.

### Lo que NO se tocó
La **variante en la misma sesión** (con `cobradoBs` todavía en memoria) ya no materializa un
`Efectivo 1500` **sin fecha** —plata invisible para el Cuadre del día y del mes—: se queda como
«sin monto anotado», que es la verdad, y el panel ya tiene el aviso y el botón para arreglarlo.
La **duplicación de lectura** que nombra §4eu (A cuenta suelto + PAGADA sin monto muestran el
mismo pago dos veces) sigue ahí y sigue a decisión del dueño; lo que se arregló es que
`aplicarCompsAnticipo` **ya no la escribe** en la planilla.

### Tests
`tests/test_sinmonto.js` (32 → **42**), sección 8: adjuntar no despaga, quitar una imagen deja
la otra, quitar la última no borra el método, solo se borran de Drive las que se quitaron, el
flete no se lleva el pago, el cobro del chofer se queda con el comprobante, y **«Anotar el
monto» sigue funcionando** (con fecha y con su comprobante) — ese último es el que cuida que
el arreglo no haya roto el camino bueno.

## 4ff. La batería daba VERDE con un test cortado por tiempo (2026-09-22)

El mismo día que §4fc (el filtro que no veía «SIN RESUMEN · N fallas»), otra vez, por otro
agujero. `test_conta_alta` creció con las comprobaciones nuevas del recargo y, con la máquina
cargada por el `-P 4`, pasó del `timeout 220`. Lo mataron **antes del resumen y antes de su
primer `✗`**, así que `uno()` cayó en la última rama y lo reportó como **«ok (sin resumen)»**
—que el filtro daba por verde— con **3 comprobaciones en rojo adentro**.

- `correr.sh` ahora **mira el código de salida**: `124` = cortado por `timeout` y lo dice con
  todas las letras (`CORTADO POR TIEMPO (400 s)`), y cualquier `exit≠0` sin resumen sale como
  `SIN RESUMEN (exit N)` con la última línea. El tope subió de 220 s a **400 s**.
- El filtro de revisión solo acepta **«ok (sin resumen)»** para las suites que de verdad no
  imprimen resumen (hoy: `test_stock_detalle.cjs`, que cierra con «…: OK»). Cualquier otra que
  salga así es una falla.

⚠️ La lección de fondo es la misma de §4fc y hay que leerla junto con ella: **una batería en
verde solo prueba que pasaron los tests que existen, y solo si de verdad corrieron**. Las dos
veces el error estuvo en cómo se LEE el resultado, no en el resultado.

## 4fe. El recargo por entrega: cuatro maneras de mover plata en silencio (2026-09-22)

Los tres botones del flete —**✏️ Cambiar lo que falta cobrar**, **📎/✕ comprobante** y
**🗑 Quitar**— no tenían **ninguna** cobertura. Ahí vivían cuatro errores, dos de ellos de los
más caros de la auditoría.

### 1. El pago de la venta entraba como FLETE
`CTA_TIPO` solo se reseteaba al **cambiar de venta**, y el camino natural de la pantalla no
cambia de venta: anotar el flete → «✅ Listo, volver a la venta» (`showContaModal` de la
MISMA) → registrar el pago. Los Bs 1.000 del cliente se guardaban como **recargo por entrega**:
la venta seguía diciendo «por cobrar Bs 1.000» y **nunca se cerraba**, el Excel mostraba
`RECARGO COBRADO 1.150` con `TOTAL COBRADO 0`, y el aviso salía en **verde**. Ahora
`ctaRegistrarPago` deja `CTA_TIPO='pago'` después de anotar un recargo.

### 2. Cobrar PARTE del flete pactado borraba el resto
`var ae=enviosDe(p).filter(envioYaCobrado)` tiraba el renglón **pactado entero**: con 100
pactados y el cliente dando 40, `envioPorCobrar` pasaba a **0**, los 60 que faltaban
desaparecían y el chofer ya no los pedía. Ahora, si el cobro no cubre lo pactado, queda un
renglón pactado por el resto.

### 3. Con DOS renglones, ✏️ y ✕ pegaban siempre en el PRIMERO
`ctaGuardarPago` escribía en `ae[0]` a secas y `ctaEnvioQuitarComp(id, k)` recibía el índice de
la **imagen**, nunca el del renglón. Corrigiendo el segundo flete (QR 40 → 45): **Bs 60 salían
de caja, Bs 45 entraban al banco y Bs 15 desaparecían**, y un cobro en efectivo pasaba a
figurar como QR — justo el descuadre caja-contra-banco que ese botón existe para arreglar. La
✕ del segundo **borraba de Drive la foto del primero**. Ahora hay **`ctaIdxEnvio(p, i)`** (el
índice dentro de `enviosDe(p)`) y todos los caminos lo usan: `ctaGuardarPago`,
`ctaEnvioQuitarComp(id, e, k)`, `ctaEnvioAdjuntar(id, e)` y `COMP_DESTINO={id, envio:true, e}`.

### 4. 🗑 Quitar nombraba uno y se llevaba todos
El confirm decía «¿Quitar el recargo de Bs 60,00?» y borraba los Bs 100, dejando la foto del
otro huérfana en Drive. Ahora nombra el **total**, lista los renglones («Son 2 renglones: Bs
60,00 Efectivo + Bs 45,00 QR») y junta **todas** las fotos antes de borrarlas.

### Tests
`tests/test_conta_alta.js` (35 → **41**), bloque «🚚 EL RECARGO POR ENTREGA».
⚠️ Para registrar un pago desde la ficha en un test hay que poner **`CTA_PAGO.comps`**: la
imagen del respaldo es obligatoria y `ctaRegistrarPago` se planta y abre el gato de
comprobantes si falta — sin eso el pago no se registra y el test mide otra cosa (me costó tres
comprobaciones en rojo que parecían del código).

## 4fd. Lo que encontró el agente del 22/09: el botón 💰 borraba plata (2026-09-22)

Ocho hallazgos. El más caro no era mío y llevaba tiempo ahí.

### 💰 «Marcar cobrado» REEMPLAZABA el historial en vez de sumar
`applyPaid` hacía `aplicarCobros(p, [unCobro])`, y `aplicarCobros` **reescribe** el ledger.
Es el botón 💰 de **cada fila de Administración** —pegado a 📦 y 🚚, el que más se toca— y
también los tres de la ficha (Efectivo / QR / Tarjeta).

Caso reproducido: venta Bs 1.000, Contabilidad ya había registrado **600 por QR con recibo
#1750 y comprobante**, el cliente debe 400. Un toque:

| | antes | después |
|---|---|---|
| cobrado | 600 | **400** |
| saldo | 400 | **600** |
| comprobante | guardado | **perdido** |
| aviso | — | **verde** |

Y como nunca llegaba a marcar `pagado`, los toques siguientes hacían ping-pong con el saldo
(500 → 700 → 500 → 700). Ahora `applyPaid` **suma** un cobro por lo que falta
(`cobrosDe(p).slice()` + push) y devuelve `false` si no hay saldo, para que quien llama lo
diga en vez de anotar un pago de cero.

### …y el cobro nacía SIN FECHA
`enPeriodoCuadre('', pe)` solo es true en «todo», así que esa plata **no entraba al Cuadre
del día ni al del mes** ni a «💵 Efectivo cobrado vs. retirado». El panel ya arreglaba esto en
otros dos lugares (`ctaCobrosConFecha`, `aplicarMontos`) y hasta lo denuncia en el aviso
`sinfecha`; a `applyPaid` se le había pasado. Ahora lleva `fecha:todayStr()`.

### «Deshacer el cobro» borraba TODO sin preguntar
`quickCobrado` con `p.pagado` hacía `aplicarCobros(p, [])`. Pensado para el cobro único de la
puerta, pero con tres pagos registrados se llevaba los tres, sin confirmación y sin deshacer
del deshacer. Ahora, con más de un pago, **pregunta** y nombra cuántos.

### El reintento de §4fa dejaba el guardado MUDO
Pedido NUEVO, Google graba la fila, el redirect se vence → 404 → reintento → `conflicto`
contra su propia fila → `rechazoFirme` lo trataba como ok tardío **pero no se lo decía a
quien llamó** → `submitPedido` caía en la rama de conflicto y reabría el formulario **en
silencio**, sin ✓ y sin aviso. Antes salía al menos «Quedó en cola».
⚠️ Es exactamente el síntoma que el dueño reclamó («reviso 2-3 veces si subió») y lo había
dejado peor. `rechazoFirme` ahora devuelve `true` en ese caso y `apiSaveAhora` lo convierte
en `{ok:true, tardio:true}`. Un conflicto DE VERDAD sigue siendo conflicto.

### 🚚 Programar recogida no respetaba el orden del dueño
`Object.keys(o.otrosAlm)[0]` = el orden en que se cargaron los Excel. Con IM 9 y Banzer 9
agendaba contra **IM**, gastando el stock de la fábrica mientras lo de Banzer seguía parado.
Ahora ordena con `recogerCanon` (IM último), igual que `tomarIM` (§4ey).

### Lo que el agente revisó y estaba bien
La regla nueva de las notas (§4fb) y que **ningún otro lugar** agrupe por número a secas
(`huecosTalonario` va por vendedor; el `porNota` del importador de ROHO es un solo emisor =
un talonario; `compRepetidos` va por imagen; `productos-mes.js` reutiliza `indiceDuplicados`).
El orden acá → Banzer → IM, el desglose `chkDes`, `recogerCanon`/`recogerMismo`, «Qué
producir», `contaPagos`↔`ctaIdxCobro`, el pago mixto y el flete cobrado vs. pactado.

### Quedan sin hacer, a propósito (BAJA)
- `heredarMarcas` con **dos renglones idénticos** le da a ambos la marca del último
  (`porClave[prodClave(x)]=x` pisa): `["ok","no"]` → `["no","no"]`. Cargar dos renglones
  iguales en vez de `cant:2` es raro y la revisión automática lo vuelve a marcar.
- **PLAUSIBLE, no reproducido**: OC renumerada por el servidor + esa respuesta perdida → el
  reintento recibe `conflicto` sin `ocCambiada`, y como `mismoContenido` saltea `oc` a
  propósito, el panel se queda con la OC vieja y el próximo guardado rebota con `oc_repetida`.

Tests: `tests/test_conta_alta.js` (35), `tests/test_conflicto.js` (45), `tests/test_banzer.js` (56).

## 4fc. Rompí `motivoDeError` y lo publiqué — y mi filtro de la batería estaba ciego (2026-09-22)

Lo encontró el agente de revisión del 22/09, con el panel **ya en producción unas horas**.

### Qué rompí
Al agregar `motivoCorto` (§4fa) la metí **DENTRO** de `motivoDeError`: cerré la función con
un `}` justo después del caso `http404`, y sus ramas siguientes —403, 401, 5xx, `http<otro>`,
sin red, «devolvió una página» y el fallback— quedaron como **código muerto detrás de un
`return`** dentro de `motivoCorto`.

`motivoDeError` pasó a devolver **`undefined`** para todo salvo `clave`, `tardo`,
`tardo_datos` y `http404`. En pantalla:
- **«No se pudo subir la foto: undefined»** — el caso MÁS común, una vendedora sin señal;
- «No se pudo subir el comprobante: undefined»; «No se pudo actualizar (undefined)»;
- «El servidor no contestó — .» en Rechazos y en 📡 ¿Quién lee la planilla?;
- y el cartel de primera carga (§4di) sin motivo.

La ironía: §4di/§4dm/§4dp existen justamente para que el cartel diga QUÉ pasó y QUÉ hacer.
Lo dejé mudo para todos los casos frecuentes, arreglando otra cosa.
⚠️ **`motivoCorto` va DESPUÉS de `motivoDeError`, nunca adentro.** Queda dicho en el código.

### Y por qué la batería no me frenó — el error es MÍO, no de `correr.sh`
`correr.sh` lo reportó, fuerte y claro, en las **tres** corridas:
```
test_carga :: SIN RESUMEN · 5 fallas
```
(«sin resumen» porque el test se **cayó** antes de imprimirlo: `cod.m403.slice` sobre
`undefined`.) Yo revisaba los rojos con `grep -E "· [1-9][0-9]* mal"` — **y ese formato no
dice «mal»**. Di tres baterías por verdes con la regresión adentro.

⚠️ **`correr.sh` emite CINCO formas de falla**, y hay que mirarlas todas:
`N bien · N mal` · `SIN RESUMEN · N fallas` · `VACIO` · `FALLA (exit N)` · `· (exit N)`.
La forma correcta de revisar es al revés: listar todo lo que **no** sea `N bien · 0 mal` ni
`ok (sin resumen)`. Queda un script en el scratchpad (`revisar_bateria.sh`), pero lo que
importa es la regla: **nunca dar una batería por verde filtrando por una palabra.**
También conviene comparar cuántas suites REPORTARON contra cuántos archivos hay en `tests/`.

### La lección de fondo
Las dos veces que rompí algo hoy fue **editando alrededor de un `return`** en una función
larga con `python3 - <<PY` y reemplazo de texto: el `node --check` pasa (la sintaxis es
válida), los duplicados no saltan (no hay función repetida) y el daño es **semántico**. Después
de insertar una función nueva al lado de otra, mirar con los ojos dónde quedó el `}`.

## 4fb. Cada vendedora tiene su propio talonario (2026-09-22)

El dueño, textual: *«si dos vendedoras tienen la misma nota, no significa que sea repetido
salvo que tengan misma nota + mismo cliente, recuerda que cada uno tiene su propio talonario.
y pueden coincidir. lo mismo que los de sueña»*.

Tenía razón y era un **falso positivo de los caros**: `indiceDuplicados` agrupaba por el
NÚMERO de nota a secas (`porNota[n]`, línea ~3237) y marcaba «⚠️ ¿DUPLICADA?» a dos ventas
legítimas de dos personas distintas. Es la segunda vuelta del mismo problema: en agosto ya
había pasado con la nota «0» (ver el comentario de `notaDeTalonario`), y la conclusión de
entonces vale igual — **un aviso con más falsos que verdaderos se deja de mirar**, y este
avisa de lo más caro que hay (facturar dos veces).

### La regla nueva
Con el mismo número de nota, salta en **dos** casos y en ninguno más:

| Caso | ¿Marca? | Por qué |
|---|---|---|
| Misma nota · **misma vendedora** · clientes distintos | **SÍ** (`nota`) | Un talonario no repite número: o es un error de tipeo o es la misma venta dos veces |
| Misma nota · **mismo cliente** · vendedoras distintas | **SÍ** (`notaCliente`) | Es la misma venta cargada por dos personas |
| Misma nota · vendedoras distintas · clientes distintos | **NO** | Dos talonarios distintos que coinciden en el número. Normal |

`juntarPorNota(ps, kn)` agrupa el conjunto de la nota primero por `vendedor` y después por
`cliente`; si el mismo conjunto ya se marcó por la primera señal, no se cuenta dos veces.
`dupChip` y el detalle de la auditoría distinguen los dos motivos: «misma nota 1503 **en el
mismo talonario**, que JUANITO» contra «misma nota 1503 y el **mismo cliente**, cargada
también por **Carola Chavez**».

⚠️ Lo de «misma nota + misma vendedora» **lo deduje yo**, no lo dijo él: se sigue de que un
talonario es correlativo. Si resultara que una vendedora usa DOS talonarios (uno Heaven y
otro Sueña), ese caso pasaría a ser legítimo y habría que mirar también de qué serie es la
nota. 📌 **Preguntado al dueño el 22/09, sin respuesta todavía.**

`tests/test_dupaviso.js` (24): los cuatro escenarios de la tabla, los textos de los dos
motivos, y tres vendedoras con el mismo número sin marcar ninguna. ⚠️ El fixture viejo
(PEPITO y JUANITO con la nota 645) sigue marcando porque las dos son de la MISMA vendedora.

### El otro lugar que tenía la regla vieja
La batería lo cazó sola: `tests/test_productos_mes.cjs` (de la otra herramienta, §4dd) se
puso en rojo con *«conserva y advierte las notas repetidas entre vendedores»*. **El código
no hacía falta tocarlo**: `productos-mes.js` llama al mismo `indiceDuplicados`, así que
heredó la regla nueva sola. Lo que estaba viejo era **lo que el test esperaba** — su fixture
tiene la nota «102» compartida por Fernando Peinado (Cliente 102) y Juan Pablo (Cliente
104): vendedores distintos, clientes distintos, o sea el caso legítimo.
Los dos checks se reescribieron conservando lo que de verdad cuidaban: que las dos ventas
**se conserven** (ese archivo nunca deduplica por nota, y eso sigue firme) y que el período
y el criterio viajen en las dos hojas del Excel. 29 checks, en verde.
⚠️ Si la otra herramienta vuelve a tocar ese test, que no reponga el aviso: la regla la
dictó el dueño.

## 4fa. El cartel del 404 acusaba a la causa equivocada — y el consejo era peligroso (2026-09-21)

A un vendedor (Juan Pablo) le salió al subir un comprobante: *«No se pudo subir el
comprobante: la dirección del panel ya no existe (404). Suele pasar cuando se crea una
implementación NUEVA del Apps Script…»*. El dueño preguntó qué pasó.

**No era el Apps Script.** Tres comprobaciones, en este orden:

1. **La dirección nunca cambió.** `SHEETS_URL` está FIJA en `pedidos.html` (línea ~1316), no
   es por dispositivo. Recorriendo las últimas 400 versiones del archivo aparece **una sola**
   dirección `AKfycb…`, la misma desde el primer día. O sea: la «implementación nueva» que el
   mensaje acusa no existió nunca.
   ```
   for c in $(git log --format=%h -- pedidos.html | head -400); do
     git show $c:pedidos.html | grep -m1 -oE "AKfycb[A-Za-z0-9_-]+"; done | sort -u
   ```
2. **El servidor contestaba**: el repaso de Kommo corrió a las 20:53 desde GitHub Actions y
   habló con el `/exec` sin problema (§4ch).
3. **Le pasó a UNO solo.** Como la dirección va fija en la página, si estuviera muerta
   fallarían todos a la vez.

Conclusión: el 404 lo pone **el navegador de esa persona** — varias cuentas de Google
metiendo el `/u/N/` (§4do) o un redirect guardado (§4dp). Exactamente lo del 09/09 con el
navegador del dueño, donde el mismo `/exec` le contestaba bien a Actions y en incógnito
andaba.

### Lo que se cambió
El texto de `motivoDeError('http404')`. **El consejo viejo era peligroso**: empujaba a ir a
Apps Script, y alguien que «arregla» creando una implementación **NUEVA** estrena otra
dirección y **deja sin panel a todo el equipo**. Ahora el mensaje va en este orden:
1. probá en **incógnito** (la prueba de 20 segundos);
2. si ahí anda, es ese navegador → cerrar las otras cuentas de Google o borrar los datos del
   sitio;
3. **solo si no anda para NADIE**, mirar la implementación — editando la de siempre (✏️) →
   «Versión nueva»;
4. ⚠️ **nunca crear una implementación NUEVA.**

`tests/test_carga.js`: tres checks — que «incógnito» aparezca **antes** que «Administrar
implementaciones», que esté la advertencia de no crear una nueva, y que siga sin decir que
es momentáneo (un 404 de verdad no se arregla solo).

### 🔁 Y POR QUÉ PASA DE VERDAD — el redirect temporal, y el reintento
El dueño no se conformó con «es su navegador», y tenía razón: *«entonces porque pasa? ya lo
dejo y el sin hacer nada»*. La causa, ahora con el mecanismo:

Un `/exec` de Apps Script **no contesta derecho**: devuelve un **302 a una dirección
temporal** de `script.googleusercontent.com`, propia de ESA petición y con vida corta. Subir
una foto es de lejos lo más lento y pesado que hace el panel —achicar, subir el base64,
escribir en Drive, `setSharing` (§4dq)—: decenas de segundos. Si en el medio la conexión se
corta un instante o Google tarda de más, esa dirección temporal ya no vale y el navegador
recibe un **404 del REDIRECT, no del panel**.

Eso explica todo lo que no cerraba:
- le pasa a **una persona en una foto** y el resto guarda bien → un `save` tarda ~0,5 s y
  nunca llega a que la dirección expire; una foto sí;
- el servidor está perfecto y la dirección nunca cambió;
- **volver a intentarlo suele funcionar**, que es lo que la persona hacía a mano.

**El arreglo**: `subirFoto(id, nombre, dataUrl)` envuelve a `conTopeDuro(apiFoto(...))` y
**reintenta UNA vez** cuando el error es de los que se arreglan reintentando
(`fotoReintentable`: `http404`, `http5xx`, sin red, `tardo`). Un «no» firme del servidor
—`clave`, por ejemplo— **no** se reintenta. Las **cuatro** rutas de foto pasan por ahí:
comprobante desde Contabilidad, comprobante desde el formulario, recibo de retiro y foto de
entrega.
⚠️ **El precio**: si la primera subida SÍ había llegado, queda un archivo suelto en Drive.
Lo junta el barrido de la madrugada (§4ep, «Fotos sin pedido»), y un archivo de más es
muchísimo mejor que perder el comprobante de un pago.
`tests/test_compconta.js` (32): el 404 reintenta y la segunda entra; lo mismo con 5xx, sin
red y espera agotada; y `clave` NO se reintenta.

### 🐌 22/09: el mismo 404, pero en un GUARDADO del dueño, tras 40 segundos
*«fui yo subiendo un pedido y tardo mas de 40 seg y luego salio ese mensaje»*. Eso descarta
«el dispositivo de ese vendedor» y deja a la vista la causa de fondo: **el servidor tarda**,
y el 404 es el síntoma (la dirección temporal del redirect se vence en el camino).

**De dónde salen los 40 segundos** (medido leyendo el `.gs`, no adivinando):
`doPost` toma `LockService.waitLock(30000)` para guardar. Quien lo tiene agarrado mientras
tanto suele ser `kommoProcesar_` (línea ~1532), y ahí está el problema — **adentro del
candado**:
```js
for (var i = 0; i < listos.length; i++) {
  if (leadYaCargado_(sh, listos[i].id)) { … }   // ⚠️ lee DOS columnas ENTERAS, por lead
  sh.appendRow(recToRow(listos[i].rec));         // ⚠️ una escritura por lead
}
```
`leadYaCargado_` hace `getRange(2,1,last-1,1).getValues()` **y** `getRange(2,15,last-1,1)
.getValues()`. Con 3 leads en cola son **6 lecturas de columna entera + 3 `appendRow`**, y el
guardado de cualquier persona espera detrás de eso.

**Arreglado en el panel (sin tocar Google):**
- `apiSaveAhora` **reintenta UNA vez** lo pasajero (`errorPasajero`: 404/5xx/sin red/tardó).
  ⚠️ Es el único guardado que se reintenta a ciegas, y es seguro: si el primero no llegó, el
  segundo guarda; si ya había llegado, el segundo va con el sello viejo → `conflicto` →
  `rechazoFirme` se queda con la fila del servidor, que es este mismo pedido. `busy` y los
  «no» del servidor NO pasan por acá (vienen resueltos, no lanzados, y ya van a la cola).
- **`motivoCorto(e)`** para el cartel «Quedó en cola», que lo lee la VENDEDORA: el 22/09 le
  apareció el texto entero de `motivoDeError` —Apps Script, administrar implementaciones, no
  crear una nueva— a alguien que solo había guardado un pedido. Ahora dice «Google cortó la
  respuesta a mitad (404). No se perdió nada». Lo largo queda en Administración.

📌 **PENDIENTE, y es la cura de fondo** (exige que el dueño republique el `.gs`): sacar
`leadYaCargado_` del loop —leer las dos columnas UNA vez antes— y escribir todos los leads
con un solo `setValues` en vez de un `appendRow` por lead. Baja el candado de ~30 s a ~2 s.
**Preguntado al dueño el 22/09, sin respuesta todavía.** ⚠️ Al hacerlo, subir `SCRIPT_VERSION`
y `SCRIPT_VERSION_ESPERADA` juntos — y ojo que hasta que él republique el panel avisa a todo
el equipo que el servidor está desactualizado.

### 📌 Las 14 fotos huérfanas son TODAS comprobantes — y en buena parte no son un error
En la misma pantalla el barrido mostró 14 archivos sin pedido, **ninguno** foto de entrega.
Buena parte se explica sin ningún fallo: en el formulario de un pedido nuevo el comprobante
se sube con id **`'form'`** (línea ~6269) **antes** de que el pedido exista; si la vendedora
no llega a guardarlo, la imagen ya está en Drive y no queda pegada a nada. **Propuesto y NO
hecho**: no subir la imagen hasta que el pedido se guarde (guardarla en memoria y subirla
después). Preguntado al dueño, sin respuesta todavía.
⚠️ No confundir esas huérfanas con el 404: pueden coincidir, pero la causa habitual es esta.

### Lo que se revisó y estaba bien
- La subida del comprobante va por `ctaAdjuntar` → `subirFoto` → `apiFoto` → `apiPost`:
  **el mismo canal** que todo lo demás, con `credentials:'omit'` y `?_=<ms>` (§4do, §4dp), y
  con tope de `FOTO_TOPE`=90 s. Las cuatro rutas de foto lo tienen.
- ⚠️ Y la página de ese vendedor **no era vieja**: `credentials:'omit'`, `cache:'no-store'`
  y el texto del 404 entraron todos en el mismo commit (`6794cf0`, 14/09), así que si vio
  ese mensaje tenía las tres protecciones. Por eso hubo que buscar la causa en otro lado.
- ⚠️ Mientras tanto la venta **no se pierde**: el pedido se carga igual, lo que no salga
  queda en la cola y se manda solo; el comprobante se adjunta después desde
  Contabilidad → Corregir.

### 📌 Y el deploy de Pages falló de nuevo
La corrida 1494 (`b420f61`) terminó en `failure` — infraestructura de GitHub, como el 09/09
(§4dp). **La página sigue en vivo con el último deploy que SÍ salió**, así que nadie se
queda sin panel; lo que no sube es el cambio nuevo. Se destraba con cualquier push
posterior. Mirar el deploy ANTES de tocar código.

## 4ez. «Rechazados» mezclaba lo perdido con lo que se reenvió solo (2026-09-21)

El dueño, mirando Administración → ⚠️ Guardados rechazados: *«esos no deberían estar
guardados una vez vuelva el servidor? demasiados rechazados creo yo. fijate si estan»*.

Tenía razón en desconfiar del número, aunque no había nada roto. La lista juntaba **dos
cosas muy distintas** bajo el mismo título:

| Motivo | ¿Se guardó? | Qué pasa |
|---|---|---|
| **`busy`** — «el servidor estaba ocupado» | **SÍ** | No está en `RECHAZOS_FIRMES`, así que `queuePending` lo devuelve a la cola y el tic lo reenvía solo hasta que entra |
| `conflicto` — «lo modificó otra persona antes» | **NO, a propósito** | Dos pantallas sobre el mismo pedido; se frena al segundo para no pisar al primero. Hay que rehacer el cambio |
| `dia_cerrado` · `cupos_llenos` · `oc_repetida` · `admin` | NO | El panel lo avisó en el momento |

El `.gs` anota en la hoja `Rechazos` **todo** lo que contestó que no (`RECHAZOS_REGISTRAR`
incluye `busy:1`), que para diagnosticar está bien. El problema era la pantalla: catorce
renglones iguales, y cuatro de ellos ya estaban guardados.

- **`rechazoSeReintentaSolo(err)`** (hoy: solo `busy`). `renderRechazos` cuenta aparte
  —«De estos 14: 10 no entraron y hay que volver a hacerlos · 4 fueron solo una demora y el
  panel los reenvió solo»—, pinta esos renglones en verde con «🔁 el panel lo reenvió solo»,
  y la nota del pie explica el motivo, que antes **ni figuraba** ahí.
- El dato que cierra la cuenta ya estaba arriba en la misma pantalla y no se leía junto:
  si los dispositivos tienen la **cola en 0**, lo de `busy` salió. El cartel ahora lo dice.
- ⚠️ **No tocar el servidor**: que registre `busy` es correcto, y sacarlo escondería el
  síntoma de que varios guardan al mismo tiempo (§4dt, §4ds).
- Tests: `tests/test_cola.js` (16) — que `busy` no sea firme, que el tic lo mande solo al
  desocuparse el servidor, y los tres checks de la pantalla.
- 📌 Lo que SÍ merece mirarse de esa lista son los `conflicto`: ahí el cambio se perdió si la
  persona no se dio cuenta de que el panel se le recargó.

## 4ey. El almacén Banzer: «recoger» ya dice DE DÓNDE (2026-09-21)

Pedido del dueño, sobre una captura de la ficha de un pedido: *"añade el almacén banzer"*.
Confirmó que Banzer es **un lugar de donde se va a BUSCAR** mercadería ya hecha (como Moreno),
no una fábrica a la que se le pide fabricar, y que **todavía no sabe** si va a subir su Excel
de existencias.

### Qué estaba mal antes de agregarlo
La marca del producto era `x.chk='im'` a secas: «hay, pero hay que ir a buscarlo». El almacén
no se guardaba en ningún lado porque **había uno solo**, y todos los textos decían «IM» o
«Moreno» fijo: la lista de carga, la tarjeta del chofer, «Mis pedidos», la tabla de
Administración, el Excel que se manda por correo y la revisión automática. Agregar un segundo
almacén sin tocar eso habría mandado al chofer a Moreno a buscar algo que está en Banzer.

### Lo que se hizo
- **El almacén viaja al lado de la marca**: `x.chkDe`. Vacío = IM, como siempre, así que
  **nada de lo ya marcado cambia y no hay que migrar nada**. Va DENTRO del producto, como
  `prodEn` y `precio`: viaja en el JSON de productos, sin columna nueva ni reimplementar el
  Apps Script.
- **Un botón por almacén** en la ficha (`recogerLista`): 📥 IM (el de siempre) + cada almacén
  que aparezca al subir un Excel de existencias + los de `RECOGER_EXTRA` (hoy, `Banzer`) que
  todavía no estén. Sin repetir: si el Excel de Moreno ya está cargado, no sale un segundo
  botón para el mismo lugar (`vistos` arranca con `im` y `moreno`).
  · Tocar OTRO almacén **cambia de lugar**; tocar el MISMO **desmarca** (`setProdChk` compara
  marca Y almacén).
- **Todos los textos nombran el almacén real**: `recogerCorto(x)` en la lista de carga, la
  tarjeta del chofer, «Mis pedidos», el ícono del producto y el Excel; `recogerLugaresTxt(p)`
  donde se habla del pedido entero (estado «Recoger de Banzer + IM», badge de la tabla,
  resumen debajo de los productos).
- **La revisión automática reparte POR ALMACÉN** (`imAlm` + `tomarIM` en `stockAsignar`):
  prioriza el almacén que ya estaba marcado a mano y después el que más tenga, para que una
  línea se vaya a buscar a **un solo lugar** siempre que alcance. Guarda de cuál salió
  (`l.alm` → `x.chkDe` al aplicar) y la lista para ir a buscar dice el almacén por producto
  (`revStkAlmTxt`: «IM», «Banzer», o «IM 2 + Banzer 1»).
  ⚠️ Si `enOtros` trae unidades pero no vino el desglose `otrosAlm`, se tratan como las de
  siempre (IM): nunca se pierde stock por no saber de dónde sale. Sin esa guarda, el stub de
  `tests/test_stock_revisadas.cjs` (que arma `{deposito:1, enOtros:1}` sin `otrosAlm`) dejaba
  de repartir.
- **El celular**: la tira de botones tenía `flex:none`, así que con seis botones (dos
  almacenes y dos fábricas) se iba **fuera de la pantalla** y 🏭 MORENO y 🏭 MULTI quedaban
  sin tocar. Con `flex:0 1 auto;min-width:0;max-width:100%` y `wrap` bajan solos a la línea de
  abajo. Verificado con captura a 412 px.
- ⚠️ **`heredarMarcas` tiene que heredar TAMBIÉN el almacén** (encontrado al revisar, antes de
  que lo viera nadie): esa función es la que conserva las revisiones cuando se guarda el
  pedido desde el formulario (§4cw). Copiaba `chk`, `enProd`, `prodEn` y `klead`… y no
  `chkDe`. O sea: alguien corregía la dirección de un pedido y el producto quedaba marcado
  «hay que ir a buscarlo» **pero sin almacén = IM otra vez**, y el chofer iba al lugar
  equivocado sin que nada lo avisara. Se hereda pegado a `chk` (`if(v.chk==='im' && v.chkDe)`)
  y solo mientras la marca siga siendo «recoger»; si cambia la cantidad, la marca entera se
  cae como siempre y el almacén con ella. Sección 5 del test.

### Si algún día sube el Excel de Banzer
No hay que tocar nada: el almacén aparece solo en el botón con su nombre real (el del Excel
gana sobre el de `RECOGER_EXTRA`), entra en `enOtros`, la revisión automática lo reparte y
«🚚 Programar recogida» ya elegía el almacén de origen desde `otrosAlm` (§4cr). Mientras
tanto el botón sirve para marcarlo a mano, que es lo que pidió.

### La revisión del 21/09: 13 cosas más, y una que se rompía HOY
El dueño pidió revisar el botón nuevo («que no produce errores con algo y todo funciona bien
igual que los demás»). Dos revisiones en paralelo —una sobre el botón y el circuito de
marcar, otra sobre el reparto— encontraron **trece** cosas. Lo numérico estaba bien y lo
sigue estando: con UN almacén, 397/400 escenarios al azar idénticos al panel de `a5de88a`
(los 3 que difieren, solo en `cambia`/`contra`, a propósito); con DOS, 381/400 (los 19, lo
mismo). Todo lo encontrado era **de dónde sale cada unidad y qué se muestra**.

1. **🔴 IM y «Industrias Moreno» eran dos lugares distintos, con el único Excel de hoy.**
   La revisión automática guardaba en `chkDe` el nombre crudo del Excel
   (`IM - PRODUCTOTERMINADO`, que `stockAlmNombre` llama «Industrias Moreno») y el botón
   guardaba `''`. Resultado, sin Banzer ni nada: un pedido con una línea marcada por el panel
   y otra a mano decía **«Recoger de Moreno + IM»** —dos viajes al mismo galpón—, la lista de
   carga pasaba de «RECOGER IM» a «RECOGER MORENO», en la ficha **no quedaba ningún botón 📥
   encendido** y había que tocar dos veces para apagar una marca. Ahora **todo** lo que
   compara o guarda un almacén pasa por `recogerCanon` (IM/Moreno → `''`, el vacío de
   siempre) y `recogerMismo`.
2. **🔴 Una línea repartida entre dos almacenes se mandaba a buscar entera a UNO.** `tomarIM`
   sacaba de varios y devolvía el nombre del que más puso. Con 3 en Moreno y 1 en Banzer, un
   pedido de 4 decía «📥 RECOGER MORENO × 4»: el que iba volvía con 3, el pedido salía
   incompleto y el panel seguía creyendo que estaba cubierto (la unidad de Banzer ya estaba
   reservada, así que tampoco le quedaba a otro). Pasaba en ~8% de los escenarios al azar.
   Ahora `tomarIM` devuelve el **desglose entero** (`por`), la línea lo guarda (`almPor`) y
   al aplicar, si salió de dos lugares, el producto guarda **`x.chkDes`** (`[{de,u}]`) y todo
   dice «IM 3 + BANZER 1».
3. **El «que más tenga» no se recalculaba**: `imAlm` se ordenaba una sola vez y las unidades
   se descuentan sobre esos mismos objetos, así que una línea que entraba **entera** en un
   almacén se partía igual. Ahora se ordena en cada llamada y antes que «el que más tenga»
   va **«el que la cubre entera»**: un viaje en vez de dos.
4. **El botón decía «Banzer» y el Excel dirá «01-05-006 ALMACEN BANZER».** Con la comparación
   cruda, el día que suban ese Excel **toda marca puesta a mano quedaba huérfana**: el botón
   no se veía encendido, tocarlo re-marcaba, y la reserva se descontaba de Moreno mientras el
   pedido seguía diciendo Banzer. `recogerMismo` acepta que un nombre contenga al otro (tope
   de 4 letras para que «IM» no se parezca a cualquier cosa) y `recogerLista` no duplica el
   botón.
5. **Cambiar de almacén no contaba como cambio** (`cambia=(antes!==ahora)`): la tabla proponía
   «recoger de Moreno» sobre una línea marcada en Banzer y **Aplicar no tocaba nada**. Ahora
   `cambia` mira también el lugar (`recogerMismosLugares`), así que se propone **y** se aplica.
   ⚠️ Esas líneas ahora cuentan además como «⚠️ cambia lo marcado a mano», que es la verdad.
6. **La columna «Estaba» decía siempre IM**: `almAntes` se calculaba y no lo usaba nadie.
7. **El desglose de «✗ no hay» decía siempre IM**: cuando no alcanza se limpia la reserva y
   con ella se iba el nombre. Ahora la **mirada** guarda su propio desglose (`hayIMPor`), así
   «de 3: 2 recoger de BANZER · 1 hay que fabricar» dice la verdad.
8. **Una marca a mano sobre un almacén vacío se servía del otro en silencio.** Se sigue
   reservando —las unidades existen— pero ahora el panel lo **dice**: `stockAsignar` devuelve
   `almMal` y la pantalla de la revisión muestra un cartel ámbar con «dice X, está en Y».
9. **Textos con el almacén fijo**, los tres que faltaban: el **WhatsApp del grupo**
   (`envioProd` decía «📥 RECOGER DE IM» para cualquier almacén — es el mensaje que lee el
   que va a buscar) y su resumen de arriba; la **lista de carga**, que se contradecía sola
   («📥 1 por recoger IM» arriba y «📥 RECOGER BANZER» abajo, en la misma pantalla); y el
   botón «📋 Lista para ir a Moreno».
10. **🚚 Programar recogida**: el título salía de `d.otrosAlm[0]` («de Industrias Moreno»
    aunque el producto esté solo en Banzer) y el desplegable decía «hay 4 allá» sumando
    almacenes, para después rebotar con «ningún almacén tiene esa cantidad libre». Ahora dice
    «3 en Moreno · 1 en BANZER».
11. **Una recogida vieja sin `de:`** se restaba del PRIMER almacén de la lista, que con dos
    cargados puede ser Banzer. `stockAlmPorDefecto()` devuelve el de Industrias Moreno.
12. **El celular, otra vez**: con un tercer almacén de nombre largo la tira se salía de la
    tarjeta a 360 px. El botón muestra el nombre recortado a 12 letras (el entero queda en el
    `title` y en el renglón de ayuda).
13. **`heredarMarcas` también hereda `chkDes`**, no solo `chkDe`.

⚠️ **Lo que NO se tocó**: `stockAlmCorto`/`stockAlmNombre` siguen diciendo «Industrias
Moreno» en la tabla de stock. La unificación con IM vive **solo** en las funciones `recoger*`,
que son las del «hay que ir a buscarlo».

### 🥇 El orden lo dictó el dueño: acá → Banzer → IM (21/09)
Al preguntarle si el circuito andaba bien, aclaró dos cosas. La primera, el mapa mental:
**«MORENO ES LA FABRICA Y TB ALMACEN»** — para el panel son dos cosas distintas y ahí no se
mezclan nunca (📥 IM = hay hecho, hay que ir a buscarlo · 🏭 MORENO = se le pidió a la
fábrica que lo produzca), pero es el mismo Moreno.

La segunda, textual y **es una regla, no una sugerencia**:

> *«la idea es tener primero a la mano en fabrica que es de donde salen los camiones, luego
> banzer y si no hay pedir fabricar a im o recoger de im»*

O sea: **1º acá en fábrica** (el depósito de logística, de donde salen los camiones) → **2º
Banzer** → **3º IM**. La lógica: IM es la FÁBRICA además del almacén, así que su stock es el
colchón que repone a todo lo demás y se gasta al final; lo de Banzer está parado sin hacer
nada y conviene sacarlo de ahí.

- El paso 1 ya estaba: el depósito se descuenta **antes** de llamar a `tomarIM` y eso no
  cambió.
- Lo que sí cambió es el desempate entre los almacenes de recoger. Antes era «el que más
  tenga»: con Banzer 4 e IM 5 mandaba a **IM**. Ahora, en `tomarIM`, el orden es
  **`pref` → el que la cubre entera → el que NO es IM → el que más tenga**.
- ⚠️ «El que la cubre entera» sigue **antes** que «IM último»: con Banzer 1 e IM 5 y una
  línea de 2 va entera a IM. Partirla 1+1 serían dos viajes para dos colchones.
- Ejemplos verificados (sección 11 de `tests/test_banzer.js`): `Banzer 4 · IM 5 → pedido 2`
  = Banzer 2 · `Banzer 1 · IM 5 → pedido 2` = IM 2 · `Banzer 4 · IM 5 → pedido 7` = Banzer 4
  + IM 3 · `acá 3 · Banzer 4 · IM 5 → pedido 5` = 3 de acá + Banzer 2.
- ⚠️ **Esto cambia de qué almacén sale cada unidad, NO cuánto.** Verificado: 388/400 y
  397/400 escenarios al azar dan lo mismo que el panel anterior, y los que difieren lo hacen
  solo en `cambia`/`contra`.

También preguntó por los nombres de los botones (📥 IM vs 🏭 MORENO) y **no quiso cambiarlos**:
quedan como estaban.

### 🔴 El nombre real del almacén casi rompe todo (21/09, con el reporte en la mano)
El dueño mandó el **PDF del reporte de existencias de Banzer** («EXISTENCIAS ALMACEN AL
21/09/2026»). Ahí apareció el nombre de verdad, que yo había adivinado mal:

> `01-05-025  Almacen Distribucion Banzer`  ← **27 letras, y dos espacios tras el código**

`stockAlmCorto` recortaba a 22 letras por la derecha: quedaba **«Almacen Distribucion …»**,
o sea **sin la palabra Banzer**. Medido antes del arreglo:
`recogerMismo('Banzer', '01-05-025  Almacen Distribucion Banzer')` → **false**.

El día que subiera ese Excel, sin tocar nada más, habría pasado esto:
- **dos botones** en la ficha para el mismo lugar: 📥 Banzer y 📥 Almacen Distr…;
- la tarjeta del chofer y la lista de carga diciendo «RECOGER ALMACEN DISTRIBUCION …»;
- y lo peor: **toda marca puesta a mano como «Banzer» quedaba huérfana** — el botón no se
  veía encendido y la reserva se descontaba del OTRO almacén, con el pedido apuntando a
  Banzer. Exactamente el agujero de §4ey punto 4, que creía cubierto.

Dos arreglos:
1. **`stockAlmCorto` saca primero las palabras que no distinguen nada** (`ALM_GENERICAS`:
   ALMACEN, DEPOSITO, DISTRIBUCION, SUCURSAL, artículos) y recorta **después**, solo si
   todavía no entra. «Almacen Distribucion Banzer» → **«Banzer»**; «ALMACEN DISTRIBUCION
   MUTUALISTA» → «MUTUALISTA».
   ⚠️ **NO van ahí «PRODUCTOS» ni «TERMINADOS»**: sacarlas dejaba el almacén de logística
   («01-05-003 PRODUCTOS TERMINADOS FAB.») como **«FAB.»**, que no le dice nada a nadie.
   Hay un check que lo cuida.
2. **`recogerClave` va por el nombre ENTERO** (`normNombre(stockAlmLimpio(nm))`) y no por el
   corto. El corto puede venir recortado, y entonces dos almacenes largos parecidos caen en
   la misma clave —o el mismo almacén escrito de dos formas cae en claves distintas, que es
   lo que dejaba huérfana la marca—.

Sección 12 de `tests/test_banzer.js` (55 checks), con el nombre real del reporte.

### Lo que el dueño aclaró del stock de ROHO
> *«ojo que aveces hay en multiespumas o banzer pedic, flex y etc, porque se sacaron del
> almacen de moreno para tener cerca en multiepsumas y la banzer»*

Es una advertencia sobre **dónde ESTÁ** un colchón, no sobre **dónde se HACE**, y el panel ya
no los mezcla: la fábrica sale de `MARCA_FABRICA` (FLEX/PEDIC → Industrias Moreno, para «Qué
producir») y el lugar sale de `STOCK.g` + `x.chkDe` (para ir a buscarlo). El reporte lo
confirma: en Banzer hay existencias de varias líneas ROHO (Pillow Pedic, Pillow Flex, Forte
Flex, Dynamic Pedic, Memory Flex, Eco Flex, Somier Roho Pedic, Somier Parrilla Flex).
Fabricadas en Moreno, guardadas en Banzer: las dos cosas a la vez, y correcto.
⚠️ **Las cantidades no se anotan acá**: el repo es público (ver el aviso del final).

📌 **Pendiente menor**: si en **Multiespumas** también queda stock para ir a buscar, hoy no
tiene botón (`RECOGER_EXTRA` solo trae `Banzer`). Aparece solo si se sube su reporte de
existencias; si no, hay que agregarlo a mano ahí. ⚠️ Ojo que un 📥 MULTIESPUMAS quedaría
pegado al 🏭 MULTI en la misma fila — el mismo choque de nombres que 📥 IM / 🏭 MORENO.
**Preguntarle antes de agregarlo.**

⚠️ **El reporte llegó en PDF y el panel lee el Excel.** 📥 Subir existencias parsea el XML que
escribe el generador de Moreno (§4cp), no un PDF. Para cargarlo hay que **exportar el mismo
reporte como Excel**. El PDF sirvió igual: de ahí salió el nombre real del almacén.
⚠️ El PDF y sus cantidades viven **solo en el scratchpad**: el repo es público y el
inventario real no va ahí (ni en fixtures, ni en commits).

### Tests
`tests/test_banzer.js` (45 checks): botones, marcar/cambiar de lugar/desmarcar, que lo viejo
siga diciendo IM, los textos en las seis pantallas, que la marca viaje a la planilla, el
reparto por almacén, el caso de dos pedidos donde cada uno va a un almacén distinto, que
**corregir el pedido desde el formulario conserva el almacén** (y que cambiar la cantidad
borra marca y almacén juntos), y las secciones **6 a 10** de la revisión del 21/09: IM y
Moreno son un solo lugar con el único Excel de hoy, una línea repartida nombra los dos
almacenes de punta a punta (línea → producto → planilla → lista de carga), cambiar de almacén
se propone **y** se aplica, el aviso de la marca que apunta a un almacén vacío, el nombre del
botón contra el del Excel, y el WhatsApp del grupo. ⚠️ Los helpers del test están envueltos en
`typeof …==='function'` para que contra un panel viejo salgan **rojos legibles** en vez de
reventar el test entero. `test_revstock` pasó a 37 (el mensaje para copiar ahora dice de qué
almacén sale cada renglón).

## 4ex. Sábado: «mañana» es el lunes, no el domingo (2026-09-20)

Bloque 9b de §4es (§4er Entregas BAJA «con impacto real los sábados a la noche»). El domingo
no se entrega —el panel lo sabe: `limTurno` da 0 y el formulario no lo deja agendar—, pero
`tomorrowStr()` no lo saltaba: un sábado a la tarde el chofer veía «No tenés entregas para
mañana (20/09)», la lista de carga y la hoja de ruta «0 pedidos · mañana 20/09», el mensaje al
grupo «PEDIDOS DE MAÑANA · domingo 20/09 … Todavía no hay pedidos cargados», con dos
entregas el lunes. No había forma de ver ni mandar lo del lunes salvo «Todos».

- **`proximoDiaEntrega()`** = mañana, y si es domingo, el lunes. ⚠️ Los días cerrados por
  Administración NO se saltean: ese camión existe, solo que ya está armado.
- Reemplaza a `tomorrowStr()` en **25 lugares**, todos de ENTREGA: chips «Mañana» del chofer y
  de Mis pedidos (y sus textos vacíos), lista de carga (`cargaLista`, `cargaDiaKey`, etiqueta,
  «recoger de fábrica», «· mañana»), hoja de ruta (lista y etiquetas), mapa (`mapaEntra`),
  faltantes, parte del día, WhatsApp «pedidos de mañana» (`envioFecha`), Excel «Mañana»
  (`exportScopeInfo`), el botón «Mañana» de reprogramar, la fecha por defecto de la
  devolución de una ATC, la revisión de stock «mañana», y las estadísticas de cupos (que
  ahora dicen «Cupos el lunes 21/09/2026 · 🌅11 🌆12» cuando no es literalmente mañana).
- **Siguen con `tomorrowStr()`** a propósito: el mínimo del formulario (el domingo lo frena el
  portero, y así la vendedora ve el mensaje de siempre), «Cerrar día», la fecha de una recogida
  de Moreno (no es una entrega) y el importador de ROHO («desde mañana»).
- `tests/test_sabado.js`: reloj clavado en el sábado 19/09/2026 18:00 con dos entregas el
  lunes 21 (chofer, Mis pedidos, carga, ruta, faltantes, WhatsApp, parte, Excel, mapa,
  estadísticas), un martes de control, y el formulario sin cambios. Contra `750229c` da 5/9.

## 4ew. Los MEDIA y BAJA de §4er del panel, trece de una vez (2026-09-20)

Bloque 9a de §4es. Trece hallazgos chicos, todos en `pedidos.html`, cada uno con su escenario
en `tests/test_medias.js` (23 checks; `PEDIDOS=…` para los dientes: contra `1e1d4ce` da **3
bien · 20 mal**).

### Entregas
- **La plata cobrada por el chofer en Bs 0 desde otra compu** (MEDIA): cinco cuentas sumaban
  `p.cobradoBs`, que no tiene columna en la planilla (vive solo en el navegador que hizo el
  cobro): la métrica «Cobrado» del chofer, la rendición por chofer de Administración, el parte
  del día (pantalla y WhatsApp) y el reporte. Ahora suman `totalCobrado(p)` (el historial),
  como ya hacían `agruparPorCamion`/`envioDatos`. ⚠️ `test_chofer` cambió una expectativa:
  la rendición del fixture da 2.400 (1.500 del chofer + 900 del QR que está en el historial
  de la otra venta), no 1.500 — antes ese QR no se veía porque no tenía `cobradoBs`.
- **«👑 Ver todos» anotaba el efectivo en la mano del nombre del desplegable** (MEDIA-BAJA):
  `choCobrarMetodo` usaba `select.value || p.chofer`; con «Luis Pierre» recordado y «Ver
  todos» activo, un cobro sobre un pedido de Jonathan quedaba «>Luis Pierre» en el Cuadre. En
  modo todos manda `p.chofer`.
- **La foto de la entrega se perdía por conflicto** (MEDIA): achicar y subir tarda 30-90 s;
  si mientras tanto Contabilidad registró el pago (rev 3→4), el `persistPedido` de la foto iba
  con el sello viejo → `conflicto` → `rechazoFirme` pisaba con la fila del servidor, la foto
  no quedaba en ningún lado (archivo huérfano en Drive) y el chofer ya había visto «Foto
  guardada ✓» (salía antes de la respuesta). Ahora `onFotoElegida` pega la foto sobre la copia
  más nueva de STATE, **reintenta UNA vez** sobre la fila del servidor si hay conflicto (la
  foto es un dato aditivo: no hay nada que «volver a hacer»), y el «✓» sale recién con el
  `ok`; si no, cartel rojo «la foto subió pero NO quedó en el pedido».
- **Cambiar solo el turno en un día cerrado** (MEDIA): el panel decía «✓» y el servidor «❌
  está cerrado» (`porteroFecha_` mira `diaCerradoGs` aunque la fecha no cambie). `cambiarTurno`
  manda `{forzar:true}` cuando `diaCerrado(p.fecha)`, pidiendo la clave de administración si
  el servidor tiene la del equipo puesta (`asegurarClaveAdmin`, hoy pasa de largo: no hay
  `PANEL_KEY`).
- **«Quitar la devolución» de una ATC** (MEDIA): vuelve al día del recojo, que ya pasó (o está
  cerrado): el portero contestaba `dia_cerrado`/`cupos_llenos` y la devolución seguía
  programada en la planilla. Va con `forzar` cuando el destino es pasado o cerrado.

### Contabilidad
- **Tras «Registrar pago», la ventana y el WhatsApp mostraban el flete** (MEDIA): el índice
  era `contaPagos(p).length-1` y los recargos van al final: con un flete cobrado antes, la
  ventana decía «el recargo ya quedó guardado · Bs 50» por un pago de 700 (e invitaba a
  registrarlo dos veces). Ahora `(anticipoDe(p)?1:0)+cobrosDe(p).length-1`.
- **Cuadre filtrado por vendedora vs. arqueo global** (MEDIA): la pantalla ya lo evitaba
  (`arqueoOn=!vendSel`); `cuadreTexto` y `exportCuadre` no: el WhatsApp decía «⚠️ sobra Bs
  600» y el Excel escribía contado 1200 / diferencia 600 con lo de una sola vendedora. Ahora
  los dos usan la misma regla y lo dicen («solo lo de Carola — el arqueo se hace con Todos»).
- **Borrar un retiro no miraba la respuesta** (MEDIA): `apiDelete(id)` sin `then/catch`:
  «Retiro borrado» y volvía con la próxima lista (y el `reject` salía como error JS). Ahora
  el «Retiro borrado» sale con el `ok`, y con `{ok:false}` o sin red avisa que va a
  reaparecer.
- **«Registrar pago» aceptaba fecha a futuro** (BAJA): mismo freno que «Corregir».

### Administración
- **🔄 Actualizar sin tope** (MEDIA): `loadFromServer` hacía `flushPending().then(apiList)`
  sin `conTopeDuro`; un `fetch` colgado dejaba el botón «Cargando…» para siempre. Ahora va con
  `CARGA_TOPE` y `motivoDeError`, como `refrescarEstado` (§4ds).
- **El aviso de reposiciones vs. el filtro Mes** (MEDIA): `rptAtrasadas` recorre todo STATE
  pero el chip y la tabla van por `admBaseList` (Mes/Día): «1 sin entregar» y la tabla vacía.
  El botón ahora es `admVerRptAtrasadas()` = filtro `rpt` + «Todo».
- **«Hay» del plan con depósito negativo** (BAJA): `max(0, deposito+enCamino+enOtros)` se
  comía lo de Moreno; ahora `max(0,deposito)+enCamino+enOtros`, como `stockCuantoPedir`.
- **El buscador de la tabla no sacaba acentos** (BAJA): `sinTildes()` (NFD sin diacríticos,
  minúsculas) sobre la consulta y el pajar: «perez» encuentra a PÉREZ, «colchon» al COLCHÓN.

### El dashboard: `generar.py` cortaba el mes en UTC (Kommo BAJA de §4er)
`m_start`/`m_end`/`p_start`/`p_end` eran datetimes «naive» y `.timestamp()` los interpreta en
la zona del runner (UTC en GitHub Actions): el mes empezaba y terminaba a las 20:00 del día
anterior en Bolivia, así que un lead cargado el 30 a las 22:00 caía en octubre. Ahora llevan
`tzinfo=BOL_TZ` (UTC−4): el epoch es el mismo en cualquier máquina (verificado: 1/9 00:00
Bolivia = 04:00Z). Todo lo que usa esas fechas lo hace por `.timestamp()` (y `wide_start`
sale de `m_start`, así que también). `tests/test_duplicados.py` (importa `generar`) 21/21 y
`test_kommo.py` 29/29. Efecto: el próximo panel puede mover una o dos ventas de borde entre
meses respecto del anterior — es la corrección, no un error.

### Lo que se probó, y una trampa del test
`tests/test_medias.js`: 23 checks, un escenario por hallazgo, más las suites del área (chofer
18, chofer_efectivo 35, cuadre 33, compconta 29, mispedidos 33, cerrardia 21, carga 39, tabla
30, stock 106, resumen 29, plata 11, banco 16, finmes 17, humo 40, conflicto 43, noborra 35).
⚠️ `showView(...)` dispara un refresco cuya foto de STATE/RETIROS es de ANTES de lo que el
test arma después: sin un `await` de 120 ms entre el `showView` y el fixture, el `list` tardío
pisaba el cobro recién hecho y el segundo retiro «no existía». Es §4eo en el propio test (el
doble de `apiSave` no anota `SAVE_ULTIMO`, así que la protección no corre).

## 4ev. Administración y stock: la fila en vuelo, la recogida del Excel y el plan sin Eduardo (2026-09-20)

Bloque 8 de §4es: los tres hallazgos 🔴 ALTA de Administración de §4er, más dos MEDIA que
salen del mismo mecanismo (la fila del sistema en cola que se colaba en STATE, y el arqueo del
Cuadre que un `list` en vuelo pisaba — este último era de Contabilidad). Todo en `pedidos.html`.

### 1. La fila `__stock__` en vuelo la pisaba cualquier `list`
- **Qué pasaba**: se anota una recogida de 5 (`guardarStockRecogida` → `guardarStock` →
  `apiSave`, que tarda segundos con la hoja cargada). En el medio entra un refresco
  cualquiera (el tic de 2 min, entrar al formulario, un rechazo, abrir «Cerrar día»…):
  `leerCierresDeLista` hacía `STOCK=leerStock(stk)` con la fila VIEJA y la recogida
  desaparecía de la memoria. El servidor sí la recibía — pero la siguiente anotación (otra
  recogida de 2) se guardaba desde la memoria pisada y **borraba la primera en el
  servidor**. `mergePending` protegía los pedidos (§4eo) y los retiros, no el stock; y
  `autoOcupado` no miraba `stock-overlay`, así que el tic refrescaba con el stock a la vista.
- **Arreglo**: `filaSistemaEnVuelo(id)` = `saveReciente(id)` (en vuelo, en espera, o guardado
  hace menos de 90 s) o la fila en la cola sin enviar. `leerCierresDeLista` no reemplaza
  `STOCK` mientras eso valga (pasados los 90 s, manda el servidor), y `autoOcupado` incluye
  `stock`. **El arqueo** (`ARQUEO_ID`) tiene la misma guarda: contabilidad anotaba
  Efectivo=600, el `list` en vuelo traía 1000, la pantalla decía «sobra Bs 400» y la
  siguiente anotación mandaba el 1000 (§4er Conta MEDIA 5).
- **La fila en cola** (§4er Adm MEDIA H5): con el servidor `busy`, `guardarStock` la dejaba
  en la cola; el refresco sacaba la del servidor de la lista y el `concat` de `mergePending`
  metía la de la cola en `STATE`: Administración en «Todo» dibujaba «📦 STOCK DEL DEPÓSITO —
  fila del sistema, NO BORRAR» como un pedido más. Ahora el `concat` filtra `esFilaSistema`
  (los retiros ya se suman a `RETIROS` arriba).

### 2. La recogida «dada por llegada» desde el Excel no se descontaba de Moreno
- **Qué pasaba**: Moreno 10, recogida programada de 5 (acá 2, en camino 5, libres allá 5 =
  12 reales). Llegan; logística sube su Excel con 7 y deja tildado «Darlos por llegados» →
  `confirmarImportExist` cerraba la recogida (`q.r`, `enConteo`) sin tocar
  `STOCK.g[de].u[k]` → `stockLibreOrigen` dejaba de restarla → Moreno volvía a 10 y el panel
  veía 7 + 10 = **17**: «🚚 Traer de Moreno» unidades que no están, la revisión automática
  reservando de allá lo que no existe, y «Qué producir» produciendo de menos hasta el próximo
  Excel de Moreno. `recibirStockPedido` («Llegaron») sí restaba.
- **Arreglo**: al cerrar un `q.tipo==='recogida'` desde el Excel se resta lo pendiente de
  `STOCK.g[q.de].u[q.k]` (con piso 0), igual que «Llegaron».

### 3. El plan del mes contaba a Eduardo y a los pedidos puntuales
- **Qué pasaba**: `ventasPanelIndex` (la historia mensual del panel para las estimaciones de
  60 d / 90 d / tendencia del rango, §4du) excluía ATC y RPT pero no `stockPedidoUnico`
  (Eduardo, MULTICENTER/consignación, ROHO a tienda). Con una venta única de 40 de Eduardo en
  agosto, «producir en octubre» del TITANIO ICE pasaba de 9 a 24 con el mismo ritmo de 30
  días, y el cartel decía «sin Eduardo». Contradecía §4dj y la pantalla.
- **Arreglo**: `ventasPanelIndex` saltea `stockPedidoUnico(p)` (que ya incluye las RPT). La
  cabecera del cuadro ahora dice la verdad entera: «sin Eduardo, pedidos puntuales ni
  reposiciones de tienda; productos con 3+ entregas, algo vendido sin entregar, o ventas el
  mismo mes del año pasado» (ese último grupo entraba y el cartel no lo decía).
- **No se tocó** (PLAUSIBLE del revisor, es decisión de diseño): un mes ≥ 2026-08 sin ventas
  en el panel se sigue tomando como «sin dato» y no como 0. Cambiarlo baja las estimaciones
  de 60/90 d de los productos que no vendieron en agosto, y no tengo cómo verificar que
  agosto esté completo en el panel. Si el dueño lo confirma, es una línea en `stockRangoMes`.

### Tests
`tests/test_adm_alta.js` (Playwright, 18 checks, reloj clavado en el 20/09/2026 por las
ventas de agosto del fixture; `PEDIDOS=…` para los dientes: contra `b632321` da **9 bien · 9
mal**). ⚠️ Los escenarios «en vuelo» usan el `apiSave` REAL y simulan solo `apiPost`: el
doble de `apiSave` de los tests no anota `SAVE_ULTIMO`, y con él la protección de §4eo no
existe (el primer intento reventó por eso). Las suites del área siguen igual: stock 106,
existencias 55, revstock 37, rotación 32, identidad 45, tabla 30, resumen 29, conflicto 43,
cuadre 33, guardado 14; `test_producir` sigue con sus 6 rojos viejos (§4er, pendiente 9).

## 4eu. Contabilidad: cuatro formas de perder plata anotada, arregladas (2026-09-20)

Bloque 7 de §4es: los cuatro hallazgos 🔴 ALTA de Contabilidad de §4er, reproducidos por el
revisor con `rev_conta/repro.js` y ahora cubiertos por `tests/test_conta_alta.js`. Todo en
`pedidos.html`; nada del servidor.

### 1. Editar el pedido borraba el flete YA COBRADO
- **Qué pasaba**: con una parte del flete cobrada (`^Efectivo 50 @… #700 %FL1`, con su
  comprobante) y otra pactada sin cobrar (`^100`) —el estado que deja «✏️ Cambiar lo que
  falta cobrar» de la ficha—, el formulario muestra el TOTAL (150) y «NO» en «¿ya lo
  cobraste?». `submitPedido` tomaba el PRIMER renglón (el cobrado), lo veía «cobrado» con el
  segmento en NO, le sacaba método, fecha, recibo y foto y le ponía 150: con solo corregir la
  observación, Bs 50 desaparecían del Cuadre, el comprobante quedaba huérfano y al chofer se
  le mandaba a cobrar 150.
- **Arreglo** (`submitPedido`, bloque del recargo): `cobrados` y `pactados` por separado.
  Con las dos cosas, los cobrados quedan tal cual y el formulario solo mueve lo pactado
  (`monto − envioCobrado(prev)`; si no queda nada, sin pactado). El SI/NO sigue valiendo para
  el renglón único: sin nada cobrado, «SI» lo cobra ahora (método del pago, hoy, nota,
  imágenes); con TODO cobrado, «NO» lo deshace, como siempre. En el estado mixto, «SI»
  cobra AHORA lo que faltaba (queda un segundo renglón cobrado) y no toca el anterior.
  **Vaciar el campo saca lo pactado, nunca lo cobrado.** `pintarEnvioCobrado` lo dice al
  editar: «Ya entraron Bs 50 de flete (no se tocan desde acá)».
- **El que apareció probando** («todo cobrado abre en SI» dio rojo también en el panel
  nuevo): `editPedido` marcaba `f-envio-cob` y llamaba `pintarEnvioCobrado()` ANTES de
  `updateMetodoVisibility()`, y `pintarEnvioCobrado` fuerza «NO» si el bloque del método no
  está a la vista. Resultado: **un flete cobrado ENTERO abría en «NO», y guardar el pedido
  sin tocar nada le sacaba el método y el comprobante** (Bs 150 borrados). Mismo bug de
  orden que el del banco (§ comentario en `editPedido`). Ahora el segmento se marca después
  de mostrar el método.

### 2. Pago mixto «a cuenta»: «Guardar precios y montos» perdía el 2° método
- **Qué pasaba**: `p.acuenta` es TODO el adelanto (anticipo + segundo método, §4ej: así lo
  escribe y lo lee el formulario). La ficha muestra en «A cuenta» solo el anticipo
  (`anticipoDe`, 1.500) y `aplicarMontos` hacía `p.acuenta=acu` → 2.000 pasaba a 1.500 sin
  tocar nada. La próxima edición del pedido (acuenta 1.500, monto2 500) rehacía el historial
  con 1.000 + 500: **Bs 500 de efectivo fuera de todo cuadre**.
- **Arreglo**: `aplicarMontos` y la rama del anticipo de `ctaGuardarPago` vuelven a sumar el
  2° método (`mixtoDe(p)`): `p.acuenta = acu + mixto`. La ficha lo dice en el rótulo («solo el
  1er método: el 2° puso Bs 500 aparte»). Corregir el monto del anticipo (1.500 → 1.600) deja
  el A cuenta en 2.100 y el total de la venta igual (baja lo que falta cobrar, como siempre).
  ⚠️ Queda un hueco chico y a propósito: corregir el MONTO del 2° método desde la ficha no
  mueve `p.acuenta` (la rama de cobros no lo toca). Para cerrarlo habría que confiar en la
  heurística de `mixtoDe` (mismo día y mismo recibo) para escribir datos, y ese mismo criterio
  toma por «mixto» un saldo cobrado el mismo día con el mismo recibo. Si el dueño lo pide, se
  hace con una marca explícita en el renglón.

### 3. «Corregir» el cobro de una venta PAGADA SIN MONTO dejaba saldo −1.500
- **Qué pasaba**: venta vieja `pagado, saldo 0, 'Efectivo %IMG'` (sin `cobradoBs`, que no
  viaja). `ctaGuardarPago` congelaba el objetivo en `saldo + totalCobrado = 0` y forzaba el
  1.500 contra 0: saldo −1.500, «⚠️ Bs 1.500 de más» en la ficha y «exceso» en el Cuadre.
  «💵 Anotar el monto» hacía bien lo mismo.
- **Arreglo**: si el cobro que se corrige no tenía monto, el monto anotado ES el total
  (`objetivo = objetivoCobro(p) + monto`), igual que `ctaAnotarMonto`.

### 4. Corregir la fecha del anticipo de una venta pagada la desmarcaba
- **Qué pasaba**: venta cargada «SÍ, pagado» (`~Efectivo 1500 …`, `acuenta 0`, saldo 0).
  Corregirle solo la fecha (el camino que §4ei fomenta para arreglar el recibo) llamaba
  `aplicarCobros(p, [], 0)` → `p.pagado = total>0 && …` = **false**, y además `p.acuenta=1500`:
  la tabla decía «A CUENTA Bs 1.500», el resumen «Cobradas sin marcar pagadas: 1», el Excel
  PAGADO=NO, y el formulario ya no dejaba guardar ese pedido por nada («Hay pago a cuenta:
  poné el saldo por cobrar»). Variante: la venta vieja con A cuenta suelto + PAGADA sin monto.
- **Arreglo**: `aplicarCobros`: `p.pagado = total>=objetivo−0.01 && (total>0 || (anticipo>0 &&
  objetivo<=0.01))` — una venta cuyo precio entero fue el adelanto está pagada. El «deshacer
  cobro» del chofer no cambia (ahí el objetivo es lo que había que cobrar, > 0); y en una venta
  pagada entera con el adelanto ya no la deja «por cobrar Bs 0». Y la rama del anticipo no
  pisa `p.acuenta` cuando la venta estaba pagada con acuenta 0 (queda en 0 a propósito, §4cb).
  `aplicarMontos` tiene la misma guarda («Guardar precios y montos» sin tocar el adelanto).

### Tests
`tests/test_conta_alta.js` (Playwright, 29 checks; `PEDIDOS=/ruta/al/viejo.html` para los
dientes: contra `ab5e84a` da **8 bien · 21 mal**). Cubre los cuatro caminos con los fixtures
del revisor, más: subir/bajar/vaciar el flete, «SI» en el estado mixto, el flete entero que
abre en «SI» y se guarda sin tocar, el «deshacer» del chofer, «Anotar el monto» = «Corregir»,
y el A cuenta del mixto tras corregir el anticipo. Las suites del área (mixto 23, sinmonto 32,
compedit 32, compconta 29, cuadre 33, plata 11, consaldo 10, chofer_efectivo 35, guardado 14,
modif 38) siguen en verde.

### Lo que NO se tocó (BAJA de §4er, con motivo)
El fallback de `cobrosDe` para la venta «PAGADA sin monto» (§4er BAJA 9: adjuntar imagen al
anticipo hace desaparecer el aviso) NO se cambió como proponía el revisor (mirar solo que no
haya cobros no-anticipo): con esa condición una venta pagada entera con el adelanto
(`~Efectivo 1500 …`, el caso de §4cb) también caería en el fallback y la ficha inventaría un
«Efectivo 0» con el aviso «sin monto» sobre una venta perfecta. Queda para pensarlo con una
marca explícita.

## 4et. Kommo en el servidor: descartar descarta, el candado no espera a Kommo, el repaso de GitHub encola (2026-09-20)

Bloque 6 de §4es: los cinco hallazgos de §4er que viven en `google-apps-script.gs`, juntos
porque cualquiera de ellos exige que el dueño vuelva a implementar. `SCRIPT_VERSION` y
`SCRIPT_VERSION_ESPERADA` pasan a **`2026-09-20-a`**; hasta que el dueño haga Implementar →
Administrar implementaciones → ✏️ (la de siempre) → Nueva versión, el panel avisa «servidor
viejo» y todo sigue andando como hasta ahora.

### 1. «Descartar» no descartaba (§4er MEDIA)
- **Qué pasaba**: `descartarBorrador` → `apiDelete('kommo-<lead>')` borraba la fila, pero el
  lead seguía en «Compradores» con `updated_at` reciente; `kommoRepaso` (cada 5 min, ventana
  6 h) y el repaso de GitHub (12 h) lo veían como nuevo y lo volvían a crear. Reproducido: lo
  descartás, vuelve; lo descartás otra vez, vuelve otra vez.
- **Arreglo**: `doDelete` de un id `kommo-…` anota el lead en la propiedad `KOMMO_DESCARTADOS`
  (`{ lead: día }`, `kDescartar_`) y `kommoProcesarObj_` lo saltea como `descartado` sin
  preguntarle nada a Kommo (`kDescartado_`). Se olvida a los **60 días** (`KOMMO_DESCARTE_DIAS`):
  una venta que vuelva de verdad meses después entra sola; antes de eso la vendedora la carga a
  mano (y «Sí, es la misma» la cubre con `klead`). Tope **300** entradas (`KOMMO_DESCARTE_TOPE`),
  las más viejas se sueltan primero: 300 × ~14 caracteres entran holgado en los 9 KB de una
  propiedad. Se anota TODO borrado de `kommo-…` —también el de «Sí, es la misma»—, es inocuo:
  ahí `klead` ya lo cubre.
- ⚠️ La memoria vive en el **servidor** a propósito: el mirror de borradores del panel es por
  dispositivo, y el que descarta desde el celular no puede ser el único que no lo vuelve a ver.

### 2. El repaso «ya estaba» tomaba el candado y hablaba con Kommo adentro (§4er MEDIA)
- **Qué pasaba**: contra §4dt. Con TODOS los leads «ya estaban» (el caso de cada 5 minutos)
  `kommoProcesarObj_` tomaba el candado igual para no escribir nada, y `repararNombreBorrador_`
  (el borrador que quedó como «Lead #39357288») hacía hasta 2 llamadas de red **con el
  candado tomado**, en cada repaso, mientras el contacto siguiera sin nombre.
- **Arreglo**: `repararNombrePrep_` (afuera: mira la hoja y le pregunta a Kommo, devuelve
  `{id, nombre}` o null) + `repararNombreAplicar_` (adentro: vuelve a mirar la fila y escribe
  solo la celda del cliente). El candado se toma **solo si hay filas nuevas o nombres para
  escribir**. `borradorGenerico_` es la mirada común (fila, sigue borrador, nombre genérico).
  Si mientras se hablaba con Kommo la vendedora completó el borrador, adentro no se pisa nada.

### 3. El repaso de GitHub era síncrono (§4er MEDIA)
- **Qué pasaba**: `kommoLeads` armaba los borradores en el momento (hasta 4 llamadas a Kommo
  por lead). Con 9 leads el `urlopen(timeout=90)` de `traer_kommo.py` cortaba (run 101) y el
  registro decía «✗ El panel no aceptó el aviso» mientras el script seguía escribiendo la
  planilla a ciegas. Y un `ok:true` de OTRO camino (run 110, sin `ultimoHook`: PANEL_URL a
  otra implementación) pasaba como éxito.
- **Arreglo**: `kommoLeads` → `kommoEncolar_(ids, 'repaso')`: mismo camino que el webhook,
  encola, deja el disparador y contesta al instante con `diferido:true`, `encolados`, `cola`,
  `version`, `ultimoHook`, `ultimoRepaso`. Sin disparadores (ScriptApp sin autorizar) procesa
  en el momento, como antes. `traer_kommo.py` **exige `origen:'repaso'`** (si no, corta con
  error a la vista) y con `diferido` imprime «el panel encoló N ids» en vez de inventar
  «creados». Lo creado se lee en «último repaso del script».
  ⚠️ La sección 7 de `test_servidor.js` («Kommo antes del candado») ahora llama a
  `kommoProcesarCola()` a mano cuando la respuesta viene `diferido`.

### 4. `busy` vaciaba la cola del webhook (§4er BAJA)
- **Qué pasaba**: `kommoProcesarCola` y `kommoRepaso` hacían `kColaQuitar_(ids)` aunque
  `kommoProcesarObj_` hubiera devuelto `{ok:false, error:'busy'}`: los ids salían de la cola
  sin haberse escrito, y si además Kommo no contestaba en el repaso, la venta quedaba sin nada
  que la trajera hasta el repaso de GitHub (horas). El resumen `KOMMO_REPASO_ULTIMO` decía
  `creados:0` sin explicación.
- **Arreglo**: la cola se quita **solo si `r.ok!==false`**. `kommoProcesarCola` con busy deja
  la cola y otro disparador (`reintento`); `kommoRepaso` con busy deja la cola y lo dice en
  `error` («busy (la cola queda para el próximo repaso)»); si además la consulta a Kommo
  falla, los dos motivos se acumulan con « · » (antes el segundo pisaba al primero).
  `kommoProcesarObj_` con busy devuelve también `version` y `origen`.

### 5. El `busy` del hook quedaba en Rechazos como un «save» vacío (§4er BAJA)
- `doPost` envolvía TODO con `rechazoAnotar_`, incluido el aviso de Kommo (formulario, sin
  JSON): un `busy` del webhook quedaba como acción `save`, sin id ni cliente, y Administración
  lo leía como un guardado perdido de alguien. Ahora el camino de Kommo (`?k=`/`?kommo=`)
  devuelve `doPostCuerpo_(e)` directo: su rastro es `KOMMO_ULTIMO_HOOK` y la cola. Un guardado
  del panel con busy se sigue anotando igual.

### 6. Catálogo fijo (§4er BAJA)
- `borradorDeLead_` preguntaba SIEMPRE al catálogo `10902` y un elemento de otro catálogo
  (`metadata.catalog_id`) llegaba al panel con `desc:''`. Ahora agrupa los elementos por
  `catalog_id` (sin dato → `KOMMO_CATALOGO`), una consulta por catálogo, y `porId` va con la
  clave `catálogo:id`. El precio sigue igual: `metadata.price` y si no el campo
  `KOMMO_CF_PRECIO` (que es del catálogo de Productos; en otro catálogo puede no existir → sin
  precio, la vendedora lo pone).

### Tests
- `tests/test_servidor.js` **sección 10** (146 → **177** checks), adaptada de los reproductores
  del revisor: A descartar (anota, no vuelve, ni por GitHub, sin red, vence a los 60 días, no
  anota pedidos comunes, tope 300 y < 9 KB); B candado (ya estaba sin nombre: Kommo sin
  candado; con nombre: Kommo antes del candado y la celda escrita; todo con nombre: ni red ni
  candado; revalidación adentro); C busy (cola se queda, otro disparador, el resumen lo dice,
  al liberarse se procesa); D el busy del hook no va a Rechazos y el del panel sí; E catálogo
  por `catalog_id` con dos consultas; F repaso de GitHub diferido (sin red ni candado, cola +
  disparador, lista vacía, sin disparadores en el momento). **Dientes**: contra el `.gs` de
  `origin/main` la sección da 19 rojos, cada uno con el comportamiento viejo en el detalle.
- `tests/test_traer.py` (23 → **37**): respuesta diferida (termina bien, «encoló 2 ids», sin
  inventar creados, sin filtrar secretos), `ok:true` sin `origen` corta con error, `busy`
  falla a la vista. `test_hook.js` 78/78 y `test_kommo.py` 29/29 sin tocar.
- Contra un `.gs` viejo publicado, el panel solo muestra el aviso de versión: ninguno de estos
  cambios rompe la compatibilidad (el panel no manda nada nuevo).

### Para el dueño
Implementar → Administrar implementaciones → ✏️ en la implementación de siempre → Versión
«Nueva versión» → Implementar. **No** crear una implementación nueva (§4dm: estrena otra
dirección). Después, Actions → «Traer ventas de Kommo (respaldo)» → Run workflow tiene que
imprimir `versión 2026-09-20-a`.
