/* 💵 «EFECTIVO EN TU MANO» = LO DEL CUADRE DEL MES (25/10, auditoría Codex/Astra FIN-01, §4mk; el dueño eligió «igual que el Cuadre del mes»).

   LO QUE CUIDA (cada caso: «☀️ Tu día» dice el MISMO número que «Le queda en la mano» del Cuadre del mes con Todos):
   1. El caso de la auditoría: pago 500, retiro TOTAL 500, después 200 + flete 20 → 220 (antes «todo rendido», 0).
   2. Retiro PARCIAL: cobró 700 y rindió 500 → 200 (antes el retiro lo ponía en 0).
   3. Lo cobrado el mes pasado y rendido este mes no da negativo: 0 y «N eran de lo cobrado el mes pasado».
   4. Lo que recibió un chofer no es suyo; lo de otro mes no entra.
   5. Sin nada en el mes: «sin efectivo en octubre».

   Reloj CLAVADO (martes 27/10/2026, 10:00 de Bolivia). Solo datos sintéticos.
   Se corre:  node tests/test_efectivo_tu_dia.js   (PEDIDOS=… para correrla contra otra versión) */
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
  await page.addInitScript(()=>{ window.MIS_TOP_PRUEBA=1; });
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  const r = await page.evaluate(async () => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR=''; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    var esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
    var n=0, P=function(v, o){ n++; return Object.assign({ id:'e'+n, oc:'10-'+(300+n), vendedor:v, cliente:'CLIENTE '+n, celular:'7000100'+n, zona:'Norte', turno:'AM', nota:String(700+n), fecha:'2026-10-20',
      productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:1000 }], saldo:0, acuenta:0, pagado:true, ts:new Date('2026-10-05T11:00:00-04:00').getTime() }, o); };
    var R=function(v, monto, dia){ n++; return { id:'__ret_t'+n+'__', fecha:'', cliente:'💵 RETIRO DE EFECTIVO — fila del sistema, NO BORRAR', vendedor:v, chofer:'Contabilidad', acuenta:monto, zona:'FACTURADO', nota:'', ts:new Date(dia+'T10:00:00-04:00').getTime() }; };
    var L=[
      // 1. Maria: 500 el 24, retiro total 500 el 24, después 200 y flete 20 el 24 → 220
      P('Maria Flores', { metodoPago:textoCobros([{ metodo:'Efectivo', monto:500, fecha:'2026-10-24', nota:'1' }, { metodo:'Efectivo', monto:200, fecha:'2026-10-24', nota:'2' }, { metodo:'Efectivo', monto:20, fecha:'2026-10-24', nota:'7', envio:true }]) }),
      P('Maria Flores', { metodoPago:textoCobros([{ metodo:'Efectivo', monto:1000, fecha:'2026-10-24', nota:'3' }]) }),
      R('Maria Flores', 1500, '2026-10-24'),
      // 2. Isabel: 700, retiro parcial 500 → 200 (y lo de un chofer no es suyo)
      P('Isabel Robledo', { metodoPago:textoCobros([{ metodo:'Efectivo', monto:700, fecha:'2026-10-12', nota:'4' }]) }),
      P('Isabel Robledo', { metodoPago:textoCobros([{ metodo:'Efectivo', monto:300, fecha:'2026-10-13', nota:'5', recibio:'Luis Pierre' }]) }),
      R('Isabel Robledo', 500, '2026-10-15'),
      // 3. Mirian: 300 cobrados el 30/09, rendidos el 02/10 → 0 y «rendiste 300 de más»
      P('Mirian Salazar', { fecha:'2026-09-30', metodoPago:textoCobros([{ metodo:'Efectivo', monto:300, fecha:'2026-09-30', nota:'6' }]) }),
      R('Mirian Salazar', 300, '2026-10-02')
    ];
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(L)) }); };
    apiSave=function(x){ return Promise.resolve({ ok:true, pedido:x }); };
    await refrescarEstado(); await esperar(150);
    var tuDia=async function(v){ showView('mis'); MIS_TODOS=false; var mv=document.getElementById('mis-vendedor'); mv.value=v; renderMis(); await esperar(250);
      var f=document.querySelector('#mis-top .td-cash'); return f ? f.innerText.replace(/\s+/g,' ').trim() : ''; };
    // el Cuadre del mes con Todos, con los controles de la pantalla
    showView('conta'); await esperar(150);
    try{ setContaTab('cuadre'); }catch(e){}
    try{ segSet('cua-mode','mes'); }catch(e){}
    var cm=document.getElementById('cua-mes'); if(cm) cm.value='2026-10';
    var cv=document.getElementById('cua-vendedor'); if(cv) cv.value='';
    var E=cuadreEfectivo().filas, enMano=function(v){ var o=E.filter(function(x){ return mismoVendedor(x.nombre, v); })[0]; return o ? o.falta : 0; };
    var out={ cuadre:{ maria:enMano('Maria Flores'), isabel:enMano('Isabel Robledo'), mirian:enMano('Mirian Salazar') } };
    out.maria=await tuDia('Maria Flores'); out.isabel=await tuDia('Isabel Robledo'); out.mirian=await tuDia('Mirian Salazar'); out.carola=await tuDia('Carola Chavez');
    out.datos={ maria:misEfectivoDatos('Maria Flores'), isabel:misEfectivoDatos('Isabel Robledo'), mirian:misEfectivoDatos('Mirian Salazar') };
    ['maria','isabel','mirian'].forEach(function(k){ var d=out.datos[k]; out.datos[k]={ tot:d.tot, deMas:d.deMas, cobrado:d.cobrado, retirado:d.retirado }; });
    return out;
  });
  const bs = (t) => { const m = String(t).match(/Bs\s*([\d.]+)\s*$/); return m ? Number(m[1].replace(/\./g,'')) : null; };
  chk('1. Maria: 500 + 200 + 1.000 + flete 20 − retiro 1.500 = 220, igual que el Cuadre (antes «todo rendido»)', r.datos.maria.tot===220 && bs(r.maria)===220 && r.cuadre.maria===220, { tuDia:r.maria, cuadre:r.cuadre.maria, d:r.datos.maria });
  chk('2. Isabel: 700 − retiro parcial 500 = 200 (los 300 del chofer no son suyos), igual que el Cuadre', r.datos.isabel.tot===200 && bs(r.isabel)===200 && r.cuadre.isabel===200, { tuDia:r.isabel, cuadre:r.cuadre.isabel });
  chk('3a. Mirian: rindió en octubre 300 cobrados en septiembre → 0, no negativo', r.datos.mirian.tot===0 && r.datos.mirian.deMas===300 && bs(r.mirian)===0, { tuDia:r.mirian, d:r.datos.mirian });
  chk('3b. …y lo dice: «Bs 300 eran de lo cobrado el mes pasado»', /Bs 300 eran de lo cobrado el mes pasado/.test(r.mirian), r.mirian);
  chk('4. la línea dice cuánto recibió y cuánto rindió en el mes', /de octubre: recibiste Bs 1\.720, rendiste Bs 1\.500/.test(r.maria), r.maria);
  chk('5. sin efectivo en el mes: «sin efectivo en octubre» y Bs 0', /sin efectivo en octubre/.test(r.carola) && bs(r.carola)===0, r.carola);
  chk('sin errores en la página', !errores.length, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
