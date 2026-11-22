/* 📸 456 · MI DÍA EN UNA IMAGEN (22/11; el dueño la eligió con la muestra).

   LO QUE CUIDA (servidor de mentira; solo datos inventados; reloj CLAVADO el jueves 12/11/2026 a las 10:00 de Bolivia):
   1. Con una vendedora elegida, «☀️ Tu día» trae «📸 Mi día en una imagen»; Eduardo, ROHO, «👑 Ver todos» y sin la bandera, no.
   2. Los números son los de siempre: HOY = lo cargado hoy (= «🏆 Vendedor del día», `recoVentasPorDia`, y «🎯 Hoy: llevás…», `metaDiaDatos`);
      EL MES = su fila de «Por vendedor» de Proyección; el PUESTO = el lugar de esa fila en su marca; la META y lo que falta = los de
      «💰 Tu comisión» (`misComisionDatos`, con las metas de `ccmMetas`).
   3. Sin metas guardadas del mes (diciembre), la imagen no trae barra ni «te faltan».
   4. La imagen se arma (1080×1350, no vacía), la ventana trae «⬇️ Bajar la imagen» y baja un .png; no guarda nada.
   5. En el celular (390 px) el botón se ve y la ventana no ensancha la página.
   Se corre:  node tests/test_mi_dia_imagen.js   (SALIDA=<carpeta> deja la imagen y la ventana) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const SALIDA = process.env.SALIDA || '';

function PREPARAR(arg){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true;
  try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  window.MIS_TOP_PRUEBA=1; if(arg.bandera) window.MIDIA_PRUEBA=1;
  var ym=arg.ym, ts=function(d, h){ return new Date(d+'T'+(h||'09:00')+':00-04:00').getTime(); };
  var L=[];
  var V=function(id, v, f, reg, bs, h, extra){ L.push(Object.assign({ id:id, oc:ym.slice(5)+'-'+id, nota:'N'+id, cliente:'CLIENTE INVENTADO '+id, celular:'7100000'+L.length, fecha:f, turno:'AM', zona:'Norte', direccion:'CALLE 1',
    maps:'https://maps.google.com/?q=-17.78,-63.18', vendedor:v, productos:[{ desc:'COLCHON SOFT', medida:'140x190', codigo:'', cant:1, precio:bs }], saldo:0, acuenta:0, pagado:true,
    metodoPago:'Efectivo '+bs+' @'+reg+' #'+id, ts:ts(reg, h), rev:1 }, extra||{})); };
  var d=function(n){ return ym+'-'+(n<10?'0':'')+n; }, hoy=arg.hoy;
  V('i1','Isabel Robledo', d(20), d(3), 40000);
  V('i2','Isabel Robledo', d(22), hoy, 12000, '08:30');                      // hoy
  V('i3','Isabel Robledo', d(25), hoy, 8500, '09:10');                       // hoy
  V('i4','Isabel Robledo', '', hoy, 3000, '09:20', { direccion:'SALIÓ DE TIENDA · Central', zona:'TIENDA', turno:'' });   // venta de tienda, hoy
  V('m1','Maria Flores', d(14), d(2), 90000);
  V('r1','Mirian Salazar', d(15), d(4), 30000);
  V('j1','Jonathan Monje', d(16), d(5), 20000);
  V('s1','Mauricio Merida', d(17), d(5), 60000);
  V('e1','Eduardo Añez', d(17), hoy, 50000, '08:00');
  V('o1','ROHO', d(17), hoy, 0, '08:00');
  if(arg.metas) L.push({ id:'__metas__', fecha:'', cliente:'🎯 METAS', rev:3, observaciones:JSON.stringify({ v:1, m:(function(){ var m={}; m[ym]={ heaven:160000, suena:50000, t:2,
    vd:{ 'Isabel Robledo':[60000,80000], 'Maria Flores':[60000,80000], 'Mirian Salazar':[60000,80000], 'Jonathan Monje':[60000,80000], 'Mauricio Merida':[40000,60000] },
    esc:{ heaven:{ t:[['min',100,2],['pres',100,2.75]], bono:0 }, suena:{ t:[['min',100,2]], bono:0 } } }; return m; })() }) });
  window._L=L; window.SAVES=[];
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window._L)) }); };
  apiSave=function(r){ window.SAVES.push(JSON.parse(JSON.stringify(r))); return Promise.resolve({ ok:true, pedido:r }); };
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  window._ver=async function(v, todos){ await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok'; showView('mis'); MIS_TODOS=!!todos;
    var mv=document.getElementById('mis-vendedor'); mv.value=v; renderMis(); await _esperar(200); };
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (w, o) => {
    const ctx = await browser.newContext({ viewport:{ width:w, height:900 }, timezoneId:'America/La_Paz', deviceScaleFactor:2, acceptDownloads:true });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message));
    page.on('dialog', d => d.accept());
    await ctx.route(/^https?:\/\//, r => r.abort());
    await page.clock.setFixedTime(new Date(o.hoy+'T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate(PREPARAR, o);
    return { ctx, page };
  };
  const NOV={ ym:'2026-11', hoy:'2026-11-12', metas:true, bandera:true };
  let { ctx, page } = await abrir(1440, NOV);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __err:String((e&&e.message)||e).slice(0,300) }; } };

  /* 1 · dónde aparece el botón */
  let r = await ev(async () => { var o={}; for(const v of ['Isabel Robledo','Eduardo Añez','ROHO']){ await _ver(v); o[v]=!!document.getElementById('midia-btn'); } await _ver('Isabel Robledo', true); o.todos=!!document.getElementById('midia-btn'); return o; });
  chk('1a · con Isabel elegida, «☀️ Tu día» trae «📸 Mi día en una imagen»', r['Isabel Robledo']===true, r);
  chk('1b · Eduardo, ROHO y «👑 Ver todos» no lo tienen', r['Eduardo Añez']===false && r['ROHO']===false && r.todos===false, r);

  /* 2 · los números */
  r = await ev(async () => {
    await _ver('Isabel Robledo');
    var D=JSON.parse(JSON.stringify(midiaDatos('Isabel Robledo'))), R=proyeccionMes('2026-11'), fila=null, pos=0, de=0;
    R.marcas.forEach(function(m){ m.filas.forEach(function(f, i){ if(normNombre(f.vendedor)===normNombre('Isabel Robledo')){ fila=f; pos=i+1; de=m.filas.length; } }); });
    var reco=(recoVentasPorDia('2026-11-12')['2026-11-12']||{})[normNombre('Isabel Robledo')], md=metaDiaDatos('Isabel Robledo'), com=misComisionDatos('Isabel Robledo');
    return { D:D, fila:fila && { vendido:fila.vendido, n:fila.n, u:fila.u, proy:fila.proy }, pos:pos, de:de, reco:reco && reco.bs, mdHoy:md && md.hoy, com:com && { meta:com.meta, falta:com.falta, bs:com.bs, llego:com.llego } };
  });
  chk('2a · hoy = lo cargado hoy (12.000 + 8.500 + la venta de tienda 3.000 = Bs 23.500, 3 ventas), igual que «🏆 Vendedor del día»',
    r.D && r.D.hoyBs===23500 && r.D.hoyN===3 && r.reco===23500, [r.D && r.D.hoyBs, r.reco]);
  chk('2b · …y que «🎯 Hoy: llevás…» de Tu día', r.mdHoy===23500, r.mdHoy);
  chk('2c · el mes = su fila de «Por vendedor» de Proyección (Bs 63.500, 4 ventas)', r.fila && r.D.mes.bs===r.fila.vendido && r.fila.vendido===63500 && r.D.mes.n===r.fila.n && r.D.mes.proy===r.fila.proy, [r.D && r.D.mes, r.fila]);
  chk('2d · el puesto = el lugar de su fila en Heaven (2° de 4: Maria 90.000, Isabel 63.500, Mirian, Jonathan)', r.D.puesto===r.pos && r.pos===2 && r.D.de===r.de && r.de===4 && r.D.marca && r.D.marca.k==='heaven', [r.D.puesto, r.D.de, r.pos, r.de]);
  chk('2e · la meta y lo que falta = los de «💰 Tu comisión»', r.com && r.D.meta===r.com.meta && r.D.falta===r.com.falta && r.D.mes.bs===r.com.bs && r.D.llego===r.com.llego && r.D.meta>0, [r.D.meta, r.D.falta, r.com]);

  /* 4 · la imagen */
  r = await ev(async () => { await _ver('Isabel Robledo'); window.SAVES=[]; var D=await midiaAbrir('Isabel Robledo'); await _esperar(200);
    var img=document.getElementById('imgc-img'), mb=document.getElementById('modal-box');
    return { ok:!!D, w:img && img.naturalWidth, h:img && img.naturalHeight, len:img ? img.src.length : 0, bajar:!!document.getElementById('imgc-bajar'), tit:(mb && mb.querySelector('h3') || {}).textContent, src:img ? img.src : '' }; });
  chk('4a · la ventana muestra la imagen de 1080×1350 (no vacía) con «⬇️ Bajar la imagen»', r.ok && r.w===1080 && r.h===1350 && r.len>40000 && r.bajar && /Mi día en una imagen/.test(r.tit||''), [r.w, r.h, r.len, r.tit]);
  if(SALIDA && r.src) fs.writeFileSync(path.join(SALIDA, 'E-456-mi-dia.png'), Buffer.from(r.src.split(',')[1], 'base64'));
  if(SALIDA) await page.locator('#modal-box').screenshot({ path:path.join(SALIDA, 'E-456-ventana.png') });
  const [dl] = await Promise.all([ page.waitForEvent('download', { timeout:15000 }).catch(()=>null), page.click('#imgc-bajar') ]);
  chk('4b · «⬇️ Bajar la imagen» baja un .png con su nombre', !!dl && /^mi-dia-isabel-robledo-2026-11-12\.png$/.test(dl.suggestedFilename()), dl && dl.suggestedFilename());
  r = await ev(async () => { await _esperar(200); closeModal(); return window.SAVES.length; });
  chk('4c · solo mira: armar y bajar la imagen no guarda nada', r===0, r);
  /* el botón de Tu día abre la misma ventana */
  r = await ev(async () => { await _ver('Isabel Robledo'); document.getElementById('midia-btn').click(); await _esperar(500); var img=document.getElementById('imgc-img'); var o={ w:img && img.naturalWidth }; closeModal(); return o; });
  chk('4d · tocar el botón de «Tu día» abre la ventana con la imagen', r.w===1080, r);
  if(SALIDA){ await ev(async () => { await _ver('Isabel Robledo'); }); await page.setViewportSize({ width:1440, height:2200 }); await page.locator('#mis-top .td-acc').screenshot({ path:path.join(SALIDA, 'E-456-tu-dia.png') }); }
  chk('sin errores de la página (1440 px)', errores.length===0, errores);
  await ctx.close();

  /* 1c · sin la bandera, en Playwright no aparece */
  ({ ctx, page } = await abrir(1440, Object.assign({}, NOV, { bandera:false })));
  r = await ev(async () => { await _ver('Isabel Robledo'); return !!document.getElementById('midia-btn'); });
  chk('1c · sin `MIDIA_PRUEBA`, en Playwright no aparece', r===false, r);
  await ctx.close();

  /* 3 · diciembre sin metas guardadas */
  ({ ctx, page } = await abrir(1440, { ym:'2026-12', hoy:'2026-12-10', metas:false, bandera:true }));
  r = await ev(async () => { await _ver('Isabel Robledo'); var m=ccmMetas('2026-12'), D=JSON.parse(JSON.stringify(midiaDatos('Isabel Robledo')));
    var cv=midiaDibujar(midiaDatos('Isabel Robledo'), null); return { ok:m.ok, D:D, w:cv.width, src:cv.toDataURL('image/png') }; });
  chk('3 · sin metas guardadas de diciembre: sin meta (ni barra ni «te faltan»), y la imagen se arma igual', r.ok===false && r.D.meta===0 && r.D.falta===0 && r.D.mes.bs===63500 && r.w===1080, [r.ok, r.D && r.D.meta]);
  if(SALIDA && r.src) fs.writeFileSync(path.join(SALIDA, 'E-456-mi-dia-sin-meta.png'), Buffer.from(r.src.split(',')[1], 'base64'));
  await ctx.close();

  /* 5 · el celular */
  ({ ctx, page } = await abrir(390, NOV));
  r = await ev(async () => { await _ver('Isabel Robledo'); var b=document.getElementById('midia-btn'), vis=!!(b && b.offsetParent);
    await midiaAbrir('Isabel Robledo'); await _esperar(300); var mb=document.getElementById('modal-box').getBoundingClientRect();
    return { vis:vis, sw:document.documentElement.scrollWidth, iw:window.innerWidth, der:Math.round(mb.right) }; });
  chk('5 · en el celular (390 px) el botón se ve y la ventana no ensancha la página', r.vis && r.sw<=r.iw && r.der<=r.iw, r);
  if(SALIDA) await page.locator('#modal-box').screenshot({ path:path.join(SALIDA, 'E-456-ventana-390.png') });
  await ctx.close();

  chk('sin errores de la página', errores.length===0, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
