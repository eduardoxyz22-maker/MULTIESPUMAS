/* 🎨 (16/11/2026, mejora 402; el dueño la eligió) La ficha de logística: «¿de dónde sale?» en una barra que se lee.
   Los botones de cada producto van en tres grupos con nombre (HAY EN · No hay · A FÁBRICA), cada depósito con cuántos de ESTE pedido hay
   ahí, y el que propone el stock brilla con 💡 (tocarlo = el «💡 Marcar…» de siempre). «Sin revisar» y «faltan N → fabricar» van al lado
   del nombre.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin `FICHA_BARRA_PRUEBA` (Playwright): la ficha de siempre (la tira de botones, «📊 Stock para este pedido», «💡 Marcar…»).
   2. Con la bandera: la barra con sus tres grupos, el número de cada depósito (el de «Stock para este pedido»), lo que brilla y la leyenda.
   3. Tocar el que brilla marca lo MISMO que «💡 Marcar…» (`fichaSugUsarStock`) y lo guarda.
   4. Los demás botones de la barra hacen lo de siempre (✗ No hay, 🏭 Moreno).
   5. «faltan N → fabricar» y «sin revisar» al lado del nombre; sin Excel, el texto de siempre y sin números.
   6. Si la propuesta se reparte en dos depósitos, queda el «💡 Marcar…» de siempre y nada brilla.
   Datos SINTÉTICOS. Reloj clavado el viernes 23/10/2026 15:10. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_v402_ficha_barra.js */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_u2_turno.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));
(async()=>{
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{ width:1440, height:900 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('dialog', d=>d.accept());
  await page.clock.setFixedTime(new Date('2026-10-23T15:10:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');
  await page.evaluate(async()=>{
    UNLOCKED=true;
    var ORO='CH1300|COLCHON ORO ANATOMICO|160x190', SOM='CH1145|SOMIER ORO|160x190', ALM='CD1403|ALMOHADA|50x70', SOFT='ZZ1111|COLCHON PRUEBA|140x190',
        RARO='ZZ9999|COLCHON QUE NO ESTA|150x190', TIT='CH1201|TITANIO ICE|160x190';
    var t=_ped('t1','2026-10-31','AM',[_lin(ORO,1,{}), _lin(SOM,1,{}), _lin(ALM,2,{ chk:'ok' }), _lin(SOFT,3,{})],{ ts:_ts('2026-09-26','17:45:00') });
    var r=_ped('r1','2026-11-02','AM',[_lin(RARO,1,{}), _lin(TIT,3,{})],{ ts:_ts('2026-10-01','10:00:00') });
    await _cargar([t,r], _stock(function(st){
      st.g[_BZ].u[_k('CH1300','COLCHON ORO ANATOMICO','160x190')]=2;
      st.c.u[_k('CH1145','SOMIER ORO','160x190')]=3;
      st.g[_IM].u[_k('CD1403','ALMOHADA','50x70')]=6;
      st.c.u[_k('ZZ1111','COLCHON PRUEBA','140x190')]=1;
      st.c.u[_k('CH1201','TITANIO ICE','160x190')]=1; st.g[_BZ].u[_k('CH1201','TITANIO ICE','160x190')]=2;
    }));
    window._SAV=[]; var ap=apiSave; apiSave=function(rec){ window._SAV.push(rec.id); return ap(rec); };
  });
  const ver=(id)=>page.evaluate(async(id)=>{
    closeModal(); FICHA_REV=null; showPedidoModal(id); await new Promise(r=>setTimeout(r,80));
    var box=document.getElementById('modal-box');
    return [].map.call(box.querySelectorAll('.fl-prod'), function(pr){
      var g=function(s){ return [].map.call(pr.querySelectorAll(s), function(e){ return e.textContent.replace(/\s+/g,' ').trim(); }); };
      return { nom:(pr.querySelector('.fl-pnn')||{}).textContent, barra:!!pr.querySelector('.fb-bar'), tira:!!pr.querySelector('.fl-prbtns'), grupos:g('.fb-g > i'),
        botones:g('.fb-bar .chkbtn'), brilla:g('.fb-bar .fb-sug'), hay:g('.fl-hay'), mc:g('.fl-mc').join(' '), pls:!!pr.querySelector(':scope > .fl-pls') };
    }).concat([{ ley:(box.querySelector('.fb-ley')||{}).textContent||'' }]);
  }, id);

  console.log('\n── 1. Sin la bandera: la ficha de siempre ──');
  let r=await ver('t1');
  chk('1a la tira de siempre en cada producto, sin la barra', r.slice(0,4).every(x=>x.tira && !x.barra && x.pls), r.slice(0,4).map(x=>[x.tira,x.barra]));
  chk('1b «📊 Stock para este pedido» y «💡 Marcar ✔ Banzer» del colchón, como siempre', /Stock para este pedido: .*Banzer 1/.test(r[0].hay[0]||'') && /Marcar ✔ .*Banzer/.test(r[0].hay[0]||''), r[0].hay);
  chk('1c sin leyenda', !r[4].ley, r[4]);

  console.log('\n── 2. Con la bandera: la barra ──');
  await page.evaluate(()=>{ window.FICHA_BARRA_PRUEBA=1; });
  r=await ver('t1');
  chk('2a cada producto con la barra de tres grupos («Hay en», «A fábrica») y sin la tira de siempre', r.slice(0,4).every(x=>x.barra && !x.tira && !x.pls && x.grupos.join('|')==='Hay en|A fábrica'), r.slice(0,4).map(x=>x.grupos));
  chk('2b los botones: PTF, Banzer, IM, Tienda, ✗ No hay, Moreno, Multi', /✔ PTF/.test(r[0].botones[0]) && r[0].botones.some(b=>/✔ Banzer/.test(b)) && r[0].botones.some(b=>/📥 IM/.test(b)) &&
    r[0].botones.some(b=>/🏬 Tienda/.test(b)) && r[0].botones.indexOf('✗ No hay')>=0 && r[0].botones.indexOf('🏭 Moreno')>=0 && r[0].botones.indexOf('🏭 Multi')>=0, r[0].botones);
  chk('2c el colchón: Banzer dice 1 (lo de «Stock para este pedido») y brilla «✔ Banzer»', r[0].botones.some(b=>/✔ Banzer ?1$/.test(b)) && r[0].brilla.length===1 && /Banzer/.test(r[0].brilla[0]), { b:r[0].botones, s:r[0].brilla });
  chk('2d el somier: PTF dice 1 y brilla «✔ PTF»', /^✔ PTF ?1$/.test(r[1].botones[0]) && r[1].brilla.length===1 && /PTF/.test(r[1].brilla[0]), { b:r[1].botones, s:r[1].brilla });
  chk('2e la almohada ya marcada ✔: nada brilla (se respeta lo de logística)', r[2].brilla.length===0, r[2].brilla);
  chk('2f lo que el panel ya no muestra aparte: sin «📊 Stock para este pedido» ni «💡 Marcar…» en esos tres', r.slice(0,3).every(x=>!x.hay.length), r.slice(0,3).map(x=>x.hay));
  chk('2g «sin revisar» al lado del nombre', /sin revisar/.test(r[0].mc) && /sin revisar/.test(r[1].mc), [r[0].mc, r[1].mc]);
  chk('2h el COLCHON PRUEBA (3, hay 1): brilla «✗ No hay» y al lado del nombre «⚠️ faltan 2 → fabricar»', r[3].brilla.length===1 && /No hay/.test(r[3].brilla[0]) && /faltan 2 → fabricar/.test(r[3].mc), { s:r[3].brilla, mc:r[3].mc });
  chk('2i una leyenda arriba: «💡 brilla lo que dice el stock…»', /brilla/.test(r[4].ley) && /número/.test(r[4].ley), r[4].ley);

  console.log('\n── 3. Tocar el que brilla = «💡 Marcar…» ──');
  let t=await page.evaluate(async()=>{
    window._SAV=[]; var b=document.querySelectorAll('#modal-box .fl-prod')[1].querySelector('.fb-sug'); b.click(); await new Promise(r=>setTimeout(r,80));
    var x=findById('t1').productos[1]; return { m:[x.chk, x.chkDe||''], sav:window._SAV.slice(), abierta:document.getElementById('modal').classList.contains('on') };
  });
  chk('3a el somier queda «✔ PTF» (sin depósito aparte) y se guarda; la ficha sigue abierta', t.m[0]==='ok' && !t.m[1] && t.sav.indexOf('t1')>=0 && t.abierta, t);
  r=await ver('t1');
  chk('3b ya no brilla y «✔ PTF» queda prendido', r[1].brilla.length===0, r[1].brilla);

  console.log('\n── 4. Los demás botones hacen lo de siempre ──');
  t=await page.evaluate(async()=>{
    var pr=document.querySelectorAll('#modal-box .fl-prod')[0];
    var bMor=[].filter.call(pr.querySelectorAll('.fb-bar .chkbtn'), function(b){ return /Moreno/.test(b.textContent); })[0]; bMor.click(); await new Promise(r=>setTimeout(r,80));
    var x=findById('t1').productos[0]; var a={ prod:enProduccion(x), en:x.prodEn };
    pr=document.querySelectorAll('#modal-box .fl-prod')[0];
    var bNo=[].filter.call(pr.querySelectorAll('.fb-bar .chkbtn'), function(b){ return /No hay/.test(b.textContent); })[0]; bNo.click(); await new Promise(r=>setTimeout(r,80));
    x=findById('t1').productos[0]; return Object.assign(a, { chk:x.chk });
  });
  chk('4a «🏭 Moreno» lo marca pedido a fábrica Moreno', t.prod && t.en==='Moreno', t);
  chk('4b «✗ No hay» (sin brillar) marca «no hay», como el ✗ de siempre', t.chk==='no', t);

  console.log('\n── 5. Sin Excel y propuesta repartida ──');
  t=await page.evaluate(()=>{ var p=findById('r1'), F=fichaBarraHtml(p, p.productos[0], 0, { i:0, sinContar:true, cambia:false }), d=document.createElement('div'); d.innerHTML=F.bar+F.hay;
    return { hay:F.hay.replace(/<[^>]+>/g,''), nums:d.querySelectorAll('.fb-n').length, brilla:F.brilla }; });
  chk('5a un producto que no está en ningún Excel: el texto de siempre y sin números en los botones', /No está en los Excel de hoy/.test(t.hay) && t.nums===0 && !t.brilla, t);
  r=await ver('r1');
  chk('5b el TITANIO (3: PTF 1 + Banzer 2): nada brilla y queda «💡 Marcar ✔ PTF + Banzer»', r[1].brilla.length===0 && /Marcar ✔ PTF \+ .*Banzer/.test(r[1].hay.join(' ')), { s:r[1].brilla, h:r[1].hay });
  chk('5c los números del TITANIO: PTF 1 y Banzer 2', /^✔ PTF ?1$/.test(r[1].botones[0]) && r[1].botones.some(b=>/✔ Banzer ?2$/.test(b)), r[1].botones);

  chk('sin errores en la página', errs.length===0, errs);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
