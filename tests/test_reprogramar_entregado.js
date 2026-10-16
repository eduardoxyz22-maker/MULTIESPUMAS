/* ✅ UN PEDIDO ENTREGADO QUE SE REPROGRAMA + 🏭 LO QUE EDITAR BORRABA (16/10, §4lo). El dueño eligió la «F» de la lista de mejoras:
   los dos errores que dejó anotados la auditoría del 06/10 (§4hq).

   ⚠️ LO QUE ESTA PRUEBA CUIDA (falla contra lo publicado, `6a55598`):
   1. 📅 Reprogramar un pedido ✅ a hoy o más adelante pregunta y le saca el ✅ y el registro del cierre (`eF`/`eT`/`eQ`): vuelve a
      «sin entregar», entra al cierre del día nuevo. Cancelar no toca nada. A un día que ya pasó (corregir el registro) queda ✅.
      Cambiar solo el turno queda ✅. Una ATC no se toca (su ✅ es el recojo o la devolución).
   2. Lo mismo moviendo la fecha desde ✏️ Editar (Cancelar no guarda). Editar sin mover la fecha conserva el ✅ y el registro, también
      en un renglón agregado.
   3. `reproAplicar` (el camino del cierre y de 📅) lo hace solo.
   4. Destildar el ✅ a mano saca el registro del cierre (su `eF` manda en las salidas del stock).
   5. ✏️ Editar conserva la llegada parcial de la línea 🏭 (`prodU`, `prodC`, `prodRm`) si el renglón no cambió; con otra cantidad,
      no (como `prodF`/`prodR`).
   Reloj clavado en el viernes 16/10/2026 10:00 de Bolivia. Red cortada, servidor simulado, datos sintéticos.
   Se corre:  node tests/test_reprogramar_entregado.js   (desde la raíz) · `PEDIDOS=<archivo>` corre contra otra página. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function BASE(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true; SERVER_AUTH='abierto';
  try{ localStorage.removeItem(LS_PEND); localStorage.removeItem(LS_RECHAZOS); }catch(e){}
  if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  CARGA_GEN++; CARGA_ESTADO='ok'; NO_ENCOLAR={}; SAVE_ULTIMO={}; SAVE_REV={};
  window._saves=[];
  apiSave=function(rec, opts){ window._saves.push({ rec:JSON.parse(JSON.stringify(rec)), opts:opts||null }); return Promise.resolve({ ok:true, pedido:JSON.parse(JSON.stringify(rec)) }); };
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
  /* La pregunta del ✅ se contesta con `_resp`; las demás, que sí. */
  window._resp=true; window._preg=[];
  window.confirm=function(m){ m=String(m); window._preg.push(m); return /figura ENTREGADO/.test(m) ? window._resp : true; };
  window._P=function(o){ return Object.assign({ id:'p'+Math.random().toString(36).slice(2), fecha:'2026-10-15', oc:'10-001', vendedor:'Carola Chavez',
    cliente:'C', celular:'70000000', turno:'PM', zona:'Norte', direccion:'Av. Banzer 123', maps:'', pagado:false, saldo:0,
    ts:Date.now(), metodoPago:'', observaciones:'', estado:'', entregado:true, vehiculo:'Foton nuevo', chofer:'Luis Pierre',
    garantia:'', nota:'123456', acuenta:0, facturarA:'', nit:'', nroDia:1, verificado:true, fotos:[],
    productos:[{ desc:'SOFT', medida:'140x190', cant:1, codigo:'CH1001', eF:'2026-10-15', eT:1760558400000, eQ:'Ernesto' }] }, o); };
  window._reg=function(p){ return (p.productos||[]).map(function(x){ return [x.eF||'', x.eT||0, x.eQ||''].join('|'); }); };
  window._ult=function(id){ for(var i=window._saves.length-1;i>=0;i--) if(window._saves[i].rec.id===id) return window._saves[i].rec; return null; };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const page = await browser.newPage({ viewport:{ width:1300, height:900 }, timezoneId:'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.install({ time:new Date('2026-10-16T10:00:00-04:00') });
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.clock.runFor(1500);
  await page.evaluate(BASE);
  const ev = (fn, arg) => page.evaluate(fn, arg).catch(e => ({ error:String(e.message||e).slice(0,300) }));
  const espera = (ms) => page.clock.runFor(ms);

  console.log('\n── 1. 📅 Reprogramar un pedido ✅ ──');
  let r = await ev(() => { STATE=[ _P({ id:'r1', cliente:'PM QUE NO SALIÓ' }) ]; saveMirror();
    window._preg=[]; window._resp=true;
    reprogramarPedido('r1'); REPRO.fecha='2026-10-19'; REPRO.turno='AM'; reproConfirmar();
    var p=findById('r1'), s=_ult('r1');
    return { hoy:todayStr(), preg:window._preg.slice(), ent:p.entregado, f:p.fecha, reg:_reg(p), sEnt:s?s.entregado:null, sReg:s?_reg(s):null,
             toast:(document.getElementById('toast')||{}).textContent||'' }; });
  chk('el reloj está en el viernes 16/10', r.hoy==='2026-10-16', r.hoy);
  chk('pregunta antes, diciendo que figura ENTREGADO y quién lo confirmó', r.preg.some(m => /figura ENTREGADO/.test(m) && /Ernesto/.test(m) && /19\/10|lunes/.test(m)), r.preg);
  chk('pasa al lunes 19/10 y ya NO figura entregado', r.f==='2026-10-19' && r.ent===false, { f:r.f, ent:r.ent });
  chk('…sin el registro del cierre (día, cuándo y quién)', (r.reg||[]).every(x => x==='|0|'), r.reg);
  chk('…y eso es lo que se guarda en la planilla', r.sEnt===false && (r.sReg||[]).every(x => x==='|0|'), { e:r.sEnt, reg:r.sReg });
  chk('el aviso lo dice', /ya no figura entregado/.test(r.toast), r.toast);

  r = await ev(() => { STATE=[ _P({ id:'r2' }) ]; saveMirror(); window._saves=[]; window._preg=[]; window._resp=false;
    reprogramarPedido('r2'); REPRO.fecha='2026-10-19'; REPRO.turno='AM'; reproConfirmar();
    var p=findById('r2'); return { ent:p.entregado, f:p.fecha, reg:_reg(p), saves:window._saves.length, preg:window._preg.length }; });
  chk('Cancelar en la pregunta no mueve ni guarda nada', r.preg>=1 && r.f==='2026-10-15' && r.ent===true && r.saves===0 && r.reg[0]==='2026-10-15|1760558400000|Ernesto', r);

  r = await ev(() => { STATE=[ _P({ id:'r3', fecha:'2026-10-14' }) ]; saveMirror(); window._preg=[]; window._resp=true;
    reprogramarPedido('r3'); REPRO.fecha='2026-10-15'; REPRO.turno='PM'; reproConfirmar();
    var p=findById('r3'); return { ent:p.entregado, f:p.fecha, reg:_reg(p), preg:window._preg.filter(function(m){ return /figura ENTREGADO/.test(m); }).length }; });
  chk('a un día que YA PASÓ es corregir el registro: queda ✅, sin preguntar por el ✅', r.f==='2026-10-15' && r.ent===true && r.preg===0 && r.reg[0]==='2026-10-15|1760558400000|Ernesto', r);

  r = await ev(() => { STATE=[ _P({ id:'r4', fecha:'2026-10-16', turno:'PM' }) ]; saveMirror(); window._preg=[]; window._resp=true;
    reprogramarPedido('r4'); REPRO.fecha='2026-10-16'; REPRO.turno='AM'; reproConfirmar();
    var p=findById('r4'); return { ent:p.entregado, t:p.turno, preg:window._preg.filter(function(m){ return /figura ENTREGADO/.test(m); }).length }; });
  chk('cambiar solo el turno del mismo día queda ✅', r.t==='AM' && r.ent===true && r.preg===0, r);

  r = await ev(() => { STATE=[ _P({ id:'r5', oc:'ATC 10-005', fecha:'2026-10-15' }) ]; saveMirror(); window._preg=[]; window._resp=true;
    reprogramarPedido('r5'); REPRO.fecha='2026-10-19'; REPRO.turno='AM'; reproConfirmar();
    var p=findById('r5'); return { ent:p.entregado, f:p.fecha, preg:window._preg.filter(function(m){ return /figura ENTREGADO/.test(m); }).length }; });
  chk('una ATC no se toca (su ✅ es el recojo o la devolución)', r.f==='2026-10-19' && r.ent===true && r.preg===0, r);

  r = await ev(() => { STATE=[ _P({ id:'r6', fecha:'2026-10-15' }) ]; saveMirror(); window._preg=[]; window._resp=true;
    reprogramarPedido('r6'); REPRO.fecha='2026-10-16'; REPRO.turno='PM'; reproConfirmar();
    var p=findById('r6'); return { ent:p.entregado, enCierre:cierreEntHoy('2026-10-16').map(function(x){ return x.id; }) }; });
  chk('pasado a HOY: deja de figurar entregado y entra al cierre de hoy', r.ent===false && r.enCierre.indexOf('r6')>=0, r);

  console.log('\n── 2. El camino del cierre y de 📅 (reproAplicar) ──');
  r = await ev(async () => { STATE=[ _P({ id:'a1' }) ]; saveMirror(); window._saves=[];
    var p=findById('a1'); await reproAplicar(p, '2026-10-17', 'AM', false);
    var s=_ult('a1'); return { ent:p.entregado, f:p.fecha, reg:_reg(p), sEnt:s?s.entregado:null }; });
  chk('reproAplicar a un día por venir saca el ✅ y el registro, y lo guarda así', r.f==='2026-10-17' && r.ent===false && r.sEnt===false && r.reg[0]==='|0|', r);
  r = await ev(async () => { STATE=[ _P({ id:'a2', fecha:'2026-10-16', turno:'PM' }) ]; saveMirror();
    var p=findById('a2'); await reproAplicar(p, '2026-10-16', 'AM', true, { adelanto:1 });
    return { ent:p.entregado, t:p.turno }; });
  chk('el adelanto (tarde → mañana del mismo día) no toca el ✅', r.t==='AM' && r.ent===true, r);

  console.log('\n── 3. ✏️ Editar: mover la fecha de un pedido ✅ ──');
  r = await ev(async () => { STATE=[ _P({ id:'e1', cliente:'EDITAR FECHA' }) ]; saveMirror(); window._saves=[]; window._preg=[]; window._resp=true;
    showView('form'); editPedido('e1'); await new Promise(function(res){ setTimeout(res, 250); });
    document.getElementById('f-fecha').value='2026-10-20'; segSet('f-turno','AM');
    submitPedido(); await new Promise(function(res){ setTimeout(res, 600); });
    var s=_ult('e1'), p=findById('e1');
    return { preg:window._preg.filter(function(m){ return /figura ENTREGADO/.test(m); }), s:s?{ f:s.fecha, ent:s.entregado, reg:_reg(s) }:null, ent:p&&p.entregado }; });
  chk('pregunta al mover la fecha de un pedido ✅', r.preg.length===1 && /20\/10|martes/.test(r.preg[0]), r.preg);
  chk('…y se guarda en el 20/10 sin el ✅ ni el registro', r.s && r.s.f==='2026-10-20' && r.s.ent===false && r.s.reg.every(x => x==='|0|'), r.s);

  r = await ev(async () => { STATE=[ _P({ id:'e2', cliente:'CANCELA' }) ]; saveMirror(); window._saves=[]; window._preg=[]; window._resp=false;
    showView('form'); editPedido('e2'); await new Promise(function(res){ setTimeout(res, 250); });
    document.getElementById('f-fecha').value='2026-10-20'; segSet('f-turno','AM');
    submitPedido(); await new Promise(function(res){ setTimeout(res, 600); });
    var p=findById('e2'); return { saves:window._saves.length, ent:p.entregado, f:p.fecha, edit:EDIT_ID, preg:window._preg.length }; });
  chk('Cancelar no guarda y deja el formulario abierto en la edición', r.preg>=1 && r.saves===0 && r.ent===true && r.f==='2026-10-15' && r.edit==='e2', r);

  r = await ev(async () => { STATE=[ _P({ id:'e3', cliente:'SOLO LA DIRECCION' }) ]; saveMirror(); window._saves=[]; window._preg=[]; window._resp=true;
    showView('form'); editPedido('e3'); await new Promise(function(res){ setTimeout(res, 250); });
    document.getElementById('f-direccion').value='Calle corregida 45';
    submitPedido(); await new Promise(function(res){ setTimeout(res, 600); });
    var s=_ult('e3'); return { s:s?{ ent:s.entregado, reg:_reg(s), dir:s.direccion }:null, preg:window._preg.filter(function(m){ return /figura ENTREGADO/.test(m); }).length }; });
  chk('editar SIN mover la fecha conserva el ✅ y el registro del cierre', r.s && r.s.dir==='Calle corregida 45' && r.s.ent===true && r.s.reg[0]==='2026-10-15|1760558400000|Ernesto' && r.preg===0, r);

  r = await ev(async () => { STATE=[ _P({ id:'e4', cliente:'AGREGA UNO' }) ]; saveMirror(); window._saves=[];
    showView('form'); editPedido('e4'); await new Promise(function(res){ setTimeout(res, 250); });
    addProdRow('ALMOHADA FIBRA', '50x70', '', 2);
    submitPedido(); await new Promise(function(res){ setTimeout(res, 600); });
    var s=_ult('e4'); return { n:s?s.productos.length:0, reg:s?_reg(s):null, ent:s?s.entregado:null }; });
  chk('un renglón agregado a un pedido ✅ lleva el mismo registro del cierre', r.n===2 && r.ent===true && r.reg.every(x => x==='2026-10-15|1760558400000|Ernesto'), r);

  console.log('\n── 4. Destildar el ✅ a mano ──');
  r = await ev(() => { STATE=[ _P({ id:'t1' }), _P({ id:'t2' }) ]; saveMirror();
    toggleEntregado('t1'); quickEntregado('t2');
    return { a:{ e:findById('t1').entregado, reg:_reg(findById('t1')) }, b:{ e:findById('t2').entregado, reg:_reg(findById('t2')) } }; });
  chk('destildar desde la ficha saca el registro del cierre', r.a.e===false && r.a.reg[0]==='|0|', r.a);
  chk('…y desde la tabla de Administración también', r.b.e===false && r.b.reg[0]==='|0|', r.b);
  r = await ev(() => { STATE=[ _P({ id:'t3', entregado:false, productos:[{ desc:'SOFT', medida:'140x190', cant:1, codigo:'CH1001' }] }) ]; saveMirror();
    toggleEntregado('t3'); var p=findById('t3'); return { e:p.entregado, reg:_reg(p) }; });
  chk('marcar a mano sigue igual (sin registro del cierre: no se inventa)', r.e===true && r.reg[0]==='|0|', r);

  console.log('\n── 5. ✏️ Editar conserva la llegada parcial de la línea 🏭 ──');
  const PROD = { desc:'TITANIO LATEX', medida:'160x190', cant:3, codigo:'CH2000', enProd:true, chk:'prod', prodEn:'2026-10-10', prodF:'2026-10-10',
                 prodU:2, prodC:['c-ptf-1','c-ptf-2'] };
  r = await ev(async (PROD) => { STATE=[ _P({ id:'f1', fecha:'2026-10-20', turno:'AM', entregado:false, cliente:'FABRICA PARCIAL', productos:[Object.assign({}, PROD)] }) ]; saveMirror(); window._saves=[];
    showView('form'); editPedido('f1'); await new Promise(function(res){ setTimeout(res, 250); });
    document.getElementById('f-direccion').value='Otra calle 9';
    submitPedido(); await new Promise(function(res){ setTimeout(res, 600); });
    var s=_ult('f1'), x=s?s.productos[0]:{};
    return { prodU:x.prodU, prodC:x.prodC, prodF:x.prodF, enProd:x.enProd, enConteo:(typeof prodUnidEnStock==='function') ? prodUnidEnStock(x) : null }; }, PROD);
  chk('corregir la dirección conserva cuántas llegaron (prodU) y qué cortes las anotaron (prodC)', r.prodU===2 && JSON.stringify(r.prodC)==='["c-ptf-1","c-ptf-2"]', r);
  chk('…y lo llegado sigue contando para ese cliente (2 de 3)', r.enConteo===2 && r.enProd===true && r.prodF==='2026-10-10', r);

  r = await ev(async (PROD) => { STATE=[ _P({ id:'f2', fecha:'2026-10-20', turno:'AM', entregado:false, cliente:'FABRICA COMPLETA',
      productos:[Object.assign({}, PROD, { prodU:3, prodR:'2026-10-14', prodRm:'excel', chk:'ok' })] }) ]; saveMirror(); window._saves=[];
    showView('form'); editPedido('f2'); await new Promise(function(res){ setTimeout(res, 250); });
    document.getElementById('f-obs').value='llamar antes';
    submitPedido(); await new Promise(function(res){ setTimeout(res, 600); });
    var s=_ult('f2'), x=s?s.productos[0]:{}; return { prodRm:x.prodRm, prodR:x.prodR, prodU:x.prodU }; }, PROD);
  chk('una línea 🏭 sellada desde el Excel conserva el sello «lo dijo el Excel» (prodRm)', r.prodRm==='excel' && r.prodR==='2026-10-14' && r.prodU===3, r);

  r = await ev(async (PROD) => { STATE=[ _P({ id:'f3', fecha:'2026-10-20', turno:'AM', entregado:false, cliente:'CAMBIA CANTIDAD', productos:[Object.assign({}, PROD)] }) ]; saveMirror(); window._saves=[];
    showView('form'); editPedido('f3'); await new Promise(function(res){ setTimeout(res, 250); });
    document.querySelector('#f-productos .prod-cant').value='5';
    submitPedido(); await new Promise(function(res){ setTimeout(res, 600); });
    var s=_ult('f3'), x=s?s.productos[0]:{}; return { cant:x.cant, prodU:x.prodU, prodC:x.prodC, prodF:x.prodF }; }, PROD);
  chk('con otra cantidad la línea se revisa de nuevo: no hereda lo llegado (como prodF)', String(r.cant)==='5' && r.prodU==null && r.prodC==null && r.prodF==null, r);

  console.log('\n── 6. Sin errores ──');
  chk('la página no tiró ningún error de JavaScript', errores.length===0, errores.slice(0,3));

  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
