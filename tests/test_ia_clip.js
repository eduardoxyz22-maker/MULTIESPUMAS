/* 📎 LA FOTO QUE SE PEGA A UN PAGO YA REGISTRADO TAMBIÉN SE LEE (31/10; el dueño: «sí, que se lea también el 📎»).
   El 31/10 la ventana «Revisar las fotos con IA» le pidió leer 76: 68 eran pagos del 26 al 29/10 (antes de la lectura al subir, §78), y
   quedaba un camino que nunca leía al subir: el 📎 de Contabilidad sobre un cobro, un adelanto o un recargo ya anotados.

   LO QUE CUIDA:
   1. Apagado en Playwright salvo `window.IAC_SUBIR_PRUEBA` (como la lectura al subir).
   2. 📎 sobre un COBRO ya registrado: pide la lectura de la foto nueva Y de la que el pago ya tenía sin leer, muestra «Leyendo…» debajo de
      ese pago y después «✅ La foto coincide» (las dos fotos suman lo anotado).
   3. La foto dice menos → el aviso de siempre, SIN botones de arreglo (el pago ya está anotado) y con «✏️ Corregir en este pago».
   4. 📎 sobre el ADELANTO y sobre un RECARGO cobrado: también se leen, y el aviso va debajo de ESE renglón.
   5. Una foto ya leída no se vuelve a pagar (se pide, pero el servidor la devuelve de lo guardado): solo la nueva sale en `faltan`.
   6. Efectivo: no se lee (tampoco lo lee la revisión del mes). Servidor anterior a 26-a: nada.
   7. Lo leído acá ya no aparece «sin leer» en la revisión del mes.

   Reloj CLAVADO (sábado 31/10/2026, 11:00 de Bolivia). Servidor de mentira; datos inventados.
   Se corre:  node tests/test_ia_clip.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1300, height:950 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await ctx.route(/^https?:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-31T11:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };

  const r0 = await ev(async () => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    SERVER_VER='2026-10-30-a';
    try{ IAS_JUNTA_MS=20; IAS_ESPERA_MS=30; }catch(e){}
    var ts=new Date('2026-10-20T11:00:00-04:00').getTime();
    var V=function(id, oc, mp){ return { id:id, oc:oc, nota:'50'+oc.slice(-2), cliente:'CLIENTE '+id.toUpperCase()+' INVENTADO', celular:'7000000'+id.slice(-1), fecha:'2026-11-04', turno:'AM',
      zona:'Norte', vendedor:'Carola Chavez', productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', cant:1, precio:3400 }], saldo:1400, acuenta:1000, pagado:false, ts:ts,
      metodoPago:textoCobros(mp) }; };
    STATE=[
      /* un cobro QR de 1.000 con una foto SIN leer (q0) */
      V('a1', '10-071', [{ anticipo:true, metodo:'Efectivo', monto:1000, fecha:'2026-10-20', nota:'5071', comps:['ra1'] },
                         { metodo:'QR', banco:'BISA', monto:1000, fecha:'2026-10-28', nota:'5071', comps:['q0'] }]),
      /* un cobro QR de 1.000 cuya foto dirá menos */
      V('a2', '10-072', [{ anticipo:true, metodo:'Efectivo', monto:1000, fecha:'2026-10-20', nota:'5072', comps:['ra2'] },
                         { metodo:'QR', banco:'BISA', monto:1000, fecha:'2026-10-29', nota:'5072' }]),
      /* adelanto QR (ya leído) + recargo cobrado QR */
      V('a3', '10-073', [{ anticipo:true, metodo:'QR', banco:'BISA', monto:1000, fecha:'2026-10-20', nota:'5073', comps:['qa3'] },
                         { envio:true, metodo:'QR', banco:'BISA', monto:150, fecha:'2026-10-30', nota:'5073' }]),
      /* un cobro en EFECTIVO */
      V('a4', '10-074', [{ anticipo:true, metodo:'Efectivo', monto:1000, fecha:'2026-10-20', nota:'5074', comps:['ra4'] },
                         { metodo:'Efectivo', monto:500, fecha:'2026-10-30', nota:'5074' }])
    ];
    var norm=function(o){ return o.err ? { err:o.err, t:1 } : Object.assign({ cp:true, le:true, m:0, mo:'BOB', f:'', h:'', bo:'', bd:'', de:'', or:'', ref:'', ti:'qr', no:'', t:1, md:'x', pv:2 }, o); };
    var S=window.__S={ llamadas:[], guardado:{ qa3:norm({ m:1000, bd:'BISA', f:'2026-10-20', ref:'A3000001' }) }, modo:'ok', demora:40, cobradas:[],
      lee:{
        q0:{ m:600, bd:'BISA', f:'2026-10-28', ref:'Q0000001' }, qn:{ m:400, bd:'BISA', f:'2026-10-28', ref:'QN000001' },
        qm:{ m:700, bd:'BISA', f:'2026-10-29', ref:'QM000001' },
        qa3b:{ m:1000, bd:'BISA', f:'2026-10-20', ref:'A3000002' },
        qe:{ m:150, bd:'BISA', f:'2026-10-30', ref:'E0000001' },
        ef:{ m:500, f:'2026-10-30' }, qv:{ m:1000, bd:'BISA', f:'2026-10-28' }
      } };
    apiPost=function(b){
      b=JSON.parse(JSON.stringify(b)); S.llamadas.push(b);
      if(b.action!=='iaComprobantes') return Promise.resolve({ ok:true });
      var res={}, faltan=[];
      (b.fotos||[]).forEach(function(f){ if(S.guardado[f]) res[f]=S.guardado[f]; else faltan.push(f); });
      var r={ ok:true, version:'2026-10-30-a', res:res, faltan:faltan, pendientes:[], leidas:0, usd:0, dia:{ d:'2026-10-31', n:0, usd:0 }, estado:'' };
      if(b.leer) return Promise.resolve(r);
      if(S.modo!=='ok'){ r.estado=S.modo; r.pendientes=faltan; return Promise.resolve(r); }
      faltan.forEach(function(f){ var o=norm(S.lee[f] || { err:'no_existe' }); S.guardado[f]=o; res[f]=o; r.leidas++; S.cobradas.push(f); });
      return new Promise(function(ok){ setTimeout(function(){ ok(r); }, S.demora); });
    };
    apiSave=function(r){ return Promise.resolve({ ok:true, pedido:JSON.parse(JSON.stringify(r)) }); };
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
    fotoCronometro=function(){ return Promise.resolve('data:image/png;base64,xx'); };
    subirFoto=function(){ return Promise.resolve({ ok:true, fotoId:(window._ids||[]).shift()||'x' }); };
    window._esp=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
    /* el 📎: `destino` es lo que arman los botones (`ctaAdjuntar`, `ctaAdjuntarEdit`, `ctaEnvioAdjuntar`) */
    window._clip=async function(pid, fid, destino){
      window._ids=[fid]; showView('conta'); showContaModal(pid);
      COMP_DESTINO=Object.assign({ id:pid }, destino);
      await onCompElegido({ target:{ files:[{}], dataset:{ pedido:pid } } });
    };
    window._cajas=function(){ return [].slice.call(document.querySelectorAll('.ias-peg')).map(function(b){ return { i:+b.getAttribute('data-i'), t:b.textContent.replace(/\s+/g,' ').trim(), btn:b.querySelectorAll('button').length }; }); };
    window._lect=function(){ return S.llamadas.filter(function(b){ return b.action==='iaComprobantes' && !b.leer; }); };
    return { ok:true };
  });
  chk('0. arma el panel de prueba', r0 && r0.ok && !r0.__error, r0);

  /* 1 · apagado en Playwright */
  const r1 = await ev(async () => {
    __S.llamadas=[];
    await _clip('a1', 'qv', { idx:0 }); await _esp(150);
    var p=findById('a1'), c=cobrosDe(p)[0];
    var out={ n:_lect().length, cajas:_cajas(), comps:compsArr(c.comps) };
    /* deshacer: la foto de prueba se saca para que el caso 2 arranque igual */
    var arr=cobrosDe(p); arr[0].comps=compsArr(arr[0].comps).filter(function(f){ return f!=='qv'; }); arr[0].comp=arr[0].comps[0]||''; aplicarCobros(p, arr);
    delete IAS.peg.qv; out.saco=compsArr(cobrosDe(p)[0].comps).indexOf('qv')<0;
    return out;
  });
  chk('1. sin IAC_SUBIR_PRUEBA (Playwright) el 📎 pega la foto pero no lee ni muestra nada', r1.n===0 && !r1.cajas.length && r1.comps.indexOf('qv')>=0 && r1.saco, r1);

  await ev(() => { window.IAC_SUBIR_PRUEBA=1; });

  /* 2 · 📎 sobre un cobro ya registrado: lee la nueva y la que el pago tenía sin leer; las dos suman lo anotado */
  const r2 = await ev(async () => {
    __S.llamadas=[]; __S.cobradas=[]; __S.demora=120;
    await _clip('a1', 'qn', { idx:0 });
    await _esp(60);
    var leyendo=_cajas();
    await _esp(400);
    var L=_lect();
    return { leyendo:leyendo, fin:_cajas(), fotos:L.length ? L[0].fotos : [], cobradas:__S.cobradas.slice() };
  });
  chk('2a. pide la lectura de la foto nueva y de la que el pago ya tenía sin leer (y nada más)', r2.fotos.slice().sort().join()==='q0,qn', r2.fotos);
  chk('2b. mientras lee, debajo de ESE pago dice «Leyendo el comprobante…» (sin «si guardás antes»)',
    r2.leyendo.length===1 && /Leyendo el comprobante/.test(r2.leyendo[0].t) && !/guardás/.test(r2.leyendo[0].t), r2.leyendo);
  chk('2c. después: «✅ La foto coincide con lo anotado» (600 + 400 = 1.000)', r2.fin.length===1 && /coincide con lo anotado/.test(r2.fin[0].t), r2.fin);

  /* 3 · la foto dice menos */
  const r3 = await ev(async () => {
    __S.llamadas=[]; __S.demora=30;
    await _clip('a2', 'qm', { idx:0 }); await _esp(300);
    return { cajas:_cajas() };
  });
  const c3 = (r3.cajas||[])[0] || {};
  chk('3a. la foto dice menos → «La foto dice Bs 700 y anotaste 1.000: ¿los Bs 300 fueron en efectivo?»',
    /Bs 700/.test(c3.t||'') && /anotaste 1\.000/.test(c3.t||'') && /Bs 300/.test(c3.t||''), r3.cajas);
  chk('3b. sin botones de arreglo (el pago ya está anotado) y con «✏️ Corregir en este pago»', c3.btn===0 && /Corregir/.test(c3.t||''), c3);

  /* 4 · el adelanto y el recargo */
  const r4 = await ev(async () => {
    __S.llamadas=[]; __S.cobradas=[];
    await _clip('a3', 'qa3b', { anticipo:true }); await _esp(250);
    var ant={ cajas:_cajas(), fotos:(_lect()[0]||{}).fotos||[], cobradas:__S.cobradas.slice() };
    __S.llamadas=[]; __S.cobradas=[];
    await _clip('a3', 'qe', { envio:true, e:0 }); await _esp(250);
    var p=findById('a3'), pagos=contaPagos(p), iEnv=-1; pagos.forEach(function(c, i){ if(esEnvio(c)) iEnv=i; });
    return { ant:ant, env:{ cajas:_cajas(), fotos:(_lect()[0]||{}).fotos||[], iEnv:iEnv } };
  });
  chk('4a. 📎 sobre el ADELANTO: se lee y el aviso va debajo del adelanto (el renglón 0)',
    r4.ant.cajas.some(function(c){ return c.i===0 && /La foto dice|coincide/.test(c.t); }), r4.ant);
  chk('5. la foto del adelanto que ya estaba leída no se vuelve a pagar (ni se pide: ya estaba en el aparato): solo se lee la nueva',
    r4.ant.cobradas.join()==='qa3b' && r4.ant.fotos.join()==='qa3b', r4.ant);
  chk('4b. 📎 sobre un RECARGO cobrado: se lee y el aviso va debajo del recargo', r4.env.fotos.indexOf('qe')>=0 &&
    r4.env.cajas.some(function(c){ return c.i===r4.env.iEnv && /coincide/.test(c.t); }), r4.env);

  /* 6 · efectivo y servidor viejo */
  const r6 = await ev(async () => {
    __S.llamadas=[];
    await _clip('a4', 'ef', { idx:0 }); await _esp(200);
    var ef={ n:_lect().length, cajas:_cajas(), pegada:compsArr(cobrosDe(findById('a4'))[0].comps).indexOf('ef')>=0 };
    SERVER_VER='2026-10-25-a'; __S.llamadas=[];
    var p=findById('a2'); p.metodoPago=textoCobros([{ anticipo:true, metodo:'Efectivo', monto:1000, fecha:'2026-10-20', nota:'5072', comps:['ra2'] },
      { metodo:'QR', banco:'BISA', monto:1000, fecha:'2026-10-29', nota:'5072' }]);
    IAS.peg={};
    await _clip('a2', 'qx', { idx:0 }); await _esp(200);
    var viejo={ n:_lect().length, cajas:_cajas().filter(function(c){ return c.t; }) };
    SERVER_VER='2026-10-30-a';
    return { ef:ef, viejo:viejo };
  });
  chk('6a. 📎 sobre un cobro en EFECTIVO: se pega, pero no se lee (tampoco lo lee la revisión del mes)', r6.ef.pegada && r6.ef.n===0 && !r6.ef.cajas.length, r6.ef);
  chk('6b. con un servidor anterior a 26-a no se pide nada ni se muestra nada', r6.viejo.n===0 && !r6.viejo.cajas.length, r6.viejo);

  /* 7 · la revisión del mes ya no la cuenta como «sin leer» */
  const r7 = await ev(() => {
    var ids=iacIds(iacPagos('2026-10')), sin=ids.filter(function(f){ return !IAC.res[f]; });
    return { qn:ids.indexOf('qn')>=0, q0:ids.indexOf('q0')>=0, sin:sin };
  });
  chk('7. en la revisión de octubre, las fotos leídas con el 📎 ya no están «sin leer»', r7.qn && r7.q0 && r7.sin.indexOf('qn')<0 && r7.sin.indexOf('q0')<0 && r7.sin.indexOf('qm')<0, r7);

  /* 9 · la revisión de Fable (31/10) */
  const r9 = await ev(async () => {
    var out={};
    var V=function(id, mp){ var p=JSON.parse(JSON.stringify(findById('a1'))); p.id=id; p.oc='10-0'+id.slice(-2); p.cliente='CLIENTE '+id.toUpperCase(); p.metodoPago=textoCobros(mp); STATE.push(p); return p; };
    /* 1.1: la foto vieja (leída) dice 1.000 y la recién pegada NO se puede leer (tope) → nunca «✅ coincide» */
    __S.guardado.qold=__S.guardado.qold || { cp:true, le:true, m:1000, mo:'BOB', f:'2026-10-27', bd:'BISA', ref:'OLD0001', t:1, pv:2 };
    V('b1', [{ anticipo:true, metodo:'Efectivo', monto:1000, fecha:'2026-10-20', nota:'5081', comps:['rb1'] },
             { metodo:'QR', banco:'BISA', monto:1000, fecha:'2026-10-27', nota:'5081', comps:['qold'] }]);
    await new Promise(function(ok){ apiPost({ action:'iaComprobantes', fotos:['qold'], leer:1 }).then(function(r){ iacTomar(r); ok(); }); });
    __S.modo='tope'; IAS.parado=0;
    await _clip('b1', 'qnew', { idx:0 }); await _esp(250);
    out.tope=_cajas(); __S.modo='ok';
    /* 1.2: con la pausa puesta no se pide; al vencer, el repintado la pide */
    IAS.parado=Date.now(); __S.llamadas=[];
    V('b2', [{ anticipo:true, metodo:'Efectivo', monto:1000, fecha:'2026-10-20', nota:'5082', comps:['rb2'] },
             { metodo:'QR', banco:'BISA', monto:1000, fecha:'2026-10-28', nota:'5082' }]);
    __S.lee.qp={ m:1000, bd:'BISA', f:'2026-10-28', ref:'QP000001' };
    await _clip('b2', 'qp', { idx:0 }); await _esp(150);
    out.pausa={ n:_lect().length, cajas:_cajas() };
    IAS.parado=0; iasRepintar(); await _esp(300);
    out.despues={ n:_lect().length, cajas:_cajas() };
    /* 1.4: la caja sigue a SU foto aunque el renglón se corra (otro cobro, de fecha anterior, entra mientras lee) */
    V('b3', [{ anticipo:true, metodo:'Efectivo', monto:1000, fecha:'2026-10-20', nota:'5083', comps:['rb3'] },
             { metodo:'QR', banco:'BISA', monto:700, fecha:'2026-10-29', nota:'5083' }]);
    __S.lee.qs={ m:700, bd:'BISA', f:'2026-10-29', ref:'QS000001' }; __S.demora=200;
    await _clip('b3', 'qs', { idx:0 }); await _esp(40);
    var p3=findById('b3'); p3.metodoPago=textoCobros([{ anticipo:true, metodo:'Efectivo', monto:1000, fecha:'2026-10-20', nota:'5083', comps:['rb3'] },
      { metodo:'Efectivo', monto:50, fecha:'2026-10-21', nota:'5083' }, { metodo:'QR', banco:'BISA', monto:700, fecha:'2026-10-29', nota:'5083', comps:['qs'] }]);
    await _esp(400); __S.demora=30;
    out.corrido=_cajas();
    /* 1.6: cobro QR 1.000 + recargo 50 del mismo día en UNA transferencia de 1.050 */
    V('b4', [{ anticipo:true, metodo:'Efectivo', monto:1000, fecha:'2026-10-20', nota:'5084', comps:['rb4'] },
             { metodo:'QR', banco:'BISA', monto:1000, fecha:'2026-10-30', nota:'5084' },
             { envio:true, metodo:'QR', banco:'BISA', monto:50, fecha:'2026-10-30', nota:'5084' }]);
    __S.lee.qf={ m:1050, bd:'BISA', f:'2026-10-30', ref:'QF000001' };
    await _clip('b4', 'qf', { idx:0 }); await _esp(300);
    out.flete=_cajas();
    return out;
  });
  chk('9a (1.1). la foto pegada no se pudo leer (tope): NO dice «coincide» por la vieja; dice que no se pudo leer',
    r9.tope.length===1 && !/coincide/.test(r9.tope[0].t) && /No pude leer/.test(r9.tope[0].t), r9.tope);
  chk('9b (1.2). con la pausa puesta no pide nada; al vencer, el repintado la pide y compara',
    r9.pausa.n===0 && r9.despues.n===1 && r9.despues.cajas.some(function(c){ return /coincide/.test(c.t); }), r9);
  chk('9c (1.4). el renglón se corrió mientras leía: la caja muestra lo de SU foto (700 = 700), no se vacía ni toma otro pago',
    r9.corrido.length===1 && /coincide/.test(r9.corrido[0].t), r9.corrido);
  chk('9d (1.6). cobro 1.000 + recargo 50 del mismo día en una transferencia de 1.050: «coincide», no «dice más»',
    r9.flete.length===1 && /coincide/.test(r9.flete[0].t), r9.flete);

  chk('8. sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log(`\n${PASS} bien · ${FAIL} mal`);
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
