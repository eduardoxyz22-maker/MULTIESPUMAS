/* 🗂️ MIS PEDIDOS: LO ENTREGADO Y PAGADO, EN UNA LÍNEA (15/11/2026, mejora 284; el dueño la quiere VER con datos reales antes de decidir).

   Lo que se mira:
     1. Sin la bandera (Playwright): todas las tarjetas como siempre, ningún renglón.
     2. Con `MIS_COMPACTO_PRUEBA`: lo entregado y pagado (y la ATC/RPT entregada, que no se cobra; y lo entregado con cobros y saldo 0)
        va AL FINAL, después del separador «✅ Entregados y pagados · N», en renglones de ~40 px con el cliente y «pagado».
        Lo por entregar, lo entregado CON saldo y lo entregado sin monto anotado siguen como tarjetas grandes, arriba.
     3. Tocar un renglón lo abre como la tarjeta de siempre (los demás siguen en renglón).
     4. «Ver como tarjetas» lo apaga en ese aparato (`me_mis_compacto`=0) y vuelve todo a tarjetas; prenderlo lo devuelve.
     5. En «Pendientes» no hay separador; la búsqueda encuentra lo que está en renglón.
   ⚠️ Reloj clavado en el miércoles 11/11/2026 a las 10:30 de Bolivia. Datos SINTÉTICOS: el repo es público.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_mis_compacto.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

function PREPARAR(){
  CONNECTED=false;
  try{ CARGA_GEN++; CARGA_ESTADO='ok'; clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  loadFromServer=function(){}; apiList=function(){ return Promise.resolve({ ok:true, pedidos:STATE.slice() }); };
  var P=function(o){ return Object.assign({ fecha:'2026-11-05', turno:'AM', vendedor:'Carola Chavez', celular:'70000001', zona:'Norte', direccion:'Calle 1',
    productos:[{desc:'COLCHON TITANIO ICE',codigo:'CH1200',medida:'140x190',cant:1,precio:3000}], pagado:false, saldo:0, acuenta:0, metodoPago:'', entregado:false,
    nota:'', facturarA:'', maps:'', fotos:[], ts:Date.parse('2026-11-01T10:00:00-04:00') }, o); };
  STATE=[
    P({ id:'pend1', oc:'11-301', cliente:'PEND UNO', fecha:'2026-11-12', saldo:2000, acuenta:1000 }),
    P({ id:'pend2', oc:'11-302', cliente:'PEND DOS', fecha:'2026-11-13', saldo:1500, acuenta:1500 }),
    P({ id:'pag1', oc:'11-201', cliente:'PAGADO UNO', fecha:'2026-11-03', entregado:true, pagado:true, metodoPago:'Efectivo 3000 @2026-11-03 #11' }),
    P({ id:'pag2', oc:'11-202', cliente:'PAGADO DOS', fecha:'2026-11-04', entregado:true, pagado:true, metodoPago:'QR BISA 3000 @2026-11-04 #12',
        productos:[{desc:'COLCHON SOFT',codigo:'CH1000',medida:'90x190',cant:2,precio:1000},{desc:'ALMOHADA',medida:'50x70',cant:2,precio:500}] }),
    P({ id:'pag3', oc:'11-203', cliente:'PAGADO TRES', fecha:'2026-11-06', entregado:true, pagado:true, metodoPago:'Efectivo 3000 @2026-11-06 #13' }),
    P({ id:'cob0', oc:'11-204', cliente:'COBRADO SIN MARCA', fecha:'2026-11-07', entregado:true, pagado:false, saldo:0, metodoPago:'Efectivo 3000 @2026-11-07 #14' }),
    P({ id:'atc1', oc:'ATC 11-010', cliente:'ATC ENTREGADA', fecha:'2026-11-02', entregado:true, atc:{ motivo:'hundimiento', det:'Se hundió del lado izquierdo', compra:'2026-05-01', tipo:'gar' } }),
    P({ id:'deb1', oc:'11-205', cliente:'DEBE TODAVIA', fecha:'2026-11-08', entregado:true, pagado:false, saldo:800, acuenta:2200 }),
    P({ id:'sinm', oc:'11-206', cliente:'SIN MONTO', fecha:'2026-11-09', entregado:true, pagado:false, saldo:0, acuenta:0 })
  ];
  MIS_FILTER='todos'; MIS_Q=''; var q=document.getElementById('mis-q'); if(q) q.value='';
  showView('mis'); var mv=document.getElementById('mis-vendedor'); mv.value='Carola Chavez'; renderMis();
  window._ver=function(){
    var lista=document.getElementById('mis-lista'), orden=[];
    [].forEach.call(lista.children, function(el){
      if(el.classList.contains('mis-cf-sep')) orden.push('SEP');
      else if(el.classList.contains('mis-cf')) orden.push('r:'+el.getAttribute('data-id'));
      else if(el.classList.contains('cho-card')) orden.push('c:'+((el.innerText.match(/(PEND UNO|PEND DOS|PAGADO UNO|PAGADO DOS|PAGADO TRES|COBRADO SIN MARCA|ATC ENTREGADA|DEBE TODAVIA|SIN MONTO)/)||[])[1]||'?'));
    });
    var filas=[].map.call(lista.querySelectorAll('.mis-cf'), function(f){ var r=f.getBoundingClientRect(); return { id:f.getAttribute('data-id'), h:Math.round(r.height), t:f.innerText.replace(/\s+/g,' ').trim() }; });
    var sep=lista.querySelector('.mis-cf-sep');
    return { orden:orden, filas:filas, sep:sep?sep.innerText.replace(/\s+/g,' ').trim():'', cards:lista.querySelectorAll('.cho-card').length };
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  async function abrir(flag){
    const ctx = await browser.newContext({ viewport:{ width:1366, height:768 }, timezoneId:'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r=>r.abort());
    const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
    if(flag) await page.addInitScript(() => { window.MIS_COMPACTO_PRUEBA=true; });
    await page.clock.setFixedTime(new Date('2026-11-11T10:30:00-04:00'));
    await page.goto('file://' + PEDIDOS + '?tema=espuma', { waitUntil:'load' }); await page.waitForTimeout(400);
    await page.evaluate(PREPARAR); await page.waitForTimeout(150);
    page._ctx=ctx; return page;
  }
  let r;

  console.log('\n── 1. Sin la bandera ──');
  let page = await abrir(false);
  r = await page.evaluate(() => _ver());
  chk('1 sin bandera: las 9 como tarjetas, ningún renglón ni separador', r.cards===9 && r.filas.length===0 && r.sep==='', r);
  await page._ctx.close();

  console.log('\n── 2-5. Con la bandera ──');
  page = await abrir(true);
  r = await page.evaluate(() => _ver());
  const ids=r.filas.map(f=>f.id).sort().join(',');
  chk('2a entran en renglón: los 3 pagados, el cobrado con saldo 0 y la ATC entregada (5)', ids==='atc1,cob0,pag1,pag2,pag3', ids);
  chk('2b siguen como tarjeta: por entregar, con saldo y sin monto anotado (4)', r.cards===4 && ['c:PEND UNO','c:PEND DOS','c:DEBE TODAVIA','c:SIN MONTO'].every(x=>r.orden.indexOf(x)>=0), r.orden);
  const iSep=r.orden.indexOf('SEP'), ultimaCard=Math.max.apply(null, r.orden.map((x,i)=>x.indexOf('c:')===0?i:-1));
  chk('2c el separador va DESPUÉS de todas las tarjetas y antes de los renglones', iSep>ultimaCard && r.orden.slice(iSep+1).every(x=>x.indexOf('r:')===0), r.orden);
  chk('2d el separador dice cuántos son', /Entregados y pagados · 5/.test(r.sep) && /Ver como tarjetas/.test(r.sep), r.sep);
  chk('2e cada renglón mide ~40 px (≤ 48) y dice cliente y «pagado» / «no se cobra»', r.filas.every(f=>f.h>=36 && f.h<=48) &&
    /PAGADO DOS/.test((r.filas.find(f=>f.id==='pag2')||{}).t) && /pagado/.test((r.filas.find(f=>f.id==='pag2')||{}).t) && /\+1/.test((r.filas.find(f=>f.id==='pag2')||{}).t) &&
    /no se cobra/.test((r.filas.find(f=>f.id==='atc1')||{}).t), r.filas);

  await page.click('#mis-lista .mis-cf[data-id="pag2"]'); await page.waitForTimeout(120);
  r = await page.evaluate(() => _ver());
  chk('3 tocar un renglón lo abre como tarjeta entera (los demás siguen en renglón)', r.cards===5 && r.orden.indexOf('c:PAGADO DOS')>r.orden.indexOf('SEP') && r.filas.length===4, r.orden);
  r = await page.evaluate(() => { var c=[].filter.call(document.querySelectorAll('#mis-lista .cho-card'), function(x){ return /PAGADO DOS/.test(x.innerText); })[0]; return { botones:c?c.querySelectorAll('button').length:0, h:c?Math.round(c.getBoundingClientRect().height):0 }; });
  chk('3b …con sus botones de siempre', r.botones>0 && r.h>100, r);

  await page.click('#mis-lista .mis-cf-modo'); await page.waitForTimeout(120);
  r = await page.evaluate(() => Object.assign(_ver(), { ls:localStorage.getItem('me_mis_compacto') }));
  chk('4a «Ver como tarjetas» lo apaga en este aparato: las 9 tarjetas y nada de renglones', r.ls==='0' && r.cards===9 && r.filas.length===0 && r.sep==='', r);
  r = await page.evaluate(() => { misCompactoPoner(true); return Object.assign(_ver(), { ls:localStorage.getItem('me_mis_compacto') }); });
  chk('4b prenderlo lo devuelve', r.ls==='1' && r.filas.length===5 && r.cards===4, r);

  r = await page.evaluate(() => { setMisFiltro('pend'); return _ver(); });
  chk('5a en «Pendientes» no hay separador ni renglones', r.sep==='' && r.filas.length===0 && r.cards>=2, r);
  await page.evaluate(() => { setMisFiltro('todos'); });
  await page.fill('#mis-q', ''); await page.focus('#mis-q'); await page.keyboard.type('pagado tres', { delay:5 }); await page.waitForTimeout(120);
  r = await page.evaluate(() => _ver());
  chk('5b la búsqueda encuentra lo que está en renglón', r.filas.length===1 && r.filas[0].id==='pag3' && r.cards===0 && /· 1/.test(r.sep), r);
  await page._ctx.close();

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
