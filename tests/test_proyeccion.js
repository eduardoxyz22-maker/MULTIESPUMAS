/* 📈 PROYECCIÓN DEL MES EN CONTABILIDAD, SOLO CON LA CONTRASEÑA DE ADMINISTRACIÓN (dueño, 28/09, §4gt).

   *«Crea una pestaña al lado de cuadre y conciliación que solo se habilite cuando se coloca la contraseña de administrador…
   que me muestre el total vendido en el período de cada vendedor, el total de cada marca y una proyección a fin de mes
   según cómo vienen las ventas… no me interesa el efectivo ingresado sino el vendido en el período»* (por entrega
   agendada: la venta pagada un mes y entregada el siguiente cuenta en el mes de la entrega).

   ⚠️ LO QUE ESTA PRUEBA CUIDA (falla contra lo publicado, `bf19fc8`, que no tiene la pestaña):
   1. La pestaña NO aparece sin la contraseña de Administración; aparece al desbloquear (con la contraseña de verdad,
      `tryUnlock`); y sin clave, pedirla por código vuelve a Ventas.
   2. Las cuentas, con el reloj en el viernes 18/09/2026 (16 días hábiles pasaron, faltan 10):
      · cuenta lo VENDIDO por la fecha de entrega agendada: la venta cargada en agosto que se entrega en septiembre entra;
        la de octubre no; la venta de tienda (sin fecha de entrega) cuenta por el día en que se cargó;
      · no entran ATC, RPT ni ROHO; los mayoristas van aparte; un vendedor sin marca va a «Sin marca»;
      · proyección por vendedor = hasta hoy + máx(agendado, ritmo × días hábiles que quedan), y las marcas y el total suman.
   3. Lo vendido del equipo es EXACTAMENTE lo que dice Ventas → 🚚 Entrega agendada → Mes.
   4. Lo que se ve: las fichas, la lista por vendedor (con la proyección en violeta), los mayoristas y el aviso de la venta
      sin monto.
   5. Un mes cerrado dice «Cerró el mes» y no proyecta; uno que no empezó muestra lo agendado; los primeros días avisan que
      la proyección se mueve mucho.
   6. En el iPad (820 y 1180) y en el celular (390) no hay scroll de costado.

   Datos SINTÉTICOS (el repo es público). Reloj clavado, hora de Bolivia.
   Se corre:  node tests/test_proyeccion.js   (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/a/pedidos_bf19fc8.html node tests/test_proyeccion.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  try{ cargaBanner(); }catch(e){}
  loadFromServer=function(){};            // desbloquear no lee la planilla en la prueba
  var n=0;
  /* Una venta: `bs` es su total (queda como saldo), `fecha` la entrega agendada, `ts` cuándo se cargó. */
  window.V=function(vend, fecha, bs, o){
    o=o||{}; n++;
    var ts=o.ts || new Date((fecha||'2026-09-08')+'T10:00:00-04:00').getTime()-2*86400000;
    return { id:'p'+n, oc:o.oc||('09-'+(100+n)), nota:String(500+n), vendedor:vend, cliente:o.cliente||('CLIENTE '+n), fecha:fecha, turno:fecha?'AM':'',
             productos:[{desc:'COLCHON',medida:'140x190',cant:1}], saldo:bs, acuenta:0, pagado:false, metodoPago:'', entregado:false, ts:ts, fotos:[] };
  };
  window.FIX=function(){
    return [
      V('Mauricio Merida','2026-09-02',10000), V('Mauricio Merida','2026-09-10',6000), V('Mauricio Merida','2026-09-24',4000),
      V('Mauricio Merida','2026-09-05',5000,{ ts:new Date('2026-08-27T10:00:00-04:00').getTime() }),     // cargada (y pagada) en agosto
      V('Mauricio Merida','2026-10-02',7000),                                                            // se entrega en octubre
      V('Mauricio Merida','',3000,{ ts:new Date('2026-09-08T11:00:00-04:00').getTime() }),              // venta de tienda
      V('Juan Pablo Paredes','2026-09-03',2000), V('Juan Pablo Paredes','2026-09-28',9000),
      V('Maria Flores','2026-09-15',8000), V('Maria Flores','2026-08-20',3000),
      V('Maria Flores','2026-09-16',0,{ oc:'ATC 09-001' }),
      V('Carola Chavez','2026-09-12',0,{ oc:'RPT 09-001', cliente:'Mia Plaza' }),
      V('ROHO','2026-09-10',4000),
      V('Isabel Robledo','2026-09-14',0),                                                                // sin monto anotado
      V('Pedro Nuevo','2026-09-11',1000),                                                                // no está en ninguna marca
      V('Eduardo Añez','2026-09-12',20000,{ cliente:'MULTICENTER' }), V('Eduardo Añez','2026-09-29',5000,{ cliente:'MULTICENTER' })
    ];
  };
  window._txt=function(id){ var e=document.getElementById(id); return e ? e.innerText.replace(/\s+/g,' ').trim() : ''; };
  window._visible=function(id){ var e=document.getElementById(id); return !!e && e.style.display!=='none' && e.offsetParent!==null; };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const page = await browser.newPage({ viewport:{ width:1180, height:900 }, timezoneId:'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  const reloj = (iso) => page.clock.setFixedTime(new Date(iso));
  await reloj('2026-09-18T15:00:00-04:00');
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(350);
  await page.evaluate(PREPARAR);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };

  // ═══ 1. Solo con la contraseña de Administración ═══════════════════════════════════════════════
  console.log('\n── 1. La pestaña, solo con la contraseña de Administración ──');
  let r = await ev(() => {
    STATE=FIX(); showView('conta');
    var b=document.getElementById('cta-tab-proy');
    var out={ existe:!!b, antes:!!b && b.style.display!=='none' };
    /* Sin clave, pedir la pestaña por código vuelve a Ventas. */
    try{ segSet('cta-tab','proy'); setContaTab('proy'); }catch(e){ out.err=String(e); }
    out.tabSinClave=contaTab(); out.ventasVisible=_visible('cta-pane-ventas'); out.proySinClave=_visible('cta-pane-proy');
    /* Con la contraseña de verdad, por el mismo camino que Administración. */
    localStorage.setItem(LS_ADMIN, sha256('clave-de-prueba'));
    document.getElementById('admin-pass').value='clave-de-prueba'; tryUnlock();
    out.unlocked=UNLOCKED; out.despues=!!b && b.style.display!=='none';
    return out;
  });
  chk('sin la contraseña de Administración, la pestaña «📈 Proyección del mes» NO se ve', r.existe && !r.antes, r);
  chk('…y pedirla igual (por código) vuelve a Ventas, sin mostrar la proyección', r.tabSinClave==='ventas' && r.ventasVisible && !r.proySinClave, r);
  chk('con la contraseña (tryUnlock) aparece la pestaña, al lado de Cuadre y conciliación', r.unlocked===true && r.despues, r);

  // ═══ 2. Las cuentas ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── 2. Las cuentas: viernes 18/09, 16 días hábiles pasaron y faltan 10 ──');
  r = await ev(() => {
    var R=proyeccionMes('2026-09');
    var f=function(nom){ var all=[].concat.apply([], R.marcas.map(function(m){ return m.filas; })).concat(R.sinMarca.filas, R.mayor.filas);
                         return all.filter(function(x){ return mismoVendedor(x.vendedor, nom); })[0] || null; };
    var m=function(k){ return R.marcas.filter(function(x){ return x.g.k===k; })[0].tot; };
    return { dt:R.dt, dr:R.dr, estado:R.estado, E:R.equipo, sue:m('suena'), hea:m('heaven'), sin:R.sinMarca.tot, may:R.mayor.tot,
             mau:f('Mauricio Merida'), jp:f('Juan Pablo Paredes'), mf:f('Maria Flores'), ir:f('Isabel Robledo'), pn:f('Pedro Nuevo'),
             ed:f('Eduardo Añez'), roho:f('ROHO'), cc:f('Carola Chavez') };
  });
  chk('días hábiles: pasaron 16 (del 1 al 18, sin los domingos 6 y 13) y faltan 10', r.dt===16 && r.dr===10 && r.estado==='curso', [r.dt, r.dr, r.estado, r.__error]);
  chk('Mauricio: la cargada en AGOSTO que se entrega en septiembre cuenta, la de octubre no, y la venta de tienda cuenta por el día que se cargó → vendido Bs 28.000 (hasta hoy 24.000 + agendado 4.000)',
      r.mau && r.mau.vendido===28000 && r.mau.a===24000 && r.mau.b===4000 && r.mau.n===5, r.mau);
  chk('Mauricio: ritmo 24.000 ÷ 16 = 1.500 por día × 10 = 15.000, más que lo agendado → proyección 24.000 + 15.000 = Bs 39.000', r.mau && r.mau.proy===39000, r.mau);
  chk('Juan Pablo: lo agendado (9.000) es más que el ritmo (125 × 10) → se toma lo agendado: proyección Bs 11.000', r.jp && r.jp.proy===11000 && r.jp.vendido===11000, r.jp);
  chk('Maria Flores: su venta de agosto no es de septiembre y la ATC no es venta → vendido Bs 8.000, proyección Bs 13.000', r.mf && r.mf.vendido===8000 && r.mf.n===1 && r.mf.proy===13000, r.mf);
  chk('no entran ni la RPT (Carola) ni ROHO', !r.cc && !r.roho, [r.cc, r.roho]);
  chk('Isabel: una venta sin monto anotado cuenta como venta pero no suma plata', r.ir && r.ir.n===1 && r.ir.vendido===0 && r.ir.sinMonto===1, r.ir);
  chk('un vendedor que no está en ninguna marca va a «Sin marca» (Pedro Nuevo: Bs 1.000, proyección Bs 1.625)', r.pn && !r.pn.marca && r.sin.vendido===1000 && r.sin.proy===1625, [r.pn, r.sin]);
  chk('🛏️ Sueña = Mauricio + Juan Pablo: vendido Bs 39.000, proyección Bs 50.000', r.sue && r.sue.vendido===39000 && r.sue.proy===50000, r.sue);
  chk('💚 Heaven = Maria + Isabel: vendido Bs 8.000, proyección Bs 13.000', r.hea && r.hea.vendido===8000 && r.hea.proy===13000, r.hea);
  chk('total del equipo = las marcas + sin marca: vendido Bs 48.000 en 10 ventas, proyección Bs 64.625', r.E && r.E.vendido===48000 && r.E.n===10 && r.E.proy===64625, r.E);
  chk('🏭 Mayoristas aparte (Eduardo): vendido Bs 25.000, proyección 20.000 + 1.250 × 10 = Bs 32.500, y NO está en el total del equipo',
      r.ed && r.ed.amb==='mayor' && r.may.vendido===25000 && r.may.proy===32500, [r.ed, r.may]);

  // ═══ 3. Lo mismo que Ventas por entrega agendada ═════════════════════════════════════════════
  console.log('\n── 3. Lo vendido del equipo es lo que dice Ventas → 🚚 Entrega agendada → Mes ──');
  r = await ev(() => {
    segSet('cta-tab','ventas'); setContaTab('ventas');
    segSet('cta-base','entrega'); setContaBase(); segSet('cta-mode','mes'); setContaModo('mes');
    document.getElementById('cta-mes').value='2026-09'; var s=document.getElementById('cta-vendedor'); if(s) s.value='';
    document.getElementById('cta-search').value=''; renderConta();
    var v=document.querySelector('#cta-metrics .mc .mc-val');
    return { ventas:v ? v.innerText.trim() : '' };
  });
  chk('Ventas → 🚚 Entrega agendada → septiembre dice «Vendido en el período» Bs 48.000,00: el mismo número', r.ventas==='Bs 48.000,00', r);

  // ═══ 4. Lo que se ve ═════════════════════════════════════════════════════════════════════════
  console.log('\n── 4. Lo que se ve ──');
  r = await ev(() => {
    segSet('cta-tab','proy'); setContaTab('proy');
    document.getElementById('pry-mes').value='2026-09'; renderProyeccion();
    return { vis:_visible('cta-pane-proy'), ventasVis:_visible('cta-pane-ventas'), met:_txt('pry-metrics'), vend:_txt('pry-vendedores'), nota:_txt('pry-nota'), como:_txt('pry-como') };
  });
  chk('la pestaña muestra su panel (y no el de Ventas)', r.vis && !r.ventasVis, r);
  chk('ficha «Vendido en septiembre de 2026» Bs 48.000,00 con lo de hasta hoy y lo agendado', /VENDIDO EN SEPTIEMBRE DE 2026 Bs 48\.000,00 10 ventas del equipo de tiendas · con entrega hasta hoy Bs 35\.000,00 \+ agendado Bs 13\.000,00/i.test(r.met), r.met);
  chk('ficha «📈 Proyección al cierre» Bs 64.625, con el ritmo y los días que faltan', /PROYECCIÓN AL CIERRE Bs 64\.625 si sigue el ritmo de Bs 2\.188 por día hábil · faltan 10 días hábiles/i.test(r.met), r.met);
  chk('fichas de marca: Sueña Bs 39.000,00 (81 % · proyección Bs 50.000) y Heaven Bs 8.000,00 (17 % · proyección Bs 13.000)',
      /SUEÑA Bs 39\.000,00 \d+ ventas · 81% del equipo · 📈 proyección Bs 50\.000/i.test(r.met) && /HEAVEN Bs 8\.000,00 2 ventas · 17% del equipo · 📈 proyección Bs 13\.000/i.test(r.met), r.met);
  chk('fichas «Sin marca» y «🏭 Mayoristas» (aparte del equipo, con su proyección)',
      /SIN MARCA Bs 1\.000,00/i.test(r.met) && /MAYORISTAS Bs 25\.000,00 2 ventas de Eduardo Añez · aparte del equipo · 📈 proyección Bs 32\.500/i.test(r.met), r.met);
  chk('lista por vendedor: Mauricio Merida Bs 28.000,00 con «agendado Bs 4.000,00» y 📈 Bs 39.000',
      /Mauricio Merida 5 ventas · 58% del equipo · agendado Bs 4\.000,00 Bs 28\.000,00 📈 Bs 39\.000/.test(r.vend), r.vend);
  chk('…agrupada por marca, con el TOTAL EQUIPO y los mayoristas aparte, abajo',
      /Sueña Bs 39\.000,00 · 📈 Bs 50\.000/.test(r.vend) && /Heaven Bs 8\.000,00 · 📈 Bs 13\.000/.test(r.vend) &&
      /TOTAL EQUIPO 10 ventas Bs 48\.000,00 📈 Bs 64\.625/.test(r.vend) && /Mayoristas \(aparte del equipo\) Bs 25\.000,00 · 📈 Bs 32\.500 Eduardo Añez/.test(r.vend) &&
      r.vend.indexOf('TOTAL EQUIPO') < r.vend.indexOf('Mayoristas'), r.vend);
  chk('ni la ATC, ni la RPT, ni ROHO aparecen en la lista', !/ROHO|Carola Chavez/.test(r.vend), r.vend);
  chk('aviso: «1 venta sin monto anotado no suma nada: completala en Ventas»', /1 venta sin monto anotado no suma nada: completala en Ventas/.test(r.nota), r.nota);
  chk('el cuadro «Cómo se cuenta» dice que es lo VENDIDO por entrega agendada, no lo cobrado', /Es lo VENDIDO, no lo cobrado/.test(r.como) && /entrega agendada/.test(r.como), r.como);

  // ═══ 5. Otros meses y los primeros días ══════════════════════════════════════════════════════
  console.log('\n── 5. Un mes cerrado, uno que no empezó y los primeros días ──');
  r = await ev(() => {
    var out={};
    document.getElementById('pry-mes').value='2026-08'; renderProyeccion(); out.ago=_txt('pry-metrics'); out.agoV=_txt('pry-vendedores');
    document.getElementById('pry-mes').value='2026-10'; renderProyeccion(); out.oct=_txt('pry-metrics');
    return out;
  });
  chk('agosto (ya pasó): «Cerró el mes» con lo vendido (Bs 3.000,00, la de Maria), sin proyección', /Cerró el mes Bs 3\.000,00/i.test(r.ago) && !/📈 proyección|📈 Bs/.test(r.ago+r.agoV), [r.ago, r.agoV]);
  chk('octubre (no empezó): muestra lo ya agendado (la de Mauricio, Bs 7.000) y lo dice', /PROYECCIÓN AL CIERRE Bs 7\.000 todavía no empezó: es lo que ya está agendado/i.test(r.oct), r.oct);
  await reloj('2026-09-03T11:00:00-04:00');
  r = await ev(() => { document.getElementById('pry-mes').value='2026-09'; renderProyeccion(); return { nota:_txt('pry-nota'), dt:proyeccionMes('2026-09').dt }; });
  chk('jueves 03/09 (van 3 días hábiles): avisa que la proyección todavía se mueve mucho', r.dt===3 && /Van 3 días hábiles del mes: la proyección todavía se mueve mucho/.test(r.nota), r);

  // ═══ 6. En el iPad y en el celular ════════════════════════════════════════════════════════════
  console.log('\n── 6. Sin scroll de costado en el iPad (820 y 1180) y en el celular (390) ──');
  await reloj('2026-09-18T15:00:00-04:00');
  /* Un mes de verdad tiene totales de seis cifras («Bs 684.390,00»): en el iPad las fichas de 230 px los cortaban («Bs 684.39…»). */
  await ev(() => { STATE.push(V('Maria Flores','2026-09-15',684390)); });
  for (const w of [820, 1180, 390]) {
    await page.setViewportSize({ width:w, height:1000 });
    await page.waitForTimeout(150);
    r = await ev(() => { renderProyeccion(); acomodarFichas(); return { sw:document.documentElement.scrollWidth, iw:window.innerWidth,
      proyVisible:[].slice.call(document.querySelectorAll('#pry-vendedores .pry-p')).every(function(e){ var b=e.getBoundingClientRect(); return b.width>0 && b.right<=window.innerWidth+1; }),
      cortados:[].slice.call(document.querySelectorAll('#pry-metrics .mc-val')).filter(function(e){ return e.scrollWidth>e.clientWidth+1; }).map(function(e){ return e.innerText; }),
      total:(document.querySelector('#pry-metrics .mc-val')||{}).innerText }; });
    chk('a '+w+' px: sin scroll de costado y la proyección de cada vendedor a la vista', r.sw<=r.iw && r.proyVisible, r);
    chk('a '+w+' px: ningún monto de las fichas sale cortado (el total del mes, «'+r.total+'», entero)', r.cortados && r.cortados.length===0 && r.total==='Bs 732.390,00', r);
  }

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
