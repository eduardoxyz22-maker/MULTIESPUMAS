/* 📅 LA FECHA DE LA VENTA DE TIENDA (§4nm, 27/10)
   El dueño: tres ventas de Charcas (notas 2174, 2175, 2176) se cargaron el 1/10 y salieron de la tienda el 30/09, y no se podían
   pasar a esa fecha. La venta de tienda no tiene fecha de entrega: su día es el `ts` (`contaFecha`), y con eso cuenta en
   Contabilidad, Proyección y las metas. «Fecha de la venta», en el recuadro celeste, lo mueve a ese día con la misma hora.
   Red cortada, reloj clavado en el 27/10/2026 15:00 de Bolivia, ventas inventadas.  node tests/test_venta_tienda_fecha.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const J = (o) => JSON.stringify(o);

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{width:1500,height:1000}, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r=>r.abort());
  const page = await ctx.newPage();
  const errores=[]; page.on('pageerror',e=>errores.push(e.message));
  const dialogos=[]; let rechazar=false;
  page.on('dialog', d => { dialogos.push(d.message()); if(rechazar){ rechazar=false; d.dismiss(); } else d.accept(); });
  await page.clock.setFixedTime(new Date('2026-10-27T15:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);

  await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    CARGA_GEN++; CARGA_ESTADO='ok'; if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
    window._saves=[];
    apiSave=function(r){ window._saves.push(JSON.parse(JSON.stringify(r))); return Promise.resolve({ok:true}); };
    apiList=function(){ return new Promise(function(res){ setTimeout(function(){ res({ok:true, pedidos:JSON.parse(JSON.stringify(STATE))}); },0); }); };
    window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(m)); return _t(m,k,ms); };
    window.T=function(o){
      var b={ turno:'', celular:'70000001', nit:'1', zona:'TIENDA', direccion:'SALIÓ DE TIENDA · Charcas', fecha:'', maps:'', observaciones:'', garantia:'',
              facturarA:'', estado:'', entregado:true, verificado:true, vehiculo:'', chofer:'', nroDia:0, fotos:[], vendedor:'Fernando Peinado',
              ts:Date.parse('2026-10-01T10:15:00-04:00'), rev:3 };
      var q={}; for(var k in b) q[k]=b[k]; for(var k2 in o) q[k2]=o[k2]; return q;
    };
    STATE=[
      T({ id:'T1', nota:'9174', oc:'10-901', cliente:'CLIENTE INVENTADO UNO', acuenta:1480, saldo:0, pagado:true, metodoPago:'Efectivo %IMG1',
          productos:[{desc:'COLCHON CONFORT PLUS', medida:'140x190', cant:1, precio:1480}] }),
      T({ id:'T2', nota:'9175', oc:'10-902', cliente:'CLIENTE INVENTADO DOS', acuenta:0, saldo:0, pagado:true, metodoPago:'~Efectivo 1590 @2026-10-01 #9175 %IMG2',
          productos:[{desc:'COLCHON CONFORT PLUS', medida:'160x190', cant:1, precio:1590}] }),
      T({ id:'T3', nota:'9176', oc:'10-903', cliente:'CLIENTE INVENTADO TRES', acuenta:0, saldo:0, pagado:true,
          metodoPago:textoCobros([{ anticipo:true, metodo:'Efectivo', monto:1000, fecha:'2026-10-01', nota:'9176' }, { anticipo:false, metodo:'QR', banco:'BNB', monto:670, fecha:'2026-10-05', nota:'9176' }]),
          productos:[{desc:'COLCHON CONFORT PLUS', medida:'180x200', cant:1, precio:1670}] })
    ];
    window.hb=function(t){ var d=new Date(Number(t)-4*3600000); return d.getUTCHours()+':'+('0'+d.getUTCMinutes()).slice(-2); };
  });
  const esperar = (ms) => page.waitForTimeout(ms);

  console.log('\n── 1. Al editar una venta de tienda, «Fecha de la venta» muestra el día en que cuenta ──');
  let r = await page.evaluate(() => { showView('form'); editPedido('T1'); var f=document.getElementById('f-fecha-venta');
    return { ve:!!(f && f.offsetParent), v:f&&f.value, max:f&&f.max, entrega:!!document.getElementById('f-fecha').offsetParent, conta:contaFecha(findById('T1')) }; });
  chk('el campo se ve en el recuadro de la venta de tienda (y la fecha de ENTREGA sigue escondida)', r.ve && !r.entrega, J(r));
  chk('muestra el día en que se cargó (1/10), que es con el que cuenta hoy', r.v==='2026-10-01' && r.conta==='2026-10-01', J(r));
  chk('no deja elegir después de hoy (max = 27/10)', r.max==='2026-10-27', r.max);

  console.log('\n── 2. Pasarla al 30/09: cuenta en septiembre, con la misma hora, y el pago sin fecha propia la sigue ──');
  dialogos.length=0;
  await page.evaluate(() => { window._saves=[]; document.getElementById('f-fecha-venta').value='2026-09-30'; submitPedido(); });
  await esperar(400);
  r = await page.evaluate(() => { var p=findById('T1'), a=anticipoDe(p), s=window._saves[window._saves.length-1];
    return { dia:isoDeTsBolivia(p.ts), hora:hb(p.ts), conta:contaFecha(p), pago:a&&a.fecha, monto:a&&a.monto, salio:s?isoDeTsBolivia(s.ts):'', tienda:esVentaTienda(p), fecha:p.fecha,
             mes:contaPagos(p).map(function(c){ return c.fecha||contaFecha(p); }) }; });
  chk('preguntó antes de cambiarla de mes («va a contar en septiembre… antes: octubre»)', dialogos.some(m=>/septiembre/.test(m) && /octubre/.test(m)), J(dialogos));
  chk('quedó del 30/09 a las 10:15, la misma hora en que se cargó', r.dia==='2026-09-30' && r.hora==='10:15', J(r));
  chk('Contabilidad la cuenta el 30/09 (contaFecha) y viajó así a la planilla', r.conta==='2026-09-30' && r.salio==='2026-09-30', J(r));
  chk('lo cobrado (A cuenta 1.480, pagado en el mostrador) ahora es del 30/09', r.pago==='2026-09-30' && r.monto===1480 && J(r.mes)===J(['2026-09-30']), J(r));
  chk('sigue siendo venta de tienda, sin fecha de entrega (no ocupa cupo)', r.tienda && r.fecha==='', J(r));

  console.log('\n── 3. Guardar sin tocar la fecha no la mueve; una fecha futura no se guarda; Cancelar la deja como estaba ──');
  dialogos.length=0;
  r = await page.evaluate(async () => { var ts0=findById('T1').ts; editPedido('T1'); var v=document.getElementById('f-fecha-venta').value;
    document.getElementById('f-obs').value='sin tocar la fecha'; submitPedido(); await new Promise(x=>setTimeout(x,400));
    return { v:v, igual:findById('T1').ts===ts0 }; });
  chk('al volver a abrirla dice 30/09 y guardar otra cosa no le cambia la hora', r.v==='2026-09-30' && r.igual, J(r));
  chk('…y no preguntó nada (no cambió de mes)', dialogos.length===0, J(dialogos));
  r = await page.evaluate(async () => { var ts0=findById('T1').ts; window._toasts=[]; editPedido('T1'); document.getElementById('f-fecha-venta').value='2026-10-28';
    submitPedido(); await new Promise(x=>setTimeout(x,300)); return { igual:findById('T1').ts===ts0, t:window._toasts.join(' | '), err:document.getElementById('f-fecha-venta').classList.contains('err') }; });
  chk('una fecha después de hoy no se guarda y lo dice', r.igual && /después de hoy/.test(r.t) && r.err, J(r));
  rechazar=true; dialogos.length=0;
  r = await page.evaluate(async () => { var ts0=findById('T1').ts; showView('form'); editPedido('T1'); document.getElementById('f-fecha-venta').value='2026-10-02';
    submitPedido(); await new Promise(x=>setTimeout(x,300)); return { igual:findById('T1').ts===ts0 }; });
  chk('si a la pregunta dice Cancelar, queda como estaba', r.igual && dialogos.length===1, J([r, dialogos]));

  console.log('\n── 4. Los pagos registrados: los del día viejo van con la venta; los de otro día quedan en su día, y la pregunta lo avisa ──');
  dialogos.length=0;
  r = await page.evaluate(async () => { showView('form'); editPedido('T2'); document.getElementById('f-fecha-venta').value='2026-09-30';
    submitPedido(); await new Promise(x=>setTimeout(x,400)); var p=findById('T2');
    return { conta:contaFecha(p), pagos:contaPagos(p).map(function(c){ return [c.fecha, c.monto, limpiaNota(c.nota)]; }), pagado:p.pagado }; });
  chk('la venta cuenta el 30/09 y el pago registrado el 1/10 (el día que se cargó) pasa al 30/09, con su monto y su recibo', r.conta==='2026-09-30' && J(r.pagos)===J([['2026-09-30',1590,'9175']]) && r.pagado, J(r));
  chk('…y la pregunta no habla de pagos que quedan atrás (no hay)', dialogos.length===1 && !/otra fecha/.test(dialogos[0]), J(dialogos));
  dialogos.length=0;
  r = await page.evaluate(async () => { showView('form'); editPedido('T3'); document.getElementById('f-fecha-venta').value='2026-09-30';
    submitPedido(); await new Promise(x=>setTimeout(x,400)); var p=findById('T3');
    return { conta:contaFecha(p), pagos:contaPagos(p).map(function(c){ return [c.fecha, c.monto]; }).sort(), pagado:p.pagado, saldo:p.saldo }; });
  chk('dos pagos: el del 1/10 pasa al 30/09 y el QR del 5/10 queda el 5/10; la venta sigue pagada', J(r.pagos)===J([['2026-09-30',1000],['2026-10-05',670]]) && r.pagado && r.saldo===0, J(r));
  chk('la pregunta avisa que un pago tiene otra fecha y dónde se corrige', dialogos.some(m=>/otra fecha/.test(m) && /Corregir este pago/.test(m)), J(dialogos));

  console.log('\n── 5. Una venta de tienda NUEVA arranca con hoy; un pedido con entrega no muestra el campo ──');
  r = await page.evaluate(() => { abrirVentaTienda(); var f=document.getElementById('f-fecha-venta'); var o={ v:f.value, ve:!!f.offsetParent };
    cancelarVentaTienda(); showView('form'); o.pedido=!!document.getElementById('f-fecha-venta').offsetParent; return o; });
  chk('venta de tienda nueva: la fecha de la venta es hoy (27/10)', r.v==='2026-10-27' && r.ve, J(r));
  chk('en un pedido con entrega el campo no aparece', !r.pedido, J(r));

  chk('sin errores JS', errores.length===0, errores.join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
