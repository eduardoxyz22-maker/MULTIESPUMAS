/* 👯 «Revisar» de las ventas que pueden estar cargadas dos veces (27/10; dueño: *«el boton revisa no sirve.. doy clic no abre nada»*).

   LO QUE CUIDA:
   1. Con lo de arriba nuevo de Contabilidad (`.cx-nuevo`), «Revisar» en «📋 Para hacer» muestra la lista de los pares (antes abría
      `#cx-dup`, que esa vista esconde: no pasaba nada).
   2. «Ocultar ▴» la vuelve a esconder.
   3. Desde la lista de control del cierre (una ventana) cierra la ventana; desde el Cuadre vuelve a Ventas.
   4. Sin la vista nueva, como antes.

   Reloj CLAVADO (martes 27/10/2026, 10:00 de Bolivia). Solo datos sintéticos: el repo es público.
   Se corre:  node tests/test_dup_revisar.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true;
  try{ localStorage.removeItem(LS_PEND); localStorage.removeItem('me_cx_dup_ok'); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  var hoy=todayStr(), mes=hoy.slice(0,7), ts=new Date(mes+'-05T11:00:00-04:00').getTime();
  var n=0, P=function(o){ n++; return Object.assign({ id:'d'+n, oc:'10-'+(100+n), nota:String(5000+n), cliente:'CLIENTE '+n, celular:'7000000'+n, fecha:mes+'-26', turno:'AM', zona:'Norte',
    vendedor:'Carola Chavez', productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:3000 }], saldo:0, acuenta:0, pagado:true,
    metodoPago:'Efectivo 3000 @'+mes+'-05 #1'+n, ts:ts }, o); };
  window._L=[ P({ nota:'7777', cliente:'ANA PRUEBA' }), P({ nota:'7777', cliente:'ANA PRUEBA' }), P({}) ];
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window._L)) }); };
  apiSave=function(r){ return Promise.resolve({ ok:true, pedido:r }); };
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  window._ver=async function(){ await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok'; showView('conta');
    try{ segSet('cta-tab','ventas'); setContaTab('ventas'); }catch(e){}
    CX_DUP_ABIERTO=false; CX_FILTRO=null; renderConta(); await _esperar(200); };
  window._vis=function(id){ var e=document.getElementById(id); return !!(e && getComputedStyle(e).display!=='none' && e.offsetParent!==null); };
  window._dup=function(){ var e=document.getElementById('cx-dup'); return { vis:_vis('cx-dup'), pares:e?e.querySelectorAll('.cx-par').length:0, txt:e?e.innerText.replace(/\s+/g,' ').trim().slice(0,400):'' }; };
}

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
  await page.evaluate(PREPARAR);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };

  /* 1 */
  const r1 = await ev(async () => { window.CX_TOP_PRUEBA=1; await _ver();
    var antes=_dup(), it=[].filter.call(document.querySelectorAll('#cx-top .ah-it'), function(x){ return /cargadas dos veces/.test(x.innerText); })[0];
    var b=it && it.querySelector('button'); if(b) b.click(); await _esperar(250);
    return { antes:antes, boton:!!b, despues:_dup() }; });
  chk('1a. con la vista nueva, la lista de los pares arranca escondida', r1.antes && !r1.antes.vis, r1.antes);
  chk('1b. «Para hacer» tiene «Pueden estar cargadas dos veces» con su botón', r1.boton, r1);
  chk('1c. tocar «Revisar» muestra los pares (antes no pasaba nada)', r1.despues && r1.despues.vis && r1.despues.pares>=1 && /ANA PRUEBA/.test(r1.despues.txt), r1.despues);

  /* 2 */
  const r2 = await ev(async () => { var b=document.querySelector('#cx-dup .cx-dup-ver'); if(b) b.click(); await _esperar(150); return _dup(); });
  chk('2. «Ocultar ▴» la vuelve a esconder', !r2.vis, r2);

  /* 3 */
  const r3 = await ev(async () => { await _ver(); openModal('<div class="modal-b">lista de control</div>'); await _esperar(50);
    cxDupAbrir(); await _esperar(250);
    var a={ modal:document.getElementById('modal').classList.contains('on'), dup:_dup() };
    CX_DUP_ABIERTO=false; segSet('cta-tab','cuadre'); setContaTab('cuadre'); await _esperar(100);
    cxDupAbrir(); await _esperar(250);
    a.ventas=document.getElementById('cta-pane-ventas').style.display!=='none'; a.dup2=_dup(); return a; });
  chk('3a. desde una ventana (la lista de control del cierre): la cierra y muestra los pares', r3.modal===false && r3.dup && r3.dup.vis, r3);
  chk('3b. desde el Cuadre: vuelve a Ventas y muestra los pares', r3.ventas && r3.dup2 && r3.dup2.vis, r3);

  /* 4 */
  const r4 = await ev(async () => { window.CX_TOP_PRUEBA=0; await _ver(); var a=_dup(); cxDupAbrir(); await _esperar(250); return { antes:a, despues:_dup() }; });
  chk('4. sin la vista nueva, como antes: el aviso se ve y «Revisar» despliega los pares', r4.antes.vis && r4.antes.pares===0 && r4.despues.vis && r4.despues.pares>=1, r4);

  chk('sin errores de la página', !errores.length, errores.slice(0,3));
  console.log('\n' + PASS + ' bien / ' + FAIL + ' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
