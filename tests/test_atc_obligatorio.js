/* 🎧 LA ATC NO SE GUARDA SIN SUS DATOS + 📷 LAS FOTOS DEL PRODUCTO (15/10, §4lh)
   El dueño: *«que los vendedores deban llenar correctamente los datos faltantes, como ser fecha de compra, y no les permita
   guardar si no tienen todos los datos llenados, como ser la fecha de compra, motivo. Deben seleccionar cuál es el motivo,
   aparte de las observaciones, detallar. Añade la función adjuntar imágenes para que puedan adjuntar fotos del producto, hasta
   dos imágenes… no les puedes permitir que guarden sin antes completar todos los datos»*.
   Cuida: motivo, detalle (≥10 letras), fecha de compra (ni futura, ni posterior a la ATC, ni con el año mal) y qué se le
   recoge son obligatorios al crear Y al editar; las fotos van hasta 2, quedan en la ATC (`atc.fot`) y en la columna de fotos
   (la que mira el barrido de huérfanas del servidor) y no se mezclan con las fotos de la entrega del chofer.
   `PEDIDOS=<archivo>` corre contra otra página (para ver los dientes contra la publicada). */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e))):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1600,height:1000} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.clock.install({ time: new Date('2026-10-15T10:00:00-04:00') });
  await page.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html'), { waitUntil:'load' });
  await page.clock.runFor(400);
  /* Contra una página sin esto (PEDIDOS=…), una función que falta no corta la prueba: el chequeo queda en rojo. */
  const VACIO=new Proxy(function(){}, { get:(t,k)=> k==='length' ? 0 : (k===Symbol.toPrimitive || k==='toString') ? (()=>'') : (typeof k==='string' && k in Array.prototype) ? Array.prototype[k].bind([]) : VACIO });
  /* …y un paso que se cuelga (contra una página sin esto, una promesa que nunca vuelve) se corta a los 25 s. */
  const ev=(f,a)=>Promise.race([page.evaluate(f,a), new Promise((_,rej)=>setTimeout(()=>rej(new Error('colgado 25 s')),25000))])
    .catch(e=>new Proxy({ __err:String((e&&e.message)||e).slice(0,140) },{ get:(t,k)=>(k in t)?t[k]:VACIO }));

  await ev(() => {
    document.getElementById('conn-form').style.display='none';
    CONNECTED=true; UNLOCKED=true;
    window._pl=[]; window._borradas=[]; window._subidas=0;
    apiSave=function(rec){ var g=JSON.parse(JSON.stringify(rec));
      window._pl=window._pl.filter(function(x){return x.id!==g.id;}).concat([g]); return Promise.resolve({ok:true}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(window._pl))}); };
    /* Drive de mentira: cada foto sube con un id nuevo; las borradas se anotan. */
    window.fotoCronometro=function(){ return Promise.resolve('data:image/jpeg;base64,AAAA'); };
    window.subirFoto=function(){ window._subidas++; return Promise.resolve({ok:true, fotoId:'FOTOATC'+window._subidas, version:'x'}); };
    window.apiBorrarFoto=function(id){ window._borradas.push(id); return Promise.resolve({ok:true}); };
    STATE=[]; saveMirror();
  });

  /* Llena una ATC como una vendedora. `o` dice qué poner; lo que no se pasa queda vacío. */
  const llenar = (o) => ev((o) => {
    showView('form'); resetForm();
    document.getElementById('f-fecha').value='2026-10-16'; segSet('f-turno','AM');
    segSet('f-doc-tipo','ATC'); setDocTipo();
    document.getElementById('f-vendedor').value='Mirian Salazar'; applyVendedorLite();
    document.getElementById('f-cliente').value=o.cliente||'CLIENTE ATC';
    document.getElementById('f-celular').value='70000000';
    document.getElementById('f-zona').value='Norte';
    document.getElementById('f-direccion').value='Av. 1';
    var pr=document.querySelector('#f-productos .prod-desc'); pr.value='TITANIO LATEX';
    var md=document.querySelector('#f-productos .prod-medida'); if(md) md.value='160x190';
    var cn=document.querySelector('#f-productos .prod-cant'); if(cn) cn.value='1';
    segSet('f-atc-tipo', o.tipo===undefined ? 'gar' : o.tipo);   // (15/10, §4lj) garantía o contra costo: lo cuida test_atc_tipo
    if(o.motivo!=null)  document.getElementById('f-atc-motivo').value=o.motivo;
    if(o.detalle!=null) document.getElementById('f-atc-detalle').value=o.detalle;
    if(o.compra!=null)  document.getElementById('f-atc-compra').value=o.compra;
    (o.piezas||[]).forEach(function(k){ var e=document.getElementById('f-pz-'+k); if(e) e.checked=true; });
  }, o);
  const guardar = () => ev(async () => {
    var n0=STATE.length; submitPedido();
    await new Promise(r=>setTimeout(r,300));
    var box=document.getElementById('atc-falta');
    var errs=['f-atc-motivo','f-atc-detalle','f-atc-compra','f-atc-piezas'].filter(function(id){ var e=document.getElementById(id); return e && e.classList.contains('err'); });
    return { guardo: STATE.length>n0, n:STATE.length, falta: box && !box.hidden ? box.textContent.replace(/\s+/g,' ') : '',
             errs: errs, toast: (document.getElementById('toast')||{}).textContent||'' };
  });
  const ok = { motivo:'Hundimiento', detalle:'hundido en el medio del lado derecho, no retoma su forma', compra:'2025-03-10', piezas:['col'] };

  // ============ 1. el formulario dice qué es obligatorio ============
  const vis = await ev(() => {
    showView('form'); resetForm(); segSet('f-doc-tipo','ATC'); setDocTipo();
    var lb=function(id){ var e=document.getElementById(id); var f=e&&e.closest('.field'); var l=f&&f.querySelector('.lb'); return l?l.innerHTML:''; };
    return { det:lb('f-atc-detalle'), com:lb('f-atc-compra'), pz:lb('f-atc-piezas'),
             fotos: !!document.getElementById('f-atc-fotos-box'), boton: !!document.getElementById('atc-foto-add'),
             area: (document.getElementById('f-atc-detalle')||{}).tagName };
  });
  chk('el detalle lleva el * de obligatorio', /class="req"/.test(vis.det), vis.det);
  chk('la fecha de compra lleva el *', /class="req"/.test(vis.com), vis.com);
  chk('«qué se le recoge» lleva el *', /class="req"/.test(vis.pz), vis.pz);
  chk('el detalle es un cuadro para escribir más de una línea', vis.area==='TEXTAREA', vis.area);
  chk('📷 hay lugar para las fotos del producto y el botón para adjuntar', vis.fotos && vis.boton, vis);

  // ============ 2. con solo el motivo NO se guarda, y dice todo lo que falta ============
  await llenar({ motivo:'Hundimiento' });
  let r = await guardar();
  chk('⛔ una ATC con solo el motivo NO se guarda', !r.guardo, r.n);
  chk('…el recuadro dice que falta el detalle, la fecha de compra y qué se le recoge',
      /detalle/.test(r.falta) && /fecha de compra/.test(r.falta) && /se le recoge/.test(r.falta), r.falta);
  chk('…los tres campos quedan en rojo (el motivo no, porque está)',
      r.errs.indexOf('f-atc-detalle')>=0 && r.errs.indexOf('f-atc-compra')>=0 && r.errs.indexOf('f-atc-piezas')>=0 && r.errs.indexOf('f-atc-motivo')<0, r.errs);
  chk('…y el aviso lo dice en palabras', /No se puede guardar la ATC: falta el detalle, la fecha de compra y qué se le recoge/.test(r.toast), r.toast);

  // completar de a uno: el recuadro se va achicando
  const vivo = await ev(() => {
    var d=document.getElementById('f-atc-detalle'); d.value='hundido en el medio del lado derecho'; d.dispatchEvent(new Event('input'));
    var a=document.getElementById('atc-falta').textContent;
    var c=document.getElementById('f-atc-compra'); c.value='2025-03-10'; c.dispatchEvent(new Event('change'));
    var b=document.getElementById('atc-falta').textContent;
    var pz=document.getElementById('f-pz-col'); pz.checked=true; pz.dispatchEvent(new Event('change'));
    return { a:a, b:b, oculto:document.getElementById('atc-falta').hidden, rojoDet:d.classList.contains('err') };
  });
  chk('al escribir el detalle sale del recuadro y del rojo', !/detalle/.test(vivo.a) && /fecha de compra/.test(vivo.a) && !vivo.rojoDet, vivo.a);
  chk('al poner la fecha queda solo «qué se le recoge»', !/fecha de compra/.test(vivo.b) && /se le recoge/.test(vivo.b), vivo.b);
  chk('con todo completo el recuadro se esconde', vivo.oculto===true, vivo.oculto);
  r = await guardar();
  chk('…y ahí SÍ se guarda', r.guardo, r.n);

  // ============ 3. sin motivo tampoco ============
  await llenar(Object.assign({}, ok, { motivo:'' }));
  r = await guardar();
  chk('⛔ sin motivo no se guarda', !r.guardo && r.errs.indexOf('f-atc-motivo')>=0, r.errs);

  // ============ 4. el detalle tiene que decir algo ============
  await llenar(Object.assign({}, ok, { detalle:'hundido' }));
  r = await guardar();
  chk('⛔ un detalle de una palabra («hundido») no alcanza', !r.guardo && /más completo/.test(r.falta), r.falta);
  await llenar(Object.assign({}, ok, { detalle:'     ' }));
  r = await guardar();
  chk('⛔ espacios en blanco no cuentan como detalle', !r.guardo && r.errs.indexOf('f-atc-detalle')>=0, r.errs);

  // ============ 5. la fecha de compra tiene que ser posible ============
  await llenar(Object.assign({}, ok, { compra:'2026-10-20' }));
  r = await guardar();
  chk('⛔ una compra del FUTURO no se guarda', !r.guardo && /no sea posterior a hoy/.test(r.falta), r.falta);
  await llenar(Object.assign({}, ok, { compra:'0025-03-10' }));
  r = await guardar();
  chk('⛔ un año mal escrito (0025) no se guarda', !r.guardo && /válida/.test(r.falta), r.falta);
  await llenar(Object.assign({}, ok, { compra:'2026-10-15' }));
  r = await guardar();
  chk('una compra de HOY sí (el cliente puede reclamar el mismo día)', r.guardo, r.falta);

  // ============ 6. sin «qué se le recoge» no ============
  await llenar(Object.assign({}, ok, { piezas:[] }));
  r = await guardar();
  chk('⛔ sin marcar qué se le recoge no se guarda', !r.guardo && r.errs.indexOf('f-atc-piezas')>=0, r.errs);

  // ============ 7. una venta normal (OC) no pide nada de esto ============
  const oc = await ev(async () => {
    showView('form'); resetForm();
    document.getElementById('f-fecha').value='2026-10-16'; segSet('f-turno','AM');
    document.getElementById('f-vendedor').value='Eduardo Añez'; applyVendedorLite();
    document.getElementById('f-cliente').value='VENTA NORMAL';
    document.getElementById('f-zona').value='Norte';
    var pr=document.querySelector('#f-productos .prod-desc'); pr.value='TITANIO LATEX';
    var md=document.querySelector('#f-productos .prod-medida'); if(md) md.value='160x190';
    var n0=STATE.length; submitPedido(); await new Promise(r=>setTimeout(r,300));
    return { guardo: STATE.length>n0, oculto: document.getElementById('atc-falta').hidden };
  });
  chk('una venta (OC) se guarda sin pedir motivo ni fecha de compra', oc.guardo && oc.oculto, oc);

  // ============ 8. 📷 las fotos: hasta 2, y quedan en el pedido ============
  await llenar(Object.assign({ cliente:'CON FOTOS' }, ok));
  const fotos = await ev(async () => {
    var f=function(n){ return new File(['x'], n, {type:'image/jpeg'}); };
    await atcFotosElegidas({ target:{ files:[f('a.jpg'), f('b.jpg'), f('c.jpg')], value:'' } });
    await new Promise(r=>setTimeout(r,50));
    var t=document.getElementById('toast').textContent;
    var box=document.getElementById('f-atc-fotos-box');
    return { form: FORM_ATC_FOTOS.slice(), subidas: window._subidas, toast: t,
             imgs: box.querySelectorAll('img').length, boton: !!document.getElementById('atc-foto-add'), txt: box.textContent };
  });
  chk('📷 de 3 fotos elegidas se suben solo 2', fotos.subidas===2 && fotos.form.length===2, fotos);
  chk('…y avisa (al final, para que no lo tape otro aviso) que el tope es 2', /son hasta 2 por ATC/.test(fotos.toast), fotos.toast);
  chk('…se ven las 2 miniaturas y ya no está el botón de agregar', fotos.imgs===2 && !fotos.boton, fotos.txt);
  r = await guardar();
  const g1 = await ev(() => { var p=STATE.filter(function(x){ return x.cliente==='CON FOTOS'; })[0]||{};
    return { id:p.id, fot: atcFotos(p), col: fotosDe(p), entrega: fotosEntregaDe(p), pl: atcFotos(window._pl.filter(function(x){ return x.id===p.id; })[0]||{}) }; });
  chk('al guardar, la ATC tiene sus 2 fotos del producto', r.guardo && g1.fot.join()==='FOTOATC1,FOTOATC2', g1.fot);
  chk('…también en la columna de fotos (la que cuida el barrido de huérfanas del servidor)', g1.col.join()==='FOTOATC1,FOTOATC2', g1.col);
  chk('…y llegan a la planilla', g1.pl.join()==='FOTOATC1,FOTOATC2', g1.pl);
  chk('…pero NO cuentan como fotos de la entrega', g1.entrega.length===0, g1.entrega);

  // el chofer sube la foto del recojo: es de la entrega, no del producto
  const ent = await ev((id) => {
    var p=findById(id); p.fotos=fotosDe(p).concat(['FOTOCHOFER']);
    var html=fotosHtml(p, true);
    return { entrega: fotosEntregaDe(p), tira: (html.match(/<img/g)||[]).length };
  }, g1.id);
  chk('la foto del chofer es la única «de la entrega»', ent.entrega.join()==='FOTOCHOFER' && ent.tira===1, ent);

  // la ficha de la ATC muestra las del producto, y el visor las recorre
  const ficha = await ev((id) => {
    verAtc(id);
    var m=document.getElementById('modal').textContent.replace(/\s+/g,' ');
    var n=document.querySelectorAll('#modal .atc-fotos img').length;
    closeModal();
    abrirVisor(id, 1, 'atc'); var v=VISOR.ids.slice(), i=VISOR.i; cerrarVisor();
    abrirVisor(id, 0); var v2=VISOR.ids.slice(); cerrarVisor();
    return { m:m, n:n, v:v, i:i, v2:v2 };
  }, g1.id);
  chk('la ficha de la ATC muestra «Fotos del producto» con las 2', /Fotos del producto/.test(ficha.m) && ficha.n===2, ficha.n);
  chk('…el visor de la ATC pasa por las 2 del producto', ficha.v.join()==='FOTOATC1,FOTOATC2' && ficha.i===1, ficha.v);
  chk('…y el de la entrega solo por la del chofer', ficha.v2.join()==='FOTOCHOFER', ficha.v2);

  // borrar la foto de la entrega no toca las del producto
  const borra = await ev((id) => { quitarFoto(id, 0); var p=findById(id); return { col: fotosDe(p), fot: atcFotos(p) }; }, g1.id);
  chk('🗑 borrar la foto de la entrega deja intactas las del producto', borra.col.join()==='FOTOATC1,FOTOATC2' && borra.fot.length===2, borra);

  // ============ 9. editar: cambiar una foto y la del chofer se queda ============
  const ed = await ev(async (id) => {
    var p=findById(id); p.fotos=fotosDe(p).concat(['FOTOCHOFER2']);
    editPedido(id); await new Promise(r=>setTimeout(r,200));
    var antes=FORM_ATC_FOTOS.slice();
    quitarAtcFotoForm(0);                                   // saca FOTOATC1 (ya era de la ATC: no se borra de Drive todavía)
    var borradaYa=window._borradas.slice();
    await atcFotosElegidas({ target:{ files:[new File(['x'],'d.jpg',{type:'image/jpeg'})], value:'' } });
    var n0=window._pl.length; submitPedido(); await new Promise(r=>setTimeout(r,300));
    var q=findById(id);
    return { antes:antes, borradaYa:borradaYa, fot: atcFotos(q), col: fotosDe(q), entrega: fotosEntregaDe(q) };
  }, g1.id);
  chk('al editar vuelven las 2 fotos al formulario', ed.antes.join()==='FOTOATC1,FOTOATC2', ed.antes);
  chk('…quitar una que ya era de la ATC no la borra de Drive antes de guardar', ed.borradaYa.indexOf('FOTOATC1')<0, ed.borradaYa);
  chk('…al guardar la ATC queda con la que siguió y la nueva', ed.fot.join()==='FOTOATC2,FOTOATC3', ed.fot);
  chk('…la columna de fotos pierde la quitada, suma la nueva y CONSERVA la del chofer',
      ed.col.indexOf('FOTOATC1')<0 && ed.col.indexOf('FOTOATC3')>=0 && ed.col.indexOf('FOTOCHOFER2')>=0, ed.col);
  chk('…y la del chofer sigue siendo la única de la entrega', ed.entrega.join()==='FOTOCHOFER2', ed.entrega);

  // ============ 10. una foto recién subida que se quita o no se guarda se borra de Drive ============
  const tira = await ev(async () => {
    window._borradas=[];
    showView('form'); resetForm(); segSet('f-doc-tipo','ATC'); setDocTipo();
    await atcFotosElegidas({ target:{ files:[new File(['x'],'e.jpg',{type:'image/jpeg'})], value:'' } });
    var nueva=FORM_ATC_FOTOS[0];
    quitarAtcFotoForm(0);
    var b1=window._borradas.slice();
    await atcFotosElegidas({ target:{ files:[new File(['x'],'f.jpg',{type:'image/jpeg'})], value:'' } });
    var otra=FORM_ATC_FOTOS[0];
    var sinPegar=imagenesSinPegar().slice();
    segSet('f-doc-tipo','OC'); setDocTipo();                 // la pasa a venta: la foto no iría a ningún lado
    return { nueva:nueva, b1:b1, otra:otra, sinPegar:sinPegar, b2:window._borradas.slice(), queda:FORM_ATC_FOTOS.slice() };
  });
  chk('quitar una foto recién subida la borra de Drive en el momento', tira.b1.indexOf(tira.nueva)>=0, tira.b1);
  chk('una foto sin guardar cuenta como «imagen sin pegar» (avisa al salir del formulario)', tira.sinPegar.indexOf(tira.otra)>=0, tira.sinPegar);
  chk('pasar la ATC a OC borra la foto nueva (no quedaría en ningún pedido)', tira.b2.indexOf(tira.otra)>=0 && tira.queda.length===0, tira);

  // ============ 11. guardar mientras sube una foto: espera ============
  await llenar(Object.assign({ cliente:'SUBIENDO' }, ok));
  const sub = await ev(async () => {
    var lib=null; window.subirFoto=function(){ return new Promise(function(r){ lib=r; }); };
    var pr=atcFotosElegidas({ target:{ files:[new File(['x'],'g.jpg',{type:'image/jpeg'})], value:'' } });
    await new Promise(r=>setTimeout(r,30));
    var n0=STATE.length; submitPedido(); await new Promise(r=>setTimeout(r,200));
    var t=document.getElementById('toast').textContent, guardo=STATE.length>n0;
    lib({ok:true, fotoId:'FOTOLENTA', version:'x'}); await pr; await new Promise(r=>setTimeout(r,30));
    var n1=STATE.length; submitPedido(); await new Promise(r=>setTimeout(r,300));
    var p=STATE.filter(function(x){ return x.cliente==='SUBIENDO'; })[0]||{};
    return { guardo:guardo, t:t, despues: STATE.length>n1, fot: atcFotos(p) };
  });
  chk('⏳ con una foto subiendo no deja guardar (se perdería)', !sub.guardo && /Esperá que termine de subir la foto/.test(sub.t), sub.t);
  chk('…cuando termina, guarda con la foto', sub.despues && sub.fot.join()==='FOTOLENTA', sub.fot);

  // ============ 12. editar una ATC VIEJA a la que le faltan datos pide completarlos ============
  const vieja = await ev(async () => {
    UNLOCKED=false;                                         // una VENDEDORA: sin la clave tiene que completar sí o sí
    window.subirFoto=function(){ window._subidas++; return Promise.resolve({ok:true, fotoId:'FOTOATC'+window._subidas, version:'x'}); };
    var ts=new Date('2026-08-20T10:00:00-04:00').getTime();
    var p={ id:'vieja-1', oc:'ATC 08-099', fecha:'2026-08-22', turno:'AM', vendedor:'Carola Chavez', cliente:'CLIENTE VIEJO', celular:'70000001',
      zona:'Sur', direccion:'Calle 2', ts:ts, rev:3, fotos:[],
      productos:[{desc:'ORO ORTOPEDICO', medida:'140x190', cant:1, atc:{ mot:'Hundimiento' }}] };
    STATE.push(p); window._pl.push(JSON.parse(JSON.stringify(p)));
    editPedido('vieja-1'); await new Promise(r=>setTimeout(r,200));
    var n0=JSON.stringify(window._pl.filter(function(x){ return x.id==='vieja-1'; })[0]);
    submitPedido(); await new Promise(r=>setTimeout(r,300));
    var falta1=document.getElementById('atc-falta').textContent;
    var igual=(JSON.stringify(window._pl.filter(function(x){ return x.id==='vieja-1'; })[0])===n0);
    document.getElementById('f-atc-detalle').value='hundido del lado donde duerme el cliente';
    document.getElementById('f-pz-col').checked=true;
    document.getElementById('f-atc-compra').value='2026-09-01';   // DESPUÉS de que entró la ATC (20/08)
    submitPedido(); await new Promise(r=>setTimeout(r,300));
    var falta2=document.getElementById('atc-falta').textContent;
    var igual2=(JSON.stringify(window._pl.filter(function(x){ return x.id==='vieja-1'; })[0])===n0);
    document.getElementById('f-atc-compra').value='2023-05-04';
    segSet('f-atc-tipo','gar');   // (15/10, §4lj) la vieja tampoco tenía garantía/contra costo: se marca también
    submitPedido(); await new Promise(r=>setTimeout(r,300));
    var q=findById('vieja-1');
    return { falta1:falta1, igual:igual, falta2:falta2, igual2:igual2, fcom:atcFechaCompra(q), det:atcDetalle(q), mot:atcMotivo(q) };
  });
  chk('✏️ una ATC vieja sin fecha de compra ni detalle no se vuelve a guardar sin completarlos', vieja.igual && /fecha de compra/.test(vieja.falta1) && /detalle/.test(vieja.falta1), vieja.falta1);
  chk('…una compra POSTERIOR a cuando entró la ATC tampoco', vieja.igual2 && /posterior a la ATC \(entró el 20\/08\/2026\)/.test(vieja.falta2), vieja.falta2);
  chk('…completa, se guarda con todo', vieja.fcom==='2023-05-04' && /hundido del lado/.test(vieja.det) && vieja.mot==='Hundimiento', vieja);

  // ============ 12b. 🔑 con la clave de Administración, una ATC vieja se puede guardar igual (preguntando) ============
  const adm = await ev(async () => {
    UNLOCKED=true;
    var ts=new Date('2026-08-20T10:00:00-04:00').getTime();
    var mk=function(id){ var p={ id:id, oc:'ATC 08-0'+id.slice(-2), fecha:'2026-08-22', turno:'AM', vendedor:'Carola Chavez', cliente:'TRELLO '+id, celular:'70000002',
      zona:'Sur', direccion:'Calle 3', ts:ts, rev:2, fotos:[], productos:[{desc:'ORO ORTOPEDICO', medida:'140x190', cant:1, atc:{ mot:'Hundimiento', det:'hundido del lado derecho' }}] };
      STATE.push(p); window._pl.push(JSON.parse(JSON.stringify(p))); return p; };
    mk('adm-91'); mk('adm-92'); mk('adm-93');
    var preg=[], resp=false, _cf=window.confirm; window.confirm=function(m){ preg.push(m); return resp; };
    var dir=function(id){ return (window._pl.filter(function(x){ return x.id===id; })[0]||{}).direccion; };
    // a) Cancelar: no se guarda
    editPedido('adm-91'); await new Promise(r=>setTimeout(r,200));
    document.getElementById('f-direccion').value='Calle nueva 1'; resp=false; submitPedido(); await new Promise(r=>setTimeout(r,300));
    var a={ preg:preg.slice(), dir:dir('adm-91'), falta:document.getElementById('atc-falta').textContent };
    // b) Aceptar: se guarda con la dirección nueva y la ATC sigue sin fecha de compra (no se inventa nada)
    preg=[]; editPedido('adm-92'); await new Promise(r=>setTimeout(r,200));
    document.getElementById('f-direccion').value='Calle nueva 2'; resp=true; submitPedido(); await new Promise(r=>setTimeout(r,300));
    var q=findById('adm-92'); var b={ preg:preg.slice(), dir:dir('adm-92'), fcom:atcFechaCompra(q), det:atcDetalle(q) };
    // c) lo que la ATC SÍ tenía no se puede borrar ni con la clave: vaciar el detalle frena sin preguntar
    preg=[]; editPedido('adm-93'); await new Promise(r=>setTimeout(r,200));
    document.getElementById('f-atc-detalle').value=''; document.getElementById('f-direccion').value='Calle nueva 3'; resp=true;
    submitPedido(); await new Promise(r=>setTimeout(r,300));
    var c={ preg:preg.slice(), dir:dir('adm-93'), falta:document.getElementById('atc-falta').textContent };
    window.confirm=_cf; UNLOCKED=true;
    return { a:a, b:b, c:c };
  });
  chk('🔑 Administración que edita una ATC vieja sin fecha de compra: le PREGUNTA (no la frena en seco)', adm.a.preg.length===1 && /ya estaba guardada sin/.test(adm.a.preg[0]||''), adm.a.preg);
  chk('…«Cancelar» no guarda y marca lo que falta', adm.a.dir==='Calle 3' && /fecha de compra/.test(adm.a.falta), adm.a);
  chk('…«Aceptar» guarda el cambio y la ATC sigue sin fecha de compra (no se inventa)', adm.b.dir==='Calle nueva 2' && adm.b.fcom==='' && /hundido/.test(adm.b.det), adm.b);
  chk('…pero lo que la ATC SÍ tenía no se borra ni con la clave: vaciar el detalle frena sin preguntar', adm.c.preg.length===0 && adm.c.dir==='Calle 3' && /detalle/.test(adm.c.falta), adm.c);

  // ============ 12c. volver a tocar «🎧 ATC» no borra las fotos ============
  const toca = await ev(async () => {
    window._borradas=[];
    showView('form'); resetForm(); segSet('f-doc-tipo','ATC'); setDocTipo();
    await atcFotosElegidas({ target:{ files:[new File(['x'],'h.jpg',{type:'image/jpeg'})], value:'' } });
    var antes=FORM_ATC_FOTOS.slice();
    var b=document.querySelector('#f-doc-tipo button[data-val="ATC"]'); if(b) b.click(); else { segSet('f-doc-tipo','ATC'); setDocTipo(); }
    await new Promise(r=>setTimeout(r,50));
    return { antes:antes, despues:FORM_ATC_FOTOS.slice(), borradas:window._borradas.slice() };
  });
  chk('🎧 tocar de nuevo «ATC» con una foto lista NO la borra', toca.antes.length===1 && String(toca.despues)===String(toca.antes) && toca.borradas.length===0, toca);

  // ============ 12d. el servidor devuelve la fila: quitar a propósito una foto NO da «SE GUARDÓ INCOMPLETO» ============
  const eco = await ev(async () => {
    var orig=apiSave;
    apiSave=function(rec){ var g=JSON.parse(JSON.stringify(rec)); window._pl=window._pl.filter(function(x){return x.id!==g.id;}).concat([g]); return Promise.resolve({ok:true, pedido:JSON.parse(JSON.stringify(g))}); };
    window._toasts=[]; var tOrig=toast; toast=function(m,t){ window._toasts.push(String(t||'')+': '+m); return tOrig.apply(this, arguments); };
    var p=STATE.filter(function(x){ return x.cliente==='CON FOTOS'; })[0];
    editPedido(p.id); await new Promise(r=>setTimeout(r,200));
    quitarAtcFotoForm(0); submitPedido(); await new Promise(r=>setTimeout(r,400));
    apiSave=orig; toast=tOrig;
    return { incompleto: window._toasts.filter(function(t){ return /INCOMPLETO/.test(t); }), fot: atcFotos(findById(p.id)) };
  });
  chk('📷 quitar una foto guardada y guardar NO da «SE GUARDÓ INCOMPLETO» (el eco mira lo que se mandó)', eco.incompleto.length===0 && eco.fot.length===1, eco);

  // ============ 12e. el detalle con varias líneas queda en una (la copia de la pestaña ATC no se corre) ============
  await llenar(Object.assign({}, ok, { cliente:'DOS LINEAS', detalle:'hundido en el medio\ndel lado derecho' }));
  r = await guardar();
  const cop = await ev(() => {
    var p=STATE.filter(function(x){ return x.cliente==='DOS LINEAS'; })[0];
    var txt=''; var o=window.copyText; window.copyText=function(t){ txt=t; }; copiarAtc(); window.copyText=o;
    var filas=txt.split('\n').filter(function(l){ return /\t/.test(l); });
    return { det: atcDetalle(p), cols: filas.map(function(l){ return l.split('\t').length; }) };
  });
  chk('el detalle de dos líneas se guarda en una sola', r.guardo && cop.det==='hundido en el medio · del lado derecho', cop.det);
  chk('…y «📋 Copiar» de la pestaña ATC da 17 columnas en TODAS las filas (desde §4lj, con «Tipo» al final)', cop.cols.length>1 && cop.cols.every(function(n){ return n===17; }), cop.cols);

  // ============ 12f. una ATC pasada a OC al editar no deja sus fotos como «fotos de la entrega» ============
  const aOc = await ev(async () => {
    var p=STATE.filter(function(x){ return x.cliente==='CON FOTOS'; })[0]; p.fotos=fotosDe(p).concat(['FOTOCHOFER3']);
    editPedido(p.id); await new Promise(r=>setTimeout(r,200));
    segSet('f-doc-tipo','OC'); setDocTipo(); document.getElementById('f-nota').value='7777';
    submitPedido(); await new Promise(r=>setTimeout(r,400));
    var q=findById(p.id); return { oc:q.oc, col:fotosDe(q) };
  });
  chk('ATC pasada a OC: las fotos del producto salen de la columna y las del chofer quedan', !/^ATC/.test(aOc.oc) && !aOc.col.some(function(f){ return /^FOTOATC/.test(f); }) && aOc.col.indexOf('FOTOCHOFER3')>=0, aOc);

  // ============ 13. «Para guardar» (pantalla ancha) cuenta lo de la ATC ============
  await llenar({ motivo:'Ruido' });
  const fx = await ev(() => { fxDerPintar(); var e=document.getElementById('fx-der'); return e ? e.textContent.replace(/\s+/g,' ') : ''; });
  chk('la lista «Para guardar» de la derecha incluye detalle, fecha de compra y qué se recoge',
      /○ Detalle/.test(fx) && /○ Fecha de compra/.test(fx) && /○ Qué se recoge/.test(fx) && /✓ Motivo/.test(fx), fx.slice(0,300));

  chk('sin errores de JavaScript en la página', errors.length===0, errors.join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
