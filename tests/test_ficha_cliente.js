/* 👤 LA FICHA DEL CLIENTE (§4nr, 29/10; dueño, del muestrario 24-33: «29 tb… Ármalo y mostrame cómo quedaría con los datos reales»).
   Lo que cuida esta prueba: tocar el nombre de un cliente (Administración tabla y fichas, Contabilidad, Mis pedidos) abre SU ficha y no la del
   pedido; junta por los últimos 8 números del celular (con las de ese nombre sin celular), sin RPT ni pedidos internos; las cuentas son las
   de siempre (comprado = `cliValor`, ya pagó = `contaCobrado`, debe = `contaFaltaCobrar`); las pestañas Compras / Pagos / ATC / Notas; cada
   fila abre su pedido con «← Volver a la ficha…» y volver la reabre; un nombre genérico sin celular no junta a nadie; sin `CLF_PRUEBA`
   (Playwright) los nombres son el texto de siempre.
   Reloj clavado: viernes 23/10/2026 15:00 de Bolivia.   Se corre:  node tests/test_ficha_cliente.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const HOY = '2026-10-23T15:00:00-04:00';

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  loadFromServer=function(){}; apiSave=function(r){ return Promise.resolve({ ok:true, pedido:r }); };
  var n=0;
  window.V=function(o){ n++; var reg=o.reg||'2026-10-10T10:00:00';
    return Object.assign({ id:'p'+n, oc:'10-'+(100+n), nota:String(500+n), vendedor:'Maria Flores', cliente:'ANA ROJAS', celular:'', fecha:'2026-10-27', turno:'AM',
      zona:'Norte', direccion:'Calle 1', productos:[{desc:'COLCHON SOFT',medida:'140x190',cant:1}], saldo:0, acuenta:0, pagado:false, metodoPago:'',
      entregado:false, ts:new Date(reg+'-04:00').getTime(), rev:1, fotos:[] }, o);
  };
  window.FIX=function(){ n=0; return [
    V({ cliente:'ANA ROJAS', celular:'70011223', saldo:0, pagado:true, metodoPago:'Efectivo 2000 @2026-10-05 #501', reg:'2026-10-05T10:00:00', fecha:'2026-10-07', entregado:true, observaciones:'Tocar el timbre dos veces' }),
    V({ cliente:'Ana Rojas', celular:'+591 700-11223', vendedor:'Carola Chavez', saldo:1500, acuenta:500, metodoPago:'', reg:'2026-10-12T11:00:00', fecha:'2026-10-24' }),
    V({ cliente:'ANA ROJAS', celular:'', saldo:800, reg:'2026-10-15T09:00:00', fecha:'2026-10-28', observaciones:'Llamar antes' }),                // mismo nombre sin celular: entra
    V({ oc:'ATC 10-003', cliente:'ANA ROJAS', celular:'70011223', reg:'2026-10-18T09:00:00', productos:[{desc:'TITANIO LATEX',medida:'140x190',cant:1,atc:{mot:'Hundimiento',det:'Se hunde en el medio',tipo:'gar'}}] }),
    V({ oc:'RPT 10-001', cliente:'MIA PLAZA', celular:'70011223', reg:'2026-10-19T09:00:00' }),                                                   // RPT: afuera
    V({ cliente:'ANA ROJAS', celular:'70011223', vendedor:'FABRICA', reg:'2026-10-20T09:00:00' }),                                                 // interno: afuera
    V({ cliente:'JORGE PAZ', celular:'76543210', saldo:3000, reg:'2026-10-21T10:00:00' }),
    V({ cliente:'CLIENTE', celular:'', saldo:100, reg:'2026-10-21T12:00:00' }),
    V({ cliente:'CLIENTE', celular:'', saldo:200, reg:'2026-10-22T12:00:00' })
  ]; };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  async function abrir(conFicha, w){
    const ctx = await browser.newContext({ viewport:{ width:w||1440, height:900 }, timezoneId:'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r=>r.abort());
    const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.dismiss());
    if(conFicha) await page.addInitScript(()=>{ window.CLF_PRUEBA=1; });
    await page.clock.setFixedTime(new Date(HOY));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(350);
    await page.evaluate(PREPARAR);
    await page.evaluate(() => { STATE=FIX(); UNLOCKED=true; var ac=document.getElementById('admin-content'); if(ac) ac.style.display='block'; var lk=document.getElementById('admin-lock'); if(lk) lk.style.display='none'; });
    return page;
  }

  // ---------- 1. Sin CLF_PRUEBA (Playwright): los nombres son el texto de siempre ----------
  let page = await abrir(false);
  let r = await page.evaluate(() => { showView('admin'); renderAdmin();
    var td=[].filter.call(document.querySelectorAll('#tbl-pedidos tbody td'), function(t){ return /JORGE PAZ/.test(t.textContent); })[0];
    return { lk:document.querySelectorAll('.clf-lk').length, td:td && td.innerHTML, boton:clfBotonHtml(STATE[0],'conta') }; });
  chk('1a sin CLF_PRUEBA no hay nombres tocables', r.lk===0, r.lk);
  chk('1b la celda del cliente es la de siempre', r.td==='<b>JORGE PAZ</b>', r.td);
  chk('1c ni el botón de la ficha', r.boton==='', r.boton);
  await page.context().close();

  // ---------- 2. Las cuentas y quién entra ----------
  page = await abrir(true);
  r = await page.evaluate(() => { var D=clfDatos('p1');
    return { ids:D.L.map(function(p){ return p.id; }).sort(), compras:D.compras.map(function(p){ return p.id; }), atcs:D.atcs.length, T:D.T, por:D.por,
      vend:D.vOrd, vendN:D.vend, cels:D.cels, nombre:D.nombre, pagos:D.pagos.map(function(c){ return c.monto; }), notas:D.notas.map(function(n){ return n.txt; }),
      cv:cliValor(findById('p1'))+cliValor(findById('p2'))+cliValor(findById('p3')),
      cob:contaCobrado(findById('p1'))+contaCobrado(findById('p2'))+contaCobrado(findById('p3')),
      deb:contaFaltaCobrar(findById('p2'))+contaFaltaCobrar(findById('p3')) }; });
  chk('2a junta por celular (también «+591 700-11223»), el mismo nombre sin celular y la ATC; sin RPT ni FABRICA', JSON.stringify(r.ids)===JSON.stringify(['p1','p2','p3','p4']), r.ids);
  chk('2b 3 compras y 1 ATC', r.compras.length===3 && r.atcs===1, r);
  chk('2c lo comprado es `cliValor` sumado', Math.abs(r.T.vendido-r.cv)<0.005, [r.T.vendido, r.cv]);
  chk('2d ya pagó = `contaCobrado`', Math.abs(r.T.cobrado-r.cob)<0.005, [r.T.cobrado, r.cob]);
  chk('2e debe = `contaFaltaCobrar`, en 2 ventas', Math.abs(r.T.saldo-r.deb)<0.005 && r.T.deben===2, [r.T.saldo, r.deb, r.T.deben]);
  chk('2f lo reconoció por el celular', r.por==='cel', r.por);
  chk('2g quién le vendió, el que más primero', r.vend[0]==='Maria Flores' && r.vendN['Carola Chavez']===1 && !r.vend.some(function(v){ return /FABRICA/i.test(v); }), r);
  chk('2h el nombre es el de la compra más nueva', /ana rojas/i.test(r.nombre), r.nombre);
  chk('2i los pagos de sus compras (2.000 y 500)', r.pagos.indexOf(2000)>=0 && r.pagos.indexOf(500)>=0, r.pagos);
  chk('2j las notas de sus pedidos', r.notas.indexOf('Tocar el timbre dos veces')>=0 && r.notas.indexOf('Llamar antes')>=0, r.notas);
  r = await page.evaluate(() => { var a=clfDatos('p3'), g=clfDatos('p8'), o=clfDatos('p7'), rp=clfDatos('p5');
    return { a:a.L.length, aPor:a.por, g:g.L.map(function(p){ return p.id; }), gPor:g.por, o:o.L.length, rp:rp }; });
  chk('2k sin celular: por el nombre (las 4 de ANA ROJAS)', r.a===4 && r.aPor==='nombre', r);
  chk('2l un nombre genérico sin celular no junta a nadie', JSON.stringify(r.g)===JSON.stringify(['p8']) && r.gPor==='solo', r);
  chk('2m otro cliente, lo suyo', r.o===1, r.o);
  chk('2n una RPT no tiene ficha de cliente', r.rp===null, r.rp);

  // ---------- 3. Tocar el nombre en Contabilidad abre la ficha, no la venta ----------
  r = await page.evaluate(async () => { showView('conta'); segSet('cta-tab','ventas'); setContaTab('ventas'); document.getElementById('cta-mes').value='2026-10'; renderConta();
    await new Promise(function(r){ setTimeout(r, 150); });
    var lk=[].filter.call(document.querySelectorAll('#tbl-conta .clf-lk'), function(x){ return /JORGE PAZ/.test(x.textContent); })[0];
    if(!lk) return { lk:false };
    lk.click(); await new Promise(function(r){ setTimeout(r, 120); });
    var box=document.getElementById('modal-box');
    return { lk:true, kind:MODAL_KIND, h3:box.querySelector('h3').textContent, clf:!!box.querySelector('.clf'), ancho:box.classList.contains('clf-box') }; });
  chk('3a el nombre de Contabilidad es tocable', r.lk, r);
  chk('3b abre la ficha del cliente (no la venta)', r.clf && /JORGE PAZ/.test(r.h3), r);
  chk('3c con su ancho', r.ancho, r);

  // ---------- 4. Las pestañas y abrir una compra con «volver» ----------
  r = await page.evaluate(async () => { clfAbrir('p1','conta');
    var box=document.getElementById('modal-box'), t=box.innerText;
    var tabs=[].map.call(box.querySelectorAll('.clf-tabs button'), function(b){ return b.textContent.replace(/\s+/g,' ').trim(); });
    var filas=box.querySelectorAll('.clf-l .clf-f').length;
    clfVer('pagos'); var pg=document.getElementById('modal-box').querySelectorAll('.clf-l .clf-f').length;
    clfVer('atc'); var atc=document.getElementById('modal-box').innerText;
    clfVer('notas'); var nt=document.getElementById('modal-box').innerText;
    clfVer('compras');
    document.getElementById('modal-box').querySelector('.clf-l .clf-f').click(); await new Promise(function(r){ setTimeout(r, 120); });
    var b2=document.getElementById('modal-box'), volver=b2.querySelector('.clf-volver'), kind=MODAL_KIND;
    var vtx=volver && volver.textContent;
    if(volver) volver.click(); await new Promise(function(r){ setTimeout(r, 120); });
    var b3=document.getElementById('modal-box');
    return { t:t, tabs:tabs, filas:filas, pg:pg, atc:atc, nt:nt, kind:kind, vtx:vtx, vuelve:!!b3.querySelector('.clf') && /compras/i.test(b3.innerText) }; });
  chk('4a las cuatro pestañas con sus números', JSON.stringify(r.tabs)===JSON.stringify(['🛏️ Compras 3','💵 Pagos 2','🎧 ATC 1','📝 Notas 2']), r.tabs);
  chk('4b las 3 compras', r.filas===3, r.filas);
  chk('4c los 2 pagos', r.pg===2, r.pg);
  chk('4d la ATC con su motivo', /ATC 10-003/.test(r.atc) && /Hundimiento/.test(r.atc), r.atc.slice(0,300));
  chk('4e las notas', /Tocar el timbre/.test(r.nt), r.nt.slice(0,300));
  chk('4f arriba: comprado, ya pagó, debe y el celular', /comprado en total/.test(r.t) && /ya pagó/.test(r.t) && /le falta pagar/.test(r.t) && /70011223/.test(r.t), r.t.slice(0,400));
  chk('4g una compra se abre en Contabilidad (de donde vino)', r.kind==='conta', r.kind);
  chk('4h con «← Volver a la ficha de …»', /Volver a la ficha de/i.test(r.vtx||''), r.vtx);
  chk('4i volver reabre la ficha del cliente', r.vuelve, r);
  r = await page.evaluate(async () => { clfAbrir('p1','admin'); document.getElementById('modal-box').querySelector('.clf-l .clf-f').click(); await new Promise(function(r){ setTimeout(r, 120); });
    var v1=!!document.querySelector('#modal-box .clf-volver');
    showPedidoModal('p7'); var v2=!!document.querySelector('#modal-box .clf-volver');
    return { kind:MODAL_KIND, v1:v1, v2:v2 }; });
  chk('4j desde Administración se abre la ficha del pedido, con «volver»', r.v1, r);
  chk('4k abrir otro pedido por otro lado ya no trae «volver»', !r.v2, r);

  // ---------- 5. Administración (tabla y fichas) y Mis pedidos ----------
  r = await page.evaluate(async () => { closeModal(); showView('admin'); renderAdmin();
    var t=document.querySelectorAll('#tbl-pedidos .clf-lk').length;
    var lk=document.querySelector('#tbl-pedidos .clf-lk'); lk.click(); await new Promise(function(r){ setTimeout(r, 100); });
    var abreClf=!!document.querySelector('#modal-box .clf'); closeModal();
    window.ADM_FICHAS_PRUEBA=1; admVistaPoner('fichas');
    var f=document.querySelectorAll('#adm-fichas .af-who .clf-lk').length;
    var lk2=document.querySelector('#adm-fichas .af-who .clf-lk'); lk2.click(); await new Promise(function(r){ setTimeout(r, 100); });
    var abreClf2=!!document.querySelector('#modal-box .clf'); closeModal();
    showView('mis'); var s=document.getElementById('mis-vendedor'); if(s){ s.value='Maria Flores'; s.dispatchEvent(new Event('change')); } setVendedorMem('Maria Flores'); renderMis();
    await new Promise(function(r){ setTimeout(r, 100); });
    var m=document.querySelectorAll('#mis-lista .clf-lk').length;
    return { t:t, abreClf:abreClf, f:f, abreClf2:abreClf2, m:m }; });
  chk('5a en la tabla de Administración el nombre es tocable', r.t>=5, r.t);
  chk('5b y abre la ficha del cliente', r.abreClf, r);
  chk('5c en las fichas de Administración también (sin abrir el pedido)', r.f>=5 && r.abreClf2, r);
  chk('5d en Mis pedidos también', r.m>=1, r.m);
  r = await page.evaluate(() => { showContaModal('p2'); var b=document.querySelector('#modal-box .clf-btn'); return b && b.textContent; });
  chk('5e la venta de Contabilidad trae «👤 Ficha del cliente · N pedidos más»', /Ficha del cliente · 3 pedidos más/.test(r||''), r);
  await page.context().close();

  // ---------- 6. En el celular entra sin correr la página ----------
  page = await abrir(true, 390);
  r = await page.evaluate(async () => { clfAbrir('p1','admin'); await new Promise(function(r){ setTimeout(r, 120); });
    return { sw:document.documentElement.scrollWidth, bw:document.getElementById('modal-box').scrollWidth, vw:window.innerWidth }; });
  chk('6a 390 px: la ficha no se sale de la pantalla', r.bw<=r.vw+1 && r.sw<=r.vw+1, r);
  await page.context().close();

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
