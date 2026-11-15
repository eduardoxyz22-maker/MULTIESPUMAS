/* 📣 MEJORA 337 — LO QUE VENDE CADA BS DE PUBLICIDAD, en Proyección (solo con la contraseña).

   El dueño (15/11): Facebook trae el 63 % de los leads y cierra el 1,7 %; el dashboard dice «Revisar inversión en canales» pero no sabe cuánto
   se invierte. Por canal pagado: lo gastado, leads, ventas, Bs vendidos, costo por venta y «Bs 1 → Bs 10,3».

   LO QUE ESTA PRUEBA CUIDA:
   1. El gasto vive en la fila del sistema `__publicidad__` (no es una venta, no va al dashboard público); guardar relee la planilla y cambia SOLO
      ese mes; la plata se lee con `montoError`/`parseMonto` (un monto que no se entiende no se guarda).
   2. Leads, ventas y Bs por canal salen del dashboard publicado (`window.PANEL_DATA.channels` de `index.html`; un mes anterior, su
      `panel_AAAA_MM.html`), sin la fila «Cerrados de meses anteriores». Si no se puede leer, o es de otro mes, se dice.
   3. Las cuentas: costo por lead y por venta, Bs vendido por Bs gastado; mes por mes con los meses que tienen gasto.
   4. Solo con la contraseña; sin la bandera `PUB_PRUEBA`, nada.
   Datos INVENTADOS (el gasto y el dashboard). Reloj clavado: jueves 12/11/2026 a las 10:00 de Bolivia.
   Se corre:  node tests/test_publicidad.js */
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
  window.DASH={
    'index.html':{ month:'Noviembre', year:2026, updated:'12/11 09:00', wsp:'texto con }; adentro', channels:[
      { ic:'📘', name:'Facebook', leads:824, cierres:14, ticket:5313, pipeline:74380 }, { ic:'📷', name:'Instagram', leads:29, cierres:1, ticket:4260, pipeline:4260 },
      { ic:'🚶', name:'Visita tienda', leads:56, cierres:24, ticket:5317, pipeline:127610 }, { ic:'↩', name:'Cerrados de meses anteriores', leads:0, cierres:5, pipeline:20000, carry:true } ] },
    'panel_2026_10.html':{ month:'Octubre', year:2026, updated:'31/10 21:00', channels:[ { ic:'📘', name:'Facebook', leads:1000, cierres:30, ticket:5000, pipeline:150000 },
      { ic:'📷', name:'Instagram', leads:40, cierres:2, ticket:4000, pipeline:8000 } ] }
  };
  window.PEDIDOS_URL=[];
  window.pubDashTraer=function(url){ PEDIDOS_URL.push(url); var d=DASH[url]; if(!d) return Promise.reject(new Error('http_404'));
    return Promise.resolve('<html><head><script>window.PANEL_DATA = '+JSON.stringify(d)+';\nvar otra={};</script></head><body></body></html>'); };
  window.PUB=function(m){ return filaSistema(PUB_ID, 'x', JSON.stringify({ v:1, m:m })); };
  window._txt=function(sel){ var e=document.querySelector(sel); return e ? e.innerText.replace(/\s+/g,' ').trim() : ''; };
  window.ESPERA=function(ms){ return new Promise(function(r){ setTimeout(r, ms||30); }); };
  window.PINTAR=function(ym){ document.getElementById('pry-mes').value=ym||'2026-11'; renderProyeccion(); };
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

  console.log('\n── 1. La fila del gasto y la lectura del dashboard ──');
  let r = await ev(() => {
    var f=PUB({ '2026-11':{ c:{ Facebook:7200, Instagram:1200 }, t:1 } });
    var html='<script>window.PANEL_DATA = '+JSON.stringify(DASH['index.html'])+';</script>', D=pubDashDe(html);
    return { sis:esFilaSistema(f), venta:!fueraDeConta(f), g:(function(){ STATE=[f]; return pubGastoDe('2026-11'); })(), d:!!D, ym:pubDashYm(D), canales:D ? pubCanales(D).map(function(c){ return c.nom; }) : null,
             u1:pubDashUrl('2026-11'), u2:pubDashUrl('2026-10'), nada:pubDashDe('<html>sin datos</html>') };
  });
  chk('1a. `__publicidad__` es una fila del sistema (no es una venta)', r.sis===true && r.venta===false, r);
  chk('1b. el gasto del mes por canal', JSON.stringify(r.g)==='{"Facebook":7200,"Instagram":1200}', r.g);
  chk('1c. lee `window.PANEL_DATA` del HTML aunque un texto adentro tenga «};», con su mes (noviembre de 2026)', r.d && r.ym==='2026-11', r.ym);
  chk('1d. los canales sin «Cerrados de meses anteriores»', JSON.stringify(r.canales)==='["Facebook","Instagram","Visita tienda"]', r.canales);
  chk('1e. el mes en curso sale de index.html; uno anterior, de su panel del historial; un HTML sin datos da null', r.u1==='index.html' && r.u2==='panel_2026_10.html' && r.nada===null, [r.u1, r.u2, r.nada]);

  console.log('\n── 2. Las cuentas ──');
  r = await ev(() => {
    STATE=[PUB({ '2026-11':{ c:{ Facebook:7200, Instagram:1200 }, t:1 } })];
    var P=pubDatos('2026-11', DASH['index.html']), o={ tot:P.tot };
    P.canales.forEach(function(c){ o[c.nom]={ gasto:c.gasto, cpl:c.cpl, cpv:c.cpv, roi:c.roi, pago:c.pago, bs:c.bs }; });
    o.orden=P.canales.map(function(c){ return c.nom; });
    return o;
  });
  chk('2a. Facebook: gastado 7.200 → 74.380 vendidos: Bs 10,33 por Bs; costo por venta 514,29, por lead 8,74',
      r.Facebook && r.Facebook.roi.toFixed(2)==='10.33' && r.Facebook.cpv.toFixed(2)==='514.29' && r.Facebook.cpl.toFixed(2)==='8.74', r.Facebook);
  chk('2b. Instagram: 1.200 → 4.260 (Bs 3,55); Tiktok sin gasto ni leads no aparece; «Visita tienda» sin gasto', r.Instagram && r.Instagram.roi.toFixed(2)==='3.55' && r.orden.indexOf('Tiktok')<0 && r['Visita tienda'] && r['Visita tienda'].gasto===0 && r['Visita tienda'].pago===false, r.orden);
  chk('2c. el total de lo que tiene gasto: 8.400 → 78.640 (Bs 9,36 por Bs)', r.tot.gasto===8400 && r.tot.bs===78640 && r.tot.roi.toFixed(2)==='9.36', r.tot);

  console.log('\n── 3. Lo que se ve ──');
  r = await ev(async () => {
    window.PUB_PRUEBA=1; UNLOCKED=true; showView('conta'); segSet('cta-tab','proy'); setContaTab('proy');
    STATE=[PUB({ '2026-11':{ c:{ Facebook:7200, Instagram:1200 }, t:1 }, '2026-10':{ c:{ Facebook:9000, Instagram:1000 }, t:1 } })];
    PINTAR('2026-11'); await ESPERA(80);
    var o={ t:_txt('#pry-pub'), cards:document.querySelectorAll('#pry-pub .pub-k').length, urls:PEDIDOS_URL.slice(), mm:document.querySelectorAll('#pry-pub .pub-tab tbody tr').length };
    UNLOCKED=false; pubPintar(proyeccionMes('2026-11')); o.sinClave=document.getElementById('pry-pub').innerHTML;   // (Proyección entera ya no se abre sin la clave)
    return o;
  });
  chk('3a. «📣 Lo que vende cada Bs de publicidad · noviembre», que el gasto queda solo en el panel', /📣 Lo que vende cada Bs de publicidad · noviembre/.test(r.t) && /queda solo en el panel \(el dashboard es público: ahí no va\)/.test(r.t), r.t.slice(0, 300));
  chk('3b. una tarjeta por canal: Facebook «Gastado Bs 7.200 · 824 leads · 14 ventas · Bs 74.380 vendidos · Costo por venta Bs 514 · Bs 1 → Bs 10,3»',
      r.cards===3 && /📘 Facebook Gastado Bs 7\.200 824 leads · 14 ventas Bs 74\.380 vendidos Costo por lead Bs 9 Costo por venta Bs 514 Bs 1 → Bs 10,3/.test(r.t), r.t);
  chk('3c. «Visita tienda»: sin gasto, con cuánto compra', /🚶 Visita tienda 56 leads · 24 ventas Bs 127\.610 vendidos 43 % compra sin gasto/.test(r.t), r.t);
  chk('3d. mes por mes: noviembre y octubre (leído de panel_2026_10.html): octubre 10.000 → 158.000 (Bs 15,8)', r.mm===2 && r.urls.indexOf('panel_2026_10.html')>=0 && /octubre de 2026 Bs 10\.000 1040 32 Bs 158\.000 Bs 15,8/.test(r.t), [r.mm, r.urls, r.t.slice(-500)]);
  chk('3e. sin la contraseña, nada', r.sinClave==='', r.sinClave);

  console.log('\n── 4. Sin dashboard, o de otro mes ──');
  r = await ev(async () => {
    UNLOCKED=true; PUB_DASH={}; DASH['index.html'].month='Octubre';
    PINTAR('2026-11'); await ESPERA(60); var o={ otro:_txt('#pry-pub') };
    PUB_DASH={}; delete DASH['index.html']; PINTAR('2026-11'); await ESPERA(60); o.error=_txt('#pry-pub');
    return o;
  });
  chk('4a. si el dashboard publicado todavía es del mes anterior, lo dice', /todavía es de octubre de 2026/.test(r.otro), r.otro);
  chk('4b. si no se puede leer, lo dice y no inventa nada', /No se pudo leer el dashboard de Kommo \(http_404\)/.test(r.error) && !/Bs 1 →/.test(r.error), r.error);

  console.log('\n── 5. Cargar el gasto ──');
  r = await ev(async () => {
    DASH['index.html']={ month:'Noviembre', year:2026, updated:'x', channels:[{ ic:'📘', name:'Facebook', leads:100, cierres:2, ticket:5000, pipeline:10000 }] }; PUB_DASH={};
    var srv=[PUB({ '2026-10':{ c:{ Facebook:9000 }, t:1 } })]; srv[0].rev=7;
    STATE=srv.slice(); window.GUARDADO=[]; CONNECTED=true;
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(srv)) }); };
    apiSave=function(f){ GUARDADO.push(JSON.parse(JSON.stringify(f))); return Promise.resolve({ ok:true, pedido:Object.assign({}, f, { rev:(f.rev||0)+1 }) }); };
    PINTAR('2026-11'); await ESPERA(60);
    document.getElementById('pub-editar').click(); await ESPERA(20);
    var ins=document.querySelectorAll('#pry-pub .pub-g'), o={ campos:[].map.call(ins, function(i){ return i.getAttribute('data-canal'); }) };
    ins[0].value='-500'; pubGuardar(); await ESPERA(60); o.mal=GUARDADO.length;
    ins=document.querySelectorAll('#pry-pub .pub-g'); ins[0].value='7.200'; ins[1].value='1200,50';
    await pubGuardar(); await ESPERA(60);
    var g=GUARDADO[GUARDADO.length-1]; o.n=GUARDADO.length; o.id=g && g.id; o.rev=g && g.rev; o.json=g ? JSON.parse(g.observaciones) : null;
    o.estado=pubGastoDe('2026-11'); o.t=_txt('#pry-pub'); o.editando=!!document.querySelector('#pry-pub .pub-g');
    CONNECTED=false;
    return o;
  });
  chk('5a. «✏️ Cargar el gasto» abre un campo por canal pagado (Facebook, Instagram, Tiktok)', JSON.stringify(r.campos)==='["Facebook","Instagram","Tiktok"]', r.campos);
  chk('5b. un monto que no se entiende («-500») no se guarda', r.mal===0, r.mal);
  chk('5c. guardar relee la planilla y cambia SOLO noviembre (octubre queda), con el sello de la planilla', r.n===1 && r.id==='__publicidad__' && r.rev===7 &&
      r.json && JSON.stringify(r.json.m['2026-10'].c)==='{"Facebook":9000}' && JSON.stringify(r.json.m['2026-11'].c)==='{"Facebook":7200,"Instagram":1200.5}', r.json);
  chk('5d. queda en el panel y se ve: Facebook 7.200 → 10.000 (Bs 1,4 por Bs)', JSON.stringify(r.estado)==='{"Facebook":7200,"Instagram":1200.5}' && /Bs 1 → Bs 1,4/.test(r.t) && !r.editando, [r.estado, r.t.slice(0, 400)]);

  console.log('\n── 6. Sin la bandera ──');
  r = await ev(() => { window.PUB_PRUEBA=0; UNLOCKED=true; PINTAR('2026-11'); return document.getElementById('pry-pub').innerHTML; });
  chk('6a. sin `PUB_PRUEBA` (Playwright), nada: las pruebas de siempre no cambian', r==='', r);

  chk('la página no tiró errores', errores.length===0, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
