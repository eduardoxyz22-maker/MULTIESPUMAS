/* 📁 LOS COMPROBANTES DEL MES PARA EL CONTADOR (§4mg, C2, 25/10; dueño: «c1, 2, 3 aprobado»).

   LO QUE CUIDA:
   1. Entran los pagos del MES que NO son efectivo (QR, tarjeta, transferencia, también el flete), por banco; el efectivo y otro mes no.
   2. Cuenta los que no tienen foto, en rojo.
   3. El nombre de archivo dice día, banco, monto y cliente (y _1, _2 con varias fotos).
   4. «⬇️ Excel con los enlaces»: una fila por foto con el enlace de Drive; sin foto, «FALTA LA FOTO».
   5. Con un vendedor elegido, solo lo suyo.

   Reloj CLAVADO (martes 27/10/2026, 10:00 de Bolivia). Solo datos sintéticos.
   Se corre:  node tests/test_comprobantes_mes.js */
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
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await ctx.route(/^https:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-27T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };

  const r = await ev(async () => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    var mes=todayStr().slice(0,7), ts=new Date(mes+'-05T11:00:00-04:00').getTime(), n=0;
    var P=function(o){ n++; return Object.assign({ id:'c'+n, oc:'10-'+(100+n), nota:String(5000+n), cliente:'CLIENTE '+n, celular:'7000000'+n, fecha:mes+'-26', turno:'AM', zona:'Norte', vendedor:'Carola Chavez',
      productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:3000 }], saldo:0, acuenta:0, pagado:true, metodoPago:'', ts:ts }, o); };
    STATE=[
      P({ cliente:'ANA QR', metodoPago:textoCobros([{ metodo:'QR', banco:'BISA', monto:3000, fecha:mes+'-05', nota:'11', comps:['fotoA1','fotoA2'] }]) }),
      P({ cliente:'BETO TARJETA', metodoPago:textoCobros([{ metodo:'Tarjeta', monto:3000, fecha:mes+'-06', nota:'12' }]) }),
      P({ cliente:'CARLA EFECTIVO', metodoPago:textoCobros([{ metodo:'Efectivo', monto:3000, fecha:mes+'-07', nota:'13' }]) }),
      P({ cliente:'DANI OTROMES', metodoPago:textoCobros([{ metodo:'QR', banco:'BISA', monto:3000, fecha:'2026-09-28', nota:'14', comps:['fotoD'] }]) }),
      P({ cliente:'ELSA SUEÑA', vendedor:'Mauricio Merida', metodoPago:textoCobros([{ metodo:'QR', banco:'Económico', monto:3000, fecha:mes+'-08', nota:'15', comps:['fotoE'] }]) })
    ];
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
    apiSave=function(r){ return Promise.resolve({ ok:true, pedido:r }); };
    showView('conta'); await new Promise(function(r){ setTimeout(r, 200); });
    document.getElementById('cta-vendedor').value='';
    var L=compsMesDatos(mes);
    compsAbrir(); await new Promise(function(r){ setTimeout(r, 80); });
    var res=[].map.call(document.querySelectorAll('.cps-r'), function(x){ return x.textContent; });
    var noms=document.querySelector('.cps-t').textContent;
    var hojas=null, nombre='', bx=window.buildXlsx, dl=window.downloadBlob;
    window.buildXlsx=function(sh){ hojas=sh; return 'x'; }; window.downloadBlob=function(b, nm){ nombre=nm; };
    try{ compsExcel(); }finally{ window.buildXlsx=bx; window.downloadBlob=dl; }
    closeModal();
    var s=document.getElementById('cta-vendedor'); for(var i=0;i<s.options.length;i++) if(/Mauricio/.test(s.options[i].text)) s.value=s.options[i].value;
    var Lm=compsMesDatos(mes); s.value='';
    return { L:L.map(function(x){ return x.p.cliente+'|'+x.met+'|'+x.comps.length; }), res:res, noms:noms, filas:hojas&&hojas[0].matrix, nombre:nombre, Lm:Lm.map(function(x){ return x.p.cliente; }) };
  });
  chk('1. entran QR y tarjeta del mes; ni el efectivo ni otro mes', r.L && r.L.length===3 && !r.L.some(t=>/EFECTIVO|OTROMES/.test(t)), r.L);
  chk('2. «Sin foto»: 1 (la tarjeta)', r.res && r.res.some(t=>/Sin foto\s*1/.test(t)), r.res);
  chk('3. nombre de archivo con día, banco, monto y cliente', /2026-10-05_QR-BISA_3000_ANA-QR_1\.jpg/.test(r.noms) && /2026-10-05_QR-BISA_3000_ANA-QR_2\.jpg/.test(r.noms), r.noms && r.noms.slice(0,300));
  const filas = r.filas||[];
  chk('4a. Excel: una fila por foto (2 de Ana) + la tarjeta sin foto + Elsa', filas.length===1+4, filas.length);
  chk('4b. el enlace es el de Drive y la sin foto dice FALTA', filas.some(f=>f[8]==='https://drive.google.com/file/d/fotoA1/view') && filas.some(f=>/BETO/.test(f[2]) && f[8]==='FALTA LA FOTO'), filas.slice(1));
  chk('4c. el archivo se llama comprobantes-AAAA-MM', r.nombre==='comprobantes-2026-10.xlsx', r.nombre);
  chk('5. con un vendedor elegido, solo lo suyo', JSON.stringify(r.Lm)===JSON.stringify(['ELSA SUEÑA']), r.Lm);

  chk('sin errores en la página', !errores.length, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
