/* 🚚 EL CHOFER SIN SEÑAL SE ENTERA DE LO QUE NO ENTRÓ (26/09).
   Lo encontró la revisión de la pestaña Chofer: sin señal, el ✅ y el cobro en efectivo quedan en la
   cola; si mientras tanto otra persona tocó ese pedido, al volver la señal el servidor dice
   «conflicto», gana su fila y lo del chofer se va. El aviso quedaba en «Mis pedidos», que el chofer
   no mira, y la plata que tiene en la mano desaparecía de su rendición.
   Ahora el rechazo anota QUÉ se perdió (`rechazoPerdido`) y la pestaña Chofer lo muestra arriba de
   todo (`choRechazosHtml`) hasta «Ya lo revisé». No se reaplica solo (ver el comentario del código).
   Reloj clavado, red simulada, datos sintéticos.
   Se corre:  node tests/test_chofer_sin_senal.js
   Dientes:   PEDIDOS=/ruta/al/viejo.html node tests/test_chofer_sin_senal.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const MIERCOLES = '2026-09-23T10:00:00-04:00';
const BASE = `
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=false; SERVER_AUTH='abierto';
  try{ localStorage.removeItem(LS_PEND); localStorage.removeItem(LS_RECHAZOS); }catch(e){}
  if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  CARGA_GEN++; CARGA_ESTADO='ok'; NO_ENCOLAR={}; SAVE_ULTIMO={}; SAVE_REV={};
  window.SRV={}; window._saves=[]; window.SRV_CAIDO=false;
  window._cp=function(o){ return JSON.parse(JSON.stringify(o)); };
  apiPost=function(pl){
    if(pl.action==='save'){
      if(window.SRV_CAIDO) return Promise.reject(new Error('Failed to fetch'));
      var p=pl.pedido, s=SRV[p.id]; window._saves.push(_cp(p));
      if(s && (Number(p.rev)||0)!==(Number(s.rev)||0)) return Promise.resolve({ok:false,error:'conflicto',pedido:_cp(s)});
      var n=_cp(p); n.rev=(s?(Number(s.rev)||0):0)+1; SRV[p.id]=n; return Promise.resolve({ok:true,pedido:_cp(n)});
    }
    if(pl.action==='list') return Promise.resolve({ok:true,pedidos:Object.keys(SRV).map(function(k){ return _cp(SRV[k]); })});
    return Promise.resolve({ok:true});
  };
  window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(m)); return _t(m,k,ms); };
  window._P=function(o){ return Object.assign({id:'p'+Math.random().toString(36).slice(2),fecha:todayStr(),oc:'09-001',vendedor:'Carola Chavez',
    cliente:'C',celular:'70000000',turno:'AM',zona:'Norte',direccion:'Av. Prueba 123',maps:'',pagado:false,saldo:0,
    ts:Date.now(),metodoPago:'',observaciones:'',estado:'',entregado:false,vehiculo:'Carry',chofer:'Luis Pierre',
    garantia:'',nota:'1',acuenta:0,facturarA:'',nit:'',nroDia:1,verificado:true,fotos:[],rev:3,
    productos:[{desc:'SOFT',medida:'140x190',cant:1,precio:1000,chk:'ok'}]},o); };
  /* El chofer tiene la copia VIEJA (rev 3); en la planilla ya hay otra (rev 4) con lo que cambió otro. */
  window._cargar=function(locales, servidor){
    SRV={}; (servidor||locales).forEach(function(p){ SRV[p.id]=_cp(p); });
    STATE=locales.map(_cp); saveMirror();
  };
  window._abrirChofer=async function(filtro){
    showView('chofer'); await new Promise(function(r){ setTimeout(r,150); });   // refresca con SRV…
    llenarSelectChoferes(); document.getElementById('cho-nombre').value='Luis Pierre'; setChoFiltro(filtro||'hoy');
  };
  window._tarjeta=function(cli){
    var c=[].slice.call(document.querySelectorAll('#cho-lista .cho-card')).filter(function(x){ return x.textContent.indexOf(cli)>=0; })[0];
    return c ? c.textContent.replace(/\\s+/g,' ') : '(no está)';
  };
`;

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const page = await browser.newPage({ viewport:{width:360,height:800}, timezoneId:'America/La_Paz', hasTouch:true });
  page.on('pageerror', e=>errores.push(e.message));
  page.on('dialog', async d=>{ if(d.type()==='prompt') await d.accept('1000'); else await d.accept(); });
  await page.clock.setFixedTime(new Date(MIERCOLES));
  await page.route(/^https?:/, r=>r.abort());
  await page.goto('file://'+PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  await page.evaluate(BASE);

  // ── 1. sin señal: ✅ y cobro en efectivo; mientras tanto, otra persona toca el pedido ──
  const r = await page.evaluate(async () => {
    var P=_P({ id:'X1', cliente:'CLIENTE SIN SEÑAL', saldo:1000, pagado:false });
    _cargar([P]);
    await _abrirChofer('hoy');
    SRV_CAIDO=true;
    choEntregado('X1'); await new Promise(function(r){ setTimeout(r,2200); });
    choCobrarMetodo('X1','Efectivo'); await new Promise(function(r){ setTimeout(r,2200); });
    var enCola=getPending().filter(function(p){ return p.id==='X1'; });
    // otra persona (logística) escribe una observación: la planilla ya tiene otro sello
    SRV['X1'].observaciones='llamar antes'; SRV['X1'].rev=(Number(SRV['X1'].rev)||0)+1;
    SRV_CAIDO=false;
    await flushPending(); await new Promise(function(r){ setTimeout(r,300); });
    renderChofer();
    var b=document.getElementById('cho-rechazos');
    return { enCola:enCola.length, entCola:!!(enCola[0]&&enCola[0].entregado), srvEnt:!!SRV['X1'].entregado,
             hay:!!b, txt:b?b.textContent.replace(/\s+/g,' '):'', rech:(typeof rechazosLocales==='function'?rechazosLocales():[]) };
  });
  chk('(punto de partida) sin señal, el ✅ y el cobro quedaron en la cola', r.enCola===1 && r.entCola, JSON.stringify({enCola:r.enCola, ent:r.entCola}));
  chk('(punto de partida) al volver la señal chocó y en la planilla quedó la fila del otro, SIN entregar', r.srvEnt===false, r.srvEnt);
  chk('⚠️ la pestaña Chofer muestra ARRIBA qué no entró', r.hay, r.txt.slice(0,160));
  chk('⚠️ …nombra al cliente, la entrega y el cobro con su monto', /CLIENTE SIN SEÑAL/.test(r.txt) && /la entrega/.test(r.txt) && /Efectivo/.test(r.txt) && /1\.000/.test(r.txt), r.txt.slice(0,220));
  chk('…y el rechazo guarda qué se perdió', r.rech.some(function(x){ return x.id==='X1' && x.perdio && x.perdio.entregado && (x.perdio.cobros||[]).length===1; }), JSON.stringify(r.rech[0]||{}).slice(0,200));

  // ── 2. «Ya lo revisé» lo saca ──
  const r2 = await page.evaluate(() => {
    var btn=[].slice.call(document.querySelectorAll('#cho-rechazos button')).filter(function(b){ return /Ya lo revisé/.test(b.textContent); })[0];
    if(btn) btn.click();
    return { hay:!!document.getElementById('cho-rechazos'), vistos:rechazosLocales().filter(function(x){ return x.perdio; }).every(function(x){ return x.visto; }) };
  });
  chk('«Ya lo revisé» saca el cartel y lo deja anotado como visto', !r2.hay && r2.vistos, JSON.stringify(r2));

  // ── 3. un rechazo donde el chofer no perdió nada suyo NO muestra cartel ──
  const r3 = await page.evaluate(async () => {
    localStorage.removeItem(LS_RECHAZOS);
    var P=_P({ id:'X2', cliente:'OTRO CLIENTE', saldo:500, pagado:false, observaciones:'' });
    _cargar([P]);
    await _abrirChofer('hoy');
    var q=findById('X2'); q.observaciones='nota de la vendedora';
    SRV['X2'].zona='Sur'; SRV['X2'].rev=(Number(SRV['X2'].rev)||0)+1;
    await apiSave(q); await new Promise(function(r){ setTimeout(r,300); });
    renderChofer();
    return { hay:!!document.getElementById('cho-rechazos'), rech:rechazosLocales().length };
  });
  chk('un choque sin ✅, cobro ni foto del chofer NO muestra el cartel (no asusta de más)', !r3.hay && r3.rech>=1, JSON.stringify(r3));

  chk('sin errores de JavaScript', errores.length===0, errores.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
