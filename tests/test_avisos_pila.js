/* 🗂️ AVISOS QUE NO SE PISAN NI TAPAN LO QUE ESTÁS LEYENDO (15/11/2026, mejora 285; dueño: aprobado). Los avisos (`toast`) salen abajo a
   la izquierda, en tarjetas blancas con su color, su dibujo y un título en negrita, apilados hasta 3; los de «listo» se van solos con una
   barrita; los de error se quedan hasta tocar ✕. La MISMA firma `toast(msg, kind, ms)` y `#toast` con el último texto.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin la bandera (Playwright): el cartel de siempre (`#toast` con «show») y ninguna pila.
   2. Con `AVISOS_PRUEBA`: una tarjeta con el dibujo del aviso, el título (la primera oración) y el resto; `#toast` sigue con el mismo texto y
      su clase (escondido).
   3. Hasta 3 a la vista: el cuarto saca al más viejo; el más nuevo, abajo. El mismo aviso dos veces seguidas no se repite.
   4. El de «listo» se va solo (con su barrita); con el mouse encima espera. El de error no tiene barrita, no se va solo y ✕ lo cierra.
   5. Abajo a la izquierda; con el «Deshacer» a la vista sube.
   Datos SINTÉTICOS.   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_avisos_pila.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const nueva = async (flag) => {
    const page = await browser.newPage({ viewport:{ width:1366, height:768 }, timezoneId:'America/La_Paz' });
    page.on('pageerror', e=>errores.push(e.message));
    await page.route(/^https?:/, r=>r.abort());
    if(flag) await page.addInitScript(() => { window.AVISOS_PRUEBA=true; });
    await page.goto('file://' + PEDIDOS + '?tema=espuma', { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate(() => { var c=document.getElementById('conn-form'); if(c) c.style.display='none'; CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
      loadFromServer=function(){}; var cb=document.getElementById('carga-banner'); if(cb) cb.style.display='none'; var p=document.getElementById('avisos-pila'); if(p) p.innerHTML=''; });
    return page;
  };
  const pila = (page) => page.evaluate(() => { var p=document.getElementById('avisos-pila'); if(!p) return null;
    return [].filter.call(p.children, function(x){ return !x._saliendo; }).map(function(c){ return { cls:c.className, ic:(c.querySelector('.av-ic')||{}).textContent, b:(c.querySelector('.av-tx b')||{}).textContent||'', s:(c.querySelector('.av-tx span')||{}).textContent||'', bar:!!c.querySelector('.av-bar') }; }); });

  console.log('\n── 1. Sin la bandera ──');
  let page = await nueva(false);
  let r = await page.evaluate(() => { toast('✅ Pedido guardado. Ya está en la planilla.','ok'); var t=document.getElementById('toast'); return { txt:t.textContent, cls:t.className, pila:!!document.getElementById('avisos-pila'), vis:getComputedStyle(t).display }; });
  chk('1 sin bandera: el cartel de siempre y ninguna pila', r.txt==='✅ Pedido guardado. Ya está en la planilla.' && r.cls==='toast show ok' && !r.pila && r.vis!=='none', r);
  await page.close();

  console.log('\n── 2-5. Con la bandera ──');
  page = await nueva(true);
  r = await page.evaluate(() => { toast('✅ Pedido guardado. Ya está en la planilla para todo el equipo.','ok'); var t=document.getElementById('toast'); return { txt:t.textContent, cls:t.className, vis:getComputedStyle(t).display }; });
  let P = await pila(page);
  chk('2a una tarjeta: el dibujo del aviso, el título (primera oración) y el resto', P && P.length===1 && P[0].ic==='✅' && P[0].b==='Pedido guardado.' && P[0].s==='Ya está en la planilla para todo el equipo.' && /av-ok/.test(P[0].cls) && P[0].bar, P);
  chk('2b #toast sigue con el mismo texto y su clase (escondido)', r.txt==='✅ Pedido guardado. Ya está en la planilla para todo el equipo.' && /\btoast show ok\b/.test(r.cls) && r.vis==='none', r);
  r = await page.evaluate(() => { toast('Turno lleno','err'); toast('Sin conexión con la planilla: lo que guardes queda en la cola.'); return null; });
  P = await pila(page);
  chk('2c sin emoji: el dibujo de su tipo (⚠️ error, ℹ️ información); corto = solo título', P.length===3 && P[1].ic==='⚠️' && P[1].b==='Turno lleno' && P[1].s==='' && P[2].ic==='ℹ️', P.map(x=>[x.ic,x.b]));
  await page.evaluate(() => { toast('🚚 Cuarto aviso.','ok'); });
  P = await pila(page);
  chk('3a hasta 3 a la vista: el cuarto saca al más viejo y va abajo', P.length===3 && P[0].b==='Turno lleno' && P[2].b==='Cuarto aviso.' && P[2].ic==='🚚', P.map(x=>x.b));
  await page.evaluate(() => { toast('🚚 Cuarto aviso.','ok'); });
  P = await pila(page);
  chk('3b el mismo aviso dos veces seguidas no se repite (se renueva)', P.length===3 && P.filter(x=>x.b==='Cuarto aviso.').length===1, P.map(x=>x.b));

  await page.evaluate(() => { document.getElementById('avisos-pila').innerHTML=''; toast('✓ Copiado al portapapeles.','ok',700); toast('⚠️ No se pudo guardar.','err'); });
  await page.waitForTimeout(1200);
  P = await pila(page);
  chk('4a el de «listo» se va solo; el de error se queda (y no tiene barrita)', P.length===1 && P[0].b==='No se pudo guardar.' && !P[0].bar, P);
  await page.click('#avisos-pila .av-err .av-x'); await page.waitForTimeout(400);
  P = await pila(page);
  chk('4b ✕ cierra el de error', P.length===0, P);
  await page.evaluate(() => { toast('📋 Con el mouse encima espera.','ok',800); });
  await page.hover('#avisos-pila .av-c'); await page.waitForTimeout(1300);
  P = await pila(page);
  chk('4c con el mouse encima, el de «listo» espera', P.length===1, P);
  await page.mouse.move(700, 300); await page.waitForTimeout(3500);
  P = await pila(page);
  chk('4d al sacar el mouse se va solo', P.length===0, P);

  r = await page.evaluate(() => { toast('ℹ️ Dónde está.'); var c=document.querySelector('#avisos-pila .av-c').getBoundingClientRect(); var o={ left:Math.round(c.left), bottom:Math.round(innerHeight-c.bottom) };
    document.body.classList.add('desh-on'); var c2=document.querySelector('#avisos-pila .av-c').getBoundingClientRect(); o.bottomDesh=Math.round(innerHeight-c2.bottom); document.body.classList.remove('desh-on'); return o; });
  chk('5 abajo a la izquierda; con el «Deshacer» a la vista sube', r.left<=20 && r.bottom<=30 && r.bottomDesh>=80, r);
  await page.close();

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
