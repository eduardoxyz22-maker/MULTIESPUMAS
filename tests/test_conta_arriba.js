/* ✨ CONTABILIDAD ARRIBA: «📋 Para hacer» + el libro del período, en Bs y por marca (§4mg, 25/10; dueño: «aprobado»).

   LO QUE CUIDA:
   1. Con la vista nueva salen las dos tarjetas y se esconden las fichas, los grupos de botones, la barra y la dona (que se siguen armando).
   2. El libro dice lo MISMO que las fichas de siempre: vendido, cobrado, falta y cada marca (Sueña + Heaven + sin marca = vendido).
   3. «Para hacer»: rojo → ámbar → info, con los números del resumen de siempre; lo que no tiene pendiente va a «✅ Al día».
   4. «Ver» filtra la tabla con los chips de siempre (sin monto, recargos por cobrar, cobradas de más, por cargar).
   5. Con un vendedor elegido: su nombre y solo su marca. Con algo en «Buscar», lo dice.
   6. Mayoristas y sin la marca de prueba (Playwright): como antes.

   Reloj CLAVADO (martes 27/10/2026, 10:00 de Bolivia). Solo datos sintéticos: el repo es público.
   Se corre:  node tests/test_conta_arriba.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true;
  try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  var hoy=todayStr(), mes=hoy.slice(0,7), ts=function(d){ return new Date(mes+'-'+d+'T11:00:00-04:00').getTime(); };
  var n=0, P=function(o){ n++; return Object.assign({ id:'c'+n, oc:'10-'+(100+n), nota:String(5000+n), cliente:'CLIENTE '+n, celular:'7000000'+n, fecha:mes+'-26', turno:'AM', zona:'Norte',
    productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:3000 }], saldo:0, acuenta:0, pagado:true, metodoPago:'Efectivo 3000 @'+mes+'-05 #1'+n, ts:ts('05') }, o); };
  window._L=[
    P({ vendedor:'Mauricio Merida' }),                                                                                       // Sueña, pagada
    P({ vendedor:'Mauricio Merida', pagado:false, saldo:1000, acuenta:2000, metodoPago:'', cliente:'DEBE SUEÑA', ts:ts('03') }),   // Sueña, con saldo (la más vieja)
    P({ vendedor:'Carola Chavez', metodoPago:'Efectivo 3000 @'+mes+'-06 #77 · REGISTRADO' }),                                  // Heaven, ya en el sistema
    P({ vendedor:'Carola Chavez', pagado:false, saldo:500, acuenta:2500, metodoPago:'', cliente:'DEBE HEAVEN', ts:ts('08') }),     // Heaven, con saldo
    P({ vendedor:'Carola Chavez', pagado:false, saldo:0, acuenta:0, metodoPago:'', cliente:'SIN MONTO' }),                     // sin monto anotado
    P({ vendedor:'Carola Chavez', cliente:'CON FLETE', metodoPago:textoCobros([{ metodo:'Efectivo', monto:3000, fecha:mes+'-05', nota:'88' }, { envio:true, monto:150, metodo:'' }]) }),                                                         // recargo por cobrar
    P({ vendedor:'Pepe Sinmarca' })                                                                                           // sin marca
  ];
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window._L)) }); };
  apiSave=function(r){ return Promise.resolve({ ok:true, pedido:r }); };
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  window._ver=async function(vend, q){ await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok'; showView('conta');
    try{ segSet('cta-tab','ventas'); setContaTab('ventas'); }catch(e){}
    llenarSelectContaVendedor(); var s=document.getElementById('cta-vendedor');
    s.value=''; if(vend) for(var i=0;i<s.options.length;i++) if(s.options[i].text===vend) s.value=s.options[i].value;
    document.getElementById('cta-search').value=q||''; CX_FILTRO=null; renderConta(); await _esperar(200); };
  window._txt=function(id){ var e=document.getElementById(id); return e && !e.hidden && e.offsetParent!==null ? e.innerText.replace(/\s+/g,' ').trim() : ''; };
  window._vis=function(id){ var e=document.getElementById(id); return !!(e && getComputedStyle(e).display!=='none' && e.offsetParent!==null); };
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1440, height:1000 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await ctx.route(/^https:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-27T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  await page.evaluate(PREPARAR);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };

  /* 6a: sin la marca de prueba, como antes */
  const r0 = await ev(async () => { window.CX_TOP_PRUEBA=0; await _ver(''); return { top:_vis('cx-top'), fichas:_vis('cta-metrics'), grupos:_vis('cx-grupos') }; });
  chk('6a. en Playwright sin la marca: sin «Para hacer» y con las fichas de siempre', !r0.top && r0.fichas && r0.grupos, r0);

  /* 1 */
  const r1 = await ev(async () => { window.CX_TOP_PRUEBA=1; await _ver('');
    return { top:_vis('cx-top'), txt:_txt('cx-top'), fichas:_vis('cta-metrics'), marcas:_vis('cta-marcas'), grupos:_vis('cx-grupos'), vivo:_vis('cx-vivo'),
      armadas:document.querySelectorAll('#cta-metrics .mc').length, chips:_vis('cx-chips'), tabla:_vis('tbl-conta') }; });
  chk('1a. salen «Para hacer» y el libro del período', r1.top && /Para hacer/.test(r1.txt) && /Octubre · todo el equipo/.test(r1.txt), r1.txt && r1.txt.slice(0,200));
  chk('1b. se esconden fichas, marcas, botones en grupos y la barra', !r1.fichas && !r1.marcas && !r1.grupos && !r1.vivo, r1);
  chk('1c. las fichas se siguen armando (las pruebas de siempre las leen) y los chips y la tabla siguen', r1.armadas===4 && r1.chips && r1.tabla, r1);

  /* 2 */
  const r2 = await ev(() => {
    var lb=document.querySelector('#cx-top .cx-libro'), tres=[].map.call(lb.querySelectorAll('.lb-tres b'), function(b){ return b.textContent; });
    var mk=[].map.call(lb.querySelectorAll('.lb-f'), function(f){ return { t:f.querySelector('.lb-t').textContent, b:f.querySelector('b').textContent }; });
    var num=function(t){ return +String(t).replace(/[^\d]/g,'')||0; }, suma=0; mk.forEach(function(m){ suma+=num(m.b); });
    return { tres:tres, mk:mk, suma:suma, M:CX_TOP_M, esp:[fmtBs0(CX_TOP_M.vendido), fmtBs0(CX_TOP_M.cobrado), fmtBs0(CX_TOP_M.falta)] };
  });
  chk('2a. vendido, cobrado y falta = las fichas de siempre (la venta sin monto vale Bs 0)', JSON.stringify(r2.tres)===JSON.stringify(r2.esp) && r2.M.vendido===18000 && r2.M.falta===1500, { tres:r2.tres, esp:r2.esp });
  chk('2b. una línea por marca, en Bs (Sueña, Heaven, sin marca)', r2.mk.length===3 && /Sueña/.test(r2.mk[0].t) && /Heaven/.test(r2.mk[1].t) && /Sin marca/.test(r2.mk[2].t) && /^Bs /.test(r2.mk[0].b), r2.mk);
  chk('2c. las marcas suman lo vendido', r2.suma===18000, r2.suma);
  chk('2d. cada marca dice lo que le falta cobrar', /falta Bs 1\.000/.test(r2.mk[0].t) && /falta Bs 500/.test(r2.mk[1].t) && /todo cobrado/.test(r2.mk[2].t), r2.mk.map(m=>m.t));
  chk('2e. sin «%» en el libro (contabilidad usa números)', !/%/.test(r2.mk.map(m=>m.t).join('')+r2.tres.join('')), r2.mk);

  /* 3 */
  const r3 = await ev(() => { CX_HACER_MAS=true; renderConta();
    var it=[].map.call(document.querySelectorAll('#cx-top .ah-it'), function(x){ return x.className.replace('ah-it ','')+'|'+x.querySelector('.ah-n').textContent+'|'+x.querySelector('.ah-tx').textContent; });
    var ok=[].map.call(document.querySelectorAll('#cx-top .ph-ok-l span'), function(x){ return x.textContent; }); CX_HACER_MAS=false; return { it:it, ok:ok }; });
  const sev = r3.it.map(s=>s.split('|')[0]), de=k=>r3.it.filter(s=>s.indexOf(k)>=0)[0]||'';
  chk('3a. rojo → ámbar → info', sev.length>0 && sev.join(',')===sev.slice().sort((a,b)=>({'ah-r':0,'ah-a':1,'ah-i':2})[a]-({'ah-r':0,'ah-a':1,'ah-i':2})[b]).join(','), sev);
  chk('3b. ventas con saldo: 2 · Bs 1.500, la más vieja primero', /\|2\|/.test(de('Ventas con saldo')) && /Bs 1\.500/.test(de('Ventas con saldo')) && /DEBE SUEÑA, DEBE HEAVEN/.test(de('Ventas con saldo')), de('Ventas con saldo'));
  chk('3c. sin monto anotado: 1', /\|1\|/.test(de('Sin monto anotado')), de('Sin monto anotado'));
  chk('3d. recargo por entrega por cobrar: 1 · Bs 150', /\|1\|/.test(de('Recargos por entrega')) && /Bs 150/.test(de('Recargos por entrega')), de('Recargos por entrega'));
  chk('3e. por cargar al sistema: 6 de 7 (info)', /^ah-i\|6\|/.test(de('Por cargar al sistema')) && /de 7 ventas/.test(de('Por cargar al sistema')), de('Por cargar al sistema'));
  chk('3f. lo que está bien va a «Al día»', r3.ok.some(t=>/Ninguna venta cargada dos veces/.test(t)) && r3.ok.some(t=>/Ninguna cobrada de más/.test(t)), r3.ok);

  /* 4 */
  const r4 = await ev(async () => {
    var b=[].filter.call(document.querySelectorAll('#cx-top .ah-it'), function(x){ return /Sin monto anotado/.test(x.textContent); })[0].querySelector('button'); b.click(); await _esperar(100);
    var a={ k:CX_FILTRO&&CX_FILTRO.k, filas:document.querySelectorAll('#tbl-conta tbody tr').length, cli:(document.querySelector('#tbl-conta tbody tr')||{}).textContent||'' };
    cxTopFiltro('envf'); await _esperar(80);
    var e={ k:CX_FILTRO&&CX_FILTRO.k, filas:document.querySelectorAll('#tbl-conta tbody tr').length, cli:(document.querySelector('#tbl-conta tbody tr')||{}).textContent||'' };
    CX_FILTRO=null; renderConta(); return { a:a, e:e };
  });
  chk('4a. «Ver» de sin monto filtra la tabla a esa venta', r4.a.k==='smon' && r4.a.filas===1 && /SIN MONTO/.test(r4.a.cli), r4.a);
  chk('4b. recargos por cobrar filtra a la del flete', r4.e.k==='envf' && r4.e.filas===1 && /CON FLETE/.test(r4.e.cli), r4.e);

  /* 5 */
  const r5 = await ev(async () => { await _ver('Carola Chavez'); var lb=document.querySelector('#cx-top .cx-libro');
    var r={ cab:lb.querySelector('h4').textContent, mk:[].map.call(lb.querySelectorAll('.lb-f .lb-t'), function(x){ return x.textContent; }) };
    await _ver('', 'flete'); r.q=_txt('cx-top'); await _ver(''); return r; });
  chk('5a. con un vendedor: su nombre en el título y solo su marca', /Carola Chavez/.test(r5.cab) && r5.mk.length===1 && /Heaven/.test(r5.mk[0]), r5);
  chk('5b. con algo en «Buscar», el libro lo dice', /Solo lo que coincide con «flete»/.test(r5.q), r5.q && r5.q.slice(0,300));

  /* 6b: Mayoristas */
  const r6 = await ev(async () => { segSet('cta-tab','mayor'); setContaTab('mayor'); await _esperar(150); var r={ top:_vis('cx-top'), nuevo:document.getElementById('cta-pane-ventas').classList.contains('cx-nuevo') }; segSet('cta-tab','ventas'); setContaTab('ventas'); return r; });
  chk('6b. en Mayoristas, como antes', !r6.top && !r6.nuevo, r6);

  /* 7 */
  const r7 = await ev(() => { var t=_txt('cx-top'); return { excel:/⬇️ Excel/.test(t), prod:/Productos del mes/.test(t), cierre:/Cierre del mes/.test(t), ret:/Retiro de efectivo/.test(t), tienda:/Venta de tienda/.test(t) }; });
  chk('7. los botones de siempre siguen a mano en el libro', r7.excel && r7.prod && r7.cierre && r7.ret && r7.tienda, r7);

  /* 8 (V5): el color del botón lo da el renglón */
  const r8 = await ev(() => { CX_HACER_MAS=true; renderConta(); var out=[].map.call(document.querySelectorAll('#cx-top .ah-it'), function(x){ var b=x.querySelector('button');
      return (x.classList.contains('ah-r')?'r':x.classList.contains('ah-a')?'a':'i')+':'+(b.classList.contains('ah-go-r')?'r':b.classList.contains('ah-go-a')?'a':'t'); }); CX_HACER_MAS=false; renderConta(); return out; });
  chk('8. V5: rojo arreglar, ámbar revisar, turquesa lo demás', r8.length>0 && r8.every(x=>x==='r:r'||x==='a:a'||x==='i:t'), r8);
  chk('sin errores en la página', !errores.length, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
