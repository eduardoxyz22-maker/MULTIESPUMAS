/* 🤖 (24/10, dueño: «lo del bot de administración mejor que se muestre en una pestaña nueva de solo BOT, y solo se habilite cuando se coloca
   la clave de administración o ingresan como logística»; 24/10 tarde: *«logística, Eduardo o administración… o ponen la clave»*. Así vamos liberando espacio y limpiando administración»).
   Se corre:  node tests/test_bot_tab.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,300)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{ width:1280, height:900 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('dialog', d=>d.accept());
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
  const r=await page.evaluate(()=>{
    try{ localStorage.clear(); }catch(e){}
    UNLOCKED=false; WA_RESP=[{ w:'w1', txt:'¿a qué hora llegan?', id:'', at:'' }, { w:'w2', txt:'gracias', id:'', at:'' }];
    var t=document.getElementById('tab-bot'), out={};
    botTabPintar(); out.oculta=t.hidden;
    showView('bot'); out.sinPermiso=document.getElementById('view-admin').classList.contains('active') && !document.getElementById('view-bot').classList.contains('active');
    out.enBot=!!document.querySelector('#view-bot #wa-resp-adm') && !document.querySelector('#view-admin #wa-resp-adm');
    quienElegir('', 'logistica'); out.log=!t.hidden; out.badge=(t.querySelector('.nx-tb')||{}).textContent||'';
    showView('bot'); out.abre=document.getElementById('view-bot').classList.contains('active') && document.getElementById('tab-bot').classList.contains('active');
    out.lista=document.querySelectorAll('#wa-resp-adm .wa-resp-c').length;
    quienElegir('', 'admin'); out.admin=!t.hidden;
    quienElegir('Carola Chavez'); out.vendSinVer=t.hidden && document.getElementById('view-admin').classList.contains('active');
    quienElegir('Eduardo Añez'); out.eduardo=!t.hidden;
    quienElegir('Carola Chavez'); localStorage.setItem('me_adm_dev','1'); botTabPintar(); out.compuAdm=t.hidden;
    UNLOCKED=true; botTabPintar(); out.clave=!t.hidden;
    WA_RESP=[]; showView('bot'); out.vacio=!document.getElementById('bot-vacio').hidden;
    return out;
  });
  chk('sin la clave ni logística, la pestaña Bot no está', r.oculta, r);
  chk('y entrar por la fuerza lleva a Administración', r.sinPermiso, r);
  chk('las respuestas al bot viven en la pestaña Bot, no en Administración', r.enBot, r);
  chk('entrando como Logística aparece, con el número de respuestas sin atender', r.log && r.badge==='2', r);
  chk('abre la pestaña con las respuestas', r.abre && r.lista===2, r);
  chk('entrando como «Administración» aparece (dueño, 24/10)', r.admin, r);
  chk('una vendedora no la ve (y si estaba ahí, sale a Administración)', r.vendSinVer, r);
  chk('Eduardo la ve (dueño, 24/10)', r.eduardo, r);
  chk('⚠️ la compu donde alguna vez se puso la clave (me_adm_dev) ya NO alcanza: hace falta la clave de esta visita', r.compuAdm, r);
  chk('con la clave de Administración aparece', r.clave, r);
  chk('sin respuestas dice «✅ No hay respuestas de clientes esperando»', r.vacio, r);
  chk('sin errores en la página', errs.length===0, errs);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
