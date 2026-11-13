/* 💰 TU COMISIÓN EN «TU DÍA» (13/11, mejora 190; dueño: «Comisión en vivo y meta del día en Tu mes»).

   LO QUE CUIDA (servidor de mentira; solo datos inventados; reloj CLAVADO el jueves 12/11/2026 a las 10:00 de Bolivia):
   1. Con las metas de noviembre GUARDADAS, la vendedora ve su comisión hasta hoy = su fila del «🏁 Cierre comercial» (`ccmDatos`), con el
      bono Titanio; lo vendido es el de «Por vendedor» de Proyección (también la venta de tienda) y lo que el cierre no cuenta (ya pagada
      en octubre) no cuenta y se dice.
   2. 📈 El tramo siguiente: cuánto falta, el % y la comisión que sería (la mínima, el presupuesto, el 120 % del presupuesto, el 80 % de
      Sueña); en el tramo más alto lo dice.
   3. 🎯 Lo que falta para el presupuesto y por día hábil: 16 días hábiles con hoy (sin domingos), 15 «desde mañana» después de las 20:00;
      si llegó, «✅ Llegaste a tu presupuesto» y lo de más.
   4. No sale: sin metas guardadas (las sugeridas no), sin meta suya, Eduardo, ROHO, «👑 Ver todos».
   5. Mes cerrado: la comisión congelada y el 🔒.
   6. En el celular (390 px) no ensancha la página; solo mira (no guarda nada).
   Se corre:  node tests/test_mis_comision.js   (PEDIDOS=… para correrla contra otra versión; SALIDA=<carpeta> deja dos capturas de «Tu día») */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const SALIDA = process.env.SALIDA || '';

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true;
  try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  window.MIS_TOP_PRUEBA=1;
  var ts=function(d, h){ return new Date(d+'T'+(h||'10:00')+':00-04:00').getTime(); };
  var L=[];
  /* una venta: id, OC, vendedor, entrega, cargada, total y (opcional) los renglones */
  var V=function(id, oc, v, f, reg, bs, prods, extra){ L.push(Object.assign({ id:id, oc:oc, nota:'N'+id, cliente:'CLIENTE '+id, celular:'7100000'+L.length, fecha:f, turno:'AM', zona:'Norte', direccion:'CALLE 1',
    maps:'https://maps.google.com/?q=-17.78,-63.18', vendedor:v, productos:prods||[{ desc:'COLCHON SOFT', medida:'140x190', codigo:'', cant:1, precio:bs }], saldo:0, acuenta:0, pagado:true,
    metodoPago:'Efectivo '+bs+' @'+reg+' #'+id, ts:ts(reg), rev:1 }, extra||{})); };
  V('i1','11-001','Isabel Robledo','2026-11-05','2026-11-03',100000);
  V('i2','11-002','Isabel Robledo','2026-11-20','2026-11-09',20000, [{ desc:'COLCHON TITANIO ICE', medida:'140x190', codigo:'', cant:1, precio:20000 }]);   // Titanio: bono 1 %
  V('i3','11-003','Isabel Robledo','','2026-11-10',10000, null, { direccion:'SALIÓ DE TIENDA · Central', zona:'TIENDA', turno:'' });                      // venta de tienda: Proyección la cuenta
  V('i0','10-099','Isabel Robledo','2026-11-03','2026-10-20',5000);                                                                                         // ya pagada en el cierre de octubre
  V('m1','11-011','Maria Flores','2026-11-06','2026-11-02',140000);
  V('r1','11-021','Mirian Salazar','2026-11-09','2026-11-04',200000);
  V('j1','11-031','Jonathan Monje','2026-11-16','2026-11-10',50000);
  V('s1','11-041','Mauricio Merida','2026-11-10','2026-11-05',80000);
  V('c1','11-051','Carola Chavez','2026-11-11','2026-11-06',50000);
  V('e1','11-061','Eduardo Añez','2026-11-11','2026-11-06',30000);
  V('o1','11-071','ROHO','2026-11-11','2026-11-06',30000);
  var ESC={ heaven:{ t:[['min',100,2],['pres',100,2.75],['pres',120,3]], bono:1 }, suena:{ t:[['min',100,2],['pres',80,2.5]], bono:0 } };
  window._VD={ 'Isabel Robledo':[125000,160000], 'Maria Flores':[100000,130000], 'Mirian Salazar':[125000,160000], 'Jonathan Monje':[125000,160000],
               'Mauricio Merida':[75000,120000], 'Eduardo Añez':[10000,20000], 'ROHO':[1000,2000] };
  window._ESC=ESC;
  window._metas=function(conVd){ return { id:'__metas__', fecha:'', cliente:'🎯 METAS', rev:3, observaciones:JSON.stringify({ v:1, m:{
    '2026-10':{ heaven:150000, suena:40000, t:1, vd:{ 'Isabel Robledo':[125000,160000] }, esc:ESC },
    '2026-11':conVd ? { heaven:160000, suena:50000, t:2, vd:window._VD, esc:ESC } : { heaven:160000, suena:50000, t:2 } } }) }; };
  L.push(window._metas(true));
  /* el cierre de octubre: la i0 (entrega en noviembre) ya entró ahí → en noviembre no cuenta */
  L.push({ id:'__cierre_comercial__', fecha:'', cliente:'🏁 CIERRE COMERCIAL', rev:2, observaciones:JSON.stringify({ v:1, m:{ '2026-10':{ c:ts('2026-11-02'), por:'Prueba',
    vt:[{ v:'Isabel Robledo', g:'heaven', n:1, u:1, bs:5000, ti:0, mi:125000, pr:160000, pc:0, co:0, bp:1, bo:0, to:0 }], s:{ i0:[0,5000,0] }, esc:ESC, aj:{} } } }) });
  window._L=L;
  window.SAVES=[];
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window._L)) }); };
  apiSave=function(r){ window.SAVES.push(JSON.parse(JSON.stringify(r))); return Promise.resolve({ ok:true, pedido:r }); };
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  window._ver=async function(v, todos){ await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok'; showView('mis'); MIS_TODOS=!!todos;
    var mv=document.getElementById('mis-vendedor'); mv.value=v; renderMis(); await _esperar(200); };
  window._txt=function(id){ var e=document.getElementById(id); return e && !e.hidden && e.offsetParent!==null ? e.innerText.replace(/\s+/g,' ').trim() : ''; };
  window._fila=function(v){ var R=ccmDatos('2026-11'), f=R.filas.filter(function(r){ return normNombre(r.v)===normNombre(v); })[0]; return f ? { bs:f.bs, pc:f.pc, co:f.co, bo:f.bo, to:f.to } : null; };
  window._pry=function(v){ var R=proyeccionMes('2026-11'), o=null; R.marcas.forEach(function(m){ m.filas.forEach(function(r){ if(normNombre(r.vendedor)===normNombre(v)) o=r.vendido; }); }); return o; };
  /* sin la función (la página de antes) devuelve {}: las comprobaciones fallan sin cortar la prueba */
  window._com=function(v){ if(typeof misComisionDatos!=='function') return {}; var o=misComisionDatos(v); return o ? JSON.parse(JSON.stringify(o)) : null; };
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (w, h) => {
    const ctx = await browser.newContext({ viewport:{ width:w, height:900 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message));
    page.on('dialog', d => d.accept());
    await ctx.route(/^https?:\/\//, r => r.abort());
    await page.clock.setFixedTime(new Date('2026-11-12T'+(h||'10:00')+':00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate(PREPARAR);
    return { ctx, page };
  };
  let { ctx, page } = await abrir(1440);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __err:String((e&&e.message)||e).slice(0,300) }; } };

  /* 1 · Isabel: la comisión del cierre, lo vendido de Proyección */
  let r = await ev(async () => { await _ver('Isabel Robledo'); return { txt:_txt('mis-com'), com:_com('Isabel Robledo'), fila:_fila('Isabel Robledo'), pry:_pry('Isabel Robledo'), td:_txt('mis-top') }; });
  chk('1a · con las metas de noviembre guardadas, «Tu día» de Isabel trae «💰 Tu comisión de noviembre, hasta hoy»', /Tu comisión de noviembre, hasta hoy/.test(r.txt||'') && (r.td||'').indexOf(r.txt)>=0, r.txt);
  chk('1b · la comisión es la de su fila del cierre comercial: 130.000 × 2 % = 2.600 + bono Titanio 200 = Bs 2.800', r.com && r.fila && r.com.to===r.fila.to && r.fila.to===2800 && r.com.co===r.fila.co && r.com.bo===200 && r.com.pc===2, [r.com, r.fila]);
  chk('1c · el texto lo dice: «Bs 2.800», «2 % sobre Bs 130.000 vendidos», «bono Titanio Bs 200»', /Bs 2\.800/.test(r.txt) && /2 % sobre Bs 130\.000 vendidos/.test(r.txt) && /bono Titanio Bs 200/.test(r.txt), r.txt);
  chk('1d · lo vendido es el de Proyección (135.000, con la venta de tienda) menos la que ya se pagó en octubre (5.000), y lo dice', r.pry===135000 && r.com.bs===130000 && r.com.bs+r.com.fuera===r.pry && /sin 1 venta que no entra en este cierre \(Bs 5\.000/.test(r.txt), [r.pry, r.com && r.com.bs, r.com && r.com.fuera]);

  /* 2 · el tramo siguiente */
  chk('2a · Isabel: le faltan Bs 30.000 para su presupuesto (Bs 160.000) y pasar al 2,75 %: su comisión sería Bs 4.600 (4.400 + el bono)',
    r.com.sig && r.com.sig.falta===30000 && r.com.sig.pct===2.75 && r.com.sig.to===4600 && /Te faltan Bs 30\.000 para tu presupuesto \(Bs 160\.000\) y pasar al 2,75 %: tu comisión sería Bs 4\.600/.test(r.txt), [r.com.sig, r.txt]);
  r = await ev(async () => { var o={}; for(const v of ['Maria Flores','Mirian Salazar','Jonathan Monje','Mauricio Merida']){ await _ver(v); o[v]={ txt:_txt('mis-com'), com:_com(v), fila:_fila(v), pry:_pry(v) }; } return o; });
  const M=r['Maria Flores'], MI=r['Mirian Salazar'], J=r['Jonathan Monje'], S=r['Mauricio Merida'];
  chk('2b · Maria (140.000, ya pasó el presupuesto de 130.000, 2,75 %): le faltan Bs 16.000 para el 120 % de su presupuesto (Bs 156.000) y el 3 %: Bs 4.680',
    M.com && M.com.pc===2.75 && M.com.sig && M.com.sig.falta===16000 && M.com.sig.pct===3 && M.com.sig.to===4680 && /Te faltan Bs 16\.000 para el 120 % de tu presupuesto \(Bs 156\.000\) y pasar al 3 %: tu comisión sería Bs 4\.680/.test(M.txt), [M.com && M.com.sig, M.txt]);
  chk('2c · Mirian (200.000 = 125 % del presupuesto): «🏆 Ya estás en el tramo más alto (3 %)» y nada de «Te faltan» para un tramo', MI.com && MI.com.sig===null && MI.com.ultimo===true && /Ya estás en el tramo más alto \(3 %\)/.test(MI.txt) && !/para el .* y pasar al/.test(MI.txt), MI.txt);
  chk('2d · Jonathan (50.000, debajo de la mínima): comisión 0 y le faltan Bs 75.000 para su mínima (Bs 125.000) y el 2 %: Bs 2.500',
    J.com && J.com.to===0 && J.fila.to===0 && /todavía no llegaste a tu mínima/.test(J.txt) && /Te faltan Bs 75\.000 para tu mínima \(Bs 125\.000\) y pasar al 2 %: tu comisión sería Bs 2\.500/.test(J.txt), J.txt);
  chk('2e · Mauricio (Sueña, 80.000, 2 %): le faltan Bs 16.000 para el 80 % de su presupuesto (Bs 96.000) y el 2,5 %: Bs 2.400',
    S.com && S.com.pc===2 && S.com.to===1600 && /Te faltan Bs 16\.000 para el 80 % de tu presupuesto \(Bs 96\.000\) y pasar al 2,5 %: tu comisión sería Bs 2\.400/.test(S.txt), S.txt);
  chk('2f · las cuatro: la comisión y lo vendido son los del cierre comercial, y lo vendido es el de «Por vendedor» de Proyección',
    [M, MI, J, S].every(x => x.com && x.fila && x.com.to===x.fila.to && x.com.bs===x.fila.bs && x.com.bs===x.pry), [M, MI, J, S].map(x => [x.com && x.com.to, x.fila && x.fila.to, x.com && x.com.bs, x.pry]));

  /* 3 · el presupuesto por día */
  r = await ev(async () => { await _ver('Isabel Robledo'); return { txt:_txt('mis-com'), com:_com('Isabel Robledo'), dias:pryHabiles('2026-11-12','2026-11-30') }; });
  chk('3a · Isabel: le faltan Bs 30.000 para su presupuesto; quedan 16 días hábiles con hoy (los de la proyección, sin domingos) → Bs 1.875 por día',
    r.com.dias===16 && r.dias===16 && r.com.conHoy===true && r.com.porDia===1875 && /Para tu presupuesto \(Bs 160\.000\) te faltan Bs 30\.000: Bs 1\.875 por día · quedan 16 días hábiles, con hoy/.test(r.txt), [r.com.dias, r.com.porDia, r.txt]);
  chk('3b · Jonathan: Bs 110.000 en 16 días → Bs 6.875 por día', J.com.falta===110000 && J.com.porDia===6875 && /Bs 6\.875 por día/.test(J.txt), J.txt);
  chk('3c · Maria llegó: «✅ Llegaste a tu presupuesto (Bs 130.000) · llevás Bs 10.000 de más»', M.com.llego===true && M.com.deMas===10000 && /✅ Llegaste a tu presupuesto \(Bs 130\.000\) · llevás Bs 10\.000 de más/.test(M.txt) && !/por día/.test(M.txt), M.txt);
  chk('3d · Mirian llegó con Bs 40.000 de más', /Llegaste a tu presupuesto \(Bs 160\.000\) · llevás Bs 40\.000 de más/.test(MI.txt), MI.txt);

  r = await ev(async () => { var x=JSON.parse(JSON.stringify(window._L.filter(function(p){ return p.id==='i1'; })[0])); x.id='i4'; x.oc='11-004'; x.productos[0].precio=10000; x.metodoPago='Efectivo 10000 @2026-11-11 #i4';
    window._L.push(x); await _ver('Isabel Robledo'); var o={ com:_com('Isabel Robledo'), fila:_fila('Isabel Robledo'), txt:_txt('mis-com') };
    window._L=window._L.filter(function(p){ return p.id!=='i4'; }); await _ver('Isabel Robledo'); o.despues=_com('Isabel Robledo').to; return o; });
  chk('3f · una venta nueva de Bs 10.000 cambia la comisión al toque (140.000 × 2 % + 200 = Bs 3.000, igual que el cierre) y al sacarla vuelve a Bs 2.800',
    r.com && r.com.to===3000 && r.fila.to===3000 && /Bs 3\.000/.test(r.txt) && r.despues===2800, [r.com && r.com.to, r.fila, r.despues]);

  /* 4 · cuándo NO sale */
  r = await ev(async () => { var o={}; for(const v of ['Carola Chavez','Eduardo Añez','ROHO']){ await _ver(v); o[v]={ el:!!document.getElementById('mis-com'), com:_com(v), top:_txt('mis-top') }; } return o; });
  chk('4a · Carola (sin meta suya en noviembre): no sale nada, ni «sin meta»', r['Carola Chavez'].el===false && r['Carola Chavez'].com===null && /Tu día, Carola/.test(r['Carola Chavez'].top) && !/sin meta/i.test(r['Carola Chavez'].top), r['Carola Chavez']);
  chk('4b · Eduardo y ROHO no lo ven, aunque tengan una meta guardada', r['Eduardo Añez'].el===false && r['Eduardo Añez'].com===null && r['ROHO'].el===false && r['ROHO'].com===null, [r['Eduardo Añez'].el, r['ROHO'].el]);
  r = await ev(async () => { await _ver('Isabel Robledo', true); return { el:!!document.getElementById('mis-com'), top:_txt('mis-top') }; });
  chk('4c · con «👑 Ver todos» no sale', r.el===false && /El día del equipo/.test(r.top), r);
  r = await ev(async () => { window._L=window._L.filter(function(p){ return p.id!=='__metas__'; }).concat([_metas(false)]); await _ver('Isabel Robledo');
    var m=ccmMetas('2026-11'); return { el:!!document.getElementById('mis-com'), com:_com('Isabel Robledo'), ok:m.ok, de:m.de, top:_txt('mis-top') }; });
  chk('4d · sin las metas de noviembre guardadas (el cierre las sugiere de octubre) no sale', r.ok===false && r.de==='2026-10' && r.el===false && r.com===null && /Tu día, Isabel/.test(r.top), r);
  await ev(async () => { window._L=window._L.filter(function(p){ return p.id!=='__metas__'; }).concat([_metas(true)]); });

  /* 5 · el mes cerrado */
  r = await ev(async () => {
    var C=window._L.filter(function(p){ return p.id==='__cierre_comercial__'; })[0], D=JSON.parse(C.observaciones);
    D.m['2026-11']={ c:Date.now(), por:'Prueba', vt:[{ v:'Isabel Robledo', g:'heaven', n:3, u:3, bs:130000, ti:20000, mi:125000, pr:160000, pc:2, co:2600, bp:1, bo:200, to:2800 }], s:{ i1:[0,100000,0], i2:[0,20000,20000], i3:[0,10000,0] }, esc:_ESC, aj:{} };
    C.observaciones=JSON.stringify(D); await _ver('Isabel Robledo');
    var o={ txt:_txt('mis-com'), com:_com('Isabel Robledo') };
    D=JSON.parse(C.observaciones); delete D.m['2026-11']; C.observaciones=JSON.stringify(D); return o; });
  chk('5 · con noviembre cerrado: la comisión congelada (Bs 2.800) y «🔒 Noviembre ya está cerrado», sin tramo ni por día', r.com && r.com.cerrado===true && r.com.to===2800 && /Tu comisión de noviembre/.test(r.txt) && /Noviembre ya está cerrado/.test(r.txt) && !/por día/.test(r.txt) && !/Te faltan/.test(r.txt), r.txt);

  /* 6 · solo mira */
  r = await ev(async () => { window.SAVES=[]; await _ver('Isabel Robledo'); renderMis(); await _esperar(150); return { n:window.SAVES.length, el:!!document.getElementById('mis-com') }; });
  chk('6a · solo mira: pintar «Tu día» con la comisión no guarda nada', r.el===true && r.n===0, r);
  if(SALIDA) await page.locator('#mis-top .td').screenshot({ path:path.join(SALIDA, 'mis_comision_1440.png') });
  chk('sin errores de la página (1440 px)', errores.length===0, errores);
  await ctx.close();

  /* 3e · después de las 20:00 hoy ya no cuenta */
  ({ ctx, page } = await abrir(1440, '21:00'));
  r = await ev(async () => { await _ver('Isabel Robledo'); return { txt:_txt('mis-com'), com:_com('Isabel Robledo') }; });
  chk('3e · a las 21:00 hoy ya no cuenta: 15 días hábiles «desde mañana» → Bs 2.000 por día', r.com && r.com.conHoy===false && r.com.dias===15 && r.com.porDia===2000 && /Bs 2\.000 por día · quedan 15 días hábiles, desde mañana/.test(r.txt), r.txt);
  await ctx.close();

  /* 6b · en el celular */
  ({ ctx, page } = await abrir(390));
  r = await ev(async () => { await _ver('Isabel Robledo'); var e=document.getElementById('mis-com'), b=e ? e.getBoundingClientRect() : null;
    return { el:!!e, vis:!!(e && e.offsetParent), sw:document.documentElement.scrollWidth, iw:window.innerWidth, der:b ? Math.round(b.right) : null, izq:b ? Math.round(b.left) : null, txt:_txt('mis-com') }; });
  chk('6b · en el celular (390 px) se ve entera y no ensancha la página', r.el && r.vis && r.sw<=r.iw && r.der<=r.iw && r.izq>=0 && /Bs 1\.875 por día/.test(r.txt), r);
  if(SALIDA) await page.locator('#mis-com').screenshot({ path:path.join(SALIDA, 'mis_comision_390.png') });
  await ctx.close();

  chk('sin errores de la página', errores.length===0, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
