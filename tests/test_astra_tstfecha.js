/* 🏬 (27/10, §4nl, auditoría de Astra A03 y A04) El stock de cada tienda con el día REAL de cada movimiento y la hora del conteo.
   · A03: `tstCalcular` decidía si una RPT o una recogida «🏬 Tienda» salió antes o después del conteo con la fecha AGENDADA del pedido
     (`p.fecha`). Tiene que mandar el día real que anotó el cierre o el ✅ adelantado (`x.eF`), como en el stock de fábrica (§4iz E2-7).
   · A04: un conteo con hora (el Excel de la tienda la trae) dejaba afuera todo lo de ese día, también lo de DESPUÉS de la hora.
     Regla: lo del mismo día entra si su hora es posterior a la del conteo; lo que no tiene hora (RPT, recogidas, un pase anotado otro
     día) queda ADENTRO del conteo, como siempre (se cuenta al cierre); un conteo sin hora, por día, como siempre.
   Datos inventados. Reloj clavado en el JUEVES 05/11/2026 a las 09:00 de Bolivia (y después el domingo 08/11).
     · Mia Plaza (contada el 31/10 19:30, 3 TITANIO): RPT de 2 agendada el 07/11 y entregada el 04/11 (eF) → +2; RPT de 1 del 03/11
       sin ✅ (fecha pasada = salió, §4co) → +1; RPT ✅ para el 06/11 sin eF (§4lr U12: no salió) → nada. Tiene 6 (antes decía 4).
     · Charcas (31/10, 3 TITANIO): recogida de 1 agendada el 07/11 y entregada el 04/11 → −1; otra para el 09/11 sin salir → apartado 1.
       Tiene 2 (antes 3, y la recogida adelantada no aparecía en ninguna parte).
     · Central (contada el 05/11 a mano, 5 TITANIO, ya con la RPT adentro): RPT de 2 agendada el 07/11 y entregada el 04/11. El 08/11
       sigue en 5 (antes volvía a sumarla: 7).
     · Mutualista (31/10, 1 TITANIO): RPT de 2 agendada el 30/10, entregada (cierre) el 02/11 → +2 = 3 (antes 1).
     · Buenos Aires (Excel del 05/11 a las 07:00, 3 TITANIO y 4 SOMIER): venta de tienda de 1 a las 08:00 → −1, la de las 06:30 ya
       estaba; pase de 1 SOMIER a Carmelo a las 08:30 → −1, el de las 06:00 ya estaba, uno anotado el 06/11 con día 05/11 (sin hora:
       adentro); RPT entregada ese día sin hora → adentro. TITANIO 2 y SOMIER 3 (antes 3 y 4).
     · Carmelo (contada el 05/11 a mano, sin hora, 2 TITANIO): la venta de las 08:00 y el pase de las 08:30 ya están en el conteo de
       cierre → 2 y nada de SOMIER (como siempre).
     · La vista previa de un conteo nuevo de Mia Plaza a las 07:30 (Excel) no cuenta la venta de las 08:00: «✓ coincide».
   Se corre:  node tests/test_astra_tstfecha.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_u2_turno.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{ width:1440, height:900 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('dialog', d=>d.accept());
  await page.clock.setFixedTime(new Date('2026-11-05T09:00:00-04:00'));   // jueves
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');
  await page.evaluate(async()=>{
    UNLOCKED=true;
    var ts=function(f,h){ return new Date(f+'T'+(h||'11:00')+'-04:00').getTime(); };
    var tienda=function(id, f, h, suc, lineas){ return _ped(id, '', '', lineas, { cliente:'CLIENTE TIENDA '+id, direccion:'SALIÓ DE TIENDA · '+suc, zona:'TIENDA', ts:ts(f,h), pagado:true, fecha:'' }); };
    var rpt=function(id, f, suc, lineas, extra){ return _ped(id, f, 'AM', lineas, Object.assign({ cliente:suc, oc:'RPT 10-'+id.slice(-3), ts:ts('2026-10-20') }, extra||{})); };
    var deTienda=function(cant, suc, extra){ return _lin(_T, cant, Object.assign({ chk:'im', chkDe:'Tienda '+suc }, extra||{})); };
    var ps=[
      /* A03 · Mia Plaza */
      rpt('r01','2026-11-07','Mia Plaza',[_lin(_T,2,{ chk:'ok', eF:'2026-11-04', eT:ts('2026-11-04','16:40'), eQ:'Logística' })], { entregado:true }),   // se adelantó
      rpt('r02','2026-11-03','Mia Plaza',[_lin(_T,1,{ chk:'ok' })]),                                    // fecha pasada sin ✅: salió (§4co)
      rpt('r03','2026-11-06','Mia Plaza',[_lin(_T,4,{ chk:'ok' })], { entregado:true }),               // ✅ para mañana sin eF: no salió (§4lr)
      /* A03 · Charcas: la recogida adelantada y otra que todavía no salió */
      _ped('p01','2026-11-07','AM',[deTienda(1,'Charcas',{ eF:'2026-11-04', eT:ts('2026-11-04','16:40'), eQ:'Logística' })],{ cliente:'JUAN PEREZ', ts:ts('2026-11-02'), entregado:true }),
      _ped('p02','2026-11-09','AM',[deTienda(1,'Charcas')],{ cliente:'ANA ROJAS', ts:ts('2026-11-04') }),
      /* A03 · Central: contada el 05/11 con la RPT adelantada ya adentro */
      rpt('r04','2026-11-07','Central',[_lin(_T,2,{ chk:'ok', eF:'2026-11-04', eT:ts('2026-11-04','16:40'), eQ:'Logística' })], { entregado:true }),
      /* A03 · Mutualista: la atrasada del 30/10, entregada el 02/11 (cierre: «¿qué día se entregó?») */
      rpt('r05','2026-10-30','Mutualista',[_lin(_T,2,{ chk:'ok', eF:'2026-11-02', eT:ts('2026-11-02','17:10'), eQ:'Logística' })], { entregado:true }),
      /* A04 · Buenos Aires (Excel de las 07:00) y Carmelo (a mano, sin hora) */
      tienda('v01','2026-11-05','08:00','Buenos Aires',[_lin(_T,1)]),     // después del conteo de las 07:00
      tienda('v02','2026-11-05','06:30','Buenos Aires',[_lin(_T,1)]),     // antes: ya estaba en el conteo
      tienda('v03','2026-11-05','08:00','Carmelo',[_lin(_T,1)]),          // Carmelo se contó al cierre (sin hora): ya adentro
      rpt('r06','2026-11-05','Buenos Aires',[_lin(_T,2,{ chk:'ok', eF:'2026-11-05', eT:ts('2026-11-05','08:50'), eQ:'Logística' })], { entregado:true })   // sin hora: adentro
    ];
    var D={ v:1, s:{
      'Mia Plaza':{ f:'2026-10-31', hora:'19:30', t:ts('2026-10-31','19:40'), de:'excel', u:{}, tot:3 },
      'Charcas':{ f:'2026-10-31', hora:'19:30', t:ts('2026-10-31','19:41'), de:'excel', u:{}, tot:3 },
      'Central':{ f:'2026-11-05', hora:'', t:ts('2026-11-05','08:45'), de:'mano', u:{}, tot:5 },
      'Mutualista':{ f:'2026-10-31', hora:'19:30', t:ts('2026-10-31','19:42'), de:'excel', u:{}, tot:1 },
      'Buenos Aires':{ f:'2026-11-05', hora:'07:00:00', t:ts('2026-11-05','08:40'), de:'excel', u:{}, tot:7 },
      'Carmelo':{ f:'2026-11-05', hora:'', t:ts('2026-11-05','08:41'), de:'mano', u:{}, tot:2 } },
      x:[{ id:'tp1', f:'2026-11-05', de:'Buenos Aires', a:'Carmelo', k:_K2, u:1, ts:ts('2026-11-05','08:30') },
         { id:'tp2', f:'2026-11-05', de:'Buenos Aires', a:'Carmelo', k:_K2, u:1, ts:ts('2026-11-05','06:00') },
         { id:'tp3', f:'2026-11-05', de:'Buenos Aires', a:'Carmelo', k:_K2, u:1, ts:ts('2026-11-06','10:00') }], h:[] };
    D.s['Mia Plaza'].u[_K]=3; D.s['Charcas'].u[_K]=3; D.s['Central'].u[_K]=5; D.s['Mutualista'].u[_K]=1;
    D.s['Buenos Aires'].u[_K]=3; D.s['Buenos Aires'].u[_K2]=4; D.s['Carmelo'].u[_K]=2;
    ps.push({ id:'__tiendas_stock__', fecha:'', cliente:'🏬 STOCK DE LAS TIENDAS', observaciones:JSON.stringify(D), rev:1 });
    await _cargar(ps, _stock(function(s){ s.c.u[_K]=10; s.c.u[_K2]=4; }));
  });
  await page.waitForTimeout(100);
  const cuenta = () => page.evaluate(()=>{ var T=tstCalcular(), o={};
    Object.keys(T).forEach(function(n){ var t=T[n]; if(!t.base) return; o[n]={};
      [[_K,'T'],[_K2,'S']].forEach(function(z){ var x=t.P[stockAliasDe(z[0])]; o[n][z[1]]=x ? { c:x.c, rpt:x.rpt, ven:x.ven, rec:x.rec, pas:x.pas, tiene:x.tiene, apart:x.apart } : null; }); });
    return o; });

  /* A03 · la fecha real de salida */
  let r=await cuenta();
  chk('A03 · Mia Plaza: la RPT agendada el 07/11 y entregada el 04/11 ya llegó (+2); con la del 03/11 sin ✅ (+1) tiene 6, no 4',
    r['Mia Plaza'].T && r['Mia Plaza'].T.rpt===3 && r['Mia Plaza'].T.tiene===6, r['Mia Plaza'].T);
  chk('A03 · Charcas: la recogida agendada el 07/11 y entregada el 04/11 se recogió (−1): tiene 2; la del 09/11 sigue apartada',
    r['Charcas'].T && r['Charcas'].T.rec===1 && r['Charcas'].T.tiene===2 && r['Charcas'].T.apart===1, r['Charcas'].T);
  chk('A03 · Mutualista: la RPT del 30/10 que llegó el 02/11 (después del conteo del 31/10) suma: tiene 3, no 1',
    r['Mutualista'].T && r['Mutualista'].T.rpt===2 && r['Mutualista'].T.tiene===3, r['Mutualista'].T);
  chk('A03 · Central (contada el 05/11 con la RPT del 04/11 adentro): tiene 5', r['Central'].T && r['Central'].T.rpt===0 && r['Central'].T.tiene===5, r['Central'].T);
  chk('A03 · lo que ya andaba: el ✅ para mañana sin día real no llegó (Mia Plaza no suma sus 4)', r['Mia Plaza'].T && r['Mia Plaza'].T.rpt===3, r['Mia Plaza'].T);

  /* A04 · el conteo con hora */
  chk('A04 · Buenos Aires (Excel de las 07:00): la venta de las 08:00 resta, la de las 06:30 ya estaba → TITANIO 2, no 3',
    r['Buenos Aires'].T && r['Buenos Aires'].T.ven===1 && r['Buenos Aires'].T.tiene===2, r['Buenos Aires'].T);
  chk('A04 · el pase de las 08:30 baja el SOMIER; el de las 06:00 y el anotado otro día (sin hora) ya estaban → 3, no 4',
    r['Buenos Aires'].S && r['Buenos Aires'].S.pas===-1 && r['Buenos Aires'].S.tiene===3, r['Buenos Aires'].S);
  chk('A04 · la RPT entregada el día del conteo, sin hora, queda adentro del conteo (no suma)', r['Buenos Aires'].T && r['Buenos Aires'].T.rpt===0, r['Buenos Aires'].T);
  chk('A04 · un conteo SIN hora (a mano, Carmelo) es de cierre: lo de ese día ya está adentro (TITANIO 2, sin SOMIER)',
    r['Carmelo'].T && r['Carmelo'].T.tiene===2 && r['Carmelo'].T.ven===0 && !r['Carmelo'].S, r['Carmelo']);

  /* A04 · la vista previa de un conteo nuevo a media mañana: lo que el panel esperaba A ESA HORA */
  r=await page.evaluate(()=>{
    var u={}; u[_K]=6;
    TST_PREV={ lista:[{ n:'Mia Plaza', f:'2026-11-05', hora:'07:30:00', de:'excel', u:u }], fuera:[] }; tstPintar();
    var p=document.getElementById('tst-prev'), t=p ? p.innerText.replace(/\s+/g,' ') : '', esp=TST_PREV.lista[0].esp;
    /* Y si la venta de las 08:00 de Mia Plaza ya está cargada: no entra en lo esperado a las 07:30 */
    return { t:t, esp:esp };
  });
  chk('A04 · vista previa de Mia Plaza contada a las 07:30: el panel esperaba 6 y contaron 6 «✓ coincide»', r.esp===6 && /esperaba 6/.test(r.t) && /coincide/.test(r.t), r);
  r=await page.evaluate(async()=>{
    TST_PREV=null; tstPintar();
    var ts=function(f,h){ return new Date(f+'T'+h+'-04:00').getTime(); };
    var v=_ped('v09', '', '', [_lin(_T,1)], { cliente:'CLIENTE TIENDA v09', direccion:'SALIÓ DE TIENDA · Mia Plaza', zona:'TIENDA', ts:ts('2026-11-05','08:00'), pagado:true, fecha:'' });
    STATE.push(v);
    var u={}; u[_K]=6;
    TST_PREV={ lista:[{ n:'Mia Plaza', f:'2026-11-05', hora:'07:30:00', de:'excel', u:u }], fuera:[] }; tstPintar();
    var p=document.getElementById('tst-prev'), t=p ? p.innerText.replace(/\s+/g,' ') : '', esp=TST_PREV.lista[0].esp;
    var tiene=tstCalcular()['Mia Plaza'].P[stockAliasDe(_K)].tiene;
    TST_PREV=null; tstPintar();
    return { t:t, esp:esp, tiene:tiene };
  });
  chk('A04 · con una venta de Mia Plaza a las 08:00, el conteo de las 07:30 sigue esperando 6 (la venta es de después)', r.esp===6 && /coincide/.test(r.t), r);
  chk('A04 · …y la cuenta de hoy de Mia Plaza (desde el 31/10) sí la resta: 5', r.tiene===5, r);

  /* A03 · tres días después: la RPT adelantada no se vuelve a sumar al cruzar el conteo del 05/11 */
  await page.evaluate(()=>{ STATE=STATE.filter(function(p){ return p.id!=='v09'; }); });
  await page.clock.setFixedTime(new Date('2026-11-08T09:00:00-04:00'));   // domingo
  r=await cuenta();
  chk('A03 · el 08/11 Central sigue en 5: la RPT del 07/11 entregada el 04/11 ya estaba en el conteo del 05/11 (antes daba 7)',
    r['Central'].T && r['Central'].T.rpt===0 && r['Central'].T.tiene===5, r['Central'].T);
  chk('A03 · el 08/11 Mia Plaza: la ✅ del 06/11 ya pasó y salió (+4, §4co); la adelantada cuenta UNA vez → 3 + 2 + 1 + 4 = 10',
    r['Mia Plaza'].T && r['Mia Plaza'].T.rpt===7 && r['Mia Plaza'].T.tiene===10, r['Mia Plaza'].T);
  chk('A04 · el 08/11 Buenos Aires sigue en TITANIO 2 y SOMIER 3', r['Buenos Aires'].T && r['Buenos Aires'].T.tiene===2 && r['Buenos Aires'].S && r['Buenos Aires'].S.tiene===3, r['Buenos Aires']);

  chk('sin errores de la página', !errs.length, errs);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
