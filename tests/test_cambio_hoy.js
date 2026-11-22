/* 🔁 (22/11, mejora 470) «QUÉ CAMBIÓ HOY» PARA LOGÍSTICA: los cambios de hoy en pedidos ya cargados que todavía no salieron. El día y el turno
   salen de la historia `fH`, lo marcado «⚠️ Modificado» de `mod` (con quién) y lo demás lo nota ESTE aparato comparando con lo que vio la
   última vez (`me_cambio_foto`). «✓ Visto» y abrir la ficha lo dan por visto. Lo guardado desde este aparato no cuenta como sin ver.
   Se corre:  node tests/test_cambio_hoy.js */
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
  await page.clock.setFixedTime(new Date('2026-11-19T10:00:00-04:00'));   // jueves
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');
  await page.evaluate(async()=>{
    UNLOCKED=true;
    try{ ['me_cambio_foto','me_cambio_hoy','me_cambio_visto','me_ficha_vista'].forEach(function(k){ localStorage.removeItem(k); }); }catch(e){}
    var L=function(ex){ return [_lin('CH1201|TITANIO ICE|160x190',1,Object.assign({ chk:'ok' }, ex||{}))]; };
    var fh=[{ t:_ts('2026-11-19','09:30:00'), de:'2026-11-21|AM', a:'2026-11-20|PM', q:'Maria Flores', d:'formulario del pedido' }];
    var mod={ f:'2026-11-19', h:'09:40', q:'Isabel Robledo', por:'Isabel Robledo', d:['➕ ALMOHADA 50x70 × 2', '📍 cambió la ubicación'] };
    window._SRV.pedidos=[
      _ped('k1','2026-11-20','PM',L({ fH:fh }),{ cliente:'CLIENTE DIA' }),
      _ped('k2','2026-11-21','AM',L({ mod:mod }),{ cliente:'CLIENTE MOD', vendedor:'Isabel Robledo' }),
      _ped('k3','2026-11-21','AM',L(),{ cliente:'CLIENTE SIN HISTORIA', direccion:'Calle 1', observaciones:'Llamar antes' }),
      _ped('k4','2026-11-21','AM',L({ mod:{ f:'2026-11-18', h:'15:00', por:'Carola Chavez', d:['🏠 cambió la dirección'] } }),{ cliente:'CLIENTE AYER' }),
      _ped('k5','2026-11-20','AM',L({ fH:fh }),{ cliente:'CLIENTE ENTREGADO', entregado:true }),
      _ped('k6','2026-11-22','AM',L(),{ cliente:'CLIENTE PROPIO' }),
      _ped('k7','2026-11-10','AM',L({ fH:fh }),{ cliente:'CLIENTE PASADO' })
    ];
    await _cargar(window._SRV.pedidos, _stock(function(s){ s.c.u[_K]=10; }));
  });
  const off=await page.evaluate(()=>{ renderAdmin(); return { h:chvHacer(), bar:document.getElementById('adm-chv').hidden, foto:localStorage.getItem('me_cambio_foto') }; });
  chk('en Playwright, sin pedirlo, está apagado (ni la barra ni «Para hacer», y no toma ninguna foto)', off.h===null && off.bar && off.foto===null, off);

  const A=await page.evaluate(()=>{ window.CAMBIOS_PRUEBA=1; var D=chvDatos();
    return { ids:D.R.map(function(x){ return x.id; }).sort().join(','), sv:D.sinVer.length, foto:Object.keys((JSON.parse(localStorage.getItem('me_cambio_foto')||'{}').p)||{}).sort().join(',') }; });
  chk('1 · la primera vez: solo lo que tiene historia de hoy (k1 por el día, k2 por «Modificado»); toma la foto de los que están por salir sin inventar cambios',
      A.ids==='k1,k2' && A.sv===2 && A.foto==='k1,k2,k3,k4,k6', A);

  const B=await page.evaluate(async()=>{
    var s=window._SRV.pedidos;
    var k3=s.filter(function(p){ return p.id==='k3'; })[0]; k3.direccion='Calle 2 esquina'; k3.observaciones='Llamar 1 hora antes'; k3.productos[0].cant=2;
    var k6=s.filter(function(p){ return p.id==='k6'; })[0]; k6.zona='Sur';
    chvPropio({ id:'k6' });   // como si este aparato lo hubiera guardado
    await refrescarEstado();
    var D=chvDatos(), k=function(id){ return D.R.filter(function(x){ return x.id===id; })[0]; };
    return { ids:D.R.map(function(x){ return x.id; }).sort().join(','), sv:D.sinVer.map(function(x){ return x.id; }).sort().join(','),
      k3:k('k3').it.map(function(i){ return i.txt; }), k3ap:k('k3').it.every(function(i){ return i.ap; }), k6mio:k('k6') && k('k6').mio,
      hacer:(function(){ var o=admHacerDatos().filter(function(o){ return o.k==='chv'; })[0]; return o ? { sev:o.sev, n:o.n, t:o.t, s:o.s } : null; })() };
  });
  chk('2 · lo que no deja historia lo nota este aparato al leer la planilla: dirección, observaciones y cantidad (de → a)',
      B.ids==='k1,k2,k3,k6' && B.k3ap && B.k3.some(function(t){ return /dirección: «Calle 1» → «Calle 2 esquina»/.test(t); }) &&
      B.k3.some(function(t){ return /observaciones: «Llamar antes» → «Llamar 1 hora antes»/.test(t); }) && B.k3.some(function(t){ return /🔢 TITANIO ICE 160x190 — de 1 a 2/.test(t); }), B);
  chk('2 · lo guardado desde este aparato se lista pero no cuenta como sin ver', B.k6mio===true && B.sv==='k1,k2,k3', B);
  chk('3 · «Para hacer»: «🔁 Cambió hoy · 3 sin ver», en ámbar, con qué cambió', B.hacer && B.hacer.sev==='a' && B.hacer.n===3 && /Cambió hoy · 3 sin ver/.test(B.hacer.t) &&
      /día o turno/.test(B.hacer.s) && /productos/.test(B.hacer.s) && /observaciones/.test(B.hacer.s), B.hacer);

  const M=await page.evaluate(async()=>{
    renderAdmin(); var bar=document.getElementById('adm-chv'), T=function(e){ return e ? e.textContent.replace(/\s+/g,' ') : ''; };
    var r={ bar:!bar.hidden && T(bar) };
    chvAbrir(); var b=document.getElementById('modal-box'), f=function(id){ return b.querySelector('.chv-f[data-id="'+id+'"]'); };
    r.orden=[].map.call(b.querySelectorAll('.chv-f'), function(x){ return x.getAttribute('data-id'); });
    r.k1=T(f('k1')); r.k2=T(f('k2')); r.k3=T(f('k3')); r.k6=T(f('k6'));
    f('k1').querySelector('.chv-ya').click(); await new Promise(x=>setTimeout(x,40));
    r.trasVisto=chvDatos().sinVer.map(function(x){ return x.id; }).sort().join(',');
    f=function(id){ return document.querySelector('#modal-box .chv-f[data-id="'+id+'"]'); };
    f('k2').querySelector('.chv-acc button').click(); await new Promise(x=>setTimeout(x,60));
    r.ficha=!!document.querySelector('#modal-box .fl-b') && !!document.querySelector('#modal-box .chv-volver');
    r.trasFicha=chvDatos().sinVer.map(function(x){ return x.id; }).sort().join(',');
    document.querySelector('#modal-box .chv-volver').click(); await new Promise(x=>setTimeout(x,40));
    r.volvio=!!document.querySelector('#modal-box .chv');
    chvVisto('', true); r.todos=chvDatos().sinVer.length; r.hacer=!!admHacerDatos().filter(function(o){ return o.k==='chv'; }).length;
    renderAdmin(); r.bar2=T(document.getElementById('adm-chv')); closeModal();
    return r;
  });
  chk('4 · la barrita arriba de la lista: «Cambió hoy: 4 pedidos · 3 sin ver»', /Cambió hoy: 4 pedidos/.test(M.bar) && /3 sin ver/.test(M.bar), M.bar);
  chk('5 · la lista: lo sin ver primero, cada cambio con de → a, quién y la hora; lo notado por el aparato lo dice',
      M.orden.slice(0,3).sort().join(',')==='k1,k2,k3' && M.orden[3]==='k6' && /📅 del 21\/11 🌅 al 20\/11 🌆/.test(M.k1) && /Maria Flores · 09:30 · desde formulario del pedido/.test(M.k1) &&
      /➕ ALMOHADA 50x70 × 2/.test(M.k2) && /Isabel Robledo · 09:40/.test(M.k2) && /lo notó este aparato a las 10:00/.test(M.k3) && /lo hiciste vos/.test(M.k6), M);
  chk('6 · «✓ Visto» lo saca de los sin ver; abrir la ficha (con «← Volver») también cuenta', M.trasVisto==='k2,k3' && M.ficha && M.trasFicha==='k3' && M.volvio, M);
  chk('7 · «✓ Marcar todos vistos»: nada sin ver, se va de «Para hacer» y la barrita dice «todo visto»', M.todos===0 && !M.hacer && /todo visto/.test(M.bar2), M);

  await page.clock.setFixedTime(new Date('2026-11-20T08:00:00-04:00'));
  const N=await page.evaluate(()=>{ var D=chvDatos(); return { ids:D.R.map(function(x){ return x.id; }).join(','), hoy:JSON.parse(localStorage.getItem('me_cambio_hoy')||'{}').d }; });
  chk('8 · al otro día empieza de cero (lo notado ayer no es «de hoy»)', N.ids==='', N);

  chk('sin errores en la página', errs.length===0, errs);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
