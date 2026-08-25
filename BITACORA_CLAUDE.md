# BITÁCORA — Dashboard Heaven Colchones

Memoria de trabajo para Claude (y futuros mantenedores). Última actualización: **2026-07-13**.
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

## 5. Pendientes
1. **Reactivar `--bake-ai`** en panel.yml cuando terminen los ajustes de diseño (el usuario avisará).
2. **Conversión global** (ficha del Pulso, hoy = cierres÷leads "caja"): decidir si pasa a cohorte. Pendiente de decisión del usuario.
3. Corregir el typo **"Instragram" → "Instagram"** en el campo Canal de Kommo (el código lo tolera).
4. Borrar `.pages-redeploy` (archivo basura de los redeploys forzados) en algún commit futuro.
5. Token Kommo expira ~2026-10-28 (secret `KOMMO_TOKEN`).
6. **Integración Kommo → panel de pedidos** (diferida 2026-07-24, decisión del usuario "dejarlo pendiente").
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
