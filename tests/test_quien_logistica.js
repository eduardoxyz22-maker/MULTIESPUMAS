/* 🚚 QUE EL PANEL SEPA QUE ES LOGÍSTICA (15/11/2026, mejora 320; dueño: «320»).
   Del 10 al 14/11 la compu de logística firmó 50 ✅ como «FABRICA»: cargar un pedido interno dejaba ese nombre como «tu nombre».

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin `QUIEN_LOG_PRUEBA` nada cambia: `setVendedorMem('FABRICA')` lo guarda como siempre.
   2. Con la bandera: un nombre interno (FABRICA, ALBA, MORENO) no cambia «tu nombre»; un vendedor sí.
   3. `quienEdita`: un interno guardado de antes no cuenta; logística con nombre = «Logística · Ernesto».
   4. «¿Quién está usando el panel?»: «🚚 Soy logística» grande (y ya no el botón chico de abajo); en una compu nueva va ARRIBA; en la compu
      de una vendedora va debajo de «Sigo siendo…»; con «Entregó» seguido desde este aparato va arriba y lo dice. «Sigo siendo FABRICA» no.
   5. Elegirlo con el nombre: rol logística, el nombre guardado, «tu nombre» vacío, y el grito de las 16:00 ya lo ve (`semanaGritoVe`).
   6. El ✅ que se pone después dice «Logística · Ernesto» en su historia.
   Datos SINTÉTICOS. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_quien_logistica.js */
const { chromium } = require('playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
  const errores=[];
  const nueva = async (flags) => {
    const page = await ctx.newPage();
    page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
    await page.route(/^https?:/, r=>r.abort());
    await page.clock.setFixedTime(new Date('2026-11-05T10:00:00-04:00'));
    if(flags) await page.addInitScript(flags);
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(400);
    return page;
  };
  const ev = async (pg, fn, arg) => { try { return await pg.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  const limpiar = (pg) => ev(pg, () => { ['me_mis_vendedor','me_quien_rol','me_quien_log_nombre','me_aparato'].forEach(function(k){ localStorage.removeItem(k); }); try{ sessionStorage.removeItem('me_quien_ok'); }catch(e){} });

  console.log('\n── 1. Sin la bandera: como siempre ──');
  let p=await nueva(null); await limpiar(p);
  let r=await ev(p, () => { setVendedorMem('Mirian Salazar'); setVendedorMem('FABRICA'); return getVendedorMem(); });
  chk('setVendedorMem("FABRICA") lo guarda (comportamiento de siempre)', r==='FABRICA', r);
  await p.close();

  console.log('\n── 2-3. Los internos no cambian «tu nombre» ──');
  p=await nueva(() => { window.QUIEN_LOG_PRUEBA=1; }); await limpiar(p);
  r=await ev(p, () => {
    var out={};
    setVendedorMem('Mirian Salazar'); out.a=getVendedorMem();
    setVendedorMem('FABRICA'); out.b=getVendedorMem();
    setVendedorMem('ALBA'); setVendedorMem('MORENO'); out.c=getVendedorMem();
    setVendedorMem('Carola Chavez'); out.d=getVendedorMem();
    localStorage.setItem('me_mis_vendedor','FABRICA'); localStorage.removeItem('me_quien_rol'); out.e=quienEdita();
    localStorage.setItem('me_quien_rol','logistica'); localStorage.setItem('me_quien_log_nombre','Ernesto'); out.f=quienEdita();
    localStorage.removeItem('me_quien_log_nombre'); out.g=quienEdita();
    localStorage.setItem('me_mis_vendedor','Mirian Salazar'); out.h=quienEdita();
    return out;
  });
  chk('un vendedor se guarda', r.a==='Mirian Salazar' && r.d && /Carola/.test(r.d), r);
  chk('FABRICA, ALBA y MORENO no lo cambian', r.b==='Mirian Salazar' && r.c==='Mirian Salazar', r);
  chk('quienEdita: «FABRICA» guardado de antes no cuenta (sin rol: vacío)', r.e==='', r);
  chk('quienEdita: logística con nombre = «Logística · Ernesto»; sin nombre = «Logística»', r.f==='Logística · Ernesto' && r.g==='Logística', r);
  chk('quienEdita: una vendedora elegida sigue primero', r.h==='Mirian Salazar', r);
  await p.close();

  console.log('\n── 4. La ventana «¿Quién está usando el panel?» ──');
  p=await nueva(() => { window.QUIEN_LOG_PRUEBA=1; window.QUIEN_PRUEBA=1; }); await limpiar(p);
  r=await ev(p, () => {
    quienAbrir(false);
    var c=document.querySelector('#quien .quien-c'), kids=[].map.call(c.children, function(x){ return x.className; });
    var otros=document.querySelector('#quien .quien-otros').innerText;
    return { kids:kids, log:!!c.querySelector('.quien-log-b'), otros:otros, txt:c.innerText.replace(/\s+/g,' ') };
  });
  chk('compu nueva: «🚚 Soy logística» grande, ARRIBA (antes de los nombres)', r.log && r.kids.indexOf('quien-log')>=0 && r.kids.indexOf('quien-log')<r.kids.indexOf('quien-g'), r.kids);
  chk('el botón chico «Soy de logística» de abajo ya no está (Contabilidad y Administración sí)', !/logística/.test(r.otros) && /Contabilidad/.test(r.otros) && /Administración/.test(r.otros), r.otros);
  chk('tiene el campo «Tu nombre»', /Tu nombre/.test(r.txt) && !!(await ev(p, () => !!document.getElementById('quien-log-nom'))), r.txt.slice(0,200));
  r=await ev(p, () => {
    localStorage.setItem('me_mis_vendedor','Mirian Salazar'); quienAbrir(false);
    var c=document.querySelector('#quien .quien-c'), kids=[].map.call(c.children, function(x){ return x.className; });
    return kids;
  });
  chk('compu de una vendedora: «Sigo siendo Mirian» primero y «Soy logística» después', r.indexOf('quien-sigo')>=0 && r.indexOf('quien-log')>r.indexOf('quien-sigo'), r);
  r=await ev(p, () => {
    localStorage.setItem('me_mis_vendedor','FABRICA'); quienAbrir(false);
    return { sigo:!!document.querySelector('#quien .quien-sigo'), kids:[].map.call(document.querySelector('#quien .quien-c').children, function(x){ return x.className; }) };
  });
  chk('compu con «FABRICA» guardado: no ofrece «Sigo siendo FABRICA» y logística va arriba', !r.sigo && r.kids.indexOf('quien-log')>=0 && r.kids.indexOf('quien-log')<r.kids.indexOf('quien-g'), r);
  r=await ev(p, () => {
    localStorage.setItem('me_mis_vendedor','Mirian Salazar');
    var a=entAparato(), t=Date.now()-3600000;
    STATE=[1,2,3].map(function(i){ return { id:'x'+i, oc:'11-90'+i, cliente:'C'+i, fecha:todayStr(), turno:'AM', entregado:true, productos:[{ desc:'TITANIO', medida:'140x190', cant:1, eH:[{ v:1, t:t, q:'FABRICA', a:a, d:'Administración' }] }], ts:1, rev:1 }; });
    quienAbrir(false);
    var c=document.querySelector('#quien .quien-c');
    return { kids:[].map.call(c.children, function(x){ return x.className; }), txt:(c.querySelector('.quien-log-b')||{}).innerText||'' };
  });
  chk('la compu que marcó «Entregó» 3 veces esta semana: logística arriba de «Sigo siendo», y lo dice', r.kids.indexOf('quien-log')<r.kids.indexOf('quien-sigo') && /marcó «Entregó» 3 veces/.test(r.txt), r);

  console.log('\n── 5-6. Elegir logística con el nombre ──');
  r=await ev(p, async () => {
    STATE=[]; localStorage.setItem('me_mis_vendedor','FABRICA'); quienAbrir(false);
    var i=document.getElementById('quien-log-nom'); i.value='Ernesto';
    document.querySelector('#quien .quien-log-b').click();
    await new Promise(function(ok){ setTimeout(ok, 120); });
    return { cerr:document.getElementById('quien').hidden, rol:quienRol(), nom:quienLogNombre(), mem:getVendedorMem(), quien:quienEdita(), grito:semanaGritoVe() };
  });
  chk('elegir: cierra, rol logística, nombre Ernesto, «tu nombre» vacío', r.cerr && r.rol==='logistica' && r.nom==='Ernesto' && r.mem==='', r);
  chk('quienEdita = «Logística · Ernesto» y el grito de las 16:00 ya lo ve', r.quien==='Logística · Ernesto' && r.grito===true, r);
  r=await ev(p, () => {
    quienAbrir(false);
    var c=document.querySelector('#quien .quien-c');
    return { sigo:(c.querySelector('.quien-sigo')||{}).innerText||'', nom:(document.getElementById('quien-log-nom')||{}).value, grande:!!c.querySelector('.quien-log-b') };
  });
  chk('la próxima vez: «Sigo en Logística» y el nombre para cambiarlo (sin repetir el botón grande)', /Sigo en Logística/.test(r.sigo) && r.nom==='Ernesto' && !r.grande, r);
  r=await ev(p, () => { quienAbrir(true); return !!document.querySelector('#quien .quien-log-b'); });
  chk('con «¿No sos…?» (cambiar) el botón grande está', r===true, r);
  r=await ev(p, async () => {
    quienCerrar(); window.ENT_HIST_PRUEBA=1;
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    apiPost=function(pl){ var c=JSON.parse(JSON.stringify(pl)); if(c.action==='save'){ var q=Object.assign({}, c.pedido, { rev:(Number(c.pedido.rev)||0)+1 }); return Promise.resolve({ ok:true, pedido:q, mode:'update' }); } return Promise.resolve({ ok:true }); };
    STATE=[{ id:'q1', oc:'11-777', cliente:'CLIENTE Q', fecha:todayStr(), turno:'AM', vendedor:'Mirian Salazar', vehiculo:'Carry', chofer:'Omar', entregado:false, productos:[{ desc:'TITANIO LATEX', medida:'140x190', cant:1, chk:'ok' }], ts:1, rev:2, fotos:[] }];
    ENT_SRV['q1']=false;
    quickEntregado('q1'); await new Promise(function(ok){ setTimeout(ok, 200); });
    var H=entHistDe(findById('q1')); return H.length ? H[H.length-1].q : '(sin historia)';
  });
  chk('el ✅ que se pone después dice «Logística · Ernesto»', r==='Logística · Ernesto', r);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
