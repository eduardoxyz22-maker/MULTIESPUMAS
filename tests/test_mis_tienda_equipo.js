/* 🏪👑 MIS PEDIDOS: las ventas de tienda en «Tu día» y «Ver todos» con el diseño nuevo (§4nn, 27/10; dueño: *«ok y publica el diseño que
   me propusiste»*, con la muestra de las dos cosas).

   LO QUE CUIDA:
   1. «Tu día» tiene un renglón 🏪 con lo vendido EN LA TIENDA este mes (por el día de la venta): Bs, ventas, artículos y lo que falta cobrar.
      «Vendido para <mes>» de arriba no cambia (solo lo que se entrega). «Ver» deja la lista en «🏪 Ventas de tienda».
   2. Sin ventas de tienda en el mes no hay renglón ni chip; Eduardo y ROHO no lo ven.
   3. «👑 Ver todos»: «Para hacer · el equipo» con el nombre de quién, «El día del equipo» y una fila por vendedora; la suma de las filas da
      lo de arriba; sin Eduardo, ROHO ni internos. Tocar una fila abre los pedidos de esa vendedora.
   4. El efectivo del equipo = lo de «Tu día» de cada vendedora + lo de los choferes.

   Reloj CLAVADO (martes 27/10/2026, 10:00 de Bolivia). Solo datos sintéticos: el repo es público.
   Se corre:  node tests/test_mis_tienda_equipo.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true; window.MIS_TOP_PRUEBA=1;
  try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  var mes='2026-10', ant='2026-09', ts=function(f){ return new Date(f+'T11:00:00-04:00').getTime(); };
  var n=0, P=function(v, o){ n++; return Object.assign({ id:'q'+n, oc:'10-'+(100+n), nota:String(7000+n), cliente:'CLIENTE '+n, celular:'7100000'+n, fecha:mes+'-20', turno:'AM', zona:'Norte', maps:'https://maps.google.com/?q=-17.78,-63.18',
    vendedor:v, productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:3000 }], saldo:0, acuenta:0, pagado:true, entregado:true,
    metodoPago:'QR BISA 3000 @'+mes+'-05 #1'+n, ts:ts(mes+'-05') }, o); };
  var T=function(v, f, bs, o){ return P(v, Object.assign({ fecha:'', direccion:DIR_TIENDA, zona:ZONA_TIENDA, entregado:true, acuenta:0, metodoPago:'Efectivo '+bs+' @'+f+' #9'+n, ts:ts(f), maps:'',
    productos:[{ desc:'COLCHON SUEÑA LITE', medida:'105x190', codigo:'CH2531', cant:2, precio:bs/2 }] }, o)); };
  window._L=[
    P('Carola Chavez', {}),                                                                               // 3.000 para octubre
    P('Carola Chavez', { fecha:mes+'-28', entregado:false, acuenta:0, saldo:2000, pagado:false, metodoPago:'Efectivo 1000 @'+mes+'-06 #55' }),   // 3.000, debe 2.000, efectivo 1.000
    P('Carola Chavez', { fecha:ant+'-15', ts:ts(ant+'-10') }),                                              // septiembre
    T('Carola Chavez', mes+'-10', 1400),                                                                  // tienda de octubre
    T('Carola Chavez', mes+'-12', 600, { pagado:false, acuenta:0, saldo:200, metodoPago:'Efectivo 400 @'+mes+'-12 #77' }),   // tienda, debe 200
    T('Carola Chavez', ant+'-25', 999),                                                                   // tienda de septiembre: no cuenta
    P('Mirian Salazar', { fecha:mes+'-29', maps:'', entregado:false }),                                                    // sin ubicación
    P('Mirian Salazar', { fecha:mes+'-27', turno:'AM', entregado:false, metodoPago:'Efectivo 3000 @'+mes+'-07 #2 >Chofer Dos' }),  // efectivo del chofer
    P('Eduardo Añez', { cliente:'MULTICENTER', fecha:mes+'-15', acuenta:0, metodoPago:'QR BISA 50000 @'+mes+'-05 #3' }),       // fuera del equipo
    T('Eduardo Añez', mes+'-11', 800),
    P('ROHO', { fecha:mes+'-16', acuenta:0, pagado:false, metodoPago:'' })
  ];
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window._L)) }); };
  apiSave=function(r){ return Promise.resolve({ ok:true, pedido:r }); };
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  window._ver=async function(v, todos){ await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok'; showView('mis'); MIS_TODOS=!!todos; MIS_FILTER='todos';
    var mv=document.getElementById('mis-vendedor'); mv.value=v; renderMis(); await _esperar(250); };
  window._txt=function(id){ var e=document.getElementById(id); return e && !e.hidden && e.offsetParent!==null ? e.innerText.replace(/\s+/g,' ').trim() : ''; };
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
  const r1 = await ev(async () => { await _ver('Carola Chavez', false);
    var tie=document.querySelector('#mis-top .td-tie'), big=document.querySelector('#mis-top .td-big');
    return { tie:tie?tie.innerText.replace(/\s+/g,' '):'', big:big?big.textContent:'', chips:document.getElementById('mis-chips').innerText.replace(/\s+/g,' ') }; });
  chk('1a. «Tu día» tiene el renglón de tienda de octubre: Bs 2.000, 2 ventas, 4 artículos, falta cobrar Bs 200', /Ventas de tienda de octubre/i.test(r1.tie) && /2 ventas · 4 artículos · falta cobrar Bs 200/.test(r1.tie) && /Bs 2\.000/.test(r1.tie), r1);
  chk('1b. «Vendido para octubre» sigue siendo solo lo que se entrega (Bs 6.000)', r1.big==='Bs 6.000', r1.big);
  chk('1c. el chip «🏪 Ventas de tienda» cuenta sus 3 ventas de tienda', /🏪 Ventas de tienda 3/.test(r1.chips), r1.chips);
  const r1d = await ev(async () => { document.querySelector('#mis-top .td-tie').click(); await _esperar(250);
    return { f:MIS_FILTER, cards:document.querySelectorAll('#mis-lista .mis-card, #mis-lista > *').length, txt:document.getElementById('mis-lista').innerText.replace(/\s+/g,' ').slice(0,300) }; });
  chk('1d. tocarlo deja la lista en «🏪 Ventas de tienda»', r1d.f==='tienda' && r1d.cards>=3, r1d);

  /* 2 */
  const r2 = await ev(async () => { var o={};
    await _ver('Mirian Salazar', false); o.mir={ tie:!!document.querySelector('#mis-top .td-tie'), chip:/Ventas de tienda/.test(document.getElementById('mis-chips').innerText) };
    await _ver('Eduardo Añez', false); o.edu={ tie:!!document.querySelector('#mis-top .td-tie') };
    return o; });
  chk('2a. sin ventas de tienda en el mes: ni renglón ni chip', !r2.mir.tie && !r2.mir.chip, r2.mir);
  chk('2b. Eduardo no lo ve aunque venda en tienda', !r2.edu.tie, r2.edu);

  /* 3 */
  const r3 = await ev(async () => { await _ver('', true);
    var top=document.getElementById('mis-top'), filas=[].map.call(top.querySelectorAll('.mis-eq-vend tbody tr'), function(tr){ return [].map.call(tr.cells, function(c){ return c.innerText.replace(/\s+/g,' ').trim(); }); });
    return { hidden:top.hidden, txt:_txt('mis-top'), filas:filas, big:(top.querySelector('.td-big')||{}).textContent, izq:getComputedStyle(document.getElementById('mis-izq')).display }; });
  chk('3a. «Ver todos»: «Para hacer · el equipo» y «El día del equipo», sin la dona', !r3.hidden && /Para hacer · el equipo/.test(r3.txt) && /El día del equipo/.test(r3.txt) && r3.izq==='none', r3.txt.slice(0,200));
  chk('3b. una fila por vendedora del equipo, sin Eduardo ni ROHO', r3.filas.length===2 && r3.filas[0][0]==='Carola Chavez' && r3.filas[1][0]==='Mirian Salazar' && !r3.filas.some(function(f){ return /Eduardo|ROHO/.test(f[0]); }), r3.filas);
  chk('3c. la suma de las filas da lo de arriba: Bs 12.000 para octubre (sin los 50.000 de Eduardo)', r3.big==='Bs 12.000', r3.big);
  chk('3d. la fila de Carola: Bs 6.000, 1 de 2 entregados, debe Bs 2.000, tienda Bs 2.000', /Bs 6\.000/.test(r3.filas[0][1]) && r3.filas[0][2]==='1 de 2' && r3.filas[0][3]==='Bs 2.000' && r3.filas[0][4]==='Bs 2.000', r3.filas[0]);
  chk('3e. «Para hacer · el equipo» dice de quién: el pedido sin ubicación es de Mirian', /Pedidos sin ubicación Mirian Salazar 1/.test(r3.txt), r3.txt.slice(0,600));
  chk('3f. la tienda del equipo = la de Carola (la de Eduardo no entra): 2 ventas, Bs 2.000', /Ventas de tienda de octubre 2 ventas · 4 artículos · falta cobrar Bs 200 Bs 2\.000/i.test(r3.txt), r3.txt);

  /* 4 */
  const r4 = await ev(() => { var E=MIS_EQ_EF; var cash=document.querySelector('#mis-top .td-cash'); return { tot:E&&E.tot, nV:E&&E.nV, nC:E&&E.nC, txt:cash?cash.innerText.replace(/\s+/g,' '):'', ef:misEfectivoDatos('Carola Chavez').tot }; });
  chk('4a. efectivo sin rendir = Carola (lo mismo que su «Tu día») + el chofer', r4.tot===r4.ef+3000 && r4.nV===1 && r4.nC===1, r4);
  chk('4b. lo dice: «en manos de 1 vendedora y 1 chofer»', /en manos de 1 vendedora y 1 chofer/.test(r4.txt), r4.txt);

  /* 3g: tocar la fila abre los pedidos de esa vendedora */
  const r5 = await ev(async () => { var tr=document.querySelector('#mis-top .mis-eq-vend tbody tr[data-v="Mirian Salazar"]'); tr.click(); await _esperar(300);
    return { todos:MIS_TODOS, v:document.getElementById('mis-vendedor').value, tu:/Tu día, Mirian/.test(_txt('mis-top')) }; });
  chk('3g. tocar la fila de Mirian abre sus pedidos con su «Tu día»', r5.todos===false && r5.v==='Mirian Salazar' && r5.tu, r5);

  chk('sin errores de la página', !errores.length, errores.slice(0,3));
  console.log('\n' + PASS + ' bien / ' + FAIL + ' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
