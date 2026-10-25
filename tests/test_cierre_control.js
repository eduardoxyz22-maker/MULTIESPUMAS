/* ✅ EL CIERRE DEL MES CON LISTA DE CONTROL (§4mg, C3, 25/10; dueño: «c1, 2, 3 aprobado»).

   LO QUE CUIDA:
   1. «🗂️ Cierre del mes» muestra la lista: rojo (pagos sin terminar, dos veces, sin monto), ámbar (cobradas de más, efectivo sin rendir,
      con saldo, por cargar) y lo listo, con los números de las reglas de siempre, del MES elegido.
   2. Con algo en rojo, «Bajar el cierre» queda apagado; «Cerrar igual» pide la contraseña de Administración (una mala no abre).
   3. Sin nada en rojo, el botón anda como siempre.

   Reloj CLAVADO (martes 27/10/2026, 10:00 de Bolivia). Solo datos sintéticos.
   Se corre:  node tests/test_cierre_control.js */
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

  await ev(async () => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=false; try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    try{ localStorage.setItem(LS_ADMIN, sha256('clave-de-prueba')); }catch(e){}
    var mes=todayStr().slice(0,7), ts=new Date(mes+'-05T11:00:00-04:00').getTime(), n=0;
    var P=function(o){ n++; return Object.assign({ id:'c'+n, oc:'10-'+(100+n), nota:String(5000+n), cliente:'CLIENTE '+n, celular:'7000000'+n, fecha:mes+'-26', turno:'AM', zona:'Norte', vendedor:'Carola Chavez',
      productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:3000 }], saldo:0, acuenta:0, pagado:true, metodoPago:'Efectivo 3000 @'+mes+'-05 #1'+n+' · REGISTRADO', ts:ts }, o); };
    window._MALO=[
      P({}),
      P({ pagado:false, saldo:1000, acuenta:2000, metodoPago:'' }),                    // con saldo (el anticipo no tiene método → pago sin terminar)
      P({ pagado:false, saldo:0, acuenta:0, metodoPago:'', cliente:'SIN MONTO' })      // sin monto anotado
    ];
    window._BUENO=[ P({ id:'b1' }), P({ id:'b2' }) ];
    STATE=JSON.parse(JSON.stringify(window._MALO));
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
    apiSave=function(r){ return Promise.resolve({ ok:true, pedido:r }); };
    showView('conta'); await new Promise(function(r){ setTimeout(r, 200); });
  });

  /* 1 y 2 */
  const r1 = await ev(async () => {
    nxCierreAbrir(); await new Promise(function(r){ setTimeout(r, 100); });
    var chk=document.getElementById('nx-cierre-chk'), btn=document.getElementById('nx-cierre-btn');
    var rojo=[].map.call(chk.querySelectorAll('.c3-mal b'), function(b){ return b.textContent; }), am=[].map.call(chk.querySelectorAll('.c3-am b'), function(b){ return b.textContent; }), ok=[].map.call(chk.querySelectorAll('.c3-ok b'), function(b){ return b.textContent; });
    var a={ rojo:rojo, am:am, ok:ok, dis:btn.disabled, txt:btn.textContent, forzar:!!document.querySelector('#nx-cierre-forzar button') };
    nxCierreForzar(); nxCierreForzar('mala'); a.trasMala=btn.disabled;
    nxCierreForzar('clave-de-prueba'); a.trasBuena=btn.disabled; a.txt2=btn.textContent;
    closeModal(); return a;
  });
  chk('1a. en rojo: pago sin terminar y sin monto', r1.rojo.some(t=>/1 pago sin terminar/.test(t)) && r1.rojo.some(t=>/1 venta sin monto anotado/.test(t)), r1.rojo);
  chk('1b. en ámbar: con saldo (Bs 1.000) y por cargar', r1.am.some(t=>/1 venta con saldo: Bs 1\.000/.test(t)) && r1.am.some(t=>/por cargar al sistema/.test(t)), r1.am);
  chk('1c. lo que está bien, en «Listo»', r1.ok.some(t=>/Ninguna venta cargada dos veces/.test(t)) && r1.ok.some(t=>/Ninguna cobrada de más/.test(t)), r1.ok);
  chk('2a. con rojo, «Bajar el cierre» apagado y dice cuántos faltan', r1.dis && /faltan 2 en rojo/.test(r1.txt) && r1.forzar, { dis:r1.dis, txt:r1.txt });
  chk('2b. una contraseña mala no lo abre; la buena sí', r1.trasMala===true && r1.trasBuena===false && /^⬇️ Bajar el cierre$/.test(r1.txt2), r1);

  /* 3 */
  const r3 = await ev(async () => {
    STATE=JSON.parse(JSON.stringify(window._BUENO)); renderConta();
    nxCierreAbrir(); await new Promise(function(r){ setTimeout(r, 100); });
    var btn=document.getElementById('nx-cierre-btn'), chk=document.getElementById('nx-cierre-chk');
    var r={ dis:btn.disabled, rojo:chk.querySelectorAll('.c3-mal').length, forzar:!!document.querySelector('#nx-cierre-forzar button') }; closeModal(); return r;
  });
  chk('3. sin rojo, el botón anda como siempre', r3.dis===false && r3.rojo===0 && !r3.forzar, r3);

  chk('sin errores en la página', !errores.length, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
