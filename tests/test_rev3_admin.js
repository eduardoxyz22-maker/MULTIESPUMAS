/* 🔒 TERCERA REVISIÓN DE ADMINISTRACIÓN (26/09/2026) — lo que quedó reportado y se arregló.

   1. 🚚 La hoja de ruta no decía el flete pactado: una venta pagada con flete salía «✅ PAGADO» y
      el chofer no se enteraba de que tenía que cobrar el flete en la puerta (§4ai). La tarjeta del
      chofer ya lo dice (a4fbfe0): la hoja de ruta —pantalla, impresa y WhatsApp— dice lo mismo,
      con las mismas palabras. ATC y RPT no cambian.
   2. 📦 Las tildes de la Lista de carga se perdían con dos cargadores a la vez: la fila
      `__carga_chk__` se reescribía ENTERA con lo que tenía ese celular (gana el último, lo del otro
      desaparece), y un refresco entre el toque y el guardado se llevaba la tilde recién puesta.
      Ahora, como los días cerrados (7ee6160): se relee la planilla y se aplica solo lo tocado acá.
   3. 🔒 Un cierre de día (o una tilde) hecho SIN señal quedaba en la cola con la lista vieja y, al
      volver la señal, se mandaba tal cual: pisaba lo que otra computadora cerró, reabrió o tildó
      mientras tanto. Ahora se rearma con la planilla de ese momento. Las demás filas de la cola
      se mandan igual que siempre.
   4. 🌅🌆 Los chips AM/PM de Administración no contaban los pedidos SIN turno; el cupo los cuenta
      como AM (`cuposUsadosTurno`, y el portero del `.gs`).

   Reloj clavado (miércoles 23/09/2026, 10:00 de Bolivia). Red cortada, servidor simulado, datos
   sintéticos. Se corre:  node tests/test_rev3_admin.js
   Dientes contra el panel viejo:  PEDIDOS=/ruta/al/viejo.html node tests/test_rev3_admin.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const J = (o) => JSON.stringify(o);
const MIERCOLES = '2026-09-23T10:00:00-04:00';

const BASE = `
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true; SERVER_AUTH='abierto';
  document.getElementById('admin-lock').style.display='none';
  document.getElementById('admin-content').style.display='block';
  try{ localStorage.removeItem(LS_PEND); localStorage.removeItem(LS_RECHAZOS); }catch(e){}
  if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  CARGA_GEN++; CARGA_ESTADO='ok'; NO_ENCOLAR={}; SAVE_ULTIMO={}; SAVE_REV={};
  SERVER_VER=SCRIPT_VERSION_ESPERADA;
  window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(m)); return _t(m,k,ms); };
  window._P=function(o){ return Object.assign({id:'p'+Math.random().toString(36).slice(2),fecha:todayStr(),oc:'',vendedor:'Carola Chavez',
    cliente:'C',celular:'70000000',turno:'AM',zona:'Norte',direccion:'Av. Banzer 123',maps:'',pagado:false,saldo:0,
    ts:Date.now(),metodoPago:'',observaciones:'',estado:'',entregado:false,vehiculo:'Foton nuevo',chofer:'Luis Pierre',
    garantia:'',nota:'',acuenta:0,facturarA:'',nit:'',nroDia:1,verificado:true,fotos:[]},o); };
  /* La planilla compartida por «todas las computadoras»: las dos filas que se reescriben enteras. */
  window._srv={ cierre:'', carga:'', lee:0, saves:[], tardaSave:0, listFalla:false, saveFalla:false };
  window._diasSrv=function(){ return (String(window._srv.cierre||'').match(/\\d{4}-\\d{2}-\\d{2}/g)||[]).sort().join(' '); };
  window._cargaSrv=function(){ return Object.keys(parseCargaChk(window._srv.carga)).sort().join(' ; '); };
  apiList=function(){
    window._srv.lee++;
    if(window._srv.listFalla) return Promise.reject(new Error('sin_red'));
    var out=JSON.parse(JSON.stringify(STATE));
    if(window._srv.cierre) out.push({ id:CIERRE_ID, fecha:'', observaciones:window._srv.cierre, cliente:'cierres', productos:[], saldo:0, ts:1 });
    if(window._srv.carga) out.push({ id:CARGA_ID, fecha:'', observaciones:window._srv.carga, cliente:'carga', productos:[], saldo:0, ts:1 });
    return Promise.resolve({ok:true, version:SCRIPT_VERSION_ESPERADA, pedidos:out});
  };
  apiSave=function(rec){
    var g=JSON.parse(JSON.stringify(rec)); window._srv.saves.push(g);
    return new Promise(function(res, rej){ setTimeout(function(){
      if(window._srv.saveFalla) return rej(new Error('Failed to fetch'));
      if(g.id===CIERRE_ID) window._srv.cierre=String(g.observaciones||'');
      if(g.id===CARGA_ID) window._srv.carga=String(g.observaciones||'');
      res({ok:true, pedido:g});
    }, window._srv.tardaSave||0); });
  };
  window._espera=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
`;

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const D={ confirm:true, vistos:[] };
  const nueva = async (fixed, ancho) => {
    const page = await browser.newPage({ viewport:{width:ancho||1400,height:950}, timezoneId:'America/La_Paz' });
    page.on('pageerror', e=>errores.push(e.message));
    page.on('dialog', async d=>{ D.vistos.push(d.type()+': '+d.message()); if(d.type()==='confirm' && D.confirm===false) await d.dismiss(); else await d.accept(); });
    await page.route(/^https?:/, r=>r.abort());
    await page.clock.setFixedTime(new Date(fixed||MIERCOLES));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate(BASE);
    return page;
  };

  // ═══ 1. La hoja de ruta dice el flete pactado ═════════════════════════════════════════
  console.log('\n── 1. 🚚 La hoja de ruta dice el flete que se cobra en la puerta ──');
  {
    const page = await nueva(MIERCOLES);
    const r = await page.evaluate(async () => {
      STATE=[
        /* Pagada entera con el adelanto, y el flete pactado: la hoja de ruta decía «✅ PAGADO». */
        _P({id:'f1', cliente:'CLIENTE PAGADA', pagado:true, saldo:0, acuenta:1000, metodoPago:'~Efectivo 1000 @2026-09-20 #11 + ^ 150'}),
        _P({id:'f2', cliente:'CLIENTE SALDO', saldo:1000, metodoPago:'^ 150'}),
        _P({id:'f3', cliente:'CLIENTE COBRADO', pagado:true, saldo:0, metodoPago:'Efectivo 1000 @2026-09-20 #12 + ^Efectivo 150 @2026-09-20 #12'}),
        _P({id:'f4', cliente:'CLIENTE NORMAL', saldo:500}),
        _P({id:'f5', cliente:'CLIENTE MIGUEL', chofer:'Miguel', vehiculo:'Foton encarpado', pagado:true, saldo:0, metodoPago:'Efectivo 900 @2026-09-20 #13 + ^ 80'}),
        _P({id:'a1', cliente:'CLIENTE ATC', oc:'ATC 09-001', metodoPago:'^ 100', productos:[{desc:'SOFT',cant:1,atc:{mot:'Hundimiento'}}]})
      ];
      saveMirror();
      var txt=function(el){ return String((el&&el.textContent)||'').replace(/\s+/g,' ').trim(); };
      var out={ ct:{} };
      ['f1','f2','f3','f4','f5','a1'].forEach(function(id){ var cr=cobroRutaTxt(findById(id)); out.ct[id]=cr.t+(cr.f?(' | '+cr.f):''); });
      // la tarjeta del chofer, para comparar las palabras
      out.tarjeta=txt((function(){ var d=document.createElement('div'); d.innerHTML=cobroChoferHtml(findById('f1')); return d; })());
      var wa=[]; window.open=function(u){ wa.push(decodeURIComponent(String(u)).replace(/^https:\/\/wa\.me\/\?text=/,'')); return null; }; copyText=function(){};
      abrirRuta(); setRutaDia('hoy');
      out.paradas={}; out.cabeceras={};
      [].forEach.call(document.querySelectorAll('#ruta-body .ruta-chofer'), function(b){
        var kids=[].slice.call(b.children), cab=txt(kids[0]);
        out.cabeceras[/Miguel/.test(cab)?'miguel':'luis']=cab;
        kids.slice(1).forEach(function(d){ var t=txt(d); out.paradas[(t.match(/CLIENTE (PAGADA|SALDO|COBRADO|NORMAL|MIGUEL|ATC)/)||['','?'])[1]]=t; });
      });
      var idxLuis=RUTA_ORDER.indexOf('Luis Pierre'), idxMig=RUTA_ORDER.indexOf('Miguel');
      rutaWhatsapp(idxLuis); rutaWhatsapp(idxMig); closeRuta();
      out.waLuis=wa[0]||''; out.waMig=wa[1]||'';
      return out;
    });
    const frase = (s)=>((String(s).match(/Cobrar también el flete: Bs [\d.,]+ — aparte de la venta/)||[''])[0]);
    const fTarj = frase(r.tarjeta);
    chk('(la tarjeta del chofer dice «Cobrar también el flete: Bs 150,00 — aparte de la venta»)', /150,00/.test(fTarj), r.tarjeta.slice(0,200));
    chk('🔴 venta PAGADA con flete pactado: la hoja de ruta (pantalla) dice que hay que cobrar el flete, con las mismas palabras que la tarjeta',
        !!fTarj && (r.paradas.PAGADA||'').indexOf(fTarj)>=0, r.paradas.PAGADA);
    chk('🔴 …y ya no dice solo «✅ PAGADO» (dice que la VENTA está pagada)', !/✅ PAGADO(?!\w)/.test(r.ct.f1) && /VENTA YA ESTÁ PAGADA/i.test(r.ct.f1), r.ct.f1);
    chk('🔴 venta con saldo y flete: la hoja dice las dos cosas (Bs 1.000 y el flete de Bs 150)',
        /COBRAR Bs 1\.000,00/.test(r.paradas.SALDO||'') && /Cobrar también el flete: Bs 150,00/.test(r.paradas.SALDO||''), r.paradas.SALDO);
    chk('🔴 el WhatsApp de la ruta lo dice en la parada', /Cobrar también el flete: Bs 150,00 — aparte de la venta/.test(r.waLuis), r.waLuis.slice(0,400));
    chk('🔴 la cabecera del chofer suma el flete aparte (Bs 1.500 de ventas + Bs 300 de flete)',
        /A cobrar: Bs 1\.500,00/.test(r.cabeceras.luis||'') && /\+ Bs 300,00 de flete/.test(r.cabeceras.luis||''), r.cabeceras.luis);
    chk('🔴 el WhatsApp de un chofer con todo pagado pero un flete por cobrar ya no dice «✅ Todo pagado»',
        !/Todo pagado/.test(r.waMig) && /80,00 de flete/.test(r.waMig), r.waMig.slice(0,200));
    chk('🔴 …y su cabecera en pantalla tampoco se lo calla', /80,00 de flete/.test(r.cabeceras.miguel||''), r.cabeceras.miguel);
    chk('control: el flete ya cobrado no se vuelve a pedir', !/flete/i.test(r.paradas.COBRADO||'x') && /PAGADO/.test(r.ct.f3), r.paradas.COBRADO);
    chk('control: una venta sin flete no habla de flete', !/flete/i.test(r.paradas.NORMAL||'x') && /COBRAR Bs 500,00/.test(r.ct.f4), r.paradas.NORMAL);
    chk('control: la ATC no cambia (no se cobra, ni el flete)', /NO SE COBRA \(ATC\)/.test(r.ct.a1) && !/flete/i.test(r.ct.a1) && !/flete/i.test(r.paradas.ATC||'x'), r.ct.a1);
    await page.close();
  }

  // ═══ 2. Las tildes de la carga con dos cargadores ═══════════════════════════════════
  console.log('\n── 2. 📦 Dos cargadores tildando a la vez: no se pisan ──');
  {
    const page = await nueva(MIERCOLES);
    const K = (p)=>'2026-09-23|Foton nuevo|'+p;
    let r = await page.evaluate(async (K) => {
      STATE=[]; saveMirror();
      // a) El otro cargador tildó X; este celular no se enteró (su memoria está vacía) y tilda Y.
      window._srv.carga=K.x; CARGA_CHK={}; saveCargaMirror();
      setCargaChk(K.y, true);
      await _espera(1200);
      var a={ srv:_cargaSrv(), local:Object.keys(CARGA_CHK).sort().join(' ; ') };
      // b) El otro destildó Z (que este celular todavía ve tildada); este tilda W: Z no vuelve.
      window._srv.carga=[K.x,K.y].join(' ; ');   // el otro sacó Z
      CARGA_CHK={}; CARGA_CHK[K.x]=1; CARGA_CHK[K.y]=1; CARGA_CHK[K.z]=1; saveCargaMirror();
      setCargaChk(K.w, true);
      await _espera(1200);
      var b={ srv:_cargaSrv() };
      // c) Un refresco entre el toque y el guardado no se lleva la tilde recién puesta.
      window._srv.carga=K.x; CARGA_CHK={}; CARGA_CHK[K.x]=1; saveCargaMirror();
      setCargaChk(K.v, true);
      await refrescarEstado();                         // el list vuelve con la fila de antes (sin V)
      var enPantalla=!!CARGA_CHK[K.v];
      await _espera(1200);
      var c={ srv:_cargaSrv(), enPantalla:enPantalla, local:!!CARGA_CHK[K.v] };
      // d) Destildar acá se respeta (y lo del otro queda).
      window._srv.carga=[K.x,K.v,K.u].join(' ; '); CARGA_CHK={}; CARGA_CHK[K.x]=1; CARGA_CHK[K.v]=1; saveCargaMirror();   // U lo tildó el otro
      setCargaChk(K.v, false);
      await _espera(1200);
      var d={ srv:_cargaSrv() };
      return { a:a, b:b, c:c, d:d };
    }, { x:K('X'), y:K('Y'), z:K('Z'), w:K('W'), v:K('V'), u:K('U') });
    chk('🔴 lo que tildó el otro cargador sigue tildado en la planilla', r.a.srv===[K('X'),K('Y')].join(' ; '), 'planilla: '+r.a.srv);
    chk('  y este celular ve las dos', r.a.local===[K('X'),K('Y')].join(' ; '), r.a.local);
    chk('🔴 lo que el otro DESTILDÓ no vuelve a aparecer', r.b.srv===[K('W'),K('X'),K('Y')].join(' ; '), 'planilla: '+r.b.srv);
    chk('🔴 un refresco entre el toque y el guardado no se lleva la tilde (pantalla)', r.c.enPantalla===true, J(r.c));
    chk('🔴 …ni de la planilla', r.c.srv===[K('V'),K('X')].join(' ; ') && r.c.local===true, 'planilla: '+r.c.srv);
    chk('  destildar acá se respeta, y lo que tildó el otro queda', r.d.srv===[K('U'),K('X')].join(' ; '), 'planilla: '+r.d.srv);
    r = await page.evaluate(async (K) => {
      // e) Tildando varios seguidos sigue yendo UNA sola escritura.
      window._srv.carga=''; CARGA_CHK={}; saveCargaMirror(); window._srv.saves=[];
      setCargaChk(K.x,true); setCargaChk(K.y,true); setCargaChk(K.z,true);
      await _espera(1200);
      var n=window._srv.saves.filter(function(s){ return s.id===CARGA_ID; }).length;
      // f) Sin poder leer la planilla, se guarda igual (como antes).
      window._srv.listFalla=true; setCargaChk(K.w,true);
      await _espera(1200); window._srv.listFalla=false;
      return { n:n, srv:_cargaSrv() };
    }, { x:K('X'), y:K('Y'), z:K('Z'), w:K('W') });
    chk('  tildar tres seguidas sigue siendo una sola escritura', r.n===1, 'escrituras: '+r.n);
    chk('  si la planilla no contesta la lectura, la tilde se guarda igual', /\|W/.test(r.srv), r.srv);
    await page.close();
  }

  // ═══ 3. Sin señal: la cola no pisa lo que cambió otra computadora ═══════════════════
  console.log('\n── 3. 🔒 Un cierre o una tilde hechos sin señal no pisan la planilla al volver ──');
  {
    const page = await nueva(MIERCOLES);
    let r = await page.evaluate(async () => {
      showView('admin'); await _espera(150); STATE=[]; saveMirror();
      // a) Este equipo tiene el 01/10 cerrado y se queda sin señal: cierra el 06/10.
      window._srv.cierre='🔒 2026-10-01';
      DIAS_CERRADOS=['2026-10-01']; CIERRES_PEND=null; saveCierresMirror();
      if(typeof CIERRES_CAMBIOS!=='undefined') CIERRES_CAMBIOS={};
      window._srv.saveFalla=true; window._srv.listFalla=true;
      cerrarDia('2026-10-06');
      await _espera(200);
      var enCola=getPending().filter(function(p){ return p.id===CIERRE_ID; }).length;
      // …mientras tanto la otra computadora reabre el 01/10 y cierra el 07/10.
      window._srv.cierre='🔒 2026-10-07';
      window._srv.saveFalla=false; window._srv.listFalla=false;
      await flushPending();
      var srv=window._diasSrv();
      await refrescarEstado();
      return { enCola:enCola, srv:srv, local:DIAS_CERRADOS.join(' '), cola:getPending().length,
               conCambios:window._srv.saves.some(function(s){ return s._cambios!==undefined; }) };
    });
    chk('(sin señal el cierre quedó en la cola)', r.enCola===1, r.enCola);
    chk('🔴 al volver la señal, el 07/10 que cerró la otra computadora sigue cerrado', /2026-10-07/.test(r.srv), 'planilla: '+r.srv);
    chk('🔴 …y el 01/10 que la otra reabrió no se vuelve a cerrar', !/2026-10-01/.test(r.srv), 'planilla: '+r.srv);
    chk('  el 06/10 que se cerró sin señal entró', /2026-10-06/.test(r.srv), 'planilla: '+r.srv);
    chk('🔴 esta computadora ve lo mismo que la planilla después de refrescar', r.local==='2026-10-06 2026-10-07', 'acá: '+r.local);
    chk('  la cola quedó vacía', r.cola===0, r.cola);
    chk('  lo que la cola guarda para sí (_cambios) no viaja a la planilla', r.conCambios===false);

    // b) Con la página recargada en el medio (la memoria se pierde; la cola no).
    r = await page.evaluate(async () => {
      window._srv.cierre='🔒 2026-10-01'; window._srv.saves=[];
      DIAS_CERRADOS=['2026-10-01']; CIERRES_PEND=null; saveCierresMirror();
      if(typeof CIERRES_CAMBIOS!=='undefined') CIERRES_CAMBIOS={};
      window._srv.saveFalla=true; window._srv.listFalla=true;
      abrirDia('2026-10-01');                                   // sin señal: reabre el 01/10
      await _espera(200);
      if(typeof CIERRES_CAMBIOS!=='undefined') CIERRES_CAMBIOS={};   // «recargó la página»
      CIERRES_PEND=null;
      window._srv.cierre='🔒 2026-10-01 2026-10-08';            // la otra cerró el 08/10
      window._srv.saveFalla=false; window._srv.listFalla=false;
      await flushPending();
      return { srv:window._diasSrv(), cola:getPending().length };
    });
    chk('🔴 recargada la página, al volver la señal el 08/10 de la otra sigue cerrado', /2026-10-08/.test(r.srv), 'planilla: '+r.srv);
    chk('  y el 01/10 que se reabrió sin señal queda abierto', !/2026-10-01/.test(r.srv) && r.cola===0, 'planilla: '+r.srv);

    // c) Sin señal se cerró el 09/10; volvió la señal y, ANTES de que salga la cola, se reabrió el
    //    09/10 con señal. La cola no lo vuelve a cerrar después.
    r = await page.evaluate(async () => {
      window._srv.cierre=''; window._srv.saves=[];
      DIAS_CERRADOS=[]; CIERRES_PEND=null; saveCierresMirror();
      if(typeof CIERRES_CAMBIOS!=='undefined') CIERRES_CAMBIOS={};
      window._srv.saveFalla=true; window._srv.listFalla=true;
      cerrarDia('2026-10-09');
      await _espera(200);
      window._srv.saveFalla=false; window._srv.listFalla=false;
      abrirDia('2026-10-09');                                   // con señal, antes de la cola
      await _espera(200);
      var antes=window._diasSrv();
      await flushPending();
      return { antes:antes, srv:window._diasSrv(), cola:getPending().length };
    });
    chk('🔴 lo que se reabrió con señal no lo vuelve a cerrar la cola vieja', !/2026-10-09/.test(r.srv) && r.cola===0, 'antes: '+r.antes+' · después: '+r.srv+' · cola: '+r.cola);

    // d) Las tildes de la carga, lo mismo.
    r = await page.evaluate(async () => {
      var K=function(p){ return '2026-09-23|Foton nuevo|'+p; };
      window._srv.carga=''; CARGA_CHK={}; saveCargaMirror();
      if(typeof CARGA_CAMBIOS!=='undefined') CARGA_CAMBIOS={};
      window._srv.saveFalla=true; window._srv.listFalla=true;
      setCargaChk(K('Y'), true);
      await _espera(1200);
      var enCola=getPending().filter(function(p){ return p.id===CARGA_ID; }).length;
      window._srv.carga=K('X');                                 // el otro tildó X
      window._srv.saveFalla=false; window._srv.listFalla=false;
      await flushPending();
      return { enCola:enCola, srv:_cargaSrv(), cola:getPending().length };
    });
    chk('(sin señal la tilde quedó en la cola)', r.enCola===1, r.enCola);
    chk('🔴 al volver la señal, lo que tildó el otro cargador sigue tildado', r.srv==='2026-09-23|Foton nuevo|X ; 2026-09-23|Foton nuevo|Y' && r.cola===0, 'planilla: '+r.srv);

    // e) Control: las demás filas de la cola se mandan tal cual, en orden; y una fila de cierre
    //    encolada por un panel de antes (sin _cambios) se manda como siempre.
    r = await page.evaluate(async () => {
      try{ localStorage.removeItem(LS_PEND); }catch(e){}
      window._srv.saves=[]; window._srv.cierre='🔒 2026-10-01';
      var p1=_P({id:'q1', cliente:'EN COLA 1', saldo:300}), p2=_P({id:'q2', cliente:'EN COLA 2', turno:'PM'});
      queuePending(p1);
      queuePending(filaCierre(['2026-10-12']));                  // como la dejaba el panel de antes
      queuePending(p2);
      var esperado=[JSON.stringify(p1), JSON.stringify(p2)];
      await flushPending();
      var mandados=window._srv.saves.filter(function(s){ return s.id==='q1' || s.id==='q2'; }).map(function(s){ return JSON.stringify(s); });
      return { iguales:J(mandados)===J(esperado), orden:window._srv.saves.map(function(s){ return s.id; }), srv:window._diasSrv(), cola:getPending().length };
      function J(o){ return JSON.stringify(o); }
    });
    chk('control: los pedidos de la cola se mandan exactamente como estaban, en orden', r.iguales && J(r.orden)===J(['q1',"__dias_cerrados__",'q2']), J(r.orden));
    chk('control: la fila de cierre de un panel de antes se manda como siempre', r.srv==='2026-10-12' && r.cola===0, 'planilla: '+r.srv);
    await page.close();
  }

  // ═══ 4. Chips AM/PM = cupo ══════════════════════════════════════════════════════════
  console.log('\n── 4. 🌅🌆 Los chips AM/PM cuentan como el cupo ──');
  {
    const page = await nueva(MIERCOLES);
    const r = await page.evaluate(async () => {
      showView('admin'); await _espera(150);
      var hoy=todayStr();
      STATE=[
        _P({id:'a1', turno:'AM'}), _P({id:'a2', turno:'AM'}),
        _P({id:'s1', turno:''}), _P({id:'s2', turno:''}),              // sin turno (los de ROHO, por ejemplo)
        _P({id:'p1', turno:'PM'}),
        _P({id:'t1', fecha:'', turno:'', zona:'TIENDA', direccion:'SALIÓ DE TIENDA · Central', cliente:'VENTA TIENDA', entregado:true, chofer:'', vehiculo:''})
      ];
      saveMirror();
      var chip=function(lbl){ var b=[].slice.call(document.querySelectorAll('#adm-chips .qchip')).filter(function(x){ return x.textContent.indexOf(lbl)>=0; })[0]; return b?Number(b.querySelector('.n').textContent):-1; };
      segSet('adm-mode','dia'); document.getElementById('adm-dia').value=hoy; QUICK_FILTER=''; renderAdmin();
      var dia={ am:chip('AM'), pm:chip('PM'), cupoAM:cuposUsadosTurno(hoy,'AM'), cupoPM:cuposUsadosTurno(hoy,'PM'), cupoTxt:document.getElementById('cupo-admin').textContent };
      setQuick('am'); dia.filasAM=admFilter().length; setQuick('am');
      segSet('adm-mode','todo'); renderAdmin();
      var todo={ am:chip('AM'), pm:chip('PM') };
      return { dia:dia, todo:todo };
    });
    chk('🔴 el chip 🌅 AM cuenta los pedidos sin turno, como el cupo (4 = 2 AM + 2 sin turno)', r.dia.am===r.dia.cupoAM && r.dia.am===4, J(r.dia));
    chk('  y el 🌆 PM igual que el cupo', r.dia.pm===r.dia.cupoPM && r.dia.pm===1, J(r.dia));
    chk('🔴 tocar el chip AM muestra esos mismos 4', r.dia.filasAM===4, r.dia.filasAM);
    chk('  en «Todo», la venta de tienda (sin fecha: no ocupa cupo) no entra en AM', r.todo.am===4 && r.todo.pm===1, J(r.todo));
    await page.close();
  }

  chk('la página no tiró ningún error de JavaScript', errores.length===0, errores.join(' | ').slice(0,300));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
