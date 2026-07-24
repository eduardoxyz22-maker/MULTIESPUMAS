/**
 * ============================================================================
 * PEDIDOS MultiEspumas — Backend Google Apps Script
 * ============================================================================
 * Pegá TODO este código en Extensiones > Apps Script de tu Google Sheet,
 * guardá, y Deploy > New deployment > Web app:
 *    - Execute as: Me (tu cuenta)
 *    - Who has access: Anyone
 * Copiá la URL que termina en /exec y pásasela a Claude (o pegala en
 * pedidos.html, variable SHEETS_URL).
 *
 * La hoja "Pedidos" y sus encabezados se crean/actualizan solos.
 * Columnas: id | Fecha | N° OC | Vendedor | Cliente | Productos | Celular |
 *           Turno | Zona | Dirección | Link Maps | Pagado | Saldo (Bs) |
 *           ts | _productos_json | Método pago | Observaciones |
 *           Estado stock | Entregado | Vehículo | Chofer | Garantía (a nombre de) |
 *           Nota de venta | A cuenta (Bs) | Facturar a | NIT | N° del día
 *           (medida y código van dentro del texto de Productos)
 * El servidor hace cumplir el límite por turno (12 AM / 13 PM = 25 por día)
 * y asigna el N° del día correlativo (1,2,3…) de forma atómica.
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
               'Nota de venta','A cuenta (Bs)','Facturar a','NIT','N° del día'];

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

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** GET: útil para ver los datos desde el navegador (mismo formato que 'list'). */
function doGet(e) {
  return jsonOut({ ok: true, pedidos: readAll() });
}

/** POST: el formulario envía {action:'list'|'save'|'delete', ...} como texto plano. */
function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) { return jsonOut({ ok:false, error:'bad json' }); }
  var action = body.action || 'save';
  // 'geocode' resuelve links cortos de Maps -> coordenadas. Va SIN lock (es lento y no toca los pedidos).
  if (action === 'geocode') return jsonOut({ ok:true, geo: resolveLinks(body.links || []) });
  var lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (err) { return jsonOut({ ok:false, error:'busy' }); }
  try {
    if (action === 'list')   return jsonOut({ ok:true, pedidos: readAll() });
    if (action === 'delete') return doDelete(body.id);
    return doSave(body.pedido);
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
    if (cache[url]) { out.push({ link: url, lat: cache[url].lat, lng: cache[url].lng }); continue; }
    var c = resolveOne(url);
    if (c) { out.push({ link: url, lat: c.lat, lng: c.lng }); cache[url] = c; nuevos.push([url, c.lat, c.lng]); }
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

function resolveOne(url) {
  var finalUrl = followRedirects(url);
  var c = extractCoords(finalUrl);
  if (c) return c;
  try {
    var rb = UrlFetchApp.fetch(finalUrl, { followRedirects: true, muteHttpExceptions: true });
    var body = rb.getContentText();
    var mb = body.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || body.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || body.match(/\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/);
    if (mb) { var la = parseFloat(mb[1]), ln = parseFloat(mb[2]); if (!isNaN(la) && !isNaN(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180) return { lat: la, lng: ln }; }
  } catch (e) {}
  return null;
}

function extractCoords(u) {
  u = String(u || '');
  var m = u.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
       || u.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
       || u.match(/[?&](?:q|ll|daddr|destination|center)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/)
       || u.match(/[\/=](-?\d{1,2}\.\d{3,}),(-?\d{1,3}\.\d{3,})/);
  if (m) {
    var lat = parseFloat(m[1]), lng = parseFloat(m[2]);
    if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat: lat, lng: lng };
  }
  return null;
}

function getGeoCache() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Geo');
  if (!sh) { sh = ss.insertSheet('Geo'); sh.getRange(1, 1, 1, 3).setValues([['link', 'lat', 'lng']]); return {}; }
  var vals = sh.getDataRange().getValues(); var c = {};
  for (var i = 1; i < vals.length; i++) { if (vals[i][0]) c[String(vals[i][0])] = { lat: Number(vals[i][1]), lng: Number(vals[i][2]) }; }
  return c;
}

function saveGeoCache(rows) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Geo') || ss.insertSheet('Geo');
  if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, 3).setValues([['link', 'lat', 'lng']]);
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, 3).setValues(rows);
}

function readAll() {
  var sh = getSheet();
  var values = sh.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    if (!r[0]) continue; // sin id -> ignorar
    out.push({
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
      observaciones: String(r[16] || ''),
      estado: String(r[17] || ''),
      entregado: (String(r[18]).toUpperCase().charAt(0) === 'S'),
      vehiculo: String(r[19] || ''),
      chofer: String(r[20] || ''),
      garantia: String(r[21] || ''),
      nota: String(r[22] == null ? '' : r[22]),
      acuenta: Number(r[23]) || 0,
      facturarA: String(r[24] || ''),
      nit: String(r[25] == null ? '' : r[25]),
      nroDia: Number(r[26]) || 0
    });
  }
  return out;
}

function doSave(p) {
  if (!p || !p.id) return jsonOut({ ok:false, error:'no id' });
  var sh = getSheet();
  var last = sh.getLastRow();
  // ¿Ya existe (update) o es nuevo?
  var foundRow = -1;
  if (last >= 2) {
    var ids = sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) { if (String(ids[i][0]) === String(p.id)) { foundRow = i + 2; break; } }
  }
  // PORTERO DE CUPOS POR TURNO: si es NUEVO, contar los del día por turno y rechazar si el turno elegido está lleno (12 AM / 13 PM).
  // Esto corre dentro del lock de doPost => atómico: aunque 3 carguen a la vez, entran de a uno y nunca se pasa del límite.
  if (foundRow < 0 && p.fecha) {
    var usados = 0, usadosAM = 0, usadosPM = 0, maxNro = 0;
    if (last >= 2) {
      var fechas = sh.getRange(2, 2, last - 1, 1).getValues();              // col B = Fecha
      var turnos = sh.getRange(2, 8, last - 1, 1).getValues();             // col H = Turno
      var nros   = sh.getRange(2, HEADERS.length, last - 1, 1).getValues(); // última col = N° del día
      for (var j = 0; j < fechas.length; j++) {
        if (fmtDate(fechas[j][0]) === String(p.fecha)) {
          usados++;
          if (String(turnos[j][0] || '').toUpperCase().indexOf('PM') >= 0) usadosPM++; else usadosAM++;
          var n = Number(nros[j][0]) || 0; if (n > maxNro) maxNro = n;
        }
      }
    }
    var tSel = String(p.turno || '').toUpperCase().indexOf('PM') >= 0 ? 'PM' : 'AM';
    var limT = (tSel === 'PM') ? CUPOS_PM : CUPOS_AM;
    var usadosT = (tSel === 'PM') ? usadosPM : usadosAM;
    if (usadosT >= limT) return jsonOut({ ok:false, error:'cupos_llenos', fecha:p.fecha, turno:tSel, cupos:limT, usados:usadosT });
    p.nroDia = Math.max(maxNro, usados) + 1; // N° correlativo del día (server-assigned, atómico por el lock)
  }
  var row = recToRow(p);
  if (foundRow > 0) { sh.getRange(foundRow, 1, 1, row.length).setValues([row]); return jsonOut({ ok:true, pedido:p, mode:'update' }); }
  sh.appendRow(row);
  return jsonOut({ ok:true, pedido:p, mode:'add' });
}

function doDelete(id) {
  var sh = getSheet();
  var last = sh.getLastRow();
  if (last >= 2) {
    var ids = sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(id)) { sh.deleteRow(i + 2); return jsonOut({ ok:true }); }
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
    p.nota || '', Number(p.acuenta) || 0, p.facturarA || '', p.nit || '', Number(p.nroDia) || 0
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

/** La fecha puede venir como texto 'YYYY-MM-DD' o como Date (si Sheets la reinterpreta). */
function fmtDate(v) {
  if (v == null || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    var m = v.getMonth() + 1, d = v.getDate();
    return v.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
  }
  return String(v);
}
