/* 🔎 TERCERA VUELTA (26/09): lo que los arreglos de la revisión por pestaña (§4gb), todavía sin publicar,
   podían romper en el Chofer.

   1. 📷 LA FOTO QUE ENTRÓ AL SEGUNDO INTENTO NO PIDE QUE LA VUELVAN A SUBIR. Achicar y subir tarda
      30-90 s; si en el medio Contabilidad registró el pago, el primer guardado choca y la foto se pega
      sobre la fila nueva (§4ew). Desde el cartel del chofer sin señal (3f88ede), ese primer choque
      quedaba anotado como «📷 1 foto: volvé a subirla» aunque la foto SÍ quedó: el chofer la subía dos
      veces.
   2. 💵 EL ✅ QUE SE VUELVE A MARCAR NO SE LLEVA EL AVISO DEL COBRO PERDIDO. Sin señal, el chofer cobra
      en efectivo (queda en la cola); vuelve la señal y, antes de que salga la cola, toca ✅. Si otra
      persona tocó el pedido en el medio, choca: el ✅ se vuelve a marcar sobre la fila nueva (03ecb0b),
      pero el cobro no (a propósito). Al terminar, se borraba el rechazo ENTERO — también el «💵 el
      cobro: volvé a anotarlo» — y la plata que el chofer tiene en la mano desaparecía sin aviso.

   Reloj clavado, red simulada, datos SINTÉTICOS (el repo es público).
   Se corre:  node tests/test_rev3_entregas.js          (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/a/la/pedidos.html/de/antes node tests/test_rev3_entregas.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,300)):''); };
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
  window._cargar=function(locales, servidor){
    SRV={}; (servidor||locales).forEach(function(p){ SRV[p.id]=_cp(p); });
    STATE=locales.map(_cp); saveMirror();
  };
  window._abrirChofer=async function(filtro){
    showView('chofer'); await new Promise(function(r){ setTimeout(r,150); });
    llenarSelectChoferes(); document.getElementById('cho-nombre').value='Luis Pierre'; setChoFiltro(filtro||'hoy');
  };
  window._cartel=function(){ renderChofer(); var b=document.getElementById('cho-rechazos'); return b ? b.textContent.replace(/\\s+/g,' ') : ''; };
`;

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];

  // ══ 1 y 2: el chofer ════════════════════════════════════════════════════════
  const page = await browser.newPage({ viewport:{width:360,height:800}, timezoneId:'America/La_Paz', hasTouch:true });
  page.on('pageerror', e=>errores.push('nueva: '+e.message));
  page.on('dialog', async d=>{ if(d.type()==='prompt') await d.accept('1000'); else await d.accept(); });
  await page.clock.setFixedTime(new Date(MIERCOLES));
  await page.route(/^https?:/, r=>r.abort());
  await page.goto('file://'+PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  await page.evaluate(BASE);

  console.log('── 1. 📷 La foto que entró al segundo intento ──');
  const r1 = await page.evaluate(async () => {
    localStorage.removeItem(LS_RECHAZOS);
    var P=_P({ id:'F1', cliente:'CLIENTE FOTO', saldo:0, pagado:true, entregado:true, metodoPago:'Efectivo 1000 @2026-09-23' });
    _cargar([P]);
    await _abrirChofer('hoy');
    fotoCronometro=function(){ return Promise.resolve('data:image/jpeg;base64,AAAA'); };   // achicar y subir a Drive no es lo que se prueba
    subirFoto=function(){
      // mientras la foto subía, Contabilidad le puso el recibo al pago: la planilla ya tiene otro sello
      SRV['F1'].metodoPago='Efectivo 1000 @2026-09-23 #55'; SRV['F1'].rev=(Number(SRV['F1'].rev)||0)+1;
      return Promise.resolve({ ok:true, fotoId:'FOTO_NUEVA_1' });
    };
    FOTO_PEDIDO_ID='F1';
    onFotoElegida({ target:{ files:[{ name:'entrega.jpg' }] } });
    await new Promise(function(r){ setTimeout(r,700); });
    return { srv:_cp(SRV['F1']), cartel:_cartel(), toasts:window._toasts.slice(-4),
             rech:rechazosLocales().filter(function(x){ return x.id==='F1'; }) };
  });
  chk('(punto de partida) el primer guardado chocó y la foto quedó al segundo intento, con el recibo de Contabilidad',
      (r1.srv.fotos||[]).indexOf('FOTO_NUEVA_1')>=0 && /#55/.test(r1.srv.metodoPago||'') && r1.toasts.some(function(t){ return /Foto guardada/.test(t); }),
      JSON.stringify({fotos:r1.srv.fotos, mp:r1.srv.metodoPago, toasts:r1.toasts}));
  chk('⚠️ el chofer NO ve «📷 volvé a subirla» de una foto que SÍ entró (la subía dos veces)', !r1.cartel, r1.cartel.slice(0,200));
  chk('…ni queda un rechazo con esa foto «perdida»', !r1.rech.some(function(x){ return x.perdio && x.perdio.fotos; }), JSON.stringify(r1.rech).slice(0,200));

  console.log('\n── 2. 💵 El ✅ que se vuelve a marcar y el cobro que quedó en la cola ──');
  const r2 = await page.evaluate(async () => {
    localStorage.removeItem(LS_RECHAZOS); try{ localStorage.removeItem(LS_PEND); }catch(e){}
    NO_ENCOLAR={}; SAVE_ULTIMO={}; SAVE_REV={};
    var P=_P({ id:'E1', cliente:'CLIENTE EFECTIVO', saldo:1000, pagado:false });
    _cargar([P]);
    await _abrirChofer('hoy');
    SRV_CAIDO=true;
    choCobrarMetodo('E1','Efectivo'); await new Promise(function(r){ setTimeout(r,2200); });   // sin señal: a la cola
    var enCola=getPending().some(function(p){ return p.id==='E1' && cobrosDe(p).length===1; });
    // mientras tanto logística anota algo en ese pedido: la planilla ya tiene otro sello
    SRV['E1'].observaciones='tocar timbre'; SRV['E1'].rev=(Number(SRV['E1'].rev)||0)+1;
    SRV_CAIDO=false;          // vuelve la señal; la cola sale con el reloj de 2 minutos, todavía no
    choEntregado('E1'); await new Promise(function(r){ setTimeout(r,900); });
    return { enCola:enCola, srvEnt:!!SRV['E1'].entregado, srvCob:cobrosDe(SRV['E1']).length,
             cola:getPending().filter(function(p){ return p.id==='E1'; }).length, cartel:_cartel(),
             rech:rechazosLocales().filter(function(x){ return x.id==='E1'; }) };
  });
  chk('(punto de partida) sin señal, el cobro de Bs 1.000 quedó en la cola', r2.enCola);
  chk('(punto de partida) el ✅ chocó y se volvió a marcar sobre la fila nueva (arreglo del 26/09)', r2.srvEnt, r2.srvEnt);
  chk('(punto de partida) el cobro NO está ni en la planilla ni en la cola: ganó la fila del otro', r2.srvCob===0 && r2.cola===0, JSON.stringify({srv:r2.srvCob, cola:r2.cola}));
  chk('⚠️ el cartel del chofer SIGUE diciendo que el cobro en efectivo de Bs 1.000 no entró', /Efectivo/.test(r2.cartel) && /1\.000/.test(r2.cartel) && /CLIENTE EFECTIVO/.test(r2.cartel), r2.cartel.slice(0,220) || '(sin cartel)');
  chk('…y no le pide volver a tocar ✅ (ese sí entró)', !/la entrega/.test(r2.cartel), r2.cartel.slice(0,220));
  chk('…el rechazo queda anotado solo con el cobro', r2.rech.length===1 && r2.rech[0].perdio && !r2.rech[0].perdio.entregado && (r2.rech[0].perdio.cobros||[]).length===1, JSON.stringify(r2.rech).slice(0,220));

  // Control: sin nada perdido aparte del ✅, el choque se resuelve sin cartel (como lo dejó 03ecb0b).
  const r2b = await page.evaluate(async () => {
    localStorage.removeItem(LS_RECHAZOS); try{ localStorage.removeItem(LS_PEND); }catch(e){}
    NO_ENCOLAR={}; SAVE_ULTIMO={}; SAVE_REV={};
    var P=_P({ id:'E2', cliente:'CLIENTE SOLO ENTREGA', saldo:0, pagado:true });
    _cargar([P]);
    await _abrirChofer('hoy');
    SRV['E2'].observaciones='portón verde'; SRV['E2'].rev=(Number(SRV['E2'].rev)||0)+1;   // otro lo tocó recién
    var n0=window._toasts.length;
    choEntregado('E2'); await new Promise(function(r){ setTimeout(r,700); });
    return { srvEnt:!!SRV['E2'].entregado, obs:SRV['E2'].observaciones, cartel:_cartel(), rech:rechazosLocales().filter(function(x){ return x.id==='E2'; }).length,
             choco:window._toasts.slice(n0).some(function(t){ return /otra persona había tocado/.test(t); }) };
  });
  chk('(control) solo el ✅ choca: se marca sobre la fila nueva, sin cartel ni rechazo colgado',
      r2b.choco && r2b.srvEnt && r2b.obs==='portón verde' && !r2b.cartel && r2b.rech===0, JSON.stringify(r2b));

  chk('sin errores de JavaScript', errores.length===0, errores.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
