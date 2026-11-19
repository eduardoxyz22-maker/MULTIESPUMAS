/* 🧾🧾 EL RETIRO CON DOS RECIBOS: UNO DE LO FACTURADO Y OTRO DE LO NO FACTURADO (13/11, dueño: «¿y si tienen dos recibos? 1 de lo facturado
   y otro de lo no facturado… y que explique ahí que se refiere si las ventas es con factura o nota de remisión»).

   Lo que esta prueba cuida:
   1. La explicación: Facturado = ventas con factura; No facturado = ventas con nota de remisión.
   2. El tipo se propone solo con los cobros tildados: todo con factura → Facturado; todo con remisión → No facturado; de las dos → «Las dos».
   3. «Las dos» pide los DOS N° de recibo y lo facturado (propuesto = lo tildado con factura); el resto es lo no facturado.
   4. Guardar con «Las dos» carga DOS retiros: tipo, monto, recibo y cobros tildados de cada uno; las fotos en los dos.
   5. Frena: sin uno de los dos recibos, el mismo recibo en los dos, lo facturado = 0 o = el total.
   6. Tocar un botón a mano manda sobre lo propuesto; editando un retiro no hay «Las dos».
   Datos SINTÉTICOS. Reloj clavado el jueves 12/11/2026 a las 19:00 de Bolivia.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_retiro_dos_recibos.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const TSB=(dia, hora)=>new Date(dia+'T'+(hora||'11:00')+':00-04:00').getTime();
/* Una venta de Carola cobrada en efectivo el día `f`, con factura ('F') o nota de remisión ('R'). */
const P=(id, cli, m, f, doc)=>({ id:id, oc:'11-'+id.replace(/\D/g,'').padStart(3,'0'), vendedor:'Carola Chavez', cliente:cli, celular:'70001001', zona:'Norte', turno:'AM',
  nota:'8'+id.replace(/\D/g,'').padStart(3,'0'), fecha:'2026-12-20', productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:9000, fdoc:doc||'', fdocn:doc?'55':'' }],
  saldo:9000-m, acuenta:0, pagado:false, ts:TSB(f), metodoPago:'Efectivo '+m+' @'+f+' #70'+id.replace(/\D/g,'') });
const L=[ P('f1','CLIENTE FACTURA UNO',1000,'2026-11-10','F'), P('f2','CLIENTE FACTURA DOS',500,'2026-11-11','F'), P('r1','CLIENTE REMISION',700,'2026-11-11','R') ];

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{ width:1280, height:900 }, timezoneId:'America/La_Paz' });
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
    window._L=JSON.parse(JSON.stringify(L)); window._g=[];
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window._L)) }); };
    apiSave=function(x){ window._g.push(JSON.parse(JSON.stringify(x))); return Promise.resolve({ ok:true, pedido:x }); };
    await refrescarEstado(); await new Promise(function(r){ setTimeout(r, 150); });
    showView('conta'); await new Promise(function(r){ setTimeout(r, 150); });
    window._txt=function(sel){ var e=document.querySelector(sel); return e ? e.innerText.replace(/\s+/g,' ').trim() : ''; };
    window._tipoOn=function(){ var b=[].slice.call(document.querySelectorAll('#ret-tipo-box [data-tipo]')).filter(function(x){ return /var\(--teal\)/.test(x.getAttribute('style')||''); })[0]; return b ? b.getAttribute('data-tipo') : ''; };
    window._fijar=function(monto){ var s=document.getElementById('ret-entrega'); s.value='Carola Chavez'; retEntregaCambio(); var m=document.getElementById('ret-monto'); m.value=String(monto); retCobrosPintar(); };
  }, L);

  console.log('\n── 1-2. La explicación y el tipo propuesto ──');
  let r = await ev(() => { abrirRetiros(); _fijar(1500); return { txt:_txt('#ret-tipo-box'), tipo:_tipoOn(), botones:document.querySelectorAll('#ret-tipo-box [data-tipo]').length }; });
  chk('1. explica: Facturado = ventas con factura · No facturado = ventas con nota de remisión', /Facturado\s*= plata de ventas con factura/.test(r.txt) && /No facturado\s*= plata de ventas con nota de remisión/.test(r.txt) && /dos recibos/.test(r.txt), r.txt.slice(0,300));
  const docs = await ev(() => [].map.call(document.querySelectorAll('#ret-cobros .ret-cob'), function(l){ var d=l.querySelector('.ret-cob-doc'); return l.querySelector('b').textContent+'|'+(d?d.textContent:''); }));
  chk('1b. cada cobro dice si la venta es con factura o con remisión', JSON.stringify(docs)===JSON.stringify(['CLIENTE FACTURA UNO|🧾 con factura','CLIENTE FACTURA DOS|🧾 con factura','CLIENTE REMISION|📄 con remisión']), docs);
  chk('2. con 1.500 se tildan las dos con factura → propone «Facturado» y dice «2 con factura · Bs 1.500,00»', r.tipo==='Facturado' && /2 con factura · Bs 1\.500,00/.test(r.txt) && r.botones===3, r);
  r = await ev(() => { _fijar(2200); return { txt:_txt('#ret-tipo-box'), tipo:_tipoOn(), dos:!!document.getElementById('ret-nota-nueva-r'), mf:(document.getElementById('ret-monto-f')||{}).value }; });
  chk('2b. con 2.200 (las tres: factura y remisión) → propone «Las dos», con dos recibos y lo facturado = 1.500', r.tipo==='Ambos' && r.dos && r.mf==='1500' && /No facturado: Bs 700,00/.test(r.txt), r);
  r = await ev(() => { var b=document.querySelector('#ret-cobros input[data-k*="f1"]'); b.checked=false; var b2=document.querySelector('#ret-cobros input[data-k*="f2"]'); b2.checked=false; retTickToggle(); return _tipoOn(); });
  chk('2c. tildada solo la de remisión → «No facturado»', r==='No facturado', r);

  console.log('\n── 3-5. «Las dos»: frenos y guardado ──');
  r = await ev(() => { abrirRetiros(); _fijar(2200); window._g=[]; var ok=guardarRetiroForm(); return { ok:ok, g:_g.length }; });
  chk('5. sin los recibos no guarda', r.ok===false && r.g===0, r);
  r = await ev(() => { document.getElementById('ret-nota-nueva').value='901'; retAgregarNota(); document.getElementById('ret-nota-nueva-r').value='901'; retAgregarNotaR(); window._g=[]; var ok=guardarRetiroForm(); return { ok:ok, g:_g.length }; });
  chk('5b. el mismo recibo en los dos no se acepta', r.ok===false && r.g===0, r);
  r = await ev(() => { retQuitarNotaR(0); document.getElementById('ret-nota-nueva-r').value='902'; retAgregarNotaR();
    var mf=document.getElementById('ret-monto-f'); mf.value='2200'; retLeerForm(); window._g=[]; var ok=guardarRetiroForm(); var o={ ok:ok, g:_g.length };
    mf=document.getElementById('ret-monto-f'); mf.value='1500'; retLeerForm(); return o; });
  chk('5c. lo facturado igual al total no se acepta (sería todo de un tipo)', r.ok===false && r.g===0, r);
  r = await ev(async () => { window._g=[]; RET_FORM.fotos=['FOTO_RECIBOS']; var ok=guardarRetiroForm(); await new Promise(function(x){ setTimeout(x, 200); });
    var R=_g.filter(function(x){ return /^__ret_/.test(x.id); }).map(function(x){ var o=retiroDe(x); return { tipo:o.tipo, monto:o.monto, notas:o.notas.join(','), tick:o.tick.map(function(t){ return t.id; }).sort().join(','), fotos:o.fotos.join(','), obs:o.obs }; });
    return { ok:ok, R:R, form:RET_FORM.tipo, notas:RET_FORM.notas.length };
  });
  var F=(r.R||[]).filter(x=>x.tipo==='Facturado')[0]||{}, N=(r.R||[]).filter(x=>x.tipo==='No facturado')[0]||{};
  chk('4. guarda DOS retiros', r.ok===true && (r.R||[]).length===2, r);
  chk('4b. el facturado: Bs 1.500, recibo 901, tilda las dos ventas con factura', F.monto===1500 && F.notas==='901' && F.tick==='f1,f2', F);
  chk('4c. el no facturado: Bs 700, recibo 902, tilda la venta con remisión', N.monto===700 && N.notas==='902' && N.tick==='r1', N);
  chk('4d. la foto va en los dos y cada uno dice cuál es el otro recibo', F.fotos==='FOTO_RECIBOS' && N.fotos==='FOTO_RECIBOS' && /el otro es el 902/.test(F.obs) && /el otro es el 901/.test(N.obs), [F.obs, N.obs]);
  chk('4e. el formulario queda limpio', r.form==='Facturado' && r.notas===0, r);

  console.log('\n── 6. A mano y editando ──');
  r = await ev(() => { abrirRetiros(); _fijar(2200); retSetTipo('Facturado'); _fijar(2200); return _tipoOn(); });
  chk('6. tocar «Facturado» a mano manda sobre lo propuesto', r==='Facturado', r);
  r = await ev(() => { var f=RETIROS.filter(function(x){ return /^__ret_/.test(x.id); })[0]; if(!f) return 'sin retiros'; editarRetiro(f.id); return { n:document.querySelectorAll('#ret-tipo-box [data-tipo]').length, ambos:!!document.querySelector('#ret-tipo-box [data-tipo="Ambos"]') }; });
  chk('6b. editando un retiro no aparece «Las dos»', r && r.n===2 && !r.ambos, r);

  chk('sin errores de la página', !errores.length, errores);
  console.log(`\n${PASS} bien · ${FAIL} mal`);
  await browser.close();
  process.exit(FAIL?1:0);
})();
