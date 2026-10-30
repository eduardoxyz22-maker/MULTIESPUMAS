/* 🏁 EL CIERRE COMERCIAL DEL MES (30/10, propuesta 74). El cierre de septiembre se armó a mano desde un Excel y llevó 5 correcciones; la
   09-033 (Bs 4.990) entró en ese cierre y hoy cuenta para octubre porque su entrega cayó el 05/10.

   LO QUE CUIDA (servidor de mentira; solo datos inventados; reloj clavado el martes 03/11/2026 a las 10:00 de Bolivia):
   1. Solo con la contraseña; el botón vive en Proyección; los primeros días del mes arranca en el mes ANTERIOR (el que hay que cerrar).
   2. La escala que viene puesta da EXACTO lo que se pagó en septiembre (los 8 casos del dashboard) y dice «⚠️ Confirmá la escala»; debajo
      de la mínima es 0 siempre; el borde (justo la mínima, justo el 120 %) entra.
   3. Las metas sugeridas de octubre son las de septiembre (no guardadas); guardar escribe `vd` y `esc` en `__metas__` sin tocar las metas
      por marca, y las metas por marca (`metasGuardar`) no borran `vd` ni `esc`.
   4. Vendido = lo de Proyección por vendedor; comisión sobre TODO lo vendido con el tramo (Isabel 161.295 × 2,75 % = 4.435,61); bono
      Titanio 1 % de los colchones Titanio con precio (Mirian 32.025 → 320,25; el somier no; la venta de un renglón sin precio vale su total).
   5. «Para revisar»: Titanio sin precio, Kommo sin cargar, la cargada en septiembre con entrega en octubre («¿ya la pagaste en
      septiembre?», que se saca y se vuelve a contar, guardado en `__cierre_comercial__`) y la que pasó de octubre a noviembre.
   6. 🔒 Cerrar octubre congela las ventas y los totales; lo que cambia después (otro monto, una venta nueva con entrega en octubre) va como
      ajuste a noviembre con el % de octubre; la venta de octubre que se movió a noviembre sale «ya pagada en octubre» y no cuenta dos veces.
   7. Cerrar noviembre paga esos ajustes (no vuelven); octubre no se reabre con noviembre cerrado; reabrir pide la contraseña.
   8. El Excel: una hoja por marca con vendedor, vendido, mínima, presupuesto, %, comisión %, comisión Bs, bono, total; plata `{v,t:'n',s:2}`.
   9. La fila es del sistema (no es una venta); la proyección no cambia; en el celular no ensancha la página.
   Se corre:  node tests/test_cierre_comercial.js   (PEDIDOS=… para correrla contra otra versión) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

const PREPARAR = () => {
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  var L=[];
  var ts=function(d){ return new Date(d+'T10:00:00-04:00').getTime(); };
  /* una venta: id, OC, vendedor, entrega, cargada, total y (opcional) los renglones */
  var V=function(id, oc, v, f, reg, bs, prods){ L.push({ id:id, oc:oc, nota:'N'+id, cliente:'CLIENTE '+id, celular:'71000000', fecha:f, turno:'AM', zona:'Norte', direccion:'CALLE 1',
    vendedor:v, productos:prods||[{ desc:'COLCHON SOFT', medida:'140x190', codigo:'', cant:1, precio:bs }], saldo:0, acuenta:0, pagado:true, metodoPago:'Efectivo '+bs, ts:ts(reg), rev:1 }); };
  V('m1','10-001','Maria Flores','2026-10-05','2026-10-02',40000); V('m2','10-002','Maria Flores','2026-10-12','2026-10-08',40000);
  V('m3','10-003','Maria Flores','2026-10-20','2026-10-15',40000); V('m4','10-004','Maria Flores','2026-10-28','2026-10-22',40000);
  V('i1','10-011','Isabel Robledo','2026-10-07','2026-10-03',100000); V('i2','10-012','Isabel Robledo','2026-10-21','2026-10-18',61295);
  V('r1','10-021','Mirian Salazar','2026-10-09','2026-10-06',16900, [{ desc:'TITANIO ICE', medida:'140x190', codigo:'', cant:1, precio:6510 }, { desc:'TITANIO ICE', medida:'160x190', codigo:'', cant:1, precio:7580 }, { desc:'SOMIER TITANIO ICE', medida:'160x190', codigo:'', cant:1, precio:2810 }]);
  V('r2','10-022','Mirian Salazar','2026-10-16','2026-10-12',17935, [{ desc:'TITANIO ICE', medida:'160x190', codigo:'', cant:1, precio:7580 }, { desc:'TITANIO LATEX 180X200', medida:'', codigo:'', cant:1, precio:10355 }]);
  V('r3','10-023','Mirian Salazar','2026-10-23','2026-10-19',91117);
  V('c1','10-031','Carola Chavez','2026-10-08','2026-10-04',7150, [{ desc:'TITANIO ICE', medida:'140x190', codigo:'', cant:1 }]);   // un renglón sin precio: vale el total
  V('c2','10-032','Carola Chavez','2026-10-14','2026-10-10',12000, [{ desc:'TITANIO LATEX', medida:'160x190', codigo:'', cant:1 }, { desc:'SOMIER', medida:'160x190', codigo:'', cant:1, precio:2000 }]);
  V('c3','10-033','Carola Chavez','2026-10-27','2026-10-24',100850);
  V('j0','09-033','Jonathan Monje','2026-10-05','2026-09-03',4990);   // cargada en septiembre, entrega en octubre
  V('j1','10-041','Jonathan Monje','2026-10-15','2026-10-11',50000);
  V('s1','10-051','Mauricio Merida','2026-10-10','2026-10-06',100400);
  V('s2','10-061','Fernando Peinado','2026-10-13','2026-10-09',77025);
  /* la que logística pasó del 30/10 al 04/11 el 29/10 */
  V('g1','10-071','Carola Chavez','2026-11-04','2026-10-20',11860, [{ desc:'COLCHON SOFT', medida:'160x190', codigo:'', cant:1, precio:11860,
    mod:{ f:'2026-10-29', h:'10:00', q:'Carola Chavez', por:'Logística', d:['📅 cambió la fecha de entrega: del 30/10 al 04/11'] } }]);
  L.push({ id:'__metas__', fecha:'', cliente:'🎯 METAS', observaciones:JSON.stringify({ v:1, m:{ '2026-10':{ heaven:150000, suena:40000, t:1 } } }), rev:3 });
  var B={ id:'kommo-777', fecha:'', oc:'', vendedor:'Maria Flores', cliente:'CLIENTE K', productos:[], saldo:5600, ts:ts('2026-10-20'), estado:'Borrador Kommo', metodoPago:'', rev:1 };
  STATE=L.slice(); BORRADORES=[JSON.parse(JSON.stringify(B))];
  window.SRV=JSON.parse(JSON.stringify(L.concat([B]))); window.SAVES=[]; window.SIN_RED=false; window.BAJADO=null;
  apiList=function(){ if(window.SIN_RED) return Promise.reject(new Error('sin red')); return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window.SRV)) }); };
  apiSave=function(x){ window.SAVES.push(JSON.parse(JSON.stringify(x)));
    var y=JSON.parse(JSON.stringify(x)); y.rev=(Number(y.rev)||0)+1;
    window.SRV=window.SRV.filter(function(p){ return String(p.id)!==String(x.id); }).concat([y]);
    return Promise.resolve({ ok:true, pedido:y }); };
  downloadBlob=function(bytes, nombre){ window.BAJADO={ n:nombre, len:bytes.length, pk:String.fromCharCode(bytes[0], bytes[1]) }; };
  ULTIMO_REFRESCO=Date.now();
};
const espera=ms=>new Promise(r=>setTimeout(r,ms||80));

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  let RESPUESTA='heaven2026';
  const abrir = async (w) => {
    const ctx = await browser.newContext({ viewport:{ width:w, height:900 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message));
    page.on('dialog', d => (d.type()==='prompt' ? d.accept(RESPUESTA) : d.accept()));
    await ctx.route(/^https?:\/\//, r => r.abort());
    await page.clock.setFixedTime(new Date('2026-11-03T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate(PREPARAR);
    await page.evaluate(()=>{ showView('conta'); segSet('cta-tab','proy'); setContaTab('proy'); renderProyeccion(); });
    await page.waitForTimeout(150);
    return { ctx, page };
  };
  /* una cuenta adentro de la página; si la función no existe (la página de antes), el error vuelve como dato y la comprobación falla */
  const ev = async (page, fn, arg) => { try{ return await page.evaluate(fn, arg); }catch(e){ return { __err:String(e.message||e).slice(0,200) }; } };
  const filaDe = (R, v) => (R && R.filas || []).filter(r => r.v===v)[0] || {};
  const datos = (page, ym) => ev(page, (ym)=>{ var R=ccmDatos(ym); return { filas:R.filas.filter(ccmFilaVe).map(function(r){ return { v:r.v, g:r.g, n:r.n, u:r.u, bs:r.bs, ti:r.ti, tiFalta:r.tiFalta, mi:r.mi, pr:r.pr, pc:r.pc, co:r.co, bo:r.bo, aj:r.aj, ajCom:r.ajCom, ajBono:r.ajBono, to:r.to }; }),
    tot:R.tot, cerrado:R.cerrado, es:{ ok:R.es.ok, de:R.es.de }, mt:{ ok:R.mt.ok, de:R.mt.de }, aj:R.ajustes.map(function(a){ return { id:a.id, v:a.v, dbs:a.dbs, com:a.com, motivo:a.motivo, O:a.O }; }),
    desp:R.despues.map(function(a){ return { id:a.id, v:a.v, dbs:a.dbs, motivo:a.motivo }; }), ventas:R.ventas.map(function(x){ return { id:x.id, est:x.est, en:x.en, bs:x.bs }; }),
    rev:{ n:R.rev.n, ti:R.rev.ti.map(function(x){ return x.id; }), kommo:R.rev.kommo, antes:R.rev.antes.map(function(x){ return x.id; }), mov:R.rev.movidas.map(function(o){ return { id:o.x.id, sale:o.sale, del:o.del, al:o.al }; }) } }; }, ym);
  const textoBody = page => ev(page, ()=>document.getElementById('ccm-body').innerText.replace(/\s+/g,' '));
  const cierreGuardado = page => ev(page, ()=>{ var s=window.SAVES.filter(function(x){ return x.id==='__cierre_comercial__'; }).pop(); return s ? JSON.parse(s.observaciones) : null; });
  const metasGuardadas = page => ev(page, ()=>{ var s=window.SRV.filter(function(x){ return x.id==='__metas__'; })[0]; return s ? JSON.parse(s.observaciones) : null; });

  let { ctx, page } = await abrir(1366);
  const fotoPry = () => ev(page, ()=>{ var R=proyeccionMes('2026-10'); return JSON.stringify({ e:R.equipo, m:R.marcas.map(function(m){ return [m.g.k, m.tot, m.filas.map(function(r){ return [r.vendedor, r.vendido, r.n, r.u]; })]; }) }); });
  const pryAntes = await fotoPry();

  /* 1 · solo con la contraseña, y arranca en octubre */
  let r = await ev(page, ()=>{ UNLOCKED=false; try{ ccmAbrir(); }catch(e){} var ov=document.getElementById('ccm-ov'); var vis=!!ov && ov.style.display!=='none'; UNLOCKED=true; return { btn:!!document.getElementById('pry-cierre-btn'), vis:vis }; });
  chk('1 · el botón «🏁 Cierre comercial del mes» está en Proyección y sin la contraseña no abre nada', r.btn===true && r.vis===false, r);
  r = await ev(page, ()=>{ ccmAbrir(); var ov=document.getElementById('ccm-ov'); return { vis:ov && ov.style.display, ym:CCM.ym, mes:document.getElementById('ccm-mes').value, pry:document.getElementById('pry-mes').value }; });
  chk('1 · con la contraseña abre; el 03/11 arranca en OCTUBRE (el mes que hay que cerrar), aunque Proyección esté en noviembre', r.vis==='flex' && r.ym==='2026-10' && r.mes==='2026-10' && r.pry==='2026-11', r);
  let t = await textoBody(page);
  chk('1 · avisa «⚠️ Confirmá la escala» y que las metas son las de septiembre del dashboard, sin guardar', /Confirmá la escala/.test(t) && /metas de octubre por vendedor no están guardadas/.test(t) && /las de septiembre/.test(t), String(t).slice(0,400));

  /* 2 · la escala */
  r = await ev(page, ()=>CCM_SEP_PAGADO.map(function(c){ return [c[0], c[5], ccmPctDe(CCM_ESCALA_SEP[c[1]], c[2], c[3], c[4]).pct]; }));
  chk('2 · la escala que viene puesta da EXACTO lo que se pagó en septiembre en los 8 casos del dashboard', Array.isArray(r) && r.length===8 && r.every(x=>x[1]===x[2]), r);
  r = await ev(page, ()=>{ var H=CCM_ESCALA_SEP.heaven, S=CCM_ESCALA_SEP.suena;
    return [ccmPctDe(H, 125000, 125000, 160000).pct, ccmPctDe(H, 124999.99, 125000, 160000).pct, ccmPctDe(H, 192000, 125000, 160000).pct, ccmPctDe(H, 191999, 125000, 160000).pct,
            ccmPctDe(S, 90000, 95000, 110000).pct, ccmPctDe(H, 160000, 125000, 160000).pct]; });
  chk('2 · justo la mínima = 2 %; un centavo menos = 0; justo el 120 % = 3 %; debajo de la mínima es 0 aunque pase el 80 % del presupuesto; justo el presupuesto = 2,75 %',
    JSON.stringify(r)==='[2,0,3,2.75,0,2.75]', r);

  /* 3 · las metas sugeridas, el editor y la prueba */
  r = await ev(page, ()=>{ ccmEdAbrir(); var i=CCM.ed.vs.map(function(o){ return o.v; }).indexOf('Maria Flores');
    return { mi:document.getElementById('ccm-mi-'+i).value, pr:document.getElementById('ccm-pr-'+i).value, prueba:document.getElementById('ccm-prueba-res').innerText, tit:document.getElementById('ccm-body').innerText.replace(/\s+/g,' ').slice(0,300) }; });
  chk('3 · el editor arranca con las de septiembre (Maria 100.000 / 130.000) y lo dice', r.mi==='100.000' && r.pr==='130.000' && /Sugeridas: las de septiembre/.test(r.tit), r);
  chk('3 · «🧪 Prueba»: con la escala puesta da lo mismo que se pagó en los 8 casos', /da lo mismo que se pagó en los 8 casos/.test(r.prueba||''), r.prueba);
  r = await ev(page, ()=>{ var d=document.getElementById('ccm-t-heaven-2-d'); d.value='125'; ccmEdProbar(); var a=document.getElementById('ccm-prueba-res').innerText; d.value='120'; ccmEdProbar(); return [a, document.getElementById('ccm-prueba-res').innerText]; });
  chk('3 · si el tramo del 3 % pasa al 125 %, la prueba avisa que en 1 caso da distinto (Carola cobró 3 % con el 121 %)', /Da distinto en 1 de 8/.test(r[0]||'') && /da lo mismo/.test(r[1]||''), r);
  await ev(page, ()=>{ var M={ 'Jonathan Monje':['125000','160000'], 'Juan Pablo Paredes':['',''] };
    CCM.ed.vs.forEach(function(o, i){ var m=M[o.v]; if(m){ document.getElementById('ccm-mi-'+i).value=m[0]; document.getElementById('ccm-pr-'+i).value=m[1]; } }); });
  r = await ev(page, ()=>{ var i=CCM.ed.vs.map(function(o){ return o.v; }).indexOf('Isabel Robledo'); document.getElementById('ccm-mi-'+i).value='12abc'; return ccmEdGuardar().then(function(){ var n=window.SAVES.length; document.getElementById('ccm-mi-'+i).value='125.000'; return n; }); });
  chk('3 · una meta mal escrita («12abc») no se guarda', r===0, r);
  await ev(page, ()=>ccmEdGuardar());
  await espera(120);
  r = await metasGuardadas(page);
  const oct = r && r.m && r.m['2026-10'];
  chk('3 · guardar escribe en `__metas__` de octubre las metas por vendedor (vd) y la escala (esc)… ', !!(oct && oct.vd && oct.vd['Isabel Robledo'] && oct.vd['Isabel Robledo'][0]===125000 && oct.vd['Maria Flores'][1]===130000 && oct.esc && oct.esc.heaven.t.length===3 && oct.esc.heaven.bono===1 && !oct.vd['Juan Pablo Paredes']), oct);
  chk('3 · …sin tocar las metas por marca (heaven 150.000, suena 40.000)', !!(oct && oct.heaven===150000 && oct.suena===40000), oct);
  t = await textoBody(page);
  chk('3 · guardado: ya no dice «Confirmá la escala» ni «no están guardadas»', !/Confirmá la escala/.test(t) && !/no están guardadas/.test(t), String(t).slice(0,300));

  /* 4 · las cuentas */
  let D = await datos(page, '2026-10');
  const isa=filaDe(D,'Isabel Robledo'), mir=filaDe(D,'Mirian Salazar'), mar=filaDe(D,'Maria Flores'), car=filaDe(D,'Carola Chavez'), mau=filaDe(D,'Mauricio Merida'), fer=filaDe(D,'Fernando Peinado');
  chk('4 · Isabel: 161.295 al 100,8 % del presupuesto → 2,75 % sobre TODO = Bs 4.435,61', isa.bs===161295 && isa.pc===2.75 && Math.abs(isa.co-4435.61)<0.005, isa);
  chk('4 · Mirian: 125.952 → 2 % = 2.519,04; Titanio 32.025 (sin el somier) → bono 320,25; total 2.839,29', mir.bs===125952 && mir.pc===2 && Math.abs(mir.co-2519.04)<0.005 && mir.ti===32025 && Math.abs(mir.bo-320.25)<0.005 && Math.abs(mir.to-2839.29)<0.005, mir);
  chk('4 · Maria: 160.000 con presupuesto 130.000 (123 %) → 3 % = 4.800', mar.bs===160000 && mar.pc===3 && Math.abs(mar.co-4800)<0.005, mar);
  chk('4 · Carola: debajo de la mínima → 0 %; la venta de un renglón Titanio sin precio cuenta su total (7.150 → bono 71,50); la de dos renglones sin precio, no',
    car.bs===120000 && car.pc===0 && car.co===0 && car.ti===7150 && Math.abs(car.bo-71.5)<0.005 && car.tiFalta===1, car);
  chk('4 · Sueña: Mauricio 100.400 (84 % del presupuesto) → 2,5 % = 2.510; Fernando debajo de la mínima → 0; Sueña sin bono', mau.pc===2.5 && Math.abs(mau.co-2510)<0.005 && fer.pc===0 && mau.bo===0, [mau, fer]);
  r = await ev(page, ()=>{ var R=proyeccionMes('2026-10'), o={}; R.marcas.forEach(function(m){ m.filas.forEach(function(f){ o[f.vendedor]=[f.vendido, f.n, f.u]; }); }); return o; });
  chk('4 · vendido, ventas y unidades de cada vendedor = los de Proyección', D.filas && D.filas.filter(f=>f.n).every(f=>r[f.v] && r[f.v][0]===f.bs && r[f.v][1]===f.n && r[f.v][2]===f.u), { ccm:D.filas && D.filas.map(f=>[f.v,f.bs,f.n,f.u]), pry:r });

  /* 5 · para revisar */
  t = await textoBody(page);
  chk('5 · «Para revisar»: la 09-033 «cargada el 03/09, entrega 05/10 … ¿ya la pagaste en septiembre?»', /09-033 · Jonathan Monje · cargada el 03\/09, entrega 05\/10 · Bs 4\.990,00: ¿ya la pagaste en septiembre\?/.test(t), String(t).slice(0,900));
  chk('5 · la de Carola que pasó del 30/10 al 04/11 el 29/10: «ya no cuenta en octubre»', /10-071 · Carola Chavez · estaba para el 30\/10 y el 29\/10 la pasaron al 04\/11 · Bs 11\.860,00: ya no cuenta en octubre/.test(t), (D.rev||{}).mov);
  chk('5 · Titanio sin precio (OC 10-032) y Kommo sin cargar (Maria: 1, Bs 5.600)', /Titanio sin precio \(1\)/.test(t) && /10-032/.test(t) && /Maria Flores: 1 sin cargar \(Bs 5\.600,00 según Kommo; 1 llegaron en octubre\)/.test(t), String(t).slice(0,1400));
  r = await ev(page, ()=>{ var i=CCM.antes.map(function(x){ return x.id; }).indexOf('j0'); return ccmExcluirI(i, true); });
  await espera(120);
  r = await cierreGuardado(page);
  D = await datos(page, '2026-10');
  chk('5 · «Ya la pagué en septiembre: no contar» se guarda en `__cierre_comercial__` (ex) y Jonathan baja Bs 4.990', !!(r && r.m && r.m['2026-10'] && r.m['2026-10'].ex && r.m['2026-10'].ex.j0==='2026-09' && !r.m['2026-10'].c) && filaDe(D,'Jonathan Monje').bs===50000, { cie:r, jon:filaDe(D,'Jonathan Monje') });
  t = await textoBody(page);
  chk('5 · la lista lo muestra tachado con «↩️ Contarla»', /no cuenta \(ya pagada en septiembre\)/.test(t) && /Contarla/.test(t), String(t).slice(0,700));
  await ev(page, ()=>{ var i=CCM.antes.map(function(x){ return x.id; }).indexOf('j0'); return ccmExcluirI(i, false); }); await espera(100);
  D = await datos(page, '2026-10');
  chk('5 · «↩️ Contarla» la devuelve (55.0 → 54.990)', filaDe(D,'Jonathan Monje').bs===54990, filaDe(D,'Jonathan Monje'));
  await ev(page, ()=>{ var i=CCM.antes.map(function(x){ return x.id; }).indexOf('j0'); return ccmExcluirI(i, true); }); await espera(100);

  /* 3b · las metas por marca no borran lo del cierre */
  await ev(page, ()=>{ metasAbrir('2026-10'); document.getElementById('mt-in-heaven').value='160.000'; return metasGuardar(); }); await espera(120);
  r = await metasGuardadas(page);
  chk('3 · «🎯 Metas» por marca (heaven 160.000) conserva las metas por vendedor y la escala', !!(r && r.m['2026-10'].heaven===160000 && r.m['2026-10'].vd && r.m['2026-10'].esc), r && r.m['2026-10']);
  await ev(page, ()=>{ try{ closeModal(); }catch(e){} META_ED=null; });

  /* 6 · cerrar octubre */
  const totOct = (await datos(page, '2026-10')).tot;
  await ev(page, ()=>ccmCerrarMes()); await espera(150);
  r = await cierreGuardado(page);
  const C=r && r.m && r.m['2026-10'];
  chk('6 · «🔒 Cerrar octubre» guarda c, quién, las ventas que entraron (sin la 09-033 sacada a mano, que queda en ex) y los totales',
    !!(C && C.c && C.por && C.s && C.s.i1 && C.s.r1 && C.s.c1 && !C.s.j0 && !C.s.g1 && C.ex && C.ex.j0 && Array.isArray(C.vt) && C.esc), C && { c:C.c, s:Object.keys(C.s||{}), ex:C.ex });
  chk('6 · la venta guarda su Bs y su Titanio (r1: 16.900 y 14.090)', !!(C && C.s.r1 && C.s.r1[1]===16900 && C.s.r1[2]===14090), C && C.s.r1);
  r = C && (C.vt||[]).filter(x=>x.v==='Isabel Robledo')[0];
  chk('6 · el total de Isabel queda congelado (2,75 % · 4.435,61)', !!(r && r.pc===2.75 && Math.abs(r.co-4435.61)<0.005 && Math.abs(r.to-4435.61)<0.005), r);
  t = await textoBody(page);
  chk('6 · la ventana dice «🔒 … cerrado» y ofrece «🔓 Reabrir octubre»', /cerrado/.test(t) && /Reabrir octubre/.test(t) && !/Cerrar octubre/.test(t), String(t).slice(0,300));
  chk('6 · la proyección da EXACTAMENTE lo mismo con todo esto', (await fotoPry())===pryAntes, '');

  /* después del cierre: otro monto, una venta movida a noviembre y una nueva con entrega en octubre */
  await ev(page, ()=>{
    window.SRV.forEach(function(p){ if(p.id==='r3'){ p.metodoPago='Efectivo 92117'; p.rev=5; } if(p.id==='m4'){ p.fecha='2026-11-10'; p.rev=5; } });
    window.SRV.push({ id:'n1', oc:'11-001', nota:'Nn1', cliente:'CLIENTE N', celular:'71000000', fecha:'2026-10-31', turno:'AM', zona:'Norte', direccion:'CALLE 2', vendedor:'Isabel Robledo',
      productos:[{ desc:'COLCHON SOFT', medida:'140x190', codigo:'', cant:1, precio:2000 }], saldo:0, acuenta:0, pagado:true, metodoPago:'Efectivo 2000', ts:new Date('2026-11-02T10:00:00-04:00').getTime(), rev:1 });
    return refrescarEstadoYa(); });
  await espera(120);
  D = await datos(page, '2026-10');
  chk('6 · octubre sigue congelado: Mirian 125.952 y Maria 160.000 aunque cambiaron', D.cerrado===true && filaDe(D,'Mirian Salazar').bs===125952 && filaDe(D,'Maria Flores').bs===160000, D.filas && D.filas.map(f=>[f.v,f.bs]));
  chk('6 · «Cambió después del cierre»: Mirian +1.000 (monto) e Isabel +2.000 (entró después); la movida a noviembre NO', JSON.stringify((D.desp||[]).map(a=>[a.id,a.dbs,a.motivo]).sort())===JSON.stringify([['n1',2000,'nueva'],['r3',1000,'monto']]), D.desp);
  let N = await datos(page, '2026-11');
  const nm4=(N.ventas||[]).filter(x=>x.id==='m4')[0]||{};
  chk('6 · noviembre: la m4 de octubre sale «ya pagada en octubre» y no suma a Maria', nm4.est==='pagada' && nm4.en==='2026-10' && filaDe(N,'Maria Flores').bs===0, { m4:nm4, mar:filaDe(N,'Maria Flores') });
  chk('6 · noviembre: ajustes de octubre con el % de octubre: Mirian 1.000 × 2 % = 20; Isabel 2.000 × 2,75 % = 55', filaDe(N,'Mirian Salazar').ajCom===20 && filaDe(N,'Isabel Robledo').ajCom===55 && filaDe(N,'Isabel Robledo').aj===2000, N.aj);
  chk('6 · noviembre cuenta la de Carola que pasó al 04/11 (11.860)', filaDe(N,'Carola Chavez').bs===11860, filaDe(N,'Carola Chavez'));
  await ev(page, ()=>{ ccmElegirMes('2026-11'); });
  t = await textoBody(page);
  chk('6 · la ventana de noviembre muestra «🔁 Ajustes de meses cerrados que se pagan con noviembre»', /Ajustes de meses cerrados que se pagan con noviembre/i.test(t) && /entró después del cierre/.test(t) && /cambió el monto: de Bs 91\.117,00 a Bs 92\.117,00/.test(t), String(t).slice(0,600));

  /* 7 · cerrar noviembre paga los ajustes; reabrir */
  r = await ev(page, ()=>{ ccmEdAbrir(); ccmEdCopiar('2026-10'); var i=CCM.ed.vs.map(function(o){ return o.v; }).indexOf('Isabel Robledo'); return document.getElementById('ccm-mi-'+i).value; });
  chk('7 · noviembre: «📋 Copiar las de octubre» trae las metas guardadas (Isabel 125.000)', r==='125.000', r);
  await ev(page, ()=>ccmEdGuardar()); await espera(120);
  D = await datos(page, '2026-11');
  chk('7 · noviembre usa la escala guardada de octubre (sin ⚠️) y sus metas guardadas', D.es && D.es.ok===true && D.mt && D.mt.ok===true, [D.es, D.mt]);
  await ev(page, ()=>ccmCerrarMes()); await espera(150);
  r = await cierreGuardado(page);
  const CN=r && r.m && r.m['2026-11'];
  chk('7 · el cierre de noviembre pagó los ajustes (r3 +1.000, n1 +2.000, de octubre) y no metió la m4 ya pagada', !!(CN && CN.c && CN.aj && CN.aj.r3 && CN.aj.r3[1]===1000 && CN.aj.r3[3]==='2026-10' && CN.aj.n1 && CN.aj.n1[1]===2000 && CN.s && !CN.s.m4 && CN.s.g1), CN && { aj:CN.aj, s:Object.keys(CN.s||{}) });
  chk('7 · …y octubre sigue cerrado con sus datos', !!(r && r.m['2026-10'] && r.m['2026-10'].c && r.m['2026-10'].s.r3), '');
  D = await datos(page, '2026-10');
  chk('7 · ya pagados, los cambios de octubre no vuelven a aparecer', D.desp && D.desp.length===0, D.desp);
  N = await datos(page, '2026-12');
  chk('7 · diciembre no los vuelve a pagar', N.aj && N.aj.length===0, N.aj);
  await ev(page, ()=>{ ccmElegirMes('2026-10'); return ccmReabrir(); }); await espera(100);
  r = await cierreGuardado(page);
  chk('7 · octubre no se reabre con noviembre cerrado', !!(r && r.m['2026-10'].c), r && Object.keys(r.m));
  await ev(page, ()=>{ ccmElegirMes('2026-11'); }); RESPUESTA='otra';
  const nSaves=await ev(page, ()=>window.SAVES.length);
  await ev(page, ()=>ccmReabrir()); await espera(100);
  r = await ev(page, ()=>window.SAVES.length);
  chk('7 · con la contraseña equivocada no se reabre', r===nSaves, [nSaves, r]);
  RESPUESTA='heaven2026';
  await ev(page, ()=>ccmReabrir()); await espera(120);
  r = await cierreGuardado(page);
  N = await datos(page, '2026-11');
  chk('7 · con la contraseña se reabre noviembre y los ajustes de octubre vuelven a estar pendientes', !!(r && r.m['2026-11'] && !r.m['2026-11'].c && r.m['2026-10'].c) && N.aj && N.aj.length===2, { nov:r && r.m['2026-11'], aj:N.aj });

  /* 8 · el Excel */
  r = await ev(page, ()=>{ ccmElegirMes('2026-10'); var S=ccmBajar(); return { b:window.BAJADO, names:S.map(function(s){ return s.name; }), cab:S[0].matrix[0].map(function(c){ return c.v; }),
    isa:(S.filter(function(s){ return s.name==='Heaven'; })[0]||{matrix:[]}).matrix.filter(function(f){ return f[0]==='Isabel Robledo'; })[0], ven:S.filter(function(s){ return s.name==='Ventas'; })[0].matrix.length }; });
  chk('8 · el Excel: una hoja por marca + «Ventas», archivo .xlsx de verdad', !!(r && r.b && /cierre-comercial-2026-10\.xlsx$/.test(r.b.n) && r.b.pk==='PK' && r.b.len>2000 && JSON.stringify(r.names.slice(0,3))==='["Sueña","Heaven","Ventas"]'), r && { b:r.b, n:r.names });
  chk('8 · columnas: vendedor, vendido, mínima, presupuesto, %, comisión %, comisión Bs, bono Titanio, total',
    !!(r && r.cab && ['VENDEDOR','VENDIDO (Bs)','MÍNIMA (Bs)','PRESUPUESTO (Bs)','% DEL PRESUPUESTO','COMISIÓN %','COMISIÓN (Bs)','BONO TITANIO (Bs)'].every((h,i)=>r.cab[i]===h) && r.cab.indexOf('TOTAL (Bs)')>7), r && r.cab);
  chk('8 · la plata va como número con formato Bs (`{v, t:"n", s:2}`) y el % como número (2,75)', !!(r && r.isa && r.isa[1].v===161295 && r.isa[1].t==='n' && r.isa[1].s===2 && r.isa[5].v===2.75 && r.isa[5].t==='n' && Math.abs(r.isa[6].v-4435.61)<0.005), r && r.isa);

  /* 9 · la fila del sistema; el celular */
  r = await ev(page, ()=>{ var f=findById('__cierre_comercial__'); return { sis:esFilaSistema(f), conta:fueraDeConta(f), vend:pryVentas().some(function(x){ return x.id==='__cierre_comercial__'; }) }; });
  chk('9 · `__cierre_comercial__` es una fila del sistema: no es una venta en Contabilidad ni en Proyección', r.sis===true && r.conta===true && r.vend===false, r);
  r = await ev(page, ()=>{ var D={ v:1, m:{} }; for(var k=1;k<=6;k++){ var s={}; for(var i=0;i<400;i++) s['p'+(1e12+k*1e6+i).toString(36)]=[i%8, 1234.5+i]; D.m['2027-0'+k]={ c:1, vt:[], s:s }; }
    ccmPodar(D); return { largo:JSON.stringify(D).length, meses:Object.keys(D.m).sort(), tope:CCM_TOPE }; });
  chk('9 · la celda no pasa de `CCM_TOPE` letras: se van los meses más viejos y queda el último', !!(r && r.largo<=r.tope && r.tope<50000 && r.meses[r.meses.length-1]==='2027-06' && r.meses.length<6), r);
  await ctx.close();
  const Cel = await abrir(390);
  await ev(Cel.page, ()=>ccmAbrir('2026-10')); await espera(100);
  r = await ev(Cel.page, ()=>({ sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth, bw:document.getElementById('ccm-body').scrollWidth, bc:document.getElementById('ccm-body').clientWidth }));
  chk('9 · en el celular (390 px) la ventana no ensancha la página (las tablas se deslizan adentro)', r.sw<=r.cw+1 && r.bw<=r.bc+1, r);
  await Cel.ctx.close();

  chk('sin errores de la página', !errores.length, errores.slice(0,5));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
