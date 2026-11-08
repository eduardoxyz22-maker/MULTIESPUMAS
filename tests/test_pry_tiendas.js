/* 🏬 PROYECCIÓN → «POR TIENDA» (§4pb, 08/11/2026).

   El dueño, sobre Andrea Orias y Fabián Godoy (empezaron el 02/11): «si ya aparecen como los demás al cargar sus ventas o entregas,
   está bien que sea igual que los demás. Sólo añadiría lo de por tienda», y mandó la captura de las fichas de marca: «esa».

   LO QUE ESTA PRUEBA CUIDA (contra lo publicado antes de §4pb, sin fichas por tienda, las de §3-§5 se ponen rojas):
   1. Andrea y Fabián se proyectan IGUAL que los demás (§4gt): hasta hoy + máx(agendado, ritmo de lo entregado × días que faltan). Nada
      especial para quien empieza en el mes.
   2. Cada venta sabe su tienda (`pryVentas` → `st`): la de quien vendió ESE día (`talTiendaDe`): Carola en Central hasta el 31/10 y en la
      Tienda Banzer desde el 01/11 (`VENDEDOR_SUCURSAL_ANTES` / `VENDEDOR_SUC_DESDE`); una venta de TIENDA con la sucursal escrita va a esa
      sucursal, la venda quien la venda.
   3. `cxPryTiendas(R)`: una por tienda con ventas, unidades, lo vendido y la proyección REPARTIDA (la de cada vendedor × la parte que vendió
      en esa tienda; con Bs 0, por cantidad de ventas); la suma de las tiendas = el equipo (vendido y proyección); ordenadas de la que más
      llegaría a la que menos; el color de la marca mayoritaria; «Sin tienda» solo si hay.
   4. Lo que se ve: debajo de las fichas de marca, el título «🏬 Por tienda» y una ficha por tienda con el MISMO diseño (vendedores, N ventas ·
      u., Vendido, 📈 Llegaría a, la línea), sin scroll de costado en el iPad (1000) ni en el celular (390); un mes cerrado sin «Llegaría a».
   5. Las fichas de marca no cambian de texto, y ninguna cuenta de la proyección cambia por tener tiendas.

   Datos INVENTADOS (el repo es público). Reloj clavado: jueves 12/11/2026 a las 10:00 de Bolivia.
   Se corre:  node tests/test_pry_tiendas.js   (desde la raíz del repo, con las variables de proxy de `correr.sh`) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  try{ cargaBanner(); }catch(e){}
  loadFromServer=function(){};
  var n=0;
  /* Una venta: `bs` su total, `fecha` la entrega agendada, `reg` el día en que se cargó (10:00 de Bolivia). */
  window.V=function(vend, fecha, reg, bs, o){
    o=o||{}; n++;
    var p={ id:'p'+n, oc:o.oc||((fecha||reg).slice(5,7)+'-'+(100+n)), nota:String(500+n), vendedor:vend, cliente:o.cliente||('CLIENTE '+n), fecha:fecha, turno:fecha?'AM':'',
            zona:o.zona||'', direccion:o.direccion||'', productos:[{desc:'COLCHON',medida:'140x190',cant:(o.cant||1)}], saldo:bs, acuenta:0, pagado:false, metodoPago:'',
            entregado:false, ts:new Date(reg+'T10:00:00-04:00').getTime(), fotos:[] };
    return p;
  };
  window.FIX=function(){
    var out=[];
    /* Octubre, cerrado (pocas ventas: las marcas van con el ritmo, sin curva). Carola vendía en Central. */
    out.push(V('Maria Flores','2026-10-06','2026-10-05',3000), V('Maria Flores','2026-10-20','2026-10-19',3000));
    out.push(V('Mauricio Merida','2026-10-07','2026-10-06',5000), V('Mauricio Merida','2026-10-21','2026-10-20',5000));
    out.push(V('Carola Chavez','2026-10-15','2026-10-14',4000));
    /* Noviembre (hoy, jueves 12/11). */
    out.push(V('Maria Flores','2026-11-04','2026-11-03',6000), V('Maria Flores','2026-11-18','2026-11-10',2000));           // Buenos Aires: 6.000 hasta hoy + 2.000 agendado
    out.push(V('Mauricio Merida','2026-11-05','2026-11-04',5000), V('Mauricio Merida','2026-11-11','2026-11-09',5000));     // Mutualista: 10.000 hasta hoy
    out.push(V('Fernando Peinado','2026-11-25','2026-11-10',9000));                                                        // Charcas: todo agendado
    /* Carola: una cargada en OCTUBRE (en Central) que se entrega en noviembre, y dos de noviembre (ya en la Tienda Banzer). */
    out.push(V('Carola Chavez','2026-11-05','2026-10-28',4000,{ oc:'10-900' }));
    out.push(V('Carola Chavez','2026-11-06','2026-11-03',4000), V('Carola Chavez','2026-11-20','2026-11-11',4000));
    /* 🆕 Andrea (Tienda Banzer): todo para más adelante. Fabián (Central): una entregada y una agendada. */
    out.push(V('Andrea Orias','2026-11-17','2026-11-09',3000), V('Andrea Orias','2026-11-24','2026-11-11',2000));
    out.push(V('Fabián Godoy','2026-11-10','2026-11-09',2500), V('Fabián Godoy','2026-11-19','2026-11-11',1500));
    /* Jonathan (Mia Plaza): una entrega y una VENTA DE TIENDA con la sucursal escrita: salió de Charcas. */
    out.push(V('Jonathan Monje','2026-11-06','2026-11-05',7000));
    out.push(V('Jonathan Monje','','2026-11-07',1000,{ direccion:DIR_TIENDA+' · Charcas', zona:ZONA_TIENDA }));
    /* Isabel (Central): dos ventas SIN monto, una de ellas de tienda en Mia Plaza (el reparto va por cantidad). */
    out.push(V('Isabel Robledo','2026-11-09','2026-11-06',0));
    out.push(V('Isabel Robledo','','2026-11-06',0,{ direccion:DIR_TIENDA+' · Mia Plaza', zona:ZONA_TIENDA }));
    /* Lo que no entra: ATC, RPT, ROHO y un mayorista. */
    out.push(V('Maria Flores','2026-11-09','2026-11-06',0,{ oc:'ATC 11-001' }));
    out.push(V('Carola Chavez','2026-11-09','2026-11-06',0,{ oc:'RPT 11-001', cliente:'Tienda Banzer' }));
    out.push(V('ROHO','2026-11-09','2026-11-06',4000));
    out.push(V('Eduardo Añez','2026-11-09','2026-11-06',20000,{ cliente:'MULTICENTER' }));
    return out;
  };
  window._txt=function(sel){ var e=document.querySelector(sel); return e ? e.innerText.replace(/\s+/g,' ').trim() : ''; };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const page = await browser.newPage({ viewport:{ width:1000, height:900 }, timezoneId:'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-11-12T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(350);
  await page.evaluate(PREPARAR);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,400) }; } };

  // ═══ 1. Los nuevos, igual que los demás ══════════════════════════════════════════════════════
  console.log('\n── 1. Andrea y Fabián se proyectan como todos (dueño: «igual que los demás») ──');
  let r = await ev(() => {
    STATE=FIX();
    var R=proyeccionMes('2026-11');
    var f=function(nom){ var all=[].concat.apply([], R.marcas.map(function(m){ return m.filas; })).concat(R.sinMarca.filas);
                         return all.filter(function(x){ return mismoVendedor(x.vendedor, nom); })[0] || null; };
    var regla=function(x){ return r2(x.a + Math.max(x.b, (R.dt>0 ? x.a/R.dt : 0)*R.dr)); };
    var out={ dt:R.dt, dr:R.dr, estado:R.estado, hea:R.metodos.heaven.m, sue:R.metodos.suena.m, E:R.equipo };
    ['Andrea Orias','Fabián Godoy','Maria Flores','Carola Chavez','Fernando Peinado'].forEach(function(n){ var x=f(n); out[n]=x && { a:x.a, b:x.b, vendido:x.vendido, proy:x.proy, regla:regla(x), nuevo:x.nuevo }; });
    return out;
  });
  chk('jueves 12/11: pasaron 9 días hábiles (el 2 fue Todos Santos) y faltan 15; las dos marcas van con el ritmo (pocas ventas de historia)',
      r.dt===9 && r.dr===15 && r.estado==='curso' && r.hea==='ritmo' && r.sue==='ritmo', [r.dt, r.dr, r.estado, r.hea, r.sue, r.__error]);
  chk('Andrea (empezó este mes, todo agendado): hasta hoy 0 → su ritmo es 0 y la proyección es lo agendado, Bs 5.000 — la MISMA regla que todos, sin marca de «nuevo»',
      r['Andrea Orias'] && r['Andrea Orias'].a===0 && r['Andrea Orias'].b===5000 && r['Andrea Orias'].proy===5000 && r['Andrea Orias'].proy===r['Andrea Orias'].regla && r['Andrea Orias'].nuevo==null, r['Andrea Orias']);
  chk('Fabián: 2.500 hasta hoy + máx(1.500, 2.500 ÷ 9 × 15 = 4.166,67) = Bs 6.666,67, con la regla de siempre',
      r['Fabián Godoy'] && r['Fabián Godoy'].proy===6666.67 && r['Fabián Godoy'].proy===r['Fabián Godoy'].regla, r['Fabián Godoy']);
  chk('…y los de siempre también (Maria 6.000 + 10.000 = 16.000; Carola 8.000 + 13.333,33; Fernando solo lo agendado, 9.000)',
      r['Maria Flores'] && r['Maria Flores'].proy===16000 && r['Carola Chavez'] && r['Carola Chavez'].proy===21333.33 && r['Fernando Peinado'] && r['Fernando Peinado'].proy===9000
      && [r['Maria Flores'], r['Carola Chavez'], r['Fernando Peinado']].every(function(x){ return x.proy===x.regla; }), [r['Maria Flores'], r['Carola Chavez'], r['Fernando Peinado']]);

  // ═══ 2. Cada venta sabe su tienda ════════════════════════════════════════════════════════════
  console.log('\n── 2. La tienda de cada venta (`st` de pryVentas) ──');
  r = await ev(() => {
    var V=pryVentas().filter(function(x){ return x.ym==='2026-11'; }), o={};
    V.forEach(function(x){ (o[x.v]=o[x.v]||[]).push([x.reg, x.st, x.bs, x.amb]); });
    return o;
  });
  chk('Carola: la cargada el 28/10 (se entrega en noviembre) es de CENTRAL, donde vendía; las de noviembre, de la Tienda Banzer',
      r['Carola Chavez'] && r['Carola Chavez'].filter(function(x){ return x[0]==='2026-10-28' && x[1]==='Central'; }).length===1
      && r['Carola Chavez'].filter(function(x){ return x[0]>='2026-11-01' && x[1]==='Tienda Banzer'; }).length===2, r['Carola Chavez']);
  chk('Jonathan: su entrega es de Mia Plaza, pero la venta de tienda «SALIÓ DE TIENDA · Charcas» es de CHARCAS (la sucursal escrita manda)',
      r['Jonathan Monje'] && r['Jonathan Monje'].some(function(x){ return x[1]==='Mia Plaza' && x[2]===7000; }) && r['Jonathan Monje'].some(function(x){ return x[1]==='Charcas' && x[2]===1000; }), r['Jonathan Monje']);
  chk('Andrea → Tienda Banzer, Fabián → Central, Maria → Buenos Aires; el mayorista no lleva tienda',
      r['Andrea Orias'].every(function(x){ return x[1]==='Tienda Banzer'; }) && r['Fabián Godoy'].every(function(x){ return x[1]==='Central'; })
      && r['Maria Flores'].every(function(x){ return x[1]==='Buenos Aires'; }) && r['Eduardo Añez'].every(function(x){ return x[3]==='mayor' && x[1]===''; }), [r['Andrea Orias'], r['Fabián Godoy'], r['Eduardo Añez']]);

  // ═══ 3. La cuenta por tienda ═════════════════════════════════════════════════════════════════
  console.log('\n── 3. cxPryTiendas: reparto, suma y orden ──');
  r = await ev(() => {
    var R=proyeccionMes('2026-11'), T=cxPryTiendas(R), o={ E:R.equipo, orden:T.map(function(t){ return t.k; }), sumaP:0, sumaV:0, n:0, u:0 };
    T.forEach(function(t){ o.sumaP=r2(o.sumaP+t.proy); o.sumaV=r2(o.sumaV+t.vendido); o.n+=t.n; o.u+=t.u; o[t.k]={ vendido:t.vendido, proy:t.proy, n:t.n, u:t.u, vend:t.vendedores, marca:t.marca, col:t.col }; });
    var hea=MARCAS.filter(function(g){ return g.k==='heaven'; })[0], sue=MARCAS.filter(function(g){ return g.k==='suena'; })[0];
    o.colHea=hea.col; o.colSue=sue.col;
    return o;
  });
  chk('hay 6 tiendas y ninguna «Sin tienda»: Buenos Aires, Central, Tienda Banzer, Mutualista, Charcas y Mia Plaza', r.orden && r.orden.length===6 && r.orden.indexOf('Sin tienda')<0
      && ['Buenos Aires','Central','Tienda Banzer','Mutualista','Charcas','Mia Plaza'].every(function(k){ return r.orden.indexOf(k)>=0; }), r.orden);
  chk('la suma de las tiendas es EXACTAMENTE el equipo: vendido y proyección (y ventas y unidades)',
      r.E && Math.abs(r.sumaV-r.E.vendido)<0.05 && Math.abs(r.sumaP-r.E.proy)<0.05 && r.n===r.E.n && r.u===r.E.u, [r.sumaV, r.sumaP, r.E, r.n, r.u]);
  chk('Tienda Banzer = Carola (sus 2 de noviembre, 8.000) + Andrea (5.000): vendido Bs 13.000; proyección = 2/3 de la de Carola (14.222,22) + la de Andrea (5.000) = Bs 19.222,22',
      r['Tienda Banzer'] && r['Tienda Banzer'].vendido===13000 && r['Tienda Banzer'].proy===19222.22 && r['Tienda Banzer'].vend.join('|')==='Andrea Orias|Carola Chavez', r['Tienda Banzer']);
  chk('Central = la de Carola de octubre (4.000, 1/3 de su proyección: 7.111,11) + Fabián (4.000 → 6.666,67) + Isabel (0): vendido Bs 8.000, llegaría a Bs 13.777,78',
      r['Central'] && r['Central'].vendido===8000 && r['Central'].proy===13777.78 && r['Central'].vend.join('|')==='Carola Chavez|Fabián Godoy|Isabel Robledo', r['Central']);
  chk('Jonathan vendió 8.000 (7.000 en Mia Plaza y la de tienda de 1.000 en Charcas) → proyección 21.333,33 repartida 7/8 y 1/8: Charcas = Fernando 9.000 + 2.666,67 = Bs 11.666,67 (vendido 10.000); Mia Plaza = 18.666,67 + Isabel 0 (vendido 7.000; el centavo del redondeo de la parte de Jonathan)',
      r['Charcas'] && r['Charcas'].vendido===10000 && r['Charcas'].proy===11666.67 && r['Mia Plaza'] && r['Mia Plaza'].vendido===7000 && Math.abs(r['Mia Plaza'].proy-18666.67)<0.02
      && r['Mia Plaza'].vend.join('|')==='Isabel Robledo|Jonathan Monje', [r['Charcas'], r['Mia Plaza']]);
  chk('Isabel vendió Bs 0 en dos tiendas: se cuenta por cantidad de ventas (1 y 1), sin dividir por cero', r['Central'] && r['Central'].n===4 && r['Mia Plaza'].n===2, [r['Central'].n, r['Mia Plaza'].n]);
  chk('ordenadas de la que más llegaría a la que menos: Mutualista (26.667) · Tienda Banzer (19.222) · Mia Plaza (18.667) · Buenos Aires (16.000) · Central (13.778) · Charcas (11.667)',
      r.orden && r.orden.join('|')==='Mutualista|Tienda Banzer|Mia Plaza|Buenos Aires|Central|Charcas', r.orden);
  chk('el color es el de la marca de la mayoría: Tienda Banzer y Central turquesa (Heaven), Mutualista amarillo (Sueña); Charcas (1 Sueña, 1 Heaven) sale con el de Sueña, la primera que llegó al empate',
      r['Tienda Banzer'].col===r.colHea && r['Central'].col===r.colHea && r['Mutualista'].col===r.colSue && r['Charcas'].marca, [r['Tienda Banzer'].col, r['Mutualista'].col, r['Charcas'].marca]);

  // ═══ 4. Lo que se ve ═════════════════════════════════════════════════════════════════════════
  console.log('\n── 4. Las fichas «🏬 Por tienda» en la pestaña ──');
  r = await ev(() => {
    showView('conta');
    localStorage.setItem(LS_ADMIN, sha256('clave-de-prueba'));
    document.getElementById('admin-pass').value='clave-de-prueba'; tryUnlock();
    segSet('cta-tab','proy'); setContaTab('proy');
    document.getElementById('pry-mes').value='2026-11'; renderProyeccion();
    var box=document.getElementById('cx-pry'), marcas=box.querySelectorAll('.cx-kfs:not(.cx-kfs-t) .cx-kf'), tiendas=box.querySelectorAll('.cx-kf-t');
    var tit=document.getElementById('cx-pry-tiendas');
    return { unlocked:UNLOCKED, nMarcas:marcas.length, nTiendas:tiendas.length, tit:tit ? tit.innerText.replace(/\s+/g,' ').trim() : '',
             titArriba: tit && marcas.length ? (marcas[marcas.length-1].compareDocumentPosition(tit) & Node.DOCUMENT_POSITION_FOLLOWING)>0 : false,
             t0:tiendas[0] ? tiendas[0].innerText.replace(/\s+/g,' ').trim() : '', t0c:tiendas[0] ? tiendas[0].style.getPropertyValue('--c') : '',
             t0svg:tiendas[0] ? !!tiendas[0].querySelector('svg polyline') : false, t0punt:tiendas[0] ? !!tiendas[0].querySelector('svg line[stroke-dasharray]') : false,
             m0:marcas[0] ? marcas[0].innerText.replace(/\s+/g,' ').trim() : '',
             tBz:(tiendas[1]||{ style:{ getPropertyValue:function(){ return ''; } } }).style.getPropertyValue('--c'), tBzTxt:tiendas[1] ? tiendas[1].innerText.replace(/\s+/g,' ').trim() : '',
             scroll:document.documentElement.scrollWidth>document.documentElement.clientWidth, anchoCol:getComputedStyle(tiendas[0]||document.body).width };
  });
  chk('con la contraseña: las 2 fichas de marca siguen, y debajo el título «🏬 Por tienda» con 6 fichas', r.unlocked && r.nMarcas===2 && r.nTiendas===6 && /🏬 Por tienda/i.test(r.tit) && r.titArriba, [r.nMarcas, r.nTiendas, r.tit, r.titArriba, r.__error]);
  chk('la primera ficha es Mutualista: su vendedor, «2 ventas · 2 u.», «Vendido Bs 10.000» y «📈 Llegaría a Bs 26.667», con la línea llena y la punteada',
      /^🏬 Mutualista 2 ventas · 2 u\. Mauricio Merida Vendido Bs 10\.000 📈 Llegaría a Bs 26\.667/.test(r.t0) && r.t0svg && r.t0punt, r.t0);
  chk('…con el color de Sueña (la marca de sus ventas); la Tienda Banzer, con el de Heaven', /#FFD400/i.test(r.t0c) && /#00B5AD/i.test(r.tBz), [r.t0c, r.tBz]);
  chk('la Tienda Banzer dice sus dos vendedoras: «🏬 Tienda Banzer 4 ventas · 4 u. Andrea Orias · Carola Chavez Vendido Bs 13.000 📈 Llegaría a Bs 19.222»',
      /^🏬 Tienda Banzer 4 ventas · 4 u\. Andrea Orias · Carola Chavez Vendido Bs 13\.000 📈 Llegaría a Bs 19\.222/.test(r.tBzTxt), r.tBzTxt);
  chk('la ficha de marca no cambió de texto: «🛏️ Sueña N ventas · N u. Vendido … 📈 Llegaría a …» (y la meta)', /^🛏️ Sueña \d+ ventas · \d+ u\. Vendido Bs [\d.]+ 📈 Llegaría a Bs [\d.]+/.test(r.m0) && /línea llena = lo vendido según el día en que se cargó; punteada = la proyección/.test(r.m0), r.m0);
  chk('en el iPad (1000 px) no hay scroll de costado', !r.scroll, r.anchoCol);

  await page.setViewportSize({ width:390, height:844 });
  r = await ev(() => { renderProyeccion(); var t=document.querySelectorAll('#cx-pry .cx-kf-t');
    return { n:t.length, scroll:document.documentElement.scrollWidth>document.documentElement.clientWidth, w:t[0] ? t[0].getBoundingClientRect().width : 0, vw:document.documentElement.clientWidth }; });
  chk('en el celular (390 px): las 6 fichas, una por fila, sin scroll de costado', r.n===6 && !r.scroll && r.w>300 && r.w<=r.vw, r);
  await page.setViewportSize({ width:1000, height:900 });

  // ═══ 5. Un mes cerrado, y sin ventas ═════════════════════════════════════════════════════════
  console.log('\n── 5. Octubre (cerrado) y un mes sin tiendas ──');
  r = await ev(() => {
    document.getElementById('pry-mes').value='2026-10'; renderProyeccion();
    var t=document.querySelectorAll('#cx-pry .cx-kf-t'), txt=document.getElementById('cx-pry').innerText.replace(/\s+/g,' ').trim();
    var R=proyeccionMes('2026-10'), T=cxPryTiendas(R), o={ n:t.length, llega:/Llegaría/.test(txt), central:T.filter(function(x){ return x.k==='Central'; })[0] };
    o.sumaP=r2(T.reduce(function(s,x){ return s+x.proy; },0)); o.E=R.equipo.vendido;
    document.getElementById('pry-mes').value='2026-12'; renderProyeccion(); o.dic=document.getElementById('cx-pry').innerHTML;
    STATE=[]; document.getElementById('pry-mes').value='2026-11'; renderProyeccion(); o.vacio=document.getElementById('cx-pry').innerHTML;
    return o;
  });
  chk('octubre cerrado: 3 tiendas (Buenos Aires, Mutualista y Central, donde Carola vendía), sin «Llegaría a», y la proyección de cada una es lo vendido (suman el equipo)',
      r.n===3 && !r.llega && r.central && r.central.vendido===4000 && r.central.vendedores.join('|')==='Carola Chavez' && r.sumaP===r.E, [r.n, r.llega, r.central, r.sumaP, r.E]);
  chk('diciembre (sin ventas) y un panel vacío: nada en la caja', r.dic==='' && r.vacio==='', [r.dic.slice(0,80), r.vacio.slice(0,80)]);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
