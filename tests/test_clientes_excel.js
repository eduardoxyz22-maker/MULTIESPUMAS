/* 📇 CLIENTES PARA EXCEL (14/10). El dueño: «necesito un botón para exportar Excel en administración que saque estos datos por mes,
   o todo, y elegir de qué vendedores (sí, en plural): nombre del cliente, número de celular, valor de la compra (en caso que comprara
   más de un producto podemos repetir el contacto o sumar el valor de las compras que hizo)».

   ⚠️ LO QUE ESTA PRUEBA CUIDA (contra lo publicado, `3e2dd38`, no existe el botón):
   1. El botón «📇 Clientes (Excel)» está en «Stock y ventas» de Administración y abre su ventana, con todos los vendedores tildados
      (sin los pedidos internos: ALBA, FABRICA…).
   2. Un mes: solo las ventas cargadas ese mes; «Todo»: todas.
   3. Sin ATC, reposiciones (RPT), pedidos internos, borradores de Kommo ni filas del sistema; las ventas de tienda sí.
   4. «Sumar sus compras»: un renglón por cliente, juntado por celular (aunque esté escrito distinto) y con la suma; sin celular, por nombre.
      «Repetir el contacto»: una fila por compra.
   5. Elegir vendedores (varios) filtra; «Ninguno» no deja bajar nada.
   6. El valor es el TOTAL VENTA de Contabilidad; una venta «pagada sin monto» usa la suma de sus precios.
   7. El Excel lleva CLIENTE, CELULAR y VALOR primero (el valor como número), el celular como texto, y el nombre dice mes y vendedores.
   Datos SINTÉTICOS. Reloj clavado en el miércoles 14/10/2026.
   Se corre:  node tests/test_clientes_excel.js   (desde la raíz del repo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,700)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  var q=document.getElementById('quien'); if(q) q.hidden=true;
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR=''; ULTIMO_REFRESCO=Date.now();
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  loadFromServer=function(){};
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
  apiSave=function(p){ return Promise.resolve({ ok:true, pedido:p }); };
  window._bajadas=[];
  window.buildXlsx=function(sh){ window._hojas=JSON.parse(JSON.stringify(sh)); return new Uint8Array([1]); };
  window.downloadBlob=function(b, n){ window._bajadas.push(n); };
  var ts=function(f){ return new Date(f+'T11:00:00-04:00').getTime(); };
  var P=function(o){ return Object.assign({ id:'x', oc:'10-001', nota:'', vendedor:'Mirian Salazar', cliente:'', celular:'', fecha:'2026-10-20', turno:'AM',
    productos:[{ desc:'COLCHON TITANIO', medida:'140x190', cant:1, precio:0 }], saldo:0, acuenta:0, pagado:false, metodoPago:'', entregado:false,
    fotos:[], zona:'Norte', direccion:'Calle 1', maps:'', ts:ts('2026-10-05') }, o); };
  STATE=[
    P({ id:'m1', oc:'10-101', nota:'5001', cliente:'Ana Pérez', celular:'70011111', saldo:3000, ts:ts('2026-10-02') }),
    P({ id:'m2', oc:'10-102', nota:'5002', cliente:'ANA PEREZ', celular:'+591 700-11111', saldo:1500, ts:ts('2026-10-09') }),
    P({ id:'f1', oc:'10-103', nota:'6001', vendedor:'Maria Flores', cliente:'Bruno Díaz', celular:'71122222', saldo:3200, ts:ts('2026-10-03') }),
    P({ id:'f2', oc:'09-104', nota:'6002', vendedor:'Maria Flores', cliente:'Carla Soto', celular:'72233333', saldo:2000, ts:ts('2026-09-20'), fecha:'2026-09-25' }),
    P({ id:'i1', oc:'10-105', nota:'7001', vendedor:'Isabel Robledo', cliente:'Diego Ruiz', celular:'', saldo:1800, ts:ts('2026-10-04') }),
    P({ id:'i2', oc:'10-106', nota:'7002', vendedor:'Isabel Robledo', cliente:'Elena Vaca', celular:'73344444', saldo:0, pagado:true, metodoPago:'Efectivo',
        productos:[{ desc:'COLCHON ICE', medida:'140x190', cant:1, precio:2500 }, { desc:'ALMOHADA', medida:'50x70', cant:2, precio:150 }], ts:ts('2026-10-06') }),
    P({ id:'t1', oc:'', nota:'8001', vendedor:'Carola Chavez', cliente:'Fabio Gil', celular:'74455555', saldo:900, fecha:'', direccion:'SALIÓ DE TIENDA · Central', zona:'TIENDA', ts:ts('2026-10-07') }),
    P({ id:'a1', oc:'ATC 10-001', vendedor:'Mirian Salazar', cliente:'Ana Pérez', celular:'70011111', saldo:0, ts:ts('2026-10-08') }),
    P({ id:'r1', oc:'RPT 10-001', vendedor:'Mirian Salazar', cliente:'Mia Plaza', celular:'', saldo:0, ts:ts('2026-10-08') }),
    P({ id:'in1', oc:'10-107', vendedor:'ALBA', cliente:'REPOSICION', celular:'75566666', saldo:500, ts:ts('2026-10-08') }),
    P({ id:'kommo-1', oc:'', vendedor:'Mirian Salazar', cliente:'Borrador', celular:'76677777', saldo:1000, estado:'borrador', ts:ts('2026-10-08') }),
    filaSistema(ANUNCIO_ID, '📢 ANUNCIO', JSON.stringify({ v:1, t:'hola', d:'2026-10-14 09:00', ts:1, por:'x' }))
  ];
  STATE.forEach(function(p){ if(p.id==='kommo-1') p.estado=BORRADOR_EST; });
  window.FILAS=function(){ return cliFilas(cliDatos()); };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const page = await browser.newPage({ viewport:{ width:1180, height:900 }, timezoneId:'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.install({ time:new Date('2026-10-14T10:00:00-04:00') });
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.clock.runFor(1700);
  await page.evaluate(PREPARAR);
  const ev = (fn, arg) => page.evaluate(fn, arg).catch(e => ({ error:String(e.message||e).slice(0,300) }));

  console.log('\n── 1. El botón y la ventana ──');
  let r = await ev(() => {
    UNLOCKED=true; document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block';
    showView('admin');
    var b=document.getElementById('cli-btn'), grupo=b ? (b.closest('.at-g').querySelector('h5')||{}).textContent : '';
    b.click();
    var ov=document.getElementById('cli-overlay');
    var vends=[].map.call(document.querySelectorAll('#cli-vends label'), function(l){ return { n:l.textContent.trim(), on:l.querySelector('input').checked }; });
    return { hay:!!b, txt:b && b.textContent.trim(), grupo:grupo, abierta:!!ov && ov.style.display==='flex', vends:vends, mes:document.getElementById('cli-mes').value };
  });
  chk('el botón «📇 Clientes (Excel)» está en «Stock y ventas» y abre la ventana', r.hay && r.txt==='📇 Clientes (Excel)' && /Stock y ventas/.test(r.grupo) && r.abierta, r);
  chk('arranca en el mes de hoy con todos los vendedores tildados', r.mes==='2026-10' && r.vends.length>=4 && r.vends.every(function(v){ return v.on; }), r.vends.map(function(v){ return v.n; }));
  chk('los pedidos internos (ALBA…) no aparecen como vendedores', !r.vends.some(function(v){ return /ALBA/i.test(v.n); }), r.vends.map(function(v){ return v.n; }));

  console.log('\n── 2-4, 6. Un mes, sumando por cliente ──');
  r = await ev(() => { var F=FILAS(); return { cab:F.cab, filas:F.filas, txt:document.getElementById('cli-body').innerText }; });
  const fila = (n) => r.filas.filter(x => new RegExp(n,'i').test(x[0]))[0];
  chk('las tres primeras columnas son CLIENTE, CELULAR y VALOR', r.cab[0]==='CLIENTE' && r.cab[1]==='CELULAR' && /^VALOR/.test(r.cab[2]), r.cab);
  chk('Ana compró dos veces (celular escrito distinto): UN renglón con la suma 4.500 y 2 compras, con el nombre de la última', !!fila('ana') && fila('ana')[2]===4500 && fila('ana')[3]===2 && fila('ana')[0]==='ANA PEREZ' && r.filas.filter(x => /ana/i.test(x[0])).length===1, r.filas);
  chk('Carla compró en septiembre: no entra en octubre', !fila('carla'), r.filas.map(x=>x[0]));
  chk('sin celular se junta por nombre y sale igual (Diego, celular vacío)', !!fila('diego') && fila('diego')[1]==='' && fila('diego')[2]===1800, fila('diego'));
  chk('la venta «pagada sin monto» vale la suma de sus precios (2.500 + 2×150 = 2.800)', !!fila('elena') && fila('elena')[2]===2800, fila('elena'));
  chk('la venta de tienda entra', !!fila('fabio') && fila('fabio')[2]===900, fila('fabio'));
  chk('sin ATC, reposición, pedido interno, borrador de Kommo ni fila del sistema', !fila('mia plaza') && !fila('reposicion') && !fila('borrador') && !r.filas.some(x => /anuncio/i.test(x[0])) && r.filas.length===5, r.filas.map(x=>x[0]));
  chk('ordenado del que más compró al que menos', r.filas[0][0]==='ANA PEREZ' && r.filas[r.filas.length-1][2]===900, r.filas.map(x=>x[2]));
  chk("la vista previa dice cuántos clientes, compras, el total y los sin celular", /5\s*clientes/.test(r.txt) && /6\s*compras/.test(r.txt) && /13\.200/.test(r.txt) && /1 cliente sin celular/.test(r.txt), r.txt.slice(0,300).replace(/\n/g," / "));

  console.log('\n── 4. Repetir el contacto: una fila por compra ──');
  r = await ev(() => { cliElegir('modo','compra'); var F=FILAS(); return { cab:F.cab, filas:F.filas }; });
  chk('una fila por compra: Ana dos veces (3.000 y 1.500), en orden de fecha', r.filas.length===6 && r.filas.filter(x => /ana/i.test(x[0])).map(x => x[2]).join(',')==='3000,1500' && /^VALOR DE LA COMPRA/.test(r.cab[2]), r.filas);
  chk('con la fecha de la venta, el vendedor y la nota', r.filas[0][3]==='02/10/2026' && r.filas[0][4]==='Mirian Salazar' && r.filas[0][5]==='5001', r.filas[0]);

  console.log('\n── 2. Todo ──');
  r = await ev(() => { cliElegir('alc','todo'); var F=FILAS(); return { n:F.filas.length, carla:F.filas.some(function(x){ return /carla/i.test(x[0]); }), mesOff:document.getElementById('cli-mes').disabled }; });
  chk('«Todo» trae también septiembre (Carla) y el mes queda apagado', r.n===7 && r.carla && r.mesOff, r);

  console.log('\n── 5. Elegir vendedores ──');
  r = await ev(() => {
    cliElegir('modo','cliente'); cliElegir('alc','mes');
    cliTodos(false); var nada=FILAS().filas.length, msg=document.getElementById('cli-body').innerText, apagado=document.getElementById('cli-bajar').disabled;
    cliBajar(); var bajoNada=_bajadas.length;
    var L=CLIX.lista, iM=L.indexOf('Mirian Salazar'), iF=L.indexOf('Maria Flores');
    cliVend(iM, true); cliVend(iF, true);
    var F=FILAS();
    return { nada:nada, msg:msg, apagado:apagado, bajoNada:bajoNada, iM:iM, iF:iF, nombres:F.filas.map(function(x){ return x[0]; }), info:document.getElementById('cli-info').textContent };
  });
  chk('«Ninguno»: no hay nada, lo dice, y no deja bajar', r.nada===0 && /al menos un vendedor/.test(r.msg) && r.apagado && r.bajoNada===0, r);
  chk('Mirian y María (dos vendedores): solo sus clientes', r.iM>=0 && r.iF>=0 && r.nombres.length===2 && r.nombres.indexOf('ANA PEREZ')>=0 && r.nombres.indexOf('Bruno Díaz')>=0 && /2 vendedores/.test(r.info), r);

  console.log('\n── 7. El Excel ──');
  r = await ev(() => { cliBajar(); return { hojas:_hojas, nombre:_bajadas[_bajadas.length-1] }; });
  const h = r.hojas && r.hojas[0];
  chk('el Excel tiene la cabecera y una fila por cliente', !!h && h.matrix.length===3 && h.matrix[0][0].v==='CLIENTE' && h.name==='Clientes', h && h.matrix);
  chk('el valor va como número con formato de Bs y el celular como texto', !!h && h.matrix[1][2].t==='n' && h.matrix[1][2].v===4500 && typeof h.matrix[1][1]==='string', h && h.matrix[1]);
  chk('el nombre del archivo dice el mes y cuántos vendedores', r.nombre==='clientes-2026-10-2-vendedores.xlsx', r.nombre);
  r = await ev(() => { cliTodos(true); cliElegir('modo','compra'); cliBajar(); var a=_bajadas[_bajadas.length-1];
    cliTodos(false); cliVend(CLIX.lista.indexOf('Isabel Robledo'), true); cliElegir('modo','cliente'); cliBajar(); return { a:a, b:_bajadas[_bajadas.length-1], hoja:_hojas[0].name }; });
  chk('con todos y por compra: «clientes-2026-10-todos-por-compra.xlsx»; con una sola vendedora, su nombre', r.a==='clientes-2026-10-todos-por-compra.xlsx' && r.b==='clientes-2026-10-isabel-robledo.xlsx', r);

  console.log('\n── en el celular ──');
  await page.setViewportSize({ width:390, height:844 });
  r = await ev(() => { cliTodos(true); return { ancho:document.documentElement.scrollWidth, vw:innerWidth }; });
  chk('en 390 px la página no se corre de costado (la tabla se desliza adentro)', r.ancho<=r.vw, r);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e => { console.error(e); process.exit(1); });
