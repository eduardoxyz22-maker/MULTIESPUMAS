/* 🎧 SEGUNDA REVISIÓN DE LA PESTAÑA ATC (26/09/2026) — lo que se encontró y se arregló.

   1. ✅ Cerrar la ATC desde «📦 Anotar avance» («Se le devolvió al CLIENTE») con la devolución
      programada dejaba el pedido SIN entregar: «✅ Entregada» en la pestaña ATC, y para el chofer
      y Administración «⏳ Pendiente» con el chip «🎧 ATC» (el de un RECOJO). Y al revés: «↺ Borrar
      todo» (o destildar el paso) sobre una devolución que el chofer ya había tildado la reabría
      —«🏭 Recoger de fábrica»— pero la ficha del chofer seguía «✓ Entregado»: nadie la llevaba.

   Reloj clavado en el miércoles 23/09/2026 10:00 de Bolivia: las fechas no se pudren.
   Red cortada, servidor simulado, datos sintéticos. Se corre:  node tests/test_rev2_atc.js
   Dientes contra el panel viejo:  PEDIDOS=/ruta/al/viejo.html node tests/test_rev2_atc.js */
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
  window._saves=[];
  apiSave=function(rec, opts){ window._saves.push({rec:JSON.parse(JSON.stringify(rec)), opts:opts||null}); return Promise.resolve({ok:true, pedido:JSON.parse(JSON.stringify(rec))}); };
  apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
  window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(m)); return _t(m,k,ms); };
  window._P=function(o){ return Object.assign({id:'p'+Math.random().toString(36).slice(2),fecha:todayStr(),oc:'',vendedor:'Carola Chavez',
    cliente:'C',celular:'70000000',turno:'AM',zona:'Norte',direccion:'Av. Banzer 123',maps:'',pagado:false,saldo:0,
    ts:Date.now(),metodoPago:'',observaciones:'',estado:'',entregado:false,vehiculo:'Foton nuevo',chofer:'Luis Pierre',
    garantia:'',nota:'',acuenta:0,facturarA:'',nit:'',nroDia:1,verificado:true,fotos:[]},o); };
  /* Una ATC ya recogida (el lunes 21) y con la devolución programada con el botón de siempre. */
  window._atcConDev=function(id, fecha, turno, extra){
    STATE=STATE.filter(function(p){ return p.id!==id; });
    STATE.push(_P({id:id, oc:'ATC 09-0'+id.length, fecha:'2026-09-21', entregado:true, cliente:'CLIENTE '+id,
      productos:[{desc:'SOFT', medida:'140x190', cant:1, atc:Object.assign({mot:'Hundimiento'}, extra||{})}]}));
    saveMirror();
    abrirProgramarDevAtc(id);
    document.getElementById('pdev-fecha').value=fecha; segSet('pdev-turno', turno);
    guardarProgramarDevAtc(id);
    return findById(id);
  };
  window._atcVer=function(id){ var p=findById(id), a=atcDe(p)||{};
    return { entregado:!!p.entregado, fecha:p.fecha, pdev:a.pdev||'', ent:a.ent||'', rf:a.rf||'',
             enDev:atcEnDevolucion(p), chip:atcChip(p).replace(/<[^>]+>/g,''), estado:atcEstado(p),
             pendChofer:choTest('pend')(p), alertaHoy:atcRecogerFabPend(p, todayStr()) }; };
  /* «📦 Anotar avance»: se abre, se tildan/destildan los pasos y se guarda, como logística. */
  window._avance=function(id, pasos){
    abrirDevolucionAtc(id);
    ['dev','rf','ent'].forEach(function(k){ if(pasos[k]===undefined) return;
      var c=document.getElementById(k+'-si'); c.checked=!!pasos[k];
      if(pasos[k] && typeof pasos[k]==='string') document.getElementById(k+'-fecha').value=pasos[k]; });
    guardarDevolucionAtc(id);
  };
`;

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const nueva = async (fixed, ancho) => {
    const page = await browser.newPage({ viewport:{width:ancho||1400,height:950}, timezoneId:'America/La_Paz' });
    page.on('pageerror', e=>errores.push(e.message));
    page.on('dialog', d=>{ if(d.type()==='prompt') d.accept('300'); else d.accept(); });
    await page.route(/^https?:/, r=>r.abort());
    await page.clock.setFixedTime(new Date(fixed||MIERCOLES));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    return page;
  };

  // ═══ 1. Cerrar o reabrir desde «📦 Anotar avance» mueve el ✅ del viaje de devolución ═══
  console.log('\n── 1. ✅ «Se le devolvió al CLIENTE» desde 📦 Anotar avance = la devolución queda entregada para todos ──');
  {
    const page = await nueva();
    const r = await page.evaluate(async (base) => {
      eval(base);
      STATE=[]; var out={};
      // (a) la devolución es HOY y logística la cierra desde la pestaña ATC (el chofer no tildó nada)
      _atcConDev('a1','2026-09-23','AM');
      out.antes=_atcVer('a1');
      window._saves=[];
      _avance('a1', {ent:'2026-09-23'});
      out.cerrada=_atcVer('a1');
      var s=window._saves[window._saves.length-1]; out.mandado={entregado:!!(s&&s.rec.entregado), ent:((s&&atcDe(s.rec))||{}).ent||''};
      // …y el chofer, en su ficha de hoy
      showView('chofer'); llenarSelectChoferes(); document.getElementById('cho-nombre').value='Luis Pierre'; setChoFiltro('hoy');
      await new Promise(function(r){ setTimeout(r,150); });
      var card=[].filter.call(document.querySelectorAll('#cho-lista .cho-card'), function(c){ return /CLIENTE a1/.test(c.textContent); })[0];
      out.tarjeta=card?card.textContent.replace(/\\s+/g,' '):'(no está)';
      // (b) y si se equivocaron de ATC y la destildan en el mismo panel, vuelve a estar pendiente
      _avance('a1', {ent:false, rf:false});
      out.reabierta=_atcVer('a1');
      // (c) el chofer SÍ la tildó ✅ y logística la reabre con «↺ Borrar todo» (el ✅ fue sin querer)
      _atcConDev('b1','2026-09-23','AM');
      choEntregado('b1');
      out.tildada=_atcVer('b1');
      abrirDevolucionAtc('b1'); borrarDevolucionAtc('b1');
      out.borrada=_atcVer('b1');
      out.borradaAtc=atcDe(findById('b1'));
      // …y si el chofer la vuelve a tildar, se cierra y anota el «recogido de fábrica» como siempre
      choEntregado('b1');
      out.retildada=_atcVer('b1');
      // (d) control: una ATC SIN devolución programada — su ✅ es el RECOJO y cerrarla no lo toca
      STATE.push(_P({id:'c1', oc:'ATC 09-055', fecha:'2026-09-21', entregado:true, cliente:'VIEJA',
        productos:[{desc:'SOFT', cant:1, atc:{mot:'Ruido'}}]}));
      _avance('c1', {ent:'2026-09-23'});
      out.vieja=_atcVer('c1');
      _avance('c1', {ent:false, rf:false});
      out.viejaReabierta=_atcVer('c1');
      // (e) control: anotar solo «Listo en fábrica» sobre una devolución programada no la entrega
      _atcConDev('d1','2026-09-28','PM');
      _avance('d1', {dev:'2026-09-22'});
      out.soloListo=_atcVer('d1');
      return out;
    }, BASE);
    chk('punto de partida: la devolución de hoy vive en su día, pendiente para el chofer',
        r.antes.enDev && r.antes.entregado===false && r.antes.pendChofer===true, J(r.antes));
    chk('⚠️ cerrarla desde «📦 Anotar avance» la deja ENTREGADA (antes: cerrada en ATC y «⏳ Pendiente» para el chofer)',
        r.cerrada.estado==='cerrada' && r.cerrada.entregado===true && r.cerrada.pendChofer===false, J(r.cerrada));
    chk('…y a la planilla va entregada, con el día de la entrega al cliente',
        r.mandado.entregado===true && r.mandado.ent==='2026-09-23', J(r.mandado));
    chk('⚠️ …y en la ficha del chofer figura «✓ Entregado», no «⏳ Pendiente»',
        /✓ Entregado/.test(r.tarjeta) && !/Pendiente/.test(r.tarjeta), r.tarjeta.slice(0,160));
    chk('⚠️ destildarla en el mismo panel la vuelve a dejar pendiente para el chofer',
        r.reabierta.estado!=='cerrada' && r.reabierta.entregado===false && r.reabierta.pendChofer===true, J(r.reabierta));
    chk('punto de partida (c): el ✅ del chofer la cerró', r.tildada.estado==='cerrada' && r.tildada.entregado===true, J(r.tildada));
    chk('⚠️ «↺ Borrar todo» la reabre ENTERA: vuelve el aviso de fábrica y el chofer la ve pendiente (antes seguía «✓ Entregado»)',
        r.borrada.estado==='recogerfab' && r.borrada.alertaHoy===true && r.borrada.entregado===false && r.borrada.pendChofer===true, J(r.borrada));
    chk('…y no queda ninguna marca del ✅ viejo (`rfAuto`)', !(r.borradaAtc||{}).rfAuto, J(r.borradaAtc));
    chk('…y el ✅ siguiente la cierra como siempre', r.retildada.estado==='cerrada' && r.retildada.entregado===true && r.retildada.rf==='2026-09-23', J(r.retildada));
    chk('control: sin devolución programada el ✅ del pedido es el RECOJO y cerrar/reabrir la ATC no lo toca',
        r.vieja.estado==='cerrada' && r.vieja.entregado===true && r.viejaReabierta.estado==='fabrica' && r.viejaReabierta.entregado===true,
        J([r.vieja, r.viejaReabierta]));
    chk('control: anotar «Listo en fábrica» no entrega la devolución del lunes',
        r.soloListo.estado==='programada' && r.soloListo.entregado===false, J(r.soloListo));
    await page.close();
  }

  chk('sin errores JS', errores.length===0, J(errores));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
