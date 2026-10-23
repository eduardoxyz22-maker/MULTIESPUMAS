/* 🌅🌙 DOS EXCEL POR DÍA (23/10, dueño: «el corte de cada día lo subirán en las mañanas, ANTES DE CARGAR los camiones, Y OTRO AL FINAL DEL
   DÍA, para que mejoremos con los stock, reposición y mejoras»).

   La rutina nueva, de punta a punta, con la página de verdad (la vista previa del Excel, sus dos casillas y «Usar»):
   DC1  Lunes 26/10 08:00, antes de cargar: el panel propone NO marcar ni la mañana ni la tarde (con o sin dato del camión), lo de hoy
        queda reservado y el control contra el Excel del sábado a la noche cuadra.
   DC2  Lunes 26/10 18:30, al final del día (salieron los camiones de la mañana y de la tarde, y entraron 4 de fábrica): el panel
        propone marcar las DOS; lo entregado hoy NO aparece como «salida sin explicar» y lo que entró de fábrica SÍ aparece como entrada
        (es lo que se quiere medir); lo de hoy ya no queda reservado. Banzer (su propio Excel) igual.
   DC3  Martes 27/10 08:00, antes de cargar: contra el Excel de anoche cuadra (nada salió en la noche); si la fábrica entregó a la noche,
        aparece como entrada. Lo del martes queda reservado.
   DC4  Un Excel de la mañana sacado TARDE (09:45): con «🚚 Ya salió» a las 10:30 manda el camión; SIN dato del camión la mañana se
        propone recién desde el mediodía (`STOCK_INC_AM_EXCEL`; antes 09:30, cuando el Excel se sacaba a las ~10:00 con el camión ya
        cargado). «📋 Conté a mano» sigue con las 09:30. La vista previa explica la rutina.
   DC5  Lo cargado DESPUÉS del Excel de la noche y entregado se resta en el de la mañana siguiente; lo de antes, no otra vez.
   DC6  Subir el Excel relee la planilla antes de la vista previa (el último corte pudo subirlo otro aparato); sin lectura, avisa.
   DC7  El Excel de la noche avisa los pedidos de hoy sin ✅ en el Cierre de entregas.
   DC8  Una detección vieja dice de qué Excel del día es (la hora).
   Reloj CLAVADO en cada paso. Red cortada, servidor simulado, datos sintéticos (el repo es público).
   Se corre:  node tests/test_dos_cortes.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const J=(x)=>JSON.stringify(x);
/* El mismo arranque que `test_stock_rev2_u2_turno.js` (servidor simulado, `_stock`, `_ped`, `_lin`, `_cargar`, `_fila`). */
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_u2_turno.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));
const corre = async (page, fn, arg) => page.evaluate(async ([src, arg]) => { try{ return await (0,eval)('('+src+')')(arg); }catch(e){ return { __error:String(e && e.stack || e) }; } }, [fn.toString(), arg]);

async function abrir(browser, reloj){
  const ctx = await browser.newContext({ viewport:{ width:1200, height:1000 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage(); page.setDefaultTimeout(30000);
  page._err=[]; page.on('pageerror', e => page._err.push(e.message)); page.on('dialog', d => d.accept());
  await page.clock.setFixedTime(new Date(reloj));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');
  /* Sube un Excel por la vista previa de verdad: arma la ventana, lee las casillas que propone, las deja como están y aprieta «Usar».
     Devuelve lo que propuso y el control del corte con esas casillas. */
  await page.evaluate(() => {
    window._excel=function(alm, rol, hora, cants){
      var items=Object.keys(cants).map(function(k){ var a=k.split('|'); return { cod:a[0], desc:a[1], medida:a[2], cant:cants[k], cat:true, k:_k(a[0],a[1],a[2]) }; });
      return { fecha:todayStr(), hora:hora, sacado:todayStr(), sinFecha:false, almacen:alm, items:items, total:items.reduce(function(n,x){ return n+x.cant; },0),
               repetidos:0, malos:0, colCant:'AY', solo0:true, cods:{}, esLog:rol==='log', conocido:true };
    };
    window._subir=async function(R, rol){
      EXIST_IMP=R; renderImportExist();
      var sel=document.getElementById('exist-rol'); if(sel && sel.value!==rol){ sel.value=rol; existRepintarControl(); }
      var am=document.getElementById('exist-inc'), pm=document.getElementById('exist-inc-pm');
      var inc={ am:!!(am && am.checked), pm:!!(pm && pm.checked) };
      var C=stockConciliar(R, rol, inc), filas={};
      (C.todas||C.filas||[]).forEach(function(f){ filas[f.k]={ dif:f.dif, tipo:f.tipo||'' }; });
      var txt=((document.getElementById('modal-box')||{}).textContent||'').replace(/\s+/g,' ');
      await confirmarImportExist(); stockOlvidarIndice();
      return { inc:inc, filas:filas, cuadran:C.resumen && C.resumen.cuadran, viejo:!!C.corteViejo, txt:txt.slice(0,400) };
    };
  });
  return page;
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const BZ='Almacen Distribucion Banzer';
  // Lunes 26/10: entregas de la mañana (2 desde PTF, Foton) y de la tarde (1 desde PTF y 1 desde Banzer); el martes, 3 más.
  const PEDS = (lun, mar) => [
    { id:'a01', fecha:lun, turno:'AM', lin:[['CH1201|TITANIO ICE|160x190', 2, {}]], veh:'Foton nuevo' },
    { id:'a02', fecha:lun, turno:'PM', lin:[['CH1201|TITANIO ICE|160x190', 1, {}]], veh:'Foton nuevo' },
    { id:'a03', fecha:lun, turno:'PM', lin:[['CH1201|TITANIO ICE|160x190', 1, { chk:'ok', chkDe:BZ }]], veh:'Foton nuevo' },
    { id:'a04', fecha:mar, turno:'AM', lin:[['CH1201|TITANIO ICE|160x190', 3, {}]], veh:'Carry' } ];

  // ═══ DC1. Lunes 08:00, antes de cargar ═══
  console.log('\n── DC1. Lunes 26/10, Excel de las 08:00 (antes de cargar los camiones) ──');
  let page = await abrir(browser, '2026-10-26T08:05:00-04:00');
  let r = await corre(page, async (PEDS) => {
    var out={}, BZ=_BZ;
    var peds=PEDS.map(function(p){ return _ped(p.id, p.fecha, p.turno, p.lin.map(function(l){ var x=_lin(l[0], l[1], l[2]); if(x.chkDe) x.chkDe=BZ; return x; }), { vehiculo:p.veh, ts:_ts('2026-10-23','11:00:00') }); });
    // el último corte: sábado 24/10 a las 18:30, con los dos turnos (PTF 10, Banzer 5, Moreno 20)
    var st=_stock(function(s){ s.c.u[_K]=10; s.g[_BZ].u[_K]=5; s.g[_IM].u[_K]=20; }, { f:'2026-10-24', hora:'18:30:00', subido:'18:35:00', inc:true });
    st.g[_IM].f='2026-10-24'; st.g[_IM].hora='18:30:00';
    await _cargar(peds, st);
    out.prop=stockIncPropuesta('08:00:00','');
    out.ptf=await _subir(_excel(_LOG, 'log', '08:00:00', { 'CH1201|TITANIO ICE|160x190':10 }), 'log');
    out.bz=await _subir(_excel(_BZ, 'sale', '08:00:00', { 'CH1201|TITANIO ICE|160x190':5 }), 'sale');
    var o=_fila(_K); out.fila={ dep:o.deposito, bz:o.enSale, comp:o.comp };
    out.stock=window._guardado; out.pedidos=JSON.parse(JSON.stringify(STATE));
    // con «🚚 Ya salió» a las 09:10 el Excel de las 08:00 tampoco trae la mañana
    CARGA_CHK[cargaChkKey(todayStr(),'Foton nuevo',CARGA_SALIO)+'|09:10']=1;
    var p2=stockIncPropuesta('08:00:00',''); out.conCamion={ am:p2.am.v, pm:p2.pm.v, txt:p2.am.txt };
    return out;
  }, PEDS('2026-10-26','2026-10-27'));
  if(r.__error) console.log(r.__error);
  chk('DC1a · el Excel de las 08:00 propone las dos casillas SIN marcar (nada salió todavía)', r.prop && r.prop.am.v===false && r.prop.pm.v===false && r.ptf.inc.am===false && r.ptf.inc.pm===false, J([r.prop, r.ptf && r.ptf.inc]));
  chk('DC1b · …también con el dato del camión (salió 09:10, después del Excel)', r.conCamion && r.conCamion.am===false, J(r.conCamion));
  chk('DC1c · el control contra el Excel del sábado a la noche cuadra en PTF y en Banzer (sin entradas ni salidas sin explicar)',
      r.ptf && !(r.ptf.filas[Object.keys(r.ptf.filas)[0]]||{}).dif && r.bz && !(r.bz.filas[Object.keys(r.bz.filas)[0]]||{}).dif, J([r.ptf && r.ptf.filas, r.bz && r.bz.filas]));
  chk('DC1d · lo del lunes y el martes queda reservado: 2 + 1 + 1 (Banzer) + 3 = 7; PTF 10, Banzer 5', r.fila && r.fila.comp===7 && r.fila.dep===10 && r.fila.bz===5, J(r.fila));
  const stock1 = r.stock, peds1 = r.pedidos;
  await page.context().close();

  // ═══ DC2. Lunes 18:30, al final del día ═══
  console.log('\n── DC2. Lunes 26/10, Excel de las 18:30 (al final del día) ──');
  page = await abrir(browser, '2026-10-26T18:35:00-04:00');
  r = await corre(page, async ([stock, peds]) => {
    var out={};
    await _cargar(peds, JSON.parse(stock));
    CARGA_CHK[cargaChkKey(todayStr(),'Foton nuevo',CARGA_SALIO)+'|09:10']=1;
    out.prop=stockIncPropuesta('18:30:00','');
    // salieron 2 (mañana) + 1 (tarde) de PTF y 1 de Banzer; entraron 4 de fábrica a PTF: 10 − 3 + 4 = 11; Banzer 5 − 1 = 4
    out.ptf=await _subir(_excel(_LOG, 'log', '18:30:00', { 'CH1201|TITANIO ICE|160x190':11 }), 'log');
    out.bz=await _subir(_excel(_BZ, 'sale', '18:30:00', { 'CH1201|TITANIO ICE|160x190':4 }), 'sale');
    var o=_fila(_K); out.fila={ dep:o.deposito, bz:o.enSale, comp:o.comp };
    out.det=(STOCK.det||[]).filter(function(d){ return !d.an; }).map(function(d){ return [d.k===_K, d.u]; });
    out.sm=(STOCK.sm||[]).filter(function(s){ return !s.an; }).length;
    out.incT=[STOCK.c.incT||'', !!STOCK.c.inc, (STOCK.g[_BZ]||{}).incT||'', !!(STOCK.g[_BZ]||{}).inc];
    out.stock=window._guardado; out.pedidos=JSON.parse(JSON.stringify(STATE));
    return out;
  }, [stock1, peds1]);
  if(r.__error) console.log(r.__error);
  chk('DC2a · el Excel de las 18:30 propone las DOS casillas marcadas (salieron la mañana y la tarde)', r.prop && r.prop.am.v===true && r.prop.pm.v===true && r.ptf.inc.am && r.ptf.inc.pm, J([r.prop && [r.prop.am.v, r.prop.pm.v], r.ptf && r.ptf.inc]));
  chk('DC2b · lo entregado hoy NO es «salida sin explicar»: en PTF la única diferencia es lo que entró de fábrica (+4)', r.ptf && (r.ptf.filas[Object.keys(r.ptf.filas)[0]]||{}).dif===4, J(r.ptf && r.ptf.filas));
  chk('DC2c · Banzer cuadra (5 − 1 = 4)', r.bz && !(r.bz.filas[Object.keys(r.bz.filas)[0]]||{}).dif, J(r.bz && r.bz.filas));
  chk('DC2d · lo que entró queda anotado como entrada del día (detección +4) y no hay salidas sin explicar', r.det && r.det.length===1 && r.det[0][0] && r.det[0][1]===4 && r.sm===0, J([r.det, r.sm]));
  chk('DC2e · lo del lunes ya no se reserva (salió con los camiones): solo los 3 del martes; PTF 11, Banzer 4', r.fila && r.fila.comp===3 && r.fila.dep===11 && r.fila.bz===4, J(r.fila));
  chk('DC2f · el corte guarda los dos turnos', r.incT && (r.incT[0]==='ampm' || r.incT[1]) && (r.incT[2]==='ampm' || r.incT[3]), J(r.incT));
  const stock2 = r.stock, peds2 = r.pedidos;
  await page.context().close();

  // ═══ DC3. Martes 08:00, antes de cargar ═══
  console.log('\n── DC3. Martes 27/10, Excel de las 08:00 ──');
  page = await abrir(browser, '2026-10-27T08:05:00-04:00');
  r = await corre(page, async ([stock, peds]) => {
    var out={};
    await _cargar(peds, JSON.parse(stock));
    out.prop=stockIncPropuesta('08:00:00','');
    var antes=JSON.parse(JSON.stringify(STOCK));
    var R=_excel(_LOG, 'log', '08:00:00', { 'CH1201|TITANIO ICE|160x190':11 });
    EXIST_IMP=R; renderImportExist();
    var C=stockConciliar(R, 'log', { am:false, pm:false }), f=(C.todas||C.filas||[]).filter(function(x){ return x.k===_K; })[0];
    out.cuadra=f ? f.dif : 0;
    var R2=_excel(_LOG, 'log', '08:00:00', { 'CH1201|TITANIO ICE|160x190':13 });
    var C2=stockConciliar(R2, 'log', { am:false, pm:false }), f2=(C2.todas||C2.filas||[]).filter(function(x){ return x.k===_K; })[0];
    out.noche=f2 ? f2.dif : 0;
    out.ptf=await _subir(R, 'log');
    var o=_fila(_K); out.fila={ dep:o.deposito, comp:o.comp };
    return out;
  }, [stock2, peds2]);
  if(r.__error) console.log(r.__error);
  chk('DC3a · el Excel de la mañana siguiente propone las dos casillas sin marcar', r.prop && r.prop.am.v===false && r.prop.pm.v===false, J(r.prop && [r.prop.am.v, r.prop.pm.v]));
  chk('DC3b · contra el de anoche cuadra (nada salió en la noche)', r.cuadra===0, J(r.cuadra));
  chk('DC3c · si la fábrica entregó a la noche, aparece como entrada (+2)', r.noche===2, J(r.noche));
  chk('DC3d · lo del martes queda reservado (3); PTF 11', r.fila && r.fila.comp===3 && r.fila.dep===11, J(r.fila));
  await page.context().close();

  // ═══ DC5. Una venta del lunes cargada DESPUÉS del Excel de la noche y entregada ═══
  console.log('\n── DC5. Lunes 19:00: Eduardo carga una venta para hoy y sale; el Excel del martes 08:00 ya no la tiene ──');
  page = await abrir(browser, '2026-10-27T08:05:00-04:00');
  r = await corre(page, async ([stock, peds]) => {
    var out={};
    var extra=_ped('a05', '2026-10-26', 'PM', [_lin(_T,1,{ eF:'2026-10-26' })], { vehiculo:'Foton nuevo', entregado:true, vendedor:'Eduardo', ts:_ts('2026-10-26','19:00:00') });
    await _cargar(peds.concat([extra]), JSON.parse(stock));
    var C=stockConciliar(_excel(_LOG, 'log', '08:00:00', { 'CH1201|TITANIO ICE|160x190':10 }), 'log', { am:false, pm:false });
    var f=(C.todas||C.filas||[]).filter(function(x){ return x.k===_K; })[0];
    out.dif=f ? f.dif : 0;
    // la del lunes cargada a las 15:00 (antes del Excel de las 18:30) sigue sin restarse otra vez: con ella el Excel de 11 cuadra
    var p=findById('a05'); p.ts=_ts('2026-10-26','15:00:00'); stockOlvidarIndice();
    var C2=stockConciliar(_excel(_LOG, 'log', '08:00:00', { 'CH1201|TITANIO ICE|160x190':11 }), 'log', { am:false, pm:false });
    var f2=(C2.todas||C2.filas||[]).filter(function(x){ return x.k===_K; })[0];
    out.dif2=f2 ? f2.dif : 0;
    return out;
  }, [stock2, peds2]);
  if(r.__error) console.log(r.__error);
  chk('DC5a · lo cargado después del Excel de la noche y entregado se resta en el de la mañana siguiente (11 − 1 = 10 cuadra)', r.dif===0, J(r));
  chk('DC5b · lo cargado ANTES del Excel de la noche no se resta otra vez (ya no estaba en él)', r.dif2===0, J(r));
  await page.context().close();

  // ═══ DC6. Antes de la vista previa se relee la planilla ═══
  console.log('\n── DC6. Subir el Excel relee la planilla (el último corte pudo subirlo otro aparato) ──');
  page = await abrir(browser, '2026-10-26T18:35:00-04:00');
  r = await corre(page, async () => {
    var out={}, hoy=todayStr();
    await _cargar([], _stock(function(s){ s.c.u[_K]=10; }, { f:'2026-10-26', hora:'08:00:00', subido:'08:05:00' }));
    // otro aparato subió el de las 12:00 (PTF 8); este no lo vio (con Stock abierto no se relee solo)
    _SRV.stock=_stock(function(s){ s.c.u[_K]=8; }, { f:'2026-10-26', hora:'12:00:00', subido:'12:05:00' });
    var R=_excel(_LOG, 'log', '18:30:00', { 'CH1201|TITANIO ICE|160x190':8 });
    var msgs=[], tOrig=window.toast; window.toast=function(m){ msgs.push(String(m)); return tOrig.apply(this, arguments); };
    window.xlsxDescomprimir=function(){ return Promise.resolve({}); }; window.xlsxHoja=function(){ return []; };
    window.existLoteDe=function(){ return null; }; window.existLeer=function(){ return JSON.parse(JSON.stringify(R)); };
    window.existPonerHora=function(){}; window.existAlinearHora=function(){};
    var arch={ name:'EXISTENCIAS.xlsx', arrayBuffer:function(){ return Promise.resolve(new ArrayBuffer(0)); } };
    out.antes=STOCK.c.hora;
    onExistArchivo({ target:{ files:[arch] } });
    for(var i=0;i<40 && !(EXIST_IMP && document.getElementById('exist-inc')); i++) await new Promise(function(r){ setTimeout(r, 50); });
    out.despues=STOCK.c.hora;
    var C=stockConciliar(EXIST_IMP, 'log', { am:true, pm:true }), f=(C.todas||C.filas||[]).filter(function(x){ return x.k===_K; })[0];
    out.dif=f ? f.dif : 0;
    // si la lectura no contesta, se avisa y la vista previa sale igual
    closeModal && closeModal(); EXIST_IMP=null;
    EXIST_RELEER_MS=300; apiList=function(){ return new Promise(function(){}); };
    onExistArchivo({ target:{ files:[arch] } });
    for(var j=0;j<40 && !(EXIST_IMP && document.getElementById('exist-inc')); j++) await new Promise(function(r){ setTimeout(r, 50); });
    out.sinLectura=!!(EXIST_IMP && document.getElementById('exist-inc'));
    out.aviso=msgs.filter(function(m){ return /No se pudo leer la planilla/.test(m); }).length;
    return out;
  });
  if(r.__error) console.log(r.__error);
  chk('DC6a · al subir el Excel se relee la planilla y el control compara contra el corte de las 12:00 de otro aparato (8 → 8 cuadra)', r.antes==='08:00:00' && r.despues==='12:00:00' && r.dif===0, J(r));
  chk('DC6b · si la planilla no contesta, se avisa y la vista previa sale igual', r.sinLectura && r.aviso===1, J(r));
  await page.context().close();

  // ═══ DC7. El Excel de la noche avisa lo de hoy sin ✅ en el Cierre de entregas ═══
  console.log('\n── DC7. Excel de las 18:30 con pedidos de hoy sin cerrar ──');
  page = await abrir(browser, '2026-10-26T18:35:00-04:00');
  r = await corre(page, async () => {
    var out={}, hoy=todayStr();
    await _cargar([ _ped('c01', hoy, 'AM', [_lin(_T,2)], { vehiculo:'Foton nuevo' }), _ped('c02', hoy, 'PM', [_lin(_T,1)], { vehiculo:'Foton nuevo' }),
                    _ped('c03', '2026-10-27', 'AM', [_lin(_T,1)], { vehiculo:'Foton nuevo' }) ], _stock(function(s){ s.c.u[_K]=10; }, { f:hoy, hora:'08:00:00', subido:'08:05:00' }));
    var mk=function(h){ EXIST_IMP={ fecha:hoy, hora:h, sacado:hoy, sinFecha:false, almacen:_LOG, items:[{ cod:'CH1201', desc:'TITANIO ICE', medida:'160x190', cant:7, cat:true, k:_K }], total:7,
                repetidos:0, malos:0, colCant:'AY', solo0:true, cods:{}, esLog:true, conocido:true }; renderImportExist();
                return ((document.querySelector('#modal-box .inc-sin-cierre')||{}).textContent||'').replace(/\s+/g,' '); };
    out.noche=mk('18:30:00');
    out.rutina=((document.querySelector('#modal-box .inc-rutina')||{}).textContent||'').replace(/\s+/g,' ');
    out.manana=mk('08:00:00');
    _ent('c01'); _ent('c02'); out.cerrados=mk('18:30:00');
    return out;
  });
  if(r.__error) console.log(r.__error);
  chk('DC7a · el Excel de la noche avisa los 2 pedidos de hoy sin ✅ (el de mañana no cuenta)', /\b2\b/.test(r.noche||'') && /Cierre de entregas/.test(r.noche||''), r.noche);
  chk('DC7b · la rutina dice que el del final del día va después del Cierre de entregas', /después del ✅ Cierre de entregas/.test(r.rutina||''), r.rutina);
  chk('DC7c · el Excel de la mañana no avisa nada (no trae la tarde); con todo cerrado, tampoco', !r.manana && !r.cerrados, J([r.manana, r.cerrados]));
  await page.context().close();

  // ═══ DC8. La detección vieja dice de qué Excel del día es ═══
  console.log('\n── DC8. Martes 08:00: lo que entró el lunes a la noche se ofrece contra el pedido a fábrica, con la hora ──');
  page = await abrir(browser, '2026-10-27T08:05:00-04:00');
  r = await corre(page, async ([stock, peds]) => {
    var st=JSON.parse(stock);
    st.p=(st.p||[]).concat([{ id:'q-dc8', k:_K, u:4, f:'2026-10-24', fab:'Industrias Moreno', tipo:'fabrica', t:_ts('2026-10-24','12:00:00') }]);
    await _cargar(peds, st);
    EXIST_IMP=_excel(_LOG, 'log', '08:00:00', { 'CH1201|TITANIO ICE|160x190':11 }); renderImportExist();
    return ((document.getElementById('modal-box')||{}).textContent||'').replace(/\s+/g,' ').match(/detectad\w+ en el Excel del [^:]*?(a las \d\d:\d\d )?sin asignar/);
  }, [stock2, peds2]);
  if(r && r.__error) console.log(r.__error);
  chk('DC8 · la entrada de anoche se ofrece con la hora del Excel («… a las 18:30 sin asignar»)', r && /a las 18:30 sin asignar/.test(r[0]||''), J(r));
  await page.context().close();

  // ═══ DC4. Un Excel de la mañana sacado tarde, pero antes de que salga el camión ═══
  console.log('\n── DC4. Excel de las 09:45, el camión salió a las 10:30 ──');
  page = await abrir(browser, '2026-10-26T10:40:00-04:00');
  r = await corre(page, async () => {
    var hoy=todayStr();
    await _cargar([ _ped('b01', hoy, 'AM', [_lin(_T,2)], { vehiculo:'Foton nuevo' }) ], _stock(function(s){ s.c.u[_K]=10; }, { f:'2026-10-24', hora:'18:30:00', inc:true }));
    var sin=stockIncPropuesta('09:45:00','');
    CARGA_CHK[cargaChkKey(hoy,'Foton nuevo',CARGA_SALIO)+'|10:30']=1;
    var con=stockIncPropuesta('09:45:00','');
    CARGA_CHK={};
    var medio=stockIncPropuesta('12:30:00',''), mano=stockIncPropuesta('10:00:00','', true);
    EXIST_IMP={ fecha:hoy, hora:'09:45:00', sacado:hoy, sinFecha:false, almacen:_LOG, items:[{ cod:'CH1201', desc:'TITANIO ICE', medida:'160x190', cant:10, cat:true, k:_K }], total:10,
                repetidos:0, malos:0, colCant:'AY', solo0:true, cods:{}, esLog:true, conocido:true };
    renderImportExist();
    var txt=((document.querySelector('#modal-box .inc-rutina')||{}).textContent||'').replace(/\s+/g,' ');
    return { sin:sin.am.v, sinTxt:sin.am.txt, con:con.am.v, txt:con.am.txt, medio:medio.am.v, mano:mano.am.v, rutina:txt };
  });
  if(r.__error) console.log(r.__error);
  chk('DC4a · con «🚚 Ya salió» 10:30, el Excel de las 09:45 NO trae la mañana (manda el camión)', r.con===false, J(r));
  chk('DC4b · sin dato del camión, el Excel de la mañana (09:45) tampoco: con la rutina nueva es de antes de cargar (hasta el mediodía)', r.sin===false && /12:00/.test(r.sinTxt||''), J([r.sin, r.sinTxt]));
  chk('DC4c · un Excel de las 12:30 sin dato del camión sí trae la mañana; «Conté a mano» sigue con las 09:30', r.medio===true && r.mano===true, J([r.medio, r.mano]));
  chk('DC4d · la vista previa del Excel explica la rutina (mañana antes de cargar / final del día)', /antes de cargar/.test(r.rutina||'') && /final del día/.test(r.rutina||''), r.rutina);
  await page.context().close();

  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
