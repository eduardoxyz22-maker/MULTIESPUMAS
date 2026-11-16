/* 🎨 MEJORA 430 — LAS VENTANAS LARGAS: LOS BOTONES SIEMPRE A LA VISTA (16/11/2026; el dueño eligió las ideas visuales 390-440 menos la 403).

   Si una ventana no entra en la pantalla, el título queda arriba, el medio se desplaza adentro y la última fila de botones (la `.modal-actions`
   del final y el «✓ Listo») va pegada abajo (`.modal-pie`). Son los MISMOS botones, movidos.

   LO QUE ESTA PRUEBA CUIDA:
   1. Sin la bandera `MODAL_PIE_PRUEBA` (Playwright): la ficha larga de Mis pedidos como siempre (los botones más abajo de la pantalla).
   2. Con la bandera: la misma ficha queda del alto de la pantalla, el título arriba, «Editar el pedido», «Copiar para WhatsApp» y «✓ Listo»
      a la vista en el pie, y hacen lo de siempre («✓ Listo» cierra, «Editar» abre el formulario).
   3. «▾ hay más abajo» mientras falte; tocado baja el medio; al llegar al final se va.
   4. La misma ventana dibujada de nuevo sigue donde estaba; otra ventana arranca arriba.
   5. Una ventana corta queda igual (sin pie); la ficha de Administración (`fl-ficha`, con su forma) queda afuera.
   6. La ficha ancha (366, `CTA_ANCHA_PRUEBA`) también lleva el pie.
   Datos INVENTADOS. Reloj clavado: lunes 16/11/2026 a las 10:00 de Bolivia.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 TZ=America/La_Paz node tests/test_v430_ventana_pie.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

function PREPARAR(){
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  loadFromServer=function(){};
  var prods=[]; for(var i=0;i<12;i++) prods.push({ desc:'COLCHON INVENTADO '+i, medida:'140x190', cant:1, precio:1000 });
  STATE=[{ id:'largo', oc:'11-201', nota:'901', vendedor:'Carola Chavez', cliente:'CLIENTE LARGO', celular:'70000001', fecha:'2026-11-18', turno:'AM', zona:'NORTE',
           direccion:'Calle inventada 1', observaciones:'Llamar antes. '.repeat(20), productos:prods, saldo:12000, acuenta:0, pagado:false, metodoPago:'', entregado:false,
           ts:Date.parse('2026-11-14T10:00:00-04:00'), fotos:[] },
         { id:'corto', oc:'11-202', nota:'902', vendedor:'Carola Chavez', cliente:'CLIENTE CORTO', celular:'70000002', fecha:'2026-11-18', turno:'PM', zona:'SUR',
           direccion:'Calle inventada 2', productos:[{ desc:'ALMOHADA', medida:'50x70', cant:1, precio:100 }], saldo:100, acuenta:0, pagado:false, metodoPago:'', entregado:false,
           ts:Date.parse('2026-11-14T11:00:00-04:00'), fotos:[] }];
  document.getElementById('mis-vendedor').value='Carola Chavez';
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (o) => {
    o=o||{};
    const ctx = await browser.newContext({ viewport:{ width:1366, height:768 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await ctx.route(/^https?:/, r => r.abort());
    await page.addInitScript((o) => { if(o.flag) window.MODAL_PIE_PRUEBA=1; if(o.ancha) window.CTA_ANCHA_PRUEBA=1; }, o);
    await page.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS + '?tema=espuma', { waitUntil:'load' });
    await page.waitForTimeout(450);
    await page.evaluate(PREPARAR);
    page._ctx=ctx; return page;
  };
  const medir = (page) => page.evaluate(() => {
    var bx=document.getElementById('modal-box'), r=bx.getBoundingClientRect(), b=bx.querySelector(':scope > .modal-b'), pie=bx.querySelector(':scope > .modal-pie');
    var bot=function(re){ var x=[].filter.call(bx.querySelectorAll('button'), function(y){ return re.test(y.textContent); })[0]; if(!x) return null; var q=x.getBoundingClientRect(); return { top:Math.round(q.top), bottom:Math.round(q.bottom), enPie:!!(pie && pie.contains(x)) }; };
    var h=bx.querySelector('.modal-h').getBoundingClientRect();
    return { alta:bx.classList.contains('alta'), fin:bx.classList.contains('mp-fin'), alto:Math.round(r.height), arriba:Math.round(r.top), abajo:Math.round(r.bottom), vh:innerHeight,
      tit:Math.round(h.top), editar:bot(/Editar el pedido/), copiar:bot(/Copiar para WhatsApp/), listo:bot(/Listo/),
      sc:b ? Math.round(b.scrollTop) : null, mas:!!(pie && pie.querySelector('.mp-mas')), masVe:!!(pie && pie.querySelector('.mp-mas') && getComputedStyle(pie.querySelector('.mp-mas')).opacity!=='0') };
  });
  const abrirMis = async (page, id) => { await page.evaluate((id) => { showMisModal(id); }, id); await page.waitForTimeout(250); };

  console.log('\n── 1. Sin la bandera ──');
  let page = await abrir({});
  await abrirMis(page, 'largo');
  let r = await medir(page);
  chk('1a. sin `MODAL_PIE_PRUEBA`: la ficha larga como siempre (sin pie, «Editar» fuera de la pantalla)', !r.alta && r.alto>r.vh && r.editar && r.editar.top>r.vh, r);
  await page._ctx.close();

  console.log('\n── 2-4. Con la bandera ──');
  page = await abrir({ flag:true });
  await abrirMis(page, 'largo');
  r = await medir(page);
  chk('2a. la ficha larga queda del alto de la pantalla, con el título arriba', r.alta && r.abajo<=r.vh && r.arriba>=0 && r.tit===r.arriba, r);
  chk('2b. «Editar el pedido», «Copiar para WhatsApp» y «✓ Listo» en el pie, a la vista', r.editar && r.editar.enPie && r.editar.bottom<=r.vh && r.copiar && r.copiar.enPie && r.listo && r.listo.enPie && r.listo.bottom<=r.vh, r);
  chk('3a. «▾ hay más abajo» a la vista', r.mas && r.masVe && !r.fin, r);
  r = await page.evaluate(async () => { var b=document.querySelector('#modal-box > .modal-b'), a=b.scrollTop; document.querySelector('#modal-box .mp-mas').click(); await new Promise(x=>setTimeout(x, 700)); return { antes:a, despues:b.scrollTop }; });
  chk('3b. tocarlo baja el medio', r.despues>r.antes+50, r);
  r = await page.evaluate(async () => { var b=document.querySelector('#modal-box > .modal-b'); b.scrollTop=b.scrollHeight; await new Promise(x=>setTimeout(x, 200)); return { fin:document.getElementById('modal-box').classList.contains('mp-fin') }; });
  chk('3c. al llegar al final se va', r.fin, r);
  r = await page.evaluate(async () => { var b=document.querySelector('#modal-box > .modal-b'); b.scrollTop=150; await new Promise(x=>setTimeout(x, 100)); showMisModal('largo'); await new Promise(x=>setTimeout(x, 150));
    var b2=document.querySelector('#modal-box > .modal-b'); return { sc:Math.round(b2.scrollTop), alta:document.getElementById('modal-box').classList.contains('alta'), pies:document.querySelectorAll('#modal-box .modal-pie').length }; });
  chk('4a. la misma ventana dibujada de nuevo sigue donde estaba (y con un solo pie)', r.alta && Math.abs(r.sc-150)<=2 && r.pies===1, r);
  r = await page.evaluate(async () => { document.querySelector('#modal-box .modal-pie .btn-primary').click(); await new Promise(x=>setTimeout(x, 150)); return { on:document.getElementById('modal').classList.contains('on') }; });
  chk('2c. «✓ Listo» cierra la ventana (el mismo botón)', !r.on, r);
  await abrirMis(page, 'largo');
  r = await medir(page);
  chk('4b. abierta otra vez arranca arriba', r.alta && r.sc===0, r);
  r = await page.evaluate(async () => { [].filter.call(document.querySelectorAll('#modal-box button'), function(x){ return /Editar el pedido/.test(x.textContent); })[0].click(); await new Promise(x=>setTimeout(x, 300));
    return { vista:(document.querySelector('.view.active')||{}).id, cliente:(document.getElementById('f-cliente')||{}).value }; });
  chk('2d. «Editar el pedido» abre el formulario del pedido (lo de siempre)', r.vista==='view-form' && r.cliente==='CLIENTE LARGO', r);
  await page.evaluate(() => { try{ resetForm(); }catch(e){} showView('mis'); });
  await page.evaluate(() => { openModal('<div class="modal-h"><h3>Una ventana corta</h3><button class="modal-x" onclick="closeModal()">✕</button></div><div class="modal-b"><p>Nada más.</p>'+
    '<div class="modal-actions"><button class="btn btn-sm">✏️ Editar el pedido</button><button class="btn btn-sm">📋 Copiar para WhatsApp</button></div><button class="btn btn-primary" onclick="closeModal()">✓ Listo</button></div>'); });
  await page.waitForTimeout(150);
  r = await medir(page);
  chk('5a. una ventana corta queda igual (sin pie)', !r.alta && !r.mas && r.alto<r.vh, r);
  await page.evaluate(() => { closeModal(); showView('admin'); showPedidoModal('largo'); });
  await page.waitForTimeout(300);
  r = await page.evaluate(() => { var bx=document.getElementById('modal-box'); return { fl:bx.classList.contains('fl-ficha'), alta:bx.classList.contains('alta'), pie:!!bx.querySelector('.modal-pie') }; });
  chk('5b. la ficha de Administración (con su forma) queda afuera', r.fl && !r.alta && !r.pie, r);
  await page._ctx.close();

  console.log('\n── 6. La ficha ancha (366) ──');
  page = await abrir({ flag:true, ancha:true });
  await abrirMis(page, 'largo');
  r = await medir(page);
  chk('6a. la ficha ancha también: «Editar», «Copiar» y «✓ Listo» en el pie, a la vista', r.alta && r.editar && r.editar.enPie && r.editar.bottom<=r.vh && r.listo && r.listo.enPie, r);
  await page._ctx.close();

  chk('sin errores en la página', errores.length===0, errores.slice(0,4));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
