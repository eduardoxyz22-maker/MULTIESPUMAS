# BITÁCORA — Dashboard Heaven Colchones

Memoria de trabajo para Claude (y futuros mantenedores). Última actualización: **2026-10-02** (§4hi).
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

## 4iv. 09/10: 📋 Stock simple: la cinta «Hoy», el Plan de stock y lo demás plegado en «👁️ Más vistas» — PUBLICADA 09/10 10:27 (`68a5dc6`), Pages OK 10:28
- El dueño, con cinco capturas: *«stock y reposición quedó muy cargado… una dice pedir una cosa, la otra otra cosa… y logística en vez
  de saber qué pedir ya, en 7 días y 15 y el mes… va a estar más perdido»*. Se le mostró la muestra `plan-stock.html` (cinta con
  colchones + una tabla) y dijo: *«ok hazlo lo que acabas de mostrarme en el plan de stock»*.
- **Arriba, sin buscar**: la cinta **🛤️ Hoy** (`stockCintaHtml`, `#stk-cinta`): cuatro carriles (🚨 pedir ya · 🏭 esta semana · 📥 traer
  de Moreno · ⚠️ revisar), un colchón por producto con su cantidad (`cintaCant`, la misma de «Qué hacer»; el somier se dibuja como
  somier). Corre sola con 4 o más; se para al pasar el dedo y con «reducir movimiento». Tocar un colchón abre su fila del plan (`planVer`).
- **Después, siempre: 📋 Plan de stock** (`stockPlanHtml`, `#stk-plan`): una fila por producto con Producto · Hay (PTF·Banzer·Moreno) ·
  Vendido sin entregar · Se corta · Qué hacer hoy · Pedir 7 días · 15 días · el mes. **Todo sale de lo que ya existía**: «Qué hacer» =
  `sfAccion`, «Se corta» = `sfReloj`, 7 días = `o.fabricar`, 15 días y el mes = `stockProducir` (las mismas cifras de «Qué producir»).
  Ordenada por urgencia (`SF_ORDEN`), chips por grupo (`PLAN_GRUPO`), 40 y «Ver todos». Tocar una fila abre el termómetro de ese
  producto (`stockTermoFila`) y botones (pedidos, historia, recogida). «📋 Copiar el pedido para fábrica» = `copiarStock()` de siempre.
  En el celular cada fila es una tarjeta.
- **Lo demás, plegado en `<details id="stk-mas">` «👁️ Más vistas»** (`visPref('masVistas')`, cerrado de entrada): avisos, revisión fija,
  Qué producir, galpones, ranking, tiendas, filtros, fichas, termómetro, catálogo, la tabla completa (sigue entera en `#stk-tabla-det`),
  plata parada y los otros almacenes. Nada se borró. `renderStockHoy` quedó sin uso.
- **Lo que se contradecía, arreglado**: «⚠️ Revisá el saldo» escondía la cantidad (ahora «· igual pedí N»); el termómetro no ponía 🚚 a un
  `revisar` con algo para fabricar; «vendidos» decía dos cosas (ahora «vendidos sin entregar»); el catálogo repetía la misma medida
  escrita de dos formas (`producirMedidaEtq`).
- `test_fichas_4ip` §10 (→ 60). Las pruebas que miran vistas plegadas abren `stk-mas` (`visPrefSet('masVistas',true)`):
  `test_visuales`, `test_vistas_4im`, `test_stock_detalle.cjs`.

## 4iu. 09/10: 🛍️ las bolsas fuera del stock — PUBLICADA 09/10 10:27 (`68a5dc6`), Pages OK 10:28
- El dueño, al ver «BOLSA PARA ALMOHADAS × 50» y varias «BOLSA PARA COLCHON» en «Pedir a fábrica»: *«las bolsas sacalas del
  stock»*. Son empaque. **`PROD_EMPAQUE=/^BOLSAS?\b/`** en `esTextoDeTienda` (la misma puerta que protectores y sábanas, §4cx: ni
  ficha, ni rotación, ni comprometido, ni fábrica, ni unidades de la proyección), solo si el nombre EMPIEZA con BOLSA: un colchón
  «… EN BOLSA» sigue siendo colchón. Un producto que se llama solo «A» (× 1 en «Pedir ya») sigue: es un renglón a medio escribir de la OC 09-291 (Maria Flores, entrega 09/10 AM); el dueño: *«quítalo de todos lados»* → el 09/10 ~10:40 se releyó la fila y se guardó sin ese renglón (sin código ni precio), con su sello, desde esta sesión; releída: quedan COLCHON ORO BI RELAX, SOMIER BiRELAX y ALMOHADA. No queda ningún renglón de 1-2 letras en la planilla ni en el stock.
- `test_fichas_4ip` §9 (→ 49).

## 4it. 09/10: 🌡️ el termómetro en barras, como la muestra 2 — PUBLICADA 09/10 09:28 (`71111be`), Pages OK 09:29
- El dueño, con la captura de la muestra 2: *«y el termómetro de cada producto cómo quedó o no se hizo?»*. El de §4ik eran líneas que
  bajaban bajo el cero y se sacó en §4iq; el de la muestra (barras) no se había hecho. **`stockTermoHtml`** (`<details id="stk-termo">`,
  entre las fichas y el catálogo, `visPref('termo')` abierta de entrada): una barra por producto sobre 17 días (`TERMO_DIAS`), verde
  mientras alcanza, 🔴 el día que se corta (`o.corte`/`o.dias` de `stockProyectar`, la MISMA cuenta de «⏳ Se corta el…» de las fichas),
  🚚 el día que llega (`stockTermoLlega`: lo ya pedido; si no, «si pedís hoy» = hoy + `o.lead`; lo de Moreno, hoy +
  `STOCK_DIAS_RECOGIDA`) y la franja roja = los días SIN stock entre los dos (también escrito abajo, en rojo). Entran los que se cortan
  en esos días o tienen aviso urgente/pedir/traer, el que se corta primero arriba, 8 y «Ver los que siguen». Solo mira.
- `test_fichas_4ip` §8 (→ 47).

## 4is. 09/10: 🏬 el cartel de los galpones separa «pedir ya» de «pedir esta semana» — PUBLICADA 09/10 09:28 (`71111be`), Pages OK 09:29
- El dueño, con la captura de los galpones (PTF «⚠️ 20 se acaban antes de que llegue la fábrica», Banzer «⚠️ 4…»): *«20 se acaban
  antes que llegue la fábrica?»*. Contaba juntos los avisos `urgente` («🚨 Pedir ya») y `pedir` («🏭 Pedir esta semana»), y solo los
  primeros se acaban antes de que llegue la fábrica. Ahora: «🚨 N se acaban antes de que llegue la fábrica» y «🏭 M para pedir esta
  semana», los urgentes primero en los ejemplos. Los números no cambiaron (salen de `stockData`, los mismos de fichas y tabla).
  El galpón de PTF cuenta TODOS los productos del catálogo con ese aviso; el de Banzer, solo los que tienen saldo en Banzer.
- **Tocar un galpón abre ABAJO su lista** (dueño, 09/10: *«al dar click no dice que se acaba antes de llegar a fábrica, o cómo sabe
  uno?»*): antes ordenaba la tabla completa, que desde §4ip está plegada, y no se veía nada. `stockGalponVer(id)`/`GALP_VER` →
  `stockGalponListaHtml`: cada producto con lo que hay en ese galpón, cuándo se corta (`sfReloj`), cuándo llega (`stockTermoLlega`) y
  qué hacer (`sfAccion`), más una línea que explica «pedir ya» y «pedir esta semana». Tocar un renglón abre su historia (`sfElegir`);
  «📋 Ver todo en la tabla completa» la ordena Y la abre (`stockGalponTocar` pone `visPref('stkTabla', true)`).
  ⚠️ «⛔ Ya falta para lo vendido» con «🏭 Pedí esta semana» NO es contradicción: lo vendido se entrega en unos días y la fábrica
  llega antes (`o.dias ≥ o.lead`); «Pedir ya» es solo cuando ni pidiendo hoy llega (`stockAvisoDe`).
- `test_visuales` §1 (→ 38).

## 4ir. 09/10: 📍 «Sale de» en la tabla de Administración y «Lo del día, por lugar» — PUBLICADA 09/10 09:12 (`67b337b`), Pages OK 09:12
- El dueño, con la captura de la tabla: *«Debería salir ahí, o no sé, dame ideas, muéstrame: debe verse rápido en la lista del día o esa
  tabla»*. Se le mostró una página con cinco formas (A–E) y eligió *«a,E»*.
- **A · columna «Sale de»** pegada al N°: `pedidoLugaresHtml(p)` junta todo el pedido por lugar (`pedidoLugares`: 🏭 PTF, 🏪 Banzer,
  📥 Moreno, ✗ Falta, 🏭 En producción), con unidades solo si sale de más de un lugar. Sin ninguna marca, «—». Venta de tienda y filas
  del sistema, «—». ⚠️ Corre un lugar las columnas de la tabla: `test_adm_alta` pasó de `cells[5]` a `cells[6]` (cliente).
- **E · «📍 Lo del día, por lugar»** (`#adm-lugares`, entre el calendario y la tabla): cuatro columnas (PTF cargar · Banzer cargar ·
  Moreno ir a buscar · Falta avisar) con producto, cantidad, cliente y camión; Hoy / próximo día de camión (`proximoDiaEntrega`); cuenta
  los productos sin revisar. Entran los mismos pedidos que el cierre de entregas (`cierreEntEntra`: sin tienda, borradores ni
  entregados). Tocar un renglón abre el pedido. Plegable (`visPref('lugares')`, abierta de entrada).
- Las dos salen de `prodPartes`, la MISMA marca de la Lista de carga y de `prodLugarTag` (§4iq). Solo miran: no guardan nada.
- `test_fichas_4ip` §7 (→ 41).
- Batería entera con §4ip + §4iq + §4ir: 147 suites, 5.469 comprobaciones. `test_ubic` dio 6 rojas con la máquina cargada y sola
  28/28 (de las que fallan por carga). `test_stock_detalle.cjs` (de la otra herramienta) sí era real: tocaba una fila de la tabla
  de stock, que desde §4ip arranca plegada. Ahora abre `#stk-tabla-det` antes de tocar, como lo haría la persona; 4/4 `.cjs` en verde.

## 4iq. 09/10: 🌡️ fuera el termómetro · 📍 de dónde se carga, a la vista de logística — PUBLICADA 09/10 09:12 (`67b337b`), Pages OK 09:12
- El dueño, con una captura de «🌡️ Los que se terminan» (las líneas rojas bajando bajo el cero): *«Esto no se entiende bien…
  Quítalo o mejorémoslo»*. **Se sacó** (`stockTermometrosHtml`, `stockTermoSvg`, `stockTermoTxt`, `stockTermoSerie`, `TERMO_*`, el
  gráfico del detalle de un producto y su CSS): lo mismo lo dicen ahora las fichas (§4ip) con palabras, «⏳ Se corta el jue 15/10 · 🚨
  Pedí 12 ya», y la historia de 30 días al tocar. `stockProyectar(o, serie)` conserva su segundo argumento (no molesta; la cuenta no
  cambió, `test_visuales` §2 lo sigue midiendo).
- El dueño: *«¿dónde ve logística lo de "cargar en Banzer o PTF"? Veo que los vendedores en sus pedidos sí ven, pero logística?»*. Lo
  veía en la Lista de carga (bloques Fábrica/Banzer), los camiones de Administración, el chofer, la ruta, el WhatsApp y el Excel, pero
  **NO en la tabla de Administración** (los productos salían sin el lugar) ni en la ficha (un ✔ con un `title` que en el iPad no se ve).
  **`prodLugarTag(x)`** pone la etiqueta a la vista en las dos: 🏭 PTF · 🏪 Banzer · 📥 Moreno (con cuántos si se parte), ✗ No hay,
  🏭 En producción; sin marcar, nada. Sale de `prodPartes`, la misma marca de la Lista de carga.
- `test_fichas_4ip` §6 (→ 27) y `test_visuales` §2 cambiado a conciencia.

## 4ip. 09/10: 🧾 Mis pedidos con menos letras y 🃏 Stock en fichas — PUBLICADA 09/10 09:12 (`67b337b`), Pages OK 09:12
El dueño, con la página de muestras (1, 13, 22, 28, 29, 30, 31, 33): *«la 13 no me gustó quítala, lo demás aplica»*. La 13 (el galpón
PTF por dentro) NO se hizo. Todo solo mira: ningún número nuevo, nada se guarda en la planilla.
- **🧾 Mis pedidos (1 + 22)**, en `misCardHtml`:
  - el borde (un anillo `box-shadow`, para no pisar el borde izquierdo de ATC/RPT) dice cómo está: `misEstadoCard` → `ok` (✅ marcado),
    `mal` (una línea «✗ no hay»), `debe` (saldo y no es ATC/RPT), `va`;
  - íconos (🛏️ 📍 💵 🚚, con `title`) en vez de «PRODUCTOS / DIRECCIÓN / COBRO / CHOFER»;
  - el camioncito en el viaje chico (`pedidoViajeHtml(p, true)`): parado en el paso de ahora, rojo si falta stock (`.para`), entra
    andando la primera vez que se ve en la apertura (`VIAJE_VISTO`);
  - el sello «ENTREGADO» solo con `p.entregado` (no con la fecha pasada: la tarjeta dice «⏳ No entregado» y no se contradice), con
    golpe una vez (`MIS_SELLO_VISTO`);
  - botones de dos por fila y uno nuevo, **💬 WhatsApp** al cliente (`misWaCliente`: 8 dígitos con 6/7 → +591; si no, no hay botón).
- **🃏 Stock en fichas (28 + 30)**: `stockFichasHtml(conMov)` debajo de los filtros, con la MISMA lista filtrada de la tabla (el buscador
  también filtra las fichas). Cada ficha: torrecita (PTF/Banzer/Moreno + lo que falta para `stockNecesario`, `sfTorre`), tres números
  (hay para cargar = `stockHaySalir`, vendido sin entregar = `o.comp`, y «a pedir»/«a traer»/«en camino»/«en Moreno»), cuándo se corta
  (`sfReloj`, con el día de la semana) y UNA acción (`sfAccion`, el mismo «Qué hacer» de la tabla con `o.fabricar`/`o.pedir`). Orden:
  `SF_ORDEN` (urgente, traer, pedir, revisar, pedido…), después los días. Se ven 12 (o todos los urgentes) y «Ver las N que siguen».
  ⚠️ **La tabla sigue entera**, plegada abajo (`#stk-tabla-det`, «📋 La tabla completa», cerrada de entrada, `visPref('stkTabla')`):
  las pruebas que leen `tr[data-stock-k]` siguen andando porque el contenido está en la página.
- **🗂️ El catálogo (29)**: `stockCatalogoHtml`, modelos × las 8 medidas más usadas, el color de la ficha y lo que hay para cargar;
  tocar una casilla abre su historia. `<details id="stk-catalogo">`, abierto de entrada (`visPref('stkCat')`).
- **📈 La historia (33)**: `sfElegir(k)` abre una ventana con 30 días: las salidas de cada día salen de los pedidos (`sfSalidas`, siempre);
  la línea de lo que había sale de la hoja «Historial stock» (`histStockLeer`, solo con el servidor `2026-10-09-a`, `SF_HIST_CACHE` 10 min)
  y lo que entró = lo que subió el saldo más lo que salió ese día.
- **📥 El Excel del día (31)**: `confirmarImportExist` deja la foto de antes (`STOCK_DELTA_ANTES = sfFotoDe(...)`, PTF+Banzer+Moreno por
  producto) y `renderStock` la compara (`stockDeltaTomar`): cartel «subieron N · bajaron M» y «+5»/«−3» flotando en cada ficha que cambió,
  UNA vez por producto (`STOCK_DELTA.visto`), durante 2 minutos (`SF_DELTA_MS`).
- `tests/test_fichas_4ip.js` (24; 21 rojas contra `7642388`); con `SHOTS=` saca las capturas.

## 4io. 09/10: 🧹 fuera el resumen de Administración — PUBLICADA 09/10 02:04 (`d94ca49`, Pages OK, run 37891579091; el dueño: «publica»)
El dueño, con dos capturas del iPad (las fichas Pedidos/Pagados/Por cobrar/Saldo, la línea de cobros, los consolidados por
vendedor y por día, la rendición por chofer, «Ocupación de cupos — próximos 7 días» y «Concentración por zona»): *«Al tenerlo
ya en 3D y los focos de calor y etc, eso ya no es útil para logística, quítalo»*.
- Se sacó ENTERO `#adm-resumen` (con «Entregas asignadas por camión», que estaba en el medio) y su botón «🙈 Ocultar resumen»
  (`toggleResumenAdm`, `LS_RESUMEN`, `RESUMEN_MINI`, `pintarResumenAdm`), las cuentas de `renderAdmin` que lo llenaban,
  `renderOcupacion`, `renderZonas` y `occBar`. Quedan: los avisos, los chips, la tabla, los botones, el 📅 calendario y los
  camiones (con su «Ocultar camiones»). El Cuadre de Contabilidad sigue con SU «Ocultar resumen» (`LS_RESUMEN_CUA`).
- **El feriado ahora lo dice el calendario** (`admCalFeriado`): la celda «🚫 feriado» con el nombre de título, y al tocarla
  «🚫 Feriado — Navidad: el camión no sale». Lo decía la semana de ocupación (§4gy A1).
- Lo cobrado por chofer lo siguen diciendo el parte del día, la vista del chofer y el Cuadre («Efectivo cobrado vs retirado»).
- Pruebas cambiadas a conciencia: `test_resumen` (§1-8 = que ya no está), `test_camiones_admin` §1 y §8, `test_auditoria`,
  `test_chofer` §7, `test_cuadre_alta`, `test_medias`, `test_finmes` §6, `test_rev29_dias` 4a (ahora el calendario),
  `test_rev_entregas` §6 y `test_tabla` §7. También se arregló `test_servidor` §23: `HD` se llamaba a sí misma.

## 4im. 09/10: 🚛🏆📅🔔🌅🛤️ seis vistas más (de la página de muestras) — PUBLICADA 09/10 02:04 (`d94ca49`, Pages OK, run 37891579091; el dueño: «publica»)
El dueño, con la página de muestras abierta: *«implementa todo menos a,c,d, me gusta la B y la salud del día es solo para
administración al poner la clave cierto?»* (A = tarjeta que se da vuelta, C = colchón 3D, D = semana en torres: NO).
Todo SOLO MIRA: no cambia cupos, stock, tildes ni la planilla, salvo los tildes de la carga, que son los de siempre.
- **🚛 Camión cargándose** (Lista de carga, arriba de cada camión, `.cc-lugar`): `cargaCamionCuenta(cam)` suma el `data-u` de
  los tildes ya puestos (cada checkbox lleva sus unidades; 0 si el renglón no va); `cargaCamionSvg` dibuja 12 lugares y
  «🚛 X de Y bultos» / «✅ Cargado entero»; `cargaCamionTildo(el)` lo repinta al tildar (después de `setCargaChk`).
- **🏆 Ranking** (Stock, debajo de los galpones, `<details id="vis-rank">`): `stockRankingDatos()` = unidades entregadas por
  producto en ventanas de 7 días, `RANK_SEMANAS`=6, los `RANK_TOPE`=8 que más salieron, con las reglas de la rotación
  (`stockCuenta`, sin `stockPedidoUnico`, sin `esProdDeTienda`). ▶ recorre las semanas y las barras cambian de lugar con ▲/▼.
- **📅 Calendario de entregas** (Administración, `#adm-cal` DEBAJO de los camiones, dueño 09/10: *«ese calendario debe ir debajo luego de la animación 3D»*, cerrado de entrada, pref `cal`):
  `admCalDatos(ym)` cuenta AM/PM por día (sin sistema, borradores ni tienda); día cerrado rayado («sin camión», o «n ⚠️» si
  igual tiene pedidos), lleno marcado; tocar un día dice AM n/lim y PM, y «Ver ese día» abre Administración en ese día.
- **🔔 Avisos con movimiento** (Stock): `stockAvisosNuevos` compara con lo guardado en el aparato (`me_vis_avisos`; la primera
  vez solo guarda) y dice qué productos pasaron a 🚨/🏭 desde la última vez; cartel con campana + la fila late (`stk-late`).
- **🌅 Salud del día** (SOLO con la clave de Administración): `saludDatos()` = entregas de hoy, stock sin urgencias, cupos del
  próximo día con camión, lo que llega de fábrica hoy. Sale una vez por mañana y por aparato al poner la clave
  (`me_salud_dia`, se cierra sola a los 9 s) y con el botón «🌅 Salud del día».
- **🛤️ El viaje del pedido** (B; Mis pedidos, en la tarjeta chica y en la ficha): Cargado → Mercadería (sin stock / en
  producción / a recoger / lista / sin revisar) → fecha → En camino → Entregado (`pedidoViajeDatos`/`pedidoViajeHtml`). Una
  fecha pasada cuenta como entregado (§4co, los choferes no marcan).
- `tests/test_vistas_4im.js` (29; 26 rojas contra `bf34dab`); con `SHOTS=1` saca las capturas.

## 4in. 09/10: 📚 la hoja «Historial stock» (servidor `2026-10-09-a`) — PÁGINA PUBLICADA 09/10 02:04 (`d94ca49`, Pages OK, run 37891579091; el dueño: «publica»); el servidor lo implementa el dueño
El dueño: *«publica y armá la hoja de historial»* (después de preguntar cuántos días se pueden guardar sin llenar la celda).
- **Por qué aparte**: `__stock__` vive en UNA celda de «Pedidos» (50.000 letras, ~22.000 usadas): ahí entran 3 días de control.
  Un día de saldos de los tres almacenes son 6.000-10.000 letras: en una hoja aparte, una fila por día, entran años.
- **Servidor** (`histGuardar_`/`histLeer_`, acciones `histStock` adentro del candado y `histStockLeer` sin candado): hoja
  `HIST_HOJA`='Historial stock' (columnas fecha · actualizado · almacenes · datos; la A con formato texto `@`, si no Google
  convierte la fecha). Un día = `{<almacén>:{f,h,u,s0}}`; otro almacén el mismo día se JUNTA en la misma fila y un Excel más
  viejo (por hora) no pisa al más nuevo. Lo de más de `HIST_DIAS`=730 días se borra al guardar. Más de `HIST_TOPE_LETRAS`
  (48.000) en un día → `celda_llena`. `probarAntesDeImplementar` §10 dice cuántos días tiene. Ninguna escritura toca «Pedidos».
- **Página** (`histStockAlDia`, después de cada lectura buena en `refrescarEstadoYa`): si `SERVER_VER` ≥ `HIST_VERSION`, con el
  stock ya leído de la planilla (`STOCK_CARGADO`), manda los almacenes cuyo Excel es de HOY (sin los ceros) una vez por cambio
  (`me_hist_env` = día + huella); si falla, la próxima lectura lo reintenta. ⚠️ Con un servidor anterior NO manda: la acción
  desconocida caería en `doSave` → «no id» → hoja «Rechazos». «📜 Historial de cortes» muestra cuántos días hay y una barrita por
  día con lo de PTF (`histStockPintar`, lee los últimos 60 días).
- Todavía nada usa la historia para calcular: es la base de la «máquina del tiempo» y del «¿acertó el panel?».
- `test_servidor` §23 (11 ⚠️ + la versión: 12 rojas contra el `.gs` 2026-10-06-a) y `tests/test_historial_stock.js` (11; 10 rojas
  contra `bf34dab`). `SCRIPT_VERSION`/`ESTA_VERSION`/`SCRIPT_VERSION_ESPERADA` = `2026-10-09-a`. Volver atrás = ✏️ a la versión anotada
  antes de implementar (la de la 10-06-a) Y pegar la 10-06-a (enlace fijo a `bf34dab`).

## 4il. 09/10: 📈 barrios que crecen (el 11 de la lista) — PUBLICADA 09/10 01:20 (`a9bc37a`, Pages OK, run 37888038312; el dueño: «publica»)
El dueño: *«el 11 me gusta para implementar»* (de la lista de ideas: el mapa de calor con flechas de tendencia, qué zona vende
cada vez más). En «📍 Banzer o PTF», debajo del mapa (`#alm-tend`, `almTendHtml`) y con flechas en el mapa (`almTendFlechas`).
- **Por ZONA ESCRITA del pedido** (`almZonaClave`; se muestra la escritura que más se repite): entregas de los últimos 30 días
  contra las 30 de antes (`ALM_ZONA_DIAS`/2), con las MISMAS entregas de la pantalla: `almZonaData` ahora devuelve `ents` (cada
  entrega contada, con su zona, su lado y su pin). Cuenta entregas, no unidades: una compra grande no hace crecer un barrio.
- `almTendencias`: `crece` = +2 o más y al menos +25 % (o zona nueva); `baja` = −2 o más y al menos −20 %; `igual`; con menos de
  `ALM_TEND_MIN`=4 entregas en 60 días no se muestra. Orden: las que crecen, de la que más entregas sumó a la que menos.
- Cada fila: las 9 semanas en barritas (la mitad reciente en verde/rojo), «n antes → n ahora», el % y la barra PTF/Banzer de esa
  zona. Si crece y la mayoría cae del lado de Banzer: «conviene tener más ahí». Las que crecen laten dos veces al abrir.
- Las flechas («▲ Urubó +500%», «▼ Pampa −83%») van en el centro de los pines de la zona, solo con «Todas» y sin producto elegido:
  la tendencia es de los 60 días, no de una semana. Sin `L.marker`/`L.divIcon` (el Leaflet de mentira de `test_banzer_ptf`) no dibuja.
- Solo mira. `tests/test_visuales.js` §5b (5; 4 rojas contra `044f661`). Batería: 144 suites, 5.404 bien; la única roja, `test_mispedidos` (la de carga de siempre), sola da 33/33.

## 4ik. 09/10: ✨ seis vistas nuevas con los datos de verdad — PUBLICADA 09/10 00:57 (`044f661`, Pages OK, run 37886269305; el dueño: «publica lo que hay pendiente»)
El dueño, después de ver las previas con datos inventados: *«Todo menos lo de kommo y contabilidad y cupos, y que otros gráficos
animaciones 3D Motion grafic o que mas podemos implementar.»* Hechas la 1, 2, 3, 4, 5 y 10 de la lista; quedaron afuera la 6
(cupos), 7-9 (Contabilidad) y 11 (Kommo). **Solo miran**: ninguna guarda nada ni cambia una cuenta (`test_visuales` §7).
- **🏬 Los almacenes en 3D** (arriba de Stock, `<details id="vis-galp">`, abierto por defecto y recordado por compu en
  `me_vis_4ik`): PTF (`deposito`), Banzer (`enSale`) y Moreno (`enOtros`) de `stockData`, cada uno un galpón de 40 lugares que se
  llena en proporción al más lleno; los cuadritos rojos punteados son los productos que se acaban antes de que llegue la
  fábrica (aviso `urgente`/`pedir`; en Moreno, «para traer»). Tocar un galpón ordena la tabla por lo que tiene
  (`stockGalponTocar` → `STOCK_FILTRO.orden`, de mayor a menor). Con la búsqueda escrita no se ve (como los otros cuadros).
- **🌡️ El termómetro**: `stockProyectar(o, serie)` ganó un segundo argumento opcional: con un arreglo anota cada día
  `{d, saldo, llega}` y no corta antes. **La cuenta es la misma** (el primer día en rojo = el «cubre hasta» de la tabla; sin serie da
  lo mismo que antes). «Los que se terminan en los próximos 15 días» va dentro de la caja de los galpones (hasta 6, «Ver los N»), y
  cada producto lo trae también en su detalle («Cómo se calcula»). Verde = hay, rojo = días sin stock, 🚚 = llega lo pedido.
- **📊 «Qué producir» en gráfico**: un SVG por bloque con el pie «por medida» (`B.medidas`: 7 días, 15 días, el mes que viene),
  ordenado de la medida que más hay que producir a la que menos. «📊 Ocultar gráfico» por compu.
- **🛣️ El recorrido del día** (Mapa de entregas, botón «🛣️ Recorrido», prendido por defecto): solo Hoy/Mañana; un camino por
  chofer que sale de PTF, **AM antes que PM y siempre la parada más cerca** (`mapaRutaOrden`: es una SUGERENCIA, lo dice el
  panel), paradas numeradas, ✓ las entregadas, 🚚 en la última entregada (o en PTF), y un punto que recorre la ruta en loop (un
  solo `requestAnimationFrame`, se para al cerrar el mapa: `mapaRutaParar`). Panel abajo a la izquierda: «2 de 5 entregados ·
  próxima: …» y km en línea recta. ⚠️ Los choferes todavía no marcan ✅: los ✓ salen hoy del cierre de entregas.
- **🔥 El mapa de calor semana por semana** (Banzer o PTF, arriba del mapa): 9 barras = las 9 semanas de los 60 días
  (`almSemanas`, cada barra partida PTF/Banzer), «Todas», y ▶ que las pasa de a una cada 1,3 s (se para al cerrar). Elegir una
  dibuja solo sus entregas con manchas más grandes y dice fechas, cuántas, % PTF/Banzer y la zona con más. Los puntos de
  `almZonaData` ahora llevan `z` (la zona escrita).
- **⭕ Los anillos de Mis pedidos** (debajo de las fichas): por fecha de ENTREGA y sin ATC/RPT, como las fichas: lo vendido para
  este mes contra el mes pasado ENTERO (no hay meta), los entregados (fecha pasada o ✅) y lo cobrado (la ficha «Por cobrar» es lo
  que falta). Sin ventas en los dos meses, no se dibuja.
- Las animaciones corren **una vez cuando cambian los números** (`visAnimar`: el panel se repinta cada minuto) y se apagan con
  «reducir movimiento» del sistema.
- `tests/test_visuales.js` (34; 32 rojas contra `42665bc`). Capturas: `SHOTS=… LEAFLET_DIR=… node tests/test_visuales.js`.
- Batería: 144 suites, 5.398 bien; las 2 rojas eran de `test_banzer_ptf` (la tira de semanas se salía en 390 px: las barras ahora se achican y en el celular va una fecha sí y una no) y quedaron 109/109.

## 4ij. 08/10: 📱 en el iPad no se veía «nada de eso» — los costados desde 1120 px y la barra de pasos hasta 1119 — PUBLICADA 08/10 19:57 (`63f9d68`, Pages OK, run 37862228498; el dueño: «publica lo que falta publicar»; batería 143 suites, 5.365 bien, 1 roja de carga que pasa sola)
El dueño: *«mandame capturas de cómo quedó, porque en el iPad no se ve nada de eso, solo en la PC parece»*. No era un error de
Safari (revisado el código nuevo: nada que el iPad no entienda) sino los cortes de ancho: los costados (§4ig) salían desde 1300 px
y la barra de pasos (§4ih) hasta 760 px, y el iPad Air mide 820 parado y 1180 acostado: caía en el medio y no veía ninguno de los
dos. Las escenas, el buscador, el aviso de repetido y el mapita SÍ salían (capturas a 820 y 1180 con el escenario de prueba).
- Costados desde **1120 px** (`fxAncho` y el `@media`): entre 1120 y 1299 van FIJOS (236 px y 262 px) y el formulario toma el resto
  (~550 px en el iPad acostado); con `minmax` crecían los costados y el formulario quedaba en 340 (la vendedora salía «Maria Flc»).
  Desde 1300, como antes.
- Barra de pasos **hasta 1119 px** (`fxPasosPintar`): en el iPad parado aparece abajo; en el acostado, los costados.
- Pruebas: `test_escenas_form` (24: el iPad acostado; «más angosto» ahora es < 1120) y `test_ayudas_form` (22: corre en 1180×820 y
  mira el iPad parado). Las dos nuevas, rojas contra `e533511`.

## 4ii. 08/10: ➕ «Qué producir» pedía de menos: lo vendido sin entregar y el ritmo se tomaban «el mayor», no se SUMABAN — PUBLICADA 08/10 17:56 (`e533511`, Pages OK, run 37850277889; el dueño: «publica, y también 2 4 5 6»)
El dueño, con la captura de «🏭 Qué producir»: *«especial semi ortopédico dice 9 sin entregar, hay 6 y solo pide 3 para los
próximos 7 días… siendo que tiene 9 pendientes, a un ritmo de 1 por día… revisá la lógica para todos los productos, NO PUEDE
PASAR ESTO… por eso venimos sin stock: manda pedir 3 y 7 para 15 días y tenemos 9 pendientes de entrega por falta de stock»*.
- **La causa, para todos los productos**: `stockNecesario(o)` era `max(comp, porDia × (fábrica + margen + reserva))`. Con más
  vendido sin entregar que ritmo × días (9 contra 0,93 × 8 = 7,5) la reserva para lo que se va a vender desaparecía: necesidad 9
  − 4 para cargar (Banzer) = pedir 5, de los que 2 se traen de Moreno → «7 días: 3». Lo mismo en la de 15 días (`nec15`) y en
  «cubre hasta» (`stockProyectar`, `consumo=max(comp, porDia×(n+1))`).
- **Ahora se SUMAN** (la misma regla que el dueño dio para Banzer o PTF en §4hw): `stockNecesario = comp + porDia × (…)`,
  `nec15 = compHasta(hoy+15+fábrica) + porDia × (fábrica + margen + 15)`, `consumo = comp hasta ese día + porDia × (n+1)`. Con el
  caso de la captura: 7 días = **producir 11 + traer 2** (antes 3), 15 días = **22** (antes 13), y se corta el 10/10 (antes 12/10).
  Lo que no rota (`porDia`=0) sigue pidiendo solo lo vendido. El «Cómo se calcula» dice «Se suman» y «Banzer o PTF» lo explica igual.
- **Lo que NO cambió**: el mes que viene (`mesNec`) sigue con el mayor entre lo vendido para ese mes y lo probable, porque lo
  probable ya es el TOTAL de las entregas del mes (las vendidas son parte); los umbrales de rotación, el margen y la reserva, igual.
- Es conservador a propósito: una venta nueva no sale el mismo día, así que la suma cuenta de más ~ritmo × (días entre la venta y
  la entrega). El dueño prefiere eso a quedarse sin stock.
- Pruebas: `tests/test_proyeccion_suma.js` (9; 5 rojas contra `cdc1fab`, que da exactamente lo de la captura: 3 y 13). Cambiadas a
  conciencia: `test_banzer_ptf` (TITANIO ICE «tener» 8 → 10, pasar 6 → 8 a Banzer), `test_existencias` §4 (el NUEVO ECO FLEX pasa
  de «pedir» a «PEDIR YA»: se corta antes), `test_stock` §3/§8/§9/§14 (ECO FLEX: corte en 2 días y no 4, pedir 30 y no 18; el
  pedido a Moreno de §8 pasa de 20 a 30 para que siga siendo «ya pedido») y `test_stock_quince.cjs` de la otra herramienta, que
  probaba justo la cuenta vieja («pendientes se comparan con previsión sin duplicar»).

## 4ih. 08/10: 🧰 más ayudas del formulario: ¿pedido repetido?, buscar por nombre con saldo, el mapita y los pasos en el celular — PUBLICADA 08/10 17:56 (`e533511`, Pages OK, run 37850277889; el dueño: «publica, y también 2 4 5 6»)
El dueño eligió de una lista: *«4. me gusta, hazlo · 2, 5 y 6 dame ejemplo / muéstrame»* (la 1 no; la 3, combos, no: *«mejor nomás manual»*).
- **¿Pedido repetido?** (`#fx-dup`, `fxDupBuscar/fxDupPintar/fxDupConfirmar`): mismo celular (últimos 8 dígitos) o mismo nombre
  (≥6 letras, `normNombre`) en un pedido de estos días (fecha o carga desde hoy−7) → aviso mientras se escribe con «👀 Ver», y
  pregunta al guardar (Cancelar = no guarda). No en Eduardo/ROHO, ATC, RPT, venta de tienda ni al corregir.
- **Buscar por nombre con saldo** (`#fx-busca`, `fxBusca…`): la lista propia reemplaza al `datalist` de `.prod-desc`; cada opción
  dice su saldo con la MISMA cuenta del cuadrito (`saldoVeredicto`). ↑/↓/Enter y tocar.
- **El mapita** (`#fx-mapa`, `fxMapaPintar`): con el link o las coordenadas, km a PTF y de qué lado de la línea de logística
  (`almLadoDeLinea`); un link que no se entiende, en rojo. Los enlaces cortos van por `apiGeocode`.
- **Los pasos en el celular** (`#fx-pasos`, ≤760 px): Cliente · Productos · Entrega · Cobro con ✓; tocar lleva a esa parte.
- ⚠️ La barra de pasos es fija abajo: `html.con-pasos{scroll-padding-bottom}` para que lo que se lleva a la vista (Guardar, un campo
  con error) quede ARRIBA de ella (`test_rev7_celular` lo vio: tapaba Guardar). Las pruebas que guardan varios pedidos con el mismo
  celular a propósito (`test_saldo_almacen`, `test_saldo_servidor`) aceptan la pregunta «¿PEDIDO REPETIDO?» sin contarla.
- `tests/test_ayudas_form.js` (21).
- Batería con §4ih + §4ii: 143 suites; las 18 rojas de la primera vuelta eran estas cuentas viejas y la pregunta nueva, corregidas.

## 4ig. 08/10: 🖥️ los costados del formulario en pantalla ancha — PUBLICADA 08/10 17:03 (`cdc1fab`, Pages OK, run 37844004385; el dueño: «me gusta, implementá»; batería 141 suites, 5.334 bien · 0 mal)
**El dueño** (captura de la página publicada en su compu de 1920 px): *«publicar, y mientras hacé algo más pulido y
desarrollado, porque además tenemos espacios vacíos a los laterales»*.
- Desde **1300 px** (`fxAncho`), en la vista del formulario (`body:not(.ancha)` → `--wrap:1640px`) `#view-form` pasa a 3 columnas:
  **`#fx-izq`** (agenda) · el formulario · **`#fx-der`** (tu pedido en vivo). Los dos costados son `sticky` debajo del encabezado.
  Más angosto, nada cambia (celular, iPad parado). En la venta de tienda la agenda se esconde (`solo-entrega`).
- **Agenda** (`fxIzqPintar`): los 7 días con una barra por turno (AM/PM, sábado solo AM) y «N libres»/«lleno», «cerrado» o
  «feriado: nombre». Tocar el día elige la fecha; tocar el TURNO elige fecha y turno (`fxElegirDia(f, ev)`). Debajo, el camión del
  turno (`fxCamionEn(#fx-izq-cam)`) y «👀 Ver los N pedidos del turno» (`verCuposTurno`). Con los costados, la tira y el camión de
  adentro del formulario se esconden (no se repiten).
- **Tu pedido** (`fxDerPintar`): cliente, tipo y vendedor, día y turno, zona, celular; cada producto con el ícono y el estado de su
  cuadrito (`box._v.tipo` → `FX_SALDO_ICO`) y su subtotal; la suma, «A cuenta» y «Saldo por cobrar»; «Para guardar» (✓/○ de
  vendedor, cliente, productos, fecha, zona, y celular y nota si no es Eduardo/ROHO — es una ayuda, NO reemplaza las validaciones
  de `submitPedido`); «N pedidos cargados hoy» y lo vendido en el mes. Se repinta con cada `input`/`change`/`click` del formulario
  (150 ms, `fxLadosProgramar`), con los cuadritos del saldo y al cambiar el ancho de la ventana.
- `test_escenas_form` §6 (4 más → 23).
- ⚠️ Con dos camiones a la vista (el de adentro del formulario y el de la agenda) los degradados del SVG repetían ids y `test_auditoria`
  lo atajó (162 rojas): `fxCamionEn` les pone el id de su caja.

## 4if. 08/10: ✨ las escenas del formulario de pedidos — PUBLICADA 08/10 16:35 (`19a2ec0`, Pages OK, run 37840479450; el dueño: «publicar»)
**El dueño**, después de una muestra en video (scratchpad, no está en el repo): *«todas, pero ¿qué pasa con lo demás del
formulario?»* y *«por lo del celular no te preocupes… quiero escenas wow»*. Lo demás del formulario queda IGUAL; esto solo mira.
- **2 · `#fx-dias`** debajo de la fecha: los próximos 7 días (desde mañana; desde hoy para Eduardo/ROHO, `esVendedorLite`) con lo
  libre AM + PM (`limTurno`, `cuposUsadosTurno`), «cerrado» en domingo/feriado/día cerrado (`diaCerrado`), «lleno». Tocar uno
  llena `f-fecha` y dispara su `change` (corre lo de siempre).
- **1 · `#fx-camion`** debajo del turno: el camión de ese día y turno, lugares ocupados, el «tuyo» y libres. Editando, el pedido
  ya está adentro (`yaEsta`). Entra de costado al cambiar día o turno.
- **3 ·** el dibujo del cuadrito del saldo (`fxEscenaSaldo` en `saldoCajaPintar`, envuelto en `.fx-saldo`): colchones apilados
  (✅), camioncito a Moreno (📥/🚚), fábrica con humo (⏳/🏭/📐). Los SVG no llevan texto (no ensucian el `innerText` del cuadrito).
- **5 · `#fx-mes`** arriba de «Guardar»: lo vendido este mes por la vendedora escrita (fecha de carga, `ventaTotal`, sin ATC ni
  RPT ni borradores), contra el mes pasado entero. No sale al corregir.
- **4 · `fxGuardado(rec)`** en `after()` de `submitPedido`, solo pedido NUEVO (o borrador de Kommo completado), no ATC ni venta de
  tienda: pantalla oscura con la escena de §4hz borrosa de fondo, la foto del camión **recortada sin su fondo**
  (`carga-viva/camion-recorte.png`, sacada de `camion.png` con un relleno desde los bordes), los productos que suben, faros,
  sale con rayas de velocidad, «¡Pedido guardado!» con OC, cliente, día y turno, papelitos, y la barra del mes sumando el pedido.
  Tocar cierra; sola a los ~7 s. La ventana de WhatsApp de siempre queda abajo.
- ⚠️ **En las pruebas automáticas (`navigator.webdriver`) la escena 4 no sale** salvo `window.FX_PRUEBA` (si no, tapaba 7 s la
  ventana de WhatsApp de todas las pruebas que guardan).
- ⚠️ **Los papelitos van en UN solo cuadro a cuadro** (`fxChispas`): con uno por papelito (90) la página se trababa entera
  (medido con la prueba: los temporizadores llegaban segundos tarde). Y el fondo borroso está quieto a propósito: animar un
  `blur` a pantalla completa es lo más caro de dibujar.
- `renderCupoForm` = `renderCupoFormBase` + `fxFormPintar()`; también al escribir el vendedor y al final de `editPedido`.
- `tests/test_escenas_form.js` (19; 17 rojas contra `409a077`). `VIDEO=<carpeta>` lo graba. Batería entera: 141 suites, 5.330 bien · 0 mal.

## 4ie. 08/10: 🚛 asignar el camión desde «Sin vehículo» (dueño: «sí, agregalo y publicá») — PUBLICADA 08/10 15:54 (`409a077`, Pages OK, run 37835423020; batería 140 suites, 5.311 bien · 0 mal)
En el panel de «Sin vehículo», «🚚 ASIGNAR CAMIÓN»: cada pedido del día sin camión (cliente, OC, zona, turno, bultos) con un selector
de los camiones de `VEHICULOS`. `cvAsignar(id, v)` hace lo mismo que la columna «Vehículo» de la tabla (`setVehiculo`: vehículo +
el primer chofer de ese camión) sin reabrir fichas; `persistPedido` repinta tabla, Lista de carga y camiones. `test_camiones_admin`
→ 39.

## 4id. 08/10: 🚛 un camión vacío dice POR QUÉ — PUBLICADA 08/10 15:54 (`409a077`, Pages OK, run 37835423020; batería 140 suites, 5.311 bien · 0 mal)
**El dueño** (captura de la página publicada): *«solo en "sin camión" aparece la lista lateral; en los demás camiones no sale»*.
No era un error: ese día los 19 pedidos no tenían camión asignado (`vehiculoDe`: `p.vehiculo` o el camión del chofer), así que
todo caía en «Sin vehículo». El panel decía solo «Este camión no tiene pedidos para hoy». Ahora dice «Ningún pedido de hoy tiene
asignado el Carry. Hay N pedidos sin camión: se asigna en cada pedido…» con el botón «⚠️ Ver los N sin camión». `test_camiones_admin`
→ 37.

## 4ic. 08/10: 🚛 Banzer y Moreno abren su panel al costado, como PTF — PUBLICADA 08/10 15:54 (`409a077`, Pages OK, run 37835423020; batería 140 suites, 5.311 bien · 0 mal)
**El dueño**: *«si le doy al camión de Banzer abre otra cosa, no el lateral, como el PTF»*. Los tres carteles abrían la Lista de
carga (`cvIrALista`). Ahora cambian el panel de la derecha (`CV_VISTA`, `cvVer`): PTF = el camión elegido; Banzer = lo que se carga
allá ese día, por camión, con los mismos tildes de la Lista (barra, «Faltan N», festejo al completar); Moreno = lo marcado «📥
recoger» por camión, sin tildes (eso se cambia en el pedido). Tocar el camión de la imagen hace lo mismo que su cartel (los recortes
de §4ib, con `clip-path`, solo responden dentro de la silueta). Elegir un camión de las fichas o cambiar Hoy/Mañana vuelve a la
vista del camión. `test_camiones_admin` §7b (5) → 36.

## 4ib. 08/10: 🚛 los camiones de Administración: su propio botón para esconderlos y las líneas en el piso — PUBLICADA 08/10 15:54 (`409a077`, Pages OK, run 37835423020; batería 140 suites, 5.311 bien · 0 mal)
**El dueño**, con capturas de Administración: *«separá las pestañas ocultar resumen y ocultar el nuevo 3D; que se vea siempre el
resumen»* y *«esas líneas quedaron encima del camión, no abajo… se ve raro»*.
- `#carga-viva` sale de `#adm-resumen` y queda justo arriba. Dos botones en la misma fila: «🙈 Ocultar camiones»
  (`toggleCamionesAdm`/`pintarCamionesAdm`, `localStorage` `pedidos_camiones_adm`, cada compu lo suyo) y «🙈 Ocultar resumen» (solo
  el resumen, como siempre). Escondidos, `cargaVivaPintar` vacía la caja y no dibuja nada (la animación no corre de fondo).
- Las huellas de color (`CV_POS[..].huella`) pasaban por encima de los camiones. Ahora son el rectángulo del PISO alrededor de cada
  camión (la de PTF calca el contorno que ya trae la imagen) y cada camión se vuelve a dibujar encima: tres `img.cv-cuerpo` de la
  misma imagen recortadas con `clip-path` por su silueta (`CV_POS[..].cuerpo`, medida a mano sobre la imagen ampliada). Las luces
  delanteras van en un segundo `svg`, encima de los recortes. ⚠️ Si se cambia la imagen, hay que volver a medir `cuerpo`.
- `test_camiones_admin` §1 y §8 cambiadas a conciencia (la tira ya no está dentro del resumen) + 5 comprobaciones nuevas → 31;
  contra `2a7c7bd` cae en la primera.

## 4ia. 08/10: 🏷️ el SUEÑA LITE 105 partido en dos — un código que la lista aprendió después — PUBLICADA 08/10 15:54 (`409a077`, Pages OK, run 37835423020; batería 140 suites, 5.311 bien · 0 mal)
**El aviso**: al subir el Excel de PTF el 08/10 el dueño vio en el control del corte «COLCHON SUENA LITE · 105X190: +20 sin
explicar» y «…: −20 sin explicar» (los dos con el mismo nombre). Buscó «LITE» en Stock: dos filas. *«Si, salen dos, está
partido. Arréglalo»*.

**La causa** (reproducida con datos sintéticos en `test_codigo_nuevo`, idéntica a la captura):
- Los Excel de antes del 05/10 guardaron el «CH2531 COLCHON SUEÑA LITE 105X190» con su nombre crudo (`SUENA LITE|105X190`,
  §4cy: código que la lista no conoce = otro producto) y el mapa de códigos de cada foto (`cod`) apuntando ahí.
- El 05/10 (§4ho) el CH2531 entró a `CODIGOS`. Al leer, `stockMigrar` pasaba las UNIDADES a la clave de la lista (por nombre),
  pero no tocaba el mapa `cod`. Y como el código gana sobre cualquier nombre (`stockClaveInv`, §4cv), el Excel nuevo
  (`existLeer` → `stockClave` con el código) y los pedidos con CH2531 seguían cayendo en la clave cruda.
- Resultado: la fila de la lista con los 20, la cruda con los pedidos y 0 («NO HAY», «🚨 PEDIR YA» posibles), y el control
  comparando 20 contra 0 en cada clave: «+20» y «−20». Además dejó una detección de 20 sin asignar, que resta «en camino».
- Estaba anotado como pendiente en §4hq.

**El arreglo** (`pedidos.html`):
- `stockMigrar`: antes de migrar, cada código de `CODIGOS` del mapa `cod` de cada foto pasa a apuntar a su clave
  (`stockAliasDe(stockNorm(d)+'|'+stockNorm(m), d.a)`, lo mismo que da `stockInfo` por código). La clave vieja va a `renom`,
  que `cl` mira primero: las unidades, recogidas, entradas, pedidos a fábrica, detecciones, salidas y el historial la siguen.
  Si dos códigos de la lista dicen productos distintos sobre la misma clave vieja, no se adivina (`dudosa`). Las claves de
  códigos que la lista no conoce (`crudas`) no se tocan.
- `stockFundirDifs(d)` al final de `stockMigrar`: en cada corte del historial, las entradas de `h[].d` con la misma clave se
  suman (con sus acciones); si dan 0 y no tienen acciones, se van. Para las claves fundidas: una detección (`det`) del mismo
  corte (fecha, hora, huella) con neto ≤ 0 queda con lápida «mismo producto con otro nombre»; con neto > 0 se achica a lo
  neto. Una salida sin pedido del control (`sm` con `pre` y `c`) con neto ≥ 0, lápida; con neto < 0, se achica.
- Corre en cada lectura y en la junta (`stockFusionar` → `stockMigrar`): todos los equipos llegan a lo mismo y la lápida es
  monótona (`fusLapidas`). Idempotente.

**Prueba**: `tests/test_codigo_nuevo.js` (15; 12 rojas contra `2a7c7bd`): una fila con PTF 20 + Moreno 3 y el pedido de 2;
mapas de PTF y Moreno en la clave de la lista; un renglón del Excel nuevo cae ahí; sin «sin explicar»; detección y salida
anuladas; con 22 contra 20 queda «+2» y la detección en 2; CH1297 sigue crudo; idempotente. Batería entera: 140 suites, 5.299 bien · 0 mal.

**Para el dueño**: al publicar y F5, la fila se junta sola y el aviso del control desaparece. Va a pasar con cada código nuevo
(el SMART 160x190): ya no hace falta nada.

## 4hz. 08/10: 🚛 los camiones en Administración, sobre la imagen de ChatGPT, con los tildes ahí mismo — reemplaza la escena 3D de Codex — PUBLICADA 08/10 12:36 (`2a7c7bd`, Pages OK, run 37810085454; el dueño: «reemplazá lo de Codex y publicá»; batería 139 suites, 5.284 bien · 0 mal)
**Cómo se llegó** (todo el 08/10):
- El dueño pidió «motion graphics» con camiones moviéndose en Stock, clicables («cargar este camión»), «algo más wow».
- Primero salió una muestra en CSS/SVG. El dueño pidió «más realista, más 3D», y se hicieron dos escenas Three.js en el
  scratchpad: una de Stock y otra de la Lista de carga, con galpón, andenes, autoelevador, lona abierta, bloom y papel picado.
- El dueño mandó una imagen hecha por ChatGPT (render isométrico nocturno de PTF, Banzer y Moreno, con un panel a la derecha):
  *«chat gpt lo hizo mejor y ni con la instrucción lo igualaste»*. Respuesta: usar SU imagen de fondo y poner lo vivo encima.
  El dueño aprobó el video.
- **Codex publicó en paralelo** (`7941fec`, 11:56) una escena 3D procedural en Administración («Stock y despacho», Three.js
  0.186 local, ~3 MB). Las fichas del resumen quedaron plegadas en un desplegable. La batería entera sobre lo publicado dio 0 rojas.
- El dueño comparó las dos: *«no se ve como tu diseño y tampoco tiene las opciones de carga lista ahí mismo»*. Después:
  *«que solo se vea en administración, no en la pestaña lista de carga, reemplazá lo de Codex y publicá junto con las
  correcciones pendientes»*.

**Hecho:**
- **Lo de Codex se sacó entero**: `admin-logistica.{js,css}`, `admin-logistica-scene.mjs`, `vendor/logistica-three/`,
  `ADMIN_LOGISTICA.md`, `tests/test_admin_logistica.cjs` y sus cambios en `pedidos.html` y `test_resumen.js` (con
  `git apply -R` de su parche). Las fichas del resumen vuelven a verse como antes.
- **`#carga-viva` es lo primero de `#adm-resumen`**: se pliega con «🙈 Ocultar resumen». Se pinta en `renderAdmin` (después
  de `pintarResumenAdm`) y en `renderCargaSiActiva`, cuando ya está armada (`CV_ARMADA`): así llegan los tildes de otro equipo.
- **La imagen** es `carga-viva/escena.jpg`, recortada de la de ChatGPT (1212×800, sin su panel, 330 KB), y `carga-viva/camion.png`
  es el camión de su panel. Lo vivo va en coordenadas de la imagen (`CV_POS`): carteles de PTF (el camión elegido), Banzer (lo
  que se carga allá ese día, todos los camiones) y Moreno (lo que hay que ir a buscar, `prodProd`), huellas, faros, ruta animada
  (SMIL) y el botón «📦 Ver su carga».
  - ⚠️ Los carteles TAPAN los textos que la imagen trae pintados («Camión 02 · En PTF» y «Cargar este camión» con el cursor).
    Si se cambia la imagen, hay que volver a ubicarlos.
- **Panel derecho**: los camiones de `VEHICULOS`, aunque no tengan pedidos ese día, + los asignados + «Sin vehículo».
  - Del elegido: chofer y paradas, «X / Y bultos», barra, lo que falta y los renglones «🏭 EN FÁBRICA» / «🏪 EN BANZER», cada uno
    con su tilde, con ⛔ sin stock y 📥 recoger de….
  - Al tildar, los colchones vuelan desde el portón. Al completar el camión: luces, papel picado y «✅ ¡Listo para salir!».
- **Una sola cuenta y los mismos tildes**: `cargaAgrupar(list)` sale de `cargaBloquesHtml` (la lista lo usa igual) y
  `cargaVivaDatos` arma los renglones con `cargaChkKey(fecha, camión, producto[, Banzer])`. `cvTildar` usa `setCargaChk`.
  Tildar arriba es tildar en la lista, para todo el equipo, y al revés.
- **`CV_DIA`**: Hoy / Mañana propio (mañana = `proximoDiaEntrega()`); los pedidos son los de ese día sin ventas de tienda, como
  `cargaLista`.
- **«📋 Ver sus paradas en la Lista de carga»** abre la lista en ese día (`setCargaDia`) y baja al bloque del camión
  (`data-veh` en `.carga-cam`).
- **La Lista de carga quedó como siempre**: la tira estuvo arriba de la lista en la rama (`234bfde`) y se sacó antes de publicar.
- `prefers-reduced-motion`: sin animaciones ni vuelos. En el celular, imagen arriba y panel abajo.
- **`tests/test_camiones_admin.js` (27)**, con reloj clavado en el 08/10 10:00 y un servidor de mentira que guarda las filas del
  sistema. Mira dónde vive, que no está en la carga, que lo de Codex no quedó, los camiones y las cuentas, los tildes en los dos
  sentidos, completar, Hoy/Mañana, «ver sus paradas», plegar, 390 px y errores. Contra la publicada: no tiene la tira.
- ⚠️ Un doble de `apiList` que NO devuelva la fila de los tildes (`__carga_chk__`) los borra en la relectura de después de
  tildar (`reescritaAplicar` aplica solo lo cambiado acá sobre lo del servidor). Para probar los tildes, que el doble guarde y
  devuelva las filas del sistema.

## 4hy. 08/10: 📍 la línea de «Banzer o PTF» pasa a ser la de LOGÍSTICA — PUBLICADA 08/10 12:36 junto con §4hz (`2a7c7bd`)
El dueño mandó una captura del mapa publicado (el de §4ht/§4hw, con la línea punteada del 07/10) con una línea negra dibujada
encima: *«logística quiere así la línea y división. trabajala no la publiques aún»*.
- **Cómo se pasó a coordenadas**: los píxeles negros de la captura (máximo de R,G,B < 45), fila por fila, a 41 vértices de norte a
  sur. La captura es el mapa en zoom 11 (1.456 px por grado de longitud, Mercator): con PTF de ancla, Banzer cae a menos de 1 px de
  su marca y la línea punteada vieja coincide con la de la captura. La comprobación (la línea nueva en rojo sobre la negra de la
  captura) quedó en el scratchpad, `linea/comparar.png`; se superponen.
- **La línea**: baja del norte (al este del aeropuerto Viru Viru) hacia el sudoeste, pasa ~140 m al OESTE de PTF, baja derecha por
  la avenida hasta El Trompillo, ahí dobla al oeste en un tramo casi horizontal (~5 km) y sigue al sudoeste. Comparada con la del
  dueño, en el norte y el centro va ~1 km más al este (más entregas para Banzer: la franja entre las dos líneas, del lado oeste de
  PTF) y en el sur va más al oeste.
- **`almLadoDeLinea` cambió de método** (la misma firma: distancia con signo en km, negativa = Banzer): antes tomaba el tramo que
  abarcaba la LATITUD del punto y medía contra ese tramo; con el tramo horizontal de El Trompillo eso daba el lado según norte/sur
  del tramo, no según oeste/este de la línea. Ahora `almLineaGeo` arma (y recuerda, por el arreglo) la línea en km con las puntas
  estiradas 80 km en su dirección, cerrada lejos al oeste en un polígono: el SIGNO es «adentro del polígono = oeste = Banzer»; el
  TAMAÑO, la distancia al tramo más cercano. El dibujo del mapa (`almLineaDivision`, 25 km por punta) no cambió.
- Textos: «La línea es la que dibujó logística el 08/10…» en «Cómo se cuenta».
- **`tests/test_banzer_ptf.js` → 109** (antes 106). §11 con la línea nueva (41 puntos, 43 dibujados), el punto 1,8 km al oeste de
  PTF va a Banzer, el quiebre de El Trompillo (al sur del tramo horizontal PTF, al norte Banzer, más al sur PTF) y cada depósito de
  su lado. El punto «en el medio» del armado (`MEDIO`) pasó a ser un punto de la línea nueva (era el punto medio entre los
  depósitos, que caía sobre la del dueño y con la de logística queda 1 km del lado de Banzer); las cuentas a mano de §3-§12 no
  cambiaron. Contra la publicada (`27c8d0d`): 89 bien · 20 mal.
- Publicada con §4hz (el dueño: «publicá junto con las correcciones pendientes»). Las zonas por depósito que defina logística siguen pudiendo reemplazar la línea.

## 4hx. 08/10: 🗓️ el plan de 7/15/30 días trabaja SOLO con los Excel del día + la revisión de Codex del 07/10 (F1-F3, D1-D2) y sin «🏭 Pedí a fábrica» — PUBLICADA 08/10 21:05 (`27c8d0d`, Pages OK 21:05, run 37711127971; el dueño: «sí… quítalos»; batería 138 suites, 5.254 bien · 0 mal)
Codex revisó lo publicado el 07/10 (`0d20d04`) y reprodujo tres defectos; el dueño, al discutir el primero, fijó la regla: *«no usan
ese botón [pedí a fábrica] y creo que lo vamos a quitar. Ellos no anotan que está en camino. Simplemente cargan los saldos de almacén
cada día. Y si en Moreno aumenta el saldo de almacén, quiere decir que ese producto se fabricó y salió… hagamos las cosas bien»*.
- **F1 (alta)**: `almPlanDe` restaba `stockEnCaminoSeguro(o)` entero: un «pedí a fábrica» anotado y nunca cerrado (o que llega en
  semanas) daba por cubierta una entrega de mañana («✓ Cada depósito tiene lo suyo» con 0 en PTF y 6 vendidos). Ahora resta solo
  **`almPlanRecogidas(o)`** = las recogidas de Moreno ya programadas (`q.tipo==='recogida'`: el mismo «traer» en marcha, ya
  descontado del Excel de Moreno por `stockLibreOrigen`) menos `o.detectado`. Lo pedido a fábrica no cuenta: lo que llega se ve en
  el Excel del día siguiente. La celda dice «+N en una recogida de Moreno». La tabla de abajo y la pantalla de Stock no cambiaron.
- **F2 (media)**: `cubreB` («a Banzer le sobra, entregas de la zona de PTF salen de Banzer») ahora es acción: entra en `almPlanHace`
  («Qué hacer»), en el total de arriba («↪️ N entregas de PTF salen de Banzer») y en la copia («↪️ CARGAR EN BANZER entregas de la
  zona de PTF»). Texto: «↪️ Cargar en Banzer N de las entregas de la zona de PTF (a Banzer le sobran)». Nunca de Banzer a PTF.
- **F3 (media)**: sin el Excel de PTF (`sinConteo`) el producto va a «Qué hacer» con «⚠️ Falta el Excel de PTF: no se puede
  calcular», cartel rojo arriba (`#alm-plan-sinexcel`), el total dice «hay ?» y la copia lo lista. Ya no sale «cada depósito tiene
  lo suyo» por falta de datos.
- **D1**: §4hw ya figuraba publicado en la rama (`a6cdf47`, `0dcb2d2`); `main` lo recibe con esta publicación. **D2**:
  `RESPUESTA_CLAUDE.md` §33 «Para revisar» marca lo que quedó viejo (el 1 km, `stockNecesario` como única fuente del plan).
- Rueda de prueba para el dueño (scratchpad `rueda/`): 6 vendidos para mañana, 0 en PTF y Banzer, 2 en Moreno; con un «pedí a
  fábrica» viejo o de hoy, antes «✓ Cada depósito tiene lo suyo», ahora «📥 Traer 8 de Moreno a PTF» + la alerta; con una recogida
  de 6 programada, «Traer 2» (bien antes y ahora).
- `test_banzer_ptf` → 105 (7 rojas contra `0d20d04`).
- **🚫 Sin el botón «🏭 Pedí a fábrica»** (dueño, 08/10: *«sí, porque ellos crean su Excel y correo, quítalos»*): se fue de la
  barra de Stock, y «🚨 PEDIR YA» / «🏭 Pedir esta semana» son solo aviso (`<span>`, antes abrían ese formulario). La leyenda de
  «🚚 Ya pedido» lo dice. `abrirStockPedido`/`guardarStockPedido` quedan en el código SIN botón (los pedidos ya anotados se siguen
  leyendo; `test_rev3_stock` los llama directo). «🚚 Programar recogida» y «📥 Llegó de fábrica» siguen (no se pidió sacarlos).
  `test_banzer_ptf` §1 lo verifica (→ 106).

## 4hw. 07/10 a la noche: 🗓️ el plan de 7/15/30 días, segunda vuelta — «tener» = lo ya vendido + lo para tener, «TRAER DE MORENO» y la alerta «Recordá revisar la producción» — PUBLICADA 07/10 18:46 (`0d20d04`, Pages OK 18:47, run 37698289301; el dueño: «publica»; batería 138 suites, 1 roja de carga en `test_borradores`, sola 95/95)
El dueño, mirando la pantalla de §4hv publicada con su caso real (ESPECIAL SEMIORTOPEDICO: PTF tener 7, hay 0, 6 ya vendidos;
«Traer 2 de Moreno a PTF»): *«no me cuadra eso de traer 2 de Moreno y hay 6 vendidos y tenemos 0. Debería aclarar traer (que ya
está vendido y debería estar en cada almacén) más lo que debería tener para los próximos días. Si 6 ya están vendidos y deberían
salir de PTF, debería indicar traer de Moreno los 6 que ya están vendidos + x cantidad para tener en stock, y lo mismo Banzer»*;
*«en tu imagen de prueba sí está bien, pero es porque tenemos saldo de stock… ¿qué pasa cuando el saldo es 0 en ambos
almacenes?»*; *«no "pedir": se supone que el stock ya está pedido, si no TRAER DE MORENO»*; y *«si el Excel de Moreno muestra
menos, una alerta de "recordá revisar la producción" o algo que alerte que deben traer para los próximos días esa cantidad y
tener»*.
- **Por qué «Traer 2» no cuadraba**: §4hv tomaba el MAYOR entre lo ya vendido y lo que se vende en el plazo, y lo que el Excel de
  Moreno no tenía no se mostraba: con 0 en los dos depósitos y 2 en Moreno decía «Traer 2», sin decir que faltaban los otros.
- **Tener = lo ya vendido + lo para tener, sumados** (`almPlanDe`: `firmeB/firmeP` = ya vendido en su zona; `xB/xP` = `porDia`×H
  con `sB`; `tB=firmeB+xB`, `tP=firmeP+xP`). Lo que rota poco, lo discontinuado y lo de pocos datos: todo en PTF. La celda dice
  «tener 7 · 6 ya vendidos + 1 para tener · hay 0» (`almPlanParteTxt`). ⚠️ Ya no es la cuenta de `stockNecesario` (el mayor, con
  fábrica + margen + reserva): el plan suma a propósito, el dueño quiere ver lo vendido aparte de lo que hay que tener.
- **Lo que falta se TRAE, entero** (`deM`): a PTF primero, después a Banzer, de la fábrica del producto (`almPlanFuente`: Moreno;
  Sueña → Multiespumas, por `stockBloqueDe`/`MARCA_FABRICA`), con cuánto de eso ya está vendido (`uF`): «📥 Traer 7 de Moreno a
  PTF (6 ya vendidos + 1 para tener)». Nunca «pedir», «producir», «fabricar» ni «no alcanza».
- **⚠️ La alerta** (`almPlanAlertaDe`): lo que hay que traer es MÁS de lo que dicen los Excel de los almacenes de donde se trae
  (`r.excel`: `o.otrosAlm`, libre de las recogidas programadas) y existe el Excel de ESA fábrica (`almPlanAlmsDe`: Moreno = los
  almacenes de «ir a buscar» que no dicen Multiespumas, o sea `IM - PRODUCTOTERMINADO`; de Multiespumas no se sube ninguno, así
  que Sueña no alerta). Texto (`almPlanAlertaTxt`): «⚠️ Recordá revisar la producción: para los próximos 7 días hay que traer 9 de
  Moreno y tenerlos, y el Excel de Moreno de hoy tiene 5. Faltan 4.» (singular: «tenerlo», «Falta 1»); si ese Excel no es de
  hoy, «el último Excel de Moreno, del 06/10». Va en la fila (caja ámbar), arriba del plan (`#alm-plan-alerta`: cuántos productos
  y cuántos faltan en total, con «Ver cuáles»), en el filtro «⚠️ Revisar la producción (n)» (`ALM_PLAN_VER='prod'`, aparece solo
  si hay alguna) y en la copia para logística («⚠️ RECORDÁ REVISAR LA PRODUCCIÓN…», después de TRAER). Compara, no calcula
  producción: mira el total del producto (una fábrica abastece a los dos depósitos).
- **Vistas**: «Qué hacer» (llevar o traer; antes «Qué llevar») · «⚠️ Revisar la producción» · «Todo el plan». Orden: primero lo que
  más ya vendido hay que traer (`almPlanVendidoTraer`), después lo que más se mueve. Total de arriba: «📥 traer 11 de Moreno y 2
  de Multiespumas (9 ya vendidos)».
- `test_banzer_ptf` §12 reescrita (→ 101; contra `3f44b05` 30 rojas con la función nueva reemplazada por una vacía, o 1 roja y
  se saltea sin ella): las cuentas a mano con la suma, el caso del dueño con 0 y 0 (ESPECIAL SEMIORTOPEDICO), Sueña de Multiespumas
  sin alerta, la alerta con el Excel de hoy y el de ayer, el singular, el cartel y el filtro, la copia y 390 px. ⚠️ Las filas se
  leen con `innerText`: con `textContent` los renglones de una celda salen pegados («tener 76 ya vendidos»). Capturas con datos
  inventados en el scratchpad (`cap_4hv2/`, `demo_plan2.js`).

## 4hv. 07/10 a la noche: 🗓️ «Banzer o PTF» — el plan desplegable de 7, 15 y 30 días: qué tener en cada depósito y qué llevar — PUBLICADA 07/10 18:10 (`3f44b05`, Pages OK 18:11, run 37694489367; el dueño: «sí, publica cuando terminen»; batería 138 suites, 0 rojas)
El dueño, con la pantalla de §4ht publicada, en varios mensajes seguidos: *«falta una pestaña desplegable que muestre qué tener
en Banzer y qué tener en PTF, porque ahí solo dice "llevar a Banzer" pero no muestra una lista… pensar a futuro y llevar en masa:
llevar y tener en Banzer para los próximos 7-15-30 días estos productos, tener en PTF para los 7-15-30 días estos productos»*;
*«no necesariamente el "calcular qué producir": esta lista es para saber qué stock tener en cada almacén para cubrir los
pedidos… ya tenemos otra pestaña que nos dice qué producir»*; *«netamente para saber los movimientos entre almacenes y tener en
almacén lo necesario para cubrir las entregas de las zonas que estamos armando»*; *«por ahí logística se lleva 30 colchones a
Banzer y deja a PTF con 3 de ese modelo y necesita 13»*; *«sin cálculos de qué pedir a producción: como cada día actualizan los
saldos de almacén, con eso trabajan; mover más que todo a Banzer, pero sin descuidar las entregas de PTF»*; *«no es que cada
día llevan a Banzer: se prevén un día y llevan el stock para entregar miércoles, jueves, viernes»*; *«en resumen, según la
rotación por entregas… qué tener para todo el mes o los próximos 15 días en cada almacén, previendo las entregas y zonas»*.
- **Dónde**: `<details id="alm-plan">` arriba de todo en «📍 Banzer o PTF» (debajo del resumen, antes del mapa), cerrado; se
  arma UNA vez con el esqueleto (`almPintar`) y solo se repinta lo de adentro (`#alm-plan-in`, `almPintarPlan`): una lectura
  nueva no lo cierra ni cambia el plazo. La búsqueda de arriba lo filtra también (`almBuscar`).
- **La cuenta, por producto y plazo** (`ALM_PLAN_DIAS=[7,15,30]`, `almPlanDe(f, H, hoy, porId, Z, cache)`):
  · **Lo ya vendido para esos días, en SU zona**: `stockData` anota ahora `o.compIds` (`{id, c, f}`) donde suma `comp` (las DOS
    líneas: lo de siempre y lo 🏭 llegado y contado); no cambia ninguna cuenta (`test_banzer_ptf` §12 verifica que suma igual
    que `comp` en todos los productos). Cada pedido sale de UN depósito (`almLadoPedido`): su pin, o su zona escrita (gana el
    lado mayor); «sobre la línea» = PTF; sin pin ni zona, con la proporción del producto.
  · **Lo que se va a vender**: `porDia` (el ritmo de la tabla, 15 días, reglas de rotación de Stock) × H, repartido con `sB`.
  · **Tener** en cada depósito = lo más alto de las dos, redondeado (`Math.round`, cada lado por su cuenta: 7 ≤ 15 ≤ 30).
    `f.por` (rota poco, discontinuado, pocos datos): todo en PTF, como la tabla.
- **Qué llevar** (con lo que HAY: los Excel del día; `f.hoyP`, `f.hoyB`, `o.otrosAlm`): a Banzer primero lo que a PTF le
  **sobra de lo suyo** (`pasar = min(faltaB, hoyP − tP)`: PTF nunca baja de su «tener» — el «deja a PTF con 3 y necesita 13» del
  dueño) y después de Moreno; a PTF, de Moreno, contando lo ya pedido en camino (`stockEnCaminoSeguro`), y ANTES que a Banzer
  («sin descuidar las entregas de PTF»). Si a Banzer le sobra y a PTF le falta: «N de las entregas de PTF pueden salir de
  Banzer» (`cubreB`; 🚫 nunca llevar de Banzer a PTF). Lo que no se cubre queda en `faltaB`/`faltaP` y **no se muestra**: el
  dueño no quiere cuentas de producción acá; la fila dice «Nada para mover: no hay de más en PTF ni en Moreno».
- **Pantalla**: plazos 7 / 15 / 30 días (con «hasta el …»), «Qué llevar» (las filas con algo que mover) / «Todo el plan»; total
  arriba (Banzer tener/hay, PTF tener/hay, llevar, traer de Moreno); por fila «🏪 Banzer: tener · hay · N ya vendidos», «🏭 PTF
  (no bajar de): tener · hay · +N en camino» y «Qué llevar» («🚚 Llevar 6 de PTF a Banzer · PTF queda con 4», «📥 Traer 2 de
  Moreno a Banzer»). **«📋 Copiar el plan de N días»** (`almCopiarPlan`): LLEVAR DE PTF A BANZER (con lo que queda en PTF), TRAER
  DE MORENO, TENER EN BANZER, TENER EN PTF (no bajar de esto). Sin «producir» ni «no alcanza».
- La tabla de abajo («Conviene tener», «Pasar N a Banzer») no cambió: es la cuenta de Stock (fábrica + margen + reserva); el
  plan es por plazo. Pueden dar números distintos a propósito.
- `test_banzer_ptf` §12 (24 nuevas → 80; contra `07c4db3` la §12 no existe: 1 roja y se saltea): las cuentas a mano de los
  cinco productos en los tres plazos, PTF nunca debajo de lo suyo, Moreno primero a PTF, nunca de Banzer a PTF, sin palabras de
  producción, el desplegable que no se cierra solo, la copia, y 390 px.

## 4hu. 07/10: 🧾 Mis pedidos — el número de nota en la tarjeta y en la ficha, solo para Eduardo — PUBLICADA 07/10 17:50 (`07c4db3`, Pages OK 17:50, run 37692171570; el dueño: «cuando terminen publica»; batería 138 suites, 5.204 bien · 0 mal)
El dueño, 07/10 a la noche, con una captura de «Mis pedidos» elegido como él (seis pedidos a MULTICENTER): *«en mis
pedidos las fichas de mis pedidos no muestran el nro de nota, ejemplo eduardo no puede saber qué número de OC es. Que solo a
eduardo muestre tb número de nota»*. La «OC 10-050» de la tarjeta es la serie del panel (`nextOcMes`); el número con el que
él identifica cada venta es el de «N° Nota de venta» (`p.nota`, que para él no es obligatorio: `req-lite`). La tarjeta no lo
mostraba para nadie; la ficha (`showMisModal`) tampoco.
- **`MIS_VE_NOTA=['Eduardo Añez']`** + **`misVeNota(v)`** (`mismoVendedor`: «Eduardo Anez» y «EDUARDO AÑEZ» son él): decide
  el nombre ELEGIDO en Mis pedidos (`misVendedorSel`), no el vendedor del pedido. Con «👑 Ver todos» y su nombre elegido, la
  ve en todas las tarjetas; con otro nombre, en ninguna. Las vendedoras siguen viendo lo de siempre.
- **`misNotaTxt(p)`** en la línea de abajo del cliente: «… · OC 10-050 · **Nota 4567**», o «· sin nota» si no se cargó (si
  no, una tarjeta sin el número se ve igual que antes y no se sabe si falta cargarlo). Ni la ATC ni la RPT llevan nota (el
  formulario esconde el campo): ahí nada. El «·» va pegado a la nota (`white-space:nowrap`): con una zona larga la línea se
  parte antes del «·».
- La ficha que se abre al tocar la tarjeta dice arriba «MULTICENTER · OC 10-050 · Nota 4567» (solo con nota).
- `misCardHtml(p, n, todos, verNota)`: `renderMis` calcula `verNota` una vez; quien la llama con 3 datos (`test_modif`)
  decide por el campo.
- `tests/test_mis_nota.js` (19; 8 rojas contra `faff9a0`): Eduardo con nota / sin nota / ATC / RPT, la ficha, Carola con
  nota (no la ve), el nombre escrito distinto, «Ver todos» con uno y otro nombre, una nota con símbolos (texto, no HTML) y
  la llamada con 3 datos. `test_modif`, `test_rev2_mis`, `test_rev3_atc_mis`, `test_rev7_celular`, `test_sinmonto`,
  `test_rev4_atc_flete`: en verde.

## 4ht. 07/10: 📍 «Banzer o PTF» — qué tener en cada depósito según dónde se entrega — PUBLICADA 07/10 15:10 (`2c5ad8c`), Pages OK 15:11; con la línea del dueño, PUBLICADA 07/10 17:33 (`faff9a0`), Pages OK 17:34
El dueño, 07/10: *«Necesitamos saber, medir y determinar qué productos debemos tener en almacén banzer y que en almacén
productos terminados fabrica, según los focos de calor de entrega y rotación para ser más eficientes y tener el stock a la
mano según la zona de entrega»*. Se le propuso (60 días de entregas por el pin de Maps o la zona; cada entrega cuenta para el
depósito más cerca; el total sale de la cuenta de Stock y se reparte con la proporción; lo que rota poco no se reparte; tabla
y mapa en Stock; nunca traer de Banzer a fábrica) y lo aprobó mandando los dos enlaces de Maps.

**📍 Dónde quedan los depósitos (`ALM_UBIC`).** Los enlaces que mandó (`maps.app.goo.gl/…?g_st=ic`) son de LUGARES con nombre
(negocios), y Google ya no le da el pin a un programa: redirige a `maps.google.com?q=<nombre y dirección>&ftid=…` y la página
final (~800 KB) no trae ni un par de coordenadas. El servidor (`resolveLinks`) tampoco pudo abrirlos (corridas 17-20 del
«Diagnóstico de la lectura del panel», que se usó para salir a internet: desde esta sesión el proxy no abre `maps.app.goo.gl`).
- **PTF, exacto**: el `q=` trae su Plus Code (`7V24+CRP MULTIESPUMAS VISCARRA S.R.L., Av. Quinto Anillo`) → `olcCoords` =
  −17.7489125, −63.1429219 (el geocodificador del servidor dio lo mismo a 1 m).
- **Banzer, aproximado** (`aprox:true`): solo la dirección escrita («Vaca Fria 8vo anillo, Av Viru Viru 2») → geocodificador del
  servidor = −17.7197548, −63.1631138. La pantalla lo dice y pide avisar si el punto del mapa no cae en su lugar. Si el dueño
  manda las coordenadas (mantener apretado en Maps), se cambian en `ALM_UBIC` y se saca `aprox`.
- El `ftid` NO es una celda S2 decodificable (probado: da 4-6 km de error). No volver a intentarlo.
- Quedan a **3,9 km** en línea recta: PTF al este (5to anillo), Banzer al norte (8vo anillo).

**📊 ¿Alcanzan las ubicaciones?** El diagnóstico cuenta (solo números, el registro es público): de **699** entregas con fecha en
los últimos 60 días, **427** tienen enlace —311 con las coordenadas adentro (el panel las lee sin internet), 103 enlaces cortos
y 13 de otra forma— y **272** no tienen, de las cuales **248** tienen zona escrita. Una muestra de los **12 enlaces cortos más
nuevos**: el servidor abrió **12 de 12** en 5,4 s. O sea: lo que falla es solo el enlace de un LUGAR con nombre; los de los
clientes (un punto marcado) se abren bien. No hace falta tocar el `.gs`.

**Cómo mide** (`almZonaData`, todo en la página, solo mira):
- Las entregas de los últimos `ALM_ZONA_DIAS`=60 días (por fecha de entrega, hasta hoy) que **miden la rotación**, con las
  reglas de la tabla de Stock: `stockCuenta` (sin filas del sistema, borradores ni ATC), sin ventas de tienda (`esVentaTienda`:
  no tienen dirección), sin `stockPedidoUnico` (RPT, puntuales, Eduardo salvo a Multicenter) y sin productos de tienda.
- El lado de cada entrega: el pin (`almPunto` = `MAPA_COORDS` o `coordsDeLink`; a más de `KM_SOSPECHOSO` no cuenta) → el depósito
  más cerca en línea recta (`almLado`, `almKm`); con menos de `ALM_EMPATE_KM`=1 km de diferencia, **mitad y mitad** («en el
  medio»). Sin pin, la **zona escrita** repartida como sus pedidos CON pin (`almZonas`: toda la planilla, sin mayúsculas ni
  acentos, mínimo `ALM_ZONA_MIN`=3 con pin). Sin pin ni zona conocida, no cuenta y se dice cuántas son.
- Por **unidades** (el stock se gasta por unidad).
- **Cuánto tener** = `stockNecesario(o)` = `max(comp, porDia × (fábrica + margen + reserva))`: la MISMA cuenta de
  `stockCuantoPedir`, sacada a una función (el test comprueba que «cuánto pedir» da lo mismo que antes). ⚠️ Por eso la **venta de
  tienda SÍ cuenta para el tener** (es rotación en Stock) aunque no cuente para el lado. Lo discontinuado: solo lo vendido.
- **Reparto**: `objB = round(tener × proporción Banzer)`, `objP = tener − objB`. No se reparte (todo en PTF, que es a donde llega de
  fábrica) lo que rota poco (`baja`) y lo discontinuado; con menos de `ALM_MIN_UNID`=3 unidades ubicadas, «pocos datos: queda como
  está».
- **Qué hacer**: `pasar` = «🚚 Pasar N a Banzer» solo con lo que a PTF le SOBRA de lo suyo (`hoyP − objP`), y lo que falta «de lo
  próximo que llegue»; `llega` = «🏭 Lo próximo que llegue: N a Banzer» (a PTF no le sobra); `noMas` = «✋ No mandar más a Banzer»
  (Banzer tiene más que lo suyo, o tiene algo de un producto que rota poco). 🚫 **Nunca** se propone traer de Banzer a fábrica
  (dueño, 26/09). `bien`, `datos`, `sinConteo`. «Hoy» = `o.deposito` (PTF, sin negativos) y `salePor` de Banzer (`almHoyBanzer`,
  `recogerMismo('Banzer', nm)`): lo del último Excel menos lo que salió después.

**La pantalla** (botón «📍 Banzer o PTF» en la barra de Stock → `abrirAlm`, `#alm-overlay`, z-index 3100; las fichas de pedido
van en 4000): resumen (entregas, % de cada lado, cómo se ubicaron, aviso de Banzer aproximado), **mapa** (Leaflet: los dos
depósitos con su nombre, cada entrega con el color de su lado y una mancha de 15 px —en píxeles, no en metros: se ve igual a
cualquier zoom— que se oscurece donde más se entrega, y la línea punteada donde los dos quedan a la misma distancia,
`almLineaMedia`; zoom de a cuartos, `zoomSnap:0.25`, para que el encuadre llene la caja), **tabla** (filtros «Para hacer / 🏪
Tener en Banzer / Con entregas / Todos», búsqueda en la barra de arriba —no se redibuja, no pierde el foco—, el total a mover
arriba, tocar un producto lo deja solo en el mapa), las **zonas escritas** y de qué lado quedan, y «📋 Copiar para logística»:
arranca con **«🏪 TENER EN BANZER (lo demás, en PTF)»** —la respuesta a la pregunta del dueño, de mayor a menor y con lo que
hay hoy— y sigue con pasar / lo próximo que llegue / no mandar más. En el celular la tabla scrollea adentro de su caja.

**Los enlaces cortos** que el panel no lee (`T.pend`) los abre el servidor en segundo plano (`almGeoPedir`: de a `ALM_GEO_LOTE`=20,
los más nuevos primero, hasta `ALM_GEO_VUELTAS`=5 tandas mientras abra alguno, con `conTopeDuro` de 150 s), UNA vez por apertura
de la página (después, botón «📍 Buscarlos»). Lo que abre va a `MAPA_COORDS` y al teléfono (`geoCacheSave`: sirve también al
mapa de entregas); lo que no, a `ALM_GEO_FALLO` (la sesión) y esa entrega va por su zona.

⚠️ **No cambia nada**: no marca pedidos, no toca el stock ni la planilla. La revisión automática sigue con el orden del dueño (PTF →
Banzer → IM, 21/09). **Para decidir con el dueño**: (1) que el punto de Banzer está bien; (2) si quiere que la revisión
automática reparta por cercanía (hoy no); (3) la ventana de 60 días y el margen de 1 km «en el medio».

`tests/test_banzer_ptf.js` (48, reloj clavado en el 07/10/2026, ubicaciones y pedidos inventados, Leaflet de mentira que anota lo
que se dibuja): qué cuenta y qué no, el lado/medio/zona, las cinco acciones con números exactos, la tabla y sus filtros, el mapa,
los enlaces cortos (una vez, el más nuevo primero, lo que no abre se dice), el texto para logística, que no cambia nada, sin
Leaflet y en 390 px. Contra `main` (`88120f2`): no tiene la pantalla. **Batería entera sobre `58b1bfa`: 137 suites, 5.175 bien ·
0 mal** (`test_stock_detalle` «ok (sin resumen)», como siempre); después de «Tener en Banzer» y el mapa en píxeles (solo tocan
funciones nuevas) se corrieron otra vez las de Banzer y de stock: todas en verde. Capturas de demo (datos inventados, Leaflet servido del paquete de npm
porque el proxy no deja salir a unpkg ni a los mosaicos de OpenStreetMap): `cap_4ht/` del scratchpad.

**Publicación.** El dueño, 07/10: *«publica y dejas el md para codex»*. Informe para Codex: `RESPUESTA_CLAUDE.md` §33 (`45a95b4`). Sin ningún workflow corriendo ni en cola, `main` = **`2c5ad8c`** (merge de la rama) a las **15:10** de Bolivia; **Pages OK 15:11** (corrida `37672517404`, build/deploy/report en verde; el `pedidos.html` de `2c5ad8c` trae `abrirAlm`). Sin cambios al `.gs`: no hace falta implementar nada. Basta F5 para ver el botón. Queda que el dueño mire si el punto de Banzer cae bien.

**Decidido por el dueño (07/10, después de publicar)**: la revisión automática **NO** pasa a elegir el depósito más cerca *«aún no porque debemos definir bien con logística las zonas que abarca cada almacén»*. Sigue PTF → Banzer → IM (21/09). Cuando logística defina qué zonas atiende cada depósito, esa lista (zona → depósito) puede reemplazar la línea recta de esta pantalla y, si el dueño lo pide, alimentar la revisión automática. Para esa charla sirve el cuadro «🗺️ Las zonas escritas: de qué lado quedan» de la pantalla.

**✏️ La línea del dueño (07/10, «probemos la A»; el dueño: «si hazlo» → PUBLICADA 07/10 17:33, `faff9a0`, Pages OK 17:34 (run 37690314308); batería 137 suites, 5.185 bien · 0 mal).** Con la pantalla publicada mandó una captura del mapa real con una línea roja dibujada a mano: *«el corte de la línea y división no me convence, dame opciones, la línea debería ser más hacia la izquierda»*. La división «el más cerca en línea recta» con PTF y Banzer a solo 3,9 km es casi diagonal (suroeste→noreste) y la franja «en el medio» (diferencia de distancias < 1 km) se abre en abanico lejos de los depósitos: era la mancha violeta ancha del oeste. Se le ofreció **A · su línea** (dibujada sobre su propia captura, con los puntos recoloreados por lado: `opciones_4ht/` del scratchpad) o **B · por zonas de logística**, y eligió la A.
- **`ALM_DIVISION`**: su trazo pasado a coordenadas tomando como referencia los dos marcadores de la captura (Banzer 467,5/106,8 px y PTF 509,5/169,9 px → 2.080 px por grado de longitud, ~2.174 por grado de latitud; zoom ~11,5): 23 puntos de norte a sur, a menos de 70 m de su trazo. Pasa entre los dos depósitos y baja por el centro (≈150 m al oeste de la plaza) hacia el sudoeste.
- **`almLadoDeLinea(pt)`**: distancia con signo, en km y perpendicular al tramo que abarca la latitud del punto (más allá de las puntas, el tramo de la punta estirado): negativa = izquierda/oeste → **Banzer**; positiva = derecha/este → **PTF**; a menos de `ALM_LINEA_BANDA_KM`=0,5 km, mitad y mitad («sobre la línea»). `almLado` la usa si hay línea (`almHayLinea`); vacía, vuelve «el más cerca» (`ALM_EMPATE_KM`). Todo lo demás (zonas aprendidas, reparto, acciones) sale de `almLado`, sin cambios.
- Mapa: `almLineaDivision()` dibuja la línea estirada 25 km en las dos puntas; los textos dicen «del lado de…» / «sobre la línea» (`almReglaTxt`). Cuando logística defina las zonas de cada depósito, van a mandar sobre la línea (dueño, 07/10).
- `test_banzer_ptf` §11 (8): una entrega al sudoeste más cerca de PTF pero a la izquierda → Banzer; una al noreste más cerca de Banzer pero a la derecha → PTF; la franja de 500 m; las puntas estiradas; sin línea, la regla de antes; el dibujo y los textos. 56/56. Contra `main` `2c5ad8c` la §11 revienta (`almHayLinea` no existe) y el título del mapa da rojo. Banzer, stock, `test_ubicar` y `test_auditoria`: en verde.

## 4hs. 06/10: 📅 el control del corte, arreglado — solo el Excel del día, la celda guarda 3 días, una página vieja ya no lo rompe (servidor `2026-10-06-a`) — PÁGINA PUBLICADA 06/10 16:56 (`45d3108`), SERVIDOR IMPLEMENTADO 06/10 ~20:30 (el dueño)
El dueño, el 06/10 a las 13:00, después de la auditoría (§4hq): *«Pues arreglemos lo que hay que arreglar del control de corte.
Que no permita subir corte de días anteriores tiene que ser del día. La hoja de Excel si marca día y hora si no me equivoco. Ni
habíamos quedado que las celdas de corte solo almacenaban X días y lo anteriores se iban borrando para no llenarse? De que me
sirve un stock de hace dos semana? Si cada día te subo la lista actualizadas..»*. Sí marca: «EXISTENCIAS ALMACEN AL dd/mm/aaaa»
arriba y «Fecha : dd/mm/aaaa hh:mm:ss - usuario» al pie (cuándo se sacó); el nombre del archivo también trae día y hora.

**📅 Solo el Excel del día** (`existNoEsDeHoy`, en la vista previa y otra vez al confirmar):
- «existencias al» y el día en que se sacó (pie o nombre) tienen que ser de HOY, con el día de Bolivia (no el del aparato). Sin
  ninguna fecha no entra («no dice de qué día es»). Vale para los tres almacenes. El de otro día abre «⛔ Este Excel no es de
  hoy», dice de qué día es y cuál se puede subir, y no tiene botón para usarlo.
- Consecuencia que hay que decir: un reporte sacado a la noche y subido a la mañana siguiente no entra; se saca de nuevo.
- Sin «existencias al» pero con pie o nombre de hoy, entra con ese día (`fechaDeHora`, y lo dice). Antes suponía «hoy».

**🕰️ La hora sale del pie primero** (`existPonerHora`): el pie está ADENTRO del archivo, igual en todas las copias; el nombre
la tiene unos segundos después y WhatsApp lo cambia. El mismo Excel subido con dos nombres daba dos cortes (§4hq B4, «3 de 10 →
6 recibidas»); ahora da el mismo. `r.sacado` y `r.horaDe` ('pie'/'nombre').

**⛔ Un corte no vuelve atrás**:
- Se fue «usarlo igual»: un Excel más viejo que el vigente de ese almacén no entra (`existCorteViejoTxt`, el botón se apaga con
  `existBotonUsar`, y `confirmarImportExist` lo frena otra vez).
- El mismo día con la hora de un solo lado: si el vigente no dice la hora pero se SUBIÓ antes de la hora del nuevo
  (`stockSubidoAntesDe`: lo subido ya estaba contado), el nuevo es más nuevo y entra; si no, «falta la hora» y no entra.
- `fusFoto` es monótono (`stockCompararCortes`): en cualquier junta gana el corte más nuevo, también cuando «acá no se tocó»
  y la otra copia trae uno VIEJO. Así fue el 06/10: una página sin F5 volvió a subir los tres Excel del sábado.

**✂️ La celda guarda 3 días** (`STOCK_CONTROL_DIAS=3`, `stockPodarControl` adentro de `stockPodar`, los tres caminos):
- Detecciones y salidas del control de los últimos 3 días. Una salida anotada a mano que ningún Excel incluye todavía se queda.
- El historial: los cortes de esos días y SIEMPRE el último de cada almacén (tope `STOCK_HIST` 15). Las diferencias (`h[].d`)
  enteras solo del último corte de cada almacén (la corrección del mismo Excel las usa); de los anteriores, solo las que
  tienen algo para deshacer. Las de Moreno no se guardan (son información, no hay nada que deshacer).
- Los pedidos a fábrica recibidos, enteros 3 días (`STOCK_RECIBIDOS_DIAS`, eran 45); después la MUESTRA de siempre, que mide
  la fábrica (`STOCK_RECIBIDOS_TOPE` sigue en 120: probado que con 60 cambiaba el tiempo medido de Moreno).
- Nombres cortos: corte, detección, recepción y salida son huellas de 64 bits (`huellaId`: `c…`, `d:…`, `x:…`, `s:…`, ~15
  letras). La evidencia de la recepción sin `m` ni `a` vacío (`p`, el corte anterior, volvió en la revisión: lo usa B3); la
  detección sin `ts` ni `alm` vacío; el historial viaja
  sin `id` (`leerStock` lo rearma). Una recepción ocupa ~150 letras (la auditoría midió ~358).
- ⚠️ En producción ya HAY control con el formato de antes: el 06/10 a la mañana subieron los tres Excel (10:52 PTF, 10:55 IM,
  11:16 Banzer) con la página del 05/10, y el diagnóstico de las 13:24 leyó 12 detecciones con el nombre largo (sin
  recepciones ni salidas). Son compatibles: `existHuella` no cambió, el historial y las detecciones de antes traen `hu`, y la
  evidencia vieja tiene la misma forma (`c`, `p`). Volver a subir ese Excel con la página nueva se alinea a la hora del nombre,
  no duplica nada y ofrece la detección vieja por su propio nombre (`test_corte_del_dia` §16). Los dos formatos conviven hasta
  que la poda los saca (3 días).
- **Medido** con la simulación de la auditoría (`aud_corte/sim_tamano.js` del scratchpad, perfil medio = 3-15 diferencias por
  corte, 1-3 pedidos a fábrica por día, 60 días hábiles): antes cruzaba las 50.000 letras el día 8; con 7 días de control, el
  día 48; con 3 días, **máximo 39.573 (79 %) y nunca pasó el aviso de 45.000**. Lo único que sigue creciendo ahí son pedidos
  a fábrica PENDIENTES que nadie asigna (la simulación tilda el 60 %): son datos reales y el «⚠️ reclamar» los muestra.

**🧓 Una página vieja ya no rompe el control**:
- `STOCK.pv=3` en cada guardado (`filaStock`, `stockFusionar`, la cola sin memoria): una página de antes lo pierde al guardar.
- Al leer, si la copia no tiene `pv` y esta memoria (de una página al día) tiene un corte más nuevo o el control que la copia
  perdió (`stockProtegerDePaginaVieja`), se JUNTA con la base en vez de adoptarla y se vuelve a guardar una vez por sello
  (`stockRepararLuego`), con el aviso «una computadora con la página VIEJA…». Una copia vieja que no rompe nada se adopta.
- `stockFusionar` trata una copia con `pv` como que conoce `det`/`sm` (antes solo `v≥2`).
- **El arreglo de fondo es el servidor `2026-10-06-a`**: `__stock__` sellado sin `sf ≥ 3` (`STOCK_FORMATO_MIN`) → `actualizar`
  sin tocar la hoja. La página nueva manda `sf` (`apiSaveAhora`). `probarAntesDeImplementar` dice quién guardó el stock por
  última vez (con `pv` o sin). Solo el stock lo pide.
- ⚠️ **Orden: primero la página, todos F5, recién después el servidor.** La página publicada hoy (3443703) no manda `sf`: con
  el servidor nuevo antes, nadie podría guardar el stock hasta recargar. Volver atrás = ✏️ a la versión ANOTADA antes de
  implementar (tendría que ser la 36, la 10-02-a) Y pegar la 10-02-a (enlace fijo a `6b76e7a…`).

**Los otros hallazgos de §4hq**: B2 (`sugerir` no ofrece dos veces el mismo pedido; `pendQ` no deja pasar de lo pedido), B3
(`stockRecYaEnFoto`: la recogida cerrada desde el control no se le resta otra vez a Moreno si su Excel es de ese momento o
después: queda como `nr`), B5d (`stockMovEnVentana` mira las dos puntas el mismo día), B6 (el Excel corregido compara contra
lo que dijo la versión anterior en `h[].d`, de más y de menos; sus salidas quedan con lápida «corte reemplazado», que gana en
la junta), B8 (`stockMigrar` lleva `det`, `sm` y `h[].d` a la clave unida).
- **Sigue sin arreglar** (no es del control del corte): lo del cierre de entregas (§4hq) y `stockMigrar` sin `cod`.

**🔎 Revisión independiente (06/10 a la tarde)**: un agente, con la página publicada `3443703` y el `.gs` real (el arnés de
`test_concurrencia`), encontró cuatro problemas, los cuatro reproducidos con scripts (`rev_4hs/` del scratchpad). Arreglados:
1. **ALTA, después del F5 la página nueva mandaba el stock de la vieja con `sf`.** Con el servidor nuevo, la página vieja vuelve a
   subir el Excel del sábado, el servidor contesta `actualizar` y la fila queda en la cola. La persona hace F5 (lo que dice el
   aviso); la página nueva vacía la cola ANTES de la primera lectura y `sisPlegar` mandaba la memoria de la pestaña (la dejó la
   vieja en `sessionStorage`) con `sf:3` y el sello: el servidor la aceptaba y el corte del sábado volvía, ahora con `pv` 3 (las
   otras computadoras la adoptaban tal cual). Arreglo: `sisCargarPestana` no carga una memoria sin `pv`, y `apiSaveAhora` manda
   SIN sello (`rev:0`) una fila del stock sin `pv` (`stockTextoAlDia`): `conflicto` → `sisFusionarYGuardar` → queda el corte de
   hoy. Probado también con el `.gs` real (`b_f5_cola.js`: «la planilla sigue con el corte de hoy»).
2. **MEDIA, la protección al leer se apagaba sola**: `stockProtegerDePaginaVieja` le pedía `pv` a la memoria. Una copia vieja
   inocente (un pedido a fábrica anotado) se adoptaba, la memoria perdía el `pv`, y la siguiente que volvía atrás el corte entraba
   callada. Arreglo: sin pedirle `pv` a la memoria («volvió atrás» y «borró el control» no lo necesitan).
3. **MEDIA, B3 a medias**: miraba «Moreno ≥ la hora de acá» el mismo día. Con Moreno a las 09:50 y acá a las 09:55 (el orden
   natural sacándolos de a uno) la recogida de ayer se le restaba otra vez. Arreglo: la recepción guarda el corte ANTERIOR de acá
   (`ev.p`); el Excel de Moreno de un día posterior al corte ya la tiene; del mismo día, si se sacó después del corte anterior de
   acá (el de ayer, o el de esta mañana si este es el de la tarde). `stockRecYaEnFoto`. La recepción sigue < 190 letras.
4. **BAJA, el mismo archivo dos veces rompía B6**: la segunda subida (todo coincide) dejaba el renglón del historial sin `d`, y el
   corregido comparaba contra 0 (esperado 6, +1 en vez de 10, −3): anulaba la salida, no dejaba anotar el −3 y se iban los «↩️ no
   había llegado». Arreglo: el mismo archivo (misma huella, `_hPrev`) conserva las diferencias de la primera y suma lo tildado
   ahora (`existJuntarDif`, sin repetir ids).
- **Sospecha del período de transición, arreglada**: la página de antes toma la hora del NOMBRE (08:50:15) y esta la del PIE
  (08:50:12). Si la vieja lo subió primero, la nueva rechazaba el mismo archivo como «más viejo». `existAlinearHora`: mismo
  almacén y día, misma huella, a menos de 2 minutos → usa la hora con la que ya está. Otro contenido con hora anterior sigue
  siendo más viejo.
- **Texto**: un «📋 Conté a mano» más nuevo que el Excel lo frenaba con «otro Excel… falta la hora». Ahora `previoAMano`: «Ya hay
  un conteo a mano de hoy de este depósito (anotado a las HH:MM), más nuevo que este Excel…».
- Lo que miró y no encontró nada serio: el servidor no frena guardados legítimos (la cola y el reguardado tras `conflicto` pasan
  por `apiSaveAhora`, el único que arma un `save`, y nada fuera del `.gs` escribe `__stock__`); los ids son los mismos entre dos
  páginas nuevas; la poda depende solo de la fecha y corre en los tres caminos (las lápidas se van junto con lo suyo); `fusFoto`
  no perdió nada nuevo en ningún caso; `stockRepararLuego` guarda una vez por sello (sin bucle).
- Pruebas nuevas en `test_corte_del_dia`: §7c-7d, §11-15 (11 más). §4b cambió a conciencia (la evidencia lleva `p` otra vez).
  Y §16 (4): lo que subió hoy la página de antes, leído por la nueva.

**Pruebas**: `tests/test_corte_del_dia.js` (56; con archivos .xlsx armados en la prueba y subidos por el botón de verdad; 34
rojas contra la publicada `3443703`, donde las secciones 3, 4 y 15 ni corren, y 9 contra `84c2b74`: las de la revisión);
`test_servidor` §22 (9; 6 rojas contra la `2026-10-02-a`). Cambiaron a conciencia:
`test_control_corte` (ids cortos; sin «usarlo igual»), `test_rev_corte_codex` (`_otroDia` para los casos que suben «el de
mañana» sin mover el reloj; R6 sin tilde), `test_existencias`, `test_rev2_stock`, `test_stock_podar` (3 días, el historial,
dos recibidos recientes, la junta con la misma poda) y `test_identidad` (el reporte es de hoy), `test_concurrencia` (el otro
equipo guarda con `sf`), `test_saldo_servidor` (versión). **Batería entera (`84c2b74`): 136 suites, 5.114 comprobaciones, 0 rojas** (`test_stock_detalle` sin resumen, como siempre).
**Con la revisión (`22e463b`): 136 suites, 5.125 comprobaciones, 0 rojas** (+4 de §16 después, solo prueba: 56/56).

**Publicación (06/10, dueño: «Publica»)**: `main` = **`45d3108`** a las 16:56 de Bolivia (merge de la rama `a86abbd` sobre
`93188df`, el panel automático de las 15:17; ninguna corrida de Actions en curso, 4 minutos antes del cron de las 17:00).
Pages: corrida `37530190248`, ✅ a las 16:56:32. La página, el `.gs` y las pruebas de `main` son idénticos a la rama.
- **El servidor `2026-10-06-a` todavía NO está implementado**: lo hace el dueño cuando todos hicieron F5. Enlace fijo:
  `https://raw.githubusercontent.com/eduardoxyz22-maker/MULTIESPUMAS/45d3108e460241bed5791aac9911cc469824da31/google-apps-script.gs`
  (2.449 líneas, termina en `}` con `return borrador;` antes; comprobado bajándolo). `probarAntesDeImplementar` puede dar el ⚠️
  «el stock lo guardó por última vez una página VIEJA» hasta que alguien con la página nueva toque el stock: no frena.
- **Volver atrás** = ✏️ a la versión ANOTADA antes de implementar (tendría que ser la 36, la `2026-10-02-a`) Y pegar la
  10-02-a del enlace fijo a `6b76e7aa06d9168ff1dbfd8836585c8895b029b6` (2.430 líneas, comprobado).
- Sin el servidor, la página ya protege: solo el Excel de hoy, el corte no vuelve atrás, la lectura junta lo que manda una
  página vieja y lo reguarda. El servidor cierra lo que queda: una página que nunca hizo F5 ya no puede escribir el stock.
- **20:22, el dueño pegó la 06-a y corrió `probarAntesDeImplementar`** (captura): versión 2026-10-06-a, 29 funciones, 1.255
  filas, disparadores y repaso de Kommo (hace 4 min) ✅, stock 27.526/50.000 (55 %), arqueo 0, lectura comprimida 1.039.561 →
  297.116, 14 feriados por venir, 4 reservas de 3 pedidos, «✅ Se puede implementar» con UN ⚠️: el stock lo guardó por última
  vez una página VIEJA (esperado: nadie lo guardó todavía con la página nueva). Se le dijo que implemente (✏️ → versión nueva,
  anotando antes el número, tendría que ser la 36) y que lo compruebe en 🔒 Cerrar día: «versión 2026-10-06-a» sin la línea
  gris «Hay una versión más nueva del script sin publicar». Una página vieja que todavía intente guardar el stock recibe
  `actualizar`: lo deja en SU cola con el aviso de recargar (`rechazoSeReintentaSolo`), y con F5 la página nueva lo manda sin
  sello y se junta.
- **~20:30 el dueño: «listo implementado y publicado».** Comprobado sin entrar a Google: el despacho a mano del diagnóstico da
  403 desde esta sesión, así que se le agregó una línea útil (`78112f6`: «servidor: 🔒 una página sin F5 ya NO puede guardar el
  stock») y el push a la rama lo corrió (corrida `37552586393`, 20:34): **versión `2026-10-06-a`** en las cuatro lecturas,
  «🔒 una página sin F5 ya NO puede guardar el stock», stock 27.526 (55 %) todavía guardado por una página vieja (se va con el
  primer guardado de la página nueva), lecturas de 2,4-4 s, comprimida 3,8 veces menos, la de lo cambiado 205 bytes, cuenta
  de control ✅. El saldo sigue con los tres cortes del 06/10. Volver atrás, si hiciera falta: ✏️ a la versión anotada (la 36)
  Y pegar la 10-02-a de `6b76e7a…`.

## 4hr. 06/10: ⏳ «Falta cobrar» se toca y dice quiénes son — el dueño: *«contabilidad no sabe qué clientes son»*
El dueño, con capturas de Contabilidad (Carola, septiembre: «Falta cobrar Bs 7.810,00 · 3 ventas con saldo», «Por cobrar
Bs 7.810,00» en el Cuadre y «Revisar antes de cerrar» sin ninguna línea de deuda): *«en cuadre y conciliación los vendedores
sale que tienen por cobrar pero contabilidad no sabe qué clientes son, tampoco sale en el bot de revisar antes de cerrar y en
ventas tampoco. En la ficha de falta por cobrar al dar click debería abrir una pestaña que muestre los clientes y al dar otro
click llevar a esos clientes.»*
- **Por qué no salía en «Revisar antes de cerrar»:** el único aviso de deuda era «ya entregada y todavía sin cobrar»
  (`p.entregado` + saldo), y los choferes no marcan ✅ (§4gp): casi nunca se disparaba. La caja «⏳ Por cobrar» del Cuadre sí
  listaba los clientes, al costado (y abajo en pantallas angostas).
- Hecho en `pedidos.html`:
  · **`mcToca(...)`**: una ficha (`mc`) que se toca (clase `mc-toca`, `role=button`, Enter/espacio) con «👆 Tocá para ver
    quiénes son». La usan «Falta cobrar» de Ventas (con saldo; sin saldo sigue «✅ Nada», no se toca) y «Por cobrar» del Cuadre
    (sin arqueo anotado; sin saldo ahora dice «✅ Nada» en verde en vez de «Bs 0,00» en ámbar). «⏳ Con saldo» del resumen de
    Ventas también abre la lista (`#cta-con-saldo`).
  · **`abrirPorCobrar(origen)`** → ventana «⏳ Falta cobrar · Bs X» con la MISMA cuenta que la ficha: Ventas =
    `contaFaltaCobrar` sobre `contaLista()` (corte, período, vendedor y búsqueda de la pantalla, `porCobrarDatos`); Cuadre =
    `cuadrePendientes()`. Se arma al abrir (lo cobrado ya no aparece). De la más vieja a la más nueva, tramos de antigüedad
    (`tramosDeudaHtml`), cliente + nota · OC · celular, vendedor, desde (días), venta y saldo. «📋 Copiar la lista»
    (`copiarPorCobrar`) para mandarla por WhatsApp.
  · **Tocar un cliente** (`porCobrarAbrirVenta`) abre su venta (`showContaModal`) con «← Volver a la lista de lo que falta
    cobrar» (`POR_COBRAR_VOLVER`); el botón solo aparece si la ficha se abrió desde la lista con la ventana abierta (un repintado
    lo conserva; abrir la venta desde otro lado, no).
  · **«Revisar antes de cerrar»**: aviso nuevo `k:'cobrar'` en `cuadreAlertas`, `sev:'plata'` (arranca abierto con los nombres),
    «⏳ N ventas con saldo por cobrar — Bs X que todavía no entró», mismos datos que `cuadrePendientes`; cada nombre abre su
    venta y «… y N más ›» abre la lista entera. No frena el cierre (vender a crédito no es un error). `cuadreTexto` (📋 Copiar
    del Cuadre) no lo repite: ya dice «⏳ Por cobrar» en su línea.
- Pruebas: **`tests/test_por_cobrar.js`** (24; contra la página publicada falla desde la primera: no hay ficha tocable).
  `test_sinmonto` §6 cambió a conciencia: miraba que «DEBE DE VERDAD» no estuviera en NINGÚN aviso y ahora está, a propósito,
  en el de saldo por cobrar; mira el aviso de «sin ningún monto» y suma que la que debe sí salga en el nuevo (43).
- **Batería entera con el cambio (`2e32b52`): 135 suites, 5.063 comprobaciones, 0 rojas** (`test_stock_detalle` sin resumen,
  como siempre). **PUBLICADA el 06/10 a las 12:37 de Bolivia** (`3443703`, junto con el buscador del stock §4hp y el
  diagnóstico que mide la celda del stock; dueño: *«publica todo y ya reviso y subo el almacén de ahora»*). Sin workflow del
  panel corriendo (su cron de las 14:00 UTC todavía no había salido). Pages OK a las 12:38 (16:38:10 UTC). Pedido al dueño:
  F5 en todos los aparatos ANTES de subir los Excel de hoy (§4hq: los del sábado se resubieron desde una página vieja) y, a
  las 16:30, destildar en el cierre lo que no salió.

## 4hq. 06/10: 🔎 auditoría «auditores como va todo» — lo publicado el 05/10 tiene arreglos pendientes (NADA arreglado todavía)
El dueño, el 06/10 a las 10:00: *«auditores como va todo»*. Se miró la operación y tres auditores (agentes) revisaron lo
publicado el 05/10; cada hallazgo de abajo está **reproducido en el navegador** (scripts en el scratchpad de la sesión:
`aud_cierre/`, `aud_corte/`, `aud_stock/`, `verif_split/`) y **confirmado leyendo el código**. El dueño todavía no pidió
arreglarlos: lo que sigue es el estado, no lo hecho.

**Operación (bien):** `main` sin cambios del panel desde `64bcb37` (solo los tableros mensuales del dueño —de otra
auditoría suya, *«esto es del panel que auditamos»*— y commits automáticos); todas las corridas de Actions en verde; el `.gs`
publicado es `2026-10-02-a`; el repaso de Kommo cada 5 min anda (09:39); batería entera con la fecha del 06/10: 134 suites,
5.038 comprobaciones, 0 rojas. ⚠️ **El webhook de Kommo sigue sin avisar desde el 22/09 19:01 UTC** (las ventas entran por el
repaso, hasta 5 min tarde): mirar Kommo → Configuración → Integraciones → Webhooks. ⚠️ **El token de Kommo vence ~28/10**: va en
DOS lugares, el secreto `KOMMO_TOKEN` de GitHub (tablero, respaldo) y la propiedad `KOMMO_TOKEN` del Apps Script (borradores).
Desde esta sesión no se puede lanzar un workflow a mano (403): el diagnóstico de la lectura se corrió pusheando su archivo
(que ahora mide la celda del stock por partes y dice qué página subió cada corte y de qué día es el saldo en uso).

**🚨 Producción, 06/10 10:45 (diagnóstico `e50685b`/`dc1ea9a`):** la celda del stock mide **23.220 letras (46 %)**: fotos 20.894,
historial 14 cortes, **sin `v`/`v2t`, 0 detecciones, 0 salidas sin pedido, 0 pedidos a fábrica (`p` vacío)**. Ningún Excel se
subió con la página nueva desde la publicación (05/10 17:01): **todos los cortes son de página vieja (sin huella)**. Y **hoy a
las 10:18 se volvieron a subir los tres Excel del SÁBADO 03/10** (PTF 09:55, Banzer 09:52, IM 09:55) desde un aparato sin F5:
**el saldo que usa el panel es el del sábado**, pisando el del lunes 05/10 11:40 (subido 11:54-11:55). Lo que llegó de fábrica
desde el sábado no figura → «NO HAY»/«PEDIR YA» que pueden ser falsos. Pedido al dueño: F5 en todos los aparatos y subir los
Excel de HOY. La lectura anduvo en 2-4 s con picos (un 404 a los 88-99 s, una entrega de 61 s: Google a ratos, §4fx/§4hb).

**✅ Cierre de entregas (§4hn etapa 1)** — `aud_cierre/t*.js`:
- **ALTA** — a las 16:30 se proponen tildados también los 🌆 PM (pueden seguir en la calle). Si se confirma y después se
  reprograma (📅 Reprogramar `reproConfirmar` o ✏️ Editar, que hereda `entregado`), queda `entregado:true` en la fecha nueva: no
  vuelve al cierre, el chofer lo ve gris «Entregado», no sale en «Sin entregar», y el stock lo da por salido. Paliativo dicho al
  dueño para el 06/10: destildar los PM que no volvieron o cerrar cuando vuelva el camión.
  **Decidido por el dueño (06/10, 12:30): los PM siguen tildados y logística destilda lo que no se entregó** (*«Van tildados y
  que logística destilde lo que no se entregó. Habíamos quedado»*). No volver a proponer PM destildados. Lo que sigue abierto
  (espera su «hazlo») es lo otro: un pedido confirmado que después se reprograma queda ✅ en la fecha nueva.
- MEDIA — un cierre pendiente (`me_cierre_pend`, sin señal) no se descarta cuando el siguiente cierre lee bien: se aplica igual y
  marca lo destildado después (`confirmarCierreEntregas` + `cierreEntSincronizar`).
- MEDIA — los pedidos con un renglón ✗ no hay o 🏭 sin llegar se proponen tildados y la fila no lo muestra; al confirmar dejan
  de estar comprometidos y el panel deja de pedirlos a fábrica (sin cierre, la regla de siempre los mantenía).
- MEDIA — «Ver» reemplaza la ventana del cierre; al reabrir, `abrirCierreEntregas` vuelve a tildar todo (se pierde lo destildado).
- MEDIA — `heredarMarcas` no copia `prodU`/`prodC`/`prodRm` ni `eF/eT/eQ`: corregir un pedido desde ✏️ Editar borra la llegada
  parcial de la línea 🏭 (deja de estar reservada) y quién confirmó la entrega.
- BAJA — aparato en otra zona horaria (lista con `todayStr()` del aparato, cartel con la hora de Bolivia); cierre que cruza la
  medianoche (`eF` con el día nuevo); ATC atrasada registra la fecha programada; la ventana con un rechazo no dice cuál.
- Bien: el cartel a las 16:30 de Bolivia en cualquier zona; día cerrado 🔒 no frena el ✅ (`porteroFecha_` real); dos aparatos a
  la vez; cierre sin señal con borrados/reprogramados de otro equipo; ATC y RPT.

**🧮 Control del corte (§4hn etapa 2)** — `aud_corte/`:
- **ALTA (con fecha) — la celda del stock se llena.** `det` (~212 letras por cada «+N»), `sm` (~213), las recepciones `x:` (~358:
  el id repite almacén, fecha, hora, huella y clave, y `ev.d` otra vez) y el detalle de `h` crecen con cada Excel; la poda a
  60 días frena el crecimiento recién en 55.000-120.000 letras. Simulado desde 21.364 letras: con 1-3 diferencias por corte pasa
  50.000 el día hábil 40; con 3-6, el 23; con 3-15, el 13. Pasado 50.000 el `.gs` contesta `celda_llena` y el stock queda en la
  cola de cada equipo. **Para decidir:** ids cortos, sin `ev.d` repetido, menos días para lo asignado/anulado.
- **ALTA — una página sin F5 (de antes del 05/10 17:01) borra el control de todos.** Guarda el stock sin `det`/`sm`/`v`/`v2t`
  (el servidor lo acepta: el sello es válido) y la página nueva, sin nada propio en vuelo, ADOPTA esa copia en su lectura
  (`leerCierresDeLista`, `STOCK=leerStock(stk)`); después `v2t` se vuelve a sellar con la hora de ahora. Solo `stockFusionar`
  (la junta ante un conflicto) lo conservaba. Además esa página vieja todavía cierra pedidos a fábrica por fecha.
- MEDIA — la detección de ayer sin asignar y la de hoy sugieren el mismo pedido (tildar las dos: 10 de 5); recogida de Moreno
  descontada dos veces si el Excel de IM se sube antes que el de fábrica (anterior al control); «↩️ no había llegado» desaparece
  a los 6 cortes (`STOCK_DIF_CORTES`, ~2 días con 3 Excel).
- BAJA — mismo archivo con la hora del nombre vs la del pie; dos Excel del mismo almacén el mismo día (ambiguo / sin hora / la
  ventana sin tope de hora); Excel corregido no descuenta la salida anotada por la versión anterior; 🔗 Unir no mueve `det`/`sm`.
- Bien: IM solo informa; mismo archivo y mismo nombre en dos equipos = una recepción; lápidas; la casilla «ya incluye».

**📦 Catálogo (§4ho) y buscador (§4hp, en la rama al auditar; publicado el 06/10 a las 12:37)** — `aud_stock/`, `verif_split/`:
- **ALTA condicional — un código recién agregado a `CODIGOS` parte el producto en dos filas** si un Excel anterior ya lo traía:
  `stockMigrar` re-claviza `u` pero no los mapas `cod` (ni `sm`/`det`), y `stockClaveInv` va por `cod` a la clave vieja, vacía.
  El pedido ve 0 («🚨 PEDIR YA», el cuadrito dice «NO HAY») y el saldo queda en otra fila como «Sobra»; subir el Excel otra vez
  no lo arregla. **Con los nombres reales** (Excel de Banzer del 26/09: «COLCHON SUEÑA SMART 140X190», «COLCHON SUEÑA LITE
  140X190»): el SMART 140 no se parte; **el SUEÑA LITE 105x190 (CH2531) sí**, si algún Excel de antes del 05/10 17:33 lo traía
  (el de Banzer del 26/09 no). Comprobación del dueño: filtrar «LITE» en 📦 Stock. Arreglo: migrar `cod` (y `sm`/`det`) junto
  con las claves. Va a pasar de nuevo con cada código que se agregue (el SMART 160x190, por ejemplo).
- MEDIA (rama) — el buscador busca solo en «lo que se mueve»: un producto con saldo y sin ventas en 15 días no aparece
  («ningún producto coincide»), y por código tampoco (`o.cod` vacío sin pedidos). BAJA: «Borrar la búsqueda» limpia también los
  chips; el cartel dice «solo lo que coincide» pero En camino / Plata parada no se filtran; en el celular la barra crece (360 →
  402 px); el `title` del campo tiene una nota interna.
- Bien: ningún otro SMART fuera de Sueña; los códigos nuevos no chocan; el buscador anda en el iPad y mantiene el cursor.

## 4hp. 05/10: 🔎 el buscador del stock pasa a la barra de arriba — el dueño: *«no hay un buscado en stock....»*
- Captura del dueño de la pantalla 📦 Stock en el iPad: se veían los cuadros de hoy, la revisión automática y «qué producir»,
  y ningún lugar donde buscar. **El buscador existía desde §4cp** (`#stk-q` → `stockBuscar` → `stockAplicarFiltro`: nombre,
  código y los «también:», palabra por palabra) pero se dibujaba CON la tabla, debajo de todos los cuadros: en 1500×1000 quedaba
  a 1.100 px del borde de arriba y en el iPad parado a 1.400. Tres pantallas más abajo, nadie lo encontraba.
- Hecho en `pedidos.html` (solo qué se dibuja; ninguna cuenta cambia):
  · **`<input id="stk-q">` fijo en la barra de arriba** de `#stock-overlay` (entre `#stock-info` y «🤖 Revisión automática»,
    con `margin-left:auto`), fuera de `#stock-body`. `renderStockFiltros` ya no lo dibuja: deja un chip «🔎 «q»» al lado de los
    de aviso, marca y medida, que siguen pegados a la tabla.
  · **Con algo escrito** (`stockNorm(STOCK_FILTRO.q)`), `renderStock` **esconde** `renderStockHoy`, `renderRevisionFija`,
    `renderProducir` y `renderTiendas` y pone el cartel `#stk-buscando` («se muestra solo lo que coincide · Borrar la búsqueda»):
    lo buscado aparece al instante, arriba. La tabla, «🚚 En camino», «💤 Plata parada» y los otros almacenes siguen igual.
  · Como la barra no se redibuja con la tabla, **el cursor se queda donde está**: el refoco del final de `renderStock` ya no
    manda el cursor al final (solo devuelve el foco si se perdió, con `preventScroll`). `stockFiltroLimpiar` vacía también el
    campo de arriba; `abrirStock` sincroniza el campo con `STOCK_FILTRO.q` (otra pantalla pudo tocarlo). La ✕ del
    `type=search` dispara `input` vacío → vuelven los cuadros.
- Prueba: **`tests/test_stock_buscador.js`** (22): arriba y uno solo; filtra por nombre y por código; esconde los cuadros;
  escribir adelante con el cursor en el medio no lo manda al final; borrar por el enlace y vaciando el campo; cerrar y volver a
  abrir conserva lo buscado; iPad parado (820 px). Contra `64bcb37` (la publicada): 13 verdes / **9 rojas** (el campo a 1.096 y
  1.428 px, los cuadros no se esconden, el cursor saltaba al final, el campo se perdía al reabrir).
- **Batería entera con el cambio (`56dc52d`): 134 suites (las 133 de §4ho + esta), 5.038 comprobaciones, 0 rojas**
  (`test_stock_detalle` sin resumen, como siempre; `test_stock` 106, `test_existencias` 54 y `test_stock_buscador` 22 en verde).
- **PUBLICADA el 06/10 a las 12:37 de Bolivia** (`3443703`, junto con «Falta cobrar» tocable, §4hr). Todos F5 (la página
  vieja sigue con el campo abajo; no hay nada del servidor en esto).

## 4ho. 05/10: Catálogo — COLCHON SMART 140x190 (CH2522) y COLCHON SUEÑA LITE 105x190 (CH2531); el SMART es Sueña
El dueño mandó dos recortes de su tabla de códigos (familia «SUEÑA SMART»): CH2521 SMART 105*190, CH2522 SMART 140*190, SMART
160*190 **sin código**; CH2531 SUEÑA LITE 105*190, CH2532 SUEÑA LITE 140X190. *«añade esos productos a la lista de productos»*.
- Dos entradas más al final de `CODIGOS` (`pedidos.html`), con el mismo formato que §4dw/§4dx:
  `"CH2522":{d:"COLCHON SMART",m:"140x190"}` y `"CH2531":{d:"COLCHON SUEÑA LITE",m:"105x190"}`. CH2521 y CH2532 ya estaban.
  `NOMBRES_LISTA` se arma sola; el reporte de existencias los encuentra por código.
- **El SMART 160x190 NO entró**: el catálogo va por código y la tabla no lo trae. Queda pendiente de que el dueño pase el código.
- **SMART → Sueña** (`stockMarcaDeNombre`): la tabla del dueño titula la familia «SUEÑA SMART», así que `SMART` entró al grupo
  de Sueña y «🏭 Qué producir» lo manda al bloque Multiespumas · Sueña en vez de «❓ Sin fábrica asignada» (lo que §4dx dejó
  pendiente «hasta que el dueño diga en cuál se hace»). Si el dueño dice otra fábrica, es una palabra en esa lista.
- **PUBLICADA el 05/10 a las 17:33 de Bolivia** (`64bcb37`; dueño: *«si es de sueña, está bien publica»*). Pages OK a las 17:34
  (run 1584 bis, esta vez sin cola). Sin workflow del panel corriendo (su cron de las 21:00 UTC había corrido 21:17-21:24).
  Batería entera con el catálogo nuevo (`7a90602`): 133 suites, 5.016 comprobaciones, 0 rojas (`test_stock_detalle` sin
  resumen, como siempre). Antes de publicar se habían corrido sueltas `test_producir` (62), `test_existencias` (54),
  `test_identidad` (45), `test_codigo_almacen` (13) y `test_rpt` (110), y en el navegador se vio la lista con los cuatro
  códigos y `stockMarcaDeNombre('COLCHON SMART')` = `suena`.

## 4hn. 05/10: 📥 PROPUESTA (sin implementar) — el control del corte: las llegadas de fábrica se detectan con el Excel
- El dueño pidió «qué otras mejoras» (05/10) y eligió mirar la 2: comparar lo que el panel esperaba con el Excel de existencias.
  Su dato clave: *«logística no marca que llegó de fábrica, solo lo que se pidió, y cada día solo suben las existencias de los
  almacenes»*. Hoy el panel cierra los pedidos a fábrica **por fecha** al subir el Excel (`existPedidosVencidos`, casilla «Darlos por
  llegados» marcada): si llegó antes, cuenta dos veces (`enCamino` + el Excel); si no llegó, lo saca de «en camino» y lo vuelve a
  pedir. La propuesta: cerrar **por unidades** (`dif = Excel − (previo + entradas − salidas)`), casar contra pedidos a fábrica,
  recogidas y líneas 🏭, avisar «sin pedido» / «faltan» / «reclamar a fábrica», historial compacto de diferencias por corte, y
  opcionalmente medir el tiempo real de fábrica con eso. Diseño completo, riesgos y preguntas en **`RESPUESTA_CLAUDE.md` §29**.
  **El dueño lo consulta con Codex antes de decidir.** Nada en la rama todavía.
- **05/10, la respuesta: el PDF «Instrucción para Claude sobre cierre diario y stock»** (5 páginas; copia del texto en el scratchpad,
  no en el repo). Pide: cierre de entregas a las 16:30 (lista de hoy con casillas propuestas, parciales por línea, registro de quién
  y cuándo, revalidar antes de confirmar), conciliación por depósito con cortes comparables, `dif>0` = «entrada neta sin explicar»
  (no «llegó»), nada de cerrar por fecha ni repartir por antigüedad, asignación automática solo con evidencia verificable, ids
  derivados del corte (dos equipos → un efecto), anulación persistente que gane al fusionar, plazos de fábrica solo con
  confirmadas, y cuatro etapas. **Diseño adaptado en `RESPUESTA_CLAUDE.md` §30**, con lo que el panel puede cumplir tal cual y lo
  que no (no hay estado «cancelado»: se borra; no hay transacción entre pedido y stock: dos escrituras idempotentes con `opId`;
  el registro de confirmación va ADENTRO de cada producto, `x.eF/eT/eQ/eU`, porque las columnas de la planilla son fijas).
  Siete decisiones quedan para el dueño (§30.12). Sin implementar.
- **05/10, las respuestas del dueño a §30.12** (textuales): (1) *«a veces antes a veces después»* [el Excel de fábrica,
  respecto del camión]; (2) *«solo saldos, ya que allá solo se produce»*; (3) *«las reparadas no figuran en los saldos de
  almacén, ya que no ingresan al almacén sino que se reparan»*; (4) *«no»* [parte de producción / traslado]; (5) *«también
  para anotarlas»* [las salidas fuera del panel, Multicenter]; (6) *«logística»* [revisa las excepciones]; (7) *«no, solo los
  de Eduardo cuando son grandes se entregan por partes, pero yo no los cargo al panel»*. Consecuencias: la casilla «ya
  incluye las entregas» sigue siendo la convención de la hora; el caso 0→5→0 queda ciego (solo saldos); las ATC no son causa
  de ninguna diferencia; Moreno/Banzer solo informativo; botón para anotar salidas sin pedido; **sin parciales por línea**.
- **HECHO el 05/10, etapas 1 y 2, en la rama y SIN publicar** (commits `0e4fc75` y `04acca8`; **batería entera con las dos
  etapas: 132 suites, 4.968 comprobaciones, 0 rojas**; capturas de demo con datos inventados mandadas al dueño por el chat):
  · **Etapa 1, el cierre de entregas** (`abrirCierreEntregas`, `confirmarCierreEntregas`, `cierreEntMarcar`,
    `renderCierreEntAviso`; botón «✅ Cierre de entregas» en Administración y cartel desde las 16:30 de Bolivia,
    `CIERRE_ENT_HORA`). Lista de hoy = `cierreEntEntra(p)` (sin filas del sistema, retiros, borradores de Kommo ni ventas de
    tienda; ATC y RPT sí) con `fecha === hoy` y sin marca, tildada como propuesta; atrasados hasta `CIERRE_ENT_ATRASO_DIAS`=14
    aparte y destildados, con «¿qué día se entregó?». Abrir no escribe. Confirmar: relee con `refrescarEstadoYa()` y saltea lo
    borrado, lo reprogramado (`fecha` cambió) y lo que otro equipo ya marcó, diciéndolo; sin señal confirma con la copia y lo
    avisa (la cola durable reintenta). Guarda `p.entregado` como siempre + **`x.eF` (día declarado), `x.eT` (ms), `x.eQ`
    (quién) adentro de cada producto** (las columnas de la planilla son fijas; un panel viejo los ignora). «Quién cierra» =
    `me_cierre_quien` en el aparato. La ficha dice «confirmado por X el … · entrega del …» (`cierreEntTxt`). Sin parciales.
    `tests/test_cierre_entregas.js` (23).
  · **Etapa 2, el control del corte** (bloque «🧮 EL CONTROL DEL CORTE» antes de `existPedidosVencidos`):
    `stockVentanaCorte` (UNA ventana: desde el corte anterior, o el día siguiente si ese Excel ya incluía sus entregas, hasta
    este; el día de este corte entra solo con la casilla), `stockSalioVentana` (⚠️ una línea 🏭 vive con «✗ no hay»: su
    salida cuenta igual), `stockSalidasVentana`/`stockEntradasVentana`/`stockSalidasManualesVentana`, **`stockConciliar(R,
    rol, inc)`** → filas `{esperado, excel, dif, tipo: cuadra|mas|menos|det|sinDato, fab, sug, causas, sinExplicar}`;
    `existControlHtml` (vista previa: resumen + tabla, tope visual `STOCK_CTRL_TOPE`=12 con «ver todas», se repinta al cambiar
    el rol o la casilla); `existAplicarControl` (aplica lo tildado DESPUÉS de reemplazar el conteo; el `C0` se calcula ANTES).
    **La casilla «Darlos por llegados» se fue**: nada se cierra por fecha. `existPedidosVencidos` queda solo informativo.
  · **Detecciones** (`STOCK.det`, `{id:'d:'+corteId+'|'+k, k, t, u, f, hora, hu, alm, ts}`): toda entrada sin explicar del
    depósito de fábrica queda anotada aunque no se asigne; `u` = lo sin asignar, recalculado de las recepciones vivas que la
    nombran (`ev.d`) por `stockNormalizarDetecciones` (al final de `stockNormalizarRecepciones`). Las sugerencias contra los
    pedidos pendientes salen SIEMPRE de una detección (la de este corte o una anterior con `u>0`), destildadas; tildar crea la
    recepción **`x:<detección>|<pedido>`** (`se:1`, `enConteo`, `ev:{a,c:[f,hora,hu],p,d,q,m}`). Dos equipos, el mismo
    archivo → el mismo id → una recepción (`test_control_corte` §3: 3 de 10 dos veces = 3/7). `o.detectado` y
    **`stockEnCaminoSeguro(o)`** = en camino − detectado sin asignar: lo usan `libre`, `stockCuantoPedir`, `stockMesesSobra`,
    el `traer` de descontinuados y el `pedir` (§30.8); `enCamino` crudo sigue en pantalla y en `'pedido'`.
  · **Lápida `an`** (`stockAnularRecepcion(qid, rid, causa)`, botón «↩️ no había llegado» en 📜 Historial de cortes):
    `stockNormalizarRecepciones` la saltea (ru, entradas, resta de Moreno), `fusRecs` la hace ganar en los dos sentidos, la poda
    la conserva. **El mismo corte corregido** (misma fecha y hora, otra huella): `existAnularCorteAnterior` anula lo que cerró
    la versión anterior (causa «corte reemplazado»), sus detecciones se reemplazan, `stockConciliar` compara contra lo que ese
    corte ya decía (`mismoCorte`: esperado = previo − `t` de la detección vieja, sin ventana) y `pendDe(q)` cuenta como
    pendiente lo que esa versión había cerrado, así la corrección lo vuelve a sugerir.
  · **Salidas anotadas a mano** (`STOCK.sm`, `{id, k, u, f, ts, m, alm, pre}`): desde la vista previa (`s:<corte>|<k>`,
    `pre:1` = ya adentro del Excel, solo documenta) o desde «📤 Salió sin pedido» en la pantalla de stock (`abrirStockSalida`,
    `pre` según la fecha contra `stockDesdeSalidas()`); `stockDeposito` resta las sin `pre` (`stockSalidasManuales`). Tope
    `STOCK_SM_DIAS`=60 (también para `det`) en `filaStock`.
  · `STOCK.h[]` lleva `hu` (huella FNV del contenido, `existHuella`) y `d` = `[[k, dif, [[cerro|fab|sal, ref, u, id]]]]` en
    los últimos `STOCK_DIF_CORTES`=6 cortes; el mismo corte reemplaza su renglón. `STOCK.v=2`. Primer corte → «sin
    conciliación previa»; un Excel más viejo que el vigente exige `#exist-corte-viejo-ok`. Banzer: informativo, sin cierres.
    `o.reclamar` (pedidos con `llega < hoy`) → «🚚 Ya pedido · ⚠️ reclamar». Sin hora en el archivo, el texto de la casilla
    pide la convención (antes/después del camión).
  · **Plazos**: lo cerrado desde el control lleva `enConteo` y NO mide (`stockMuestrasFabrica`), como pidió Codex (opción B).
  · **Tres pruebas viejas cambiaron a conciencia**: `test_existencias` §6 (ya no se cierra por fecha: 17 en camino y `reclamar`),
    `test_rev_stock` (el texto nuevo de la casilla sin hora), `test_adm_alta` §2 (la recogida se SUGIERE y se tilda).
    Prueba nueva `tests/test_control_corte.js` (32): ventana y casilla; +N sugiere sin cerrar y la segunda subida ofrece la
    detección; dos equipos → una recepción; lápida que gana al juntar; 🏭 llega (sellar `prodR`) y se entrega (explica la
    baja); −N anotada como salida sin pedido, `pre:1`, sin duplicar, y la de hoy desde la pantalla baja el depósito; primer
    corte, corte viejo, mismo corte corregido, Banzer.
  · **NO hecho (etapas 3 y 4 de §30)**: la asignación automática con evidencia fuerte (`cert`), el intervalo de plazos
    estimados por planilla, los patrones de diferencias («el que siempre falta»), la conciliación de Moreno. Tampoco
    `STOCK_V2_DESDE` (marcar recepciones de una página vieja): con la casilla fuera, una página vieja todavía cierra por fecha
    hasta que haga F5; es la regla de siempre al publicar. **(Lo de la página vieja quedó hecho en la segunda vuelta, abajo: `v2t`.)**
- **05/10 a la tarde, SEGUNDA VUELTA: la revisión de Codex («corregir antes de publicar»), corregida en la rama y SIN publicar.**
  Codex revisó las etapas 1 y 2, trajo 7 hallazgos y exigió 10 casos de prueba (R1–R10). Todo hecho; la respuesta punto por punto,
  con la evidencia, en `RESPUESTA_CLAUDE.md` §31. Lo que hay que respetar:
  · **H1 — la ventana y la marca ✅.** El DÍA DEL CORTE lo decide la casilla «ya incluye las entregas», no `p.entregado`
    (`stockSalioVentana`: una entrega confirmada a las 15:00 no estaba en el Excel de las 09:00). **Lo destildado en el cierre
    NO lleva ninguna marca** — decisión del dueño (05/10, al ver el cambio): *«como antes, porque un pedido que queda como pasado
    y no fue tildado, logística lo entregó; lo que ellos no entregan lo reprograman»*. La marca «no salió» (`x.eX`,
    `cierreNoSalio`) que pedía Codex en R2 se hizo y se sacó el mismo día (`b67c4b5` la tenía): la convención de §4co (fecha
    pasada sin ✅ = salió) sigue entera, el cierre guarda SOLO lo tildado, y el texto de la lista dice «si no salieron,
    reprogramalos». ⚠️ No volver a ponerla sin que el dueño lo pida.
  · **H2 — 🏭 parcial.** La sugerencia «¿llegó lo hecho a pedido?» ofrece SOLO lo que falta (`cant − prodUnidEnStock(x)`); tildar
    anota **`x.prodU`** (llegadas) y **`x.prodC`** (los cortes que la anotaron, tope 6: idempotencia, el mismo corte no suma dos
    veces); la línea se SELLA (`prodR`, `prodRm='excel'`, `chk='ok'`) recién al completarse. Texto: «anotar 3 llegadas, faltan 7»
    o «sellar la llegada». La ficha (`prodLugarTxt`) y el cuadrito (`saldoVeredictoFab` → `v.parcial`) dicen «llegaron 3 de 10,
    faltan 7».
  · **H3 — guardado pedido + stock.** `confirmarImportExist` devuelve `Promise.all([stock].concat(ctrl.guardados))` y el toast
    dice la verdad: «✅» solo si entró todo; si no, «⏳ … Pendiente de sincronizar: N de M guardados no llegó a la planilla
    todavía (queda en la cola de este dispositivo y se reintenta solo)» o «⚠️ N rechazados por el servidor». Nada queda en memoria
    sin cola: cada parte va por `guardarDurable`/`persistPedido`, y la cola converge sin duplicar porque `prodC` y los ids de
    recepción llevan el corte (R4, los dos órdenes, con `flushPending`).
  · **H4 — `enProduccionPendiente(x)` = `enProduccion(x) && !x.prodR`.** Es lo que excluye de las salidas y del comprometido; una
    línea 🏭 ya sellada es un colchón más. `prodUnidEnStock(x)` = lo llegado de la línea (todo, si está sellada).
  · **R5 — lo 🏭 llegado y CONTADO se reserva y sale como cualquier colchón.** **`prodUnidEnConteo(x)`**: sellado o anotado desde el
    control de un corte (`prodRm='excel'`, `prodC`) → ese Excel lo contó; sellado A MANO (✔ hay sobre la línea) → solo si `prodR`
    es anterior al corte vigente (la regla por día de `stockEntradaVale`). En `stockData` va a **`comp`** (reserva, como un ✔ hay)
    y, entregado, a **`salidas`**; lo que falta llegar sigue en `aFab`. Lo usan `stockComprometido` (cuadrito), `stockSalidas` y
    `stockSalidasVentana`. ⚠️ Antes una línea 🏭 que ya estaba en el Excel NO reservaba ni descontaba al entregarse: el depósito
    quedaba inflado hasta el Excel siguiente. En la conciliación, una sellada a mano después del corte anterior explica la entrada
    (`causas` `fabLlego`, «✔ anotado a mano el …», `fila.explicado`: sin detección ni sugerencia); una pendiente (nunca sellada) que
    se entregó explica la baja (`fabSalio`, ahora SOLO para pendientes: la sellada ya está en las salidas y no se explica dos veces).
  · **H5 — orden de cortes y horas.** `stockConciliar` compara fecha Y hora (`rf<pf`; mismo día `rh<ph` → «MÁS VIEJO»; mismo día
    con hora de un solo lado → `corteViejo` + `ambiguo`, «falta la hora»). `stockVentanaCorte` lleva `prevHora`/`prevInc`/`hora` y
    los movimientos anotados con `ts` (entradas `STOCK.e`, salidas `STOCK.sm`) entran por **`stockMovEnVentana(f, ts, v)`**: por
    día, y en los días límite por hora (`horaDeTs`, Bolivia): en el día del corte anterior después de su hora, en el de este corte
    hasta su hora inclusive; sin hora de un lado, el día del corte entra solo con la casilla (R7). La pantalla de stock resta las
    salidas a mano con **`stockMovDespuesDelCorte`** (la hora del CORTE, no la de subida `c.t`: un Excel de las 09:00 subido a las
    15:00 no incluye la salida anotada a las 12:00). ⚠️ Las entradas `STOCK.e` siguen con `stockEntradaVale` (`c.t`, §4fz-b) y
    `STOCK.e=[]` al confirmar un corte de fábrica: lo anotado entre la hora del corte y la subida se da por incluido. Es la regla
    de siempre; queda dicha en §31 como límite.
  · **H6 — cierre sin conexión.** `confirmarCierreEntregas` NO confirma sobre la copia del aparato: si `refrescarEstadoYa()`
    falla, el plan (`cierreEntPlan`: ids tildados, días declarados, cómo estaba cada pedido, quién, hoy) queda en `localStorage`
    **`me_cierre_pend`**, la ventana dice «No había señal: todavía NO se confirmó nada», el cartel de Administración dice
    «pendiente de sincronizar» (con «🔄 intentar ahora» y «descartar»), y **`cierreEntSincronizar()`** lo aplica revalidado con la
    próxima lectura buena (gancho en `refrescarEstadoYa`; saltea borrado, reprogramado y ya marcado; toast «sincronizado: N
    confirmadas · M salteadas»; `CIERRE_ENT_ULT`). `cierreEntAplicar` espera los guardados y la ventana de resultado dice «guardado
    en la planilla: ok de total», lo que quedó en cola y lo rechazado (encabezado ámbar). `confirmarCierreEntregas` devuelve
    `{pendiente, leyo, hechos, saltados, noSalio, ok, cola, rechazados}`.
  · **H7 — datos antiguos.** Las detecciones de una versión anterior del mismo corte quedan con LÁPIDA `an` («corte reemplazado»),
    nunca se borran. `stockFusionar` trata una copia **sin `v`≥2** (página vieja) como que no tocó `det` ni `sm` (usa los de la
    base) y **`fusLapidas`** hace las lápidas MONÓTONAS: una recepción o detección anulada en CUALQUIERA de las tres copias sigue
    anulada en la junta, también cuando «acá no se tocó» y mandaba la copia de allá (era el agujero de R9-b: una página vieja que
    leyó antes de la anulación y guardó después la revivía). **`STOCK.v2t`** = desde cuándo esta planilla la escribe una página
    con el control (el mínimo al juntar); **`stockRecsPaginaVieja()`** = recepciones `se:1` sin `ev`, con id al azar y `ts > v2t`
    (lo que una página sin F5 «dio por llegado» por la fecha) → aviso ámbar en la vista previa del Excel (`existRecsViejasHtml`,
    botón «↩️ anular» → `existAnularRecVieja`: lápida + repintar). Los `h[]` llevan id estable `alm|f|hora`.
  · **Pruebas.** `tests/test_rev_corte_codex.js` (45; R1–R10 con los números de Codex: Excel 09:00 y entrega 15:00; atrasado
    destildado → sigue como salido y el cierre no le escribe nada (la regla del dueño, no la de Codex); 3 de 10 → 3/7 y repetir no suma; fallos de guardado en los dos órdenes + `flushPending`; reserva y
    entrega de 2 🏭 (sellada por Excel, pendiente, sellada a mano); 16:00 → 09:00, repetido, corregido, sin hora; movimientos
    antes/en/después de las dos horas; cierre sin conexión → revalida borrado/reprogramado/entregado; copia vieja y cola (cuatro
    juntas) + el aviso y anular; regresión del cierre). **Dientes contra `94ce3e2` (la rama antes de esta vuelta): 6 verdes · 13 rojas, y 8 de las 10 secciones ni terminan (esa
    página no tiene `cierreNoSalio`, `prodUnidEnStock`, `prodUnidEnConteo`, `stockMovEnVentana`, `cierreEntPendiente`…; cada
    sección corre en su propia página y una función faltante cuenta como una roja, `seccion()`).**
    `test_cierre_entregas` (26) y `test_control_corte` (32) cambiaron a conciencia (los destildados no se tocan ni se guardan;
    la 🏭 sellada y entregada cuadra; la salida manual de hoy mira la hora del corte). **Batería entera (`676089f`): 133 suites, 5.016 comprobaciones, UNA roja en la corrida — `test_stock` §11, ajustada a
    conciencia: su fixture de la §9 tiene una línea 🏭 PILLOW sellada ✔ hay hace 7 días y sin entregar, que con R5 ya está en el
    conteo y queda reservada (29 parados y no 30 → 7,25 meses, no 7,5); sola, 106/106 después del ajuste. `test_stock_detalle`
    «sin resumen», como siempre.** **Y otra vez entera con la regla del dueño para los destildados (`cf4b505`, lo publicado):
    133 suites, 5.016 comprobaciones, 0 rojas.**
  · **El límite de autorización de Codex, respetado**: se pusheó SOLO a la rama `claude/pedidos-fecha-entrega-bgt0em` (lo de
    siempre con el dueño); NADA en `main` hasta el «publica» del dueño.
  · **PUBLICADA el 05/10 a las 17:01 de Bolivia** (`211705f`: merge `--no-ff` de la rama en `main` desde una rama local `pub`,
    como las publicaciones anteriores; página sola, el `.gs` sigue `2026-10-02-a`), con el «publica» del dueño después de su
    decisión sobre los destildados (`cf4b505`). Se pusheó a las 21:01 UTC, justo antes del cron de las 21:00 del dashboard y sin
    ningún workflow corriendo (regla de oro: no pushear a `main` con el workflow del panel en marcha). Verificado por git que
    `main` trae `cierreEntSincronizar`, `fusLapidas` y `prodUnidEnConteo` y no `cierreNoSalio`; desde esta sesión el proxy no deja
    leer `github.io`, así que el deploy de Pages se mira en Actions (workflow `273388817`). **Pages OK a las 17:21 de Bolivia**
    (run 1583: el job estuvo 20 minutos EN COLA esperando un runner — a las 21:00 UTC en punto se disparan muchos crons en
    GitHub; no era un atasco de Pages, no hizo falta destrabar nada). Todos F5.

## 4hm. 03/10: 🎃 tema de Halloween en el panel de pedidos, en el dashboard y en el de Sueña — PUBLICADO 03/10 11:06 (`093862f`; Sueña `ea830a1`)

> El dueño (03/10): *«es mes de Halloween, deberíamos tener algo halloweenesco, ideas, opciones?»*. Se le mostraron tres
> maquetas sobre el panel real (discreta; con murciélagos y cuenta regresiva; todo el panel en morado). Eligió: *«la 1 y sí
> también al dashboard»*.

- **Solo apariencia** (CSS + 1 línea de script en el `<head>`): no toca datos, plata, cupos ni el servidor.
- **Se prende sola en octubre y se apaga sola el 1/11**, con la fecha de Bolivia (`Date.now()−4 h`, `getUTCMonth()===9` →
  clase `tema-halloween` en `<html>`), antes de Todos Santos. Vuelve sola cada octubre: no hay que acordarse de nada.
- **Pedidos** (`pedidos.html`): `--grad-header` de noche (morado, negro y calabaza; sigue moviéndose como siempre), 🎃 antes
  de MULTIESPUMAS (`.logo-h::before`), telaraña en SVG dentro de la página en la esquina del encabezado (`.header::after`,
  más chica en el celular, `pointer-events:none`), el número de cupos en naranja y la pestaña elegida en morado.
- **Dashboard** (`panel_template.html`, el bot lo regenera al pushear): la caja de la marca de noche con el logo en blanco,
  🎃 y telaraña, y el ítem elegido del menú en morado con la rayita naranja. Igual en tema claro y oscuro.
- ⚠️ **Los colores de aviso no cambian** (verde, ámbar, rojo): por eso el acento es morado y no naranja.
- ⚠️ Los meses cerrados del dashboard (`panel_YYYY_MM.html`) se generan con la misma plantilla: mirados en octubre también
  llevan el tema (depende del día en que se mira, no del mes del panel). Es a propósito.
- **Sueña** (dueño: *«te faltó el de Sueña»*): vive en OTRO repositorio, `eduardoxyz22-maker/MULTIESPUMAS-VISCARRA` (clon del
  dashboard de Heaven para la cuenta de Kommo de Viscarra). Mismo bloque, con ajustes porque ahí la marca es TEXTO
  («MULTI» en blanco sobre la noche, menos espacio entre letras, la 🎃 abajo a la derecha). Su `tests/test_halloween.js` (5).
  ⚠️ Lo que se haga al dashboard de Heaven por pedido del dueño, preguntarse si va también al de Sueña.
- **🧙‍♀️ La risa de bruja** (dueño, 03/10: *«¿no se puede añadir un sonido de una bruja riendo al entrar a la página?
  jajaja»*), en las tres páginas, SIN publicar todavía:
  · **Los navegadores no dejan sonar nada al abrir la página** (autoplay): suena con el PRIMER toque o tecla. Se arma UN
    `AudioContext` en el primer `pointerup`/`touchend`/`click`/`keydown` (escuchados en captura sobre `document`) y se le pide
    `resume()` con cada toque hasta que el navegador lo deja (en el iPhone/iPad cuenta el `touchend`); apenas está `running`,
    suena una vez y se sueltan los escuchas.
  · **Una vez por día por aparato**: `hw_risa_dia` en `localStorage` con la fecha de Bolivia. El panel de pedidos y los dos
    dashboards están en la MISMA dirección (`eduardoxyz22-maker.github.io`), así que es una vez por día entre las tres. Sin
    almacenamiento no suena (si no, sonaría con cada F5). Solo con `tema-halloween` (octubre).
  · **El sonido se arma en el navegador** (`window.hwRisa(ctx, t0)`, Web Audio): «je-je-je, ja-ja-ja-ja-ja, jaaaa», cada
    sílaba un diente de sierra agudo (700→980→520 Hz) con vibrato y aspereza (AM a 38 Hz), formantes anchos de la vocal, un
    soplido de «j» al empezar y un eco corto generado. Sin archivo de sonido ni nada de afuera: no hay derechos de nadie y
    no pesa. Volumen 0,4 (pico ~0,67 grabado sin parlantes con `OfflineAudioContext`).
  · Freepik no sirvió: la cuenta conectada es la gratuita (0 créditos) y los efectos de sonido no están en ese plan.
  · `tests/test_halloween.js` §4 (+8, 22 en total; contra lo publicado, la sección 4 entera roja): no suena al abrir, el
    primer toque suena UNA vez aunque se toque dos, recargar el mismo día no, el dashboard ese día tampoco, al día siguiente sí,
    el 1/11 no, y el sonido grabado dura ~2 s sin saturar. En Sueña, su `tests/test_halloween.js` (+4, 9).
  · Batería entera con la risa puesta (03/10): 130 suites, 4.914 comprobaciones, 0 rojas.
  · ⚠️ **El dueño escuchó la sintetizada: *«¡qué risa más fea!»*.** Va a mandar un archivo grabado; el mecanismo (primer toque,
    una vez por día, solo en octubre) queda igual y se cambia solo el sonido. El archivo va al repo público: tiene que ser de uso
    libre o grabado por el equipo. NO publicar la sintetizada.
  · **El archivo del dueño** (03/10, adjuntado en el chat: «EFECTO DE SONIDO Risa BRUJA | witch laugh sound effect», mp3 de
    9,5 s, 192 kbps estéreo, con tres risas seguidas; parece bajado de un video de efectos de sonido: el dueño lo eligió después
    del aviso de que el repo es público). Se usa la **PRIMERA risa**, de 0,5 a 3,95 s del original = **`halloween-risa.mp3`**,
    3,47 s, 81 KB, cortada POR CUADROS sin volver a codificar (sin ffmpeg en la sesión: script de Python que lee las cabeceras
    MPEG-1 Layer III, saca la etiqueta ID3 y el cuadro «Info» —con otra cantidad de cuadros mentiría la duración— y se queda con
    los cuadros 19 a 152). El corte del final cae en el silencio después del último «ja».
  · Se REEMPLAZÓ la sintetizada (`window.hwRisa` ya no existe): ahora `new Audio('halloween-risa.mp3?v=1').play()` con el
    primer `touchend`/`click`/`keydown` (los tres gestos con los que todos los navegadores dejan sonar), volumen 0,8 donde se
    puede (en el iPhone/iPad lo manda el botón del aparato). El día se anota recién cuando `play()` arranca; si el navegador
    dice que no, se prueba con el toque siguiente. El archivo se baja con ese primer toque, no al abrir. `window.hwRisaArchivo`
    dice cuál es. ⚠️ **Si se cambia el archivo, subir el `?v=`** (si no, los celulares siguen con el viejo en caché).
  · **PUBLICADA el 03/10 a las 11:47** (dueño: «publica»): MULTIESPUMAS `529afcb`, Sueña `62e55bf`. Batería entera antes:
    130 suites, 4.913 bien y 1 roja, que era la PRUEBA (`test_halloween` miraba el día anotado 150 ms después del toque y, con
    la máquina cargada, el mp3 todavía no había arrancado); se corrigió esperando a que el navegador conteste `play()` y pasó
    3 de 3 con la batería corriendo al lado.
  · El mp3 vive en la raíz de los DOS repos (al lado de `pedidos.html` y de los `index.html`/`panel_YYYY_MM.html`, que lo
    buscan con dirección relativa). Las pruebas copian el mp3 al lado del dashboard armado en la carpeta temporal.
  · 🚨 **«No suena nada» (dueño, 03/10 a la tarde, desde el iPad: *«actualizo y actualizo y no suena nada… esa misma risa ya
    la publiqué en otros paneles y suena 10/10»*).** Se comparó con su panel de SPADENTAL (`sonidos/risa-bruja.mp3`, mismos
    bytes que el archivo que me mandó, 230 KB, reproducido ENTERO al entrar con la clave, `preload='auto'`). La diferencia
    estaba en MI archivo: el recorte por cuadros empezaba en el cuadro 20 del original, cuyo `main_data_begin` es 367 —el
    MP3 guarda parte de cada cuadro en los anteriores (depósito de bits)— y esos cuadros ya no estaban. Chromium (las
    pruebas, la compu) lo perdona; **Safari del iPad lo rechaza** y `play()` falla callado. Los cuadros 0-14 del original
    sí arrancan limpios (`main_data_begin`=0): un recorte válido tenía que ir desde el principio. Además, la regla de «una vez
    por día» lo dejaba sin poder probarla.
    **Arreglo** (dueño: *«mejor no la recortes, que suene entera»*): `halloween-risa.mp3` pasa a ser el archivo ENTERO tal cual
    (9,6 s, 230 KB, `?v=2`), creado al abrir con `preload='auto'` como en SPADENTAL, y suena con el primer toque de CADA
    apertura, sin `hw_risa_dia`. `test_halloween` 22/22 y 9/9 (Sueña) con las comprobaciones cambiadas (vuelve a sonar al
    recargar; el archivo empieza con `ID3` y dura ~9,5 s). Sin ffmpeg con MP3 en la sesión (el de Playwright no lo trae).
    **Publicado el 03/10 ~16:10** (MULTIESPUMAS `74bd4ed`, Sueña `654bfef`; Pages en verde en los dos) y **confirmado por
    el dueño desde el iPad: «ya suena 10/10»**.
- `tests/test_halloween.js` (14; contra la página y la plantilla de antes, 10 rojas): prendido el 3/10, apagado el 30/09
  23:59 y el 1/11 00:01 de Bolivia con el aparato en UTC, prendido el 31/10 23:59 y en octubre de 2027, el dashboard en claro
  y oscuro. Suites del encabezado y anchos en verde (humo, celular, carga, onclicks, proyección, marcas, saldo, cupos).

## 4hl. 02/10, noche: ✂️ la poda de los pedidos a fábrica ya recibidos — la celda del stock deja de crecer — PUBLICADA 02/10 17:26 (`5caebd6`)

> El dueño (02/10): *«6.- La celda del stock va 45 % de las 50.000 letras que aguanta Google: podar lo ya recibido antes de que
> llegue. hazlo»*. Lo había dejado anotado §4fz-b («el tamaño real todavía no se midió»).

### Lo medido primero (con el catálogo real en tres almacenes, fixture sintético de 40 pedidos, 30 entradas, 14 cortes, 3 uniones)
| sección | letras | % |
|---|---|---|
| `c` (PTF: `u` 8.708 + `cod` 11.220) | 20.045 | 27 % |
| `g` (Banzer `u` 8.295 / `cod` 10.706 / `rs` 2 · IM `u` 9.081 / `cod` 11.699 / `rs` 165) | 40.168 | 55 % |
| `p` (40 pedidos, 30 recibidos) | 7.616 → **4.709** | 10 % |
| `e` 3.153 · `h` 1.895 · `a` 219 · `al` 104 | igual | 7 % |

- **El 82 % de la celda son las fotos de los almacenes** (`u` + `cod` de PTF, Banzer e IM): son del tamaño del Excel y **no crecen
  con el tiempo**. Lo ÚNICO que crecía sin parar eran los pedidos a fábrica recibidos (`p`), guardados 4 meses enteros con sus
  recepciones «porque miden cuánto tarda la fábrica». O sea: **la poda cambia poco HOY** (el stock se usa desde el 07/09 y hay
  pocos recibidos viejos; en el fixture `p` baja 38 % y el total 4 %) **y lo que hace es acotar el crecimiento**: un recibido entero
  pesa ~250 letras, una muestra ~100, uno sacado 0. Si hay que bajar de verdad, la palanca es `cod` (ver «no se tocó»).

### La regla (`stockPodar(S, hoy)`, determinista: depende de la fecha y del contenido, idempotente, con los días solo saca)
- Pendiente (`r` vacío): nunca se toca. Recibido hace menos de **`STOCK_RECIBIDOS_DIAS`=45**: entero, con recepciones (la junta
  entre dispositivos todavía puede necesitarlas, §4fz-b).
- Recibido hace 45 días o más: queda **solo como muestra** (`stockMuestraDe`: `{id,k,u,[tipo],[de],[fab],f,r,[enConteo]}`, orden de
  claves fijo —dos dispositivos escriben el mismo texto—, sin `recs/ru/total/esp`) y solo si alguna cuenta lo mira:
  (a) está entre las últimas **`STOCK_MUESTRAS`=6** llegadas de su fábrica (empates del mismo día incluidos; no recogidas, no
  `enConteo`, 0-60 días: exactamente lo que mira `stockMuestrasFabrica`); (b) es el pedido **más nuevo de su producto** por `f`
  (sostiene el renglón, `grupo(q.k)`, y `fabUlt` → `o.fab` → el tiempo de fábrica; por eso `stockCodRefs` tampoco cambia); (c) es
  una recogida que `g[de].rs` todavía nombra con unidades (`saleRecogidaViva`). Si no, se va.
- **`STOCK_RECIBIDOS_TOPE`=120**: nada (la regla de siempre). `STOCK_MUESTRA_DIAS`=60 reemplaza el 60 hardcodeado de
  `stockMuestrasFabrica`.
- ⚠️ **La misma poda en los tres caminos**: al leer (`leerStock`), al juntar (al final de `stockFusionar`) y al guardar (`filaStock`).
  La junta va por id y una unión sin base re-agrega lo que un lado sacó: si solo podara el que guarda, el otro dispositivo —o una
  página de antes— lo traería de vuelta y la celda no bajaría nunca. Podado en los tres, lo que vuelve se va otra vez en el acto.
  Una página vieja lee una muestra sin problema (tiene id, clave, `f`, `r` y `fab`; sin `recs` ni `ru`,
  `stockNormalizarRecepciones` la saltea).

### Lo que NO se tocó, y por qué
- **`cod` de cada almacén** (el 41 % de la celda del fixture): no son solo para claves crudas. `stockClaveInv` («el código gana sobre
  cualquier nombre») resuelve TAMBIÉN códigos del catálogo por `idx.cod`, `existLeer` arma la clave de un código conocido pasando
  por ahí, `stockCorteViejo` mira `Object.keys(c.cod).length`, y lo usan `productoDeAlmacen`, `saldoCodigosAlmDe`, `stockCodRecordar`
  y `stockMigrar`. Sacar los conocidos no está probado seguro. Es la siguiente decisión si el dueño quiere bajar de verdad.
- **`g[nm].rs`**: cada entrada frena restarle dos veces una recogida, se vacía con cada Excel nuevo del almacén y pesa casi nada.
- `e` y `h` ya tenían poda y tope.

### Pruebas
- `tests/test_stock_podar.js` (**39**; contra `16f1a21` da 0/1): tamaños; punto fijo leer → guardar → leer (desde memoria y desde
  la celda cruda); podar² = podar; **las cuentas dan lo mismo que la regla vieja de 120 días** (`stockData` 24 campos por renglón,
  `stockTiemposFabrica`, `stockMuestrasFabrica`, `stockCodRefs`, `abiertos`) hoy y 50 días después; la junta con base, sin base y
  con una página vieja que reescribe recibidos enteros (IM no se resta dos veces, `rs` igual).
- 28 suites del stock en verde sin cambios a conciencia (`test_stock` 106, `rev_stock` 19, `rev2_stock` 22, `rev30_stock` 36,
  `existencias` 55, `banzer` 56, `banzer_salida` 77, `rev_banzer` 25, `producir` 62, `rotacion` 32, `concurrencia` 50, `transicion`
  18, `identidad` 45, `codigo_almacen` 13, `saldo_almacen` 84, `rev8_saldo` 66, `corte_horario` 35, `adm_alta` 19, `revstock` 37,
  `rev3_stock` 36, `eduardo_multicenter` 40, `ventas_panel` 15, `rev3_entregas` 17, y los `.cjs` del dueño).

## 4hk. 02/10, noche: plata — 🗑 borrar un pago registrado, ✅→📥 el pago nuevo saca la marca del sistema contable, y el 💵 de Administración pregunta quién recibió el efectivo — PUBLICADA 02/10 17:26 (`5caebd6`)

> El dueño (02/10, de la lista de mejoras de RESPUESTA §27): *«4. Plata (Contabilidad) · No hay cómo borrar un pago ya registrado
> («Corregir» exige monto mayor a 0). · Un cobro nuevo sobre una venta ya pagada entra callado: tendría que avisar «esta venta
> ya estaba saldada». · El 💵 de Administración deja el efectivo en la vendedora aunque lo haya cobrado el chofer. hazlo»*.
> Los dos últimos eran MEDIA-5 y MEDIA-4 de §4fy, que esperaban su decisión desde el 23/09.

### A. 🗑 Borrar este pago (`ctaBorrarPago`)
- **Dónde**: dentro de «✏️ Corregir este pago» de la ficha de Contabilidad, al lado de 💾 Guardar / Cancelar. Solo aparece en un
  renglón de verdad (monto > 0 y sin `sinMonto`): el pago de MENTIRA de una «PAGADA sin monto» (§4fg) no existe en la planilla y
  para eso están «💵 Anotar el monto» o editar la venta como NO pagada; si igual se lo llama, se niega y lo dice.
- **Qué hace, según el renglón**:
  · un **COBRO** de la venta: `aplicarCobros(p, arr sin ese renglón, objetivoCobro de antes)` → el total de la venta no cambia y lo
    borrado vuelve a «falta cobrar». Si era el **2° método del adelanto mixto** (`mixtoEn`, §4fz), «A cuenta» baja al anticipo solo
    —la misma regla que al corregirlo en `ctaGuardarPago`—; en una «SÍ, pagado» con «A cuenta» 0 (§4cb) no se toca.
  · el **ADELANTO**: se reescribe `metodoPago` con los cobros reales + los recargos (sin el `~`), **`p.acuenta=0`** (si no,
    `anticipoDe` lo reconstruye desde «A cuenta» y el adelanto vuelve solo) y `aplicarCobros(p, cobrosReales, ventaTotal de antes)`:
    la venta pasa a deber todo lo que no entró por otro lado. Una «SÍ, pagado» (el pago vive en el adelanto) vuelve a deber el total.
    El 2° método del mixto, si había, queda como un cobro más: ya estaba en los cobros y en el saldo.
  · un **RECARGO** por entrega cobrado: solo ese renglón (`ctaIdxEnvio`, §4fe) con `aplicarEnvios`; un pactado sigue por cobrar.
- **Las imágenes** van a la papelera DESPUÉS de reescribir y solo con `borrarFotoSiNadieLaUsa` (§4fy): el flete «¿ya lo cobraste? SÍ»
  del formulario comparte la imagen con el pago de la venta, y esa no se pierde.
- **La marca ✅ REGISTRADO no se toca**: si ese pago ya se cargó en el sistema contable, hay que corregirlo allá a mano, y la
  pregunta lo avisa. La pregunta dice qué se borra (tipo, monto, método, fecha, recibo, quién lo recibió), de cuánto a cuánto pasa
  lo que falta cobrar (y si sigue cobrada de más), cuántas imágenes se van, y que **NO se puede deshacer** (para recuperarlo hay que
  registrarlo de nuevo). `ctaPagoRecordar()` antes de repintar (§4fy) y la ficha se reabre (`reabrirFicha`).

### B. ✅→📥 Un pago NUEVO saca la marca «cargada en el sistema contable» (`registradoSigue`, MEDIA-5)
- **El problema de verdad**: la marca ✅ REGISTRADO es por VENTA (§4j): Contabilidad la pone cuando cargó la venta en su sistema. Un
  cobro que entra DESPUÉS —el saldo que cobra el chofer en la puerta, un QR que llega a la semana, un flete cobrado— quedaba
  escondido detrás de la marca: la venta ya no salía en «📥 sin cargar al sistema contable» y ese pago no se cargaba nunca. El
  «avisar que la venta ya estaba saldada» ya existía en Contabilidad (§4fk pregunta con saldo 0) y en el chofer («te estás
  pasando»); lo que faltaba era que el pago nuevo volviera a la cola de carga.
- **Cómo**: `aplicarCobros` compara los cobros que va a escribir con **`cobrosDe(p)`** (el de mentira incluido) y `aplicarEnvios` cuenta
  los recargos COBRADOS: uno más = plata nueva → `registradoSigue(p, 'pago'|'flete')` saca la marca y avisa en rojo
  («✅→📥 Esta venta ya figuraba CARGADA en el sistema contable: con este pago nuevo vuelve a «sin cargar», para que lo carguen
  también»). Entra por todos los caminos que ya pasan por ahí: Contabilidad (`ctaRegistrarPago`), chofer (`choCobrarMetodo`),
  Administración (`applyPaid`), y el formulario con `_regFin` en `submitPedido` («SÍ, pagado» sobre una venta con pagos sin
  saldar —`pagoRestoPrev`, `_nuevos`—, un flete cobrado nuevo, un adelanto recién anotado), donde `_avisoPlata` lo dice en el
  «Cambios guardados».
- **Lo que NO la saca, a propósito**: corregir un pago (mismo renglón), **anotarle el monto a una «PAGADA sin monto»** (por eso se
  compara con `cobrosDe` y no con `cobrosReales`: `ctaAnotarMonto`/`ctaGuardarPago` le sacan `sinMonto` antes de llegar; si el de
  mentira llega hasta `aplicarCobros` —`huboSuelto`— cualquier renglón real que lo acompañe sí es nuevo, porque `cobrosDe` solo lo
  fabrica cuando no hay ninguno real), borrar un pago (A), y **«↩️ Era un pago de la venta»** (§4gr): no es plata nueva, su pregunta
  ya avisa, y `test_envio_a_pago` §6 exige que la marca siga → `aplicarCobros(p, arr, objetivo, {mismaPlata:true})`, 4° argumento
  nuevo, opcional.
- ⚠️ Una fuente NUEVA de cobros tiene que pasar por `aplicarCobros`/`aplicarEnvios` para heredar esto.

### C. 💵 ¿Quién recibió la plata? (`admQuienRecibio`, MEDIA-4)
- **El problema**: el 💵 Efectivo de la ficha de Administración (`markPaid`) y el 💰 de la tabla (`quickCobrado`) anotaban el cobro
  sin `recibio` (§4eq): la plata quedaba «en la mano de la vendedora» aunque la hubiera cobrado el chofer, y el Cuadre «Efectivo
  cobrado vs. retirado» se la pedía a ella en vez de al chofer, que es quien la rinde a Contabilidad.
- **Cuándo pregunta**: SOLO con duda, `admEfectivoConDuda(p)` = el pedido tiene chofer Y el camión ya salió (`entregado`, o
  `fechaSalida(p) <= hoy`). Sin chofer, o con la entrega por delante, nadie más pudo recibirla: queda con la vendedora sin preguntar,
  como siempre (y los fixtures de `test_rev_conta`/`test_rev3_admin`/`test_conta_alta`, que cobran sin chofer, no cambian).
- **La ventana**: «💵 Cobrar Bs N en efectivo · ¿Quién recibió la plata?» con «🚚 El chofer <del pedido>» (primario), «🧑‍💼 <vendedora>
  (la vendedora)» y un desplegable con los otros choferes (`choferesParaSelect`, §4eq), más Cancelar (desde la ficha vuelve a la
  ficha). `admCobrarEfectivo` → **`applyPaid(p, metodo, banco, recibio)`** (4° argumento nuevo; el `>Nombre` solo en efectivo). El
  aviso dice «lo tiene <chofer> hasta rendirlo a Contabilidad» o «queda con la vendedora». Un 📱 QR/tarjeta no pregunta: va al banco.

### Pruebas
- `tests/test_plata_borrar.js` (**39**; contra la página publicada `f491137` da 6/39): A1 el botón (cobro, adelanto, no en el de
  mentira); A2 borrar un cobro (pregunta, saldo 400 → 1.000, total 2.000, un guardado, la foto a la papelera, aviso, ficha
  reabierta); A3 cancelar; A4 el adelanto (con QR aparte, «SÍ, pagado», con mixto); A5 el 2° método del mixto («A cuenta» 700 →
  500); A6 el recargo (el pactado sigue; la imagen compartida con el adelanto NO va a la papelera); A7 el de mentira se niega; A8
  con ✅ avisa y la marca sigue. B: `applyPaid`, corregir (sigue), anotar el monto (sigue), chofer, recargo cobrado nuevo,
  `ctaEnvioAPago` (sigue), y el formulario «SÍ, pagado» (cobro de hoy + «vuelve a «📥 sin cargar»»). C: tabla → chofer /
  vendedora, sin chofer directo, entrega futura directo, sale HOY pregunta, ficha + Cancelar + QR directo, otro chofer del
  desplegable, y el Cuadre se la pide al chofer.
- Las 15 suites de plata de siempre, en verde con los cambios: `test_botones` 50, `test_conta_alta` 53, `test_rev_conta` 38,
  `test_rev3_admin` 48, `test_envio_a_pago` 28, `test_mixto` 33, `test_sinmonto` 42, `test_cuadre_alta` 35, `test_chofer_efectivo`
  35, `test_rev6_plata_form` 52, `test_rev30_plata` 17, `test_medias` 24, `test_guardado` 18, `test_rev5_pedidos` 49,
  `test_rev8_saldo` 66.

### Lo que queda (dicho, no hecho)
- Borrar un pago no se deshace: para recuperarlo hay que registrarlo de nuevo a mano (la pregunta lo dice).
- El 💵 de Administración sigue sin pedir imagen ni recibo (como siempre): es el camino rápido; lo prolijo es Contabilidad.
- El 💰✓ de Administración («deshacer») sigue deshaciendo solo cobros de la puerta (§4fy), con o sin `>chofer`.

## 4hj. 02/10, tarde: servidor `2026-10-02-a` — el libro de reservas de stock: el que guarda segundo se entera — SERVIDOR IMPLEMENTADO 02/10 ~17:21 (el dueño), PÁGINA PUBLICADA 02/10 17:26 (`5caebd6`)

> El dueño (02/10): *«Dos vendedores que guardan la última unidad en los mismos segundos la venden dos veces: la revisión del
> saldo tendría que estar también en el servidor. hazlo»*. Era la «ventana que queda» dicha en §4gj: el cuadrito pregunta con la
> planilla recién leída, pero si A y B leen «Libres 1» y guardan en los mismos 1-3 s, entran los dos sin aviso y se enteran recién
> en la lectura siguiente, cuando el cliente ya tiene fecha.

### Lo que se decidió (y lo que NO)
- **El servidor NUNCA frena una venta** (dueño, §4gj: «nunca frena la venta») **ni reparte el stock** (§4gq: lo decide logística)
  **ni sabe de catálogos ni de Excel**: la cuenta del saldo sigue viviendo en UN solo lugar, la página (`stockData`). Lo que el
  servidor hace es llevar un **libro de reservas**: quién apartó cuánto de qué clave y cuándo. Codex ya había dicho lo mismo en
  §4gl («no bloquear la venta; antes, las mismas reglas que `stockData` en el `.gs`»); se eligió lo más chico que resuelve el caso.

### El servidor (`google-apps-script.gs`, `SCRIPT_VERSION='2026-10-02-a'`, 2.430 líneas)
- **`doSave(p, forzar, juntar, reserva)`**: con la fila YA escrita y releída (nunca frena), si llegó `reserva` y el id no es del
  sistema (`__…`), `reservaProcesar_(id, reserva, Date.now())` adentro del candado de `doPost`. Si algo falla ahí, el guardado
  vale igual y la respuesta sale sin `saldo`.
- **El libro**: propiedad `RESERVAS` = `{por:{<id>:[{k,u,t}]}}` (clave del producto, unidades, hora de Google). `reservasGuardar_`
  poda lo de más de `RESERVAS_VIGENCIA_MS` (6 h: una entrega ya salió mucho antes) y, si pasa de `RESERVAS_TOPE_LETRAS` (8.000; una
  propiedad aguanta 9 KB), olvida lo más viejo de a una entrada.
- **`reserva` que manda el panel**: `{visto, lineas:[{k, u, libres, conocidos}]}`. `visto` = el `ahora` (reloj de Google) de la
  lectura con la que la página calculó el saldo; por línea, la clave, las unidades, cuántas quedaban libres según esa lectura
  (puede ser negativo) y los ids de los pedidos que esa cuenta YA tuvo en cuenta o descartó a propósito.
- **`otros`** (`reservaOtros_`) = lo que apartaron OTROS pedidos de esa clave, que no son el propio ni están en `conocidos`, anotados
  después de `visto − RESERVAS_MARGEN_MS` (30 min: solo acota; lo que evita contar dos veces es `conocidos`). Si `otros > 0` y
  `libres − otros < u`, la respuesta lleva **`saldo:[{k,u,libres,otros,faltan}]`**. Sin `visto` o sin `libres` no se avisa, pero
  la reserva se anota igual, para los demás.
- **Volver a guardar reemplaza la reserva con cuidado** (`reservaAnotar_`): por clave, si pide lo mismo o menos se conservan las
  entradas viejas (recortando desde la más nueva); si pide más, una entrada nueva solo por la diferencia. Así corregir la dirección
  no le cambia la hora a la reserva: si la cambiara, otro que leyó entre el alta y la corrección lo contaría dos veces (una en su
  `libres`, otra acá). Una clave que ya no está en el pedido se va. **`doDelete` → `reservaBorrar_`.**
- Un guardado SIN `reserva` (un panel viejo, la cola, el chofer, Contabilidad, Kommo, las filas del sistema) no toca nada y la
  respuesta es la de siempre. `probarAntesDeImplementar`: sección 9 informa cuántas reservas hay (no frena) y las tres funciones
  nuevas van en `fns`. `SCRIPT_VERSION`, `ESTA_VERSION` y `SCRIPT_VERSION_ESPERADA` subieron juntas (§11 de `test_servidor`).

### La página
- **`saldoReservaArmar()`** en `submitPedido`, **ANTES del `upsert(rec)` optimista** (con el pedido nuevo ya en `STATE`, `libres` lo
  descontaba a él mismo —1 libre decía 0— y `conocidos` traía su propio id; lo atajó la prueba). Solo con `saldoAvisoActivo()`,
  `STOCK_CARGADO` y algún Excel; una línea por grupo `f.g` de `saldoFilasForm()` que pase `saldoDelAlmacen` (ni 📐 ni 🏷️ ni 🏭 ni los
  de tienda); `libres` = `v.libres` de `saldoVeredicto` (omitido si no hay número); `conocidos` = `saldoIdsConClave(k)` (ids de
  `STATE` sin sistema ni borradores con alguna línea de esa `stockClave`). `visto` = **`SALDO_VISTO`**, el `_ahora` de la última
  lista que `mergePending` volcó en `STATE` (0 con un servidor de antes → no viaja). Viaja en `apiSaveAhora` por `opts.reserva`;
  **la cola no lo manda**.
- **Si vuelve `saldo`**: después de lo de siempre (pedido guardado, formulario vacío o edición cerrada, la ventana de WhatsApp o
  «✓ Cambios guardados» abierta), `saldoAvisoServidor` abre la ventana ámbar «⚠️ Mientras guardabas, otro vendedor vendió lo
  mismo · otro vendedor vendió N de <producto>: ya no hay saldo libre (faltan M). **Tu pedido quedó guardado igual.** Avisale al
  cliente / a la sucursal que puede demorar o reprogramá la entrega». «Entendido» devuelve la ventana que tapó
  (`SALDO_MODAL_PREVIO`); «✏️ Abrir el pedido» relee la planilla (`conTope` 4 s, `SALDO_LECTURA_T=0`) y abre `editPedido(id)`:
  recién ahí el cuadrito cuenta al otro y dice desde qué día llega.
- De paso: los comentarios «~7 veces menos» de la lectura comprimida (pendiente de §4he) dicen lo medido, ~3,5, en los dos archivos.

### Lo que NO cubre (dicho al dueño en RESPUESTA §28)
- Lo que sale de la **cola** (sin señal al guardar) no lleva reserva: el servidor lo anota como «sin visto» recién cuando llega, y
  no avisa a nadie.
- Si la clave que calculó una página no es la que calculó la otra (un Excel recién subido en una sola), no se cruzan.
- Con el servidor 30-a la página manda `reserva` igual y no pasa nada (ni ventana ni error): la página se puede publicar antes de
  implementar, pero el aviso recién existe con la 02-a.

### Pruebas
- `tests/test_servidor.js` **§21** (24 comprobaciones nuevas, 345 en total; contra el `.gs` 30-a `4a950cc` da 16 rojas): anota,
  avisa solo con `otros`, `conocidos` evita contar dos veces, reemplazo con cuidado, poda a 6 h, tope de letras, borrar, filas del
  sistema, sin `reserva`, sin `visto`.
- `tests/test_saldo_servidor.js` (**24**; 10 rojas contra `4a950cc`): dos celulares contra el `.gs` real con la planilla en memoria:
  A y B leen «Libres 1», guardan uno detrás del otro, A no ve nada, **B ve la ventana** con el producto y «faltan 1», «Entendido»
  devuelve el WhatsApp, «✏️ Abrir el pedido» relee y abre la edición; y la vuelta con el `.gs` viejo (manda `reserva`, no pasa nada).
- Las 14 suites del circuito (saldo, guardado, lectura, cola, conflicto, concurrencia, kommo, traer) en verde.
- **Batería entera del 02/10 a la noche**, sobre la rama con los tres cambios (§4hj + §4hk + §4hl): **129 suites, 4.891
  comprobaciones en verde**. La única roja fue `test_onclicks` (4/1): en `admQuienRecibio` el `onclick` se armaba con una variable
  `fn` adentro de las comillas y el escáner estático la tomó por una función que no existe; se renombró (`accionDe`/`accion`) y
  la suite dio 5/5. ⚠️ Un `onclick="…"` que se arma concatenando no puede llevar `nombre(` adentro de las comillas salvo que sea
  una función de verdad.

### Implementación (02/10, el dueño)
- 17:19 `probarAntesDeImplementar()` desde el editor, todo ✅: «Versión de este código: 2026-10-02-a», 29 funciones clave, 1.168
  filas, disparadores instalados, repaso de Kommo hace 0 minutos, **stock 22.166/50.000 (44 %)**, arqueo 0, la lectura comprimida
  962.056 → 276.052 letras (3 veces menos), portero con 14 feriados por venir (el próximo 02/11, Todos Santos), «Reservas de stock
  anotadas: ninguna todavía», «Se puede implementar».
- ~17:21 «implementado» (✏️ → Nueva versión sobre la implementación de siempre). La versión anotada para volver atrás es la **35**
  (= 2026-09-30-a) + pegar la 30-a (`4a950cc354f88451555e2332fde09a4ae8f45f42`, 2.277 líneas).
- El enlace que se le dio, fijo al commit: `https://raw.githubusercontent.com/eduardoxyz22-maker/MULTIESPUMAS/6b76e7aa06d9168ff1dbfd8836585c8895b029b6/google-apps-script.gs`
  (verificado desde acá con `curl` + `cmp`: idéntico al de la rama, 2.430 líneas). ⚠️ El enlace entre comillas de código no le
  salió como enlace tocable en su app: la primera vez hay que ponerlo pelado en una línea.
- Con la página de ahora (`f491137`) el servidor nuevo no cambia nada (no llega `reserva`): el aviso existe recién al publicar.
- Verificación desde acá: `actions_run_trigger` sigue dando 403 (no se puede disparar el diagnóstico ni el respaldo de Kommo
  desde esta sesión); la próxima corrida programada del respaldo imprime la versión.

### Publicación de la página (02/10)
- El dueño (17:24, después de ver «El candado está en el servidor (versión 2026-10-02-a)» y la línea ámbar «esta página espera
  2026-09-30-a»): *«publica»*. Sin el panel corriendo (la corrida 487 terminó 18:51 UTC; la de las 21:00 UTC no había arrancado),
  merge de la rama en `main` = **`5caebd6`**, 17:26 de Bolivia. Junto con §4hk (plata) y §4hl (poda del stock).
- Batería entera antes de publicar: 129 suites, 4.891 comprobaciones en verde (§4hj «Pruebas»).
- Falta del lado del equipo: **todos F5**. Una página vieja manda pedidos SIN `reserva` (el servidor no avisa nada por ellos, pero
  tampoco los anota: el que guarda después no se entera de ese). La línea ámbar «esta página espera 2026-09-30-a» se va con el F5.

### Para implementar (procedimiento de §4fz-b «Publicar»)
1. Anotar la versión que está activa (la 35 = 2026-09-30-a) en Implementar → Administrar implementaciones → ✏️.
2. Pegar el `.gs` desde el enlace raw FIJO al commit (nunca por el chat, §4fz-b): 2.430 líneas, termina en `}` con `return
   borrador;` antes. `probarAntesDeImplementar()` → «✅ Se puede implementar» y «Reservas de stock anotadas: ninguna todavía».
3. Publicar la página, **todos F5**, y recién ahí ✏️ → Nueva versión.
4. Volver atrás = ✏️ a la versión 35 Y pegar la 30-a (`4a950cc…`, 2.277 líneas).

## 4hi. 02/10, tarde: revisión de los dos commits de Codex en `main` (§4hg `92ff404` 12:52, §4hh `e0c5b90` 15:50) — batería entera y dos correcciones

> El dueño: *«revisa el md del repo, chat gpt hizo modificaciones y arreglos»*. Codex publicó directo en `main` (sin pasar
> por la rama) dos veces el 02/10; su nota está en §4hg/§4hh y en RESPUESTA §25/§26. Esta sección es la revisión. La rama
> se puso al día con `main` (merge `2ba568d`).

### Lo que hizo Codex (resumen, para no leer el diff)
- `guardarYa` (formulario) mete la fila en `LS_PEND` ANTES de `apiSave`, con el mismo id y sello; una respuesta definitiva
  (`ok` true o false) saca SOLO esa foto (`sacarEnvioForm`); el `catch` ya no vuelve a encolar (ya estaba).
- `guardarDurable(rec, opts)` hace lo mismo para `persistPedido` (cobros, chofer, ATC…), `persistRetiro`, `guardarArqueo`,
  `guardarStock` y `toggleEntregado`. `apiSaveAhora` con `_durable` trabaja sobre una COPIA y vuelve a encolar lo que de
  verdad sale (`prepararDurable`); `colaQuitarExacta(txt)` reemplaza a `sisColaLimpiar` (quedó sin uso) y a los
  `setPending(filter id)`.
- `flushPending` saltea ids con envío en vuelo o en espera (`SAVE_EN_VUELO`/`SAVE_EN_ESPERA`) y devuelve `{rechazados}`;
  `misReintentarCola` distingue rechazado / en cola / llegó, y el pie lo usa.
- `confirmarReemplazoForm` (en `editPedido` y `completarBorrador`): con un pedido NUEVO a medio llenar pregunta antes de
  reemplazarlo (`FORM_NUEVO_BASE` = huella del formulario vacío al terminar `resetForm`); con un envío en curso
  (`f-submit` deshabilitado) no abre otra edición.
- Retiros: `persistRetiro` ya no saca «las versiones viejas» de la cola (`queuePending` guarda UNA por id); un retiro nuevo
  corregido sin respuesta lleva el alta anterior en `_altaPendiente` (metadato local, fuera del envío y de
  `mismoContenido`) para que el `_altaPropia` de §4he la reconozca.
- `rechazoFirme(rec, res, colaTxt)`: saca de la cola solo esa foto, y borra `SAVE_ULTIMO`/`SAVE_REV` solo si lo último
  tocado es lo rechazado.
- Pruebas nuevas: `test_guardado_durable.js` (41) y `test_guardado_operaciones.js` (62; reloj clavado el 16/09/2026; el
  `.gs` real con planilla en memoria).

### Lo revisado (está bien)
- **El sello llega al pedido vivo aunque `apiSaveAhora` trabaje sobre una copia**: `aplicarSello` lo aplica a `[rec,
  findById(id), borradorDe(id), RETIROS[id]]` y a `SAVE_REV`, y el «en espera» de `apiSave` manda `SAVE_ULTIMO[id].rec` con
  `SAVE_REV`. Un ✅ seguido de un 💵 en el mismo pedido no choca.
- `flushPending` no duplica el envío del formulario (lo saltea mientras viaja), y el «ok tardío» de siempre cubre el reenvío
  después de recargar (fila sin sello → `conflicto` con la misma fila → tardío, §4fa).
- `_altaPendiente` es coherente con §4he; `mismoContenido` lo saltea; no viaja a la hoja.
- `confirmarReemplazoForm` no molesta al reabrir por `conflicto`: la edición y `completarBorrador` tienen `EDIT_ID`.
- **Batería ENTERA** (Codex corrió 10 suites de 126): 126 suites, **4.764 comprobaciones**; solo 2 rojas, las dos por el
  TEXTO del aviso nuevo (`test_guardado` M5 y `test_lectura`: «NO está en la planilla» → «NO se guardó en la planilla
  todavía»); se aceptan las dos frases. `test_guardado_operaciones` salía «ok (sin resumen)» porque cierra con «62 bien / 0
  mal» (barra): `correr.sh` acepta las dos formas.
- La página publicada (`e0c5b90`) es byte a byte la de `main`; Pages OK 15:50.

### Lo que no estaba bien y se corrigió acá
1. **El pie y Mis pedidos contaban el guardado EN VUELO como «sin enviar»** (regresión visible de §4hg/§4hh). Como la fila
   entra a la cola antes de mandarse, `updateFooter` decía «1 sin enviar · reintentar» y `renderColaAviso` «⏳ 1 guardado…
   todavía NO llegó a la planilla (el servidor no contestó)… No cierres esto sin que diga 0» durante CADA guardado normal;
   con Google lento (20-30 s) parecía una falla, y «Reintentar» contestaba «sigue sin llegar». Ahora **`colaEsperando()`** =
   la cola sin los ids con envío en vuelo o en espera, y la usan `updateFooter`, `renderColaAviso`, `misReintentarCola` y el
   modal «Quedó en cola»; `apiSave` repinta el pie al terminar cada envío (`fin`), así lo que falló se cuenta en el acto.
   ⚠️ `autoRefrescar`, `flushPending` y `filaSistemaEnVuelo` siguen mirando la cola ENTERA, a propósito. ⚠️ La fila entra a
   la cola (y el pie se pinta) ANTES de que `apiSave` marque el envío en vuelo: por eso `apiSave` repinta también al marcar
   `SAVE_EN_VUELO`/`SAVE_EN_ESPERA` — sin eso el pie seguía diciendo «1 sin enviar» mientras viajaba (lo atajó M7).
   `test_guardado` M7 (4 comprobaciones; 1 roja contra `e0c5b90`: «el pie NO dice sin enviar»).
2. **`prepararDurable` contra `NO_ENCOLAR`**: un guardado que esperaba turno detrás de uno rechazado en firme (10 s de
   `NO_ENCOLAR`) no entraba a la cola y `errorCopiaDurable` decía «liberá espacio del navegador», que no era el motivo. Un
   intento durable es un intento nuevo: `prepararDurable` borra `NO_ENCOLAR[id]` (como ya hacían `guardarDurable` y
   `guardarYa`).

### Publicación
- **Publicado el 02/10 a las 16:21 de Bolivia** (`main` = `f491137`, merge de la rama; el dueño: *«publica»*), con Actions
  quieto. El servidor no cambia (sigue `2026-09-30-a`). Para verlo, recargar la página.

### Dicho, sin tocar
- Cada guardado del stock o del arqueo que no entra ahora tira un toast rojo («⏳ stock: NO se guardó en la planilla
  todavía (…)»); antes se encolaban callados. Es información; si molesta en logística, se baja a un aviso en la pantalla.
- `sisColaLimpiar` quedó sin uso.
- Codex publica directo en `main` sin correr la batería entera. Esta vez no rompió nada de fondo, pero las 116 suites que no
  corrió son las que cuidan el resto del panel: correrla acá antes de dar por bueno lo suyo.

## 4hh. 02/10: pagos, retiros, arqueos, entregas y stock sobreviven a recargar durante el envío

La auditoría ampliada de `92ff404` reprodujo cinco operaciones que aún encolaban solo DESPUÉS
del error de red. Recargar antes de que el POST llegara a Apps Script perdía el pago, retiro,
entrega o llegada; el arqueo quedaba solo en el espejo del primer equipo. Cuando el servidor
ya había escrito y faltaba únicamente su respuesta, el control sí funcionaba. El dueño
autorizó arreglar y publicar las cinco rutas («Ok arregla lo que hay que arreglar»).

**Implementación:** `guardarDurable` escribe y relee `LS_PEND` antes de llamar a `apiSave`.
Lo usan `persistPedido` (incluidos pagos/chofer), `persistRetiro`, `guardarArqueo`, `guardarStock`
y `toggleEntregado`. Si otro envío está en vuelo, la corrección queda respaldada mientras
espera. `apiSaveAhora` respalda nuevamente la versión que realmente sale, con sello y fusiones
actuales. Sin espacio local no manda una operación desprotegida: avisa que no se envió y pide
conservar/copiar los datos antes de cerrar. Un error no vuelve a encolar una foto vieja sobre
lo que se corrigió después; el motivo del fallo se conserva en el aviso.

**Invariantes:** mismo id para reintentar; los pagos se guardan como historial de la misma fila,
no como un cobro nuevo por POST. `colaQuitarExacta` elimina solo la instantánea confirmada o
rechazada. El ok tardío, el rechazo firme y el cierre de stock/arqueo no borran la versión nueva
por compartir id u hora (dos cambios pueden ocurrir en el mismo milisegundo). Se conservan los
sellos, bases y fusiones del servidor. Los conflictos reales se avisan y el dinero rechazado
no se reaplica a ciegas. `busy` y errores temporales conservan la cola.

**Retiro nuevo corregido sin respuesta:** antes de sustituir su alta en la cola, se conserva
la prueba en `_altaPendiente`. Así se reconoce el alta propia ya escrita y se corrige con su
sello, sin duplicarla ni autorizar pisar una corrección ajena. Es metadato local: excluido del
transporte y de la comparación de contenido con la hoja.

**Pruebas finales:** `tests/test_guardado_operaciones.js`, **62/62** con HTML y Apps Script reales,
planilla ficticia en memoria y HTTP bloqueado. Contra el HTML original `92ff404`: **29 verdes /
33 rojos**. Cubre recarga antes/después de llegar al servidor, cola con versión más nueva,
dos equipos fusionando stock/arqueo, pagos en conflicto, retiro corregido antes de recibir su
alta, rechazo firme frente a `busy`, almacenamiento lleno y doble clic real sobre los botones.
El reloj está fijado en septiembre de 2026: las fechas no dependen del día de ejecución.
Regresión existente: guardado_durable41, rev30_retiros15, conflicto45, chofer_sin_senal8,
rev2_cuadre55, rev30_stock36, concurrencia44, cola16, rev3_plata18, auditoria176: **454**.
La sección histórica de concurrencia que requiere `git show` se omite en la copia QA; no se
declara validada esa compatibilidad. Total de comprobaciones ejecutadas: **516 aprobadas**.

**Alcance/publicación:** frontend, pruebas y notas; sin cambios a permisos, autenticación ni
reglas comerciales. El `.gs` continúa `2026-09-30-a`, sin nueva implementación. No se ejecutaron
operaciones reales; estas pruebas no certifican saldos reales ni ausencia de todo fallo posible.
Verificar despliegue y bytes de la página contra el commit publicado; recargar el panel.

## 4hg. 02/10: conservar el envío al recargar, proteger el pedido nuevo y decir la verdad al reintentar

El dueño autorizó corregir y publicar los tres fallos reproducidos en la auditoría de Codex.
Cambios limitados a `pedidos.html`, pruebas y documentación. Sin pedidos reales ni cambios al `.gs`.

1. **Guardado en curso**: antes había una copia optimista en pantalla, pero la cola se llenaba recién
   en el `catch`. Recargar sin respuesta perdía el pedido si aún no había llegado al servidor.
   `guardarYa` ahora conserva la fila con el MISMO id y revisión antes de `apiSave`, y comprueba
   que la copia se pudo escribir. Si el almacenamiento falla, conserva el formulario y no envía.
   La respuesta retira solo el JSON que se mandó; nunca una corrección posterior. Los rechazos
   definitivos se corrigen en el formulario, como antes. El error de red deja la copia ya encolada.
   `flushPending` saltea ids con envío en vuelo/en espera para no duplicar solicitudes. Al recargar,
   se reenvía el mismo id; si ya se guardó y solo se perdió la respuesta, aplica el «ok tardío» existente.
2. **Pedido nuevo a medio llenar**: `formNuevoHuella` compara los campos con el formulario vacío
   al terminar `resetForm`. `editPedido` y `completarBorrador` preguntan antes de reemplazarlo.
   Cancelar vuelve con los campos intactos; Aceptar descarta lo escrito y las imágenes sin pegar.
   Un formulario vacío no pregunta. Mientras se está enviando no se abre otra edición.
3. **Reintentar**: el pie llama a `misReintentarCola`, que distingue pendiente, confirmado y rechazado.
   `flushPending` devuelve el número de rechazos firmes: vaciar la cola por rechazo NO dice que llegó.

**Pruebas**: `tests/test_guardado_durable.js`, 41/41 en Chromium con página y `.gs` reales contra
planilla ficticia en memoria, `fetch` sustituido y HTTP bloqueado. Incluye recarga antes/después de
guardar, doble clic, edición y revisión, rechazo por día/cupo/OC/feriado/busy, corrección más nueva,
almacenamiento lleno, Cancelar/Aceptar, Kommo y los tres resultados del reintento.
Las pruebas aceptan `PEDIDOS` para comparar con el archivo sin arreglar y `CHROMIUM` para el navegador.
Contra `21b6070` dan 26 verdes y 15 rojos; con el arreglo, 41 verdes. Las 20 suites existentes
seleccionadas suman 615 comprobaciones verdes (656 contando las nuevas). `mispedidos` se repitió
aislada: 33/33; en paralelo había fallado una expectativa de temporización (2 consultas en vez de 1).

**Publicación**: autorizada por el dueño el 02/10. No se necesita implementar Apps Script: su versión
continúa en `2026-09-30-a`. Recargar/F5 para recibir la página nueva. La verificación del despliegue
se hace contra el commit de publicación; esta sección no afirma una prueba con pedidos de producción.

## 4hf. 01/10: «Faltan N» del cuadrito del saldo, con la cuenta escrita

> El dueño, con una captura del formulario (COLCHON SEMIORTOP 140x190, cantidad 1: «En almacén 2 · Pendientes de entrega 3 ·
> Faltan 2»): *«hay 2 en almacén, pendiente de entrega 3 y faltan 2? dice que faltan 2 porque está tomando el pedido nuevo que
> va a entrar o qué pasa con las matemáticas?»*. Respuesta: sí, cuenta el pedido nuevo (3 pendientes + 1 de este − 2 en
> almacén = 2; ya faltaba 1 antes de este pedido). Lo que confundía: `saldoNumerosHtml` no muestra «Libres» cuando da
> negativo (−1), así que no se ve que el stock ya estaba vendido de más. Propuse escribir la cuenta; el dueño: *«hazlo»*.

- **`saldoFaltanCuentaTxt(v)`** (nueva, al lado de `saldoNumerosHtml`): «Faltan 2 **(3 pendientes + 1 de este pedido − 2 en
  almacén)**». Es exactamente `v.faltan` (= `cant − libres` = `pend + cant − alm`), no otra cuenta. Con 0 pendientes se omite
  esa parte («(3 de este pedido − 1 en almacén)»); «1 pendiente» en singular. El guion es «−» con espacio a cada lado: la
  comprobación «ningún cuadrito dice un número negativo» (`/−\d/`) sigue valiendo.
- Solo texto: ninguna cuenta ni color cambia. La pregunta al guardar no cambia.
- `tests/test_saldo_almacen.js` §1: las dos comprobaciones de «Faltan» llevan la cuenta (**2 rojas contra `3606980`**, 84 en
  total); `test_rev8_saldo` (66) y `test_corte_horario` (35) siguen en verde.
- **Publicada el 01/10 a las 12:29 de Bolivia** (`main` = `3b72cab`), con Actions quieto (el panel había corrido a mano a las
  10:36). Sin tocar el servidor (sigue `2026-09-30-a`). Para verla hay que recargar la página.

## 4he. 30/09: servidor `2026-09-30-a` y la lectura con hora, comprimida y de lo cambiado — PUBLICADO: servidor ~12:40 (el dueño), página 12:46 (`3606980`)

> El dueño, a las tres propuestas del 30/09 (después de publicar §4hd): *«1 no / 2 ok lo hago. / 3 hazlo»*.
> (1) El aviso «día sin camión» NO se amplía (la limitación de la revisión de §23 queda como está). (2) El servidor nuevo lo
> implementa ÉL: sello de los retiros, feriados en el portero y una lectura que diga de cuándo es. (3) La conexión: el cartel,
> la lectura comprimida y la de lo cambiado (diseño en §4hb). (2) y (3) van en UNA sola versión del `.gs`, para implementar
> una vez. Para el dueño y para Codex: **RESPUESTA_CLAUDE.md §24**.

### El servidor `2026-09-30-a` (`google-apps-script.gs`)
- **💵 Los retiros piden sello**: `doSave` compara el `rev` también en las filas `__ret_…` (`filaRetiro`). Otro equipo lo
  corrigió después de verlo → `conflicto` con la fila actual (y SÍ va a «Rechazos»: es plata que no entró). Un retiro nuevo
  no trae sello y entra como siempre; uno sin sello sobre una fila sellada, `conflicto`, como un pedido (§4cg).
- **🚫 Feriados en el portero**: `FERIADOS_GS` (la MISMA lista que `FERIADOS` de la página: `test_servidor` §15a las
  compara, fecha y nombre) y `feriadoGs_`. `porteroFecha_` contesta `{error:'feriado', fecha, nombre}` a un pedido NUEVO o
  MOVIDO sin `forzar` (queda en «Rechazos»). Con `forzar` (Administración) se mueve igual, como a un día cerrado. Uno que
  ya estaba en el feriado se corrige en el lugar (no pasa por el portero).
  · De paso: `porteroFecha_(…, sinFreno)`. El camino FORZADO a otro día cortaba en «día cerrado»/«turno lleno» ANTES de
    asignar el N° del día y el pedido quedaba con el de su día viejo; ahora toma el del día nuevo (§15d).
- **⏱️ Las lecturas dicen de cuándo son**: `list` y `doGet` (también la copia de su caché de 20 s) traen `ahora` (reloj
  de Google, tomado ANTES de leer la hoja), `n` (filas) y `huella` (la cuenta de control). Cada guardado, borrado,
  `conflicto` y `borrado` trae `ahora` (tomado DESPUÉS de escribir y releer). El guardado bueno trae además `version`.
- **🗜️ Comprimida** (`z:1`): `listaResponder_` → `Utilities.gzip` + base64 → `{ok, version, z:'gzip64', d, largo}`, con la
  marca `zc` = «ñ🔒€» adentro. Solo si pasa de `Z_MIN` (20.000 letras) y si `zOk_()`: este Google escribe el texto en UTF-8
  (`newBlob('ñ🔒€').getBytes()` = 9 bytes). Si algo falla al comprimir, sale sin comprimir.
- **🔁 Solo lo cambiado** (`desde`): `leerCambiado_` lee DOS columnas angostas (id y Revisión: alcanzan para `n` y `huella`)
  y después solo las filas con `rev > desde − DELTA_MARGEN_MS` (5 min: un guardado que corría mientras se leía), las
  cercanas de una vez (`DELTA_HUECO`). Devuelve `{delta:true, desde, ahora, n, huella, pedidos:[cambiadas], borrados:[[id, hora]]}`.
  Va ENTERA si: más de `DELTA_MAX_FILAS` (40) cambiadas, más de `DELTA_MAX_GRUPOS` (8) lecturas, `desde` de hace más de
  48 h, o un corte anterior a lo que la memoria de borrados ya olvidó (`log.desde`).
  ⚠️ Sin candado, como toda lectura (§4dt): si se agrega o se borra una fila entre las dos columnas, la cuenta no le da al
  panel y el panel lee entera. Nunca queda una copia mal armada.
- **🗑 Los borrados se anotan** (`borradoAnotar_`, adentro del candado de `doDelete`): (1) la propiedad
  `BORRADOS_RECIENTES` = `{desde, b:[[id, hora]…], r:[…]}` (6 h, hasta 8.000 letras: se olvida lo más viejo y `desde` lo
  dice; `recientesAnotar_`), para la de lo cambiado; la lista `r` son las filas retocadas SIN sello (ver abajo); (2) la hoja
  **«Borrados»** (Fecha, Id, Cliente, Vendedor, Entrega, N° OC, Quién borró, Dispositivo, Hora) para que el dueño vea qué
  se borró y desde qué equipo (sin celular ni dirección; tope 2.000 filas). ⚠️ `hojaBorrados_` solo escribe en una hoja
  cuyos encabezados son ESOS (en las pruebas, `getSheetByName` devuelve la de pedidos para cualquier nombre).
- **📥 Los borradores de Kommo nacen sellados** (`rev = Date.now()` en `kommoProcesarObj_` y `crearBorradorDeLead_`): si no,
  la de lo cambiado no los veía llegar. `repararNombreAplicar_` sigue SIN tocar el sello, a propósito: quien ya tenía el
  borrador abierto para completarlo no choca (y no pierde lo que escribió). **Revisión**: la corrección se anota en
  `BORRADOS_RECIENTES.r` y `leerCambiado_` manda esa fila igual (con el mismo sello: el panel la toma).
- **✍️ `onEdit(e)`** (revisión, disparador simple de Google: anda apenas se GUARDA el código): una corrección A MANO en la
  hoja «Pedidos» estrena sello en esas filas (`max(sello+1, ahora)`), salvo que se haya tocado SOLO la columna Revisión, los
  encabezados o una fila sin id; y borra la caché de `doGet`. Así la de lo cambiado la ve, y un guardado con una copia de
  antes recibe `conflicto` en vez de pisarla (antes la pisaba, también con el 28-a). No toma el candado (la corrección a
  mano tampoco); un error se traga.
  El panel completa y descarta con el sello que trae la lista (`EDIT_REV`, `borrarEnServidor`): anda igual con la página
  publicada. `test_servidor` §10A cambió a conciencia: descarta con el sello, como el panel.
- **`probarAntesDeImplementar`**: 7 = la comprimida con la planilla de VERDAD (comprime, abre con `Utilities.ungzip` y
  compara el texto entero; dice cuántas veces menos pesa); 8 = los feriados por venir. Las dos AVISAN, no frenan (sin
  comprimir el panel lee como hoy). Y las funciones nuevas entran en la lista de «el código está entero».

### La página
- **`apiList(opts)`** (sección «📦 LA LECTURA…» junto a `apiPost`): pide `z:1` si hay `DecompressionStream` (iOS 16.4+,
  Chrome, Edge) y `desde` si hay copia (`LISTA_BASE`) de menos de `LISTA_COMPLETA_MS` (15 min, mirando `relojMs` Y
  `Date.now`). `listaAbrir` abre la comprimida y mira la marca: si falla, `LISTA_Z_FALLO` y se pide sin comprimir (en esa
  pestaña, de ahí en más). `listaTomarEntera` guarda la copia fila por fila (texto JSON, no los objetos: quien recibe la
  lista la toca); con ids repetidos o una cuenta que no da, sin copia (como antes). `listaAplicarDelta` aplica borrados (no
  el de una fila vuelta a crear después) y filas (no una más vieja que la de la copia) sobre una COPIA de la copia, y si la
  cuenta de control no da, `null` → se lee entera. Dos cuentas seguidas que no dan → 30 min sin pedir lo cambiado.
  A quien la pide le llega la planilla ENTERA de siempre (rearmada con `listaDeBase`), con `_pedidaN`, `_pedidaT` y
  **`_ahora`** (la hora de Google de la copia). Con el servidor 28-a no hay `ahora` ni `huella`: todo queda apagado solo.
- **`localManda(…, ahoraSrv)`**: con `_ahora` de la lectura y `okAhora` del guardado (lo anota `aplicarSello(rec, srv,
  ahora)`), una lectura POSTERIOR al guardado (`ahora ≥ okAhora + MARGEN_RELOJ_MS`, 2 s) que no trae el pedido → borrado,
  en el acto; una ANTERIOR (la copia vieja de `doGet`) → manda lo de acá. Sin esos datos, la ventana y la sospecha de
  siempre (§4gn/§4go), que siguen para el servidor de antes.
- **Retiros**: `guardarRetiroForm` manda el sello con que se abrió ✏️ (`RET_FORM.rev`) o uno guardado desde acá
  (`SAVE_REV`) — **nunca el de la lista de ahora**: si otro equipo lo corrigió mientras estaba abierto, la lista ya trae SU
  sello y mandarlo lo pisaba. `rechazoFirme` con un `conflicto` de retiro deja la versión de la planilla en `RETIROS` (no en
  los pedidos: ahí se dibujaba como una venta) y lo dice con palabras de retiro; `guardarRetiroForm` no lo tapa.
- **Feriados**: `feriado` en `RECHAZOS_FIRMES` (no se encola), `rechazoTxt`, `motivoDelServidor`, el mensaje de
  `rechazoFirme`, el formulario (revierte, marca la fecha y dice cuál feriado) y el importador de ROHO («cargalo con otra
  fecha»).
- **El cartel (§4hb)**: `motivoDeError` para un `fetch` que no llegó ya NO dice «si le pasa a todo el equipo es el servidor…
  volvé a la versión anterior» (el 29/09 hizo sospechar de lo recién publicado); dice que no llegó la respuesta de Google,
  que a veces tarda, y que se reintenta solo. `desdeCuandoLaCopia`: «Todavía no se pudo leer la planilla desde que abriste
  la página» (antes «Nunca se pudo leer… en este dispositivo») + de cuándo es la copia (`LS_LECTURA_T`, la anota `apiList`).
- `SCRIPT_VERSION_ESPERADA` = `2026-09-30-a`. `pedirClaveEquipo` llama a `apiList()` sin pasarle lo que devuelve la cola.

### La transición (se puede publicar la página ANTES de implementar el servidor, como pide el procedimiento)
- **Página nueva + servidor 28-a**: pide `z`/`desde`, el servidor los ignora: lectura entera como hoy, sin copia; `_ahora`
  no está → la ventana y la sospecha de siempre. Los retiros mandan el sello con que se abrieron: el 28-a no lo compara
  (solo `borrado`). `test_lectura_delta` §9.
- **Página vieja (`4ded824`) + servidor nuevo**: lee entera (no pide `z` ni `desde`) y guarda igual (§10). Lo que NO tiene:
  un `conflicto` de retiro lo metía en la lista de pedidos hasta la lectura siguiente, y manda el sello de la lista (o sea,
  todavía puede pisar un retiro corregido por otro). Un `feriado` en el formulario dice «❌ El servidor NO aceptó el pedido
  (feriado)» y no se encola; por `persistPedido` se encolaría, pero la página publicada ya no manda feriados sin `forzar`
  (§4gy). **Todos F5** igual.
- **Guardar el código nuevo sin implementarlo** (paso 2 del procedimiento) ya cambia los disparadores: los borradores de
  Kommo nacen sellados desde ese momento, y `onEdit` sella las correcciones a mano. Con el servidor 28-a implementado y la
  página publicada eso anda (completar y descartar mandan el sello de la lista; un guardado sobre una fila corregida a mano
  recibe `conflicto`, que la página publicada ya maneja).

### Pruebas
- `tests/test_servidor.js` §15-§20 (+46, y 1 en §10A; **24 rojas contra el `.gs` 28-a**; 323 en total) y su `Utilities` de
  mentira pasa a ser de verdad (UTF-8, gzip de Node, bytes con signo como `getBytes()`); `Borrados` en las hojas aparte del
  arnés.
- `tests/test_lectura_delta.js` (nueva, 29): el panel real contra el `.gs` real con gzip de verdad. **15 rojas contra la
  página publicada, 14 contra el `.gs` 28-a.**
- `tests/test_retiro_feriado.js` (nueva, 16): **6 rojas contra la página publicada, 5 contra el `.gs` 28-a.**
- `tests/test_lectura_vieja.js`: dos vueltas (con la hora y «sin la hora, como un servidor de antes», que quita `ahora` en el
  camino): la ventana y la sospecha se siguen probando, y el 4 con la hora prueba lo nuevo (36).
- `tests/test_codex28_flujos.js` §1: los avisos se juntan desde antes de `pasaElTiempo` (con la hora, el borrado se ve en
  la PRIMERA lectura).
- `herramientas/diagnostico_lectura.py`: hace también la lectura comprimida y la de lo cambiado, y rehace la cuenta de
  control (la misma cuenta en Python). Con el 28-a dice «el servidor no la comprimió».
- Batería (después de la revisión, `4a950cc`): **124/124 suites en verde, 4.661 comprobaciones.**

### La revisión independiente (antes de pasarle el `.gs` al dueño)
Un agente revisor con el diff de `2c36ff0`, reproduciendo cada cosa con el `.gs` y la página de verdad (scripts en el
scratchpad de la sesión: se pierden con el contenedor). Sin ALTA. Lo que encontró y lo que se hizo:
- **MEDIA (arreglada)**: lo que cambia SIN sello nuevo —el nombre que el repaso le corrige a un borrador de Kommo, y una
  corrección a mano en la hoja— la de lo cambiado no lo veía hasta la lectura entera (15 min), y un guardado con la copia de
  antes lo PISABA: la vendedora completaba el borrador como «Lead #555» y quedaba así para siempre (con el 28-a se veía en
  2 min). Arreglo: la lista `r` de `BORRADOS_RECIENTES` (el nombre) y `onEdit` (la corrección a mano). `test_servidor` §20,
  `test_lectura_delta` §11-12 (rojas contra `2c36ff0` y contra el 28-a).
- **BAJA (arreglada)**: un retiro NUEVO cuya respuesta se perdió (entró a la planilla y quedó en la cola sin sello) y que se
  corregía enseguida: la corrección iba sin sello → `conflicto` → «lo corrigió otra persona… NO se guardó» (con el 28-a
  entraba). `apiSaveAhora`: si la fila de la planilla es EXACTAMENTE el alta que espera en la cola de este dispositivo, el
  alta sale de la cola y la corrección se vuelve a mandar una vez con ese sello. `test_retiro_feriado` §3 (2 rojas contra
  `2c36ff0`).
- **BAJA (dicha, se queda)**: la página publicada contra el servidor nuevo, con un `conflicto` de retiro, lo mete un rato en
  la lista de pedidos y todavía manda el sello de la lista. Por eso **todos F5**.
- **BAJA (arreglada en parte)**: más lecturas de propiedades por cada `list`. La comprimida ya no vuelve a leer `PANEL_KEY`
  y `ADMIN_KEY` para el sobre (`listaResponder_` los copia); la de lo cambiado lee `BORRADOS_RECIENTES` (una).
- Notas: una cuenta que no da relee entera dentro del mismo tope de tiempo; dos lecturas paralelas que fallan cuentan como
  dos (la pausa de 30 min); ids repetidos apagan la de lo cambiado en silencio (el diagnóstico lo dice).
- Lo que dio bien: el `.gs` es ES5 (acorn); 6 semillas × 60 vueltas de un «fuzz» con cambios antes y después de cada lectura,
  copias viejas de `doGet` y lecturas superpuestas: cada lista que entregó la página fue igual a la foto del servidor de su
  `ahora`; las carreras entre las lecturas angostas terminan en «la cuenta no da» y lectura entera; `localManda` compara bien;
  feriados, borradores sellados y la transición, bien.

### Lo que esto NO arregla (dicho al dueño)
- Si Google tarda en CORRER el script (los 59 s del 29/09), esto no lo evita: hace que la respuesta sea chica y llegue.
- Una fila BORRADA a mano en la hoja no queda anotada: hace fallar la cuenta y el panel lee entera en el acto. (Una
  corrección a mano sí estrena sello desde la revisión: `onEdit`.)
- Una página sin F5 todavía puede pisar un retiro corregido por otro equipo (manda el sello de la lista).
- ROHO en un feriado: el importador lo dice y no lo carga; hay que cargarlo con otra fecha.

### Publicar (el dueño implementa el servidor; la página, con su OK)
0. Anotar el número de versión activa hoy (la del 28/09; «volver atrás» es a ESA y pegar la 28-a del enlace fijo a
   `4ded824…`, 1980 líneas).
1. Pegar el `.gs` nuevo del enlace fijo al commit (nunca del chat), Ctrl+S, `probarAntesDeImplementar` → «✅ Se puede
   implementar» (con la línea de la comprimida y la de los feriados).
2. Publicar la página (con el OK del dueño) → todos F5.
3. ✏️ → Nueva versión → Implementar. Verificar: 🔒 Cerrar día dice «versión 2026-09-30-a» sin la línea gris, y el
   «Diagnóstico de la lectura del panel» (Actions, a mano) muestra la comprimida y la de lo cambiado con la cuenta «da ✅».

### Publicación (30/09, mediodía)
- **Mi mensaje con el enlace fijo** (`db67076`, 2.277 líneas) salió ~12:35. El dueño mandó dos capturas: `probarAntesDeImplementar`
  todo ✅ (1.108 filas; stock 22.638/50.000 = 45 %; arqueo 0/50.000; «La lectura viaja comprimida: 908.391 letras → 259.788 (3
  veces menos)»; 14 feriados por venir) y «Administrar implementaciones» con la activa = **Versión 34 del 28/09 3:23 p. m.**
  (`2026-09-28-a`), con *«y esta era la anterior antes de implementar ahurita»*: la implementó ANTES de que yo publicara la
  página (pasos 3 y 4 al revés). Está probado que anda (`test_lectura_delta` §10: la página vieja lee entera y guarda igual).
- **La página**: 12:46, merge `3606980` (= `4ded824` + `db67076`, como las anteriores), con Actions quieto (el cron de las
  14:00 UTC del panel no había corrido). `pedidos.html` y el `.gs` de `main` iguales byte a byte a los de la rama. Pages 12:47 ✅.
- **El diagnóstico** (corrida 8, sola al subir `diagnostico_lectura.py` a `main`, 12:46-12:47): **versión `2026-09-30-a`**;
  la primera lectura 27,9 s (Google despertando) y las demás 2-3 s; entera = 910.829 bytes; **comprimida = 259.990 bytes
  (3,5 veces menos), marca bien, 1.108 filas, cuenta «da ✅»**; **de lo cambiado = 1.017 bytes, 1 fila, 0 borradas, cuenta
  «da ✅»**; `doGet` también dice la versión nueva; ningún pedido agendado para un feriado.
  ⚠️ **Yo había estimado «unas 7 veces menos»** (en el mensaje al dueño, RESPUESTA §24.1 y los comentarios de `apiList` y
  del `.gs`): es ~3,5. La ganancia grande es la de lo cambiado (1 KB en vez de 911 KB cada 2 minutos). Los comentarios de
  código se corrigen con el próximo cambio de cada archivo (el `.gs` no se toca: sería distinto del implementado).
- **El arqueo en 0**: probar mide solo «Observaciones» (donde `filaArqueo` lo guarda) y el diagnóstico la fila entera en
  JSON (496 = campos + el título «🧮 ARQUEO DEL CUADRE…»): el arqueo está vacío desde antes, no se perdió nada.
- **Volver atrás**: ✏️ a la **versión 34** Y pegar la 28-a (enlace fijo a `4ded824…`, 1980 líneas).
- Falta: todos F5; el dueño mira 🔒 Cerrar día («versión 2026-09-30-a» sin la línea gris).

## 4hd. 30/09: los 24 hallazgos de §4hc, arreglados — PUBLICADA 30/09 10:52 (`4ded824`)

> El dueño: *«hazlo todo»*, a la propuesta de arreglar primero las 5 ALTA y Multicenter, después las otras, cada una con su
> prueba, y pedirle el OK antes de publicar. Para el dueño y para Codex: **RESPUESTA_CLAUDE.md §23**.

### 💰 Plata (R2-1, A2-1, R2-4) sin apagar el freno (X-2)
- `cobradoFueraDeAcuenta(p)` (lo usa el freno «poné el saldo», `_cobAparte`): lo que «A cuenta» tiene DE MÁS sobre el anticipo
  escrito es el 2° método, se reconozca como mixto o no (§4gy A2 dejó de reconocer el del mismo método).
- **`cobradoNoMostrado(p, acuForm)`** (nueva) es la que PROPONE montos («Usar como total», «SÍ, pagado»): parte de
  `contaCobrado` (anticipo + cobros) —una venta «SÍ, pagado» tiene el pago en el anticipo con «A cuenta» 0 (§4cb)—. Con «A
  cuenta» sin tocar: lo cobrado menos el campo. Tocado: lo cobrado menos el adelanto registrado (anticipo + 2° método), y
  los otros cobros quedan (§4fr).
  ⚠️ Ni el arreglo del auditor (apagaba el freno, X-2) ni el del meta-auditor (subir el anticipo de 500 a 800 con un QR de
  1.000 aparte daba 1.500 de saldo, no 1.200) entraron tal cual.
- `submitPedido`: un adelanto registrado en DOS pagos que ya no se reconocen como mixto no se corrige desde el formulario:
  manda a Contabilidad (como el mixto de §4gh B).
- `ctaGuardarPago` (R2-4): «¿sigue siendo el 2° método?» mira el PROPIO renglón (mismo día y recibo que el anticipo, con
  monto, otro método); `mixtoEn(_antX, arr)` sin `p` daba null con dos candidatos y «A cuenta» bajaba de 1.500 a 1.000.
- `tests/test_rev30_plata.js` (17; 11 rojas contra `2207922`), con el `.gs` real.

### 📦 Formulario y stock (A4-1, X-3, R4-1, R4-2, R4-4, R4-5, A4-2, X-4, A4-3)
- **Renglón con código o precio y SIN producto**: `submitPedido` frena y lo marca (antes `getProductos` lo salteaba
  callado). ⚠️ Un renglón que YA traía el pedido (`data-de-pedido`, lo pone `editPedido` y se va si cambia el código) al
  que se le vacía el nombre se SACA, como siempre (`test_modif`). El aviso dice si falta el saldo, si no hay ningún Excel
  todavía o si el código no está en el de hoy; y al salir del campo, un código que no está en la lista, ni en ningún
  almacén, ni en el histórico se avisa.
- **Producto agotado**: `productoDeAlmacen` lo completa desde el histórico del sistema (`hist:true`, saldo 0) cuando hay
  algún Excel cargado (**`stockHayAlgunExcel`**, nueva: sin ninguno, «no está» no dice nada) y el código está en `VENTAS_HIST`.
- **La lectura que completa el código (R4-2)**: `prodCodigosDelAlmacen` toca SOLO el renglón marcado `data-alm-pend` (lo
  pone el campo del código cuando no hay saldo o no hay ningún Excel) y una sola vez; la medida solo si está vacía; sin
  Excel todavía, la marca espera la próxima lectura. Antes corría en CADA lectura sobre todo renglón sin nombre: pisaba la
  medida elegida y devolvía el producto que se había sacado.
- **Código del almacén de otra medida u otro producto (R4-1)**: `saldoCatDeCodigo` (lista de precios o almacén, no el
  histórico) en `saldoCodigoOtro`/`saldoCodigoDeEstandar`, con el código bueno (`saldoCodigosAlmDe`); `stockAsignar` no lo
  tilda ✔ ni le reserva nada y lo cuenta aparte (`tot.codOtro`, «🏷️ código de otro»).
- **Nombre del histórico (R4-4)**: `nombreSinMedida` saca el «1,5» suelto, «[Pr.]» y «- T.A.».
- **Producto fuera de la lista que se agota (R4-5, A4-2, X-4)**:
  · **`stockCodRecordar(viejo, nuevo)`** en `confirmarImportExist`: el Excel nuevo conserva los códigos viejos que la lista
    no conoce MIENTRAS algo los nombra (**`stockCodRefs`**: un pedido sin entregar o entregado hace ≤31 días, o una clave de
    `STOCK.p`/`e`/`g[..].rs`). Lo que nadie nombra se va con ese Excel: la celda de 50.000 no crece para siempre.
  · `stockInfo`: un código que el SISTEMA conoce (**`stockCodigoDelSistema`**: en `VENTAS_HIST`, no en `CODIGOS`) no se
    adivina por nombre aunque hoy no esté en ningún Excel. Uno que nadie conoce (mal tipeado, «CH1O37») sigue por nombre.
  · ⚠️ **Efecto en «Qué producir» (X-4, a conciencia)**: 37 de las 430 filas del histórico dejan de sumarse al producto de
    la lista: las medidas especiales «Med.Esp. 160X200» ya no suman al 160x190 (se fabrican a pedido, §4gk), el CARIOCA
    RIO/BAHIA ya no suma al PREMIER, el SOMIER PARRILLA NEGRO al SOMIER NEGRO, etc. El TITANIO ICE 160x190 de oct-25 pasa
    de 8 a 6. `test_producir`, `test_adm_alta` y `test_eduardo_multicenter` cambiaron sus números con el porqué escrito; el
    último compara con la publicada sacando esas filas en las DOS páginas (lo que compara es la regla de Multicenter).
- **RPT (A4-3)**: el aviso del código del almacén no pide precio.
- `tests/test_rev30_stock.js` (36; 28 rojas contra `2207922`).

### 🏬 Multicenter (R4-3, decisión del dueño del 29/09)
- `stockData`: `ek30=stockEntregaClave(p, fs)`. Los 30 días juntan los pedidos de Multicenter por FECHA DE ENTREGA, como los
  15. La ventana se sigue midiendo por fecha de venta (§4dv). `test_rev30_stock` §6.

### 🚫 Días sin camión (R1-1…R1-5, A1-1, A1-2)
- R1-3: `resetForm` propone `proximoDiaEntrega()`; el mínimo sigue en mañana.
- R1-2: **`pedidosEnDiaSinCamion()` / `sinCamionHtml()`**: bloque ámbar arriba de Revisar (Administración) y de la lista de
  carga, con 📅 Reprogramar por pedido (sin entregar, de hoy−7 a hoy+90); el final del importador de ROHO dice «el camión no
  sale» en vez de «0 de 0 · lleno».
- A1-1: «🔒 Cerrar día» con el botón «🚚 Próximo camión» (cuando mañana no tiene), y un feriado o domingo dice «no sale el
  camión», cuántos pedidos hay que pasar y cuál es el camión que sigue.
- R1-4: la vendedora que cambia SOLO el turno de un pedido en un feriado o domingo recibe «cambiale el DÍA» (Administración
  con la clave lo sigue moviendo).
- A1-2: `saldoAvisos` mide el corte contra el último día HÁBIL.
- R1-1: `atcRecogerFabDesde` cuenta 2 días hábiles (`diaHabil`).
- **R1-5 (las pruebas)**: 29 bucles en 20 pruebas buscaban «el primer día entregable» salteando solo el domingo: ahora
  también el feriado (`typeof feriadoDe==='function' && feriadoDe(f)`, para poder correrlas contra páginas viejas). Y
  `test_cuadre_alta` y `test_auditoria` restaban un mes con `setMonth(-1)` SIN fijar antes el día: el 31/10 daba el 01/10
  (septiembre no tiene 31). ⚠️ En una prueba nueva: el día primero (`setDate(15)`), el mes después. Las 20 corridas con el
  reloj en 31/10 y en 24/12: todo verde.
- `tests/test_rev30_dias.js` (21; 13 rojas contra `2207922`).

### 💵 Retiros (R2-5, R2-3, R2-2)
- R2-5: `leerCierresDeLista` reemplaza `RETIROS` y `BORRADORES` solo con la lista del SERVIDOR (al abrir, `loadMirror` le pasa
  la copia de los pedidos, que no trae retiros, y la copia de los retiros se vaciaba). `retEnCola` + «⏳ todavía no está en la
  planilla»; el aviso de duplicado mira también la cola. (Con una lectura buena, `mergePending` ya volvía a sumar los de la
  cola, §4ek.)
- R2-3: `persistRetiro` saca de la cola las versiones de ESE retiro que estaban antes de un guardado bueno (las que entran
  mientras tanto se quedan).
- R2-2: `editarRetiro` guarda el sello visto (`RET_FORM.rev`); `guardarRetiroForm` no guarda un retiro que ya no está ni en
  la lista ni en la cola (lo borraron desde otro equipo) y lo dice. El sello de `__ret_` en el `.gs` sigue pendiente.
- `tests/test_rev30_retiros.js` (15; 9 rojas contra `2207922`), con el `.gs` real y dos equipos.

### 📈 Proyección (R3-1…R3-4, A3-1)
- R3-1: en domingo o feriado la curva va SIN hora (`pryDiaHabil(hoy)`).
- R3-2: con hora, el día equivalente de cada mes cerrado se corre al último día HÁBIL (`pryCurvaF`).
- R3-3: `pryPatron` saca los feriados (`FERIADOS` + `FERIADOS_PASADOS`) del promedio por día; `prySemanaHtml` dice «los
  feriados no cuentan» y, con menos de 10 % entre el día que más y el que menos, «parejo».
- A3-1/R3-4: «P/» = «PARA», y lo que sigue a PARA es el uso; `PRY_CORTE` corta el pedazo en un servicio o un mueble del
  medio (ENTREGA, CAMAROTE, LITERA, REGALO, CAMA…); después de un accesorio «DE/PARA COLCHON», la palabra sola que sigue es
  del accesorio («FORRO DE COLCHON Y SOMIER»). Los 29 renglones del auditor dan lo esperado.
- `tests/test_rev30_proyeccion.js` (12; 8 rojas contra `2207922`).

### Batería
- `./tests/correr.sh` → **122/122 suites en verde, 4.554 comprobaciones** (revisada con `revisar_bateria.sh`, que mira todas
  las formas de falla). La primera corrida, antes de ajustar, dio 6 rojas, todas explicadas arriba: el histórico de X-4
  (`test_producir`, `test_adm_alta`, `test_eduardo_multicenter`), el texto de R3-3 (`test_proyeccion`), el freno de A4-1
  contra «vaciar el nombre para sacar» (`test_modif`, de ahí `data-de-pedido`) y el histórico sin ningún Excel
  (`test_codigo_almacen`, de ahí `stockHayAlgunExcel`).

### Publicado (30/09, 10:52 de Bolivia)
- El dueño leyó una revisión de §23 hecha con otra herramienta y dijo *«creo que ya puedes publicar»*. `main` = `4ded824`
  (merge de `72ec6cf`), Pages en verde a las 10:52. El servidor NO cambió (sigue `2026-09-28-a`). **Todos F5.**
- **La revisión de §23** (otra herramienta, sobre `72ec6cf`): corrió 8 suites en su compu (las 5 nuevas, `test_modif`,
  `test_codigo_almacen`, `test_proyeccion`): 278/0. Marcó una limitación, por inspección:
  · `pedidosEnDiaSinCamion` mira de hoy−7 a hoy+90: un pedido pendiente en un domingo o feriado de hace 8 días o más no
    entra en el aviso (sigue entre los atrasados); y `sinCamionHtml` pone botón solo a los primeros 15. Propone todos los
    pendientes atrasados y «Ver todos». **Pendiente, a decisión del dueño.**
  · Repite como pendientes del servidor: el sello de `__ret_`, los feriados en el portero y una lectura que diga de cuándo es.
- **El diagnóstico de la lectura** corrió solo con el merge (sus archivos entraron a `main`): servidor `2026-09-28-a`, 1.099
  filas, 903.589 bytes sin comprimir; la primera lectura tardó **29,3 s** y las siguientes 2-4 s (Google lento a ratos, como
  el 29/09, §4hb); **`__stock__` = 25.437 letras (51 % de las 50.000; el 28/09 eran 22.642)**; ningún pedido agendado para un
  feriado de acá en adelante (14 feriados por venir).
  ⚠️ `stockCodRecordar` suma códigos viejos a `cod` mientras algo los nombre: poco, pero la celda crece. La poda de
  `STOCK.p` recibidos sigue pendiente (§4ga).

### Lo que queda
- Próxima versión del `.gs` (decide el dueño): el portero con los feriados, el sello de `__ret_`, una lectura que diga de
  cuándo es, feriados «puente» cargables (M1, M5, M8).
- El aviso de pedidos en un día sin camión: todos los pendientes atrasados y «Ver todos» (la revisión de §23).
- M3-M8 y las otras BAJA de §20.3. X-1 se va con R2-1/A2-1 (el formulario ya no infla ventas).
- Lo del 30/09 que el dueño dejó para verlo con calma (§4hb): cartel de conexión, lectura comprimida, lectura de lo cambiado.

## 4hc. 29-30/09, noche: revisión en TRES niveles de lo publicado el 29/09 — 24 hallazgos (arreglados en §4hd)

> El dueño: *«Quiero agentes que revisen todo lo de hoy, y otros agentes que revisen a los agentes y esos agentes revisen a
> los agentes»*. Informe completo (lista, dónde, arreglo propuesto, cruces, mejoras) en **RESPUESTA_CLAUDE.md §22**.

- **Cómo**: un Workflow (`wf_b5dff79d-15b`, 9 agentes, ~2,6 h, 4,4 M tokens, 901 herramientas): 4 revisores por área (días ·
  plata · proyección · formulario y stock) → un auditor por revisor que reproduce cada hallazgo y busca lo que se escapó →
  un meta-auditor que re-verifica lo ALTA/MEDIA, busca cruces y arma la lista. Alcance `6146f6d..2207922`. Scripts en el
  scratchpad de la sesión (`rev30/r1-dias` … `rev30/meta`): **se pierden con el contenedor**; lo que se arregle tiene que
  llevar su prueba al repo.
- **Números**: nivel 1, 19 hallazgos; nivel 2, 19/19 confirmados (6 con otra severidad) + 7 nuevos; nivel 3, 4 cruces y la
  lista final de **24: 5 ALTA, 7 MEDIA, 12 BAJA** (13 del 29/09, 11 previos). Yo re-corrí las 5 ALTA: se reproducen.
- **Las ALTA**:
  · **R2-1 (regresión del 29/09, §4gy A2)**: `mixtoEn` ya no reconoce un 2° pago del MISMO método que el anticipo, pero
    `p.acuenta` lo sigue sumando → `cobradoFueraDeAcuenta` lo cuenta afuera y «SÍ, pagado»/«Usar como total» proponen ±500
    (3.000 → 3.500). Con `6146f6d` daba 3.000.
  · **A2-1 (previo)**: venta cargada «SÍ, pagado» (`acuenta` 0, §4cb) a la que se agrega algo: «Usar como total» pone de
    saldo el total entero y se guarda 2.500 + 2.800 = 5.300.
  · **A4-1 + X-3 (§4ha)**: un renglón con SOLO el código (sin saldo cargado, o producto agotado que ya no está en el Excel)
    se descarta al guardar (`getProductos` saltea sin nombre), y a veces la pregunta del saldo lo nombra igual.
  · **R4-1 (previo, §4ha lo volvió habitual)**: código del almacén en un renglón de otra medida → ✅ con el stock del
    producto del código, sin el aviso de §4gk (`saldoCodigoOtro` solo mira `CODIGOS`), y el pedido aparta el otro.
  · **R4-5 + A4-2 + X-4 (previo, §4ga-6)**: producto fuera de la lista que se agota → el Excel nuevo pisa `cod`, `stockInfo`
    cae en el parecido, `stockMigrar` reescribe `STOCK.p`/`e`/`rs` al parecido y la llegada suma al otro.
- **Decidido por el dueño esa noche**: Multicenter «el mismo día» = FECHA DE ENTREGA (R4-3; `00b0c68`).
- **Comprobado esa noche** (herramienta de §4hb, 00:57): ningún pedido agendado para un feriado de acá en adelante.
- **Lo que no se hizo a propósito**: no se tocó `pedidos.html` mientras los agentes lo revisaban; nada se arregla ni se
  publica sin el OK del dueño. Orden propuesto en RESPUESTA §22.7.

## 4hb. 29/09, noche: «no conecta» — no era el panel ni el servidor: Google entregando lento a ratos, y la planilla que viaja entera

> NADA publicado ni cambiado en el panel ni en el servidor. En la rama quedó una herramienta de diagnóstico
> (`herramientas/diagnostico_lectura.py` + `.github/workflows/diagnostico-lectura.yml`, commits `375a3e7`…`1013226`).

**Qué pasó.** A las 22:21 el iPad del dueño quedó en «⏳ Conectando con la planilla del equipo… 17 s» y a las 22:26 el
cartel rojo decía «no hay conexión con Google (sin internet, o esta red o un bloqueador…)», con «Nunca se pudo leer la
planilla en este dispositivo». El dueño lo atribuyó a §4ha (publicada 17:19) y recordó que Carola tampoco conectaba.
Conectó solo ~22:35-22:40.

**Lo que se midió (y descarta el código):**
- **La página no se traba**: con 1.300 pedidos inventados, `6146f6d`, `f722163` y `2207922` procesan la lectura en
  20-66 ms (con la CPU 6 veces más lenta, 160-370 ms), sin errores (`scratchpad/diag_conexion/perf.js`). Ningún commit del
  29/09 tocó `apiPost`/`apiList`/`fetch`/`cargaInicial`. `ULTIMO_REFRESCO` vive en memoria: «Nunca se pudo leer la planilla
  en este dispositivo» quiere decir «desde que se abrió la página», no «nunca» (texto engañoso, anotado como mejora).
- **El cartel era de red de verdad**: «no hay conexión» sale solo si el mensaje del error es `Failed to fetch`/`Load
  failed`/`NetworkError`/`network`/`aborted`, o sea `fetch` rechazado; un error del panel al procesar diría «error: …».
- **Lo de Carola fue ANTES de §4ha**: el mensaje del dueño llegó a las 17:05 y §4ha se publicó a las 17:19.
- **El servidor contestaba**: respaldo de Kommo 173 (19:46) y 174 (22:27) con «versión 2026-09-28-a»; las Ejecuciones que
  mandó el dueño (22:25-22:27) todas «Completada» en 1,4-3,6 s. Pero el respaldo usa `kommoLeads`, que el `.gs` atiende
  ANTES que todo: no prueba que `list` ande. Por eso la herramienta nueva.
- **La herramienta** (corre en GitHub al pushear sus archivos; en `main`, también a mano): hace la MISMA lectura que el
  navegador (`POST {action:'list', quien, dispositivo, cola, colaIds}` a la dirección escrita en `pedidos.html`, con
  `?_=<ms>`, texto plano, `Origin` de github.io) y dice código, tiempo, tamaño, CORS, filas y el tamaño de las filas del
  sistema — sin imprimir un solo dato de clientes (el registro es público). Resultados:
  · 22:31 y 22:34: HTTP 200 en 1,9-2,7 s, JSON, `Access-Control-Allow-Origin: *`, 1.096 filas, **901.361 bytes**, versión
    28-a; `__stock__` 25.437 letras; la fila más grande de un pedido, 3.157. La dirección de `pedidos.html` y el secreto
    `PANEL_URL` son LA MISMA.
  · 22:36: la misma lectura tardó **9,7 s** y la siguiente **59,0 s** (también desde GitHub): Google lento a ratos, no la
    red del dueño.
  · **Google NO comprime** la respuesta aunque se pida `Accept-Encoding: gzip`: viajan los 901.361 bytes enteros.
  · 22:39, en dos tramos, 5 veces: correr el script 1,7-3,7 s · entregar los datos 0,2-0,4 s.
- A las 22:45 el dueño abrió la dirección del `/exec` en incógnito y el iPad recibió la planilla entera.

**Conclusión.** Ni el panel ni el `.gs`: a ratos Google tarda mucho en contestar (o en entregar), y cada equipo baja la
planilla ENTERA (900 KB sin comprimir) cada 2 minutos (`AUTO_MS`), así que cuando Google se traba lo grande es lo que no
llega. Mientras tanto no se pierde nada: los guardados son chicos y la cola reintenta.

**Propuesto al dueño (lo ve el 30/09; no se tocó nada):**
1. **El cartel**: que no diga «si le pasa a todo el equipo es el servidor… volvé a la versión anterior» cuando el servidor
   anda (esta noche hizo sospechar de lo publicado), y que «Nunca se pudo leer» diga «desde que abriste la página». Solo
   página.
2. **La lectura comprimida**: `list` con `z:1` → el `.gs` devuelve `Utilities.gzip` + base64 y la página descomprime con
   `DecompressionStream` (iOS 16.4+; sin eso, pide como hoy). ~7 veces menos. Exige versión nueva del `.gs`.
3. **La lectura de lo cambiado** (el dueño preguntó cómo sería y cómo se sabría que llegó todo):
   · el sello `rev` ya es la hora del servidor de cada guardado (`doSave`: `max(rev+1, Date.now())`); `list` con `desde`
     devuelve las filas con `rev > desde − 5 min` (margen por un guardado que corre durante la lectura: la lectura no toma
     el candado) + `ahora` (hora del servidor);
   · **los caminos que escriben SIN sello** hoy: los borradores de Kommo (`appendRow(recToRow(...))`, líneas ~1785 y
     ~1906) y `repararNombreAplicar_` (`setValue` del Cliente, ~1874) — hay que sellarlos; la herramienta de agosto ya
     sella;
   · **los borrados**: `doDelete` hace `deleteRow` y no deja rastro → hoja «Borrados» (id + hora, 30 días);
   · **la cuenta de control**: el servidor manda cuántas filas hay y un número hecho con todos los `id:rev` (módulo, no
     una suma: pasaría 2^53); la página la rehace con su copia y, si no coincide, lee todo;
   · lectura completa al abrir y cada 15 minutos (una edición a mano en la hoja no cambia el sello);
   · con la hoja de Borrados, «lo borraron desde otro equipo» deja de deducirse de una ausencia (§4gl/§4gn/§4go);
   · la página lo usa solo si el servidor contesta `ahora`/huella: se puede publicar antes que el `.gs`.
   Sugerido: 2 primero; 1 y 3 juntas en UNA versión del `.gs`. Límite dicho al dueño: si Google tarda en CORRER el script
   (los 59 s), esto no lo arregla; hace que la respuesta sea chica y llegue.

## 4ha. 29/09, tarde: un código que no está en la lista de precios pero sí en el almacén — PUBLICADA 29/09 17:19 (`2207922`)

> **Publicada el 29/09 a las 17:19 de Bolivia** (`main` = `2207922`), con el OK del dueño (*«publicá lo que había
> pendiente»*). No había ninguna corrida en curso ni en cola: la programada de las 17:00 todavía no había arrancado.
> Pages desplegó bien a las 17:20 (corrida 36632546483). Batería sobre `4b194bd`: 117 suites, 4.453 bien · 0 mal.

**El pedido**, con una captura del celular (código «Ch1158», sin producto ni medida, y sin cuadrito): *«¿Qué pasa si ponen
un código que no está en lista de precios y sí en almacén? Ejemplo: puse ese código que no está en lista de precio pero sí
en almacén; no se autocompleta ni marca disponible.»* Ch1158 = SOMIER PLATA 200X200: está en el histórico del sistema y en
el Excel del almacén, pero no en `CODIGOS`.

**Por qué no andaba.**
1. El renglón solo se completaba con `CODIGOS`. Sin producto ni medida no estaba «completo», así que no había cuadrito.
2. Un bug de fondo: el índice de códigos del almacén (`stockIndiceApretado`, §4cv) quedaba armado con el stock VIEJO
   después de una lectura. `leerStock` lo olvidaba ANTES de migrar, y la migración lo volvía a armar con el `STOCK`
   global, que todavía era el anterior. Se arreglaba solo con la lectura siguiente (1-2 minutos), pero:
   - en un equipo que recién abre el panel, los primeros minutos buscaba códigos en la copia vieja o en nada;
   - un Excel recién subido no se encontraba por código hasta la otra lectura.

**Lo que se hizo.**
- **`productoDeAlmacen(code)`**: para un código que `CODIGOS` no tiene y el índice del almacén sí, devuelve `{d, m, k}`.
  - La medida sale de la clave del Excel.
  - El nombre sale del histórico del sistema (`VENTAS_HIST`, sin la medida: `nombreSinMedida`) si ese código está ahí y
    dice lo mismo que la clave. Si no, sale de la clave: «SOMIER PLATA», «ALMOHADA HEAVEN CELESTE».
- **Al escribir el código** (también en minúscula), el renglón se completa como con la lista de precios, y un aviso dice:
  «📦 CH1158 no está en la lista de precios, pero sí en el almacén: SOMIER PLATA 200x200. Poné el precio a mano.» El
  precio queda vacío.
- **Completo** (`saldoFilasForm`) acepta un producto del almacén sin medida, como un código del catálogo sin medida.
- **`saldoMedidaEspecial`**: una medida que no es de la lista (150x200) no es 📐 si el código es de ese producto del
  almacén en esa medida.
- **`prodCodigosDelAlmacen()`** en `saldoTrasLectura`: un renglón con el código escrito antes de que llegara el saldo
  (equipo sin copia) se completa cuando llega la lectura, si todavía no tiene nombre.
- **El índice es del stock de ahora**: `stockIndiceApretado` se rehace cuando `STOCK` es otro objeto (`_de`), y
  `ventasHistIndex` también (`VENTAS_HIST_DE`). Cubre todas las formas de asignar el stock (lectura, junta, pestaña).
- Lo de siempre no cambia:
  - un código de la lista de precios completa como antes;
  - un código que no está en ningún lado no hace nada;
  - la identidad sigue siendo por código (§4cv): el pedido guardado con «Ch1158» cuenta como pendiente de ESE producto
    del almacén.

**Prueba:** `tests/test_codigo_almacen.js` (13 comprobaciones; 9 fallan contra `f722163`): PTF, Moreno, sin medida,
150x200, guardar, la lectura tardía y el índice después de un Excel nuevo (CA9). **Batería: 117 suites, 4.453 bien · 0 mal.**

## 4gz. 29/09, mañana: el cuadrito dice «PTF», no «acá» — PUBLICADA 29/09 11:43 (`f722163`)

> **Publicada el 29/09 a las 11:43 de Bolivia** (`main` = `f722163`), con el OK del dueño (*«hazlo»*). No había ninguna
> corrida en curso ni en cola, y Pages desplegó bien a las 11:44 (corrida 36592415702). Pruebas del cuadrito:
> `test_saldo_almacen` (84), `test_rev8_saldo` (66) y `test_corte_horario` (35), todas en verde. Son las tres que leen
> el cuadrito.

**El pedido**, con una captura del cuadrito («acá 6 · Banzer 3 · Moreno 0»): *«dice acá; los vendedores al meter sus
pedidos no están en "acá", están en sus tiendas: debería decirles PTF (productos terminados fábrica). Banzer y Moreno están
ok.»*
- `saldoDetalleTxt` dice **«PTF 6 · Banzer 3 · Moreno 0»** («PTF sin contar» si no hay conteo). El renglón lleva un `title`
  con «PTF = productos terminados fábrica (de ahí salen los camiones)».
- Solo el cuadrito del formulario, que es lo que ven los vendedores. La pantalla de stock de logística sigue diciendo
  «acá en fábrica»: es el mismo depósito.
- `test_saldo_almacen` espera «PTF 4 · Banzer 2 · Moreno 0» y que no quede ningún «acá N».

## 4gy. 29/09: los arreglos de la revisión de §4gx — feriados, el mixto falso, «a esta altura» a la misma hora y el retiro borrado — PUBLICADA 29/09 10:02 (`72aa862`)

> **Publicada el 29/09 a las 10:02 de Bolivia** (`main` = `72aa862`), con Multicenter (una entrega por día, abajo). OK del
> dueño: *«publicas»*. Sin tocar el servidor (sigue el `.gs` 2026-09-28-a). No había ninguna corrida en curso ni en cola.
> Pages desplegó bien a las 10:03 (corrida 36579653220). **Batería sobre `34ecbab`: 116 suites, 4.440 bien · 0 mal.**
> ⚠️ Todos tienen que apretar F5: una página vieja no sabe de feriados, y el servidor tampoco (ver A1).

**Las respuestas del dueño** a las preguntas de §4gx:
- *«No sale en feriados, arreglá el 2, 3 y 4»*. O sea A1 (el camión no sale en feriados), A2, A3 y A4.
- *«Si 6 y 7 fue feriado»*: el 06/08 y el 07/08/2026 fueron feriado.
- Logística NO sube el Excel de Moreno después de cargar la camioneta: M2 no pasa en la práctica. No se tocó.
- Multicenter: *«solo en mi panel»*. No contesta si se carga en uno o en varios pedidos; no se tocó nada.
- Nada se publica sin su OK.

### A1 · El camión no sale en feriados
- **`feriadoDe(f)`** (al lado de `limTurno`): el nombre del feriado o `''`. Lee `FERIADOS` con `typeof`, porque la lista está
  más abajo en la página.
- **`limTurno` da 0** en feriado, como el domingo. Con eso el cupo, el cuadrito (`saldoDiaConCupo`, que además lo saltea
  explícito) y el portero del panel dicen lo mismo.
- **`proximoDiaEntrega()` saltea domingos Y feriados** (tope de 30 días). El jueves 24/12 el «mañana» del chofer, la carga,
  la ruta, el mapa, el WhatsApp y los cupos del encabezado son los del sábado 26/12.
- **El formulario**, con las mismas reglas que el domingo:
  - un pedido NUEVO para un feriado no se guarda: «🚫 El 25/12/2026 es FERIADO (Navidad): no hay entregas. Elegí otra fecha.»;
  - una vendedora que MUEVE un pedido a un feriado, tampoco;
  - uno que YA estaba en un feriado (cargado por una página vieja) se sigue pudiendo corregir sin mover la fecha;
  - Administración sí lo mueve, con `forzar` (`_forzar` incluye `feriadoDe`).
- **Los carteles lo dicen**: cupos del formulario (`renderCupoForm`), cupo de Administración, semana de ocupación
  («🚫 Feriado — Navidad», con «—» en vez de «0/0»), avisos de 📅 Reprogramar (`reproAvisos`, que también usa la devolución
  de una ATC), el texto de cupos de la devolución, el cambio de turno de un pedido que quedó en un feriado
  (`cambiarTurno`: «reprogramalo») y los avisos del importador de ROHO (sus fechas vienen de su Excel).
- ⚠️ **El portero del `.gs` (`porteroFecha_`) NO conoce los feriados.** Una página vieja, sin F5, todavía puede guardar
  una entrega en feriado. Queda para la próxima versión del servidor.
- ⚠️ **`FERIADOS` sigue siendo solo para adelante** (desde el 02/11/2026). Los que ya pasaron van aparte (ver abajo).

### A2 · «↩️ Era un pago de la venta» ya no fabrica un pago mixto
- **`mixtoMismoMetodo(c, a)`**: el 2° método del mixto nunca es el mismo método que el anticipo (ni el mismo banco, si es
  QR). Es la misma regla con la que el formulario frena («El segundo método es igual al primero»). El flete que
  `_cobrarAhora` cobra junto con la venta lleva el MISMO método, día y recibo, así que ya no se confunde.
- **`mixtoEn` con varios candidatos** del mismo día y recibo: vale el que CIERRA el «A cuenta» con el anticipo, como lo
  escribe el formulario. Antes, con dos, devolvía `null` y un mixto de verdad dejaba de reconocerse (y «SÍ, pagado»
  proponía 3.500 para una venta de 3.000). En una venta «SÍ, pagado» (A cuenta 0, §4cb) no hay con qué elegir: vale
  solo si es uno.
- ⚠️ **Queda una ambigüedad, a propósito:** en una «SÍ, pagado», un pago de OTRO método del mismo día y recibo se lee
  como el 2° método. No se distingue de un mixto de verdad, y los montos igual cierran (es plata que entró ese día con
  ese recibo). No se agregó el aviso en `ctaEnvioAPago` que proponía §20: con la regla nueva, los casos del informe ya
  no cambian el mixto.
- Si algún día hace falta que no se adivine más, la salida es marcar el 2° método en el propio renglón (una letra, como
  el `^` del flete). Se lo pregunté a Codex en §20.5.

### A3 · «A esta altura» y la curva, a la misma hora
- `pryVentas` guarda `m`: los minutos del día en Bolivia en que se cargó la venta (`pryMinBo(ts)`, UTC−4 fija como
  `isoDeTsBolivia`; sin `ts`, al final del día).
- **`pryCargadaAl(x, d, min)`**: ¿estaba cargada el día `d` a los `min` minutos? Sin `min`, el día entero.
- `pryAcum(V, ym, dia, min)` y `pryCurvaF(c, r, min)` cortan el otro mes (o la historia) al mismo día Y a la misma hora
  de ahora. Antes el otro mes entraba con el día entero: el mismo mes daba «1 % arriba» a las 09:30 y «7 % arriba» a las
  20:00.
- La prueba (🧪 `pryPrueba`) sigue con días enteros: ahí los dos lados son días ya cerrados.
- Si el otro mes era más corto (febrero contra un 30), entra entero y el texto lo dice («tenía 28 días y a esta altura ya
  había cerrado»).
- El texto de arriba: «…cargado hasta ahora, contra lo que tenía septiembre de 2026 al día 14 a las 15:00.»

### A4 · Un retiro borrado desde otro equipo ya no vuelve
- `guardarRetiroForm`, al CORREGIR un retiro, manda el sello con el que se vio (`rev` de la lista o `SAVE_REV`, el mayor).
  Con la 28-a, si otro equipo lo borró, el servidor contesta `borrado` y no lo vuelve a crear. Lo mismo desde la cola de
  un celular sin señal.
- Ante `borrado`, el retiro sale de la lista de ese equipo (deja de restar en su cuadre) y el aviso dice que la
  corrección NO se guardó y que lo confirme con administración antes de cargarlo de nuevo.
- ⚠️ **Lo que NO arregla:** dos equipos corrigiendo el MISMO retiro a la vez. Gana el último, porque el `.gs` no compara
  el sello de las filas `__ret_…` (`filaSistema` las deja afuera del control). Queda para la próxima versión del servidor.

### Los feriados que ya pasaron, para la proyección
- **`FERIADOS_PASADOS`** = 06/08 (Independencia), 07/08 (puente, confirmado por el dueño) y 25/09 (Santa Cruz, nadie trabajó).
- **`pryDiaHabil(f)`** = `diaHabil` y no está en esa lista. La usan SOLO `pryHabiles`, `pryAlDia` y `pryPatron`: agosto tuvo
  24 días hábiles, septiembre 25 y octubre 27.
- No van en `FERIADOS` a propósito. Lo probé y se rompían `test_rev8_saldo`, `test_saldo_almacen` y 31 de
  `test_proyeccion`: las entregas no miran atrás y esas pruebas clavan el reloj en esos días. En `test_proyeccion`, las
  secciones hechas a mano con días hábiles vacían `FERIADOS_PASADOS` en su `PREPARAR`, y §18 prueba la lista de verdad.

### Unidades (la BAJA que era regresión mía de §4gv)
- **`PRY_SIN`** saca «S/SOMIER», «SIN SOMIER», «S/ COLCHON» antes de partir el renglón en pedazos. El «/» lo partía y
  el pedazo «SOMIER» sumaba un somier que no hay.
- `PRY_ES_SOMIER` acepta «SOMMIER» y «BOX SPRING».
- `PRY_NO_UNIDAD` suma servicios, muebles y errores de tipeo: TRASLADO, MANO DE OBRA, ENTREGA, RECARGO, CAMAROTE, LITERA,
  CATRE, NORDICO, CAJONERA, PLATAFORMA, ESPALDAR, RUEDA, DORMITORIO, ALMOADA, ALM, PROTETOR.
- Se dejaron como estaban, porque son ambiguos: BASE, BASE CAMA, PILLOW TOP, «COMBO COLCHON + ALMOHADA» (la regla del
  dueño es combo = colchón + somier) y CUNA sola.

### Pruebas
- `tests/test_rev29_dias.js` (26; 21 rojas contra `040e1df`): cupos y «mañana» en feriado, los seis cuadritos (Navidad,
  Año Nuevo, Todos Santos tras un domingo, Carnaval 2027), el formulario (nuevo, mover, corregir uno que ya estaba,
  Administración con `forzar`), los carteles y el cambio de turno.
- `tests/test_rev29_pedidos.js` (25; 15 rojas contra `040e1df`): A2 de punta a punta con el formulario, Contabilidad y el
  `.gs` real; las cuentas del mixto con la página sola; y A4 con dos equipos, la cola y dos correcciones seguidas.
- `tests/test_proyeccion.js` (126; 8 rojas contra `040e1df`): unidades con «S/SOMIER», A3 a la misma hora y §18 de los
  días hábiles.
- Las pruebas de los agentes (`rev29/…` en el scratchpad) dan todo en verde con el arreglo.
- **Batería sobre `f69931b`: 116 suites, 4.434 bien · 0 mal.** Después se agregaron los textos de `cambiarTurno` y ROHO, y
  se volvieron a correr `test_rev29_dias` (26), `test_roho` (90), `test_cupos` (23), `test_medias` (24) y `test_sabado` (14): en verde.

### 🏬 Multicenter: varios pedidos el mismo día son UNA entrega (dueño, 29/09, tarde)
El dueño contestó la pregunta de §20.4: *«Multicenter hace pedidos y todos son a su bodega, pero hace pedidos por unidades:
a veces hasta 4 pedidos en el mismo día para su bodega.»*
- **El problema:** la rotación cuenta entregas distintas (§4dj), y contaba una por PEDIDO (`p.id`). Una sola compra de
  Multicenter partida en 4 pedidos del mismo día pasaba el umbral de 3 y armaba un ritmo que no existe.
  - Ejemplo: 4 pedidos de 2 el mismo día y 2 en depósito. Antes daba rotación media y «pedir 3».
  - Ahora es una entrega: rotación baja, no pide nada.
- **`stockEntregaClave(p, f)`**: para Eduardo → Multicenter la clave de la entrega es la FECHA (`'mc|'+f`); para todo lo
  demás, el pedido. La usan `nVentasRotacion` y `nVentas` (15 días, por fecha de salida) y `n30` (30 días, por fecha de
  venta). Las unidades se suman igual.
  ⚠️ **Decidido por el dueño el 29/09 a la noche: «el mismo día» es la FECHA DE ENTREGA** (*«cuando se entrega es la fecha
  que yo coloco de entrega, a veces cargo el pedido el mismo día para entregar ese mismo día — recuerda que yo y logística
  solo pueden hacer eso, agendar para el mismo día»*). La revisión del 29/09 (R4-3) vio que `n30` junta por `fv` (fecha de
  VENTA): los mismos pedidos daban 1 entrega en los 15 días y 3-4 en los 30. Falta: `ek30 = stockEntregaClave(p, fs)` (la
  ventana de 30 días se sigue midiendo por `fv`, §4dv). No se tocó `pedidos.html` mientras los agentes lo revisaban.
- **Lo que NO cambia:**
  - los umbrales;
  - las dos mitades de la regla de §4dj;
  - lo del equipo: tres clientes el mismo día siguen siendo tres entregas;
  - los mismos pedidos de Multicenter en tres días distintos siguen siendo tres entregas.
- Prueba: `test_eduardo_multicenter.js` §8 (40; 4 rojas contra `040e1df`).

### Lo que sigue pendiente de §4gx
M1 y M3-M8, y las otras BAJA (RESPUESTA §20.3). Nada de eso se tocó.

## 4gx. 29/09, madrugada: revisión con cuatro agentes de lo hecho el 28 y 29/09 — NADA ARREGLADO TODAVÍA

**El pedido.** *«Agente a revisar todo lo que hicimos ayer y hoy en stock, pedidos, días y proyección. Me das el informe
para Codex cuando terminen»*.

**Cómo.** Cuatro agentes en paralelo (stock, pedidos, días, proyección), solo lectura, con escenarios propios con datos
inventados: el panel real en Chromium y el `.gs` real en Node. Los scripts quedaron en el scratchpad de la sesión, fuera
del repo. Volví a correr los reproductores de los hallazgos ALTA y de los MEDIA principales, y dan lo que dicen. Todas
las pruebas existentes de las cuatro áreas pasan.

**El informe completo, con dónde, cómo se reproduce y el arreglo propuesto, es `RESPUESTA_CLAUDE.md` §20.** En corto:
- **ALTA:**
  - **A1:** el cuadrito promete entregas en feriados (25/12, 01/01, 02/11, Carnaval): `saldoDiaConCupo` no mira
    `FERIADOS`.
  - **A2:** «↩️ Era un pago de la venta» fabrica un pago mixto falso cuando el flete se cobró en el mismo formulario
    (mismo día y recibo que el pago). Después no se puede corregir ni la dirección, y seguir el aviso muda la plata de
    día o infla el total.
  - **A3:** «A esta altura» y la curva comparan lo cargado hasta ahora con el día entero del otro mes. El % cambia con
    la hora a la que se mira: 1 % a las 09:30 y 7 % a las 20:00; el día 2, de 2 % a 25 %.
  - **A4 (previo):** un retiro borrado vuelve a la planilla cuando otro equipo lo corrige, porque los retiros se mandan
    sin `rev`.
- **MEDIA:**
  - **M1:** falso «lo borraron» en `submitPedido` con la copia vieja de `doGet`.
  - **M2:** el Excel de Moreno subido después de cargar la camioneta deja al cuadrito en «NO HAY».
  - **M3:** ⏳/🏭 cuentan las 48 h desde un día no hábil.
  - **M4:** una recogida programada en domingo o feriado se toma tal cual.
  - **M5:** `FERIADOS` se acaba en 2027 sin aviso.
  - **M6:** una marca sin ventas en el mes proyecta y la lista no cierra.
  - **M7:** la hora de corte usa el reloj del dispositivo.
  - **M8 (previo):** «Pedido eliminado ✓» sin borrar, con la copia vieja.
- **BAJA:** unidades mal contadas en textos raros, entre ellos «S/SOMIER», que suma un somier por el «/» de
  `PRY_PEDAZOS`: regresión mía de §4gv. Además: días 29-31 contra febrero, textos, y el repintado que cierra «Semana por
  semana».
- **Fuera de lo revisado:** la contraseña de Administración por defecto está escrita en un comentario de `pedidos.html`
  (repo público). No se repite en ningún informe.

**Preguntas al dueño:**
- ¿Sale el camión en feriados?
- ¿Multicenter se carga por sucursal (varios pedidos el mismo día)?
- ¿Logística sube el Excel de Moreno después de cargar?
- ¿El 07/08/2026 fue feriado (viernes puente del DS 5521)?
- ¿En qué orden quiere los arreglos?

## 4gw. 29/09: Contabilidad → Ventas, las fichas de Sueña y Heaven — PUBLICADA 29/09 01:10 (`040e1df`)

> **Publicada el 29/09 a las 01:10 de Bolivia** (`main` = `040e1df`), junto con §4gv. Sin tocar el servidor (sigue el
> `.gs` 2026-09-28-a). No había ninguna corrida en curso ni en cola. El OK del dueño, después de ver las capturas: *«ok,
> lo publicás cuando acabes y me avisás»*. **Batería sobre `644e2ab`: 114 suites, 4.376 bien · 0 mal.**

**El pedido.** Con una captura de Ventas → 🚚 Entrega agendada → agosto: *«adicional, ahí falta la ficha de Sueña y de
Heaven, sus montos, que se ajuste si se elige ingreso o entrega agendada»*.

**Lo hecho (`pedidos.html`):**
- **`renderContaMarcas`**, llamada desde `renderContaMetrics`: una caja nueva `#cta-marcas` debajo de las cuatro fichas
  de siempre, con **lo vendido de cada marca** (`ventaTotal`, `marcaDe`).
- Sale de la **MISMA lista** que «Vendido en el período» (`contaLista`): el mismo corte (📝 ingreso o 🚚 entrega agendada),
  el período (día, mes, todo), el vendedor y la búsqueda. Las marcas + «⚠️ Sin marca» suman lo de arriba.
- Cada ficha: «N ventas · U unidades · X% de lo vendido» (unidades = colchones y somieres, §4gv).
  - Con una vendedora elegida, solo la de su marca y sin el %.
  - «Sin marca» solo si hay algún vendedor que no está en ninguna.
  - En 🏭 Mayoristas no hay fichas de marca (la caja queda vacía y se esconde).
- **Del mismo ancho y alineadas con las de arriba**: `acomodarFichas` acepta `data-como="cta-metrics"` y copia las
  columnas de esa caja. A 1180 px Sueña va debajo de «Vendido en el período» y Heaven de «Ya ingresó»; a 820, dos por
  fila; en el celular, una.
- **Un monto que no entra se achica** (`fichasMontoEntero`, en `acomodarFichas`, para TODAS las cajas de fichas): con
  ventas inventadas de más de un millón, «Bs 1.101.680,00» salía «Bs 1.101.68…» en el iPad acostado (fichas de 261 px).
  Se achica la letra solo del que no entra (hasta 10 pasos de 8 %); los demás quedan igual.
- Por entrega agendada da los mismos números que la pestaña 📈 Proyección (`test_ventas_marcas` §6).

**Pruebas:** `tests/test_ventas_marcas.js` (22, nuevo): ingreso contra entrega (la venta cargada en agosto que se entrega
en septiembre, la de septiembre que se entrega en octubre, la venta de tienda), la suma en seis cortes, vendedora y
búsqueda, Mayoristas, Proyección, y el ancho a 1180/820/390 con un mes de Bs 1.255.567,89. Contra lo publicado
(`a904137`): 4 bien · 18 mal.

## 4gv. 29/09, madrugada: «A esta altura» contra otro mes al mismo día, y las unidades de cada marca — PUBLICADA 29/09 01:10 (`040e1df`)

> **Publicada el 29/09 a las 01:10 de Bolivia** (`main` = `040e1df`), junto con §4gw y con la segunda vuelta de las
> unidades (solo colchones y somieres). Sin tocar el servidor. Lo de «Esperando el OK del dueño» de abajo quedó atrás.

**El pedido.** Después de §4gu se le ofreció la meta por marca con dos cosas: cuánto falta para la meta, y «cada semana,
cómo vas contra los meses anteriores a la misma altura». Contestó: *«la opción 2 me parece. Y también unidades, tanto de
Sueña como de Heaven: puede que entre menos plata pero subió el número de unidades vendidas, y eso es bueno, y son cosas a
ver»*. La meta queda para cuando la pida (dijo que es por marca y cambia cada mes).

**Lo hecho (solo la pestaña 📈, `pedidos.html`):**
- **📦 Unidades** (`pryTipoProd`, `pryUnidadesDe`): cada producto de la venta con su cantidad —colchones, somieres,
  almohadas, respaldares, combos— sin lo que no es un producto de fábrica (`esProdDeTienda`: protectores, sábanas, mantas,
  «VARIOS», «RECOGER…»), igual que el stock. Aparte los **colchones** (un combo cuenta como un colchón): si una campaña
  regala almohadas, las unidades suben sin un colchón más. El tipo sale del nombre del catálogo si hay código (el código
  manda), si no del nombre escrito, con plurales y los alias (`prodAlias`: «ALM/NASA»).
  - Van en las fichas («N ventas · U unidades»), en cada vendedor y en el total.
- **📊 A esta altura** (`pryAltura`, `pryAcum`, `pryAlturaHtml`, arriba de la lista por vendedor):
  - lo VENDIDO para el mes (entrega agendada en el mes, como toda la pestaña) y cargado hasta el mismo día del mes, contra
    otro mes al mismo día (hoy 29/09 contra lo cargado al 29/08);
  - por defecto el mes anterior; «Comparar con» deja elegir cualquier mes entero del panel (por ejemplo, uno con campaña);
  - por marca y el equipo, sin mayoristas: una línea por cada uno («Heaven: 42% abajo en plata (…) y 11% arriba en
    unidades (…)») y una tabla por marca: vendido, ventas, unidades, colchones, Bs por unidad, la diferencia y el otro mes
    entero;
  - 📅 semana por semana (se abre): lo vendido para el mes por el día en que se cargó, antes del 1°, 1-7, 8-14, 15-21, 22-28
    y del 29 al fin (por día del mes, no de lunes a domingo, para poder comparar meses); la semana en curso dice «(va)»;
  - un mes que ya cerró se compara ENTERO con el otro; agosto no tiene con qué (julio no está entero en el panel).
- En «❓ Cómo se cuenta», qué es una unidad y qué es «a esta altura».

**Con ventas inventadas** (captura al dueño): Heaven 42 % abajo en plata y 11 % arriba en unidades, pero −33 % en colchones:
las unidades subían por almohadas de campaña. Es el caso que la columna de colchones tiene que mostrar.

**Pruebas:** `tests/test_proyeccion.js`, de 95 a 114 (§15-17 nuevas: tipos y unidades, «a esta altura» con números a mano,
«Comparar con», mes cerrado, agosto sin comparación, anchos). 7 textos de §4-14 cambiaron a conciencia (dicen las
unidades). Contra lo publicado (`a904137`): 88 bien · 26 mal.

**Batería sobre `6ced156`: 113 suites, 4.350 bien · 0 mal** (`test_stock_detalle` dice «ok (sin resumen)», como siempre).
Esperando el OK del dueño para publicar.

**Segunda vuelta: las unidades son solo colchones y somieres** (`550e975`). Al ver las capturas, el dueño: *«quitá las
almohadas, solo nos interesa colchones y somier y colchonetas o colchones de bebé, no mantas, sábanas, almohadas, patas,
etc.»*. Reemplaza la primera versión de arriba (que contaba almohadas y respaldares y tenía aparte los colchones):
- **Unidad = colchón** (también colchoneta y colchón de cuna) **o somier**, con su cantidad. Un **combo** cuenta como un
  colchón y un somier. **Confirmado por el dueño**: *«hay combos que llevan colchón, somier, almohadas y sábanas o mantas:
  solo se cuenta el colchón y el somier. Pero los vendedores no cargan combos, cargan producto por producto»*. Cargado
  producto por producto da lo mismo (cada renglón por su lado): colchón + somier + 2 almohadas + sábanas + manta = 2
  unidades, con código y escrito a mano (`test_proyeccion` §15). La tabla de «A esta altura» tiene ahora Unidades,
  Colchones y Somieres, cada una con su diferencia.
- **No cuentan**: lo de tienda de siempre (`esProdDeTienda`: protectores, sábanas, mantas, frazadas, cubrecamas, edredones,
  MDF, «VARIOS», «RECOGER…») y `PRY_NO_UNIDAD`: almohadas, almohadones, almohadillas, cojines, respaldares, respaldos,
  cabeceras, pieceras, patas, forros, fundas, armazones, veladores, toppers, plumones, acolchados, cobertores, colchas,
  cortinas, toallas, alfombras, muebles (sofá, sillón, baúl, mesa, cama), espuma, planchas, retazos, telas, y servicios
  (envío, flete, transporte, instalación, armado, descuento, regalo).
- ⚠️ **El colchón se sigue reconociendo por DESCARTE** (§4cx: el catálogo casi nunca dice COLCHON). Si aparece un accesorio
  nuevo que se cuenta como colchón, va a `PRY_NO_UNIDAD`.
- **Lo escrito a mano** (`pryPedazoTipo`): manda la PRIMERA palabra que dice qué es («PROTECTOR DE COLCHON», «PATAS PARA
  SOMIER» y «FORRO COLCHON PILLOW PEDIC» no cuentan; «COLCHON DE REGALO» sí). Un renglón con varias cosas se mira por
  pedazos (`PRY_PEDAZOS`: «+», «,», «;», «/», «C/», «CON», «MAS», «Y»): el primero es un colchón si no dice otra cosa; los que
  siguen cuentan solo si dicen COLCHON o SOMIER. Sin eso, «COLCHON TITANIO + 2 ALMOHADAS» —el renglón típico de una
  campaña de almohadas de regalo— no contaba el colchón. «COMBO DE SÁBANAS» / «COMBO ALMOHADAS» no cuentan.
- Todo el catálogo `CODIGOS` se clasificó igual con código y escrito a mano: 36 nombres de colchones (con COLCHONETA
  CAMPING y COLCHON CUNA), 13 de somieres, 20 combos, y 5 que no cuentan (ALM/HEAVEN, ALM/NASA, ALMOHADA, ALMOHADA FIBRA
  SILICONADA, RESPALDAR PRAG.).
- La tabla, con siete columnas, no entraba en el iPad parado (695 px en 675): relleno de 7 px en `#pry-altura` y el
  encabezado puede partirse. Queda 653 px con montos de siete cifras.
- `tests/test_proyeccion.js`: 118 (§15 con los renglones escritos a mano, los combos y el combo cargado producto por
  producto). Contra lo publicado (`a904137`): 88 bien · 30 mal; contra la primera versión (`33c876c`): 11 rojas, las de
  la regla nueva.
- **Batería sobre `550e975`: 113 suites, 4.353 bien · 0 mal.**

## 4gu. 29/09: la proyección con la curva de cada marca, la prueba con los meses cerrados y cómo se vendió cada mes — PUBLICADA 29/09 00:24 (`a904137`)

> **Publicada el 29/09 a las 00:24 de Bolivia** (`main` = `a904137`). Sin tocar el servidor (sigue el `.gs` 2026-09-28-a).
> No había ninguna corrida en curso ni en cola. Solo cambia la pestaña 📈 de Contabilidad (con la contraseña): a las
> vendedoras no les cambia nada.
>
> **El OK del dueño**, después de ver las capturas con ventas inventadas y de preguntar qué tan exacta puede ser: *«si es
> como la venías desarrollando, sin ver los meses anteriores que te pasé, sí, promueve. Veo que no sirven de mucho aún;
> mejor armar algo limpio con los datos del panel»*.
> - **Sus meses anteriores NO se cargan.** Mandó capturas de su Excel de métricas (ventas mensuales por vendedor, abril a
>   agosto, Heaven y Sueña). Se analizaron en el scratchpad y **no van al repo** (es público). Lo que mostraron: el mes
>   varía mucho de uno a otro (más que el 6 % que él busca), y el «promedio de los meses anteriores» erra bastante al
>   arrancar el mes. Decidió seguir solo con lo que guarda el panel.
> - **Metas:** *«por marca, y varía cada mes»*. No hay nada hecho todavía; se le propuso cargarla en esta pestaña con el
>   seguimiento semanal «a esta altura contra los meses anteriores».
> - **Julio tuvo una campaña parecida a la de septiembre.** Ojo al leer la prueba del 1/10: agosto (sin campaña) se prueba
>   con la curva de septiembre (con campaña) y al revés. Propuesto y NO hecho: marcar los meses con campaña para comparar
>   campaña con campaña.

**Las preguntas del dueño** (después de ver §4gt publicada):
- *«¿Cómo calculás la proyección? ¿Qué parámetros tomás? ¿Tomás en cuenta MoM? ¿Ticket promedio o qué?»* — Se le
  explicó el ritmo de §4gt: no usa MoM ni ticket promedio.
- *«¿Tomás en cuenta lo pendiente de entrega, lo que está agendado hasta el último día del mes? Y usando tu razonamiento,
  ¿qué fórmula o algoritmo podemos usar para calcular la proyección, identificando patrones de días de ventas altas,
  bajas, y algo realmente preciso en lo posible?»* — Sí: lo agendado es la B de §4gt. Se le propuso la curva y probarla.
- *«Creo que en agosto los últimos dos, tres días se facturó 80.000 o 150.000, no recuerdo, y hablamos solo de ventas de
  Heaven; Sueña es distinto. Ya me agrada tu idea de calcular y probar con agosto.»*

**El problema del ritmo.** Reparte parejo lo de hasta hoy y no ve el empujón de fin de mes: si Heaven vende el 30 % del mes
en los últimos 3 días, el ritmo se queda corto todo el mes y recién lo agarra con lo agendado de los últimos días.

**Lo hecho (`pedidos.html`, pestaña 📈 de Contabilidad; nada del servidor):**
- **La curva de cada marca** (`pryCurva`, `pryCurvaF`, `pryAlDia`): de los meses cerrados (desde `PRY_PRIMER_MES`='2026-08',
  julio empezó a fines de mes), faltando r días hábiles para el cierre, qué parte `f` de lo que el mes terminó vendiendo
  ya estaba VENDIDA (`contaFecha` = el `ts` de cuando se cargó; entrega dentro del mes por `fechaSalida`, como §4gt). Los
  meses se alinean por días hábiles hasta el cierre (agosto de 2026 terminó un lunes y septiembre un miércoles).
- **La proyección de la marca** (`pryMezcla`), con K = lo ya vendido para el mes (entregado + agendado):
  - (1) si sigue en la misma proporción: K ÷ f;
  - (2) lo vendido + lo que en los meses cerrados entró desde esta altura hasta el cierre: K + (1 − f) × su promedio;
  - la (1) pesa **f²** y la (2) el resto.
  - ⚠️ **Por qué no la división sola** (lo primero que se armó): con ventas inventadas, el 05/09 la (1) decía Bs 859.211 para
    un mes que cerró cerca de 590.000 (a principio de mes f es chica y dividir por ella agranda cualquier ruido). La (2)
    sola no ve que un mes venga más fuerte o más flojo. **Por qué f² y no f**: con f, el peso por la (1) da f × K/f = K
    siempre, y en f = 0 la cuenta sumaba K dos veces (2K + promedio); con f² en f = 0 no queda nada de la (1).
  - Cada vendedor lleva la proporción de su marca (su vendido × proyección ÷ vendido de la marca): las marcas suman. La
    ficha de la marca es la cuenta de la marca (puede diferir de la suma en centavos).
  - Los **sin marca** y los **mayoristas** siguen con el ritmo (sin curva propia; los mayoristas son pocas compras y grandes).
  - Con menos de `PRY_MIN_VENTAS`=20 ventas de la marca en los meses cerrados, va el ritmo.
- **🧪 La prueba** (`pryPrueba`, cuadro «¿Qué tan bien proyecta?»): cada mes se rehace los días 5, 10, 15, 20 y 25, faltando
  3 días hábiles y la víspera del último, con lo que estaba vendido ESE día; el ritmo (por vendedor, como la pantalla) y la
  curva, que para un mes sale de los OTROS meses cerrados (con la suya acertaría siempre). Error de cada una contra cómo
  terminó, y el promedio. Del mes en curso, solo las fechas que ya pasaron y sin error («se ve cuando cierre»).
- **🏁 Elige la prueba** (`pryErrores`): con dos meses cerrados o más, cada marca va con la forma que menos se equivocó
  (promedio en las mismas fechas, últimos `PRY_MESES_PRUEBA`=6 meses, al menos `PRY_MIN_PARES`=5 fechas). Con ventas
  inventadas: una marca con empujón de fin de mes (como Heaven) → curva 4-5 %, ritmo 27-39 %; una que vende parejo → ritmo
  4-10 %, curva 12-17 %. Ninguna gana siempre, y el dueño dijo que Heaven y Sueña son distintas.
  - ⚠️ **El ritmo, aunque gane, recién desde el 5° día hábil** (`PRY_DIAS_RITMO`): la prueba empieza a medir el día 5, y el
    1° hábil el ritmo de Sueña (inventada) daba 204.000 para un mes de ~326.000.
  - Con un solo mes cerrado (hoy, 29/09: solo agosto) no hay contra qué probar la curva: va la curva, el aviso lo dice y la
    comparación aparece sola cuando cierre septiembre.
- **📅 Cómo se vendió el mes elegido** (`pryPatron`), por marca: lo entregado cada día (barras; en oscuro los últimos 3 días
  hábiles; más claro lo agendado), **los últimos 3 días hábiles con cuánto de eso ya estaba vendido antes y cuánto se vendió
  esos mismos días** (la pregunta de los 80.000 o 150.000), cómo se fue llenando (días 10 y 20, faltando 3 y la víspera) y
  qué días de la semana se vende más (promedio por día, por el día en que se cargó, en los meses cerrados).
- Debajo de cada marca, la cuenta entera, para seguirla con la calculadora: «(1) Bs 515.040 ÷ 87,1 % = 591.049; (2) Bs
  515.040 + Bs 77.160 = 592.200; la (1) pesa 75,9 % y la (2) 24,1 % → Bs 591.326».
- Arreglos chicos: «falta 1 día hábil» / «Va 1 día hábil» (decía «faltan 1», «Van 1»).

**⚠️ Lo que NO se hizo, a propósito:**
- Los feriados de 2026 que ya pasaron (06/08 y el de Santa Cruz del 25/09) NO se agregaron a `FERIADOS`: varias pruebas
  del cuadrito entregan esos días. En la proyección cuentan como hábiles; mueve la alineación un día en esos tramos.
- MoM, ticket promedio y estacionalidad: con dos meses no hay historia para eso. Se ofreció MoM al dueño y no contestó.
- La curva ve cada venta de un mes cerrado con su entrega FINAL (el panel no guarda las reprogramaciones).

**Lo que va a ver el dueño hoy (29/09, con sus datos):** la proyección de septiembre con la curva de agosto (casi igual al
ritmo: falta 1 día hábil), el aviso de «un solo mes», agosto probado solo con el ritmo y septiembre con la curva de agosto
(sin error hasta que cierre). Eligiendo agosto arriba, el 📅 con sus últimos 3 días hábiles de verdad. **Desde el 1/10**
aparecen los errores de las dos formas en agosto y septiembre, y cada marca elige.

**Pruebas:** `tests/test_proyeccion.js`, de 36 a 95 comprobaciones (§7-14 nuevas, con un historial inventado de agosto y
septiembre hecho a mano: `FIX2`, y `FIX3` con una Sueña pareja para que gane el ritmo). Todos los números esperados se
calcularon a mano antes de correr. Contra lo publicado (`6146f6d`): 37 bien · 58 mal (pasan §1-6 y «sin errores»).

**Batería sobre `4cec55a`: 113 suites, 4.331 bien · 0 mal** (`test_stock_detalle` dice «ok (sin resumen)», como siempre).

**⚠️ Se armó OTRA fórmula que la propuesta, y por qué.** Lo que se le propuso al dueño antes de su «me agrada tu idea de
calcular y probar con agosto» era: ritmo por vendedor por fecha de VENTA × factor del día de la semana × la parte que se
entrega antes de fin de mes, sin las ventas grandes, con un rango, y «principio/quincena/fin de mes» recién con 3 meses de
historia. Su dato de Heaven (el empujón de los últimos días) es justo lo que esa fórmula dejaba para después, y la curva lo
ve con un mes. Del plan quedaron: la prueba contra agosto (adentro del panel), los días altos y bajos (📅, se muestran pero
no entran en la cuenta). Quedaron afuera: el rango, sacar las ventas grandes del ritmo, MoM y ticket promedio.
**Se le prometió «te muestro cuánto le erraba antes de publicarla»**: la prueba con SUS números solo corre en su panel
(desde acá no hay acceso a la planilla), así que se le mostró con ventas inventadas y se le pidió el OK para publicar.

## 4gt. 28/09, noche: «📈 Proyección del mes» en Contabilidad, solo con la contraseña de Administración — PUBLICADA 28/09 19:14 (`6146f6d`)

> **Publicada el 28/09 a las 19:14 de Bolivia** (`main` = `6146f6d`; el dueño: «me gusta el bosquejo, publica y lo veo»). Sin tocar el
> servidor (sigue el `.gs` 2026-09-28-a). No había ninguna corrida del panel en curso ni en cola. Todos F5; la pestaña
> aparece recién después de poner la contraseña en Administración.

**El pedido del dueño** (con una captura de Contabilidad → Ventas por entrega agendada):
- *«me varía con lo de cuadre y conciliación»*: el Cuadre cuenta la plata que ENTRÓ, por fecha de pago; Ventas por entrega
  agendada cuenta lo VENDIDO, por la fecha de la entrega. Son números distintos a propósito.
- *«crea una pestaña al lado de cuadre y conciliación que solo se habilite cuando se coloca la contraseña de administrador
  en el panel de administración»*.
- *«que me muestre el total vendido en el período de cada vendedor, el total de cada marca y una proyección a fin de mes
  según cómo vienen las ventas… ojo, no me interesa el efectivo ingresado sino el vendido en el período»*. Lo vendido es
  por entrega agendada: una venta pagada un mes y entregada el siguiente cuenta en el mes de la entrega.
- *«arma el bosquejo como quedaría y me muestras, sigo desde el cel»*.

**Lo armado (en la rama, SIN publicar, sin prueba propia todavía):**
- Pestaña `data-val="proy"` («📈 Proyección del mes»). `mostrarBotonesTodos` la muestra solo con `UNLOCKED`, y
  `setContaTab` / `renderProyeccion` vuelven a Ventas si no hay clave. Todo pasa por `contaRepintar()`.
- `proyeccionMes(ym)`:
  - Suma `ventaTotal` por la fecha de `fechaSalida` (la entrega agendada, como Ventas → 🚚 Entrega agendada).
  - El equipo va como en Ventas (`fueraDeConta(p,'tienda')`). La marca sale por vendedor (`marcaDe`, §4bl).
  - Los mayoristas (`fueraDeConta(p,'mayor')`) van aparte.
  - Quedan afuera las ATC, las RPT y ROHO.
- **Proyección**, por vendedor; las marcas y el total son la suma:
  - A = lo que tiene entrega hasta hoy.
  - B = lo agendado de mañana a fin de mes.
  - proyección = A + máx(B, A ÷ días hábiles que pasaron × días hábiles que quedan).
  - Días hábiles = lunes a sábado sin feriados.
  - No mira `p.entregado`: los choferes todavía no marcan.
  - Un mes que ya pasó muestra «Cerró el mes»; uno que no empezó muestra solo lo agendado.
- **Pantalla:**
  - Fichas: vendido, proyección, Sueña, Heaven, sin marca y mayoristas.
  - Lista por vendedor agrupada por marca, con lo vendido y la proyección en violeta. Es lista y no tabla: en 390 px una
    tabla de cuatro columnas escondía la proyección.
  - Cuadro «❓ Cómo se cuenta».
  - Proyección y ritmo en Bs enteros (`fmtBs0`); lo vendido, con centavos, igual que en Ventas.
- **Se le mostró** con capturas de celular (ventas inventadas, «hoy» = viernes 18/09).

Las pruebas de Contabilidad pasaron igual: `test_conta_alta` 53, `test_cuadre_alta` 35, `test_rev_conta` 38,
`test_rev7_celular` 35, `test_botones` 50, `test_medias` 24.

**El dueño:** *«uso iPad Air M3, así que sí se verá, no celular. Me gusta el bosquejo, publica y lo veo.»* Los mayoristas
quedan aparte, como en el bosquejo (no contestó la pregunta; se deja como lo vio y le gustó).

**Arreglado antes de publicar — el iPad:**
- A 820 px (el iPad Air parado) las fichas salían de a tres, de ~230 px, y los totales del mes, de seis cifras, salían
  cortados («Bs 684.39…»).
- `acomodarFichas` ahora acepta un ancho mínimo por caja (`data-min`), y `#pry-metrics` pide 300. Quedan de a dos en el
  iPad parado y de a tres acostado. Las otras cajas siguen con `FICHA_MIN`=230.

**Prueba:** `tests/test_proyeccion.js`, 36 comprobaciones. Contra `bf19fc8` da 5 bien y 31 mal, y contra el bosquejo
`a6660ef`, 35 bien y 1 mal (la del iPad). Cubre:
- la pestaña solo con la contraseña, con `tryUnlock` de verdad;
- las cuentas con el reloj en el viernes 18/09: la venta cargada en agosto y entregada en septiembre entra, la de octubre
  no, la venta de tienda cuenta por el día en que se cargó, no entran ATC, RPT ni ROHO, y los mayoristas van aparte;
- que lo vendido es EXACTAMENTE lo de Ventas → 🚚 Entrega agendada;
- lo que se ve en pantalla;
- un mes cerrado, un mes que no empezó y los primeros días;
- 820, 1180 y 390 px: sin scroll de costado y sin montos cortados.

**Batería sobre `ffa3420`: 113 suites, 4.269 bien · 3 mal.** Las 3 eran dos pruebas que contaban los botones de Contabilidad
y esperaban exactamente tres: `test_mayorista` («TRES pestañas») y `test_rev2_cuadre` §6 (el ancho de la cuarta, escondida,
daba 0). Se cambiaron a conciencia: tres pestañas A LA VISTA y la cuarta escondida sin la contraseña. Quedaron 37/0 y 55/0,
así que el total es **4.272 bien · 0 mal**. La página no cambió desde la batería.

## 4gs. 28/09, noche: Moreno no mira la hora, y lo que se fabrica sale a las 48 h — PUBLICADA 28/09 18:28 (`bf19fc8`)

> **Publicada el 28/09 a las 18:28 de Bolivia** (`main` = `bf19fc8`, junto con §4gq y §4gr; el dueño: «hazlo»). Sin tocar
> el servidor (sigue el `.gs` 2026-09-28-a). No había ninguna corrida del panel en curso ni en cola. Todos F5.

**Lo que vio el dueño.** La tabla de §4gq con su ejemplo, el lunes 28/09 a las 16:25 y a las 18:15:
- Moreno: desde el miércoles 30/09 → desde el jueves 01/10.
- Fabricar: ~4 días (viernes 02/10) → ~5 días (sábado 03/10).

**Lo que dijo:**
- *«Si hay que ir a recoger, da igual si son las 18 o las 11 o las 15, porque se cargó lunes, se recoge martes, se entrega
  miércoles.»*
- *«Lo que sí hay que fabricar, si entra lunes a las 18, sería para entregar viernes o sábado. ¿Por qué 5 días? Si el pedido
  entró lunes a las 18, se manda a producir martes a las 8 am. Debería salir en 48 horas, y las otras 24 son para recoger y
  entregar… ¿o no es así?»*

**Por qué decía 5 días.**
- El panel usaba `STOCK_DIAS_FABRICA`=3 como lo que tarda la fábrica hasta que el colchón está en el almacén. El dueño había
  dicho «2 a 3 días» el 07/09 (§4cn) y se tomó 3.
- Encima, el cuadrito sumaba 1 día para entregar: martes + 3 = viernes en el almacén → sábado al cliente.
- Con sus 48 h: martes y miércoles se fabrica, el jueves sale y se recoge, el viernes se entrega.
- Lo de Moreno en §4gq salió de leer como Moreno su frase del mediodía (*«no es lo mismo un pedido que entra 18:00 del lunes:
  no llega a entregarse miércoles, sería jueves»*): era el único caso que daba miércoles. Ahora aclaró que ahí la hora no
  importa.

**Lo que cambió.** Solo el cuadrito del formulario y la pregunta al guardar.
- 📥 **Moreno:** `saldoDiaRecoge()` es el día hábil siguiente (`STOCK_DIAS_RECOGIDA` días hábiles), a cualquier hora, y se
  entrega desde el día siguiente a la recogida. Lo mismo para lo que sigue en Moreno en `saldoEntradas`.
  - Si la recogida no es mañana, el cuadrito dice qué día: el sábado a cualquier hora, «logística lo recoge el lunes 05/10:
    programá desde el martes 06/10».
  - Antes de §4gq, el sábado prometía el lunes, como si se recogiera el domingo.
- 🏭 **Fabricar:** `DIAS_PRODUCCION`=2 días hábiles y `saldoSaleDeFabrica(desde)`.
  - Lo que hay que fabricar arranca `diaArranque()` (la hora de corte de §4gq sigue).
  - Sale 2 días hábiles después; ese día se recoge, y se entrega desde el siguiente.
- **La misma regla** para 📐 medida especial, ⏳ lo ya pedido a fábrica (desde `q.f`) y 🏭 lo que se fabrica para ESE pedido
  (desde `prodF`). Con la regla solo en «hay que fabricar», el lunes a las 18:15 se prometía el viernes; el martes, con el
  pedido a fábrica anotado, el ⏳ prometía el sábado para la misma tanda.
- **La cuenta, a la vista** (`saldoArrancaTxt`):
  - «🏭 Se manda a producir hoy, sale de fábrica el miércoles 30/09 (48 h) y ese día se recoge.»
  - «🕔 Ya pasaron las 17:00: se manda a producir el martes 29/09, sale de fábrica el jueves 01/10 (48 h) y ese día se recoge.»
  - Así la pregunta «¿por qué X días?» se contesta sola, también para las vendedoras.

**⚠️ Lo que el cuadrito dejó de usar.** Ni lo que tarda la fábrica «medido» (`stockTiemposFabrica`) ni `saldoLeadModelo`
(§4gk). Se borraron `saldoLeadModelo` y `saldoTiempos`. Tres motivos:
1. Es la regla que dictó el dueño.
2. Lo medido mezcla «hasta que llegó» (✔ hay, o «Llegaron») con «hasta que se entregó»: una línea 🏭 entregada sin pasar por
   ✔ hay se mide hasta la entrega.
3. La promesa no cambia sola con cada llegada.

Si un día la fábrica tarda otra cosa, se cambia `DIAS_PRODUCCION`.

**NO cambia la pantalla de stock:** el aviso de cuándo pedir, cuánto pedir, «Qué producir» y «llegan el…». Sigue con lo medido,
o con `STOCK_DIAS_FABRICA`=3.
- En la regla del dueño, esos 3 días son las 48 h más el día en que se recoge: hasta que se puede ENTREGAR, que es lo que ese
  aviso tiene que cubrir.
- Cambiar el 3 movería las cantidades a pedir, y eso no lo pidió.
- Consecuencia a la vista: un pedido a fábrica del martes dice «llegan el viernes» en Stock y «llega el jueves» en el cuadrito.

**Su ejemplo, con el panel ya cambiado** (lunes 28/09):

| | 16:25 | 18:15 |
|---|---|---|
| 📥 Hay en Moreno | desde el miércoles 30/09 | desde el miércoles 30/09 (no cambia) |
| 🏭 Hay que fabricar | ~3 días (jueves 01/10) | ~4 días (viernes 02/10) |
| ✅ Hay a mano | desde mañana | desde mañana (no cambia) |

**Pruebas:**
- `tests/test_corte_horario.js`, reescrita: 35. Contra `7fe7551` da 11 bien y 24 mal; contra `275b031` (§4gq), 17 bien y 18 mal.
- `test_saldo_almacen`: cuatro comprobaciones pasaron a las 48 h.
- `test_rev8_saldo`: nueve comprobaciones pasaron a las 48 h. La de «📐 los ~X días son los de ESE modelo» ahora dice lo
  contrario, a propósito.

**Batería sobre `e825f51`: 112 suites, 4.236 bien · 0 mal** (`test_stock_detalle` dice «ok (sin resumen)», como siempre).
Publicada el 28/09 a las 18:28 (`bf19fc8`), junto con §4gq y §4gr.

## 4gr. 28/09, tarde: «↩️ Era un pago de la venta» — un recargo por entrega que era un pago — PUBLICADA 28/09 18:28 (`bf19fc8`)

**El pedido del dueño.** Primero preguntó *«¿cómo registra múltiples pagos en diferentes fechas un vendedor si ahí dice
"recargo por entrega"?»*: esa ficha mostraba solo el bloque del flete porque la venta ya no tenía saldo. Después vio la otra
cara: *«¿y cómo borro los recargos por entrega? Porque no eran recargos por entrega sino pagos»*. Las vendedoras anotaban
cobros de la venta en «🚚 Recargo por entrega». Aceptó la propuesta con *«sí, hacelo y mostrame»*.

**Lo que había.**
- Un recargo **pactado** (sin cobrar) se saca con «✏️ Cambiar lo que falta cobrar» → 0, o borrándolo en el formulario. Eso
  sigue igual.
- Uno **cobrado** solo tenía «🗑 Quitar el recargo» (`ctaBorrarEnvio`). Ese botón se lleva la foto del recibo
  (`borrarFotoSiNadieLaUsa`) y la plata desaparece de la venta: había que volver a cargarla a mano en «💵 Registrar un pago».

**Lo nuevo: `ctaEnvioAPago(id, e)`, el botón «↩️ Era un pago de la venta».**
- Aparece en cada recargo **ya cobrado** de «PAGOS», en la ficha de Contabilidad.
- No aparece en los pagos de la venta, ni en un recargo pactado, ni en una ATC o RPT (`noSeCobra`).
- Pasa ESE renglón a los cobros de la venta tal cual: fecha, monto, método, banco, nota, `>quién recibió` y fotos. Ninguna
  foto va a la papelera.
- **El total de la venta no cambia:** `aplicarCobros` con el objetivo de antes (`objetivoCobro`) baja el saldo en lo que entró.
- **Si la venta ya figuraba pagada**, queda «cobrada de más» (`excesoCobro`). La pregunta y el aviso lo dicen: el total
  estaba corto y se corrige en «✏️ Corregir precios y montos».
- **Si está registrada en el sistema contable**, la pregunta pide avisarle a Contabilidad. La marca REGISTRADO sigue.
- **Un solo guardado.** El renglón sale de los recargos en memoria y `aplicarCobros` relee el anticipo y los recargos que
  quedan. `e` es la posición en `enviosDe(p)` (`ctaIdxEnvio`: [pactado, cobrado] apunta al cobrado).
- **Venta «PAGADA sin monto» (§4fg):** se pasa `cobrosDe` (con el pago de mentira) para que `aplicarCobros` le mude las fotos
  del método suelto al pago nuevo. No nace un renglón de Bs 0.
- Cierra el editor de otro pago que esté abierto (`CTA_EDIT_I=-1`): los renglones cambian de lugar.

**Lo que se le mostró al dueño:** dos capturas de la ficha, con una venta inventada. Antes: 11.500 de adelanto + un «recargo»
de 7.950, saldo 7.950. Después: los dos en «PAGOS», la venta PAGADA y sin recargo.

**Pruebas:** `tests/test_envio_a_pago.js` (28). Contra `7fe7551` da 8 bien y 20 mal: las 8 son cancelar, ATC/RPT y sin
errores, que tienen que dar igual.

**Queda (dicho al dueño):** hoy no hay cómo BORRAR un pago de la venta ya registrado. «✏️ Corregir» no acepta monto 0, y ni
el formulario ni «Corregir precios y montos» tocan los cobros. Se ofreció un «🗑 Borrar este pago» si hace falta.

**Batería sobre `275b031`: 112 suites, 4.231 bien · 0 mal** (`test_stock_detalle` dice «ok (sin resumen)», como siempre).
Es la de §4gq más `test_envio_a_pago` (28). Publicada el 28/09 a las 18:28 (`bf19fc8`), con §4gq y §4gs.

## 4gq. 28/09, tarde: la hora en que entra el pedido (corte 17:00; sábado 12:00) — PUBLICADA 28/09 18:28 (`bf19fc8`), con §4gs

> ⚠️ **Corregido esa misma noche en §4gs:** Moreno NO mira la hora, y lo que se fabrica sale a las 48 h (no «3 días + 1»).
> Lo de abajo sobre Moreno y los «~5 días» queda como historia.

**La pregunta del dueño** (15:40): *«¿qué pasa si hoy tenemos un ICE en inventario, el 1er vendedor lo pone para el
sábado, el 2do para el miércoles y el 3er para mañana? ¿El panel lo aparta para el 1ro, o define por fecha?»*

**Cómo es hoy (no cambia):**
- El cuadrito del formulario cuenta lo vendido y sin entregar **sin mirar fechas**: el primero que GUARDA ve ✅; los que
  cargan después ven «🏭 NO HAY» (y al guardar, la pregunta de siempre).
- Si dos guardan en los mismos segundos, pasan los dos sin aviso: el servidor no revisa el stock.
- Quién se lleva el colchón lo decide la **revisión automática de logística**, por **fecha de entrega** (la más cercana
  primero), respetando lo que ya está marcado (`REVSTK_SOLO_VACIOS`, tildado por defecto). Nada se marca solo: Aplicar.

**Lo que se propuso y el dueño DESCARTÓ** — no volver a proponerlo sin que lo pida:
- una sola regla para el cuadrito y para logística: *«el colchón va al que entrega primero, pero nunca a costa de dejar tarde
  a uno que ya vendió»*;
- cuatro estados en el cuadrito: ✅ HAY · queda para vos / ✅ HAY POR AHORA / 🏭 SE FABRICA / ⛔ NO LLEGA;
- guardar en cada renglón lo que se le dijo al vendedor, y avisarle en «Mis pedidos» si cambia.

Se simuló con sus tres ventas (en el scratchpad, `sim_reparto*.js`, no en el repo). En el camino dio dos datos que quedan:
*«es importante decirle al vendedor que se va a fabricar, no que hay: pueden surgir retrasos»*, y para pasarle el colchón a
una venta más urgente *«justo alcanza»* (sin margen). Después cortó: *«creo que es mucho kilombo, sería mejor que lo decida
logística»*.

**Lo que SÍ pidió, y está hecho:** *«solo tomá en cuenta, como está ahora, los días de producción tomando en cuenta la hora que
entra el pedido: no es lo mismo un pedido que entra a las 18:00 del lunes; no llega a entregarse el miércoles, sería el jueves,
considerando que pasa al siguiente día hábil laboral»*. Antes había dicho: *«logística y producción solo trabajan hasta las 17»*,
y que el sábado se trabaja medio día.
- **`diaArranque()`**: hoy, si es día hábil y todavía no pasó el corte; si no, el siguiente día hábil (`sigDiaHabil`).
  - El corte es `HORA_CORTE`=17 de lunes a viernes y `HORA_CORTE_SABADO`=12 el sábado.
  - No son hábiles el domingo ni los `FERIADOS` (nacionales + 24/09, cargados hasta fin de 2027). ⚠️ Revisar la lista cada año.
  - La hora es la del dispositivo, como `todayStr()`.
- **Se corre SOLO el día en que se empieza.** Los días de producción se cuentan igual que antes (`lead` y
  `STOCK_DIAS_RECOGIDA`, días corridos): el dueño dijo «como está ahora».
- **Dónde:**
  - 📥 HAY EN MORENO (`saldoVeredicto`, y `saldoEntradas` para lo que sigue en Moreno);
  - 🏭 NO HAY (hay que fabricar), y la llegada de un pedido a fábrica que no trae fecha;
  - 📐 MEDIDA ESPECIAL.
- **No cambia:**
  - ✅ DISPONIBLE (lo que está a mano sale igual «desde mañana»);
  - ⏳ en producción y 🚚 recogida programada, que tienen su fecha;
  - la revisión de logística, «Qué producir», la proyección y los carteles de stock.
- **El texto:** cuando empieza otro día, el cuadrito y la pregunta al guardar dicen por qué (`saldoArrancaTxt`):
  - «🕔 Ya pasaron las 17:00: logística y producción lo empiezan el martes 29/09.»;
  - «🕔 El sábado se trabaja hasta las 12:00: …»;
  - «🕔 Hoy es domingo: …»;
  - «🕔 Hoy es feriado (Todos Santos): …».
- **Su ejemplo, con el panel real** (lunes 28/09, 18:15):
  - Moreno: «programá desde el jueves 01/10» (a las 16:25, el miércoles 30/09).
  - Fabricar: ~5 días, desde el sábado 03/10 (a las 16:25, ~4 días, el viernes 02/10).
- **Pruebas:** `tests/test_corte_horario.js` (30). Contra `7fe7551` da 9 bien y 21 mal: las 21 son las que dependen de la
  hora; las 9 son antes del corte y los controles, que tienen que dar igual. Las otras pruebas del cuadrito clavan el reloj
  entre semana antes de las 17:00 (10:00 o 15:00), así que no cambian.
  ⚠️ Una prueba NUEVA del cuadrito tiene que clavar el reloj: sin eso, después de las 17:00 da otros días.

**Batería sobre `5ff8112`: 111 suites, 4.203 bien · 0 mal** (`test_stock_detalle` dice «ok (sin resumen)», como siempre).
Publicada el 28/09 a las 18:28 (`bf19fc8`), con la corrección de §4gs.

## 4gp. 28/09, tarde: el dueño instala el servidor 2026-09-28-a — IMPLEMENTADO

- **15:16 — el pedido.** *«pasame para instalarla»*, con una captura de 🔒 Cerrar día: «El candado está en el servidor
  (versión 2026-09-26-a)», sin línea gris. Era una pestaña abierta antes de las 15:02: la página `2040720` esperaba la
  26-a y con esa versión no dibuja nada. Con la página nueva (F5) aparece la línea gris «está 2026-09-26-a, la última
  es 2026-09-28-a».
- **Lo que se verificó antes de mandarle los pasos:**
  - el `.gs` 28-a cambia 18 líneas contra la 26-a: el `borrado` de `doSave`, `filaFijaSistema_`, `borrado` en
    `RECHAZOS_REGISTRAR` y las versiones;
  - `test_servidor.js` da 276/276, con §13 (el archivo de agosto no choca con ningún nombre);
  - una página `2040720` sin F5 deja el `borrado` en la cola (no está en sus `RECHAZOS_FIRMES`) y lo reintenta. El
    servidor no toca la hoja y lo anota en Rechazos; con F5 la página nueva lo saca de la cola y lo dice. No se
    pierde nada.
- **Los enlaces:**
  - para instalar, el raw fijo a `7fe755136f10c9c6fc6f028cab29ccc31977c174`: 1980 líneas, termina en `}` con
    `return borrador;` antes;
  - para volver atrás, el de `ea81bb01dc704ec47f26147aea0634a9b851639f`: la 26-a, 1965 líneas. Es el mismo que usó el
    26/09, y el código es idéntico en `e2e613a` y `2040720`.
- **15:21 — `probarAntesDeImplementar`, todo ✅:**
  - versión 2026-09-28-a;
  - código entero (18 funciones clave);
  - 1063 filas;
  - disparadores instalados;
  - repaso de Kommo de hace 2 minutos, sin errores;
  - **stock 22.642 de 50.000 letras (45 %)**: el 26/09 a las 11:35 eran 22.208;
  - arqueo en 0.
- **Versión para volver atrás: 33** («Versión 33 del 26 sept 2026, 11:30 a.m.», la 26-a). Volver atrás = ✏️ → 33
  **Y** pegar la 26-a de `ea81bb0…`.
- **~15:24 — implementada.** El dueño: *«listo, ya implementé»* (✏️ → Nueva versión, descripción `2026-09-28-a`).
  Desde acá no se puede comprobar: el proxy no deja llegar a Google, la última corrida del respaldo de Kommo (167) fue
  a las 14:45, antes de implementar, y `actions_run_trigger` sigue sin permiso (§4ds).
- **15:27 — comprobado.** Captura del dueño, después de F5: 🔒 Cerrar día dice *«✅ El candado está en el servidor
  (versión 2026-09-28-a). Aunque una vendedora tenga el panel abierto desde antes, el servidor le va a rechazar el
  pedido. No se puede saltear.»*, **sin la línea gris**: el `/exec` de siempre ya contesta con la 28-a.
- **La segunda `probarAntesDeImplementar` no hace falta.** Lo de Kommo no pasa por el control nuevo: `doSave` solo se
  llama desde `doPost` (el guardado del panel), y los borradores de Kommo se escriben con `appendRow`. El código de
  Kommo es el mismo que en la 26-a, y el pegado ya se había comprobado entero a las 15:21.
- **Decidido por el dueño (28/09, 15:35): los textos de `borrado` quedan como están.**
  - Se le ofreció arreglar dos cosas:
    - el cartel del chofer dice «otra persona cambió esos pedidos», pide «volvé a tocar ✅» y «volvé a subirla» de un
      pedido que ya no está en su lista, y no dice «entregá esa plata a Contabilidad»;
    - el formulario de la vendedora queda abierto sobre un id que ya no existe.
  - Su respuesta: *«SI PERO LOS CHOFERES HASTA HOY NO MARCAN nada -.- dejemos mientrsa como esta todo.»*
  - **Los choferes todavía no usan el panel para marcar ✅ ni cobros.** Lo que depende de eso (cobros de la puerta,
    chofer sin señal, sus carteles) no es prioridad mientras siga así. No volver a proponer estos textos hasta que
    los choferes marquen en el panel.

## 4go. 28/09, noche: la revisión de Codex del §18 — una sola lectura no alcanza para decir «lo borraron» — PUBLICADA

**Publicado el 28/09 a las 15:02 de Bolivia** (`main` = `7fe7551`: la rama `bf934bb` unida sobre los tableros del robot,
que quedaron como estaban), con el OK del dueño: *«aprobado todo»*. Van juntos §4gl, §4gm, §4gn y §4go. El servidor sigue
en **2026-09-26-a**: la página espera la 28-a y «Cerrar día» muestra la línea gris hasta implementarla. Todos F5. El
`.gs` 28-a va después, con todos ya recargados (enlace raw fijo al commit, nunca por el chat). Pages: corrida 1538 en
verde a las 15:03.

El dueño trajo la revisión de Codex de la rama en `5b39386`. Codex repitió las pruebas: 81 comprobaciones en cuatro
suites, con el servidor 28-a y con el 26-a.
- **Eduardo → Multicenter: conforme.** Y el dueño contestó la pregunta de §4gn: **Multicenter se escribe en el
  CLIENTE** (no en «Facturar a»). La regla mira el cliente: queda así.
- **Hallazgo: 45 s no garantizan que la lectura sea actual.** La ventana de §4gn supone cuánto tarda, como mucho, un
  `doGet`, y el código no fija ni verifica ese máximo. Codex lo reprodujo con el `.gs` 26-a real (su
  `tests/test_codex_cache_lenta.cjs`, que quedó en su máquina, no en el repo):
  1. la foto de la planilla se toma antes de cargar el pedido;
  2. el pedido se guarda y se confirma;
  3. el `doGet` viejo termina tarde y deja su foto en la caché;
  4. la lectura siguiente se pide 46 s después de la confirmación;
  5. `mergePending` saca el pedido y avisa «lo borraron» con el pedido en la hoja.

  Codex recomendó: no afirmar un borrado a partir de UNA respuesta cuya frescura no se puede demostrar; dejar la copia
  «pendiente de verificar» y reconsultar. Subir los 45 s solo corre el límite, y la garantía de verdad es que el
  servidor diga de cuándo es su lectura.
- **Arreglo (página)**: pasada la ventana, la PRIMERA lectura que no trae un pedido confirmado acá es una **sospecha**.
  - `SAVE_ULTIMO[id].faltaT` = cuándo llegó esa lectura. El pedido se queda en pantalla, sin aviso, y
    `borradoConfirmarLuego` relee sola a los `BORRADO_CONFIRMA_MS` (25 s).
  - Solo si una lectura PEDIDA después de eso tampoco lo trae, `borradoFuera`. Si alguna lo trae, la sospecha se borra.
  - Por qué alcanza: una copia de la caché dura como mucho `GET_CACHE_SEG` (20 s) desde que se escribe, y la que pudo
    traer la primera lectura ya estaba escrita cuando esa llegó. La segunda no puede ser esa misma copia.
  - **No es garantía**: dos `doGet` lentos seguidos todavía podrían engañarlo. Se dice así, sin «todo cerrado».
- **Los avisos de borrado ya no dicen «si hay que cargarlo, hacelo como pedido nuevo»** (tres en el formulario y el de
  `borrado` del servidor). Ahora dicen: «antes de volver a cargarlo, confirmá con administración que de verdad lo
  borraron». Si alguna vez es un falso aviso, así no termina en un duplicado.
- **Pruebas**:
  - `tests/test_lectura_vieja.js`, ahora 21:
    - §4: un borrado de verdad pide dos lecturas;
    - §5: el caso de Codex, el `doGet` lento de 46 s;
    - §6: `BORRADO_CONFIRMA_MS ≥ GET_CACHE_SEG + 5 s`.

    Da **6 rojas contra `5b39386`**, el caso de Codex incluido, y 6 contra `2040720`.
  - `test_codex28_flujos`: `pasaElTiempo` hace la lectura de la sospecha. 23/23, y con la 26-a 16/7, como antes: esas
    7 son lo que necesita el servidor.
- **Lo que sigue abierto (dicho a Codex y al dueño)**:
  - con la 26-a, la página sola no cierra todas las recreaciones de un pedido borrado: hace falta la 28-a;
  - para una garantía de frescura, un `.gs` futuro tiene que decir en cada respuesta de qué lectura sale (hoja o
    caché, y de cuándo). La 28-a no lo hace.

**Batería sobre esta vuelta: 110 suites, 4.173 bien · 0 mal.** Lista para publicar cuando el dueño diga.

## 4gn. 28/09: la revisión antes de publicar — la copia vieja de `doGet` y los textos de §4gm (2026-09-28) — PUBLICADA (§4go)

El dueño: *«dame el informe para codex y revisa y aviso para publicar»*. Dos agentes revisaron lo que la rama tiene y
`main` no. Uno miró §4gm (Eduardo → Multicenter); el otro, §4gl (los arreglos de Codex) con el servidor que está
implementado hoy (26-a), porque la página se publica ANTES que el `.gs` 28-a. Todo lo que encontraron se verificó y
se arregló con pruebas.

### 1. MEDIA · regresión de §4gl: la copia vieja de 20 s de `doGet` borraba de la pantalla un pedido que SÍ existe
- **Cómo pasaba:**
  - un `doGet` (el lector de afuera de §4du, o cualquier POST que Google convierte, §4fx) empieza a leer la hoja
    ANTES de un guardado y termina DESPUÉS, cuando `getCacheOlvidar_` ya corrió;
  - su foto de antes queda 20 s en la caché;
  - si en esos 20 s Google convierte el `list` del panel en GET, la página de §4gl lo tomaba por una lectura buena
    «pedida después» de la confirmación (`localManda`);
  - el pedido nuevo salía de la pantalla con «lo borraron desde otro equipo»;
  - si la vendedora lo corregía enseguida (mover la fecha relee), «tu cambio NO se guardó… hacelo como pedido
    nuevo»: una invitación a cargar un duplicado;
  - un retiro de plata desaparecía igual, sin aviso.
- La página publicada (`2040720`) no lo tenía: conservaba 90 s todo lo guardado acá. El revisor lo reprodujo con el
  `.gs` real: 3 fallas con la página nueva, 0 con la publicada y 0 con `GET_CERRADO=1`.
- ⚠️ Con los servidores 26-a y 28-a esa copia tiene la MISMA forma que una lectura buena (`{ok, version, pedidos}`):
  la página no puede distinguirla.
- **Arreglo en la página**: un pedido (o retiro) confirmado acá hace menos de **`LECTURA_VIEJA_MS` = 45 s** que la
  lectura no trae se CONSERVA. Pasado ese tiempo, un borrado de verdad se detecta como en §4gl.
  - 45 s = los 20 de `GET_CACHE_SEG` + lo que tarda un `doGet` en leer la hoja (3-5 s, §4du) + margen.
  - Cada lectura lleva cuándo se pidió (`apiList` → `_pedidaT`) y cada confirmación, cuándo llegó
    (`aplicarSello` → `SAVE_ULTIMO[id].okT`).
  - Las dos marcas salen de **`relojMs()`** (`performance.now`: solo avanza; el celular que corrige la hora no la
    mueve). El ORDEN sigue saliendo del contador `RED_N`.
  - `localManda(id, loc, srv, n0, enCola, tPed)`. Una lista sin esas marcas (una prueba que llama a `mergePending`
    directo) cuenta como pedida después de todo y sin copia vieja: `test_codex28.cjs` queda intacta.
- **Lo que cuesta, a propósito**: si otro equipo borra un pedido en los primeros 45 s después de que este lo guardó,
  este no se entera hasta la lectura siguiente pasada la ventana (antes de §4gl eran 90 s). Si en esa ventana lo
  corrige, con el servidor 26-a lo vuelve a crear, como antes de §4gl. El `.gs` 28-a lo rechaza con `borrado`.
- **Opcional (lo decide el dueño)**: `GET_CERRADO=1` en Propiedades del script cierra la puerta GET sin
  reimplementar. La página ya no depende de eso. Antes de cerrarla, mirar 📡 ¿Quién lee la planilla?
- **Pruebas**:
  - `tests/test_lectura_vieja.js` (15, nueva, a partir del guion del revisor): pedido nuevo, corrección enseguida,
    retiro, un borrado de verdad antes y después de la ventana, y que `LECTURA_VIEJA_MS ≥ GET_CACHE_SEG + 10 s`.
    Da **9 rojas** contra la página `7f4a74e` y **3** contra `2040720` (las de «detecta un borrado de verdad», que la
    publicada nunca hizo). Con el servidor 26-a: 15/15.
  - `test_codex28_flujos.js` §1-2: B borraba en el mismo segundo del guardado de A. Ahora `pasaElTiempo` corre para
    atrás el `okT` de A, como si hubiera pasado un minuto.

### 2. Los otros hallazgos del revisor de §4gl (BAJA, anotados)
- **Implementar la 28-a con equipos todavía en `2040720`**: esa página no conoce `borrado`, y su cola lo reintenta
  para siempre (una fila nueva en «Rechazos» por intento). F5 lo cura. → **Implementar la 28-a recién cuando todos
  hayan recargado**, que ya es el procedimiento.
- **Solo con la 28-a, los textos de `borrado`**:
  - el cartel del chofer dice «otra persona cambió esos pedidos… volvé a tocar ✅» sobre un pedido que ya no existe;
  - el formulario queda abierto sobre un id que ya no existe (se podría ofrecer «guardar como nuevo»).
  - Pendiente para antes de implementar la 28-a.
- **Hueco de la 28-a (no es regresión)**: la regla exige `rev>0`. Una fila nunca sellada (anterior a §4ce, o un
  borrador de Kommo) todavía se recrea desde una copia vieja.
- En `test_codex28.cjs` (la de Codex, intacta) hay dos puntos débiles: `mergePending([])` sin marcas, y una
  comprobación que pasa en vacío. Lo que no cubre, lo cubren `test_codex28_flujos` y `test_lectura_vieja`.

### 3. Los hallazgos del revisor de §4gm (todos BAJA, arreglados)
- **Una consignación de Eduardo a Multicenter mal escrita («MULTICENTER CONSIGNADO», «(CONSIG.)») contaba como
  demanda.** La excepción ahora usa `stockPareceConsignacion` (`/\bCONSIG/`): ante la duda queda afuera, como antes.
  Los puntuales de los OTROS vendedores siguen con «CONSIGNACI…» (`stockEsConsignacion`), sin cambios.
- **Multicenter se definía en dos lugares** (`STOCK_PUNTUAL` copiaba la expresión). Ahora `stockPuntual` usa
  `stockEsMulticenter`/`stockEsConsignacion` y `STOCK_PUNTUAL` no existe más.
- **«Lo vendió Eduardo:»** salía también cuando lo único vendido era un Multicenter de otra vendedora, una
  consignación o ROHO a tienda (venía de antes). Ahora `stockUnicoQuien(o)` dice quién fue.
- **«0 de eduardo, excluidas»** salía al lado de «incluye 6 de Eduardo a Multicenter». Sin pedidos únicos, la «Base
  de rotación» ya no lo dice, y «Eduardo» va con mayúscula.
- **Lo que se copia para la fábrica** (`copiarProducir`, `copiarStock`) ahora dice cuánto es de Eduardo a
  Multicenter. El cierre del mes dice lo que es: lo probable entre 30, 60 y 90 días, el mismo mes del año pasado y la
  tendencia. Antes decía «lo vendido en 30 días».
- **Yo había escrito que la regla cambia el cuadrito del formulario, y no lo cambia.** El cuadrito usa lo pendiente
  de TODOS, los almacenes y la fábrica, nunca el ritmo ni `stockPedidoUnico`. Lo pendiente de Eduardo ya contaba.
  Corregido en `CLAUDE.md`, en §4gm y en el informe. La prueba ahora COMPARA el cuadrito con la página publicada:
  da igual.
- **Las pruebas solo miraban que los números subieran.** Ahora comparan los números exactos del ejemplo:
  - rotación media → alta y reserva 3 → 7;
  - 7 días 1 → 12 y pedir 3 → 14;
  - 15 días 9 → 22 y octubre 15 → 22;
  - en `test_adm_alta`, octubre 9 → 24.
- **No se pudo verificar**: si en los pedidos de Eduardo a Multicenter «MULTICENTER» va en el cliente o en
  «Facturar a». La regla mira el cliente, igual que la exclusión de siempre. Se le preguntó al dueño.
- `tests/test_eduardo_multicenter.js`: 35. Da **21 rojas** contra `2040720`, entre ellas los tres textos nuevos.

**Batería sobre esta vuelta: 110 suites, 4.167 bien · 0 mal.** Listo para publicar la página cuando el dueño diga.
Al publicar hay que hacer lo mismo que en `2040720`: unir la rama sobre `main` con los commits del robot incluidos
(tableros de Kommo) y que todos hagan F5. El `.gs` 28-a va después, con todos ya recargados (punto 2).

## 4gm. 28/09: las ventas de Eduardo A MULTICENTER entran a la proyección de stock (2026-09-28) — PUBLICADA (§4go)

El dueño (10:49): *«Necesito que la proyección de stock incluya las ventas de Eduardo a Multicenter, conservando las
demás reglas actuales»*, con la regla exacta: Eduardo → Multicenter entra al histórico y a la demanda; Eduardo → otros
clientes sigue afuera; Multicenter de otro vendedor, sin cambios; consignación y los otros puntuales, afuera; las RPT no
son ventas, siguen en «Qué va a pedir cada tienda» y eso no se suma a «Qué producir»; lo pendiente compromete una sola
vez; **«mantén los umbrales actuales de rotación: incluir estas ventas no significa convertir una compra grande aislada
en demanda recurrente automáticamente»**. Pidió implementar y probar, **no publicar**. Después: *«¿y la de 7 días?»*.

**La regla, en un solo lugar** (`stockPedidoUnico`, en este orden):
1. una RPT nunca es venta (`esRPT`);
2. **Eduardo → Multicenter es demanda** (`stockEduardoMulticenter` → `false`);
3. `stockPuntual` sin cambios: Multicenter de otro vendedor, consignación, ROHO a «TIENDA n»;
4. las otras ventas de Eduardo, afuera.

Las identidades se definen UNA vez y las usan la exclusión y la excepción:
- `stockEsMulticenter(p)`: la PALABRA ENTERA «MULTICENTER» en `normNombre(p.cliente)`, la misma regla que ya usaba
  `STOCK_PUNTUAL`. No hay id de cliente: el pedido no lo trae y Kommo tampoco lo manda. Los tableros de ventas del
  repo (mayo a agosto) lo escriben siempre «MULTICENTER»/«Multicenter», y aparece todos los meses.
  ⚠️ «MULTI CENTER», «MULTICENTRO» o «multi» a secas NO son Multicenter, a propósito: el dueño pidió no usar
  coincidencias amplias (MULTIESPUMAS).
- `stockEsConsignacion(p)`: manda siempre, también sobre Multicenter.
- `stockEsEduardo(p)`: la palabra «eduardo» en el vendedor, la prueba de siempre.

**Dónde entra** (todo pasa por `stockPedidoUnico`, no hubo que tocar cada cuenta):
- el ritmo de 15 días (`vendidosRotacion`, `nVentasRotacion`, `sem`), que da rotación, margen, reserva, 🚨 pedir /
  recoger / fabricar y la columna **7 días** de «Qué producir» (`o.fabricar`);
- los 30 días (`v30`, `n30`, `porDiaMes`) → la estimación «30 d» y «el mes»;
- `ventasPanelIndex` → «60 d», «90 d» y la tendencia;
- el mensaje a fábrica (`copiarStock`, `copiarProducir`).

⚠️ **Corrección de §4gn**: acá decía que también entraba al cuadrito del saldo del formulario, y NO. El cuadrito usa lo
pendiente de todos (`comp`), los almacenes y la fábrica, nunca el ritmo ni `stockPedidoUnico`. Da igual que antes.

`vendidosEduMc`/`v30EduMc` cuentan cuánto de eso es Multicenter, solo para los textos.

**Qué no cambia:**
- lo pendiente (`comp`) se cubría y se sigue cubriendo una vez: `max(comp, ritmo)`;
- `porDiaTodo` (plata parada) ya contaba todo;
- `stockTiendas`: la RPT sigue en `r` y la venta de tienda en `v`, y no se suma a «Qué producir»;
- **los umbrales**: `STOCK_VENTAS_MIN`=3 entregas distintas, `alta` con ≥15 unidades en ≥2 tramos.

**Cachés:** ninguna guarda la regla vieja. `ventasPanelIndex` se arma de cero cada vez (§4ec) y `SALDO_CACHE` se
renueva con cada lectura (`SALDO_GEN`). Todo sale de los pedidos en cada lectura, así que las ventas ya cargadas
entran solas con el F5: no hay nada que migrar.

**Textos:**
- la cabecera de «Qué producir»: «Sale de los pedidos del panel: ventas del equipo + ventas de Eduardo a Multicenter;
  sin otras ventas puntuales (las demás de Eduardo, Multicenter de otros vendedores, consignación, ROHO a tienda) ni
  reposiciones de tienda (RPT)… Los meses de antes de agosto 2026 salen del sistema de ventas, que no dice vendedor ni
  cliente: ahí están todas las ventas.»;
- las líneas de 15 d y 30 d de cada fila («· 8 de Eduardo a Multicenter»);
- la tabla de stock («Equipo: … (incluye N de Eduardo a Multicenter)»);
- «Base de rotación»;
- la etiqueta de la estimación de 30 d.

**⚠️ Límite del histórico (no se inventó ninguna separación):** `VENTAS_HIST` (el «CONSOLIDADO ROTACION PRODUCTOS
MULTIESPUMAS.xlsx», ene-25 a jul-26) tiene código, descripción, medida y unidades por mes. **No dice vendedor ni
cliente** y trae TODAS las ventas del sistema (Eduardo, Multicenter, ROHO, consignación). Ahí no se puede ni sacar
ni agregar a Multicenter. Lo usan:
- «mismo mes del año pasado»;
- el divisor de la tendencia (`H[apAct]`);
- los meses de antes de 2026-08 en 60 d / 90 d. Al 28/09, 60 d = agosto (panel) + julio (sistema), y 90 d =
  agosto + julio + junio.

O sea: 60 d, 90 d y la tendencia mezclan meses del panel (equipo + Eduardo a Multicenter) con meses del sistema
(todo). La mezcla ya existía antes con «solo el equipo»; con Multicenter adentro, la diferencia se achica.

**Números (prueba, TITANIO ICE 160x190, acá 3 · Moreno 2, los mismos pedidos, reloj el 10/09):**

| | antes (`2040720`) | después |
|---|---|---|
| 15 d: unidades · entregas | 10 · 5 | 18 · 6 (8 de Multicenter) |
| rotación · por día | media · 0,667 | **alta** · 1,2 |
| margen · reserva (días) | 2 · 3 | 4 · 7 |
| pedir (recoger · fabricar) | 3 (2 · 1) | 14 (2 · 12) |
| «Qué producir»: 7 d · 15 d · octubre | 1 · 9 · 15 | 12 · 22 · 22 |
| 30 d: unidades · entregas · por día | 18 · 9 · 0,6 | 32 · 11 · 1,067 (14 de Multicenter) |
| índice agosto · septiembre | 14 · 10 | 32 · 18 |

**Dos efectos para que decida el dueño** (se le dijeron; los umbrales son los de siempre):
1. **Los umbrales miran el producto, no la compra.** Las 8 de Multicenter se suman a las del equipo, y con 18
   unidades en 2 tramos el TITANIO pasa de `media` a `alta` (reserva de 3 a 7 días). Sola, una compra grande no arma
   ritmo: 40 en UNA entrega queda en `baja`, sin ritmo, y no pide nada (probado).
2. **El plan del mes que viene no tiene umbral de entregas, para nadie.** Nunca lo tuvo: 60 d y 90 d promedian meses
   enteros. Con el producto rotando por el equipo, una compra única de 40 de Eduardo a Multicenter en agosto sube
   «producir en octubre» de 9 a 24 (`test_adm_alta` §3). Lo mismo pasa con una venta grande del equipo. Es el caso
   de §4ev, que ahora vale para Multicenter porque el dueño lo pidió en el índice. La mediana de las cinco
   estimaciones amortigua pero no alcanza: en ese caso suben 60 d (8,7 → 29,1) y 90 d (12,2 → 25,8), y la mediana
   salta a la tendencia (24), que ya estaba alta.

**Decisión del dueño (28/09, después del informe):** *«las compras de 40 de Multicenter no las subiré al panel para
no entorpecer los pedidos regulares, creo que sería mejor»*. No se agrega ningún tope nuevo al plan del mes: las
compras grandes y sueltas de Multicenter quedan FUERA del panel, y el plan sale de los pedidos regulares. Se le avisó
lo que cuesta no cargarlas:
1. Si esas unidades salen de un depósito contado (acá, Banzer, Moreno), el panel no se entera hasta el Excel de
   existencias siguiente. Mientras tanto las ve libres: el cuadrito del saldo dice «disponible» y la revisión
   automática puede asignarlas a pedidos regulares. Si la compra se cierra días antes de entregarla, tampoco las
   aparta.
2. Si hay que fabricarlas, «Qué producir» no las pide.

Se propuso cargarlas con una marca en el cliente («PEDIDO ÚNICO») que las volviera pedido único. **El dueño lo
descartó** (28/09): *«los pedidos grandes se los mando directo a logística, no entran por el panel, para no
entorpecer las rotaciones… no nos compliquemos»*. Explicó cómo funcionan: *«los pedidos de Eduardo que son grandes
normalmente no se sacan del almacén, se fabrican para no perjudicar a los vendedores, salvo que haya un 50% de stock
del pedido grande y permita dejar un saldo a los vendedores»*. Lo decide logística, fuera del panel.
⚠️ **No volver a proponer la marca ni una regla del 50 % en el panel.** No se tocó código.

**Pruebas:**
- `tests/test_eduardo_multicenter.js` (nueva). Abre la página nueva y la publicada `2040720` con los MISMOS
  pedidos sintéticos, y cubre las 7 validaciones del dueño más la compra grande sola, los textos y el ejemplo.
  29 bien; **17 rojas** contra `2040720`, y ahí pasan las de «lo que no cambia».
- `tests/test_adm_alta.js` §3, cambiada a conciencia: la venta de 40 de Eduardo pasó a «CLIENTE MAYORISTA» (sigue
  afuera), `conEduMc` es la excepción (índice 6 → 46, octubre 9 → 24) y la cabecera tiene el texto nuevo.
- Las 20 pruebas de stock (`test_producir`, `test_rotacion`, `test_rpt`, `test_ventas_panel`, `test_banzer*`,
  `test_stock*`, `test_saldo_almacen`, `test_rev8_saldo`, `test_circuito.cjs`…) quedan en verde sin tocarlas.
- Batería completa: 109 suites, 4.145 bien · 1 mal. La roja fue `test_rev2_cuadre` («con el extracto 1.500,50 el
  cuadre CIERRA (pantalla)»), intermitente y de antes: ya había salido en la batería de §4gl. La cuenta daba 0, pero
  la tarjeta todavía no se había repintado: el Cuadre repinta con un `setTimeout` de 0 (`CUA_ARQ_T`, §4gc) y la prueba
  miraba a los 40 ms fijos. Ahora espera el repintado (hasta 2 s): 7/7, cuatro de ellas corriendo a la vez.

**Estado:** en la rama `claude/pedidos-fecha-entrega-bgt0em`, **sin publicar**, junto con §4gl (tampoco publicada).

## 4gl. 28/09: la revisión de Codex del informe §15 — un pedido borrado que volvía, y tres más (2026-09-28)

El dueño le pasó a Codex (ChatGPT) el informe §15 y trajo su respuesta con una prueba, `tests/test_codex28.cjs` (5
aserciones rojas y 3 controles contra `2040720`). Se reprodujeron los cuatro hallazgos tal cual, y los cuatro quedaron
arreglados con pruebas que fallan antes:

1. **ALTA · un pedido borrado desde otro equipo volvía.** `mergePending` conservaba 90 s todo lo guardado acá que la
   lectura no traía (§4gg), sin distinguir una lectura **atrasada** de un **borrado**; y el servidor, si la fila no
   estaba, la agregaba aunque llegara con sello. Editar esa copia la volvía a CREAR en la planilla.
   - **Panel**: cada lectura lleva en qué momento se pidió (`apiList` → `_pedidaN`) y cada guardado confirmado, en qué
     momento se confirmó (`aplicarSello` → `SAVE_ULTIMO[id].okN`). Pedida después de la confirmación, la planilla ya lo
     tenía: si no lo trae, lo borraron → sale de la pantalla y avisa una vez (`borradoFuera`, `BORRADO_FUERA`). Pedida
     antes, es atrasada y manda lo de acá (como en §4gg).
     ⚠️ **Es un CONTADOR (`RED_N`), no la hora.** La primera versión usaba `Date.now()` y con el reloj quieto de las
     pruebas (y un celular que corrige la hora solo) «antes» y «después» daban el mismo milisegundo: `test_rev5_pedidos`
     §4 lo hubiera roto.
   - `submitPedido`: la lectura de justo antes de guardar puede mostrar que el pedido que se edita ya no está → **no
     guarda** y dice «lo borraron desde otro equipo mientras lo tenías abierto». Antes `guardarYa` lo volvía a poner y,
     con el servidor 26-a, lo recreaba.
   - **Servidor `.gs` 2026-09-28-a** (en el repo, SIN implementar): un guardado CON sello de una fila que no existe se
     rechaza con `borrado` (sin tocar la hoja; queda en «Rechazos»). No cuenta para las filas fijas del sistema
     (`filaFijaSistema_`: todo `__…` salvo los retiros `__ret_…`, que son plata), que pueden volver a nacer; un pedido
     nuevo no trae sello, y el reenvío de un alta cuya respuesta se perdió sigue siendo `conflicto` (el «ok tardío»).
     El panel conoce `borrado` (`RECHAZOS_FIRMES`): lo saca de la pantalla y de la cola, lo anota en sus rechazos con lo
     que se perdió (`rechazoPerdido(rec, {})`: el ✅, los cobros, las fotos, para el cartel del chofer) y avisa.
   - **Qué cubre cada mitad** (`test_codex28_flujos.js` con la página nueva y el servidor 26-a: 16/7): el panel solo ya
     cierra lo que reprodujo Codex (la lectura y la edición con relectura). Una corrección **sin** relectura (no mueve la
     fecha ni cambia productos), una ficha abierta, la cola de un celular sin señal o una pestaña vieja **necesitan el
     `.gs` 28-a**: con la 26-a lo siguen recreando, igual que antes de esta vuelta.
   - ⚠️ **Límite que queda**: `doGet` contesta con la misma forma que la lectura por POST y sale de una caché de 20 s
     (§4du). Si Google convirtiera la lectura del panel en GET (§4fx) y la caché fuera de antes de un guardado, un pedido
     recién guardado podría desaparecer de la pantalla hasta la lectura siguiente (con el aviso). No se pierde nada en
     la planilla. Se resolvería con la hora de lectura del servidor en la respuesta (otra versión del `.gs`).
2. **MEDIA · una recogida para el 05/10 se prometía «en 1 día».** `saldoVeredicto` sumaba lo que va en una recogida
   programada (`enRecogida`) a Moreno y prometía el plazo genérico. Ahora `saldoEntradas` ordena por fecha lo que no
   está a mano: lo que sigue en Moreno (se trae en `STOCK_DIAS_RECOGIDA`) y cada recogida con SU fecha (`llega` = la
   que eligió logística); `enRecogida` se reparte entre las recogidas pendientes sin pasarse, así que el total no
   cambia. Se consume por fecha, primero lo ya vendido. Cartel nuevo: «🚚 VIENE DE MORENO · logística lo trae el lunes
   05/10: programá desde el martes 06/10 (si logística la puede adelantar, que te lo confirme)», y si ya pasó la fecha,
   «la recogida era para el… y todavía no llegó: confirmala con logística».
3. **MEDIA · una revisión más nueva se tapaba 90 s.** `localManda(id, loc, srv, n0, enCola)`: un guardado en vuelo,
   esperando turno o en la cola manda acá (como siempre); uno ya confirmado, si la lectura trae la fila, gana el sello
   MAYOR (la de acá si la otra es igual o más vieja). También para los retiros.
4. **BAJA · sin cupo en 60 días se prometía un día cerrado.** `saldoDiaConCupo` devuelve `{ f:'', sinCupo:true }` y
   `saldoPonerDia` no promete ningún día: «✅ HAY EN ALMACÉN · ⚠️ SIN CUPO: no queda ningún turno de entrega libre en
   los próximos 60 días: consultá con logística antes de prometer una fecha», en ámbar. Lo mismo en ⏳ 🏭 📐 🚚.

**Pruebas.**
- `tests/test_codex28.cjs` (la de Codex; solo se le agregó la línea «N bien · N mal» y el JSON va a la carpeta
  temporal): 8/8.
- `tests/test_codex28_flujos.js` (nueva): dos equipos contra el `.gs` real, formulario, borrado, cola sin señal, revisión
  más nueva y lectura atrasada. 23; **13 rojas** contra la página `2040720` con el servidor 26-a; los 4 controles pasan en
  las dos versiones.
- `tests/test_rev8_saldo.js` §10-11: la recogida con fecha y el sin cupo, como los ve la vendedora. 66; **9 rojas** contra
  `2040720`.
- `test_saldo_almacen` sigue en 84.
- Batería: 108 suites, 4.116 bien · 0 mal. La primera corrida dio 7 rojas en `test_servidor` §11: el literal
  `ESTA_VERSION` de `probarAntesDeImplementar` seguía en 26-a (el dueño hubiera visto «quedó código VIEJO» al probar).

**Decisión del dueño (28/09):** la página queda en la rama **sin publicar** («Esperar»); el `.gs` 2026-09-28-a, «más
adelante»; validar el stock en el servidor, «más adelante». ⚠️ La rama (`7f4a74e`) ya difiere de `main` en la página: la
próxima publicación lleva estos arreglos, y la página espera la 28-a (línea gris en «Cerrar día» hasta implementarla).

**Lo que Codex recomendó y NO se hizo (decisión del dueño):** validar el stock en el servidor al guardar (reservar la
última unidad bajo el candado). Codex coincide en no bloquear la venta sin stock y pide, antes, definir en el servidor
las MISMAS reglas que `stockData`. Es un cambio grande del `.gs`.

## 4gk. 27/09: la revisión del cuadrito del saldo — la medida especial y el código de otra medida (2026-09-27)

El dueño, apenas publicado §4gj: *«Después ponés un agente a revisar que no haya errores en pedidos y este nuevo
método»*, y enseguida: *«¿Y qué pasa cuando es medida especial?»*. Un agente revisó el cuadrito y Pedidos contra lo
publicado (`fecb3c6`) y encontró cinco errores, todos arreglados (`8550355`, `89512b1`):

1. **ALTA · la medida especial prometía stock que no existe.** Con «Otros» + «150x200» y el código que deja la lista
   (CH1201 = TITANIO ICE **160x190**), `stockInfo` va por el código y el cuadrito decía «✅ DISPONIBLE · En almacén 4»:
   el saldo del 160x190. Sin código salía gris («revisá el nombre y la medida»). Un colchón a medida **se fabrica a
   pedido y nunca sale del stock** (igual que el importador de Kommo, `buscaCatalogo` → `'medida-especial'`). Ahora:
   azul **«📐 MEDIDA ESPECIAL · se fabrica a pedido: decile al cliente que espere ~X días»**, sin números de almacén.
   X = lo que tarda la fábrica de ESE modelo (`saldoLeadModelo`: el de su medida estándar, o cualquier medida del mismo
   modelo con fábrica conocida; si no, `STOCK_DIAS_FABRICA`) + 1 día, llevado al primer día con cupo. Línea roja si la
   fecha elegida es antes. Si el renglón conserva el código de la medida estándar, avisa «borralo de este renglón, o el
   almacén saca ese colchón». En la pregunta al guardar: «medida especial: se fabrica a pedido, ~X días».
   **No es especial** (`saldoMedidaEspecial`): una medida estándar escrita distinto («160X190CM», «160 x 190»,
   «2 plazas», «1,60 x 1,90» → `saldoMedidaCanon`); un producto del catálogo en su propia medida (la cuna 65x100); lo que
   algún Excel del almacén tiene con ese nombre y esa medida (`stockHayEnInventario`).
   ⚠️ Decidido por el agente: un producto que nadie conoce en una medida NO estándar ahora es 📐 especial, no gris. Por
   eso el ejemplo «producto desconocido» de `test_saldo_almacen` pasó a una medida estándar (a conciencia).
2. **ALTA · el código de otra medida.** Se elige TITANIO ICE 160x190 de la lista (llena CH1201) y después se cambia la
   medida a 140x190: el código queda y el stock va por el código, así que decía «✅ DISPONIBLE» con los 4 del 160x190
   cuando del 140x190 no hay ninguno. Ahora (`saldoCodigoOtro`): ámbar «⚠️ EL CÓDIGO ES DE OTRA MEDIDA · CH1201 es
   TITANIO ICE 160x190… El de 140x190 es CH1220», y pregunta al guardar. «Otro producto» solo cuando el nombre es
   CLARAMENTE otro del catálogo y no contiene al del código («TITANIO ICE PLUS» contiene a «TITANIO ICE»: no avisa). Un
   código del catálogo para medida «ESPECIAL» (SOMIER BiRELAX) va con cualquier medida.
3. **MEDIA · lo que ya se fabrica para ESE pedido.** Editando un pedido con una línea que logística ya mandó a fabricar
   para ese cliente (`enProduccion`), `stockData` la cuenta aparte y el cuadrito decía «🏭 NO HAY · hay que mandar a
   producir (avisá a logística)»: la vendedora podía pedirla dos veces. Ahora «🏭 SE FABRICA PARA ESTE PEDIDO en Moreno
   (pedido el 22/09, llega ~25/09)», o verde si ya llegó. Solo con la MISMA `prodClave` y la MISMA cantidad (la regla de
   `heredarMarcas`): si cambia la cantidad, vuelve a salir del almacén.
4. **BAJA · una ATC que al editarla pasa a 📄 OC** (§4gg) no preguntaba nada al guardar: la ATC no contaba en el stock
   (`stockCuenta`) y ahora sí. Se mira todo, como un pedido nuevo.
5. **BAJA · en una RPT** la pregunta dice «¿Le avisaste **a la sucursal**…?».

**Cómo quedó por dentro.** `saldoClasificar` le pone a cada renglón su grupo `f.g` (`esp|…`, `cod|…`, `fab|…` o la
clave de stock): los renglones se suman por grupo, y `saldoFilasAGuardar` clasifica el pedido guardado con el mismo
grupo. Solo lo que sale del almacén (`saldoDelAlmacen`) pide lectura y muestra «Consultando…»; 📐 🏷️ 🏭 se contestan
enseguida. `stockData()` da exactamente lo mismo que antes de §4gj (comparado contra `bd5dde3`).

**Verificado por el agente:** Banzer, Moreno, recogidas en camino, discontinuados, Eduardo y RPT en pendientes, conteo
negativo, dos renglones del mismo producto, cantidad 0 o cambiada; el pedido editado no se cuenta a sí mismo; días
(miércoles, viernes, sábado, fin de mes) iguales al formulario y al servidor; la pregunta no se duplica con cupo lleno,
día cerrado ni fecha pasada; Cancelar no guarda. Con 900 pedidos y el celular 4 veces más lento: 33–67 ms el primer
pintado, 1–3 ms por tecla; sin errores de consola ni desborde en 360 px.

**Pruebas.** `tests/test_rev8_saldo.js`: 36 comprobaciones, 23 rojas contra `fecb3c6` (reloj clavado en el miércoles
23/09/2026). Batería sobre `89512b1`: 106 suites, 4.054 bien · 0 mal.

**Lo que decidió el dueño (27/09, con las fotos de antes y ahora) y cómo quedó:**
- **«Borrarlo solo»**: el código de la medida estándar en un renglón de medida especial se borra solo
  (`codigoEspecialBorrar` + `saldoCodigoDeEstandar`), con un aviso «📐 Borré el código CH1201: es del TITANIO ICE
  160x190, y esta es una medida especial (se fabrica a pedido)». Cuándo: al SALIR del campo «Otros» (`change`: letra por
  letra, «160x19…» todavía no es especial) y al empezar `submitPedido` (por si se guardó con Enter). No se borra: una
  medida estándar escrita distinto, un código del catálogo PARA medida especial (SOMIER BiRELAX «ESPECIAL»), un código
  que el catálogo no conoce, un renglón sin nombre, ni **un renglón ya guardado tal cual** — lo que puso logística (✔,
  🏭, las fechas de fábrica) lo sigue por `prodClave` (`heredarMarcas`), y borrarle el código se lo sacaba. Ahí el
  cuadrito sigue diciendo «borralo».
- **Borradores de Kommo: no se cuentan** hasta completarlos (como estaba).
- **🔄 Actualizar: una lectura cada 15 s como mucho** (`SALDO_BOTON_MS`): con una lectura buena de hace menos, repinta
  y dice «✅ El saldo ya está al día: se leyó hace N s. Se puede volver a leer en M s.». Con la última lectura fallida
  lee igual (es lo que se quiere reintentar).
- **Publicar** apenas pasen las pruebas.
- Y sin preguntarle, dos que salieron al hacerlo:
  - **🏭 va antes que 📐** (`saldoClasificar`): una medida especial es justo lo que logística manda a fabricar, y la ya
    pedida para ESE pedido decía «esperá ~X días» contados desde hoy, con una línea roja que no correspondía. Ahora dice
    «🏭 SE FABRICA PARA ESTE PEDIDO… llega ~DD/MM». Con otra cantidad vuelve a 📐.
  - **El filtro «🔵 Especiales»** y el celeste de la fila (`hasEspecial`, también en el Excel) ya no marcan «160X190CM»
    ni «1,60 x 1,90» (`saldoMedidaCanon`).
- `test_rev8_saldo.js` §6-9 (19 más: 55 en total; 10 rojas contra `89512b1`). `test_saldo_almacen` cambió a conciencia
  el 🔄: con la lectura de recién no lee, pasados 15 s sí (84; 1 roja contra `89512b1`).

**Publicado el 27/09 a las 12:58 de Bolivia**: `main` = `2040720`, Pages 1532 en verde, sin tocar el servidor (sigue 2026-09-26-a). Batería
sobre `baa7e81`: 106 suites, 4.074 bien · 0 mal. ⚠️ La corrida anterior dio 7 rojas en `test_ubic` (6) y
`test_rev2_cuadre` (1), dos pestañas que este cambio no toca: solas pasaron 4 veces seguidas y otra con carga, y la
batería siguiente salió entera en verde (misma cuenta total). `test_ubic` mide un «servidor lento a propósito» con
relojes de verdad: con 4 suites en paralelo puede perder la carrera. Para ver el detalle de una falla así, correr una
copia de `correr.sh` que guarde la salida de cada suite con ✗ (la batería solo guarda el resumen).

## 4gj. 27/09: el saldo del almacén debajo de cada producto del formulario (2026-09-27)

**El pedido fue cambiando en la misma mañana, y quedó así:**
1. *«Los vendedores no saben cuál es el stock… una pestaña de "saldo de almacén" con los 3 almacenes, buscador, que se
   actualice con los cortes y descuente entregas y pendientes.»*
2. *«Mejor un buscador: colocar el código y aparece el producto, 3 pendientes, 1 en producción, "pedí a tu cliente que
   espere 72 horas", o "podés programar para tal día".»*
3. *«¿Y no hay manera que en vez de crear una nueva pestaña… aparezca un mensaje cada vez que carguen su pedido y
   coloquen el producto?»* Con el ejemplo de ALMOHADA 50×70 CD1403, y el recordatorio *«tenés que tomar en cuenta lo que
   ya está pendiente de entrega con los saldos de almacén»*.
4. Para el aviso eligió **«Cuadrito + alerta al guardar»**.
5. *«Debe actualizarse constantemente… logística carga el corte a las 9 y hasta las 3 ya ingresaron 9 pedidos.»*

**Lo que se hizo.** Un agente lo armó, con los cambios de rumbo pasados por mensaje: `9c7437b`. Las reglas están en
CLAUDE.md, «📦 El saldo debajo de cada producto del formulario».

**Decisiones del dueño (27/09).**
- La línea roja «para esa fecha no llega: programá desde…» se queda.
- Publicar apenas pasen las pruebas.
- Quedó como está, sin preguntarle:
  - los «~X días» son días reales hasta el primer día con cupo, en vez de «72 horas» fijas;
  - «Libres» incluye Moreno;
  - lo de Moreno se ofrece desde el día siguiente a traerlo;
  - un producto que no está en el catálogo ni en ningún Excel sale gris;
  - una edición que cambia productos también relee la planilla antes de guardar.

**Pruebas.** `tests/test_saldo_almacen.js`: 83 comprobaciones, 73 rojas contra `bd5dde3`. Incluye el caso del dueño con
dos vendedores contra el `.gs` real: después de los 9 pedidos de A, B ve «10 · 9 · 1 libre».

**Publicado el 27/09 a las 11:16 de Bolivia**: `main` = `fecb3c6`, Pages 1531 en verde, sin tocar el servidor.
Batería sobre `9c7437b`: 105 suites, 4.018 bien · 0 mal.

## 4gi. 26/09, noche: «Nuevo pedido» y «Mis pedidos» desde el celular (2026-09-27)

El dueño: *«¿Y pedidos, esa pestaña está bien? Poné un agente»*. Esas pestañas ya se habían revisado en §4gg, así que el
agente las usó como una vendedora, **en un celular** (390 y 360 px, con toques), y terminó los 4 detalles que quedaban
(`a819011`).

**Lo que encontró.**
1. **ALTA. «＋ Nuevo pedido» pisaba otra venta.** Se abría ✏️ Editar, se salía por la pestaña sin «Cancelar edición» y,
   más tarde, «＋ Nuevo pedido» seguía siendo esa edición. El cliente nuevo reemplazaba a la venta anterior en la
   planilla, con su OC. Ahora `tabNuevoPedido` pregunta.
2. **MEDIA. Los avisos no se leían en el celular.** Salían como una columna de 195 px de ancho y hasta 358 de alto,
   tapaban Guardar y duraban 2,8 s con 234 letras.
3. **BAJA. Los cuatro de §4gg:**
   - la venta de tienda corregida terminaba en Contabilidad con el mensaje de venta nueva;
   - los contadores de Mis pedidos;
   - un pedido sin turno se guardaba como AM;
   - el pago mixto traía datos de otra edición.

Lo demás en el celular anda bien: nada se sale de la pantalla, los botones se pueden tocar, los campos de plata abren el
teclado numérico y se guarda lo que se ve.

**Decisiones del dueño (26/09, ~22:30).**
- Los contadores cuentan por **ENTREGA**, como antes, y el cartel lo dice. El agente los había pasado al día de carga;
  se volvió atrás en `77e1dc9`.
- De las mejoras propuestas para el celular eligió solo una: **los botones de filtro, justo arriba de la lista**.
- Quedan sin hacer, porque no los eligió:
  - el encabezado alto;
  - el aviso antes de perder un pedido a medio escribir al abrir otra edición;
  - los botones chicos;
  - los detalles de la venta de tienda.

**Pruebas.** `tests/test_rev7_celular.js`: 35 comprobaciones, 20 rojas contra `13d00ee`. La batería sobre `a819011` dio
104 suites, 3.933 bien · 0 mal, y sobre `77e1dc9`, 3.935 bien · 0 mal.

**Publicado el 26/09 a las 23:14 de Bolivia**: `main` = `bd5dde3`, Pages 1530 en verde, sin tocar el servidor.

## 4gh. 26-27/09: las dos decisiones de plata del dueño en el formulario (2026-09-27)

El dueño decidió el 26/09 a las 20:37, con las opciones a la vista:
- corregir el precio de una venta con pagos registrados CONSERVA los pagos;
- «SÍ, pagado» al editar deja el adelanto en su día y anota el resto HOY como un cobro nuevo.

Un agente lo hizo: `7e5c5b8`, en la rama `8194622`. Las reglas están en CLAUDE.md, §4gg «Decidido por el dueño… hecho en
§4gh». Además arregló cinco huecos que dejaban esos cambios:
- «SÍ, pagado» proponía 3.200 en una venta de 3.000 con adelanto mixto;
- «Usar como total» no descontaba los cobros registrados;
- no se podía guardar con saldo 0 teniendo cobros aparte;
- la imagen de un pago ya registrado frenaba el guardado de una venta sin adelanto (no se le podía corregir ni la
  dirección);
- SÍ y después NO dejaba «A cuenta» y «Saldo» en 0 (era uno de los BAJA de §4gg).

**Lo que van a notar las vendedoras.** Con «SÍ, pagado» sobre una venta con adelanto, el formulario pide la imagen del
pago del resto (QR o tarjeta), igual que Contabilidad. El cobro nuevo lleva de recibo el N° de nota de la venta.

**Queda.** En una venta YA pagada, cambiar desde el formulario el reparto del pago mixto sigue rehaciendo el pago con
fecha de hoy. Pregunta antes, como siempre: la decisión del dueño no cubre este caso.

**Publicado el 26/09 a las 21:21 de Bolivia**: `main` = `13d00ee`, Pages 1529 en verde, sin tocar el servidor.
Batería sobre `8194622`: 103 suites, 3.900 bien · 0 mal.

**Pruebas.**
- `tests/test_rev6_plata_form.js`: 52 comprobaciones, 42 rojas contra `e1e207b` (las otras 10 son controles).
- `test_rev5_pedidos` 8a exigía un solo renglón de hoy; se cambió a conciencia.

## 4gg. 26/09, noche: revisión de Pedidos a fondo (2026-09-26)

El dueño, molesto: *«¿No que no había errores? Llevás 3 días con agentes, decís que no hay más errores y aparecen más.
¿En pedidos no hay más? Poné agente»*. Se le dijo la verdad: no se puede prometer cero errores; sí, que cada uno que
aparece queda con su prueba vigilando. Un agente revisó el uso diario de Pedidos contra lo publicado (`2c777fe`).

**Ocho errores, todos arreglados** (`084b94c`, `cbc0106`, `e1e207b`; `tests/test_rev5_pedidos.js`, 49 comprobaciones,
30 rojas contra `2c777fe`):
1. **ALTA. Venta ya cobrada editada desde el formulario.**
   - Abría el «Monto total cobrado» vacío y no dejaba guardar ni la dirección.
   - Si se cambiaba el método, el banco o el monto, decía «Cambios guardados ✓» sin cambiar nada.
   - Con saldo negativo, corregir la dirección ofrecía borrar el historial, y se perdía un QR de Bs 2.700.
2. **ALTA. Una ATC o RPT pasada a OC seguía siendo ATC**: una venta que Contabilidad no veía.
3. **MEDIA. Editar el pedido de otra vendedora** cambiaba el vendedor recordado de la compu.
4. **MEDIA. Una lectura tardía** borraba de la pantalla (y de los cupos) el pedido recién cargado.
5. **MEDIA. Una lectura vieja devolvía una venta recién eliminada**, y editarla la recreaba. Lo mismo con el borrador
   de Kommo descartado.
6. **ALTA. RPT: al corregir la sucursal quedaban la zona y el pin de la anterior.** `test_rpt` exigía lo viejo y se
   cambió a conciencia.
7. **ALTA. El flete contaba como historial**: cambios del adelanto ignorados, la «PAGADA sin monto» con flete no
   guardaba el monto, y aparecía un falso «¿borrar el historial?».
8. **ALTA. «SÍ, pagado» proponía el adelanto como total**: la venta de Bs 3.000 quedaba pagada por 500.

**Publicado el 26/09 a las 20:40 de Bolivia**: `main` = `caef927`, Pages 1528 en verde, sin tocar el servidor.
Batería sobre `e1e207b`: 102 suites, 3.848 bien · 0 mal.

**Decisiones del dueño (20:37).** Salen en la publicación siguiente, con sus pruebas:
- corregir el PRECIO de una venta con pagos registrados CONSERVA los pagos;
- «SÍ, pagado» al editar deja el adelanto en su día y anota el resto hoy como cobro nuevo.

**Quedan (BAJA), sin tocar.**
- ~~Editar una venta de tienda termina en Contabilidad con el mensaje de pedido nuevo~~ (§4gi).
- En Mis pedidos, «Hoy · pedidos cargados» cuenta las entregas de hoy, y «Este mes» no cuenta las ventas de tienda.
- Editar un pedido sin turno lo guarda como AM.
- Al activar el pago mixto pueden aparecer datos de una edición anterior.
- ~~Tocar SÍ y después NO deja «A cuenta» y «Saldo» en 0~~ (arreglado en §4gh).

## 4gf. 26/09, noche: revisión del stock y los almacenes después de Banzer (2026-09-26)

Pedido del dueño: *«pon un agente en stock y almacén a revisar que todo quedó bien»*. Un agente revisó contra lo
publicado (`39b833c`).

**Quedó bien.** Las cuentas de acá + Banzer + IM, las líneas partidas, las entregas, las fechas pasadas y el «ya
incluye las entregas del día». ATC, RPT, Eduardo y los productos de tienda no cambiaron su regla. La revisión
automática: en 8 repartos, lo que muestra es lo que escribe «Aplicar». La carga en dos bloques y los textos del
chofer. El Excel real de Banzer (solo en el scratchpad): 81 productos, 309 unidades, hora 10:30 del pie. La celda del
stock crece ~10 letras por almacén.

**Cuatro arreglos** (`ecacd93`; `tests/test_rev_banzer.js`, 25 comprobaciones, 7 rojas contra `39b833c`):
- **MEDIA, lentitud.** Con 900 pedidos, «Todos» de la carga tardaba ~1 s en un celular (antes de Banzer, 0,04 s):
  `normNombre` se llamaba 347.000 veces. Ahora `normNombre`, `stockNorm` y `stockAlmLimpio` recuerdan su resultado
  (tienen que seguir siendo PURAS). Carga 0,16 s; Administración 0,21 s; Stock 0,29 s.
- **BAJA.** Un camión con un pedido sin productos decía «se carga en .».
- **BAJA.** Un celular sin F5 que guarda el stock borraba `g[nm].inc`, y lo entregado desde Banzer ese día se
  descontaba dos veces. `leerStock` lo repone del historial.
- **BAJA.** El historial decía «(no sale camión)» para el Excel de Banzer subido con el diálogo viejo.

**Decisión del dueño (19:35).** El orden dentro de los almacenes queda como está: «el que la cubre entera» antes que
Banzer. Con 0 acá, 3 en Banzer y 5 en IM, un pedido de 4 sale entero de IM.

**Quedan para el dueño, sin tocar.**
- Tres casos de transición con recogidas de Banzer anotadas antes de las 17:15. Se resuelven cerrando o cancelando
  esas recogidas y marcando ✔ lo que ya está en fábrica; se le dijo.
- La ficha de una línea Banzer + IM enciende solo «📥 IM».
- «Qué producir» dice «sin contar» si acá no tiene Excel pero Banzer sí.

**Publicado el 26/09 a las 19:38 de Bolivia**: `main` = `2c777fe`, Pages 1527 en verde, sin tocar el servidor.

**Batería sobre `ecacd93`:** 100 suites, 3.797 bien · 1 mal. La mala fue `test_borradores` (94/1), y no se repite:
tres corridas solas, 95/0 cada una. Fue una falla suelta con la máquina cargada.

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
