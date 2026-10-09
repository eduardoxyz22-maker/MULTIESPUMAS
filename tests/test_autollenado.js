/* 🚫 EL NAVEGADOR NO ESCRIBE LA PLATA SOLO (§4jb, 09/10; dueño: «¿por qué se pone recargo por entrega si no llené nada?»).
   El autocompletar de Chrome llena los campos que cree de una dirección o contacto guardado aunque digan autocomplete="off".
   1. Lo tipeado a mano en «Recargo por entrega» se queda.
   2. Si el campo queda marcado como autocompletado (`:autofill`), se borra y avisa; «A cuenta» vuelve a 0.
   3. Un campo que no es de plata (Cliente) autocompletado no se toca.
   Se corre:  node tests/test_autollenado.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e))):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{ width:1180, height:820 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e=>errores.push(e.message));
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.setFixedTime(new Date('2026-10-06T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
  await page.evaluate(()=>{ try{ CARGA_GEN++; CARGA_ESTADO='ok'; clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){} showView('form'); resetForm(); });

  await page.click('#f-envio'); await page.keyboard.type('150'); await page.waitForTimeout(150);
  chk('1. lo tipeado a mano en el recargo se queda', await page.inputValue('#f-envio')==='150');

  // simula el autocompletar: el navegador marca el campo como :autofill y dispara input
  const auto = (id, v) => page.evaluate(([id,v])=>{
    var el=document.getElementById(id), m=el.matches.bind(el);
    el.matches=function(s){ return (s===':autofill'||s===':-webkit-autofill') ? true : m(s); };
    el.value=v; el.dispatchEvent(new Event('input',{bubbles:true}));
  }, [id,v]);
  await auto('f-envio','1023'); await page.waitForTimeout(150);
  const r2 = await page.evaluate(()=>({ v:document.getElementById('f-envio').value, pend:getComputedStyle(document.getElementById('f-envio-pend')).display, t:(document.getElementById('toast')||document.body).innerText }));
  chk('2a. el recargo autocompletado (1023) se borra y no queda «por cobrar»', r2.v==='' && r2.pend==='none', r2);
  chk('2b. …y avisa que lo escribió el navegador', /navegador escribió solo «1023» en Recargo por entrega/.test(r2.t), r2.t.slice(0,200));
  await auto('f-acuenta','500'); await page.waitForTimeout(150);
  chk('2c. «A cuenta» autocompletado vuelve a 0', await page.inputValue('#f-acuenta')==='0');
  await auto('f-cliente','Juan Perez'); await page.waitForTimeout(150);
  chk('3. el cliente autocompletado no se toca (no es plata)', await page.inputValue('#f-cliente')==='Juan Perez');
  chk('4. ningún error de JavaScript', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
