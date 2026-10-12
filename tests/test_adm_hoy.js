/* 📅 HOY / MAÑANA EN LA TABLA DE ADMINISTRACIÓN (12/10). El dueño: «ahí falta el hoy / mañana para filtrar la tabla».
   Lo que cuida: dos chips después de «Todos»; «Hoy» = entrega de hoy; «Mañana» = el próximo día con camión (el sábado dice
   «Lunes dd/mm»); cuentan y filtran aunque el período elegido sea otro mes (el 31, mañana es del mes siguiente); tocar dos
   veces vuelve a «Todos». Reloj clavado. Datos sintéticos.
   Se corre:  node tests/test_adm_hoy.js   (desde la raíz) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const ARCH='file://'+(process.env.PEDIDOS||path.resolve('pedidos.html'));
async function abrir(browser, ahora){
  const page = await browser.newPage({ viewport:{ width:1280, height:900 }, timezoneId:'America/La_Paz' });
  page.on('dialog', d => d.accept());
  await page.clock.setFixedTime(new Date(ahora));
  await page.route(/^https?:/, r => r.abort());
  await page.goto(ARCH, { waitUntil:'load' }); await page.waitForTimeout(700);
  return page;
}
const preparar = (fechas) => {
  var c=document.getElementById('conn-form'); if(c) c.style.display='none'; UNLOCKED=true;
  document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block';
  CARGA_GEN++; CARGA_ESTADO='ok'; apiList=function(){ return Promise.resolve(STATE.slice()); };
  STATE=fechas.map(function(f,i){ return { id:'h'+i, fecha:f, oc:'10-'+(100+i), vendedor:'Carola Chavez', cliente:'CLIENTE '+i, productos:[{desc:'TITANIO LATEX',medida:'140x190',cant:1}], turno:'AM', pagado:false, saldo:100, ts:1 }; });
  window.leer=function(){
    var chips=[].map.call(document.querySelectorAll('#adm-chips .qchip'), function(b){ return b.textContent.replace(/\s+/g,' ').trim(); });
    return { chips:chips, filas:admFilter().map(function(p){ return p.fecha; }) };
  };
  showView('admin'); renderAdmin();
};
const leer = () => {
  var chips=[].map.call(document.querySelectorAll('#adm-chips .qchip'), function(b){ return b.textContent.replace(/\s+/g,' ').trim(); });
  return { chips:chips, filas:admFilter().map(function(p){ return p.fecha; }) };
};
(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  let page = await abrir(browser, '2026-10-14T10:00:00-04:00');   // miércoles
  await page.evaluate(preparar, ['2026-10-14','2026-10-14','2026-10-15','2026-10-16','2026-10-13']);
  let r = await page.evaluate(() => leer());
  chk('los chips «📅 Hoy 2» y «➡️ Mañana 1» van después de «Todos»', /^Todos/.test(r.chips[0]) && r.chips[1]==='📅 Hoy 2' && r.chips[2]==='➡️ Mañana 1', r.chips);
  r = await page.evaluate(() => { setQuick('hoy'); return leer(); });
  chk('«Hoy» deja solo las entregas de hoy', r.filas.length===2 && r.filas.every(f => f==='2026-10-14'), r.filas);
  r = await page.evaluate(() => { setQuick('manana'); return leer(); });
  chk('«Mañana» deja solo las del próximo día con camión', JSON.stringify(r.filas)==='["2026-10-15"]', r.filas);
  r = await page.evaluate(() => { setQuick('manana'); return { q:QUICK_FILTER, n:admFilter().length }; });
  chk('tocar otra vez vuelve a «Todos»', r.q==='' && r.n===5, r);
  await page.close();

  page = await abrir(browser, '2026-10-31T10:00:00-04:00');   // sábado 31: mañana es domingo → el lunes 02/11 (feriado) → martes 03/11
  await page.evaluate(preparar, ['2026-10-31','2026-11-03','2026-11-02','2026-10-20']);
  r = await page.evaluate(() => { var s=document.querySelector('[data-val="mes"]'); if(s) s.click(); document.getElementById('adm-mes').value='2026-10'; renderAdmin(); setQuick('manana'); return Object.assign(leer(), { esp:proximoDiaEntrega() }); });
  chk('el sábado 31 dice el día con nombre («Martes 03/11», saltando domingo y el feriado)', r.chips.some(c => /^➡️ Martes 03\/11 1$/.test(c)), { chips:r.chips, esp:r.esp });
  chk('con el filtro en octubre, «Mañana» igual muestra la entrega de noviembre', JSON.stringify(r.filas)==='["2026-11-03"]', r.filas);
  await page.close();
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e => { console.error(e); process.exit(1); });
