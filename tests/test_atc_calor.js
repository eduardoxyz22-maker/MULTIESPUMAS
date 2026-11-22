/* 🔥 457 · EL MAPA DE CALOR DE LAS ATC (22/11; el dueño lo eligió con la muestra).
   Lo que cuida:
     1. En la pestaña ATC, en la caja de calidad, la grilla línea × meses desde la compra (con `ATC_CALOR_PRUEBA`; sin ella, en Playwright no sale).
     2. Cada celda es la MISMA cuenta de «⏳ A cuántos meses de la compra falla» (`atcqEdades` sobre `atcLista`), con «Sin fecha» aparte.
     3. La frase de lo que más se repite solo con 3 o más en una celda («El Titanio junta reclamos entre los 3 y 6 meses»).
     4. Tocar una celda deja la lista con SOLO esas ATC (y el cartel «✕ Ver todas»); la grilla sigue con todas; otra vez, la saca.
     5. Sigue los filtros de la pestaña (el motivo).
     6. Solo mira (no guarda nada) y no ensancha la página en el celular.
   Datos SINTÉTICOS, reloj clavado en el viernes 13/11/2026 a las 11:00 de Bolivia. Se corre:  node tests/test_atc_calor.js   (SALIDA=<carpeta> deja la captura) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const ARCH='file://'+(process.env.PEDIDOS||path.resolve(__dirname, '..', 'pedidos.html'));
const SALIDA=process.env.SALIDA||'';

function PREPARAR(bandera){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; UNLOCKED=true; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(bandera) window.ATC_CALOR_PRUEBA=1;
  window.SAVES=[];
  loadFromServer=function(){}; apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
  apiSave=function(r){ window.SAVES.push(r); return Promise.resolve({ ok:true, pedido:r }); };
  try{ localStorage.removeItem('me_atc_tabla'); localStorage.removeItem('me_atc_viejas'); }catch(e){}
  var ts=function(f){ return new Date(f+'T10:00:00-04:00').getTime(); }, n=0;
  var A=function(entro, prod, mot, fcom, vend){ n++; return { id:'a'+n, oc:'ATC '+entro.slice(5,7)+'-'+String(n).padStart(3,'0'), vendedor:vend||'Mirian Salazar', cliente:'CLIENTE INVENTADO '+n,
    celular:'7'+String(1000000+n*137), fecha:entro, turno:'AM', ts:ts(entro), entregado:false, fotos:[],
    productos:[{ desc:prod, medida:'140x190', cant:1, atc:{ mot:mot, det:'detalle inventado '+n, fcom:fcom||'', tipo:'gar' } }] }; };
  STATE=[
    /* Titanio: 3 entre los 3 y 6 meses, 1 a los 14 meses, 1 sin fecha */
    A('2026-10-10', 'COLCHON TITANIO ICE', 'Hundimiento', '2026-05-20'),
    A('2026-10-20', 'COLCHON TITANIO ICE', 'Hundimiento', '2026-06-01'),
    A('2026-11-03', 'TITANIO LATEX', 'Ruido', '2026-07-02'),
    A('2026-11-04', 'COLCHON TITANIO ICE', 'Hundimiento', '2025-09-01'),
    A('2026-11-05', 'COLCHON TITANIO ICE', 'Hundimiento', ''),
    /* Oro: 2 en los primeros 3 meses */
    A('2026-10-12', 'ORO ORTOPEDICO', 'Resortes', '2026-09-01', 'Isabel Robledo'),
    A('2026-11-06', 'ORO ORTOPEDICO', 'Resortes', '2026-10-01', 'Isabel Robledo'),
    /* Sueña: 1 después de los 2 años */
    A('2026-10-15', 'COLCHON SOFT', 'Hundimiento', '2023-05-10', 'Mauricio Merida')
  ];
  saveMirror();
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  window._filasTabla=function(){ return [].map.call(document.querySelectorAll('#tbl-atc tbody tr'), function(tr){ return (tr.querySelector('td')||{}).textContent||''; }); };
  window._celdas=function(){ var o={}; [].forEach.call(document.querySelectorAll('#atq-calor .acal-c'), function(b){ o[b.getAttribute('data-k')+'#'+b.getAttribute('data-t')]=+b.textContent; }); return o; };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (w, bandera) => {
    const ctx = await browser.newContext({ viewport:{ width:w, height:1000 }, timezoneId:'America/La_Paz', deviceScaleFactor:2 });
    await ctx.addInitScript(() => { try{ sessionStorage.setItem('me_quien_ok','1'); localStorage.setItem('me_asis_tour','1'); }catch(e){} });
    await ctx.route(/^https?:/, r => r.abort());
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await page.clock.setFixedTime(new Date('2026-11-13T11:00:00-04:00'));
    await page.goto(ARCH, { waitUntil:'load' }); await page.waitForTimeout(700);
    await page.evaluate(PREPARAR, bandera);
    await page.evaluate(() => { showView('atc'); segSet('atc-mode','todo'); renderAtc(); }); await page.waitForTimeout(300);
    return { ctx, page };
  };
  let { ctx, page } = await abrir(1300, true);

  /* 1 y 2 · la grilla y sus números */
  let r = await page.evaluate(() => {
    var E=atcqEdades(atcLista()), esp={};
    E.lineas.forEach(function(l){ l.t.forEach(function(n, i){ if(n) esp[l.k+'#'+i]=n; }); });
    var cab=[].map.call(document.querySelectorAll('#atq-calor thead th'), function(t){ return t.textContent.trim(); });
    return { hay:!!document.getElementById('atq-calor'), cel:_celdas(), esp:esp, cab:cab, lineas:E.lineas.map(function(l){ return l.lbl+':'+l.n; }) };
  });
  chk('1 · con la bandera, la caja de calidad trae «🔥 Dónde se juntan los reclamos»', r.hay, r.lineas);
  chk('2a · cada celda es la cuenta de «A cuántos meses de la compra» (`atcqEdades` de la lista)', JSON.stringify(r.cel)===JSON.stringify(r.esp) && Object.keys(r.cel).length>=4, [r.cel, r.esp]);
  chk('2b · columnas: los 5 tramos, «Sin fecha» aparte y el total', r.cab.join('|')==='Línea|0-3 m|3-6 m|6-12 m|12-24 m|+24 m||Sin fecha|Total', r.cab);
  const kTi=Object.keys(r.cel).filter(k => /\|TITANIO#1$/.test(k))[0];
  chk('2c · el Titanio tiene 3 entre los 3 y 6 meses y 1 sin fecha (en su columna aparte)', kTi && r.cel[kTi]===3 && r.cel[kTi.replace('#1','#5')]===1, [kTi, r.cel]);

  /* 3 · la frase */
  r = await page.evaluate(() => ((document.getElementById('acal-frase')||{}).textContent||''));
  chk('3a · la frase: «El Titanio junta reclamos entre los 3 y 6 meses: 3 de sus 5 ATC.»', /El Titanio junta reclamos entre los 3 y 6 meses: 3 de sus 5 ATC\./.test(r), r);

  /* 4 · tocar una celda */
  r = await page.evaluate(async (k) => { var antes=_filasTabla().length;
    document.querySelector('#atq-calor .acal-c[data-k="'+k.split('#')[0]+'"][data-t="1"]').click(); await _esperar(250);
    var chip=document.getElementById('atc-calor-chip');
    return { antes:antes, filas:_filasTabla(), chip:chip ? chip.textContent : '', celdas:Object.keys(_celdas()).length, on:document.querySelectorAll('#atq-calor .acal-c.on').length, saves:window.SAVES.length }; }, kTi);
  chk('4a · tocar «Titanio · 3-6 m» deja la lista con esas 3 ATC', r.antes===8 && r.filas.length===3, r.filas);
  chk('4b · el cartel lo dice con «✕ Ver todas»', /Ves solo las 3 ATC de .*TITANIO.*3 a 6 meses/i.test(r.chip) && /Ver todas/.test(r.chip), r.chip);
  chk('4c · la grilla sigue con todas las celdas y marca la elegida', r.celdas>=4 && r.on===1, [r.celdas, r.on]);
  if(SALIDA) await page.locator('#atq-calor').screenshot({ path:path.join(SALIDA, 'E-457-calor.png') });
  r = await page.evaluate(async () => { document.querySelector('#atq-calor .acal-c.on').click(); await _esperar(250); return { filas:_filasTabla().length, chip:!!document.getElementById('atc-calor-chip') }; });
  chk('4d · tocarla otra vez vuelve a todas y saca el cartel', r.filas===8 && !r.chip, r);
  r = await page.evaluate(async () => { document.querySelector('#atq-calor .acal-c[data-t="0"]').click(); await _esperar(200); atcCalorLimpiar(); await _esperar(200); return { filas:_filasTabla().length, chip:!!document.getElementById('atc-calor-chip') }; });
  chk('4e · «✕ Ver todas» también la saca', r.filas===8 && !r.chip, r);

  /* 5 · sigue los filtros de la pestaña */
  r = await page.evaluate(async () => { var s=document.getElementById('atc-motivo'); s.value='Hundimiento'; renderAtc(); await _esperar(200);
    var o={ cel:_celdas(), frase:(document.getElementById('acal-frase')||{}).textContent||'' }; s.value=''; renderAtc(); await _esperar(150); return o; });
  const tot=Object.values(r.cel).reduce((a,b)=>a+b,0);
  chk('5 · con el motivo «Hundimiento» solo cuenta esas (5) y sin 3 en una celda no hay frase', tot===5 && !r.frase, [r.cel, r.frase]);
  r = await page.evaluate(() => window.SAVES.length);
  chk('6a · solo mira: no guardó nada', r===0, r);
  if(SALIDA) await page.locator('#atc-calidad').screenshot({ path:path.join(SALIDA, 'E-457-calidad.png') });
  await ctx.close();

  /* 1b · sin la bandera no sale */
  ({ ctx, page } = await abrir(1300, false));
  r = await page.evaluate(() => ({ hay:!!document.getElementById('atq-calor'), edad:!!document.getElementById('atq-edad') }));
  chk('1b · sin `ATC_CALOR_PRUEBA`, en Playwright no sale (lo demás de la caja, sí)', !r.hay && r.edad, r);
  await ctx.close();

  /* 6b · en el celular */
  ({ ctx, page } = await abrir(390, true));
  r = await page.evaluate(() => { var e=document.getElementById('atq-calor'), b=e ? e.getBoundingClientRect() : null;
    return { hay:!!e, sw:document.documentElement.scrollWidth, iw:window.innerWidth, der:b ? Math.round(b.right) : null }; });
  chk('6b · en el celular (390 px) la grilla corre adentro de su caja y no ensancha la página', r.hay && r.sw<=r.iw && r.der<=r.iw, r);
  await ctx.close();

  chk('sin errores de la página', errores.length===0, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
