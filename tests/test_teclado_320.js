/* ⌨️📱 TECLADO Y PANTALLA DE 320 PX (25/10, auditoría Codex/Astra UI-01/02/04/05, §4mk).

   LO QUE CUIDA:
   1. UI-01 · Una ficha de Administración se abre con Enter y con Espacio (antes, solo con el mouse o el dedo).
   2. UI-02 · Al abrir una ventana (la ficha, «📁 Comprobantes») el foco entra a la ventana; Tab y Mayús+Tab dan la vuelta adentro (antes
      seguían por la página de atrás); Esc la cierra y el foco vuelve a lo que la abrió.
   3. UI-04 · Ningún campo del formulario queda sin nombre para un lector de pantalla (antes, 21).
   4. UI-05 · A 320 px: Administración en fichas no corre de costado (la ficha pedía 285 px + márgenes) y la lista de productos que se
      despliega al escribir no se sale de la pantalla.

   Reloj CLAVADO (martes 27/10/2026, 10:00 de Bolivia). Solo datos sintéticos.
   Se corre:  node tests/test_teclado_320.js   (PEDIDOS=… para correrla contra otra versión) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

const PREPARAR = async () => {
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  var n=0, P=function(o){ n++; return Object.assign({ id:'p'+n, oc:'10-'+(100+n), nota:String(5000+n), cliente:'CLIENTE CON NOMBRE LARGO '+n, celular:'7000000'+n,
    fecha:proximoDiaEntrega(), turno:'AM', zona:'Norte', direccion:'AV. BANZER 4TO ANILLO, CALLE LOS PINOS 123', vendedor:'Carola Chavez',
    productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:3000 }], saldo:3000, acuenta:0, pagado:false,
    metodoPago:'', ts:Date.now()-86400000, rev:1 }, o); };
  STATE=[P(), P({ turno:'PM' }), P()];
  var lk=document.getElementById('admin-lock'); if(lk) lk.style.display='none';
  var ac=document.getElementById('admin-content'); if(ac) ac.style.display='block';
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
  apiSave=function(x){ return Promise.resolve({ ok:true, pedido:x }); };
};
const foco = (page) => page.evaluate(() => { var a=document.activeElement, box=document.getElementById('modal-box');
  return { dentro:!!(box && box.contains(a)), tag:a && a.tagName, cls:a && String(a.className||'').slice(0,30), id:a && a.id, abierta:document.getElementById('modal').classList.contains('on') }; });

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];

  // ═══ 1-3. Teclado, en una compu ════════════════════════════════════════════════════════════
  {
    const ctx = await browser.newContext({ viewport:{ width:1280, height:900 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await ctx.route(/^https:\/\//, r => r.abort());
    await page.addInitScript(() => { window.ADM_FICHAS_PRUEBA=1; });
    await page.clock.setFixedTime(new Date('2026-10-27T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate(PREPARAR);
    await page.evaluate(async () => { showView('admin'); await new Promise(r=>setTimeout(r, 300)); try{ renderAdmin(); }catch(e){} });
    await page.waitForTimeout(200);
    const hay = await page.evaluate(() => document.querySelectorAll('#adm-fichas .af-f').length);
    chk('(Administración en fichas, con 3 pedidos)', hay===3, hay);
    // 1 · Enter
    await page.focus('#adm-fichas .af-f');
    await page.keyboard.press('Enter'); await page.waitForTimeout(200);
    let f = await foco(page);
    chk('1a. Enter sobre la ficha abre el pedido', f.abierta, f);
    chk('2a. …y el foco entra a la ventana (no queda en la página de atrás)', f.dentro, f);
    // 2 · Tab da la vuelta adentro
    let fuera=0; for(let i=0;i<60;i++){ await page.keyboard.press('Tab'); const g=await foco(page); if(!g.dentro) fuera++; }
    chk('2b. 60 veces Tab: el foco nunca sale de la ventana', fuera===0, fuera);
    fuera=0; for(let i=0;i<20;i++){ await page.keyboard.press('Shift+Tab'); const g=await foco(page); if(!g.dentro) fuera++; }
    chk('2c. …ni con Mayús+Tab', fuera===0, fuera);
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    f = await foco(page);
    chk('2d. Esc la cierra y el foco vuelve a la ficha que la abrió', !f.abierta && /af-f/.test(f.cls), f);
    // 1 · Espacio
    await page.keyboard.press(' '); await page.waitForTimeout(200);
    f = await foco(page);
    chk('1b. Espacio sobre la ficha también la abre', f.abierta && f.dentro, f);
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    // 2 · Comprobantes, desde su botón con el teclado
    await page.evaluate(async () => { showView('conta'); await new Promise(r=>setTimeout(r, 250)); });
    const btn = await page.evaluate(() => { var b=document.getElementById('comps-btn0'); return !!(b && b.getClientRects().length); });
    if (btn) {
      await page.focus('#comps-btn0'); await page.keyboard.press('Enter'); await page.waitForTimeout(250);
      f = await foco(page);
      chk('2e. «📁 Comprobantes» con Enter: se abre y el foco entra', f.abierta && f.dentro, f);
      fuera=0; for(let i=0;i<15;i++){ await page.keyboard.press('Tab'); const g=await foco(page); if(!g.dentro) fuera++; }
      chk('2f. …Tab no se va a la página de atrás', fuera===0, fuera);
      await page.keyboard.press('Escape'); await page.waitForTimeout(150);
      f = await foco(page);
      chk('2g. …y al cerrarla el foco vuelve al botón «📁 Comprobantes»', !f.abierta && f.id==='comps-btn0', f);
    } else chk('2e. (el botón «📁 Comprobantes» se ve en Contabilidad)', false, 'no se ve');
    // 3 · los campos con nombre
    const sin = await page.evaluate(async () => { showView('form'); await new Promise(r=>setTimeout(r, 300)); addProdRow();
      return [].slice.call(document.querySelectorAll('#view-form input, #view-form select, #view-form textarea')).filter(function(e){
        if(e.type==='hidden' || !e.getClientRects().length) return false;
        if(e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') || e.closest('label')) return false;
        if(e.id && document.querySelector('label[for="'+e.id+'"]')) return false;
        return true; }).map(function(e){ return e.id||e.className; }); });
    chk('3. ningún campo del formulario queda sin nombre (antes, 21)', sin.length===0, sin);
    const nombres = await page.evaluate(() => ({ nota:(document.querySelector('label[for="f-nota"]')||{}).textContent||'', prod:document.querySelector('#f-productos .prod-desc').getAttribute('aria-label'),
      cant:document.querySelector('#f-productos .prod-cant').getAttribute('aria-label') }));
    chk('3b. …con su nombre de verdad: «N° Nota de venta», «Producto», «Cant.»', /Nota de venta/.test(nombres.nota) && nombres.prod==='Producto' && nombres.cant==='Cant.', nombres);
    await ctx.close();
  }

  // ═══ 4. 320 px ═════════════════════════════════════════════════════════════════════════════
  {
    const ctx = await browser.newContext({ viewport:{ width:320, height:700 }, timezoneId:'America/La_Paz', hasTouch:true });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await ctx.route(/^https:\/\//, r => r.abort());
    await page.addInitScript(() => { window.ADM_FICHAS_PRUEBA=1; });
    await page.clock.setFixedTime(new Date('2026-10-27T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate(PREPARAR);
    const adm = await page.evaluate(async () => { showView('admin'); await new Promise(r=>setTimeout(r, 300)); try{ renderAdmin(); }catch(e){}
      await new Promise(r=>setTimeout(r, 150));
      var f=document.querySelector('#adm-fichas .af-f'), R=f && f.getBoundingClientRect();
      return { sw:document.documentElement.scrollWidth, iw:document.documentElement.clientWidth, fichas:document.querySelectorAll('#adm-fichas .af-f').length, der:R && Math.round(R.right), ancho:R && Math.round(R.width) }; });
    chk('4a. Administración en fichas a 320 px: la página no corre de costado (antes 336)', adm.fichas===3 && adm.ancho>200 && adm.sw<=adm.iw && adm.der<=adm.iw, adm);
    await page.evaluate(async () => { showView('form'); await new Promise(r=>setTimeout(r, 300)); });
    const inp = page.locator('#f-productos .prod-desc').first();
    await inp.scrollIntoViewIfNeeded(); await inp.click(); await inp.fill('titanio'); await page.waitForTimeout(300);
    const lista = await page.evaluate(() => { var el=document.getElementById('fx-busca'); if(!el || el.hidden) return { hay:false };
      var R=el.getBoundingClientRect(); return { hay:true, izq:Math.round(R.left), der:Math.round(R.right), iw:document.documentElement.clientWidth, sw:document.documentElement.scrollWidth }; });
    chk('4b. la lista de productos que se despliega entra en la pantalla de 320 px', lista.hay && lista.izq>=0 && lista.der<=lista.iw && lista.sw<=lista.iw, lista);
    await ctx.close();
  }
  chk('sin errores en la página', !errores.length, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
