/* 🎨 MEJORA 433 — EL PEDIDO QUE SE ESTÁ GUARDANDO SE VE EN SU FICHA (16/11/2026; el dueño eligió las ideas visuales 390-440 menos la 403).

   En Administración, la ficha tocada dice cómo va su guardado: «⏳ Guardando en la planilla…» (turquesa) mientras viaja, «✓ Guardado · HH:MM»
   (verde, 3 s) cuando la planilla dijo que sí, y «📴 Sin enviar · sale solo al volver la señal» (ámbar) mientras quede en la cola.

   LO QUE ESTA PRUEBA CUIDA (con el guardado de verdad: `persistPedido` → `guardarDurable` → `apiSave`, y un `apiPost` que contesta cuando
   la prueba quiere):
   1. Sin la bandera `PG_PRUEBA` (Playwright): la ficha no dice nada mientras se guarda.
   2. Con la bandera: mientras viaja, «Guardando…» en ESA ficha (y en ninguna otra); cuando la planilla dice que sí, «✓ Guardado» en verde, y a
      los 3 s se va. Nada de lo que se guarda cambia (lo mismo que llega sin la bandera).
   3. Sin señal: queda «📴 Sin enviar» mientras está en la cola; cuando la cola sale, se va.
   4. Volver a dibujar Administración (otro filtro, un refresco) no lo borra mientras dura.
   5. En la tabla, el renglón con el borde y la palabra.
   Datos INVENTADOS. Reloj clavado: lunes 16/11/2026 a las 10:00 de Bolivia (avanza con `runFor`).
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 TZ=America/La_Paz node tests/test_v433_guardando_ficha.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

function PREPARAR(){
  CONNECTED=true; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  loadFromServer=function(){};
  try{ localStorage.removeItem('ME_PENDING_V1'); }catch(e){}
  var L=[];
  for(var i=0;i<6;i++) L.push({ id:'p'+i, oc:'11-'+(400+i), nota:String(900+i), vendedor:'Carola Chavez', cliente:'CLIENTE INVENTADO '+i, celular:'7000'+(2000+i),
    fecha:'2026-11-16', turno:(i%2?'PM':'AM'), zona:'NORTE', direccion:'Calle '+i, productos:[{desc:'COLCHON INVENTADO',medida:'140x190',cant:1,precio:1000,chk:'ok'}],
    saldo:0, acuenta:1000, pagado:true, metodoPago:'', entregado:false, ts:Date.parse('2026-11-14T10:00:00-04:00'), fotos:[], rev:1 });
  STATE=L;
  /* el servidor de mentira: cada guardado espera a que la prueba lo conteste (`__ok()` / `__falla()`) */
  window.__PEND=[]; window.__ENVIADOS=[];
  apiPost=function(o){ if(!o || o.action!=='save') return Promise.resolve({ ok:true });
    window.__ENVIADOS.push(JSON.parse(JSON.stringify(o.pedido)));
    return new Promise(function(res, rej){ window.__PEND.push({ res:res, rej:rej, p:o.pedido }); }); };
  window.__ok=function(){ var x=window.__PEND.shift(); if(x) x.res({ ok:true, pedido:Object.assign({}, x.p, { rev:(Number(x.p.rev)||1)+1 }), ahora:Date.now() }); };
  window.__falla=function(){ var x=window.__PEND.shift(); if(x) x.rej(new Error('Failed to fetch')); };
  UNLOCKED=true; try{ document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display=''; }catch(e){}
  showView('admin'); renderAdmin();
  window.__ficha=function(id){ var f=document.querySelector('#adm-fichas .af-f[data-pid="'+id+'"]'); if(!f) return null; var c=f.querySelector(':scope > .pg-chip');
    return { cls:['pg-ir','pg-ok','pg-cola'].filter(function(k){ return f.classList.contains(k); }).join(' '), chip:c ? c.textContent : '' }; };
  window.__otras=function(id){ return [].filter.call(document.querySelectorAll('#adm-fichas .af-f[data-pid]'), function(f){ return f.getAttribute('data-pid')!==id && (f.querySelector('.pg-chip') || /pg-/.test(f.className)); }).length; };
  window.__tocar=function(id){ var p=findById(id); p.observaciones='Llamar 1 h antes'; persistPedido(p); };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (o) => {
    o=o||{};
    const ctx = await browser.newContext({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await ctx.route(/^https?:/, r => r.abort());
    await page.addInitScript((o) => { window.ADM_FICHAS_PRUEBA=1; if(o.flag) window.PG_PRUEBA=1; }, o);
    await page.clock.install({ time:new Date('2026-11-16T10:00:00-04:00') });
    await page.goto('file://' + PEDIDOS + '?tema=espuma', { waitUntil:'load' });
    await page.clock.runFor(600);
    await page.evaluate(PREPARAR);
    await page.clock.runFor(300);
    page._ctx=ctx; return page;
  };
  const paso = async (page, ms) => { await page.clock.runFor(ms||100); await page.evaluate(() => new Promise(r => requestAnimationFrame(() => r()))); };

  console.log('\n── 1. Sin la bandera ──');
  let page = await abrir({});
  await page.evaluate(() => { __tocar('p2'); }); await paso(page, 200);
  let r = await page.evaluate(() => ({ f:__ficha('p2'), viaja:__PEND.length }));
  chk('1a. sin `PG_PRUEBA`: mientras viaja, la ficha no dice nada', r.viaja===1 && r.f && !r.f.cls && !r.f.chip, r);
  await page.evaluate(() => { __ok(); }); await paso(page, 200);
  const sinBandera = await page.evaluate(() => __ENVIADOS.map(function(p){ var q=Object.assign({}, p); delete q.ts; return q; }));
  await page._ctx.close();

  console.log('\n── 2-5. Con la bandera ──');
  page = await abrir({ flag:true });
  await page.evaluate(() => { __tocar('p2'); }); await paso(page, 200);
  r = await page.evaluate(() => ({ f:__ficha('p2'), otras:__otras('p2'), viaja:__PEND.length }));
  chk('2a. mientras viaja: «Guardando en la planilla…» en ESA ficha (turquesa)', r.viaja===1 && r.f.cls==='pg-ir' && /Guardando en la planilla/.test(r.f.chip), r);
  chk('2b. en ninguna otra', r.otras===0, r.otras);
  await page.evaluate(() => { setQuick('todos'); renderAdmin(); }); await paso(page, 200);
  r = await page.evaluate(() => __ficha('p2'));
  chk('4a. volver a dibujar Administración no lo borra', r && r.cls==='pg-ir', r);
  await page.evaluate(() => { __ok(); }); await paso(page, 300);
  r = await page.evaluate(() => __ficha('p2'));
  chk('2c. la planilla dijo que sí: «✓ Guardado · 10:00» en verde', r.cls==='pg-ok' && /✓ Guardado · \d\d:\d\d/.test(r.chip), r);
  await paso(page, 3300);
  r = await page.evaluate(() => __ficha('p2'));
  chk('2d. a los 3 s se va', !r.cls && !r.chip, r);
  const conBandera = await page.evaluate(() => __ENVIADOS.map(function(p){ var q=Object.assign({}, p); delete q.ts; return q; }));
  const limpio = a => JSON.stringify(a, (k, v) => (k==='eH' || k==='fH' || k==='t' || k==='_t') ? undefined : v);
  chk('2e. lo que se guarda es lo mismo que sin la bandera', limpio(sinBandera)===limpio(conBandera), [sinBandera.length, conBandera.length]);

  await page.evaluate(() => { __tocar('p3'); }); await paso(page, 200);
  await page.evaluate(() => { __falla(); }); await paso(page, 1700);
  await page.evaluate(() => { __falla(); }); await paso(page, 400);
  r = await page.evaluate(() => ({ f:__ficha('p3'), cola:colaEsperando().map(function(q){ return q.id; }) }));
  chk('3a. sin señal: queda en la cola y la ficha dice «📴 Sin enviar» (ámbar)', r.cola.indexOf('p3')>=0 && r.f.cls==='pg-cola' && /Sin enviar/.test(r.f.chip), r);
  await page.evaluate(() => { try{ flushPending(); }catch(e){} }); await paso(page, 200);
  await page.evaluate(() => { while(__PEND.length) __ok(); }); await paso(page, 400);
  r = await page.evaluate(() => ({ f:__ficha('p3'), cola:colaEsperando().map(function(q){ return q.id; }) }));
  chk('3b. cuando la cola sale, se va el «Sin enviar»', r.cola.indexOf('p3')<0 && !/Sin enviar/.test(r.f.chip) && !/pg-cola/.test(r.f.cls), r);

  await page.evaluate(() => { admVistaPoner('tabla'); }); await paso(page, 200);
  await page.evaluate(() => { __tocar('p4'); }); await paso(page, 200);
  r = await page.evaluate(() => { var tr=[].filter.call(document.querySelectorAll('#tbl-pedidos tbody tr'), function(t){ return /showPedidoModal\('p4'\)/.test(t.getAttribute('onclick')||''); })[0];
    return tr ? { cls:tr.className, tag:(tr.querySelector('.pg-tag')||{}).textContent||'' } : null; });
  chk('5a. en la tabla: el renglón con el borde y «Guardando…»', r && /pg-ir/.test(r.cls) && /Guardando/.test(r.tag), r);
  await page.evaluate(() => { __ok(); }); await paso(page, 3500);
  await page._ctx.close();

  chk('sin errores en la página', errores.length===0, errores.slice(0,4));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
