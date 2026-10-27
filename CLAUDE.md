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
  - 🛡️ **Una lectura de Kommo que falla NO publica** (§4mi, 25/10, auditoría CRM-01; PUBLICADO `cd0c73d`): `fetch_paginated` anota en `_FALLAS` y
    `main` sale con `sys.exit(1)` antes de armar nada → no se escribe el panel, el workflow no hace commit y el publicado queda con su
    último dato bueno. Lo que puede faltar sin mentir va con `esencial=False` (contactos, razones de pérdida, catálogo). ⚠️ Una lectura
    NUEVA es esencial salvo que se diga lo contrario. 👥 La vendedora del mes anterior sin nada este mes entra al FINAL del equipo con 0,
    `soloPrev` y meta 0 si no está en `VENDOR_CFG` (CRM-03). `tests/test_generar_integridad.py` (Kommo de mentira, carpeta temporal).

- **`panel_template.html`** — Template React (JSX precompilado a `React.createElement`; validar con `node --check` sobre los bloques `<script>` antes de commitear). Tema claro, header teal `#00B5AD`.

- **`.github/workflows/panel.yml`** — Workflow principal: crons 14:00 y 21:00 UTC (10:00/17:00 Bolivia), push a `generar.py`/`panel_template.html`, y botón manual con inputs opcionales `month`/`year` para regenerar meses cerrados. El bot `heaven-bot` commitea el HTML regenerado.
  - La IA horneada (`--bake-ai`) puede estar pausada para acelerar iteración — ver estado en el propio yml y en la bitácora.

## 🔐 Ninguna clave en el repo (es PÚBLICO)
El 25/10 (§4mh) la auditoría de Codex/Astra encontró la clave y el token de Trello escritos en `.claude/skills/atc-multiespumas.md` desde
mayo: se sacaron (`5bd2b5f`), pero siguen en el historial y en 16 ramas viejas; el dueño tiene que cambiarlos en Trello. Antes de commitear
un `.md`, una skill o un ejemplo de consola, que no lleve ninguna clave, token ni contraseña: van en los secretos de GitHub o en las
Propiedades del script.

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
  - 📚 **Los tres almacenes en UN Excel** (§4lp, 16/10, dueño: *«logística me está pidiendo usar esta planilla que ya trae los 3
    almacenes»*; PUBLICADO 16/10 11:10, `92d08ff`): el mismo reporte con un bloque por almacén (`105003 | PRODUCTOS TERMINADOS FAB.` … `TOTAL : | … | 523`) y
    arriba «Almacén Inicial / Final : IM». ⚠️ **Lo publicado hasta `6a55598` lo toma ENTERO como IM con los tres SUMADOS** (1.648 el 16/10).
    `existSecciones` parte los bloques (cierran con su «TOTAL :» del mismo almacén), `existLeer(filas, almForzado)` lee cada uno con el
    nombre del BLOQUE (manda sobre el encabezado) y `existLoteDe` arma la cola **`EXIST_COLA`**: la vista previa de cada almacén, uno
    detrás del otro y en el orden del archivo (PTF → Banzer → IM), con «N de M», «Usar … y seguir con X», «⏭ Saltar» (`existSaltar`) y
    «Cancelar todo» (`existCancelar`). Mismo control y misma regla del día que subir tres Excel. El TOTAL del bloque distinto de lo leído
    se avisa (`totalReporte`). Un archivo sin bloques sigue igual. `tests/test_existencias_tres.js` (17; 15 rojas contra `6a55598`).
  - 🛏️ **Las almohadas** (§4lq, 16/10): no había cruce entre la 50x70 (CD1403, «ALMOHADA») y la 50x90 (CD1459, «ALMOHADA FIBRA
    SILICONADA»); el «0 y 17» era la 50x70 en Banzer con más vendido sin entregar que stock. Los nombres quedan (dueño: *«1 no»*). La
    NASA que se vende es la **CH1195** (ALM/NASA); **CH1244, CH2533 y CH1246 entraron a `CODIGOS` con el nombre del Excel y SIN medida**
    (PUBLICADO 16/10 11:42, `27f0134`, Pages OK): así su clave es la misma que ya tenían en el stock y no se parten. `PRY_NO_UNIDAD` lleva `TRAVESSEIRO` y `NASA` (si no,
    la Proyección las contaba como colchones). `tests/test_almohadas_nasa.js` (20).
  - 🎨 El encabezado del «📋 Plan de stock» va CLARO con letra oscura (§4lp, 16/10, dueño: *«fondo negro, letra gris… no leo»*): el
    `thead th` general es negro, y una tabla que ponga su color de letra en `th` tiene que poner también su fondo. `tests/test_stock_contraste.js`.
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
    🛍️ **Las BOLSAS (empaque) tampoco** (§4iu, dueño 09/10: *«sacalas del stock»*): `PROD_EMPAQUE=/^BOLSAS?\b/`, solo al EMPEZAR el nombre.
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
  - **➕ Lo vendido sin entregar se SUMA al ritmo, no «el mayor»** (§4ii, 08/10, dueño: *«NO PUEDE PASAR ESTO… por eso venimos
    sin stock»*; PUBLICADA 08/10 17:56, `e533511`): `stockNecesario = comp + porDia × (fábrica + margen + reserva)`, `nec15` y el `consumo` de
    `stockProyectar` igual. Con `max` el ESPECIAL SEMIORTOPEDICO (9 vendidos, 0,9/día, 4 en Banzer, 2 en Moreno) pedía producir 3;
    ahora 11 (+ 2 de Moreno); desde §4iy (piso de 4 días de fábrica) 12 (+ 2). El mes que viene (`mesNec`) sigue con el mayor: lo probable ya incluye lo vendido. ⚠️ No volver al
    `max`. `tests/test_proyeccion_suma.js` (9).
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
  - **🔎 El buscador del stock vive en la barra de arriba** (§4hp, 05/10, PUBLICADO 06/10 12:37, `3443703`; dueño: *«no hay un buscado en stock»*): el
    `<input id="stk-q">` está en la barra fija de `#stock-overlay`, fuera de `#stock-body`, y `renderStockFiltros` NO lo dibuja
    (deja un chip «🔎 «q»»). Con algo escrito, `renderStock` esconde los cuadros grandes (`renderStockHoy`, `renderRevisionFija`,
    `renderProducir`, `renderTiendas`) y pone el cartel `#stk-buscando`; se borra la búsqueda y vuelven. ⚠️ No volver a dibujar
    el campo dentro de la tabla (quedaba 1.100-1.400 px abajo, nadie lo encontraba) ni a mover el cursor al final en el refoco
    de `renderStock`: la barra no se redibuja, el cursor se queda donde está. `stockFiltroLimpiar` vacía también el campo de
    arriba y `abrirStock` lo sincroniza con `STOCK_FILTRO.q`. `tests/test_stock_buscador.js` (22; 9 rojas contra `64bcb37`).
  - **📍 Banzer o PTF: qué tener en cada depósito según dónde se entrega** (§4ht, 07/10, PUBLICADA 07/10 15:10, `2c5ad8c`; la línea del dueño, 17:33, `faff9a0`; informe para Codex en `RESPUESTA_CLAUDE.md` §33; dueño: *«según
    los focos de calor de entrega y rotación… tener el stock a la mano según la zona de entrega»*). Botón en la barra de Stock →
    `abrirAlm` (`#alm-overlay`, z 3100). **Solo mira**: no marca pedidos ni toca stock ni planilla.
    · Dónde quedan: `ALM_UBIC` (coordenadas escritas). PTF exacto (Plus Code 7V24+CRP); **Banzer `aprox`** (su dirección escrita:
    Google no le da el pin de un LUGAR con nombre a un programa, ni al servidor). Si el dueño manda las coordenadas, se cambian ahí.
    · `almZonaData`: entregas de 60 días (`ALM_ZONA_DIAS`) con las reglas de la rotación de Stock (`stockCuenta`, sin venta de
    tienda, sin `stockPedidoUnico`, sin `esProdDeTienda`); **lado = de qué lado de la LÍNEA DE LOGÍSTICA cae** (08/10, §4hy, PUBLICADA 08/10 12:36, `2a7c7bd`; reemplaza la del dueño del 07/10: `ALM_DIVISION`, 41 puntos de norte a sur sacados de los píxeles negros
    de su captura; `almLadoDeLinea`: izquierda/oeste → Banzer, derecha/este → PTF; a < `ALM_LINEA_BANDA_KM`=0,5 km, mitad y mitad).
    ⚠️ La línea tiene un tramo casi horizontal (El Trompillo): el lado sale del POLÍGONO del oeste (`almLineaGeo`) y la distancia
    del tramo más cercano; no volver a elegir el tramo «de la misma latitud» (daba el lado al revés en el quiebre); sin línea, el más cerca (`ALM_EMPATE_KM`); sin pin, la zona escrita
    aprendida de los pedidos CON pin (`almZonas`, ≥3). Por unidades. Las zonas que defina logística van a mandar sobre la línea.
    · **Tener = `stockNecesario(o)`**, la MISMA cuenta de `stockCuantoPedir` (sacada a función: no la dupliques). La venta de
    tienda cuenta para el tener (es rotación) pero no para el lado. Se reparte con la proporción; lo que rota poco y lo
    discontinuado no (todo en PTF); < 3 unidades ubicadas = «pocos datos».
    · Acciones: «🚚 Pasar N a Banzer» solo con lo que a PTF le sobra de lo suyo; «🏭 lo próximo que llegue»; «✋ no mandar más».
    🚫 **Nunca traer de Banzer a fábrica** (dueño, 26/09). La revisión automática NO cambió (PTF → Banzer → IM, 21/09) y **no se
    cambia todavía** (dueño, 07/10: *«aún no porque debemos definir bien con logística las zonas que abarca cada almacén»*): cuando
    logística defina zona → depósito, esa lista puede reemplazar la línea recta y, si el dueño lo pide, alimentar la revisión.
    · Los enlaces cortos que el panel no lee los abre el servidor en segundo plano (`almGeoPedir`: tandas de 20, los más nuevos
    primero, una vez por apertura de la página); lo abierto va a `MAPA_COORDS` y al teléfono. El 07/10 el servidor abrió 12 de 12
    enlaces de clientes: solo fallan los de lugares con nombre.
    · Filtro «🏪 Tener en Banzer» y el texto para logística arranca con «TENER EN BANZER (lo demás, en PTF)». Mapa: manchas en
    píxeles (15 px), `zoomSnap:0.25`.
    · `tests/test_banzer_ptf.js` (56, reloj clavado en el 07/10, Leaflet de mentira que anota lo dibujado; §11 = la línea del
    dueño). Batería con la línea: 137 suites, 5.185, 0 rojas.
    · **🗓️ El plan desplegable de 7, 15 y 30 días** (§4hv, 07/10 noche; PUBLICADA 07/10 18:10, `3f44b05`; dueño: *«qué tener en Banzer y
    qué tener en PTF para los próximos 7-15-30 días… sin cálculos de qué pedir a producción… mover más que todo a Banzer pero sin
    descuidar las entregas de PTF»*): `<details id="alm-plan">` arriba del mapa; `almPlanDe` por producto y plazo, cada lado.
    Llevar: a Banzer solo lo que a PTF le SOBRA de lo suyo (PTF nunca baja de su «tener»). Nunca de Banzer a PTF (`cubreB`:
    «pueden salir de Banzer»). «📋 Copiar el plan de N días» (`almCopiarPlan`).
    · **✏️ Segunda vuelta (§4hw, 07/10 noche, PUBLICADA 07/10 18:46, `0d20d04`)**, con el caso real del dueño (ESPECIAL SEMIORTOPEDICO, 6
    vendidos y 0 en PTF, «Traer 2»): *«traer lo que ya está vendido… MÁS lo que debería tener para los próximos días, y lo mismo
    Banzer»*, *«¿qué pasa cuando el saldo es 0 en ambos?»*, *«no "pedir"… TRAER DE MORENO»* y *«si el Excel de Moreno muestra menos,
    una alerta de "recordá revisar la producción"»*. **Tener = ya vendido en su zona (`o.compIds`, `almLadoPedido`) + `porDia`×H
    con `sB`, SUMADOS** (no el mayor: ya no es `stockNecesario`). Lo que falta se TRAE entero de la fábrica del producto
    (`almPlanFuente`: Moreno; Sueña → Multiespumas), PTF primero, con cuánto ya está vendido (`uF`). ⚠️ `almPlanAlertaDe`: si
    hay que traer más de lo que dicen los Excel de donde se trae, y existe el Excel de ESA fábrica (`almPlanAlmsDe`), «⚠️ Recordá
    revisar la producción» en la fila, arriba (con «Ver cuáles»), en el filtro y en la copia. Nunca «pedir/producir/fabricar».
    `test_banzer_ptf` §12 (→ 101; 30 rojas contra `3f44b05`).
    · **🚫 Solo los Excel del día (§4hx, 08/10, PUBLICADA 08/10 21:05, `27c8d0d`; dueño: *«no usan ese botón… simplemente cargan los saldos de almacén
    cada día; si en Moreno aumenta el saldo, ese producto se fabricó»*)**: el plan resta SOLO las recogidas de Moreno ya
    programadas (`almPlanRecogidas`), nunca lo anotado como «pedí a fábrica» (Codex F1: daba por cubierta una entrega de mañana).
    `cubreB` es acción («↪️ Cargar en Banzer…», en «Qué hacer» y en la copia, F2); sin el Excel de PTF, «⚠️ Falta el Excel de PTF»
    y nunca «cada depósito tiene lo suyo» (F3). ⚠️ No volver a restar `stockEnCaminoSeguro` en el plan. `test_banzer_ptf` → 106.
    · **🚫 Sin «🏭 Pedí a fábrica»** (dueño, 08/10: *«ellos crean su Excel y correo, quítalos»*): fuera de la barra de Stock;
    «🚨 PEDIR YA» y «🏭 Pedir esta semana» son solo aviso. `abrirStockPedido` queda sin botón. No volver a ponerlo sin que lo pida.
    Qué se habló y por qué: `INFORME_08-10.md` (leerlo antes de proponer algo que dependa de lo que logística anota a mano).
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
  📍 **Waze y el Plus Code en `maps?q=`** (§4ln, 15/10): `coordsDeLink` lee `ll=…%2C…` (Waze) y el Plus Code con el «+» sin codificar
  («maps?q=8R6C+72P,+Santa+Cruz»). Las búsquedas de Google (`google.com/search?…kgmid=`) no traen ubicación: no se inventa. `test_ubicar` §5.
  **Servidor `2026-10-15-a`** (§4ln-b; IMPLEMENTADO 16/10 por el dueño, página PUBLICADA 16/10, `6a55598`; volver atrás: ✏️ a la versión
  anotada Y pegar la 14-c de `19ee2bc…`): lo mismo en `extractCoords` y, sin coordenadas, el texto de `q=`
  (`textoDeQ_`: nombre y dirección de un lugar con nombre o de una búsqueda de Google) → `geocodeTexto`, aproximado. Medido con el servidor
  ya implementado (16/10): de 21 enlaces que la página no lee, el servidor ubica **18** (antes 8); los 3 que quedan no traen nada que buscar. ⚠️ El `staticmap?center=` de la página de Maps es el centro de QUIEN PIDE (~7.700 km): no usarlo.
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
- 🚫 **Las pruebas NO pueden llegar a la planilla real** (§4lu, 21/10): el contenedor ahora tiene salida a Google y `page.route('https://**',
  abort)` NO corta el fetch de un file:// (las pruebas leían las 1.393 filas reales). `correr.sh` exporta `HTTPS_PROXY=http://127.0.0.1:9`
  (y `https_proxy`/`HTTP_PROXY`/`http_proxy`): el navegador no llega a ningún https y `route.fulfill` sigue andando. Una prueba SUELTA se corre
  con esas variables. Para cortar dentro de una prueba: `ctx.route(/^https:\/\//, r=>r.abort())` (ese sí corta).
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

## ✅ Cierre de entregas y 🧮 control del corte (§4hn, 05/10 — PUBLICADA 05/10 17:01 de Bolivia, `211705f`, con la revisión de Codex y la regla del dueño para los destildados; el `.gs` sigue `2026-10-02-a`; diseño en `RESPUESTA_CLAUDE.md` §30)
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
  pedidos pendientes, **destildada**; tildar crea la recepción `x:<huella de detección y pedido>` (`se:1`, `enConteo`: no mide plazos).
  `dif<0` = «salida o ajuste sin explicar» → se puede anotar como salida sin pedido (`STOCK.sm`; también «📤 Salió sin
  pedido» en la pantalla de stock). Líneas 🏭: su llegada se sugiere sellar (`prodR`), su entrega explica la baja.
  ⚠️ **Ids derivados del corte** (`existCorteId` = huella de almacén|fecha|hora|contenido, §4hs): dos equipos con el mismo archivo → la misma
  recepción (3 de 10 dos veces = 3/7). ⚠️ **Deshacer = lápida `an`, nunca borrar** (la junta por id revive lo borrado):
  `stockNormalizarRecepciones`, `fusRecs` y la poda la respetan. El mismo corte corregido anula lo que cerró la versión
  anterior y lo vuelve a sugerir (`mismoCorte`). `o.detectado` → **`stockEnCaminoSeguro(o)`** en `libre`, `stockCuantoPedir`,
  `stockMesesSobra`, `pedir`: lo «en camino» que una detección sin asignar ya podría ser no se cuenta como seguro. `o.reclamar`
  → «🚚 Ya pedido · ⚠️ reclamar». Un campo nuevo de `STOCK` (`sm`, `det`, `v`, `pv`, `h[].d/hu`) ya entra en `stockFusionar`,
  `leerStock` y `filaStock` (tope: `STOCK_CONTROL_DIAS`, §4hs). `tests/test_control_corte.js` (32); `test_existencias` §6, `test_rev_stock` y
  `test_adm_alta` §2 cambiaron a conciencia (esperaban el cierre por fecha).
- **📅 Segunda parte, por el dueño (06/10, §4hs, PÁGINA PUBLICADA 06/10 16:56, `45d3108`; servidor `2026-10-06-a` IMPLEMENTADO 06/10
  ~20:30 por el dueño, probar ✅ 20:22, diagnóstico 20:34 «🔒» — volver atrás: ✏️ a la versión anotada, la 36, Y pegar la 10-02-a de `6b76e7a…`)**: *«que no permita subir corte de días anteriores, tiene que ser del
  día… ¿de qué me sirve un stock de hace dos semanas? Si cada día te subo la lista actualizada»*.
  · **Solo el Excel del DÍA** (`existNoEsDeHoy`, día de Bolivia): «existencias al» y cuándo se sacó (pie o nombre) tienen que ser
  de hoy; sin fecha no entra; sin botón para usarlo. **Ya no hay «usarlo igual»**: un corte más viejo que el vigente no entra
  (`existBotonUsar`); el mismo día sin hora de un lado decide `stockSubidoAntesDe` (la hora de subida del vigente) o no entra.
  · **La hora sale del PIE primero** (`existPonerHora`): el mismo archivo con dos nombres da el mismo corte.
  · **`fusFoto` es monótono** (`stockCompararCortes`): ninguna junta vuelve atrás un corte.
  · **La celda guarda 3 días** (`STOCK_CONTROL_DIAS`, `stockPodarControl` dentro de `stockPodar`: los tres caminos): `det`, `sm`
  (salvo la manual que ningún Excel incluye), el historial (+ el último de cada almacén, `STOCK_HIST` 15; `h[].d` entero solo en
  el último de cada almacén, nunca de Moreno) y los recibidos enteros (`STOCK_RECIBIDOS_DIAS`; la MUESTRA sigue a 120 días: con 60
  cambiaba el tiempo medido). Ids de 64 bits (`huellaId`: `c…`/`d:`/`x:`/`s:`), el historial viaja sin `id`. Medido con la
  simulación de la auditoría: máx 39.573 en 60 días de uso pesado (antes, 50.000 el día 8).
  · **🧓 Página vieja**: `STOCK.pv=3` en cada guardado; una copia sin `pv` que vuelve atrás un corte o borra el control se JUNTA
  al leer y se reguarda (`stockProtegerDePaginaVieja`/`stockRepararLuego`; sin pedirle `pv` a la memoria: si no, una copia vieja
  inocente la apagaba). De fondo, el **servidor `2026-10-06-a`**: `__stock__` sellado sin `sf ≥ 3` → `actualizar`. ⚠️ **Primero
  la página y todos F5, después el servidor** (la página de hoy no manda `sf`). ⚠️ **Lo que la página vieja deja en el navegador
  no entra tal cual después del F5**: `sisCargarPestana` no carga una memoria sin `pv`, y `apiSaveAhora` manda SIN sello (`rev:0`)
  una fila del stock sin `pv` (`stockTextoAlDia`) → `conflicto` → se junta. Sin eso, la página nueva le ponía su `sf` al Excel
  del sábado que quedó en la cola y el servidor lo aceptaba. ⚠️ Una prueba que suba un Excel de otro día a propósito apaga SOLO
  esa regla (`window.existNoEsDeHoy=…`, ver `_otroDia` en `test_rev_corte_codex`); y un doble del servidor que guarde el stock
  «como el panel nuevo» manda `sf:3`.
  · B2 (`ofrecido`/`pendQ`), B3 (`stockRecYaEnFoto`), B5d, B6 (`difAnt` desde `h[].d` + lápida en `sm`), B8 (`stockMigrar`).
  · **Revisión independiente (06/10 a la tarde)**: B3 mira el corte ANTERIOR de acá (`ev.p` en la recepción): Moreno del mismo
  día sacado después de ese corte ya tiene la recogida descontada (Moreno 09:50 y acá 09:55 se le restaba otra vez). El mismo
  archivo subido dos veces conserva las diferencias de la primera (`existJuntarDif`: si no, el corregido comparaba contra 0).
  El mismo archivo ya subido con la hora del NOMBRE (página de antes) usa esa hora (`existAlinearHora`: misma huella, a menos de
  2 min). Un «Conté a mano» más nuevo frena el Excel con su propio texto (`previoAMano`).
  ⚠️ El 06/10 a la mañana ya se subieron Excel con la página de antes: hay detecciones con el nombre largo. La página nueva
  las lee y las ofrece por su nombre (§16). `tests/test_corte_del_dia.js` (56, con .xlsx armados en la prueba), `test_servidor` §22.
- **📅 Reprogramar ahí mismo** (§4kv, 13/10, dueño: *«al tildar lo entregado debería permitir ahí mismo reprogramar lo que no se entregó»*;
  en la rama): cada renglón (hoy y atrasados) tiene «📅 No salió · reprogramar» → recuadro AFUERA del `<label>` (`cierreEntRpHtml`: Hoy PM ·
  el próximo camión · el siguiente · fecha · turno, con cupos y `reproAvisos`) → `cierreEntRpConfirmar` mueve con **`reproAplicar`** (la
  MISMA de 📅 Reprogramar de la ficha: `nroDia` nuevo, `atcSeguirViaje`, `forzar` con avisos + `asegurarClaveAdmin`) SIN cerrar el cierre.
  Abrirlo destilda; queda en «📅 Reprogramados en este cierre» (`CIERRE_ENT_RP_HECHOS`). El bot avisa el día nuevo como cualquier cambio.
  `tests/test_cierre_reprogramar.js` (17).
- **🏭 Lo hecho a pedido que llega en dos veces y el Excel corregido** (§4mh, 25/10, auditoría Codex/Astra S1/S2; PUBLICADO `f1b5fe2`): una línea
  🏭 tiene DOS partes y van por separado: `prodUnidDeCortes(x)` (lo que anotaron los Excel: `prodU`/`prodC`, en el conteo) y
  `prodUnidAMano(x)` (el resto, del ✔ a mano: en el conteo solo si `stockEntradaVale` con `prodR` + la HORA `prodRt`). ⚠️ No volver a
  dar toda la línea por adentro del Excel por tener un `prodC` (reservaba 10 de un depósito con 3 → «fabricar 7»). Cada corte deja
  `prodCu` [[id, u, almacén, día, hora]] y, si sella, `prodCk` (la marca de antes): un archivo CORREGIDO del mismo corte primero devuelve
  (`prodRevertirCorte`; vista previa con `prodTrasCorte`, aviso `existFabDevueltas`) y después anota. Un campo nuevo de la línea 🏭 va en
  `heredarMarcas`. `tests/test_parcial_corregido.js`.
- Decisiones del dueño (05/10) y lo que falta (etapas 3-4: asignación automática con evidencia, plazos estimados aparte,
  patrones de diferencias, Moreno): bitácora §4hn y `RESPUESTA_CLAUDE.md` §30.
- 🚨 **Auditoría del 06/10 (bitácora §4hq)**: lo del control del corte quedó arreglado en §4hs (celda, página vieja, B2-B8).
  Los 🌆 PM van tildados A PROPÓSITO (dueño, 06/10, *«que logística destilde lo que no se entregó. Habíamos quedado»*). Antes de tocar el
  cierre o el control del corte, leer §4hq.
- **✅ Un pedido entregado que se mueve a otro día no se entregó** (§4lo, 16/10, dueño eligió la «F»; PUBLICADO 16/10 11:10, `92d08ff`): `entregadoSeMueve(p, f,
  desde)` = ✅, no ATC ni venta de tienda, fecha nueva distinta y **≥ hoy** → `entregadoDeshacer` (sin ✅ ni `eF/eT/eQ`). 📅 Reprogramar y
  ✏️ Editar PREGUNTAN antes (`entregadoMueveTxt`; Cancelar no toca/no guarda); `reproAplicar` (cierre, adelanto) lo aplica solo. A un día que
  ya pasó = corregir el registro: queda ✅. Destildar a mano (`toggleEntregado`, `quickEntregado`, `choEntregado`) y guardar un pedido no
  entregado sacan el registro del cierre (`entregaRegistroBorrar`: su `eF` manda en las salidas del stock). **`heredarMarcas`** pasa
  `prodU/prodC/prodRm` (misma cantidad, como `prodF/prodR`) y el registro del cierre a TODOS los renglones. `tests/test_reprogramar_entregado.js`
  (26; 18 rojas contra `6a55598`).
- **🏷️ Un código que la lista aprendió después ya no parte el producto** (§4ia, 08/10, dueño: *«Si, salen dos, está partido.
  Arréglalo»*; PUBLICADA 08/10 15:54, `409a077`): pasó de verdad con el SUEÑA LITE 105 (CH2531, en `CODIGOS` desde el 05/10): 20 en
  una fila, los pedidos en otra con 0, y el control del Excel con «−20 / +20 sin explicar». `stockMigrar` ahora reescribe el
  mapa `cod` de cada foto: todo código de `CODIGOS` apunta a SU clave (`stockNorm(d)|stockNorm(m)` con las uniones 🔗) y lo
  guardado con la clave vieja la sigue (`renom`; dos códigos de la lista con productos distintos sobre la misma clave vieja:
  no se toca). **`stockFundirDifs`**: las diferencias de un corte que caen en la misma clave se suman (0 = se van), y lo que el
  control anotó por una diferencia que en neto no hubo queda con lápida (`det`: entrada; `sm` con `pre`: salida) o se achica
  a lo neto. Los códigos que la lista NO conoce siguen crudos (§4cy). `tests/test_codigo_nuevo.js` (15; 12 rojas contra `2a7c7bd`).
  ⚠️ Va a pasar con cada código nuevo (el SMART 160x190 cuando llegue): ya no hace falta nada a mano.
- **🔎 La revisión de Codex del 05/10 (7 hallazgos, R1–R10), corregida en la rama (segunda vuelta de §4hn; `RESPUESTA` §31)**:
  · **El día del corte lo decide la casilla, no la marca ✅** (`stockSalioVentana`). **Lo destildado en el cierre no lleva
    ninguna marca** (dueño, 05/10: *«un pedido que queda como pasado y no fue tildado, logística lo entregó; lo que no entregan
    lo reprograman»*): la convención de §4co (fecha pasada sin ✅ = salió) sigue entera y el cierre guarda SOLO lo tildado. La
    marca «no salió» (`x.eX`) que pedía Codex en R2 se hizo y se sacó el mismo día; no volver a ponerla sin que el dueño lo pida.
  · **🏭 parcial**: `x.prodU` (llegadas) + `x.prodC` (cortes que las anotaron, idempotente); el sello `prodR`/`prodRm='excel'`/
    `chk='ok'` recién al completarse. **`enProduccionPendiente(x)`** = en producción y sin sello. **`prodUnidEnConteo(x)`** = lo
    llegado que YA está en el conteo (desde el control de un corte, o a mano con `prodR` anterior al corte vigente): se RESERVA
    (`comp`) y al entregarse SALE (`salidas`); lo que falta sigue en `aFab`. Lo usan `stockData`, `stockComprometido`,
    `stockSalidas`, `stockSalidasVentana`. En la conciliación: sellada a mano después del corte → causa `fabLlego` (sin detección);
    pendiente entregada → `fabSalio` (solo pendientes).
  · **Guardado pedido + stock**: `confirmarImportExist` espera a las dos partes y el toast dice «guardado N de M / pendiente de
    sincronizar / rechazado»; nunca ✅ antes de tiempo. La cola converge sin duplicar (los ids llevan el corte).
  · **Orden de cortes por fecha Y hora**; mismo día con hora de un solo lado = `ambiguo` («falta la hora», exige el tilde). Los
    movimientos anotados (`STOCK.e`, `STOCK.sm`) entran a la ventana por **`stockMovEnVentana(f, ts, v)`** (días límite por hora);
    la pantalla de stock resta las salidas a mano con **`stockMovDespuesDelCorte`** (hora del corte, no la de subida). ⚠️ Las
    entradas `STOCK.e` siguen con `stockEntradaVale` (`c.t`) y se vacían al confirmar un corte de fábrica: regla de siempre.
  · **Cierre sin conexión**: NO confirma sobre la copia; queda en `localStorage` **`me_cierre_pend`** (plan: ids, días, cómo
    estaba cada pedido) y **`cierreEntSincronizar()`** lo aplica revalidado con la próxima lectura buena (gancho en
    `refrescarEstadoYa`). La ventana de resultado dice «guardado en la planilla: ok de total», cola y rechazados.
  · **Lápidas monótonas** (`fusLapidas` en `stockFusionar`): una recepción o detección con `an` en cualquiera de las tres copias
    sigue anulada en la junta. Una copia sin `v`≥2 (página vieja) no toca `det`/`sm`. **`STOCK.v2t`** + `stockRecsPaginaVieja()` →
    aviso ámbar en la vista previa con «↩️ anular» para lo que una página sin F5 «dio por llegado» por la fecha.
  · `tests/test_rev_corte_codex.js` (45). ⚠️ Una prueba del control del corte que anote movimientos con `ts` tiene que armarlos
    con la hora de Bolivia (`new Date(f+'T'+h+'-04:00')`); con el reloj clavado, `Date.now()` es SIEMPRE el mismo instante (y
    coincide con `c.t`): no sirve para «antes/después».

## 📋 Stock para la reunión con logística del 22/10 (§4lr, 16-17/10, y §4ls, 18-19/10; PUBLICADO 19/10 20:20 de Bolivia, `bd3164c`; el `.gs` no cambió)
Revisión de 81 agentes con la planilla real (59 hallazgos, cada uno verificado dos veces). Lo que hay que respetar:
- **El plazo medido** (`stockTiemposFabrica`): con un empate en el corte de las 6 últimas llegadas entran TODAS (si no, dependía del
  orden de las filas: Moreno daba 7 con los mismos datos; ahora 4, confirmado por el dueño). **Una fábrica por producto**: `o.fabLead`
  (la del bloque de «Qué producir»), nunca la última 🏭 de un pedido.
- **Un ✅ con fecha futura y sin `eF` no salió** (`stockEntregadoFuturo`, regla de §4lo); marcar ✅ antes del día anota `eF` = hoy
  (`entregaAdelantadaAnotar`). Un camino nuevo que marque ✅ tiene que llamarla.
- **Detecciones del Excel**: `stockDetectadoReparto` (cada detección contra los pedidos a fábrica ANTERIORES a su corte, con capacidad)
  y `stockMenosDetectado` en la proyección y el cuadrito. No volver a restar lo detectado «a las primeras llegadas».
- **🛏️ Almohadas: la RPT ES la venta** (dueño, 16/10): `stockEsDemanda(p, k)` renglón por renglón (ALMOHADA/ALM/TRAVESSEIRO/NASA:
  la RPT cuenta y su venta de tienda no; lo demás = `!stockPedidoUnico(p)`). Ritmo, 30 días, índice del mes, ranking y tiendas.
- **🏭 «En producción» automático** (dueño, 17/10: *«Sí, que se acuerde solo»*): al terminar los Excel del día el panel anota «Pedir 7
  días» en **`STOCK.ap`** (`{clave:{día:[u, llegó, a mano, anulado, t]}}`); cuenta desde el día siguiente hasta `stockAutoVence`; lo
  cierra la entrada NETA del lote de los 3 almacenes (`existLoteProduccion`, un traspaso se anula; una vez por lote, `STOCK.apL`); si
  no aparece avisa «¿se pidió?». `fusAuto` en `stockFusionar`, `stockPodarAuto` en `stockPodar`. ⚠️ No guardarlo en `STOCK.p` (la
  celda corta en 50.000). 🔌 **APAGADO desde el 18/10** (dueño, decisión 1 de §4ls: «apagarlo hasta el jueves»):
  `STOCK_AUTO_ACTIVO=false` — no anota, no cuenta lo anotado, no muestra nada; lo guardado se sigue leyendo/juntando/podando. Prenderlo
  solo después de la Prioridad 0 del informe de la revisión 2 (bitácora §4ls). Una prueba del automático lo prende y lo APAGA aparte.
- **El lector de varios almacenes** (`existSeccionesError`): un archivo que no se entiende NO se lee entero como un almacén.
- **«📍 Banzer o PTF» NO es para pedir a producción** (su plan es otra cuenta, §4hw): en la reunión vale el Plan de stock / Qué producir.
- El Plan tiene «📋 7 días / 15 días / <mes>» por fábrica (`copiarProducirTodo`). PTF negativo con el Excel de hoy: `stockNegTxt`.
- `tests/test_stock_reunion.js` (59; 48 rojas contra `27f0134`). Lista completa y datos para logística: bitácora §4lr.
- 🏪 **Las tiendas ya están en el pedido a producción, y el panel lo dice** (§4lt, 19/10; dueño eligió «Mostrarlo en el panel», sin cambiar
  números; PUBLICADO 20/10 con §4lt-c): la venta de tienda es demanda, en almohadas la RPT; la RPT de un colchón NO suma encima (contaría dos veces). El Plan
  (`.pl-tiendas`) y cada TOTAL de «Qué producir» (`tr.prod-tiendas`) dicen cuánto es por las tiendas = pedido − el mismo pedido con
  `STOCK_SIN_TIENDAS` (`stockTiendasParteCalc`, un momento después de dibujar, 60 s de caché). ⚠️ Ese interruptor es SOLO para medir: siempre
  en `finally`, y con `STOCK_DIBUJO` apartado. Tiendas Roho no carga ventas y su RPT no cuenta: decisión pendiente del dueño.
  `tests/test_stock_tiendas_parte.js`.
- 📦 **El total a producir** (§4lt-b, 20/10): la columna del mes va ADEMÁS de 15 días, así que `f.tot = quin + mes` («Hasta el 30/11») va en
  cada fila, medida, TOTAL, encabezado y copia (`copiarProducir(k,'tot')`). ⚠️ Una cuenta nueva del total sale de `B.tot`/`f.tot`, nunca aparte.
- 🏭 **«Pedido a producción», una ventana aparte** (§4lt-c, 20/10; dueño: *«lo veo muy cargado… al hacer el pedido se genere el consolidado…
  y en otra pestaña qué va a qué tienda en los próximos 7 días, 15, 30 y para el siguiente mes»*; vio el ejemplo y dijo «Publica»; PUBLICADO 20/10 00:25 de Bolivia, `b42198c`):
  `#pap-overlay` (z 3100) desde la barra de Stock (`#stk-pap-btn`), el Plan (`.pl-pap`) y la línea de «Qué producir» (`#prod-pap`; el cuadro
  del total y la planilla de §4lt-b se sacaron de ahí). Plazos 7 (sin fecha: U17) / 15 / **30 días** (`f.d30` = el mayor de la cuenta de 15 días
  con `PRODUCIR_30` y el piso de fin de mes —`antes` + la parte del mes que viene que cae adentro—, tope `quin + mes`, `stockProducirD30`) /
  «Todo <el mes que viene>» (`f.tot`, con «N para terminar <este mes>» aparte), cada uno incluye al anterior; lo de las tiendas no achica al
  alargar el plazo. Al abrir y con 🔄 lee la planilla (con Stock abierto no se relee sola); avisa el Excel que no es de hoy y lo que no está contado. Pestaña «📦 Qué pedir a producción» (por FÁBRICA:
  Industrias Moreno = Heaven + ROHO, Multiespumas = Sueña; «📋 Copiar para <fábrica>») y «🗺️ Qué va a dónde» (PTF / Banzer / cada tienda con
  `producirRepartoFila`: suma exacto; tiendas por su venta de tienda de 30 días + la RPT pendiente; el resto con la regla de «📍 Banzer o PTF»).
  Solo mira. ⚠️ Clases `pap-*` (no reusar nombres del panel); la cuenta sale de `stockProducirCalc`/`STOCK_TP`, nunca aparte.
  `tests/test_producir_reparto.js` (64).
  · **👥 Para clientes de cada tienda y las tiendas en 0** (§4lt-d, 20/10; dueño: *«no aparece Mia Plaza ni en 7 ni en 15 ni en 30?»*; en la rama, espera
  «publica»): la columna de una tienda es lo de su LOCAL; Mia Plaza vende casi todo a domicilio (sale de PTF/Banzer). Lo de PTF y Banzer se muestra «para
  clientes de» la tienda de quien vendió (`producirTiendaCliente`, `D.C`, `r.CP`/`r.CB`, solo para mostrar) y las tiendas sin nada para su local salen con
  «0» y el porqué (`papCeros`). Entre tiendas se reparte con `producirRepartirParejo` (un plazo más largo nunca da menos). ⚠️ NO alargar la ventana de
  pesos para «hacer aparecer» una tienda: le daría unidades que el pedido calculó por otras (backtest: 30/60/90 días dan casi lo mismo).
  `tests/test_pap_clientes.js` (30).
- 🎨 **Lo que se le publica al dueño (páginas, artefactos con clave) va SIEMPRE claro, con los colores del panel** (dueño, 19/10: *«no uses
  fondo negro… usa los mismos colores que el panel»*): fondo `--bg-app`, tarjetas blancas, turquesa `#00B5AD`/`#00A09A`, encabezado `--grad-header`,
  letra Inter, y SIN modo oscuro aunque el aparato lo tenga.
  📸 **Capturas para el dueño** (25/10, §4mo): un `.html` mandado por el chat NO se le abre en la app («sale puro código»). Se le publica una página
  (Artifact) y, como tiene enlace, con las capturas sacadas de una copia de la planilla con clientes INVENTADOS (nombres, celulares, NIT,
  direcciones, pines, observaciones), nunca con los datos reales.

### §4ls — la revisión 2 implementada (18-19/10; PUBLICADA 19/10 20:20, `bd3164c`; decisiones del dueño del 18/10)
- **U2 por turno** (decisión 2): dos casillas al subir el Excel, `#exist-inc` (mañana) y `#exist-inc-pm` (tarde), igual en «Conté a
  mano» (`#conteo-inc`, `#conteo-inc-pm`); las propone `stockIncPropuesta` (camión: GPS/«🚚 Ya salió» con `STOCK_INC_CAMION_MIN`; sin
  dato, `STOCK_INC_AM`=09:30 y `STOCK_INC_PM`=16:00). Lo de HOY de un turno incluido no se reserva (`stockFueraHoy`) ni se resta otra vez
  (`stockBajaDelCorte`), con ✅ o sin ✅; sin turno = mañana. ⚠️ El turno se guarda en **`incT`** (`'am'|'pm'|'ampm'`) en `STOCK.c`,
  `STOCK.g[nm]` y `h[]`; `inc:true` sin `incT` es de una página vieja (`leg`: no saca lo de la tarde sin ✅). ⚠️ Un pedido cargado
  después de la hora del Excel no estaba en él (`stockCargadoDespuesDelCorte`, por `p.ts`): una prueba que arme un pedido de hoy tiene
  que darle un `ts` ANTERIOR a la hora de su Excel. Todo lo que reserve o descuente lo de hoy pasa por `stockAntesDelCorte`.
  🌅🌙 **Dos Excel por día** (§4lx, 23/10, dueño: la mañana ANTES de cargar y otro al FINAL del día; PUBLICADO 23/10, `4724a33`; la hoja «Historial stock» guarda solo el último del día, decidido por el dueño): sin dato del
  camión el Excel de la mañana se da por cargado desde `STOCK_INC_AM_EXCEL`=12:00 (conteo a mano y página vieja siguen con 09:30); el de la
  noche va después del ✅ Cierre de entregas (aviso `stockIncSinCierreHtml`); `stockSalioVentana` deja entrar el día del corte anterior con
  los dos turnos solo para lo cargado después de su hora; `onExistArchivo` relee la planilla antes de la vista previa (`EXIST_RELEER_MS`);
  `STOCK_HIST`=24. ⚠️ Una prueba con un Excel «de la mañana» después de las 09:30 tiene que marcar la casilla a mano o usar ≥12:00.
  `tests/test_dos_cortes.js` (26).
- **Cuadrito por fecha** (decisión 3, `saldoVeredicto`): `v.libres`/`v.faltan` son A LA FECHA prometida (`v.pendFecha`, `v.fechaRes`),
  `v.pend` es el TOTAL; aviso ámbar `saldoDespues` (a lo vendido para después le falta / se atrasaría). La reserva del servidor manda
  el libre a la fecha. Lo descontinuado descuenta todo.
- **Cuánto tener de lo que rota** (decisión 4): UNA cuenta, `stockObjetivo` (`STOCK_OBJ_*`): μ/σ de 26 días hábiles por FECHA DE VENTA,
  punto de pedido μ·5+z·σ·√5, objetivo = punto + 1 día (almohadas +5), libre = PTF+Banzer+seguro en camino − vendido 15 días desde hoy;
  se pide hasta el objetivo al llegar al punto (Moreno primero). Qué rota NO cambió (§4dj). Lo que no rota: solo lo vendido. ⚠️ El
  margen/reserva de §4dj ya no deciden CUÁNTO pedir de lo que rota; `o.porDia` (15 días) sigue en «Se corta» y en Banzer o PTF (dos
  ritmos en pantalla, a propósito hasta que el dueño decida). **El mes** (decisión 5): deja el objetivo puesto el último día, redondeo
  único. **Lo que no rota no se fabrica en el mes por historia** (Mes-VM9). ⚠️ Mes-VM4 se probó y se SACÓ (no mover a 15 días lo que
  falta antes del 1°).
- **Revisión automática**: la ✗ se reparte por fecha solo si la entrega es dentro de 15 días (`revStkNoQuedaComoEsta`); ✔/📥
  protegidas; plazo medido solo con `prodR`/`eF` (una muestra por pedido). Recogidas que vencen (`STOCK_RECOGIDA_VENCE_DIAS`), «Conté a
  mano» con `mano:1`, «Salió sin pedido» con depósito y lápida `an`, control del Excel con protectores aparte (`existControlFueraHtml`).
- Números 16/10 12:00: pedido de hoy 221 → **208** (= la regla validada, 325/325); Qué producir 210/392/424 → **194/476/653**.
- Pruebas `tests/test_stock_rev2_{auto_off,calculo,u2_turno,cuadrito_fecha,cuanto,flujos,resto,textos}.js`. 
- **Verificación final (19/10)**: `5d0dc82`, `22d4615`, `225ccf6`, `ad25885`, `e3ed48a`; pruebas `tests/test_stock_final_{cuenta,excel,
  cuadrito,pantalla}.js`. Batería **213 / 7.502 / 0 mal**. ⚠️ `renderStock` dibuja con una foto (`STOCK_DIBUJO`/`stockMemo`): stockData,
  stockTiemposFabrica, ventasPanelIndex y stockProducir se calculan UNA vez por dibujo; algo que cambie el stock en medio de un dibujo tiene
  que llamar a `renderStock` de nuevo. `stockSalidas(k)` lee de `stockSalidasMapa` (una pasada). La hoja «Historial stock» guarda `it`
  (qué turnos traía cada Excel). Lo 🏭 de otro ya salido de fábrica lo apartan el cuadrito y la revisión (`stockFabVencidoU`), el Plan NO.

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

## 🛰️ El GPS de los camiones (§4ko, 13/10; dueño: *«Sí, armá lo del GPS»*; servidor `2026-10-13-a` IMPLEMENTADO 13/10 ~10:00 por el dueño, `probarGps` ✅ 4 de 4 placas, hora en UTC verificada, Banzer a 35-44 m: el pin sirve; página PUBLICADA 13/10, `2e2eb42` y `7f53be3`; volver atrás: ✏️ a la versión anotada Y pegar la 12-f de `2232b59…`, 3.299 líneas. **`2026-10-13-b` IMPLEMENTADO 13/10 tarde por el dueño (§4kp) y página PUBLICADA `528d2a0`**; volver atrás de la 13-b = ✏️ a la versión anotada Y pegar la 13-a de `d2963b1…`, 3.524 líneas)
La plataforma del GPS (service24gps, documentación en docs.redgps.com): `gettoken` (apikey + usuario + contraseña → token de 6 h) y
`getdata` (apikey + token → cada unidad: placa, posición, km/h, motor, conductor, hora del reporte). **30 s entre pedidos.**
- 🔐 **Propiedades del script**: `GPS_APIKEY`, `GPS_USUARIO`, `GPS_CLAVE` (nunca en el código ni en el chat); `GPS_TOKEN_AUTO` lo
  maneja el script; opcional `GPS_DEPOSITOS` (JSON) corrige el pin de Banzer sin reimplementar. Sin las tres, nada corre ni se escribe.
- **`gpsRepaso`** (disparador cada minuto, `instalarDisparadores`; 6 a 21 h de Bolivia, ni domingo ni feriado): UN pedido por vuelta
  (el token o las posiciones). Posiciones a la caché `gps_pos` (10 min), resumen en `GPS_ULTIMO`, salidas del día en `GPS_DIA`.
  La lectura `list` las lleva en `gps` (de la caché, sin red). Desde el editor: `probarGps` (dice qué camión es cada placa y la hora
  del reporte: con `UseUTCDate=1` se lee en UTC, **verificarlo la primera vez**) y `estadoGps`. `probarAntesDeImplementar` §12.
- **«Salió»** = estuvo a ≤ `GPS_DENTRO_M` (300 m) de PTF o Banzer y pasa `GPS_FUERA_MIN` (15) minutos a ≥ `GPS_SALIDA_M` (700 m) de
  los dos; la hora es cuando se alejó. Ir de PTF a Banzer a cargar no cuenta; visto primero en la calle, no se adivina. «Volvió» al entrar.
- ⚠️ `GPS_DEPOSITOS` = `ALM_UBIC` y `GPS_PLACAS` = `VEHICULO_PLACA` de la página (`test_gps` §1): un camión nuevo va en los dos.
- **Página (solo mira, no escribe)**: `apiList` → `gpsTomar(j.gps, j.ahora)` (una caché de más de `GPS_VIGENCIA_MS` = 10 min no se
  toma); `camionGps(veh)`; **`camionSalio` = la marca a mano o, si no, la del GPS de hoy** (`GPS_SALIO`, se recuerda en la pestaña);
  la ficha del camión dice «🛰️ Salió … · lo dice el GPS» (sin «deshacer»: solo se deshace lo marcado a mano) + `cvGpsLinea`; el
  mapa de entregas (Hoy) dibuja `mapaGpsPintar` y el recorrido no pone su 🚚 estimado si hay GPS; la ciudad (`cams[].gps`,
  `manejar` va por las calles hasta el punto del GPS; «volvió» → al andén; `api.gps` lo actualiza SIN rearmar la escena).
- Cuota: la cuenta es gmail (90 min/día de disparadores): gpsRepaso ≈ 1-2 s × ~900 vueltas. Si se pasa, mirar Ejecuciones.
- **La ciudad sigue al GPS** (13/10, dueño: *«los 4 camiones salen en el mismo lugar»*): lejos → en la calle en su punto; en PTF o Banzer →
  en ese depósito (`c.gpsCalle`/`c.gpsDep`). ⚠️ `geoAEscena` está ANCLADO (afín por cuadrados mínimos sobre PTF, Banzer, Moreno, la plaza y
  las tiendas + ajuste local): un ancla nueva va en `geoArmar`. Recorrido del día y paradas: en el aparato (`gpsHistAnotar`, `me_gps_hist`,
  `gpsParadas`, `gpsEventosHoy`); pestañas «🛰️ Recorrido GPS» y «📡 Lo que dijo el GPS»; «Por cargar» incluye lo sin camión.
- **📍 13-b (§4kp; dueño: *«¿y las entregas automatizadas… camión se detuvo en una ubicación marcada para entrega? ponte serio»*)**:
  el SERVIDOR anota el día para todos (aunque nadie tenga el panel abierto). **Paradas** (`GPS_PAR`): ≥4 min quieto fuera de PTF,
  Banzer y Moreno; nombra los pedidos de HOY a ≤300 m (de ese camión; si no, sin camión; nunca de otro), leyendo la planilla UNA vez
  por parada. **Moreno = recoger** (`GPS_MORENO`, 400 m): un viaje que llega a Moreno sin pararse en ningún pedido deshace su «salió»;
  salir de Moreno cuenta con la primera parada o a los 45 min; PTF ↔ Banzer sin parar = traslado. **Registro** `ev` en GPS_DIA. La lectura
  lleva **`gpsDia`** (caché 6 h: sigue después de las 21 h) y el recorrido va aparte (**`gpsRuta`**, sin candado; la página lo pide solo con
  la 13-b). Página: `gpsDiaTomar`, `gpsParadas` (servidor o aparato, misma regla `gpsPedidosCerca`), `gpsLlegadaDe(p)`; «📍 Llegó HH:MM» en
  Mis pedidos; en el **cierre de entregas** cada pedido dice qué vio el GPS y **«📍 Tildar los N que vio el GPS»** solo tilda (confirma
  logística). 🚫 **Nada se marca ✅ solo** (dueño, 12/10). ⚠️ GPS_DIA y GPS_PAR son propiedades: aguantan 9 KB (`GPS_PROP_TOPE`).
- **📥 En Moreno, no en la calle de atrás** (13/10, dueño: *«¿por qué está parado ese camión? Está atrás de la fábrica en plena calle»*):
  `gpsEnMoreno(x)` (`mor` de la 13-b o ≤400 m de `GPS_MORENO`, = el del `.gs`) → «en Moreno»; la ciudad lo estaciona en el andén de Moreno
  (`gpsLugar(g)`, UNA cuenta para `sincronizar` y `gpsAlDia`: si difieren, la escena se rearma cada 1,5 s). ⚠️ Un camión «en la calle» se
  dibuja en la calle MÁS CERCANA a su punto (`z` redondeado a la grilla): un lugar nuevo donde los camiones «están» va como depósito, no como calle.
- **🚪 La puerta de los depósitos no es una parada** (§4kq, 13/10, captura del dueño: el KSC «se paró 17 min» y «llegó a PTF»): quieto a
  < 700 m de PTF, Banzer o Moreno SIN pedido cerca no se muestra (página: `gpsBaseCerca`, `GPS_PUERTA_M`) ni se anota ni suma `tp`
  (servidor **`2026-10-13-c`**, `s.qb`); de Moreno, los 45 min corren solo lejos de las bases. Sin eso, Moreno → PTF con espera en la
  puerta era «salió de Moreno». «volvió a Banzer» cuando sale y vuelve al mismo lugar. ⚠️ El aviso de la ciudad es `.pt-toast`: una
  clase dentro de `#pt-ov` que se llame como una de la página hereda sus reglas (`.toast` lo estiraba de arriba hasta abajo).
- `tests/test_gps.js` (99, el `.gs` real con una plataforma de mentira), `tests/test_gps_pagina.js` (58). Bitácora §4ko, §4kp, §4kq.
- **🙈 Ocultar en Mis pedidos y Administración** (13/10): `misPlegar(k)` (`me_mis_plegado`) para las ventas de Kommo y las respuestas al bot. `tests/test_ocultar.js`.

## 🏬 Recoger de una tienda (§4kr, 13/10; dueño: *«a veces no hay stock en fábrica y los vendedores piden que recojan de sus tiendas»*; en la rama, `f4e796b`)
- En las marcas de cada producto, **«🏬 Tienda»** → elegir la sucursal (`SUCURSALES` sin Tiendas Roho, la del vendedor primero). Guarda la
  MISMA marca de «📥 recoger» con `chkDe='Tienda X'` (`TIENDA_PREF`): una página vieja la lee como «📥 Recoger de Tienda X».
- `recogeTiendaDe(nm)`/`recogeDeTienda(x)`; `recogerClave` = `tienda:<sucursal>` y `recogerMismo` no la junta con ningún almacén.
- ⚠️ **No es stock del panel**: `stockData`, `stockComprometido`, `stockSalidas`, `stockSalidasVentana` y `stockAsignar` (`tot.deTienda`) la
  saltean; no reserva ni descuenta PTF/Banzer/Moreno y el control del corte no la espera. **Sí cuenta para la rotación.** Un camino nuevo
  que reserve o descuente stock tiene que saltearla igual. Se ve con 🏬 en Administración, «Lo del día, por lugar», los camiones 3D y la
  ciudad. `tests/test_recoger_tienda.js` (20). Bitácora §4kr.

## 📢 «Decir anuncio» (§4ks, 13/10; dueño: *«que Eduardo lo repita cada 3 min a los vendedores… "no hay insumos para el ICE" hasta nuevo aviso»*; en la rama)
- Fila del sistema **`__anuncio__`** (`ANUNCIO_ID`, en `esFilaSistema`; JSON `{v,t,d,ts,por}`; quitar = `t` vacío; sin sello: gana el último).
  El servidor no cambió.
- Administración → «📤 Mensajes y partes» → **«📢 Decir anuncio»** (`#anu-btn`, `anuncioAbrir`, solo con la contraseña).
- **📣 Eduardo lo GRITA en TODOS los aparatos UNA VEZ al entrar al panel** (§4kw + §4ky, 14/10, PUBLICADO `3e2dd38`; dueño: *«haz que grite, tiemble la pantalla, que
  Eduardo aparezca con su megáfono gritando!»*) **y después, cada `ANUNCIO_CADA_MS` (3 min), solo el globo de Eduardo, callado**
  (`anuncioRecordar`; dueño, mismo día: *«si sale en pantalla completa cada 3 min sería molesto… solo la primera vez… y luego el
  pequeño saca el anuncio cada 3 min sin molestar»*). ⚠️ No volver a gritar en grande cada 3 min. Un anuncio NUEVO se grita otra vez.
  `anuncioGrito` = pantalla entera `#anu-grito` (z 10050) con Eduardo grande,
  megáfono SVG (`anuncioMegafonoSvg`) y ondas; tiembla (`body.anu-tiembla` sobre `.header`/`.nav`/`.wrap`: ⚠️ nunca sobre `body`, saltarían
  los `fixed`); sirena WebAudio (`anuncioSirena`) y la voz del navegador (`anuncioHablar`, castellano, sin emojis). Mientras habla no se
  cierra; tocar, «Entendido» o Esc lo cierran y lo callan. 🔇 = sin sirena ni voz. Escribiendo (`anuncioEscribiendo`, 8 s) espera. Sin un
  toque el navegador no deja sonar: sale callado (`ANUNCIO.sinVoz`) y el primer toque lo hace gritar (`anuncioEscuchar`). Espera la risa
  de Halloween (`window.hwRisaAudio`). En los avisos de Eduardo sigue primero y **sin «Entendido»** (`fijo`).
- `asisRefrescar` no lo cuenta entre los nuevos y llama a `anuncioTic`. `tests/test_anuncio.js` (47; ⚠️ Playwright evalúa con «gesto del
  usuario», así que `navigator.userActivation` siempre dice que sí: la prueba simula el primer toque con `anuncioPuedeSonar`). Bitácora §4ks, §4kw.

## 🎧 La ATC no se guarda sin sus datos + 📷 hasta 2 fotos del producto (§4lh, 15/10, PUBLICADO `a21dfe7`; dueño: *«no les permita guardar si no tienen todos los datos llenados… fecha de compra, motivo… detallar. Añade… adjuntar fotos del producto, hasta dos imágenes»*)
- Obligatorio al crear Y al editar por el formulario (`atcFaltan`/`atcFaltanDe` en `submitPedido`): motivo, detalle (≥ `ATC_DETALLE_MIN`=10 letras),
  fecha de compra (ni futura, ni posterior a cuando entró la ATC, ni antes de 2000) y qué se le recoge (≥1 casilla). Fotos NO obligatorias.
  Recuadro `#atc-falta` + `atcCampoListo`; «Para guardar» (`fxDerPintar`) las lista. 🔑 Con la clave de Administración, una ATC vieja a la que YA
  le faltaba lo mismo se guarda igual tras un `confirm` (`atcFaltanHeredados`); lo que tenía no se borra ni con clave. El detalle se guarda en una línea.
- 📷 `ATC_FOTOS_MAX`=2, `FORM_ATC_FOTOS`, `atcFotosElegidas`/`subirAtcFoto`/`quitarAtcFotoForm`. Quedan en `atc.fot` **y** en `p.fotos` (columna 29:
  la única que cuida el barrido de huérfanas del servidor, §4ep). ⚠️ **`fotosEntregaDe(p)`** (la columna sin las del producto) para todo lo que MUESTRA o
  CUENTA fotos de la entrega; `fotosDe` para guardar/comparar la fila. `abrirVisor(pid,i,'atc')`, `atcFotosTiraHtml` en la ficha ATC y los modales.
  El eco del formulario compara contra `rec` (lo mandado). Una página sin F5 no conoce nada de esto: al publicar, todos F5.
- `tests/test_atc_obligatorio.js` (57). Bitácora §4lh.
- **📧 El correo de la ATC** (§4li, 15/10, PUBLICADO `ea4978a`; dueño: *«que al crear la ATC se genere el mensaje para copiar al correo, y ellas enviar»*): al guardar
  una ATC sale «✅ ATC guardada» con `#atc-correo` ARRIBA del WhatsApp: Para (por compu, `me_atc_correo`; si no, `ATC_CORREO_PARA`, hoy vacío),
  Asunto (`atcCorreoAsunto`) y Mensaje (`atcCorreoTexto`: todo lo de la ATC + enlaces de Drive de las fotos). Copiar / «📧 Abrir en Gmail» /
  «✉️ Otro correo» (`atcCorreoUrl`). El panel NO manda nada. También desde la ficha («📧 Correo de la ATC», `atcCorreoVer`). `tests/test_atc_correo.js` (32).
- **🛡️🔧 Garantía o contra costo (STC)** (§4lj, 15/10, PUBLICADO `8af3831`; dueño: *«solo es para marcar y filtrar la información al llenar… las recogidas y fechas
  se mantienen»*): `atc.tipo` = `gar`|`stc` (`atcTipo`), OBLIGATORIO en el formulario (`#f-atc-tipo`, en `atcFaltanDe`). El número sigue «ATC …»:
  nada del circuito, estados, cobro ni del bot cambia (con «STC …» el bot del `.gs` lo tomaba como venta). Las viejas quedan «❓ Sin marcar» y se
  marcan desde la ficha (`atcTipoMarcar`; cambiar una ya marcada pide la clave). Filtro «Tipo» en la pestaña (`#atc-tipo` → `atcLista`) con chips
  (`atcTiposHtml`), columna «Tipo» al FINAL de «📋 Copiar», asunto/mensaje del correo, línea del WhatsApp, «🔧 STC» en `atcChip` y el informe PDF
  (`#atci-tipo`, `atciDatos(mes, tipo)`). `tests/test_atc_tipo.js` (48).
- **🧽 Bloki lo enseña** (§4lk, PUBLICADO `48fe59c`): «¿Cómo mando el correo de una ATC?» y «¿Cómo separo las de garantía y las de contra costo (STC)?» al final de
- **🧩 El informe por marca y línea** (§4ll, 15/10; dueño: *«9 titanio por hundimiento, 3 especial semi ortopédico… separar Heaven y Sueña»*): hoja(s)
  «¿Qué líneas y por qué?» después de «Productos y marcas» (`atciLineasHojas`): por marca, cada línea con su total y una columna por motivo, y
  debajo sus productos; «Lo que más se repite» (2+). Marca = la del NOMBRE del producto (`stockMarcaDeNombre`), si no la de quien la cargó;
  ⚠️ la dona «De qué marca» usa la MISMA regla (`atciMarcaAtc`). Línea = la primera palabra de una línea de esa marca (`ATCI_LINEAS`; ICE/LATEX
  = TITANIO); «SEMI ORTOPEDICO» a secas en Heaven NO se adivina («Sin línea en el nombre»). Producto = `atciNomBase` (sin medidas, abreviaturas
  enteras). Las marcas llenan la hoja y siguen en otra con «· sigue» (`ATCI_LIN_ALTO`, medido). `tests/test_atc_lineas.js` §1-4.
- **🧹 La barra de ATC** (§4lm, 15/10; dueño: *«demasiados botones»*): sin «📋 Copiar» ni «🔗 Completar con Trello» (las funciones quedan). «📋 Copiar»
  va en la ficha (`copiarAtcUna`: SOLO su fila, las mismas 17 columnas, `atcCopiaFila`). **«📄 Informe PDF» solo gerencia** (`atcVeInforme` =
  `asisVeAdm`: la clave, Administración o Logística; Contabilidad y vendedores no). `tests/test_atc_lineas.js` §5-6.
  `ASIS_AYUDA` (21; 17 para un vendedor). Sinónimo `stc:'costo'` — ⚠️ nunca «contra» (está adentro de «encontrar»).

## 📄 Informe de ATC en PDF (§4le, 15/10, PUBLICADO 09:31 de Bolivia, `9cdb86d`; dueño: *«un botón que genere un informe en PDF… tipo presentación… sobre las ATC del mes, que uno puede elegir el mes»*)
- Pestaña ATC → **«📄 Informe PDF»** (`#atc-informe-btn`, `abrirInformeAtc`, ventana `#atci-ov`): el mes arranca en el de la pestaña. **Mes = las
  ATC que ENTRARON** (`atcEntro`); las abiertas de meses anteriores van APARTE. Estado = el de HOY. Cuentas en `atciDatos(mes)` (las de la
  pestaña: `atcEstado`, `atcDias`…; no calcular nada aparte), hojas en `atciHojas(D)`: A4 apaisadas 1123×794 px (portada, resumen + «Lo más
  importante», motivos, productos/marcas, dónde están, tiempos, 6 meses, detalle de 11 por hoja).
- **⬇️ Descargar PDF** = html2canvas 1.4.1 + jsPDF 2.5.1 de cdnjs, cargados al tocar (`atciCargarLibs`), sobre una copia sin `zoom` ni sombra
  (`#atci-render`). Sin internet → ventana de imprimir; el `@page` apaisado vive solo con la ventana abierta (`atciPaginaCss`).
  ⚠️ En el CSS de las hojas nada de `color-mix()`/`oklch()` ni `box-shadow` en la copia (html2canvas los pinta mal); tablas con
  `table-layout:fixed` + `white-space:normal`. `tests/test_atc_informe.js` (55; `ATCI_LIBS_DIR` con las librerías de npm, `ATCI_SALIDA` deja PDF y capturas).
- **🗂️ «Todas, desde el inicio»** (§4le-b, 15/10, PUBLICADO `e05ba67`; dueño: *«elegir mes seleccionado o TODAS»*): selector `#atci-alc` → `atciDatos('todas')` (mismas
  cuentas, sin comparar con un mes; tendencia mes por mes desde la primera, hasta 12; «Por mes, en promedio»; abiertas por mes de entrada).
- **🛒 La fecha de compra y sin «y N más»** (§4le-c, 15/10, PUBLICADO `e468cc0`; dueño: *«NO ME PUSISTE EL DATO MÁS IMPORTANTE»* y *«si mi jefe quiere ver
  los demás, ¿qué onda?»*): columna «Compra» en las que esperan, las que siguen y el detalle (`atciCompraTd`): la guardada o, con 📎, la de Trello
  SOLO del mismo celular y no posterior (`atciTrelloMapa`, carga `atciTraerTrello` al abrir; el informe no guarda nada). Lo que no entra va en
  hojas aparte (`atciProductosResto`, `atciAbiertasResto`) y «Quién las cargó» va entero (`.ai-vlist` con más de 6). `test_atc_informe` §1c-1d (67).

## 🔗 Completar las ATC con Trello (§4lf, 15/10, PUBLICADO 09:54, `f4239a3`; adjuntos §4lf-b PUBLICADO 10:19, `e2c3e5f`; dueño: *«revisá todas las atc del panel con las del trello y añadí los datos faltantes: motivo y fecha de compra»*)
- Pestaña ATC → **«🔗 Completar con Trello»** (`abrirAtcTrello`, `#atct-ov`, solo con la contraseña). Lee `atc-semanal.csv` (el respaldo diario del
  tablero que baja el workflow «Reporte Semanal ATC»: el panel no tiene la clave de Trello) y cruza cada ATC por **celular** (tildado) o **nombre**
  (sin tildar). **Solo completa lo vacío** (motivo, fecha de compra, detalle; se vuelve a mirar al guardar) y deja `a.tre` = la tarjeta (la ficha
  muestra «🗂️ Ver su tarjeta en Trello»). La fecha de compra solo con día/mes/año (`atctCompra`); mes/año o año solo se muestran. `tests/test_atc_trello.js` (33).
- **📎 Las fotos y Excel adjuntos** (§4lf-b, dueño: *«eso en el trello está en fotos… ya puse mi api key en github»*): `herramientas/trello_adjuntos.py`
  (workflow «Leer adjuntos de Trello (ATC)», 19:10 de Bolivia, secretos `TRELLO_API_KEY`, `TRELLO_TOKEN`, `ANTHROPIC_API_KEY`) lee los Excel directo y
  las fotos/PDF con Claude, UNA vez por adjunto (`vistos`), y deja `atc-trello-adjuntos.json`; una tarjeta con la fecha entera no gasta en sus otras
  fotos. ⚠️ Registro público: el script imprime SOLO cantidades. En el panel (`atctSumarAdjuntos`) **el texto de la tarjeta manda**; del adjunto
  entran celulares, la fecha si el texto no la tiene entera («📎 En la factura «…» dice…»), reclamo/motivo/nombre si faltan. `tests/test_trello_adjuntos.py` (61).
  **PUBLICADO 15/10 10:19, `e2c3e5f`**. Con los datos reales: fecha entera en 42 de 88 tarjetas (antes 30). 50 Excel son el formato viejo, sin
  casillero de fecha de compra (solo «NRO DE FACTURA»): ahí no hay más que sacar.
  **Trello se deja de usar (dueño, 15/10)**: el workflow quedó SOLO A MANO (`df92a42`; la clave de Claude de GitHub vence). El CSV y el JSON
  quedan en el repo como foto final. «Reporte Semanal ATC» sigue prendido hasta que cierren el tablero.
  🧾 **El certificado de garantía** (dueño: *«en los certificados que subieron las fotos»*): la pregunta a Claude lo nombra (la FECHA de abajo
  = la de compra; `PREGUNTA_V`=2) y una foto leída antes sin fecha se relee UNA vez. Releídas las 17 (15/10): ninguna tenía fecha (15 fotos del
  colchón). El lector corre también al cambiar `trello_adjuntos.py`.
- **📥 Las ATC que están en Trello y no en el panel** (§4lf-c, 15/10, PUBLICADO `0169c1a`; dueño: *«deberían estar, si cuando creamos las ATC
  "exportamos" todas las del trello»*: NO estaban, 72 de 88). En «🔗 Completar con Trello», arriba: lista para revisar + **«📥 Traer al panel»**.
  · El viaje sale de **`atc-trello-historial.json`** (`herramientas/trello_historial.py`, API de Trello SIN Claude, corre al cambiar el script):
  día de creación de la tarjeta (= ENTRÓ la ATC, `ts`; ⚠️ NUNCA la fecha de compra) y la primera vez en cada lista.
  · Estado por la lista de hoy: devuelta → cerrada (`ent`=`pdev`= día que entró a DEVUELTAS, `rec`= a PRODUCCIÓN), lista (`dev`), en fábrica
  (`entregado`=✅ = recogida), solicitada/programada → por recoger. **Sin `fecha` de viaje**: no ocupan cupo, el portero no las mira (un alta
  con fecha pasada la frena `dia_cerrado`) y el bot no manda nada (`waAlGuardar_` sale sin fecha). Id `atc-tre-<tarjeta>`; N° = `nextOcMes`
  del mes en que entró. Compra = la de la tarjeta o sus adjuntos, si no es posterior a la ATC. `a.trh=1`.
  · No se ofrece la que ya está (mismo celular, 2+ palabras del nombre, el enlace o el id). Sin tildar: archivadas, POST VENT sin devolver,
  la misma en dos tarjetas, abiertas quietas > 60 días (`ATCT_QUIETA_DIAS`). `atctCruzar` reconoce la traída por su enlace.
  · Las 24 del panel SIN fecha de compra son de agosto-octubre y Trello casi no las tiene (en esos meses se crearon 9 tarjetas y entraron 45
  ATC al panel): esa fecha hay que pedirla. `tests/test_atc_trello.js` §6 (56).
  · **«📋 Copiar» de la pestaña ATC trae la «Fecha de compra» tercera, al lado de «Entró»** (§4lf-d, 15/10, PUBLICADO `d74791d`): como la
  columna que el dueño completaba a mano en su Excel. `test_rev2_atc` §4.
  · **El avance a la vista** (15/10, PUBLICADO `1eadf0a`; dueño: *«no sé si está cargando, guardando o qué»*): barra «Guardando en la planilla:
  N de M», botón «⏳ Guardando N de M…» y estado por renglón (`#atct-fe<i>`); se guardan DE A UNA (1-3 min para 70). No se ofrecen la tarjeta
  de ejemplo, fotos sueltas ni la plantilla (`atctNoEsAtc`); «Tildar las recomendadas» reemplaza a «Tildar todas» (tildaba la de ejemplo y
  las repetidas). Misma ATC = mismo cliente Y (≤ `ATCT_MISMA_DIAS`=10 o mismo producto: `atctMismaAtc`). **«🗂️ Ya traídas de Trello»**
  (`atctTraidas`) con «🗑 Sacar del panel» (`realDelete`, el borrado de siempre) y «Sacar las que no son ATC o están archivadas».

## 📇 Clientes para Excel (§4kz, 14/10, PUBLICADO `61dbaf8`; dueño: *«un botón para exportar Excel en administración… por mes, o todo, y elegir de qué vendedores (en plural): nombre del cliente, número de celular, valor de la compra»*)
- Administración → «🏭 Stock y ventas» → **«📇 Clientes (Excel)»** (`#cli-btn`, `abrirClientes`, ventana `#cli-overlay`). Un mes o Todo; vendedores
  con tildes (todos de entrada; la lista = `VENDEDORES` + los de las ventas, sin `CONTA_INTERNOS`); «Sumar sus compras» (un renglón por
  cliente, junta por los últimos 8 números del celular o, sin celular, por nombre) o «Repetir el contacto» (una fila por venta).
- Entran las VENTAS (`cliEntra`: sin filas del sistema, borradores, ATC, RPT ni internos; ventas de tienda sí). El mes = el de la venta
  (`contaFecha`). Valor = `ventaTotal(p)` (TOTAL VENTA de Contabilidad); sin montos, `prodTotal`. Columnas: CLIENTE, CELULAR (texto), VALOR
  (número, formato Bs) y después compras/fecha, vendedor y última compra/nota. Solo arma el archivo. `tests/test_clientes_excel.js` (23).

## 🏙️ El Patio de carga 3D (§4kn, 13/10; dueño: *«Me gusta, publica y vemos cómo queda»*)
La muestra de la ciudad (https://claude.ai/artifact/DvJvxjSQAQchD5g5h4LVxL, v13) pasada al panel con los datos de verdad. El que putea a todos se llama **EDUARDO** (antes «Garnícula»; dueño, 13/10: *«cambia el nombre de garnicula a EDUARDO»*; en el código sigue `gar`/`GARN`).
- Botón **«🏙️ Ver la ciudad»** (`#cv-ciudad`, y desde 13/10 también `#adm-ciudad-btn` arriba de Administración, al lado de «Ocultar camiones»: con la vista 3D `.cv-tit button` lo pintaba blanco sobre blanco y el dueño no lo encontraba) en los camiones de Administración → `patioAbrirCiudad()` baja **`patio.js?v=PATIO_V`** (archivo
  aparte: cambiarlo = subir `PATIO_V` y `node --check patio.js`). Pantalla completa `#pt-ov` (CSS con `#pt-ov` adelante, ids `pt-`).
- ⚠️ **Un solo lienzo**: dibuja con `DEP.w3` vía **`DEP.w3.alt={cuadro,tam}`** (el bucle de `depIniciar3D` le cede el cuadro); mientras
  está abierto `depIniciar3D(otra caja)` devuelve false. Al cerrar, `alt=null`, tono ACES 1.08 y `cargaVivaPintar()`. No crear otro renderer.
- **Datos = `cargaVivaDatos()`** (`patioDatos()` sin three.js): una línea = un pallet (🚚 tildada / 🅿️ PTF o Banzer / 📥 Moreno / ⛔ ✗).
  Escribe SOLO la tilde (`setCargaChk`, la de la Lista de carga) y «Ya salió» (`camionSalioMarcar`). Sin GPS: el recorrido en la calle es
  ESTIMADO y no marca ✅. La RPT va a su tienda (`TIENDAS` en patio.js, con los pines del dueño, norte arriba).
- **La ciudad** (13/10, decidida por el dueño con fotos, versión 31 de la muestra; PUBLICADA con `PATIO_V='20261013b'`; `20261013c` = el reclamo de David por lo que va tarde: `dia.tarde` a las 12:00 con entregas AM sin «Ya salió», a las 16:00 las PM, `jefeTarde`, la hora fuera de la firma con `diaFirma`): manzanas de dos filas de
  casas mirando a SU calle (techo a dos aguas con `PRISMA`, puerta, alero) + construcción del fondo; pasajes de calle a calle (`PASAJE`) y a veces
  uno a lo largo; 4 anillos INTEGRADOS a la cuadrícula alrededor de la plaza 24 de Septiembre (`ANILLOS` = calles hechas avenida, curvas solo en
  las esquinas: `AV_ARCOS`; el camellón se corta antes de la cebra; 1ro y 2do con árboles, 3ro y 4to solo faroles); catedral (`plazaPrincipal`);
  Equipetrol al oeste (`zonaAlta`) pegado al cinturón ecológico y el río Piraí con el PUENTE URUBÓ (sale del 4to anillo, `ZU`); Hipermaxi en la
  esquina del 4to anillo y el puente; restaurantes (`RESTO_EN`); cebras con gente cruzando (`CEBRAS`/`CRUZAN`); micros en el semáforo con los
  autos puteando (`COLAS`, `colasPaso`, con la hora del semáforo). ⚠️ `patio.js` se arma con `armar.py` (scratchpad) por rangos de líneas de
  `cuerpo.js`: si se agrega una línea, los rangos se corren (bitácora §4kn).
- **🔥 El Fidalga en llamas** (§4kq-b, 13/10, dueño: *«nomás por diversión»*): manzana `'385,385'`, al lado de la obra. Solo adorno.
  `fidalga()`/`fuegoPaso()` en `patio_real/fuego.js` (adelante de `p3_vivo.js`); ⚠️ `var FUEGO;` sin valor (corre después del armado).
  EDUARDO (el de la ciudad) dice *«¡Carajo, otra vez se está quemando un Fidalga!»* (dueño) en `s_npc.js`; el asistente del panel, no.
- **💁‍♀️ ISABEL** (§4lu, 21/10, dueño: *«que se llame Isabel y viva siguiendo y tratando a Ernesto»*; PUBLICADO 21/10 17:47, `a651e05`): vendedora de Mia Plaza, fucsia,
  pelo largo y celular (`persona` con `melena`/`cel`); `isaPaso` la lleva pegada atrás de Ernesto y cada 11-18 s lo PARA (como David: `ERNN.st='escucha'`)
  si está libre (`isaErnLibre`) y le reclama con SUS pedidos del día (`dia.isabel*`); él contesta. Solo adorno. ⚠️ `patio.js` se edita DIRECTO
  (los fuentes de `armar.py` ya no existen). `window.patioNpcAvanzar(seg)` = solo para las pruebas (sin placa de video la ciudad va a ~2 cuadros/s).
- **📦 «Por cargar» legible** (§4lv, 21/10, captura del dueño; PUBLICADO 21/10 18:24, `fa5d524`): en `tabEsp` cada grupo es un renglón a lo ancho (no tres columnas de 70 px), «🚚 En el camión» plegado, el cuerpo de abajo con tope de alto en pantalla ancha, y «▾ Achicar» esconde `#pt-tab-cuerpo` (la regla decía `#tab-cuerpo`).
- `tests/test_patio.js` (48 con `PATIO_THREE=<paquete three 0.128>`, que se baja con `npm pack three@0.128.0`). Bitácora §4kn, §4kq.

## 🛏️ «COLCHON» en la lista de productos y el código que se pone solo (§4mf, 25/10, PUBLICADO `6f3b393`)
La lista emergente busca y muestra los colchones con «COLCHON» adelante (`nombreVenta`, por `pryTipoProd`), y al elegir queda ese nombre con su
código. ⚠️ `CODIGOS[k].d` NO cambia (es la clave del stock). Escrito a mano, al salir del campo `prodCodigoAuto` pone el código con la identidad
del stock y lo dice («✓ Lo reconocí…»); no pisa uno escrito, no toca un renglón que ya traía el pedido (`data-orig`: el código es parte de
`prodClave`), nada en medida especial. `tests/test_colchon_nombre.js` (20).

## ✨ Mis pedidos arriba (§4mf, 25/10, PUBLICADO `de2c36b`)
Con un vendedor elegido: «📋 Para hacer» (`misHacerDatos`, con «✅ Al día») + «☀️ Tu día» (`misTopPintar`; 💵 efectivo desde el último retiro,
`misEfectivoDatos`) y la bandeja de Kommo en filas (`borrBandejaCompacta`). En Playwright apagado salvo `MIS_TOP_PRUEBA`. «Ver todos» y la
fábrica de Eduardo, igual. `tests/test_mis_arriba.js` (14).

## ✨ Contabilidad y Stock arriba, colores, cargando y vacíos, 4 pasos, cierre y comprobantes (§4mg, 25/10, PUBLICADO `128bc86`; servidor 25-a IMPLEMENTADO 26/10 por el dueño, contesta `2026-10-25-a`; `main` con el `.gs` y `SCRIPT_VERSION_ESPERADA` en 25-a desde `ad16340`)
V2 `cxTopPintar` (Para hacer + libro en Bs por marca; lee `CX_TOP_M`/`CX_TOP_MK`/`cxMarcasDatos`, no cuenta nada; `.cx-nuevo` esconde lo
viejo; clase `cx-libro`, nunca `.lb`). V3 `stkTopPintar` (4 fichas + «Más» en la barra de Stock; `.s3-on`). V5 `ahBotonCls` (rojo arreglar,
ámbar revisar, turquesa lo demás). V6 `esqCargando`/`esqMisHtml`/`esqContaHtml`. V7 `vacioPoner` (misma frase + dibujo). En Playwright
apagados salvo `CX_TOP_PRUEBA`, `STK_TOP_PRUEBA`, `MIS_TOP_PRUEBA`, `FP_PRUEBA`. V4 `fpArmar`/`fpPintar` (el formulario en 4 pasos: mueve los MISMOS
nodos, «Listo» = `fxPasosEstado`). C3 `nxCierreControl` (lista de control del cierre; rojo bloquea «Bajar», la contraseña lo abre). C2
`compsAbrir` (comprobantes del mes por banco con nombre de archivo y Excel con enlaces). 📁 La carpeta en Drive = **servidor `2026-10-25-a`**
(`compsCarpeta_`, sin candado, solo fotos de la carpeta del panel, no duplica, tope de tiempo con `pendientes`; IMPLEMENTADO 26/10, enlace fijo `d4495c2…`, 4.407 líneas):
la página solo la llama con `SERVER_VER` ≥ 25-a. ⚠️ Primero el dueño implementa el `.gs`, después se publica la página. Volver atrás:
✏️ a la versión anotada Y pegar la 15-a de `6a5559844026edc3594b9a1b8d3724c348d3bd53` (4.358 líneas).
Pruebas: `test_conta_arriba`, `test_stock_arriba`, `test_vacio_cargando`, `test_form_pasos`, `test_cierre_control`, `test_comprobantes_mes`.
🤖 **C4 + carpeta rápida = servidor `2026-10-26-a`** (§4mr; IMPLEMENTADO 26/10 por el dueño, PÁGINA PUBLICADA `037b86a`; volver atrás: ✏️ a la versión anotada Y pegar la 25-a de `d4495c2…`, 4.407 líneas): «🤖 Revisar las fotos con IA» en
Comprobantes (`iacAbrir`/`iacComparar`: monto, banco, día, N° repetido; el servidor `iaComprobantes_` lee cada foto UNA vez, hoja «IA
comprobantes», `leer:1` sin gastar) y la carpeta de a 20 por la API de Drive (`compsRapido_`). Las dos siguen con la ventana cerrada
(`IAC`/`COMPS_CORRE`, `modalMuestra`). Con un servidor anterior la página NO las llama. Con todo leído queda «🔄 Revisar de nuevo» (`iacBuscarNuevos`: relee la planilla, NO gasta; si entró una foto, aparece «Leer…» con su costo) y, con Contabilidad filtrada por una vendedora, «Solo los pagos de X · Ver todas las vendedoras» (`iacTodas`; §4mw, PUBLICADO `0564f1f`). `tests/test_ia_comprobantes.js`, `test_servidor` §26-27.
🔒 **Solo con la contraseña de Administración** (`iacPuede`, dueño: «si no los vendedores se gastarán mis tokens»; PUBLICADO `881b14a`). 📤 **Compartir con
las vendedoras** (PUBLICADO `fc1d028`): PDF por vendedora (`iacPdf`), texto para el grupo (`iacTextoGrupo`) y aviso en el panel (fila **`__avisos_conta__`**,
`ctaAv*`; Mis pedidos → Para hacer + Bloki, «✓ Ya lo corregí»). «La foto dice menos/más» sin acusar; 🧾 la nota de venta con el servidor **26-b** (IMPLEMENTADO
26/10 por el dueño; `main` con el `.gs` y ESPERADA 26-b desde `d8550a1`; volver atrás: ✏️ a la versión anotada Y pegar la 26-a de `f6272ef…`, 4.698 líneas). 📅 **La fecha (regla del dueño)**: el primer pago = el día en que se cargó la venta (`x.ant`/`x.fCarga`), los demás = el día
en que se registraron; si no coincide, se dice SIN preguntas (§4mt). 💵 «Guardar pide el saldo» (`997f2d6`): el dueño dijo NO publicarlo.
📁 **Comprobantes con el estilo nuevo y el Excel con enlaces** (§4mu, PUBLICADO 26/10, `cfc901b`): «Ver foto» es un hyperlink de verdad
(`link` en la celda → `sheetLinks`, `XS_LINK`=28 al final de `STYLES_XML`, `textoOk` = sin triangulitos); la ventana: total + anillo, acciones en
tarjetas, bancos que filtran (`COMPS_VER`), buscador, miniaturas. ⚠️ Las pruebas leen `.cps-r`, el cliente en el PRIMER `<b>` de cada fila y `.cps-ok`.
🎬 **Videos para los nuevos** (§4mv, 26/10; PUBLICADOS `735c9f5`): cargar un pedido, cobrar el saldo pendiente y registrar una venta de tienda, en
`videos/`, 1920×1080. 🖥️ **Los vendedores trabajan en la COMPUTADORA: video o material para ellos = formato compu (16:9), NUNCA de celular** (el
dueño lo reclamó fuerte). Los enseña **Bloki** (`VIDEOS {pedido,pago,tienda}` + `verVideo(k)`; `vid:'…'` en la ayuda, 22 respuestas / 18 para un
vendedor; la oferta de una vez por aparato es solo la del pedido, `me_asis_video`, antes que el recorrido). Se rehacen con `herramientas/video_pedido/`
(`grabar.js … [pedido|pago|tienda]`, datos inventados, nada sale a la red) y se sube el `?v=` de `VIDEOS`. ⚠️ La foto del recibo es obligatoria
también en efectivo, y el cliente recibe la confirmación del bot. ⚠️ Publicar con `format-patch` de los commits del cambio, nunca un diff contra `main`.
🔧 **Arreglado en §4mj (PUBLICADO `cd0c73d`, auditoría Codex/Astra)**: ⚠️ `fpVisible` mide con el paso DESTAPADO y `fpPintar` no hace nada con el
formulario en otra pestaña (medir escondido daba alto 0 y escondía los cuatro pasos para siempre); `fxPasosEstado` pide lo MISMO que `submitPedido`
(si Guardar pide algo nuevo, va también ahí); `.s3{min-width:0}`; en un Excel, `s` es SIEMPRE un índice de `cellXfs` (`cellXml` ignora otra cosa) y la
plata va `{v, t:'n', s:2}`. `tests/test_regresiones_128.js`.
🎨 **Cuatro arreglos visuales (§4mn, PUBLICADO 25/10, `f3db549`)**: la venta de tienda usa el ancho (`#view-form.active.venta-tienda`, selector ≥160 px); los tres
montos de arriba de Contabilidad van enteros (`lbMontoEntero`, sin «…»); los botones naranjas `.ah-go-a` con letra oscura `#2b1700`; las etiquetas
de la ficha de Administración a `.72rem` (en ≤420 px `clamp`, sin `min-width:0` en los botones). `tests/test_visual_4mn.js`.
🎨 **Lo que se veía mal en compu e iPad (§4mo, 25/10, PUBLICADO `0b87635`; capturas propias con la planilla real)**: el encabezado se achica al bajar
(`hdrScroll`/`hdrMedir`, `body.hdr-chico`; el alto escondido pasa a margen y ⚠️ se le suma el margen de arriba de lo que sigue, si no la página
salta 20 px). **`--hdr-h`** = lo que tapa el encabezado: todo lo pegajoso nuevo va con `top:calc(var(--hdr-h) + …)`, nunca con el alto medido a
mano; para llevar algo a la vista, `hdrAltoEn(dest)`. Administración en fichas: de un día pasado se ve SOLO lo sin ✅ y lo entregado va plegado
en `.af-pas` («▾ Ver todo», `ADM_PASADOS_VER`; buscando no se pliega). Ventas de Contabilidad con productos a la vista; campos de `.filters` a
44 px; «Herramientas» `.as-pes`; anillo PM con fondo en Halloween; «0 de 4 listos» se va si no entra (`@container`). `tests/test_estetica_4mo.js`.
🎨 **Segunda vuelta (§4mp, 25/10, PUBLICADO 26/10, `05852cd`)**: celular sin el margen doble (`.wrap` 8 px, `.card` 16/12); iPad parado con las seis pestañas en una
fila y el número de cada pestaña en la esquina (≥701); el **Plan de stock parte renglones y entra entero** (antes 1.929 px en 1.386: las columnas
«Pedir» quedaban afuera) — ⚠️ sus anchos mínimos solo con `min-width:821px` (debajo es en tarjetas); «De dónde sale lo vendido» con las dos
tablas alineadas (`table-layout:fixed`); la ficha con los botones de cada producto en la misma columna (`.fl-pls` 96 px). `tests/test_estetica_4mp.js`.

## 🔎 Lo que quedaba del informe de Codex/Astra del 25/10 (§4mk, PUBLICADO 25/10, `fd0d889`)
El dueño: Grupo 1 *«Sí, todo»*, el efectivo *«igual que el Cuadre del mes»*, el almacén vacío *«saltarlo con un aviso»*, Comprobantes con «N° de pago».
- **Precios**: `mismoContenido` compara el renglón ENTERO (`prodHuellaComparar`): un reintento viejo ya no pisa una corrección de precios.
- **«💵 Efectivo en tu mano»** = recibido en efectivo en el MES − retirado en el mes (`cuadrePagos(pe, vend)`, `retirosDe(pe, vend)`).
- **Durables**: `guardarUbicacion`, `setEstado`, `setProdProduccion`, `setProdChk`, `toggleVerificado` → `guardarDurable`. La tilde de carga entra a la
  cola al tocarla (`REESCRITA_ESPERA` la frena en `flushPending` durante los 700 ms). Lo forzado que queda en la cola sale forzado (`me_forzar_cola`,
  por el texto exacto de esa copia). ⚠️ Un botón NUEVO que guarde un pedido va con `guardarDurable`.
- **Comprobantes**: «N° DE PAGO» y «FOTO» al final; el MONTO solo en la primera fila de cada pago. No mover las columnas de antes.
- **Recogidas de Moreno**: `g.rs[rid]={k, u:lo restado de verdad, q, c:lo de la recepción, ts}` y `stockRecogidasRepartir(S)` recuenta en orden de
  `ts`. ⚠️ No volver a restar con `max(0,…)` a secas: anular devolvía lo que no se había restado.
- **Existencias**: un bloque vacío del archivo de los tres se salta (`saltados`); dos códigos desconocidos con el mismo nombre crudo son dos
  productos (`colisiones`: la clave la conserva el que la tenía en el corte anterior).
- **Proyección**: un mes en 0 cuenta (`pryCurva`; un mes SIN ninguna venta del equipo va a `sinDatos`) y la 🧪 prueba usa solo los meses ANTERIORES
  (`pryPrueba`: `m<ym`). Con la planilla real cambió octubre: Sueña pasó de la curva al ritmo (equipo 1.077.486 → 1.067.634).
- **🗓️ `diaNegocio()`** = la fecha de Bolivia para la plata y la proyección (Contabilidad, Cuadre, retiros, «Tu día», Proyección). ⚠️ `todayStr()`
  sigue siendo el reloj de quien mira para todo lo demás (§4fu): no reemplazarlo en bloque.
- **⌨️ Teclado**: una ficha con `role="button"` sin `onkeydown` se abre con Enter/Espacio (handler global). `openModal` lleva el foco a la ventana
  (no a un campo), Tab da la vuelta adentro y `closeModal` lo devuelve (`MODAL_FOCO_ANTES`). `formEtiquetar` une cada campo del formulario con su
  etiqueta (también los renglones de `addProdRow`): un campo nuevo del formulario va con su `<label for>`. 320 px: `.af-cg` con `min(285px,100%)` y
  `#fx-busca` acotada a la pantalla.
- Dashboard de ventas (CRM-02/05/06/07/08): días en hora de Bolivia, `<=` el último segundo, sin «Fecha contrato» no publica, meta 0 = 0. ⚠️ Publicarlo
  dispara el workflow del panel.
- Pruebas: `test_flw1_precios`, `test_efectivo_tu_dia`, `test_marcas_durables`, `test_form_foco`, `test_comprobantes_pagos`, `test_recogidas_moreno`,
  `test_existencias_bordes`, `test_mixto_mover`, `test_proyeccion_auditoria`, `test_teclado_320` (+ `test_generar_integridad`, `test_panel_meta`).
- **§4ml (PUBLICADO 25/10, `003a095`)**: «Quién vendió qué» sin los pedidos internos; el centavo del flete; **`saldoACobrar(p)`** (0 para ATC/RPT) en chofer, Entregas,
  Envío, Hoja de ruta y Reporte —⚠️ un total nuevo de «por cobrar» del camión usa esa función—; la barra de pasos con cantidades válidas; deudas
  «sin fecha»/«fecha futura» (`deudaEdad`); «De dónde sale lo vendido» con centavos; la mediana de `precioTipico`. `tests/test_codex_f1b5.js`.
- **🪙 §4mm (PUBLICADO 25/10, `003a095`) el centavo cuenta**: toda comparación de plata va contra **0.005**, nunca 0.01 (los montos ya vienen en centavos, `r2`).
  ⚠️ Una comparación de plata NUEVA, igual. `tests/test_centavo_exacto.js`.

## 🗂️ La ficha de Administración para logística (§4lz, 23/10, PUBLICADA `d96cd4d`; el dueño eligió la «B»)
`showPedidoModal`: ancha (`fl-ficha`), arriba N° del día, cliente, 📥 Ingresó, 🚚 Entrega, camión; observaciones en amarillo grande; tres
columnas (dónde entregar / qué se carga y de dónde + Estado de stock con sus tres botones A LA VISTA / camión y entrega); venta, cobro y
facturación en «Más datos» (`<details>`). Las marcas de cada producto en «Cambiar de dónde sale…». **Prender «Listo para cargar» con
observaciones pregunta «¿Las leíste?»** (`obsAntesDeListo`: ficha y 📦 de la tabla; directo en Playwright salvo `OBS_PRUEBA`). ⚠️ No
volver a poner la plata a la vista ni a esconder los botones de stock (dueño). `tests/test_ficha_logistica.js` (14).
**Segunda vuelta (§4ma, 24/10, PUBLICADA `3165b85`)**: etiquetas de las observaciones (`fichaObsChips`), «lo retira el cliente» (`fichaRetira`: por la
dirección; «recoger el colchón viejo» NO), avisos (`fichaAvisos`), camión sugerido (= `nxSugDatos`), ◀ ▶ del día (`fichaVecinos`), HOY/MAÑANA
(`fichaDias`), la suma de precios en «Más datos» (`prodResumen(p,true)`). «Sin camión» con «🙈 Ocultar» (`me_sug_oculto`) y reparto por GRUPOS de
zona, parejo entre todos los que trabajan, zona por el mapa y mapita. ⚠️ El dueño quiere ideas de la FICHA, no de camiones. `test_ficha_mejoras`, `test_sug_reparto`.
**Compacta, una pantalla de PC (§4mb, 24/10, PUBLICADA `08c5073`)**: la nota leída (`fichaNota`: recibe, horario, cobrar, lo que no se lleva) y lo que no
coincide (`fichaContras`, ⛔) en «Antes de cargar» con etiquetas para tildar (`me_ficha_tilde`) y la nota plegada; «MODIFICADO… DESPUÉS de que lo viste»
(`me_ficha_vista`) y cambios por renglón; «🧭 Qué hacer» en una línea; los botones de dónde sale A LA VISTA en cada producto (`prodBtnsHtml(…,true)`:
«✔ PTF»); lo de tienda SOLO en la línea de los bultos; Dónde + Camión a la derecha; la tira del stock abajo (sin «Qué quiere decir cada botón»).
⚠️ No volver a esconder los botones de los productos ni a repetir lo de tienda. `tests/test_ficha_nota.js`.
**🕐 + ✨ (§4mc, 24/10, PUBLICADA `1816a4a`)**: la etiqueta de la hora sale de `fichaNota` (UNA lectura: «de 11 a 12», «a las 12:00», «después del medio día»…);
cada producto dice «Stock para este pedido: …» con «💡 Marcar…» y «✨ Marcar los N como dice el stock» (`stockAsignar` + `revStkMarcarLinea`, la misma
de «Aplicar»; lo marcado a mano no se toca); `fichaAcomodar` pone Dónde y Camión lado a lado en un pedido corto; la nota sin nada para tildar va
en una línea. `tests/test_ficha_auto.js`.

## 🃏 Administración en fichas + 🤖 pestaña Bot (§4md, 24/10, PUBLICADA `3b4327b` + `6992638`; dueño: *«la tabla es la vista resumen… abrir la ficha para editar»*)
- `admVista()` = 'fichas' (por compu, `me_adm_vista`); **en Playwright sigue la TABLA salvo `window.ADM_FICHAS_PRUEBA`** (las pruebas de siempre la leen).
  `admFichasPintar`/`admFichaHtml`: por día y turno; N° del día con fondo; 🌅/🌆 a la DERECHA de «OC · vendedora»; botones Entregó · WhatsApp ·
  Editar · Reprog. · A tarde/A mañana (`admTurnoPuede`/`admTurnoCambiar` → `cambiarTurno`) · Borrar; 📍 abre el mapa; **sin «Cobrar»** (ni el saldo ni la etiqueta 💵 de la nota).
- **Arriba a la derecha solo lo que los productos no dicen** (Entregado, Modificado/Cambió la fecha, Salió, ✅ Listo). ⚠️ No repetir el stock ahí.
- **Color de la ficha (`admFichaColor`)**: 🟢 listo · 🔴 le falta algo (sin stock/sin revisar/producción/ir a buscar) · 🩷 ATC · 🟤 RPT café. Nada
  más (sin amarillo, violeta, naranja de ficha entera). 50×70 y medida especial se marcan en la medida del producto.
- 🛍️ **Lo de tienda (`esProdDeTienda`) no cuenta ni se muestra en la ficha rápida ni en «Lo del día, por lugar»**, aunque lo marquen «recoger de
  tienda» (dueño: lo entregan en la tienda). Un colchón con «🏬 Tienda X» sí (rojo).
- **Pestaña «🤖 Bot»** (`#tab-bot`/`#view-bot`, `botVe()`, `botTabPintar`): las respuestas al bot salieron de Administración. Solo con la clave de
  ESA visita o eligiendo Logística, Administración o Eduardo (`f555b4a`); ⚠️ NO con `me_adm_dev` (queda para siempre). `test_saldo_almacen`
  cuenta `tab-bot` entre las pestañas. `tests/test_adm_fichas.js` (13), `tests/test_bot_tab.js` (9). Bitácora §4md.

## 🗓️ El botón «Semana» de Administración: el stock de los productos de los próximos 5 días hábiles (§4my, 27/10, PUBLICADO `dce5fcc`)
Dueño: *«¿por qué decís camión? Lo que nos interesa es ver a futuro si se pidió o llegó el producto… recordarle a logística: tenés este pedido
el jueves y aún no marcás el stock… producción tarda hasta 4 días»*. ⚠️ Nada de camiones, carga ni cupos en este botón.
Chip `semana` (`todo:true`). Días = `semanaDias()`: HOY y los hábiles siguientes hasta 5 (`diaHabil`). Cada PRODUCTO (`semanaLinea`): ⬜ `rev` ·
🔴 `nohay` (✗ sin pedir) · 🏭 `prod` · ⚠️ `tarde` (`semanaLlega` = `saldoSaleDeFabrica(prodF)`: se entrega desde después de la fecha o ya
debía haber salido) · ✔ `listo` (hay, Banzer, llegó, Moreno/tienda). Sin tienda, ATC ni entregados. Parpadea (`qchip-alerta`, «🔴 N por revisar»)
con ⬜/🔴; al tocarlo arranca en «Lo que falta» (`semanaArrancar`), `#adm-semana` (`semanaPintar`) con la lista de productos por día, el filtro
«🔥 Pedir hoy» (`urge`) y «🤖 Revisión automática». «Para hacer»: `semana` (rojo) y `semana-t` (ámbar). Solo mira. `tests/test_semana.js` (41).
⚠️ **Los plazos son los del cuadrito, nunca «4 días»** (dueño, 27/10: *«los plazos que ya tenemos definidos»*): `semanaPlazos()` = `diaArranque()`
→ `saldoSaleDeFabrica` → se entrega desde `sigDiaHabil` (E1; pedido en la próxima ocasión, E2). `SEMANA_PROD_DIAS` ya no existe.
📣 **Bloki le grita a Ernesto** (§4mz, PUBLICADO `d41ae21`): media hora antes del corte (16:00; sábado 11:30), SOLO en aparatos `asisVeAdm()`,
`anuncioGrito` con `semana:1` y lo ⬜/🔴 que se entrega antes de E2 (`semanaUrgentes`); cada 15 min mientras falte (`me_sem_grito`); abrir el panel
tarde grita en el primer tic. El anuncio va primero (`anuncioTic` = `anuncioTicAnuncio` + `semanaGritoTic`). Con el panel cerrado no grita nada.
`tests/test_semana_grito.js` (27).

## 🏬🎯🎄📲 Tiendas, metas, Navidad, Bloki por pestaña, «pedir hoy» y la seguridad del automático (§4na-§4ne, 27/10, PUBLICADO `2aa4fde`; servidor `2026-10-27-a` IMPLEMENTADO 27/10 ~10:40 por el dueño)
- **🏬 Stock de cada tienda** (§4na): Stock → «🏬 Stock de las tiendas» (`abrirTst`). Fila **`__tiendas_stock__`** (`TST_ID`, en `esFilaSistema`).
  Se cuenta el **último día hábil del mes** (`tstUltimoHabilMes`) con el Excel del sistema («EXISTENCIAS ALMACEN» del almacén de la tienda) o a
  mano; `tstCalcular` = contado + RPT que salieron − ventas de tienda − «🏬 Tienda» que salió ± pases (todo DESPUÉS del conteo); «🏬 Tienda» sin
  salir = apartado. Un almacén con otro nombre se elige en la vista previa y queda en `al` (`tstAlias`). Bloki avisa a logística el último día
  hábil desde las 15 y los 3 primeros días hábiles si falta el de cierre (`tstAviso`). ⚠️ SOLO MIRA: nada del stock de fábrica la lee. Sin
  `esProdDeTienda` (dueño: «otra cosa», sin decir qué; preguntarle). `tests/test_tiendas_stock.js` (47).
- **🎯 Metas por marca y mes** (§4nb): Proyección → «🎯 Metas» (con la contraseña). Fila **`__metas__`** (`META_ID`). Lo vendido = `pryVentas`
  (la proyección da igual con o sin metas). `tests/test_metas.js` (24).
- **🎄 Navidad** (§4nc): `tema-navidad` en diciembre (Bolivia), pedidos.html + panel_template.html; Bloki con gorro (`temaNavidad()`). También
  en el dashboard de **Sueña** (repo `MULTIESPUMAS-VISCARRA`, `5013a40`, su `tests/test_navidad.js`). `tests/test_navidad.js` (20).
- **🧽 Bloki** sigue la pestaña (desde §4ni, para TODOS, no solo con «Administración»): pedido y Mis pedidos → vendedor, Contabilidad → conta, Administración → logística (casco).
- **📲 «Pedir hoy» por WhatsApp** (`.gs` 27-a): media hora antes del corte (16:00; sábado 11:30), a la propiedad **`WA_PEDIR_HOY`** (Ernesto y
  Alba), plantilla **`logistica_pedir_hoy`** (5 datos). La regla es `semanaUrgentes` pasada al `.gs` (`waPh*`); ⚠️ si cambia `semanaLinea`,
  `semanaEntra`, `esProdDeTienda`, los `PROD_*` o los plazos, cambia el `.gs` también: **`tests/test_wa_pedir_hoy.js` (64) compara los dos**.
  Volver atrás del servidor: ✏️ a la versión anotada Y pegar la 26-b de `d41ae21b7198a0b4014e144d07ab8f38f706574f` (4.714 líneas).
- **🏭 «En producción» automático sigue APAGADO**, con la Prioridad 0 lista: para prenderlo, `STOCK_AUTO_ACTIVO=true` y
  `STOCK_AUTO_DESDE='<ese día>'` (al lado de `STOCK_PV`, que pasa solo a 4); el `.gs` 27-a ya no deja que un formato de stock más viejo pise uno
  más nuevo (`stockPvGuardado_`). Poda solo por fecha, «Ya pedí» en `STOCK.ap` (un solo reparto), lo del camión que nadie vio salir no es
  producción (`existLoteSinCamion`). Lo decide el dueño con logística. `tests/test_auto_p0.js` (26).
- 🔑 **Token de Kommo renovado el 27/10** (el viejo vencía el 28/10): generado en la integración privada «Panel de pedidos» y pegado en el
  secreto `KOMMO_TOKEN` de GitHub y en la propiedad `KOMMO_TOKEN` del Apps Script. Cloudflare no se tocó (no usan las tareas de Seguimiento).

## ✨ Arriba de Administración: «Para hacer» + «Hoy» + fichas grandes (§4me, 24/10, PUBLICADA `07d522a`; dueño: *«parece noticiero de alertas… un mix de la B con la C»*)
- `#adm-hacer` ordena los avisos de siempre (rojo → ámbar → info, tres a la vista) con los números que cada cartel deja en **`ADM_AV`** al dibujarse;
  ⚠️ nada se cuenta aparte. Los carteles enteros siguen con sus ids en `#adm-avisos` («📄 Avisos completos»). Un cartel nuevo de Administración
  deja sus números en `ADM_AV` y entra en `admHacerDatos`.
- `#adm-hoy` (`admHoyDatos`: `cargaVivaDatos` de hoy, `camionSalio`, cupos): botones **📦 Pedidos · 🚚 Camiones y día** (cambian lo de abajo) **· 🏙️ Ciudad**.
- Fichas grandes `#adm-secs`: **📦 Stock y reposición** (abre; avisa si falta el Excel de hoy) · **📥 Importar ROHO** (abre) · **🧰 Herramientas** (vista).
  Vistas `.adm-sec[data-sec=ped|cam|her]`, por aparato `me_adm_sec`; `admRevelar` abre la vista de lo que Bloki señala. Herramientas = los mismos botones.
- Barra de filtros única (mes con ‹ ›, «🃏 Fichas | ☰ Tabla»); cada día y turno dice listos y cupos (sin la barrita verde).
- Se sale de Herramientas y de Camiones y día con «← Volver a los pedidos» o tocando la ficha de Herramientas otra vez (`20a686a`).
- ⚠️ En Playwright todo junto como antes salvo `window.ADM_TABS_PRUEBA`. `tests/test_adm_arriba.js` (25). Bitácora §4me.

## 🚛 Los camiones en Administración (§4hz, 08/10, PUBLICADA 12:36, `2a7c7bd`): lo que hay que respetar
El dueño, con la imagen que le hizo ChatGPT: *«que solo se vea en administración, no en la pestaña lista de carga, reemplazá
lo de Codex»*. La escena 3D de Codex (`7941fec`) se sacó entera, con sus archivos y su prueba.
- `#carga-viva` va arriba del 📅 calendario (`#adm-cal`, debajo de los camiones: dueño, 09/10) con su botón «🙈 Ocultar camiones» (`toggleCamionesAdm`, `LS_CAMIONES`, por
  compu; escondidos no se dibujan). Se pinta en `renderAdmin` y en `renderCargaSiActiva`. **🧹 El resumen de Administración YA NO
  EXISTE** (§4io, 09/10, dueño: *«al tenerlo ya en 3D y los focos de calor… eso ya no es útil para logística, quítalo»*): fichas,
  línea de cobros, consolidados, camión, rendición, «Ocupación de cupos» y «Concentración por zona», con su «Ocultar resumen». No
  volver a ponerlo. El feriado lo dice el calendario (`admCalFeriado`).
- **Las líneas de color van en el PISO** (§4ib, dueño: *«esas líneas quedaron encima del camión, no abajo… se ve raro»*): `huella` es
  el rectángulo del piso y `cuerpo` la silueta de cada camión, que se vuelve a dibujar ENCIMA (`img.cv-cuerpo` con `clip-path`
  sobre la misma imagen); las luces (`cv-faros-*`) van en un segundo `svg` arriba de todo.
- La imagen `carga-viva/escena.jpg` es FIJA y lo vivo va en coordenadas de la imagen (`CV_POS`, 1212×800). ⚠️ Los carteles tapan
  los textos que la imagen trae pintados: si se cambia la imagen, hay que volver a ubicarlos.
- **Los tildes son LOS MISMOS de la Lista de carga** (`cargaChkKey`/`setCargaChk`), y la agrupación por camión es UNA:
  `cargaAgrupar`, que usan la lista y `cargaVivaDatos`. No duplicar la cuenta.
- Tiene su propio Hoy/Mañana (`CV_DIA`). La Lista de carga NO lleva la tira, por pedido del dueño.
- **Tocar un cartel o un camión de la imagen cambia el panel de la derecha, nunca abre otra pantalla** (§4ic, 08/10, dueño: *«si le
  doy al camión de Banzer abre otra cosa, no el lateral, como el PTF»*): `CV_VISTA` = `''` (el camión elegido) / `'bz'` (lo que se
  carga en Banzer ese día, por camión, con los MISMOS tildes) / `'im'` (lo marcado «📥 recoger», por camión; sin tildes: se cambia
  en el pedido). `cvVer(v)`; «← Volver al camión»; los recortes `img.cv-cuerpo` se tocan dentro de su silueta. La Lista de carga
  se abre solo con «📋 Ver…» y «📦 Ver su carga».
- **Un camión sin pedidos dice por qué** (§4id: ningún pedido del día lo tiene asignado, cuántos esperan, botón a «Sin vehículo»),
  y **en «Sin vehículo» se asigna el camión ahí mismo** (§4ie, `cvAsignar` = `setVehiculo` sin reabrir fichas: vehículo + primer
  chofer). `c.stops` de `cargaVivaDatos` = los pedidos de cada camión.
- `tests/test_camiones_admin.js` (27). ⚠️ En una prueba de tildes, el doble de `apiList` tiene que devolver las filas del sistema.
- **🌅🌆 Mañana y tarde por separado** (§4la, 14/10, PUBLICADO `2bd1bf3`; dueño: *«¿solo muestra los AM?… sí, hazlo, separa mañana y tarde»*): `cargaChkKey(fecha,
  veh, prod, lugar, turno)` — lo de la TARDE lleva `|~PM` al final; la mañana y lo sin turno siguen con la clave de SIEMPRE (lo ya tildado
  no se pierde). `cargaVivaDatos` arma las líneas por turno (`l.t`), las fichas (`cv3dColsPintar`) ponen «🌅 Mañana»/«🌆 Tarde» con lo
  cargado de cada uno, y la Lista de carga separa con `cargaSeccionesHtml(o, fecha, k, t)` (cartel `.carga-turno` solo si hay tarde: un
  camión solo de la mañana se ve como siempre). `depCargado`, `cv3dPedidos` y `textoCargaChk` usan el turno del pedido (`normTurno`).
  ⚠️ Todo lo que lea un tilde de carga de un producto tiene que pasar el turno. `tests/test_carga_turnos.js` (16).
- **🚛 En 3D, por camión (§4jq, 10/10, PUBLICADA 16:21, `e497b11`; dueño: *«publica y veamos»*)**: con `CV_3D` (prendido salvo `me_cv3d`=0; APAGADO en Playwright)
  la imagen se reemplaza por la escena 3D (`cv3dConstruir`: camión en su andén con lo cargado, un montacargas por producto que falta,
  Sin vehículo, Banzer, Moreno) y el panel oscuro por **una ficha clara por camión** abajo (`cv3dColsPintar`, `#cv-cols`) con los
  MISMOS tildes. El dueño NO quiere el panel lateral ni el diseño oscuro con el 3D. ⚠️ Un solo dibujante three.js para esta escena y
  la fábrica de Eduardo: `depIniciar3D(box)` muda el lienzo (`depMudar`); no crear otro `WebGLRenderer`. `tests/test_camiones_3d.js`.
  **Montacargas = «Lo del día, por lugar» (§4jy, PUBLICADA 11/10 23:06, `91fa2fe`)**: un montacargas por producto por cargar (Banzer incluido), color de su columna (`cv3dLug`/`CV_LUGCOL`), fila hasta 24 y «⏳ ESPERAN» se toca (`cv3dEsperan`). `test_camiones_3d` §5c.
  **Sin camión espera en su lugar (12/10)**: lo de Banzer de los pedidos sin camión espera delante de Banzer y lo de Moreno delante de Moreno (`cv3dSinParte`, `cv3dEsperan(k, desde, lugar)`); en el andén «Sin camión» quedan PTF y lo que falta. Un camión asignado no cambia.
  **Tocar (§4jv, PUBLICADA 11/10 20:06, `258e672`)**: `depHitDe` hace ganar lo tocado sobre la caja invisible del andén (`dep.zona`); camión → `cv3dCamPanel`, Banzer/Moreno → `cv3dLugarPanel`, montacargas → `cv3dPedidos`: la ventana de Mis pedidos (`depPanel`).

## ✨ Las escenas del formulario de pedidos (§4if, 08/10, dueño: *«todas… quiero escenas wow»*; PUBLICADA 08/10 16:35, `19a2ec0`)
Lo demás del formulario queda igual: esto SOLO MIRA (no cambia cupos, fechas, saldo ni el guardado).
- `#fx-dias` (debajo de la fecha, 7 días con lo libre; tocar = `change` de `f-fecha`), `#fx-camion` (debajo del turno, lugares del
  turno con el «tuyo»), el dibujo del cuadrito (`fxEscenaSaldo` en `saldoCajaPintar`), `#fx-mes` (lo vendido en el mes por la
  vendedora, contra el mes pasado) y `fxGuardado(rec)` (la escena al guardar un pedido NUEVO, encima de la ventana de WhatsApp).
- Todo se repinta desde `renderCupoForm` (= `renderCupoFormBase` + `fxFormPintar`). Un cambio a los cupos se ve solo.
- ⚠️ En Playwright (`navigator.webdriver`) la escena de guardar NO sale salvo `window.FX_PRUEBA`: si no, tapa la ventana de
  WhatsApp de todas las pruebas. ⚠️ Animaciones: un solo `requestAnimationFrame` para muchos elementos (con 90 se trababa la
  página) y nada de `blur` animado a pantalla completa. `carga-viva/camion-recorte.png` = `camion.png` sin fondo.
- **🖥️ Pantalla ancha (§4ig, PUBLICADA 08/10 17:03, `cdc1fab`; desde 1120 px por §4ij, PUBLICADA 08/10 19:57, `63f9d68`: el iPad acostado mide 1180 y con 1300 no los veía; entre 1120 y 1299 los costados van fijos, 236 y 262 px)**: `#fx-izq` (agenda de 7 días por turno + el camión) y
  `#fx-der` (el pedido en vivo: productos con su estado, suma, «Para guardar», hoy y el mes) a los costados, `sticky`. «Para
  guardar» es solo una ayuda: las validaciones siguen en `submitPedido`. Más angosto no cambia nada.
- `tests/test_escenas_form.js` (23).
- **🧰 Más ayudas (§4ih, PUBLICADA 08/10 17:56, `e533511`)**: ¿pedido repetido? (`#fx-dup`, pregunta al guardar; **para Eduardo SOLO la nota de venta repetida**, en toda la planilla, `fxDupNotaBuscar`, §4ja, PUBLICADA 09/10 18:33 — dueño: *«Eduardo repite clientes… Eduardo únicamente»*), 🚫 la plata que escribe sola el AUTOCOMPLETAR del navegador se borra con aviso (`formPlataAutollenada`, `:autofill`, §4jb: el «recargo 1023» que el dueño no puso), buscar el producto por nombre con el
  saldo (`#fx-busca`, reemplaza el `datalist` de `.prod-desc`), el mapita de la ubicación (`#fx-mapa`) y los pasos en el celular
  (`#fx-pasos`, hasta 1119 px desde §4ij: también el iPad parado). `tests/test_ayudas_form.js` (22).

## ✨ Seis vistas que solo miran (§4ik, 09/10; dueño: *«todo menos lo de Kommo y Contabilidad y cupos»*; PUBLICADA 09/10 00:57, `044f661`)
🏬 galpones 3D arriba de Stock (`stockGalponesHtml`; el cartel separa «🚨 pedir ya» de «🏭 esta semana», §4is; 🌡️ el termómetro de líneas se SACÓ en §4iq: *«esto no se entiende»*, y volvió en barras como la muestra 2 en §4it, PUBLICADA 09/10 09:28, `71111be`: `stockTermoHtml`, `o.corte` de `stockProyectar` + `stockTermoLlega`), 📊 gráfico en «Qué producir» (`producirGraficoSvg`), 🛣️
recorrido en el Mapa de entregas (`mapaRutaPintar`, Hoy/Mañana), 🔥 semanas en Banzer o PTF (`almSemanas`) y ⭕ anillos en Mis
pedidos (`misAnilloHtml`). Cada una sale de la cuenta que ya existe: ⚠️ el termómetro usa `stockProyectar(o, serie)` (segundo
argumento opcional), NO una copia de la cuenta. Ninguna guarda nada. **📍 §4iq**: la tabla de Administración y la ficha muestran de
dónde se carga cada producto (`prodLugarTag`: 🏭 PTF · 🏪 Banzer · 📥 Moreno), con la misma marca de la Lista de carga. **📍 §4ir** (dueño: *«a,E»*): columna «Sale de» pegada al N° (`pedidoLugaresHtml`; corre las columnas un lugar) y «📍 Lo del día, por lugar» arriba de la tabla (`admLugaresPintar`, Hoy/próximo día, los pedidos de `cierreEntEntra`); todo de `prodPartes`. `test_fichas_4ip` §7. `tests/test_visuales.js` (34). Bitácora §4ik.
**📈 Barrios que crecen** (§4il, 09/10, PUBLICADA 01:20, `a9bc37a`): en Banzer o PTF, por zona escrita, los últimos 30 días contra los 30 de antes
(`almTendencias` sobre `almZonaData().ents`, la MISMA ventana de la pantalla) + flechas en el mapa con «Todas». Cuenta entregas,
no unidades. `test_visuales` §5b.

## 🚛 Seis vistas más (§4im, 09/10, PUBLICADA 02:04, `d94ca49`, con §4io: fuera el resumen de Administración; dueño: *«todo menos a,c,d, me gusta la B»*)
🚛 camión cargándose en la Lista de carga (`cargaCamionSvg`, cuenta los tildes de siempre con su `data-u`), 🏆 ranking por semana en
Stock (`stockRankingDatos`, reglas de la rotación), 📅 calendario de entregas en Administración (`admCalHtml`), 🔔 avisos de lo que
pasó a urgente desde la última vez (`stockAvisosNuevos`, `me_vis_avisos`), 🌅 salud del día SOLO con la clave (`saludDelDia`, una vez
por mañana) y 🛤️ el viaje del pedido en Mis pedidos (`pedidoViajeHtml`). Solo miran. `tests/test_vistas_4im.js` (29). Bitácora §4im.

## 🃏 Mis pedidos con menos letras y Stock en fichas (§4ip, 09/10, PUBLICADA 09:12, `67b337b`, con §4iq y §4ir; dueño: *«la 13 no me gustó quítala, lo demás aplica»*)
Mis pedidos (`misCardHtml`): borde por estado (`misEstadoCard`), íconos en vez de títulos, camioncito en el viaje chico
(`pedidoViajeHtml`), sello «ENTREGADO» solo con ✅ y 💬 WhatsApp al cliente (`misWaCliente`). Stock: fichas arriba de la tabla
(`stockFichasHtml`, la MISMA fila de `stockData` y el mismo «Qué hacer»: `sfAccion`), catálogo en colores (`stockCatalogoHtml`), historia
de 30 días al tocar (`sfElegir`) y el Excel del día animado (`STOCK_DELTA_ANTES` → `stockDeltaTomar`). ⚠️ La tabla de stock sigue
ENTERA, plegada en `#stk-tabla-det`: no sacarla, las pruebas y logística la usan. `tests/test_fichas_4ip.js` (24). Bitácora §4ip.

## 📋 Stock simple: cinta «Hoy» + Plan de stock + «👁️ Más vistas» (§4iv, 09/10, PUBLICADA 10:27, `68a5dc6`, con §4iu; dueño: *«quedó muy cargado… una dice una cosa, la otra otra»*)
Arriba de Stock, sin buscar: la cinta `stockCintaHtml` (colchones por carril: pedir ya / esta semana / traer de Moreno / revisar) y
siempre el **📋 Plan de stock** (`stockPlanHtml`): Hay · Vendido sin entregar · Se corta · Qué hacer hoy · Pedir 7 / 15 días / el mes.
⚠️ **Una sola verdad**: «Qué hacer» = `sfAccion`, «Se corta» = `sfReloj`, 7 días = `o.fabricar`, 15 y el mes = `stockProducir`. No
calcular nada aparte en el plan. Todo lo demás (Qué producir, galpones, ranking, fichas, termómetro, catálogo, tabla completa…) va
plegado en `<details id="stk-mas">` (`visPref('masVistas')`, cerrado): una prueba que mire esas vistas hace `visPrefSet('masVistas',true)`
(sin eso, `innerText` vacío). `test_fichas_4ip` §10.

## 🚚 Arriba del panel (§4iw, 09/10, PUBLICADA 12:10, `960fdaa`; dueño: *«A», «C, aprobado», «D2, D3, D5, D6»*)
Encabezado: el día (`hdrDiaTxt`) y dos anillos con los cupos libres del próximo camión (`hdrPintar`, desde `updateStats`); `#stat-hoy-l`
sigue escrito (las pruebas lo leen). El camión 🚚 mira a la izquierda: va de DERECHA a IZQUIERDA (`h-viaje` anima `right`), si no parece en
reversa. En el celular (≤700 px) las pestañas van fijas al pie (`.t-ic`/`.t-cr`), `#fx-pasos` encima y `scroll-padding-bottom` para no tapar
nada. D2 fichas 3D, D3 números que cuentan (`fxCuentaUno`), D5 sellos (`fxSello`), D6 `.late-dot`. ⚠️ D3/D5 apagados en Playwright salvo
`window.FX_PRUEBA`. `tests/test_arriba_4iw.js` (24).

## 🔎 Stock revisado el 09/10 (§4ix, PUBLICADA 12:10, `960fdaa`; dueño: *«no pueden haber errores… para nunca tener faltantes»*)
- `revisarStock` ya no esconde la urgencia: se corta antes de la fábrica → `urgente`, dentro del margen → `pedir`, y la acción dice «· ⚠️ revisá
  el saldo». ⚠️ No volver a `if(o.revisarStock) return 'revisar'` a secas.
- Con `fabricar>0` el aviso nunca es «✅ Alcanza» ni «📦 Pedido único». Lo vendido en «7 días» = `stockCompHorizonte` (15 días como mínimo; con
  menos se rompe el caso de §4ii). `consumoResto` suma (§4ii). «Traé N» = `o.recoger`, nunca `max(1,…)`.
- `stockAsignar` devuelve `sinRespaldo` (lo marcado ✔ sin unidades) y la revisión lo lista; no toca marcas.
- `tests/test_stock_4ix.js`.

## 🔎 Segunda revisión del stock + 🚚 camiones (§4iz, 09/10 tarde, PUBLICADA 18:33, `097c56a`)
- **Detecciones del Excel**: `stockDetectadoSinAsignar(k,T)` cuenta cada detección solo contra lo pedido ANTES de su corte (hora en `q.t`). ⚠️ `o.detectado`
  va ANTES de `stockProyectar` (que descuenta lo detectado de las primeras llegadas); `stockProducirDe` y `encargados` usan `stockEnCaminoSeguro`.
- **Revisión automática**: lo marcado que no está en su lugar se busca en PTF → Banzer → IM y se reserva antes que lo sin marcar; `realoja` /
  `revRealojaHtml` lo dicen sin cambiar marcas. 🏭 llegado se reserva primero. ✗ en `A.faltan`; ✗ con stock libre en `noHayConStock`.
- **El mes**: `mesQueda = floor(hay + quin − consumoResto)` SIN tope (puede ser negativo). `stockEsperado` en día hábil. `o.fabLead` (fábrica de la marca).
  Todos los «Ya pedí» vigentes en el plan (`planYaVigentes`). `x.eF` manda en las salidas. Alias: todo «SOMIER <plazas> … HEAVEN» de ROHO = SOMIER ORO (dueño), EURO PEDIC,
  ANTIALERGICO … HEAVEN (CH2391). `PROD_NO_ES_STOCK` (PROTETOR COLCHAO, PANEL, REPARACION, SERVICIO) fuera del stock (dueño, 09/10).
- **Camiones** (dueño: *«B y C / H3»*): arriba (H3) un camión SVG grande en `.h-camion` que entra, frena en el medio y sigue (`h-viaje`: quieto entre el 30% y el 62%); `fxCamionEn` con ciudad/árboles/calle, humo, ruedas y cajas que caen.
- `tests/test_stock_4iz.js` (17), `tests/test_camiones_4iz.js` (8). Detalle y preguntas pendientes: bitácora §4iz.

## 🤖 El bot de WhatsApp (§4jt, 11/10; EN MARCHA con clientes reales desde el 12/10; servidor `2026-10-12-f` IMPLEMENTADO 12/10 ~18:30, página PUBLICADA 18:33, `c4cff91`)
Número propio de la API de WhatsApp de Meta («Multiespumas»), 6 plantillas de «Utilidad» (`WA_TIPOS`, nombres EXACTOS). Al cliente:
confirmación, cambio de día y recordatorio (17:00 los de la mañana y sin turno, 19:00 los de la tarde y lo que faltó: §4km, 12/10); a Ernesto y David, por separado: pedido nuevo, cambio y «sin camión» a las 16:00.
- `doSave` → `waAlGuardar_` solo anota en `WA_COLA` (sin red, adentro del candado); `waRepaso` (cada 5 min + `waDespierta` de una vez)
  manda AFUERA del candado, armando cada mensaje con la planilla de ese momento, tras 2 min de espera (`WA_ESPERA_MS`). Reintentos en
  `WA_SALIDA` (solo qué y a quién). Todo queda en la hoja «Bot WhatsApp». `estadoBotWhatsApp()`; `probarAntesDeImplementar` §11.
- 🚫 Al cliente no: Eduardo (dueño), ROHO, ATC, RPT, tienda, entregados, `__`, `kommo-`, sin celular, fecha pasada (`waNoCliente_` =
  `nxBotManda` de la página). `WA_MARCAS` = `MARCAS` de la página (`test_wa_bot` §1 las compara): un vendedor nuevo va en los dos.
- Propiedades del script (NUNCA en el código): `WA_TOKEN`, `WA_PHONE_ID`, `WA_LOGISTICA`, `WA_ACTIVO`=1, opcionales `WA_PRUEBA`,
  `WA_IDIOMA`, `WA_API`. Cada respuesta trae `wa:1|0` y la página dice «🤖 lo manda el bot» (el botón a mano queda).
- ⚠️ La página nueva espera `2026-10-11-a`: publicarla DESPUÉS de que el dueño implemente el `.gs`. `.gs` sin `normalize` (ES5).
- **📬 Escucha a Meta (§4ki, `.gs` 2026-10-12-a)**: webhook `?wa=<WA_HOOK_KEY>` (`waHook_`, antes de todo en doPost; la verificación
  `hub.challenge` en doGet antes de la clave). Estados en la columna «Meta dice» de «Bot WhatsApp» por `wamid` (nunca para atrás) y lo que
  contesta el cliente como «💬 Respondió». Solo el `WA_PHONE_ID`; el número de Kommo NO se suscribe.
- **💬 Lo que contesta el cliente (§4kk, `.gs` 2026-10-12-c)**: la fila «💬 Respondió» con su pedido, respuesta automática una vez
  cada 12 h por número (`WA_AUTORESP`=0 la apaga) y al panel por `waRespuestas` (`#wa-resp-mis` de su vendedora, `#wa-resp-adm` todas,
  aviso de Eduardo); «✓ Ya lo atendí» = `waRespAtendida` (columna K, para todos).
- **🤖 v2 (§4kl, `.gs` 2026-10-12-d)**: plantillas `*_v2` con 🤖 _Mensaje automático_ y emojis; si Meta no la tiene aprobada sale la vieja
  (`WA_TIPOS[k].vieja/nv`, errores 132001/132015/132016). Al cliente, el WhatsApp de su vendedor desde **`WA_VENDEDORAS`** (`Nombre:celular, …`,
  en Propiedades, nunca en el código); «tu vendedor/a» por `waTuVend_` (`WA_VENDEDOR_HOMBRE`). **Sin entregado automático** (dueño, 12/10):
  el cierre de entregas no tilda nada solo y fecha pasada sin ✅ = «❓ Sin confirmar»; la regla del stock (§4co) no cambió.
- **🚀 Lo de la tarde que sale cargado a la mañana** (§4lb, 14/10, dueño: *«Ernesto no va a "reprogramar"… debería ser automático, al
  marcar cargado y saliendo»*; PÁGINA PUBLICADA 14/10 15:58, `c68a00c`; servidor `2026-10-14-a` IMPLEMENTADO 14/10 por el dueño (re-pegado y reimplementado ~15:50: el editor había vuelto al código viejo), plantilla `pedido_en_camino` APROBADA por Meta; volver atrás: ✏️ a la versión anotada Y pegar la 13-c de `b2c831d…`, 3.735 líneas): al salir un camión antes de las 12:00 («🚚 Ya salió» o
  el GPS de hace ≤ 60 min, en un aparato de logística/Administración), `adelantoAlSalir` pasa a AM los pedidos de HOY de ese camión que
  están en la TARDE y van ENTEROS en la carga (tildes de «🌆 Tarde»; copia los tildes a «🌅 Mañana»), con `reproAplicar(…, forzar,
  {adelanto:1})`. El servidor: evento `e` → plantilla **`pedido_en_camino`** solo al cliente (respaldo `cambio_entrega_v2` → `cambio_entrega`);
  sin `adelanto` o de otro día, el cambio de siempre. Nada se marca ✅. `tests/test_adelanto.js` (14), `test_wa_bot` §14.
- **🧠 Claude le contesta al cliente** (§4lc, 14/10, dueño: *«Entiende y contesta»*, con Claude y USD 100 de crédito; 14-b
  IMPLEMENTADO 14/10 ~19:05 por el dueño, primera respuesta real 19:13; **`2026-10-14-c` IMPLEMENTADO** (el diagnóstico del 15/10 11:56 lo lee);
  **15/10: el dueño sacó `IA_SOLO` — Claude le contesta a TODOS los clientes**; las tarjetas del panel PUBLICADAS 15/10, `15eb607`): el webhook pone «⏳» en la columna M y
  **⚡ desde la 14-c contesta AL VUELO** (dueño: *«escribo y demora 3-5 min»*): `iaAlVuelo_` espera 5 s (`IA_VUELO_MS`) y procesa SOLO sus
  números con 4 s de quietud (`IA_VUELO_QUIETO_MS`) → ~15 s; el tiempo del webhook no gasta la cuota de disparadores; `IA_AL_VUELO`=0 lo apaga
  sin reimplementar. De respaldo sigue `iaRepaso` (disparador `iaDespierta` a los 30 s + al final de `waRepaso`), que junta los mensajes de cada número con 20 s de quietud, le pasa a Claude SU pedido de la
  planilla y lo hablado en 24 h, y le manda la respuesta firmada «🤖 _Asistente automático · <marca>_». Columnas N/O/P = qué quiere, resumen,
  lo que le contestó; hora/saldo/confirma sin urgencia = atendido «🤖 Claude»; urgente con entrega hoy o el próximo camión → `logistica_cambio`
  (una vez por pedido y día). 🚫 Claude no cambia nada ni marca ✅; el texto del cliente va entre `<mensaje_cliente>` con `<`/`>` cambiados.
  Si falla (clave, crédito, refusal, 3 × ocupado, topes `IA_TOPE_DIA` 300 / `IA_MAX_NUMERO` 8, más de 6 h) sale la automática de siempre.
  Llamada cruda (`iaLlamar_`): `x-api-key`, `anthropic-version: 2023-06-01`, beta `server-side-fallback-2026-07-01` + `fallbacks:'default'`,
  `output_config` con `effort:'low'` y `json_schema`, SIN `thinking`; un 400 que no es crédito → una vez la consulta simple.
  Propiedades: `ANTHROPIC_API_KEY` (NUNCA en el código ni en el chat), `IA_ACTIVA`=1, `IA_SOLO` (probar con un número). `probarAsistente` desde
  el editor (una consulta, sin WhatsApp). Página: `waRespIaHtml`/`waRespIaHechas`. `test_wa_bot` §15, §15b y §15c (al vuelo), `tests/test_wa_claude.js` (11).
  ⚠️ **Nunca dos respuestas**: `IA_HECHO` (Propiedades) se anota ANTES de mandar y la toma de mensajes lo respeta; un número con un mensaje
  tomado por otra vuelta espera entero; lo que Claude contestó va en la columna **P** (la J es de Meta). `waAnotar_` va con `appendRow`.
- `tests/test_wa_bot.js` (208), `tests/test_wa_pagina.js` (12), `tests/test_wa_resp.js` (7). Bitácora §4jt, §4ki, §4kk, §4lb, §4lc.

## 🧑‍💼 Eduardo: las ideas A–K (§4kh, 12/10; dueño: «A,B,C,D,E,F,G,H,I,K»; PUBLICADA 12/10, `c13dc1c`)
A «Datos de las HH:MM» (`asisDatos`) · B «⏰ En 1 hora / 🌙 Mañana», «Entendido» vence a las 24 h (`me_asis_vistos` = hasta cuándo, `asisPosponer`)
· C logística sin clave en cualquier pestaña (`asisLogistica`) · D mensaje al cliente según el cuadrito al guardar (`asisMsgEspera`, la MISMA
cuenta `saldoVeredictoFila`) · E resumen del día 5–14 h (`asisResumenDia`, `a.res`) · F sinónimos + errores de tipeo + la pestaña primero
(`ASIS_SINONIMOS`, `nxDist`) · G seis respuestas más AL FINAL de `ASIS_AYUDA` (19; un vendedor 15) · H `body.asis-escribe` · I recorrido guiado
(`asisTour*`, `me_asis_tour`) · K lo que no supo → fila del sistema **`__asis_preguntas__`** (en `esFilaSistema`), la ve solo Administración.
⚠️ Una respuesta nueva va AL FINAL y su `f` tiene que existir en la página (`test_asistente_ak` §G). `tests/test_asistente_ak.js` (38).

## ✨ Adentro de las ventanas de Administración + Eduardo que lleva a algo visible (§4kc + §4kd, 12/10; PUBLICADA 01:41, `f233130`)
Solo presentación: fichas `mc` vivas (`admVestir`/`cxFichasVivas` + `admIcoDe`/`ADM_ESC`), barras de columna (`admBarras`), barra «N de M»
(`admAvanceHtml`; en el cierre `#cie-av` se repinta en `cierreEntToggle`), Lista de carga con `cargaResumenPintar`, el mapa dentro de
`.mapa-cv` con `#mapa-flota`. ⚠️ Lo que leen las pruebas (textos, recuadro verde de ROHO, tablas) quedó igual: no sacarlo al «limpiar».
Eduardo: `asisDestino` (si el lugar no se ve: la contraseña, «elegí tu nombre» o `alt`), avisos con `lista` y «Ver cuáles» → `showMisModal`;
asignar camión y cierre de entregas con `solo:'adm'` → solo `asisVeAdm()` (logística, Administración, clave o `me_adm_dev`; dueño: *«no es
para los vendedores»*). `tests/test_asistente.js`. Bitácora §4kc, §4kd.

## 🛣️ El recorrido sale de donde se carga (§4ke, 12/10; PUBLICADA 02:09, `e2f1021`; dueño: *«¿toma en cuenta si sale de PTF o Banzer?»*)
`rutaSalida(pedidos)` = depósitos en orden con la marca de cada producto (`prodPartesCarga`): acá/sin marcar/Moreno → PTF, «✔ Banzer» → Banzer,
las dos → PTF y después Banzer. La usan el recorrido del mapa (`mapaRutaDatos`/`mapaRutaPintar`, ordena desde el último depósito) y la Hoja de
ruta (`nxRutaOrdenar`). Sin ningún camión asignado el panel lo dice (`.mrp-vacio`) en vez de esconderse. `tests/test_ruta_salida.js`. Bitácora §4ke.

## 🔎 Revisión del 11-12/10 con 6 agentes y 📥 «Sí, es la misma» (§4kf, 12/10; PUBLICADA 10:48, `3ad6cc1`; los arreglos del bot siguen en la rama)
- **«Sí, es la misma» / «Descartar»** van de a uno (`borrEnSerie`) y un borrado que Google no hizo (ocupado, sin respuesta) DEVUELVE la
  tarjeta y lo dice; el ✓ sale con el sí del servidor. Antes lo callaba: el dueño veía la bandeja vacía en el teléfono y al otro día
  volvían todas (las filas nunca se borraron: «esperando hace 6 días»). `tests/test_borr_misma.js` (panel + `.gs` reales).
- **Eduardo**: el aviso al guardar lo llama `submitPedido` → `after` con el pedido YA guardado (`asisAlGuardar(rec, tienda)`; clave
  `g-map|<id>`; «Abrir el pedido» = `asisEditarEn`), sin tienda/ATC/RPT ni celular para Eduardo/ROHO; «Mañana» solo si es mañana
  (`asisCuando`); globo y pop una vez por aviso (`ASIS.anunciados`); la ventana se repinta solo si cambió algo y conserva foco y scroll;
  sin lectura buena no dice «Todo en orden» (`asisSinDatos`); «sin ubicación» sin RPT/ATC; cierre esperando señal; botones de 44 px;
  en el celular la ventana entra en la pantalla y la figura se corre con «Guardar» a la vista (`body.asis-guardar`).
- `misWaCliente` y `waCel_` con borde a la izquierda (un dígito de más armaba el celular de OTRA persona). «👛 Quién tiene el efectivo»
  nombra al chofer (`E.fuera`). El recorrido del mapa calcula el depósito con TODOS los pedidos del chofer.
- **🖼️ Varias imágenes a la vez** (dueño: *«no deja subir más de 1 foto a la vez»*): `comp-input`, `fcomp-input` y `ret-foto-input` llevan
  `multiple` y pasan por `compVarias(ev, fn)`: de a una con el manejador de siempre (que ahora devuelve su promesa), reponiendo
  `COMP_DESTINO` en cada vuelta; más de `COMP_MAX`, se cortan y se dice. `tests/test_comp_varias.js` (5).
- **🛣️ «Ya salió el camión»** (dueño: *«falta cómo hacemos que "ya salió el camión" mientras»*, hasta el GPS): botón «🚚 Ya salió» en la ficha
  del camión (`cvSalioHtml`, 3D y 2D, solo hoy y con pedidos) → `camionSalioMarcar`: una tilde más en `__carga_chk__`,
  `fecha|camión|🚚 SALIÓ|HH:MM` (hora de Bolivia; `salioClave`/`camionSalio`), con sello y junta como las demás; pregunta si falta carga;
  «deshacer». En 3D el andén queda vacío con «🛣️ salió a las…» (la firma de la escena incluye `camionSalio`); en Mis pedidos el viaje dice
  «Salió HH:MM» (`pedidoViajeDatos`). El cartel «⚠️ SIN CAMIÓN» se toca → `cv3dSinCamion` (lista con `cvAsignar`). `tests/test_camion_salio.js` (10).
  🛰️ GPS: Monnet i-monnet 5.0, `VEHICULO_PLACA`; ya tiene las geocercas «Centro de Dist. MULTIESPUMAS» y «Centro de dist. BANZER» con alertas
  «Unidad <placa> Generó ALERTA FUERA/DENTRO DE GEOCERCA <nombre> el AAAA/MM/DD HH:MM:SS» (rebotan en segundos: hace falta filtrar). Bitácora §4kg.
- **Bot (`.gs` 2026-10-11-a, sin implementar)**: el borrador se reconoce por `estado`, no por `kommo-` (una venta de Kommo completada no
  recibía nada); el recordatorio de las 17:00 no sale antes de una confirmación que espera en la cola. `test_wa_bot` §5b,
  `tests/test_asistente_rev.js` (17; 16 rojas contra `e2f1021`), `test_ruta_salida` §5b.

## ✨ Administración: herramientas en grupos (§4kb, 12/10; PUBLICADA 00:21, `55eaf9c`)
Los mismos botones en `.btn-row.adm-tools` (cuatro `.at-g`); el color va en `--c` y la explicación en `data-d` (con `::after`: no cambia el
`textContent`). Un botón nuevo de Administración entra en su grupo con esa forma. Las ventanas llevan `class="adm-ov"` (cabecera nueva, solo
CSS). `tests/test_adm_tools.js`. Bitácora §4kb.

## 👋 Quién usa el panel (§4ka, 11/10; PUBLICADA 23:53, `4ab5c90`; dueño: *«que al entrar al panel cada vendedor se identifique»*)
Una vez por pestaña (`sessionStorage` `me_quien_ok`) sale «¿Quién está usando el panel?»: vendedores, logística, administración. Elegir
usa `setVendedorMem` (el mismo «Tu nombre») y llena el formulario y Mis pedidos; se cambia con «¿No sos …?» en la ventana de Eduardo.
No es control de acceso. En Playwright no sale salvo `QUIEN_PRUEBA`. `tests/test_quien.js`.

## 🎧 ATC con el estilo nuevo y 🙈 Chofer escondida (§4jz, 11/10; PUBLICADA 23:21, `7a6085f`)
`#tab-chofer` va `hidden` (la vista sigue). ATC: fichas vivas (`cxFichasVivas(…, atvIcoDe)`), «🛤️ El viaje» (`atcLista(true)` = sin el
filtro de estado; tocar un paso filtra), motivos en barras que filtran y tarjetas bajo 900 px (`me_atc_tabla`). Solo presentación: la tabla
`#tbl-atc` se sigue armando. `tests/test_atc_4jz.js`. Bitácora §4jz.

## 🧽 Bloki, el asistente (§4lg, 15/10; dueño, con su dibujo y cinco capturas: *«Bloki, el asistente de Multiespumas · un bloque de espuma con la franja turquesa del colchón. Cambia de traje según quién usa el panel»*; PUBLICADO 15/10, `cd028a8`)
- Reemplaza la figura 3D de Eduardo en TODO el asistente: la esquina (`#asis-yo`), la cabecera de la ventana («Soy Bloki, tu asistente del panel»),
  «¿Quién está usando el panel?», la ventana «📢 Decir anuncio» y el grito del anuncio. Las fotos `asistente/eduardo-*.webp` quedan sin usar.
- **Es un SVG armado en la página** (`blokiSvg(traje)` → `blokiSrc` = `data:image/svg+xml`, memo por traje), sin archivos: cinco trajes
  (`BLOKI_TRAJES`): `bloki` (chispa), `vendedor` (gorra y tablita), `logistica` (casco, chaleco y camión), `conta` (anteojos, lápiz y calculadora),
  `anuncio` (megáfono y cejas de enojo). El saludo de la mano, el parpadeo y el megáfono que vibra van ADENTRO del SVG (sin movimiento con
  «reducir movimiento»); el balanceo sigue en `.asis-fig`.
- **El traje** = `blokiTraje()`: el globo del anuncio a la vista (`ASIS.anuncioFig`) → `anuncio`; si no, quién eligió ser (`quienRol`:
  `logistica`, **`conta` —botón nuevo «🧾 Contabilidad» en «¿Quién está usando…?»—**, `admin` → `bloki`; un nombre de vendedor → `vendedor`); si
  nadie eligió, la pestaña (Nuevo pedido y Mis pedidos → vendedor, Contabilidad → contabilidad, lo demás → bloki). `blokiPoner()` cambia solo
  el `src` de la figura (al refrescar, al cambiar de pestaña y al elegir quién es). `asisGloboOcultar()` esconde el globo y le saca el megáfono.
  ⚠️ El rol `conta` NO ve lo de logística (`asisVeAdm`) ni el resumen de logística: solo cambia el traje y deja «Todos» en Contabilidad.
- ⚠️ **Solo el ASISTENTE se llama Bloki**: Eduardo sigue siendo el dueño/vendedor («La fábrica de Eduardo», «preguntale a Eduardo por WhatsApp»,
  la nota de venta, Multicenter) y el EDUARDO de la ciudad 3D.
- `tests/test_bloki.js` (19; 16 rojas contra `15eb607`); `test_asistente` y `test_anuncio` cambiaron a conciencia (miraban la foto y el megáfono suelto).

## 🧑‍💼 Eduardo, el asistente (§4jx, 11/10; PUBLICADO 22:45, `7f54c33`; dueño: *«no me gusta… una cara en un círculo cuando podemos usar un avatar 3D»*) — desde §4lg la figura es BLOKI (arriba); lo demás sigue
Su imagen 3D de cuerpo entero en la esquina (`asistente/eduardo-3d.webp`, cabecera `eduardo-busto.webp`; `?v=` en `ASIS_IMG`/`ASIS_BUSTO`).
Avisa según la pestaña (`asisAvisos`: Mis pedidos del vendedor elegido, al guardar, Administración, Contabilidad) leyendo las cuentas de
siempre, ayuda «¿Cómo hago…?» (`ASIS_AYUDA`) y sonido WebAudio. Solo mira: nada va a la planilla; «Entendido» y 🔇 por aparato. En Playwright
no aparece salvo `ASIS_PRUEBA`. Avisarle al dueño lo de cada vendedor: lo pide después. `tests/test_asistente.js`. Bitácora §4jx.

## ✨ Contabilidad con el estilo nuevo (§4jw, 11/10; dueño: *«Ok pásalas y publica»*; PUBLICADA 11/10 21:09, `407f4a9`)
Solo presentación, bloque `cx*`: A fichas vivas + barra cobrado/falta (`#cx-vivo`, DEBAJO de `#cta-marcas`), B dona de marcas, C botones en
tres grupos (`#cx-grupos`), D chips que filtran SOLO la tabla (`CX_FILTRO`), E tarjetas bajo 900 px (`me_cx_tabla` vuelve a la tabla),
F «dos veces» con «Son distintas» por aparato (`me_cx_dup_ok` saca el par de `DUP_IDX`), G semáforo (tocar → la casilla de la tabla del
cierre), H quién tiene el efectivo (`cxRetiro`), I botón en cada aviso (`cxAvisoBtn`), J lo que entró día por día (⚠️ los cobros no tienen
hora), K curva por marca en Proyección (meta: falta dónde cargarla). ⚠️ No calcular nada aparte: todo lee las funciones de siempre.
`tests/test_conta_4jw.js` (38). Bitácora §4jw.

## ✨ Las nueve mejoras (§4js, 10/10, PUBLICADA 10/10 21:51 de Bolivia, `98771b8`; dueño: *«todo está bueno, solo falta pulir el diseño, los colores, animaciones»*)
Bloque `nx*` (CSS `.nx`, el estilo de las fichas de §4jj con su color, franja de la marca y dibujito). Solo completan, avisan o proponen:
- **P1** `nxCliBuscar` (`#nx-cli`): en un pedido NUEVO, el celular o el NIT (≥5 números) completan SOLO lo vacío con el pedido más nuevo de ese cliente; el NOMBRE NO completa solo: propone hasta 3 y se elige «Sí, es este» (dueño, 10/10). Desde §4ju (11/10, PUBLICADA `6e67b9d`) busca con UNA palabra de 5+ letras («MULTICENTER») y perdona un error de tipeo (`nxNomParecido`/`nxDist`); al elegir, el nombre queda como en sus pedidos. «No es él» lo vacía. `NX_CLI_LLENANDO` evita que lo completado vuelva a buscar.
- **P3** `nxMsgCliente`/`nxClienteBloque`: en «✅ Pedido guardado», el mensaje para el CLIENTE y su WhatsApp; al corregir con día/turno nuevo, `nxAvisarCambio`. Línea de logística concreta según día y turno (`nxLlamadaTxt`, dueño 10/10: AM «entre las 9:00 y las 12:00», PM «entre las 14:30 y las 18:30», y que llaman una hora antes).
- **M1** la 5ª ficha `mi-f5` «🔔 Mañana» en Mis pedidos + `#nx-m1`; late desde las 17:00 (`NX_M1_HORA`). ⚠️ «✓ Avisado» es por aparato (`me_m1_avisos`), no va a la planilla.
- **M3** `nxM3`: pasó lo vendido el mes anterior → dona dorada, medalla y papel picado una vez por mes (`me_m3_fiesta`).
- **C1** `nxCierreBajar`: un Excel con Ventas, Cuadre y Productos. ⚠️ Reusa `exportConta`/`exportCuadre`/`pmHojas` cambiando sus controles y
  `buildXlsx`/`downloadBlob`/`toast` por un momento (`nxCierreHojas`, con `finally`): si esos Excel cambian de controles, seguirlos.
- **C2** `nxPstLista`: pagos de ESTE mes (`NX_PST_DIAS`=0, dueño 10/10) sin recibo, sin foto (no efectivo), QR sin banco, sin método o PAGADA sin monto (`c.sinMonto`).
- **A1** `nxSugDatos`: camión que ya va a la zona → parada a ≤4 km → menos paradas. Aceptar = vehículo + primer chofer.
- **A2** `nxRutaOrdenar` en `renderRuta`: por cercanía desde PTF (`mapaRutaOrden`), AM primero; «Como estaba» (`me_ruta_cerca`). Los km NO van al pedido.
- **A3** `nxA3Pintar`: desde las 16:00 (`NX_A3_HORA`, dueño 10/10), cartel en Administración y número rojo en la pestaña (solo aparatos de administración, `me_adm_dev`).
- Números de pestañas: `nxBadges` (desde `updateStats` y cada minuto). `tests/test_nueve_4js.js` (55). Papel picado apagado en Playwright salvo `FX_PRUEBA`.

## 🔎 Revisión del 10/10 con 3 agentes + super + mega (§4jd, PUBLICADA 10/10 09:45, `135ff1e`)
- **Corte 16:30** (`HORA_CORTE`=16.5, dueño: *«48 h hábiles producir, 24 para entregar; si entra luego de las 4:30 las 48 empiezan al
  siguiente día»*). El «✓ Ya pedí» guarda `arr` y `esp` con esa regla (la MISMA del cuadrito: `q.arr||q.f`); id derivado `fy:`+huella
  (producto|día|n) para que dos equipos no lo dupliquen. Las cantidades de Stock siguen con el tiempo medido (dueño, 10/10: *«no, dejá los 5 días»*).
- **Pedidos internos fuera de Contabilidad** (`CONTA_INTERNOS`: ALBA, FABRICA, MULTIESPUMA, MORENO, ALZER, REPOSICION DE ALMACEN);
  en el stock siguen.
- **Número de Eduardo**: solo contra SUS pedidos y número por número (es el N° de pedido del proveedor; cada vendedor tiene su
  numeración).
- Arriba saltea días cerrados (`hdrProximoAbierto`); `dias<=lead` = urgente; camiones sin líneas ✗; la copia a fábrica suma lo marcado
  sin respaldo. Detalle y lo que quedó sin hacer: bitácora §4jd. `tests/test_rev_4jd.js`.

## 📦 Stock con las respuestas del dueño (§4iy, 09/10, PUBLICADA 12:10, `960fdaa`)
- **Piso del tiempo de fábrica** (`stockLeadPiso`, la regla del cuadrito: 48 h + el día de recoger); muestras de menos de 2 días no cuentan.
- **Lo dormido** (sin venta en 30 días, el mes pasado ni este) no se fabrica por «el año pasado» (`stockRangoMes`).
- **La venta de tienda** cuenta para la rotación pero NO baja PTF/Banzer ni la espera el control del Excel (sale del stock de la tienda).
- `PROD_ALIAS`: SOMIER 2P HEAVEN y SOMIER 3 PLAZAS KING HEAVEN = SOMIER ORO. `PROD_ALIAS_MEDIDA` (nombre + medida, solo sin código): ALMOHADA FIBRA SILICONADA 50x70 = CD1403; la 50x90 es otra (CD1459). Publicado 09/10 18:33 (`097c56a`).
- **«✓ Ya pedí»** en el Plan de stock: `STOCK.p` con `ya:1` y `esp` fijo; vale hasta `esp`, se poda a los 15 días. No es el botón «Pedí a fábrica».
- **💡 Para entregar antes** (`stockAsignar` → `soltar`, `revSoltarHtml`): sugiere soltar lo apartado para un pedido más lejano. No cambia marcas.
- Banzer fantasma y lo 🏭 en Moreno: el dueño dijo que no. `tests/test_stock_4iy.js` (23).

## 📚 La hoja «Historial stock» (§4in, 09/10; página PUBLICADA 02:04, `d94ca49`; servidor `2026-10-09-a` lo implementa el dueño)
Una fila por día con lo que dijo el Excel de cada almacén (`histGuardar_`/`histLeer_`; acciones `histStock`, `histStockLeer`), fuera
de «Pedidos»: la celda `__stock__` sigue con sus 3 días. La página la manda sola después de leer (`histStockAlDia`) SOLO si el servidor
es ≥ `2026-10-09-a` (con uno anterior caería en «Rechazos» como «no id»). 730 días, junta por almacén, el Excel más nuevo gana.
`test_servidor` §23, `tests/test_historial_stock.js`.

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
- **🔁 El mismo pago dos veces pregunta** (§4jr, 10/10, PUBLICADA 19:05, `82e869d`; auditoría de Antigravity y Codex): `ctaRegistrarPago` llama a
  `pagoRepetido(p, linea)` (mismo monto, día, método, banco y recibo contra `contaPagos`) y hace `confirm` antes de anotarlo;
  nunca frena. `tests/test_pago_repetido.js`. Y `tests/correr.sh` ahora sale 1 si alguna prueba falla («== HAY PRUEBAS EN ROJO ==»).
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
- **⏳ «Falta cobrar» se toca y dice quiénes son** (§4hr, 06/10, PUBLICADO 06/10 12:37, `3443703`; dueño: *«contabilidad no sabe qué clientes son»*): la ficha
  «Falta cobrar» de Ventas, «⏳ Con saldo» del resumen y «Por cobrar» del Cuadre (`mcToca`) abren **`abrirPorCobrar(origen)`**
  con la MISMA cuenta que la ficha (`porCobrarDatos`: Ventas = `contaFaltaCobrar` sobre `contaLista()`; Cuadre =
  `cuadrePendientes()`), armada al abrir, de la más vieja a la más nueva. Un cliente abre su venta con «← Volver a la lista»
  (`POR_COBRAR_VOLVER`, solo si se abrió desde la lista con la ventana abierta). «Revisar antes de cerrar» tiene el aviso
  `k:'cobrar'` (`sev:'plata'`, abierto): antes la deuda solo salía como «entregada y sin cobrar», y los choferes no marcan ✅.
  ⚠️ Una ficha NUEVA que tenga que abrir su detalle va con `mcToca`, no con un `onclick` pegado a mano. `tests/test_por_cobrar.js` (24).
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
- **🧾 La nota de venta en Mis pedidos, SOLO para Eduardo** (§4hu, 07/10, dueño: *«que solo a eduardo muestre tb número de
  nota»*; PUBLICADA 07/10 17:50, `07c4db3`): `MIS_VE_NOTA`/`misVeNota(v)` deciden por el nombre ELEGIDO en Mis pedidos (no por el
  vendedor del pedido); `misNotaTxt` pone «· Nota N» al lado de la OC (o «· sin nota»; nada en ATC/RPT) y la ficha
  (`showMisModal`) lo dice arriba. Las vendedoras no lo ven. `tests/test_mis_nota.js` (19; 8 rojas contra `faff9a0`).
- **🔎 Buscador en Mis pedidos** (§4jf, 10/10, PUBLICADA 11:42, `341a290`; dueño: *«eduardo necesita un buscador, para buscar por nro de nota, nombre
  cliente o producto»*): `#mis-q` fuera de la lista (no pierde el foco), `misBuscaTest` (nota, cliente, Facturar a, OC, celular, zona,
  productos; sin acentos; todas las palabras; número sin guiones), `misBuscar` pasa a «📋 Todos». Los chips cuentan lo encontrado; los
  números de arriba no. Para todos. `tests/test_mis_buscar.js` (16).
- **🏭 La fábrica de Eduardo** (§4jg → §4ji, 10/10, PUBLICADA 13:37, `244b5f1`; dueño: *«ME ENCANTA»*): SOLO con Eduardo elegido (`MIS_VE_DEP`), nunca en
  «👑 Ver todos». `#mis-izq` = la dona + las 4 fichas (`#mis-metrics` se MUDA ahí y vuelve con otro vendedor); al lado `#mis-dep`, la
  fábrica 3D (montacargas adelante con lo que falta cargar, camiones al fondo con lo ya cargado según los tildes de la Lista de carga,
  `depCargado`); abajo `#mis-dep-cols`, una columna por cliente (§4jl: columnas FIJAS, 4/3/2/1 según el ancho; nunca `auto-fit`, estiraba un cliente solo al ancho entero). Pendiente = sin ✅ (acá NO vale «fecha pasada = salió»).
  three.js r128 lazy (`depLibs`); sin 3D, las columnas. **§4jm (PUBLICADA 10/10 14:11, `0f95518`)**: tocar una ficha, un producto, un montacargas o un camión abre
  `depPanel` (ventana con los pedidos, el estilo de la imagen del dueño); fila de espera para lo que pasa de 5 (`DEP_COLA`); ruedas del
  camión con `ejeZ`; los carteles se acomodan en pantalla (el de un montacargas se esconde si igual pisa). `tests/test_mis_deposito.js` (25).
- **🎨 La dona de todas las vendedoras (§4jj, PUBLICADA 10/10 13:37, `244b5f1`; dueño: *«opción A pero con las animaciones del C»*)**: `#mis-metrics` vive
  en `#mis-izq` para todas; cada dato de la dona con su barra; las 4 fichas con su color y un dibujito animado (`misFichasVivas`,
  `MIS_ESC`, clases `mi-f1…4`, `mi-debe`, `mi-entra`). ⚠️ Sin letras dentro de los SVG (las pruebas leen el texto de las fichas).
- **🏙️ Arriba y 🚚 los camiones de Eduardo (§4jk, PUBLICADA 10/10 13:48, `788fb9a`)**: `.h-ruta` con ciudad (`.h-lejos`/`.h-cerca`, en octubre en ruinas con luna,
  murciélagos y niebla) y calle de verdad (`.h-calle`), dibujos de `herramientas/ruta_ciudad_gen.py`. En la fábrica de Eduardo los camiones
  van SIEMPRE al fondo: con carga, con pedidos asignados aunque vacíos, o la flota «esperando carga».
- **🚚 El camión de arriba (§4jn, PUBLICADA 10/10, `078c46b`; dueño eligió la opción 1)**: caja blanca con el logo (tres hojas + «MultiESPUMAS · Viscarra
  S.R.L.»), cabina azul marino y las tres franjas de colores abajo; mismas clases `hc-*` y `viewBox` 86×40.
- **🚛 Camiones (§4jh, PUBLICADA 10/10 13:37, `244b5f1`)**: la fiesta espera a `cargaSyncSet('ok')`; `#cv-sync` dice Guardando/Guardado/Sin enviar; con los
  camiones escondidos queda `#carga-viva-linea`. `tests/test_carga_sync.js` (9).
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
- **💵 De dónde sale lo vendido** (§4je, 10/10, PUBLICADA 11:42, `341a290`; dueño: *«vendido + falta por cobrar no me coincide»*): `pryPlata`/`pryPlataHtml`
  (`#pry-plata`) parte lo vendido del mes por marca en cobrado en el mes / antes / falta (cargadas en el mes o antes) y muestra cómo se
  llega a la ficha del Cuadre (+ cobros del mes de OTRAS ventas + fletes). Mismas ventas que la ficha y mismos pagos que el Cuadre
  (`contaPagos`): si se toca una de las dos, revisar esta. `tests/test_pry_plata.js`.
- **🛏️ ROHO aparte y en unidades** (§4lt-e, 20/10; dueño: *«Ernesto cargó las ventas… te sirve para medir sus ventas»*; PUBLICADO 20/10 12:43, `dfec4b5`, con «📦 Ver sus productos», `R.roho.tot.prods`):
  `pryRohoCuenta` (sin ATC/RPT ni «TIENDA n») → `R.roho` con el ritmo en UNIDADES (sus pedidos no traen precio); ficha y grupo al final, fuera
  del TOTAL EQUIPO, de las curvas y de Contabilidad. Para Bs hace falta la lista de precios de ROHO (la pasa el dueño).
- **📒 Lo que dijo la proyección cada día** (§4mn, 25/10; dueño: *«si guardar la proyección hazlo»*; PUBLICADO `f3db549`): fila del sistema
  **`__pry_hist__`** (`PRY_HIST_ID`, en `esFilaSistema`) con una foto por día del mes en curso (hora, lo vendido, la proyección del equipo, de
  cada marca con «c» curva / «r» ritmo, mayoristas y ROHO). Se guarda al mirar Proyección (cada 30 min como mucho, `pryHistQuizas`) y SOLA una
  vez por día desde las 17:00 en cualquier aparato con la planilla al día (`pryHistAuto`, tic de `AUTO_TIMER`). Relee y junta día por día
  (`pryHistJuntar`: gana la foto más tarde), tope 40.000 letras. Se ve en «📒 Lo que dijo la proyección cada día» (`pryHistHtml`): con el mes
  cerrado, el error de cada día. El `.gs` no cambió. En Playwright no escribe salvo `PRY_HIST_PRUEBA`. `tests/test_pry_hist.js` (21).
  ⚠️ **Ninguna fila del sistema es una venta**: `fueraDeConta` devuelve true para `esFilaSistema(p)` (el `__anuncio__` contaba como venta de
  Bs 0 en Ventas y «1 sin monto» en Proyección). Una fila del sistema NUEVA va en `esFilaSistema`.
- 🎯 **Metas por marca**: muestra para el dueño (https://claude.ai/artifact/5btePeM2nYNDbWdrYhuiaj), nada hecho en el panel todavía.
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

## 📊 MoM B en Proyección + 🎨 arriba del pedido (§4nj, 27/10; PUBLICADO `4c7af2b`; dueño: «C ok, publica las dos»; dueño: «falta el mom en unidades y monto», eligió la B)
Tocar un vendedor (o Enter) abre debajo su tablita: el mes de comparación a esta altura (o entero), este mes, diferencia y % en ventas, unidades
y Bs, el mes de comparación entero y la línea de unidades. `pryMomDe` → `tres:{act,ant,ent}` con `{n,u,bs}` + `curU/prevU`; `pryMomTocar`
inserta `pryMomDetHtml` sin repintar (`PRY_MOM_CTX`, `PRY_MOM_ABIERTO`). ⚠️ El texto de la fila no cambia salvo «ventas · unidades ▸» al final
(lo leen `test_proyeccion` y `test_mejoras_3_10_11`). `tests/test_mom_b.js` (14).
🎨 **Arriba del pedido, la C** (dueño: «C ok»): `#fh` (`fhPintar`, desde `renderCupoForm` y `renderConnEstado`) reemplaza A LA VISTA a `#conn-form`,
`#cupo-form` y los dos enlaces de ayuda, que se siguen armando escondidos (`.form-card.fh-on`). Una tarjeta por turno con «👀 Ver los N pedidos»
siempre; aviso de una línea solo si hace falta. ⚠️ Al cambiar `guia-vendedor.html`, subir `NOVEDADES_V`. `FH_PRUEBA`. `tests/test_arriba_pedido.js` (24).
👀 **La ventana de los pedidos del turno** (§4nk, 27/10, en la rama; dueño: *«asquerosamente fea»*): `verCuposTurno` ya va con `.modal-b` (`.cupv-*`) y
sin `ancha`: resumen con barra, quién ocupa por vendedora, filas de dos renglones que abren el pedido, «Ver la tarde/mañana» en la misma ventana.
Las frases que leen las pruebas siguen abajo. 🎨 **Botones de la ficha en gris** (dueño eligió la 3, *«parecen un carnaval»*): `.af-tb .ico-b` sin
cuadrito, dibujo gris y su `--c2` al pasar. PUBLICADO `e8feb61`. `test_cupos` §5, `test_mejoras_5_7_9`.
🎨 **Las pestañas, la 4** (dueño: *«no me convencen los pinches botones»*; en la rama): pastillas blancas con dibujo gris y SOLO la elegida con el
color de su sección (`--c1/--c2` por id de pestaña), también con los temas del mes (reglas `html .nav button.active[id]`). `navFoto` lleva el degradé.

## 🧹 Seguimiento del dashboard sin tareas en Kommo (§4nf, 27/10; dueño: *«no quiero que Cloudflare haga eso ya, si no se usa»*; PUBLICADO 27/10, `c0f4dc0`)
En «Seguimiento», ✓ y 🕐 solo marcan la ficha en el panel (por aparato); ya no crean tareas en Kommo, y se fueron 📝 nota, «Acción masiva» y
«Copia para mí» (todo eso iba por el Worker de Cloudflare con su propia copia del token de Kommo). En Cloudflare queda solo el botón
«Actualizar» (token de GitHub) y el webhook `/kommo-hook`, que nada del repo lee. La disciplina por vendedora sale de `/events` con el token de
GitHub, no de Cloudflare. ⚠️ `cloudflare-worker.js` del repo es una copia vieja del Worker. `tests/test_seguimiento_sin_cloudflare.js`.
🔎 **Kommo SÍ guarda las respuestas de WhatsApp de las vendedoras** (§4ng, 27/10): `outgoing_chat_message` en `/events` con `created_by` = la
vendedora y `entity_type` lead, pero **solo SIN `filter[entity]`** (con `lead` da 204: por eso junio dio 0 y `generar.py` no los ve). Instrucción
para Codex en `RESPUESTA_CLAUDE.md` §34; inspector de solo lectura `herramientas/inspeccionar_respuestas.py`.

## ✨ Lo elegido del muestrario + 🌼 noviembre (§4ni, 27/10; PUBLICADO `a8dbe8c` + Bloki `3536736`; dueño: «Quiero las mejoras: 1, 6, 8, 14, 15, 16… el tema de noviembre, estilo Coco» y «Además quiero: 3, 10, 11»)
- **Temas**: el `<head>` de `pedidos.html` y `panel_template.html` elige UNO por la fecha de Bolivia (octubre Halloween, noviembre Todos Santos,
  1-30/12 Navidad, 31/12-2/1 Año Nuevo, Carnaval = 52 a 47 días antes de la Pascua, Madre 20-27/5, 6 de Agosto 1-7/8, 24 de Septiembre 18-24/9,
  el resto Espuma); `?tema=<nombre>` para verlo. Lo que se mueve va en el lienzo `#hdr-fx` (un cuadro en las pruebas, `HDR_FX_PRUEBA`). Las
  banderas van DIBUJADAS (el emoji 🇧🇴 en Windows sale «BO»). 🎸 `tema-melodia.js`: melodía PROPIA estilo Coco («Recuérdame» tiene derechos), solo
  en noviembre, primer toque, una vez por apertura; ⚠️ cambiarla = subir el `?v=` del `<head>` en los DOS archivos.
- **🔇 Un solo silencio**: el de Bloki (`me_asis_mudo`) calla Bloki, el anuncio, `sonidoPanel` (16) y la melodía.
- **6** `guardarBtnFin` (tilde SOLO con el «sí»; «En cola» nunca ✓) · **8** `.ah-it.ah-r::after` · **1** `palAbrir` (Ctrl+K; lo de Administración solo
  con `UNLOCKED`) · **3** `fichaCostadoAplicar` (≥1200 px en Administración; `openModal`/`closeModal` lo sacan) · **10** `vivoPintar` (solo
  `asisVeAdm`; ⚠️ `.vivo-btn[hidden]` lleva su regla) · **11** `pryMomHtml` (al FINAL de la fila en el DOM: `test_proyeccion` lee el texto) y
  `misMesLineaHtml`.
- En Playwright apagados salvo `HDR_FX_PRUEBA`, `TS_MUSICA_PRUEBA`, `SON_PRUEBA`, `FX_PRUEBA` (Guardar), `FICHA_COSTADO_PRUEBA`, `VIVO_PRUEBA`.
- **5, 7 y 9** (dueño: «Además quiero: 5, 7, 9»; la del Bot sigue con 🤖): **9** `.ico-b` en las pestañas (escritos en la página) y en la ficha de
  Administración (`icoHtml`), se mueven con `icoAnimar` (`ICO_PRUEBA`); las pestañas quedan del mismo alto. **5** `navFoto`/`navDeslizar` (fantasma con
  el color de la pestaña de antes; la vista entra de costado, el formulario solo aparece: su barra de pasos es `fixed`; `NAV_PRUEBA`). **7** `#desh`
  «↩️ Deshacer» 5 s después de Entregó, cambio de turno y Borrar; ⚠️ borrar espera los 5 s ANTES de ir a la planilla (`borrarConDeshacer` →
  `realDelete`); deshacer = otro guardado por el mismo camino (foto `entregado`+`productos`, `cambiarTurno(id, antes, true)`); `DESH_PRUEBA`. Un
  borrado NUEVO que la persona hace a mano va con `borrarConDeshacer`.
- 🧽 **Bloki según la pestaña, para todos** (dueño: «Según pestaña, todos»): Nuevo pedido/Mis pedidos → vendedor, Contabilidad → contador,
  Administración → casco; en ATC/Bot/Chofer, el de quien eligió ser. `test_bloki` §2.
- `tests/test_temas_mejoras.js` (92), `tests/test_mejoras_3_10_11.js` (29), `tests/test_mejoras_5_7_9.js` (52). Bitácora §4ni.

## Campo "Canal" en Kommo
Campo lista obligatorio que las vendedoras llenan a mano (Facebook, Instagram, Tiktok, Visita tienda, Referido, Cliente antiguo). `detect_channel()` en generar.py devuelve el valor **TAL CUAL** de Kommo (sin renombrar, para coincidir con la lista); el ícono lo pone `channel_icon()` por palabra clave. Fallback: tags (normalizadas) → `created_by` (0 = bot → "Automático (bot)", otro → "Carga manual vendedora").

## Para actualizar manualmente
GitHub → Actions → **Generar Panel Heaven (Kommo → GitHub Pages)** → **Run workflow** (dejar month/year vacíos para el mes en curso).
El botón "Actualizar" del dashboard SOLO recarga la página, no regenera datos.

## Reglas de oro
- NO pushear a `main` mientras el workflow del panel corre (el push del bot falla en silencio).
- Validar `generar.py` con `ast.parse` y el template con `node --check` antes de pushear.
- Si Pages se atasca (deploys fallan en `deployment_queued`): Settings → Pages → Branch None → Save → Branch main → Save.
