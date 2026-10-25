/* ⏳🫥 ESQUELETOS MIENTRAS CARGA (V6) Y ESTADOS VACÍOS CON DIBUJO (V7) (§4mg, 25/10; dueño: «aprobado»).

   LO QUE CUIDA:
   1. Sin copia guardada y con la planilla en camino: Mis pedidos y Contabilidad muestran el esqueleto (no números en 0) y no el
      «No hay pedidos». Con la planilla leída, desaparece.
   2. Un filtro vacío de Mis pedidos: el dibujo, LA MISMA frase de antes y los botones (cargar, ver todos, borrar la búsqueda).
   3. Con la vista de antes (Playwright sin marca): solo el texto, como siempre.

   Reloj CLAVADO (martes 27/10/2026, 10:00 de Bolivia). Solo datos sintéticos.
   Se corre:  node tests/test_vacio_cargando.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1440, height:1000 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await ctx.route(/^https:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-27T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };

  /* 1: cargando */
  const r1 = await ev(async () => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    try{ localStorage.removeItem(LS_PEND); }catch(e){}
    window.MIS_TOP_PRUEBA=1; window.CX_TOP_PRUEBA=1;
    CARGA_GEN++; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    STATE=[]; CONNECTED=true; CARGA_ESTADO='cargando';
    var soltar; window._llega=new Promise(function(r){ soltar=r; }); window._soltar=soltar;
    apiList=function(){ return window._llega; };
    apiSave=function(r){ return Promise.resolve({ ok:true, pedido:r }); };
    showView('mis'); var mv=document.getElementById('mis-vendedor'); mv.value='Carola Chavez'; renderMis();
    var mis={ esq:document.querySelectorAll('#mis-top .sk').length, txt:document.getElementById('mis-top').innerText, vacio:getComputedStyle(document.getElementById('mis-empty')).display };
    showView('conta'); await new Promise(function(r){ setTimeout(r, 120); });
    var co={ esq:document.querySelectorAll('#cx-top .sk').length, vacio:getComputedStyle(document.getElementById('cta-empty')).display };
    return { mis:mis, co:co };
  });
  chk('1a. Mis pedidos cargando: esqueleto, sin «no hay»', r1.mis && r1.mis.esq>8 && /trayendo la planilla/.test(r1.mis.txt) && r1.mis.vacio==='none', r1);
  chk('1b. Contabilidad cargando: esqueleto, sin «No hay pedidos»', r1.co && r1.co.esq>8 && r1.co.vacio==='none', r1.co);

  const r1c = await ev(async () => {
    var hoy=todayStr();
    var L=[{ id:'a1', oc:'10-1', vendedor:'Carola Chavez', cliente:'UNO', celular:'70000001', fecha:stockSumarDias(hoy,1), turno:'AM', zona:'Norte', maps:'https://maps.google.com/?q=-17.78,-63.18', nota:'1',
      productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:3000 }], saldo:0, acuenta:0, pagado:true, metodoPago:'Efectivo 3000 @'+hoy+' #1', ts:Date.now()-3600000 }];
    window._soltar({ ok:true, pedidos:L }); await new Promise(function(r){ setTimeout(r, 200); });
    CARGA_ESTADO='ok'; renderConta();
    var co=document.querySelectorAll('#cx-top .sk').length;
    showView('mis'); renderMis(); await new Promise(function(r){ setTimeout(r, 150); });
    return { co:co, mis:document.querySelectorAll('#mis-top .sk').length, para:/Tu día, Carola/.test(document.getElementById('mis-top').innerText) };
  });
  chk('1c. con la planilla leída, el esqueleto se va', r1c.co===0 && r1c.mis===0 && r1c.para, r1c);

  /* 2: vacío con dibujo */
  const r2 = await ev(async () => {
    setMisFiltro('atras'); var e=document.getElementById('mis-empty');
    var a={ svg:!!e.querySelector('svg'), b:(e.querySelector('b')||{}).textContent, bot:[].map.call(e.querySelectorAll('button'), function(x){ return x.textContent; }), disp:getComputedStyle(e).display };
    setMisFiltro('hoy');
    var h={ b:(e.querySelector('b')||{}).textContent, small:(e.querySelector('small')||{}).textContent||'', bot:[].map.call(e.querySelectorAll('button'), function(x){ return x.textContent; }) };
    var q=document.getElementById('mis-q'); if(q) q.value='zzzz'; misBuscar('zzzz');
    var z={ b:(e.querySelector('b')||{}).textContent, bot:[].map.call(e.querySelectorAll('button'), function(x){ return x.textContent; }) };
    [].filter.call(e.querySelectorAll('button'), function(x){ return /Borrar la búsqueda/.test(x.textContent); })[0].click();
    return { a:a, h:h, z:z, despues:{ q:MIS_Q, lista:getComputedStyle(document.getElementById('mis-lista')).display } };
  });
  chk('2a. atrasados vacío: dibujo, la frase de siempre y «Ver todos»', r2.a.svg && r2.a.b==='✅ Ningún pedido tuyo pasó su turno sin entregar.' && r2.a.bot.some(t=>/Ver todos/.test(t)) && r2.a.disp==='flex', r2.a);
  chk('2b. hoy vacío: cupos de hoy y «Cargar un pedido» / «Ver el próximo día»', /^No tenés pedidos para entregar hoy/.test(r2.h.b) && /lugares a la mañana/.test(r2.h.small) && r2.h.bot.some(t=>/Cargar un pedido/.test(t)) && r2.h.bot.some(t=>/próximo día/.test(t)), r2.h);
  chk('2c. búsqueda sin resultado: «Borrar la búsqueda» la borra', /Ningún pedido tuyo tiene «zzzz»/.test(r2.z.b) && r2.despues.q==='' && r2.despues.lista!=='none', r2);

  /* 3: vista de antes */
  const r3 = await ev(() => { window.MIS_TOP_PRUEBA=0; setMisFiltro('atras'); var e=document.getElementById('mis-empty'); return { svg:!!e.querySelector('svg'), t:e.textContent, cls:e.className }; });
  chk('3. con la vista de antes, solo el texto', !r3.svg && r3.t==='✅ Ningún pedido tuyo pasó su turno sin entregar.' && r3.cls==='empty', r3);

  chk('sin errores en la página', !errores.length, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
