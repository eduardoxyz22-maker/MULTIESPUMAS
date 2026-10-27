/* 🗂️🔔📈 LA 3, LA 10 Y LA 11 DEL MUESTRARIO (§4ni, 27/10; dueño: «Además quiero: 3, 10, 11»).
   Lo que cuida esta prueba:
   3. La ficha de Administración en la compu se abre a la DERECHA (la misma ficha, no otra más chica), los pedidos quedan a la vista a la
      izquierda con el elegido marcado, ◀ ▶ pasa al siguiente sin cerrar, cerrar devuelve todo; en el celular y fuera de Administración,
      en el medio como siempre; cualquier otra ventana va al medio; `me_ficha_costado`='0' la apaga.
   10. La campanita «En vivo»: solo para Administración/logística (no los vendedores); lo de HOY (pedidos cargados, entregas del cierre,
      pagos de ventas de otro día, el Excel, el camión que salió), lo más nuevo arriba; el número = lo no visto; al abrirla se ve todo y
      el número se va; cada renglón abre su pedido.
   11. El MoM: cada vendedor en Proyección con su línea y el % contra el mes anterior A LA MISMA ALTURA (las cuentas a mano), sin
      romper el texto de la fila; «Tu mes» en Tu día con la línea y «▲ N% más que septiembre a esta altura».
   Reloj clavado: viernes 23/10/2026 15:00 de Bolivia.   Se corre:  node tests/test_mejoras_3_10_11.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const HOY = '2026-10-23T15:00:00-04:00';

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  loadFromServer=function(){};
  window.FERIADOS_PASADOS={};
  var n=0;
  /* Una venta: `bs` su total (como saldo), `fecha` la entrega agendada, `reg` cuándo se cargó (día y hora de Bolivia). */
  window.V=function(vend, fecha, bs, reg, o){
    o=o||{}; n++;
    return Object.assign({ id:'p'+n, oc:'10-'+(100+n), nota:String(500+n), vendedor:vend, cliente:'CLIENTE '+n, fecha:fecha, turno:'AM',
      productos:[{desc:'COLCHON SOFT',medida:'140x190',cant:1}], saldo:bs, acuenta:0, pagado:false, metodoPago:'', entregado:false,
      ts:new Date(reg+(reg.length===10?'T10:00:00':'')+'-04:00').getTime(), rev:new Date(reg+(reg.length===10?'T10:00:00':'')+'-04:00').getTime(), fotos:[] }, o);
  };
  window.FIX=function(){ n=0; return [
    // Mirian: septiembre 1.000 (día 5) + 2.000 (día 20) + 3.000 (día 28) = 6.000; al día 23 iba 3.000. Octubre 1.500 (día 3) + 2.400 (hoy) = 3.900 → +30 %.
    V('Mirian Salazar','2026-09-08',1000,'2026-09-05'), V('Mirian Salazar','2026-09-24',2000,'2026-09-20'), V('Mirian Salazar','2026-09-30',3000,'2026-09-28'),
    V('Mirian Salazar','2026-10-06',1500,'2026-10-03'), V('Mirian Salazar','2026-10-27',2400,'2026-10-23T09:12:00'),
    // Maria: septiembre 4.000 (día 2), octubre 2.000 (día 8) → −50 %.
    V('Maria Flores','2026-09-04',4000,'2026-09-02'), V('Maria Flores','2026-10-12',2000,'2026-10-08'),
    // Hoy: Maria cargó otra a las 11:40 (para noviembre: no cambia octubre)
    V('Maria Flores','2026-11-03',5000,'2026-10-23T11:40:00'),
    // Una entrega marcada en el cierre de hoy a las 14:20, y un pago de hoy de una venta de otro día
    V('Carola Chavez','2026-10-23',3000,'2026-10-20', { entregado:true, productos:[{desc:'TITANIO LATEX',medida:'140x190',cant:1,eF:'2026-10-23',eT:new Date('2026-10-23T14:20:00-04:00').getTime(),eQ:'Ernesto Logística'}] }),
    V('Carola Chavez','2026-10-25',2000,'2026-10-19', { metodoPago:'Efectivo 800 @2026-10-23 #1200', acuenta:0, saldo:1200, rev:new Date('2026-10-23T13:05:00-04:00').getTime() })
  ]; };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  async function abrir(w, init){
    const ctx = await browser.newContext({ viewport:{ width:w||1440, height:900 }, timezoneId:'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r=>r.abort());
    await ctx.addInitScript(init || (()=>{}));
    const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.dismiss());
    await page.clock.setFixedTime(new Date(HOY));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(350);
    await page.evaluate(PREPARAR);
    page._ctx=ctx; return page;
  }

  // ═══ 11 · El MoM en Proyección ═══
  console.log('\n── 11. El MoM de cada vendedor (Proyección) y «Tu mes» (Tu día) ──');
  let page = await abrir();
  let r = await page.evaluate(() => {
    STATE=FIX(); UNLOCKED=true; showView('conta'); segSet('cta-tab','proy'); setContaTab('proy');
    document.getElementById('pry-mes').value='2026-10'; renderProyeccion();
    var filas=[].slice.call(document.querySelectorAll('#pry-vendedores .pry-fila')).map(function(f){ return { t:f.innerText.replace(/\s+/g,' '), mom:(f.querySelector('.pry-mom small')||{}).textContent||'', svg:!!f.querySelector('.pry-mom svg polyline') }; });
    var R=proyeccionMes('2026-10'), A=pryAltura(R), fM=R.marcas.reduce(function(a,m){ return a.concat(m.g ? [] : []); },[]);
    var mir=null, mar=null; [].concat.apply([], R.marcas.map(function(m){ return m.filas||[]; })).concat(R.sinMarca.filas).forEach(function(x){ if(/Mirian/.test(x.vendedor)) mir=pryMomDe(R,A,x); if(/Maria/.test(x.vendedor)) mar=pryMomDe(R,A,x); });
    return { filas:filas, mir:mir && { act:mir.act, ant:mir.ant, cur:mir.cur.v.length, prev:mir.prev.v.length }, mar:mar && { act:mar.act, ant:mar.ant }, cmp:A.cmp, dia:A.dia };
  });
  const fMir=r.filas.find(f=>/Mirian Salazar/.test(f.t)), fMar=r.filas.find(f=>/Maria Flores/.test(f.t));
  chk('11 · comparado con septiembre, al día 23', r.cmp==='2026-09' && r.dia===23, [r.cmp, r.dia]);
  chk('11 · Mirian: octubre 3.900 contra 3.000 de septiembre a esta altura (sin los 3.000 del 28/09)', r.mir && r.mir.act===3900 && r.mir.ant===3000, r.mir);
  chk('11 · …dice «▲ 30% vs sep.» con su línea', fMir && /▲ 30% vs sep/.test(fMir.mom) && fMir.svg, fMir);
  chk('11 · …la línea de octubre llega hasta hoy (23 días) y la de septiembre entera (30)', r.mir && r.mir.cur===23 && r.mir.prev===30, r.mir);
  chk('11 · Maria: 2.000 contra 4.000 → «▼ 50%» (lo cargado hoy para noviembre no entra en octubre)', r.mar && r.mar.act===2000 && r.mar.ant===4000 && fMar && /▼ 50% vs sep/.test(fMar.mom), [r.mar, fMar && fMar.mom]);
  chk('11 · la fila se sigue leyendo igual: nombre, detalle, lo vendido y la proyección, y el MoM al final', fMir && /^Mirian Salazar \d+ venta.*Bs 3\.900,00 📈 Bs [\d.]+ ▲ 30% vs sep/.test(fMir.t), fMir && fMir.t);
  r = await page.evaluate(() => { document.getElementById('pry-mes').value='2026-09'; renderProyeccion(); var f=[].slice.call(document.querySelectorAll('#pry-vendedores .pry-fila')).find(function(x){ return /Mirian/.test(x.innerText); }); return f ? f.innerText.replace(/\s+/g,' ') : ''; });
  chk('11 · un mes sin el anterior en el panel (septiembre: agosto vacío) no inventa un %', /Mirian Salazar/.test(r) && !/vs ago/.test(r), r);
  await page._ctx.close();

  // «Tu mes» en Tu día
  page = await abrir(1440, ()=>{ window.MIS_TOP_PRUEBA=1; });
  r = await page.evaluate(async () => {
    STATE=FIX(); showView('mis'); var s=document.getElementById('mis-vendedor'); s.value='Mirian Salazar'; renderMis();
    await new Promise(function(r){ setTimeout(r,200); });
    var t=document.getElementById('mis-top'); return { svg:!!(t && t.querySelector('.td-linea polyline')), alt:((t && t.querySelector('.td-alt'))||{}).textContent||'', big:((t && t.querySelector('.td-big'))||{}).textContent||'', bar:!!(t && t.querySelector('.td-prog')) };
  });
  chk('11 · Tu día: la línea del mes en vez de la barrita', r.svg && !r.bar, r);
  chk('11 · …y «▲ 30% más que septiembre a esta altura» (las ventas de Mirian por el mes de la entrega)', /▲ 30% más que septiembre a esta altura/.test(r.alt) && /3\.900/.test(r.big), r);
  r = await page.evaluate(async () => { STATE=[]; var s=document.getElementById('mis-vendedor'); s.value='Mirian Salazar'; renderMis(); await new Promise(function(r){ setTimeout(r,150); });
    var t=document.getElementById('mis-top'); return t ? !!t.querySelector('.td-linea') : 'sin tu día'; });
  chk('11 · sin ventas de este mes ni del pasado, nada de línea', r!==true, r);
  await page._ctx.close();

  // ═══ 10 · La campanita ═══
  console.log('\n── 10. «En vivo»: la campanita de arriba ──');
  page = await abrir(1440, ()=>{ window.VIVO_PRUEBA=1; });
  r = await page.evaluate(() => { STATE=FIX(); UNLOCKED=false; try{ localStorage.removeItem('me_quien'); }catch(e){} vivoPintar(); return document.getElementById('vivo-btn').hidden; });
  chk('10 · un vendedor (sin la clave) no la ve', r===true, r);
  r = await page.evaluate(() => {
    STATE=FIX(); UNLOCKED=true; try{ localStorage.removeItem('me_vivo_visto'); }catch(e){}
    STOCK.h=[{ id:'PTF|2026-10-23|09:52', f:'2026-10-23', hora:'09:52:00', alm:'', ts:new Date('2026-10-23T10:05:00-04:00').getTime() }];
    vivoPintar(); var b=document.getElementById('vivo-btn');
    return { vis:!b.hidden, n:document.getElementById('vivo-n').textContent, nh:document.getElementById('vivo-n').hidden, L:VIVO.L.map(function(x){ return x.k.split('|')[0]+':'+x.h.replace(/<[^>]+>/g,''); }) };
  });
  chk('10 · con la clave aparece, con el número de lo nuevo', r.vis && !r.nh && r.n==='5', r);
  chk('10 · lo más nuevo arriba: la entrega (14:20), el pago (13:05), Maria (11:40), el Excel (10:05) y Mirian (09:12)', r.L[0]==='e:Entregado: CLIENTE 9 · 10-109 · lo marcó Ernesto' && /^p:Pago de Bs 800,00 · CLIENTE 10/.test(r.L[1]) && /^n:Maria cargó CLIENTE 8 · 10-108 · Bs 5\.000/.test(r.L[2]) && /^x:Se subió el Excel de PTF \(corte 09:52\)/.test(r.L[3]) && /^n:Mirian cargó CLIENTE 5/.test(r.L[4]), r.L);
  chk('10 · lo cargado otro día no entra (solo lo de hoy)', r.L.length===5, r.L.length);
  await page.click('#vivo-btn'); await page.waitForTimeout(250);
  r = await page.evaluate(() => ({ abierta:!document.getElementById('vivo-drop').hidden, its:document.querySelectorAll('#vivo-drop .vivo-it').length, nuevos:document.querySelectorAll('#vivo-drop .vivo-it.nuevo').length, nh:document.getElementById('vivo-n').hidden }));
  chk('10 · al tocarla se despliega con todo marcado como nuevo y el número se va', r.abierta && r.its===5 && r.nuevos===5 && r.nh, r);
  await page.evaluate(() => { window.__ab=[]; window.showPedidoModal=function(id){ __ab.push(id); }; });
  await page.click('#vivo-drop .vivo-it'); await page.waitForTimeout(150);
  r = await page.evaluate(() => ({ ab:__ab.slice(), cerrada:document.getElementById('vivo-drop').hidden }));
  chk('10 · un renglón abre su pedido y cierra la lista', r.ab.join()==='p9' && r.cerrada, r);
  r = await page.evaluate(() => { vivoPintar(); return { n:document.getElementById('vivo-n').hidden }; });
  chk('10 · lo visto no vuelve a contar (en este aparato)', r.n===true, r);
  r = await page.evaluate(() => { STATE=STATE.concat([V('Isabel Robledo','2026-10-28',1800,'2026-10-23T14:55:00')]); vivoPintar(); var b=document.getElementById('vivo-btn'); return { n:document.getElementById('vivo-n').textContent, suena:b.classList.contains('suena') }; });
  chk('10 · algo nuevo: el número vuelve (1) y la campanita se mueve', r.n==='1' && r.suena, r);
  await page._ctx.close();
  page = await abrir(1440);
  r = await page.evaluate(() => { STATE=FIX(); UNLOCKED=true; vivoPintar(); return document.getElementById('vivo-btn').hidden; });
  chk('10 · en las pruebas (sin VIVO_PRUEBA) no aparece', r===true, r);
  await page._ctx.close();

  // ═══ 3 · La ficha al costado ═══
  console.log('\n── 3. La ficha al costado ──');
  const costado = async (w, prep) => {
    const p = await abrir(w, ()=>{ window.FICHA_COSTADO_PRUEBA=1; window.ADM_FICHAS_PRUEBA=1; });
    await p.evaluate(() => { var hoy='2026-10-23';
      STATE=[V('Maria Flores',hoy,1000,'2026-10-20'), V('Maria Flores',hoy,2000,'2026-10-20'), V('Maria Flores',hoy,3000,'2026-10-20')];
      UNLOCKED=true; var lk=document.getElementById('admin-lock'); if(lk) lk.style.display='none'; var ac=document.getElementById('admin-content'); if(ac) ac.style.display='block';
      showView('admin'); try{ ADM_FILTRO && (ADM_FILTRO.q=''); }catch(e){} renderAdmin(); });
    if(prep) await p.evaluate(prep);
    await p.waitForTimeout(200); return p;
  };
  page = await costado(1440);
  r = await page.evaluate(() => {
    var f=document.querySelector('.af-f[data-pid="p2"]'); if(!f) return { sinFicha:true, n:document.querySelectorAll('.af-f').length };
    f.click();
    var ov=document.getElementById('modal').getBoundingClientRect(), box=document.getElementById('modal-box'), lista=f.getBoundingClientRect();
    return { on:document.body.classList.contains('ficha-costado'), fl:box.classList.contains('fl-ficha'), izq:Math.round(ov.left), ancho:Math.round(ov.width), w:innerWidth,
             sel:[].map.call(document.querySelectorAll('.af-sel'), function(x){ return x.getAttribute('data-pid'); }), listaVisible:lista.right<=ov.left+2, cli:/CLIENTE 2/.test(box.innerText) };
  });
  chk('3 · en la compu, desde Administración, la ficha (la MISMA, fl-ficha) se abre a la derecha', r.on && r.fl && r.cli && r.izq>r.w*0.3 && r.izq+r.ancho>=r.w-1, r);
  chk('3 · …la lista queda a la vista a la izquierda, con el pedido elegido marcado', r.listaVisible && r.sel.join()==='p2', r);
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200);
  r = await page.evaluate(() => ({ on:document.body.classList.contains('ficha-costado'), sel:[].map.call(document.querySelectorAll('.af-sel'), function(x){ return x.getAttribute('data-pid'); }), cli:/CLIENTE 3/.test(document.getElementById('modal-box').innerText) }));
  chk('3 · ▶ (la flecha) pasa al siguiente sin cerrar: sigue al costado y se marca el nuevo', r.on && r.cli && r.sel.join()==='p3', r);
  r = await page.evaluate(() => { openModal('<div class="modal-h"><h3>Otra ventana</h3></div>'); var x=document.body.classList.contains('ficha-costado'); closeModal(); return x; });
  chk('3 · cualquier otra ventana va al medio', r===false, r);
  r = await page.evaluate(() => { document.querySelector('.af-f[data-pid="p1"]').click(); closeModal(); return { on:document.body.classList.contains('ficha-costado'), sel:document.querySelectorAll('.af-sel').length }; });
  chk('3 · cerrar la ficha devuelve todo como estaba', !r.on && r.sel===0, r);
  r = await page.evaluate(() => { localStorage.setItem('me_ficha_costado','0'); document.querySelector('.af-f[data-pid="p1"]').click(); var x=document.body.classList.contains('ficha-costado'); closeModal(); localStorage.removeItem('me_ficha_costado'); return x; });
  chk('3 · con me_ficha_costado=0, en el medio', r===false, r);
  r = await page.evaluate(() => { showView('mis'); showPedidoModal('p1'); var x=document.body.classList.contains('ficha-costado'); closeModal(); return x; });
  chk('3 · fuera de Administración, en el medio', r===false, r);
  await page._ctx.close();
  page = await costado(820);
  r = await page.evaluate(() => { var f=document.querySelector('.af-f[data-pid="p1"]'); if(f) f.click(); else showPedidoModal('p1'); var x=document.body.classList.contains('ficha-costado'); closeModal(); return x; });
  chk('3 · en el iPad parado (820 px), en el medio como siempre', r===false, r);
  await page._ctx.close();
  page = await abrir(1440, ()=>{ window.ADM_FICHAS_PRUEBA=1; });
  r = await page.evaluate(() => { STATE=FIX(); UNLOCKED=true; showView('admin'); showPedidoModal('p1'); var x=document.body.classList.contains('ficha-costado'); closeModal(); return x; });
  chk('3 · en las pruebas (sin FICHA_COSTADO_PRUEBA) en el medio: las de siempre no cambian', r===false, r);
  await page._ctx.close();

  chk('sin errores de JavaScript', !errores.length, errores.slice(0,3));
  await browser.close();
  console.log(`\n${PASS} bien · ${FAIL} mal`);
  process.exit(FAIL ? 1 : 0);
})();
