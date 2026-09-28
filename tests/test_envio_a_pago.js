/* ↩️ UN RECARGO POR ENTREGA QUE ERA UN PAGO DE LA VENTA (dueño, 28/09).

   *«¿Cómo borro los recargos por entrega? No eran recargos por entrega sino pagos»* → *«sí, hacelo y mostrame»*.
   Las vendedoras anotaban cobros de la venta en «🚚 Recargo por entrega». «🗑 Quitar el recargo» se lleva la foto del recibo
   y la plata desaparece de la venta. El botón nuevo, «↩️ Era un pago de la venta», pasa ESE renglón cobrado a los pagos tal
   cual (fecha, monto, método, banco, nota, quién la recibió, fotos) y el saldo se recalcula; el total de la venta no cambia.

   ⚠️ LO QUE ESTA PRUEBA CUIDA (falla contra lo publicado, `7fe7551`, que no tiene el botón):
   1. El botón está en el recargo COBRADO, no en los pagos de la venta ni en un recargo pactado.
   2. Pasa el renglón tal cual: fecha, monto, método y banco, nota, fotos; el anticipo no se toca; ninguna foto a la papelera;
      UN solo guardado; el saldo baja lo que entró y el total de la venta es el mismo.
   3. Cancelar no toca nada.
   4. Venta YA pagada: queda «cobrada de más» y la pregunta lo dice; quién recibió el efectivo (el chofer) se conserva.
   5. Dos recargos [pactado 100, cobrado QR 60]: pasa el cobrado; el pactado sigue por cobrar.
   6. Venta REGISTRADA en el sistema contable: la pregunta lo avisa y la marca sigue.
   7. Venta «PAGADA sin monto» (§4fg): no nace un renglón de Bs 0 y la foto del pago suelto no se pierde.
   8. Ni una ATC ni una RPT lo muestran (no se cobran).

   Datos SINTÉTICOS (el repo es público).
   Se corre:  node tests/test_envio_a_pago.js   (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/a/pedidos_7fe7551.html node tests/test_envio_a_pago.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,extra)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, extra!=null?('· '+(typeof extra==='string'?extra:JSON.stringify(extra)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1300,height:1000}, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror',e=>errores.push(e.message));
  const D = { confirm:true, vistos:[] };
  page.on('dialog', async d => { D.vistos.push(d.message()); if (D.confirm===false) await d.dismiss(); else await d.accept(); });
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.setFixedTime(new Date('2026-09-28T10:00:00-04:00'));
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
    window._saves=[];
    apiSave=function(r){ window._saves.push(JSON.parse(JSON.stringify(r))); return Promise.resolve({ok:true}); };
    apiDelete=function(){ return Promise.resolve({ok:true}); };
    window._borradas=[];
    apiBorrarFoto=function(f){ window._borradas.push(f); return Promise.resolve({ok:true}); };
    apiList=function(){ return new Promise(function(res){ setTimeout(function(){ res({ok:true, pedidos:JSON.parse(JSON.stringify(STATE.concat(RETIROS)))}); },0); }); };
    window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(k||'')+': '+String(m)); return _t(m,k,ms); };
    downloadBlob=function(){};
    /* Una venta con su historial de pagos escrito como lo escribe el panel (`textoCobros`). */
    window.V=function(o){
      var b={ id:o.id, oc:o.oc||'09-500', nota:'100', turno:'AM', celular:'7', nit:'1', zona:'Norte', direccion:'X', fecha:'2026-09-21', maps:'',
              observaciones:'', garantia:'', facturarA:'', estado:'', entregado:true, verificado:false, vehiculo:'', chofer:'', nroDia:1, fotos:[],
              vendedor:'Juan Pablo Paredes', cliente:o.cliente||'CLIENTE', ts:new Date('2026-09-14T11:00:00-04:00').getTime(),
              productos:[{desc:'COLCHON ORTOPEDICO',medida:'140x190',cant:1,precio:2000}],
              pagado:!!o.pagado, saldo:o.saldo||0, acuenta:o.acuenta||0, cobradoBs:0,
              metodoPago:(o.suelto ? (o.suelto+(o.lineas&&o.lineas.length?(' + '+textoCobros(o.lineas)):'')) : textoCobros(o.lineas||[])) };
      if(o.reg) b.metodoPago=conMarcaReg(b.metodoPago, true);
      return b;
    };
    window.foto=function(p){ return { pagos:contaPagos(p).map(function(c){ return { met:cobroMetodoTxt(c), monto:Number(c.monto)||0, fecha:c.fecha||'', nota:limpiaNota(c.nota),
                 rec:limpiaRecibio(c.recibio), comps:compsArr(c.comps!=null?c.comps:c.comp), ant:!!c.anticipo, env:!!c.envio }; }),
      envios:enviosDe(p).map(function(c){ return { met:cobroMetodoTxt(c), monto:Number(c.monto)||0 }; }),
      saldo:Number(p.saldo)||0, pagado:!!p.pagado, total:ventaTotal(p), reg:regEnSistema(p), exceso:excesoCobro(p) }; };
    /* Los botones del renglón i de PAGOS, en la ficha de Contabilidad. */
    window.botones=function(id){
      showContaModal(id);
      var out=[]; document.querySelectorAll('#modal button').forEach(function(b){ var t=b.innerText.replace(/\s+/g,' ').trim(); if(/Era un pago|Quitar el recargo/.test(t)) out.push({ t:t, on:b.getAttribute('onclick')||'' }); });
      return out;
    };
    window.tocar=async function(id){
      var b=Array.prototype.filter.call(document.querySelectorAll('#modal button'), function(x){ return /Era un pago de la venta/.test(x.innerText); });
      if(!b.length) return false;
      b[0].click(); await new Promise(function(r){ setTimeout(r,150); });
      return true;
    };
  });
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };

  // ═══ 1-2. Venta con saldo: el caso de todos los días ═══════════════════════════════════════════════
  console.log('\n── 1-2. Venta con saldo: el cobro anotado como recargo pasa a los pagos, tal cual ──');
  let r = await ev(async () => {
    STATE=[ V({ id:'v1', cliente:'CLIENTE CON SALDO', acuenta:1000, saldo:1000, lineas:[
      { anticipo:true, metodo:'Efectivo', monto:1000, fecha:'2026-09-14', nota:'100', comps:['REC100'] },
      { envio:true, metodo:'QR', banco:'BISA', monto:450, fecha:'2026-09-21', nota:'980', comps:['QR980','REC980'] } ] }) ];
    var p=findById('v1'), antes=foto(p);
    var bot=botones('v1');
    window._saves=[]; window._borradas=[];
    var ok=await tocar('v1');
    p=findById('v1');
    return { antes:antes, bot:bot, ok:ok, despues:foto(p), saves:window._saves.length, borradas:window._borradas.slice(), toasts:window._toasts.slice(-2),
             ficha:(document.querySelector('#modal')||{}).innerText||'' };
  });
  const q1 = D.vistos[D.vistos.length-1]||'';
  chk('el recargo COBRADO tiene «↩️ Era un pago de la venta», al lado de «🗑 Quitar el recargo»',
      r.bot && r.bot.some(b=>/↩️ Era un pago de la venta/.test(b.t)) && r.bot.some(b=>/Quitar el recargo/.test(b.t)), r.bot || r.__error);
  chk('…uno solo: los pagos de la venta (el anticipo) no lo tienen', r.bot && r.bot.filter(b=>/Era un pago/.test(b.t)).length===1, r.bot);
  chk('la pregunta dice qué pasa: «QR BISA Bs 450 · 21/09/2026 · nota 980 · 2 fotos» y «Bs 1.000,00 → Bs 550,00»',
      /QR BISA Bs 450,00 · 21\/09\/2026 · nota 980 · 2 fotos/.test(q1) && /Bs 1\.000,00 → Bs 550,00/.test(q1), q1.slice(0,400));
  const pagoNuevo = r.despues && r.despues.pagos.find(x=>!x.ant && !x.env);
  chk('pasó a PAGOS tal cual: QR BISA · Bs 450 · 21/09 · nota 980 · las dos fotos',
      pagoNuevo && pagoNuevo.met==='QR BISA' && pagoNuevo.monto===450 && pagoNuevo.fecha==='2026-09-21' && pagoNuevo.nota==='980' &&
      JSON.stringify(pagoNuevo.comps)==='["QR980","REC980"]', r.despues && r.despues.pagos);
  chk('…y dejó de ser recargo por entrega (no queda ninguno)', r.despues && r.despues.envios.length===0, r.despues && r.despues.envios);
  chk('el anticipo quedó igual (Efectivo 1.000 · 14/09 · nota 100 · su foto)',
      r.despues && r.despues.pagos.some(x=>x.ant && x.met==='Efectivo' && x.monto===1000 && x.fecha==='2026-09-14' && x.nota==='100' && x.comps[0]==='REC100'), r.despues && r.despues.pagos);
  chk('el saldo bajó lo que entró: 1.000 → 550, sigue sin pagar', r.despues && r.despues.saldo===550 && r.despues.pagado===false, r.despues && [r.despues.saldo, r.despues.pagado]);
  chk('el TOTAL de la venta es el mismo (2.000)', r.antes && r.despues && r.antes.total===2000 && r.despues.total===2000, r.despues && [r.antes.total, r.despues.total]);
  chk('ninguna foto a la papelera', r.borradas && r.borradas.length===0, r.borradas);
  chk('UN solo guardado', r.saves===1, r.saves);
  chk('la ficha ya lo muestra en PAGOS, sin la etiqueta de recargo', /QR BISA · Bs 450,00/.test(r.ficha) && !/RECARGO POR ENTREGA\s*\n?.*450/.test(r.ficha) && /sin recargo por entrega/.test(r.ficha), (r.ficha||'').slice(0,300));

  // ═══ 3. Cancelar ════════════════════════════════════════════════════════════════════════════════════
  console.log('\n── 3. Cancelar no toca nada ──');
  D.confirm=false;
  r = await ev(async () => {
    STATE=[ V({ id:'v2', acuenta:1000, saldo:1000, lineas:[ { anticipo:true, metodo:'Efectivo', monto:1000, fecha:'2026-09-14', nota:'100' },
                                                           { envio:true, metodo:'Efectivo', monto:450, fecha:'2026-09-21', nota:'981' } ] }) ];
    var mp=findById('v2').metodoPago; botones('v2'); window._saves=[];
    await tocar('v2');
    return { igual:findById('v2').metodoPago===mp, saves:window._saves.length };
  });
  D.confirm=true;
  chk('con «Cancelar» el historial queda igual y no se guarda nada', r.igual && r.saves===0, r);

  // ═══ 4. Venta ya pagada ═════════════════════════════════════════════════════════════════════════════
  console.log('\n── 4. Venta ya pagada: queda cobrada de más, y se dice ──');
  r = await ev(async () => {
    STATE=[ V({ id:'v3', pagado:true, saldo:0, acuenta:0, lineas:[ { anticipo:true, metodo:'Efectivo', monto:2000, fecha:'2026-09-14', nota:'100' },
                                                                  { envio:true, metodo:'Efectivo', monto:450, fecha:'2026-09-21', nota:'982', recibio:'Luis Pierre' } ] }) ];
    botones('v3'); window._toasts=[];
    await tocar('v3');
    return { despues:foto(findById('v3')), toasts:window._toasts.slice(-1) };
  });
  const q4 = D.vistos[D.vistos.length-1]||'';
  chk('la pregunta avisa: «La venta ya figuraba pagada» y «queda cobrada de MÁS por Bs 450,00… Corregilo en Corregir precios y montos»',
      /La venta ya figuraba pagada\./.test(q4) && /cobrada de MÁS por Bs 450,00/.test(q4) && /Corregir precios y montos/.test(q4) && !/Bs 0,00 → Bs 0,00/.test(q4), q4.slice(0,500));
  chk('…queda cobrada de más por 450 (saldo −450), sigue pagada', r.despues && r.despues.saldo===-450 && r.despues.pagado===true && r.despues.exceso===450, r.despues && [r.despues.saldo, r.despues.pagado, r.despues.exceso]);
  const pv = r.despues && r.despues.pagos.find(x=>!x.ant && !x.env);
  chk('…y el efectivo sigue en la mano del chofer que lo recibió (Luis Pierre)', pv && pv.rec==='Luis Pierre' && pv.met==='Efectivo' && pv.monto===450, r.despues && r.despues.pagos);
  chk('…el aviso de abajo lo dice en rojo', r.toasts && /err: .*cobrada de más por Bs 450,00/.test(r.toasts[0]||''), r.toasts);

  // ═══ 5. Dos recargos ════════════════════════════════════════════════════════════════════════════════
  console.log('\n── 5. Dos recargos [pactado 100, cobrado QR 60]: pasa el cobrado, el pactado sigue ──');
  r = await ev(async () => {
    STATE=[ V({ id:'v4', acuenta:1000, saldo:1000, lineas:[ { anticipo:true, metodo:'Efectivo', monto:1000, fecha:'2026-09-14', nota:'100' },
                                                           { envio:true, metodo:'', monto:100 },
                                                           { envio:true, metodo:'QR', banco:'BISA', monto:60, fecha:'2026-09-22', nota:'983', comps:['Q60'] } ] }) ];
    var bot=botones('v4');
    await tocar('v4');
    var p=findById('v4');
    return { bot:bot, despues:foto(p), porCobrar:envioPorCobrar(p) };
  });
  chk('un solo botón (el pactado no es plata que entró)', r.bot && r.bot.filter(b=>/Era un pago/.test(b.t)).length===1, r.bot || r.__error);
  chk('pasó el QR 60 (con su nota y su foto)', r.despues && r.despues.pagos.some(x=>!x.ant && !x.env && x.met==='QR BISA' && x.monto===60 && x.nota==='983' && x.comps[0]==='Q60'), r.despues && r.despues.pagos);
  chk('…y el pactado de 100 sigue como flete por cobrar', r.despues && r.despues.envios.length===1 && r.despues.envios[0].monto===100 && r.porCobrar===100, r.despues && [r.despues.envios, r.porCobrar]);
  chk('…el saldo de la venta bajó 60 (1.000 → 940)', r.despues && r.despues.saldo===940, r.despues && r.despues.saldo);

  // ═══ 6. Registrada en el sistema contable ═══════════════════════════════════════════════════════════
  console.log('\n── 6. Venta registrada en el sistema contable ──');
  r = await ev(async () => {
    STATE=[ V({ id:'v5', reg:true, acuenta:1000, saldo:1000, lineas:[ { anticipo:true, metodo:'Efectivo', monto:1000, fecha:'2026-09-14', nota:'100' },
                                                                     { envio:true, metodo:'Efectivo', monto:300, fecha:'2026-09-21', nota:'984' } ] }) ];
    botones('v5'); await tocar('v5');
    return { despues:foto(findById('v5')) };
  });
  const q6 = D.vistos[D.vistos.length-1]||'';
  chk('la pregunta avisa: «ya está registrada en el sistema contable: avisale a Contabilidad»', /registrada en el sistema contable: avisale a Contabilidad/.test(q6), q6.slice(-200));
  chk('…y la marca REGISTRADO sigue', r.despues && r.despues.reg===true && r.despues.saldo===700, r.despues && [r.despues.reg, r.despues.saldo]);

  // ═══ 7. PAGADA sin monto ════════════════════════════════════════════════════════════════════════════
  console.log('\n── 7. Venta «PAGADA sin monto»: no nace un Bs 0 ni se pierde la foto del pago suelto ──');
  r = await ev(async () => {
    STATE=[ V({ id:'v6', pagado:true, saldo:0, acuenta:0, suelto:'Efectivo %SUELTO1', lineas:[ { envio:true, metodo:'Efectivo', monto:300, fecha:'2026-09-21', nota:'985', comps:['F985'] } ] }) ];
    botones('v6'); window._borradas=[];
    await tocar('v6');
    var p=findById('v6');
    return { despues:foto(p), mp:p.metodoPago, borradas:window._borradas.slice() };
  });
  chk('no hay ningún renglón de Bs 0', r.despues && !/(^|\+\s*)[A-Za-zé]+\s+0(\s|$)/.test(r.mp||'') && r.despues.pagos.every(x=>x.monto>0), r.mp);
  chk('el pago nuevo tiene su foto y la del pago suelto (no se perdió ninguna)', r.despues && r.despues.pagos.some(x=>!x.env && x.comps.indexOf('F985')>=0 && x.comps.indexOf('SUELTO1')>=0) && r.borradas.length===0, [r.mp, r.borradas]);
  chk('…sigue pagada', r.despues && r.despues.pagado===true, r.despues && r.despues.pagado);

  // ═══ 8. ATC y RPT ═══════════════════════════════════════════════════════════════════════════════════
  console.log('\n── 8. Ni una ATC ni una RPT lo muestran ──');
  r = await ev(() => {
    STATE=[ V({ id:'v7', oc:'ATC 09-001', lineas:[ { envio:true, metodo:'Efectivo', monto:100, fecha:'2026-09-21', nota:'986' } ] }),
            V({ id:'v8', oc:'RPT 09-001', lineas:[ { envio:true, metodo:'Efectivo', monto:100, fecha:'2026-09-21', nota:'987' } ] }) ];
    return { atc:botones('v7'), rpt:botones('v8') };
  });
  chk('ATC: sin «Era un pago de la venta»', r.atc && !r.atc.some(b=>/Era un pago/.test(b.t)), r.atc || r.__error);
  chk('RPT: sin «Era un pago de la venta»', r.rpt && !r.rpt.some(b=>/Era un pago/.test(b.t)), r.rpt);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
