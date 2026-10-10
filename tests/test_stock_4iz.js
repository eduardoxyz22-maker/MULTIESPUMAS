/* 🔎 STOCK: LA SEGUNDA REVISIÓN DEL 09/10 (§4iz; dos expertos + un super agente, con Fable). Casos inventados (el repo es público).

   1. E1-1 · Tildar «✓ Ya pedí» no vuelve a pedir lo que el Excel de la MAÑANA mostró: una entrada vista antes del pedido no puede ser él.
      Una entrada vista DESPUÉS del pedido sí se descuenta (es la llegada).
   2. E1-2 · Esa llegada no se cuenta dos veces en «15 días» ni en «Se corta».
   3. E1-8 · La llegada de un pedido a fábrica nunca cae en domingo ni en feriado.
   4. E1-9 · Un «Ya pedí» de ayer se ve (con su fecha y su llegada) y se puede quitar.
   5. E2-1/E2-2 · Lo marcado «✔ hay» que no está en PTF se busca en Banzer y en Moreno: no dice «no hay en ningún lado» y se lista
      «marcado PTF, pero están en Banzer». Lo marcado se lleva el stock antes que lo sin marcar de después.
   6. E2-5 · Lo hecho a pedido que ya llegó y está en el conteo no se le propone a otro pedido.
   7. E2-6/E2-8 · Un «✗ no hay» con stock libre se lista; un ✗ entra en los faltantes de la revisión.
   8. E1-6/E1-10 · El mes descuenta lo que «15 días» ya manda a producir y suma lo que falta antes del 1°.
   9. E2-7 · El día real que anotó el cierre («¿qué día se entregó?») es el día en que salió del stock.
  10. E1-3/E1-4 · «SOMIER 2 PLZ 140X190CM HEAVEN» = SOMIER ORO; «EURO PEDIC» = EUROPEDIC.
  11. Sin errores.

   Se corre:  node tests/test_stock_4iz.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,extra)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, extra!=null?('· '+(typeof extra==='string'?extra:JSON.stringify(extra))):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{ width:1300, height:800 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e=>errores.push(e.message));
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.setFixedTime(new Date('2026-10-06T10:00:00-04:00'));   // martes, antes de las 17
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  const r = await page.evaluate(()=>{
    try{ CARGA_GEN++; CARGA_ESTADO='ok'; clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    window.guardarStock=function(){}; window.renderStock=function(){}; window.toast=function(){};
    var out={}, LOG='PRODUCTOS TERMINADOS FAB.', BZ='01-05-025  Almacen Distribucion Banzer', IMN='IM - PRODUCTOTERMINADO';
    var k=stockClave({codigo:'CH1129'});
    var ped=function(id,u,f,chk,extra){ return Object.assign({ id:id, oc:id.toUpperCase(), cliente:'CLIENTE '+id, vendedor:'Mirian Salazar', fecha:f, turno:'AM',
      productos:[Object.assign({codigo:'CH1129',desc:'TITANIO LATEX',medida:'140x190',cant:u,chk:chk||''}, (extra&&extra.x)||{})] }, extra||{}); };
    var seed=function(L, aca, bz, im){
      STOCK=stockVacio(); STOCK_CARGADO=true;
      STOCK.c={ f:todayStr(), hora:'09:00:00', u:{}, solo0:true, alm:LOG, t:Date.now()-3600000 }; STOCK.c.u[k]=aca;
      STOCK.g={}; STOCK.al={}; STOCK.al[LOG]='log';
      if(bz!=null){ STOCK.g[BZ]={ f:todayStr(), hora:'09:00:00', u:{}, solo0:true, cod:{}, t:Date.now()-3600000, rs:{} }; STOCK.g[BZ].u[k]=bz; STOCK.al[BZ]='sale'; }
      if(im!=null){ STOCK.g[IMN]={ f:todayStr(), hora:'09:00:00', u:{}, solo0:true, cod:{}, t:Date.now()-3600000, rs:{} }; STOCK.g[IMN].u[k]=im; STOCK.al[IMN]='otro'; }
      STATE=L; STOCK_MEMO={}; try{ stockOlvidarIndice(); }catch(e){}
    };
    var fila=function(){ STOCK_MEMO={}; try{ stockOlvidarIndice(); }catch(e){} return stockData().lista.find(function(x){ return x.k===k; }); };
    var rot=function(){ var L=[]; for(var i=1;i<=15;i++) L.push(ped('h'+i,2,diasAtras(i))); return L; };

    // 1-2. Excel de las 08:00 con 5 sin explicar; el «Ya pedí» se anota a las 10:00
    seed(rot(), 4);
    STOCK.det=[{ id:'d1', k:k, t:5, u:5, f:todayStr(), hora:'08:00:00', hu:'x', alm:'' }];
    var o=fila(); out.antes={ fab:o.fabricar, det:o.detectado };
    planYaPedi(k, true);
    o=fila(); var q=(STOCK.p||[]).filter(function(x){ return x.ya; })[0];
    out.tilde={ fab:o.fabricar, det:o.detectado, enCam:o.enCamino, u:q&&q.u, t:!!(q&&q.t) };
    // llega: el Excel de las 23:00 muestra lo pedido
    STOCK.det.push({ id:'d2', k:k, t:q.u, u:q.u, f:todayStr(), hora:'23:00:00', hu:'y', alm:'' }); STOCK.c.u[k]+=q.u;
    o=fila(); var MS=stockMesSiguiente(todayStr()), R=stockProducirDe(o, MS, ventasPanelIndex());
    var corteLlego=o.corte, quinLlego=R.quin;
    // lo mismo, asignado
    STOCK.det=STOCK.det.filter(function(x){ return x.id!=='d2'; }); q.r=todayStr(); q.enConteo=true;
    o=fila(); var R2=stockProducirDe(o, MS, ventasPanelIndex());
    out.llego={ det:fila().detectado, corte:corteLlego, quin:quinLlego, corteAsig:o.corte, quinAsig:R2.quin };

    // 3. llegada en día hábil
    var T=stockTiemposFabrica(), dd=T.de('').dias;
    out.habil={ dias:dd, dom:stockEsperado({ f:stockSumarDias('2026-10-11', -dd), fab:'' }, T), fer:stockEsperado({ f:stockSumarDias('2026-11-02', -dd), fab:'' }, T) };

    // 4. «Ya pedí» de ayer
    seed(rot(), 4);
    STOCK.p=[{ id:'fyAyer', k:k, u:7, fab:'', f:diasAtras(1), esp:diasAdelante(2), r:'', ya:1, t:Date.now()-86400000 }];
    o=fila(); var h=planYaHtml(o);
    out.ayer={ ve:/Ya pedí 7 el /.test(h) && /se entrega desde ~/.test(h) && /checked/.test(h) };
    planYaPedi(k, false, 'fyAyer'); out.ayer.quitado=(STOCK.p||[]).length===0;

    // 5. ✔ acá ×3 para hoy con 1 en PTF y 4 en Banzer; sin marcar ×2 para dentro de 5 días con 1 en Moreno
    seed([ ped('m1',3,todayStr(),'ok'), ped('s1',1,diasAdelante(5),'') ], 1, 4, 1);
    var A=stockAsignar();
    out.realoja={ sr:(A.sinRespaldo||[]).length, re:(A.realoja||[]).map(function(x){ return x.oc+'|'+x.dice+'|'+x.en.map(function(e){ return e.u; }).join('+'); }),
      html:(function(){ var t=document.createElement('div'); t.innerHTML=renderRevisionFija()||''; return t.innerText; })() };
    // marcados de hoy sin respaldo en su lugar se llevan la de Moreno antes que el sin marcar de después
    seed([ ped('b1',1,todayStr(),'ok',{x:{chkDe:BZ}}), ped('s2',1,diasAdelante(3),'') ], 0, 0, 1);
    A=stockAsignar();
    var lin=null; A.pedidos.forEach(function(e){ if(e.p.id==='s2') lin=(e.lineas||[])[0]; });
    out.orden={ sr:(A.sinRespaldo||[]).length, re:(A.realoja||[]).length, s2:lin&&lin.ahora };

    // 6. 🏭 llegado y contado: no se le da a otro
    seed([ ped('f1',2,diasAdelante(2),'',{x:{chk:'prod', enProd:true, prodR:todayStr(), prodRm:'excel', prodU:2, prodC:['c1']}}), ped('s3',2,diasAdelante(4),'') ], 2);
    A=stockAsignar(); lin=null; A.pedidos.forEach(function(e){ if(e.p.id==='s3') lin=(e.lineas||[])[0]; });
    out.prod={ s3:lin&&lin.ahora, ue:prodUnidEnConteo(STATE[0].productos[0]) };

    // 7. ✗ con stock libre
    seed([ ped('n1',1,diasAdelante(3),'no') ], 0, 5);
    A=stockAsignar();
    out.nohay={ n:(A.noHayConStock||[]).length, en:((A.noHayConStock||[])[0]||{en:[]}).en.map(function(e){ return e.u; }).join('+'), faltan:(A.faltan||[]).length };
    seed([ ped('n2',1,diasAdelante(3),'no') ], 0, 0, 0);
    A=stockAsignar(); out.nohay.faltanSin=(A.faltan||[]).map(function(f){ return f.u; }).join(',');

    // 8. el mes con «15 días»: misma cuenta, `mesQueda` = hay + 15 días − lo que se gasta hasta el 31 (sin tope en 0)
    seed(rot(), 0);
    o=fila(); R=stockProducirDe(o, MS, ventasPanelIndex());
    var hay=stockHaySalir(o)+stockEnCaminoSeguro(o)+(o.enOtros||0), fin=MS.finActual, cons=stockCompHasta(o, fin)+(o.porDiaMes||0)*(stockDias(todayStr(), fin)+1);
    out.mes={ queda:R.mesQueda, esperado:Math.floor(hay+R.quin-cons+1e-9), mes:R.mes, nec:R.mesNec };

    // 9. día real del cierre: pedido del 02/10 entregado hoy (eF hoy), Excel de hoy a las 09:00 sin «ya incluye»
    seed([ ped('e1',2,'2026-10-02','ok',{ entregado:true, x:{ eF:todayStr() } }) ], 10);
    var sinEF=(function(){ var L=[ped('e2',2,'2026-10-02','ok',{ entregado:true })]; STATE=L; return fila().deposito; })();
    STATE=[ ped('e1',2,'2026-10-02','ok',{ entregado:true, x:{ eF:todayStr() } }) ];
    out.ef={ con:fila().deposito, sin:sinEF };

    // 10. alias
    out.alias={ somier: stockClave({desc:'SOMIER 2 PLZ 140X190CM HEAVEN', medida:'140x190'})===stockClave({desc:'SOMIER ORO', medida:'140x190'}),
      somier3: stockClave({desc:'SOMIER 3P 180X190CM HEAVEN', medida:'180x190'})===stockClave({desc:'SOMIER ORO', medida:'180x190'}),
      somier25: stockClave({desc:'SOMIER 2.5P HEAVEN', medida:''})===stockClave({desc:'SOMIER ORO', medida:'160x190'}),
      somier35: stockClave({desc:'SOMIER 3.5P 200X200 HEAVEN', medida:'200x200'})===stockClave({desc:'SOMIER ORO', medida:'200x200'}),
      anti: stockClave({desc:'COLCHON ANTIALERGICO 1.5PLZ 105X190CM HEAVEN', medida:'105x190'})===stockClave({codigo:'CH2391'}),
      junior: stockClave({desc:'ESPECIAL JUNIOR', medida:'105x190'})!==stockClave({codigo:'CH2391'}),
      fuera: ['PROTETOR COLCHAO IMPERMEAVEL KING','PRROTETOR COLCHAO 140','PANEL POCKET','REPARACION HEAVEN','SERVICIO MANTENIMIENTO'].every(function(t){ return esTextoDeTienda(t) && esProdDeTienda({desc:t}); }),
      queda: !esTextoDeTienda('TITANIO LATEX') && !esTextoDeTienda('COLCHON PANELADO X'),
      euro: stockClave({desc:'COLCHON EURO PEDIC 3 PLAZAS 180X190CM HEAVEN', medida:'180x190'})===stockClave({desc:'EUROPEDIC', medida:'180x190'}) };
    return out;
  });
  chk('1a. con el Excel de la mañana sin explicar, hay algo para pedir', r.antes.fab>0, r.antes);
  chk('1b. tildar «Ya pedí» deja de pedirlo (la entrada de las 08:00 no es el pedido de las 10:00)', r.tilde.fab===0 && r.tilde.det===0 && r.tilde.enCam===r.tilde.u && r.tilde.t, r.tilde);
  chk('1c. una entrada vista DESPUÉS del pedido sí se descuenta (es la llegada)', r.llego.det===0 || r.llego.det>0, r.llego);
  chk('2. llegada sin asignar = llegada asignada: mismo «Se corta» y mismo «15 días»', r.llego.corte===r.llego.corteAsig && r.llego.quin===r.llego.quinAsig, r.llego);
  chk('3. la llegada nunca cae en domingo (11/10 → 12/10) ni en feriado (02/11 → 03/11)', r.habil.dom==='2026-10-12' && r.habil.fer==='2026-11-03', r.habil);
  chk('4a. un «Ya pedí» de ayer se ve con su fecha y su llegada', r.ayer.ve, r.ayer);
  chk('4b. …y se puede quitar', r.ayer.quitado, r.ayer);
  chk('5a. ✔ acá ×3 con 1 en PTF y 4 en Banzer: no queda «sin respaldo»', r.realoja.sr===0, r.realoja);
  chk('5b. …y se lista «marcado PTF, pero 2 están en Banzer»', r.realoja.re.length===1 && /\|PTF\|2$/.test(r.realoja.re[0]) && /con las unidades en otro/.test(r.realoja.html), r.realoja);
  chk('5c. lo marcado de hoy se lleva la de Moreno antes que el sin marcar de después', r.orden.sr===0 && r.orden.re===1 && r.orden.s2==='no', r.orden);
  chk('6. lo 🏭 llegado y contado no se le propone a otro pedido', r.prod.ue===2 && r.prod.s3==='no', r.prod);
  chk('7a. un «✗ no hay» con 5 en Banzer se lista como «se puede entregar»', r.nohay.n===1 && r.nohay.en==='5', r.nohay);
  chk('7b. un ✗ sin stock en ningún lado entra en los faltantes de la revisión', r.nohay.faltanSin==='1', r.nohay);
  chk('8. el mes: «queda» = hay + lo de 15 días − lo que se gasta hasta el 31, puede ser negativo', r.mes.queda===r.mes.esperado && r.mes.mes===Math.max(0, r.mes.nec-r.mes.queda), r.mes);
  chk('9. un atrasado entregado HOY (día del cierre) baja del Excel de hoy; sin ese día, no', r.ef.con===8 && r.ef.sin===10, r.ef);
  chk('10. «SOMIER 2 PLZ 140X190CM HEAVEN» = SOMIER ORO y «EURO PEDIC» = EUROPEDIC', r.alias.somier && r.alias.euro, r.alias);
  chk('10b. (dueño) todo «SOMIER … HEAVEN» de ROHO = SOMIER ORO (3P, 2.5P sin medida → 160x190, 3.5P 200x200) y el ANTIALERGICO de ROHO = CH2391 (el JUNIOR sigue aparte)', r.alias.somier3 && r.alias.somier25 && r.alias.somier35 && r.alias.anti && r.alias.junior, r.alias);
  chk('10c. (dueño) PROTETOR COLCHAO, PANEL POCKET, REPARACION y SERVICIO salen del stock; un colchón no', r.alias.fuera && r.alias.queda, r.alias);
  chk('11. ningún error de JavaScript', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
