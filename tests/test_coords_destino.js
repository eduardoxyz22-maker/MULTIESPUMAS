/* 📍 §4ok-E6 «Cómo llegar»: el servidor toma el DESTINO, nunca el origen ni el centro del recorrido.

   El 02/11 la 10-278 y su ATC quedaron corridas 3 km: el enlace era …/maps/dir/<origen>/<destino>/data=… y `extractCoords` tomaba el
   primer par de coordenadas (el ORIGEN, la tienda). Con el destino escrito con su nombre, tomaba el «@» (el CENTRO del recorrido).
   Coordenadas y nombres INVENTADOS (el repo es público).

   Se corre:  node tests/test_coords_destino.js   (desde la raíz del repo)
   Contra otro .gs:  GS=/ruta/al/otro.gs node tests/test_coords_destino.js */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + e) : ''); };
const GS = process.env.GS || path.resolve('google-apps-script.gs');

function cargar() {
  const pedidas = [], buscadas = [];
  const ctx = {
    console, Date,
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty: () => {} }) },
    UrlFetchApp: { fetch: (u, o) => { pedidas.push(u);
      /* Un enlace corto que lleva a un «cómo llegar», y la página de Maps de un «cómo llegar» (con el ORIGEN adentro, como la de verdad). */
      if (/maps\.app\.goo\.gl\/aDir/.test(u) && o && o.followRedirects === false)
        return { getResponseCode: () => 302, getAllHeaders: () => ({ Location: 'https://www.google.com/maps/dir/-17.7810,-63.1820/-17.8050,-63.1870/data=!4m8!4m7!1m1!4e1!1m1!4e1!2m1!11b1!3e0' }), getContentText: () => '' };
      return { getResponseCode: () => 200, getAllHeaders: () => ({}), getContentText: () => '<html>!3d-17.7810!4d-63.1820 @-17.7810,-63.1820</html>' }; } },
    Maps: { newGeocoder: () => { const g = { setRegion: () => g, setBounds: () => g,
      geocode: (t) => { buscadas.push(t); return { status: 'OK', results: [{ geometry: { location: { lat: -17.7400, lng: -63.1700 } } }] }; } }; return g; } },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ _t: t, setMimeType() { return this; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put: () => {}, putAll: () => {}, remove: () => {} }) },
    Utilities: { formatDate: (d) => String(d) },
    Session: { getScriptTimeZone: () => 'America/La_Paz' }
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(GS, 'utf8'), ctx);
  return { ctx, pedidas, buscadas };
}
const a = cargar();
const X = (c) => c ? (+c.lat).toFixed(4) + ',' + (+c.lng).toFixed(4) + (c.aprox ? ' aprox' : '') : null;
const ex = (u) => X(a.ctx.extractCoords(u));

console.log('\n── 1. extractCoords con «cómo llegar» ──');
/* El caso de la 10-278: origen y destino con coordenadas, `data=` sin coordenadas («!4e1» los dos). */
const U1 = 'https://google.com/maps/dir/-17.7810,-63.1820/-17.8050,-63.1870/data=!4m8!4m7!1m1!4e1!1m1!4e1!2m1!11b1!3e0?utm_source=mstt_0&g_ep=CAESBzI2';
chk('⚠️ a. /dir/<origen>/<destino>/: el DESTINO (antes el origen)', ex(U1) === '-17.8050,-63.1870', ex(U1));
/* Destino con nombre, el «@» en el centro y el punto del destino en `data=` como «!1d<lng>!2d<lat>». */
const U2 = 'https://www.google.com/maps/dir/-17.7810,-63.1820/CONDOMINIO+DE+PRUEBA,+Santa+Cruz+de+la+Sierra/@-17.7600,-63.2000,14z/data=!3m1!4b1!4m12!4m11!1m1!4e1!1m5!1m1!1s0x93f1:0x14fe!2m2!1d-63.1750!2d-17.7420!2m1!1b1!3e0?entry=ttu';
chk('⚠️ b. destino con nombre: el punto del destino en data= (antes el «@», el centro del recorrido)', ex(U2) === '-17.7420,-63.1750', ex(U2));
/* Tres puntos: el último es el destino, aunque el del medio también traiga coordenadas. */
const U3 = 'https://www.google.com/maps/dir/PUNTO+A/PUNTO+B/PUNTO+C/@-17.7,-63.1,13z/data=!4m20!4m19!1m5!1m1!1s0x1:0x2!2m2!1d-63.1000!2d-17.7000!1m5!1m1!1s0x3:0x4!2m2!1d-63.1500!2d-17.7500!1m5!1m1!1s0x5:0x6!2m2!1d-63.2000!2d-17.8000!3e0';
chk('c. tres puntos: el ÚLTIMO', ex(U3) === '-17.8000,-63.2000', ex(U3));
/* El destino es «mi ubicación» (sin coordenadas) y el origen sí las trae: no se toma el origen. */
const U4 = 'https://www.google.com/maps/dir/LUGAR+ORIGEN/@-17.7,-63.1,13z/data=!4m10!4m9!1m5!1m1!1s0x1:0x2!2m2!1d-63.1000!2d-17.7000!1m1!4e1!3e0';
chk('d. el último punto sin coordenadas («mi ubicación»): null, ni el origen ni el centro', ex(U4) === null, ex(U4));
/* Con «!3d<lat>!4d<lng>» adentro de cada punto: el último. */
const U5 = 'https://www.google.com/maps/dir/A/B/data=!4m12!4m11!1m4!1m1!1s0x1!3d-17.7000!4d-63.1000!1m4!1m1!1s0x2!3d-17.8100!4d-63.2100!3e0';
chk('e. con «!3d…!4d…» en cada punto: el último par', ex(U5) === '-17.8100,-63.2100', ex(U5));
/* El destino como Plus Code. */
const U6 = 'https://www.google.com/maps/dir/-17.7810,-63.1820/8R6C%2B72P+Santa+Cruz/data=!4m2!4m1!3e0';
chk('f. el destino como Plus Code: el Plus Code (no el origen)', ex(U6) === '-17.6893,-63.1799', ex(U6));
/* El destino con nombre y SIN coordenadas en ningún lado: null (ni origen ni centro). */
const U7 = 'https://www.google.com/maps/dir/-17.7810,-63.1820/CALLE+INVENTADA+123,+Santa+Cruz/@-17.7600,-63.2000,14z/data=!4m6!4m5!1m1!4e1!1m0!3e0';
chk('g. destino con nombre y sin coordenadas: null (se busca el nombre en resolveOne)', ex(U7) === null, ex(U7));
chk('h. «saddr=<origen>&daddr=<destino>»: el destino', ex('https://maps.google.com/maps?saddr=-17.7810,-63.1820&daddr=-17.8050,-63.1870') === '-17.8050,-63.1870');
chk('i. «/maps/dir/?api=1&origin=…&destination=…»: el destino, como siempre', ex('https://www.google.com/maps/dir/?api=1&origin=-17.7810,-63.1820&destination=-17.8050,-63.1870') === '-17.8050,-63.1870');

console.log('\n── 2. Lo de siempre sigue igual ──');
chk('a. el pin de un lugar (!3d!4d)', ex('https://www.google.com/maps/place/X/@-17.7,-63.1,17z/data=!3m1!4b1!4m6!3m5!1s0x1!8m2!3d-17.7612!4d-63.1955') === '-17.7612,-63.1955');
chk('b. «maps?q=-17.78,-63.18»', ex('https://www.google.com/maps?q=-17.78,-63.18') === '-17.7800,-63.1800');
chk('c. Waze con la coma codificada', ex('https://ul.waze.com/ul?ll=-17.86782500%2C-63.15540100&navigate=yes') === '-17.8678,-63.1554');
chk('d. el «@» de un mapa suelto', ex('https://www.google.com/maps/@-17.7700,-63.1900,15z') === '-17.7700,-63.1900');
chk('e. «saddr» solo (sin destino): como antes', ex('https://maps.google.com/maps?saddr=-17.7810,-63.1820') === '-17.7810,-63.1820');

console.log('\n── 3. resolveOne ──');
{
  const n0 = a.pedidas.length;
  chk('⚠️ a. «cómo llegar» con coordenadas: el destino, sin salir a internet', X(a.ctx.resolveOne(U1)) === '-17.8050,-63.1870' && a.pedidas.length === n0);
  const b0 = a.buscadas.length;
  const r = X(a.ctx.resolveOne(U7));
  chk('⚠️ b. destino con nombre y sin coordenadas: se busca el NOMBRE del destino (aproximado), no se lee la página con el origen',
    r === '-17.7400,-63.1700 aprox' && a.buscadas.length === b0 + 1 && /CALLE INVENTADA 123, Santa Cruz/.test(a.buscadas[a.buscadas.length - 1]), r + ' · ' + a.buscadas.slice(b0).join(' | '));
  chk('⚠️ c. un enlace corto que lleva a un «cómo llegar»: el destino', X(a.ctx.resolveOne('https://maps.app.goo.gl/aDir1')) === '-17.8050,-63.1870');
  chk('d. dirNombreDestino_: ni coordenadas ni un Plus Code son un «nombre»', typeof a.ctx.dirNombreDestino_ === 'function' && a.ctx.dirNombreDestino_(U1) === '' && a.ctx.dirNombreDestino_(U6) === '' && a.ctx.dirNombreDestino_(U2) === 'CONDOMINIO DE PRUEBA, Santa Cruz de la Sierra');
}

console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
process.exit(FAIL ? 1 : 0);
