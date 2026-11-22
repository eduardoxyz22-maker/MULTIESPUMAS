/* 📊 467 · LA SEMANA EN UNA IMAGEN, LOS LUNES (22/11; el dueño la eligió con la muestra).

   LO QUE CUIDA (servidor de mentira; solo datos inventados; reloj CLAVADO el lunes 16/11/2026 a las 09:00 de Bolivia):
   1. En Proyección (con la contraseña) el botón «📊 La semana en una imagen» sale con `SEMANA_IMG_PRUEBA`; sin ella, no.
   2. La semana pasada (lunes 9 al sábado 14) contra la de antes (2 al 7), por el DÍA DE CARGA: el total del equipo, cada marca y cada tienda
      dan lo mismo que sumar `pryVentas` a mano (`x.reg`, `x.g`, `x.st`); mayoristas y ROHO aparte; el domingo aparte.
   3. «3 cosas para mirar» verdaderas: la tienda que más subió y la que más bajó, la marca que más cambió, las entregas que cambiaron de día (`fH`).
   4. ‹ › cambia de semana (no hay › en la semana pasada); la imagen se arma (1080 de ancho, 1350 o más de alto) y no guarda nada.
   5. Bloki: los lunes desde las 08:00, con la contraseña, una vez por semana y aparato; no antes de las 8, ni otro día, ni sin la contraseña.
   Se corre:  node tests/test_semana_imagen.js   (SALIDA=<carpeta> deja la imagen y la ventana) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const SALIDA = process.env.SALIDA || '';

function PREPARAR(bandera){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true;
  try{ localStorage.removeItem(LS_PEND); localStorage.removeItem('me_semimg_lun'); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(bandera) window.SEMANA_IMG_PRUEBA=1;
  var ts=function(d, h){ return new Date(d+'T'+(h||'10:00')+':00-04:00').getTime(); }, L=[], n=0;
  /* una venta cargada el día `reg`, con entrega el 25/11 */
  var V=function(v, reg, bs, cant, extra){ n++; L.push(Object.assign({ id:'v'+n, oc:'11-'+String(100+n), nota:'N'+n, cliente:'CLIENTE INVENTADO '+n, celular:'7100'+String(1000+n), fecha:'2026-11-25', turno:'AM',
    zona:'Norte', direccion:'CALLE 1', maps:'', vendedor:v, productos:[{ desc:'COLCHON SOFT', medida:'140x190', codigo:'', cant:cant||1, precio:bs }], saldo:0, acuenta:0, pagado:true,
    metodoPago:'Efectivo '+bs+' @'+reg+' #'+n, ts:ts(reg), rev:1 }, extra||{})); return L[L.length-1]; };
  /* la semana de antes (2 al 7/11) */
  V('Isabel Robledo','2026-11-03', 20000); V('Jonathan Monje','2026-11-04', 30000, 2); V('Mauricio Merida','2026-11-05', 10000); V('Carola Chavez','2026-11-06', 5000);
  V('Eduardo Añez','2026-11-04', 40000); V('ROHO','2026-11-05', 0, 3);
  V('Carola Chavez','2026-11-08', 2000);                                                     // el domingo de antes
  /* la semana pasada (9 al 14/11) */
  V('Isabel Robledo','2026-11-10', 35000, 2); V('Isabel Robledo','2026-11-12', 15000);         // Central (la tienda de Isabel) sube
  V('Jonathan Monje','2026-11-11', 12000);                                                   // Mia Plaza (la de Jonathan) baja
  V('Mauricio Merida','2026-11-13', 30000, 3);                                               // Sueña sube mucho
  V('Carola Chavez','2026-11-14', 5000);
  V('Eduardo Añez','2026-11-10', 25000); V('ROHO','2026-11-11', 0, 5);                        // mayoristas y ROHO, aparte
  V('Carola Chavez','2026-11-15', 7000);                                                     // el domingo
  V('Maria Flores','2026-11-16', 99000);                                                     // hoy: no es de ninguna de las dos semanas
  /* la historia del pedido: dos entregas cambiaron de día en la semana (una dos veces), y un cambio de turno que no cuenta */
  var p=L[0]; p.productos[0].fH=[{ t:ts('2026-11-10','11:00'), de:'2026-11-20|AM', a:'2026-11-21|AM', q:'Ernesto', d:'ficha' }, { t:ts('2026-11-12','11:00'), de:'2026-11-21|AM', a:'2026-11-23|PM', q:'Ernesto', d:'ficha' }];
  p=L[1]; p.productos[0].fH=[{ t:ts('2026-11-13','15:00'), de:'2026-11-18|AM', a:'2026-11-19|AM', q:'Isabel', d:'form' }];
  p=L[2]; p.productos[0].fH=[{ t:ts('2026-11-13','16:00'), de:'2026-11-18|AM', a:'2026-11-18|PM', q:'Isabel', d:'form' }];
  p=L[3]; p.productos[0].fH=[{ t:ts('2026-11-05','16:00'), de:'2026-11-18|AM', a:'2026-11-19|AM', q:'Isabel', d:'form' }];   // de la semana de antes
  window._L=L; window.SAVES=[];
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window._L)) }); };
  apiSave=function(r){ window.SAVES.push(r); return Promise.resolve({ ok:true, pedido:r }); };
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (w, bandera, cuando) => {
    const ctx = await browser.newContext({ viewport:{ width:w, height:900 }, timezoneId:'America/La_Paz', deviceScaleFactor:2, acceptDownloads:true });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await ctx.route(/^https?:\/\//, r => r.abort());
    await page.clock.setFixedTime(new Date(cuando||'2026-11-16T09:00:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate(PREPARAR, bandera);
    await page.evaluate(async () => { await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok'; });
    return { ctx, page };
  };
  let { ctx, page } = await abrir(1440, true);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __err:String((e&&e.message)||e).slice(0,300) }; } };

  /* 1 · el botón */
  let r = await ev(async () => { showView('conta'); segSet('cta-tab','proy'); setContaTab('proy'); await _esperar(250); var w=document.getElementById('pry-semimg-w'); return { hay:!!w, hidden:w ? w.hidden : null, vis:!!(w && w.offsetParent) }; });
  chk('1a · en Proyección, con la bandera, sale «📊 La semana en una imagen»', r.hay && r.hidden===false && r.vis, r);

  /* 2 · los números */
  r = await ev(() => {
    var D=semImgDatos(0), V=pryVentas(), a={ tot:0, u:0, n:0, g:{}, st:{}, may:0, roho:0, dom:0 }, b={ tot:0, g:{}, st:{}, may:0, roho:0, dom:0 };
    V.forEach(function(x){
      var w = (x.reg>='2026-11-09' && x.reg<='2026-11-14') ? a : ((x.reg>='2026-11-02' && x.reg<='2026-11-07') ? b : null);
      if(x.reg==='2026-11-15' && x.amb==='tienda') a.dom+=x.bs; if(x.reg==='2026-11-08' && x.amb==='tienda') b.dom+=x.bs;
      if(!w) return;
      if(x.amb==='mayor'){ w.may+=x.bs; return; } if(x.amb==='roho'){ w.roho+=x.u; return; } if(x.amb!=='tienda') return;
      w.tot+=x.bs; if(w===a){ a.u+=x.u; a.n++; } w.g[x.g]=(w.g[x.g]||0)+x.bs; w.st[x.st||'Sin tienda']=(w.st[x.st||'Sin tienda']||0)+x.bs;
    });
    var dm={}, dt={}; D.marcas.forEach(function(m){ dm[m.k]=[m.a.bs, m.b.bs]; }); D.tiendas.forEach(function(t){ dt[t.k]=[t.a.bs, t.b.bs]; });
    return { lun:D.A.lun, sab:D.A.sab, lunB:D.B.lun, tot:[D.A.tot.bs, D.B.tot.bs, D.A.tot.u, D.A.tot.n], a:a, b:b, dm:dm, dt:dt, may:[D.A.mayor.bs, D.B.mayor.bs], roho:[D.A.roho.u, D.B.roho.u],
             dom:[D.A.domTot.bs, D.B.domTot.bs], cambios:D.cambios, cosas:D.cosas.map(function(c){ return c.k+': '+c.t; }) };
  });
  chk('2a · la semana pasada es del lunes 9 al sábado 14; la de antes arranca el lunes 2', r.lun==='2026-11-09' && r.sab==='2026-11-14' && r.lunB==='2026-11-02', [r.lun, r.sab, r.lunB]);
  chk('2b · el equipo = `pryVentas` por el día de carga: Bs 97.000 (8 unidades) contra Bs 65.000', r.tot[2]===8 && r.tot[0]===r.a.tot && r.tot[0]===97000 && r.tot[1]===r.b.tot && r.tot[1]===65000 && r.tot[2]===r.a.u && r.tot[3]===r.a.n, [r.tot, r.a.tot, r.b.tot]);
  chk('2c · cada marca igual que sumar `pryVentas` (Heaven 67.000 / 55.000; Sueña 30.000 / 10.000)',
    r.dm.heaven[0]===r.a.g.heaven && r.dm.heaven[1]===r.b.g.heaven && r.dm.suena[0]===r.a.g.suena && r.dm.suena[1]===r.b.g.suena && r.dm.heaven[0]===67000 && r.dm.suena[1]===10000, [r.dm, r.a.g, r.b.g]);
  chk('2d · cada tienda = `x.st` (la tienda de quien vendió)', Object.keys(r.dt).every(k => (r.dt[k][0]===(r.a.st[k]||0)) && (r.dt[k][1]===(r.b.st[k]||0))) && Object.keys(r.a.st).every(k => r.dt[k]), [r.dt, r.a.st, r.b.st]);
  chk('2e · mayoristas (25.000 / 40.000) y ROHO (5 / 3 unidades) aparte; el domingo aparte (7.000 / 2.000)',
    r.may[0]===25000 && r.may[1]===40000 && r.roho[0]===5 && r.roho[1]===3 && r.dom[0]===7000 && r.dom[1]===2000 && r.a.dom===7000, [r.may, r.roho, r.dom]);
  chk('2f · lo de hoy (lunes 16) no entra en ninguna de las dos', !Object.values(r.dt).some(v => v[0]===99000), r.dt);

  /* 3 · las 3 cosas */
  const cs=r.cosas.join(' | ');
  chk('3a · son 3', r.cosas.length===3, r.cosas);
  chk('3b · la tienda que más subió y la que más bajó, con su diferencia', /^tienda: La tienda que más subió fue Central \(\+Bs 30\.000, \+150 %\) y la que más bajó, Mia Plaza \(−Bs 18\.000, −60 %\)\./.test(r.cosas[0]), r.cosas[0]);
  chk('3c · la marca que más cambió: Sueña subió 200 %', /marca: Sueña subió 200 %: Bs 30\.000 contra Bs 10\.000/.test(cs), cs);
  chk('3d · las entregas que cambiaron de día en la semana: 2 (3 cambios; el de turno y el de la semana de antes no cuentan)', r.cambios && r.cambios.ped===2 && r.cambios.veces===3 && /fh: 2 entregas cambiaron de día durante la semana \(3 cambios en total\)/.test(cs), [r.cambios, cs]);

  /* 4 · la ventana y la imagen */
  r = await ev(async () => { window.SAVES=[]; document.getElementById('pry-semimg-btn').click(); await _esperar(600);
    var img=document.getElementById('imgc-img'), sig=document.getElementById('semimg-sig');
    return { w:img && img.naturalWidth, h:img && img.naturalHeight, sem:(document.getElementById('semimg-sem')||{}).textContent, sigDis:sig && sig.disabled, src:img ? img.src : '' }; });
  chk('4a · la ventana muestra la imagen (1080 de ancho, 1350 o más de alto) de «Del lunes 9 al sábado 14 de noviembre», sin › hacia adelante',
    r.w===1080 && r.h>=1350 && r.sem==='Del lunes 9 al sábado 14 de noviembre' && r.sigDis===true, [r.w, r.h, r.sem, r.sigDis]);
  if(SALIDA && r.src) fs.writeFileSync(path.join(SALIDA, 'E-467-semana.png'), Buffer.from(r.src.split(',')[1], 'base64'));
  if(SALIDA) await page.locator('#modal-box').screenshot({ path:path.join(SALIDA, 'E-467-ventana.png') });
  r = await ev(async () => { document.getElementById('semimg-ant').click(); await _esperar(600); var o={ sem:(document.getElementById('semimg-sem')||{}).textContent, sigDis:document.getElementById('semimg-sig').disabled };
    document.getElementById('semimg-sig').click(); await _esperar(600); o.vuelta=(document.getElementById('semimg-sem')||{}).textContent; return o; });
  chk('4b · ‹ va a la semana de antes (2 al 7) y › vuelve', r.sem==='Del lunes 2 al sábado 7 de noviembre' && r.sigDis===false && r.vuelta==='Del lunes 9 al sábado 14 de noviembre', r);
  const [dl] = await Promise.all([ page.waitForEvent('download', { timeout:15000 }).catch(()=>null), page.click('#imgc-bajar') ]);
  chk('4c · «⬇️ Bajar la imagen» baja semana-2026-11-09.png', !!dl && dl.suggestedFilename()==='semana-2026-11-09.png', dl && dl.suggestedFilename());
  r = await ev(async () => { await _esperar(200); closeModal(); return window.SAVES.length; });
  chk('4d · solo mira: no guardó nada', r===0, r);

  /* 5 · Bloki */
  r = await ev(() => { var o={}; localStorage.removeItem('me_semimg_lun'); o.lunes=semImgAviso(); localStorage.setItem('me_semimg_lun','2026-11-16'); o.hecha=semImgAviso();
    localStorage.removeItem('me_semimg_lun'); UNLOCKED=false; o.sinClave=semImgAviso(); UNLOCKED=true; return o; });
  chk('5a · el lunes desde las 08:00, con la contraseña, Bloki lo recuerda («📊 Armar la imagen»)', r.lunes && r.lunes.k==='semimg|2026-11-16' && r.lunes.b && r.lunes.b[1]==='semImgAbrir()', r.lunes);
  chk('5b · una vez por semana y aparato: armada la imagen, ya no; sin la contraseña, tampoco', r.hecha===null && r.sinClave===null, [r.hecha, r.sinClave]);
  r = await ev(async () => { localStorage.removeItem('me_semimg_lun'); await semImgAbrir(); closeModal(); return localStorage.getItem('me_semimg_lun'); });
  chk('5c · abrir la imagen la da por hecha esta semana', r==='2026-11-16', r);
  await ctx.close();

  ({ ctx, page } = await abrir(1440, true, '2026-11-16T07:30:00-04:00'));
  r = await page.evaluate(() => semImgAviso());
  chk('5d · antes de las 08:00, no', r===null, r);
  await ctx.close();
  ({ ctx, page } = await abrir(1440, true, '2026-11-17T09:00:00-04:00'));
  r = await page.evaluate(() => semImgAviso());
  chk('5e · un martes, no', r===null, r);
  await ctx.close();

  /* 1b · sin la bandera */
  ({ ctx, page } = await abrir(1440, false));
  r = await page.evaluate(async () => { showView('conta'); segSet('cta-tab','proy'); setContaTab('proy'); await _esperar(250); var w=document.getElementById('pry-semimg-w'); return { hidden:w.hidden, vis:!!w.offsetParent, aviso:semImgAviso() }; });
  chk('1b · sin `SEMANA_IMG_PRUEBA`, en Playwright no sale ni el botón ni lo de Bloki', r.hidden===true && !r.vis && r.aviso===null, r);
  await ctx.close();

  /* 4e · en el celular */
  ({ ctx, page } = await abrir(390, true));
  r = await page.evaluate(async () => { await semImgAbrir(); await _esperar(300); var mb=document.getElementById('modal-box').getBoundingClientRect(); return { sw:document.documentElement.scrollWidth, iw:window.innerWidth, der:Math.round(mb.right) }; });
  chk('4e · en el celular (390 px) la ventana no ensancha la página', r.sw<=r.iw && r.der<=r.iw, r);
  await ctx.close();

  chk('sin errores de la página', errores.length===0, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
