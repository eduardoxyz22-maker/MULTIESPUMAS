/* 🚚 ¿QUÉ CAMIÓN LO LLEVÓ? EN EL CIERRE DE ENTREGAS (13/11/2026, idea 203). El dueño, con la planilla real: de 133 entregas de
   noviembre ya pasadas, 52 no tenían camión anotado. En «✅ Cierre de entregas», cada pedido (de hoy y atrasado) sin camión trae un
   selector con los camiones, ya elegido con la propuesta del GPS cuando la hay; lo que retira el cliente no pide camión.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. El selector sale en los de hoy y en los atrasados SIN camión; con la propuesta del GPS ya elegida («🛰️ lo dice el GPS»); vacío si
      el GPS no lo vio; NO sale si ya tiene camión (o un chofer de la lista, que dice el camión); lo que retira el cliente dice «Lo retiró
      el cliente» sin selector. Va afuera del <label> (tocarlo no tilda). Abrir y elegir no guarda nada.
   2. Lo elegido sobrevive a un repintado del cierre.
   3. Confirmar: los tildados con camión elegido se guardan con camión + el chofer que iba en ese camión ESE día (rotan), en el MISMO
      guardado del ✅ (un guardado por pedido). Un chofer ya puesto no se pisa; un camión que otro equipo puso mientras tanto, tampoco.
      Lo no tildado no recibe camión ni ✅.
   4. El resultado dice «N entregas quedaron sin camión anotado» con «🚚 Elegir el camión», que abre la lista y guarda (durable).
   5. Sin señal: el plan pendiente lleva los camiones y se aplican al sincronizar.
   Datos SINTÉTICOS. Reloj clavado el jueves 05/11/2026 a las 17:00 de Bolivia.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_cierre_camion.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
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
  window._planilla=null;
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window._planilla||STATE)) }); };
  var P=almUbic('ptf'), n=0;
  window._pin=function(i){ return { lat:P.lat+0.02*i, lng:P.lng+0.01 }; };
  window._P=function(id, o){ n++; var i=n; return Object.assign({ id:id, oc:'11-'+(700+n), cliente:'CLIENTE '+id.toUpperCase(), fecha:todayStr(), turno:'AM', vendedor:'Mirian Salazar',
    vehiculo:'', chofer:'', zona:'Norte', direccion:'Calle '+n, observaciones:'', estado:'', productos:[{ desc:'TITANIO LATEX', medida:'140x190', cant:1, precio:3000, chk:'ok' }],
    saldo:0, pagado:true, entregado:false, maps:'https://www.google.com/maps?q='+_pin(i).lat+','+_pin(i).lng, ts:1, fotos:[], rev:1, nroDia:i }, o||{}); };
  window._armar=function(){
    n=0;
    STATE=[
      _P('h1'),                                                           // sin camión, el Carry se paró en su puerta
      _P('h2'),                                                           // sin camión, nadie lo vio
      _P('h3', { vehiculo:'Foton nuevo', chofer:'Luis Pierre' }),         // con camión
      _P('h4', { observaciones:'EL CLIENTE RECOGE DE FABRICA' }),         // lo retira el cliente
      _P('h5', { chofer:'Ysrael' }),                                      // sin camión escrito, pero su chofer dice Carry (y hoy Ysrael maneja el Carry)
      _P('h6', { chofer:'Giordano' }),                                    // sin camión y con un chofer que ya no está en la lista
      _P('c1', { vehiculo:'Foton encarpado', chofer:'Diego' }),           // hoy el encarpado lo maneja Diego (rotan)
      _P('h8'),                                                           // sin camión, no se va a tildar
      _P('a1', { fecha:'2026-11-04' }),                                   // atrasado, sin camión
      _P('a0', { fecha:'2026-11-04', vehiculo:'Foton nuevo', chofer:'Fernando' })   // ayer el Foton nuevo lo manejó Fernando
    ];
    saveMirror();
    var D={ f:todayStr(), t:Date.now(), u:{ '6409TIG':{ s:'09:00', ev:[['09:00','sal','ptf',0]], par:[ ['10:00','10:15', _pin(1).lat, _pin(1).lng, ['h1'], 0, 25] ] } } };
    gpsDiaTomar(D);
  };
  window._fila=function(id){ var box=document.getElementById('modal-box'); var i=box && box.querySelector('.cie-ent-chk[data-id="'+id+'"]'); return i ? i.closest('.cie-row') : null; };
  window._cam=function(id){ return document.querySelector('#modal-box .cie-cam[data-id="'+id+'"]'); };
`;

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const nueva = async () => {
    const page = await browser.newPage({ viewport:{ width:1300, height:950 }, timezoneId:'America/La_Paz' });
    page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
    await page.route(/^https?:/, r=>r.abort());
    await page.clock.setFixedTime(new Date('2026-11-05T17:00:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    return page;
  };

  console.log('\n── 1-2. El selector en el cierre ──');
  let page = await nueva();
  let r = await page.evaluate((base) => {
    eval(base); _armar(); abrirCierreEntregas();
    var o={ saves:window._saves.length };
    var sel=function(id){ var c=_cam(id); var s=c && c.querySelector('select'); return s ? s.value : null; };
    o.h1=sel('h1'); o.h1gps=/lo dice el GPS/.test((_cam('h1')||{}).innerText||'');
    o.h2=sel('h2'); o.a1=sel('a1'); o.h6=sel('h6');
    o.h3=!!_cam('h3'); o.h5=!!_cam('h5');
    var c4=_cam('h4'); o.h4=c4 ? c4.innerText.replace(/\s+/g,' ') : null; o.h4sel=!!(c4 && c4.querySelector('select'));
    o.pregunta=/¿Qué camión lo llevó\?/.test((_cam('h2')||{}).innerText||'');
    o.opciones=[].map.call((_cam('h2')||document).querySelectorAll('option'), function(x){ return x.value; }).filter(Boolean);
    o.afuera=!!_cam('h2') && !_cam('h2').closest('label') && !_fila('h2').contains(_cam('h2'));
    /* elegir el encarpado para h2 (como lo haría la persona) */
    var s2=_cam('h2').querySelector('select'); s2.value='Foton encarpado'; s2.dispatchEvent(new Event('change', { bubbles:true }));
    o.tildoH2=_fila('h2').querySelector('.cie-ent-chk').checked;
    o.savesTrasElegir=window._saves.length;
    renderCierreEntregas();
    o.h2tras=sel('h2'); o.h1tras=sel('h1');
    return o;
  }, BASE);
  if (r.__error) console.log('ERROR', r.__error);
  chk('1a de hoy sin camión que vio el GPS: el selector ya elegido en «Carry» con «🛰️ lo dice el GPS»', r.h1==='Carry' && r.h1gps, r);
  chk('1b de hoy sin camión que nadie vio, el atrasado y el del chofer que ya no está: el selector vacío, con «¿Qué camión lo llevó?» y los 4 camiones',
      r.h2==='' && r.a1==='' && r.h6==='' && r.pregunta && r.opciones.join(',')==='Carry,Foton nuevo,Foton encarpado,Foton insumo', r);
  chk('1c no sale si ya tiene camión (h3) ni si su chofer de la lista ya dice el camión (h5)', !r.h3 && !r.h5, r);
  chk('1d lo que retira el cliente dice «Lo retiró el cliente» y no pide camión', /Lo retiró el cliente/.test(r.h4||'') && !r.h4sel, r.h4);
  chk('1e el selector va afuera del <label>: elegir no tilda el pedido', r.afuera && r.tildoH2===false, r);
  chk('1f abrir el cierre y elegir no guardan nada', r.saves===0 && r.savesTrasElegir===0, r);
  chk('2 lo elegido sobrevive al repintado del cierre (h2 sigue en el encarpado, h1 en el Carry)', r.h2tras==='Foton encarpado' && r.h1tras==='Carry', r);

  console.log('\n── 3-4. Confirmar ──');
  r = await page.evaluate(async () => {
    /* h6: elegir el Carry (tiene a Giordano escrito: no se pisa). a1 se tilda SIN camión. h8 elige camión pero NO se tilda. */
    var s6=_cam('h6').querySelector('select'); s6.value='Carry'; s6.dispatchEvent(new Event('change', { bubbles:true }));
    var s8=_cam('h8').querySelector('select'); s8.value='Foton insumo'; s8.dispatchEvent(new Event('change', { bubbles:true }));
    ['h1','h2','h4','h6','a1'].forEach(function(id){ var i=_fila(id).querySelector('.cie-ent-chk'); i.checked=true; i.dispatchEvent(new Event('change', { bubbles:true })); });
    cierreEntElegirDia('a1', '2026-11-04');
    document.getElementById('cie-ent-quien').value='Ernesto';
    /* la relectura: otro equipo le puso el Foton nuevo · Fernando a h2 mientras tanto */
    var pl=JSON.parse(JSON.stringify(STATE)); pl.forEach(function(p){ if(p.id==='h2'){ p.vehiculo='Foton nuevo'; p.chofer='Fernando'; p.rev=2; } });
    window._planilla=pl;
    var s0=window._saves.length;
    var res=await confirmarCierreEntregas();
    await new Promise(function(x){ setTimeout(x, 100); });
    window._planilla=null;
    var v=function(id){ var p=findById(id); return p ? ((p.vehiculo||'')+'·'+(p.chofer||'')+(p.entregado?'·✅':'')) : null; };
    var sv=window._saves.slice(s0), sh1=sv.filter(function(x){ return x.id==='h1'; });
    var txt=(document.getElementById('modal-box')||{}).innerText||'';
    return { h1:v('h1'), h2:v('h2'), h6:v('h6'), a1:v('a1'), h8:v('h8'), h4:v('h4'),
      ids:sv.map(function(x){ return x.id; }).sort(), h1guardado:sh1.length===1 && sh1[0].vehiculo==='Carry' && sh1[0].chofer==='Ysrael' && sh1[0].entregado===true,
      sinCam:(res&&res.sinCam||[]).map(function(p){ return p.id; }), conCam:res&&res.conCam, txt:txt.replace(/\s+/g,' '), boton:!!document.getElementById('cie-sincam-btn') };
  });
  if (r.__error) console.log('ERROR', r.__error);
  chk('3a h1: Carry y el chofer que iba HOY en el Carry (Ysrael, rotan), en el MISMO guardado del ✅', r.h1==='Carry·Ysrael·✅' && r.h1guardado, r);
  chk('3b h2: otro equipo le puso el Foton nuevo mientras tanto → gana la planilla (no se pisa con lo elegido)', r.h2==='Foton nuevo·Fernando·✅', r.h2);
  chk('3c h6: el Carry, y su chofer escrito (Giordano) no se pisa', r.h6==='Carry·Giordano·✅', r.h6);
  chk('3d un guardado por pedido confirmado (h1, h2, h4, h6, a1) y nada para h8 (no tildado)', r.ids.join(',')==='a1,h1,h2,h4,h6', r.ids);
  chk('3e h8 (camión elegido pero no tildado): ni camión ni ✅', r.h8==='·', r.h8);
  chk('3f lo que retira el cliente (h4) se confirma sin camión y no cuenta como «sin camión»', r.h4==='··✅' && r.sinCam.indexOf('h4')<0, r);
  chk('4a el resultado dice «1 entrega quedaron sin camión anotado» (a1) y cuántos se anotaron', r.sinCam.join(',')==='a1' && /1 entrega quedaron sin camión anotado/.test(r.txt) && /Se anotó el camión de 2 entregas/.test(r.txt) && r.boton, r);

  r = await page.evaluate(async () => {
    document.getElementById('cie-sincam-btn').click();
    await new Promise(function(x){ setTimeout(x, 50); });
    var box=document.getElementById('modal-box'), txt=box.innerText.replace(/\s+/g,' ');
    var fs=[].map.call(box.querySelectorAll('.cam-an-f'), function(f){ return f.getAttribute('data-id'); });
    var b=document.getElementById('cam-an-guardar'), antes=b && b.disabled;
    var s=box.querySelector('.cam-an-cam[data-id="a1"]'); s.value='Foton nuevo'; s.dispatchEvent(new Event('change', { bubbles:true }));
    var s0=window._saves.length;
    await camAnotarGuardar();
    await new Promise(function(x){ setTimeout(x, 80); });
    var p=findById('a1'), sv=window._saves.slice(s0);
    return { fs:fs, txt:txt, antes:antes, a1:p.vehiculo+'·'+p.chofer, saves:sv.map(function(x){ return x.id+'·'+x.vehiculo+'·'+x.chofer; }), abierto:document.getElementById('modal').classList.contains('on') };
  });
  if (r.__error) console.log('ERROR', r.__error);
  chk('4b «🚚 Elegir el camión» abre la lista con a1 (el que quedó), con «Guardar» apagado hasta elegir', r.fs.join(',')==='a1' && /¿Qué camión lo llevó\?/.test(r.txt) && r.antes===true, r);
  chk('4c guardar: a1 → Foton nuevo · Fernando (el chofer de ESE día del Foton nuevo), un guardado durable, la lista se cierra', r.a1==='Foton nuevo·Fernando' && r.saves.join('|')==='a1·Foton nuevo·Fernando' && !r.abierto, r);
  await page.close();

  console.log('\n── 5. Sin señal: el plan pendiente lleva los camiones ──');
  page = await nueva();
  r = await page.evaluate(async (base) => {
    eval(base); _armar(); abrirCierreEntregas();
    var s=_cam('h2').querySelector('select'); s.value='Foton insumo'; s.dispatchEvent(new Event('change', { bubbles:true }));
    var i=_fila('h2').querySelector('.cie-ent-chk'); i.checked=true; i.dispatchEvent(new Event('change', { bubbles:true }));
    document.getElementById('cie-ent-quien').value='Ernesto';
    CONNECTED=false;
    await confirmarCierreEntregas();
    var pend=cierreEntPendiente(), antes=findById('h2').vehiculo||'';
    CONNECTED=true;
    var res=await cierreEntSincronizar();
    var p=findById('h2');
    return { cam:pend && pend.cam, antes:antes, h2:p.vehiculo+'·'+p.chofer+(p.entregado?'·✅':''), quedan:!!cierreEntPendiente(), saves:window._saves.length };
  }, BASE);
  if (r.__error) console.log('ERROR', r.__error);
  chk('5a sin señal no se escribe nada y el plan pendiente guarda el camión elegido', r.cam && r.cam.h2==='Foton insumo' && r.antes==='', r);
  chk('5b al sincronizar se aplica con el ✅: Foton insumo · Miguel Melgar (el primero de la lista: hoy nadie lo manejó)', r.h2==='Foton insumo·Miguel Melgar·✅' && !r.quedan && r.saves===1, r);
  await page.close();

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e => { console.error(e); process.exit(1); });
