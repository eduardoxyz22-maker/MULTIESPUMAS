/* 📄 INFORME DE ATC EN PDF (15/10, §4le). El dueño: «en la pestaña de ATC quiero un botón que genere un informe en PDF… lo más
   relevante tipo presentación sobre las ATC del mes, que uno puede elegir el mes. No quiero todas las ATC».
   Lo que cuida, con ATC inventadas y el reloj clavado en el jueves 15/10/2026 a las 10:00 de Bolivia:
     · las cuentas del mes (`atciDatos`): solo las que ENTRARON ese mes; las abiertas de meses anteriores van aparte; motivos con lo
       cerrado y el mes anterior; productos una vez por ATC; marcas; antigüedad; los tres tramos del circuito; la tendencia;
     · «Lo más importante» en palabras;
     · el botón de la pestaña abre la ventana en el mes que se está mirando, las hojas salen numeradas y cambiar el mes las rehace
       (un mes sin ATC también sale, y dice lo que queda de antes);
     · «⬇️ Descargar PDF» baja un PDF de verdad, apaisado, una hoja por página (con jsPDF y html2canvas servidos desde una copia local:
       `ATCI_LIBS_DIR`, o la carpeta de `npm i jspdf@2.5.1 html2canvas@1.4.1`); sin las librerías, abre la ventana de imprimir;
     · la hoja apaisada (`@page`) vive SOLO mientras el informe está abierto.
   Datos SINTÉTICOS. Se corre:  node tests/test_atc_informe.js   (desde la raíz) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs'), os = require('os');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const ARCH='file://'+(process.env.PEDIDOS||path.resolve('pedidos.html'));
/* Dónde están las copias de las librerías (no van al repo: se bajan con npm). Sin ellas, la parte del PDF se saltea y lo dice. */
const LIBS_DIR = process.env.ATCI_LIBS_DIR || '/tmp/claude-0/-home-user-MULTIESPUMAS/dab3dfa4-9445-5474-b412-a4265b40568c/scratchpad/libs/node_modules';
const LIB_JSPDF = path.join(LIBS_DIR, 'jspdf/dist/jspdf.umd.min.js'), LIB_H2C = path.join(LIBS_DIR, 'html2canvas/dist/html2canvas.min.js');
const HAY_LIBS = fs.existsSync(LIB_JSPDF) && fs.existsSync(LIB_H2C);
const SALIDA = process.env.ATCI_SALIDA || fs.mkdtempSync(path.join(os.tmpdir(), 'atci-'));

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz', acceptDownloads:true });
  const page = await ctx.newPage();
  const errores=[]; page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await page.clock.setFixedTime(new Date('2026-10-15T10:00:00-04:00'));
  let libsSi = true;
  await page.route(/^https?:/, r => {
    const u = r.request().url();
    if(libsSi && HAY_LIBS && /cdnjs\.cloudflare\.com\/ajax\/libs\/jspdf\/2\.5\.1\/jspdf\.umd\.min\.js$/.test(u)) return r.fulfill({ status:200, contentType:'application/javascript', body:fs.readFileSync(LIB_JSPDF) });
    if(libsSi && HAY_LIBS && /cdnjs\.cloudflare\.com\/ajax\/libs\/html2canvas\/1\.4\.1\/html2canvas\.min\.js$/.test(u)) return r.fulfill({ status:200, contentType:'application/javascript', body:fs.readFileSync(LIB_H2C) });
    return r.abort();
  });
  await page.goto(ARCH, { waitUntil:'load' }); await page.waitForTimeout(600);

  /* ---- el fixture ---- */
  await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok';
    if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
    apiSave=function(){ return Promise.resolve({ok:true}); };
    var ts=function(f){ return new Date(f+'T10:00:00-04:00').getTime(); };
    var A=function(id, oc, entro, fecha, vend, cli, desc, med, atc, extra){
      var p={ id:id, oc:oc, fecha:fecha, turno:'AM', cliente:cli, vendedor:vend, celular:'70000'+id.slice(-3), zona:'Centro', ts:ts(entro), entregado:false,
              productos:[{ desc:desc, medida:med, cant:1, atc:atc }] };
      for(var k in (extra||{})) p[k]=extra[k];
      return p;
    };
    STATE=[
      A('a01','ATC 10-001','2026-10-01','2026-10-03','Carola Chavez','ROCA JUAN','TITANIO LATEX','140x190', { mot:'Hundimiento', det:'Se hunde en el centro', fcom:'2025-03-01', rf:'2026-10-09', ent:'2026-10-10', hizo:'Se cambió la espuma' }),
      A('a02','ATC 10-002','2026-10-02','2026-10-05','Maria Flores','PAZ ANA','Titanio Latex','160x200', { mot:'Hundimiento', det:'Hundido a los costados', fcom:'2026-06-01', rf:'2026-10-12', ent:'2026-10-14' }),
      A('a03','ATC 10-003','2026-10-03','2026-10-06','Mauricio Merida','SOSA LUIS','MEMORY FLEX','140x190', { mot:'Resortes', det:'Suena un resorte', com:1 }),
      A('a04','ATC 10-004','2026-10-08','2026-10-20','Isabel Robledo','VACA ROSA','SOMIER ORO','140x190', { mot:'Ruido', det:'Cruje la base' }),
      A('a05','ATC 10-005','2026-10-09','2026-10-10','Jonathan Monje','ROJAS EVA','TITANIO LATEX','100x190', { mot:'', det:'El cliente no dijo', dev:'2026-10-13' }),
      A('a06','ATC 10-006','2026-10-10','2026-10-16','Fernando Peinado','LIMA OSCAR','BAHIA','140x190', { mot:'Hundimiento', det:'Se hunde', rec:'2026-10-11', pdev:'2026-10-16', pturno:'AM' }),
      /* septiembre: una cerrada y una que sigue abierta */
      A('b01','ATC 09-001','2026-09-10','2026-09-12','Carola Chavez','MENA SOL','TITANIO LATEX','140x190', { mot:'Hundimiento', rf:'2026-09-19', ent:'2026-09-20' }),
      A('b02','ATC 09-002','2026-09-15','2026-09-18','Maria Flores','CRUZ DORA','SOMIER ORO','160x200', { mot:'Patas' }),
      /* agosto: una cerrada */
      A('c01','ATC 08-001','2026-08-05','2026-08-07','Isabel Robledo','LUNA PIO','BAHIA','100x190', { mot:'Tela / pillow', rf:'2026-08-24', ent:'2026-08-25' }),
      /* una venta común de octubre: no es ATC */
      { id:'o01', oc:'10-050', fecha:'2026-10-14', turno:'AM', cliente:'VENTA COMUN', vendedor:'Carola Chavez', ts:ts('2026-10-05'), productos:[{ desc:'TITANIO LATEX', medida:'140x190', cant:1 }] }
    ];
  });

  /* ---- 1. las cuentas ---- */
  let D = await page.evaluate(() => {
    var D=atciDatos('2026-10');
    return { n:D.n, nAnt:D.nAnt, ids:D.del.map(function(p){ return p.id; }), antes:D.antes.map(function(p){ return p.id; }), est:D.est,
      cerr:D.cerr.length, ab:D.abiertas.map(function(p){ return p.id+':'+atcDias(p); }), prom:D.prom, med:D.med, max:D.max, mas15:D.mas15,
      sinMot:D.sinMot, com:D.comodin+'/'+D.comodinAb, mot:D.mot.map(function(m){ return m.lbl+':'+m.n+'/'+m.c+'/'+m.ant; }), motTop:D.motTop&&D.motTop.lbl,
      prod:D.prod.map(function(x){ return x.lbl+':'+x.n; }), marcas:D.marcas.map(function(m){ return m.k+':'+m.n; }),
      edades:D.edades.map(function(x){ return x.n; }), sinEdad:D.sinEdad, tRec:D.tRec, tFab:D.tFab, tVue:D.tVue,
      distC:D.distC.map(function(x){ return x.n; }), distA:D.distA.map(function(x){ return x.n; }),
      tend:D.tend.map(function(t){ return t.ym+':'+t.n+'/'+t.c+'/'+t.prom; }), I:D.I, enCurso:D.enCurso };
  });
  chk('el mes: solo las 6 ATC que ENTRARON en octubre, en orden de entrada (ni la venta común ni las de septiembre)', D.n===6 && D.ids.join()==='a01,a02,a03,a04,a05,a06', D);
  chk('las abiertas de meses anteriores van aparte: la de septiembre (no la cerrada ni la de agosto)', D.antes.join()==='b02', D.antes);
  chk('dónde están hoy: 1 por recoger, 1 en fábrica, 1 lista, 1 a recoger de fábrica, 2 entregadas', D.est.sinrecoger===1 && D.est.fabrica===1 && D.est.lista===1 && D.est.recogerfab===1 && D.est.programada===0 && D.est.cerrada===2, D.est);
  chk('el circuito: 2 cerradas, 10,5 días en promedio (9 y 12), mediana 10,5, la más larga 12', D.cerr===2 && D.prom===10.5 && D.med===10.5 && D.max===12, D);
  chk('las abiertas, de la que más espera a la que menos (12, 7, 6 y 5 días) y ninguna pasa de 15', D.ab.join()==='a03:12,a04:7,a05:6,a06:5' && D.mas15===0, D.ab);
  chk('motivos: Hundimiento 3 (2 cerradas, 1 en septiembre) primero; el sin motivo se cuenta y no es «el que más se repite»',
    D.mot[0]==='Hundimiento:3/2/1' && D.mot.indexOf('(sin motivo anotado):1/0/0')>=0 && D.motTop==='Hundimiento' && D.sinMot===1, D.mot);
  chk('productos: TITANIO LATEX 3 (mayúsculas o no, una vez por ATC)', D.prod[0]==='TITANIO LATEX:3' && D.prod.length===4, D.prod);
  chk('marcas: Heaven 4, Sueña 2', D.marcas.join()==='suena:2,heaven:4,:0', D.marcas);
  chk('comodín: 1, y sigue en casa del cliente', D.com==='1/1', D.com);
  chk('antigüedad: una de menos de 6 meses, una de 1 a 2 años, 4 sin fecha de compra', D.edades.join()==='1,0,1,0' && D.sinEdad===4, D);
  chk('tramos: hasta el recojo [2,3,3,1,1] (no la que se recoge el 20/10), en fábrica [6,7], hasta el cliente [1,2]',
    D.tRec.join()==='2,3,3,1,1' && D.tFab.join()==='6,7' && D.tVue.join()==='1,2', D);
  chk('por días: las 2 cerradas en «8 a 15»; las abiertas 3 hasta 7 y 1 de 8 a 15', D.distC.join()==='0,2,0,0' && D.distA.join()==='3,1,0,0', D);
  chk('tendencia de 6 meses: agosto 1 (20 d), septiembre 2 con 1 cerrada (10 d), octubre 6 con 2 (10,5 d)',
    D.tend.join()==='2026-05:0/0/null,2026-06:0/0/null,2026-07:0/0/null,2026-08:1/1/20,2026-09:2/1/10,2026-10:6/2/10.5', D.tend);
  const I = D.I.join(' | ');
  chk('«Lo más importante»: 4 más que septiembre, el motivo con su %, el producto, lo cerrado con el promedio y septiembre',
    /Entraron <b>6<\/b> ATC: <b>4 más<\/b> que en septiembre \(2\)/.test(I) && /«Hundimiento»<\/b>: 3 de 6 \(50%\)/.test(I) && /<b>TITANIO LATEX<\/b> \(3\)/.test(I) &&
    /<b>2 de 6<\/b> \(33%\)\. El circuito completo tardó <b>10,5 días<\/b> en promedio \(en septiembre, 10\)/.test(I), I);
  chk('…y los avisos: lista sin programar, recoger de fábrica, sin motivo, el comodín y lo de meses anteriores',
    /<b>1<\/b> ya están listas en fábrica/.test(I) && /<b>1<\/b> hay que ir a buscarlas a la fábrica/.test(I) && /<b>1<\/b> no tienen el motivo anotado/.test(I) &&
    /<b>1<\/b> cliente tiene un comodín/.test(I) && /quedan <b>1<\/b> ATC de meses anteriores/.test(I), I);
  let r = await page.evaluate(() => { var D=atciDatos('2026-07'); return { n:D.n, I:D.I.join(' | '), antes:D.antes.length, hojas:atciHojas(D).length }; });
  chk('un mes sin ATC: 0, lo dice, cuenta lo que queda de antes y arma 3 hojas (portada, aviso y tendencia)', r.n===0 && /no entró ninguna/.test(r.I) && r.antes===0 && r.hojas===3, r);

  /* ---- 2. el botón y la ventana ---- */
  r = await page.evaluate(() => {
    showView('atc'); segSet('atc-mode','mes'); document.getElementById('atc-mes').value='2026-10'; renderAtc();
    var b=document.getElementById('atc-informe-btn'); var vis=!!(b && b.offsetParent); b.click();
    var ov=document.getElementById('atci-ov'), H=[].slice.call(document.querySelectorAll('#atci-hojas .ai-pag'));
    return { vis:vis, abierto:ov.style.display, mes:document.getElementById('atci-mes').value, info:document.getElementById('atci-info').textContent,
      n:H.length, pies:H.map(function(h){ var f=h.querySelector('.ai-pie'); return f ? f.textContent : 'portada'; }), page:!!document.getElementById('atci-page'),
      txt:H.map(function(h){ return h.innerText; }), tam:H.map(function(h){ return h.offsetWidth+'x'+h.offsetHeight; }), zoom:document.getElementById('atci-hojas').style.zoom };
  });
  chk('el botón «📄 Informe PDF» está en la pestaña ATC y abre la ventana en el mes que se mira (octubre)', r.vis && r.abierto==='flex' && r.mes==='2026-10', r);
  chk('8 hojas (portada, resumen, motivos, productos, dónde están, tiempos, tendencia y el detalle) y lo dice arriba', r.n===8 && /Octubre 2026 · 6 ATC · 8 hojas/.test(r.info), r.info);
  chk('cada hoja mide 1123×794 (A4 apaisada) y en pantalla se achica para entrar', r.tam.every(function(t){ return t==='1123x794'; }) && Number(r.zoom)>0 && Number(r.zoom)<=1, r.tam.concat([r.zoom]));
  chk('las hojas van numeradas «Hoja N de 8» (menos la portada)', r.pies[0]==='portada' && /Hoja 2 de 8/.test(r.pies[1]) && /Hoja 8 de 8/.test(r.pies[7]) && /Informe de ATC · Octubre 2026/.test(r.pies[1]), r.pies);
  chk('la portada: Octubre 2026 en curso, 6 entraron, 2 volvieron (33%), 10,5 días', /Informe de ATC/.test(r.txt[0]) && /Octubre 2026/.test(r.txt[0]) && /mes en curso, hasta el 15\/10\/2026/.test(r.txt[0]) &&
    /6\s*ATC entraron en el mes/.test(r.txt[0]) && /2\s*·\s*33%\s*ya volvieron al cliente/.test(r.txt[0]) && /10,5\s*días tardó/.test(r.txt[0]), r.txt[0]);
  chk('el resumen: las fichas y «Lo más importante»', /Entraron\s*6/i.test(r.txt[1]) && /▲ 4 más que septiembre \(2\)/.test(r.txt[1]) && /Volvieron al cliente\s*2 de 6/i.test(r.txt[1]) && /Siguen abiertas\s*4/i.test(r.txt[1]) && /Hundimiento/.test(r.txt[1]) &&
    /De meses anteriores\s*1/i.test(r.txt[1]) && /Lo más importante/.test(r.txt[1]), r.txt[1]);
  chk('motivos (con «sep.» para comparar) y la antigüedad con el comodín', /Por qué se generaron/.test(r.txt[2]) && /Hundimiento\s*3 50% · sep\. 1/.test(r.txt[2]) && /De 1 a 2 años/.test(r.txt[2]) && /Con comodín: 1/.test(r.txt[2]), r.txt[2]);
  chk('productos, la dona de marcas y quién las cargó', /TITANIO LATEX\s*3 50%/.test(r.txt[3]) && /Heaven/.test(r.txt[3]) && /Sueña/.test(r.txt[3]) && /Quién las cargó/.test(r.txt[3]), r.txt[3]);
  chk('dónde están: los 6 pasos, las que más esperan (la de 12 días primero) y la de septiembre que sigue abierta', /Por recoger/.test(r.txt[4]) && /ATC 10-003[\s\S]*12/.test(r.txt[4]) && /Vienen de meses anteriores/.test(r.txt[4]) && /ATC 09-002/.test(r.txt[4]), r.txt[4]);
  chk('los tiempos: 2 · 6,5 · 1,5 días por tramo y 10,5 el circuito', /Hasta el recojo\s*2 días/i.test(r.txt[5]) && /En fábrica\s*6,5 días/i.test(r.txt[5]) && /Hasta el cliente\s*1,5 días/i.test(r.txt[5]) && /Circuito completo\s*10,5 días/i.test(r.txt[5]), r.txt[5]);
  chk('la tendencia: 6 meses, octubre con 6', /Los últimos 6 meses/.test(r.txt[6]) && /Oct 26/.test(r.txt[6]) && /May 26/.test(r.txt[6]) && /2 cerradas · 10,5 d/.test(r.txt[6]), r.txt[6]);
  chk('el detalle: las 6, con cliente, motivo y lo que se hizo', /Las 6 ATC de octubre/.test(r.txt[7]) && /ROCA JUAN/.test(r.txt[7]) && /✔ Se cambió la espuma/.test(r.txt[7]) && /sin motivo/.test(r.txt[7]) && !/VENTA COMUN/.test(r.txt.join(' ')), r.txt[7]);
  chk('mientras está abierto, la hoja va apaisada (@page)', r.page, r.page);

  r = await page.evaluate(() => {
    var i=document.getElementById('atci-mes'); i.value='2026-09'; i.dispatchEvent(new Event('change'));
    var H=[].slice.call(document.querySelectorAll('#atci-hojas .ai-pag'));
    return { info:document.getElementById('atci-info').textContent, t0:H[0].innerText, det:H[H.length-1].innerText };
  });
  chk('cambiar el mes rehace el informe: septiembre, 2 ATC, sin «mes en curso»', /Septiembre 2026 · 2 ATC · 8 hojas/.test(r.info) && !/mes en curso/.test(r.t0) && /ATC 09-001/.test(r.det) && !/ATC 10-001/.test(r.det), r.info);

  /* ---- 3. el PDF ---- */
  if(HAY_LIBS){
    await page.evaluate(() => { var i=document.getElementById('atci-mes'); i.value='2026-10'; i.dispatchEvent(new Event('change')); });
    const [dl] = await Promise.all([ page.waitForEvent('download', { timeout:90000 }), page.click('#atci-pdf') ]);
    const dest = path.join(SALIDA, dl.suggestedFilename()); await dl.saveAs(dest);
    const buf = fs.readFileSync(dest), txt = buf.toString('latin1');
    const nPag = (txt.match(/\/Type \/Page\b(?!s)/g)||[]).length, apais = /\/MediaBox \[0 0 841\.8[89]\d* 595\.2[78]\d*\]/.test(txt);
    await page.waitForTimeout(200);
    r = await page.evaluate(() => ({ est:document.getElementById('atci-estado').innerText, ocup:ATCI_OCUPADO, host:!!document.getElementById('atci-render'), btn:document.getElementById('atci-pdf').disabled }));
    chk('«⬇️ Descargar PDF» baja «Informe-ATC-octubre-2026.pdf», un PDF de verdad', dl.suggestedFilename()==='Informe-ATC-octubre-2026.pdf' && buf.slice(0,5).toString()==='%PDF-', dl.suggestedFilename());
    chk('8 páginas A4 apaisadas (841,89 × 595,28 pt), una por hoja', nPag===8 && apais, { nPag, apais, kb:Math.round(buf.length/1024) });
    chk('dice que está listo, y limpia la copia y el botón', /Listo: se bajó Informe-ATC-octubre-2026\.pdf \(8 hojas\)/.test(r.est) && !r.ocup && !r.host && !r.btn, r);
    /* la foto de la portada no sale en blanco: se mira un píxel del fondo oscuro */
    const color = await page.evaluate(() => window.html2canvas(document.querySelector('#atci-hojas .ai-pag'), { scale:1, logging:false, backgroundColor:'#fff' }).then(function(cv){
      return [].slice.call(cv.getContext('2d').getImageData(40, 300, 1, 1).data).slice(0,3); }));
    chk('la foto de la portada tiene su fondo (no sale en blanco)', color[0]<80 && color[1]<120, color);
    if(process.env.ATCI_SALIDA) console.log('  PDF en', dest);
  } else console.log('… sin las copias de jsPDF y html2canvas (npm i jspdf@2.5.1 html2canvas@1.4.1 y ATCI_LIBS_DIR=…/node_modules): se saltea la parte del PDF');

  /* ---- 4. sin internet: la ventana de imprimir ---- */
  libsSi = false;
  r = await page.evaluate(async () => {
    delete window.jspdf; delete window.html2canvas; window.__imprimio=0; window.print=function(){ window.__imprimio++; };
    atciPdf();
    for(var i=0;i<60 && ATCI_OCUPADO;i++) await new Promise(function(ok){ setTimeout(ok, 100); });
    return { imp:window.__imprimio, est:document.getElementById('atci-estado').innerText, ocup:ATCI_OCUPADO };
  });
  chk('sin las librerías (sin internet) abre la ventana de imprimir y lo dice', r.imp===1 && /sin internet/.test(r.est) && /Guardar como PDF/.test(r.est) && !r.ocup, r);

  r = await page.evaluate(() => { atciCerrar(); return { ov:document.getElementById('atci-ov').style.display, page:!!document.getElementById('atci-page') }; });
  chk('al cerrar, la hoja apaisada se va (los otros impresos siguen verticales)', r.ov==='none' && !r.page, r);

  /* ---- 5. capturas para mirar (solo con ATCI_SALIDA) ---- */
  if(process.env.ATCI_SALIDA){
    await page.evaluate(() => { abrirInformeAtc(); var i=document.getElementById('atci-mes'); i.value='2026-10'; i.dispatchEvent(new Event('change')); document.getElementById('atci-hojas').style.zoom='1'; });
    const H = await page.$$('#atci-hojas .ai-pag');
    for(let i=0;i<H.length;i++) await H[i].screenshot({ path:path.join(SALIDA, 'hoja'+(i+1)+'.png') });
    console.log('  capturas en', SALIDA);
  }
  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e => { console.error(e); process.exit(1); });
