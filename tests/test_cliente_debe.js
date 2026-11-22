/* ⚠️ 465 · AL CARGAR: EL CLIENTE DEBE O TIENE UNA ATC ABIERTA (22/11; el dueño la eligió con la muestra de las ideas 441-470).

   LO QUE CUIDA:
   1. En un 📄 OC nuevo, al escribir el celular, si ese cliente debe otra venta YA entregada sale el cartel ámbar debajo del celular:
      «⚠️ Este cliente debe Bs 1.200 de la 10-288 (entregada el 14/10)», con «Ver» (abre esa venta encima del formulario).
   2. Una ATC sin cerrar del mismo celular: «tiene la ATC 11-004 abierta (desde el 03/11)».
   3. No cuentan: lo que todavía no se entregó, lo pagado, lo de Eduardo (mayorista), lo de un celular distinto.
   4. La venta de OTRA vendedora se dice con número y monto, sin «Ver»; con la contraseña, con «Ver».
   5. Al EDITAR la venta que debe, ella no cuenta (y otra deuda sí).
   6. No sale con vendedor Eduardo, ROHO o un interno, ni en una RPT; sin la bandera (Playwright) tampoco.
   7. Solo avisa: guardar el pedido no pregunta nada de esto.

   Reloj CLAVADO (viernes 20/11/2026, 10:00 de Bolivia). Solo datos sintéticos: el repo es público.
   Se corre:  node tests/test_cliente_debe.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=false;
  try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  window.CLI_DEBE_PRUEBA=1;
  var P=function(id, o){ return Object.assign({ id:id, oc:'10-'+id, vendedor:'Isabel Robledo', cliente:'CARMEN ORTIZ', celular:'71234567', zona:'Norte', maps:'', nota:'9',
    turno:'AM', fecha:'2026-10-14', productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:3000 }], saldo:0, acuenta:3000, pagado:true, metodoPago:'', ts:new Date('2026-10-10T10:00:00-04:00').getTime(), rev:1 }, o); };
  STATE=[
    P('288', { oc:'10-288', pagado:false, saldo:1200, acuenta:1800 }),                                              // debe 1.200, entregada el 14/10
    P('300', { oc:'11-300', fecha:'2026-11-25', pagado:false, saldo:900, acuenta:2100 }),                            // no se entregó todavía
    P('301', { oc:'10-301', pagado:true, saldo:0 }),                                                                 // pagada
    P('302', { oc:'10-302', vendedor:'Eduardo Añez', pagado:false, saldo:5000, acuenta:0 }),                         // mayorista
    P('303', { oc:'10-303', celular:'76543210', pagado:false, saldo:700, acuenta:0 }),                               // otro celular
    { id:'atc1', oc:'ATC 11-004', vendedor:'Isabel Robledo', cliente:'CARMEN ORTIZ', celular:'+591 71234567', fecha:'2026-11-23', turno:'AM', productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', cant:1 }],
      ts:new Date('2026-11-03T10:00:00-04:00').getTime(), rev:1 }
  ];
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  window._escribir=async function(cel, vend){
    var fv=document.getElementById('f-vendedor'); fv.value=vend||'Isabel Robledo'; fv.dispatchEvent(new Event('input', { bubbles:true }));
    var fc=document.getElementById('f-celular'); fc.value=cel; fc.dispatchEvent(new Event('input', { bubbles:true }));
    await _esperar(400);
    var el=document.getElementById('cli-debe');
    return { ver:!el.hidden, txt:el.hidden ? '' : el.innerText.replace(/\s+/g,' ').trim(), botones:el.querySelectorAll('.cli-debe-v').length };
  };
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1280, height:1000 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https:\/\//, r=>r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', e=>errores.push(e.message));
  const dialogos=[]; page.on('dialog', d=>{ dialogos.push(d.message()); d.dismiss(); });
  await page.clock.setFixedTime(new Date('2026-11-20T10:00:00-04:00'));
  await page.goto('file://'+PEDIDOS);
  await page.waitForTimeout(900);
  await page.evaluate(PREPARAR);

  let r = await page.evaluate(async ()=>{ showView('form'); resetForm(); return await _escribir('712 34 567'); });
  chk('1a · al escribir el celular sale «⚠️ Este cliente debe Bs 1.200 de la 10-288 (entregada el 14/10)»', r.ver && /Este cliente debe Bs 1\.200 de la 10-288 \(entregada el 14\/10\)/.test(r.txt), r);
  chk('2 · …y «la ATC 11-004 abierta (desde el 03/11)»', /la ATC 11-004 abierta \(desde el 03\/11\)/.test(r.txt), r);
  chk('3 · no cuentan lo que no se entregó (11-300), lo pagado (10-301), lo de Eduardo (10-302) ni otro celular (10-303)', !/11-300|10-301|10-302|10-303/.test(r.txt), r.txt);
  chk('1b · con «Ver» en las dos (son de ella)', r.botones===2, r);
  r = await page.evaluate(async ()=>{
    document.querySelector('#cli-debe .cli-debe-v').click(); await _esperar(150);
    var on=document.getElementById('modal').classList.contains('on'), t=document.getElementById('modal-box').innerText;
    closeModal(); await _esperar(50);
    return { on:on, deEsa:/10-288/.test(t), cel:document.getElementById('f-celular').value, vista:document.getElementById('view-form').classList.contains('active') };
  });
  chk('1c · «Ver» abre esa venta encima y al cerrarla el formulario sigue igual', r.on && r.deEsa && r.cel==='712 34 567' && r.vista, r);

  // 4 · otra vendedora
  r = await page.evaluate(async ()=>{ resetForm(); return await _escribir('71234567', 'Maria Flores'); });
  chk('4a · para otra vendedora: el número y el monto, «· de otra vendedora» y sin «Ver»', r.ver && /debe Bs 1\.200 de la 10-288/.test(r.txt) && /de otra vendedora/.test(r.txt) && r.botones===0, r);
  r = await page.evaluate(async ()=>{ UNLOCKED=true; resetForm(); var x=await _escribir('71234567', 'Maria Flores'); UNLOCKED=false; return x; });
  chk('4b · con la contraseña, con «Ver»', r.botones===2, r);

  // 5 · editando la que debe
  r = await page.evaluate(async ()=>{
    STATE.push({ id:'289', oc:'10-289', vendedor:'Isabel Robledo', cliente:'CARMEN ORTIZ', celular:'71234567', fecha:'2026-10-20', turno:'PM', productos:[{ desc:'SOMIER', medida:'160x190', cant:1, precio:2000 }],
      saldo:350.5, acuenta:1649.5, pagado:false, metodoPago:'', ts:new Date('2026-10-18T10:00:00-04:00').getTime(), rev:1 });
    resetForm(); editPedido('288'); await _esperar(500);
    var el=document.getElementById('cli-debe'); return { ver:!el.hidden, txt:el.innerText.replace(/\s+/g,' ') };
  });
  chk('5 · al editar la 10-288 no se cuenta a sí misma; la otra deuda (10-289, Bs 350,50) sí', r.ver && !/10-288/.test(r.txt) && /debe Bs 350,50 de la 10-289 \(entregada el 20\/10\)/.test(r.txt), r);

  // 6 · Eduardo, ROHO, interno, RPT y la bandera
  r = await page.evaluate(async ()=>{
    resetForm();
    var edu=await _escribir('71234567', 'Eduardo Añez'), roho=await _escribir('71234567', 'ROHO'), alba=await _escribir('71234567', 'ALBA');
    resetForm(); segSet('f-doc-tipo','RPT'); try{ pintarDocTipo(true); }catch(e){} var rpt=await _escribir('71234567', 'Isabel Robledo');
    resetForm(); window.CLI_DEBE_PRUEBA=0; var off=await _escribir('71234567', 'Isabel Robledo'); window.CLI_DEBE_PRUEBA=1;
    return { edu:edu.ver, roho:roho.ver, alba:alba.ver, rpt:rpt.ver, off:off.ver };
  });
  chk('6 · nada con Eduardo, ROHO, un interno, en una RPT ni sin la bandera', !r.edu && !r.roho && !r.alba && !r.rpt && !r.off, r);

  // 7 · solo avisa: los datos no cambian nada del guardado (cliDebeDatos es pura)
  r = await page.evaluate(()=>{ var antes=JSON.stringify(STATE); var D=cliDebeDatos('71234567', ''); return { igual:antes===JSON.stringify(STATE), n:D.deudas.length, bs:D.bs, atc:D.atcs.length }; });
  chk('7 · la cuenta solo lee (no toca la planilla): 2 deudas, Bs 1.550,50 y 1 ATC', r.igual && r.n===2 && Math.abs(r.bs-1550.5)<0.005 && r.atc===1, r);
  chk('sin preguntas del navegador ni errores de la página', dialogos.length===0 && errores.length===0, { dialogos:dialogos, errores:errores.slice(0,3) });
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
