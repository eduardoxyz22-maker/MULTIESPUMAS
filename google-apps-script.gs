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
   este archivo. OJO: en Apps Script, GUARDAR no publica nada — hay que hacer
   Implementar -> Administrar implementaciones -> ✏️ -> Nueva version -> Implementar. */
var SCRIPT_VERSION = '2026-09-05-c';   // ⬅️ el borrador trae el NOMBRE del cliente, no «Lead #123» (§4ch)

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
 *  Con la clave configurada hay que agregarle ?k=LA_CLAVE a la dirección. */
function doGet(e) {
  if (!claveOk_(e && e.parameter && e.parameter.k)) return jsonOut({ ok:false, error:'clave', version:SCRIPT_VERSION });
  return jsonOut({ ok: true, version:SCRIPT_VERSION, pedidos: readAll() });
}

/** POST: el formulario envía {action:'list'|'save'|'delete', ...} como texto plano. */
function doPost(e) {
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
  var lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (err) { return jsonOut({ ok:false, error:'busy' }); }
  try {
    if (action === 'list')   return jsonOut({ ok:true, version:SCRIPT_VERSION, pedidos: readAll() });
    if (action === 'delete') return doDelete(body.id);
    return doSave(body.pedido, !!body.forzar);
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
function doSave(p, forzar) {
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
    if (revHoja && !filaSistema && (Number(p.rev) || 0) !== revHoja) {
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

function fotosFolder_() {
  var it = DriveApp.getFoldersByName(FOTOS_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOTOS_FOLDER);
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
  var nombre = 'entrega_' + String((body.cliente || body.id || 'x')).replace(/[^\w\-]+/g, '_').slice(0, 40) +
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
    if (r.getResponseCode() !== 200) return null;
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
  return kommoProcesar_(ids, 'webhook');
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
  return kommoProcesar_(ids, 'repaso');
}

function kommoProcesar_(ids, origen) {
  var hook = kUltimoHook_();
  if (!ids.length) return jsonOut({ ok:true, version:SCRIPT_VERSION, origen:origen, creados:0, ids:[], ultimoHook:hook.ts || '' });
  var lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (err) { return jsonOut({ ok:false, error:'busy' }); }
  try {
    var hechos = [], saltados = [], reparados = [];
    for (var i = 0; i < ids.length; i++) {
      var r = crearBorradorDeLead_(ids[i]);
      if (r === true) { hechos.push(ids[i]); continue; }
      saltados.push(ids[i] + ':' + r);
      // Ya estaba, pero quizá quedó con el nombre que le puso Kommo sola («Lead #123»).
      if (r === 'ya estaba' && repararNombreBorrador_(getSheet(), ids[i])) reparados.push(ids[i]);
    }
    return jsonOut({ ok:true, version:SCRIPT_VERSION, origen:origen,
                     creados:hechos.length, ids:hechos, saltados:saltados,
                     reparados:reparados.length, ultimoHook:hook.ts || '' });
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
  var last = sh.getLastRow();
  if (last < 2) return false;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  var buscado = BORRADOR_PREF + leadId, fila = -1;
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === buscado) { fila = i + 2; break; }
  if (fila < 0) return false;
  var colCli = HEADERS.indexOf('Cliente') + 1, colEst = HEADERS.indexOf('Estado stock') + 1;
  if (String(sh.getRange(fila, colEst).getValue() || '') !== BORRADOR_EST) return false;  // ya lo completaron
  var actual = String(sh.getRange(fila, colCli).getValue() || '').trim();
  if (!nombreGenerico_(actual)) return false;                                             // ya tiene nombre propio
  var lead = kGet_('/leads/' + leadId + '?with=contacts');
  if (!lead || !lead.id) return false;
  var nombre = nombreDeLead_(lead);
  if (!nombre || nombreGenerico_(nombre) || nombre === actual) return false;
  sh.getRange(fila, colCli).setValue(nombre);
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
function crearBorradorDeLead_(leadId) {
  var sh = getSheet();
  if (leadYaCargado_(sh, leadId)) return 'ya estaba';

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
    var q = [];
    for (var i = 0; i < els.length; i++) q.push('filter[id][]=' + encodeURIComponent(els[i].id));
    var cat = kGet_('/catalogs/' + KOMMO_CATALOGO + '/elements?' + q.join('&'));
    var porId = {};
    kEmb_(cat, 'elements').forEach(function (el) { porId[String(el.id)] = el; });
    for (var j = 0; j < els.length; j++) {
      var meta = els[j].metadata || {}, el = porId[String(els[j].id)] || {};
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

  var sh2 = getSheet();
  sh2.appendRow(recToRow(borrador));
  return true;
}
