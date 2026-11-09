/* 🚚 LA PLANILLA DEL RECARGO POR ENTREGA, POR VENDEDOR (06/11). El dueño: «una planilla aparte de "cobro por entrega" pero por cada
   vendedor»; eligió «el recargo por entrega» (el flete que el cliente paga aparte).

   ⚠️ LO QUE ESTA PRUEBA CUIDA (contra lo publicado, `4138911`, no existe el botón):
   1. El botón «🚚 Recargos por vendedor» está en «⬇️ Bajar» de Contabilidad.
   2. Entran SOLO las ventas de la tabla (mismo período) que tienen recargo; sin ATC ni RPT; otro mes, no.
   3. «Resumen» con una fila por vendedor (pactado / cobrado / por cobrar) y el TOTAL; después UNA HOJA POR VENDEDOR.
   4. Cada recargo es un renglón: cobrado (con día, método, banco, nota del pago y quién tiene el efectivo) o por cobrar.
   5. Las cuentas dan lo mismo que `envioTotal`/`envioCobrado`/`envioPorCobrar`.
   6. El nombre de la hoja no pasa de 31 letras ni lleva []:*?/\.
   7. Sin recargos en el período: avisa y no baja nada.
   Datos SINTÉTICOS. Reloj clavado en el viernes 06/11/2026.
   Se corre:  node tests/test_recargos_vendedor.js   (desde la raíz del repo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,700)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  var q=document.getElementById('quien'); if(q) q.hidden=true;
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR=''; ULTIMO_REFRESCO=Date.now();
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  loadFromServer=function(){};
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
  apiSave=function(p){ return Promise.resolve({ ok:true, pedido:p }); };
  window._bajadas=[]; window._hojas=null; window._toasts=[];
  window.buildXlsx=function(sh){ window._hojas=JSON.parse(JSON.stringify(sh)); return new Uint8Array([1]); };
  window.downloadBlob=function(b, n){ window._bajadas.push(n); };
  var _t=window.toast; window.toast=function(m,k){ window._toasts.push(String(m)); try{ return _t.apply(this, arguments); }catch(e){} };
  var ts=function(f){ return new Date(f+'T11:00:00-04:00').getTime(); };
  var P=function(o){ return Object.assign({ id:'x', oc:'11-001', nota:'', vendedor:'Mirian Salazar', cliente:'', celular:'70011111', fecha:'2026-11-05', turno:'AM',
    productos:[{ desc:'COLCHON TITANIO', medida:'140x190', cant:1, precio:3000 }], saldo:0, acuenta:0, pagado:false, metodoPago:'', entregado:false,
    fotos:[], zona:'Norte', direccion:'Calle 1', maps:'', ts:ts('2026-11-02') }, o); };
  STATE=[
    // Mirian: un recargo cobrado en efectivo por el chofer y otro por cobrar
    P({ id:'m1', oc:'11-010', nota:'5001', cliente:'Ana Pérez', zona:'Norte', saldo:3000, metodoPago:'^Efectivo 50 @2026-11-04 #900 >Luis Pierre', entregado:true, ts:ts('2026-11-02') }),
    P({ id:'m2', oc:'11-011', nota:'5002', cliente:'Bruno Díaz', zona:'Sur', saldo:2000, metodoPago:'^ 40', ts:ts('2026-11-03') }),
    // Maria: un QR cobrado y una venta con dos fletes (uno cobrado, otro no)
    P({ id:'f1', oc:'11-012', nota:'6001', vendedor:'Maria Flores', cliente:'Carla Soto', zona:'Centro', metodoPago:'~QR BISA 1000 @2026-11-02 #6001 + ^QR BISA 60 @2026-11-05 #910', saldo:2000, ts:ts('2026-11-02') }),
    P({ id:'f2', oc:'11-013', nota:'6002', vendedor:'Maria Flores', cliente:'Diego Ruiz', zona:'Este', metodoPago:'^Efectivo 30 @2026-11-05 #911 + ^ 20', saldo:2500, ts:ts('2026-11-04') }),
    // Sin recargo: no entra
    P({ id:'i1', oc:'11-014', nota:'7001', vendedor:'Isabel Robledo', cliente:'Elena Vaca', saldo:1500, ts:ts('2026-11-03') }),
    // Recargo de OCTUBRE: con el mes de noviembre no entra
    P({ id:'o1', oc:'10-300', nota:'5000', cliente:'Fabio Gil', metodoPago:'^ 70', saldo:1000, fecha:'2026-10-20', ts:ts('2026-10-15') }),
    // ATC con un recargo escrito: no es una venta
    P({ id:'a1', oc:'ATC 11-001', cliente:'Ana Pérez', metodoPago:'^ 80', saldo:0, ts:ts('2026-11-03') }),
    // Un vendedor con un nombre que Excel no acepta como hoja
    P({ id:'z1', oc:'11-015', nota:'8001', vendedor:'Vendedor/Prueba [Muy largo para una hoja de Excel]', cliente:'Gina Paz', metodoPago:'^Efectivo 25 @2026-11-04 #920', saldo:900, ts:ts('2026-11-04') })
  ];
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const page = await browser.newPage({ viewport:{ width:1280, height:900 }, timezoneId:'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.install({ time:new Date('2026-11-06T10:00:00-04:00') });
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.clock.runFor(1700);
  await page.evaluate(PREPARAR);
  const ev = (fn, arg) => page.evaluate(fn, arg).catch(e => ({ error:String(e.message||e).slice(0,300) }));

  console.log('\n── 1. El botón ──');
  let r = await ev(() => {
    var b=document.getElementById('cta-recargos');
    return { hay:!!b, txt:b && b.textContent.trim(), grupo:b ? (b.closest('.cx-gr')||{}).className : '' };
  });
  chk('1a el botón «🚚 Recargos por vendedor» existe', r.hay && /Recargos por vendedor/.test(r.txt), r);
  chk('1b está en el grupo «Bajar» de Contabilidad', /cx-gr-bajar/.test(r.grupo||''), r);

  console.log('\n── 2-5. El Excel del mes ──');
  r = await ev(() => {
    showView('conta');
    var m=document.getElementById('cta-mes'); if(m) m.value='2026-11';
    try{ segSet('cta-mode','mes'); }catch(e){}
    document.getElementById('cta-recargos').click();
    var H=window._hojas||[];
    var txt=function(c){ return (c && typeof c==='object') ? c.v : c; };
    return { bajadas:window._bajadas.slice(), nombres:H.map(function(h){ return h.name; }),
             res:(H[0]||{matrix:[]}).matrix.map(function(f){ return (f||[]).map(txt); }),
             hojas:H.slice(1).map(function(h){ return { n:h.name, m:h.matrix.map(function(f){ return (f||[]).map(txt); }) }; }),
             cuentas:['m1','m2','f1','f2','z1'].map(function(id){ var p=findById(id); return [id, envioTotal(p), envioCobrado(p), envioPorCobrar(p)]; }),
             toasts:window._toasts.slice() };
  });
  chk('2a bajó un archivo', r.bajadas && r.bajadas.length===1 && /^recargos-por-entrega-2026-11/.test(r.bajadas[0]), r.bajadas);
  chk('3a la primera hoja es «Resumen»', r.nombres && r.nombres[0]==='Resumen', r.nombres);
  var resV=(r.res||[]).slice(1).filter(f=>f[0] && f[0]!=='TOTAL' && typeof f[1]==='number').map(f=>f[0]);
  chk('2b solo los vendedores con recargo en noviembre (Mirian, Maria y el de prueba; no Isabel)', resV.length===3 && resV.indexOf('Isabel Robledo')<0, resV);
  var fil=n=>(r.res||[]).find(f=>f[0]===n)||[];
  chk('5a Mirian: pactado 90 = 50 cobrado + 40 por cobrar (sin el de octubre ni la ATC)', fil('Mirian Salazar')[1]===2 && fil('Mirian Salazar')[2]===90 && fil('Mirian Salazar')[3]===50 && fil('Mirian Salazar')[4]===40, fil('Mirian Salazar'));
  chk('5b Maria: pactado 110 = 90 cobrado + 20 por cobrar', fil('Maria Flores')[2]===110 && fil('Maria Flores')[3]===90 && fil('Maria Flores')[4]===20, fil('Maria Flores'));
  var tot=fil('TOTAL');
  chk('3b el TOTAL suma todo (225 = 165 + 60)', tot[1]===5 && tot[2]===225 && tot[3]===165 && tot[4]===60, tot);
  var cu=r.cuentas||[], sumT=0, sumC=0, sumF=0; cu.forEach(x=>{ sumT+=x[1]; sumC+=x[2]; sumF+=x[3]; });
  chk('5c el total es el de envioTotal / envioCobrado / envioPorCobrar', Math.abs(sumT-225)<0.005 && Math.abs(sumC-165)<0.005 && Math.abs(sumF-60)<0.005, cu);
  const porV = await ev(() => {
    var L = contaLista(), M = {};
    L.forEach(function (p) { if (!(envioTotal(p) > 0.005)) return; var k = nombreCanonico(p.vendedor); M[k] = M[k] || [0, 0, 0];
      M[k][0] = r2(M[k][0] + envioTotal(p)); M[k][1] = r2(M[k][1] + envioCobrado(p)); M[k][2] = r2(M[k][2] + envioPorCobrar(p)); });
    return M;
  });
  const malV = Object.keys(porV).filter(k => { const f = fil(k); return !(f[2] === porV[k][0] && f[3] === porV[k][1] && f[4] === porV[k][2]); });
  chk('5d cada vendedor del Resumen = Σ envioTotal / envioCobrado / envioPorCobrar de sus ventas', malV.length === 0 && Object.keys(porV).length === 3, { malV, porV });
  chk('3c una hoja por vendedor', r.hojas && r.hojas.length===3, (r.hojas||[]).map(h=>h.n));
  var hm=(r.hojas||[]).find(h=>h.n==='Mirian Salazar')||{m:[]};
  var filaOC=(h,oc)=>(h.m||[]).find(f=>f[2]===oc)||[];
  var m1=filaOC(hm,'11-010'), m2=filaOC(hm,'11-011');
  chk('4a el cobrado dice día, método, nota del pago y quién tiene el efectivo (el chofer)', m1[6]===50 && m1[7]==='COBRADO' && /04\/11/.test(m1[8]) && m1[9]==='Efectivo' && m1[11]==='900' && m1[12]==='Luis Pierre' && m1[13]==='SÍ', m1);
  chk('4b el pactado sin cobrar dice POR COBRAR y no lleva datos de pago', m2[6]===40 && m2[7]==='POR COBRAR' && !m2[8] && !m2[9] && !m2[12], m2);
  var hf=(r.hojas||[]).find(h=>h.n==='Maria Flores')||{m:[]};
  var f2=(hf.m||[]).filter(f=>f[2]==='11-013');
  chk('4c una venta con dos fletes da dos renglones', f2.length===2 && f2.some(f=>f[7]==='COBRADO' && f[6]===30) && f2.some(f=>f[7]==='POR COBRAR' && f[6]===20), f2);
  var f1=filaOC(hf,'11-012');
  chk('4d el QR lleva el banco y no «efectivo en mano»', f1[9]==='QR' && f1[10]==='BISA' && !f1[12], f1);
  var pie=(hm.m||[]).find(f=>f[0]==='PACTADO')||[];
  chk('3d cada hoja cierra con pactado / cobrado / por cobrar', pie[1]===90 && pie[3]===50 && pie[5]===40, pie);
  var nz=(r.hojas||[]).map(h=>h.n).find(n=>/Vendedor/.test(n))||'';
  chk('6a el nombre de la hoja no pasa de 31 letras ni lleva []:*?/\\', nz.length>0 && nz.length<=31 && !/[\[\]:*?\/\\]/.test(nz), nz);

  console.log('\n── 7. Sin recargos ──');
  r = await ev(() => {
    window._bajadas=[]; window._toasts=[];
    var m=document.getElementById('cta-mes'); if(m) m.value='2026-09';
    exportRecargos();
    return { bajadas:window._bajadas.slice(), toasts:window._toasts.slice() };
  });
  chk('7a un mes sin recargos no baja nada y lo dice', r.bajadas.length===0 && r.toasts.some(t=>/No hay ventas con recargo/.test(t)), r);

  chk('sin errores de JavaScript', errores.length===0, errores);
  console.log('\n'+PASS+' bien, '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
