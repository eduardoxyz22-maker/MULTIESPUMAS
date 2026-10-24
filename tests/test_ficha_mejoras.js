/* ✨ (24/10, dueño: «a, b, c, d, e, g, i») Lo que la ficha de Administración le resume a logística:
   A etiquetas de las observaciones · B «lo retira el cliente» · C avisos de lo que no cierra · D camión sugerido · E ◀ ▶ del mismo día ·
   G cuántos días · I sin la plata en las columnas y sin «a mano» repetido.
   Se corre:  node tests/test_ficha_mejoras.js */
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
  const page = await ctx.newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('dialog', d=>d.accept());
  await page.clock.setFixedTime(new Date('2026-10-23T15:10:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');
  await page.evaluate(async()=>{
    UNLOCKED=true;
    var L=function(n, ex){ return [_lin('CH1201|TITANIO ICE|160x190', n||1, Object.assign({ chk:'ok', precio:1500 }, ex||{}))]; };
    var ps=[
      _ped('m1','2026-10-24','AM',L(1),{ cliente:'CLIENTE PROVINCIA', verificado:true, estado:'En stock', ts:_ts('2026-10-20','09:00:00'),
        observaciones:'COLOCAR DOBLE BOLSA Y ESQUINEROS PARA LLEVAR A PROVINCIA - PORTACHUELO', direccion:'RECOGERA DE ALMACEN HEAVEN DE LA AVENIDA BANZER' }),
      _ped('m2','2026-10-24','AM',L(1),{ cliente:'CLIENTE NORTE A', vehiculo:'Carry', chofer:'Luis Pierre', zona:'Norte', maps:'https://www.google.com/maps?q=-17.75,-63.17', ts:_ts('2026-10-21','10:00:00') }),
      _ped('m3','2026-10-24','PM',L(1),{ cliente:'CLIENTE NORTE B', zona:'Norte', maps:'https://www.google.com/maps?q=-17.751,-63.171', verificado:true, ts:_ts('2026-10-22','10:00:00'),
        observaciones:'Entre las 15 y las 17. Retirar el colchón viejo. 2do piso' }),
      _ped('m4','2026-10-20','AM',L(1),{ cliente:'CLIENTE ATRASADO', celular:'', maps:'', ts:_ts('2026-10-18','10:00:00'), vehiculo:'Carry', chofer:'Luis Pierre' }),
      _ped('m5','2026-10-23','AM',L(1,{ chk:'no' }),{ cliente:'CLIENTE HOY', maps:'https://www.google.com/maps?q=-17.8,-63.2', ts:_ts('2026-10-23','08:00:00'), vehiculo:'Carry', chofer:'Luis Pierre',
        observaciones:'Recoger el colchón viejo del cliente' })
    ];
    await _cargar(ps, _stock(function(s){ s.c.u[_K]=10; }));
  });
  const ver=(id)=>page.evaluate((id)=>{
    showPedidoModal(id);
    var box=document.getElementById('modal-box'), q=function(s){ return box.querySelector(s); };
    var g=q('.fl-g');
    return { txt:box.textContent.replace(/\s+/g,' '), chips:[].slice.call(box.querySelectorAll('.fl-obs .fl-chip, .fl-b > .fl-chips .fl-chip')).map(function(c){ return c.textContent.trim(); }),
      retira:!!q('.fl-retira'), maps:/📍 Maps/.test(box.textContent), avisos:[].slice.call(box.querySelectorAll('.fl-avisos li')).map(function(l){ return l.textContent; }),
      sug:q('.fl-sug') ? q('.fl-sug').textContent.replace(/\s+/g,' ') : '', colTxt:g?g.textContent.replace(/\s+/g,' '):'', nav:q('.fl-nav')?q('.fl-nav').textContent.replace(/\s+/g,' '):'',
      ent:q('.fl-ent') ? { t:q('.fl-ent').textContent.replace(/\s+/g,' '), c:q('.fl-ent').className } : null,
      masTxt:q('details.fl-mas') ? q('details.fl-mas').textContent.replace(/\s+/g,' ') : '' };
  }, id);

  // A + B: el caso del dueño
  let r=await ver('m1');
  chk('A · las observaciones salen en etiquetas: doble bolsa, esquineros, provincia con el lugar', ['🛍️ Doble bolsa','📐 Esquineros','🛣️ Va a provincia · Portachuelo'].every(c=>r.chips.indexOf(c)>=0), r.chips);
  chk('A · el texto entero de las observaciones sigue ahí', /COLOCAR DOBLE BOLSA Y ESQUINEROS PARA LLEVAR A PROVINCIA - PORTACHUELO/.test(r.txt), r.txt.slice(0,200));
  chk('B · «RECOGERÁ DE ALMACÉN … BANZER» = lo retira el cliente en Banzer, sin el mapa', r.retira && /Retira en Banzer/.test(r.txt) && /El cliente lo retira en Banzer/.test(r.txt) && !r.maps, { retira:r.retira, maps:r.maps });
  chk('B · sin camión sugerido ni «Listo y sin camión» (lo retira)', !r.sug && !r.avisos.some(a=>/no tiene camión/.test(a)), { sug:r.sug, av:r.avisos });
  chk('C · lo retira en Banzer y sale de PTF: hay que llevarlo a Banzer', r.avisos.some(a=>/Lo retira en Banzer pero 1 unidad sale de otro lado: hay que llevarla a Banzer/.test(a)), r.avisos);
  const enBanzer=await page.evaluate(()=>{ var p=findById('m1'); p.productos[0].chkDe='Banzer'; showPedidoModal('m1');
    var l=[].slice.call(document.querySelectorAll('#modal-box .fl-avisos li')).map(function(x){ return x.textContent; }); p.productos[0].chkDe=''; return l; });
  chk('C · marcado en Banzer: ese aviso no sale', !enBanzer.some(a=>/de otro lado/.test(a)), enBanzer);
  chk('I · «Los ítems suman» no está en las columnas, sí en «Más datos»', !/Los ítems suman/.test(r.colTxt) && /Los ítems suman/.test(r.masTxt), { col:/Los ítems suman/.test(r.colTxt), mas:/Los ítems suman/.test(r.masTxt) });
  chk('I · «a mano: En stock» no se repite si lo automático ya dice En stock', !/a mano: En stock/.test(r.txt), r.txt.match(/Estado de stock.{0,120}/));
  chk('G · ingresó «hace 3 días» y la entrega dice MAÑANA en naranja', /hace 3 días/.test(r.txt) && r.ent && /MAÑANA/.test(r.ent.t) && /fl-ent-man/.test(r.ent.c), r.ent);

  // C + D + A (hora, piso, viejo)
  r=await ver('m3');
  chk('A · hora, colchón viejo y piso', ['🕐 Entre las 15 y las 17','♻️ Retirar el colchón viejo','🪜 Subir al piso 2'].every(c=>r.chips.indexOf(c)>=0), r.chips);
  chk('B · «Retirar el colchón viejo» NO es «lo retira el cliente»', !r.retira && r.maps, r.retira);
  chk('C · listo para cargar y sin camión: lo avisa', r.avisos.some(a=>/Listo para cargar» y no tiene camión/.test(a)), r.avisos);
  chk('D · sugiere el camión que ya va a Norte', /Carry/.test(r.sug) && /ya va a Norte/.test(r.sug), r.sug);
  const usado=await page.evaluate(()=>{ document.querySelector('#modal-box .fl-sug .fl-btn').click(); var p=findById('m3'); return { v:p.vehiculo, c:p.chofer, sug:!!document.querySelector('#modal-box .fl-sug'), abierta:document.getElementById('modal').classList.contains('on') }; });
  chk('D · «✓ Usar este» pone el camión y su chofer, y la ficha sigue abierta sin la sugerencia', usado.v==='Carry' && usado.c==='Luis Pierre' && !usado.sug && usado.abierta, usado);

  r=await ver('m4');
  chk('C · fecha que pasó sin entregar, sin ubicación y sin celular', r.avisos.some(a=>/Era para el 20\/10/.test(a)) && r.avisos.some(a=>/No tiene ubicación/.test(a)) && r.avisos.some(a=>/celular/.test(a)), r.avisos);
  chk('G · una entrega que pasó dice «hace 3 días» en gris', r.ent && /hace 3 días/.test(r.ent.t) && /fl-ent-pas/.test(r.ent.c), r.ent);

  r=await ver('m5');
  chk('C · sin stock y sale hoy: lo avisa', r.avisos.some(a=>/sin stock y la entrega es hoy/.test(a)), r.avisos);
  chk('G · entrega de hoy dice HOY', r.ent && /HOY/.test(r.ent.t) && /fl-ent-hoy/.test(r.ent.c), r.ent);
  chk('B · «Recoger el colchón viejo del cliente» tampoco es retiro', !r.retira, r.retira);

  r=await ver('m2');
  chk('C · un pedido con todo en orden no muestra avisos', r.avisos.length===0, r.avisos);

  // E: ◀ ▶
  const nav=await page.evaluate(()=>{
    var m=dayNumMap(); showPedidoModal('m1'); var out={ n1:m.m1, nav:document.querySelector('#modal-box .fl-nav').textContent.replace(/\s+/g,' ') };
    var cli=function(){ return document.querySelector('#modal-box .fl-cli .n').textContent; };
    var sig=[].slice.call(document.querySelectorAll('#modal-box .fl-navb')).filter(function(b){ return /▶/.test(b.textContent) && b.tagName==='BUTTON'; })[0];
    sig.click(); out.tras=cli();
    document.dispatchEvent(new KeyboardEvent('keydown',{ key:'ArrowRight' })); out.flecha=cli();
    document.dispatchEvent(new KeyboardEvent('keydown',{ key:'ArrowLeft' })); out.atras=cli();
    out.ancha=/fl-ficha/.test(document.getElementById('modal-box').className);
    return out;
  });
  chk('E · «1 de 3» en la cabecera, ▶ y las flechas pasan al siguiente del mismo día, ◀ vuelve', /1 de 3 · sábado 24\/10/.test(nav.nav) && nav.tras==='CLIENTE NORTE A' && nav.flecha==='CLIENTE NORTE B' && nav.atras==='CLIENTE NORTE A' && nav.ancha, nav);

  // El «¿Las leíste?» muestra las etiquetas
  const dlg=await page.evaluate(()=>{ window.OBS_PRUEBA=1; var p=findById('m3'); p.verificado=false; showPedidoModal('m3'); document.querySelector('#modal-box .fl-sw').click();
    var ov=document.getElementById('obs-conf'), t=ov.querySelectorAll('.fl-chip').length; document.getElementById('obs-no').click(); return t; });
  chk('A · la ventana «¿Las leíste?» también muestra las etiquetas', dlg>=3, dlg);
  chk('sin errores en la página', errs.length===0, errs);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
