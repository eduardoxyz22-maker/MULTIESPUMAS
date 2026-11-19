/* 🚚 ENTREGAS POR CAMIÓN, POR CHOFER Y POR TIENDA (13/11/2026, idea 204). El dueño: «cuántas entregas de cada tienda, eso debemos
   contabilizar en el mes: cuántas entregas hizo cada camión o chofer en el mes de cada tienda, para ver los totales».

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. El botón «🚚 Entregas por camión» en Herramientas → «Entregas del día» (con su explicación); la ventana es `adm-ov` y abre en el
      mes en curso.
   2. Por camión: una fila por camión (los de la lista con 0 también) y una columna por tienda de quien vendió (el día que se cargó:
      lo vendido en octubre por Carola es de Central), aparte Mayoristas (Eduardo), ROHO, RPT, ATC e Internos; «Sin tienda»; la fila
      «Sin camión anotado» con su botón. Los totales cierran (filas = columnas = total).
   3. Qué cuenta: fecha pasada con o sin ✅, hoy SOLO con ✅, un día por venir solo con ✅ y su día real (eF). No cuentan: hoy sin ✅, un
      día por venir sin ✅ o con ✅ sin eF, venta de tienda, borrador de Kommo, filas del sistema, lo que avisa cuándo; lo que retira el
      cliente va aparte en una línea.
   4. Por chofer (recordado en el aparato), con «Sin chofer anotado».
   5. Las unidades (colchones y somieres) en chico debajo de cada número.
   6. Tocar una celda lista esos pedidos (N°, día, cliente, vendedora, zona) y cada uno abre su ficha.
   7. Cambio de mes (‹ ›; no se pasa del mes en curso).
   8. «✏️ Anotar el camión» abre la lista, guarda camión + el chofer de ese día y la tabla se rehace.
   9. «📋 Copiar» con las dos tablas; «⬇️ Excel» con «Por camión», «Por chofer» y «Entregas», números como número.
   10. En 390 px no hay scroll de costado (la tabla se desliza adentro de su caja).
   Datos SINTÉTICOS. Reloj clavado el viernes 13/11/2026 a las 15:00 de Bolivia.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_entregas_camion.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };

const BASE = `
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true; SERVER_AUTH='abierto';
  document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block';
  try{ localStorage.removeItem(LS_PEND); localStorage.removeItem('me_gps_dia'); }catch(e){}
  if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  CARGA_GEN++; CARGA_ESTADO='ok'; NO_ENCOLAR={}; SAVE_ULTIMO={}; SAVE_REV={};
  loadFromServer=function(){};
  window._saves=[];
  apiSave=function(rec){ window._saves.push(JSON.parse(JSON.stringify(rec))); var r=JSON.parse(JSON.stringify(rec)); r.rev=(Number(r.rev)||0)+1; return Promise.resolve({ ok:true, pedido:r }); };
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
  var ts=function(d){ return new Date(d+'T10:00:00-04:00').getTime(); }, n=0;
  var C1={ desc:'COLCHON TITANIO LATEX', medida:'140x190', cant:1, precio:3000, chk:'ok' };
  window._P=function(id, o){ n++; return Object.assign({ id:id, oc:'11-'+(600+n), cliente:'CLIENTE '+id.toUpperCase(), fecha:'2026-11-03', turno:'AM', vendedor:'Mirian Salazar',
    vehiculo:'', chofer:'', zona:'Zona '+id.toUpperCase(), direccion:'Calle '+n, observaciones:'', estado:'', productos:[Object.assign({}, C1)],
    saldo:0, pagado:true, entregado:false, maps:'', ts:ts('2026-11-02'), fotos:[], rev:1, nroDia:n }, o||{}); };
  window._armar=function(){
    n=0;
    STATE=[
      _P('e1',  { vehiculo:'Carry', chofer:'Omar', entregado:true, productos:[{ desc:'COLCHON TITANIO LATEX', medida:'140x190', cant:2, chk:'ok' }, { desc:'ALMOHADA', medida:'50x70', cant:2, chk:'ok' }] }),
      _P('e2',  { fecha:'2026-11-04', vehiculo:'Carry', chofer:'Ysrael', vendedor:'Isabel Robledo' }),                       // fecha pasada SIN ✅: salió
      _P('e3',  { fecha:'2026-11-05', vehiculo:'Foton nuevo', chofer:'Luis Pierre', vendedor:'Carola Chavez', entregado:true,
                  productos:[{ desc:'SOMIER ORO', medida:'140x190', cant:1, chk:'ok' }, Object.assign({}, C1)] }),
      _P('e4',  { fecha:'2026-11-02', vehiculo:'Foton nuevo', chofer:'Fernando', vendedor:'Carola Chavez', ts:ts('2026-10-30') }),   // vendido en octubre: Central
      _P('e5',  { fecha:'2026-11-06' }),                                                                                       // sin camión ni chofer
      _P('e6',  { fecha:'2026-11-06', vehiculo:'Foton encarpado', chofer:'Diego', vendedor:'Eduardo Añez', cliente:'MULTICENTER' }),
      _P('e7',  { fecha:'2026-11-07', vehiculo:'Foton encarpado', chofer:'Cristhian', vendedor:'ROHO' }),
      _P('e8',  { fecha:'2026-11-09', vehiculo:'Carry', chofer:'Omar', oc:'RPT 11-001', cliente:'Mia Plaza' }),
      _P('e9',  { fecha:'2026-11-10', vehiculo:'Foton insumo', chofer:'Miguel Melgar', oc:'ATC 11-001', vendedor:'Isabel Robledo' }),
      _P('e10', { fecha:'2026-11-10', vehiculo:'Foton nuevo', chofer:'', vendedor:'ALBA' }),                                    // interno, sin chofer
      _P('e11', { fecha:'2026-11-11', vehiculo:'Carry', chofer:'Omar', vendedor:'Pepe Nadie' }),                               // sin tienda
      _P('e12', { fecha:'2026-11-13', vehiculo:'Carry', chofer:'Omar', entregado:true }),                                       // HOY con ✅
      _P('e13', { fecha:'2026-11-18', vehiculo:'Foton insumo', chofer:'Miguel Melgar', entregado:true,
                  productos:[Object.assign({}, C1, { eF:'2026-11-12' })] }),                                                    // entregado ANTES, con su día real
      _P('x1',  { fecha:'2026-11-13', vehiculo:'Carry', chofer:'Omar' }),                                                       // hoy sin ✅
      _P('x2',  { fecha:'2026-11-20', vehiculo:'Carry', chofer:'Omar' }),                                                       // por venir sin ✅
      _P('x3',  { fecha:'2026-11-20', vehiculo:'Carry', chofer:'Omar', entregado:true }),                                       // por venir con ✅ sin eF: no salió
      _P('x4',  { fecha:'', direccion:DIR_TIENDA, zona:ZONA_TIENDA, ts:ts('2026-11-05') }),                                      // venta de tienda
      _P('x5',  { fecha:'2026-11-05', estado:BORRADOR_EST }),                                                                   // borrador de Kommo
      _P('x6',  { fecha:'2026-11-05', vehiculo:'', observaciones:'EL CLIENTE RECOGE DE FABRICA' }),                              // lo retira el cliente
      _P('x7',  { fecha:'', productos:[Object.assign({}, C1, { avisa:'2026-11-20' })] }),                                         // avisa cuándo
      _P('o1',  { fecha:'2026-10-20', vehiculo:'Carry', chofer:'Omar', ts:ts('2026-10-15') })                                   // octubre
    ];
    saveMirror();
  };
  window._abrir=function(){ EC.ym=''; EC.vista=''; abrirEntregasCamion(); };
  window._tabla=function(){
    var t=document.querySelector('#ec-body .ec-tabla table'); if(!t) return null;
    var cols=[].map.call(t.querySelectorAll('thead th'), function(th){ return th.textContent.trim(); });
    var filas=[].map.call(t.querySelectorAll('tbody tr, tfoot tr'), function(tr){
      return [].map.call(tr.children, function(td, i){ if(i===0) return td.innerText.replace(/\\s+/g,' ').trim(); var b=td.querySelector('.ec-c b'); return b ? Number(b.textContent) : 0; });
    });
    return { cols:cols, filas:filas };
  };
`;

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const nueva = async (w, h) => {
    const page = await browser.newPage({ viewport:{ width:w||1300, height:h||950 }, timezoneId:'America/La_Paz' });
    page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
    await page.route(/^https?:/, r=>r.abort());
    await page.clock.setFixedTime(new Date('2026-11-13T15:00:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    return page;
  };

  let page = await nueva();
  console.log('\n── 1. El botón y la ventana ──');
  let r = await page.evaluate((base) => {
    eval(base); try{ localStorage.removeItem('me_ec_vista'); }catch(e){}
    _armar(); mostrarBotonesTodos(); showView('admin'); renderAdmin();
    var b=document.getElementById('ec-btn'), g=b && b.closest('.at-g'), ov=document.getElementById('ec-overlay');
    var o={ boton:!!b && b.textContent.trim()==='🚚 Entregas por camión', grupo:g ? g.querySelector('h5').textContent.trim() : '', dd:b && b.getAttribute('data-d'),
      admOv:!!ov && ov.classList.contains('adm-ov'), cerrado:ov && ov.style.display==='none' };
    b.click();
    o.abierto=ov.style.display==='flex'; o.mes=document.getElementById('ec-mes-txt').textContent; o.ym=EC.ym; o.vista=EC.vista;
    o.sig=document.getElementById('ec-sig').disabled; o.info=document.getElementById('ec-info').textContent;
    o.on=(document.querySelector('#ec-vista button.on')||{}).textContent;
    o.saves=window._saves.length;
    return o;
  }, BASE);
  if (r.__error) console.log('ERROR', r.__error);
  chk('1a el botón «🚚 Entregas por camión» está en Herramientas → «Entregas del día», con su explicación', r.boton && /Entregas del día/.test(r.grupo) && !!r.dd, r);
  chk('1b la ventana es de pantalla completa con el estilo de Administración (adm-ov) y abre en noviembre de 2026, «Por camión»',
      r.admOv && r.cerrado && r.abierto && r.ym==='2026-11' && /noviembre de 2026/.test(r.mes) && r.vista==='camion' && /Por camión/.test(r.on), r);
  chk('1c no se puede pasar al mes que viene; dice «hasta hoy, 13/11»; mirar no guarda nada', r.sig===true && /hasta hoy, 13\/11/.test(r.info) && r.saves===0, r);

  console.log('\n── 2-3. Por camión y por tienda; qué cuenta ──');
  r = await page.evaluate(() => {
    var T=_tabla(), D=EC.D;
    var fila=function(nom){ return (T.filas.filter(function(f){ return f[0].indexOf(nom)===0; })[0])||null; };
    var ci=function(c){ return T.cols.indexOf(c); };
    var sumaFilas=T.filas.slice(0,-1).reduce(function(a,f){ return a+f[f.length-1]; }, 0);
    var tot=T.filas[T.filas.length-1], sumaCols=tot.slice(1,-1).reduce(function(a,x){ return a+x; }, 0);
    var ids=Object.keys(D.byId).sort();
    return { cols:T.cols, carry:fila('Carry'), nuevo:fila('Foton nuevo'), encarpado:fila('Foton encarpado'), insumo:fila('Foton insumo'), sin:fila('Sin camión anotado'),
      tot:tot, sumaFilas:sumaFilas, sumaCols:sumaCols, nombres:T.filas.map(function(f){ return f[0].replace(/✏️.*$/,'').trim(); }),
      ci:{ mia:ci('Mia Plaza'), cen:ci('Central'), tb:ci('Tienda Banzer'), sin:ci('Sin tienda'), may:ci('Mayoristas (Eduardo)'), roho:ci('ROHO'), rpt:ci('Reposición a tiendas (RPT)'), atc:ci('ATC'), int:ci('Internos') },
      ids:ids, ret:D.ret.map(function(e){ return e.id; }), retTxt:((document.querySelector('#ec-body .ec-ret')||{}).innerText||'').replace(/\s+/g,' '),
      anotar:!!document.querySelector('#ec-body .ec-anotar'), res:(document.querySelector('#ec-body .ec-res')||{}).innerText||'' };
  });
  if (r.__error) console.log('ERROR', r.__error);
  chk('2a las columnas: las tiendas en orden (Mia Plaza, Central, Tienda Banzer), Sin tienda, Mayoristas, ROHO, RPT, ATC, Internos y TOTAL',
      JSON.stringify(r.cols)===JSON.stringify(['Camión','Mia Plaza','Central','Tienda Banzer','Sin tienda','Mayoristas (Eduardo)','ROHO','Reposición a tiendas (RPT)','ATC','Internos','TOTAL']), r.cols);
  chk('2b las filas: los cuatro camiones de la lista, «Sin camión anotado» y TOTAL', r.nombres.join('|')==='Carry|Foton nuevo|Foton encarpado|Foton insumo|Sin camión anotado|TOTAL', r.nombres);
  chk('2c Carry: 5 (Mia Plaza 2 —una de hoy con ✅—, Central 1, Sin tienda 1, RPT 1)', r.carry && r.carry[r.ci.mia]===2 && r.carry[r.ci.cen]===1 && r.carry[r.ci.sin]===1 && r.carry[r.ci.rpt]===1 && r.carry[11-1]===5, r.carry);
  chk('2d Foton nuevo: 3 (Tienda Banzer 1 de Carola en noviembre, Central 1 de Carola vendido en OCTUBRE, Internos 1)', r.nuevo && r.nuevo[r.ci.tb]===1 && r.nuevo[r.ci.cen]===1 && r.nuevo[r.ci.int]===1 && r.nuevo[10]===3, r.nuevo);
  chk('2e Foton encarpado: Mayoristas 1 + ROHO 1 = 2; Foton insumo: ATC 1 + Mia Plaza 1 (el entregado antes de su día) = 2',
      r.encarpado && r.encarpado[r.ci.may]===1 && r.encarpado[r.ci.roho]===1 && r.encarpado[10]===2 && r.insumo && r.insumo[r.ci.atc]===1 && r.insumo[r.ci.mia]===1 && r.insumo[10]===2, [r.encarpado, r.insumo]);
  chk('2f «Sin camión anotado»: 1 (Mia Plaza), con su botón «✏️ Anotar el camión»', r.sin && r.sin[r.ci.mia]===1 && r.sin[10]===1 && r.anotar, r.sin);
  chk('2g los totales cierran: suma de filas = suma de columnas = TOTAL = 13', r.sumaFilas===13 && r.sumaCols===13 && r.tot[10]===13, [r.sumaFilas, r.sumaCols, r.tot]);
  chk('3a cuentan: fecha pasada con y sin ✅, hoy con ✅, lo entregado antes de su día (con eF); NO: hoy sin ✅, por venir sin ✅ o con ✅ sin eF, venta de tienda, borrador, avisa cuándo, octubre',
      r.ids.join(',')==='e1,e10,e11,e12,e13,e2,e3,e4,e5,e6,e7,e8,e9,x6', r.ids);
  chk('3b lo que retira el cliente no está en la tabla: va en una línea aparte «1 los retiró el cliente»', r.ret.join(',')==='x6' && /1 los retiró el cliente/.test(r.retTxt) && /1 los retiró el cliente/.test(r.res), [r.ret, r.retTxt]);

  console.log('\n── 4-5. Por chofer y las unidades ──');
  r = await page.evaluate(() => {
    var u1=((document.querySelector('#ec-body tbody tr .ec-c small'))||{}).textContent||'';
    var D=EC.D, uTot=D.tot.u, uSum=D.ents.reduce(function(a,e){ return a+pryUnidadesDe(e.p).u; }, 0);
    var totU=(document.querySelector('#ec-body tfoot .ec-tt .ec-c small')||{}).textContent||'';
    ecVista('chofer');
    var T=_tabla();
    var guardada=null; try{ guardada=localStorage.getItem('me_ec_vista'); }catch(e){}
    ecCerrar(); EC.vista=''; abrirEntregasCamion();
    var reabre=EC.vista, T2=_tabla();
    return { u1:u1, uTot:uTot, uSum:uSum, totU:totU, nombres:T.filas.map(function(f){ return f[0].replace(/✏️.*$/,'').trim()+'='+f[f.length-1]; }), col0:T.cols[0], guardada:guardada, reabre:reabre, col0b:T2 && T2.cols[0] };
  });
  if (r.__error) console.log('ERROR', r.__error);
  chk('4a por chofer: Omar 4, Ysrael 1, Fernando 1, Luis Pierre 1, Cristhian 1, Diego 1, Miguel Melgar 2, «Sin chofer anotado» 2, TOTAL 13',
      r.col0==='Chofer' && r.nombres.join('|')==='Omar=4|Ysrael=1|Fernando=1|Luis Pierre=1|Cristhian=1|Diego=1|Miguel Melgar=2|Sin chofer anotado=2|TOTAL=13', r.nombres);
  chk('4b la vista se recuerda en el aparato (me_ec_vista) y vuelve al reabrir', r.guardada==='chofer' && r.reabre==='chofer' && r.col0b==='Chofer', r);
  chk('5 las unidades en chico debajo de cada número (colchones y somieres: sin almohadas): total 15 u.', /^\d+ u\.$/.test(r.u1) && r.uTot===15 && r.uSum===15 && r.totU==='15 u.', r);

  console.log('\n── 6. Tocar una celda ──');
  r = await page.evaluate(async () => {
    ecVista('camion');
    var T=_tabla(), ci=T.cols.indexOf('Mia Plaza');
    var tr=document.querySelectorAll('#ec-body tbody tr')[0];   // Carry
    tr.children[ci].querySelector('.ec-c').click();
    var det=document.getElementById('ec-det'), txt=det.innerText.replace(/\s+/g,' ');
    var fs=[].map.call(det.querySelectorAll('.ec-det-f'), function(b){ return b.getAttribute('data-id'); });
    det.querySelector('.ec-det-f').click();
    await new Promise(function(x){ setTimeout(x, 60); });
    var m=document.getElementById('modal'), mt=m && m.classList.contains('on') ? document.getElementById('modal-box').innerText : '';
    closeModal();
    return { fs:fs, txt:txt, ficha:/CLIENTE E1/.test(mt), sigue:document.getElementById('ec-overlay').style.display==='flex' };
  });
  if (r.__error) console.log('ERROR', r.__error);
  chk('6a Carry · Mia Plaza lista sus 2 entregas (e1 del 03/11 y e12 de hoy) con N°, día, cliente, vendedora y zona',
      r.fs.join(',')==='e1,e12' && /Carry · Mia Plaza/.test(r.txt) && /N° 1 · 03\/11 · CLIENTE E1/.test(r.txt) && /Mirian Salazar/.test(r.txt) && /Zona E1/.test(r.txt), r);
  chk('6b cada una abre su ficha (y la ventana sigue abierta detrás)', r.ficha && r.sigue, r);

  console.log('\n── 7. Cambio de mes ──');
  r = await page.evaluate(() => {
    ecMes(-1);
    var T=_tabla(), o={ ym:EC.ym, mes:document.getElementById('ec-mes-txt').textContent, sig:document.getElementById('ec-sig').disabled, info:document.getElementById('ec-info').textContent,
      tot:T && T.filas[T.filas.length-1][T.cols.length-1], carry:T && T.filas[0][T.cols.length-1] };
    ecMes(1); o.vuelta=EC.ym; ecMes(1); o.noPasa=EC.ym;
    return o;
  });
  if (r.__error) console.log('ERROR', r.__error);
  chk('7a ‹ lleva a octubre: 1 entrega (Carry), «mes terminado» y › se prende', r.ym==='2026-10' && /octubre de 2026/.test(r.mes) && r.sig===false && r.tot===1 && r.carry===1 && /terminado/.test(r.info), r);
  chk('7b › vuelve a noviembre y no pasa de ahí', r.vuelta==='2026-11' && r.noPasa==='2026-11', r);

  console.log('\n── 8. Anotar el camión que faltó ──');
  r = await page.evaluate(async () => {
    document.querySelector('#ec-body .ec-anotar').click();
    await new Promise(function(x){ setTimeout(x, 40); });
    var box=document.getElementById('modal-box'), fs=[].map.call(box.querySelectorAll('.cam-an-f'), function(f){ return f.getAttribute('data-id'); });
    var s=box.querySelector('.cam-an-cam[data-id="e5"]'); s.value='Foton encarpado'; s.dispatchEvent(new Event('change', { bubbles:true }));
    var s0=window._saves.length;
    await camAnotarGuardar();
    await new Promise(function(x){ setTimeout(x, 60); });
    var T=_tabla(), p=findById('e5');
    return { fs:fs, e5:p.vehiculo+'·'+p.chofer, saves:window._saves.slice(s0).map(function(x){ return x.id; }), nombres:T.filas.map(function(f){ return f[0].replace(/✏️.*$/,'').trim()+'='+f[f.length-1]; }),
      modal:document.getElementById('modal').classList.contains('on') };
  });
  if (r.__error) console.log('ERROR', r.__error);
  chk('8a «✏️ Anotar el camión» lista el que no tiene (e5)', r.fs.join(',')==='e5', r.fs);
  {
    const r2 = await page.evaluate(async () => {
      ecVista('chofer');
      document.querySelector('#ec-body .ec-anotar').click();
      await new Promise(function(x){ setTimeout(x, 40); });
      var box=document.getElementById('modal-box'), tit=box.querySelector('.modal-h').innerText;
      var fs=[].map.call(box.querySelectorAll('.cam-an-f'), function(f){ return f.getAttribute('data-id'); });
      var sinSelCam=!box.querySelector('.cam-an-cam[data-id="e10"]');
      var s=box.querySelector('.cam-an-ch[data-id="e10"]'); s.value='Fernando'; s.dispatchEvent(new Event('change', { bubbles:true }));
      var s0=window._saves.length;
      await camAnotarGuardar();
      await new Promise(function(x){ setTimeout(x, 60); });
      var p=findById('e10'), T=_tabla();
      ecVista('camion');
      return { tit:tit, fs:fs, sinSelCam:sinSelCam, e10:p.vehiculo+'·'+p.chofer, saves:window._saves.slice(s0).map(function(x){ return x.id; }),
        nombres:T.filas.map(function(f){ return f[0].replace(/✏️.*$/,'').trim()+'='+f[f.length-1]; }) };
    });
    if (r2.__error) console.log('ERROR', r2.__error);
    chk('8c por chofer, «✏️ Anotar el chofer» lista e10 (con camión y sin chofer): «¿Quién manejó?», sin tocar el camión; guarda Fernando y la fila se va',
        /¿Quién manejó\?/.test(r2.tit) && r2.fs.join(',')==='e10' && r2.sinSelCam && r2.e10==='Foton nuevo·Fernando' && r2.saves.join(',')==='e10' &&
        r2.nombres.join('|')==='Omar=4|Ysrael=1|Fernando=2|Luis Pierre=1|Cristhian=1|Diego=2|Miguel Melgar=2|TOTAL=13', r2);
  }
  chk('8b guarda Foton encarpado · Diego (el chofer de ese camión ESE día), un guardado durable, y la tabla se rehace sin la fila «Sin camión»',
      r.e5==='Foton encarpado·Diego' && r.saves.join(',')==='e5' && !r.modal && r.nombres.join('|')==='Carry=5|Foton nuevo=3|Foton encarpado=3|Foton insumo=2|TOTAL=13', r);

  console.log('\n── 9. Copiar y Excel ──');
  r = await page.evaluate(() => {
    var copiado=''; var _ct=copyText; copyText=function(t){ copiado=t; };
    ecCopiar(); copyText=_ct;
    var hojas=null, nombre='', real=buildXlsx, bytes=0;
    buildXlsx=function(sh){ hojas=JSON.parse(JSON.stringify(sh)); var b=real(sh); bytes=b.length; return b; };
    var _db=downloadBlob; downloadBlob=function(b, n){ nombre=n; };
    ecBajar(); buildXlsx=real; downloadBlob=_db;
    var h1=hojas && hojas[0], fila=function(h, nom){ return (h.matrix.filter(function(r){ var c=r[0]; return (c && typeof c==='object' ? c.v : c)===nom; })[0])||null; };
    var carry=h1 && fila(h1, 'Carry'), tot=h1 && fila(h1, 'TOTAL');
    var det=hojas && hojas[2];
    return { copiado:copiado, nombres:(hojas||[]).map(function(h){ return h.name; }), nombre:nombre, bytes:bytes,
      carry:carry, carryNum:!!carry && carry.slice(1).every(function(c){ return c && c.t==='n' && typeof c.v==='number'; }), tot:tot && tot[tot.length-1],
      detN:det ? det.matrix.length-1 : 0, detUnid:det && det.matrix[1] && det.matrix[1][9] };
  });
  if (r.__error) console.log('ERROR', r.__error);
  chk('9a «📋 Copiar» trae las dos tablas, las tiendas y el total', /Entregas de noviembre de 2026/.test(r.copiado) && /\*Por camión\*/.test(r.copiado) && /\*Por chofer\*/.test(r.copiado) &&
      /• Carry: \*5\* \(6 u\.\)/.test(r.copiado) && /\*Por tienda\*/.test(r.copiado) && /Total: 13 entregas · 15 u\./.test(r.copiado) && /1 los retiró el cliente/.test(r.copiado), r.copiado);
  chk('9b «⬇️ Excel»: hojas «Por camión», «Por chofer» y «Entregas», archivo del mes, armado de verdad', r.nombres.join('|')==='Por camión|Por chofer|Entregas' && r.nombre==='entregas-por-camion-2026-11.xlsx' && r.bytes>500, r);
  chk('9c los números van como número (Carry y el TOTAL = 13) y el detalle tiene las 13 entregas + 1 que retiró el cliente',
      r.carryNum && r.tot && r.tot.v===13 && r.tot.t==='n' && r.detN===14 && r.detUnid && r.detUnid.t==='n', r);
  await page.close();

  console.log('\n── 10. En 390 px ──');
  page = await nueva(390, 844);
  r = await page.evaluate((base) => {
    eval(base); _armar(); _abrir();
    var b=document.getElementById('ec-body'), tb=document.querySelector('#ec-body .ec-tabla');
    return { doc:document.documentElement.scrollWidth, vw:innerWidth, body:b.scrollWidth, bodyW:b.clientWidth, tabla:tb && tb.scrollWidth>tb.clientWidth,
      ov:document.getElementById('ec-overlay').scrollWidth, ovW:document.getElementById('ec-overlay').clientWidth };
  }, BASE);
  if (r.__error) console.log('ERROR', r.__error);
  chk('10 en 390 px no hay scroll de costado (ni la página, ni la ventana, ni su cuerpo); la tabla se desliza adentro de su caja',
      r.doc<=r.vw && r.body<=r.bodyW && r.ov<=r.ovW && r.tabla, r);
  await page.close();

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e => { console.error(e); process.exit(1); });
