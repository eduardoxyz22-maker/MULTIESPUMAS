/* 🃏 (24/10, dueño: «la tabla es la vista resumen… los botones rápidos: entregó, editar, reprogramar, borrar, WhatsApp»; eligió la «G» con el
   estado arriba a la derecha y lo cambiado parpadeando; «mover un pedido de AM a PM… fácil»; «el 📍 abre la ubicación directo»; «ocultar»
   en «Lo del día, por lugar») Administración en fichas para mirar.
   Se corre:  node tests/test_adm_fichas.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,300)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_u2_turno.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));
(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{ width:1440, height:900 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('dialog', d=>d.accept());
  await page.clock.setFixedTime(new Date('2026-10-22T09:10:00-04:00'));   // jueves
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');
  const sinFichas=await page.evaluate(()=>admVista());
  chk('en Playwright, sin pedirlo, sigue la tabla (las pruebas de siempre la leen)', sinFichas==='tabla', sinFichas);
  await page.evaluate(async()=>{
    window.ADM_FICHAS_PRUEBA=1; UNLOCKED=true;
    var L=function(ex){ return [_lin('CH1201|TITANIO ICE|160x190',1,Object.assign({ chk:'ok' }, ex||{}))]; };
    var ps=[
      _ped('a1','2026-10-22','AM',L(),{ cliente:'CLIENTE UNO', maps:'https://www.google.com/maps?q=-17.75,-63.17', vehiculo:'Carry', chofer:'Luis Pierre', verificado:true, ts:_ts('2026-10-20','09:00:00'), observaciones:'LLAMAR 1 HORA ANTES' }),
      _ped('a2','2026-10-22','AM',L({ mod:{ f:'2026-10-21', h:'10:00', d:['📅 cambió la fecha de entrega: del 21/10 al 22/10'] } }),{ cliente:'CLIENTE DOS', ts:_ts('2026-10-20','10:00:00'), pagado:false, saldo:450 }),
      _ped('a3','2026-10-22','PM',L({ chk:'no' }),{ cliente:'CLIENTE TRES', ts:_ts('2026-10-20','11:00:00') }),
      _ped('a4','2026-10-24','AM',L(),{ cliente:'CLIENTE SABADO', ts:_ts('2026-10-20','12:00:00') })
    ];
    await _cargar(ps, _stock(function(s){ s.c.u[_K]=10; }));
    document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block';
    showView('admin'); var seg=document.querySelector('#adm-mode [data-val="todo"]'); if(seg) seg.click(); renderAdmin();
  });
  const r=await page.evaluate(()=>{
    var F=[].slice.call(document.querySelectorAll('#adm-fichas .af-f')), T=function(e){ return e.textContent.replace(/\s+/g,' '); };
    var de=function(n){ return F.filter(function(f){ return /CLIENTE /.test(T(f)) && T(f).indexOf(n)>=0; })[0]; };
    var a1=de('CLIENTE UNO'), a2=de('CLIENTE DOS'), a3=de('CLIENTE TRES'), a4=de('CLIENTE SABADO');
    return { n:F.length, tabla:document.getElementById('tbl-pedidos-w').hidden, grupos:[].map.call(document.querySelectorAll('#adm-fichas .af-gt'), T),
      a1e:T(a1.querySelector('.af-e')), a2e:a2.querySelector('.af-e').className+' '+T(a2.querySelector('.af-e')), a3e:a3.querySelector('.af-e').className+' '+T(a3.querySelector('.af-e')),
      a1nt:a1.querySelector('.af-nt') ? T(a1.querySelector('.af-nt')) : '', a2cob:T(a2.querySelector('.af-inf')), a1cam:T(a1.querySelector('.af-inf')),
      pin:a1.querySelector('a.af-pin') ? a1.querySelector('a.af-pin').getAttribute('href') : '', pin2:!!a2.querySelector('.af-pin.off'),
      btns:[].map.call(a1.querySelectorAll('.af-tb small'), T), btns4:[].map.call(a4.querySelectorAll('.af-tb small'), T),
      sw:T(document.getElementById('adm-vista')) };
  });
  chk('1 · cada pedido es una ficha, la tabla escondida y «☰ Ver como tabla»', r.n===4 && r.tabla && /Ver como tabla/.test(r.sw), r);
  chk('1 · agrupadas por día y turno, la mañana antes que la tarde', r.grupos.length===3 && /Mañana/.test(r.grupos[0]) && /Tarde/.test(r.grupos[1]), r.grupos);
  chk('2 · el estado arriba a la derecha: Listo · ⚠️ Cambió la fecha (parpadea) · 🔴 Sin stock (parpadea)', /Listo/.test(r.a1e) && /late/.test(r.a2e) && /Cambió la fecha/.test(r.a2e) && /late/.test(r.a3e) && /Sin stock/.test(r.a3e), r);
  chk('3 · las etiquetas de la nota, el camión y lo que hay que cobrar', /Llamar 1 h antes/.test(r.a1nt) && /Carry/.test(r.a1cam) && /Cobrar Bs 450/.test(r.a2cob) && /Sin camión/.test(r.a2cob), r);
  chk('4 · el 📍 abre la ubicación (y sin ubicación queda gris)', /maps\?q=-17.75/.test(r.pin) && r.pin2, { pin:r.pin, gris:r.pin2 });
  chk('5 · los botones: Entregó · WhatsApp · Editar · Reprog. · A tarde · Borrar; el sábado sin «A tarde»', r.btns.join('|')==='Entregó|WhatsApp|Editar|Reprog.|A tarde|Borrar' && r.btns4.indexOf('A tarde')<0, { a1:r.btns, sab:r.btns4 });
  const toque=await page.evaluate(async()=>{
    var f=function(n){ return [].slice.call(document.querySelectorAll('#adm-fichas .af-f')).filter(function(x){ return x.textContent.indexOf(n)>=0; })[0]; };
    f('CLIENTE UNO').click(); var abre=document.getElementById('modal').classList.contains('on'); closeModal();
    var b=[].slice.call(f('CLIENTE UNO').querySelectorAll('.af-tb button')).filter(function(x){ return /A tarde/.test(x.textContent); })[0]; b.click();
    await new Promise(r=>setTimeout(r,60));
    return { abre:abre, turno:findById('a1').turno, modal:document.getElementById('modal').classList.contains('on'), ahora:f('CLIENTE UNO') && f('CLIENTE UNO').closest('.af-cg').previousElementSibling.textContent };
  });
  chk('6 · tocar la ficha abre la ficha grande', toque.abre, toque);
  chk('6 · «A tarde» pasa el pedido a la tarde (cambiarTurno), sin dejar la ficha grande abierta, y sale en el grupo de la tarde', toque.turno==='PM' && !toque.modal && /Tarde/.test(toque.ahora), toque);
  const tab=await page.evaluate(()=>{ admVistaPoner('tabla'); var t={ tabla:!document.getElementById('tbl-pedidos-w').hidden && document.querySelectorAll('#tbl-pedidos tbody tr').length, fichas:document.getElementById('adm-fichas').hidden, sw:document.getElementById('adm-vista').textContent };
    admVistaPoner('fichas'); t.vuelve=!document.getElementById('adm-fichas').hidden; return t; });
  chk('7 · «☰ Ver como tabla» muestra la tabla de siempre y «🃏 Ver como fichas» vuelve', tab.tabla===4 && tab.fichas && /Ver como fichas/.test(tab.sw) && tab.vuelve, tab);
  const lug=await page.evaluate(()=>{ admLugaresMostrar(false); var a=document.getElementById('adm-lugares').textContent; var det=!!document.getElementById('adm-lugares-det');
    admLugaresMostrar(true); return { a:a, det:det, vuelve:!!document.getElementById('adm-lugares-det') }; });
  chk('8 · «Lo del día, por lugar» se oculta (queda «👁️ Mostrar») y vuelve', !lug.det && /Mostrar/.test(lug.a) && lug.vuelve, lug);
  chk('sin errores en la página', errs.length===0, errs);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
