/* 📁 EL EXCEL DE COMPROBANTES: UN PAGO ES UNO AUNQUE TENGA DOS FOTOS (25/10, auditoría Codex/Astra; el dueño eligió «N° de pago y foto 1 de 2»).

   LO QUE CUIDA:
   1. Un pago con 2 fotos sale en 2 filas con el MISMO «N° DE PAGO» y «FOTO» «1 de 2» / «2 de 2»; el MONTO va solo en la primera:
      la suma de la columna MONTO da lo cobrado (antes contaba el pago dos veces).
   2. Las columnas de siempre siguen en su lugar; las nuevas van al FINAL.
   3. Nombres de archivo: 10,10 y 10,20 ya no dan el mismo nombre (antes los dos «10»), y dos pagos iguales (mismo día, banco, monto y
      cliente) no se pisan: el segundo lleva «-2».

   Reloj CLAVADO (martes 27/10/2026, 10:00 de Bolivia). Solo datos sintéticos.
   Se corre:  node tests/test_comprobantes_pagos.js   (PEDIDOS=… para correrla contra otra versión) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1440, height:1000 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await ctx.route(/^https:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-27T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  const r = await page.evaluate(async () => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    var n=0, P=function(o){ n++; return Object.assign({ id:'c'+n, oc:'10-'+(100+n), nota:String(5000+n), cliente:'CLIENTE '+n, celular:'7000000'+n, fecha:'2026-10-26', turno:'AM', zona:'Norte', vendedor:'Carola Chavez',
      productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:3000 }], saldo:0, acuenta:0, pagado:true, metodoPago:'', ts:new Date('2026-10-05T11:00:00-04:00').getTime() }, o); };
    STATE=[
      P({ cliente:'ANA DOS FOTOS', metodoPago:textoCobros([{ metodo:'QR', banco:'BISA', monto:400.25, fecha:'2026-10-05', nota:'11', comps:['fA1','fA2'] }]) }),
      P({ cliente:'BETO CENTAVOS', metodoPago:textoCobros([{ metodo:'QR', banco:'BISA', monto:10.10, fecha:'2026-10-06', nota:'12', comps:['fB1'] }, { metodo:'QR', banco:'BISA', monto:10.20, fecha:'2026-10-06', nota:'13', comps:['fB2'] }]) }),
      P({ cliente:'CARLA IGUALES', metodoPago:textoCobros([{ metodo:'QR', banco:'BISA', monto:500, fecha:'2026-10-07', nota:'14', comps:['fC1'] }, { metodo:'QR', banco:'BISA', monto:500, fecha:'2026-10-07', nota:'15', comps:['fC2'] }]) })
    ];
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
    apiSave=function(x){ return Promise.resolve({ ok:true, pedido:x }); };
    showView('conta'); await new Promise(function(r){ setTimeout(r, 200); });
    document.getElementById('cta-vendedor').value='';
    compsAbrir(); await new Promise(function(r){ setTimeout(r, 80); });
    var noms=compsMesDatos('2026-10').map(function(x){ return x.comps.map(function(f,i){ return compsArchivo(x,i); }); });
    var hojas=null, bx=window.buildXlsx, dl=window.downloadBlob;
    window.buildXlsx=function(sh){ hojas=sh; return 'x'; }; window.downloadBlob=function(){};
    try{ compsExcel(); }finally{ window.buildXlsx=bx; window.downloadBlob=dl; }
    try{ closeModal(); }catch(e){}
    var M=hojas[0].matrix, val=function(c){ return (c && typeof c==='object') ? c.v : c; };
    return { cab:M[0], filas:M.slice(1).map(function(f){ return f.map(val); }), noms:[].concat.apply([], noms) };
  });
  const cab = r.cab, F = r.filas;
  const iM = cab.indexOf('MONTO (Bs)'), iN = cab.indexOf('N° DE PAGO'), iF = cab.lastIndexOf('FOTO');
  const ana = F.filter(f => /ANA/.test(f[2]));
  chk('1a. Ana (un pago, 2 fotos): 2 filas con el mismo N° de pago y «1 de 2» / «2 de 2»', ana.length===2 && ana[0][iN]===ana[1][iN] && ana[0][iF]==='1 de 2' && ana[1][iF]==='2 de 2', ana);
  chk('1b. …y el monto solo en la primera fila', ana[0][iM]===400.25 && ana[1][iM]==='', ana.map(f=>f[iM]));
  const suma = Math.round(F.reduce((t,f)=>t+(Number(f[iM])||0), 0)*100)/100;
  chk('1c. la columna MONTO suma lo cobrado: 400,25 + 10,10 + 10,20 + 500 + 500 = 1.420,55', suma===1420.55, suma);
  chk('2. las columnas de siempre en su lugar y las nuevas al final', cab.slice(0,10).join('|')==='DÍA|MÉTODO Y BANCO|CLIENTE|N° NOTA DE VENTA|N° RECIBO|VENDEDOR|MONTO (Bs)|FLETE|FOTO (enlace)|NOMBRE DEL ARCHIVO' && cab[10]==='N° DE PAGO' && cab[11]==='FOTO', cab);
  chk('3a. 10,10 y 10,20 dan nombres distintos', r.noms.some(n=>/_10,10_BETO/.test(n)) && r.noms.some(n=>/_10,20_BETO/.test(n)), r.noms);
  const carla = r.noms.filter(n=>/CARLA/.test(n));
  chk('3b. dos pagos iguales no se pisan: el segundo lleva «-2»', carla.length===2 && carla[0]!==carla[1] && carla.some(n=>/CARLA-IGUALES-2\.jpg$/.test(n)), carla);
  chk('sin errores en la página', !errores.length, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
