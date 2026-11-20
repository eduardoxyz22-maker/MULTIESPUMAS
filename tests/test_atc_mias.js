/* 👤 CADA VENDEDORA VE SOLO SUS ATC (20/11; dueño: «los vendedores solo deberían ver SUS ATC que ellos cargan»).
   1. Con Carola elegida (sin contraseña ni rol de Logística/Administración/Contabilidad) la pestaña ATC lista solo las suyas, y las fichas
      de arriba cuentan solo las suyas; el cartel dice «Ves solo tus ATC».
   2. Sin nadie elegido no se lista ninguna y el cartel pide elegir el nombre.
   3. Ven todas: la contraseña, Logística, Administración, Contabilidad y Eduardo (sin cartel).
   Falla contra lo de antes (`atcSoloDe` no existe). Reloj clavado el 20/11/2026 10:00 de Bolivia. Datos inventados.
   Se corre:  node tests/test_atc_mias.js   · `PEDIDOS=<archivo>` corre contra otra página. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ if(e && e.error) c=false; c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const page = await browser.newPage({ viewport:{ width:1400, height:950 }, timezoneId:'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.install({ time:new Date('2026-11-20T10:00:00-04:00') });
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.clock.runFor(1500);
  const ev = (fn, arg) => page.evaluate(fn, arg).catch(e => ({ error:String(e.message||e).slice(0,300) }));
  await ev(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=false; SERVER_AUTH='abierto';
    if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    CARGA_GEN++; CARGA_ESTADO='ok';
    apiPost=function(p){ return Promise.resolve(p && p.action==='list' ? { ok:true, pedidos:STATE } : { ok:true, pedido:p.pedido }); };
    apiList=function(){ return apiPost({ action:'list' }); };
    window.ATC_MIAS_PRUEBA=true;
    try{ localStorage.removeItem('me_adm_dev'); }catch(e){}
    var A=function(id, oc, v){ return { id:id, fecha:'2026-11-23', oc:oc, vendedor:v, cliente:'CLIENTE '+id, celular:'7000000'+id.length, turno:'AM', zona:'NORTE',
      direccion:'CALLE 1', maps:'', pagado:false, saldo:0, ts:Date.parse('2026-11-18T10:00:00-04:00'), metodoPago:'', observaciones:'', estado:'', entregado:false,
      vehiculo:'', chofer:'', garantia:'', nota:'', acuenta:0, facturarA:'', nit:'', nroDia:1, verificado:false, fotos:[],
      productos:[{ desc:'COLCHON TITANIO ICE', medida:'140x190', cant:1, atc:{ tipo:'gar', motivo:'Hundimiento', compra:'2026-03-10' } }] }; };
    STATE=[ A('a1','ATC 11-001','Carola Chavez'), A('a2','ATC 11-002','Carola Chávez'), A('a3','ATC 11-003','Maria Flores'), A('a4','ATC 11-004','Isabel Robledo') ];
    saveMirror(); showView('atc');
    var m=document.getElementById('atc-mes'); if(m) m.value='2026-11';
  });
  const mirar = () => ev(() => { renderAtc(); var b=document.getElementById('atc-solo');
    return { ocs:atcLista().map(function(p){ return p.oc; }), cartel:(b && !b.hidden) ? b.textContent : '' }; });

  let r = await ev(() => { quienRol(''); setVendedorMem('Carola Chavez'); });
  r = await mirar();
  chk('Carola ve solo sus dos ATC (también la escrita con tilde)', JSON.stringify(r.ocs.slice().sort())==='["ATC 11-001","ATC 11-002"]', r);
  chk('…y el cartel le dice que ve solo las suyas', /Ves solo tus ATC/.test(r.cartel) && /Carola/.test(r.cartel), r.cartel);

  await ev(() => { setVendedorMem('Maria Flores'); }); r = await mirar();
  chk('Maria ve solo la suya', JSON.stringify(r.ocs)==='["ATC 11-003"]', r);

  await ev(() => { setVendedorMem(''); quienRol(''); }); r = await mirar();
  chk('sin nadie elegido no se lista ninguna y el cartel pide el nombre', r.ocs.length===0 && /elegí tu nombre/i.test(r.cartel), r);

  for (const [lbl, fn] of [
    ['Logística', () => { setVendedorMem(''); quienRol('logistica'); }],
    ['Administración', () => { setVendedorMem(''); quienRol('admin'); }],
    ['Contabilidad', () => { setVendedorMem(''); quienRol('conta'); }],
    ['la contraseña', () => { quienRol(''); setVendedorMem('Carola Chavez'); UNLOCKED=true; }],
    ['Eduardo', () => { UNLOCKED=false; quienRol(''); setVendedorMem('Eduardo Añez'); }] ]) {
    await page.evaluate(fn); r = await mirar();
    chk(lbl+' ve las cuatro, sin cartel', r.ocs.length===4 && !r.cartel, r);
  }

  chk('sin errores de página', errores.length===0, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
