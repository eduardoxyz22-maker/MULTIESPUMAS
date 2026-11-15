/* ✅ «✓ COPIADO» EN EL MISMO BOTÓN QUE SE TOCÓ (15/11/2026, mejora 289; dueño: «ok»). Los «📋 Copiar…» que pasan por `copyText`
   avisaban con el cartelito de abajo al medio, lejos del botón. Ahora el botón tocado se pone verde oscuro y dice «Copiado» (si es ancho,
   «· pegalo con Ctrl + V») y a los 2 segundos vuelve a ser el de siempre, del mismo tamaño.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin la bandera (Playwright), el aviso de siempre: «Copiado ✓» abajo y el botón no cambia.
   2. Con `COPIADO_PRUEBA`: el botón tocado dice «Copiado», en verde oscuro, del MISMO ancho y alto; no sale el aviso de abajo; lo copiado
      es el texto de siempre; a los 2 s vuelve a ser el de antes (mismo HTML, sin la clase, sin ancho fijo).
   3. Un botón ancho agrega «pegalo con Ctrl + V»; uno chico, solo «Copiado».
   4. Tocarlo dos veces seguidas: al final vuelve al ORIGINAL (no se queda en «Copiado»). Una copia que llega un momento después del
      toque (el texto se armaba esperando algo) se dice en ese botón.
   5. Sin botón (copiar desde código o un atajo, sin un toque en los últimos 3 s) o con el botón ya cerrado (la ventana se cerró): el
      aviso de siempre.
   6. Sin el portapapeles moderno (`fallbackCopy`), igual.
   7. Un botón dentro de una ficha que se toca: cambia el BOTÓN, nunca la ficha entera.
   Datos SINTÉTICOS.   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_copiado_boton.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };

const PREP = () => {
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  loadFromServer=function(){}; apiList=function(){ return Promise.resolve({ ok:true, pedidos:[] }); };
  var cb=document.getElementById('carga-banner'); if(cb) cb.style.display='none';
  window._copiado=[]; window._toasts=[];
  try{ Object.defineProperty(navigator, 'clipboard', { configurable:true, value:{ writeText:function(t){ window._copiado.push(t); return Promise.resolve(); } } }); }catch(e){}
  var _t=toast; toast=function(m){ window._toasts.push(String(m)); return _t.apply(this, arguments); };
  var box=document.createElement('div'); box.id='cp-prueba'; box.style.cssText='position:fixed;top:120px;left:20px;z-index:99999;background:#fff;padding:10px;display:flex;gap:8px;align-items:center';
  box.innerHTML='<button type="button" class="btn btn-sm" id="cp-chico" onclick="copyText(\'hola chico\')">📋 Copiar</button>'+
    '<button type="button" class="btn btn-primary" id="cp-ancho" style="width:280px" onclick="copyText(\'hola ancho\')">📋 Copiar el estado de cuenta</button>'+
    '<button type="button" class="btn btn-sm" id="cp-cierra" onclick="copyText(\'se cierra\');this.remove()">📋 Copiar y cerrar</button>'+
    '<button type="button" class="btn btn-sm" id="cp-tarde" onclick="setTimeout(function(){ copyText(\'tarde\'); }, 500)">📋 Copiar (espera)</button>'+
    '<span id="cp-sig">después</span>'+
    '<div class="t2-f" id="cp-ficha" role="button" tabindex="0" style="padding:6px;border:1px solid #ccc">Ficha <button type="button" class="btn btn-sm" id="cp-dentro" onclick="event.stopPropagation();copyText(\'de la ficha\')"><b>📋</b> Copiar</button></div>';
  document.body.appendChild(box);
};

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const nueva = async (flag) => {
    const page = await browser.newPage({ viewport:{ width:1366, height:768 }, timezoneId:'America/La_Paz' });
    page.on('pageerror', e=>errores.push(e.message));
    await page.route(/^https?:/, r=>r.abort());
    if(flag) await page.addInitScript(() => { window.COPIADO_PRUEBA=true; });
    await page.goto('file://' + PEDIDOS + '?tema=espuma', { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate(PREP);
    return page;
  };
  const medir = (page, id) => page.evaluate((id) => { var b=document.getElementById(id); if(!b) return null; var r=b.getBoundingClientRect();
    return { txt:b.innerText.replace(/\s+/g,' ').trim(), w:Math.round(r.width), h:Math.round(r.height), ok:b.classList.contains('cp-ok'), bg:getComputedStyle(b).backgroundColor, html:b.innerHTML, sw:b.style.width }; }, id);

  console.log('\n── 1. Sin la bandera ──');
  let page = await nueva(false);
  await page.click('#cp-chico'); await page.waitForTimeout(150);
  let a = await medir(page, 'cp-chico'), r = await page.evaluate(() => ({ t:window._toasts.slice(), c:window._copiado.slice() }));
  chk('1 sin bandera: el aviso de siempre abajo y el botón no cambia', /Copiado ✓/.test(r.t.join('|')) && a.txt==='📋 Copiar' && !a.ok && r.c[0]==='hola chico', { a, r });
  await page.close();

  console.log('\n── 2-4. Con la bandera ──');
  page = await nueva(true);
  const antes = await medir(page, 'cp-chico');
  const sigAntes = await page.evaluate(() => Math.round(document.getElementById('cp-sig').getBoundingClientRect().left));
  await page.click('#cp-chico'); await page.waitForTimeout(150);
  a = await medir(page, 'cp-chico');
  r = await page.evaluate(() => ({ t:window._toasts.slice(), c:window._copiado.slice(), sig:Math.round(document.getElementById('cp-sig').getBoundingClientRect().left) }));
  chk('2a el botón tocado dice «Copiado», en verde oscuro', a.ok && /^Copiado$/.test(a.txt) && /rgb\(15, 118, 110\)/.test(a.bg), a);
  chk('2b del mismo ancho y alto: lo de al lado no se corre', Math.abs(a.w-antes.w)<=1 && Math.abs(a.h-antes.h)<=1 && r.sig===sigAntes, { antes:[antes.w,antes.h], ahora:[a.w,a.h], sig:[sigAntes, r.sig] });
  chk('2c no sale el aviso de abajo y lo copiado es el texto de siempre', r.t.filter(x=>/Copiado/.test(x)).length===0 && r.c[0]==='hola chico', r);
  await page.waitForTimeout(2100);
  a = await medir(page, 'cp-chico');
  chk('2d a los 2 s vuelve a ser el de antes (mismo HTML, sin la clase, sin ancho fijo)', !a.ok && a.html===antes.html && a.sw==='' && a.txt==='📋 Copiar', a);

  await page.click('#cp-ancho'); await page.waitForTimeout(150);
  a = await medir(page, 'cp-ancho');
  const chico = await (async()=>{ await page.click('#cp-chico'); await page.waitForTimeout(100); return medir(page, 'cp-chico'); })();
  chk('3 el ancho agrega «pegalo con Ctrl + V»; el chico, solo «Copiado»', /Copiado · pegalo con Ctrl \+ V/.test(a.txt) && chico.txt==='Copiado', [a.txt, chico.txt]);
  await page.waitForTimeout(800);
  await page.click('#cp-chico'); await page.waitForTimeout(150);   // segundo toque mientras dice «Copiado»
  await page.waitForTimeout(2100);
  a = await medir(page, 'cp-chico');
  chk('4 dos toques seguidos: al final vuelve al ORIGINAL', !a.ok && a.html===antes.html, a.txt);

  await page.click('#cp-tarde'); await page.waitForTimeout(700);
  a = await medir(page, 'cp-tarde');
  chk('4b la copia que llega medio segundo después del toque (se armaba el texto) también se dice en ESE botón', a.ok && /^Copiado/.test(a.txt), a.txt);
  console.log('\n── 5-7. Sin botón, botón cerrado, sin portapapeles, adentro de una ficha ──');
  await page.waitForTimeout(3200);   // el último toque ya pasó hace más de 3 s
  r = await page.evaluate(async () => { window._toasts=[]; copyText('desde codigo'); await new Promise(x=>setTimeout(x,100)); return window._toasts.slice(); });
  chk('5a sin botón (desde código): el aviso de siempre', /Copiado ✓/.test(r.join('|')), r);
  await page.evaluate(() => { window._toasts=[]; });
  await page.click('#cp-cierra'); await page.waitForTimeout(150);
  r = await page.evaluate(() => ({ t:window._toasts.slice(), hay:!!document.getElementById('cp-cierra') }));
  chk('5b el botón se fue (se cerró la ventana): el aviso de siempre', /Copiado ✓/.test(r.t.join('|')) && !r.hay, r);
  await page.evaluate(() => { window._toasts=[]; Object.defineProperty(navigator, 'clipboard', { configurable:true, value:undefined }); document.execCommand=function(){ return true; }; });
  await page.waitForTimeout(2100);
  await page.click('#cp-chico'); await page.waitForTimeout(150);
  a = await medir(page, 'cp-chico'); r = await page.evaluate(() => window._toasts.slice());
  chk('6 sin el portapapeles moderno (fallbackCopy): también en el botón', a.ok && a.txt==='Copiado' && !r.some(x=>/Copiado/.test(x)), { a:a.txt, r });
  await page.click('#cp-dentro'); await page.waitForTimeout(150);
  r = await page.evaluate(() => ({ boton:document.getElementById('cp-dentro').classList.contains('cp-ok'), ficha:document.getElementById('cp-ficha').classList.contains('cp-ok'), fichaTxt:document.getElementById('cp-ficha').innerText.replace(/\s+/g,' ') }));
  chk('7 un botón adentro de una ficha: cambia el botón (aunque se toque su dibujo), nunca la ficha', r.boton && !r.ficha && /^Ficha/.test(r.fichaTxt), r);
  await page.close();

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
