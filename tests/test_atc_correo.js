/* 📧 EL CORREO DE LA ATC (15/10, §4li)
   El dueño: *«falta que al crear la ATC se genere el mensaje para copiar al correo, y ellas enviar»*.
   Cuida: al guardar una ATC sale «✅ ATC guardada» con el correo ARRIBA del mensaje de WhatsApp (Para, Asunto y Mensaje con
   todo lo de la ATC y los enlaces a las fotos del producto); copiar toma lo retocado; Gmail y «Otro correo» arman el enlace;
   el «Para» se recuerda en esa compu; la ficha de la ATC tiene «📧 Correo de la ATC»; una venta (OC) y una RPT no lo muestran.
   El panel NO manda nada. `PEDIDOS=<archivo>` corre contra otra página. */
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
    .catch(e=>({ __err:String((e&&e.message)||e).slice(0,140) }));

  await ev(() => {
    document.getElementById('conn-form').style.display='none';
    CONNECTED=true; UNLOCKED=true;
    window._pl=[]; window._subidas=0; window._abiertos=[]; window._copiado=[];
    apiSave=function(rec){ var g=JSON.parse(JSON.stringify(rec));
      window._pl=window._pl.filter(function(x){return x.id!==g.id;}).concat([g]); return Promise.resolve({ok:true}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(window._pl))}); };
    window.fotoCronometro=function(){ return Promise.resolve('data:image/jpeg;base64,AAAA'); };
    window.subirFoto=function(){ window._subidas++; return Promise.resolve({ok:true, fotoId:'FOTOATC'+window._subidas, version:'x'}); };
    window.open=function(u){ window._abiertos.push(String(u)); return null; };
    window.copyText=function(t){ window._copiado.push(String(t)); };
    try{ localStorage.removeItem('me_atc_correo'); }catch(e){}
    STATE=[]; saveMirror();
  });

  const llenar = (o) => ev(async (o) => {
    showView('form'); resetForm();
    document.getElementById('f-fecha').value='2026-10-16'; segSet('f-turno','AM');
    segSet('f-doc-tipo', o.tipo||'ATC'); setDocTipo();
    document.getElementById('f-vendedor').value='Mirian Salazar'; applyVendedorLite();
    document.getElementById('f-cliente').value=o.cliente;
    document.getElementById('f-celular').value='70011122';
    document.getElementById('f-zona').value='Norte';
    document.getElementById('f-direccion').value='Av. Banzer 5to anillo';
    var pr=document.querySelector('#f-productos .prod-desc'); pr.value='TITANIO LATEX';
    var md=document.querySelector('#f-productos .prod-medida'); if(md) md.value='160x190';
    var cn=document.querySelector('#f-productos .prod-cant'); if(cn) cn.value='1';
    if((o.tipo||'ATC')==='ATC'){
      segSet('f-atc-tipo','gar');   // (15/10, §4lj)
      document.getElementById('f-atc-motivo').value='Hundimiento';
      document.getElementById('f-atc-detalle').value='hundido en el medio\ndel lado derecho, no retoma su forma';
      document.getElementById('f-atc-compra').value='2025-03-10';
      document.getElementById('f-pz-col').checked=true;
      if(o.fotos){
        var f=function(n){ return new File(['x'], n, {type:'image/jpeg'}); };
        await atcFotosElegidas({ target:{ files:[f('a.jpg'), f('b.jpg')], value:'' } });
        await new Promise(r=>setTimeout(r,50));
      }
    }
  }, o);
  const guardar = () => ev(async () => {
    var n0=STATE.length; submitPedido();
    await new Promise(r=>setTimeout(r,400));
    var m=document.getElementById('modal'), h=m && m.querySelector('.modal-h h3');
    var c=document.getElementById('atc-correo'), wa=document.getElementById('wa-text');
    return { guardo: STATE.length>n0, titulo: h ? h.textContent : '', correo: !!c,
             antes: !!(c && wa && (c.compareDocumentPosition(wa) & Node.DOCUMENT_POSITION_FOLLOWING)),
             para: c ? document.getElementById('atc-correo-para').value : null,
             asunto: c ? document.getElementById('atc-correo-asunto').value : '',
             texto: c ? document.getElementById('atc-correo-texto').value : '',
             modal: m ? m.textContent.replace(/\s+/g,' ').slice(0,400) : '' };
  });

  // ============ 1. al guardar una ATC sale el correo, arriba ============
  await llenar({ cliente:'JUAN PÉREZ & HIJOS', fotos:true });
  let r = await guardar();
  chk('la ATC se guarda', r.guardo, r.modal);
  chk('la ventana dice «✅ ATC guardada»', /ATC guardada/.test(r.titulo), r.titulo);
  chk('📧 trae el correo de la ATC', r.correo, r.modal);
  chk('…ARRIBA del mensaje de WhatsApp (como el Excel de la RPT)', r.antes, r.antes);
  chk('…el «Para» arranca vacío en una compu nueva', r.para==='', r.para);
  const oc = await ev(() => STATE.filter(function(p){ return /^JUAN/.test(p.cliente); })[0].oc);
  chk('el asunto dice la ATC, el cliente, el motivo y el producto',
      r.asunto.indexOf(oc.replace(/^ATC\s*/,''))>=0 && /^ATC /.test(r.asunto) && /JUAN PÉREZ & HIJOS/.test(r.asunto) && /Hundimiento/.test(r.asunto) && /TITANIO LATEX 160x190/.test(r.asunto), r.asunto);
  chk('el asunto no repite «ATC ATC»', !/ATC\s+ATC/.test(r.asunto), r.asunto);
  const t=r.texto;
  chk('el mensaje lleva el N° de la ATC y la vendedora', t.indexOf('N° ATC: '+oc)>=0 && /Vendedor\/a: Mirian Salazar/.test(t), t.slice(0,200));
  chk('…el cliente con su celular y la dirección', /Nombre: JUAN PÉREZ & HIJOS/.test(t) && /Celular: 70011122/.test(t) && /Norte — Av\. Banzer 5to anillo/.test(t), t);
  chk('…el producto con su medida y cantidad', /TITANIO LATEX 160x190 x 1/.test(t), t);
  chk('…la fecha de compra y hace cuánto', /Fecha de compra: 10\/03\/2025 \(/.test(t), (t.match(/Fecha de compra:.*/)||[''])[0]);
  chk('…el motivo y el detalle (en una sola línea)', /Motivo: Hundimiento/.test(t) && /Detalle: hundido en el medio · del lado derecho, no retoma su forma/.test(t), (t.match(/Detalle:.*/)||[''])[0]);
  chk('…qué se le recoge', /Se le recoge: .*[Cc]olch/.test(t), (t.match(/Se le recoge:.*/)||[''])[0]);
  chk('…el recojo programado', /Recojo programado: 16\/10\/2026 · turno AM/.test(t), (t.match(/Recojo programado:.*/)||[''])[0]);
  chk('…y los enlaces a las 2 fotos del producto', /Foto 1: https:\/\/drive\.google\.com\/file\/d\/FOTOATC1\/view/.test(t) && /Foto 2: https:\/\/drive\.google\.com\/file\/d\/FOTOATC2\/view/.test(t), (t.match(/Foto \d:.*/g)||[]));
  chk('…cierra con «Saludos,» y la vendedora', /Saludos,\nMirian Salazar$/.test(t), t.slice(-40));
  chk('el nombre con «&» se ve bien en el HTML (escapado) y viaja tal cual', r.texto.indexOf('JUAN PÉREZ & HIJOS')>=0 && r.asunto.indexOf('&amp;')<0, r.asunto);

  // ============ 2. copiar y abrir ============
  const acc = await ev(() => {
    var ta=document.getElementById('atc-correo-texto'); ta.value=ta.value.replace('Buen día:','Buenas tardes:');
    var pa=document.getElementById('atc-correo-para'); pa.value='atc@ejemplo.com'; pa.dispatchEvent(new Event('change'));
    atcCorreoCopiar(); atcCorreoCopiar('asunto');
    atcCorreoAbrir('gmail');
    var mt=atcCorreoUrl('mailto', atcCorreoVals());
    var guardado=null; try{ guardado=localStorage.getItem('me_atc_correo'); }catch(e){}
    return { copiado: window._copiado.slice(), abiertos: window._abiertos.slice(), mailto: mt, guardado: guardado };
  });
  chk('📋 «Copiar el mensaje» copia lo retocado a mano', acc.copiado[0] && /^Buenas tardes:/.test(acc.copiado[0]), (acc.copiado[0]||'').slice(0,30));
  chk('📋 «Copiar el asunto» copia el asunto', acc.copiado[1]===r.asunto, acc.copiado[1]);
  const gm=acc.abiertos[0]||'';
  chk('📧 «Abrir en Gmail» abre el borrador de Gmail con Para, Asunto y Mensaje',
      /^https:\/\/mail\.google\.com\/mail\/\?view=cm&fs=1&to=atc%40ejemplo\.com&su=/.test(gm) && decodeURIComponent((gm.split('&su=')[1]||'').split('&body=')[0])===r.asunto
      && /^Buenas tardes:/.test(decodeURIComponent(gm.split('&body=')[1]||'')), gm.slice(0,120));
  chk('✉️ «Otro correo» arma el mailto con el asunto y el mensaje',
      /^mailto:atc@ejemplo\.com\?subject=/.test(acc.mailto) && /&body=Buenas%20tardes/.test(acc.mailto), acc.mailto.slice(0,80));
  chk('el «Para» queda recordado en esta compu', acc.guardado==='atc@ejemplo.com', acc.guardado);

  // ============ 3. la ATC siguiente ya trae el «Para» ============
  await ev(() => closeModal());
  await llenar({ cliente:'MARÍA GÓMEZ' });
  r = await guardar();
  chk('la ATC siguiente trae el «Para» de la vez anterior', r.correo && r.para==='atc@ejemplo.com', r.para);
  chk('una ATC sin fotos no pone «FOTOS DEL PRODUCTO»', r.correo && !/FOTOS DEL PRODUCTO/.test(r.texto), r.texto.slice(-120));

  // ============ 4. sin «Para», al abrir avisa ============
  const sinPara = await ev(() => {
    var pa=document.getElementById('atc-correo-para'); pa.value='';
    window._abiertos=[]; atcCorreoAbrir('gmail');
    return { toast: document.getElementById('toast').textContent, abrio: window._abiertos.length };
  });
  chk('sin «Para», «Abrir en Gmail» avisa que falta (y abre igual)', /falta el «Para»/.test(sinPara.toast) && sinPara.abrio===1, sinPara);

  // ============ 5. desde la ficha de la ATC ============
  await ev(() => closeModal());
  const ficha = await ev(async () => {
    var p=STATE.filter(function(x){ return /^JUAN/.test(x.cliente); })[0];
    verAtc(p.id); await new Promise(r=>setTimeout(r,100));
    var b=[].slice.call(document.querySelectorAll('#modal button')).filter(function(x){ return /Correo de la ATC/.test(x.textContent); })[0];
    if(!b) return { boton:false };
    b.click(); await new Promise(r=>setTimeout(r,100));
    var c=document.getElementById('atc-correo');
    var vuelve=[].slice.call(document.querySelectorAll('#modal button')).some(function(x){ return /Volver a la ficha/.test(x.textContent); });
    return { boton:true, correo:!!c, texto: c ? document.getElementById('atc-correo-texto').value : '', vuelve:vuelve,
             titulo:(document.querySelector('#modal .modal-h h3')||{}).textContent };
  });
  chk('la ficha de la ATC tiene «📧 Correo de la ATC»', ficha.boton, ficha);
  chk('…abre el mismo correo, con las fotos', ficha.correo && /Foto 2: https:\/\/drive/.test(ficha.texto), ficha.titulo);
  chk('…y «← Volver a la ficha»', ficha.vuelve, ficha.vuelve);

  // ============ 6. una venta (OC) y una RPT no lo muestran ============
  await ev(() => closeModal());
  const oc2 = await ev(async () => {
    showView('form'); resetForm();
    document.getElementById('f-fecha').value='2026-10-16'; segSet('f-turno','AM');
    document.getElementById('f-vendedor').value='Eduardo Añez'; applyVendedorLite();
    document.getElementById('f-cliente').value='VENTA COMUN';
    document.getElementById('f-zona').value='Norte';
    var pr=document.querySelector('#f-productos .prod-desc'); pr.value='TITANIO LATEX';
    var md=document.querySelector('#f-productos .prod-medida'); if(md) md.value='160x190';
    var n0=STATE.length; submitPedido(); await new Promise(r=>setTimeout(r,400));
    return { guardo: STATE.length>n0, correo: !!document.getElementById('atc-correo'), titulo:(document.querySelector('#modal .modal-h h3')||{}).textContent };
  });
  chk('una venta (OC) dice «✅ Pedido guardado» y no trae correo', oc2.guardo && /Pedido guardado/.test(oc2.titulo) && !oc2.correo, oc2);
  await ev(() => closeModal());
  const rpt = await ev(async () => {
    showWhatsappModal({ id:'rpt-x', oc:'RPT 10-001', cliente:'Mia Plaza', vendedor:'Mirian Salazar', fecha:'2026-10-16', turno:'AM',
                        productos:[{desc:'TITANIO LATEX', medida:'160x190', cant:1}] });
    await new Promise(r=>setTimeout(r,50));
    return { correo: !!document.getElementById('atc-correo'), titulo:(document.querySelector('#modal .modal-h h3')||{}).textContent };
  });
  chk('una reposición (RPT) no trae el correo de la ATC', /Reposición guardada/.test(rpt.titulo) && !rpt.correo, rpt);

  // ============ 7. reenviar una ATC desde Mis pedidos trae el correo también ============
  await ev(() => closeModal());
  const reenv = await ev(async () => {
    var p=STATE.filter(function(x){ return /^MARÍA/.test(x.cliente); })[0];
    waDesdeEdicion(p.id); await new Promise(r=>setTimeout(r,50));
    return { correo: !!document.getElementById('atc-correo'), titulo:(document.querySelector('#modal .modal-h h3')||{}).textContent };
  });
  chk('«📲 Reenviar» de una ATC también trae el correo', reenv.correo, reenv);

  chk('sin errores de la página', errors.length===0, errors.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
