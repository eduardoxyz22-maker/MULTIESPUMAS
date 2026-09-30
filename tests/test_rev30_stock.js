/* 📦 STOCK Y FORMULARIO DE LA REVISIÓN EN TRES NIVELES (30/09, bitácora §4hd, RESPUESTA §22-§23).

   Reloj clavado en el martes 29/09/2026 a las 10:00 de Bolivia. Solo datos inventados (el repo es público): los códigos
   CH9158/CH9159/CH9296 no existen; CH1296 y CD1942 sí están en el histórico del sistema que trae la página.

   ⚠️ LO QUE CUIDA (las marcadas «diente» fallan contra lo publicado el 29/09, `2207922`):
   1. A4-1 / X-3 — un renglón con CÓDIGO o PRECIO y SIN producto ya no se pierde callado al guardar:
      a. (diente) pestaña recién abierta, código del almacén escrito antes de que llegue el saldo: guardar se FRENA (antes se
         guardaba el pedido sin ese producto); cuando llega la lectura el renglón se completa y se guarda con los dos.
      b. (diente) un producto del almacén AGOTADO (CH1296, que ya no está en ningún Excel) se completa con el histórico del
         sistema, sin «1,5» colgado (R4-4), y avisa que su saldo es 0. Antes no completaba nada.
      c. (diente) un código que no está en ningún lado avisa al salir del campo, y guardar se frena.
      d. (no se rompe) al EDITAR, vaciarle el nombre a un producto que ya traía el pedido lo SACA, como siempre (test_modif).
      e. (diente) al editar, un renglón NUEVO con solo el código también se frena.
   2. R4-2 — la lectura que completa el código del almacén:
      a. (diente) no pisa la medida elegida a mano (antes ponía la del Excel sin avisar).
      b. (diente) no devuelve el nombre que se vació para SACAR el producto (antes volvía con el refresco y se guardaba).
   3. R4-1 — el código del ALMACÉN en un renglón de otra medida:
      a. (diente) el cuadrito dice «EL CÓDIGO ES DE OTRA MEDIDA» y cuál es el bueno (antes ✅ con el stock del otro);
      b. (diente) al guardar se pregunta;
      c. (diente) la revisión automática no lo tilda ✔ ni le reserva nada, y lo cuenta aparte.
   4. R4-4 (diente) — el nombre desde el histórico sin «1,5», «[Pr.]» ni «- T.A.».
   5. R4-5 / A4-2 / X-4 — el producto del almacén fuera de la lista que se agota:
      a. (diente) con un código que el sistema NO conoce (CH9296): el Excel nuevo no borra el código mientras un pedido o un
         pedido a fábrica lo nombra; el pedido, lo pedido a fábrica, lo guardado en la planilla y la llegada siguen en SU
         producto, no en el SOMIER NEGRO de la lista.
      b. (diente) con CH1296 (el caso real de §4cy): lo mismo.
      c. (no crece para siempre) un código que nadie nombra se va con el Excel siguiente.
      d. (diente) «Qué producir»: el histórico del TITANIO ICE 160x190 ya no suma la medida especial 160X200 (CH1389), ni el
         del SOMIER NEGRO 105x190 al SOMIER PARRILLA NEGRO (CH1296).
      e. (no se rompe) un código mal tipeado (CH1O37) se sigue buscando por el nombre.
   6. R4-3 (diente) — los pedidos de Eduardo a Multicenter se juntan por la FECHA DE ENTREGA también en los 30 días (decisión
      del dueño, 29/09): los mismos pedidos daban 1 entrega en la tabla de 15 días y 3 en el plan del mes.
   7. A4-3 (diente) — en una RPT el aviso del código del almacén no pide precio.

   Se corre:  node tests/test_rev30_stock.js          (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/a/pedidos_2207922.html node tests/test_rev30_stock.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };

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
  window._saves=[];
  window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(k||'')+': '+String(m)); return _t(m,k,ms); };
  apiList=function(){
    var l=JSON.parse(JSON.stringify(window._SRV.pedidos));
    if(window._SRV.stock) l.push({ id:'__stock__', fecha:'', cliente:'📦 STOCK', observaciones:JSON.stringify(window._SRV.stock) });
    return Promise.resolve({ ok:true, pedidos:l });
  };
  apiSave=function(rec, op){
    var r=JSON.parse(JSON.stringify(rec)); window._saves.push(r);
    if(!/^__/.test(String(r.id))){ var i=window._SRV.pedidos.findIndex(function(p){ return p.id===r.id; }); var g=JSON.parse(JSON.stringify(rec)); if(i>=0) window._SRV.pedidos[i]=g; else window._SRV.pedidos.push(g); }
    else if(String(r.id)==='__stock__'){ try{ window._SRV.stock=JSON.parse(r.observaciones); }catch(e){} }
    return Promise.resolve({ ok:true, pedido:rec });
  };
  downloadBlob=function(){};
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  window.LOGN='PRODUCTOS TERMINADOS FAB.'; window.IMN='IM - PRODUCTOTERMINADO';
  /* Un stock como lo deja «📥 Subir existencias»: un código que la lista de precios no conoce va con su nombre crudo y `cod`. */
  window._poner=function(s, cod, nombre, cant){ var k=stockClaveCruda({ desc:nombre, medida:medidaDeTexto(nombre) }); s.u=s.u||{}; s.cod=s.cod||{}; s.u[k]=(s.u[k]||0)+cant; s.cod[cod]=k; return k; };
  window._stockBase=function(){
    var hoy=todayStr();
    var st={ c:{ f:hoy, hora:'08:30:00', u:{}, solo0:true, alm:LOGN, cod:{}, t:Date.now()-3600000 }, e:[], p:[], a:{}, g:{}, al:{}, h:[] };
    st.g[IMN]={ f:hoy, hora:'08:00:00', u:{}, solo0:true, cod:{}, t:Date.now()-3600000, rs:{} };
    st.al[LOGN]='log'; st.al[IMN]='otro';
    return st;
  };
  window._escenario=async function(stock, pedidos){
    window._SRV.stock=stock; window._SRV.pedidos=JSON.parse(JSON.stringify(pedidos||[]));
    STOCK_CARGADO=false;
    if(!stock){ STOCK=stockVacio(); stockOlvidarIndice(); }
    await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok';
  };
  var ev=function(e,t){ e.dispatchEvent(new Event(t||'input', { bubbles:true })); };
  window._ev=ev;
  window._nuevo=function(){ if(document.getElementById('modal').classList.contains('on')) closeModal(); showView('form'); resetForm(); };
  window._card=function(i){ return document.querySelectorAll('#f-productos .prod-card')[i||0]; };
  window._codigo=function(cod, i){ var e=_card(i).querySelector('.prod-codigo'); e.value=cod; ev(e); };
  window._medida=function(m, i){
    var c=_card(i), ms=c.querySelector('.prod-medida'), mo=c.querySelector('.prod-medida-otro');
    if(MEDIDAS.indexOf(m)>=0){ ms.value=m; ev(ms,'change'); }
    else { ms.value='Otros'; ev(ms,'change'); mo.value=m; ev(mo); ev(mo,'change'); }
  };
  window._desc=function(t, i){ var e=_card(i).querySelector('.prod-desc'); e.value=t; ev(e); ev(e,'change'); };
  window._cant=function(n, i){ var q=_card(i).querySelector('.prod-cant'); q.value=String(n); ev(q); };
  window._leer=function(i){
    var c=_card(i); if(!c) return null;
    var ms=c.querySelector('.prod-medida'), mo=c.querySelector('.prod-medida-otro'), b=c.querySelector('.prod-saldo');
    return { desc:c.querySelector('.prod-desc').value, medida:(ms.value==='Otros' ? ('Otros:'+mo.value) : ms.value), codigo:c.querySelector('.prod-codigo').value,
             caja: b && !b.hidden ? b.innerText.replace(/\s+/g,' ').trim() : '' };
  };
  window._llenarDatos=function(cli, fecha){
    document.getElementById('f-vendedor').value='Maria Flores';
    document.getElementById('f-cliente').value=cli;
    document.getElementById('f-celular').value='70011122';
    document.getElementById('f-nota').value=String(2000+Math.floor(Math.random()*999));
    document.getElementById('f-zona').value='Norte';
    document.getElementById('f-saldo').value='1000';
    var f=document.getElementById('f-fecha'); f.value=fecha||stockSumarDias(todayStr(),2); ev(f,'change');
  };
  window._guardar=async function(){ var n0=window._saves.length; document.getElementById('f-submit').click(); for(var i=0;i<60;i++){ await _esperar(50); var b=document.getElementById('f-submit'); if(b && !b.disabled) break; } await _esperar(400); return window._saves.slice(n0).filter(function(r){ return !/^__/.test(String(r.id)); }); };
  window._P=function(o){ return Object.assign({ id:'p'+Math.random().toString(36).slice(2,9), fecha:'', oc:'09-900', vendedor:'Maria Flores',
    cliente:'CLIENTE X', celular:'70000000', turno:'AM', zona:'Norte', direccion:'Calle 1', maps:'', pagado:false, saldo:1000, ts:Date.now()-86400000,
    metodoPago:'', observaciones:'', estado:'', entregado:false, vehiculo:'', chofer:'', garantia:'', nota:'1500', acuenta:0, facturarA:'', nit:'',
    nroDia:1, verificado:false, fotos:[], productos:[{ desc:'TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1 }] }, o); };
  window._fila=function(k){ var d=stockData(); return d.lista.filter(function(x){ return x.k===k; })[0]||null; };
  window._prods=function(p){ return (p.productos||[]).map(function(x){ return x.desc+' '+x.medida+' '+x.codigo+' ×'+x.cant; }); };
  /* El reporte «EXISTENCIAS ALMACEN» de Moreno, como lo lee `existLeer` (columna G = código, W = nombre, AY = cantidad). */
  window._excel=function(items){
    return [{},{C:'MORENO',X:'EXISTENCIAS ALMACEN  AL ',AR:fmtFecha(todayStr()),AZ:'(Productos con existencia <> 0)'},
            {F:'Almacén Inicial :',P:'01-05-003  PRODUCTOS TERMINADOS FAB.'},{G:'Código Producto',W:'Nombre Producto'}]
      .concat(items.map(function(i){ return { G:i[0], W:i[1], AY:String(i[2]) }; }));
  };
  window._subir=function(items){ var R=existLeer(_excel(items)); if(R.error) return R.error; EXIST_IMP=R; renderImportExist(); confirmarImportExist(); stockOlvidarIndice(); return ''; };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[], dialogos=[];
  const ctx = await browser.newContext({ viewport:{ width:1100, height:1000 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => { dialogos.push(d.message()); d.accept(); });
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-09-29T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  await page.evaluate(PREPARAR);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,400) }; } };
  chk('el reloj está clavado en el martes 29/09/2026', await page.evaluate(() => todayStr()) === '2026-09-29');

  // ═══ 1. A4-1 / X-3: un renglón con código y sin producto ══════════════════════════════════════════════════════
  console.log('\n── 1. Un renglón con código (o precio) y sin producto ya no se pierde al guardar ──');
  let r = await ev(async () => {
    var st=_stockBase();
    _poner(st.c, 'CH9158', 'SOMIER PLATA 200X200', 3);
    var kT=stockClave({ desc:'TITANIO ICE', medida:'160x190', codigo:'CH1201' }); st.c.u[kT]=5;
    window._SRV.stock=st; window._SRV.pedidos=[];
    /* Pestaña recién abierta y Google lento (el dueño midió 17 s el 29/09, §4hb): la primera lectura todavía no llegó. */
    var apiListReal=apiList; apiList=function(){ return new Promise(function(){}); };
    STOCK=stockVacio(); STOCK_CARGADO=false; stockOlvidarIndice();
    _nuevo();
    _codigo('CH1201', 0); await _esperar(100);
    addProdRow(); await _esperar(50);
    _codigo('CH9158', 1); await _esperar(200); _cant(5, 1);
    var pr2=_card(1).querySelector('.prod-precio'); pr2.value='1500'; _ev(pr2);
    _llenarDatos('CLIENTE UNO');
    var antes=_leer(1);
    apiList=apiListReal;                                    // la lectura que haga «Guardar» sí contesta (con el stock)
    window._toasts=[];
    var g1=await _guardar();
    var o={ antes:antes, g1:g1.map(_prods), aviso:window._toasts.filter(function(t){ return /SIN producto/.test(t); })[0]||'',
            err:_card(1) ? _card(1).querySelector('.prod-desc').classList.contains('err') : null };
    await refrescarEstado(); await _esperar(500);           // llega la lectura
    o.completo=_leer(1);
    o.g2=(await _guardar()).map(_prods);
    return o;
  });
  chk('1a. (diente) código del almacén escrito sin el saldo: guardar se FRENA (antes se guardaba el pedido sin el SOMIER PLATA)',
      r && r.g1 && r.g1.length===0 && /SIN producto/.test(r.aviso) && /esperá unos segundos y se completa solo/.test(r.aviso) && r.err===true, r);
  chk('1a. …llega la lectura: el renglón se completa (SOMIER PLATA 200x200) y el pedido se guarda con los DOS productos',
      r && r.completo && r.completo.desc==='SOMIER PLATA' && r.completo.medida==='200x200' && r.g2 && r.g2.length===1 &&
      r.g2[0].length===2 && r.g2[0].some(function(t){ return /^SOMIER PLATA 200x200 CH9158 ×5$/.test(t); }), r && { completo:r.completo, g2:r.g2 });

  r = await ev(async () => {
    var st=_stockBase();
    var kNeg=stockClave({ desc:'SOMIER NEGRO', medida:'105x190', codigo:'SR2011' }); st.c.u[kNeg]=4;
    await _escenario(st, []);
    _nuevo(); window._toasts=[]; _codigo('CH1296'); await _esperar(900);
    var o=_leer(); o.aviso=window._toasts.filter(function(t){ return /CH1296/.test(t); })[0]||'';
    _llenarDatos('CLIENTE DOS'); var g=await _guardar();
    o.guardado=g.map(_prods); o.clave=g[0] ? stockClave(g[0].productos[0]) : ''; o.kNeg=kNeg;
    return o;
  });
  chk('1b. (diente) CH1296 agotado (no está en ningún Excel): se completa con el histórico, «SOMIER PARRILLA NEGRO» 105x190, sin el «1,5»',
      r && r.desc==='SOMIER PARRILLA NEGRO' && r.medida==='105x190', r);
  chk('1b. …avisa que salió del histórico y que su saldo es 0, y el cuadrito NO le da el stock del SOMIER NEGRO de la lista',
      r && /histórico/.test(r.aviso) && /saldo es 0/.test(r.aviso) && !/DISPONIBLE/.test(r.caja||''), r && { aviso:r.aviso, caja:r.caja });
  chk('1b. …y el pedido se guarda en SU producto (la clave cruda del PARRILLA NEGRO), no en el SOMIER NEGRO',
      r && r.guardado && r.guardado.length===1 && /SOMIER PARRILLA NEGRO 105x190 CH1296/.test(r.guardado[0][0]||'') && r.clave && r.clave!==r.kNeg && /PARRILLA/.test(r.clave), r && { guardado:r.guardado, clave:r.clave });

  r = await ev(async () => {
    _nuevo(); window._toasts=[];
    var c=_card(0).querySelector('.prod-codigo'); c.value='ZZ9999'; _ev(c); _ev(c,'change'); await _esperar(100);
    var aviso=window._toasts.filter(function(t){ return /ZZ9999/.test(t); })[0]||'';
    var pr=_card(0).querySelector('.prod-precio'); pr.value='900'; _ev(pr);
    addProdRow(); _codigo('CH1201', 1); await _esperar(100);
    _llenarDatos('CLIENTE TRES'); window._toasts=[];
    var g=await _guardar();
    return { aviso:aviso, guardados:g.map(_prods), freno:window._toasts.filter(function(t){ return /SIN producto/.test(t); })[0]||'' };
  });
  chk('1c. (diente) un código que no está en la lista, ni en ningún almacén, ni en el histórico avisa al salir del campo',
      r && /no está en la lista de precios, ni en ningún almacén, ni en el histórico/.test(r.aviso), r);
  chk('1c. (diente) …y guardar se frena (antes se guardaba solo el TITANIO ICE)', r && r.guardados && r.guardados.length===0 && /SIN producto/.test(r.freno), r);

  r = await ev(async () => {
    var st=_stockBase(); var kT=stockClave({ desc:'TITANIO ICE', medida:'160x190', codigo:'CH1201' }); st.c.u[kT]=5;
    var ped=_P({ id:'pQ', cliente:'CLIENTE CUATRO', fecha:stockSumarDias(todayStr(),3),
      productos:[{ desc:'TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:3000 },{ desc:'ALMOHADA', medida:'50x70', codigo:'CD1403', cant:2, precio:150 }] });
    await _escenario(st, [ped]);
    editPedido('pQ'); await _esperar(500);
    _desc('', 1); await _esperar(100);
    var g1=await _guardar();
    var o={ sacar:g1.map(_prods) };
    // editar otra vez y AGREGAR un renglón con solo el código (sin nombre): se frena
    editPedido('pQ'); await _esperar(500);
    addProdRow(); var n=document.querySelectorAll('#f-productos .prod-card').length;
    var c=_card(n-1).querySelector('.prod-codigo'); c.value='ZZ8888'; _ev(c);
    var pr=_card(n-1).querySelector('.prod-precio'); pr.value='500'; _ev(pr);
    window._toasts=[];
    var g2=await _guardar();
    o.nuevo=g2.map(_prods); o.freno=window._toasts.filter(function(t){ return /SIN producto/.test(t); })[0]||'';
    try{ resetForm(); }catch(e){}
    return o;
  });
  chk('1d. (no se rompe) al editar, vaciarle el nombre a la ALMOHADA que ya traía el pedido la saca, como siempre',
      r && r.sacar && r.sacar.length===1 && r.sacar[0].length===1 && /^TITANIO ICE 160x190 CH1201 ×1$/.test(r.sacar[0][0]), r);
  chk('1e. (diente) …pero un renglón NUEVO con solo el código y el precio se frena al guardar', r && r.nuevo && r.nuevo.length===0 && /SIN producto/.test(r.freno), r);

  // ═══ 2. R4-2: la lectura no pisa lo elegido ni devuelve lo borrado ═══════════════════════════════════════════
  console.log('\n── 2. La lectura que completa el código del almacén no pisa la medida ni devuelve un nombre borrado ──');
  r = await ev(async () => {
    var st=_stockBase();
    _poner(st.c, 'CH9158', 'SOMIER PLATA 200X200', 3);
    _poner(st.c, 'CH9159', 'SOMIER PLATA 160X190', 2);
    var kT=stockClave({ desc:'TITANIO ICE', medida:'160x190', codigo:'CH1201' }); st.c.u[kT]=5;
    window._st2=st;
    STOCK=stockVacio(); STOCK_CARGADO=false; stockOlvidarIndice(); window._SRV.stock=null; window._SRV.pedidos=[];
    _nuevo(); window._toasts=[]; _codigo('CH9158'); await _esperar(150); _medida('160x190'); await _esperar(150);
    var antes=_leer();
    window._SRV.stock=st; await refrescarEstado(); await _esperar(900);
    return { antes:antes, despues:_leer(), aviso:window._toasts.filter(function(t){ return /Llegó el saldo/.test(t); })[0]||'' };
  });
  chk('2a. (diente) llega la lectura: completa el nombre (SOMIER PLATA) pero la medida elegida a mano (160x190) QUEDA',
      r && r.despues && r.despues.desc==='SOMIER PLATA' && r.despues.medida==='160x190' && /Llegó el saldo/.test(r.aviso), r);
  chk('3a. (diente) …y el cuadrito dice «EL CÓDIGO ES DE OTRA MEDIDA» y cuál es el de 160x190 (CH9159), no ✅ con el stock del 200x200',
      r && r.despues && /EL CÓDIGO ES DE OTRA MEDIDA/.test(r.despues.caja) && /CH9158/.test(r.despues.caja) && /El de 160x190 es CH9159/.test(r.despues.caja) && !/DISPONIBLE/.test(r.despues.caja),
      r && r.despues && r.despues.caja);

  r = await ev(async () => {
    _llenarDatos('CLIENTE CINCO');                         // el mismo formulario de 2a: CH9158 con la medida 160x190
    var g=await _guardar();
    await refrescarEstado();
    var R=stockAsignar(), lin=[];
    (R.pedidos||[]).forEach(function(e){ (e.lineas||[]).forEach(function(l){ if(e.p && e.p.cliente==='CLIENTE CINCO') lin.push(l.nom+' → '+(l.ahora||'')); }); });
    return { guardado:g.map(_prods), codOtro:(R.tot||{}).codOtro||0, lineas:lin, ok:(R.tot||{}).ok||0 };
  });
  chk('3b. …el pedido se guarda igual (nunca frena la venta)', r && r.guardado && r.guardado.length===1 && /SOMIER PLATA 160x190 CH9158/.test(r.guardado[0][0]||''), r);
  chk('3b. (diente) …pero al guardar PREGUNTA: «el código CH9158 es de SOMIER PLATA 200x200, no de lo que dice el renglón»',
      dialogos.some(function(d){ return /el código CH9158 es de SOMIER PLATA/.test(d); }), dialogos.map(function(d){ return d.slice(0,200); }));
  chk('3c. (diente) la revisión automática no lo tilda ✔ ni le reserva nada: lo cuenta en «🏷️ código de otro»',
      r && r.codOtro===1 && r.lineas.length===0, r);

  r = await ev(async () => {
    var st=window._st2;
    var ped=_P({ id:'pE', cliente:'CLIENTE SEIS', fecha:stockSumarDias(todayStr(),3),
      productos:[{ desc:'TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:3000 },{ desc:'SOMIER PLATA', medida:'200x200', codigo:'CH9158', cant:1, precio:1500 }] });
    await _escenario(st, [ped]);
    if(document.getElementById('modal').classList.contains('on')) closeModal();   // lo que dejó abierto el guardado anterior
    editPedido('pE'); await _esperar(500);
    _desc('', 1); await _esperar(100);
    var ocupado=autoOcupado();                             // con algo abierto, el refresco no lee y la prueba no probaría nada
    var leyo=await autoRefrescar('tic'); await _esperar(500);   // el refresco de cada 2 minutos (o volver de WhatsApp)
    var tras=_leer(1);
    var g=await _guardar();
    return { ocupado:ocupado, leyo:leyo, tras:tras, guardado:g.map(_prods) };
  });
  chk('2b. el refresco de verdad leyó la planilla (nada abierto que lo frene)', r && !r.ocupado && r.leyo===true, r && { ocupado:r.ocupado, leyo:r.leyo });
  chk('2b. (diente) al editar, el nombre que se vació para SACAR el producto no vuelve con el refresco, y se guarda sin él',
      r && r.tras && r.tras.desc==='' && r.guardado && r.guardado.length===1 && r.guardado[0].length===1 && /^TITANIO ICE/.test(r.guardado[0][0]), r);

  // ═══ 4. R4-4: el nombre desde el histórico, limpio ══════════════════════════════════════════════════════════════
  console.log('\n── 4. El nombre que viene del histórico sin la medida en plazas, sin corchetes y sin la abreviatura colgada ──');
  r = await ev(async () => {
    var casos=[['SOMIER PARRILLA NEGRO 1,5','SOMIER PARRILLA NEGRO'],['SUEÑA CONFORT PLUS 1,5 [Pr.]','SUEÑA CONFORT PLUS'],
               ['SOMIER BAHIA BEIGE  2,0 -  T.A.','SOMIER BAHIA BEIGE'],['TITANIO ICE  2.5PLZ 160X190CM','TITANIO ICE'],
               ['FORTE FLEX 2,0 VER. 2026','FORTE FLEX VER. 2026'],['COLCHON TITANIO 22 CM','COLCHON TITANIO 22 CM'],['SOMIER NEGRO','SOMIER NEGRO']];
    var mal=casos.filter(function(c){ return nombreSinMedida(c[0])!==c[1]; }).map(function(c){ return c[0]+' → «'+nombreSinMedida(c[0])+'»'; });
    var st=_stockBase(); _poner(st.c, 'CD1942', 'SOMIER BAHIA BEIGE 2,0 - T.A.', 2);
    await _escenario(st, []);
    _nuevo(); _codigo('CD1942'); await _esperar(300);
    return { mal:mal, form:_leer() };
  });
  chk('4. (diente) «SOMIER PARRILLA NEGRO 1,5», «… 1,5 [Pr.]» y «… 2,0 - T.A.» pierden lo colgado; «22 CM» y «VER. 2026» quedan',
      r && r.mal && r.mal.length===0, r && r.mal);
  chk('4. (diente) …y el código CD1942 del Excel completa «SOMIER BAHIA BEIGE» 140x190', r && r.form && r.form.desc==='SOMIER BAHIA BEIGE' && r.form.medida==='140x190', r && r.form);

  // ═══ 5. R4-5 / A4-2 / X-4: el producto del almacén que se agota ═════════════════════════════════════════════════
  console.log('\n── 5. Un producto del almacén fuera de la lista que se agota sigue siendo él ──');
  r = await ev(async () => {
    var o={};
    STATE=[]; STOCK=stockVacio(); STOCK_CARGADO=true; stockOlvidarIndice(); window._SRV.pedidos=[]; window._SRV.stock=null;
    // Día 1: el Excel de fábrica trae el PARRILLA NEGRO inventado (CH9296, el sistema no lo conoce), el real (CH1296), el SOMIER
    // NEGRO de la lista (SR2011) y uno que nadie va a pedir (CH9150).
    o.err1=_subir([['CH9296','SOMIER NEGRO PARRILLA 105X190',1],['CH1296','SOMIER PARRILLA NEGRO 105X190',1],['SR2011','SOMIER NEGRO 105X190',4],['CH9150','SOMIER PLATA 150X200',1]]);
    var kNeg=stockClave({ desc:'SOMIER NEGRO', medida:'105x190', codigo:'SR2011' });
    var x9={ desc:'SOMIER NEGRO PARRILLA', medida:'105x190', codigo:'CH9296', cant:1 }, x1={ desc:'SOMIER PARRILLA NEGRO', medida:'105x190', codigo:'CH1296', cant:1 };
    var k9=stockClave(x9), k1=stockClave(x1);
    o.pre={ k9:k9, k1:k1, kNeg:kNeg, pareceNegro:(stockClaveAuto(x9)===kNeg), dia1:(k9!==kNeg && k1!==kNeg) };
    var m3=stockSumarDias(todayStr(),3);
    var p9=_P({ id:'p9', cliente:'CLIENTE P9', fecha:m3, productos:[x9] }), p1=_P({ id:'p1', cliente:'CLIENTE P1', fecha:m3, productos:[x1] });
    STATE=[p9, p1]; window._SRV.pedidos=JSON.parse(JSON.stringify(STATE));
    STOCK.p.push({ id:'pf9', k:k9, u:5, total:5, tipo:'fabrica', fab:'MORENO', f:todayStr(), r:'' });
    STOCK.p.push({ id:'pf1', k:k1, u:5, total:5, tipo:'fabrica', fab:'MORENO', f:todayStr(), r:'' });
    guardarStock(); await _esperar(100);
    // Día 2: el Excel nuevo ya no los trae (se agotaron: el reporte lista solo lo que tiene existencia).
    o.err2=_subir([['SR2011','SOMIER NEGRO 105X190',4]]);
    await _esperar(100); await refrescarEstado(); await refrescarEstado();
    var cod=(STOCK.c||{}).cod||{};
    o.cod={ CH9296:cod.CH9296||'', CH1296:cod.CH1296||'', CH9150:cod.CH9150||'' };
    o.dia2={ k9:stockClave(STATE.filter(function(p){ return p.id==='p9'; })[0].productos[0]), k1:stockClave(STATE.filter(function(p){ return p.id==='p1'; })[0].productos[0]),
             pf9:(STOCK.p.filter(function(q){ return q.id==='pf9'; })[0]||{}).k, pf1:(STOCK.p.filter(function(q){ return q.id==='pf1'; })[0]||{}).k };
    guardarStock(); await _esperar(100);
    o.planilla=((window._SRV.stock||{}).p||[]).map(function(q){ return q.id+':'+q.k; });
    var fN=_fila(kNeg); o.negro={ comp:fN&&fN.comp, enCamino:fN&&fN.enCamino, deposito:fN&&fN.deposito };
    window._k5={ k9:k9, k1:k1, kNeg:kNeg };
    return o;
  });
  /* Día 3 (miércoles 30/09): llegan los 5 de cada pedido a fábrica y logística toca «Llegaron» (una recepción de DESPUÉS del
     Excel: la del mismo instante ya estaría adentro del conteo). */
  await page.clock.setFixedTime(new Date('2026-09-30T10:00:00-04:00'));
  const lleg = await ev(async () => {
    await refrescarEstado();
    [ 'pf9', 'pf1' ].forEach(function(id){ var q=STOCK.p.filter(function(x){ return x.id===id; })[0]; if(!q) return;
      stockRecsDe(q).push(stockRecNuevo(5, todayStr())); q.r=todayStr(); });
    stockNormalizarRecepciones(STOCK); guardarStock(); await _esperar(100);
    var K=window._k5, fN2=_fila(K.kNeg), f9=_fila(K.k9), f1=_fila(K.k1);
    return { negro:fN2&&fN2.deposito, p9:f9&&f9.deposito, p1:f1&&f1.deposito, entradas:(STOCK.e||[]).map(function(e){ return e.k+' +'+e.u; }) };
  });
  if(r && !r.__error) r.llegada = lleg;
  await page.clock.setFixedTime(new Date('2026-09-29T10:00:00-04:00'));
  chk('5. el día 1 cada código es su producto, y el inventado «parece» el SOMIER NEGRO de la lista (para que la prueba tenga sentido)',
      r && !r.err1 && r.pre && r.pre.dia1 && r.pre.pareceNegro, r && { err1:r.err1, pre:r.pre });
  chk('5a. (diente) el Excel nuevo no borra CH9296 ni CH1296 mientras un pedido y un pedido a fábrica los nombran',
      r && r.cod && r.cod.CH9296===r.pre.k9 && r.cod.CH1296===r.pre.k1, r && r.cod);
  chk('5c. (no crece para siempre) …y CH9150, que nadie nombra, se va con ese Excel', r && r.cod && r.cod.CH9150==='', r && r.cod);
  chk('5a. (diente) el pedido y el pedido a fábrica de CH9296 siguen en SU producto el día 2 (no en el SOMIER NEGRO)',
      r && r.dia2 && r.dia2.k9===r.pre.k9 && r.dia2.pf9===r.pre.k9, r && r.dia2);
  chk('5b. (diente) …y los de CH1296 (el caso real de §4cy) también', r && r.dia2 && r.dia2.k1===r.pre.k1 && r.dia2.pf1===r.pre.k1, r && r.dia2);
  chk('5a. (diente) lo que se escribe en la planilla lleva las claves de SU producto', r && r.planilla && r.planilla.indexOf('pf9:'+r.pre.k9)>=0 && r.planilla.indexOf('pf1:'+r.pre.k1)>=0, r && r.planilla);
  chk('5a. (diente) el SOMIER NEGRO no se lleva esos pedidos ni lo que viene de fábrica (0 pendientes, 0 en camino, 4 en depósito)',
      r && r.negro && !(r.negro.comp>0) && !(r.negro.enCamino>0) && r.negro.deposito===4, r && r.negro);
  chk('5a. (diente) el día 3 la llegada suma a cada PARRILLA (5 y 5) y el SOMIER NEGRO sigue en 4',
      r && r.llegada && r.llegada.negro===4 && r.llegada.p9===5 && r.llegada.p1===5, r && r.llegada);

  r = await ev(async () => {
    var kT=stockClave({ desc:'TITANIO ICE', medida:'160x190', codigo:'CH1201' }), kN=stockClave({ desc:'SOMIER NEGRO', medida:'105x190', codigo:'SR2011' });
    try{ VENTAS_HIST_IDX=null; }catch(e){}
    var H=ventasHistIndex(), fila=function(c){ return VENTAS_HIST.filas.filter(function(f){ return f[0]===c; })[0]; };
    var suma=function(o){ return Object.keys(o||{}).reduce(function(s,m){ return s+(o[m]||0); }, 0); };
    var sr=fila('SR2011'), srT=sr ? sr[3].reduce(function(s,v){ return s+v; }, 0) : 0;
    var mal=stockInfo({ desc:'COLCHON ORO VISCOLASTICO 2,5 PLZ', medida:'160x190', codigo:'CH1O37' }).k, oro=stockClave({ desc:'ORO ANATOMICO VISCOLASTICO', medida:'160x190', codigo:'CH1037' });
    return { tit:(H[kT]||{})['2025-10'], neg:suma(H[kN]), srT:srT, mal:mal, oro:oro };
  });
  chk('5d. (diente) «Qué producir»: el TITANIO ICE 160x190 de oct-25 son 6 (sin los 2 de la medida especial 160X200, CH1389)', r && r.tit===6, r);
  chk('5d. (diente) …y la historia del SOMIER NEGRO 105x190 es solo la de SR2011 (sin la del SOMIER PARRILLA NEGRO, CH1296)', r && r.neg===r.srT, r);
  chk('5e. (no se rompe) un código mal tipeado (CH1O37, con O) se sigue encontrando por el nombre en el catálogo', r && r.mal===r.oro, r);

  // ═══ 6. R4-3: Multicenter, los 30 días por la fecha de entrega ══════════════════════════════════════════════════
  console.log('\n── 6. Eduardo → Multicenter: «el mismo día» es la fecha de ENTREGA también en los 30 días ──');
  r = await ev(async () => {
    var ts=function(iso){ return Date.parse(iso+'T12:00:00-04:00'); };
    var soft=function(c){ return [{ desc:'COLCHON SOFT', medida:'140x190', codigo:'COLT0048', cant:c }]; };
    var tit=function(c){ return [{ desc:'TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:c }]; };
    var mc=function(id, venta, entrega, prods){ return _P({ id:id, vendedor:'Eduardo Añez', cliente:'MULTICENTER', ts:ts(venta), fecha:entrega, entregado:true, pagado:true, saldo:0, productos:prods }); };
    STATE=[
      // SOFT: tres pedidos cargados tres días distintos para UNA entrega (el 23), y otro para el 26 → 2 entregas
      mc('s1','2026-09-20','2026-09-23',soft(2)), mc('s2','2026-09-21','2026-09-23',soft(2)), mc('s3','2026-09-22','2026-09-23',soft(2)), mc('s4','2026-09-24','2026-09-26',soft(2)),
      // TITANIO: dos pedidos cargados el MISMO día para dos entregas distintas (16 y 17) → 2 entregas
      mc('t1','2026-09-15','2026-09-16',tit(3)), mc('t2','2026-09-15','2026-09-17',tit(3))
    ];
    STOCK=stockVacio(); STOCK.c={ f:todayStr(), hora:'09:00', u:{}, solo0:true };
    var kS=stockClave(soft(1)[0]), kT=stockClave(tit(1)[0]); STOCK.c.u[kS]=10; STOCK.c.u[kT]=10; stockOlvidarIndice();
    var d=stockData(), o=function(k){ var x=d.lista.filter(function(y){ return y.k===k; })[0]; return x ? { n15:x.nVentasRotacion, n30:x.n30, v30:x.v30, porDiaMes:x.porDiaMes } : null; };
    return { soft:o(kS), tit:o(kT) };
  });
  chk('6. (diente) SOFT: 4 pedidos de Multicenter en 2 días de entrega son 2 entregas en los 15 días Y en los 30 (antes 2 y 4)',
      r && r.soft && r.soft.n15===2 && r.soft.n30===2 && r.soft.v30===8, r && r.soft);
  chk('6. (diente) …y con 2 entregas no hay ritmo del mes (menos de 3 = pedido único, como en la tabla): 0 por día',
      r && r.soft && r.soft.porDiaMes===0, r && r.soft);
  chk('6. (diente) TITANIO: 2 pedidos cargados el MISMO día para dos entregas son 2 entregas en las dos ventanas (antes 2 y 1)',
      r && r.tit && r.tit.n15===2 && r.tit.n30===2, r && r.tit);

  // ═══ 7. A4-3: en una RPT el aviso no pide precio ════════════════════════════════════════════════════════════════
  console.log('\n── 7. En una reposición de tienda el aviso del código del almacén no pide precio ──');
  r = await ev(async () => {
    var st=_stockBase(); _poner(st.c, 'CH9158', 'SOMIER PLATA 200X200', 3);
    STATE=[]; await _escenario(st, []);
    _nuevo(); segSet('f-doc-tipo','RPT'); setDocTipo(); await _esperar(50);
    window._toasts=[]; _codigo('CH9158'); await _esperar(200);
    var rpt=window._toasts.filter(function(t){ return /CH9158/.test(t); })[0]||'';
    _nuevo(); window._toasts=[]; _codigo('CH9158'); await _esperar(200);
    var oc=window._toasts.filter(function(t){ return /CH9158/.test(t); })[0]||'';
    return { rpt:rpt, oc:oc };
  });
  chk('7. (diente) en una RPT el aviso dice que está en el almacén y NO pide «poné el precio a mano»', r && /almacén/.test(r.rpt) && !/Poné el precio/.test(r.rpt), r);
  chk('7. …y en un pedido (OC) lo sigue pidiendo', r && /Poné el precio a mano/.test(r.oc), r);

  chk('ningún error de JavaScript', errores.length===0, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
