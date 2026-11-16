/* 💵 LA PLATA SE LEE DE UN VISTAZO (15/11/2026, mejora 291; dueño: «aprobado»). En pantalla, los montos van con números de ancho fijo,
   «Bs» y «,00» más chicos y suaves, el centavo de verdad («,50») con su color, y una celda que es solo un monto a la derecha. El número
   y el texto que se lee NO cambian.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin la bandera (Playwright): nada cambia (ningún <x-pl>).
   2. Con `PLATA_PRUEBA`: la tabla de Contabilidad lleva los montos dibujados; su `innerText` y su `textContent` son IDÉNTICOS a los de sin
      bandera (Excel, copias y pruebas no se enteran).
   3. «,00» suave; «,50» con su color (`pl-si`); un monto sin centavos («Bs 12.345», fmtBs0) también, sin «,».
   4. El Cuadre: la celda que es solo un monto va a la derecha y el título de su columna también; una celda con texto y monto, no.
   5. Nunca adentro de un SVG (no se dibujaría), de un botón, de un campo ni de una opción; hacerlo dos veces no envuelve dos veces.
   6. Las filas que llegan «de a partes» (`trozosMas`) también.
   7. Las fichas que cuentan (D3) terminan con el monto dibujado, no en texto plano.
   Datos SINTÉTICOS. Reloj clavado: miércoles 11/11/2026, 10:30 de Bolivia.   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_plata_vistazo.js */
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
  var n=0;
  window.V=function(vend, fecha, bs, reg, o){
    o=o||{}; n++;
    var t=new Date(reg+'T10:00:00-04:00').getTime();
    return Object.assign({ id:'p'+n, oc:'11-'+(100+n), nota:String(500+n), vendedor:vend, cliente:'CLIENTE '+n, celular:'70000000', zona:'Norte', direccion:'Calle Ejemplo 1',
      fecha:fecha, turno:'AM', productos:[{desc:'COLCHON SOFT',medida:'140x190',cant:1,precio:bs}], saldo:bs, acuenta:0, pagado:false, metodoPago:'', entregado:false,
      ts:t, rev:t, fotos:[] }, o);
  };
  window.FIX=function(k){ n=0; var L=[
    V('Mirian Salazar','2026-11-05',12345,'2026-11-03', { metodoPago:'Efectivo 2000 @2026-11-04 #900', saldo:10345 }),
    V('Mirian Salazar','2026-11-06',1565.5,'2026-11-04', { metodoPago:'QR BISA 1565.5 @2026-11-05 #77', saldo:0, pagado:true }),
    V('Mirian Salazar','2026-11-07',890,'2026-11-05')
  ]; for(var i=0;i<(k||0);i++) L.push(V('Mirian Salazar','2026-11-08',100+i,'2026-11-06')); return L; };
  window._conta=function(){ showView('conta'); segSet('cta-tab','ventas'); setContaTab('ventas'); var cv=document.getElementById('cta-vendedor'); if(cv) cv.value=''; renderConta(); };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  async function abrir(flag, extra){
    const ctx = await browser.newContext({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r=>r.abort());
    const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
    await page.addInitScript((o) => { if(o.flag) window.PLATA_PRUEBA=true; if(o.fx) window.FX_PRUEBA=true; }, { flag, fx:!!(extra&&extra.fx) });
    await page.clock.setFixedTime(new Date(HOY));
    await page.goto('file://' + PEDIDOS + '?tema=espuma', { waitUntil:'load' }); await page.waitForTimeout(400);
    await page.evaluate(PREPARAR);
    await page.evaluate((k) => { STATE=FIX(k); UNLOCKED=true; try{ updateStats(); }catch(e){} }, (extra&&extra.k)||0);
    page._ctx=ctx; return page;
  }
  const ev = async (page, fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  let r;

  console.log('\n── 1-3. La tabla de Contabilidad ──');
  let page = await abrir(false);
  const sin = await ev(page, () => { _conta(); var t=document.getElementById('tbl-conta'); return { n:document.querySelectorAll('x-pl').length, it:t.innerText, tc:t.textContent, met:document.getElementById('cta-metrics').innerText }; });
  chk('1 sin bandera: nada cambia (ningún monto dibujado)', sin.n===0 && /Bs 12\.345,00/.test(sin.tc), sin.n);
  await page._ctx.close();
  page = await abrir(true);
  r = await ev(page, () => { _conta(); var t=document.getElementById('tbl-conta');
    var ms=[].slice.call(t.querySelectorAll('x-pl'));
    var de=function(txt){ var m=ms.filter(function(x){ return x.textContent===txt; })[0]; return m ? { bs:!!m.querySelector('x-bs'), cv:(m.querySelector('x-cv')||{}).className, cvTxt:(m.querySelector('x-cv')||{}).textContent,
      num:getComputedStyle(m).fontVariantNumeric, bsTam:parseFloat(getComputedStyle(m.querySelector('x-bs')).fontSize), tam:parseFloat(getComputedStyle(m).fontSize) } : null; };
    return { n:ms.length, it:t.innerText, tc:t.textContent, met:document.getElementById('cta-metrics').innerText, a:de('Bs 12.345,00'), b:de('Bs 1.565,50') }; });
  chk('2a con bandera: los montos de la tabla dibujados', r.n>=6, r.n);
  chk('2b el texto que se lee es IDÉNTICO (innerText y textContent de la tabla y de las fichas)', r.it===sin.it && r.tc===sin.tc && r.met===sin.met, [r.it.length, sin.it.length]);
  chk('3a «Bs 12.345,00»: «Bs» más chico, «,00» suave, números de ancho fijo', r.a && r.a.bs && r.a.cv==='' && r.a.cvTxt===',00' && /tabular-nums/.test(r.a.num) && r.a.bsTam<r.a.tam, r.a);
  chk('3b «Bs 1.565,50»: el centavo de verdad con su color (pl-si)', r.b && r.b.cv==='pl-si' && r.b.cvTxt===',50', r.b);
  r = await ev(page, () => { var d=document.createElement('div'); d.innerHTML='<b>Bs 12.345</b> y <i>Bs -1.500,00</i> y Bs 7'; document.body.appendChild(d); plataEnNodo(d);
    var o={ txt:d.textContent, ms:[].map.call(d.querySelectorAll('x-pl'), function(x){ return [x.textContent, !!x.querySelector('x-cv')]; }) }; d.remove(); return o; });
  chk('3c sin centavos («Bs 12.345», de fmtBs0), negativo y un número suelto: dibujados, texto igual', r.txt==='Bs 12.345 y Bs -1.500,00 y Bs 7' && JSON.stringify(r.ms)===JSON.stringify([['Bs 12.345',false],['Bs -1.500,00',true],['Bs 7',false]]), r);

  console.log('\n── 4-5. El Cuadre, y donde no ──');
  r = await ev(page, () => { showView('conta'); segSet('cta-tab','cuadre'); setContaTab('cuadre');
    var p=document.getElementById('cta-pane-cuadre'), sola=[].slice.call(p.querySelectorAll('td.pl-sola')), col=[].slice.call(p.querySelectorAll('th.pl-col'));
    var mixta=[].filter.call(p.querySelectorAll('td'), function(td){ return td.querySelector('x-pl') && !td.classList.contains('pl-sola'); });
    return { sola:sola.length, al:sola.length ? getComputedStyle(sola[0]).textAlign : '', col:col.length, alTh:col.length ? getComputedStyle(col[0]).textAlign : '', mixta:mixta.length, mixtaAl:mixta.length ? getComputedStyle(mixta[0]).textAlign : '' }; });
  chk('4a el Cuadre: la celda que es solo un monto a la derecha, y el título de esa columna también', r.sola>0 && r.al==='right' && r.col>0 && r.alTh==='right', r);
  r = await ev(page, () => { var d=document.createElement('div');
    d.innerHTML='<svg><text>Bs 1.500,00</text></svg><button>Pagar Bs 200,00</button><select><option>Bs 300,00</option></select><input value="Bs 9,00"><span>Bs 50,00</span>';
    document.body.appendChild(d); var n1=plataEnNodo(d), n2=plataEnNodo(d);
    var o={ n1:n1, n2:n2, svg:d.querySelector('svg text').textContent, enSvg:!!d.querySelector('svg x-pl'), enBtn:!!d.querySelector('button x-pl'), enOpt:d.querySelector('option').textContent, xs:d.querySelectorAll('x-pl').length, anid:d.querySelectorAll('x-pl x-pl').length };
    d.remove(); return o; });
  chk('5 nunca en un SVG, un botón, un campo ni una opción; dos veces no envuelve dos veces', r.n1===1 && r.n2===0 && !r.enSvg && !r.enBtn && r.enOpt==='Bs 300,00' && r.xs===1 && r.anid===0 && r.svg==='Bs 1.500,00', r);
  await page._ctx.close();

  console.log('\n── 6. De a partes ──');
  page = await abrir(true, { k:60 });
  r = await ev(page, async () => { window.TROZOS_PRUEBA=true; _conta(); var t=document.getElementById('tbl-conta'); var a=t.querySelectorAll('tbody tr').length;
    var hay=!!t.querySelector('[data-trz]'); if(hay) trozosMas('conta'); await new Promise(function(x){ setTimeout(x, 50); });
    var filas=[].slice.call(t.querySelectorAll('tbody tr')).filter(function(tr){ return !tr.classList.contains('trz'); });
    var ult=filas[filas.length-1]; return { a:a, b:filas.length, hay:hay, ultX:!!(ult && ult.querySelector('x-pl')), ultTxt:ult ? /Bs \d/.test(ult.textContent) : false }; });
  chk('6 las filas que llegan después (de a partes) también van dibujadas', r.hay && r.b>r.a-1 && r.ultX && r.ultTxt, r);
  await page._ctx.close();

  console.log('\n── 7. Las fichas que cuentan ──');
  page = await abrir(true, { fx:true });
  r = await ev(page, async () => { var b=document.createElement('div'); b.className='metrics'; b.id='pl-met'; b.innerHTML=mc('#0f766e','Vendido','Bs 12.345,00','prueba'); document.getElementById('view-form').appendChild(b); showView('form');
    plataEnNodo(b); await new Promise(function(x){ setTimeout(x, 1500); });
    var v=b.querySelector('.mc-val'); return { x:!!v.querySelector('x-pl'), txt:v.textContent, cuento:!!v._fxCuenta }; });
  chk('7 una ficha que cuenta (D3) termina con el monto dibujado y el mismo texto', r.x && r.txt==='Bs 12.345,00', r);
  await page._ctx.close();

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
