/* 💵 GUARDAR PIDE EL SALDO O «SÍ, PAGADO» (26/10; dueño: «Sí, hacé que Guardar pida el saldo a los demás vendedores»).

   LO QUE CUIDA:
   1. Una venta (OC) de un vendedor en «NO», sin A cuenta y con el saldo en 0 NO se guarda: marca el saldo y lo dice.
   2. Con el saldo puesto, se guarda.
   3. Eduardo y ROHO (sin cobro obligatorio), los pedidos internos (FABRICA…), las ATC y las RPT no lo piden.
   4. Una venta que YA estaba guardada sin monto pregunta: Aceptar la guarda igual, Cancelar no.
   5. El paso «Cobro» y «Para guardar» dicen lo mismo que Guardar.
   6. En Playwright la regla va apagada salvo `window.SALDO_PRUEBA` (como `OBS_PRUEBA`).

   Reloj CLAVADO (martes 27/10/2026, 10:00 de Bolivia). Solo datos sintéticos.
   Se corre:  node tests/test_saldo_obligatorio.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1400, height:1000 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message));
  let respuesta = true, preguntas = [];
  page.on('dialog', d => { preguntas.push(d.message()); return respuesta ? d.accept() : d.dismiss(); });
  await ctx.route(/^https:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-27T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };

  await ev(async () => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    window.SALDO_PRUEBA=1;   // en Playwright la regla va apagada salvo con esto (las pruebas de siempre guardan ventas sin monto)
    CONNECTED=true; UNLOCKED=false; VENTA_TIENDA=false; try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    window._planilla=[];
    apiSave=function(rec){ window._planilla=window._planilla.filter(function(p){ return p.id!==rec.id; }); window._planilla.push(JSON.parse(JSON.stringify(rec))); return Promise.resolve({ ok:true, pedido:rec }); };
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window._planilla)) }); };
    STATE=[]; showView('form'); await new Promise(function(r){ setTimeout(r, 150); });
    /* Llena el formulario como una vendedora: `o.saldo`, `o.vend`, `o.tipo`. */
    window.__llenar=function(o){
      resetForm();
      if(o.tipo && o.tipo!=='OC'){ try{ segSet('f-doc-tipo', o.tipo); setDocTipo(); }catch(e){} }
      document.getElementById('f-vendedor').value=o.vend||'Carola Chavez'; applyVendedorLite();
      document.getElementById('f-cliente').value=o.cli||'CLIENTE PRUEBA';
      document.getElementById('f-celular').value='70000000';
      document.getElementById('f-zona').value='Norte';
      document.getElementById('f-direccion').value='Av. X';
      document.getElementById('f-nota').value=o.nota||'1234';
      document.getElementById('f-fecha').value='2026-10-28';
      var pd=document.querySelector('#f-productos .prod-desc'); pd.value='SOFT ICE';
      document.querySelector('#f-productos .prod-medida').value='140x190';
      document.querySelector('#f-productos .prod-cant').value='1';
      document.getElementById('f-saldo').value=o.saldo!=null ? String(o.saldo) : '0';
      document.getElementById('f-acuenta').value='0';
    };
    window.__guardar=async function(){
      var n=window._planilla.length, avisos=[], t0=window.toast; window.toast=function(m){ avisos.push(String(m)); };
      try{ submitPedido(); await new Promise(function(r){ setTimeout(r, 500); }); } finally { window.toast=t0; }
      return { guardo:window._planilla.length>n || (EDIT_ID==null && window._planilla.length>=n && avisos.some(function(a){ return /guardad/i.test(a); })),
               n:window._planilla.length, avisos:avisos, err:document.getElementById('f-saldo').classList.contains('err') };
    };
  });

  /* 1 · sin saldo no se guarda */
  const r1 = await ev(async () => {
    __llenar({ saldo:0 });
    var paso=fxPasosEstado()[3]; fxDerPintar && fxDerPintar();
    var der=(document.getElementById('fx-der')||{}).textContent||'';
    var n0=window._planilla.length, g=await __guardar();
    return { paso:paso, der:der, guardo:window._planilla.length>n0, avisos:g.avisos, err:g.err };
  });
  chk('1a. Carola, «NO» y saldo 0: Guardar NO guarda', r1.guardo===false, r1);
  chk('1b. marca el saldo en rojo y dice que ponga el saldo o «SÍ, pagado»', r1.err && r1.avisos.some(a=>/SALDO POR COBRAR/.test(a) && /SÍ, pagado/.test(a)), r1.avisos);
  chk('1c. el paso «Cobro» dice lo mismo (sin listo)', r1.paso===false, r1.paso);

  /* 2 · con saldo se guarda */
  const r2 = await ev(async () => {
    __llenar({ saldo:3000, cli:'CON SALDO' }); var paso=fxPasosEstado()[3];
    var n0=window._planilla.length; await __guardar();
    return { paso:paso, guardo:window._planilla.length===n0+1, p:(window._planilla.filter(function(p){ return p.cliente==='CON SALDO'; })[0]||{}).saldo };
  });
  chk('2. con el saldo puesto se guarda (y el paso «Cobro» queda listo)', r2.guardo && Number(r2.p)===3000 && r2.paso===true, r2);

  /* 3 · los que no lo piden */
  const r3 = await ev(async () => {
    var out={};
    var probar=async function(o){ __llenar(o); var n0=window._planilla.length; await __guardar(); return window._planilla.length===n0+1; };
    out.eduardo=await probar({ vend:'Eduardo Añez', saldo:0, cli:'DE EDUARDO' });
    __llenar({ vend:'FABRICA', saldo:0, cli:'INTERNO' }); out.interno=cobroSinMonto('FABRICA');
    __llenar({ tipo:'ATC', saldo:0 }); out.atc=cobroSinMonto('Carola Chavez');
    __llenar({ tipo:'RPT', saldo:0 }); out.rpt=cobroSinMonto('Carola Chavez');
    __llenar({ saldo:0 }); segSet('f-pagado','SI'); out.pagado=cobroSinMonto('Carola Chavez');
    __llenar({ saldo:0 }); out.carola=cobroSinMonto('Carola Chavez');
    return out;
  });
  chk('3a. Eduardo guarda sin saldo, como siempre', r3.eduardo===true, r3);
  chk('3b. un pedido interno (FABRICA), una ATC, una RPT y «SÍ, pagado» no piden el saldo', r3.interno===false && r3.atc===false && r3.rpt===false && r3.pagado===false && r3.carola===true, r3);

  /* 4 · una venta que ya estaba guardada sin monto pregunta */
  const r4 = await ev(async () => {
    var viejo={ id:'viejo1', oc:'09-050', nota:'777', cliente:'VIEJO SIN MONTO', celular:'7000001', fecha:'2026-10-28', turno:'AM', zona:'Norte', direccion:'Y',
      vendedor:'Carola Chavez', productos:[{ desc:'SOFT ICE', medida:'140x190', cant:1 }], saldo:0, acuenta:0, pagado:false, metodoPago:'', ts:Date.now()-86400000, rev:1 };
    window._planilla.push(JSON.parse(JSON.stringify(viejo))); STATE.push(JSON.parse(JSON.stringify(viejo)));
    editPedido('viejo1'); await new Promise(function(r){ setTimeout(r, 250); });
    document.getElementById('f-direccion').value='Calle nueva 123';
    return { sinMonto:ventaGuardadaSinMonto(findById('viejo1')), edit:EDIT_ID };
  });
  respuesta=false; preguntas=[];
  const r4a = await ev(async () => { var g=await __guardar(); return { avisos:g.avisos, dir:(window._planilla.filter(function(p){ return p.id==='viejo1'; })[0]||{}).direccion }; });
  const preg1=preguntas.slice();
  respuesta=true; preguntas=[];
  const r4b = await ev(async () => { await __guardar(); return { dir:(window._planilla.filter(function(p){ return p.id==='viejo1'; })[0]||{}).direccion }; });
  chk('4a. al editarla, una venta ya guardada sin monto se reconoce como tal', r4.sinMonto===true && r4.edit==='viejo1', r4);
  chk('4b. pregunta; con «Cancelar» no guarda y pide el saldo', preg1.some(p=>/SIN MONTO/.test(p)) && r4a.dir!=='Calle nueva 123', { preg1, r4a });
  chk('4c. con «Aceptar» la guarda igual', preguntas.some(p=>/SIN MONTO/.test(p)) && r4b.dir==='Calle nueva 123', { preguntas, r4b });

  /* 6 · sin SALDO_PRUEBA (las pruebas de siempre) guarda como antes */
  const r6 = await ev(async () => { window.SALDO_PRUEBA=0; __llenar({ saldo:0, cli:'PRUEBA VIEJA' }); var n0=window._planilla.length; await __guardar(); window.SALDO_PRUEBA=1; return window._planilla.length===n0+1; });
  chk('6. en Playwright sin `SALDO_PRUEBA` guarda como antes (las pruebas de siempre)', r6===true, r6);

  chk('sin errores en la página', !errores.length, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
