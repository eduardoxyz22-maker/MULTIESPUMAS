/* 🎧 LA PESTAÑA ATC CON EL ESTILO NUEVO + 🙈 PESTAÑA CHOFER ESCONDIDA (§4jz, 12/10). El dueño: «falta modernizar la pestaña de atc al
   nuevo estilo, elimina la pestaña choferes nadie la usa, o escóndela».
   Lo que cuida:
   1. La pestaña Chofer no se ve (el botón queda en el HTML, escondido) y la vista sigue andando con showView('chofer').
   2. Las fichas de ATC llevan su color y su dibujito; laten las que piden trabajo (Por recoger) y las demás no.
   3. 🛤️ El viaje cuenta cada paso SIN el filtro de estado y tocar un paso filtra la tabla por ese estado (y otra vez, lo saca).
   4. Los motivos son barras que se tocan para filtrar por motivo; «sin motivo» va al filtro de estado.
   5. Angosto (< 900): tarjetas con las cuatro fechas y los días; «Ver como tabla» se recuerda y la tabla sigue armándose.
   6. Sin errores ni scroll de costado en 390 px.
   Datos SINTÉTICOS, reloj clavado en el 12/10/2026. Se corre:  node tests/test_atc_4jz.js   (desde la raíz) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const ARCH='file://'+(process.env.PEDIDOS||path.resolve('pedidos.html'));
const FOTOS=process.env.FOTOS||'';

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; UNLOCKED=true; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  loadFromServer=function(){}; apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
  try{ localStorage.removeItem('me_atc_tabla'); }catch(e){}
  var n=0, ts=function(f){ return new Date(f+'T10:00:00-04:00').getTime(); };
  var A=function(f, cli, atc, extra){ n++; return Object.assign({ id:'t'+n, oc:'ATC 10-'+String(n).padStart(3,'0'), vendedor:'Mirian Salazar', cliente:cli, celular:'7000000'+n, fecha:f, turno:'AM',
    productos:[{ desc:'COLCHON TITANIO', medida:'140x190', cant:1, atc:atc }], ts:ts('2026-10-0'+Math.min(9,n)), entregado:false, fotos:[] }, extra||{}); };
  STATE=[
    A('2026-10-14','POR RECOGER UNO',{ mot:'Hundimiento' }),
    A('2026-10-15','POR RECOGER DOS',{ mot:'Ruido' }),
    A('2026-10-03','EN FABRICA',{ mot:'Hundimiento' }),
    A('2026-10-02','LISTA FABRICA',{ mot:'Costura', dev:'2026-10-08' }),
    A('2026-10-20','PROGRAMADA',{ mot:'Ruido', dev:'2026-10-09', pdev:'2026-10-20', pturno:'AM', rec:'2026-10-02' }),
    A('2026-10-05','ENTREGADA',{ mot:'Hundimiento', rf:'2026-10-07', ent:'2026-10-08' }),
    A('2026-10-04','SIN MOTIVO',{ })
  ];
  saveMirror();
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (w, h) => {
    const page = await browser.newPage({ viewport:{ width:w, height:h }, timezoneId:'America/La_Paz' });
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await page.route(/^https?:/, r => r.abort());
    await page.clock.setFixedTime(new Date('2026-10-12T11:00:00-04:00'));
    if(FOTOS) await page.emulateMedia({ reducedMotion:'reduce' });   // las fotos, sin animaciones a medias (el reloj está clavado)
    await page.goto(ARCH, { waitUntil:'load' }); await page.waitForTimeout(900);
    await page.evaluate(PREPARAR);
    await page.evaluate(() => { showView('atc'); segSet('atc-mode','todo'); renderAtc(); });
    await page.waitForTimeout(300);
    return page;
  };
  const ev=async (pg, fn, arg) => { try{ return await pg.evaluate(fn, arg); }catch(e){ return { __error:String(e.message||e).slice(0,300) }; } };

  console.log('\n── 1. La pestaña Chofer, escondida ──');
  const page=await abrir(1300, 1000);
  let r=await ev(page, () => { var b=document.getElementById('tab-chofer');
    var vis=[].filter.call(document.querySelectorAll('.nav button'), function(x){ return x.offsetParent!==null; }).map(function(x){ return x.id; });
    showView('chofer'); var anda=document.getElementById('view-chofer').classList.contains('active'); showView('atc'); renderAtc();
    return { existe:!!b, oculto:!!b && b.offsetParent===null, vis:vis, anda:anda }; });
  chk('el botón «Chofer» no se ve (queda en el HTML, escondido)', r.existe && r.oculto && r.vis.indexOf('tab-chofer')<0 && r.vis.length===5, r);
  chk('la vista del chofer sigue andando si alguien la abre', r.anda, r);

  console.log('\n── 2. Las fichas ──');
  r=await ev(page, () => { var cs=[].map.call(document.querySelectorAll('#atc-metrics .mc'), function(c){ return { t:(c.querySelector('.mc-lbl')||{}).textContent, vivo:c.classList.contains('cx-v'), dib:!!c.querySelector('.cx-esc svg'), late:c.classList.contains('cx-debe') }; }); return cs; });
  chk('cada ficha con su color y su dibujito', r.length>=5 && r.every(function(c){ return c.vivo && c.dib; }), r);
  chk('late «Por recoger» (hay 2) y no «Entregadas»', r.some(function(c){ return /Por recoger/.test(c.t) && c.late; }) && r.some(function(c){ return /Entregadas/.test(c.t) && !c.late; }), r);

  console.log('\n── 3. El viaje ──');
  r=await ev(page, () => {
    var leer=function(){ return [].map.call(document.querySelectorAll('#atv-viaje .atv-paso'), function(b){ return b.querySelector('b').textContent; }).join(','); };
    var antes=leer(), filas0=document.querySelectorAll('#tbl-atc tbody tr').length;
    document.querySelectorAll('#atv-viaje .atv-paso')[0].click();
    var est=document.getElementById('atc-estado').value, filas1=document.querySelectorAll('#tbl-atc tbody tr').length, despues=leer(), on=!!document.querySelector('#atv-viaje .atv-paso.on');
    document.querySelectorAll('#atv-viaje .atv-paso')[0].click();
    return { antes:antes, despues:despues, est:est, filas0:filas0, filas1:filas1, on:on, vuelve:document.getElementById('atc-estado').value, filas2:document.querySelectorAll('#tbl-atc tbody tr').length };
  });
  chk('cuenta cada paso: 2 por recoger, 2 en fábrica (la sin motivo ya se recogió), 1 lista, 0, 1 programada, 1 entregada', r.antes==='2,2,1,0,1,1', r);
  chk('tocar «Por recoger» filtra la tabla (2 de 7) y el viaje sigue contando todo', r.est==='sinrecoger' && r.filas0===7 && r.filas1===2 && r.despues===r.antes && r.on, r);
  chk('tocarlo otra vez saca el filtro', r.vuelve==='' && r.filas2===7, r);

  console.log('\n── 4. Los motivos ──');
  r=await ev(page, () => {
    var bs=[].slice.call(document.querySelectorAll('#atc-por-motivo .atv-mb')), txt=document.getElementById('atc-por-motivo').textContent;
    var hund=bs.filter(function(b){ return /Hundimiento/.test(b.textContent); })[0]; hund.click();
    var mot=document.getElementById('atc-motivo').value, filas=document.querySelectorAll('#tbl-atc tbody tr').length;
    document.querySelector('#atc-por-motivo .atv-mb.on').click(); var mot2=document.getElementById('atc-motivo').value;
    var sin=[].filter.call(document.querySelectorAll('#atc-por-motivo .atv-mb'), function(b){ return b.getAttribute('data-sin')==='1'; })[0]; sin.click();
    var est=document.getElementById('atc-estado').value, filasS=document.querySelectorAll('#tbl-atc tbody tr').length; document.getElementById('atc-estado').value=''; renderAtc();
    return { n:bs.length, primero:bs[0].textContent, txt:txt, mot:mot, filas:filas, mot2:mot2, est:est, filasS:filasS };
  });
  chk('una barra por motivo, la más larga primero (Hundimiento, 3)', r.n===4 && /Hundimiento/.test(r.primero) && /3/.test(r.primero), r);
  chk('tocar «Hundimiento» filtra por ese motivo (3) y otra vez lo saca', r.mot==='Hundimiento' && r.filas===3 && r.mot2==='', r);
  chk('tocar «sin motivo» va al filtro de estado «Sin motivo anotado» (1)', r.est==='sinmotivo' && r.filasS===1, r);
  if(FOTOS){ await page.evaluate(() => { document.getElementById('atc-metrics').scrollIntoView(); }); await page.screenshot({ path:FOTOS+'/atc_1300.png' }); }

  console.log('\n── 5. Angosto: tarjetas ──');
  const cel=await abrir(390, 844);
  r=await ev(cel, () => { var cs=document.querySelectorAll('#atv-cards .atv-c'), tw=document.getElementById('atv-tw');
    var c0=[].filter.call(cs, function(c){ return /ENTREGADA/.test(c.textContent); })[0];
    return { n:cs.length, tabla:document.querySelectorAll('#tbl-atc tbody tr').length, twOculta:tw.offsetParent===null, txt:c0?c0.innerText.replace(/\s+/g,' '):'',
      ancho:document.documentElement.scrollWidth, vista:innerWidth }; });
  chk('7 tarjetas y la tabla escondida pero armada (7 filas)', r.n===7 && r.tabla===7 && r.twOculta, r);
  chk('la tarjeta dice estado, cliente, motivo, las cuatro fechas y los días', /Entregada/.test(r.txt) && /Hundimiento/.test(r.txt) && /Entró/.test(r.txt) && /Al cliente/.test(r.txt) && /08\/10/.test(r.txt) && /\d+ d/.test(r.txt), r.txt);
  chk('sin scroll de costado en 390 px', r.ancho<=r.vista, r);
  if(FOTOS){ await cel.evaluate(() => { document.getElementById('atv-viaje').scrollIntoView(); }); await cel.screenshot({ path:FOTOS+'/atc_390.png' });
    await cel.evaluate(() => { document.getElementById('atv-cards').scrollIntoView(); }); await cel.screenshot({ path:FOTOS+'/atc_390b.png' }); }
  r=await ev(cel, async () => { var b=[].filter.call(document.querySelectorAll('#atv-cards button'), function(x){ return /Ver como tabla/.test(x.textContent); })[0]; b.click();
    await new Promise(function(res){ setTimeout(res, 50); });
    return { tw:document.getElementById('atv-tw').offsetParent!==null, cards:document.querySelectorAll('#atv-cards .atv-c').length, ls:localStorage.getItem('me_atc_tabla') }; });
  chk('«Ver como tabla» vuelve a la tabla y se recuerda en el aparato', r.tw && r.cards===0 && r.ls==='1', r);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e => { console.error(e); process.exit(1); });
