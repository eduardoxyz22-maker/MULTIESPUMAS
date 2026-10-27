/* ✨ LAS MEJORAS ELEGIDAS DEL MUESTRARIO (§4ni, 27/10; dueño: «Quiero las mejoras: 1, 6, 8, 14, 15, 16… falta el tema de noviembre…
   algo estilo la película Coco y su canción»).
   Lo que cuida esta prueba:
   1. El tema de cada día con la fecha de Bolivia (UTC−4): Halloween (octubre), Todos Santos (noviembre), Navidad (1 al 30/12), Año Nuevo
      (31/12 al 2/1), Carnaval (52 a 47 días antes de la Pascua), Día de la Madre (20 al 27/5), 6 de Agosto (1 al 7/8), 24 de Septiembre
      (18 al 24/9) y Espuma los demás días; `?tema=` para verlo cualquier día. Igual en el dashboard.
   2. Lo que se ve de cada tema: papel picado, calaverita, velas y flores en noviembre; banderines y la bandera DIBUJADA (no el emoji, que
      en Windows sale «BO») en agosto y septiembre; los emojis de Carnaval, la Madre y Año Nuevo; el brillo del nombre en Espuma.
   3. El lienzo del encabezado: qué dibuja cada tema; en las pruebas un solo cuadro; con `HDR_FX_PRUEBA` se mueve; Halloween y Navidad no.
   4. La melodía de noviembre: solo con el tema, con el primer toque, una vez por apertura, y el 🔇 de Bloki la calla.
   5. Los sonidos (16): el 🔇 de Bloki los calla, el mismo dos veces seguidas suena una, el ✅ hace «ding», el pago «caja».
   6. «Guardar» que se transforma (6): verde con el tilde y la OC con el «sí»; ámbar con el motivo con un «no»; «En cola» sin ✓; en las
      pruebas el texto no cambia (salvo `FX_PRUEBA`); el siguiente guardado lo limpia.
   7. El borde de luz (8): solo lo rojo de «Para hacer» gira y late.
   8. El buscador Ctrl + K (1): pedidos por nombre, OC, nota y celular; productos con su código; «Ir a…»; lo de Administración solo con la
      clave; Enter abre la ficha que corresponde; Esc cierra; el 🔎 de arriba.
   Se corre:  node tests/test_temas_mejoras.js   (TM_CAP=<carpeta> deja capturas) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs'), os = require('os');
let PASS=0, FAIL=0;
const chk=(l,c,extra)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, extra!=null?('· '+(typeof extra==='string'?extra:JSON.stringify(extra)).slice(0,400)):''); };
const RAIZ = path.resolve(__dirname, '..');
const PEDIDOS = process.env.PEDIDOS || path.join(RAIZ, 'pedidos.html');
const TEMPLATE = process.env.TEMPLATE || path.join(RAIZ, 'panel_template.html');
const CAP = process.env.TM_CAP || '';

function armarDashboard(){
  const idx = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  const m = idx.match(/window\.PANEL_DATA\s*=\s*(\{[\s\S]*?\});/);
  const tpl = fs.readFileSync(TEMPLATE, 'utf8');
  /* En la carpeta del repo (no en /tmp): el dashboard carga `tema-melodia.js` con una dirección relativa. */
  const f = path.join(RAIZ, '.test_temas_dash.html');
  fs.writeFileSync(f, tpl.replace('__PANEL_DATA__', 'window.PANEL_DATA = ' + m[1] + ';'));
  return f;
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox','--autoplay-policy=no-user-gesture-required'] });
  const errores=[];
  async function abrir(archivo, cuando, opt){
    opt=opt||{};
    const ctx = await browser.newContext({ viewport:{ width:opt.w||1300, height:opt.h||760 }, timezoneId:'UTC' });   // el aparato en UTC a propósito
    await ctx.route(/^https?:/, r=>r.abort());
    if(opt.init) await ctx.addInitScript(opt.init);
    const page = await ctx.newPage();
    page.on('pageerror', e=>errores.push(e.message));
    if(cuando) await page.clock.setFixedTime(new Date(cuando));
    await page.goto('file://' + archivo + (opt.q||''), { waitUntil:'load' });
    await page.waitForTimeout(opt.espera || (archivo===PEDIDOS ? 400 : 1300));
    page._ctx=ctx;
    return page;
  }
  const cerrar = p => p._ctx.close();
  const temaDe = async (archivo, cuando, q) => { const p=await abrir(archivo, cuando, { q:q, espera:archivo===PEDIDOS?250:900 }); const t=await p.evaluate(()=>{ var m=/\btema-([a-z-]+)/.exec(document.documentElement.className); return m?m[1]:''; }); await cerrar(p); return t; };

  // ═══ 1. El tema de cada día ═══
  console.log('\n── 1. El tema de cada día, con la fecha de Bolivia ──');
  const CASOS=[
    ['2026-10-27T10:00:00-04:00','halloween','27/10'],
    ['2026-10-31T23:59:00-04:00','halloween','31/10 23:59 (ya 1/11 en UTC)'],
    ['2026-11-01T00:01:00-04:00','todos-santos','1/11 00:01'],
    ['2026-11-30T23:59:00-04:00','todos-santos','30/11 23:59'],
    ['2026-12-01T00:01:00-04:00','navidad','1/12'],
    ['2026-12-30T23:59:00-04:00','navidad','30/12 23:59'],
    ['2026-12-31T00:01:00-04:00','anio-nuevo','31/12'],
    ['2027-01-02T23:59:00-04:00','anio-nuevo','2/1 23:59'],
    ['2027-01-03T00:01:00-04:00','espuma','3/1'],
    ['2027-02-03T12:00:00-04:00','espuma','3/2/2027 (la víspera de comadres)'],
    ['2027-02-04T00:01:00-04:00','carnaval','4/2/2027 jueves de comadres (Pascua 28/3)'],
    ['2027-02-09T23:59:00-04:00','carnaval','9/2/2027 martes de Carnaval'],
    ['2027-02-10T00:01:00-04:00','espuma','10/2/2027 miércoles de ceniza'],
    ['2026-02-16T12:00:00-04:00','carnaval','16/2/2026 (Pascua 5/4)'],
    ['2027-05-19T12:00:00-04:00','espuma','19/5'],
    ['2027-05-20T00:01:00-04:00','madre','20/5'],
    ['2027-05-27T23:59:00-04:00','madre','27/5 23:59'],
    ['2027-05-28T00:01:00-04:00','espuma','28/5'],
    ['2027-08-01T00:01:00-04:00','patria','1/8'],
    ['2027-08-07T23:59:00-04:00','patria','7/8 23:59'],
    ['2027-08-08T00:01:00-04:00','espuma','8/8'],
    ['2027-09-17T12:00:00-04:00','espuma','17/9'],
    ['2027-09-18T00:01:00-04:00','santa-cruz','18/9'],
    ['2027-09-24T23:59:00-04:00','santa-cruz','24/9 23:59'],
    ['2027-09-25T00:01:00-04:00','espuma','25/9'],
    ['2027-11-15T12:00:00-04:00','todos-santos','noviembre del año que viene']
  ];
  for (const [cuando, esp, l] of CASOS) chk('1 · '+l+' → '+esp, (await temaDe(PEDIDOS, cuando))===esp, cuando);
  chk('1 · ?tema=carnaval lo muestra cualquier día', (await temaDe(PEDIDOS, '2026-10-27T10:00:00-04:00', '?tema=carnaval'))==='carnaval');
  chk('1 · …y ?tema=todos-santos también', (await temaDe(PEDIDOS, '2026-06-10T10:00:00-04:00', '?tema=todos-santos'))==='todos-santos');
  const dash = armarDashboard();
  chk('1 · el dashboard elige el mismo: 1/11 → Todos Santos', (await temaDe(dash, '2026-11-01T09:00:00-04:00'))==='todos-santos');
  chk('1 · …31/12 → Año Nuevo y 18/9 → 24 de Septiembre', (await temaDe(dash, '2026-12-31T09:00:00-04:00'))==='anio-nuevo' && (await temaDe(dash, '2027-09-18T09:00:00-04:00'))==='santa-cruz');

  // ═══ 2. Lo que se ve ═══
  console.log('\n── 2. Lo que se ve de cada tema ──');
  const mira = async (q, w) => {
    const p = await abrir(PEDIDOS, '2026-10-27T10:00:00-04:00', { q:q, w:w });
    const r = await p.evaluate(() => {
      var h=document.querySelector('.header'), lg=document.querySelector('.logo-h'), b=getComputedStyle(h,'::before'), lb=getComputedStyle(lg,'::before');
      var ruta=getComputedStyle(document.querySelector('.h-ruta'),'::after'), act=document.querySelector('.nav button.active');
      return { papel:b.backgroundImage.slice(0,30), anPapel:b.animationName, logoTxt:lb.content, logoImg:lb.backgroundImage.slice(0,30), luna:getComputedStyle(document.querySelector('.h-luna')).display,
        velas:ruta.backgroundImage.slice(0,30), anVelas:ruta.animationName, pestana:act?getComputedStyle(act).backgroundColor:'', clip:getComputedStyle(lg).webkitBackgroundClip||getComputedStyle(lg).backgroundClip,
        anLogo:getComputedStyle(lg).animationName, fondo:getComputedStyle(h).backgroundImage.slice(0,80), logoAlto:lg.getBoundingClientRect().top };
    });
    if(CAP){ fs.mkdirSync(CAP,{recursive:true}); await p.screenshot({ path:path.join(CAP,'tema-'+q.replace(/\W/g,'')+'-'+(w||1300)+'.png'), clip:{ x:0, y:0, width:w||1300, height:170 } }); }
    await cerrar(p); return r;
  };
  let r = await mira('?tema=todos-santos');
  chk('2 · Todos Santos: el papel picado arriba, que se mueve con el viento', /^url\("data:image\/svg/.test(r.papel) && r.anPapel==='ts-ondea', r);
  chk('2 · …la calaverita al lado de MULTIESPUMAS (dibujada)', /^url\("data:image\/svg/.test(r.logoImg), r.logoImg);
  chk('2 · …velas y flores de muerto en la vereda, que titilan', /^url\("data:image\/svg/.test(r.velas) && r.anVelas==='ts-velas', r);
  chk('2 · …el cielo de la tarde (violeta) y la pestaña elegida en violeta', /rgb\(30, 10, 53\)/.test(r.fondo) && r.pestana==='rgb(74, 16, 96)', [r.fondo, r.pestana]);
  chk('2 · …sin la estrella de Navidad (la prueba de Navidad la mira)', r.luna==='none', r.luna);
  chk('2 · …el papel picado no tapa el nombre (MULTIESPUMAS más abajo que los 28 px de banderitas)', r.logoAlto>=26, r.logoAlto);
  r = await mira('?tema=patria');
  chk('2 · 6 de Agosto: la bandera DIBUJADA al lado del nombre (no el emoji: en Windows sale «BO») y los banderines', /^url\("data:image\/svg/.test(r.logoImg) && !/🇧🇴/.test(r.logoTxt) && /^url\("data:image\/svg/.test(r.papel), r);
  r = await mira('?tema=santa-cruz');
  chk('2 · 24 de Septiembre: la bandera cruceña dibujada y los banderines verdes y blancos', /^url\("data:image\/svg/.test(r.logoImg) && /^url\("data:image\/svg/.test(r.papel) && r.pestana==='rgb(4, 120, 87)', r);
  r = await mira('?tema=carnaval'); chk('2 · Carnaval: 🎭 y la pestaña en fucsia', /🎭/.test(r.logoTxt) && r.pestana==='rgb(190, 24, 93)', [r.logoTxt, r.pestana]);
  r = await mira('?tema=madre'); chk('2 · Día de la Madre: 💐', /💐/.test(r.logoTxt), r.logoTxt);
  r = await mira('?tema=anio-nuevo'); chk('2 · Año Nuevo: 🎆 y la noche azul', /🎆/.test(r.logoTxt) && /rgb\(11, 29, 58\)/.test(r.fondo), [r.logoTxt, r.fondo]);
  r = await mira('?tema=espuma');
  chk('2 · Espuma: el brillo que pasa por el nombre (la letra recortada sobre un degradé que se mueve), sin emoji', /text/.test(r.clip) && r.anLogo==='esp-brillo' && (r.logoTxt==='none' || r.logoTxt==='normal'), r);
  r = await mira('?tema=todos-santos', 390);
  chk('2 · en el celular (390 px) noviembre también entra y el nombre se ve', r.logoAlto>=18 && /^url/.test(r.papel), r);
  const ancho = await (async()=>{ const p=await abrir(PEDIDOS,'2026-11-05T10:00:00-04:00',{ w:390 }); const a=await p.evaluate(()=>document.documentElement.scrollWidth); await cerrar(p); return a; })();
  chk('2 · …sin correr la página de costado', ancho<=390, ancho);

  // ═══ 3. El lienzo del encabezado ═══
  console.log('\n── 3. Lo que se mueve: el lienzo del encabezado ──');
  const lienzo = async (q, init, espera) => { const p=await abrir(PEDIDOS, '2026-10-27T10:00:00-04:00', { q:q, init:init, espera:espera||300 });
    const o=await p.evaluate(()=>({ fx:window.hdrFx ? { e:hdrFx.efecto, n:hdrFx.n(), c:hdrFx.cuadros() } : null, vis:getComputedStyle(document.getElementById('hdr-fx')).display })); await cerrar(p); return o; };
  const EF={ espuma:'burbujas', 'todos-santos':'petalos', carnaval:'confeti', madre:'corazones', patria:'patria', 'santa-cruz':'confeti-scz', 'anio-nuevo':'fuegos' };
  for (const t of Object.keys(EF)) { const o=await lienzo('?tema='+t); chk('3 · '+t+' dibuja '+EF[t]+' (en las pruebas, un solo cuadro quieto)', o.fx && o.fx.e===EF[t] && o.fx.c===1 && o.fx.n>0, o); }
  let o = await lienzo('?tema=todos-santos', ()=>{ window.HDR_FX_PRUEBA=1; }, 900);
  chk('3 · con HDR_FX_PRUEBA se mueve (más de 10 cuadros en 0,9 s)', o.fx && o.fx.c>10, o);
  o = await lienzo('?tema=halloween'); chk('3 · Halloween no usa el lienzo (tiene lo suyo)', !o.fx && o.vis==='none', o);
  o = await lienzo('?tema=navidad'); chk('3 · Navidad tampoco', !o.fx && o.vis==='none', o);
  o = await (async()=>{ const p=await abrir(PEDIDOS,'2026-11-05T10:00:00-04:00',{ init:()=>{ window.HDR_FX_PRUEBA=1; }, espera:200 }); await p.emulateMedia({ reducedMotion:'reduce' }); await p.reload(); await p.waitForTimeout(600);
    const x=await p.evaluate(()=>hdrFx.cuadros()); await cerrar(p); return x; })();
  chk('3 · con «reducir movimiento» queda quieto (un cuadro)', o===1, o);

  // ═══ 4. La melodía de noviembre ═══
  console.log('\n── 4. La melodía de Todos Santos ──');
  const melodia = async (cuando, init, tocar, archivo) => {
    const p=await abrir(archivo||PEDIDOS, cuando, { init:init, espera:700 });
    for (let i=0;i<(tocar||0);i++){ await p.mouse.click(640, 500); await p.waitForTimeout(150); }
    const x=await p.evaluate(()=>window.temaMelodia ? { veces:temaMelodia.veces(), sonando:temaMelodia.sonando() } : null);
    await cerrar(p); return x;
  };
  let m = await melodia('2026-11-05T10:00:00-04:00', null, 2);
  chk('4 · en noviembre se carga, y en las pruebas no suena sola (sin TS_MUSICA_PRUEBA)', m && m.veces===0, m);
  m = await melodia('2026-11-05T10:00:00-04:00', ()=>{ window.TS_MUSICA_PRUEBA=1; }, 0);
  chk('4 · recién abierta NO suena (los navegadores no dejan sin un toque)', m && m.veces===0, m);
  m = await melodia('2026-11-05T10:00:00-04:00', ()=>{ window.TS_MUSICA_PRUEBA=1; }, 3);
  chk('4 · el primer toque la hace sonar UNA vez aunque toque tres', m && m.veces===1 && m.sonando, m);
  m = await melodia('2026-11-05T10:00:00-04:00', ()=>{ window.TS_MUSICA_PRUEBA=1; try{ localStorage.setItem('me_asis_mudo','1'); }catch(e){} }, 2);
  chk('4 · con el 🔇 de Bloki no suena', m && m.veces===0, m);
  m = await melodia('2026-10-27T10:00:00-04:00', ()=>{ window.TS_MUSICA_PRUEBA=1; }, 1);
  chk('4 · en octubre no se carga (suena la bruja, no esta)', m===null, m);
  m = await melodia('2026-11-05T10:00:00-04:00', ()=>{ window.TS_MUSICA_PRUEBA=1; }, 1, dash);
  chk('4 · el dashboard también la tiene', m && m.veces===1, m);
  const mel = fs.readFileSync(path.join(RAIZ,'tema-melodia.js'),'utf8');
  chk('4 · es una melodía PROPIA (no la de la película) y dice por qué', /Recuérdame/.test(mel) && /derechos/.test(mel) && /PROPIA/.test(mel), '');

  // ═══ 5. Los sonidos ═══
  console.log('\n── 5. Los sonidos suaves ──');
  let p = await abrir(PEDIDOS, '2026-10-27T10:00:00-04:00', { init:()=>{ window.SON_PRUEBA=1; } });
  r = await p.evaluate(() => {
    var a=[sonidoPanel('pop'), sonidoPanel('pop'), sonidoPanel('caja'), sonidoPanel('ding'), sonidoPanel('aviso'), sonidoPanel('cualquiera')];
    localStorage.setItem('me_asis_mudo','1'); var mudo=sonidoPanel('ding'); localStorage.removeItem('me_asis_mudo');
    STATE=[{ id:'s1', cliente:'CLIENTE PRUEBA', oc:'10-500', fecha:'2026-10-27', productos:[{desc:'COLCHON SOFT',medida:'140x190',cant:1}] }];
    SON_ULT={}; var n0=SON_LOG.length; window.persistPedido=function(){}; quickEntregado('s1'); var ding=SON_LOG.slice(n0);
    return { a:a, log:SON_LOG.slice(0,4), mudo:mudo, ding:ding };
  });
  chk('5 · pop, caja, ding y aviso suenan; el mismo dos veces seguidas, una', JSON.stringify(r.a)==='[true,false,true,true,true,false]' && r.log.join()==='pop,caja,ding,aviso', r);
  chk('5 · con el 🔇 de Bloki, nada', r.mudo===false, r.mudo);
  chk('5 · marcar ✅ desde la tabla hace «ding»', r.ding.join()==='ding', r.ding);
  await cerrar(p);
  p = await abrir(PEDIDOS, '2026-10-27T10:00:00-04:00');
  r = await p.evaluate(() => sonidoPanel('pop'));
  chk('5 · en las pruebas, sin SON_PRUEBA, no suena', r===false, r);
  await cerrar(p);
  const src = fs.readFileSync(PEDIDOS,'utf8');
  chk('5 · el pago registrado y el recargo suenan a caja; el cierre de entregas, ding', /aplicarCobros\(p, arr\);\n  sonidoPanel\('caja'\)/.test(src) && /fxSello\('COBRADO','plata'\); sonidoPanel\('caja'\)/.test(src) && /function cierreEntMarcar[^\n]*\n[^\n]*sonidoPanel\('ding'\)/.test(src), '');

  // ═══ 6. «Guardar» que se transforma ═══
  console.log('\n── 6. «Guardar» que se transforma ──');
  p = await abrir(PEDIDOS, '2026-10-27T10:00:00-04:00', { init:()=>{ window.FX_PRUEBA=1; } });
  r = await p.evaluate(async () => {
    var b=document.getElementById('f-submit'), out={};
    var k1=guardarBtnFin({ ok:true, pedido:{ oc:'10-231' } }, { oc:'10-231' }); await new Promise(function(r){ setTimeout(r,60); });
    out.ok={ k:k1, cls:b.className, txt:b.textContent, tilde:!!b.querySelector('.gz-tilde') };
    setSubmitting(true); out.limpio=!/gz-/.test(b.className); setSubmitting(false);
    var k2=guardarBtnFin({ ok:false, error:'cupos_llenos' }, {}); await new Promise(function(r){ setTimeout(r,60); });
    out.mal={ k:k2, cls:b.className, txt:b.textContent };
    var k3=guardarBtnFin(null, {}, true); await new Promise(function(r){ setTimeout(r,60); });
    out.cola={ k:k3, cls:b.className, txt:b.textContent, tilde:!!b.querySelector('.gz-tilde') };
    return out;
  });
  chk('6 · con el «sí»: verde, el tilde que se dibuja y la OC', r.ok.k==='ok' && /gz-ok/.test(r.ok.cls) && r.ok.tilde && /Guardado · 10-231/.test(r.ok.txt), r.ok);
  chk('6 · el guardado siguiente lo limpia', r.limpio, r.limpio);
  chk('6 · con un «no»: ámbar y el motivo corto', r.mal.k==='mal' && /gz-mal/.test(r.mal.cls) && /Turno lleno/.test(r.mal.txt), r.mal);
  chk('6 · lo que queda en la cola dice «En cola», NUNCA ✓', r.cola.k==='cola' && /gz-cola/.test(r.cola.cls) && /En cola/.test(r.cola.txt) && !r.cola.tilde, r.cola);
  await cerrar(p);
  p = await abrir(PEDIDOS, '2026-10-27T10:00:00-04:00');
  r = await p.evaluate(async () => { var b=document.getElementById('f-submit'); var t0=b.textContent; guardarBtnFin({ ok:true, pedido:{ oc:'10-1' } }, {}); await new Promise(function(r){ setTimeout(r,60); }); return [t0, b.textContent, b.className]; });
  chk('6 · en las pruebas (sin FX_PRUEBA) el botón sigue diciendo «Guardar pedido» (muchas pruebas lo leen)', r[0]==='Guardar pedido' && r[1]==='Guardar pedido' && !/gz-/.test(r[2]), r);
  await cerrar(p);
  chk('6 · el guardado del formulario avisa al botón con la respuesta y, sin red, como «en cola»', /setSubmitting\(false\);\n      try\{ guardarBtnFin\(res, rec\); \}catch/.test(src) && /setSubmitting\(false\);\n      try\{ guardarBtnFin\(null, rec, true\); \}catch/.test(src), '');

  // ═══ 7. El borde de luz ═══
  console.log('\n── 7. El borde de luz en lo rojo de «Para hacer» ──');
  p = await abrir(PEDIDOS, '2026-10-27T10:00:00-04:00');
  r = await p.evaluate(() => {
    var d=document.createElement('div'); d.innerHTML='<div class="ah-lista"><div class="ah-it ah-r"><span class="ah-n">3</span><div class="ah-tx"><b>Rojo</b></div></div><div class="ah-it ah-a"><span class="ah-n">2</span><div class="ah-tx"><b>Ámbar</b></div></div></div>';
    document.body.appendChild(d); var R=d.querySelector('.ah-r'), A=d.querySelector('.ah-a');
    return { r:getComputedStyle(R,'::after').animationName, rp:getComputedStyle(R.querySelector('.ah-n'),'::after').animationName, a:getComputedStyle(A,'::after').content, ap:getComputedStyle(A.querySelector('.ah-n'),'::after').content };
  });
  chk('7 · lo rojo: el borde que gira y el punto que late', r.r==='ah-luz' && r.rp==='ah-late', r);
  chk('7 · lo ámbar queda quieto', (r.a==='none'||r.a==='normal') && (r.ap==='none'||r.ap==='normal'), r);
  await cerrar(p);

  // ═══ 8. El buscador Ctrl + K ═══
  console.log('\n── 8. El buscador de todo (Ctrl + K) ──');
  const FIX = () => { STATE=[
    { id:'b1', cliente:'Rosa Quispe', oc:'10-214', nota:'21183', celular:'70012345', zona:'Equipetrol', vendedor:'Carola Chavez', fecha:'2026-10-28', turno:'AM', productos:[{desc:'TITANIO LATEX',medida:'140x190',codigo:'CH1129',cant:2}] },
    { id:'b2', cliente:'Jorge Añez', oc:'10-219', nota:'21190', celular:'77123456', zona:'Norte', vendedor:'Mirian Salazar', fecha:'2026-10-29', turno:'PM', productos:[{desc:'SOMIER ORO',medida:'160x200',cant:1}] },
    { id:'b3', cliente:'Carla Rivero', oc:'ATC 10-031', celular:'75550001', zona:'Norte', vendedor:'Isabel Robledo', fecha:'2026-10-30', productos:[{desc:'ESPECIAL SEMIORTOPEDICO',medida:'140x190',cant:1}] } ];
    window.__abrio=[]; window.showMisModal=function(id){ __abrio.push('mis:'+id); }; window.showPedidoModal=function(id){ __abrio.push('adm:'+id); }; };
  p = await abrir(PEDIDOS, '2026-10-27T10:00:00-04:00');
  await p.evaluate(FIX);
  chk('8 · el 🔎 «Buscar» está arriba', await p.evaluate(() => { var b=document.getElementById('pal-btn'); return !!b && b.closest('.header')!==null && /Buscar/.test(b.textContent); }));
  await p.keyboard.press('Control+k'); await p.waitForTimeout(250);
  chk('8 · Ctrl + K lo abre con el cursor en el campo', await p.evaluate(() => !!document.getElementById('pal-ov') && document.activeElement && document.activeElement.id==='pal-in'));
  const busca = async q => { await p.fill('#pal-in', q); await p.waitForTimeout(120); return p.evaluate(() => PAL.res.map(x=>x.g+'|'+x.t)); };
  let L = await busca('rosa');
  chk('8 · por el nombre del cliente', L[0]==='Pedidos|Rosa Quispe · 10-214', L);
  L = await busca('10-219'); chk('8 · por la OC', L[0]==='Pedidos|Jorge Añez · 10-219', L);
  L = await busca('21183'); chk('8 · por el N° de nota', L[0]==='Pedidos|Rosa Quispe · 10-214', L);
  L = await busca('7712'); chk('8 · por una parte del celular', L.some(x=>/Jorge Añez/.test(x)), L);
  L = await busca('anez'); chk('8 · sin acentos: «anez» encuentra a Añez', L.some(x=>/Jorge Añez/.test(x)), L);
  L = await busca('somier oro'); chk('8 · por el producto del pedido, y los productos del catálogo', L[0]==='Pedidos|Jorge Añez · 10-219' && L.some(x=>/^Productos\|SOMIER ORO/.test(x)), L);
  L = await busca('ros'); chk('8 · «Ir a…» por el comienzo de las palabras (no Contabilidad por «cob-ros»)', !L.some(x=>/Contabilidad/.test(x)), L);
  L = await busca(''); chk('8 · vacío: lo que se puede hacer; sin la clave, nada de Administración salvo la pestaña', L.some(x=>x==='Ir a|Nuevo pedido') && L.some(x=>x==='Ir a|Administración') && !L.some(x=>/Stock|Cierre de entregas|anuncio|Quién vendió/.test(x)), L);
  L = await busca('xyzzy'); chk('8 · sin nada, lo dice', L.length===0 && await p.evaluate(()=>/No encontré nada/.test(document.getElementById('pal-res').textContent)), L);
  await busca('rosa'); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
  r = await p.evaluate(() => ({ abrio:__abrio.slice(), ov:!!document.getElementById('pal-ov') }));
  chk('8 · Enter abre la ficha de Mis pedidos (sin la clave) y cierra el buscador', r.abrio.join()==='mis:b1' && !r.ov, r);
  await p.evaluate(() => { UNLOCKED=true; });
  await p.click('#pal-btn'); await p.waitForTimeout(200);
  L = await busca('');
  chk('8 · con la clave aparecen Stock, cierre de entregas, la ciudad, «Quién vendió qué»…', ['Stock y reposición','Cierre de entregas','Ver la ciudad','Quién vendió qué','Decir un anuncio','Subir el Excel del día'].every(t=>L.includes('Ir a|'+t)), L);
  await busca('jorge'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowUp'); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
  r = await p.evaluate(() => __abrio.slice());
  chk('8 · con la clave, la ficha de Administración', r[r.length-1]==='adm:b2', r);
  await p.keyboard.press('Control+k'); await p.waitForTimeout(150); await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  chk('8 · Esc lo cierra', await p.evaluate(() => !document.getElementById('pal-ov')));
  if(CAP){ await p.keyboard.press('Control+k'); await p.fill('#pal-in','rosa'); await p.waitForTimeout(200); await p.screenshot({ path:path.join(CAP,'buscador.png') }); }
  await cerrar(p);
  p = await abrir(PEDIDOS, '2026-10-27T10:00:00-04:00', { w:390 });
  r = await p.evaluate(() => { var b=document.getElementById('pal-btn'), t=b.querySelector('.pal-btn-t'); var R=b.getBoundingClientRect(); return { w:Math.round(R.width), txt:getComputedStyle(t).display, dentro:R.right<=window.innerWidth }; });
  chk('8 · en el celular es un 🔎 redondo que entra en la pantalla', r.w===40 && r.txt==='none' && r.dentro, r);
  await cerrar(p);

  try{ fs.unlinkSync(dash); }catch(e){}
  chk('sin errores de JavaScript', !errores.length, errores.slice(0,3));
  await browser.close();
  console.log(`\n${PASS} bien · ${FAIL} mal`);
  process.exit(FAIL ? 1 : 0);
})();
