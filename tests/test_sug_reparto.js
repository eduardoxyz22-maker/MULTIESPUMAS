/* 🚚 (24/10, dueño: «S1, S2, S4, S6») La caja «Sin camión»: reparto parejo (S1), por grupos de zona (S2), la zona de un pin sin zona
   escrita (S4) y el mapita (S6, solo que se arma la caja: el mapa no se baja en las pruebas). En su captura proponía la Carry para los 14.
   Se corre:  node tests/test_sug_reparto.js */
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
    UNLOCKED=true; NX_SUG_DIA='manana'; NX_SUG_CAMBIO={};
    var f=proximoDiaEntrega(), L=[_lin('CH1201|TITANIO ICE|160x190',1,{chk:'ok'})], ps=[], n=0;
    var mk=function(z, mp, ex){ n++; return _ped('q'+n, f, 'AM', L, Object.assign({ cliente:'CLI '+n+' '+(z||'SIN'), zona:z, maps:mp||'' }, ex||{})); };
    var NOR='https://www.google.com/maps?q=-17.75,-63.17';
    for(var i=0;i<4;i++) ps.push(mk('Norte', NOR));
    for(i=0;i<3;i++) ps.push(mk('Centro', 'https://www.google.com/maps?q=-17.783,-63.182'));
    for(i=0;i<2;i++) ps.push(mk('Plan 3000', ''));
    ps.push(mk('', 'https://www.google.com/maps?q=-17.751,-63.171', { cliente:'PIN SIN ZONA' }));
    ps.push(mk('', '', { cliente:'NADA DE NADA' }));
    // de antes, con pin y zona: de acá se aprende la zona del pin
    for(i=0;i<3;i++) ps.push(_ped('v'+i, '2026-10-10', 'AM', L, { cliente:'VIEJO '+i, zona:'Norte', maps:'https://www.google.com/maps?q=-17.752,-63.172', entregado:true }));
    await _cargar(ps, _stock(function(s){ s.c.u[_K]=10; }));
    var D=nxSugDatos(f), de=function(c){ return D.lista.filter(function(s){ return s.p.cliente===c; })[0]; };
    var porGrupo={}; D.lista.forEach(function(s){ (porGrupo[s.zt]||(porGrupo[s.zt]={})); porGrupo[s.zt][s.v]=(porGrupo[s.zt][s.v]||0)+1; });
    var out={ porGrupo:porGrupo, pin:de('PIN SIN ZONA'), nada:de('NADA DE NADA'), grupos:D.grupos.map(function(g){ return g.zt+':'+g.items.length; }),
      usados:Object.keys(D.lista.reduce(function(a,s){ a[s.v]=1; return a; },{})) };
    nxSugPintar(); var el=document.getElementById('nx-sug');
    out.cajas=el.querySelectorAll('.nx-sug-grupo').length; out.aviso=(el.querySelector('.nx-sug-aviso')||{}).textContent||''; out.mapa=!!el.querySelector('#nx-sug-mapa');
    out.txtPin=(document.getElementById('nx-sug-q10')||{}).textContent||'';
    var gN=D.grupos.filter(function(g){ return g.zt==='Norte'; })[0];
    nxSugCambiarGrupo(gN.k, 'Foton encarpado');
    var D2=nxSugDatos(f); out.cambiado=D2.lista.filter(function(s){ return s.g===gN.k; }).every(function(s){ return s.v==='Foton encarpado' && s.por==='elegido a mano'; });
    NX_SUG_CAMBIO={};
    nxSugAceptarGrupo(gN.k);
    out.aceptados=ps.filter(function(p){ return p.zona==='Norte' && p.fecha===f || p.cliente==='PIN SIN ZONA'; }).map(function(p){ return findById(p.id).vehiculo+'/'+findById(p.id).chofer; });
    out.resto=nxSugDatos(f).lista.length;
    return out;
  });
  chk('S2 · cada zona en UN solo camión', Object.keys(r.porGrupo).every(k=>Object.keys(r.porGrupo[k]).length===1), r.porGrupo);
  chk('S1 · se reparte entre los camiones que trabajan (no todo a uno) y nunca al de insumos', r.usados.length>=3 && r.usados.indexOf('Foton insumo')<0, r.usados);
  chk('S1 · una zona vecina (Centro, a ~4 km) no se suma al camión de Norte: va a otro', Object.keys(r.porGrupo.Centro)[0]!==Object.keys(r.porGrupo.Norte)[0], r.porGrupo);
  chk('S2 · el grupo más grande primero (Norte con 5) y «sin zona ni ubicación» al final', r.grupos[0]==='Norte:5' && /Sin zona ni ubicación:1$/.test(r.grupos[r.grupos.length-1]), r.grupos);
  chk('S4 · un pin sin zona escrita toma la zona de los pedidos de al lado (Norte) y va con ellos', r.pin && r.pin.deMapa==='Norte' && r.pin.zt==='Norte', r.pin);
  chk('S4 · sin zona ni pin: se marca «sin ubicación» y se avisa', r.nada && r.nada.sinUbic && /sin zona ni ubicación/.test(r.aviso), { nada:r.nada&&r.nada.sinUbic, aviso:r.aviso });
  chk('la caja muestra un bloque por grupo y el lugar del mapa', r.cajas===r.grupos.length && r.mapa, { cajas:r.cajas, mapa:r.mapa });
  chk('cambiar el camión del grupo cambia a todos sus pedidos', r.cambiado, r.cambiado);
  chk('«Aceptar los 5» pone el camión y su chofer a todo el grupo', r.aceptados.length===5 && r.aceptados.every(x=>x===r.aceptados[0] && !/^\//.test(x)), r.aceptados);
  chk('quedan los otros grupos sin camión', r.resto===6, r.resto);
  chk('sin errores en la página', errs.length===0, errs);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
