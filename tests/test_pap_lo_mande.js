/* ✓ «LO MANDÉ»: EL PEDIDO A PRODUCCIÓN QUEDA ANOTADO (15/11/2026, mejora 313; dueño: «313»).
   Desde el 27/10 no se anotó ningún «Ya pedí»: logística manda su pedido por Excel y correo y el Plan vuelve a pedir lo ya pedido.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin `PAP_MANDE_PRUEBA`, copiar para la fábrica no pregunta nada (como siempre).
   2. Con la bandera, después de «📋 Copiar para Industrias Moreno»: «¿Lo mandaste a Industrias Moreno?» con cada producto y la cantidad
      copiada (corregible). Mirar no guarda nada.
   3. Una cantidad que no es un número entero frena con aviso y no anota; «Todavía no» cierra sin anotar.
   4. «✓ Sí, anotar»: un «Ya pedí» de hoy por producto (id `fy:`, la cantidad corregida, `esp` con la regla del cuadrito), UN guardado del
      stock, la tarjeta dice cuántos y cuándo llegan, y el Plan los ve «🚚 Ya pedido» (ya no pide).
   5. «↩️ Deshacer» saca lo anotado.
   6. La casilla «Ya pedí» del Plan sigue igual (la misma anotación).
   Datos SINTÉTICOS. Reloj clavado el jueves 05/11/2026 a las 10:00. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_pap_lo_mande.js */
const { chromium } = require('playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport:{ width:1366, height:950 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.setFixedTime(new Date('2026-11-05T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(500);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  const armar = () => ev(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; refrescarEstado=function(){ return Promise.resolve(true); }; CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    loadFromServer=function(){};
    try{ localStorage.removeItem(LS_PEND); }catch(e){}
    var hoy=todayStr(), f=proximoDiaEntrega(), n=0;
    var k1=stockInfo({ desc:'TITANIO LATEX', medida:'140x190', codigo:'CH1129' }).k, k2=stockInfo({ desc:'TITANIO LATEX', medida:'160x190', codigo:'CH1130' }).k;
    var u={}; u[k1]=0; u[k2]=0;
    STOCK=leerStock({ observaciones:JSON.stringify({ c:{ f:hoy, hora:'08:00', u:u, solo0:true, t:Date.parse(hoy+'T08:05:00-04:00') }, e:[], p:[], a:{}, g:{}, al:{} }) });
    STOCK_CARGADO=true;
    var P=function(id, prods){ n++; return { id:id, oc:'11-'+(300+n), cliente:'CLIENTE '+id.toUpperCase(), fecha:f, turno:'AM', vendedor:'Mirian Salazar', zona:'Norte', direccion:'Calle '+n,
      productos:prods.map(function(x){ return { desc:x[0], medida:x[1], codigo:x[2]||'', cant:x[3] }; }), entregado:false, ts:Date.parse(hoy+'T07:00:00-04:00')-n*1000, rev:2, fotos:[] }; };
    STATE=[ P('t1', [['TITANIO LATEX','140x190','CH1129',3]]), P('t2', [['TITANIO LATEX','160x190','CH1130',2]]) ];
    window._env=[];
    apiPost=function(pl){ var c=JSON.parse(JSON.stringify(pl)); window._env.push(c);
      if(c.action==='save'){ var p=Object.assign({}, c.pedido, { rev:(Number(c.pedido.rev)||0)+1 }); return Promise.resolve({ ok:true, version:'2026-11-14-a', pedido:p, mode:'update', ahora:Date.now() }); }
      return Promise.resolve({ ok:true }); };
    window.__k1=k1; window.__k2=k2;
    abrirPap();
    return { k1:k1, k2:k2 };
  });
  const listo = () => ev(async () => { for(var i=0;i<40;i++){ if(PAP && PAP.TODAS) return true; await new Promise(function(ok){ setTimeout(ok, 50); }); } return false; });
  const copiar = () => ev(async () => {
    var F=PAP.FABS.filter(function(x){ return /Moreno/.test(x.nombre); })[0];
    var b=document.querySelector('#pap-overlay [data-pap-copiar-fab="'+F.k+'"]'); b.click();
    await new Promise(function(ok){ setTimeout(ok, 120); });
    var m=document.getElementById('pap-mande');
    return { fk:F.k, mande:!!m, txt:m?m.innerText.replace(/\s+/g,' '):'', inputs:m?[].map.call(m.querySelectorAll('.pap-mn-u'), function(i){ var d=i.getAttribute('data-id'); return d.slice(d.indexOf('|')+1)+'='+i.value; }):[],
      sem:PAP.TODAS.map(function(f){ return f.k+'='+f.sem; }), env:window._env.length, p:(STOCK.p||[]).length };
  });

  let K = await armar();
  console.log('\n── 1. Sin la bandera ──');
  chk('«Pedido a producción» calculó', await listo(), '');
  let r = await copiar();
  chk('copiar para Industrias Moreno no pregunta nada (como siempre)', !r.mande && r.env===0, r);

  console.log('\n── 2. Con la bandera: «¿Lo mandaste?» ──');
  await ev(() => { window.PAP_MANDE_PRUEBA=1; PAP_MANDE=null; });
  r = await copiar();
  chk('después de copiar: «¿Lo mandaste a Industrias Moreno?»', r.mande && /¿Lo mandaste a Industrias Moreno\?/.test(r.txt), r.txt);
  chk('con cada producto y la cantidad copiada (7 días: 3 y 2)', r.inputs.indexOf(K.k1+'=3')>=0 && r.inputs.indexOf(K.k2+'=2')>=0, { inputs:r.inputs, sem:r.sem });
  chk('y «✓ Sí, anotar los 2 como pedidos hoy · llegan ~…» y «Todavía no»; mirar no guardó nada', /Sí, anotar los 2 como pedidos hoy · llegan ~/.test(r.txt) && /Todavía no/.test(r.txt) && r.env===0 && r.p===0, r.txt);

  console.log('\n── 3. Lo que no se anota ──');
  r = await ev(async (K) => {
    var i=[].filter.call(document.querySelectorAll('#pap-mande .pap-mn-u'), function(x){ var d=x.getAttribute('data-id'); return d.slice(d.indexOf('|')+1)===K.k2; })[0];
    i.value='dos'; i.dispatchEvent(new Event('change'));
    document.querySelector('#pap-overlay [data-pap="mande-si"]').click();
    await new Promise(function(ok){ setTimeout(ok, 80); });
    return { p:(STOCK.p||[]).length, err:i.classList.contains('err'), toast:(document.getElementById('toast')||{}).innerText||'', env:window._env.length };
  }, K);
  chk('«dos» no es un número: frena con aviso y no anota', r.p===0 && r.err && /tiene que ser un número entero/.test(r.toast) && r.env===0, r);
  r = await ev(async () => { document.querySelector('#pap-overlay [data-pap="mande-no"]').click(); await new Promise(function(ok){ setTimeout(ok, 80); }); return { m:!!document.getElementById('pap-mande'), p:(STOCK.p||[]).length }; });
  chk('«Todavía no» cierra sin anotar', !r.m && r.p===0, r);

  console.log('\n── 4. «✓ Sí, anotar» ──');
  await copiar();
  r = await ev(async (K) => {
    var i=[].filter.call(document.querySelectorAll('#pap-mande .pap-mn-u'), function(x){ var d=x.getAttribute('data-id'); return d.slice(d.indexOf('|')+1)===K.k2; })[0];
    i.value='5'; i.dispatchEvent(new Event('change'));
    window._env=[];
    document.querySelector('#pap-overlay [data-pap="mande-si"]').click();
    for(var n=0;n<40;n++){ if(PAP && PAP.TODAS) break; await new Promise(function(ok){ setTimeout(ok, 50); }); }
    await new Promise(function(ok){ setTimeout(ok, 100); });
    var Q=(STOCK.p||[]).filter(function(q){ return q.ya; }).map(function(q){ return { id:q.id, k:q.k, u:q.u, f:q.f, esp:q.esp, fab:q.fab }; });
    var m=document.getElementById('pap-mande');
    var o1=stockData().lista.filter(function(o){ return o.k===K.k1; })[0];
    return { Q:Q, saves:window._env.filter(function(c){ return c.action==='save'; }).map(function(c){ return c.pedido.id; }), txt:m?m.innerText.replace(/\s+/g,' '):'', aviso:o1.aviso, fab:o1.fabricar, acc:sfAccion(o1) };
  }, K);
  chk('un «Ya pedí» de hoy por producto, con la cantidad corregida (3 y 5) e id fy:', r.Q.length===2 && r.Q.every(function(q){ return /^fy:/.test(q.id) && q.f==='2026-11-05' && q.fab==='MORENO'; }) &&
    r.Q.filter(function(q){ return q.k===K.k1; })[0].u===3 && r.Q.filter(function(q){ return q.k===K.k2; })[0].u===5, r.Q);
  chk('llegan con la regla del cuadrito (pedido el jue 05/11 antes de las 16:30 → se entrega desde el lun 09/11)', r.Q.every(function(q){ return q.esp==='2026-11-09'; }), r.Q.map(function(q){ return q.esp; }));
  chk('UN guardado del stock', r.saves.length===1 && r.saves[0]==='__stock__', r.saves);
  chk('la tarjeta dice cuántos y cuándo llegan', /Anotados 2 productos \(8 u\) pedidos el jue(ves)? 05\/11 · llegan ~lun(es)? 09\/11/.test(r.txt) && /Deshacer/.test(r.txt), r.txt);
  chk('el Plan ya no lo pide: «🚚 Ya pedido»', r.aviso==='pedido' && r.fab===0 && /Ya pedido/.test(r.acc), { aviso:r.aviso, fab:r.fab, acc:r.acc });

  console.log('\n── 5. «↩️ Deshacer» ──');
  r = await ev(async () => {
    window._env=[];
    document.querySelector('#pap-overlay [data-pap="mande-deshacer"]').click();
    await new Promise(function(ok){ setTimeout(ok, 200); });
    return { p:(STOCK.p||[]).filter(function(q){ return q.ya; }).length, saves:window._env.filter(function(c){ return c.action==='save'; }).length, m:!!document.getElementById('pap-mande') };
  });
  chk('saca lo anotado (un guardado) y la tarjeta se va', r.p===0 && r.saves===1 && !r.m, r);

  console.log('\n── 6. La casilla del Plan sigue igual ──');
  r = await ev((K) => { cerrarPap(); planYaPedi(K.k1, true); var q=(STOCK.p||[]).filter(function(x){ return x.ya && x.k===K.k1; }); return q.map(function(x){ return { id:x.id, u:x.u, esp:x.esp }; }); }, K);
  chk('«Ya pedí» del Plan anota lo de «Pedir 7 días» con el mismo id fy: y la misma llegada', r.length===1 && /^fy:/.test(r[0].id) && r[0].u===3 && r[0].esp==='2026-11-09', r);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
