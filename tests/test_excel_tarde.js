/* 🌙 EL EXCEL DE LA TARDE, RECORDADO DESPUÉS DEL ÚLTIMO ✅ (15/11/2026, mejora 321; la parte de la página).
   Del 11 al 14/11 el Excel de la mañana estuvo todos los días y el de la tarde solo el 13/11.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin `EXCEL_TARDE_PRUEBA` no hay renglón nuevo en «Para hacer».
   2. Con la bandera, a las 17:45 con el Excel de la mañana de los tres almacenes: «🌙 Falta el Excel de la tarde» con PTF, Banzer y Moreno,
      y el botón abre la subida de siempre.
   3. A las 15:00 con entregas sin ✅: todavía no. A las 15:00 con todo ✅: «Ya está el último ✅ de hoy».
   4. Con el de la tarde de PTF (17:50) faltan solo Banzer y Moreno y dice cuál ya está; con los tres, no sale.
   5. Sin el Excel de la mañana de hoy (el último es de ayer) no sale (lo dice el aviso de siempre); el domingo, tampoco.
   Datos SINTÉTICOS. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_excel_tarde.js */
const { chromium } = require('playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.setFixedTime(new Date('2026-11-05T17:45:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  const armar = (o) => ev((o) => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    loadFromServer=function(){};
    var hoy=todayStr(), ayer=stockSumarDias(hoy,-1);
    STOCK.c={ f:o.ptfF||hoy, hora:o.ptfH||'07:31', u:{ 'TITANIO|140x190':4 }, t:0 };
    STOCK.g={ '01-05-025  Almacen Distribucion Banzer':{ f:hoy, hora:o.bzH||'07:40', u:{ 'TITANIO|140x190':2 }, t:0, rs:{} },
              'IM - PRODUCTOTERMINADO':{ f:hoy, hora:o.imH||'08:02', u:{ 'TITANIO|140x190':9 }, t:0, rs:{} },
              'VIEJO DE HACE UN MES':{ f:stockSumarDias(hoy,-30), hora:'08:00', u:{ 'X|1':1 }, t:0, rs:{} } };
    STATE=[1,2].map(function(i){ return { id:'p'+i, oc:'11-50'+i, cliente:'C'+i, fecha:hoy, turno:'AM', vendedor:'Mirian Salazar', vehiculo:'Carry', chofer:'Omar', entregado:!!o.todoOk || i===1,
      productos:[{ desc:'TITANIO', medida:'140x190', cant:1 }], ts:1, rev:1, fotos:[] }; });
    var x=null; try{ x=excelTardeHacer(); }catch(e){ return { err:String(e) }; }
    var I=admHacerDatos().filter(function(r){ return r.k==='xls-tarde'; })[0]||null;
    return { x:x, en:!!I };
  }, o||{});

  console.log('\n── 1. Sin la bandera ──');
  let r = await armar({});
  chk('no hay renglón «Excel de la tarde» en «Para hacer»', r.x===null && !r.en, r);

  console.log('\n── 2. 17:45, con el de la mañana de los tres ──');
  await ev(() => { window.EXCEL_TARDE_PRUEBA=1; });
  r = await armar({});
  chk('«🌙 Falta el Excel de la tarde» con PTF, Banzer y Moreno (el de hace un mes no cuenta)', r.en && r.x && r.x.n===3 && /^PTF, Banzer, Moreno · con las entregas de hoy adentro$/.test(r.x.s) && r.x.t==='Falta el Excel de la tarde', r.x);
  chk('el botón abre la subida de siempre', r.x && r.x.b==='📥 Subir el Excel' && r.x.fn==='abrirStock();abrirImportExist()', r.x);
  r = await ev(() => { var x=excelTardeHacer(); try{ eval(x.fn); }catch(e){ return String(e); } var ov=document.getElementById('stock-overlay'); return { stock:ov && ov.style.display!=='none', hay:typeof abrirImportExist }; });
  chk('tocarlo abre Stock sin errores', r && r.stock===true, r);
  await ev(() => { try{ closeModal(); }catch(e){} try{ closeStock(); }catch(e){} });

  console.log('\n── 3. A las 15:00 ──');
  await page.clock.setFixedTime(new Date('2026-11-05T15:00:00-04:00'));
  r = await armar({});
  chk('con entregas de hoy sin ✅: todavía no', r.x===null && !r.en, r);
  r = await armar({ todoOk:true });
  chk('con todo lo de hoy ✅: «Ya está el último ✅ de hoy: falta el Excel de la tarde»', r.en && r.x && r.x.t==='Ya está el último ✅ de hoy: falta el Excel de la tarde', r.x);
  await page.clock.setFixedTime(new Date('2026-11-05T11:00:00-04:00'));
  r = await armar({ todoOk:true });
  chk('a las 11:00, aunque todo tenga ✅: no (el de la tarde es después de las 12)', r.x===null, r);

  console.log('\n── 4. Los que ya subieron el de la tarde ──');
  await page.clock.setFixedTime(new Date('2026-11-05T18:10:00-04:00'));
  r = await armar({ ptfH:'17:50' });
  chk('con el de PTF de las 17:50: faltan Banzer y Moreno, y dice que el de PTF ya está', r.x && r.x.n===2 && /^Banzer, Moreno · .*\(ya está el de PTF\)$/.test(r.x.s), r.x);
  r = await armar({ ptfH:'17:50', bzH:'17:55', imH:'18:01' });
  chk('con los tres de la tarde: no sale', r.x===null && !r.en, r);

  console.log('\n── 5. Sin el de la mañana, y el domingo ──');
  r = await ev(() => stockSumarDias(todayStr(),-1));
  let ayer=r;
  r = await ev((ayer) => {
    var hoy=todayStr();
    STOCK.c.f=ayer; Object.keys(STOCK.g).forEach(function(k){ STOCK.g[k].f=ayer; });
    return excelTardeHacer();
  }, ayer);
  chk('sin ningún Excel de hoy: no sale (lo dice el aviso del Excel del día)', r===null, r);
  await page.clock.setFixedTime(new Date('2026-11-08T18:10:00-04:00'));
  r = await armar({});
  chk('el domingo: no sale', r.x===null, r);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
