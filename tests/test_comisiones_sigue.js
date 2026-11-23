/* 💰 MEJORA 338 — LAS COMISIONES DEL MES, SI SIGUEN ASÍ.

   El dueño (15/11): al 15/11 el Cierre comercial daba Bs 5.648 de comisiones con lo vendido; con la proyección de cada vendedora serían ~Bs 23.684,
   y Fernando estaba a Bs 22 de su mínima. «Eso hoy no se ve en ningún lado junto.» Una ficha en Proyección y una columna en el Cierre comercial.

   LO QUE ESTA PRUEBA CUIDA:
   1. La MISMA cuenta del cierre (`ccmCuenta`: metas, escala, Titanio) con lo vendido de cada una llevado a su proyección (`proyeccionMes`):
      el % con `ccmPctDe`, el escalón siguiente con `ccmTramoSig` (la mínima es escalón), el bono Titanio en proporción.
   2. En ámbar quién está a menos de Bs 15.000 de un escalón, con cuánto le falta; «le faltan Bs X para la mínima» a quien está más lejos.
   3. La cuenta del cierre NO cambia (la columna «Total» es la de siempre) y nada se guarda; solo el mes en curso y abierto.
   4. Se ve en Proyección (#pry-com) y como columna «📈 Si sigue así» del cierre con el total arriba; sin la bandera `CCM_SIGUE_PRUEBA`, nada.
   Datos INVENTADOS. Reloj clavado: jueves 12/11/2026 a las 10:00 de Bolivia.
   Se corre:  node tests/test_comisiones_sigue.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,700)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function PREPARAR(){
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  loadFromServer=function(){};
  /* 📐 (23/11) desde la 2026-11-23-g cada vendedor proyecta SU PARTE de la marca (`test_proyeccion` lo cuida). Esta prueba cuida la cuenta de
     las COMISIONES con la proyección que reciba: sus casos (a Bs 100 de la mínima, a Bs 2.000 del 3 %…) están armados con la cuenta de cada
     vendedor sola, así que acá se la pide así (`proyRitmo`), sin tocar las comisiones. */
  var _pm=proyeccionMes;
  window.proyeccionMes=proyeccionMes=function(ym){ var R=_pm(ym); if(R.estado==='curso') R.marcas.forEach(function(m){ m.filas.forEach(function(r){ if(r.metodo==='ritmo') r.proy=r.proyRitmo; }); }); return R; };
  var n=0;
  window.V=function(vend, fecha, reg, bs, prods){ n++;
    return { id:'p'+n, oc:fecha.slice(5,7)+'-'+(100+n), nota:String(500+n), vendedor:vend, cliente:'CLIENTE '+n, fecha:fecha, turno:'AM', zona:'', direccion:'',
             productos:prods||[{desc:'COLCHON SOFT',medida:'140x190',codigo:'',cant:1,precio:bs}], saldo:bs, acuenta:0, pagado:false, metodoPago:'', entregado:false, ts:new Date(reg+'T10:00:00-04:00').getTime(), fotos:[] }; };
  window.ESC={ heaven:{ t:[['min',100,2],['pres',100,2.75],['pres',120,3]], bono:1 }, suena:{ t:[['min',100,2],['pres',80,2.5]], bono:0 } };
  window.METAS=function(){ return filaSistema(META_ID, 'x', JSON.stringify({ v:1, m:{ '2026-11':{ heaven:60000, suena:40000, t:1, esc:ESC,
    vd:{ 'Maria Flores':[10000,15000], 'Mauricio Merida':[20000,0], 'Carola Chavez':[30000,40000], 'Fernando Peinado':[9100,0], 'Andrea Orias':[2000,3000] } } } })); };
  window.FIX=function(){ return [
    V('Maria Flores','2026-10-06','2026-10-05',3000), V('Mauricio Merida','2026-10-07','2026-10-06',5000),
    V('Maria Flores','2026-11-04','2026-11-03',6000), V('Maria Flores','2026-11-18','2026-11-10',2000),                 // 8.000 → se proyecta 16.000
    V('Mauricio Merida','2026-11-05','2026-11-04',5000), V('Mauricio Merida','2026-11-11','2026-11-09',5000),           // 10.000 → 26.666,67
    V('Carola Chavez','2026-11-06','2026-11-03',4000), V('Carola Chavez','2026-11-20','2026-11-11',4000),               // 8.000 (4.000 entregado) → 10.666,67
    V('Fernando Peinado','2026-11-25','2026-11-10',9000),                                                              // 9.000 (todo agendado)
    V('Andrea Orias','2026-11-17','2026-11-09',3000, [{ desc:'TITANIO ICE', medida:'140x190', codigo:'', cant:1, precio:3000 }])   // Titanio 3.000
  ].concat([METAS()]); };
  window._txt=function(sel){ var e=document.querySelector(sel); return e ? e.innerText.replace(/\s+/g,' ').trim() : ''; };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const page = await browser.newPage({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-11-12T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(350);
  await page.evaluate(PREPARAR);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,400) }; } };

  console.log('\n── 1. La cuenta ──');
  let r = await ev(() => {
    STATE=FIX();
    var K=ccmCuenta('2026-11'), S=ccmSigueDatos('2026-11'), o={ hoy:S.hoy, sigue:S.sigue, borde:S.borde, filas:{} };
    S.filas.forEach(function(f){ o.filas[f.v]={ hoy:f.hoy, bs:f.bs, pct:f.pct, co:f.co, bo:f.bo, to:f.to, borde:f.borde, mira:ccmSigueMira(f) }; });
    o.hoyCierre=K.filas.filter(ccmFilaVe).reduce(function(a,r){ return r2(a+r.to); }, 0);
    o.orden=S.filas.map(function(f){ return f.v; });
    return o;
  });
  const F = r.filas || {};
  chk('1a. Maria: hoy 8.000 (debajo de la mínima: 0); si sigue, 16.000 (pasa el presupuesto: 2,75 % = Bs 440); está a Bs 2.000 del 3 % (120 % del presupuesto)',
      F['Maria Flores'] && F['Maria Flores'].hoy===0 && F['Maria Flores'].bs===16000 && F['Maria Flores'].pct===2.75 && F['Maria Flores'].co===440 && F['Maria Flores'].borde && F['Maria Flores'].mira==='quedaría a Bs 2.000 del 3 %', F['Maria Flores']);
  chk('1b. Mauricio: 26.666,67 con la mínima de 20.000 y sin presupuesto: 2 % = Bs 533,33; ya en el tramo más alto',
      F['Mauricio Merida'] && F['Mauricio Merida'].bs===26666.67 && F['Mauricio Merida'].pct===2 && F['Mauricio Merida'].to===533.33 && F['Mauricio Merida'].mira==='llegaría al tramo más alto', F['Mauricio Merida']);
  chk('1c. Fernando: se proyecta 9.000 y su mínima es 9.100: «⚠️ a Bs 100 de la mínima» (al borde)', F['Fernando Peinado'] && F['Fernando Peinado'].to===0 && F['Fernando Peinado'].borde && F['Fernando Peinado'].mira==='⚠️ quedaría a Bs 100 de la mínima', F['Fernando Peinado']);
  chk('1d. Carola: 10.666,67 contra una mínima de 30.000: «le faltan Bs 19.334 para la mínima» (más de 15.000: no está al borde)',
      F['Carola Chavez'] && F['Carola Chavez'].to===0 && !F['Carola Chavez'].borde && F['Carola Chavez'].bs===10666.67 && F['Carola Chavez'].mira==='le faltarían Bs 19.334 para la mínima', F['Carola Chavez']);
  chk('1e. Andrea: el bono Titanio (1 % de 3.000) va igual hoy y si sigue (todo agendado): 82,50 + 30 = Bs 112,50; a Bs 600 del 3 %',
      F['Andrea Orias'] && F['Andrea Orias'].hoy===112.5 && F['Andrea Orias'].to===112.5 && F['Andrea Orias'].bo===30 && F['Andrea Orias'].mira==='quedaría a Bs 600 del 3 %', F['Andrea Orias']);
  chk('1f. hoy = el total del Cierre comercial (Bs 112,50); si siguen así, Bs 1.085,83; 3 al borde de un escalón', r.hoy===r.hoyCierre && r.hoy===112.5 && r.sigue===1085.83 && r.borde===3, [r.hoy, r.hoyCierre, r.sigue, r.borde]);
  chk('1g. de la que más cobraría a la que menos', r.orden && r.orden[0]==='Mauricio Merida' && r.orden[1]==='Maria Flores' && r.orden[2]==='Andrea Orias', r.orden);

  console.log('\n── 2. En Proyección y en el Cierre comercial ──');
  r = await ev(async () => {
    window.CCM_SIGUE_PRUEBA=1; UNLOCKED=true;
    showView('conta'); segSet('cta-tab','proy'); setContaTab('proy');
    STATE=FIX(); document.getElementById('pry-mes').value='2026-11'; renderProyeccion();
    var o={ pry:_txt('#pry-com'), amb:document.querySelectorAll('#pry-com tr.csg-borde').length };
    var antes=ccmCuenta('2026-11').filas.map(function(r){ return r.v+'|'+r.to; }).join(',');
    ccmAbrir('2026-11'); await new Promise(function(r){ setTimeout(r, 50); });
    o.ccm=_txt('#ccm-body'); o.th=[].map.call(document.querySelectorAll('#ccm-body .ccm-marca thead th'), function(t){ return t.innerText.trim(); });
    o.celdas=document.querySelectorAll('#ccm-body td.csg-c').length; o.ambC=document.querySelectorAll('#ccm-body td.csg-c.csg-borde').length;
    o.despues=ccmCuenta('2026-11').filas.map(function(r){ return r.v+'|'+r.to; }).join(','); o.antes=antes;
    o.guardo=STATE.filter(function(p){ return String(p.id)===CCM_ID; }).length;
    ccmCerrarVentana();
    return o;
  });
  chk('2a. Proyección: «💰 Comisiones de noviembre», «Hoy, con lo vendido Bs 113», «Si siguen así, al 30/11 Bs 1.086» y «3» al borde',
      /💰 Comisiones de noviembre/.test(r.pry) && /Hoy, con lo vendido Bs 113/.test(r.pry) && /Si siguen así, al 30\/11 Bs 1\.086/.test(r.pry) && /A menos de Bs 15\.000 de un escalón 3/.test(r.pry), r.pry);
  chk('2b. la tabla con «⚠️ a Bs 100 de la mínima» y «a Bs 2.000 del 3 %», tres filas en ámbar', /⚠️ quedaría a Bs 100 de la mínima/.test(r.pry) && /quedaría a Bs 2\.000 del 3 %/.test(r.pry) && r.amb===3, r.amb);
  chk('2c. el Cierre: la columna «📈 Si sigue así» al final de cada marca, con su celda por vendedora (las del borde en ámbar)',
      r.th && r.th[r.th.length-1]==='📈 SI SIGUE ASÍ' || (r.th && /Si sigue así/i.test(r.th[r.th.length-1])), [r.th, r.celdas, r.ambC]);
  chk('2d. …y arriba del total: «📈 Si siguen así, al 30/11: Bs 1.086 (para separar la plata)»', /📈 Si siguen así, al 30\/11: Bs 1\.086 \(para separar la plata\)/.test(r.ccm), r.ccm.slice(0, 900));
  chk('2e. la cuenta del cierre no cambió y no se guardó nada', r.antes===r.despues && r.guardo===0 && r.celdas>=5 && r.ambC===3, [r.antes===r.despues, r.guardo, r.celdas, r.ambC]);

  console.log('\n── 3. Solo el mes en curso y abierto; sin la bandera, nada ──');
  r = await ev(async () => {
    var o={ oct:ccmSigueDatos('2026-10') };
    var D=ccmLeer(); D.m['2026-11']={ c:Date.now(), por:'prueba', vt:[], s:{}, esc:ESC };
    STATE=FIX().concat([filaSistema(CCM_ID, 'x', JSON.stringify(D))]); o.cerrado=ccmSigueDatos('2026-11');
    STATE=FIX(); window.CCM_SIGUE_PRUEBA=0; renderProyeccion(); o.pry=document.getElementById('pry-com').innerHTML;
    ccmAbrir('2026-11'); await new Promise(function(r){ setTimeout(r, 50); }); o.cols=document.querySelectorAll('#ccm-body td.csg-c').length; o.txt=/Si siguen así/.test(_txt('#ccm-body')); ccmCerrarVentana();
    return o;
  });
  chk('3a. octubre (ya pasó) y noviembre cerrado: no hay «si sigue así»', r.oct===null && r.cerrado===null, [r.oct, r.cerrado]);
  chk('3b. sin `CCM_SIGUE_PRUEBA` (Playwright): ni la ficha ni la columna (las pruebas de siempre no cambian)', r.pry==='' && r.cols===0 && !r.txt, r);

  chk('la página no tiró errores', errores.length===0, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
