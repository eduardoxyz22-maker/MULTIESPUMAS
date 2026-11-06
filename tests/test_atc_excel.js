/* 📄 EL FORMULARIO DE LA ATC EN EXCEL (06/11/2026)
   El dueño: *«habíamos quedado que se generaba el Excel, aparecía el botón de descargar Excel y se juntaba eso directamente al
   correo… te subí el formato… ese era el Excel que se tenía que crear»* (su ATC_MODELO.xlsx) y los seis correos a los que va.
   Cuida:
   1. Al guardar una ATC, «✅ ATC guardada» trae «⬇️ Bajar el Excel de la ATC» adentro del correo, ARRIBA del WhatsApp, y baja
      «ATC-<número>-<cliente>.xlsx».
   2. El Excel es el formato del dueño con lo cargado: cliente, fecha, N° ATC, teléfono, fecha de compra, dirección, vendedora,
      ● COLCHÓN / ○ SOMIER / ○ CAMABOX, visita técnica (= el recojo), comodín, línea/modelo/plaza/medidas, el reclamo, la recepción
      de productos y los seis correos. «NRO DE FACTURA» va vacío (dueño, §4bs). Se relee con el MISMO lector del panel.
   3. Trae el logo y los dos dibujos del esquema (tres imágenes), sin grilla y en una hoja.
   4. El «Para» del correo arranca con los seis correos; lo que una compu escribió ANTES se olvida una vez; lo nuevo se recuerda.
   5. La ficha de la ATC tiene «⬇️ Excel de la ATC»; una venta y una RPT no tienen ese botón.
   6. El Excel de la RPT sigue igual (una imagen, image1.png) y los estilos nuevos no rompen los otros Excel.
   7. Plaza y qué es el producto: 90 → 1, 105 → 1 ½, 140 → 2, 160 → 2 ½, 200 → 3; un somier marca SOMIER, una almohada nada.
   Datos INVENTADOS. Se corre:  node tests/test_atc_excel.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1400,height:1000} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.install({ time: new Date('2026-11-06T10:00:00-04:00') });
  await page.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html'), { waitUntil:'load' });
  await page.clock.runFor(400);
  const ev=(f,a)=>Promise.race([page.evaluate(f,a), new Promise((_,rej)=>setTimeout(()=>rej(new Error('colgado 25 s')),25000))])
    .catch(e=>({ __err:String((e&&e.message)||e).slice(0,200) }));

  await ev(() => {
    document.getElementById('conn-form').style.display='none';
    CONNECTED=true; UNLOCKED=true;
    window._pl=[]; window._bajados=[]; window._abiertos=[];
    apiSave=function(rec){ var g=JSON.parse(JSON.stringify(rec));
      window._pl=window._pl.filter(function(x){return x.id!==g.id;}).concat([g]); return Promise.resolve({ok:true}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(window._pl))}); };
    window.downloadBlob=function(b,n,t){ window._bajados.push({ bytes:b, n:n, t:t }); };
    window.open=function(u){ window._abiertos.push(String(u)); return null; };
    try{ localStorage.removeItem('me_atc_correo'); localStorage.removeItem('me_atc_correo_v'); }catch(e){}
    STATE=[]; saveMirror();
    /* Lee un .xlsx con el lector del panel y devuelve las filas con sus letras, y los nombres de las partes del zip. */
    window._leer=async function(bytes){
      var ab=bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset+bytes.byteLength);
      var filas=xlsxHoja(await xlsxDescomprimir(ab));
      var crudo=''; for(var i=0;i<bytes.length;i++) crudo+=String.fromCharCode(bytes[i]);
      return { filas:filas, crudo:crudo };
    };
  });

  const llenar = (o) => ev(async (o) => {
    showView('form'); resetForm();
    document.getElementById('f-fecha').value='2026-11-10'; segSet('f-turno','AM');
    segSet('f-doc-tipo','ATC'); setDocTipo();
    document.getElementById('f-vendedor').value='Mirian Salazar'; applyVendedorLite();
    document.getElementById('f-cliente').value=o.cliente;
    document.getElementById('f-celular').value='70011122';
    document.getElementById('f-zona').value='Norte';
    document.getElementById('f-direccion').value='Av. Banzer 5to anillo';
    var pr=document.querySelector('#f-productos .prod-desc'); pr.value=o.prod||'TITANIO LATEX';
    var md=document.querySelector('#f-productos .prod-medida'); if(md) md.value=o.medida||'160x190';
    var cn=document.querySelector('#f-productos .prod-cant'); if(cn) cn.value='1';
    segSet('f-atc-tipo','gar');
    document.getElementById('f-atc-motivo').value='Hundimiento';
    document.getElementById('f-atc-detalle').value='hundido en el medio del lado derecho, no retoma su forma';
    document.getElementById('f-atc-compra').value='2025-03-10';
    if(o.comodin) segSet('f-atc-comodin','SI');
    document.getElementById('f-pz-col').checked=true;
    var pp=document.getElementById('f-pz-pat'); if(pp) pp.checked=true;
    document.getElementById('f-atc-rnota').value='4 patas negras';
  }, o);
  const guardar = () => ev(async () => {
    var n0=STATE.length; submitPedido();
    await new Promise(r=>setTimeout(r,400));
    var m=document.getElementById('modal'), c=document.getElementById('atc-correo'), wa=document.getElementById('wa-text');
    var b=c && [].slice.call(c.querySelectorAll('button')).filter(function(x){ return /Bajar el Excel de la ATC/.test(x.textContent); })[0];
    return { guardo:STATE.length>n0, titulo:(m.querySelector('.modal-h h3')||{}).textContent, boton:!!b,
             antes: !!(b && wa && (b.compareDocumentPosition(wa) & Node.DOCUMENT_POSITION_FOLLOWING)),
             para: c ? document.getElementById('atc-correo-para').value : null,
             texto: c ? document.getElementById('atc-correo-texto').value : '' };
  });

  // ============ 1. al guardar, el botón del Excel ============
  console.log('\n── 1. «✅ ATC guardada» con el Excel ──');
  await llenar({ cliente:'JUAN PÉREZ & HIJOS', comodin:true });
  let r = await guardar();
  chk('la ATC se guarda y dice «✅ ATC guardada»', r.guardo && /ATC guardada/.test(r.titulo), r);
  chk('⬇️ «Bajar el Excel de la ATC» está adentro del correo, ARRIBA del mensaje de WhatsApp', r.boton && r.antes, r);
  chk('el mensaje del correo dice que va el Excel adjunto, con su nombre', /Adjunto el formulario en Excel \(ATC-11-\d{3}-JUAN-PEREZ-HIJOS\.xlsx\)/.test(r.texto), r.texto.slice(0,200));
  const baj = await ev(async () => {
    var c=document.getElementById('atc-correo');
    [].slice.call(c.querySelectorAll('button')).filter(function(x){ return /Bajar el Excel de la ATC/.test(x.textContent); })[0].click();
    var d=window._bajados[window._bajados.length-1]; if(!d) return { nada:true };
    var L=await window._leer(d.bytes);
    var oc=STATE.filter(function(x){ return /^JUAN/.test(x.cliente); })[0].oc;
    return { n:d.n, t:d.t, oc:oc, filas:L.filas, crudo:L.crudo.length, partes:(L.crudo.match(/xl\/media\/image[0-9_]+\.png/g)||[]).filter(function(x,i,a){ return a.indexOf(x)===i; }),
             grilla:/showGridLines="0"/.test(L.crudo), unaHoja:/fitToPage="1"/.test(L.crudo) && /paperSize="9"/.test(L.crudo) };
  });
  chk('baja «ATC-<número>-<cliente>.xlsx» sin tildes', baj.n && /^ATC-11-\d{3}-JUAN-PEREZ-HIJOS\.xlsx$/.test(baj.n) && /spreadsheetml/.test(baj.t), baj.n);

  // ============ 2. lo que dice el Excel ============
  console.log('\n── 2. El formato del dueño, lleno ──');
  const F=baj.filas||[];
  const fila=(a)=>F.filter(function(f){ return f && String(f.A||'').trim()===a; })[0]||{};
  const celda=(f,l)=>String((f&&f[l])==null?'':f[l]).trim();
  chk('el título del formato', F[0] && /FORMULARIO DE ATENCION AL CLIENTE/.test(celda(F[0],'A')), F[0]);
  chk('CLIENTE y FECHA (el día que entró)', celda(fila('CLIENTE'),'B')==='JUAN PÉREZ & HIJOS' && celda(fila('CLIENTE'),'D')==='06/11/2026', fila('CLIENTE'));
  chk('NRO DE FACTURA vacío y el N° de la ATC al lado', celda(fila('NRO DE FACTURA'),'B')==='' && celda(fila('NRO DE FACTURA'),'C')==='N° ATC' && celda(fila('NRO DE FACTURA'),'D')===baj.oc, fila('NRO DE FACTURA'));
  chk('TELEFONO y FECHA DE COMPRA con hace cuánto', celda(fila('TELEFONO'),'B')==='70011122' && /^10\/03\/2025 \(hace 1 año y 8 meses\)$/.test(celda(fila('TELEFONO'),'D')), fila('TELEFONO'));
  chk('DIRECCION con la zona', celda(fila('DIRECCION'),'B')==='Norte — Av. Banzer 5to anillo', fila('DIRECCION'));
  chk('VENDEDORA y el producto marcado: ● COLCHÓN ○ SOMIER ○ CAMABOX', celda(fila('VENDEDORA'),'B')==='Mirian Salazar' && /● COLCHÓN\s+○ SOMIER\s+○ CAMABOX/.test(celda(fila('VENDEDORA'),'C')), fila('VENDEDORA'));
  chk('FECHA DE VISITA TECNICA = el recojo, y el COMODIN en SI', celda(fila('FECHA DE VISITA TECNICA'),'B')==='10/11/2026 · turno AM' && /■ SI\s+□ NO/.test(celda(fila('FECHA DE VISITA TECNICA'),'D')), fila('FECHA DE VISITA TECNICA'));
  chk('LINEA / MODELO como el informe de ATC (TITANIO / LATEX)', celda(fila('LINEA'),'B')==='TITANIO' && celda(fila('LINEA'),'D')==='LATEX', fila('LINEA'));
  chk('PLAZA (160 → 2 ½) y MEDIDAS', celda(fila('PLAZA'),'B')==='2 ½' && /^160x190/.test(celda(fila('PLAZA'),'D')), fila('PLAZA'));
  const rec=F.filter(function(f){ return /^Tipo: /.test(celda(f,'A')); })[0]||{};
  chk('DETALLES DEL RECLAMO: tipo, motivo y el detalle', /Tipo: Garantía/.test(celda(rec,'A')) && /Motivo: Hundimiento/.test(celda(rec,'A')) && /hundido en el medio del lado derecho/.test(celda(rec,'A')), celda(rec,'A'));
  chk('RECEPCION DE PRODUCTOS: colchón y patas en SI, somier vacío, la nota', celda(fila('COLCHÓN:'),'B')==='SI' && celda(fila('COLCHÓN:'),'D')==='SI' && celda(fila('SOMIER:'),'B')==='' && celda(fila('NOTA:'),'B')==='4 patas negras', [fila('COLCHÓN:'), fila('SOMIER:')]);
  chk('las firmas y las condiciones ambientales (en blanco) como el formato', !!fila('ENTREGUE CONFORME').A && !!fila('HUMEDAD').A && celda(fila('HUMEDAD'),'B')==='' && !!fila('DESNIVEL').A, '');
  const mails=['logistica@colchonesheaven.com','ernesto.flores@colchonesheaven.com','daniel.garnica@colchonesheaven.com','jose.rivero@colchonesheaven.com','e.anez@colchonesheaven.com','eliana.vargas@colchonesheaven.com'];
  const todo=F.map(function(f){ return Object.keys(f||{}).map(function(k){ return f[k]; }).join(' | '); }).join('\n');
  chk('los seis correos van escritos adentro del Excel', mails.every(function(m){ return todo.indexOf(m)>=0; }) && /ENVIAR ESTE FORMULARIO POR CORREO A/.test(todo), mails.filter(function(m){ return todo.indexOf(m)<0; }));

  // ============ 3. imágenes, grilla, una hoja ============
  console.log('\n── 3. El logo, los dibujos, sin grilla, en una hoja ──');
  chk('trae tres imágenes: el logo y los dibujos del colchón y el somier', JSON.stringify(baj.partes)===JSON.stringify(['xl/media/image1.png','xl/media/image1_2.png','xl/media/image1_3.png']), baj.partes);
  chk('sin la grilla gris y entera en una hoja A4', baj.grilla && baj.unaHoja, baj);

  // ============ 4. el «Para» ============
  console.log('\n── 4. El «Para» con los seis correos ──');
  chk('el «Para» arranca con los seis correos que dio el dueño', r.para===mails.join(', '), r.para);
  const para = await ev(() => {
    window._abiertos=[]; atcCorreoAbrir('gmail');
    var g=window._abiertos[0]||'';
    try{ localStorage.removeItem('me_atc_correo_v'); localStorage.setItem('me_atc_correo','vieja@ejemplo.com'); }catch(e){}
    var olvida=atcCorreoPara();
    try{ localStorage.setItem('me_atc_correo','nueva@ejemplo.com'); }catch(e){}
    var recuerda=atcCorreoPara();
    try{ localStorage.setItem('me_atc_correo',''); }catch(e){}
    var vacio=atcCorreoPara();
    return { to:decodeURIComponent((g.split('&to=')[1]||'').split('&su=')[0]), olvida:olvida, recuerda:recuerda, vacio:vacio };
  });
  chk('📧 «Abrir en Gmail» lleva los seis en el «Para»', para.to===mails.join(', '), para.to);
  chk('lo que una compu escribió ANTES de la lista se olvida una vez', para.olvida===mails.join(', '), para.olvida);
  chk('…lo que escriba después sí se recuerda', para.recuerda==='nueva@ejemplo.com', para.recuerda);
  chk('…y un «Para» vacío vuelve a la lista', para.vacio===mails.join(', '), para.vacio);

  // ============ 5. la ficha, la venta y la RPT ============
  console.log('\n── 5. La ficha de la ATC; la venta y la RPT no ──');
  await ev(() => closeModal());
  const ficha = await ev(async () => {
    var p=STATE.filter(function(x){ return /^JUAN/.test(x.cliente); })[0];
    verAtc(p.id); await new Promise(r=>setTimeout(r,100));
    var b=[].slice.call(document.querySelectorAll('#modal button')).filter(function(x){ return /Excel de la ATC/.test(x.textContent); })[0];
    if(!b) return { boton:false };
    var n0=window._bajados.length; b.click();
    return { boton:true, bajo:window._bajados.length===n0+1, n:(window._bajados[window._bajados.length-1]||{}).n };
  });
  chk('la ficha de la ATC tiene «⬇️ Excel de la ATC» y baja el mismo archivo', ficha.boton && ficha.bajo && ficha.n===baj.n, ficha);
  await ev(() => closeModal());
  const otros = await ev(async () => {
    showWhatsappModal({ id:'rpt-x', oc:'RPT 11-001', cliente:'Mia Plaza', vendedor:'Mirian Salazar', fecha:'2026-11-10', turno:'AM', productos:[{desc:'TITANIO LATEX', medida:'160x190', cant:1}] });
    await new Promise(r=>setTimeout(r,50));
    var rpt=/Excel de la ATC/.test(document.getElementById('modal').textContent);
    closeModal();
    showWhatsappModal({ id:'oc-x', oc:'11-050', cliente:'VENTA COMUN', vendedor:'Mirian Salazar', fecha:'2026-11-10', turno:'AM', productos:[{desc:'TITANIO LATEX', medida:'160x190', cant:1}] });
    await new Promise(r=>setTimeout(r,50));
    var oc=/Excel de la ATC/.test(document.getElementById('modal').textContent);
    closeModal();
    bajarAtcExcel('no-existe');
    var t1=document.getElementById('toast').textContent;
    return { rpt:rpt, oc:oc, t1:t1 };
  });
  chk('una RPT y una venta no tienen el Excel de la ATC', !otros.rpt && !otros.oc, otros);
  chk('sin la ATC no baja nada callado: avisa', /No encuentro esa ATC/.test(otros.t1), otros.t1);

  // ============ 6. la RPT y los otros Excel siguen bien ============
  console.log('\n── 6. La RPT y los demás Excel ──');
  const rpt = await ev(async () => {
    var p={ id:'x1', oc:'RPT 11-001', fecha:'2026-11-10', turno:'AM', vendedor:'Mirian Salazar', cliente:'Mia Plaza', ts:Date.now(),
            productos:[{ desc:'COLCHON TITANIO LATEX', medida:'140x190', codigo:'CH1129', cant:2, rtipo:'Reposición' }] };
    var b=buildXlsx([rptHoja(p)]), L=await window._leer(b);
    var parts=(L.crudo.match(/xl\/media\/image[0-9_]+\.png/g)||[]).filter(function(x,i,a){ return a.indexOf(x)===i; });
    var simple=buildXlsx([{ name:'Prueba', matrix:[['A',{v:1,t:'n',s:2}],['B',{v:'x',s:XS_LINK}]] }]), L2=await window._leer(simple);
    var cuenta=function(tag, hijo){ var m=STYLES_XML.match(new RegExp('<'+tag+' count="(\\d+)">([\\s\\S]*?)</'+tag+'>')); return m ? [Number(m[1]), (m[2].match(new RegExp('<'+hijo+'[ >/]','g'))||[]).length] : null; };
    return { parts:parts, titulo:String((L.filas[4]||{}).A||''), simple:L2.filas.length, grilla:/showGridLines/.test(L.crudo),
             fonts:cuenta('fonts','font'), fills:cuenta('fills','fill'), borders:cuenta('borders','border'), xfs:cuenta('cellXfs','xf'), viejo:STYLES_XML.indexOf('<xf numFmtId="0" fontId="9" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>')<0 };
  });
  chk('el Excel de la RPT sigue con UNA imagen (image1.png) y su título', JSON.stringify(rpt.parts)==='["xl/media/image1.png"]' && /REPOSICIÓN DE TIENDA/.test(rpt.titulo) && !rpt.grilla, rpt);
  chk('otro Excel armado después del de la ATC se lee igual', rpt.simple===2, rpt.simple);
  chk('los estilos nuevos se suman al final y cada «count» coincide', rpt.fonts && rpt.fonts[0]===rpt.fonts[1] && rpt.fills[0]===rpt.fills[1] && rpt.borders[0]===rpt.borders[1] && rpt.xfs[0]===rpt.xfs[1] && rpt.xfs[0]>29, rpt);
  const otro = await ev(() => { var a=xsExtra({ b:1, sz:10 }), b=xsExtra({ b:1, sz:10 }); return { a:a, b:b, viejo:XS_LINK }; });
  chk('el mismo estilo pedido dos veces es el mismo número, y los de siempre no se mueven (XS_LINK=28)', otro.a===otro.b && otro.a>28 && otro.viejo===28, otro);

  // ============ 7. plaza y qué es ============
  console.log('\n── 7. Plaza y qué producto es ──');
  const pl = await ev(() => ({
    p90:atcPlazaDe({ desc:'ORO ORTOPEDICO', medida:'90x190' }), p105:atcPlazaDe({ desc:'ORO ORTOPEDICO', medida:'105x190' }),
    p140:atcPlazaDe({ desc:'X', medida:'140x190' }), p200:atcPlazaDe({ desc:'X', medida:'200x200' }), m:atcPlazaDe({ desc:'X', medida:'1,40x1,90' }),
    nom:atcPlazaDe({ desc:'COLCHON 2 1/2 PLAZAS', medida:'' }), nada:atcPlazaDe({ desc:'ALMOHADA', medida:'50x70' }),
    som:atcQueEs({ productos:[{ desc:'SOMIER TITANIO ICE', medida:'140x190' }] }), alm:atcQueEs({ productos:[{ desc:'ALMOHADA FIBRA SILICONADA', medida:'50x90' }] }),
    box:atcQueEs({ productos:[{ desc:'CAMA BOX ORO', medida:'140x190' }] }),
    esp:atcLineaModelo({ vendedor:'Mirian Salazar' }, { desc:'ESPECIAL SEMIORTOPEDICO', medida:'140x190' })
  }));
  chk('PLAZA por el ancho: 90 → 1, 105 → 1 ½, 140 → 2, 200 → 3 (también en metros)', pl.p90==='1' && pl.p105==='1 ½' && pl.p140==='2' && pl.p200==='3' && pl.m==='2', pl);
  chk('…o por el nombre («2 1/2 PLAZAS»), y nada en una almohada', pl.nom==='2 ½' && pl.nada==='', pl);
  chk('un somier marca SOMIER, una cama box CAMABOX, una almohada nada', pl.som.som && !pl.som.col && pl.box.box && !pl.alm.col && !pl.alm.som, pl);
  chk('ESPECIAL SEMIORTOPEDICO → LINEA ESPECIAL / MODELO SEMIORTOPEDICO (como la plantilla)', pl.esp.lin==='ESPECIAL' && pl.esp.mod==='SEMIORTOPEDICO', pl.esp);

  chk('sin errores de la página', !errors.length, errors.slice(0,3));
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
