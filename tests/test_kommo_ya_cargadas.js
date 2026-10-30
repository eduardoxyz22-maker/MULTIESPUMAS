/* ✅ LAS VENTAS DE KOMMO QUE YA ESTÁN CARGADAS NO QUEDAN PENDIENTES (propuesta 81, 30/10; el dueño la eligió).
   En octubre «Para hacer» le decía a Maria «15 ventas de Kommo para completar» y a Mirian 3: 14 de las 18 ya estaban cargadas (9 con el
   mismo celular —una cargada 58 días antes: `gemeloDe` mira solo 45— y 5 con el mismo monto que el precio de Kommo).

   LO QUE CUIDA:
   1. Mismo celular (últimos 8 números) y misma vendedora → «Ya está cargada como 09-005 del 01/09», aunque se haya cargado hace 59 días
      (la entrega es el 31/10). No cuenta en «Para hacer» ni en el número de la bandeja (ni en «Para hacer · el equipo»).
   2. Una compra VIEJA del mismo cliente (cargada hace 4 meses y entregada) no es «ya cargada»: la venta nueva sigue contando.
   3. Mismo monto (±1 Bs) que Kommo, misma vendedora, cargada en los 30 días de antes, una sola así → solo SUGIERE «Parece la 10-096 del
      07/10 (Bs 8.460)» con «Sí, es la misma», y sigue contando. Con dos del mismo monto no se adivina.
   4. El mismo celular de OTRA vendedora sigue siendo «parece» (cuenta), como siempre.
   5. Arriba de la bandeja, «Unir las N que ya están cargadas» en un toque: por el MISMO camino de «Sí, es la misma» (`borrEnSerie`),
      DE A UNA (nunca dos borrados a la vez) y con el sí del servidor; cada pedido queda con la marca del lead.

   Reloj CLAVADO (viernes 30/10/2026, 10:00 de Bolivia). Datos inventados.
   Se corre:  node tests/test_kommo_ya_cargadas.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[], dialogos=[];
  const ctx = await browser.newContext({ viewport:{ width:1440, height:1000 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => { dialogos.push(d.message()); d.accept(); });
  await ctx.route(/^https?:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-30T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };

  const r0 = await ev(async () => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR=''; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    var T=function(iso){ return Date.parse(iso+'T11:00:00-04:00'); };
    var P=function(id, o){ return Object.assign({ id:id, oc:'', nota:'', cliente:'CLIENTE '+id.toUpperCase(), celular:'', fecha:'', turno:'AM', zona:'Norte', direccion:'Calle 1', maps:'https://maps.google.com/?q=-17.78,-63.18',
      vendedor:'Mirian Salazar', productos:[{ desc:'COLCHON SOFT', medida:'140x190', cant:1, precio:3000 }], saldo:0, acuenta:3000, pagado:true, metodoPago:'', ts:T('2026-10-20'), rev:1, estado:'' }, o); };
    var B=function(id, o){ return Object.assign({ id:'kommo-'+id, estado:BORRADOR_EST, vendedor:'Mirian Salazar', cliente:'LEAD '+id, celular:'', saldo:0, productos:[], fecha:'', turno:'', zona:'', ts:T('2026-10-29'), rev:1 }, o); };
    window._pl=[
      P('p59', { oc:'09-005', nota:'4005', cliente:'CLIENTA SESENTA', celular:'71234567', ts:T('2026-09-01'), fecha:'2026-10-31', productos:[{ desc:'COLCHON SOFT', medida:'140x190', cant:1, precio:9100 }], acuenta:1000, saldo:8100, pagado:false }),
      P('p3d', { oc:'10-300', nota:'4300', cliente:'CLIENTE ENTREGADO', celular:'75555555', ts:T('2026-10-25'), fecha:'2026-10-28', entregado:true }),
      P('vie', { oc:'07-010', nota:'4010', cliente:'CLIENTE QUE VUELVE', celular:'72222222', ts:T('2026-07-01'), fecha:'2026-07-05', entregado:true }),
      P('mon', { oc:'10-096', nota:'4096', cliente:'CLIENTE MONTO', celular:'73333333', ts:T('2026-10-07'), fecha:'2026-10-09', entregado:true, productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', cant:1, precio:8460 }], acuenta:8460 }),
      P('am1', { oc:'10-120', nota:'4120', cliente:'CLIENTE A', celular:'76666661', ts:T('2026-10-10'), fecha:'2026-10-12', entregado:true, productos:[{ desc:'COLCHON SOFT', medida:'140x190', cant:1, precio:4100 }], acuenta:4100 }),
      P('am2', { oc:'10-121', nota:'4121', cliente:'CLIENTE B', celular:'76666662', ts:T('2026-10-11'), fecha:'2026-10-13', entregado:true, productos:[{ desc:'COLCHON SOFT', medida:'140x190', cant:1, precio:4100 }], acuenta:4100 }),
      P('otr', { oc:'10-200', nota:'4200', cliente:'CLIENTE DE MARIA', celular:'77777777', ts:T('2026-10-20'), fecha:'2026-10-22', entregado:true, vendedor:'Maria Flores' }),
      B('1', { cliente:'CLIENTA SESENTA', celular:'+591 71234567', saldo:9100 }),          // ya cargada (59 días) → no cuenta
      B('6', { cliente:'CLIENTE ENTREGADO', celular:'75555555', saldo:3000 }),             // ya cargada (cargada hace 4 días y entregada) → no cuenta
      B('2', { cliente:'CLIENTE QUE VUELVE', celular:'72222222', saldo:3000 }),           // compra nueva de un cliente de julio → cuenta
      B('3', { cliente:'OTRO NOMBRE', celular:'74444444', saldo:8460, ts:T('2026-10-15') }),  // el mismo monto → sugiere, cuenta
      B('4', { cliente:'CLIENTE NUEVO', celular:'78888888', saldo:5000 }),                // nueva → cuenta
      B('5', { cliente:'LEAD DE MARIA', celular:'77777777', saldo:3000 }),                // el celular de una venta de Maria → parece, cuenta
      B('7', { cliente:'AMBIGUO', celular:'79999999', saldo:4100, ts:T('2026-10-20') })   // dos del mismo monto → no adivina
    ];
    window._dels=[]; window._enVuelo=0; window._max=0; window._saves=[];
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window._pl)) }); };
    apiSave=function(r){ var g=JSON.parse(JSON.stringify(r)); g.rev=(Number(g.rev)||0)+1; window._saves.push(g.id); window._pl=window._pl.filter(function(p){ return p.id!==g.id; }).concat([g]); return Promise.resolve({ ok:true, pedido:g }); };
    apiDelete=function(id){
      window._enVuelo++; window._max=Math.max(window._max, window._enVuelo); window._dels.push(id);
      return new Promise(function(ok){ setTimeout(function(){ window._enVuelo--; window._pl=window._pl.filter(function(p){ return p.id!==id; }); ok({ ok:true }); }, 150); });
    };
    window._esp=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
    await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok';
    return { borr:BORRADORES.length, state:STATE.length };
  });
  chk('0. arma el panel de prueba (7 ventas de Kommo, 7 pedidos)', r0 && r0.borr===7 && r0.state===7, r0);

  /* 1 · qué dice de cada una */
  const r1 = await ev(async () => {
    var o={};
    BORRADORES.forEach(function(b){ var g=borrGemelo(b), gm=gemeloDe(b); o[b.id]={ cargada:!!(g&&g.cargada), por:g?g.por:'', oc:g?g.p.oc:'', gemelo45:gm?gm.oc:'' }; });
    return o;
  });
  chk('1a. el mismo celular y vendedora cargado hace 59 días (entrega el 31/10) → ya cargada como 09-005 (gemeloDe, con sus 45 días, no la veía)',
    r1['kommo-1'] && r1['kommo-1'].cargada && r1['kommo-1'].oc==='09-005' && r1['kommo-1'].por==='celular' && r1['kommo-1'].gemelo45==='', r1['kommo-1']);
  chk('1b. cargada hace 4 días y ya entregada → también ya cargada (10-300)', r1['kommo-6'] && r1['kommo-6'].cargada && r1['kommo-6'].oc==='10-300', r1['kommo-6']);
  /* kommo-2 vale 3.000 como la 10-300, pero la 10-300 tiene el celular de kommo-6: es de esa otra, no se ofrece por el monto */
  chk('1c. la compra de julio (entregada) del mismo cliente NO la da por cargada, ni le sugiere por el monto la venta de OTRA tarjeta', r1['kommo-2'] && !r1['kommo-2'].cargada && r1['kommo-2'].oc==='', r1['kommo-2']);
  chk('1d. el mismo monto (8.460), misma vendedora, 8 días antes → solo sugiere la 10-096', r1['kommo-3'] && !r1['kommo-3'].cargada && r1['kommo-3'].por==='monto' && r1['kommo-3'].oc==='10-096', r1['kommo-3']);
  chk('1e. el celular de una venta de OTRA vendedora → «parece» (como siempre), no «cargada»', r1['kommo-5'] && !r1['kommo-5'].cargada && r1['kommo-5'].por==='parece' && r1['kommo-5'].oc==='10-200', r1['kommo-5']);
  chk('1f. dos ventas con el mismo monto → no adivina; la nueva sin parecido → nada', r1['kommo-7'] && r1['kommo-7'].oc==='' && r1['kommo-4'] && r1['kommo-4'].oc==='', [r1['kommo-7'], r1['kommo-4']]);

  /* 2 · «Para hacer» y el número de la bandeja */
  const r2 = await ev(async () => {
    var mine=STATE.filter(function(p){ return mismoVendedor(p.vendedor, 'Mirian Salazar'); });
    var I=misHacerDatos('Mirian Salazar', mine).filter(function(o){ return o.ic==='📥'; })[0]||null;
    var E=misEqHacerDatos(STATE.slice()).filter(function(o){ return o.ic==='📥'; })[0]||null;
    showView('mis'); MIS_TODOS=false; var mv=document.getElementById('mis-vendedor'); mv.value='Mirian Salazar'; renderMis(); await _esp(150);
    var b=document.getElementById('mis-borradores'), txt=b.innerText.replace(/\s+/g,' ');
    var cards=[].map.call(b.querySelectorAll('.borr-gem'), function(x){ return x.innerText.replace(/\s+/g,' '); });
    window.MIS_TOP_PRUEBA=1; renderMis(); await _esp(150);
    var kx=document.querySelector('#mis-borradores .kx'), badge=kx ? kx.querySelector('.kx-cab .ah-badge').textContent : '', ktxt=kx ? kx.innerText.replace(/\s+/g,' ') : '';
    var unir=document.querySelector('#mis-borradores .borr-unir');
    window.MIS_TOP_PRUEBA=0;
    return { n:I && I.n, s:I && I.s, eq:E && E.n, txt:txt, cards:cards, badge:badge, ktxt:ktxt, unir:unir ? unir.textContent : '' };
  });
  chk('2a. «Para hacer»: 5 ventas de Kommo para completar (las 2 ya cargadas no cuentan; antes 7)', r2.n===5, r2);
  chk('2b. …y dice que 2 parecen ya cargadas', /2 parecen ya cargadas/.test(r2.s||''), r2.s);
  chk('2c. «Para hacer · el equipo» tampoco las cuenta (5)', r2.eq===5, r2.eq);
  chk('2d. la bandeja dice «5 ventas vinieron de Kommo» y «2 ya están cargadas»', /5 ventas vinieron de Kommo/.test(r2.txt) && /2 ya están cargadas/.test(r2.txt), r2.txt.slice(0,300));
  chk('2e. la tarjeta: «Ya está cargada como 09-005 del 01/09»', r2.cards.some(t=>/Ya está cargada como 09-005 del 01\/09/.test(t)), r2.cards);
  chk('2f. la del monto: «Parece la 10-096 del 07/10 (Bs 8.460,00)» con «Sí, es la misma»', r2.cards.some(t=>/Parece la 10-096 del 07\/10 \(Bs 8\.460,00\)/.test(t) && /Sí, es la misma/.test(t)), r2.cards);
  chk('2g. en filas cortas: el número de la bandeja es 5 y está el grupo «Ya están cargadas · 2»', r2.badge==='5' && /Ya están cargadas · 2/i.test(r2.ktxt), { b:r2.badge, t:r2.ktxt.slice(0,260) });
  chk('2h. arriba, «🔗 Unir las 2 que ya están cargadas»', /Unir las 2 que ya están cargadas/.test(r2.unir), r2.unir);

  /* 3 · «Unir las N» de un toque */
  const r3 = await ev(async () => {
    window._dels=[]; window._max=0; window._saves=[];
    var b=document.querySelector('#mis-borradores .borr-unir'); if(b) b.click();
    await _esp(60);
    var durante=(document.querySelector('#mis-borradores .borr-unir')||{}).textContent||'';
    for(var i=0;i<40 && (BORR_UNIENDO || window._enVuelo); i++) await _esp(100);
    await _esp(200);
    var p59=findById('p59'), p3d=findById('p3d');
    var mine=STATE.filter(function(p){ return mismoVendedor(p.vendedor, 'Mirian Salazar'); });
    var I=misHacerDatos('Mirian Salazar', mine).filter(function(o){ return o.ic==='📥'; })[0]||null;
    return { dels:window._dels.slice(), max:window._max, durante:durante, k59:kleadDe(p59), k3d:kleadDe(p3d), borr:BORRADORES.map(function(x){ return x.id; }).sort(),
             enPlanilla:window._pl.filter(function(p){ return p.id==='kommo-1' || p.id==='kommo-6'; }).length, saves:window._saves.slice(), n:I && I.n,
             queda:(document.querySelector('#mis-borradores .borr-unir')||null)===null };
  });
  chk('3a. preguntó una vez, nombrando cada una y con qué pedido se une', dialogos.length===1 && /Unir las 2 ventas de Kommo/.test(dialogos[0]) && /CLIENTA SESENTA → 09-005 del 01\/09/.test(dialogos[0]), dialogos);
  chk('3b. mientras trabaja, el botón dice «⏳ Uniendo…»', /Uniendo \d de 2/.test(r3.durante), r3.durante);
  chk('3c. borró los 2 borradores de la planilla, DE A UNO (nunca dos a la vez)', JSON.stringify((r3.dels||[]).slice().sort())==='["kommo-1","kommo-6"]' && r3.max===1 && r3.enPlanilla===0, r3);
  chk('3d. cada pedido quedó con la marca de su lead (09-005 ← 1, 10-300 ← 6) y se guardó', r3.k59==='1' && r3.k3d==='6' && (r3.saves||[]).indexOf('p59')>=0 && (r3.saves||[]).indexOf('p3d')>=0, r3);
  chk('3e. en la bandeja quedan las 5 que cuentan; «Para hacer» sigue en 5 y el botón ya no está', JSON.stringify(r3.borr)==='["kommo-2","kommo-3","kommo-4","kommo-5","kommo-7"]' && r3.n===5 && r3.queda, r3);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
