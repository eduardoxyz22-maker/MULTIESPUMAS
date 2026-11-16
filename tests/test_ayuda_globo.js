/* 💬 LAS AYUDAS AL PASAR EL MOUSE, EN UN GLOBITO DEL PANEL (16/11/2026, mejora 373; el dueño la eligió).
   Las explicaciones que el panel tiene en `title` salen en un globito propio (blanco, borde turquesa, el nombre en negrita) en 0,3 s,
   también con Tab, dentro de la pantalla y sin tapar a Bloki.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin `AYUDA_PRUEBA`: nada cambia (el `title` queda, no hay globito).
   2. Con la bandera, al pasar el mouse: el `title` pasa a `data-ayuda` en el acto (el navegador no saca el suyo); a los 0,3 s el globito
      con el MISMO texto, el nombre del botón en negrita y `aria-describedby` apuntándolo; debajo del botón.
   3. Si la explicación ya empieza con el nombre del botón, no lo repite.
   4. Al salir: el `title` vuelve tal cual, sin `data-ayuda` ni `aria-describedby`, y el globito se esconde.
   5. Si el panel le cambia el `title` mientras se ve, al salir queda el nuevo.
   6. Con el teclado (Tab): sale; al irse el foco, se va.
   7. Cerca del borde: nunca se sale de la pantalla (abajo de todo va arriba del botón; a la derecha se corre).
   8. No tapa a Bloki.
   9. Esc y tocar lo esconden.
   10. Con el dedo (touch) no hace nada.
   11. Con el panel agrandado (1.920, `zoom:1.25`) queda pegado al botón.
   Datos SINTÉTICOS. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_ayuda_globo.js */
const { chromium } = require('playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };

(async () => {
  const browser = await chromium.launch();
  const errores=[];
  const abrir = async (flag, w, h) => {
    const ctx = await browser.newContext({ viewport:{ width:w||1366, height:h||768 }, timezoneId:'America/La_Paz', hasTouch:true });
    await ctx.route(/^https?:/, r=>r.abort());
    await ctx.addInitScript((flag) => { try{ sessionStorage.setItem('me_quien_ok','1'); localStorage.setItem('me_asis_tour','1'); }catch(e){} if(flag) window.AYUDA_PRUEBA=1; }, flag);
    const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message));
    await page.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
    await page.evaluate(() => {
      var c=document.getElementById('conn-form'); if(c) c.style.display='none';
      CONNECTED=true; CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
      if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
      var cap=document.createElement('div'); cap.id='__cap'; cap.style.cssText='position:fixed;inset:0;z-index:9000;pointer-events:none';
      cap.innerHTML='<button id="__b1" style="position:absolute;left:200px;top:150px;pointer-events:auto">🤖 Revisión automática</button>'+
        '<button id="__b2" style="position:absolute;left:420px;top:150px;pointer-events:auto" title="Copiar el reclamo para mandarlo por WhatsApp">Copiar el reclamo</button>'+
        '<button id="__b3" style="position:absolute;right:4px;bottom:4px;pointer-events:auto" title="Una explicación larga, larga, que no entra en un renglón y tiene que quedarse adentro de la pantalla aunque el botón esté en la esquina de abajo a la derecha.">⬇️</button>'+
        '<button id="__b4" style="position:absolute;right:120px;top:520px;pointer-events:auto" title="Este globito no puede tapar a Bloki: tiene que irse arriba o al costado.">Botón al lado de Bloki</button>'+
        '<div id="asis-yo" style="position:absolute;right:20px;top:560px;width:150px;height:180px;background:#eee"></div>';
      document.body.appendChild(cap);
      document.getElementById('__b1').setAttribute('title', 'Recorre los pedidos pendientes y marca solo ✔ hay / 📥 recoger / ✗ no hay, repartiendo el stock por fecha de entrega.');
    });
    page._ctx=ctx; return page;
  };
  const centro = (page, sel) => page.evaluate((sel) => { var r=document.querySelector(sel).getBoundingClientRect(); return { x:r.left+r.width/2, y:r.top+r.height/2 }; }, sel);
  const estado = (page, sel) => page.evaluate((sel) => {
    var el=document.querySelector(sel), g=document.getElementById('ayuda-globo'), gr=g && !g.hidden ? g.getBoundingClientRect() : null, er=el.getBoundingClientRect();
    return { title:el.getAttribute('title'), ay:el.getAttribute('data-ayuda'), desc:el.getAttribute('aria-describedby'), vis:!!gr,
      txt:g ? g.textContent : '', nom:(g && g.querySelector('.ay-n')) ? g.querySelector('.ay-n').textContent : '',
      g:gr && { l:Math.round(gr.left), t:Math.round(gr.top), r:Math.round(gr.right), b:Math.round(gr.bottom), w:Math.round(gr.width) }, e:{ l:Math.round(er.left), t:Math.round(er.top), b:Math.round(er.bottom), r:Math.round(er.right) },
      W:innerWidth, H:innerHeight };
  }, sel);

  console.log('\n── 1. Sin la bandera ──');
  let page = await abrir(false);
  let c = await centro(page, '#__b1'); await page.mouse.move(c.x, c.y); await page.waitForTimeout(450);
  let s = await estado(page, '#__b1');
  chk('1 sin la bandera, el title queda y no hay globito', /^Recorre/.test(s.title) && !s.ay && !s.vis, s);
  await page._ctx.close();

  console.log('\n── 2-5. Con el mouse ──');
  page = await abrir(true);
  c = await centro(page, '#__b1'); await page.mouse.move(c.x, c.y); await page.waitForTimeout(40);
  s = await estado(page, '#__b1');
  chk('2a en el acto el title pasa a data-ayuda (el del navegador no sale)', s.title===null && /^Recorre/.test(s.ay) && !s.vis, s);
  await page.waitForTimeout(350);
  s = await estado(page, '#__b1');
  chk('2b a los 0,3 s el globito con el MISMO texto y el nombre del botón en negrita', s.vis && s.nom==='🤖 Revisión automática' && s.txt.indexOf('Recorre los pedidos pendientes')>0, s);
  chk('2c apuntado con aria-describedby, debajo del botón y no más ancho que 280 px', s.desc==='ayuda-globo' && s.g.t>=s.e.b && s.g.t<=s.e.b+14 && Math.abs(s.g.l-s.e.l)<=2 && s.g.w<=281, s);
  c = await centro(page, '#__b2'); await page.mouse.move(c.x, c.y); await page.waitForTimeout(380);
  s = await estado(page, '#__b2');
  chk('3 si la explicación ya empieza con el nombre, no lo repite', s.vis && s.nom==='' && s.txt==='Copiar el reclamo para mandarlo por WhatsApp', s);
  let s1 = await estado(page, '#__b1');
  chk('4a al pasar a otro, el primero recupera su title tal cual, sin data-ayuda ni aria-describedby', /^Recorre los pedidos pendientes/.test(s1.title) && s1.ay===null && s1.desc===null, s1);
  await page.mouse.move(700, 400); await page.waitForTimeout(80);
  s = await estado(page, '#__b2');
  chk('4b al salir a nada, el globito se esconde y el title vuelve', !s.vis && s.title==='Copiar el reclamo para mandarlo por WhatsApp' && s.ay===null, s);
  c = await centro(page, '#__b2'); await page.mouse.move(c.x, c.y); await page.waitForTimeout(380);
  await page.evaluate(() => document.getElementById('__b2').setAttribute('title', 'Ahora dice otra cosa'));
  await page.mouse.move(700, 400); await page.waitForTimeout(80);
  s = await estado(page, '#__b2');
  chk('5 si el panel le cambió el title mientras se veía, al salir queda el nuevo', s.title==='Ahora dice otra cosa' && s.ay===null, s);

  console.log('\n── 6. Con el teclado ──');
  await page.evaluate(() => { var b=document.createElement('button'); b.id='__b0'; b.textContent='antes'; b.style.cssText='position:fixed;left:10px;top:150px;z-index:9001'; document.body.appendChild(b); b.focus(); });
  await page.keyboard.press('Tab'); await page.waitForTimeout(20);
  const foco = await page.evaluate(() => document.activeElement && document.activeElement.id);
  await page.evaluate(() => { document.getElementById('__b1').focus(); });   // el foco «de teclado» queda con :focus-visible después de un Tab
  await page.waitForTimeout(380);
  s = await estado(page, '#__b1');
  chk('6a con Tab, sale el globito', s.vis && s.title===null && /^Recorre/.test(s.ay), { foco, s });
  await page.keyboard.press('Tab'); await page.waitForTimeout(60);
  s = await estado(page, '#__b1');
  chk('6b al irse el foco, se va y el title vuelve', !(s.vis && /Recorre/.test(s.txt)) && /^Recorre/.test(s.title), s);

  console.log('\n── 7-9. Bordes, Bloki, Esc y tocar ──');
  await page.evaluate(() => { document.activeElement && document.activeElement.blur(); });
  c = await centro(page, '#__b3'); await page.mouse.move(c.x, c.y); await page.waitForTimeout(380);
  s = await estado(page, '#__b3');
  chk('7 en la esquina de abajo a la derecha: adentro de la pantalla, arriba del botón', s.vis && s.g.l>=8 && s.g.r<=s.W-7 && s.g.t>=8 && s.g.b<=s.e.t, s);
  c = await centro(page, '#__b4'); await page.mouse.move(c.x, c.y); await page.waitForTimeout(380);
  s = await estado(page, '#__b4');
  const bloki = await page.evaluate(() => { var r=document.getElementById('asis-yo').getBoundingClientRect(); return { l:r.left, t:r.top, r:r.right, b:r.bottom }; });
  const choca = s.g && s.g.l<bloki.r && s.g.r>bloki.l && s.g.t<bloki.b && s.g.b>bloki.t;
  chk('8 no tapa a Bloki', s.vis && !choca, { g:s.g, bloki });
  await page.keyboard.press('Escape'); await page.waitForTimeout(40);
  s = await estado(page, '#__b4');
  chk('9a Esc lo esconde', !s.vis, s);
  await page.mouse.move(700, 400); await page.waitForTimeout(40);
  c = await centro(page, '#__b2'); await page.mouse.move(c.x, c.y); await page.waitForTimeout(380);
  await page.mouse.down(); await page.waitForTimeout(40);
  s = await estado(page, '#__b2'); await page.mouse.up();
  chk('9b tocar lo esconde', !s.vis, s);
  await page.mouse.move(700, 400); await page.waitForTimeout(60);

  console.log('\n── 10. Con el dedo ──');
  c = await centro(page, '#__b1');
  await page.touchscreen.tap(c.x, c.y); await page.waitForTimeout(400);
  s = await estado(page, '#__b1');
  chk('10 con el dedo, nada: el title queda y no hay globito', /^Recorre/.test(s.title) && !s.vis, s);
  await page._ctx.close();

  console.log('\n── 11. El panel agrandado (1.920) ──');
  page = await abrir(true, 1920, 1080);
  const z = await page.evaluate(() => zoomPag());
  c = await centro(page, '#__b1'); await page.mouse.move(c.x, c.y); await page.waitForTimeout(400);
  s = await estado(page, '#__b1');
  chk('11 con zoom '+z+', el globito queda pegado debajo del botón (en px de pantalla)', z>1.2 && s.vis && s.g.t>=s.e.b && s.g.t<=s.e.b+16 && Math.abs(s.g.l-s.e.l)<=3, { z, s });
  await page._ctx.close();

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
