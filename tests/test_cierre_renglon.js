/* 🧾 CIERRE DE ENTREGAS: UN RENGLÓN POR PEDIDO (15/11/2026, mejora 290). El dueño: «ok pero hay que mejorarlo, veo íconos superpuestos».
   En la compu, el selector «¿Qué camión lo llevó?» (idea 203) va EN el renglón de cada pedido; el que propone el GPS en turquesa con la
   pastilla «GPS» al lado (dibujada, sin emoji); lo largo se recorta con «…»; el renglón se parte solo si no entra. Solo presentación.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin la bandera (Playwright), el cierre se ve como antes: el selector va en su propia línea, AFUERA del <label>.
   2. Con `CIE_RENGLON_PRUEBA`: el selector va adentro del renglón (uno por pedido sin camión, ninguno si ya tiene camión o lo retira el
      cliente), con la propuesta del GPS ya elegida y la pastilla «GPS»; tocar el selector NO tilda; elegir otro camión saca la pastilla;
      lo elegido sobrevive al repintado; abrir y elegir no guardan nada.
   3. Confirmar guarda lo mismo que antes: camión + el chofer de ese camión ese día, en el mismo guardado del ✅.
   4. A 1366 y a 1920 de ancho (la compu de los vendedores): cada renglón entra en UNA línea, nada se encima y nada se sale; con un
      cliente y una zona larguísimos se recortan con «…» y el título dice todo. A 800 se parte en dos líneas, sin encimarse.
   Datos SINTÉTICOS. Reloj clavado el jueves 05/11/2026 a las 17:00 de Bolivia.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_cierre_renglon.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };

const BASE = `
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true; SERVER_AUTH='abierto';
  try{ localStorage.removeItem(LS_PEND); localStorage.removeItem(LS_CIERRE_PEND); localStorage.removeItem('me_gps_dia'); localStorage.removeItem('me_cierre_quien'); }catch(e){}
  if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  CARGA_GEN++; CARGA_ESTADO='ok'; NO_ENCOLAR={}; SAVE_ULTIMO={}; SAVE_REV={};
  loadFromServer=function(){};
  window._saves=[];
  apiSave=function(rec){ window._saves.push(JSON.parse(JSON.stringify(rec))); var r=JSON.parse(JSON.stringify(rec)); r.rev=(Number(r.rev)||0)+1; return Promise.resolve({ ok:true, pedido:r }); };
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
  var P=almUbic('ptf'), n=0;
  window._pin=function(i){ return { lat:P.lat+0.02*i, lng:P.lng+0.01 }; };
  window._P=function(id, o){ n++; var i=n; return Object.assign({ id:id, oc:'11-'+(700+n), cliente:'CLIENTE '+id.toUpperCase(), fecha:todayStr(), turno:'AM', vendedor:'Mirian Salazar',
    vehiculo:'', chofer:'', zona:'Norte', direccion:'Calle '+n, observaciones:'', estado:'', productos:[{ desc:'TITANIO LATEX', medida:'140x190', cant:1, precio:3000, chk:'ok' }],
    saldo:0, pagado:true, entregado:false, maps:'https://www.google.com/maps?q='+_pin(i).lat+','+_pin(i).lng, ts:1, fotos:[], rev:1, nroDia:i }, o||{}); };
  window._armar=function(){
    n=0;
    STATE=[
      _P('h1'),                                                           // sin camión, el Carry se paró en su puerta (GPS)
      _P('h2', { cliente:'MARIA DEL CARMEN GUTIERREZ DE LA FUENTE SALVATIERRA VDA. DE ROJAS', zona:'EQUIPETROL NORTE / LAS PALMAS / URBARI', turno:'PM' }),
      _P('h3', { vehiculo:'Foton nuevo', chofer:'Luis Pierre' }),         // con camión
      _P('h4', { observaciones:'EL CLIENTE RECOGE DE FABRICA' }),         // lo retira el cliente
      _P('h5'), _P('h6'), _P('h7'), _P('h8'),
      _P('a1', { fecha:'2026-11-04' }),                                   // atrasado, sin camión
      _P('a0', { fecha:'2026-11-04', vehiculo:'Foton nuevo', chofer:'Fernando' })
    ];
    saveMirror();
    var D={ f:todayStr(), t:Date.now(), u:{ '6409TIG':{ s:'09:00', ev:[['09:00','sal','ptf',0]], par:[ ['10:00','10:15', _pin(1).lat, _pin(1).lng, ['h1'], 0, 25] ] } } };
    gpsDiaTomar(D);
  };
  window._fila=function(id){ var box=document.getElementById('modal-box'); var i=box && box.querySelector('.cie-ent-chk[data-id="'+id+'"]'); return i ? i.closest('.cie-row') : null; };
  window._cam=function(id){ return document.querySelector('#modal-box .cie-cam[data-id="'+id+'"]'); };
  /* ¿Se enciman dos cosas del renglón? ¿Cuántas líneas ocupa? ¿Algo se sale? */
  window._medir=function(){
    var rows=[].slice.call(document.querySelectorAll('#modal-box .cie-row')), enc=[], multi=[], sale=[];
    rows.forEach(function(r){
      var hs=[].slice.call(r.children).filter(function(x){ return x.getClientRects().length; });
      var R=hs.map(function(x){ return x.getBoundingClientRect(); });
      if(R.length && (Math.max.apply(null,R.map(function(b){ return b.bottom; }))-Math.min.apply(null,R.map(function(b){ return b.top; })))>46) multi.push(r.querySelector('.cie-ent-chk').getAttribute('data-id'));
      var hoj=[].slice.call(r.querySelectorAll('*')).filter(function(x){ return x.tagName!=='OPTION' && x.getClientRects().length && !x.querySelector('*:not(option):not(svg *)') ; });
      var B=hoj.map(function(x){ return x.getBoundingClientRect(); });
      for(var i=0;i<B.length;i++) for(var j=i+1;j<B.length;j++){
        if(hoj[i].contains(hoj[j]) || hoj[j].contains(hoj[i])) continue;
        var a=B[i], b=B[j]; if(a.left<b.right-1 && b.left<a.right-1 && a.top<b.bottom-1 && b.top<a.bottom-1) enc.push((hoj[i].className||hoj[i].tagName)+' / '+(hoj[j].className||hoj[j].tagName));
      }
      var rr=r.getBoundingClientRect(); R.forEach(function(b){ if(b.right>rr.right+1 || b.left<rr.left-1) sale.push(r.querySelector('.cie-ent-chk').getAttribute('data-id')); });
    });
    return { filas:rows.length, enc:enc.slice(0,5), nEnc:enc.length, multi:multi, sale:sale };
  };
`;

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const nueva = async (w, h, flag) => {
    const page = await browser.newPage({ viewport:{ width:w||1366, height:h||768 }, timezoneId:'America/La_Paz' });
    page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
    await page.route(/^https?:/, r=>r.abort());
    if(flag) await page.addInitScript(() => { window.CIE_RENGLON_PRUEBA=true; });
    await page.clock.setFixedTime(new Date('2026-11-05T17:00:00-04:00'));
    await page.goto('file://' + PEDIDOS + '?tema=espuma', { waitUntil:'load' });
    await page.waitForTimeout(300);
    return page;
  };

  console.log('\n── 1. Sin la bandera, como antes ──');
  let page = await nueva(1366, 768, false);
  let r = await page.evaluate((base) => {
    eval(base); _armar(); abrirCierreEntregas();
    var c2=_cam('h2');
    return { activo:cieRenglonActivo(), r1:document.querySelectorAll('#modal-box .cie-r1').length, afuera:!!c2 && !c2.closest('label'), linea:/¿Qué camión lo llevó\?/.test((c2||{}).innerText||''),
             noSalio:/No salió · reprogramar/.test(_fila('h2').innerText) };
  }, BASE);
  if (r.__error) console.log('ERROR', r.__error);
  chk('1 sin bandera: el renglón de siempre y el selector en su línea, afuera del <label>', r.activo===false && r.r1===0 && r.afuera && r.linea && r.noSalio, r);
  await page.close();

  console.log('\n── 2-3. Con la bandera: el camión en el renglón ──');
  page = await nueva(1366, 768, true);
  r = await page.evaluate((base) => {
    eval(base); _armar(); abrirCierreEntregas();
    var o={ saves:window._saves.length, activo:cieRenglonActivo() };
    var dentro=function(id){ var f=_fila(id), s=f && f.querySelector('.cie-cam-sel'); return s ? s.value : null; };
    o.h1=dentro('h1'); o.h1chip=!!(_fila('h1').querySelector('.cie-gps-chip')); o.h1gpsCls=_fila('h1').querySelector('.cie-cam-sel').classList.contains('gps');
    o.h1emoji=/🛰/.test(_fila('h1').querySelector('.cie-cam-sel').innerText);
    o.h2=dentro('h2'); o.a1=dentro('a1');
    o.h3=dentro('h3'); o.h3txt=_fila('h3').innerText.replace(/\s+/g,' ');
    o.h4=dentro('h4'); o.h4txt=_fila('h4').innerText.replace(/\s+/g,' ');
    o.lineasAparte=[].filter.call(document.querySelectorAll('#modal-box .cie-cam'), function(x){ return !x.closest('.cie-row'); }).length;
    o.ayuda=!!document.querySelector('#modal-box .cie-r1-ayuda');
    o.titulo=(_fila('h2').querySelector('.cie-cli')||{}).title;
    /* tocar el selector no tilda */
    var s2=_fila('h2').querySelector('.cie-cam-sel'); s2.click();
    o.tildoClick=_fila('h2').querySelector('.cie-ent-chk').checked;
    s2.value='Foton encarpado'; s2.dispatchEvent(new Event('change', { bubbles:true }));
    o.tildoH2=_fila('h2').querySelector('.cie-ent-chk').checked; o.h2tras=dentro('h2'); o.h2cls=_fila('h2').querySelector('.cie-cam-sel').classList.contains('elegido');
    /* cambiar la propuesta del GPS saca la pastilla */
    var s1=_fila('h1').querySelector('.cie-cam-sel'); s1.value='Foton insumo'; s1.dispatchEvent(new Event('change', { bubbles:true }));
    o.h1chipTras=!!(_fila('h1').querySelector('.cie-gps-chip')); o.h1Tras=dentro('h1');
    s1=_fila('h1').querySelector('.cie-cam-sel'); s1.value='Carry'; s1.dispatchEvent(new Event('change', { bubbles:true }));
    o.h1chipVuelve=!!(_fila('h1').querySelector('.cie-gps-chip'));
    o.savesTrasElegir=window._saves.length;
    renderCierreEntregas();
    o.h2rep=dentro('h2'); o.h1rep=dentro('h1');
    /* tildar un renglón tocando el nombre sí tilda */
    _fila('h5').querySelector('.cie-cli').click();
    o.tildaNombre=_fila('h5').querySelector('.cie-ent-chk').checked;
    _fila('h5').querySelector('.cie-cli').click();
    return o;
  }, BASE);
  if (r.__error) console.log('ERROR', r.__error);
  chk('2a con la bandera el selector va en el renglón: el que vio el GPS ya elegido en «Carry», turquesa, con la pastilla «GPS» (sin emoji en la opción)',
      r.activo && r.h1==='Carry' && r.h1chip && r.h1gpsCls && !r.h1emoji, r);
  chk('2b el de hoy y el atrasado sin camión, vacíos; ningún selector en una línea aparte', r.h2==='' && r.a1==='' && r.lineasAparte===0 && r.ayuda, r);
  chk('2c con camión: dice el camión y su chofer, sin selector; lo retira el cliente: «lo retiró en …», sin selector',
      r.h3===null && /Foton nuevo · Luis Pierre/.test(r.h3txt) && r.h4===null && /lo retiró en/.test(r.h4txt), [r.h3txt, r.h4txt]);
  chk('2d el nombre largo lleva el título entero (se recorta con «…» y se lee con el mouse)', /VDA\. DE ROJAS$/.test(r.titulo||''), r.titulo);
  chk('2e tocar o cambiar el selector no tilda el pedido; tocar el nombre sí', r.tildoClick===false && r.tildoH2===false && r.tildaNombre===true, r);
  chk('2f elegir otro camión saca la pastilla «GPS»; volver al del GPS la pone', r.h1chipTras===false && r.h1Tras==='Foton insumo' && r.h1chipVuelve===true, r);
  chk('2g lo elegido sobrevive al repintado; abrir y elegir no guardan nada', r.h2rep==='Foton encarpado' && r.h1rep==='Carry' && r.saves===0 && r.savesTrasElegir===0 && r.h2cls, r);

  r = await page.evaluate(async () => {
    ['h1','h2','h4'].forEach(function(id){ var i=_fila(id).querySelector('.cie-ent-chk'); i.checked=true; i.dispatchEvent(new Event('change', { bubbles:true })); });
    document.getElementById('cie-ent-quien').value='Ernesto';
    var s0=window._saves.length;
    await confirmarCierreEntregas();
    await new Promise(function(x){ setTimeout(x, 150); });
    var sv=window._saves.slice(s0), de=function(id){ return sv.filter(function(x){ return x.id===id; }); };
    var h1=de('h1')[0]||{}, h2=de('h2')[0]||{}, h4=de('h4')[0]||{};
    return { n:sv.length, h1:[h1.vehiculo, !!h1.entregado], h2:[h2.vehiculo, !!h2.entregado, h2.chofer], h4:[h4.vehiculo||'', !!h4.entregado], h5:de('h5').length };
  });
  if (r.__error) console.log('ERROR', r.__error);
  chk('3 confirmar guarda como siempre: camión elegido + ✅ en un guardado por pedido; lo que retira el cliente sin camión; lo no tildado nada',
      r.n===3 && r.h1[0]==='Carry' && r.h1[1] && r.h2[0]==='Foton encarpado' && r.h2[1] && r.h4[0]==='' && r.h4[1] && r.h5===0, r);
  await page.close();

  console.log('\n── 4. Nada se encima: 1366, 1920 y 800 de ancho ──');
  for (const [w, h] of [[1366, 768], [1920, 1080]]) {
    page = await nueva(w, h, true);
    r = await page.evaluate((base) => { eval(base); _armar(); abrirCierreEntregas(); return _medir(); }, BASE);
    if (r.__error) console.log('ERROR', r.__error);
    chk('4 a '+w+': '+r.filas+' renglones, cada uno en UNA línea, nada encimado y nada afuera', r.filas===10 && r.multi.length===0 && r.nEnc===0 && r.sale.length===0, r);
    await page.close();
  }
  page = await nueva(800, 900, true);
  r = await page.evaluate((base) => { eval(base); _armar(); abrirCierreEntregas(); return _medir(); }, BASE);
  if (r.__error) console.log('ERROR', r.__error);
  chk('4c a 800 se parte en dos líneas, sin encimarse ni salirse', r.multi.length>0 && r.nEnc===0 && r.sale.length===0, r);
  await page.close();

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
