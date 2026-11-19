/* 📅 EL MES DE LA PESTAÑA ATC = LAS QUE ENTRARON ESE MES (13/11/2026; el dueño: «filtro ATC por mes para ver los "problemas" del mes y me muestra
   ATC desde agosto… ¿no funciona el filtro o qué onda?»).
   Lo que cuida:
   1. Con «Mes» en noviembre se ven SOLO las ATC que entraron en noviembre: fichas, el viaje, los motivos y la tabla.
   2. La ficha «ATC en el período» dice cuántas abiertas de meses anteriores hay y se toca para sumarlas (lo de §4ea: el trabajo que
      quedó de antes); con eso se ven «incluye N de meses anteriores sin cerrar», y otro toque vuelve a solo noviembre.
   3. Las cerradas de antes nunca entran al mes; «Todo» sigue mostrando todas.
   4. La elección se recuerda en el aparato (me_atc_viejas).
   Datos SINTÉTICOS, reloj clavado en el 13/11/2026. Se corre:  node tests/test_atc_mes.js   (desde la raíz) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const ARCH='file://'+(process.env.PEDIDOS||path.resolve('pedidos.html'));

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; UNLOCKED=true; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  loadFromServer=function(){}; apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
  try{ localStorage.removeItem('me_atc_tabla'); localStorage.removeItem('me_atc_viejas'); }catch(e){}
  var n=0;
  var A=function(entro, f, cli, atc){ n++; var mm=entro.slice(5,7); return { id:'t'+n, oc:'ATC '+mm+'-'+String(n).padStart(3,'0'), vendedor:'Mirian Salazar', cliente:cli, celular:'7000000'+n, fecha:f, turno:'AM',
    productos:[{ desc:'COLCHON TITANIO', medida:'140x190', cant:1, atc:atc }], ts:new Date(entro+'T10:00:00-04:00').getTime(), entregado:false, fotos:[] }; };
  STATE=[
    A('2026-08-20','2026-08-25','AGOSTO ABIERTA',{ mot:'Hundimiento' }),
    A('2026-09-10','2026-09-12','SEPTIEMBRE CERRADA',{ mot:'Ruido', rf:'2026-09-20', ent:'2026-09-25' }),
    A('2026-10-05','2026-10-08','OCTUBRE ABIERTA',{ mot:'Costura' }),
    A('2026-11-03','2026-11-17','NOVIEMBRE UNO',{ mot:'Hundimiento' }),
    A('2026-11-06','2026-11-18','NOVIEMBRE DOS',{ mot:'Otro' }),
    A('2026-11-10','2026-11-12','NOVIEMBRE CERRADA',{ mot:'Hundimiento', rf:'2026-11-11', ent:'2026-11-12' })
  ];
  saveMirror();
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const page = await browser.newPage({ viewport:{ width:1300, height:1000 }, timezoneId:'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-11-13T11:00:00-04:00'));
  await page.goto(ARCH, { waitUntil:'load' }); await page.waitForTimeout(900);
  await page.evaluate(PREPARAR);
  const mira = () => page.evaluate(() => {
    var fichas=[].slice.call(document.querySelectorAll('#atc-metrics .mc')).map(function(f){ return f.innerText.replace(/\s+/g,' '); });
    var f1=document.querySelector('#atc-metrics .mc');
    var filas=[].slice.call(document.querySelectorAll('#tbl-atc tbody tr')).map(function(t){ return t.innerText.replace(/\s+/g,' '); });
    return { f1:fichas[0]||'', toca:!!(f1 && f1.classList.contains('mc-toca')), filas:filas, mot:(document.getElementById('atc-por-motivo')||{}).innerText||'',
      viaje:atcLista(true).length, lista:atcLista().map(function(p){ return p.cliente; }) };
  });
  await page.evaluate(() => { showView('atc'); segSet('atc-mode','mes'); document.getElementById('atc-mes').value='2026-11'; renderAtc(); });
  await page.waitForTimeout(250);
  let r=await mira();
  chk('1 · noviembre: solo las 3 que entraron en noviembre (sin la de agosto ni la de octubre abiertas)', r.lista.length===3 && r.lista.every(function(c){ return /NOVIEMBRE/.test(c); }), r.lista);
  chk('1 · la tabla y el viaje, también solo noviembre', r.filas.length===3 && !r.filas.some(function(t){ return /AGOSTO|OCTUBRE|SEPTIEMBRE/.test(t); }) && r.viaje===3, [r.filas.length, r.viaje]);
  chk('1 · los motivos cuentan solo noviembre: Hundimiento 2', /HUNDIMIENTO[\s\S]*2 \(67%\)/i.test(r.mot) && !/COSTURA/i.test(r.mot), r.mot);
  chk('2 · la ficha dice «entraron en noviembre · hay 2 abiertas de meses anteriores» y se toca', /ATC EN EL PERÍODO 3 entraron en noviembre · hay 2 abiertas de meses anteriores/i.test(r.f1) && r.toca && /Tocá para sumar las 2 abiertas de antes/.test(r.f1), r.f1);
  await page.click('#atc-metrics .mc'); await page.waitForTimeout(200);
  r=await mira();
  chk('2 · tocarla suma las abiertas de antes (agosto y octubre), nunca la cerrada de septiembre', r.lista.length===5 && r.lista.indexOf('AGOSTO ABIERTA')>=0 && r.lista.indexOf('OCTUBRE ABIERTA')>=0 && r.lista.indexOf('SEPTIEMBRE CERRADA')<0, r.lista);
  chk('2 · …y lo dice: «incluye 2 de meses anteriores sin cerrar · Tocá para ver solo las que entraron en noviembre»', /incluye 2 de meses anteriores sin cerrar/.test(r.f1) && /Tocá para ver solo las que entraron en noviembre/.test(r.f1), r.f1);
  const guardado=await page.evaluate(() => localStorage.getItem('me_atc_viejas'));
  chk('4 · se recuerda en el aparato', guardado==='1', guardado);
  await page.click('#atc-metrics .mc'); await page.waitForTimeout(200);
  r=await mira();
  chk('2 · otro toque vuelve a solo noviembre', r.lista.length===3 && /entraron en noviembre/.test(r.f1), [r.lista, r.f1]);
  await page.evaluate(() => { segSet('atc-mode','todo'); renderAtc(); }); await page.waitForTimeout(150);
  r=await mira();
  chk('3 · «Todo» muestra las 6, sin tocar nada', r.lista.length===6 && !r.toca && /atenciones al cliente/.test(r.f1), [r.lista.length, r.f1]);
  await page.evaluate(() => { segSet('atc-mode','mes'); document.getElementById('atc-mes').value='2026-08'; renderAtc(); }); await page.waitForTimeout(150);
  r=await mira();
  chk('3 · agosto (sin nada abierto de antes): la ficha no ofrece sumar', r.lista.length===1 && !r.toca && /entraron en agosto/.test(r.f1), [r.lista, r.f1]);
  chk('sin errores de la página', errores.length===0, errores);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
