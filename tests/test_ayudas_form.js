/* 🧰 MÁS AYUDAS DEL FORMULARIO (§4ih, 08/10). El dueño eligió de una lista: «4 me gusta, hazlo · 2, 5 y 6 dame ejemplo».
   Lo que se prueba (pedidos inventados, reloj clavado en el jueves 08/10/2026 a las 10:00 de Bolivia):
     4. ¿Pedido repetido?: mismo celular o mismo nombre en un pedido de estos días → aviso mientras se escribe, con «Ver», y
        pregunta al guardar; Cancelar no guarda, Aceptar guarda. No en Eduardo/ROHO, ni al corregir, ni en ATC.
     2. Buscar el producto por nombre: la lista propia con el saldo al lado (la misma cuenta del cuadrito); elegir completa
        medida y código como siempre.
     5. El mapita de la ubicación: km a PTF y de qué lado de la línea de logística; un link que no se entiende, en rojo.
     6. Los pasos en el celular: la barra de abajo con ✓, y tocar lleva a esa parte. En la compu no aparece.
   Se corre:  node tests/test_ayudas_form.js        Dientes:  PEDIDOS=/ruta/a/pedidos_cdc1fab.html node tests/test_ayudas_form.js
   Solo datos sintéticos: el repo es público. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const src=fs.readFileSync(path.join(__dirname,'test_escenas_form.js'),'utf8');
const PREPARAR_TXT=src.slice(src.indexOf('function PREPARAR(){'), src.indexOf('\n(async()=>{'));
const PREPARAR=eval('('+PREPARAR_TXT.trim().replace(/;\s*$/,'')+')');   // el mismo escenario de las escenas (§4if)

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (w,h) => {
    const ctx = await browser.newContext({ viewport:{ width:w, height:h }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage(); page.setDefaultTimeout(20000);
    page.on('pageerror', e => errores.push(e.message));
    page._dialogos=[]; page._resp=true; page.on('dialog', d => { page._dialogos.push(d.message()); page._resp ? d.accept() : d.dismiss(); });
    await page.route(/^https?:/, r => r.abort());
    await page.clock.setFixedTime(new Date('2026-10-08T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(300);
    await page.evaluate(PREPARAR);
    await page.evaluate(async()=>{ window._SRV.stock=window._stock(); STOCK_CARGADO=false; await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok'; showView('form'); resetForm(); });
    return { ctx, page, ev: async (fn,arg)=>{ try{ return await page.evaluate(fn,arg); }catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } } };
  };
  let { ctx, page, ev } = await abrir(1180, 820);   // (§4ij) el iPad del dueño, acostado
  const set = (id,v) => ev(([id,v])=>{ var e=document.getElementById(id); e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); }, [id,v]);

  /* ── 4. ¿Pedido repetido? ── */
  console.log('\n── 4. ¿Pedido repetido? ──');
  await set('f-vendedor','Maria Flores'); await set('f-cliente','CLIENTE NUEVO'); await set('f-celular','7');
  await page.waitForTimeout(400);
  let r = await ev(()=>({ oculto:document.getElementById('fx-dup').hidden }));
  chk('un cliente nuevo no avisa nada', r.oculto===true, r);
  await set('f-cliente','Cliente MF2'); await page.waitForTimeout(400);
  r = await ev(()=>{ var e=document.getElementById('fx-dup'); return { visible:!e.hidden, t:e.innerText.replace(/\s+/g,' '), ver:!!e.querySelector('button') }; });
  chk('el mismo nombre que un pedido de estos días (sin importar mayúsculas): aviso con el pedido y «👀 Ver»', r.visible && /ya tiene un pedido/.test(r.t) && /CLIENTE MF2/.test(r.t) && /mié 21\/10 PM/.test(r.t) && r.ver, r);
  await ev(()=>{ var p=window._SRV.pedidos.filter(function(x){ return x.cliente==='CLIENTE MF1'; })[0]; p.celular='+591 700-11-122'; var q=STATE.filter(function(x){ return x.id===p.id; })[0]; q.celular=p.celular; });
  await set('f-cliente','OTRO NOMBRE'); await set('f-celular','70011122'); await page.waitForTimeout(400);
  r = await ev(()=>document.getElementById('fx-dup').innerText.replace(/\s+/g,' '));
  chk('el mismo celular escrito distinto (+591 700-11-122 = 70011122) también avisa: «este celular»', /este celular ya tiene/.test(r) && /CLIENTE MF1/.test(r), r);
  // al guardar: Cancelar no guarda
  await ev(()=>{ _prod(0,'CH1129',1); var f=document.getElementById('f-fecha'); f.value='2026-10-13'; f.dispatchEvent(new Event('change',{bubbles:true})); document.getElementById('f-nota').value='777'; document.getElementById('f-zona').value='Norte'; document.getElementById('f-saldo').value='1000'; });
  await page.waitForTimeout(300);
  page._resp=false; page._dialogos=[];
  const n0 = await ev(()=>window._saves.length);
  await page.click('#f-submit'); await page.waitForTimeout(1200);
  r = await ev(()=>({ saves:window._saves.length, cli:document.getElementById('f-cliente').value }));
  chk('al guardar pregunta «¿PEDIDO REPETIDO?» con el pedido anterior; Cancelar no guarda y el formulario queda', page._dialogos.some(m=>/PEDIDO REPETIDO/.test(m) && /CLIENTE MF1/.test(m)) && r.saves===n0 && r.cli==='OTRO NOMBRE', { d:page._dialogos, r });
  page._resp=true; page._dialogos=[];
  await page.click('#f-submit'); await page.waitForTimeout(1500);
  r = await ev(()=>window._saves.some(function(x){ return x.cliente==='OTRO NOMBRE'; }));
  chk('Aceptar guarda el pedido nuevo igual', r===true, { r, d:page._dialogos });
  r = await ev(async()=>{
    closeModal(); showView('form'); resetForm();
    var s=function(id,v){ var e=document.getElementById(id); e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); };
    s('f-vendedor','Eduardo Añez'); s('f-cliente','Cliente MF2'); await _esperar(300);
    var edu=document.getElementById('fx-dup').hidden;
    s('f-vendedor','Maria Flores'); segSet('f-doc-tipo','ATC'); pintarDocTipo && pintarDocTipo(false); s('f-cliente','Cliente MF2'); await _esperar(300);
    var atc=document.getElementById('fx-dup').hidden; segSet('f-doc-tipo','OC'); try{ pintarDocTipo(false); }catch(e){}
    var p=window._SRV.pedidos.filter(function(x){ return x.cliente==='CLIENTE MF2'; })[0]; editPedido(p.id); await _esperar(400);
    var edit=document.getElementById('fx-dup').hidden;
    resetForm();
    return { edu:edu, atc:atc, edit:edit };
  });
  chk('no avisa para Eduardo/ROHO (Multicenter), ni en una ATC, ni al corregir el mismo pedido', r.edu && r.atc && r.edit, r);

  /* ── 4b. Eduardo: la NOTA DE VENTA no se repite (dueño, 09/10: «Eduardo repite clientes… que no repita N° de nota. Eduardo únicamente») ── */
  console.log('\n── 4b. Eduardo: nota de venta repetida ──');
  r = await ev(async()=>{
    var p=window._SRV.pedidos.filter(function(x){ return x.cliente==='CLIENTE MF2'; })[0]; p.nota='32525';
    STATE.forEach(function(q){ if(q.id===p.id) q.nota='32525'; });
    closeModal(); showView('form'); resetForm();
    var s=function(id,v){ var e=document.getElementById(id); e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); };
    var dup=function(){ var e=document.getElementById('fx-dup'); return e.hidden?'':e.innerText.replace(/\s+/g,' '); };
    s('f-vendedor','Eduardo Añez'); s('f-cliente','multicenter'); s('f-nota','32524'); await _esperar(300);
    var otra=dup();
    s('f-nota','32525'); await _esperar(300);
    var igual=dup();
    s('f-nota','032525'); await _esperar(300);
    var ceros=dup();
    s('f-vendedor','ROHO'); s('f-nota','32525'); await _esperar(300);
    var roho=dup();
    s('f-vendedor','Maria Flores'); s('f-cliente','CLIENTE NUEVO'); s('f-nota','32525'); await _esperar(300);
    var maria=dup();
    editPedido(p.id); await _esperar(400); s('f-vendedor','Eduardo Añez'); await _esperar(300);
    var propio=dup();
    resetForm();
    return { otra:otra, igual:igual, ceros:ceros, roho:roho, maria:maria, propio:propio };
  });
  chk('Eduardo con otra nota: nada (aunque Multicenter tenga pedidos)', r.otra==='', r);
  chk('Eduardo con una nota ya cargada: aviso «la nota de venta 32525 ya está cargada» con el pedido y su nota', /nota de venta 32525 ya está cargada/.test(r.igual) && /CLIENTE MF2/.test(r.igual) && /Nota 32525/.test(r.igual), r);
  chk('«032525» es la misma nota (sin ceros adelante)', /ya está cargada/.test(r.ceros), r);
  chk('solo Eduardo: ROHO y las vendedoras no reciben el aviso de la nota', r.roho==='' && r.maria==='', r);
  chk('al corregir el mismo pedido no se avisa contra sí mismo', r.propio==='', r);
  await ev(()=>{ closeModal(); showView('form'); resetForm(); });
  await set('f-vendedor','Eduardo Añez'); await set('f-cliente','multicenter'); await set('f-nota','32525');
  await ev(()=>{ _prod(0,'CH1129',1); var f=document.getElementById('f-fecha'); f.value='2026-10-13'; f.dispatchEvent(new Event('change',{bubbles:true})); document.getElementById('f-zona').value='Norte'; });
  await page.waitForTimeout(400);
  page._resp=false; page._dialogos=[];
  const n1 = await ev(()=>window._saves.length);
  await page.click('#f-submit'); await page.waitForTimeout(1200);
  r = await ev(()=>window._saves.length);
  chk('al guardar pregunta «¿NOTA DE VENTA REPETIDA?»; Cancelar no guarda', page._dialogos.some(m=>/NOTA DE VENTA REPETIDA/.test(m) && /CLIENTE MF2/.test(m)) && r===n1, { d:page._dialogos, r, n1 });
  page._resp=true; page._dialogos=[];
  await ev(()=>{ closeModal(); showView('form'); resetForm(); });

  /* ── 2. Buscar el producto por nombre ── */
  console.log('\n── 2. Buscar el producto por nombre ──');
  await page.click('#f-productos .prod-desc'); await page.keyboard.type('semiort 140', {delay:20}); await page.waitForTimeout(500);
  r = await ev(()=>{ var e=document.getElementById('fx-busca'); return e && !e.hidden ? [].map.call(e.querySelectorAll('.fx-bo'), function(o){ return o.innerText.replace(/\s+/g,' '); }) : null; });
  chk('aparece la lista con el saldo de cada uno (la misma cuenta del cuadrito): SEMIORTOPEDICO 140 «📥 en Moreno»', Array.isArray(r) && r.some(t=>/ESPECIAL SEMIORTOPEDICO 140x190/.test(t) && /CH1107/.test(t) && /en Moreno/.test(t)), r);
  const lista = await page.evaluate(()=>document.getElementById('dl-productos') && document.querySelector('#f-productos .prod-desc').getAttribute('list'));
  chk('la lista vieja del navegador ya no se abre encima', !lista, lista);
  const idx = Array.isArray(r) ? r.findIndex(t=>/CH1107/.test(t)) : 0;
  for(let i=0;i<=idx;i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter'); await page.waitForTimeout(500);
  r = await ev(()=>{ var c=_cards()[0]; return { desc:c.querySelector('.prod-desc').value, med:c.querySelector('.prod-medida').value, cod:c.querySelector('.prod-codigo').value, abierta:!!(document.getElementById('fx-busca')&&!document.getElementById('fx-busca').hidden) }; });
  chk('elegir con ↓ (hasta el ESPECIAL) y Enter completa producto, medida y código como siempre, y cierra la lista', /SEMIORTOPEDICO/.test(r.desc) && r.med==='140x190' && r.cod==='CH1107' && !r.abierta, r);
  await ev(()=>{ var c=_cards()[0]; c.querySelector('.prod-desc').value=''; });
  await page.click('#f-productos .prod-desc'); await page.keyboard.type('oro bi', {delay:20}); await page.waitForTimeout(400);
  r = await ev(()=>[].map.call(document.querySelectorAll('#fx-busca .fx-bo'), function(o){ return o.innerText.replace(/\s+/g,' '); }));
  chk('ORO BI RELAX 140x190 dice «✅ 6 libres» (hay 6 en PTF)', r.some(t=>/ORO BI RELAX 140x190/.test(t) && /6 libres/.test(t)), r);
  await page.click('#f-nota'); await page.waitForTimeout(300);
  r = await ev(()=>!!(document.getElementById('fx-busca') && !document.getElementById('fx-busca').hidden));
  chk('al salir del campo la lista se cierra', r===false, r);

  /* ── 5. El mapita ── */
  console.log('\n── 5. El mapita de la ubicación ──');
  await set('f-maps','https://www.google.com/maps?q=-17.7832,-63.1821'); await page.waitForTimeout(800);
  r = await ev(()=>{ var e=document.getElementById('fx-mapa'); return { visible:!e.hidden, mal:e.classList.contains('mal'), t:e.innerText.replace(/\s+/g,' ') }; });
  chk('un link con el pin: «a 5,6 km de PTF · lado Banzer de la línea de logística · abrir en Maps»', r.visible && !r.mal && /5,6 km de PTF/.test(r.t) && /lado Banzer/.test(r.t) && /abrir en Maps/.test(r.t), r);
  await set('f-maps','-17.7489, -63.1360'); await page.waitForTimeout(800);
  r = await ev(()=>document.getElementById('fx-mapa').innerText.replace(/\s+/g,' '));
  chk('coordenadas sueltas al este de la línea: «lado PTF»', /lado PTF/.test(r), r);
  await set('f-maps','https://www.google.com/mapz/xx'); await page.waitForTimeout(800);
  r = await ev(()=>{ var e=document.getElementById('fx-mapa'); return { mal:e.classList.contains('mal'), t:e.innerText }; });
  chk('un link que no se entiende lo dice en rojo ahí mismo', r.mal && /No reconozco esta ubicación/.test(r.t), r);
  await set('f-maps',''); await page.waitForTimeout(700);
  r = await ev(()=>document.getElementById('fx-mapa').hidden);
  chk('sin ubicación, no aparece nada', r===true, r);
  r = await ev(()=>!document.getElementById('fx-pasos') || document.getElementById('fx-pasos').hidden);
  chk('6. en el iPad acostado (y en la compu) la barra de pasos no aparece: están los costados', r===true, r);
  await ctx.close();
  ({ ctx, page, ev } = await abrir(820, 1180));
  r = await ev(()=>{ var e=document.getElementById('fx-pasos'); return { visible:!!e && !e.hidden, izq:getComputedStyle(document.getElementById('fx-izq')).display }; });
  chk('6. en el iPad parado (820 px) sí aparece la barra de pasos, y los costados no (no entran)', r.visible && r.izq==='none', r);
  await ctx.close();

  /* ── 6. Los pasos en el celular ── */
  console.log('\n── 6. Los pasos en el celular ──');
  ({ ctx, page, ev } = await abrir(390, 844));
  await page.evaluate(()=>{ window.scrollTo(0,0); fxPasosPintar(); });
  r = await ev(()=>{ var e=document.getElementById('fx-pasos'); return { visible:!e.hidden, t:e.innerText.replace(/\s+/g,' '), ok:e.querySelectorAll('.fx-pb.ok').length, pad:document.body.classList.contains('con-pasos') }; });
  chk('en el celular aparece la barra de abajo: Cliente · Productos · Entrega · Cobro, sin ✓ todavía', r.visible && /Cliente/.test(r.t) && /Productos/.test(r.t) && /Entrega/.test(r.t) && /Cobro/.test(r.t) && r.ok===0 && r.pad, r);
  await ev(()=>{ var s=function(id,v){ var e=document.getElementById(id); e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); }; s('f-vendedor','Maria Flores'); s('f-cliente','CLIENTE ROJAS'); s('f-celular','70011122'); _prod(0,'CH1761',1); });
  await page.waitForTimeout(500);
  r = await ev(()=>[].map.call(document.querySelectorAll('#fx-pasos .fx-pb'), function(b){ return b.classList.contains('ok'); }));
  chk('con cliente, celular y un producto: ✓ Cliente y ✓ Productos', r[0]===true && r[1]===true && r[2]===false && r[3]===false, r);
  await ev(()=>fxPasoIr(2)); await page.waitForTimeout(1200);
  r = await ev(()=>{ var s=fxSec('Entrega').getBoundingClientRect(); return { top:Math.round(s.top), act:(document.querySelector('#fx-pasos .fx-pb.act .nm')||{}).textContent }; });
  chk('tocar «Entrega» lleva a esa parte del formulario (debajo del encabezado) y la marca', r.top>0 && r.top<320 && r.act==='Entrega', r);
  r = await ev(()=>{ showView('mis'); fxPasosPintar(); var o=document.getElementById('fx-pasos').hidden; showView('form'); fxPasosPintar(); return o; });
  chk('fuera del formulario la barra se va', r===true, r);
  await ctx.close();

  chk('ningún error de JavaScript', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
