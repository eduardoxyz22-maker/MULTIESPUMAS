/* ============================================================================
 * 📦 MARCAR «ENTREGADO» LOS PEDIDOS DE AGOSTO — archivo APARTE, de un solo uso (25/09/2026)
 * Pedido del dueño: «marca todos los pedidos de agosto entregado por si logística olvidó
 * hacerlo».
 *
 * ⚠️ VA EN UN ARCHIVO NUEVO DEL PROYECTO (➕ al lado de «Archivos» → Secuencia de comandos),
 * NUNCA adentro de Código.gs. Usa lo que ya está en Código.gs (la hoja, los encabezados, el
 * sello de cada fila) y anda igual con la versión publicada hoy (2026-09-20-a) que con la
 * próxima (2026-09-23-b). Cuando termines y el panel se vea bien, borrá este archivo.
 *
 * Se corre desde el EDITOR (la lista de al lado de ▶ Ejecutar), en dos pasos, y se deshace:
 *   1. ▶ verPendientesAgosto       — NO cambia nada: dice cuántos y cuáles se marcarían.
 *   2. ▶ marcarEntregadosAgosto    — los marca «SÍ» con el candado tomado (nadie guarda en el
 *      medio) y un SELLO nuevo en cada fila: un panel con la copia vieja choca y relee, en vez
 *      de desmarcarlo al guardar. Antes anota cada fila en la hoja «Respaldo entregados».
 *   3. ▶ deshacerEntregadosAgosto  — vuelve a «NO» lo que marcó el último paso 2.
 *
 * Qué entra: las filas con Fecha de entrega en agosto y «Entregado» en NO — OC y RPT, también
 * las que dicen «🔴 No hay · reprogramar» (van señaladas en la lista para mirarlas).
 * Qué NO: filas del sistema (`__…`: stock, arqueo, retiros), borradores de Kommo, las que no
 * tienen fecha (ventas de tienda) y las 🎧 ATC: marcarlas desde el panel además cierra su
 * seguimiento, y desde acá quedarían «entregadas» con la ATC abierta. Se listan aparte.
 * No cambia el stock: un pedido con fecha pasada ya cuenta como salido.
 *
 * ⚠️ Todos los archivos del proyecto comparten los nombres: acá solo hay `var` y `function`
 * con nombres que NO existen en Código.gs (empiezan con «entregas» o dicen «Agosto»). Uno
 * repetido pisaría al de Código.gs.
 * ========================================================================== */
var ENTREGADOS_MES = '2026-08';
var HOJA_RESPALDO_ENTREGADOS = 'Respaldo entregados';

function verPendientesAgosto() { return entregasVer_(ENTREGADOS_MES); }
function marcarEntregadosAgosto() { return entregasMarcar_(ENTREGADOS_MES); }
function deshacerEntregadosAgosto() { return entregasDeshacer_(); }

/* Lo que se usa de Código.gs. Si este archivo quedó en otro proyecto (o Código.gs está
   cortado), se dice qué falta y no se toca nada. `Entregado` tiene que ser la columna 19:
   es la que lee `rowToRec_` (r[18]). */
function entregasFaltaAlgo_() {
  var falta = [];
  if (typeof getSheet !== 'function') falta.push('getSheet');
  if (typeof rowToRec_ !== 'function') falta.push('rowToRec_');
  if (typeof getCacheOlvidar_ !== 'function') falta.push('getCacheOlvidar_');
  if (typeof HEADERS === 'undefined' || HEADERS.indexOf('Entregado') !== 18) falta.push('HEADERS');
  if (typeof REV_COL === 'undefined' || !(REV_COL > 0)) falta.push('REV_COL');
  if (typeof BORRADOR_EST === 'undefined') falta.push('BORRADOR_EST');
  return falta;
}
function entregasLog_(lineas) { if (typeof Logger !== 'undefined') Logger.log(lineas.join('\n')); }
function entregasNoAnda_(falta) {
  var m = ['❌ Este archivo tiene que estar en el MISMO proyecto que el del panel (Código.gs), y ahí no está: ' +
           falta.join(', ') + '. No se cambió nada.'];
  entregasLog_(m); return { ok: false, error: 'falta', falta: falta, lineas: m };
}
function entregasOcupado_() {
  var m = ['⏳ El servidor estaba ocupado guardando otra cosa: probá de nuevo en un minuto. No se cambió nada.'];
  entregasLog_(m); return { ok: false, error: 'busy', lineas: m };
}
function entregasColLetra_(n) {
  var s = '';
  while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
/* Sheets puede haber vuelto Fecha la hora de la tanda: se compara siempre como texto ISO. */
function entregasCuando_(v) { return (v instanceof Date) ? v.toISOString() : String(v == null ? '' : v); }

function entregasPendientesDelMes_(vals, mes) {
  var out = { marcar: [], atc: [], porTipo: { OC: 0, RPT: 0 }, noHay: 0 };
  for (var i = 1; i < vals.length; i++) {
    var id = String(vals[i][0] == null ? '' : vals[i][0]);
    if (!id || id.indexOf('__') === 0) continue;                    // filas del sistema y retiros
    var p = rowToRec_(vals[i]);                                     // la fecha, aunque Sheets la haya vuelto Fecha
    if (String(p.fecha).slice(0, 7) !== mes || p.entregado || p.estado === BORRADOR_EST) continue;
    var oc = String(p.oc || '').trim();
    var tipo = /^ATC\b/i.test(oc) ? 'ATC' : (/^RPT\b/i.test(oc) ? 'RPT' : 'OC');   // = esATC/esRPT del panel
    var x = { fila: i + 1, id: id, oc: oc, fecha: p.fecha, cliente: String(p.cliente || '').slice(0, 30),
              tipo: tipo, noHay: p.estado === 'No hay' };
    if (tipo === 'ATC') out.atc.push(x);
    else { out.marcar.push(x); out.porTipo[tipo]++; if (x.noHay) out.noHay++; }
  }
  return out;
}
function entregasListar_(R, mes, lineas) {
  R.marcar.slice(0, 300).forEach(function (x) {
    lineas.push('   ' + x.fecha + ' · ' + (x.oc || '(sin N°)') + ' · ' + x.cliente +
                (x.noHay ? '   ← 🔴 decía «No hay · reprogramar»: ¿salió de verdad?' : ''));
  });
  if (R.marcar.length > 300) lineas.push('   … y ' + (R.marcar.length - 300) + ' más.');
  if (R.noHay) lineas.push('🔴 ' + R.noHay + ' de esos decían «No hay · reprogramar». Se marcan igual (pediste todos): ' +
                           'si alguno NO salió, desmarcalo después en el panel.');
  if (R.atc.length) {
    lineas.push('🎧 ATC de ' + mes + ' sin entregar: ' + R.atc.length + '. Esas NO se marcan desde acá (cerrarlas desde el panel ' +
                'cierra también su seguimiento): revisalas a mano en el panel.');
    R.atc.forEach(function (x) { lineas.push('   ' + x.fecha + ' · ' + x.oc + ' · ' + x.cliente); });
  }
}

function entregasVer_(mes) {
  var falta = entregasFaltaAlgo_(); if (falta.length) return entregasNoAnda_(falta);
  var R = entregasPendientesDelMes_(getSheet().getDataRange().getValues(), mes);
  var lineas = ['📦 Pedidos de ' + mes + ' que todavía dicen «NO entregado»: ' + R.marcar.length + ' (OC ' + R.porTipo.OC +
                ' · RPT ' + R.porTipo.RPT + '). NO se cambió nada.'];
  entregasListar_(R, mes, lineas);
  lineas.push(R.marcar.length ? 'Si está bien, elegí «marcarEntregadosAgosto» y ▶ Ejecutar.' : 'No hay nada para marcar.');
  entregasLog_(lineas);
  return { ok: true, mes: mes, marcar: R.marcar.length, porTipo: R.porTipo, noHay: R.noHay, atc: R.atc.length, lineas: lineas };
}

/* La hoja del respaldo, en TEXTO (que Sheets no vuelva fechas la hora ni el N°), con lugar
   para las filas que vienen. */
function entregasHojaRespaldo_(filasNuevas) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), h = ss.getSheetByName(HOJA_RESPALDO_ENTREGADOS);
  if (!h) {
    h = ss.insertSheet(HOJA_RESPALDO_ENTREGADOS);
    h.getRange(1, 1, h.getMaxRows(), 6).setNumberFormat('@');
    h.getRange(1, 1, 1, 6).setValues([['cuándo', 'mes', 'id', 'N°', 'fecha de entrega', 'deshecho']]);
    h.setFrozenRows(1);
  }
  var falta = h.getLastRow() + filasNuevas - h.getMaxRows();
  if (falta > 0) { h.insertRowsAfter(h.getMaxRows(), falta); h.getRange(1, 1, h.getMaxRows(), 6).setNumberFormat('@'); }
  return h;
}
/* Escribe SOLO las celdas de las filas pedidas («Entregado» y el sello), con el candado ya
   tomado. Primero «Entregado» y después el sello: un panel que lea en el medio ve lo nuevo
   con el sello viejo, choca al guardar y relee — nunca lo viejo con el sello nuevo, que lo
   dejaría guardar encima. Un solo sello, más alto que el de cada fila. */
function entregasEscribir_(sh, vals, filas, valor) {
  if (!filas.length) return;
  var cRev = REV_COL - 1, sello = Date.now();
  filas.forEach(function (f) { sello = Math.max(sello, (Number(vals[f - 1][cRev]) || 0) + 1); });
  var lEnt = entregasColLetra_(HEADERS.indexOf('Entregado') + 1), lRev = entregasColLetra_(REV_COL);
  sh.getRangeList(filas.map(function (f) { return lEnt + f; })).setValue(valor);
  sh.getRangeList(filas.map(function (f) { return lRev + f; })).setValue(sello);
  SpreadsheetApp.flush();                                            // escrito de verdad ANTES de soltar el candado
  getCacheOlvidar_();
}

function entregasMarcar_(mes) {
  var falta = entregasFaltaAlgo_(); if (falta.length) return entregasNoAnda_(falta);
  var lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (e) { return entregasOcupado_(); }
  try {
    var sh = getSheet(), vals = sh.getDataRange().getValues();      // releída CON el candado: lo último de verdad
    var R = entregasPendientesDelMes_(vals, mes), lineas = [];
    if (!R.marcar.length) lineas.push('No hay pedidos de ' + mes + ' sin entregar para marcar. No se cambió nada.');
    else {
      var cuando = new Date().toISOString(), hr = entregasHojaRespaldo_(R.marcar.length);
      hr.getRange(hr.getLastRow() + 1, 1, R.marcar.length, 6)        // el respaldo, ANTES de tocar nada
        .setValues(R.marcar.map(function (x) { return [cuando, mes, x.id, x.oc, x.fecha, '']; }));
      entregasEscribir_(sh, vals, R.marcar.map(function (x) { return x.fila; }), 'SÍ');
      lineas.push('✅ Marcados como ENTREGADOS: ' + R.marcar.length + ' pedidos de ' + mes + ' (OC ' + R.porTipo.OC + ' · RPT ' +
                  R.porTipo.RPT + '). Quedaron anotados en la hoja «' + HOJA_RESPALDO_ENTREGADOS + '». Para deshacerlo: ' +
                  '«deshacerEntregadosAgosto». Los paneles abiertos lo ven solos en un minuto.');
    }
    entregasListar_(R, mes, lineas);
    entregasLog_(lineas);
    return { ok: true, mes: mes, marcados: R.marcar.length, porTipo: R.porTipo, noHay: R.noHay, atc: R.atc.length, lineas: lineas };
  } finally { lock.releaseLock(); }
}

function entregasDeshacer_() {
  var falta = entregasFaltaAlgo_(); if (falta.length) return entregasNoAnda_(falta);
  var lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (e) { return entregasOcupado_(); }
  try {
    var hr = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_RESPALDO_ENTREGADOS);
    var rb = (hr && hr.getLastRow() >= 2) ? hr.getRange(2, 1, hr.getLastRow() - 1, 6).getValues() : [];
    var ultimo = '';                                                 // la última tanda que no se deshizo
    rb.forEach(function (r) { var c = entregasCuando_(r[0]); if (!r[5] && c > ultimo) ultimo = c; });
    if (!ultimo) { var m0 = ['No hay nada para deshacer.']; entregasLog_(m0); return { ok: true, deshechos: 0, lineas: m0 }; }
    var ids = {};
    rb.forEach(function (r) { if (!r[5] && entregasCuando_(r[0]) === ultimo) ids[String(r[2])] = 1; });
    var sh = getSheet(), vals = sh.getDataRange().getValues(), filas = [];
    for (var i = 1; i < vals.length; i++) {
      if (ids[String(vals[i][0])] && rowToRec_(vals[i]).entregado) filas.push(i + 1);   // solo lo que sigue marcado
    }
    if (filas.length) entregasEscribir_(sh, vals, filas, 'NO');
    var hecho = 'deshecho ' + new Date().toISOString();
    hr.getRange(2, 6, rb.length, 1).setValues(rb.map(function (r) {
      return [(!r[5] && entregasCuando_(r[0]) === ultimo) ? hecho : r[5]];
    }));
    var lineas = ['↩️ Deshecho: ' + filas.length + ' pedidos volvieron a «NO entregado» (la tanda del ' + ultimo + ').'];
    entregasLog_(lineas);
    return { ok: true, deshechos: filas.length, lineas: lineas };
  } finally { lock.releaseLock(); }
}
