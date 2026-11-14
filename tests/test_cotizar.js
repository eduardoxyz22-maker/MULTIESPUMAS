/* 🧾 COTIZAR (14/11, mejora 251; y la parte de la página de la 274, «el bot le escribe a las 48 h»).
   El dueño aprobó la 251: al que solo pregunta y se va no se le pide nada; la cotización es para el cliente que PIDE PRECIO para pensarlo y
   deja su celular para recibirla. La guarda el servidor 2026-11-14-b (`cotGuardar`, `cotMarcar`, `cotLeer`): acá se simula `apiPost`.

   Lo que cuida:
   0. Sin `COT_PRUEBA` (las demás pruebas) nada cambia: el selector sigue «OC, ATC, RPT», sin «🧾 Cotizar» ni el botón de Proyección.
   1. Con un servidor anterior a 2026-11-14-b, «🧾» dice que falta implementarlo y el formulario sigue en 📄 OC.
   2. El tipo 🧾 esconde lo de una venta y una entrega (fecha, turno, zona, ubicación, dirección, nota, cobro, factura, garantía, observaciones,
      N° de OC) y muestra «Vale hasta» (7 días; «hasta el fin de Black Friday» mientras dura) y «Entrega desde».
   3. Celular de WhatsApp y precio OBLIGATORIOS; el nombre no. «Vale hasta» de hoy en adelante.
   4. Guardar: la cola DURABLE de este aparato tiene la cotización ANTES de mandarla; la confirmación la saca; el número que pone el servidor
      llega a la ventana y a la imagen (canvas 1080 de ancho, dibujado); el texto para copiar; WhatsApp baja la imagen y abre el chat del
      cliente; el toque `fin` del mall. NO entra a «Pedidos»: ni Administración, ni Contabilidad, ni Proyección, ni stock, ni cupos.
   5. Sin red se queda en el aparato y se reintenta sin duplicar (mismo id); una confirmación saca SOLO lo que se mandó; un «no» firme sale
      de la cola y se dice; sin lugar en el aparato no se manda nada.
   6. «Para hacer»: lo que el cliente le pidió al bot (que lo llamen) arriba de todo en rojo, «📞 Llamar a N cotizaciones», las vencidas y
      «dice que ya compró»; ⏰ Volver a llamar, ✗ No le interesa (con motivo), 🔁 Renovar, «Sí, con nosotros» (une su venta) y «No».
   7. «✓ Compró» abre la OC NUEVA llena; al guardarla la cotización pasa a «compró» con el id del pedido y el vínculo `cot` queda en los
      productos (y `heredarMarcas` lo pasa: corregir la venta no vuelve a marcar).
   8. Proyección → «🧾 Cotizaciones» (con la contraseña): hechas, el bot (APAGADO lo dice), pidieron llamada, compraron y en cuántos días,
      por vendedor y por tienda, motivos; Copiar y Excel.
   Reloj clavado: sábado 14/11/2026 10:00 de Bolivia (Black Friday corre del 13 al 30/11). Datos inventados (el repo es público).
   Capturas: CAPTURAS=1 deja /tmp/mall_cot_*.png.   Se corre:  node tests/test_cotizar.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const HOY = '2026-11-14T10:00:00-04:00';
const CAPT = process.env.CAPTURAS ? '/tmp' : '';

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=false; SERVER_VER='2026-11-14-a';
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_REFRESCO=Date.now(); ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  loadFromServer=function(){};
  try{ localStorage.removeItem(LS_PEND); localStorage.removeItem('me_cot_cola'); localStorage.removeItem('me_cot_srv'); }catch(e){}
  window._L=[];
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window._L)) }); };
  window._saves=[];
  apiSave=function(r){ var g=JSON.parse(JSON.stringify(r)); window._saves.push(g); window._L=window._L.filter(function(x){ return x.id!==g.id; }).concat([g]); return Promise.resolve({ ok:true, pedido:g }); };
  /* El servidor de mentira de las cotizaciones: `_modo` = 'ok' | 'red' (sin red) | 'firme' (un «no») | 'espera' (no contesta hasta `_libera()`) */
  window._calls=[]; window._modo='ok'; window._srv={}; window._n=13; window._esperan=[];
  window._resp=function(p){
    if(p.action==='cotGuardar'){ var c=Object.assign({}, window._srv[p.cot.id]||{ estado:'abierta', llamadas:[], bot:'', rev:0 }, p.cot);
      if(!c.num) c.num='COT 11-0'+(++window._n); c.rev=(Number(c.rev)||0)+1; if(!c.dia) c.dia=isoDeTsBolivia(c.ts); delete c._pend; window._srv[c.id]=c; return { ok:true, cot:JSON.parse(JSON.stringify(c)) }; }
    if(p.action==='cotMarcar'){ var d=window._srv[p.id]; if(!d) return { ok:false, error:'no_existe' };
      if(p.estado) d.estado=p.estado; if(p.motivo!=null) d.motivo=p.motivo; if(p.pedido!=null) d.pedido=p.pedido; if(p.prox) d.prox=p.prox;
      if(p.llamada && !(d.llamadas||[]).some(function(l){ return l.t===p.llamada.t; })) d.llamadas=(d.llamadas||[]).concat([p.llamada]);
      return { ok:true, cot:JSON.parse(JSON.stringify(d)) }; }
    if(p.action==='cotLeer') return { ok:true, cots:Object.keys(window._srv).map(function(k){ return JSON.parse(JSON.stringify(window._srv[k])); }) };
    if(p.action==='list') return { ok:true, pedidos:JSON.parse(JSON.stringify(window._L)) };
    return { ok:true };
  };
  apiPost=function(p){
    var q=JSON.parse(JSON.stringify(p)); window._calls.push(q);
    if(p.action==='list') return Promise.resolve(window._resp(q));
    if(window._modo==='red') return Promise.reject(new Error('sin_red'));
    if(window._modo==='firme') return Promise.resolve({ ok:false, error:'datos_malos' });
    if(window._modo==='espera') return new Promise(function(res){ window._esperan.push(function(){ res(window._resp(q)); }); });
    return Promise.resolve(window._resp(q));
  };
  window._libera=function(){ var L=window._esperan; window._esperan=[]; L.forEach(function(f){ f(); }); };
  window._cot=function(){ return window._calls.filter(function(c){ return /^cot/.test(c.action); }); };
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  window._toast=function(){ return (document.getElementById('toast')||{}).textContent||''; };
  window._vis=function(id){ var e=document.getElementById(id); return !!e && e.offsetParent!==null; };
  window._mallToques=[]; window.mallCotHecha=function(c){ window._mallToques.push(['fin', { r:'anoto', ref:c && c.id }]); };   /* el gancho del mall (252) que llama la cotización */
  window._copiado=''; copyText=function(t){ window._copiado=String(t); };
  window._bajados=[]; downloadBlob=function(b, nombre){ window._bajados.push(nombre); };
  window._abiertos=[]; window.open=function(u){ window._abiertos.push(String(u)); return null; };
  /* Llena el formulario en 🧾 (ya abierto) */
  window._llenar=function(o){
    o=o||{};
    var s=function(id, v){ var e=document.getElementById(id); e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); };
    s('f-vendedor', o.vend||'Carola Chavez'); s('f-cliente', o.cli!=null?o.cli:'ANA PRUEBA'); s('f-celular', o.cel!=null?o.cel:'70012345');
    var box=document.getElementById('f-productos'); box.innerHTML='';
    (o.prods||[['COLCHON TITANIO LATEX','160x190','',1,'3500'],['ALMOHADA','50x70','',2,'150']]).forEach(function(x){ addProdRow(x[0], x[1], x[2], x[3], ''); var pe=box.lastElementChild.querySelector('.prod-precio'); pe.value=x[4]; pe.dispatchEvent(new Event('input',{bubbles:true})); });
    refreshDelButtons(); pintarTotalProds();
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  async function abrir(w, h, init){
    const ctx = await browser.newContext({ viewport:{ width:w||1440, height:h||950 }, timezoneId:'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r=>r.abort());
    if(init) await ctx.addInitScript(init);
    const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
    await page.clock.setFixedTime(new Date(HOY));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(350);
    await page.evaluate(PREPARAR);
    page._ctx=ctx; return page;
  }
  const ev=(page, f, a)=>page.evaluate(f, a).catch(e=>({ __err:String((e&&e.message)||e).slice(0,300) }));

  // ── 0. Sin la bandera: como antes ──
  let page = await abrir(1440, 950, ()=>{ window.FH_PRUEBA=1; });
  let r = await ev(page, () => { showView('form'); resetForm(); fhPintar();
    return { btns:[].map.call(document.querySelectorAll('#f-doc-tipo button'), function(b){ return b.dataset.val; }).join(),
             fh:!!document.querySelector('#fh .fh-cot'), pry:document.getElementById('pry-cot-w').hidden, cotiz:document.getElementById('view-form').classList.contains('cotizando') }; });
  chk('0 · sin `COT_PRUEBA` (las demás pruebas) el selector sigue «OC, ATC, RPT», sin «🧾 Cotizar» arriba ni el botón de Proyección',
      r.btns==='OC,ATC,RPT' && !r.fh && r.pry===true && !r.cotiz, r);
  await page._ctx.close();

  page = await abrir(1280, 950, ()=>{ window.COT_PRUEBA=1; window.FH_PRUEBA=1; });

  // ── 1. Servidor anterior ──
  r = await ev(page, () => { showView('form'); resetForm(); fhPintar();
    var b=document.querySelector('#fh .fh-cot'), off=!!b && b.classList.contains('off');
    document.querySelector('#f-doc-tipo button[data-val="COT"]').click();
    var o={ btns:[].map.call(document.querySelectorAll('#f-doc-tipo button'), function(b){ return b.dataset.val; }).join(), off:off, tipo:docTipoSel(),
            modal:document.getElementById('modal').classList.contains('on') ? document.getElementById('modal-box').innerText.replace(/\s+/g,' ') : '' };
    closeModal(); o.emp=cotEmpezar(); o.modal2=document.getElementById('modal-box').innerText.replace(/\s+/g,' '); closeModal(); return o; });
  chk('1a · con `COT_PRUEBA` hay un 4° botón «🧾 Cotización» y «🧾 Cotizar» arriba (apagadito: el servidor no lo tiene)', r.btns==='OC,ATC,RPT,COT' && r.off, r);
  chk('1b · con el servidor 2026-11-14-a, tocar 🧾 dice que falta implementar el servidor y el formulario queda en 📄 OC',
      r.tipo==='OC' && /Falta implementar el servidor/.test(r.modal) && /2026-11-14-b/.test(r.modal) && /2026-11-14-a/.test(r.modal), r);
  chk('1c · «🧾 Cotizar» de arriba dice lo mismo', r.emp===false && /Falta implementar el servidor/.test(r.modal2), r.modal2);

  // ── 2. El formulario en 🧾 ──
  r = await ev(page, () => { SERVER_VER='2026-11-14-b'; fhPintar(); document.querySelector('#fh .fh-cot').click();
    var vis=_vis, o={ tipo:docTipoSel(), cot:document.getElementById('view-form').classList.contains('cotizando'),
      escondidos:{ fecha:vis('f-fecha'), turno:vis('f-turno'), zona:vis('f-zona'), maps:vis('f-maps'), dir:vis('f-direccion'), nota:vis('f-nota'), cobro:vis('wrap-cobro-todo'),
                   facturar:vis('f-facturar'), garantia:vis('f-garantia'), obs:vis('f-obs'), oc:vis('f-oc'), agenda:vis('fx-izq') },
      aVista:{ bloque:vis('wrap-cot'), cliente:vis('f-cliente'), celular:vis('f-celular'), productos:vis('f-productos'), precio:!!document.querySelector('#f-productos .prod-precio') && document.querySelector('#f-productos .prod-precio').offsetParent!==null },
      opcional:getComputedStyle(document.querySelector('#wrap-cliente .cot-i')).display!=='none', ast:getComputedStyle(document.querySelector('#wrap-cliente .req.no-cot')).display,
      boton:document.getElementById('f-submit').textContent, vence:document.getElementById('f-cot-vence').value, h3:(document.querySelector('#fh h3')||{}).textContent,
      bts:[].map.call(document.querySelectorAll('#f-cot-vence-bt button'), function(b){ return b.textContent; }), rot:String(document.getElementById('f-oc-lb').childNodes[0].nodeValue).trim(),
      tienda:document.getElementById('f-cot-tienda').innerText };
    var bf=document.querySelector('#f-cot-vence-bt button.bf'); if(bf) bf.click(); o.venceBf=document.getElementById('f-cot-vence').value;
    document.querySelector('#f-cot-vence-bt button').click(); o.vence7=document.getElementById('f-cot-vence').value;
    return o; });
  chk('2a · «🧾 Cotizar» pasa el formulario a cotización («Nueva cotización» arriba, «N° de cotización», «🧾 Guardar cotización»)',
      r.tipo==='COT' && r.cot && r.h3==='Nueva cotización' && r.rot==='N° de cotización' && r.boton==='🧾 Guardar cotización', r);
  chk('2b · se esconde todo lo de una venta y una entrega: fecha, turno, zona, ubicación, dirección, nota, cobro, factura, garantía, observaciones, N° de OC y la agenda',
      Object.keys(r.escondidos).every(function(k){ return r.escondidos[k]===false; }), r.escondidos);
  chk('2c · quedan el bloque de la cotización, el cliente (opcional, sin asterisco), el celular, los productos y el precio',
      Object.keys(r.aVista).every(function(k){ return r.aVista[k]===true; }) && r.opcional && r.ast==='none', { v:r.aVista, op:r.opcional, ast:r.ast });
  chk('2d · «Vale hasta» arranca en 7 días (21/11) y con Black Friday corriendo ofrece «hasta el fin de Black Friday» (30/11)',
      r.vence==='2026-11-21' && r.bts.length===3 && /Black Friday \(30\/11\)/.test(r.bts[2]) && r.venceBf==='2026-11-30' && r.vence7==='2026-11-21', r);

  r = await ev(page, async () => {
    _llenar({}); var orig=saldoVeredictoFila, o={};
    saldoVeredictoFila=function(f){ return /ALMOHADA/.test((f.x||{}).desc||'') ? { tipo:'moreno', desde:'2026-11-19' } : { tipo:'hay', desde:'2026-11-17' }; };
    try{ o.filas=saldoFilasForm().filter(function(f){ return f.completo; }).length; o.d=cotEntregaDesde(); cotDesdePintar(); o.txt=document.getElementById('f-cot-desde').innerText.replace(/\s+/g,' ');
      fxDerPintar(); o.der=(document.getElementById('fx-der')||{}).innerText||'';
      saldoVeredictoFila=function(f){ return /ALMOHADA/.test((f.x||{}).desc||'') ? { tipo:'pedir', sinCupo:true } : { tipo:'hay', desde:'2026-11-17' }; };
      o.d2=cotEntregaDesde(); cotDesdePintar(); o.txt2=document.getElementById('f-cot-desde').innerText.replace(/\s+/g,' ');
      saldoVeredictoFila=function(){ return { tipo:'sin' }; }; o.d3=cotEntregaDesde();
    } finally { saldoVeredictoFila=orig; }
    o.fecha=saldoFechaForm();
    return o; });
  chk('2e · «Entrega desde» = el día más tarde de los cuadritos de cada producto (la misma cuenta: `saldoVeredictoFila`), solo para mostrar',
      r.filas===2 && r.d==='2026-11-19' && /desde el jueves 19\/11/.test(r.txt) && /vale hasta el sábado 21\/11/.test(r.der) && /entrega desde el jueves 19\/11/.test(r.der), r);
  chk('2f · sin cupo para algún producto, o sin saldo cargado, dice «a confirmar» (no promete ningún día); el cuadrito no mira ninguna fecha de entrega',
      r.d2==='' && /a confirmar/.test(r.txt2) && r.d3==='' && r.fecha==='', r);

  // ── 3. Lo obligatorio ──
  r = await ev(page, async () => {
    var o={};
    _llenar({ cel:'' }); _calls.length=0; submitPedido(); await _esperar(80);
    o.sinCel={ envio:_cot().length, err:document.getElementById('f-celular').classList.contains('err'), t:_toast() };
    _llenar({ cel:'123' }); submitPedido(); await _esperar(80);
    o.celMal={ envio:_cot().length, t:_toast(), aviso:(document.getElementById('f-cel-aviso')||{}).innerText||'' };
    _llenar({ prods:[['COLCHON TITANIO LATEX','160x190','',1,'3500'],['ALMOHADA','50x70','',2,'']] }); submitPedido(); await _esperar(80);
    o.sinPrecio={ envio:_cot().length, t:_toast(), rojos:[].map.call(document.querySelectorAll('#f-productos .prod-precio.err'), function(e){ return e.closest('.prod-card').querySelector('.prod-desc').value; }) };
    _llenar({ vend:'Eduardo Añez', prods:[['COLCHON TITANIO LATEX','160x190','',1,'']] }); submitPedido(); await _esperar(80);
    o.eduardo={ envio:_cot().length, t:_toast() };
    _llenar({}); document.getElementById('f-cot-vence').value='2026-11-10'; submitPedido(); await _esperar(80);
    o.vencida={ envio:_cot().length, t:_toast(), err:document.getElementById('f-cot-vence').classList.contains('err') };
    document.getElementById('f-cot-vence').value='2026-11-21';
    o.pasos=fxPasosEstado();
    return o; });
  chk('3a · sin celular no se guarda (y queda en rojo)', r.sinCel.envio===0 && r.sinCel.err && /celular/.test(r.sinCel.t), r.sinCel);
  chk('3b · un celular que no es de WhatsApp no se guarda, y el aviso dice que la cotización va por WhatsApp (sin «no tiene WhatsApp»)',
      r.celMal.envio===0 && /WhatsApp/.test(r.celMal.t) && /La cotización se la mandás por WhatsApp/.test(r.celMal.aviso), r.celMal);
  chk('3c · un producto sin precio no se guarda: el precio es obligatorio', r.sinPrecio.envio===0 && /PRECIO/.test(r.sinPrecio.t) && r.sinPrecio.rojos.join()==='ALMOHADA', r.sinPrecio);
  chk('3d · …también para Eduardo (en la venta no se le pide; en la cotización sí)', r.eduardo.envio===0 && /PRECIO/.test(r.eduardo.t), r.eduardo);
  chk('3e · «Vale hasta» de un día que ya pasó no se guarda', r.vencida.envio===0 && r.vencida.err, r.vencida);
  chk('3f · los pasos dicen lo mismo que Guardar (datos, productos, vale hasta; sin entrega ni cobro)', JSON.stringify(r.pasos)==='[true,true,true,true]', r.pasos);

  // ── 4. Guardar: la cola durable, la ventana y la imagen ──
  r = await ev(page, async () => {
    _llenar({}); _calls.length=0; _modo='espera';
    var n0=STATE.length, cupo0=cuposUsadosTurno('2026-11-16','AM')+cuposUsadosTurno('2026-11-16','PM');
    submitPedido();
    var cola=JSON.parse(localStorage.getItem('me_cot_cola')||'[]');
    var o={ colaAntes:cola.length, op:cola[0]||null, mandada:_cot().length, est:(document.getElementById('cotv-est')||{}).innerText||'', tit:(document.getElementById('cotv-tit')||{}).innerText||'',
            form:docTipoSel(), cotiz:document.getElementById('view-form').classList.contains('cotizando'), mall:JSON.stringify(_mallToques) };
    _libera(); await _esperar(150);
    o.colaDespues=JSON.parse(localStorage.getItem('me_cot_cola')||'[]').length;
    o.tit2=document.getElementById('cotv-tit').innerText; o.est2=document.getElementById('cotv-est').innerText;
    var cv=document.getElementById('cotv-canvas'); o.cv=[cv.width, cv.height];
    var px=cv.getContext('2d').getImageData(20, 20, 1, 1).data; o.px=[px[0],px[1],px[2]];
    var blanco=cv.getContext('2d').getImageData(cv.width/2, 420, 1, 1).data; o.blanco=[blanco[0],blanco[1],blanco[2]];
    o.texto=cotTexto(COT.ultima);
    o.n=STATE.length-n0; o.cupo=cuposUsadosTurno('2026-11-16','AM')+cuposUsadosTurno('2026-11-16','PM')-cupo0;
    o.pend=getPending().length; o.acciones=_calls.map(function(c){ return c.action; }).filter(function(a){ return a!=='list'; });
    o.enState=STATE.some(function(p){ return p && p.cliente==='ANA PRUEBA'; });
    o.ult=COT.ultima;
    return o; });
  chk('4a · al tocar Guardar la cotización ya está en la cola del aparato ANTES de que conteste el servidor (con todo lo del contrato)',
      r.colaAntes===1 && r.op && r.op.k==='g' && r.op.p.celular==='70012345' && r.op.p.vendedor==='Carola Chavez' && r.op.p.tienda==='Tienda Banzer' &&
      r.op.p.total===3800 && r.op.p.vence==='2026-11-21' && r.op.p.prox==='2026-11-17' && r.op.p.productos.length===2 && r.op.p.productos[1].precio===150 && r.mandada===1, r.op);
  chk('4b · mientras tanto la ventana dice «Guardando…», el formulario vuelve a 📄 OC limpio y el mall recibe el toque `fin` (anotó)',
      /Guardando/.test(r.est) && r.form==='OC' && !r.cotiz && /\["fin",\{"r":"anoto"/.test(r.mall), r);
  chk('4c · con el «sí» del servidor sale de la cola, y el número que puso llega a la ventana', r.colaDespues===0 && /COT 11-014/.test(r.tit2) && /Guardada en la planilla como COT 11-014/.test(r.est2), r);
  chk('4d · la imagen se dibuja: 1080 de ancho, el alto según los productos, encabezado turquesa y la tarjeta blanca',
      r.cv[0]===1080 && r.cv[1]>700 && r.px[0]<60 && r.px[1]>150 && r.px[2]>150, { cv:r.cv, px:r.px, blanco:r.blanco });
  chk('4e · el texto para copiar: número, marca, para quién, renglones, total, entrega, vale hasta y el pie',
      /Cotización COT 11-014\* · Heaven Colchones/.test(r.texto) && /Para ANA PRUEBA · te atendió Carola Chavez, Tienda Banzer/.test(r.texto) && /2× ALMOHADA 50x70 — Bs 150 c\/u = Bs 300/.test(r.texto) &&
      /\*Total: Bs 3\.800\*/.test(r.texto) && /Entrega: a coordinar/.test(r.texto) && /Vale hasta el sábado 21\/11/.test(r.texto) && /Para confirmar, respondé a este WhatsApp\. Precios en bolivianos\./.test(r.texto), r.texto);
  chk('4f · NO es una venta: ni un pedido más en la lista (Administración, Contabilidad, Proyección, stock y cupos salen de ahí), ni la cola de pedidos, ni un «save»',
      r.n===0 && r.cupo===0 && r.pend===0 && !r.enState && r.acciones.join()==='cotGuardar', r);
  r = await ev(page, async () => { document.querySelector('#cotv .cotv-acc button:nth-child(3)').click(); var cop=_copiado;
    /* la imagen de 1080 se arma en PNG (un rato en una compu lenta o con la batería corriendo): se espera hasta 15 s */
    var hasta=async function(f){ for(var i=0;i<150 && !f();i++) await _esperar(100); };
    _bajados.length=0; _abiertos.length=0; document.getElementById('cotv-wa').click(); await hasta(function(){ return _abiertos.length>0; });
    var o={ cop:cop, baj:_bajados.slice(), ab:_abiertos.slice(), t:_toast() };
    _bajados.length=0; document.querySelector('#cotv .cotv-acc button:nth-child(2)').click(); await hasta(function(){ return _bajados.length>0; }); o.baj2=_bajados.slice(); return o; });
  chk('4g · «📋 Copiar texto» copia el texto de la cotización', /COT 11-014/.test(r.cop) && /Total: Bs 3\.800/.test(r.cop), r.cop.slice(0,80));
  chk('4h · «💬 Mandar por WhatsApp» (en la compu) baja la imagen y abre el WhatsApp DEL CLIENTE con el texto listo; el panel no manda nada',
      r.baj.join()==='cotizacion-COT-11-014.png' && r.ab.length===1 && /^https:\/\/wa\.me\/59170012345\?text=/.test(r.ab[0]) && /Cotizaci%C3%B3n/.test(r.ab[0]) && /adjuntala/.test(r.t), r);
  chk('4i · «⬇️ Bajar imagen» baja el PNG', r.baj2.join()==='cotizacion-COT-11-014.png', r.baj2);
  if(CAPT){
    const png = await page.evaluate(() => document.getElementById('cotv-canvas').toDataURL('image/png'));
    fs.writeFileSync(CAPT+'/mall_cot_imagen.png', Buffer.from(png.split(',')[1], 'base64'));
    await page.screenshot({ path:CAPT+'/mall_cot_ventana_1280.png' });
  }
  await ev(page, () => closeModal());

  // ── 5. Sin red, reintento sin duplicar, lo que se manda y un «no» firme ──
  r = await ev(page, async () => {
    var o={};
    cotEmpezar(); _llenar({ cli:'BETO PRUEBA', cel:'71234567' }); _calls.length=0; _modo='red';
    submitPedido(); await _esperar(150);
    var cola=JSON.parse(localStorage.getItem('me_cot_cola')||'[]'); o.cola1=cola.length; o.id=cola[0] && cola[0].id;
    o.est=document.getElementById('cotv-est').innerText; closeModal();
    o.enLista=cotTodas().filter(function(c){ return c.id===o.id; }).map(function(c){ return c._pend ? 'pend' : 'srv'; });
    _modo='ok'; await cotColaVaciar(); await _esperar(50);
    o.cola2=JSON.parse(localStorage.getItem('me_cot_cola')||'[]').length;
    o.mismoId=_cot().filter(function(c){ return c.action==='cotGuardar'; }).map(function(c){ return c.cot.id===o.id; });
    o.unaSola=cotTodas().filter(function(c){ return c.cliente==='BETO PRUEBA'; }).length;
    o.num=(cotDe(o.id)||{}).num;
    // mientras la cotización viaja, se anota una llamada: la confirmación de la cotización NO se la lleva
    cotEmpezar(); _llenar({ cli:'CARLA PRUEBA', cel:'72345678' }); _calls.length=0; _modo='espera';
    submitPedido(); await _esperar(30); closeModal();
    var idC=JSON.parse(localStorage.getItem('me_cot_cola')||'[]')[0].id;
    var pm=cotMarcar(idC, { prox:'2026-11-18', llamada:{ res:'volver', nota:'lo piensa' } }, 'Carola Chavez');
    o.cola3=JSON.parse(localStorage.getItem('me_cot_cola')||'[]').map(function(x){ return x.k; }).join();
    _libera(); await _esperar(60); _libera(); await pm; await _esperar(60);
    o.cola4=JSON.parse(localStorage.getItem('me_cot_cola')||'[]').length;
    o.orden=_cot().map(function(c){ return c.action; }).join();
    o.llamada=(_cot().filter(function(c){ return c.action==='cotMarcar'; })[0]||{}).llamada||null;
    o.prox=(cotDe(idC)||{}).prox;
    // un «no» firme sale de la cola y se dice
    _modo='firme'; cotEmpezar(); _llenar({ cli:'DANI PRUEBA', cel:'73456789' }); submitPedido(); await _esperar(150);
    o.firmeCola=JSON.parse(localStorage.getItem('me_cot_cola')||'[]').length; o.firmeT=_toast(); o.firmeEst=document.getElementById('cotv-est').innerText; closeModal();
    // sin lugar en el aparato: no se manda nada y el formulario queda como estaba
    _modo='ok'; cotEmpezar(); _llenar({ cli:'EVA PRUEBA', cel:'74567890' }); _calls.length=0;
    var orig=Storage.prototype.setItem; Storage.prototype.setItem=function(k, v){ if(k==='me_cot_cola') throw new Error('QuotaExceededError'); return orig.apply(this, arguments); };
    try{ submitPedido(); } finally { Storage.prototype.setItem=orig; }
    await _esperar(60);
    o.lleno={ envio:_cot().length, t:_toast(), tipo:docTipoSel(), cli:document.getElementById('f-cliente').value, modal:document.getElementById('modal').classList.contains('on') };
    return o; });
  chk('5a · sin red: queda en la cola del aparato y la ventana lo dice (la imagen se puede mandar igual)', r.cola1===1 && /Quedó guardada en este aparato/.test(r.est) && r.enLista.join()==='pend', r);
  chk('5b · al volver la red se manda con el MISMO id (el servidor no la duplica), sale de la cola y queda una sola', r.cola2===0 && r.mismoId.length===2 && r.mismoId.every(Boolean) && r.unaSola===1 && /^COT 11-0/.test(r.num||''), r);
  chk('5c · una llamada anotada mientras la cotización viaja espera detrás de ella, y la confirmación de la cotización NO se la lleva',
      r.cola3==='g,m' && r.cola4===0 && r.orden==='cotGuardar,cotMarcar' && r.llamada && r.llamada.res==='volver' && r.llamada.nota==='lo piensa' && r.llamada.quien==='Carola Chavez' && Number(r.llamada.t)>0 && r.prox==='2026-11-18', r);
  chk('5d · un «no» firme del servidor sale de la cola y se dice (no se reintenta para siempre)', r.firmeCola===0 && /NO aceptó/.test(r.firmeT) && /NO la aceptó/.test(r.firmeEst), r);
  chk('5e · sin lugar en el aparato NO se manda nada y el formulario sigue con lo escrito', r.lleno.envio===0 && /copia segura/.test(r.lleno.t) && r.lleno.tipo==='COT' && r.lleno.cli==='EVA PRUEBA' && !r.lleno.modal, r.lleno);

  // ── 6. «Para hacer» ──
  r = await ev(page, async () => {
    resetForm(); window.MIS_TOP_PRUEBA=1; _calls.length=0; _modo='ok';
    var base=function(id, o){ return Object.assign({ id:id, ts:new Date('2026-11-10T11:00:00-04:00').getTime(), dia:'2026-11-10', num:'COT 11-00'+id.slice(-1), tienda:'Tienda Banzer', vendedor:'Carola Chavez',
      cliente:'CLIENTE '+id.toUpperCase(), celular:'7000000'+id.slice(-1), productos:[{ desc:'COLCHON TITANIO LATEX', medida:'160x190', codigo:'', cant:1, precio:3500 }], total:3500,
      vence:'2026-11-20', entregaDesde:'2026-11-17', estado:'abierta', motivo:'', pedido:'', prox:'2026-11-13', llamadas:[], bot:'', botT:0, rev:1 }, o||{}); };
    _srv={}; [
      base('c1'),                                                                                         // para llamar
      base('c2', { bot:'llamar', botT:new Date('2026-11-13T09:00:00-04:00').getTime(), prox:'2026-11-20' }),   // le pidió al bot
      base('c3', { vence:'2026-11-12', dia:'2026-11-05' }),                                                // vencida
      base('c4', { bot:'compre', estado:'dice_compro', celular:'71111111' }),                              // dice que compró
      base('c5', { prox:'2026-11-18' }),                                                                   // todavía no toca
      base('c6', { vendedor:'Isabel Robledo', cliente:'DE OTRA VENDEDORA' }),                              // de otra vendedora
      base('c7', { estado:'compro' })                                                                      // ya compró
    ].forEach(function(c){ _srv[c.id]=c; });
    COT.srv={}; await cotRefrescar(true);
    _L=[{ id:'p9', oc:'11-201', vendedor:'Carola Chavez', cliente:'CLIENTA DE LA VENTA', celular:'71111111', fecha:'2026-11-17', turno:'AM', zona:'Norte', maps:'', productos:[{ desc:'COLCHON TITANIO LATEX', medida:'160x190', cant:1, precio:3500 }],
           saldo:3500, acuenta:0, pagado:false, metodoPago:'', ts:new Date('2026-11-12T15:00:00-04:00').getTime(), rev:1, fotos:[] }];
    await refrescarEstado();
    MIS_HACER_MAS=true; showView('mis'); var mv=document.getElementById('mis-vendedor'); mv.value='Carola Chavez'; renderMis(); await _esperar(250);
    var its=[].map.call(document.querySelectorAll('#mis-top .ah-it'), function(e){ return { cls:e.className, t:e.querySelector('.ah-tx b').textContent, s:(e.querySelector('.ah-tx small')||{}).textContent||'', b:e.querySelector('button').textContent }; });
    return { its:its, lect:_calls.filter(function(c){ return c.action==='cotLeer'; }).length, txt:document.getElementById('mis-top').innerText }; });
  const its=r.its||[];
  chk('6a · arriba de todo y en rojo: «CLIENTE C2 pidió que lo llames» (se lo pidió al bot), con «📞 Llamar»',
      its.length && /CLIENTE C2 pidió que lo llames/.test(its[0].t) && /ah-r/.test(its[0].cls) && /se lo pidió al bot/.test(its[0].s) && its[0].b==='📞 Llamar', its.slice(0,2));
  chk('6b · «📞 Llamar a 1 cotización» (la de prox ≤ hoy; la del 18/11 todavía no, ni la que ya compró, ni la de otra vendedora)',
      its.some(function(o){ return /Llamar a 1 cotización/.test(o.t) && /CLIENTE C1/.test(o.s); }) && !/CLIENTE C5|DE OTRA VENDEDORA|CLIENTE C7/.test(r.txt), its.map(function(o){ return o.t; }));
  chk('6c · «Una cotización vencida: ¿la renovás?» y «CLIENTE C4 dice que ya compró» (¿fue con nosotros?)',
      its.some(function(o){ return /Una cotización vencida: ¿la renovás\?/.test(o.t) && /CLIENTE C3/.test(o.s); }) && its.some(function(o){ return /CLIENTE C4 dice que ya compró/.test(o.t) && /¿fue con nosotros\?/.test(o.s); }), its.map(function(o){ return o.t; }));
  chk('6d · Mis pedidos lee las cotizaciones del servidor (`cotLeer`)', r.lect>=1, r.lect);
  if(CAPT){ await ev(page, () => { var t=document.getElementById('toast'); if(t) t.style.visibility='hidden'; document.getElementById('mis-top').scrollIntoView({ block:'start' }); }); await page.waitForTimeout(200); await page.screenshot({ path:CAPT+'/mall_cot_para_hacer_1280.png' }); }

  r = await ev(page, async () => {
    cotLlamarAbrir('llamar');
    var card=document.querySelector('#cot-llamar .cot-c[data-id="c1"]'), o={};
    o.botones=card ? [].map.call(card.querySelectorAll('.cot-acc .ah-go'), function(b){ return b.textContent; }) : [];
    o.wa=card ? (card.querySelector('a.ah-go')||{}).href||'' : '';
    cotUi('c1','volver'); var f=document.getElementById('cot-prox-c1'); o.def=f.value; f.value='2026-11-18'; document.getElementById('cot-nota-c1').value='vuelve el martes';
    _calls.length=0; cotVolverGuardar('c1'); await _esperar(120);
    o.volver=_cot()[0]||null; o.colaV=JSON.parse(localStorage.getItem('me_cot_cola')||'[]').length;
    o.sigue=!!cotHacerDatos('Carola Chavez').llamar.filter(function(c){ return c.id==='c1'; }).length;
    closeModal();
    // el que le pidió al bot: con la llamada anotada, se va de arriba
    cotLlamarAbrir('c2'); cotUi('c2','volver'); document.getElementById('cot-prox-c2').value='2026-11-19'; cotVolverGuardar('c2'); await _esperar(120);
    o.botSigue=cotHacerDatos('Carola Chavez').bot.length; closeModal();
    // ✗ no le interesa: sin motivo no; con motivo sí
    cotLlamarAbrir('venc'); o.vencBotones=[].map.call(document.querySelectorAll('#cot-llamar .cot-c[data-id="c3"] .cot-acc .ah-go'), function(b){ return b.textContent; });
    cotUi('c3','no'); _calls.length=0; cotNoGuardar('c3'); o.sinMotivo={ envio:_cot().length, t:_toast() };
    document.getElementById('cot-mot-c3').value='precio'; document.getElementById('cot-nota-c3').value='le pareció caro'; cotNoGuardar('c3'); await _esperar(120);
    o.no=_cot()[0]||null; o.estC3=cotEstado(cotDe('c3'));
    // 🔁 renovar una vencida
    _srv.c8=Object.assign({}, _srv.c1, { id:'c8', num:'COT 11-008', cliente:'CLIENTE C8', vence:'2026-11-11', prox:'2026-11-13', estado:'abierta', llamadas:[], rev:3 }); await cotRefrescar(true);
    cotLlamarAbrir('c8'); cotUi('c8','renovar'); document.getElementById('cot-vence-c8').value='2026-11-30'; _calls.length=0; cotRenovar('c8'); await _esperar(160);
    o.renovar=_cot().map(function(c){ return c.action+':'+(c.cot ? (c.cot.vence+'|rev'+c.cot.rev) : (c.estado+'|'+(c.llamada||{}).res)); });
    o.estC8=cotEstado(cotDe('c8')); closeModal();
    // «dice que ya compró»: «Sí, con nosotros» une su venta (mismo celular); «No» la cierra
    cotLlamarAbrir('c4'); o.diceBotones=[].map.call(document.querySelectorAll('#cot-llamar .cot-c[data-id="c4"] .cot-acc .ah-go'), function(b){ return b.textContent; });
    cotUi('c4','unir'); o.cand=document.querySelector('#cot-llamar .cot-c[data-id="c4"] .cot-sub').innerText;
    _calls.length=0; _saves.length=0; cotUnirPedido('c4','p9'); await _esperar(150);
    o.unir=_cot()[0]||null; o.p9cot=(findById('p9').productos||[]).map(function(x){ return x.cot; }).join(); o.saves=_saves.length; closeModal();
    _srv.c9=Object.assign({}, _srv.c1, { id:'c9', num:'COT 11-009', cliente:'CLIENTE C9', bot:'compre', estado:'dice_compro' }); await cotRefrescar(true);
    _calls.length=0; cotNoOtroLado('c9'); await _esperar(120); o.otroLado=_cot()[0]||null;
    renderMis(); await _esperar(150);
    o.txt=document.getElementById('mis-top').innerText;
    return o; });
  chk('6e · cada cotización para llamar trae 💬 WhatsApp (al celular del cliente, con el texto), ✓ Compró, ⏰ Volver a llamar y ✗ No le interesa',
      r.botones.join('|')==='💬 WhatsApp|✓ Compró|⏰ Volver a llamar|✗ No le interesa' && /^https:\/\/wa\.me\/59170000001\?text=/.test(r.wa), r);
  chk('6f · ⏰ Volver a llamar: propone 2 días hábiles después; anota el día (`prox`) y la llamada con lo que dijo; deja de estar para llamar hoy',
      r.def==='2026-11-17' && r.volver && r.volver.action==='cotMarcar' && r.volver.id==='c1' && r.volver.prox==='2026-11-18' && r.volver.llamada.res==='volver' && r.volver.llamada.nota==='vuelve el martes' && r.colaV===0 && !r.sigue, r.volver);
  chk('6g · lo que le pidió al bot se va de arriba en cuanto se anota la llamada', r.botSigue===0, r.botSigue);
  chk('6h · ✗ No le interesa pide el motivo; con «precio» queda cerrada («no»)',
      r.sinMotivo.envio===0 && /motivo|por qué/i.test(r.sinMotivo.t) && r.no && r.no.estado==='no' && r.no.motivo==='precio' && r.no.llamada.nota==='le pareció caro' && r.estC3==='no', r);
  chk('6i · la vencida ofrece 🔁 Renovar; renovar manda la cotización con el «vale hasta» nuevo y su sello, y la vuelve a abrir',
      r.vencBotones.indexOf('🔁 Renovar')>=0 && r.renovar.join()==='cotGuardar:2026-11-30|rev3,cotMarcar:abierta|renovo' && r.estC8==='abierta', r.renovar);
  chk('6j · «dice que ya compró»: «Sí, con nosotros» busca su venta por el celular y la une (la venta lleva `cot`, la cotización «compró» con el pedido)',
      r.diceBotones.join('|')==='💬 WhatsApp|Sí, con nosotros|No, en otro lado|⏰ Volver a llamar' && /OC 11-201/.test(r.cand) && r.unir && r.unir.estado==='compro' && r.unir.pedido==='p9' && r.p9cot==='c4' && r.saves===1, r);
  chk('6k · «No, en otro lado» la cierra con el motivo «compró en otro lado»', r.otroLado && r.otroLado.estado==='no' && r.otroLado.motivo==='compró en otro lado', r.otroLado);
  chk('6l · y «Para hacer» ya no las muestra', !/CLIENTE C1|CLIENTE C2|CLIENTE C3|CLIENTE C4/.test(r.txt), r.txt.slice(0,300));

  // ── 7. «✓ Compró» abre la OC llena; al guardarla, la cotización «compró» ──
  r = await ev(page, async () => {
    _srv.c10=Object.assign({}, _srv.c1, { id:'c10', num:'COT 11-010', cliente:'FER PRUEBA', celular:'75555555', estado:'abierta', llamadas:[],
      productos:[{ desc:'COLCHON TITANIO LATEX', medida:'160x190', codigo:'', cant:1, precio:3500 }, { desc:'ALMOHADA', medida:'50x70', codigo:'', cant:2, precio:150 }], total:3800 });
    await cotRefrescar(true);
    cotComproAbrir('c10'); await _esperar(80);
    var o={ tipo:docTipoSel(), cli:document.getElementById('f-cliente').value, cel:document.getElementById('f-celular').value, vend:document.getElementById('f-vendedor').value,
            prods:[].map.call(document.querySelectorAll('#f-productos .prod-card'), function(c){ return c.querySelector('.prod-desc').value+'|'+c.querySelector('.prod-cant').value+'|'+c.querySelector('.prod-precio').value; }),
            banner:_vis('cot-venta') ? document.getElementById('cot-venta').innerText : '' };
    document.getElementById('f-fecha').value='2026-11-17'; segSet('f-turno','AM'); document.getElementById('f-nota').value='5001';
    document.getElementById('f-zona').value='Norte'; segSet('f-pagado','NO'); document.getElementById('f-saldo').value='3800';
    _calls.length=0; _saves.length=0;
    submitPedido(); await _esperar(500);
    var g=_saves[_saves.length-1]||null;
    o.guardo=!!g; o.cotEnProd=g ? g.productos.map(function(x){ return x.cot; }).join() : '';
    o.marca=_cot().filter(function(c){ return c.action==='cotMarcar'; })[0]||null; o.pid=g && g.id;
    o.estado=cotEstado(cotDe('c10')); o.cv=COT_VENTA;
    try{ closeModal(); }catch(e){}
    // corregir esa venta: el vínculo sigue y no se vuelve a marcar
    _calls.length=0; editPedido(g.id); await _esperar(80); document.getElementById('f-direccion').value='CALLE INVENTADA 123'; submitPedido(); await _esperar(500);
    var g2=_saves[_saves.length-1]; o.cotEdit=g2.productos.map(function(x){ return x.cot; }).join(); o.marca2=_cot().filter(function(c){ return c.action==='cotMarcar'; }).length;
    try{ closeModal(); }catch(e){}
    o.hm=heredarMarcas([{ desc:'NUEVO', medida:'', codigo:'', cant:1 }], [{ desc:'VIEJO', medida:'', codigo:'', cant:1, cot:'c99' }]).map(function(x){ return x.cot; }).join();
    return o; });
  chk('7a · «✓ Compró» abre una 📄 OC NUEVA con el cliente, el celular, la vendedora y los productos con sus precios, y el cartel de la cotización',
      r.tipo==='OC' && r.cli==='FER PRUEBA' && r.cel==='75555555' && r.vend==='Carola Chavez' && r.prods.join()==='COLCHON TITANIO LATEX|1|3500,ALMOHADA|2|150' && /cotización COT 11-010/.test(r.banner), r);
  chk('7b · al guardar la venta, la cotización pasa a «compró» con el id del pedido, y el vínculo `cot` queda en sus productos',
      r.guardo && r.cotEnProd==='c10,c10' && r.marca && r.marca.id==='c10' && r.marca.estado==='compro' && r.marca.pedido===r.pid && r.marca.llamada.res==='compro' && r.estado==='compro' && r.cv===null, r);
  chk('7c · corregir esa venta conserva el vínculo y no vuelve a marcar la cotización; `heredarMarcas` pasa `cot` aunque cambie el renglón',
      r.cotEdit==='c10,c10' && r.marca2===0 && r.hm==='c99', r);

  // ── 8. Proyección → «🧾 Cotizaciones» ──
  r = await ev(page, async () => {
    var o={}; UNLOCKED=false; o.sinClave=cotTabAbrir(); UNLOCKED=true;
    var B=function(id, o){ return Object.assign({ id:id, ts:new Date('2026-11-05T11:00:00-04:00').getTime(), dia:'2026-11-05', num:'COT 11-1'+id, tienda:'Tienda Banzer', vendedor:'Carola Chavez', cliente:'X'+id,
      celular:'70000001', productos:[{ desc:'COLCHON TITANIO LATEX', medida:'160x190', cant:1, precio:1000 }], total:1000, vence:'2026-11-30', estado:'abierta', motivo:'', pedido:'', prox:'2026-11-20', llamadas:[], bot:'', botT:0, rev:1 }, o||{}); };
    _srv={}; [ B('a1', { estado:'compro', llamadas:[{ t:new Date('2026-11-08T12:00:00-04:00').getTime(), res:'compro' }] }),          // 3 días
               B('a2', { estado:'compro', vendedor:'Jonathan Monje', tienda:'Mia Plaza', llamadas:[{ t:new Date('2026-11-06T12:00:00-04:00').getTime(), res:'compro' }] }),   // 1 día
               B('a3', { estado:'no', motivo:'precio' }), B('a4', { estado:'no', motivo:'compró en otro lado', vendedor:'Jonathan Monje', tienda:'Mia Plaza' }),
               B('a5'), B('a6', { vence:'2026-11-10' }), B('a7', { dia:'2026-10-30' }) ].forEach(function(c){ _srv[c.id]=c; });
    _calls.length=0; document.getElementById('pry-cot-btn').click(); await _esperar(150);
    o.pedido=_calls.filter(function(c){ return c.action==='cotLeer'; })[0]||null;
    o.txt=document.getElementById('modal-box').innerText.replace(/\s+/g,' ');
    o.fichas=[].map.call(document.querySelectorAll('#cot-tab .cot-f'), function(f){ return f.querySelector('small').textContent+'='+f.querySelector('b').textContent; });
    o.vend=[].map.call(document.querySelectorAll('#cot-tab .cot-tbl'), function(t){ return [].map.call(t.querySelectorAll('tbody tr'), function(tr){ return [].map.call(tr.cells, function(c){ return c.textContent; }).join('|'); }); });
    o.apagado=(document.querySelector('#cot-tab .cot-bot')||{}).innerText||'';
    document.querySelector('#cot-tab .cot-tab-bar button:nth-of-type(2)').click(); o.copia=_copiado;
    _bajados.length=0; document.querySelector('#cot-tab .cot-tab-bar button:nth-of-type(3)').click(); o.excel=_bajados.slice();
    // el bot prendido (lo dice el servidor) y con mensajes
    _srv.a5.bot='llamar'; _srv.a5.botT=Date.now(); _srv.a3.bot='enviado';
    var orig=_resp; _resp=function(p){ var x=orig(p); if(p.action==='cotLeer') x.bot48=1; return x; };
    cotTabCargar(); await _esperar(150); o.prendido=(document.querySelector('#cot-tab .cot-bot')||{}).innerText||'';
    o.fichas2=[].map.call(document.querySelectorAll('#cot-tab .cot-f'), function(f){ return f.querySelector('small').textContent+'='+f.querySelector('b').textContent; });
    _resp=orig;
    return o; });
  chk('8a · sin la contraseña no se abre', r.sinClave===false, r.sinClave);
  chk('8b · lee las del mes (`cotLeer` del 01 al 30/11) y cuenta solo las de noviembre', r.pedido && r.pedido.desde==='2026-11-01' && r.pedido.hasta==='2026-11-30' && /Cotizaciones de noviembre de 2026/.test(r.txt), r.pedido);
  chk('8c · las fichas: 6 hechas, compraron 2 (33 %) en 2 días promedio, no les interesó 2, siguen abiertas 2 (1 vencida); el bot 0',
      r.fichas.join(',').indexOf('Hechas=6')>=0 && r.fichas.indexOf('Compraron=2')>=0 && r.fichas.indexOf('En cuántos días=2 días')>=0 && r.fichas.indexOf('No les interesó=2')>=0 &&
      r.fichas.indexOf('Siguen abiertas=2')>=0 && r.fichas.indexOf('El bot les escribió=0')>=0 && /33%/.test(r.txt) && /1 vencida/.test(r.txt), r.fichas);
  chk('8d · dice que el mensaje automático de las 48 h todavía no está prendido', /todavía no está prendido/.test(r.apagado), r.apagado);
  chk('8e · por vendedor y por tienda (Carola 4 · Banzer 4; Jonathan 2 · Mia Plaza 2), y los motivos',
      r.vend.length===2 && /^Carola Chavez\|4\|/.test(r.vend[0][0]) && /^Jonathan Monje\|2\|/.test(r.vend[0][1]) && /^Tienda Banzer\|4\|/.test(r.vend[1][0]) && /^Mia Plaza\|2\|/.test(r.vend[1][1]) &&
      /El precio · 1/.test(r.txt) && /Compró en otro lado · 1/.test(r.txt), r.vend);
  chk('8f · «📋 Copiar» y «⬇️ Excel»', /🧾 Cotizaciones de noviembre de 2026/.test(r.copia) && /Compraron: 2/.test(r.copia) && r.excel.join()==='cotizaciones-2026-11.xlsx', { copia:r.copia.slice(0,160), excel:r.excel });
  chk('8g · con el bot prendido lo dice, y cuenta a cuántas les escribió y cuántas pidieron llamada',
      /está prendido/.test(r.prendido) && r.fichas2.indexOf('El bot les escribió=2')>=0 && r.fichas2.indexOf('Pidieron que las llamen=1')>=0, { p:r.prendido, f:r.fichas2 });
  if(CAPT){ await page.screenshot({ path:CAPT+'/mall_cot_tablero_1280.png' }); }
  await ev(page, () => closeModal());

  // ── capturas del formulario (1280 y 390) ──
  if(CAPT){
    for(const w of [1280, 390]){
      const p2 = await abrir(w, w===390 ? 844 : 950, ()=>{ window.COT_PRUEBA=1; window.FH_PRUEBA=1; });
      await ev(p2, () => { SERVER_VER='2026-11-14-b'; renderConnEstado(); var cb=document.getElementById('carga-banner'); if(cb) cb.style.display='none';   // (la red de la prueba está cortada a propósito)
        showView('form'); resetForm(); cotEmpezar(); _llenar({}); fxFormPintar(); window.scrollTo(0,0); });
      await p2.waitForTimeout(500);
      if(w===390){
        await ev(p2, () => { var e=document.getElementById('fh'); window.scrollTo(0, e.getBoundingClientRect().top+window.scrollY-70); });
        await p2.waitForTimeout(300); await p2.screenshot({ path:CAPT+'/mall_cot_form_390.png' });
        await ev(p2, () => { document.getElementById('f-productos').scrollIntoView({ block:'start' }); window.scrollBy(0, -60); });
        await p2.waitForTimeout(300); await p2.screenshot({ path:CAPT+'/mall_cot_form_390b.png' });
      } else await p2.screenshot({ path:CAPT+'/mall_cot_form_'+w+'.png', fullPage:true });
      await p2._ctx.close();
    }
  }

  chk('sin errores de la página', errores.length===0, errores);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
