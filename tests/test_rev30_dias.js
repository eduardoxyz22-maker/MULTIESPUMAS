/* 🚫 DÍAS SIN CAMIÓN DE LA REVISIÓN EN TRES NIVELES (30/09, bitácora §4hd, RESPUESTA §22-§23): R1-1…R1-4, A1-1 y A1-2.

   Reloj clavado en el SÁBADO 31/10/2026 a las 10:00 de Bolivia: mañana es domingo y el lunes 02/11 es Todos Santos, así que el
   próximo camión es el martes 03/11. Para A1-2 el reloj pasa al lunes feriado. Solo datos inventados.

   ⚠️ LO QUE CUIDA (las marcadas «diente» fallan contra lo publicado el 29/09, `2207922`):
   1. R1-3 (diente) — «＋ Nuevo pedido» propone el próximo día CON camión (martes 03/11), no «mañana» (domingo 01/11), y el
      mínimo sigue siendo mañana.
   2. R1-2 (diente) — los pedidos que quedaron en un día sin camión (feriado o domingo) se listan en Administración y en la lista
      de carga, cada uno con 📅 Reprogramar; y el final del importador de ROHO dice que ese día el camión no sale (antes
      «0 de 0 · lleno» y «ocupan lugar en el camión»).
   3. A1-1 (diente) — «🔒 Cerrar día»: botón «🚚 Próximo camión» cuando mañana no hay camión, y un feriado o un domingo dicen
      «no sale el camión» y cuál es el camión que sigue (antes «🔓 está abierto · se pueden seguir agregando»).
   4. R1-4 (diente) — una vendedora que le cambia SOLO el turno a un pedido que quedó en un feriado recibe «el camión no sale,
      en ningún turno: cambiale el DÍA» (antes «lleno, probá el otro turno»). Administración con la clave lo sigue moviendo.
   5. A1-2 (diente) — el cuadrito, en un feriado, no le pide a la vendedora «el corte de hoy»: mide contra el último día hábil.
   6. R1-1 (diente) — la devolución de una ATC se va a buscar a fábrica 2 días HÁBILES antes (sin domingo ni feriado): con
      Carnaval, el aviso caía en el mismo feriado.

   Se corre:  node tests/test_rev30_dias.js          (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/a/pedidos_2207922.html node tests/test_rev30_dias.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=false;
  try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  try{ cargaBanner(); }catch(e){}
  window._SRV={ pedidos:[] };
  window._saves=[];
  window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(k||'')+': '+String(m)); return _t(m,k,ms); };
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window._SRV.pedidos)) }); };
  apiSave=function(rec){
    var r=JSON.parse(JSON.stringify(rec)); window._saves.push(r);
    if(!/^__/.test(String(r.id))){ var i=window._SRV.pedidos.findIndex(function(p){ return p.id===r.id; }); if(i>=0) window._SRV.pedidos[i]=r; else window._SRV.pedidos.push(r); }
    return Promise.resolve({ ok:true, pedido:rec });
  };
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  window._P=function(o){ return Object.assign({ id:'p'+Math.random().toString(36).slice(2,9), fecha:'', oc:'10-900', vendedor:'Maria Flores',
    cliente:'CLIENTE X', celular:'70000000', turno:'AM', zona:'Norte', direccion:'Calle 1', maps:'', pagado:false, saldo:1000, ts:Date.now()-86400000,
    metodoPago:'', observaciones:'', estado:'', entregado:false, vehiculo:'', chofer:'', garantia:'', nota:'1500', acuenta:0, facturarA:'', nit:'',
    nroDia:1, verificado:false, fotos:[], productos:[{ desc:'TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:3000 }] }, o); };
  window._escenario=async function(pedidos){ window._SRV.pedidos=JSON.parse(JSON.stringify(pedidos||[])); await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok'; };
  window._texto=function(id){ var e=document.getElementById(id); return e ? e.innerText.replace(/\s+/g,' ').trim() : ''; };
  window._guardar=async function(){ var n0=window._saves.length; document.getElementById('f-submit').click(); for(var i=0;i<60;i++){ await _esperar(50); var b=document.getElementById('f-submit'); if(b && !b.disabled) break; } await _esperar(400); return window._saves.slice(n0).filter(function(r){ return !/^__/.test(String(r.id)); }); };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[], dialogos=[];
  const ctx = await browser.newContext({ viewport:{ width:1100, height:1000 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => { dialogos.push(d.message()); d.accept(); });
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-31T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  await page.evaluate(PREPARAR);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,400) }; } };
  chk('el reloj está clavado en el sábado 31/10/2026, con el lunes 02/11 feriado', await page.evaluate(() => todayStr()+' '+feriadoDe('2026-11-02')) === '2026-10-31 Todos Santos');

  // ═══ 1. R1-3: la fecha que propone el formulario ═══════════════════════════════════════════════════════════════
  console.log('\n── 1. «＋ Nuevo pedido» propone el próximo día con camión ──');
  let r = await ev(async () => { showView('form'); resetForm(); var f=document.getElementById('f-fecha'); return { valor:f.value, min:f.min, prox:proximoDiaEntrega() }; });
  chk('1. (diente) el sábado 31/10 propone el martes 03/11 (ni el domingo 01/11 ni el feriado 02/11)', r && r.valor==='2026-11-03' && r.prox==='2026-11-03', r);
  chk('1. …y el mínimo sigue siendo mañana (Administración puede elegir otro día)', r && r.min==='2026-11-01', r);

  // ═══ 2. R1-2: los pedidos que quedaron en un día sin camión ═══════════════════════════════════════════════════
  console.log('\n── 2. Los pedidos que quedaron en un feriado o un domingo se listan, con 📅 Reprogramar ──');
  r = await ev(async () => {
    await _escenario([
      _P({ id:'pFer', oc:'10-901', cliente:'CLIENTE FERIADO', fecha:'2026-11-02' }),
      _P({ id:'pDom', oc:'10-902', cliente:'CLIENTE DOMINGO', fecha:'2026-11-01', vendedor:'ROHO' }),
      _P({ id:'pBien', oc:'10-903', cliente:'CLIENTE MARTES', fecha:'2026-11-03' }),
      _P({ id:'pYa', oc:'10-880', cliente:'CLIENTE ENTREGADO', fecha:'2026-10-25', entregado:true }),     // domingo, pero ya se entregó
      _P({ id:'pPas', oc:'09-870', cliente:'CLIENTE VIEJO', fecha:'2026-09-25', entregado:false })          // 25/09 ya pasó (y es de hace más de una semana)
    ]);
    showView('admin'); try{ renderRevisar(); }catch(e){}
    var adm=_texto('adm-revisar'), botones=document.querySelectorAll('#adm-revisar button[onclick^="reprogramarPedido"]').length;
    abrirCarga(); await _esperar(100); var carga=_texto('carga-body'); document.getElementById('carga-overlay').style.display='none';
    var lista=(typeof pedidosEnDiaSinCamion==='function') ? pedidosEnDiaSinCamion().map(function(p){ return p.id; }) : null;
    renderImportRohoFin([ STATE.filter(function(p){ return p.id==='pFer'; })[0], STATE.filter(function(p){ return p.id==='pBien'; })[0] ], [], []);
    var roho=_texto('modal-box'); closeModal();
    return { adm:adm, botones:botones, carga:carga, lista:lista, roho:roho };
  });
  chk('2. (diente) Administración: «2 pedidos quedaron en un día sin camión», con el feriado (Todos Santos) y el domingo',
      r && /2 pedidos quedaron en un día sin camión/.test(r.adm) && /Todos Santos/.test(r.adm) && /CLIENTE FERIADO/.test(r.adm) && /CLIENTE DOMINGO/.test(r.adm), r && r.adm.slice(0,400));
  chk('2. (diente) …cada uno con su botón 📅 Reprogramar', r && r.botones===2, r && r.botones);
  chk('2. …y no nombra al que ya se entregó, al del martes ni al de un feriado de hace más de una semana',
      r && !/CLIENTE ENTREGADO|CLIENTE MARTES|CLIENTE VIEJO/.test(r.adm), r && r.adm.slice(0,400));
  chk('2. (diente) la lista de carga también lo dice arriba', r && /quedaron en un día sin camión/.test(r.carga), r && r.carga.slice(0,300));
  chk('2. (diente) el final del importador de ROHO: «Todos Santos: el camión no sale · pasalos a otro día», no «0 de 0 · lleno»',
      r && /Todos Santos: el camión no sale/.test(r.roho) && /día sin camión/.test(r.roho) && !/0 de 0/.test(r.roho), r && r.roho.slice(0,500));

  // ═══ 3. A1-1: 🔒 Cerrar día ═════════════════════════════════════════════════════════════════════════════════════
  console.log('\n── 3. 🔒 Cerrar día: el próximo camión, y un feriado o un domingo no «siguen abiertos» ──');
  r = await ev(async () => {
    UNLOCKED=true; renderCierreDias(true); await _esperar(100);
    var ini=_texto('modal-box');
    var boton=[].slice.call(document.querySelectorAll('#modal-box button')).map(function(b){ return b.innerText; }).filter(function(t){ return /Próximo camión/.test(t); })[0]||'';
    cieIr('2026-11-02'); var fer=_texto('modal-box');
    cieIr('2026-11-01'); var dom=_texto('modal-box');
    cieIr('2026-11-03'); var mar=_texto('modal-box');
    closeModal(); UNLOCKED=false;
    return { ini:ini.slice(0,300), boton:boton, fer:fer, dom:dom, mar:mar };
  });
  chk('3. (diente) el sábado hay un botón «🚚 Próximo camión: … 03/11»', r && /Próximo camión/.test(r.boton) && /03\/11/.test(r.boton), r && r.boton);
  chk('3. (diente) el lunes 02/11: «es feriado (Todos Santos): no sale el camión», su pedido «hay que pasarlo a otro día» y el camión que sigue (03/11)',
      r && /es feriado \(Todos Santos\): no sale el camión/.test(r.fer) && /hay que pasarlos a otro día/.test(r.fer) && /El camión que sigue es el del .*03\/11/.test(r.fer) && !/Se pueden seguir agregando/.test(r.fer),
      r && (r.fer.match(/🚫[^🔒]{0,260}/)||[r.fer.slice(0,300)])[0]);
  chk('3. (diente) el domingo 01/11: «es domingo: no sale el camión»', r && /es domingo: no sale el camión/.test(r.dom), r && r.dom.slice(0,300));
  chk('3. …y el martes 03/11 sigue «abierto, se pueden seguir agregando»', r && /está abierto/.test(r.mar) && /Se pueden seguir agregando/.test(r.mar), r && r.mar.slice(0,300));

  // ═══ 4. R1-4: cambiarle solo el turno a un pedido que quedó en un feriado ══════════════════════════════════════
  console.log('\n── 4. Cambiarle SOLO el turno a un pedido en un feriado: hay que cambiarle el día ──');
  r = await ev(async () => {
    UNLOCKED=false;
    editPedido('pFer'); await _esperar(300);
    segSet('f-turno','PM'); window._toasts=[];
    var g=await _guardar();
    var o={ vend:{ guardados:g.length, aviso:window._toasts.filter(function(t){ return /^err/.test(t); }).slice(-1)[0]||'' } };
    try{ resetForm(); }catch(e){}
    UNLOCKED=true;
    editPedido('pFer'); await _esperar(300);
    segSet('f-turno','PM'); window._toasts=[];
    var g2=await _guardar();
    o.adm={ guardados:g2.length, turno:(g2[0]||{}).turno||'' };
    try{ resetForm(); }catch(e){}
    UNLOCKED=false;
    return o;
  });
  chk('4. (diente) la vendedora: «El lunes 02/11 es feriado (Todos Santos): el camión no sale, en ningún turno. Cambiale el DÍA», y no se guarda',
      r && r.vend && r.vend.guardados===0 && /es feriado \(Todos Santos\): el camión no sale, en ningún turno\. Cambiale el DÍA/.test(r.vend.aviso), r && r.vend);
  chk('4. …Administración con la clave lo sigue pudiendo mover de turno', r && r.adm && r.adm.guardados===1 && r.adm.turno==='PM', r && r.adm);

  // ═══ 5. A1-2: el aviso del corte en un feriado ══════════════════════════════════════════════════════════════════
  console.log('\n── 5. En un feriado, el cuadrito no pide «el corte de hoy» ──');
  const corte = async (hoy, f) => { await page.clock.setFixedTime(new Date(hoy+'T10:00:00-04:00'));
    return ev((f) => { STOCK=stockVacio(); STOCK.c={ f:f, hora:'09:00', u:{}, solo0:true }; STOCK_CARGADO=true; ULTIMO_REFRESCO=Date.now(); CARGA_ESTADO='ok'; ULTIMO_ERROR='';
      return saldoAvisos().filter(function(t){ return /corte/.test(t); }); }, f); };
  const fer31 = await corte('2026-11-02', '2026-10-31'), fer30 = await corte('2026-11-02', '2026-10-30'), mar31 = await corte('2026-11-03', '2026-10-31');
  chk('5. (diente) el lunes feriado con el corte del sábado (el último día hábil): ningún aviso del corte', Array.isArray(fer31) && fer31.length===0, fer31);
  chk('5. (diente) …con el del viernes: «falta el del 31/10 (hoy es feriado y logística no trabaja)», no «pedile el de hoy»',
      Array.isArray(fer30) && fer30.length===1 && /falta el del .*31\/10.*hoy es feriado y logística no trabaja/.test(fer30[0]) && !/el de hoy/.test(fer30[0]), fer30);
  chk('5. …y el martes, con el del sábado, sí: «pedile a logística que suba el de hoy»', Array.isArray(mar31) && mar31.length===1 && /pedile a logística que suba el de hoy/.test(mar31[0]), mar31);

  // ═══ 6. R1-1: ir a buscar la devolución de una ATC ══════════════════════════════════════════════════════════════
  console.log('\n── 6. La devolución de una ATC se va a buscar 2 días hábiles antes ──');
  r = await ev(() => {
    var atc=function(pdev){ return { productos:[{ desc:'COLCHON', medida:'160x190', cant:1, atc:{ pdev:pdev } }] }; };
    return { carnaval:atcRecogerFabDesde(atc('2027-02-10')), feriado:atcRecogerFabDesde(atc('2026-11-04')), normal:atcRecogerFabDesde(atc('2026-11-05')) };
  });
  chk('6. (diente) devolución el miércoles 10/02/2027 (lunes y martes de Carnaval): se va a buscar desde el viernes 05/02, no el lunes 08 (feriado)',
      r && r.carnaval==='2027-02-05', r);
  chk('6. (diente) devolución el miércoles 04/11 (lunes feriado): desde el sábado 31/10, no el lunes 02/11', r && r.feriado==='2026-10-31', r);
  chk('6. …y en una semana sin feriados, 2 días antes como siempre (jueves 05/11 → martes 03/11)', r && r.normal==='2026-11-03', r);

  chk('ningún error de JavaScript', errores.length===0, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
