/* ============================================================================
 * 🔐 LA CLAVE DEL EQUIPO Y LA DE ADMINISTRACIÓN — archivo APARTE (23/11/2026; dueño: «tengo listo para el viernes, ese día lo haré»)
 *
 * Para qué: hoy el servidor del panel acepta todo SIN clave (PANEL_KEY sin poner): cualquiera con su dirección (que está en la
 * página pública del panel) puede leer y borrar la planilla. El servidor 2026-11-21-a YA sabe pedir la clave: no hay que cambiarlo.
 * Este archivo solo pone las propiedades, en DOS FASES para que nadie quede sin panel:
 *
 *   FASE 1 (unos días antes, o temprano el mismo día)
 *   ▶ generarClavesUnaVez   — inventa la clave del equipo y la de administración, las guarda como «PRÓXIMAS» (PANEL_KEY_PROXIMA,
 *                             ADMIN_KEY_PROXIMA) y las muestra en una VENTANA de la planilla (tené la planilla abierta en otra pestaña:
 *                             la ventana aparece ahí). El servidor todavía NO las pide: cada uno las carga en su aparato con tiempo.
 *                             Si ya estaban generadas, no las cambia (para verlas otra vez: mostrarClavesUnaVez).
 *   ▶ mostrarClavesUnaVez   — vuelve a mostrar las claves (las próximas o, si ya se prendieron, las que rigen).
 *
 *   FASE 2 (el día elegido, temprano)
 *   ▶ activarClavesUnaVez   — desde ESE momento el servidor pide la clave (primero pone ADMIN_KEY y después PANEL_KEY, así forzar un
 *                             turno lleno anda desde el primer segundo). No hace falta volver a implementar.
 *   ▶ desactivarClavesUnaVez — vuelve a como hoy al instante (saca PANEL_KEY). Las próximas quedan: activar otra vez usa las mismas.
 *
 *   ▶ verClavesUnaVez       — solo dice cómo está (sin mostrar las claves).
 *   ▶ cambiarClaveEquipoUnaVez — si alguien deja el equipo: inventa otra clave del equipo (si ya rige, la de antes deja de valer en
 *                             todos los aparatos al instante y cada uno carga la nueva). La de administración no cambia.
 *
 * Por qué un archivo aparte: la pantalla de Propiedades del script tiene más de 50 propiedades y queda de solo lectura.
 * ⚠️ VA EN UN ARCHIVO NUEVO DEL PROYECTO (➕ al lado de «Archivos» → Secuencia de comandos, nombre «clave_equipo»), NUNCA adentro
 * de Código.gs. Se corre desde el EDITOR (la lista de al lado de ▶ Ejecutar). Todos los archivos del proyecto comparten los nombres:
 * acá todo termina en «UnaVez» o empieza con «claveEq», que no existen en Código.gs.
 * 🔐 Las claves NUNCA van al registro de ejecución (Google lo guarda y lo ve cualquiera con acceso al proyecto), ni al código, ni a un
 * commit, ni al chat: solo a las Propiedades y a los aparatos. Si la ventana no se puede mostrar, no se crea ni se cambia nada.
 * Las claves son de 10 letras minúsculas y números, sin los que se confunden (0/o, 1/l/i): fáciles de escribir en un celular.
 * ========================================================================== */
var CLAVE_EQ_PROX = 'PANEL_KEY_PROXIMA';
var CLAVE_ADM_PROX = 'ADMIN_KEY_PROXIMA';

function generarClavesUnaVez() {
  var pr = PropertiesService.getScriptProperties();
  var eq = claveEqLeer_(pr, CLAVE_EQ_PROX), ad = claveEqLeer_(pr, CLAVE_ADM_PROX);
  if (eq && ad) { Logger.log('✅ Las claves ya estaban generadas: no las cambié. Para verlas: «mostrarClavesUnaVez».'); return 'ya estaban'; }
  var ui = claveEqUi_();
  if (!ui) return 'sin ventana';
  var nuevas = {};
  if (!eq) nuevas[CLAVE_EQ_PROX] = claveEqNueva_();
  /* la de administración: si el servidor ya tenía una ADMIN_KEY puesta, se usa esa (los aparatos que ya la tienen no la pierden) */
  if (!ad) nuevas[CLAVE_ADM_PROX] = claveEqLeer_(pr, 'ADMIN_KEY') || claveEqNueva_();
  for (var k in nuevas) pr.setProperty(k, nuevas[k]);
  eq = claveEqLeer_(pr, CLAVE_EQ_PROX); ad = claveEqLeer_(pr, CLAVE_ADM_PROX);
  if (!eq || !ad || !claveEqVentana_(ui, eq, ad, 'Claves generadas · el servidor TODAVÍA no las pide')) {
    for (var k2 in nuevas) { try { pr.deleteProperty(k2); } catch (e) {} }   // sin ventana nadie las vio: no quedan claves que nadie conoce
    Logger.log('⚠️ No se pudo mostrar la ventana: NO se generó nada. Abrí la planilla en otra pestaña y volvé a correr esto.');
    return 'sin ventana';
  }
  Logger.log('✅ Claves generadas y mostradas en la ventana de la planilla (acá no se escriben). El servidor todavía NO las pide.');
  return 'generadas';
}

function mostrarClavesUnaVez() {
  var pr = PropertiesService.getScriptProperties();
  var activa = claveEqLeer_(pr, 'PANEL_KEY');
  var eq = activa || claveEqLeer_(pr, CLAVE_EQ_PROX), ad = claveEqLeer_(pr, 'ADMIN_KEY') || claveEqLeer_(pr, CLAVE_ADM_PROX);
  if (!eq) { Logger.log('⚠️ No hay claves generadas. Corré «generarClavesUnaVez».'); return 'sin claves'; }
  var ui = claveEqUi_();
  if (!ui) return 'sin ventana';
  claveEqVentana_(ui, eq, ad, activa ? 'Las claves que rigen (el servidor las pide)' : 'Claves generadas · el servidor TODAVÍA no las pide');
  Logger.log('✅ Claves mostradas en la ventana de la planilla (acá no se escriben).');
  return 'mostradas';
}

function activarClavesUnaVez() {
  var pr = PropertiesService.getScriptProperties();
  var eq = claveEqLeer_(pr, CLAVE_EQ_PROX), ad = claveEqLeer_(pr, CLAVE_ADM_PROX);
  if (!eq || !ad) { Logger.log('⚠️ Primero «generarClavesUnaVez» (y repartirlas). No se prendió nada.'); return 'sin claves'; }
  pr.setProperty('ADMIN_KEY', ad);                  // primero la de administración: forzar anda desde el primer segundo
  if (claveEqLeer_(pr, 'ADMIN_KEY') !== ad) { Logger.log('⚠️ No se pudo poner la clave de administración: no se prendió nada.'); return 'fallo'; }
  pr.setProperty('PANEL_KEY', eq);
  if (claveEqLeer_(pr, 'PANEL_KEY') !== eq) {
    try { pr.deleteProperty('PANEL_KEY'); } catch (e) {}
    Logger.log('⚠️ No se pudo poner la clave del equipo: el servidor sigue SIN clave, como antes.');
    return 'fallo';
  }
  Logger.log('🔐 Listo: desde ahora el servidor pide la clave del equipo (y la de administración para forzar). Para volver atrás: «desactivarClavesUnaVez».');
  return 'activadas';
}

function desactivarClavesUnaVez() {
  var pr = PropertiesService.getScriptProperties();
  pr.deleteProperty('PANEL_KEY');
  var ok = !claveEqLeer_(pr, 'PANEL_KEY');
  Logger.log(ok ? '↩️ El servidor volvió a aceptar todo SIN clave, como antes. Las claves generadas quedan: «activarClavesUnaVez» las vuelve a prender.'
                : '⚠️ No se pudo sacar la clave: probá de nuevo en un minuto.');
  return ok ? 'desactivadas' : 'fallo';
}

function verClavesUnaVez() {
  var pr = PropertiesService.getScriptProperties();
  var activa = !!claveEqLeer_(pr, 'PANEL_KEY'), adm = !!claveEqLeer_(pr, 'ADMIN_KEY');
  var prox = !!claveEqLeer_(pr, CLAVE_EQ_PROX) && !!claveEqLeer_(pr, CLAVE_ADM_PROX);
  var msg = activa ? ('🔐 El servidor PIDE la clave del equipo' + (adm ? ' y la de administración para forzar.' : ' (⚠️ sin clave de administración: nadie puede forzar un turno lleno).'))
                   : ('🔓 El servidor NO pide clave (como siempre).' + (prox ? ' Las claves están generadas: «activarClavesUnaVez» las prende.' : ' Todavía no hay claves generadas.'));
  Logger.log(msg);
  return msg;
}

function cambiarClaveEquipoUnaVez() {
  var pr = PropertiesService.getScriptProperties();
  var ui = claveEqUi_();
  if (!ui) return 'sin ventana';
  var activa = !!claveEqLeer_(pr, 'PANEL_KEY'), antesP = claveEqLeer_(pr, CLAVE_EQ_PROX), nueva = claveEqNueva_();
  var ad = claveEqLeer_(pr, 'ADMIN_KEY') || claveEqLeer_(pr, CLAVE_ADM_PROX);
  pr.setProperty(CLAVE_EQ_PROX, nueva);
  if (!claveEqVentana_(ui, nueva, ad, activa ? 'Clave del equipo NUEVA · ya rige: cada uno tiene que cargarla' : 'Clave del equipo NUEVA · el servidor todavía no la pide')) {
    if (antesP) pr.setProperty(CLAVE_EQ_PROX, antesP); else pr.deleteProperty(CLAVE_EQ_PROX);
    Logger.log('⚠️ No se pudo mostrar la ventana: la clave NO cambió.');
    return 'sin ventana';
  }
  if (activa) pr.setProperty('PANEL_KEY', nueva);
  Logger.log('✅ Clave del equipo cambiada y mostrada en la ventana de la planilla (acá no se escribe).' + (activa ? ' La de antes ya no vale.' : ''));
  return 'cambiada';
}

/* ── ayudantes (nombres que no existen en Código.gs) ── */
function claveEqLeer_(pr, k) { return String(pr.getProperty(k) || '').trim(); }
function claveEqUi_() {
  try { return SpreadsheetApp.getUi(); } catch (e) {
    Logger.log('⚠️ No se pudo abrir la ventana de la planilla: no se hizo nada. Abrí la planilla en otra pestaña del navegador y volvé a correr esto.');
    return null;
  }
}
/** 10 letras y números al azar (del generador de Utilities.getUuid, que es seguro), sin 0/o/1/l/i. */
function claveEqNueva_() {
  var abc = 'abcdefghjkmnpqrstuvwxyz23456789', out = '';
  while (out.length < 10) {
    var hex = Utilities.getUuid().replace(/-/g, '');
    for (var i = 0; i + 1 < hex.length && out.length < 10; i += 2) {
      var b = parseInt(hex.substr(i, 2), 16);
      if (b < 248) out += abc.charAt(b % abc.length);   // 248 = 8 × 31: sin sesgo
    }
  }
  return out;
}
function claveEqVentana_(ui, eq, ad, titulo) {
  try {
    var h = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]; }); };
    var html = HtmlService.createHtmlOutput(
      '<div style="font:15px Arial,sans-serif;line-height:1.45;color:#1f2a37">' +
      '<p style="margin:0 0 10px"><b>' + h(titulo) + '</b></p>' +
      '<p style="margin:0 0 4px">🔐 <b>Clave del equipo</b> (para todos: vendedoras, tiendas, logística, Contabilidad)</p>' +
      '<p style="margin:0 0 12px"><input value="' + h(eq) + '" readonly onclick="this.select()" style="font:22px monospace;width:100%;padding:6px;letter-spacing:2px"></p>' +
      '<p style="margin:0 0 4px">🛡️ <b>Clave de administración</b> (solo logística y Administración: para forzar un turno lleno)</p>' +
      '<p style="margin:0 0 12px"><input value="' + h(ad) + '" readonly onclick="this.select()" style="font:22px monospace;width:100%;padding:6px;letter-spacing:2px"></p>' +
      '<p style="margin:0;font-size:13px;color:#5b6675">Se escriben en minúscula. En el panel: Mis pedidos → 🔐 Clave del equipo. La de administración la pide el panel la ' +
      'primera vez que fuerzan algo. La del equipo va también al secreto PANEL_KEY de GitHub. No las mandes a un grupo ni las escribas en un archivo.</p></div>')
      .setWidth(480).setHeight(380);
    ui.showModalDialog(html, 'Claves del panel');
    return true;
  } catch (e) { return false; }
}
