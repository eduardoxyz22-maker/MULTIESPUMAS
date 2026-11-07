/* 📄 INFORME DEL MES (idea 120, 07/11; el dueño vio la muestra y la aprobó). Contabilidad → 📈 Proyección → «📄 Informe del mes»: un PDF
   tipo presentación con la maquinaria del informe de ATC (§4le). Lo que cuida, con ventas y ATC inventadas y el reloj clavado en el sábado
   07/11/2026 a las 10:00 de Bolivia:
     1. las cuentas (`imesDatos`) son las del panel, no otras: vendido, unidades, por marca y por vendedora = la Proyección
        (`proyeccionMes`, la ficha «Vendido en…»); contra el mes anterior = «A esta altura» (`pryAltura`) y el MoM (`pryMomDe`); la plata =
        las fichas de Contabilidad → Ventas con «🚚 Entrega agendada» (`CX_TOP_M`); las ATC = `atciDatos`; ✗ = las marcas de los productos;
     2. el mes en curso «a la fecha»: contra el anterior al mismo día y hora, igual que «A esta altura» de la Proyección;
     3. «3 cosas para mirar»: las reglas eligen lo más grande de temas distintos (y completan si faltan temas);
     4. el botón: solo con la contraseña; abre en el último mes cerrado; las hojas (1123×794, numeradas, nada se sale de la hoja);
     5. la ventana va en las dos listas de pantalla completa (`html.wco` y `html.sa-top`) y no aparece sola;
     6. «⬇️ Descargar PDF» (con las librerías locales de `ATCI_LIBS_DIR`, como test_atc_informe) y, sin internet, la ventana de imprimir.
   Datos SINTÉTICOS. Se corre:  TZ=America/La_Paz HTTPS_PROXY=http://127.0.0.1:9 node tests/test_informe_mes.js   (desde la raíz) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs'), os = require('os');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const ARCH='file://'+(process.env.PEDIDOS||path.resolve('pedidos.html'));
const LIBS_DIR = process.env.ATCI_LIBS_DIR || '/tmp/claude-0/-home-user-MULTIESPUMAS/dab3dfa4-9445-5474-b412-a4265b40568c/scratchpad/libs/node_modules';
const LIB_JSPDF = path.join(LIBS_DIR, 'jspdf/dist/jspdf.umd.min.js'), LIB_H2C = path.join(LIBS_DIR, 'html2canvas/dist/html2canvas.min.js');
const HAY_LIBS = fs.existsSync(LIB_JSPDF) && fs.existsSync(LIB_H2C);
const SALIDA = process.env.IMES_SALIDA || fs.mkdtempSync(path.join(os.tmpdir(), 'imes-'));

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz', acceptDownloads:true });
  const page = await ctx.newPage();
  const errores=[]; page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await page.clock.setFixedTime(new Date('2026-11-07T10:00:00-04:00'));
  let libsSi = true;
  await page.route(/^https?:/, r => {
    const u = r.request().url();
    if(libsSi && HAY_LIBS && /cdnjs\.cloudflare\.com\/ajax\/libs\/jspdf\/2\.5\.1\/jspdf\.umd\.min\.js$/.test(u)) return r.fulfill({ status:200, contentType:'application/javascript', body:fs.readFileSync(LIB_JSPDF) });
    if(libsSi && HAY_LIBS && /cdnjs\.cloudflare\.com\/ajax\/libs\/html2canvas\/1\.4\.1\/html2canvas\.min\.js$/.test(u)) return r.fulfill({ status:200, contentType:'application/javascript', body:fs.readFileSync(LIB_H2C) });
    return r.abort();
  });
  await page.goto(ARCH, { waitUntil:'load' }); await page.waitForTimeout(600);

  /* ---- 0. nada aparece solo ---- */
  await page.waitForTimeout(400);
  let r = await page.evaluate(() => { var ov=document.getElementById('imes-ov'); return { hay:!!ov, disp:ov && ov.style.display, fn:typeof imesDatos }; });
  chk('0. la ventana existe y no aparece sola al abrir el panel', r.hay && r.disp==='none' && r.fn==='function', r);

  /* ---- el fixture ---- */
  await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok';
    if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
    apiSave=function(){ return Promise.resolve({ok:true}); };
    var ts=function(f){ return new Date(f+'T10:00:00-04:00').getTime(); };
    var V=function(id, oc, vend, fecha, carga, prods, tot, plata, extra){
      var p={ id:id, oc:oc, vendedor:vend, cliente:'CLIENTE '+id.toUpperCase(), celular:'7000'+('0000'+id.length).slice(-4), fecha:fecha, turno:'AM', ts:ts(carga),
              zona:'Centro', productos:prods, acuenta:0, saldo:0, pagado:false, metodoPago:'' };
      for(var k in (plata||{})) p[k]=plata[k];
      for(var j in (extra||{})) p[j]=extra[j];
      return p;
    };
    var X=function(desc, med, cant, precio, mas){ var x={ desc:desc, medida:med, cant:cant, precio:precio }; for(var k in (mas||{})) x[k]=mas[k]; return x; };
    var pag=function(tot, f){ return { acuenta:tot, saldo:0, pagado:true, metodoPago:'~Efectivo '+tot+' @'+f+' #1' }; };
    var debe=function(ant, saldo, f){ return { acuenta:ant, saldo:saldo, pagado:false, metodoPago:ant ? ('~Efectivo '+ant+' @'+f+' #2') : '' }; };
    var A=function(id, oc, entro, vend, desc, mot){
      return { id:id, oc:oc, fecha:entro, turno:'AM', cliente:'ATC '+id, vendedor:vend, celular:'71000000', zona:'Centro', ts:ts(entro), entregado:false,
               productos:[{ desc:desc, medida:'140x190', cant:1, atc:{ mot:mot, det:'detalle '+id } }] };
    };
    STATE=[
      /* septiembre: el equipo vende 15.000 (5 unidades) */
      V('s1','09-001','Maria Flores','2026-09-10','2026-09-05',[X('TITANIO LATEX','140x190',2,4000)],8000,pag(8000,'2026-09-05')),
      V('s2','09-002','Maria Flores','2026-09-20','2026-09-15',[X('ORO','140x190',1,2000)],2000,pag(2000,'2026-09-15')),
      V('s3','09-003','Isabel Robledo','2026-09-12','2026-09-08',[X('TITANIO LATEX','160x200',1,3000)],3000,pag(3000,'2026-09-08')),
      V('s4','09-004','Fernando Peinado','2026-09-18','2026-09-10',[X('COLCHON SOFT','140x190',1,2000)],2000,pag(2000,'2026-09-10')),
      /* octubre: 16.000 (7 unidades: 6 colchones y 1 somier); Maria cae 60 %, debe 3.000 desde el 02/10; Fernando debe 2.000 */
      V('o1','10-001','Maria Flores','2026-10-08','2026-10-02',[X('TITANIO LATEX','140x190',1,4000,{ chk:'no' })],4000,debe(1000,3000,'2026-10-02')),
      V('o2','10-002','Isabel Robledo','2026-10-10','2026-10-03',[X('TITANIO LATEX','140x190',2,2500,{ chk:'no', enProd:true, prodF:'2026-10-04' })],5000,pag(5000,'2026-10-03')),
      V('o3','10-003','Isabel Robledo','2026-10-20','2026-10-15',[X('SOMIER ORO','140x190',1,1000), X('ALMOHADA FIBRA SILICONADA','50x70',2,0)],1000,pag(1000,'2026-10-15')),
      V('o4','10-004','Fernando Peinado','2026-10-15','2026-10-09',[X('COLCHON SOFT','140x190',1,2500)],2500,debe(500,2000,'2026-10-09')),
      V('o5','10-005','Carola Chavez','2026-10-25','2026-10-20',[X('ESPECIAL SEMIORTOPEDICO','140x190',1,1500)],1500,pag(1500,'2026-10-20')),
      V('t1','10-006','Carola Chavez','','2026-10-22',[X('TITANIO LATEX','100x190',1,2000)],2000,pag(2000,'2026-10-22'),{ direccion:'SALIÓ DE TIENDA · Central', zona:'TIENDA', turno:'' }),
      /* no son del equipo: Eduardo (mayorista), FABRICA (interno), una RPT y ROHO */
      V('e1','10-007','Eduardo Añez','2026-10-12','2026-10-05',[X('TITANIO LATEX','100x190',3,3000)],9000,debe(0,9000,'2026-10-05'),{ cliente:'MULTICENTER' }),
      V('f1','10-008','FABRICA','2026-10-13','2026-10-05',[X('COLCHON SOFT','140x190',1,0)],0,{}),
      V('r1','RPT 10-001','Isabel Robledo','2026-10-14','2026-10-06',[X('TITANIO LATEX','140x190',1,0,{ chk:'no' })],0,{},{ cliente:'Mia Plaza' }),
      V('k1','10-009','ROHO','2026-10-16','2026-10-07',[X('PILLOW PEDIC','140x190',2,0)],0,{},{ cliente:'Roho' }),
      /* noviembre (en curso): 5.000 hasta hoy */
      V('n1','11-001','Maria Flores','2026-11-10','2026-10-28',[X('TITANIO LATEX','140x190',1,3000)],3000,debe(0,3000,'2026-10-28')),
      V('n2','11-002','Isabel Robledo','2026-11-05','2026-11-03',[X('ORO','160x200',1,2000)],2000,pag(2000,'2026-11-03')),
      /* ATC: 3 en octubre (2 TITANIO por hundimiento, 1 Bahía por ruido), 1 en septiembre */
      A('a1','ATC 10-001','2026-10-05','Maria Flores','TITANIO LATEX','Hundimiento'),
      A('a2','ATC 10-002','2026-10-12','Isabel Robledo','TITANIO LATEX','Hundimiento'),
      A('a3','ATC 10-003','2026-10-20','Fernando Peinado','BAHIA','Ruido'),
      A('a4','ATC 09-001','2026-09-14','Maria Flores','ORO','Patas')
    ];
    window.__STATE0=JSON.stringify(STATE);
  });

  /* ---- 1. las cuentas de octubre, contra las del panel ---- */
  r = await page.evaluate(() => {
    UNLOCKED=true;
    var D=imesDatos('2026-10'), R=proyeccionMes('2026-10'), Rs=proyeccionMes('2026-09'), T=atciDatos('2026-10');
    var vend={}; D.vend.forEach(function(v){ vend[v.v]=v.bs+'/'+(v.ant ? v.ant.bs : 'x'); });
    var rv={}; R.marcas.forEach(function(m){ m.filas.forEach(function(f){ rv[f.vendedor]=f.vendido; }); });
    var rsv={}; Rs.marcas.forEach(function(m){ m.filas.forEach(function(f){ rsv[f.vendedor]=f.vendido; }); });
    /* la ficha «Vendido en octubre» de la Proyección, en pantalla */
    showView('conta'); segSet('cta-tab','proy'); setContaTab('proy'); document.getElementById('pry-mes').value='2026-10'; renderProyeccion();
    var ficha=(document.querySelector('#pry-metrics .mc-val')||{}).textContent||'';
    return { mes:D.mes, enCurso:D.enCurso, eq:D.eq, eqAnt:D.eqAnt, Req:{ bs:R.equipo.vendido, n:R.equipo.n, u:R.equipo.u, c:R.equipo.c, s:R.equipo.s }, RsEq:Rs.equipo.vendido, RsU:Rs.equipo.u,
      ficha:ficha, fmt:fmtBs(R.equipo.vendido), vend:vend, rv:rv, rsv:rsv,
      marcas:D.marcas.map(function(m){ return m.k+':'+m.bs+'/'+m.u+'/'+(m.ant?m.ant.bs:'x'); }), Rmarcas:R.marcas.map(function(m){ return m.g.k+':'+m.tot.vendido+'/'+m.tot.u; }),
      mayor:D.mayor.vendido+'/'+D.mayor.n, roho:D.roho.u, prodsTot:D.prods.tot, prods:D.prods.lista.map(function(x){ return x.k+':'+x.u+'/'+x.ped; }),
      atc:{ n:D.atc.n, nAnt:D.atc.nAnt, Tn:T.n, TnAnt:T.nAnt }, falto:D.falto, faltoAnt:D.faltoAnt.nNo, cmp:D.cmpTxt };
  });
  chk('1a el mes elegido: octubre, cerrado (no «a la fecha»)', r.mes==='2026-10' && !r.enCurso, r.mes);
  chk('1b vendido y unidades = la Proyección de octubre (16.000; 7 = 6 colchones y 1 somier, sin almohadas)',
    r.eq.bs===16000 && r.eq.bs===r.Req.bs && r.eq.n===6 && r.eq.n===r.Req.n && r.eq.u===7 && r.eq.u===r.Req.u && r.eq.c===6 && r.eq.s===1, { eq:r.eq, R:r.Req });
  chk('1c …y es lo que dice la ficha «Vendido en octubre» de la Proyección en pantalla', r.ficha===r.fmt && /16\.000/.test(r.ficha), r.ficha);
  chk('1d contra septiembre ENTERO (el mes cerró): 15.000 y 5 unidades = la Proyección de septiembre', r.eqAnt && r.eqAnt.bs===15000 && r.eqAnt.bs===r.RsEq && r.eqAnt.u===5 && r.eqAnt.u===r.RsU && r.cmp==='septiembre', { eqAnt:r.eqAnt, Rs:r.RsEq, cmp:r.cmp });
  chk('1e por vendedora = las filas de la Proyección de los dos meses (Maria 4.000 vs 10.000, Isabel 6.000 vs 3.000, Carola 3.500 nueva, Fernando 2.500 vs 2.000)',
    r.vend['Maria Flores']==='4000/10000' && r.vend['Isabel Robledo']==='6000/3000' && r.vend['Carola Chavez']==='3500/0' && r.vend['Fernando Peinado']==='2500/2000' &&
    Object.keys(r.rv).every(function(v){ return +String(r.vend[v]).split('/')[0]===r.rv[v]; }) && Object.keys(r.rsv).every(function(v){ return +String(r.vend[v]).split('/')[1]===r.rsv[v]; }), { vend:r.vend, rv:r.rv, rsv:r.rsv });
  chk('1f por marca = las fichas de la Proyección (Heaven 13.500, Sueña 2.500) y contra septiembre (13.000 / 2.000)',
    r.marcas.join()==='suena:2500/1/2000,heaven:13500/6/13000' && r.Rmarcas.join()==='suena:2500/1,heaven:13500/6', { marcas:r.marcas, R:r.Rmarcas });
  chk('1g Eduardo (mayorista) y ROHO van aparte: 9.000 en 1 venta y 2 unidades', r.mayor==='9000/1' && r.roho===2, [r.mayor, r.roho]);
  chk('1h los productos suman las unidades de la Proyección (7); el que más, TITANIO LATEX 140x190 (3 en 2 ventas); la almohada no está',
    r.prodsTot===7 && r.prodsTot===r.Req.u && /^TITANIO LATEX\|140X190:3\/2$/.test(r.prods[0]) && !r.prods.some(function(p){ return /ALMOHADA/.test(p); }), r.prods);
  chk('1i ATC = el informe de ATC de octubre: 3 (septiembre 1)', r.atc.n===3 && r.atc.n===r.atc.Tn && r.atc.nAnt===1 && r.atc.nAnt===r.atc.TnAnt, r.atc);
  chk('1j ✗: 9 pedidos de octubre (sin la venta de tienda), 3 con ✗ (también la RPT) y 4 unidades; 1 hecho a pedido (2 unidades)',
    r.falto.nPed===9 && r.falto.nNo===3 && r.falto.uNo===4 && r.falto.nFab===1 && r.falto.uFab===2 && r.faltoAnt===0, r.falto);
  chk('1k el producto que más faltó: TITANIO LATEX 140x190, 4 unidades ✗ en 3 pedidos y 2 a pedido',
    r.falto.prods[0] && r.falto.prods[0].k==='TITANIO LATEX|140X190' && r.falto.prods[0].no===4 && r.falto.prods[0].nNo===3 && r.falto.prods[0].fab===2, r.falto.prods);

  /* la plata contra las fichas de Contabilidad → Ventas con «🚚 Entrega agendada», octubre, todos */
  r = await page.evaluate(() => {
    var D=imesDatos('2026-10'), P=D.plata;
    segSet('cta-tab','ventas'); setContaTab('ventas'); segSet('cta-base','entrega'); segSet('cta-mode','mes');
    document.getElementById('cta-mes').value='2026-10'; var sv=document.getElementById('cta-vendedor'); if(sv) sv.value=''; var q=document.getElementById('cta-search'); if(q) q.value='';
    renderConta();
    var M=CX_TOP_M, pc=porCobrarDatos('ventas');
    return { P:{ n:P.n, vendido:P.vendido, cobrado:P.cobrado, falta:P.falta, nDeben:P.nDeben, deu:P.deudas.map(function(x){ return x.p.id+':'+x.saldo+':'+x.dias; }), ant:P.ant.length },
      M:{ n:M.n, vendido:M.vendido, cobrado:M.cobrado, falta:M.falta, nDeben:M.nDeben }, pc:pc.items.map(function(x){ return x.p.id+':'+x.saldo+':'+x.dias; }) };
  });
  chk('1l la plata = las fichas de Contabilidad → Ventas con «🚚 Entrega agendada»: vendido 16.000, ya ingresó 11.000, falta 5.000 en 2 ventas',
    r.P.vendido===16000 && r.P.cobrado===11000 && r.P.falta===5000 && r.P.nDeben===2 && r.P.n===6 &&
    r.P.vendido===r.M.vendido && r.P.cobrado===r.M.cobrado && r.P.falta===r.M.falta && r.P.nDeben===r.M.nDeben && r.P.n===r.M.n, r);
  chk('1m las que deben = «Falta cobrar → Ver quiénes», de la más vieja (Maria desde el 02/10, 36 días) a la más nueva', r.P.deu.join()===r.pc.join() && r.P.deu[0]==='o1:3000:36' && r.P.ant===0, [r.P.deu, r.pc]);

  /* ---- 2. el mes en curso, a la fecha ---- */
  r = await page.evaluate(() => {
    var D=imesDatos('2026-11'), R=proyeccionMes('2026-11'); PRY_CMP=''; PRY_CMP_DE=''; var A=pryAltura(R);
    var maria=D.vend.filter(function(v){ return v.v==='Maria Flores'; })[0];
    return { enCurso:D.enCurso, eq:D.eq.bs, Req:R.equipo.vendido, ant:D.eqAnt, Acmp:A && A.cmp, Aant:A && A.ant.equipo.bs, Au:A && A.ant.equipo.u, cmp:D.cmpTxt, alt:D.alt,
      maria:maria && (maria.bs+'/'+maria.ant.bs), pryCmp:PRY_CMP, ant2:D.plata.ant.map(function(x){ return x.p.id+':'+x.saldo; }) };
  });
  chk('2a noviembre, a la fecha: vendido 5.000 = la Proyección', r.enCurso && r.eq===5000 && r.eq===r.Req, r);
  chk('2b contra octubre A ESTA ALTURA (cargado hasta el 7 a las 10:00) = «A esta altura» de la Proyección: 9.000 y 3 unidades',
    r.ant && r.Acmp==='2026-10' && r.ant.bs===9000 && r.ant.bs===r.Aant && r.ant.u===r.Au && r.alt && r.cmp==='octubre a esta altura', r);
  chk('2c por vendedora también a esta altura (Maria 3.000 contra 4.000), y no cambia lo elegido en «Comparar con»', r.maria==='3000/4000' && r.pryCmp==='', r);
  chk('2d los saldos de meses anteriores van aparte (§4ok-E7): las 2 de octubre ya entregadas que deben', r.ant2.sort().join()==='o1:3000,o4:2000', r.ant2);

  /* ---- 3. «3 cosas para mirar» ---- */
  r = await page.evaluate(() => {
    var M=imesDatos('2026-10').mirar;
    var sinAtc=function(){ STATE=STATE.filter(function(p){ return !esATC(p.oc); }); };
    var out={ a:M.map(function(c){ return c.k+':'+c.quien+':'+Math.round(c.s*1000); }), t:M.map(function(c){ return c.t; }) };
    var S0=window.__STATE0;
    sinAtc(); out.b=imesDatos('2026-10').mirar.map(function(c){ return c.k+':'+c.quien; });
    STATE.forEach(function(p){ if(p.fecha && p.fecha.slice(0,7)==='2026-10' || p.id==='t1'){ (p.productos||[]).forEach(function(x){ delete x.chk; delete x.enProd; }); if(p.saldo){ p.acuenta=r2((Number(p.acuenta)||0)+Number(p.saldo)); p.saldo=0; p.pagado=true; p.metodoPago='~Efectivo '+p.acuenta+' @2026-10-02 #9'; } } });
    var M3=imesDatos('2026-10').mirar; out.c=M3.map(function(c){ return c.k+':'+c.quien; });
    STATE=JSON.parse(S0);
    return out;
  });
  chk('3a con todo: ATC (TITANIO por Hundimiento, 2 de 3), Maria (−6.000 de 15.000) y el stock (3 de 9 pedidos); lo que falta cobrar (5.000 de 16.000) queda cuarto',
    r.a.join()==='atc:TITANIO|Hundimiento:667,vend:Maria Flores:400,stock:TITANIO LATEX|140X190:333', r.a);
  chk('3b en voseo y con números', /Revisá <b>TITANIO<\/b> \(Heaven\) por <b>«Hundimiento»<\/b>: 2 de las 3 ATC/.test(r.t[0]) &&
    /Mirá las ventas de <b>Maria Flores<\/b>: Bs 4\.000 contra Bs 10\.000 de septiembre \(<b>−60%<\/b>, Bs 6\.000 menos\)/.test(r.t[1]) &&
    /Faltó <b>TITANIO LATEX 140x190<\/b>: ✗ no hay en 3 pedidos \(4 unidades\)\. En el mes, 3 de 9 pedidos/.test(r.t[2]), r.t);
  chk('3c sin las ATC entra la cobranza: Maria, el stock y la deuda más vieja (Maria, desde el 02/10)', r.b.join()==='vend:Maria Flores,stock:TITANIO LATEX|140X190,cobro:CLIENTE O1', r.b);
  chk('3d sin ATC, deudas ni ✗ queda solo la caída de Maria (no se inventa nada)', r.c.join()==='vend:Maria Flores', r.c);

  /* ---- 4. el botón, la contraseña y las hojas ---- */
  r = await page.evaluate(() => {
    UNLOCKED=false; mostrarBotonesTodos(); showView('conta'); segSet('cta-tab','proy'); setContaTab('proy');
    var b=document.getElementById('pry-informe-btn'), vis=!!(b && b.offsetParent), tab=getComputedStyle(document.getElementById('cta-tab-proy')).display;
    var abrio=imesAbrir(), disp=document.getElementById('imes-ov').style.display;
    return { vis:vis, tab:tab, abrio:abrio, disp:disp };
  });
  chk('4a sin la contraseña: ni la pestaña Proyección ni el botón se ven, y abrirlo a mano no abre nada', !r.vis && r.tab==='none' && r.abrio===false && r.disp==='none', r);
  r = await page.evaluate(() => {
    UNLOCKED=true; mostrarBotonesTodos(); showView('conta'); segSet('cta-tab','proy'); setContaTab('proy'); document.getElementById('pry-mes').value='2026-11'; renderProyeccion();
    var b=document.getElementById('pry-informe-btn'), vis=!!(b && b.offsetParent); b.click();
    var ov=document.getElementById('imes-ov'), H=[].slice.call(document.querySelectorAll('#imes-hojas .ai-pag')), inp=document.getElementById('imes-mes');
    return { vis:vis, txt:b.textContent, disp:ov.style.display, cls:ov.className, mes:inp.value, max:inp.max, info:document.getElementById('imes-info').textContent, n:H.length,
      kick:H.map(function(h){ return (h.querySelector('.ai-kick')||{}).textContent; }), pies:H.map(function(h){ return (h.querySelector('.ai-pie')||{}).textContent; }),
      tit:H.map(function(h){ return (h.querySelector('h2')||{}).textContent; }), tam:H.map(function(h){ return h.offsetWidth+'x'+h.offsetHeight; }),
      zoom:document.getElementById('imes-hojas').style.zoom, page:!!document.getElementById('atci-page'), t1:H[0].innerText };
  });
  chk('4b con la contraseña el botón «📄 Informe del mes» está en la Proyección y abre la ventana', r.vis && /Informe del mes/.test(r.txt) && r.disp==='flex', r.txt);
  chk('4c arranca en el último mes CERRADO (octubre), aunque la Proyección mire noviembre; deja elegir hasta el mes en curso', r.mes==='2026-10' && r.max==='2026-11' && /^Octubre 2026 · 6 hojas$/.test(r.info), [r.mes, r.max, r.info]);
  chk('4d 6 hojas: resumen, por marca, productos, ATC, el stock que faltó y la cobranza',
    r.n===6 && r.tit.join('|')==='Cómo fue octubre|Por marca|Los productos más vendidos|Atención al cliente (ATC)|El stock que faltó|La cobranza', r.tit);
  chk('4e arriba de cada hoja «Informe de octubre 2026 · Multiespumas · hoja N de 6», y abajo «Hoja N de 6»',
    r.kick[0]==='Informe de octubre 2026 · Multiespumas · hoja 1 de 6' && r.kick[5]==='Informe de octubre 2026 · Multiespumas · hoja 6 de 6' && /Informe del mes · Octubre 2026/.test(r.pies[0]) && /Hoja 6 de 6/.test(r.pies[5]), [r.kick, r.pies]);
  chk('4f cada hoja mide 1123×794 (A4 apaisada), en pantalla se achica, y la hoja va apaisada (@page)', r.tam.every(function(t){ return t==='1123x794'; }) && Number(r.zoom)>0 && Number(r.zoom)<=1 && r.page, [r.tam, r.zoom]);
  chk('4g la hoja 1: las 6 fichas (vendido, colchones y somieres, cobrado, falta cobrar, ATC, pedidos con ✗) con el % contra septiembre',
    /Vendido\s*Bs 16\.000\s*6 ventas · ▲ 7% vs septiembre \(Bs 15\.000\)/i.test(r.t1) && /Colchones y somieres\s*7\s*6 colch\. · 1 som\. · ▲ 40% vs septiembre \(5\)/i.test(r.t1) &&
    /Cobrado\s*Bs 11\.000\s*69% de lo vendido/i.test(r.t1) && /Falta cobrar\s*Bs 5\.000\s*2 ventas con saldo/i.test(r.t1) && /ATC\s*3\s*▲ 2 más que septiembre \(1\)/i.test(r.t1) &&
    /Pedidos con ✗ no hay\s*3\s*de 9 pedidos del mes · 4 unidades ✗/i.test(r.t1), r.t1.slice(0, 900));
  chk('4h la hoja 1: las barras por vendedora (Isabel primero, Maria ▼ 60%, Carola nueva) y «3 cosas para mirar»',
    /Vendido por vendedora/.test(r.t1) && /Isabel Robledo\s*Bs 6\.000 ▲ 100%[\s\S]*Maria Flores\s*Bs 4\.000 ▼ 60%[\s\S]*Carola Chavez\s*Bs 3\.500 nuevo/.test(r.t1) &&
    /3 cosas para mirar/.test(r.t1) && (r.t1.match(/Revisá|Mirá|Faltó/g)||[]).length===3, r.t1.slice(600, 1800));
  chk('4i la hoja 1 dice de dónde sale cada número (Proyección, Contabilidad con «🚚 Entrega agendada», el informe de ATC y las marcas)',
    /Proyección del mes/.test(r.t1) && /Contabilidad → Ventas con «🚚 Entrega agendada»/.test(r.t1) && /informe de ATC/.test(r.t1), r.t1.slice(-500));

  r = await page.evaluate(() => {
    var H=[].slice.call(document.querySelectorAll('#imes-hojas .ai-pag'));
    document.getElementById('imes-hojas').style.zoom='1';
    var fuera=H.map(function(h, i){
      var b=h.getBoundingClientRect(), f=h.querySelector('.imes-fuente'), lim=f ? f.getBoundingClientRect().top : b.bottom-60, peor=0;
      [].forEach.call(h.querySelectorAll('.ai-cuerpo *'), function(e){ var r=e.getBoundingClientRect(); if(r.height && r.bottom>lim+1) peor=Math.max(peor, Math.round(r.bottom-lim)); });
      var anchos=0; [].forEach.call(h.querySelectorAll('.ai-cuerpo *'), function(e){ var r=e.getBoundingClientRect(); if(r.width && r.right>b.right-40) anchos++; });
      return peor+'/'+anchos;
    });
    imesEscala();
    return { fuera:fuera, txt:H.map(function(h){ return h.innerText; }) };
  });
  chk('4j nada se sale de ninguna hoja (ni por abajo ni por el costado)', r.fuera.every(function(x){ return x==='0/0'; }), r.fuera);
  chk('4k por marca: Heaven 13.500 (84% del equipo) con sus 3 vendedoras y Sueña; Eduardo y ROHO aparte',
    /Heaven 84% del equipo\s*Bs 13\.500,00/.test(r.txt[1]) && /Sueña 16% del equipo\s*Bs 2\.500,00/.test(r.txt[1]) && /Contra septiembre: ▲ 4% en Bs \(Bs 13\.000\)/.test(r.txt[1]) &&
    /Isabel Robledo\s*2\s*3\s*Bs 6\.000\s*▲ 100%/.test(r.txt[1]) && /Mayoristas \(Eduardo Añez\): Bs 9\.000,00 en 1 venta/.test(r.txt[1]) && /ROHO, en unidades: 2 unidades/.test(r.txt[1]), r.txt[1].slice(0, 1200));
  chk('4l productos: 7 unidades, TITANIO LATEX 140x190 primero con 3', /7 unidades: 6 colchones y 1 somier, en 6 ventas · 5 productos distintos/.test(r.txt[2]) && /1\s*TITANIO LATEX\s*140x190\s*Heaven\s*2\s*3/.test(r.txt[2]), r.txt[2].slice(0, 700));
  chk('4m ATC: 3 entraron (▲ 2 más que septiembre), por qué (Hundimiento 2) y por línea (TITANIO 2 · Hundimiento 2)',
    /Entraron\s*3\s*▲ 2 más que septiembre \(1\)/i.test(r.txt[3]) && /Hundimiento\s*2 67%/.test(r.txt[3]) && /TITANIO\s*2\s*Hundimiento 2/.test(r.txt[3]), r.txt[3].slice(0, 900));
  chk('4n el stock que faltó: 9 pedidos, 3 con ✗ (33%), 1 hecho a pedido; la tabla con TITANIO LATEX 140x190 (3 pedidos ✗, 4 unidades, 2 a pedido)',
    /Pedidos del mes\s*9/i.test(r.txt[4]) && /Con ✗ no hay\s*3\s*33% de los pedidos · 4 unidades/i.test(r.txt[4]) && /Hechos a pedido 🏭\s*1/i.test(r.txt[4]) &&
    /1\s*TITANIO LATEX\s*140x190\s*3\s*4\s*1\s*2/.test(r.txt[4]), r.txt[4].slice(0, 900));
  chk('4o la cobranza: vendido 16.000, ya ingresó 11.000 (69%), falta 5.000; quién debe de la más vieja (CLIENTE O1, 02/10 · 36 d)',
    /Vendido\s*Bs 16\.000/i.test(r.txt[5]) && /Ya ingresó\s*Bs 11\.000\s*69% de lo vendido/i.test(r.txt[5]) && /Falta cobrar\s*Bs 5\.000\s*2 ventas con saldo/i.test(r.txt[5]) &&
    /CLIENTE O1\s*Maria Flores\s*02\/10 · 36 d\s*Bs 3\.000[\s\S]*CLIENTE O4/.test(r.txt[5]) && /«Ya ingresó»/.test(r.txt[5]), r.txt[5].slice(0, 1200));

  /* cambiar al mes en curso: «a la fecha» */
  r = await page.evaluate(() => {
    var i=document.getElementById('imes-mes'); i.value='2026-11'; i.dispatchEvent(new Event('change'));
    var H=[].slice.call(document.querySelectorAll('#imes-hojas .ai-pag'));
    return { info:document.getElementById('imes-info').textContent, kick:(H[0].querySelector('.ai-kick')||{}).textContent, t1:H[0].innerText, n:H.length };
  });
  chk('4p el mes en curso dice «a la fecha» y compara con octubre a esta altura', /^Noviembre 2026 · a la fecha · \d+ hojas$/.test(r.info) &&
    /^Informe de noviembre 2026 · a la fecha \(07\/11\) · Multiespumas · hoja 1 de \d+$/.test(r.kick) && /Cómo va noviembre, a la fecha/.test(r.t1) &&
    /▼ 44% vs octubre a esta altura \(Bs 9\.000\)/.test(r.t1) && /\+ Bs 5\.000 de meses anteriores \(2\)/.test(r.t1), [r.info, r.kick, r.t1.slice(0, 700)]);
  r = await page.evaluate(() => { var i=document.getElementById('imes-mes'); i.value='2026-12'; i.dispatchEvent(new Event('change')); return { v:i.value, info:document.getElementById('imes-info').textContent }; });
  chk('4q un mes que todavía no llegó no se puede: vuelve al mes en curso', r.v==='2026-11' && /^Noviembre 2026/.test(r.info), r);
  r = await page.evaluate(() => { var i=document.getElementById('imes-mes'); i.value='2026-10'; i.dispatchEvent(new Event('change')); return document.getElementById('imes-info').textContent; });

  /* ---- 4r. un mes cargado: nada queda afuera ni se sale de la hoja (40 productos, 30 que deben, 25 con ✗, 13 vendedoras, ATC de 3 marcas) ---- */
  r = await page.evaluate(() => {
    var S0=JSON.stringify(STATE), ts=function(f){ return new Date(f+'T10:00:00-04:00').getTime(); };
    var VS=['Jonathan Monje','Maria Flores','Isabel Robledo','Carola Chavez','Mirian Salazar','Andrea Orias','Fabián Godoy','Mauricio Merida','Juan Pablo Paredes','Fernando Peinado','Vendedora Nueva Uno','Vendedora Nueva Dos','Vendedora Nueva Tres'];
    var cod=function(i){ return String.fromCharCode(65+Math.floor(i/26))+String.fromCharCode(65+i%26); };
    for(var i=0;i<45;i++){
      var d=('0'+(1+i%28)).slice(-2), tot=1000+i*10, debe=i<30;
      STATE.push({ id:'x'+i, oc:'10-'+(100+i), vendedor:VS[i%VS.length], cliente:'DEUDOR '+cod(i), celular:'7111'+('000'+i).slice(-4), fecha:'2026-10-'+d, turno:'AM', ts:ts('2026-10-'+d), zona:'Centro',
        productos:[{ desc:'PRUEBA KAPPA '+cod(i%40), medida:'140x190', cant:1+i%3, precio:tot, chk:(i<25 ? 'no' : undefined) }],
        acuenta:debe ? 100 : tot, saldo:debe ? tot-100 : 0, pagado:!debe, metodoPago:'~Efectivo '+(debe ? 100 : tot)+' @2026-10-'+d+' #'+i });
    }
    var L=[['TITANIO','ORO','ESPECIAL','PLATA','DREAM','TROPICAL','ALMOHADA','COLCHONETA'], ['SUEÑA LITE','SUEÑA SMART','SUEÑA SOFT','CONFORT PLUS','ESSENTIAL','PREMIER DELUXE','BAHIA','CARIOCA'], ['PILLOW FLEX','EURO PEDIC','SOMIER NEGRO']];
    var k=0; L.forEach(function(g){ g.forEach(function(nm){ for(var j=0;j<2;j++){ k++; STATE.push({ id:'za'+k, oc:'ATC 10-'+(200+k), fecha:'2026-10-15', turno:'AM', cliente:'ATC '+k, vendedor:'Maria Flores', celular:'7200'+('000'+k).slice(-4), zona:'Centro', ts:ts('2026-10-'+('0'+(1+k%28)).slice(-2)), entregado:false,
      productos:[{ desc:nm, medida:'140x190', cant:1, atc:{ mot:ATC_MOTIVOS[k%ATC_MOTIVOS.length], det:'x' } }] }); } }); });
    var i2=document.getElementById('imes-mes'); i2.value='2026-10'; i2.dispatchEvent(new Event('change'));
    var D=IMES.ult, H=[].slice.call(document.querySelectorAll('#imes-hojas .ai-pag'));
    document.getElementById('imes-hojas').style.zoom='1';
    var fuera=H.map(function(h){
      var b=h.getBoundingClientRect(), f=h.querySelector('.imes-fuente'), lim=f ? f.getBoundingClientRect().top : b.bottom-60, peor=0, ancho=0;
      [].forEach.call(h.querySelectorAll('.ai-cuerpo *'), function(e){ var q=e.getBoundingClientRect(); if(q.height && q.bottom>lim+1) peor=Math.max(peor, Math.round(q.bottom-lim)); if(q.width && q.right>b.right-40) ancho++; });
      return peor+'/'+ancho;
    });
    var txt=H.map(function(h){ return h.innerText; }), todo=txt.join('\n');
    var prods=D.prods.lista.map(function(x){ return imesProdNom(x.k).n; }), faltos=D.falto.prods.map(function(x){ return imesProdNom(x.k).n; });
    var deben=D.plata.deudas.map(function(x){ return x.p.cliente; });
    var tit=H.map(function(h){ return (h.querySelector('h2')||{}).textContent; });
    var cuenta=function(lista, re){ return lista.filter(function(n){ return new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s', 'i').test(todo); }).length; };
    var out={ n:H.length, tit:tit, fuera:fuera, prods:prods.length, prodsVis:cuenta(prods), faltos:faltos.length, faltosVis:cuenta(faltos), deben:deben.length, debenVis:cuenta(deben),
      vend:D.vend.length, vendMarca:VS.filter(function(v){ return txt[1].indexOf(v)>=0; }).length, nota:/Las 13 están en la hoja «Por marca»/.test(txt[0]), atcMas:/Las otras \d+ líneas?, en el informe de ATC/.test(todo) };
    window.__S0R=S0;
    return out;
  });
  if(process.env.IMES_SALIDA){
    const H = await page.$$('#imes-hojas .ai-pag');
    for(let i=0;i<H.length;i++) await H[i].screenshot({ path:path.join(SALIDA, 'mucho-hoja'+(i+1)+'.png') });
  }
  await page.evaluate(() => { STATE=JSON.parse(window.__S0R); imesEscala(); var i3=document.getElementById('imes-mes'); i3.value='2026-10'; i3.dispatchEvent(new Event('change')); });
  chk('4r con mucho: los 40 productos, las 30+ que deben y los 25 que faltaron siguen en hojas aparte, y están todos', r.prods===r.prodsVis && r.prods>=40 && r.faltos===r.faltosVis && r.faltos>=25 && r.deben===r.debenVis && r.deben>=30 &&
    r.tit.indexOf('Los demás productos: 16 a 33 de '+r.prods)>=0 && r.tit.some(function(t){ return /^Lo que faltó, sigue: 12 a/.test(t); }) && r.tit.some(function(t){ return /^Las que deben, sigue: 10 a/.test(t); }), r);
  chk('4s …nada se sale de ninguna hoja (ni las 13 vendedoras, ni las ATC de 3 marcas)', r.fuera.every(function(x){ return x==='0/0'; }), r.fuera.map(function(f, i){ return r.tit[i]+':'+f; }));
  chk('4t …las 13 vendedoras están en «Por marca» y la hoja 1 lo dice (las barras son 10); las líneas de ATC que no entran dicen dónde están', r.vend===13 && r.vendMarca===13 && r.nota && r.atcMas, r);

  /* ---- 5. las dos listas de las ventanas a pantalla completa ---- */
  r = await page.evaluate(() => {
    var de=document.documentElement, ov=document.getElementById('imes-ov'), out={};
    de.classList.add('wco'); de.style.setProperty('--wco-h','33px'); out.wco=getComputedStyle(ov).borderTopWidth; de.classList.remove('wco'); de.style.removeProperty('--wco-h');
    de.classList.add('sa-top'); de.style.setProperty('--sa-t','24px'); out.sa=getComputedStyle(ov).borderTopWidth; de.classList.remove('sa-top'); de.style.removeProperty('--sa-t');
    out.nada=getComputedStyle(ov).borderTopWidth; out.cls=ov.className;
    return out;
  });
  chk('5a la ventana es «adm-ov» y lleva la franja de arriba sin barra (html.wco) y en el iPad instalado (html.sa-top)', r.cls==='adm-ov' && r.wco==='33px' && r.sa==='24px' && r.nada==='0px', r);
  const css = fs.readFileSync(process.env.PEDIDOS||path.resolve('pedidos.html'), 'utf8');
  const bloque = ((css.match(/\/\* 📄 Informe del mes \(07\/11, idea 120\)[\s\S]*?\n@media print\{[\s\S]*?\n\}/)||[''])[0]).replace(/\/\*[\s\S]*?\*\//g, '');
  chk('5b el CSS del informe no usa color-mix()/oklch() ni medidas vh/vw sin «/ var(--vz,1)»', bloque.length>200 && !/color-mix|oklch|\d+v[hw]\b(?!\s*\/\s*var\(--vz)/.test(bloque), bloque.length);

  /* ---- 6. el PDF ---- */
  if(HAY_LIBS){
    const [dl] = await Promise.all([ page.waitForEvent('download', { timeout:90000 }), page.click('#imes-pdf') ]);
    const dest = path.join(SALIDA, dl.suggestedFilename()); await dl.saveAs(dest);
    const buf = fs.readFileSync(dest), txt = buf.toString('latin1');
    const nPag = (txt.match(/\/Type \/Page\b(?!s)/g)||[]).length, apais = /\/MediaBox \[0 0 841\.8[89]\d* 595\.2[78]\d*\]/.test(txt);
    await page.waitForTimeout(200);
    r = await page.evaluate(() => ({ est:document.getElementById('imes-estado').innerText, ocup:IMES.ocupado, host:!!document.getElementById('atci-render'), btn:document.getElementById('imes-pdf').disabled }));
    chk('6a «⬇️ Descargar PDF» baja «Informe-del-mes-octubre-2026.pdf», un PDF de verdad', dl.suggestedFilename()==='Informe-del-mes-octubre-2026.pdf' && buf.slice(0,5).toString()==='%PDF-', dl.suggestedFilename());
    chk('6b 6 páginas A4 apaisadas, una por hoja', nPag===6 && apais, { nPag, apais, kb:Math.round(buf.length/1024) });
    chk('6c dice que está listo y limpia la copia y el botón', /Listo: se bajó Informe-del-mes-octubre-2026\.pdf \(6 hojas\)/.test(r.est) && !r.ocup && !r.host && !r.btn, r);
    const color = await page.evaluate(() => window.html2canvas(document.querySelector('#imes-hojas .ai-pag'), { scale:1, logging:false, backgroundColor:'#fff' }).then(function(cv){
      return [].slice.call(cv.getContext('2d').getImageData(200, 2, 1, 1).data).slice(0,3); }));
    chk('6d la foto de la hoja tiene su franja turquesa (no sale en blanco)', color[0]<60 && color[1]>140 && color[2]>140, color);
    if(process.env.IMES_SALIDA) console.log('  PDF en', dest);
  } else console.log('… sin las copias de jsPDF y html2canvas (npm i jspdf@2.5.1 html2canvas@1.4.1 y ATCI_LIBS_DIR=…/node_modules): se saltea la parte del PDF');

  libsSi = false;
  r = await page.evaluate(async () => {
    delete window.jspdf; delete window.html2canvas; window.__imprimio=0; window.print=function(){ window.__imprimio++; };
    imesPdf();
    for(var i=0;i<60 && IMES.ocupado;i++) await new Promise(function(ok){ setTimeout(ok, 100); });
    return { imp:window.__imprimio, est:document.getElementById('imes-estado').innerText, ocup:IMES.ocupado };
  });
  chk('6e sin las librerías (sin internet) abre la ventana de imprimir y lo dice', r.imp===1 && /sin internet/.test(r.est) && /Guardar como PDF/.test(r.est) && !r.ocup, r);

  /* ---- 7. capturas para mirar (solo con IMES_SALIDA) ---- */
  if(process.env.IMES_SALIDA){
    for(const ym of ['2026-10', '2026-11']){
      await page.evaluate((ym) => { var i=document.getElementById('imes-mes'); i.value=ym; i.dispatchEvent(new Event('change')); document.getElementById('imes-hojas').style.zoom='1'; }, ym);
      const H = await page.$$('#imes-hojas .ai-pag');
      for(let i=0;i<H.length;i++) await H[i].screenshot({ path:path.join(SALIDA, ym+'-hoja'+(i+1)+'.png') });
    }
    await page.locator('.imes-bar').screenshot({ path:path.join(SALIDA, 'barra.png') });
    console.log('  capturas en', SALIDA);
  }
  r = await page.evaluate(() => { imesCerrar(); return { ov:document.getElementById('imes-ov').style.display, page:!!document.getElementById('atci-page') }; });
  chk('al cerrar, la ventana se va y la hoja apaisada también', r.ov==='none' && !r.page, r);
  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e => { console.error(e); process.exit(1); });
