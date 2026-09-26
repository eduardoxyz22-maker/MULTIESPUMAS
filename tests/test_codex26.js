/* 🔎 LA REVISIÓN DE CODEX DEL 26/09 — hallazgos 1, 2 y 4 (y la hora del reporte de existencias).
   Codex los reprodujo con las funciones reales del panel; acá cada uno es una prueba que falla con el
   panel publicado (a8e3c5e) y pasa con el arreglo:
     1. un cobro de la puerta que no entró se daba por guardado si en la planilla había OTRO cobro con el
        mismo método y monto (dos «Efectivo 100» de días distintos acá y uno allá);
     2. el ✅ que choca se reaplicaba sobre la fila del servidor aunque logística hubiera pasado el pedido
        a otro día (o a la devolución de la ATC): marcaba entregado el viaje que todavía no salió;
     4. el aviso de lo que no entró se vencía a las 48 h, lo veía cualquier chofer del celular, «Ya lo
        revisé» lo marcaba para todos, y el tope de 20 rechazos lo podía tirar sin que nadie lo viera.
   Más: la hora del corte del Excel de existencias (el nombre con la fecha entre guiones, y el pie).
   El hallazgo 3 (días cerrados entre dos computadoras) va en test_codex26_cierres.js, con el .gs real.
   Se corre:  node tests/test_codex26.js   ·   Dientes: PEDIDOS=/ruta/al/viejo/pedidos.html node …
   Solo datos sintéticos: el repo es público. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,260)):''); };
const ARCH = process.env.PEDIDOS || path.resolve('pedidos.html');
const HOY = '2026-09-24';                      // jueves

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{ width:390, height:860 }, timezoneId:'America/La_Paz', locale:'es-BO' });
  const errores=[]; page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date(HOY+'T10:00:00-04:00'));
  await page.goto('file://' + ARCH, { waitUntil:'load' });
  await page.waitForTimeout(350);
  await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    if(typeof CARGA_GEN!=='undefined'){ CARGA_GEN++; CARGA_ESTADO='ok'; }
    if(typeof CARGA_TIMER!=='undefined' && CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; }
    if(typeof CARGA_TIC!=='undefined' && CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(k||'')+': '+String(m)); return _t(m,k,ms); };
  });

  // ══ 1. El cobro perdido, cobro por cobro ═════════════════════════════════════════════════
  console.log('\n── 1. Qué se perdió: cada cobro de la planilla vale por UNO de acá, con su fecha ──');
  const r1 = await page.evaluate(() => {
    var mk=function(cobros, ent){ return { id:'P1', cliente:'CLIENTE UNO', chofer:'Luis Pierre', entregado:!!ent, metodoPago:textoCobros(cobros), saldo:0, pagado:false, fotos:[] }; };
    var d23={metodo:'Efectivo', banco:'', monto:100, fecha:'2026-09-23', nota:'', recibio:'Luis Pierre'};
    var d24={metodo:'Efectivo', banco:'', monto:100, fecha:'2026-09-24', nota:'', recibio:'Luis Pierre'};
    var conta={metodo:'Efectivo', banco:'', monto:100, fecha:'2026-09-24', nota:'1234', recibio:'Luis Pierre', comps:['IMGCONTA']};
    return {
      distintos: rechazoPerdido(mk([d23,d24],true), mk([d23],true)),
      mismoDia:  rechazoPerdido(mk([d24,d24],true), mk([d24],true)),
      todos:     rechazoPerdido(mk([d23,d24],true), mk([d23,d24],true)),
      registrado:rechazoPerdido(mk([d24],true), mk([conta],true))
    };
  });
  chk('⚠️ dos «Efectivo 100» de días distintos acá y UNO en la planilla: avisa el que falta (antes: nada)',
      r1.distintos && r1.distintos.cobros && r1.distintos.cobros.length===1 && /24\/09/.test(r1.distintos.cobros[0].txt), r1.distintos);
  chk('⚠️ dos del MISMO día acá y uno allá: avisa uno', r1.mismoDia && r1.mismoDia.cobros && r1.mismoDia.cobros.length===1, r1.mismoDia);
  chk('control · con los dos en la planilla no avisa nada', r1.todos===null, r1.todos);
  chk('control · el mismo cobro que Contabilidad registró con recibo e imagen sigue siendo ese (no avisa)', r1.registrado===null, r1.registrado);

  // ══ 2. El ✅ que choca no se reaplica sobre OTRO viaje ═══════════════════════════════════════
  console.log('\n── 2. El ✅ reintentado, solo sobre el MISMO viaje ──');
  /* El servidor de mentira: el primer guardado de cada pedido choca y devuelve `srv`; los siguientes entran. */
  const armar2 = async (p, srv) => { await page.evaluate(() => { showView('chofer'); }); await page.waitForTimeout(150); return page.evaluate((a) => {
    CONNECTED=true; UNLOCKED=true;
    try{ localStorage.removeItem(LS_RECHAZOS); localStorage.removeItem(LS_PEND); }catch(e){}
    var base={ turno:'AM', celular:'7', zona:'Norte', direccion:'Calle 1', maps:'', observaciones:'', estado:'', entregado:false,
      vehiculo:'CAMION 1', chofer:'Luis Pierre', nroDia:1, fotos:[], vendedor:'Carola Chavez', ts:Date.now(), acuenta:0, saldo:0,
      pagado:true, metodoPago:'', oc:'09-500', nota:'500', rev:5, productos:[{desc:'COLCHON', cant:1, precio:1000}] };
    var P=Object.assign({}, base, a.p), S=Object.assign({}, base, a.p, a.srv);
    STATE=[P]; window._saves=[]; window._toasts=[];
    apiPost=function(payload){
      if(payload.action==='save'){
        window._saves.push(JSON.parse(JSON.stringify(payload.pedido)));
        if(window._saves.length===1) return Promise.resolve({ ok:false, error:'conflicto', pedido:JSON.parse(JSON.stringify(S)) });
        return Promise.resolve({ ok:true, pedido:Object.assign(JSON.parse(JSON.stringify(payload.pedido)), { rev:99 }) });
      }
      return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) });   // un refresco no borra el fixture
    };
    var sel=document.getElementById('cho-nombre');
    if(![].some.call(sel.options, function(o){ return o.value==='Luis Pierre'; })){ var o=document.createElement('option'); o.value=o.textContent='Luis Pierre'; sel.appendChild(o); }
    sel.value='Luis Pierre'; renderChofer();
  }, { p, srv }); };
  const tocar2 = (id) => page.evaluate(async (id) => { choEntregado(id); await new Promise(r => setTimeout(r, 500)); var s=findById(id);
    return { saves:window._saves.map(function(x){ return { fecha:x.fecha, ent:!!x.entregado }; }), fecha:s&&s.fecha, ent:!!(s&&s.entregado),
             rech:rechazosLocales().map(function(x){ return x.perdio||null; }), toasts:window._toasts.slice(), cartel:(document.getElementById('cho-rechazos')||{}).textContent||'' }; }, id);

  await armar2({ id:'M1', cliente:'CLIENTE MOVIDO', fecha:HOY }, { fecha:'2026-10-02', rev:6 });
  let r2 = await tocar2('M1');
  chk('⚠️ logística lo pasó al 02/10 mientras tanto: el ✅ de hoy NO se reaplica (un solo guardado, el que chocó)', r2.saves.length===1, r2.saves);
  chk('⚠️ …la fila queda como la dejó logística: 02/10, sin entregar', r2.fecha==='2026-10-02' && r2.ent===false, { fecha:r2.fecha, ent:r2.ent });
  chk('…el chofer ve un aviso rojo que dice adónde lo pasaron', r2.toasts.some(t => /^err: .*NO se marcó.*02\/10/.test(t)), r2.toasts.join(' | '));
  chk('…y su cartel lo dice, para que avise a logística si ya lo entregó', /NO se marcó.*02\/10.*logística/.test(r2.cartel), r2.cartel.slice(0,200));

  await armar2({ id:'M2', cliente:'CLIENTE MISMO VIAJE', fecha:HOY }, { observaciones:'Contabilidad registró el QR', rev:6 });
  r2 = await tocar2('M2');
  chk('control · el MISMO viaje (otro solo tocó una nota): el ✅ se reaplica una vez sobre la fila nueva', r2.saves.length===2 && r2.saves[1].ent===true && r2.saves[1].fecha===HOY, r2.saves);
  chk('control · …queda entregado y sin cartel rojo', r2.ent===true && !r2.cartel, { ent:r2.ent, cartel:r2.cartel.slice(0,80) });

  const atc = (extra) => [{ desc:'COLCHON', cant:1, atc:Object.assign({ mot:'Garantía', det:'se hunde' }, extra||{}) }];
  await armar2({ id:'M3', cliente:'CLIENTE ATC', fecha:HOY, oc:'ATC 09-001', pagado:false, productos:atc() },
               { productos:atc({ rec:HOY, rturno:'AM', pdev:HOY, pturno:'PM' }), turno:'PM', rev:6 });
  r2 = await tocar2('M3');
  chk('⚠️ ATC: el chofer tocó el ✅ del RECOJO y logística programó la devolución el mismo día: no se reaplica', r2.saves.length===1, r2.saves);
  chk('…y el aviso dice que pasó a la devolución', r2.toasts.some(t => /NO se marcó.*devolución/.test(t)), r2.toasts.join(' | '));

  // ══ 4. El aviso de lo que no entró: hasta «Ya lo revisé», y el de cada chofer ═════════════
  console.log('\n── 4. El cartel del chofer: no se vence, es de cada chofer y no se cae por el tope ──');
  const r4 = await page.evaluate(async () => {
    var ahora=Date.now(), H=3600000;
    var R=function(id, cli, cho, horas){ return { ts:ahora-horas*H, id:id, cliente:cli, error:'conflicto', perdio:{ entregado:true }, chofer:cho }; };
    localStorage.setItem(LS_RECHAZOS, JSON.stringify([ R('X2','CLIENTE DE YSRAEL','Ysrael',1), R('X1','CLIENTE DE HACE DOS DIAS','Luis Pierre',49) ]));
    var sel=document.getElementById('cho-nombre');
    ['Luis Pierre','Ysrael'].forEach(function(n){ if(![].some.call(sel.options, function(o){ return o.value===n; })){ var o=document.createElement('option'); o.value=o.textContent=n; sel.appendChild(o); } });
    STATE=[]; showView('chofer');
    var ver=function(n){ sel.value=n; renderChofer(); return (document.getElementById('cho-rechazos')||{}).textContent||''; };
    var out={ luis:ver('Luis Pierre'), ysrael:ver('Ysrael') };
    sel.value='Luis Pierre'; renderChofer(); choRechazosVistos();
    out.trasLuis=rechazosLocales().map(function(x){ return x.id+':'+(x.visto?'visto':'pendiente'); });
    out.ysraelDespues=ver('Ysrael');
    // El tope de 20: 25 rechazos nuevos de otra cosa (busy) no se llevan el de Ysrael que nadie revisó.
    for(var i=0;i<25;i++) rechazoRecordar({ id:'B'+i, cliente:'OTRO '+i }, { error:'busy' });
    out.sigue=rechazosLocales().some(function(x){ return x.id==='X2' && x.perdio && !x.visto; });
    out.largo=rechazosLocales().length;
    return out;
  });
  chk('⚠️ el aviso de hace 49 horas que nadie revisó SIGUE a la vista (antes se vencía a las 48)', /HACE DOS DIAS/.test(r4.luis), r4.luis.slice(0,160));
  chk('⚠️ …y a Luis no le aparece el de Ysrael', !/YSRAEL/.test(r4.luis), r4.luis.slice(0,160));
  chk('⚠️ a Ysrael le aparece el suyo y no el de Luis', /YSRAEL/.test(r4.ysrael) && !/HACE DOS DIAS/.test(r4.ysrael), r4.ysrael.slice(0,160));
  chk('⚠️ «Ya lo revisé» de Luis marca SOLO el de Luis', r4.trasLuis.indexOf('X1:visto')>=0 && r4.trasLuis.indexOf('X2:pendiente')>=0, r4.trasLuis);
  chk('…y Ysrael lo sigue viendo', /YSRAEL/.test(r4.ysraelDespues), r4.ysraelDespues.slice(0,120));
  chk('⚠️ 25 rechazos de otra cosa después no se llevan el que nadie revisó (antes: tope de 20)', r4.sigue===true, 'quedan '+r4.largo);

  // ══ 5. La hora del corte del Excel de existencias ═══════════════════════════════════════
  console.log('\n── 5. La hora del reporte de existencias: del nombre con guiones, o del pie ──');
  const r5 = await page.evaluate(() => ({
    guiones: existHoraDeNombre('Excel_26-09-2026_10_30_36_BANZER.xlsx'),
    pegado:  existHoraDeNombre('Excel_07092026_08_59_57_almacen_septiembre.xlsx'),
    pie: (typeof existHoraDePie==='function') ? existHoraDePie([{ C:'MULTIESPUMAS' }, { G:'CH1', W:'COLCHON X', AY:'2.000000' },
           { B:'iv380_34', Z:'Página 5 de 5', AZ:'Fecha : 24/09/2026 10:30:33 - usuario' }]) : 'no existe'
  }));
  chk('⚠️ el nombre con la fecha entre guiones da la hora (antes: nada)', r5.guiones && r5.guiones.f==='2026-09-26' && r5.guiones.hora==='10:30:36', r5.guiones);
  chk('control · el nombre de siempre sigue igual', r5.pegado && r5.pegado.f==='2026-09-07' && r5.pegado.hora==='08:59:57', r5.pegado);
  chk('⚠️ sin la hora en el nombre, sale del pie del reporte («Fecha : … 10:30:33»)', r5.pie && r5.pie.f==='2026-09-24' && r5.pie.hora==='10:30:33', r5.pie);

  chk('sin errores de JavaScript', errores.length===0, errores.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
