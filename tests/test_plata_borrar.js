/* 💰 PLATA (dueño, 02/10: «hazlo») — tres cosas que faltaban en Contabilidad y Administración:

   A. 🗑 BORRAR UN PAGO YA REGISTRADO (`ctaBorrarPago`). «✏️ Corregir este pago» exigía monto > 0: un pago anotado por error o
      duplicado no se podía sacar. Ahora el editor tiene «🗑 Borrar este pago» y vale para un cobro de la venta, el adelanto
      y un recargo por entrega. El total de la venta no cambia (lo borrado vuelve a «falta cobrar»); el 2° método del mixto
      baja «A cuenta» al anticipo; el adelanto borrado deja `acuenta` en 0; las imágenes van a la papelera solo si nadie más
      las usa; el pago de MENTIRA de una «PAGADA sin monto» (§4fg) no se borra (no existe); la marca ✅ REGISTRADO no se toca.
   B. ✅→📥 UN PAGO NUEVO SACA LA MARCA «CARGADA EN EL SISTEMA CONTABLE» (MEDIA-5, `registradoSigue`). Un cobro que entra
      DESPUÉS de que Contabilidad marcó la venta como cargada quedaba escondido detrás de la marca. Entra por Contabilidad,
      por el chofer, por el 💵 de Administración, por el formulario («SÍ, pagado» sobre pagos sin saldar, flete cobrado nuevo).
      Corregir un pago, anotarle el monto a una «PAGADA sin monto», borrar uno, o pasar un recargo a pago (§4gr) NO la sacan.
   C. 💵 ¿QUIÉN RECIBIÓ EL EFECTIVO? (MEDIA-4, `admQuienRecibio`). El 💵 de la ficha de Administración y el 💰 de la tabla
      dejaban la plata «en la mano de la vendedora» aunque la hubiera cobrado el chofer. Con chofer y el camión ya salido
      (entregado, o fecha de entrega hoy o pasada) se pregunta; si no, queda con la vendedora sin preguntar, como siempre.

   Dientes: contra la página publicada el 02/10 (`f491137`) fallan A, B y C enteras.
   Datos SINTÉTICOS (el repo es público).
   Se corre:  node tests/test_plata_borrar.js          Dientes: PEDIDOS=/ruta/pedidos_f491137.html node tests/test_plata_borrar.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,extra)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, extra!=null?('· '+(typeof extra==='string'?extra:JSON.stringify(extra)).slice(0,600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1300,height:1000}, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror',e=>errores.push(e.message));
  const D = { confirm:true, prompt:null, vistos:[] };
  page.on('dialog', async d => {
    D.vistos.push(d.message());
    if (D.confirm===false) return d.dismiss();
    if (d.type()==='prompt') return d.accept(D.prompt!=null ? String(D.prompt) : undefined);
    return d.accept();
  });
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.setFixedTime(new Date('2026-10-02T10:00:00-04:00'));     // jueves, antes de las 17:00
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(350);

  await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    CARGA_GEN++; CARGA_ESTADO='ok';
    if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; }
    if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
    window.esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms||0); }); };
    window._saves=[];
    apiSave=function(r){ window._saves.push(JSON.parse(JSON.stringify(r))); return Promise.resolve({ok:true, pedido:JSON.parse(JSON.stringify(r))}); };
    apiDelete=function(){ return Promise.resolve({ok:true}); };
    window._borradas=[];
    apiBorrarFoto=function(f){ window._borradas.push(f); return Promise.resolve({ok:true}); };
    apiList=function(){ return new Promise(function(res){ setTimeout(function(){ res({ok:true, pedidos:JSON.parse(JSON.stringify(STATE.concat(RETIROS)))}); },0); }); };
    window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(k||'')+': '+String(m)); return _t(m,k,ms); };
    downloadBlob=function(){};
    /* Una venta de Bs 2.000 con su historial de pagos escrito como lo escribe el panel (`textoCobros`). */
    window.V=function(o){
      var b={ id:o.id, oc:o.oc||'09-500', nota:'100', turno:'AM', celular:'7', nit:'1', zona:'Norte', direccion:'Calle 1', fecha:(o.fecha||'2026-09-21'), maps:'',
              observaciones:'', garantia:'', facturarA:'', estado:'', entregado:(o.entregado!=null?o.entregado:true), verificado:false, vehiculo:(o.chofer?'Carry':''), chofer:(o.chofer||''), nroDia:1, fotos:[],
              vendedor:'Mirian Salazar', cliente:o.cliente||'CLIENTE', ts:new Date('2026-09-14T11:00:00-04:00').getTime(), rev:1,
              productos:[{desc:'COLCHON ORTOPEDICO',medida:'140x190',cant:1,precio:2000}],
              pagado:!!o.pagado, saldo:o.saldo||0, acuenta:o.acuenta||0, cobradoBs:0,
              metodoPago:(o.suelto ? (o.suelto+(o.lineas&&o.lineas.length?(' + '+textoCobros(o.lineas)):'')) : textoCobros(o.lineas||[])) };
      if(o.reg) b.metodoPago=conMarcaReg(b.metodoPago, true);
      return b;
    };
    window.foto=function(p){ return { pagos:contaPagos(p).map(function(c){ return { met:cobroMetodoTxt(c), monto:Number(c.monto)||0, fecha:c.fecha||'', nota:limpiaNota(c.nota),
                 rec:limpiaRecibio(c.recibio), comps:compsArr(c.comps!=null?c.comps:c.comp), ant:!!c.anticipo, env:!!c.envio, sinMonto:!!c.sinMonto }; }),
      envios:enviosDe(p).map(function(c){ return { met:cobroMetodoTxt(c), monto:Number(c.monto)||0, cobrado:envioYaCobrado(c) }; }),
      saldo:Number(p.saldo)||0, acuenta:Number(p.acuenta)||0, pagado:!!p.pagado, total:ventaTotal(p), reg:regEnSistema(p), exceso:excesoCobro(p),
      mixto:(function(){ var m=mixtoDe(p); return m?Number(m.monto)||0:0; })(), mp:p.metodoPago }; };
    /* El editor «✏️ Corregir este pago» del renglón i, y sus botones. */
    window.editor=function(id, i){
      CTA_EDIT_I=-1; CTA_EDIT_V=null; showContaModal(id); ctaEditarPago(id, i);
      var out=[]; document.querySelectorAll('#modal button').forEach(function(b){ var t=b.innerText.replace(/\s+/g,' ').trim(); if(/Borrar este pago|💾 Guardar/.test(t)) out.push(t); });
      return out;
    };
    window.borrar=async function(id, i){
      window._saves=[]; window._borradas=[]; window._toasts=[];
      var pr=ctaBorrarPago(id, i); try{ await pr; }catch(e){} await esperar(120);
      return foto(findById(id));
    };
    window.modalTxt=function(){ var m=document.getElementById('modal'); return (m && m.classList.contains('on')) ? (m.innerText||'') : ''; };
    window.clickModal=async function(re){
      var b=Array.prototype.filter.call(document.querySelectorAll('#modal button'), function(x){ return re.test(x.innerText.replace(/\s+/g,' ')); });
      if(!b.length) return false;
      b[0].click(); await esperar(150); return true;
    };
  });
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  const ult = () => D.vistos[D.vistos.length-1]||'';

  // ═══ A1. El botón ══════════════════════════════════════════════════════════════════════════════════
  console.log('\n── A1. «🗑 Borrar este pago» en el editor de Contabilidad ──');
  let r = await ev(() => {
    STATE=[ V({ id:'a1', acuenta:1000, saldo:400, lineas:[ { anticipo:true, metodo:'Efectivo', monto:1000, fecha:'2026-09-14', nota:'100', comps:['REC100'] },
                                                            { metodo:'QR', banco:'BISA', monto:600, fecha:'2026-09-20', nota:'777', comps:['Q777'] } ] }),
            V({ id:'a2', pagado:true, saldo:0, acuenta:0, suelto:'Efectivo %S1' }) ];
    return { cobro:editor('a1',1), ant:editor('a1',0), fake:editor('a2',0), fakeEs:foto(findById('a2')).pagos.map(function(x){ return x.sinMonto; }) };
  });
  chk('el cobro QR tiene «🗑 Borrar este pago» al lado de «💾 Guardar»', r.cobro && r.cobro.some(t=>/Borrar este pago/.test(t)) && r.cobro.some(t=>/Guardar/.test(t)), r.cobro || r.__error);
  chk('…el adelanto también', r.ant && r.ant.some(t=>/Borrar este pago/.test(t)), r.ant);
  chk('…pero el pago de MENTIRA de una «PAGADA sin monto» no (no existe como renglón)', r.fake && r.fake.some(t=>/Guardar/.test(t)) && !r.fake.some(t=>/Borrar este pago/.test(t)) && r.fakeEs && r.fakeEs[0]===true, [r.fake, r.fakeEs]);

  // ═══ A2. Borrar un cobro de la venta ═══════════════════════════════════════════════════════════════
  console.log('\n── A2. Borrar un cobro de la venta: el total no cambia, vuelve a faltar lo borrado ──');
  r = await ev(async () => {
    var p=findById('a1'), antes=foto(p); editor('a1',1);
    var d=await borrar('a1',1);
    return { antes:antes, d:d, saves:window._saves.length, borradas:window._borradas.slice(), toasts:window._toasts.slice(), ficha:modalTxt(), kind:MODAL_KIND };
  });
  let q = ult();
  chk('la pregunta dice qué se borra y qué pasa: «el pago de Bs 600,00 (QR BISA · 20/09 · recibo 777)», «Bs 400,00 a Bs 1.000,00», «NO se puede deshacer»',
      /¿Borrar el pago de Bs 600,00 \(QR BISA · 20\/09 · recibo 777\)/.test(q) && /pasa de Bs 400,00 a Bs 1\.000,00/.test(q) && /NO se puede deshacer/.test(q) && /imagen de respaldo va a la papelera/.test(q), q.slice(0,500));
  chk('quedó solo el adelanto (Efectivo 1.000 · 14/09 · recibo 100 · su foto)', r.d && r.d.pagos.length===1 && r.d.pagos[0].ant && r.d.pagos[0].monto===1000 && r.d.pagos[0].fecha==='2026-09-14' && r.d.pagos[0].nota==='100' && r.d.pagos[0].comps[0]==='REC100', r.d && r.d.pagos);
  chk('falta cobrar 1.000 (antes 400), sigue sin pagar, «A cuenta» 1.000 y el TOTAL sigue en 2.000', r.d && r.d.saldo===1000 && r.d.pagado===false && r.d.acuenta===1000 && r.d.total===2000 && r.antes.total===2000, r.d && [r.d.saldo, r.d.pagado, r.d.acuenta, r.d.total]);
  chk('UN guardado, y la foto del pago borrado (Q777) a la papelera', r.saves===1 && JSON.stringify(r.borradas)==='["Q777"]', [r.saves, r.borradas]);
  chk('el aviso lo dice: «🗑 Borrado: QR BISA Bs 600,00 · falta cobrar Bs 1.000,00»', r.toasts && r.toasts.some(t=>/ok: 🗑 Borrado: QR BISA Bs 600,00 · falta cobrar Bs 1\.000,00/.test(t)), r.toasts);
  chk('…y la ficha de Contabilidad se reabre, sin el pago', /CLIENTE/.test(r.ficha) && !/Bs 600,00/.test(r.ficha) && r.kind==='conta', [r.kind, (r.ficha||'').slice(0,120)]);

  // ═══ A3. Cancelar ══════════════════════════════════════════════════════════════════════════════════
  console.log('\n── A3. Cancelar no toca nada ──');
  D.confirm=false;
  r = await ev(async () => {
    STATE=[ V({ id:'a3', acuenta:1000, saldo:400, lineas:[ { anticipo:true, metodo:'Efectivo', monto:1000, fecha:'2026-09-14', nota:'100' },
                                                            { metodo:'QR', banco:'BISA', monto:600, fecha:'2026-09-20', nota:'777', comps:['Q777'] } ] }) ];
    var mp=findById('a3').metodoPago; editor('a3',1);
    var d=await borrar('a3',1);
    return { igual:d.mp===mp, saldo:d.saldo, saves:window._saves.length, borradas:window._borradas.length };
  });
  D.confirm=true;
  chk('con «Cancelar»: el historial igual, el saldo igual, nada guardado, ninguna foto a la papelera', r.igual && r.saldo===400 && r.saves===0 && r.borradas===0, r);

  // ═══ A4. Borrar el adelanto ════════════════════════════════════════════════════════════════════════
  console.log('\n── A4. Borrar el ADELANTO: la venta vuelve a deber todo lo que no entró por otro lado ──');
  r = await ev(async () => {
    STATE=[ V({ id:'a4', acuenta:1000, saldo:400, lineas:[ { anticipo:true, metodo:'Efectivo', monto:1000, fecha:'2026-09-14', nota:'100', comps:['REC100'] },
                                                            { metodo:'QR', banco:'BISA', monto:600, fecha:'2026-09-20', nota:'777', comps:['Q777'] } ] }),
            V({ id:'a5', pagado:true, saldo:0, acuenta:0, lineas:[ { anticipo:true, metodo:'Efectivo', monto:2000, fecha:'2026-09-14', nota:'100' } ] }),
            V({ id:'a6', acuenta:700, saldo:1300, lineas:[ { anticipo:true, metodo:'Efectivo', monto:500, fecha:'2026-09-14', nota:'100' },
                                                            { metodo:'QR', banco:'BISA', monto:200, fecha:'2026-09-14', nota:'100', comps:['QM'] } ] }) ];
    editor('a4',0); var d4=await borrar('a4',0); var s4=window._saves.length, b4=window._borradas.slice();
    editor('a5',0); var d5=await borrar('a5',0);
    var m6=foto(findById('a6')).mixto; editor('a6',0); var d6=await borrar('a6',0);
    return { d4:d4, s4:s4, b4:b4, ant4:anticipoDe(findById('a4')), d5:d5, m6:m6, d6:d6 };
  });
  chk('a4 · se fue el adelanto: queda el QR 600, «A cuenta» 0, falta 1.400, total 2.000, sin pagar; la foto del recibo a la papelera',
      r.d4 && r.d4.pagos.length===1 && !r.d4.pagos[0].ant && r.d4.pagos[0].monto===600 && r.d4.acuenta===0 && r.d4.saldo===1400 && r.d4.total===2000 && r.d4.pagado===false && r.ant4===null && JSON.stringify(r.b4)==='["REC100"]' && r.s4===1,
      r.d4 && [r.d4.pagos, r.d4.acuenta, r.d4.saldo, r.d4.total, r.b4, r.s4]);
  chk('a5 · una «SÍ, pagado» (el pago vive en el adelanto, §4cb) vuelve a deber los 2.000, sin pagar, sin ningún pago',
      r.d5 && r.d5.pagos.length===0 && r.d5.saldo===2000 && r.d5.pagado===false && r.d5.acuenta===0 && r.d5.total===2000, r.d5 && [r.d5.pagos, r.d5.saldo, r.d5.pagado, r.d5.acuenta]);
  chk('a6 · con pago MIXTO (500 + QR 200): se va el anticipo, el QR 200 queda como un cobro más, falta 1.800, «A cuenta» 0',
      r.m6===200 && r.d6 && r.d6.pagos.length===1 && r.d6.pagos[0].monto===200 && !r.d6.pagos[0].ant && r.d6.saldo===1800 && r.d6.acuenta===0 && r.d6.total===2000 && r.d6.mixto===0,
      r.d6 && [r.m6, r.d6.pagos, r.d6.saldo, r.d6.acuenta, r.d6.total]);

  // ═══ A5. Borrar el 2° método del mixto ════════════════════════════════════════════════════════════
  console.log('\n── A5. Borrar el 2° método del adelanto mixto: «A cuenta» baja al anticipo solo ──');
  r = await ev(async () => {
    STATE=[ V({ id:'a7', acuenta:700, saldo:1300, lineas:[ { anticipo:true, metodo:'Efectivo', monto:500, fecha:'2026-09-14', nota:'100' },
                                                            { metodo:'QR', banco:'BISA', monto:200, fecha:'2026-09-14', nota:'100', comps:['QM2'] } ] }) ];
    var antes=foto(findById('a7')); editor('a7',1); var d=await borrar('a7',1);
    return { antes:antes, d:d, borradas:window._borradas.slice() };
  });
  chk('antes: era mixto (200) con «A cuenta» 700', r.antes && r.antes.mixto===200 && r.antes.acuenta===700, r.antes && [r.antes.mixto, r.antes.acuenta]);
  chk('después: queda el anticipo de 500 solo, «A cuenta» 500, falta 1.500, total 2.000, ya no hay mixto',
      r.d && r.d.pagos.length===1 && r.d.pagos[0].ant && r.d.pagos[0].monto===500 && r.d.acuenta===500 && r.d.saldo===1500 && r.d.total===2000 && r.d.mixto===0 && JSON.stringify(r.borradas)==='["QM2"]',
      r.d && [r.d.pagos, r.d.acuenta, r.d.saldo, r.d.total, r.d.mixto]);

  // ═══ A6. Borrar un recargo por entrega ════════════════════════════════════════════════════════════
  console.log('\n── A6. Borrar un recargo cobrado: solo ese renglón; una foto compartida no va a la papelera ──');
  r = await ev(async () => {
    STATE=[ V({ id:'a8', acuenta:1000, saldo:1000, lineas:[ { anticipo:true, metodo:'Efectivo', monto:1000, fecha:'2026-09-14', nota:'100' },
                                                             { envio:true, metodo:'', monto:100 },
                                                             { envio:true, metodo:'QR', banco:'BISA', monto:60, fecha:'2026-09-22', nota:'983', comps:['Q60'] } ] }),
            V({ id:'a9', acuenta:1000, saldo:1000, lineas:[ { anticipo:true, metodo:'Efectivo', monto:1000, fecha:'2026-09-14', nota:'100', comps:['SHARED'] },
                                                             { envio:true, metodo:'Efectivo', monto:50, fecha:'2026-09-21', nota:'100', comps:['SHARED'] } ] }) ];
    editor('a8',1); var d8=await borrar('a8',1); var b8=window._borradas.slice(), p8=findById('a8');
    editor('a9',1); var d9=await borrar('a9',1); var b9=window._borradas.slice();
    return { d8:d8, b8:b8, porCobrar:envioPorCobrar(p8), d9:d9, b9:b9 };
  });
  q = ult();
  chk('a8 · la pregunta dice «el recargo por entrega de Bs 60,00» y «El resto de la venta no se toca»', /recargo por entrega de Bs 60,00/.test(D.vistos[D.vistos.length-2]||'') && /El resto de la venta no se toca/.test(D.vistos[D.vistos.length-2]||''), (D.vistos[D.vistos.length-2]||'').slice(0,300));
  chk('a8 · se fue el QR 60; el pactado de 100 sigue por cobrar; el saldo de la venta no cambió (1.000); su foto a la papelera',
      r.d8 && r.d8.envios.length===1 && r.d8.envios[0].monto===100 && !r.d8.envios[0].cobrado && r.porCobrar===100 && r.d8.saldo===1000 && r.d8.pagos.length===1 && JSON.stringify(r.b8)==='["Q60"]',
      r.d8 && [r.d8.envios, r.porCobrar, r.d8.saldo, r.b8]);
  chk('a9 · el flete compartía la imagen con el adelanto (§4fy): se va el flete, la imagen NO va a la papelera', r.d9 && r.d9.envios.length===0 && r.d9.pagos.length===1 && r.d9.pagos[0].comps[0]==='SHARED' && r.b9.length===0, r.d9 && [r.d9.envios, r.d9.pagos, r.b9]);

  // ═══ A7. PAGADA sin monto ══════════════════════════════════════════════════════════════════════════
  console.log('\n── A7. El pago de mentira de una «PAGADA sin monto» no se borra ──');
  r = await ev(async () => {
    STATE=[ V({ id:'a10', pagado:true, saldo:0, acuenta:0, suelto:'Efectivo %S1' }) ];
    var mp=findById('a10').metodoPago;
    var d=await borrar('a10',0);
    return { igual:d.mp===mp, pagado:d.pagado, saves:window._saves.length, borradas:window._borradas.length, toasts:window._toasts.slice() };
  });
  chk('se niega y lo dice («no tiene monto anotado»); nada cambia, nada se guarda', r.igual && r.pagado===true && r.saves===0 && r.borradas===0 && r.toasts.some(t=>/err: .*no tiene monto anotado/.test(t)), r);

  // ═══ A8. Registrada en el sistema contable ════════════════════════════════════════════════════════
  console.log('\n── A8. Venta ✅ cargada en el sistema contable: borrar avisa y la marca sigue ──');
  r = await ev(async () => {
    STATE=[ V({ id:'a11', reg:true, acuenta:1000, saldo:400, lineas:[ { anticipo:true, metodo:'Efectivo', monto:1000, fecha:'2026-09-14', nota:'100' },
                                                                      { metodo:'QR', banco:'BISA', monto:600, fecha:'2026-09-20', nota:'777', comps:['Q777'] } ] }) ];
    editor('a11',1); var d=await borrar('a11',1);
    return { d:d };
  });
  q = ult();
  chk('la pregunta avisa: «figura ✅ CARGADA en el sistema contable… corregirlo también allá»', /CARGADA en el sistema contable/.test(q) && /corregirlo también allá/.test(q), q.slice(-260));
  chk('…la marca REGISTRADO sigue, y falta cobrar 1.000', r.d && r.d.reg===true && r.d.saldo===1000, r.d && [r.d.reg, r.d.saldo, r.d.mp]);

  // ═══ B. ✅→📥 Un pago NUEVO saca la marca ════════════════════════════════════════════════════════════
  console.log('\n── B. Un pago NUEVO sobre una venta ✅ cargada la devuelve a «📥 sin cargar», y lo dice ──');
  r = await ev(async () => {
    var L=function(){ return [ { anticipo:true, metodo:'Efectivo', monto:1000, fecha:'2026-09-14', nota:'100' } ]; };
    STATE=[ V({ id:'b1', reg:true, acuenta:1000, saldo:1000, lineas:L() }),                       // Administración: applyPaid
            V({ id:'b2', reg:true, acuenta:1000, saldo:400, lineas:[ L()[0], { metodo:'QR', banco:'BISA', monto:600, fecha:'2026-09-20', nota:'777', comps:['Q777'] } ] }),  // corregir
            V({ id:'b3', reg:true, pagado:true, saldo:0, acuenta:0, suelto:'Efectivo %S2' }),      // anotar el monto
            V({ id:'b4', reg:true, acuenta:1000, saldo:1000, lineas:L() }),                       // chofer
            V({ id:'b5', reg:true, acuenta:1000, saldo:1000, lineas:[ L()[0], { envio:true, metodo:'', monto:100 } ] }),   // flete cobrado nuevo
            V({ id:'b6', reg:true, acuenta:1000, saldo:1000, lineas:[ L()[0], { envio:true, metodo:'QR', banco:'BISA', monto:450, fecha:'2026-09-21', nota:'980', comps:['QR980'] } ] }) ];  // ↩️ era un pago
    var out={};
    // b1 · Administración (💵 / 💰 → applyPaid)
    window._toasts=[]; applyPaid(findById('b1'),'QR','BISA'); await esperar(60);
    out.b1={ f:foto(findById('b1')), toasts:window._toasts.slice() };
    // b2 · CORREGIR el QR (600 → 650) desde el editor: mismo renglón, la marca sigue
    window._toasts=[]; editor('b2',1); document.getElementById('cta-ed-monto').value='650'; ctaGuardarPago('b2',1); await esperar(120);
    out.b2={ f:foto(findById('b2')), toasts:window._toasts.slice() };
    return out;
  });
  chk('b1 · 💵 de Administración sobre una venta ✅: queda pagada, SIN la marca, y el aviso dice «vuelve a «sin cargar»»',
      r.b1 && r.b1.f.pagado===true && r.b1.f.reg===false && r.b1.toasts.some(t=>/err: ✅→📥 .*este pago nuevo.*vuelve a «sin cargar»/.test(t)), r.b1 && [r.b1.f.reg, r.b1.f.pagado, r.b1.toasts]);
  chk('b2 · CORREGIR un pago (600 → 650) no la saca: sigue ✅ y el monto cambió', r.b2 && r.b2.f.reg===true && r.b2.f.pagos.some(x=>!x.ant && x.monto===650) && !r.b2.toasts.some(t=>/✅→📥/.test(t)), r.b2 && [r.b2.f.reg, r.b2.f.pagos, r.b2.toasts]);

  D.prompt='2000';
  r = await ev(async () => { window._toasts=[]; ctaAnotarMonto('b3',0); await esperar(120); return { f:foto(findById('b3')), toasts:window._toasts.slice() }; });
  chk('b3 · anotarle el monto a una «PAGADA sin monto» ✅ no es un pago nuevo: el pago pasa a ser real (2.000) y la marca sigue',
      r.f && r.f.reg===true && r.f.pagos.length===1 && r.f.pagos[0].monto===2000 && !r.f.pagos[0].sinMonto && !r.toasts.some(t=>/✅→📥/.test(t)), r.f && [r.f.reg, r.f.pagos, r.f.mp]);
  D.prompt='1000';
  r = await ev(async () => { window._toasts=[]; choCobrarMetodo('b4','Efectivo'); await esperar(120); return { f:foto(findById('b4')), toasts:window._toasts.slice() }; });
  D.prompt=null;
  chk('b4 · el cobro del CHOFER en la puerta sobre una venta ✅: pagada, sin la marca, con el aviso',
      r.f && r.f.pagado===true && r.f.reg===false && r.toasts.some(t=>/✅→📥/.test(t)), r.f && [r.f.reg, r.f.pagado, r.toasts]);
  r = await ev(async () => {
    var out={};
    window._toasts=[]; var p5=findById('b5');
    aplicarEnvios(p5, [ { envio:true, metodo:'QR', banco:'BISA', monto:100, fecha:'2026-10-02', nota:'100', comps:['F1'] } ]); await esperar(60);
    out.b5={ f:foto(p5), toasts:window._toasts.slice() };
    window._toasts=[]; showContaModal('b6');
    var b=Array.prototype.filter.call(document.querySelectorAll('#modal button'), function(x){ return /Era un pago de la venta/.test(x.innerText); });
    if(b.length){ b[0].click(); await esperar(150); }
    out.b6={ hubo:b.length, f:foto(findById('b6')), toasts:window._toasts.slice() };
    return out;
  });
  chk('b5 · un RECARGO cobrado nuevo también la saca («este recargo cobrado»)', r.b5 && r.b5.f.reg===false && r.b5.f.envios.length===1 && r.b5.f.envios[0].cobrado && r.b5.toasts.some(t=>/✅→📥 .*este recargo cobrado/.test(t)), r.b5 && [r.b5.f.reg, r.b5.f.envios, r.b5.toasts]);
  chk('b6 · «↩️ Era un pago de la venta» (§4gr) NO es plata nueva: pasa a los pagos y la marca sigue', r.b6 && r.b6.hubo===1 && r.b6.f.reg===true && r.b6.f.pagos.some(x=>!x.ant && !x.env && x.monto===450) && r.b6.f.saldo===550, r.b6 && [r.b6.hubo, r.b6.f.reg, r.b6.f.pagos, r.b6.f.saldo]);

  // ═══ B2. Desde el formulario: «SÍ, pagado» sobre una venta ✅ con pagos sin saldar ══════════════════
  console.log('\n── B2. Formulario: «SÍ, pagado» sobre una venta ✅ con saldo anota el cobro de hoy y la devuelve a «sin cargar» ──');
  r = await ev(async () => {
    STATE=[ V({ id:'b7', reg:true, fecha:'2026-10-06', entregado:false, acuenta:1000, saldo:1000, lineas:[ { anticipo:true, metodo:'Efectivo', monto:1000, fecha:'2026-09-14', nota:'100', comps:['REC100'] } ] }) ];
    showView('mis'); await esperar(150);
    editPedido('b7'); await esperar(300);
    document.querySelector('#f-pagado button[data-val="SI"]').click(); await esperar(60);
    var propuesto=document.getElementById('f-cobrado').value;
    FORM_COMPS=compsArr(FORM_COMPS).concat(['IMGNEW7']);
    window._toasts=[]; window._saves=[];
    submitPedido(); await esperar(900);
    var p=findById('b7');
    return { propuesto:propuesto, f:foto(p), saves:window._saves.length, toasts:window._toasts.slice(), enForm:document.getElementById('view-form').classList.contains('active') };
  });
  chk('b7 · «SÍ, pagado» propone el total (2.000) y guarda un cobro NUEVO de hoy por 1.000; la venta queda pagada',
      r.propuesto==='2000' && r.f && r.f.pagado===true && r.f.pagos.some(x=>!x.ant && x.monto===1000 && x.fecha==='2026-10-02') && r.f.pagos.some(x=>x.ant && x.monto===1000 && x.fecha==='2026-09-14'), r.f ? [r.propuesto, r.f.pagos, r.f.pagado, r.toasts, r.enForm] : r);
  chk('b7 · …SIN la marca ✅, y el aviso verde dice que vuelve a «📥 sin cargar al sistema contable»',
      r.f && r.f.reg===false && r.toasts.some(t=>/ok: Cambios guardados.*vuelve a «📥 sin cargar al sistema contable»/.test(t)), r.f && [r.f.reg, r.f.mp, r.toasts]);

  // ═══ C. 💵 ¿Quién recibió el efectivo? ═════════════════════════════════════════════════════════════
  console.log('\n── C. Administración: con chofer y el camión ya salido, pregunta quién recibió el efectivo ──');
  r = await ev(async () => {
    var L=function(){ return [ { anticipo:true, metodo:'Efectivo', monto:1000, fecha:'2026-09-14', nota:'100' } ]; };
    STATE=[ V({ id:'c1', chofer:'Luis Pierre', entregado:true, fecha:'2026-10-01', acuenta:1000, saldo:1000, lineas:L() }),
            V({ id:'c2', chofer:'Luis Pierre', entregado:true, fecha:'2026-10-01', acuenta:1000, saldo:1000, lineas:L() }),
            V({ id:'c3', chofer:'', entregado:true, fecha:'2026-10-01', acuenta:1000, saldo:1000, lineas:L() }),
            V({ id:'c4', chofer:'Luis Pierre', entregado:false, fecha:'2026-10-06', acuenta:1000, saldo:1000, lineas:L() }),
            V({ id:'c5', chofer:'Luis Pierre', entregado:false, fecha:'2026-10-02', acuenta:1000, saldo:1000, lineas:L() }),
            V({ id:'c6', chofer:'Luis Pierre', entregado:true, fecha:'2026-10-01', acuenta:1000, saldo:1000, lineas:L() }),
            V({ id:'c7', chofer:'Luis Pierre', entregado:true, fecha:'2026-10-01', acuenta:1000, saldo:1000, lineas:L() }) ];
    var out={};
    // c1 · 💰 de la tabla → modal → el chofer
    try{ closeModal(); }catch(e){}
    window._saves=[]; window._toasts=[]; quickCobrado('c1'); await esperar(80);
    var txt=modalTxt(), botones=Array.prototype.map.call(document.querySelectorAll('#modal button'), function(b){ return b.innerText.replace(/\s+/g,' ').trim(); });
    var sinGuardar=window._saves.length;
    await clickModal(/El chofer Luis Pierre/);
    var p1=findById('c1');
    out.c1={ txt:txt, botones:botones, sinGuardar:sinGuardar, f:foto(p1), quien:cobrosDe(p1).map(function(c){ return pagoRecibio(c,p1); }), toasts:window._toasts.slice(), abierto:modalTxt() };
    // c2 · → la vendedora
    window._toasts=[]; quickCobrado('c2'); await esperar(80); await clickModal(/la vendedora/);
    var p2=findById('c2'); out.c2={ f:foto(p2), quien:cobrosDe(p2).map(function(c){ return pagoRecibio(c,p2); }), toasts:window._toasts.slice() };
    // c3 · sin chofer: directo, como siempre
    window._saves=[]; quickCobrado('c3'); await esperar(80); out.c3={ modal:modalTxt(), f:foto(findById('c3')), saves:window._saves.length };
    // c4 · con chofer pero el camión todavía no salió: directo
    window._saves=[]; quickCobrado('c4'); await esperar(80); out.c4={ modal:modalTxt(), f:foto(findById('c4')), saves:window._saves.length };
    // c5 · el camión sale HOY: pregunta
    window._saves=[]; quickCobrado('c5'); await esperar(80); out.c5={ modal:modalTxt(), saves:window._saves.length }; try{ closeModal(); }catch(e){}
    // c6 · desde la ficha (💵 Efectivo = markPaid): pregunta; Cancelar vuelve a la ficha sin guardar; QR va directo
    showPedidoModal('c6'); window._saves=[]; markPaid('c6','Efectivo'); await esperar(80);
    var m6=modalTxt(); await clickModal(/^Cancelar$/); var m6b=modalTxt(), s6=window._saves.length;
    markPaid('c6','QR','BISA'); await esperar(80);
    out.c6={ pregunta:m6, volvio:m6b, sinGuardar:s6, f:foto(findById('c6')), modal:modalTxt() };
    // c7 · otro chofer del desplegable
    try{ closeModal(); }catch(e){}
    quickCobrado('c7'); await esperar(80);
    var sel=document.querySelector('#modal select'); var opciones=sel?Array.prototype.map.call(sel.options, function(o){ return o.text; }):[];
    admCobrarEfectivo('c7','Ysrael','tabla'); await esperar(80);
    var p7=findById('c7'); out.c7={ opciones:opciones, quien:cobrosDe(p7).map(function(c){ return pagoRecibio(c,p7); }), f:foto(p7) };
    // el Cuadre: el efectivo de c1 lo tiene Luis Pierre (chofer), el de c2 Mirian
    segSet('cua-mode','mes'); var cm=document.getElementById('cua-mes'); if(cm) cm.value='2026-10';
    var ce=cuadreEfectivo(); out.cuadre=ce.filas.map(function(f){ return [f.nombre, f.chofer, f.cobrado]; });
    return out;
  });
  chk('c1 · 💰 de la tabla con chofer y entregado: pregunta «¿Quién recibió la plata?» con «🚚 El chofer Luis Pierre» y «🧑‍💼 Mirian Salazar (la vendedora)», sin guardar todavía',
      r.c1 && /Quién recibió la plata/.test(r.c1.txt) && r.c1.botones.some(t=>/El chofer Luis Pierre/.test(t)) && r.c1.botones.some(t=>/Mirian Salazar \(la vendedora\)/.test(t)) && r.c1.sinGuardar===0, r.c1 ? [r.c1.botones, r.c1.sinGuardar, (r.c1.txt||'').slice(0,120)] : r);
  chk('c1 · …«El chofer»: cobro Efectivo 1.000 de hoy «>Luis Pierre», pagada, el aviso dice «lo tiene Luis Pierre», la ventana se cierra',
      r.c1 && r.c1.f.pagado===true && r.c1.quien[0]==='Luis Pierre' && r.c1.f.pagos.some(x=>!x.ant && x.met==='Efectivo' && x.monto===1000 && x.rec==='Luis Pierre' && x.fecha==='2026-10-02') && r.c1.toasts.some(t=>/ok: Cobrado en efectivo ✓ — lo tiene Luis Pierre/.test(t)) && !/Quién recibió/.test(r.c1.abierto), r.c1 && [r.c1.f.pagos, r.c1.quien, r.c1.toasts, (r.c1.abierto||'').slice(0,60)]);
  chk('c2 · …«la vendedora»: el cobro queda sin «>», en la mano de Mirian', r.c2 && r.c2.f.pagado===true && r.c2.quien[0]==='Mirian Salazar' && r.c2.f.pagos.some(x=>!x.ant && x.rec==='') && r.c2.toasts.some(t=>/queda con la vendedora/.test(t)), r.c2 && [r.c2.quien, r.c2.f.pagos, r.c2.toasts]);
  chk('c3 · SIN chofer: no pregunta, cobra directo (como siempre)', r.c3 && !/Quién recibió/.test(r.c3.modal) && r.c3.f.pagado===true && r.c3.saves===1, r.c3 && [r.c3.saves, r.c3.f.pagado, (r.c3.modal||'').slice(0,60)]);
  chk('c4 · con chofer pero entrega el martes que viene (el camión no salió): tampoco pregunta', r.c4 && !/Quién recibió/.test(r.c4.modal) && r.c4.f.pagado===true && r.c4.saves===1, r.c4 && [r.c4.saves, r.c4.f.pagado]);
  chk('c5 · el camión sale HOY: pregunta', r.c5 && /Quién recibió la plata/.test(r.c5.modal) && r.c5.saves===0, r.c5 && [r.c5.saves, (r.c5.modal||'').slice(0,80)]);
  chk('c6 · desde la ficha (💵 Efectivo): pregunta; «Cancelar» vuelve a la ficha sin guardar; 📱 QR BISA no pregunta y cobra',
      r.c6 && /Quién recibió la plata/.test(r.c6.pregunta) && /CLIENTE/.test(r.c6.volvio) && !/Quién recibió/.test(r.c6.volvio) && r.c6.sinGuardar===0 && r.c6.f.pagado===true && r.c6.f.pagos.some(x=>!x.ant && x.met==='QR BISA'),
      r.c6 && [r.c6.sinGuardar, r.c6.f.pagos, (r.c6.volvio||'').slice(0,60), (r.c6.pregunta||'').slice(0,60)]);
  chk('c7 · el desplegable trae a los otros choferes (Ysrael, Luis Eyzaguirre…), sin el del pedido; elegir uno lo anota a su nombre',
      r.c7 && r.c7.opciones.some(t=>/Ysrael/.test(t)) && r.c7.opciones.some(t=>/Eyzaguirre/.test(t)) && !r.c7.opciones.some(t=>/Luis Pierre/.test(t)) && r.c7.quien[0]==='Ysrael' && r.c7.f.pagado===true, r.c7 && [r.c7.opciones, r.c7.quien]);
  chk('el Cuadre «Efectivo cobrado vs. retirado» se la pide al chofer: Luis Pierre (chofer) con 1.000, Ysrael con 1.000, y Mirian con lo suyo',
      r.cuadre && r.cuadre.some(f=>f[0]==='Luis Pierre' && f[1]===true && f[2]===1000) && r.cuadre.some(f=>f[0]==='Ysrael' && f[1]===true && f[2]===1000) && r.cuadre.some(f=>/Mirian/.test(f[0]) && f[1]===false && f[2]>=1000), r.cuadre);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
