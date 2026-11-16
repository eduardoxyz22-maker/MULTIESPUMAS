/* 🏬 MEJORA 343 — LA TIENDA NUEVA, DÍA POR DÍA, en Proyección.

   El dueño (15/11): Tienda Banzer arrancó noviembre con 3 días hábiles en cero y después vendió casi todos los días; Ventura Mall está por abrir.
   «Saber si una tienda nueva arranca bien hoy es armar la cuenta a mano.» Durante sus primeros 30 días, una curva chica y una frase.

   LO QUE ESTA PRUEBA CUIDA:
   1. Qué tienda es nueva: abrió (el 1° del primer mes con ventas, o su primera venta si es después) bastante después de la primera venta del
      panel, y hace 30 días o menos. Las de siempre (con ventas desde el principio) nunca.
   2. La cuenta: lo CARGADO desde que abrió, día hábil por día hábil (lo cargado antes — Carola en octubre, en Central, para noviembre — no es de
      la tienda nueva); los días en cero al abrir; contra la tienda de siempre de la misma marca que más vendió en esos mismos días.
   3. La frase («Día 9: Bs 9.000, el 75 % de Central en los mismos días. 3 días hábiles en cero al abrir.») y la curva.
   4. Con dos tiendas nuevas, la segunda se compara con la anterior en SUS primeros días («igual que Tienda Banzer a esta altura»).
   5. Pasados los 30 días ya no sale; sin la bandera `PRY_TNUEVA_PRUEBA`, nada.
   Datos INVENTADOS. Reloj clavado: jueves 12/11/2026 (después el 25/11 y el 05/12) a las 10:00 de Bolivia.
   Se corre:  node tests/test_tienda_nueva.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,700)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function PREPARAR(){
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  loadFromServer=function(){};
  var n=0;
  window.V=function(vend, fecha, reg, bs, o){ o=o||{}; n++;
    return { id:'p'+n, oc:(fecha||reg).slice(5,7)+'-'+(100+n), nota:String(500+n), vendedor:vend, cliente:'CLIENTE '+n, fecha:fecha, turno:fecha?'AM':'', zona:o.zona||'', direccion:o.direccion||'',
             productos:[{desc:'COLCHON',medida:'140x190',cant:1}], saldo:bs, acuenta:0, pagado:false, metodoPago:'', entregado:false, ts:new Date(reg+'T10:00:00-04:00').getTime(), fotos:[] }; };
  window.FIX=function(){ return [
    /* las de siempre: con ventas desde agosto (Carola era de Central; Mirian, de Mia Plaza; Mauricio, Mutualista) */
    V('Carola Chavez','2026-08-12','2026-08-10',3000), V('Mirian Salazar','2026-08-13','2026-08-11',2000), V('Mauricio Merida','2026-08-14','2026-08-12',2500),
    V('Carola Chavez','2026-10-22','2026-10-20',4000),                                   // Central, octubre: no cuenta (antes de que abra la nueva)
    /* Tienda Banzer (nueva en noviembre): una que Carola cargó el 28/10 para noviembre (no es de la tienda nueva) y las de Andrea */
    V('Carola Chavez','2026-11-05','2026-10-28',4000),
    V('Andrea Orias','2026-11-10','2026-11-06',3000), V('Andrea Orias','2026-11-14','2026-11-09',2000), V('Andrea Orias','2026-11-20','2026-11-11',4000),
    /* Central en noviembre (Isabel y Fabián): 12.000 en esos días */
    V('Isabel Robledo','2026-11-09','2026-11-04',5000), V('Fabián Godoy','2026-11-12','2026-11-10',7000),
    /* Mia Plaza, poco; Mutualista (Sueña), mucho: no es de la misma marca */
    V('Mirian Salazar','2026-11-09','2026-11-05',1000), V('Mauricio Merida','2026-11-09','2026-11-05',50000)
  ]; };
  window.VENTURA=function(){ return [ V('Pedro Inventado','','2026-11-18',2000,{ direccion:DIR_TIENDA+' · Ventura Mall', zona:ZONA_TIENDA }),
                                      V('Pedro Inventado','','2026-11-20',3000,{ direccion:DIR_TIENDA+' · Ventura Mall', zona:ZONA_TIENDA }) ]; };
  window._txt=function(sel){ var e=document.querySelector(sel); return e ? e.innerText.replace(/\s+/g,' ').trim() : ''; };
  window.PINTAR=function(){ UNLOCKED=true; showView('conta'); segSet('cta-tab','proy'); setContaTab('proy'); document.getElementById('pry-mes').value=diaNegocio().slice(0,7); renderProyeccion(); };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const page = await browser.newPage({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-11-12T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(350);
  await page.evaluate(PREPARAR);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,400) }; } };

  console.log('\n── 1. Qué tienda es nueva ──');
  let r = await ev(() => {
    STATE=FIX(); var A=pryTiendasAbren(), o={ primera:A.primera };
    Object.keys(A.T).forEach(function(k){ o[k]=[A.T[k].abre, A.T[k].marca]; });
    o.nuevas=pryTNuevaDatos(proyeccionMes('2026-11')).map(function(d){ return d.st; });
    return o;
  });
  chk('1a. Tienda Banzer abrió el 01/11 (el 1° de su primer mes con ventas, aunque Carola cargó una el 28/10 para noviembre); Central y Mia Plaza, con su primera venta de agosto',
      r['Tienda Banzer'] && r['Tienda Banzer'][0]==='2026-11-01' && r['Central'] && r['Central'][0]==='2026-08-10' && r['Mia Plaza'][0]==='2026-08-11' && r.primera==='2026-08-10', r);
  chk('1b. solo Tienda Banzer es nueva (las de siempre nunca)', JSON.stringify(r.nuevas)==='["Tienda Banzer"]', r.nuevas);

  console.log('\n── 2. La cuenta ──');
  r = await ev(() => {
    var D=pryTNuevaDatos(proyeccionMes('2026-11'))[0];
    return D ? { dias:D.dias, c:D.c, n:D.n, cero:D.cero, sie:D.sie && D.sie.st, sieC:D.sie && D.sie.c, ant:D.ant } : null;
  });
  chk('2a. 9 días hábiles: del 03/11 (el 02 fue Todos Santos) al jueves 12/11, sin el domingo', r && r.n===9 && r.dias[0]==='2026-11-03' && r.dias[8]==='2026-11-12' && r.dias.indexOf('2026-11-08')<0, r && r.dias);
  chk('2b. lo cargado desde que abrió: 0, 0, 0, 3.000 … 9.000 (la de Carola del 28/10 no cuenta); 3 días en cero', r && JSON.stringify(r.c)==='[0,0,0,3000,3000,5000,5000,9000,9000]' && r.cero===3, r && r.c);
  chk('2c. contra Central (Heaven, la de siempre que más vendió esos días: 12.000), no Mutualista (Sueña) ni Mia Plaza; sin tienda nueva anterior',
      r && r.sie==='Central' && r.sieC[8]===12000 && r.sieC[0]===0 && r.ant===null, r);

  console.log('\n── 3. Lo que se ve ──');
  r = await ev(() => { window.PRY_TNUEVA_PRUEBA=1; PINTAR();
    var c=document.querySelector('#cx-pry .ptn'); return { t:_txt('#cx-pry .ptn'), lineas:c ? c.querySelectorAll('svg polyline').length : 0, n:document.querySelectorAll('#cx-pry .ptn').length,
      scroll:document.documentElement.scrollWidth>document.documentElement.clientWidth }; });
  chk('3a. una tarjeta «🏬 Tienda Banzer · sus primeros días hábiles · TIENDA NUEVA», «abrió el mar 03/11»', r.n===1 && /🏬 Tienda Banzer · sus primeros días hábiles TIENDA NUEVA/.test(r.t) && /abrió el mar 03\/11/.test(r.t), r.t);
  chk('3b. «Día 9: Bs 9.000, el 75 % de Central en los mismos días. 3 días hábiles en cero al abrir.»', /Día 9: Bs 9\.000, el 75 % de Central en los mismos días\. 3 días hábiles en cero al abrir\./.test(r.t), r.t);
  chk('3c. la curva: la de la tienda y la de Central (punteada); sin scroll de costado', r.lineas===2 && /━ Tienda Banzer/.test(r.t) && /┅ Central \(de siempre, los mismos días\)/.test(r.t) && !r.scroll, [r.lineas, r.scroll]);

  console.log('\n── 4. Dos tiendas nuevas: Ventura Mall contra Tienda Banzer en sus primeros días ──');
  await page.clock.setFixedTime(new Date('2026-11-25T10:00:00-04:00'));
  r = await ev(() => { STATE=FIX().concat(VENTURA()); PINTAR();
    var L=pryTNuevaDatos(proyeccionMes('2026-11')), v=L.filter(function(d){ return d.st==='Ventura Mall'; })[0];
    return { sts:L.map(function(d){ return d.st; }), v:v && { abre:v.abre, n:v.n, c:v.c, ant:v.ant && v.ant.st, antC:v.ant && v.ant.c }, t:_txt('#cx-pry .ptn[data-st="Ventura Mall"]') }; });
  chk('4a. el 25/11 son nuevas las dos (Tienda Banzer todavía está en sus 30 días)', JSON.stringify(r.sts)==='["Tienda Banzer","Ventura Mall"]', r.sts);
  chk('4b. Ventura abrió con su primera venta (18/11): 7 días hábiles (18 al 25, sin el domingo); contra Tienda Banzer en SUS primeros 7 (5.000)',
      r.v && r.v.abre==='2026-11-18' && r.v.n===7 && r.v.c[r.v.n-1]===5000 && r.v.ant==='Tienda Banzer' && JSON.stringify(r.v.antC)==='[0,0,0,3000,3000,5000,5000]', r.v);
  chk('4c. «Día 7: Bs 5.000, igual que Tienda Banzer a esta altura» y su línea punteada', /Día 7: Bs 5\.000, igual que Tienda Banzer a esta altura/.test(r.t) && /┅ Tienda Banzer \(en sus primeros días\)/.test(r.t), r.t);

  console.log('\n── 5. Pasados los 30 días, y sin la bandera ──');
  await page.clock.setFixedTime(new Date('2026-12-05T10:00:00-04:00'));
  r = await ev(() => { STATE=STATE.concat([V('Isabel Robledo','2026-12-03','2026-12-02',1000)]); PINTAR(); var o={ sts:[].map.call(document.querySelectorAll('#cx-pry .ptn'), function(e){ return e.getAttribute('data-st'); }) };
    window.PRY_TNUEVA_PRUEBA=0; renderProyeccion(); o.sinBandera=document.querySelectorAll('#cx-pry .ptn').length; return o; });
  chk('5a. el 05/12 Tienda Banzer ya no sale (abrió hace más de 30 días); Ventura sí', JSON.stringify(r.sts)==='["Ventura Mall"]', r.sts);
  chk('5b. sin `PRY_TNUEVA_PRUEBA` (Playwright), nada: las pruebas de siempre no cambian', r.sinBandera===0, r.sinBandera);

  chk('la página no tiró errores', errores.length===0, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
