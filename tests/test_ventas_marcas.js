/* 🛏️💚 CONTABILIDAD → VENTAS: LO VENDIDO DE CADA MARCA (dueño, 29/09, §4gw).

   *«Falta la ficha de Sueña y de Heaven, sus montos, que se ajuste si se elige ingreso o entrega agendada»*.

   ⚠️ LO QUE ESTA PRUEBA CUIDA (falla contra lo publicado, `a904137`, que no tiene las fichas):
   1. Las fichas de Sueña y Heaven salen de la MISMA lista que «Vendido en el período»: el mismo corte (ingreso o entrega
      agendada), el mismo período, el vendedor y la búsqueda. Las marcas + «Sin marca» suman lo vendido.
   2. Con 🚚 Entrega agendada, la venta cargada en agosto que se entrega en septiembre es de septiembre; la cargada en
      septiembre que se entrega en octubre, no. Con 📝 Ingreso, al revés. La venta de tienda (sin entrega) va por el día en
      que se cargó en los dos.
   3. Cada ficha dice ventas, unidades (colchones y somieres, §4gv) y qué parte de lo vendido es. Sin ATC, RPT, ROHO ni
      mayoristas. Un vendedor sin marca va a «⚠️ Sin marca».
   4. Con una vendedora elegida, solo la ficha de SU marca (sin el %). Con algo en «Buscar», lo que coincide.
   5. En Mayoristas no hay fichas de marca.
   6. Por entrega agendada, los mismos números que la pestaña 📈 Proyección.
   7. Las fichas de marca van debajo de las de arriba y del MISMO ancho (iPad parado y acostado); en el celular, una por
      renglón y sin scroll de costado.

   Datos SINTÉTICOS (el repo es público). Reloj clavado en el viernes 18/09/2026, hora de Bolivia.
   Se corre:  node tests/test_ventas_marcas.js   (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/a/pedidos_a904137.html node tests/test_ventas_marcas.js */
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
  /* Una venta: `bs` es su total (queda como saldo), `fecha` la entrega agendada ('' = venta de tienda), `reg` el día en que se cargó. */
  var V=function(vend, reg, fecha, bs, prods, o){
    o=o||{}; n++;
    return { id:'m'+n, oc:o.oc||('09-'+(300+n)), nota:String(800+n), vendedor:vend, cliente:o.cliente||('CLIENTE M'+n), fecha:fecha, turno:fecha?'AM':'',
             productos:prods||[{desc:'COLCHON',medida:'140x190',cant:1}], saldo:bs, acuenta:0, pagado:false, metodoPago:'', entregado:false,
             ts:new Date(reg+'T10:00:00-04:00').getTime(), fotos:[] };
  };
  var P=function(desc, cant){ return { desc:desc, medida:'140x190', cant:cant||1 }; };
  window.FIX=function(){
    n=0;
    return [
      V('Mauricio Merida','2026-08-28','2026-09-03',5000,[P('COLCHON TITANIO'),P('SOMIER TITANIO')]),    // A: cargada en agosto, se entrega en septiembre
      V('Mauricio Merida','2026-09-05','2026-09-10',2000,[P('COLCHONETA'),P('ALMOHADA',2)]),              // B
      V('Juan Pablo Paredes','2026-09-15','2026-10-02',4000,[P('TITANIO LATEX',2)]),                     // C: cargada en septiembre, se entrega en octubre
      V('Maria Flores','2026-09-02','2026-09-04',8000,[P('PILLOW PEDIC'),P('PROTECTOR')]),               // D
      V('Isabel Robledo','2026-09-10','',4000,[P('MEMORY FLEX'),P('JUEGO DE SABANAS')]),                 // E: venta de tienda
      V('Pedro Nuevo','2026-09-11','2026-09-12',2000),                                                   // F: no está en ninguna marca
      V('Maria Flores','2026-08-25','2026-08-27',9000),                                                  // G: agosto de punta a punta
      V('Carola Chavez','2026-09-10','2026-09-12',0,null,{ oc:'ATC 09-001' }),                           // ATC: no es venta
      V('Carola Chavez','2026-09-10','2026-09-12',50000,null,{ oc:'RPT 09-001', cliente:'Mia Plaza' }),  // RPT: no es venta
      V('ROHO','2026-09-10','2026-09-11',4000),
      V('Eduardo Añez','2026-09-10','2026-09-12',20000,null,{ cliente:'MULTICENTER' })                   // mayorista
    ];
  };
  window._txt=function(id){ var e=document.getElementById(id); return e ? e.innerText.replace(/\s+/g,' ').trim() : ''; };
  window._fichas=function(id){ return [].slice.call(document.querySelectorAll('#'+id+' .mc')).map(function(e){ return e.innerText.replace(/\s+/g,' ').trim(); }); };
  /* Ventas, con el corte, el modo, el mes, el vendedor y la búsqueda dados, por los mismos caminos que la pantalla. */
  window.VER=function(base, modo, mes, vend, q){
    segSet('cta-tab','ventas'); setContaTab('ventas');
    var s=document.getElementById('cta-vendedor'); llenarSelectContaVendedor(); if(s) s.value=vend||'';
    document.getElementById('cta-search').value=q||'';
    document.getElementById('cta-mes').value=mes||'2026-09';
    segSet('cta-mode',modo||'mes'); setContaModo(modo||'mes');
    segSet('cta-base',base); setContaBase();
    return { top:_fichas('cta-metrics'), marcas:_fichas('cta-marcas'), txt:_txt('cta-marcas') };
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const page = await browser.newPage({ viewport:{ width:1180, height:900 }, timezoneId:'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-09-18T15:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(350);
  await page.evaluate(PREPARAR);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  await ev(() => { showView('conta'); });
  await page.waitForTimeout(150);             // showView relee con la foto de STATE de ese momento: después, el fixture
  await ev(() => { STATE=FIX(); });

  // ═══ 1-3. El corte: ingreso o entrega agendada ═════════════════════════════════════════════════
  console.log('\n── 1. 📝 Ingreso, septiembre ──');
  let r = await ev(() => VER('ingreso','mes','2026-09'));
  chk('«Vendido en el período» Bs 20.000,00 (5 ventas cargadas en septiembre)', /^VENDIDO EN EL PERÍODO Bs 20\.000,00 5 ventas de todo el equipo/i.test(r.top && r.top[0]), [r.top, r.__error]);
  chk('🛏️ Sueña Bs 6.000,00: 2 ventas · 3 unidades · 30% de lo vendido (la de Juan Pablo que se entrega en octubre, sí; la de Mauricio cargada en agosto, no)',
      /^🛏️ SUEÑA Bs 6\.000,00 2 ventas · 3 unidades · 30% de lo vendido$/i.test(r.marcas && r.marcas[0]), r.marcas);
  chk('💚 Heaven Bs 12.000,00: 2 ventas · 2 unidades · 60% de lo vendido (la venta de tienda, por el día en que se cargó)',
      /^💚 HEAVEN Bs 12\.000,00 2 ventas · 2 unidades · 60% de lo vendido$/i.test(r.marcas && r.marcas[1]), r.marcas);
  chk('⚠️ Sin marca Bs 2.000,00: 1 venta · 1 unidad · 10%, de un vendedor que no está en ninguna marca',
      /^⚠️ SIN MARCA Bs 2\.000,00 1 venta · 1 unidad · 10% de lo vendido — de vendedores que no están en ninguna marca$/i.test(r.marcas && r.marcas[2]) && r.marcas.length===3, r.marcas);

  console.log('\n── 2. 🚚 Entrega agendada, septiembre ──');
  r = await ev(() => VER('entrega','mes','2026-09'));
  chk('«Vendido en el período» Bs 21.000,00', /^VENDIDO EN EL PERÍODO Bs 21\.000,00 5 ventas de todo el equipo/i.test(r.top && r.top[0]), r.top);
  chk('🛏️ Sueña Bs 7.000,00 · 33%: ahora entra la de Mauricio cargada en agosto y sale la de Juan Pablo que se entrega en octubre',
      /^🛏️ SUEÑA Bs 7\.000,00 2 ventas · 3 unidades · 33% de lo vendido$/i.test(r.marcas && r.marcas[0]), r.marcas);
  chk('💚 Heaven Bs 12.000,00 · 57% y Sin marca Bs 2.000,00 · 10%',
      /^💚 HEAVEN Bs 12\.000,00 2 ventas · 2 unidades · 57% de lo vendido$/i.test(r.marcas && r.marcas[1]) && /^⚠️ SIN MARCA Bs 2\.000,00 1 venta · 1 unidad · 10%/i.test(r.marcas && r.marcas[2]), r.marcas);
  r = await ev(() => VER('entrega','mes','2026-10'));
  chk('…y octubre por entrega agendada: la de Juan Pablo (Bs 4.000,00, 2 unidades, 100%); Heaven sin ventas; sin ficha «Sin marca»',
      /^🛏️ SUEÑA Bs 4\.000,00 1 venta · 2 unidades · 100% de lo vendido$/i.test(r.marcas && r.marcas[0]) && /^💚 HEAVEN Bs 0,00 sin ventas en el período$/i.test(r.marcas && r.marcas[1]) && r.marcas.length===2, r.marcas);

  console.log('\n── 3. Las marcas suman lo vendido, en todos los cortes ──');
  r = await ev(() => {
    var num=function(t){ var m=/Bs ([\d.]+,\d\d)/.exec(t||''); return m ? Number(m[1].replace(/\./g,'').replace(',','.')) : NaN; };
    var out=[];
    [['ingreso','mes','2026-09'],['entrega','mes','2026-09'],['ingreso','mes','2026-08'],['entrega','mes','2026-08'],['ingreso','todo'],['entrega','todo']].forEach(function(a){
      var v=VER(a[0], a[1], a[2]);
      out.push({ corte:a.join(' '), top:num(v.top[0]), marcas:v.marcas.reduce(function(s,t){ return s+num(t); }, 0) });
    });
    return out;
  });
  chk('Sueña + Heaven + Sin marca = «Vendido en el período» con ingreso y con entrega, en septiembre, agosto y «Todo»',
      Array.isArray(r) && r.length===6 && r.every(function(x){ return x.top>0 && Math.abs(x.top-x.marcas)<0.005; }), r);

  // ═══ 4. Vendedora y búsqueda ═══════════════════════════════════════════════════════════════════
  console.log('\n── 4. Con una vendedora elegida, y con algo en «Buscar» ──');
  r = await ev(() => ({ mau:VER('entrega','mes','2026-09','Mauricio Merida'), mf:VER('entrega','mes','2026-09','Maria Flores'), pn:VER('entrega','mes','2026-09','Pedro Nuevo'),
                        q:VER('entrega','mes','2026-09','','titanio') }));
  chk('Mauricio Merida: solo la ficha de Sueña, Bs 7.000,00, 2 ventas · 3 unidades (sin el %: es todo suyo)',
      r.mau && r.mau.marcas.length===1 && /^🛏️ SUEÑA Bs 7\.000,00 2 ventas · 3 unidades$/i.test(r.mau.marcas[0]), r.mau && r.mau.marcas);
  chk('Maria Flores: solo la de Heaven, Bs 8.000,00 · 1 venta · 1 unidad (el protector no cuenta)',
      r.mf && r.mf.marcas.length===1 && /^💚 HEAVEN Bs 8\.000,00 1 venta · 1 unidad$/i.test(r.mf.marcas[0]), r.mf && r.mf.marcas);
  chk('Pedro Nuevo (sin marca): solo «⚠️ Sin marca», Bs 2.000,00',
      r.pn && r.pn.marcas.length===1 && /^⚠️ SIN MARCA Bs 2\.000,00 1 venta · 1 unidad — de vendedores que no están en ninguna marca$/i.test(r.pn.marcas[0]), r.pn && r.pn.marcas);
  chk('buscando «titanio»: Sueña Bs 5.000,00 (la de Mauricio, 1 colchón y 1 somier = 2 unidades) y Heaven sin ventas; la de arriba dice que es solo lo que coincide',
      r.q && /^🛏️ SUEÑA Bs 5\.000,00 1 venta · 2 unidades · 100% de lo vendido$/i.test(r.q.marcas[0]) && /^💚 HEAVEN Bs 0,00 sin ventas en el período$/i.test(r.q.marcas[1]) &&
      /solo lo que coincide con «titanio»/.test(r.q.top[0]), r.q);

  // ═══ 5. Mayoristas ════════════════════════════════════════════════════════════════════════════
  console.log('\n── 5. Mayoristas ──');
  r = await ev(() => {
    VER('entrega','mes','2026-09');
    segSet('cta-tab','mayor'); setContaTab('mayor'); renderConta();
    var b=document.getElementById('cta-marcas');
    return { top:_fichas('cta-metrics'), marcas:_fichas('cta-marcas'), visible:!!b && b.offsetHeight>0 };
  });
  chk('en 🏭 Mayoristas no hay fichas de marca (Eduardo no está en ninguna): solo las de siempre', r.top && /Bs 20\.000,00/.test(r.top[0]) && r.marcas.length===0 && !r.visible, r);

  // ═══ 6. Lo mismo que la pestaña 📈 Proyección ════════════════════════════════════════════════
  console.log('\n── 6. Por entrega agendada, los mismos números que 📈 Proyección ──');
  r = await ev(() => {
    var v=VER('entrega','mes','2026-09');
    var R=proyeccionMes('2026-09'), m=function(k){ return R.marcas.filter(function(x){ return x.g.k===k; })[0].tot; };
    return { marcas:v.marcas, sue:m('suena'), hea:m('heaven'), sin:R.sinMarca.tot };
  });
  chk('Proyección de septiembre: Sueña Bs 7.000 (3 unidades), Heaven Bs 12.000 (2), Sin marca Bs 2.000: lo mismo que las fichas de Ventas',
      r.sue && r.sue.vendido===7000 && r.sue.u===3 && r.hea.vendido===12000 && r.hea.u===2 && r.sin.vendido===2000 &&
      /Bs 7\.000,00/.test(r.marcas[0]) && /Bs 12\.000,00/.test(r.marcas[1]) && /Bs 2\.000,00/.test(r.marcas[2]), r);

  // ═══ 7. En el iPad y en el celular ════════════════════════════════════════════════════════════
  console.log('\n── 7. En el iPad (acostado y parado) y en el celular ──');
  for (const w of [1180, 820, 390]) {
    await page.setViewportSize({ width:w, height:900 });
    await page.waitForTimeout(200);
    r = await ev(() => {
      VER('entrega','mes','2026-09');
      var a=document.querySelectorAll('#cta-metrics .mc'), b=document.querySelectorAll('#cta-marcas .mc');
      var ra=a[0].getBoundingClientRect(), rb=b[0].getBoundingClientRect(), rUlt=a[a.length-1].getBoundingClientRect();
      return { sw:document.documentElement.scrollWidth, iw:window.innerWidth, anchoArriba:Math.round(ra.width), anchoMarca:Math.round(rb.width),
               izqArriba:Math.round(ra.left), izqMarca:Math.round(rb.left), debajo:rb.top>=rUlt.bottom, hueco:Math.round(rb.top-rUlt.bottom),
               cortado:[].slice.call(document.querySelectorAll('#cta-marcas .mc-val')).some(function(e){ return e.scrollWidth>e.clientWidth+1; }) };
    });
    chk('a '+w+' px: las fichas de marca van debajo, del mismo ancho y alineadas con las de arriba, sin montos cortados ni scroll de costado',
        r.sw<=r.iw && r.debajo && r.hueco>=8 && r.hueco<=16 && Math.abs(r.anchoArriba-r.anchoMarca)<=1 && Math.abs(r.izqArriba-r.izqMarca)<=1 && !r.cortado, r);
  }

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
