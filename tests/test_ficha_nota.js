/* 🧠 (24/10, dueño: «muéstrame 1-7 + 1-6») La ficha de logística lee la NOTA del vendedor (quién recibe, horario, cobrar/tarjetero,
   lo que no se lleva, lo que contradice al pedido, la nota limpia) y además: qué hacer, lo que cambió por renglón, «lo viste antes del
   cambio», medida/código grandes, bultos, etiquetas tildables. Se corre:  node tests/test_ficha_nota.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,300)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_u2_turno.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));
(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('dialog', d=>d.accept());
  await page.clock.setFixedTime(new Date('2026-10-23T15:10:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');
  const r = await page.evaluate(async()=>{
    UNLOCKED=true; try{ localStorage.removeItem('me_ficha_tilde'); localStorage.removeItem('me_ficha_vista'); }catch(e){}
    var L=[ _lin('CH1201|TITANIO ICE|160x190',1,{chk:'ok'}), _lin('CD1403|ALMOHADA FIBRA SILICONADA|50x70',2,{chk:'ok'}), _lin('CH1195|ALMOHADA NASA|',1,{chk:'ok'}), _lin('|PROTECTOR DE COLCHON|160x190',1,{}) ];
    var p=_ped('n1','2026-10-24','PM',L,{ cliente:'CLIENTE NOTA', celular:'71234567', pagado:true, saldo:0, maps:'https://www.google.com/maps?q=-17.742,-63.171',
      observaciones:'OC- 32218 · POR FAVOR LLAMAR UNA HORA ANTES, LO RECIBE EL SR. JAIME 75551234. ENTREGAR DE 11 A 12. COBRAR BS 4740 LLEVAR TARJETERO. COLOCAR DOBLE BOLSA. LAS ALM NASA YA SE ENTREGARON EN TIENDA, SOLO LLEVAR LAS 2 ALM DE FIBRA' });
    var q=_ped('n2','2026-10-24','AM',[_lin('CH1201|TITANIO ICE|160x190',1,{chk:'ok'})],{ cliente:'CLIENTE ROHO', maps:'',
      observaciones:'📍 CASA PORTON PLOMO · Recibe: MARIOLY BALCAZAR · WhatsApp: 70014456 · Importado del Excel de ROHO' });
    var s=_ped('n3','2026-10-24','AM',[_lin('CH1201|TITANIO ICE|160x190',1,{chk:'ok'})],{ cliente:'CLIENTE REGISTRO',
      observaciones:'VENTA YA ENTREGADA Y REGISTRADA 06-10-2026 - NO ARMAR PEDIDO - SOLO ES PARA REGISTRO DE VENTA' });
    var u=_ped('n4','2026-10-24','AM',[_lin('CH1201|TITANIO ICE|160x190',1,{chk:'ok'})],{ cliente:'CLIENTE MEDIDA', observaciones:'1 1/2 plazas, colocar doble bolsa' });
    await _cargar([p,q,s,u], _stock(function(s2){ s2.c.u[_K]=10; }));
    var out={}, N=fichaNota(findById('n1'));
    out.N={ recibe:N.recibe, cel:N.recibeCel, llamar:N.llamar, hora:N.hora, horaT:N.horaT, cobrar:N.cobrar, tarj:N.tarjetero, noLlevar:N.noLlevar, limpio:N.limpio };
    var R=fichaNota(findById('n2')); out.R={ recibe:R.recibe, cel:R.recibeCel, limpio:R.limpio };
    out.S=fichaContras(findById('n3'), fichaNota(findById('n3')));
    out.U=fichaNota(findById('n4')).fechaNota;
    // la ficha
    var x=findById('n1'); x.productos.forEach(function(r){ r.mod={ f:'2026-10-23', h:'14:35', q:'Maria Flores', por:'Maria Flores', d:['🔢 ALMOHADA FIBRA SILICONADA 50x70 × 2 — de 1 a 2','➖ BASE DE MADERA 160x190 × 1'] }; });
    localStorage.setItem('me_ficha_vista', JSON.stringify({ n1:new Date('2026-10-23T10:05:00-04:00').getTime() }));
    showPedidoModal('n1');
    var box=document.getElementById('modal-box'), t=function(sel){ var e=box.querySelector(sel); return e?e.textContent.replace(/\s+/g,' '):''; };
    out.qh=t('.fl-qh'); out.contra=t('.fl-contra'); out.modp=t('.fl-modp'); out.leer=!!box.querySelector('details.fl-leer') && !box.querySelector('details.fl-leer').open; out.obsX=t('.fl-obs .x'); out.bultos=t('.fl-bultos'); out.tiendita=t('.fl-tiendita'); out.prodsTxt=[].map.call(box.querySelectorAll('.fl-prod .fl-pnn'), function(e){ return e.textContent; }).join(' | ');
    out.no=t('.fl-prod-no'); out.cam=t('.fl-prod-cam'); out.quit=t('.fl-prod-quit'); out.med=[].map.call(box.querySelectorAll('.fl-med'), function(e){ return e.textContent; });
    out.recibe=[].map.call(box.querySelectorAll('.fl-per'), function(e){ return e.textContent; }).join(' | '); out.mapa=!!box.querySelector('#fl-mapa');
    // reabrir: «lo viste antes» ya no avisa (se anotó la vista)
    closeModal(); showPedidoModal('n1'); out.despues2=/DESPUÉS de que lo viste/.test(t('.fl-modp'));
    // las etiquetas se tildan y la pregunta solo pide lo que falta; todo tildado → directo
    window.OBS_PRUEBA=1;
    var chips=[].slice.call(box.querySelectorAll('.fl-obs button.fl-chip')); out.nChips=chips.length;
    fichaTildar('n1','bolsa'); out.tildada=!!document.querySelector('#modal-box .fl-obs button.fl-chip.ok');
    document.querySelector('#modal-box .fl-sw').click();
    var ov=document.getElementById('obs-conf'); out.pregFaltan=ov.querySelectorAll('.fl-chip').length; out.pregLimpia=!/OC- 32218/.test(ov.textContent); document.getElementById('obs-no').click();
    fichaObsChips(findById('n1')).forEach(function(c){ if(!fichaTildes('n1')[c.k]) fichaTildar('n1', c.k); });
    document.querySelector('#modal-box .fl-sw').click(); out.directo=findById('n1').verificado===true && document.getElementById('obs-conf').hidden;
    showPedidoModal('n2'); out.roho=t('.fl-obs .x'); out.rohoQh=t('.fl-qh');
    return out;
  });
  chk('lee quién recibe y su celular («lo recibe el Sr. Jaime 7…»)', r.N.recibe==='Sr. Jaime' && r.N.cel==='75551234', r.N);
  chk('lee «llamar 1 h antes», el horario «de 11 a 12» (mañana), cobrar Bs 4.740 y el tarjetero', r.N.llamar==='1 h antes' && /entre las 11 y las 12/.test(r.N.hora) && r.N.horaT==='AM' && r.N.cobrar===4740 && r.N.tarj, r.N);
  chk('lo que ya se entregó en tienda (NASA) no se lleva; la FIBRA sí', JSON.stringify(r.N.noLlevar)==='[2]', r.N.noLlevar);
  chk('la nota limpia saca «OC- 32218»', !/32218/.test(r.N.limpio) && /LLAMAR UNA HORA ANTES/.test(r.N.limpio), r.N.limpio);
  chk('ROHO: «Recibe: … · WhatsApp: …» y sin «Importado del Excel de ROHO»', r.R.recibe==='MARIOLY BALCAZAR' && r.R.cel==='70014456' && r.R.limpio==='CASA PORTON PLOMO', r.R);
  chk('«NO ARMAR PEDIDO – solo para registro» es una contradicción', r.S.some(x=>/no armar/i.test(x)), r.S);
  chk('«1 1/2 plazas» no es una fecha', r.U==='', r.U);
  chk('QUÉ HACER en una línea: 3 bultos en PTF (sin la NASA ni lo de tienda) › entregar con el horario › llamar a Jaime', /Cargar 3 bultos en PTF/.test(r.qh) && /entre las 11 y las 12/.test(r.qh) && /llamar 1 h antes a Sr\. Jaime/.test(r.qh), r.qh);
  chk('la nota queda plegada («Leer la nota completa») porque ya salió en etiquetas', r.leer, r.leer);
  chk('⛔ el horario de la nota contradice el turno y «cobrar» con el pedido pagado', /TARDE/.test(r.contra) && /figura PAGADO/.test(r.contra), r.contra);
  chk('✏️ la franja del cambio dice «DESPUÉS de que lo viste»', /DESPUÉS de que lo viste/.test(r.modp), r.modp);
  chk('reabrir la ficha ya no dice «después de que lo viste»', r.despues2===false, r.despues2);
  chk('la nota del recuadro amarillo va limpia', !/32218/.test(r.obsX), r.obsX.slice(0,80));
  chk('bultos: sin lo de tienda ni lo que no se lleva; lo de tienda aparte', /3 bultos/.test(r.bultos) && /protector/i.test(r.tiendita), { b:r.bultos, t:r.tiendita });
  chk('lo de tienda NO se repite en la lista de productos y la línea dice su medida (dueño, 24/10)', !/PROTECTOR/i.test(r.prodsTxt) && /protector de colchon 160×190/i.test(r.tiendita), { p:r.prodsTxt, t:r.tiendita });
  chk('el renglón que no se lleva sale tachado y dice por qué', /NASA/.test(r.no) && /No se lleva/.test(r.no), r.no);
  chk('lo que cambió, en el renglón (antes 1, ahora 2) y lo quitado aparte', /antes 1, ahora 2/.test(r.cam) && /BASE DE MADERA/.test(r.quit) && /LO QUITARON/.test(r.quit), { c:r.cam, q:r.quit });
  chk('la medida en grande', r.med.indexOf('160×190')>=0 && r.med.indexOf('50×70')>=0, r.med);
  chk('quién recibe en «Dónde entregar» y el lugar del mapita', /Sr\. Jaime/.test(r.recibe) && r.mapa, { r:r.recibe, m:r.mapa });
  chk('las etiquetas se tocan y quedan tildadas', r.nChips>=4 && r.tildada, r);
  chk('«Listo para cargar» pregunta solo lo que falta tildar, con la nota limpia', r.pregFaltan===r.nChips-1 && r.pregLimpia, r);
  chk('todo tildado: «Listo para cargar» va directo', r.directo, r.directo);
  chk('ROHO: el amarillo dice solo la referencia de la casa y QUÉ HACER nombra a quien recibe', r.roho==='CASA PORTON PLOMO' && /MARIOLY BALCAZAR/.test(r.rohoQh), { o:r.roho, q:r.rohoQh });
  chk('sin errores en la página', errs.length===0, errs);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
