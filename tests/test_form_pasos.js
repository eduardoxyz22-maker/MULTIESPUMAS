/* 🪜 EL FORMULARIO EN CUATRO PASOS (§4mg, V4, 25/10; dueño: «V4 me encanta, aprobado»).

   LO QUE CUIDA:
   1. Con la marca: barra arriba + 4 pasos (Cliente y venta, Productos, Entrega, Cobro) con LOS MISMOS campos adentro (mismos ids).
   2. «Listo» sigue a `fxPasosEstado` (la cuenta de la barra del celular): llenar cliente pone el paso 1 en Listo y el «Ahora» pasa al siguiente.
   3. ATC: el paso de Cobro no se muestra (su contenido está escondido). La barra lo saca y cuenta 3.
   4. Guardar un pedido con los campos movidos anda igual (`submitPedido`).
   5. Sin la marca (Playwright): el formulario de siempre, sin pasos.

   Reloj CLAVADO (martes 27/10/2026, 10:00 de Bolivia). Solo datos sintéticos.
   Se corre:  node tests/test_form_pasos.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

async function abrir(browser, conMarca){
  const ctx = await browser.newContext({ viewport:{ width:1440, height:1000 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage(); const errores=[];
  page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await ctx.route(/^https:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-27T10:00:00-04:00'));
  if(conMarca) await page.addInitScript(()=>{ window.FP_PRUEBA=1; });
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    STATE=[]; window._guardados=[];
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
    apiSave=function(r){ window._guardados.push(r); return Promise.resolve({ ok:true, pedido:r }); };
    showView('form'); try{ renderCupoForm(); }catch(e){}
  });
  await page.waitForTimeout(150);
  return { page, ctx, errores };
}
const ev = async (page, fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });

  /* 5: sin la marca */
  const A = await abrir(browser, false);
  const r5 = await ev(A.page, () => ({ pasos:document.querySelectorAll('.fp-paso').length, barra:!!document.getElementById('fp-barra') }));
  chk('5. sin la marca, el formulario de siempre', r5.pasos===0 && !r5.barra, r5);
  await A.ctx.close();

  const B = await abrir(browser, true); const page=B.page;
  /* 1 */
  const r1 = await ev(page, () => {
    var en=function(id, n){ var e=document.getElementById(id); return !!(e && e.closest('#fp-'+n)); };
    return { pasos:[].map.call(document.querySelectorAll('.fp-paso .fp-cab b'), function(b){ return b.textContent; }), barra:!!document.getElementById('fp-barra'),
      dentro:{ fecha:en('f-fecha',1), nota:en('f-nota',1), vend:en('f-vendedor',1), cli:en('f-cliente',1), cel:en('f-celular',1), fact:en('f-facturar',1)||en('wrap-factura',1),
        prods:en('f-productos',2), turno:en('f-turno',3), zona:en('f-zona',3), cobro:en('wrap-cobro-todo',4) },
      ocultos:[].filter.call(document.querySelectorAll('#view-form .sec'), function(s){ return /Datos del pedido|📍 Entrega/.test(s.textContent) && getComputedStyle(s).display==='none'; }).length };
  });
  chk('1a. barra + 4 pasos', r1.barra && r1.pasos.length===4 && /Cliente y venta/.test(r1.pasos[0]) && /Productos/.test(r1.pasos[1]) && /Entrega/.test(r1.pasos[2]) && /Cobro/.test(r1.pasos[3]), r1.pasos);
  chk('1b. cada campo en su paso (mismos ids)', Object.values(r1.dentro).every(Boolean), r1.dentro);
  chk('1c. los títulos viejos «Datos del pedido» y «Entrega» se esconden', r1.ocultos===2, r1.ocultos);

  /* 2 */
  const r2 = await ev(page, async () => {
    var est=function(){ return [1,2,3,4].map(function(n){ return document.getElementById('fp-'+n).getAttribute('data-est'); }); };
    fpPintar(); var antes=est();
    var put=function(id,v){ var e=document.getElementById(id); e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); };
    put('f-vendedor','Carola Chavez'); put('f-cliente','CLIENTE PRUEBA'); put('f-celular','70012345'); put('f-nota','1450');
    if(!document.getElementById('f-fecha').value) put('f-fecha', proximoDiaEntrega());
    await new Promise(function(r){ setTimeout(r, 150); });
    return { antes:antes, despues:est(), estado:fxPasosEstado(), barra:document.getElementById('fp-barra').textContent };
  });
  chk('2a. al abrir, el paso 1 es «Ahora»', r2.antes && r2.antes[0]==='ya', r2.antes);
  chk('2b. con el cliente lleno: paso 1 Listo y «Ahora» pasa a Productos', r2.despues[0]==='ok' && r2.despues[1]==='ya' && r2.estado[0]===true, r2);
  chk('2c. la barra cuenta lo listo', /1 de 4/.test(r2.barra), r2.barra);

  /* 4 guardar */
  const r4 = await ev(page, async () => {
    var card=document.querySelector('#f-productos .prod-card')||document.querySelector('#f-productos > div');
    var d=document.querySelector('#f-productos .prod-desc'); d.value='COLCHON TITANIO ICE'; d.dispatchEvent(new Event('input',{bubbles:true}));
    var m=document.querySelector('#f-productos .prod-medida'); if(m){ if(m.tagName==='SELECT'){ var o=[].filter.call(m.options,function(x){ return /160/.test(x.value); })[0]; if(o) m.value=o.value; } else m.value='160x190'; m.dispatchEvent(new Event('change',{bubbles:true})); }
    var z=document.getElementById('f-zona'); z.value='Norte'; z.dispatchEvent(new Event('input',{bubbles:true}));
    var pg=document.querySelector('#f-pagado button[data-val="NO"]'); if(pg) pg.click();
    var s=document.getElementById('f-saldo'); if(s){ s.value='3000'; s.dispatchEvent(new Event('input',{bubbles:true})); }
    await new Promise(function(r){ setTimeout(r, 120); });
    try{ await submitPedido(new Event('submit')); }catch(e){ return { err:e.message }; }
    await new Promise(function(r){ setTimeout(r, 600); });
    var g=window._guardados[0]||{};
    return { n:window._guardados.length, cli:g.cliente, zona:g.zona, prod:((g.productos||[])[0]||{}).desc };
  });
  chk('4. guardar con los campos en sus pasos anda igual', r4.n>=1 && r4.cli==='CLIENTE PRUEBA' && r4.zona==='Norte' && /TITANIO ICE/.test(r4.prod||''), r4);

  /* 3 ATC */
  const r3 = await ev(page, async () => {
    try{ resetForm(); }catch(e){}
    var b=document.querySelector('#f-doc-tipo button[data-val="ATC"]'); if(b) b.click(); else { segSet('f-doc-tipo','ATC'); setDocTipo(); }
    await new Promise(function(r){ setTimeout(r, 150); }); fpPintar();
    return { p4:document.getElementById('fp-4').hidden, barra:document.getElementById('fp-barra').textContent, tipo:docTipoSel() };
  });
  chk('3. en una ATC el paso Cobro no se muestra y la barra cuenta 3', r3.tipo==='ATC' && r3.p4===true && /de 3/.test(r3.barra) && !/Cobro/.test(r3.barra), r3);

  chk('sin errores en la página', !B.errores.length, B.errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
