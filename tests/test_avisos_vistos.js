/* 👁 458 · QUIÉN VIO CADA AVISO (22/11; el dueño la eligió con la muestra de las ideas 441-470).

   LO QUE CUIDA:
   1. La fila `__vistos__` es del sistema (no es una venta).
   2. Un aviso de Contabilidad A LA VISTA en «📋 Para hacer» de la vendedora queda «visto»: UNA vez por aviso y persona, en lote (pintar
      el panel muchas veces no escribe nada) y recién a los VISTOS_ESPERA_MS. Al mandarse relee la planilla y guarda con `juntar`.
   3. Lo que otro aparato pisó en el mismo segundo (el servidor de hoy no compara el sello de esta fila) vuelve a salir con la próxima vuelta.
   4. Abrir su lista («Ver») también cuenta. Con la contraseña puesta, mirar la lista de otra vendedora NO cuenta como que ella lo vio.
   5. Administración (con la contraseña) ve «👁 Lo vio …» y «🙈 No lo abrió · hace N días» en la lista de todas y en la revisión de las fotos.
   6. El anuncio que le sale en grande queda visto por quien usa el aparato; «📢 Decir anuncio» dice quiénes lo vieron y quiénes no.
   7. Sin conexión no se manda ni entra a la cola («N sin enviar»): queda en el aparato.
   8. Lo de más de 45 días se va de la fila; sin la bandera (Playwright) no se anota nada.
   9. `__anuncio__` y `__avisos_conta__` no se tocan.

   Reloj CLAVADO (viernes 20/11/2026, 10:00 de Bolivia). Solo datos sintéticos: el repo es público.
   Se corre:  node tests/test_avisos_vistos.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=false;
  try{ localStorage.removeItem(LS_PEND); localStorage.removeItem('me_vistos'); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  window.MIS_TOP_PRUEBA=1; window.VISTOS_PRUEBA=1;
  var hoy=todayStr(), d=function(n){ return stockSumarDias(hoy, n); };
  var T0=Date.now();
  var AV={ v:1, a:[
    { id:'avA', k:'x|1', pid:'p1', vend:'Isabel Robledo', cli:'CLIENTE UNO', nota:'101', f:d(-2), m:500, met:'QR', txt:'la foto dice 450', mes:hoy.slice(0,7), t:T0-2*3600000, por:'Contabilidad', ks:['monto'] },
    { id:'avB', k:'x|2', pid:'p2', vend:'Maria Flores',  cli:'CLIENTE DOS', nota:'102', f:d(-3), m:900, met:'QR', txt:'la foto dice 800', mes:hoy.slice(0,7), t:T0-3*86400000-3600000, por:'Contabilidad', ks:['monto'] }
  ]};
  var AN={ v:1, t:'No hay insumos para el ICE', d:hoy+' 08:00', ts:T0-2*3600000, por:'Administración' };
  var P=function(id, o){ return Object.assign({ id:id, oc:'11-'+id, vendedor:'Isabel Robledo', cliente:'CLIENTE '+id, celular:'7000000'+id.length, zona:'Norte', maps:'https://maps.google.com/?q=-17.78,-63.18', nota:'9',
    turno:'AM', fecha:d(3), productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:3000 }], saldo:0, acuenta:0, pagado:true, metodoPago:'', ts:T0-86400000, rev:1 }, o); };
  window._L=[
    P('p1'), P('p2', { vendedor:'Maria Flores' }),
    { id:CTA_AV_ID, fecha:'', cliente:'📣', observaciones:JSON.stringify(AV), rev:3 },
    { id:ANUNCIO_ID, fecha:'', cliente:'📢', observaciones:JSON.stringify(AN), rev:2 }
  ];
  window._saves=[]; window._lists=0;
  apiList=function(){ _lists++; return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window._L)) }); };
  apiSave=function(r, o){
    _saves.push({ id:String(r.id), juntar:!!(o && o.juntar), rev:Number(r.rev)||0, obs:r.observaciones });
    var g=JSON.parse(JSON.stringify(r)); g.rev=(Number(r.rev)||0)+1;
    window._L=window._L.filter(function(x){ return String(x.id)!==String(r.id); }); window._L.push(g);
    return Promise.resolve({ ok:true, pedido:JSON.parse(JSON.stringify(g)) });
  };
  apiPost=function(){ return Promise.resolve({ ok:false }); };
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  window._vistosFila=function(){ var f=window._L.filter(function(x){ return String(x.id)===VISTOS_ID; })[0]; return f ? JSON.parse(f.observaciones).k.map(function(k){ return JSON.parse(k); }) : []; };
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
  await page.clock.install({ time:new Date('2026-11-20T10:00:00-04:00') });
  await page.goto('file://'+PEDIDOS);
  await page.waitForTimeout(900);
  await page.evaluate(PREPARAR);

  // 1 · la fila es del sistema
  let r = await page.evaluate(()=>{ var f={ id:VISTOS_ID, fecha:'', observaciones:'{"v":1,"k":[]}' }; return { sis:esFilaSistema(f), conta:fueraDeConta(f) }; });
  chk('1 · `__vistos__` es una fila del sistema y no cuenta como venta', r.sis && r.conta, r);

  // 2 · a la vista en «Para hacer» → visto, una vez, en lote
  r = await page.evaluate(async ()=>{
    setVendedorMem('Isabel Robledo'); quienRol('');
    await _ver('Isabel Robledo');
    for(var i=0;i<5;i++){ renderMis(); await _esperar(20); }
    var hacer=(document.getElementById('mis-top')||{}).innerText||'';
    return { cam:Object.keys(VISTOS_CAMBIOS).map(function(k){ return JSON.parse(k); }), saves:_saves.length, hacer:/Contabilidad te pide revisar/.test(hacer), ls:Object.keys(JSON.parse(localStorage.getItem('me_vistos')||'{}')).length };
  });
  chk('2a · el aviso de Isabel a la vista en su «Para hacer» queda anotado UNA vez (con 6 pintadas)', r.hacer && r.cam.length===1 && r.cam[0][1]==='cta:avA' && r.cam[0][2]==='Isabel Robledo' && r.ls===1, r);
  chk('2b · …y todavía no escribió nada (va en lote, a los 20 s)', r.saves===0, r);
  await page.clock.runFor(21000);
  await page.waitForTimeout(150);
  r = await page.evaluate(()=>{ var s=_saves.filter(function(x){ return x.id===VISTOS_ID; }); return { n:s.length, juntar:s[0] && s[0].juntar, fila:_vistosFila(), cam:Object.keys(VISTOS_CAMBIOS).length, otras:_saves.filter(function(x){ return x.id!==VISTOS_ID; }).map(function(x){ return x.id; }) }; });
  chk('2c · a los 20 s: UNA escritura de `__vistos__`, con `juntar`, y la fila trae «cta:avA · Isabel Robledo»', r.n===1 && r.juntar && r.fila.length===1 && r.fila[0][1]==='cta:avA' && r.fila[0][2]==='Isabel Robledo' && r.cam===0, r);
  chk('9 · no se tocaron `__avisos_conta__` ni `__anuncio__`', r.otras.length===0, r.otras);
  r = await page.evaluate(async ()=>{ var n=_saves.length; await _ver('Isabel Robledo'); renderMis(); await _esperar(30); return { antes:n, despues:_saves.length, cam:Object.keys(VISTOS_CAMBIOS).length }; });
  await page.clock.runFor(25000); await page.waitForTimeout(100);
  r = await page.evaluate(()=>({ n:_saves.length }));
  chk('2d · volver a pintar con la fila ya guardada no escribe otra vez', r.n===1, r);

  // 3 · otro aparato pisó la fila (gana el último): se vuelve a mandar
  r = await page.evaluate(async ()=>{
    var f=_L.filter(function(x){ return String(x.id)===VISTOS_ID; })[0];
    f.observaciones=JSON.stringify({ v:1, k:[JSON.stringify(['v','an:999','Maria Flores', Date.now()-1000])] }); f.rev=(f.rev||0)+1;
    await refrescarEstado(); VISTOS_RECUP_T=0; vistosTic(); return Object.keys(VISTOS_CAMBIOS).map(function(k){ return JSON.parse(k)[1]; });
  });
  chk('3a · la lectura que ya no trae lo de Isabel lo vuelve a poner para mandar', JSON.stringify(r)==='["cta:avA"]', r);
  await page.clock.runFor(4000); await page.waitForTimeout(150);
  r = await page.evaluate(()=>_vistosFila().map(function(x){ return x[1]+'|'+x[2]; }).sort());
  chk('3b · …y la fila queda con lo de los dos aparatos (se juntó con lo que había)', JSON.stringify(r)==='["an:999|Maria Flores","cta:avA|Isabel Robledo"]', r);

  // 4 · con la contraseña, mirar la lista de otra no cuenta; abrir la suya sí
  r = await page.evaluate(async ()=>{
    UNLOCKED=true; setVendedorMem(''); quienRol('admin');
    ctaAvVer('Maria Flores'); await _esperar(30); closeModal();
    var c1=Object.keys(VISTOS_CAMBIOS).length;
    UNLOCKED=false; quienRol(''); setVendedorMem('Maria Flores');
    ctaAvVer('Maria Flores'); await _esperar(30); closeModal();
    return { c1:c1, cam:Object.keys(VISTOS_CAMBIOS).map(function(k){ var x=JSON.parse(k); return x[1]+'|'+x[2]; }) };
  });
  chk('4a · Administración (con la contraseña) mirando la lista de María no la marca como vista', r.c1===0, r);
  chk('4b · María abriendo su lista («Ver») sí', JSON.stringify(r.cam)==='["cta:avB|Maria Flores"]', r);
  await page.clock.runFor(21000); await page.waitForTimeout(150);

  // 5 · lo ve Administración
  r = await page.evaluate(async ()=>{
    var f=_vistosFila(); var fb=f.filter(function(x){ return x[1]==='cta:avB'; });
    // María lo vio recién: para ver el «no lo abrió», lo borramos de la planilla de mentira y de su aparato
    var fl=_L.filter(function(x){ return String(x.id)===VISTOS_ID; })[0];
    fl.observaciones=JSON.stringify({ v:1, k:JSON.parse(fl.observaciones).k.filter(function(k){ return JSON.parse(k)[1]!=='cta:avB'; }) }); fl.rev++;
    localStorage.removeItem('me_vistos'); await refrescarEstado();
    UNLOCKED=true; setVendedorMem(''); quienRol('admin');
    ctaAvVer(''); await _esperar(30);
    var t=document.getElementById('modal-box').innerText; closeModal();
    return { guardoB:fb.length===1, t:t, est:ctaAvEstadoHtml(ctaAvLeer()[0]) };
  });
  chk('4c · lo que vio María se guardó', r.guardoB, r);
  chk('5a · en la lista de todas: «👁 Lo vio hoy 10:00» para el de Isabel', /👁 Lo vio hoy 10:00/.test(r.t), r.t);
  chk('5b · …y «🙈 No lo abrió · hace 3 días» para el de María (que no lo vio)', /🙈 No lo abrió · hace 3 días/.test(r.t), r.t);
  chk('5c · en la revisión de las fotos (`ctaAvEstadoHtml`) también', /Lo vio hoy 10:00/.test(r.est), r.est);
  r = await page.evaluate(async ()=>{ UNLOCKED=false; setVendedorMem('Isabel Robledo'); quienRol(''); ctaAvVer('Isabel Robledo'); await _esperar(30); var t=document.getElementById('modal-box').innerText; closeModal(); return t; });
  chk('5d · la vendedora no ve nada de esto en su lista', !/Lo vio|No lo abrió/.test(r), r);

  // 6 · el anuncio
  r = await page.evaluate(async ()=>{
    var a=anuncioLeer(); anuncioGrito(a); await _esperar(30); anuncioGritoCerrar();
    return Object.keys(VISTOS_CAMBIOS).map(function(k){ var x=JSON.parse(k); return x[1]+'|'+x[2]; });
  });
  chk('6a · el anuncio que le salió en grande queda visto por la vendedora del aparato', r.length===1 && /^an:\d+\|Isabel Robledo$/.test(r[0]), r);
  await page.clock.runFor(21000); await page.waitForTimeout(150);
  r = await page.evaluate(async ()=>{
    UNLOCKED=true; setVendedorMem(''); quienRol('admin');
    anuncioAbrir(); await _esperar(30); var t=(document.getElementById('anu')||{}).innerText||''; anuncioCerrar(); return t;
  });
  chk('6b · «📢 Decir anuncio» dice cuántas lo vieron, quién (con la hora) y quién todavía no', /Lo vieron 1 de \d+ vendedoras/.test(r) && /✓ Isabel/.test(r) && /🙈 Maria/.test(r), r);
  r = await page.evaluate(async ()=>{
    UNLOCKED=true; anuncioGrito(Object.assign({}, anuncioLeer(), { semana:1, tag:'x', x:'' })); await _esperar(20); anuncioGritoCerrar();
    return Object.keys(VISTOS_CAMBIOS).length;
  });
  chk('6c · el grito de la semana a logística no cuenta como «vio el anuncio»', r===0, r);

  // 7 · sin conexión
  r = await page.evaluate(async ()=>{
    UNLOCKED=false; quienRol(''); setVendedorMem('Isabel Robledo');
    CONNECTED=false; var n=_saves.length;
    vistosAnotar('cta:avZ', 'Isabel Robledo'); var ok=await vistosMandar();
    var cola=getPending().filter(function(p){ return String(p.id)===VISTOS_ID; }).length;
    CONNECTED=true;
    return { ok:ok, saves:_saves.length-n, cola:cola, cam:Object.keys(VISTOS_CAMBIOS).length, ls:Object.keys(JSON.parse(localStorage.getItem('me_vistos')||'{}')).filter(function(k){ return /avZ/.test(k); }).length };
  });
  chk('7 · sin conexión no escribe ni entra a la cola: queda en memoria y en el aparato', r.ok===false && r.saves===0 && r.cola===0 && r.cam===1 && r.ls===1, r);

  // 8 · poda y bandera
  r = await page.evaluate(()=>{
    var s={}; s[vistosClave('cta:viejo','Isabel Robledo', Date.now()-60*864e5)]=1; s[vistosClave('cta:nuevo','Isabel Robledo', Date.now())]=1;
    var f=vistosArmar(s), k=JSON.parse(f.observaciones).k.map(function(x){ return JSON.parse(x)[1]; });
    window.VISTOS_PRUEBA=0; var sin=vistosAnotar('cta:otro','Isabel Robledo'); window.VISTOS_PRUEBA=1;
    return { k:k, sin:sin, id:f.id };
  });
  chk('8a · lo de más de 45 días se va de la fila', JSON.stringify(r.k)==='["cta:nuevo"]' && r.id==='__vistos__', r);
  chk('8b · sin la bandera (Playwright) no se anota nada', r.sin===false, r);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
