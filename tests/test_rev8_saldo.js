/* 🔎 REVISIÓN DEL AVISO DE SALDO (§4gj) EN EL USO DE TODOS LOS DÍAS (rev8, 27/09).

   El dueño, cansado de que aparezcan errores, pidió revisar Pedidos y el cuadrito del saldo debajo de cada producto.
   Y preguntó: *«¿Y qué pasa cuando es MEDIDA ESPECIAL?»*.

   ⚠️ LO QUE ESTA PRUEBA CUIDA (cada uno falla contra lo publicado, `fecb3c6`):
   1. 📐 MEDIDA ESPECIAL («Otros» + «150x200»): se fabrica a pedido y NUNCA sale del stock. Con el código del catálogo que
      deja la lista (CH1201 = TITANIO ICE 160x190) el cuadrito decía «✅ DISPONIBLE · En almacén 4» — el stock del 160x190;
      sin código, gris «revisá el nombre y la medida». Ahora: azul «📐 MEDIDA ESPECIAL · se fabrica a pedido: decile al
      cliente que espere ~X días» (fábrica de ESE modelo + el día de entrega, con cupo), sin números de almacén, la línea
      roja si la fecha es antes, y en la pregunta al guardar «medida especial: se fabrica a pedido, ~X días».
      Y NO es especial una medida estándar escrita distinto («160X190CM», «160 x 190», «2 plazas», «1,60 x 1,90») ni un
      producto del catálogo que se vende en esa medida (la cuna 65x100).
   2. 🏷️ EL CÓDIGO DE OTRA MEDIDA: se elige TITANIO ICE 160x190 de la lista (llena CH1201) y se cambia la medida a
      140x190. El stock va por el código: el cuadrito decía «✅ DISPONIBLE» con los 4 del 160x190, y del 140x190 no hay
      ninguno. Ahora dice que el código es de otra medida y cuál es el bueno (CH1220); al guardar, pregunta.
   3. 🏭 EDITANDO una línea que logística ya mandó a fabricar PARA ESE pedido: decía «🏭 NO HAY · hay que mandar a producir
      (avisá a logística)» — la vendedora podía pedirlo dos veces. Ahora: «🏭 SE FABRICA PARA ESTE PEDIDO en Moreno (pedido
      el 22/09, llega ~25/09)», y la línea roja cuenta desde esa llegada.
   4. Una ATC que al editarla pasa a 📄 OC: sus productos ahora salen del stock, y al guardar no se preguntaba nada.
   5. En una RPT la pregunta dice «¿Le avisaste a la sucursal…?» (no «al cliente»).
   Y las decisiones del dueño del 27/09 (cada una falla contra `89512b1`, la versión de arriba sin ellas):
   6. 📐 «Borrarlo solo»: el código de la medida estándar en un renglón de medida especial se borra al salir del campo
      «Otros» (y al guardar, por si fue con Enter). Un pedido YA guardado así no se toca: lo de logística lo sigue por
      `prodClave` (`heredarMarcas`) — ahí el cuadrito sigue diciendo «borralo».
   7. 🏭 va antes que 📐: la medida especial que logística ya mandó a fabricar PARA ese pedido dice cuándo llega.
   8. ⏱️ 🔄 Actualizar: como mucho una lectura cada 15 s (con la última lectura fallida, lee igual).
   9. 🔵 El filtro «Especiales» (y el celeste de la fila) no marca «160X190CM» ni «1,60 x 1,90».

   Datos SINTÉTICOS (el repo es público). Reloj clavado en el miércoles 23/09/2026, 15:00 de Bolivia.
   Se corre:  node tests/test_rev8_saldo.js   (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/a/pedidos_fecb3c6.html node tests/test_rev8_saldo.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const RELOJ = '2026-09-23T15:00:00-04:00';          // miércoles, 15:00 de Bolivia
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };

/* ── Lo que corre ANTES que la prueba: la «planilla» es `_SRV` (como en test_saldo_almacen.js) ── */
function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=false;
  try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  try{ cargaBanner(); }catch(e){}
  window._SRV={ pedidos:[], stock:null };
  window._lecturas=0; window._saves=[];
  apiList=function(){
    window._lecturas++;
    var l=JSON.parse(JSON.stringify(window._SRV.pedidos));
    if(window._SRV.stock) l.push({ id:'__stock__', fecha:'', cliente:'📦 STOCK', observaciones:JSON.stringify(window._SRV.stock) });
    return Promise.resolve({ ok:true, pedidos:l });
  };
  apiSave=function(rec){
    var r=JSON.parse(JSON.stringify(rec)); window._saves.push(r);
    if(!/^__/.test(String(r.id))){ var i=window._SRV.pedidos.findIndex(function(p){ return p.id===r.id; }); if(i>=0) window._SRV.pedidos[i]=r; else window._SRV.pedidos.push(r); }
    return Promise.resolve({ ok:true, pedido:r });
  };
  downloadBlob=function(){};
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  window.LOG='PRODUCTOS TERMINADOS FAB.'; window.BAN='01-05-025  Almacen Distribucion Banzer'; window.IMN='IM - PRODUCTOTERMINADO';
  window._d=function(n){ return stockSumarDias(todayStr(), n); };
  /* Productos inventados, con códigos del catálogo. */
  window.PR={
    TIT:{ desc:'TITANIO ICE', medida:'160x190', codigo:'CH1201' },
    T140:{ desc:'TITANIO ICE', medida:'140x190', codigo:'CH1220' },
    ORO:{ desc:'ORO BI RELAX', medida:'180x190', codigo:'CH1775' },
    PIL:{ desc:'PILLOW PEDIC', medida:'140x190', codigo:'CH1682' }
  };
  window.K={}; Object.keys(PR).forEach(function(n){ K[n]=stockClave(PR[n]); });
  window._P=function(o){ return Object.assign({ id:'p'+Math.random().toString(36).slice(2,8), fecha:_d(1), oc:'09-900', vendedor:'Maria Flores',
    cliente:'CLIENTE', celular:'70000000', turno:'AM', zona:'Norte', direccion:'Calle 1', maps:'', pagado:false, saldo:1000, ts:Date.now()-86400000,
    metodoPago:'', observaciones:'', estado:'', entregado:false, vehiculo:'', chofer:'', garantia:'', nota:'1500', acuenta:0, facturarA:'', nit:'',
    nroDia:1, verificado:false, fotos:[] }, o); };
  window._linea=function(n, cant, x){ return Object.assign({}, PR[n], { cant:cant }, x||{}); };
  window._stock=function(op){
    op=op||{};
    var st={ c:{ f:todayStr(), hora:'08:30:00', u:{}, solo0:true, alm:LOG, t:Date.now()-6*3600000 }, e:[], p:op.p||[], a:{}, g:{}, al:{}, h:[] };
    st.g[IMN]={ f:todayStr(), hora:'08:00:00', u:{}, solo0:true, cod:{}, t:Date.now()-7*3600000, rs:{} };
    st.al[LOG]='log'; st.al[IMN]='otro';
    Object.keys(op.aca||{}).forEach(function(n){ st.c.u[K[n]]=op.aca[n]; });
    Object.keys(op.im||{}).forEach(function(n){ st.g[IMN].u[K[n]]=op.im[n]; });
    return st;
  };
  window._escenario=async function(stock, pedidos){
    window._SRV.stock=stock; window._SRV.pedidos=JSON.parse(JSON.stringify(pedidos||[]));
    STOCK_CARGADO=false;
    await refrescarEstado();
    ULTIMO_ERROR=''; CARGA_ESTADO='ok';
  };
  window._nuevo=function(){ if(document.getElementById('modal').classList.contains('on')) closeModal(); showView('form'); resetForm(); };
  var ev=function(e,t){ e.dispatchEvent(new Event(t||'input', { bubbles:true })); };
  /* Llena el renglón i como la vendedora: código (autollena), nombre, medida de la lista u «Otros» + lo escrito, cantidad. */
  window._renglon=function(i, o){
    var cards=document.querySelectorAll('#f-productos .prod-card');
    while(cards.length<=i){ addProdRow(); cards=document.querySelectorAll('#f-productos .prod-card'); }
    var c=cards[i];
    if(o.codigo!=null){ var e=c.querySelector('.prod-codigo'); e.value=o.codigo; ev(e); }
    if(o.desc!=null){ var d=c.querySelector('.prod-desc'); d.value=o.desc; ev(d); ev(d,'change'); }
    if(o.medida!=null){ var m=c.querySelector('.prod-medida'); m.value=o.medida; ev(m,'change'); }
    if(o.otra!=null){ var m2=c.querySelector('.prod-medida'); m2.value='Otros'; ev(m2,'change'); var ot=c.querySelector('.prod-medida-otro'); ot.value=o.otra; ev(ot); }
    if(o.cant!=null){ var q=c.querySelector('.prod-cant'); q.value=String(o.cant); ev(q); }
  };
  window._caja=function(i){
    var c=document.querySelectorAll('#f-productos .prod-card')[i], b=c && c.querySelector('.prod-saldo');
    if(!b) return { existe:false, hidden:true, cls:'', txt:'' };
    return { existe:true, hidden:!!b.hidden, cls:b.className, txt:b.innerText.replace(/\s+/g,' ').trim(), cod:(c.querySelector('.prod-codigo')||{}).value };
  };
  window._llenarDatos=function(cli){
    document.getElementById('f-vendedor').value='Maria Flores';
    document.getElementById('f-cliente').value=cli||'CLIENTE NUEVO';
    document.getElementById('f-celular').value='70011122';
    document.getElementById('f-nota').value=String(2000+Math.floor(Math.random()*999));
    document.getElementById('f-zona').value='Norte';
    document.getElementById('f-saldo').value='1000';
  };
  window._fecha=function(iso){ var f=document.getElementById('f-fecha'); f.value=iso; ev(f,'change'); };
  window._guardar=async function(){ document.getElementById('f-submit').click(); for(var i=0;i<40;i++){ await _esperar(50); var b=document.getElementById('f-submit'); if(b && !b.disabled) break; } await _esperar(200); };
  window._enServidor=function(cli){ return window._SRV.pedidos.filter(function(p){ return p.cliente===cli; }).length; };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1100, height:1000 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  page.__dialogos=[]; page.__respuestas=[];
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => { page.__dialogos.push(d.message()); const si = page.__respuestas.length ? page.__respuestas.shift() : true; if(si) d.accept(); else d.dismiss(); });
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date(RELOJ));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  await page.evaluate(PREPARAR);
  /* Contra un panel viejo algunas cosas no existen: cada bloque vuelve con `__error` en vez de cortar la prueba. */
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  const reset = () => { page.__dialogos.length=0; page.__respuestas.length=0; };

  chk('el reloj de la página está clavado en el miércoles 23/09/2026 (mañana = jueves 24)', await page.evaluate(() => todayStr()==='2026-09-23' && proximoDiaEntrega()==='2026-09-24'));

  // ═══ 1. 📐 MEDIDA ESPECIAL ═══════════════════════════════════════════════════════════════════
  console.log('\n── 1. 📐 Medida especial: se fabrica a pedido, nunca sale del stock ──');
  let r = await ev(async () => {
    var out={};
    await _escenario(_stock({ aca:{ TIT:4 } }), []);
    // La vendedora elige TITANIO ICE de la lista (queda CH1201) y pone «Otros» → 150x200
    _nuevo(); _renglon(0, { codigo:'CH1201', otra:'150x200', cant:1 }); await _esperar(500); out.conCod=_caja(0);
    _nuevo(); _renglon(0, { desc:'TITANIO ICE', otra:'150x200', cant:1 }); await _esperar(500); out.sinCod=_caja(0);
    _fecha('2026-09-30'); await _esperar(450); out.fechaBien=_caja(0);
    return out;
  });
  chk('📐 TITANIO ICE · Otros «150x200» · CH1201 (el código de la estándar): NO dice «✅ DISPONIBLE» con el stock del 160x190',
      r.conCod && !r.conCod.hidden && !/DISPONIBLE/.test(r.conCod.txt) && !/En almacén/.test(r.conCod.txt), r.conCod && [r.conCod.cls, r.conCod.txt, r.__error]);
  chk('…dice, en AZUL, «📐 MEDIDA ESPECIAL · se fabrica a pedido: decile al cliente que espere ~5 días» (3 de fábrica + el día de entrega: el domingo no, el lunes 28)',
      r.conCod && /ps-azul/.test(r.conCod.cls) && /📐 MEDIDA ESPECIAL · se fabrica a pedido: decile al cliente que espere ~5 días/.test(r.conCod.txt), r.conCod && [r.conCod.cls, r.conCod.txt]);
  chk('…sin números de almacén ni «libres»', r.conCod && !/Libres|Faltan|Pendientes de entrega|Saldo al corte/.test(r.conCod.txt), r.conCod && r.conCod.txt);
  chk('…y avisa que ese código es del 160x190 y hay que borrarlo (el almacén sacaría ese colchón)',
      r.conCod && /El código CH1201 es del TITANIO ICE 160x190: borralo de este renglón/.test(r.conCod.txt), r.conCod && r.conCod.txt);
  chk('…con la entrega para mañana (jueves 24), la línea roja: «Para el jueves 24/09 no llega: programá desde el lunes 28/09»',
      r.conCod && /Para el jueves 24\/09 no llega: programá desde el lunes 28\/09/.test(r.conCod.txt), r.conCod && r.conCod.txt);
  chk('📐 sin código (TITANIO ICE · Otros «150x200»): también azul «MEDIDA ESPECIAL», no el gris «revisá el nombre y la medida»',
      r.sinCod && /ps-azul/.test(r.sinCod.cls) && /MEDIDA ESPECIAL/.test(r.sinCod.txt) && !/No encuentro este producto/.test(r.sinCod.txt), r.sinCod && [r.sinCod.cls, r.sinCod.txt]);
  chk('…con una fecha posible (miércoles 30) la línea roja se va', r.fechaBien && /MEDIDA ESPECIAL/.test(r.fechaBien.txt) && !/no llega/.test(r.fechaBien.txt), r.fechaBien && r.fechaBien.txt);

  r = await ev(async () => {
    var out={};
    /* Lo que tarda la fábrica de ESE modelo: TITANIO ICE se hizo por última vez en MORENO, que tardó 6 días; el PILLOW
       en Multiespumas tardó 2. La mediana general (4) no es la del modelo. */
    var p=[ { id:'pa', k:K.TIT, u:3, total:3, tipo:'fabrica', fab:'MORENO', f:_d(-12), r:_d(-6) },
            { id:'pb', k:K.PIL, u:2, total:2, tipo:'fabrica', fab:'MULTI',  f:_d(-5),  r:_d(-3) } ];
    await _escenario(_stock({ aca:{ TIT:4 }, p:p }), []);
    _nuevo(); _renglon(0, { desc:'TITANIO ICE', otra:'150x200', cant:1 }); await _esperar(500); out.tit=_caja(0);
    return out;
  });
  chk('📐 los «~X días» son los de ESE modelo: TITANIO ICE sale de Moreno, que tardó 6 días → «~7 días» (el miércoles 30)',
      r.tit && /MEDIDA ESPECIAL · se fabrica a pedido: decile al cliente que espere ~7 días/.test(r.tit.txt) && /programá desde el miércoles 30\/09/.test(r.tit.txt), r.tit && [r.tit.txt, r.__error]);

  r = await ev(async () => {
    var out={};
    await _escenario(_stock({ aca:{ TIT:4 } }), []);
    var otra=async function(o){ _nuevo(); _renglon(0, o); await _esperar(500); return _caja(0); };
    out.cm=await otra({ codigo:'CH1201', otra:'160X190CM', cant:1 });
    out.esp=await otra({ codigo:'CH1201', otra:'160 x 190', cant:1 });
    out.plz=await otra({ codigo:'CH1201', otra:'2,5 plazas', cant:1 });
    out.met=await otra({ codigo:'CH1201', otra:'1,60 x 1,90', cant:1 });
    out.cuna=await otra({ codigo:'COLT0081', cant:1 });            // COLCHON CUNA 65x100: del catálogo, en su medida
    out.pino=await otra({ desc:'SOMIER ARTESANAL DE PINO', otra:'150x190', cant:1 });   // nadie lo conoce, y en medida especial
    out.bir=await otra({ codigo:'CH2172', otra:'160x200', cant:1 });                      // SOMIER BiRELAX «ESPECIAL»: su código es PARA medida especial
    return out;
  });
  const estandar = (c) => c && /ps-verde/.test(c.cls) && /DISPONIBLE/.test(c.txt) && /En almacén 4/.test(c.txt) && !/ESPECIAL|CÓDIGO/.test(c.txt);
  chk('(control) una medida ESTÁNDAR escrita distinto NO es especial: «160X190CM» con CH1201 → ✅ con los 4 del 160x190', estandar(r.cm), r.cm && [r.cm.cls, r.cm.txt, r.__error]);
  chk('(control) …«160 x 190» tampoco', estandar(r.esp), r.esp && r.esp.txt);
  chk('(control) …ni «2,5 plazas» (= 160x190)', estandar(r.plz), r.plz && r.plz.txt);
  chk('(control) …ni «1,60 x 1,90» (en metros)', estandar(r.met), r.met && r.met.txt);
  chk('(control) un producto del catálogo que se vende en ESA medida (COLCHON CUNA 65x100) no es «medida especial»',
      r.cuna && !r.cuna.hidden && !/ESPECIAL/.test(r.cuna.txt) && /NO HAY|DISPONIBLE|MORENO|PRODUCCIÓN/.test(r.cuna.txt), r.cuna && [r.cuna.cls, r.cuna.txt]);
  chk('📐 un producto que nadie conoce EN MEDIDA ESPECIAL («SOMIER ARTESANAL DE PINO» · 150x190) también se fabrica a pedido (antes: gris «Sin saldo cargado»)',
      r.pino && /ps-azul/.test(r.pino.cls) && /MEDIDA ESPECIAL · se fabrica a pedido/.test(r.pino.txt), r.pino && [r.pino.cls, r.pino.txt]);
  chk('📐 el código del catálogo PARA medida especial (CH2172, SOMIER BiRELAX «ESPECIAL») con 160x200: especial, y sin «borralo»',
      r.bir && /ps-azul/.test(r.bir.cls) && /MEDIDA ESPECIAL/.test(r.bir.txt) && !/borralo/.test(r.bir.txt), r.bir && [r.bir.cls, r.bir.txt]);

  reset();
  r = await ev(async () => {
    var out={};
    await _escenario(_stock({ aca:{ TIT:4 } }), []);
    _nuevo(); _llenarDatos('CLIENTE ESPECIAL'); _renglon(0, { codigo:'CH1201', otra:'150x200', cant:1 }); _fecha('2026-09-30'); await _esperar(500);
    await _guardar();
    out.guardados=_enServidor('CLIENTE ESPECIAL'); out.sigue=document.getElementById('f-cliente').value;
    return out;
  });
  chk('📐 al guardar pregunta, y la pregunta dice «TITANIO ICE 150x200: medida especial: se fabrica a pedido, ~5 días»',
      page.__dialogos.length===1 && /TITANIO ICE 150x200: medida especial: se fabrica a pedido, ~5 días/.test(page.__dialogos[0]), [page.__dialogos, r.__error]);
  chk('…y como se aceptó, se guardó igual (se avisa, no se frena la venta)', r.guardados===1, r);
  reset(); page.__respuestas.push(false);
  r = await ev(async () => {
    var out={};
    _nuevo(); _llenarDatos('CLIENTE ESPECIAL 2'); _renglon(0, { desc:'TITANIO ICE', otra:'150x200', cant:1 }); _fecha('2026-09-30'); await _esperar(500);
    await _guardar();
    out.guardados=_enServidor('CLIENTE ESPECIAL 2'); out.sigue=document.getElementById('f-cliente').value;
    return out;
  });
  chk('📐 …y «Cancelar» NO guarda y deja el pedido escrito', page.__dialogos.length===1 && r.guardados===0 && r.sigue==='CLIENTE ESPECIAL 2', [r, page.__dialogos.length]);

  // ═══ 2. 🏷️ EL CÓDIGO DE OTRA MEDIDA ══════════════════════════════════════════════════════════
  console.log('\n── 2. 🏷️ El código de otra medida (u otro producto) no da el saldo de otro colchón ──');
  r = await ev(async () => {
    var out={};
    await _escenario(_stock({ aca:{ TIT:4 } }), []);                // del 160x190 hay 4; del 140x190, ninguno
    _nuevo(); _renglon(0, { codigo:'CH1201', cant:1 }); await _esperar(500); out.antes=_caja(0);
    _renglon(0, { medida:'140x190' }); await _esperar(500); out.cambiada=_caja(0);
    _renglon(0, { codigo:'CH1220' }); await _esperar(500); out.arreglada=_caja(0);
    _nuevo(); _renglon(0, { codigo:'CH1201', cant:1 }); _renglon(0, { desc:'ORO BI RELAX' }); await _esperar(500); out.otroProd=_caja(0);
    out.oro160=CODIGOS['CH1201'] && stockEnCatalogo({ desc:'ORO BI RELAX', medida:'160x190' });
    return out;
  });
  chk('(partida) TITANIO ICE 160x190 elegido de la lista (CH1201): ✅ con los 4 de acá', r.antes && /DISPONIBLE/.test(r.antes.txt) && /En almacén 4/.test(r.antes.txt), r.antes && [r.antes.txt, r.__error]);
  chk('⚠️ cambiando la medida a 140x190 (el código queda CH1201): ya NO dice «✅ DISPONIBLE» con el stock del 160x190',
      r.cambiada && !/DISPONIBLE/.test(r.cambiada.txt) && !/En almacén 4/.test(r.cambiada.txt), r.cambiada && [r.cambiada.cls, r.cambiada.txt]);
  chk('…dice «⚠️ EL CÓDIGO ES DE OTRA MEDIDA · CH1201 es TITANIO ICE 160x190» y cuál es el bueno: «El de 140x190 es CH1220»',
      r.cambiada && /EL CÓDIGO ES DE OTRA MEDIDA · CH1201 es TITANIO ICE 160x190/.test(r.cambiada.txt) && /El de 140x190 es CH1220/.test(r.cambiada.txt), r.cambiada && r.cambiada.txt);
  chk('(control) con el código bueno (CH1220) el cuadrito da el saldo del 140x190: no hay ninguno',
      r.arreglada && /NO HAY/.test(r.arreglada.txt) && /En almacén 0/.test(r.arreglada.txt), r.arreglada && r.arreglada.txt);
  chk('⚠️ CH1201 con el nombre cambiado a mano a «ORO BI RELAX»: «EL CÓDIGO ES DE OTRO PRODUCTO», no el saldo del TITANIO',
      !r.oro160 || (r.otroProd && /EL CÓDIGO ES DE OTRO PRODUCTO · CH1201 es TITANIO ICE 160x190/.test(r.otroProd.txt) && !/En almacén 4/.test(r.otroProd.txt)),
      r.otroProd && [r.otroProd.txt, r.oro160]);

  reset(); page.__respuestas.push(false);
  r = await ev(async () => {
    var out={};
    _nuevo(); _llenarDatos('CLIENTE CODIGO'); _renglon(0, { codigo:'CH1201', cant:1 }); _renglon(0, { medida:'140x190' }); await _esperar(500);
    await _guardar(); out.guardados=_enServidor('CLIENTE CODIGO');
    return out;
  });
  chk('⚠️ al guardar con el código de otra medida PREGUNTA («el código CH1201 es de TITANIO ICE 160x190… El de 140x190 es CH1220»), y Cancelar no guarda',
      page.__dialogos.length===1 && /TITANIO ICE 140x190: el código CH1201 es de TITANIO ICE 160x190/.test(page.__dialogos[0]) && /CH1220/.test(page.__dialogos[0]) && r.guardados===0,
      [page.__dialogos, r]);

  // ═══ 3. 🏭 EDITANDO UNA LÍNEA QUE YA SE FABRICA PARA ESE PEDIDO ══════════════════════════════
  console.log('\n── 3. 🏭 Editando: lo que ya se fabrica para ESTE pedido no es «no hay, mandá a producir» ──');
  reset();
  r = await ev(async () => {
    var out={};
    var pf=_P({ id:'fab1', cliente:'CLIENTE FAB', fecha:_d(7), productos:[ _linea('ORO', 1, { enProd:true, prodEn:'Moreno', prodF:_d(-1), chk:'no' }) ] });
    await _escenario(_stock({ aca:{} }), [pf]);                     // del ORO BI RELAX no hay nada: el que se ve es el de este pedido
    _nuevo(); editPedido('fab1'); await _esperar(600); out.edit=_caja(0);
    _fecha(_d(1)); await _esperar(450); out.movida=_caja(0);
    /* Aparte: uno que ya llegó (con él en la lista, Moreno queda medido en 4 días y cambiaría la cuenta de arriba). */
    var pl=_P({ id:'fab2', cliente:'CLIENTE LLEGO', fecha:_d(7), productos:[ _linea('ORO', 1, { enProd:true, prodEn:'Moreno', prodF:_d(-4), prodR:todayStr(), chk:'ok' }) ] });
    await _escenario(_stock({ aca:{} }), [pl]);
    _nuevo(); editPedido('fab2'); await _esperar(600); out.llego=_caja(0);
    await _escenario(_stock({ aca:{} }), [pf]);
    return out;
  });
  chk('🏭 editando un pedido con su ORO BI RELAX ya pedido a fábrica PARA ÉL: NO dice «NO HAY · hay que mandar a producir»',
      r.edit && !r.edit.hidden && !/NO HAY|mandar a producir/.test(r.edit.txt), r.edit && [r.edit.cls, r.edit.txt, r.__error]);
  chk('…dice «🏭 SE FABRICA PARA ESTE PEDIDO en Moreno (pedido el 22/09, llega ~25/09): no sale del saldo del almacén»',
      r.edit && /🏭 SE FABRICA PARA ESTE PEDIDO en Moreno \(pedido el 22\/09, llega ~25\/09\): no sale del saldo del almacén/.test(r.edit.txt), r.edit && r.edit.txt);
  chk('…y si se mueve la entrega a mañana, la línea roja cuenta desde ESA llegada: «programá desde el sábado 26/09» (no «el lunes 28», como si se pidiera hoy)',
      r.movida && /Para el jueves 24\/09 no llega: programá desde el sábado 26\/09/.test(r.movida.txt), r.movida && r.movida.txt);
  chk('🏭 si ya llegó de fábrica (✔ hay): verde «🏭 HECHO PARA ESTE PEDIDO · ya llegó de fábrica el 23/09»',
      r.llego && /ps-verde/.test(r.llego.cls) && /HECHO PARA ESTE PEDIDO · ya llegó de fábrica el 23\/09/.test(r.llego.txt), r.llego && [r.llego.cls, r.llego.txt]);

  reset();
  r = await ev(async () => {
    var out={};
    _nuevo(); editPedido('fab1'); await _esperar(600);
    _fecha(_d(1)); await _esperar(400);
    await _guardar(); out.fecha=((window._SRV.pedidos.filter(function(p){ return p.id==='fab1'; })[0])||{}).fecha;
    return out;
  });
  chk('🏭 …y al guardar esa fecha, la pregunta dice lo mismo («Para el jueves 24/09 no llega: programá desde el sábado 26/09»), no «hay que mandar a producir»',
      page.__dialogos.length===1 && /ORO BI RELAX 180x190: Para el jueves 24\/09 no llega: programá desde el sábado 26\/09/.test(page.__dialogos[0]) && !/mandar a producir/.test(page.__dialogos[0]),
      [page.__dialogos, r]);

  reset();
  r = await ev(async () => {
    var out={};
    await _escenario(_stock({ aca:{} }), [ _P({ id:'fab3', cliente:'CLIENTE FAB3', fecha:_d(7), productos:[ _linea('ORO', 1, { enProd:true, prodEn:'Moreno', prodF:_d(-1), chk:'no' }) ] }) ]);
    _nuevo(); editPedido('fab3'); await _esperar(600);
    document.getElementById('f-direccion').value='Calle nueva 123';
    await _guardar(); out.dir=((window._SRV.pedidos.filter(function(p){ return p.id==='fab3'; })[0])||{}).direccion;
    _nuevo(); editPedido('fab3'); await _esperar(600);
    _renglon(0, { cant:2 }); await _esperar(500); out.dos=_caja(0);
    return out;
  });
  chk('(control) corregir la dirección de ese pedido no pregunta nada y guarda', page.__dialogos.length===0 && r.dir==='Calle nueva 123', [page.__dialogos, r.dir, r.__error]);
  chk('(control) subiéndole la cantidad a 2 la marca 🏭 no se hereda al guardar (`heredarMarcas`): vuelve a salir del almacén → «NO HAY»',
      r.dos && /NO HAY/.test(r.dos.txt) && !/SE FABRICA PARA ESTE PEDIDO/.test(r.dos.txt), r.dos && r.dos.txt);

  // ═══ 4. 🎧 → 📄 UNA ATC QUE PASA A OC ═════════════════════════════════════════════════════════
  console.log('\n── 4. Una ATC que pasa a OC: lo que lleva ahora sale del almacén ──');
  reset(); page.__respuestas.push(false);
  r = await ev(async () => {
    var out={};
    var atc=_P({ id:'atc1', oc:'ATC 09-001', cliente:'CLIENTE ATC', fecha:_d(2), productos:[_linea('ORO',1)] });
    await _escenario(_stock({ aca:{} }), [atc]);
    _nuevo(); editPedido('atc1'); await _esperar(500);
    segSet('f-doc-tipo','OC'); pintarDocTipo(); document.getElementById('f-nota').value='3001'; await _esperar(500);
    out.caja=_caja(0);
    await _guardar(); out.oc=((window._SRV.pedidos.filter(function(p){ return p.id==='atc1'; })[0])||{}).oc;
    return out;
  });
  chk('🎧→📄 editando una ATC y pasándola a OC, el cuadrito aparece («NO HAY»: del ORO BI RELAX no hay)', r.caja && !r.caja.hidden && /NO HAY/.test(r.caja.txt), r.caja && [r.caja.txt, r.__error]);
  chk('⚠️ …y al guardar PREGUNTA (antes no: «no cambió la cantidad»), y Cancelar no la convierte',
      page.__dialogos.length===1 && /ORO BI RELAX 180x190: no hay saldo libre/.test(page.__dialogos[0]) && /^ATC/.test(String(r.oc||'')), [page.__dialogos, r.oc]);

  // ═══ 5. 🏪 RPT: la pregunta habla de la sucursal ════════════════════════════════════════════
  console.log('\n── 5. 🏪 En una RPT la pregunta habla de la sucursal ──');
  reset(); page.__respuestas.push(false);
  r = await ev(async () => {
    var out={};
    await _escenario(_stock({ aca:{} }), []);
    _nuevo(); segSet('f-doc-tipo','RPT'); pintarDocTipo(true);
    document.getElementById('f-vendedor').value='Maria Flores'; document.getElementById('f-rpt-suc').value='Central';
    document.getElementById('f-zona').value='Central';
    _renglon(0, { codigo:'CH1775', cant:1 }); _fecha('2026-09-30'); await _esperar(500);
    await _guardar(); out.guardados=_enServidor('Central');
    return out;
  });
  chk('🏪 en una RPT sin saldo la pregunta dice «¿Le avisaste a la sucursal cuánto tiene que esperar?»',
      page.__dialogos.length===1 && /¿Le avisaste a la sucursal cuánto tiene que esperar\?/.test(page.__dialogos[0]) && r.guardados===0, [page.__dialogos, r]);

  // ═══ 6. 📐 LAS DECISIONES DEL DUEÑO (27/09): el código de la medida estándar se borra solo ════════════
  console.log('\n── 6. 📐 El código de la medida estándar en una medida especial se borra solo (dueño, 27/09) ──');
  reset();
  r = await ev(async () => {
    var out={};
    await _escenario(_stock({ aca:{ TIT:4 } }), []);
    _nuevo(); _renglon(0, { codigo:'CH1201', cant:1 });             // de la lista: TITANIO ICE 160x190
    _renglon(0, { otra:'150x200' }); out.mientras=_caja(0).cod;      // escribiendo (input): todavía no se toca
    var c=document.querySelectorAll('#f-productos .prod-card')[0];
    c.querySelector('.prod-medida-otro').dispatchEvent(new Event('change', { bubbles:true })); await _esperar(500);
    out.cod=c.querySelector('.prod-codigo').value; out.toast=document.getElementById('toast').textContent; out.caja=_caja(0);
    var sale=async function(o){
      _nuevo(); _renglon(0, o); var k=document.querySelectorAll('#f-productos .prod-card')[0];
      k.querySelector('.prod-medida-otro').dispatchEvent(new Event('change', { bubbles:true })); await _esperar(300);
      return k.querySelector('.prod-codigo').value;
    };
    out.cm=await sale({ codigo:'CH1201', otra:'160X190CM', cant:1 });   // estándar escrita distinto
    out.bir=await sale({ codigo:'CH2172', otra:'160x200', cant:1 });    // SOMIER BiRELAX «ESPECIAL»: su código es PARA medida especial
    return out;
  });
  chk('📐 mientras escribe «150x200» (letra por letra) el código no se toca', r.mientras==='CH1201', [r.mientras, r.__error]);
  chk('📐 al salir del campo «Otros 150x200», el código CH1201 (del 160x190) se BORRA SOLO', r.cod==='', [r.cod, r.__error]);
  chk('…y lo dice: «📐 Borré el código CH1201: es del TITANIO ICE 160x190, y esta es una medida especial (se fabrica a pedido).»',
      /📐 Borré el código CH1201: es del TITANIO ICE 160x190, y esta es una medida especial \(se fabrica a pedido\)\./.test(r.toast||''), r.toast);
  chk('…el cuadrito queda en azul «MEDIDA ESPECIAL», ya sin «borralo»',
      r.caja && /ps-azul/.test(r.caja.cls) && /MEDIDA ESPECIAL · se fabrica a pedido/.test(r.caja.txt) && !/borralo/.test(r.caja.txt), r.caja && [r.caja.cls, r.caja.txt]);
  chk('(control) «160X190CM» es la medida estándar escrita distinto: el código CH1201 queda', r.cm==='CH1201', r.cm);
  chk('(control) el código del catálogo PARA medida especial (CH2172, SOMIER BiRELAX «ESPECIAL») queda', r.bir==='CH2172', r.bir);

  reset();
  r = await ev(async () => {
    var out={};
    await _escenario(_stock({ aca:{ TIT:4 } }), []);
    /* Guardar sin salir del campo (Enter): solo `input`, nunca `change`. */
    _nuevo(); _llenarDatos('CLIENTE ENTER'); _renglon(0, { codigo:'CH1201', otra:'150x200', cant:1 }); _fecha('2026-09-30'); await _esperar(500);
    await _guardar();
    var p=window._SRV.pedidos.filter(function(q){ return q.cliente==='CLIENTE ENTER'; })[0];
    out.prod=p && p.productos && p.productos[0];
    return out;
  });
  chk('📐 guardado sin salir del campo (Enter): se guarda SIN el código del 160x190 («TITANIO ICE · 150x200 · sin código»)',
      r.prod && r.prod.codigo==='' && r.prod.medida==='150x200' && r.prod.desc==='TITANIO ICE', [r.prod, r.__error]);
  chk('…y la pregunta al guardar ya no dice «borralo» (ya se borró)',
      page.__dialogos.length===1 && /TITANIO ICE 150x200: medida especial: se fabrica a pedido/.test(page.__dialogos[0]) && !/borralo/.test(page.__dialogos[0]), page.__dialogos);

  reset();
  r = await ev(async () => {
    var out={};
    var viejo=_P({ id:'espv', cliente:'CLIENTE ESP VIEJO', fecha:_d(9), productos:[ _linea('TIT', 1, { medida:'150x200', enProd:true, prodEn:'Moreno', prodF:_d(-1), chk:'no' }) ] });
    await _escenario(_stock({ aca:{ TIT:4 } }), [viejo]);
    _nuevo(); editPedido('espv'); await _esperar(600); out.caja=_caja(0);
    document.getElementById('f-direccion').value='Calle vieja 9';
    await _guardar();
    var p=window._SRV.pedidos.filter(function(q){ return q.id==='espv'; })[0];
    out.prod=p && p.productos && p.productos[0]; out.dir=p && p.direccion;
    return out;
  });
  chk('(control) un pedido YA GUARDADO con ese código no se toca al corregir la dirección: el código y lo de logística (🏭 Moreno) quedan',
      r.prod && r.prod.codigo==='CH1201' && r.prod.enProd===true && r.prod.prodEn==='Moreno' && r.dir==='Calle vieja 9', [r.prod, r.dir, r.__error]);
  chk('…y ahí el cuadrito sigue avisando «borralo»', r.caja && /El código CH1201 es del TITANIO ICE 160x190: borralo/.test(r.caja.txt), r.caja && r.caja.txt);

  // ═══ 7. 🏭 ANTES QUE 📐: la medida especial que ya se mandó a fabricar para ESTE pedido ═══════════════
  console.log('\n── 7. 🏭 La medida especial ya pedida a fábrica para este pedido dice cuándo llega ──');
  reset();
  r = await ev(async () => {
    var out={};
    var pe=_P({ id:'espf', cliente:'CLIENTE ESP FAB', fecha:_d(7), productos:[ _linea('TIT', 1, { medida:'150x200', codigo:'', enProd:true, prodEn:'Moreno', prodF:_d(-1), chk:'no' }) ] });
    await _escenario(_stock({ aca:{ TIT:4 } }), [pe]);
    _nuevo(); editPedido('espf'); await _esperar(600); out.edit=_caja(0);
    _fecha(_d(1)); await _esperar(450); out.movida=_caja(0);
    _fecha(_d(7)); _renglon(0, { cant:2 }); await _esperar(500); out.dos=_caja(0);
    return out;
  });
  chk('🏭 editando un pedido con su TITANIO ICE 150x200 ya pedido a fábrica: «🏭 SE FABRICA PARA ESTE PEDIDO en Moreno (pedido el 22/09, llega ~25/09)», no «esperá ~5 días»',
      r.edit && /🏭 SE FABRICA PARA ESTE PEDIDO en Moreno \(pedido el 22\/09, llega ~25\/09\)/.test(r.edit.txt) && !/MEDIDA ESPECIAL/.test(r.edit.txt), r.edit && [r.edit.cls, r.edit.txt, r.__error]);
  chk('…y la línea roja cuenta desde esa llegada: «Para el jueves 24/09 no llega: programá desde el sábado 26/09»',
      r.movida && /Para el jueves 24\/09 no llega: programá desde el sábado 26\/09/.test(r.movida.txt), r.movida && r.movida.txt);
  chk('(control) con 2 unidades ya no es la línea que se pidió: vuelve a «📐 MEDIDA ESPECIAL · se fabrica a pedido»',
      r.dos && /MEDIDA ESPECIAL · se fabrica a pedido/.test(r.dos.txt) && !/SE FABRICA PARA ESTE PEDIDO/.test(r.dos.txt), r.dos && r.dos.txt);

  // ═══ 8. ⏱️ 🔄 ACTUALIZAR: como mucho una lectura cada 15 s (dueño, 27/09) ═══════════════════════════
  console.log('\n── 8. ⏱️ 🔄 Actualizar: una lectura cada 15 s como mucho ──');
  r = await ev(async () => {
    /* Mientras lee, el cuadrito dice «Consultando…» sin botón: el toque que no lo encuentra no hace nada (como en la pantalla). */
    var out={}, boton=function(){ return document.querySelector('#f-productos .prod-saldo .ps-act') || { click:function(){} }; };
    await _escenario(_stock({ aca:{ TIT:4 } }), []);
    _nuevo(); _renglon(0, { codigo:'CH1201', cant:1 }); await _esperar(500);
    window._SRV.stock=_stock({ aca:{ TIT:7 } });
    var n0=_lecturas; boton().click(); boton().click(); boton().click(); await _esperar(400);
    out.l1=_lecturas-n0; out.t1=document.getElementById('toast').textContent; out.c1=_caja(0);
    ULTIMO_ERROR='sin_red';                                          // la última lectura falló: se quiere reintentar
    n0=_lecturas; boton().click(); await _esperar(400); out.l2=_lecturas-n0; out.c2=_caja(0);
    return out;
  });
  chk('⏱️ tres toques con la lectura de recién: NINGUNA lectura más (cada una trae la planilla entera)', r.l1===0 && r.c1 && /En almacén 4/.test(r.c1.txt), [r.l1, r.c1 && r.c1.txt, r.__error]);
  chk('…y lo dice: «✅ El saldo ya está al día: se leyó hace 1 s. Se puede volver a leer en 15 s.»',
      /✅ El saldo ya está al día: se leyó hace 1 s\. Se puede volver a leer en 15 s\./.test(r.t1||''), r.t1);
  chk('…pero si la última lectura FALLÓ, lee igual aunque sea de recién: de 4 pasa a 7', r.l2===1 && r.c2 && /En almacén 7/.test(r.c2.txt), [r.l2, r.c2 && r.c2.txt]);
  await page.clock.setFixedTime(new Date(Date.parse(RELOJ)+16000));      // pasan 16 segundos
  r = await ev(async () => {
    window._SRV.stock=_stock({ aca:{ TIT:9 } });
    var n0=_lecturas; document.querySelector('#f-productos .prod-saldo .ps-act').click(); await _esperar(400);
    return { l:_lecturas-n0, c:_caja(0) };
  });
  await page.clock.setFixedTime(new Date(RELOJ));
  chk('…pasados 15 s, el botón lee: de 7 pasa a 9', r.l===1 && r.c && /En almacén 9/.test(r.c.txt), [r.l, r.c && r.c.txt, r.__error]);

  // ═══ 9. 🔵 «ESPECIALES» (y el celeste de la fila): una medida estándar escrita distinto no lo es ════════════
  console.log('\n── 9. 🔵 El filtro «Especiales» no marca «160X190CM» ──');
  r = await ev(async () => {
    var P=function(m){ return { productos:[{ desc:'TITANIO ICE', medida:m, codigo:'', cant:1 }] }; };
    return { cm:hasEspecial(P('160X190CM')), met:hasEspecial(P('1,60 x 1,90')), esp:hasEspecial(P('150x200')), std:hasEspecial(P('160x190')),
             kCm:rowKind(P('160X190CM')), kEsp:rowKind(P('150x200')),
             filtro:QUICK_DEFS.filter(function(q){ return q.k==='especial'; })[0].test(P('160X190CM')) };
  });
  chk('🔵 «160X190CM» y «1,60 x 1,90» son la medida estándar: ni «Especiales» ni fila celeste (antes sí)',
      r.cm===false && r.met===false && r.kCm!=='especial' && r.filtro===false, [r, r.__error]);
  chk('(control) «150x200» sigue siendo especial (celeste), y «160x190» no', r.esp===true && r.std===false && r.kEsp==='especial', r);

  // ═══ 10. 🚚 LA RECOGIDA PROGRAMADA LLEGA EL DÍA DE LA RECOGIDA (revisión de Codex del 28/09) ═══════════════
  console.log('\n── 10. 🚚 Lo que viene en una recogida programada se promete para ESE día, no «en 1 día» ──');
  reset();
  r = await ev(async () => {
    var out={}, rec=function(u, f, esp){ return { id:'rq'+u+esp, k:K.TIT, u:u, tipo:'recogida', de:IMN, fab:'', f:f, esp:esp, r:'' }; };
    // Acá 0 y Moreno 5, pero las 5 ya van en una recogida para el lunes 05/10.
    await _escenario(_stock({ aca:{ TIT:0 }, im:{ TIT:5 }, p:[ rec(5, todayStr(), '2026-10-05') ] }), []);
    _nuevo(); _renglon(0, { codigo:'CH1201', cant:1 }); _fecha('2026-09-25'); await _esperar(500); out.fut=_caja(0);
    // Moreno 7 y la recogida se lleva 5: quedan 2 para traer ya. Una unidad sale de ahí; tres necesitan la recogida.
    await _escenario(_stock({ aca:{ TIT:0 }, im:{ TIT:7 }, p:[ rec(5, todayStr(), '2026-10-05') ] }), []);
    _nuevo(); _renglon(0, { codigo:'CH1201', cant:1 }); await _esperar(500); out.uno=_caja(0);
    _nuevo(); _renglon(0, { codigo:'CH1201', cant:3 }); await _esperar(500); out.tres=_caja(0);
    // Una recogida que era para el lunes 21/09 y no se marcó como llegada.
    await _escenario(_stock({ aca:{ TIT:0 }, im:{ TIT:5 }, p:[ rec(5, '2026-09-19', '2026-09-21') ] }), []);
    _nuevo(); _renglon(0, { codigo:'CH1201', cant:1 }); await _esperar(500); out.atr=_caja(0);
    return out;
  });
  chk('🚚 las 5 van en una recogida para el lunes 05/10: NO dice «se trae en 1 día · programá desde el viernes 25/09»',
      r.fut && !/se trae en 1 día/.test(r.fut.txt) && !/programá desde el viernes 25\/09/.test(r.fut.txt), r.fut && [r.fut.txt, r.__error]);
  chk('…dice «🚚 VIENE DE MORENO · logística lo trae el lunes 05/10: programá desde el martes 06/10» (y que un adelanto lo confirma logística)',
      r.fut && /🚚 VIENE DE MORENO · logística lo trae el lunes 05\/10: programá desde el martes 06\/10 \(si logística la puede adelantar, que te lo confirme\)/.test(r.fut.txt), r.fut && r.fut.txt);
  chk('…y con la entrega para el viernes 25/09, la línea roja: «Para el viernes 25/09 no llega: programá desde el martes 06/10»',
      r.fut && /Para el viernes 25\/09 no llega: programá desde el martes 06\/10/.test(r.fut.txt), r.fut && r.fut.txt);
  chk('(control) el total es el de siempre: «En almacén 5 · … Libres 5» y «+5 en camino de Moreno» (nada contado dos veces)',
      r.fut && /En almacén 5/.test(r.fut.txt) && /Libres 5/.test(r.fut.txt) && /\+5 en camino de Moreno/.test(r.fut.txt), r.fut && r.fut.txt);
  chk('(control) con 2 libres en Moreno, UNA unidad sigue siendo «📥 HAY EN MORENO · se trae en 1 día»',
      r.uno && /📥 HAY EN MORENO · se trae en 1 día: programá desde el viernes 25\/09/.test(r.uno.txt), r.uno && r.uno.txt);
  chk('🚚 …pero TRES necesitan la recogida: «logística lo trae el lunes 05/10»', r.tres && /🚚 VIENE DE MORENO · logística lo trae el lunes 05\/10/.test(r.tres.txt), r.tres && r.tres.txt);
  chk('🚚 una recogida que era para el lunes 21/09 y no llegó: «la recogida era para el lunes 21/09 y todavía no llegó: confirmala con logística»',
      r.atr && /la recogida era para el lunes 21\/09 y todavía no llegó: confirmala con logística/.test(r.atr.txt), r.atr && r.atr.txt);

  // ═══ 11. 📅 SIN CUPO EN 60 DÍAS NO SE PROMETE UN DÍA CERRADO (revisión de Codex del 28/09) ════════════════
  console.log('\n── 11. 📅 Sin ningún turno libre en 60 días, no se promete ningún día ──');
  reset();
  r = await ev(async () => {
    var out={};
    await _escenario(_stock({ aca:{ TIT:5 } }), []);
    var ini=proximoDiaEntrega(), dias=[]; for(var i=0;i<65;i++) dias.push(stockSumarDias(ini,i));
    var antes=DIAS_CERRADOS; DIAS_CERRADOS=dias;
    _nuevo(); _renglon(0, { codigo:'CH1201', cant:1 }); await _esperar(500); out.hay=_caja(0);
    _renglon(0, { codigo:'CH1220', cant:1 }); await _esperar(500); out.pedir=_caja(0);       // del 140x190 no hay: «mandar a producir»
    _renglon(0, { desc:'TITANIO ICE', otra:'150x200', cant:1 }); await _esperar(500); out.esp=_caja(0);
    DIAS_CERRADOS=antes;
    return out;
  });
  chk('📅 con 5 en almacén y los próximos 65 días cerrados: NO dice «DISPONIBLE · podés programar desde mañana»',
      r.hay && !/DISPONIBLE · podés programar/.test(r.hay.txt), r.hay && [r.hay.cls, r.hay.txt, r.__error]);
  chk('…dice «✅ HAY EN ALMACÉN · ⚠️ SIN CUPO: no queda ningún turno de entrega libre en los próximos 60 días…», en ámbar',
      r.hay && /ps-ambar/.test(r.hay.cls) && /✅ HAY EN ALMACÉN · ⚠️ SIN CUPO: no queda ningún turno de entrega libre en los próximos 60 días: consultá con logística/.test(r.hay.txt), r.hay && [r.hay.cls, r.hay.txt]);
  chk('…y lo mismo cuando hay que mandar a producir (sin «~null días» ni un día cerrado)',
      r.pedir && /🏭 NO HAY · hay que mandar a producir \(avisá a logística\) · ⚠️ SIN CUPO/.test(r.pedir.txt) && !/null|undefined|NaN/.test(r.pedir.txt), r.pedir && r.pedir.txt);
  chk('…y en una medida especial', r.esp && /📐 MEDIDA ESPECIAL · se fabrica a pedido · ⚠️ SIN CUPO/.test(r.esp.txt) && !/null|undefined|NaN/.test(r.esp.txt), r.esp && r.esp.txt);

  chk('ningún error de JavaScript en la página', errores.length===0, errores.slice(0,5));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
