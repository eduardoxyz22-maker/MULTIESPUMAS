/* ❓ TODAS LAS PREGUNTAS EN LA VENTANA DEL PANEL (16/11/2026; dueño, con la captura del «¿Prender el MODO PRÁCTICA…?»: «¿no que mis
   alertas no salían ya esas feas?»). La 282 pasó 5; esta tanda pasa las que quedaban con tres piezas comunes:
   `preguntaYa` (el confirm), `preguntaTextoYa` (el prompt) y `avisoVentana` (el alert).

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin la bandera (Playwright): las tres hacen lo del navegador con el MISMO texto, sincrónico (las pruebas viejas contestan diálogos).
   2. Con `PREG_PRUEBA`: ninguna ventanita del navegador. Una tarea que pregunta DOS cosas: la primera vez corta sin hacer nada, al
      contestar vuelve a correr, pregunta la segunda, y con las dos contestadas hace lo suyo UNA vez. Después la memoria queda vacía
      (la próxima vez vuelve a preguntar).
   3. Un «No» también vuelve a correr y llega al «no» del lugar (no hace lo del «sí»).
   4. El texto sin `o` se arma solo: el primer renglón es el título y el emoji el dibujo; los «•» son renglones.
   5. `preguntaTextoYa`: el campo trae el valor de antes; Enter acepta lo escrito; Esc devuelve null.
   6. `avisoVentana`: un solo botón «Entendido», no frena lo de después.
   7. El Modo práctica: la ventana del panel con «No, seguir normal» / «🧪 Prender la práctica»; «No» no prende nada; «Sí» prende.
   Datos SINTÉTICOS. Reloj clavado: lunes 16/11/2026, 10:00 de Bolivia.   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_preg_todas.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const HOY = '2026-11-16T10:00:00-04:00';

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true;
  try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  loadFromServer=function(){};
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:[] }); };
  window._preg=function(){ var o=document.querySelector('.preg-ov'); if(!o) return null;
    return { tit:o.querySelector('h4').textContent, ic:o.querySelector('.preg-i').textContent, sub:(o.querySelector('.preg-h small')||{}).textContent||'',
      lineas:[].map.call(o.querySelectorAll('.preg-b li'), function(x){ return x.textContent; }),
      no:(o.querySelector('.preg-no')||{}).textContent||null, si:o.querySelector('.preg-si').textContent,
      campo:(o.querySelector('.preg-in')||{}).value, foco:document.activeElement && document.activeElement.className, n:document.querySelectorAll('.preg-ov').length }; };
  // Una tarea que pregunta dos cosas y, con las dos en «sí», hace lo suyo (como un guardado que pregunta el saldo y la fecha).
  window._hechos=[]; window._corridas=0;
  window._tarea=function(){
    window._corridas++;
    var a=preguntaYa('📦 ¿Guardar sin stock?\nFaltan 2 colchones.', null, window._tarea); if(a===null) return 'espera';
    if(!a){ window._hechos.push('no-a'); return 'no-a'; }
    var b=preguntaYa('📅 ¿Guardar para el domingo?', { titulo:'¿Para el domingo?', si:'Sí, el domingo', no:'Cambiar el día' }, window._tarea); if(b===null) return 'espera';
    window._hechos.push(b ? 'guardado' : 'no-b'); return 'fin';
  };
  window._nombre=[]; window._pide=function(){ var v=preguntaTextoYa('✏️ ¿Cómo se llama el almacén?', 'BANZER', null, window._pide); if(v==null) return; window._nombre.push(v); };
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const nueva = async (flag) => {
    const ctx = await browser.newContext({ viewport:{ width:1366, height:800 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message));
    page._dialogos=[]; page.on('dialog', d=>{ page._dialogos.push(d.type()+'|'+d.message()); if(d.type()==='prompt') d.accept('ESCRITO'); else d.accept(); });
    await ctx.route(/^https?:\/\//, r=>r.abort());
    if(flag) await page.addInitScript(() => { window.PREG_PRUEBA=true; });
    await page.clock.setFixedTime(new Date(HOY));
    await page.goto('file://' + PEDIDOS + '?tema=espuma', { waitUntil:'load' }); await page.waitForTimeout(400);
    await page.evaluate(PREPARAR);
    return { ctx, page };
  };

  /* 1. Sin la bandera: lo del navegador, sincrónico y con el mismo texto. */
  { const { ctx, page } = await nueva(false);
    const r = await page.evaluate(() => { var x=window._tarea(); window._pide(); avisoVentana('ℹ️ Listo.\nSe guardó.'); return { x, hechos:window._hechos, nombre:window._nombre, ov:!!document.querySelector('.preg-ov') }; });
    chk('1 · sin bandera: la tarea corre de una (sincrónica) y guarda', r.x==='fin' && r.hechos.join()==='guardado', r);
    chk('1 · sin bandera: confirm, confirm, prompt y alert del navegador con el texto de siempre',
      page._dialogos.length===4 && page._dialogos[0]==='confirm|📦 ¿Guardar sin stock?\nFaltan 2 colchones.' && page._dialogos[1]==='confirm|📅 ¿Guardar para el domingo?' &&
      page._dialogos[2]==='prompt|✏️ ¿Cómo se llama el almacén?' && page._dialogos[3]==='alert|ℹ️ Listo.\nSe guardó.', page._dialogos);
    chk('1 · sin bandera: el prompt devuelve lo escrito', r.nombre.join()==='ESCRITO', r.nombre);
    chk('1 · sin bandera: ninguna ventana del panel', !r.ov);
    await ctx.close(); }

  /* 2-4. Con la bandera: la ventana del panel, de a una pregunta, y lo suyo UNA vez. */
  { const { ctx, page } = await nueva(true);
    let r = await page.evaluate(() => ({ x:window._tarea(), hechos:window._hechos.slice(), p:window._preg() }));
    chk('2 · la primera vez corta sin hacer nada (espera la respuesta)', r.x==='espera' && r.hechos.length===0, r);
    chk('4 · el texto se arma solo: título del primer renglón, dibujo del emoji, el resto en renglones',
      r.p && r.p.tit==='¿Guardar sin stock?' && r.p.ic==='📦' && r.p.lineas.join('|')==='Faltan 2 colchones.' && r.p.no==='Cancelar' && r.p.si==='Sí', r.p);
    await page.waitForTimeout(40); const pf = await page.evaluate(() => window._preg());
    chk('2 · el foco en el botón seguro', pf && /preg-no/.test(pf.foco), pf && pf.foco);
    await page.click('.preg-si'); await page.waitForTimeout(80);
    r = await page.evaluate(() => ({ hechos:window._hechos.slice(), p:window._preg(), corr:window._corridas }));
    chk('2 · al contestar vuelve a correr y pregunta la segunda (con sus botones)', r.corr===2 && r.p && r.p.tit==='¿Para el domingo?' && r.p.si==='Sí, el domingo' && r.p.no==='Cambiar el día' && r.p.n===1, r);
    chk('2 · todavía no hizo nada', r.hechos.length===0, r.hechos);
    await page.click('.preg-si'); await page.waitForTimeout(80);
    r = await page.evaluate(() => ({ hechos:window._hechos.slice(), p:window._preg(), corr:window._corridas, memo:PREG_MEMO }));
    chk('2 · con las dos contestadas hace lo suyo UNA vez', r.hechos.join()==='guardado' && r.corr===3 && !r.p, r);
    chk('2 · la memoria queda vacía después', r.memo===null, r.memo);
    r = await page.evaluate(() => ({ x:window._tarea(), p:window._preg() }));
    chk('2 · la próxima vez vuelve a preguntar desde el principio', r.x==='espera' && r.p && r.p.tit==='¿Guardar sin stock?', r);
    /* 3. «No» también vuelve a correr y llega al «no» del lugar. */
    await page.click('.preg-no'); await page.waitForTimeout(80);
    r = await page.evaluate(() => ({ hechos:window._hechos.slice(), p:window._preg() }));
    chk('3 · «Cancelar» vuelve a correr y hace el «no» (no guarda)', r.hechos.join()==='guardado,no-a' && !r.p, r);
    /* Esc en la segunda = «no» de la segunda. */
    await page.evaluate(() => window._tarea()); await page.click('.preg-si'); await page.waitForTimeout(80);
    await page.keyboard.press('Escape'); await page.waitForTimeout(80);
    r = await page.evaluate(() => ({ hechos:window._hechos.slice(), p:window._preg() }));
    chk('3 · Esc en la segunda = su «no»', r.hechos.join()==='guardado,no-a,no-b' && !r.p, r);

    /* 5. preguntaTextoYa */
    await page.evaluate(() => window._pide()); await page.waitForTimeout(60);
    r = await page.evaluate(() => window._preg());
    chk('5 · el campo trae el valor de antes y el foco', r && r.campo==='BANZER' && /preg-in/.test(r.foco) && r.si==='Listo', r);
    await page.fill('.preg-in', 'MIA PLAZA'); await page.keyboard.press('Enter'); await page.waitForTimeout(80);
    r = await page.evaluate(() => ({ n:window._nombre.slice(), p:window._preg() }));
    chk('5 · Enter acepta lo escrito', r.n.join()==='MIA PLAZA' && !r.p, r);
    await page.evaluate(() => window._pide()); await page.waitForTimeout(60); await page.keyboard.press('Escape'); await page.waitForTimeout(80);
    r = await page.evaluate(() => ({ n:window._nombre.slice(), p:window._preg() }));
    chk('5 · Esc no devuelve nada', r.n.join()==='MIA PLAZA' && !r.p, r);

    /* 6. avisoVentana */
    r = await page.evaluate(() => { var siguio=false; avisoVentana('ℹ️ Listo.\nSe guardó.'); siguio=true; return { siguio, p:window._preg() }; });
    chk('6 · avisoVentana: un solo botón «Entendido» y no frena lo de después', r.siguio && r.p && r.p.no===null && r.p.si==='Entendido' && r.p.tit==='Listo.', r);
    await page.click('.preg-si'); await page.waitForTimeout(60);
    chk('6 · «Entendido» la cierra', !(await page.evaluate(() => window._preg())));
    chk('2-6 · ninguna ventanita del navegador con la bandera', page._dialogos.length===0, page._dialogos);
    await ctx.close(); }

  /* 7. El Modo práctica */
  { const { ctx, page } = await nueva(true);
    await page.evaluate(() => practicaEntrar()); await page.waitForTimeout(60);
    let r = await page.evaluate(() => window._preg());
    chk('7 · Modo práctica: la ventana del panel con sus botones', r && r.tit==='¿Prender el modo práctica en esta pestaña?' && r.no==='No, seguir normal' && r.si==='🧪 Prender la práctica' && r.lineas.length===4, r);
    await page.click('.preg-no'); await page.waitForTimeout(80);
    r = await page.evaluate(() => ({ s:sessionStorage.getItem('me_practica'), p:window._preg() }));
    chk('7 · «No, seguir normal» no prende nada', r.s===null && !r.p, r);
    await page.evaluate(() => practicaEntrar()); await page.waitForTimeout(60);
    await Promise.all([ page.waitForNavigation({ waitUntil:'load' }).catch(()=>{}), page.click('.preg-si') ]); await page.waitForTimeout(300);
    r = await page.evaluate(() => ({ s:sessionStorage.getItem('me_practica'), pr:!!window.PRACTICA }));
    chk('7 · «Prender la práctica» prende (la pestaña vuelve a abrir en práctica)', r.s==='1' && r.pr, r);
    chk('7 · sin ventanitas del navegador', page._dialogos.length===0, page._dialogos);
    await ctx.close(); }

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
