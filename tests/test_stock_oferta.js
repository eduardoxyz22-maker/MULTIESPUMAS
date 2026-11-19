/* 🏷️ QUÉ OFERTAR: LO QUE HAY Y NO SE VENDE (13/11, mejora 193; el dueño, para elegir las ofertas de Black Friday).

   LO QUE CUIDA:
   OF1  Sin la contraseña no hay botón (ni en la fila de siempre ni en «Más») y la ventana no abre.
   OF2  Con la contraseña: el botón en la fila de siempre y «🏷️ Qué ofertar» al final de «Más»; los dos abren la ventana (`.adm-ov`).
   OF3  Lo que no se vende aparece y lo que rota no: sin ventas en 60 días (2 o más libres), muchos meses de venta guardados, y lo que solo
        compró un mayorista (no es venta para la rotación: «+N que no cuentan»). Lo que rota, 1 sola unidad sin ventas y lo que vendió
        todo lo que hay quedan afuera.
   OF4  Las cuentas: hay = PTF + Banzer (`stockHaySalir`), libres = hay − lo vendido sin entregar, vendidos en 60 días por fecha de venta
        (lo de hace 100 días no cuenta), meses guardados = la cuenta de `stockMesesSobra` con el ritmo de 60 días, precio típico =
        `precioTipico` (la mediana), plata parada = libres × precio.
   OF5  Orden: primero lo que más plata tiene parada; lo que no tiene precio, al final y «sin precio».
   OF6  🛑 Lo que ya no se fabrica entra con su marca «ya no se fabrica: liquidar» aunque se venda.
   OF7  Filtros: Somieres / Colchones / Todo; el umbral de meses (12 saca lo que tiene 10 meses).
   OF8  El resumen de arriba: productos, unidades libres y plata parada (los mismos totales que la tabla).
   OF9  «📋 Copiar la lista» arma el texto para WhatsApp; «⬇️ Excel» trae números de verdad (la plata con formato Bs, `s:2`).
   OF10 Solo mira: abrir, filtrar, copiar y bajar el Excel no tocan la planilla ni el stock ni guardan nada.
   OF11 En el celular (390 px) no hay scroll de costado: cada producto es una tarjeta. ✕ y Esc cierran.

   Reloj CLAVADO (viernes 13/11/2026, 10:00 de Bolivia). Red cortada, datos sintéticos (el repo es público).
   Se corre:  node tests/test_stock_oferta.js
   Dientes:   PEDIDOS=/ruta/a/pedidos_de_antes.html node tests/test_stock_oferta.js   (sin «Qué ofertar»: rojas casi todas) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

/* El escenario. PTF (Excel de hoy 09:10) y Banzer (Excel de hoy 09:00):
   · TITANIO ICE 160 (CH1201): PTF 8 + Banzer 2, 1 vendido hace 20 días (a 3100); 3 ventas de hace 100 días a 3000/3100/3200 → 20 meses, Bs 31.000.
   · TITANIO LATEX 140 (CH1129): PTF 6, 1 vendido hoy para el 20/11 (sin entregar); 3 viejas a 4000 → libres 5, 10 meses, Bs 20.000.
   · PILLOW PEDIC 140 (CH1682): PTF 6, solo 3 a TIENDA AMIGA hace 10 días (a 2000/2000/2100) → sin ventas que cuenten, Bs 12.000.
   · SOMIER ORO 140 (CH1144): PTF 4, ninguna venta en 60 días (3 de hace 90 a 1500/1600/1700) → somier, Bs 6.400.
   · COLCHON CARIOCA PREMIER 140 (CH1672, ya no se fabrica): PTF 3, 3 vendidos hace 5-15 días SIN precio → 2 meses, liquidar, sin precio.
   · COLCHON SOFT 140 (COLT0048): PTF 5 y 10 entregas en 15 días → rota: NO entra.
   · ESPECIAL SEMIORTOPEDICO 105 (CH1098): PTF 1 sin ventas → 1 sola unidad: NO entra.
   · ORO ORTOPEDICO 140 (CH1051): PTF 2, 2 vendidos sin entregar → nada libre: NO entra. */
const ARMAR = () => {
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=false; try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  window.__guardados=0;
  apiSave=function(rec){ window.__guardados++; return Promise.resolve({ok:true, pedido:rec}); };
  apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
  var hoy=todayStr(), n=0;
  var dia=function(d){ return stockSumarDias(hoy, d); };
  var tsDe=function(f){ return new Date(f+'T11:00:00-04:00').getTime(); };
  var P=function(f, prods, o){ n++; return Object.assign({ id:'of'+n, fecha:f, oc:'11-'+(100+n), vendedor:'Carola Chavez', cliente:'CLIENTE '+n, celular:'7000000'+(n%10), turno:'AM', zona:'Norte', direccion:'x', maps:'',
      pagado:true, saldo:0, ts:tsDe(f), metodoPago:'', observaciones:'', estado:'', entregado:f<hoy, vehiculo:'', chofer:'', nota:'', acuenta:0, nroDia:1, verificado:true, fotos:[], productos:prods }, o||{}); };
  var X=function(desc, medida, codigo, cant, precio){ var x={ desc:desc, medida:medida, codigo:codigo, cant:cant }; if(precio) x.precio=precio; return x; };
  STATE=[];
  // TITANIO ICE 160
  [3000,3100,3200].forEach(function(pr){ STATE.push(P(dia(-100), [X('TITANIO ICE','160x190','CH1201',1,pr)])); });
  STATE.push(P(dia(-20), [X('TITANIO ICE','160x190','CH1201',1,3100)]));
  // TITANIO LATEX 140
  [4000,4000,4000].forEach(function(pr){ STATE.push(P(dia(-120), [X('TITANIO LATEX','140x190','CH1129',1,pr)])); });
  STATE.push(P(dia(7), [X('TITANIO LATEX','140x190','CH1129',1,4000)], { ts:new Date(hoy+'T08:00:00-04:00').getTime() }));
  // PILLOW PEDIC 140: solo a un mayorista
  [2000,2000,2100].forEach(function(pr){ STATE.push(P(dia(-10), [X('PILLOW PEDIC','140x190','CH1682',1,pr)], { vendedor:'Eduardo Añez', cliente:'TIENDA AMIGA ER S.A.' })); });
  // SOMIER ORO 140
  [1500,1600,1700].forEach(function(pr){ STATE.push(P(dia(-90), [X('SOMIER ORO','140x190','CH1144',1,pr)])); });
  // CARIOCA PREMIER 140 (ya no se fabrica), sin precio
  [-5,-10,-15].forEach(function(d){ STATE.push(P(dia(d), [X('COLCHON CARIOCA PREMIER','140x190','CH1672',1)])); });
  // SOFT 140: rota
  for(var i=1;i<=10;i++) STATE.push(P(dia(-i), [X('COLCHON SOFT','140x190','COLT0048',1,1800)]));
  // ORO ORTOPEDICO 140: todo vendido
  STATE.push(P(dia(5), [X('ORO ORTOPEDICO','140x190','CH1051',2,3500)], { ts:new Date(hoy+'T08:30:00-04:00').getTime() }));
  STOCK={ c:{ f:hoy, hora:'09:10', u:{} }, e:[], p:[], a:{}, g:{ 'Banzer':{ f:hoy, hora:'09:00', u:{} } }, al:{ 'Banzer':'sale' } };
  var K=function(c){ return stockClave({ codigo:c }); };
  STOCK.c.u[K('CH1201')]=8; STOCK.g.Banzer.u[K('CH1201')]=2;
  STOCK.c.u[K('CH1129')]=6; STOCK.c.u[K('CH1682')]=6; STOCK.c.u[K('CH1144')]=4; STOCK.c.u[K('CH1672')]=3;
  STOCK.c.u[K('COLT0048')]=5; STOCK.c.u[K('CH1098')]=1; STOCK.c.u[K('CH1051')]=2;
  STOCK_FILTRO={ q:'', aviso:'', marca:'', medida:'', orden:'', dir:1 };
  window._vis=function(el){ return !!(el && getComputedStyle(el).display!=='none' && el.offsetParent!==null); };
  if(typeof OFERTA_MESES!=='undefined') OFERTA_S={ tipo:'todo', meses:OFERTA_MESES };
  return { K:{ ice:K('CH1201'), latex:K('CH1129'), pillow:K('CH1682'), oro:K('CH1144'), carioca:K('CH1672'), soft:K('COLT0048'), esp:K('CH1098'), orto:K('CH1051') } };
};

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (ancho) => {
    const ctx = await browser.newContext({ viewport:{ width:ancho, height:900 }, timezoneId:'America/La_Paz', hasTouch:ancho<500, isMobile:ancho<500 });
    const page = await ctx.newPage(); page.setDefaultTimeout(30000);
    page.on('pageerror', e => errores.push(ancho+': '+e.message));
    page.on('dialog', d => d.accept());
    await ctx.route(/^https?:\/\//, r => r.abort());
    await page.clock.setFixedTime(new Date('2026-11-13T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
    return { ctx, page, ev };
  };

  /* ===== en la compu ===== */
  const A = await abrir(1440); const ev=A.ev;
  const R = await ev(ARMAR); const K = R.K || {};
  chk('0. el escenario se arma', !R.__error, R.__error);

  /* OF1 */
  const r1 = await ev(() => {
    window.STK_TOP_PRUEBA=0; abrirStock();
    var b=document.getElementById('stk-oft-btn'); var acc={ hay:!!b, vis:_vis(b) };
    closeStock(); window.STK_TOP_PRUEBA=1; abrirStock();
    var mas=[].map.call(document.querySelectorAll('#stk-top .s3-ch'), function(x){ return x.textContent; });
    closeStock();
    try{ abrirOferta(); }catch(e){ return { err:e.message }; }
    var ov=document.getElementById('oft-overlay');
    return { acc:acc, mas:mas, abierta:!!(ov && ov.style.display==='flex') };
  });
  chk('OF1a. sin la contraseña, el botón de la fila de siempre no se ve', r1.acc && !r1.acc.vis, r1.acc);
  chk('OF1b. sin la contraseña, «Más» no trae «Qué ofertar» (los 7 de siempre)', r1.mas && r1.mas.length===7 && !r1.mas.some(function(t){ return /ofertar/i.test(t); }), r1.mas);
  chk('OF1c. sin la contraseña la ventana no abre', r1.abierta===false, r1);

  /* OF2 */
  const r2 = await ev(() => {
    UNLOCKED=true;
    window.STK_TOP_PRUEBA=0; abrirStock();
    var b=document.getElementById('stk-oft-btn'), vis=_vis(b), prev=b && b.previousElementSibling && b.previousElementSibling.id;
    b.click();
    var ov=document.getElementById('oft-overlay'), ab1=!!(ov && ov.style.display==='flex');
    cerrarOferta(); closeStock();
    window.STK_TOP_PRUEBA=1; abrirStock();
    var chs=[].slice.call(document.querySelectorAll('#stk-top .s3-ch')), ult=chs[chs.length-1];
    ult.click();
    var ab2=!!(ov && ov.style.display==='flex');
    return { vis:vis, prev:prev, ab1:ab1, ab2:ab2, n:chs.length, ult:ult.textContent, cls:ov.className, rol:ov.getAttribute('role'), fija:getComputedStyle(ov).position, z:getComputedStyle(ov).zIndex };
  });
  chk('OF2a. con la contraseña, el botón se ve en la fila de siempre, al lado de «Stock de las tiendas», y abre la ventana', r2.vis && r2.prev==='stk-tst-btn' && r2.ab1, r2);
  chk('OF2b. «Más» suma «🏷️ Qué ofertar» al final (8) y abre la ventana', r2.n===8 && /Qué ofertar/.test(r2.ult) && r2.ab2, r2);
  chk('OF2c. es una ventana a pantalla completa con la clase `.adm-ov` (la franja de arriba) sobre Stock', r2.cls==='adm-ov' && r2.rol==='dialog' && r2.fija==='fixed' && Number(r2.z)>3000, r2);

  /* OF3-OF6: lo que calcula */
  const r3 = await ev((K) => {
    var D=ofertaDatos(), d=stockData(), por={}, est={};
    d.lista.forEach(function(o){ est[o.k]={ hay:stockHaySalir(o), comp:o.comp, rota:o.rota, desc:o.descont, cam:stockEnCaminoSeguro(o), o:o }; });
    D.filas.forEach(function(f){ por[f.k]=f; });
    var ice=est[K.ice], mesIce=stockMesesSobra(Object.assign({}, ice.o, { porDiaTodo:1/60 }));
    return { ks:D.filas.map(function(f){ return f.k; }), por:por, tot:D.tot,
      soft:{ rota:est[K.soft].rota, hay:est[K.soft].hay }, iceHay:ice.hay, mesIce:mesIce, latexComp:est[K.latex].comp,
      pt:{ ice:precioTipico('CH1201'), latex:precioTipico('CH1129'), oro:precioTipico('CH1144'), pillow:precioTipico('CH1682'), carioca:precioTipico('CH1672') } };
  }, K);
  const F = (r3 && r3.por) || {}; const KS = (r3 && r3.ks) || [];
  chk('OF3a. lo que casi no se vende aparece: TITANIO ICE (20 meses), TITANIO LATEX (10), PILLOW (solo mayorista), SOMIER ORO (sin ventas)',
    !!F[K.ice] && !!F[K.latex] && !!F[K.pillow] && !!F[K.oro], KS);
  chk('OF3b. lo que rota (COLCHON SOFT, 10 entregas en 15 días) NO aparece', r3.soft && r3.soft.rota===true && r3.soft.hay===5 && !F[K.soft], r3.soft);
  chk('OF3c. 1 sola unidad sin ventas NO aparece, ni lo que ya se vendió entero', KS.length>0 && !F[K.esp] && !F[K.orto], KS);
  chk('OF3d. lo que solo compró un mayorista: 0 vendidos que cuentan y «+3 que no cuentan»', F[K.pillow] && F[K.pillow].v60===0 && F[K.pillow].fuera===3 && F[K.pillow].meses===null, F[K.pillow]);
  const ice=F[K.ice]||{}, lat=F[K.latex]||{};
  chk('OF4a. hay = PTF + Banzer (la misma de Stock): 8 + 2 = 10', ice.ptf===8 && ice.bz===2 && ice.hay===10 && r3.iceHay===10 && ice.libre===10, ice);
  chk('OF4b. vendidos en 60 días por fecha de venta: 1 (las 3 de hace 100 días no cuentan), en 1 entrega', ice.v60===1 && ice.n60===1, ice);
  chk('OF4c. meses guardados = la cuenta de `stockMesesSobra` con el ritmo de 60 días: 10 / (1/60) / 30 = 20', Math.abs(ice.meses-20)<1e-9 && Math.abs(r3.mesIce-20)<1e-9, { meses:ice.meses, stockMesesSobra:r3.mesIce });
  chk('OF4d. precio típico = `precioTipico` (la mediana): 3100 con 4 ventas (3000/3100/3100/3200); plata = 10 × 3100', ice.precio===3100 && !!r3.pt && ice.precio===r3.pt.ice && ice.nPrecio===4 && ice.plata===31000, ice);
  chk('OF4e. lo vendido sin entregar no se oferta: TITANIO LATEX hay 6, 1 ya vendido → libres 5, Bs 20.000', lat.hay===6 && lat.comp===1 && r3.latexComp===1 && lat.libre===5 && lat.plata===20000 && Math.abs(lat.meses-10)<1e-9, lat);
  chk('OF5a. orden por plata parada: ICE (31.000) → LATEX (20.000) → PILLOW (12.000) → SOMIER ORO (6.400) → CARIOCA (sin precio, al final)',
    JSON.stringify(KS)===JSON.stringify([K.ice, K.latex, K.pillow, K.oro, K.carioca]), KS.map(function(k){ return k+' '+(F[k]&&F[k].plata); }));
  chk('OF5b. sin 3 ventas con precio no hay precio típico: «sin precio» y no suma plata', F[K.carioca] && F[K.carioca].precio===0 && F[K.carioca].plata===0 && !!r3.pt && r3.pt.carioca===0, F[K.carioca]);
  chk('OF6. 🛑 lo que ya no se fabrica entra aunque se venda (3 en 60 días, 2 meses) y va marcado', F[K.carioca] && F[K.carioca].descont===true && F[K.carioca].v60===3 && Math.abs(F[K.carioca].meses-2)<1e-9, F[K.carioca]);

  /* La pantalla */
  const r4 = await ev(() => {
    abrirOferta();
    var filas=[].map.call(document.querySelectorAll('#oft-tabla tbody tr'), function(tr){ return { k:tr.getAttribute('data-k'), t:tr.innerText.replace(/\s+/g,' ') }; });
    var res=document.getElementById('oft-res').innerText.replace(/\s+/g,' '), pie=document.querySelector('#oft-tabla tfoot').innerText.replace(/\s+/g,' ');
    return { filas:filas, res:res, pie:pie, chips:[].map.call(document.querySelectorAll('#oft-overlay .oft-chip[aria-pressed="true"]'), function(b){ return b.textContent; }) };
  });
  const T0 = (r4 && r4.filas) || []; const T = [0,1,2,3,4].map(function(i){ return T0[i] || { k:'', t:'' }; });
  chk('OF6b. en la pantalla, la marca «🛑 ya no se fabrica: liquidar» solo en el CARIOCA', T0.length===5 && /ya no se fabrica: liquidar/.test(T[4].t) && T.slice(0,4).every(function(f){ return !/liquidar/.test(f.t); }), T0.map(function(f){ return f.t.slice(0,90); }));
  chk('OF6c. cada fila dice hay con PTF / Banzer, vendidos, meses y precio («sin ventas», «sin precio», «+3 que no cuentan»)',
    /10\s*PTF 8 · Banzer 2/.test(T[0].t) && /1 en 1 entrega/.test(T[0].t) && /\b20\b/.test(T[0].t) && /1 ya vendida: libres 5/.test(T[1].t) &&
    /\+3 que no cuentan/.test(T[2].t) && /sin ventas/.test(T[3].t) && /sin precio/.test(T[4].t), T0.map(function(f){ return f.t; }));
  chk('OF8a. el resumen: 5 productos, 28 unidades libres, Bs 69.400 parados y «1 sin precio»', /productos 5/i.test(r4.res||'') && /unidades libres 28/i.test(r4.res||'') && /Bs 69\.400/.test(r4.res||'') && /1 sin precio/.test(r4.res||'') && /1 ya no se fabrica/.test(r4.res||''), r4.res);
  chk('OF8b. el total de la tabla dice lo mismo', /5 productos/.test(r4.pie||'') && /28 libres/.test(r4.pie||'') && /Bs 69\.400/.test(r4.pie||''), r4.pie);
  chk('OF8c. arranca en «Todo» y «6 meses o más»', JSON.stringify(r4.chips)===JSON.stringify(['Todo','6 meses o más']), r4.chips);

  /* OF7: filtros */
  const r7 = await ev(() => {
    var ks=function(){ return [].map.call(document.querySelectorAll('#oft-tabla tbody tr'), function(tr){ return tr.getAttribute('data-k'); }); };
    document.querySelector('#oft-overlay .oft-chip[data-v="somier"]').click(); var som=ks();
    document.querySelector('#oft-overlay .oft-chip[data-v="colchon"]').click(); var col=ks();
    document.querySelector('#oft-overlay .oft-chip[data-v="todo"]').click();
    document.querySelector('#oft-overlay .oft-chip[data-v="12"]').click(); var m12=ks(), pie12=document.querySelector('#oft-overlay .oft-pie').textContent;
    document.querySelector('#oft-overlay .oft-chip[data-v="6"]').click(); var m6=ks();
    return { som:som, col:col, m12:m12, m6:m6, pie12:pie12 };
  });
  chk('OF7a. «Somieres»: solo el SOMIER ORO', JSON.stringify(r7.som)===JSON.stringify([K.oro]), r7.som);
  chk('OF7b. «Colchones»: los otros cuatro, sin el somier', r7.col && r7.col.length===4 && r7.col.indexOf(K.oro)<0, r7.col);
  chk('OF7c. «12 meses o más» saca el TITANIO LATEX (10 meses) y deja el ICE (20), lo sin ventas y lo que ya no se fabrica',
    r7.m12 && r7.m12.indexOf(K.latex)<0 && r7.m12.indexOf(K.ice)>=0 && r7.m12.indexOf(K.oro)>=0 && r7.m12.indexOf(K.pillow)>=0 && r7.m12.indexOf(K.carioca)>=0 && /12 meses/.test(r7.pie12), r7);
  chk('OF7d. volver a 6 meses lo trae de nuevo', r7.m6 && r7.m6.length===5, r7.m6);

  /* OF9: copiar y Excel; OF10: solo mira */
  const r9 = await ev(async () => {
    var antes={ st:JSON.stringify(STATE), sk:JSON.stringify(STOCK), cola:(function(){ try{ return localStorage.getItem(LS_PEND); }catch(e){ return ''; } })() };
    var txt='', cp=window.copyText; window.copyText=function(t){ txt=t; };
    try{ document.getElementById('oft-copiar').click(); }finally{ window.copyText=cp; }
    var hojas=null, xml='', nombre='', bx=window.buildXlsx, dl=window.downloadBlob;
    window.buildXlsx=function(sh){ hojas=sh; xml=sh.map(buildSheetXml).join(''); return new Uint8Array(1); }; window.downloadBlob=function(b, n){ nombre=n; };
    try{ document.getElementById('oft-excel').click(); }finally{ window.buildXlsx=bx; window.downloadBlob=dl; }
    // y el archivo de verdad se arma sin errores
    var ok=true; try{ var by=buildXlsx(hojas); ok=!!(by && by.length>500); }catch(e){ ok=e.message; }
    await new Promise(function(r){ setTimeout(r, 300); });
    var M=hojas&&hojas[0].matrix, cab=M&&M[3].map(function(c){ return c.v; }), f1=M&&M[4];
    var despues={ st:JSON.stringify(STATE), sk:JSON.stringify(STOCK), cola:(function(){ try{ return localStorage.getItem(LS_PEND); }catch(e){ return ''; } })() };
    return { txt:txt, nombre:nombre, cab:cab, f1:f1, filas:M?M.length:0, ult:M&&M[M.length-1], ok:ok, xml31:/<v>31000<\/v>/.test(xml), xmlSin:/SIN PRECIO/.test(xml), xmlLiq:/LIQUIDAR/.test(xml),
      igual:antes.st===despues.st && antes.sk===despues.sk && antes.cola===despues.cola, guardados:window.__guardados };
  });
  chk('OF9a. «Copiar la lista»: título, resumen, criterio y una línea por producto en orden', /🏷️ \*Qué ofertar\*/.test(r9.txt||'') && /5 productos · 28 unidades libres · \*Bs 69\.400 parados\*/.test(r9.txt||'') &&
    /\n1\. TITANIO ICE 160x190 — hay 10 \(PTF 8 · Banzer 2\)/.test(r9.txt||'') && /5\. 🛑 COLCHON CARIOCA PREMIER 140x190 .*sin precio · ya no se fabrica: liquidar/.test(r9.txt||''), r9.txt);
  chk('OF9b. el Excel: una hoja con las columnas y un nombre con la fecha', r9.cab && r9.cab[0]==='PRODUCTO' && r9.cab.indexOf('PLATA PARADA (Bs)')===12 && r9.cab.indexOf('YA NO SE FABRICA')===13 && r9.nombre==='que-ofertar-2026-11-13.xlsx' && r9.ok===true, { cab:r9.cab, nombre:r9.nombre, ok:r9.ok });
  const f1 = (r9.f1 || []).concat([{},{},{},{},{},{},{},{},{},{},{},{},{},{}]);
  chk('OF9c. los números van como números (PTF, Banzer, hay, libres, vendidos, meses) y la plata con formato Bs (s:2)',
    f1[0]==='TITANIO ICE' && f1[3].t==='n' && f1[3].v===8 && f1[4].v===2 && f1[5].v===10 && f1[7].v===10 && f1[8].v===1 && f1[10].t==='n' && f1[10].v===20 &&
    f1[11].t==='n' && f1[11].s===2 && f1[11].v===3100 && f1[12].t==='n' && f1[12].s===2 && f1[12].v===31000 && r9.xml31, f1);
  chk('OF9d. el Excel trae «SIN PRECIO», «LIQUIDAR» y la fila del total con la plata', r9.xmlSin && r9.xmlLiq && r9.ult && r9.ult[7].v===28 && r9.ult[12].v===69400 && r9.ult[12].s===2, r9.ult);
  chk('OF10. solo mira: la planilla, el stock y la cola quedan iguales y no se guardó nada', r9.igual===true && r9.guardados===0, { igual:r9.igual, guardados:r9.guardados });

  /* OF11a: Esc cierra */
  const r11 = await ev(() => { var ov=document.getElementById('oft-overlay'); ov.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true })); return ov.style.display; });
  chk('OF11a. Esc cierra la ventana', r11==='none', r11);

  /* Sin nada parado */
  const r12 = await ev(() => { STOCK.c.u={}; STOCK.g.Banzer.u={}; abrirOferta(); var v=document.getElementById('oft-vacio'); var t=v?v.textContent:''; cerrarOferta(); return t; });
  chk('OF12. sin nada parado lo dice (y no hay tabla)', /no hay nada parado/.test(r12), r12);
  await A.ctx.close();

  /* ===== en el celular ===== */
  const C = await abrir(390);
  const rc0 = await C.ev(ARMAR);
  const rc = await C.ev(async () => {
    UNLOCKED=true; window.STK_TOP_PRUEBA=1; abrirStock(); closeStock(); abrirOferta();
    await new Promise(function(r){ setTimeout(r, 200); });
    var ov=document.getElementById('oft-overlay'), body=document.getElementById('oft-body'), tab=document.getElementById('oft-tabla');
    var fila=tab && tab.querySelector('tbody tr'), R=fila && fila.getBoundingClientRect(), W=innerWidth;
    var fuera=[].filter.call(ov.querySelectorAll('button, td, .oft-fi'), function(e){ var q=e.getBoundingClientRect(); return q.width>0 && (q.right>W+1 || q.left<-1); }).map(function(e){ return e.className||e.tagName; });
    var lab=fila && getComputedStyle(fila.querySelectorAll('td')[1], '::before').content;
    var r={ doc:document.documentElement.scrollWidth, vw:W, bodySW:body.scrollWidth, bodyCW:body.clientWidth, fila:R?Math.round(R.width):0, fuera:fuera, thead:tab?getComputedStyle(tab.querySelector('thead')).display:'', lab:lab };
    document.getElementById('oft-cerrar').click(); r.cerro=ov.style.display;
    return r;
  });
  chk('OF11b. 390 px: sin scroll de costado (la página ni la ventana)', !rc0.__error && !rc.__error && rc.doc<=rc.vw && rc.bodySW<=rc.bodyCW+1, rc);
  chk('OF11c. 390 px: cada producto es una tarjeta (sin encabezado de tabla, con el nombre de cada dato) y nada se sale', rc.thead==='none' && /Hay/.test(String(rc.lab)) && rc.fila>0 && rc.fila<=rc.vw && rc.fuera.length===0, rc);
  chk('OF11d. ✕ Cerrar cierra', rc.cerro==='none', rc.cerro);
  await C.ctx.close();

  chk('sin errores en la página', !errores.length, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
