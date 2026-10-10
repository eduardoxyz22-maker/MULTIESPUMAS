/* 💵 DE DÓNDE SALE LO VENDIDO (§4je, 10/10; dueño: «en Heaven vendido + falta por cobrar no me coincide con lo "vendido en"
   proyección» → «hazlo»). Pedidos inventados, reloj clavado en el sábado 10/10/2026 a las 10:00 de Bolivia.
     1. Vendido para el mes = cobrado en el mes + cobrado antes + falta (cargadas en el mes / antes) + pagadas sin monto − de más.
     2. Las MISMAS ventas que la ficha de la Proyección (vendido de la marca).
     3. Lo que entró en el mes = cobrado en el mes de estas ventas + cobros del mes de OTRAS ventas + fletes: la ficha del Cuadre.
     4. Se ve en la pestaña Proyección, entra en el iPad parado (820 px) sin errores.
   Se corre:  node tests/test_pry_plata.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{ width:820, height:1100 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.setFixedTime(new Date('2026-10-10T10:00:00-04:00'));
  await page.goto('file://'+PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(300);
  const r = await page.evaluate(()=>{
    try{ CARGA_GEN++; CARGA_ESTADO='ok'; clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    CONNECTED=true; UNLOCKED=true;
    var ts=function(f){ return new Date(f+'T10:00:00-04:00').getTime(); };
    var P=function(o){ return Object.assign({ cliente:'C', productos:[{ desc:'COLCHON SOFT', medida:'140x190', cant:1, precio:o.tot||0 }], turno:'AM', pagado:false }, o); };
    STATE=[
      // A · Heaven, cargada en septiembre, entrega 15/10, adelanto 1.000 el 28/09, falta 3.000
      P({ id:'a', oc:'09-100', vendedor:'Maria Flores', fecha:'2026-10-15', ts:ts('2026-09-28'), tot:4000, acuenta:1000, saldo:3000, metodoPago:'~Efectivo 1000 @2026-09-28 #1' }),
      // B · Heaven, cargada en octubre, entrega 12/10, adelanto 500 el 02/10, falta 1.500
      P({ id:'b', oc:'10-001', vendedor:'Isabel Robledo', fecha:'2026-10-12', ts:ts('2026-10-02'), tot:2000, acuenta:500, saldo:1500, metodoPago:'~QR BISA 500 @2026-10-02 #2' }),
      // C · Heaven, cargada en octubre, pagada entera el 03/10 + flete de 100 cobrado el 05/10
      P({ id:'c', oc:'10-002', vendedor:'Mirian Salazar', fecha:'2026-10-06', ts:ts('2026-10-03'), tot:3000, acuenta:3000, saldo:0, pagado:true, metodoPago:'~Efectivo 3000 @2026-10-03 #3 + ^Efectivo 100 @2026-10-05 #3' }),
      // D · Heaven, entregada en SEPTIEMBRE, saldo de 800 cobrado el 01/10 (otra venta, entra en el Cuadre de octubre)
      P({ id:'d', oc:'09-090', vendedor:'Maria Flores', fecha:'2026-09-29', ts:ts('2026-09-20'), tot:2800, acuenta:2000, saldo:0, pagado:true, metodoPago:'~Efectivo 2000 @2026-09-20 #4 + Efectivo 800 @2026-10-01 #5' }),
      // E · Sueña, cargada en octubre, entrega 20/10, sin adelanto
      P({ id:'e', oc:'10-003', vendedor:'Fernando Peinado', fecha:'2026-10-20', ts:ts('2026-10-04'), tot:1500, acuenta:0, saldo:1500, metodoPago:'' }),
      // F · Eduardo (mayorista): no es del equipo
      P({ id:'f', oc:'10-004', vendedor:'Eduardo Añez', cliente:'MULTICENTER', fecha:'2026-10-11', ts:ts('2026-10-05'), tot:9000, acuenta:0, saldo:9000, metodoPago:'' }),
      // G · FABRICA (pedido interno, §4jd): no es venta
      P({ id:'g', oc:'10-005', vendedor:'FABRICA', fecha:'2026-10-13', ts:ts('2026-10-05'), tot:0, acuenta:0, saldo:0, metodoPago:'' })
    ];
    var G=pryPlata('2026-10'), R=proyeccionMes('2026-10'), H=G.heaven, S=G.suena;
    var fichaH=R.marcas.filter(function(m){ return m.g.k==='heaven'; })[0].tot.vendido, fichaS=R.marcas.filter(function(m){ return m.g.k==='suena'; })[0].tot.vendido;
    var cierra=function(g){ return Math.abs(r2(g.mes+g.antes+g.despues+g.sinF+g.faltaMes+g.faltaAntes+g.sinMonto-g.deMas)-g.vendido)<0.01; };
    // la ficha del Cuadre de octubre (misma cuenta que `totalPorMarca(cuadrePagos())` con el mes de octubre)
    var M={heaven:0,suena:0}; STATE.forEach(function(p){ if(fueraDeConta(p)) return; contaPagos(p).forEach(function(c){ var f=c.fecha||''; if((Number(c.monto)||0)>0 && f>='2026-10-01' && f<='2026-10-31'){ var k=marcaDe(p.vendedor); if(M[k]!=null) M[k]=r2(M[k]+Number(c.monto)); } }); });
    showView('conta'); try{ segSet('cta-tab','proy'); setContaTab('proy'); }catch(e){}
    var inp=document.getElementById('pry-mes'); if(inp){ inp.value='2026-10'; } renderProyeccion();
    var box=document.getElementById('pry-plata-box');
    return { H:H, S:S, E:G.equipo, fichaH:fichaH, fichaS:fichaS, cierraH:cierra(H), cierraS:cierra(S), cierraE:cierra(G.equipo), M:M,
      txt:box?box.innerText.replace(/\s+/g,' '):'', ancho:box?{ sw:box.scrollWidth, cw:box.clientWidth, doc:document.documentElement.scrollWidth }:null };
  });
  chk('1. Heaven: vendido 9.000 = cobrado en octubre 3.500 + antes 1.000 + falta 1.500 (cargada en oct.) + 3.000 (cargada antes)',
      r.H.vendido===9000 && r.H.mes===3500 && r.H.antes===1000 && r.H.faltaMes===1500 && r.H.faltaAntes===3000 && r.cierraH, r.H);
  chk('…Sueña y el equipo también cierran (Eduardo y FABRICA no entran)', r.cierraS && r.cierraE && r.S.vendido===1500 && r.S.faltaMes===1500 && r.E.vendido===10500, { S:r.S, E:r.E });
  chk('2. lo vendido es el MISMO de la ficha de la Proyección', r.H.vendido===r.fichaH && r.S.vendido===r.fichaS, { fichaH:r.fichaH, fichaS:r.fichaS });
  chk('3. lo que entró en octubre = 3.500 + 800 de otra venta + 100 de flete = 4.400 = la ficha Heaven del Cuadre', r.H.caja===4400 && r.H.otrasMes===800 && r.H.fleteMes===100 && r.H.caja===r.M.heaven && r.S.caja===r.M.suena, { H:r.H, M:r.M });
  chk('4. se ve en la Proyección con la cuenta y la vuelta al Cuadre', /De dónde sale lo vendido/i.test(r.txt) && /Cobrado ANTES/i.test(r.txt) && /Por cobrar/i.test(r.txt) && /Lo que entró en octubre/i.test(r.txt), r.txt.slice(0,400));
  chk('…entra en el iPad parado (820 px) sin correr la página de costado', r.ancho && r.ancho.doc<=820, r.ancho);
  chk('ningún error de JavaScript', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
