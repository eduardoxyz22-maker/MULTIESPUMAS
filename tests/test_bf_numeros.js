/* 🛍️ «BLACK FRIDAY EN NÚMEROS» (13/11/2026, mejora 177). El dueño: una ficha en Contabilidad → Proyección (solo con la contraseña) mientras
   dura la campaña de Black Friday y unos días después: lo vendido cada día de la campaña contra los mismos días hábiles de antes, por marca y
   por vendedor, en Bs y en unidades; al terminar, el resumen («la campaña vendió Bs X, +N % contra los 15 días hábiles de antes»), quien más
   vendió y los productos más vendidos. SOLO MIRA.

   ⚠️ LO QUE ESTA PRUEBA CUIDA
   1. Los días salen de `bfCampana(año)` del <head> (la MISMA cuenta de `BF_DIAS` que prende el tema): 2026 del 13 al 30/11 (viernes 27/11),
      2027 del 12 al 29/11; y el tema no cambió (12/11 Todos Santos, 13/11 Black Friday, 01/12/2030 Navidad aunque la campaña de 2030
      termine el 02/12).
   2. Antes de la campaña no se ve nada (tampoco con `?tema=black-friday`); se ve desde el primer día y hasta 7 días después del último.
   3. Durante (miércoles 18/11, 15:00): van 5 días hábiles; se compara con los 5 días hábiles de antes (07/11 al 12/11, con el domingo 8
      adentro) y el 12/11 cuenta hasta las 15:00. Por el día de CARGA (la venta para diciembre cargada el 16/11 entra; la cargada el 06/11
      para entregar el 20/11, no); sin ATC, RPT ni ROHO; mayoristas aparte; el domingo de la campaña suma. Equipo 14.000 / 7 u. contra
      7.500 / 4 u. → +87 % y +75 %; Heaven 10.000 contra 4.500, Sueña 4.000 contra 3.000; por vendedor, ordenado.
   4. Una sola verdad: el total de la campaña es la suma de `ventaTotal` de las ventas del equipo con `contaFecha` en la campaña.
   5. Lo que se ve: la ficha, las barras día por día (Bs / Unidades), la línea de antes, tocar un día, la lista por marca y vendedor.
   6. Después (jueves 03/12): los 15 días hábiles de antes (26/10 al 12/11, sin el feriado del 02/11), el resumen arriba (Bs 23.500,
      +12 %), quien más vendió (Mirian) y los productos más vendidos; lo cargado el 01/12 ya no cuenta. El 07/12 se ve; el 08/12, no.
   7. En el celular (390) y en el iPad parado (820) no hay scroll de costado; con el tema prendido la ficha es negra con dorado.
   Datos SINTÉTICOS. Se corre:  node tests/test_bf_numeros.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  loadFromServer=function(){}; apiList=function(){ return Promise.resolve({ ok:true, pedidos:[] }); };
  var cb=document.getElementById('carga-banner'); if(cb) cb.style.display='none';
  var n=0;
  /* Una venta: `bs` su total, `fecha` la entrega agendada, `reg` cuándo se cargó ('AAAA-MM-DDTHH:MM', hora de Bolivia). */
  window.V=function(vend, fecha, bs, reg, o){
    o=o||{}; n++;
    var t=new Date(reg+':00-04:00').getTime();
    return Object.assign({ id:'p'+n, oc:'11-'+(100+n), nota:String(500+n), vendedor:vend, cliente:'CLIENTE '+n, celular:'70000000', zona:'Norte', direccion:'Calle Ejemplo 1',
      fecha:fecha, turno:'AM', productos:[{desc:'COLCHON SOFT',medida:'140x190',cant:1,precio:bs}], saldo:bs, acuenta:0, pagado:false, metodoPago:'', entregado:false,
      ts:t, rev:t, fotos:[] }, o);
  };
  window.FIX=function(){ n=0; return [
    /* ── La campaña (13/11 al 30/11) ── */
    V('Mirian Salazar','2026-11-16',3000,'2026-11-13T10:00'),                                                         // vie 13, Heaven, 1 u.
    V('Maria Flores','2026-11-17',2000,'2026-11-14T11:00', { productos:[{desc:'COLCHON SOFT',medida:'140x190',cant:2,precio:1000}] }),   // sáb 14, 2 u.
    V('Mauricio Merida','2026-11-18',1500,'2026-11-15T12:00'),                                                        // DOMINGO 15: suma igual
    V('Mauricio Merida','2026-11-20',2500,'2026-11-18T09:00', { productos:[{desc:'COMBO COLCHON Y SOMIER',medida:'140x190',cant:1,precio:2500}] }),  // un combo = 2 u.
    V('Isabel Robledo','2026-11-19',1000,'2026-11-17T16:00', { productos:[{desc:'ALMOHADA FIBRA',medida:'50x70',cant:4,precio:250}] }),            // almohadas: 0 u.
    V('Mirian Salazar','2026-12-03',4000,'2026-11-16T10:00'),                                                         // para DICIEMBRE: cuenta por la carga
    V('Eduardo Añez','2026-11-17',10000,'2026-11-16T10:00', { cliente:'MULTICENTER' }),                              // mayorista: aparte
    V('Mirian Salazar','2026-11-16',0,'2026-11-14T10:00', { oc:'ATC 11-001', saldo:0 }),                              // ATC: no es venta
    V('Isabel Robledo','2026-11-16',0,'2026-11-14T10:00', { oc:'RPT 11-002', cliente:'Central', saldo:0 }),           // reposición: no es venta
    V('ROHO','2026-11-19',0,'2026-11-14T10:00', { cliente:'ROHO', saldo:0 }),                                         // ROHO: aparte (en unidades)
    /* ── Antes (los 5 días hábiles del 07 al 12/11; con todo terminado, los 15 desde el 26/10) ── */
    V('Mirian Salazar','2026-11-09',2000,'2026-11-07T10:00'),
    V('Maria Flores','2026-11-10',1000,'2026-11-08T12:00'),                                                           // DOMINGO 8, adentro del tramo
    V('Mauricio Merida','2026-11-11',3000,'2026-11-10T10:00'),
    V('Maria Flores','2026-11-13',1500,'2026-11-12T14:00'),                                                           // el 12 a las 14:00: antes de las 15
    V('Isabel Robledo','2026-11-14',2500,'2026-11-12T17:00'),                                                         // el 12 a las 17:00: «a esta altura» (15:00) todavía no
    V('Eduardo Añez','2026-11-12',5000,'2026-11-10T10:00', { cliente:'MULTICENTER' }),
    V('Mirian Salazar','2026-11-20',9999,'2026-11-06T10:00'),                                                         // cargada el 06/11 para entregar en la campaña: NO es de la campaña
    V('Maria Flores','2026-10-28',1000,'2026-10-26T09:00'),                                                           // lunes 26/10: el primero de los 15 de antes
    V('Maria Flores','2026-10-27',777,'2026-10-25T09:00'),                                                            // domingo 25/10: antes de los 15
    /* ── Lo que se cargó después de la mañana del 18/11 (solo para el «después») ── */
    V('Carola Chavez','2026-11-30',6000,'2026-11-27T11:00', { productos:[{desc:'COLCHON TITANIO LATEX',medida:'160x190',cant:2,precio:3000}] }),   // el viernes de Black Friday
    V('Jonathan Monje','2026-12-02',3500,'2026-11-30T18:00', { productos:[{desc:'SOMIER BASE',medida:'140x190',cant:1,precio:3500}] }),          // el «Cyber Monday»
    V('Mirian Salazar','2026-12-04',5000,'2026-12-01T10:00')                                                          // 01/12: ya terminó
  ]; };
  /* «Durante» (18/11 15:00): las ventas cargadas DESPUÉS de ese momento no existen todavía. */
  window.FIX_HASTA=function(t){ return FIX().filter(function(p){ return p.ts<=t; }); };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  async function abrir(fecha, w, h, q){
    const ctx = await browser.newContext({ viewport:{ width:w||1280, height:h||900 }, timezoneId:'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r=>r.abort());
    const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
    await page.clock.setFixedTime(new Date(fecha));
    await page.goto('file://' + PEDIDOS + (q||'?tema=espuma'), { waitUntil:'load' }); await page.waitForTimeout(350);
    await page.evaluate(PREPARAR);
    await page.evaluate(() => { STATE=FIX_HASTA(Date.now()); UNLOCKED=true; try{ updateStats(); }catch(e){} });
    page._ctx=ctx; return page;
  }
  const ev = async (page, fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  const proy = (ym) => { showView('conta'); segSet('cta-tab','proy'); setContaTab('proy'); var i=document.getElementById('pry-mes'); i.value=ym||diaNegocio().slice(0,7); renderProyeccion(); };
  const PROY = 'window.__proy='+proy.toString()+';';
  let page, r;

  console.log('\n── 1. Los días de la campaña salen de la misma cuenta que el tema ──');
  page = await abrir('2026-11-12T10:00:00-04:00', 1280, 900, '?x=1');   // sin ?tema: el que elige la fecha
  r = await ev(page, () => ({ a26:bfCampana(2026), a27:bfCampana(2027), a30:bfCampana(2030), dias:BF_DIAS, tema:document.documentElement.className, panel:bfnCampana('2026') }));
  chk('2026: del viernes 13/11 al lunes 30/11 (el viernes de Black Friday es el 27/11)', r.a26 && r.a26.desde==='2026-11-13' && r.a26.hasta==='2026-11-30' && r.a26.viernes==='2026-11-27', r.a26);
  chk('2027: del 12/11 al 29/11 (viernes 26/11); y el panel la lee con `bfnCampana`', r.a27 && r.a27.desde==='2027-11-12' && r.a27.hasta==='2027-11-29' && r.a27.viernes==='2027-11-26' && r.panel && r.panel.desde==='2026-11-13', [r.a27, r.panel]);
  chk('`BF_DIAS` sigue [-14, 3] (el mismo del <head> de panel_template.html)', Array.isArray(r.dias) && r.dias[0]===-14 && r.dias[1]===3, r.dias);
  chk('el 12/11 sigue Todos Santos (el tema no cambió)', /tema-todos-santos/.test(r.tema) && !/tema-black-friday/.test(r.tema), r.tema);
  await page._ctx.close();
  for (const [f, t, l] of [['2026-11-13T00:01:00-04:00','black-friday','13/11 00:01'], ['2026-11-30T23:59:00-04:00','black-friday','30/11 23:59'], ['2026-12-01T00:01:00-04:00','navidad','01/12'],
                           ['2030-12-01T12:00:00-04:00','navidad','01/12/2030: la campaña de 2030 llega al 02/12, pero el tema es solo de noviembre (como antes)']]) {
    const ctx = await browser.newContext({ timezoneId:'America/La_Paz' }); await ctx.route(/^https?:\/\//, r=>r.abort());
    const p = await ctx.newPage(); p.on('pageerror', e=>errores.push(e.message));
    await p.clock.setFixedTime(new Date(f)); await p.goto('file://' + PEDIDOS, { waitUntil:'domcontentloaded' });
    const cls = await p.evaluate(() => document.documentElement.className);
    chk('tema: '+l+' → '+t, new RegExp('tema-'+t+'(\\s|$)').test(cls), cls);
    await ctx.close();
  }

  console.log('\n── 2. Antes de la campaña no se ve ──');
  for (const q of ['?tema=espuma', '?tema=black-friday']) {
    page = await abrir('2026-11-12T18:00:00-04:00', 1280, 900, q);
    r = await ev(page, (s) => { eval(s); __proy('2026-11'); return { d:bfnDatos(), html:document.getElementById('pry-bf').innerHTML, metr:document.getElementById('pry-metrics').innerHTML.length }; }, PROY);
    chk('12/11 con '+q+': `bfnDatos` da null y la caja queda vacía (Proyección sí se pinta)', r.d===null && r.html==='' && r.metr>0, { d:r.d, html:(r.html||'').slice(0,60), metr:r.metr });
    await page._ctx.close();
  }

  console.log('\n── 3. Durante: miércoles 18/11, 15:00 ──');
  page = await abrir('2026-11-18T15:00:00-04:00');
  r = await ev(page, (s) => {
    eval(s); __proy('2026-11');
    var D=bfnDatos(), m={}; D.marcas.forEach(function(g){ m[g.k]=[g.c.bs, g.c.u, g.a.bs, g.a.u]; });
    /* la cuenta a mano, con las funciones de siempre (Contabilidad), para comparar */
    var mano=0, manoA=0; STATE.forEach(function(p){ if(fueraDeConta(p,'tienda')) return; var f=contaFecha(p); if(f>='2026-11-13' && f<='2026-11-18') mano+=ventaTotal(p); });
    return { n:D.n, nTot:D.nTot, curso:D.curso, hoyHab:D.hoyHab, A:D.A, aDesde:D.aDesde, aHasta:D.aHasta, aCorte:D.aCorte, min:D.min,
             camp:D.camp, antes:D.antes, ent:D.antesEntero, may:D.mayor, m:m, vend:D.vend.map(function(v){ return [v.v, v.c.bs, v.c.u, v.a.bs]; }), mano:mano,
             dias:D.dias.map(function(d){ return [d.f.slice(8), d.hab?1:0, d.fut?1:0, d.bs, d.u]; }), top:D.top && D.top.v,
             caja:(document.getElementById('pry-bf-box')||{}).innerText };
  }, PROY);
  chk('van 5 de 15 días hábiles (13, 14, 16, 17, 18) y hoy es hábil', r.n===5 && r.nTot===15 && r.curso===true && r.hoyHab===true, [r.n, r.nTot, r.curso, r.hoyHab]);
  chk('se compara con los 5 días hábiles de antes: 07, 09, 10, 11 y 12/11 (el domingo 8 adentro del tramo)', r.A && r.A.join()==='2026-11-07,2026-11-09,2026-11-10,2026-11-11,2026-11-12' && r.aDesde==='2026-11-07' && r.aHasta==='2026-11-12', r.A);
  chk('a esta altura: el 12/11 cuenta hasta las 15:00', r.aCorte==='2026-11-12' && r.min===900, [r.aCorte, r.min]);
  chk('la campaña (equipo): Bs 14.000, 6 ventas, 7 unidades (combo = 2, almohadas = 0; el domingo 15 y la de diciembre adentro)', r.camp && r.camp.bs===14000 && r.camp.n===6 && r.camp.u===7, r.camp);
  chk('antes: Bs 7.500, 4 ventas, 4 unidades (la del 12/11 a las 17:00 todavía no; la del 06/11 queda afuera del tramo)', r.antes && r.antes.bs===7500 && r.antes.n===4 && r.antes.u===4, r.antes);
  chk('antes, los días enteros (para la línea): Bs 10.000, 5 unidades', r.ent && r.ent.bs===10000 && r.ent.u===5, r.ent);
  chk('una sola verdad: la campaña = la suma de `ventaTotal` del equipo con `contaFecha` del 13 al 18/11', Math.abs(r.mano-r.camp.bs)<0.005, [r.mano, r.camp && r.camp.bs]);
  chk('por marca: 💚 Heaven 10.000 / 4 u. contra 4.500 / 3 u.; 🛏️ Sueña 4.000 / 3 u. contra 3.000 / 1 u.', r.m && JSON.stringify(r.m.heaven)==='[10000,4,4500,3]' && JSON.stringify(r.m.suena)==='[4000,3,3000,1]' && !r.m.sin, r.m);
  chk('por vendedor, de más a menos en la campaña: Mirian 7.000, Mauricio 4.000, Maria 2.000, Isabel 1.000', r.vend && r.vend.map(function(v){ return v[0].split(' ')[0]+' '+v[1]; }).join(' | ')==='Mirian 7000 | Mauricio 4000 | Maria 2000 | Isabel 1000', r.vend);
  chk('mayoristas aparte: campaña 10.000, antes 5.000; ATC, RPT y ROHO no aparecen', r.may && r.may.c.bs===10000 && r.may.a.bs===5000 && r.vend.every(function(v){ return !/ROHO|Eduardo/.test(v[0]); }), r.may);
  chk('día por día: 18 días; el 15 (domingo) no es hábil y suma 1.500; del 19 al 30 todavía no llegaron', r.dias && r.dias.length===18 && JSON.stringify(r.dias[2])==='["15",0,0,1500,1]' && JSON.stringify(r.dias[3])==='["16",1,0,4000,1]' && r.dias.slice(6).every(function(d){ return d[2]===1 && d[3]===0; }), r.dias && r.dias.slice(0,7));
  const caja=(r.caja||'').replace(/\s+/g,' ');
  chk('la ficha: título, «hoy es el día hábil 5 de 15», Bs 14.000 contra Bs 7.500 y +87 %, unidades +75 %', /BLACK FRIDAY EN NÚMEROS/i.test(caja) && /hoy es el día hábil 5 de 15/.test(caja) && /Bs 14\.000/.test(caja) && /Bs 7\.500/.test(caja) && /\+87 %/.test(caja) && /unidades \+75 %/.test(caja), caja.slice(0,400));
  chk('dice contra qué: «los 5 días hábiles de antes (del 07/11 al 12/11, el 12/11 hasta las 15:00)»', /los 5 días hábiles de antes \(del 07\/11 al 12\/11, el 12\/11 hasta las 15:00\)/.test(caja), caja.slice(0,500));
  chk('por marca y por vendedor con su %: Heaven +122 %, Sueña +33 %, Isabel «nuevo»', /Heaven\s*\+122 %/.test(caja) && /Sueña\s*\+33 %/.test(caja) && /Isabel Robledo\s*nuevo/.test(caja), caja.slice(0,1600));
  chk('mientras dura no hay resumen, y «Lo más vendido hasta ahora»', !/Cómo terminó/.test(caja) && /Lo más vendido hasta ahora/i.test(caja), caja.slice(-600));
  r = await ev(page, () => {
    var o={}, bars=function(){ return [].slice.call(document.querySelectorAll('#bfn-bars .bfn-d i')).map(function(i){ return parseFloat(i.style.height)||0; }); };
    o.n=document.querySelectorAll('#bfn-bars .bfn-d').length; o.fut=document.querySelectorAll('#bfn-bars .bfn-d.fut').length; o.nh=document.querySelectorAll('#bfn-bars .bfn-d.nh').length;
    o.hoy=(document.querySelector('#bfn-bars .bfn-d.hoy')||{}).getAttribute ? document.querySelector('#bfn-bars .bfn-d.hoy').getAttribute('data-f') : '';
    o.bs=bars(); o.linea=(document.querySelector('#bfn-bars .bfn-prom span')||{}).textContent||''; o.act=(document.querySelector('#bfn-q .active')||{}).textContent;
    bfnQ('u'); o.u=bars(); o.lineaU=(document.querySelector('#bfn-bars .bfn-prom span')||{}).textContent||''; o.actU=(document.querySelector('#bfn-q .active')||{}).textContent;
    bfnDia('2026-11-15'); o.det=document.getElementById('bfn-det').textContent; o.sel=!!document.querySelector('#bfn-bars [data-f="2026-11-15"].sel');
    bfnDia('2026-11-25'); o.detF=document.getElementById('bfn-det').textContent;
    renderProyeccion(); o.queda=(document.querySelector('#bfn-q .active')||{}).textContent; bfnQ('bs');
    return o;
  });
  chk('barras: una por día (18), lo que no llegó rayado (12), el domingo apagado, hoy marcado', r.n===18 && r.fut===12 && r.nh===3 && r.hoy==='2026-11-18', [r.n, r.fut, r.nh, r.hoy]);
  chk('en Bs la más alta es el 16 (4.000) y la línea dice lo de un día hábil de antes (Bs 2.000)', r.bs && Math.max.apply(null, r.bs)===r.bs[3] && r.bs[3]>r.bs[0] && /antes: Bs 2\.000 por día hábil/.test(r.linea) && r.act==='Bs', [r.bs && r.bs.slice(0,6), r.linea]);
  chk('en unidades cambia (el 14 y el 18, 2 u., son las más altas) y la línea dice 1 u.', r.u && r.u[1]===r.u[5] && r.u[1]>r.u[3] && /antes: 1 u\. por día hábil/.test(r.lineaU) && r.actU==='Unidades', [r.u && r.u.slice(0,6), r.lineaU]);
  chk('tocar un día dice lo cargado (domingo 15: Bs 1.500, 1 unidad, Sueña) y lo marca; un día que no llegó lo dice', /dom 15\/11/.test(r.det) && /Bs 1\.500/.test(r.det) && /1 unidad/.test(r.det) && /Sueña/.test(r.det) && /no es día hábil/.test(r.det) && r.sel && /todavía no llegó/.test(r.detF), [r.det, r.detF]);
  chk('lo elegido (Unidades) queda al repintar Proyección', r.queda==='Unidades', r.queda);
  r = await ev(page, () => { var o={}; document.getElementById('pry-mes').value='2026-10'; renderProyeccion(); o.oct=document.getElementById('pry-bf').innerHTML;
    document.getElementById('pry-mes').value='2026-11'; renderProyeccion(); o.nov=document.getElementById('pry-bf').innerHTML.length;
    var antes=JSON.stringify(STATE); bfnDatos(); renderProyeccion(); o.igual=JSON.stringify(STATE)===antes; return o; });
  chk('con octubre elegido arriba no se ve; con noviembre sí', r.oct==='' && r.nov>0, [String(r.oct).slice(0,40), r.nov]);
  chk('solo mira: no cambia ningún pedido', r.igual===true, r.igual);
  r = await ev(page, () => { UNLOCKED=false; document.getElementById('pry-bf').innerHTML=''; renderProyeccion(); return { html:document.getElementById('pry-bf').innerHTML, tab:(document.querySelector('#cta-tab .active')||{}).getAttribute('data-val') }; });
  chk('sin la contraseña Proyección no se abre y la ficha no se pinta', r.html==='' && r.tab==='ventas', r);
  await page._ctx.close();

  console.log('\n── 3b. El primer día, a las 09:00 ──');
  page = await abrir('2026-11-13T09:00:00-04:00');
  r = await ev(page, (s) => { eval(s); __proy(); var D=bfnDatos(); return { n:D && D.n, A:D && D.A, aCorte:D && D.aCorte, min:D && D.min, camp:D && D.camp, antes:D && D.antes,
    caja:(document.getElementById('pry-bf-box')||{}).innerText }; }, PROY);
  chk('13/11 09:00: se ve; día hábil 1 de 15 contra el 12/11 hasta las 09:00 (todavía nada en los dos)', r.n===1 && r.A && r.A.join()==='2026-11-12' && r.aCorte==='2026-11-12' && r.min===540 && r.camp.bs===0 && r.antes.bs===0 && /el día hábil de antes \(12\/11, el 12\/11 hasta las 09:00\)/.test((r.caja||'').replace(/\s+/g,' ')) && /—/.test(r.caja||''), r);
  await page._ctx.close();

  console.log('\n── 6. Después: jueves 03/12 ──');
  page = await abrir('2026-12-03T10:00:00-04:00');
  r = await ev(page, (s) => {
    eval(s); __proy();
    var D=bfnDatos();
    return { ym:document.getElementById('pry-mes').value, n:D.n, nTot:D.nTot, curso:D.curso, A:D.A, aCorte:D.aCorte, camp:D.camp, antes:D.antes, top:D.top && [D.top.v, D.top.c.bs],
             prods:D.prods.slice(0,4).map(function(o){ return [bfnProdNom(o), o.u]; }), fut:D.dias.filter(function(d){ return d.fut; }).length,
             res:(document.getElementById('bfn-res')||{}).innerText, caja:(document.getElementById('pry-bf-box')||{}).innerText,
             orden:(function(){ var b=document.getElementById('pry-bf-box'); var x=b && b.querySelector('#bfn-res'), y=b && b.querySelector('.bfn-tot'); return !!(x && y && (x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING)); })() };
  }, PROY);
  chk('terminó: los 15 días hábiles enteros y ningún día pendiente; con diciembre elegido (el mes de hoy) se ve', r.curso===false && r.n===15 && r.nTot===15 && r.fut===0 && r.ym==='2026-12', [r.curso, r.n, r.nTot, r.fut, r.ym]);
  chk('antes = los 15 días hábiles del 26/10 al 12/11 (sin el domingo 1° ni el feriado del 02/11), sin corte de hora', r.A && r.A.length===15 && r.A[0]==='2026-10-26' && r.A[14]==='2026-11-12' && r.A.indexOf('2026-11-02')<0 && r.A.indexOf('2026-11-01')<0 && r.aCorte==='', r.A);
  chk('campaña Bs 23.500 / 10 u. (con el viernes 27 y el lunes 30; sin lo del 01/12)', r.camp && r.camp.bs===23500 && r.camp.u===10 && r.camp.n===8, r.camp);
  chk('antes Bs 20.999 / 7 u. (con la del 06/11 y la del 26/10; sin la del domingo 25/10)', r.antes && r.antes.bs===20999 && r.antes.u===7 && r.antes.n===7, r.antes);
  const res=(r.res||'').replace(/\s+/g,' ');
  chk('el resumen: «La campaña vendió Bs 23.500, +12 % contra los 15 días hábiles de antes (Bs 20.999)» y en unidades +43 %', /La campaña vendió Bs 23\.500, \+12 % contra los 15 días hábiles de antes \(Bs 20\.999\)/.test(res) && /En unidades: 10, \+43 %/.test(res), res);
  chk('quien más vendió: Mirian Salazar (Bs 7.000)', r.top && r.top[0]==='Mirian Salazar' && r.top[1]===7000 && /Quien más vendió: Mirian Salazar \(Bs 7\.000/.test(res), [r.top, res]);
  chk('los productos más vendidos: el SOFT 140x190 (5) primero, después el TITANIO LATEX 160x190 (2); sin almohadas', r.prods && /SOFT/.test(r.prods[0][0]) && r.prods[0][1]===5 && /TITANIO/.test(r.prods[1][0]) && r.prods[1][1]===2 && r.prods.every(function(p){ return !/ALMOHADA/.test(p[0]); }) && /productos más vendidos: .*SOFT.*\(5\)/i.test(res), [r.prods, res]);
  chk('el resumen va arriba de los números; dice «terminó» y hasta cuándo se ve; ya no «hasta ahora»', r.orden && /terminó el lun 30\/11/.test(r.caja||'') && /se ve hasta el 07\/12/.test(r.caja||'') && !/hasta ahora/i.test(r.caja||''), (r.caja||'').slice(0,300));
  await page._ctx.close();
  for (const [f, ve] of [['2026-12-07T23:00:00-04:00', true], ['2026-12-08T00:30:00-04:00', false]]) {
    page = await abrir(f);
    r = await ev(page, (s) => { eval(s); __proy(); return { d:!!bfnDatos(), html:document.getElementById('pry-bf').innerHTML.length }; }, PROY);
    chk(f.slice(0,10)+(ve ? ': el último día que se ve (7 días después del 30/11)' : ': ya no se ve'), r.d===ve && (r.html>0)===ve, r);
    await page._ctx.close();
  }

  console.log('\n── 7. Celular, iPad y el tema ──');
  for (const [w, h, q] of [[390, 844, '?tema=espuma'], [820, 1180, '?tema=espuma'], [390, 844, '?tema=black-friday'], [820, 1180, '?tema=black-friday']]) {
    page = await abrir('2026-11-18T15:00:00-04:00', w, h, q);
    r = await ev(page, async (s) => {
      eval(s); __proy('2026-11'); await new Promise(function(r){ setTimeout(r, 300); });
      var b=document.getElementById('pry-bf-box'), br=b.getBoundingClientRect(), afuera=[];
      [].forEach.call(b.querySelectorAll('*'), function(e){ var x=e.getBoundingClientRect(); if(x.width && (x.right>br.right+1 || x.left<br.left-1) && !e.closest('.bfn-prom')) afuera.push((e.className||e.tagName)+':'+Math.round(x.right)); });
      var cs=getComputedStyle(b);
      return { sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth, bw:br.width, right:br.right, afuera:afuera.slice(0,6),
               bg:cs.backgroundImage, borde:cs.borderTopColor, tit:getComputedStyle(b.querySelector('.bfn-h b')).color, bf:document.documentElement.classList.contains('tema-black-friday') };
    }, PROY);
    chk(w+' px '+q+': sin scroll de costado y nada de la ficha se sale', r.sw<=r.cw && r.right<=w && r.afuera && r.afuera.length===0, r);
    if (q==='?tema=black-friday') chk(w+' px: con el tema, la ficha es negra con dorado', r.bf && /rgb\(28, 25, 23\)|rgb\(10, 10, 10\)/.test(r.bg) && /250, 204, 21/.test(r.borde) && r.tit==='rgb(250, 204, 21)', [r.bg.slice(0,80), r.borde, r.tit]);
    else chk(w+' px: sin el tema, el estilo de las fichas de marca (fondo claro)', !r.bf && !/rgb\(10, 10, 10\)/.test(r.bg) && r.tit==='rgb(133, 77, 14)', [r.bg.slice(0,80), r.tit]);
    await page._ctx.close();
  }

  chk('sin errores de página', errores.length===0, errores.slice(0,5));
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
