/* 🎯 LA META DEL DÍA (14/11, mejora 256; el dueño la aprobó con la muestra del 14/11).

   LO QUE CUIDA (servidor de mentira; solo datos INVENTADOS; reloj CLAVADO el viernes 13/11/2026 a las 10:00 de Bolivia):
   1. Meta de hoy = (presupuesto − vendido hasta ayer) ÷ días hábiles que quedan con hoy; lo mismo para la mínima. Sin meses cerrados con ventas,
      todos los días pesan 1 (parejo). Isabel (Central): (160.000 − 100.000) ÷ 15 = Bs 4.000; mínima (125.000 − 100.000) ÷ 15 = Bs 1.667.
   2. La base es la de «💰 Tu comisión» (`ccmCuenta`): hasta ayer + lo cargado hoy = lo vendido de la comisión. Lo cargado hoy que se entrega en
      diciembre se dice aparte y no suma.
   3. El domingo cuenta como día hábil SOLO en las tiendas de `TIENDAS_DOMINGO` (Mirian, Mia Plaza: 18 días; Isabel, Central: 15 y el domingo
      no es día hábil).
   4. Con meses cerrados, cada día pesa según lo que se vende ese día de la semana (por la carga, con `pryVentas`), suavizado y entre 0,5 y 2;
      la clase de tienda (abre o no el domingo) tiene sus propios pesos.
   5. «☀️ Tu día»: «🎯 Hoy: llevás Bs X de Bs Y», lo que falta para el presupuesto y la mínima y «¿cómo se calcula?» paso a paso.
   6. No sale: sin metas guardadas, sin meta suya, Eduardo, ROHO, «👑 Ver todos», el mes cerrado, y en Playwright sin `META_DIA_PRUEBA`.
   7. 🧽 Bloki desde las 17 h, si lleva menos de la mitad: «Te faltan Bs 2.500 para el día» + la hora fuerte de su tienda (o «entra más gente»
      con el contador `mallResumenDia`); antes de las 17 o pasada la mitad, nada.
   8. Solo mira: no guarda nada. En el celular (390 px) no ensancha la página.
   Se corre:  node tests/test_meta_dia.js   (PEDIDOS=… para correrla contra otra versión; SALIDA=<carpeta> deja capturas de «Tu día») */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const SALIDA = process.env.SALIDA || '';

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true;
  try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  window.MIS_TOP_PRUEBA=1; window.META_DIA_PRUEBA=1;
  var ts=function(d, h){ return new Date(d+'T'+(h||'10:00')+':00-04:00').getTime(); };
  var L=[], n=0;
  var V=function(id, v, f, reg, bs, h, extra){ n++; L.push(Object.assign({ id:id, oc:'11-'+(400+n), nota:'N'+id, cliente:'CLIENTE '+id, celular:'7200000'+n, fecha:f, turno:'AM', zona:'Norte',
    direccion:'CALLE INVENTADA', maps:'https://maps.google.com/?q=-17.78,-63.18', vendedor:v, productos:[{ desc:'COLCHON SOFT', medida:'140x190', codigo:'', cant:1, precio:bs }], saldo:0, acuenta:0,
    pagado:true, metodoPago:'Efectivo '+bs+' @'+reg+' #'+id, ts:ts(reg, h), rev:1 }, extra||{})); };
  V('i1', 'Isabel Robledo', '2026-11-05', '2026-11-03', 100000);
  V('ih', 'Isabel Robledo', '2026-11-20', '2026-11-13', 1500, '09:30');      // cargada hoy, se entrega en noviembre
  V('id', 'Isabel Robledo', '2026-12-05', '2026-11-13', 3000, '09:40');      // cargada hoy, se entrega en diciembre: cuenta en diciembre
  V('m1', 'Mirian Salazar', '2026-11-09', '2026-11-04', 40000);
  V('f1', 'Maria Flores', '2026-11-06', '2026-11-02', 140000);                // ya pasó su presupuesto
  V('c1', 'Carola Chavez', '2026-11-06', '2026-11-02', 20000);
  V('e1', 'Eduardo Añez', '2026-11-11', '2026-11-06', 30000);
  V('o1', 'ROHO', '2026-11-11', '2026-11-06', 30000);
  /* Fabián (Central, sin meta): lo que vende a las 18 h en Central, para «la hora fuerte» */
  ['2026-11-06','2026-11-07','2026-11-10'].forEach(function(d, i){ V('fg'+i, 'Fabián Godoy', d, d, 500, '18:20', { direccion:'SALIÓ DE TIENDA · Central', zona:'TIENDA', fecha:'' }); });
  var ESC={ heaven:{ t:[['min',100,2],['pres',100,2.75]], bono:1 }, suena:{ t:[['min',100,2]], bono:0 } };
  window._VD={ 'Isabel Robledo':[125000,160000], 'Mirian Salazar':[100000,130000], 'Maria Flores':[100000,130000], 'Eduardo Añez':[10000,20000], 'ROHO':[1000,2000] };
  window._metas=function(conVd){ return { id:'__metas__', fecha:'', cliente:'🎯 METAS', rev:3, observaciones:JSON.stringify({ v:1, m:{
    '2026-10':{ heaven:150000, suena:40000, t:1, vd:{ 'Isabel Robledo':[125000,160000] }, esc:ESC },
    '2026-11':conVd ? { heaven:160000, suena:50000, t:2, vd:window._VD, esc:ESC } : { heaven:160000, suena:50000, t:2 } } }) }; };
  L.push(window._metas(true));
  window._L=L; window._HIST=[];
  /* la historia de agosto a octubre (para los pesos): Maria (Buenos Aires, no abre el domingo) vende 3.000 los viernes y 1.000 los otros
     días; Mirian (Mia Plaza, abre el domingo) 500 el domingo, 2.000 el sábado y 1.000 los otros días */
  window._armarHist=function(){
    var H=[], k=0;
    for(var d='2026-08-01'; d<='2026-10-31'; d=stockSumarDias(d,1)){
      var w=dowDe(d);
      if(pryDiaHabil(d)) H.push({ id:'h'+(k++), v:'Maria Flores', d:d, bs:(w===5?3000:1000) });
      if(pryDiaHabil(d) || (w===0 && !FERIADOS[d] && !FERIADOS_PASADOS[d])) H.push({ id:'h'+(k++), v:'Mirian Salazar', d:d, bs:(w===0?500:(w===6?2000:1000)) });
    }
    return H.map(function(x){ return { id:x.id, oc:'09-'+x.id, nota:x.id, cliente:'HIST '+x.id, celular:'7300000', fecha:x.d, turno:'AM', zona:'Norte', direccion:'CALLE', maps:'', vendedor:x.v,
      productos:[{ desc:'COLCHON SOFT', medida:'140x190', codigo:'', cant:1, precio:x.bs }], saldo:0, acuenta:0, pagado:true, metodoPago:'Efectivo '+x.bs+' @'+x.d+' #'+x.id, ts:ts(x.d, '11:00'), rev:1 }; });
  };
  window.SAVES=[];
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window._L.concat(window._HIST))) }); };
  apiSave=function(r){ window.SAVES.push(JSON.parse(JSON.stringify(r))); return Promise.resolve({ ok:true, pedido:r }); };
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  window._ver=async function(v, todos){ await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok'; showView('mis'); MIS_TODOS=!!todos;
    var mv=document.getElementById('mis-vendedor'); mv.value=v; renderMis(); await _esperar(200); };
  window._txt=function(id){ var e=document.getElementById(id); return e && !e.hidden && e.offsetParent!==null ? e.innerText.replace(/ /g,' ').replace(/\s+/g,' ').trim() : ''; };
  window._md=function(v, d){ if(typeof metaDiaDatos!=='function') return {}; var o=metaDiaDatos(v, d); if(!o) return null;
    return { antes:o.antes, hoy:o.hoy, otro:o.otro, otroYm:o.otroYm, dias:o.dias.length, hoyHabil:o.hoyHabil, peso:o.peso, rel:o.rel, suma:o.suma, pareja:o.W.pareja, w:o.W.w,
      pres:o.pres, min:o.min, tienda:o.tienda, dom:o.dom }; };
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (w) => {
    const ctx = await browser.newContext({ viewport:{ width:w, height:900 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message));
    page.on('dialog', d => d.accept());
    await ctx.route(/^https?:\/\//, r => r.abort());
    await page.clock.setFixedTime(new Date('2026-11-13T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate(PREPARAR);
    return { ctx, page };
  };
  let { ctx, page } = await abrir(1440);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __err:String((e&&e.message)||e).slice(0,400) }; } };
  let r;

  /* 1-3 · parejo */
  console.log('── 1-3. La cuenta, pareja ──');
  r = await ev(async () => { await _ver('Isabel Robledo');
    return { I:_md('Isabel Robledo'), M:_md('Mirian Salazar'), com:(typeof misComisionDatos==='function' ? (misComisionDatos('Isabel Robledo')||{}).bs : null), comM:(misComisionDatos('Mirian Salazar')||{}).bs,
      Isun:_md('Isabel Robledo','2026-11-15'), Msun:_md('Mirian Salazar','2026-11-15'), saves:SAVES.length }; });
  const I=r.I||{}, M=r.M||{};
  chk('1a · sin meses cerrados con ventas, todos los días pesan 1 (parejo)', I.pareja===true && (I.w||[]).every(function(x){ return x===1; }), I.w);
  chk('1b · Isabel (Central, viernes 13/11): quedan 15 días hábiles con hoy (sin domingos)', I.dias===15 && I.hoyHabil===true && I.dom===false, [I.dias, I.tienda]);
  chk('1c · presupuesto: (160.000 − 100.000 vendido hasta ayer) ÷ 15 = Bs 4.000 hoy; lleva 1.500 → le faltan 2.500', I.pres && I.pres.falta===60000 && I.pres.dia===4000 && I.pres.parejo===4000 && I.pres.queda===2500, I.pres);
  chk('1d · mínima: (125.000 − 100.000) ÷ 15 = 1.666,67 → Bs 1.667 (redondeado para arriba)', I.min && I.min.falta===25000 && I.min.dia===1667, I.min);
  chk('2a · «vendido hoy» = lo cargado hoy que cuenta en noviembre (1.500); lo cargado hoy para diciembre (3.000) va aparte', I.hoy===1500 && I.otro===3000 && I.otroYm==='2026-12', [I.hoy, I.otro, I.otroYm]);
  chk('2b · hasta ayer + hoy = lo vendido de «💰 Tu comisión» (101.500)', I.antes+I.hoy===r.com && r.com===101500, [I.antes, I.hoy, r.com]);
  chk('3a · Mirian (Mia Plaza abre el domingo): 18 días con los 3 domingos; (130.000 − 40.000) ÷ 18 = Bs 5.000', M.dom===true && M.dias===18 && M.pres && M.pres.dia===5000 && M.antes+M.hoy===r.comM, [M.dias, M.pres, r.comM]);
  chk('3b · el domingo 15/11: para Isabel no es día hábil (meta 0); para Mirian sí', r.Isun && r.Isun.hoyHabil===false && r.Isun.pres.dia===0 && r.Msun && r.Msun.hoyHabil===true && r.Msun.pres.dia>0, [r.Isun && r.Isun.pres, r.Msun && r.Msun.pres]);
  chk('8a · solo mira: no guardó nada', r.saves===0, r.saves);

  /* 5 · «Tu día» */
  console.log('── 5. En «Tu día» ──');
  r = await ev(async () => { await _ver('Isabel Robledo'); var d=document.querySelector('#mis-meta details'); var antes=_txt('mis-meta'); if(d) d.open=true; await _esperar(30);
    return { txt:antes, abierto:_txt('mis-meta'), top:_txt('mis-top'), com:_txt('mis-com') }; });
  chk('5a · «🎯 Hoy: llevás Bs 1.500 de Bs 4.000», con la barra, debajo de «💰 Tu comisión»', /🎯 Hoy: llevás Bs 1\.500 de Bs 4\.000/.test(r.txt) && (r.top||'').indexOf(r.com)>=0 && (r.top||'').indexOf(r.com) < (r.top||'').indexOf('🎯 Hoy'), r.txt);
  chk('5b · «Para el presupuesto faltan Bs 2.500 · para la mínima faltan Bs 167»', /Para el presupuesto faltan Bs 2\.500 · para la mínima faltan Bs 167/.test(r.txt), r.txt);
  chk('5c · lo de diciembre se dice: «+ Bs 3.000 cargado hoy que se entrega en diciembre: cuenta para ese mes»', /\+ Bs 3\.000 cargado hoy que se entrega en diciembre: cuenta para ese mes/.test(r.txt), r.txt);
  chk('5d · «¿cómo se calcula?»: presupuesto 160.000 − vendido hasta ayer 100.000 = falta 60.000 ÷ 15 días = Bs 4.000; la mínima igual',
    /Presupuesto de noviembre Bs 160\.000 − Vendido hasta ayer Bs 100\.000 = Falta para fin de mes Bs 60\.000 ÷ Días hábiles que quedan \(con hoy\) 15 = Parejo por día Bs 4\.000 = Meta de hoy Bs 4\.000/.test(r.abierto)
    && /Mínima de noviembre Bs 125\.000/.test(r.abierto) && /Todos los días pesan lo mismo/.test(r.abierto), r.abierto);
  r = await ev(async () => { await _ver('Maria Flores'); return { txt:_txt('mis-meta'), md:_md('Maria Flores') }; });
  chk('5e · Maria ya pasó su presupuesto: «🎯 Ya llegaste a tu presupuesto de noviembre (Bs 130.000)»', /Ya llegaste a tu presupuesto de noviembre \(Bs 130\.000\)/.test(r.txt) && r.md && r.md.pres.llego===true && r.md.pres.dia===0, r.txt);

  /* 6 · cuándo no sale */
  console.log('── 6. Cuándo no sale ──');
  r = await ev(async () => { var o={}; for(const v of ['Carola Chavez','Eduardo Añez','ROHO']){ await _ver(v); o[v]={ el:!!document.getElementById('mis-meta'), md:_md(v) }; }
    await _ver('Isabel Robledo', true); o.todos=!!document.getElementById('mis-meta');
    window.META_DIA_PRUEBA=0; await _ver('Isabel Robledo'); o.sinFlag=!!document.getElementById('mis-meta'); window.META_DIA_PRUEBA=1;
    window._L=window._L.filter(function(p){ return p.id!=='__metas__'; }).concat([_metas(false)]); await _ver('Isabel Robledo'); o.sinMetas=!!document.getElementById('mis-meta'); o.mdSin=_md('Isabel Robledo');
    window._L=window._L.filter(function(p){ return p.id!=='__metas__'; }).concat([_metas(true)]); await _ver('Isabel Robledo');
    return o; });
  chk('6a · Carola (sin meta), Eduardo y ROHO: nada', r['Carola Chavez'].el===false && r['Carola Chavez'].md===null && r['Eduardo Añez'].el===false && r['Eduardo Añez'].md===null && r.ROHO.el===false && r.ROHO.md===null, r);
  chk('6b · con «👑 Ver todos», nada', r.todos===false, r.todos);
  chk('6c · en Playwright sin META_DIA_PRUEBA, nada', r.sinFlag===false, r.sinFlag);
  chk('6d · sin las metas de noviembre guardadas (solo sugeridas), nada', r.sinMetas===false && r.mdSin===null, r);

  /* 4 · los pesos */
  console.log('── 4. Pesados por día de la semana ──');
  r = await ev(async () => {
    window._HIST=_armarHist(); await _ver('Isabel Robledo');
    var esperar=function(dom){
      var S=[0,0,0,0,0,0,0], N=[0,0,0,0,0,0,0], nd=0;
      window._HIST.forEach(function(p){ var esDom=/Mirian/.test(p.vendedor); if(esDom!==dom) return; S[dowDe(p.fecha)]+=p.productos[0].precio; });
      for(var d='2026-08-01'; d<='2026-10-31'; d=stockSumarDias(d,1)){ var ok=pryDiaHabil(d) || (dom && dowDe(d)===0 && !FERIADOS[d] && !FERIADOS_PASADOS[d]); if(ok){ N[dowDe(d)]++; nd++; } }
      var A=S.reduce(function(a,b){ return a+b; },0)/nd;
      return S.map(function(s, i){ if(!N[i]) return 1; var raw=(s/N[i])/A, w=1+(raw-1)*N[i]/(N[i]+4); return Math.round(Math.max(0.5, Math.min(2, w))*100)/100; });
    };
    return { I:_md('Isabel Robledo'), Msun:_md('Mirian Salazar','2026-11-15'), Msab:_md('Mirian Salazar','2026-11-14'), eS:esperar(false), eD:esperar(true), txt:(function(){ var d=document.querySelector('#mis-meta details'); if(d) d.open=true; return _txt('mis-meta'); })() };
  });
  const W=r.I||{};
  chk('4a · con agosto a octubre cargados, los pesos de las tiendas que no abren el domingo son los de la cuenta (venta del día ÷ día promedio, suavizada)', W.pareja===false && JSON.stringify(W.w)===JSON.stringify(r.eS), [W.w, r.eS]);
  chk('4b · el viernes pesa más que un día común (más de 1) y el lunes menos; todos entre 0,5 y 2', W.w && W.w[5]>1 && W.w[1]<1 && W.w.every(function(x){ return x>=0.5 && x<=2; }), W.w);
  chk('4c · la meta de hoy (viernes) = falta × peso del viernes ÷ la suma de los pesos de los días que quedan', W.pres && W.pres.dia===Math.ceil(W.pres.falta*W.w[5]/W.suma-1e-9) && W.pres.dia>4000 && W.peso===W.w[5], [W.pres, W.suma, W.peso]);
  chk('4d · las tiendas que abren el domingo tienen sus propios pesos: el domingo pesa menos (Mirian vende la mitad) y el sábado más', r.Msun && JSON.stringify(r.Msun.w)===JSON.stringify(r.eD) && r.eD[0]<1 && r.eD[6]>1 && r.Msun.peso===r.eD[0] && r.Msun.pres.dia < r.Msab.pres.dia, [r.eD, r.Msun && r.Msun.pres, r.Msab && r.Msab.pres]);
  chk('4e · «¿cómo se calcula?» muestra el peso de hoy y de dónde sale', /× Peso de hoy \(viernes\)/.test(r.txt) && /un viernes vende/.test(r.txt) && /del 01\/08\/2026 al 31\/10\/2026/.test(r.txt), r.txt);

  /* 7 · Bloki a las 17 h */
  console.log('── 7. Bloki a las 17 h ──');
  r = await ev(async () => { window._HIST=[]; await _ver('Isabel Robledo'); return { a10:metaDiaAviso('Isabel Robledo') }; });
  chk('7a · a las 10:00 Bloki no dice nada', r.a10===null, r.a10);
  await page.clock.setFixedTime(new Date('2026-11-13T17:30:00-04:00'));
  r = await ev(async () => { await _ver('Isabel Robledo'); var a=metaDiaAviso('Isabel Robledo'); var L=[]; try{ L=asisAvisos().filter(function(x){ return /^mdd\|/.test(x.k); }); }catch(e){}
    window.mallResumenDia=function(){ return { horas:[{ h:18, atendidas:5, compraron:1 }, { h:19, atendidas:2, compraron:0 }] }; };
    var g=metaDiaAviso('Isabel Robledo'); delete window.mallResumenDia;
    return { a:a, n:L.length, g:g }; });
  chk('7b · a las 17:30 con Bs 1.500 de Bs 4.000 (menos de la mitad): «Te faltan Bs 2.500 para el día»', r.a && r.a.t==='Te faltan Bs 2.500 para el día' && /Llevás Bs 1\.500 de Bs 4\.000/.test(r.a.x) && r.a.k==='mdd|2026-11-13|isabel robledo', r.a);
  chk('7c · con la hora fuerte de su tienda: «A las 18 h es cuando más se vende en Central.»', r.a && /A las 18 h es cuando más se vende en Central\./.test(r.a.x), r.a && r.a.x);
  chk('7d · con el contador de la gente (`mallResumenDia`): «A las 18 h entra más gente.»', r.g && /A las 18 h entra más gente\./.test(r.g.x), r.g && r.g.x);
  chk('7e · Bloki lo trae entre sus avisos de Mis pedidos', r.n===1, r.n);
  r = await ev(async () => { window._L.push({ id:'ih2', oc:'11-499', nota:'Nih2', cliente:'CLIENTE ih2', celular:'72000099', fecha:'2026-11-21', turno:'AM', zona:'Norte', direccion:'CALLE', maps:'', vendedor:'Isabel Robledo',
      productos:[{ desc:'COLCHON SOFT', medida:'140x190', codigo:'', cant:1, precio:1000 }], saldo:0, acuenta:0, pagado:true, metodoPago:'Efectivo 1000 @2026-11-13 #ih2', ts:new Date('2026-11-13T16:00:00-04:00').getTime(), rev:1 });
    await _ver('Isabel Robledo'); return { a:metaDiaAviso('Isabel Robledo'), hoy:(_md('Isabel Robledo')||{}).hoy }; });
  chk('7f · con Bs 2.500 (más de la mitad de 4.000), nada', r.a===null && r.hoy===2500, r);

  if(SALIDA){ await page.setViewportSize({ width:1280, height:1500 });
    await ev(async () => { await _ver('Isabel Robledo'); var d=document.querySelector('#mis-meta details'); if(d) d.open=true; var m=document.getElementById('mis-top'); if(m) window.scrollTo(0, m.getBoundingClientRect().top+window.scrollY-120); await _esperar(120); });
    await page.screenshot({ path:path.join(SALIDA, 'mall_caja_meta_1280.png'), fullPage:false }); await page.setViewportSize({ width:1440, height:900 }); }

  /* 6e · el mes cerrado */
  r = await ev(async () => {
    window._L.push({ id:'__cierre_comercial__', fecha:'', cliente:'🏁 CIERRE COMERCIAL', rev:2, observaciones:JSON.stringify({ v:1, m:{ '2026-11':{ c:Date.now(), por:'Prueba',
      vt:[{ v:'Isabel Robledo', g:'heaven', n:1, u:1, bs:100000, ti:0, mi:125000, pr:160000, pc:0, co:0, bp:1, bo:0, to:0 }], s:{ i1:[0,100000,0] }, esc:{ heaven:{ t:[['min',100,2]], bono:1 }, suena:{ t:[['min',100,2]], bono:0 } }, aj:{} } } }) });
    await _ver('Isabel Robledo'); var o={ el:!!document.getElementById('mis-meta') };
    window._L=window._L.filter(function(p){ return p.id!=='__cierre_comercial__'; }); await _ver('Isabel Robledo'); return o; });
  chk('6e · con noviembre cerrado en el cierre comercial, no sale', r.el===false, r);

  /* 8b · el celular */
  await ctx.close();
  ({ ctx, page } = await abrir(390));
  r = await page.evaluate(async () => { await _ver('Isabel Robledo'); var d=document.querySelector('#mis-meta details'); if(d) d.open=true; await _esperar(60);
    var m=document.getElementById('mis-meta'); if(m) m.scrollIntoView({ block:'center' }); await _esperar(60);
    return { sw:document.documentElement.scrollWidth, iw:window.innerWidth, el:!!m }; });
  chk('8b · en el celular (390 px) «Tu día» con la meta abierta no ensancha la página', r.el && r.sw<=r.iw, r);
  if(SALIDA) await page.screenshot({ path:path.join(SALIDA, 'mall_caja_meta_390.png'), fullPage:false });

  chk('sin errores de JS', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
