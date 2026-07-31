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
- El botón sale **solo con QR** (para Efectivo no hay comprobante). Si algún día se quiere en
  Tarjeta, es agregar el método a esa condición.
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
