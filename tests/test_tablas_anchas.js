/* ➡️ LAS TABLAS ANCHAS AVISAN LO QUE SIGUE A LA DERECHA (15/11/2026, mejora 283; dueño: aprobado). En Contabilidad → Ventas y en ATC:
   la pastilla «→ N columnas más: …» que lleva hasta ahí (y «← Volver al principio»), la sombra del borde mientras haya más, la columna
   que dice de quién es cada renglón fija al correr (Ventas: «Cliente»; ATC: «N° ATC») y la barra fina turquesa.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin la bandera (Playwright): nada cambia (ni pastilla ni columna fija).
   2. Con `TW_MAS_PRUEBA`, a 1366: la pastilla dice cuántas columnas siguen y sus nombres (los que de verdad quedan pasando el borde).
   3. Tocarla corre la tabla hasta el final y pasa a «← Volver al principio»; tocar esa vuelve al principio.
   4. Al correr, la columna «Cliente» se queda pegada a la izquierda (su título también).
   5. Esconder una columna con «☰ Columnas» (o redibujar) recalcula; una tabla que entra entera no muestra nada.
   6. ATC: lo mismo con «N° ATC».
   Datos SINTÉTICOS. Reloj clavado: miércoles 11/11/2026, 10:30 de Bolivia.   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_tablas_anchas.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const HOY = '2026-11-11T10:30:00-04:00';

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  loadFromServer=function(){}; apiList=function(){ return Promise.resolve({ ok:true, pedidos:[] }); };
  var cb=document.getElementById('carga-banner'); if(cb) cb.style.display='none';
  var L=[]; for(var i=1;i<=14;i++){ var t=new Date('2026-11-0'+(1+i%8)+'T10:00:00-04:00').getTime();
    L.push({ id:'p'+i, oc:'11-'+(100+i), nota:String(500+i), vendedor:'Mirian Salazar', cliente:'CLIENTE NUMERO '+i, celular:'70000000', nit:'123456'+i, facturarA:'EMPRESA '+i, zona:'Norte', direccion:'Calle Ejemplo 1',
      fecha:'2026-11-1'+(i%9), turno:'AM', productos:[{desc:'COLCHON TITANIO ICE',medida:'140x190',cant:1,precio:3000},{desc:'ALMOHADA',medida:'50x70',cant:2,precio:50}], saldo:0, acuenta:0, pagado:true,
      metodoPago:'QR BISA 3100 @2026-11-05 #'+(70+i), observaciones:'Llamar antes de ir, edificio con portería', entregado:false, ts:t, rev:t, fotos:[] }); }
  L.push({ id:'a1', oc:'ATC 11-001', cliente:'CLIENTE ATC', vendedor:'Mirian Salazar', fecha:'2026-11-12', turno:'AM', productos:[{desc:'COLCHON TITANIO ICE',medida:'140x190',cant:1}], ts:new Date('2026-11-05T10:00:00-04:00').getTime(), saldo:0, pagado:false, fotos:[],
    atc:{ motivo:'hundimiento', det:'Se hundió del lado izquierdo después de tres meses de uso', compra:'2026-05-01', tipo:'gar' } });
  STATE=L; UNLOCKED=true;
  window._conta=function(){ showView('conta'); segSet('cta-tab','ventas'); setContaTab('ventas'); var cv=document.getElementById('cta-vendedor'); if(cv) cv.value=''; renderConta(); };
  window._pill=function(sel){ var b=document.querySelector(sel+' .tw-mas'); return b ? b.textContent : ''; };
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  async function abrir(flag, w){
    const ctx = await browser.newContext({ viewport:{ width:w||1366, height:800 }, timezoneId:'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r=>r.abort());
    const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
    if(flag) await page.addInitScript(() => { window.TW_MAS_PRUEBA=true; });
    await page.clock.setFixedTime(new Date(HOY));
    await page.goto('file://' + PEDIDOS + '?tema=espuma', { waitUntil:'load' }); await page.waitForTimeout(400);
    await page.evaluate(PREPARAR);
    page._ctx=ctx; return page;
  }
  let r;

  console.log('\n── 1. Sin la bandera ──');
  let page = await abrir(false);
  r = await page.evaluate(async () => { _conta(); await _esperar(150); return { pill:_pill('#view-conta'), fijas:document.querySelectorAll('#tbl-conta .tw-fija').length, sobra:document.getElementById('cx-tw').scrollWidth-document.getElementById('cx-tw').clientWidth }; });
  chk('1 sin bandera: nada cambia (la tabla igual sigue a la derecha)', r.pill==='' && r.fijas===0 && r.sobra>100, r);
  await page._ctx.close();

  console.log('\n── 2-6. Con la bandera ──');
  page = await abrir(true);
  r = await page.evaluate(async () => { _conta(); await _esperar(200); var w=document.getElementById('cx-tw'), wr=w.getBoundingClientRect(), borde=wr.left+w.clientWidth;
    var ocultas=[].filter.call(document.querySelectorAll('#tbl-conta thead th'), function(th){ return th.getBoundingClientRect().right>borde+4; }).map(function(th){ return th.textContent.replace(/[▲▼↕]/g,'').trim(); });
    return { pill:_pill('#view-conta'), ocultas:ocultas, fijas:document.querySelectorAll('#tbl-conta td.tw-fija').length, sombra:document.querySelector('#view-conta .tw-mas-h').classList.contains('tw-sombra') }; });
  chk('2 la pastilla dice cuántas siguen y sus nombres (las que de verdad quedan pasando el borde)', r.ocultas.length>0 && r.pill.indexOf('→ '+r.ocultas.length+' columna')===0 && r.pill.indexOf(r.ocultas[0])>0 && r.sombra, r);
  await page.click('#view-conta .tw-mas'); await page.waitForTimeout(900);
  r = await page.evaluate(() => { var w=document.getElementById('cx-tw'); return { fin:w.scrollLeft+w.clientWidth>=w.scrollWidth-2, pill:_pill('#view-conta'), sombra:document.querySelector('#view-conta .tw-mas-h').classList.contains('tw-sombra') }; });
  chk('3a tocarla corre hasta el final y pasa a «← Volver al principio» (sin sombra)', r.fin && r.pill==='← Volver al principio' && !r.sombra, r);
  r = await page.evaluate(() => { var w=document.getElementById('cx-tw'), td=document.querySelector('#tbl-conta tbody td.tw-fija'), th=document.querySelector('#tbl-conta thead th.tw-fija');
    return { tdL:Math.round(td.getBoundingClientRect().left-w.getBoundingClientRect().left), thL:Math.round(th.getBoundingClientRect().left-w.getBoundingClientRect().left), txt:td.textContent.trim().slice(0,16), th:th.textContent.trim() }; });
  chk('4 corrida, la columna «Cliente» queda pegada a la izquierda (y su título)', Math.abs(r.tdL)<=2 && Math.abs(r.thL)<=2 && /^CLIENTE NUMERO/.test(r.txt) && /^Cliente/.test(r.th), r);
  await page.click('#view-conta .tw-mas'); await page.waitForTimeout(900);
  r = await page.evaluate(() => ({ x:document.getElementById('cx-tw').scrollLeft, pill:_pill('#view-conta') }));
  chk('3b «← Volver al principio» vuelve', r.x<=2 && /^→ /.test(r.pill), r);
  r = await page.evaluate(async () => { var a=_pill('#view-conta'); var st=document.createElement('style'); st.id='esconde'; st.textContent='#tbl-conta th:nth-child(n+9), #tbl-conta td:nth-child(n+9){ display:none; }'; document.head.appendChild(st);
    window.dispatchEvent(new Event('resize')); await _esperar(300); var b=_pill('#view-conta'); var sobra=document.getElementById('cx-tw').scrollWidth-document.getElementById('cx-tw').clientWidth;
    st.remove(); renderConta(); await _esperar(200); return { a:a, b:b, sobra:sobra, c:_pill('#view-conta'), fijas:document.querySelectorAll('#tbl-conta td.tw-fija').length }; });
  chk('5 con las columnas escondidas la tabla entra y no dice nada; redibujada vuelve (y la columna fija también)', r.b==='' && r.sobra<=2 && r.c===r.a && r.fijas===14, r);
  r = await page.evaluate(async () => { var m=document.getElementById('atc-mes'); showView('atc'); await _esperar(300); var tw=document.getElementById('atv-tw');
    return { pill:_pill('#view-atc'), fija:(document.querySelector('#tbl-atc thead th.tw-fija')||{}).textContent||'', td:(document.querySelector('#tbl-atc tbody td.tw-fija')||{}).textContent||'', sobra:tw.scrollWidth-tw.clientWidth }; });
  chk('6 ATC: «N° ATC» fijo y la pastilla de lo que sigue', /^N° ATC/.test(r.fija) && /ATC 11-001/.test(r.td) && (r.sobra>2 ? /^→ \d+ columna/.test(r.pill) : r.pill===''), r);
  await page._ctx.close();

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
