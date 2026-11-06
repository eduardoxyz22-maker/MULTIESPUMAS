/* §4ok-E6 (05/11) EL ENLACE DE «CÓMO LLEGAR» SE UBICA EN EL DESTINO, NO EN EL ORIGEN.
   La 10-278 y su ATC tenían un enlace «maps/dir/<desde dónde salió la vendedora>/<la casa del cliente>/data=…» y el panel tomaba el
   PRIMER par de coordenadas: el pin quedó a 3 km. Con un destino con nombre («maps/dir/<origen>/<lugar>/@<centro>/data=…») tomaba el
   centro del mapa, a mitad de camino. (Esto es SOLO la página; el `extractCoords` del servidor va aparte.)

   LO QUE CUIDA (enlaces inventados con coordenadas inventadas de Santa Cruz):
   1. Dos puntos con coordenadas → el ÚLTIMO.
   2. Destino con nombre → sus coordenadas de data= («!1d<lng>!2d<lat>», la última), no el centro «@».
   3. Los dos con nombre → la última de data=. Origen con nombre y destino con coordenadas → el destino.
   4. Si data= no trae las del destino (hay menos que puntos con nombre) → «sin ubicar» (null), nunca el origen ni el centro.
   5. «saddr=…&daddr=…» y «dir/?api=1&origin=…&destination=…» → el destino.
   6. Lo de siempre no cambia: un lugar («place/…!3d!4d»), «maps?q=», coordenadas sueltas, Waze («ll=…%2C…»), el Plus Code.
   7. Lo que este aparato tenía guardado de un «cómo llegar» (el origen viejo) no se usa: se vuelve a leer; lo demás de la copia, sí.
   Se corre:  node tests/test_ubicar_destino.js   (PEDIDOS=… para correrla contra otra versión) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

const DIR_DOS = 'https://google.com/maps/dir/-17.7808001,-63.1836001/-17.8085002,-63.1838003/data=!4m8!4m7!1m1!4e1!1m1!4e1!2m1!11b1!3e0?utm_source=mstt_0&g_ep=XYZ';
const DIR_NOMBRE = 'https://www.google.com/maps/dir/-17.7807001,-63.1835001/CONDOMINIO+INVENTADO,+Santa+Cruz+de+la+Sierra/@-17.7602001,-63.2028001,14z/data=!3m1!4b1!4m12!4m11!1m1!4e1!1m5!1m1!1s0x93f1e1:0xabc123!2m2!1d-63.1789001!2d-17.7403001!2m1!1b1!3e0?entry=ttu';
const DIR_DOS_NOMBRES = 'https://www.google.com/maps/dir/LUGAR+UNO,+Santa+Cruz/LUGAR+DOS,+Santa+Cruz/@-17.75,-63.15,13z/data=!4m14!4m13!1m5!1m1!1s0x1:0x2!2m2!1d-63.1001!2d-17.7001!1m5!1m1!1s0x3:0x4!2m2!1d-63.2002!2d-17.8002!3e0';
const DIR_NOMBRE_COORD = 'https://www.google.com/maps/dir/LUGAR+UNO,+Santa+Cruz/-17.8101,-63.1901/@-17.75,-63.15,13z/data=!4m9!4m8!1m5!1m1!1s0x1:0x2!2m2!1d-63.1001!2d-17.7001!1m0!3e0';
const DIR_SIN_DESTINO = 'https://www.google.com/maps/dir/LUGAR+UNO,+Santa+Cruz/LUGAR+DOS,+Santa+Cruz/@-17.7555,-63.1555,13z/data=!4m10!4m9!1m5!1m1!1s0x1:0x2!2m2!1d-63.1001!2d-17.7001!1m1!1s0x3:0x4!3e0';
const SADDR = 'https://maps.google.com/maps?saddr=-17.7001,-63.1001&daddr=-17.8002,-63.2002';
const API1 = 'https://www.google.com/maps/dir/?api=1&origin=-17.7001,-63.1001&destination=-17.8002,-63.2002';
const PLACE = 'https://www.google.com/maps/place/TIENDA+INVENTADA/@-17.7480,-63.1420,17z/data=!3m1!4b1!4m6!3m5!1s0x93f1:0x1!8m2!3d-17.7489125!4d-63.1429219!16s%2Fg%2F11x';

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1280, height:900 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await ctx.route(/^https?:\/\//, r => r.abort());
  await page.addInitScript((L) => { try{ localStorage.setItem('me_geo_cache', JSON.stringify(L)); }catch(e){} },
    { [DIR_DOS]:{ lat:-17.7808001, lng:-63.1836001 }, 'https://maps.app.goo.gl/CortoInventado1':{ lat:-17.7601, lng:-63.1701 } });
  await page.clock.setFixedTime(new Date('2026-11-05T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  const ev = async (fn, arg) => { try{ return await page.evaluate(fn, arg); }catch(e){ return { __err:String(e.message||e).slice(0,200) }; } };

  const r = await ev((U)=>{ var f=function(u){ var c=coordsDeLink(u); return c ? (+c.lat).toFixed(4)+','+(+c.lng).toFixed(4) : null; }, o={};
    Object.keys(U).forEach(function(k){ o[k]=f(U[k]); });
    o.cacheDir=MAPA_COORDS[U.DIR_DOS] ? (+MAPA_COORDS[U.DIR_DOS].lat).toFixed(4) : null;
    o.cacheCorto=MAPA_COORDS['https://maps.app.goo.gl/CortoInventado1'] ? (+MAPA_COORDS['https://maps.app.goo.gl/CortoInventado1'].lat).toFixed(4) : null;
    return o; }, { DIR_DOS, DIR_NOMBRE, DIR_DOS_NOMBRES, DIR_NOMBRE_COORD, DIR_SIN_DESTINO, SADDR, API1, PLACE,
       Q:'https://www.google.com/maps?q=-17.749444,-63.104556', SUELTAS:'-17.749444, -63.104556', WAZE:'https://ul.waze.com/ul?ll=-17.867825%2C-63.155401&navigate=yes', PLUS:'https://maps.google.com/maps?q=7V24%2BCRP,+Santa+Cruz+de+la+Sierra' });

  chk('1 · «dir/<origen>/<destino>» con dos pares → el DESTINO (-17.8085,-63.1838), no el origen', r.DIR_DOS==='-17.8085,-63.1838', r.DIR_DOS);
  chk('2 · destino con nombre → sus coordenadas de data= (-17.7403,-63.1789), no el centro «@»', r.DIR_NOMBRE==='-17.7403,-63.1789', r.DIR_NOMBRE);
  chk('3 · los dos con nombre → la última de data= (-17.8002,-63.2002)', r.DIR_DOS_NOMBRES==='-17.8002,-63.2002', r.DIR_DOS_NOMBRES);
  chk('3 · origen con nombre y destino con coordenadas → el destino (-17.8101,-63.1901)', r.DIR_NOMBRE_COORD==='-17.8101,-63.1901', r.DIR_NOMBRE_COORD);
  chk('4 · data= sin las coordenadas del destino → sin ubicar (ni el origen -17.7001 ni el centro -17.7555)', r.DIR_SIN_DESTINO===null, r.DIR_SIN_DESTINO);
  chk('5 · «saddr=…&daddr=…» → el destino', r.SADDR==='-17.8002,-63.2002', r.SADDR);
  chk('5 · «dir/?api=1&origin=…&destination=…» → el destino', r.API1==='-17.8002,-63.2002', r.API1);
  chk('6 · un lugar («place/…!3d!4d») sigue igual', r.PLACE==='-17.7489,-63.1429', r.PLACE);
  chk('6 · «maps?q=», coordenadas sueltas, Waze y el Plus Code siguen igual', r.Q==='-17.7494,-63.1046' && r.SUELTAS==='-17.7494,-63.1046' && r.WAZE==='-17.8678,-63.1554' && r.PLUS==='-17.7489,-63.1429', [r.Q, r.SUELTAS, r.WAZE, r.PLUS]);
  chk('7 · lo guardado en el aparato de un «cómo llegar» (el origen viejo) no se usa; el de un enlace corto, sí', r.cacheDir===null && r.cacheCorto==='-17.7601', [r.cacheDir, r.cacheCorto]);

  chk('sin errores de la página', errores.length===0, errores);
  await browser.close();
  console.log('\n'+PASS+' bien, '+FAIL+' mal');
  process.exit(FAIL ? 1 : 0);
})();
