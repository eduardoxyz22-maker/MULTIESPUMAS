/* 🏭🎧 STOCK: EL PLAN PRIMERO, LO DE LA FÁBRICA EN UNA LÍNEA (16/11/2026, mejora 368; el dueño la eligió).
   En Stock, «🏭 Lo que nos debe la fábrica» y las «🎧 ATC en fábrica» pasan a dos renglones plegados arriba del Plan, con su resumen;
   «Ver» los abre ahí mismo (lo mismo de siempre) y cada compu recuerda si los dejó abiertos.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin `FD_PLEGADO_PRUEBA` (Playwright): la caja de siempre, abierta, con las ATC adentro (lo que leen test_fabrica_debe y test_atc_fabrica).
   2. Con la bandera: un renglón «🏭 La fábrica nos debe N unidades · P productos · A atrasados (el más viejo, D días)» con «📋 Reclamo
      Moreno» (solo la fábrica con atrasados) y «Ver ▾», plegado de entrada; otro renglón «🎧 N ATC en fábrica hace +10 días · la más vieja,
      D días», aparte, plegado. Adentro, lo mismo de antes (la explicación, las tablas, cada ATC con «¿Ya volvió?»).
   3. Abrirlo queda recordado en la compu (y al volver a dibujar sigue abierto); cerrarlo, también.
   4. «📋 Reclamo Moreno» copia el reclamo de siempre y NO abre ni cierra el renglón.
   5. Sin nada que deba la fábrica: el renglón «nada» de siempre + el de las ATC.
   6. «Pedido a producción» (`fdHtml('pap')`) no cambia.
   7. Las cuentas no cambian: el renglón dice lo mismo que suma `fdLista`.
   Datos SINTÉTICOS. Reloj clavado el jueves 05/11/2026. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_fd_plegado.js */
const { chromium } = require('playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.setFixedTime(new Date('2026-11-05T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  await ev(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    loadFromServer=function(){};
    try{ localStorage.removeItem(VIS_LS); }catch(e){}
    var A=function(id, oc, fecha, prod){ return { id:id, oc:oc, cliente:'CLIENTE '+id.toUpperCase(), fecha:fecha, turno:'AM', vendedor:'Mirian Salazar', vehiculo:'Carry', chofer:'Omar',
      productos:[{ desc:prod[0], medida:prod[1], cant:1, atc:{ mot:'hundimiento', det:'se hundió en el medio' } }], entregado:true, ts:Date.parse(fecha+'T09:00:00-04:00'), rev:1, fotos:[] }; };
    STATE=[ A('f1', 'ATC 10-014', '2026-09-21', ['COLCHON TITANIO LATEX','160x190']),   // 45 días en fábrica
            A('f2', 'ATC 10-019', '2026-10-20', ['COLCHON SOFT','105x190']) ];          // 16 días
    window.ATC_FAB_PRUEBA=1;
    var it=function(id, u, lleg, f, esp){ return { t:'ya', id:id, pedidas:u, llegaron:lleg, falta:u-lleg, f:f, esp:esp, at:f+'|00:00:00', mias:[] }; };
    var pr=function(k, items, atraso){ var p={ k:k, key:'MORENO|'+k, items:items, pedidas:0, llegaron:0, falta:0, atraso:atraso, fechas:[], cerro:'', espMin:'' };
      items.forEach(function(i){ p.pedidas+=i.pedidas; p.llegaron+=i.llegaron; p.falta+=i.falta; if(p.fechas.indexOf(i.f)<0) p.fechas.push(i.f); if(!p.espMin || i.esp<p.espMin) p.espMin=i.esp; }); return p; };
    window.__FD=[
      { fab:'MORENO', info:{ ico:'🏭', nombre:'Industrias Moreno', corto:'Moreno' }, prods:[
        pr('TITANIO ICE|180x200', [it('y1', 9, 1, '2026-10-16', '2026-10-21')], 15),
        pr('ALMOHADA|50x70', [it('y2', 6, 2, '2026-10-28', '2026-11-02')], 3),
        pr('SOFT|140x190', [it('y3', 4, 0, '2026-11-03', '2026-11-07')], 0) ] },
      { fab:'MULTI', info:{ ico:'🏭', nombre:'Multiespumas', corto:'Multiespumas' }, prods:[
        pr('SUEÑA LITE|105x190', [it('y4', 2, 0, '2026-11-04', '2026-11-09')], 0) ] } ];
    fdLista=function(){ return JSON.parse(JSON.stringify(window.__FD)); };
    window.__copias=[]; copyText=function(t){ window.__copias.push(t); };
  });

  console.log('\n── 1. Sin la bandera ──');
  let r = await ev(() => fdHtml('stock'));
  chk('1a la caja de siempre, abierta, con el título de siempre', /^<details class="fd-caja" id="fd-caja" open/.test(r) && /🏭 Lo que nos debe la fábrica<\/b>/.test(r), String(r).slice(0,200));
  chk('1b las ATC van adentro de la misma caja', r.indexOf('ATC en fábrica')>0 && r.indexOf('ATC en fábrica')<r.lastIndexOf('</details>') && !/fd-plg/.test(r), '');

  console.log('\n── 2. Con la bandera ──');
  r = await ev(() => {
    window.FD_PLEGADO_PRUEBA=1;
    var box=document.createElement('div'); box.id='__fdbox'; box.innerHTML=fdHtml('stock'); document.body.appendChild(box);
    var c=document.getElementById('fd-caja'), a=document.getElementById('fd-atc-caja');
    var s=function(el){ return el ? el.querySelector('summary').textContent.replace(/\s+/g,' ').trim() : ''; };
    return { n:box.children.length, cOpen:c && c.open, aOpen:a && a.open, cSum:s(c), aSum:s(a), atcEnCaja:!!(c && c.querySelector('.fd-atc')),
      atcEnA:!!(a && a.querySelector('.fd-atc-r button[data-id="f1"]')), tablas:c ? c.querySelectorAll('.fd-fab').length : 0, ley:!!(c && c.querySelector('.fd-ley')),
      recl:[].map.call(c.querySelectorAll('summary .fd-plg-rec'), function(b){ return b.textContent; }), plg:c && c.classList.contains('fd-plg'),
      orden:c && a && !!(c.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING) };
  });
  chk('2a dos renglones: la fábrica y las ATC, en ese orden', r.n===2 && r.plg && r.orden, r);
  chk('2b los dos plegados de entrada', r.cOpen===false && r.aOpen===false, r);
  chk('2c el renglón de la fábrica: 18 unidades, 4 productos, 2 atrasados, el más viejo 15 días', /La fábrica nos debe 18 unidades/.test(r.cSum) && /4 productos/.test(r.cSum) && /2 atrasados \(el más viejo, 15 días\)/.test(r.cSum), r.cSum);
  chk('2d «📋 Reclamo Moreno» solo para la fábrica con atrasados (Multiespumas no)', r.recl.join('|')==='📋 Reclamo Moreno', r.recl);
  chk('2e el renglón de las ATC: 2 ATC en fábrica hace +10 días · la más vieja, 45 días', /🎧 2 ATC en fábrica hace \+10 días/.test(r.aSum) && /la más vieja, 45 días/.test(r.aSum), r.aSum);
  chk('2f adentro, lo de siempre: la explicación, las dos fábricas; las ATC en SU renglón con «¿Ya volvió?»', r.ley && r.tablas===2 && !r.atcEnCaja && r.atcEnA, r);
  r = await ev(() => { var v=document.querySelector('#fd-caja .fd-plg-ver'); return { ver:getComputedStyle(v,'::after').content, vis:v.getBoundingClientRect().width>20 }; });
  chk('2g el botón dice «Ver ▾» plegado', /Ver ▾/.test(r.ver) && r.vis, r);

  console.log('\n── 3. Se recuerda ──');
  r = await ev(async () => {
    var c=document.getElementById('fd-caja'); c.querySelector('summary').click();
    await new Promise(function(x){ setTimeout(x, 60); });
    var ver=getComputedStyle(c.querySelector('.fd-plg-ver'),'::after').content;
    var pref=visPref('fdPlg', false);
    var h=fdHtml('stock');
    var box=document.getElementById('__fdbox'); box.innerHTML=h;
    var abierto=document.getElementById('fd-caja').open, atc=document.getElementById('fd-atc-caja').open;
    await new Promise(function(x){ setTimeout(x, 60); });   // como una persona: el toque llega después de que se dibujó (si no, Chrome junta los dos «toggle» y no avisa ninguno)
    document.getElementById('fd-caja').querySelector('summary').click();
    await new Promise(function(x){ setTimeout(x, 60); });
    return { pref:pref, abierto:abierto, atc:atc, ver:ver, luego:visPref('fdPlg', true) };
  });
  chk('3a abrirlo queda anotado en la compu y dice «Ocultar ▴»', r.pref===true && /Ocultar/.test(r.ver), r);
  chk('3b al volver a dibujar sigue abierto (y el de las ATC sigue plegado)', r.abierto===true && r.atc===false, r);
  chk('3c cerrarlo también queda anotado', r.luego===false, r);

  console.log('\n── 4. «📋 Reclamo Moreno» ──');
  r = await ev(async () => {
    window.__copias=[]; var c=document.getElementById('fd-caja'), antes=c.open;
    c.querySelector('summary .fd-plg-rec').click();
    await new Promise(function(x){ setTimeout(x, 60); });
    return { antes:antes, despues:c.open, n:window.__copias.length, t:(window.__copias[0]||'').slice(0,80), igual:window.__copias[0]===fdReclamoTexto('MORENO') };
  });
  chk('4a copia el reclamo de siempre de Moreno', r.n===1 && r.igual && /RECLAMO A INDUSTRIAS MORENO/.test(r.t), r);
  chk('4b no abre ni cierra el renglón', r.antes===r.despues, r);

  console.log('\n── 5. Sin nada que deba la fábrica ──');
  r = await ev(() => { var f=fdLista; fdLista=function(){ return []; }; var h=fdHtml('stock'); fdLista=f; return h; });
  chk('5 el renglón «nada» de siempre y aparte el de las ATC', /Lo que nos debe la fábrica:<\/b> nada/.test(r) && /id="fd-atc-caja"/.test(r) && /2 ATC en fábrica/.test(r), String(r).slice(0,300));

  console.log('\n── 6-7. «Pedido a producción» y las cuentas ──');
  r = await ev(() => { var h=fdHtml('pap'); window.FD_PLEGADO_PRUEBA=0; var h0=fdHtml('pap'); window.FD_PLEGADO_PRUEBA=1; return { igual:h===h0, pap:/id="fd-caja-pap"/.test(h) && !/fd-plg/.test(h) }; });
  chk('6 «Pedido a producción» queda igual que sin la bandera', r.igual && r.pap, r);
  r = await ev(() => { var R=fdPlgResumen(fdLista()); return R; });
  chk('7 el resumen sale de fdLista: 18 unidades, 4 productos, 2 atrasados, 15 días, un reclamo', r.nU===18 && r.nP===4 && r.nA===2 && r.viejo===15 && r.recl.length===1, r);

  console.log('\n── 8. 368 b: el Plan arriba de «Hoy» (16/11, el dueño) ──');
  r = await ev(async () => { var orden=function(){ var ids=['fd-caja','stk-plan','stk-cinta'].map(function(i){ return document.getElementById(i); });
      if(ids.some(function(x){ return !x; })) return 'falta:'+ids.map(function(x){ return x ? 1 : 0; }).join('');
      var pos=function(a, b){ return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) ? 'antes' : 'despues'; };
      return 'fd '+pos(ids[0], ids[1])+' del plan · cinta '+(pos(ids[2], ids[1])==='antes' ? 'antes' : 'despues')+' del plan'; };
    try{ abrirStock(); }catch(e){} await new Promise(function(x){ setTimeout(x, 400); });
    window.FD_PLEGADO_PRUEBA=1; renderStock(); await new Promise(function(x){ setTimeout(x, 200); }); var con=orden();
    window.FD_PLEGADO_PRUEBA=0; renderStock(); await new Promise(function(x){ setTimeout(x, 200); }); var sin=orden();
    window.FD_PLEGADO_PRUEBA=1; try{ cerrarStock(); }catch(e){} return { con:con, sin:sin }; });
  chk('8 con la 368: fábrica → Plan → «Hoy» (la cinta DEBAJO del Plan); sin la bandera, «Hoy» antes del Plan como siempre',
    r.con==='fd antes del plan · cinta despues del plan' && r.sin==='fd antes del plan · cinta antes del plan', r);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
