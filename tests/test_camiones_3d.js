/* 🚛 LOS CAMIONES EN 3D CON FICHAS (§4jq, 10/10). El dueño: «los montacargas, camiones, todo bello, pero el panel lateral y el
   diseño no» → «publica y veamos».
     1. Con `CV_3D` el panel oscuro de la derecha queda vacío y abajo va UNA ficha por camión (los de VEHICULOS + «Sin vehículo»).
     2. «Sin vehículo» primero, con un selector por pedido; después los camiones con carga y al final los vacíos.
     3. Cada producto con SU tilde: la misma clave de la Lista de carga, en los dos sentidos.
     4. Los estados: ✔ hay, 📥 traer de Moreno, ⛔ sin stock (sin tilde), 🏪 en Banzer.
     5. Tocar el nombre de un producto abre la ventana con los pedidos que lo llevan; tocar el título elige el camión.
     6. Sin three.js (sin internet) queda la imagen de siempre y las fichas igual; sin errores.
   Reloj clavado en el 08/10/2026. Se corre:  node tests/test_camiones_3d.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const J=x=>JSON.stringify(x);
const ARCH = 'file://' + (process.env.PEDIDOS||require('path').resolve('pedidos.html'));

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{width:1300,height:1000}, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-10-08T10:00:00-04:00'));
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.route('https://**', r=>r.abort());
  await page.goto(ARCH, { waitUntil:'load' });
  await page.waitForTimeout(300);
  const hay = await page.evaluate(() => typeof cv3dColsPintar==='function');
  if(!hay){ chk('el panel tiene las fichas de los camiones', false); console.log('\n'+PASS+' bien · '+FAIL+' mal'); await browser.close(); process.exit(1); }

  await page.evaluate(async () => {
    var el=document.getElementById('conn-form'); if(el) el.style.display='none';
    CONNECTED=true; UNLOCKED=true; VENTA_TIENDA=false;
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    window.autoAbrirAvisos=function(){};
    document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block'; mostrarBotonesTodos();
    window._SRV={};
    apiSave=function(rec){ var r=JSON.parse(JSON.stringify(rec)); r.rev=(Number((_SRV[r.id]||{}).rev)||0)+1; _SRV[r.id]=r; return Promise.resolve({ok:true, pedido:r}); };
    apiList=function(){ var l=JSON.parse(JSON.stringify(STATE.filter(function(p){ return !esFilaSistema(p); })));
      Object.keys(_SRV).forEach(function(k){ if(esFilaSistema(_SRV[k])) l.push(JSON.parse(JSON.stringify(_SRV[k]))); });
      return Promise.resolve({ok:true,pedidos:l}); };
    try{ localStorage.removeItem(LS_PEND); }catch(e){}
    var hoy=todayStr(), n=0;
    var P=function(veh,cli,prods){ n++; return { id:'c3'+n, fecha:hoy, oc:'10-'+(30+n), vendedor:'Maria Flores', cliente:cli, celular:'7', turno:'AM', zona:'Norte',
      direccion:'Calle '+n, maps:'', pagado:true, saldo:0, ts:Date.now(), metodoPago:'', observaciones:'', estado:'', entregado:false, vehiculo:veh, chofer:veh?(VEHICULOS[veh]||[])[0]:'',
      garantia:'', nota:String(500+n), acuenta:0, facturarA:'', nit:'', nroDia:n, verificado:false, fotos:[], productos:prods }; };
    var x=function(d,m,c,e){ return Object.assign({codigo:'',desc:d,medida:m,cant:c},e||{}); };
    STATE=[
      P('Foton nuevo','CLIENTE A',[x('TITANIO LATEX','140x190',2,{chk:'ok'}), x('ESPECIAL SEMIORTOPEDICO','140x190',3,{chk:'im'})]),
      P('Foton encarpado','CLIENTE B',[x('ORO BI RELAX','140x190',2,{chk:'ok',chkDe:'Banzer'}), x('MEMORY FLEX','160x200',1,{chk:'no'})]),
      P('','CLIENTE C',[x('DREAM','100x190',2,{chk:'ok'})])
    ];
    STOCK=stockVacio(); STOCK_CARGADO=true; STOCK.al={'Banzer':'sale'};
    CARGA_CHK={}; saveMirror();
    CV_3D=true;
    showView('admin'); segSet('adm-mode','todo'); QUICK_FILTER=''; renderAdmin();
    await new Promise(r=>setTimeout(r,150));
    CV_DIA='hoy'; CV_SEL='Foton nuevo'; cargaVivaPintar();
  });
  await page.waitForTimeout(300);

  console.log('\n── 1-2. Una ficha por camión, «Sin vehículo» primero, sin panel ──');
  let r = await page.evaluate(() => ({
    panel:(document.getElementById('cv-panel')||{}).innerHTML||'',
    fichas:[].map.call(document.querySelectorAll('#cv-cols .cvc'), function(a){ return a.getAttribute('data-k'); }),
    sel:document.querySelectorAll('#cv-cols .cvc[data-k="Sin vehículo"] .cvc-sel').length,
    caja:document.querySelector('#carga-viva .cv-caja').className }));
  chk('el panel oscuro queda vacío', r.panel==='', r.panel.slice(0,80));
  chk('la caja toma el diseño claro', /cv3d-caja/.test(r.caja), r.caja);
  chk('«Sin vehículo» primero, luego los con carga, al final los vacíos', J(r.fichas)===J(['Sin vehículo','Foton nuevo','Foton encarpado','Carry','Foton insumo']), J(r.fichas));
  chk('«Sin vehículo» trae un selector por pedido', r.sel===1, r.sel);

  console.log('\n── 3. Los tildes son los de la Lista de carga ──');
  r = await page.evaluate(() => {
    var inp=document.querySelector('#cv-cols .cvc[data-k="Foton nuevo"] .cvc-l input'), k=inp.getAttribute('data-k');
    var esperado=cargaChkKey(todayStr(),'Foton nuevo',cargaProdKey(STATE[0].productos[1]));
    inp.checked=true; inp.dispatchEvent(new Event('change'));
    var tras=isCargaChk(k), on=document.querySelector('#cv-cols .cvc[data-k="Foton nuevo"] .cvc-l input[data-k="'+CSS.escape(k)+'"]').checked;
    setCargaChk(k,false); cargaVivaPintar();
    var off=document.querySelector('#cv-cols .cvc[data-k="Foton nuevo"] .cvc-l input[data-k="'+CSS.escape(k)+'"]').checked;
    return { k:k, esperado:esperado, tras:tras, on:on, off:off, leyc:document.querySelector('#cv-cols .cvc[data-k="Foton nuevo"] .dep-leyc').textContent };
  });
  chk('la clave es la de la Lista de carga', r.k===r.esperado, J([r.k,r.esperado]));
  chk('tildar en la ficha tilda en la Lista de carga', r.tras && r.on, J(r));
  chk('destildar en la Lista vuelve a la ficha', r.off===false, J(r));
  chk('la ficha dice cuánto hay en el camión', /0 de 5 bultos en el camión/.test(r.leyc), r.leyc);

  console.log('\n── 4. Los estados ──');
  r = await page.evaluate(() => ({ fn:document.querySelector('#cv-cols .cvc[data-k="Foton nuevo"]').innerText.replace(/\s+/g,' '),
    fe:document.querySelector('#cv-cols .cvc[data-k="Foton encarpado"]').innerText.replace(/\s+/g,' '),
    sinTilde:document.querySelector('#cv-cols .cvc[data-k="Foton encarpado"] .cvc-l.cero input').disabled }));
  chk('✔ hay y 📥 traer de Moreno', /✔ hay/.test(r.fn) && /3 traer de Moreno/.test(r.fn), r.fn);
  chk('⛔ sin stock va sin tilde', /sin stock/.test(r.fe) && r.sinTilde, r.fe);
  chk('🏪 en Banzer', /en Banzer/.test(r.fe), r.fe);

  console.log('\n── 5. Tocar ──');
  r = await page.evaluate(() => {
    document.querySelector('#cv-cols .cvc[data-k="Foton nuevo"] .cvc-p').click();
    var m=document.getElementById('dep-modal'), txt=m?m.innerText.replace(/\s+/g,' '):'', vis=m && getComputedStyle(m).display!=='none';
    depPanel(null);
    document.querySelector('#cv-cols .cvc[data-k="Foton encarpado"] h4').click();
    return { txt:txt, vis:vis, sel:CV_SEL, on:document.querySelector('#cv-cols .cvc.on').getAttribute('data-k') };
  });
  chk('el producto abre la ventana con su pedido', r.vis && /CLIENTE A/.test(r.txt) && /Foton nuevo/.test(r.txt), r.txt.slice(0,200));
  chk('el título elige el camión', r.sel==='Foton encarpado' && r.on==='Foton encarpado', J(r));

  console.log('\n── 5b. Tocar en la escena 3D (11/10, dueño: «no funcionan los montacargas y camiones del 3D») ──');
  r = await page.evaluate(() => {
    /* el piso del andén (caja invisible) queda ADELANTE del montacargas: tiene que ganar el montacargas */
    var zona={ userData:{ dep:{ fn:function(){}, zona:true, n:'zona' } } }, mc={ userData:{ dep:{ fn:function(){}, n:'mc' } } }, pieza={ userData:{}, parent:mc };
    var a=depHitDe([{ object:zona }, { object:pieza }]), b=depHitDe([{ object:zona }]), c=depHitDe([]);
    var D=cargaVivaDatos(), cam=D.porK['Foton nuevo'], sin=D.cams.filter(function(x){ return x.sin; })[0];
    var leer=function(){ var m=document.getElementById('dep-modal'); return { vis:!!m && getComputedStyle(m).display!=='none', tit:(m.querySelector('.dep-md-cab b')||{}).textContent||'', txt:m.innerText.replace(/\s+/g,' '), n:m.querySelectorAll('.dep-md-p').length }; };
    cv3dCamPanel(cam); var r1=leer(); depPanel(null);
    cv3dCamPanel(sin); var r2=leer(); depPanel(null);
    cv3dLugarPanel('bz'); var r3=leer(); depPanel(null);
    cv3dLugarPanel('im'); var r4=leer(); depPanel(null);
    return { a:a&&a.n, b:b&&b.n, c:c, cam:r1, sin:r2, bz:r3, im:r4 };
  });
  chk('gana lo tocado (el montacargas), no el piso del andén que está adelante', r.a==='mc' && r.b==='zona' && r.c==null, J([r.a,r.b,r.c]));
  chk('tocar un camión abre su ficha con sus pedidos y lo cargado', r.cam.vis && /Foton nuevo/.test(r.cam.tit) && r.cam.n===1 && /CLIENTE A/.test(r.cam.txt) && /de 5 bultos cargados/.test(r.cam.txt), r.cam);
  chk('«Sin camión» abre los pedidos que esperan camión', r.sin.vis && /Sin camión/.test(r.sin.tit) && /CLIENTE C/.test(r.sin.txt), r.sin);
  chk('Banzer abre los pedidos que se cargan allá', r.bz.vis && /Banzer/.test(r.bz.tit) && r.bz.n===1 && /CLIENTE B/.test(r.bz.txt), r.bz);
  chk('en Administración la ficha dice la OC y la nota («OC 10-31 · Nota 501»), logística busca por OC', /OC 10-31 · Nota 501/.test(r.cam.txt), r.cam.txt.slice(0,160));
  chk('Moreno abre los pedidos que hay que ir a buscar', r.im.vis && /Ir a buscar/.test(r.im.tit) && r.im.n===1 && /CLIENTE A/.test(r.im.txt), r.im);

  console.log('\n── 6. Sin 3D y sin errores ──');
  await page.waitForTimeout(500);
  r = await page.evaluate(() => ({ img:!!document.querySelector('#carga-viva .cv-lienzo img'), con3d:!!document.querySelector('.cv-mapa.con3d') }));
  chk('sin three.js queda la imagen de siempre', r.img && !r.con3d, J(r));
  chk('sin errores', !errors.length, errors.join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close(); process.exit(FAIL?1:0);
})();
