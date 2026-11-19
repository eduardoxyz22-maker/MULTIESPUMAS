/* 🧾📄 MEJORA 328 — FACTURADO O NO: EL RETIRO CONTRA SUS VENTAS (Contabilidad → Cuadre).

   El dueño (15/11): en noviembre Bs 6.060 de una venta con factura se retiraron como «No facturado» y otros de ventas con remisión como
   «Facturado»; el tipo se elige al cargar el retiro (`retTipoDocs`) y después nadie lo vuelve a mirar (la factura se anota más tarde).

   LO QUE ESTA PRUEBA CUIDA:
   1. Qué tapa cada retiro (`efePareo`) y de qué es cada venta (`docVentaDe`): «pasar» (todo del otro tipo), «partir» (de los dos) u ok; lo sin
      factura ni remisión va con lo no facturado (como «Las dos»).
   2. Por persona: lo retirado de ventas con factura contra lo retirado como «Facturado» (y con remisión), y cuánto está en el otro tipo.
   3. «Pasar a «Facturado»» cambia solo el tipo (mismo id, misma hora, mismo sello, mismos cobros tildados), con confirm.
   4. «🧾+📄 Partir en dos recibos» pide el N° del otro recibo (distinto): el de antes queda con su recibo y lo suyo, y la parte del otro tipo pasa
      a un retiro nuevo con ese recibo y esos cobros. Después todo coincide.
   5. La marca ⚠️ en la lista de retiros; sin la bandera `RET_DOC_PRUEBA`, nada; en «Todo» (sin emparejamiento), nada.
   Datos SINTÉTICOS. Reloj clavado: jueves 12/11/2026 a las 19:00 de Bolivia.
   Se corre:  node tests/test_retiro_doc.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,700)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const TSB=(dia, hora)=>new Date(dia+'T'+(hora||'11:00')+':00-04:00').getTime();
/* Una venta de Carola cobrada en efectivo el día `f`, con factura ('F'), nota de remisión ('R') o sin anotar (''). */
const P=(id, cli, m, f, doc, num)=>({ id:id, oc:'11-'+id.replace(/\D/g,'').padStart(3,'0'), vendedor:'Carola Chavez', cliente:cli, celular:'70001001', zona:'Norte', turno:'AM',
  nota:'8'+id.replace(/\D/g,'').padStart(3,'0'), fecha:'2026-12-20', productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:9000, fdoc:doc||'', fdocn:num||'' }],
  saldo:9000-m, acuenta:0, pagado:false, ts:TSB(f), metodoPago:'Efectivo '+m+' @'+f+' #70'+id.replace(/\D/g,'') });
const L=[ P('f1','CLIENTE FACTURA UNO',1000,'2026-11-10','F','55'), P('f2','CLIENTE FACTURA DOS',500,'2026-11-11','F','56'), P('r1','CLIENTE REMISION',700,'2026-11-11','R','1714'),
          P('x1','CLIENTE SIN ANOTAR',300,'2026-11-11','','') ];

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  const errores=[]; page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await ctx.route(/^https?:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-11-12T19:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  await ev(async (L) => {
    var c0=document.getElementById('conn-form'); if(c0) c0.style.display='none';
    CONNECTED=true; UNLOCKED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR=''; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    var R=function(id, tipo, monto, recibo, tick){ var f=filaDeRetiro({ id:'__ret_'+id+'__', fecha:'2026-11-12', entrega:'Carola Chavez', retira:'Eduardo', monto:monto, notas:[recibo], tipo:tipo, fotos:['FOTO_'+id], obs:'', tick:tick });
      f.ts=new Date('2026-11-12T18:00:00-04:00').getTime(); f.rev=3; return f; };
    var tk=function(id, f, m){ return { id:id, f:f, m:m }; };
    window._L=JSON.parse(JSON.stringify(L)).concat([
      R('a', 'No facturado', 1000, '701', [tk('f1','2026-11-10',1000)]),                                // de una venta con factura: «pasar»
      R('b', 'Facturado', 1200, '702', [tk('f2','2026-11-11',500), tk('r1','2026-11-11',700)]),          // de las dos: «partir»
      R('c', 'No facturado', 300, '703', [tk('x1','2026-11-11',300)]) ]);                              // sin anotar, con lo no facturado: ok
    window._g=[];
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window._L)) }); };
    apiSave=function(x){ window._g.push(JSON.parse(JSON.stringify(x))); var y=JSON.parse(JSON.stringify(x)); y.rev=(Number(y.rev)||0)+1; return Promise.resolve({ ok:true, pedido:y }); };
    await refrescarEstado(); await new Promise(function(r){ setTimeout(r, 150); });
    window._txt=function(sel){ var e=document.querySelector(sel); return e ? e.innerText.replace(/\s+/g,' ').trim() : ''; };
    window.CUADRE=function(){ showView('conta'); segSet('cta-tab','cuadre'); setContaTab('cuadre'); var m=document.getElementById('cua-mes'); if(m) m.value='2026-11'; renderCuadre(); };
  }, L);

  console.log('\n── 1. Qué tapa cada retiro ──');
  let r = await ev(() => { var o={}; retirosTodos().forEach(function(x){ var d=retDocDeRetiro(x); o[x.notas[0]]=d && { F:d.F, R:d.R, X:d.X, est:d.est, malBs:d.malBs, otras:d.otras.length }; }); return o; });
  chk('1a. el 701 («No facturado») tapa Bs 1.000 de una venta con factura: «pasar»', r['701'] && r['701'].F===1000 && r['701'].est==='pasar' && r['701'].malBs===1000, r['701']);
  chk('1b. el 702 («Facturado») tapa 500 con factura y 700 con remisión: «partir» (700 al otro tipo)', r['702'] && r['702'].F===500 && r['702'].R===700 && r['702'].est==='partir' && r['702'].malBs===700, r['702']);
  chk('1c. el 703 («No facturado») tapa 300 sin factura ni remisión anotada: va con lo no facturado, ok', r['703'] && r['703'].X===300 && r['703'].est==='ok', r['703']);

  console.log('\n── 2. Por persona, en el Cuadre ──');
  r = await ev(() => { window.RET_DOC_PRUEBA=1; CUADRE(); var D=retDocDatos({ modo:'mes', val:'2026-11' }, '');
    return { f:D.filas[0], mal:D.mal.length, sin:D.sinAnot, t:_txt('#cua-doc'), cards:document.querySelectorAll('#cua-doc .rdc-ret').length, btnP:document.querySelectorAll('#cua-doc .rdc-ret button').length,
             todo:retDocDatos({ modo:'todo', val:'' }, ''), abajo:(function(){ var a=document.getElementById('cua-retiros'), b=document.getElementById('cua-doc-box'); return !!(a && b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)); })() }; });
  chk('2a. Carola: de ventas con factura 1.500 · retirado «Facturado» 1.200 · con remisión 700 · «No facturado» 1.300 · sin anotar 300 · 1.700 en el otro tipo',
      r.f && r.f.F===1500 && r.f.fac===1200 && r.f.R===700 && r.f.nofac===1300 && r.f.X===300 && r.f.malBs===1700 && r.mal===2 && r.sin===300, r.f);
  chk('2b. debajo de «Efectivo cobrado vs. retirado»: la tabla y dos retiros que no coinciden, cada uno con su botón', r.abajo && /🧾 Retirado con factura y sin factura — noviembre de 2026/i.test(r.t) && r.cards===2 && r.btnP===2 && /⚠️ Bs 1\.700,00 en el otro tipo/.test(r.t), r.t.slice(0,600));
  chk('2c. «⚠️ El cobro que tapa es de una venta con factura 55 (CLIENTE FACTURA UNO, 10/11, Bs 1.000,00)» y «Pasar a «Facturado»»', /El cobro que tapa es de una venta con factura 55 \(CLIENTE FACTURA UNO, 10\/11, Bs 1\.000,00\)\. Pasar a «Facturado»/.test(r.t), r.t);
  chk('2d. el 702: tapa una venta con remisión 1714; partir pasaría Bs 700 a «No facturado» y quedan Bs 500', /venta con remisión 1714 \(CLIENTE REMISION, 11\/11, Bs 700,00\)\. Pasaría Bs 700,00 a un retiro «No facturado» con el otro recibo; este queda con Bs 500,00\./.test(r.t), r.t);
  chk('2e. «Bs 300,00 retirado es de ventas sin factura ni remisión anotada: el tipo se eligió a ojo»; en «Todo» no hay emparejamiento: nada', /Bs 300,00 retirado es de ventas sin factura ni remisión anotada/.test(r.t) && r.todo===null, r.todo);

  console.log('\n── 3. La marca en la lista de retiros ──');
  r = await ev(() => { abrirRetiros(); var t=_txt('#ret-lista'); closeRetiros(); return { t:t, n:(t.match(/⚠️ sus cobros/g)||[]).length }; });
  chk('3a. «⚠️ sus cobros: con factura» (701) y «con remisión» (702), y nada en el 703', r.n===2 && /⚠️ sus cobros: con factura/.test(r.t) && /⚠️ sus cobros: con remisión/.test(r.t), r.t.slice(0,500));

  console.log('\n── 4. Pasar a «Facturado» ──');
  r = await ev(async () => { window._g=[]; CUADRE(); var b=document.querySelector('#cua-doc .rdc-ret[data-id="__ret_a__"] button'); b.click(); await new Promise(function(x){ setTimeout(x, 150); });
    var g=_g[0]||{}, x=retiroDe(g); return { n:_g.length, id:g.id, zona:g.zona, ts:g.ts, rev:g.rev, gar:g.garantia, monto:x.monto, notas:x.notas.join(','), fotos:x.fotos.join(','),
      est:retDocDeRetiro(retirosTodos().filter(function(z){ return z.id==='__ret_a__'; })[0]).est, cards:document.querySelectorAll('#cua-doc .rdc-ret').length }; });
  chk('4a. guarda UNA fila: el mismo retiro, ahora «FACTURADO», con su sello (3), su hora y sus cobros tildados', r.n===1 && r.id==='__ret_a__' && r.zona==='FACTURADO' && r.rev===3 &&
      r.ts===new Date('2026-11-12T18:00:00-04:00').getTime() && r.gar==='efe:f1|2026-11-10|1000' && r.monto===1000 && r.notas==='701' && r.fotos==='FOTO_a', r);
  chk('4b. después coincide y queda una sola tarjeta', r.est==='ok' && r.cards===1, r);

  console.log('\n── 5. Partir en dos recibos ──');
  r = await ev(async () => { window._g=[]; var box=document.querySelector('#cua-doc .rdc-ret[data-id="__ret_b__"]'), o={};
    box.querySelector('button').click(); await new Promise(function(x){ setTimeout(x, 60); }); o.sinRecibo=_g.length;
    box=document.querySelector('#cua-doc .rdc-ret[data-id="__ret_b__"]'); box.querySelector('.rdc-rec').value='702'; box.querySelector('button').click(); await new Promise(function(x){ setTimeout(x, 60); }); o.mismo=_g.length;
    box=document.querySelector('#cua-doc .rdc-ret[data-id="__ret_b__"]'); box.querySelector('.rdc-rec').value='704'; box.querySelector('button').click(); await new Promise(function(x){ setTimeout(x, 200); });
    var a=_g.filter(function(g){ return g.id==='__ret_b__'; })[0], n=_g.filter(function(g){ return g.id!=='__ret_b__'; })[0];
    o.n=_g.length; o.a=a && Object.assign(retiroDe(a), { rev:a.rev, ts:a.ts, gar:a.garantia }); o.b=n && Object.assign(retiroDe(n), { ts:n.ts, gar:n.garantia, esRet:/^__ret_/.test(n.id) });
    var D=retDocDatos({ modo:'mes', val:'2026-11' }, ''); o.mal=D.mal.length; o.malBs=D.filas[0].malBs;
    var PAR=efePareo(); o.tapaNuevo=n && PAR.porRet[n.id] ? PAR.porRet[n.id].tapa.map(function(t){ return t.c.id+':'+t.u; }) : null;
    return o; });
  chk('5a. sin el N° del otro recibo, o con el mismo (702), no guarda nada', r.sinRecibo===0 && r.mismo===0, r);
  chk('5b. el 702 queda «Facturado» con Bs 500, su recibo, su sello, su hora y solo la venta con factura', r.n===2 && r.a && r.a.tipo==='Facturado' && r.a.monto===500 && r.a.notas.join(',')==='702' && r.a.rev===3 &&
      r.a.ts===new Date('2026-11-12T18:00:00-04:00').getTime() && r.a.gar==='efe:f2|2026-11-11|500' && /el otro es el 704/.test(r.a.obs), r.a);
  chk('5c. el nuevo: «No facturado» Bs 700, recibo 704, la venta con remisión tildada, la foto y la misma hora', r.b && r.b.esRet && r.b.tipo==='No facturado' && r.b.monto===700 && r.b.notas.join(',')==='704' &&
      r.b.gar==='efe:r1|2026-11-11|700' && r.b.fotos.join(',')==='FOTO_b' && r.b.ts===r.a.ts && /el otro es el 702/.test(r.b.obs), r.b);
  chk('5d. después todo coincide (el nuevo tapa la venta con remisión)', r.mal===0 && r.malBs===0 && JSON.stringify(r.tapaNuevo)==='["r1:700"]', [r.mal, r.malBs, r.tapaNuevo]);

  console.log('\n── 6. Sin la bandera ──');
  r = await ev(() => { window.RET_DOC_PRUEBA=0; CUADRE(); var o={ box:document.getElementById('cua-doc').innerHTML };
    abrirRetiros(); o.badge=/sus cobros/.test(_txt('#ret-lista')); closeRetiros(); return o; });
  chk('6a. sin `RET_DOC_PRUEBA` (Playwright): ni la caja ni la marca (las pruebas de siempre no cambian)', r.box==='' && r.badge===false, r);

  chk('la página no tiró errores', errores.length===0, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
