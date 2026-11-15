/* 📈 MEJORA 340 (página) — POR QUÉ SE MOVIÓ LA PROYECCIÓN, y la foto de `__pry_hist__` con las tiendas (para la 341 del servidor).

   El dueño (15/11, de la página «Mejoras 282 a 343»): del 09 al 10/11 la proyección del equipo subió Bs 108.973 y Bs 64.003 eran «la cuenta»
   (Heaven pasó de «ritmo» a «curva»), no ventas. Al lado de la proyección, una línea que lo diga.

   LO QUE ESTA PRUEBA CUIDA:
   1. `pryHistEntrada` guarda `t:{'<tienda>':[vendido, proyección]}` = las fichas «🏬 Por tienda» (`cxPryTiendas`), redondeado; `pryHistJuntar` lo conserva.
   2. `pryMovDatos`: contra la ÚLTIMA foto de un día anterior del mes — ventas nuevas (Δ vendido), la cuenta (Δ proyección − Δ vendido), qué
      marca cambió de forma; «desde ayer» o «desde el <día>».
   3. La MISMA cuenta que el WhatsApp del cierre (`waPryMov_` / `waPryMovCuenta_` del .gs) con las mismas fotos, también el «casi todo es la
      cuenta» (en gris).
   4. Lo que se ve en Proyección (`#pry-mov`), con la bandera `PRY_MOV_PRUEBA`; sin la bandera, nada (las pruebas de siempre no cambian); sin
      foto anterior o con el mes cerrado, nada.
   Datos INVENTADOS. Reloj clavado: jueves 12/11/2026 a las 10:00 de Bolivia.
   Se corre:  node tests/test_pry_mov.js   (desde la raíz del repo, con las variables de proxy de `correr.sh`) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const GS = process.env.GS || path.resolve('google-apps-script.gs');

/* Las funciones del .gs que cuentan el movimiento (puras): se sacan del archivo tal cual. */
function delGs(){
  const src=fs.readFileSync(GS,'utf8'), out={};
  const fn=(n)=>{ const i=src.indexOf('function '+n+'('); if(i<0) return ''; let k=src.indexOf('{', i), d=0, j=k; for(; j<src.length; j++){ if(src[j]==='{') d++; else if(src[j]==='}'){ d--; if(!d) break; } } return src.slice(i, j+1); };
  const c=(/var WA_PRY_MOV_CUENTA = ([0-9.]+)/.exec(src)||[])[1];
  const code='var WA_PRY_MOV_CUENTA='+c+';\n'+fn('waPryMov_')+'\n'+fn('waPryMovCuenta_')+'\nreturn { waPryMov_:waPryMov_, waPryMovCuenta_:waPryMovCuenta_, C:WA_PRY_MOV_CUENTA };';
  return (new Function(code))();
}

function PREPARAR(){
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  loadFromServer=function(){};
  var n=0;
  window.V=function(vend, fecha, reg, bs, o){
    o=o||{}; n++;
    return { id:'p'+n, oc:o.oc||((fecha||reg).slice(5,7)+'-'+(100+n)), nota:String(500+n), vendedor:vend, cliente:'CLIENTE '+n, fecha:fecha, turno:fecha?'AM':'',
             zona:o.zona||'', direccion:o.direccion||'', productos:[{desc:'COLCHON',medida:'140x190',cant:1}], saldo:bs, acuenta:0, pagado:false, metodoPago:'',
             entregado:false, ts:new Date(reg+'T10:00:00-04:00').getTime(), fotos:[] };
  };
  window.FIX=function(){
    var out=[];
    out.push(V('Maria Flores','2026-10-06','2026-10-05',3000), V('Mauricio Merida','2026-10-07','2026-10-06',5000));
    out.push(V('Maria Flores','2026-11-04','2026-11-03',6000), V('Maria Flores','2026-11-18','2026-11-10',2000));
    out.push(V('Mauricio Merida','2026-11-05','2026-11-04',5000), V('Mauricio Merida','2026-11-11','2026-11-09',5000));
    out.push(V('Carola Chavez','2026-11-06','2026-11-03',4000), V('Carola Chavez','2026-11-20','2026-11-11',4000));
    out.push(V('Andrea Orias','2026-11-17','2026-11-09',3000), V('Fabián Godoy','2026-11-10','2026-11-09',2500));
    return out;
  };
  window.HIST=function(d){ return filaSistema(PRY_HIST_ID, 'x', JSON.stringify({ v:1, d:d })); };
  window._txt=function(sel){ var e=document.querySelector(sel); return e ? e.innerText.replace(/\s+/g,' ').trim() : ''; };
}

(async () => {
  const G = delGs();
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

  console.log('\n── 1. La foto de cada día trae las tiendas (para el WhatsApp de la 341) ──');
  let r = await ev(() => {
    STATE=FIX(); var R=proyeccionMes('2026-11'), e=pryHistEntrada(R), T=cxPryTiendas(R), esp={};
    T.forEach(function(t){ esp[t.st]=[Math.round(t.vendido), Math.round(t.proy)]; });
    var J=pryHistJuntar({}, '2026-11-12', e);
    return { t:e.t, esp:esp, junta:J['2026-11-12'] && J['2026-11-12'].t, n:T.length };
  });
  chk('1a. `t` = cada tienda de «Por tienda» con [vendido, proyección] redondeados', r.n>=4 && JSON.stringify(r.t)===JSON.stringify(r.esp), [r.t, r.esp]);
  chk('1b. la Tienda Banzer (Carola + Andrea) y Buenos Aires (Maria) están, con lo vendido del mes', r.t && r.t['Tienda Banzer'] && r.t['Tienda Banzer'][0]===11000 && r.t['Buenos Aires'] && r.t['Buenos Aires'][0]===8000, r.t);
  chk('1c. `pryHistJuntar` la guarda con la foto del día', JSON.stringify(r.junta)===JSON.stringify(r.t), r.junta);

  console.log('\n── 2. La cuenta del movimiento ──');
  r = await ev(() => {
    var R=proyeccionMes('2026-11'), x=pryHistEntrada(R);
    var foto={ h:'17:05', dt:8, dr:16, v:x.v-3000, p:x.p-9000, b:{ heaven:[1,2,'c'], suena:[1,2,'r'] } };
    STATE=FIX().concat([HIST({ '2026-11-09':{ h:'17:00', v:1, p:2, b:{} }, '2026-11-11':foto })]);
    var M=pryMovDatos(proyeccionMes('2026-11'));
    return { M:M, x:{ v:x.v, p:x.p, b:x.b }, foto:foto };
  });
  chk('2a. contra la última foto de un día anterior (el 11/11, «ayer»), con su hora', r.M && r.M.de==='2026-11-11' && r.M.ayer===true && r.M.h==='17:05', r.M);
  chk('2b. subió Bs 9.000: Bs 3.000 son ventas nuevas y Bs 6.000 es la cuenta', r.M && r.M.dp===9000 && r.M.dv===3000 && r.M.cuenta===6000 && r.M.antes.p===r.foto.p && r.M.ahora.p===r.x.p, r.M);
  chk('2c. Heaven pasó de «curva» a «ritmo» (hoy las dos marcas van con el ritmo); Sueña no cambió', r.M && r.M.cambios.length===1 && r.M.cambios[0].k==='heaven' && r.M.cambios[0].de==='curva' && r.M.cambios[0].a==='ritmo' && r.x.b.heaven[2]==='r', [r.M && r.M.cambios, r.x.b]);
  chk('2d. 6.000 de 9.000 es menos del 75 %: no va en gris', r.M && r.M.gris===false, r.M && r.M.gris);

  console.log('\n── 3. La misma cuenta que el WhatsApp del cierre (waPryMov_ del .gs) ──');
  const casos = await ev(() => {
    var R=proyeccionMes('2026-11'), x=pryHistEntrada(R), out=[];
    [[3000, 9000], [500, 20000], [8000, -4000], [0, 0], [-2000, 1500]].forEach(function(q){
      var foto={ h:'17:05', v:x.v-q[0], p:x.p-q[1], b:{ heaven:[1,2,'c'], suena:[1,2,'r'] } };
      STATE=FIX().concat([HIST({ '2026-11-11':foto })]);
      var M=pryMovDatos(proyeccionMes('2026-11'));
      out.push({ M:M, d:{ '2026-11-11':foto, '2026-11-12':x } });
    });
    return out;
  });
  const CP = await ev(() => PRY_MOV_CUENTA);
  const dif = (casos||[]).filter(c => { const s=G.waPryMov_(c.d, '2026-11-12'); return !s || !c.M || s.dv!==c.M.dv || s.dp!==c.M.dp || s.cuenta!==c.M.cuenta || s.cambios.length!==c.M.cambios.length ||
    (s.cambios[0]||{}).k!==(c.M.cambios[0]||{}).k || G.waPryMovCuenta_(s)!==c.M.gris; });
  chk('3a. con 5 pares de fotos (sube, sube casi todo por la cuenta, baja por la cuenta, igual, ventas que se fueron): página = servidor (Δ, la cuenta, qué marca cambió y el gris)',
      Array.isArray(casos) && casos.length===5 && dif.length===0 && G.C===CP, dif.map(c=>[c.M, G.waPryMov_(c.d,'2026-11-12')]));
  chk('3b. 500 de ventas y 19.500 de la cuenta → gris (casi todo es la cuenta)', casos[1] && casos[1].M.gris===true && casos[1].M.cuenta===19500, casos[1] && casos[1].M);

  console.log('\n── 4. Lo que se ve en Proyección ──');
  r = await ev(() => {
    window.PRY_MOV_PRUEBA=1;
    var R0=proyeccionMes('2026-11'), x=pryHistEntrada(R0);
    STATE=FIX().concat([HIST({ '2026-11-11':{ h:'17:05', v:x.v-3000, p:x.p-9000, b:{ heaven:[1,2,'c'], suena:[1,2,'r'] } } })]);
    UNLOCKED=true; showView('conta'); segSet('cta-tab','proy'); setContaTab('proy');
    document.getElementById('pry-mes').value='2026-11'; renderProyeccion();
    var o={ t:_txt('#pry-mov'), gris:!!document.querySelector('#pry-mov .pmv-e.pmv-gris'), bar:document.querySelectorAll('#pry-mov .pmv-bar i').length,
            arriba:(function(){ var a=document.getElementById('pry-metrics'), b=document.getElementById('pry-mov'); return !!(a && b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)); })() };
    STATE=FIX().concat([HIST({ '2026-11-11':{ h:'17:05', v:x.v-500, p:x.p-20000, b:{ heaven:[1,2,'r'], suena:[1,2,'r'] } } })]); renderProyeccion();
    o.t2=_txt('#pry-mov'); o.gris2=!!document.querySelector('#pry-mov .pmv-e.pmv-gris');
    STATE=FIX().concat([HIST({ '2026-11-09':{ h:'16:00', v:x.v, p:x.p+1000, b:{} } })]); renderProyeccion(); o.t3=_txt('#pry-mov');
    STATE=FIX(); renderProyeccion(); o.sinFoto=document.getElementById('pry-mov').innerHTML;
    STATE=FIX().concat([HIST({ '2026-10-20':{ h:'17:05', v:1, p:2, b:{} } })]); document.getElementById('pry-mes').value='2026-10'; renderProyeccion(); o.cerrado=document.getElementById('pry-mov').innerHTML;
    document.getElementById('pry-mes').value='2026-11';
    STATE=FIX().concat([HIST({ '2026-11-11':{ h:'17:05', v:x.v-3000, p:x.p-9000, b:{} } })]);
    window.PRY_MOV_PRUEBA=0; renderProyeccion(); o.sinBandera=document.getElementById('pry-mov').innerHTML;
    return o;
  });
  chk('4a. debajo de las fichas: «📈 Proyección del equipo · jue 12/11», lo que decía ayer y «▲ Subió Bs 9.000 desde ayer»', r.arriba && /Proyección del equipo · jue 12\/11/.test(r.t) && /ayer decía Bs [\d.]+ \(a las 17:05\)/.test(r.t) && /▲ Subió Bs 9\.000 desde ayer/.test(r.t), r.t);
  chk('4b. «Bs 3.000 son ventas nuevas para este mes» y «Bs 6.000 es la cuenta: Heaven pasó de «curva» a «ritmo»», con la barrita de dos colores',
      /Bs 3\.000 son ventas nuevas para este mes/.test(r.t) && /Bs 6\.000 es la cuenta: Heaven pasó de «curva» a «ritmo»/.test(r.t) && r.bar===2 && !r.gris, r.t);
  chk('4c. casi todo la cuenta: la línea en gris y «Casi todo el salto es «la cuenta»: no es que se vendió más»', r.gris2 && /Casi todo el salto es «la cuenta»: no es que se vendió más/.test(r.t2), r.t2);
  chk('4d. con la foto del lunes: «▼ Bajó Bs 1.000 desde el lun 09/11» y lo que decía ese día', /▼ Bajó Bs 1\.000 desde el lun 09\/11/.test(r.t3) && /el lun 09\/11 decía/.test(r.t3), r.t3);
  chk('4e. sin una foto de un día anterior, o con el mes cerrado, no se muestra nada', r.sinFoto==='' && r.cerrado==='', [r.sinFoto, r.cerrado]);
  chk('4f. sin la bandera `PRY_MOV_PRUEBA` (Playwright), nada: las pruebas de siempre no cambian', r.sinBandera==='', r.sinBandera);

  chk('la página no tiró errores', errores.length===0, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
