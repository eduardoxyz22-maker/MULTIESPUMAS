/* 📥 DE QUÉ ALMACÉN SE VA A BUSCAR (§4ey).

   «Recoger» era UN solo lugar: IM, el almacén de Industrias Moreno. La marca del producto
   (`chk='im'`) no decía de dónde, así que con un segundo almacén —Banzer— el panel habría
   mandado al chofer al lugar equivocado en la lista de carga, en su ficha y en el Excel.
   Ahora el almacén viaja al lado, en `x.chkDe` (vacío = IM, como todo lo ya marcado).

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Que el botón de cada almacén aparezca en la ficha y marque el lugar correcto.
   2. Que tocar OTRO almacén cambie de lugar y tocar el MISMO desmarque.
   3. Que todo lo marcado ANTES (sin `chkDe`) siga diciendo IM: nada que migrar.
   4. Que el lugar se vea en la ficha, en la tarjeta del chofer, en la lista de carga, en
      «Mis pedidos», en la tabla de Administración y en el Excel.
   5. Que la marca viaje a la planilla (va dentro del JSON de productos, sin columna nueva).
   6. Que la revisión automática reparta por almacén y diga de cuál sale cada unidad.

   Red cortada, servidor simulado, fixtures sintéticos. Se corre:  node tests/test_banzer.js
   Dientes contra el panel viejo:  PEDIDOS=/ruta/al/viejo.html node tests/test_banzer.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const J = (o) => JSON.stringify(o);

const BASE = `
  /* 🚚 (26/09) Desde que el dueño dijo que de Banzer SALEN camiones, Banzer es un depósito de salida
     («✔ hay en Banzer», tests/test_banzer_salida.js). Este test cuida la mecánica de §4ey: VARIOS
     almacenes a los que hay que ir a buscar (botones 📥 por almacén, chkDe/chkDes, el orden, IM = Moreno,
     los nombres largos del reporte). Esa mecánica sigue viva para cualquier almacén de ir a buscar —el
     diálogo de existencias todavía deja elegir «ir a buscar» para uno—, así que acá se pone la
     configuración de antes del 26/09: Banzer como almacén de ir a buscar. Contra un panel viejo estas
     dos líneas no cambian nada (ya era así). */
  ALM_SALIDA=[]; RECOGER_EXTRA=['Banzer'];
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true;
  document.getElementById('admin-lock').style.display='none';
  document.getElementById('admin-content').style.display='block';
  try{ localStorage.removeItem(LS_PEND); }catch(e){}
  if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  CARGA_GEN++; CARGA_ESTADO='ok';
  window._saves=[];
  apiSave=function(rec){ window._saves.push(JSON.parse(JSON.stringify(rec))); return Promise.resolve({ok:true, pedido:JSON.parse(JSON.stringify(rec))}); };
  apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
  window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(m)); return _t(m,k,ms); };
  downloadBlob=function(){};
  window.K=stockClave({desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201'});
  window.prod=function(n,extra){ return [Object.assign({desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201',cant:n}, extra||{})]; };
  window._P=function(o){ return Object.assign({id:'p1',fecha:todayStr(),oc:'09-254',vendedor:'Maria Flores',
    cliente:'DON PRUEBA',celular:'70000000',turno:'AM',zona:'Norte',direccion:'x',maps:'',pagado:true,saldo:0,
    ts:Date.now(),metodoPago:'',observaciones:'',estado:'',entregado:false,vehiculo:'Foton nuevo',chofer:'Luis Eyzaguirre',
    garantia:'',nota:'1503',acuenta:0,facturarA:'',nit:'1',nroDia:14,verificado:false,fotos:[]}, o); };
  /* ⚠️ Contra un panel VIEJO estas funciones no existen. Se envuelven para que los dientes
     salgan como rojos que dicen qué falta, en vez de reventar el test entero. */
  window.RC=function(x){ return (typeof recogerCorto==='function')?recogerCorto(x):'(sin almacén)'; };
  window.RD=function(x){ return (typeof recogerDe==='function')?recogerDe(x):''; };
  window.AY=function(){ return (typeof prodAyuda==='function')?prodAyuda():(typeof PROD_AYUDA!=='undefined'?PROD_AYUDA:''); };
  window.RL=function(){ return (typeof recogerLista==='function')?recogerLista():[{v:'',corto:'IM'}]; };
  window.RAT=function(o){ return (typeof revStkAlmTxt==='function')?revStkAlmTxt(o):'(sin almacén)'; };
  /* Botones 📥 de la ficha abierta: [{txt, marcado}] */
  window.botonesRecoger=function(){
    return [].slice.call(document.querySelectorAll('#modal-box .prod-rev button')).filter(function(b){ return /📥/.test(b.textContent); })
      .map(function(b){ return { txt:b.textContent.trim(), on:/\\bim\\b/.test(b.className) }; });
  };
  window.tocarRecoger=function(txt){
    var b=[].slice.call(document.querySelectorAll('#modal-box .prod-rev button')).filter(function(x){ return x.textContent.trim()===txt; })[0];
    if(b) b.click(); return !!b;
  };
`;

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const nueva = async () => {
    const page = await browser.newPage({ viewport:{width:1500,height:1000}, timezoneId:'America/La_Paz' });
    page.on('pageerror', e=>errores.push(e.message));
    page.on('dialog', d=>d.accept());
    await page.route(/^https?:/, r=>r.abort());
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    return page;
  };

  // ═══ 1. El botón está, y marca el almacén ════════════════════════════════════════
  console.log('\n── 1. El botón de Banzer en la ficha del pedido ──');
  {
    const page = await nueva();
    const r = await page.evaluate(async (base) => {
      eval(base);
      STATE=[ window._P({ productos:prod(2) }) ];
      showView('admin'); showPedidoModal('p1'); await new Promise(r=>setTimeout(r,120));
      var botones=botonesRecoger();
      window._saves=[];
      tocarRecoger('📥 Banzer'); await new Promise(r=>setTimeout(r,150));
      var x=findById('p1').productos[0];
      var guardado=(window._saves[0]||{}).productos||[];
      return { botones:botones, chk:x.chk, chkDe:x.chkDe, esRecoger:esRecoger(x), corto:RC(x),
               guardadoDe:(guardado[0]||{}).chkDe, guardadoChk:(guardado[0]||{}).chk, ayuda:AY() };
    }, BASE);
    chk('⚠️ la ficha tiene un botón por almacén: 📥 IM (el de siempre) y 📥 Banzer', r.botones.length===2 && r.botones[0].txt==='📥 IM' && r.botones[1].txt==='📥 Banzer', J(r.botones));
    chk('tocar «📥 Banzer» deja el producto como «hay, pero hay que ir a buscarlo» y anota el almacén', r.chk==='im' && r.chkDe==='Banzer' && r.esRecoger===true && r.corto==='Banzer', J([r.chk, r.chkDe, r.corto]));
    chk('⚠️ …y el almacén viaja a la planilla dentro del producto (sin columna nueva)', r.guardadoChk==='im' && r.guardadoDe==='Banzer', J([r.guardadoChk, r.guardadoDe]));
    chk('el renglón de ayuda nombra los dos almacenes', /recoger de IM o Banzer/.test(r.ayuda), r.ayuda.replace(/<[^>]+>/g,'').slice(0,90));
    await page.close();
  }
  {
    const page = await nueva();
    const r = await page.evaluate(async (base) => {
      eval(base);
      STATE=[ window._P({ productos:prod(2) }) ];
      showView('admin'); showPedidoModal('p1'); await new Promise(r=>setTimeout(r,120));
      var out={};
      tocarRecoger('📥 Banzer'); await new Promise(r=>setTimeout(r,120));
      out.banzer=RD(findById('p1').productos[0]);
      out.marcados1=botonesRecoger().filter(function(b){ return b.on; }).map(function(b){ return b.txt; });
      tocarRecoger('📥 IM'); await new Promise(r=>setTimeout(r,120));
      var x=findById('p1').productos[0];
      out.trasIM={ chk:x.chk, de:RD(x) };
      out.marcados2=botonesRecoger().filter(function(b){ return b.on; }).map(function(b){ return b.txt; });
      tocarRecoger('📥 IM'); await new Promise(r=>setTimeout(r,120));
      var y=findById('p1').productos[0];
      out.trasMismo={ chk:y.chk, de:RD(y), tieneCampo:('chkDe' in y) };
      return out;
    }, BASE);
    chk('⚠️ tocar el OTRO almacén cambia de lugar, no apaga la marca', r.banzer==='Banzer' && r.trasIM.chk==='im' && r.trasIM.de==='', J(r.trasIM));
    chk('…y solo queda marcado el botón del almacén elegido', r.marcados1.join(',')==='📥 Banzer' && r.marcados2.join(',')==='📥 IM', J([r.marcados1, r.marcados2]));
    chk('tocar el MISMO botón sí desmarca, y no deja el almacén colgado', r.trasMismo.chk==='' && r.trasMismo.de==='' && r.trasMismo.tieneCampo===false, J(r.trasMismo));
    await page.close();
  }

  // ═══ 2. Lo de antes sigue igual ══════════════════════════════════════════════════
  console.log('\n── 2. Lo marcado antes de este cambio sigue diciendo IM ──');
  {
    const page = await nueva();
    const r = await page.evaluate(async (base) => {
      eval(base);
      // un producto marcado con el panel VIEJO: chk 'im' y nada más
      STATE=[ window._P({ productos:prod(2,{chk:'im'}) }) ];
      var x=findById('p1').productos[0];
      showView('admin'); renderAdmin(); await new Promise(r=>setTimeout(r,120));
      var fila=(document.querySelector('#tbl-pedidos tbody tr')||{}).textContent||'';
      return { corto:RC(x), estado:estadoStock(findById('p1')).txt, fila:fila.replace(/\s+/g,' '),
               carga:prodTextCarga([x]).replace(/<[^>]+>/g,''), icono:prodChkIcon(x) };
    }, BASE);
    chk('un producto marcado con el panel viejo (sin almacén) sigue siendo «IM»', r.corto==='IM' && /Recoger de IM/.test(r.estado), r.corto+' · '+r.estado);
    chk('…y la lista de carga lo sigue diciendo igual', /RECOGER IM/.test(r.carga), r.carga.slice(0,70));
    await page.close();
  }

  // ═══ 3. Banzer se ve en todas las pantallas ══════════════════════════════════════
  console.log('\n── 3. Dónde hay que ir a buscarlo se ve en todas las pantallas ──');
  {
    const page = await nueva();
    const r = await page.evaluate(async (base) => {
      eval(base);
      STATE=[ window._P({ productos:prod(2,{chk:'im', chkDe:'Banzer'}) }) ];
      var p=findById('p1'), x=p.productos[0];
      var out={ estado:estadoStock(p).txt, carga:prodTextCarga([x]).replace(/<[^>]+>/g,''), icono:prodChkIcon(x),
                resumen:prodResumen(p).replace(/<[^>]+>/g,'') };
      showView('admin'); renderAdmin(); await new Promise(r=>setTimeout(r,100));
      out.tabla=(document.querySelector('#tbl-pedidos tbody tr')||{}).textContent.replace(/\s+/g,' ');
      showView('chofer'); var s=document.getElementById('cho-nombre');
      llenarSelectChoferes(); s.value='Luis Eyzaguirre'; CHO_FILTER='todos'; renderChofer(); await new Promise(r=>setTimeout(r,100));
      out.chofer=(document.getElementById('cho-lista')||{}).textContent.replace(/\s+/g,' ');
      showView('mis'); MIS_TODOS=true; MIS_FILTER='todos'; renderMis(); await new Promise(r=>setTimeout(r,100));
      out.mis=(document.getElementById('mis-lista')||{}).textContent.replace(/\s+/g,' ');
      // el Excel de Administración
      window._xl=null; var _b=buildXlsx; buildXlsx=function(sh){ window._xl=sh; return _b(sh); };
      showView('admin'); segSet('adm-mode','todo'); QUICK_FILTER=''; admTopeReset(); exportExcel('todo'); buildXlsx=_b;
      var fila=(window._xl&&window._xl[0].matrix[1])||[];
      out.excel=fila.map(function(c){ return (c&&c.v!=null)?String(c.v):''; }).join(' | ');
      return out;
    }, BASE);
    chk('⚠️ el estado del pedido dice «Recoger de Banzer»', /Recoger de Banzer/.test(r.estado), r.estado);
    chk('⚠️ la lista de carga manda al chofer a Banzer, no a IM', /RECOGER BANZER/.test(r.carga) && !/RECOGER IM/.test(r.carga), r.carga.slice(0,80));
    chk('⚠️ la tarjeta del chofer también', /recoger de Banzer/.test(r.chofer) && !/recoger de IM/.test(r.chofer), (r.chofer.match(/recoger de \w+/)||[''])[0]);
    chk('…y «Mis pedidos» de la vendedora', /recoge de Banzer|recoger de Banzer/.test(r.mis), (r.mis.match(/recoge\w* de \w+/)||[''])[0]);
    chk('…y la tabla de Administración', /Banzer/.test(r.tabla), (r.tabla.match(/Recoger de \w+[^·]{0,12}/)||[''])[0]);
    chk('…y el resumen debajo de los productos', /por recoger de Banzer/.test(r.resumen), r.resumen.slice(0,90));
    chk('⚠️ …y el Excel que se manda por correo', /RECOGER BANZER/.test(r.excel), (r.excel.match(/📥[^|]*/)||[''])[0]);
    await page.close();
  }

  // ═══ 4. La revisión automática reparte por almacén ═══════════════════════════════
  console.log('\n── 4. La revisión automática dice de qué almacén sale cada cosa ──');
  {
    const page = await nueva();
    const r = await page.evaluate(async (base) => {
      eval(base);
      STATE=[ window._P({ id:'p1', fecha:proximoDiaEntrega(), productos:prod(3) }) ];
      STOCK=stockVacio();
      STOCK.c={ f:todayStr(), hora:'09:00', u:{}, solo0:true, alm:'PRODUCTOS TERMINADOS FAB.' }; STOCK.c.u[K]=0;
      STOCK.g={ 'IM - PRODUCTOTERMINADO':{ f:todayStr(), u:{} }, 'BANZER':{ f:todayStr(), u:{} } };
      STOCK.g['IM - PRODUCTOTERMINADO'].u[K]=0;     // en Moreno no queda ninguno
      STOCK.g['BANZER'].u[K]=9;                     // están todos en Banzer
      STOCK.al={ 'PRODUCTOS TERMINADOS FAB.':'log', 'IM - PRODUCTOTERMINADO':'otro', 'BANZER':'otro' };
      stockOlvidarIndice();
      REVSTK_SOLO_VACIOS=true; REVSTK_DIAS='todos';
      var R=stockAsignar();
      var l=(R.pedidos[0]||{lineas:[]}).lineas[0]||{};
      var out={ ahora:l.ahora, alm:l.alm, deIM:l.deIM, traer:R.traerIM.map(function(o){ return o.nom+' × '+o.u+' — '+RAT(o); }) };
      // el botón de la ficha ahora sale del Excel cargado, con el nombre real del almacén
      out.botones=RL().map(function(A){ return A.corto; });
      // aplicar la revisión deja la marca CON el almacén
      REVSTK=R; window._saves=[];
      var t=''; var o2=window.copyText; window.copyText=function(x){t=x;}; copiarTraerIM(); window.copyText=o2;
      out.mensaje=t;
      return out;
    }, BASE);
    chk('⚠️ con el producto en Banzer y nada en Moreno, la revisión marca «recoger» desde BANZER', r.ahora==='im' && r.alm==='BANZER' && r.deIM===3, J([r.ahora, r.alm, r.deIM]));
    chk('…la lista para ir a buscar dice de qué almacén es', r.traer.length===1 && /BANZER/.test(r.traer[0]) && /× 3/.test(r.traer[0]), J(r.traer));
    chk('…y el mensaje para copiar también', /TRAER DE OTRO ALMACÉN/.test(r.mensaje) && /de BANZER/.test(r.mensaje), (r.mensaje.split('\n')[2]||'').slice(0,80));
    chk('el botón de la ficha toma el nombre real del almacén del Excel, sin duplicar Banzer', r.botones.join(',')==='IM,BANZER', J(r.botones));
    await page.close();
  }
  {
    const page = await nueva();
    const r = await page.evaluate(async (base) => {
      eval(base);
      // dos pedidos: el primero se lleva lo de Banzer, el segundo lo de Moreno
      STATE=[ window._P({ id:'a', fecha:proximoDiaEntrega(), cliente:'PRIMERO', productos:prod(3) }),
              window._P({ id:'b', fecha:diasAdelante(3), cliente:'SEGUNDO', productos:prod(2) }) ];
      STOCK=stockVacio();
      STOCK.c={ f:todayStr(), hora:'09:00', u:{}, solo0:true, alm:'PRODUCTOS TERMINADOS FAB.' }; STOCK.c.u[K]=0;
      STOCK.g={ 'IM - PRODUCTOTERMINADO':{ f:todayStr(), u:{} }, 'BANZER':{ f:todayStr(), u:{} } };
      STOCK.g['IM - PRODUCTOTERMINADO'].u[K]=2; STOCK.g['BANZER'].u[K]=3;
      STOCK.al={ 'PRODUCTOS TERMINADOS FAB.':'log', 'IM - PRODUCTOTERMINADO':'otro', 'BANZER':'otro' };
      stockOlvidarIndice();
      REVSTK_SOLO_VACIOS=true; REVSTK_DIAS='todos';
      var R=stockAsignar(), por={};
      R.pedidos.forEach(function(g){ por[g.p.id]=g.lineas[0]; });
      return { a:{ ahora:por.a.ahora, alm:por.a.alm }, b:{ ahora:por.b.ahora, alm:por.b.alm } };
    }, BASE);
    chk('⚠️ el que entrega antes se lleva el almacén que alcanza entero (3 de Banzer)…', r.a.ahora==='im' && r.a.alm==='BANZER', J(r.a));
    chk('…y el siguiente va al otro almacén (2 de Moreno), cada uno a UN solo lugar', r.b.ahora==='im' && r.b.alm==='IM - PRODUCTOTERMINADO', J(r.b));
    await page.close();
  }

  // ═══ 5. Editar el pedido no cambia de almacén ════════════════════════════════════
  console.log('\n── 5. Editar el pedido desde el formulario conserva el almacén ──');
  {
    const page = await nueva();
    const r = await page.evaluate(async (base) => {
      eval(base);
      var f=proximoDiaEntrega();
      // ⚠️ sin pagar: un pedido `pagado:true` hace que el formulario exija el MONTO COBRADO
      STATE=[ window._P({ fecha:f, pagado:false, saldo:1000, productos:prod(2,{chk:'im', chkDe:'Banzer'}) }) ];
      showView('mis'); editPedido('p1'); await new Promise(r=>setTimeout(r,120));
      document.getElementById('f-obs').value='cambio la observación nomás';
      window._toasts=[]; window._saves=[]; submitPedido(); await new Promise(r=>setTimeout(r,250));
      var x=findById('p1').productos[0];
      var out={ sinTocar:{ chk:x.chk, de:RD(x), obs:findById('p1').observaciones, toasts:window._toasts.slice(0,2) } };
      // …y si cambia la CANTIDAD, la revisión ya no vale: se borra la marca Y el almacén
      editPedido('p1'); await new Promise(r=>setTimeout(r,120));
      var cant=document.querySelector('#f-productos .prod-cant'); if(cant) cant.value='5';
      submitPedido(); await new Promise(r=>setTimeout(r,250));
      var y=findById('p1').productos[0];
      out.otraCant={ chk:y.chk||'', de:RD(y), tieneCampo:('chkDe' in y), cant:y.cant };
      return out;
    }, BASE);
    chk('⚠️ corregir cualquier cosa del pedido conserva «recoger de Banzer» (antes volvía a IM)', r.sinTocar.chk==='im' && r.sinTocar.de==='Banzer' && /observación/.test(r.sinTocar.obs), J(r.sinTocar));
    chk('…y si cambia la cantidad, la revisión se borra entera: ni marca ni almacén colgado', r.otraCant.chk==='' && r.otraCant.de==='' && r.otraCant.tieneCampo===false && Number(r.otraCant.cant)===5, J(r.otraCant));
    await page.close();
  }

  // ═══ 6. IM y «Industrias Moreno» son EL MISMO LUGAR ══════════════════════════════
  /* Lo encontró la revisión del 21/09. Es lo que se rompía HOY, con un solo Excel cargado:
     la revisión automática guardaba el nombre largo del Excel y el botón guardaba vacío, así
     que el mismo galpón quedaba con dos nombres. */
  console.log('\n── 6. IM y Moreno son el mismo lugar (un solo Excel cargado) ──');
  {
    const page = await nueva();
    const r = await page.evaluate(async (base) => {
      eval(base);
      STATE=[ window._P({ id:'a', fecha:proximoDiaEntrega(), productos:[
        { desc:'TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:2 },
        { desc:'TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, chk:'im' } ] }) ];
      STOCK=stockVacio();
      STOCK.c={ f:todayStr(), hora:'09:00', u:{}, solo0:true, alm:'PRODUCTOS TERMINADOS FAB.' }; STOCK.c.u[K]=0;
      STOCK.g={ 'IM - PRODUCTOTERMINADO':{ f:todayStr(), u:{} } };   // el ÚNICO Excel de hoy
      STOCK.g['IM - PRODUCTOTERMINADO'].u[K]=9;
      STOCK.al={ 'PRODUCTOS TERMINADOS FAB.':'log', 'IM - PRODUCTOTERMINADO':'otro' };
      stockOlvidarIndice();
      REVSTK_SOLO_VACIOS=true; REVSTK_DIAS='todos';
      REVSTK=stockAsignar(); aplicarStockRevisar(); await new Promise(r=>setTimeout(r,500));
      var p=findById('a'), x=p.productos[0];
      var out={ chkDe:('chkDe' in x)?x.chkDe:'(no existe)', corto:RC(x),
                estado:estadoStock(p), lugares:(typeof recogerLugaresTxt==='function')?recogerLugaresTxt(p):'?' };
      abrirCarga(); setCargaDia('manana'); await new Promise(r=>setTimeout(r,200));
      out.carga=(document.getElementById('carga-body')||{textContent:''}).textContent.replace(/\s+/g,' ');
      closeCarga(); showView('admin'); showPedidoModal('a'); await new Promise(r=>setTimeout(r,150));
      out.marcados=botonesRecoger().filter(function(b){ return b.on; }).map(function(b){ return b.txt; });
      tocarRecoger('📥 IM'); await new Promise(r=>setTimeout(r,150));
      out.trasUnToque=findById('a').productos[0].chk||'';
      return out;
    }, BASE);
    chk('⚠️ la revisión NO guarda el nombre largo del Excel: IM sigue siendo el vacío de siempre', r.chkDe==='(no existe)' && r.corto==='IM', J([r.chkDe, r.corto]));
    chk('⚠️ el pedido NO dice «Recoger de Moreno + IM»: es un solo lugar', r.lugares==='IM' && !/Moreno/.test(r.estado), J([r.lugares, r.estado]));
    chk('…y la lista de carga sigue diciendo RECOGER IM, como siempre', /RECOGER IM/.test(r.carga) && !/RECOGER MORENO/.test(r.carga), (r.carga.match(/📥 RECOGER [A-ZÁÉÍÓÚ +0-9]+/)||[''])[0]);
    chk('⚠️ en la ficha queda encendido el botón 📥 IM de las dos líneas (antes no se encendía ninguno)', r.marcados.length===2 && r.marcados.every(function(t){ return t==='📥 IM'; }), J(r.marcados));
    chk('…y UN solo toque lo desmarca (antes hacían falta dos)', r.trasUnToque==='', J(r.trasUnToque));
    await page.close();
  }

  // ═══ 7. Una línea repartida entre dos almacenes dice LOS DOS ═════════════════════
  /* El peor de los hallazgos: con 3 en Moreno y 1 en Banzer, un pedido de 4 decía «RECOGER
     MORENO × 4». El que iba volvía con 3 y el panel seguía creyendo que estaba cubierto. */
  console.log('\n── 7. Una línea que sale de dos almacenes los nombra a los dos ──');
  {
    const page = await nueva();
    const r = await page.evaluate(async (base) => {
      eval(base);
      STATE=[ window._P({ id:'a', fecha:proximoDiaEntrega(), productos:prod(4) }) ];
      STOCK=stockVacio();
      STOCK.c={ f:todayStr(), hora:'09:00', u:{}, solo0:true, alm:'PRODUCTOS TERMINADOS FAB.' }; STOCK.c.u[K]=0;
      STOCK.g={ 'IM - PRODUCTOTERMINADO':{ f:todayStr(), u:{} }, 'BANZER':{ f:todayStr(), u:{} } };
      STOCK.g['IM - PRODUCTOTERMINADO'].u[K]=3; STOCK.g['BANZER'].u[K]=1;
      STOCK.al={ 'PRODUCTOS TERMINADOS FAB.':'log', 'IM - PRODUCTOTERMINADO':'otro', 'BANZER':'otro' };
      stockOlvidarIndice();
      REVSTK_SOLO_VACIOS=true; REVSTK_DIAS='todos';
      var R=stockAsignar(), l=R.pedidos[0].lineas[0];
      var out={ deIM:l.deIM, por:(l.almPor||[]).map(function(e){ return (e.alm||'IM')+':'+e.u; }),
                traer:R.traerIM.map(function(o){ return o.u+' — '+RAT(o); }) };
      REVSTK=R; aplicarStockRevisar(); await new Promise(r=>setTimeout(r,500));
      var p=findById('a'), x=p.productos[0];
      out.corto=RC(x); out.des=(x.chkDes||[]).map(function(e){ return (e.de||'IM')+':'+e.u; });
      var g=(window._saves[window._saves.length-1]||{}).productos||[];
      out.guardado=((g[0]||{}).chkDes||[]).map(function(e){ return (e.de||'IM')+':'+e.u; });
      abrirCarga(); setCargaDia('manana'); await new Promise(r=>setTimeout(r,200));
      out.carga=(document.getElementById('carga-body')||{textContent:''}).textContent.replace(/\s+/g,' ');
      return out;
    }, BASE);
    chk('⚠️ las 4 se reparten 3 Moreno + 1 Banzer, y la línea guarda el desglose', r.deIM===4 && r.por.join(' ')==='IM - PRODUCTOTERMINADO:3 BANZER:1', J(r.por));
    chk('…la lista para ir a buscar dice cuántas hay en cada uno', /IM 3/.test(r.traer.join('')) && /BANZER 1/.test(r.traer.join('')), J(r.traer));
    chk('⚠️ el pedido queda diciendo los dos lugares (antes mandaba a buscar 4 donde había 3)', /IM 3/.test(r.corto) && /BANZER 1/.test(r.corto), r.corto);
    chk('…el desglose viaja a la planilla dentro del producto', r.des.join(' ')==='IM:3 BANZER:1' && r.guardado.join(' ')==='IM:3 BANZER:1', J([r.des, r.guardado]));
    chk('…y la lista de carga lo dice también', /BANZER/.test(r.carga) && /IM 3/.test(r.carga), (r.carga.match(/📥 RECOGER [^·]{0,30}/)||[''])[0]);
    await page.close();
  }

  // ═══ 8. Cambiar de almacén ES un cambio, y se avisa lo que no cierra ═════════════
  console.log('\n── 8. Cambiar de almacén se propone Y se aplica ──');
  {
    const page = await nueva();
    const r = await page.evaluate(async (base) => {
      eval(base);
      // marcado a mano «Banzer», pero en Banzer no queda ninguno: están todos en Moreno
      STATE=[ window._P({ id:'a', fecha:proximoDiaEntrega(), productos:prod(2,{chk:'im', chkDe:'BANZER'}) }) ];
      STOCK=stockVacio();
      STOCK.c={ f:todayStr(), hora:'09:00', u:{}, solo0:true, alm:'PRODUCTOS TERMINADOS FAB.' }; STOCK.c.u[K]=0;
      STOCK.g={ 'IM - PRODUCTOTERMINADO':{ f:todayStr(), u:{} }, 'BANZER':{ f:todayStr(), u:{} } };
      STOCK.g['IM - PRODUCTOTERMINADO'].u[K]=5; STOCK.g['BANZER'].u[K]=0;
      STOCK.al={ 'PRODUCTOS TERMINADOS FAB.':'log', 'IM - PRODUCTOTERMINADO':'otro', 'BANZER':'otro' };
      stockOlvidarIndice();
      REVSTK_DIAS='todos';
      // (a) con «revisar también lo ya marcado»: se propone Y se aplica
      REVSTK_SOLO_VACIOS=false;
      REVSTK=stockAsignar();
      var l=REVSTK.pedidos[0].lineas[0];
      var out={ cambia:l.cambia, contra:l.contra, nCambios:revStkCambios().length };
      renderStockRevisar(); await new Promise(r=>setTimeout(r,150));
      var filas=[].slice.call(document.querySelectorAll('#modal-box tbody tr')).map(function(t){ return t.textContent.replace(/\s+/g,' '); });
      out.estaba=(filas[0]||'');
      aplicarStockRevisar(); await new Promise(r=>setTimeout(r,500));
      out.tras=RC(findById('a').productos[0]);
      // (b) con «solo las sin marcar»: no la toca, pero AVISA que apunta a un almacén vacío
      STATE=[ window._P({ id:'a', fecha:proximoDiaEntrega(), productos:prod(2,{chk:'im', chkDe:'BANZER'}) }) ];
      REVSTK_SOLO_VACIOS=true;
      REVSTK=stockAsignar();
      out.almMal=(REVSTK.almMal||[]).map(function(m){ return m.dice+'→'+m.esta; });
      renderStockRevisar(); await new Promise(r=>setTimeout(r,150));
      out.cartel=(document.getElementById('modal-box')||{textContent:''}).textContent.replace(/\s+/g,' ');
      return out;
    }, BASE);
    chk('⚠️ cambiar de almacén cuenta como cambio y Aplicar SÍ lo toca (antes se proponía y no pasaba nada)', r.cambia===true && r.nCambios===1 && r.tras==='IM', J([r.cambia, r.nCambios, r.tras]));
    chk('…y la columna «Estaba» dice el almacén que estaba marcado, no IM', /recoger de BANZER/.test(r.estaba), r.estaba.slice(0,110));
    chk('⚠️ sin tocar nada, el panel avisa que la marca apunta a un almacén que no tiene esas unidades', r.almMal.join(',')==='BANZER→IM', J(r.almMal));
    chk('…y el aviso se ve en la pantalla de la revisión', /el almacén que dice la marca no tiene esas unidades/.test(r.cartel), /almacén que dice la marca/.test(r.cartel));
    await page.close();
  }

  // ═══ 9. «Banzer» a mano y «01-05-006 BANZER» del Excel son el mismo almacén ══════
  console.log('\n── 9. El nombre del botón y el del Excel son el mismo lugar ──');
  {
    const page = await nueva();
    const r = await page.evaluate(async (base) => {
      eval(base);
      // marcado a mano con el literal del botón, ANTES de que existiera el Excel de Banzer
      STATE=[ window._P({ id:'a', fecha:proximoDiaEntrega(), cliente:'PRIMERO', productos:prod(2,{chk:'im', chkDe:'Banzer'}) }),
              window._P({ id:'b', fecha:diasAdelante(3), cliente:'SEGUNDO', productos:prod(2) }) ];
      STOCK=stockVacio();
      STOCK.c={ f:todayStr(), hora:'09:00', u:{}, solo0:true, alm:'PRODUCTOS TERMINADOS FAB.' }; STOCK.c.u[K]=0;
      // …y ahora sube el Excel, que lo llama con el código adelante y otra palabra
      STOCK.g={ 'IM - PRODUCTOTERMINADO':{ f:todayStr(), u:{} }, '01-05-006 ALMACEN BANZER':{ f:todayStr(), u:{} } };
      STOCK.g['IM - PRODUCTOTERMINADO'].u[K]=4; STOCK.g['01-05-006 ALMACEN BANZER'].u[K]=2;
      STOCK.al={ 'PRODUCTOS TERMINADOS FAB.':'log', 'IM - PRODUCTOTERMINADO':'otro', '01-05-006 ALMACEN BANZER':'otro' };
      stockOlvidarIndice();
      REVSTK_SOLO_VACIOS=true; REVSTK_DIAS='todos';
      var R=stockAsignar();
      var out={ botones:RL().map(function(A){ return A.corto; }),
                sobra:R.sobraIM[K], almMal:(R.almMal||[]).length,
                segundo:(R.pedidos[0]||{lineas:[{}]}).lineas[0] };
      out.segundo={ id:R.pedidos[0].p.id, ahora:out.segundo.ahora, alm:out.segundo.alm };
      showView('admin'); showPedidoModal('a'); await new Promise(r=>setTimeout(r,150));
      out.marcados=botonesRecoger().filter(function(b){ return b.on; }).map(function(b){ return b.txt; });
      return out;
    }, BASE);
    chk('⚠️ el Excel no agrega un SEGUNDO botón para el mismo almacén', r.botones.join(',')==='IM,ALMACEN BANZER', J(r.botones));
    chk('⚠️ la marca vieja «Banzer» sigue reservando de Banzer: nadie avisa que apunte a otro lado', r.almMal===0, J([r.almMal, r.sobra]));
    chk('…así que el pedido siguiente va a Moreno con razón', r.segundo.id==='b' && r.segundo.alm==='IM - PRODUCTOTERMINADO', J(r.segundo));
    chk('⚠️ y en la ficha el botón del almacén se ve encendido igual (con el nombre recortado para que entre)', r.marcados.length===1 && /^📥 ALMACEN BAN…$/.test(r.marcados[0]), J(r.marcados));
    await page.close();
  }

  // ═══ 10. El mensaje de WhatsApp que lee el que va a buscar ═══════════════════════
  console.log('\n── 10. El WhatsApp del grupo dice de qué almacén ──');
  {
    const page = await nueva();
    const r = await page.evaluate(async (base) => {
      eval(base);
      var f=proximoDiaEntrega();
      STATE=[ window._P({ id:'a', fecha:f, productos:prod(2,{chk:'im', chkDe:'Banzer'}) }) ];
      return { txt:String(envioTexto('manana')).replace(/\s+/g,' ') };
    }, BASE);
    chk('⚠️ el mensaje dice «RECOGER DE BANZER», no «RECOGER DE IM» para todo', /RECOGER DE BANZER/.test(r.txt) && !/RECOGER DE IM/.test(r.txt), (r.txt.match(/📥 RECOGER DE [A-ZÁÉÍÓÚ +0-9]+/)||['(no salió el mensaje)'])[0]);
    chk('…y el resumen de arriba también', /📥 1 de Banzer/.test(r.txt), (r.txt.match(/📥 \d+ de [^·]{0,22}/)||[''])[0]);
    await page.close();
  }

  // ═══ 11. El orden que dictó el dueño: acá → Banzer → IM ══════════════════════════
  /* 21/09, textual: *«la idea es tener primero a la mano en fábrica que es de donde salen
     los camiones, luego banzer y si no hay pedir fabricar a IM o recoger de IM»*.
     ⚠️ No cambiar sin que él lo pida: antes el panel elegía «el que más tenga» y mandaba a
     IM con 5 aunque en Banzer alcanzara con 4. */
  console.log('\n── 11. Primero lo de acá, después Banzer, IM al final ──');
  {
    const page = await nueva();
    const casos = [
      { g:[0,5,4], n:2, espera:'BANZER 2',         que:'con lugar en los dos, va a Banzer aunque IM tenga más' },
      { g:[0,5,1], n:2, espera:'IM 2',             que:'…pero si en Banzer no alcanza, va entero a IM (un viaje, no dos)' },
      { g:[0,5,4], n:7, espera:'BANZER 4 + IM 3',  que:'si no alcanza en ninguno, vacía Banzer y completa con IM' },
      { g:[3,5,4], n:5, espera:'BANZER 2',         que:'⚠️ lo que está ACÁ EN FÁBRICA se usa primero que todo' }
    ];
    for (const c of casos) {
      const r = await page.evaluate(async (s) => {
        eval(s.base);
        STOCK=stockVacio();
        STOCK.c={ f:todayStr(), hora:'09:00', u:{}, solo0:true, alm:'PRODUCTOS TERMINADOS FAB.' }; STOCK.c.u[K]=s.g[0];
        STOCK.g={ 'IM - PRODUCTOTERMINADO':{ f:todayStr(), u:{} }, 'BANZER':{ f:todayStr(), u:{} } };
        STOCK.g['IM - PRODUCTOTERMINADO'].u[K]=s.g[1]; STOCK.g['BANZER'].u[K]=s.g[2];
        STOCK.al={ 'PRODUCTOS TERMINADOS FAB.':'log', 'IM - PRODUCTOTERMINADO':'otro', 'BANZER':'otro' };
        stockOlvidarIndice();
        STATE=[ window._P({ id:'a', fecha:proximoDiaEntrega(), productos:prod(s.n) }) ];
        REVSTK_SOLO_VACIOS=true; REVSTK_DIAS='todos';
        var l=stockAsignar().pedidos[0].lineas[0];
        return { aca:l.deDep, donde:(l.almPor||[]).map(function(e){ return recogerAlmCorto(e.alm)+' '+e.u; }).join(' + ') };
      }, { base:BASE, g:c.g, n:c.n });
      chk(c.que, r.donde===c.espera && (c.g[0]===0 || r.aca===c.g[0]),
          'acá '+c.g[0]+' · IM '+c.g[1]+' · Banzer '+c.g[2]+' → pedido de '+c.n+': '+(r.aca?(r.aca+' de acá + '):'')+r.donde);
    }
    await page.close();
  }

  // ═══ 12. El nombre REAL del reporte de Moreno ════════════════════════════════════
  /* ⚠️ El 21/09 el dueño mandó el reporte de existencias de Banzer y el almacén se llama
     «01-05-025  Almacen Distribucion Banzer» — 27 letras. El corte a 22 dejaba «Almacen
     Distribucion …», o sea SIN la palabra Banzer: dos botones para el mismo lugar, la
     tarjeta del chofer sin decir adónde ir, y toda marca puesta a mano como «Banzer»
     huérfana (la reserva salía del otro almacén). Solo hay UNA oportunidad de que esto
     esté bien: el día que suba el Excel. */
  console.log('\n── 12. El nombre largo del reporte real no pierde lo que distingue ──');
  {
    const page = await nueva();
    const r = await page.evaluate(async (base) => {
      eval(base);
      var real='01-05-025  Almacen Distribucion Banzer';
      STOCK=stockVacio();
      STOCK.c={ f:todayStr(), hora:'09:00', u:{}, solo0:true, alm:'PRODUCTOS TERMINADOS FAB.' }; STOCK.c.u[K]=0;
      STOCK.g={ 'IM - PRODUCTOTERMINADO':{ f:todayStr(), u:{} } }; STOCK.g['IM - PRODUCTOTERMINADO'].u[K]=4;
      STOCK.g[real]={ f:todayStr(), u:{} }; STOCK.g[real].u[K]=3;
      STOCK.al={ 'PRODUCTOS TERMINADOS FAB.':'log', 'IM - PRODUCTOTERMINADO':'otro' }; STOCK.al[real]='otro';
      stockOlvidarIndice();
      // un pedido marcado A MANO como «Banzer» ANTES de que existiera el Excel
      STATE=[ window._P({ id:'a', fecha:proximoDiaEntrega(), productos:prod(2,{chk:'im', chkDe:'Banzer'}) }) ];
      REVSTK_SOLO_VACIOS=true; REVSTK_DIAS='todos';
      var R=stockAsignar();
      var out={ corto:stockAlmCorto(real), mismo:recogerMismo('Banzer', real),
                botones:RL().map(function(A){ return A.corto; }),
                almMal:(R.almMal||[]).length, sobra:R.sobraIM[K],
                log:stockAlmCorto('01-05-003 PRODUCTOS TERMINADOS FAB.') };
      showView('admin'); showPedidoModal('a'); await new Promise(r=>setTimeout(r,150));
      out.marcados=botonesRecoger().filter(function(b){ return b.on; }).map(function(b){ return b.txt; });
      out.estado=estadoStock(findById('a')).txt;
      return out;
    }, BASE);
    chk('⚠️ «01-05-025  Almacen Distribucion Banzer» se muestra como «Banzer», no «Almacen Distribucion …»', r.corto==='Banzer', r.corto);
    chk('⚠️ …así la marca puesta a mano como «Banzer» sigue siendo el mismo almacén', r.mismo===true, J(r.mismo));
    chk('⚠️ …un solo botón para ese lugar (no «Banzer» + «Almacen Distr…»)', r.botones.join(',')==='IM,Banzer', J(r.botones));
    chk('…el botón queda encendido y el pedido dice adónde ir', r.marcados.join(',')==='📥 Banzer' && /Banzer/.test(r.estado), J([r.marcados, r.estado]));
    chk('⚠️ …y la reserva sale de Banzer, no del otro almacén (quedan 4 de IM)', r.almMal===0 && r.sobra===5, J([r.almMal, r.sobra]));
    chk('⚠️ el almacén de logística NO se convirtió en «FAB.» al sacarle las palabras genéricas', r.log==='PRODUCTOS TERMINADOS …', r.log);
    await page.close();
  }

  // ═══ 13. 🚚 Programar recogida respeta el orden del dueño ════════════════════════
  /* §4fd: el modal elegía el almacén por el ORDEN EN QUE SE CARGARON LOS EXCEL
     (`Object.keys(otrosAlm)[0]`), no por la regla de §4ey. Con IM 9 y Banzer 9 agendaba
     contra IM, gastaba el stock de la fábrica y lo de Banzer seguía parado. */
  console.log('\n── 13. La recogida se agenda contra Banzer antes que contra IM ──');
  {
    const page = await nueva();
    const r = await page.evaluate(async (base) => {
      eval(base);
      var real='01-05-025  Almacen Distribucion Banzer';
      STOCK=stockVacio();
      STOCK.c={ f:todayStr(), hora:'09:00', u:{}, solo0:true, alm:'PRODUCTOS TERMINADOS FAB.' }; STOCK.c.u[K]=0;
      STOCK.g={ 'IM - PRODUCTOTERMINADO':{ f:todayStr(), u:{} } }; STOCK.g['IM - PRODUCTOTERMINADO'].u[K]=9;
      STOCK.g[real]={ f:todayStr(), u:{} }; STOCK.g[real].u[K]=9;
      STOCK.al={ 'PRODUCTOS TERMINADOS FAB.':'log', 'IM - PRODUCTOTERMINADO':'otro' }; STOCK.al[real]='otro';
      STOCK.p=[]; stockOlvidarIndice(); STATE=[];
      abrirStockRecogida(); await new Promise(r=>setTimeout(r,150));
      document.getElementById('stk-rec-k').value=K;
      document.getElementById('stk-rec-u').value='3';
      document.getElementById('stk-rec-f').value=tomorrowStr();
      guardarStockRecogida(); await new Promise(r=>setTimeout(r,200));
      var q=(STOCK.p||[])[0]||{};
      return { de:q.de||'', corto:recogerAlmCorto(q.de||''), u:q.u||0 };
    }, BASE);
    chk('⚠️ con IM y Banzer empatados, la recogida se agenda contra Banzer (IM va último)', r.corto==='Banzer' && r.u===3, J(r));
    await page.close();
  }

  chk('sin errores JS', errores.length===0, J(errores));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
