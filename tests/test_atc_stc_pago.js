/* 🔧 LA ATC CONTRA COSTO SE COBRA (20/11; dueño: «atc contra costo, falta la opción de registrar el pago, y muestre en lo cobrado del
   vendedor (aparte de solo ATC porque no suma a su global de ventas)» · «recordá que a veces pagan por QR también, o tarjeta» · eligió
   «Ficha de la ATC + Contabilidad»).
   Lo que esta prueba cuida (falla contra lo de antes: `atcCobra` no existe y la ATC no abría la ficha de cobro):
   1. Desde la ficha de Contabilidad de una ATC contra costo (STC) se registra un pago con QR y otro en efectivo: quedan en la venta, el
      saldo sigue en 0 (no hay total que «falte») y no pregunta «ya está pagada».
   2. Los dos pagos entran a la CAJA: el Cuadre (`cuadrePagos`, con la marca `stc`) y el efectivo de la vendedora (`cuadreEfectivo`).
   3. NO suma a las ventas: ni la lista de Contabilidad (`contaLista`) ni la Proyección (`pryVentas`).
   4. Contabilidad la muestra aparte («🔧 ATC contra costo», cobrado por vendedor) y la ficha de la ATC trae «💵 Registrar pago».
   5. La de garantía, la sin marcar y la RPT siguen como antes: afuera de la caja y sin botón.
   Reloj clavado el viernes 20/11/2026 10:00 de Bolivia. Red cortada, datos inventados.
   Se corre:  node tests/test_atc_stc_pago.js   · `PEDIDOS=<archivo>` corre contra otra página. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ if(e && e.error) c=false; c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function BASE(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=false; SERVER_AUTH='abierto';
  if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  CARGA_GEN++; CARGA_ESTADO='ok';
  apiPost=function(p){ return Promise.resolve(p && p.action==='list' ? { ok:true, pedidos:STATE } : { ok:true, pedido:p.pedido }); };
  apiList=function(){ return apiPost({ action:'list' }); };
  var atc=function(tipo){ return [{ desc:'COLCHON TITANIO ICE', medida:'140x190', cant:1, codigo:'CH1220',
    atc:{ tipo:tipo, motivo:'Hundimiento', detalle:'se hundió del lado izquierdo', compra:'2026-03-10', recoge:['colchon'] } }]; };
  window._P=function(o){ return Object.assign({ id:'x', fecha:'2026-11-23', oc:'11-260', vendedor:'Carola Chavez', cliente:'CLIENTE PRUEBA', celular:'70000001',
    turno:'AM', zona:'NORTE', direccion:'CALLE 1', maps:'', pagado:false, saldo:0, ts:Date.parse('2026-11-18T10:00:00-04:00'), metodoPago:'',
    observaciones:'', estado:'', entregado:false, vehiculo:'', chofer:'', garantia:'', nota:'', acuenta:0, facturarA:'', nit:'', nroDia:3,
    verificado:false, fotos:[], productos:[{ desc:'COLCHON TITANIO ICE', medida:'140x190', cant:1, codigo:'CH1220', precio:4275 }] }, o); };
  window._ATC=atc;
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms||30); }); };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const page = await browser.newPage({ viewport:{ width:1400, height:950 }, timezoneId:'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.install({ time:new Date('2026-11-20T10:00:00-04:00') });
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.clock.runFor(1500);
  await page.evaluate(BASE);
  const ev = (fn, arg) => page.evaluate(fn, arg).catch(e => ({ error:String(e.message||e).slice(0,300) }));

  await ev(() => {
    STATE=[ _P({ id:'s1', oc:'ATC 11-050', productos:_ATC('stc') }),
            _P({ id:'g1', oc:'ATC 11-051', productos:_ATC('gar') }),
            _P({ id:'r1', oc:'RPT 11-052', cliente:'MIA PLAZA', productos:[{ desc:'COLCHON TITANIO ICE', medida:'140x190', cant:1, rtipo:'Reposición' }] }),
            _P({ id:'v1', oc:'11-260', saldo:4275 }) ];
    saveMirror();
  });

  console.log('\n── 1. Registrar el pago desde Contabilidad ──');
  let r = await ev(async () => {
    showContaModal('s1'); await _esperar();
    var box=document.getElementById('modal'), txt=box ? box.innerText : '';
    var hayForm=!!document.getElementById('cta-pago-monto');
    // 1° pago: QR al BISA
    CTA_TIPO='pago'; CTA_PAGO.metodo='QR'; CTA_PAGO.banco='BISA'; CTA_PAGO.comps=['FOTO_QR_1'];
    showContaModal('s1'); await _esperar();
    document.getElementById('cta-pago-monto').value='350'; document.getElementById('cta-pago-fecha').value='2026-11-20'; document.getElementById('cta-pago-nota').value='8301';
    ctaRegistrarPago('s1'); await _esperar(80);
    closeModal(); await _esperar();
    // 2° pago: efectivo, lo recibió la vendedora
    showContaModal('s1'); await _esperar();
    CTA_TIPO='pago'; CTA_PAGO.metodo='Efectivo'; CTA_PAGO.banco=''; CTA_PAGO.comps=['FOTO_EF_1']; CTA_PAGO.recibio='Carola Chavez'; CTA_PAGO.rEleg=true;
    showContaModal('s1'); await _esperar();
    document.getElementById('cta-pago-monto').value='150'; document.getElementById('cta-pago-fecha').value='2026-11-20'; document.getElementById('cta-pago-nota').value='8302';
    ctaRegistrarPago('s1'); await _esperar(80);
    closeModal(); await _esperar();
    var p=findById('s1');
    return { hayForm:hayForm, txt:txt.slice(0,400), pagos:contaPagos(p).map(function(c){ return [c.metodo, c.banco, r2(c.monto), c.fecha, c.nota]; }),
      saldo:Number(p.saldo)||0, cobrado:atcCobrado(p) };
  });
  chk('la ficha de Contabilidad de la ATC contra costo trae el formulario de pago', r.hayForm, r.txt);
  chk('…y no dice «Total de la venta Bs 0» ni «SIN MONTO ANOTADO»: dice que es una reparación que no suma a las ventas', !/SIN MONTO ANOTADO/i.test(r.txt) && !/TOTAL DE LA VENTA/i.test(r.txt) && /no suma a las ventas/i.test(r.txt), r.txt);
  chk('quedan los dos pagos (QR BISA 350 y efectivo 150) en la ATC', r.pagos && r.pagos.length===2 && r.pagos[0][0]==='QR' && r.pagos[0][1]==='BISA' && r.pagos[0][2]===350 && r.pagos[1][0]==='Efectivo' && r.pagos[1][2]===150, r.pagos);
  chk('el saldo sigue en 0 y lo cobrado es 500', r.saldo===0 && r.cobrado===500, r);

  console.log('\n── 2. Entra a la caja ──');
  r = await ev(() => {
    var pe={ modo:'mes', val:'2026-11' };
    var cp=cuadrePagos(pe, '').filter(function(c){ return c.p && c.p.id==='s1'; });
    var E=cuadreEfectivo(pe, ''), fila=E.filas.find(function(o){ return normNombre(o.nombre)===normNombre('Carola Chavez'); });
    return { n:cp.length, stc:cp.every(function(c){ return c.stc===true; }), montos:cp.map(function(c){ return r2(c.monto); }),
      efe:fila ? r2(fila.cobrado!=null ? fila.cobrado : (fila.bs||0)) : null, fila:fila ? Object.keys(fila) : null,
      otros:cuadrePagos(pe, '').filter(function(c){ return c.p && (c.p.id==='g1' || c.p.id==='r1'); }).length };
  });
  chk('el Cuadre trae los dos pagos de la ATC contra costo, marcados «stc»', r.n===2 && r.stc && r.montos.indexOf(350)>=0 && r.montos.indexOf(150)>=0, r);
  chk('el efectivo de Carola (lo que tiene en la mano) cuenta los 150', r.efe===150, r);
  chk('la de garantía y la RPT no aparecen en el Cuadre', r.otros===0, r);

  console.log('\n── 3. No suma a las ventas ──');
  r = await ev(() => {
    setContaTab && setContaTab('ventas');
    var ids=contaLista().map(function(p){ return p.id; });
    var pv=pryVentas(), pids=(pv.lista||pv.ventas||pv||[]);
    var enPry=JSON.stringify(pv).indexOf('ATC 11-050')>=0 || JSON.stringify(pv).indexOf('"s1"')>=0;
    return { ids:ids, enPry:enPry, fc:fueraDeConta(findById('s1')) };
  });
  chk('Contabilidad → Ventas no la lista (fueraDeConta sigue)', r.ids && r.ids.indexOf('s1')<0 && r.fc===true, r);
  chk('la Proyección no la cuenta', r.enPry===false, r);

  console.log('\n── 4. Aparte en Contabilidad y botón en la ficha de la ATC ──');
  r = await ev(async () => {
    try{ showView('conta'); }catch(e){}
    var m=document.getElementById('cta-mes'); if(m) m.value='2026-11';
    renderConta(); await _esperar();
    var b=document.getElementById('cta-stc'), D=ctaStcDatos();
    verAtc('s1'); await _esperar(); var bt=document.getElementById('atc-stc-pago'); var btTxt=bt ? bt.textContent : null; closeModal();
    verAtc('g1'); await _esperar(); var btG=!!document.getElementById('atc-stc-pago'); closeModal();
    return { txt:b ? b.textContent : null, bs:D && D.bs, porV:D && D.porV, btTxt:btTxt, btG:btG };
  });
  chk('Contabilidad muestra «🔧 ATC contra costo» con lo cobrado (Bs 500) y que no suma a las ventas', r.txt && /ATC contra costo/.test(r.txt) && /500/.test(r.txt) && /no suma a las ventas/.test(r.txt) && r.bs===500, r);
  chk('…cobrado por vendedor: Carola 500', r.porV && Object.keys(r.porV).length===1 && Object.values(r.porV)[0]===500, r.porV);
  chk('la ficha de la ATC contra costo trae «💵 Registrar pago · cobrado Bs 500»', r.btTxt && /Registrar pago/.test(r.btTxt) && /500/.test(r.btTxt), r.btTxt);
  chk('la de garantía no trae el botón', r.btG===false, r);

  console.log('\n── 5. La de garantía no se cobra ──');
  r = await ev(() => ({ gar:atcCobra(findById('g1')), rpt:atcCobra(findById('r1')), venta:atcCobra(findById('v1')),
    cajaG:fueraDeCaja(findById('g1')), cajaR:fueraDeCaja(findById('r1')), cajaV:fueraDeCaja(findById('v1')), cajaS:fueraDeCaja(findById('s1')) }));
  chk('atcCobra solo para la contra costo', r.gar===false && r.rpt===false && r.venta===false, r);
  chk('fueraDeCaja: garantía y RPT afuera, venta y contra costo adentro', r.cajaG===true && r.cajaR===true && r.cajaV===false && r.cajaS===false, r);

  console.log('\n── 6. Lo que encontró Fable (20/11) ──');
  r = await ev(async () => {
    var out={};
    // (1) pasar a garantía una ATC con pagos: sin la clave no deja; con la clave, pregunta
    UNLOCKED=false; atcTipoMarcar('s1','gar'); await _esperar();
    out.sinClave=atcTipo(findById('s1'));
    out.cambio=atcStcCambio(findById('s1'), 'gar');
    out.sinPagos=atcStcCambio(findById('g1'), 'stc');
    // (5) el recibo 8301 de un pago STC tapa el hueco del talonario de Carola
    STATE.push(_P({ id:'n1', oc:'11-261', nota:'8300', saldo:0, pagado:true, metodoPago:'~Efectivo 100 @2026-11-20 #8300', fecha:'2026-11-20', ts:Date.parse('2026-11-20T09:00:00-04:00') }));
    STATE.push(_P({ id:'n2', oc:'11-262', nota:'8303', saldo:0, pagado:true, metodoPago:'~Efectivo 100 @2026-11-20 #8303', fecha:'2026-11-20', ts:Date.parse('2026-11-20T09:30:00-04:00') }));
    var H=talonarioHuecos(null, { modo:'mes', val:'2026-11' }, '');
    out.huecos=JSON.stringify(H);
    // (6) «De dónde sale lo vendido»: la caja de la marca suma el pago STC aparte
    var G=pryPlata('2026-11'); out.stcMes=G.heaven ? G.heaven.stcMes : null; out.vendido=G.heaven ? G.heaven.vendido : null;
    // (7) STC de Eduardo: sin botón (su pago no aparecería en la caja)
    STATE.push(_P({ id:'e1', oc:'ATC 11-060', vendedor:'Eduardo Añez', productos:_ATC('stc') }));
    verAtc('e1'); await _esperar(); out.btnEdu=!!document.getElementById('atc-stc-pago'); closeModal();
    // textos: el WhatsApp del pago y la ficha sin «Corregir precios y montos» ni recargo
    var p=findById('s1'); out.wa=pagoTexto ? pagoTexto(p, contaPagos(p)[0]) : '';
    showContaModal('s1'); await _esperar(); var t=document.getElementById('modal').innerText; closeModal();
    out.montos=/Corregir precios y montos/i.test(t); out.recargo=/Recargo por entrega/i.test(t);
    // el Cuadre no cuenta la ATC como «venta»
    renderCuadre && renderCuadre(); 
    return out;
  });
  chk('1 sin la clave, una ATC contra costo con pagos NO pasa a garantía (sigue stc) y el aviso dice cuánto sale de la caja', r.sinClave==='stc' && r.cambio && /500/.test(r.cambio.txt) && /SALE/.test(r.cambio.txt), r);
  chk('1b una ATC sin pagos cambia de tipo sin preguntar', r.sinPagos===null, r.sinPagos);
  chk('5 el recibo 8301 del pago contra costo no sale como N° salteado (8302 tampoco)', !/8301/.test(r.huecos) && !/8302/.test(r.huecos), r.huecos);
  chk('6 «De dónde sale lo vendido»: el pago contra costo va en su renglón de la caja (500) y no en lo vendido', r.stcMes===500 && !(r.vendido>=500 && r.vendido<4275), r);
  chk('7 una ATC contra costo de Eduardo no trae «Registrar pago»', r.btnEdu===false, r);
  chk('el WhatsApp del pago dice «ATC CONTRA COSTO», no «pago completo de la venta»', /ATC CONTRA COSTO/.test(r.wa) && !/PAGO COMPLETO DE LA VENTA/.test(r.wa) && !/Venta PAGADA/.test(r.wa), r.wa);
  chk('la ficha de Contabilidad no ofrece «Corregir precios y montos» ni el recargo por entrega', !r.montos && !r.recargo, r);

  chk('sin errores de página', errores.length===0, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
