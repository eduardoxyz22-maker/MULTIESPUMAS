/* 🎨 (16/11/2026, mejora 406; el dueño la eligió) «El día de logística» en una línea de horas, arriba de Administración: 📥 Excel de la
   mañana · 🚚 salen los de la mañana · 🌆 salen a la tarde · 📲 pedir hoy · ✅ cierre de entregas · 🌙 Excel de la noche. Verde con ✓ si ya
   se hizo, rojo si pasó la hora y falta, ámbar si es la hora, gris si todavía no. Solo mira.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin `DIA_LOG_PRUEBA` (Playwright): la franja no aparece.
   2. Lunes 10:00, el Excel del sábado: «📥 Excel de la mañana» en ROJO con «el último es del 14/11»; los camiones de la mañana en ámbar con
      «0 de 1 salieron»; «Pedir hoy» con lo sin revisar (`semanaUrgentes`); el cierre y el Excel de la noche, todavía no.
   3. Con el Excel de hoy y el camión salido: los dos en verde ✓; la raya «ahora 10:00».
   4. A las 17:00: el cierre en ámbar con «N por confirmar» (`cierreEntHoy`) y «Pedir hoy» en rojo (pasó el corte); a las 21:30 el Excel de la
      noche en rojo; subido el de la noche, verde.
   5. Tocar «Cierre de entregas» abre el cierre; «Pedir hoy», el chip Semana.
   6. Un domingo (sin camión) no aparece.
   Datos SINTÉTICOS. Reloj clavado el lunes 16/11/2026. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_v406_dia_logistica.js */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_u2_turno.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));
(async()=>{
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('dialog', d=>d.accept());
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));   // lunes
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');
  await page.evaluate(async()=>{
    UNLOCKED=true;
    var ps=[
      _ped('a1','2026-11-16','AM',[_lin('CH1201|TITANIO ICE|160x190',1,{})],{ cliente:'CLIENTE UNO', vehiculo:'Carry', chofer:'Omar', ts:_ts('2026-11-12','09:00:00') }),
      _ped('a2','2026-11-16','PM',[_lin('CH1201|TITANIO ICE|160x190',1,{ chk:'ok' })],{ cliente:'CLIENTE DOS', ts:_ts('2026-11-12','10:00:00') })
    ];
    await _cargar(ps, _stock(function(s){ s.c.u[_K]=10; s.g[_BZ].u[_K]=2; s.g[_IM].u[_K]=3; }, { f:'2026-11-14', hora:'08:05:00', subido:'08:10:00' }));
    document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block';
    showView('admin');
  });
  const leer=()=>page.evaluate(()=>{ try{ diaLogPintar(); }catch(e){ return { err:String(e) }; } var el=document.getElementById('adm-dialog'), o={ hidden:el.hidden, m:{} };
    [].forEach.call(el.querySelectorAll('.dlg-m'), function(b){ o.m[b.getAttribute('data-k')]={ e:b.className.replace('dlg-m','').trim(), t:b.querySelector('.lb').textContent.replace(/\s+/g,' ') }; });
    o.ahora=(el.querySelector('.dlg-ahora')||{}).textContent||''; o.res=(el.querySelector('.dlg-res')||{}).textContent||''; return o; });

  console.log('\n── 1. Sin la bandera ──');
  let r=await leer();
  chk('1a la franja no aparece', r.hidden && !Object.keys(r.m).length, r);

  console.log('\n── 2. Lunes 10:00, con el Excel del sábado ──');
  await page.evaluate(()=>{ window.DIA_LOG_PRUEBA=1; });
  r=await leer();
  chk('2a seis momentos: Excel mañana, salen mañana, salen tarde, pedir hoy, cierre, Excel noche', ['xam','AM','PM','ped','cie','xpm'].every(k=>r.m[k]) && !r.hidden, Object.keys(r.m));
  chk('2b «Excel de la mañana» en rojo: «falta · el último es del 14/11»', r.m.xam.e==='mal' && /falta · el último es del 14\/11/.test(r.m.xam.t), r.m.xam);
  chk('2c «Salen los de la mañana» en ámbar: 9:30 · 0 de 1 salieron', r.m.AM.e==='ya' && /9:30 · 0 de 1 salieron/.test(r.m.AM.t), r.m.AM);
  chk('2d la tarde todavía no (gris) y dice la entrega sin camión', r.m.PM.e==='' && /1 sin camión/.test(r.m.PM.t), r.m.PM);
  chk('2e «Pedir hoy» 16:00 con lo sin revisar (lo de semanaUrgentes), en ámbar', r.m.ped.e==='ya' && /16:00 · \d+ sin revisar/.test(r.m.ped.t), r.m.ped);
  const urg=await page.evaluate(()=>semanaUrgentes().length);
  chk('2f el número es el de semanaUrgentes', new RegExp('· '+urg+' sin revisar').test(r.m.ped.t) && urg>0, { urg, t:r.m.ped.t });
  chk('2g el cierre y el Excel de la noche, todavía no (gris)', r.m.cie.e==='' && /16:30 · 2 por confirmar/.test(r.m.cie.t) && r.m.xpm.e==='', [r.m.cie, r.m.xpm]);
  chk('2h «ahora 10:00» y el resumen «🔴 1 ya pasó la hora»', /ahora 10:00/.test(r.ahora) && /🔴 1 ya pasó la hora/.test(r.res), r);

  console.log('\n── 3. Con el Excel de hoy y el camión salido ──');
  r=await page.evaluate(()=>{ ['c'].forEach(function(){ STOCK.c.f='2026-11-16'; STOCK.c.hora='08:40'; }); Object.keys(STOCK.g).forEach(function(k){ STOCK.g[k].f='2026-11-16'; STOCK.g[k].hora='08:45'; });
    camionSalioMarcar('Carry', true, { sinPreguntar:true, sinAdelanto:true, sinAviso:true }); return 1; });
  r=await leer();
  chk('3a el Excel de la mañana en verde: «subido · 08:40»', r.m.xam.e==='ok' && /subido · 08:40/.test(r.m.xam.t), r.m.xam);
  chk('3b «Salen los de la mañana» en verde: 1 de 1 salieron', r.m.AM.e==='ok' && /1 de 1 salieron/.test(r.m.AM.t), r.m.AM);

  console.log('\n── 4. A la tarde y a la noche ──');
  await page.clock.setFixedTime(new Date('2026-11-16T17:00:00-04:00'));
  r=await leer();
  chk('4a 17:00: el cierre en ámbar con «2 por confirmar» y «Pedir hoy» en rojo (pasó el corte)', r.m.cie.e==='ya' && /2 por confirmar/.test(r.m.cie.t) && r.m.ped.e==='mal', [r.m.cie, r.m.ped]);
  chk('4b la tarde en ámbar (ya es la hora y no salió)', r.m.PM.e==='ya', r.m.PM);
  await page.clock.setFixedTime(new Date('2026-11-16T21:30:00-04:00'));
  r=await leer();
  chk('4c 21:30: el Excel de la noche en rojo y el cierre en rojo', r.m.xpm.e==='mal' && r.m.cie.e==='mal', [r.m.xpm, r.m.cie]);
  r=await page.evaluate(()=>{ STOCK.c.hora='19:40'; return 1; }); r=await leer();
  chk('4d subido el de la noche (19:40): verde', r.m.xpm.e==='ok', r.m.xpm);

  console.log('\n── 5. Tocar un momento abre lo de siempre ──');
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));
  r=await page.evaluate(async()=>{ diaLogPintar(); document.querySelector('#adm-dialog .dlg-m[data-k="cie"]').click(); await new Promise(r=>setTimeout(r,120));
    var a=document.getElementById('modal').classList.contains('on') && /cierre|entreg/i.test(document.getElementById('modal-box').textContent); closeModal();
    document.querySelector('#adm-dialog .dlg-m[data-k="ped"]').click(); await new Promise(r=>setTimeout(r,200)); return { cierre:a, quick:QUICK_FILTER }; });
  chk('5a «Cierre de entregas» abre el cierre', r.cierre, r);
  chk('5b «Pedir hoy» pone el chip Semana', r.quick==='semana', r);

  console.log('\n── 6. Un domingo ──');
  await page.clock.setFixedTime(new Date('2026-11-15T10:00:00-04:00'));
  r=await leer();
  chk('6a el domingo (sin camión) no aparece', r.hidden, r);

  chk('sin errores en la página', errs.length===0, errs);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
