/* 🤖 REVISAR LAS FOTOS DE LOS COMPROBANTES CON IA (§4mq C4, 26/10; dueño: «falta lo del bot de contabilidad») + 📁 la carpeta más rápida.

   LO QUE CUIDA:
   1. Con un servidor anterior a 2026-10-26-a NO se llama (lo trataría como un guardado) y lo dice.
   2. Al abrir pide lo ya leído (`leer:1`, sin gastar) y lo compara con lo anotado:
      monto igual (✅), monto distinto, otro banco, otro día (2+), el mismo N° de comprobante en dos pagos, dos fotos que suman el pago (✅),
      en dólares, borrosa, no es comprobante, foto ajena; la tarjeta no compara el banco.
   3. «Leer las N fotos que faltan»: tandas de 24, lo que Claude no pudo (ocupado) se reintenta, y «sin crédito» corta y lo dice.
   4. Se puede cerrar la ventana: sigue sola y avisa al terminar.
   5. «Leer de nuevo» manda `forzar` solo con esas fotos.
   6. La tabla de Comprobantes marca ✅ IA / ⚠️ IA.
   7. Lo que dice la foto se muestra escapado (es un dato, no HTML) y no se toca ningún pago.
   8. 📁 La carpeta: con la 26-a tandas de 120, con la 25-a de 8; cerrar la ventana no la corta, volver a abrir no arranca otra y avisa al terminar.
   10. 🔒 Leer las fotos gasta el crédito del dueño: solo con la contraseña de Administración.
   11. 📤 Compartir con las vendedoras: el texto para el grupo, el PDF y el aviso en el panel (Mis pedidos → Para hacer).
   12. 🧾 La foto dice menos: el efectivo de la nota de venta (servidor 26-b), y la fecha: 2 días o más para cualquier lado avisa.

   Reloj CLAVADO (martes 27/10/2026, 10:00 de Bolivia). Solo datos sintéticos.
   Se corre:  node tests/test_ia_comprobantes.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1440, height:1000 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await ctx.route(/^https:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-27T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  const espera = (ms) => page.waitForTimeout(ms);

  /* El panel con pagos inventados y un servidor de mentira que «lee» las fotos. */
  const r0 = await ev(async () => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    IAC_ESPERA_MS=50;
    var mes='2026-10', ts=new Date(mes+'-05T11:00:00-04:00').getTime(), n=0;
    var P=function(cli, cobro){ n++; return { id:'c'+n, oc:'10-'+(100+n), nota:String(5000+n), cliente:cli, celular:'7000000'+n, fecha:mes+'-26', turno:'AM', zona:'Norte', vendedor:'Carola Chavez',
      productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:Number(cobro.monto) }], saldo:0, acuenta:0, pagado:true, ts:ts,
      metodoPago:textoCobros([Object.assign({ nota:String(100+n) }, cobro)]) }; };
    var Q=function(cli, monto, f, comps, banco, metodo){ return P(cli, { metodo:metodo||'QR', banco:banco==null?'BISA':banco, monto:monto, fecha:mes+'-'+f, comps:comps }); };
    STATE=[
      Q('ANA BIEN', 4840, '23', ['f1']),
      Q('BETO MONTO', 6760, '22', ['f2']),
      Q('CARLA BANCO', 1000, '21', ['f3']),
      Q('DANI DIA', 500, '20', ['f4'], 'Económico'),
      Q('ELSA REPE', 2000, '19', ['f5']),
      Q('FABI REPE', 2000, '19', ['f6']),
      Q('GABI SUMA', 3000, '18', ['f7a','f7b']),
      Q('HUGO BORROSA', 900, '17', ['f8']),
      Q('IVAN COLCHON', 900, '17', ['f9']),
      Q('JUAN TARJETA', 1500, '16', ['f10'], '', 'Tarjeta'),
      Q('KARI DOLARES', 6960, '16', ['f11']),
      Q('LUIS SINLEER', 800, '15', ['f12']),
      Q('MARA RARA', 100, '23', ['f13']),
      Q('NICO AJENA', 300, '14', ['f14']),
      P('OSCAR EFECTIVO', { metodo:'Efectivo', monto:700, fecha:mes+'-14' })
    ];
    for(var g=1; g<=30; g++) STATE.push(Q('GRUPO '+g, 100, '15', ['g'+g]));
    var lee={ f1:{ m:4840, bd:'Banco BISA S.A.', f:'2026-10-23', ref:'TRX123456' }, f2:{ m:7050, bd:'BISA', f:'2026-10-22', ref:'A1' },
      f3:{ m:1000, bd:'Banco Ganadero', f:'2026-10-21' }, f4:{ m:500, bd:'BANCO ECONOMICO', f:'2026-10-10' },
      f5:{ m:2000, bd:'BISA', f:'2026-10-19', ref:'998877665' }, f6:{ m:2000, bd:'BISA', f:'2026-10-19', ref:'998-877-665' },
      f7a:{ m:1000, bd:'BISA', f:'2026-10-18' }, f7b:{ m:2000, bd:'BISA', f:'2026-10-18' }, f8:{ le:false, m:0 }, f9:{ cp:false, m:0, no:'es la foto de un colchón' },
      f10:{ m:1500, bd:'BNB', f:'2026-10-16' }, f11:{ m:1000, mo:'USD', f:'2026-10-16' }, f12:{ m:800, bd:'BISA', f:'2026-10-15' },
      f13:{ m:100, bd:'<img src=x onerror="window.__xss=1">', f:'2026-10-23', no:'<b id="iny">hola</b>' }, f14:{ err:'ajena' } };
    for(var k=1; k<=30; k++) lee['g'+k]={ m:100, bd:'BISA', f:'2026-10-15' };
    var norm=function(o){ return o.err ? { err:o.err, t:1 } : Object.assign({ cp:true, le:true, m:0, mo:'BOB', f:'', h:'', bo:'', bd:'', de:'', or:'', ref:'', ti:'qr', no:'', t:1, md:'x' }, o); };
    var S=window.__S={ guardado:{}, llamadas:[], ocupado:{ g3:1 }, modo:'ok', demora:0, dia:{ d:'2026-10-27', n:10, usd:0.15 }, cap:[] };
    Object.keys(lee).forEach(function(k){ if(k!=='f12' && k[0]!=='g') S.guardado[k]=norm(lee[k]); });
    window.__STATE0=JSON.stringify(STATE);
    window.__saves=0; apiSave=function(r){ window.__saves++; return Promise.resolve({ ok:true, pedido:r }); };
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
    var demora=function(v){ return S.demora ? new Promise(function(ok){ setTimeout(function(){ ok(v); }, S.demora); }) : Promise.resolve(v); };
    apiPost=function(b){
      b=JSON.parse(JSON.stringify(b)); S.llamadas.push(b);
      if(b.action==='compsCarpeta'){ S.cap.push(b.archivos.length);
        return demora({ ok:true, carpeta:{ url:'https://drive.google.com/drive/folders/X', nombre:'Comprobantes para el contador / Comprobantes '+b.mes }, copiados:b.archivos.length, yaEstaban:0, ajenas:0, fallaron:0, pendientes:[] }); }
      if(b.action!=='iaComprobantes') return Promise.resolve({ ok:true });
      var forz={}; (b.forzar||[]).forEach(function(f){ forz[f]=1; });
      var res={}, faltan=[], pend=[];
      b.fotos.forEach(function(f){ if(S.guardado[f] && !forz[f]) res[f]=S.guardado[f]; else faltan.push(f); });
      if(b.leer) return demora({ ok:true, version:'2026-10-26-a', res:res, faltan:faltan, pendientes:[], leidas:0, usd:0, dia:S.dia, estado:'' });
      if(S.modo==='credito') return demora({ ok:true, version:'2026-10-26-a', res:res, faltan:faltan, pendientes:faltan, leidas:0, usd:0, dia:S.dia, estado:'credito' });
      var leidas=0;
      faltan.slice(0, 24).forEach(function(f){
        if(S.ocupado[f]){ S.ocupado[f]--; pend.push(f); return; }
        var o=(forz[f] && S.relee && S.relee[f]) ? norm(S.relee[f]) : norm(lee[f] || { err:'no_existe' });
        S.guardado[f]=o; res[f]=o; leidas++; S.dia.n++; S.dia.usd=Math.round((S.dia.usd+0.015)*1000)/1000;
      });
      pend=pend.concat(faltan.slice(24));
      return demora({ ok:true, version:'2026-10-26-a', res:res, faltan:faltan, pendientes:pend, leidas:leidas, usd:0.015*leidas, dia:S.dia, estado:'' });
    };
    showView('conta'); await new Promise(function(r){ setTimeout(r, 200); });
    document.getElementById('cta-vendedor').value='';
    return { n:STATE.length };
  });
  chk('0. el panel de prueba arma', r0 && r0.n===45, r0);

  /* 1 · servidor de antes */
  const r1 = await ev(async () => {
    SERVER_VER='2026-10-25-a'; __S.llamadas=[];
    compsAbrir('2026-10'); await new Promise(function(r){ setTimeout(r, 80); });
    var boton=!!document.getElementById('comps-ia-btn');
    iacAbrir(); await new Promise(function(r){ setTimeout(r, 80); });
    var txt=document.getElementById('iac-cuerpo').textContent, n=__S.llamadas.filter(function(b){ return b.action==='iaComprobantes'; }).length;
    closeModal(); return { boton:boton, txt:txt, n:n };
  });
  chk('1. con el servidor 25-a: el botón está, pero NO se llama y dice qué versión hace falta', r1.boton && r1.n===0 && /2026-10-26-a/.test(r1.txt), r1);

  /* 2 · abre con lo ya leído y compara */
  const r2 = await ev(async () => {
    SERVER_VER='2026-10-26-a'; __S.llamadas=[]; IAC.res={}; IAC.cargado={};
    iacAbrir('2026-10'); await new Promise(function(r){ setTimeout(r, 120); });
    var L=__S.llamadas.filter(function(b){ return b.action==='iaComprobantes'; });
    var fichas=[].map.call(document.querySelectorAll('.iac-f'), function(x){ return x.textContent; });
    var it={}; [].forEach.call(document.querySelectorAll('.iac-it'), function(x){ var c=x.querySelector('.iac-cab b'); if(c) it[c.textContent]=x.textContent; });
    return { L:L, fichas:fichas, it:it, leer:(document.getElementById('iac-leer-btn')||{}).textContent||'',
      xss:window.__xss||0, iny:!!document.querySelector('#iac-cuerpo #iny'), imgx:!!document.querySelector('#iac-cuerpo img[src="x"]') };
  });
  const L2 = r2.L || [];
  chk('2a. al abrir pide UNA vez lo ya leído (`leer:1`) con todas las fotos del mes (sin el efectivo)', L2.length===1 && L2[0].leer===1 && L2[0].fotos.length===45 && L2[0].fotos.indexOf('f7b')>=0, L2.map(b=>({ leer:b.leer, n:b.fotos.length })));
  const it = r2.it || {};
  chk('2b. monto igual, banco «Banco BISA S.A.» = BISA, mismo día → ✅ Coincide', /Coincide/.test(it['ANA BIEN']||'') && /4\.840,00/.test(it['ANA BIEN']||''), it['ANA BIEN']);
  chk('2c. la foto dice más que lo anotado → «La foto dice más», con los dos montos', /La foto dice más/.test(it['BETO MONTO']||'') && /7\.050,00/.test(it['BETO MONTO']||'') && /6\.760,00/.test(it['BETO MONTO']||''), it['BETO MONTO']);
  chk('2d. entró a otro banco → «Otro banco»', /Otro banco/.test(it['CARLA BANCO']||'') && /Ganadero/.test(it['CARLA BANCO']||''), it['CARLA BANCO']);
  chk('2e. la foto es de 10 días antes → «Otro día» (¿otra compra?)', /Otro día/.test(it['DANI DIA']||'') && /10\/10/.test(it['DANI DIA']||'') && /otra compra/.test(it['DANI DIA']||''), it['DANI DIA']);
  chk('2f. el mismo N° de comprobante en dos pagos (con o sin guiones) → repetido, en los dos', /repetido/i.test(it['ELSA REPE']||'') && /FABI/.test(it['ELSA REPE']||'') && /repetido/i.test(it['FABI REPE']||''), [it['ELSA REPE'], it['FABI REPE']]);
  chk('2g. dos fotos que suman el pago → ✅', /Coincide/.test(it['GABI SUMA']||''), it['GABI SUMA']);
  chk('2h. borrosa → «No se lee bien» · no es comprobante → «No es un comprobante» con la nota de Claude', /No se lee bien/.test(it['HUGO BORROSA']||'') && /No es un comprobante/.test(it['IVAN COLCHON']||'') && /colchón/.test(it['IVAN COLCHON']||''), [it['HUGO BORROSA'], it['IVAN COLCHON']]);
  chk('2i. la tarjeta no compara el banco (BNB) → ✅', /Coincide/.test(it['JUAN TARJETA']||''), it['JUAN TARJETA']);
  chk('2j. en dólares → «Está en dólares»', /dólares/.test(it['KARI DOLARES']||''), it['KARI DOLARES']);
  chk('2k. sin leer → «Sin revisar» · ajena → «no está en la carpeta de fotos del panel»', /Sin revisar/.test(it['LUIS SINLEER']||'') && /carpeta de fotos del panel/.test(it['NICO AJENA']||''), [it['LUIS SINLEER'], it['NICO AJENA']]);
  const fx = (r2.fichas||[]).join(' | ');
  chk('2l. las fichas: 3 coinciden (Ana, Gabi, Juan) · 7 no coinciden · 3 no se leen · 31 sin revisar · el costo de hoy', /Coinciden\s*3/.test(fx) && /No coinciden\s*7/.test(fx) && /No se leen\s*3/.test(fx) && /Sin revisar\s*31/.test(fx) && /US\$ 0,15/.test(fx), fx);
  chk('2m. el botón ofrece leer las 31 que faltan con lo que costaría', /Leer las 31 fotos que faltan/.test(r2.leer) && /US\$/.test(r2.leer), r2.leer);
  chk('2n. lo que dice la foto va escapado: ni la imagen ni el <b> se meten en la página', !r2.xss && !r2.iny && !r2.imgx && /<img src=x/.test(it['MARA RARA']||''), { xss:r2.xss, iny:r2.iny, imgx:r2.imgx, txt:it['MARA RARA'] });

  /* 3 · leer lo que falta: tandas de 24, reintento del ocupado */
  const r3 = await ev(async () => {
    __S.llamadas=[];
    document.getElementById('iac-leer-btn').click();
    for(var i=0; i<60 && IAC.corre; i++) await new Promise(function(r){ setTimeout(r, 50); });
    var L=__S.llamadas.filter(function(b){ return b.action==='iaComprobantes'; });
    var fichas=[].map.call(document.querySelectorAll('.iac-f'), function(x){ return x.textContent; }).join(' | ');
    return { tandas:L.map(function(b){ return b.fotos.length; }), leer:L.some(function(b){ return b.leer; }), corre:IAC.corre, fichas:fichas, g3:!!IAC.res.g3,
      boton:!!document.getElementById('iac-leer-btn') };
  });
  chk('3a. lee en tandas de 24 como mucho, sin `leer`', r3.tandas && r3.tandas.length>=2 && r3.tandas[0]===24 && r3.tandas.every(n=>n<=24) && !r3.leer, r3.tandas);
  chk('3b. la que Claude no pudo (ocupado) se vuelve a pedir y queda leída', r3.g3 && !r3.corre, r3);
  chk('3c. al terminar: 34 coinciden, nada sin revisar y no queda el botón de leer', /Coinciden\s*34/.test(r3.fichas) && !/Sin revisar/.test(r3.fichas) && !r3.boton, r3.fichas);

  /* 4 · cerrar la ventana mientras lee: sigue y avisa */
  const r4 = await ev(async () => {
    delete IAC.res.f12; delete __S.guardado.f12; __S.demora=150; var avisos=[], t0=window.toast; window.toast=function(m){ avisos.push(String(m)); };
    iacPintar(); document.getElementById('iac-leer-btn').click(); await new Promise(function(r){ setTimeout(r, 30); });
    var corriendo=IAC.corre; closeModal();
    for(var i=0; i<60 && IAC.corre; i++) await new Promise(function(r){ setTimeout(r, 50); });
    window.toast=t0; __S.demora=0;
    return { corriendo:corriendo, leida:!!IAC.res.f12, avisos:avisos };
  });
  chk('4. se puede cerrar la ventana: sigue leyendo y avisa al terminar con cuántos coinciden', r4.corriendo && r4.leida && r4.avisos.some(a=>/Fotos de los comprobantes/.test(a) && /coinciden/.test(a)), r4);

  /* 5 · Leer de nuevo */
  const r5 = await ev(async () => {
    __S.llamadas=[]; __S.relee={ f2:{ m:6760, bd:'BISA', f:'2026-10-22' } };
    iacAbrir('2026-10'); await new Promise(function(r){ setTimeout(r, 80); });
    var card=[].filter.call(document.querySelectorAll('.iac-it'), function(x){ return /BETO MONTO/.test(x.textContent); })[0];
    var b=[].filter.call(card.querySelectorAll('button'), function(x){ return /Leer de nuevo/.test(x.textContent); })[0];
    b.click(); await new Promise(function(r){ setTimeout(r, 120); });
    var L=__S.llamadas.filter(function(x){ return x.action==='iaComprobantes' && !x.leer; });
    var it={}; [].forEach.call(document.querySelectorAll('.iac-it'), function(x){ var c=x.querySelector('.iac-cab b'); if(c) it[c.textContent]=x.textContent; });
    closeModal(); return { L:L, beto:it['BETO MONTO'] };
  });
  chk('5. «Leer de nuevo» manda `forzar` solo con esa foto y repinta con lo nuevo', r5.L.length===1 && JSON.stringify(r5.L[0].forzar)==='["f2"]' && JSON.stringify(r5.L[0].fotos)==='["f2"]' && /Coincide/.test(r5.beto||''), r5);

  /* 6 · sin crédito */
  const r6 = await ev(async () => {
    delete IAC.res.f1; delete __S.guardado.f1; __S.modo='credito';
    iacAbrir('2026-10'); await new Promise(function(r){ setTimeout(r, 80); });
    document.getElementById('iac-leer-btn').click();
    for(var i=0; i<40 && IAC.corre; i++) await new Promise(function(r){ setTimeout(r, 50); });
    var txt=document.getElementById('iac-cuerpo').textContent, boton=!!document.getElementById('iac-leer-btn');
    closeModal(); __S.modo='ok'; IAC.estado=''; return { txt:txt, boton:boton };
  });
  chk('6. sin crédito: corta, lo dice y no ofrece seguir leyendo', /crédito de Claude/.test(r6.txt) && !r6.boton, r6.txt.slice(0,300));

  /* 7 · la marca en la tabla de Comprobantes */
  const r7 = await ev(async () => {
    compsAbrir('2026-10'); await new Promise(function(r){ setTimeout(r, 120); });
    var filas={}; [].forEach.call(document.querySelectorAll('.cps-t tbody tr'), function(tr){ var b=tr.querySelector('b'); if(b) filas[b.textContent]=tr.textContent; });
    closeModal(); return { juan:filas['JUAN TARJETA'], car:filas['CARLA BANCO'], hugo:filas['HUGO BORROSA'], ana:filas['ANA BIEN'] };
  });
  chk('7. la tabla de Comprobantes marca ✅ IA / ⚠️ IA / ❓ IA (y nada en la que no se leyó)', /✅ IA/.test(r7.juan||'') && !/IA/.test((r7.ana||'').replace(/ANA BIEN/,'')) && /⚠️ IA/.test(r7.car||'') && /❓ IA/.test(r7.hugo||''), r7);

  /* 8 · no toca ningún pago */
  const r8 = await ev(() => ({ igual: JSON.stringify(STATE)===window.__STATE0, saves: window.__saves }));
  chk('8. ningún pago cambió y no se guardó nada', r8.igual && r8.saves===0, r8);

  /* 9 · 📁 la carpeta */
  const r9 = await ev(async () => {
    var out={};
    __S.cap=[]; COMPS_CORRE=null; SERVER_VER='2026-10-26-a';
    compsAbrir('2026-10'); await new Promise(function(r){ setTimeout(r, 60); });
    await compsCarpeta(); out.rapida=__S.cap.slice(); out.lista=document.getElementById('comps-carpeta').textContent;
    closeModal();
    __S.cap=[]; COMPS_CORRE=null; SERVER_VER='2026-10-25-a'; __S.demora=40;
    var avisos=[], t0=window.toast; window.toast=function(m){ avisos.push(String(m)); };
    compsAbrir('2026-10'); await new Promise(function(r){ setTimeout(r, 60); });
    compsCarpeta(); await new Promise(function(r){ setTimeout(r, 70); });
    closeModal(); await new Promise(function(r){ setTimeout(r, 70); });
    compsAbrir('2026-10'); await new Promise(function(r){ setTimeout(r, 30); });
    out.avance=document.getElementById('comps-carpeta').textContent; out.btn=document.getElementById('comps-carpeta-btn').disabled;
    var p=compsCarpeta();                                   // tocar otra vez mientras copia: no arranca otra
    closeModal();
    await p; await new Promise(function(r){ setTimeout(r, 60); });
    window.toast=t0; __S.demora=0;
    out.lenta=__S.cap.slice(); out.avisos=avisos; out.corre=COMPS_CORRE.corre;
    return out;
  });
  chk('9a. con la 26-a, una sola tanda de hasta 120 (45 fotos)', JSON.stringify(r9.rapida)==='[45]' && /Carpeta lista/.test(r9.lista) && /Descargar/.test(r9.lista), r9.rapida);
  chk('9b. con la 25-a, tandas de 8 (6 tandas para 45), sin repetir aunque se toque otra vez', r9.lenta && r9.lenta.length===6 && r9.lenta[0]===8 && r9.lenta.reduce((a,b)=>a+b,0)===45, r9.lenta);
  chk('9c. al volver a abrir muestra el avance y cuánto lleva, con el botón apagado', /Copiando las fotos/.test(r9.avance||'') && /lleva/.test(r9.avance||'') && r9.btn===true, r9.avance);
  chk('9d. con la ventana cerrada, avisa cuando la carpeta está lista', !r9.corre && (r9.avisos||[]).some(a=>/Carpeta de comprobantes/.test(a) && /45 de 45/.test(a)), r9.avisos);

  /* 10 · 🔒 solo con la contraseña de Administración (dueño: «si no los vendedores se gastarán mis tokens») */
  const r10 = await ev(async () => {
    var out={}; UNLOCKED=false; IAC.clave=false; SERVER_VER='2026-10-26-a'; __S.llamadas=[];
    try{ localStorage.setItem(LS_ADMIN, sha256('clave-de-prueba')); }catch(e){}
    delete IAC.res.f1; delete __S.guardado.f1;
    compsAbrir('2026-10'); await new Promise(function(r){ setTimeout(r, 80); });
    out.boton=(document.getElementById('comps-ia-btn')||{}).textContent||'';
    out.tags=!!document.querySelector('.cps-t .cps-ok[title]');           // las marcas ✅ IA de lo ya leído se siguen viendo
    iacAbrir('2026-10'); await new Promise(function(r){ setTimeout(r, 60); });
    out.pide=!!document.getElementById('iac-pass') && !document.getElementById('iac-cuerpo');
    var gasto=function(){ return __S.llamadas.filter(function(b){ return b.action==='iaComprobantes' && !b.leer; }).length; };
    iacLeer(); iacReleer('f2'); await new Promise(function(r){ setTimeout(r, 60); });
    out.sinGastar=gasto()===0;
    document.getElementById('iac-pass').value='otra'; iacClaveProbar('2026-10'); await new Promise(function(r){ setTimeout(r, 30); });
    out.mal=!document.getElementById('iac-pass-err').hidden && !document.getElementById('iac-cuerpo');
    document.getElementById('iac-pass').value='clave-de-prueba'; iacClaveProbar('2026-10'); await new Promise(function(r){ setTimeout(r, 100); });
    out.entra=!!document.getElementById('iac-cuerpo') && !!document.getElementById('iac-leer-btn');
    document.getElementById('iac-leer-btn').click();
    for(var i=0; i<40 && IAC.corre; i++) await new Promise(function(r){ setTimeout(r, 50); });
    out.lee=gasto()>=1 && !!IAC.res.f1;
    closeModal(); UNLOCKED=true; return out;
  });
  chk('10a. sin la contraseña el botón dice 🔒 y la ventana pide la contraseña de Administración (las marcas ✅ IA siguen)', /🔒/.test(r10.boton) && r10.pide && r10.tags, r10);
  chk('10b. sin la contraseña «Leer» y «Leer de nuevo» no gastan nada', r10.sinGastar, r10);
  chk('10c. una contraseña equivocada no entra; la buena sí, y ahí se puede leer', r10.mal && r10.entra && r10.lee, r10);

  /* 11 · 📤 compartir con las vendedoras: texto para el grupo, PDF y el aviso en el panel (dueño: «¿cómo comparto el informe al grupo?») */
  const r11 = await ev(async () => {
    var out={}; UNLOCKED=true; IAC.shVend=''; IAC.filtro='';
    iacAbrir('2026-10'); await new Promise(function(r){ setTimeout(r, 120); });
    out.barra=!!document.querySelector('#iac-cuerpo .iac-share') && !!document.getElementById('iac-pdf-btn') && !!document.getElementById('iac-wa');
    var copiado=null, c0=window.copyText; window.copyText=function(t){ copiado=t; };
    try{ iacCopiarGrupo(); }finally{ window.copyText=c0; }
    out.texto=copiado||'';
    out.wa=decodeURIComponent((document.getElementById('iac-wa')||{}).href||'').indexOf('Pagos para revisar')>=0;
    /* el PDF con librerías de mentira (sin internet en las pruebas) */
    var paginas=0, nombre='', db=window.downloadBlob;
    window.jspdf={ jsPDF:function(){ return { addPage:function(){}, addImage:function(){ paginas++; }, setProperties:function(){}, output:function(){ return new Blob(['%PDF']); } }; } };
    window.html2canvas=function(){ return Promise.resolve({ toDataURL:function(){ return 'data:image/jpeg;base64,'; } }); };
    window.downloadBlob=function(b, n){ nombre=n; };
    try{ await iacPdf(); }finally{ window.downloadBlob=db; }
    out.pdf={ paginas:paginas, nombre:nombre, hojas:iacPdfHojas('2026-10','').length, txt:(function(){ var d=document.createElement('div'); d.innerHTML=iacPdfHojas('2026-10','').join(''); return d.textContent; })() };
    /* solo una vendedora */
    var sel=document.getElementById('iac-sh-vend'); out.opciones=[].map.call(sel.options, function(o){ return o.textContent; });
    /* el aviso en el panel */
    var nSave=window.__saves;
    await iacAvisarPanel(); await new Promise(function(r){ setTimeout(r, 80); });
    out.guardoAviso=window.__saves===nSave+1;
    out.avisos=ctaAvLeer().length;
    out.estadoItem=[].some.call(document.querySelectorAll('.iac-av'), function(e){ return /Avisado a Carola/.test(e.textContent); });
    await iacAvisarPanel(); out.noDuplica=ctaAvLeer().length===out.avisos;
    /* la vendedora */
    var I=misHacerDatos('Carola Chavez', []); out.paraHacer=I.filter(function(o){ return o.ic==='📣'; }).map(function(o){ return o.n+' '+o.t; })[0]||'';
    ctaAvVer('Carola Chavez'); await new Promise(function(r){ setTimeout(r, 60); });
    out.lista=[].map.call(document.querySelectorAll('.ctav-it'), function(e){ return e.textContent; });
    var id=ctaAvAbiertos('Carola Chavez')[0].id;
    await ctaAvOk(id, 'Carola Chavez'); await new Promise(function(r){ setTimeout(r, 60); });
    out.quedan=ctaAvAbiertos('Carola Chavez').length;
    out.cerrado=!!ctaAvLeer().filter(function(a){ return a.id===id && a.ok; })[0];
    out.esSistema=esFilaSistema({ id:'__avisos_conta__' }) && fueraDeConta({ id:'__avisos_conta__', oc:'' });
    closeModal(); return out;
  });
  chk('11a. la barra «📤 Compartir con las vendedoras» está (PDF, copiar, WhatsApp, aviso)', r11.barra, r11);
  chk('11b. el texto para el grupo va por vendedora, con cada pago y lo que hay que revisar', /Pagos para revisar · octubre de 2026/.test(r11.texto) && /👤 \*Carola Chavez\*/.test(r11.texto) &&
    /CARLA BANCO · nota 5003 · 21\/10 · Bs 1\.000,00 QR BISA/.test(r11.texto) && /→ la foto dice que entró a Banco Ganadero y está anotado en BISA/.test(r11.texto) && /Ya lo corregí/.test(r11.texto) && r11.wa, r11.texto.slice(0, 700));
  chk('11c. el PDF baja «Pagos-para-revisar-octubre-2026.pdf» con una imagen por hoja, y dice cada pago', r11.pdf.nombre==='Pagos-para-revisar-octubre-2026.pdf' && r11.pdf.paginas===r11.pdf.hojas && r11.pdf.hojas>=1 &&
    /CARLA BANCO/.test(r11.pdf.txt) && /Comprobante repetido/.test(r11.pdf.txt) && /Hoja 1 de/.test(r11.pdf.txt), r11.pdf);
  chk('11d. se puede elegir una sola vendedora', r11.opciones.length>=2 && /^Todas \(\d+\)$/.test(r11.opciones[0]) && /Carola Chavez \(\d+\)/.test(r11.opciones[1]), r11.opciones);
  chk('11e. «Dejar el aviso» guarda UNA fila del sistema con un aviso por pago, y en cada pago dice «Avisado a Carola»; tocarlo otra vez no duplica', r11.guardoAviso && r11.avisos>=8 && r11.estadoItem && r11.noDuplica, r11);
  chk('11f. a la vendedora le sale en «Para hacer» y en su lista, con «Abrir la venta» y «✓ Ya lo corregí»', /📣|Contabilidad te pide revisar/.test(r11.paraHacer) && r11.lista.length===r11.avisos && /Ya lo corregí/.test(r11.lista[0]||''), { ph:r11.paraHacer, l:r11.lista.slice(0,2) });
  chk('11g. «✓ Ya lo corregí» lo cierra (queda uno menos) y la fila de avisos no es una venta', r11.cerrado && r11.quedan===r11.avisos-1 && r11.esSistema, r11);

  /* 12 · 🧾 la foto dice menos: el efectivo (dueño: «390 en QR y 600 en efectivo, lo dice la segunda imagen») y las fechas */
  const r12 = await ev(async () => {
    var out={}, P={ id:'z1', cliente:'JEISON PRUEBA', nota:'1620', vendedor:'Mauricio Merida' };
    var X=function(monto, f, comps){ return { p:P, f:f, monto:monto, comps:comps, metB:'QR', ban:'Económico', met:'QR Económico', n:1 }; };
    var Q=function(m, f){ return { cp:true, le:true, m:m, mo:'BOB', f:f, bd:'Banco Económico', ref:'', t:1, pv:2 }; };
    IAC.res.zq=Q(390, '2026-10-05'); IAC.res.zn={ cp:false, le:true, m:990, mo:'BOB', f:'2026-10-05', nv:1, nt:990, ne:600, nq:390, nj:0, nr:0, t:1, pv:2 };
    IAC.res.zv={ cp:false, le:true, m:0, mo:'BOB', f:'', t:1, no:'nota de venta' };   // una nota leída con la pregunta de antes
    var c1=iacComparar(X(990, '2026-10-05', ['zq']), {}); out.menos={ chip:c1.chip, txt:c1.txt, c:(c1.mot||[])[0] && c1.mot[0].c };
    var c2=iacComparar(X(990, '2026-10-05', ['zn','zq']), {}); out.mixto={ est:c2.est, chip:c2.chip, txt:c2.txt, c:(c2.mot||[])[0] && c2.mot[0].c };
    var dia=function(fFoto, fAnot){ IAC.res.zd=Q(990, fFoto); var c=iacComparar(X(990, fAnot, ['zd']), {}); return c.est==='ok' ? 'ok' : (c.mot||[]).map(function(m){ return m.k; }).join(','); };
    out.dias={ antes1:dia('2026-10-07','2026-10-08'), antes3:dia('2026-10-12','2026-10-15'), despues:dia('2026-10-10','2026-10-08'), antes10:dia('2026-10-10','2026-10-20'), mes:dia('2026-09-30','2026-10-01') };
    IAC.res.zd=Q(990, '2026-10-12'); out.txt3=iacComparar(X(990, '2026-10-15', ['zd']), {}).txt.replace(/<[^>]+>/g,'');
    /* el botón para leer las notas de venta (servidor 26-b) */
    var base=STATE.slice();
    STATE.push({ id:'zz1', oc:'10-990', nota:'1620', cliente:'JEISON PRUEBA', celular:'7', fecha:'2026-10-26', turno:'AM', zona:'Norte', vendedor:'Mauricio Merida',
      productos:[{ desc:'COLCHON', cant:1, precio:990 }], saldo:0, acuenta:0, pagado:true, ts:Date.now(),
      metodoPago:textoCobros([{ metodo:'QR', banco:'Económico', monto:990, fecha:'2026-10-05', nota:'1620', comps:['zv','zq'] }]) });
    SERVER_VER='2026-10-26-a'; out.sinBoton=iacNotasServidorOk()===false;
    SERVER_VER='2026-10-26-b'; out.porLeer=iacNotasPorLeer('2026-10');
    __S.llamadas=[]; __S.relee={ zv:{ cp:false, m:990, f:'2026-10-05' } }; __S.guardado.zv=IAC.res.zv; __S.guardado.zq=IAC.res.zq;
    iacAbrir('2026-10'); await new Promise(function(r){ setTimeout(r, 120); });
    out.boton=((document.getElementById('iac-notas-btn')||{}).textContent)||'';
    var L0=__S.llamadas.length; await iacLeerNotas();
    out.pidio=__S.llamadas.slice(L0).filter(function(b){ return b.action==='iaComprobantes' && !b.leer; }).map(function(b){ return { fotos:b.fotos, forzar:b.forzar }; });
    closeModal(); STATE=base; SERVER_VER='2026-10-26-a'; return out;
  });
  chk('12a. la foto dice MENOS: «La foto dice menos», cuánto menos y que si fue en efectivo se anota como otro pago (no «falta plata»)',
    /La foto dice menos/.test(r12.menos.chip) && /Bs 600,00/.test(r12.menos.txt) && /efectivo/.test(r12.menos.txt) && /otro pago/.test(r12.menos.txt) && !/Revisá cuál está bien/.test(r12.menos.txt), r12.menos);
  chk('12b. con la nota de venta leída (QR 390 + efectivo 600 = 990): «Una parte fue en efectivo» y cómo corregir el pago', r12.mixto.est==='mal' && /efectivo/.test(r12.mixto.chip) &&
    /QR Bs 390,00/.test(r12.mixto.txt) && /efectivo Bs 600,00/.test(r12.mixto.txt) && /La plata está/.test(r12.mixto.txt), r12.mixto);
  chk('12c. las fechas (dueño: «si la venta se cargó el 15 y el pago dice 12, está bien que avise»): 1 día no avisa; 3 días antes, después, 10 días antes y otro mes sí',
    r12.dias.antes1==='ok' && r12.dias.antes3==='dia' && r12.dias.despues==='dia' && r12.dias.antes10==='dia' && r12.dias.mes==='mes' &&
    /La plata entró el 12\/10/.test(r12.txt3) && /3 días después/.test(r12.txt3), { d:r12.dias, t:r12.txt3 });
  chk('12d. 🧾 con la 26-b: el botón ofrece leer las notas de venta de los pagos con diferencia y las pide con `forzar`', r12.sinBoton && JSON.stringify(r12.porLeer)==='["zv"]' &&
    /Leer las notas de venta \(1 foto/.test(r12.boton) && r12.pidio.length===1 && JSON.stringify(r12.pidio[0].forzar)==='["zv"]', r12);

  chk('sin errores en la página', !errores.length, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
