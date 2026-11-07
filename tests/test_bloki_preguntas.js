/* 💬 BLOKI CONTESTA LO QUE LE ESCRIBEN, CON LOS NÚMEROS DEL PANEL (07/11, idea 118). El dueño vio la muestra y la aprobó: en la ventana de
   Bloki, «Preguntame algo…». Antes de la ayuda escrita, Bloki entiende cuatro preguntas y las contesta con las cuentas que YA existen;
   lo demás, con la contraseña y el servidor nuevo, se lo pregunta a Claude.

   ⚠️ LO QUE ESTA PRUEBA CUIDA (falla entera contra lo publicado antes, `b8676ca`, que no tiene nada de esto):
   1. El día y el turno: «mañana» es el DÍA y «a la mañana» el TURNO; pasado mañana; el próximo jueves (el mismo día de hoy = la semana que
      viene); dd/mm (y el año que viene si ya pasó); «1 1/2 plazas» no es una fecha.
   2. Qué pregunta es: stock, saldo de un cliente, cupos y entregas; ninguna pregunta de la ayuda («¿Cómo …?») se toma por otra cosa.
   3. 📦 STOCK con el CUADRITO del formulario: el mismo título de `saldoVeredicto`, PTF + Banzer, vendido sin entregar y libres; plazas →
      medida; si ese día se puede (el cupo de ese día); varios productos → hasta 4 para elegir, sin somieres si no dijo «somier».
   4. 💵 SALDO: lo que dice Contabilidad (falta, cobrado, el último pago), «🧾 Abrir la venta»; una vendedora ve SOLO sus ventas; con la
      contraseña o Contabilidad, todas; sin saber quién es, lo pregunta.
   5. 🎟️ CUPOS: libres de cada turno, el sábado solo a la mañana, el domingo y el feriado no sale camión, lleno → el siguiente día con lugar.
   6. 🚚 ENTREGAS: la lista de ese día; la vendedora las suyas, Administración todas; cada una abre su pedido.
   7. En la ventana: Enter → la pregunta a la derecha y la respuesta a la izquierda con «con los números del panel · no gasta»; lo que
      contesta no se anota como «no sabe»; lo de la ayuda abre la respuesta escrita; lo que no sabe, «no sé» y se anota (como antes).
   8. 🤖 CLAUDE: solo con la contraseña Y el servidor ≥ 2026-11-07-a; lleva `pregunta`, `contexto` (números del panel, ≤ 12.000 letras) y
      `quien`; «con Claude · pregunta N de M de hoy»; «tope» → «Ya se usaron las 30 preguntas de hoy»; un error → una frase y la ayuda (o
      se anota); lo que la ayuda ya explica no gasta (botón «Preguntarle a Claude igual»). `apiPost` no le pisa el `quien`.
   Datos SINTÉTICOS. Reloj clavado el martes 10/11/2026 a las 10:00 de Bolivia.
   Se corre:  node tests/test_bloki_preguntas.js   (desde la raíz del repo; PEDIDOS=<otro html> para los dientes) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,700)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  loadFromServer=function(){};
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
  window._saves=[];
  apiSave=function(p){ var r=JSON.parse(JSON.stringify(p)); window._saves.push(r); return Promise.resolve({ ok:true, pedido:r }); };
  try{ ['me_asis_vistos','me_asis_mudo','me_asis_tour','me_asis_preg','me_quien_rol'].forEach(function(k){ localStorage.removeItem(k); }); }catch(e){}
  try{ localStorage.setItem('me_asis_tour','1'); localStorage.setItem('me_asis_video', JSON.stringify('ofrecido')); }catch(e){}
  window._esp=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  window._d=function(n){ return stockSumarDias(todayStr(), n); };
  /* hoy martes 10/11: mañana miércoles 11/11, jueves 12/11 (lleno), sábado 14/11 (4 libres a la mañana) */
  var n=0;
  window.V=function(o){ n++; return Object.assign({ id:'k'+n, oc:'11-'+(100+n), nota:String(900+n), vendedor:'Mirian Salazar', cliente:'CLIENTE '+n, fecha:_d(1), turno:'AM',
    productos:[{ desc:'COLCHON SOFT', medida:'140x190', codigo:'COLT0048', cant:1, precio:2000 }], saldo:0, acuenta:0, pagado:true, metodoPago:'Efectivo 2000 @'+_d(-3)+' #1',
    entregado:false, ts:Date.now()-3*86400000, fotos:[], chofer:'', vehiculo:'', maps:'https://maps.app.goo.gl/x', celular:'7'+String(1000000+n), zona:'Norte', nroDia:n }, o); };
  window.FIX=function(){ n=0;
    var L=[
      /* mañana 11/11 */
      V({ id:'rosa', oc:'11-034', cliente:'ROSA MENDOZA', celular:'70011111', zona:'Equipetrol', turno:'AM', ts:new Date('2026-11-05T11:00:00-04:00').getTime(),
          productos:[{ desc:'TITANIO ICE', medida:'140x190', codigo:'CH1220', cant:1, precio:3000 }],
          acuenta:1000, saldo:1500, pagado:false, metodoPago:'~Efectivo 1000 @2026-11-05 #1001 + QR BISA 500 @2026-11-08 #1002' }),
      V({ id:'dos', cliente:'CLIENTE DOS', zona:'Plan 3000', turno:'PM' }),
      V({ id:'tres', vendedor:'Maria Flores', cliente:'CLIENTE TRES', zona:'Sur', turno:'AM', productos:[{ desc:'ORO ANATOMICO VISCOLASTICO', medida:'140x190', codigo:'CH1036', cant:1, precio:4000 }] }),
      /* otros clientes */
      V({ id:'carlos', cliente:'CARLOS MENDOZA', celular:'76655443', fecha:_d(8), acuenta:0, saldo:800, pagado:false, metodoPago:'Efectivo' }),
      V({ id:'juan', vendedor:'Maria Flores', cliente:'JUAN PEREZ', celular:'71234567', fecha:_d(-6), entregado:true, metodoPago:'Efectivo 2500 @2026-11-02 #900' }),
      /* lo que no es una entrega */
      V({ id:'tienda', cliente:'VENTA TIENDA', fecha:'', turno:'', oc:'11-200' }),
      V({ id:'borr', cliente:'BORRADOR KOMMO', estado:BORRADOR_EST, fecha:_d(1) })
    ];
    /* el jueves 12/11 lleno: 12 a la mañana y 13 a la tarde */
    for(var i=0;i<12;i++) L.push(V({ fecha:_d(2), turno:'AM' }));
    for(var j=0;j<13;j++) L.push(V({ fecha:_d(2), turno:'PM' }));
    /* el sábado 14/11: 11 de 15 */
    for(var k=0;k<11;k++) L.push(V({ fecha:_d(4), turno:'AM' }));
    return L;
  };
  window.LOG='PRODUCTOS TERMINADOS FAB.'; window.BAN='01-05-025  Almacen Distribucion Banzer'; window.IMN='IM - PRODUCTOTERMINADO';
  window.PR={ ICE:{ desc:'TITANIO ICE', medida:'140x190', codigo:'CH1220' }, LAT:{ desc:'TITANIO LATEX', medida:'140x190', codigo:'CH1129' },
              ORO:{ desc:'ORO ANATOMICO VISCOLASTICO', medida:'140x190', codigo:'CH1036' }, SOFT:{ desc:'COLCHON SOFT', medida:'140x190', codigo:'COLT0048' } };
  window.STK=function(){
    var K={}; Object.keys(PR).forEach(function(k){ K[k]=stockClave(PR[k]); });
    var st={ c:{ f:todayStr(), hora:'08:30:00', u:{}, solo0:true, alm:LOG, t:Date.now()-3600000 }, e:[], p:[], a:{}, g:{}, al:{}, h:[] };
    st.g[BAN]={ f:todayStr(), hora:'08:30:00', u:{}, solo0:true, cod:{}, t:Date.now()-3600000, rs:{} };
    st.g[IMN]={ f:todayStr(), hora:'08:00:00', u:{}, solo0:true, cod:{}, t:Date.now()-3600000, rs:{} };
    st.al[LOG]='log'; st.al[BAN]='sale'; st.al[IMN]='otro';
    st.c.u[K.ICE]=3; st.g[BAN].u[K.ICE]=2; st.g[IMN].u[K.ICE]=1;    // TITANIO ICE 140: PTF 3, Banzer 2, Moreno 1
    st.c.u[K.ORO]=1;                                                  // ORO ANATÓMICO 140: PTF 1 (y 1 vendido para mañana)
    st.c.u[K.SOFT]=60;
    STOCK=st; STOCK_CARGADO=true; stockOlvidarIndice(); SALDO_CACHE=null;
    window.K=K;
  };
  window.QUIEN=function(o){ o=o||{}; UNLOCKED=!!o.clave; quienRol(o.rol||''); setVendedorMem(o.v||''); var mv=document.getElementById('mis-vendedor'); if(mv) mv.value=''; };
  /* Pregunta como la persona: escribe en «Preguntame algo…» y aprieta Enter. Devuelve la última respuesta. */
  window.PREG=async function(q){
    if(!ASIS.abierto || ASIS.tab!=='ayuda') asisAbrir('ayuda');
    var inp=document.getElementById('asis-q'); inp.value=q; inp.dispatchEvent(new Event('input', { bubbles:true }));
    var f=inp.closest('form'); if(f.requestSubmit) f.requestSubmit(); else f.dispatchEvent(new Event('submit', { cancelable:true }));
    await _esp(60);
    return ULT();
  };
  window.ULT=function(){
    var qs=document.querySelectorAll('#asis-chat .bkp-q'), as=document.querySelectorAll('#asis-chat .bkp-a'), a=as[as.length-1];
    if(!a) return { q:'', t:'' };
    return { q:(qs[qs.length-1]||{}).textContent||'', t:a.innerText.replace(/\s+/g,' '), html:a.innerHTML, mal:a.classList.contains('mal'), ia:a.classList.contains('ia'),
      nums:[].map.call(a.querySelectorAll('.bkp-n'), function(x){ return x.innerText.replace(/\s+/g,' '); }),
      tag:(a.querySelector('.bkp-tag')||{}).textContent||'', dia:(a.querySelector('.bkp-dia')||{}).textContent||'',
      opc:[].map.call(a.querySelectorAll('.bkp-opc button'), function(b){ return b.textContent; }),
      btns:[].map.call(a.querySelectorAll('.bkp-acc button'), function(b){ return b.textContent; }),
      lista:[].map.call(a.querySelectorAll('.bkp-li button'), function(b){ return b.innerText.replace(/\s+/g,' '); }), n:as.length };
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const page = await browser.newPage({ viewport:{ width:1280, height:900 }, timezoneId:'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.addInitScript(() => { window.ASIS_PRUEBA=1; try{ sessionStorage.setItem('me_quien_ok','1'); }catch(e){} });
  await page.clock.setFixedTime(new Date('2026-11-10T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(1800);   // Bloki se arma ~1,5 s después de abrir
  await page.evaluate(PREPARAR);
  const ev = async (fn, arg) => { try{ return await page.evaluate(fn, arg); }catch(e){ return { __err:String(e.message||e).slice(0,300) }; } };

  /* ---------------------------------------------------------------- 1 */
  console.log('\n── 1. El día y el turno ──');
  let r = await ev(() => {
    var D=function(t){ var o=blokiDia(blokiNorm(t)); return (o.dia||'-')+'|'+(o.turno||'-'); };
    return { hoy:todayStr(), manana:D('qué entrego mañana'), tardeMan:D('cupos de mañana a la tarde'), turnoSolo:D('hay lugar a la mañana?'), mm:D('mañana a la mañana'),
      pasado:D('pasado mañana'), jue:D('¿hay titanio 140 para el jueves?'), mar:D('el martes'), sab:D('el sábado'), hoyD:D('mis entregas de hoy'),
      fecha:D('para el 12/11'), enero:D('el 05/01'), plz:D('titanio 1 1/2 plazas'), pm:D('turno pm del viernes') };
  });
  chk('«mañana» es el DÍA (miércoles 11/11)', r.manana==='2026-11-11|-', r);
  chk('«a la tarde» es el TURNO y «mañana» el día: «cupos de mañana a la tarde» = 11/11 PM', r.tardeMan==='2026-11-11|PM', r);
  chk('«a la mañana» solo es el turno (sin día); «mañana a la mañana» = 11/11 AM', r.turnoSolo==='-|AM' && r.mm==='2026-11-11|AM', r);
  chk('pasado mañana = 12/11; «el jueves» = 12/11; «el sábado» = 14/11; hoy = 10/11', r.pasado==='2026-11-12|-' && r.jue==='2026-11-12|-' && r.sab==='2026-11-14|-' && r.hoyD==='2026-11-10|-', r);
  chk('«el martes» un martes = el de la semana que viene (17/11)', r.mar==='2026-11-17|-', r);
  chk('dd/mm: «12/11» = 2026-11-12; «05/01» = el año que viene; «1 1/2 plazas» no es una fecha', r.fecha==='2026-11-12|-' && r.enero==='2027-01-05|-' && r.plz==='-|-', r);
  chk('«turno pm del viernes» = 13/11 PM', r.pm==='2026-11-13|PM', r);

  /* ---------------------------------------------------------------- 2 */
  console.log('\n── 2. Qué pregunta es ──');
  r = await ev(() => {
    STATE=FIX(); STK(); QUIEN({ v:'Mirian Salazar' });
    var T=function(q){ var o=blokiEntender(q); return o ? o.tipo : null; };
    var ej={ stock:T('¿hay titanio 140 para el jueves?'), stock2:T('stock de oro anatómico 2 plazas'), cli:T('cuánto le falta pagar a la señora mendoza'),
      cli2:T('saldo de Juan Pérez'), cupo:T('¿hay lugar el sábado?'), cupo2:T('cupos de mañana a la tarde'), ent:T('qué entrego mañana'), ent2:T('mis entregas de hoy'),
      cod:T('hay CH1220?'), oc:T('saldo de la 11-034') };
    var nada=['factura con nit extranjero','cómo anulo una venta','el cliente no contesta','cómo cargo un pedido','¿dónde pongo la plata?','reprogramr','hola'].filter(function(q){ return blokiEntender(q); });
    var ay=function(){ return ASIS_AYUDA.filter(function(a){ return blokiEntender(a.q); }).map(function(a){ return a.q+' → '+blokiEntender(a.q).tipo; }); };
    var ayVend=ay(); QUIEN({ clave:1 }); var ayAdm=ay(); QUIEN({ v:'Mirian Salazar' });
    return { ej:ej, nada:nada, ayVend:ayVend, ayAdm:ayAdm };
  });
  chk('los ejemplos del dueño: stock, stock, saldo, saldo, cupos, cupos, entregas, entregas', r.ej && r.ej.stock==='stock' && r.ej.stock2==='stock' && r.ej.cli==='cliente' && r.ej.cli2==='cliente' &&
      r.ej.cupo==='cupos' && r.ej.cupo2==='cupos' && r.ej.ent==='entregas' && r.ej.ent2==='entregas', r.ej);
  chk('un código del catálogo es stock; «saldo de la 11-034» es el de una venta', r.ej && r.ej.cod==='stock' && r.ej.oc==='cliente', r.ej);
  chk('lo que no es ninguna («factura con nit», «cómo anulo una venta», «hola»…) sigue a la ayuda', r.nada && r.nada.length===0, r.nada);
  chk('ninguna pregunta de la ayuda se toma por otra cosa (vendedora y Administración)', r.ayVend && !r.ayVend.length && r.ayAdm && !r.ayAdm.length, r);

  /* ---------------------------------------------------------------- 3 */
  console.log('\n── 3. 📦 Stock, con el cuadrito del formulario ──');
  r = await ev(async () => {
    STATE=FIX(); STK(); QUIEN({ v:'Mirian Salazar' }); BLOKI_P.chat=[];
    var a=await PREG('¿hay titanio 140 para el jueves?');
    var opc=a.opc;
    /* elegir TITANIO ICE */
    var b=[].filter.call(document.querySelectorAll('#asis-chat .bkp-opc button'), function(x){ return /ICE/.test(x.textContent); })[0]; if(b) b.click(); await _esp(40);
    var ice=ULT();
    var v=saldoVeredicto(K.ICE, 1, '', '2026-11-12', true, 'CH1220');
    var sab=await PREG('hay titanio ice 140 para el sábado?');
    var oro=await PREG('stock de oro anatómico 2 plazas');
    var vo=saldoVeredicto(K.ORO, 1, '', '', true, 'CH1036');
    var lat=await PREG('stock de titanio latex 140');
    var vl=saldoVeredicto(K.LAT, 1, '', '', true, 'CH1129');
    var cod=await PREG('hay CH1220?');
    var dos=await PREG('hay 2 titanio ice 140?');
    var nada=await PREG('stock de colchon marciano');
    var muchos=await PREG('stock de colchon 140');
    var med=await PREG('stock de titanio ice 90');
    return { opc:opc, ice:ice, titV:saldoTitulo(v), v:{ mano:v.mano, pend:v.pend, libres:v.libres }, sab:sab, oro:oro, titO:saldoTitulo(vo), lat:lat, titL:saldoTitulo(vl), cod:cod, dos:dos, nada:nada, muchos:muchos, med:med };
  });
  chk('«titanio 140» → elegir entre TITANIO ICE y TITANIO LATEX (sin somieres: no dijo «somier»)', r.opc && r.opc.length===2 && r.opc.some(function(o){ return /TITANIO ICE 140x190/.test(o); }) &&
      r.opc.some(function(o){ return /TITANIO LATEX 140x190/.test(o); }) && !r.opc.some(function(o){ return /SOMIER/.test(o); }), r.opc);
  chk('al elegir TITANIO ICE: el MISMO título del cuadrito del formulario (saldoVeredicto para el jueves)', r.ice && r.ice.t.indexOf(r.titV)>=0, { t:r.ice && r.ice.t, tit:r.titV });
  chk('…tres números: PTF + Banzer 5 (+1 en Moreno), vendido sin entregar 1, libres 5 (= el cuadrito)', r.ice && r.v.mano===5 && r.v.pend===1 && r.v.libres===5 &&
      /^5 PTF \+ Banzer \+1 en Moreno$/.test(r.ice.nums[0]) && /^1 Vendido sin entregar/.test(r.ice.nums[1]) && /^5 Libres/.test(r.ice.nums[2]), r.ice && r.ice.nums);
  chk('…el jueves está lleno: lo dice y da el siguiente día con lugar (viernes 13/11)', r.ice && /jueves 12\/11 ya no hay cupo; el siguiente con lugar es el viernes 13\/11/.test(r.ice.dia), r.ice && r.ice.dia);
  chk('…el detalle del cuadrito (PTF 3 · Banzer 2 · Moreno 1 · corte de hoy) y la etiqueta «con los números del panel · no gasta»', r.ice && /PTF 3 · Banzer 2 · Moreno 1/.test(r.ice.t) &&
      /Saldo al corte de hoy 08:30/.test(r.ice.t) && r.ice.tag==='con los números del panel · no gasta', r.ice && r.ice.t);
  chk('«para el sábado»: sí, hay en almacén y quedan 4 lugares (solo a la mañana)', r.sab && /Para el sábado 14\/11 sí: hay en almacén y quedan 4 lugares en el camión \(mañana 4\)/.test(r.sab.dia), r.sab && r.sab.dia);
  chk('«oro anatómico 2 plazas» = ORO ANATÓMICO VISCOLÁSTICO 140x190, con su título del cuadrito', r.oro && /ORO ANATOMICO VISCOLASTICO 140x190/.test(r.oro.t) && r.oro.t.indexOf(r.titO)>=0, { t:r.oro && r.oro.t, tit:r.titO });
  chk('…1 en PTF y 1 vendido para mañana: «Faltan 1» en rojo', r.oro && r.oro.nums.some(function(n){ return /^1 Faltan/.test(n); }) && r.oro.mal, r.oro && r.oro.nums);
  chk('TITANIO LATEX 140 sin stock: «🏭 NO HAY» como el formulario', r.lat && /🏭 NO HAY/.test(r.lat.t) && r.lat.t.indexOf(r.titL)>=0, r.lat && r.lat.t);
  chk('por código (CH1220) va directo al producto', r.cod && /TITANIO ICE 140x190/.test(r.cod.t) && !r.cod.opc.length, r.cod && r.cod.t);
  chk('«hay 2 titanio ice 140» pregunta por 2', r.dos && /TITANIO ICE 140x190 × 2/.test(r.dos.t), r.dos && r.dos.t);
  chk('un producto que no existe: «No encontré…» (no inventa)', r.nada && /No encontré «colchon marciano»/.test(r.nada.t), r.nada && r.nada.t);
  chk('«colchón 140» a secas (muchos): pide el modelo, no elige 4 al azar', r.muchos && /^Hay \d+ productos con «colchon»: decime el modelo y la medida/.test(r.muchos.t) && !r.muchos.opc.length, r.muchos && r.muchos.t);
  chk('un producto en una medida que no tiene: dice en cuáles está', r.med && /No tengo/.test(r.med.t) && /140x190/.test(r.med.t), r.med && r.med.t);

  /* ---------------------------------------------------------------- 4 */
  console.log('\n── 4. 💵 Lo que le falta pagar a un cliente ──');
  r = await ev(async () => {
    STATE=FIX(); STK(); BLOKI_P.chat=[];
    QUIEN({ v:'Mirian Salazar' });
    var rosa=await PREG('cuánto le falta pagar a la señora rosa mendoza');
    var dosM=await PREG('cuánto debe mendoza');
    var b=[].filter.call(document.querySelectorAll('#asis-chat .bkp-opc button'), function(x){ return /CARLOS/.test(x.textContent); })[0]; if(b) b.click(); await _esp(40);
    var carlos=ULT();
    var cel=await PREG('saldo de 70011111');
    var oc=await PREG('saldo de la 11-034');
    var bAbrir=[].filter.call(document.querySelectorAll('#asis-chat .bkp-acc button'), function(x){ return /Abrir la venta/.test(x.textContent); }).pop();
    if(bAbrir) bAbrir.click(); await _esp(150);
    var modal=document.getElementById('modal'), abierta=!!(modal && modal.classList.contains('on')) && MODAL_KIND==='conta' && /ROSA MENDOZA/.test(modal.innerText);
    try{ closeModal(); }catch(e){}
    var juanMirian=await PREG('saldo de juan perez');
    QUIEN({ v:'Maria Flores' }); var rosaMaria=await PREG('cuánto le falta pagar a rosa mendoza');
    var juan=await PREG('saldo de Juan Pérez');
    QUIEN({ rol:'conta' }); var rosaConta=await PREG('cuánto le falta pagar a rosa mendoza');
    QUIEN({ clave:1 }); var rosaClave=await PREG('cuánto le falta pagar a rosa mendoza');
    QUIEN({}); var nadie=await PREG('cuánto le falta pagar a rosa mendoza');
    var p=findById('rosa');
    return { rosa:rosa, dosM:dosM, carlos:carlos, cel:cel, oc:oc, abierta:abierta, juanMirian:juanMirian, rosaMaria:rosaMaria, juan:juan, rosaConta:rosaConta, rosaClave:rosaClave, nadie:nadie,
      falta:fmtBs(contaFaltaCobrar(p)), cobrado:fmtBs0(contaCobrado(p)), vendido:fmtBs0(cliValor(p)), pago:fmtBs(500) };
  });
  chk('Rosa Mendoza: le falta pagar lo de Contabilidad (contaFaltaCobrar) de la OC 11-034', r.rosa && r.rosa.t.indexOf('A ROSA MENDOZA le falta pagar '+r.falta+' de la OC 11-034')>=0, r.rosa && r.rosa.t);
  chk('…números: vendido, cobrado (contaCobrado) y falta', r.rosa && r.rosa.nums[0].indexOf(r.vendido)===0 && r.rosa.nums[1].indexOf(r.cobrado)===0 && /Falta/.test(r.rosa.nums[2]), r.rosa && r.rosa.nums);
  chk('…el último pago (QR BISA 500 el domingo 08/11) y «🧾 Abrir la venta»', r.rosa && r.rosa.t.indexOf('Último pago: '+r.pago+' el domingo 08/11')>=0 && /QR/.test(r.rosa.t) && r.rosa.btns.some(function(b){ return /Abrir la venta/.test(b); }), r.rosa && r.rosa.t);
  chk('«mendoza» a secas: dos clientes para elegir, con lo que debe cada uno; al elegir, el suyo', r.dosM && r.dosM.opc.length===2 && r.carlos && /CARLOS MENDOZA le falta pagar/.test(r.carlos.t), { o:r.dosM && r.dosM.opc, c:r.carlos && r.carlos.t });
  chk('por celular y por OC también', r.cel && /ROSA MENDOZA/.test(r.cel.t) && r.oc && /ROSA MENDOZA/.test(r.oc.t), [r.cel && r.cel.t, r.oc && r.oc.t]);
  chk('«🧾 Abrir la venta» abre su ficha de Contabilidad', r.abierta, r.abierta);
  chk('una vendedora ve SOLO sus ventas: Mirian no encuentra a Juan Pérez (de Maria) y Maria no encuentra a Rosa (de Mirian)', r.juanMirian && /No encontré «juan perez» entre tus ventas/.test(r.juanMirian.t) &&
      r.rosaMaria && /No encontré «rosa mendoza» entre tus ventas/.test(r.rosaMaria.t), [r.juanMirian && r.juanMirian.t, r.rosaMaria && r.rosaMaria.t]);
  chk('Juan Pérez, de Maria, no debe nada', r.juan && /JUAN PEREZ no debe nada/.test(r.juan.t), r.juan && r.juan.t);
  chk('Contabilidad y la contraseña ven todas', r.rosaConta && /ROSA MENDOZA le falta pagar/.test(r.rosaConta.t) && r.rosaClave && /ROSA MENDOZA le falta pagar/.test(r.rosaClave.t), [r.rosaConta && r.rosaConta.t]);
  chk('sin saber quién es, lo pregunta (no muestra nada)', r.nadie && /Primero decime quién sos/.test(r.nadie.t) && !/ROSA/.test(r.nadie.t), r.nadie && r.nadie.t);

  /* ---------------------------------------------------------------- 5 */
  console.log('\n── 5. 🎟️ Cupos ──');
  r = await ev(async () => {
    STATE=FIX(); STK(); QUIEN({ v:'Mirian Salazar' }); BLOKI_P.chat=[];
    var sab=await PREG('¿hay lugar el sábado?');
    var sabTarde=await PREG('cupos del sábado a la tarde');
    var jue=await PREG('hay lugar el jueves?');
    var man=await PREG('cupos de mañana a la tarde');
    var dom=await PREG('hay lugar el domingo?');
    FERIADOS['2026-11-13']='Feriado de prueba'; var fer=await PREG('hay lugar el viernes?'); delete FERIADOS['2026-11-13'];
    var usados=[cuposUsadosTurno('2026-11-14','AM'), limTurno('2026-11-14','AM'), cuposUsadosTurno('2026-11-11','PM'), limTurno('2026-11-11','PM')];
    var bV=[].filter.call(document.querySelectorAll('#asis-chat .bkp-a'), function(a){ return /sábado 14\/11 hay lugar/.test(a.innerText); })[0];
    return { sab:sab, sabTarde:sabTarde, jue:jue, man:man, dom:dom, fer:fer, usados:usados };
  });
  chk('«¿hay lugar el sábado?»: quedan 4 (11 de 15), el sábado solo a la mañana', r.sab && /Sí, el sábado 14\/11 hay lugar: quedan 4 \(el sábado sale solo a la mañana\)/.test(r.sab.t) &&
      r.usados[0]===11 && r.usados[1]===15 && r.sab.nums.length===1 && /^4 🌅 Mañana · libres 11 de 15 ocupados/.test(r.sab.nums[0]), r.sab && { t:r.sab.t, n:r.sab.nums });
  chk('el sábado a la tarde: no hay turno tarde', r.sabTarde && /no hay turno tarde: el sábado sale solo a la mañana/.test(r.sabTarde.t), r.sabTarde && r.sabTarde.t);
  chk('el jueves lleno: «No», y el siguiente día con lugar', r.jue && /No: el jueves 12\/11 está lleno/.test(r.jue.t) && /El primer día con lugar es el viernes 13\/11/.test(r.jue.t) && r.jue.mal, r.jue && r.jue.t);
  chk('«cupos de mañana a la tarde»: la tarde del miércoles (13 libres de 13 menos el de Mirian)', r.man && /mañana, miércoles 11\/11 a la tarde quedan 12 lugares \(1 de 13 ocupados\)/.test(r.man.t) && r.usados[2]===1, r.man && r.man.t);
  chk('domingo y feriado: no sale camión (y el siguiente día con lugar)', r.dom && /domingo 15\/11 no sale camión \(los domingos no sale camión\)/.test(r.dom.t) &&
      r.fer && /viernes 13\/11 no sale camión \(feriado: Feriado de prueba\)/.test(r.fer.t) && /El primer día con lugar es el sábado 14\/11/.test(r.fer.t), [r.dom && r.dom.t, r.fer && r.fer.t]);
  chk('«👀 Ver los N…» lleva a la lista del turno', r.sab && r.sab.btns.some(function(b){ return /Ver los 11 de la mañana/.test(b); }), r.sab && r.sab.btns);

  /* ---------------------------------------------------------------- 6 */
  console.log('\n── 6. 🚚 Entregas ──');
  r = await ev(async () => {
    STATE=FIX(); STK(); BLOKI_P.chat=[];
    QUIEN({ v:'Mirian Salazar' }); var mir=await PREG('qué entrego mañana');
    var b=document.querySelector('#asis-chat .bkp-a:last-child .bkp-li button'); var id=b && b.getAttribute('data-id'); if(b) b.click(); await _esp(150);
    var modal=document.getElementById('modal'), abrio=!!(modal && modal.classList.contains('on')) && MODAL_KIND==='mis'; try{ closeModal(); }catch(e){}
    QUIEN({ v:'Mirian Salazar' }); var mirTarde=await PREG('mis entregas de mañana a la tarde');
    var hoy=await PREG('mis entregas de hoy');
    QUIEN({ clave:1 }); var adm=await PREG('qué entrego mañana');
    QUIEN({ rol:'logistica' }); var log=await PREG('qué sale mañana');
    QUIEN({}); var nadie=await PREG('qué entrego mañana');
    return { mir:mir, id:id, abrio:abrio, mirTarde:mirTarde, hoy:hoy, adm:adm, log:log, nadie:nadie };
  });
  chk('Mirian, «qué entrego mañana»: sus 2 (1 a la mañana y 1 a la tarde), con OC, cliente, zona y turno', r.mir && /Mañana, miércoles 11\/11 tenés 2 entregas: 1 a la mañana y 1 a la tarde/.test(r.mir.t) &&
      r.mir.lista.length===2 && /11-034 · ROSA MENDOZA Equipetrol · 🌅 mañana/.test(r.mir.lista[0]) && /CLIENTE DOS Plan 3000 · 🌆 tarde/.test(r.mir.lista[1]), r.mir && { t:r.mir.t, l:r.mir.lista });
  chk('…ni la venta de tienda ni el borrador de Kommo; y tocar una abre su pedido', r.mir && !/TIENDA|BORRADOR/.test(r.mir.t) && r.id==='rosa' && r.abrio, { id:r.id, abrio:r.abrio });
  chk('«a la tarde»: solo la de la tarde; «de hoy»: no tiene', r.mirTarde && /tenés 1 entrega/.test(r.mirTarde.t) && r.mirTarde.lista.length===1 && r.hoy && /No tenés entregas para hoy/.test(r.hoy.t), [r.mirTarde && r.mirTarde.t, r.hoy && r.hoy.t]);
  chk('con la contraseña y logística: todas (3) y con la vendedora', r.adm && /salen 3 entregas/.test(r.adm.t) && r.adm.lista.some(function(l){ return /Maria Flores/.test(l); }) && r.log && /salen 3 entregas/.test(r.log.t), [r.adm && r.adm.t, r.log && r.log.t]);
  chk('sin saber quién es, lo pregunta', r.nadie && /Primero decime quién sos/.test(r.nadie.t), r.nadie && r.nadie.t);

  /* ---------------------------------------------------------------- 7 */
  console.log('\n── 7. En la ventana ──');
  r = await ev(async () => {
    STATE=FIX(); STK(); QUIEN({ v:'Mirian Salazar' }); BLOKI_P.chat=[]; asisCerrar(); asisAbrir('ayuda');
    var ph=document.getElementById('asis-q').placeholder, tab=[].map.call(document.querySelectorAll('#asis-panel .asis-tabs button'), function(b){ return b.textContent; });
    var ej=[].map.call(document.querySelectorAll('#asis-chat .bkp-ej button'), function(b){ return b.textContent; });
    /* escribir sin apretar Enter: la pista, no «no sé» */
    ASIS.q='hay lugar el sábado'; asisAyudaLista(); var pista=(document.getElementById('asis-lista')||{}).textContent||'';
    var a=await PREG('¿hay lugar el sábado?');
    var q=document.querySelector('#asis-chat .bkp-q'), qa=document.querySelector('#asis-chat .bkp-a');
    var cq0=getComputedStyle(q), ca0=getComputedStyle(qa);
    var cq={ justifySelf:cq0.justifySelf, backgroundColor:cq0.backgroundColor }, ca={ justifySelf:ca0.justifySelf };   // ya: la conversación se repinta
    var lista=(document.getElementById('asis-lista')||{}).textContent||'';
    await _esp(3300);
    var ls=JSON.parse(localStorage.getItem('me_asis_preg')||'[]');
    var ay=await PREG('cómo anoto el pago');
    var abierta=(document.querySelector('#asis-lista .asis-pr.on .asis-pq')||{}).textContent||'';
    var ns=await PREG('factura con nit extranjero');
    var ls2=JSON.parse(localStorage.getItem('me_asis_preg')||'[]');
    return { ph:ph, tab:tab, ej:ej, pista:pista, a:a, der:cq.justifySelf, izq:ca.justifySelf, bg:cq.backgroundColor, lista:lista, ls:ls.length, ay:ay, abierta:abierta, ns:ns, ls2:ls2.map(function(x){ return x.t; }) };
  });
  chk('el campo dice «Preguntame algo…» y la pestaña «💬 Preguntame», con ejemplos para tocar', r.ph==='Preguntame algo…' && r.tab && r.tab.some(function(t){ return /Preguntame/.test(t); }) && r.ej && r.ej.length>=3, r);
  chk('mientras escribe una pregunta que entiende: la pista «Tocá Preguntar», no «No tengo esa respuesta»', /Tocá «Preguntar»/.test(r.pista) && !/No tengo esa respuesta/.test(r.pista), r.pista);
  chk('con Enter: la pregunta a la DERECHA en turquesa, la respuesta a la IZQUIERDA', r.der==='end' && r.izq==='start' && /rgb\(0, 181, 173\)/.test(r.bg) && r.a && r.a.q==='¿hay lugar el sábado?', { der:r.der, izq:r.izq, bg:r.bg });
  chk('…la lista de la ayuda no dice «no sé», y no se anota como «no sabe» (3 s después)', !/No tengo esa respuesta/.test(r.lista) && r.ls===0, { lista:r.lista, ls:r.ls });
  chk('lo que la ayuda explica («cómo anoto el pago»): lo dice y la abre abajo', r.ay && /lo tengo explicado abajo/.test(r.ay.t) && /anoto el pago/.test(r.abierta) && r.ay.tag==='de la ayuda del panel · no gasta', [r.ay && r.ay.t, r.abierta]);
  chk('lo que no sabe: «No tengo esa respuesta todavía» y se anota (como antes)', r.ns && /No tengo esa respuesta todavía: la anoté/.test(r.ns.t) && r.ls2.indexOf('factura con nit extranjero')>=0, { t:r.ns && r.ns.t, ls:r.ls2 });

  /* ---------------------------------------------------------------- 8 */
  console.log('\n── 8. 🤖 Claude: solo con la contraseña y el servidor nuevo ──');
  r = await ev(async () => {
    STATE=FIX(); STK(); BLOKI_P.chat=[]; localStorage.removeItem('me_asis_preg');
    var calls=[], modo='ok';
    window._apiPost0=window._apiPost0||apiPost;
    apiPost=function(p){ calls.push(JSON.parse(JSON.stringify(p)));
      if(modo==='ok') return new Promise(function(res){ setTimeout(function(){ res({ ok:true, respuesta:'La que más vendió es **Mirian Salazar**.\nVa Bs 10.000.', usadas:3, tope:30 }); }, 250); });
      if(modo==='tope') return Promise.resolve({ ok:false, error:'tope', usadas:30, tope:30, version:'2026-11-07-a' });
      if(modo==='pausa') return Promise.resolve({ ok:false, error:'ia_error', detalle:'Claude está en pausa: sin crédito', usadas:4, tope:30, version:'2026-11-07-a' });
      return Promise.reject(new Error('http500')); };
    var Q='¿quién vendió más este mes?';
    /* sin contraseña, servidor nuevo: no se pregunta a Claude */
    SERVER_VER='2026-11-07-a'; QUIEN({ v:'Mirian Salazar' }); var sinClave=await PREG(Q);
    /* con contraseña, servidor viejo: tampoco */
    SERVER_VER='2026-11-06-e'; QUIEN({ clave:1 }); var viejo=await PREG(Q);
    var n0=calls.length;
    localStorage.removeItem('me_asis_preg');   // lo de arriba (sin Claude) se anotó, como antes
    /* con contraseña y servidor nuevo: sí */
    SERVER_VER='2026-11-07-a'; QUIEN({ clave:1 });
    asisAbrir('ayuda'); ASIS.q=Q; asisAyudaLista(); var pista=(document.getElementById('asis-lista')||{}).textContent||'';
    await PREG(Q); var cargando=(document.querySelector('#asis-chat .bkp-a:last-child')||{}).textContent||''; await _esp(400);
    var ok=ULT(), c=calls[calls.length-1];
    modo='tope'; var tope=await PREG('¿cuánto vendió Sueña el mes pasado?'); await _esp(60); tope=ULT();
    modo='mal'; var mal=await PREG('¿y cómo vamos contra octubre?'); await _esp(60); mal=ULT();
    var ls=JSON.parse(localStorage.getItem('me_asis_preg')||'[]').map(function(x){ return x.t; });
    modo='ok'; var nAntes=calls.length, ay=await PREG('cómo anoto el pago'); var nAy=calls.length-nAntes;
    var bIgual=[].filter.call(document.querySelectorAll('#asis-chat .bkp-acc button'), function(x){ return /Preguntarle a Claude igual/.test(x.textContent); }).pop();
    if(bIgual) bIgual.click(); await _esp(400); var igual=ULT(), nIgual=calls.length-nAntes;
    /* un número del panel no gasta aunque haya Claude */
    var nN=calls.length, num=await PREG('hay lugar el sábado?'), gastaNum=calls.length-nN;
    /* la contestación del servidor de verdad (7b38ffa): «ia_error» con su detalle, y una pregunta de más de 300 letras no viaja */
    modo='pausa'; var pausa=await PREG('¿qué vendedora tiene más ventas sin cobrar?'); await _esp(60); pausa=ULT();
    var nL=calls.length, larga=await PREG('¿quién vendió más? '+new Array(60).join('blabla ')), gastaLarga=calls.length-nL; larga=ULT();
    return { pausa:pausa, larga:larga, gastaLarga:gastaLarga, sinClave:sinClave, viejo:viejo, n0:n0, pista:pista, cargando:cargando, ok:ok, c:c && { action:c.action, pregunta:c.pregunta, quien:c.quien, len:(c.contexto||'').length,
      ctx:(c.contexto||'').slice(0,4000) }, tope:tope, mal:mal, ls:ls, ay:ay, nAy:nAy, igual:igual, nIgual:nIgual, gastaNum:gastaNum, num:num };
  });
  chk('sin la contraseña (vendedora), o con un servidor anterior: no le pregunta a Claude («no sé», como antes)', r.n0===0 && r.sinClave && /No tengo esa respuesta todavía/.test(r.sinClave.t) &&
      r.viejo && /No tengo esa respuesta todavía/.test(r.viejo.t), { n0:r.n0, a:r.sinClave && r.sinClave.t, b:r.viejo && r.viejo.t });
  chk('con la contraseña y el servidor nuevo, la pista dice que se la pregunta a Claude', /se la pregunto a Claude/.test(r.pista||''), r.pista);
  chk('mientras espera: «Le pregunto a Claude…»', /Le pregunto a Claude/.test(r.cargando||''), r.cargando);
  chk('manda {action:"bloki", pregunta, contexto, quien} y el contexto son números del panel, ≤ 12.000 letras', r.c && r.c.action==='bloki' && r.c.pregunta==='¿quién vendió más este mes?' &&
      r.c.quien==='Administración' && r.c.len>200 && r.c.len<=12000 && /VENTAS DE NOVIEMBRE DE 2026/.test(r.c.ctx) && /Mirian Salazar \(Heaven\)/.test(r.c.ctx) && /CUPOS DEL CAMIÓN/.test(r.c.ctx) &&
      /FALTA COBRAR/.test(r.c.ctx) && /STOCK DE LO MÁS VENDIDO/.test(r.c.ctx), r.c);
  chk('la respuesta de Claude, con «con Claude · pregunta 3 de 30 de hoy» (y la negrita)', r.ok && r.ok.ia && /La que más vendió es Mirian Salazar/.test(r.ok.t) && /<b>Mirian Salazar<\/b>/.test(r.ok.html) &&
      r.ok.tag==='con Claude · pregunta 3 de 30 de hoy', r.ok && { t:r.ok.t, tag:r.ok.tag });
  chk('«ia_error» con detalle (Claude en pausa): lo dice', r.pausa && /No pude preguntarle a Claude ahora \(Claude está en pausa: sin crédito\)/.test(r.pausa.t), r.pausa && r.pausa.t);
  chk('una pregunta de más de 300 letras no se manda (el servidor la rechaza): «acortala»', r.gastaLarga===0 && r.larga && /más de 300 letras/.test(r.larga.t), { n:r.gastaLarga, t:r.larga && r.larga.t });
  chk('el tope: «Ya se usaron las 30 preguntas de hoy»', r.tope && /Ya se usaron las 30 preguntas de hoy/.test(r.tope.t), r.tope && r.tope.t);
  chk('un error: una frase y, sin ayuda escrita, se anota (lo que Claude contestó, no)', r.mal && /No pude preguntarle a Claude ahora/.test(r.mal.t) && r.ls.indexOf('¿y cómo vamos contra octubre?')>=0 && r.ls.indexOf('¿quién vendió más este mes?')<0, { t:r.mal && r.mal.t, ls:r.ls });
  chk('lo que la ayuda ya explica no gasta: abre la ayuda y ofrece «Preguntarle a Claude igual»', r.nAy===0 && r.ay && r.ay.btns.some(function(b){ return /Preguntarle a Claude igual/.test(b); }), { n:r.nAy, b:r.ay && r.ay.btns });
  chk('…y tocarlo sí le pregunta', r.nIgual===1 && r.igual && r.igual.ia, { n:r.nIgual, t:r.igual && r.igual.t });
  chk('una pregunta de números del panel no gasta aunque haya Claude', r.gastaNum===0 && r.num && r.num.tag==='con los números del panel · no gasta', r.gastaNum);

  r = await ev(async () => {
    if(window._apiPost0) apiPost=window._apiPost0;   // el de verdad
    var bodies=[], f0=window.fetch, u0=SHEETS_URL;
    SHEETS_URL='https://script.google.com/macros/s/PRUEBA/exec';
    window.fetch=function(u, o){ bodies.push(JSON.parse(o.body)); return Promise.resolve({ ok:true, status:200, json:function(){ return Promise.resolve({ ok:true }); } }); };
    setVendedorMem('Mirian Salazar');
    await apiPost({ action:'bloki', pregunta:'x', contexto:'y', quien:'Administración' });
    await apiPost({ action:'histStockLeer', quien:'otro' });
    window.fetch=f0; SHEETS_URL=u0;
    return bodies.map(function(b){ return b.action+':'+b.quien; });
  });
  chk('`apiPost` no le pisa el `quien` a la pregunta de Bloki (las otras siguen con el de siempre)', Array.isArray(r) && r[0]==='bloki:Administración' && r[1]==='histStockLeer:Mirian Salazar', r);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3).join(' | '));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL ? 1 : 0);
})();
