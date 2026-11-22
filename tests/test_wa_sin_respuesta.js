/* 💬 464 · CLIENTE QUE ESCRIBIÓ AL BOT Y NADIE LE CONTESTÓ (22/11; el dueño la eligió con la muestra de las ideas 441-470).

   LO QUE CUIDA:
   1. Las horas HÁBILES (`horasHabilesEntre`): lunes a sábado de 08:30 a 19:00 de Bolivia, sin domingos ni feriados.
   2. La hora que trae cada respuesta (`ms`, o «12/10 17:09»).
   3. Más de 2 h hábiles sin atender → «📋 Para hacer» de su vendedora, ROJO y arriba de todo, con «Contestar»; lo de 1 h, lo atendido,
      lo que contestó Claude solo y una reacción no cuentan. El renglón azul de siempre no la cuenta otra vez.
   4. Más de 4 h hábiles → también en «📋 Para hacer» de Administración (con la contraseña); antes de las 4 h no.
   5. «Contestar» abre la lista con su WhatsApp (wa.me) y «✓ Ya lo atendí» (`waRespAtendida`, el de siempre); atendida, se va.
   6. Bloki lo dice. Eduardo y ROHO no tienen este renglón. Sin la bandera (Playwright) no sale nada.

   Reloj CLAVADO (viernes 20/11/2026, 13:00 de Bolivia). Solo datos sintéticos: el repo es público.
   Se corre:  node tests/test_wa_sin_respuesta.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=false;
  try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  window.MIS_TOP_PRUEBA=1; window.SINRESP_PRUEBA=1;
  var hoy=todayStr(), d=function(n){ return stockSumarDias(hoy, n); }, H=function(hhmm){ return new Date(hoy+'T'+hhmm+':00-04:00').getTime(); };
  var P=function(id, o){ return Object.assign({ id:id, oc:'11-'+id, vendedor:'Isabel Robledo', cliente:'CLIENTE '+id, celular:'7000000'+id.length, zona:'Norte', maps:'https://maps.google.com/?q=-17.78,-63.18', nota:'9',
    turno:'AM', fecha:d(3), productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:3000 }], saldo:0, acuenta:0, pagado:true, metodoPago:'', ts:Date.now()-86400000, rev:1 }, o); };
  window._L=[ P('p1', { cliente:'CARMEN ORTIZ', celular:'71234567' }), P('p2'), P('p3', { vendedor:'Maria Flores', cliente:'JUAN PEREZ', celular:'76543210' }), P('p4', { vendedor:'Eduardo Añez' }) ];
  window._RESP=[
    { w:'wamid.a', ms:H('10:00'), t:'20/11 10:00', id:'p1', nom:'Carmen Ortiz', num:'59171234567', txt:'¿Me pueden cambiar el día?', at:'' },        // 3 h → a Isabel
    { w:'wamid.b', ms:H('12:00'), t:'20/11 12:00', id:'p2', nom:'Otro', num:'59170000002', txt:'ok', at:'' },                                    // 1 h → todavía no
    { w:'wamid.c', ms:H('08:30'), t:'20/11 08:30', id:'p2', nom:'Atendido', num:'59170000002', txt:'hola', at:'Isabel · 20/11 09:00' },          // atendida
    { w:'wamid.d', ms:H('08:30'), t:'20/11 08:30', id:'p2', nom:'Reacción', num:'59170000002', txt:'👍', at:'', ia:'— reaccionó con 👍' },        // reacción
    { w:'wamid.e', ms:H('08:30')-86400000, t:'19/11 08:30', id:'p3', nom:'Juan Perez', num:'59176543210', txt:'¿Y mi colchón?', at:'' },          // ayer: 10,5 + 4,5 h → a María y Administración
    { w:'wamid.f', ms:H('08:00')-86400000, t:'19/11 08:00', id:'p4', nom:'Mayorista', num:'59170000004', txt:'pedido', at:'' }                    // de Eduardo
  ];
  window._post=[];
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window._L)) }); };
  apiSave=function(r){ return Promise.resolve({ ok:true, pedido:r }); };
  apiPost=function(b){ _post.push(b);
    if(b.action==='waRespuestas') return Promise.resolve({ ok:true, version:SERVER_VER, resp:JSON.parse(JSON.stringify(_RESP)) });
    if(b.action==='waRespAtendida'){ _RESP.forEach(function(x){ if(x.w===b.w) x.at=b.quien+' · ahora'; }); return Promise.resolve({ ok:true, at:b.quien+' · ahora' }); }
    return Promise.resolve({ ok:false }); };
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  window._ver=async function(v){ await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok'; showView('mis'); MIS_TODOS=false;
    var mv=document.getElementById('mis-vendedor'); mv.value=v; renderMis(); await _esperar(200); };
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1440, height:1000 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https:\/\//, r=>r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', e=>errores.push(e.message));
  page.on('dialog', d=>d.accept());
  await page.clock.setFixedTime(new Date('2026-11-20T13:00:00-04:00'));
  await page.goto('file://'+PEDIDOS);
  await page.waitForTimeout(900);
  await page.evaluate(PREPARAR);

  // 1 · horas hábiles
  let r = await page.evaluate(()=>{
    var t=function(s){ return new Date(s).getTime(); };
    return {
      mismoDia:horasHabilesEntre(t('2026-11-20T10:00:00-04:00'), t('2026-11-20T13:00:00-04:00')),
      antesDeAbrir:horasHabilesEntre(t('2026-11-20T07:00:00-04:00'), t('2026-11-20T09:00:00-04:00')),
      despuesDeCerrar:horasHabilesEntre(t('2026-11-20T19:30:00-04:00'), t('2026-11-20T23:00:00-04:00')),
      sabadoALunes:horasHabilesEntre(t('2026-11-21T18:30:00-04:00'), t('2026-11-23T10:00:00-04:00')),
      domingo:horasHabilesEntre(t('2026-11-22T08:00:00-04:00'), t('2026-11-22T20:00:00-04:00')),
      feriado:horasHabilesEntre(t('2026-10-31T18:00:00-04:00'), t('2026-11-03T09:30:00-04:00')),
      alReves:horasHabilesEntre(t('2026-11-20T13:00:00-04:00'), t('2026-11-20T10:00:00-04:00'))
    };
  });
  chk('1a · mismo día 10:00 → 13:00 = 3 h', Math.abs(r.mismoDia-3)<1e-9, r);
  chk('1b · antes de abrir no cuenta (07:00 → 09:00 = 0,5 h) ni después de cerrar (19:30 → 23:00 = 0)', Math.abs(r.antesDeAbrir-0.5)<1e-9 && r.despuesDeCerrar===0, r);
  chk('1c · sábado 18:30 → lunes 10:00 = 2 h (el domingo no cuenta)', Math.abs(r.sabadoALunes-2)<1e-9 && r.domingo===0, r);
  chk('1d · el feriado tampoco: sábado 31/10 18:00 → martes 03/11 09:30 = 2 h (el 02/11 es Todos Santos)', Math.abs(r.feriado-2)<1e-9, r);
  chk('1e · al revés da 0', r.alReves===0, r);

  // 2 · la hora escrita
  r = await page.evaluate(()=>({ txt:waRespMs({ t:'20/11 10:00' }), iso:new Date('2026-11-20T10:00:00-04:00').getTime(), ms:waRespMs({ ms:123456789012, t:'x' }),
    gmt:waRespMs({ t:'Thu Nov 19 2026 08:30:00 GMT-0400 (hora de Bolivia)' }), gmtIso:new Date('2026-11-19T08:30:00-04:00').getTime() }));
  chk('2 · «20/11 10:00» es esa hora de Bolivia; con `ms` manda `ms`; la fecha larga se entiende', r.txt===r.iso && r.ms===123456789012 && r.gmt===r.gmtIso, r);

  // 3 · Para hacer de la vendedora
  r = await page.evaluate(async ()=>{
    WA_BOT=true; SERVER_VER='2026-11-21-a'; WA_RESP_T=0; await waRespTraer(true);
    setVendedorMem('Isabel Robledo'); quienRol('');
    await _ver('Isabel Robledo');
    var I=misHacerDatos('Isabel Robledo', STATE.filter(function(p){ return p && mismoVendedor(p.vendedor,'Isabel Robledo'); }));
    var top=(document.getElementById('mis-top')||{}).innerText||'';
    var info=I.filter(function(o){ return o.t==='Clientes que contestaron al bot'; })[0];
    return { primero:I[0] && { t:I[0].t, sev:I[0].sev, b:I[0].b, n:I[0].n, fn:I[0].fn }, top:/Carmen Ortiz espera respuesta hace 3 h/.test(top), info:info ? info.n : 0, L:waSinResp(2,'Isabel Robledo').map(function(x){ return x.w; }) };
  });
  chk('3a · «Carmen Ortiz espera respuesta hace 3 h» es lo primero de «Para hacer», en rojo, con «Contestar»', r.primero && r.primero.t==='Carmen Ortiz espera respuesta hace 3 h' && r.primero.sev==='r' && r.primero.b==='Contestar' && r.primero.n===1 && r.top, r);
  chk('3b · lo de 1 h, lo atendido y la reacción no cuentan', JSON.stringify(r.L)==='["wamid.a"]', r.L);
  chk('3c · el renglón de siempre («Clientes que contestaron al bot») no la cuenta otra vez: quedan la de 1 h y la reacción', r.info===2, r);

  // 4 · Administración
  r = await page.evaluate(()=>{
    var sinClave=sinRespHacerAdm();
    UNLOCKED=true; quienRol('admin'); setVendedorMem('');
    var I=admHacerDatos(), it=I.filter(function(o){ return o.k==='sinresp'; })[0];
    return { sinClave:sinClave, it:it && { t:it.t, n:it.n, s:it.s, sev:it.sev, pos:I.indexOf(it) } };
  });
  chk('4a · sin la contraseña ni Logística, nada en Administración', r.sinClave===null, r);
  chk('4b · con la contraseña, las de más de 4 h hábiles (Juan Perez de María y la del pedido de Eduardo: Administración ve todas) van primeras en «Para hacer» de Administración', r.it && r.it.n===2 && /2 clientes esperan respuesta · el que más, hace 15 h/.test(r.it.t) && /Juan Perez \(15 h · Maria\)/.test(r.it.s) && r.it.sev==='r' && r.it.pos===0, r);

  // 5 · la lista: Contestar y Ya lo atendí
  r = await page.evaluate(async ()=>{
    UNLOCKED=false; quienRol(''); setVendedorMem('Isabel Robledo'); document.getElementById('mis-vendedor').value='Isabel Robledo';
    waSinRespVer('Isabel Robledo'); await _esperar(20);
    var box=document.getElementById('modal-box'), a=box.querySelector('.sinr-it a[href*="wa.me"]'), n0=box.querySelectorAll('.sinr-it').length;
    box.querySelector('.sinr-it button').click(); await _esperar(150);
    var n1=document.getElementById('modal-box').querySelectorAll('.sinr-it').length, vacio=/Nadie espera respuesta/.test(document.getElementById('modal-box').innerText);
    closeModal();
    return { n0:n0, wa:a ? a.href : '', at:_post.filter(function(x){ return x.action==='waRespAtendida'; }).map(function(x){ return x.w; }), n1:n1, vacio:vacio, quedan:waSinResp(2,'Isabel Robledo').length };
  });
  chk('5a · «Contestar» abre la lista con su WhatsApp (wa.me/59171234567)', r.n0===1 && /wa\.me\/59171234567/.test(r.wa), r);
  chk('5b · «✓ Ya lo atendí» manda waRespAtendida y se va de la lista', JSON.stringify(r.at)==='["wamid.a"]' && r.n1===0 && r.vacio && r.quedan===0, r);

  // 6 · Bloki, Eduardo y la bandera
  r = await page.evaluate(async ()=>{
    _RESP.push({ w:'wamid.g', ms:new Date(todayStr()+'T09:00:00-04:00').getTime(), t:'', id:'p1', nom:'Lucía Rojas', num:'59171234567', txt:'Hola', at:'' });
    WA_RESP_T=0; await waRespTraer(true);
    showView('mis'); document.getElementById('mis-vendedor').value='Isabel Robledo';
    var A=asisAvisos().filter(function(a){ return /^sinresp\|/.test(a.k); });
    var edu=sinRespHacerVend('Eduardo Añez');
    window.SINRESP_PRUEBA=0; var off=waSinResp(0,''); var offV=sinRespHacerVend('Isabel Robledo'); window.SINRESP_PRUEBA=1;
    return { A:A.map(function(a){ return a.t+' | '+a.b[0]; }), edu:edu, off:off.length, offV:offV };
  });
  chk('6a · Bloki lo dice («Lucía Rojas espera respuesta hace 4 h», con «Contestar»)', r.A.length===1 && /Lucía Rojas espera respuesta hace 4 h \| Contestar/.test(r.A[0]), r.A);
  chk('6b · Eduardo no tiene este renglón', r.edu===null, r);
  chk('6c · sin la bandera (Playwright) no sale nada', r.off===0 && r.offV===null, r);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
