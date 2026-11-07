/* 🏷️ BLOKI CONTESTA EL CÓDIGO DE UN PRODUCTO (07/11). El dueño, con la captura de Bloki diciendo «No tengo esa respuesta todavía» a
   «cual es el codigo del colchon cloud de 90×190»: *«¿y no que Bloki respondía preguntas?»*. Bloki no tenía esa pregunta, y el CLOUD no estaba
   en la lista de precios (`CODIGOS`): solo en los Excel (CH2511 105x190, CH2512 140x190). Después el dueño mandó la lista del CLOUD (CH2510 90x190 …
   CH2514 180x190) y entró a `CODIGOS`. Lo que la lista no tiene y los Excel sí se prueba con un producto INVENTADO («NIMBO», CH9101/CH9102).

   ⚠️ LO QUE ESTA PRUEBA CUIDA (falla contra lo publicado antes, `63b947d`):
   1. «código de <producto> <medida>»: el código, de la lista de precios o de los Excel de los almacenes (lo que la lista no tiene), con de
      dónde sale; varios → la lista de códigos; en otra medida → «No tengo … en 90x190. Está en:» con el código de cada medida.
   2. Al revés: «¿qué es el CH1220?» → el producto; un código del histórico del sistema; uno que no existe → «No encontré el código».
   3. «90×190» (el signo de multiplicar) es 90x190.
   4. El STOCK de un producto que la lista no tiene se busca en los Excel («¿hay cloud 140?»). Lo de la lista sigue igual.
   5. El «no sé» dice qué SÍ contesta (y que lo demás va a Claude con la contraseña).
   Datos SINTÉTICOS (los códigos de producto son los de la lista y del Excel, no hay clientes). Reloj clavado el martes 10/11/2026 a las 10:00.
   Se corre:  node tests/test_bloki_codigo.js   (desde la raíz del repo; PEDIDOS=<otro html> para los dientes) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,700)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  loadFromServer=function(){};
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
  apiSave=function(p){ return Promise.resolve({ ok:true, pedido:JSON.parse(JSON.stringify(p)) }); };
  try{ ['me_asis_vistos','me_asis_mudo','me_asis_tour','me_asis_preg','me_quien_rol'].forEach(function(k){ localStorage.removeItem(k); }); }catch(e){}
  try{ localStorage.setItem('me_asis_tour','1'); localStorage.setItem('me_asis_video', JSON.stringify('ofrecido')); }catch(e){}
  window._esp=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  STATE=[]; saveMirror();
  var LOG='PRODUCTOS TERMINADOS FAB.', BAN='01-05-025  Almacen Distribucion Banzer';
  var kIce=stockClave({ desc:'TITANIO ICE', medida:'140x190', codigo:'CH1220' });
  var kC105=stockClaveCruda({ desc:'COLCHON NIMBO', medida:'105x190' }), kC140=stockClaveCruda({ desc:'COLCHON NIMBO', medida:'140x190' });
  var st={ c:{ f:todayStr(), hora:'08:30:00', u:{}, solo0:true, alm:LOG, t:Date.now()-3600000, cod:{} }, e:[], p:[], a:{}, g:{}, al:{}, h:[] };
  st.g[BAN]={ f:todayStr(), hora:'08:30:00', u:{}, solo0:true, cod:{}, t:Date.now()-3600000, rs:{} };
  st.al[LOG]='log'; st.al[BAN]='sale';
  st.c.u[kIce]=3;
  st.c.u[kC105]=4; st.c.cod.CH9101=kC105;      // NIMBO 105x190 (inventado, solo en el Excel): 4 en PTF
  st.g[BAN].u[kC140]=2; st.g[BAN].cod.CH9102=kC140;   // NIMBO 140x190: 2 en Banzer
  STOCK=st; STOCK_CARGADO=true; stockOlvidarIndice(); SALDO_CACHE=null;
  window.KC={ c105:kC105, c140:kC140 };
  /* un código del histórico del sistema que no está en la lista ni en los Excel */
  window.HIST=null;
  ((VENTAS_HIST&&VENTAS_HIST.filas)||[]).some(function(f){ var c=String(f[0]||'').toUpperCase(); if(c && !CODIGOS[c] && /^[A-Z]{1,5}\d{2,6}[A-Z]?$/.test(c)){ window.HIST={ c:c, n:f[1] }; return true; } return false; });
  UNLOCKED=false; quienRol(''); setVendedorMem('Mirian Salazar');
  window.PREG=async function(q){
    if(!ASIS.abierto || ASIS.tab!=='ayuda') asisAbrir('ayuda');
    var inp=document.getElementById('asis-q'); inp.value=q; inp.dispatchEvent(new Event('input', { bubbles:true }));
    var f=inp.closest('form'); if(f.requestSubmit) f.requestSubmit(); else f.dispatchEvent(new Event('submit', { cancelable:true }));
    await _esp(60);
    return ULT();
  };
  window.ULT=function(){
    var as=document.querySelectorAll('#asis-chat .bkp-a'), a=as[as.length-1];
    if(!a) return { t:'' };
    return { t:a.innerText.replace(/\s+/g,' '), mal:a.classList.contains('mal'), tag:(a.querySelector('.bkp-tag')||{}).textContent||'',
      cods:[].map.call(a.querySelectorAll('.bkp-cod'), function(x){ return x.innerText.replace(/\s+/g,' '); }),
      nums:[].map.call(a.querySelectorAll('.bkp-n'), function(x){ return x.innerText.replace(/\s+/g,' '); }),
      opc:[].map.call(a.querySelectorAll('.bkp-opc button'), function(b){ return b.textContent; }),
      btns:[].map.call(a.querySelectorAll('.bkp-acc button'), function(b){ return b.textContent; }), n:as.length };
  };
  window.TOCAR=async function(txt){
    var as=document.querySelectorAll('#asis-chat .bkp-a'), a=as[as.length-1];
    var b=[].filter.call(a.querySelectorAll('button'), function(x){ return x.textContent.indexOf(txt)>=0; })[0];
    if(!b) return { t:'(no está el botón «'+txt+'»)' };
    b.click(); await _esp(60); return ULT();
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const page = await browser.newPage({ viewport:{ width:1280, height:900 }, timezoneId:'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.addInitScript(() => { window.ASIS_PRUEBA=1; try{ sessionStorage.setItem('me_quien_ok','1'); }catch(e){} });
  await page.clock.setFixedTime(new Date('2026-11-10T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(1800);
  await page.evaluate(PREPARAR);
  const ev = async (fn, arg) => { try{ return await page.evaluate(fn, arg); }catch(e){ return { __err:String(e.message||e).slice(0,300) }; } };

  console.log('\n── 1. El código de un producto ──');
  let r = await ev(() => PREG('cual es el codigo del colchon cloud de 90×190'));
  chk('la pregunta del dueño: «El código de COLCHON CLOUD 90x190 es CH2510», de la lista de precios',
    /El código de COLCHON CLOUD 90x190 es CH2510/.test(r.t) && /De la lista de precios/.test(r.t) && !/No tengo esa respuesta todavía/.test(r.t), r);
  chk('…con «con los números del panel · no gasta» (no se anota como «no sabe»)', /no gasta/.test(r.tag), r.tag);
  r = await ev(() => PREG('codigo cloud'));
  chk('«codigo cloud» → los cinco de la lista del dueño (CH2510 90x190 … CH2514 180x190)', (r.cods||[]).length===5 &&
    [['CH2510','90x190'],['CH2511','105x190'],['CH2512','140x190'],['CH2513','160x190'],['CH2514','180x190']].every(p=>r.cods.some(x=>x.indexOf(p[0])===0 && x.indexOf(p[1])>0)), r);
  r = await ev(() => PREG('codigo del cloud de 2 plazas y media'));
  chk('«código del cloud de 2 plazas y media» = CH2513', /El código de COLCHON CLOUD 160x190 es CH2513/.test(r.t), r.t);
  r = await ev(() => PREG('codigo del cloud 200x200'));
  chk('«código del cloud 200x200» (no está en la lista del dueño) → «No tengo… Está en:» con las cinco medidas', /No tengo .*cloud.* en 200x200/i.test(r.t) && (r.cods||[]).length===5, r);
  r = await ev(() => PREG('cual es el codigo del colchon nimbo de 90×190'));
  chk('lo que solo está en los Excel, en otra medida: «No tengo nimbo en 90x190. Está en:» con el código de cada medida (CH9101 105x190, CH9102 140x190)',
    /No tengo .*nimbo.* en 90x190/i.test(r.t) && r.cods && r.cods.some(c=>/CH9101/.test(c) && /105x190/.test(c)) && r.cods.some(c=>/CH9102/.test(c) && /140x190/.test(c)), r);
  r = await ev(() => PREG('código del colchón nimbo de 1 plaza y media'));
  chk('«código del colchón nimbo de 1 plaza y media» = CH9101, y dice que no está en la lista de precios (sale del Excel)',
    /El código de COLCHON NIMBO 105x190 es CH9101/.test(r.t) && /no está en la lista de precios: sale del Excel del almacén/i.test(r.t), r.t);
  chk('…con «📦 Ver su stock»', (r.btns||[]).some(b=>/Ver su stock/.test(b)), r.btns);
  r = await ev(() => TOCAR('Ver su stock'));
  chk('«📦 Ver su stock» contesta el stock del NIMBO 105 (el cuadrito: PTF + Banzer = 4)', /COLCHON NIMBO 105x190/.test(r.t) && (r.nums||[]).some(n=>/^4 .*PTF \+ Banzer/.test(n)), r);
  r = await ev(() => PREG('codigo nimbo'));
  chk('«codigo nimbo» → los dos códigos, «del Excel del almacén»', (r.cods||[]).length===2 && /Estos son los códigos de/.test(r.t) && r.cods.every(c=>/del Excel del almacén/.test(c)), r);
  r = await ev(() => PREG('¿Cuál es el código del titanio ice 140?'));
  chk('«código del titanio ice 140» = CH1220, de la lista de precios (sin somieres)', /El código de COLCHON TITANIO ICE 140x190 es CH1220/.test(r.t) && /De la lista de precios/.test(r.t), r.t);
  r = await ev(() => PREG('codigo del oro anatomico 2 plazas'));
  chk('«código del oro anatómico 2 plazas» = CH1036', /es CH1036/.test(r.t), r.t);
  r = await ev(() => PREG('codigos del titanio ice'));
  chk('«códigos del titanio ice» → la lista de las 5 medidas', (r.cods||[]).length===5 && r.cods.some(c=>/CH1224/.test(c)) && r.cods.some(c=>/CH1222/.test(c)), r.cods);
  r = await ev(() => PREG('codigo de un colchon marciano'));
  chk('un producto que no existe: «No encontré…» (no se inventa)', /No encontré «.*marciano/i.test(r.t) && r.mal, r.t);

  console.log('\n── 2. Al revés: qué producto es un código ──');
  r = await ev(() => PREG('¿Qué es el CH1220?'));
  chk('«¿qué es el CH1220?» → COLCHON TITANIO ICE 140x190, de la lista de precios', /CH1220 es COLCHON TITANIO ICE 140x190/.test(r.t) && /De la lista de precios/.test(r.t), r.t);
  r = await ev(() => PREG('que es el CH9102'));
  chk('«qué es el CH9102» → COLCHON NIMBO 140x190, del Excel del almacén', /CH9102 es COLCHON NIMBO 140x190/.test(r.t) && /Excel del almacén/.test(r.t), r.t);
  r = await ev(() => PREG('que es el CH2510'));
  chk('«qué es el CH2510» → COLCHON CLOUD 90x190 (el dueño)', /CH2510 es COLCHON CLOUD 90x190/.test(r.t), r.t);
  r = await ev(() => PREG('codigo CH9999'));
  chk('un código que no existe → «No encontré el código CH9999»', /No encontré el código CH9999/.test(r.t), r.t);
  r = await ev(async () => { if(!HIST) return { sin:1 }; return PREG('código '+HIST.c); });
  chk('un código del histórico del sistema (ni en la lista ni en los Excel) → su nombre, «del histórico… hoy no está en ningún Excel»',
    r.sin || (/del histórico de ventas del sistema/i.test(r.t) && !/No encontré/.test(r.t)), r);

  console.log('\n── 3. El stock de lo que la lista no tiene, y lo de siempre ──');
  r = await ev(() => PREG('¿hay nimbo 140?'));
  chk('«¿hay nimbo 140?» (solo en los Excel) → su stock (antes: «no tengo esa respuesta»)', /COLCHON NIMBO 140x190/.test(r.t) && (r.nums||[]).some(n=>/^2 .*PTF \+ Banzer/.test(n)), r);
  r = await ev(() => PREG('¿Hay titanio ice 140 para el jueves?'));
  chk('lo de la lista sigue igual: «¿hay titanio ice 140 para el jueves?» contesta UN producto', /COLCHON TITANIO ICE 140x190/.test(r.t) && !(r.opc||[]).length && (r.nums||[]).length>0, r);
  r = await ev(() => ({ a:blokiDia(blokiNorm('titanio 140×190')).resto, b:(blokiEntender('¿hay titanio ice 140×190?')||{}).tipo }));
  chk('«140×190» se lee 140x190', /140x190/.test(r.a) && r.b==='stock', r);

  console.log('\n── 4. El «no sé» dice qué sí contesta ──');
  r = await ev(() => PREG('cual es la capital de francia'));
  chk('«No tengo esa respuesta todavía» + qué contesta con los números del panel y que lo demás va a Claude con la contraseña',
    /No tengo esa respuesta todavía/.test(r.t) && /el stock, el código, el precio o las medidas de un producto/.test(r.t) && /contraseña de Administración/.test(r.t), r.t);
  r = await ev(async () => { quienRol('logistica'); var x=await PREG('cual es la capital de italia'); quienRol(''); return x; });
  chk('a Logística sin la contraseña no le ofrece «cuánto le falta pagar a un cliente»', /el código, el precio o las medidas de un producto/.test(r.t) && !/falta pagar|te deben|vendiste|efectivo/.test(r.t), r.t);

  chk('sin errores de la página', !errores.length, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
