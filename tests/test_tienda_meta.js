/* 🎯 MEJORA 333 — CADA TIENDA CONTRA SU META, en Proyección.

   El dueño (15/11): las fichas de tienda decían lo vendido y la proyección, pero no contra qué; «esa cuenta hoy se hace a mano, vendedora por
   vendedora». Ahora, debajo de «🏬 Por tienda», una barra por tienda contra la suma de la meta de su gente.

   LO QUE ESTA PRUEBA CUIDA:
   1. La meta de una tienda = la suma de la meta GUARDADA de sus vendedoras (el presupuesto; si no tiene, la mínima). Quien no vendió nada, en la
      suya de la lista; quien no tiene tienda en la lista y vendió en dos, reparte su meta en proporción a lo vendido en cada una.
   2. Lo vendido y la proyección son los de `cxPryTiendas` (nada aparte); «faltan Bs X por día hábil» = (meta − vendido) ÷ los días que quedan.
   3. Verde si llega, ámbar si está cerca (90 %), rojo si no; de la que mejor va a la que más le falta; tocar una abre su gente.
   4. Sin metas guardadas lo dice; con el mes cerrado, lo vendido contra la meta; sin la bandera `PRY_TMETA_PRUEBA`, nada.
   Datos INVENTADOS. Reloj clavado: jueves 12/11/2026 a las 10:00 de Bolivia.
   Se corre:  node tests/test_tienda_meta.js */
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
  var n=0;
  window.V=function(vend, fecha, reg, bs, o){ o=o||{}; n++;
    return { id:'p'+n, oc:(fecha||reg).slice(5,7)+'-'+(100+n), nota:String(500+n), vendedor:vend, cliente:'CLIENTE '+n, fecha:fecha, turno:fecha?'AM':'', zona:o.zona||'', direccion:o.direccion||'',
             productos:[{desc:'COLCHON',medida:'140x190',cant:1}], saldo:bs, acuenta:0, pagado:false, metodoPago:'', entregado:false, ts:new Date(reg+'T10:00:00-04:00').getTime(), fotos:[] }; };
  window.METAS=function(m){ return filaSistema(META_ID, 'x', JSON.stringify({ v:1, m:m })); };
  window.VD={ 'Maria Flores':[10000,15000], 'Mauricio Merida':[20000,0], 'Carola Chavez':[10000,12000], 'Andrea Orias':[5000,6000], 'Fabián Godoy':[3000,4000],
              'Isabel Robledo':[5000,6000], 'Pedro Inventado':[0,10000] };
  window.FIX=function(){ return [
    V('Maria Flores','2026-10-06','2026-10-05',3000), V('Mauricio Merida','2026-10-07','2026-10-06',5000), V('Carola Chavez','2026-10-15','2026-10-14',4000),
    V('Maria Flores','2026-11-04','2026-11-03',6000), V('Maria Flores','2026-11-18','2026-11-10',2000),
    V('Mauricio Merida','2026-11-05','2026-11-04',5000), V('Mauricio Merida','2026-11-11','2026-11-09',5000),
    V('Carola Chavez','2026-11-06','2026-11-03',4000), V('Carola Chavez','2026-11-20','2026-11-11',4000), V('Andrea Orias','2026-11-17','2026-11-09',3000),
    V('Fabián Godoy','2026-11-10','2026-11-09',2500),
    V('Pedro Inventado','','2026-11-07',700,{ direccion:DIR_TIENDA+' · Carmelo', zona:ZONA_TIENDA }), V('Pedro Inventado','','2026-11-09',300,{ direccion:DIR_TIENDA+' · Charcas', zona:ZONA_TIENDA })
  ]; };
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

  console.log('\n── 1. La meta de cada tienda ──');
  let r = await ev(() => {
    STATE=FIX().concat([METAS({ '2026-11':{ heaven:40000, suena:20000, t:1, vd:VD } })]);
    var R=proyeccionMes('2026-11'), T=cxPryTiendas(R), D=pryTMetaDatos(R, T), o={ ok:D.ok, dq:D.dq, esp:R.dr+(diaHabil(R.hoy)?1:0), orden:D.filas.map(function(e){ return e.k; }) };
    D.filas.forEach(function(e){ var t=T.filter(function(z){ return z.st===e.st; })[0]||{};
      o[e.k]={ meta:e.meta, vendido:e.vendido, proy:e.proy, tv:t.vendido, tp:t.proy, pp:Math.round(e.pp||0), est:e.est, porDia:Math.round(e.porDia||0), vends:e.vends.map(function(v){ return [v.v, v.meta, v.parte]; }) }; });
    return o;
  });
  chk('1a. con las metas guardadas: Buenos Aires = la de Maria (su presupuesto, 15.000); Mutualista = la mínima de Mauricio (sin presupuesto, 20.000)',
      r.ok && r['Buenos Aires'] && r['Buenos Aires'].meta===15000 && r['Mutualista'] && r['Mutualista'].meta===20000, [r['Buenos Aires'], r['Mutualista']]);
  chk('1b. Tienda Banzer = Carola (12.000) + Andrea (6.000) = 18.000; Central = Fabián (4.000) + Isabel, que no vendió nada (6.000, por su tienda de la lista) = 10.000',
      r['Tienda Banzer'] && r['Tienda Banzer'].meta===18000 && r['Central'] && r['Central'].meta===10000 && r['Central'].vends.some(function(v){ return v[0]==='Isabel Robledo' && v[1]===6000; }), [r['Tienda Banzer'], r['Central']]);
  chk('1c. Pedro, sin tienda en la lista, vendió 700 en Carmelo y 300 en Charcas: su meta (10.000) se reparte 7.000 y 3.000, y se dice que es «la parte»',
      r['Carmelo'] && r['Carmelo'].meta===7000 && r['Charcas'] && r['Charcas'].meta===3000 && r['Carmelo'].vends[0][2]===true, [r['Carmelo'], r['Charcas']]);
  chk('1d. lo vendido y la proyección de cada tienda son los de cxPryTiendas', ['Buenos Aires','Mutualista','Tienda Banzer','Central','Carmelo','Charcas'].every(function(k){ return r[k] && r[k].vendido===r[k].tv && r[k].proy===r[k].tp; }), r);
  chk('1e. «faltan por día» = (meta − vendido) ÷ los días hábiles que quedan, contando hoy ('+r.esp+')',
      r.dq===r.esp && r['Tienda Banzer'].porDia===Math.round((18000-r['Tienda Banzer'].vendido)/r.esp), [r.dq, r['Tienda Banzer']]);
  chk('1f. de la que mejor va a la que más le falta (por la proyección contra la meta)', r.orden && r.orden.every(function(k, i){ return !i || (r[r.orden[i-1]].pp>=r[k].pp); }), r.orden.map(function(k){ return k+' '+r[k].pp; }));
  chk('1g. verde llega (≥100 %), ámbar cerca (≥90 %), rojo no llega', r.orden.every(function(k){ var e=r[k]; return e.est===(e.pp>=100 ? 'ok' : (e.pp>=90 ? 'cerca' : 'mal')) || (e.pp===100 || e.pp===90); }), r.orden.map(function(k){ return [k, r[k].pp, r[k].est]; }));

  console.log('\n── 2. Lo que se ve ──');
  r = await ev(async () => {
    window.PRY_TMETA_PRUEBA=1; UNLOCKED=true;
    showView('conta'); segSet('cta-tab','proy'); setContaTab('proy');
    STATE=FIX().concat([METAS({ '2026-11':{ heaven:40000, suena:20000, t:1, vd:VD } })]);
    document.getElementById('pry-mes').value='2026-11'; renderProyeccion();
    var box=document.getElementById('pry-tmeta'), tiendas=document.getElementById('cx-pry-tiendas'), rows=box ? box.querySelectorAll('details.ptm-r') : [];
    var o={ t:_txt('#pry-tmeta'), n:rows.length, abajo:!!(box && tiendas && (tiendas.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING)), raya:!!(box && box.querySelector('.ptm-b u')),
            barras:box ? box.querySelectorAll('.ptm-r .ptm-bv').length : 0, abierto0:rows[0] ? rows[0].open : null };
    var c=null; for(var i=0;i<rows.length;i++) if(rows[i].getAttribute('data-st')==='Central') c=rows[i];
    if(c){ c.querySelector('summary').click(); o.abre=c.open; o.vs=c.querySelector('.ptm-vs').innerText.replace(/\s+/g,' '); }
    await new Promise(function(res){ setTimeout(res, 60); });   // el «toggle» llega un momento después
    renderProyeccion(); var c2=document.querySelector('#pry-tmeta details[data-st="Central"]'); o.sigueAbierto=c2 ? c2.open : null;
    o.scroll=document.documentElement.scrollWidth>document.documentElement.clientWidth;
    return o;
  });
  chk('2a. debajo de «🏬 Por tienda»: «🎯 Cada tienda contra su meta · noviembre», una fila por tienda con barra y la raya de la meta', r.abajo && /🎯 Cada tienda contra su meta · noviembre/.test(r.t) && r.n===6 && r.barras===6 && r.raya, [r.n, r.barras, r.t.slice(0,200)]);
  chk('2b. cada fila: «vendido Bs X · 📈 Bs Y de Bs META» y «faltan Bs Z por día hábil» o «llega ✅»', /vendido Bs [\d.]+ · 📈 Bs [\d.]+ de Bs 18\.000 · faltan Bs [\d.]+ por día hábil/.test(r.t) && /llega ✅/.test(r.t), r.t);
  chk('2c. tocar Central abre su gente: Fabián con su meta y Isabel (sin ventas) con la suya; queda abierta al repintar', r.abre===true && /Fabián Godoy/.test(r.vs) && /Isabel Robledo/.test(r.vs) && /🎯 Bs 6\.000/.test(r.vs) && r.sigueAbierto===true, r.vs);
  chk('2d. sin scroll de costado a 1366', r.scroll===false, r.scroll);

  console.log('\n── 3. Sin metas guardadas, mes cerrado y sin la bandera ──');
  r = await ev(() => {
    STATE=FIX().concat([METAS({ '2026-11':{ heaven:40000, t:1 } })]); renderProyeccion();
    var o={ sin:_txt('#pry-tmeta') };
    STATE=FIX().concat([METAS({ '2026-10':{ heaven:40000, t:1, vd:{ 'Maria Flores':[2000,2500], 'Carola Chavez':[3000,5000], 'Mauricio Merida':[4000,6000] } } })]);
    document.getElementById('pry-mes').value='2026-10'; renderProyeccion();
    o.oct=_txt('#pry-tmeta'); var D=pryTMetaDatos(proyeccionMes('2026-10')); o.octF=D.filas.map(function(e){ return [e.k, e.vendido, e.proy, e.meta, e.est]; });
    document.getElementById('pry-mes').value='2026-11';
    window.PRY_TMETA_PRUEBA=0; STATE=FIX().concat([METAS({ '2026-11':{ heaven:40000, suena:20000, t:1, vd:VD } })]); renderProyeccion(); o.sinBandera=!!document.getElementById('pry-tmeta');
    return o;
  });
  chk('3a. sin las metas de las vendedoras guardadas lo dice (no mide contra una sugerencia)', /guardá las metas de cada vendedora de noviembre/.test(r.sin), r.sin);
  chk('3b. octubre (cerrado): lo vendido contra la meta, sin «si sigue así»; Buenos Aires llegó (3.000 de 2.500) y Mutualista no (5.000 de 6.000)',
      /El mes cerró: lo vendido contra la meta/.test(r.oct) && !/si sigue así/.test(r.oct) && r.octF.some(function(f){ return f[0]==='Buenos Aires' && f[4]==='ok'; }) && r.octF.some(function(f){ return f[0]==='Mutualista' && f[4]==='mal'; }), [r.oct.slice(0,300), r.octF]);
  chk('3c. sin `PRY_TMETA_PRUEBA` (Playwright) no aparece: las pruebas de siempre no cambian', r.sinBandera===false, r.sinBandera);

  chk('la página no tiró errores', errores.length===0, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
