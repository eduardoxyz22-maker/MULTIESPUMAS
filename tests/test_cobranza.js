/* ⏳ COBRANZA: ANTIGÜEDAD DE SALDOS (136), LO QUE VA A ENTRAR (143) Y EL ESTADO DE CUENTA DE CADA MAYORISTA (129) — 13/11, dueño:
   «136, 143, 129, 133».

   Lo que esta prueba cuida (falla contra lo de antes, que no tiene `cbzAbrir`):
   1. «📅 Cobranza» está en Contabilidad y abre la ventana con TODO el historial del equipo, no solo el mes de la pantalla.
   2. En Ventas (el equipo) solo «Lo que va a entrar»: la antigüedad de saldos es de Mayoristas (dueño, 13/11: «solo los mayoristas se
      atrasan en pagar»). Por dentro, la deuda va en su tramo por los días desde la entrega; lo de hoy sin ✅ y lo de mañana NO es deuda.
   3. Tocar un tramo filtra la lista; un cliente abre su venta con «← Volver a la cobranza», y volver la muestra otra vez.
   4. Lo que va a entrar: el saldo de lo que todavía no se entregó por plazo (hoy, 7 días, 14, más adelante, el cliente avisa).
   5. El vendedor de la ventana filtra.
   6. Mayoristas: una ficha por cliente (Multicenter junta «MULTICENTER» y «Multicenter SRL»; Copacaba junta «JOSE CARLOS COPACABA» y
      «JUAN CARLOS ARCE») con lo que debe por antigüedad.
   7. «Pagó las N tildadas»: pide banco, N° y comprobante; registra un pago por OC por su saldo entero (aplicarCobros), con el mismo
      comprobante, y la OC ya pagada se saltea.
   8. Excel de la antigüedad y del estado de cuenta; en el celular (390 px) no corre la página de costado.

   Datos SINTÉTICOS (el repo es público). Reloj clavado en el jueves 12/11/2026 a las 15:00 de Bolivia.
   Se corre:  node tests/test_cobranza.js   (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/a/pedidos_viejo.html node tests/test_cobranza.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  try{ cargaBanner(); }catch(e){}
  loadFromServer=function(){};
  window.GUARDADOS=[];
  apiSave=function(rec){ GUARDADOS.push(JSON.parse(JSON.stringify(rec))); return Promise.resolve({ ok:true, pedido:rec }); };
  guardarDurable=function(rec){ GUARDADOS.push(JSON.parse(JSON.stringify(rec))); return Promise.resolve({ ok:true, pedido:rec }); };
  window.DESCARGAS=[];
  downloadBlob=function(bytes, nombre){ DESCARGAS.push(nombre); };
  window.COPIADO='';
  copyText=function(t){ COPIADO=t; };
  subirFoto=function(){ return Promise.resolve({ ok:true, fotoId:'FOTO123' }); };
  fotoCronometro=function(){ return Promise.resolve('data:image/jpeg;base64,AAAA'); };
  var n=0;
  /* Una venta: `fecha` = entrega agendada, `total` y lo que ya pagó (`acuenta`). */
  var V=function(cliente, fecha, total, acuenta, o){
    o=o||{}; n++;
    var saldo=Math.max(0, total-(acuenta||0));
    return { id:'v'+n, oc:o.oc||('10-'+(400+n)), nota:o.nota||String(1200+n), vendedor:o.vend||'Carola Chavez', cliente:cliente, celular:o.cel||('7000000'+n),
             fecha:fecha, turno:'AM', productos:o.prods||[{desc:'COLCHON TITANIO',medida:'140x190',cant:1,precio:total}],
             acuenta:acuenta||0, saldo:saldo, pagado:saldo<0.01, metodoPago:(acuenta?('Efectivo'):''), entregado:!!o.ent,
             ts:new Date((o.reg||'2026-07-01')+'T10:00:00-04:00').getTime(), fotos:[] };
  };
  window.FIX=function(){
    n=0;
    return [
      V('CLIENTE PAGADO',   '2026-08-02', 3000, 3000),
      V('CLIENTE VIEJO',    '2026-08-01', 5000, 1000),                       // v2 · debe 4.000 · 103 días
      V('CLIENTE OCTUBRE',  '2026-10-01', 2000,  500),                       // v3 · debe 1.500 · 42 días
      V('CLIENTE NOVIEMBRE','2026-10-20', 1000,    0, { vend:'Maria Flores' }),   // v4 · debe 1.000 · 23 días
      V('CLIENTE AYER',     '2026-11-11',  800,    0),                       // v5 · debe 800 · 1 día
      V('CLIENTE HOY',      '2026-11-12',  700,    0),                       // v6 · hoy sin ✅: va a entrar, no es deuda
      V('CLIENTE HOY OK',   '2026-11-12',  600,    0, { ent:true }),        // v7 · hoy con ✅: deuda de 0 días
      V('CLIENTE MANANA',   '2026-11-13', 2500,  500),                       // v8 · por entregar en 1 día
      V('CLIENTE LEJOS',    '2026-11-30', 4000, 1000),                       // v9 · por entregar en 18 días
      V('MIA PLAZA',        '2026-08-03', 9000,    0, { oc:'RPT 08-001' }),  // v10 · RPT: no se cobra
      V('MULTICENTER',      '2026-08-10', 2000,    0, { vend:'Eduardo Añez', nota:'30791', oc:'08-050' }),   // v11 · 94 días
      V('Multicenter SRL',  '2026-10-25', 1500,    0, { vend:'Eduardo Añez', nota:'33100', oc:'10-300' }),   // v12 · 18 días
      V('JOSE CARLOS COPACABA','2026-09-20', 3000, 0, { vend:'Eduardo Añez', oc:'09-200' }),                 // v13 · 53 días
      V('JUAN CARLOS ARCE', '2026-11-20', 1200,    0, { vend:'Eduardo Añez', oc:'11-100' }),                 // v14 · por entregar
      V('ROHO',             '2026-08-05',  999,    0, { vend:'ROHO' })                                      // v15 · ROHO no es de ninguna planilla
    ];
  };
  window._txt=function(sel){ var e=document.querySelector(sel); return e ? e.innerText.replace(/\s+/g,' ').trim() : ''; };
  window._filas=function(){ return [].slice.call(document.querySelectorAll('#cbz .cbz-t tbody tr')).map(function(tr){ return tr.innerText.replace(/\s+/g,' ').trim(); }); };
  window.VENTAS=function(){
    closeModal(); segSet('cta-tab','ventas'); setContaTab('ventas');
    llenarSelectContaVendedor(); var s=document.getElementById('cta-vendedor'); if(s) s.value='';
    document.getElementById('cta-search').value=''; document.getElementById('cta-mes').value='2026-11';
    segSet('cta-mode','mes'); setContaModo('mes');
  };
  window.MAYOR=function(){ closeModal(); segSet('cta-tab','mayor'); setContaTab('mayor'); };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1280, height:900 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-11-12T15:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(350);
  await page.evaluate(PREPARAR);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  await ev(() => { showView('conta'); });
  await page.waitForTimeout(150);
  await ev(() => { STATE=FIX(); });

  const hay = await ev(() => typeof cbzAbrir==='function');
  chk('el panel tiene la ventana de Cobranza (cbzAbrir)', hay===true, hay);
  if(hay!==true){ console.log(`\n${PASS} bien · ${FAIL} mal`); await browser.close(); process.exit(1); }

  // ═══ 1-2. El equipo: solo «Lo que va a entrar» (13/11, dueño: «solo los mayoristas se atrasan en pagar») ═══════════════════
  console.log('\n── 1-2. El equipo ──');
  let r = await ev(() => { VENTAS(); return { btn:!!document.getElementById('cbz-btn') }; });
  chk('«📅 Cobranza» está en Contabilidad → Revisar', r.btn, r);
  await page.click('#cbz-btn', { force:true }).catch(()=>ev(() => cbzAbrir()));
  await page.waitForTimeout(150);
  r = await ev(() => ({ tab:CBZ.tab, tabs:[].slice.call(document.querySelectorAll('#cbz .cbz-tabs>button')).map(function(b){ return b.innerText.trim(); }) }));
  chk('⚠️ en Ventas abre «Lo que va a entrar» y NO tiene antigüedad de saldos (es de Mayoristas)', r.tab==='ent' && r.tabs.length===1 && /Lo que va a entrar/.test(r.tabs[0]), r);
  r = await ev(() => { cbzTab('ant'); return CBZ.tab; });
  chk('…ni pidiéndola a mano', r==='ent', r);
  r = await ev(() => { var D=cbzDatos(); return { T:D.T, tot:D.totD }; });
  chk('(la cuenta de la deuda por tramos sigue andando por dentro: 0-7 = 1.400, 8-30 = 1.000, 31-60 = 1.500, +60 = 4.000)',
      r.tot.n===5 && r.tot.bs===7900 && r.T.d7.bs===1400 && r.T.d30.bs===1000 && r.T.d60.bs===1500 && r.T.d60m.bs===4000, r);

  // ═══ 4. Lo que va a entrar ═════════════════════════════════════════════════════════════════
  console.log('\n── 4. Lo que va a entrar ──');
  r = await ev(() => { cbzTab('ent'); var D=cbzDatos(); return { V:D.V, tot:D.totV, cob:D.cobradoViene, filas:_filas(), txt:_txt('#cbz') }; });
  chk('por cobrar al entregar: Bs 5.700,00 en 3 ventas (hoy 700 · mañana 2.000 · lejos 3.000)', r.tot.bs===5700 && r.tot.n===3 && r.V.hoy.bs===700 && r.V.v7.bs===2000 && r.V.vmas.bs===3000, r);
  chk('…y lo ya cobrado de esas ventas (adelantos): Bs 1.500,00', r.cob===1500 && /Bs 1\.500,00/.test(r.txt), r.cob);
  chk('en orden de entrega: hoy, mañana, lejos; lo pagado, la RPT, lo de Eduardo y ROHO no están', /^CLIENTE HOY/.test(r.filas[0]||'') && /^CLIENTE MANANA/.test(r.filas[1]||'') && /^CLIENTE LEJOS/.test(r.filas[2]||'') && !/PAGADO|MIA PLAZA|MULTICENTER|ROHO/.test(r.filas.join('|')), r.filas);
  r = await ev(() => { var p=findById('v9'); p.fecha=''; p.productos[0].avisa='2026-11-20'; cbzPintar(); var D=cbzDatos(); var o={ av:D.V.avisa, vmas:D.V.vmas }; p.fecha='2026-11-30'; delete p.productos[0].avisa; return o; });
  chk('una venta que «el cliente avisa cuándo» va aparte', r.av.n===1 && r.av.bs===3000 && r.vmas.n===0, r);
  r = await ev(() => { cbzTramo('vmas'); return _filas(); });
  chk('tocar «Más adelante» deja solo CLIENTE LEJOS', r.length===1 && /^CLIENTE LEJOS/.test(r[0]), r);
  await page.click('#cbz .cbz-t tbody tr >> nth=0');
  await page.waitForTimeout(150);
  r = await ev(() => ({ txt:_txt('#modal-box'), volver:!!document.getElementById('pc-volver'), vtxt:_txt('#pc-volver') }));
  chk('⚠️ tocar el cliente abre SU venta con «← Volver a la cobranza»', /CLIENTE LEJOS/.test(r.txt) && r.volver && /Volver a la cobranza/.test(r.vtxt), r.vtxt);
  await page.click('#pc-volver');
  await page.waitForTimeout(150);
  r = await ev(() => ({ filas:_filas(), tab:CBZ.tab, tramo:CBZ.tramo }));
  chk('volver muestra la cobranza como estaba (el mismo plazo)', r.tab==='ent' && r.tramo==='vmas' && r.filas.length===1, r);

  // ═══ 5. Vendedor ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── 5. El vendedor de la ventana ──');
  r = await ev(() => { cbzTramo(''); var s=document.getElementById('cbz-vend'); s.value='Maria Flores'; s.dispatchEvent(new Event('change')); var D=cbzDatos(); return { tot:D.totV, filas:_filas() }; });
  chk('con Maria Flores elegida, solo lo suyo (no tiene nada por entregar)', r.tot.n===0 && !r.filas.length, r);
  r = await ev(() => { var s=document.getElementById('cbz-vend'); s.value=''; s.dispatchEvent(new Event('change')); cbzCopiar('ent'); cbzExcel('ent'); return { c:COPIADO, d:DESCARGAS.slice() }; });
  chk('📋 Copiar y ⬇️ Excel de lo que va a entrar', /Lo que va a entrar/.test(r.c) && /CLIENTE MANANA/.test(r.c) && /^lo-que-va-a-entrar-todo-el-equipo-2026-11-12\.xlsx$/.test(r.d[r.d.length-1]||''), r);

  // ═══ 5b. Antigüedad de saldos, en Mayoristas ══════════════════════════════════════════════════
  console.log('\n── 5b. Antigüedad de saldos (Mayoristas) ──');
  r = await ev(() => { MAYOR(); cbzAbrir('ant'); var D=cbzDatos(); return { tab:CBZ.tab, T:D.T, tot:D.totD, viene:D.totV, filas:_filas(), txt:_txt('#cbz') }; });
  chk('en Mayoristas está la antigüedad: Bs 6.500,00 en 3 OC (0-30 = 1.500, 31-60 = 3.000, +60 = 2.000); lo del equipo no',
      r.tab==='ant' && r.tot.n===3 && r.tot.bs===6500 && r.T.d30.bs===1500 && r.T.d60.bs===3000 && r.T.d60m.bs===2000 && !/CLIENTE/.test(r.filas.join('|')) && /Bs 6\.500,00/.test(r.txt), r);
  chk('…de la más vieja a la más nueva, y la de JUAN CARLOS ARCE (por entregar) no es deuda', /^MULTICENTER/.test(r.filas[0]||'') && !/JUAN CARLOS ARCE/.test(r.filas.join('|')) && r.viene.bs===1200, r.filas);
  r = await ev(() => { cbzTramo('d60'); var f=_filas(); cbzExcel('ant'); return { f:f, d:DESCARGAS[DESCARGAS.length-1] }; });
  chk('tocar «31 a 60 días» deja solo la de Copacaba; ⬇️ Excel', r.f.length===1 && /JOSE CARLOS COPACABA/.test(r.f[0]) && /^antiguedad-de-saldos-eduardo-anez-2026-11-12\.xlsx$/.test(r.d||''), r);

  // ═══ 6-7. Mayoristas ═══════════════════════════════════════════════════════════════════════
  console.log('\n── 6-7. Mayoristas: estado de cuenta y «Pagó las tildadas» ──');
  r = await ev(() => { MAYOR(); cbzAbrir(); var L=cbzMayDatos(); return { tab:CBZ.tab, L:L.map(function(c){ return [c.k, c.debe, c.n, c.d30, c.d60, c.d60m, c.viene]; }), txt:_txt('#cbz') }; });
  chk('en Mayoristas abre «🏭 Por cliente»', r.tab==='cli' && /Por cliente/.test(r.txt), r.tab);
  var mc=(r.L||[]).filter(x=>x[0]==='Multicenter')[0]||[], cp=(r.L||[]).filter(x=>x[0]==='Copacaba')[0]||[];
  chk('⚠️ Multicenter junta «MULTICENTER» y «Multicenter SRL»: debe Bs 3.500 (1.500 de 0-30 y 2.000 de más de 60)', mc[1]===3500 && mc[2]===2 && mc[3]===1500 && mc[5]===2000, mc);
  chk('⚠️ Copacaba junta «JOSE CARLOS COPACABA» y «JUAN CARLOS ARCE»: debe 3.000 (31-60) y 1.200 por entregar', cp[1]===3000 && cp[4]===3000 && cp[6]===1200, cp);
  chk('las ventas del equipo no aparecen en Mayoristas', !(r.L||[]).some(x=>/CLIENTE/.test(x[0])), r.L);
  r = await ev(() => { cbzCliAbrir('Multicenter'); return { filas:_filas(), txt:_txt('#cbz') }; });
  chk('la ficha de Multicenter lista sus 2 OC con «Su N°» (30791 y 33100)', r.filas.length===2 && /30791/.test(r.filas.join('|')) && /33100/.test(r.filas.join('|')), r.filas);
  r = await ev(() => { cbzSelVarias('d30'); return { sel:Object.keys(CBZ.sel), pago:!!document.getElementById('cbz-pago'), txt:_txt('#cbz-pago') }; });
  chk('«Las de más de 30 días» tilda solo la de agosto, y aparece «💵 Pagó las 1 OC… Bs 2.000,00»', r.sel.join()==='v11' && r.pago && /Bs 2\.000,00/.test(r.txt), r);
  r = await ev(() => { cbzSelVarias('todas'); return _txt('#cbz-pago'); });
  chk('«Tildar todas» = 2 OC · Bs 3.500,00', /2 OC tildadas · Bs 3\.500,00/.test(r), r);
  r = await ev(() => { GUARDADOS=[]; cbzPagoRegistrar(); return { g:GUARDADOS.length, sel:Object.keys(CBZ.sel).length }; });
  chk('sin banco no registra nada', r.g===0 && r.sel===2, r);
  r = await ev(() => { document.getElementById('cbz-banco').value=document.getElementById('cbz-banco').options[1].value; cbzPagoRecordar(); cbzPagoRegistrar(); return GUARDADOS.length; });
  chk('sin N° de recibo tampoco', r===0, r);
  r = await ev(() => { document.getElementById('cbz-nota').value='TRF 5566'; cbzPagoRecordar(); cbzPagoRegistrar(); return GUARDADOS.length; });
  chk('sin comprobante tampoco', r===0, r);
  await ev(() => { cbzPagoSubir(new Blob(['x'])); });
  await page.waitForTimeout(150);
  r = await ev(() => ({ comps:CBZ.pago.comps.slice(), txt:_txt('#cbz-pago') }));
  chk('📎 la imagen subida queda lista', r.comps.join()==='FOTO123' && /1 imagen lista/.test(r.txt), r);
  r = await ev(() => { var p=findById('v12'); p.saldo=0; p.pagado=true; p.metodoPago='QR 1500 @2026-11-12 #X'; return true; });   // alguien la pagó mientras tanto
  await ev(() => { cbzPagoRegistrar(); });
  await page.waitForTimeout(300);
  r = await ev(() => { var p=findById('v11'); var c=cobrosDe(p); return { g:GUARDADOS.length, pagado:p.pagado, saldo:p.saldo, c:c.map(function(x){ return [x.metodo, x.banco, x.monto, x.fecha, x.nota, (x.comps||[]).join()]; }), sel:Object.keys(CBZ.sel).length }; });
  chk('⚠️ registra la OC 30791: QR, el banco, Bs 2.000, hoy, «TRF 5566» y el comprobante; queda pagada', r.g===1 && r.pagado===true && Math.abs(r.saldo)<0.01 &&
      r.c.length===1 && r.c[0][0]==='QR' && r.c[0][2]===2000 && r.c[0][3]==='2026-11-12' && r.c[0][4]==='TRF 5566' && r.c[0][5]==='FOTO123', r);
  chk('…y la 33100, que alguien pagó mientras tanto, se saltea (no se cobra dos veces)', r.g===1, r.g);
  r = await ev(() => { var L=cbzMayDatos(); var m=L.filter(function(c){ return c.k==='Multicenter'; })[0]; return { debe:m?m.debe:null, txt:_txt('#cbz') }; });
  chk('Multicenter ya no debe nada', r.debe===0 && /no debe nada|Al día/.test(r.txt), r.debe);
  r = await ev(() => { cbzCliAbrir('Copacaba'); cbzCliCopiar('Copacaba'); cbzCliExcel('Copacaba'); return { c:COPIADO, d:DESCARGAS[DESCARGAS.length-1] }; });
  chk('📋 y ⬇️ el estado de cuenta de Copacaba', /Estado de cuenta · Copacaba/.test(r.c) && /Bs 3\.000,00/.test(r.c) && /por entregar/.test(r.c) && /^estado-de-cuenta-copacaba-2026-11-12\.xlsx$/.test(r.d||''), r);

  // ═══ 8. Celular ════════════════════════════════════════════════════════════════════════════
  console.log('\n── 8. En el celular ──');
  await page.setViewportSize({ width:390, height:844 });
  await ev(() => { VENTAS(); cbzAbrir(); });
  await page.waitForTimeout(200);
  r = await ev(() => ({ w:document.documentElement.scrollWidth, vw:innerWidth }));
  chk('a 390 px la página no corre de costado', r.w<=r.vw+1, r);

  chk('sin errores de la página', !errores.length, errores);
  console.log(`\n${PASS} bien · ${FAIL} mal`);
  await browser.close();
  process.exit(FAIL?1:0);
})();
