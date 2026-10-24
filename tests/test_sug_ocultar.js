/* 🙈 (24/10, dueño: «pon botón ocultar esto, no lo usan creo») La caja «Sin camión para…» (A1) se esconde por aparato y deja una
   línea con cuántos esperan camión y «Mostrar». Se corre:  node tests/test_sug_ocultar.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,300)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_u2_turno.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));
(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message));
  await page.clock.setFixedTime(new Date('2026-10-23T15:10:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');
  const r = await page.evaluate(async()=>{
    try{ localStorage.removeItem('me_sug_oculto'); }catch(e){}
    UNLOCKED=true;
    var f=proximoDiaEntrega();
    await _cargar([_ped('s1',f,'AM',[_lin('CH1201|TITANIO ICE|160x190',1,{chk:'ok'})],{}), _ped('s2',f,'PM',[_lin('CH1201|TITANIO ICE|160x190',1,{chk:'ok'})],{})], _stock(function(s){ s.c.u[_K]=10; }));
    var el=document.getElementById('nx-sug'), out={};
    nxSugPintar(); out.caja=!!el.querySelector('.nx-sug-lista'); out.boton=!!el.querySelector('.nx-sug-ocultar');
    el.querySelector('.nx-sug-ocultar').click();
    out.oculta=!el.querySelector('.nx-sug-lista'); out.linea=(el.querySelector('.nx-sug-min')||{}).textContent||''; out.ls=localStorage.getItem('me_sug_oculto');
    nxSugPintar(); out.sigue=!el.querySelector('.nx-sug-lista');
    el.querySelector('.nx-sug-min button').click(); out.vuelve=!!el.querySelector('.nx-sug-lista'); out.ls2=localStorage.getItem('me_sug_oculto');
    return out;
  });
  chk('la caja se ve con su botón «🙈 Ocultar»', r.caja && r.boton, r);
  chk('«Ocultar» la esconde y deja la línea «2 sin camión» con «Mostrar»', r.oculta && /Sin camión: 2 para el/.test(r.linea) && /Mostrar/.test(r.linea) && r.ls==='1', r);
  chk('se queda escondida al repintar', r.sigue, r);
  chk('«Mostrar» la vuelve a abrir', r.vuelve && r.ls2===null, r);
  chk('sin errores en la página', errs.length===0, errs);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
