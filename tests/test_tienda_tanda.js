/* 🏪 LAS VENTAS DE TIENDA EN TANDA (plan del jueves 05/11, item 93; dueño: «Me encanta todo»)
   Charcas carga sus ventas en tandas semanales (42 en 128 min en octubre). Después de cada una el panel saltaba a Contabilidad y había que
   volver y elegir la tienda; y 20 de las 26 con foto quedaron con el día de la carga en vez del de la venta.

   LO QUE CUIDA:
   1. «💾 Guardar y cargar la próxima» solo en una venta de tienda NUEVA (no en un pedido con entrega, no corrigiendo una venta vieja).
   2. Guarda por el MISMO camino que «Registrar venta de tienda» y vuelve al formulario de tienda VACÍO, con la misma tienda y vendedora;
      la ventana para pasar la venta al grupo sale igual. «Registrar venta de tienda» sigue yendo a Contabilidad.
   3. Si el servidor dice que no, el formulario queda como estaba (no se pierde lo escrito).
   4. 📅 La IA leyó la foto del pago y es de un día ANTERIOR a hoy → ese día se pone solo en «Fecha de la venta» (§4nm) y se dice, con
      «No, fue el…» para volver. Se guarda con ese día. Nunca un día después de hoy, nunca encima de lo que la persona escribió a mano, y
      corrigiendo una venta vieja se sigue preguntando («¿la venta fue ese día? [Sí]»).
   Reloj CLAVADO (jueves 05/11/2026, 10:00 de Bolivia). Servidor de mentira; datos inventados.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_tienda_tanda.js */
const { chromium } = require('playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async()=>{
  const browser = await chromium.launch();
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1300, height:950 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
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
    try{ IAS_JUNTA_MS=20; IAS_ESPERA_MS=30; }catch(e){}
    STATE=[
      { id:'v1', oc:'10-050', nota:'5050', cliente:'VENTA VIEJA INVENTADA', celular:'70000050', fecha:'', turno:'', zona:'TIENDA', direccion:'SALIÓ DE TIENDA · Charcas',
        vendedor:'Fernando Peinado', productos:[{ desc:'COLCHON SOFT', medida:'140x190', cant:1, precio:990 }], saldo:0, acuenta:0, pagado:true, entregado:true, verificado:true,
        ts:new Date('2026-10-28T11:00:00-04:00').getTime(), rev:2,
        metodoPago:textoCobros([{ metodo:'QR', banco:'Económico', monto:990, fecha:'2026-10-28', nota:'5050', comps:['vq1'] }]) }
    ];
    var norm=function(o){ return Object.assign({ cp:true, le:true, m:0, mo:'BOB', f:'', h:'', bo:'', bd:'', de:'', or:'', ref:'', ti:'qr', no:'', t:1, md:'x', pv:2 }, o); };
    var S=window.__S={ guardado:{}, llamadas:[],
      lee:{ t1:{ m:990, bd:'Económico', f:'2026-10-29', ref:'T1000001' }, t2:{ m:990, bd:'Económico', f:'2026-11-06', ref:'T2000002' },
            t3:{ m:990, bd:'Económico', f:'2026-10-30', ref:'T3000003' }, t4:{ m:990, bd:'Económico', f:'2026-10-31', ref:'T4000004' },
            vq2:{ m:990, bd:'Económico', f:'2026-10-20', ref:'VQ200002' } } };
    apiPost=function(b){
      b=JSON.parse(JSON.stringify(b)); S.llamadas.push(b);
      if(b.action!=='iaComprobantes') return Promise.resolve({ ok:true });
      var res={}, faltan=[];
      (b.fotos||[]).forEach(function(f){ if(S.guardado[f]) res[f]=S.guardado[f]; else faltan.push(f); });
      var r={ ok:true, version:'2026-10-26-b', res:res, faltan:faltan, pendientes:[], leidas:0, usd:0, dia:{ d:'2026-11-05', n:0, usd:0 }, estado:'' };
      if(!b.leer) faltan.forEach(function(f){ var o=norm(S.lee[f] || { m:1, f:'' }); S.guardado[f]=o; res[f]=o; r.leidas++; });
      return Promise.resolve(r);
    };
    window.__srvNo=false; window._saves=[];
    apiSave=function(r){ var g=JSON.parse(JSON.stringify(r)); window._saves.push(g);
      if(window.__srvNo) return Promise.resolve({ ok:false, error:'invalido' });
      return Promise.resolve({ ok:true, pedido:g }); };
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
    fotoCronometro=function(){ return Promise.resolve('data:image/png;base64,xx'); };
    subirFoto=function(){ return Promise.resolve({ ok:true, fotoId:(window._ids||[]).shift()||'x' }); };
    window._esp=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
    window._subir=async function(id){ window._ids=[id]; COMP_DESTINO=1; await onCompFormElegido({ target:{ files:[{}] } }); await _esp(80); };
    window._llenar=function(cli, nota){
      document.getElementById('f-vendedor').value='Fernando Peinado'; try{ applyVendedorLite(); }catch(e){}
      document.getElementById('f-tienda-suc').value='Charcas';
      document.getElementById('f-cliente').value=cli; document.getElementById('f-celular').value='70000099';
      document.getElementById('f-nota').value=nota;
      var pd=document.querySelector('#f-productos .prod-desc'); pd.value='COLCHON SOFT';
      document.querySelector('#f-productos .prod-medida').value='140x190'; document.querySelector('#f-productos .prod-cant').value='1';
      var pp=document.querySelector('#f-productos .prod-precio'); if(pp) pp.value='990';
      segSet('f-pagado','SI'); updateMetodoVisibility(); document.getElementById('f-cobrado').value='990';
      segSet('f-metodo','QR'); updateBancoVisibility(); segSet('f-banco','Económico');
      FORM_COMPS=[]; renderCompForm(true);
    };
    window._t=function(id){ var e=document.getElementById(id); return e ? e.textContent.replace(/\s+/g,' ').trim() : ''; };
    window._vis=function(id){ var e=document.getElementById(id); return !!(e && !e.hidden && e.offsetParent); };
    window._nueva=function(cli){ return STATE.filter(function(p){ return p.cliente===cli; })[0]||null; };
    return true;
  });
  chk('0. arma el panel de prueba', r0===true, r0);

  /* 1 · dónde aparece el botón */
  const r1 = await ev(async () => {
    var o={};
    abrirVentaTienda(); await _esp(50); o.tienda=_vis('f-submit-prox'); o.txt=_t('f-submit-prox');
    cancelarVentaTienda(); showView('form'); await _esp(50); o.pedido=_vis('f-submit-prox');
    showView('form'); editPedido('v1'); await _esp(80); o.editando=_vis('f-submit-prox'); o.esTienda=VENTA_TIENDA;
    cancelEdit(); await _esp(50);
    return o;
  });
  chk('1a. en una venta de tienda NUEVA está «💾 Guardar y cargar la próxima»', r1.tienda && /Guardar y cargar la próxima/.test(r1.txt), r1);
  chk('1b. en un pedido con entrega no está', !r1.pedido, r1);
  chk('1c. corrigiendo una venta de tienda vieja tampoco', r1.esTienda && !r1.editando, r1);

  /* 2 · «Guardar y cargar la próxima» */
  const r2 = await ev(async () => {
    var o={};
    showView('form'); abrirVentaTienda(); await _esp(30); _llenar('CLIENTE TANDA UNO', '9101');
    await _subir('t3'); await _esp(60);
    window._saves=[]; document.getElementById('f-submit-prox').click(); await _esp(500);
    var p=_nueva('CLIENTE TANDA UNO');
    o.guardo=!!p && window._saves.length===1; o.dir=p && p.direccion; o.tienda=!!p && esVentaTienda(p); o.fecha=p ? p.fecha : '?';
    o.vista=(document.querySelector('.view.active')||{}).id; o.modoTienda=VENTA_TIENDA;
    o.suc=document.getElementById('f-tienda-suc').value; o.vend=document.getElementById('f-vendedor').value;
    o.cli=document.getElementById('f-cliente').value; o.nota=document.getElementById('f-nota').value;
    o.prod=document.querySelector('#f-productos .prod-desc').value; o.comps=FORM_COMPS.length;
    o.fv=document.getElementById('f-fecha-venta').value; o.boton=_vis('f-submit-prox');
    var m=document.getElementById('modal'); o.wa=!!(m && m.classList.contains('on')) && /Pedido guardado/.test(m.textContent) && /CLIENTE TANDA UNO/.test((document.getElementById('wa-text')||{}).value||'');
    closeModal(); await _esp(50);
    o.despues=(document.querySelector('.view.active')||{}).id;
    o.medio=formNuevoHuella()!==FORM_NUEVO_BASE;
    return o;
  });
  chk('2a. guardó la venta como venta de tienda de Charcas (sin fecha de entrega, una sola vez)', r2.guardo && r2.tienda && /Charcas/.test(r2.dir) && r2.fecha==='', r2);
  chk('2b. vuelve al formulario de TIENDA, vacío, con la misma tienda y la misma vendedora', r2.vista==='view-form' && r2.modoTienda && r2.suc==='Charcas' &&
    r2.vend==='Fernando Peinado' && r2.cli==='' && r2.nota==='' && r2.prod==='' && r2.comps===0 && r2.boton, r2);
  chk('2c. la «Fecha de la venta» arranca en hoy otra vez', r2.fv==='2026-11-05', r2);
  chk('2d. la ventana para pasar la venta al grupo sale igual, y al cerrarla queda en el formulario (sin «a medio llenar»)', r2.wa && r2.despues==='view-form' && !r2.medio, r2);

  const r2e = await ev(async () => {
    _llenar('CLIENTE TANDA DOS', '9102'); await _subir('t4'); await _esp(60);
    document.getElementById('f-submit').click(); await _esp(500);
    var o={ vista:(document.querySelector('.view.active')||{}).id, modoTienda:VENTA_TIENDA, guardo:!!_nueva('CLIENTE TANDA DOS') };
    closeModal(); return o;
  });
  chk('2e. «Registrar venta de tienda» sigue como siempre: guarda y va a Contabilidad', r2e.guardo && r2e.vista==='view-conta' && !r2e.modoTienda, r2e);

  /* 3 · el servidor dice que no: el formulario queda */
  const r3 = await ev(async () => {
    showView('form'); abrirVentaTienda(); await _esp(30); _llenar('CLIENTE RECHAZADO', '9103');
    window.__srvNo=true; document.getElementById('f-submit-prox').click(); await _esp(500); window.__srvNo=false;
    return { cli:document.getElementById('f-cliente').value, tienda:VENTA_TIENDA, en:!!_nueva('CLIENTE RECHAZADO'), vista:(document.querySelector('.view.active')||{}).id };
  });
  chk('3. con un «no» del servidor no guarda y deja lo escrito en el formulario de tienda', r3.cli==='CLIENTE RECHAZADO' && r3.tienda && !r3.en && r3.vista==='view-form', r3);

  /* 4 · 📅 la fecha de la foto */
  const r4 = await ev(async () => {
    var o={}; window.IAC_SUBIR_PRUEBA=1; __S.llamadas=[];
    showView('form'); abrirVentaTienda(); await _esp(30); _llenar('CLIENTE FOTO VIEJA', '9104');
    o.fv0=document.getElementById('f-fecha-venta').value;
    await _subir('t1'); await _esp(300);
    o.fv=document.getElementById('f-fecha-venta').value; o.aviso=_t('ias-f1');
    o.btn=[].map.call(document.querySelectorAll('#ias-f1 button'), function(b){ return b.textContent; });
    window._saves=[]; document.getElementById('f-submit-prox').click(); await _esp(500);
    var p=_nueva('CLIENTE FOTO VIEJA');
    o.dia=p ? isoDeTsBolivia(p.ts) : ''; o.pagos=p ? contaPagos(p).map(function(c){ return c.fecha+' '+c.monto; }) : [];
    o.fvSig=document.getElementById('f-fecha-venta').value;
    closeModal(); return o;
  });
  chk('4a. la foto del pago es del 29/10 (hoy 05/11): la «Fecha de la venta» pasa sola al 29/10', r4.fv0==='2026-11-05' && r4.fv==='2026-10-29', r4);
  chk('4b. …y lo dice, con «No, fue el 05/11» para volver (sin la pregunta de antes)', /Puse el 29\/10 como «Fecha de la venta»/.test(r4.aviso) &&
    r4.btn.some(t=>/No, fue el 05\/11/.test(t)) && !/¿la venta fue ese día\?/.test(r4.aviso), r4);
  chk('4c. se guarda con ese día: la venta y su pago son del 29/10', r4.dia==='2026-10-29' && JSON.stringify(r4.pagos)===JSON.stringify(['2026-10-29 990']), r4);
  chk('4d. la venta siguiente arranca otra vez en hoy', r4.fvSig==='2026-11-05', r4);

  const r5 = await ev(async () => {
    var o={};
    _llenar('CLIENTE DESHACE', '9105'); await _subir('t3'); await _esp(300);
    o.fv=document.getElementById('f-fecha-venta').value;
    var b=[].filter.call(document.querySelectorAll('#ias-f1 button'), function(x){ return /No, fue el/.test(x.textContent); })[0]; if(b) b.click();
    await _esp(300);
    o.fvDesh=document.getElementById('f-fecha-venta').value; o.aviso=_t('ias-f1');
    VENTA_TIENDA=false; resetForm(); pintarModoTienda(); return o;
  });
  chk('5. «No, fue el 05/11» la vuelve a hoy y ya no la cambia sola (queda la pregunta de siempre)', r5.fv==='2026-10-30' && r5.fvDesh==='2026-11-05' && /¿la venta fue ese día\?/.test(r5.aviso), r5);

  /* 6 · lo que NO se toca */
  const r6 = await page.evaluate(async () => {
    showView('form'); abrirVentaTienda(); await _esp(30); _llenar('CLIENTE FOTO FUTURA', '9106');
    await _subir('t2'); await _esp(300);
    return { fv:document.getElementById('f-fecha-venta').value };
  });
  chk('6a. una foto con fecha DESPUÉS de hoy no cambia nada', r6.fv==='2026-11-05', r6);
  await ev(async () => { VENTA_TIENDA=false; resetForm(); pintarModoTienda(); showView('form'); abrirVentaTienda(); await _esp(30); _llenar('CLIENTE A MANO', '9107'); });
  await page.fill('#f-fecha-venta', '2026-11-02');
  const r6b = await ev(async () => { await _subir('t1'); await _esp(300); return { fv:document.getElementById('f-fecha-venta').value, aviso:_t('ias-f1') }; });
  chk('6b. una fecha que la persona escribió a mano no se pisa (sale la pregunta con «Sí»)', r6b.fv==='2026-11-02' && /¿la venta fue ese día\?/.test(r6b.aviso), r6b);
  const r6c = await ev(async () => {
    VENTA_TIENDA=false; resetForm(); pintarModoTienda();
    showView('form'); editPedido('v1'); await _esp(100);
    window._ids=['vq2']; COMP_DESTINO=1; await onCompFormElegido({ target:{ files:[{}] } }); await _esp(350);
    var o={ fv:document.getElementById('f-fecha-venta').value, aviso:_t('ias-f1') };
    cancelEdit(); return o;
  });
  chk('6c. corrigiendo una venta vieja no se cambia sola: sigue preguntando', r6c.fv==='2026-10-28' && /¿la venta fue ese día\?/.test(r6c.aviso), r6c);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
