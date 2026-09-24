/**
 * ============================================================================
 * PEDIDOS MultiEspumas — Backend Google Apps Script
 * ============================================================================
 * CÓMO SE ACTUALIZA (lo de siempre; la implementación ya existe). Procedimiento completo, con
 * los enlaces: bitácora §4fz-b «Publicar».
 *   0. ANTES de tocar nada: Implementar > Administrar implementaciones, y ANOTAR el número de
 *      «Versión» que está activa hoy. Es a la que se vuelve si algo sale mal.
 *   1. Copiar el código del enlace raw de GitHub FIJO A UN COMMIT, nunca desde el chat (corta
 *      los archivos largos: pasó el 23/09). En Extensiones > Apps Script, a la izquierda tiene
 *      que haber UN solo archivo .gs: clic en el código, Ctrl+A, Supr (tiene que quedar
 *      VACÍO), pegar, Ctrl+S. Sin mensaje rojo, y la última línea es la que dice el
 *      procedimiento («}», con «return borrador;» justo antes).
 *   2. En la lista de al lado de ▶ Ejecutar elegir «probarAntesDeImplementar» → Ejecutar.
 *      Abajo tiene que terminar en «✅ Se puede implementar». Con una ❌, o si la función ni
 *      aparece en la lista: NO implementar, y volver a pegar el código de la versión anotada.
 *      ⚠️ Lo GUARDADO ya corre en los disparadores automáticos (el repaso de Kommo), aunque
 *      no se implemente: un pegado roto los frena en el acto (pasó el 23/09, §4fz-b).
 *   3. Implementar > Administrar implementaciones > ✏️ la de siempre > Versión: «Nueva
 *      versión», con la SCRIPT_VERSION de este archivo en «Descripción» > Implementar.
 *      ⚠️ NUNCA «Nueva implementación»: estrena otra dirección /exec y el panel deja de
 *      encontrar el servidor (§4dm).
 *   4. Verificar: el panel (F5) dice «Conectado» y la versión nueva, y a los 5 minutos
 *      «probarAntesDeImplementar» otra vez: el repaso de Kommo al día y sin error.
 *   5. Si VARIOS dispositivos quedan sin conexión a la vez (uno solo: primero F5), volver
 *      atrás son DOS cosas: ✏️ > la versión ANOTADA en el paso 0 (arregla el panel) Y pegar de
 *      nuevo el código de esa versión (arregla los disparadores). ⚠️ Nunca «la anterior» a
 *      ciegas: la versión del 23/09 es un pegado roto.
 * Solo la PRIMERA vez (instalación nueva): Implementar > Nueva implementación > Aplicación
 * web, «Ejecutar como: Yo», «Quién tiene acceso: Cualquier usuario», y la dirección /exec
 * va en pedidos.html (variable SHEETS_URL).
 *
 * La hoja "Pedidos" y sus encabezados se crean/actualizan solos.
 * Columnas: id | Fecha | N° OC | Vendedor | Cliente | Productos | Celular |
 *           Turno | Zona | Dirección | Link Maps | Pagado | Saldo (Bs) |
 *           ts | _productos_json | Método pago | Observaciones |
 *           Estado stock | Entregado | Vehículo | Chofer | Garantía (a nombre de) |
 *           Nota de venta | A cuenta (Bs) | Facturar a | NIT | N° del día |
 *           Verificado | Fotos entrega | Revisión
 *           (medida y código van dentro del texto de Productos)
 * El servidor hace cumplir el límite por turno (12 AM / 13 PM = 25 por día)
 * y asigna el N° del día correlativo (1,2,3…) de forma atómica.
 *
 * 🔐 CLAVE DEL EQUIPO (§4ce). La dirección /exec de este script está dentro del panel,
 * que es una página PÚBLICA: cualquiera que mire el código fuente la tiene. Por eso
 * TODO lo que lee o escribe pedidos exige una clave, guardada en
 *    Configuración del proyecto → Propiedades del script → PANEL_KEY
 * y que cada dispositivo del equipo ingresa UNA vez (el panel la pide sola).
 * ⚠️ Sin PANEL_KEY configurada el script sigue ABIERTO como antes — a propósito, para
 * que publicar esta versión no deje al equipo sin poder trabajar — y el panel lo avisa
 * en rojo hasta que se configure. La integración con Kommo tiene SU clave aparte.
 * 🛡️ ADMIN_KEY (segunda propiedad): con PANEL_KEY puesta, forzar un pedido a un día
 * cerrado o turno lleno exige además esta clave, que solo tienen los dispositivos de
 * administración. Ver forzarOk_().
 * ============================================================================
 */

var SHEET_NAME = 'Pedidos';
var CUPOS_AM = 12;  // máximo de entregas turno AM por día
var CUPOS_PM = 13;  // máximo de entregas turno PM por día
var CUPOS_DIA = CUPOS_AM + CUPOS_PM; // 25 por día (capacidad logística). El servidor lo hace cumplir aunque carguen varios a la vez.
var HEADERS = ['id','Fecha','N° OC','Vendedor','Cliente','Productos','Celular',
               'Turno','Zona','Dirección','Link Maps','Pagado','Saldo (Bs)',
               'ts','_productos_json','Método pago','Observaciones',
               'Estado stock','Entregado','Vehículo','Chofer','Garantía (a nombre de)',
               'Nota de venta','A cuenta (Bs)','Facturar a','NIT','N° del día','Verificado',
               'Fotos entrega','Revisión'];
/* 'Revisión' (col 30): sello que pone el SERVIDOR en cada guardado. El panel lo devuelve
   tal cual lo recibió; si mientras tanto otra persona guardó, los sellos no coinciden y
   el guardado se rechaza en vez de pisar la fila entera (§4ce). */
var REV_COL = HEADERS.indexOf('Revisión') + 1;
/* Las filas del sistema que tocan VARIAS personas y el panel sabe juntar (§4fz): piden sello
   si el panel lo manda. Las otras (días cerrados, carga) siguen reescribiéndose enteras. */
var SISTEMA_CON_SELLO = { '__stock__':1, '__arqueo_cuadre__':1 };
/* §4fz-b: desde 2026-09-23-b estas filas las guarda SOLO un panel que sabe juntar (manda
   `juntar`), y borrar una fila sellada exige su sello. A un panel viejo se le contesta
   `actualizar` (tiene que recargar la página) sin tocar la hoja: con su copia pisaba la fila
   entera o borraba lo que otro acababa de cambiar (auditoría del 23/09 + Codex). */
var NRO_COL = HEADERS.indexOf('N° del día') + 1; // N° del día ya NO es la última col (Verificado va después)

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  // Asegura/actualiza la fila de encabezados al esquema actual (agrega columnas nuevas sin tocar los datos existentes).
  var lastCol = sh.getLastRow() === 0 ? 0 : sh.getRange(1, 1).getValue() === 'id' ? sh.getLastColumn() : 0;
  if (lastCol < HEADERS.length) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sh;
}

/* Sello de version: el panel lo muestra para saber si la implementacion publicada es
   este archivo. OJO: en Apps Script, GUARDAR no publica nada para el panel — hay que hacer
   Implementar -> Administrar implementaciones -> ✏️ -> Nueva version -> Implementar.
   ⚠️ Pero los DISPARADORES (kommoRepaso, kommoProcesarCola, barrerFotosHuerfanas) corren lo
   GUARDADO, no lo implementado: ver probarAntesDeImplementar() justo abajo. */
var SCRIPT_VERSION = '2026-09-23-b';   // ⬅️ el stock y el arqueo solo los guarda un panel que sabe juntar, y borrar una fila sellada exige su sello (`actualizar` si no) (§4fz-b)   // ⬅️ borrar mira el sello (doDelete con rev) y el stock y el arqueo piden sello si el panel lo manda (§4fz)   // ⬅️ Kommo: descartar se respeta (KOMMO_DESCARTADOS), nombres se reparan fuera del candado, repaso de GitHub encola, busy no vacía la cola, catálogo por catalog_id (§4et)   // ⬅️ barrido diario de fotos huérfanas + nombre con dueño (§4ep)   // ⬅️ el eco del guardado es la fila RELEÍDA de la hoja (§4eo)   // ⬅️ registro de guardados rechazados + latidos de la cola (§4el); el dispositivo lo manda el panel   // ⬅️ webhook de Kommo contesta al instante y encola; repaso cada 5 min dentro del script (§4eg)   // ⬅️ quién lee por GET, visible sin Cloud Logging + GET_CERRADO (§4dv); caché de GET (§4du); candado sin lecturas ni Kommo (§4dt)

/* ✅ PROBAR ANTES DE IMPLEMENTAR (§4fz-b, incidente del 23/09). Se corre desde el editor:
   elegir «probarAntesDeImplementar» en la lista de al lado de ▶ Ejecutar → Ejecutar, y leer
   el «Registro de ejecución» de abajo. NO ESCRIBE NADA: ni la planilla, ni las propiedades,
   ni los disparadores.
   Por qué existe: el 23/09 se pegó la versión nueva, se implementó, y TODO el equipo quedó
   sin conexión. Volver a la versión anterior arregló el panel, pero el repaso automático de
   Kommo siguió parado horas —desde las 11:24 hasta la noche— porque los DISPARADORES corren
   el código GUARDADO en el editor, no la versión implementada. Lo que se pega y se guarda
   ya está andando ahí antes de implementar, y un pegado roto no se nota hasta que alguien
   mira. Correr cualquier función desde el editor además muestra en rojo un error del archivo
   y pide los permisos que falten: las dos cosas que el equipo vería como «sin conexión».
   ⚠️ Va ARRIBA de todo a propósito: si el pegado quedó cortado, esta función igual está y
   nombra lo que falta. Si ni siquiera aparece en la lista, el pegado está mal. */
function probarAntesDeImplementar() {
  var lineas = [], malas = 0, avisos = 0;
  function bien(t) { lineas.push('✅ ' + t); }
  function mal(t) { lineas.push('❌ ' + t); malas++; }
  function ojo(t) { lineas.push('⚠️ ' + t); avisos++; }
  function motivo(e) { return String((e && e.message) || e); }
  function horaBolivia(ms) {               // UTC−4 fijo, sin horario de verano (§4fu)
    var s = new Date(ms - 4 * 3600000).toISOString();
    return s.slice(8, 10) + '/' + s.slice(5, 7) + ' ' + s.slice(11, 16);
  }
  /* 0. ¿Quedó código VIEJO además del nuevo? Pegar arriba sin borrar, u otro archivo .gs en el
        proyecto que carga después: las funciones y la SCRIPT_VERSION del viejo le ganan a las
        nuevas, y todo lo de abajo daría ✅ con el servidor viejo andando. El literal vive ADENTRO
        de esta función a propósito (el viejo no la tiene, no la pisa).
        ⚠️ Tiene que ser igual a SCRIPT_VERSION: test_servidor.js §11 lo compara. */
  var ESTA_VERSION = '2026-09-23-b';
  if (SCRIPT_VERSION !== ESTA_VERSION) mal('La versión cargada es «' + SCRIPT_VERSION + '» y este código es la «' + ESTA_VERSION +
                                           '»: quedó código VIEJO además del nuevo (pegado arriba sin borrar, u otro archivo .gs en ' +
                                           'el proyecto). Dejá un solo archivo .gs, borrá todo y pegá de nuevo.');
  else bien('Versión de este código: ' + SCRIPT_VERSION);

  /* 1. ¿Está el archivo ENTERO? Un pegado cortado deja afuera las funciones del final
        (borradorDeLead_ es la última del archivo). `typeof` no revienta con un nombre que
        no existe: dice 'undefined'. */
  var fns = {
    doGet: typeof doGet, doPost: typeof doPost, doPostCuerpo_: typeof doPostCuerpo_,
    doSave: typeof doSave, doDelete: typeof doDelete, readAll: typeof readAll,
    rowToRec_: typeof rowToRec_, recToRow: typeof recToRow, jsonOut: typeof jsonOut,
    guardarFoto: typeof guardarFoto, borrarFoto: typeof borrarFoto,
    barrerFotosHuerfanas: typeof barrerFotosHuerfanas, kommoHook: typeof kommoHook,
    kommoProcesarCola: typeof kommoProcesarCola, kommoRepaso: typeof kommoRepaso,
    instalarDisparadores: typeof instalarDisparadores, estadoKommo: typeof estadoKommo,
    borradorDeLead_: typeof borradorDeLead_
  };
  var faltan = [], n;
  for (n in fns) if (fns[n] !== 'function') faltan.push(n);
  if (faltan.length) mal('Faltan funciones: ' + faltan.join(', ') + '. El código quedó CORTADO o mal pegado: ' +
                         'volvé a copiarlo entero (la última línea es «}» y justo antes dice «return borrador;»).');
  else bien('El código está entero: ' + Object.keys(fns).length + ' funciones clave, hasta la última del archivo.');

  /* 2. La planilla, leída como la lee el panel (`list`). Sin `getSheet()`, que agrega los
        encabezados si faltan: esta prueba no escribe. */
  if (fns.rowToRec_ === 'function') {
    try {
      var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      if (!sh) mal('No encuentro la hoja «' + SHEET_NAME + '»: ¿el código está pegado en el Apps Script de la planilla de pedidos?');
      else {
        var vals = sh.getDataRange().getValues(), filas = 0;
        var primera = vals.length ? String(vals[0][0]) : '';
        if (!primera && vals.length <= 1) ojo('La hoja «' + SHEET_NAME + '» está vacía: se arma sola con el primer guardado.');
        else if (primera !== 'id') mal('La hoja «' + SHEET_NAME + '» no empieza con la columna «id»: ¿es la planilla de pedidos?');
        else {
          for (var i = 1; i < vals.length; i++) if (vals[i][0]) { rowToRec_(vals[i]); filas++; }
          bien('La planilla se lee como la lee el panel: ' + filas + (filas === 1 ? ' fila.' : ' filas.'));
        }
      }
    } catch (e) { mal('Leer la planilla falló: ' + motivo(e)); }
  }

  /* 3. Los disparadores: que estén, y que cada uno llame a una función que EXISTE en este
        código. Uno que apunta a una función que no está falla cada vez que salta, en
        silencio (el panel no se entera). Los de otras funciones se nombran y no se tocan. */
  try {
    var G = (function () { return this; })();
    var existe = function (h) { return fns.hasOwnProperty(h) ? fns[h] === 'function' : !!G && typeof G[h] === 'function'; };
    var tr = ScriptApp.getProjectTriggers(), hay = {};
    for (var j = 0; j < tr.length; j++) { var h = tr[j].getHandlerFunction(); hay[h] = (hay[h] || 0) + 1; }
    for (n in hay) if (!existe(n)) {
      /* Uno de NUESTROS disparadores sin su función = el pegado está mal (lo del 23/09): frena.
         Uno de una función que ya no existe en ningún código (quedó de antes) falla solo y no
         depende de este pegado: se avisa y no frena, porque volver a pegar no lo arregla. */
      if (fns.hasOwnProperty(n)) mal('Hay un disparador de «' + n + '» pero esa función no está en el código: falla cada vez que salta.');
      else ojo('Hay un disparador de «' + n + '», una función que ya no existe: falla cada vez que salta. Borralo en Activadores (el reloj de la izquierda).');
    }
    if (!hay.kommoRepaso) ojo('No está el repaso de Kommo cada 5 minutos: ejecutá «instalarDisparadores» una vez.');
    else if (!hay.barrerFotosHuerfanas) ojo('No está el barrido diario de fotos: ejecutá «instalarDisparadores» una vez.');
    else bien('Disparadores instalados: repaso de Kommo cada 5 minutos y barrido de fotos de madrugada.');
  } catch (e) { ojo('No pude mirar los disparadores: ' + motivo(e)); }

  /* 4. El último repaso de Kommo. Recién guardado el código, el próximo sale en hasta 5
        minutos: esto AVISA, no frena (el panel no depende del repaso). */
  try {
    var ult = JSON.parse(prop_('KOMMO_REPASO_ULTIMO') || 'null');
    var t = ult && Date.parse(ult.ts);
    if (!t) ojo('El repaso de Kommo todavía no corrió nunca.');
    else {
      var min = Math.round((Date.now() - t) / 60000);
      /* `kommoRepaso` atrapa sus errores y los anota: Ejecuciones dice «Completada» y la hora está
         al día aunque adentro haya fallado. Un error del CÓDIGO frena; uno de afuera (Kommo no
         contestó, candado ocupado) avisa. */
      var err = String(ult.error || '').slice(0, 120);
      if (min > 15) ojo('El repaso de Kommo no corre desde el ' + horaBolivia(t) + ' (hora Bolivia), hace ' + min +
                        ' minutos. Ejecutá «kommoRepaso» una vez y volvé a probar: si sale un error rojo, ese es el problema.');
      else if (/is not defined|is not a function|Cannot read|ReferenceError|TypeError|SyntaxError/i.test(err))
        mal('El último repaso de Kommo (hace ' + min + ' minutos) falló con un error del CÓDIGO: «' + err + '». Ejecutá ' +
            '«kommoRepaso» una vez y volvé a probar: si se repite, el código pegado tiene un problema.');
      else if (err) ojo('El último repaso de Kommo (hace ' + min + ' minutos) avisó: «' + err + '». Si se repite, mirá el token ' +
                        'de Kommo (propiedad KOMMO_TOKEN del script: es OTRA copia que el secreto de GitHub).');
      else bien('El repaso de Kommo corrió hace ' + min + ' minutos, sin errores.');
    }
  } catch (e) { ojo('No pude leer el último repaso: ' + motivo(e)); }

  /* 5. Ventas de Kommo esperando en la cola del webhook. */
  try {
    var cola = kColaLeer_().length;
    if (cola) ojo(cola + ' venta(s) de Kommo esperando en la cola: ejecutá «kommoRepaso» una vez.');
  } catch (e) {}

  var veredicto = malas ? ('❌ NO IMPLEMENTAR: ' + malas + ' problema(s) arriba. Mandá una captura de este registro.')
                        : ('✅ Se puede implementar' + (avisos ? ' (mirá los ⚠️: no frenan el panel, pero hay que atenderlos).' : '.'));
  lineas.push(veredicto);
  if (typeof Logger !== 'undefined') Logger.log(lineas.join('\n'));
  return { ok: !malas, malas: malas, avisos: avisos, lineas: lineas, veredicto: veredicto };
}

function jsonOut(obj) {
  // El panel necesita saber si la puerta tiene llave, para avisar en rojo cuando no.
  if (obj && obj.auth == null) obj.auth = panelKey_() ? 'clave' : 'abierto';
  if (obj && obj.adminAuth == null) obj.adminAuth = adminKey_() ? 'clave' : 'abierto';
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ── 🔐 La clave del equipo ──────────────────────────────────────────────── */
function prop_(k) {
  try { return String(PropertiesService.getScriptProperties().getProperty(k) || '').trim(); }
  catch (e) { return ''; }
}
function panelKey_() { return prop_('PANEL_KEY'); }
function adminKey_() { return prop_('ADMIN_KEY'); }
/** ¿Esta llamada trae la clave correcta? Sin clave configurada, pasa todo (ver cabecera). */
function claveOk_(recibida) {
  var k = panelKey_();
  return !k || String(recibida || '') === k;
}
/* 🛡️ ¿Puede FORZAR (meter un pedido en un día cerrado o un turno lleno)? (§4cg)
   La clave del equipo dice «sos del equipo», no «sos administración»: la contraseña de
   Administración vive solo en el navegador y el servidor nunca la ve. Por eso forzar exige
   una SEGUNDA clave, ADMIN_KEY, que solo tienen los dispositivos de administración.
   Mientras la puerta esté abierta (sin PANEL_KEY) no tiene sentido un candado interno:
   forzar sigue como siempre. Con PANEL_KEY puesta y sin ADMIN_KEY, nadie puede forzar —
   se reabre el día desde «Cerrar día», o se configura ADMIN_KEY. */
function forzarOk_(body) {
  if (!panelKey_()) return { ok:true };
  var ak = adminKey_();
  if (!ak) return { ok:false, motivo:'sin_clave' };
  return String(body.adminKey || '') === ak ? { ok:true } : { ok:false, motivo:'clave_mal' };
}

/** GET: útil para ver los datos desde el navegador (mismo formato que 'list').
 *  Con la clave configurada hay que agregarle ?k=LA_CLAVE a la dirección.
 *
 *  📡 QUIÉN LO LLAMA, Y QUE NO LEA LA HOJA ENTERA CADA VEZ (§4du).
 *  El 10/09 el registro de Ejecuciones mostró un chorro de `doGet` —uno cada 3 o 4 segundos,
 *  de 3 a 5 s cada uno— mientras los `doPost` del panel tardaban medio segundo. NADA de este
 *  repositorio llama al /exec con GET (el panel, el repaso de Kommo y el worker usan POST):
 *  es algo de afuera, y cada llamada suya leía la planilla entera. Eso era lo que tenía al
 *  servidor ahogado y al equipo mirando «Enviando…».
 *  Dos cosas: (1) se anota en el registro QUÉ parámetros trae cada GET —solo los nombres,
 *  nunca los valores, que pueden ser claves— para poder identificar al que llama; (2) la
 *  respuesta se guarda `GET_CACHE_SEG` segundos en la caché del script, así diez GET seguidos
 *  leen la hoja UNA vez. Un guardado la borra, para que el que lee por GET no vea nada viejo.
 *
 *  🔎 Y QUE SE PUEDA VER SIN CLOUD LOGGING (§4dv, 2026-09-10-c).
 *  El dueño abrió Ejecuciones y no pudo leer la línea del `console.log`: las filas de `doGet`
 *  no se despliegan y «Registros de Cloud» está en gris (el script corre en el proyecto de
 *  Google por defecto, sin visor). Entonces cada GET se anota ADEMÁS en la caché del script
 *  —las últimas `GET_LOG_MAX` firmas y un conteo por firma— y, a lo sumo una vez por minuto,
 *  un resumen se copia a las Propiedades del script (`GET_RESUMEN`, `GET_ULTIMOS`), que se
 *  leen en ⚙️ Configuración del proyecto sin ninguna herramienta. El panel lo pide con
 *  {action:'getlog'} (Administración → 📡 ¿Quién lee la planilla?).
 *  Una firma = hora · NOMBRES de parámetros · largo de la consulta · ruta · marca del navegador
 *  (`Session.getTemporaryActiveUserKey()` recortada: distingue un navegador de otro sin decir
 *  quién es) · de dónde salió la respuesta (caché / hoja / clave mal / cerrado). NUNCA valores.
 *  🚪 `GET_CERRADO` = 1 en Propiedades le cierra la puerta al GET sin volver a implementar:
 *  contesta {ok:false, error:'get_cerrado'} sin leer la hoja. Nada de este repositorio usa GET,
 *  así que al equipo no le cambia nada; se sigue anotando, para ver si el de afuera insiste.
 *  Para reabrir, se borra la propiedad. ⚠️ El registro va SIN candado (§4dt): dos GET al
 *  mismo tiempo pueden pisarse una anotación — es un diagnóstico, no contabilidad. */
var GET_CACHE_SEG = 20;              // cuánto vale una respuesta de GET antes de volver a leer la hoja
var GET_CACHE_TROZO = 64 * 1024;     // CacheService acepta 100 KB por clave; con acentos un char puede ser 2 bytes
var GET_LOG_MAX = 40;                // últimas lecturas GET que se guardan (firmas, no datos)
var GET_LOG_FIRMAS_MAX = 15;         // firmas distintas como mucho; el resto cae en «otras»
var GET_LOG_SEG = 6 * 3600;          // vida del registro en la caché (tope de CacheService); cada GET la renueva
var GET_LOG_PROP_SEG = 60;           // cada cuánto, como mucho, se copia el resumen a las Propiedades del script
function doGet(e) {
  if (!claveOk_(e && e.parameter && e.parameter.k)) { getRegistrar_(e, 'clave'); return jsonOut({ ok:false, error:'clave', version:SCRIPT_VERSION }); }
  if (getCerrado_()) { getRegistrar_(e, 'cerrado'); return jsonOut({ ok:false, error:'get_cerrado', version:SCRIPT_VERSION }); }
  var txt = getCacheLeer_();
  getRegistrar_(e, txt ? 'cache' : 'hoja');
  if (!txt) {
    txt = jsonTexto_({ ok: true, version:SCRIPT_VERSION, pedidos: readAll() });
    getCacheGuardar_(txt);
  }
  return ContentService.createTextOutput(txt).setMimeType(ContentService.MimeType.JSON);
}
/* 🚪 Propiedades del script → GET_CERRADO = 1 (cualquier cosa que no sea vacío, 0 o no). */
function getCerrado_() { var v = prop_('GET_CERRADO').toLowerCase(); return !!v && v !== '0' && v !== 'no'; }
/* Solo los NOMBRES de los parámetros: `k` puede ser una clave y no va al registro. */
function getRegistrar_(e, como) {
  var f = null;
  try { f = getFirma_(e, como); } catch (err) { return; }
  try { console.log('doGet · ' + getFirmaTxt_(f)); } catch (err) {}
  try { getLogAnotar_(f); } catch (err) {}
}
function getFirma_(e, como) {
  var p = (e && e.parameter) || {};
  var ruta = String((e && e.pathInfo) || '');
  if (ruta.indexOf('=') >= 0) ruta = ruta.slice(0, ruta.indexOf('='));   // por si alguien mete un valor en la ruta
  return { t: Date.now(), p: Object.keys(p).sort().join(',') || 'ninguno',
           q: String((e && e.queryString) || '').length, r: ruta.slice(0, 30),
           d: getDispositivo_(), c: String(como || '') };
}
/* Una marca por navegador que no dice quién es (rota cada 30 días y es de este script). Un
   cliente sin cookies —un servicio, un IMPORTDATA— no la trae o la cambia a cada rato: eso
   también es una pista. */
function getDispositivo_() {
  try { var k = String(Session.getTemporaryActiveUserKey() || ''); return k ? k.slice(0, 6) : '?'; } catch (e) { return '?'; }
}
function getHora_(t) {
  try { return Utilities.formatDate(new Date(Number(t)), Session.getScriptTimeZone(), 'dd/MM HH:mm:ss'); } catch (e) { return String(t); }
}
function getFirmaTxt_(f) {
  return getHora_(f.t) + ' · parámetros: ' + f.p + ' · largo de la consulta: ' + f.q +
         (f.r ? ' · ruta: ' + f.r : '') + ' · dispositivo: ' + f.d + ' · ' + (f.c || '?');
}
function getLogVacio_() { return { desde: Date.now(), n: 0, ult: [], firmas: {} }; }
/* null = no hay caché (un Google raro): el informe lo dice en vez de inventar un cero. */
function getLogLeer_() {
  var c = getCache_(); if (!c) return null;
  try { var t = c.get('get_log'); if (!t) return getLogVacio_(); var o = JSON.parse(t); return (o && o.ult && o.firmas) ? o : getLogVacio_(); }
  catch (e) { return getLogVacio_(); }
}
function getLogAnotar_(f) {
  var c = getCache_(); if (!c) return;
  var log = getLogLeer_() || getLogVacio_();
  log.n++;
  log.ult.push(f);
  if (log.ult.length > GET_LOG_MAX) log.ult.splice(0, log.ult.length - GET_LOG_MAX);
  var k = f.p + (f.r ? ' /' + f.r : '');
  if (!log.firmas[k] && Object.keys(log.firmas).length >= GET_LOG_FIRMAS_MAX) k = 'otras';
  var fi = log.firmas[k];
  if (!fi) fi = log.firmas[k] = { p: f.p, r: f.r, n: 0, pri: f.t, ult: f.t, disp: [], masDisp: false, como: {} };
  fi.n++; fi.ult = f.t;
  if (fi.disp.indexOf(f.d) < 0) { if (fi.disp.length < 8) fi.disp.push(f.d); else fi.masDisp = true; }
  fi.como[f.c] = (fi.como[f.c] || 0) + 1;
  c.put('get_log', JSON.stringify(log), GET_LOG_SEG);
  getLogAProps_(c, log);
}
/* A las Propiedades del script, para leerlo en ⚙️ Configuración del proyecto. Una vez por
   minuto como mucho: escribir propiedades tiene cupo diario y el chorro es de miles por hora. */
function getLogAProps_(c, log) {
  try {
    if (c.get('get_log_prop')) return;
    c.put('get_log_prop', '1', GET_LOG_PROP_SEG);
    PropertiesService.getScriptProperties().setProperties({
      GET_RESUMEN: getLogResumenTxt_(log),
      GET_ULTIMOS: log.ult.slice(-12).map(getFirmaTxt_).join('  |  ')
    });
  } catch (e) {}
}
function getCadaTxt_(s) {
  return s < 90 ? (Math.round(s * 10) / 10 + ' s') : s < 5400 ? (Math.round(s / 60) + ' min') : (Math.round(s / 360) / 10 + ' h');
}
function getLogResumenTxt_(log) {
  var ahora = Date.now(), seg = Math.max(1, (ahora - log.desde) / 1000);
  var partes = ['actualizado ' + getHora_(ahora),
                'desde ' + getHora_(log.desde) + ': ' + log.n + (log.n === 1 ? ' lectura GET' : ' lecturas GET') + (log.n > 1 ? ' (una cada ' + getCadaTxt_(seg / log.n) + ')' : '')];
  var ks = Object.keys(log.firmas).sort(function (a, b) { return log.firmas[b].n - log.firmas[a].n; });
  for (var i = 0; i < ks.length; i++) {
    var fi = log.firmas[ks[i]];
    partes.push('«' + ks[i] + '» ×' + fi.n + ' · última ' + getHora_(fi.ult) +
                ' · dispositivos: ' + (fi.disp.join(',') || '?') + (fi.masDisp ? ',…' : '') +
                ' · ' + Object.keys(fi.como).map(function (q) { return q + ' ' + fi.como[q]; }).join(', '));
  }
  return partes.join('  ||  ');
}
/* Lo que ve el panel con {action:'getlog'}: firmas y conteos, ni un valor. */
function getLogInforme_() {
  var log = getLogLeer_();
  var out = { ahora: Date.now(), cerrado: getCerrado_(), max: GET_LOG_MAX, resumenProp: prop_('GET_RESUMEN'), sinCache: !log };
  if (!log) log = getLogVacio_();
  out.desde = log.desde; out.n = log.n; out.ult = log.ult.slice(-15);
  out.firmas = Object.keys(log.firmas).map(function (k) {
    var fi = log.firmas[k];
    return { k: k, p: fi.p, r: fi.r, n: fi.n, pri: fi.pri, ult: fi.ult, disp: fi.disp, masDisp: !!fi.masDisp, como: fi.como };
  }).sort(function (a, b) { return b.n - a.n; });
  return out;
}
function jsonTexto_(obj) {
  if (obj && obj.auth == null) obj.auth = panelKey_() ? 'clave' : 'abierto';
  if (obj && obj.adminAuth == null) obj.adminAuth = adminKey_() ? 'clave' : 'abierto';
  return JSON.stringify(obj);
}
function getCache_() {
  try { return (typeof CacheService !== 'undefined') ? CacheService.getScriptCache() : null; } catch (e) { return null; }
}
function getCacheLeer_() {
  var c = getCache_(); if (!c) return '';
  try {
    var n = Number(c.get('get_n')); if (!(n > 0)) return '';
    var partes = [];
    for (var i = 0; i < n; i++) { var t = c.get('get_' + i); if (t == null) return ''; partes.push(t); }
    return partes.join('');
  } catch (e) { return ''; }
}
function getCacheGuardar_(txt) {
  var c = getCache_(); if (!c) return;
  try {
    var todo = {}, n = 0;
    for (var i = 0; i < txt.length; i += GET_CACHE_TROZO) { todo['get_' + n] = txt.slice(i, i + GET_CACHE_TROZO); n++; }
    todo['get_n'] = String(n);
    c.putAll(todo, GET_CACHE_SEG);
  } catch (e) {}
}
/* Después de escribir la hoja: que el próximo GET la lea de nuevo. */
function getCacheOlvidar_() {
  var c = getCache_(); if (!c) return;
  try { c.remove('get_n'); } catch (e) {}
}

/* ============================================================================
   ⚠️ GUARDADOS RECHAZADOS Y COLAS SIN ENVIAR — que quede rastro en el servidor (§4el)
   El dueño: *"indican que cargan comprobantes o ventas o pagos, recargan la página y les
   salió cargado, pero no aparecen"*. Hasta acá un guardado rechazado (choque de versión,
   día cerrado, cupo lleno, OC repetida, clave) era un cartel de 9 segundos en el navegador
   de quien guardó, y una cola sin enviar (sin señal, sin clave) era un «N sin enviar» al
   pie de SU pantalla. Nadie más se enteraba. Ahora:
   · cada respuesta {ok:false} de doPost se anota en la hoja «Rechazos» (fecha, acción,
     motivo, id, cliente, vendedor, quién guardaba, detalle, dispositivo);
   · cada `list` trae cuántos guardados tiene ese dispositivo en la cola (`cola`) y se
     anota en LATIDOS (propiedades del script), y se borra cuando la cola llega a 0;
   · `action:'rechazos'` devuelve las dos cosas para la pestaña de Administración.
   Nunca se anotan teléfonos ni direcciones; los nombres de cliente sí (hay que ubicar la venta).
   ========================================================================== */
var RECHAZOS_HOJA = 'Rechazos';
var RECHAZOS_HEADERS = ['Fecha', 'Acción', 'Motivo', 'Id', 'Cliente', 'Vendedor', 'Quién guardaba', 'Detalle', 'Dispositivo'];
var RECHAZOS_REGISTRAR = { conflicto:1, dia_cerrado:1, cupos_llenos:1, oc_repetida:1, admin:1, clave:1, busy:1, 'bad json':1, 'no id':1, drive:1, 'sin datos':1, 'foto no es imagen':1, actualizar:1 };
var RECHAZOS_MAX = 2000;          // filas como mucho en la hoja; después se borran las más viejas
var LATIDOS_MAX = 40;             // dispositivos con cola que se recuerdan

function getSheetRechazos_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(RECHAZOS_HOJA);
  if (!sh) sh = ss.insertSheet(RECHAZOS_HOJA);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, RECHAZOS_HEADERS.length).setValues([RECHAZOS_HEADERS]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, RECHAZOS_HEADERS.length).setFontWeight('bold');
  }
  return sh;
}
/** Qué se guardaba: cliente, vendedor y un detalle corto, sin datos de contacto. */
function rechazoDetalle_(body, o) {
  var p = (body && body.pedido) || {};
  var d = [];
  if (p.fecha) d.push('fecha ' + p.fecha + (p.turno ? (' ' + p.turno) : ''));
  if (p.oc) d.push('OC ' + p.oc);
  if (o.error === 'conflicto') d.push('rev enviado ' + (p.rev || (body && body.rev) || '—') + ' / rev hoja ' + ((o.pedido && o.pedido.rev) || '—'));
  if (o.error === 'oc_repetida' && o.otro) d.push('la tiene ' + (o.otro.cliente || 'otro pedido'));
  if (o.error === 'cupos_llenos' && o.turno) d.push('turno ' + o.turno + ' lleno');
  if (o.error === 'actualizar') d.push('panel viejo (de antes del ' + SCRIPT_VERSION + '): esa computadora tiene que recargar la página');
  if (o.motivo) d.push(String(o.motivo));
  if (String(p.id || '').indexOf('__ret_') === 0) d.push('RETIRO DE EFECTIVO ' + (p.acuenta != null ? ('Bs ' + p.acuenta) : ''));
  return d.join(' · ');
}
/* Qué dispositivo: lo manda el panel (un id que se inventa una vez por navegador, §4el).
   `Session.getTemporaryActiveUserKey()` da «?» para un POST anónimo (probado el 18/09), así
   que con eso todos los dispositivos se pisaban en un solo latido. */
function dispositivoDe_(body) {
  var d = String((body && body.dispositivo) || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 12);
  return d || getDispositivo_();
}
function rechazoAnotar_(body, action, o) {
  try {
    var p = (body && body.pedido) || {};
    var id = String(p.id || (body && body.id) || '');
    var sh = getSheetRechazos_();
    sh.appendRow([new Date(), String(action || ''), String(o.error || ''), id,
                  String(p.cliente || ''), String(p.vendedor || ''), String((body && body.quien) || ''),
                  rechazoDetalle_(body, o), dispositivoDe_(body)]);
    var n = sh.getLastRow() - 1;
    if (n > RECHAZOS_MAX) sh.deleteRow(2);            // la más vieja
    try { var pr = PropertiesService.getScriptProperties(); pr.setProperty('RECHAZOS_N', String((Number(pr.getProperty('RECHAZOS_N')) || 0) + 1)); } catch (e2) {}
  } catch (e) {}
}
/** Los últimos rechazos, del más nuevo al más viejo. */
function rechazosLeer_(max) {
  var sh = getSheetRechazos_(), last = sh.getLastRow();
  if (last < 2) return [];
  var n = Math.min(max || 200, last - 1);
  var vals = sh.getRange(last - n + 1, 1, n, RECHAZOS_HEADERS.length).getValues();
  var out = [];
  for (var i = vals.length - 1; i >= 0; i--) {
    var r = vals[i], f = r[0];
    out.push({ ts: (f && f.getTime) ? f.getTime() : (Date.parse(f) || 0), accion: String(r[1] || ''), error: String(r[2] || ''), id: String(r[3] || ''),
               cliente: String(r[4] || ''), vendedor: String(r[5] || ''), quien: String(r[6] || ''), detalle: String(r[7] || ''), dispositivo: String(r[8] || '') });
  }
  return out;
}
/* Los latidos: qué dispositivo tiene guardados sin enviar. Una entrada por dispositivo,
   se pisa con cada `list` y se borra cuando la cola llega a 0. */
function latidosLeer_() { try { return JSON.parse(prop_('LATIDOS') || '{}') || {}; } catch (e) { return {}; } }
function latidoAnotar_(body) {
  try {
    var cola = Number(body && body.cola) || 0, dev = dispositivoDe_(body);
    var L = latidosLeer_();
    if (!cola) { if (!L[dev]) return; delete L[dev]; }
    else {
      L[dev] = { ts: Date.now(), quien: String((body && body.quien) || ''), cola: cola,
                 ids: ((body && body.colaIds) || []).slice(0, 5).map(String), clave: !!(body && body.key) };
      var ks = Object.keys(L);
      if (ks.length > LATIDOS_MAX) { ks.sort(function (a, b) { return (L[a].ts || 0) - (L[b].ts || 0); }); while (ks.length > LATIDOS_MAX) delete L[ks.shift()]; }
    }
    PropertiesService.getScriptProperties().setProperty('LATIDOS', JSON.stringify(L));
  } catch (e) {}
}
function rechazosInforme_() {
  var L = latidosLeer_(), lat = [];
  for (var k in L) lat.push({ dispositivo: k, ts: L[k].ts, quien: L[k].quien, cola: L[k].cola, ids: L[k].ids || [], clave: !!L[k].clave });
  lat.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
  var hu = null; try { hu = JSON.parse(prop_('HUERFANAS_ULTIMO') || 'null'); } catch (e) { hu = null; }
  return { ahora: Date.now(), total: Number(prop_('RECHAZOS_N')) || 0, rechazos: rechazosLeer_(200), latidos: lat, huerfanas: hu };
}

/** POST: el formulario envía {action:'list'|'save'|'delete', ...} como texto plano.
    Envuelve al cuerpo real para anotar cada «no» (§4el). */
function doPost(e) {
  /* 📥 El aviso de Kommo NO se anota en «Rechazos» (§4et): un `busy` del webhook quedaba
     como un guardado «save» sin id ni cliente, y Administración lo leía como una venta
     perdida de alguien. El hook tiene su propio rastro (KOMMO_ULTIMO_HOOK) y su cola. */
  if (e && e.parameter && (e.parameter.k || e.parameter.kommo)) return doPostCuerpo_(e);
  var out = doPostCuerpo_(e);
  try {
    var txt = (out && typeof out.getContent === 'function') ? out.getContent() : (out && out._t);
    var o = txt ? JSON.parse(txt) : null;
    if (o && o.ok === false && o.error && RECHAZOS_REGISTRAR[o.error]) {
      var body = {}; try { body = JSON.parse(e.postData.contents); } catch (err) { body = {}; }
      var action = body.action || 'save';
      /* §4fz: el choque del stock o del arqueo lo resuelve el panel solo (junta y reguarda): no
         es un guardado perdido y anotarlo en «Rechazos» asustaría sin motivo. */
      if (o.error === 'conflicto' && action === 'save' && body.pedido && SISTEMA_CON_SELLO[String(body.pedido.id)]) return out;
      /* Una clave que falta en un `list` es un dispositivo que todavía no la ingresó y
         refresca cada 2 minutos: anotarlo llenaría la hoja sin decir nada nuevo. La clave
         que falta al GUARDAR sí importa: es un guardado que se quedó en una cola. */
      if (!(o.error === 'clave' && action !== 'save' && action !== 'delete' && action !== 'foto')) rechazoAnotar_(body, action, o);
    }
  } catch (err2) {}
  return out;
}
function doPostCuerpo_(e) {
  /* 📥 EL AVISO DE KOMMO (§4cc).
     Kommo NO manda JSON: manda un formulario con claves tipo
     "leads[status][0][id]". Por eso se mira ANTES del JSON.parse — si no, caía
     siempre en "bad json" y el aviso se perdía en silencio.
     ⚠️ La dirección de este script está dentro del panel, que es una página PÚBLICA:
     cualquiera podría mandar pedidos falsos. Por eso exige una clave (?k=…) que solo
     conocen Kommo y quien la configuró. Sin clave guardada, NO acepta nada. */
  if (e && e.parameter && (e.parameter.k || e.parameter.kommo)) return kommoHook(e);
  var body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) { return jsonOut({ ok:false, error:'bad json' }); }
  var action = body.action || 'save';
  // El repaso de respaldo (workflow de GitHub) manda los ids que encontró. Mismo camino
  // que el webhook: una sola implementación, dos formas de disparar.
  if (action === 'kommoLeads') return kommoLeads(body);
  /* 🔐 De acá para abajo, TODO exige la clave del equipo (§4ce): leer la lista es leer
     nombres, celulares y direcciones de clientes; guardar y borrar, ni hablar. El panel
     trata este "no" como si no hubiera red: encola y reintenta cuando le den la clave. */
  if (!claveOk_(body.key)) return jsonOut({ ok:false, error:'clave', version:SCRIPT_VERSION });
  if (body.forzar) {
    var fz = forzarOk_(body);
    if (!fz.ok) return jsonOut({ ok:false, error:'admin', motivo:fz.motivo, version:SCRIPT_VERSION });
  }
  // 'geocode' resuelve links cortos de Maps -> coordenadas. Va SIN lock (es lento y no toca los pedidos).
  // Devuelve tambien la VERSION: asi el panel sabe si lo que esta publicado es este archivo
  // o una implementacion vieja (guardar el codigo NO alcanza, hay que crear version nueva).
  if (action === 'geocode') return jsonOut({ ok:true, version:SCRIPT_VERSION, geo: resolveLinks(body.links || []) });
  // Fotos de la entrega: van a Drive (en una celda no entran). Tambien sin lock: es lento.
  if (action === 'foto')       return guardarFoto(body);
  if (action === 'borrarFoto') return borrarFoto(body);
  /* 📖 LEER NO NECESITA CANDADO (§4dt).
     `readAll()` es UN solo `getDataRange().getValues()`: una foto de la planilla en un
     instante, no una lectura fila por fila que se pueda mezclar con un guardado a medias.
     Pedir el candado exclusivo para eso era el cuello de botella del panel entero: cada
     dispositivo pide la lista al entrar y cada minuto, así que las lecturas de todo el
     equipo se hacían de a una Y hacían esperar a cualquiera que quisiera guardar.
     El dueño, con el botón clavado en «Enviando…»: *"que pasa con el servidor al subir
     fotos, al entrar, al cambiar algo tarda minutos"*. */
  if (action === 'list') { latidoAnotar_(body); return jsonOut({ ok:true, version:SCRIPT_VERSION, pedidos: readAll() }); }
  // ⚠️ Los guardados rechazados y las colas sin enviar (§4el). Sin candado: solo lee.
  if (action === 'rechazos') return jsonOut({ ok:true, version:SCRIPT_VERSION, rechazos: rechazosInforme_() });
  // 📡 Quién lee por GET (§4dv): lo anotado en la caché, sin valores. Sin candado: no toca la hoja.
  if (action === 'getlog') return jsonOut({ ok:true, version:SCRIPT_VERSION, get: getLogInforme_() });
  var lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (err) { return jsonOut({ ok:false, error:'busy' }); }
  try {
    if (action === 'delete') return doDelete(body.id, body.rev);
    return doSave(body.pedido, !!body.forzar, !!body.juntar);
  } finally {
    lock.releaseLock();
  }
}

/* ============================================================================
 * Geocodificación: resuelve links cortos de Google Maps (maps.app.goo.gl/...)
 * a lat/long siguiendo la redirección y extrayendo las coordenadas de la URL
 * final (o del cuerpo). Se cachean en la hoja "Geo" para no repetir el trabajo.
 * ========================================================================== */
function resolveLinks(links) {
  var cache = getGeoCache();
  var out = [], nuevos = [];
  for (var i = 0; i < links.length; i++) {
    var url = String(links[i] == null ? '' : links[i]).trim();
    if (!url) { out.push(null); continue; }
    if (cache[url]) { out.push({ link: url, lat: cache[url].lat, lng: cache[url].lng, aprox: !!cache[url].aprox }); continue; }
    var c = resolveOne(url);
    if (c) { out.push({ link: url, lat: c.lat, lng: c.lng, aprox: !!c.aprox }); cache[url] = c; nuevos.push([url, c.lat, c.lng, c.aprox ? 'aprox' : '']); }
    else out.push({ link: url, lat: null, lng: null });
  }
  if (nuevos.length) saveGeoCache(nuevos);
  return out;
}

function followRedirects(url) {
  var cur = url, hops = 0;
  try {
    while (hops < 6) {
      var r = UrlFetchApp.fetch(cur, { followRedirects: false, muteHttpExceptions: true });
      var code = r.getResponseCode();
      if (code >= 300 && code < 400) {
        var h = r.getAllHeaders(); var loc = h['Location'] || h['location'];
        if (!loc) break;
        cur = (String(loc).indexOf('http') === 0) ? loc : (cur.replace(/(\/\/[^\/]+).*/, '$1') + loc);
        hops++;
        if (extractCoords(cur)) return cur;
        continue;
      }
      break;
    }
  } catch (e) {}
  return cur;
}

// Los links que comparte la APP de Maps del celular (…?g_st=aw / ic / ac / iw) no contestan
// con una redireccion normal: devuelven una pagina intermedia con el destino adentro.
// Hay que leer esa pagina y sacar de ahi la direccion real.
var UA_NAV = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function urlDestinoEnCuerpo(body) {
  // Google a veces manda las URLs escapadas dentro de JSON (https:\/\/… , \u003d):
  // se normaliza primero, si no las expresiones de abajo no las encuentran.
  body = limpiaHtml(String(body || ''));
  var m;
  // 1) <meta http-equiv="refresh" content="0; url=...">
  if ((m = body.match(/http-equiv=["']?refresh["']?[^>]*content=["'][^"']*url=([^"']+)["']/i))) return limpiaHtml(m[1]);
  // 2) location.replace('...') / location.href = '...'
  if ((m = body.match(/location\.(?:replace\(|href\s*=\s*)["']([^"']+)["']/i))) return limpiaHtml(m[1]);
  // 3) cualquier URL de Google Maps que aparezca en la pagina
  if ((m = body.match(/https?:\/\/(?:www\.)?google\.[a-z.]+\/maps\/[^"'<>\\ ]+/i))) return limpiaHtml(m[0]);
  if ((m = body.match(/https?:\/\/maps\.google\.[a-z.]+\/[^"'<>\\ ]+/i))) return limpiaHtml(m[0]);
  return '';
}
function limpiaHtml(u) {
  return String(u || '').replace(/&amp;/g, '&').replace(/\\u003d/g, '=').replace(/\\u0026/g, '&').replace(/\\\//g, '/').trim();
}
function coordsEnCuerpo(body) {
  body = String(body || '');
  var mb = body.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
        || body.match(/\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/)
        || body.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (mb) return okCoord(mb[1], mb[2]);
  return null;
}

/* ULTIMO RECURSO: si no hay ninguna coordenada pero SI el nombre del lugar o una direccion
   escrita, se la preguntamos al geocodificador que ya viene con Apps Script (no necesita
   clave ni tarjeta). Devuelve el punto APROXIMADO del lugar — se marca como tal para no
   hacerle creer al chofer que es la puerta exacta. Solo se acepta si cae dentro de Santa Cruz. */
var SC_SW_LAT = -18.15, SC_SW_LNG = -63.60, SC_NE_LAT = -17.45, SC_NE_LNG = -62.85;

function nombreDeLugar(u) {
  var m = String(u || '').match(/\/maps\/place\/([^\/@?]+)/);
  if (!m) return '';
  var t = m[1];
  try { t = decodeURIComponent(t.replace(/\+/g, ' ')); } catch (e) { t = t.replace(/\+/g, ' '); }
  t = t.replace(/\s+/g, ' ').trim();
  if (plusCodeDeTexto(t)) return '';                      // eso ya lo intento el decodificador
  if (/^-?\d+\.\d+\s*,\s*-?\d+\.\d+$/.test(t)) return '';
  if (/\d+\s*°/.test(t)) return '';
  return t;
}

function geocodeTexto(txt) {
  txt = String(txt || '').replace(/\s+/g, ' ').trim();
  if (txt.length < 8) return null;                        // "casa 3" no alcanza para buscar
  if (/^https?:\/\//i.test(txt)) return null;             // un link no es una direccion
  if (!/santa cruz|bolivia/i.test(txt)) txt += ', Santa Cruz de la Sierra, Bolivia';
  try {
    var r = Maps.newGeocoder().setRegion('bo')
      .setBounds(SC_SW_LAT, SC_SW_LNG, SC_NE_LAT, SC_NE_LNG)
      .geocode(txt);
    if (r && r.status === 'OK' && r.results && r.results.length) {
      var loc = r.results[0].geometry.location;
      var c = okCoord(loc.lat, loc.lng);
      if (c && c.lat >= SC_SW_LAT && c.lat <= SC_NE_LAT && c.lng >= SC_SW_LNG && c.lng <= SC_NE_LNG) {
        c.aprox = true;                                   // aviso: es el lugar, no la puerta
        return c;
      }
    }
  } catch (e) {}
  return null;
}

function resolveOne(url) {
  var c0 = extractCoords(url);      // el enlace ya trae las coordenadas: ni hace falta salir a internet
  if (c0) return c0;
  // No es un link: pegaron una direccion escrita. Se busca directo, sin salir a abrir nada.
  if (!/^https?:\/\//i.test(url)) return geocodeTexto(url);
  var finalUrl = followRedirects(url);
  var c = extractCoords(finalUrl);
  if (c) return c;
  // Pedimos la pagina haciendonos pasar por un navegador: a un "robot" Google le contesta distinto.
  for (var intento = 0; intento < 2; intento++) {
    try {
      var rb = UrlFetchApp.fetch(finalUrl, {
        followRedirects: true, muteHttpExceptions: true,
        headers: { 'User-Agent': UA_NAV, 'Accept-Language': 'es-BO,es;q=0.9' }
      });
      var body = rb.getContentText();
      var cc = coordsEnCuerpo(body);
      if (cc) return cc;
      var destino = urlDestinoEnCuerpo(body);      // la pagina intermedia dice a donde va
      if (destino) {
        var cd = extractCoords(destino);
        if (cd) return cd;
        if (destino !== finalUrl) { finalUrl = destino; continue; }   // seguirlo una vez mas
      }
    } catch (e) {}
    break;
  }
  // Nada de coordenadas en ningun lado. Si el enlace al menos dice QUE lugar es
  // (/maps/place/DPM+EXPRESS+CARGO,+Av.+Tres+Pasos…), lo buscamos por nombre.
  var nom = nombreDeLugar(finalUrl) || nombreDeLugar(url);
  if (nom) return geocodeTexto(nom);
  return null;
}

function okCoord(a, b) {
  var la = parseFloat(a), ln = parseFloat(b);
  if (isNaN(la) || isNaN(ln) || Math.abs(la) > 90 || Math.abs(ln) > 180) return null;
  return { lat: la, lng: ln };
}
// PLUS CODES ("5P2Q+PFX"). Cuando se comparte desde la app del celular, Maps manda el
// lugar solo con su Plus Code y el nombre de la ciudad: la URL no trae NINGUNA coordenada.
// El codigo es la ubicacion escrita en otro alfabeto, asi que se convierte con cuentas.
// Google le saca los 4 primeros caracteres; se recuperan tomando Santa Cruz de referencia
// (exacto hasta ~50 km del centro, o sea toda la zona de reparto).
var OLC_A = '23456789CFGHJMPQRVWX';
var OLC_REF_LAT = -17.7833, OLC_REF_LNG = -63.1821;
function olcDecode(code) {
  code = String(code || '').replace(/\+/g, '').replace(/0+$/, '').toUpperCase();
  if (code.length < 10) return null;
  var nLat = -720000, nLng = -1440000, pv = 160000, dig = Math.min(code.length, 10), i, a, b;
  for (i = 0; i < dig; i += 2) {
    a = OLC_A.indexOf(code.charAt(i)); b = OLC_A.indexOf(code.charAt(i + 1));
    if (a < 0 || b < 0) return null;
    nLat += a * pv; nLng += b * pv;
    if (i < dig - 2) pv /= 20;
  }
  var latP = pv / 8000, lngP = pv / 8000, xLat = 0, xLng = 0;
  if (code.length > 10) {
    var rpv = 625, cpv = 256, max = Math.min(code.length, 15), dd;
    for (i = 10; i < max; i++) {
      dd = OLC_A.indexOf(code.charAt(i)); if (dd < 0) return null;
      xLat += Math.floor(dd / 4) * rpv; xLng += (dd % 4) * cpv;
      if (i < max - 1) { rpv /= 5; cpv /= 4; }
    }
    latP = rpv / 25000000; lngP = cpv / 8192000;
  }
  return okCoord(nLat / 8000 + xLat / 25000000 + latP / 2, nLng / 8000 + xLng / 8192000 + lngP / 2);
}
function olcPrefijo(lat, lng, n) {
  var la = lat + 90, lo = lng + 180, res = 20, out = '', i, a, b;
  for (i = 0; i < n; i += 2) {
    a = Math.floor(la / res); b = Math.floor(lo / res);
    if (a > 19) a = 19; if (a < 0) a = 0; if (b > 19) b = 19; if (b < 0) b = 0;
    out += OLC_A.charAt(a) + OLC_A.charAt(b);
    la -= a * res; lo -= b * res; res /= 20;
  }
  return out;
}
function olcCoords(code) {
  code = String(code || '').toUpperCase();
  var p = code.indexOf('+');
  if (p === 8) return olcDecode(code);
  var falta = 8 - p;
  if (falta !== 2 && falta !== 4 && falta !== 6) return null;
  var g = olcDecode(olcPrefijo(OLC_REF_LAT, OLC_REF_LNG, falta) + code);
  if (!g) return null;
  var reso = Math.pow(20, 2 - falta / 2), half = reso / 2;
  if (OLC_REF_LAT + half < g.lat && g.lat - reso >= -90) g.lat -= reso;
  else if (OLC_REF_LAT - half > g.lat && g.lat + reso <= 90) g.lat += reso;
  if (OLC_REF_LNG + half < g.lng) g.lng -= reso;
  else if (OLC_REF_LNG - half > g.lng) g.lng += reso;
  return g;
}
function plusCodeDeTexto(txt) {
  var m = String(txt || '').match(/(^|[^0-9A-Za-z+])([23456789CFGHJMPQRVWXcfghjmpqrvwx]{4,8})\+([23456789CFGHJMPQRVWXcfghjmpqrvwx]{2,3})(?![0-9A-Za-z+])/);
  if (!m || (m[2].length % 2)) return null;
  return (m[2] + '+' + m[3]).toUpperCase();
}

// OJO con el orden: "@lat,lng" es el CENTRO del mapa, no el pin (puede errarle cientos de
// metros). Primero se busca el pin real: !3d!4d, las coordenadas en grados, o el Plus Code.
function extractCoords(u) {
  u = String(u || '');
  var d = u; try { d = decodeURIComponent(u.replace(/\+/g, ' ')); } catch (e) {}
  var m;
  if ((m = u.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/))) return okCoord(m[1], m[2]);
  if ((m = d.match(/(\d+)\s*°\s*(\d+)\s*['′]\s*([\d.]+)\s*["″]?\s*([NSns])[\s,+]+(\d+)\s*°\s*(\d+)\s*['′]\s*([\d.]+)\s*["″]?\s*([EWOewo])/))) {
    var la = (+m[1]) + (+m[2]) / 60 + (+m[3]) / 3600; if (/[Ss]/.test(m[4])) la = -la;
    var ln = (+m[5]) + (+m[6]) / 60 + (+m[7]) / 3600; if (/[WOwo]/.test(m[8])) ln = -ln;
    return okCoord(la, ln);
  }
  var pc = plusCodeDeTexto(d);
  if (pc) { var gp = olcCoords(pc); if (gp) return gp; }
  if ((m = u.match(/[?&](?:q|query|ll|sll|daddr|saddr|destination|center)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/))) return okCoord(m[1], m[2]);
  if ((m = u.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/))) return okCoord(m[1], m[2]);
  if ((m = u.match(/[\/=](-?\d{1,2}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})/))) return okCoord(m[1], m[2]);
  return null;
}

/**
 * PROBAR UBICACIONES — ejecutá esta función desde el editor (▶ Ejecutar) para:
 *   1) que Apps Script te pida los permisos (incluye "conectarse a un servicio externo",
 *      que es el que hace falta para abrir los links cortos de maps.app.goo.gl), y
 *   2) ver en el registro si el enlace se resuelve bien.
 * Cambiá LINK por uno de los enlaces que te aparecen en "Revisar ubicaciones".
 */
function probarUbicacion() {
  var LINK = 'https://maps.app.goo.gl/RqsEezKpiDsaFS9L7';
  Logger.log('Probando: ' + LINK);
  var fin = followRedirects(LINK);
  Logger.log('El enlace lleva a: ' + fin);
  var c = resolveOne(LINK);
  Logger.log(c ? ('OK -> lat ' + c.lat + ' , lng ' + c.lng) : 'NO se pudo sacar la ubicación');
  return c;
}

function getGeoCache() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Geo');
  if (!sh) { sh = ss.insertSheet('Geo'); sh.getRange(1, 1, 1, 4).setValues([['link', 'lat', 'lng', 'aprox']]); return {}; }
  var vals = sh.getDataRange().getValues(); var c = {};
  for (var i = 1; i < vals.length; i++) { if (vals[i][0]) c[String(vals[i][0])] = { lat: Number(vals[i][1]), lng: Number(vals[i][2]), aprox: !!vals[i][3] }; }
  return c;
}

function saveGeoCache(rows) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Geo') || ss.insertSheet('Geo');
  if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, 4).setValues([['link', 'lat', 'lng', 'aprox']]);
  if (sh.getLastColumn() < 4) sh.getRange(1, 4).setValue('aprox');   // hojas viejas de 3 columnas
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, 4).setValues(rows);
}

function readAll() {
  var sh = getSheet();
  var values = sh.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < values.length; i++) {
    if (!values[i][0]) continue; // sin id -> ignorar
    out.push(rowToRec_(values[i]));
  }
  return out;
}

/** Una fila de la hoja -> el pedido como lo entiende el panel. */
function rowToRec_(r) {
  return {
      id: String(r[0]),
      fecha: fmtDate(r[1]),
      oc: String(r[2] == null ? '' : r[2]),
      vendedor: String(r[3] || ''),
      cliente: String(r[4] || ''),
      productos: parseProd(r[14], r[5]),
      celular: String(r[6] == null ? '' : r[6]),
      turno: String(r[7] || ''),
      zona: String(r[8] || ''),
      direccion: String(r[9] || ''),
      maps: String(r[10] || ''),
      pagado: (String(r[11]).toUpperCase().charAt(0) === 'S'),
      saldo: Number(r[12]) || 0,
      ts: Number(r[13]) || 0,
      metodoPago: String(r[15] || ''),
      observaciones: fmtDate(r[16]),  // fmtDate: si Sheets convirtio la celda en Fecha, vuelve como yyyy-MM-dd; un texto pasa tal cual
      estado: String(r[17] || ''),
      entregado: (String(r[18]).toUpperCase().charAt(0) === 'S'),
      vehiculo: String(r[19] || ''),
      chofer: String(r[20] || ''),
      garantia: String(r[21] || ''),
      nota: String(r[22] == null ? '' : r[22]),
      acuenta: Number(r[23]) || 0,
      facturarA: String(r[24] || ''),
      nit: String(r[25] == null ? '' : r[25]),
      nroDia: Number(r[26]) || 0,
      verificado: (String(r[27]).toUpperCase().charAt(0) === 'S'),
      fotos: String(r[28] || '').split(/[\s|]+/).filter(function (x) { return x; }),
      rev: Number(r[29]) || 0
  };
}

/* ¿Administración cerró esa fecha de entrega?
   Los días cerrados viajan en la fila con id '__dias_cerrados__', en la columna
   Observaciones, separados por coma: "2026-08-06,2026-08-07". Esa fila va con la
   FECHA VACÍA a propósito, así que no cuenta como pedido ni ocupa cupo. */
function diaCerradoGs(sh, last, ids, fecha) {
  if (!fecha || last < 2 || !ids) return false;
  var col = HEADERS.indexOf('Observaciones') + 1;
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) !== '__dias_cerrados__') continue;
    /* fmtDate y no String(): si la lista tenia UN solo dia, Sheets convirtio la celda en
       FECHA de verdad y String() devolvia "Mon Aug 24 2026..." — el portero no encontraba
       nada y dejaba pasar pedidos de un dia cerrado (los reportes del 21-22/08). */
    var txt = fmtDate(sh.getRange(i + 2, col).getValue());
    return txt.split(/[^0-9-]+/).indexOf(String(fecha)) >= 0;
  }
  return false;
}
/* ── Normalizadores chicos que usan los porteros ─────────────────────────── */
function turnoNorm_(t) { return String(t || '').toUpperCase().indexOf('PM') >= 0 ? 'PM' : 'AM'; }
function ocTexto_(v) {
  // Una celda que Sheets convirtió en Fecha no es un N° de OC (el panel hace lo mismo: cleanOC).
  if (v == null || Object.prototype.toString.call(v) === '[object Date]') return '';
  var s = String(v).trim();
  return /\bGMT\b/.test(s) ? '' : s;
}
function anioDeTs_(ts) { ts = Number(ts) || 0; return ts ? new Date(ts).getFullYear() : 0; }

/* 🔢 ¿ESA OC YA LA TIENE OTRA FILA? (§4ce)
   Mismo texto completo (con el «ATC » incluido: la ATC 09-001 y la venta 09-001 son dos
   cosas distintas) y mismo año de carga — el correlativo arranca de nuevo cada año.
   Devuelve la fila que la tiene, o null. `excluir` es la fila del propio pedido. */
function ocRepetidaGs_(sh, last, oc, ts, excluir) {
  oc = ocTexto_(oc);
  if (!oc || last < 2) return null;
  var ocs = sh.getRange(2, 3, last - 1, 1).getValues();     // col C = N° OC
  var tss = sh.getRange(2, 14, last - 1, 1).getValues();    // col N = ts (hora de carga)
  var anio = anioDeTs_(ts);
  for (var i = 0; i < ocs.length; i++) {
    if (i + 2 === excluir) continue;
    if (ocTexto_(ocs[i][0]) !== oc) continue;
    var a2 = anioDeTs_(tss[i][0]);
    if (anio && a2 && anio !== a2) continue;               // misma OC, otro año: no es repetida
    var f = sh.getRange(i + 2, 1, 1, HEADERS.length).getValues()[0];
    return { fila: i + 2, id: String(f[0]), cliente: String(f[4] || ''), fecha: fmtDate(f[1]) };
  }
  return null;
}
/* ¿Es un número que el panel generó solo ("09-045" o "ATC 09-045")? A esos, si chocan,
   se les da el siguiente libre. A los escritos a mano (ROHO manda su propio N°) no se
   les toca nada: se rechaza y que la persona mire. */
function ocAutoGs_(oc) { return /^(ATC\s+)?\d{2}-\d{3,}$/i.test(ocTexto_(oc)); }
/* El siguiente libre de la MISMA serie (con/sin ATC, mismo mes del número, mismo año). */
function ocSiguienteGs_(sh, last, oc, ts) {
  var m = ocTexto_(oc).match(/^(ATC\s+)?(\d{2})-(\d+)$/i);
  var pre = m[1] ? 'ATC ' : '', mes = m[2], mx = 0;
  var ocs = sh.getRange(2, 3, last - 1, 1).getValues();
  var tss = sh.getRange(2, 14, last - 1, 1).getValues();
  var anio = anioDeTs_(ts);
  for (var i = 0; i < ocs.length; i++) {
    var t = ocTexto_(ocs[i][0]).match(/^(ATC\s+)?(\d{2})-(\d+)$/i);
    if (!t || (!!t[1] !== !!m[1]) || t[2] !== mes) continue;
    var a2 = anioDeTs_(tss[i][0]);
    if (anio && a2 && anio !== a2) continue;
    var n = parseInt(t[3], 10); if (n > mx) mx = n;
  }
  var s = String(mx + 1); while (s.length < 3) s = '0' + s;
  return pre + mes + '-' + s;
}

/* 🚪 EL PORTERO DE LA FECHA: día cerrado y cupos por turno (§4ce).
   Corre para un pedido NUEVO con entrega y también cuando uno existente se MUEVE de
   fecha o de turno — antes solo para los nuevos, y mover a domingo, a un día cerrado o
   a un turno lleno entraba sin que nadie lo aprobara. `excluir` es la fila del propio
   pedido, para que no se cuente a sí mismo. Devuelve el rechazo (jsonOut) o null, y si
   pasa deja en p.nroDia el correlativo del día cuando corresponde. */
function porteroFecha_(sh, last, ids, p, excluir, asignarNro) {
  if (diaCerradoGs(sh, last, ids, p.fecha)) return jsonOut({ ok:false, error:'dia_cerrado', fecha:p.fecha });
  var usados = 0, usadosAM = 0, usadosPM = 0, maxNro = 0;
  if (last >= 2) {
    var fechas = sh.getRange(2, 2, last - 1, 1).getValues();              // col B = Fecha
    var turnos = sh.getRange(2, 8, last - 1, 1).getValues();             // col H = Turno
    var nros   = sh.getRange(2, NRO_COL, last - 1, 1).getValues();        // col N° del día
    for (var j = 0; j < fechas.length; j++) {
      if (j + 2 === excluir) continue;
      if (fmtDate(fechas[j][0]) === String(p.fecha)) {
        usados++;
        if (turnoNorm_(turnos[j][0]) === 'PM') usadosPM++; else usadosAM++;
        var n = Number(nros[j][0]) || 0; if (n > maxNro) maxNro = n;
      }
    }
  }
  var tSel = turnoNorm_(p.turno);
  var dow = dowDeGs(p.fecha);                                  // 0=domingo, 6=sábado
  var limT;
  if (dow === 0) limT = 0;                                     // domingo: cerrado
  else if (dow === 6) limT = (tSel === 'AM') ? 15 : 0;         // sábado: 15 AM, sin PM
  else limT = (tSel === 'PM') ? CUPOS_PM : CUPOS_AM;           // resto: 12 AM / 13 PM
  var usadosT = (tSel === 'PM') ? usadosPM : usadosAM;
  if (usadosT >= limT) return jsonOut({ ok:false, error:'cupos_llenos', fecha:p.fecha, turno:tSel, cupos:limT, usados:usadosT });
  if (asignarNro) p.nroDia = Math.max(maxNro, usados) + 1;   // correlativo del día (atómico por el lock)
  return null;
}

/* `forzar` lo manda el panel SOLO cuando quien mueve el pedido tiene la clave de
   administración y confirmó el aviso: es la que arma el camión y puede meterle un bulto
   más a un día cerrado a sabiendas. Para todo lo demás, el portero manda. */
function doSave(p, forzar, juntar) {
  if (!p || !p.id) return jsonOut({ ok:false, error:'no id' });
  // Seguro anti-fecha: la fila de dias cerrados con UN solo dia ("2026-08-24" pelado)
  // Sheets la convertiria en Fecha y nadie la entenderia al releer. Los paneles nuevos ya
  // mandan el prefijo; esto cubre a los viejos con la pagina cacheada.
  if (String(p.id) === '__dias_cerrados__' && /^\d{4}-\d{2}-\d{2}$/.test(String(p.observaciones || '').trim())) {
    p.observaciones = '\uD83D\uDD12 ' + String(p.observaciones).trim();
  }
  var sh = getSheet();
  var last = sh.getLastRow();
  // ¿Ya existe (update) o es nuevo?
  var foundRow = -1, ids = null;
  if (last >= 2) {
    ids = sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) { if (String(ids[i][0]) === String(p.id)) { foundRow = i + 2; break; } }
  }
  var viejo = null;
  if (foundRow > 0) {
    viejo = sh.getRange(foundRow, 1, 1, HEADERS.length).getValues()[0];
    /* 🤝 ¿ALGUIEN GUARDÓ ESTA FILA DESPUÉS DE QUE EL PANEL LA LEYÓ? (§4ce)
       Cada guardado reemplaza la fila ENTERA. Sin este freno, logística cambiando el
       chofer con una copia de hace una hora pisaba el pago que contabilidad acababa de
       registrar: un saldo cancelado volvía a deber. El panel manda el sello con el que
       leyó la fila; si ya no es el de la hoja, se rechaza y se le devuelve la fila actual.
       ⚠️ Un guardado SIN sello sobre una fila sellada también se rechaza (§4cg). La primera
       versión lo dejaba pasar «para no trabar a un panel viejo cacheado», y la auditoría
       lo reprodujo: bastaba omitir `rev` para pisar el pago igual. Y el panel viejo que más
       daño hace es justo el de la pestaña abierta desde ayer. Lo que sí pasa: una fila que
       NUNCA tuvo sello (todas las de antes de hoy) acepta su primer guardado y queda
       sellada; y las filas del sistema (`__dias_cerrados__`, `__arqueo_cuadre__`), que se
       reescriben enteras a propósito y las maneja una sola persona. */
    var revHoja = Number(viejo[REV_COL - 1]) || 0;
    var filaSistema = String(p.id).indexOf('__') === 0;
    /* 🤝 EL STOCK Y EL ARQUEO SÍ PIDEN SELLO (§4fz). No los maneja una sola persona: el stock
       lo tocan logística, el dueño y quien suba el Excel. Dos dispositivos con la misma copia
       guardaban los dos con ✓ y el segundo borraba lo del primero (una entrada de 5 unidades
       desaparecía). Se compara el sello; en conflicto devuelve la fila actual y el panel JUNTA
       las dos versiones y vuelve a guardar.
       §4fz-b: en 2026-09-23-a un panel viejo (sin sello) pasaba «para no trabarlo», y ese era
       justo el que pisaba la fila entera con su copia; y su 2° guardado seguido SÍ llevaba sello,
       chocaba y lo tiraba (auditoría, #8). Ahora, sobre una fila ya sellada, un panel que no
       manda `juntar` recibe `actualizar` y no se toca nada: tiene que recargar la página. */
    var sisSello = filaSistema && SISTEMA_CON_SELLO[String(p.id)];
    if (sisSello && revHoja && !juntar) {
      return jsonOut({ ok:false, error:'actualizar', version:SCRIPT_VERSION });
    }
    if (revHoja && (!filaSistema || sisSello) && (Number(p.rev) || 0) !== revHoja) {
      return jsonOut({ ok:false, error:'conflicto', version:SCRIPT_VERSION, pedido: rowToRec_(viejo) });
    }
  }
  // PORTERO DE DÍAS CERRADOS Y CUPOS. Administración cierra una fecha cuando ese camión ya
  // está armado (fila __dias_cerrados__ de esta hoja). Se revisa ACÁ y no solo en el panel
  // porque una compu con la página abierta desde antes del cierre no se entera y guardaba
  // igual: es el único lugar donde el "no" es definitivo. Corre dentro del lock de doPost
  // => atómico: aunque 3 carguen a la vez, entran de a uno y nunca se pasa del límite.
  if (p.fecha) {
    var esNuevo = foundRow < 0;
    var cambiaFecha = !esNuevo && fmtDate(viejo[1]) !== String(p.fecha);
    var cambiaTurno = !esNuevo && turnoNorm_(viejo[7]) !== turnoNorm_(p.turno);
    /* Mover de fecha o de turno es volver a cargar la entrega: pasa por el mismo portero
       que un pedido nuevo. Corregir un precio en un día cerrado NO es mover y no se toca. */
    if (esNuevo || ((cambiaFecha || cambiaTurno) && !forzar)) {
      var no = porteroFecha_(sh, last, ids, p, foundRow, esNuevo || cambiaFecha);
      if (no) return no;
    } else if (cambiaFecha) {
      // Administración forzó el cambio de día: igual necesita su número en el día nuevo.
      porteroFecha_(sh, last, ids, p, foundRow, true);
    }
  }
  // 🔢 N° DE OC REPETIDO. El panel calcula el siguiente con la planilla que tiene en
  // memoria; dos personas guardando en la misma ventana sacaban el mismo número (25 en
  // agosto). Acá, dentro del lock, se mira la hoja de verdad.
  var ocNueva = ocTexto_(p.oc), ocVieja = viejo ? ocTexto_(viejo[2]) : '';
  if (ocNueva && (foundRow < 0 || ocNueva !== ocVieja)) {
    var choque = ocRepetidaGs_(sh, last, ocNueva, p.ts, foundRow);
    if (choque) {
      if (foundRow < 0 && ocAutoGs_(ocNueva)) {
        // Número generado por el panel: se le da el siguiente libre y se le avisa.
        p.oc = ocSiguienteGs_(sh, last, ocNueva, p.ts);
        p.ocCambiada = { de: ocNueva, a: p.oc, con: choque.cliente };
      } else {
        return jsonOut({ ok:false, error:'oc_repetida', oc:ocNueva, otro:{ id:choque.id, cliente:choque.cliente, fecha:choque.fecha } });
      }
    }
  }
  p.rev = Math.max((viejo ? (Number(viejo[REV_COL - 1]) || 0) : 0) + 1, Date.now());
  var row = recToRow(p);
  getCacheOlvidar_();
  /* 🔍 EL ECO ES LA FILA RELEÍDA (§4eo). Antes se devolvía `p` —el objeto recibido— y el
     panel comparaba lo enviado con lo enviado: una escritura mala en la hoja no se veía.
     Ahora se vuelve a leer la fila recién escrita y se devuelve ESO. */
  var filaEco;
  if (foundRow > 0) { sh.getRange(foundRow, 1, 1, row.length).setValues([row]); filaEco = foundRow; }
  else { sh.appendRow(row); filaEco = sh.getLastRow(); }
  var eco = p;
  try { eco = rowToRec_(sh.getRange(filaEco, 1, 1, HEADERS.length).getValues()[0]); if (p.ocCambiada) eco.ocCambiada = p.ocCambiada; } catch (e) { eco = p; }
  return jsonOut({ ok:true, pedido:eco, mode:(foundRow > 0 ? 'update' : 'add') });
}

function doDelete(id, rev) {
  var sh = getSheet();
  var last = sh.getLastRow();
  if (last >= 2) {
    var ids = sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(id)) {
        /* 🤝 BORRAR TAMBIÉN MIRA EL SELLO (§4fz). Guardar lo exige desde §4ce, pero borrar
           mandaba solo el id: con la venta abierta desde antes, alguien confirmaba «Eliminar» y
           se llevaba el pago que Contabilidad acababa de registrar en otra computadora — la
           fila que se borraba no era la que había visto (informe del 23/09). El panel manda el
           sello con el que leyó la fila; si ya no es el de la hoja, NO se borra y se le devuelve
           la fila actual, igual que un guardado en conflicto.
           §4fz-b: un borrado SIN sello sobre una fila sellada ya no pasa: es un panel viejo,
           cacheado, que no sabe mirar si la fila cambió. Se le contesta `actualizar` (recargar la
           página) sin borrar. Una fila que nunca tuvo sello (de antes de §4ce) se borra como
           siempre: no hay con qué comparar. */
        var fila = sh.getRange(i + 2, 1, 1, HEADERS.length).getValues()[0];
        var revHoja = Number(fila[REV_COL - 1]) || 0;
        if (revHoja && (rev == null || rev === '')) {
          return jsonOut({ ok:false, error:'actualizar', version:SCRIPT_VERSION });
        }
        if (revHoja && (Number(rev) || 0) !== revHoja) {
          return jsonOut({ ok:false, error:'conflicto', version:SCRIPT_VERSION, pedido: rowToRec_(fila) });
        }
        sh.deleteRow(i + 2); getCacheOlvidar_();
        /* 📥 Borrar una fila `kommo-<lead>` es DESCARTAR esa venta de Kommo (§4et): se anota
           el lead para que ni el repaso de 5 minutos ni el de GitHub la vuelvan a traer.
           Antes «Descartar» solo borraba la fila y el repaso siguiente la recreaba. */
        if (String(id).indexOf(BORRADOR_PREF) === 0) kDescartar_(String(id).slice(BORRADOR_PREF.length));
        return jsonOut({ ok:true });
      }
    }
  }
  return jsonOut({ ok:false, error:'not found' });
}

function recToRow(p) {
  return [
    p.id, p.fecha || '', p.oc || '', p.vendedor || '', p.cliente || '',
    prodText(p.productos), p.celular || '', p.turno || '', p.zona || '',
    p.direccion || '', p.maps || '', p.pagado ? 'SÍ' : 'NO',
    Number(p.saldo) || 0, Number(p.ts) || 0, JSON.stringify(p.productos || []),
    p.metodoPago || '', p.observaciones || '',
    p.estado || '', p.entregado ? 'SÍ' : 'NO',
    p.vehiculo || '', p.chofer || '', p.garantia || '',
    p.nota || '', Number(p.acuenta) || 0, p.facturarA || '', p.nit || '', Number(p.nroDia) || 0,
    p.verificado ? 'SÍ' : 'NO',
    (p.fotos && p.fotos.length) ? p.fotos.join(' | ') : '',
    Number(p.rev) || 0
  ];
}

function prodText(prods) {
  if (!prods || !prods.length) return '';
  return prods.map(function (x) {
    var s = x.desc || '';
    if (x.medida) s += ' · ' + x.medida;
    if (x.codigo) s += ' · cód ' + x.codigo;
    return s + ' × ' + x.cant;
  }).join('   |   ');
}

function parseProd(js, txt) {
  if (js) { try { var a = JSON.parse(js); if (a && a.length != null) return a; } catch (e) {} }
  txt = String(txt || '').trim();
  if (!txt) return [];
  return txt.split('|').map(function (s) {
    var m = s.trim().split('×');
    return { desc: (m[0] || '').trim(), medida: '', codigo: '', cant: parseInt(m[1] || '1', 10) || 1 };
  }).filter(function (p) { return p.desc; });
}

/** Día de la semana (0=domingo … 6=sábado) de una fecha 'YYYY-MM-DD'. */
function dowDeGs(fecha) {
  var m = String(fecha || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return -1;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getDay();
}

/** La fecha puede venir como texto 'YYYY-MM-DD' o como Date (si Sheets la reinterpreta). */
function fmtDate(v) {
  if (v == null || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    var m = v.getMonth() + 1, d = v.getDate();
    return v.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
  }
  return String(v);
}

/* ============================================================================
   BACKUP AUTOMÁTICO DIARIO
   Copia la planilla completa a una carpeta de Drive, conservando las últimas 30.
   Configuración (una sola vez): editor de Apps Script -> Activadores (icono reloj,
   panel izquierdo) -> Añadir activador -> función: backupDiario · fuente: Según tiempo
   · tipo: Temporizador diario · hora: 2 a.m. a 3 a.m. Guardar (pedirá permiso de Drive).
   Para probar: ejecutá backupDiario() a mano una vez desde el editor.
   ========================================================================== */
var BACKUP_FOLDER = 'Backups Pedidos MultiEspumas';
var BACKUP_KEEP = 30; // cuántas copias conservar

function backupDiario() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var folder = backupFolder_();
  var stamp = Utilities.formatDate(new Date(), 'GMT-4', 'yyyy-MM-dd_HH-mm');
  var copia = DriveApp.getFileById(ss.getId()).makeCopy('Pedidos ' + stamp, folder);
  purgeBackups_(folder, BACKUP_KEEP);
  return copia.getUrl();
}

/* ============================================================================
 * FOTOS DE LA ENTREGA — el chofer saca la foto y va a Drive. En una celda de la
 * planilla no entra una imagen, asi que en la hoja solo se guarda el ID del
 * archivo. Llega ya achicada desde el celular (~200 KB), no la foto original.
 * ========================================================================== */
var FOTOS_FOLDER = 'Fotos entregas MultiEspumas';

/* 📁 LA CARPETA DE FOTOS, BUSCADA UNA SOLA VEZ (§4dt).
   `getFoldersByName` recorre el Drive del dueño en CADA foto — con cuatro fotos por entrega
   son cuatro búsquedas al pedo. El id queda guardado en las propiedades del script; si
   alguien borra o mueve la carpeta, el `try` lo detecta y la vuelve a buscar sola.
   De paso se comparte LA CARPETA «cualquiera con el link»: los archivos que se crean adentro
   heredan ese permiso, que es lo que necesita `lh3.googleusercontent.com/d/<id>` para
   mostrar la foto sin sesión de Google (§4cd). El `setSharing` por archivo se mantiene igual
   —es el que está probado y funcionando— pero con la carpeta ya compartida deja de ser el
   único que sostiene el permiso. */
var FOTOS_PROP = 'FOTOS_FOLDER_ID';
function fotosFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(FOTOS_PROP);
  if (id) {
    try { return DriveApp.getFolderById(id); }
    catch (e) { try { props.deleteProperty(FOTOS_PROP); } catch (e2) {} }
  }
  var it = DriveApp.getFoldersByName(FOTOS_FOLDER);
  var f = it.hasNext() ? it.next() : DriveApp.createFolder(FOTOS_FOLDER);
  try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
  try { props.setProperty(FOTOS_PROP, f.getId()); } catch (e) {}
  return f;
}

function guardarFoto(body) {
  var d = String((body && body.dataUrl) || '');
  var m = d.match(/^data:(image\/[a-z+.\-]+);base64,(.+)$/i);
  if (!m) return jsonOut({ ok:false, error:'formato', version:SCRIPT_VERSION });
  var bytes;
  try { bytes = Utilities.base64Decode(m[2]); }
  catch (e) { return jsonOut({ ok:false, error:'ilegible', version:SCRIPT_VERSION }); }
  if (bytes.length > 6 * 1024 * 1024) return jsonOut({ ok:false, error:'muy_pesada', version:SCRIPT_VERSION });
  var ext = (m[1].indexOf('png') >= 0) ? 'png' : 'jpg';
  /* El nombre lleva de quién y de qué pedido es (§4ep): si la foto queda huérfana, el barrido
     puede decir «era de Mirian, del pedido tal» en vez de un archivo anónimo. */
  var limpio = function (s, n) { return String(s == null ? '' : s).replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, n); };
  var nombre = 'entrega_' + (limpio(body.cliente || body.id || 'x', 40) || 'x') +
               (body.id && body.id !== 'form' ? ('__' + limpio(body.id, 24)) : '') +
               (body.quien ? ('__por_' + limpio(body.quien, 24)) : '') +
               '_' + Utilities.formatDate(new Date(), 'GMT-4', 'yyyyMMdd_HHmmss') + '.' + ext;
  try {
    var f = fotosFolder_().createFile(Utilities.newBlob(bytes, m[1], nombre));
    f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return jsonOut({ ok:true, fotoId:f.getId(), version:SCRIPT_VERSION });
  } catch (e) {
    return jsonOut({ ok:false, error:String(e), version:SCRIPT_VERSION });
  }
}

/* Manda a la papelera una foto de entrega. SOLO si el archivo vive en la carpeta de fotos:
   este script corre con la cuenta del dueño y `getFileById` alcanza cualquier archivo de
   ese Drive — antes, con un id ajeno, borraba lo que fuera y contestaba «ok». Ahora
   revisa la carpeta y dice la verdad si algo falla (§4ce). */
function borrarFoto(body) {
  var id = String((body && body.fotoId) || '').trim();
  if (!id) return jsonOut({ ok:false, error:'sin id', version:SCRIPT_VERSION });
  try {
    var f = DriveApp.getFileById(id);
    var carpeta = fotosFolder_().getId(), nuestra = false;
    var padres = f.getParents();
    while (padres.hasNext()) { if (padres.next().getId() === carpeta) nuestra = true; }
    if (!nuestra) return jsonOut({ ok:false, error:'no_es_foto', version:SCRIPT_VERSION });
    f.setTrashed(true);
    return jsonOut({ ok:true, version:SCRIPT_VERSION });
  } catch (e) {
    return jsonOut({ ok:false, error:String(e), version:SCRIPT_VERSION });
  }
}

/* ============================================================================
   🖼️ FOTOS HUÉRFANAS — el barrido diario (§4ep)
   Una foto sube a Drive apenas se elige y se vincula al pedido recién al guardar. Si el
   formulario se abandona, el guardado se rechaza, o en Contabilidad se cambia de venta con
   una imagen «lista», el archivo queda en la carpeta sin que ninguna fila lo nombre: la
   vendedora se va convencida de que está, y Drive se llena. Una vez por día:
   · se juntan TODOS los ids nombrados en la planilla (los «%id» de los pagos y la columna
     de fotos de entrega, retiros incluidos);
   · cada archivo de la carpeta de fotos con más de HUERFANAS_DIAS_MIN día(s) y sin fila que
     lo nombre se mueve a «Fotos huérfanas MultiEspumas» (no a la papelera: por si alguien
     lo necesita);
   · lo que lleva más de HUERFANAS_PAPELERA_DIAS días subido y sigue sin dueño va a la
     papelera;
   · el resumen queda en HUERFANAS_ULTIMO y lo muestra la pestaña de Administración.
   ========================================================================== */
var HUERFANAS_FOLDER = 'Fotos huérfanas MultiEspumas';
var HUERFANAS_DIAS_MIN = 1;        // más nuevas que esto pueden estar «en camino» a un pedido
var HUERFANAS_PAPELERA_DIAS = 30;
function idsFotoEnUso_() {
  var vals = getSheet().getDataRange().getValues(), set = {};
  for (var i = 1; i < vals.length; i++) {
    (String(vals[i][15] || '').match(/%\s*[A-Za-z0-9_-]+/g) || []).forEach(function (s) { set[s.replace(/^%\s*/, '')] = 1; });
    String(vals[i][28] || '').split(/[\s|]+/).forEach(function (x) { if (x) set[x] = 1; });
  }
  return set;
}
function huerfanasFolder_() {
  var it = DriveApp.getFoldersByName(HUERFANAS_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(HUERFANAS_FOLDER);
}
/** ▶️ Corre solo cada día (instalarDisparadores). También se puede correr a mano desde el editor. */
function barrerFotosHuerfanas() {
  var res = { ts: new Date().toISOString(), revisadas: 0, movidas: 0, papelera: 0, lista: [], error: '' };
  try {
    var enUso = idsFotoEnUso_(), ahora = Date.now();
    var lim = ahora - HUERFANAS_DIAS_MIN * 86400000, limPap = ahora - HUERFANAS_PAPELERA_DIAS * 86400000;
    var carpeta = fotosFolder_(), hu = huerfanasFolder_();
    var it = carpeta.getFiles();
    while (it.hasNext()) {
      var f = it.next(); res.revisadas++;
      var t = f.getDateCreated().getTime();
      if (t > lim || enUso[f.getId()]) continue;
      try { f.moveTo(hu); } catch (e1) { try { hu.addFile(f); carpeta.removeFile(f); } catch (e2) { continue; } }
      res.movidas++;
      if (res.lista.length < 50) res.lista.push({ id: f.getId(), nombre: f.getName(), ts: t });
    }
    var it2 = hu.getFiles();
    while (it2.hasNext()) {
      var h = it2.next();
      if (h.getDateCreated().getTime() < limPap && !enUso[h.getId()]) { h.setTrashed(true); res.papelera++; }
    }
  } catch (e) { res.error = String((e && e.message) || e); }
  try { PropertiesService.getScriptProperties().setProperty('HUERFANAS_ULTIMO', JSON.stringify(res)); } catch (e3) {}
  return res;
}

function backupFolder_() {
  var it = DriveApp.getFoldersByName(BACKUP_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(BACKUP_FOLDER);
}

function purgeBackups_(folder, keep) {
  var files = [], it = folder.getFiles();
  while (it.hasNext()) files.push(it.next());
  files.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  for (var i = keep; i < files.length; i++) files[i].setTrashed(true);
}

/* ============================================================================
 * 📥 BORRADORES DE KOMMO (§4cc)
 *
 * Cuando una venta pasa a «Compradores» en Kommo, Kommo avisa acá y esta parte deja
 * el BORRADOR en la planilla: cliente, celular, productos y monto ya cargados. La
 * vendedora solo completa la entrega (fecha, turno, zona) en el panel.
 *
 * ⚠️ UN BORRADOR NO ES UN PEDIDO. Va con la fecha VACÍA y con la marca
 * `Estado stock = "Borrador Kommo"`. Con la fecha vacía no pasa por el portero de
 * cupos ni por el de días cerrados (mirá doSave: los dos preguntan por p.fecha), así
 * que NO ocupa lugar en ningún camión. Y el panel los saca de la lista de pedidos
 * antes de que lleguen a ninguna pantalla.
 *
 * ⚠️ LO QUE ESTE CÓDIGO NUNCA HACE: tocar un pedido que ya existe. Solo agrega filas
 * nuevas, y solo si ese lead no está ya cargado. El peor error posible es una fila de
 * más, que se descarta con un clic desde el panel.
 *
 * ── CÓMO SE CONFIGURA (una sola vez) ────────────────────────────────────────
 * 1. Apps Script → ⚙️ Configuración del proyecto → Propiedades del script → Agregar:
 *      KOMMO_TOKEN      = el token largo de Kommo   (NUNCA en el código: esto es público)
 *      KOMMO_HOOK_KEY   = una clave inventada, larga, ej. "hv7Kq2pR9mZx4Ln8"
 *      KOMMO_SUBDOMAIN  = eanez                     (opcional, ya viene por defecto)
 *      KOMMO_ETAPA      = 103450711                 (opcional, «Compradores»)
 * 2. Implementar → Administrar implementaciones → ✏️ → Nueva versión → Implementar.
 * 3. Kommo → Configuración → Integraciones → Webhooks → Agregar:
 *      dirección: <la URL /exec del panel>?k=<la misma KOMMO_HOOK_KEY>
 *      evento:    "Etapa del lead cambiada" (status_lead)
 *    ⚠️ Es un webhook NUEVO. El que ya apunta a Cloudflare no se toca ni se reemplaza.
 * ========================================================================== */
var BORRADOR_EST = 'Borrador Kommo';
var BORRADOR_PREF = 'kommo-';
var KOMMO_ETAPA_DEFAULT = '103450711';   // «Compradores» del embudo 13349719
var KOMMO_EMBUDO_DEFAULT = '13349719';   // embudo «Ventas» (el único que usa el negocio)
var KOMMO_CATALOGO = 10902;              // catálogo «Productos»
var KOMMO_CF_PRECIO = 1685378;           // campo PRECIO del catálogo
var KOMMO_CF_TEL = 1685346;              // campo Teléfono del contacto
var KOMMO_CF_DIR = 1685406;              // campo «Dirección entrega» del lead

function kProp_(k, def) {
  var v = PropertiesService.getScriptProperties().getProperty(k);
  return (v == null || v === '') ? (def || '') : String(v);
}

/** Llamada a la API de Kommo. Devuelve null si algo falla (nunca revienta el webhook). */
function kGet_(path) {
  var tok = kProp_('KOMMO_TOKEN');
  if (!tok) return null;
  var url = 'https://' + kProp_('KOMMO_SUBDOMAIN', 'eanez') + '.kommo.com/api/v4' + path;
  try {
    var r = UrlFetchApp.fetch(url, {
      method: 'get', muteHttpExceptions: true,
      headers: { Authorization: 'Bearer ' + tok }
    });
    var code = r.getResponseCode();
    if (code === 204) return {};                 // Kommo contesta 204 cuando la consulta no trae nada
    if (code !== 200) return null;
    return JSON.parse(r.getContentText());
  } catch (err) { return null; }
}

function kEmb_(o, k) { return ((o || {})._embedded || {})[k] || []; }

/** El valor de un campo personalizado, por id. */
function kCampo_(o, fid) {
  var a = (o && o.custom_fields_values) || [];
  for (var i = 0; i < a.length; i++) {
    if (String(a[i].field_id) === String(fid)) {
      var v = (a[i].values || [])[0];
      return v ? String(v.value == null ? '' : v.value) : '';
    }
  }
  return '';
}

/* ── El webhook de Kommo ──────────────────────────────────────────────────── */
function kommoHook(e) {
  var clave = kProp_('KOMMO_HOOK_KEY');
  // Sin clave configurada NO se acepta nada: es preferible que no funcione a que
  // cualquiera pueda meter pedidos falsos en la planilla.
  if (!clave) return jsonOut({ ok:false, error:'sin clave configurada' });
  if (String(e.parameter.k || e.parameter.kommo || '') !== clave) return jsonOut({ ok:false, error:'clave incorrecta' });

  var etapa = kProp_('KOMMO_ETAPA', KOMMO_ETAPA_DEFAULT);
  var embudo = kProp_('KOMMO_EMBUDO', KOMMO_EMBUDO_DEFAULT);
  var p = e.parameter || {}, ids = [], sinEtapa = 0, tipos = [];
  /* Kommo manda "leads[status][0][id]" cuando una venta CAMBIA de etapa. Pero cuando la
     vendedora la CREA ya en «Compradores» manda "leads[add][0][id]", y cuando la edita
     "leads[update][0][id]" — y el aviso solo miraba el primero: así se perdió la venta de
     Erwin el 05/09 (§4cg). Se miran los tres; repetir no duplica, `leadYaCargado_`
     descarta lo que ya está. El tope de 50 por tipo es para que un aviso raro no cuelgue. */
  ['status', 'add', 'update'].forEach(function (tipo) {
    for (var i = 0; i < 50; i++) {
      var pre = 'leads[' + tipo + '][' + i + ']';
      var id = p[pre + '[id]'];
      if (!id) break;
      if (i === 0) tipos.push(tipo);
      var st = String(p[pre + '[status_id]'] || '');
      var pi = String(p[pre + '[pipeline_id]'] || '');
      var pasa;
      if (st) {
        // El aviso dice en qué etapa quedó: se filtra acá sin gastar una llamada a Kommo.
        pasa = (st === String(etapa)) && (!pi || !embudo || pi === String(embudo));
      } else {
        /* El aviso NO dice la etapa. Pasa solo para el alta y el cambio de etapa (los dos
           que crean ventas), con tope, y el que decide de verdad es crearBorradorDeLead_:
           lee el lead y comprueba etapa y embudo. Así un aviso incompleto no se pierde en
           silencio, y tampoco entra una venta de otra etapa. */
        pasa = (tipo !== 'update') && (sinEtapa < 10);
        if (pasa) sinEtapa++;
      }
      if (pasa && ids.indexOf(String(id)) < 0) ids.push(String(id));
    }
  });
  /* 🔎 Rastro para diagnosticar el webhook SIN guardar datos de nadie: cuándo llegó el
     último aviso, de qué tipo y cuántos leads traía. Si el repaso de respaldo dice
     «último aviso hace 3 días», el problema está en Kommo y no en este script. */
  kMarcaHook_(tipos, ids.length);
  /* ⚡ CONTESTAR YA (§4eg). Kommo espera la respuesta unos pocos segundos y, si no llega,
     da el aviso por fallido; tras varios seguidos APAGA el webhook sin avisar («desactivado
     debido a una respuesta no válida», 16/09). Armar el borrador acá adentro son hasta
     cuatro llamadas a Kommo más el candado de la planilla: con Google lento, minutos.
     Ahora el aviso solo ANOTA los ids en la cola y contesta; un disparador de tiempo
     procesa la cola enseguida (kommoProcesarCola) y, pase lo que pase, kommoRepaso los
     agarra en el próximo repaso de 5 minutos. Sin disparadores (falta autorizar ScriptApp)
     se hace como antes, en el momento. */
  return kommoEncolar_(ids);
}

/* ── La cola del webhook y los disparadores de tiempo (§4eg) ─────────────── */
var KOMMO_COLA_TOPE = 200;               // ids como mucho; una propiedad aguanta 9 KB
function kColaLeer_() {
  try { var a = JSON.parse(prop_('KOMMO_COLA') || '[]'); return Array.isArray(a) ? a.map(String) : []; }
  catch (e) { return []; }
}
function kColaGuardar_(ids) {
  try { PropertiesService.getScriptProperties().setProperty('KOMMO_COLA', JSON.stringify(ids.slice(-KOMMO_COLA_TOPE))); } catch (e) {}
}
/* Saca de la cola SOLO los que se procesaron: uno que entró mientras tanto se queda. */
function kColaQuitar_(ids) {
  kColaGuardar_(kColaLeer_().filter(function (id) { return ids.indexOf(String(id)) < 0; }));
}
/* ── Los descartados (§4et) ──────────────────────────────────────────────────
   «Descartar» en el panel borra la fila `kommo-<lead>`. Pero el lead sigue en «Compradores»
   y el repaso (cada 5 min el del script, cada ~3,5 h el de GitHub) lo veía como nuevo y lo
   volvía a traer: descartar no descartaba. Ahora `doDelete` anota el lead en la propiedad
   KOMMO_DESCARTADOS ({ lead: día }) y `kommoProcesarObj_` lo saltea como «descartado».
   · Se olvida a los KOMMO_DESCARTE_DIAS (60): una venta que de verdad vuelva meses después
     entra de nuevo; antes de eso la vendedora la carga a mano (y si la carga a mano, la
     marca `klead` de «Sí, es la misma» la cubre igual).
   · Tope de KOMMO_DESCARTE_TOPE (300) entradas, las más viejas primero: una propiedad
     aguanta 9 KB y cada entrada son ~16 caracteres.
   · ⚠️ La memoria vive en el SERVIDOR a propósito: el mirror del panel es por dispositivo. */
var KOMMO_DESCARTE_TOPE = 300, KOMMO_DESCARTE_DIAS = 60;
function kDiaHoy_() { return Math.floor(Date.now() / 86400000); }
function kDescartadosLeer_() {
  try { var o = JSON.parse(prop_('KOMMO_DESCARTADOS') || '{}'); return (o && typeof o === 'object' && !Array.isArray(o)) ? o : {}; }
  catch (e) { return {}; }
}
function kDescartar_(leadId) {
  try {
    var o = kDescartadosLeer_(), hoy = kDiaHoy_(), k;
    for (k in o) if (!(hoy - Number(o[k]) <= KOMMO_DESCARTE_DIAS)) delete o[k];   // los vencidos se olvidan
    o[String(leadId)] = hoy;
    var ks = Object.keys(o);
    if (ks.length > KOMMO_DESCARTE_TOPE) {
      ks.sort(function (a, b) { return Number(o[a]) - Number(o[b]); });
      while (ks.length > KOMMO_DESCARTE_TOPE) delete o[ks.shift()];
    }
    PropertiesService.getScriptProperties().setProperty('KOMMO_DESCARTADOS', JSON.stringify(o));
  } catch (e) {}
}
/** ¿Ese lead lo descartó una vendedora hace menos de KOMMO_DESCARTE_DIAS? */
function kDescartado_(leadId) {
  var d = kDescartadosLeer_()[String(leadId)];
  if (d == null) return false;
  return (kDiaHoy_() - Number(d)) <= KOMMO_DESCARTE_DIAS;
}
function kTriggersDe_(fn) {
  try { return ScriptApp.getProjectTriggers().filter(function (t) { return t.getHandlerFunction() === fn; }); }
  catch (e) { return []; }
}
/** Deja UN solo disparador de una vez para procesar la cola. false = no se pudo. */
function kDespertar_() {
  if (typeof ScriptApp === 'undefined') return false;
  try {
    if (kTriggersDe_('kommoProcesarCola').length) return true;      // ya hay uno esperando
    ScriptApp.newTrigger('kommoProcesarCola').timeBased().after(1000).create();
    return true;
  } catch (e) { return false; }
}
/* Encola y contesta. `origen` = 'webhook' (Kommo) o 'repaso' (el workflow de GitHub, §4et):
   los dos caminos contestan al instante y el disparador hace el trabajo. Si no hay
   disparadores (ScriptApp sin autorizar), se procesa en el momento, como siempre. */
function kommoEncolar_(ids, origen) {
  origen = origen || 'webhook';
  var hook = kUltimoHook_(), ultRep = prop_('KOMMO_REPASO_ULTIMO');
  if (!ids.length) return jsonOut({ ok:true, version:SCRIPT_VERSION, origen:origen, creados:0, ids:[], encolados:0, ultimoHook:hook.ts || '', ultimoRepaso:ultRep });
  var cola = kColaLeer_();
  ids.forEach(function (id) { if (cola.indexOf(id) < 0) cola.push(id); });
  kColaGuardar_(cola);
  if (kDespertar_()) {
    return jsonOut({ ok:true, version:SCRIPT_VERSION, origen:origen, diferido:true, creados:0, ids:[], encolados:ids.length, cola:cola.length, ultimoHook:hook.ts || '', ultimoRepaso:ultRep });
  }
  var r = kommoProcesarObj_(ids, origen);          // sin disparadores: como antes, en el momento
  if (r.ok !== false) kColaQuitar_(ids);           // con busy la cola se queda (§4et)
  return jsonOut(r);
}
/** Disparador de una vez: procesa lo que dejó el webhook. Se borra a sí mismo primero,
    así un aviso que llegue mientras tanto deja uno nuevo.
    ⚠️ Con el candado ocupado (`busy`) la cola NO se vacía (§4et): antes los ids salían
    igual y, si además Kommo no contestaba en el repaso, la venta quedaba sin nada que la
    trajera hasta el repaso de GitHub (horas). Queda la cola y se deja otro disparador. */
function kommoProcesarCola() {
  kTriggersDe_('kommoProcesarCola').forEach(function (t) { try { ScriptApp.deleteTrigger(t); } catch (e) {} });
  var ids = kColaLeer_();
  if (!ids.length) return { ok:true, creados:0 };
  var r = kommoProcesarObj_(ids, 'cola');
  if (r.ok === false) { r.cola = ids.length; r.reintento = kDespertar_(); return r; }
  kColaQuitar_(ids);
  return r;
}
/** Disparador cada 5 minutos: la cola primero y después le pregunta a Kommo qué hay en
    «Compradores» de las últimas horas (KOMMO_REPASO_MIN, 6 h por defecto). Mismo camino que
    el webhook y que el repaso de GitHub: no duplica. Deja un resumen en KOMMO_REPASO_ULTIMO
    (sin nombres ni teléfonos). */
function kommoRepaso() {
  var res = { ts:new Date().toISOString(), cola:0, vistos:0, creados:0, error:'' };
  try {
    var cola = kColaLeer_();
    if (cola.length) {
      var rc = kommoProcesarObj_(cola, 'cola');
      res.cola = cola.length; res.creados += (rc.creados || 0);
      // busy: la cola se queda para el próximo repaso, y el resumen lo dice (§4et)
      if (rc.ok === false) res.error = String(rc.error || 'busy') + ' (la cola queda para el próximo repaso)';
      else kColaQuitar_(cola);
    }
    var etapa = kProp_('KOMMO_ETAPA', KOMMO_ETAPA_DEFAULT), embudo = kProp_('KOMMO_EMBUDO', KOMMO_EMBUDO_DEFAULT);
    var min = Number(kProp_('KOMMO_REPASO_MIN', '360')) || 360;
    var desde = Math.floor(Date.now() / 1000) - min * 60;
    var r = kGet_('/leads?limit=100&order[updated_at]=desc' +
                  '&filter[statuses][0][pipeline_id]=' + encodeURIComponent(embudo) +
                  '&filter[statuses][0][status_id]=' + encodeURIComponent(etapa) +
                  '&filter[updated_at][from]=' + desde);
    if (r === null) { res.error = (res.error ? res.error + ' · ' : '') + 'kommo no contestó'; }
    else {
      var ids = kEmb_(r, 'leads').map(function (x) { return String(x.id || ''); }).filter(function (x) { return !!x; });
      res.vistos = ids.length;
      if (ids.length) {
        var rr = kommoProcesarObj_(ids, 'repaso-script');
        res.creados += (rr.creados || 0); res.saltados = (rr.saltados || []).length;
        if (rr.ok === false) res.error = (res.error ? res.error + ' · ' : '') + String(rr.error || 'busy') + ' (Kommo se vuelve a mirar en el próximo repaso)';
      }
    }
  } catch (e) { res.error = String((e && e.message) || e); }
  try { PropertiesService.getScriptProperties().setProperty('KOMMO_REPASO_ULTIMO', JSON.stringify(res)); } catch (e) {}
  return res;
}
/** ▶️ CORRER UNA VEZ desde el editor (Ejecutar ▸ instalarDisparadores): deja el repaso
    cada 5 minutos. Pide autorización la primera vez; es normal. */
function instalarDisparadores() {
  ['kommoRepaso', 'kommoProcesarCola', 'barrerFotosHuerfanas'].forEach(function (fn) { kTriggersDe_(fn).forEach(function (t) { ScriptApp.deleteTrigger(t); }); });
  ScriptApp.newTrigger('kommoRepaso').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('barrerFotosHuerfanas').timeBased().everyDays(1).atHour(3).create();   // 🖼️ §4ep, de madrugada
  var msg = '✅ Listo: kommoRepaso corre cada 5 minutos y barrerFotosHuerfanas una vez por día (3 am). Último repaso: ' + (prop_('KOMMO_REPASO_ULTIMO') || '(todavía ninguno; el primero sale en 5 minutos)');
  if (typeof Logger !== 'undefined') Logger.log(msg);
  return msg;
}
/** ▶️ Para mirar desde el editor cómo anda Kommo: último aviso, último repaso, cola. */
function estadoKommo() {
  var s = { ultimoHook: prop_('KOMMO_ULTIMO_HOOK'), ultimoRepaso: prop_('KOMMO_REPASO_ULTIMO'), enCola: kColaLeer_().length, repasoInstalado: kTriggersDe_('kommoRepaso').length > 0 };
  if (typeof Logger !== 'undefined') Logger.log(JSON.stringify(s, null, 2));
  return s;
}

/** Anota el último aviso recibido (fecha, tipos y cuántos). Nunca nombres ni teléfonos. */
function kMarcaHook_(tipos, n) {
  try {
    PropertiesService.getScriptProperties().setProperty('KOMMO_ULTIMO_HOOK',
      JSON.stringify({ ts: new Date().toISOString(), tipos: tipos, leads: n }));
  } catch (e) {}
}
function kUltimoHook_() {
  try { return JSON.parse(prop_('KOMMO_ULTIMO_HOOK') || '{}'); } catch (e) { return {}; }
}

/* ── El repaso de respaldo (workflow de GitHub) ───────────────────────────── */
function kommoLeads(body) {
  var clave = kProp_('KOMMO_HOOK_KEY');
  if (!clave) return jsonOut({ ok:false, error:'sin clave configurada' });
  if (String(body.key || '') !== clave) return jsonOut({ ok:false, error:'clave incorrecta' });
  var ids = (body.leads || []).map(function (x) { return String(x); }).slice(0, 100);
  /* ⚡ Igual que el webhook (§4et): encola y contesta. Procesar acá adentro eran hasta 4
     llamadas a Kommo por lead; con 9 leads el workflow de GitHub cortaba a los 90 s (run
     101) mientras el script seguía trabajando a ciegas, y el registro decía «no aceptó el
     aviso» con la planilla bien. Sin disparadores se hace en el momento, como antes. */
  return kommoEncolar_(ids, 'repaso');
}

/* ⚠️ TODO LO QUE HABLA CON KOMMO VA **ANTES** DEL CANDADO (§4dt).
   Armar UN borrador son hasta CUATRO pedidos de red a eanez.kommo.com (el lead, el contacto,
   el catálogo y la vendedora). Hacerlos con el candado tomado dejaba la planilla trabada todo
   ese rato — y el repaso de respaldo corre **cada 10 minutos**, así que el equipo entero
   esperaba a que Kommo contestara para entrar o para guardar. Con 5 leads eran ~20 llamadas
   seguidas: minutos con la planilla cerrada.
   Ahora se arma todo afuera y el candado se toma SOLO para escribir las filas.
   ⚠️ La garantía de «no duplicar» NO se afloja: `leadYaCargado_` se vuelve a comprobar
   DENTRO del candado, porque entre que se armó el borrador y el momento de escribirlo pudo
   entrar otro aviso de Kommo con el mismo lead. */
function kommoProcesar_(ids, origen) { return jsonOut(kommoProcesarObj_(ids, origen)); }
function kommoProcesarObj_(ids, origen) {
  var hook = kUltimoHook_();
  if (!ids.length) return ({ ok:true, version:SCRIPT_VERSION, origen:origen, creados:0, ids:[], ultimoHook:hook.ts || '', ultimoRepaso:prop_('KOMMO_REPASO_ULTIMO') });
  var shPre = getSheet(), listos = [], saltados = [], reparar = [];
  for (var j = 0; j < ids.length; j++) {
    if (leadYaCargado_(shPre, ids[j])) {
      saltados.push(ids[j] + ':ya estaba');
      /* Los que ya estaban pueden haber quedado con el nombre que les puso Kommo («Lead #123»).
         Lo que hay que preguntarle a Kommo se pregunta ACÁ, afuera (§4et): antes iba adentro
         del candado y cada repaso trababa la planilla dos llamadas de red por borrador
         mientras el contacto siguiera sin nombre. */
      var rep = repararNombrePrep_(shPre, ids[j]);
      if (rep) reparar.push(rep);
      continue;
    }
    if (kDescartado_(ids[j])) { saltados.push(ids[j] + ':descartado'); continue; }   // lo descartó una vendedora (§4et)
    var arm = borradorDeLead_(ids[j]);              // ← sin candado: acá se habla con Kommo
    if (typeof arm === 'string') { saltados.push(ids[j] + ':' + arm); continue; }
    listos.push({ id: ids[j], rec: arm });
  }
  /* Y si no hay NADA que escribir, ni se toma el candado. Es el caso normal: el repaso
     corre cada 5 minutos y casi siempre no encuentra ventas nuevas — antes trababa la
     planilla igual, cientos de veces por día, para no hacer nada. Un lead que «ya estaba»
     con nombre propio tampoco lo toma (§4et). */
  if (!listos.length && !reparar.length) {
    return ({ ok:true, version:SCRIPT_VERSION, origen:origen,
                     creados:0, ids:[], saltados:saltados, reparados:0, ultimoHook:hook.ts || '', ultimoRepaso:prop_('KOMMO_REPASO_ULTIMO') });
  }
  var lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (err) { return ({ ok:false, error:'busy', version:SCRIPT_VERSION, origen:origen }); }
  try {
    var sh = getSheet(), hechos = [], reparados = [];
    for (var i = 0; i < listos.length; i++) {
      if (leadYaCargado_(sh, listos[i].id)) { saltados.push(listos[i].id + ':ya estaba'); continue; }
      sh.appendRow(recToRow(listos[i].rec));
      hechos.push(listos[i].id);
    }
    if (hechos.length) getCacheOlvidar_();
    // Adentro solo se escribe la celda, revalidando que siga siendo un borrador sin nombre.
    for (var k = 0; k < reparar.length; k++) if (repararNombreAplicar_(sh, reparar[k])) reparados.push(reparar[k].id);
    return ({ ok:true, version:SCRIPT_VERSION, origen:origen,
                     creados:hechos.length, ids:hechos, saltados:saltados,
                     reparados:reparados.length, ultimoHook:hook.ts || '', ultimoRepaso:prop_('KOMMO_REPASO_ULTIMO') });
  } finally { lock.releaseLock(); }
}

/* 🏷️ EL NOMBRE DEL CLIENTE (§4ch).
   Cuando la vendedora crea la venta desde el chat, Kommo la titula sola: «Lead #39357288».
   Ese título llegaba tal cual al panel y la vendedora veía un número en vez de su cliente
   (reportado con la venta de Erwin). El nombre de verdad está en el CONTACTO. */
function nombreGenerico_(t) {
  var s = String(t || '').trim();
  if (!s) return true;
  // «Lead #39357288», «Negocio 123», «#123», «39357288»
  if (/^(lead|deal|trato|negocio|venta|prospecto|oportunidad|cliente)?\s*#?\s*\d{3,}$/i.test(s)) return true;
  if (/^(sin nombre|sin titulo|sin título|nuevo lead|new lead|unsorted|sin clasificar|desconocido)$/i.test(s)) return true;
  return false;
}
/** El nombre del lead si sirve; si no, el del contacto principal. Puede devolver ''. */
function nombreDeLead_(lead) {
  var cli = String((lead && lead.name) || '').trim();
  if (!nombreGenerico_(cli)) return cli;
  var cts = kEmb_(lead, 'contacts');
  if (!cts.length) return cli;
  var principal = cts[0];
  for (var i = 0; i < cts.length; i++) if (cts[i].is_main) { principal = cts[i]; break; }
  // El nombre puede venir en el propio vínculo; si no, se lee el contacto.
  var nom = String(principal.name || '').trim();
  if (!nom) {
    var ct = kGet_('/contacts/' + principal.id);
    nom = String((ct && ct.name) || '').trim();
  }
  return nombreGenerico_(nom) ? cli : nom;
}
/** ¿Este lead está en la etapa (y el embudo) que disparan el pedido? */
function leadEnEtapa_(lead) {
  var etapa = kProp_('KOMMO_ETAPA', KOMMO_ETAPA_DEFAULT);
  var embudo = kProp_('KOMMO_EMBUDO', KOMMO_EMBUDO_DEFAULT);
  if (String((lead && lead.status_id) || '') !== String(etapa)) return false;
  // El embudo solo se exige si el lead lo trae: un lead sin ese dato no se descarta.
  if (embudo && lead.pipeline_id && String(lead.pipeline_id) !== String(embudo)) return false;
  return true;
}
/* Le corrige el nombre a un borrador que YA existe y quedó con el número de Kommo.
   Se toca ÚNICAMENTE la celda del cliente, y solo si el borrador sigue sin completar y su
   nombre sigue siendo genérico: si alguien ya lo escribió a mano, no se toca nada.
   ⚠️ NO se le pone sello de revisión a propósito. El borrador nace con sello 0 («nunca
   guardado»), y así quien lo complete no choca contra un conflicto por esta corrección. */
function repararNombreBorrador_(sh, leadId) {
  var rep = repararNombrePrep_(sh, leadId);
  return !!(rep && repararNombreAplicar_(sh, rep));
}
/* La fila del borrador `kommo-<lead>` y su nombre actual, solo si sigue siendo un borrador
   con nombre genérico. {fila, actual} o null. */
function borradorGenerico_(sh, leadId) {
  var last = sh.getLastRow();
  if (last < 2) return null;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  var buscado = BORRADOR_PREF + leadId, fila = -1;
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === buscado) { fila = i + 2; break; }
  if (fila < 0) return null;
  var colCli = HEADERS.indexOf('Cliente') + 1, colEst = HEADERS.indexOf('Estado stock') + 1;
  if (String(sh.getRange(fila, colEst).getValue() || '') !== BORRADOR_EST) return null;   // ya lo completaron
  var actual = String(sh.getRange(fila, colCli).getValue() || '').trim();
  if (!nombreGenerico_(actual)) return null;                                              // ya tiene nombre propio
  return { fila: fila, actual: actual };
}
/** AFUERA del candado (§4et): mira la hoja y le pregunta a Kommo. Devuelve {id, nombre} si
    hay un nombre mejor para escribir, o null (y entonces no hace falta ni tomar el candado). */
function repararNombrePrep_(sh, leadId) {
  var b = borradorGenerico_(sh, leadId);
  if (!b) return null;
  var lead = kGet_('/leads/' + leadId + '?with=contacts');
  if (!lead || !lead.id) return null;
  var nombre = nombreDeLead_(lead);
  if (!nombre || nombreGenerico_(nombre) || nombre === b.actual) return null;
  return { id: String(leadId), nombre: nombre };
}
/** ADENTRO del candado: vuelve a mirar la fila (pudo completarse o cambiar de nombre
    mientras se hablaba con Kommo) y escribe solo la celda del cliente. */
function repararNombreAplicar_(sh, rep) {
  var b = borradorGenerico_(sh, rep.id);
  if (!b || rep.nombre === b.actual) return false;
  sh.getRange(b.fila, HEADERS.indexOf('Cliente') + 1).setValue(rep.nombre);
  return true;
}

/** ¿Ese lead ya está cargado? Por id `kommo-<lead>` o por la marca `klead` que deja
 *  el panel cuando la vendedora dice "esta venta ya la tenía cargada a mano". */
function leadYaCargado_(sh, leadId) {
  var last = sh.getLastRow();
  if (last < 2) return false;
  var idCol = sh.getRange(2, 1, last - 1, 1).getValues();
  var buscado = BORRADOR_PREF + leadId;
  for (var i = 0; i < idCol.length; i++) if (String(idCol[i][0]) === buscado) return true;
  // La marca viaja adentro del JSON de productos (col 15), igual que el precio y las ATC.
  var jsonCol = sh.getRange(2, 15, last - 1, 1).getValues();
  var marca = '"klead":"' + leadId + '"';
  for (var j = 0; j < jsonCol.length; j++) {
    var t = String(jsonCol[j][0] || '');
    if (t && t.replace(/\s/g, '').indexOf(marca) >= 0) return true;
  }
  return false;
}

/** Devuelve true si creó el borrador, o un texto con el motivo por el que no. */
/* Arma el borrador y lo escribe. Se mantiene por compatibilidad y para probarlo suelto;
   el camino de verdad (`kommoProcesar_`) usa `borradorDeLead_` + `appendRow` para no hablar
   con Kommo con el candado tomado (§4dt). */
function crearBorradorDeLead_(leadId) {
  var sh = getSheet();
  if (leadYaCargado_(sh, leadId)) return 'ya estaba';
  if (kDescartado_(leadId)) return 'descartado';
  var rec = borradorDeLead_(leadId);
  if (typeof rec === 'string') return rec;
  getSheet().appendRow(recToRow(rec));
  return true;
}
/* Todo lo que hay que preguntarle a Kommo para armar un borrador. NO toca la planilla para
   escribir: devuelve el pedido listo, o el motivo por el que no se puede. */
function borradorDeLead_(leadId) {
  var lead = kGet_('/leads/' + leadId + '?with=contacts,catalog_elements');
  if (!lead || !lead.id) return 'no se pudo leer el lead';
  /* ⚠️ La etapa se comprueba ACÁ, con el lead en la mano, y no solo en el aviso: algunos
     avisos de Kommo llegan sin `status_id` y el hook los deja pasar a propósito para no
     perderlos. Este es el portero de verdad (§4ch). */
  if (!leadEnEtapa_(lead)) return 'no está en la etapa que dispara';

  // ── El celular vive en el CONTACTO, no en el lead. El nombre, casi siempre también ──
  var cel = '', cli = nombreDeLead_(lead);
  var cts = kEmb_(lead, 'contacts');
  if (cts.length) {
    var princ = cts[0];
    for (var ci = 0; ci < cts.length; ci++) if (cts[ci].is_main) { princ = cts[ci]; break; }
    var ct = kGet_('/contacts/' + princ.id);
    if (ct) {
      cel = kCampo_(ct, KOMMO_CF_TEL);
      if (nombreGenerico_(cli) && ct.name) cli = String(ct.name).trim();
    }
  }

  // ── Los productos del catálogo, si la vendedora los enganchó ──
  var prods = [], els = kEmb_(lead, 'catalog_elements');
  if (els.length) {
    /* El elemento dice de qué catálogo es (`metadata.catalog_id`); si no lo dice, el de
       «Productos». Antes se preguntaba SIEMPRE al catálogo fijo y un producto de otro
       catálogo llegaba al panel sin nombre (§4et). Una consulta por catálogo. */
    var porCat = {}, cats = [];
    for (var i = 0; i < els.length; i++) {
      var cid = String((els[i].metadata || {}).catalog_id || KOMMO_CATALOGO);
      if (!porCat[cid]) { porCat[cid] = []; cats.push(cid); }
      porCat[cid].push('filter[id][]=' + encodeURIComponent(els[i].id));
    }
    var porId = {};
    for (var c = 0; c < cats.length; c++) {
      var cat = kGet_('/catalogs/' + cats[c] + '/elements?' + porCat[cats[c]].join('&'));
      kEmb_(cat, 'elements').forEach(function (el) { porId[cats[c] + ':' + String(el.id)] = el; });
    }
    for (var j = 0; j < els.length; j++) {
      var meta = els[j].metadata || {}, el = porId[String(meta.catalog_id || KOMMO_CATALOGO) + ':' + String(els[j].id)] || {};
      var precio = Number(meta.price);
      if (!(precio > 0)) precio = Number(kCampo_(el, KOMMO_CF_PRECIO)) || 0;
      prods.push({ desc: String(el.name || '').trim(), medida: '', codigo: '',
                   cant: Number(meta.quantity) || 1, precio: precio > 0 ? precio : undefined });
    }
  }

  // ── La vendedora: Kommo la llama «Maria Flores - Buenos Aires» ──
  var vend = '';
  var us = kGet_('/users/' + lead.responsible_user_id);
  if (us && us.name) vend = String(us.name).split(/\s+[-–]\s+/)[0].trim();

  var borrador = {
    id: BORRADOR_PREF + leadId,
    fecha: '',                       // ⚠️ vacía: así no ocupa cupo ni pasa por el portero
    oc: '', turno: '', zona: '', maps: '', nota: '', nroDia: 0,
    vendedor: vend, cliente: cli, celular: cel,
    productos: prods,
    direccion: kCampo_(lead, KOMMO_CF_DIR),
    pagado: false,
    saldo: Number(lead.price) || 0,  // el monto de la venta, para que ella lo confirme
    acuenta: 0, cobradoBs: 0, metodoPago: '',
    observaciones: '',
    estado: BORRADOR_EST,            // ⚠️ ESTA es la marca que lo distingue de un pedido
    entregado: false, verificado: false,
    vehiculo: '', chofer: '', garantia: '', facturarA: '', nit: '',
    ts: Date.now(), fotos: []
  };
  return borrador;
}
