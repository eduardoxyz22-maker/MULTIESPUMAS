/* 📍 (13/11/2026, mejora 185; dueño: «pedir la ubicación de lo de hoy y mañana») LAS UBICACIONES QUE FALTAN PARA HOY Y EL PRÓXIMO CAMIÓN.
   El bot ya la pide 2 días antes, pero lo cargado a último momento se le escapa. En Administración, «Para hacer» lleva «📍 Faltan N
   ubicaciones (hoy y <próximo día con camión>)» y abre la lista (`ubfAbrir`) con «💬 Pedir por WhatsApp» (el chat del cliente con el
   mensaje ya escrito), «✏️ Pegar ubicación», «📍 Abrir el pedido» y «✓ Ya la pedí» (por aparato). Bloki se lo dice a logística.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Qué cuenta: sin enlace, enlace que no se entiende, pin fuera de Santa Cruz (Kansas). La aproximada va aparte. Un enlace corto, un pin
      bueno y el que mandó el cliente por WhatsApp (`&wa=1`) NO cuentan.
   2. Qué queda afuera: lo que retira el cliente, ventas de tienda, filas del sistema, borradores de Kommo, entregados, la RPT a una sucursal
      con pin y lo de otro día. Sin celular va aparte («llamá a la vendedora») y no cuenta en el número rojo.
   3. El renglón de «Para hacer» (rojo, con «hoy y mañana») y el de Bloki para logística.
   4. El mensaje: cordial, con la marca de la vendedora, el día y el turno; el enlace de WhatsApp con la regla del bot (también otro país).
   5. «✓ Ya la pedí»: queda en el aparato por pedido y día, lo deja en la lista como «pedida» y sale del número rojo; «↩️ No la pedí» lo
      devuelve; si el pedido cambia de día vuelve a contar; sin almacenamiento avisa y no se rompe.
   6. «✏️ Pegar ubicación» guarda y lo saca de la lista; «📍 Abrir el pedido» abre la ficha con «← Volver a las ubicaciones que faltan».
   7. Un sábado, el próximo camión es el lunes («hoy y lunes 16/11»). Sin nada que pedir: ni renglón ni Bloki, y la lista lo dice.
   Datos SINTÉTICOS (nombres y celulares inventados). Reloj clavado: viernes 13/11/2026, 09:10 de Bolivia.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_ubic_faltan.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_u2_turno.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));

let RESP;   // lo que se contesta en un prompt (Pegar ubicación)
async function abrir(browser, reloj){
  const ctx = await browser.newContext({ viewport:{ width:1300, height:950 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message));
  page.on('dialog', d => (d.type()==='prompt' && RESP!==undefined) ? d.accept(RESP) : d.accept());
  await page.clock.setFixedTime(new Date(reloj));
  await page.addInitScript(()=>{ window.ADM_TABS_PRUEBA=1; try{ localStorage.removeItem('me_adm_sec'); localStorage.removeItem('me_ubic_pedida'); localStorage.setItem('pedidos_camiones_adm','0'); }catch(e){} });
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');
  return { ctx, page, errs };
}
/* Los pedidos: hoy = viernes 13/11, el próximo camión = sábado 14/11. */
async function cargar(page){
  await page.evaluate(async()=>{
    UNLOCKED=true;
    var hoy=todayStr(), prox=proximoDiaEntrega(), L=function(){ return [_lin('CH1201|TITANIO ICE|160x190',1,{ chk:'ok' })]; };
    var t0=_ts(hoy,'08:00:00'), n=0, ts=function(){ return t0+(n++)*60000; };
    var ps=[
      _ped('u01', hoy,  'AM', L(), { cliente:'JUANA PEREZ', celular:'70012345', vendedor:'Maria Flores', maps:'', direccion:'Calle Los Pinos 123', zona:'Norte', ts:ts() }),
      _ped('u02', prox, 'PM', L(), { cliente:'PEDRO ROJAS', celular:'76543210', vendedor:'Mauricio Merida', maps:'casa verde al lado del kiosco', direccion:'Barrio Lindo', zona:'Sur', ts:ts() }),
      _ped('u03', hoy,  'PM', L(), { cliente:'ANA LUZ', celular:'71111111', maps:'https://www.google.com/maps?q=-17.76,-63.18&aprox=1', direccion:'Av. Tres 3', ts:ts() }),
      _ped('u04', prox, 'AM', L(), { cliente:'CARLOS VACA', celular:'72222222', maps:'https://www.google.com/maps?q=37.0625,-95.677068', ts:ts() }),
      _ped('u05', hoy,  'AM', L(), { cliente:'ROSA SIN CEL', celular:'', vendedor:'Isabel Robledo', maps:'', direccion:'Calle Sin Número', ts:ts() }),
      _ped('u06', hoy,  'AM', L(), { cliente:'RETIRA EL CLIENTE', maps:'', direccion:'RECOGERÁ DE ALMACÉN BANZER', ts:ts() }),
      _ped('u07', hoy,  'AM', L(), { cliente:'YA ENTREGADO', maps:'', entregado:true, ts:ts() }),
      _ped('u08', hoy,  '',   L(), { cliente:'VENTA DE TIENDA', maps:'', direccion:'SALIÓ DE TIENDA · Central', zona:'TIENDA', ts:ts() }),
      _ped('u09', hoy,  'AM', L(), { oc:'RPT 11-001', cliente:'Mia Plaza', celular:'', maps:'', ts:ts() }),
      _ped('u10', hoy,  'AM', L(), { oc:'RPT 11-002', cliente:'Tiendas Roho', celular:'', maps:'', ts:ts() }),
      _ped('u11', hoy,  'AM', L(), { cliente:'BORRADOR DE KOMMO', estado:BORRADOR_EST, maps:'', ts:ts() }),
      _ped('u12', '2026-11-16', 'AM', L(), { cliente:'LUNES LEJANO', maps:'', ts:ts() }),
      _ped('u13', hoy,  'AM', L(), { cliente:'ENLACE CORTO', maps:'https://maps.app.goo.gl/abcDEF123', ts:ts() }),
      _ped('u14', hoy,  'AM', L(), { cliente:'PIN BUENO', maps:'https://www.google.com/maps?q=-17.75,-63.17', ts:ts() }),
      _ped('u15', prox, 'AM', L(), { cliente:'LUCIA ARGENTINA', celular:'+54 9 11 2345 6789', vendedor:'Jonathan Monje', maps:'', ts:ts() }),
      _ped('u16', hoy,  'PM', L(), { oc:'ATC 11-003', cliente:'MARIO ATC', celular:'73333333', vendedor:'Carola Chavez', maps:'', ts:ts() }),
      _ped('u17', hoy,  'AM', L(), { cliente:'MANDO POR WHATSAPP', maps:'https://www.google.com/maps?q=-17.749,-63.18&wa=1', ts:ts() }),
      // 13/11: como el bot, ni Eduardo (mayoristas a su bodega) ni ROHO (sus tiendas) ni los internos: con la planilla real salían «Roho» y FABRICA
      _ped('u18', hoy,  'AM', L(), { cliente:'MAYORISTA BODEGA', celular:'74444444', vendedor:'Eduardo Añez', maps:'', ts:ts() }),
      _ped('u19', prox, 'AM', L(), { cliente:'Roho', celular:'75555555', vendedor:'ROHO', maps:'', direccion:'Tienda 1', ts:ts() }),
      _ped('u20', hoy,  'PM', L(), { cliente:'PEDIDO INTERNO', celular:'76666666', vendedor:'FABRICA', maps:'', ts:ts() })
    ];
    await _cargar(ps, _stock(function(s){ s.c.u[_K]=20; }));
    document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block';
    showView('admin'); var seg=document.querySelector('#adm-mode [data-val="todo"]'); if(seg) seg.click(); renderAdmin();
  });
  await page.waitForTimeout(150);
}
const T=e=>e?e.textContent.replace(/\s+/g,' ').trim():'';

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  let A=await abrir(browser, '2026-11-13T09:10:00-04:00'); const page=A.page;
  await cargar(page);

  /* 1-2 · Qué cuenta y qué queda afuera */
  let r=await page.evaluate(()=>{ var D=ubfDatos(), ids=function(L){ return L.map(function(x){ return x.id; }).sort(); };
    return { conCel:ids(D.conCel), sinCel:ids(D.sinCel), aprox:ids(D.aprox), n:D.n, nSinCel:D.nSinCel, nAprox:D.nAprox, diasTxt:D.diasTxt,
      por:D.F.reduce(function(o,x){ o[x.id]=x.e+':'+x.por; return o; }, {}) }; });
  chk('1 · cuentan sin enlace, el que no se entiende, el de Kansas, el de otro país y la ATC (con celular): 5', JSON.stringify(r.conCel)===JSON.stringify(['u01','u02','u04','u15','u16']) && r.n===5, r);
  chk('1 · el porqué de cada uno: sin ubicación · no se entiende · fuera de Santa Cruz', /^falta:/.test(r.por.u01) && /^nose:.*no se entiende/.test(r.por.u02) && /^lejos:.*Estados Unidos/.test(r.por.u04), r.por);
  chk('1 · la aproximada va aparte (no en el número rojo)', JSON.stringify(r.aprox)===JSON.stringify(['u03']) && r.nAprox===1, r);
  chk('2 · sin celular aparte (también la RPT a Tiendas Roho, que no tiene pin) y fuera del número rojo', JSON.stringify(r.sinCel)===JSON.stringify(['u05','u10']) && r.nSinCel===2, r);
  const todos=r.conCel.concat(r.sinCel, r.aprox);
  chk('2 · afuera: retira, entregado, venta de tienda, RPT a Mia Plaza, borrador de Kommo, otro día, enlace corto, pin bueno y el de WhatsApp',
    ['u06','u07','u08','u09','u11','u12','u13','u14','u17'].every(function(id){ return todos.indexOf(id)<0; }), todos);
  chk('2 · afuera también Eduardo, ROHO y los internos (como el bot)', ['u18','u19','u20'].every(function(id){ return todos.indexOf(id)<0; }), todos);
  chk('2 · «hoy y mañana» (el viernes, el próximo camión es el sábado)', r.diasTxt==='hoy y mañana', r.diasTxt);

  /* 3 · «Para hacer» */
  r=await page.evaluate(()=>{ var o=admHacerDatos().filter(function(x){ return x.k==='ubic'; })[0]||null;
    admHacerPintar(); var it=[].filter.call(document.querySelectorAll('#adm-hacer .ah-it'), function(e){ return /ubicaci/.test(e.textContent); })[0];
    var vis=!!it; if(!it){ ADM_HACER_MAS=true; admHacerPintar(); it=[].filter.call(document.querySelectorAll('#adm-hacer .ah-it'), function(e){ return /ubicaci/.test(e.textContent); })[0]; }
    return { o:o, txt:T(it), n:T(it && it.querySelector('.ah-n')), rojo:!!(it && it.classList.contains('ah-r')), btn:T(it && it.querySelector('.ah-go')), vis:vis };
    function T(e){ return e?e.textContent.replace(/\s+/g,' ').trim():''; } });
  chk('3 · «Para hacer»: «📍 Faltan 5 ubicaciones (hoy y mañana)», en rojo', r.o && r.o.sev==='r' && r.o.n===5 && /📍 Faltan 5 ubicaciones \(hoy y mañana\)/.test(r.txt) && r.n==='5' && r.rojo, r);
  chk('3 · …nombra a quiénes y dice lo sin celular y lo aproximado', /Juana Perez|JUANA PEREZ/i.test(r.txt) && /2 sin celular/.test(r.txt) && /1 ≈ aproximada/.test(r.txt), r.txt);
  await page.evaluate(()=>{ var it=[].filter.call(document.querySelectorAll('#adm-hacer .ah-it'), function(e){ return /ubicaci/.test(e.textContent); })[0]; it.querySelector('.ah-go').click(); });
  await page.waitForTimeout(60);
  r=await page.evaluate(()=>{ var b=document.getElementById('modal-box'), T=function(e){ return e?e.textContent.replace(/\s+/g,' ').trim():''; };
    return { on:document.getElementById('modal').classList.contains('on'), tit:T(b.querySelector('.modal-h h3')), res:T(b.querySelector('.ubf-res')),
      secs:[].map.call(b.querySelectorAll('.ubf-sec'), T), filas:[].map.call(b.querySelectorAll('.ubf-f'), function(li){ return li.getAttribute('data-id'); }),
      wa:[].map.call(b.querySelectorAll('.ubf-f a.ubf-wa'), function(a){ return a.closest('.ubf-f').getAttribute('data-id'); }),
      u01:T(b.querySelector('.ubf-f[data-id="u01"]')), u05:T(b.querySelector('.ubf-f[data-id="u05"]')), u03:T(b.querySelector('.ubf-f[data-id="u03"]')),
      dn:dayNumMap()['u01'] }; });
  chk('3 · «📍 Ver cuáles» abre la lista: 5 para pedir, con las tres partes', r.on && /Faltan ubicaciones/.test(r.tit) && /^5\s*entregas de hoy y mañana sin ubicación/.test(r.res) &&
    r.secs.length===3 && /Sin ubicación · 5/.test(r.secs[0]) && /Sin celular: llamá a la vendedora · 2/.test(r.secs[1]) && /Aproximadas · 1/.test(r.secs[2]), r);
  chk('3 · cada renglón: N° del día, cliente, día y turno, el porqué, vendedora, OC, zona y dirección', r.u01.indexOf('#'+r.dn)===0 && /JUANA PEREZ/.test(r.u01) && /HOY · 🌅 mañana/.test(r.u01) &&
    /sin ubicación/.test(r.u01) && /Maria Flores/.test(r.u01) && /OC 10-u01|OC/.test(r.u01) && /Norte · Calle Los Pinos 123/.test(r.u01), r.u01);
  chk('3 · «💬 Pedir por WhatsApp» solo donde hay celular (también la aproximada con celular)', JSON.stringify(r.wa.slice().sort())===JSON.stringify(['u01','u02','u03','u04','u15','u16']), r.wa);
  chk('3 · sin celular: «llamá a <vendedora>», sin WhatsApp', /sin celular: llamá a Isabel Robledo/.test(r.u05) && r.wa.indexOf('u05')<0, r.u05);
  chk('3 · la aproximada dice «≈ aproximada»', /≈ aproximada/.test(r.u03), r.u03);

  /* 4 · El mensaje y el enlace */
  r=await page.evaluate(()=>({ m1:ubfMsg(findById('u01')), m2:ubfMsg(findById('u02')), m16:ubfMsg(findById('u16')), m15:ubfMsg(findById('u15')),
    w1:ubfWaUrl(findById('u01')), w15:ubfWaUrl(findById('u15')), w5:ubfWaUrl(findById('u05')),
    href:(document.querySelector('.ubf-f[data-id="u01"] a.ubf-wa')||{}).getAttribute ? document.querySelector('.ubf-f[data-id="u01"] a.ubf-wa').getAttribute('href') : '',
    tgt:(document.querySelector('.ubf-f[data-id="u01"] a.ubf-wa')||{}).target }));
  chk('4 · el mensaje de una venta de Heaven, hoy a la mañana', r.m1==='Hola Juana, le escribimos de Heaven Colchones por su entrega de hoy en la mañana. ¿Nos podría mandar su ubicación por WhatsApp (📎 → Ubicación)? Así el chofer llega directo. ¡Gracias!', r.m1);
  chk('4 · …de Sueña, mañana a la tarde (con el día)', r.m2==='Hola Pedro, le escribimos de Sueña por su entrega de mañana (sábado 14/11) en la tarde. ¿Nos podría mandar su ubicación por WhatsApp (📎 → Ubicación)? Así el chofer llega directo. ¡Gracias!', r.m2);
  chk('4 · una ATC no es «su entrega»: «la visita de nuestro camión»', /por la visita de nuestro camión de hoy en la tarde/.test(r.m16), r.m16);
  chk('4 · el enlace: el chat del cliente (+591) con el mensaje escrito, en otra pestaña', r.w1.indexOf('https://wa.me/59170012345?text=')===0 && decodeURIComponent(r.w1.split('?text=')[1])===r.m1 && r.href===r.w1 && r.tgt==='_blank', r.w1);
  chk('4 · un número de otro país también (la regla del bot)', r.w15.indexOf('https://wa.me/5491123456789?text=')===0, r.w15);
  chk('4 · sin celular no hay enlace', r.w5==='', r.w5);

  /* 5 · «✓ Ya la pedí» */
  await page.evaluate(()=>{ document.querySelector('.ubf-f[data-id="u01"] .ubf-ya').click(); });
  await page.waitForTimeout(60);
  r=await page.evaluate(()=>{ var b=document.getElementById('modal-box'), T=function(e){ return e?e.textContent.replace(/\s+/g,' ').trim():''; };
    var ls=JSON.parse(localStorage.getItem('me_ubic_pedida')||'{}'), o=admHacerDatos().filter(function(x){ return x.k==='ubic'; })[0];
    return { ls:Object.keys(ls), n:ubfDatos().n, sigue:!!b.querySelector('.ubf-f[data-id="u01"]'), u01:T(b.querySelector('.ubf-f[data-id="u01"]')), res:T(b.querySelector('.ubf-res')),
      des:!!b.querySelector('.ubf-f[data-id="u01"] .ubf-des'), on:document.getElementById('modal').classList.contains('on'), oN:o&&o.n, oTxt:o&&o.s }; });
  chk('5 · «✓ Ya la pedí» queda en el aparato por pedido y día', JSON.stringify(r.ls)===JSON.stringify(['u01|2026-11-13']), r.ls);
  chk('5 · sigue en la lista como «✓ pedida HH:MM», con «↩️ No la pedí»', r.on && r.sigue && /✓ pedida 09:10/.test(r.u01) && r.des, r.u01);
  chk('5 · …y ya no cuenta en el número rojo (lista y «Para hacer»)', r.n===4 && /^4\s*entregas/.test(r.res) && r.oN===4 && /1 ya pedida/.test(r.oTxt||''), r);
  await page.evaluate(()=>{ document.querySelector('.ubf-f[data-id="u01"] .ubf-des').click(); });
  r=await page.evaluate(()=>({ n:ubfDatos().n, ls:Object.keys(JSON.parse(localStorage.getItem('me_ubic_pedida')||'{}')) }));
  chk('5 · «↩️ No la pedí» lo devuelve al número rojo', r.n===5 && r.ls.length===0, r);
  r=await page.evaluate(()=>{ ubfMarcar('u01',1); var a=ubfDatos().n; var p=findById('u01'), f0=p.fecha; p.fecha=proximoDiaEntrega(); var b=ubfDatos().n; p.fecha=f0; ubfMarcar('u01',0); return { a:a, b:b, c:ubfDatos().n }; });
  chk('5 · si el pedido cambia de día, lo pedido para el otro día no vale: vuelve a contar', r.a===4 && r.b===5 && r.c===5, r);
  r=await page.evaluate(()=>{ var s=Storage.prototype.setItem, g=Storage.prototype.getItem, msg='';
    var to=toast; toast=function(m){ msg=m; };
    Storage.prototype.setItem=function(){ throw new Error('lleno'); }; Storage.prototype.getItem=function(){ throw new Error('bloqueado'); };
    var err=''; try{ ubfMarcar('u01',1); var D=ubfDatos(); var o=admHacerDatos(); }catch(e){ err=String(e); }
    Storage.prototype.setItem=s; Storage.prototype.getItem=g; toast=to;
    return { err:err, msg:msg, n:ubfDatos().n }; });
  chk('5 · sin almacenamiento: avisa, no se rompe y no marca nada', !r.err && /No pude anotarlo/.test(r.msg) && r.n===5, r);

  /* 6 · Pegar la ubicación y abrir el pedido */
  RESP='-17.7501, -63.1702';
  await page.evaluate(()=>{ ubfAbrir(); window._guardados=[]; var as=apiSave; apiSave=function(rec){ window._guardados.push(rec && rec.id); return as(rec); };
    document.querySelector('.ubf-f[data-id="u01"] button[onclick*="ubfPegar"]').click(); });
  await page.waitForTimeout(250); RESP=undefined;
  r=await page.evaluate(()=>({ maps:findById('u01').maps, n:ubfDatos().n, en:!!document.querySelector('#modal-box .ubf-f[data-id="u01"]'), on:!!document.querySelector('#modal-box .ubf'), g:window._guardados }));
  chk('6 · «✏️ Pegar ubicación» guarda el pin, lo saca de la lista y la lista sigue abierta', /q=-17\.7501,-63\.1702/.test(r.maps||'') && r.n===4 && !r.en && r.on && r.g.indexOf('u01')>=0, r);
  await page.evaluate(()=>{ document.querySelector('.ubf-f[data-id="u02"] button[onclick*="ubfAbrirPedido"]').click(); });
  await page.waitForTimeout(80);
  r=await page.evaluate(()=>{ var b=document.getElementById('modal-box'); return { ficha:!!b.querySelector('.fl-b'), cli:/PEDRO ROJAS/.test(b.textContent), volver:(b.querySelector('.ubf-volver')||{}).textContent||'' }; });
  chk('6 · «📍 Abrir el pedido» abre la ficha de Administración con «← Volver a las ubicaciones que faltan»', r.ficha && r.cli && /Volver a las ubicaciones que faltan/.test(r.volver), r);
  await page.evaluate(()=>{ document.querySelector('#modal-box .ubf-volver').click(); });
  r=await page.evaluate(()=>({ lista:!!document.querySelector('#modal-box .ubf'), n:document.querySelectorAll('#modal-box .ubf-f').length }));
  chk('6 · «← Volver» vuelve a la lista', r.lista && r.n===7, r);
  await page.evaluate(()=>closeModal());

  /* 3b · Bloki (logística) */
  r=await page.evaluate(()=>{ var a=asisLogistica().filter(function(x){ return /^l-ubic\|/.test(x.k); })[0]||null; return a ? { t:a.t, x:a.x, n:a.lista.length, b:a.b, ids:a.lista.map(function(l){ return l.id; }).sort(), ped:a.ped } : null; });
  chk('3b · Bloki se lo dice a logística: «6 entregas de hoy y mañana sin ubicación» (con las sin celular), con la lista y el botón',
    r && r.t==='6 entregas de hoy y mañana sin ubicación' && r.n===6 && /WhatsApp/.test(r.x) && /2 sin celular: llamá a la vendedora/.test(r.x) && r.b && r.b[1]==='ubfAbrir()' && r.ped===1, r);
  r=await page.evaluate(()=>{ ['u02','u04','u15','u16','u05','u10'].forEach(function(id){ ubfMarcar(id,1); }); var a=asisLogistica().filter(function(x){ return /^l-ubic\|/.test(x.k); }).length;
    var o=admHacerDatos().filter(function(x){ return x.k==='ubic'; })[0]; return { a:a, sev:o&&o.sev, t:o&&o.t }; });
  chk('3b · todo pedido: Bloki ya no lo dice y «Para hacer» queda en azul (la aproximada sin pedir)', r.a===0 && r.sev==='i' && /≈ aproximada/.test(r.t||''), r);
  r=await page.evaluate(()=>{ ubfMarcar('u03',1); var o=admHacerDatos().filter(function(x){ return x.k==='ubic'; })[0]; return { sev:o&&o.sev, n:o&&o.n, t:o&&o.t }; });
  chk('3b · todo pedido y nada aproximado sin pedir: queda «Ubicaciones pedidas: falta que el cliente las mande» en azul', r.sev==='i' && r.n===7 && /Ubicaciones pedidas/.test(r.t||''), r);

  /* 7 · Sin nada que pedir */
  r=await page.evaluate(()=>{ STATE.forEach(function(p){ if(/^u\d+$/.test(p.id) && !p.entregado) p.maps='https://www.google.com/maps?q=-17.7'+p.id.slice(1)+',-63.17'; });
    var o=admHacerDatos().filter(function(x){ return x.k==='ubic'; }).length, b=asisLogistica().filter(function(x){ return /^l-ubic\|/.test(x.k); }).length;
    ubfAbrir(); var t=document.querySelector('#modal-box .ubf-vacio'); var txt=t?t.textContent:''; closeModal(); return { o:o, b:b, txt:txt }; });
  chk('7 · todo con ubicación: ni renglón en «Para hacer» ni Bloki, y la lista dice «✅ Todas…»', r.o===0 && r.b===0 && /Todas las entregas de hoy y mañana tienen su ubicación/.test(r.txt), r);
  chk('· sin errores en la página', A.errs.length===0, A.errs);
  await A.ctx.close();

  /* 7b · Un sábado: el próximo camión es el lunes */
  A=await abrir(browser, '2026-11-14T10:00:00-04:00');
  await cargar(A.page);
  r=await A.page.evaluate(()=>{ var D=ubfDatos(); return { diasTxt:D.diasTxt, ids:D.F.map(function(x){ return x.id; }).sort(), t:(admHacerDatos().filter(function(x){ return x.k==='ubic'; })[0]||{}).t, m:ubfMsg(findById('u12')) }; });
  chk('7b · un sábado: «hoy y lunes 16/11», y entra lo del lunes', r.diasTxt==='hoy y lunes 16/11' && r.ids.indexOf('u12')>=0 && /\(hoy y lunes 16\/11\)/.test(r.t||''), r);
  chk('7b · …y el mensaje dice el día («del lunes 16/11»)', /por su entrega del lunes 16\/11 en la mañana/.test(r.m), r.m);
  chk('· sin errores en la página (sábado)', A.errs.length===0, A.errs);
  await A.ctx.close();

  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
