/* ✨ MIS PEDIDOS ARRIBA: «📋 Para hacer» + «☀️ Tu día» + la bandeja de Kommo en filas (§4mf, 25/10; dueño: «aprobado»).

   LO QUE CUIDA:
   1. Con un vendedor elegido salen las dos tarjetas; sin nombre sigue como antes; «👑 Ver todos» sale con el diseño del equipo (§4nn).
   2. «Para hacer» ordena rojo → ámbar → info, con los números de las cuentas de siempre (sin stock, atrasados, sin ubicación,
      Kommo, saldo del mes) y lo que no tiene pendiente va a «✅ Al día».
   3. «Tu día»: lo vendido del mes y el mes anterior entero (`misAnilloDatos`), hoy / próximo día, falta cobrar.
   4. 💵 Efectivo en tu mano = lo recibido en efectivo en el MES − lo retirado en el mes (25/10, FIN-01: el dueño eligió «igual que el Cuadre
      del mes»; antes, lo cobrado después del último retiro); lo que cobró un chofer no.
   5. Kommo: filas cortas en dos grupos («parecen ya cargadas» con «Sí, es la misma» / «nuevas» con «Completar»), y los botones llaman
      a las funciones de siempre.
   6. El buscador sube a la barra del nombre (también con «Ver todos», desde §4nn).

   Reloj CLAVADO (martes 27/10/2026, 10:00 de Bolivia). Solo datos sintéticos: el repo es público.
   Se corre:  node tests/test_mis_arriba.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true;
  try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  window.MIS_TOP_PRUEBA=1;
  var hoy=todayStr(), d=function(n){ return stockSumarDias(hoy, n); }, mes=hoy.slice(0,7);
  var mesAnt=(function(){ var t=new Date(hoy+'T12:00:00'); t.setDate(1); t.setMonth(t.getMonth()-1); return t.toISOString().slice(0,7); })();
  var P=function(id, o){ return Object.assign({ id:id, oc:'10-'+id, vendedor:'Isabel Robledo', cliente:'CLIENTE '+id, celular:'7'+String(id.charCodeAt(1))+'00'+id.length+'1', zona:'Norte', maps:'https://maps.google.com/?q=-17.78,-63.18', nota:'9'+id.length, turno:'AM',
    productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:3000 }], saldo:0, acuenta:0, pagado:true, metodoPago:'', ts:Date.now()-86400000 }, o); };
  window._L=[
    P('a1', { fecha:d(2), productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, chk:'no', precio:3000 }] }),     // sin stock
    P('a2', { fecha:d(-1), entregado:false }),                                                                                          // atrasado
    P('a3', { fecha:d(3), maps:'' }),                                                                                                   // sin ubicación
    P('a4', { fecha:d(1), pagado:false, saldo:500, acuenta:2500 }),                                                                     // saldo este mes (fecha en octubre)
    P('a5', { fecha:mes+'-02', entregado:true, metodoPago:'Efectivo 1000 @'+mes+'-02 #11' }),                                            // efectivo ANTES del retiro
    P('a6', { fecha:mes+'-20', entregado:true, metodoPago:'Efectivo 700 @'+mes+'-20 #12' }),                                             // efectivo DESPUÉS del retiro
    P('a7', { fecha:mes+'-21', entregado:true, metodoPago:'Efectivo 300 @'+mes+'-21 #13 >Chofer Uno' }),                                 // lo cobró un chofer
    P('a8', { fecha:mesAnt+'-10', entregado:true, acuenta:10000, productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:2, precio:5000 }] }),   // el mes pasado
    { id:'__ret_r1__', fecha:'', cliente:'💵 RETIRO DE EFECTIVO — fila del sistema, NO BORRAR', vendedor:'Isabel Robledo', chofer:'Contabilidad', acuenta:1000, zona:'FACTURADO', nota:'', ts:new Date(mes+'-10T12:00:00-04:00').getTime() },
    // Kommo: una que ya está cargada (mismo celular que a3) y una nueva
    { id:'kommo-111', estado:BORRADOR_EST, vendedor:'Isabel Robledo', cliente:'CLIENTE a3', celular:'7'+String('a3'.charCodeAt(1))+'00'+'a3'.length+'1', saldo:3000, productos:[], ts:Date.now()-3*86400000, fecha:'' },
    { id:'kommo-222', estado:BORRADOR_EST, vendedor:'Isabel Robledo', cliente:'NUEVO KOMMO', celular:'', saldo:4000, productos:[], ts:Date.now()-86400000, fecha:'' }
  ];
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window._L)) }); };
  apiSave=function(r){ return Promise.resolve({ ok:true, pedido:r }); };
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  window._ver=async function(v, todos){ await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok'; showView('mis'); MIS_TODOS=!!todos;
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
  const r1 = await ev(async () => { await _ver('Isabel Robledo'); var t=document.getElementById('mis-top');
    return { visible:!t.hidden, hacer:_txt('mis-top'), viejo:getComputedStyle(document.getElementById('mis-izq')).display, buscaEnBarra:!!document.querySelector('.filters #mis-busca') }; });
  chk('1a. con un vendedor elegido salen «Para hacer» y «Tu día»', r1.visible && /Para hacer/.test(r1.hacer) && /Tu día, Isabel/.test(r1.hacer), r1.hacer.slice(0,200));
  chk('1b. la dona y las 4 fichas de antes no se ven', r1.viejo==='none', r1.viejo);
  chk('6a. el buscador sube a la barra del nombre', r1.buscaEnBarra, r1);

  /* 2 */
  const r2 = await ev(async () => { MIS_HACER_MAS=true; renderMis(); var it=[].map.call(document.querySelectorAll('#mis-top .ah-it'), function(x){ return x.className.replace('ah-it ','')+'|'+x.querySelector('.ah-n').textContent+'|'+x.querySelector('.ah-tx b').textContent; });
    var ok=[].map.call(document.querySelectorAll('#mis-top .ph-ok-l span'), function(x){ return x.textContent; }); return { it:it, ok:ok }; });
  const sev = r2.it.map(s=>s.split('|')[0]);
  chk('2a. lo rojo va primero (sin stock y atrasados)', /Productos que no hay/.test(r2.it[0]) && sev.indexOf('ah-r')===0 && sev.lastIndexOf('ah-r') < sev.indexOf('ah-a'), r2.it);
  chk('2b. los números: 1 sin stock, 1 atrasado, 1 sin ubicación, 2 de Kommo, 1 con saldo', ['Productos que no hay','Pasaron su turno','Sin ubicación','Ventas de Kommo','Saldo por cobrar'].every(function(t, i){ var f=r2.it.filter(function(s){ return s.indexOf(t)>=0; })[0]; return f && f.split('|')[1]===['1','1','1','2','1'][i]; }), r2.it);
  chk('2c. lo que no tiene pendiente va a «Al día» (recargos, bot)', r2.ok.some(t=>/Recargos reportados/.test(t)) && r2.ok.some(t=>/respuestas del bot/.test(t)), r2.ok);

  /* 3 */
  const r3 = await ev(async () => _txt('mis-top'));
  const esp = await ev(async () => fmtBs0(misAnilloDatos(STATE.filter(function(p){ return mismoVendedor(p.vendedor,'Isabel Robledo'); })).bsAnt));
  chk('3a. «Tu día» dice lo vendido del mes y el mes anterior entero (la cuenta de siempre, misAnilloDatos)', /VENDIDO PARA OCTUBRE/i.test(r3) && r3.indexOf('Septiembre entero: '+esp)>=0 && esp!=='Bs 0', [esp, r3.slice(r3.indexOf('VENDIDO'), r3.indexOf('VENDIDO')+160)]);
  chk('3b. …y falta cobrar del mes Bs 500', /Falta cobrar del mes\s*Bs 500/i.test(r3), r3);

  /* 4 */
  chk('4. efectivo en tu mano = Bs 700 (recibió 1.000 + 700 en octubre y rindió 1.000; el del chofer no es suyo)', /Efectivo en tu mano.*Bs 700/i.test(r3) && /recibiste Bs 1\.700, rendiste Bs 1\.000/.test(r3), r3.match(/Efectivo en tu mano[^]*?Bs [\d.]+/i));

  /* 5 */
  const r5 = await ev(async () => { var b=document.getElementById('mis-borradores'); var fs=[].map.call(b.querySelectorAll('.kx-f'), function(f){ return f.innerText.replace(/\s+/g,' ')+' || '+[].map.call(f.querySelectorAll('button'), function(x){ return x.getAttribute('onclick'); }).join(' ; '); });
    return { txt:b.innerText.replace(/\s+/g,' '), fs:fs }; });
  chk('5a. la bandeja de Kommo va en filas cortas con dos grupos', /Ventas de Kommo para completar/.test(r5.txt) && /Parecen ya cargadas · 1/i.test(r5.txt) && /Nuevas · 1/i.test(r5.txt), r5.txt.slice(0,300));
  chk('5b. la que ya está cargada ofrece «Sí, es la misma» (borrEsLaMisma) y la nueva «Completar» (completarBorrador)', r5.fs.some(f=>/parece la misma que CLIENTE a3/.test(f) && /borrEsLaMisma\('kommo-111'/.test(f)) && r5.fs.some(f=>/NUEVO KOMMO/.test(f) && /completarBorrador\('kommo-222'\)/.test(f)), r5.fs);

  /* 1c y 6b: «Ver todos» con el diseño del equipo (§4nn, 27/10: el dueño aprobó la muestra; antes quedaba como antes, a conciencia) */
  const r6 = await ev(async () => { await _ver('Isabel Robledo', true); return { top:document.getElementById('mis-top').hidden, txt:_txt('mis-top'), izq:getComputedStyle(document.getElementById('mis-izq')).display, busca:!!document.querySelector('.filters #mis-busca') }; });
  chk('1c. con «👑 Ver todos» sale el diseño del equipo (Para hacer · el equipo + El día del equipo), sin la dona', !r6.top && r6.izq==='none' && /Para hacer · el equipo/.test(r6.txt) && /El día del equipo/.test(r6.txt), r6);
  chk('6b. …y el buscador queda en la barra de arriba, como con un nombre', r6.busca, r6);

  chk('sin errores de la página', errores.length===0, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
