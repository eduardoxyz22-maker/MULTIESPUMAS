/* 🔎 VERIFICACIÓN FINAL DE STOCK — «Cuenta: cuánto, vistas y anticipar» (19/10, §4ls, verificación final de `18fb452`).
   Los hallazgos confirmados del grupo, cada uno con su comprobación. Ninguno cambia lo que se pide (7 días, 15 días y el mes dan lo
   mismo): son lo que se MUESTRA, para que ninguna vista contradiga al Plan.

   FC1  VI-1   «🧾 Ver pedidos» con la casilla de la decisión 2 («ya trae la carga de la mañana»): lo de HOY de ese turno que salió con el
               camión (sin ✅) va en su grupo «🚚 Ya salió hoy con el camión… · no consume depósito»; «Vendido sin entregar» + los atrasados
               = «Comprometido» (`o.comp`), también con una línea partida PTF + Banzer donde solo un Excel trae la mañana.
   FC2  VI-5   «📈 Su historia»: la hoja «Historial stock» guarda qué turnos traía cada Excel (`it`, lo que contestó logística) y el «+N
               entraron» lo usa; sin ese dato (ni en `STOCK.h`) se adivina por la hora pero se marca «≈». La clave vieja de un renglón de la
               hoja sigue a la de la lista (`stockMigrar` → `sfHistClave`): «hoy: N (Excel)» = lo que suma el Plan.
   FC3  VI-8/VI-10  La tabla grande dice lo mismo que el Plan: con el plan pidiendo o con rotación en 30 días, «📦 Sin rotación en 15 días»
               (nunca «📦 Pedido único … no se repone»); sin plan y con rotación en 30 días, «por ahora alcanza para el mes».
   FC4  VI-9   «💤 Sobra» medido con el ritmo de 15 días: sin el reloj «al ritmo del mes» (sin nada entregado en 15 días el reloj sigue, VV6)
               y «salió en N entregas DEL EQUIPO (+M de Eduardo, que no cuentan)».
   FC5  VI-2   El termómetro: traer de Moreno = el día que lo recoge logística (`saldoDiaRecoge`, el del cuadrito); pedir a fábrica =
               `stockEntregaDesde` (la de la barra). Nunca un domingo.
   FC6  VI-3   «📋 Copiar el pedido para fábrica» y «Cómo se calcula» dicen el MISMO «se corta» que el Plan (`stockCorteVer`).
   FC7  VI-4   «📈 Su historia»: la línea roja dice de dónde sale («hace falta N = M vendidos + tener X») y «tener» es el número del Plan.
   FC8  VI-6   «⚠️ Revisá el saldo» sin nada que pedir: «Cómo se calcula» no dice «El panel propone fabricar 0».
   FC9  VI-11  Lo que rota con el corte de 15 días dentro de 7 días no dice «✅ Alcanza esta semana».
   FC10 VI-7/CU-1  «Qué producir», el mes: la celda cierra (con «producir» 0, «queda» nunca menor que «necesita»), y lo que falta ANTES
               del 1° va aparte: mes = antes + 1ª quincena + 2ª quincena, sin tocar ningún total; la copia para la fábrica lo dice.
   FC11 CU-5   «Cómo se calcula»: si todo sale de Moreno, no «el resto se fabrica».

   Reloj CLAVADO (cada parte dice a qué hora). Red cortada, datos sintéticos (el repo es público).
   Se corre:  node tests/test_stock_final_cuenta.js
   Dientes:   PEDIDOS=/ruta/a/pedidos_a767b15.html node tests/test_stock_final_cuenta.js   (19/10: 33 bien aquí; 23 rojas contra a767b15 = 18fb452) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,700)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
/* El mismo arranque que `test_stock_rev2_textos.js` (datos sintéticos «CLIENTE n», red cortada). */
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_textos.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));
const corre = async (page, fn, arg) => page.evaluate(async ([src, arg]) => { try{ return await (0,eval)('('+src+')')(arg); }catch(e){ return { __error:String(e && e.stack || e) }; } }, [fn.toString(), arg]);
const ERRS=[];
async function abrir(browser, reloj){
  const ctx = await browser.newContext({ viewport:{ width:1300, height:900 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage(); page.setDefaultTimeout(30000);
  page.on('pageerror', e => ERRS.push(e.message)); page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date(reloj));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');
  page._ctx=ctx;
  return page;
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  let page, r;

  // ═══ FC1. VI-1 — viernes 16/10 10:10, Excel de las 10:05 con «ya trae la carga de la mañana» en PTF ═══
  console.log('\n── FC1. «🧾 Ver pedidos» con la casilla por turno (VI-1) ──');
  page = await abrir(browser, '2026-10-16T10:10:00-04:00');
  r = await corre(page, async () => {
    var K=_k('CH1201','TITANIO ICE','160x190');
    var st=_stock(function(st){ st.c.u[K]=6; st.c.incT='am'; st.g[_BZ].u[K]=3; });   // Banzer: su Excel NO trae la mañana
    var P=[ _ped({ id:'hoyAM', oc:'10-201', fecha:todayStr(), turno:'AM', ts:_ts(todayStr(),'08:00:00'), productos:[_lin('CH1201','TITANIO ICE','160x190',2)] }),
            _ped({ id:'hoyAM2', oc:'10-202', fecha:todayStr(), turno:'AM', ts:_ts(todayStr(),'08:05:00'), productos:[_lin('CH1201','TITANIO ICE','160x190',2,{ chk:'ok', chkDe:'', chkDes:[{ de:'', u:1 }, { de:_BZ, u:1 }] })] }),
            _ped({ id:'hoyPM', oc:'10-203', fecha:todayStr(), turno:'PM', ts:_ts(todayStr(),'08:10:00'), productos:[_lin('CH1201','TITANIO ICE','160x190',1)] }),
            _ped({ id:'manana', oc:'10-204', fecha:_d(1), turno:'AM', ts:_ts(_d(-1)), productos:[_lin('CH1201','TITANIO ICE','160x190',1)] }) ];
    await _cargar(P, st);
    var o=_fila(K), G=stockPedidosDetalle(K);
    var suma=function(l){ return (l||[]).reduce(function(n,x){ return n+x.u; },0); };
    var html=''; var _om=openModal; openModal=function(h){ html=h; }; try{ abrirStockPedidos(K); } finally { openModal=_om; }
    var dv=document.createElement('div'); dv.innerHTML=html; var t=dv.textContent.replace(/\s+/g,' ');
    return { comp:o.comp, pend:suma(G.pendientes), atr:suma(G.atrasados), salio:suma(G.salioHoy), salioIds:(G.salioHoy||[]).map(function(x){ return x.p.id; }).sort(),
      pendIds:G.pendientes.map(function(x){ return x.p.id+':'+x.u; }).sort(), tarjeta:(t.match(/Comprometido\s*(\d+)/)||[])[1],
      grupo:(t.match(/Vendido sin entregar · consume depósito · (\d+) unidades/)||[])[1], salioTit:(t.match(/🚚 Ya salió hoy con el camión[^·]*· no consume depósito · \d+ unidades/)||[''])[0] };
  });
  chk('control: con «ya trae la mañana» en PTF, la mañana de hoy de PTF no se reserva (comp = 1 de Banzer + 1 de la tarde + 1 de mañana = 3)', r && r.comp===3, r);
  chk('FC1 «Vendido sin entregar» + atrasados = «Comprometido» (3), en la cuenta Y en la ventana', r && r.pend+r.atr===r.comp && r.grupo==='3' && r.tarjeta==='3', r);
  chk('FC1 lo que salió con el camión va en «🚚 Ya salió hoy con el camión (el Excel de las 10:05 ya no lo tiene) · no consume depósito» (2 + la parte de PTF de la línea partida)',
    r && r.salio===3 && /las 10:05/.test(r.salioTit) && r.salioIds.join(',')==='hoyAM,hoyAM2' && r.pendIds.indexOf('hoyAM2:1')>=0, r);
  await page._ctx.close();

  // ═══ FC2. VI-5 — viernes 16/10 12:00, la historia con dos Excel del historial ═══
  console.log('\n── FC2. «📈 Su historia»: turnos guardados en la hoja y clave de ahora (VI-5) ──');
  page = await abrir(browser, '2026-10-16T12:00:00-04:00');
  r = await corre(page, async () => {
    var K=_k('CH1201','TITANIO ICE','160x190');
    // Un código de la lista que IM guardó con otro nombre (el «150X190» con el código del 160): `stockMigrar` lo lleva al 160.
    var st=_stock(function(st){ st.c.u[K]=6; st.c.incT='am'; st.g[_IM].u['TITANIO ICE|150X190']=3; st.g[_IM].cod={ CH1201:'TITANIO ICE|150X190' }; });
    var f1=_d(-3), f2=_d(-2);   // mar 13/10 y mié 14/10
    var P=[ _ped({ fecha:f1, turno:'AM', entregado:true, productos:[_lin('CH1201','TITANIO ICE','160x190',2)] }),
            _ped({ fecha:f2, turno:'AM', entregado:true, productos:[_lin('CH1201','TITANIO ICE','160x190',1)] }) ];
    await _cargar(P, st);
    var o=_fila(K), desde=stockSumarDias(todayStr(),-29), hoy=todayStr();
    var dia=function(f, u, it){ var x={ fecha:f, datos:{ PTF:{ f:f, h:'10:05', u:{}, s0:true } } }; x.datos.PTF.u[K]=u; if(it!=null) x.datos.PTF.it=it; return x; };
    var leer=function(svg){ var dv=document.createElement('div'); dv.innerHTML=svg; return [].map.call(dv.querySelectorAll('title'), function(t){ return t.textContent; }).filter(function(t){ return /entraron/.test(t); }); };
    // Con lo que contestó logística guardado en la hoja: el 13/10 «NO trae la mañana», el 14/10 «sí».
    var con=leer(sfHistSvg(o, [dia(f1,5,'no'), dia(f2,6,'am')], desde, hoy));
    // Sin ese dato (renglones de antes del 19/10, ya fuera de STOCK.h): se adivina por la hora, marcado «≈».
    var sin=leer(sfHistSvg(o, [dia(f1,5,null), dia(f2,6,null)], desde, hoy));
    // Hoy en la hoja con la clave vieja de IM: «hoy: 6 + 3 (Excel)» = lo que suma el Plan (PTF 6, Moreno 3).
    var x=dia(hoy,6,'am'); x.datos[_IM]={ f:hoy, h:'10:05', u:{ 'TITANIO ICE|150X190':3 }, s0:true };
    var dv=document.createElement('div'); dv.innerHTML=sfHistSvg(o, [x], desde, hoy);
    var hoyTit=[].map.call(dv.querySelectorAll('title'), function(t){ return t.textContent; }).filter(function(t){ return /^hoy:/.test(t); })[0]||'';
    var foto=histStockFoto(hoy);
    return { con:con, sin:sin, hoyTit:hoyTit, plan:(Math.max(0,o.deposito||0)+(o.enSale||0)+(o.enOtros||0)), fotoIt:foto.PTF && foto.PTF.it, fotoItIm:foto[_IM] && foto[_IM].it };
  });
  chk('FC2 con los turnos guardados en la hoja: «entraron 4» (6 − 5 + 2 de la mañana del 13/10 que su Excel todavía tenía + 1 del 14/10), sin «≈»',
    r && r.con && r.con.length===1 && /: entraron 4$/.test(r.con[0]), r);
  chk('FC2 sin el dato (ni en la hoja ni en STOCK.h): se adivina por la hora y se marca «≈» (no se presenta como medido)',
    r && r.sin && r.sin.length===1 && /entraron ≈\d/.test(r.sin[0]) && /estimado/.test(r.sin[0]), r);
  chk('FC2 la foto que se manda a la hoja lleva lo que contestó logística («am» en PTF, «no» en IM)', r && r.fotoIt==='am' && r.fotoItIm==='no', r);
  chk('FC2 «hoy (Excel)» suma el renglón de IM guardado con la clave vieja (el Plan suma 9)', r && r.plan===9 && /^hoy: 9 /.test(r.hoyTit), r);
  await page._ctx.close();

  // ═══ FC3/FC4. VI-8, VI-10, VI-9 — la tabla grande y la acción, viernes 16/10 12:00 ═══
  console.log('\n── FC3/FC4. La tabla dice lo mismo que el Plan (VI-8, VI-10, VI-9) ──');
  page = await abrir(browser, '2026-10-16T12:00:00-04:00');
  r = await corre(page, async () => {
    var K=_k('CH1201','TITANIO ICE','160x190');
    // Rota en 30 días (3 entregas) pero no en 15, con 0 en todos lados: el plan pide para el mes.
    var P=[-20,-22,-25].map(function(n){ return _ped({ fecha:_d(n), ts:_ts(_d(n)), entregado:true, productos:[_lin('CH1201','TITANIO ICE','160x190',2)] }); });
    await _cargar(P, _stock(function(st){ st.c.u[K]=0; }));
    abrirStock(); renderStock();
    var d=stockData(); stockProducir(d); var o=d.lista.filter(function(x){ return x.k===K; })[0];
    var fila=document.querySelector('#stock-body tr[data-stock-k="'+K+'"]');
    var out={ aviso:o.aviso, rotaMes:o.rotaMes, pide:stockPlanPideTxt(o), fila:_txt(fila) };
    // Rota en 30 días y el plan NO pide nada (lo mismo con 20 en PTF): ni «Pedido único» ni «no se repone».
    out.sinPlan=sfAccion(Object.assign({}, o, { aviso:'unico', rotaMes:true, _pQuin:0, _pMes:0 }));
    out.unicoDeVerdad=sfAccion(Object.assign({}, o, { aviso:'unico', rotaMes:false, _pQuin:0, _pMes:0 }));
    // 💤 Sobra con 2 entregas del equipo y 1 de Eduardo, y el ritmo del mes que daría 39 días.
    var sob={ aviso:'sobra', rota:false, vendidos:3, nVentas:3, nVentasRotacion:2, vendidosUnicos:1, vendidosRpt:0, vendidosPunt:0, dias:null, corte:null, porDiaMes:1/3, porDiaTodo:0.2, paraSalir:13, enOtros:0, enCamino:0, comp:0, compPor:{}, _pQuin:0, _pMes:0, pedidos:[] };
    out.relojSobra=sfReloj(Object.assign({}, o, sob)).txt;
    // Sin nada entregado en 15 días el ritmo del mes es el único que hay: sigue (VV6).
    out.relojSinEntregas=sfReloj(Object.assign({}, o, sob, { porDiaTodo:0 })).txt;
    out.filaSobra=_conFila(K, sob, function(){ renderStock(); return _txt(document.querySelector('#stock-body tr[data-stock-k="'+K+'"]')); });
    return out;
  });
  chk('control: no rota en 15 días, rota en 30 y el plan pide para el mes («📦 unico»)', r && r.aviso==='unico' && r.rotaMes===true && /el plan pide \d+ el mes que viene/.test(r.pide||''), r);
  chk('FC3 la tabla grande dice «📦 Sin rotación en 15 días · … el plan pide N», nunca «Pedido único … no se repone»',
    r && /📦 Sin rotación en 15 días/.test(r.fila) && /el plan pide \d+ el mes que viene/.test(r.fila) && !/Pedido único/.test(r.fila) && !/no se repone/.test(r.fila), r && r.fila);
  chk('FC3 (VI-10) rota en 30 días y el plan no pide: «📦 Sin rotación en 15 días · por ahora alcanza para el mes»', r && r.sinPlan==='📦 Sin rotación en 15 días · por ahora alcanza para el mes', r && r.sinPlan);
  chk('control: lo que no rota ni en 15 ni en 30 días sigue «📦 Pedido único: no se repone»', r && r.unicoDeVerdad==='📦 Pedido único: no se repone', r && r.unicoDeVerdad);
  chk('FC4 (VI-9) «💤 Sobra» medido con el ritmo de 15 días no muestra además el reloj «al ritmo del mes»', r && !/al ritmo del mes/.test(r.relojSobra||''), r && r.relojSobra);
  chk('control (VV6): sin nada entregado en 15 días el reloj «al ritmo del mes» sigue', r && /Se corta en ~\d+ días, al ritmo del mes/.test(r.relojSinEntregas||''), r && r.relojSinEntregas);
  chk('FC4 (VI-9) «salió en 2 entregas del equipo (+1 de Eduardo, que no cuenta)», nunca «en 3 entregas: no es rotación»',
    r && /salió en 2 entregas del equipo \(\+1 de Eduardo, que no cuenta\)/.test(r.filaSobra||'') && !/en 3 entregas/.test(r.filaSobra||''), r && r.filaSobra);
  await page._ctx.close();

  // ═══ FC5/FC6/FC7. VI-2, VI-3, VI-4 — sábado 17/10 12:00 ═══
  console.log('\n── FC5. El termómetro en un día con camión (VI-2) ──');
  page = await abrir(browser, '2026-10-17T12:00:00-04:00');
  r = await corre(page, async () => {
    var K=_k('CH1201','TITANIO ICE','160x190');
    await _cargar([ _ped({ fecha:_d(4), productos:[_lin('CH1201','TITANIO ICE','160x190',2)] }) ], _stock(function(st){ st.c.u[K]=0; st.g[_IM].u[K]=3; }));
    var o=_fila(K), L=stockTermoLlega(o), v=saldoVeredicto(K, 1, null, '', true, 'CH1201');
    abrirStock(); visPrefSet('masVistas', true); visPrefSet('termo', true); TERMO_TODOS=true; renderStock();
    var fila=[].filter.call(document.querySelectorAll('#stk-termo .tm-fila'), function(f){ return f.getAttribute('data-k')===K; })[0];
    return { aviso:o.aviso, llega:L && L.f, recoge:v.recoge, pie:fila ? _txt(fila.querySelector('.tm-pie')) : '(sin fila)' };
  });
  chk('control: «🚚 Traé de Moreno» el sábado', r && r.aviso==='traer', r);
  chk('FC5 traer de Moreno llega el día que logística lo recoge (lun 19/10, el mismo del cuadrito), nunca el dom 18/10',
    r && r.llega==='2026-10-19' && r.llega===r.recoge && !/dom 18\/10/.test(r.pie), r);
  await page._ctx.close();
  page = await abrir(browser, '2026-10-19T10:00:00-04:00');
  r = await corre(page, async () => {
    var K=_k('CH1201','TITANIO ICE','160x190');
    await _cargar([ _ped({ fecha:_d(2), productos:[_lin('CH1201','TITANIO ICE','160x190',1)] }) ], _stock(function(st){ st.c.u[K]=0; }));
    var o=Object.assign({}, _fila(K), { aviso:'pedir', lead:6, pedidos:[] });
    var L=stockTermoLlega(o);
    return { llega:L && L.f, barra:stockEntregaDesde(todayStr(), 6) };
  });
  chk('FC5 pedir a fábrica el lun 19/10 con 6 días de plazo: llega el lun 26/10 (= la barra), nunca el dom 25/10', r && r.llega==='2026-10-26' && r.llega===r.barra, r);
  await page._ctx.close();

  console.log('\n── FC6/FC7/FC9. La copia, «Cómo se calcula», «Su historia» y «Alcanza» (VI-3, VI-4, VI-11) ──');
  page = await abrir(browser, '2026-10-17T12:00:00-04:00');
  r = await corre(page, async () => {
    var K=_k('CH1201','TITANIO ICE','160x190');
    var P=[-3,-6,-9,-12].map(function(n){ return _ped({ fecha:_d(n), ts:_ts(_d(n)), entregado:true, productos:[_lin('CH1201','TITANIO ICE','160x190',3)] }); });
    P.push(_ped({ fecha:_d(4), productos:[_lin('CH1201','TITANIO ICE','160x190',1)] }));
    await _cargar(P, _stock(function(st){ st.c.u[K]=1; }));
    var o=_fila(K), d=stockData(); stockProducir(d);
    var copia=_copia(function(){ copiarStock(); });
    var lin=(copia.match(/TITANIO ICE · 160x190[^\n]*\n[^\n]*/)||[''])[0];
    var det=document.createElement('div'); det.innerHTML=stockSaldoDetalleHtml(o);
    abrirStock();
    var pl=[].filter.call(document.querySelectorAll('#stk-plan tr.pl-fila'), function(t){ return t.getAttribute('data-k')===K; })[0];
    var hist=''; var _om=openModal; openModal=function(h){ hist=h; }; try{ sfElegir(K); } finally { openModal=_om; }
    var hv=document.createElement('div'); hv.innerHTML=hist;
    var ley=_txt(hv.querySelector('.sf-ley'));
    // VI-11: lo que rota, sin aviso, con el corte de 15 días en 5 días.
    var alc=sfAccion(Object.assign({}, o, { aviso:'', dias:5, corte:'2026-10-22', _pQuin:2, _pMes:0 }));
    return { corte:o.corte, ver:stockCorteVer(o), plan:pl?_txt(pl.querySelector('.pl-corta')):'', tener:pl?_txt(pl.querySelector('.pl-tener b')):'', copia:lin,
      detalle:(det.textContent.match(/Primer faltante proyectado[^.]*\.[^.]*/)||[''])[0], ley:ley, objetivo:o.objetivo, comp:stockCompHorizonte(o), nec:Math.ceil(stockNecesario(o)-1e-9), alc:alc };
  });
  chk('control: el corte crudo es el dom 18/10 y el Plan dice el lun 19/10', r && r.corte==='2026-10-18' && r.ver==='2026-10-19' && /lun 19\/10/.test(r.plan), r);
  chk('FC6 «📋 Copiar el pedido para fábrica» dice «se corta en 2 días (19/10)» como el Plan (no «mañana (18/10)»)', r && /se corta en 2 días \(19\/10\)/.test(r.copia) && !/18\/10/.test(r.copia), r && r.copia);
  chk('FC6 «Cómo se calcula» dice «Primer faltante proyectado … 19/10/2026» (no el domingo 18/10)', r && /19\/10\/2026/.test(r.detalle) && !/18\/10\/2026/.test(r.detalle), r && r.detalle);
  chk('FC7 «Su historia» usa «tener» con el número del Plan y dice de dónde sale la línea («hace falta N = M vendidos + tener X»)',
    r && r.tener===String(r.objetivo) && r.ley.indexOf('hace falta '+r.nec+' = '+r.comp+' vendido'+(r.comp===1?'':'s')+' + tener '+r.objetivo)>=0 && !/lo que hay que tener \(/.test(r.ley), r && { ley:r.ley, tener:r.tener, objetivo:r.objetivo });
  chk('FC9 (VI-11) se corta en 5 días: nunca «✅ Alcanza esta semana»; dice que hoy no hace falta pedir y cuándo se corta',
    r && !/esta semana/.test(r.alc) && /^✅ Hoy no hace falta pedir \(lo libre está sobre el punto de pedido\); al ritmo de 15 días se corta el jue 22\/10/.test(r.alc), r && r.alc);
  await page._ctx.close();

  // ═══ FC8. VI-6 — «⚠️ Revisá el saldo» sin nada que pedir ═══
  console.log('\n── FC8. «Cómo se calcula» sin «fabricar 0» (VI-6) ──');
  page = await abrir(browser, '2026-10-16T12:00:00-04:00');
  r = await corre(page, async () => {
    var K=_k('CH1201','TITANIO ICE','160x190');
    await _cargar([ _ped({ fecha:_d(20), productos:[_lin('CH1201','TITANIO ICE','160x190',1,{ chk:'ok' })] }) ], _stock(function(st){ st.c.u[K]=0; }));
    var o=_fila(K), det=document.createElement('div'); det.innerHTML=stockSaldoDetalleHtml(o);
    return { aviso:o.aviso, fab:o.fabricar, rec:o.recoger, det:_txt(det) };
  });
  chk('control: «⚠️ Revisar», nada para pedir', r && r.aviso==='revisar' && r.fab===0 && r.rec===0, r && { aviso:r.aviso, fab:r.fab, rec:r.rec });
  chk('FC8 «Cómo se calcula» no dice «El panel propone fabricar 0» y dice que primero se confirma el saldo',
    r && !/fabricar 0/.test(r.det) && /Por ahora no hace falta pedir nada/.test(r.det), r && (r.det.match(/(El panel propone[^.]*\.|Por ahora no hace falta[^.]*\.)/)||[''])[0]);
  await page._ctx.close();

  // ═══ FC10. VI-7 / CU-1 — «Qué producir», el mes ═══
  console.log('\n── FC10. El mes: la celda cierra y lo de antes del 1° va aparte (VI-7, CU-1) ──');
  const barrido = async (reloj) => {
    const pg = await abrir(browser, reloj);
    const res = await corre(pg, async () => {
      var K=_k('CH1201','TITANIO ICE','160x190');
      var P=[-3,-6,-9,-12].map(function(n){ return _ped({ fecha:_d(n), ts:_ts(_d(n)), entregado:true, productos:[_lin('CH1201','TITANIO ICE','160x190',3)] }); });
      await _cargar(P, _stock(function(st){ st.c.u[K]=1; }));
      var base=_fila(K), hoy=todayStr(), MS=stockMesSiguiente(hoy), PI=ventasPanelIndex(), malas=[], noCierra=[], n=0, conAntes=0, conCero=0;
      [0.31, 0.47, 1.13, 3.07].forEach(function(mu){ [2.4, 7.2].forEach(function(S){ for(var H=0; H<=60; H+=0.37){
        var o=Object.assign({}, base, { objMu:mu, objS:S, compPor:{}, comp:0, paraSalir:H, enCamino:0, enOtros:0, detectado:0, fabricar:0, pedidos:[], descont:false });
        var r=stockProducirDe(o, MS, PI); n++;
        var necRaw=mu*stockHabilesEntre(stockSumarDias(MS.ini,-1), MS.fin), qRaw=H+r.quin-(S+mu*stockHabilesEntre(hoy, MS.finActual));
        var antesEsp=r.mes-Math.min(r.mes, Math.max(0, Math.ceil(necRaw-Math.max(0,qRaw)-1e-9)));
        var cierra=(r.mes>0 ? (r.mesNec-r.mesQueda===r.mes) : (r.mesQueda>=r.mesNec));   // VI-7: «necesita − queda = producir»
        if(!cierra && noCierra.length<4) noCierra.push({ mu:mu, S:S, H:+H.toFixed(2), mes:r.mes, nec:r.mesNec, queda:r.mesQueda });
        var ok=cierra && (r.mes===(r.antes||0)+r.mes1+r.mes2) && (r.antes===antesEsp) && r.mes1<=Math.ceil(r.mesNec*PRODUCIR_1RA-1e-9);
        if(r.antes>0) conAntes++; if(r.mes===0) conCero++;
        if(!ok && malas.length<4) malas.push({ mu:mu, S:S, H:+H.toFixed(2), mes:r.mes, antes:r.antes, antesEsp:antesEsp, mes1:r.mes1, mes2:r.mes2, nec:r.mesNec, queda:r.mesQueda });
      } }); });
      // La copia para la fábrica y la celda de «Qué producir» con lo que hay de verdad (1 en PTF).
      var d=stockData(), R=stockProducir(d), f=null, B=null;
      R.bloques.forEach(function(b){ b.filas.forEach(function(x){ if(x.o.k===K){ f=x; B=b; } }); });
      var copia=f ? (textoProducir(B.k, 'mes', d, R)||'') : '', lin=(copia.match(/• TITANIO ICE[^\n]*/)||[''])[0];
      var cel=document.createElement('div'); cel.innerHTML=f ? producirRangoTxt(f, MS) : '';
      return { n:n, malas:malas, noCierra:noCierra, conAntes:conAntes, conCero:conCero, f:f && { mes:f.mes, antes:f.antes, mes1:f.mes1, mes2:f.mes2, nec:f.mesNec, queda:f.mesQueda }, lin:lin, cel:_txt(cel), tot:B && { mes:B.tot.mes, antes:B.tot.antes, mes1:B.tot.mes1, mes2:B.tot.mes2 } };
    });
    await pg._ctx.close();
    return res;
  };
  r = await barrido('2026-10-19T10:00:00-04:00');
  chk('FC10 (VI-7) lun 19/10: en '+(r&&r.n)+' casos la fila cierra: con producir 0, «queda» nunca es menor que «necesita» («11 · 10 · —»)', r && r.n>300 && r.conCero>0 && !r.noCierra.length, r && r.noCierra);
  chk('FC10 (CU-1) lun 19/10: mes = antes + 1ª + 2ª en todos', r && r.n>300 && !r.malas.length, r && r.malas);
  r = await barrido('2026-12-01T12:00:00-04:00');
  chk('FC10 mar 01/12: también, con casos donde falta antes del 1° ('+(r&&r.conAntes)+')', r && r.n>300 && r.conAntes>0 && !r.malas.length, r && r.malas);
  chk('FC10 (CU-1) el 01/12 lo de 15 días no llega a fin de diciembre: lo que falta va aparte («antes»), la 1ª quincena no se lo lleva',
    r && r.f && r.f.antes>0 && r.f.mes===r.f.antes+r.f.mes1+r.f.mes2 && r.f.mes1<=Math.ceil(r.f.nec*0.7-1e-9) && r.tot && r.tot.antes>=r.f.antes, r && { f:r.f, tot:r.tot });
  chk('FC10 (CU-1) la copia para la fábrica y la celda lo dicen: «incluye N para terminar diciembre (del 17/12 al 31/12)»',
    r && r.f && r.lin.indexOf('incluye '+r.f.antes+' para terminar diciembre (del 17/12 al 31/12) · 1ª quincena '+r.f.mes1+' · 2ª quincena '+r.f.mes2)>=0 && r.cel.indexOf('incluye '+r.f.antes+' para terminar diciembre')>=0, r && { lin:r.lin, cel:r.cel });

  // ═══ FC11. CU-5 — todo sale de Moreno ═══
  console.log('\n── FC11. «Cómo se calcula» cuando todo sale de Moreno (CU-5) ──');
  page = await abrir(browser, '2026-10-16T12:00:00-04:00');
  r = await corre(page, async () => {
    var K=_k('CH1201','TITANIO ICE','160x190');
    var P=[-2,-4,-6,-8,-10].map(function(n){ return _ped({ fecha:_d(n), ts:_ts(_d(n)), entregado:true, productos:[_lin('CH1201','TITANIO ICE','160x190',3)] }); });
    P.push(_ped({ fecha:_d(3), productos:[_lin('CH1201','TITANIO ICE','160x190',3)] }));
    var out={};
    for(var i=0;i<2;i++){
      await _cargar(P, _stock(function(st){ st.c.u[K]=1; st.g[_IM].u[K]=(i===0?40:2); }));
      var o=_fila(K), det=document.createElement('div'); det.innerHTML=stockObjCuentaHtml(o);
      out[i===0?'moreno':'mitad']={ fab:o.fabricar, rec:o.recoger, acc:sfAccion(o), txt:(det.textContent.match(/\(primero[^)]*\)/)||[''])[0] };
    }
    return out;
  });
  chk('control: con 40 en Moreno se trae todo (fabricar 0) y con 2 se trae 2 y se fabrica el resto', r && r.moreno && r.moreno.fab===0 && r.moreno.rec>0 && r.mitad.fab>0 && r.mitad.rec===2, r);
  chk('FC11 todo de Moreno: «(primero N de Moreno: no hace falta fabricar)», sin «el resto se fabrica»', r && r.moreno && /^\(primero \d+ de Moreno: no hace falta fabricar\)$/.test(r.moreno.txt), r && r.moreno);
  chk('control: con algo para fabricar sigue «(primero 2 de Moreno, el resto se fabrica)»', r && r.mitad && r.mitad.txt==='(primero 2 de Moreno, el resto se fabrica)', r && r.mitad);
  await page._ctx.close();

  chk('sin errores de la página', ERRS.length===0, ERRS.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
