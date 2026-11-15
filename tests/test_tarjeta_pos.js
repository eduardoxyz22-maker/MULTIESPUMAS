/* 💳 MEJORA 331 (la parte de la página) — LA TARJETA: SU POS Y EL VOUCHER LEÍDO.

   El dueño (15/11): 13 cobros con tarjeta en noviembre y ninguno decía de qué POS (banco) ni el lote; el abono del banco llega por lote, días
   después, y no había con qué cruzarlo. El servidor 2026-11-15-a ya lee del voucher el lote (`lo`), la autorización (`au`) y el banco del POS (`pb`).

   LO QUE ESTA PRUEBA CUIDA:
   1. Al subir el voucher (acá, el 📎 de un pago ya registrado): «💳 Leí el voucher: lote · autorización · tarjeta terminada en · POS», además de
      lo de siempre (`iacComparar`: si el monto no coincide, avisa). Si la tienda tiene otro POS, lo dice; sin leer, el POS de la tienda «puesto solo».
   2. Solo con servidor ≥ 2026-11-15-a, solo pagos con tarjeta, solo con la bandera `TARJ_POS_PRUEBA`.
   3. El POS de cada tienda: `POS_TIENDA` (a mano) o el que más se repite en sus vouchers leídos (al menos 2).
   4. En el Cuadre, «💳 Tarjeta por POS y lote»: los cobros con tarjeta del período por POS y lote (cada lote, un abono); lo que falta leer se pide
      con `leer:1` (no gasta); con un servidor anterior, lo dice.
   Datos SINTÉTICOS. Reloj clavado: jueves 12/11/2026 a las 19:00 de Bolivia.
   Se corre:  node tests/test_tarjeta_pos.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,700)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const TSB=(dia, hora)=>new Date(dia+'T'+(hora||'11:00')+':00-04:00').getTime();
/* Una venta cobrada con tarjeta el día `f`, con la foto del voucher `foto`. */
const P=(id, vend, cli, m, f, foto)=>({ id:id, oc:'11-'+id.replace(/\D/g,'').padStart(3,'0'), vendedor:vend, cliente:cli, celular:'70001001', zona:'Norte', turno:'AM',
  nota:'8'+id.replace(/\D/g,'').padStart(3,'0'), fecha:'2026-12-20', productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:m }],
  saldo:0, acuenta:0, pagado:true, ts:TSB(f), metodoPago:'Tarjeta '+m+' @'+f+' #70'+id.replace(/\D/g,'')+' %'+foto });
const L=[ P('t1','Mirian Salazar','CLIENTE UNO',6330,'2026-11-10','FT1'), P('t2','Mirian Salazar','CLIENTE DOS',3000,'2026-11-10','FT2'),
          P('t3','Mirian Salazar','CLIENTE TRES',1500,'2026-11-11','FT3'), P('t4','Maria Flores','CLIENTE CUATRO',4000,'2026-11-11','FT4'),
          P('t5','Isabel Robledo','CLIENTE CINCO',2000,'2026-11-12','FT5'),
          Object.assign(P('q1','Isabel Robledo','CLIENTE QR',900,'2026-11-12','FQ1'), { metodoPago:'QR BISA 900 @2026-11-12 #7099 %FQ1' }) ];
const LEIDO={ FT1:{ cp:true, le:true, m:6330, ti:'tarjeta', f:'2026-11-10', lo:'000112', au:'845210', ref:'845210', pb:'BISA', u4:'1234', pv:4 },
              FT2:{ cp:true, le:true, m:3000, ti:'tarjeta', f:'2026-11-10', lo:'000112', au:'845211', ref:'845211', pb:'Banco BISA S.A.', u4:'5678', pv:4 },
              FT3:{ cp:true, le:true, m:1500, ti:'tarjeta', f:'2026-11-11', lo:'9', au:'1', ref:'111111', pb:'BNB', u4:'9999', pv:4 },
              FT4:{ cp:true, le:true, m:4000, ti:'tarjeta', f:'2026-11-11', lo:'58', au:'2', ref:'222222', pb:'Banco Económico', u4:'4321', pv:4 } };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  const errores=[]; page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await ctx.route(/^https?:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-11-12T19:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  await ev(async (a) => {
    var c0=document.getElementById('conn-form'); if(c0) c0.style.display='none';
    CONNECTED=true; UNLOCKED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR=''; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    window._L=a.L; window._LEIDO=a.LEIDO; window._post=[];
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window._L)) }); };
    apiSave=function(x){ return Promise.resolve({ ok:true, pedido:x }); };
    apiPost=function(b){ window._post.push(JSON.parse(JSON.stringify(b))); var res={}; (b.fotos||[]).forEach(function(f){ if(window._LEIDO[f]) res[f]=window._LEIDO[f]; });
      return Promise.resolve({ ok:true, res:res, faltan:[], pendientes:[], estado:'' }); };
    await refrescarEstado(); await new Promise(function(r){ setTimeout(r, 150); });
    SERVER_VER='2026-11-15-a';
    window._txt=function(sel){ var e=document.querySelector(sel); return e ? e.innerText.replace(/\s+/g,' ').trim() : ''; };
    window.LEER=function(ids){ ids.forEach(function(f){ IAC.res[f]=JSON.parse(JSON.stringify(window._LEIDO[f])); }); };
    window.PAGO=function(id){ return compsPagosDe(findById(id))[0]; };
  }, { L, LEIDO });

  console.log('\n── 1. Lo leído y el POS de cada tienda ──');
  let r = await ev(() => { LEER(['FT1','FT2','FT3','FT4']);
    var o={ comps:PAGO('t1').comps, leido:tjLeido(['FT1']), apr:tjPosAprendido(), tienda:tjTiendaDe(findById('t1'), '2026-11-10') };
    POS_TIENDA['Buenos Aires']='Mercantil'; o.lista=tjPosDe('Buenos Aires'); o.apr2=tjPosDe('Mia Plaza'); delete POS_TIENDA['Buenos Aires']; return o; });
  chk('1a. el pago con tarjeta trae su foto y lo leído (lote, autorización, POS, 4 dígitos)', JSON.stringify(r.comps)==='["FT1"]' && r.leido && r.leido.lo==='000112' && r.leido.pb==='BISA', r);
  chk('1b. Mia Plaza: BISA (2 vouchers BISA contra 1 BNB); Buenos Aires tiene 1 solo: no se aprende', r.tienda==='Mia Plaza' && JSON.stringify(r.apr)==='{"Mia Plaza":"BISA"}', r.apr);
  chk('1c. `POS_TIENDA` manda sobre lo aprendido', r.lista.b==='MERCANTIL' && r.lista.de==='lista' && r.apr2.b==='BISA' && r.apr2.de==='aprendido', [r.lista, r.apr2]);

  console.log('\n── 2. Al subir el voucher (el 📎 de un pago ya registrado) ──');
  r = await ev(() => { window.TARJ_POS_PRUEBA=1; IAS.peg['FT1']=Date.now(); IAS.peg['FT3']=Date.now(); IAS.peg['FQ1']=Date.now();
    var o={ ok:iasPegHtml(findById('t1'), PAGO('t1').ix, 'FT1').replace(/<[^>]+>/g,'') };
    IAC.res['FT1'].m=6000; o.mal=iasPegHtml(findById('t1'), PAGO('t1').ix, 'FT1').replace(/<[^>]+>/g,''); IAC.res['FT1'].m=6330;
    o.otro=iasPegHtml(findById('t3'), PAGO('t3').ix, 'FT3').replace(/<[^>]+>/g,'');
    o.qr=tjVoucherHtml(PAGO('q1'), { est:'ok' });
    var x5=PAGO('t5'); o.solo=tjVoucherHtml(x5, { est:'ok' }).replace(/<[^>]+>/g,'');
    POS_TIENDA['Central']='BNB'; o.solo2=tjVoucherHtml(x5, { est:'ok' }).replace(/<[^>]+>/g,''); delete POS_TIENDA['Central'];
    SERVER_VER='2026-11-14-b'; o.viejo=tjVoucherHtml(PAGO('t1'), { est:'ok' }); SERVER_VER='2026-11-15-a';
    window.TARJ_POS_PRUEBA=0; o.sinBandera=tjVoucherHtml(PAGO('t1'), { est:'ok' }); window.TARJ_POS_PRUEBA=1;
    return o; });
  chk('2a. «✅ La foto coincide» y «💳 Leí el voucher: lote 000112 · autorización 845210 · tarjeta terminada en 1234 · POS BISA»', /La foto coincide/.test(r.ok) && /💳 Leí el voucher: lote 000112 · autorización 845210 · tarjeta terminada en 1234 · POS BISA\./.test(r.ok), r.ok);
  chk('2b. si el monto no coincide avisa, como con el QR (la cuenta de siempre), y la línea del voucher sigue', /La foto dice/.test(r.mal) && /Leí el voucher/.test(r.mal), r.mal);
  chk('2c. el voucher de otro banco que el POS de la tienda (BNB en Mia Plaza, que usa BISA): «¿se cobró en otra máquina?»', /⚠️ El voucher es de un POS de BNB y el de Mia Plaza es BISA: ¿se cobró en otra máquina\?/.test(r.otro), r.otro);
  chk('2d. un QR no lleva la línea del voucher', r.qr==='', r.qr);
  chk('2e. sin leer y sin POS conocido, nada; con el POS de la tienda: «💳 POS de Central: BNB (puesto solo)»', r.solo==='' && /💳 POS de Central: BNB \(puesto solo\)\./.test(r.solo2), [r.solo, r.solo2]);
  chk('2f. con un servidor anterior a 2026-11-15-a, o sin `TARJ_POS_PRUEBA`, nada nuevo', r.viejo==='' && r.sinBandera==='', [r.viejo, r.sinBandera]);

  console.log('\n── 3. En el Cuadre: «💳 Tarjeta por POS y lote» ──');
  r = await ev(async () => { window._post=[];
    showView('conta'); segSet('cta-tab','cuadre'); setContaTab('cuadre'); var m=document.getElementById('cua-mes'); if(m) m.value='2026-11'; renderCuadre();
    var o={ t1:_txt('#cua-tarjeta') }; await new Promise(function(x){ setTimeout(x, 150); });
    o.post=_post.map(function(b){ return [b.action, b.leer, (b.fotos||[]).join(',')]; });
    var D=tjPosDatos({ modo:'mes', val:'2026-11' }, ''); o.L=D.L.map(function(g){ return [g.pos, g.posDe, g.lote, g.n, g.bs, Object.keys(g.tiendas).join(','), g.otro]; }); o.tot=D.tot;
    POS_TIENDA['Central']='BNB'; renderCuadre(); o.t2=_txt('#cua-tarjeta'); delete POS_TIENDA['Central'];
    o.abajo=(function(){ var a=document.getElementById('cua-retiros'), b=document.getElementById('cua-tarjeta-box'); return !!(a && b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)); })();
    SERVER_VER='2026-11-14-b'; renderCuadre(); o.viejo=_txt('#cua-tarjeta'); SERVER_VER='2026-11-15-a';
    window.TARJ_POS_PRUEBA=0; renderCuadre(); o.sinBandera=document.getElementById('cua-tarjeta').innerHTML;
    return o; });
  chk('3a. «5 cobros con tarjeta por Bs 16.830,00» (el QR no)', /💳 Tarjeta por POS y lote — noviembre de 2026/i.test(r.t1) && /5 cobros con tarjeta por Bs 16\.830,00/.test(r.t1) && r.abajo, r.t1.slice(0, 300));
  chk('3b. lo que faltaba leer (el de Isabel) se pidió con `leer:1` (no gasta)', JSON.stringify(r.post)==='[["iaComprobantes",1,"FT5"]]', r.post);
  chk('3c. por POS y lote, con el nombre del banco de siempre («Banco BISA S.A.» = BISA): BISA 000112 (2 cobros, Bs 9.330) · BNB 9 (el de Mia Plaza es otro: ⚠️) · Económico 58 · el de Isabel sin leer',
      r.L && r.L.some(function(g){ return g[0]==='BISA' && g[2]==='000112' && g[3]===2 && g[4]===9330 && !g[6]; }) && r.L.some(function(g){ return g[0]==='BNB' && g[2]==='9' && g[6]===true; }) &&
      r.L.some(function(g){ return g[0]==='Económico' && g[2]==='58'; }) && r.L.some(function(g){ return g[0]==='' && g[5]==='Central'; }) && r.tot.sinLeer===1 && r.tot.otroPos===1, r.L);
  chk('3d. con el POS de Central anotado, el suyo dice «BNB (el de la tienda)»', /BNB \(el de la tienda\) — Central/.test(r.t2), r.t2);
  chk('3e. con un servidor anterior lo dice («El lote y el banco del POS se leen del voucher con el servidor 2026-11-15-a»)', /se leen del voucher con el servidor 2026-11-15-a/.test(r.viejo), r.viejo);
  chk('3f. sin `TARJ_POS_PRUEBA` (Playwright), nada: las pruebas de siempre no cambian', r.sinBandera==='', r.sinBandera);

  chk('la página no tiró errores', errores.length===0, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
