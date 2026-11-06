/* §4ok-99 (05/11) EL N° DE NOTA SE REVISA AL ESCRIBIRLO.
   En octubre hubo 15 notas que no seguían el talonario de su vendedor («11111», «5000», «689» donde iba 789) y 3 números usados en dos
   ventas del mismo vendedor; solo a Eduardo se le avisaba la repetida (§4ja). Con la planilla real, esta regla da exactamente esas 15 y 3.

   LO QUE CUIDA (datos inventados; reloj clavado el jueves 05/11/2026 a las 10:00 de Bolivia):
   1. Al SALIR del campo, una nota a más de 40 de las últimas 6 del vendedor (que siguen juntas) → aviso ámbar «Tus últimas notas son 2401
      a 2406. ¿Seguro que es 407?» con «Sí, es otro talonario». La que sigue el talonario (2407) no avisa. Mientras se escribe, no.
   2. «Sí, es otro talonario» lo saca y ese número no vuelve a avisar.
   3. Un número que ya está en otra venta del MISMO vendedor → lo dice con la OC y «👀 Ver»; el de otro vendedor, no; al editar, la propia
      venta no cuenta.
   4. Con menos de 3 notas, o con las últimas ya separadas (dos talonarios), no compara. Eduardo y ROHO, nada (tienen su regla).
   5. NUNCA frena: con el aviso a la vista, Guardar guarda.
   Se corre:  node tests/test_nota_revisar.js   (PEDIDOS=… para correrla contra otra versión) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const page = await browser.newPage({ viewport:{ width:1600, height:1000 }, timezoneId:'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-11-05T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  const ev = async (fn, arg) => { try{ return await page.evaluate(fn, arg); }catch(e){ return { __err:String(e.message||e).slice(0,200) }; } };
  await ev(() => {
    document.getElementById('conn-form').style.display='none';
    CONNECTED=true; UNLOCKED=false; CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    var L=[], k=0, V=function(v, nota, dia){ k++; L.push({ id:'n'+k, oc:'10-'+(300+k), nota:nota, vendedor:v, cliente:'CLIENTE '+k, celular:'7200000'+k, fecha:dia, turno:'AM', zona:'Norte',
      direccion:'CALLE '+k, productos:[{ desc:'TITANIO LATEX', medida:'160x190', codigo:'', cant:1, precio:3000 }], saldo:0, acuenta:0, pagado:true, metodoPago:'Efectivo 3000',
      ts:new Date(dia+'T10:00:00-04:00').getTime()-86400000, rev:1 }); };
    ['2401','2402','2403','2404','2405','2406'].forEach(function(n, i){ V('Carola Chavez', n, '2026-10-2'+i); });
    V('Mirian Salazar', '2403', '2026-10-21');                                   // el mismo número, de OTRA vendedora
    V('Isabel Robledo', '1801', '2026-10-21'); V('Isabel Robledo', '1802', '2026-10-22');   // solo 2 notas
    ['1100','1101','1102','3500','3501','3502'].forEach(function(n, i){ V('Maria Flores', n, '2026-10-2'+i); });   // dos talonarios a la vez
    V('Eduardo Añez', '32525', '2026-10-22');
    window._pl=JSON.parse(JSON.stringify(L)); window._saves=0;
    apiSave=function(rec){ window._saves++; var g=JSON.parse(JSON.stringify(rec)); g.rev=(Number(g.rev)||0)+1;
      window._pl=window._pl.filter(function(x){ return x.id!==g.id; }).concat([g]); return Promise.resolve({ ok:true, pedido:g }); };
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window._pl)) }); };
    STATE=JSON.parse(JSON.stringify(L)); saveMirror(); ULTIMO_REFRESCO=Date.now();
  });
  /* llena una venta y escribe la nota; `salir` = sale del campo (blur) */
  const nota = (v, t, salir, editar) => ev(async (o) => {
    if(o.editar){ editPedido(o.editar); await new Promise(r=>setTimeout(r, 250)); }
    else { showView('form'); resetForm(); document.getElementById('f-vendedor').value=o.v; applyVendedorLite(); document.getElementById('f-fecha').value='2026-11-06'; segSet('f-turno','AM'); }
    var el=document.getElementById('f-nota'); el.focus(); el.value=o.t; el.dispatchEvent(new Event('input', { bubbles:true }));
    var antes=document.getElementById('fx-nota'), mientras=antes ? !antes.hidden : null;
    if(o.salir) el.blur();
    await new Promise(r=>setTimeout(r, 60));
    var a=document.getElementById('fx-nota');
    return { existe:!!a, vis:!!(a && !a.hidden), txt:a ? a.textContent.replace(/\s+/g,' ').trim() : '', mientras:mientras };
  }, { v:v, t:t, salir:salir, editar:editar });

  /* 1 · lejos */
  let r = await nota('Carola Chavez', '407', false);
  chk('1 · mientras se escribe «407», nada', r.existe && !r.vis, r);
  r = await nota('Carola Chavez', '407', true);
  chk('1 · al salir del campo: «⚠️ Tus últimas notas son 2401 a 2406. ¿Seguro que es 407?»', r.vis && /Tus últimas notas son 2401 a 2406\. ¿Seguro que es 407\?/.test(r.txt), r);
  chk('1 · …con «Sí, es otro talonario»', /Sí, es otro talonario/.test(r.txt), r.txt);
  r = await nota('Carola Chavez', '2407', true);
  chk('1 · la que sigue el talonario (2407) no avisa', !r.vis, r);
  r = await nota('Carola Chavez', '11111', true);
  chk('1 · «11111» también avisa', r.vis && /¿Seguro que es 11111\?/.test(r.txt), r.txt);

  /* 2 · otro talonario */
  r = await ev(async () => { var el=document.getElementById('f-nota'); el.focus(); el.value='407'; el.blur(); await new Promise(x=>setTimeout(x,40));
    var b=[].filter.call(document.querySelectorAll('#fx-nota button'), function(x){ return /otro talonario/.test(x.textContent); })[0]; if(b) b.click();
    await new Promise(x=>setTimeout(x,40)); var a=document.getElementById('fx-nota'); var tras=!!(a && !a.hidden);
    el.focus(); el.value='407'; el.dispatchEvent(new Event('input', { bubbles:true })); el.blur(); await new Promise(x=>setTimeout(x,40));
    return { boton:!!b, tras:tras, otraVez:!!(a && !a.hidden) }; });
  chk('2 · «Sí, es otro talonario» lo saca y la 407 ya no vuelve a avisar', r.boton && !r.tras && !r.otraVez, r);

  /* 3 · repetida */
  r = await nota('Carola Chavez', '2403', true);
  chk('3 · «2403» ya está en una venta de Carola: «La nota 2403 ya está en otra venta tuya» con la OC 10-303 y «👀 Ver»', r.vis && /La nota 2403 ya está en otra venta tuya/.test(r.txt) && /OC 10-303/.test(r.txt) && /Ver/.test(r.txt) && !/Seguro que es/.test(r.txt), r.txt);
  r = await nota('Isabel Robledo', '2403', true);
  chk('3 · para Isabel, «2403» (que es de Carola y de Mirian) no es repetida', !/ya está en/.test(r.txt), r.txt);
  r = await nota('', '2403', true, 'n3');
  chk('3 · al editar la 10-303 (nota 2403) la propia venta no cuenta', !r.vis, r);

  /* 4 · sin comparar */
  r = await nota('Isabel Robledo', '9000', true);
  chk('4 · Isabel tiene solo 2 notas: no compara', !r.vis, r);
  r = await nota('Maria Flores', '7000', true);
  chk('4 · Maria usa dos talonarios (las últimas ya están separadas): no compara', !r.vis, r);
  r = await nota('Eduardo Añez', '1', true);
  chk('4 · Eduardo: este aviso no (tiene la suya, §4ja)', !/Tus últimas notas|ya está en otra venta tuya/.test(r.txt), r);
  r = await nota('ROHO', '5', true);
  chk('4 · ROHO: nada', !r.vis, r);

  /* 5 · nunca frena */
  r = await ev(async () => {
    showView('form'); resetForm();
    document.getElementById('f-vendedor').value='Carola Chavez'; applyVendedorLite();
    document.getElementById('f-fecha').value='2026-11-06'; segSet('f-turno','AM');
    document.getElementById('f-cliente').value='CLIENTE NUEVO 99'; document.getElementById('f-celular').value='79999999';
    document.getElementById('f-zona').value='Norte'; document.getElementById('f-direccion').value='CALLE FALSA 99';
    var el=document.getElementById('f-nota'); el.focus(); el.value='5000'; el.blur();
    var box=document.getElementById('f-productos'); box.innerHTML=''; addProdRow('TITANIO LATEX','160x190','',1,''); box.lastElementChild.querySelector('.prod-precio').value='3000';
    refreshDelButtons(); segSet('f-pagado','NO'); document.getElementById('f-saldo').value='3000'; try{ updateMetodoVisibility(); }catch(e){}
    await new Promise(x=>setTimeout(x,60)); var a=document.getElementById('fx-nota'), vis=!!(a && !a.hidden);
    var n0=window._saves; submitPedido(); await new Promise(x=>setTimeout(x,450)); try{ closeModal(); }catch(e){}
    return { vis:vis, guardo:window._saves>n0 };
  });
  chk('5 · con el aviso a la vista («5000»), Guardar guarda igual', r.vis && r.guardo, r);
  r = await ev(() => { resetForm(); var a=document.getElementById('fx-nota'); return !!(a && a.hidden); });
  chk('5 · un pedido nuevo arranca sin el aviso', r===true, r);

  chk('sin errores de la página', errores.length===0, errores);
  await browser.close();
  console.log('\n'+PASS+' bien, '+FAIL+' mal');
  process.exit(FAIL ? 1 : 0);
})();
