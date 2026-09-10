/* 📡 ¿QUIÉN LEE LA PLANILLA? (§4dv)

   El 10/09 el registro de Ejecuciones del Apps Script mostró un `doGet` cada 3 segundos
   llevándose la lista entera (§4du), y NADA de este repositorio usa GET. El servidor anota
   las firmas de esos GET (nunca valores) y el panel las pide con {action:'getlog'} desde
   Administración → 📡 ¿Quién lee la planilla?, porque al dueño Ejecuciones no le despliega
   las filas y «Registros de Cloud» está en gris.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Que el botón pida exactamente {action:'getlog'} y dibuje el informe en castellano:
      cuántas, desde cuándo, cada cuánto, por firma, dispositivos, y qué hacer.
   2. Que con un servidor viejo (sin `get` en la respuesta) diga que hay que republicar y
      qué versión falta — no un cartel vacío.
   3. Que un error de red se traduzca (motivoDeError), que la puerta cerrada se vea, y que
      «ninguna lectura» muestre el último resumen guardado en las propiedades.

   Se corre:  node tests/test_getlog.js   (desde la raíz del repo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1300,height:900}, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror',e=>errores.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.route(/^https?:/, r=>r.abort());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(250);

  const faltan = await page.evaluate(() => ['verLecturasGet','renderGetLog','getlogCada','getlogHace']
    .filter(f => typeof window[f] !== 'function').concat(document.getElementById('getlog-btn')?[]:['#getlog-btn'], document.getElementById('getlog-box')?[]:['#getlog-box']));
  if(faltan.length){
    chk('el panel tiene 📡 ¿Quién lee la planilla? (§4dv)', false, 'faltan: '+faltan.join(', '));
    console.log('\n'+PASS+' bien · '+FAIL+' mal'); await browser.close(); process.exit(1);
  }
  // La carga de arranque quedó reintentando (red cortada): que no pise el chip mientras se mira el informe.
  await page.evaluate(() => { CARGA_GEN++; CARGA_ESTADO='ok'; if(CARGA_TIMER){clearTimeout(CARGA_TIMER);CARGA_TIMER=null;} if(CARGA_TIC){clearInterval(CARGA_TIC);CARGA_TIC=null;} });

  /* El informe como lo manda el servidor: 1.812 lecturas en 2 horas, casi todas «sin
     parámetros» del mismo navegador cada 3,4 s, y dos con `_,k` de otro. */
  const FIX = `(function(){ var A=Date.now(); return {
    ahora:A, cerrado:false, max:40, resumenProp:'', sinCache:false, desde:A-2*3600*1000, n:1812,
    firmas:[ {k:'ninguno',p:'ninguno',r:'',n:1810,pri:A-2*3600*1000,ult:A-5000,disp:['a1b2c3'],masDisp:false,como:{cache:1700,hoja:110}},
             {k:'_,k',p:'_,k',r:'',n:2,pri:A-3600*1000,ult:A-1800*1000,disp:['q9w8e7'],masDisp:false,como:{hoja:2}} ],
    ult: Array.apply(null,{length:15}).map(function(_,i){ return {t:A-5000-(14-i)*3400,p:'ninguno',q:0,r:'',d:'a1b2c3',c:(i%10)?'cache':'hoja'}; })
  }; })()`;
  const leer = () => page.evaluate(() => { var b=document.getElementById('getlog-box');
    return { visible:b.style.display!=='none', txt:(b.textContent||'').replace(/\s+/g,' '), html:b.innerHTML, pl:window._pl||[] }; });

  // ══ 1. El informe ════════════════════════════════════════════════════════════
  console.log('\n── 1. El botón pide el informe y lo dibuja ──');
  await page.evaluate((FIX) => {
    window._pl=[]; window._fix=eval(FIX);
    apiPost=function(p){ window._pl.push(p); return Promise.resolve({ok:true, version:SCRIPT_VERSION_ESPERADA, get:window._fix}); };
    document.getElementById('getlog-btn').click();
  }, FIX);
  await page.waitForTimeout(120);
  let r = await leer();
  chk('⚠️ el botón manda exactamente {action:"getlog"} (nada más: ni ids ni pedidos)', r.pl.length===1 && r.pl[0].action==='getlog' && Object.keys(r.pl[0]).filter(k=>k!=='key').length===1, JSON.stringify(r.pl));
  chk('la caja se abre y dice cuántas lecturas hubo y desde cuándo', r.visible && /1812 lecturas/.test(r.txt) && /Desde las \d\d:\d\d:\d\d \(hace 2 h\)/.test(r.txt), r.txt.slice(0,220));
  chk('…y el ritmo de las últimas: una cada ~3,4 s, la última hace 5 s', /Las últimas 15: una cada ~3,4 s, la última hace 5 s/.test(r.txt), r.txt.slice(150,400));
  chk('la firma más repetida primero: «sin parámetros», 1810 veces, un solo dispositivo', /sin parámetros\s*1810/.test(r.txt) && /1 \(a1b2c3\)/.test(r.txt) && r.txt.indexOf('sin parámetros')<r.txt.indexOf('_,k'), r.txt.slice(300,600));
  chk('…con de dónde salió cada respuesta', /de la caché 1700/.test(r.txt) && /leyó la hoja 110/.test(r.txt), '');
  chk('la segunda firma («_,k», 2 veces, otro dispositivo) también está', /_,k<\/td><td[^>]*><b>2<\/b>/.test(r.html) && /1 \(q9w8e7\)/.test(r.txt), r.html.replace(/\s+/g,' ').slice(r.html.indexOf('_,k')-20, r.html.indexOf('_,k')+120));
  chk('el detalle de las últimas 15 lleva hora, largo y dispositivo', /Últimas 15/.test(r.txt) && /· sin parámetros · largo 0 · disp a1b2c3 · de la caché/.test(r.txt), '');
  chk('⚠️ dice cómo leerlo y cómo cerrar la puerta sin reimplementar (GET_CERRADO), y dónde queda el resumen',
      /mismo dispositivo/.test(r.txt) && /GET_CERRADO/.test(r.txt) && /Propiedades del script/.test(r.txt) && /GET_RESUMEN/.test(r.txt) && /usa POST/.test(r.txt), '');
  chk('el ✕ cierra la caja', await page.evaluate(() => { document.querySelector('#getlog-box button').click(); return document.getElementById('getlog-box').style.display==='none'; }), '');

  // ══ 2. Mientras el servidor no contestó, no se pide dos veces ═════════════════
  console.log('\n── 2. Un solo pedido por vez ──');
  await page.evaluate(() => {
    window._pl=[];
    apiPost=function(p){ window._pl.push(p); return new Promise(function(res){ setTimeout(function(){ res({ok:true, version:SCRIPT_VERSION_ESPERADA, get:window._fix}); }, 150); }); };
    document.getElementById('getlog-btn').click(); document.getElementById('getlog-btn').click();
  });
  r = await leer();
  chk('dos toques seguidos = UN pedido, y mientras tanto dice que está preguntando', r.pl.length===1 && r.visible && /Preguntándole al servidor/.test(r.txt), r.pl.length+' pedidos · '+r.txt.slice(0,80));
  await page.waitForTimeout(250);
  r = await leer();
  chk('…y cuando contesta, se dibuja', /1812 lecturas/.test(r.txt), '');
  chk('después se puede volver a pedir', await page.evaluate(() => { document.getElementById('getlog-btn').click(); return window._pl.length; })===2, '');
  await page.waitForTimeout(250);

  // ══ 3. Servidor viejo, error de red, puerta cerrada, ninguna ══════════════════
  console.log('\n── 3. Los otros casos ──');
  await page.evaluate(() => { apiPost=function(){ SERVER_VER='2026-09-10-b'; return Promise.resolve({ok:true, version:'2026-09-10-b'}); }; document.getElementById('getlog-btn').click(); });
  await page.waitForTimeout(80);
  r = await leer();
  chk('⚠️ con el .gs viejo publicado (sin `get`) dice que hay que republicar y qué versión falta',
      /todavía no anota/.test(r.txt) && /2026-09-10-b/.test(r.txt) && r.txt.indexOf(await page.evaluate(()=>SCRIPT_VERSION_ESPERADA))>=0 && /Nueva versión/.test(r.txt), r.txt.slice(0,200));
  await page.evaluate(() => { apiPost=function(){ return Promise.reject(new Error('http404')); }; document.getElementById('getlog-btn').click(); });
  await page.waitForTimeout(80);
  r = await leer();
  chk('un error de red se traduce con motivoDeError (404 = la dirección ya no existe)', /no contestó/.test(r.txt) && /ya no existe \(404\)/.test(r.txt), r.txt.slice(0,160));
  await page.evaluate(() => { apiPost=function(){ return Promise.resolve({ok:false, error:'busy'}); }; document.getElementById('getlog-btn').click(); });
  await page.waitForTimeout(80);
  r = await leer();
  chk('un «no» del servidor se muestra con su motivo', /contestó que no/.test(r.txt) && /busy/.test(r.txt), r.txt.slice(0,120));
  await page.evaluate(() => { var f=Object.assign({}, window._fix, {cerrado:true}); apiPost=function(){ return Promise.resolve({ok:true, version:SCRIPT_VERSION_ESPERADA, get:f}); }; document.getElementById('getlog-btn').click(); });
  await page.waitForTimeout(80);
  r = await leer();
  chk('con GET_CERRADO puesto lo dice arriba de todo, y sigue mostrando a los que insisten', /puerta GET está cerrada/.test(r.txt) && /1812 lecturas/.test(r.txt) && r.txt.indexOf('puerta GET')<r.txt.indexOf('1812'), r.txt.slice(0,220));
  await page.evaluate(() => { var f={ahora:Date.now(), cerrado:false, max:40, sinCache:false, desde:Date.now(), n:0, firmas:[], ult:[], resumenProp:'actualizado 10/09 16:00:00  ||  desde 10/09 14:02:11: 900 lecturas GET (una cada 7.9 s)'};
    apiPost=function(){ return Promise.resolve({ok:true, version:SCRIPT_VERSION_ESPERADA, get:f}); }; document.getElementById('getlog-btn').click(); });
  await page.waitForTimeout(80);
  r = await leer();
  chk('sin lecturas: lo dice, y muestra el último resumen que quedó en las propiedades', /Ninguna lectura por GET/.test(r.txt) && /900 lecturas GET/.test(r.txt), r.txt.slice(0,200));
  await page.evaluate(() => { var f={ahora:Date.now(), cerrado:false, max:40, sinCache:true, desde:Date.now(), n:0, firmas:[], ult:[], resumenProp:''};
    apiPost=function(){ return Promise.resolve({ok:true, version:SCRIPT_VERSION_ESPERADA, get:f}); }; document.getElementById('getlog-btn').click(); });
  await page.waitForTimeout(80);
  r = await leer();
  chk('sin caché en el servidor: avisa que no pudo anotar, en vez de un cero que parece limpio', /caché del script no está disponible/.test(r.txt), r.txt.slice(0,200));

  // ══ 4. Los textos de tiempo ═══════════════════════════════════════════════════
  console.log('\n── 4. Los textos ──');
  const t = await page.evaluate(() => [getlogCada(3.44), getlogCada(200), getlogCada(9000), getlogHace(5000), getlogHace(200000), getlogHace(2*3600*1000+10*60*1000)]);
  chk('cada ~3,4 s · cada ~3 min · cada ~2,5 h', t[0]==='cada ~3,4 s' && t[1]==='cada ~3 min' && t[2]==='cada ~2,5 h', t.slice(0,3).join(' | '));
  chk('hace 5 s · hace 3 min · hace 2 h 10 min', t[3]==='hace 5 s' && t[4]==='hace 3 min' && t[5]==='hace 2 h 10 min', t.slice(3).join(' | '));
  chk('sin errores de JavaScript en todo el recorrido', errores.length===0, errores.join(' | ').slice(0,200));

  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
