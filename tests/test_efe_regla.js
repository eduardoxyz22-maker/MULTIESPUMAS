/* 💵🔒 LA REGLA DEL EFECTIVO (07/11/2026, aprobada por el dueño: «Sí, armá la regla del efectivo así»; muestras
   https://claude.ai/artifact/KyRJTk47PcPaD2bSZBaDYv y https://claude.ai/artifact/M2CC7Hk9GBtUhMtBeMZ8LM).

   LO QUE CUIDA (datos inventados; reloj CLAVADO):
   A. La hora del retiro: un retiro no se lleva un cobro que entró DESPUÉS (del mismo día, de una venta cargada más tarde). Sin la hora se
      llevaba el del mismo monto más nuevo (el de las 10:41) y dejaba «en la mano» el del día anterior que sí se entregó.
   B. La gracia: el 03/11 (primer día hábil después de octubre) un retiro va primero a lo de octubre; el 06/11 (pasada la gracia), un retiro
      que no da justo se lleva SOLO lo de noviembre (antes: del más viejo, octubre incluido).
   C. 🔒 Octubre cerrado: lo de octubre sin retiro cargado no queda «en la mano» de nadie (el Cuadre dice «🔒 cerrado»).
   D. Diciembre: lo de noviembre sin retirar sale como «⚠️ Faltante de noviembre» pasada su gracia (01/12); el día de gracia, un retiro va
      primero a lo de noviembre.
   E. Los cobros TILDADOS al cargar el retiro mandan sobre la regla (columna «Garantía»: `efe:id|día|monto`).
   F. El formulario del retiro lista los cobros de quien entrega con el CLIENTE y el N° de nota (no la OC), ya tildados con la regla; tildar a
      mano cambia la suma; al guardar quedan en la fila; al corregirlo vuelven.
   G. El servidor (`waEfeCuentas_` del .gs) empareja IGUAL que la página, cobro por cobro, y el aviso cuenta por la fecha del COBRO.
   H. (opcional) Con `REAL=<lista.json>` (la planilla bajada, fuera del repo): página y servidor iguales en todos los cobros.
   Se corre:  node tests/test_efe_regla.js   (PEDIDOS=… / GS=… contra otra versión) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs'), vm = require('vm');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const GS = process.env.GS || path.resolve('google-apps-script.gs');

/* Ventas y retiros inventados. `ts` = cuándo se cargó la venta (hora de Bolivia); el retiro sin hora va al mediodía (= cargado otro día). */
const TSB=(dia, hora)=>new Date(dia+'T'+(hora||'11:00')+':00-04:00').getTime();
const P=(id, v, cli, cobros, dia, hora)=>({ id:id, oc:'11-'+id.replace(/\D/g,'').padStart(3,'0'), vendedor:v, cliente:cli, celular:'70001001', zona:'Norte', turno:'AM',
  nota:'5'+id.replace(/\D/g,'').padStart(3,'0'), fecha:'2026-12-20', productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:9000 }],
  saldo:0, acuenta:0, pagado:false, ts:TSB(dia, hora), metodoPago:cobros.map((c,i)=>'Efectivo '+c.m+' @'+c.f+' #'+(700+i)+(c.r?(' >'+c.r):'')).join(' + ') });
const R=(id, v, monto, dia, hora, tick)=>({ id:'__ret_'+id+'__', fecha:'', cliente:'💵 RETIRO DE EFECTIVO — fila del sistema, NO BORRAR', vendedor:v, chofer:'Eduardo Añez',
  acuenta:monto, zona:'FACTURADO', nota:'1', ts:hora ? TSB(dia, hora) : TSB(dia, '12:00'), garantia:tick||'' });

const NOV=[
  // A. la hora: 06/11 1.500 y 07/11 10:41 1.500; el retiro de 1.500 se cargó el 07/11 a las 09:11
  P('a1', 'Mauricio Merida', 'CLIENTE VIERNES', [{ m:1500, f:'2026-11-06' }], '2026-11-06'),
  P('a2', 'Mauricio Merida', 'CLIENTE SABADO', [{ m:1500, f:'2026-11-07' }], '2026-11-07', '10:41'),
  R('a1', 'Mauricio Merida', 1500, '2026-11-07', '09:11'),
  // B. la gracia (octubre → 03/11)
  P('b1', 'Juan Pablo Paredes', 'CLIENTE DIEZ', [{ m:3000, f:'2026-10-10' }], '2026-10-10'),
  P('b2', 'Juan Pablo Paredes', 'CLIENTE PENA', [{ m:990, f:'2026-10-31' }], '2026-10-31'),
  P('b3', 'Juan Pablo Paredes', 'CLIENTE CARLOS', [{ m:910, f:'2026-11-03' }], '2026-11-03'),
  P('b4', 'Juan Pablo Paredes', 'CLIENTE ROMERO', [{ m:1480, f:'2026-11-03' }], '2026-11-03'),
  P('b5', 'Juan Pablo Paredes', 'CLIENTE PERALTA', [{ m:1240, f:'2026-11-05' }], '2026-11-05'),
  R('b1', 'Juan Pablo Paredes', 3500, '2026-11-03'),          // el día de gracia: 3.000 + 500 de octubre
  R('b2', 'Juan Pablo Paredes', 1000, '2026-11-06'),          // pasada la gracia: 910 + 90 de noviembre (antes: 490 de octubre + 510)
  // E. los tildados mandan: dos de 800; la regla se llevaría el más nuevo, se tildó el del 03/11
  P('e1', 'Andrea Orias', 'CLIENTE LUNES', [{ m:800, f:'2026-11-03' }], '2026-11-03'),
  P('e2', 'Andrea Orias', 'CLIENTE MARTES', [{ m:800, f:'2026-11-04' }], '2026-11-04'),
  R('e1', 'Andrea Orias', 800, '2026-11-05', '', 'efe:e1|2026-11-03|800'),
  // F. el formulario (Fernando: dos del 05/11 y uno de hoy)
  P('f1', 'Fernando Peinado', 'CLIENTE ROSA', [{ m:1860, f:'2026-11-05' }], '2026-11-05'),
  P('f2', 'Fernando Peinado', 'CLIENTE CARLOS', [{ m:700, f:'2026-11-05' }], '2026-11-05'),
  P('f3', 'Fernando Peinado', 'CLIENTE HOY', [{ m:1020, f:'2026-11-07' }], '2026-11-07', '14:52')
];
const DIC=[
  // D. Isabel: 700 del 28/11 sin retiro; en diciembre su cobro y su retiro → «Faltante de noviembre»
  P('d1', 'Isabel Robledo', 'CLIENTE NOVIEMBRE', [{ m:700, f:'2026-11-28' }], '2026-11-28'),
  P('d2', 'Isabel Robledo', 'CLIENTE DICIEMBRE', [{ m:2000, f:'2026-12-02' }], '2026-12-02'),
  R('d2', 'Isabel Robledo', 2000, '2026-12-03', '18:00'),
  // D. Carola: el día de gracia (01/12) un retiro que no da justo va primero a lo de noviembre
  P('c1', 'Carola Chavez', 'CLIENTE FIN DE MES', [{ m:1200, f:'2026-11-29' }], '2026-11-29'),
  P('c2', 'Carola Chavez', 'CLIENTE PRIMERO', [{ m:1500, f:'2026-12-01' }], '2026-12-01', '10:00'),
  R('c1', 'Carola Chavez', 1700, '2026-12-01')
];

async function abrir(browser, reloj){
  const ctx = await browser.newContext({ viewport:{ width:1280, height:900 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.errores=[]; page.on('pageerror', e => page.errores.push(e.message)); page.on('dialog', d => d.accept());
  await ctx.route(/^https?:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date(reloj));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  return page;
}
async function montar(page, L){
  return page.evaluate(async (L) => {
    var c0=document.getElementById('conn-form'); if(c0) c0.style.display='none';
    CONNECTED=true; UNLOCKED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR=''; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    window._L=JSON.parse(JSON.stringify(L)); window._guardados=[];
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window._L)) }); };
    apiSave=function(x){ window._guardados.push(JSON.parse(JSON.stringify(x))); return Promise.resolve({ ok:true, pedido:x }); };
    await refrescarEstado(); await new Promise(function(r){ setTimeout(r, 150); });
    showView('conta'); await new Promise(function(r){ setTimeout(r, 150); });
    return true;
  }, L);
}
/* El Cuadre de un mes (filas) y el emparejamiento cobro por cobro. */
const cuadre=(page, ym)=>page.evaluate((ym)=>{
  try{ setContaTab('cuadre'); }catch(e){}
  var pe={ modo:'mes', val:ym }, E=cuadreEfectivo(pe, ''), f={};
  E.filas.forEach(function(o){ f[o.nombre]={ cobrado:o.cobrado, ret:o.ret, falta:o.falta, cerrado:o.cerrado||0, faltAnt:o.faltAnt||0, antes:o.antes||0, sobra:o.sobra||0, despues:o.despues||0 }; });
  var PR=efePareo(), cubs={}; for(var k in PR.cob) PR.cob[k].forEach(function(c){ cubs[c.id+'|'+c.j]=c.cub; });
  return { f:f, pareo:E.pareo, cubs:cubs };
}, ym);
const servidor=()=>{
  const ctx0={console,Date,Math,JSON,PropertiesService:{getScriptProperties:()=>({getProperty:()=>null})},Logger:{log(){}},Utilities:{formatDate:(d)=>String(d)},Session:{getScriptTimeZone:()=>'America/La_Paz'}};
  ctx0.globalThis=ctx0; vm.createContext(ctx0); vm.runInContext(fs.readFileSync(GS,'utf8'), ctx0); return ctx0;
};
const cubsSrv=(G, L)=>{ const K=G.waEfeCuentas_(L), S={}; for(const k in K.cob) K.cob[k].forEach(c=>{ S[c.id+'|'+c.j]=Math.round(c.cub*100)/100; }); return { S, K }; };
const iguales=(S, W)=>{ const ks=[...new Set([...Object.keys(S), ...Object.keys(W)])]; return { n:ks.length, mal:ks.filter(k=>Math.abs((S[k]??-1)-(W[k]??-1))>0.005).map(k=>[k,S[k],W[k]]) }; };

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const G=servidor();
  /* El .gs lleva la regla desde la 2026-11-07-f (`waEfeTapar_`). Con uno anterior (el de `main` hasta que el dueño implemente la 07-f) las
     comparaciones con el servidor se dicen y se saltan, sin contar (como `test_efe_pareo` 9b/9c); `GS=…` las fuerza. */
  const gsRegla=typeof G.waEfeTapar_==='function' || !!process.env.GS;
  const salta=(n)=>console.log('– '+n+': el .gs es anterior a la 2026-11-07-f (sin la regla): se compara al implementarla');

  // ===== noviembre (sábado 07/11 18:10) =====
  let page=await abrir(browser, '2026-11-07T18:10:00-04:00');
  await montar(page, NOV);
  const N=await cuadre(page, '2026-11'), O=await cuadre(page, '2026-10');
  // A
  chk('A1. la hora: el retiro de las 09:11 se lleva el cobro del 06/11, no el de las 10:41 (que entró después)', N.cubs['a1|0']===1500 && N.cubs['a2|0']===0, { a1:N.cubs['a1|0'], a2:N.cubs['a2|0'] });
  chk('A2. a Mauricio le queda en la mano el de hoy (1.500)', N.f['Mauricio Merida'] && N.f['Mauricio Merida'].falta===1500, N.f['Mauricio Merida']);
  // B
  chk('B1. el día de gracia (03/11) el retiro de 3.500 va a octubre: 3.000 + 500 del 31/10', N.cubs['b1|0']===3000 && N.cubs['b2|0']===500, { b1:N.cubs['b1|0'], b2:N.cubs['b2|0'] });
  chk('B2. pasada la gracia (06/11) el de 1.000 que no da justo se lleva SOLO noviembre: 910 + 90 (no los 490 de octubre)', N.cubs['b3|0']===910 && N.cubs['b4|0']===90 && N.cubs['b2|0']===500, { b2:N.cubs['b2|0'], b3:N.cubs['b3|0'], b4:N.cubs['b4|0'] });
  chk('B3. Juan Pablo noviembre: le quedan 1.390 + 1.240 = 2.630', N.f['Juan Pablo Paredes'] && N.f['Juan Pablo Paredes'].falta===2630, N.f['Juan Pablo Paredes']);
  // C
  chk('C1. octubre cerrado: los 490 de octubre sin retiro no quedan «en la mano» (🔒 cerrado)', O.f['Juan Pablo Paredes'] && O.f['Juan Pablo Paredes'].falta===0 && O.f['Juan Pablo Paredes'].cerrado===490, O.f['Juan Pablo Paredes']);
  const lista=await page.evaluate(()=>{ try{ setContaTab('cuadre'); }catch(e){} try{ document.getElementById('cua-mes').value='2026-10'; }catch(e){}
    CUADRE_PE_PRUEBA={ modo:'mes', val:'2026-10' }; return true; });
  const listaOct=await page.evaluate(()=>{
    var orig=cuadrePeriodo; cuadrePeriodo=function(){ return { modo:'mes', val:'2026-10' }; };
    try{ abrirEfectivo('Juan Pablo Paredes'); return (document.getElementById('efe-lista')||{}).innerText||''; } finally { cuadrePeriodo=orig; try{ closeModal(); }catch(e){} }
  });
  chk('C2. la lista de octubre lo dice: «🔒 octubre cerrado»', /🔒 octubre cerrado/.test(listaOct), listaOct.slice(0,400));
  // E
  chk('E1. el retiro con el cobro TILDADO se lleva ese (03/11) y no el del mismo monto más nuevo', N.cubs['e1|0']===800 && N.cubs['e2|0']===0, { e1:N.cubs['e1|0'], e2:N.cubs['e2|0'] });
  // F. el formulario del retiro
  const F=await page.evaluate(async ()=>{
    var esp=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
    abrirRetiros(); await esp(60);
    var sel=document.getElementById('ret-entrega'); sel.value='Fernando Peinado'; retEntregaCambio(); await esp(30);
    var m=document.getElementById('ret-monto'); m.value='1860'; retCobrosPintar(); await esp(30);
    var box=document.getElementById('ret-cobros'), o={};
    o.txt=box.innerText;
    o.marcados=[].filter.call(box.querySelectorAll('input[type=checkbox]'), function(i){ return i.checked; }).map(function(i){ return i.getAttribute('data-k'); });
    o.suma=(box.querySelector('.ret-cob-suma')||{}).innerText||'';
    // tildar a mano el de 700 → no da justo
    var cb=[].filter.call(box.querySelectorAll('input[type=checkbox]'), function(i){ return /^f2\|/.test(i.getAttribute('data-k')); })[0];
    cb.checked=true; retTickToggle(); await esp(20);
    o.suma2=(document.querySelector('#ret-cobros .ret-cob-suma')||{}).innerText||'';
    o.mano=/elegidos a mano/i.test(document.getElementById('ret-cobros').innerText);
    // destildarlo y guardar
    var cb2=[].filter.call(document.querySelectorAll('#ret-cobros input[type=checkbox]'), function(i){ return /^f2\|/.test(i.getAttribute('data-k')); })[0];
    cb2.checked=false; retTickToggle(); await esp(20);
    RET_FORM.notas=['2469'];
    var n0=window._guardados.length; guardarRetiroForm(); await esp(200);
    var g=window._guardados.slice(n0).filter(function(x){ return /^__ret_/.test(x.id); })[0]||null;
    o.garantia=g && g.garantia; o.id=g && g.id;
    // corregirlo: los tildados vuelven
    if(g){ editarRetiro(g.id); await esp(60); o.edit=RET_FORM.tickMano && JSON.stringify(RET_FORM.tick); o.editTxt=(document.getElementById('ret-cobros')||{}).innerText||''; }
    try{ closeRetiros(); }catch(e){}
    return o;
  });
  chk('F1. lista los cobros de Fernando con el CLIENTE y el N° de nota (no la OC)', /CLIENTE ROSA/.test(F.txt) && /CLIENTE CARLOS/.test(F.txt) && /CLIENTE HOY/.test(F.txt) && /nota 5001/.test(F.txt) && !/11-001/.test(F.txt), F.txt.slice(0,400));
  chk('F2. con 1.860 se tilda solo el que da justo (CLIENTE ROSA) y la suma da ✅', F.marcados.length===1 && /^f1\|2026-11-05\|1860$/.test(F.marcados[0]) && /✅ Tildado Bs 1\.860,00 = el monto/.test(F.suma), { m:F.marcados, s:F.suma });
  chk('F3. tildar a mano otro cambia la suma y avisa que sobra', /sobran Bs 700,00/.test(F.suma2) && F.mano, F.suma2);
  chk('F4. al guardar, lo tildado queda en la fila del retiro (columna «Garantía»)', F.garantia==='efe:f1|2026-11-05|1860', F.garantia);
  chk('F5. al corregir el retiro, los cobros tildados vuelven', F.edit==='[{"id":"f1","f":"2026-11-05","m":1860}]', { e:F.edit });
  // G. el servidor
  if(!gsRegla) salta('G1, G2'); else {
  const SN=cubsSrv(G, NOV), cmpN=iguales(SN.S, N.cubs);
  chk('G1. el servidor empareja IGUAL que la página, cobro por cobro ('+cmpN.n+')', cmpN.n>=12 && !cmpN.mal.length, cmpN.mal);
  const pend=G.waEfePendiente_(NOV, '2026-11-09'), dp=(n)=>pend.find(o=>o.nombre===n);
  chk('G2. el aviso del lunes: Juan Pablo 2.630 y Mauricio 1.500 (por la fecha del cobro; lo de octubre cerrado no aparece)', dp('Juan Pablo Paredes') && dp('Juan Pablo Paredes').bs===2630 && dp('Mauricio Merida') && dp('Mauricio Merida').bs===1500, pend.map(o=>o.nombre+' '+o.bs));
  }
  if(page.errores.length) chk('sin errores en la página (noviembre)', false, page.errores);
  await page.context().close();

  // ===== diciembre (sábado 05/12) =====
  page=await abrir(browser, '2026-12-05T10:00:00-04:00');
  await montar(page, DIC);
  const D=await cuadre(page, '2026-12');
  chk('D1. Isabel diciembre: su cobro de diciembre está retirado y aparece «Faltante de noviembre: 700»', D.f['Isabel Robledo'] && D.f['Isabel Robledo'].falta===0 && D.f['Isabel Robledo'].faltAnt===700, D.f['Isabel Robledo']);
  chk('D2. el día de gracia (01/12) el retiro de 1.700 va primero a noviembre: 1.200 + 500 de diciembre', D.cubs['c1|0']===1200 && D.cubs['c2|0']===500 && D.f['Carola Chavez'] && D.f['Carola Chavez'].falta===1000 && D.f['Carola Chavez'].faltAnt===0, { c1:D.cubs['c1|0'], c2:D.cubs['c2|0'], f:D.f['Carola Chavez'] });
  const tablaDic=await page.evaluate(()=>{ var orig=cuadrePeriodo; cuadrePeriodo=function(){ return { modo:'mes', val:'2026-12' }; };
    try{ renderCuadreRetiros(); return (document.getElementById('cua-retiros')||{}).innerText||''; } finally { cuadrePeriodo=orig; } });
  chk('D3. la tabla de diciembre lo dice: «⚠️ Faltante de noviembre: Bs 700,00 sin retirar»', /Faltante de noviembre: Bs 700,00 sin retirar/.test(tablaDic), tablaDic.slice(0,500));
  if(!gsRegla) salta('D4'); else { const SD=cubsSrv(G, DIC), cmpD=iguales(SD.S, D.cubs);
  chk('D4. el servidor también ('+cmpD.n+' cobros)', cmpD.n>=4 && !cmpD.mal.length, cmpD.mal); }
  if(page.errores.length) chk('sin errores en la página (diciembre)', false, page.errores);
  await page.context().close();

  // ===== H. la planilla real (opcional, fuera del repo) =====
  if(process.env.REAL){
    const L=JSON.parse(fs.readFileSync(process.env.REAL,'utf8')).pedidos;
    page=await abrir(browser, process.env.REAL_RELOJ || '2026-11-07T19:30:00-04:00');
    await montar(page, L);
    const RN=await cuadre(page, '2026-11');
    const SR=gsRegla ? cubsSrv(G, L) : null, cmpR=SR ? iguales(SR.S, RN.cubs) : null;
    const enMano=Object.keys(RN.f).reduce((a,k)=>a+RN.f[k].falta,0);
    if(!cmpR) salta('H1'); else chk('H1. planilla real: página y servidor iguales en los '+cmpR.n+' cobros en efectivo desde octubre', !cmpR.mal.length, cmpR.mal.slice(0,5));
    console.log('   noviembre por recoger según el Cuadre: Bs '+Math.round(enMano*100)/100, JSON.stringify(Object.keys(RN.f).filter(k=>RN.f[k].falta>0.005).map(k=>k+' '+RN.f[k].falta)));
    await page.context().close();
  }

  console.log(`\n${PASS} bien, ${FAIL} mal`);
  await browser.close();
  process.exit(FAIL?1:0);
})();
