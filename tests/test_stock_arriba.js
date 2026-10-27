/* ✨ STOCK ARRIBA: cuatro fichas grandes en la barra y lo demás en «Más» (§4mg, V3, 25/10; dueño: «aprobado»).

   LO QUE CUIDA:
   1. Con la vista nueva: las 4 fichas (Excel del día, Revisión automática, Pedido a producción, Banzer o PTF) + 6 botones en «Más», y
      la fila de botones de siempre (`.stk-acc`) se esconde. Sin la marca de prueba (Playwright), como antes.
   2. El Excel del día: con el de hoy, «el de hoy · HH:MM ✓»; con uno viejo, en rojo «falta el de hoy · el último es del …».
   3. La revisión cuenta lo mismo que la cinta (`stockCintaGrupos`).
   4. Cada ficha y cada botón abre lo de siempre.
   5. El buscador de la barra sigue a la vista.

   Reloj CLAVADO (martes 27/10/2026, 10:00 de Bolivia). Solo datos sintéticos.
   Se corre:  node tests/test_stock_arriba.js */
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

  await ev(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    apiSave=function(rec){ return Promise.resolve({ok:true, pedido:rec}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
    var manana=proximoDiaEntrega();
    var P=function(o){ return Object.assign({ id:'p'+Math.random(), fecha:manana, oc:'', vendedor:'Carola Chavez', cliente:'C', celular:'70000000', turno:'AM', zona:'Norte', direccion:'x', maps:'',
      pagado:true, saldo:0, ts:Date.now()-3600000, metodoPago:'', observaciones:'', estado:'', entregado:false, vehiculo:'', chofer:'', nota:'', acuenta:0, nroDia:1, verificado:true, fotos:[] }, o); };
    STATE=[ P({ id:'t1', productos:[{ desc:'TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:6 }] }), P({ id:'s1', productos:[{ desc:'COLCHON SMART', medida:'140x190', codigo:'CH2522', cant:1 }] }) ];
    STOCK={ c:{ f:todayStr(), hora:'09:10', u:{} }, e:[], p:[], a:{} };
    STOCK.c.u[stockClave({ codigo:'CH1201' })]=1;
    STOCK.c.u[stockClave({ codigo:'CH2522' })]=9;
    STOCK_FILTRO={ q:'', aviso:'', marca:'', medida:'', orden:'', dir:1 };
    window._vis=function(el){ return !!(el && getComputedStyle(el).display!=='none' && el.offsetParent!==null); };
  });

  /* 1 sin la marca */
  const r0 = await ev(() => { window.STK_TOP_PRUEBA=0; abrirStock(); return { top:_vis(document.getElementById('stk-top')), acc:_vis(document.querySelector('.stk-acc button')) }; });
  chk('1a. sin la marca de prueba, la barra de siempre', !r0.top && r0.acc, r0);

  const r1 = await ev(() => { closeStock(); window.STK_TOP_PRUEBA=1; abrirStock();
    var el=document.getElementById('stk-top');
    return { top:_vis(el), acc:_vis(document.querySelector('.stk-acc button')), grandes:[].map.call(el.querySelectorAll('.s3-t b'), function(b){ return b.textContent; }),
      mas:[].map.call(el.querySelectorAll('.s3-ch'), function(b){ return b.textContent; }), q:_vis(document.getElementById('stk-q')), ex:el.querySelector('.s3-ex').textContent, mal:el.querySelector('.s3-ex').classList.contains('s3-mal'),
      rv:el.querySelector('.s3-rv small').textContent, cinta:(function(){ var g=stockCintaGrupos(stockData()); return { ya:g.ya.length, sem:g.sem.length, rev:g.rev.length }; })() }; });
  chk('1b. las 4 fichas grandes', JSON.stringify(r1.grandes)===JSON.stringify(['Subir los Excel del día','Revisión automática','Pedido a producción','Banzer o PTF']), r1.grandes);
  /* (27/10, §4na) + «🏬 Stock de las tiendas»: 7. */
  chk('1c. los 7 de «Más» (con «🏬 Stock de las tiendas») y la fila de siempre escondida', r1.mas.length===7 && r1.mas.indexOf('🏬 Stock de las tiendas')>=0 && !r1.acc && r1.top, { mas:r1.mas, acc:r1.acc });
  chk('5. el buscador sigue a la vista', r1.q, r1.q);
  chk('2a. con el Excel de hoy: «el de hoy · 09:10 ✓», sin rojo', /el de hoy · 09:10 ✓/.test(r1.ex) && !r1.mal, r1.ex);
  const esperado = [r1.cinta.ya?(r1.cinta.ya+' pedir ya'):'', r1.cinta.sem?(r1.cinta.sem+' esta semana'):'', r1.cinta.rev?(r1.cinta.rev+' revisar'):''].filter(Boolean).join(' · ')||'nada urgente';
  chk('3. la revisión dice lo mismo que la cinta', r1.rv===esperado, { rv:r1.rv, esperado });

  const r2 = await ev(() => { STOCK.c.f=stockSumarDias(todayStr(), -4); renderStock(); var el=document.getElementById('stk-top'); return { ex:el.querySelector('.s3-ex').textContent, mal:el.querySelector('.s3-ex').classList.contains('s3-mal') }; });
  chk('2b. con un Excel viejo: en rojo, «falta el de hoy · el último es del 23/10»', r2.mal && /falta el de hoy · el último es del 23\/10/.test(r2.ex), r2);

  /* 4 */
  const r4 = await ev(() => {
    var F=['abrirImportExist','abrirStockRevisar','abrirPap','abrirAlm','abrirStockConteo','abrirStockRecogida','abrirStockEntrada','abrirStockSalida','abrirStockHistorial','copiarStock'], llam=[], orig={};
    F.forEach(function(f){ orig[f]=window[f]; window[f]=function(){ llam.push(f); }; });
    document.querySelectorAll('#stk-top .s3-t, #stk-top .s3-ch').forEach(function(b){ b.click(); });
    F.forEach(function(f){ window[f]=orig[f]; });
    return { llam:llam, F:F };
  });
  chk('4. cada ficha y cada botón abre lo de siempre', JSON.stringify(r4.llam)===JSON.stringify(r4.F), r4.llam);

  chk('sin errores en la página', !errores.length, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
