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

   🔁 (29/09, §4gu) LA CURVA DE CADA MARCA — *«¿qué fórmula o algoritmo podemos usar… algo realmente preciso?… en agosto
   los últimos dos, tres días se facturó 80.000 o 150.000… me agrada tu idea de calcular y probar con agosto»*.
   Con un historial inventado de agosto y septiembre (`FIX2`, 20 ventas por marca y por mes, números hechos a mano):
   7. Miércoles 14/10 (faltan 15 días hábiles): Heaven proyecta con su curva — a esta altura ya estaba vendido el 60 %;
      (1) 30.000 ÷ 60 % = 50.000, (2) 30.000 + 40 % de 90.000 (su promedio) = 66.000; la (1) pesa 60 %² = 36 % → 60.240 (el
      ritmo daba 40.500) —; Sueña con la suya (80 %: 50.000 y 60.000, 64 % y 36 % → 53.600; el ritmo, 90.000). El sin marca
      y los mayoristas siguen con el ritmo. Julio (empezó a fines de mes), las ATC, las RPT y ROHO no entran en ninguna curva.
   8. Lo que se ve: la ficha dice con qué se proyectó, cada marca dice su parte y debajo de cada grupo va la cuenta entera.
   9. 🧪 La prueba: agosto con la curva de septiembre y septiembre con la de agosto (nunca la del mismo mes), fecha por
      fecha, contra cómo terminó; el error promedio de cada forma; octubre, que no cerró, sin error.
   10. 📅 Cómo se vendió agosto: los últimos 3 días hábiles (y cuánto ya estaba vendido antes), cómo se fue llenando y qué
       días de la semana se carga más.
   11. Principio de mes (viernes 02/10): a esta altura Heaven no tenía nada vendido en agosto ni en septiembre → la cuenta
       (1) no se puede y manda la (2), sin dividir por cero; Sueña ya tenía el 40 %.
   12. «Hoy» (martes 29/09): la curva sale de agosto solo y lo avisa; agosto todavía no se puede probar (lo dice) y
       septiembre se ve sin error hasta que cierre.
   13. Con todo eso en pantalla, sin scroll de costado en el iPad y en el celular.
   14. 🏁 Elige la prueba (`FIX3`): si Sueña vende parejo, el ritmo acierta justo (0 %) y la curva no (22 %, porque el
       promedio de los meses cerrados tira para otro lado) → Sueña va con el ritmo y Heaven sigue con la curva; la ficha,
       el pie de la marca y el resumen de la prueba lo dicen.

   📊 (29/09, §4gv) «La opción 2»: cómo va el mes contra otro mes AL MISMO DÍA, y en UNIDADES (*«puede que entre menos plata
   pero subió el número de unidades vendidas, y eso es bueno»*).
   15. Las unidades (el dueño, al ver el bosquejo: *«quitá las almohadas: solo colchones y somier, y colchonetas o colchones
       de bebé; no mantas, sábanas, almohadas, patas, etc.»*): colchones (con colchonetas y de cuna) y somieres, con su
       cantidad; afuera almohadas («2 ALMOHADAS», «ALM/NASA»), respaldares, patas, forros, protectores, sábanas y «VARIOS»;
       el código del catálogo manda; un combo es un colchón y un somier (el del catálogo, o escrito con COLCHON/SOMIER),
       y un «COMBO DE SÁBANAS» no cuenta.
   16. A esta altura (miércoles 14/10): octubre contra septiembre al día 14, por marca y el equipo, con la diferencia, el
       mes anterior entero y semana por semana; «Comparar con» agosto; un mes cerrado se compara entero (septiembre
       contra agosto: el doble de plata con las mismas unidades); agosto no tiene con qué.
   17. En el iPad las tablas entran enteras, y en el celular no hay scroll de costado.

   Datos SINTÉTICOS (el repo es público). Reloj clavado, hora de Bolivia.
   Se corre:  node tests/test_proyeccion.js   (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/a/pedidos_6146f6d.html node tests/test_proyeccion.js   (§1-6 pasan; §7-13, no) */
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
  /* 🔁 §4gu — un historial para la curva. `reg` = el día en que se cargó (10:00 de Bolivia). */
  window.FIX2=function(){
    var out=[], k=0;
    var S=function(vend, fecha, reg, bs, o){ o=o||{}; k++;
      return { id:'h'+k, oc:o.oc||('10-'+(100+k)), nota:String(900+k), vendedor:vend, cliente:o.cliente||('CLIENTE H'+k), fecha:fecha, turno:'AM',
               productos:[{desc:'COLCHON',medida:'140x190',cant:1}], saldo:bs, acuenta:0, pagado:false, metodoPago:'', entregado:false,
               ts:new Date(reg+'T10:00:00-04:00').getTime(), fotos:[] }; };
    var rep=function(n, vend, fecha, reg, bs){ for(var i=0;i<n;i++) out.push(S(vend, fecha, reg, bs)); };
    rep(10,'Maria Flores','2026-07-30','2026-07-28',3000);            // julio: empezó a fines de mes, no es historia
    // 💚 Heaven (Maria Flores). Agosto: 20 × 3.000 = 60.000
    rep(8,'Maria Flores','2026-08-05','2026-08-03',3000);             // lunes 03, se entregan el 05
    rep(6,'Maria Flores','2026-08-29','2026-08-20',3000);             // jueves 20, agendadas para el sábado 29
    rep(6,'Maria Flores','2026-08-31','2026-08-28',3000);             // viernes 28, se entregan el lunes 31: el empujón de fin de mes
    // Septiembre: 20 × 6.000 = 120.000
    rep(8,'Maria Flores','2026-09-04','2026-09-02',6000);
    rep(6,'Maria Flores','2026-09-12','2026-09-10',6000);
    rep(6,'Maria Flores','2026-09-30','2026-09-28',6000);
    // 🛏️ Sueña (Mauricio Merida): 20 × 5.000 = 100.000 cada mes, casi todo vendido al principio
    rep(16,'Mauricio Merida','2026-08-06','2026-08-03',5000); rep(4,'Mauricio Merida','2026-08-25','2026-08-24',5000);
    rep(16,'Mauricio Merida','2026-09-03','2026-09-01',5000); rep(4,'Mauricio Merida','2026-09-24','2026-09-23',5000);
    // 🏭 Eduardo: 20 compras en agosto (igual sigue con el ritmo)
    rep(20,'Eduardo Añez','2026-08-10','2026-08-03',1000);
    // Octubre (el «hoy» de §7 es el miércoles 14/10)
    rep(6,'Maria Flores','2026-10-05','2026-10-01',3000); rep(4,'Maria Flores','2026-10-20','2026-10-12',3000);
    rep(8,'Mauricio Merida','2026-10-08','2026-10-02',5000);
    out.push(S('Pedro Nuevo','2026-10-07','2026-10-05',1340));
    out.push(S('Eduardo Añez','2026-10-09','2026-10-06',20000)); out.push(S('Eduardo Añez','2026-10-29','2026-10-13',5000));
    // Lo que no es venta no entra en ninguna curva
    out.push(S('Maria Flores','2026-08-31','2026-08-28',0,{ oc:'ATC 08-001' }));
    out.push(S('Carola Chavez','2026-08-31','2026-08-28',50000,{ oc:'RPT 08-001', cliente:'Mia Plaza' }));
    out.push(S('ROHO','2026-08-31','2026-08-28',50000));
    return out;
  };
  /* 🏁 §14: lo mismo, pero Sueña vende PAREJO en agosto (4.000 por día hábil) y en septiembre (2.000), el mismo día que se carga. */
  window.FIX3=function(){
    var out=FIX2().filter(function(p){ return !(mismoVendedor(p.vendedor,'Mauricio Merida') && /^2026-0[89]/.test(p.fecha)); }), k=0;
    for(var d='2026-08-01'; d<='2026-09-30'; d=stockSumarDias(d,1)) if(diaHabil(d)){ k++;
      out.push({ id:'u'+k, oc:'10-'+(700+k), nota:String(7000+k), vendedor:'Mauricio Merida', cliente:'CLIENTE U'+k, fecha:d, turno:'AM',
                 productos:[{desc:'COLCHON',medida:'140x190',cant:1}], saldo:(d<'2026-09-01' ? 4000 : 2000), acuenta:0, pagado:false, metodoPago:'',
                 entregado:false, ts:new Date(d+'T10:00:00-04:00').getTime(), fotos:[] });
    }
    return out;
  };
  /* Lo que se sabía un día: solo lo cargado hasta ese día. */
  window.HASTA=function(dia){ var t=new Date(dia+'T23:59:59-04:00').getTime(); return FIX2().filter(function(p){ return p.ts<=t; }); };
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
  chk('ficha «Vendido en septiembre de 2026» Bs 48.000,00 con lo de hasta hoy y lo agendado', /VENDIDO EN SEPTIEMBRE DE 2026 Bs 48\.000,00 10 ventas · 10 unidades del equipo de tiendas · con entrega hasta hoy Bs 35\.000,00 \+ agendado Bs 13\.000,00/i.test(r.met), r.met);
  chk('ficha «📈 Proyección al cierre» Bs 64.625, con el ritmo y los días que faltan', /PROYECCIÓN AL CIERRE Bs 64\.625 si sigue el ritmo de Bs 2\.188 por día hábil · faltan 10 días hábiles/i.test(r.met), r.met);
  chk('fichas de marca: Sueña Bs 39.000,00 (81 % · proyección Bs 50.000) y Heaven Bs 8.000,00 (17 % · proyección Bs 13.000)',
      /SUEÑA Bs 39\.000,00 \d+ ventas · \d+ unidades · 81% del equipo · 📈 proyección Bs 50\.000/i.test(r.met) && /HEAVEN Bs 8\.000,00 2 ventas · 2 unidades · 17% del equipo · 📈 proyección Bs 13\.000/i.test(r.met), r.met);
  chk('fichas «Sin marca» y «🏭 Mayoristas» (aparte del equipo, con su proyección)',
      /SIN MARCA Bs 1\.000,00/i.test(r.met) && /MAYORISTAS Bs 25\.000,00 2 ventas · 2 unidades de Eduardo Añez · aparte del equipo · 📈 proyección Bs 32\.500/i.test(r.met), r.met);
  chk('lista por vendedor: Mauricio Merida Bs 28.000,00 con «agendado Bs 4.000,00» y 📈 Bs 39.000',
      /Mauricio Merida 5 ventas · 5 unidades · 58% del equipo · agendado Bs 4\.000,00 Bs 28\.000,00 📈 Bs 39\.000/.test(r.vend), r.vend);
  chk('…agrupada por marca, con el TOTAL EQUIPO y los mayoristas aparte, abajo',
      /Sueña Bs 39\.000,00 · 📈 Bs 50\.000/.test(r.vend) && /Heaven Bs 8\.000,00 · 📈 Bs 13\.000/.test(r.vend) &&
      /TOTAL EQUIPO 10 ventas · 10 unidades Bs 48\.000,00 📈 Bs 64\.625/.test(r.vend) && /Mayoristas \(aparte del equipo\) Bs 25\.000,00 · 📈 Bs 32\.500 Eduardo Añez/.test(r.vend) &&
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

  // ═══ 7. La curva de cada marca (§4gu) ═════════════════════════════════════════════════════════
  console.log('\n── 7. La curva: miércoles 14/10, con agosto y septiembre cerrados ──');
  await page.setViewportSize({ width:1180, height:900 });
  await reloj('2026-10-14T15:00:00-04:00');
  r = await ev(() => {
    STATE=FIX2();
    var R=proyeccionMes('2026-10');
    var f=function(nom){ var all=[].concat.apply([], R.marcas.map(function(m){ return m.filas; })).concat(R.sinMarca.filas, R.mayor.filas);
                         return all.filter(function(x){ return mismoVendedor(x.vendedor, nom); })[0] || null; };
    var m=function(k){ return R.marcas.filter(function(x){ return x.g.k===k; })[0].tot; };
    return { dt:R.dt, dr:R.dr, hist:R.hist, met:R.metodos, E:R.equipo, sue:m('suena'), hea:m('heaven'), sin:R.sinMarca.tot, may:R.mayor.tot,
             mf:f('Maria Flores'), mau:f('Mauricio Merida'), pn:f('Pedro Nuevo'), ed:f('Eduardo Añez') };
  });
  chk('días hábiles: pasaron 12 y faltan 15; la historia es agosto y septiembre (julio no: se empezó a usar a fines de mes)',
      r.dt===12 && r.dr===15 && JSON.stringify(r.hist)==='["2026-08","2026-09"]', [r.dt, r.dr, r.hist, r.__error]);
  chk('💚 Heaven con su curva: faltando 15 días hábiles, en agosto y septiembre ya estaba vendido el 60 % ((24.000 + 84.000) ÷ 180.000; la RPT, la ATC y ROHO no entran) y vendieron 90.000 en promedio',
      r.met && r.met.heaven.m==='curva' && Math.abs(r.met.heaven.f-0.6)<1e-9 && r.met.heaven.prom===90000 && JSON.stringify(r.met.heaven.meses)==='["2026-08","2026-09"]', r.met && r.met.heaven);
  chk('Heaven: (1) 30.000 ÷ 60 % = 50.000 · (2) 30.000 + 40 % de 90.000 = 66.000 · la (1) pesa 36 % → Bs 60.240',
      r.met && r.met.heaven.K===30000 && Math.round(r.met.heaven.p1)===50000 && Math.round(r.met.heaven.p2)===66000 && Math.abs(r.met.heaven.w-0.36)<1e-9 && r.met.heaven.proy===60240, r.met && r.met.heaven);
  chk('Maria Flores (la única de Heaven) lleva la proyección de la marca: Bs 60.240 (con el ritmo daba 40.500)',
      r.mf && r.mf.vendido===30000 && r.mf.proy===60240 && r.mf.proyRitmo===40500 && r.mf.metodo==='curva', r.mf);
  chk('🛏️ Sueña con SU curva (vende casi todo al principio: 80 %): (1) 50.000 · (2) 60.000 · la (1) pesa 64 % → Bs 53.600 (con el ritmo daba 90.000)',
      r.met && r.met.suena.m==='curva' && Math.abs(r.met.suena.f-0.8)<1e-9 && r.met.suena.proy===53600 && r.mau && r.mau.proy===53600 && r.mau.proyRitmo===90000, [r.met && r.met.suena, r.mau]);
  chk('el sin marca sigue con el ritmo (no tiene curva propia): 1.340 + 1.340 ÷ 12 × 15 = Bs 3.015',
      r.met && r.met.sin.m==='ritmo' && r.met.sin.porque==='sin' && r.pn && r.pn.proy===3015, [r.met && r.met.sin, r.pn]);
  chk('las marcas y el total suman: Sueña 53.600 + Heaven 60.240 + sin marca 3.015 = Bs 116.855 (vendido Bs 71.340)',
      r.sue && r.sue.proy===53600 && r.hea && r.hea.proy===60240 && r.sin.proy===3015 && r.E && r.E.proy===116855 && r.E.vendido===71340, [r.sue, r.hea, r.sin, r.E]);
  chk('🏁 la prueba (agosto y septiembre, 14 fechas) elige la curva en las dos: Heaven 17 % contra 36 % del ritmo; Sueña 0 % contra 62 %',
      r.met && r.met.heaven.err && r.met.heaven.err.n===14 && Math.round(r.met.heaven.err.c*100)===17 && Math.round(r.met.heaven.err.r*100)===36 &&
      r.met.suena.err && r.met.suena.err.n===14 && Math.round(r.met.suena.err.c*100)===0 && Math.round(r.met.suena.err.r*100)===62 &&
      JSON.stringify(r.met.heaven.err.meses)==='["2026-08","2026-09"]', [r.met && r.met.heaven.err, r.met && r.met.suena.err]);
  chk('🏭 los mayoristas siguen con el ritmo aunque tengan historia: 20.000 + 1.666,67 × 15 = Bs 45.000',
      r.met && r.met.mayor.m==='ritmo' && r.met.mayor.porque==='mayor' && r.ed && r.ed.proy===45000 && r.may.proy===45000, [r.met && r.met.mayor, r.ed]);

  // ═══ 8. Lo que se ve con la curva ═════════════════════════════════════════════════════════════
  console.log('\n── 8. Lo que se ve con la curva ──');
  r = await ev(() => {
    segSet('cta-tab','proy'); setContaTab('proy');
    document.getElementById('pry-mes').value='2026-10'; renderProyeccion();
    return { met:_txt('pry-metrics'), vend:_txt('pry-vendedores'), nota:_txt('pry-nota'), como:_txt('pry-como') };
  });
  chk('ficha «📈 Proyección al cierre» Bs 116.855 «según cómo se llenaron agosto y septiembre, cada marca con su curva»',
      /PROYECCIÓN AL CIERRE Bs 116\.855 según cómo se llenaron agosto y septiembre, cada marca con su curva · faltan 15 días hábiles/i.test(r.met), r.met);
  chk('cada marca dice su parte: Sueña «ya estaba vendido el 80%», Heaven «el 60%»',
      /SUEÑA Bs 40\.000,00 8 ventas · 8 unidades · 56% del equipo · 📈 proyección Bs 53\.600 · en agosto y septiembre, a esta altura, ya estaba vendido el 80%/i.test(r.met) &&
      /HEAVEN Bs 30\.000,00 10 ventas · 10 unidades · 42% del equipo · 📈 proyección Bs 60\.240 · en agosto y septiembre, a esta altura, ya estaba vendido el 60%/i.test(r.met), r.met);
  chk('debajo de Heaven, la cuenta entera: las dos cuentas, cuánto pesa cada una y el resultado',
      /📈 Faltando 15 días hábiles para el cierre, en agosto y septiembre ya estaba vendido el 60% del mes\. Dos cuentas: \(1\) si sigue en esa proporción, Bs 30\.000 ÷ 60% = Bs 50\.000; \(2\) lo vendido más lo que en esos meses entró desde esta altura hasta el cierre \(40% de Bs 90\.000, lo que vendieron en promedio\): Bs 30\.000 \+ Bs 36\.000 = Bs 66\.000\. La \(1\) pesa 36% —más cuanto más avanzado está el mes— y la \(2\), 64% → Bs 60\.240\./.test(r.vend), r.vend);
  chk('…y cómo le fue en la prueba: «la curva se equivocó 17% en promedio y el ritmo 36%»',
      /→ Bs 60\.240\. En la prueba con agosto y septiembre, la curva se equivocó 17% en promedio y el ritmo 36%\./.test(r.vend), r.vend);
  chk('…debajo del sin marca y de los mayoristas, por qué van con el ritmo',
      /📈 Con el ritmo: no están en ninguna marca, así que no tienen una curva propia\./.test(r.vend) && /📈 Con el ritmo: son pocas compras y grandes/.test(r.vend), r.vend);
  chk('con dos meses de historia no avisa «un solo mes»', !/sale de un solo mes/.test(r.nota), r.nota);
  chk('«Cómo se cuenta» explica la curva y cuándo va el ritmo',
      /Proyección, con la curva de cada marca/.test(r.como) && /Con el ritmo cuando la marca todavía no tiene un mes cerrado con al menos 20 ventas/.test(r.como) && /desde agosto de 2026/.test(r.como), r.como);

  // ═══ 9. 🧪 La prueba ══════════════════════════════════════════════════════════════════════════
  console.log('\n── 9. 🧪 La prueba con los meses que ya pasaron ──');
  r = await ev(() => {
    var V=proyeccionMes('2026-10').V, H=['2026-08','2026-09'], hoy=todayStr();
    var P=pryPrueba(V, '2026-08', H, hoy), S=pryPrueba(V, '2026-09', H, hoy), O=pryPrueba(V, '2026-10', H, hoy);
    var fila=function(X, d, k){ var f=X.filas.filter(function(x){ return x.d===d; })[0]; return f ? { K:f.s[k].K, r:Math.round(f.s[k].ritmo), c:(f.s[k].curva==null ? null : Math.round(f.s[k].curva)), dr:f.dr } : null; };
    var bloq=function(ym, g){ var e=document.querySelector('#pry-prueba .pry-prueba[data-ym="'+ym+'"][data-g="'+g+'"]'); return e ? e.innerText.replace(/\s+/g,' ').trim() : ''; };
    var filasTxt=function(ym, g){ var e=document.querySelector('#pry-prueba .pry-prueba[data-ym="'+ym+'"][data-g="'+g+'"] tbody'); return e ? e.innerText.replace(/\s+/g,' ').trim() : ''; };
    return { fechas:P.filas.map(function(x){ return x.d; }), curA:P.cur.heaven.meses, curS:S.cur.heaven.meses,
             a05:fila(P,'2026-08-05','heaven'), a15:fila(P,'2026-08-15','heaven'), a20:fila(P,'2026-08-20','heaven'), a30:fila(P,'2026-08-30','heaven'),
             s10:fila(S,'2026-09-10','heaven'), su10:fila(P,'2026-08-10','suena'), totA:P.tot, totS:S.tot,
             oct:O.filas.map(function(x){ return x.d; }), o05:fila(O,'2026-10-05','heaven'),
             bAgoH:bloq('2026-08','heaven'), bAgoS:bloq('2026-08','suena'), bSepH:bloq('2026-09','heaven'), bOctH:bloq('2026-10','heaven'), fOctH:filasTxt('2026-10','heaven'),
             orden:[].slice.call(document.querySelectorAll('#pry-prueba .pry-prueba')).map(function(e){ return e.getAttribute('data-ym')+'|'+e.getAttribute('data-g'); }),
             gana:((document.querySelector('#pry-prueba .pry-gana')||{}).innerText||'').replace(/\s+/g,' ') };
  });
  chk('se prueba los días 5, 10, 15, 20 y 25, faltando 3 días hábiles (jue 27/08) y la víspera del último (dom 30/08)',
      JSON.stringify(r.fechas)==='["2026-08-05","2026-08-10","2026-08-15","2026-08-20","2026-08-25","2026-08-27","2026-08-30"]', [r.fechas, r.__error]);
  chk('la curva para agosto sale de septiembre, y la de septiembre de agosto (nunca del mismo mes)', JSON.stringify(r.curA)==='["2026-09"]' && JSON.stringify(r.curS)==='["2026-08"]', [r.curA, r.curS]);
  chk('Heaven, 05/08 (faltaban 22): vendido 24.000; el ritmo decía 156.000 y la curva (septiembre: 40 % vendido, 120.000) 90.240 → (1) 60.000 × 16 % + (2) 96.000 × 84 %',
      r.a05 && r.a05.dr===22 && r.a05.K===24000 && r.a05.r===156000 && r.a05.c===90240 && r.totA && r.totA.heaven===60000, [r.a05, r.totA]);
  chk('Heaven, 15/08: septiembre esperaba más vendido a esa altura (70 %) → la curva 47.400; el ritmo, 48.000', r.a15 && r.a15.r===48000 && r.a15.c===47400, r.a15);
  chk('Heaven, 20/08: con lo agendado para el 29, el ritmo decía 42.000 y la curva 69.180', r.a20 && r.a20.K===42000 && r.a20.r===42000 && r.a20.c===69180, r.a20);
  chk('Heaven, dom 30/08 (faltaba 1): los dos dan 60.000', r.a30 && r.a30.dr===1 && r.a30.r===60000 && r.a30.c===60000, r.a30);
  chk('Sueña, 10/08: el ritmo decía 260.000 (vende al principio) y la curva 100.000 = lo que terminó', r.su10 && r.su10.r===260000 && r.su10.c===100000 && r.totA.suena===100000, [r.su10, r.totA]);
  chk('septiembre con la curva de agosto (40 % vendido, 60.000): el 10/09 decía 134.400 → (1) 210.000 × 16 % + (2) 120.000 × 84 %', r.s10 && r.s10.K===84000 && r.s10.c===134400 && r.totS && r.totS.heaven===120000, [r.s10, r.totS]);
  chk('en pantalla, Heaven agosto: «terminó en Bs 60.000», cada fecha con lo que decía cada una y el error, y el promedio (ritmo 43 %, curva 24 %)',
      /Heaven — agosto de 2026 terminó en Bs 60\.000/.test(r.bAgoH) && /mié 05\/08 faltaban 22 días hábiles Bs 24\.000 Bs 156\.000 \+160% Bs 90\.240 \+50%/.test(r.bAgoH) &&
      /sáb 15\/08 faltaban 13 días hábiles Bs 24\.000 Bs 48\.000 −20% Bs 47\.400 −21%/.test(r.bAgoH) && /dom 30\/08 faltaba 1 día hábil Bs 60\.000 Bs 60\.000 0% Bs 60\.000 0%/.test(r.bAgoH) &&
      /Se equivocó, en promedio 43% 24%/.test(r.bAgoH) && /La curva para agosto sale de septiembre \(y lo que vendió, Bs 120\.000\)\./.test(r.bAgoH), r.bAgoH);
  chk('Sueña agosto: el ritmo se equivocó 43 % en promedio y la curva 0 %', /Se equivocó, en promedio 43% 0%/.test(r.bAgoS), r.bAgoS);
  chk('Heaven septiembre (con la de agosto): el ritmo se equivocó 30 % en promedio y la curva 10 %',
      /Heaven — septiembre de 2026 terminó en Bs 120\.000/.test(r.bSepH) && /Se equivocó, en promedio 30% 10%/.test(r.bSepH), r.bSepH);
  chk('octubre (no cerró): solo las fechas que ya pasaron (05 y 10), «va en Bs 30.000 · faltan 15 días hábiles», sin ningún error',
      JSON.stringify(r.oct)==='["2026-10-05","2026-10-10"]' && r.o05 && r.o05.c===67680 && r.o05.r===121500 &&
      /Heaven — octubre de 2026 va en Bs 30\.000 · faltan 15 días hábiles/.test(r.bOctH) && !/Se equivocó/.test(r.bOctH) && r.fOctH && !/%/.test(r.fOctH) &&
      /El error se ve cuando cierre el mes/.test(r.bOctH), [r.oct, r.o05, r.fOctH, r.bOctH]);
  chk('arriba de la prueba, quién ganó en cada marca y con qué va octubre',
      /Sueña: en agosto y septiembre, el ritmo se equivocó 62% en promedio y la curva 0% → octubre de 2026 va con la curva\./.test(r.gana) &&
      /Heaven: en agosto y septiembre, el ritmo se equivocó 36% en promedio y la curva 17% → octubre de 2026 va con la curva\./.test(r.gana), r.gana);
  chk('orden: agosto, septiembre y octubre; en cada mes Sueña y después Heaven',
      JSON.stringify(r.orden)==='["2026-08|suena","2026-08|heaven","2026-09|suena","2026-09|heaven","2026-10|suena","2026-10|heaven"]', r.orden);

  // ═══ 10. 📅 Cómo se vendió agosto ═════════════════════════════════════════════════════════════
  console.log('\n── 10. 📅 Cómo se vendió agosto ──');
  r = await ev(() => {
    document.getElementById('pry-mes').value='2026-08'; renderProyeccion();
    var b=function(g){ var e=document.querySelector('#pry-patron .pry-patron[data-g="'+g+'"]'); return e ? e.innerText.replace(/\s+/g,' ').trim() : ''; };
    var barras=[].slice.call(document.querySelectorAll('#pry-patron .pry-patron[data-g="heaven"] .pry-barras>div'));
    return { tit:(document.querySelector('#pry-patron .cua-t')||{}).innerText||'', hea:b('heaven'), sue:b('suena'),
             nb:barras.length, alto:barras.map(function(x){ return parseInt(x.style.height,10)||0; }),
             osc:barras.map(function(x,i){ return x.style.background.indexOf('15, 118, 110')>=0 ? i+1 : 0; }).filter(Boolean),
             prueba:document.querySelectorAll('#pry-prueba .pry-prueba').length };
  });
  chk('el título dice «Cómo se vendió — agosto de 2026»', /CÓMO SE VENDIÓ — AGOSTO DE 2026/i.test(r.tit), [r.tit, r.__error]);
  chk('una barra por día (31); la más alta, el 05/08 (Bs 24.000); en oscuro, los últimos 3 días hábiles (28, 29 y 31)',
      r.nb===31 && r.alto[4]===86 && r.alto[28]===65 && r.alto[30]===65 && JSON.stringify(r.osc)==='[28,29,31]' && /el día más alto: mié 05\/08, Bs 24\.000/.test(r.hea), [r.nb, r.alto, r.osc]);
  chk('Heaven, los últimos 3 días hábiles: «vie 28/08: Bs 0 · sáb 29/08: Bs 18.000 · lun 31/08: Bs 18.000 → Bs 36.000, el 60% del mes»',
      /Los últimos 3 días hábiles — vie 28\/08: Bs 0 · sáb 29\/08: Bs 18\.000 · lun 31\/08: Bs 18\.000 → Bs 36\.000, el 60% del mes\./.test(r.hea), r.hea);
  chk('…«De eso, Bs 18.000 ya estaba vendido (agendado) antes del 28/08 y Bs 18.000 se vendió esos mismos días»',
      /De eso, Bs 18\.000 ya estaba vendido \(agendado\) antes del 28\/08 y Bs 18\.000 se vendió esos mismos días\./.test(r.hea), r.hea);
  chk('cómo se fue llenando: el 10/08 el 40 %, el 20/08 el 70 %, el 27/08 el 70 % y el 30/08 el 100 %',
      /Cómo se fue llenando — de lo que terminó vendiendo el mes, el 10\/08 ya estaba vendido el 40% · el 20\/08 ya estaba vendido el 70% · el 27\/08 ya estaba vendido el 70% · el 30\/08 ya estaba vendido el 100%\./.test(r.hea), r.hea);
  chk('qué días se vende más (agosto y septiembre, por el día en que se cargó): el jueves, Bs 6.750 por día; el que menos, el martes',
      /Qué días se vende más — promedio por día, por el día en que se cargó la venta \(agosto y septiembre\)\. El que más: jueves; el que menos \(de lunes a sábado\): martes\./.test(r.hea) &&
      /lun Bs 6\.667 mar Bs 0 mié Bs 5\.333 jue Bs 6\.750 vie Bs 2\.250 sáb Bs 0 dom Bs 0/.test(r.hea), r.hea);
  chk('Sueña tiene su propio cuadro (en sus últimos 3 días hábiles no entregó nada: el 0%)', /Sueña Bs 100\.000 en el mes/.test(r.sue) && /→ Bs 0, el 0% del mes\./.test(r.sue) && !/De eso/.test(r.sue), r.sue);
  chk('la prueba no depende del mes elegido arriba (con agosto elegido, siguen los 6 cuadros)', r.prueba===6, r.prueba);

  // ═══ 11. Principio de mes ═════════════════════════════════════════════════════════════════════
  console.log('\n── 11. Principio de mes: viernes 02/10 ──');
  await reloj('2026-10-02T15:00:00-04:00');
  r = await ev(() => {
    STATE=HASTA('2026-10-02');
    document.getElementById('pry-mes').value='2026-10'; renderProyeccion();
    var R=proyeccionMes('2026-10');
    var m=function(k){ return R.marcas.filter(function(x){ return x.g.k===k; })[0].tot; };
    return { dr:R.dr, met:R.metodos, hea:m('heaven'), sue:m('suena'), metTxt:_txt('pry-metrics'), vend:_txt('pry-vendedores') };
  });
  chk('faltan 25 días hábiles: a esta altura, en agosto y septiembre, Heaven no tenía nada vendido (0 %) y Sueña ya tenía el 40 %; las dos con su curva',
      r.dr===25 && r.met && r.met.heaven.m==='curva' && r.met.heaven.f===0 && r.met.suena.m==='curva' && Math.abs(r.met.suena.f-0.4)<1e-9, [r.dr, r.met, r.__error]);
  chk('Heaven: sin dividir por cero, manda la (2): 18.000 + 90.000 = Bs 108.000; Sueña: 100.000 y 100.000 → Bs 100.000',
      r.hea && r.hea.proy===108000 && r.met.heaven.w===0 && r.sue && r.sue.proy===100000, [r.sue, r.hea]);
  chk('la ficha: Bs 208.000, «según cómo se llenaron agosto y septiembre»', /PROYECCIÓN AL CIERRE Bs 208\.000 según cómo se llenaron agosto y septiembre, cada marca con su curva · faltan 25 días hábiles/i.test(r.metTxt), r.metTxt);
  chk('debajo de Heaven: «(1) … no se puede: a esta altura no había nada vendido» y la (2) pesa 100 %',
      /\(1\) si sigue en esa proporción, no se puede: a esta altura no había nada vendido; \(2\) lo vendido más lo que en esos meses entró desde esta altura hasta el cierre \(100% de Bs 90\.000, lo que vendieron en promedio\): Bs 18\.000 \+ Bs 90\.000 = Bs 108\.000\. La \(1\) pesa 0% —más cuanto más avanzado está el mes— y la \(2\), 100% → Bs 108\.000\./.test(r.vend), r.vend);

  // ═══ 12. «Hoy», martes 29/09 ══════════════════════════════════════════════════════════════════
  console.log('\n── 12. «Hoy», martes 29/09: la curva sale de agosto solo ──');
  await reloj('2026-09-29T15:00:00-04:00');
  r = await ev(() => {
    STATE=HASTA('2026-09-29');
    document.getElementById('pry-mes').value='2026-09'; renderProyeccion();
    var R=proyeccionMes('2026-09'), S=pryPrueba(R.V, '2026-09', R.hist, todayStr());
    var b=function(ym, g){ var e=document.querySelector('#pry-prueba .pry-prueba[data-ym="'+ym+'"][data-g="'+g+'"]'); return e ? e.innerText.replace(/\s+/g,' ').trim() : ''; };
    var f10=S.filas.filter(function(x){ return x.d==='2026-09-10'; })[0];
    return { hist:R.hist, met:R.metodos, nota:_txt('pry-nota'), vend:_txt('pry-vendedores'), gana:((document.querySelector('#pry-prueba .pry-gana')||{}).innerText||'').replace(/\s+/g,' '),
             agoH:b('2026-08','heaven'), sepH:b('2026-09','heaven'),
             fechas:S.filas.map(function(x){ return x.d; }), s10:(f10 && f10.s.heaven.curva!=null) ? Math.round(f10.s.heaven.curva) : null };
  });
  chk('la historia es solo agosto, y arriba avisa que la curva sale de un solo mes',
      JSON.stringify(r.hist)==='["2026-08"]' && r.met && r.met.heaven.m==='curva' && /La curva de Sueña y Heaven sale de un solo mes \(agosto\): si ese mes fue raro, la proyección lo copia/.test(r.nota), [r.hist, r.nota, r.__error]);
  chk('…y dice que cuando cierre septiembre la compara con el ritmo y elige la que menos se equivocó',
      /Cuando cierre septiembre, el panel la compara con el ritmo y usa, en cada marca, la que menos se equivocó/.test(r.nota), r.nota);
  chk('la prueba todavía no puede elegir (hacen falta dos meses cerrados) y la marca va con la curva, y lo dice debajo',
      /Todavía no se pueden comparar: la curva de un mes se prueba con otro mes cerrado, así que hacen falta dos\. Hasta entonces va la curva, y la comparación aparece sola cuando cierre septiembre\./.test(r.gana) &&
      /Todavía no se pudo comparar con el ritmo: hace falta otro mes cerrado\./.test(r.vend) && r.met.heaven.m==='curva', [r.gana, r.vend]);
  chk('agosto todavía no se puede probar con la curva («—») y lo dice: se va a poder cuando cierre septiembre',
      /Heaven — agosto de 2026 terminó en Bs 60\.000/.test(r.agoH) && /Bs 156\.000 \+160% —/.test(r.agoH) && /Se va a poder probar cuando cierre septiembre\./.test(r.agoH) && /Se equivocó, en promedio 43% —/.test(r.agoH), r.agoH);
  chk('septiembre (en curso) con la curva de agosto: hasta el domingo 27 (lo de hoy no), el 10/09 decía 134.400, «va en Bs 120.000 · falta 1 día hábil», sin error',
      JSON.stringify(r.fechas)==='["2026-09-05","2026-09-10","2026-09-15","2026-09-20","2026-09-25","2026-09-27"]' && r.s10===134400 &&
      /Heaven — septiembre de 2026 va en Bs 120\.000 · falta 1 día hábil/.test(r.sepH) && !/Se equivocó/.test(r.sepH), [r.fechas, r.s10, r.sepH]);

  // ═══ 13. Todo en pantalla, sin scroll de costado ══════════════════════════════════════════════
  console.log('\n── 13. Con la prueba y el patrón en pantalla, sin scroll de costado ──');
  await reloj('2026-10-14T15:00:00-04:00');
  for (const w of [820, 1180, 390]) {
    await page.setViewportSize({ width:w, height:1000 });
    await page.waitForTimeout(150);
    for (const ym of ['2026-10','2026-08']) {
      r = await ev((ym) => { STATE=FIX2(); document.getElementById('pry-mes').value=ym; renderProyeccion(); acomodarFichas();
        return { sw:document.documentElement.scrollWidth, iw:window.innerWidth,
          tablasAnchas:[].slice.call(document.querySelectorAll('#pry-prueba .pry-scroll')).filter(function(e){ return e.scrollWidth>e.clientWidth+1; }).length,
          barras:document.querySelectorAll('#pry-patron .pry-barras').length,
          fuera:[].slice.call(document.querySelectorAll('#pry-patron .pry-barras>div, #pry-patron .pry-sem b, #pry-prueba .pry-gh')).filter(function(e){ var b=e.getBoundingClientRect(); return b.right>window.innerWidth+1; }).length }; }, ym);
      chk('a '+w+' px, '+ym+': sin scroll de costado'+(w>=820 ? ', y las tablas de la prueba entran enteras' : ''),
          r.sw<=r.iw && r.fuera===0 && r.barras>=2 && (w<820 || r.tablasAnchas===0), r);
    }
  }

  // ═══ 14. 🏁 Elige la prueba ═══════════════════════════════════════════════════════════════════
  console.log('\n── 14. 🏁 Si una marca vende parejo, la prueba elige el ritmo ──');
  await page.setViewportSize({ width:1180, height:900 });
  await reloj('2026-10-14T15:00:00-04:00');
  r = await ev(() => {
    STATE=FIX3();
    document.getElementById('pry-mes').value='2026-10'; renderProyeccion();
    var R=proyeccionMes('2026-10');
    var m=function(k){ return R.marcas.filter(function(x){ return x.g.k===k; })[0].tot; };
    var mau=R.marcas[0].filas.filter(function(x){ return mismoVendedor(x.vendedor,'Mauricio Merida'); })[0];
    return { met:R.metodos, sue:m('suena'), hea:m('heaven'), E:R.equipo, mau:mau, metTxt:_txt('pry-metrics'), vend:_txt('pry-vendedores'),
             gana:((document.querySelector('#pry-prueba .pry-gana')||{}).innerText||'').replace(/\s+/g,' ') };
  });
  chk('Sueña (pareja): en la prueba el ritmo se equivocó 0 % y la curva 22 % → va con el ritmo', r.met && r.met.suena.m==='ritmo' && r.met.suena.porque==='prueba' &&
      r.met.suena.err.r<1e-9 && Math.round(r.met.suena.err.c*100)===22 && r.met.suena.err.n===14, [r.met && r.met.suena, r.__error]);
  chk('…Mauricio y Sueña proyectan con el ritmo (Bs 90.000); Heaven sigue con la curva (Bs 60.240); el equipo, Bs 153.255',
      r.mau && r.mau.metodo==='ritmo' && r.mau.proy===90000 && r.sue.proy===90000 && r.met.heaven.m==='curva' && r.hea.proy===60240 && r.E.proy===153255, [r.mau, r.sue, r.hea, r.E]);
  chk('la ficha dice «Sueña con el ritmo, Heaven con la curva», y la de Sueña no dice «a esta altura»',
      /PROYECCIÓN AL CIERRE Bs 153\.255 Sueña con el ritmo, Heaven con la curva · faltan 15 días hábiles/i.test(r.metTxt) &&
      /SUEÑA Bs 40\.000,00 8 ventas · 8 unidades · \d+% del equipo · 📈 proyección Bs 90\.000 💚/i.test(r.metTxt), r.metTxt);
  chk('debajo de Sueña: «Con el ritmo: en la prueba con agosto y septiembre se equivocó menos (0% en promedio, contra 22% de la curva)»',
      /📈 Con el ritmo: en la prueba con agosto y septiembre se equivocó menos \(0% en promedio, contra 22% de la curva\)\./.test(r.vend), r.vend);
  chk('el resumen de la prueba: Sueña va con el ritmo y Heaven con la curva',
      /Sueña: en agosto y septiembre, el ritmo se equivocó 0% en promedio y la curva 22% → octubre de 2026 va con el ritmo \(desde el 5° día hábil; antes, con la curva\)\./.test(r.gana) &&
      /Heaven: en agosto y septiembre, el ritmo se equivocó 36% en promedio y la curva 17% → octubre de 2026 va con la curva\./.test(r.gana), r.gana);

  /* El viernes 02/10 (2 días hábiles) la prueba sigue prefiriendo el ritmo para Sueña, pero con 2 días no hay ritmo: va la curva. */
  await reloj('2026-10-02T15:00:00-04:00');
  r = await ev(() => {
    var t=new Date('2026-10-02T23:59:59-04:00').getTime();
    STATE=FIX3().filter(function(p){ return p.ts<=t; });
    document.getElementById('pry-mes').value='2026-10'; renderProyeccion();
    var R=proyeccionMes('2026-10');
    return { dt:R.dt, met:R.metodos, sue:R.marcas[0].tot, vend:_txt('pry-vendedores') };
  });
  chk('…pero el 02/10 (van 2 días hábiles) Sueña va con la curva igual: con tan pocos días no hay ritmo',
      r.dt===2 && r.met && r.met.suena.m==='curva' && r.met.suena.err.r<r.met.suena.err.c && Math.round(r.sue.proy)===116368 &&
      /el ritmo va desde el 5° día hábil del mes: antes, con tan pocos días, no hay ritmo\./.test(r.vend), [r.dt, r.met && r.met.suena, r.sue, r.__error]);

  // ═══ 15. 📦 Las unidades ═════════════════════════════════════════════════════════════════════
  console.log('\n── 15. 📦 Las unidades ──');
  await reloj('2026-10-14T15:00:00-04:00');
  r = await ev(() => {
    var t=function(x){ return pryTipoProd(x); };
    var casos={ titanio:t({desc:'TITANIO LATEX',cant:2}), almo:t({desc:'2 ALMOHADAS',cant:2}), nasa:t({desc:'ALM/NASA',cant:1}),
                cod:t({codigo:'CH1149',desc:'lo que sea',cant:1}), prot:t({desc:'PROTECTOR DE COLCHON',cant:1}),
                comboCat:t({codigo:'CMBSE002',desc:'combo',cant:1}), comboTxt:t({desc:'COMBO COLCHON + SOMIER + 2 ALMOHADAS',cant:1}), comboSab:t({desc:'COMBO DE SABANAS',cant:1}),
                resp:t({desc:'RESPALDAR PRAG.',cant:1}), varios:t({desc:'VARIOS',cant:1}), sab:t({desc:'JUEGO DE SABANAS',cant:1}),
                patas:t({desc:'PATAS PARA SOMIER',cant:4}), cuna:t({desc:'COLCHON CUNA',cant:1}), colchoneta:t({desc:'COLCHONETA',cant:1}), forro:t({desc:'FORRO COLCHON PILLOW PEDIC',cant:1}),
                /* renglones escritos a mano con varias cosas */
                conAlm:t({desc:'COLCHON TITANIO + 2 ALMOHADAS',cant:1}), cBarra:t({desc:'TITANIO LATEX C/2 ALMOHADAS DE REGALO',cant:1}), cyS:t({desc:'Colchón y somier titanio',cant:1}),
                almYcuna:t({desc:'2 ALMOHADAS + COLCHON CUNA',cant:1}), regalo:t({desc:'COLCHON DE REGALO',cant:1}), somPatas:t({desc:'SOMIER + PATAS',cant:1}),
                protEnvio:t({desc:'PROTECTOR + ENVIO',cant:1}), envio:t({desc:'ENVIO',cant:1}), topper:t({desc:'TOPPER VISCOLASTICO',cant:1}),
                comboAlm:t({desc:'COMBO ALMOHADAS NASA',cant:1}), comboLibre:t({desc:'COMBO ORTOPEDICO SUEÑA',cant:1}), ortoDC:t({desc:'ESPECIAL ORTOPEDICO D/C',cant:1}) };
    var venta={ productos:[{desc:'TITANIO LATEX',medida:'140x190',cant:2},{desc:'ALMOHADA',medida:'50x70',cant:2},{desc:'PROTECTOR',medida:'140x190',cant:1}] };
    var combo={ productos:[{codigo:'CMBSE002',desc:'COMBO SUEÑA ESSENTIAL',medida:'140x190',cant:1},{desc:'SOMIER SUEÑA',medida:'140x190',cant:1}] };
    STATE=FIX2();
    var p=V('Maria Flores','2026-10-16',9000); p.productos=venta.productos; p.ts=new Date('2026-10-13T10:00:00-04:00').getTime(); STATE.push(p);
    document.getElementById('pry-mes').value='2026-10'; renderProyeccion();
    var R=proyeccionMes('2026-10'), mf=R.marcas[1].filas.filter(function(x){ return mismoVendedor(x.vendedor,'Maria Flores'); })[0];
    return { casos:casos, uv:pryUnidadesDe(venta), uc:pryUnidadesDe(combo), mf:mf, hea:R.marcas[1].tot, vend:_txt('pry-vendedores'), met:_txt('pry-metrics'), como:_txt('pry-como') };
  });
  chk('cuentan: TITANIO, COLCHON CUNA y COLCHONETA (colchones) y el código CH1149 (somier, aunque el renglón diga otra cosa)',
      r.casos && r.casos.titanio==='colchon' && r.casos.cuna==='colchon' && r.casos.colchoneta==='colchon' && r.casos.cod==='somier', [r.casos, r.__error]);
  chk('NO cuentan: «2 ALMOHADAS», «ALM/NASA», el respaldar, las patas, el forro, el protector, las sábanas y «VARIOS»',
      r.casos && r.casos.almo==='' && r.casos.nasa==='' && r.casos.resp==='' && r.casos.patas==='' && r.casos.forro==='' && r.casos.prot==='' && r.casos.sab==='' && r.casos.varios==='', r.casos);
  chk('combos: el del catálogo, «COMBO ORTOPEDICO SUEÑA» escrito y «COMBO COLCHON + SOMIER + 2 ALMOHADAS» son colchón + somier; «COMBO DE SABANAS» y «COMBO ALMOHADAS NASA» no cuentan',
      r.casos && r.casos.comboCat==='combo' && r.casos.comboLibre==='combo' && r.casos.comboTxt==='combo' && r.casos.comboSab==='' && r.casos.comboAlm==='', r.casos);
  chk('escrito a mano con varias cosas: el colchón no se pierde por las almohadas («COLCHON TITANIO + 2 ALMOHADAS», «TITANIO LATEX C/2 ALMOHADAS DE REGALO», «2 ALMOHADAS + COLCHON CUNA», «COLCHON DE REGALO», «ESPECIAL ORTOPEDICO D/C»)',
      r.casos && r.casos.conAlm==='colchon' && r.casos.cBarra==='colchon' && r.casos.almYcuna==='colchon' && r.casos.regalo==='colchon' && r.casos.ortoDC==='colchon', r.casos);
  chk('…«Colchón y somier titanio» es colchón + somier, «SOMIER + PATAS» un somier; «PROTECTOR + ENVIO», «ENVIO» y «TOPPER VISCOLASTICO» no cuentan',
      r.casos && r.casos.cyS==='combo' && r.casos.somPatas==='somier' && r.casos.protEnvio==='' && r.casos.envio==='' && r.casos.topper==='', r.casos);
  chk('una venta de 2 colchones + 2 almohadas + 1 protector = 2 unidades (2 colchones); un combo + un somier = 3 (1 colchón y 2 somieres)',
      r.uv && r.uv.u===2 && r.uv.c===2 && r.uv.s===0 && r.uc && r.uc.u===3 && r.uc.c===1 && r.uc.s===2, [r.uv, r.uc]);
  chk('Maria Flores: 11 ventas y 12 unidades (10 + 2), todas colchones; Heaven igual',
      r.mf && r.mf.n===11 && r.mf.u===12 && r.mf.c===12 && r.mf.s===0 && r.hea && r.hea.u===12 && r.hea.c===12, [r.mf, r.hea]);
  chk('en pantalla: «11 ventas · 12 unidades» en Maria y en la ficha de Heaven; el cuadro de abajo dice qué es una unidad',
      /Maria Flores 11 ventas · 12 unidades · /.test(r.vend) && /HEAVEN Bs 39\.000,00 11 ventas · 12 unidades · /i.test(r.met) &&
      /Unidades: colchones \(también colchonetas y colchones de bebé\) y somieres/.test(r.como) && /No cuentan almohadas, respaldares, patas/.test(r.como) &&
      /Un combo cuenta como un colchón y un somier/.test(r.como), [r.vend, r.met, r.como]);

  // ═══ 16. 📊 A esta altura ═════════════════════════════════════════════════════════════════════
  console.log('\n── 16. 📊 A esta altura ──');
  r = await ev(() => {
    STATE=FIX2(); PRY_CMP=''; PRY_CMP_DE='';
    document.getElementById('pry-mes').value='2026-10'; renderProyeccion();
    var R=proyeccionMes('2026-10'), A=pryAltura(R);
    var box=function(){ return _txt('pry-altura'); };
    var bl=function(g){ var e=document.querySelector('#pry-altura .pry-altura[data-g="'+g+'"]'); return e ? e.innerText.replace(/\s+/g,' ').trim() : ''; };
    var semH=function(){ var e=document.querySelector('#pry-altura .pry-altura[data-g="heaven"] details'); if(e) e.open=true; return e ? e.innerText.replace(/\s+/g,' ').trim() : ''; };
    var out={ cmp:A.cmp, dia:A.dia, ops:A.ops, aH:A.act.heaven, bH:A.ant.heaven, eH:A.antEntero.heaven, aS:A.act.suena, bS:A.ant.suena, aE:A.act.equipo, bE:A.ant.equipo,
              txt:box(), hea:bl('heaven'), semH:semH(), sel:!!document.getElementById('pry-cmp'),
              orden:[].slice.call(document.querySelectorAll('#pry-altura, #pry-vendedores')).map(function(e){ return e.id; }),
              antesDeVend:document.getElementById('pry-altura').compareDocumentPosition(document.getElementById('pry-vendedores'))===4 };
    /* Comparar con agosto */
    var s=document.getElementById('pry-cmp'); if(s){ s.value='2026-08'; s.dispatchEvent(new Event('change')); }
    out.conAgo=bl('heaven'); out.cmpAgo=PRY_CMP;
    /* Un mes cerrado: septiembre entero contra agosto entero */
    document.getElementById('pry-mes').value='2026-09'; renderProyeccion(); out.sep=box(); out.sepH=bl('heaven');
    /* Agosto no tiene con qué compararse */
    document.getElementById('pry-mes').value='2026-08'; renderProyeccion(); out.ago=box();
    document.getElementById('pry-mes').value='2026-10'; renderProyeccion();
    return out;
  });
  chk('octubre al día 14 contra septiembre al día 14 (por defecto, el mes anterior); se puede elegir entre agosto y septiembre',
      r.cmp==='2026-09' && r.dia===14 && JSON.stringify(r.ops)==='["2026-08","2026-09"]' && r.sel, [r.cmp, r.dia, r.ops, r.sel, r.__error]);
  chk('Heaven: octubre lleva Bs 30.000 en 10 ventas y 10 unidades; septiembre al día 14 llevaba Bs 84.000, 14 y 14; septiembre entero, Bs 120.000 y 20',
      r.aH && r.aH.bs===30000 && r.aH.n===10 && r.aH.u===10 && r.bH.bs===84000 && r.bH.n===14 && r.bH.u===14 && r.eH.bs===120000 && r.eH.u===20, [r.aH, r.bH, r.eH]);
  chk('semanas de Heaven: octubre 18.000 (6 u.) del 1 al 7 y 12.000 (4) del 8 al 14; septiembre 48.000 (8), 36.000 (6) y 36.000 (6) del 22 al 28',
      r.aH && r.aH.sem[1].bs===18000 && r.aH.sem[1].u===6 && r.aH.sem[2].bs===12000 && r.aH.sem[2].u===4 &&
      r.eH.sem[1].bs===48000 && r.eH.sem[2].bs===36000 && r.eH.sem[4].bs===36000 && r.eH.sem[4].u===6, [r.aH && r.aH.sem, r.eH && r.eH.sem]);
  chk('Sueña 40.000 y 8 contra 80.000 y 16; el equipo 71.340 y 19 contra 164.000 y 30 (con el sin marca)',
      r.aS && r.aS.bs===40000 && r.aS.u===8 && r.bS.bs===80000 && r.bS.u===16 && r.aE.bs===71340 && r.aE.u===19 && r.bE.bs===164000 && r.bE.u===30, [r.aS, r.bS, r.aE, r.bE]);
  chk('arriba del todo: «Heaven: 64% abajo en plata (Bs 30.000 contra Bs 84.000) y 29% abajo en unidades (10 contra 14)», y lo mismo para Sueña y el equipo',
      /📊 A ESTA ALTURA — OCTUBRE DE 2026 AL DÍA 14/i.test(r.txt) && /contra septiembre de 2026 al día 14/.test(r.txt) &&
      /Heaven: 64% abajo en plata \(Bs 30\.000 contra Bs 84\.000\) y 29% abajo en unidades \(10 contra 14\)\./.test(r.txt) &&
      /Sueña: 50% abajo en plata \(Bs 40\.000 contra Bs 80\.000\) y 50% abajo en unidades \(8 contra 16\)\./.test(r.txt) &&
      /Todo el equipo: \d+% abajo en plata \(Bs 71\.340 contra Bs 164\.000\) y 37% abajo en unidades \(19 contra 30\)\./.test(r.txt), r.txt);
  chk('la tabla de Heaven: octubre, septiembre al día 14, la diferencia (−64%, −29%, −29%, −29%, sin somieres, −50% por unidad) y septiembre entero',
      /Octubre al día 14 Bs 30\.000 10 10 10 0 Bs 3\.000 Septiembre al día 14 Bs 84\.000 14 14 14 0 Bs 6\.000 Diferencia −64% −29% −29% −29% — −50% Septiembre entero Bs 120\.000 20 20 20 0 Bs 6\.000/.test(r.hea), r.hea);
  chk('semana por semana (se abre): la semana en curso dice «(va)», y las que no llegaron van con «—»',
      /Del 1 al 7 Bs 18\.000 6 Bs 48\.000 8/.test(r.semH) && /Del 8 al 14 \(va\) Bs 12\.000 4 Bs 36\.000 6/.test(r.semH) && /Del 22 al 28 — — Bs 36\.000 6/.test(r.semH), r.semH);
  chk('el cuadro va arriba de la lista por vendedor', r.antesDeVend, r.orden);
  chk('«Comparar con» agosto: octubre va 25% arriba en plata y en unidades (30.000 y 10 contra 24.000 y 8)',
      r.cmpAgo==='2026-08' && /25% arriba en plata · 25% arriba en unidades/.test(r.conAgo) && /Agosto al día 14 Bs 24\.000 8 8 8 0 Bs 3\.000/.test(r.conAgo), r.conAgo);
  chk('un mes cerrado se compara ENTERO: septiembre contra agosto → Heaven el doble de plata con las mismas unidades (Bs por unidad +100%)',
      /📊 EL MES ENTERO — SEPTIEMBRE DE 2026/i.test(r.sep) && /Heaven: 100% arriba en plata \(Bs 120\.000 contra Bs 60\.000\) y igual en unidades \(20 contra 20\)\./.test(r.sep) &&
      /Diferencia \+100% 0% 0% 0% — \+100%/.test(r.sepH) && !/entero Bs/.test(r.sepH), [r.sep, r.sepH]);
  chk('agosto no tiene con qué compararse (julio no está entero en el panel) y lo dice', /Todavía no hay un mes entero antes de agosto en el panel para comparar/.test(r.ago), r.ago);

  // ═══ 17. 📊 En el iPad y en el celular ════════════════════════════════════════════════════════
  console.log('\n── 17. 📊 El cuadro en el iPad y en el celular ──');
  for (const w of [820, 1180, 390]) {
    await page.setViewportSize({ width:w, height:1000 });
    await page.waitForTimeout(150);
    r = await ev(() => { STATE=FIX2(); PRY_CMP=''; document.getElementById('pry-mes').value='2026-10'; renderProyeccion(); acomodarFichas();
      [].slice.call(document.querySelectorAll('#pry-altura details')).forEach(function(d){ d.open=true; });
      return { sw:document.documentElement.scrollWidth, iw:window.innerWidth,
        anchas:[].slice.call(document.querySelectorAll('#pry-altura .pry-scroll')).filter(function(e){ return e.scrollWidth>e.clientWidth+1; }).length,
        tablas:document.querySelectorAll('#pry-altura .pry-tabla').length }; });
    chk('a '+w+' px: sin scroll de costado'+(w>=820 ? ' y las tablas de «A esta altura» entran enteras' : ''), r.sw<=r.iw && r.tablas>=4 && (w<820 || r.anchas===0), r);
  }

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
