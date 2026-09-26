/* 🔒 SEGUNDA REVISIÓN DE ADMINISTRACIÓN (26/09/2026) — lo que se encontró y se arregló.

   1. 🔒 Cerrar o reabrir un día reescribía la fila `__dias_cerrados__` ENTERA con la lista que
      tenía ESTA computadora. Con dos equipos de administración, el que no se había enterado de un
      cierre del otro (la pestaña refresca cada 2 minutos, y no refresca con una ventana abierta
      ni en segundo plano) lo BORRABA al cerrar su propio día: el día del otro quedaba abierto en
      todos lados y el portero del servidor dejaba entrar pedidos a un camión ya armado. Ahora se
      relee la planilla antes de escribir y se aplica solo lo que se tocó acá.
   2. 📋 El Parte del día contaba cada 🎧 ATC y cada 🏪 RPT del día como «por cobrar» («⏳ Por
      cobrar: Bs 500 (3 pedidos)» con una sola venta debiendo) — el mismo error que el 25/09 se
      arregló en el chip «💰 Por cobrar» y en el resumen, y que quedó en el Parte (pantalla y
      WhatsApp).
   3. 🎟️ El cupo de Administración un SÁBADO no decía cuántos se forzaron de más: 17 en un
      sábado de 15 se veía igual que 15 (el mismo error de §4fh, en la rama del sábado).

   Reloj clavado (miércoles 23/09/2026 y sábado 26/09/2026, 10:00 de Bolivia). Red cortada,
   servidor simulado, datos sintéticos. Se corre:  node tests/test_rev2_admin.js
   Dientes contra el panel viejo:  PEDIDOS=/ruta/al/viejo.html node tests/test_rev2_admin.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const MIERCOLES = '2026-09-23T10:00:00-04:00';
const SABADO    = '2026-09-26T10:00:00-04:00';

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
  /* La planilla de los días cerrados, compartida por «todas las computadoras». */
  window._srv={ cierre:'', lee:0, escribe:0, tardaSave:0, listFalla:false };
  window._diasSrv=function(){ return (String(window._srv.cierre||'').match(/\\d{4}-\\d{2}-\\d{2}/g)||[]).sort().join(' '); };
  apiList=function(){
    window._srv.lee++;
    if(window._srv.listFalla) return Promise.reject(new Error('sin_red'));
    var out=JSON.parse(JSON.stringify(STATE));
    if(window._srv.cierre) out.push({ id:CIERRE_ID, fecha:'', observaciones:window._srv.cierre, cliente:'cierres', productos:[], saldo:0, ts:1 });
    return Promise.resolve({ok:true, version:SCRIPT_VERSION_ESPERADA, pedidos:out});
  };
  apiSave=function(rec){
    var g=JSON.parse(JSON.stringify(rec));
    return new Promise(function(res){ setTimeout(function(){
      if(g.id===CIERRE_ID){ window._srv.cierre=String(g.observaciones||''); window._srv.escribe++; }
      res({ok:true, pedido:g});
    }, window._srv.tardaSave||0); });
  };
`;

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const nueva = async (fixed, ancho) => {
    const page = await browser.newPage({ viewport:{width:ancho||1400,height:950}, timezoneId:'America/La_Paz' });
    page.on('pageerror', e=>errores.push(e.message));
    page.on('dialog', d=>d.accept());
    await page.route(/^https?:/, r=>r.abort());
    await page.clock.setFixedTime(new Date(fixed||MIERCOLES));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate(BASE);
    return page;
  };
  const espera = (ms) => new Promise(r=>setTimeout(r,ms));

  // ═══ 1. Dos equipos de administración cerrando días ══════════════════════════════════
  console.log('\n── 1. 🔒 Cerrar un día no borra el cierre que hizo otra computadora ──');
  {
    const page = await nueva(MIERCOLES);
    // a) Otra computadora cerró el 25; esta no se enteró todavía (su lista está vacía).
    let r = await page.evaluate(async () => {
      showView('admin'); STATE=[]; saveMirror();
      window._srv.cierre='🔒 2026-09-25';
      DIAS_CERRADOS=[]; CIERRES_PEND=null; saveCierresMirror();
      cerrarDia('2026-09-24');
      await new Promise(function(r){ setTimeout(r,300); });
      var srv=window._diasSrv();
      await refrescarEstado();
      return { srv:srv, local:DIAS_CERRADOS.join(' '), pend:CIERRES_PEND };
    });
    chk('🔴 el 25 que cerró la otra computadora sigue cerrado en la planilla', r.srv==='2026-09-24 2026-09-25', 'planilla: '+r.srv);
    chk('  y el 24 que se cerró acá también', /2026-09-24/.test(r.srv), r.srv);
    chk('  esta computadora ve los dos cerrados', r.local==='2026-09-24 2026-09-25', r.local);
    chk('  y el guardado quedó firme (nada pendiente)', r.pend===null, JSON.stringify(r.pend));

    // b) Reabrir no vuelve a cerrar lo que la otra reabrió, ni reabre lo que la otra cerró.
    r = await page.evaluate(async () => {
      window._srv.cierre='🔒 2026-09-25 2026-09-28';        // la otra: reabrió el 24, cerró el 28
      DIAS_CERRADOS=['2026-09-24','2026-09-25','2026-09-26']; CIERRES_PEND=null; saveCierresMirror();   // esta: vieja (y con un 26 que ya no existe)
      abrirDia('2026-09-25');
      await new Promise(function(r){ setTimeout(r,300); });
      return { srv:window._diasSrv(), local:DIAS_CERRADOS.join(' ') };
    });
    chk('🔴 reabrir el 25 no vuelve a cerrar el 24 que la otra había reabierto', !/2026-09-24/.test(r.srv), 'planilla: '+r.srv);
    chk('  ni borra el 28 que la otra acababa de cerrar', /2026-09-28/.test(r.srv), 'planilla: '+r.srv);
    chk('  ni resucita un día que ya no estaba cerrado en la planilla', !/2026-09-26/.test(r.srv), 'planilla: '+r.srv);
    chk('  el 25 quedó reabierto', !/2026-09-25/.test(r.srv) && r.local==='2026-09-28', 'planilla: '+r.srv+' · acá: '+r.local);

    // c) Lo que se confirmó ya no se vuelve a aplicar: si la otra reabre el 28 después, cerrar
    //    otro día acá no lo vuelve a cerrar.
    r = await page.evaluate(async () => {
      window._srv.cierre='🔒 ';                               // la otra reabrió el 28
      cerrarDia('2026-09-29');
      await new Promise(function(r){ setTimeout(r,300); });
      return { srv:window._diasSrv() };
    });
    chk('  un cambio ya confirmado no se vuelve a aplicar después (el 28 sigue abierto)', r.srv==='2026-09-29', 'planilla: '+r.srv);

    // d) Dos cierres seguidos con la planilla lenta: entran los dos, más el de la otra.
    r = await page.evaluate(async () => {
      window._srv.cierre='🔒 2026-09-30'; window._srv.tardaSave=400;
      DIAS_CERRADOS=[]; CIERRES_PEND=null; saveCierresMirror();
      cerrarDia('2026-10-01'); cerrarDia('2026-10-02');
      var alToque=DIAS_CERRADOS.join(' ');
      await new Promise(function(r){ setTimeout(r,1500); });
      window._srv.tardaSave=0;
      return { srv:window._diasSrv(), alToque:alToque, pend:CIERRES_PEND };
    });
    chk('  dos cierres seguidos con la planilla lenta: quedan los dos y el de la otra', r.srv==='2026-09-30 2026-10-01 2026-10-02', 'planilla: '+r.srv);
    chk('  y en pantalla se ven cerrados al toque', /2026-10-01/.test(r.alToque) && /2026-10-02/.test(r.alToque), r.alToque);

    // e) Sin poder leer la planilla, cierra igual (como antes): no se traba a administración.
    r = await page.evaluate(async () => {
      window._srv.cierre=''; window._srv.listFalla=true;
      DIAS_CERRADOS=[]; CIERRES_PEND=null; saveCierresMirror();
      cerrarDia('2026-10-05');
      await new Promise(function(r){ setTimeout(r,300); });
      window._srv.listFalla=false;
      return { srv:window._diasSrv(), local:diaCerrado('2026-10-05') };
    });
    chk('  si la planilla no contesta la lectura, el cierre se guarda igual', r.srv==='2026-10-05' && r.local===true, 'planilla: '+r.srv);

    // f) Sin conexión: queda en la cola, como siempre.
    r = await page.evaluate(async () => {
      CONNECTED=false; try{ localStorage.removeItem(LS_PEND); }catch(e){}
      DIAS_CERRADOS=[]; CIERRES_PEND=null; saveCierresMirror();
      cerrarDia('2026-10-06');
      await new Promise(function(r){ setTimeout(r,100); });
      var cola=getPending().filter(function(p){ return p.id===CIERRE_ID; }).map(function(p){ return p.observaciones; });
      CONNECTED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
      return { cola:cola, local:diaCerrado('2026-10-06') };
    });
    chk('  sin conexión el cierre queda en la cola de este equipo', r.cola.length===1 && /2026-10-06/.test(r.cola[0]) && r.local===true, JSON.stringify(r.cola));
    await page.close();
  }

  // ═══ 2. El Parte del día no cuenta ATC ni RPT como «por cobrar» ══════════════════════
  console.log('\n── 2. 📋 Parte del día: por cobrar sin ATC ni RPT ──');
  {
    const page = await nueva(MIERCOLES);
    const r = await page.evaluate(async () => {
      showView('admin'); await new Promise(function(r){ setTimeout(r,150); });
      STATE=[
        _P({id:'v1', cliente:'VENTA QUE DEBE', saldo:500}),
        _P({id:'v2', cliente:'VENTA PAGADA', pagado:true, saldo:0, metodoPago:'Efectivo 800 @2026-09-23'}),
        _P({id:'a1', cliente:'CLIENTE ATC', oc:'ATC 09-001'}),
        _P({id:'r1', cliente:'Mia Plaza', oc:'RPT 09-001'})
      ];
      saveMirror(); renderAdmin();
      abrirParte();
      var d=parteData(), txt=parteText(), body=document.getElementById('parte-body').textContent;
      closeParte();
      var chip=(document.getElementById('adm-chips').textContent.match(/Por cobrar\s*(\d+)/)||[])[1];
      return { pend:d.pend, pendN:d.pendN, linea:(txt.split('\n').filter(function(l){ return /Por cobrar/.test(l); })[0]||''), body:body, chip:chip };
    });
    chk('🔴 el Parte cuenta 1 pedido por cobrar (no las ATC ni las RPT)', r.pendN===1, 'pendN='+r.pendN);
    chk('  el mensaje de WhatsApp dice «(1 pedido)»', /\(1 pedido\)/.test(r.linea), r.linea);
    chk('  la ficha de la pantalla dice «1 pedido»', /Por cobrar[^]*Bs 500,00\s*1 pedido(?!s)/.test(r.body), r.body.slice(0,160));
    chk('  y coincide con el chip «💰 Por cobrar» de la tabla', String(r.pendN)===String(r.chip), 'chip='+r.chip);
    chk('  el monto sigue siendo el de la venta que debe', r.pend===500, r.pend);
    await page.close();
  }

  chk('la página no tiró ningún error de JavaScript', errores.length===0, errores.join(' | ').slice(0,300));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
