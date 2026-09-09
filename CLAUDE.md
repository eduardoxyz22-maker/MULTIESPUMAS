# MULTIESPUMAS — Dashboard de Ventas Heaven Colchones

Dashboard automático de pipeline de ventas para **Heaven Colchones**, publicado en GitHub Pages y actualizado desde Kommo CRM.

> **IMPORTANTE**: antes de trabajar, leer **`BITACORA_CLAUDE.md`** — contiene el historial de decisiones,
> la semántica de las métricas (cohorte vs caja, fila "Cerrados de meses anteriores"), los playbooks
> operativos (regenerar meses cerrados, destrabar GitHub Pages) y los pendientes.

## URL del dashboard
https://eduardoxyz22-maker.github.io/MULTIESPUMAS/ — siempre muestra el MES EN CURSO (hora Bolivia, UTC-4).
Meses cerrados: botón **Historial** → `panel_YYYY_MM.html`.

## Arquitectura

- **`generar.py`** — Script Python (stdlib pura) que:
  1. Llama a la API de Kommo (`eanez.kommo.com`) — leads del mes, mes previo, ventana amplia de 300 días (pipeline + ventas por fecha de contrato), usuarios y eventos
  2. Calcula KPIs: conversión por cohorte, canales, origen manual/bot, rendimiento y disciplina por vendedora
  3. Inyecta `window.PANEL_DATA` (JSON) en `panel_template.html` y escribe `index.html`, `panel.html` y `panel_YYYY_MM.html`
  4. Con `--month M --year YYYY` regenera SOLO el archivo histórico de ese mes (no pisa el index)

- **`panel_template.html`** — Template React (JSX precompilado a `React.createElement`; validar con `node --check` sobre los bloques `<script>` antes de commitear). Tema claro, header teal `#00B5AD`.

- **`.github/workflows/panel.yml`** — Workflow principal: crons 14:00 y 21:00 UTC (10:00/17:00 Bolivia), push a `generar.py`/`panel_template.html`, y botón manual con inputs opcionales `month`/`year` para regenerar meses cerrados. El bot `heaven-bot` commitea el HTML regenerado.
  - La IA horneada (`--bake-ai`) puede estar pausada para acelerar iteración — ver estado en el propio yml y en la bitácora.

## Credenciales Kommo
- Subdominio: `eanez`
- Token: secret `KOMMO_TOKEN` de GitHub Actions (env var; NO está en el código). Expira ~2026-10-28.

## Panel de pedidos (`pedidos.html` + `google-apps-script.gs`)
- El backend puede exigir la **clave del equipo** (`PANEL_KEY`, propiedad del script) en toda lectura/escritura;
  sin ella configurada queda abierto y el panel lo avisa en rojo. **En espera por decisión del dueño (05/09/2026):
  no configurarla hasta que él lo pida.** Con `PANEL_KEY` puesta, forzar un día cerrado exige además
  `ADMIN_KEY` (bitácora §4cg). Kommo usa `KOMMO_HOOK_KEY` aparte.
  Ninguna clave va en el código ni en commits. Detalles y orden de despliegue: bitácora §4ce.
- Cambios al `.gs` NO se publican solos: el dueño hace Implementar → Nueva versión. Subir `SCRIPT_VERSION`
  y `SCRIPT_VERSION_ESPERADA` juntos.
- **📦 Stock y reposición** (bitácora §4cn, §4co y §4cp): fila del sistema `__stock__` con JSON
  `{c,e,p,a,g,al}` (conteo del almacén de logística, entradas, pedidos a fábrica, uniones,
  existencias de los otros almacenes, qué es cada almacén). La identidad de un producto es
  `stockInfo(x)`: catálogo `CODIGOS` por código o por nombre (palabras del catálogo ⊆ nombre,
  misma medida), y `prodRankKey` solo como crudo.
  - **El depósito se carga subiendo el reporte «EXISTENCIAS ALMACEN» del sistema de Moreno**
    (📥 Subir existencias). `PRODUCTOS TERMINADOS FAB.` = de ahí salen los camiones = «en
    depósito»; `IM - PRODUCTOTERMINADO` = la fábrica = «en fábrica», **no se suma**.
  - ⚠️ Ese generador escribe el XML con **comillas simples** y pone la cantidad en una columna
    **sin encabezado** — ver §4cp antes de tocar `xlsxHoja` o `existLeer`.
  - **🤖 Revisión automática** (§4cq, §4cr): `stockAsignar()` reparte el stock entre los
    pedidos pendientes **por fecha de entrega** (FIFO) y marca solo ✔ hay / 📥 recoger de
    Moreno / ✗ no hay. Una línea que no se cubre entera NO reserva nada. No toca líneas 🏭,
    entregados, borradores ni productos sin contar. El resultado se ve **fijo** arriba de la
    tabla (`renderRevisionFija`) y los tildes se escriben recién al Aplicar.
  - **Nombres**: «Acá en fábrica» (de ahí salen los camiones) y «Moreno» (hay que ir a
    buscarlo). El corte guarda **hora**, y al subir el Excel se pregunta si ya incluye las
    entregas de ese día (`STOCK.c.inc` → `stockDesdeSalidas()`), en vez de adivinar.
  - **Recoger ≠ fabricar**: `STOCK.p` lleva `tipo:'recogida'|'fabrica'`. Una recogida tarda
    1 día, no cuenta para medir el tiempo de fábrica, y al llegar **suma acá y resta de
    Moreno**. §4cr explica qué se tomó de la versión que trajo el dueño y qué no.
  - **Lo que NO entra al stock** (§4cx): `stockCuenta(p)` deja afuera filas del sistema,
    borradores de Kommo y **🎧 ATC** (son reparaciones: no se vende otro colchón), y
    `esProdDeTienda(x)` deja afuera **protectores, sábanas, mantas, cubrecamas y MDF** (se
    entregan en tienda, no se piden a fábrica). Se cuentan y se muestran como fichas para
    que no parezca que el panel los perdió.
    ⚠️ `PROD_TIENDA` es **lista negra a propósito**: los colchones del catálogo casi nunca
    dicen COLCHON (TITANIO LATEX, MEMORY FLEX), así que una lista blanca no sirve.
    ⚠️ MDF lleva guarda `PROD_MUEBLE`: una **cabecera/respaldar de MDF sí se fabrica**.
  - **Dos códigos son dos productos** (§4cy): un renglón del Excel con un código que
    `CODIGOS` no conoce queda con su **nombre crudo** (`stockClaveCruda`: sin medida adentro,
    sin relleno, medida aparte) y nunca se suma «por parecerse». `stockEnCatalogo` exige
    misma **familia** (SOMIER/RESPALDAR/ALMOHADA/FORRO…), no adivina en empates ni cuando
    sobra una palabra de otro producto; y el nombre exacto del almacén gana sobre el
    catálogo. `medidaDeTexto` entiende «2,0 - T.A.», «1,5 [Pr.]», «140*190».
    `tests/test_identidad.js`. Para verificar con los Excel reales: prueba en el scratchpad,
    nunca en el repo (público).
  - **`x:1` en `CODIGOS` = ya no se fabrica** (§4cz): el ESPECIAL JUNIOR (CH1075/76/78) es
    otro colchón que el antialérgico (CH2391–CH2396) y está discontinuado. `stockDescontinuadoK`
    por clave puntual; `stockCariocaDescontinuado` (§4dc) por NOMBRE para Carioca
    Río/Premier/Bahía, así que un código nuevo de esas líneas queda cubierto solo. Se
    reparte y se vende lo que queda, pero nunca entra en «hay que fabricar» (aviso `agotado`).
  - **Rotación: 3 entregas del EQUIPO, y Eduardo afuera** (§4da → §4dg → **§4dj, la definitiva**):
    `STOCK_VENTANA`=15 días, en 3 tramos de 5. **DOS condiciones, las dos del dueño, y las dos
    tienen que cumplirse**: (1) al menos `STOCK_VENTAS_MIN`=**3 entregas distintas** —no
    unidades— en la ventana (*«una única entrega o 2 en 1 mes no es tener rotación, eso es
    pedido único»*, 07/09, reclamado de nuevo el 09/09 al ver el MORFEO —15 unidades en UNA
    entrega— en «🚨 PEDIR YA»); (2) **los pedidos de Eduardo nunca cuentan**
    (`stockPedidoUnico`, `vendidosUnicos`) — ni ritmo, ni reserva, ni mensaje a fábrica; lo
    suyo vendido y sin entregar sí se cubre. ⚠️ Esta regla dio la vuelta entera tres veces
    entre el 07 y el 09/09 (el comentario de `STOCK_VENTAS_MIN` guarda la historia con las
    frases textuales): **no tocar ninguna de las dos mitades sin que el dueño lo pida**.
    `vendidosRotacion`/`nVentasRotacion`/`sem` son solo del equipo. `o.rotacion`: `baja` (<3
    entregas del equipo) no estima ningún ritmo, `porDia`=0, margen=0, `cubrir`=0 — aviso
    📦 `unico` (UN solo aviso; el cartel agrega «· Eduardo» cuando `stockSoloEduardo`).
    `media` (≥3 entregas, poco volumen) sí estima, margen FIJO (`STOCK_COLCHON`), `cubrir`=3.
    `alta` (≥15 unidades del equipo Y en ≥2 de los 3 tramos) confía en el desvío: el margen
    escala hasta 5 días, `cubrir`=`STOCK_CUBRIR`(7). Lo vendido y sin entregar (`comp`) se
    cubre igual en las tres: no se estima, está vendido.
    Ej. real (09/09): 21 unidades del equipo en **15 entregas** en 15 días → 1,4/día × (3
    fábrica + 2 margen + 7 reserva) = 16,8 − 6 en depósito = **pedir 11** aunque haya solo 3
    sin entregar: es la reserva por rotación, no un error. Con esas mismas 21 unidades en 1 o
    2 entregas, no se pide nada.
    ⚠️ `porDiaReal` es la cuenta cruda DEL EQUIPO; `stockSobra`/`stockMesesSobra` usan
    `porDiaTodo` (todo lo que salió, Eduardo incluido): «plata parada» mira para atrás.
    También de 91ddcd8 (§4de): un «✗ no hay»/«📥 recoger» con fecha pasada sigue comprometido
    (lo SIN marcar con fecha pasada sigue = salió, §4co); lo ya pedido no se pide dos veces
    (aviso `pedido` + «confirmar la llegada»); recepciones parciales (`q.ru`, `q.total`).
    `revisarStock`/aviso `revisar` (§4dc): si hay más marcado «✔ hay» a mano que lo que dice
    el inventario, avisa ANTES de proponer una reposición sobre un saldo que no cierra.
    `tests/test_rotacion.js` (secciones 1-2 = pocas entregas, 6 = Eduardo), `test_circuito.cjs`,
    `test_stock_rotacion.cjs`.
  - **⚠️ Si volvés a tocar `STOCK_VENTANA` o los umbrales de rotación**: revisá que ningún
    texto quede con un número hardcodeado (pasó dos veces, §4dc — «4 semanas» sobrevivió un
    cambio de ventana entero) y que los fixtures de `test_stock.js`/`test_rotacion.js`, que
    reparten entregas en días fijos, sigan cayendo DENTRO de la ventana nueva.
  - `tests/test_stock.js`, `tests/test_existencias.js` y `tests/test_revstock.js` (fixtures
    sintéticos: el repo es público y el inventario real no va ahí).
  - **Dos manos en el mismo panel** (§4dc): el dueño también usa otra herramienta de IA para
    tocar `pedidos.html` cuando yo no estoy. Sus tests (`tests/test_stock_*.cjs`) usan
    `require('playwright')` a secas + `CHROME_PATH`/`NODE_PATH` por variable de entorno —
    no la ruta absoluta que uso yo — y `correr.sh` ya los corre (antes no: buscaba solo
    `*.js`). Antes de asumir que algo está roto porque un test propio falla, verificar si
    cambió una constante compartida (como `STOCK_VENTANA`) desde otra sesión.
- **🗺️ Mapa de entregas y ubicar por la dirección** (§4dh): el mapa dibuja SOLO los pedidos
  con link en `maps`; los de ROHO entran del Excel con la dirección escrita y `maps:''`, así
  que no estaban. Ahora la barra cuenta «N sin ubicación» (`mapaSinLinkList`: del período,
  sin entregar, sin link — distinto de «sin ubicar» = con link ilegible) y el botón **📍 Ubicar
  por dirección** (`ubicarSinLinkMapa` → `ubicarPorDireccion`) manda las direcciones al
  servidor (`action:'geocode'` → `geocodeTexto`, geocoder de Google acotado a Santa Cruz) y
  guarda lo encontrado ADENTRO del pedido como `https://www.google.com/maps?q=LAT,LNG&aprox=1`.
  Ese `&aprox=1` (`esUbicAprox`) es la marca de «por la dirección escrita, la cuadra y no la
  puerta»: la muestran el globo del mapa, la tarjeta del chofer («≈ aproximada: preguntá la
  casa») y 📍 Revisar ubicaciones (sección «≈ ubicados por la dirección», y botón para ubicar
  los sin link). El importador de ROHO lo hace solo al terminar (`ubicarImportadosRoho`, caja
  `#roho-geo`). Reglas: no pisa un `maps` existente; dirección de ≥8 letras (`ubicables`);
  misma dirección = una consulta; se guarda DE A UNO (`guardarEnFila`); tope 80 por toque en
  el mapa, los más nuevos primero. `tests/test_ubicar.js`.
  ⚠️ `tests/test_roho.js` y `tests/test_existencias.js` corren contra Excel con FECHAS
  FIJAS (última entrega de ROHO 09/09/2026; reporte de existencias del 07/09/2026) mezcladas
  con pedidos de fechas relativas: se pudren solos con el calendario. Los dos tienen el reloj
  de la página clavado en el 08/09 (`page.clock.setFixedTime`). Si se cambia un Excel, mover
  esa fecha. Un test nuevo que mezcle una fecha fija con `atras(n)` tiene que hacer lo mismo.
- **⏳ Primera carga con reintentos y cartel** (§4di): al abrir, el panel muestra la copia
  guardada en el dispositivo (`loadMirror`; en una compu nueva, nada = todo en 0) y pide la
  planilla con `cargaInicial()` → `refrescarEstado()`. Si falla, reintenta solo
  (`CARGA_INTENTOS` = 3 s, 8 s, 20 s) y el cartel `#carga-banner` (arriba de todas las
  pestañas) dice el MOTIVO en castellano (`motivoDeError`: sin red / Google devolvió una
  página / pide clave / otro) con «🔄 Volver a intentar»; `renderConnEstado` dice «Conectado»
  recién cuando el servidor contestó (`CARGA_ESTADO`), antes decía «Conectado» con solo
  mirar la forma de la URL. `refrescarEstado` deja `ULTIMO_ERROR` y, si `STATE` está vacío,
  pone el cartel en error desde cualquier refresco. `CARGA_GEN` descarta resultados tardíos
  de un intento viejo. ⚠️ En un test con la red cortada, la carga de arranque queda
  reintentando: si el test lee el cartel de conexión, que haga `CARGA_GEN++; CARGA_ESTADO='ok'`
  y limpie `CARGA_TIMER`/`CARGA_TIC` en su setup (ver `test_conflicto.js`). `tests/test_carga.js`.
- **🚨 Si el panel no carga nada (§4dm)**: mirar el cartel. Desde el 09/09 `apiPost` mira el
  código HTTP y `motivoDeError` lo traduce con QUÉ HACER. Un **404** = la dirección `/exec`
  del Apps Script ya no existe (crear una implementación NUEVA estrena otra dirección en vez
  de reemplazarla): Implementar → Administrar implementaciones → ✏️ la de siempre → Versión
  nueva. Pasó de verdad el 09/09 entre las 14:23 y las 17:53.
  ⚠️ Todo doble de `fetch` en los tests tiene que traer `ok:true, status:200`: una `Response`
  real siempre los trae, y sin ellos el doble simula un 404 (rompió `test_conflicto.js`).
- **Verificar qué `.gs` está publicado sin entrar a Google**: Actions → «Traer ventas de Kommo (respaldo)»
  → Run workflow. El registro imprime `servidor del panel: versión …` y `último aviso de Kommo al panel: …`
  (ese segundo dato separa «Kommo no avisa» de «el servidor no procesa el aviso»). Ver §4ch.

## Quién vendió qué (buscar por producto) y sacar un PDF
Administración → **🔎 Quién vendió qué** (§4db → §4df): productos (separados por coma, entra
el que tenga cualquiera, sin acentos: «bahía» = «BAHIA») + **vendedor** (desplegable: Todos +
la lista fija + los que aparezcan en los pedidos, Eduardo y ROHO incluidos — SIN
`contaExcluido`) + desde/hasta. **El filtro de cliente se fue** (09/09, pedido del dueño): el
cliente queda chiquito bajo la nota. La respuesta es el **cuadro por vendedor** (`porVend`:
pedidos, unidades, plata, qué productos; el que más vendió primero, empate por plata) y abajo
el detalle por **renglón**, agrupado por vendedor y por fecha. Sin producto ni vendedor pide un
dato. **Cada renglón del detalle abre el pedido** (`busAbrirPedido` → `showPedidoModal`, el
modal está en z-index 4000 sobre el overlay 3000) y hay un botón «Ver pedido» `no-print`;
**tocar un vendedor del cuadro lo deja como filtro** (`busElegirVendedor`). El PDF sale por
🖨 Imprimir → «Guardar como PDF» (sin librerías); la carátula impresa lleva productos,
vendedor, período y totales porque los filtros no se imprimen. `tests/test_buscar.js`.

## 📦 Productos del mes (Contabilidad → Ventas)
Botón al lado de ⬇️ Excel (lo hizo la otra herramienta, bitácora §4dd): consolidado por
producto (código + medida) y detalle por renglón de lo vendido en el **mes** elegido, para el
**vendedor** elegido, con el mismo corte Ingreso/Entrega de la tabla. Ignora el cuadro Buscar,
y en Día/Todo pide elegir Mes. Pide la lista entera al servidor (`apiList`), no usa `STATE`.
⚠️ **Vive en un SEGUNDO archivo, `productos-mes.js`** — `pedidos.html` ya no es uno solo:
se carga con `<script src="productos-mes.js?v=…">`, así que al tocarlo hay que subir el
`?v=` (si no, el celular sigue con el viejo en caché) y validarlo aparte con
`node --check productos-mes.js`. `tests/test_productos_mes.cjs`.

## 🏪 RPT — Reposición de tienda (§4dk)
Tercer botón junto a 📄 OC y 🎧 ATC. El vendedor pide lo que necesita su tienda, logística lo
ve y lo **agenda como cualquier entrega**, y sale el **Excel del formato** para mandar por
correo + el mensaje de **WhatsApp**.
- **El tipo viaja en el propio número** (`RPT 09-001`), igual que la ATC: ninguna columna
  nueva en la planilla. `esRPT`/`ocTipoDe`/`ocPrefijo`; `nextOcMes(fecha,tipo)` lleva **tres
  series independientes**. El **destino se guarda en `cliente`** (la sucursal): así entra
  solo a la lista de carga, la ficha del chofer y el mapa. `SUCURSALES` autocompleta
  zona/dirección/maps sin pisar lo escrito.
- **NO es una venta** → `fueraDeConta` la deja afuera de Contabilidad y del Cuadre.
  **SÍ sale del depósito** → `stockCuenta` la deja pasar y lo pendiente se cubre.
  ⚠️ **Pero NO es rotación**: va por `stockPedidoUnico` (como los pedidos de Eduardo, §4dj)
  porque el colchón **cambió de lugar, no se vendió** — contarlo como venta lo contaría dos
  veces y el panel mandaría a fabricar el doble. `vendidosRpt` la separa de la de Eduardo
  solo para que el cartel diga la verdad (`stockUnicoEtq`).
- Por renglón: `rtipo` (Reposición/Adicional) y `robs`, adentro del JSON de productos con la
  misma convención que `precio` (si no corresponde, la clave no se guarda).
- `pintarDocTipo(limpiar)` es el repartidor: esconde **y limpia** lo que ATC y RPT no usan
  (nota, cobro) — esconder solo no alcanza, se guardaba invisible.
- **El Excel** (`rptHoja`) copia el formato del dueño fila por fila, con el logo adentro
  (`LOGO_B64`) y la lista `"Reposición,Adicional"` en `E12:E31`. ⚠️ El orden dentro de
  `<worksheet>` **no es libre**: cols → sheetData → mergeCells → dataValidations → drawing.
  Los estilos nuevos van **al final** de `STYLES_XML` (`XS_TIT`…`XS_MAIL`, 18–27): mover uno
  del medio repinta todos los otros Excel del panel.
- ⚠️ `xlsxHoja` tenía la regex de celdas glotona: una **celda vacía con estilo** se tragaba
  la de al lado (valor corrido de columna, en silencio). Arreglado en §4dk.
- `tests/test_rpt.js` (84 checks).
- **§4dl** — repaso: (1) **«Quién vendió qué» ya no cuenta ATC ni RPT como ventas**
  (`buscarData`); lo que queda afuera se dice con `busFueraTxt`, abajo del cuadro y en la
  carátula impresa. ⚠️ Hasta el 09/09 las ATC SÍ entraban marcadas — está anotado en la
  bitácora y volver atrás es una línea. (2) Con **ROHO** el tipo vuelve solo a OC: el
  selector se esconde y el formulario quedaba sin salida. (3) Verificado: 25 productos en
  una RPT (la hoja crece), y los Excel de siempre siguen saliendo.

## Etapas del pipeline
`Incoming leads` → `Nueva consulta` → `Atendido` → `Interesado` → `Cotizacion enviada` → `Agendado / Visita` → `Compradores` → `No Responden`
("Atendido" = consulta respondida; cuenta para el tiempo de 1ª respuesta pero NO como calificado)

## Vendedoras
Mirian Salazar, Maria Flores, Isabel Robledo, Carola Chavez (+ Jonathan Monje). Sucursales: Mia Plaza, Buenos Aires, Central.

## Campo "Canal" en Kommo
Campo lista obligatorio que las vendedoras llenan a mano (Facebook, Instagram, Tiktok, Visita tienda, Referido, Cliente antiguo). `detect_channel()` en generar.py devuelve el valor **TAL CUAL** de Kommo (sin renombrar, para coincidir con la lista); el ícono lo pone `channel_icon()` por palabra clave. Fallback: tags (normalizadas) → `created_by` (0 = bot → "Automático (bot)", otro → "Carga manual vendedora").

## Para actualizar manualmente
GitHub → Actions → **Generar Panel Heaven (Kommo → GitHub Pages)** → **Run workflow** (dejar month/year vacíos para el mes en curso).
El botón "Actualizar" del dashboard SOLO recarga la página, no regenera datos.

## Reglas de oro
- NO pushear a `main` mientras el workflow del panel corre (el push del bot falla en silencio).
- Validar `generar.py` con `ast.parse` y el template con `node --check` antes de pushear.
- Si Pages se atasca (deploys fallan en `deployment_queued`): Settings → Pages → Branch None → Save → Branch main → Save.
