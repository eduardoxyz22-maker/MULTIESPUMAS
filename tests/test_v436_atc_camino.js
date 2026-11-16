/* 🎨 MEJORA 436 — ATC: EL CAMINITO DE CADA ATC EN LA LISTA (16/11/2026; el dueño eligió las ideas visuales 390-440 menos la 403).

   Debajo del estado de cada fila de `#tbl-atc`, cinco puntitos unidos (Recoger · Fábrica · Lista · Vuelve · Entregada): los hechos llenos, el de
   ahora grande con el color de su estado (el de «🛤️ El viaje»), los que faltan huecos; abajo «2 de 5 · Fábrica → Lista».

   LO QUE ESTA PRUEBA CUIDA:
   1. Sin la bandera `ATC_CAMINO_PRUEBA` (Playwright): la tabla como siempre (sin caminito).
   2. Con la bandera, una ATC de cada estado: el paso que le toca (sin recoger 1, en fábrica 2, lista 3, recoger de fábrica y programada 4,
      entregada 5), los hechos llenos y los que faltan huecos, con el color de su estado (`atvColor`).
   3. La tabla no cambia en lo demás: mismas filas, en el mismo orden, con los mismos textos (más la línea del caminito) y la misma etiqueta.
   Datos INVENTADOS. Reloj clavado: lunes 16/11/2026 a las 10:00 de Bolivia.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 TZ=America/La_Paz node tests/test_v436_atc_camino.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

function PREPARAR(){
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  loadFromServer=function(){};
  var A=function(n, fecha, atc, extra){ return Object.assign({ id:'a'+n, oc:'ATC 11-0'+(10+n), vendedor:'Carola Chavez', cliente:'CLIENTE ATC '+n, celular:'7100'+(1000+n), fecha:fecha, turno:'AM', zona:'SUR',
    direccion:'Calle '+n, productos:[{ desc:'COLCHON INVENTADO', medida:'140x190', cant:1, atc:Object.assign({ mot:'Hundimiento', det:'Se hunde en el centro', fcom:'2025-05-01', tipo:'gar' }, atc) }],
    ts:Date.parse('2026-11-0'+n+'T10:00:00-04:00'), entregado:false, fotos:[] }, extra||{}); };
  STATE=[ A(1, '2026-11-20', {}),                                              // sin recoger
          A(2, '2026-11-10', {}),                                              // en fábrica (ya pasó el recojo)
          A(3, '2026-11-09', { dev:'2026-11-14' }),                            // lista en fábrica
          A(4, '2026-11-30', { pdev:'2026-11-30', rec:'2026-11-05' }),         // devolución programada (lejos)
          A(5, '2026-11-17', { pdev:'2026-11-17', rec:'2026-11-05' }),         // recoger de fábrica (la entrega es mañana)
          A(6, '2026-11-12', { pdev:'2026-11-12', rec:'2026-11-03', ent:'2026-11-12' }, { entregado:true }) ];   // entregada
  UNLOCKED=true;
  var b=document.querySelector('#atc-mode button[data-val="todo"]'); if(b) b.click();
  showView('atc'); renderAtc();
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
    await page.addInitScript((o) => { if(o.flag) window.ATC_CAMINO_PRUEBA=1; }, o);
    await page.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS + '?tema=espuma', { waitUntil:'load' });
    await page.waitForTimeout(450);
    await page.evaluate(PREPARAR);
    await page.waitForTimeout(300);
    page._ctx=ctx; return page;
  };
  const leer = (page) => page.evaluate(() => [].map.call(document.querySelectorAll('#tbl-atc tbody tr'), function(tr){
    var td=tr.children[1], cam=td.querySelector('.atc-cam'), sin=td.cloneNode(true), x=sin.querySelector('.atc-cam'); if(x) x.remove();
    var filaSin=tr.cloneNode(true), y=filaSin.querySelector('.atc-cam'); if(y) y.remove();
    return { oc:tr.children[0].innerText.split('\n')[0].trim(), est:atcEstado(findById(tr.querySelector('[onclick*="verAtc"]') ? /verAtc\('([^']+)'\)/.exec(tr.getAttribute('onclick'))[1] : '')),
      badge:sin.innerText.replace(/\s+/g,' ').trim(), fila:filaSin.innerText.replace(/\s+/g,' ').trim(),
      cam:cam ? { t:cam.querySelector('.atc-cam-t').textContent, pts:[].map.call(cam.querySelectorAll('.atc-cam-p i'), function(i){ return i.className||'-'; }).join(''), c:cam.style.getPropertyValue('--c'),
        aColor:getComputedStyle(cam.querySelector('.atc-cam-p i.a')).backgroundColor } : null };
  }));

  console.log('\n── 1. Sin la bandera ──');
  let page = await abrir({});
  const antes = await leer(page);
  chk('1a. sin `ATC_CAMINO_PRUEBA`: la tabla sin caminito', antes.length===6 && antes.every(r=>!r.cam), antes.map(r=>r.oc));
  await page._ctx.close();

  console.log('\n── 2-3. Con la bandera ──');
  page = await abrir({ flag:true });
  const r = await leer(page);
  const ESP={ sinrecoger:['1 de 5 · Recoger → Fábrica','a----'], fabrica:['2 de 5 · Fábrica → Lista','ha---'], lista:['3 de 5 · Lista → Vuelve','hha--'],
    programada:['4 de 5 · Vuelve → Entregada','hhha-'], recogerfab:['4 de 5 · Vuelve → Entregada','hhha-'], cerrada:['5 de 5 · Entregada','hhhha'] };
  const vistos={};
  r.forEach(f => { vistos[f.est]=1; const e=ESP[f.est];
    chk('2 · '+f.oc+' ('+f.est+'): «'+(f.cam&&f.cam.t)+'» '+(f.cam&&f.cam.pts), !!f.cam && f.cam.t===e[0] && f.cam.pts===e[1], f.cam); });
  chk('2 · están los seis estados', Object.keys(ESP).every(k=>vistos[k]), Object.keys(vistos));
  const col = await page.evaluate(() => ({ fabrica:atvColor('fabrica'), cerrada:atvColor('cerrada') }));
  const fab=r.find(f=>f.est==='fabrica'), cer=r.find(f=>f.est==='cerrada');
  chk('2 · el color de su estado, el mismo de «El viaje» (fábrica '+col.fabrica+', entregada '+col.cerrada+')', fab.cam.c===col.fabrica && cer.cam.c===col.cerrada, [fab.cam.c, cer.cam.c]);
  chk('3a. mismas filas en el mismo orden', JSON.stringify(r.map(f=>f.oc))===JSON.stringify(antes.map(f=>f.oc)), r.map(f=>f.oc));
  chk('3b. la etiqueta del estado y el resto de la fila, iguales', r.every((f, i) => f.badge===antes[i].badge && f.fila===antes[i].fila), r.map((f,i)=>[f.badge, antes[i].badge]).filter(x=>x[0]!==x[1]));
  await page._ctx.close();

  chk('sin errores en la página', errores.length===0, errores.slice(0,4));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
