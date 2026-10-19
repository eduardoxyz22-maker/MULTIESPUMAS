/* 📱 VERIFICACIÓN FINAL DE STOCK — «Pantalla, botones y velocidad (y lo del crítico)» (19/10, §4ls, verificación final de `18fb452`).
   Los hallazgos confirmados del grupo, cada uno con su comprobación (y un control que ya andaba).

   FP1  PA-1   El Plan de stock en el celular (390 px) y en el iPad parado (820 px): nada se sale de la tarjeta (antes 51 elementos, la tabla de
               336 px se corría hasta 780) y las celdas cortan renglón.
   FP2  PA-2   Tildar «Ya pedí» en una fila de abajo (celular): el «↩️ Deshacer» queda a la vista (antes 1.250-1.500 px arriba).
   FP3  PA-3   El corte anterior de HOY lo subió la página de antes (sin las dos casillas): el mismo contenido, con la mañana marcada, no anota
               entradas sin explicar (antes +2). Controles: «ningún turno» A PROPÓSITO (`incT:'no'`) sigue +2, y un corte anterior de antes de
               las 09:30 también. Subir con las dos casillas destildadas deja `incT:'no'` en el historial.
   FP4  PA-4   Un dibujo de Stock calcula el plazo de fábrica UNA vez (antes una por fila); tocar un chip o abrir una fila del Plan redibuja solo
               el Plan («Más vistas» queda como estaba); la Lista de carga sin nada marcado no arma la revisión.
   FP5  PA-6   La barra de Stock en el celular muestra los plazos de las fábricas (dos renglones, los plazos primero); en la compu, como siempre.
   FP6  PA-7   Archivo de 3 almacenes: tocar afuera en el ÚLTIMO (Moreno) avisa y no lo descarta; cancelar dice qué no se usó. Control: un solo
               almacén, tocar afuera cancela como siempre.
   FP7  PA-8   «📥 Llegó de fábrica»: la recogida dice cuándo se anotó y cuándo se va a buscar; un pedido vencido «tenían que llegar». «Anotada 1
               unidad que salió»; la copia para fábrica «1 ya vendido sin entregar».
   FP8  PA-9   Revisión automática: los N° de pedido miden ≥ 28 px y la ficha abierta desde la ventana trae «← Volver a la revisión», que
               vuelve a ella. Control: abierta desde otro lado, sin ese botón.
   FP9  PA-10  «📋 Conté a mano → Guardar» recorre los pedidos una vez, no una por producto (y guardar sin tocar no mueve el depósito).
   FP10 PA-11  Contraste en la revisión y en el historial: el gris de «sin marcar», el verde de «Con stock para cargar» y los «+N» del
               historial con tonos que se leen (≥ 4,5:1).
   FP11 CR-1   «📅 Reprogramar» hacia antes avisa si a otro pedido prometido le deja de alcanzar (y si el propio no llega), como el
               formulario; Cancelar no mueve nada; para más adelante no pregunta; también desde «No salió · reprogramar» del cierre.
   FP12 CR-2   El MISMO Excel otra vez con otra respuesta de los turnos rehace el control: las detecciones y `h[].d` quedan como si se hubiera
               subido una sola vez con la respuesta buena (antes quedaban las de la primera). La vista previa lo dice.

   Reloj CLAVADO (cada parte dice a qué hora). Red cortada, datos sintéticos (el repo es público).
   Se corre:  node tests/test_stock_final_pantalla.js
   Dientes:   PEDIDOS=/ruta/a/pedidos_225ccf6.html node tests/test_stock_final_pantalla.js   (19/10: 54 bien aquí; 35 rojas contra 225ccf6:
              las verdes son las partidas, los controles y «sin errores») */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,700)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
/* El mismo arranque que `test_stock_rev2_textos.js` (datos sintéticos «CLIENTE n», red cortada). */
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_textos.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));
const corre = async (page, fn, arg) => page.evaluate(async ([src, arg]) => { try{ return await (0,eval)('('+src+')')(arg); }catch(e){ return { __error:String(e && e.stack || e) }; } }, [fn.toString(), arg]);
const ERRS=[];
const APARATOS = {
  cel:  { viewport:{ width:390, height:844 }, hasTouch:true, isMobile:true, deviceScaleFactor:1 },
  ipad: { viewport:{ width:820, height:1180 }, hasTouch:true, isMobile:true, deviceScaleFactor:1 },
  pc:   { viewport:{ width:1300, height:900 } },
};
async function abrir(browser, reloj, aparato){
  const ctx = await browser.newContext(Object.assign({}, APARATOS[aparato||'pc'], { timezoneId:'America/La_Paz' }));
  const page = await ctx.newPage(); page.setDefaultTimeout(30000);
  page.on('pageerror', e => ERRS.push(e.message)); page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date(reloj));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');
  await page.evaluate(() => {
    try{ localStorage.setItem('me_cierre_quien','Prueba'); }catch(e){}
    /* 14 productos del catálogo (ninguno discontinuado), cada uno con 3 vendidos para pasado mañana y 0 en PTF: todos con «Ya pedí». */
    window._CODS=['CH1129','CH1130','CH1131','CH1132','CH1224','CH1220','CH1201','CH1221','CH1222','CH1042','CH1031','CH1036','CH1037','CH1038'];
    window._P=_CODS.map(function(c){ var x=CODIGOS[c]; return { cod:c, d:x.d, m:x.m, k:_k(c, x.d, x.m) }; });
    window._muchos=async function(fnSt, extra){
      var st=_stock(function(st){ _P.forEach(function(x){ st.c.u[x.k]=0; }); if(fnSt) fnSt(st); });
      var P=_P.map(function(x, i){ return _ped({ id:'m'+i, fecha:_d(2+(i%3)), productos:[_lin(x.cod, x.d, x.m, 3)] }); }).concat(extra||[]);
      await _cargar(P, st);
    };
    window._rect=function(el){ var r=el.getBoundingClientRect(); return { top:Math.round(r.top), bottom:Math.round(r.bottom), left:Math.round(r.left), right:Math.round(r.right), h:Math.round(r.height), w:Math.round(r.width) }; };
    window._lum=function(c){ var m=String(c).match(/\d+(\.\d+)?/g).map(Number); var f=function(v){ v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }; return 0.2126*f(m[0])+0.7152*f(m[1])+0.0722*f(m[2]); };
    window._contraste=function(a, b){ var x=_lum(a), y=_lum(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); };
  });
  page._ctx=ctx;
  return page;
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  let page, r;
  const RELOJ='2026-10-20T10:30:00-04:00';   // martes 20/10, 10:30 de Bolivia

  // ═══ FP1. PA-1 — el Plan en tarjetas: nada se sale ═══
  console.log('\n── FP1. El Plan de stock en el celular y en el iPad (PA-1) ──');
  for (const ap of ['cel', 'ipad']) {
    page = await abrir(browser, RELOJ, ap);
    r = await corre(page, async () => {
      await _muchos(function(st){
        /* Un «Ya pedí» vencido (el aviso largo de Man-VM10) en el primer producto. */
        st.p.push({ id:'yv1', k:_P[0].k, u:23, fab:'Moreno', f:_d(-9), arr:_d(-9), esp:_d(-4), r:'', ya:1, t:_ts(_d(-9)) });
      });
      abrirStock(); await new Promise(function(r){ setTimeout(r, 300); });
      var plan=document.getElementById('stk-plan'), tab=plan && plan.querySelector('.pl-tabla'); if(!tab) return { sinPlan:true };
      var pr=tab.getBoundingClientRect(), fuera=0, maxR=0, ej=[];
      plan.querySelectorAll('.pl-tabla tr.pl-fila td, .pl-tabla tr.pl-fila td *').forEach(function(el){
        var q=el.getBoundingClientRect(); if(q.width<1) return;
        if(q.right>pr.right+1){ fuera++; maxR=Math.max(maxR, q.right); if(ej.length<4) ej.push(String(el.textContent).replace(/\s+/g,' ').trim().slice(0,50)); }
      });
      var td=plan.querySelector('tr.pl-fila td.pl-q');
      return { sw:tab.scrollWidth, cw:tab.clientWidth, fuera:fuera, maxR:Math.round(maxR), derecha:Math.round(pr.right), ej:ej, ws:td ? getComputedStyle(td).whiteSpace : '',
               filas:plan.querySelectorAll('tr.pl-fila').length, venc:!!plan.querySelector('.pl-ya-venc') };
    });
    chk('FP1-'+ap+'a. (partida) el Plan tiene filas y el aviso largo de un «Ya pedí» vencido', !r.__error && r.filas>=10 && r.venc, r);
    chk('FP1-'+ap+'b. la tabla no se corre de costado (scrollWidth ≤ clientWidth)', r.sw<=r.cw+1, { sw:r.sw, cw:r.cw });
    chk('FP1-'+ap+'c. nada de las filas se sale de la tarjeta (antes, en el celular, «Se corta», «Qué hacer hoy» y los «Ya pedí»)', r.fuera===0, { fuera:r.fuera, maxR:r.maxR, borde:r.derecha, ej:r.ej });
    chk('FP1-'+ap+'d. las celdas cortan renglón (white-space normal)', r.ws==='normal', r.ws);
    await page._ctx.close();
  }

  // ═══ FP2. PA-2 — «↩️ Deshacer» a la vista en el celular ═══
  console.log('\n── FP2. «Ya pedí» en una fila de abajo: el «↩️ Deshacer» se ve (PA-2) ──');
  page = await abrir(browser, RELOJ, 'cel');
  await corre(page, async () => { await _muchos(); abrirStock(); await new Promise(function(r){ setTimeout(r, 300); }); });
  const cajas = page.locator('#stk-plan .pl-ya-chk input:not(:checked)');
  const nCajas = await cajas.count();
  chk('FP2a. (partida) hay más de 8 casillas «Ya pedí» en el Plan', nCajas>8, nCajas);
  const caja = cajas.nth(8);
  await caja.evaluate(el => el.scrollIntoView({ block:'center' }));
  await page.waitForTimeout(150);
  const bb = await caja.boundingBox();
  await page.touchscreen.tap(bb.x+bb.width/2, bb.y+bb.height/2);
  await page.waitForTimeout(500);
  r = await corre(page, async () => {
    var u=document.getElementById('pl-ya-undo'), b=document.getElementById('stock-body'); if(!u) return { sinUndo:true, ya:(STOCK.p||[]).filter(function(q){ return q && q.ya; }).length };
    var ur=_rect(u), br=_rect(b);
    return { undo:ur, body:br, visible: ur.top>=br.top && ur.bottom<=Math.min(br.bottom, innerHeight), ya:(STOCK.p||[]).filter(function(q){ return q && q.ya && q.f===todayStr(); }).length, txt:u.textContent };
  });
  chk('FP2b. (partida) se anotó el «Ya pedí» y está el cartel «↩️ Deshacer»', !r.sinUndo && r.ya===1 && /Deshacer/.test(r.txt||''), r);
  chk('FP2c. el cartel con «↩️ Deshacer» queda A LA VISTA dentro de Stock (antes quedaba arriba, fuera de la pantalla)', !!r.visible, { undo:r.undo, body:r.body });
  await page._ctx.close();

  // ═══ FP3. PA-3 — el corte anterior de hoy, de la página de antes ═══
  console.log('\n── FP3. El corte anterior de hoy lo subió la página de antes (PA-3) ──');
  page = await abrir(browser, RELOJ, 'pc');
  r = await corre(page, async () => {
    var K=_P[0].k, hoy=todayStr(), out={};
    var caso=async function(hPrev, horaPrev){
      var st=_stock(function(st){ st.c.u[K]=5; st.c.hora=horaPrev; st.h=[ Object.assign({ id:_LOG+'|'+hoy+'|'+horaPrev, f:hoy, hora:horaPrev, alm:_LOG, rol:'log', n:1, u:5, ts:_ts(hoy, horaPrev), hu:'zz' }, hPrev) ]; });
      /* Lo de la mañana de HOY (2 de PTF, sin ✅), cargado a las 08:00. */
      await _cargar([ _ped({ id:'am1', fecha:hoy, turno:'AM', ts:_ts(hoy, '08:00:00'), productos:[_lin(_P[0].cod, _P[0].d, _P[0].m, 2)] }) ], st);
      var R={ almacen:_LOG, fecha:hoy, hora:'10:10:16', solo0:true, items:[{ k:K, cant:5 }], total:5, cods:{}, esLog:true, conocido:true };
      var C=stockConciliar(R, 'log', { am:true, pm:false }), f=(C.filas||[]).filter(function(x){ return x.k===K; })[0];
      return { dif:f ? f.dif : 0, supuesto:C.prevSupuesto||null, txt:existEsperadoTxtSeguro(C, R) };
    };
    window.existEsperadoTxtSeguro=function(C, R){ try{ return typeof existEsperadoTxt==='function' ? existEsperadoTxt(C, R) : stockVentanaTxt(C.ventana); }catch(e){ return ''; } };
    out.vieja=await caso({ inc:false }, '10:05:32');              // la página de antes: «no incluye» (su casilla única, sin marcar antes de las 12)
    out.adrede=await caso({ inc:false, incT:'no' }, '10:05:32');  // esta página: «ningún turno» a propósito
    out.temprano=await caso({ inc:false }, '09:00:00');           // de la página de antes, pero de antes de las 09:30: la mañana todavía no había salido
    return out;
  });
  chk('FP3a. corte anterior de hoy (10:05) de la página de antes + el mismo contenido a las 10:10 con la mañana: 0 de diferencia (antes +2 «entrada sin explicar»)', r.vieja && r.vieja.dif===0, r.vieja);
  chk('FP3b. la vista previa dice que se supuso por la hora (lo cargó la página de antes)', r.vieja && /página de antes/.test(r.vieja.txt||''), r.vieja && r.vieja.txt);
  chk('FP3c. control: «ningún turno» A PROPÓSITO (incT:\'no\', esta página) se respeta: +2', r.adrede && r.adrede.dif===2, r.adrede);
  chk('FP3d. control: corte anterior de las 09:00 (la mañana no había salido): +2 como siempre', r.temprano && r.temprano.dif===2, r.temprano);
  r = await corre(page, async () => {
    var K=_P[0].k, hoy=todayStr();
    await _cargar([], _stock(function(st){ st.c.u[K]=5; st.c.f=_d(-1); st.c.hora='10:00:00'; }));
    EXIST_COLA=[]; EXIST_IMP={ almacen:_LOG, fecha:hoy, hora:'10:10:16', solo0:true, items:[{ k:K, cant:5, cat:true }], total:5, repetidos:0, malos:0, cods:{}, esLog:true, conocido:true, sacado:hoy };
    renderImportExist(); await new Promise(function(r){ setTimeout(r, 100); });
    var a=document.getElementById('exist-inc'), b=document.getElementById('exist-inc-pm');
    if(a){ a.checked=false; a.dispatchEvent(new Event('change', { bubbles:true })); } if(b){ b.checked=false; b.dispatchEvent(new Event('change', { bubbles:true })); }
    await confirmarImportExist();
    var h=(STOCK.h||[])[0]||{};
    return { hora:h.hora, incT:h.incT==null?null:h.incT, inc:h.inc };
  });
  chk('FP3e. subir con las dos casillas destildadas deja «ningún turno» A PROPÓSITO en el historial (incT:\'no\')', r && r.hora==='10:10:16' && r.incT==='no', r);
  await page._ctx.close();

  // ═══ FP4. PA-4 — una cuenta por dibujo y repintar solo el Plan ═══
  console.log('\n── FP4. Stock: el plazo de fábrica una vez por dibujo y los toques del Plan sin rearmar todo (PA-4) ──');
  page = await abrir(browser, RELOJ, 'pc');
  r = await corre(page, async () => {
    await _muchos(); abrirStock(); await new Promise(function(r){ setTimeout(r, 200); });
    var n=0, orig=stockMuestrasFabrica; stockMuestrasFabrica=function(){ n++; return orig.apply(this, arguments); };
    try{ renderStock(); } finally { stockMuestrasFabrica=orig; }
    var filas=document.querySelectorAll('#stk-plan tr.pl-fila').length;
    var mas=document.getElementById('stk-mas'); mas.__marca=1;
    planFiltro('ya'); await new Promise(function(r){ setTimeout(r, 50); });
    var masDespues=document.getElementById('stk-mas'), chipOn=(document.querySelector('#stk-plan .pl-chip.on')||{}).getAttribute ? document.querySelector('#stk-plan .pl-chip.on').getAttribute('data-f') : '';
    var k0=(document.querySelector('#stk-plan tr.pl-fila')||{}).getAttribute ? document.querySelector('#stk-plan tr.pl-fila').getAttribute('data-k') : '';
    planAbrir(k0); await new Promise(function(r){ setTimeout(r, 50); });
    var abierta=!!document.querySelector('#stk-plan tr.pl-det'), mas2=document.getElementById('stk-mas');
    planFiltro('todos');
    return { calculos:n, filas:filas, mismoMas:!!(masDespues && masDespues.__marca===1), mismoMas2:!!(mas2 && mas2.__marca===1), chipOn:chipOn, abierta:abierta };
  });
  chk('FP4a. un dibujo de Stock calcula el plazo de fábrica una vez (antes, unas tres por fila del Plan)', r.calculos>=1 && r.calculos<=2, { calculos:r.calculos, filas:r.filas });
  chk('FP4b. tocar un chip del Plan redibuja solo el Plan: «Más vistas» es el mismo (no se volvió a armar) y el chip quedó elegido', r.mismoMas && r.chipOn==='ya', r);
  chk('FP4c. abrir una fila del Plan, lo mismo: aparece su detalle y «Más vistas» no se rearma', r.abierta && r.mismoMas2, r);
  r = await corre(page, async () => {
    var hoy=todayStr();
    var sin=[ _ped({ id:'c1', fecha:hoy, productos:[_lin(_P[1].cod, _P[1].d, _P[1].m, 1)] }) ];
    var con=[ _ped({ id:'c2', fecha:hoy, productos:[_lin(_P[2].cod, _P[2].d, _P[2].m, 1, { chk:'ok' })] }) ];
    var n=0, orig=stockAsignar; stockAsignar=function(){ n++; return orig.apply(this, arguments); };
    try{ CARGA_SR_MEMO=null; cargaSinRespMapa(sin); var nSin=n; n=0; CARGA_SR_MEMO=null; cargaSinRespMapa(con); var nCon=n; } finally { stockAsignar=orig; }
    return { sin:nSin, con:nCon };
  });
  chk('FP4d. la Lista de carga sin ninguna línea marcada ✔/📥 no arma la revisión entera', r.sin===0, r);
  chk('FP4e. control: con una línea marcada ✔ sí (para decir «⚠️ sin stock que la respalde»)', r.con===1, r);
  await page._ctx.close();

  // ═══ FP5. PA-6 — la barra de Stock en el celular ═══
  console.log('\n── FP5. La barra de Stock en el celular dice desde cuándo se entrega lo que se pide (PA-6) ──');
  for (const ap of ['cel', 'pc']) {
    page = await abrir(browser, RELOJ, ap);
    r = await corre(page, async () => {
      await _muchos(); abrirStock(); await new Promise(function(r){ setTimeout(r, 200); });
      var inf=document.getElementById('stock-info'), cs=getComputedStyle(inf), d=stockData(), fab=stockFabricasTxt(d.fabricas);
      return { ws:cs.whiteSpace, clamp:cs.webkitLineClamp||cs.getPropertyValue('-webkit-line-clamp'), empiezaPlazos:inf.textContent.indexOf(fab)===0, empiezaCorte:/^corte del/.test(inf.textContent),
               lineas:Math.round(inf.getBoundingClientRect().height/parseFloat(cs.lineHeight||'16')), txt:inf.textContent.slice(0,90) };
    });
    if(ap==='cel'){
      chk('FP5a. celular: la barra va en dos renglones (no uno con «…») y los plazos de las fábricas van primero', r.ws==='normal' && String(r.clamp)==='2' && r.empiezaPlazos, r);
    } else {
      chk('FP5b. compu: como siempre, «corte del …» primero', r.empiezaCorte, r);
    }
    await page._ctx.close();
  }

  // ═══ FP6. PA-7 — el último almacén del archivo no se descarta con un toque afuera ═══
  console.log('\n── FP6. Excel de 3 almacenes: tocar afuera en el último (PA-7) ──');
  page = await abrir(browser, RELOJ, 'pc');
  r = await corre(page, async () => {
    var hoy=todayStr(), K=_P[0].k, out={};
    await _cargar([], _stock(function(st){ st.c.u[K]=1; st.g[_BZ].u[K]=1; st.g[_IM].u[K]=1; }));
    var lote={ i:1, n:3, alms:[_LOG,_BZ,_IM], par:{} };
    var R=function(alm, i, esLog){ return { almacen:alm, fecha:hoy, hora:'10:20:00', solo0:true, items:[{ k:K, cant:1 }], total:1, repetidos:0, malos:0, cods:{}, esLog:esLog, conocido:true, sacado:hoy, lote:Object.assign({}, lote, { i:i }) }; };
    EXIST_COLA=[R(_BZ,2,false), R(_IM,3,false)]; EXIST_IMP=R(_LOG,1,true); renderImportExist();
    existSaltar(); existSaltar();
    out.ultimo=(EXIST_IMP||{}).almacen===_IM;
    _toasts.length=0; modalFondo();
    out.sigue=!!EXIST_IMP; out.modal=document.getElementById('modal').classList.contains('on'); out.toast=_toasts.slice(-1)[0]||'';
    _toasts.length=0; existCancelar();
    out.cancelado=!EXIST_IMP; out.toastCancel=_toasts.slice(-1)[0]||'';
    /* control: un archivo de UN almacén */
    EXIST_COLA=[]; EXIST_IMP={ almacen:_LOG, fecha:hoy, hora:'10:25:00', solo0:true, items:[{ k:K, cant:1 }], total:1, repetidos:0, malos:0, cods:{}, esLog:true, conocido:true, sacado:hoy };
    renderImportExist(); modalFondo(); out.unoCancela=!EXIST_IMP;
    return out;
  });
  chk('FP6a. (partida) con «⏭ Saltar» dos veces se llega al último almacén (IM)', r.ultimo, r);
  chk('FP6b. tocar afuera en el ÚLTIMO no lo descarta: la vista previa sigue abierta y avisa «Falta decidir el Excel de …»', r.sigue && r.modal && /Falta decidir/.test(r.toast), r);
  chk('FP6c. cancelar dice qué Excel no se usó', r.cancelado && /No se usó el Excel de/.test(r.toastCancel), r.toastCancel);
  chk('FP6d. control: un Excel de UN almacén, tocar afuera cancela como siempre', r.unoCancela, r);
  await page._ctx.close();

  // ═══ FP7. PA-8 — textos ═══
  console.log('\n── FP7. Textos: la recogida, lo vencido, «1 unidad», «1 vendido» (PA-8) ──');
  page = await abrir(browser, RELOJ, 'pc');
  r = await corre(page, async () => {
    var hoy=todayStr(), K=_P[0].k, K2=_P[1].k, K3=_P[2].k;
    var st=_stock(function(st){ st.c.u[K]=3; st.c.u[K2]=3; st.c.u[K3]=0; st.g[_IM].u[K]=5;
      st.p.push({ id:'rc1', k:K, u:1, tipo:'recogida', de:_IM, f:hoy, esp:_d(1), r:'', t:_ts(hoy, '10:00:00') });
      st.p.push({ id:'pf1', k:K2, u:2, fab:'Moreno', f:_d(-8), esp:_d(-2), r:'', t:_ts(_d(-8)) }); });
    await _cargar([ _ped({ id:'v1', fecha:_d(2), productos:[_lin(_P[2].cod, _P[2].d, _P[2].m, 1)] }) ], st);
    abrirStockEntrada(); await new Promise(function(r){ setTimeout(r, 100); });
    var ent=(document.getElementById('modal-box').innerText||'').replace(/\s+/g,' ');
    closeModal();
    abrirStockSalida(); await new Promise(function(r){ setTimeout(r, 100); });
    var sk=document.getElementById('stk-sal-k'); if(sk){ if(![].some.call(sk.options||[], function(o){ return o.value===K; })){ var op=document.createElement('option'); op.value=K; sk.appendChild(op); } sk.value=K; }
    var su=document.getElementById('stk-sal-u'); if(su) su.value='1';
    _toasts.length=0; guardarStockSalida();
    var tSal=_toasts.slice(-1)[0]||'';
    var copia=_copia(function(){ copiarStock(); });
    return { ent:ent, tSal:tSal, copia:copia };
  });
  chk('FP7a. la recogida dice cuándo se ANOTÓ y cuándo se va a buscar (no «a recoger … el 20/10 · llegaban»)', /anotada el 20\/10/.test(r.ent) && /se va a buscar el mi[eé] 21\/10/.test(r.ent) && !/llegaban/.test(r.ent), r.ent.slice(0,400));
  chk('FP7b. el pedido a fábrica vencido: «tenían que llegar el 18/10»', /2 pedidas a Moreno el 12\/10 · tenían que llegar el 18\/10/i.test(r.ent), r.ent.slice(0,400));
  chk('FP7c. «📤 Anotada 1 unidad que salió» (no «Anotadas 1 unidades»)', /Anotada 1 unidad que salió/.test(r.tSal) && !/1 unidades/.test(r.tSal), r.tSal);
  chk('FP7d. la copia para fábrica: «1 ya vendido sin entregar» (no «1 ya vendidos»)', /1 ya vendido sin entregar/.test(r.copia) && !/\b1 ya vendidos/.test(r.copia), r.copia.slice(0,500));
  await page._ctx.close();

  // ═══ FP8. PA-9 — los N° de pedido de la revisión ═══
  console.log('\n── FP8. Revisión automática: los N° de pedido se tocan y se vuelve a la revisión (PA-9) ──');
  page = await abrir(browser, RELOJ, 'cel');
  r = await corre(page, async () => {
    var K=_P[0].k, out={};
    await _cargar([ _ped({ id:'sr1', fecha:_d(1), productos:[_lin(_P[0].cod, _P[0].d, _P[0].m, 2, { chk:'ok' })] }) ], _stock(function(st){ st.c.u[K]=0; }));
    REVSTK_DIAS='todos'; abrirStockRevisar(); await new Promise(function(r){ setTimeout(r, 100); });
    var a=document.querySelector('#modal-box a[data-id="sr1"]');
    out.hay=!!a; if(!a) return out;
    out.alto=Math.round(a.getBoundingClientRect().height);
    a.click(); await new Promise(function(r){ setTimeout(r, 100); });
    out.ficha=/Pedido/.test((document.querySelector('#modal-box .modal-h h3')||{}).textContent||'');
    var v=document.getElementById('rev-volver'); out.volver=!!v;
    if(v){ v.click(); await new Promise(function(r){ setTimeout(r, 100); }); }
    out.vuelve=/Revisión automática/.test((document.querySelector('#modal-box .modal-h h3')||{}).textContent||'');
    closeModal(); showPedidoModal('sr1'); out.otroLado=!!document.getElementById('rev-volver'); closeModal();
    return out;
  });
  chk('FP8a. (partida) la revisión muestra el N° del pedido marcado ✔ sin stock', r.hay, r);
  chk('FP8b. el N° de pedido mide ≥ 28 px de alto (antes 15)', r.alto>=28, r);
  chk('FP8c. abierto desde la ventana de la revisión, la ficha trae «← Volver a la revisión»', r.ficha && r.volver, r);
  chk('FP8d. «← Volver a la revisión» vuelve a la revisión', r.vuelve, r);
  chk('FP8e. control: la ficha abierta desde otro lado no trae ese botón', r.otroLado===false, r);
  await page._ctx.close();

  // ═══ FP9. PA-10 — «Conté a mano → Guardar» ═══
  console.log('\n── FP9. «📋 Conté a mano → Guardar» sin una pasada por producto (PA-10) ──');
  page = await abrir(browser, RELOJ, 'pc');
  r = await corre(page, async () => {
    var hoy=todayStr(), extra=[];
    for(var i=0;i<40;i++) extra.push(_ped({ id:'e'+i, fecha:_d(-5+(i%4)), entregado:i%2===0, productos:[_lin(_P[i%_P.length].cod, _P[i%_P.length].d, _P[i%_P.length].m, 1)] }));
    await _muchos(function(st){ _P.forEach(function(x, i){ st.c.u[x.k]=10+i; }); }, extra);
    var antes={}; stockData().lista.forEach(function(o){ antes[o.k]=o.deposito; });
    abrirStockConteo(); await new Promise(function(r){ setTimeout(r, 100); });
    var n=0, orig=stockCuenta; stockCuenta=function(){ n++; return orig.apply(this, arguments); };
    try{ guardarStockConteo(); } finally { stockCuenta=orig; }
    stockOlvidarIndice();
    var dist=0; stockData().lista.forEach(function(o){ if(antes[o.k]!=null && o.deposito!==antes[o.k]) dist++; });
    return { pasadas:n/STATE.length, filas:STATE.length, distintos:dist };
  });
  chk('FP9a. guardar el conteo recorre los pedidos unas pocas veces, no una por producto (19/10: 17 pasadas; antes 75 con 14 productos)', r.pasadas<=25, r);
  chk('FP9b. guardar sin tocar no mueve el depósito de ningún producto', r.distintos===0, r);
  await page._ctx.close();

  // ═══ FP10. PA-11 — contraste ═══
  console.log('\n── FP10. Contraste en la revisión y en el historial (PA-11) ──');
  page = await abrir(browser, RELOJ, 'pc');
  r = await corre(page, async () => {
    var K=_P[0].k, K2=_P[1].k, hoy=todayStr(), out={};
    await _cargar([ _ped({ id:'g1', fecha:_d(2), productos:[_lin(_P[0].cod, _P[0].d, _P[0].m, 1)] }), _ped({ id:'g2', fecha:_d(3), productos:[_lin(_P[1].cod, _P[1].d, _P[1].m, 1, { chk:'ok' })] }) ],
      _stock(function(st){ st.c.u[K]=3; st.c.u[K2]=3;
        st.h=[ { id:_LOG+'|'+hoy+'|10:05:32', f:hoy, hora:'10:05:32', alm:_LOG, rol:'log', n:2, u:11, ts:_ts(hoy,'10:06:00'), hu:'b', incT:'am', d:[[K, 3, []]] },
               { id:_LOG+'|'+_d(-1)+'|10:00:00', f:_d(-1), hora:'10:00:00', alm:_LOG, rol:'log', n:2, u:5, ts:_ts(_d(-1),'10:01:00'), hu:'a', incT:'am' } ]; }));
    REVSTK_DIAS='todos'; abrirStockRevisar(); await new Promise(function(r){ setTimeout(r, 100); });
    var box=document.getElementById('modal-box');
    var gris=box.querySelector('.badge.b-gray'), fondoGris=gris ? getComputedStyle(gris).backgroundColor : '';
    out.gris=gris ? _contraste(getComputedStyle(gris).color, fondoGris) : null;
    var num=[].filter.call(box.querySelectorAll('div'), function(d){ return /Con stock para cargar/.test(d.textContent) && d.children.length===3; })[0];
    out.verde=num ? _contraste(getComputedStyle(num.children[1]).color, 'rgb(255,255,255)') : null;
    closeModal(); abrirStockHistorial(); await new Promise(function(r){ setTimeout(r, 100); });
    var mas=[].filter.call(document.querySelectorAll('#modal-box span, #modal-box b'), function(e){ return /^\+\d/.test(e.textContent.trim()); });
    out.hist=mas.map(function(e){ var bg='rgb(250,250,249)'; return Math.round(_contraste(getComputedStyle(e).color, bg)*100)/100; });
    return out;
  });
  chk('FP10a. «sin marcar» (gris) en la revisión: contraste ≥ 4,5:1 (antes 3,65:1)', r.gris!=null && r.gris>=4.5, r);
  chk('FP10b. el número de «Con stock para cargar»: ≥ 4,5:1 (antes 3,33:1)', r.verde!=null && r.verde>=4.5, r);
  chk('FP10c. los «+N» verdes del historial de cortes: ≥ 4,5:1 (antes 3,19:1)', r.hist && r.hist.length>=2 && r.hist.every(function(x){ return x>=4.5; }), r.hist);
  await page._ctx.close();

  // ═══ FP11. CR-1 — 📅 Reprogramar hacia antes mira el stock ═══
  console.log('\n── FP11. «📅 Reprogramar» hacia antes avisa si a otro pedido le deja de alcanzar (CR-1) ──');
  page = await abrir(browser, RELOJ, 'pc');
  const cr1 = async (op) => corre(page, async (op) => {
    var K=_P[0].k, K2=_P[1].k;
    await _cargar([
      _ped({ id:'A', oc:'10-701', fecha:_d(9), productos:[_lin(_P[0].cod, _P[0].d, _P[0].m, 2)] }),
      _ped({ id:'B', oc:'10-702', fecha:_d(3), productos:[_lin(_P[0].cod, _P[0].d, _P[0].m, 1)] }),
      _ped({ id:'C', oc:'10-703', fecha:_d(9), productos:[_lin(_P[1].cod, _P[1].d, _P[1].m, 1)] })
    ], _stock(function(st){ st.c.u[K]=2; st.c.u[K2]=0; }));
    var vB=saldoVeredicto(K, 1, 'B', _d(3)).tipo;
    _confirms.length=0;
    var nego=!!op.cancelar; window.confirm=function(m){ _confirms.push(String(m)); return !(nego && /Ojo con el stock/.test(m)); };
    var p=findById(op.id);
    if(op.cierre){ CIERRE_ENT_RP={ id:op.id, f:_d(op.dias), t:'AM' }; await cierreEntRpConfirmar(); }
    else { reprogramarPedido(op.id); reproSetFecha(_d(op.dias)); reproConfirmar(); }
    await new Promise(function(r){ setTimeout(r, 100); });
    var st=_confirms.filter(function(m){ return /Ojo con el stock/.test(m); });
    return { vB:vB, aviso:st.length ? st[0] : '', fecha:findById(op.id).fecha, nueva:_d(op.dias) };
  }, op);
  r = await cr1({ id:'A', dias:2 });
  chk('FP11a. (partida) B (1 u para el '+'jueves) tiene «✅ hay» con 2 en PTF y A (2 u) para dentro de 9 días', r.vB==='hay', r.vB);
  chk('FP11b. adelantar A antes que B: pregunta «📦 Ojo con el stock» y nombra a la OC 10-702, que deja de alcanzar', /OC 10-702/.test(r.aviso) && /deja de alcanzar/.test(r.aviso), r.aviso);
  chk('FP11c. Aceptar mueve igual (solo avisa)', r.fecha===r.nueva, r);
  r = await cr1({ id:'A', dias:2, cancelar:true });
  chk('FP11d. Cancelar en el aviso del stock no mueve nada', !!r.aviso && r.fecha!==r.nueva, r);
  r = await cr1({ id:'A', dias:12 });
  chk('FP11e. control: mover para MÁS ADELANTE no pregunta por el stock', !r.aviso && r.fecha===r.nueva, r);
  r = await cr1({ id:'C', dias:1 });
  chk('FP11f. el propio pedido que no llega a la fecha nueva: «no llega: programá desde…»', /no llega: programá/.test(r.aviso), r.aviso);
  r = await cr1({ id:'A', dias:2, cierre:true });
  chk('FP11g. lo mismo desde «📅 No salió · reprogramar» del cierre de entregas', /OC 10-702/.test(r.aviso), r.aviso);
  await page._ctx.close();

  // ═══ FP12. CR-2 — el mismo Excel con otra respuesta de los turnos ═══
  console.log('\n── FP12. El mismo Excel otra vez con otra respuesta de los turnos (CR-2) ──');
  const cr2 = async (pasos) => {
    const pg = await abrir(browser, RELOJ, 'pc');
    const res = await corre(pg, async (pasos) => {
      var hoy=todayStr(), K=_P[0].k, K2=_P[1].k, K3=_P[2].k;
      /* Ayer: PTF con 10 de K, 4 de K2 y 1 de K3. Hoy a la mañana salieron 2 de K y 1 de K3 (sin ✅). El Excel de hoy 10:05 tiene 8 + 2 de
         una llegada sin anotar = 10 de K, 4 de K2 y nada de K3. */
      await _cargar([ _ped({ id:'h1', fecha:hoy, turno:'AM', ts:_ts(_d(-1)), productos:[_lin(_P[0].cod, _P[0].d, _P[0].m, 2)] }),
                      _ped({ id:'h2', fecha:hoy, turno:'AM', ts:_ts(_d(-1)), productos:[_lin(_P[2].cod, _P[2].d, _P[2].m, 1)] }) ],
        _stock(function(st){ st.c.f=_d(-1); st.c.hora='10:00:00'; st.c.incT='ampm'; st.c.inc=true; st.c.u[K]=10; st.c.u[K2]=4; st.c.u[K3]=1;
          st.h=[ { id:_LOG+'|'+_d(-1)+'|10:00:00', f:_d(-1), hora:'10:00:00', alm:_LOG, rol:'log', n:3, u:15, ts:_ts(_d(-1),'10:01:00'), hu:'a', incT:'ampm', inc:true } ]; }));
      var subir=async function(hora, am){
        EXIST_COLA=[]; EXIST_IMP={ almacen:_LOG, fecha:hoy, hora:'10:05:00', solo0:true, items:[{ k:K, cant:10, cat:true }, { k:K2, cant:4, cat:true }], total:14, repetidos:0, malos:0, cods:{}, esLog:true, conocido:true, sacado:hoy };
        renderImportExist(); await new Promise(function(r){ setTimeout(r, 80); });
        var a=document.getElementById('exist-inc'), b=document.getElementById('exist-inc-pm');
        if(a){ a.checked=am; a.dispatchEvent(new Event('change', { bubbles:true })); } if(b){ b.checked=false; b.dispatchEvent(new Event('change', { bubbles:true })); }
        var vista=(document.getElementById('exist-control')||{}).innerText||'';
        await confirmarImportExist();
        return vista.replace(/\s+/g,' ');
      };
      var vistas=[];
      for(var i=0;i<pasos.length;i++) vistas.push(await subir(pasos[i][0], pasos[i][1]));
      var det={}; (STOCK.det||[]).forEach(function(x){ if(x && !x.an && Number(x.u)>0) det[x.k]=(det[x.k]||0)+(Number(x.u)||0); });
      var h=((STOCK.h||[]).filter(function(x){ return x && x.f===hoy; })[0]||{}).d||[], d={}; h.forEach(function(e){ d[e[0]]=e[1]; });
      return { det:det, d:d, vista:vistas[vistas.length-1], K:K, K3:K3 };
    }, pasos);
    await pg._ctx.close();
    return res;
  };
  const ref1 = await cr2([['10:08:00', false]]);       // una sola subida, sin la mañana
  const ref2 = await cr2([['10:08:00', true]]);        // una sola subida, con la mañana
  const A = await cr2([['10:08:00', false], ['10:20:00', true]]);
  const B = await cr2([['10:08:00', true], ['10:20:00', false]]);
  const igual=(x, y)=>JSON.stringify(x)===JSON.stringify(y);
  chk('FP12a. (partida) las referencias difieren: sin la mañana K3 −1 (y K cuadra), con la mañana K +2 (una entrada sin explicar, con detección) y K3 cuadra', !(ref1.K in ref1.d) && (ref1.d[ref1.K3]===-1) && (ref2.d[ref2.K]===2) && !(ref2.K3 in ref2.d) && ref2.det[ref2.K]===2 && !(ref1.K in ref1.det), { ref1:ref1.d, ref2:ref2.d, det1:ref1.det, det2:ref2.det });
  chk('FP12b. A (sin la mañana y después el MISMO archivo con la mañana): detecciones iguales a una sola subida con la mañana', igual(A.det, ref2.det), { A:A.det, ref2:ref2.det });
  chk('FP12c. A: las diferencias del historial (h[].d) iguales a esa subida', igual(A.d, ref2.d), { A:A.d, ref2:ref2.d });
  chk('FP12d. B (al revés): detecciones y h[].d iguales a una sola subida sin la mañana (incluye K3 −1, que ninguno de los dos Excel trae)', igual(B.det, ref1.det) && igual(B.d, ref1.d), { B:[B.det, B.d], ref1:[ref1.det, ref1.d] });
  chk('FP12e. la vista previa de la segunda subida dice que es el mismo archivo con OTRA respuesta de los turnos', /otra respuesta de los turnos/.test(A.vista), A.vista.slice(0,400));

  chk('sin errores de página', ERRS.length===0, ERRS.slice(0,5));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');   // con «·»: `tests/correr.sh` cuenta esta línea (con coma salía «ok (sin resumen)»)
  process.exit(FAIL?1:0);
})();
