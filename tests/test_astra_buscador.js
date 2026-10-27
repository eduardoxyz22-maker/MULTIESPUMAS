/* 🔎 EL BUSCADOR Ctrl + K CON EL TECLADO (§4nl, 27/10, auditoría de Astra A13).
   El buscador (§4ni, la 1: `palAbrir`) manejaba el teclado solo en el campo:
   · Tab sacaba el foco del buscador hacia el encabezado y las pestañas de atrás, con el buscador abierto;
   · Escape desde el botón «Esc» no cerraba nada;
   · abierto encima de otra ventana, Escape en el campo cerraba LAS DOS (seguía hasta el Escape de las ventanas);
   · el campo, la lista y la opción elegida no estaban unidos (aria-controls / aria-activedescendant).
   Lo que cuida esta prueba:
   1. Unidos: el campo dice qué lista maneja y cuál es la opción elegida; con ↓ cambia; sin resultados no apunta a nada.
   2. Tab y Mayús+Tab dan la vuelta ADENTRO del buscador (campo ↔ «Esc»), también tocando un lugar sin botón.
   3. Escape cierra desde el campo, desde «Esc» y desde cualquier parte del buscador, y el foco vuelve a donde estaba.
   4. Encima de otra ventana: Escape cierra SOLO el buscador (la ventana sigue, con el foco adentro); Tab no se va a la ventana; las
      flechas de costado en «Esc» no pasan la ficha de atrás.
   5. Lo de siempre: Enter abre, Ctrl+K cierra, tocar afuera cierra.
   Datos inventados. Reloj clavado: martes 27/10/2026 10:00 de Bolivia.   Se corre:  node tests/test_astra_buscador.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const HOY = '2026-10-27T10:00:00-04:00';

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  loadFromServer=function(){};
  STATE=[
    { id:'b1', cliente:'ROSA INVENTADA', oc:'10-214', nota:'21183', celular:'70000001', zona:'Norte', vendedor:'Carola Chavez', fecha:'2026-10-28', turno:'AM', productos:[{desc:'TITANIO LATEX',medida:'140x190',cant:1}] },
    { id:'b2', cliente:'ROSARIO DE PRUEBA', oc:'10-219', nota:'21190', celular:'70000002', zona:'Norte', vendedor:'Mirian Salazar', fecha:'2026-10-29', turno:'PM', productos:[{desc:'SOMIER ORO',medida:'160x200',cant:1}] } ];
  window.__abrio=[]; window.showMisModal=function(id){ __abrio.push('mis:'+id); };
}
/* dónde está el foco: en el buscador, en la ventana de atrás o en otro lado */
function FOCO(){ var a=document.activeElement, ov=document.getElementById('pal-ov'), box=document.getElementById('modal-box');
  return { id:a?(a.id||a.className||a.tagName):'', enPal:!!(ov && ov.contains(a)), enVentana:!!(box && box.contains(a)), pal:!!ov, ventana:document.getElementById('modal').classList.contains('on') }; }

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1300, height:800 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r=>r.abort());
  const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.dismiss());
  await page.clock.setFixedTime(new Date(HOY));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
  await page.evaluate(PREPARAR);
  /* cada paso arranca con el buscador cerrado (si un paso falla, el siguiente no hereda el buscador abierto) */
  const abrirPal = async () => { await page.evaluate(() => { if(document.getElementById('pal-ov')) palCerrar(false); }); await page.keyboard.press('Control+k'); await page.waitForTimeout(150); };
  const enfocar = async sel => { await page.evaluate(s => { var e=document.querySelector(s); if(e) e.focus(); }, sel); };
  const foco = () => page.evaluate(FOCO);

  // ═══ 1 · Campo, lista y opción unidos ═══
  console.log('\n── 1. El campo, la lista y la opción elegida, unidos ──');
  await enfocar('#tab-mis');
  await abrirPal();
  await page.fill('#pal-in', 'ros'); await page.waitForTimeout(150);
  let r = await page.evaluate(() => { var i=document.getElementById('pal-in'), lst=document.getElementById(i.getAttribute('aria-controls')||'x'), ad=i.getAttribute('aria-activedescendant'), op=ad?document.getElementById(ad):null, on=document.querySelector('#pal-res .pal-it.on');
    return { ctrl:i.getAttribute('aria-controls'), rolLista:lst?lst.getAttribute('role'):null, ad:ad, esLaOn:!!op && op===on, rolOp:op?op.getAttribute('role'):null, sel:op?op.getAttribute('aria-selected'):null, rol:i.getAttribute('role'), exp:i.getAttribute('aria-expanded') }; });
  chk('el campo dice qué lista maneja (aria-controls → el listbox de resultados)', r.ctrl==='pal-res' && r.rolLista==='listbox', r);
  chk('…y cuál es la opción elegida (aria-activedescendant → la opción marcada, role=option, aria-selected)', r.esLaOn && r.rolOp==='option' && r.sel==='true', r);
  chk('…como un combobox abierto', r.rol==='combobox' && r.exp==='true', r);
  const ad0 = r.ad;
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(80);
  r = await page.evaluate(() => { var i=document.getElementById('pal-in'), ad=i.getAttribute('aria-activedescendant'), op=ad?document.getElementById(ad):null; return { ad:ad, esLaOn:!!op && op===document.querySelector('#pal-res .pal-it.on'), foco:document.activeElement.id }; });
  chk('con ↓ la opción elegida cambia y el campo la sigue (el foco no se mueve del campo)', r.ad && r.ad!==ad0 && r.esLaOn && r.foco==='pal-in', r);
  await page.fill('#pal-in', 'xyzzyqq'); await page.waitForTimeout(150);
  r = await page.evaluate(() => document.getElementById('pal-in').getAttribute('aria-activedescendant'));
  chk('sin resultados, no apunta a ninguna opción', !r, r);

  // ═══ 2 · Tab no se sale ═══
  console.log('\n── 2. Tab da la vuelta adentro ──');
  await page.fill('#pal-in', ''); await page.waitForTimeout(100);
  const pasos=[];
  for(let i=0;i<5;i++){ await page.keyboard.press('Tab'); await page.waitForTimeout(40); pasos.push(await foco()); }
  chk('5 × Tab: el foco nunca sale del buscador (antes se iba al encabezado y las pestañas)', pasos.every(x=>x.enPal), pasos.map(x=>x.id));
  chk('…va del campo a «Esc» y vuelve al campo', pasos[0].id==='pal-x' && pasos[1].id==='pal-in', pasos.map(x=>x.id));
  await enfocar('#pal-in');
  await page.keyboard.press('Shift+Tab'); await page.waitForTimeout(40);
  r = await foco();
  chk('Mayús+Tab desde el campo va a «Esc» (no a la página de atrás)', r.enPal && r.id==='pal-x', r);
  await page.click('.pal-pie'); await page.waitForTimeout(60);
  await page.keyboard.press('Tab'); await page.waitForTimeout(40);
  r = await foco();
  chk('tocando un lugar sin botón del buscador y Tab, sigue adentro', r.enPal && r.pal, r);

  // ═══ 3 · Escape cierra desde cualquier parte y devuelve el foco ═══
  console.log('\n── 3. Escape desde cualquier parte ──');
  await enfocar('.pal-x'); await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  r = await foco();
  chk('Escape con el foco en «Esc» cierra el buscador (antes no hacía nada)', !r.pal, r);
  chk('…y el foco vuelve a donde estaba antes de abrir (la pestaña «Mis pedidos»)', r.id==='tab-mis', r);
  await enfocar('#tab-mis'); await abrirPal();
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  r = await foco();
  chk('Escape en el campo cierra, como siempre, y el foco vuelve a la pestaña', !r.pal && r.id==='tab-mis', r);
  await abrirPal(); await page.click('.pal-pie'); await page.waitForTimeout(60);
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  r = await foco();
  chk('Escape después de tocar un lugar sin botón del buscador también cierra', !r.pal, r);

  // ═══ 4 · Encima de otra ventana ═══
  console.log('\n── 4. Encima de otra ventana ──');
  /* la ventana de atrás, abierta (si un paso anterior la cerró, se vuelve a abrir) y con el foco en su botón */
  const ventana = async () => { await page.evaluate(() => { if(document.getElementById('pal-ov')) palCerrar(false);
    if(!document.getElementById('modal').classList.contains('on')) openModal('<div class="modal-h"><h3>Ventana de atrás</h3><button class="modal-x" onclick="closeModal()">✕</button></div><div class="modal-b"><button id="vx-b">Un botón</button></div>');
    document.getElementById('vx-b').focus(); }); await page.waitForTimeout(80); };
  await ventana();
  await abrirPal();
  r = await foco();
  chk('Ctrl+K encima de una ventana abre el buscador con el cursor en el campo', r.pal && r.id==='pal-in' && r.ventana, r);
  const pasos2=[];
  for(let i=0;i<4;i++){ await page.keyboard.press('Tab'); await page.waitForTimeout(40); pasos2.push(await foco()); }
  chk('Tab no se va a la ventana de atrás (su propio Tab no se mete)', pasos2.every(x=>x.enPal && !x.enVentana), pasos2.map(x=>x.id));
  await ventana(); await abrirPal();
  await page.keyboard.press('Escape'); await page.waitForTimeout(120);
  r = await foco();
  chk('Escape en el campo cierra SOLO el buscador: la ventana de atrás sigue abierta (antes cerraba las dos)', !r.pal && r.ventana, r);
  chk('…y el foco vuelve adentro de la ventana, al botón donde estaba', r.enVentana && r.id==='vx-b', r);
  await ventana(); await abrirPal(); await enfocar('.pal-x'); await page.keyboard.press('Escape'); await page.waitForTimeout(120);
  r = await foco();
  chk('desde «Esc», lo mismo: cierra el buscador y la ventana sigue', !r.pal && r.ventana, r);
  await ventana(); await abrirPal(); await page.click('.pal-pie'); await page.waitForTimeout(60); await page.keyboard.press('Escape'); await page.waitForTimeout(120);
  r = await foco();
  chk('tocando un lugar sin botón del buscador y Escape: cierra el buscador y la ventana sigue', !r.pal && r.ventana, r);
  // las flechas de costado de la ficha (◀ ▶) no se mueven desde el buscador
  await ventana();
  await page.evaluate(() => { document.getElementById('modal-box').classList.add('fl-ficha'); window.__ir=[]; window.fichaIr=function(d){ __ir.push(d); }; });
  await abrirPal(); await enfocar('.pal-x'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(60);
  r = await page.evaluate(() => ({ ir:__ir.slice(), pal:!!document.getElementById('pal-ov') }));
  chk('con el foco en «Esc», ← → no pasan la ficha de atrás', r.ir.length===0 && r.pal, r);
  await page.keyboard.press('Escape'); await page.waitForTimeout(80);
  await page.evaluate(() => closeModal());

  // ═══ 5 · Lo de siempre ═══
  console.log('\n── 5. Lo de siempre ──');
  await abrirPal(); await page.fill('#pal-in', 'rosa inventada'); await page.waitForTimeout(150);
  await page.keyboard.press('Enter'); await page.waitForTimeout(120);
  r = await page.evaluate(() => ({ abrio:__abrio.slice(), pal:!!document.getElementById('pal-ov') }));
  chk('Enter abre el pedido elegido y cierra el buscador', r.abrio.join()==='mis:b1' && !r.pal, r);
  await abrirPal(); await page.keyboard.press('Control+k'); await page.waitForTimeout(100);
  chk('Ctrl+K con el buscador abierto lo cierra', !(await foco()).pal);
  await abrirPal(); await page.mouse.click(5, 790); await page.waitForTimeout(100);
  chk('tocar afuera lo cierra', !(await foco()).pal);
  await abrirPal(); await page.click('.pal-x'); await page.waitForTimeout(100);
  chk('el botón «Esc» con el mouse lo cierra', !(await foco()).pal);

  chk('sin errores de JavaScript', !errores.length, errores.slice(0,3));
  await browser.close();
  console.log(`\n${PASS} bien · ${FAIL} mal`);
  process.exit(FAIL ? 1 : 0);
})();
