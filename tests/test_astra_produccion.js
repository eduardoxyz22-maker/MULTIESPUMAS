/* 🏭 (§4nl, 27/10, Astra A11) Un producto que estaba «en producción» y YA LLEGÓ (logística marcó ✔ hay: `setProdChk` deja chk='ok',
   `prodR` y el pedido verificado) seguía diciendo «🏭 En producción» y la ficha de Administración salía ROJA, mientras «Semana» lo daba
   por listo. `estadoStock` (y el estado que guarda `syncVerificado`) miraban la marca 🏭 (`enProd`, que queda como historia, con
   `prodF`/`prodR` para medir la fábrica) en vez de lo que todavía FALTA llegar (`enProduccionPendiente`). Se cubre: la llegada entera
   (a mano y por el Excel), la parcial (llegaron 1 de 2: sigue en producción) y la mixta (una llegó y otra no / una llegó y la otra hay).
   Pedidos inventados, reloj clavado en el martes 27/10/2026.
   Se corre:  node tests/test_astra_produccion.js        Dientes:  PEDIDOS=/ruta/a/pedidos_viejo.html node tests/test_astra_produccion.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_u2_turno.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));
(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{ width:1440, height:900 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('dialog', d=>d.accept());
  await page.clock.setFixedTime(new Date('2026-10-27T09:10:00-04:00'));   // martes
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');
  const r = await page.evaluate(async()=>{
    window.ADM_FICHAS_PRUEBA=1; UNLOCKED=true;
    // el servidor de mentira guarda lo que se le manda (si no, la lectura siguiente devuelve la marca de antes)
    apiSave=function(rec){ if(rec && rec.id!=='__stock__'){ var L=window._SRV.pedidos, i=L.findIndex(function(q){ return q.id===rec.id; }); var c=JSON.parse(JSON.stringify(rec)); if(i>=0) L[i]=c; else L.push(c); } return Promise.resolve({ ok:true, pedido:rec }); };
    var F='2026-10-29', fab={ enProd:true, prodEn:'Moreno', prodF:'2026-10-22' };
    var T=function(ex){ return _lin(_T, 1, Object.assign({}, fab, ex||{})); };
    var S=function(ex){ return _lin(_S, 1, ex||{}); };
    var ps=[
      // llega entera, logística toca ✔ hay (setProdChk)
      _ped('a1', F, 'AM', [T({ chk:'no' })], { cliente:'CLIENTE LLEGA', estado:'En producción', ts:_ts('2026-10-21','09:00:00') }),
      // parcial: llegó 1 de 2 por el Excel, sin sello: sigue en producción
      _ped('a2', F, 'AM', [_lin(_T, 2, Object.assign({}, fab, { chk:'no', prodU:1, prodC:['c1'], prodCu:[['c1',1,'PRODUCTOS TERMINADOS FAB.','2026-10-26','10:05:32']] }))], { cliente:'CLIENTE PARCIAL', estado:'En producción', ts:_ts('2026-10-21','09:10:00') }),
      // mixta: una llegó, la otra no
      _ped('a3', F, 'AM', [T({ chk:'ok', prodR:'2026-10-26', prodRt:_ts('2026-10-26','11:00:00') }), _lin(_S, 1, Object.assign({}, fab, { chk:'no' }))], { cliente:'CLIENTE MITAD', estado:'En producción', ts:_ts('2026-10-21','09:20:00') }),
      // mixta: una llegó y la otra está en el depósito
      _ped('a4', F, 'PM', [T({ chk:'ok', prodR:'2026-10-26', prodRt:_ts('2026-10-26','11:00:00') }), S({ chk:'ok' })], { cliente:'CLIENTE DOS LISTOS', estado:'En producción', ts:_ts('2026-10-21','09:30:00') }),
      // llegó entera por el Excel (sello del control del corte)
      _ped('a5', F, 'PM', [_lin(_T, 2, Object.assign({}, fab, { chk:'ok', prodU:2, prodC:['c1'], prodR:'2026-10-26', prodRm:'excel', prodRt:_ts('2026-10-26','10:05:32') }))], { cliente:'CLIENTE EXCEL', estado:'En producción', ts:_ts('2026-10-21','09:40:00') })
    ];
    await _cargar(ps, _stock(function(s){ s.c.u[_K]=10; s.c.u[_K2]=5; }));
    document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block';
    showView('admin'); var seg=document.querySelector('#adm-mode [data-val="todo"]'); if(seg) seg.click(); renderAdmin();
    var antes={ txt:estadoStock(findById('a1')).txt, color:admFichaColor(findById('a1')) };
    setProdChk('a1', 0, 'ok');   // ✔ hay: llegó lo pedido a fábrica
    await new Promise(function(res){ setTimeout(res, 80); });
    closeModal(); renderAdmin();
    var ver=function(id){
      var p=findById(id), cls=(document.querySelector('#adm-fichas .af-f[data-pid="'+id+'"]')||{}).className||'';
      return { txt:estadoStock(p).txt, badge:estadoStock(p).badge, color:admFichaColor(p), ficha:cls, estado:p.estado||'', fila:rowKind(p),
               semana:(p.productos||[]).map(function(x){ return semanaLinea(p, x); }), verif:!!p.verificado };
    };
    var x1=findById('a1').productos[0];
    var o={ antes:antes, marca:{ chk:x1.chk, prodR:x1.prodR||'', enProd:!!x1.enProd, prodF:x1.prodF||'' }, a1:ver('a1'), a2:ver('a2'), a3:ver('a3'), a4:ver('a4'), a5:ver('a5') };
    showPedidoModal('a1'); var m=document.getElementById('modal'); o.modal=(m.querySelector('.fl-est')||m).innerText.replace(/\s+/g,' '); closeModal();
    return o;
  });
  console.log('\n── Llegó entera (✔ hay a mano) ──');
  chk('antes de marcar: «En producción» y la ficha roja (le falta llegar)', /En producción/.test(r.antes.txt) && r.antes.color==='nohay', r.antes);
  chk('setProdChk deja ✔ hay con el día que llegó, y la marca 🏭 + el día que se pidió quedan como historia', r.marca.chk==='ok' && r.marca.prodR==='2026-10-27' && r.marca.enProd && r.marca.prodF==='2026-10-22', r.marca);
  chk('ya no dice «En producción»: «En stock»', r.a1.txt==='En stock' && r.a1.badge==='b-green', r.a1);
  chk('la ficha de Administración sale VERDE (af-k-stock), no roja', r.a1.color==='stock' && /af-k-stock/.test(r.a1.ficha) && !/af-k-nohay/.test(r.a1.ficha), r.a1);
  chk('lo mismo que «Semana» (listo) y el pedido verificado', r.a1.semana.join()==='listo' && r.a1.verif, r.a1);
  chk('el estado guardado del pedido (columna Estado, color de la fila, tarjeta del chofer) pasa a «En stock»', r.a1.estado==='En stock' && r.a1.fila==='stock', r.a1);
  chk('la ficha grande dice «Stock: 🟢 En stock», sin «a mano: En producción» al lado', /Stock: 🟢 En stock/.test(r.modal) && !/a mano/.test(r.modal), r.modal);
  console.log('\n── Parcial ──');
  chk('llegaron 1 de 2 (sin sello): sigue «En producción», ficha roja, igual que «Semana»', /En producción/.test(r.a2.txt) && r.a2.color==='nohay' && r.a2.semana.join()!=='listo', r.a2);
  console.log('\n── Mixta ──');
  chk('una llegó y la otra no: «En producción (1 de 2)» y roja', /En producción/.test(r.a3.txt) && /\(1 de 2\)/.test(r.a3.txt) && r.a3.color==='nohay', r.a3);
  chk('una llegó y la otra hay: «En stock» y verde, como «Semana»', r.a4.txt==='En stock' && r.a4.color==='stock' && r.a4.semana.join()==='listo,listo', r.a4);
  chk('llegó entera por el Excel (sello del corte): «En stock» y verde', r.a5.txt==='En stock' && r.a5.color==='stock' && r.a5.semana.join()==='listo', r.a5);
  chk('sin errores en la página', errs.length===0, errs);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
