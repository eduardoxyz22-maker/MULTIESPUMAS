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
- **02/10, §4hh — pagos, retiros, arqueos, entregas y stock durables.** `guardarDurable`
  conserva y verifica el intento ANTES del transporte para `persistPedido`, `persistRetiro`,
  `guardarArqueo`, `guardarStock` y `toggleEntregado`; también mientras espera otro envío.
  La confirmación o rechazo retira solo el JSON enviado, nunca una corrección posterior por id
  u hora. Se mantienen sellos/bases/fusiones. `_altaPendiente` es prueba LOCAL de un retiro
  nuevo cuya respuesta se perdió; no se manda a Apps Script. Sin almacenamiento no envía y avisa.
  `tests/test_guardado_operaciones.js`: 62/62; contra `92ff404`, 33 rojos. Diez suites existentes:
  454 comprobaciones. No cambian permisos, reglas ni `.gs` (`2026-09-30-a`). Recargar tras publicar.
  - **Revisado el 02/10 a la tarde (§4hi, batería entera 126/126, 4.764) y corregido — publicado 02/10 16:21, `f491137`**: **`colaEsperando()`** = la cola
    SIN los ids con envío en vuelo o en espera; la usan el pie (`updateFooter`), `renderColaAviso`, `misReintentarCola` y el
    modal «Quedó en cola». Sin eso, como la fila entra a la cola ANTES de mandarse, cada guardado normal decía «1 sin
    enviar · reintentar» y «todavía NO llegó a la planilla» mientras viajaba. `apiSave` repinta el pie en `fin`. ⚠️
    `flushPending`, `autoRefrescar` y `filaSistemaEnVuelo` siguen con `getPending()` entera, a propósito. `prepararDurable`
    borra `NO_ENCOLAR[id]` (un «en espera» detrás de un rechazo firme decía «liberá espacio»). `test_guardado` M7.
    ⚠️ Codex publica en `main` sin la batería entera: correrla acá antes de dar por bueno lo suyo.
- **02/10, §4hg — guardado durable, borrador y reintento (autorizado por el dueño).** El formulario
  conserva en `LS_PEND` la misma fila/id/revisión ANTES de `apiSave`; si no puede verificar la copia,
  no envía. Una respuesta definitiva retira SOLO el JSON enviado; un error de red no pisa una
  corrección más nueva. `flushPending` no duplica ids en vuelo y devuelve cuántos rechazó el servidor.
  El pie usa `misReintentarCola`: cola vacía por rechazo NO es éxito. `confirmarReemplazoForm` pregunta
  antes de sustituir un pedido nuevo a medio llenar al editar o completar uno de Kommo; Cancelar
  vuelve al formulario intacto. `tests/test_guardado_durable.js`: 41 comprobaciones aisladas.
  No cambia el `.gs`: sigue `2026-09-30-a`; basta recargar la página publicada.
- El backend puede exigir la **clave del equipo** (`PANEL_KEY`, propiedad del script) en toda lectura/escritura;
  sin ella configurada queda abierto y el panel lo avisa en rojo. **En espera por decisión del dueño (05/09/2026):
  no configurarla hasta que él lo pida.** Con `PANEL_KEY` puesta, forzar un día cerrado exige además
  `ADMIN_KEY` (bitácora §4cg). Kommo usa `KOMMO_HOOK_KEY` aparte.
  Ninguna clave va en el código ni en commits. Detalles y orden de despliegue: bitácora §4ce.
- Cambios al `.gs` NO se publican solos: el dueño hace Implementar → Nueva versión. Subir `SCRIPT_VERSION`,
  `SCRIPT_VERSION_ESPERADA` (página) y `ESTA_VERSION` (adentro de `probarAntesDeImplementar`) juntos: `test_servidor` §11
  compara la primera con la última (el 28/09 lo atajó).
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
  **la PÁGINA se publicó el 25/09 a las 15:04 de Bolivia** (`394f74c`, feriado, con el equipo sin trabajar) **y otra vez el 26/09 a las 10:11** (`a8e3c5e`: §4gb + §4gc) **y a las 11:27** (`e2e613a`: §4gd). **El 26/09 ~10:15 el dueño implementó la 23-b** (probar ✅, stock 20.932/50.000; versión anotada para volver: **30**, la 20-a) **y ~11:35 la `2026-09-26-a`** (probar ✅, stock 22.208/50.000 = 44 %; 🔒 Cerrar día dice «versión 2026-09-26-a» sin línea gris) **y el 28/09 ~15:24 la `2026-09-28-a`** (§4gp: probar ✅, stock 22.642/50.000 = 45 %; Cerrar día dice «versión 2026-09-28-a» sin línea gris) **y el 30/09 entre las 12:35 y las 12:44 la `2026-09-30-a`** (§4he: probar ✅, stock 22.638/50.000 = 45 %; el diagnóstico de las 12:46 la leyó comprimida y con lo cambiado, las dos cuentas «da ✅»; la página, 12:46). **Volver atrás de la 30-a** = ✏️ a la **versión 34** (la 28-a) Y pegar la 28-a (`4ded824…`, 1980 líneas). **Volver atrás de la 28-a** = ✏️ a la **versión 33** (la 26-a) Y pegar la 26-a (`ea81bb0…`, 1965 líneas); de la 26-a, a la 23-b de esa mañana (número sin pasar) Y pegar `14dec98…` (1956 líneas). Rige la protección entre dos equipos del stock/arqueo y de los días cerrados/carga). `tests/test_concurrencia.js`
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
  decía `Script function not found: kommoRepaso` — el pegado del `.gs` NO entró entero. El dueño
  lo había copiado **del archivo que le mandé por el chat** (`SendUserFile`).
  🚫 **NUNCA mandarle el `.gs` por el chat para que lo copie**: la vista del chat corta un archivo
  tan largo (~100 KB). Siempre el enlace **raw de GitHub FIJO A UN COMMIT**, que es texto plano entero
  (`https://raw.githubusercontent.com/eduardoxyz22-maker/MULTIESPUMAS/<sha completo>/google-apps-script.gs`;
  el de una RAMA se cachea 5 minutos y puede dar la versión vieja), y decirle en qué línea y con
  qué termina (`}`, con `return borrador;` antes) para que lo compruebe.
  ⚠️ **Volver atrás en ✏️ es a la versión ANOTADA antes de implementar, nunca «la anterior» a
  ciegas**: la versión del 23/09 quedó guardada en Google y es el pegado roto.
  · 🧓 **La página VIEJA y la nueva a la vez** (revisión del 24/09, bitácora §4fz-b): la vieja
  reescribe el stock sin `rs`/`t` y su «Llegaron» solo sube `q.ru`. **`stockLeerDePanelViejo`** lo
  reconstruye al leer (foto sin `rs` = recepciones de esa fila ya restadas; `q.ru` de más =
  recepción `legacy:d<n>`), y **una fila sin `_dev` se junta con la regla «viejo»** (`sisJuntarFila`
  → `fusionarViejo`: en lo compartido gana la planilla). ⚠️ Toda recepción «legacy» se reconoce con
  **`stockRecLegacy(r)`**, nunca con `r.id==='legacy'`. El arqueo anotado antes de tener la planilla
  usa de base el espejo (`ARQUEO_ESPEJO_TXT`). `tests/test_transicion.js` monta la página vieja
  desde git (`ebc3eab`).
  · 📏 **El stock va en UNA celda y Google corta en 50.000 letras**: el `.gs` contesta `celda_llena`,
  `probarAntesDeImplementar` lo mide y el panel avisa pasadas las 45.000. **Medido el 02/10 (§4hl, PUBLICADA 02/10 17:26, `5caebd6`)** con el catálogo
  real en tres almacenes: el **82 % son las fotos** (`u` + `cod` de PTF, Banzer e IM), que no crecen con el tiempo; lo único
  que crecía eran los pedidos a fábrica recibidos (`p`, ~10 %). **`stockPodar(S, hoy)`** (02/10, dueño: «hazlo»): recibido
  hace < `STOCK_RECIBIDOS_DIAS`=45 entero; más viejo, solo como MUESTRA (`stockMuestraDe`: id, k, u, tipo, de, fab, f, r,
  enConteo —sin `recs/ru/total/esp`—) y solo si lo mira alguna cuenta (últimas `STOCK_MUESTRAS` llegadas de su fábrica con
  empates, el pedido más nuevo de su producto, o una recogida que `g[de].rs` todavía nombra); a `STOCK_RECIBIDOS_TOPE`=120,
  nada. ⚠️ **La misma poda en los tres caminos** (`leerStock`, final de `stockFusionar`, `filaStock`): la junta por id revive
  lo que un lado sacó y sale podado otra vez. `STOCK_MUESTRA_DIAS`=60 reemplaza el 60 a mano. **No se podan `cod`**
  (`stockClaveInv` los usa también para códigos del catálogo, `stockCorteViejo`, `productoDeAlmacen`, `saldoCodigosAlmDe`,
  `stockCodRecordar`) **ni `rs`**: si hay que bajar de verdad, la decisión siguiente es `cod`. Hoy la poda achica poco (el
  stock se usa desde el 07/09): acota el crecimiento. `tests/test_stock_podar.js` (39; las cuentas dan lo mismo que la
  regla vieja hoy y a +50 días).
  · **Publicar = pegar y probar el `.gs` ANTES de publicar la página, todos F5, recién ahí
  implementar** (bitácora §4fz-b «Publicar»).
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
    🏬 **La única excepción, pedida por el dueño el 28/09 (§4gm, publicada 28/09 15:02, `7fe7551`): las ventas de Eduardo A
    MULTICENTER sí cuentan** como las del equipo (`stockEduardoMulticenter`), con los mismos umbrales.
    Eduardo a cualquier otro cliente sigue afuera. Ver «🏬 Eduardo a Multicenter» más abajo.
    `vendidosRotacion`/`nVentasRotacion`/`sem` son solo del equipo (+ Eduardo a Multicenter). `o.rotacion`: `baja` (<3
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
    va sin Eduardo, puntuales ni RPT (regla de §4dj; el cartel del cuadro lo dice). Desde §4gm (28/09, publicada 15:02): **con** las ventas de Eduardo a Multicenter, que ya no son `stockPedidoUnico`.
  - **📥 De qué almacén se va a buscar** (§4ey): la marca del producto es `x.chk='im'` +
    **`x.chkDe`** con el almacén (vacío = IM, el de siempre: nada de lo viejo se migra) y,
    si la línea salió de DOS almacenes, **`x.chkDes`** = `[{de,u}]` con el desglose.
    `recogerLista()` arma un botón por almacén en la ficha — IM + los de `STOCK.g` + los de
    `RECOGER_EXTRA` (hoy vacío: Banzer pasó a `ALM_SALIDA`, §4ge), sin repetir; `recogerCorto(x)` es el nombre para un
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
- **🩺 «No conecta» pero el servidor anda (§4hb, 29/09)**: el respaldo de Kommo usa `kommoLeads`, que el `.gs` atiende
  ANTES que todo, así que NO prueba la lectura. Para eso está «Diagnóstico de la lectura del panel»
  (`herramientas/diagnostico_lectura.py`; corre al pushear sus archivos, y a mano cuando esté en `main`): hace la MISMA
  lectura que el navegador y dice código, tiempo, tamaño, CORS y filas, sin datos de clientes. El 29/09 22:31-22:39: 200 en
  2-3 s, 901 KB **sin comprimir** (Google no comprime aunque se pida gzip), y a las 22:36 una lectura tardó 59 s también
  desde GitHub: Google lento a ratos. «Nunca se pudo leer la planilla en este dispositivo» = desde que se abrió la página
  (`ULTIMO_REFRESCO` vive en memoria). **Hecho en §4he (página publicada el 30/09 a las 12:46, `3606980`)**: el cartel ya no culpa a la versión y dice
  «desde que abriste la página», la lectura va comprimida y solo con lo cambiado (con el `.gs` 2026-09-30-a). El
  diagnóstico también hace esas dos lecturas y rehace la cuenta de control.

## ✅ Cierre de entregas y 🧮 control del corte (§4hn, 05/10 — EN LA RAMA, sin publicar; diseño en `RESPUESTA_CLAUDE.md` §30)
El dueño (05/10): *«logística no marca que llegó de fábrica, solo lo que se pidió, y cada día solo suben las existencias de
los almacenes»*. Codex (PDF del 05/10) marcó el camino en cuatro etapas; hechas la 1 y la 2.
- **✅ Cierre de entregas** (etapa 1): botón en Administración + cartel desde las **16:30 de Bolivia** (`CIERRE_ENT_HORA`).
  Lista de hoy (`cierreEntEntra`: sin sistema, retiros, borradores de Kommo ni tienda; ATC y RPT sí) **tildada como
  propuesta**; atrasados (14 días) aparte y **destildados**, con «¿qué día se entregó?». Abrir no escribe. Confirmar
  **relee la planilla** (`refrescarEstadoYa`) y saltea borrados, reprogramados y ya marcados, diciéndolo. Guarda
  `p.entregado` + **`x.eF/eT/eQ` adentro de cada producto** (las columnas de la planilla son fijas; un panel viejo los ignora).
  «Quién cierra» = `me_cierre_quien` por aparato. **Sin parciales por línea** (dueño: no pasa). `tests/test_cierre_entregas.js`.
- **🧮 Control del corte** (etapa 2): al subir el Excel, `stockConciliar` compara **esperado = previo + llegadas anotadas −
  salidas de la ventana** (`stockVentanaCorte`: UNA ventana; el día del corte entra solo con la casilla «ya incluye las
  entregas») con el archivo. **Nada se cierra por fecha** (la casilla «Darlos por llegados» se fue; `existPedidosVencidos` es
  solo informativo). `dif>0` = «entrada sin explicar» → queda como **detección** (`STOCK.det`) y se **sugiere** contra los
  pedidos pendientes, **destildada**; tildar crea la recepción `x:<detección>|<pedido>` (`se:1`, `enConteo`: no mide plazos).
  `dif<0` = «salida o ajuste sin explicar» → se puede anotar como salida sin pedido (`STOCK.sm`; también «📤 Salió sin
  pedido» en la pantalla de stock). Líneas 🏭: su llegada se sugiere sellar (`prodR`), su entrega explica la baja.
  ⚠️ **Ids derivados del corte** (`existCorteId` = almacén|fecha|hora|huella): dos equipos con el mismo archivo → la misma
  recepción (3 de 10 dos veces = 3/7). ⚠️ **Deshacer = lápida `an`, nunca borrar** (la junta por id revive lo borrado):
  `stockNormalizarRecepciones`, `fusRecs` y la poda la respetan. El mismo corte corregido anula lo que cerró la versión
  anterior y lo vuelve a sugerir (`mismoCorte`). `o.detectado` → **`stockEnCaminoSeguro(o)`** en `libre`, `stockCuantoPedir`,
  `stockMesesSobra`, `pedir`: lo «en camino» que una detección sin asignar ya podría ser no se cuenta como seguro. `o.reclamar`
  → «🚚 Ya pedido · ⚠️ reclamar». Un campo nuevo de `STOCK` (`sm`, `det`, `v`, `h[].d/hu`) ya entra en `stockFusionar`,
  `leerStock` y `filaStock` (tope 60 días). `tests/test_control_corte.js` (32); `test_existencias` §6, `test_rev_stock` y
  `test_adm_alta` §2 cambiaron a conciencia (esperaban el cierre por fecha).
- Decisiones del dueño (05/10) y lo que falta (etapas 3-4: asignación automática con evidencia, plazos estimados aparte,
  patrones de diferencias, Moreno): bitácora §4hn y `RESPUESTA_CLAUDE.md` §30.

## 🎃 Tema de Halloween (§4hm, 03/10, dueño: «la 1 y sí también al dashboard»; PUBLICADO 03/10 11:06, `093862f`)
- Clase `tema-halloween` en `<html>` SOLO en octubre con la fecha de Bolivia (script de una línea en el `<head>` de
  `pedidos.html` y de `panel_template.html`); se apaga sola el 1/11 (Todos Santos) y vuelve cada octubre. Solo CSS:
  encabezado de noche + 🎃 + telaraña + cupos en naranja + pestaña elegida en morado (pedidos); caja de la marca y menú
  elegido (dashboard). También en el dashboard de **Sueña**, que vive en OTRO repo (`MULTIESPUMAS-VISCARRA`). ⚠️ No usar naranja para nada que se pueda confundir con los avisos en ámbar. `tests/test_halloween.js`.
- **🧙‍♀️ Risa de bruja** (03/10): `halloween-risa.mp3` = **el archivo que mandó el dueño, ENTERO y tal cual** (9,6 s, tres
  risas, 230 KB, el mismo que le suena en su panel de SPADENTAL; dueño: *«mejor no la recortes, que suene entera»*), en la raíz
  de los DOS repos. Suena con `new Audio(...).play()` en el PRIMER `touchend`/`click`/`keydown` después de abrir la página —los
  navegadores no dejan sonar al abrir— **una vez por apertura, sin tope por día** (como en SPADENTAL). Solo con el tema.
  ⚠️ Cambiar el archivo = subir el `?v=` de `hwRisaArchivo` (hoy `?v=2`). Publicada 03/10 11:47 (`529afcb`; Sueña `62e55bf`)
  y corregida la misma tarde (bitácora §4hm).
  🚫 **No recortar un MP3 por cuadros desde el medio**: el recorte de la primera risa (cuadro 20 del original, con
  `main_data_begin`=367: dependía del depósito de bits de cuadros que ya no estaban) sonaba en Chromium y **en el iPad no**
  («no suena nada»). Safari rechaza lo que Chromium perdona. Si hay que recortar, desde el cuadro 0 o codificando de nuevo, y
  probarlo en el iPad del dueño antes de dar por bueno. La de «una vez por día» (`hw_risa_dia`) se sacó: le impedía probarla.
  ⚠️ En una prueba, esperar a que `play()` conteste antes de contar (`__pend`): con la batería cargando la máquina tarda.

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
- Son **dos bolsas por día**: 12 en 🌅 AM y 13 en 🌆 PM (sábado 15 y solo AM; domingo y feriados cerrados, §4gy).
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
- **↩️ «Era un pago de la venta»** (§4gr, **publicada el 28/09 a las 18:28**, `bf19fc8`). El dueño: *«no eran recargos por entrega
  sino pagos»*.
  - `ctaEnvioAPago(id, e)` pasa un recargo **ya cobrado** a los cobros de la venta tal cual: fecha, monto, método, banco,
    nota, `>quién recibió` y fotos, sin mandar ninguna foto a la papelera.
  - Usa `aplicarCobros` con el objetivo de antes, así que el total de la venta no cambia y baja el saldo. Hace un solo
    guardado.
  - Si la venta ya figuraba pagada queda «cobrada de más», y se dice.
  - Le pasa `cobrosDe`, no `cobrosReales`: en una «PAGADA sin monto», las fotos del método suelto se mudan al pago nuevo.
  - No aparece en un recargo pactado, ni en una ATC o RPT.
  - `tests/test_envio_a_pago.js` (28; 20 rojas contra `7fe7551`).
- **🗑 Borrar un pago registrado, ✅→📥 el pago nuevo saca la marca, 💵 quién recibió el efectivo** (§4hk, 02/10, dueño: *«hazlo»*, PUBLICADA 02/10 17:26, `5caebd6`;
  `tests/test_plata_borrar.js`, 39, 33 rojas contra `f491137`):
  - **`ctaBorrarPago(id, i)`**, botón «🗑 Borrar este pago» dentro de «✏️ Corregir este pago» (solo con monto > 0 y sin `sinMonto`).
    Un COBRO: `aplicarCobros` con el objetivo de antes (el total no cambia, lo borrado vuelve a «falta cobrar»); si era el 2° método
    del mixto, `p.acuenta` baja al anticipo (la regla de `ctaGuardarPago`). El ADELANTO: se reescribe `metodoPago` sin él, **`p.acuenta=0`**
    (si no, `anticipoDe` lo rearma) y `aplicarCobros(p, cobrosReales, ventaTotal de antes)`; una «SÍ, pagado» (§4cb) vuelve a deber
    el total. Un RECARGO: solo ese renglón (`ctaIdxEnvio`). Fotos a la papelera DESPUÉS y con `borrarFotoSiNadieLaUsa`. El pago de
    mentira (§4fg) se niega. La marca ✅ no se toca y la pregunta lo avisa. No se puede deshacer.
  - **`registradoSigue(p, nuevo)`** (MEDIA-5): `aplicarCobros` compara `cobros.length` con **`cobrosDe(p).length`** (el de mentira
    incluido: anotarle el monto no es un pago nuevo; si el de mentira llegó, `huboSuelto`, cualquier real que lo acompañe sí lo es) y
    `aplicarEnvios` cuenta los cobrados; un pago/recargo NUEVO sobre una venta ✅ la deja «📥 sin cargar» con aviso rojo. Corregir,
    borrar y `ctaEnvioAPago` (**`opts.mismaPlata`**, 4° argumento de `aplicarCobros`) la conservan. En el formulario, `_regFin`
    (`submitPedido`): «SÍ, pagado» con `_nuevos`, un flete cobrado nuevo o un adelanto recién anotado la sacan, y `_avisoPlata` lo dice.
    ⚠️ Una fuente NUEVA de cobros tiene que pasar por `aplicarCobros`/`aplicarEnvios` para heredar esto.
  - **`admQuienRecibio(id, desde)`** (MEDIA-4): `quickCobrado` (tabla) y `markPaid(…,'Efectivo')` (ficha) preguntan quién recibió
    SOLO con `admEfectivoConDuda(p)` = hay chofer y el camión ya salió (`entregado`, o `fechaSalida(p) <= hoy`); «🚚 El chofer» /
    «🧑‍💼 la vendedora» / otro chofer (`choferesParaSelect`) → `admCobrarEfectivo` → **`applyPaid(p, metodo, banco, recibio)`** (4°
    argumento nuevo, `>Nombre` §4eq). Sin chofer o con la entrega por delante, directo como siempre (los fixtures viejos no cambian).
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
  · MEDIA-4 (💵 de Administración dejaba el efectivo en la vendedora aunque hubiera cobrado el chofer) y MEDIA-5 (un cobro
  nuevo sobre una venta ya ✅ no avisaba) quedaron hechos el 02/10 (§4hk, arriba: `admQuienRecibio`, `registradoSigue`).
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
- **«Mañana» de entrega = `proximoDiaEntrega()`** (§4ex): mañana, saltando domingos y (§4gy) feriados.
  Va en todo lo que mira el camión (chofer, carga, ruta, mapa, faltantes, parte, WhatsApp,
  Excel, estadísticas); el formulario, «Cerrar día», la recogida de Moreno y el importador de
  ROHO siguen con `tomorrowStr()`. Un test que arme un pedido «para mañana» y lo espere en el
  chip «Mañana» tiene que usar `proximoDiaEntrega()` o se pone rojo los sábados.
  `tests/test_sabado.js` (reloj clavado).

## 🔎 La revisión con cuatro agentes del 25/09 (§4ga): lo que quedó y hay que respetar
- **Agosto «entregado»** (pedido del dueño): `herramientas/marcar-entregados-agosto.gs`, archivo APARTE que el
  dueño agrega al proyecto de Apps Script (➕ → Secuencia de comandos), **nunca adentro de Código.gs**, y corre
  desde el editor (`verPendientesAgosto` → `marcarEntregadosAgosto` → `deshacerEntregadosAgosto`). Anda con el
  `.gs` 20-a y con el 23-b (usa `getSheet`, `rowToRec_`, `HEADERS`, `REV_COL`…). ⚠️ **Todos los archivos de un
  proyecto de Apps Script comparten los nombres**: uno repetido pisaría al de Código.gs. Desde esta sesión NO hay
  salida a Google (el proxy rechaza `script.google.com`): no se puede escribir la planilla desde acá.
  `test_servidor.js` §13 lo prueba contra los dos `.gs`.
- **Plata**: `CTA_FORM_ENV` — el botón de la ficha de Contabilidad hace lo que dice el bloque (venta pagada =
  bloque del flete); la pregunta de §4fk queda para «💵 Pago» visto y la venta saldada en otro lado. El **💰✓ de
  Administración solo deshace cobros de la puerta** (`cobroDeLaPuerta`). `aplicarMontos` usa `cobrosReales` +
  `textoHistorial` (§4fg) y no desmarca una «PAGADA sin monto». El formulario conserva día y recibo del adelanto
  también en el MIXTO, y fecha el monto de una «PAGADA sin monto» el día de la venta. «Corregir precios y montos»
  lee con `parseMonto` («1.500» = 1500). ⚠️ El FORMULARIO todavía lee `f-acuenta`/`f-saldo`/`f-cobrado`/
  `f-envio`/`f-monto2` con `parseFloat` (pendiente, §4ga). Excel del Cuadre: columna «RECARGO POR ENTREGA» al
  FINAL (no mover las otras).
- **ATC/RPT en la puerta**: `noSeCobra(p)` va ANTES de `sinMontoAnotado` (tarjeta del chofer, hoja de ruta,
  fichas); `choCobrarMetodo` se niega. Todo camino que mueva fecha o turno de una ATC que vive en su devolución
  pasa por **`atcSeguirViaje(p, antes)`** (`antes` = `atcViajeDevolucion(p)` medido ANTES de mover — §4gd: con `atcEnDevolucion` una devolución ya entregada quedaba en el día viejo). El ✅ marca
  `rfAuto` y destildar saca solo eso.
- **La cola**: `flushPending` saca de la cola SOLO lo que se mandó y sigue igual (JSON de antes de mandar).
  ⚠️ **Nunca volver a `setPending(remaining)`**: pisaba lo que entraba mientras se mandaba. Un borrador de Kommo
  completado que espera en la cola NO vuelve a la bandeja (`borradorEnColaComoPedido`) y no se puede descartar.
- **Formulario**: una «Ubicación de Google Maps» que no se entiende FRENA el guardado (vacía es válida; la que no
  se tocó se guarda como estaba). `metodoFormulario` devuelve `comps` también en el método suelto, y
  `descartarImagenesSinPegar` no borra una imagen que algún pedido nombra (`fotoEnUso`). `heredarMarcas` pasa
  `prodF`/`prodR`. El «ok tardío» toma la OC de la fila si el servidor la renumeró.
- **Stock**: `stockMigrar` NO re-resuelve por nombre las claves de un código que el catálogo no conoce (salen del
  `cod` de cada foto); 🔗 Unir mueve también `g[..].u` y el `rs` de las recogidas, y `stockClaveInv` sigue la
  unión. Existencias sin la hora en el nombre: «ya incluye las entregas del día» arranca SIN marcar (§4cn).
- Pruebas nuevas: `test_rev_conta.js`, `test_rev_entregas.js`, `test_rev_stock.js`, `test_rev_pedidos.js` (todas
  con reloj clavado). ⚠️ **Una prueba que arma pedidos «para mañana» y mira un filtro de MES se pudre los días 29-30**:
  mirar en «Todo» o clavar el reloj. ⚠️ Los agentes con `isolation: worktree` arrancan de `main`, no de la rama:
  decirles que se muevan a la rama antes de empezar.
- **Esperan al dueño** (§4ga, «Quedan para decidir»): Moreno con unidades fantasma si se entrega una línea 📥 sin
  anotar la recogida; recojos de ATC en «A cargar»; sacar un pedido de un día cerrado sin clave; la celda de 50.000
  del stock (podar `STOCK.p` recibidos); `ocAutoGs_` sin RPT (exige republicar).

## 🔎 La revisión por pestaña del 26/09 (§4gb): lo que hay que respetar
- **Plata tipeada**: todo campo de plata es `type="text" inputmode="decimal"` (con `type=number` Chromium tira
  la coma: «1500,50» valía 150.050) y se lee con `parseMonto` (`montoForm` en el formulario); el signo menos se
  mira con `montoNegativo` y FRENA. Lo que el panel escribe en esos campos va con `r2`. Un campo de plata NUEVO
  va igual. Cantidades: enteros ≥1 (`cantidadesMal`).
- **Chofer**: desmarcar ✅ pregunta; el ✅ que choca se reaplica una vez (la plata no); el flete pactado se ve en
  la tarjeta pero lo registra la vendedora (§4ai). **Sin señal**: `rechazoPerdido` anota qué se perdió en un
  conflicto y `choRechazosHtml` se lo dice al chofer hasta «Ya lo revisé» — no se reaplica solo, a propósito.
- **Cerrar día relee la planilla** antes de reescribir `__dias_cerrados__` y aplica solo `CIERRES_CAMBIOS`.
- **ATC**: cerrar/reabrir desde «Anotar avance» mueve el ✅ si vive en su devolución (`atcEntregadoComoEnt`); el
  comodín va en `atcChip`/`atcComodinAviso` (un solo lugar).
- **Stock**: «Conté a mano» parte de lo calculado para hoy y conserva `c.cod`; una recepción `nr` (el Excel del
  origen ya no la tiene) suma acá sin restar del origen.
- Pruebas: `tests/test_rev2_*.js` (8), `test_montos_texto.js`, `test_chofer_sin_senal.js`.

## 🔎 La tercera vuelta del 26/09 (§4gc): lo que hay que respetar
Publicada el 26/09 a las 10:11 de Bolivia (`main` = `a8e3c5e`), junto con §4gb, con el servidor 20-a todavía
implementado.
- **`parseMonto` ignora los separadores de las puntas** («Bs. 1.500.-» = 1.500; antes 0,10) y, con separadores
  repetidos, toma el último como decimal. ⚠️ «.50» vale 50. Un campo de plata de texto deja entrar lo que se pega
  de WhatsApp: cualquier cambio a `parseMonto` se prueba con esos textos (`test_rev3_plata` §1).
- **`rechazoResuelto(id, t0, que)`**: un reintento que volvió a poner algo (el ✅, una foto) saca SOLO eso del
  rechazo; lo demás que se perdió se sigue diciendo. Nunca borrar el rechazo entero.
- **La recepción `nr` deja una marca en `g[de].rs` con 0 unidades (`nr:1`)**: es lo que frena a una página vieja
  que no conoce `nr`. No sacarla.
- **Las filas que se reescriben ENTERAS** (`__dias_cerrados__`, `__carga_chk__`) van por `REESCRITAS`:
  - se relee la planilla y se aplica solo lo tocado acá (`CIERRES_CAMBIOS`/`CARGA_CAMBIOS`);
  - en la cola llevan `_cambios`, que no viaja a la planilla;
  - `flushPending` las rearma con `mandarReescritaDeCola`, y sin lectura NO se mandan;
  - una fila nueva de ese tipo va ahí, no por `queuePending` a secas.
- **ATC**: `rec` vale solo mientras hay `pdev`, y «Quitar la devolución» repone `rturno`. `atcViajeDevolucion`
  (con el ✅ puesto) vale para mostrar y, desde §4gd, para el `antes` de lo que MUEVE la devolución.
- **«Corregir precios y montos» recuerda lo tipeado** (`ctaMontosRecordar`, igual que `ctaEditRecordar`);
  cancelar «¿borrar el pago?» repone «A cuenta». **`tsFmt` va en hora de Bolivia.**
- **Cuadre**: `setCuadreArqueo` guarda enseguida y repinta un instante DESPUÉS. Repintar dentro del `change` le
  saca el foco al campo siguiente.
- **Stock**: `stockEntradaVale` manda por hora cuando hay hora de los dos lados, y la entrada que sale de una
  recepción lleva su `ts`.
- La hoja de ruta dice el flete pactado (`cobroRutaTxt` → `f`) con las palabras de la tarjeta del chofer.
- Pruebas: `tests/test_rev3_*.js` (6) y `test_noborra` (el cancelar).

## 🔎 La revisión de Codex del 26/09 (§4gd): lo que hay que respetar
- **Plata tipeada: `montoError(t)` ANTES de `parseMonto`** (el texto entero: «1e3», «12abc», «.50», dos números,
  cualquier signo menos —`montoNegativo` ve los ocho, también «Bs -1500»—). Un campo de plata NUEVO frena con
  `montoFrena(el, nombre)`. Lo que se lee de la planilla NO pasa por ahí. Lo que el panel propone en un campo, con `r2`.
- **`rechazoPerdido`** compara cobro por cobro (método|monto|fecha|quién recibió) y cada cobro de la planilla vale
  por uno. El cartel del chofer (`choRechazosDe`) no se vence, es de cada chofer y el tope no tira lo no revisado.
- **`choEntregado` reaplica el ✅ solo sobre el MISMO viaje** (fecha + `atcViajeDevolucion`): si lo movieron, no
  marca y lo dice (`perdio.movido`).
- **Días cerrados y tildes de la carga con sello**: cada guardado va con `REESCRITA_REV` (`reescritaConSello`) y
  `{juntar:true}`; ante `conflicto`, `reescritaJuntarYGuardar`. El `.gs` **2026-09-26-a** (`SISTEMA_JUNTA_OPCIONAL`)
  compara el sello SOLO si llega `juntar`: un panel viejo no se traba. Con la 23-b sigue como antes. Página
  publicada el 26/09 a las 11:27 (`e2e613a`) y servidor 26-a implementado ~11:35. ⚠️ Una fila
  nueva que se reescriba entera va por `REESCRITAS` y este camino. `tests/test_codex26_cierres.js` (el `.gs` real).
- **Existencias**: la hora sale del nombre (también con guiones) o del pie (`existHoraDePie`). Hay UN solo depósito
  de fábrica (`STOCK.c`): hacer «log» a otro almacén pregunta antes.
- **Banzer es depósito de salida** (dueño, 26/09: «salen camiones de Banzer y de Productos Terminados; solo de
  Moreno hay que ir a traer»; carga separada en dos bloques). Hecho en §4ge (ver la sección siguiente).
- Pruebas: `test_codex26.js`, `test_codex26_cierres.js`, `test_rev4_montos.js`, `test_rev4_atc_flete.js`, `test_servidor.js` §14.

## 🚚 Banzer, depósito del que salen camiones (§4ge, 26/09)
El dueño: *«salen camiones de la banzer y de productos terminados fábrica; solo de moreno hay que ir a traer»*.
**Publicado el 26/09 a las 17:15 de Bolivia** (`main` = `39b833c`), sin tocar el servidor (sigue 2026-09-26-a).
- **Quién es de salida lo dice UNA función, `almEsSalida(nm)`**: el rol elegido al subir el Excel
  (`STOCK.al`: `'sale'` o `'trae'`) manda; con el `'otro'` de antes decide `ALM_SALIDA=['Banzer']`. IM/Industrias
  Moreno y el de fábrica nunca son de salida. `RECOGER_EXTRA` quedó vacío.
- **La marca**: «✔ hay en Banzer» = `chk:'ok'` + `chkDe` (el nombre del stock); partida, `chkDes` (lo de acá con
  `de:''`). El TIPO de cada parte lo da el lugar, no la letra (`prodPartes`: `aca`/`sale`/`trae`). `prodHay(x)` = se
  carga (acá o Banzer); `esRecoger(x)` = hay algo que ir a BUSCAR. ⚠️ Nunca volver a `x.chk==='im'` a secas para
  decir «recoger», ni a `x.chk==='ok'` para decir «hay acá».
- **Marcas viejas «📥 Banzer»**: se leen como ✔ Banzer sin reescribir la planilla, salvo que tengan una recogida de
  Banzer anotada (`saleRecogidaViva`): esa sigue como recogida hasta cerrarla (si no, se descontaba dos veces).
- **Cuentas**: lo entregado desde Banzer baja `STOCK.g[Banzer]` (`salSale`, misma regla de fecha que acá con su propio
  `g[nm].inc`); lo disponible para cargar es **`stockHaySalir(o)` = acá + Banzer** (proyección, pedir, Qué producir,
  plata parada). `deposito` sigue siendo solo acá; `enOtros`/«traer» solo lo de ir a buscar.
- **Revisión automática**: orden del dueño intacto (acá → Banzer → IM, «cubre entera» primero); `tomarIM` con
  `solo` (true = solo salida). `cambia` compara lugares con tipo (`partesMismosLugares`); la marca vieja → ✔ va
  como `migra` y no cuenta como «contradice a una persona».
- **Lista de carga**: «🏭 Cargar en fábrica» (claves de SIEMPRE) y «🏪 Cargar en Banzer» (clave `…|@Banzer`, 4° pedazo
  de `cargaChkKey`), podadas por `textoCargaChk` como siempre. Chofer, ruta, WhatsApp y Excel: `prodSaleTxt`.
- **Al publicar, todos F5**: una página vieja lee «✔ Banzer» como «✔ acá» y al corregir el pedido pierde el lugar.
- `tests/test_banzer_salida.js` (77; 62 rojos contra `e2e613a`). `test_banzer.js` arranca con la configuración de antes
  (`ALM_SALIDA=[]`, `RECOGER_EXTRA=['Banzer']`) para seguir cuidando varios almacenes de ir a buscar.
- **Revisión del 26/09 a la noche (§4gf, publicada 19:38, `2c777fe`)**: `normNombre`, `stockNorm` y `stockAlmLimpio` **recuerdan su resultado**
  (memo con tope): tienen que seguir siendo PURAS (mismo texto → mismo resultado, sin leer nada de afuera). Con eso la
  lista de carga de «Todos» con 900 pedidos bajó de ~1 s a 0,16 s. `leerStock` repone `g[nm].inc` desde el historial
  (`STOCK.h`, mismo almacén/día/hora) cuando una página vieja lo borró. `tests/test_rev_banzer.js` (25).
- **Orden dentro de los almacenes, confirmado por el dueño (26/09, 19:35)**: «el que la cubre entera» SIGUE antes que
  Banzer (0 acá, 3 Banzer, 5 IM y un pedido de 4 → los 4 de IM). No cambiarlo sin que lo pida.
- **Decidido por el dueño (26/09, 17:14)** — no cambiar sin él: una «📥 Banzer» de fecha pasada se da por salida (como
  cualquier ✔); NUNCA se trae de Banzer a fábrica (sin recogidas desde Banzer); el bloque de Banzer va bajo el camión de
  cada pedido («así alcanza por ahora»; asignar otro camión a Banzer queda para cuando lo pida).

## 🔎 La revisión de Pedidos del 26/09 a la noche (§4gg, publicada 20:40, `caef927`): lo que hay que respetar
- **Un pago YA REGISTRADO no se cambia callado desde el formulario**: `EDIT_PLATA0` guarda cómo se veía la plata al
  abrir la edición; si con los montos iguales se tocó el método, el banco o el «Monto total cobrado», `submitPedido`
  pregunta y dice que se corrige en Contabilidad → ✏️ Corregir este pago (los pagos quedan como están).
- **`_tieneHist` no cuenta el flete** (`esEnvio`): el bloque del recargo lo reescribe aparte. Y una venta con saldo
  NEGATIVO (cobrada de más) sigue «pagada» (`<=0.009`), sin preguntar «¿borrar el historial?».
- **Una venta cobrada sin adelanto** abre el «Monto total cobrado» con `contaCobrado(rec)` (no vacío).
- **«SÍ, pagado» propone el TOTAL** (`pagadoSugerirTotal`: a cuenta + saldo + lo ya cobrado), nunca el adelanto; lo
  tipeado a mano no se toca.
- **ATC/RPT → OC al editar**: toma el próximo número de las OC de su mes (`nextOcMes`) si el número era del panel.
- **Editar no cambia el vendedor recordado de la compu** (`setVendedorMem` solo en pedidos nuevos).
- **Lecturas tardías**: `BORRADO_AQUI` (90 s) impide que una lectura vieja devuelva lo recién borrado (pedidos y
  borradores de Kommo), y `mergePending` conserva lo guardado acá hace menos de 90 s que la lectura todavía no trae.
- **RPT**: `sucursalElegida` reemplaza zona/dirección/pin que puso OTRA sucursal de la lista; lo escrito a mano se respeta.
- **Decidido por el dueño (26/09, 20:37) y hecho en §4gh (`8194622`, publicado 21:21, `13d00ee`)**:
  · **A. Corregir el PRECIO conserva los pagos** (`_soloPrecio`): quedan tal cual (fecha, recibo, `>chofer`, imágenes,
  adelanto, mixto, flete) y el saldo y «pagado» se recalculan como `aplicarCobros` (saldo 0 = pagada; negativo =
  cobrada de más). Si cambió «A cuenta», se corrige SOLO el adelanto (`_rehaceAdel`, §4fr) y los otros cobros quedan.
  «¿Borrar el historial?» se pregunta solo si de verdad se va un pago (`_seBorran`). `_rehaceTodo` queda solo para
  cambiar el reparto del mixto de una venta YA pagada.
  · **B. «SÍ, pagado» al editar una venta con pagos sin saldar** (`pagoRestoPrev`): lo ya cobrado queda en su día (el
  adelanto suelto pasa a renglón con el día y el recibo de la venta) y lo que faltaba entra HOY como cobro nuevo, con el
  método/banco/imagen NUEVA del formulario (`faltaComprobanteForm` la pide como Contabilidad; las imágenes de pagos ya
  registrados no cuentan, `imgsPagoDe`). `p.acuenta` sigue siendo el adelanto. Menos que lo ya cobrado → pregunta y
  queda cobrada de más. El adelanto pagado con dos métodos no se toca desde acá (manda a Contabilidad).
  · `cobradoFueraDeAcuenta(p)` = lo cobrado fuera de «A cuenta» (sin el 2° método del mixto, que ya está en `acuenta`):
  lo usan «Usar como total», `pagadoSugerirTotal` y el saldo 0 con cobros aparte. Tocar SÍ y después NO repone «A
  cuenta» y «Saldo» (`PAGO_NO_VISTO`). Una venta pagada reabre con TODO lo que entró en «Monto total cobrado».
  · `tests/test_rev6_plata_form.js` (52; 42 rojas contra `e1e207b`). `test_rev5_pedidos` 8a cambió a conciencia.
- `tests/test_rev5_pedidos.js` (49; 30 rojas contra `2c777fe`).

## 📱 Pedidos desde el celular (§4gi, publicado 26/09 23:14, `bd5dde3`): lo que hay que respetar
- **«＋ Nuevo pedido» con una edición abandonada** (`tabNuevoPedido`): si hay `EDIT_ID` y la persona no está en el
  formulario, se pregunta; Aceptar = `resetForm()` y pedido NUEVO. Antes el formulario seguía siendo la edición y el
  pedido nuevo PISABA la venta anterior en la planilla (ALTA). La pestaña no vuelve a `showView('form')` a secas.
- **Avisos (`toast`)**: `width:max-content; max-width:min(90vw,640px); pointer-events:none` (solo texto) y duran lo que
  lleva leerlos (`toastMs`: 50 ms por letra, entre 2,8 y 12 s). No volver a `left:50%` sin ancho: en 390 px era una
  columna de 195 que tapaba Guardar.
- **Editar**: una venta de tienda vuelve a donde se abrió (no a Contabilidad) y «Cancelar» del cartel de tienda también;
  un pedido SIN turno sigue sin turno (`turnoDe`, `#f-turno-hint`); el 2° método del mixto se escribe SIEMPRE (vacío si
  no hay), para que no aparezca el de la edición anterior.
- **Mis pedidos** (dueño, 26/09): los números cuentan por la fecha de ENTREGA y el cartel lo dice («pedidos que se
  entregan hoy», «se entregan este mes», «saldo de lo que se entrega este mes»); las ventas de tienda no entran. Los
  botones de filtro (`#mis-chips`) van JUSTO ARRIBA de `#mis-lista`, debajo de los números.
- `tests/test_rev7_celular.js` (35; 20 rojas contra `13d00ee`), viewport 390×844 con toques.
- **Pendientes (el dueño no los eligió)**: encabezado fijo alto en el celular; abrir ✏️ Editar de otra venta borra sin
  avisar un pedido NUEVO a medio escribir; la venta de tienda dice «Chofer: Sin asignar» y «Sin turno»; la ✕ de
  comprobantes (22 px) y «📎 abrir imagen» (18 px) son chicos para el dedo.

## 📦 El saldo debajo de cada producto del formulario (§4gj, publicado 27/09 11:16, `fecb3c6`): lo que hay que respetar
El dueño: *«los vendedores no saben cuál es el stock… que coloquen el código y les aparezca el producto, cuántos hay
pendientes de entrega, cuánto hay de saldo en almacén y si deben pedir a producción, informar al cliente que debe esperar
o si pueden agendar directamente»*. Primero pidió una pestaña; después, **en vez de pestaña, un aviso en el formulario**.
- **Un cuadrito debajo de cada producto** (nuevo y al editar; OC y RPT, nunca ATC, venta de tienda, entregados ni
  productos de tienda) cuando el renglón está completo: ✅ DISPONIBLE (programar desde el primer día con cupo) · 📥 HAY
  EN MORENO (se trae en 1 día) · ⏳ EN PRODUCCIÓN (esperar ~X días, llega el DD/MM) · 🏭 NO HAY (mandar a producir,
  esperar ~X días) · gris «Sin saldo cargado». Abajo «En almacén · Pendientes de entrega · Libres/Faltan», el reparto
  **PTF** · Banzer · Moreno y de qué corte y consulta es. ⚠️ «PTF» (productos terminados fábrica), NO «acá» (dueño,
  29/09, §4gz, publicada 11:43, `f722163`): los vendedores lo leen desde sus tiendas. **Libre = saldo en almacén − pendientes de entrega** (la
  cantidad del renglón; dos renglones del mismo producto se suman; al editar, el propio pedido no se cuenta).
  - **«Faltan N» lleva la cuenta escrita** (§4hf, dueño 01/10 «hazlo», publicada 01/10 12:29, `3b72cab`): «Faltan 2 (3 pendientes + 1 de este pedido − 2 en
    almacén)» = `v.faltan` = pend + cant − alm (`saldoFaltanCuentaTxt`). Hacía falta porque «Libres» no se muestra cuando da
    negativo y el dueño no veía que ya faltaba 1 antes de su pedido. Solo texto. `test_saldo_almacen` §1 (2 rojas contra `3606980`).
- **🏷️ Un código que NO está en la lista de precios pero SÍ en el Excel de un almacén** (dueño, 29/09, §4ha, publicada
  29/09 17:19, `2207922`): al
  escribirlo, `productoDeAlmacen(code)` completa el nombre y la medida. La medida sale de la clave del Excel. El nombre
  sale de `VENTAS_HIST` sin la medida si ese código está ahí y coincide; si no, de la clave. Un aviso dice «no está en la
  lista de precios… poné el precio a mano».
  - Aparece el cuadrito, también sin medida.
  - La medida del Excel no es 📐.
  - Si el código se escribió antes de que llegara el saldo, `prodCodigosDelAlmacen` lo completa en `saldoTrasLectura`.
  - ⚠️ **`stockIndiceApretado` y `ventasHistIndex` se rehacen cuando `STOCK` es OTRO objeto** (`_de`/`VENTAS_HIST_DE`).
    Antes `leerStock` los olvidaba ANTES de migrar y se volvían a armar con el stock viejo: un código de un Excel recién
    subido no se encontraba hasta la otra lectura. Quien cambie el stock EN EL LUGAR (sin asignar otro objeto) sigue
    llamando a `stockOlvidarIndice()`.
  - `tests/test_codigo_almacen.js` (13).
- **UNA sola cuenta**: todo sale de `stockData()` (`saldoDatos`/`SALDO_CACHE`, una vez por lectura) y de
  `saldoVeredicto(clave, cantidad, idEditado, fechaElegida, enCatalogo)`. `stockData` ganó `enRecogida` y un argumento
  opcional para productos del catálogo que no están en ningún Excel (sin él, da lo mismo que antes).
- **~X días** = los días REALES hasta el primer día de entrega con cupo (salta domingo, días cerrados y turnos llenos),
  no un número fijo. **La línea roja** «Para el <fecha elegida> no llega: programá desde…» se queda (dueño, 27/09): solo
  avisa, no frena.
- **Siempre al día** (el dueño: el corte se sube a las 9 y a las 15 ya entraron 9 pedidos de otros): los cuadritos se
  repintan con cada lectura; al completar un producto, si la última lectura buena tiene más de 1 minuto se pide otra
  (tope: una por minuto por dispositivo, `SALDO_LECTURA_MS`); botón 🔄 Actualizar; ámbar si el corte de acá no es de hoy
  («pedile a logística que suba el de hoy») o si no hay conexión.
- **Al guardar** (`submitPedido`), si algún producto quedó sin saldo libre o la fecha es antes de lo posible, un `confirm`
  con la lista; Aceptar guarda igual (nunca frena la venta). Usa la planilla recién leída (la última lectura de antes de
  guardar, la de cupos; una edición que cambia productos también lee). Al editar pregunta solo si cambió un producto, su
  cantidad o la fecha.
- **Ventana que quedaba** (dicha al dueño): dos que guardan la última unidad en los mismos 1-3 s la venden dos veces (el
  servidor no revisa stock); la lectura siguiente muestra «Faltan» a todos. **Desde §4hj (02/10, dueño: «hazlo») el servidor
  `2026-10-02-a` lleva el libro de reservas y el que guarda segundo se entera** (ver «📦 Servidor `2026-10-02-a`» más abajo).
- `tests/test_saldo_almacen.js` (83; 73 rojas contra `bd5dde3`), con el caso de dos vendedores contra el `.gs` real.
- **La revisión del 27/09 (§4gk, `8550355`+`89512b1`+`baa7e81`, publicada 12:58, `2040720`)** — tres renglones que NO salen del saldo del almacén, y a los que
  el cuadrito contestaba con el saldo de otro colchón. `saldoClasificar` les pone su grupo `f.g` (`esp|`/`cod|`/`fab|`),
  que es con lo que se suman y comparan (también el pedido guardado en `saldoFilasAGuardar`); solo `saldoDelAlmacen(f)`
  pide lectura:
  · **📐 Medida especial** (`saldoMedidaEspecial`, dueño: *«¿y qué pasa cuando es medida especial?»*): se fabrica a
  pedido, NUNCA sale del stock → azul «📐 MEDIDA ESPECIAL · se fabrica a pedido: ~X días» (fábrica del modelo,
  `saldoLeadModelo`, + 1 día, al primer día con cupo), sin números de almacén; con el código de la medida estándar
  pegado, avisa «borralo». ⚠️ NO es especial una medida estándar escrita distinto (`saldoMedidaCanon`: «160X190CM»,
  «2 plazas», «1,60 x 1,90»), un producto del catálogo en su propia medida, ni lo que algún Excel tiene con ese nombre y
  medida. Un producto desconocido en medida no estándar es especial (no gris).
  · **🏷️ Código de otra medida u otro producto** (`saldoCodigoOtro`): el stock identifica POR EL CÓDIGO, y la lista lo
  deja puesto aunque después se cambie la medida → ámbar «EL CÓDIGO ES DE OTRA MEDIDA… El de 140x190 es CH1220» y
  pregunta al guardar. «Otro producto» solo si el nombre es claramente otro del catálogo y no contiene al del código.
  · **🏭 Lo que ya se fabrica para ESTE pedido** (`enProduccion`, misma `prodClave` y MISMA cantidad, como
  `heredarMarcas`): «SE FABRICA PARA ESTE PEDIDO (pedido el…, llega ~…)», o verde si llegó.
  · Una ATC que al editarla pasa a OC se mira entera (`stockCuenta(prev)`); en una RPT la pregunta dice «a la sucursal».
  · **Decidido por el dueño (27/09)**: (1) el código de la medida estándar en una medida especial **se borra solo**
  (`codigoEspecialBorrar`: al salir del campo «Otros» y al empezar `submitPedido`), con aviso. ⚠️ NUNCA en un renglón
  ya guardado tal cual: lo de logística lo sigue por `prodClave` (`heredarMarcas`) y se perdería — ahí el cuadrito
  sigue diciendo «borralo». (2) Los borradores de Kommo **no** cuentan como pendientes. (3) **🔄 Actualizar: una lectura
  cada 15 s como mucho** (`SALDO_BOTON_MS`; con la última lectura fallida, lee igual).
  · **🏭 va antes que 📐**: la medida especial ya mandada a fabricar para ESE pedido dice cuándo llega. Y «🔵
  Especiales»/el celeste de la fila (`hasEspecial`) no marcan una medida estándar escrita distinto (`saldoMedidaCanon`).
  · `tests/test_rev8_saldo.js` (55; §1-5 rojas contra `fecb3c6`, §6-9 contra `89512b1`).
- **🕔 La hora en que entra el pedido, y las 48 h de fábrica** (§4gq → **§4gs**, **publicadas el 28/09 a las 18:28**, `bf19fc8`).
  - **📥 Moreno NO mira la hora** (dueño: *«da igual si son las 18 o las 11 o las 15: se cargó lunes, se recoge martes, se
    entrega miércoles»*): se recoge el día hábil siguiente (`saldoDiaRecoge`) y se entrega desde el otro. Si la recogida no
    es mañana (sábado, víspera de feriado), el cuadrito dice qué día: «logística lo recoge el lunes 05/10».
  - **🏭 Lo que hay que fabricar** arranca hoy si es día hábil y antes del corte (`HORA_CORTE`=17; el sábado
    `HORA_CORTE_SABADO`=12); si no, el siguiente día hábil (`diaArranque`). No son hábiles el domingo ni los `FERIADOS`
    (lista hasta fin de 2027; revisar cada año).
  - **Sale `DIAS_PRODUCCION`=2 días hábiles después** (dueño: *«debería salir en 48 horas y las otras 24 son para recoger y
    entregar»*, `saldoSaleDeFabrica`). Ese día se recoge y se entrega desde el siguiente: lunes 18:00 → viernes.
  - La misma regla vale para 📐 medida especial, ⏳ lo ya pedido a fábrica (desde `q.f`) y 🏭 lo que se fabrica para ESE
    pedido (desde `prodF`). Si no, la promesa se corría un día el día que logística pedía a fábrica.
  - ⚠️ **El cuadrito ya no usa el tiempo de fábrica medido ni `STOCK_DIAS_FABRICA`** (`saldoLeadModelo` y `saldoTiempos`
    se borraron). La pantalla de stock sí los usa, sin cambios: ahí los 3 días son las 48 h más el día en que se recoge,
    o sea hasta que se puede entregar. Por eso un pedido a fábrica puede decir «llegan el viernes» en Stock y «llega el
    jueves» en el cuadrito. Cambiar el 3 movería las cantidades a pedir, y eso el dueño no lo pidió.
  - El ✅ de lo que está a mano y el 🚚 de una recogida programada no cambian.
  - El cuadrito y la pregunta al guardar dicen la cuenta (`saldoArrancaTxt`): «🕔 Ya pasaron las 17:00: se manda a
    producir el martes 29/09, sale de fábrica el jueves 01/10 (48 h) y ese día se recoge.»
  - Prueba: `tests/test_corte_horario.js` (35; 24 rojas contra `7fe7551`, 18 contra `275b031`).
  - ⚠️ Una prueba nueva del cuadrito tiene que clavar el reloj antes de las 17:00: si no, da otros días según la hora a la
    que se corra.
  - **Quién se lleva el stock lo decide logística** (dueño, 28/09: *«es mucho kilombo»*). Se propuso y se **descartó** una
    regla única, «al que entrega primero sin dejar tarde a uno que ya vendió», con los estados HAY POR AHORA / SE FABRICA y
    un aviso en «Mis pedidos». No volver a proponerla sin que la pida (bitácora §4gq).

## 📈 Proyección del mes (§4gt, publicada 28/09 19:14, `6146f6d`): lo que hay que respetar
El dueño: *«que me muestre el total vendido en el período de cada vendedor, el total de cada marca y una proyección a fin
de mes… no me interesa el efectivo ingresado sino el vendido en el período»*. Lo usa en un **iPad Air** (820 px parado).
- **Solo con la contraseña de Administración**: la pestaña `data-val="proy"` de Contabilidad la muestra
  `mostrarBotonesTodos` con `UNLOCKED`; sin clave, `setContaTab`/`renderProyeccion` vuelven a Ventas. Todo repintado de
  Contabilidad pasa por `contaRepintar()`.
- **Lo VENDIDO, no lo cobrado**: `ventaTotal` por la fecha de `fechaSalida` (la entrega agendada), igual que Ventas →
  🚚 Entrega agendada; `test_proyeccion` §3 compara los dos números. Equipo = `fueraDeConta(p,'tienda')`, marca por
  vendedor (`marcaDe`, §4bl), mayoristas aparte (no se suman al equipo). Sin ATC, RPT ni ROHO.
- **El ritmo** (§4gt), por vendedor: hasta hoy + máx(agendado de mañana a fin de mes, ritmo × días hábiles que quedan);
  ritmo = hasta hoy ÷ días hábiles que pasaron (lunes a sábado sin `FERIADOS`). ⚠️ «Hasta hoy» es por la fecha AGENDADA:
  no mira `p.entregado` (los choferes no marcan, §4gp).
- Lo vendido va con centavos (como Ventas); la proyección y el ritmo, en Bs enteros (`fmtBs0`).
- ⚠️ Las fichas de esta pestaña piden 300 px (`data-min` en `#pry-metrics`, que `acomodarFichas` respeta): con 230 los
  totales de seis cifras salían cortados en el iPad. La lista por vendedor es lista y no tabla: en 390 px una tabla
  escondía la proyección.
- **🔁 La curva de cada marca (§4gu, publicada 29/09 00:24, `a904137`)**. El dueño: *«¿qué fórmula o algoritmo… algo realmente preciso?… en
  agosto los últimos dos, tres días se facturó 80.000 o 150.000… Heaven; Sueña es distinto… probar con agosto»*.
  - `pryCurva`/`pryCurvaF`/`pryAlDia`: faltando r días hábiles para el cierre, qué parte `f` de lo que vendieron los
    meses cerrados (desde `PRY_PRIMER_MES`='2026-08') ya estaba vendida (`contaFecha`). Alineados por días hábiles.
  - `pryMezcla`: (1) K ÷ f y (2) K + (1 − f) × promedio de los meses cerrados; la (1) pesa **f²**. ⚠️ No volver a la
    división sola (a principio de mes se dispara) ni a pesar con f (en f = 0 contaba K dos veces).
  - Se calcula por MARCA y cada vendedor lleva la proporción de su marca. Sin marca y mayoristas: ritmo. Menos de
    `PRY_MIN_VENTAS`=20 ventas de la marca en los meses cerrados: ritmo.
  - 🧪 `pryPrueba`: cada mes a los días 5/10/15/20/25, faltando 3 y la víspera del cierre, con lo vendido ESE día; la curva
    de un mes sale de los OTROS meses cerrados. 🏁 `pryErrores`: con dos meses cerrados, cada marca va con la forma que
    menos se equivocó; el ritmo, aunque gane, desde el `PRY_DIAS_RITMO`=5° día hábil.
  - 📅 `pryPatron`: lo entregado cada día, los últimos 3 días hábiles (y cuánto ya estaba vendido antes), cómo se fue
    llenando y qué días de la semana se vende más.
  - ⚠️ Los feriados de 2026 ya pasados (06/08, 07/08 —confirmado por el dueño— y 25/09) van en **`FERIADOS_PASADOS`**,
    que usa SOLO la proyección (`pryDiaHabil`: `pryHabiles`, `pryAlDia`, `pryPatron`; §4gy). No van en `FERIADOS` a
    propósito: las entregas no miran atrás y las pruebas del cuadrito entregan esos días.
  - **Decidido por el dueño (29/09)**: solo con los datos del panel. Sus montos de meses anteriores (Excel por vendedor)
    NO se cargan, y nunca van al repo. Las metas son **por marca y cambian cada mes** (todavía no hay dónde cargarlas).
    Julio y septiembre tuvieron campaña: la prueba del 1/10 compara un mes sin campaña con uno con campaña.
- **📊 A esta altura y 📦 unidades (§4gv, publicada 29/09 01:10, `040e1df`)**. El dueño: *«la opción 2 [cada semana, cómo vas contra los meses
  anteriores a la misma altura]… y también unidades: puede que entre menos plata pero subió el número de unidades»*.
  - **Unidad = colchón (también colchoneta y colchón de cuna) o somier**, con su cantidad (dueño: *«quitá las almohadas,
    solo nos interesa colchones y somier y colchonetas o colchones de bebé, no mantas, sábanas, almohadas, patas, etc.»*).
    Un combo = un colchón y un somier (confirmado por el dueño; igual *«los vendedores no cargan combos, cargan producto
    por producto»*: cada renglón cuenta por su lado). `pryUnidadesDe` → `{u, c, s}`; `pryTipoProd` → `colchon|somier|combo|''`. El código
    del catálogo manda sobre el nombre escrito.
  - ⚠️ El colchón se reconoce por DESCARTE (como el stock, §4cx): lo que no cuenta es `esProdDeTienda` + `PRY_NO_UNIDAD`
    (accesorios, muebles, servicios). Un accesorio nuevo que aparezca contado como colchón va a esa lista.
  - En lo escrito a mano manda la PRIMERA palabra que dice qué es («PROTECTOR DE COLCHON» no cuenta), y un renglón con
    varias cosas va por pedazos (`PRY_PEDAZOS`): el primero es colchón si no dice otra cosa, los demás solo si dicen
    COLCHON/SOMIER («COLCHON TITANIO + 2 ALMOHADAS» = 1 colchón).
  - `pryAltura`/`pryAcum`: lo vendido para el mes cargado hasta el MISMO DÍA del mes y a la MISMA HORA (§4gy), contra
    otro mes («Comparar con», por defecto el anterior, `PRY_CMP`); por marca y equipo; semana por semana por el día en
    que se cargó; un mes cerrado se compara entero.
  - La meta por marca NO está hecha: el dueño eligió esto antes (la meta es por marca y cambia cada mes).
  - La tabla de cada marca tiene siete columnas y tiene que entrar en el iPad parado (820 px): relleno de 7 px en
    `#pry-altura` (`test_proyeccion` §17 lo mide).
- `tests/test_proyeccion.js` (118: §1-6 de §4gt, §7-14 de la curva con historiales inventados a mano `FIX2`/`FIX3`,
  §15-17 de §4gv).
- **🛏️💚 Fichas de cada marca en Contabilidad → Ventas (§4gw, publicada 29/09 01:10, `040e1df`)**. El dueño: *«falta la ficha de Sueña y de
  Heaven, sus montos, que se ajuste si se elige ingreso o entrega agendada»*.
  - `renderContaMarcas` (caja `#cta-marcas`, debajo de `#cta-metrics`): lo vendido de cada marca sobre la MISMA lista que
    «Vendido en el período» (`contaLista`: corte, período, vendedor y búsqueda). Marcas + «Sin marca» = lo de arriba.
    Ventas · unidades (§4gv) · % de lo vendido. Con una vendedora, solo su marca. En Mayoristas, nada.
  - `acomodarFichas`: `data-como="<id>"` copia las columnas de otra caja (las fichas de marca, alineadas con las de
    arriba), y `fichasMontoEntero` achica la letra SOLO del monto que no entra (antes «Bs 1.101.68…»), en todas las cajas.
  - `tests/test_ventas_marcas.js` (22).

## 📦 Servidor `2026-10-02-a` — el libro de reservas de stock: el que guarda segundo se entera (§4hj) — IMPLEMENTADO 02/10 ~17:21 (el dueño, probar ✅ 17:19, stock 22.166/50.000 = 44 %) y PÁGINA PUBLICADA 02/10 17:26 (`5caebd6`)
El dueño (02/10): *«Dos vendedores que guardan la última unidad en los mismos segundos la venden dos veces: la revisión del
saldo tendría que estar también en el servidor. hazlo»*. Lo que hay que respetar:
- **El servidor NUNCA frena una venta, no reparte stock y no sabe de catálogos ni de Excel**: la cuenta del saldo vive en UN
  lugar, `stockData` (§4gj, §4gq). El `.gs` solo lleva un **libro de reservas**: propiedad `RESERVAS` = `{por:{<id>:[{k,u,t}]}}`,
  escrita ADENTRO del candado de `doPost`, poda a `RESERVAS_VIGENCIA_MS` (6 h) y tope `RESERVAS_TOPE_LETRAS` (8.000).
- **`doSave(p, forzar, juntar, reserva)`** la mira al FINAL, con la fila ya escrita y releída (`reservaProcesar_`; si falla, el
  guardado vale igual). `reserva` = `{visto, lineas:[{k,u,libres,conocidos}]}`: `visto` = `ahora` de la lectura con la que la
  página calculó el saldo; `conocidos` = ids que esa cuenta ya miró. `otros` (`reservaOtros_`) = lo que apartaron otros pedidos
  de esa clave fuera de `conocidos` después de `visto − RESERVAS_MARGEN_MS` (30 min: solo acota). Si `otros>0 && libres−otros<u`
  → la respuesta trae **`saldo:[{k,u,libres,otros,faltan}]`**. Sin `visto` o sin `libres` anota y calla. Sin `reserva` (cola,
  chofer, Contabilidad, Kommo, filas `__`) nada cambia. **Volver a guardar reemplaza con cuidado** (`reservaAnotar_`: misma
  cantidad conserva la hora; más, entrada nueva por la diferencia); **`doDelete` → `reservaBorrar_`**. `probarAntesDeImplementar`
  §9 informa cuántas hay. `SCRIPT_VERSION`/`ESTA_VERSION`/`SCRIPT_VERSION_ESPERADA` = `2026-10-02-a`.
- **Página**: `saldoReservaArmar()` en `submitPedido` **ANTES del `upsert(rec)` optimista** (si no, `libres` descuenta al propio
  pedido y `conocidos` trae su id); una línea por grupo `f.g` que pase `saldoDelAlmacen`; `SALDO_VISTO` lo deja `mergePending`
  (0 con un servidor viejo → sin `visto`); viaja por `opts.reserva` de `apiSaveAhora`; **la cola no lo manda**. Con `res.saldo`,
  después de lo de siempre, `saldoAvisoServidor` (ventana ámbar «Mientras guardabas, otro vendedor vendió N de …: faltan M. Tu
  pedido quedó guardado igual»; «Entendido» devuelve la ventana tapada, `SALDO_MODAL_PREVIO`; «✏️ Abrir el pedido» relee con
  `conTope` 4 s y `editPedido`).
- **No cubre**: lo que sale de la cola (sin reserva); claves distintas entre páginas (un Excel recién subido en una sola). Con el
  servidor 30-a la página manda `reserva` igual y no pasa nada: se puede publicar la página antes de implementar.
- Pruebas: `test_servidor.js` §21 (24; 16 rojas contra `4a950cc`), `tests/test_saldo_servidor.js` (24; dos celulares contra el `.gs`
  real; 10 rojas contra `4a950cc`). El `.gs`: **2.430 líneas**, termina en `}` con `return borrador;` antes. Volver atrás = ✏️ a la
  **versión 35** (= 30-a) Y pegar la 30-a (`4a950cc354f88451555e2332fde09a4ae8f45f42`, 2.277 líneas). Procedimiento: §4fz-b «Publicar».
  ⚠️ Al dueño el enlace raw va PELADO en una línea (entre comillas de código no le sale tocable en su app: 02/10).

## 📦 Servidor `2026-09-30-a` y la lectura con hora, comprimida y de lo cambiado (§4he) — PUBLICADO 30/09: servidor ~12:40 (lo implementó el dueño), página 12:46 (`3606980`)
El dueño (30/09): *«1 no / 2 ok lo hago. / 3 hazlo»* — no se amplía el aviso «día sin camión»; el servidor nuevo lo implementa
él; la conexión (cartel, comprimida, de lo cambiado) la hice yo. Detalle en bitácora §4he y RESPUESTA §24. Lo que hay que respetar:
- **La lectura** (`apiList`): pide `z:1` (si hay `DecompressionStream`) y `desde` (si hay copia `LISTA_BASE` de menos de 15 min).
  A quien la pide le llega SIEMPRE la planilla entera (rearmada: `listaDeBase`), con `_ahora` = hora de Google de la copia.
  La copia guarda TEXTO por fila, no objetos (quien recibe la lista la toca). La cuenta de control (`n` + `huella`) que no da →
  lectura entera en el acto. ⚠️ `huellaFila` (página), `huellaFila_` (.gs) y `huella_fila` (diagnóstico en Python) son LA MISMA
  cuenta: `test_servidor` §16 compara las dos primeras. Si se toca una, van las tres.
- **Con `_ahora` y `okAhora` (servidor nuevo) `localManda` compara, no adivina**; sin ellos, la ventana (`LECTURA_VIEJA_MS`) y la
  sospecha (`BORRADO_CONFIRMA_MS`) de siempre, que siguen para el servidor de antes. `test_lectura_vieja` corre las dos vueltas.
- **Todo lo que escriba la hoja tiene que dejar sello, o anotarse** (si no, la de lo cambiado no lo ve y una copia vieja lo
  pisa): los borradores de Kommo nacen con `rev`; la corrección del nombre del borrador (`repararNombreAplicar_`) NO toca el
  sello a propósito (no hacer chocar a quien lo completa) y se anota en `BORRADOS_RECIENTES.r` (`recientesAnotar_`), que
  `leerCambiado_` manda igual; **una corrección A MANO en «Pedidos» estrena sello con `onEdit`** (disparador simple: anda
  apenas se guarda el código). **Todo borrado pasa por `doDelete`** (anota en `BORRADOS_RECIENTES.b` y en la hoja
  «Borrados»); una fila borrada a mano hace fallar la cuenta y se lee entera. Un camino NUEVO que escriba la hoja entra acá.
- **Retiros con sello**: el `.gs` compara el `rev` de `__ret_…`. El panel manda el sello con que se abrió ✏️ (`RET_FORM.rev`) o
  uno guardado desde acá (`SAVE_REV`), **nunca el de la lista de ahora** (pisaría la corrección de otro). El `conflicto` de un
  retiro va a `RETIROS`, no a `STATE`; si la fila del `conflicto` es EXACTAMENTE el alta propia que espera en la cola (su
  respuesta se perdió), `apiSaveAhora` saca el alta de la cola y reenvía la corrección con ese sello (una vez, `_altaPropia`).
- **Feriados**: `FERIADOS_GS` (.gs) = `FERIADOS` (página), fecha y nombre (`test_servidor` §15a). Un feriado nuevo va en los dos.
  `feriado` es un «no» firme (`RECHAZOS_FIRMES`); con `forzar` Administración lo mueve igual.
- `zOk_()` / la marca `zc` («ñ🔒€»): si Google no escribe en UTF-8, no se comprime; si la marca no llega bien, el panel descarta
  la comprimida y lee sin comprimir. Nunca se muestra una lectura con letras cambiadas.
- Pruebas: `test_lectura_delta.js` (29), `test_retiro_feriado.js` (16), `test_servidor.js` §15-§20. Su `Utilities` es de verdad
  (gzip de Node, bytes con signo): los otros arneses siguen con el de mentira y ahí el `.gs` contesta sin comprimir.
- **Publicado el 30/09** (bitácora §4he «Publicación»): el dueño pegó el `.gs`, probar dio ✅ y lo implementó ANTES de que se
  publicara la página (probado que anda: `test_lectura_delta` §10); la página salió a las 12:46. El diagnóstico de las 12:46:
  versión 2026-09-30-a, la comprimida viaja **260 KB en vez de 911 KB (~3,5 veces menos, no 7 como estimé)** y la de lo
  cambiado **1 KB**, las dos cuentas «da ✅». Volver atrás = ✏️ a la **versión 34** Y pegar la 28-a (enlace fijo a
  `4ded824…`, 1980 líneas). Los comentarios «~7 veces menos» de `pedidos.html` y del `.gs` ya dicen «~3,5» desde el `.gs`
  2026-10-02-a (§4hj).
  · El arqueo: probar mide SOLO la celda «Observaciones», que es donde vive (`filaArqueo` → `filaSistema`): 0 letras = vacío.
  El diagnóstico mide la fila ENTERA en JSON (496 = los nombres de los campos + el título «🧮 ARQUEO DEL CUADRE…» en
  `cliente`; una fila de sistema vacía da ~460 más el título). Dicen lo mismo: no es una pérdida.

## 🔧 Los 24 arreglos de la revisión en TRES niveles (§4hc → §4hd) — PUBLICADA 30/09 10:52 (`4ded824`)
Hallazgos en `RESPUESTA_CLAUDE.md` §22, arreglos en §23 y bitácora §4hd. El dueño: *«hazlo todo»*. Lo que hay que respetar:
- **Plata: dos funciones, dos usos.** `cobradoFueraDeAcuenta(p)` = solo cobros registrados, para el freno «poné el saldo»
  (lo que «A cuenta» tiene de más sobre el anticipo escrito es el 2° método, se reconozca como mixto o no).
  **`cobradoNoMostrado(p, acuForm)`** = para PROPONER montos («Usar como total», «SÍ, pagado»), con `contaCobrado` (una venta
  «SÍ, pagado» tiene el pago en el anticipo con «A cuenta» 0, §4cb). ⚠️ No mezclarlas: con la segunda el freno se apaga (X-2).
  Un adelanto en dos pagos que ya no se reconocen como mixto no se corrige desde el formulario (va a Contabilidad), y
  `ctaGuardarPago` decide «¿sigue siendo el 2° método?» mirando el PROPIO renglón.
- **Renglones del formulario**: uno con código o precio y SIN producto FRENA el guardado. Excepción: `data-de-pedido` (lo
  pone `editPedido`, se va al cambiar el código): vaciarle el nombre a un producto que ya traía el pedido lo SACA. `data-alm-pend`
  = el código se escribió sin saldo o sin ningún Excel (`stockHayAlgunExcel`); `prodCodigosDelAlmacen` completa SOLO esos, una
  vez, y la medida solo si está vacía. ⚠️ Nunca volver a completar en cada lectura todo renglón sin nombre (R4-2).
- **Código del almacén** = mismas protecciones que la lista de precios (`saldoCatDeCodigo`): «código de otra medida/producto»
  en el cuadrito, la pregunta al guardar y `stockAsignar` (no tilda ni reserva, `tot.codOtro`). Un código agotado se completa
  desde el histórico (`productoDeAlmacen` → `hist:true`, saldo 0).
- **El producto fuera de la lista que se agota sigue siendo él**: `stockCodRecordar` (en `confirmarImportExist`) conserva
  los códigos viejos mientras `stockCodRefs` los encuentre (pedido sin entregar o entregado ≤31 días, `STOCK.p`/`e`/`rs`), y
  `stockInfo` no adivina por nombre un código que el sistema conoce (`stockCodigoDelSistema`, está en `VENTAS_HIST`). ⚠️ Eso
  cambió el histórico de «Qué producir» (37/430 filas: las «Med.Esp. 160X200» ya no suman al 160x190): es a propósito (X-4).
- **Multicenter**: `ek30=stockEntregaClave(p, fs)` (30 días por fecha de ENTREGA, como los 15).
- **Días sin camión**: `resetForm` propone `proximoDiaEntrega()`; `sinCamionHtml()` arriba de Revisar y de la carga;
  «🚚 Próximo camión» en Cerrar día; «cambiale el DÍA» al cambiar solo el turno en un feriado; `saldoAvisos` contra el
  último día hábil; `atcRecogerFabDesde` con `diaHabil`.
- **Retiros**: `RETIROS`/`BORRADORES` se reemplazan SOLO con la lista del servidor (`leerCierresDeLista(…, true)`);
  `persistRetiro` saca de la cola las versiones viejas de ese retiro al guardar bien; un retiro borrado desde otro equipo no
  se vuelve a crear desde ✏️.
- **Proyección**: la curva va sin hora en domingo o feriado y, con hora, cada mes cerrado corta en su último día HÁBIL;
  `pryPatron` sin feriados; unidades: «P/» = «PARA», `PRY_CORTE`, y la palabra sola después de «FORRO/PROTECTOR DE COLCHON».
- **Pendiente (revisión de §23 con otra herramienta)**: `pedidosEnDiaSinCamion` mira de hoy−7 a hoy+90 y `sinCamionHtml` pone
  botón solo a los primeros 15; proponen todos los pendientes atrasados y «Ver todos». Y los tres del servidor de siempre.
- **Pruebas**: `tests/test_rev30_{plata,stock,dias,retiros,proyeccion}.js`. ⚠️ Un bucle que busque «el primer día de entrega»
  saltea domingo Y feriado (`typeof feriadoDe==='function' && feriadoDe(f)`), y para «el mes pasado» se fija el día ANTES de
  `setMonth(-1)` (el 31/10, «31/09» es el 01/10).

## 🔎 La revisión con cuatro agentes del 29/09 (§4gx) y sus arreglos (§4gy, PUBLICADA 29/09 10:02, `72aa862`)
Informe completo en `RESPUESTA_CLAUDE.md` §20 (hallazgos) y §21 (arreglos). Respuestas del dueño (29/09): *«No sale en
feriados, arreglá el 2, 3 y 4»*; el 6 y el 7/08 fueron feriado; logística NO sube el Excel de Moreno después de cargar
(M2 no pasa). Multicenter: *«a veces hasta 4 pedidos en el mismo día para su bodega»* → cuentan como UNA entrega (ver
«🏬 Eduardo a Multicenter»).
- **🚫 El camión no sale en feriados (A1)**: `feriadoDe(f)` lee `FERIADOS`.
  - `limTurno` da 0 (como el domingo), y `proximoDiaEntrega()` y `saldoDiaConCupo` los saltean.
  - El formulario no guarda un pedido NUEVO para un feriado, ni deja que una vendedora MUEVA uno a un feriado (aviso).
  - Uno que ya estaba en un feriado se corrige igual, y Administración lo mueve con `forzar`.
  - Lo dicen los carteles de cupos (formulario, Administración, semana de ocupación, 📅 Reprogramar, devolución de ATC),
    el cambio de turno y los avisos del importador de ROHO.
  - ⚠️ El portero del `.gs` NO conoce los feriados: una página vieja (sin F5) todavía puede guardar uno. Queda para la
    próxima versión del servidor.
- **Pago mixto (A2)**: `mixtoMismoMetodo(c, a)`: el 2° método nunca es el mismo método (y banco, si es QR) que el
  anticipo; el formulario no lo deja. Con varios candidatos del mismo día y recibo, vale el que CIERRA el «A cuenta».
  ⚠️ Ambigüedad que queda: en una «SÍ, pagado» (A cuenta 0), un pago de OTRO método del mismo día y recibo se lee como
  mixto. No se distingue de uno de verdad, y los montos igual cierran.
- **«A esta altura» y la curva, a la misma hora (A3)**:
  - `pryVentas` guarda `m` (minutos del día en Bolivia, `pryMinBo(ts)`), y `pryCargadaAl(x, d, min)` dice si la venta ya
    estaba cargada.
  - `pryAcum(V, ym, dia, min)` y `pryCurvaF(c, r, min)` cortan el otro mes al mismo día y a la misma hora de ahora.
  - La prueba (🧪) sigue con días enteros. Un mes más corto entra entero, y el texto lo dice.
- **Retiros con sello (A4)**: corregir un retiro manda `rev` (el de la lista o `SAVE_REV`). Con la 28-a, uno borrado
  desde otro equipo contesta `borrado` y no vuelve, tampoco desde la cola. ⚠️ Si dos equipos corrigen el MISMO retiro a la
  vez, gana el último: el `.gs` no compara el sello de las filas `__ret_`. Queda para la próxima versión del servidor.
- **Unidades (BAJA, regresión mía de §4gv)**: `PRY_SIN` saca «S/SOMIER», «SIN SOMIER» y «S/ COLCHON» antes de partir
  el renglón. `PRY_ES_SOMIER` acepta SOMMIER y BOX SPRING, y `PRY_NO_UNIDAD` suma servicios, muebles y errores de tipeo.
- Pruebas (rojas contra `040e1df`):
  - `tests/test_rev29_dias.js`: 26, 21 rojas;
  - `tests/test_rev29_pedidos.js`: 25, 15 rojas;
  - `test_proyeccion.js`: 126, 8 rojas.
- **Pendientes** (§20.3): M1, M3-M8 y las otras BAJA.

## 🔎 La revisión de Codex del 28/09 (§4gl): lo que hay que respetar
**PUBLICADA el 28/09 a las 15:02 de Bolivia** (`main` = `7fe7551`, junto con §4gm, §4gn y §4go; el dueño: «aprobado
todo»), con el servidor 2026-09-26-a. **El `.gs` 28-a se implementó ese mismo día ~15:24** (§4gp). El stock en el
servidor, «más adelante».
Codex revisó el informe §15 (`2040720`) y trajo `tests/test_codex28.cjs` (sus 8 comprobaciones, intactas; solo se le
agregó la línea de resumen y el JSON va a la carpeta temporal). Los cuatro hallazgos se arreglaron:
- **¿Manda la copia de acá o la de la lectura? Lo dice UNA función, `localManda(id, loc, srv, n0, enCola)`** (pedidos y
  retiros en `mergePending`): en vuelo, esperando turno o en la cola → acá; confirmado → si la lectura trae la fila, el
  sello MAYOR; si no la trae, acá solo si la lectura se pidió ANTES de la confirmación (atrasada). Pedida después, lo
  borraron desde otro lado: `borradoFuera` lo saca y avisa una vez (`BORRADO_FUERA`).
  ⚠️ «Antes/después» es un **contador** (`RED_N`: `apiList` → `_pedidaN`, `aplicarSello` → `SAVE_ULTIMO[id].okN`),
  **nunca la hora**: con el reloj quieto de las pruebas daban igual y se confundían. Una lista sin marca (una prueba que
  llama a `mergePending` directo) cuenta como pedida después de todo.
  ⏱️ **Y NADA SE DA POR BORRADO EN LOS PRIMEROS `LECTURA_VIEJA_MS` = 45 s** después de la confirmación (§4gn): si Google
  convierte la lectura en GET (§4fx), `doGet` contesta su caché de 20 s (§4du), que puede ser de ANTES del guardado, y
  con los servidores 26-a y 28-a esa copia tiene la misma forma que una lectura buena. Se mide con `relojMs()` (solo
  avanza): `apiList` → `_pedidaT`, `aplicarSello` → `okT`, `localManda(…, tPed)`. Sin esa ventana, un pedido recién
  cargado salía de la pantalla con «lo borraron» y su corrección no se guardaba (invitaba a un duplicado).
  `LECTURA_VIEJA_MS` tiene que ser ≥ `GET_CACHE_SEG` + 10 s (`test_lectura_vieja` §6 lo mide). En una prueba donde otro
  equipo borra en el mismo segundo, correr para atrás el `okT` (`pasaElTiempo` en `test_codex28_flujos`).
  🔁 **Y pasada la ventana, UNA lectura tampoco alcanza** (revisión de Codex de §18, §4go): un `doGet` lento deja su
  copia vieja más tarde. La primera ausencia es una SOSPECHA (`u.faltaT` = cuándo llegó; el pedido se queda, sin aviso) y
  `borradoConfirmarLuego` relee sola a los `BORRADO_CONFIRMA_MS` = 25 s (≥ `GET_CACHE_SEG` + 5 s). Recién una lectura
  pedida después la confirma (`borradoFuera`), y una que lo trae borra la sospecha. **No es garantía** (dos `doGet`
  lentos seguidos): la garantía es que el servidor diga de cuándo es su lectura, y la 28-a no lo dice.
  Los avisos de borrado **no invitan a cargarlo de nuevo** («confirmá con administración que de verdad lo borraron»):
  no volver a «hacelo como pedido nuevo».
- **`submitPedido` no guarda un pedido que la lectura de justo antes ya no trae** (lo borraron mientras estaba abierto):
  `guardarYa` lo recreaba.
- **Servidor `.gs` 2026-09-28-a — IMPLEMENTADO el 28/09 ~15:24** (§4gp: probar ✅ a las 15:21, 1063 filas, stock
  22.642/50.000 = 45 %; 🔒 Cerrar día dice «versión 2026-09-28-a» sin línea gris): un guardado CON sello de una fila que
  no existe → `borrado`, sin tocar la hoja. Excepto las filas fijas del sistema (`filaFijaSistema_`: `__…` salvo
  `__ret_…`). El panel lo trata como «no» firme (`RECHAZOS_FIRMES`): fuera de la pantalla y de la cola, a los rechazos
  con lo que se perdió, y aviso. Una página vieja (`2040720`, sin F5) deja el `borrado` en su cola y lo reintenta sin
  tocar la hoja; con F5, la nueva lo saca. **Volver atrás = ✏️ a la versión 33** («26 sept 2026, 11:30» = la 26-a)
  **Y** pegar la 26-a del enlace fijo a `ea81bb0…` (1965 líneas).
- **Saldo**: lo que va en una recogida programada llega el día de ESA recogida (`saldoEntradas`: Moreno sin programar en
  `STOCK_DIAS_RECOGIDA`, cada recogida con su `llega`, repartiendo `enRecogida` sin pasarse) → «🚚 VIENE DE MORENO ·
  logística lo trae el…». Sin cupo en `SALDO_DIAS_CUPO` días no se promete ningún día (`saldoDiaConCupo` → `sinCupo`,
  `saldoPonerDia`): «⚠️ SIN CUPO…», en ámbar. Todo lo que calcule un día prometido pasa por `saldoPonerDia`.
- ⚠️ `doGet` contesta igual que la lectura por POST y sale de una caché de 20 s. La primera versión de §4gl, con una
  caché de antes de un guardado, sacaba de la pantalla lo recién guardado con «lo borraron» y NO guardaba su
  corrección. **Resuelto en la página (§4gn) con la ventana de `LECTURA_VIEJA_MS`** (arriba). El arreglo de fondo sigue
  siendo que el servidor diga en la respuesta de dónde y de cuándo es su lectura (otra versión del `.gs`).
- **Los textos de `borrado` quedan como están** (dueño, 28/09, §4gp: *«los choferes hasta hoy no marcan nada…
  dejemos mientras como está todo»*). El cartel del chofer dice «otra persona cambió» y pide rehacer ✅ y la foto de
  un pedido que ya no está. El formulario queda abierto sobre un id que ya no existe. **Los choferes todavía no marcan
  ✅ ni cobros en el panel**: no volver a proponerlo hasta que lo hagan. La 28-a no protege filas nunca selladas
  (`rev` 0).
- Pruebas: `test_codex28.cjs` (8), `test_codex28_flujos.js` (23; 13 rojas con página 2040720 + `.gs` 26-a; con la página
  nueva y el `.gs` 26-a, 7 rojas = lo que necesita el servidor), `test_rev8_saldo.js` §10-11.
- **Espera al dueño**: validar el stock en el servidor al guardar (Codex: no bloquear la venta; antes, las mismas reglas
  que `stockData` en el `.gs`).

## 🏬 Eduardo a Multicenter en la proyección de stock (§4gm, 28/09): lo que hay que respetar
**PUBLICADA el 28/09 a las 15:02** (`7fe7551`), junto con §4gl, §4gn y §4go.
- **🏬 Varios pedidos de Multicenter el MISMO día son UNA entrega** (dueño, 29/09, §4gy, publicada 29/09 10:02, `72aa862`): *«hace pedidos por unidades, a
  veces hasta 4 pedidos en el mismo día para su bodega»*. `stockEntregaClave(p, f)` usa la fecha como clave de la
  entrega para Eduardo → Multicenter (`nVentasRotacion`, `nVentas`, `n30`); lo demás sigue por pedido. Las unidades se
  suman igual, y los umbrales no cambian. `test_eduardo_multicenter` §8.
  ⚠️ **«El mismo día» es la FECHA DE ENTREGA que pone el dueño** (dueño, 29/09 a la noche: *«cuando se entrega es la fecha
  que yo coloco de entrega, a veces cargo el pedido el mismo día para entregar ese mismo día»*; solo él y ROHO pueden
  agendar para hoy, `esVendedorLite`). Las dos ventanas (15 y 30 días) juntan por `fs` (fecha de salida) desde §4hd (R4-3,
  publicada 30/09). La ventana de 30 días se sigue MIDIENDO por fecha de venta (§4dv); lo que cambió es solo cómo se
  juntan los pedidos de Multicenter.
- **La regla vive en UN lugar, `stockPedidoUnico`, y en este orden**:
  1. RPT → nunca es venta;
  2. **`stockEduardoMulticenter(p)` → es demanda**;
  3. `stockPuntual` (Multicenter de OTRO vendedor, consignación, ROHO a «TIENDA n») → afuera;
  4. las otras ventas de Eduardo → afuera.

  No sacar ninguna de las dos exclusiones: la excepción es SOLO la combinación.
- **Identidades, definidas una vez y usadas por la exclusión y por la excepción**:
  - `stockEsMulticenter`: la palabra entera «MULTICENTER» en `normNombre(cliente)`. No hay id de cliente. Nunca «multi»
    a secas: traería a MULTIESPUMAS. «MULTI CENTER» y «MULTICENTRO» quedan afuera a propósito (no están verificadas).
  - `stockEsConsignacion`: manda sobre Multicenter.
  - `stockEsEduardo`: la palabra «eduardo» en el vendedor.
- **Entra en todo lo que proyecta**, porque todo pasa por `stockPedidoUnico`: el ritmo de 15 días (→ rotación, reserva,
  pedir y la columna **7 días** de «Qué producir»), los 30 días, `ventasPanelIndex` (60 d / 90 d / tendencia) y lo que se
  copia para la fábrica. `vendidosEduMc`/`v30EduMc` son solo para los textos. **Los umbrales no cambiaron.**
  ⚠️ El cuadrito del saldo del formulario NO cambia: usa lo pendiente de todos (`comp`), nunca el ritmo (§4gn).
- **La consignación, dos medidas a propósito** (§4gn): la excepción descarta lo que PAREZCA consignación
  (`stockPareceConsignacion`, `/\bCONSIG/`: «CONSIGNADO», «CONSIG.»), y los puntuales de los otros vendedores siguen con
  «CONSIGNACI…» (`stockEsConsignacion`), sin cambios. `stockPuntual` usa las mismas funciones de identidad:
  `STOCK_PUNTUAL` ya no existe.
- **Quién fue el pedido único, en palabras**: `stockUnicoQuien(o)`. No volver a escribir «Lo vendió Eduardo:» a secas.
- **Confirmado por el dueño (28/09)**: en los pedidos de Eduardo a Multicenter, «MULTICENTER» va en el **cliente** (no en
  «Facturar a»). La regla mira el cliente, como la exclusión de siempre. Codex revisó §4gm y dio conforme (§4go).
- **No hay caché que migrar**: el índice se arma de cero y `SALDO_CACHE` se renueva con cada lectura.
- ⚠️ **El histórico del sistema (`VENTAS_HIST`) no dice vendedor ni cliente** y trae todas las ventas: no se separa
  nada ahí. El cartel de «Qué producir» lo dice.
- **Decidido por el dueño (28/09)**: las compras grandes y sueltas de Multicenter **no se cargan al panel** («para no
  entorpecer los pedidos regulares»), así que **NO se agregó ningún tope** al plan del mes (60 d / 90 d no tienen umbral
  de entregas para nadie: una compra única de 40 en agosto subía octubre de 9 a 24). Se le avisó que así el panel no
  aparta ni descuenta esas unidades hasta el Excel siguiente, y que «Qué producir» no las pide.
  - **Los pedidos grandes van directo a logística, NO entran al panel** (dueño, 28/09: *«no nos compliquemos»*). Se
    fabrican aparte para no dejar sin stock a los vendedores; solo salen del almacén si hay la mitad y queda saldo,
    y eso lo decide logística. La marca «PEDIDO ÚNICO» que se propuso quedó **descartada**: no volver a proponerla.
  - Dicho y no es un error: los umbrales miran el PRODUCTO, no la compra. 8 de Multicenter + 10 del equipo pasaron el
    TITANIO de `media` a `alta`.
- Pruebas:
  - `tests/test_eduardo_multicenter.js`: 35 comprobaciones, 21 rojas contra `2040720`, con los números exactos del
    ejemplo. Abre la página publicada desde git (`ANTES=<sha>`) con los mismos pedidos, así que «lo que no cambia» (y
    el cuadrito del formulario) se compara literal.
  - `test_adm_alta` §3 se cambió a conciencia.

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
