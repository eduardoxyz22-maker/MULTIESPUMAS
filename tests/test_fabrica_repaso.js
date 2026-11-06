/* 🏭 «LO QUE NOS DEBE LA FÁBRICA» SE PONE AL DÍA SOLO (05/11/2026, plan del jueves, item 104, §4ok-104).
   El 02/11 había 26 «Ya pedí» abiertos, todos atrasados, y mucho ya había entrado entre el 24 y el 29/10: `fdLoteCerrar` solo mira el lote
   que se sube en ese momento. Ahora, con el primer Excel del día, se repasa la hoja «Historial stock» desde el pedido abierto más viejo.

   ⚠️ LO QUE ESTE TEST CUIDA:
   R1  Día por día, lo más viejo primero: lo que entró entre dos Excel (la SUMA de los almacenes + lo ENTREGADO ✅ entre los dos cortes) cierra
       lo pedido antes de ese corte, del más viejo al más nuevo. Lo que no tiene ✅ no se da por salido (no se cierra de más).
   R2  Un pase de PTF a Banzer no es una entrada (sin traspasos): ese «Ya pedí» sigue abierto.
   R3  Un día sin los mismos almacenes se saltea: el tramo se mide contra el día anterior que sí los tiene (no se pierde lo del medio).
   R4  Lo que ya se sabe que llegó en ese tiempo («✓ Llegó» a mano) no cierra OTRO pedido.
   R5  Lo pedido DESPUÉS del corte de ese día no se cierra con ese día.
   R6  Cada día mirado queda en `STOCK.fdH`; correrlo de nuevo (también sin las marcas) no cierra nada más; las recepciones son `xf:` con
       `se:1` (ya en el conteo) y el día de la entrada.
   R7  `fdH` en la celda: se lee, se junta (unión) y se poda a STOCK_DEBE_TOPE_DIAS.
   R8  Una vez por día en cada aparato; con el servidor de antes de la hoja, nada. No es el automático (STOCK_AUTO_ACTIVO sigue false).
   R9  Lo que no es un producto de la lista ni de ningún Excel («ARMAZONES») va aparte: «❓ ¿Qué es esto?», sin reclamo a la fábrica.
   R9b (06/11, dueño: «si son productos… los +2 cm son adiciones de altura») «+2CM», una medida especial de la lista y SOMIER ESPECIAL
       TROPICAL SÍ son productos; ARMAZONES y los textos sueltos siguen en «¿Qué es esto?».
   Reloj CLAVADO (jueves 05/11/2026 10:00 de Bolivia). Red cortada, servidor simulado, datos inventados (el repo es público).
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_fabrica_repaso.js   ·  `PEDIDOS=<archivo>` corre contra otra página. */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
/* El mismo arranque que `test_stock_rev2_u2_turno.js` (servidor simulado, `_stock`, `_ped`, `_lin`, `_cargar`). */
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_u2_turno.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{ width:1300, height:1000 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage(); page.setDefaultTimeout(30000);
  const errores=[]; page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await page.clock.setFixedTime(new Date('2026-11-05T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,400) }; } };

  await ev(async () => {
    try{ localStorage.removeItem('me_fd_repaso'); }catch(e){}
    window._llam=[];
    apiPost=function(b){
      window._llam.push(b && b.action);
      if(b && b.action==='histStockLeer') return Promise.resolve({ ok:true, version:SERVER_VER, dias:JSON.parse(JSON.stringify(window.__DIAS||[])) });
      return Promise.resolve({ ok:true, version:SERVER_VER });
    };
    /* La foto de lo pedido justo después del repaso y ANTES de guardar (al guardar, lo cerrado hace días se poda: `stockPodar`). */
    window.__foto=null; var _g=guardarStock; guardarStock=function(){ if(!window.__foto) window.__foto=JSON.parse(JSON.stringify(STOCK.p||[])); return _g.apply(this, arguments); };
    var K=_K, K2=_K2, K3=_K3, ARM='CAJA CARTON|140X190';   // (06/11) antes ARMAZONES: desde §4ok-104c no aparece en ningún lado
    window.__ARM=ARM;
    var ya=function(id, k, u, f, esp, extra){ return Object.assign({ id:id, k:k, u:u, fab:'', f:f, arr:f, esp:esp, r:'', ya:1, t:_ts(f,'10:00:00') }, extra||{}); };
    var st=_stock(function(s){
      s.p=[ ya('y1', K, 14, '2026-10-22', '2026-10-26'), ya('y3', K2, 4, '2026-10-23', '2026-10-27'), ya('y4', ARM, 3, '2026-10-24', '2026-10-28'),
            ya('y5', K3, 6, '2026-10-24', '2026-10-28'), ya('y7', K, 4, '2026-10-29', '2026-11-01'), ya('y9', K2, 2, '2026-10-31', '2026-11-03'),
            ya('y6', K, 3, '2026-11-02', '2026-11-05', { t:_ts('2026-11-02','08:00:00') }),
            ya('y2', K, 5, '2026-11-01', '2026-11-04', { total:5, r:'2026-11-03', recs:[{ id:'xm:prueba', u:5, f:'2026-11-03', ts:_ts('2026-11-03','15:00:00'), se:1, ev:{} }] }) ];
      s.fdH=['2026-11-04'];   // el lote del 04/11 ya lo miró (la página nueva lo marca)
    }, { f:'2026-11-04', hora:'18:00:00', inc:true });
    var BZ=_BZ, IM=_IM, dia=function(f, ptf, bz, im, sin){ var d={ PTF:{ f:f, h:'18:00:00', u:ptf, s0:true, it:'ampm' } }; if(!sin){ d[BZ]={ f:f, h:'18:00:00', u:bz||{}, s0:true, it:'ampm' }; d[IM]={ f:f, h:'18:00:00', u:im||{}, s0:true, it:'ampm' }; } return { fecha:f, datos:d }; };
    var o=function(a){ var r={}; for(var i=0;i<a.length;i+=2) r[a[i]]=a[i+1]; return r; };
    /* La hoja (hoy es 05/11; lo cerrado se poda a los 3 días: lo del 02/11 en adelante sigue en la celda):
         10-23  K 4 · K3 5                                    (la base)
         10-24  K 6   y se ENTREGÓ (✅) 2 de K → entraron 4 · otra entrega de 1 SIN ✅ no cuenta
         10-25  solo PTF: no se compara
         10-26  K 16 · K3 2 en PTF y 3 en Banzer (un pase) · K2 4 en Moreno → K +10 · K2 +4 · K3 nada
         10-27, 10-28  igual
         10-30  K 20 (+4): ⚠️ desde el 30/10 el lote del día pudo cerrarlo y lo cerrado ya se podó → NO se repasa (tampoco 10-31 y 11-01)
         10-31, 11-01  igual
         11-02  K2 6 en Moreno (+2) → cierra el «Ya pedí 2» del 31/10
         11-03  K 25 (+5), pero ese día se anotó «✓ Llegó» de 5: no cierra otro
         11-04  K 30 (+5), pero ese día ya lo miró el lote del día (marcado)
         11-05  (hoy) no se repasa: lo hace el lote del día */
    var B3=o([K3,3]), I4=o([K2,4]), I6=o([K2,6]);
    window.__DIAS=[ dia('2026-10-23', o([K,4,K3,5])), dia('2026-10-24', o([K,6,K3,5])), dia('2026-10-25', o([K,99]), null, null, true),
      dia('2026-10-26', o([K,16,K3,2]), B3, I4), dia('2026-10-27', o([K,16,K3,2]), B3, I4), dia('2026-10-28', o([K,16,K3,2]), B3, I4),
      dia('2026-10-30', o([K,20,K3,2]), B3, I4), dia('2026-10-31', o([K,20,K3,2]), B3, I4), dia('2026-11-01', o([K,20,K3,2]), B3, I4),
      dia('2026-11-02', o([K,20,K3,2]), B3, I6), dia('2026-11-03', o([K,25,K3,2]), B3, I6), dia('2026-11-04', o([K,30,K3,2]), B3, I6),
      dia('2026-11-05', o([K,40,K3,2]), B3, I6) ];
    var ped=[ _ped('d001', '2026-10-24', 'AM', [_lin(_T, 2, { eF:'2026-10-24' })], { entregado:true }),
              _ped('d002', '2026-10-24', 'PM', [_lin(_T, 1)]) ];
    await _cargar(ped, st);
    SERVER_VER='2026-11-02-a';
  });

  console.log('\n── R8. Una vez por día; con el servidor de antes, nada ──');
  let r = await ev(async () => {
    var v=SERVER_VER; SERVER_VER='2026-10-06-a'; var x0=fdRepasoQuizas(); SERVER_VER=v;
    var n0=window._llam.filter(function(a){ return a==='histStockLeer'; }).length;
    return { x0:x0, n0:n0, auto:STOCK_AUTO_ACTIVO, ap:JSON.stringify(STOCK.ap||{}) };
  });
  chk('con un servidor anterior a la hoja (2026-10-09-a) no lee nada', r.x0===null && r.n0===0, r);
  chk('el «En producción» automático sigue apagado (esto no es el automático)', r.auto===false, r);
  const ap0 = r.ap;

  r = await ev(async () => {
    var res=await fdRepasoQuizas();
    var P=window.__foto||STOCK.p||[], q=function(id){ return P.filter(function(x){ return x && x.id===id; })[0]||{}; };
    var lleg=function(id){ var n=0; ((q(id).recs)||[]).forEach(function(x){ if(x && !x.an) n+=Number(x.u)||0; }); return n; };
    var recs1=(q('y1').recs||[]).map(function(x){ return { id:String(x.id).slice(0,3), u:x.u, f:x.f, se:x.se, ev:!!x.ev }; });
    return { n:window._llam.filter(function(a){ return a==='histStockLeer'; }).length, cerr:(res&&res.cerrados||[]).map(function(c){ return c.dia+':'+c.k.split('|')[0]+':'+c.u; }),
      marc:(res&&res.marcados)||[], salt:(res&&res.saltados||[]).map(function(s){ return s.f; }), fdH:(STOCK.fdH||[]).slice(),
      y1:{ u:q('y1').u, r:q('y1').r, lleg:lleg('y1'), recs:recs1 }, y3:{ r:q('y3').r, lleg:lleg('y3') }, y5:{ r:q('y5').r, u:q('y5').u }, y6:{ r:q('y6').r, u:q('y6').u },
      y7:{ r:q('y7').r, u:q('y7').u }, y9:{ r:q('y9').r, lleg:lleg('y9') }, foto:!!window.__foto, toast:(document.getElementById('toast')||{}).textContent||'' };
  });
  chk('R8 · el primer Excel del día lee la hoja una vez', r.n===1, r.n);
  chk('R1 · K: el 24/10 entraron 4 (6−4 + 2 entregados con ✅; la entrega sin ✅ no cuenta) y el 26/10 otros 10 → el «Ya pedí 14» del 22/10 cierra entero',
      r.cerr.indexOf('2026-10-24:TITANIO ICE:4')>=0 && r.cerr.indexOf('2026-10-26:TITANIO ICE:10')>=0 && !!r.y1.r && r.y1.lleg===14, r);
  chk('R1 · K2: lo que entró en Moreno el 26/10 cierra el «Ya pedí 4» del 23/10', !!r.y3.r && r.y3.lleg===4, r.y3);
  chk('R2 · K3: 2 en PTF y 3 en Banzer (antes 5 en PTF) es un pase: el «Ya pedí» sigue abierto con 6', !r.y5.r && r.y5.u===6, r.y5);
  chk('R3 · el 25/10 (solo PTF) no se compara: el 26/10 se mide contra el 24/10 y no se pierde lo del medio', r.cerr.indexOf('2026-10-26:TITANIO ICE:10')>=0 && r.fdH.indexOf('2026-10-25')<0, r.fdH);
  chk('R5 · lo pedido el 29/10 no se cierra con lo de antes (ni con el 30/10, que no se repasa)', !r.y7.r && r.y7.u===4, r.y7);
  chk('⚠️ R10 · del 30/10 al 01/11 (lo pudo cerrar el lote del día y lo cerrado ya se podó) no se repasa ni se marca',
      ['2026-10-30','2026-10-31','2026-11-01'].every(function(f){ return r.fdH.indexOf(f)<0 && r.salt.indexOf(f)>=0; }), { fdH:r.fdH, salt:r.salt });
  chk('R1 · lo reciente sí: el 02/11 entraron 2 en Moreno → cierra el «Ya pedí 2» del 31/10', r.cerr.indexOf('2026-11-02:SOMIER TITANIO ICE:2')>=0 && !!r.y9.r && r.y9.lleg===2, r.y9);
  chk('R4 · las 5 que entraron el 03/11 ya tenían su «✓ Llegó»: el «Ya pedí 3» del 02/11 sigue abierto', !r.y6.r && r.y6.u===3, r.y6);
  chk('R11 · el 04/11 ya lo miró el lote del día (marcado): no se vuelve a mirar', !r.cerr.some(function(c){ return /^2026-11-04/.test(c); }), r.cerr);
  chk('R6 · cada día mirado queda anotado (24, 26, 27, 28/10, 02 y 03/11; hoy no)', ['2026-10-24','2026-10-26','2026-10-27','2026-10-28','2026-11-02','2026-11-03','2026-11-04'].every(function(f){ return r.fdH.indexOf(f)>=0; }) && r.fdH.indexOf('2026-11-05')<0, r.fdH);
  chk('R6 · las recepciones son «xf:», ya en el conteo (se:1), con el día de la entrada', r.y1.recs.length===2 && r.y1.recs.every(function(x){ return x.id==='xf:' && x.se===1 && x.ev; }) && r.y1.recs.map(function(x){ return x.f; }).sort().join(',')==='2026-10-24,2026-10-26', r.y1.recs);
  chk('…se guarda el stock y se avisa qué cerró', r.foto && /Repasé los días que no se habían mirado/.test(r.toast), r.toast);

  r = await ev(async () => {
    var n0=window._llam.length, x=fdRepasoQuizas(); var n1=window._llam.length;
    try{ localStorage.removeItem('me_fd_repaso'); }catch(e){}
    var antes=JSON.stringify(STOCK.p);
    var r1=await fdRepasoQuizas(), igual1=JSON.stringify(STOCK.p)===antes;
    /* lo reciente, sin las marcas de esos días: lo que ya cerró está a la vista y se resta (no cierra dos veces) */
    try{ localStorage.removeItem('me_fd_repaso'); }catch(e){}
    STOCK.fdH=(STOCK.fdH||[]).filter(function(f){ return f<'2026-11-02' || f==='2026-11-04'; });   // (la del 04/11 es del lote del día: queda)
    var r2=await fdRepasoQuizas();
    return { mismoDia:x===null && n1===n0, cerr1:(r1&&r1.cerrados||[]).length, igual1:igual1, cerr2:(r2&&r2.cerrados||[]).length, marc2:(r2&&r2.marcados)||[],
      ap:JSON.stringify(STOCK.ap||{}) };
  });
  chk('R8 · el mismo día, en el mismo aparato, no vuelve a leer', r.mismoDia, r);
  chk('R6 · otra vez (otro día, con las marcas): no cierra nada más', r.cerr1===0 && r.igual1, r);
  chk('R6 · lo reciente sin sus marcas: lo ya cerrado se resta y no cierra dos veces', r.cerr2===0 && r.marc2.indexOf('2026-11-02')>=0, r);
  chk('R8 · no anotó nada como «En producción» (STOCK.ap igual)', r.ap===ap0, r.ap);

  r = await ev(() => {
    /* el lote del día marca su día (con los tres almacenes) */
    var hoy=todayStr();
    FD_LOTE={ dia:hoy, roles:{ log:1, otro:1 }, dif:{}, conocido:{}, sinCam:{}, det:{}, cortes:['PTF@09:00:00@x'], ats:[stockDetAt(hoy,'09:00:00')], n:3, sinBase:0, mismo:false, desde:0 };
    fdLoteCerrar(); var con=(STOCK.fdH||[]).indexOf(hoy)>=0;
    STOCK.fdH=(STOCK.fdH||[]).filter(function(f){ return f!==hoy; });
    FD_LOTE={ dia:hoy, roles:{ log:1 }, dif:{}, conocido:{}, sinCam:{}, det:{}, cortes:['PTF@09:00:00@x'], ats:[stockDetAt(hoy,'09:00:00')], n:1, sinBase:0, mismo:false, desde:0 };
    fdLoteCerrar(); var solo=(STOCK.fdH||[]).indexOf(hoy)>=0;
    return { con:con, solo:solo };
  });
  chk('el lote del día con los tres almacenes marca su día (el repaso no lo vuelve a mirar); con un almacén solo y sin cerrar nada, no', r.con===true && r.solo===false, r);

  console.log('\n── R7. fdH en la celda: se lee, se junta y se poda ──');
  r = await ev(() => {
    var row=filaStock(), o=JSON.parse(row.observaciones);
    var leido=leerStock({ id:'__stock__', observaciones:row.observaciones });
    var b=JSON.parse(JSON.stringify(leido)), m=JSON.parse(JSON.stringify(leido)), s=JSON.parse(JSON.stringify(leido));
    m.fdH=['2026-10-24','2026-10-30']; s.fdH=['2026-10-24','2026-10-31']; delete b.fdH;
    var J=stockFusionar(b, m, s);
    var P=JSON.parse(JSON.stringify(leido)); P.fdH=['2026-08-01','2026-10-24','2026-10-24']; stockPodar(P, '2026-11-05');
    return { enCelda:Array.isArray(o.fdH) && o.fdH.indexOf('2026-10-26')>=0, leido:(leido.fdH||[]).indexOf('2026-10-28')>=0, junta:J.fdH, poda:P.fdH };
  });
  chk('va en la celda (filaStock) y se lee (leerStock)', r.enCelda && r.leido, r);
  chk('la junta de dos aparatos se queda con los días de los dos', Array.isArray(r.junta) && r.junta.indexOf('2026-10-30')>=0 && r.junta.indexOf('2026-10-31')>=0 && r.junta.indexOf('2026-10-24')>=0, r.junta);
  chk('la poda saca lo de más de STOCK_DEBE_TOPE_DIAS días y lo repetido', JSON.stringify(r.poda)==='["2026-10-24"]', r.poda);

  console.log('\n── R9. «❓ ¿Qué es esto?» ──');
  r = await ev(() => {
    var L=fdLista(), ult=L[L.length-1]||{}, html=fdHtml('stock'), box=document.createElement('div'); box.innerHTML=html;
    var secs=[].slice.call(box.querySelectorAll('.fd-fab')), que=secs.filter(function(s){ return /¿Qué es esto\?/.test(s.textContent); })[0];
    var mor=L.filter(function(g){ return g.fab==='MORENO'; })[0];
    return { fabs:L.map(function(g){ return g.fab; }), ult:ult.fab, arm:(ult.prods||[]).map(function(p){ return p.k; }), es:fdEsProducto(__ARM), esK:fdEsProducto(_K),
      queTxt:que ? (que.textContent||'') : '', copiar:que ? !!que.querySelector('.fd-copiar') : null, enMoreno:!!(mor && mor.prods.some(function(p){ return p.k===__ARM; })),
      reclamo:fdReclamoTexto('MORENO')||'', ley:/repasa los días que no se miraron/.test(html) };
  });
  chk('«CAJA CARTON» no es un producto de la lista ni de ningún Excel; TITANIO ICE sí', r.es===false && r.esK===true, r);
  chk('va en su propio grupo, al final', r.ult==='?' && r.arm.indexOf('CAJA CARTON|140X190')>=0 && !r.enMoreno, { fabs:r.fabs, arm:r.arm, enMoreno:r.enMoreno });
  chk('…«❓ ¿Qué es esto?», que dice qué hacer y SIN «Copiar el reclamo»', /¿Qué es esto\?/.test(r.queTxt) && /no se le reclama a ninguna fábrica/.test(r.queTxt) && r.copiar===false, r.queTxt.slice(0,200));
  chk('…y no entra en el reclamo a Moreno; la lista dice que se repasa sola', !/CAJA CARTON/.test(r.reclamo) && r.ley, r.reclamo.slice(0,200));

  console.log('\n── R9b. Lo que el dueño confirmó que SÍ son productos (06/11) ──');
  r = await ev(() => {
    var es=function(k){ return fdEsProducto(k); };
    var ks={ alto:'SUENA ESSENTIAL +2CM|105X190', alto2:'SUENA CONFORT PLUS +2CM|140X190', alto3:'TITANIO ICE + 3 CM|140X190',
      esp:'ORO ORTOPEDICO|160X198', trop:'SOMIER ESPECIAL TROPICAL|160X190', arm:'ARMAZONES|140X190', llevar:'LLEVAR LO QUE NECESITEN CHARCAS|',
      inventado:'CAJA DE CARTON|', cm:'ESPUMA 2CM|' };
    var out={}; Object.keys(ks).forEach(function(n){ out[n]=es(ks[n]); });
    /* Un «Ya pedí» de un +2CM de Sueña va al bloque de Multiespumas, no a «¿Qué es esto?». */
    var antes=STOCK.p; STOCK.p=antes.concat([{ id:'y+2', k:ks.alto, u:2, fab:'MULTI', f:'2026-11-03', arr:'2026-11-03', esp:'2026-11-05', r:'', ya:1, t:Date.now() }]);
    try{ stockOlvidarIndice(); }catch(e){}
    var L=fdLista(), g=function(f){ return L.filter(function(x){ return x.fab===f; })[0]; };
    out.enMulti=!!(g('MULTI') && g('MULTI').prods.some(function(p){ return p.k===ks.alto; }));
    out.enQue=!!(g('?') && g('?').prods.some(function(p){ return p.k===ks.alto; }));
    STOCK.p=antes; try{ stockOlvidarIndice(); }catch(e){}
    return out;
  });
  chk('«+2CM» es un colchón más alto: es un producto (también «+ 3 CM»)', r.alto && r.alto2 && r.alto3, r);
  chk('una medida especial de un producto de la lista (ORO ORTOPEDICO 160X198) es un producto', r.esp===true, r);
  chk('SOMIER ESPECIAL TROPICAL es un producto', r.trop===true, r);
  chk('ARMAZONES, «LLEVAR LO QUE NECESITEN» y un texto inventado siguen sin serlo («2CM» sin «+», tampoco)', !r.arm && !r.llevar && !r.inventado && !r.cm, r);
  chk('un «Ya pedí» de un +2CM de Sueña va con Multiespumas, no en «¿Qué es esto?»', r.enMulti && !r.enQue, r);

  console.log('\n── R9c. Los ARMAZONES, en ningún lado (06/11, dueño: «dejalo fuera de todos lados, no nos interesa contabilizarlos») ──');
  r = await ev(() => {
    var antes=STOCK.p, cu=STOCK.c && STOCK.c.u, cuAntes=cu ? JSON.parse(JSON.stringify(cu)) : null;
    STOCK.p=antes.concat([{ id:'y-arm', k:'ARMAZONES|140X190', u:9, fab:'', f:'2026-11-03', arr:'2026-11-03', esp:'2026-11-05', r:'', ya:1, t:Date.now() }]);
    if(cu) cu['ARMAZON|140X190']=30;
    try{ stockOlvidarIndice(); }catch(e){}
    var L=fdLista(), todas=[]; L.forEach(function(g){ g.prods.forEach(function(p){ todas.push(p.k); }); });
    var d=stockData(), filas=(d.lista||[]).map(function(o){ return o.k; });
    var out={ fd:todas.filter(function(k){ return /ARMAZ/.test(k); }), stock:filas.filter(function(k){ return /ARMAZ/.test(k); }),
      tienda:esProdDeTienda({ desc:'ARMAZONES 2.0', medida:'140x190' }), tienda2:esProdDeTienda({ desc:'armazón 1.5', medida:'105x190' }),
      somier:esProdDeTienda({ desc:'SOMIER TROPICAL CON ARMAZON', medida:'140x190' }), reclamo:/ARMAZ/.test(fdReclamoTexto('MORENO')||'') };
    STOCK.p=antes; if(cu){ Object.keys(cu).forEach(function(k){ delete cu[k]; }); Object.assign(cu, cuAntes); } try{ stockOlvidarIndice(); }catch(e){}
    return out;
  });
  chk('un renglón ARMAZONES / armazón no cuenta en el stock (la misma puerta que protectores y servicios)', r.tienda && r.tienda2, r);
  chk('…pero un «SOMIER … CON ARMAZON» sigue siendo un somier', r.somier===false, r);
  chk('ni el «Ya pedí» ni el Excel de ARMAZONES aparecen en «Lo que nos debe la fábrica», en el reclamo ni en la tabla del stock',
    !r.fd.length && !r.stock.length && !r.reclamo, r);

  chk('sin errores de la página', !errores.length, errores.slice(0, 3));
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
