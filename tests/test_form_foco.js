/* 📱 GUARDAR CON UN DATO QUE FALTA LLEVA AL CAMPO EN ROJO (25/10, auditoría Codex/Astra, §4mk).

   Codex: «Vaciar Nota y guardar por teclado: en cinco anchos el foco queda en Guardar; a 390 px el error está a −2.687 px, fuera de
   vista». LO QUE CUIDA, a 390 y 1440 px, con el formulario de 4 pasos y con el de siempre:
   1. Guardar sin la nota: el foco queda EN la nota y la nota está a la vista.
   2. El aviso dice qué falta («Falta: nota de venta»).
   3. Nada se guarda.

   Reloj CLAVADO (martes 27/10/2026, 10:00 de Bolivia). Solo datos sintéticos.
   Se corre:  node tests/test_form_foco.js   (PEDIDOS=… para correrla contra otra versión) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  for (const [ancho, marcas] of [[390, ['FP_PRUEBA']], [1440, ['FP_PRUEBA']], [390, []]]) {
    const ctx = await browser.newContext({ viewport:{ width:ancho, height:844 }, timezoneId:'America/La_Paz', hasTouch: ancho<700 });
    const page = await ctx.newPage(); const errores=[];
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await ctx.route(/^https:\/\//, r => r.abort());
    await page.clock.setFixedTime(new Date('2026-10-27T10:00:00-04:00'));
    await page.addInitScript((m)=>{ m.forEach(function(k){ window[k]=1; }); }, marcas);
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate(async () => {
      var c=document.getElementById('conn-form'); if(c) c.style.display='none';
      CONNECTED=true; UNLOCKED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
      CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
      if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
      STATE=[{ id:'p1', oc:'10-101', nota:'5001', cliente:'ANA PRUEBA', celular:'70000001', fecha:proximoDiaEntrega(), turno:'AM', zona:'Norte', direccion:'CALLE 1', vendedor:'Carola Chavez',
        productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:3000 }], saldo:3000, acuenta:0, pagado:false, metodoPago:'', ts:Date.now()-86400000, rev:1 }];
      window._guardados=[]; window._toasts=[];
      var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(m)); return _t(m,k,ms); };
      apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
      apiSave=function(r){ window._guardados.push(r); return Promise.resolve({ ok:true, pedido:r }); };
      showView('form'); editPedido('p1'); await new Promise(function(r){ setTimeout(r, 350); });
      var n=document.getElementById('f-nota'); n.value=''; n.dispatchEvent(new Event('input',{bubbles:true}));
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(150);
    await page.locator('#f-submit').scrollIntoViewIfNeeded();
    await page.locator('#f-submit').click();
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => { var n=document.getElementById('f-nota'), R=n.getBoundingClientRect();
      return { foco:document.activeElement && document.activeElement.id, top:Math.round(R.top), alto:innerHeight, guardados:window._guardados.length, aviso:window._toasts.slice(-1)[0]||'' }; });
    const tag = ancho + (marcas.length ? ' con 4 pasos' : '');
    chk(`1·${tag}. sin la nota, el foco queda EN la nota y se ve (antes quedaba en Guardar)`, r.foco==='f-nota' && r.top>=0 && r.top<r.alto, r);
    chk(`2·${tag}. el aviso dice qué falta: «Falta: nota de venta»`, /Falta: nota de venta/.test(r.aviso), r.aviso);
    chk(`3·${tag}. no se guardó nada`, r.guardados===0, r.guardados);
    chk(`${tag}. sin errores en la página`, !errores.length, errores.slice(0,2));
    await ctx.close();
  }
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
