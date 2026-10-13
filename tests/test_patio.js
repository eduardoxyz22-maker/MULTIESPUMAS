/* 🏙️ EL PATIO DE CARGA 3D CON LOS DATOS DEL PANEL (§4kn, 13/10). El dueño, con la muestra: «Me gusta, publica y vemos cómo queda».
     1. «🏙️ Ver la ciudad» está en los camiones de Administración y baja patio.js recién al tocarlo.
     2. `patioDatos()` = lo de los camiones de Administración: cada línea con su estado (🚚 tildada, 🅿️ por cargar en PTF o en Banzer,
        📥 traer de Moreno, ⛔ sin stock), el camión que solo carga en Banzer espera en Banzer, la RPT va a SU tienda, el pin del pedido
        cae en una calle, «sin camión», y lo del día para David (Eduardo, ROHO, Multicenter, ✗ sin stock, días pasados sin ✅).
     3. La tilde es la de la Lista de carga y «Ya salió» el de siempre.
     4. Sin three.js (sin internet) la pantalla abre igual, dice que no hay 3D y se cierra sin errores.
     5. Con three.js (copia local: PATIO_THREE=<carpeta del paquete three 0.128>) arma la ciudad con el MISMO lienzo (DEP.w3.alt),
        pone los pallets, el montacargas sube lo que se tilda, «Ya salió» manda el camión a la calle y al cerrar devuelve el lienzo.
   Reloj clavado en el martes 13/10/2026 a las 10:00. Se corre:  node tests/test_patio.js  (la parte 5 solo con PATIO_THREE) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs'), path=require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const J=x=>JSON.stringify(x);
const ARCH = 'file://' + (process.env.PEDIDOS||path.resolve('pedidos.html'));
const TH = process.env.PATIO_THREE || '';

async function preparar(page){
  await page.evaluate(async () => {
    var el=document.getElementById('conn-form'); if(el) el.style.display='none';
    CONNECTED=true; UNLOCKED=true; VENTA_TIENDA=false;
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    window.autoAbrirAvisos=function(){};
    document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block'; mostrarBotonesTodos();
    window._SRV={};
    apiSave=function(rec){ var r=JSON.parse(JSON.stringify(rec)); r.rev=(Number((_SRV[r.id]||{}).rev)||0)+1; _SRV[r.id]=r; return Promise.resolve({ok:true, pedido:r}); };
    apiList=function(){ var l=JSON.parse(JSON.stringify(STATE.filter(function(p){ return !esFilaSistema(p); })));
      Object.keys(_SRV).forEach(function(k){ if(esFilaSistema(_SRV[k])) l.push(JSON.parse(JSON.stringify(_SRV[k]))); });
      return Promise.resolve({ok:true,pedidos:l}); };
    try{ localStorage.removeItem(LS_PEND); }catch(e){}
    var hoy=todayStr(), ayer=isoLocal(new Date(Date.now()-86400000)), n=0;
    var P=function(veh,cli,vend,prods,o){ n++; return Object.assign({ id:'pt'+n, fecha:hoy, oc:'10-'+(40+n), vendedor:vend, cliente:cli, celular:'7', turno:'AM', zona:'Norte',
      direccion:'Calle '+n, maps:'', pagado:true, saldo:0, ts:Date.now(), metodoPago:'', observaciones:'', estado:'', entregado:false, vehiculo:veh, chofer:veh?(VEHICULOS[veh]||[])[0]:'',
      garantia:'', nota:String(500+n), acuenta:0, facturarA:'', nit:'', nroDia:n, verificado:false, fotos:[], productos:prods }, o||{}); };
    var x=function(d,m,c,e){ return Object.assign({codigo:'',desc:d,medida:m,cant:c},e||{}); };
    STATE=[
      P('Foton nuevo','CLIENTE A','Eduardo',[x('TITANIO LATEX','140x190',2,{chk:'ok'}), x('ESPECIAL SEMIORTOPEDICO','140x190',3,{chk:'im'})],{ maps:'-17.7700,-63.1500' }),
      P('Foton nuevo','Mia Plaza','Maria Flores',[x('PILLOW PEDIC','160x200',1,{chk:'ok'})],{ oc:'RPT 10-001', turno:'PM' }),
      P('Foton encarpado','CLIENTE B','ROHO',[x('ORO BI RELAX','140x190',2,{chk:'ok',chkDe:'Banzer'}), x('MEMORY FLEX','160x200',1,{chk:'no'})]),
      P('Carry','MULTICENTER','Eduardo',[x('DREAM','100x190',4,{chk:'ok',chkDe:'Banzer'})]),
      P('','CLIENTE C','Isabel Robledo',[x('CLOUD','140x190',2,{chk:'ok'})]),
      P('Foton nuevo','CLIENTE VIEJO','Carola Chavez',[x('CLOUD','140x190',1,{chk:'ok'})],{ fecha:ayer })
    ];
    STOCK=stockVacio(); STOCK_CARGADO=true; STOCK.al={'Banzer':'sale'};
    CARGA_CHK={}; saveMirror();
    CV_3D=false;
    showView('admin'); segSet('adm-mode','todo'); QUICK_FILTER=''; renderAdmin();
    await new Promise(r=>setTimeout(r,150));
    CV_DIA='hoy'; CV_SEL=''; cargaVivaPintar();
  });
  await page.waitForTimeout(250);
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport:{width:1300,height:900}, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-10-13T10:00:00-04:00'));
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.route('https://**', r=>r.abort());
  await page.goto(ARCH, { waitUntil:'load' });
  await page.waitForTimeout(300);
  await preparar(page);

  console.log('\n── 1. El botón y la carga de patio.js ──');
  let r = await page.evaluate(() => ({ boton:!!document.getElementById('cv-ciudad'), cargado:typeof window.patioAbrir==='function', fn:typeof patioAbrirCiudad }));
  chk('«🏙️ Ver la ciudad» está en los camiones de Administración', r.boton);
  chk('patio.js NO se baja hasta tocarlo', !r.cargado && r.fn==='function', r);
  await page.click('#cv-ciudad');
  await page.waitForFunction(() => typeof window.patioAbrir==='function' && !document.getElementById('pt-ov').hidden, null, { timeout:8000 }).catch(()=>{});
  r = await page.evaluate(() => ({ abierto:!!document.getElementById('pt-ov') && !document.getElementById('pt-ov').hidden, sub:(document.getElementById('pt-sub')||{}).textContent||'' }));
  chk('al tocarlo baja patio.js y abre la pantalla', r.abierto, r);
  chk('arriba dice el día y los pedidos', /hoy 13\/10.*5 pedidos/.test(r.sub), r.sub);

  console.log('\n── 2. patioDatos(): lo mismo que los camiones de Administración ──');
  r = await page.evaluate(() => { var D=patioDatos(), C={}; D.cams.forEach(function(c){ C[c.k]=c; });
    var fn=C['Foton nuevo'], fe=C['Foton encarpado'], ca=C['Carry'], mp=patioTiendas().filter(function(t){ return t.n==='Mia Plaza'; })[0];
    var rpt=fn.stops.filter(function(s){ return s.rpt; })[0], a=fn.stops.filter(function(s){ return !s.rpt; })[0];
    return { ks:D.cams.map(function(c){ return c.k; }), fnL:fn.lineas.map(function(l){ return l.prod.split(' ')[0]+':'+l.st+':'+l.u; }).sort(),
      feL:fe.lineas.map(function(l){ return l.prod.split(' ')[0]+':'+l.st+':'+(l.lugar==='fabrica'?'fab':'otro'); }).sort(),
      caAlm:ca.alm, fnAlm:fn.alm, placa:fn.p, chofer:fn.chofer, rptN:rpt&&rpt.n, rptPt:rpt&&rpt.pt, mpPt:mp.pt, aPt:a&&a.pt, sin:D.sin.stops.length, dia:D.dia, hoy:D.hoy }; });
  chk('los cuatro camiones de VEHICULOS', J(r.ks.slice().sort())===J(['Carry','Foton encarpado','Foton insumo','Foton nuevo']), r.ks);
  chk('Foton nuevo: lo ✔ hay espera en PTF, lo de Moreno se trae, la RPT también', J(r.fnL)===J(['ESPECIAL:moreno:3','PILLOW:espera:1','TITANIO:espera:2']), r.fnL);
  chk('Foton encarpado: lo ✔ Banzer espera en Banzer, lo ✗ no hay queda sin stock', J(r.feL)===J(['MEMORY:falta:fab','ORO:espera:otro']), r.feL);
  chk('el camión que solo carga en Banzer espera en Banzer; el otro en PTF', r.caAlm==='bz' && r.fnAlm==='ptf', [r.caAlm, r.fnAlm]);
  chk('la placa y el chofer del camión', r.placa==='6663-CCP' && r.chofer==='Luis Eyzaguirre', [r.placa, r.chofer]);
  chk('la RPT va a SU tienda (Heaven Mia Plaza, en su lugar)', /RPT 10-001 · Heaven Mia Plaza/.test(r.rptN) && J(r.rptPt)===J(r.mpPt), [r.rptN, r.rptPt, r.mpPt]);
  chk('el pin del cliente cae en una calle de la ciudad', !!r.aPt && r.aPt.z%70===0 && r.aPt.x>-280 && r.aPt.x<420, r.aPt);
  chk('un pedido sin camión', r.sin===1, r.sin);
  chk('lo del día para David: 2 de Eduardo, 1 de ROHO, 1 de Multicenter', r.dia.eduardo===2 && r.dia.roho===1 && r.dia.multi===1, r.dia);
  chk('…1 sin camión, 1 con ✗ sin stock, 1 de días pasados sin ✅', r.dia.sinCamion===1 && r.dia.faltan===1 && r.dia.sinMarcar===1, r.dia);
  chk('…y en qué camión va lo de Eduardo y lo de ROHO', r.dia.eduardoCam==='6663-CCP' && r.dia.rohoCam==='5655-KSC', [r.dia.eduardoCam, r.dia.rohoCam]);

  console.log('\n── 3. La tilde y «Ya salió» son los de siempre ──');
  r = await page.evaluate(() => { var fn=patioDatos().cams.filter(function(c){ return c.k==='Foton nuevo'; })[0], l=fn.lineas.filter(function(l){ return /TITANIO/.test(l.prod); })[0];
    var esLista=l.key===cargaChkKey(todayStr(),'Foton nuevo',cargaProdKey(STATE[0].productos[0]));
    setCargaChk(l.key,true); var tras=patioDatos().cams.filter(function(c){ return c.k==='Foton nuevo'; })[0].lineas.filter(function(x){ return x.key===l.key; })[0].st;
    camionSalioMarcar('Foton nuevo', true); var sal=patioDatos().cams.filter(function(c){ return c.k==='Foton nuevo'; })[0].salio;
    camionSalioMarcar('Foton nuevo', false); setCargaChk(l.key,false);
    return { esLista:esLista, tras:tras, sal:sal, vuelta:patioDatos().cams.filter(function(c){ return c.k==='Foton nuevo'; })[0].salio }; });
  chk('la clave de cada línea es la de la Lista de carga', r.esLista);
  chk('tildarla la pone «en el camión»', r.tras==='camion', r.tras);
  chk('«Ya salió» marca la hora y deshacerlo la saca', /^\d\d:\d\d$/.test(r.sal) && r.vuelta==='', [r.sal, r.vuelta]);

  if(!TH){
    console.log('\n── 4. Sin three.js: abre igual y avisa ──');
    await page.waitForTimeout(1500);   // sin internet el <script> de three.js falla y depLibs se rinde
    r = await page.evaluate(() => ({ sin:!!document.querySelector('#pt-ov .sin3d'), alt:!!(DEP.w3 && DEP.w3.alt) }));
    chk('dice que la ciudad en 3D no se pudo cargar', r.sin, r);
    await page.click('#pt-cerrar');
    r = await page.evaluate(() => ({ cerrado:document.getElementById('pt-ov').hidden, abierto:!!window.PATIO_ABIERTO }));
    chk('«✕ Cerrar» vuelve al panel', r.cerrado && !r.abierto, r);
  } else { await page.evaluate(() => patioCerrar()); console.log('\n── 5. Con three.js: la ciudad con el mismo lienzo ──'); }
  chk('sin errores en la página', errors.length===0, errors.slice(0,3));
  await browser.close();
  if(TH){ await con3D(); }
  console.log('\n'+PASS+' bien · '+FAIL+' mal'); process.exit(FAIL?1:0);
})();

async function con3D(){
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport:{width:1300,height:900}, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  // sin reloj fijo: con el reloj de Playwright quieto, el reloj de three.js no avanza y nada se mueve (la fecha la arma el fixture con todayStr)
  const errors=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('dialog',d=>d.accept());
  await page.route('**/three.min.js', r=>r.fulfill({ body:fs.readFileSync(path.join(TH,'build/three.min.js')), contentType:'text/javascript' }));
  await page.route('**/OrbitControls.js', r=>r.fulfill({ body:fs.readFileSync(path.join(TH,'examples/js/controls/OrbitControls.js')), contentType:'text/javascript' }));
  await page.route('https://fonts.googleapis.com/**', r=>r.abort());
  await page.goto(ARCH, { waitUntil:'load' });
  await page.waitForTimeout(300);
  await preparar(page);
  await page.evaluate(() => patioAbrirCiudad());
  await page.waitForFunction(() => window.patioEstado && patioEstado() && patioEstado().camiones.length>0, null, { timeout:60000 }).catch(()=>{});
  await page.waitForTimeout(1500);
  let r = await page.evaluate(() => { var E=patioEstado(); return { E:E, alt:!!(DEP.w3 && DEP.w3.alt && DEP.w3.alt.patio), padre:DEP.w3 && DEP.w3.r.domElement.parentNode.id }; });
  chk('la ciudad se arma con el lienzo compartido (DEP.w3.alt)', r.alt && r.padre==='pt-esc', [r.alt, r.padre]);
  const C={}; ((r.E&&r.E.camiones)||[]).forEach(c=>C[c.k]=c);
  chk('Foton nuevo en un andén de PTF, Carry en Banzer', C['Foton nuevo'] && C['Foton nuevo'].alm==='ptf' && !C['Foton nuevo'].enCalle && C['Carry'] && C['Carry'].alm==='bz', [C['Foton nuevo'], C['Carry']&&C['Carry'].alm]);
  chk('cada línea por cargar tiene su pallet; lo sin stock no', C['Foton encarpado'] && C['Foton encarpado'].items.every(it=>it.st==='falta'?!it.pallet:it.pallet), C['Foton encarpado']&&C['Foton encarpado'].items);
  chk('alertas: sin camión, Moreno y sin stock', r.E && ['sin camión','Moreno','sin stock'].every(t=>r.E.alertas.some(a=>a.indexOf(t)>=0)), r.E&&r.E.alertas);
  await page.screenshot({ path:path.join(process.env.PATIO_FOTOS||'/tmp','patio_1.png'), timeout:120000 }).catch(e=>console.log('(sin foto: '+e.message.split('\n')[0]+')'));
  // tildar desde la ficha
  await page.evaluate(() => document.querySelector('#pt-ir-cam button[data-cam="Foton nuevo"]').click()); await page.waitForTimeout(800);
  await page.evaluate(() => { window.J2=function(x){ return JSON.stringify(x); }; });
  r = await page.evaluate(() => { var inp=[].filter.call(document.querySelectorAll('#pt-ficha input[data-key]'), function(i){ return /TITANIO/.test(i.parentNode.textContent); })[0];
    if(!inp) return { hay:false, sel:patioEstado().sel, ficha:document.getElementById('pt-ficha').textContent.slice(0,300), fn:J2(patioEstado().camiones.filter(function(c){ return c.k==='Foton nuevo'; })[0]) }; inp.click(); return { hay:true, k:inp.getAttribute('data-key'), on:isCargaChk(inp.getAttribute('data-key')) }; });
  chk('tildar en la ficha marca la Lista de carga', r.hay && r.on, r);
  await page.waitForFunction(() => { var c=patioEstado().camiones.filter(function(c){ return c.k==='Foton nuevo'; })[0], it=c.items.filter(function(i){ return /TITANIO/.test(i.prod); })[0]; return it && it.st==='camion' && !it.pend; }, null, { timeout:120000, polling:500 }).catch(()=>{});
  r = await page.evaluate(() => { var c=patioEstado().camiones.filter(function(c){ return c.k==='Foton nuevo'; })[0], it=c.items.filter(function(i){ return /TITANIO/.test(i.prod); })[0]; return { it:it, dentro:c.dentro }; });
  chk('el montacargas lo sube: queda en el camión, sin pallet afuera', r.it && r.it.st==='camion' && !r.it.pend && !r.it.pallet && r.dentro===2, r);
  // «Ya salió»
  await page.evaluate(() => { camionSalioMarcar('Foton nuevo', true); PATIO_ABIERTO && patioEstado(); });
  await page.waitForFunction(() => { var c=patioEstado().camiones.filter(function(c){ return c.k==='Foton nuevo'; })[0]; return c && (c.enCalle || c.saliendo); }, null, { timeout:30000, polling:500 }).catch(()=>{});
  r = await page.evaluate(() => patioEstado().camiones.filter(function(c){ return c.k==='Foton nuevo'; })[0]);
  chk('«Ya salió» lo manda a la calle', r && (r.enCalle || r.saliendo), r && [r.enCalle, r.saliendo]);
  await page.screenshot({ path:path.join(process.env.PATIO_FOTOS||'/tmp','patio_2.png'), timeout:120000 }).catch(e=>console.log('(sin foto: '+e.message.split('\n')[0]+')'));
  await page.evaluate(() => document.getElementById('pt-cerrar').click());
  await page.waitForTimeout(300);
  r = await page.evaluate(() => ({ alt:!!(DEP.w3 && DEP.w3.alt), oculto:document.getElementById('pt-ov').hidden, tono:DEP.w3 && DEP.w3.r.toneMapping===THREE.ACESFilmicToneMapping }));
  chk('al cerrar devuelve el lienzo (sin alt, el tono de siempre)', !r.alt && r.oculto && r.tono, r);
  await page.evaluate(() => patioAbrirCiudad()); await page.waitForTimeout(1500);
  r = await page.evaluate(() => ({ alt:!!(DEP.w3 && DEP.w3.alt), n:patioEstado().camiones.length }));
  chk('se vuelve a abrir al toque (la ciudad ya está armada)', r.alt && r.n===4, r);
  chk('sin errores en la página (con 3D)', errors.length===0, errors.slice(0,3));
  await browser.close();
}
