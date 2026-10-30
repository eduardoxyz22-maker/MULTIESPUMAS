/* 🔎 EL COMPROBANTE SE LEE AL SUBIRLO (propuesta 78, 30/10; el dueño la eligió).
   En octubre la revisión con IA del 26/10 encontró 13 errores de plata (3 «QR + efectivo» anotados todo QR, una foto de Bs 10 para un
   pago de 1.310, el mismo comprobante de 990 en dos ventas, 6 montos), vistos de 1 a 25 días tarde; y 35 avisos eran SOLO de fecha y le
   salían en ROJO a la vendedora.

   LO QUE CUIDA:
   1. Apagado en Playwright salvo `window.IAC_SUBIR_PRUEBA` (no molesta a las pruebas de siempre).
   2. Pedido nuevo: apenas sube la foto pide UNA lectura de ESA foto (`iaComprobantes`, `fotos:[id]`, sin `leer`), muestra «Leyendo…» y
      después, si no coincide, el aviso de una línea: «La foto dice Bs 1.140 y anotaste 1.250: ¿los Bs 110 fueron en efectivo?» con
      «💵 Agregar efectivo» (el 2° método del pago mixto) y «Corregir a 1.140» (lo que se saca del A cuenta pasa al saldo).
   3. La nota de venta dice QR + efectivo → «Agregar efectivo» arma el pago mixto con el efectivo y le pasa la foto del recibo; se guarda
      QR 1.140 + efectivo 110.
   4. El mismo comprobante (mismo N°, con o sin guiones) en otra venta → «Esta foto ya está en la venta 10-050». Lo ya leído de las otras
      fotos sale con `leer:1` (sin gastar).
   5. Venta de tienda con la foto de otro día → «La foto es del 14/10: ¿la venta fue ese día? [Sí]», que llena «Fecha de la venta».
   6. El efectivo no se lee. Servidor anterior a 26-a, tope del día: no se muestra nada (y con el tope no se vuelve a pedir enseguida).
   7. NUNCA frena: se guarda mientras lee, y no pasa nada.
   8. Contabilidad, «Registrar pago»: la foto dice menos → «Corregir a 2.000» (sin «Agregar efectivo»).
   9. «Para hacer»: los avisos de Contabilidad que son SOLO de fecha van en ámbar (📅), aparte; los de plata siguen en rojo (📣).

   Reloj CLAVADO (viernes 30/10/2026, 10:00 de Bolivia). Servidor de mentira; datos inventados.
   Se corre:  node tests/test_comprobante_al_subir.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1300, height:950 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await ctx.route(/^https?:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-30T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };

  const r0 = await ev(async () => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    SERVER_VER='2026-10-26-b';
    try{ IAS_JUNTA_MS=20; IAS_ESPERA_MS=30; }catch(e){}
    var ts=new Date('2026-10-20T11:00:00-04:00').getTime();
    STATE=[
      /* una venta de otra vendedora con un QR de 990 ya leído (su N° de comprobante) */
      { id:'v1', oc:'10-050', nota:'5050', cliente:'OTRA CLIENTA INVENTADA', celular:'70000050', fecha:'2026-10-22', turno:'AM', zona:'Norte', vendedor:'Mirian Salazar',
        productos:[{ desc:'COLCHON SOFT', medida:'140x190', cant:1, precio:990 }], saldo:0, acuenta:990, pagado:true, ts:ts,
        metodoPago:textoCobros([{ anticipo:true, metodo:'QR', banco:'BISA', monto:990, fecha:'2026-10-20', nota:'5050', comps:['g990'] }]) },
      /* una venta con saldo, para «Registrar pago» en Contabilidad */
      { id:'c1', oc:'10-060', nota:'5060', cliente:'CLIENTE SALDO INVENTADO', celular:'70000060', fecha:'2026-11-03', turno:'AM', zona:'Norte', vendedor:'Carola Chavez',
        productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', cant:1, precio:3400 }], saldo:2400, acuenta:1000, pagado:false, ts:ts,
        metodoPago:textoCobros([{ anticipo:true, metodo:'Efectivo', monto:1000, fecha:'2026-10-20', nota:'5060', comps:['rc1'] }]) }
    ];
    var norm=function(o){ return o.err ? { err:o.err, t:1 } : Object.assign({ cp:true, le:true, m:0, mo:'BOB', f:'', h:'', bo:'', bd:'', de:'', or:'', ref:'', ti:'qr', no:'', t:1, md:'x', pv:2 }, o); };
    var S=window.__S={ llamadas:[], guardado:{ g990:norm({ m:990, bd:'Banco BISA S.A.', f:'2026-10-20', ref:'TRX990990' }) }, modo:'ok', demora:0,
      lee:{
        q1:{ m:1140, bd:'BISA', f:'2026-10-30', ref:'Q1000001' },
        r1:{ cp:false, nv:1, nt:1250, ne:110, nq:1140, f:'2026-10-30', no:'nota de venta' },
        q2:{ m:1140, bd:'BISA', f:'2026-10-30', ref:'Q2000002' },
        q3:{ m:990, bd:'BISA', f:'2026-10-30', ref:'TRX-990-990' },
        t1:{ m:990, bd:'BISA', f:'2026-10-14', ref:'T1000001' },
        e1:{ m:500, bd:'', f:'2026-10-30' },
        q6:{ m:1140, bd:'BISA', f:'2026-10-30' }, q7:{ m:1140, bd:'BISA', f:'2026-10-30' }, q8:{ m:1140, bd:'BISA', f:'2026-10-30' },
        q9:{ m:700, bd:'BISA', f:'2026-10-30', ref:'Q9000009' },
        c9:{ m:2000, bd:'BISA', f:'2026-10-30', ref:'C9000009' }
      } };
    window.__norm=norm;
    apiPost=function(b){
      b=JSON.parse(JSON.stringify(b)); S.llamadas.push(b);
      if(b.action!=='iaComprobantes') return Promise.resolve({ ok:true });
      var res={}, faltan=[];
      (b.fotos||[]).forEach(function(f){ if(S.guardado[f]) res[f]=S.guardado[f]; else faltan.push(f); });
      var r={ ok:true, version:'2026-10-26-b', res:res, faltan:faltan, pendientes:[], leidas:0, usd:0, dia:{ d:'2026-10-30', n:0, usd:0 }, estado:'' };
      if(b.leer) return Promise.resolve(r);
      if(S.modo!=='ok'){ r.estado=S.modo; r.pendientes=faltan; return Promise.resolve(r); }
      faltan.forEach(function(f){ var o=norm(S.lee[f] || { err:'no_existe' }); S.guardado[f]=o; res[f]=o; r.leidas++; });
      return new Promise(function(ok){ setTimeout(function(){ ok(r); }, S.demora); });
    };
    window._pl=[];
    apiSave=function(r){ var g=JSON.parse(JSON.stringify(r)); window._pl=window._pl.filter(function(p){ return p.id!==g.id; }).concat([g]); return Promise.resolve({ ok:true, pedido:g }); };
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
    /* la subida a Drive, de mentira: el id que diga la prueba */
    fotoCronometro=function(){ return Promise.resolve('data:image/png;base64,xx'); };
    subirFoto=function(){ return Promise.resolve({ ok:true, fotoId:(window._ids||[]).shift()||'x' }); };
    window._esp=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
    window._subir=async function(id, donde){
      window._ids=[id];
      if(donde==='cta'){ COMP_DESTINO=null; await onCompElegido({ target:{ files:[{}], dataset:{ pedido:'c1' } } }); }
      else { COMP_DESTINO=(donde==='f2') ? 2 : 1; await onCompFormElegido({ target:{ files:[{}] } }); }
      await _esp(60);
    };
    var _d=new Date(), F; do { _d.setDate(_d.getDate()+1); F=isoLocal(_d); } while(diaDomingo(F) || (typeof feriadoDe==='function' && !!feriadoDe(F)) || diaCerrado(F));
    window._F=F;
    window._llenar=function(o){
      if(typeof cancelEdit==='function' && EDIT_ID) cancelEdit();
      VENTA_TIENDA=false; showView('form'); resetForm(); EDIT_ID=null;
      if(o.tienda){ VENTA_TIENDA=true; pintarModoTienda(); }
      document.getElementById('f-vendedor').value='Carola Chavez'; try{ applyVendedorLite(); }catch(e){}
      document.getElementById('f-cliente').value='CLIENTE INVENTADO'; document.getElementById('f-celular').value='70000099';
      document.getElementById('f-zona').value='Norte'; document.getElementById('f-direccion').value='Calle Inventada 1';
      if(!o.tienda){ document.getElementById('f-fecha').value=F; segSet('f-turno','AM'); }
      document.getElementById('f-nota').value='7777';
      var pd=document.querySelector('#f-productos .prod-desc'); if(pd){ pd.value='COLCHON SOFT'; var pm=document.querySelector('#f-productos .prod-medida'); if(pm) pm.value='140x190'; var pc=document.querySelector('#f-productos .prod-cant'); if(pc) pc.value='1'; }
      segSet('f-pagado', o.pagado?'SI':'NO'); updateMetodoVisibility();
      if(o.pagado){ document.getElementById('f-cobrado').value=String(o.total); }
      else { document.getElementById('f-acuenta').value=String(o.acuenta); document.getElementById('f-saldo').value=String(o.saldo); updateMetodoVisibility(); }
      segSet('f-metodo', o.m1||'QR'); updateBancoVisibility(); if((o.m1||'QR')==='QR') segSet('f-banco','BISA');
      FORM_COMPS=[]; renderCompForm(true);
    };
    window._t=function(id){ var e=document.getElementById(id); return e ? e.textContent.replace(/\s+/g,' ').trim() : ''; };
    window._lect=function(){ return S.llamadas.filter(function(b){ return b.action==='iaComprobantes' && !b.leer; }); };
    window._leer1=function(){ return S.llamadas.filter(function(b){ return b.action==='iaComprobantes' && b.leer; }); };
    return { F:F };
  });
  chk('0. arma el panel de prueba', r0 && r0.F && !r0.__error, r0);

  /* 1 · apagado en Playwright */
  const r1 = await ev(async () => {
    _llenar({ acuenta:1250, saldo:1000 }); __S.llamadas=[];
    await _subir('q1');
    await _esp(150);
    return { n:_lect().length, aviso:_t('ias-f1'), comps:FORM_COMPS.slice() };
  });
  chk('1. sin IAC_SUBIR_PRUEBA (Playwright) no lee nada ni muestra nada', r1.n===0 && r1.aviso==='' && r1.comps.indexOf('q1')>=0, r1);

  /* 2 · pedido nuevo: la foto dice menos */
  const r2 = await ev(async () => {
    window.IAC_SUBIR_PRUEBA=1; __S.llamadas=[]; __S.demora=300;
    _llenar({ acuenta:1250, saldo:1000 });
    await _subir('q2');
    await _esp(120);
    var leyendo=_t('ias-f1');
    await _esp(600);
    var L=_lect(), btns=[].map.call(document.querySelectorAll('#ias-f1 button'), function(b){ return b.textContent; });
    return { leyendo:leyendo, aviso:_t('ias-f1'), btns:btns, llamadas:L.map(function(b){ return b.fotos; }), leer1:_leer1().map(function(b){ return b.fotos; }) };
  });
  chk('2a. mientras lee: «🔎 Leyendo el comprobante…»', /Leyendo el comprobante/.test(r2.leyendo), r2.leyendo);
  chk('2b. pidió UNA lectura, solo de esa foto (sin `leer`)', r2.llamadas.length===1 && JSON.stringify(r2.llamadas[0])==='["q2"]', r2.llamadas);
  chk('2c. el aviso: «La foto dice Bs 1.140 y anotaste 1.250: ¿los Bs 110 fueron en efectivo?»', /La foto dice Bs 1\.140 y anotaste 1\.250: ¿los Bs 110 fueron en efectivo\?/.test(r2.aviso), r2.aviso);
  chk('2d. con «💵 Agregar efectivo» y «Corregir a 1.140»', r2.btns.some(t=>/Agregar efectivo/.test(t)) && r2.btns.some(t=>/Corregir a 1\.140/.test(t)), r2.btns);
  chk('2e. lo ya leído de las otras ventas lo trae con `leer:1` (sin gastar), con la foto de la 10-050', r2.leer1.length>=1 && r2.leer1.some(f=>f.indexOf('g990')>=0), r2.leer1);

  const r2f = await ev(async () => {
    var b=[].filter.call(document.querySelectorAll('#ias-f1 button'), function(x){ return /Corregir/.test(x.textContent); })[0]; if(b) b.click();
    await _esp(250);
    return { acu:document.getElementById('f-acuenta').value, sal:document.getElementById('f-saldo').value, aviso:_t('ias-f1') };
  });
  chk('2f. «Corregir a 1.140»: A cuenta 1.140 y lo que se sacó pasa al saldo (1.110): el total no cambia; la foto ya coincide', String(r2f.acu)==='1140' && String(r2f.sal)==='1110' && /La foto coincide/.test(r2f.aviso), r2f);

  /* 3 · la nota de venta dice QR + efectivo → «Agregar efectivo» y se guarda el mixto */
  const r3 = await ev(async () => {
    __S.llamadas=[]; __S.demora=0;
    _llenar({ acuenta:1250, saldo:1000 });
    window._ids=['q1','r1']; COMP_DESTINO=1; await onCompFormElegido({ target:{ files:[{}] } }); COMP_DESTINO=1; await onCompFormElegido({ target:{ files:[{}] } });
    await _esp(400);
    var aviso=_t('ias-f1'), lects=_lect().map(function(b){ return b.fotos; });
    var b=[].filter.call(document.querySelectorAll('#ias-f1 button'), function(x){ return /Agregar efectivo/.test(x.textContent); })[0]; if(b) b.click();
    await _esp(250);
    var despues={ mixto:MIXTO, m2:segVal('f-metodo2'), monto2:document.getElementById('f-monto2').value, c1:FORM_COMPS.slice(), c2:FORM_COMPS2.slice(), aviso:_t('ias-f1') };
    window._pl=[]; var antes=STATE.map(function(p){ return p.id; });
    submitPedido(); await _esp(500);
    var nueva=STATE.filter(function(p){ return antes.indexOf(p.id)<0; })[0] || null;
    var cob=nueva ? parseCobros(nueva.metodoPago).map(function(c){ return c.metodo+' '+c.monto+' '+compsArr(c.comps!=null?c.comps:c.comp).join(','); }) : [];
    return { aviso:aviso, lects:lects, despues:despues, cob:cob, saldo:nueva && nueva.saldo, acuenta:nueva && nueva.acuenta };
  });
  chk('3a. las dos fotos subidas juntas van en la misma lectura', r3.lects.length===1 && r3.lects[0].length===2, r3.lects);
  chk('3b. la nota de venta: «QR BISA Bs 1.140 + efectivo Bs 110» con «Agregar efectivo»', /La nota de venta dice QR BISA Bs 1\.140 \+ efectivo Bs 110/.test(r3.aviso), r3.aviso);
  chk('3c. «Agregar efectivo» arma el 2° método en efectivo por 110 y le pasa la foto del recibo', r3.despues.mixto && r3.despues.m2==='Efectivo' && String(r3.despues.monto2)==='110' &&
    JSON.stringify(r3.despues.c1)==='["q1"]' && JSON.stringify(r3.despues.c2)==='["r1"]' && /La foto coincide/.test(r3.despues.aviso), r3.despues);
  chk('3d. se guarda QR 1.140 (con su captura) + efectivo 110 (con el recibo); A cuenta 1.250, saldo 1.000', r3.cob.length===2 && /^QR 1140 q1$/.test(r3.cob[0]) && /^Efectivo 110 r1$/.test(r3.cob[1]) && Number(r3.acuenta)===1250 && Number(r3.saldo)===1000, r3);

  /* 4 · el mismo comprobante en otra venta */
  const r4 = await ev(async () => {
    __S.llamadas=[];
    _llenar({ acuenta:990, saldo:500 });
    await _subir('q3'); await _esp(300);
    return { aviso:_t('ias-f1') };
  });
  chk('4. el mismo N° de comprobante (con guiones) que la 10-050 → «Esta foto ya está en la venta 10-050»', /Esta foto ya está en la venta 10-050/.test(r4.aviso) && /OTRA CLIENTA/.test(r4.aviso), r4.aviso);

  /* 5 · venta de tienda con la foto de otro día */
  const r5 = await ev(async () => {
    __S.llamadas=[];
    _llenar({ tienda:true, pagado:true, total:990 });
    var fv0=document.getElementById('f-fecha-venta').value;
    await _subir('t1'); await _esp(300);
    var aviso=_t('ias-f1');
    var b=[].filter.call(document.querySelectorAll('#ias-f1 button'), function(x){ return /Sí, fue el 14\/10/.test(x.textContent); })[0]; if(b) b.click();
    await _esp(250);
    var out={ fv0:fv0, aviso:aviso, fv:document.getElementById('f-fecha-venta').value, despues:_t('ias-f1') };
    if(typeof cancelarVentaTienda==='function'){ VENTA_TIENDA=false; resetForm(); pintarModoTienda(); }
    return out;
  });
  chk('5a. venta de tienda (hoy 30/10) con la foto del 14/10 → «La foto es del 14/10: ¿la venta fue ese día?» con «Sí»', r5.fv0==='2026-10-30' && /La foto es del 14\/10: ¿la venta fue ese día\?/.test(r5.aviso) && /Sí, fue el 14\/10/.test(r5.aviso), r5);
  chk('5b. «Sí» llena «Fecha de la venta» con el 14/10 y la foto ya coincide', r5.fv==='2026-10-14' && /La foto coincide/.test(r5.despues), r5);

  /* 6 · lo que no se lee: el efectivo, el servidor de antes, el tope */
  const r6 = await ev(async () => {
    var out={};
    __S.llamadas=[]; _llenar({ acuenta:500, saldo:500, m1:'Efectivo' }); await _subir('e1'); await _esp(200);
    out.efectivo={ n:_lect().length, aviso:_t('ias-f1') };
    __S.llamadas=[]; SERVER_VER='2026-10-25-a'; _llenar({ acuenta:1250, saldo:1000 }); await _subir('q6'); await _esp(200);
    out.viejo={ n:__S.llamadas.filter(function(b){ return b.action==='iaComprobantes'; }).length, aviso:_t('ias-f1') };
    SERVER_VER='2026-10-26-b'; __S.llamadas=[]; __S.modo='tope'; _llenar({ acuenta:1250, saldo:1000 }); await _subir('q7'); await _esp(250);
    out.tope={ n:_lect().length, aviso:_t('ias-f1') };
    __S.llamadas=[]; _llenar({ acuenta:1250, saldo:1000 }); await _subir('q8'); await _esp(250);
    out.despuesDelTope={ n:_lect().length, aviso:_t('ias-f1') };
    __S.modo='ok'; try{ IAS.parado=0; }catch(e){}
    return out;
  });
  chk('6a. con efectivo no se lee la foto (es el recibo) ni se muestra nada', r6.efectivo.n===0 && r6.efectivo.aviso==='', r6.efectivo);
  chk('6b. con el servidor 25-a no se llama y no se muestra nada', r6.viejo.n===0 && r6.viejo.aviso==='', r6.viejo);
  chk('6c. con el tope del día: una llamada, y no queda ni «Leyendo…» ni nada', r6.tope.n===1 && r6.tope.aviso==='', r6.tope);
  chk('6d. …y la foto siguiente no vuelve a pedir enseguida', r6.despuesDelTope.n===0 && r6.despuesDelTope.aviso==='', r6.despuesDelTope);

  /* 7 · nunca frena */
  const r7 = await ev(async () => {
    __S.llamadas=[]; __S.demora=1500;
    _llenar({ acuenta:1250, saldo:1000 });
    await _subir('q9'); await _esp(150);
    var leyendo=_t('ias-f1'), antes=STATE.map(function(p){ return p.id; });
    submitPedido(); await _esp(400);
    var nueva=STATE.filter(function(p){ return antes.indexOf(p.id)<0; })[0] || null;
    var guardo=!!nueva && /q9/.test(nueva.metodoPago||'');
    await _esp(1500);
    return { leyendo:leyendo, guardo:guardo, aviso:_t('ias-f1'), compsForm:FORM_COMPS.length };
  });
  chk('7. NUNCA frena: guardado mientras lee (con la foto en el pago); la lectura que llega después no rompe ni deja nada en el formulario', /Leyendo/.test(r7.leyendo) && r7.guardo && r7.aviso==='' && r7.compsForm===0, r7);

  /* 8 · Contabilidad: «Registrar pago» */
  const r8 = await ev(async () => {
    __S.llamadas=[]; __S.demora=0;
    showView('conta'); await _esp(100);
    showContaModal('c1'); CTA_PAGO.metodo='QR'; CTA_PAGO.banco='BISA'; showContaModal('c1');
    var m0=(document.getElementById('cta-pago-monto')||{}).value;
    await _subir('c9', 'cta'); await _esp(300);
    var aviso=_t('ias-cta'), btns=[].map.call(document.querySelectorAll('#ias-cta button'), function(b){ return b.textContent; });
    var b=[].filter.call(document.querySelectorAll('#ias-cta button'), function(x){ return /Corregir/.test(x.textContent); })[0]; if(b) b.click();
    await _esp(250);
    var out={ m0:m0, aviso:aviso, btns:btns, monto:(document.getElementById('cta-pago-monto')||{}).value, despues:_t('ias-cta'), lect:_lect().map(function(b){ return b.fotos; }) };
    closeModal(); return out;
  });
  chk('8a. «Registrar pago» (falta Bs 2.400) con la foto de 2.000 → el aviso y «Corregir a 2.000», sin «Agregar efectivo»', String(r8.m0)==='2400' && /La foto dice Bs 2\.000 y anotaste 2\.400/.test(r8.aviso) &&
    r8.btns.some(t=>/Corregir a 2\.000/.test(t)) && !r8.btns.some(t=>/Agregar efectivo/.test(t)) && JSON.stringify(r8.lect)==='[["c9"]]', r8);
  chk('8b. «Corregir a 2.000» pone 2.000 en el monto y la foto ya coincide', String(r8.monto)==='2000' && /La foto coincide/.test(r8.despues), r8);

  /* 9 · «Para hacer»: la fecha sola en ámbar, la plata en rojo */
  const r9 = await ev(async () => {
    var t=Date.now()-86400000, A=function(id, o){ return Object.assign({ id:id, k:'k'+id, pid:'c1', vend:'Carola Chavez', cli:'CLIENTE '+id.toUpperCase(), nota:'5060', f:'2026-10-20', m:1310, met:'QR BISA', mes:'2026-10', t:t, por:'Contabilidad' }, o); };
    var L=[
      A('a1', { txt:'la foto dice Bs 10,00 y está anotado Bs 1.310,00 como QR BISA (Bs 1.300,00 menos): si esa parte fue en efectivo, anotala como otro pago; si no, falta su comprobante', ks:['menos'] }),
      A('a2', { txt:'la foto es del 10/10 y la venta se cargó el 20/10' }),                     // de antes: sin `ks`, por el texto
      A('a3', { txt:'la foto es del 11/10 y el pago se registró el 21/10', ks:['dia'] }),
      A('a4', { txt:'la foto es del 10/10 y la venta se cargó el 20/10 · el mismo comprobante (N° X1) está también en el pago de OTRO (Bs 990,00)' })
    ];
    STATE=STATE.filter(function(p){ return String(p.id)!==CTA_AV_ID; }).concat([filaSistema(CTA_AV_ID, 'avisos', JSON.stringify({ v:1, a:L }))]);
    var mine=STATE.filter(function(p){ return mismoVendedor(p.vendedor, 'Carola Chavez'); });
    var I=misHacerDatos('Carola Chavez', mine).filter(function(o){ return o.ic==='📣' || o.ic==='📅'; }).map(function(o){ return o.sev+'|'+o.n+'|'+o.ic+' '+o.t; });
    var E=misEqHacerDatos(STATE.filter(function(p){ return !esFilaSistema(p); })).filter(function(o){ return o.ic==='📣' || o.ic==='📅'; }).map(function(o){ return o.sev+'|'+o.n+'|'+o.ic+' '+o.t; });
    ctaAvVer('Carola Chavez'); await _esp(60);
    var lista=[].map.call(document.querySelectorAll('.ctav-it'), function(e){ return (e.classList.contains('ctav-fecha')?'F ':'P ')+e.querySelector('b').textContent; });
    closeModal();
    return { I:I, E:E, lista:lista };
  });
  chk('9a. la vendedora: 📣 en ROJO solo con los 2 de plata, y 📅 en ÁMBAR con los 2 que son solo de fecha', r9.I.length===2 && r9.I.some(s=>/^r\|2\|📣/.test(s)) && r9.I.some(s=>/^a\|2\|📅 Pagos con otra fecha en la foto/.test(s)), r9.I);
  chk('9b. lo mismo en «Para hacer · el equipo»', r9.E.length===2 && r9.E.some(s=>/^r\|2\|📣/.test(s)) && r9.E.some(s=>/^a\|2\|📅/.test(s)), r9.E);
  chk('9c. su lista: primero los de plata y después, aparte, los de fecha (los 4)', JSON.stringify(r9.lista)===JSON.stringify(['P CLIENTE A1','P CLIENTE A4','F CLIENTE A2','F CLIENTE A3']), r9.lista);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
