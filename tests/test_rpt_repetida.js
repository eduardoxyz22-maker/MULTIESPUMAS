/* 🏪 «CHARCAS YA PIDIÓ ESTO»: LA REPOSICIÓN REPETIDA (15/11/2026, mejora 317; dueño: «317»).
   Charcas cargó 3 RPT de 5 SUEÑA LITE 105x190 en 28 horas: el aviso de pedido repetido dejaba afuera las RPT.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin `RPT_DUP_PRUEBA` nada cambia: una RPT nueva no avisa y Administración no muestra el cuadro por tienda.
   2. En una RPT NUEVA de Charcas con SUEÑA LITE 105x190: el cuadro ámbar dice «Charcas ya pidió este producto y todavía no le llegó» con las
      dos pendientes (la entregada no) y «👀 Ver»; con otro producto u otra tienda, nada.
   3. Al guardar pregunta «¿REPOSICIÓN REPETIDA?»: Cancelar no guarda, Aceptar sí (solo avisa).
   4. Administración con el chip «🏪 Reposiciones»: las tiendas con 2 o más RPT sin entregar, lo pedido en más de una («⚠️ 10 … (en 2
      RPT)») y «📅 Mandarlas el mismo día» solo donde van en días distintos; con otro chip, no está.
   5. «📅 Mandarlas el mismo día» pregunta y pasa la segunda al día y turno de la primera (un guardado); Cancelar no mueve nada.
   Datos SINTÉTICOS. Reloj clavado el jueves 05/11/2026 a las 10:00. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_rpt_repetida.js */
const { chromium } = require('playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport:{ width:1366, height:950 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e=>errores.push(e.message));
  page.__resp=[]; page.__dlg=[]; page.on('dialog', d => { page.__dlg.push(d.message()); const r=page.__resp.length?page.__resp.shift():true; r?d.accept():d.dismiss(); });
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.setFixedTime(new Date('2026-11-05T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(500);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  const armar = () => ev(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    loadFromServer=function(){};
    try{ localStorage.removeItem(LS_PEND); }catch(e){}
    var d1=proximoDiaEntrega(), d2=sigDiaHabil(d1), n=0;
    var R=function(id, oc, cli, f, prods, o){ n++; return Object.assign({ id:id, oc:oc, cliente:cli, fecha:f, turno:'AM', nroDia:n, vendedor:'Mirian Salazar', zona:'Centro', direccion:'', vehiculo:'', chofer:'',
      productos:prods.map(function(x){ return { desc:x[0], medida:x[1], codigo:x[2]||'', cant:x[3], rtipo:'Reposición' }; }), entregado:false, ts:Date.now()-86400000*n, rev:2, fotos:[] }, o||{}); };
    STATE=[
      R('r1', 'RPT 11-031', 'Charcas', d1, [['COLCHON SUEÑA LITE','105x190','CH2531',5]]),
      R('r2', 'RPT 11-029', 'TIENDA CHARCAS', d2, [['COLCHON SUEÑA LITE','105x190','CH2531',5], ['ALMOHADA FIBRA SILICONADA','50x70','',2]]),
      R('r5', 'RPT 11-020', 'Charcas', '2026-11-03', [['COLCHON SUEÑA LITE','105x190','CH2531',5]], { entregado:true }),
      R('m1', 'RPT 11-030', 'Mutualista', d2, [['COLCHON CONFORT PLUS','140x190','',4]]),
      R('m2', 'RPT 11-033', 'Mutualista', d2, [['COLCHON SUEÑA LITE','105x190','CH2531',4]])
    ];
    window._env=[];
    apiPost=function(pl){ var c=JSON.parse(JSON.stringify(pl)); window._env.push(c);
      if(c.action==='save'){ var p=Object.assign({}, c.pedido, { rev:(Number(c.pedido.rev)||0)+1 }); return Promise.resolve({ ok:true, version:'2026-11-14-a', pedido:p, mode:'update', ahora:Date.now() }); }
      return Promise.resolve({ ok:true }); };
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
    return { d1:d1, d2:d2 };
  });
  const formRpt = (o) => ev((o) => {
    showView('form'); resetForm();
    segSet('f-doc-tipo','RPT'); setDocTipo();
    document.getElementById('f-vendedor').value='Mirian Salazar'; applyVendedorLite();
    document.getElementById('f-rpt-suc').value=o.suc; sucursalElegida();
    var card=document.querySelector('#f-productos .prod-card');
    card.querySelector('.prod-desc').value=o.d; card.querySelector('.prod-medida').value=o.m; card.querySelector('.prod-codigo').value=o.c||''; card.querySelector('.prod-cant').value='5';
    fxDupPintar();
    var el=document.getElementById('fx-dup');
    return { vis:!el.hidden, txt:el.hidden?'':el.innerText, ver:el.querySelectorAll('button').length };
  }, o);

  let D = await armar();
  console.log('\n── 1. Sin la bandera ──');
  let r = await formRpt({ suc:'Charcas', d:'COLCHON SUEÑA LITE', m:'105x190', c:'CH2531' });
  chk('una RPT nueva de Charcas con lo mismo: sin aviso (como siempre)', !r.vis, r);
  r = await ev(() => { showView('admin'); QUICK_FILTER='rpt'; ADM_HOY_DEF=false; renderAdmin(); var el=document.getElementById('adm-rpt-tiendas'); return { hidden:el.hidden, h:el.innerHTML }; });
  chk('Administración sin el cuadro por tienda', r.hidden && r.h==='', r);

  console.log('\n── 2. El aviso en el formulario ──');
  await ev(() => { window.RPT_DUP_PRUEBA=1; });
  r = await formRpt({ suc:'Charcas', d:'COLCHON SUEÑA LITE', m:'105x190', c:'CH2531' });
  chk('«Charcas ya pidió este producto y todavía no le llegó»', r.vis && /Charcas ya pidió este producto y todavía no le llegó/.test(r.txt) && /otro pedido o es el mismo/.test(r.txt), r.txt);
  chk('con las dos pendientes (11-031 y 11-029, la más próxima primero) y no la entregada', /RPT 11-031 · 5 COLCHON SUEÑA LITE 105x190 · para el/.test(r.txt) && /RPT 11-029 · 5 COLCHON SUEÑA LITE 105x190 · para el/.test(r.txt) && r.txt.indexOf('11-031')<r.txt.indexOf('11-029') && !/11-020/.test(r.txt) && r.ver===2, r.txt);
  r = await formRpt({ suc:'Charcas', d:'COLCHON TITANIO LATEX', m:'140x190', c:'' });
  chk('otro producto: nada', !r.vis, r);
  r = await formRpt({ suc:'Mia Plaza', d:'COLCHON SUEÑA LITE', m:'105x190', c:'CH2531' });
  chk('otra tienda: nada', !r.vis, r);

  console.log('\n── 3. Al guardar pregunta ──');
  await formRpt({ suc:'Charcas', d:'COLCHON SUEÑA LITE', m:'105x190', c:'CH2531' });
  page.__resp=[false]; page.__dlg=[];
  r = await ev(() => { FX_DUP_OK=''; return fxDupConfirmar(); });
  chk('pregunta «¿REPOSICIÓN REPETIDA?» y con Cancelar no sigue', r===false && /REPOSICIÓN REPETIDA/.test(page.__dlg[0]||'') && /Charcas ya pidió/.test(page.__dlg[0]||''), page.__dlg);
  page.__resp=[true]; page.__dlg=[];
  r = await ev(() => { FX_DUP_OK=''; return fxDupConfirmar(); });
  chk('con Aceptar sigue (solo avisa)', r===true, r);

  console.log('\n── 4. Administración, chip «🏪 Reposiciones» ──');
  r = await ev(() => {
    showView('admin'); QUICK_FILTER='rpt'; ADM_HOY_DEF=false; renderAdmin();
    var el=document.getElementById('adm-rpt-tiendas'), filas=[].map.call(el.querySelectorAll('.rtd-t'), function(x){ return x.innerText.replace(/\s+/g,' '); });
    var junta=[].map.call(el.querySelectorAll('.rtd-junta'), function(b){ return b.getAttribute('data-s'); });
    return { vis:!el.hidden, filas:filas, junta:junta };
  });
  chk('se ve con las dos tiendas con 2 RPT sin entregar (Charcas primero: pidió lo mismo dos veces)', r.vis && r.filas.length===2 && /^🏪 Charcas · 2 RPT/.test(r.filas[0]) && /^🏪 Mutualista · 2 RPT/.test(r.filas[1]), r.filas);
  chk('Charcas: «⚠️ 10 … SUEÑA LITE 105x190 (en 2 RPT)»', /⚠️ 10 COLCHON SUEÑA LITE 105x190 \(en 2 RPT\)/.test(r.filas[0]), r.filas[0]);
  chk('«📅 Mandarlas el mismo día» solo en Charcas (Mutualista ya va el mismo día)', r.junta.join()==='Charcas', r.junta);
  r = await ev(() => { QUICK_FILTER='todos'; renderAdmin(); var el=document.getElementById('adm-rpt-tiendas'); return el.hidden; });
  chk('con otro chip no está', r===true, r);

  console.log('\n── 5. «📅 Mandarlas el mismo día» ──');
  page.__resp=[false]; page.__dlg=[];
  r = await ev(async (D) => { QUICK_FILTER='rpt'; renderAdmin(); window._env=[]; var res=await rptTiendasJuntar('Charcas'); return { n:res.length, f:findById('r2').fecha, env:window._env.length }; }, D);
  chk('pregunta (con la que se mueve y el día nuevo) y Cancelar no mueve nada', r.n===0 && r.f===D.d2 && r.env===0 && /Mandar las reposiciones de Charcas el mismo día/.test(page.__dlg[0]||'') && /RPT 11-029/.test(page.__dlg[0]||''), { r:r, dlg:page.__dlg });
  page.__resp=[true, true, true]; page.__dlg=[];
  r = await ev(async () => { window._env=[]; var res=await rptTiendasJuntar('Charcas'); await new Promise(function(ok){ setTimeout(ok, 200); });
    var sv=window._env.filter(function(c){ return c.action==='save'; }).map(function(c){ return c.pedido.id+'|'+c.pedido.fecha+'|'+c.pedido.turno; });
    var el=document.getElementById('adm-rpt-tiendas');
    return { n:res.length, f:findById('r2').fecha, t:findById('r2').turno, f1:findById('r1').fecha, sv:sv, junta:[].map.call(el.querySelectorAll('.rtd-junta'), function(b){ return b.getAttribute('data-s'); }) }; });
  chk('Aceptar: la 11-029 pasa al día y turno de la 11-031 (un guardado) y la 11-031 no se toca', r.n===1 && r.f===D.d1 && r.t==='AM' && r.f1===D.d1 && r.sv.length===1 && r.sv[0]==='r2|'+D.d1+'|AM', r);
  chk('después, ya no ofrece juntarlas', r.junta.length===0, r.junta);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
