/* 🧾 (§4nl, 27/10, Astra A10) El aviso de NÚMERO REPETIDO de Eduardo (§4ja, §4jd) partía el número por el guion: «08-230» eran dos
   números, «8» y «230», así que «08-231» avisaba por compartir el «8», y «08230» o «32.525» no avisaban contra «08-230» o «32525».
   Ahora el número va ENTERO (sin guiones, puntos ni espacios; sin ceros adelante) y lo que separa dos números es otra cosa (barra,
   coma, una palabra). Sigue igual a quién se compara: solo Eduardo, contra SUS pedidos, sin ATC/RPT y sin el propio pedido.
   Pedidos inventados, reloj clavado en el martes 27/10/2026.
   Se corre:  node tests/test_astra_nota.js        Dientes:  PEDIDOS=/ruta/a/pedidos_viejo.html node tests/test_astra_nota.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,300)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_u2_turno.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));
(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{ width:1440, height:900 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('dialog', d=>d.accept());
  await page.clock.setFixedTime(new Date('2026-10-27T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');
  const r = await page.evaluate(async()=>{
    var L=[_lin('CH1201|TITANIO ICE|160x190',1)], E='Eduardo Añez';
    var ped=function(id, nota, extra){ return _ped(id, '2026-10-30', 'AM', L, Object.assign({ vendedor:E, cliente:'MULTICENTER', nota:nota }, extra||{})); };
    /* Cada caso arma la planilla de nuevo: las notas que YA están y la que se escribe. Devuelve los ids que avisa. */
    var caso=async function(ya, nueva, opt){
      opt=opt||{};
      window._SRV.pedidos=ya; STOCK_CARGADO=false; await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok';
      closeModal(); showView('form'); resetForm();
      if(opt.editar){ editPedido(opt.editar); await new Promise(function(r){ setTimeout(r, 250); }); }   // editPedido termina de llenar un tic después
      var s=function(id,v){ var e=document.getElementById(id); e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); };
      s('f-vendedor', opt.vend||E); s('f-cliente','MULTICENTER'); s('f-nota', nueva);
      var L2=fxDupBuscar().map(function(d){ return d.p.id; });
      var porNota=fxDupBuscar().some(function(d){ return d.porNota; });
      resetForm();
      return { ids:L2, nota:porNota };
    };
    var o={};
    // Lo que daba mal (Astra A10)
    o.guion = await caso([ped('e1','08-230')], '08-231');
    o.compacto = await caso([ped('e1','08-230')], '08230');
    o.compactoAl = await caso([ped('e1','08230')], '08-230');
    o.punto = await caso([ped('e1','32.525')], '32525');
    o.puntoAl = await caso([ped('e1','32525')], '32.525');
    o.espacio = await caso([ped('e1','08 230')], '08-230');
    o.dosGuion = await caso([ped('e1','08-230 / 08-231')], '08-232');
    // Lo que tiene que seguir igual
    o.igual = await caso([ped('e1','08-230')], '08-230');
    o.ceros = await caso([ped('e1','32525')], '032525');
    o.barra = await caso([ped('e1','32525')], '32526 / 32525');
    o.coma = await caso([ped('e1','32526')], '32525, 32526');
    o.palabra = await caso([ped('e1','32525 y 32526')], '32526');
    o.letras = await caso([ped('e1','08-230')], 'PED 08-230');
    o.otraNota = await caso([ped('e1','08-230')], '09-230');
    o.deMaria = await caso([ped('e1','08-230', { vendedor:'Maria Flores', cliente:'CLIENTE MF' })], '08230');
    o.atc = await caso([ped('e1','08-230', { oc:'ATC 10-001' }), ped('e2','08-230', { oc:'RPT 10-001' })], '08230');
    o.propio = await caso([ped('e1','08-230'), ped('e2','11-111')], '08230', { editar:'e1' });
    o.maria = await caso([ped('e1','08-230')], '08230', { vend:'Maria Flores' });
    // El cartel del formulario dice el número tal cual se escribió
    window._SRV.pedidos=[ped('e1','08-230')]; STOCK_CARGADO=false; await refrescarEstado(); closeModal(); showView('form'); resetForm();
    var s=function(id,v){ var e=document.getElementById(id); e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); };
    s('f-vendedor',E); s('f-cliente','MULTICENTER'); s('f-nota','08230'); fxDupPintar();
    var el=document.getElementById('fx-dup'); o.cartel=el.hidden ? '' : el.innerText.replace(/\s+/g,' ');
    resetForm();
    return o;
  });
  const avisa=(x, id)=>x && x.nota && x.ids.indexOf(id||'e1')>=0;
  const calla=(x)=>x && !x.ids.length;
  console.log('\n── Lo que daba mal ──');
  chk('«08-231» con «08-230» ya cargada: NO es repetido (antes avisaba por el «8» que comparten)', calla(r.guion), r.guion);
  chk('«08230» con «08-230» ya cargada: es el MISMO número (antes no avisaba)', avisa(r.compacto), r.compacto);
  chk('«08-230» con «08230» ya cargada: también', avisa(r.compactoAl), r.compactoAl);
  chk('«32525» con «32.525» ya cargada: el punto no parte el número', avisa(r.punto), r.punto);
  chk('«32.525» con «32525» ya cargada: también', avisa(r.puntoAl), r.puntoAl);
  chk('«08-230» con «08 230» ya cargada: el espacio tampoco', avisa(r.espacio), r.espacio);
  chk('«08-232» con «08-230 / 08-231» ya cargada: no es ninguno de los dos', calla(r.dosGuion), r.dosGuion);
  console.log('\n── Lo que sigue igual ──');
  chk('el mismo «08-230»: avisa', avisa(r.igual), r.igual);
  chk('«032525» = «32525» (sin ceros adelante)', avisa(r.ceros), r.ceros);
  chk('(§4jd) «32526 / 32525» son dos números: avisa por el 32525', avisa(r.barra), r.barra);
  chk('«32525, 32526»: la coma también separa', avisa(r.coma), r.coma);
  chk('«32525 y 32526» ya cargada: «32526» avisa', avisa(r.palabra), r.palabra);
  chk('«PED 08-230»: las letras no cuentan', avisa(r.letras), r.letras);
  chk('«09-230» con «08-230»: otro número, nada', calla(r.guion) && calla(r.otraNota), r.otraNota);
  chk('(§4jd) un «08-230» de OTRA vendedora no choca con el de Eduardo', calla(r.deMaria), r.deMaria);
  chk('una ATC o una RPT de Eduardo con ese número no cuenta', calla(r.atc), r.atc);
  chk('al corregir el propio pedido no avisa contra sí mismo', calla(r.propio), r.propio);
  chk('solo Eduardo: una vendedora no recibe el aviso de la nota', !(r.maria && r.maria.nota), r.maria);
  chk('el cartel del formulario: «el número 08230 ya está en otro pedido tuyo» con la nota de ese pedido', /el número 08230 ya está en otro pedido tuyo/.test(r.cartel) && /Nota 08-230/.test(r.cartel), r.cartel);
  chk('sin errores en la página', errs.length===0, errs);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
