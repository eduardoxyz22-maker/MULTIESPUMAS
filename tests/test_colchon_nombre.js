/* 🛏️ «COLCHON» EN EL NOMBRE Y EL CÓDIGO QUE SE PONE SOLO (dueño, 25/10).

   *«Si escribo Colchon titanio no sale nada, pero si pongo titanio látex sí sale y se coloca el código, pero no dice Colchon»* y
   *«acabo de realizar un pedido de María… escribió manualmente colchón titanio látex, pero el sistema no identificó el código»*.

   LO QUE CUIDA:
   1. La lista emergente encuentra «colchon titanio» y muestra «COLCHON TITANIO LATEX/ICE»; el somier y la almohada no llevan «COLCHON».
   2. Elegir de la lista (o escribir el código) deja escrito «COLCHON …» con su código y su medida.
   3. Escrito A MANO sin elegir: al salir del campo el código se completa solo con la identidad del stock, y se dice abajo.
      No pisa un código que escribió la vendedora, se borra si cambia el nombre, y no adivina una medida especial.
   4. Un renglón que ya traía el pedido, sin tocar, no recibe código (es parte de `prodClave`: perdería las marcas de logística).
   5. Lo guardado con «COLCHON» cuenta como el mismo producto del stock (misma clave que el catálogo) y el cuadrito no dice
      «código de otro producto».

   Reloj CLAVADO (martes 27/10/2026, 10:00 de Bolivia).
   Se corre:  node tests/test_colchon_nombre.js          (desde la raíz del repo)
   Solo datos sintéticos: el repo es público. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=false;
  try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  window._SRV={ pedidos:[], stock:null };
  window._saves=[];
  apiList=function(){
    var l=JSON.parse(JSON.stringify(window._SRV.pedidos));
    if(window._SRV.stock) l.push({ id:'__stock__', fecha:'', cliente:'📦 STOCK', observaciones:JSON.stringify(window._SRV.stock) });
    return Promise.resolve({ ok:true, pedidos:l });
  };
  apiSave=function(rec){
    var r=JSON.parse(JSON.stringify(rec)); window._saves.push(r);
    if(!/^__/.test(String(r.id))){ var i=window._SRV.pedidos.findIndex(function(p){ return p.id===r.id; }); if(i>=0) window._SRV.pedidos[i]=r; else window._SRV.pedidos.push(r); }
    return Promise.resolve({ ok:true, pedido:rec });
  };
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  window._stock=function(){
    var hoy=todayStr(), st={ c:{ f:hoy, hora:'08:30:00', u:{}, solo0:true, alm:'PRODUCTOS TERMINADOS FAB.', cod:{}, t:Date.now()-3600000 }, e:[], p:[], a:{}, g:{}, al:{}, h:[] };
    st.al['PRODUCTOS TERMINADOS FAB.']='log';
    st.c.u[stockClave({ desc:'TITANIO LATEX', medida:'180x190', codigo:'CH1131' })]=4;
    return st;
  };
  var ev=function(e,t){ e.dispatchEvent(new Event(t||'input', { bubbles:true })); };
  window._ev=ev;
  window._nuevo=function(){ if(document.getElementById('modal').classList.contains('on')) closeModal(); showView('form'); resetForm(); };
  window._card=function(i){ return document.querySelectorAll('#f-productos .prod-card')[i||0]; };
  window._ren=function(i){ var c=_card(i), ms=c.querySelector('.prod-medida'), mo=c.querySelector('.prod-medida-otro'), r=c.querySelector('.prod-reco'), b=c.querySelector('.prod-saldo');
    return { desc:c.querySelector('.prod-desc').value, medida:(ms.value==='Otros'?('Otros:'+mo.value):ms.value), codigo:c.querySelector('.prod-codigo').value,
             reco:(r && !r.hidden) ? r.textContent : '', caja:(b && !b.hidden) ? b.innerText.replace(/\s+/g,' ').trim() : '' }; };
  // escribir como una persona: letra por letra dispara `input` (abre la lista); al salir, `change`
  window._escribir=function(i, txt){ var d=_card(i).querySelector('.prod-desc'); d.focus(); d.value=txt; ev(d,'input'); fxBuscaAbrir(d); };   // la lista se abre solo con teclas de verdad (isTrusted)
  window._salir=function(i){ var d=_card(i).querySelector('.prod-desc'); ev(d,'change'); d.blur(); };
  window._medida=function(i, m){ var c=_card(i), ms=c.querySelector('.prod-medida');
    if(MEDIDAS.indexOf(m)>=0){ ms.value=m; ev(ms,'change'); } else { ms.value='Otros'; ev(ms,'change'); var o=c.querySelector('.prod-medida-otro'); o.value=m; ev(o,'input'); ev(o,'change'); } };
  window._lista=function(){ var el=document.getElementById('fx-busca'); if(!el || el.hidden) return []; return [].map.call(el.querySelectorAll('.fx-bo .t b'), function(b){ return b.textContent; }); };
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1100, height:1000 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await ctx.route(/^https:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-27T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  await page.evaluate(PREPARAR);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  await ev(async () => { window._SRV.stock=window._stock(); STOCK_CARGADO=false; await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok'; });

  /* ── 1. La lista ── */
  const l1 = await ev(async () => { _nuevo(); _escribir(0, 'colchon titanio'); await _esperar(100); return _lista(); });
  chk('1a. «colchon titanio» encuentra los colchones TITANIO (antes no salía nada)', l1.length>0 && l1.every(function(t){ return /^COLCHON TITANIO (LATEX|ICE)$/.test(t); }), l1);
  const l2 = await ev(async () => { _nuevo(); _escribir(0, 'titanio latex'); await _esperar(100); return _lista(); });
  chk('1b. «titanio latex» sigue encontrando, y el colchón se muestra «COLCHON TITANIO LATEX»', l2.indexOf('COLCHON TITANIO LATEX')>=0, l2);
  chk('1c. …el somier se muestra como siempre, sin «COLCHON»', l2.indexOf('SOMIER TITANIO LATEX')>=0 && !l2.some(function(t){ return /COLCHON SOMIER/.test(t); }), l2);
  const l3 = await ev(async () => { _nuevo(); _escribir(0, 'almohada'); await _esperar(100); return _lista(); });
  chk('1d. la almohada no lleva «COLCHON»', l3.length>0 && !l3.some(function(t){ return /^COLCHON/.test(t); }), l3);
  const l4 = await ev(async () => { _nuevo(); _escribir(0, 'colchon soft'); await _esperar(100); return _lista(); });
  chk('1e. un colchón que ya se llama «COLCHON …» no queda «COLCHON COLCHON»', l4.length>0 && !l4.some(function(t){ return /COLCHON COLCHON/.test(t); }), l4);

  /* ── 2. Elegir / escribir el código ── */
  const e1 = await ev(async () => { _nuevo(); _escribir(0, 'colchon titanio latex 180'); await _esperar(100);
    var o=[].filter.call(document.querySelectorAll('#fx-busca .fx-bo'), function(x){ return /180x190/.test(x.textContent); })[0];
    o.dispatchEvent(new MouseEvent('mousedown',{bubbles:true})); await _esperar(300); return _ren(0); });
  chk('2a. elegir de la lista deja «COLCHON TITANIO LATEX» · 180x190 · CH1131', e1.desc==='COLCHON TITANIO LATEX' && e1.medida==='180x190' && e1.codigo==='CH1131' && !e1.reco, e1);
  chk('2b. …el cuadrito lo encuentra en el stock (PTF 4) y no dice «código de otro producto»', /PTF 4/.test(e1.caja) && !/OTRO PRODUCTO|OTRA MEDIDA/i.test(e1.caja), e1.caja);
  const e2 = await ev(async () => { _nuevo(); var c=_card(0).querySelector('.prod-codigo'); c.value='ch1131'; _ev(c,'input'); await _esperar(300); return _ren(0); });
  chk('2c. escribir el código CH1131 también deja «COLCHON TITANIO LATEX»', e2.desc==='COLCHON TITANIO LATEX' && e2.medida==='180x190', e2);
  const e3 = await ev(async () => { _nuevo(); var c=_card(0).querySelector('.prod-codigo'); c.value='CH1255'; _ev(c,'input'); await _esperar(200); return _ren(0); });
  chk('2d. el código del somier (CH1255) deja «SOMIER TITANIO LATEX», sin «COLCHON»', e3.desc==='SOMIER TITANIO LATEX', e3);

  /* ── 3. Escrito a mano ── */
  const m1 = await ev(async () => { _nuevo(); _escribir(0, 'COLCHON TITANIO LATEX'); _salir(0); _medida(0, '180x190'); await _esperar(400); return _ren(0); });
  chk('3a. escrito a mano «COLCHON TITANIO LATEX» + 180x190: el código CH1131 se pone solo (el pedido de María)', m1.codigo==='CH1131' && m1.desc==='COLCHON TITANIO LATEX', m1);
  chk('3b. …y lo dice abajo del renglón', /Lo reconocí/.test(m1.reco) && /CH1131/.test(m1.reco), m1.reco);
  const m2 = await ev(async () => { _nuevo(); _medida(0, '160x190'); _escribir(0, 'COLCHON ORO ANATOMICO'); _salir(0); await _esperar(400); return _ren(0); });
  chk('3c. con la medida primero y el nombre después también («COLCHON ORO ANATOMICO» 160x190 → CH1037)', m2.codigo==='CH1037', m2);
  const m3 = await ev(async () => { _escribir(0, 'COLCHON NUEVO RARO'); await _esperar(50); _salir(0); await _esperar(300); return _ren(0); });
  chk('3d. si cambia el nombre por uno que no se reconoce, el código que puso el panel se borra', m3.codigo==='' && !m3.reco, m3);
  const m4 = await ev(async () => { _nuevo(); var c=_card(0).querySelector('.prod-codigo'); _escribir(0, 'COLCHON TITANIO LATEX'); _medida(0, '180x190');
    c.value='XX123'; _ev(c,'input'); _salir(0); await _esperar(300); return _ren(0); });
  chk('3e. no pisa un código que escribió la vendedora', m4.codigo==='XX123', m4);
  const m5 = await ev(async () => { _nuevo(); _escribir(0, 'COLCHON TITANIO LATEX'); _salir(0); _medida(0, '160x200'); await _esperar(300); return _ren(0); });
  chk('3f. una medida especial (160x200) no recibe el código de ninguna medida estándar', m5.codigo==='', m5);

  /* ── 4. Un pedido que ya estaba ── */
  const p4 = await ev(async () => {
    var f=stockSumarDias(todayStr(), 4);
    window._SRV.pedidos=[{ id:'p-viejo', oc:'10-500', fecha:f, turno:'AM', vendedor:'Maria Flores', cliente:'CLIENTE VIEJO', celular:'70000001', zona:'Norte', nota:'901',
      productos:[{ desc:'COLCHON TITANIO LATEX', medida:'180x190', codigo:'', cant:1, chk:'ok', chkDe:'Almacen Distribucion Banzer' }], saldo:100, ts:Date.now()-86400000 }];
    await refrescarEstado(); editPedido('p-viejo'); await _esperar(500);
    var r=_ren(0); _salir(0); await _esperar(300); var r2=_ren(0);
    var n0=window._saves.length; document.getElementById('f-submit').click();
    for(var i=0;i<40;i++){ await _esperar(50); var b=document.getElementById('f-submit'); if(b && !b.disabled) break; }
    await _esperar(300);
    var s=window._saves.slice(n0).filter(function(x){ return x.id==='p-viejo'; })[0];
    return { antes:r, despues:r2, guardado:s ? s.productos[0] : null };
  });
  chk('4a. al abrir un pedido viejo, el renglón sin código queda sin código (no se toca solo)', p4.antes && p4.antes.codigo==='' && p4.despues.codigo==='', p4);
  chk('4b. …y al guardarlo conserva la marca de logística (✔ Banzer)', p4.guardado && p4.guardado.chk==='ok' && /Banzer/.test(p4.guardado.chkDe||''), p4.guardado);

  /* ── 5. Lo guardado cuenta como el mismo producto ── */
  const k5 = await ev(async () => ({ a:stockInfo({ desc:'COLCHON TITANIO LATEX', medida:'180x190', codigo:'CH1131' }).k, b:stockInfo({ desc:'TITANIO LATEX', medida:'180x190', codigo:'CH1131' }).k,
    c:stockInfo({ desc:'COLCHON TITANIO LATEX', medida:'180x190', codigo:'' }).k, tipo:pryTipoProd({ desc:'COLCHON TITANIO LATEX', codigo:'CH1131' }) }));
  chk('5a. «COLCHON TITANIO LATEX» con o sin código es la misma clave del stock que «TITANIO LATEX»', k5.a===k5.b && k5.c===k5.b, k5);
  chk('5b. …y sigue contando como colchón (Proyección, unidades)', k5.tipo==='colchon', k5);

  chk('sin errores de la página', errores.length===0, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
