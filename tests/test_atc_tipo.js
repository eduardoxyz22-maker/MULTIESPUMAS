/* 🛡️🔧 GARANTÍA O CONTRA COSTO EN LAS ATC (15/10, §4lj)
   El dueño: *«marcar qué tipo de ATC: si de reparación por garantía o reparación contra costo (STC), para no mezclar la data…
   las recogidas y fechas se mantienen como lo tenemos programado, solo es para marcar y filtrar la información al llenar, porque
   no discernimos ahorita qué es de qué»*.
   Cuida: la marca es obligatoria al llenar (y al editar, con la excepción de Administración para las viejas); se guarda en
   `atc.tipo`; la pestaña ATC filtra y cuenta por tipo; la ficha permite marcar las viejas sin abrir el formulario; la copia, el
   correo, el WhatsApp y el informe PDF lo dicen; y NO cambia el número, la fecha, el turno ni el estado.
   `PEDIDOS=<archivo>` corre contra otra página. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e))):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1400,height:1000} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.clock.install({ time: new Date('2026-10-15T10:00:00-04:00') });
  await page.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html'), { waitUntil:'load' });
  await page.clock.runFor(400);
  const ev=(f,a)=>Promise.race([page.evaluate(f,a), new Promise((_,rej)=>setTimeout(()=>rej(new Error('colgado 25 s')),25000))])
    .catch(e=>({ __err:String((e&&e.message)||e).slice(0,160) }));

  /* Una ATC VIEJA, de antes de la marca (sin `tipo`), con todo lo demás completo. */
  const VIEJA = { id:'vieja-1', ts:new Date('2026-09-20T10:00:00-04:00').getTime(), oc:'ATC 09-007', fecha:'2026-09-22', turno:'AM',
    cliente:'ROSA VIEJA', celular:'70000001', zona:'Norte', direccion:'Calle 1', vendedor:'Mirian Salazar', estado:'Pendiente',
    productos:[{ desc:'TITANIO LATEX', medida:'160x190', cant:1, atc:{ mot:'Ruido', det:'hace ruido del lado izquierdo al moverse', fcom:'2025-01-10', r_col:true } }] };

  await ev((V) => {
    document.getElementById('conn-form').style.display='none';
    CONNECTED=true; UNLOCKED=false;
    window._pl=[JSON.parse(JSON.stringify(V))]; window._guardados=[]; window._copiado=[];
    apiSave=function(rec){ var g=JSON.parse(JSON.stringify(rec)); window._guardados.push(g);
      window._pl=window._pl.filter(function(x){return x.id!==g.id;}).concat([g]); return Promise.resolve({ok:true}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(window._pl))}); };
    window.copyText=function(t){ window._copiado.push(String(t)); };
    STATE=[JSON.parse(JSON.stringify(V))]; saveMirror();
  }, VIEJA);

  const llenar = (o) => ev((o) => {
    showView('form'); resetForm();
    document.getElementById('f-fecha').value='2026-10-16'; segSet('f-turno','AM');
    segSet('f-doc-tipo','ATC'); setDocTipo();
    document.getElementById('f-vendedor').value='Mirian Salazar'; applyVendedorLite();
    document.getElementById('f-cliente').value=o.cliente;
    document.getElementById('f-celular').value='70011122';
    document.getElementById('f-zona').value='Norte';
    document.getElementById('f-direccion').value='Av. Banzer 5to anillo';
    document.querySelector('#f-productos .prod-desc').value='TITANIO LATEX';
    var md=document.querySelector('#f-productos .prod-medida'); if(md) md.value='160x190';
    document.getElementById('f-atc-motivo').value='Hundimiento';
    document.getElementById('f-atc-detalle').value='hundido en el medio, no retoma su forma';
    document.getElementById('f-atc-compra').value='2025-03-10';
    document.getElementById('f-pz-col').checked=true;
    if(o.tipo) segSet('f-atc-tipo', o.tipo);
  }, o);
  const guardar = () => ev(async () => {
    var n0=STATE.length; submitPedido(); await new Promise(r=>setTimeout(r,400));
    var box=document.getElementById('atc-falta'), seg=document.getElementById('f-atc-tipo');
    var t=(document.querySelector('#modal .modal-h h3')||{}).textContent||'';
    try{ closeModal(); }catch(e){}
    return { guardo: STATE.length>n0, falta: box && !box.hidden ? box.textContent.replace(/\s+/g,' ') : '', rojo: !!(seg && seg.classList.contains('err')),
             toast:(document.getElementById('toast')||{}).textContent||'', titulo:t };
  });
  const de = (cli) => ev((cli) => { var p=STATE.filter(function(x){ return x.cliente===cli; })[0]; if(!p) return null;
    return { id:p.id, oc:p.oc, fecha:p.fecha, turno:p.turno, tipo:atcTipo(p), est:atcEstado(p), guardado:(window._pl.filter(function(x){ return x.id===p.id; })[0]||{}) }; }, cli);

  // ============ 1. el formulario lo pide ============
  const vis = await ev(() => {
    showView('form'); resetForm(); segSet('f-doc-tipo','ATC'); setDocTipo();
    var s=document.getElementById('f-atc-tipo'), f=s && s.closest('.field'), l=f && f.querySelector('.lb');
    var bs=s ? [].slice.call(s.querySelectorAll('button')) : [];
    return { hay:!!s, lb: l ? l.innerHTML : '', botones: bs.map(function(b){ return b.textContent; }), activo: s ? !!s.querySelector('.active') : null,
             visible: !!(s && s.offsetParent) };
  });
  chk('🛡️🔧 el bloque de la ATC pregunta «¿Garantía o contra costo?» con su *', vis.hay && /Garantía o contra costo/.test(vis.lb) && /class="req"/.test(vis.lb), vis.lb);
  chk('…con los dos botones: Garantía (ATC) y Contra costo (STC)', vis.botones.length===2 && /Garantía/.test(vis.botones[0]) && /Contra costo \(STC\)/.test(vis.botones[1]), vis.botones);
  chk('…arranca SIN elegir (lo tiene que marcar quien la carga) y se ve', vis.activo===false && vis.visible, vis);

  // ============ 2. sin marcar no se guarda ============
  await llenar({ cliente:'SIN TIPO' });
  let r = await guardar();
  chk('⛔ una ATC completa pero sin marcar garantía o contra costo NO se guarda', !r.guardo, r);
  chk('…el recuadro lo dice', /garantía/.test(r.falta) && /contra costo/.test(r.falta), r.falta);
  chk('…los botones quedan en rojo', r.rojo, r.rojo);
  chk('…y el aviso lo dice en palabras', /falta si es garantía o contra costo/.test(r.toast), r.toast);

  // tocar el botón saca el rojo y el recuadro
  const toque = await ev(() => {
    var b=document.querySelector('#f-atc-tipo button[data-val="stc"]'); b.click();
    return { rojo: document.getElementById('f-atc-tipo').classList.contains('err'), oculto: document.getElementById('atc-falta').hidden, val: segVal('f-atc-tipo') };
  });
  chk('tocar «🔧 Contra costo» lo marca, saca el rojo y esconde el recuadro', toque.val==='stc' && !toque.rojo && toque.oculto, toque);
  r = await guardar();
  chk('…y ahí SÍ se guarda', r.guardo, r);
  chk('…con la ventana de siempre («✅ ATC guardada»)', /ATC guardada/.test(r.titulo), r.titulo);
  let a = await de('SIN TIPO');
  chk('…queda guardada como contra costo (`atc.tipo` = stc), en la planilla también', a && a.tipo==='stc' && a.guardado.productos[0].atc.tipo==='stc', a && a.tipo);
  chk('…y NO cambia nada del circuito: número ATC, fecha, turno y estado de siempre', a && /^ATC /.test(a.oc) && a.fecha==='2026-10-16' && a.turno==='AM' && a.est==='sinrecoger', a);

  await llenar({ cliente:'CON GARANTIA', tipo:'gar' });
  r = await guardar();
  a = await de('CON GARANTIA');
  chk('una de garantía se guarda como `gar`', r.guardo && a.tipo==='gar', a && a.tipo);

  // ============ 3. al editar ============
  const ed = await ev(async () => {
    var p=STATE.filter(function(x){ return x.cliente==='SIN TIPO'; })[0];
    editPedido(p.id); await new Promise(r=>setTimeout(r,200));
    var v1=segVal('f-atc-tipo');
    document.querySelector('#f-atc-tipo button[data-val="gar"]').click();
    submitPedido(); await new Promise(r=>setTimeout(r,400)); try{ closeModal(); }catch(e){}
    var q=findById(p.id);
    return { v1:v1, tipo:atcTipo(q), oc:q.oc, fecha:q.fecha };
  });
  chk('al editar, la marca vuelve al formulario', ed.v1==='stc', ed.v1);
  chk('…y se puede corregir (contra costo → garantía) sin tocar número ni fecha', ed.tipo==='gar' && /^ATC /.test(ed.oc) && ed.fecha==='2026-10-16', ed);

  // la vieja, por una vendedora: tiene que marcarla
  const viejaVend = await ev(async () => {
    UNLOCKED=false; editPedido('vieja-1'); await new Promise(r=>setTimeout(r,200));
    var v=segVal('f-atc-tipo'), n0=window._guardados.length;
    submitPedido(); await new Promise(r=>setTimeout(r,400));
    var falta=document.getElementById('atc-falta').textContent, guardo=window._guardados.length>n0;
    document.querySelector('#f-atc-tipo button[data-val="stc"]').click();
    submitPedido(); await new Promise(r=>setTimeout(r,400)); try{ closeModal(); }catch(e){}
    return { v:v, guardo1:guardo, falta:falta, tipo:atcTipo(findById('vieja-1')) };
  });
  chk('una ATC vieja (sin marca) vuelve al formulario SIN elegir', viejaVend.v==='', viejaVend.v);
  chk('…una vendedora no la puede guardar sin marcarla («los datos faltantes»)', !viejaVend.guardo1 && /contra costo/.test(viejaVend.falta), viejaVend);
  chk('…y marcándola se guarda', viejaVend.tipo==='stc', viejaVend.tipo);

  // otra vieja, con la clave: se guarda sin marcar después de confirmar
  await ev((V) => { var v=JSON.parse(JSON.stringify(V)); v.id='vieja-2'; v.oc='ATC 09-008'; v.cliente='OTRA VIEJA';
    STATE.push(v); window._pl.push(JSON.parse(JSON.stringify(v))); saveMirror(); }, VIEJA);
  const viejaAdm = await ev(async () => {
    UNLOCKED=true; editPedido('vieja-2'); await new Promise(r=>setTimeout(r,200));
    var n0=window._guardados.length;
    submitPedido(); await new Promise(r=>setTimeout(r,400)); try{ closeModal(); }catch(e){}
    UNLOCKED=false;
    return { guardo: window._guardados.length>n0, tipo:atcTipo(findById('vieja-2')) };
  });
  chk('🔑 con la clave, una vieja sin marca se guarda igual (confirmando) y sigue «sin marcar»', viejaAdm.guardo && viejaAdm.tipo==='', viejaAdm);

  // ============ 4. la pestaña ATC filtra y cuenta ============
  const tab = await ev(async () => {
    showView('atc'); segSet('atc-mode','todo'); document.getElementById('atc-wrap-mes').style.display='none';
    var s=document.getElementById('atc-tipo'); s.value=''; renderAtc();
    var chips=[].slice.call(document.querySelectorAll('#atc-por-motivo .atc-tipos button')).map(function(b){ return b.textContent.replace(/\s+/g,' ').trim(); });
    var filas=function(){ return [].slice.call(document.querySelectorAll('#tbl-atc tbody tr')).map(function(tr){ return tr.textContent.replace(/\s+/g,' '); }); };
    var todas=filas();
    s.value='stc'; s.dispatchEvent(new Event('change')); var stc=filas();
    s.value='gar'; s.dispatchEvent(new Event('change')); var gar=filas();
    s.value='sin'; s.dispatchEvent(new Event('change')); var sin=filas();
    s.value=''; s.dispatchEvent(new Event('change'));
    var b=document.querySelector('#atc-por-motivo .atc-tipos button[data-t="stc"]'); if(b) b.click();
    var porChip=filas(), selChip=s.value;
    var b2=document.querySelector('#atc-por-motivo .atc-tipos button[data-t="stc"]'); if(b2) b2.click();
    return { chips:chips, todas:todas.length, stc:stc, gar:gar, sin:sin, porChip:porChip.length, selChip:selChip, despues:s.value };
  });
  chk('la pestaña ATC cuenta por tipo: 2 garantía, 1 contra costo y 1 sin marcar', tab.chips.length===3 && /Garantía 2/.test(tab.chips[0]) && /Contra costo \(STC\) 1/.test(tab.chips[1]) && /Sin marcar 1/.test(tab.chips[2]), tab.chips);
  chk('…el filtro «🔧 Contra costo» deja solo esa', tab.stc.length===1 && /ROSA VIEJA/.test(tab.stc[0]) && /Contra costo/.test(tab.stc[0]), tab.stc);
  chk('…«🛡️ Garantía» las dos de garantía', tab.gar.length===2 && tab.gar.every(function(t){ return /Garantía/.test(t); }), tab.gar.length);
  chk('…«❓ Sin marcar» la vieja que nadie marcó', tab.sin.length===1 && /OTRA VIEJA/.test(tab.sin[0]) && /Sin marcar/.test(tab.sin[0]), tab.sin);
  chk('…y tocar el chip filtra (y tocarlo otra vez lo saca)', tab.porChip===1 && tab.selChip==='stc' && tab.despues==='', tab);

  // ============ 5. la ficha: marcar una vieja ahí mismo ============
  const ficha = await ev(async () => {
    UNLOCKED=false; verAtc('vieja-2'); await new Promise(r=>setTimeout(r,60));
    var m=document.getElementById('modal'), txt=m.textContent.replace(/\s+/g,' ');
    var bts=[].slice.call(m.querySelectorAll('.atc-tipo-btns button')).map(function(b){ return b.textContent; });
    var n0=window._guardados.length;
    var b=m.querySelector('.atc-tipo-btns button[data-tipo="gar"]'); if(b) b.click();
    await new Promise(r=>setTimeout(r,200));
    var g=window._guardados.slice(n0).filter(function(x){ return x.id==='vieja-2'; }).pop();
    var txt2=document.getElementById('modal').textContent.replace(/\s+/g,' ');
    var bts2=[].slice.call(document.querySelectorAll('#modal .atc-tipo-btns button')).length;
    atcTipoMarcar('vieja-2','stc'); await new Promise(r=>setTimeout(r,100));
    var sigue=atcTipo(findById('vieja-2')), t=document.getElementById('toast').textContent;
    var q=findById('vieja-2');
    return { sinMarcar:/Sin marcar/.test(txt), bts:bts, guardo:!!g, tipoG:g ? g.productos[0].atc.tipo : null, mot:g ? g.productos[0].atc.mot : null,
             txt2:/Garantía/.test(txt2), bts2:bts2, sigue:sigue, toast:t, fecha:q.fecha, oc:q.oc };
  });
  chk('la ficha de una vieja dice «❓ Sin marcar» y ofrece los dos botones', ficha.sinMarcar && ficha.bts.length===2, ficha.bts);
  chk('…tocar «🛡️ Garantía» la guarda en la planilla con la marca, sin perder lo demás de la ATC', ficha.guardo && ficha.tipoG==='gar' && ficha.mot==='Ruido', ficha);
  chk('…la ficha se repinta con la marca y, sin clave, ya no ofrece cambiarla', ficha.txt2 && ficha.bts2===0, ficha);
  chk('…una vendedora no puede cambiar una marca ya puesta (hace falta la clave)', ficha.sigue==='gar' && /clave de Administración/.test(ficha.toast), ficha.toast);
  chk('…y marcar no movió ni el número ni la fecha', ficha.oc==='ATC 09-008' && ficha.fecha==='2026-09-22', ficha);
  const fichaAdm = await ev(async () => {
    UNLOCKED=true; verAtc('vieja-2'); await new Promise(r=>setTimeout(r,60));
    var n=document.querySelectorAll('#modal .atc-tipo-btns button').length;
    atcTipoMarcar('vieja-2','stc'); await new Promise(r=>setTimeout(r,150));
    UNLOCKED=false; try{ closeModal(); }catch(e){}
    return { n:n, tipo:atcTipo(findById('vieja-2')) };
  });
  chk('🔑 con la clave sí se puede corregir desde la ficha', fichaAdm.n===2 && fichaAdm.tipo==='stc', fichaAdm);
  await ev(async () => { UNLOCKED=true; atcTipoMarcar('vieja-2','gar'); await new Promise(r=>setTimeout(r,150)); UNLOCKED=false; });

  // ============ 6. la copia, el correo, el WhatsApp y los chips ============
  const textos = await ev(() => {
    var s=document.getElementById('atc-tipo'); s.value=''; renderAtc();
    window._copiado=[]; copiarAtc(); var todo=window._copiado.pop()||'';
    s.value='stc'; renderAtc(); copiarAtc(); var soloStc=window._copiado.pop()||''; s.value=''; renderAtc();
    var lin=todo.split('\n'), enc=(lin[2]||'').split('\t');
    var fila=function(cli){ var l=lin.filter(function(x){ return x.indexOf(cli)>=0; })[0]||''; var c=l.split('\t'); return c[c.length-1]; };
    var stc=findById('vieja-1'), gar=STATE.filter(function(x){ return x.cliente==='CON GARANTIA'; })[0];
    return { enc:enc, ultimaEnc:enc[enc.length-1], tStc:fila('ROSA VIEJA'), tGar:fila('CON GARANTIA'), cabStc:soloStc.split('\n')[0],
             asuntoStc:atcCorreoAsunto(stc), asuntoGar:atcCorreoAsunto(gar), cuerpoStc:atcCorreoTexto(stc),
             waStc:pedidoText(stc), waGar:pedidoText(gar), chipStc:atcChip(stc), chipGar:atcChip(gar) };
  });
  chk('«📋 Copiar» trae la columna «Tipo» AL FINAL (no corre las de siempre)', textos.ultimaEnc==='Tipo' && textos.enc[2]==='Fecha de compra', textos.enc);
  chk('…con «Contra costo (STC)» y «Garantía» en cada fila', textos.tStc==='Contra costo (STC)' && textos.tGar==='Garantía', [textos.tStc, textos.tGar]);
  chk('…y con el filtro puesto, la copia dice de qué tipo es', /Solo contra costo \(STC\)/.test(textos.cabStc), textos.cabStc);
  chk('📧 el asunto del correo dice el tipo, sin paréntesis dobles', /^ATC 09-007 \(Contra costo - STC\) · ROSA VIEJA/.test(textos.asuntoStc) && /^ATC 10-\d+ \(Garantía\) · CON GARANTIA/.test(textos.asuntoGar), [textos.asuntoStc, textos.asuntoGar]);
  chk('…y el mensaje del correo también («Tipo: Contra costo (STC)»)', /\nTipo: Contra costo \(STC\)\n/.test(textos.cuerpoStc), (textos.cuerpoStc.match(/Tipo:.*/)||[''])[0]);
  chk('📲 el WhatsApp del grupo lo dice al lado de «Atención al cliente»', /🎧 \*Atención al cliente\* · 🔧 Contra costo \(STC\) — Ruido/.test(textos.waStc) && /🎧 \*Atención al cliente\* · 🛡️ Garantía — /.test(textos.waGar), (textos.waStc.match(/🎧.*/)||[''])[0]);
  chk('en las listas del panel la de contra costo lleva «🔧 STC» y la de garantía queda como siempre', /🔧 STC/.test(textos.chipStc) && /🎧 ATC/.test(textos.chipStc) && !/STC/.test(textos.chipGar), [textos.chipStc.replace(/<[^>]+>/g,''), textos.chipGar.replace(/<[^>]+>/g,'')]);

  // ============ 7. el informe PDF ============
  const inf = await ev(async () => {
    var Dt=atciDatos('todas',''), Ds=atciDatos('todas','stc'), Dg=atciDatos('todas','gar');
    UNLOCKED=true;   // 📄 (§4lm) el informe es de gerencia
    var s=document.getElementById('atc-tipo'); s.value='stc'; renderAtc();
    abrirInformeAtc(); await new Promise(r=>setTimeout(r,300));
    var sel=(document.getElementById('atci-tipo')||{}).value, info=(document.getElementById('atci-info')||{}).textContent||'';
    var alc=document.getElementById('atci-alc'); alc.value='todas'; atciPintar();
    var hojas=document.getElementById('atci-hojas').textContent.replace(/\s+/g,' ');
    document.getElementById('atci-tipo').value=''; atciPintar();
    var hojasT=document.getElementById('atci-hojas').textContent.replace(/\s+/g,' ');
    atciCerrar(); s.value=''; UNLOCKED=false; renderAtc();
    return { nT:Dt.n, nS:Ds.n, nG:Dg.n, pt:Dt.porTipo, etq:atciEtq(Ds), arch:atciArchivo('2026-10','stc'), archG:atciArchivo('todas','gar'),
             sel:sel, info:info, solo:/Solo contra costo \(STC\)/.test(hojas), port:/🔧 Solo contra costo/.test(hojas), lomas:/Por tipo: 3 de garantía y 1 contra costo \(STC\)/.test(hojasT) };
  });
  chk('📄 el informe separa: 4 en total, 1 contra costo, 3 garantía', inf.nT===4 && inf.nS===1 && inf.nG===3, [inf.nT, inf.nS, inf.nG]);
  chk('…abierto desde la pestaña filtrada, arranca con ese tipo', inf.sel==='stc', inf.sel);
  chk('…cada hoja dice «Solo contra costo (STC)» y la portada también', inf.solo && inf.port && /Solo contra costo \(STC\)/.test(inf.etq), inf.etq);
  chk('…el archivo lo dice en el nombre', /^Informe-ATC-STC-octubre-2026\.pdf$/.test(inf.arch) && /^Informe-ATC-garantia-todas-al-/.test(inf.archG), [inf.arch, inf.archG]);
  chk('…y con los dos tipos juntos, «Lo más importante» cuenta cuántas de cada uno', inf.lomas, inf.pt);

  // ============ 8. 🧽 Bloki lo sabe (dueño: «¿el pendejito ya enseña y sabe también?») ============
  const bk = await ev(() => {
    var q=function(t){ var i=asisBuscar(t); return i.length ? ASIS_AYUDA[i[0]].q : '(nada)'; };
    var una=function(t){ return ASIS_AYUDA.filter(function(a){ return a.q.indexOf(t)>=0; })[0]||{}; };
    return { correo:q('como mando el correo'), outlook:q('outlook'), stc:q('stc'), garantia:q('garantia o contra costo'), sin:q('sin marcar'),
             busco:q('como busco un pedido'), fC:[].concat(una('correo de una ATC').f), fT:[].concat(una('contra costo (STC)').f), cargo:(una('cargo una ATC').p||[]).join(' ') };
  });
  chk('🧽 Bloki sabe cómo mandar el correo de la ATC («correo», «outlook»)', /correo de una ATC/.test(bk.correo) && /correo de una ATC/.test(bk.outlook), [bk.correo, bk.outlook]);
  chk('…y cómo separar garantía y contra costo («stc», «garantía o contra costo», «sin marcar»)', [bk.stc, bk.garantia, bk.sin].every(function(x){ return /contra costo \(STC\)/.test(x); }), [bk.stc, bk.garantia, bk.sin]);
  chk('…«stc» no lo confunde con «encontrar» (sigue «¿Cómo busco un pedido?» para lo suyo)', /busco un pedido/.test(bk.busco), bk.busco);
  chk('…al cargar una ATC dice que hay que marcar garantía o contra costo', /garantía o 🔧 contra costo/.test(bk.cargo), bk.cargo);
  chk('…y señala el filtro «Tipo» de la pestaña ATC', bk.fT.indexOf('#atc-tipo')>=0, bk.fT);

  chk('sin errores de la página', errors.length===0, errors.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
