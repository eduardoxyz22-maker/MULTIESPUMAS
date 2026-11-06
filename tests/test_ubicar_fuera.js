/* §4ok-E5 (05/11) UN PIN FUERA DE SANTA CRUZ NO SE GUARDA.
   Hasta el 13/10 hubo 8 pedidos con el pin en Kansas, EE.UU. (37.0625,-95.677068, la «ubicación vacía» de Google) y el formulario no
   decía nada: `KM_SOSPECHOSO` (60 km) solo se miraba en 📍 Revisar ubicaciones, cuando el camión ya iba a salir.

   LO QUE CUIDA (datos inventados; reloj clavado el jueves 05/11/2026 a las 10:00 de Bolivia):
   1. La regla: Kansas → fuera; a más de 60 km de PTF (Cochabamba, -17.1 al norte) → fuera; Cotoca, Warnes, el Urubó y la ciudad → bien.
   2. Un pedido NUEVO con el pin en Kansas (enlace o coordenadas) o a 72 km NO se guarda: marca el campo y dice «Esa ubicación no es de
      Santa Cruz… pegá otra o dejala vacía». Sin ubicación o con una de la ciudad, se guarda.
   3. «Para guardar» y la barra de pasos dicen lo mismo que Guardar (el paso del día queda sin ✓ mientras la ubicación esté fuera).
   4. Un pedido ya guardado con el pin en Kansas se edita y se guarda igual si NO se toca la ubicación; si se la cambia a otra de afuera, frena.
   5. El mapita del formulario lo avisa al pegarla. 📍 Editar ubicación (Mis pedidos) tampoco la guarda, y un enlace corto que el servidor
      abre en Kansas no se guarda.
   Se corre:  node tests/test_ubicar_fuera.js   (PEDIDOS=… para correrla contra otra versión) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const KANSAS = 'https://www.google.com/maps?q=37.0625,-95.677068';

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const page = await browser.newPage({ viewport:{ width:1600, height:1000 }, timezoneId:'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  let PROMPT=null;
  page.on('dialog', d => (d.type()==='prompt' ? d.accept(PROMPT==null ? '' : PROMPT) : d.accept()));
  await page.route(/^https?:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-11-05T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  const ev = async (fn, arg) => { try{ return await page.evaluate(fn, arg); }catch(e){ return { __err:String(e.message||e).slice(0,200) }; } };
  await ev(() => {
    document.getElementById('conn-form').style.display='none';
    CONNECTED=true; UNLOCKED=false; CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    window._pl=[{ id:'viejo1', oc:'10-500', nota:'7001', vendedor:'Carola Chavez', cliente:'CLIENTE VIEJO', celular:'70000009', fecha:'2026-11-06', turno:'AM', zona:'Norte',
      direccion:'CALLE 2', maps:'https://www.google.com/maps?q=37.0625,-95.677068', productos:[{ desc:'TITANIO LATEX', medida:'160x190', codigo:'', cant:1, precio:3000 }],
      saldo:3000, acuenta:0, pagado:false, metodoPago:'', ts:new Date('2026-10-12T10:00:00-04:00').getTime(), rev:2 }];
    window._saves=0; window._toasts=[];
    var t0=toast; toast=function(m){ window._toasts.push(String(m)); try{ return t0.apply(this, arguments); }catch(e){} };
    apiSave=function(rec){ window._saves++; var g=JSON.parse(JSON.stringify(rec)); g.rev=(Number(g.rev)||0)+1;
      window._pl=window._pl.filter(function(x){ return x.id!==g.id; }).concat([g]); return Promise.resolve({ ok:true, pedido:g }); };
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window._pl)) }); };
    STATE=JSON.parse(JSON.stringify(window._pl)); saveMirror(); ULTIMO_REFRESCO=Date.now();
  });

  /* 1 · la regla */
  let r = await ev(()=>{ var f=function(la, ln){ return ubicFueraDeSantaCruz({ lat:la, lng:ln }); };
    return { kansas:f(37.0625,-95.677068), cbba:f(-17.3895,-66.1568), norte:f(-17.1,-63.1), cotoca:f(-17.7533,-62.9967), warnes:f(-17.5167,-63.1667),
             urubo:f(-17.7600,-63.2300), ciudad:f(-17.7833,-63.1821), nada:f(null, null) }; });
  chk('1 · Kansas («ubicación vacía» de Google) → fuera, y lo dice', /ubicación vacía» de Google/.test(r.kansas||''), r.kansas);
  chk('1 · Cochabamba y -17.1 al norte (72 km de PTF) → fuera, con los km', /km de PTF/.test(r.cbba||'') && /queda a 7\d km de PTF/.test(r.norte||''), [r.cbba, r.norte]);
  chk('1 · Cotoca, Warnes, el Urubó y la ciudad → bien; sin coordenadas, nada', !r.cotoca && !r.warnes && !r.urubo && !r.ciudad && !r.nada, r);

  const llenar = (maps) => ev((maps) => {
    showView('form'); resetForm();
    document.getElementById('f-fecha').value='2026-11-06'; segSet('f-turno','AM');
    document.getElementById('f-vendedor').value='Carola Chavez'; applyVendedorLite();
    document.getElementById('f-cliente').value='CLIENTE NUEVO'; document.getElementById('f-celular').value='70000001';
    document.getElementById('f-zona').value='Norte'; document.getElementById('f-direccion').value='CALLE FALSA 1';
    document.getElementById('f-nota').value='1234'; document.getElementById('f-maps').value=maps;
    var box=document.getElementById('f-productos'); box.innerHTML=''; addProdRow('TITANIO LATEX','160x190','',1,''); box.lastElementChild.querySelector('.prod-precio').value='3000';
    refreshDelButtons(); segSet('f-pagado','NO'); document.getElementById('f-saldo').value='3000';
    try{ updateMetodoVisibility(); }catch(e){}
  }, maps);
  const guardar = () => ev(async () => {
    var n0=window._saves; window._toasts=[]; submitPedido(); await new Promise(res=>setTimeout(res, 450));
    var marc=document.getElementById('f-maps').classList.contains('err');
    try{ closeModal(); }catch(e){}
    return { guardo:window._saves>n0, marcado:marc, toast:window._toasts.join(' | ') };
  });

  /* 2 · pedido nuevo */
  await llenar(KANSAS);
  r = await ev(()=>{ var d=document.getElementById('fx-der'); try{ fxDerPintar(); }catch(e){} return { pasos:fxPasosEstado(), der:d ? d.textContent : '' }; });
  const pasosK = r;
  r = await guardar();
  chk('2 · un pedido NUEVO con el pin en Kansas no se guarda y marca el campo', !r.guardo && r.marcado, r);
  chk('2 · …y dice «Esa ubicación no es de Santa Cruz (es la «ubicación vacía» de Google…): pegá otra o dejala vacía»', /Esa ubicación no es de Santa Cruz \(es la «ubicación vacía» de Google, en Estados Unidos\): pegá otra o dejala vacía/.test(r.toast), r.toast);
  await llenar('37.0625, -95.677068'); r = await guardar();
  chk('2 · también pegado como coordenadas sueltas', !r.guardo && /no es de Santa Cruz/.test(r.toast), r);
  await llenar('https://www.google.com/maps?q=-17.1,-63.1'); r = await guardar();
  chk('2 · a 72 km de PTF tampoco («queda a 7x km de PTF»)', !r.guardo && /queda a 7\d km de PTF/.test(r.toast), r);
  await llenar('https://www.google.com/maps?q=-17.7832,-63.1821'); r = await guardar();
  chk('2 · con una ubicación de la ciudad se guarda', r.guardo && !r.marcado, r);
  await llenar(''); r = await guardar();
  chk('2 · sin ubicación se guarda (dejala vacía)', r.guardo, r);

  /* 3 · «Para guardar» y los pasos */
  chk('3 · con Kansas, el paso del día queda sin ✓ y «Para guardar» lista «Ubicación»', pasosK.pasos && pasosK.pasos[2]===false && /○ Ubicación/.test(pasosK.der||''), pasosK);
  await llenar('https://www.google.com/maps?q=-17.7832,-63.1821');
  r = await ev(()=>{ try{ fxDerPintar(); }catch(e){} var d=document.getElementById('fx-der'); return { pasos:fxPasosEstado(), der:d ? d.textContent : '' }; });
  chk('3 · con una de la ciudad, el paso del día queda ✓ y «Ubicación» no aparece', r.pasos && r.pasos[2]===true && !/Ubicación/.test(r.der||''), r);

  /* 4 · editar un pedido viejo con el pin en Kansas */
  r = await ev(async ()=>{ editPedido('viejo1'); await new Promise(res=>setTimeout(res, 250));
    document.getElementById('f-direccion').value='CALLE 2, CASA AZUL';
    var n0=window._saves; window._toasts=[]; submitPedido(); await new Promise(res=>setTimeout(res, 450)); try{ closeModal(); }catch(e){}
    var p=window._pl.filter(function(x){ return x.id==='viejo1'; })[0];
    return { guardo:window._saves>n0, maps:p && p.maps, dir:p && p.direccion, toast:window._toasts.join(' | ') }; });
  chk('4 · un pedido viejo con el pin en Kansas se edita sin tocar la ubicación y SE GUARDA como estaba', r.guardo && r.maps===KANSAS && /CASA AZUL/.test(r.dir||''), r);
  r = await ev(async ()=>{ editPedido('viejo1'); await new Promise(res=>setTimeout(res, 250));
    document.getElementById('f-maps').value='-17.3895, -66.1568';
    var n0=window._saves; window._toasts=[]; submitPedido(); await new Promise(res=>setTimeout(res, 450)); try{ closeModal(); }catch(e){}
    return { guardo:window._saves>n0, toast:window._toasts.join(' | ') }; });
  chk('4 · si se le cambia la ubicación a otra de afuera, frena', !r.guardo && /no es de Santa Cruz/.test(r.toast), r);

  /* 5 · el mapita, 📍 Editar ubicación y el enlace corto */
  r = await ev(async (KANSAS)=>{ showView('form'); resetForm(); var m=document.getElementById('f-maps'); m.value=KANSAS; m.dispatchEvent(new Event('input'));
    try{ fxMapaPintar(); }catch(e){} await new Promise(res=>setTimeout(res, 120)); var el=document.getElementById('fx-mapa');
    return { vis:el && !el.hidden, mal:el && /\bmal\b/.test(el.className), t:el ? el.textContent : '' }; }, KANSAS);
  chk('5 · el mapita del formulario lo avisa al pegarla', r.vis && r.mal && /no es de Santa Cruz/.test(r.t||''), r);
  PROMPT='37.0625, -95.677068';
  r = await ev(async ()=>{ STATE=JSON.parse(JSON.stringify(window._pl)); var p=STATE.filter(function(x){ return x.id!=='viejo1'; })[0];
    var antes=p.maps, n0=window._saves; window._toasts=[]; editarUbicacion(p.id); await new Promise(res=>setTimeout(res, 300));
    return { id:p.id, antes:antes, ahora:findById(p.id).maps, guardo:window._saves>n0, toast:window._toasts.join(' | ') }; });
  chk('5 · 📍 Editar ubicación con Kansas no la guarda y lo dice', !r.guardo && r.ahora===r.antes && /no es de Santa Cruz/.test(r.toast), r);
  PROMPT='https://maps.app.goo.gl/CortoInventado9';
  r = await ev(async ()=>{ apiGeocode=function(L){ return Promise.resolve({ ok:true, geo:[{ link:L[0], lat:37.0625, lng:-95.677068 }] }); };
    var p=STATE.filter(function(x){ return x.id!=='viejo1'; })[0], antes=p.maps, n0=window._saves; window._toasts=[];
    editarUbicacion(p.id); await new Promise(res=>setTimeout(res, 400));
    return { antes:antes, ahora:findById(p.id).maps, guardo:window._saves>n0, toast:window._toasts.join(' | ') }; });
  chk('5 · un enlace corto que el servidor abre en Kansas no se guarda', !r.guardo && r.ahora===r.antes && /no es de Santa Cruz/.test(r.toast), r);

  chk('sin errores de la página', errores.length===0, errores);
  await browser.close();
  console.log('\n'+PASS+' bien, '+FAIL+' mal');
  process.exit(FAIL ? 1 : 0);
})();
