/* 📅 (27/11, dueño: «¿dónde sale el aviso al vendedor que se modificó el turno o la fecha de entrega?» → «solo en el panel por el momento»)
   «TE CAMBIARON EL DÍA O EL TURNO» en «Para hacer» de la vendedora y en Bloki: el último renglón de `fH` de un pedido suyo sin entregar, de los
   últimos 7 días, hecho por OTRA persona. «✓ Visto» lo saca en este aparato; un cambio nuevo vuelve a avisar.
   Se corre:  node tests/test_cambio_dia_vendedora.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_u2_turno.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));
(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{ width:1440, height:900 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('dialog', d=>d.accept());
  await page.clock.setFixedTime(new Date('2026-11-27T12:00:00-04:00'));   // viernes
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');
  await page.evaluate(async()=>{
    try{ localStorage.removeItem('me_fcv_visto'); }catch(e){}
    var L=function(ex){ return [_lin('CH1201|TITANIO ICE|160x190',1,Object.assign({ chk:'ok' }, ex||{}))]; };
    var fh=function(de, a, q, dia, hora){ return [{ t:_ts(dia||'2026-11-27', hora||'11:00:00'), de:de, a:a, q:q, d:'📅 Reprogramar' }]; };
    window._SRV.pedidos=[
      _ped('k1','2026-11-27','PM',L({ fH:fh('2026-11-27|AM','2026-11-27|PM','Juan Pablo Paredes') }),{ cliente:'CLIENTE TURNO', vendedor:'Isabel Robledo' }),
      _ped('k2','2026-12-01','AM',L({ fH:fh('2026-11-28|AM','2026-12-01|AM','Logística · Ernesto') }),{ cliente:'CLIENTE DIA', vendedor:'Isabel Robledo' }),
      _ped('k3','2026-12-01','AM',L({ fH:fh('2026-11-28|AM','2026-12-01|AM','Isabel Robledo') }),{ cliente:'CLIENTE PROPIO', vendedor:'Isabel Robledo' }),
      _ped('k4','2026-12-01','AM',L({ fH:fh('2026-11-28|AM','2026-12-01|AM','Administración','2026-11-15') }),{ cliente:'CLIENTE VIEJO', vendedor:'Isabel Robledo' }),
      _ped('k5','2026-11-27','PM',L({ fH:fh('2026-11-27|AM','2026-11-27|PM','Administración') }),{ cliente:'CLIENTE ENTREGADO', vendedor:'Isabel Robledo', entregado:true }),
      _ped('k6','2026-12-02','AM',L({ fH:fh('2026-11-28|AM','2026-12-01|AM','Administración') }),{ cliente:'CLIENTE MOVIDO DE NUEVO', vendedor:'Isabel Robledo' }),
      _ped('k7','2026-12-01','AM',L({ fH:fh('2026-11-28|AM','2026-12-01|AM','Administración') }),{ cliente:'CLIENTE DE OTRA', vendedor:'Maria Flores' }),
      _ped('k8','2026-11-26','AM',L({ fH:fh('2026-11-25|AM','2026-11-26|AM','Administración','2026-11-25') }),{ cliente:'CLIENTE PASADO', vendedor:'Isabel Robledo' })
    ];
    await _cargar(window._SRV.pedidos, _stock(function(s){ s.c.u[_K]=10; }));
  });
  const mine=`(STATE||[]).filter(function(p){ return p && mismoVendedor(p.vendedor,'Isabel Robledo'); })`;
  const off=await page.evaluate(`(function(){ return { d:fcvDatos('Isabel Robledo', ${mine}).length, h:fcvHacerItem('Isabel Robledo', ${mine}) }; })()`);
  chk('en Playwright, sin pedirlo, está apagado', off.d===0 && off.h===null, off);

  const A=await page.evaluate(`(function(){ window.FCV_PRUEBA=1; var R=fcvDatos('Isabel Robledo', ${mine});
    var I=misHacerDatos('Isabel Robledo', ${mine}).filter(function(o){ return o.ic==='📅' && /Te cambiaron/.test(o.t); })[0];
    return { ids:R.map(function(x){ return x.p.id; }).sort().join(','), it:I?{ sev:I.sev, n:I.n, t:I.t, s:I.s, fn:I.fn }:null,
      txt:R.map(function(x){ return x.p.id+': '+fcvCambioTxt(x.e)+' / '+fcvQuienTxt(x.e); }) }; })()`);
  chk('1 · solo los suyos, sin entregar, de hoy en adelante, de los últimos 7 días, que cambió OTRA persona y siguen en ese día', A.ids==='k1,k2', A);
  chk('2 · «Para hacer» en rojo: «Te cambiaron el día o el turno de 2 entregas»', A.it && A.it.sev==='r' && A.it.n===2 && /de 2 entregas/.test(A.it.t) && /fcvAbrir/.test(A.it.fn), A.it);
  chk('3 · dice de qué a qué y quién lo cambió', A.txt.some(function(t){ return /k1: 🕐 pasó a la tarde/.test(t) && /lo cambió Juan Pablo Paredes · 27\/11 11:00 · desde 📅 Reprogramar/.test(t); }) &&
      A.txt.some(function(t){ return /k2: 📅 del 28\/11 🌅 al 01\/12 🌅/.test(t) && /Logística · Ernesto/.test(t); }), A.txt);

  const B=await page.evaluate(`(function(){ fcvAbrir('Isabel Robledo'); var m=document.getElementById('modal-box'); var t=m?m.innerText:'';
    fcvVer('k1', fcvDatos('Isabel Robledo', ${mine}).filter(function(x){ return x.p.id==='k1'; })[0].t);
    var R=fcvDatos('Isabel Robledo', ${mine}); closeModal();
    return { modal:/Te cambiaron el día o el turno/.test(t) && /CLIENTE TURNO/.test(t) && /CLIENTE DIA/.test(t) && /Ya los vi todos/.test(t), ids:R.map(function(x){ return x.p.id; }).join(',') }; })()`);
  chk('4 · la lista abre con los dos y «✓ Visto» saca ese en este aparato', B.modal && B.ids==='k2', B);

  const C=await page.evaluate(`(async function(){ var p=window._SRV.pedidos.filter(function(x){ return x.id==='k1'; })[0];
    p.fecha='2026-11-28'; p.turno='AM'; p.productos[0].fH.push({ t:_ts('2026-11-27','11:30:00'), de:'2026-11-27|PM', a:'2026-11-28|AM', q:'Administración', d:'📅 Reprogramar' });
    await refrescarEstado(); return fcvDatos('Isabel Robledo', ${mine}).map(function(x){ return x.p.id; }).sort().join(','); })()`);
  chk('5 · un cambio NUEVO del mismo pedido vuelve a avisar', C==='k1,k2', C);

  const D=await page.evaluate(`(function(){ fcvTodosVistos('Isabel Robledo'); return { n:fcvDatos('Isabel Robledo', ${mine}).length, it:fcvHacerItem('Isabel Robledo', ${mine}) }; })()`);
  chk('6 · «Ya los vi todos» los saca y el renglón se va', D.n===0 && D.it===null, D);

  const E=await page.evaluate(`(function(){ return { m:fcvDatos('Maria Flores', (STATE||[]).filter(function(p){ return p && mismoVendedor(p.vendedor,'Maria Flores'); })).map(function(x){ return x.p.id; }).join(',') }; })()`);
  chk('7 · a la otra vendedora le sale lo suyo', E.m==='k7', E);

  chk('sin errores en la página', !errs.length, errs);
  console.log(`\n${PASS} bien · ${FAIL} mal`);
  await browser.close(); process.exit(FAIL?1:0);
})();
