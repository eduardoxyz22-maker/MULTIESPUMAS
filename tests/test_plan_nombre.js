/* ❓ EL PLAN NO PIDE PRODUCTOS QUE NO EXISTEN (15/11/2026, mejora 316; dueño: «316»).
   El 15/11, 8 de los 31 productos que el Plan mandaba a pedir eran nombres que ni la lista ni los Excel conocen, y uno con la medida al revés.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin `PLAN_NOMBRE_PRUEBA` nada cambia: «somieres» se pide como siempre.
   2. Con la bandera: «somieres» 140x190 y «OC 260200619» (no son productos) y TITANIO LATEX 190x140 (medida al revés) no piden nada
      (fabricar 0, aviso «nombre», lo que pedirían en `revPedir`); el TITANIO LATEX 140x190 de verdad y una medida especial (160x200) siguen.
   3. No entran en «Qué producir» (ni en «Pedido a producción») ni en la copia para la fábrica; lo vendido sigue reservado (`comp`).
   4. El Plan los saca de la tabla y los muestra en «❓ Revisá el nombre antes de pedir» con el pedido, quién lo cargó y «✏️ Abrir»; la
      medida al revés ofrece «↔️ ¿Es 140x190? Dar vuelta».
   5. «Dar vuelta» pregunta, corrige la medida en el pedido (guarda) y el renglón vuelve al Plan como el producto de la lista.
   Datos SINTÉTICOS. Reloj clavado el jueves 05/11/2026 a las 10:00. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_plan_nombre.js */
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
  await ev(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    loadFromServer=function(){};
    try{ localStorage.removeItem(LS_PEND); }catch(e){}
    var hoy=todayStr(), f=proximoDiaEntrega(), n=0;
    var kT=stockInfo({ desc:'TITANIO LATEX', medida:'140x190', codigo:'CH1129' }).k;
    STOCK=leerStock({ observaciones:JSON.stringify({ c:{ f:hoy, hora:'08:00', u:(function(){ var u={}; u[kT]=2; return u; })(), solo0:true, t:Date.parse(hoy+'T08:05:00-04:00') }, e:[], p:[], a:{}, g:{}, al:{} }) });
    STOCK_CARGADO=true;
    var P=function(id, vend, prods){ n++; return { id:id, oc:'11-'+(240+n), cliente:'CLIENTE '+id.toUpperCase(), fecha:f, turno:'AM', vendedor:vend, zona:'Norte', direccion:'Calle '+n,
      productos:prods.map(function(x){ return { desc:x[0], medida:x[1], codigo:x[2]||'', cant:x[3] }; }), entregado:false, ts:Date.parse(hoy+'T07:00:00-04:00')-n*1000, rev:2, fotos:[] }; };
    STATE=[
      P('t1', 'Mirian Salazar', [['TITANIO LATEX','140x190','CH1129',3]]),
      P('n1', 'FABRICA', [['somieres','140x190','',16]]),
      P('n2', 'Eduardo Añez', [['OC 260200619','','',1]]),
      P('r1', 'Mauricio Merida', [['TITANIO LATEX','190x140','',4]]),
      P('e1', 'Isabel Robledo', [['TITANIO LATEX','160x200','',1]])
    ];
    window._env=[];
    apiPost=function(pl){ var c=JSON.parse(JSON.stringify(pl)); window._env.push(c);
      if(c.action==='save'){ var p=Object.assign({}, c.pedido, { rev:(Number(c.pedido.rev)||0)+1 }); return Promise.resolve({ ok:true, version:'2026-11-14-a', pedido:p, mode:'update', ahora:Date.now() }); }
      return Promise.resolve({ ok:true }); };
    window.__copia=''; copyText=function(t){ window.__copia=String(t); };
    window.__k=function(d, m, c){ return stockInfo({ desc:d, medida:m, codigo:c||'' }).k; };
  });
  const datos = () => ev(() => {
    stockOlvidarIndice();
    var d=stockData(), por={}; d.lista.forEach(function(o){ por[o.k]=o; });
    var K={ t1:__k('TITANIO LATEX','140x190','CH1129'), n1:__k('somieres','140x190'), n2:__k('OC 260200619',''), r1:__k('TITANIO LATEX','190x140'), e1:__k('TITANIO LATEX','160x200') };
    var o=function(k){ var x=por[K[k]]; return x ? { fab:x.fabricar||0, pedir:x.pedir||0, comp:x.comp||0, aviso:x.aviso, rev:x.revNombre||'', revPedir:x.revPedir||0 } : null; };
    var R=stockProducirCalc(d), enProd={}; R.bloques.forEach(function(B){ B.filas.forEach(function(f){ enProd[f.o.k]=1; }); });
    var plan=stockPlanHtml(d, d.lista), box=document.createElement('div'); box.innerHTML=plan;
    var filas=[].map.call(box.querySelectorAll('tr.pl-fila'), function(t){ return t.getAttribute('data-k'); });
    var gris=box.querySelector('.pnr-caja');
    window.__copia=''; copiarStock();
    return { K:K, t1:o('t1'), n1:o('n1'), n2:o('n2'), r1:o('r1'), e1:o('e1'), prod:{ t1:!!enProd[K.t1], n1:!!enProd[K.n1], n2:!!enProd[K.n2], r1:!!enProd[K.r1] },
      filas:filas, gris:gris ? gris.innerText.replace(/\s+/g,' ') : '', dar:gris ? [].map.call(gris.querySelectorAll('.pnr-dar'), function(b){ return b.getAttribute('data-k'); }) : [], copia:window.__copia };
  });

  console.log('\n── 1. Sin la bandera ──');
  let r = await datos();
  chk('«somieres» 140x190 se pide como siempre (está en la tabla del Plan, sin bloque gris)', r.n1 && r.n1.fab>0 && r.n1.rev==='' && r.filas.indexOf(r.K.n1)>=0 && r.gris==='', { n1:r.n1, gris:r.gris });

  console.log('\n── 2-3. Con la bandera ──');
  await ev(() => { window.PLAN_NOMBRE_PRUEBA=1; });
  r = await datos();
  chk('«somieres» y «OC 260200619»: no son productos → no piden nada (aviso «nombre», lo que pedirían aparte)', r.n1.rev==='nombre' && r.n1.fab===0 && r.n1.pedir===0 && r.n1.aviso==='nombre' && r.n1.revPedir===16 && r.n2.rev==='nombre' && r.n2.fab===0, [r.n1, r.n2]);
  chk('TITANIO LATEX 190x140 (medida al revés): tampoco', r.r1.rev==='medida' && r.r1.fab===0, r.r1);
  chk('el TITANIO LATEX 140x190 de verdad y la medida especial 160x200 siguen como siempre', r.t1.rev==='' && r.t1.fab>0 && r.e1.rev==='', [r.t1, r.e1]);
  chk('lo vendido sigue reservado (comp)', r.n1.comp===16 && r.r1.comp===4, [r.n1.comp, r.r1.comp]);
  chk('no entran en «Qué producir» (ni en «Pedido a producción»); el de verdad sí', r.prod.t1 && !r.prod.n1 && !r.prod.n2 && !r.prod.r1, r.prod);
  chk('la copia para la fábrica no los nombra', !/somieres|OC 260200619|190x140/i.test(r.copia) && /TITANIO LATEX/.test(r.copia), r.copia.slice(0,300));

  console.log('\n── 4. El Plan ──');
  chk('la tabla del Plan no los tiene', r.filas.indexOf(r.K.n1)<0 && r.filas.indexOf(r.K.n2)<0 && r.filas.indexOf(r.K.r1)<0 && r.filas.indexOf(r.K.t1)>=0, r.filas);
  chk('«❓ Revisá el nombre antes de pedir» con los tres, cuánto y que no suman', /Revisá el nombre antes de pedir · 3 renglones/.test(r.gris) && /no suman al pedido/.test(r.gris) && /«somieres» 140x190 × 16/.test(r.gris) && /«OC 260200619» × 1/.test(r.gris) && /«TITANIO LATEX» 190x140 × 4 medida al revés/.test(r.gris), r.gris);
  chk('dice qué pedido es y quién lo cargó, con «✏️ Abrir»', /OC 11-242 · FABRICA/.test(r.gris) && /OC 11-243 · Eduardo Añez/.test(r.gris) && /✏️ Abrir OC 11-242/.test(r.gris), r.gris);
  chk('la medida al revés ofrece «↔️ ¿Es 140x190? Dar vuelta» (solo ahí)', r.dar.length===1 && r.dar[0]===r.K.r1 && /¿Es 140x190\? Dar vuelta/.test(r.gris), r.dar);
  r = await ev(async () => {
    var box=document.createElement('div'); box.innerHTML=planNombreHtml(stockData(), 'pap'); document.body.appendChild(box);
    var b=box.querySelector('.pnr-r button[data-id="n1"]'); b.click(); await new Promise(function(ok){ setTimeout(ok, 120); });
    box.remove(); return { abierta:document.getElementById('modal').classList.contains('on'), t:document.getElementById('modal-box').innerText.slice(0,200) };
  });
  chk('«✏️ Abrir» abre la ficha del pedido', r.abierta && /CLIENTE N1/.test(r.t), r);

  console.log('\n── 5. «↔️ Dar vuelta» ──');
  page.__resp=[false]; page.__dlg=[];
  r = await ev(async () => { closeModal(); window._env=[]; await planNombreDarVuelta(__k('TITANIO LATEX','190x140')); return { m:findById('r1').productos[0].medida, env:window._env.length }; });
  chk('pregunta (qué pedido) y Cancelar no toca nada', r.m==='190x140' && r.env===0 && /Dar vuelta la medida/.test(page.__dlg[0]||'') && /OC 11-244/.test(page.__dlg[0]||''), { r:r, dlg:page.__dlg });
  page.__resp=[true]; page.__dlg=[];
  r = await ev(async () => { window._env=[]; await planNombreDarVuelta(__k('TITANIO LATEX','190x140')); await new Promise(function(ok){ setTimeout(ok, 150); });
    return { m:findById('r1').productos[0].medida, sv:window._env.filter(function(c){ return c.action==='save'; }).map(function(c){ return c.pedido.id+'|'+c.pedido.productos[0].medida; }) }; });
  chk('Aceptar: la medida pasa a 140x190 en el pedido (un guardado)', r.m==='140x190' && r.sv.length===1 && r.sv[0]==='r1|140x190', r);
  r = await datos();
  chk('después, el renglón al revés ya no está y su venta suma al TITANIO LATEX 140x190 de la lista', !r.r1 && r.t1.comp===7 && r.dar.length===0 && /2 renglones/.test(r.gris), { t1:r.t1, gris:r.gris });

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
