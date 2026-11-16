/* 📅 LA FECHA EN LETRAS AL LADO DE CADA FECHA (16/11/2026, mejora 385; el dueño la eligió).
   El 13/11 la fecha de un QR pagado el 03/11 quedó 11/03 (marzo) y el cobro desapareció del Cuadre de noviembre sin que nada lo dijera.
   Debajo de cada campo de fecha: el día en palabras; si parece que se dieron vuelta el día y el mes, la pregunta con «Sí, poner …».

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin `FECHA_LETRAS_PRUEBA`: nada debajo de los campos (como siempre).
   2. La fecha de entrega: «martes 17 de noviembre · mañana» al escribirla; cambia al cambiarla; vacía, se esconde.
   3. El pago de una venta del 03/11 con fecha 11/03/2026: en ámbar «Quedó miércoles 11 de marzo: 8 meses antes de la venta. ¿Quisiste
      decir martes 3 de noviembre?»; «Sí, poner 03/11» la pone y corre el `change` del campo; queda «martes 3 de noviembre · hace 13 días».
   4. «No, es así» no vuelve a preguntar por esa fecha (queda el día en letras); otra fecha rara, sí pregunta.
   5. No pregunta: una fecha cercana; una lejana cuya vuelta también es lejana; el día > 12; la fecha de compra de una ATC (de meses atrás a
      propósito: solo el día en letras).
   6. Los filtros de las barras (ver un día) no llevan nada.
   7. Una fecha que el panel pone solo (sin evento) aparece en el repaso.
   8. Un campo en un renglón (la «Fecha de la venta» de la venta de tienda, en una etiqueta en fila): el letrero va DEBAJO del renglón.
   9. Nunca frena: guardar no mira esto (la función no toca nada más que el campo y su letrero).
   Datos SINTÉTICOS. Reloj clavado: lunes 16/11/2026, 10:00 de Bolivia. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_fecha_letras.js */
const { chromium } = require('playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };

(async () => {
  const browser = await chromium.launch();
  const errores=[];
  const abrir = async (flag) => {
    const ctx = await browser.newContext({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
    await ctx.route(/^https?:/, r=>r.abort());
    await ctx.addInitScript((flag) => { try{ sessionStorage.setItem('me_quien_ok','1'); localStorage.setItem('me_asis_tour','1'); }catch(e){} if(flag) window.FECHA_LETRAS_PRUEBA=1; }, flag);
    const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
    await page.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
    await page.evaluate(() => {
      var c=document.getElementById('conn-form'); if(c) c.style.display='none';
      CONNECTED=true; UNLOCKED=true; CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
      if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
      loadFromServer=function(){}; apiSave=function(r){ return Promise.resolve({ ok:true, pedido:r }); };
      STATE=[{ id:'v1', oc:'11-008', cliente:'CLIENTE UNO', vendedor:'Mirian Salazar', fecha:'2026-11-20', turno:'AM', ts:Date.parse('2026-11-03T09:00:00-04:00'), rev:1, fotos:[],
               productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', cant:1, precio:14130 }], metodoPago:'', acuenta:0, saldo:14130 }];
    });
    page._ctx=ctx; return page;
  };
  const escribir = (page, sel, v) => page.evaluate(([sel, v]) => { var i=document.querySelector(sel); i.value=v; i.dispatchEvent(new Event('input', { bubbles:true })); i.dispatchEvent(new Event('change', { bubbles:true })); return true; }, [sel, v]);
  const hint = (page, sel) => page.evaluate((sel) => { var i=document.querySelector(sel), h=i && i._flH; return h ? { t:h.textContent.replace(/\s+/g,' ').trim(), ojo:h.classList.contains('fl-ojo'), hidden:h.hidden, vis:!!h.getClientRects().length } : null; }, sel);

  console.log('\n── 1. Sin la bandera ──');
  let page = await abrir(false);
  await page.evaluate(() => showView('form'));
  await escribir(page, '#f-fecha', '2026-11-17');
  let r = await page.evaluate(() => ({ h:!!document.getElementById('f-fecha')._flH, n:document.querySelectorAll('.fl-hint').length }));
  chk('1 sin la bandera, nada debajo de los campos', !r.h && r.n===0, r);
  await page._ctx.close();

  page = await abrir(true);
  console.log('\n── 2. La fecha de entrega ──');
  await page.evaluate(() => showView('form'));
  await escribir(page, '#f-fecha', '2026-11-17');
  r = await hint(page, '#f-fecha');
  chk('2a «martes 17 de noviembre · mañana»', r && r.t==='martes 17 de noviembre · mañana' && !r.ojo && r.vis, r);
  r = await page.evaluate(() => { var i=document.getElementById('f-fecha'), h=i._flH; return { justoDespues:i.nextElementSibling===h }; });
  chk('2b va justo debajo del campo', r.justoDespues, r);
  await escribir(page, '#f-fecha', '2026-11-30');
  r = await hint(page, '#f-fecha');
  chk('2c cambia con la fecha: «lunes 30 de noviembre · en 14 días»', r && r.t==='lunes 30 de noviembre · en 14 días', r);
  await escribir(page, '#f-fecha', '2027-01-04');
  r = await hint(page, '#f-fecha');
  chk('2d de otro año lo dice: «lunes 4 de enero de 2027»', r && r.t==='lunes 4 de enero de 2027' && !r.ojo, r);
  await escribir(page, '#f-fecha', '');
  r = await hint(page, '#f-fecha');
  chk('2e vacía, se esconde', r && r.hidden && !r.vis, r);

  console.log('\n── 3-4. El pago de una venta del 03/11 ──');
  await page.evaluate(() => { showView('conta'); showContaModal('v1'); });
  await page.waitForTimeout(250);
  r = await page.evaluate(() => { var i=document.getElementById('cta-pago-fecha'); window.__cambios=0; i.addEventListener('change', function(){ window.__cambios++; }); return !!i; });
  chk('3a la ficha de Contabilidad tiene la fecha del pago', r, r);
  await escribir(page, '#cta-pago-fecha', '2026-03-11');
  r = await hint(page, '#cta-pago-fecha');
  chk('3b en ámbar: «Quedó miércoles 11 de marzo: 8 meses antes de la venta. ¿Quisiste decir martes 3 de noviembre?»',
      r && r.ojo && /Quedó miércoles 11 de marzo: 8 meses antes de la venta\. ¿Quisiste decir martes 3 de noviembre\?/.test(r.t) && /Sí, poner 03\/11/.test(r.t) && /No, es así/.test(r.t), r);
  r = await page.evaluate(async () => { window.__cambios=0; var i=document.getElementById('cta-pago-fecha'); i._flH.querySelector('.fl-si').click(); await new Promise(function(x){ setTimeout(x, 40); });
    return { v:i.value, cambios:window.__cambios, t:i._flH.textContent, ojo:i._flH.classList.contains('fl-ojo') }; });
  chk('3c «Sí, poner 03/11» la pone, corre el change del campo y queda «martes 3 de noviembre · hace 13 días»', r.v==='2026-11-03' && r.cambios===1 && r.t==='martes 3 de noviembre · hace 13 días' && !r.ojo, r);
  await escribir(page, '#cta-pago-fecha', '2026-03-11');
  r = await page.evaluate(async () => { var i=document.getElementById('cta-pago-fecha'); i._flH.querySelector('.fl-no').click(); await new Promise(function(x){ setTimeout(x, 40); });
    var t1=i._flH.textContent, o1=i._flH.classList.contains('fl-ojo'); flRepasar(); return { v:i.value, t:t1, ojo:o1, ojo2:i._flH.classList.contains('fl-ojo') }; });
  chk('4a «No, es así» deja la fecha y no vuelve a preguntar (queda el día en letras)', r.v==='2026-03-11' && r.t==='miércoles 11 de marzo' && !r.ojo && !r.ojo2, r);
  await escribir(page, '#cta-pago-fecha', '2026-05-11');
  r = await hint(page, '#cta-pago-fecha');
  chk('4b otra fecha rara (11/05 → 5 de noviembre), sí pregunta', r && r.ojo && /¿Quisiste decir jueves 5 de noviembre\?/.test(r.t), r);

  console.log('\n── 5. Cuándo NO pregunta ──');
  await escribir(page, '#cta-pago-fecha', '2026-11-12');
  r = await hint(page, '#cta-pago-fecha'); chk('5a cercana (12/11): solo el día', r && !r.ojo && r.t==='jueves 12 de noviembre · hace 4 días', r);
  await escribir(page, '#cta-pago-fecha', '2026-06-01');
  r = await hint(page, '#cta-pago-fecha'); chk('5b lejana cuya vuelta (6 de enero) también es lejana: no pregunta', r && !r.ojo, r);
  await escribir(page, '#cta-pago-fecha', '2026-03-25');
  r = await hint(page, '#cta-pago-fecha'); chk('5c el día pasa de 12 (no se puede dar vuelta): no pregunta', r && !r.ojo, r);
  await page.evaluate(() => { try{ closeModal(); }catch(e){} showView('form'); var b=document.querySelector('#f-doc-tipo [data-val="ATC"]'); if(b) b.click(); });
  await page.waitForTimeout(150);
  await escribir(page, '#f-atc-compra', '2026-05-11');
  r = await hint(page, '#f-atc-compra'); chk('5d la fecha de compra de una ATC (11/05): el día en letras, sin pregunta', r && !r.ojo && r.t==='lunes 11 de mayo', r);

  console.log('\n── 6-7. Filtros y fechas puestas por el panel ──');
  await page.evaluate(() => { showView('conta'); segSet('cta-tab','cuadre'); setContaTab('cuadre'); });
  await page.waitForTimeout(200);
  r = await page.evaluate(() => { var i=document.getElementById('cua-dia'); if(!i) return { no:true }; i.value='2026-03-11'; i.dispatchEvent(new Event('input', { bubbles:true })); flRepasar(); return { h:!!i._flH }; });
  chk('6 el filtro de un día (Cuadre) no lleva nada', r.h===false, r);
  await page.evaluate(() => showView('form'));
  r = await page.evaluate(() => { var i=document.getElementById('f-fecha'); i.value='2026-11-18'; var antes=i._flH ? i._flH.textContent : ''; flRepasar(); return { antes:antes, despues:i._flH.textContent }; });
  chk('7 la fecha puesta por el panel (sin evento) aparece en el repaso', r.despues==='miércoles 18 de noviembre · pasado mañana', r);

  console.log('\n── 8. Un campo en un renglón ──');
  r = await page.evaluate(() => {
    var box=document.createElement('div'); box.id='__fila';
    box.innerHTML='<div class="__row" style="display:flex;gap:6px;align-items:center"><label style="display:flex;gap:6px;white-space:nowrap">Fecha <input type="date" id="__fx"></label><button>Otro</button></div>';
    document.getElementById('view-form').appendChild(box);
    var i=document.getElementById('__fx'); i.value='2026-11-16'; i.dispatchEvent(new Event('input', { bubbles:true }));
    var h=i._flH, row=box.querySelector('.__row');
    return { despuesDeFila:row.nextElementSibling===h, t:h.textContent, label:h.parentElement.tagName };
  });
  chk('8 en un renglón, el letrero va debajo del renglón (no adentro de la etiqueta)', r.despuesDeFila && r.t==='lunes 16 de noviembre · hoy' && r.label==='DIV', r);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
