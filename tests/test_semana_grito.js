/* 📣 (27/10) Bloki le grita a logística lo que falta del stock de la semana. El dueño: *«Bloki en logística/administración debería
   gritarle a Ernesto si son las 16:00 y aún no ven esos pedidos que falten productos y estamos justo a 4 días, o los plazos que
   definimos»*; y (27/10): *«no exactamente 4, sino los plazos que ya tenemos definidos… ¿y si lo abren a las 4:30 o a las 5?»*.
   Reloj clavado: JUEVES 29/10/2026, desde las 15:50 de Bolivia. Los plazos del cuadrito: lo pedido hoy antes de las 16:30 sale de
   fábrica el sábado 31/10 (48 h; ese día se recoge) y se entrega desde el martes 03/11 (el lunes 02/11 es feriado); lo pedido mañana,
   desde el miércoles 04/11. Lo ⬜ sin revisar o 🔴 sin pedir que se entrega ANTES del 04/11 hay que pedirlo hoy (lo del viernes 30, si
   hay que fabricarlo, ya no llega). Pasado el corte, lo pedido arranca el viernes y se entrega desde el 04/11: entra también el 04/11.
   9. Si logística abre el panel tarde (16:31, 17:00), Bloki grita apenas abre; a un vendedor, nunca.
   Lo que cuida:
   1. Antes de las 16:00 no grita; Bloki ya lo tiene en sus avisos de logística (con la lista y «🗓️ Ver la semana»).
   2. A las 16:00 GRITA (el mismo grito del anuncio: pantalla, Bloki con el megáfono, sirena y voz) con «¡Ernesto!», cuántos son, de qué
      días y clientes, y los botones «Ver cuáles», «Revisión automática» y «Entendido». Solo lo del plazo (no lo del 05/11, ni lo pedido
      a producción, ni lo que tiene stock).
   3. «Entendido» lo cierra; no vuelve a gritar antes de 15 minutos, y a los 15 sí. Pasadas las 16:30 dice que lo pedido empieza mañana.
   4. Recargar la página no lo hace gritar de nuevo antes de tiempo (la hora queda en el aparato).
   5. Un vendedor no lo escucha. Con 🔇, sale sin sirena ni voz. Sin nada pendiente, no grita.
   6. El anuncio de Administración va primero; el grito de la semana espera a que se cierre. Sin anuncio, el reloj no cierra este grito.
   7. «Ver cuáles» lleva a Administración con el botón «Semana» puesto y solo lo que falta.
   8. El sábado grita desde las 11:30 (corte de las 12:00); el domingo y los feriados, no.
   Datos SINTÉTICOS.  Se corre:  node tests/test_semana_grito.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

function VOZ_DE_MENTIRA(){
  window.ASIS_PRUEBA=1;
  window._habla=[]; window._cancel=0; window._hablaMs=60000;   // habla un buen rato: mientras habla, el grito no se cierra solo
  var voces=[{ name:'Jorge', lang:'es-MX' }];
  Object.defineProperty(window, 'speechSynthesis', { configurable:true, value:{
    speak:function(u){ window._habla.push({ t:u.text, lang:u.lang });
      setTimeout(function(){ if(u.onstart) u.onstart(); }, 10); setTimeout(function(){ if(u.onend) u.onend(); }, window._hablaMs); },
    cancel:function(){ window._cancel++; }, getVoices:function(){ return voces; } } });
  window.SpeechSynthesisUtterance=function(t){ this.text=t; };
}
function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  var q=document.getElementById('quien'); if(q) q.hidden=true;
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR=''; ULTIMO_REFRESCO=Date.now();
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  loadFromServer=function(){};
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
  apiSave=function(p){ var r=JSON.parse(JSON.stringify(p)); r.rev=(Number(r.rev)||0)+1; return Promise.resolve({ ok:true, pedido:r }); };
  try{ ['me_asis_vistos','me_asis_mudo','me_asis_tour','me_asis_preg','me_quien_rol','me_sem_grito','me_adm_dev'].forEach(function(k){ localStorage.removeItem(k); }); }catch(e){}
  window._pops=0; asisPop=function(){ window._pops++; };
  window._sirenas=0; anuncioSirena=function(){ window._sirenas++; return 1.32; };
  window.anuncioPuedeSonar=function(){ return true; };
  window.hwRisaAudio=null;
  var P=function(id, fecha, cliente, x){ return { id:id, oc:'OC 10-'+id, vendedor:'Maria Flores', cliente:cliente, fecha:fecha, turno:'AM', celular:'70000000', zona:'Norte',
    productos:[Object.assign({ desc:'COLCHON TITANIO', medida:'140x190', cant:1 }, x||{})], saldo:0, acuenta:0, pagado:true, metodoPago:'', entregado:false, ts:Date.now()-5*86400000, fotos:[] }; };
  window.FIX=function(){ return [
    P('u1','2026-10-30','PEREZ VIERNES', { chk:'' }),                                   // ⬜ en el plazo
    P('u2','2026-11-03','GOMEZ MARTES', { chk:'no' }),                                  // 🔴 en el plazo
    P('u3','2026-11-04','ROJAS MIERCOLES', { chk:'' }),                                 // ⬜ justo a 4 días hábiles
    P('u4','2026-11-05','LOPEZ JUEVES', { chk:'' }),                                    // fuera del plazo
    P('u5','2026-10-30','VACA LISTO', { chk:'ok' }),                                    // con stock
    P('u6','2026-10-30','SOSA FABRICA', { chk:'no', enProd:true, prodF:'2026-10-27' })  // ya pedido a producción
  ]; };
  window.GRITO=function(){ var g=document.getElementById('anu-grito');
    return { ve:!!g && !g.hidden, sem:!!g && g.classList.contains('ag-semana'), t:(document.getElementById('ag-t')||{}).textContent||'', x:(document.getElementById('ag-x')||{}).textContent||'',
      tag:((g && g.querySelector('.ag-tag'))||{}).textContent||'', bot:g ? [].map.call(g.querySelectorAll('.ag-acc button'), function(b){ return b.textContent.trim(); }) : [],
      mega:!!(g && g.querySelector('.ag-yo img[data-traje="anuncio"]')) }; };
  window.ERNESTO=function(){ return _habla.filter(function(h){ return /Ernesto/.test(h.t); }); };
  window._gritos=[]; var _g0=anuncioGrito; anuncioGrito=function(x){ if(x && x.semana) window._gritos.push(Date.now()); return _g0.apply(this, arguments); };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (hora) => {
    const page = await browser.newPage({ viewport:{ width:1280, height:900 }, timezoneId:'America/La_Paz' });
    page.on('pageerror', e => errores.push(e.message));
    page.on('dialog', d => d.accept());
    await page.route(/^https?:/, r => r.abort());
    await page.addInitScript(VOZ_DE_MENTIRA);
    await page.clock.install({ time:new Date('2026-10-29T'+(hora||'15:50:00')+'-04:00') });
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.clock.runFor(1700);
    await page.evaluate(PREPARAR);
    return page;
  };
  const ev = (page, fn, arg) => page.evaluate(fn, arg).catch(e => ({ error:String(e.message||e).slice(0,300) }));
  /* avanza el reloj de a 5 s hasta que Bloki grite otra vez (y deja 2,5 s para la sirena y la voz); devuelve la hora del grito en Bolivia */
  const hastaGrito = async (page, maxMin) => {
    const n0=await page.evaluate(()=>_gritos.length);
    for(let t=0; t<maxMin*60000; t+=5000){ await page.clock.runFor(5000);
      if(await page.evaluate(n=>_gritos.length>n, n0)){ await page.clock.runFor(2500);
        return await page.evaluate(()=>{ var d=new Date(_gritos[_gritos.length-1]); return ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)+':'+('0'+d.getSeconds()).slice(-2); }); } }
    return '';
  };

  /* ── 1. Antes de las 16:00 ── */
  console.log('\n── 1. Antes de las 16:00 ──');
  let page = await abrir('15:50:00');
  let r = await ev(page, () => {
    STATE=FIX(); UNLOCKED=false; quienRol('logistica');
    anuncioTic();
    var U=semanaUrgentes().map(function(l){ return l.p.id+':'+l.e; });
    var a=asisAvisos().filter(function(a){ return /^l-semana/.test(a.k); })[0]||null;
    return { U:U, grito:GRITO(), montado:!!ASIS.montado, a:a && { t:a.t, x:a.x, n:(a.lista||[]).length, b:a.b && a.b[0], sev:a.sev } };
  });
  chk('1 · lo que hay que pedir hoy (se entrega antes del miércoles 04/11): el ⬜ del viernes y el 🔴 del martes; el ⬜ del 04/11 puede esperar a mañana; no el del 05/11, ni lo pedido a producción, ni lo que tiene stock',
    JSON.stringify(r.U)===JSON.stringify(['u1:rev','u2:nohay']), r.U);
  chk('1 · a las 15:50 Bloki todavía no grita', r.montado && !r.grito.ve, r.grito);
  chk('1 · pero ya lo tiene en sus avisos de logística: rojo, con los 2 pedidos, los plazos y «🗓️ Ver la semana»',
    r.a && r.a.sev==='ro' && /2 productos sin revisar o sin pedir a producción: si no se piden hoy, no llegan a tiempo/.test(r.a.t) && r.a.n===2 && /Ver la semana/.test(r.a.b) &&
    /Lo que se pide hoy antes de las 16:30 sale de fábrica el sábado 31\/10/.test(r.a.x) && /Desde las 16:00 te lo grito/.test(r.a.x), r.a);

  /* ── 2. A las 16:00 grita ── */
  console.log('\n── 2. A las 16:00 ──');
  let hg=await hastaGrito(page, 12);
  if(process.env.SEM_CAP) await page.screenshot({ path:path.join(process.env.SEM_CAP, 'semana-grito.png'), animations:'disabled' });
  r = await ev(page, () => ({ g:GRITO(), voz:ERNESTO().map(function(h){ return h.t; }), sir:_sirenas }));
  chk('2 · a las 16:00 GRITA (no antes): pantalla entera con Bloki y el megáfono', /^16:00:(0|1)\d$/.test(hg) && r.g.ve && r.g.sem && r.g.mega, { hora:hg, ve:r.g.ve, sem:r.g.sem, mega:r.g.mega });
  chk('2 · «¡Ernesto! Hay 2 productos sin revisar o sin pedir a producción»', /¡Ernesto! Hay 2 productos sin revisar o sin pedir a producción/.test(r.g.t), r.g.t);
  chk('2 · dice qué días y de quién, y los plazos de siempre: pedido hoy antes de las 16:30 sale de fábrica el sábado 31/10 y se entrega desde el martes 03/11',
    /Si no se revisan y se piden hoy, no llegan a tiempo/.test(r.g.x) && /• viernes 30\/10: 1× COLCHON TITANIO 140×190 \(PEREZ VIERNES\)/.test(r.g.x) && /• martes 03\/11: .*GOMEZ MARTES/.test(r.g.x) &&
    /Lo que se pide hoy antes de las 16:30 sale de fábrica el sábado 31\/10 \(48 h, ese día se recoge\) y se entrega desde el martes 03\/11/.test(r.g.x) && !/ROJAS|LOPEZ|VACA|SOSA/.test(r.g.x), r.g.x);
  chk('2 · lo del viernes 30/10, si hay que fabricarlo, ya no llega aunque se pida ahora: lo dice', /Lo del viernes 30\/10, si hay que fabricarlo, ya no llega aunque se pida ahora: reprogramalo o avisale al cliente/.test(r.g.x), r.g.x);
  chk('2 · los botones: «🗓️ Ver cuáles», «🤖 Revisión automática» y «👍 Entendido»', JSON.stringify(r.g.bot)===JSON.stringify(['🗓️ Ver cuáles','🤖 Revisión automática','👍 Entendido']), r.g.bot);
  chk('2 · suena la sirena y la voz le habla a Ernesto (sin emojis)', r.sir>=1 && r.voz.length===1 && /^¡Ernesto! Hay 2 productos/.test(r.voz[0]) && /Si no se piden hoy antes de las 16:30, no llegan a tiempo/.test(r.voz[0]) && !/[\uD800-\uDFFF]/.test(r.voz[0]), r);
  r = await ev(page, () => { anuncioTic(); return GRITO().ve; });
  chk('2 · sin anuncio de Administración, el reloj no cierra este grito', r===true);

  /* ── 3. Entendido, 15 minutos y después de las 16:30 ── */
  console.log('\n── 3. Cada 15 minutos ──');
  r = await ev(page, () => { [].filter.call(document.querySelectorAll('#anu-grito .ag-acc button'), function(b){ return /Entendido/.test(b.textContent); })[0].click();
    return { ve:GRITO().ve, cancel:_cancel }; });
  chk('3 · «Entendido» lo cierra y lo calla', !r.ve && r.cancel>=1, r);
  await page.clock.runFor(5*60000);
  r = await ev(page, () => ({ ve:GRITO().ve, n:ERNESTO().length }));
  chk('3 · cinco minutos después no vuelve a gritar', !r.ve && r.n===1, r);
  hg=await hastaGrito(page, 12);
  r = await ev(page, () => ({ g:GRITO(), n:ERNESTO().length }));
  chk('3 · a los 15 minutos (16:15) grita de nuevo', /^16:15:/.test(hg) && r.g.ve && r.n===2, { hora:hg, ve:r.g.ve, n:r.n });
  await ev(page, () => anuncioGritoCerrar());
  hg=await hastaGrito(page, 17);
  r = await ev(page, () => ({ g:GRITO(), voz:ERNESTO().slice(-1)[0] }));
  chk('3 · a las 16:30 grita otra vez; pasado el corte lo pedido arranca el viernes y se entrega desde el 04/11, así que entra también lo del 04/11 (3 productos)',
    /^16:30:/.test(hg) && r.g.ve && /Hay 3 productos/.test(r.g.t) && /Ya pasaron las 16:30: lo que se pide ahora arranca el viernes 30\/10, sale de fábrica el martes 03\/11 .* y se entrega desde el miércoles 04\/11/.test(r.g.x) && !/antes de las 16:30/.test((r.voz||{}).t||''),
    { hora:hg, ve:r.g.ve, t:r.g.t, x:r.g.x.slice(-260), voz:(r.voz||{}).t });

  /* ── 4. Recargar no lo hace gritar de nuevo ── */
  r = await ev(page, () => { anuncioGritoCerrar(); SEMANA_GRITO_MEM={ d:'', t:0 }; anuncioTic(); return GRITO().ve; });
  chk('4 · como recién abierto (sin memoria): la hora guardada en el aparato frena el grito hasta que pasen 15 minutos', r===false);

  /* ── 5. Lo resuelven: deja de gritar ── */
  console.log('\n── 5. Resuelto ──');
  r = await ev(page, () => {
    findById('u1').productos[0].chk='ok'; findById('u3').productos[0].chk='ok';
    var x=findById('u2').productos[0]; x.enProd=true; x.prodF='2026-10-29';
    try{ localStorage.removeItem('me_sem_grito'); }catch(e){} SEMANA_GRITO_MEM={ d:'', t:0 };
    anuncioTic();
    return { ve:GRITO().ve, U:semanaUrgentes().length, a:asisAvisos().some(function(a){ return /^l-semana/.test(a.k); }) };
  });
  chk('5 · revisado y pedido a producción: no grita y el aviso de Bloki se va', !r.ve && r.U===0 && !r.a, r);
  await page.close();

  /* ── 6. A un vendedor no; con 🔇, callado ── */
  console.log('\n── 6. Vendedor y 🔇 ──');
  page = await abrir('16:05:00');
  r = await ev(page, () => {
    STATE=FIX(); UNLOCKED=false; quienRol(''); setVendedorMem('Maria Flores');
    anuncioTic();
    return { ve:GRITO().ve, av:asisAvisos().some(function(a){ return /^l-semana/.test(a.k); }) };
  });
  chk('6 · en el aparato de un vendedor no grita ni lo pone en sus avisos', !r.ve && !r.av, r);
  r = await ev(page, async () => {
    quienRol('admin'); localStorage.setItem('me_asis_mudo','1'); var s0=_sirenas;
    anuncioTic(); await new Promise(function(z){ setTimeout(z, 1800); });
    return { ve:GRITO().ve, sir:_sirenas-s0, n:ERNESTO().length };
  });
  await page.clock.runFor(2000);
  chk('6 · en Administración sí; con 🔇 sale la pantalla sin sirena ni voz', r.ve && r.sir===0 && r.n===0, r);
  await page.close();

  /* ── 7. El anuncio primero; «Ver cuáles» ── */
  console.log('\n── 7. Con el anuncio y «Ver cuáles» ──');
  page = await abrir('16:02:00');
  r = await ev(page, () => {
    STATE=FIX().concat([filaSistema(ANUNCIO_ID, '📢 ANUNCIO', JSON.stringify({ v:1, t:'No hay insumos para el ICE', d:todayStr()+' 09:15', ts:111, por:'Administración' }))]);
    UNLOCKED=true; quienRol('logistica');
    document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block';
    anuncioTic();
    var g1=GRITO(); anuncioGritoCerrar(); anuncioTic(); var g2=GRITO();
    return { g1:{ ve:g1.ve, sem:g1.sem, t:g1.t }, g2:{ ve:g2.ve, sem:g2.sem, t:g2.t } };
  });
  chk('7 · con un anuncio nuevo, primero grita el anuncio', r.g1.ve && !r.g1.sem && /ICE/.test(r.g1.t), r.g1);
  chk('7 · al cerrarlo, el próximo tic grita lo de la semana', r.g2.ve && r.g2.sem && /Ernesto/.test(r.g2.t), r.g2);
  await ev(page, () => { [].filter.call(document.querySelectorAll('#anu-grito .ag-acc button'), function(b){ return /Ver cuáles/.test(b.textContent); })[0].click(); });
  await page.clock.runFor(500);
  r = await ev(page, () => ({ ve:GRITO().ve, vista:asisVista(), q:QUICK_FILTER, v:SEMANA_VER, vis:!document.getElementById('adm-semana').hidden,
    lista:[].map.call(document.querySelectorAll('#adm-semana .sem-li-r'), function(b){ return (b.getAttribute('onclick').match(/'([^']+)'/)||[])[1]; }) }));
  chk('7 · «Ver cuáles» cierra el grito y lleva a Administración con «Semana» en «🔥 Pedir hoy»: los mismos del grito', !r.ve && r.vista==='admin' && r.q==='semana' && r.v==='urge' && r.vis && JSON.stringify(r.lista)===JSON.stringify(['u1','u2']), r);
  await page.close();

  /* ── 9. Lo abren tarde ── */
  console.log('\n── 9. Lo abren tarde ──');
  for(const hora of ['16:31:00','17:00:00']){
    page = await abrir(hora);
    await ev(page, () => { STATE=FIX(); UNLOCKED=false; quienRol('logistica'); });
    hg=await hastaGrito(page, 1);
    r = await ev(page, () => ({ g:GRITO(), voz:ERNESTO().length }));
    chk('9 · logística abre el panel a las '+hora.slice(0,5)+' (cerrado hasta ahí): Bloki grita apenas abre (antes de 20 s), con los plazos de después del corte',
      hg && hg.slice(0,5)===hora.slice(0,5) && Number(hg.slice(6))<=20 && r.g.ve && r.voz===1 && /Ya pasaron las 16:30/.test(r.g.x), { abre:hora, grita:hg, ve:r.g.ve });
    await page.close();
  }
  page = await abrir('17:00:00');
  await ev(page, () => { STATE=FIX(); UNLOCKED=false; quienRol(''); setVendedorMem('Maria Flores'); });
  hg=await hastaGrito(page, 1);
  chk('9 · un vendedor que abre a las 17:00 no lo escucha', hg==='', hg);
  await page.close();

  /* ── 8. Sábado, domingo y feriado ── */
  console.log('\n── 8. Sábado, domingo y feriado ──');
  page = await abrir('15:50:00');
  r = await ev(page, () => {
    STATE=FIX();
    var con=function(iso){ var f0=todayStr; todayStr=function(){ return iso; }; try{ return semanaUrgentes().length; } finally { todayStr=f0; } };
    return { sab:semanaGritoHora('2026-10-31'), vie:semanaGritoHora('2026-10-30'), dom:con('2026-11-01'), fer:con('2026-11-02') };
  });
  chk('8 · la hora del grito: viernes 16:00 (corte 16:30), sábado 11:30 (corte 12:00)', r.vie===16 && r.sab===11.5, r);
  chk('8 · el domingo y el feriado no hay nada que gritar', r.dom===0 && r.fer===0, r);
  await page.close();

  chk('sin errores en la página', errores.length===0, errores);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
