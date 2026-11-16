/* 🎨 MIS PEDIDOS: LAS TARJETAS QUE VEN LAS VENDEDORAS (16/11/2026, mejoras visuales 391, 394, 400 y 401; el dueño las eligió en
   «Mejoras visuales 390-440»). Solo dibujo y orden: ninguna cuenta cambia, nada se guarda.

   ⚠️ LO QUE ESTE TEST CUIDA:
   391 · Sin `MIS_ORDEN_PRUEBA`: el orden de siempre (del más lejano al más cercano), sin franja. Con la bandera: lo que falta entregar del
         día más cercano al más lejano (lo atrasado primero, lo que «avisa cuándo» al final de eso) y después lo entregado del más nuevo al
         más viejo; cada tarjeta sin entregar con su franja «⏰ Ya pasó su día · era el viernes 13/11 · hace 3 días», «📅 Hoy», «🚚 Mañana»,
         «Esta semana», «Más adelante», «📦 Sin día». «⏰ Atrasados» sigue con el que más espera arriba. Los chips cuentan lo mismo.
   394 · Sin `MIS_TARJ_PRUEBA`: los renglones de siempre («× 2», «(cargar en Banzer)», «Sin asignar todavía», «📦 Stock»). Con la bandera:
         cada producto con su punto (verde hay · ámbar se trae de Moreno o en producción · rojo no hay · gris sin revisar), la cantidad en
         una fichita y su dibujito, sin «cargar en…»; el renglón del chofer solo con chofer y sin el del stock.
   Datos SINTÉTICOS. Reloj clavado el lunes 16/11/2026 10:00. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_v391_mis_tarjetas.js */
const { chromium } = require('playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  await ev(() => {
    CONNECTED=false; try{ CARGA_GEN++; CARGA_ESTADO='ok'; clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    loadFromServer=function(){};
    showView('mis');
    var P=function(o){ return Object.assign({ id:'x', fecha:'2026-11-20', oc:'11-001', vendedor:'Carola Chavez', cliente:'CLIENTE', celular:'71234567',
      productos:[{ desc:'COLCHON SOFT', codigo:'CH1000', medida:'140x190', cant:1, precio:1500 }], turno:'AM', zona:'NORTE', direccion:'Calle 1', maps:'',
      pagado:false, saldo:1500, ts:Date.parse('2026-11-02T10:00:00-04:00'), metodoPago:'', entregado:false, nota:'1001', acuenta:0, facturarA:'', rev:1, fotos:[] }, o); };
    window.__P=P;
    STATE=[
      P({ id:'lej', oc:'11-010', cliente:'MAS ADELANTE', fecha:'2026-12-05' }),
      P({ id:'sem', oc:'11-011', cliente:'ESTA SEMANA', fecha:'2026-11-19' }),
      P({ id:'hoy', oc:'11-012', cliente:'HOY', fecha:'2026-11-16' }),
      P({ id:'man', oc:'11-013', cliente:'MANANA', fecha:'2026-11-17' }),
      P({ id:'atr', oc:'11-014', cliente:'ATRASADO', fecha:'2026-11-13' }),
      P({ id:'avi', oc:'11-015', cliente:'AVISA', fecha:'', productos:[{ desc:'COLCHON SOFT', codigo:'CH1000', medida:'140x190', cant:1, precio:1500, avisa:'2026-11-25' }] }),
      P({ id:'e1', oc:'11-001', cliente:'ENTREGADO VIEJO', fecha:'2026-11-03', entregado:true, saldo:200 }),
      P({ id:'e2', oc:'11-002', cliente:'ENTREGADO NUEVO', fecha:'2026-11-12', entregado:true, saldo:300 }),
      P({ id:'otra', oc:'11-099', cliente:'DE OTRA', vendedor:'Maria Flores', fecha:'2026-11-16' })
    ];
    document.getElementById('mis-vendedor').value='Carola Chavez'; MIS_Q='';
  });
  const ver = (fil) => ev((fil) => { MIS_FILTER=fil; renderMis();
    return { orden:[].map.call(document.querySelectorAll('#mis-lista > .cho-card'), function(c){ return (c.getAttribute('onclick')||'').replace(/^.*showMisModal\('([^']+)'.*$/,'$1'); }),
      franjas:[].map.call(document.querySelectorAll('#mis-lista > .cho-card'), function(c){ var b=c.querySelector('.p391-b'); return b ? [b.className.replace('p391-b p391-',''), b.textContent] : null; }),
      chips:(document.getElementById('mis-chips')||{}).textContent||'', n:[].map.call(document.querySelectorAll('#mis-lista > .cho-card .cho-n'), function(x){ return x.textContent; }) }; }, fil);

  console.log('\n── 391. Primero lo más cercano, con su día arriba ──');
  let r0 = await ver('todos');
  chk('391a sin la bandera: el orden de siempre (del más lejano al más cercano) y sin franja', r0.orden.slice(0,3).join(',')==='lej,sem,man' && r0.franjas.every(f=>f===null), r0.orden);
  await ev(() => { window.MIS_ORDEN_PRUEBA=1; });
  let r = await ver('todos');
  chk('391b «📋 Todos»: lo que falta, del más cercano al más lejano (lo atrasado primero, «avisa cuándo» al final) y después lo entregado del más nuevo al más viejo',
      r.orden.join(',')==='atr,hoy,man,sem,lej,avi,e2,e1', r.orden);
  chk('391c la franja dice cuándo: «⏰ Ya pasó su día · era el viernes 13/11 · hace 3 días» en rojo',
      r.franjas[0] && r.franjas[0][0]==='al' && /⏰ Ya pasó su día/.test(r.franjas[0][1]) && /era el viernes 13\/11 · hace 3 días/.test(r.franjas[0][1]), r.franjas[0]);
  chk('391d «📅 Hoy · lunes 16/11», «🚚 Mañana · martes 17/11», «Esta semana · jueves 19/11», «Más adelante · sábado 05/12», «📦 Sin día»',
      r.franjas[1][0]==='hoy' && /📅 Hoy.*lunes 16\/11/.test(r.franjas[1][1]) && r.franjas[2][0]==='man' && /🚚 Mañana.*martes 17\/11/.test(r.franjas[2][1]) &&
      r.franjas[3][0]==='sem' && /Esta semana.*jueves 19\/11/.test(r.franjas[3][1]) && r.franjas[4][0]==='lej' && /Más adelante.*sábado 05\/12/.test(r.franjas[4][1]) &&
      /📦 Sin día/.test(r.franjas[5][1]), r.franjas);
  chk('391e lo entregado no lleva franja', r.franjas[6]===null && r.franjas[7]===null, r.franjas.slice(6));
  chk('391f los números de las tarjetas van en el orden nuevo', r.n.slice(0,3).join(',')==='1,2,3', r.n);
  chk('391g los chips cuentan lo mismo que sin la bandera', r.chips===r0.chips, [r.chips, r0.chips]);
  r = await ver('pend');
  chk('391h «⏳ No entregados»: atrasado, hoy, mañana, esta semana, más adelante, sin día', r.orden.join(',')==='atr,hoy,man,sem,lej,avi', r.orden);
  r = await ev(() => { STATE.push(__P({ id:'atr2', oc:'11-016', cliente:'MAS ATRASADO', fecha:'2026-11-10' })); MIS_FILTER='atras'; renderMis();
    return [].map.call(document.querySelectorAll('#mis-lista > .cho-card'), function(c){ return (c.getAttribute('onclick')||'').replace(/^.*showMisModal\('([^']+)'.*$/,'$1'); }); });
  chk('391i «⏰ Atrasados» sigue con el que más espera arriba', r[0]==='atr2' && r.indexOf('atr')>0, r);
  await ev(() => { STATE=STATE.filter(function(p){ return p.id!=='atr2'; }); });

  console.log('\n── 394. Lo que importa para vender ──');
  const tarjeta = () => ev(() => { STATE=STATE.filter(function(p){ return p.id!=='t394' && p.id!=='t394c'; });
    STATE.push(__P({ id:'t394', oc:'11-020', cliente:'TARJETA', fecha:'2026-11-18', estado:'stock', productos:[
      { desc:'COLCHON TITANIO ICE', codigo:'CH1220', medida:'140x190', cant:2, precio:4290, chk:'ok', chkDe:'01-05-025  Almacen Distribucion Banzer' },
      { desc:'SOMIER TITANIO ICE', codigo:'CH1212', medida:'140x190', cant:1, precio:2690, chk:'im' },
      { desc:'ALMOHADA', codigo:'CD1403', medida:'50x70', cant:2, precio:180, chk:'no' },
      { desc:'COLCHON SOFT', codigo:'CH1000', medida:'105x190', cant:1, precio:1500, enProd:true },
      { desc:'PROTECTOR', medida:'140x190', cant:1, precio:200 } ] }));
    STATE.push(__P({ id:'t394c', oc:'11-021', cliente:'CON CHOFER', fecha:'2026-11-18', chofer:'Omar', vehiculo:'Carry' }));
    MIS_FILTER='todos'; renderMis();
    var c=document.querySelector('#mis-lista .cho-card[onclick*="t394\'"]'), c2=document.querySelector('#mis-lista .cho-card[onclick*="t394c"]');
    var titulos=function(x){ return [].map.call(x.querySelectorAll('.mis-ico .mi'), function(m){ return m.getAttribute('title'); }); };
    return { txt:c.innerText.replace(/\s+/g,' '), lineas:[].map.call(c.querySelectorAll('.p394-l'), function(l){ return [(l.querySelector('.p394-dot')||{}).className, (l.querySelector('.p394-q')||{}).textContent, !!l.querySelector('.pico'), l.querySelector('.nm').textContent]; }),
      tit:titulos(c), tit2:titulos(c2), cho2:c2.innerText.replace(/\s+/g,' ') }; });
  r = await tarjeta();
  chk('394a sin la bandera: los renglones de siempre («× 2», «(cargar en Banzer)», «Sin asignar todavía», el 📦 Stock)', /× 2/.test(r.txt) && /cargar en Banzer/.test(r.txt) && /Sin asignar todavía/.test(r.txt) && r.tit.indexOf('Stock')>=0 && r.lineas.length===0, r);
  await ev(() => { window.MIS_TARJ_PRUEBA=1; });
  r = await tarjeta();
  chk('394b cada producto en su renglón con su punto, la cantidad en fichita y su dibujito', r.lineas.length===5 && r.lineas.every(l=>/p394-dot/.test(l[0]) && l[2]) && r.lineas.map(l=>l[1]).join(',')==='2,1,2,1,1', r.lineas);
  chk('394c los puntos: Banzer = hay (verde) · Moreno = ámbar «se trae de Moreno» · no hay = rojo · en producción = ámbar · sin revisar = gris',
      / v$/.test(r.lineas[0][0]) && / a$/.test(r.lineas[1][0]) && /se trae de (IM|Moreno)/.test(r.lineas[1][3]) && / r$/.test(r.lineas[2][0]) && /no hay/.test(r.lineas[2][3]) &&
      / a$/.test(r.lineas[3][0]) && /en producción/.test(r.lineas[3][3]) && / g$/.test(r.lineas[4][0]), r.lineas.map(l=>l[0]+' '+l[3]));
  chk('394d sin «(cargar en Banzer)» ni «× N»', !/cargar en/.test(r.txt) && !/× \d/.test(r.txt), r.txt.slice(0,300));
  chk('394e sin chofer no hay renglón de chofer, y el del stock se fue', r.tit.indexOf('Chofer')<0 && r.tit.indexOf('Stock')<0 && !/Sin asignar todavía/.test(r.txt), r.tit);
  chk('394f con chofer, el renglón aparece', r.tit2.indexOf('Chofer')>=0 && /Omar/.test(r.cho2), r.tit2);
  await ev(() => { STATE=STATE.filter(function(p){ return p.id!=='t394' && p.id!=='t394c'; }); });

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
