/* 🏷️ UN CÓDIGO QUE NO ESTÁ EN LA LISTA DE PRECIOS PERO SÍ EN EL ALMACÉN (dueño, 29/09).

   *«¿Qué pasa si ponen un código que no está en lista de precios y sí en almacén? Ejemplo, puse ese código que no está en
   lista de precio pero sí en almacén: no se autocompleta ni marca disponible.»* (Ch1158 = SOMIER PLATA 200X200.)

   ⚠️ LO QUE CUIDA (cada punto con «CA» falla contra lo publicado, `f722163`):
   1. Escribir el código (también en minúscula) completa el producto y la medida desde el Excel del almacén, y lo dice.
   2. El cuadrito aparece solo y dice si hay: ✅ en PTF, 📥 en Moreno, y con un producto del almacén SIN medida.
   3. Una medida que no es de la lista (150x200), si es la del almacén, no es «📐 medida especial».
   4. El pedido se guarda con ese código y cuenta como pendiente de ESE producto del almacén.
   5. Si el código se escribió antes de que llegara el saldo, se completa cuando llega la lectura.
   Y lo de siempre: un código de la lista de precios completa como antes, y uno que no está en ningún lado no hace nada.

   Reloj CLAVADO (martes 29/09/2026, 10:00 de Bolivia: antes del corte de las 17).
   Se corre:  node tests/test_codigo_almacen.js          (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/a/pedidos_f722163.html node tests/test_codigo_almacen.js
   Solo datos sintéticos: el repo es público. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=false;
  try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  try{ cargaBanner(); }catch(e){}
  window._SRV={ pedidos:[], stock:null };
  window._saves=[];
  window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(k||'')+': '+String(m)); return _t(m,k,ms); };
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
  downloadBlob=function(){};
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  /* El stock como lo deja «📥 Subir existencias» (`existLeer` + `confirmarImportExist`): un renglón con un código que la
     lista de precios no conoce se guarda con su nombre crudo (`stockClaveCruda`) y el código apunta a esa clave (`cod`). */
  window._stock=function(){
    var hoy=todayStr(), LOG='PRODUCTOS TERMINADOS FAB.', IM='IM - PRODUCTOTERMINADO';
    var st={ c:{ f:hoy, hora:'08:30:00', u:{}, solo0:true, alm:LOG, cod:{}, t:Date.now()-3600000 }, e:[], p:[], a:{}, g:{}, al:{}, h:[] };
    st.g[IM]={ f:hoy, hora:'08:00:00', u:{}, solo0:true, cod:{}, t:Date.now()-3600000, rs:{} };
    st.al[LOG]='log'; st.al[IM]='otro';
    var poner=function(s, cod, nombre, cant){ var k=stockClaveCruda({ desc:nombre, medida:medidaDeTexto(nombre) }); s.u[k]=(s.u[k]||0)+cant; s.cod[cod]=k; return k; };
    window._K={
      plata:   poner(st.c, 'CH1158', 'SOMIER PLATA 200X200', 3),              // PTF, con nombre en el histórico del sistema
      tropical:poner(st.g[IM], 'CH2356', 'SOMIER TROPICAL 180X190', 2),       // solo en Moreno
      celeste: poner(st.c, 'CH1001', 'Almohada Heaven Celeste', 4),           // PTF, sin medida y sin histórico
      raro:    poner(st.c, 'CH9150', 'SOMIER PLATA 150X200', 1)               // una medida que no es de la lista
    };
    var tit=stockClave({ desc:'TITANIO ICE', medida:'160x190', codigo:'CH1201' }); st.c.u[tit]=5;   // uno de la lista de precios
    return st;
  };
  window._escenario=async function(conStock){
    window._SRV.stock=conStock ? window._stock() : null; STOCK_CARGADO=false;
    if(!conStock){ STOCK=stockVacio(); stockOlvidarIndice(); }
    await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok';
  };
  var ev=function(e,t){ e.dispatchEvent(new Event(t||'input', { bubbles:true })); };
  window._nuevo=function(){ if(document.getElementById('modal').classList.contains('on')) closeModal(); showView('form'); resetForm(); };
  window._codigo=function(cod){ var c=document.querySelectorAll('#f-productos .prod-card')[0], e=c.querySelector('.prod-codigo'); e.value=cod; ev(e); };
  window._renglon=function(){
    var c=document.querySelectorAll('#f-productos .prod-card')[0], ms=c.querySelector('.prod-medida'), mo=c.querySelector('.prod-medida-otro'), b=c.querySelector('.prod-saldo');
    return { desc:c.querySelector('.prod-desc').value, medida:(ms.value==='Otros' ? ('Otros:'+mo.value) : ms.value), codigo:c.querySelector('.prod-codigo').value,
             caja: b && !b.hidden ? b.innerText.replace(/\s+/g,' ').trim() : '' };
  };
  window._probar=async function(cod){ _nuevo(); window._toasts=[]; _codigo(cod); await _esperar(700); var r=_renglon(); r.toast=window._toasts.slice(-1)[0]||''; return r; };
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1100, height:1000 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-09-29T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  await page.evaluate(PREPARAR);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };

  /* ── 1 y 2. El código del almacén completa el renglón y el cuadrito dice si hay ── */
  const pla = await ev(async () => { await _escenario(true); return _probar('Ch1158'); });
  chk('CA1. «Ch1158» (no está en la lista de precios) completa SOMIER PLATA · 200x200 desde el almacén', pla.desc==='SOMIER PLATA' && pla.medida==='200x200', pla);
  chk('CA2. …y avisa que no está en la lista de precios y que el precio va a mano', /no está en la lista de precios/.test(pla.toast||'') && /almacén/.test(pla.toast||'') && /precio a mano/.test(pla.toast||''), pla.toast);
  chk('CA3. el cuadrito aparece y dice ✅ DISPONIBLE, con «PTF 3»', /DISPONIBLE/.test(pla.caja||'') && /PTF 3/.test(pla.caja||''), pla.caja);
  const tro = await ev(async () => _probar('CH2356'));
  chk('CA4. un código que solo está en Moreno (CH2356): SOMIER TROPICAL · 180x190 y «📥 HAY EN MORENO»', tro.desc==='SOMIER TROPICAL' && tro.medida==='180x190' && /HAY EN MORENO/.test(tro.caja||''), tro);
  const cel = await ev(async () => _probar('ch1001'));
  chk('CA5. un producto del almacén SIN medida (CH1001) se completa con el nombre del Excel y el cuadrito aparece igual', /ALMOHADA HEAVEN CELESTE/.test(cel.desc||'') && cel.medida==='' && /DISPONIBLE/.test(cel.caja||'') && /PTF 4/.test(cel.caja||''), cel);
  const raro = await ev(async () => _probar('CH9150'));
  chk('CA6. la medida del almacén que no es de la lista (150x200) va en «Otros» y NO es 📐 medida especial: ✅ con PTF 1', raro.medida==='Otros:150x200' && /DISPONIBLE/.test(raro.caja||'') && !/MEDIDA ESPECIAL/.test(raro.caja||''), raro);

  /* ── El índice de códigos es el del stock de ahora ── */
  /* `leerStock` lo olvidaba antes de migrar y la migración lo volvía a armar con el stock VIEJO: después de una lectura, un
     pedido con un código del Excel y el nombre escrito de otra forma no se encontraba por el código (§4cv). */
  const idx = await ev(async () => {
    await _escenario(false);                 // el equipo tenía otro stock (una copia vieja, o ninguna)…
    await _escenario(true);                  // …y la lectura trae el Excel nuevo
    return { k:stockClave({ desc:'SOMIER TROPICAL CAFE', medida:'180x190', codigo:'CH2356' }), esperado:window._K.tropical };
  });
  chk('CA9. apenas llega una lectura con un Excel nuevo, un pedido con un código de ese Excel y otro nombre se encuentra por el código (§4cv)', idx.k===idx.esperado, idx);

  /* ── Lo de siempre ── */
  const tit = await ev(async () => _probar('CH1201'));
  chk('un código de la lista de precios (CH1201) completa como siempre, sin el aviso del almacén', tit.desc==='TITANIO ICE' && tit.medida==='160x190' && !/lista de precios/.test(tit.toast||'') && /PTF 5/.test(tit.caja||''), tit);
  const nada = await ev(async () => _probar('ZZ9999'));
  chk('un código que no está en ningún lado no completa nada ni muestra cuadrito', nada.desc==='' && nada.caja==='' && !/almacén/.test(nada.toast||''), nada);

  /* ── 4. Se guarda y cuenta como pendiente de ESE producto ── */
  const g = await ev(async () => {
    _nuevo(); _codigo('Ch1158'); await _esperar(300);
    document.getElementById('f-vendedor').value='Maria Flores';
    document.getElementById('f-cliente').value='CLIENTE PLATA';
    document.getElementById('f-celular').value='70011122';
    document.getElementById('f-nota').value='2345';
    document.getElementById('f-zona').value='Norte';
    document.getElementById('f-saldo').value='2000';
    var f=document.getElementById('f-fecha'); f.value=stockSumarDias(todayStr(),2); f.dispatchEvent(new Event('change',{bubbles:true}));
    await _esperar(300);
    var n0=window._saves.length;
    document.getElementById('f-submit').click();
    for(var i=0;i<40;i++){ await _esperar(50); var b=document.getElementById('f-submit'); if(b && !b.disabled) break; }
    await _esperar(300);
    var s=window._saves.slice(n0).filter(function(r){ return r.cliente==='CLIENTE PLATA'; })[0];
    await refrescarEstado();
    var o=stockData().lista.filter(function(x){ return x.k===window._K.plata; })[0];
    return { guardo:!!s, prod:s && s.productos && s.productos[0], comp:o && o.comp, clave:s ? stockClave(s.productos[0]) : '', kPlata:window._K.plata };
  });
  chk('CA7. el pedido se guarda con Ch1158, SOMIER PLATA 200x200, y cuenta como 1 pendiente de ese producto del almacén',
    g.guardo && g.prod && g.prod.codigo==='Ch1158' && g.prod.desc==='SOMIER PLATA' && g.prod.medida==='200x200' && g.clave===g.kPlata && g.comp===1, g);

  /* ── 5. El código escrito antes de que llegue el saldo ── */
  const tarde = await ev(async () => {
    await _escenario(false);
    _nuevo(); _codigo('CH1158'); await _esperar(500);
    var antes=_renglon();
    window._SRV.stock=window._stock(); STOCK_CARGADO=false;
    await refrescarEstado(); await _esperar(500);
    return { antes:antes, despues:_renglon() };
  });
  chk('(partida) sin el saldo todavía, el código solo no completa nada', tarde.antes && tarde.antes.desc==='' && tarde.antes.caja==='', tarde.antes);
  chk('CA8. cuando llega la lectura con el saldo, el renglón se completa solo y aparece el cuadrito', tarde.despues && tarde.despues.desc==='SOMIER PLATA' && tarde.despues.medida==='200x200' && /DISPONIBLE/.test(tarde.despues.caja||''), tarde.despues);

  chk('ningún error de JavaScript', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e=>{ console.error(e); process.exit(1); });
