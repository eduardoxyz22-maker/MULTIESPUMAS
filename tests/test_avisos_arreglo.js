/* 📣 CADA AVISO DE CONTABILIDAD TRAE SU ARREGLO DE UN TOQUE (plan del jueves 05/11, item 92; §4mr, §4mt, §4ms)
   La IA dejó 66 avisos (26 y 31/10): quedaban 52 abiertos (35 solo de fecha, 17 de plata), y de 14 «Ya lo corregí» en 13 el pago quedó igual.

   LO QUE CUIDA:
   1. Lo que NO es un error no se avisa ni va al texto del grupo: el primer pago de una venta a domicilio con la foto de ANTES de cargar
      la venta (§4mt) y el voucher de tarjeta que Claude no tomó por comprobante (E3). El aviso nuevo guarda sus fotos y su arreglo.
   2. Cada aviso trae su botón: «✂️ Partir en QR X + efectivo Y», «✏️ Corregir a N», «🏦 Cambiar a QR <banco>», «📅 Poner la fecha de la
      foto», «📅 Pasar la venta al…» (tienda) — y Contabilidad los tiene en la revisión.
   3. Partir arma el pago mixto de siempre (adelanto + efectivo, mismo día y recibo): el total y el saldo no cambian, «A cuenta» tampoco.
      Corregir el monto: lo sacado vuelve a «falta cobrar», el total no cambia. Banco y fecha: solo eso. Todo con `aplicarCobros`. El aviso
      se cierra con quién lo hizo y qué arregló.
   4. «📅 Pasar las N ventas de tienda al día de su foto» de una vez (§4nm: la misma hora, los pagos del día de la carga van con ella).
   5. «✓ Ya lo corregí» mira el pago: si ya coincide, cierra; si quedó igual, pide la razón (otra venta / el resto en efectivo / otra) y la
      razón le llega a Contabilidad.
   6. Con una lectura buena, los abiertos que ya coinciden (o que no son errores) se cierran solos (en Playwright solo con la bandera).
   Reloj CLAVADO (jueves 05/11/2026, 10:00 de Bolivia). Servidor de mentira; datos inventados.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_avisos_arreglo.js */
const { chromium } = require('playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async()=>{
  const browser = await chromium.launch();
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1400, height:1000 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message));
  const dialogos=[]; page.on('dialog', d => { dialogos.push(d.message()); d.accept(); });
  await page.clock.setFixedTime(new Date('2026-11-05T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };

  const r0 = await ev(async () => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    SERVER_VER='2026-10-26-b';
    var T=function(d){ return new Date(d+'T11:00:00-04:00').getTime(); };
    var V=function(id, vend, cli, o){ var b={ id:id, oc:'11-'+id, nota:'5'+id.replace(/\D/g,'').padStart(3,'0'), cliente:cli, celular:'70000001', fecha:'2026-11-10', turno:'AM', zona:'Norte',
      direccion:'Calle Inventada 1', vendedor:vend, productos:[{ desc:'COLCHON SOFT', medida:'140x190', cant:1, precio:2000 }], saldo:0, acuenta:0, pagado:true, ts:T('2026-11-03'), rev:1 };
      for(var k in o) b[k]=o[k]; return b; };
    var C=function(L){ return textoCobros(L); };
    STATE=[
      V('a1', 'Carola Chavez', 'ANA MIXTO', { saldo:1000, acuenta:990, pagado:false, ts:T('2026-11-02'),
        metodoPago:C([{ anticipo:true, metodo:'QR', banco:'BISA', monto:990, fecha:'2026-11-02', nota:'5001', comps:['m1','m2'] }]) }),
      V('a2', 'Carola Chavez', 'BETO MENOS', { saldo:0, acuenta:500, pagado:true, ts:T('2026-11-01'),
        metodoPago:C([{ anticipo:true, metodo:'Efectivo', monto:500, fecha:'2026-11-01', nota:'5002', comps:['r2'] }, { metodo:'QR', banco:'BISA', monto:1250, fecha:'2026-11-03', nota:'6002', comps:['q2'] }]) }),
      V('a3', 'Carola Chavez', 'CARLA BANCO', { ts:T('2026-11-01'),
        metodoPago:C([{ anticipo:true, metodo:'Efectivo', monto:1200, fecha:'2026-11-01', nota:'5003', comps:['r3'] }, { metodo:'QR', banco:'BISA', monto:800, fecha:'2026-11-03', nota:'6003', comps:['b3'] }]) }),
      V('a4', 'Carola Chavez', 'DANI DIA', { ts:T('2026-11-01'),
        metodoPago:C([{ anticipo:true, metodo:'Efectivo', monto:1300, fecha:'2026-11-01', nota:'5004', comps:['r4'] }, { metodo:'QR', banco:'BISA', monto:700, fecha:'2026-11-04', nota:'6004', comps:['d4'] }]) }),
      V('a5', 'Fernando Peinado', 'ELSA TIENDA', { fecha:'', turno:'', zona:'TIENDA', direccion:'SALIÓ DE TIENDA · Charcas', entregado:true, ts:T('2026-11-03'),
        metodoPago:C([{ anticipo:true, metodo:'QR', banco:'Económico', monto:2000, fecha:'2026-11-03', nota:'5005', comps:['t5'] }]) }),
      V('a6', 'Fernando Peinado', 'FABI TIENDA', { fecha:'', turno:'', zona:'TIENDA', direccion:'SALIÓ DE TIENDA · Charcas', entregado:true, ts:T('2026-11-03'),
        metodoPago:C([{ anticipo:true, metodo:'QR', banco:'Económico', monto:2000, fecha:'2026-11-03', nota:'5006', comps:['t6'] }]) }),
      V('a7', 'Carola Chavez', 'GABI ANTES', { ts:T('2026-11-03'),
        metodoPago:C([{ anticipo:true, metodo:'QR', banco:'BISA', monto:2000, fecha:'2026-11-03', nota:'5007', comps:['g7'] }]) }),
      V('a8', 'Carola Chavez', 'HUGO VOUCHER', { ts:T('2026-11-03'),
        metodoPago:C([{ anticipo:true, metodo:'Tarjeta', monto:2000, fecha:'2026-11-03', nota:'5008', comps:['v8'] }]) }),
      V('a9', 'Carola Chavez', 'IVAN IGUAL', { ts:T('2026-11-01'),
        metodoPago:C([{ anticipo:true, metodo:'Efectivo', monto:1000, fecha:'2026-11-01', nota:'5009', comps:['r9'] }, { metodo:'QR', banco:'BISA', monto:1000, fecha:'2026-11-03', nota:'6009', comps:['i9'] }]) }),
      V('a10', 'Carola Chavez', 'JUAN YACORREGIDO', { ts:T('2026-11-01'),
        metodoPago:C([{ anticipo:true, metodo:'Efectivo', monto:860, fecha:'2026-11-01', nota:'5010', comps:['r10'] }, { metodo:'QR', banco:'BISA', monto:1140, fecha:'2026-11-03', nota:'6010', comps:['c10'] }]) })
    ];
    var Q=function(o){ return Object.assign({ cp:true, le:true, m:0, mo:'BOB', f:'', h:'', bo:'', bd:'Banco BISA S.A.', de:'', or:'', ref:'', ti:'qr', no:'', t:1, md:'x', pv:2 }, o); };
    window.__S={ llamadas:[], lee:{
      m1:Q({ m:390, f:'2026-11-02', ref:'M1000001' }), m2:Q({ cp:false, nv:1, nt:990, ne:600, nq:390, nj:0, nr:0, m:990, f:'2026-11-02', no:'nota de venta' }),
      q2:Q({ m:1140, f:'2026-11-03', ref:'Q2000002' }), b3:Q({ m:800, bd:'Banco Ganadero', f:'2026-11-03', ref:'B3000003' }),
      d4:Q({ m:700, f:'2026-11-01', ref:'D4000004' }), t5:Q({ m:2000, bd:'Banco Económico', f:'2026-11-01', ref:'T5000005' }),
      t6:Q({ m:2000, bd:'Banco Económico', f:'2026-10-31', ref:'T6000006' }), g7:Q({ m:2000, f:'2026-11-01', ref:'G7000007' }),
      v8:Q({ cp:false, m:0, no:'nota de venta con un voucher pegado' }), i9:Q({ m:900, f:'2026-11-03', ref:'I9000009' }),
      c10:Q({ m:1140, f:'2026-11-03', ref:'C1000010' }) } };
    apiPost=function(b){
      b=JSON.parse(JSON.stringify(b)); __S.llamadas.push(b);
      if(b.action!=='iaComprobantes') return Promise.resolve({ ok:true });
      var res={}; (b.fotos||[]).forEach(function(f){ if(__S.lee[f]) res[f]=__S.lee[f]; });
      return Promise.resolve({ ok:true, version:'2026-10-26-b', res:res, faltan:[], pendientes:[], leidas:0, usd:0, dia:{ d:'2026-11-05', n:0, usd:0 }, estado:'' });
    };
    window._saves=[];
    apiSave=function(r){ var g=JSON.parse(JSON.stringify(r)); window._saves.push(g); return Promise.resolve({ ok:true, pedido:g }); };
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
    window._esp=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
    window._av=function(cli){ return ctaAvLeer().filter(function(a){ return a.cli===cli || String(a.cli).indexOf(cli)===0; })[0]||null; };
    window._fila=function(cli){ return [].filter.call(document.querySelectorAll('.ctav-it'), function(e){ return e.querySelector('b') && e.querySelector('b').textContent.indexOf(cli)===0; })[0]||null; };
    window._btns=function(cli){ var e=_fila(cli); return e ? [].map.call(e.querySelectorAll('.ctav-fix'), function(b){ return b.textContent; }) : null; };
    window._toc=async function(cli, re){ var e=_fila(cli); var b=e && [].filter.call(e.querySelectorAll('button'), function(x){ return re.test(x.textContent); })[0]; if(!b) return false; b.click(); await _esp(250); return true; };
    window._pagos=function(id){ var p=findById(id); return contaPagos(p).map(function(c){ return (c.anticipo?'~':'')+c.metodo+(c.banco?(' '+c.banco):'')+' '+c.monto+' @'+c.fecha+' #'+limpiaNota(c.nota)+(c.recibio?(' >'+c.recibio):'')+' ['+compsArr(c.comps!=null?c.comps:c.comp).join(',')+']'; }); };
    showView('conta'); await _esp(150); var s=document.getElementById('cta-vendedor'); if(s) s.value='';
    return STATE.length;
  });
  chk('0. arma el panel de prueba', r0===10, r0);

  /* 1 · lo que se avisa (y lo que no) */
  const r1 = await ev(async () => {
    IAC.mes='2026-11'; IAC.shVend=''; Object.keys(__S.lee).forEach(function(f){ IAC.res[f]=__S.lee[f]; });
    var txt=iacTextoGrupo('2026-11', '');
    await iacAvisarPanel(); await _esp(100);
    var L=ctaAvLeer();
    return { n:L.length, clis:L.map(function(a){ return a.cli; }).sort(), txt:txt,
      a1:(function(a){ return a && { fs:a.fs, fx:a.fx }; })(_av('ANA MIXTO')), a2:(_av('BETO MENOS')||{}).fx };
  });
  chk('1a. no se avisa el pago de antes de cargar la venta (GABI) ni el voucher de tarjeta (HUGO) ni lo que coincide (JUAN); sí los otros 7', r1.n===7 && r1.clis.indexOf('GABI ANTES')<0 && r1.clis.indexOf('JUAN YACORREGIDO')<0 && r1.clis.indexOf('HUGO VOUCHER')<0 &&
    ['ANA MIXTO','BETO MENOS','CARLA BANCO','DANI DIA','ELSA TIENDA','FABI TIENDA','IVAN IGUAL'].every(function(c){ return r1.clis.indexOf(c)>=0; }), r1.clis);
  chk('1b. …y tampoco van al texto para el grupo', !/GABI ANTES/.test(r1.txt) && !/HUGO VOUCHER/.test(r1.txt) && /ANA MIXTO/.test(r1.txt), r1.txt.slice(0, 300));
  chk('1c. el aviso guarda sus fotos y su arreglo', r1.a1 && JSON.stringify(r1.a1.fs)==='["m1","m2"]' && JSON.stringify(r1.a1.fx)==='[{"k":"partir","a":390,"e":600}]' &&
    JSON.stringify(r1.a2)==='[{"k":"partir","a":1140,"e":110},{"k":"monto","v":1140}]', r1);

  /* 2 · los botones */
  const r2 = await ev(async () => {
    ctaAvVer('Carola Chavez'); await _esp(150);
    return { a1:_btns('ANA MIXTO'), a2:_btns('BETO MENOS'), a3:_btns('CARLA BANCO'), a4:_btns('DANI DIA'), a9:_btns('IVAN IGUAL'), corregi:!!(_fila('ANA MIXTO')||{ querySelector:function(){} }).querySelector('.ah-go-p') };
  });
  chk('2a. la nota de venta dice efectivo: «✂️ Partir en QR BISA 390 + efectivo 600»', JSON.stringify(r2.a1)==='["✂️ Partir en QR BISA 390 + efectivo 600"]', r2.a1);
  chk('2b. la foto dice menos: «Partir en QR BISA 1.140 + efectivo 110» y «Corregir a 1.140»', JSON.stringify(r2.a2)==='["✂️ Partir en QR BISA 1.140 + efectivo 110","✏️ Corregir a 1.140"]', r2.a2);
  chk('2c. otro banco: «🏦 Cambiar a QR Ganadero»; otra fecha: «📅 Poner la fecha de la foto (01/11)»', JSON.stringify(r2.a3)==='["🏦 Cambiar a QR Ganadero"]' && JSON.stringify(r2.a4)==='["📅 Poner la fecha de la foto (01/11)"]', r2);

  /* 3 · partir (el adelanto): pago mixto, el total y el saldo no cambian */
  dialogos.length=0;
  const r3 = await ev(async () => {
    var p=findById('a1'), t0=ventaTotal(p), s0=p.saldo, a0=p.acuenta;
    var ok=await _toc('ANA MIXTO', /Partir/); await _esp(250);
    p=findById('a1'); var a=_av('ANA MIXTO');
    return { ok:ok, pagos:_pagos('a1'), t0:t0, t1:ventaTotal(p), s0:s0, s1:p.saldo, a0:a0, a1:p.acuenta, mixto:!!mixtoDe(p), cerrado:!!(a && a.ok), okPor:a && a.okPor, okArr:a && a.okArr, fila:!!_fila('ANA MIXTO') };
  });
  chk('3a. preguntó antes («Partir el pago de Bs 990,00 QR BISA…»)', dialogos.some(m=>/Partir el pago de Bs 990,00 QR BISA/.test(m) && /no cambian/.test(m)), dialogos);
  chk('3b. quedó QR 390 (con su captura) + efectivo 600 (con la nota de venta), mismo día y recibo: el pago mixto', JSON.stringify(r3.pagos)===JSON.stringify(['~QR BISA 390 @2026-11-02 #5001 [m1]','Efectivo 600 @2026-11-02 #5001 [m2]']) && r3.mixto, r3.pagos);
  chk('3c. el total, el saldo y «A cuenta» no cambian', r3.t0===r3.t1 && r3.s0===r3.s1 && r3.a0===990 && r3.a1===990, r3);
  chk('3d. el aviso se cerró con quién lo hizo y qué arregló, y sale de la lista', r3.cerrado && r3.okPor==='Carola Chavez' && /partir en QR BISA 390/.test(r3.okArr||'') && !r3.fila, r3);

  /* 4 · corregir el monto, el banco y la fecha */
  dialogos.length=0;
  const r4 = await ev(async () => {
    var o={}, p=findById('a2'), t0=ventaTotal(p);
    await _toc('BETO MENOS', /Corregir a/); await _esp(250);
    p=findById('a2'); o.p2=_pagos('a2'); o.t=[t0, ventaTotal(p)]; o.saldo=p.saldo; o.pagado=p.pagado; o.c2=!!(_av('BETO MENOS')||{}).ok;
    await _toc('CARLA BANCO', /Cambiar a QR/); await _esp(250); o.p3=_pagos('a3'); o.c3=!!(_av('CARLA BANCO')||{}).ok;
    await _toc('DANI DIA', /fecha de la foto/); await _esp(250); o.p4=_pagos('a4'); o.c4=!!(_av('DANI DIA')||{}).ok;
    o.abierta=document.querySelector('#modal.on .ctav-sub') ? true : false;
    return o;
  });
  chk('4a. «Corregir a 1.140»: el pago queda 1.140, los 110 vuelven a «falta cobrar» y el total no cambia', JSON.stringify(r4.p2[1])===JSON.stringify('QR BISA 1140 @2026-11-03 #6002 [q2]') &&
    r4.t[0]===r4.t[1] && r4.saldo===110 && r4.pagado===false && r4.c2 && dialogos.some(m=>/vuelven a «falta cobrar»/.test(m)), { r4, dialogos });
  chk('4b. «Cambiar a QR Ganadero»: solo el banco', r4.p3[1]==='QR Ganadero 800 @2026-11-03 #6003 [b3]' && r4.c3, r4.p3);
  chk('4c. «Poner la fecha de la foto»: el pago pasa al 01/11', r4.p4[1]==='QR BISA 700 @2026-11-01 #6004 [d4]' && r4.c4, r4.p4);
  chk('4d. la lista de avisos sigue abierta (no salta a la ficha)', r4.abierta, r4);

  /* 5 · las ventas de tienda de una vez */
  dialogos.length=0;
  const r5 = await ev(async () => {
    ctaAvVer('Fernando Peinado'); await _esp(150);
    var b=document.querySelector('#ctav-todas button'), txt=b ? b.textContent : '';
    if(b) b.click(); await _esp(350);
    var p5=findById('a5'), p6=findById('a6');
    return { txt:txt, d5:contaFecha(p5), d6:contaFecha(p6), h5:new Date(p5.ts-4*3600000).getUTCHours(), pg5:_pagos('a5'), pg6:_pagos('a6'),
      c5:!!(_av('ELSA TIENDA')||{}).ok, c6:!!(_av('FABI TIENDA')||{}).ok, tienda:esVentaTienda(p5) && p5.fecha==='' };
  });
  chk('5a. «📅 Pasar las 2 al día de su foto», con la lista de lo que cambia', /Pasar las 2 al día de su foto/.test(r5.txt) && dialogos.some(m=>/ELSA TIENDA · nota 5005: 03\/11 → 01\/11/.test(m) && /FABI TIENDA · nota 5006: 03\/11 → 31\/10/.test(m)), { r5, dialogos });
  chk('5b. cada una cuenta el día de su foto, con la misma hora, y su pago del día de la carga va con ella', r5.d5==='2026-11-01' && r5.d6==='2026-10-31' && r5.h5===11 &&
    r5.pg5[0]==='~QR Económico 2000 @2026-11-01 #5005 [t5]' && r5.pg6[0]==='~QR Económico 2000 @2026-10-31 #5006 [t6]' && r5.tienda, r5);
  chk('5c. los dos avisos quedaron cerrados', r5.c5 && r5.c6, r5);

  /* 6 · «Ya lo corregí» mira el pago */
  const r6 = await ev(async () => {
    var o={};
    ctaAvVer('Carola Chavez'); await _esp(150);
    await _toc('IVAN IGUAL', /Ya lo corregí/); await _esp(150);
    var f=_fila('IVAN IGUAL'); o.pide=!!(f && f.querySelector('.ctav-raz')); o.razTxt=f ? (f.querySelector('.ctav-raz')||{}).textContent : ''; o.sigue=!(_av('IVAN IGUAL')||{}).ok;
    var inp=f && f.querySelector('.ctav-raz-o input'); if(inp) inp.value='';
    await _toc('IVAN IGUAL', /^Guardar$/); await _esp(150); o.sinTexto=!(_av('IVAN IGUAL')||{}).ok;
    await _toc('IVAN IGUAL', /Es de otra venta/); await _esp(250);
    var a=_av('IVAN IGUAL'); o.cerrado=!!(a && a.ok); o.raz=a && a.okRaz; o.html=a ? ctaAvCerradoHtml(a).replace(/<[^>]+>/g,'') : '';
    return o;
  });
  chk('6a. el pago quedó igual (la foto dice 900): «Ya lo corregí» no cierra y pide la razón', r6.pide && r6.sigue && /quedó igual/.test(r6.razTxt) && /otra venta/.test(r6.razTxt) && /efectivo/.test(r6.razTxt), r6);
  chk('6b. «Otra razón» sin escribir nada no cierra', r6.sinTexto, r6);
  chk('6c. con «Es de otra venta» se cierra y Contabilidad lo ve («dice que quedó igual: «Es de otra venta»»)', r6.cerrado && r6.raz==='Es de otra venta' && /quedó igual.*«Es de otra venta»/.test(r6.html), r6);
  const r6d = await ev(async () => {
    STATE.push({ id:'a12', oc:'11-a12', nota:'5012', cliente:'LUIS OTRAFOTO', celular:'7', fecha:'2026-11-10', turno:'AM', zona:'Norte', vendedor:'Carola Chavez',
      productos:[{ desc:'COLCHON', cant:1, precio:1000 }], saldo:0, acuenta:0, pagado:true, ts:new Date('2026-11-01T11:00:00-04:00').getTime(), rev:1,
      metodoPago:textoCobros([{ anticipo:true, metodo:'Efectivo', monto:100, fecha:'2026-11-01', nota:'5012', comps:['r12'] }, { metodo:'QR', banco:'BISA', monto:900, fecha:'2026-11-03', nota:'6012', comps:['n13'] }]) });
    await ctaAvGuardar([{ id:'o12', k:'a12|2026-11-03|900|QR BISA', pid:'a12', vend:'Carola Chavez', cli:'LUIS OTRAFOTO', nota:'5012', f:'2026-11-03', m:900, met:'QR BISA', txt:'la foto no se lee', mes:'2026-11', t:Date.now()-86400000, por:'Contabilidad', fs:['n12'], ks:['nl'] }]);
    await ctaAvCorregi('o12', 'Carola Chavez'); await _esp(200);
    var a=ctaAvLeer().filter(function(o){ return o.id==='o12'; })[0]||{}; closeModal(); return { ok:!!a.ok, raz:a.okRaz||'' };
  });
  chk('6d. le subieron OTRA foto al pago (todavía sin leer): «Ya lo corregí» cierra sin pedir razón', r6d.ok && !r6d.raz, r6d);

  /* 7 · los que ya coinciden o no son errores se cierran solos */
  const r7 = await ev(async () => {
    var o={}, t=Date.now()-86400000;
    var A=function(id, pid, cli, f, m, met, extra){ return Object.assign({ id:id, k:pid+'|'+f+'|'+m+'|'+met, pid:pid, vend:'Carola Chavez', cli:cli, nota:'', f:f, m:m, met:met, txt:'aviso viejo', mes:'2026-11', t:t, por:'Contabilidad' }, extra||{}); };
    var viejos=[ A('o7', 'a7', 'GABI ANTES', '2026-11-03', 2000, 'QR BISA', { ks:['dia'] }),
                 A('o8', 'a8', 'HUGO VOUCHER', '2026-11-03', 2000, 'Tarjeta', { ks:['nl'] }),
                 A('o10', 'a10', 'JUAN YACORREGIDO', '2026-11-03', 1250, 'QR BISA', { fs:['c10'], ks:['menos'] }),
                 A('o11', 'a10', 'JUAN SIN SABER', '2026-11-03', 1140, 'QR BISA', { fs:['c10'], ks:['menos'] }) ];
    await ctaAvGuardar(viejos); await _esp(80);
    IAC.res={}; CTA_AV_LEE.pedidas={};   // la lectura llega del servidor con `leer:1`
    CTA_AV_AUTO.t=0; o.sinBandera=await ctaAvAutoRevisar();
    window.CTA_AV_AUTO_PRUEBA=1; CTA_AV_AUTO.t=0; __S.llamadas=[];
    o.n=await ctaAvAutoRevisar(); await _esp(80);
    o.leer=__S.llamadas.filter(function(b){ return b.action==='iaComprobantes'; }).map(function(b){ return !!b.leer; });
    var g=function(id){ return ctaAvLeer().filter(function(a){ return a.id===id; })[0]||{}; };
    o.o7=g('o7').au; o.o8=g('o8').au; o.o10=g('o10').au; o.o11=!!g('o11').ok;
    CTA_AV_AUTO.t=Date.now(); o.otraVez=await ctaAvAutoRevisar();
    o.html=ctaAvCerradoHtml(g('o10')).replace(/<[^>]+>/g,'');
    window.CTA_AV_AUTO_PRUEBA=0; return o;
  });
  chk('7a. en Playwright sin la bandera no hace nada', r7.sinBandera===0, r7);
  chk('7b. con la bandera: trae lo leído sin gastar (`leer:1`) y cierra el pago de antes de cargar, el voucher y el que ya coincide', r7.leer.length>=1 && r7.leer.every(Boolean) &&
    r7.o7==='no_error' && r7.o8==='no_error' && r7.o10==='coincide' && r7.o11 && r7.n===4, r7);
  chk('7c. Contabilidad ve «🤖 Se cerró solo…: ya coincide con la foto», y no vuelve a mirar en los 10 minutos siguientes', /Se cerró solo el .*ya coincide con la foto/.test(r7.html) && r7.otraVez===0, r7);

  /* 8 · Contabilidad: los mismos arreglos en la revisión de las fotos */
  const r8 = await ev(async () => {
    Object.keys(__S.lee).forEach(function(f){ IAC.res[f]=__S.lee[f]; });
    STATE.push({ id:'a11', oc:'11-a11', nota:'5011', cliente:'KARI CONTA', celular:'7', fecha:'2026-11-10', turno:'AM', zona:'Norte', vendedor:'Carola Chavez',
      productos:[{ desc:'COLCHON', cant:1, precio:1000 }], saldo:0, acuenta:0, pagado:true, ts:new Date('2026-11-01T11:00:00-04:00').getTime(), rev:1,
      metodoPago:textoCobros([{ anticipo:true, metodo:'Efectivo', monto:100, fecha:'2026-11-01', nota:'5011', comps:['r11'] }, { metodo:'QR', banco:'BISA', monto:900, fecha:'2026-11-04', nota:'6011', comps:['k11'] }]) });
    IAC.res.k11={ cp:true, le:true, m:900, mo:'BOB', f:'2026-11-04', bd:'Banco Ganadero', t:1, pv:2 }; __S.lee.k11=IAC.res.k11;
    closeModal(); iacAbrir('2026-11'); await _esp(200);
    var it=[].filter.call(document.querySelectorAll('#iac-cuerpo .iac-it'), function(e){ return /KARI CONTA/.test(e.textContent); })[0];
    var b=it ? [].map.call(it.querySelectorAll('.ctav-fix'), function(x){ return x.textContent; }) : [];
    var bt=it && it.querySelector('.ctav-fix'); if(bt) bt.click(); await _esp(250);
    var o={ b:b, p:_pagos('a11'), abierta:!!document.getElementById('iac-cuerpo') }; closeModal(); return o;
  });
  chk('8. en la revisión con IA, Contabilidad tiene «🏦 Cambiar a QR Ganadero» y lo arregla sin salir de la ventana', JSON.stringify(r8.b)==='["🏦 Cambiar a QR Ganadero"]' && r8.p[1]==='QR Ganadero 900 @2026-11-04 #6011 [k11]' && r8.abierta, r8);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
