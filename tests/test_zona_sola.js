/* 📍 LA ZONA SE PONE SOLA CON LA UBICACIÓN (§4nr, 29/10; dueño, del muestrario 24-33: «30 tb»).
   Lo que cuida esta prueba: al pegar el enlace de Maps con «Zona» VACÍA se escribe la zona que repiten 2 o más pedidos a menos de 400 m
   (como más se escribe en la planilla), y si no hay, hacia dónde queda de la plaza (Centro/Norte/Sur/Este/Oeste); lejos de la ciudad, sin
   vecinos, queda vacía. Lo escrito a mano no se toca nunca; cambiar el enlace cambia solo la zona que puso el panel; «Quitar» la borra;
   los pines «aprox» (por la dirección escrita), las ventas de tienda y las RPT no cuentan; editar un pedido no cambia nada; sin
   `ZONA_PRUEBA` (Playwright) no hace nada.
   Reloj clavado: viernes 23/10/2026 15:00 de Bolivia.   Se corre:  node tests/test_zona_sola.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const HOY = '2026-10-23T15:00:00-04:00';
// Equipetrol: unos 3 km al noroeste de la plaza (-17.78363, -63.18212)
const EQ = { lat:-17.7650, lng:-63.1980 };
const L = (lat, lng, extra) => 'https://www.google.com/maps?q='+lat.toFixed(5)+','+lng.toFixed(5)+(extra||'');

function PREPARAR(a){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  loadFromServer=function(){};
  var n=0, V=function(o){ n++; return Object.assign({ id:'p'+n, oc:'10-'+(100+n), vendedor:'Maria Flores', cliente:'C '+n, celular:'7000000'+n, fecha:'2026-10-20', turno:'AM',
    productos:[{desc:'COLCHON SOFT',medida:'140x190',cant:1}], saldo:0, pagado:true, entregado:true, ts:new Date('2026-10-10T10:00:00-04:00').getTime(), rev:1, fotos:[] }, o); };
  var eq=a.EQ, m=function(dLat, dLng, x){ return 'https://www.google.com/maps?q='+(eq.lat+dLat).toFixed(5)+','+(eq.lng+dLng).toFixed(5)+(x||''); };
  STATE=[
    V({ zona:'Equipetrol', maps:m(0.0008, 0.0006) }),          // ~110 m
    V({ zona:'EQUIPETROL', maps:m(-0.0010, 0.0004) }),         // ~120 m
    V({ zona:'Norte', maps:m(0.0012, -0.0009) }),              // ~160 m (1 solo dice Norte)
    V({ zona:'Equipetrol', maps:m(0.0300, 0.0300) }),          // lejos: no cuenta
    V({ zona:'Plan 3000', maps:m(0.0001, 0.0001, '&aprox=1') }),  // ubicado por la dirección escrita: no cuenta
    V({ zona:'Plan 3000', maps:m(0.0002, -0.0001), oc:'RPT 10-001' }),  // RPT: no cuenta
    V({ zona:'NORTE', maps:'' }), V({ zona:'NORTE', maps:'' }), V({ zona:'Sur', maps:'' }),
    V({ zona:'Equipetrol', maps:'' })                          // la forma más escrita es «Equipetrol»
  ];
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  async function abrir(con){
    const ctx = await browser.newContext({ viewport:{ width:1440, height:900 }, timezoneId:'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r=>r.abort());
    const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.dismiss());
    if(con) await page.addInitScript(()=>{ window.ZONA_PRUEBA=1; });
    await page.clock.setFixedTime(new Date(HOY));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(350);
    await page.evaluate(PREPARAR, { EQ });
    await page.evaluate(() => { showView('form'); resetForm(); });
    return page;
  }
  const pegar = async (page, u) => { await page.fill('#f-maps', ''); await page.click('#f-maps'); await page.keyboard.insertText(u); await page.waitForTimeout(700); };
  const leer = page => page.evaluate(() => ({ z:document.getElementById('f-zona').value, nota:document.getElementById('f-zona-auto').hidden ? '' : document.getElementById('f-zona-auto').innerText }));

  // ---------- 1. Sin ZONA_PRUEBA no hace nada ----------
  let page = await abrir(false);
  await pegar(page, L(EQ.lat, EQ.lng));
  let r = await leer(page);
  chk('1a sin ZONA_PRUEBA la zona queda como estaba (vacía)', r.z==='' && r.nota==='', r);
  await page.context().close();

  page = await abrir(true);
  // ---------- 2. Dos vecinos que coinciden mandan ----------
  await pegar(page, L(EQ.lat, EQ.lng));
  r = await leer(page);
  chk('2a pone la zona de los pedidos de al lado (Equipetrol: 2 de 3)', r.z==='Equipetrol', r);
  chk('2b y dice por qué, con «Quitar»', /es la zona de 2 pedidos a menos de 400 m/.test(r.nota) && /Quitar/.test(r.nota), r.nota);
  chk('2c nombra la otra que hay cerca', /Norte \(1\)|NORTE \(1\)/.test(r.nota), r.nota);
  // ---------- 3. Cambiar el enlace cambia solo la que puso el panel ----------
  await pegar(page, L(-17.7400, -63.1830));          // ~4,9 km al norte de la plaza, sin vecinos
  r = await leer(page);
  chk('3a sin vecinos: hacia dónde queda de la plaza, como más se escribe («NORTE»)', r.z==='NORTE', r);
  chk('3b lo dice', /queda al norte de la plaza/.test(r.nota), r.nota);
  await pegar(page, L(-17.7840, -63.1830));          // a 100 m de la plaza
  r = await leer(page);
  chk('3c cerca de la plaza: Centro', /^centro$/i.test(r.z) && /queda en el centro, a 0,1 km de la plaza/.test(r.nota), r);
  await pegar(page, L(-17.8400, -63.1820));          // ~6 km al sur
  r = await leer(page);
  chk('3d al sur: «Sur»', r.z==='Sur', r);
  await pegar(page, L(-17.3400, -63.2500));          // Montero: lejos de la ciudad, sin vecinos
  r = await leer(page);
  chk('3e lejos de la ciudad y sin vecinos: la borra y avisa que no encontró', r.z==='' && /no encontré zona/.test(r.nota), r);
  // ---------- 4. Lo escrito a mano no se toca ----------
  await page.evaluate(() => { resetForm(); document.getElementById('f-zona').value='Mi barrio'; });
  await pegar(page, L(EQ.lat, EQ.lng));
  r = await leer(page);
  chk('4a con una zona escrita a mano no la cambia', r.z==='Mi barrio' && r.nota==='', r);
  await page.evaluate(() => { resetForm(); });
  await pegar(page, L(EQ.lat, EQ.lng));
  await page.click('#f-zona'); await page.keyboard.press('End'); await page.keyboard.type(' Norte');
  await pegar(page, L(-17.8400, -63.1820));
  r = await leer(page);
  chk('4b si la persona la corrigió, cambiar el enlace ya no la toca', r.z==='Equipetrol Norte' && r.nota==='', r);
  // ---------- 5. Quitar ----------
  await page.evaluate(() => { resetForm(); });
  await pegar(page, L(EQ.lat, EQ.lng));
  await page.click('#f-zona-auto button');
  r = await leer(page);
  chk('5a «Quitar» la deja vacía y se va el aviso', r.z==='' && r.nota==='', r);
  // ---------- 6. Los aprox, las RPT y las ventas de tienda no cuentan ----------
  r = await page.evaluate((EQ) => { var R=zonaCercaDe({ lat:EQ.lat+0.00015, lng:EQ.lng }, ''); return R; }, EQ);
  chk('6a ni el pin aproximado ni la RPT suman «Plan 3000»', r && r.zona==='Equipetrol' && !/Plan 3000/.test(JSON.stringify(r)), r);
  // ---------- 7. Editar un pedido no cambia la zona ----------
  r = await page.evaluate(async () => { var p=STATE[6]; p.maps='https://www.google.com/maps?q=-17.76500,-63.19800'; p.zona=''; EDIT_DESDE='admin'; editPedido(p.id);
    await new Promise(function(r){ setTimeout(r, 900); }); return { z:document.getElementById('f-zona').value, nota:document.getElementById('f-zona-auto').hidden }; });
  chk('7a abrir un pedido para editar (aunque tenga la zona vacía) no la llena solo', r.z==='' && r.nota===true, r);
  await page.context().close();

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
