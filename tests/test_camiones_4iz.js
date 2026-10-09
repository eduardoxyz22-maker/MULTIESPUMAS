/* 🚚 CAMIONES CON EL MOTOR PRENDIDO (§4iz, 09/10; dueño: «B y C, H3»). Solo miran: los lugares son los de siempre.
   1. Arriba (H3): un camión dibujado (no el emoji) con el nombre, humo y ruedas que giran: entra, frena en el medio y sigue a la izquierda.
   2. Formulario: el camión va por la ciudad (edificios, árboles y calle que se mueven) con humo y ruedas, y las cajas caen al entrar.
   3. Un pedido nuevo de otro en el mismo día y turno: cae solo esa caja (todas, solo con otro día o turno).
   4. Sin errores.
   Se corre:  node tests/test_camiones_4iz.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,extra)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, extra!=null?('· '+(typeof extra==='string'?extra:JSON.stringify(extra))):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{ width:390, height:844 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e=>errores.push(e.message));
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.setFixedTime(new Date('2026-10-06T10:00:00-04:00'));   // martes
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  const r1 = await page.evaluate(()=>{
    var cam=document.querySelector('.h-camion'), svg=cam && cam.querySelector('svg'), cs=getComputedStyle(cam);
    return { svg:!!svg, txt:svg?svg.textContent:'', emoji:cam.textContent.indexOf('🚚')>=0, anim:cs.animationName,
      humo:cam.querySelectorAll('.hc-humo circle').length, ruedas:cam.querySelectorAll('.hc-rayos').length,
      gira:cam.querySelector('.hc-rayos') && getComputedStyle(cam.querySelector('.hc-rayos')).animationName, alto:cam.getBoundingClientRect().height };
  });
  chk('1a. arriba es un camión dibujado con el nombre, no el emoji', r1.svg && /MULTIESPUMAS/.test(r1.txt) && !r1.emoji, r1);
  chk('1b. …con humo y tres ruedas que giran', r1.humo===3 && r1.ruedas===3 && /hc-gira/.test(r1.gira), r1);
  chk('1c. …cruza la pantalla y es más grande que el emoji (≥ 45 px de alto en el celular)', /h-viaje/.test(r1.anim) && r1.alto>=45, r1);
  const css = await page.evaluate(()=>{ for (const s of document.styleSheets){ try{ for (const k of s.cssRules){ if(k.name==='h-viaje') return k.cssText; } }catch(e){} } return ''; });
  chk('1d. (H3) frena en el medio: el viaje se queda quieto entre el 30% y el 62%', /30%,\s*62%/.test(css) && /calc\(50% - 70px\)/.test(css), css);

  const r2 = await page.evaluate(()=>{
    try{ CARGA_GEN++; CARGA_ESTADO='ok'; clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    var f=diasAdelante(2);   // otro día que el que el formulario abre por defecto: el camión entra de nuevo
    STATE=[1,2,3].map(function(i){ return { id:'c'+i, oc:'10-00'+i, cliente:'C'+i, vendedor:'Mirian Salazar', fecha:f, turno:'AM', productos:[{desc:'X',cant:1}] }; });
    var el=document.getElementById('f-fecha'); el.value=f; el.dispatchEvent(new Event('change',{bubbles:true}));
    try{ segSet('f-turno','AM'); }catch(e){}
    try{ renderCupoForm(); }catch(e){}
    var c=document.getElementById('fx-camion');
    return { visible:!c.hidden, ciudad:!!c.querySelector('.fx-ciudad'), arboles:!!c.querySelector('.fx-arboles'), calle:!!c.querySelector('.fx-calle'),
      humo:c.querySelectorAll('.fx-humo circle').length, rayos:c.querySelectorAll('.fx-rayos').length,
      caen:c.querySelectorAll('.fx-cae').length, llenos:c.querySelectorAll('.fx-slot:not(.tuyo)[stroke="#00B5AD"]').length, tuyo:c.querySelectorAll('.fx-slot.tuyo').length,
      anCiudad:getComputedStyle(c.querySelector('.fx-ciudad')).animationName };
  });
  chk('2a. el camión del formulario va por la ciudad (edificios, árboles y calle que se mueven)', r2.visible && r2.ciudad && r2.arboles && r2.calle && /fxCiudad/.test(r2.anCiudad), r2);
  chk('2b. …con humo y cuatro ruedas que giran', r2.humo===3 && r2.rayos===4, r2);
  chk('2c. …y al entrar caen las cajas de los 3 pedidos y la tuya (4)', r2.caen===4 && r2.llenos===3 && r2.tuyo===1, r2);

  const r3 = await page.evaluate(()=>{
    STATE.push({ id:'c4', oc:'10-004', cliente:'C4', vendedor:'Mirian Salazar', fecha:STATE[0].fecha, turno:'AM', productos:[{desc:'X',cant:1}] });
    renderCupoForm();
    var c=document.getElementById('fx-camion');
    return { caen:c.querySelectorAll('.fx-cae').length, llenos:c.querySelectorAll('.fx-slot:not(.tuyo)[stroke="#00B5AD"]').length };
  });
  chk('3. otro pedido el mismo día y turno: cae solo la caja nueva (no se vuelven a tirar todas)', r3.llenos===4 && r3.caen===1, r3);
  chk('4. ningún error de JavaScript', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
