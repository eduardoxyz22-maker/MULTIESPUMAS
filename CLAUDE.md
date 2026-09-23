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
  - ⚠️ Los límites del mes (`m_start`/`m_end`/`p_start`/`p_end`) llevan `tzinfo=BOL_TZ` (UTC−4,
    §4ew): un datetime naive con `.timestamp()` se interpreta en la zona del runner (UTC en
    Actions) y el mes cortaba a las 20:00 de Bolivia. No volver a crearlos sin tzinfo.

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
- **🔒 El candado del servidor: qué SÍ y qué NO** (§4dt, `2026-09-10-a`). `doPost` toma
  `LockService` con `waitLock(30000)` — necesario para **guardar** y **borrar**, veneno para
  todo lo demás, porque el panel entero espera. Quedaron **fuera** del candado, a propósito:
  · **`list`** (`readAll` es un solo `getValues`: foto atómica, y cada dispositivo lee al
  entrar y cada minuto — era el cuello de botella);
  · **todo lo que le pregunta a Kommo** (`borradorDeLead_` hace hasta 4 llamadas de red por
  venta, y el **webhook** de Kommo entra a cada rato — el cron del repaso dice 10 min pero
  GitHub lo demora a ~3,5 h): `kommoProcesar_` arma los borradores afuera y
  toma el candado solo para escribir. ⚠️ `leadYaCargado_` se **revalida dentro** del candado:
  ahí vive la garantía de no duplicar. Si no hay nada que escribir, ni lo toma.
  · Fotos y geocode ya estaban afuera. La carpeta de fotos se busca **una vez**
  (`FOTOS_FOLDER_ID` en propiedades). ⚠️ El `setSharing` **por archivo** se mantiene: es lo
  que sostiene que `lh3.googleusercontent.com/d/<id>` muestre la foto sin sesión (§4cd).
  `tests/test_servidor.js` sección 7 mide el **orden** con dobles que anotan cada paso: contra
  el `.gs` viejo fallan 4 y el detalle dice el bug (`candado → kommo → suelta`).
  - **📥 Kommo en el `.gs`, segunda vuelta** (§4et, `2026-09-20-a`): (1) **«Descartar»
    descarta de verdad**: `doDelete` de un `kommo-<lead>` lo anota en la propiedad
    `KOMMO_DESCARTADOS` (`{lead: día}`, 60 días, tope 300) y el repaso lo saltea como
    `descartado` — antes lo volvía a crear en el próximo repaso. (2) El repaso «ya estaba» **no
    toma el candado** ni habla con Kommo adentro: `repararNombrePrep_` (afuera) +
    `repararNombreAplicar_` (adentro, revalida). (3) El **repaso de GitHub encola** como el
    webhook (`kommoLeads` → `kommoEncolar_(ids,'repaso')`, respuesta `diferido:true`) y
    `traer_kommo.py` **exige `origen:'repaso'`** (un `ok:true` ajeno corta la corrida).
    (4) `busy` **no vacía la cola** (`kColaQuitar_` solo con `ok!==false`) y el resumen lo
    dice. (5) El `busy` del webhook **no va a Rechazos** (`doPost` devuelve el camino Kommo
    directo). (6) Productos por `metadata.catalog_id`, una consulta por catálogo. Sección 10 de
    `test_servidor.js` (19 dientes contra el `.gs` viejo) y `tests/test_traer.py`.
- **📡 `doGet` de afuera** (§4du, `2026-09-10-b`): el 10/09 Ejecuciones mostró un `doGet` cada
  3-4 s, de 3-5 s cada uno (la planilla entera), con los `doPost` del panel en 0,5 s. **Nada
  del repo llama al `/exec` con GET** — es alguien de afuera, sin identificar, y sin
  `PANEL_KEY` se lleva la lista de clientes. Ahora cada GET se **anota** (`getRegistrar_`:
  nombres de parámetros, nunca valores) y la respuesta sale de **`CacheService`** 20 s
  (`GET_CACHE_SEG`, trozos de 64 KB); guardar/borrar/borrador la invalidan
  (`getCacheOlvidar_`). El `list` por POST no usa caché. ⚠️ En el test, el doble de
  `CacheService` devuelve UNA instancia. Sección 8 de `test_servidor.js`.
  - **🔎 Quién lee, visible sin Cloud Logging** (§4dv, `2026-09-10-c`): al dueño Ejecuciones
    **no le despliega** las filas de `doGet` y «Registros de Cloud» está en gris, así que el
    `console.log` no le sirvió. Cada GET se anota además en la **caché** (`get_log`: últimas
    40 firmas + conteo por firma = nombres de parámetros + ruta; `Session.
    getTemporaryActiveUserKey()` recortada a 6 letras como «dispositivo»; de dónde salió la
    respuesta: caché/hoja/clave/cerrado) y, **como mucho una vez por minuto**, un resumen va a
    las **Propiedades del script** `GET_RESUMEN`/`GET_ULTIMOS` (se leen en ⚙️ Configuración
    del proyecto). El panel lo pide con `{action:'getlog'}` → Administración → **📡 ¿Quién
    lee la planilla?** (`verLecturasGet`/`renderGetLog`: cuántas, desde cuándo, cada cuánto,
    por firma, y qué hacer). **`GET_CERRADO=1`** en Propiedades cierra la puerta GET **sin
    reimplementar** (`{error:'get_cerrado'}`, sin leer la hoja; el panel no usa GET). ⚠️ El
    registro va sin candado: dos GET a la vez pueden pisarse una anotación, es diagnóstico.
    Nunca valores de parámetros (pueden ser claves). Sección 9 de `test_servidor.js` +
    `tests/test_getlog.js`.
- **🤝 Dos dispositivos a la vez: stock, arqueo y borrar** (§4fz → **§4fz-b**, `.gs` `2026-09-23-b`,
  **en la rama, sin publicar**; producción sigue en `ebc3eab` + `2026-09-20-a`). `tests/test_concurrencia.js`
  (50) monta el `.gs` real + navegadores con reglas `lose/drop/busy/hold`, recargas y pestañas.
  · **`__stock__` y `__arqueo_cuadre__`**: el servidor 23-b solo las guarda con `juntar:1` y el sello
  (sin `juntar` → `actualizar`, sin tocar la hoja). El panel manda SIEMPRE la memoria (`sisPlegar`),
  que es **de cada pestaña** (`sessionStorage` `ME_SIS_V2`: stock, arqueo y `SIS_BASE`; sobrevive a
  recargar esa pestaña), `STOCK_CARGADO`/`ARQUEO_CARGADO`, y cada fila lleva `_base`/`_dev` (la
  pestaña)/`_t` (no viajan): una fila de OTRA pestaña o de un panel viejo se junta antes.
  ⚠️ No volver a sincronizar pestañas con el evento `storage`: reemplazar la memoria con la de la
  otra pestaña borraba cambios propios sin guardar. Y en un test de dos pestañas, la segunda tiene
  que ESPERAR a ver la cola de la primera (el localStorage entre pestañas llega con retraso). Ante `conflicto` junta
  (`sisFusionarYGuardar`) y reguarda; si la hoja tiene EXACTAMENTE lo mandado, es un ok tardío.
  ⚠️ **Toda mutación del stock termina en `guardarStock()`**, y **un campo NUEVO de `STOCK` tiene
  que entrar en `stockFusionar`** (si no, la primera junta lo pierde).
  · **La junta va por id** (idempotente: juntar dos veces el mismo cambio no lo cuenta dos): entradas
  y pedidos con id (los viejos reciben uno FIJO al leer, `v:…#n`), historial por contenido.
  **Las recepciones son una lista** (`q.recs`); ⚠️ una llegada nueva se anota con
  `stockRecsDe(q).push(stockRecNuevo(u,f))` + `stockNormalizarRecepciones(STOCK)`, **nunca restando
  a mano** de `g.u` ni sumando a `e`: la entrada (`rec:1`), la resta del origen (`g[de].rs` contra la
  foto `g[de].t`) y lo pendiente salen de ahí. Conteo con hora (`c.t`) y `stockEntradaVale`.
  · **Borrar**: todo borrado de una fila que la persona VIO pasa por `borrarEnServidor(copia)`: espera
  un guardado propio en el aire, la saca de la cola, relee (si cambió no borra: `{conflicto, actual}`),
  borra con el sello y ante un error pasajero reintenta una vez; si no se sabe, `incierto` y **no se
  repone**. El `.gs` 23-b rechaza un borrado sin `rev` de una fila sellada (`actualizar`).
  · Lo que NO queda protegido está en la bitácora §4fz-b («no decir todo protegido»).
  · 🚨 **El 23/09 subir el `.gs` 23-a dejó a TODO el equipo sin conexión** («no hay conexión con
  Google» en todos a la vez): se volvió a la versión anterior desde ✏️ (el diálogo NO mostraba
  «Ejecutar como»/«Quién tiene acceso»: cambió solo la versión). **Causa confirmada**: Ejecuciones
  decía `Script function not found: kommoRepaso` — el pegado del `.gs` NO entró entero.
  ⚠️ **Los disparadores (`kommoRepaso` cada 5 min, `kommoProcesarCola`, el barrido de fotos) corren
  el código GUARDADO en el editor, no la versión implementada**: el repaso de Kommo quedó parado
  desde las 11:24 aunque el panel ya andaba. **Volver atrás son DOS cosas**: ✏️ → versión anterior
  Y pegar el código anterior en el editor. **Antes de implementar**, `probarAntesDeImplementar()`
  desde el editor (arriba de todo en el `.gs` 23-b, solo lectura) tiene que decir «✅ Se puede
  implementar». Procedimiento completo: cabecera del `.gs` y bitácora §4fz-b «Publicar».
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
  - **🏭 Qué producir** (§4dr, 10/09): cuadro arriba de la tabla de stock, un bloque por
    fábrica —**Heaven → Industrias Moreno (`MORENO`), ROHO/FLEX/PEDIC → Industrias Moreno
    también pero en bloque aparte (dueño, 21/09), Sueña → Multiespumas (`MULTI`)**
    (`MARCA_FABRICA`)— y por producto **7 días** (= `o.fabricar`
    de la tabla, una sola verdad), **15 días** (acumulada, nunca menor) y **el mes que viene**
    (ritmo de `STOCK_VENTANA_MES`=30 días con la MISMA regla de rotación, × los días del mes,
    menos lo que queda el día 1; el `PRODUCIR_1RA`=70% para la 1ª quincena — «si en
    septiembre se vendieron 70 soft, en octubre el 70% para la primera quincena»). Solo
    unidades: el dueño no quiere plata ahí. La marca sale del NOMBRE del catálogo
    (`stockMarcaDeNombre`; lista de los catálogos del sistema que viven en `rotacion.html`),
    si no de la última fábrica pedida (`o.fab`), y si no → «❓ Sin fábrica asignada». Sin
    conteo no se calcula nada. ⚠️ El respaldo «por la última fábrica» recorre
    `PRODUCIR_BLOQUES` **en orden**, no las claves de `MARCA_FABRICA`: dos marcas comparten
    fábrica (Heaven y ROHO), y el que no dice su marca tiene que caer en Heaven. El pie «por medida» se **toca y despliega los modelos** que la componen
    (`producirMedida`, estado en `PRODUCIR_MED_ABIERTA`); la medida del pie va unificada por
    `producirMedidaEtq` («130X190CM» = `130x190`). Cada bloque scrollea dentro de `.prod-wrap`
    (`max-height:70vh`) para que el encabezado quede **clavado arriba** y el TOTAL **abajo**:
    ⚠️ `position:sticky` sin una caja con altura tope NO se clava en nada — se clava contra el
    scrollport más cercano, que sin `max-height` se va entero con la página (le pasa también
    a la tabla grande de stock). `tests/test_producir.js` (56, reloj clavado en el 10/09/2026).
    ⚠️ `rotacion.html` (12/08, matriz Ene-25 a Jul-26, proyección a 5 meses con backtest)
    es una FOTO: no se alimenta sola y el dueño no quiere subir reportes; por producto se
    equivoca 62% a un mes (13% en el total), así que no sirve para pedir por producto.
  - **📦 La fila del stock en vuelo manda la memoria** (§4ev): `filaSistemaEnVuelo(id)`
    (`saveReciente` o en la cola) frena el `STOCK=leerStock(stk)` de `leerCierresDeLista` —y
    el `ARQUEO=parseArqueo(...)`— mientras haya un guardado en curso; antes un `list` tardío
    borraba la recogida recién anotada y la siguiente anotación la borraba del servidor.
    `autoOcupado` incluye `stock`; `mergePending` no mete filas del sistema en `STATE`.
    ⚠️ En un test de «en vuelo», el doble de `apiSave` NO anota `SAVE_ULTIMO`: usar el
    `apiSave` real y simular `apiPost` (`tests/test_adm_alta.js`).
  - **Recogida cerrada desde el Excel** (§4ev): `confirmarImportExist` resta lo pendiente de
    `STOCK.g[de].u[k]` como «Llegaron»; si no, Moreno se cuenta dos veces.
  - **`ventasPanelIndex` sin `stockPedidoUnico`** (§4ev): la historia mensual del plan del mes
    va sin Eduardo, puntuales ni RPT (regla de §4dj; el cartel del cuadro lo dice).
  - **📥 De qué almacén se va a buscar** (§4ey): la marca del producto es `x.chk='im'` +
    **`x.chkDe`** con el almacén (vacío = IM, el de siempre: nada de lo viejo se migra) y,
    si la línea salió de DOS almacenes, **`x.chkDes`** = `[{de,u}]` con el desglose.
    `recogerLista()` arma un botón por almacén en la ficha — IM + los de `STOCK.g` + los de
    `RECOGER_EXTRA` (hoy `Banzer`), sin repetir; `recogerCorto(x)` es el nombre para un
    renglón («Moreno», o «IM 3 + BANZER 1») y `recogerLugaresTxt(p)` para el pedido entero.
    `stockAsignar` reparte por almacén (`imAlm`/`tomarIM`) y devuelve el desglose, no un
    nombre. ⚠️ Si `enOtros` trae unidades sin el desglose `otrosAlm`, se cuentan como IM: no
    se pierde stock.
    - **🥇 El orden lo dictó el dueño (21/09) y no se toca sin que lo pida**: *«primero a la
      mano en fábrica que es de donde salen los camiones, luego banzer y si no hay pedir
      fabricar a IM o recoger de IM»*. O sea **acá en fábrica → Banzer → IM**: IM es la
      FÁBRICA además del almacén, su stock repone a todos los demás y se gasta al final.
      El depósito se descuenta antes de `tomarIM`; dentro, el orden es `pref` → **el que la
      cubre entera** → **el que NO es IM** → el que más tenga. ⚠️ «Cubre entera» va ANTES que
      «IM último»: partir una línea son dos viajes.
    - ⚠️ **IM y «Industrias Moreno» son EL MISMO LUGAR** y hay que unificarlos: el histórico
      (`chkDe` vacío) y el del Excel (`IM - PRODUCTOTERMINADO`). **Todo** lo que compare o
      guarde un almacén pasa por `recogerCanon` (IM/Moreno → `''`) y **`recogerMismo`**, que
      además acepta que un nombre contenga al otro («Banzer» a mano vs «01-05-006 ALMACEN
      BANZER» del Excel). Sin eso: «Recoger de Moreno + IM» en un solo galpón, ningún botón
      encendido en la ficha, y marcas huérfanas el día que suban un Excel nuevo.
    - `cambia` mira la marca **y el lugar** (`recogerMismosLugares`): si no, un cambio de
      almacén se proponía en la tabla y Aplicar no lo tocaba.
    - `almMal` (cartel ámbar en la revisión) avisa cuando una marca a mano apunta a un
      almacén que no tiene esas unidades: se reservan del otro igual, pero se dice.
    - ⚠️ La tira de botones no puede llevar `flex:none` —con seis botones se sale de la
      pantalla del celular— y el nombre del botón va recortado a 12 letras.
    - ⚠️ **Los nombres largos del reporte de Moreno**: el de Banzer es
      `01-05-025  Almacen Distribucion Banzer` (27 letras, dos espacios tras el código) y el
      corte a 22 lo dejaba como «Almacen Distribucion …», **sin la palabra Banzer** — dos
      botones para el mismo lugar y las marcas a mano huérfanas. `stockAlmCorto` saca primero
      las palabras que no distinguen (`ALM_GENERICAS`) y recorta después; `recogerClave` va
      por el nombre **entero**, nunca por el corto. ⚠️ En `ALM_GENERICAS` no van «PRODUCTOS»
      ni «TERMINADOS»: dejaban el almacén de logística como «FAB.».
    - **Dónde está ≠ dónde se hace** (dueño, 21/09): las líneas FLEX/PEDIC se fabrican en
      Moreno pero pueden estar guardadas en Banzer o Multiespumas. La fábrica sale de
      `MARCA_FABRICA`, el lugar de `STOCK.g` + `x.chkDe`. No se mezclan.
    `tests/test_banzer.js` (55).
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
  ⚠️ **Y si el test reemplaza `apiList`, también** (§4fy): el reintento de los 3 s usa el `apiList`
  del test, y si ese devuelve otra lista que `STATE` (la vacía, un fixture) le borra los pedidos
  del ejemplo a mitad de la prueba. Sola llega antes de los 3 s y pasa; con la batería cargando la
  máquina, no — `test_existencias` salió 52/3 así dos veces.
- **⏱️ Una lectura colgada se corta sola** (§4ds): `refrescarEstado` envuelve `apiList()` en
  `conTopeDuro(…, CARGA_TOPE=45 s, 'tardo_datos')`. ⚠️ **`CARGA_TOPE` tiene que ser MAYOR que
  el `waitLock(30000)` del `.gs`**: con los dos en 30 s el panel cortaba justo antes del
  `busy` del servidor y «está ocupado» no se veía nunca. `motivoDelServidor` traduce `busy`.
  La cuenta regresiva se dibuja en DOS lugares (cartel y chip): las dos laten con `cargaTic`.
  📌 Propuesto y NO hecho: sacarle el candado al `list` del `.gs` (`readAll` es un solo
  `getValues`, o sea una foto atómica: leer no necesita candado, y es la mayor fuente de
  `busy`). Exige republicar. ⚠️ Sin eso, un `fetch` que no resuelve NI
  falla dejaba el panel en «⏳ Conectando con la planilla del equipo…» **para siempre**: el
  reintento se agenda dentro del `.then` del intento anterior, así que no llegaba nunca (mismo
  agujero que las fotos, §4dq). **Solo la LECTURA lleva tope**: cortar un guardado que el
  servidor quizá ya grabó y reintentarlo a ciegas es peor. El chip muestra los **segundos**
  que lleva (`cargaSeg`/`cargaTic`) y, al cortarse, en cuánto reintenta solo.
- **🚨 Si el panel no carga nada (§4dm)**: mirar el cartel. Desde el 09/09 `apiPost` mira el
  código HTTP y `motivoDeError` lo traduce con QUÉ HACER. Un **404** = la dirección `/exec`
  del Apps Script ya no existe (crear una implementación NUEVA estrena otra dirección en vez
  de reemplazarla): Implementar → Administrar implementaciones → ✏️ la de siempre → Versión
  nueva. Pasó de verdad el 09/09 entre las 14:23 y las 17:53.
  ⚠️ Todo doble de `fetch` en los tests tiene que traer `ok:true, status:200`: una `Response`
  real siempre los trae, y sin ellos el doble simula un 404 (rompió `test_conflicto.js`).
  ⚠️ **Un 404 en el navegador NO significa que el Apps Script esté caído** (§4do, §4dp): el
  09/09 el mismo `/exec` le contestaba bien a GitHub Actions mientras el navegador del dueño
  daba 404, **y en incógnito andaba**. Era la **caché**: `/exec` contesta con un redirect a
  `script.googleusercontent.com` que el navegador guarda, y al reimplementar esa dirección
  muere. Por eso `apiPost` agrega `?_=<ms>` + `cache:'no-store'` (y `credentials:'omit'`), y
  `CARGA_INTENTOS` llega a 45 s. ⚠️ Ese parámetro **no puede llamarse `k` ni `kommo`**:
  `doPost` desviaría al webhook de Kommo y el panel dejaría de guardar.
  **Prueba de 20 segundos: abrir el panel en incógnito.** Y **NO volver a implementar**: cada
  «Nueva implementación» estrena otra dirección y empeora el enredo.
  ⚠️ **Pero el 404 no es SOLO del navegador** (§4fx, corrección del 23/09): el respaldo de Kommo,
  pedido desde los servidores de GitHub, recibió 404 dos veces el 22/09 (corridas 128 y 132). El
  redirect de Google a veces se pierde con cualquier cliente.
- **🔀 Google a veces convierte un POST en GET** (§4fx): contesta `doGet` —`{ok:true, version,
  pedidos:[…]}`, la planilla entera— y `doPost` nunca corre (corridas 131 y 136). El panel lo daba
  por **guardado** (`ok:true` sin `pedido`): ✓ verde y nada en la planilla. Ahora `apiPost` lanza
  `respuesta_de_lectura` cuando una acción que NO es `list` vuelve con `pedidos` (o con
  `get_cerrado`), `errorPasajero` lo reintenta una vez y si no, a la cola. Solo `list` y `doGet`
  devuelven `pedidos`: si algún día otra acción devuelve una lista, hay que cambiar esa señal.
  `traer_kommo.py` reintenta una vez (lectura, 404, 5xx) y no imprime nada de esa respuesta.
  `tests/test_lectura.js`, `tests/test_traer.py`.
- **`correr.sh` corre también los `.py`** (§4fx): antes `test_traer.py`, `test_kommo.py` y
  `test_duplicados.py` quedaban afuera de la batería.
- **📷 Subir una foto (§4dq)**: las 4 rutas pasan por `fotoCronometro` → `achicarFoto`
  (`createImageBitmap`, con `achicarFotoLento` de reserva) y `conTopeDuro(…, 90 s)`. ⚠️ Un
  `fetch` **no tiene tope**: sin él, si Google se cuelga el cartel dice «subiendo» para
  siempre — eso eran los «4 minutos» que reportaron las vendedoras. Al terminar, el aviso
  dice **«achicar Ns · subir Ns»**: sin separar las dos mitades no se puede saber si el
  problema es el celular o Google. Si el tiempo está en **subir**, lo que queda es el `.gs`
  (guardar el id de la carpeta en propiedades — `fotosFolder_()` busca en Drive en CADA foto
  — y sacar `setSharing` del camino crítico); eso exige republicar.
- ⚠️ **Si publicaste algo y «no se ve», mirá el deploy de Pages ANTES de tocar el código**
  (§4dp): el 09/09 falló con `Failed to get ID Token. Request timeout` — infraestructura de
  GitHub dentro de `actions/deploy-pages@v5`, nada del repo. Se arregla con cualquier push
  nuevo. Workflow `273388817` en `mcp__github__actions_list`.
- **Verificar qué `.gs` está publicado sin entrar a Google**: Actions → «Traer ventas de Kommo (respaldo)»
  → Run workflow. El registro imprime `servidor del panel: versión …` y `último aviso de Kommo al panel: …`
  (ese segundo dato separa «Kommo no avisa» de «el servidor no procesa el aviso»). Ver §4ch.
  Desde §4et con leads en la ventana dice «el panel encoló N ids» (lo creado se lee en «último
  repaso del script»), y si la respuesta no trae `origen:'repaso'` la corrida **falla a
  propósito**: `PANEL_URL` apunta a otra implementación o el `.gs` publicado es viejo.
  Desde §4fz-b también **falla si el «último repaso del script» tiene más de 30 minutos**
  (`REPASO_PARADO_MIN`; encola igual): el 23/09 las corridas 137 y 138 lo imprimieron parado desde
  las 11:24 y salieron en verde.

## 💵 Efectivo: quién tiene la plata (§4eq)
Cada cobro en efectivo puede decir **quién lo recibió**: la vendedora (sin marca, todo lo viejo)
o un **chofer** (`>Nombre` pegado a la nota en `metodoPago`: `Efectivo 500 @… #1004 >Luis
Pierre %IMG`). ⚠️ Va DESPUÉS del `#` a propósito: un panel viejo lo lee como parte de la nota y
sigue viendo el pago; un separador nuevo antes del `#` le borraba el pago entero. `parseCobros`
→ `c.recibio`, `pagoRecibio(c,p)` = en la mano de quién está. El chofer no hace nada: su cobro
desde la ficha sale con **fecha de hoy** y a su nombre (QR/tarjeta sin nombre: van al banco).
Contabilidad lo marca en «Registrar pago»/«Corregir» (**¿Quién recibió la plata?**). El Cuadre
«Efectivo cobrado vs. retirado» agrupa por quién la tiene (`cuadreEfectivo` → `{filas, fuera}`;
con filtro por vendedora, lo de sus ventas que tiene un chofer va a `fuera` y se dice). El
retiro lista a los choferes en su grupo y pone «Quién retira» = **Contabilidad** solo
(`RETIRA_CHOFER`): **el chofer rinde a Contabilidad, no a la vendedora ni a Eduardo** (dueño,
18/09). `choferesConocidos()` incluye a los que ya no están (Giordano salió de `VEHICULOS` el
18/09; `choferesParaSelect(p)` conserva el guardado en un pedido viejo). No se lleva la mano de
Eduardo. `tests/test_chofer_efectivo.js`.

## 🎟️ Cupos del camión (§4fh)
- Son **dos bolsas por día**: 12 en 🌅 AM y 13 en 🌆 PM (sábado 15 y solo AM, domingo cerrado).
  `cuposUsadosTurno(fecha,turno)` y el portero del `.gs` (`porteroFecha_`) cuentan **igual**:
  todas las filas de esa fecha **y ese turno**, entregadas incluidas. **Mover un pedido de AM
  no libera lugar en PM.** Lo que va con **fecha vacía a propósito** —ventas de tienda, retiros
  (`__ret_…__`), filas del sistema y borradores de Kommo— nunca ocupa cupo.
- ⚠️ **Un turno puede tener MÁS de los que entran**: administración fuerza uno con la clave
  (`_forzar`, y el `.gs` lo acepta con `forzar:true`). El cartel decía `(12/12)` porque
  imprimía el **límite** dos veces, así que 13 se veía igual que 12 y sacar uno «no liberaba
  nada». Ahora **cuenta**: `(13/12)` + aviso de cuántos sobran. No volver a armar ese texto
  con `lim+'/'+lim`.
- **👀 Ver los N pedidos del turno** (`cupoVerBtn` → `verCuposTurno`/`cuposDelTurno`) abre la
  lista con OC, cliente, zona, vendedora y un botón para abrir cada pedido.
- ⚠️ **El número sale de `STATE`, que puede ser la COPIA del dispositivo** (§4fi): si la última
  lectura falló, el cupo puede ser de hace horas. `cupoViejoAviso()` lo dice ahí mismo, y
  `loadFromServer` ya deja `CARGA_ESTADO='error'` + `ULTIMO_ERROR` (antes solo tiraba un toast
  y el cartel seguía en verde diciendo «Conectado» con el 404 a la vista).
  `desdeCuandoLaCopia()` dice de cuándo es lo que se mira.
- `tests/test_cupos.js` (23). ⚠️ El fixture busca el **próximo miércoles**: con fecha fija o con
  «mañana» se pone rojo los sábados (15 y sin PM) y los domingos.

## 💰 Plata anotada que no se puede perder (§4eu)
- **`p.acuenta` = TODO el adelanto** (anticipo + 2° método del pago mixto, §4ej); la ficha
  de Contabilidad muestra solo el anticipo (`anticipoDe`), así que `aplicarMontos` y la rama
  del anticipo de `ctaGuardarPago` vuelven a sumar `mixtoDe(p)`. Una venta cargada «SÍ,
  pagado» lleva `acuenta` en 0 a propósito (§4cb): no se le inventa uno.
- **El flete cobrado no se reescribe desde el formulario**: `submitPedido` separa `cobrados`
  y `pactados`; el campo mueve solo lo pactado (`monto − envioCobrado`), vaciarlo no borra lo
  cobrado, y `editPedido` marca «¿ya lo cobraste?» DESPUÉS de mostrar el método (si no,
  `pintarEnvioCobrado` lo fuerza a «NO» y guardar sin tocar borraba un flete cobrado entero).
- **`aplicarCobros`**: una venta cuyo precio entero fue el adelanto (objetivo 0) está pagada;
  corregir un cobro SIN monto suma el monto al objetivo (como `ctaAnotarMonto`).
- **🚚 Los tres botones del recargo por entrega** (§4fe): `CTA_TIPO` vuelve a `'pago'` después
  de anotar un flete (si no, el pago siguiente entraba como flete y la venta no se cerraba
  nunca); un cobro PARCIAL deja el resto pactado; **`ctaIdxEnvio(p,i)`** dice CUÁL renglón se
  está tocando (`ae[0]` a secas pisaba el primero: efectivo que figuraba como QR); y 🗑 Quitar
  nombra el total, lista los renglones y junta TODAS las fotos. `tests/test_conta_alta.js`.
  ⚠️ En un test, registrar un pago desde la ficha exige **`CTA_PAGO.comps`**: sin imagen,
  `ctaRegistrarPago` se planta y abre el gato de comprobantes — el pago no se registra.
- **🧾 El pago de MENTIRA de una venta «PAGADA sin monto»** (§4fg): esas ventas no tienen
  renglón —el campo guarda el método suelto, `Efectivo %IMG`— y `cobrosDe` fabrica uno con el
  monto de **`p.cobradoBs`**, que NO viaja en la planilla (vale 0 apenas se relee la lista).
  Lleva la marca **`sinMonto:true`**, y **todo lo que REESCRIBE `metodoPago` usa
  `cobrosReales(p)`, nunca `cobrosDe`** (`aplicarCobros`, `aplicarEnvios`,
  `aplicarCompsAnticipo`): escribirlo lo volvía un renglón de Bs 0 que `parseCobros` tiraba, y
  la venta quedaba sin pago, sin comprobantes y NO pagada por tocarle una imagen.
  `sueltoDe`/`textoHistorial` le devuelven el método suelto cuando no queda ni anticipo ni
  cobro; `aplicarCompsSinMonto` reescribe SOLO las imágenes (adjuntar no es una operación de
  plata); y si queda algún cobro real, las imágenes del suelto **se mudan al primero** (por eso
  `choCobrarMetodo`/`choQuitarCobro` pasan `cobrosDe`, no `cobrosVisibles`).
  ⚠️ **`ctaAnotarMonto` y `ctaGuardarPago` hacen `delete c.sinMonto` a propósito**: son los dos
  caminos que SÍ lo vuelven un pago de verdad. Si se toca esa marca, dejan de funcionar.
  `tests/test_sinmonto.js` sección 8.
- **🧮 La 2ª vuelta de la auditoría (§4fj…§4fr)** — `tests/test_cuadre_alta.js` y los bloques
  nuevos de `tests/test_conta_alta.js`:
  · **`mixtoDe` es una HEURÍSTICA** (mismo día + mismo recibo que el anticipo, §4ej): la rama
  del anticipo de `ctaGuardarPago` mueve el 2° renglón JUNTO con el anticipo cuando le cambia
  la fecha o el recibo. Sin eso, corregir el recibo —lo que §4ei recomienda— lo volvía
  invisible y la corrección siguiente le borraba los Bs 500 (§4fj).
  · **Una venta ya pagada NO convierte el pago en flete sola** (§4fk): al recargo se va solo
  con `CTA_TIPO==='envio'`; con saldo 0 y tipo «pago» se PREGUNTA y queda como cobro de más.
  · **`p.acuenta = acu + mxM` solo mientras quede anticipo** (§4fl): con `acu` en 0 fabricaba
  un anticipo fantasma y contaba el 2° método dos veces.
  · **El Excel de Contabilidad usa `contaCobrado(p)`** (§4fm), no `totalCobrado`: si no,
  COBRADO + SALDO ≠ TOTAL VENTA (la brecha son todos los adelantos) y no coincide con la
  tarjeta «Ya ingresó».
  · **Un pago sin fecha no es de ningún mes** (§4fn): `cuadreAlertas` lo busca en TODAS las
  ventas, no solo en las del período, y dice cuántos son de otro mes.
  · **Un arqueo sin ningún pago detrás es una diferencia entera** (§4fo): antes quedaba
  huérfano y el panel decía «El cuadre cierra ✅».
  · **La ventana «✅ Guardado» se repinta en ámbar si el servidor rechazó** (§4fp):
  `aplicarCobros`/`aplicarEnvios` devuelven la promesa y `pagoWaEstado` la mira.
  · **Corregir el adelanto desde el FORMULARIO conserva fecha, recibo y `>chofer`** (§4fr) —
  ⚠️ solo cuando el adelanto YA ERA un renglón del historial (`_antPrev`); una venta NUEVA con
  «A cuenta» sigue guardándose como método suelto.
  ⚠️ En un test, `editPedido` termina de llenar el formulario UN TIC después: esperar ~150 ms
  antes de tocar `f-acuenta`, o se mide «guardar sin tocar la plata», que es otro camino.
- **🧮 Lo que quedaba del cuadre (§4fs…§4fw)**, también en `tests/test_cuadre_alta.js`:
  · **Lo cobrado se suma SIEMPRE** en el parte del día, la vista del chofer, la rendición y el
  reporte (§4fs): con `if(p.pagado) cob+=…` un cobro parcial valía Bs 0. No volver a poner esa
  guarda: lo PENDIENTE sí sale de las no saldadas (`if(!p.pagado) pend+=saldo`).
  · **«Sin método anotado» no es banco** (§4ft): `cuadrePorForma` marca `sinMetodo` y va en su
  propia tarjeta ámbar, no en «Bancos y tarjeta».
  · **Un `ts` se lee en hora de Bolivia** (§4fu): `contaFecha`, `atcEntro` y
  `rptFechaSolicitud` usan `isoDeTsBolivia(ts)` (UTC−4 fijo, sin horario de verano), no
  `isoLocal(new Date(ts))`. `todayStr()` sigue siendo el reloj del dispositivo a propósito.
  · **Con algo en «Buscar», las tarjetas y el Excel de Ventas lo dicen** (§4fv): «solo lo que
  coincide con…» y el archivo `…-SOLO-<búsqueda>.xlsx`. En el Cuadre la búsqueda filtra solo la
  tabla y lo aclara al lado.
  · **«Productos del mes» muestra lo conocido** con «Incompleto» en vez de «Sin dato» (§4fw,
  `productos-mes.js`, `?v=20260923a`).
  · ⚠️ **Esperan al dueño**: «Entrega» corta por la fecha PROGRAMADA (no hay campo con el día
  real de entrega), y el `SUMA` de la columna MONTO del Excel del Cuadre. El SALDO crudo del
  Excel se deja **a propósito** (es lo que hace cerrar cada fila desde §4fm).
- **💰 Los ocho botones de plata (§4fy)**, `tests/test_botones.js` (50; 42 rojos contra el panel viejo):
  · **El chofer toca SOLO lo suyo**: `cobroDeLaPuerta(c)` = sin recibo, sin imagen, con monto, ni
  anticipo ni flete ni `sinMonto`. ↺ y ✕ de su ficha no pasan de ahí (antes ↺ hacía
  `aplicarCobros(p,[])` y se llevaba el QR registrado por Contabilidad y el 2° método del mixto).
  · **Nunca `apiBorrarFoto` a secas sobre una imagen de pago**: `borrarFotoSiNadieLaUsa(fid)`,
  DESPUÉS de reescribir el renglón. El flete «¿ya lo cobraste? SÍ» del formulario comparte el id
  con el pago de la venta.
  · **El formulario no reescribe fletes cobrados**: quedan tal cual y el campo mueve lo pactado. Solo
  el renglón ÚNICO con el control **a la vista** se corrige como en §4eu (SI/NO y monto). Poner
  menos de lo cobrado en varios renglones pregunta (se corrige en Contabilidad) — `_cancelarEnvio`.
  · **`ctaIdxEnvio` devuelve la posición en `enviosDe(p)`** (que trae los pactados), no el n-ésimo
  cobrado. Todo `COMP_DESTINO` de flete lleva `e`.
  · **Todo lo que repinta la ficha con un pago a medio cargar llama `ctaPagoRecordar()` antes**
  (📎, ✕, ✅, ✏️, ✏️ flete), y el monto se recuerda solo si difiere de `data-def` (el que puso el panel).
  · `submitPedido` repone ✅ REGISTRADO si el pedido ya la tenía.
  · Ni una ATC ni una RPT se cobran (`noSeCobraTxt`), y el 📱 QR de la ficha de Administración va
  con banco (`bancosParaCobrar`).
  · **Esperan al dueño**: MEDIA-4 (💵 de Administración deja el efectivo en la vendedora aunque haya
  cobrado el chofer) y MEDIA-5 (un cobro nuevo sobre una venta ya ✅ no avisa).
- **§4fz (informe de la otra herramienta)**: corregir el **2° método del pago mixto** actualiza
  `p.acuenta` (`mixtoEn`, antes y después del cambio; «SÍ, pagado» sigue en 0, §4cb) — el
  formulario sumaba 4.790 en vez de 4.990. ⚠️ **§4fz-b: el pago mixto es SOLO con el anticipo
  escrito («~», `anticipoEscrito`)** y `mixtoEn(a, cobros, p)` exige que «A cuenta» cierre con los
  dos: con un adelanto reconstruido de `p.acuenta` (venta de antes del «~»), un cobro del mismo día
  y recibo «parecía» el 2° método y corregirlo inflaba el total 3.000 → 3.600. `ctaGuardarPago`
  toca `p.acuenta` solo si el renglón ERA el 2° método antes (sin la fecha que rellena
  `ctaCobrosConFecha`). `tests/test_mixto.js` §4c. El **cierre por forma de pago** sale de
  `cuadreCierre()` para la pantalla, el texto y el Excel (con los arqueos SIN pagos, §4fo, y la
  diferencia total). El botón de Contabilidad dice **«Entrega agendada»**: es `p.fecha`, que se
  reescribe al reprogramar.
- `tests/test_conta_alta.js` (`PEDIDOS=…` para los dientes contra un panel viejo).
- **Los chicos de §4ew** (13 MEDIA/BAJA, `tests/test_medias.js`): `p.cobradoBs` NO viaja en
  la planilla — toda cuenta de «cobrado» usa `totalCobrado(p)`; en «👑 Ver todos» el efectivo
  va a `p.chofer`; la foto de la entrega reintenta una vez tras `conflicto` y el «✓» sale con
  el `ok`; `cambiarTurno` en día cerrado y `quitarProgramarDevAtc` van con `forzar`;
  `showPagoWhatsapp` recibe el índice del cobro (los recargos van al final); `cuadreTexto`/
  `exportCuadre` no comparan con el arqueo con filtro por vendedora; `borrarRetiro` mira la
  respuesta; `loadFromServer` con `conTopeDuro`; `admVerRptAtrasadas()`; «Hay» =
  `max(0,deposito)+…`; buscador con `sinTildes()`.
  ⚠️ En un test, `showView(...)` dispara un refresco con la foto de STATE de ese momento:
  esperar ~120 ms antes de armar el fixture o el `list` tardío lo pisa.
- **«Mañana» de entrega = `proximoDiaEntrega()`** (§4ex): mañana, y si es domingo, el lunes.
  Va en todo lo que mira el camión (chofer, carga, ruta, mapa, faltantes, parte, WhatsApp,
  Excel, estadísticas); el formulario, «Cerrar día», la recogida de Moreno y el importador de
  ROHO siguen con `tomorrowStr()`. Un test que arme un pedido «para mañana» y lo espere en el
  chip «Mañana» tiene que usar `proximoDiaEntrega()` o se pone rojo los sábados.
  `tests/test_sabado.js` (reloj clavado).

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
  solo a la lista de carga, la ficha del chofer y el mapa. `SUCURSALES` (§4dn) son **siete**:
  Tiendas Roho, Mia Plaza, Buenos Aires, Central, Mutualista, Charcas, Carmelo — el campo es
  un `input` con lista, así que se puede escribir otra. Autocompleta zona/dirección/maps sin
  pisar lo escrito. **Ubicaciones y zonas las dictó el dueño** (§4dn) — no se tocan sin
  preguntarle: `Central→Central · Mia Plaza→Mia Plaza · Buenos Aires→Centro ·
  Mutualista→Mutualista · Charcas→Centro · Carmelo→Feria · Tiendas Roho→Norte`, y Buenos
  Aires y Charcas comparten «Centro» **a propósito**. Las ubicaciones son el pin exacto
  (`?q=lat,lng`, sin el `&aprox=1` de §4dh); **Tiendas Roho tiene zona pero NO pin**, también
  a propósito: no es tienda propia y sus entregas no van siempre al mismo lugar.
  ⚠️ Antes había ahí zonas que **inventé yo** («Norte», «Centro») y `sucursalElegida()` las
  escribía solas, desviando la ruta del chofer sin que nadie lo notara.
- ⚠️ **Las zonas se agrupan sin mayúsculas ni acentos** (§4dn, `zonasDeLista`/`zonaCanonica`):
  antes «Centro», «centro» y «CENTRO» eran tres zonas — tres sugerencias en `dl-zonas` y los
  pedidos repartidos en tres barras de «Concentración por zona». Mismo bug que el de «Carola
  Chavez»/«Carola Chávez», en otro campo. Se muestra la escritura que más se repite.
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
- **§4do — logística las encuentra y le gritan**: chip **🏪 Reposiciones** en Administración
  (`QUICK_DEFS`), y aviso ámbar `sticky` en `#adm-rpt` (`rptAtrasadas`/`renderRptAtrasadas`,
  `RPT_DIAS_AVISO`=3) con las que pasaron 3+ días **desde la fecha de entrega** sin marcarse
  entregadas. ⚠️ El corte NO se mide desde que se cargó: una pedida hace 10 días para mañana
  está bien. Y al guardar una RPT, **el Excel va primero y ancho** — el dueño copió el texto
  de WhatsApp y lo pegó en una hoja creyendo que era el formato; `bajarRptExcel` además ya no
  falla en silencio.
- `tests/test_rpt.js` (109 checks).
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
