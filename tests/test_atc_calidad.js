/* 🎧📉 ATC Y CALIDAD (13/11/2026, mejoras 178, 179 y 180 que eligió el dueño del muestrario):
     178 «📉 Cada 100 vendidos»: cuántas ATC por cada 100 colchones y somieres vendidos de cada línea (TITANIO, ORO, ESPECIAL, las de Sueña…);
     179 «🔁 2ª ATC»: el mismo cliente (mismo celular, `cliCelClave`) con otra ATC: aviso en el formulario, chip en la pestaña, número en el informe;
     180 «⏳ A cuántos meses de la compra»: meses desde la fecha de compra hasta que entró la ATC, en tramos, por línea y por motivo.
   Lo que cuida:
     1. Las cuentas de 178 (`atcqTasa`): ventana fija de los últimos 6 meses, nunca antes de PRY_PRIMER_MES; ATC por cuándo entraron y ventas por
        el día de la venta; solo colchones y somieres con su cantidad (un combo, dos); afuera ATC, RPT, internos, borradores, filas del sistema y
        lo que ROHO manda a sus tiendas; una ATC cuenta una vez por línea; el rojo arriba de ATC_TASA_ALERTA con al menos ATCQ_MIN_VENDIDOS.
     2. 179: el número de cada ATC del cliente (`atcRepNro`), el chip en la tabla, en las tarjetas y en la ficha; el aviso del formulario (sin la
        propia al editar, escondido en una OC, «no frena»).
     3. 180: `atcqMeses` (meses enteros) y los tramos 0-3 / 3-6 / 6-12 / 12-24 / +24 / sin fecha, por línea y por motivo (`atcqEdades`).
     4. La pestaña: el bloque de la tasa NO sigue los filtros (y lo dice); el de los meses sí; «Por línea / Por motivo»; «Volvieron a reclamar».
     5. El informe PDF: las dos hojas nuevas, «N clientes con más de una ATC», que nada pise el pie, y su CSS sin color-mix ni box-shadow.
   Datos SINTÉTICOS, reloj clavado en el viernes 13/11/2026 a las 11:00 de Bolivia. Se corre:  node tests/test_atc_calidad.js   (desde la raíz;
   PEDIDOS=<otro pedidos.html> para probar otra página) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const ARCH='file://'+(process.env.PEDIDOS||path.resolve('pedidos.html'));

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; UNLOCKED=true; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  loadFromServer=function(){}; apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
  apiSave=function(r){ return Promise.resolve({ ok:true, pedido:r }); };
  try{ localStorage.removeItem('me_atc_tabla'); localStorage.removeItem('me_atc_viejas'); }catch(e){}
  var n=0, ts=function(f){ return new Date(f+'T10:00:00-04:00').getTime(); };
  /* una venta: [desc, cant] por renglón */
  var V=function(vend, dia, prods, extra){ n++; var p={ id:'v'+n, oc:'11-'+String(100+n), vendedor:vend, cliente:'CLIENTE '+n, celular:'7100'+String(1000+n), fecha:dia, turno:'AM', ts:ts(dia),
    entregado:false, fotos:[], productos:prods.map(function(x){ return { desc:x[0], medida:'140x190', cant:x[1], precio:1000 }; }) };
    for(var k in (extra||{})) p[k]=extra[k]; return p; };
  /* una ATC: los datos de la ATC van en cada renglón (`atc`) */
  var A=function(id, oc, entro, cel, cli, prods, atc, extra){ var p={ id:id, oc:oc, vendedor:'Mirian Salazar', cliente:cli, celular:cel, fecha:entro, turno:'AM', ts:ts(entro),
    entregado:false, fotos:[], productos:prods.map(function(d){ return { desc:d, medida:'140x190', cant:1, atc:atc }; }) };
    for(var k in (extra||{})) p[k]=extra[k]; return p; };
  STATE=[
    /* ---- ventas en la ventana (del 01/08 al 13/11) ---- */
    V('Mirian Salazar', '2026-09-10', [['COLCHON TITANIO ICE', 20], ['SOMIER TITANIO ICE', 5], ['ALMOHADA FIBRA', 50]]),   // TITANIO 25 (la almohada no cuenta)
    V('Isabel Robledo', '2026-10-02', [['ORO ORTOPEDICO', 30]]),                                                         // ORO 30
    V('Eduardo Añez', '2026-10-20', [['ESPECIAL SEMIORTOPEDICO', 20]]),                                                  // ESPECIAL 20 (mayorista: cuenta)
    V('Mauricio Merida', '2026-11-03', [['COMBO SOFT', 2]]),                                                             // SOFT 4 (un combo son dos)
    V('ROHO', '2026-10-05', [['MEMORY FLEX', 7]], { cliente:'JUAN PEREZ' }),                                              // FLEX 7
    /* ---- ventas que NO cuentan ---- */
    V('Mirian Salazar', '2026-07-15', [['COLCHON TITANIO ICE', 100]]),                                                   // antes de la ventana (PRY_PRIMER_MES)
    V('ALBA', '2026-09-12', [['COLCHON TITANIO ICE', 100]]),                                                             // pedido interno
    V('Mirian Salazar', '2026-09-12', [['TITANIO ICE', 100]], { oc:'RPT 09-001', cliente:'Mia Plaza' }),                 // reposición de tienda
    V('ROHO', '2026-10-06', [['MEMORY FLEX', 40]], { cliente:'TIENDA 1' }),                                               // ROHO a su tienda: mover mercadería
    V('Maria Flores', '2026-10-07', [['COLCHON TITANIO ICE', 100]], { estado:BORRADOR_EST }),                            // borrador de Kommo
    V('Maria Flores', '2026-10-08', [['COLCHON TITANIO ICE', 0]]),                                                       // cantidad 0
    /* ---- ATC ---- */
    /* el mismo cliente, con tres formas de escribir el celular: 1ª en septiembre, 2ª en noviembre, 3ª en noviembre */
    A('a1', 'ATC 09-001', '2026-09-05', '700 11111', 'ROSA PRIMERA', ['COLCHON TITANIO ICE', 'SOMIER TITANIO ICE'], { mot:'Hundimiento', det:'hundido en el medio', fcom:'2024-01-10', tipo:'gar', hizo:'se retapizó', ent:'2026-09-20', rf:'2026-09-18' }),
    A('a2', 'ATC 11-001', '2026-11-02', '+591 70011111', 'ROSA PRIMERA', ['TITANIO ICE'], { mot:'Hundimiento', det:'otra vez hundido', fcom:'2026-09-15', tipo:'gar' }),
    A('a3', 'ATC 11-002', '2026-11-05', '7001-1111', 'ROSA P.', ['TITANIO LATEX'], { mot:'Ruido', det:'cruje al moverse', fcom:'2026-05-02', tipo:'gar' }),
    /* otras */
    A('a4', 'ATC 10-001', '2026-10-10', '72222222', 'ORO UNO', ['ORO ORTOPEDICO'], { mot:'Resortes', det:'se siente un resorte', fcom:'2026-07-10', tipo:'gar' }),
    A('a5', 'ATC 10-002', '2026-10-12', '73333333', 'DREAM UNO', ['DREAM'], { mot:'Ruido', det:'hace ruido de noche', fcom:'2026-12-01', tipo:'stc' }),   // compra posterior: sin fecha
    A('a6', 'ATC 11-003', '2026-11-06', '74444444', 'SOFT UNO', ['COLCHON SOFT'], { mot:'Hundimiento', det:'se hundió de un lado', tipo:'gar' }, { vendedor:'Mauricio Merida' }),   // sin fecha de compra
    A('a7', 'ATC 11-004', '2026-11-07', '75555555', 'ALMOHADA UNO', ['ALMOHADA FIBRA'], { mot:'Otro', det:'la almohada se deformó', fcom:'2026-08-07', tipo:'gar' }),   // no es colchón: fuera de la tasa
    A('a8', 'ATC 07-001', '2026-07-20', '76666666', 'JULIO UNO', ['COLCHON TITANIO ICE'], { mot:'Hundimiento', det:'hundido de julio', fcom:'2025-07-20', tipo:'gar' })   // antes de la ventana
  ];
  saveMirror();
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1300, height:1000 }, timezoneId:'America/La_Paz' });
  await ctx.addInitScript(() => { try{ sessionStorage.setItem('me_quien_ok','1'); localStorage.setItem('me_asis_tour','1'); }catch(e){} });
  await ctx.route(/^https?:/, r => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await page.clock.setFixedTime(new Date('2026-11-13T11:00:00-04:00'));
  await page.goto(ARCH, { waitUntil:'load' }); await page.waitForTimeout(900);
  await page.evaluate(PREPARAR);

  /* ---- 1. 178: las cuentas ---- */
  let r = await page.evaluate(() => {
    var T=atcqTasa(), M={}, L={};
    T.marcas.forEach(function(m){ M[m.k]={ atc:m.atc, vend:m.vend, tasa:m.tasa }; m.lineas.forEach(function(l){ L[m.k+'|'+l.lbl]={ atc:l.atc, vend:l.vend, tasa:l.tasa, alerta:l.alerta, pocos:l.pocos }; }); });
    return { desde:T.desde, hasta:T.hasta, corta:T.corta, nAtc:T.nAtc, fuera:T.fuera, M:M, L:L, tot:{ atc:T.tot.atc, vend:T.tot.vend, tasa:T.tot.tasa },
      alertas:T.alertas, filas:atcqFilasTasa(T).map(function(f){ return f.t+':'+f.o.lbl; }), vent:atcqVentana('2027-03-20') };
  });
  chk('1 · la ventana: del 01/08 (PRY_PRIMER_MES, el primer mes entero) al 13/11, y dice que está cortada', r.desde==='2026-08-01' && r.hasta==='2026-11-13' && r.corta, [r.desde, r.hasta, r.corta]);
  chk('1 · en marzo de 2027 la ventana son los últimos 6 meses: desde el 01/10/2026', r.vent.desde==='2026-10-01' && !r.vent.corta, r.vent);
  chk('1 · TITANIO: 3 ATC (la de colchón + somier cuenta una vez) sobre 25 vendidos (20 colchones + 5 somieres, sin las 50 almohadas) = 12 %',
    r.L['heaven|TITANIO'] && r.L['heaven|TITANIO'].atc===3 && r.L['heaven|TITANIO'].vend===25 && r.L['heaven|TITANIO'].tasa===12, r.L['heaven|TITANIO']);
  chk('1 · …y va en rojo: pasa de ATC_TASA_ALERTA (8 %) con al menos 20 vendidos', r.L['heaven|TITANIO'].alerta===true && r.alertas.length===1 && r.alertas[0].lin==='TITANIO', r.alertas);
  chk('1 · afuera: lo de antes de la ventana, el pedido interno, la RPT, el borrador, la cantidad 0 y la ATC de julio (TITANIO sigue en 25 y 3)',
    r.L['heaven|TITANIO'].vend===25 && r.L['heaven|TITANIO'].atc===3, r.L['heaven|TITANIO']);
  chk('1 · ORO: 1 ATC sobre 30 = 3,3 %, sin rojo', r.L['heaven|ORO'] && r.L['heaven|ORO'].atc===1 && r.L['heaven|ORO'].vend===30 && r.L['heaven|ORO'].tasa===3.3 && !r.L['heaven|ORO'].alerta, r.L['heaven|ORO']);
  chk('1 · ESPECIAL: las ventas de Eduardo (mayorista) cuentan: 0 ATC sobre 20', r.L['heaven|ESPECIAL'] && r.L['heaven|ESPECIAL'].atc===0 && r.L['heaven|ESPECIAL'].vend===20, r.L['heaven|ESPECIAL']);
  chk('1 · DREAM: una ATC y ninguna venta en la ventana → la tasa queda sin número («sin ventas»)', r.L['heaven|DREAM'] && r.L['heaven|DREAM'].atc===1 && r.L['heaven|DREAM'].tasa===null, r.L['heaven|DREAM']);
  chk('1 · SOFT (Sueña): un COMBO por 2 son 4 unidades; 1 ATC sobre 4 = 25 % pero «pocos vendidos», sin rojo',
    r.L['suena|SOFT'] && r.L['suena|SOFT'].vend===4 && r.L['suena|SOFT'].atc===1 && r.L['suena|SOFT'].tasa===25 && r.L['suena|SOFT'].pocos && !r.L['suena|SOFT'].alerta, r.L['suena|SOFT']);
  chk('1 · ROHO: solo la venta a un cliente (7), no lo que mandó a su TIENDA 1', r.M.roho && r.M.roho.vend===7 && r.M.roho.atc===0, r.M.roho);
  chk('1 · Heaven en total: 5 ATC (TITANIO 3, ORO 1, DREAM 1) sobre 75 vendidos', r.M.heaven && r.M.heaven.atc===5 && r.M.heaven.vend===75 && r.M.heaven.tasa===6.7, r.M.heaven);
  chk('1 · la ATC de la almohada no es de un colchón: fuera de la tasa y contada aparte; la de julio, fuera de la ventana', r.nAtc===7 && r.fuera===1, [r.nAtc, r.fuera]);
  chk('1 · las filas: la marca, sus líneas CON ATC, una sola fila «Sin ATC» con las demás, ROHO sin ATC en una sola fila, y «Todas»',
    JSON.stringify(r.filas)===JSON.stringify(['m:Heaven','l:TITANIO','l:ORO','l:DREAM','z:Sin ATC: ESPECIAL','m:Sueña','l:SOFT','m:ROHO (FLEX / PEDIC)','tot:undefined']), r.filas);

  /* ---- 2. 179: el mismo cliente ---- */
  r = await page.evaluate(() => {
    var M=atcRepMapa();
    return { nros:['a1','a2','a3','a4'].map(function(id){ return atcRepNro(findById(id), M); }), chip2:atcRepChip(findById('a2'), M), chip1:atcRepChip(findById('a1'), M),
      clave:[atcRepClave(findById('a1')), atcRepClave(findById('a2')), atcRepClave(findById('a3'))], clientes:atcRepClientes(STATE.filter(function(p){ return esATC(p.oc); }), M).map(function(c){ return c.L.length; }) };
  });
  chk('2 · «700 11111», «+591 70011111» y «7001-1111» son el mismo celular (cliCelClave)', r.clave[0]==='70011111' && r.clave[1]===r.clave[0] && r.clave[2]===r.clave[0], r.clave);
  chk('2 · son la 1ª, 2ª y 3ª ATC de ese cliente, por cuándo entraron; la de otro cliente es su 1ª', JSON.stringify(r.nros)==='[1,2,3,1]', r.nros);
  chk('2 · el chip «🔁 2ª ATC» solo en las que no son la primera', /🔁 2ª ATC/.test(r.chip2) && r.chip1==='', [r.chip2, r.chip1]);
  chk('2 · un solo cliente con más de una ATC (con 3)', JSON.stringify(r.clientes)==='[3]', r.clientes);

  /* ---- 4. la pestaña ---- */
  await page.evaluate(() => { showView('atc'); segSet('atc-mode','todo'); renderAtc(); }); await page.waitForTimeout(300);
  const tab = () => page.evaluate(() => {
    var t=document.getElementById('atq-tasa'), e=document.getElementById('atq-edad'), rp=document.getElementById('atq-rep');
    var fila=function(re){ var tr=[].slice.call(document.querySelectorAll('#atq-tasa tbody tr')).filter(function(x){ return re.test(x.innerText); })[0]; return tr ? { txt:tr.innerText.replace(/\s+/g,' '), roja:tr.classList.contains('alerta') } : null; };
    var filaAtc=function(oc){ var tr=[].slice.call(document.querySelectorAll('#tbl-atc tbody tr')).filter(function(x){ return x.innerText.indexOf(oc)>=0; })[0]; return tr ? tr.innerText.replace(/\s+/g,' ') : ''; };
    return { tasa:t ? t.innerText.replace(/\s+/g,' ') : '', edad:e ? e.innerText.replace(/\s+/g,' ') : '', rep:rp ? rp.innerText.replace(/\s+/g,' ') : '',
      tit:fila(/^TITANIO/), dream:fila(/^DREAM/), z:fila(/^Sin ATC/), a1:filaAtc('ATC 09-001'), a2:filaAtc('ATC 11-001'), a3:filaAtc('ATC 11-002') };
  });
  r = await tab();
  chk('4 · el bloque «📉 Cada 100 vendidos» dice la ventana y que no sigue los filtros', /Cada 100 vendidos/.test(r.tasa) && /del 01\/08\/2026 al 13\/11\/2026/.test(r.tasa) && /no sigue los filtros de arriba/.test(r.tasa), r.tasa);
  chk('4 · la fila de TITANIO: 3 · 25 · 12 %, en rojo', r.tit && /TITANIO 3 25 12 %/.test(r.tit.txt) && r.tit.roja, r.tit);
  chk('4 · DREAM sin ventas y «Sin ATC: ESPECIAL» con sus 20 vendidos', r.dream && /sin ventas/.test(r.dream.txt) && r.z && /Sin ATC: ESPECIAL 0 20 0 %/.test(r.z.txt), [r.dream, r.z]);
  chk('4 · dice que es aproximado y el umbral', /Aproximado/.test(r.tasa) && /más de 8 cada 100/.test(r.tasa), r.tasa);
  chk('4 · el chip «🔁 2ª ATC» y «3ª» en la tabla; la primera sin chip', /🔁 2ª ATC/.test(r.a2) && /🔁 3ª ATC/.test(r.a3) && !/ª ATC/.test(r.a1), [r.a1, r.a2, r.a3]);
  chk('4 · «🔁 Volvieron a reclamar»: el cliente con sus tres ATC', /Volvieron a reclamar/.test(r.rep) && /1 cliente de la lista/.test(r.rep) && /ATC 09-001/.test(r.rep) && /ATC 11-002/.test(r.rep), r.rep);
  chk('4 · «⏳ A cuántos meses»: con «Todo», las 8 ATC y 6 con fecha de compra (la posterior a la ATC no vale)', /A cuántos meses de la compra falla/.test(r.edad) && /8 ATC de la lista · 6 con fecha de compra/.test(r.edad), r.edad);
  /* el mes: la tasa NO cambia, los meses sí */
  const tasaTodo=r.tasa;
  await page.evaluate(() => { segSet('atc-mode','mes'); document.getElementById('atc-mes').value='2026-11'; renderAtc(); }); await page.waitForTimeout(250);
  r = await tab();
  chk('4 · con «Mes» en noviembre, la tasa es la misma (ventana fija)', r.tasa===tasaTodo, r.tasa.slice(0,200));
  chk('4 · …y «A cuántos meses» sigue el filtro: las 4 de noviembre, 3 con fecha', /4 ATC de la lista · 3 con fecha de compra/.test(r.edad), r.edad);
  chk('4 · «Volvieron a reclamar» con noviembre: el cliente sigue (cuenta su ATC de septiembre)', /ROSA/.test(r.rep) && /ATC 09-001/.test(r.rep), r.rep);
  await page.evaluate(() => { atcqPor('mot'); }); await page.waitForTimeout(150);
  r = await page.evaluate(() => { var t=document.querySelector('#atq-edad table'); return { head:t ? t.querySelector('thead').innerText.replace(/\s+/g,' ').trim() : '', body:t ? t.querySelector('tbody').innerText.replace(/\s+/g,' ') : '',
    on:(document.querySelector('#atq-edad .atq-seg button.on')||{}).innerText }; });
  chk('4 · «Por motivo»: la tabla cambia a motivos (en noviembre Hundimiento 2: una de 0-3 meses y una sin fecha)', /^MOTIVO 0-3 3-6 6-12 12-24 \+24 S\/F TOTAL$/i.test(r.head) && /Hundimiento 1 · · · · 1 2/.test(r.body) && r.on==='Por motivo', r);
  await page.evaluate(() => { atcqPor('lin'); segSet('atc-mode','todo'); renderAtc(); }); await page.waitForTimeout(150);
  /* la ficha */
  await page.evaluate(() => { verAtc('a2'); }); await page.waitForTimeout(200);
  r = await page.evaluate(() => (document.getElementById('modal')||document.body).innerText);
  chk('2 · la ficha de la ATC dice «🔁 2ª ATC»', /🔁 2ª ATC/.test(r), r.slice(0,200));
  await page.evaluate(() => { try{ closeModal(); }catch(e){} });

  /* ---- 3. 180: los meses y los tramos ---- */
  r = await page.evaluate(() => {
    var E=atcqEdades(STATE.filter(function(p){ return esATC(p.oc); }));
    var lin={}; E.lineas.forEach(function(l){ lin[l.lbl]=l.t.join(','); });
    var mot={}; E.motivos.forEach(function(m){ mot[m.lbl]=m.t.join(','); });
    return { m:[atcqMeses('2026-01-31','2026-02-28'), atcqMeses('2025-11-13','2026-11-13'), atcqMeses('2026-12-01','2026-11-13'), atcqMeses('2026-08-13','2026-11-13'), atcqMeses('','2026-11-13')],
      tr:[atcqTramo(0), atcqTramo(2), atcqTramo(3), atcqTramo(6), atcqTramo(12), atcqTramo(23), atcqTramo(24), atcqTramo(null)],
      tot:E.tot, con:E.con, med:E.med, temprano:E.temprano, lin:lin, mot:mot };
  });
  chk('3 · meses enteros: 31/01→28/02 = 0; un año justo = 12; compra posterior = sin dato; 13/08→13/11 = 3; sin fecha = sin dato', JSON.stringify(r.m)==='[0,12,null,3,null]', r.m);
  chk('3 · tramos: <3 → 0-3; 3 y 5 → 3-6; 6 → 6-12; 12 y 23 → 12-24; 24 → +24; sin dato → sin fecha', JSON.stringify(r.tr)==='[0,0,1,2,3,3,4,5]', r.tr);
  /* a1 32 meses (+24) · a2 1 mes (0-3) · a3 6 meses (6-12) · a4 3 meses (3-6) · a5 compra posterior (s/f) · a6 sin fecha · a7 3 meses (3-6) · a8 12 meses (12-24) */
  chk('3 · las 8 ATC por tramo: 0-3 1 · 3-6 2 · 6-12 1 · 12-24 1 · +24 1 · sin fecha 2', JSON.stringify(r.tot)==='[1,2,1,1,1,2]', r.tot);
  chk('3 · 6 con fecha, 3 en los primeros 6 meses; la mitad antes de los 4,5 meses', r.con===6 && r.temprano===3 && r.med===4.5, [r.con, r.temprano, r.med]);
  chk('3 · por línea (marca + línea): TITANIO 0-3 1, 6-12 1, 12-24 1, +24 1 · la almohada en su línea', r.lin['💚 TITANIO']==='1,0,1,1,1,0' && r.lin['💚 ALMOHADA']==='0,1,0,0,0,0', r.lin);
  chk('3 · por motivo: Hundimiento +24 1, 0-3 1, 12-24 1, sin fecha 1', r.mot['Hundimiento']==='1,0,0,1,1,1', r.mot);

  /* ---- 2. el aviso del formulario ---- */
  await page.evaluate(() => { showView('form'); resetForm(); segSet('f-doc-tipo','ATC'); setDocTipo(); }); await page.waitForTimeout(150);
  await page.fill('#f-celular', '70011111'); await page.waitForTimeout(150);
  r = await page.evaluate(() => { var b=document.getElementById('atc-otra'); return { vis:!!(b && !b.hidden), txt:b ? b.innerText.replace(/\s+/g,' ') : '' }; });
  chk('2 · al escribir el celular de una ATC nueva: «Este cliente ya tuvo 3 ATC» con la más nueva primero', r.vis && /Este cliente ya tuvo 3 ATC/.test(r.txt) && r.txt.indexOf('ATC 11-002')<r.txt.indexOf('ATC 11-001'), r.txt);
  chk('2 · …con cuándo entró, el motivo, el producto, el estado y qué se hizo', /entró el 05\/09\/2026|entró el 5\/09\/2026|entró el/.test(r.txt) && /Motivo: Hundimiento/.test(r.txt) && /Producto: COLCHON TITANIO ICE/.test(r.txt) && /Qué se hizo: se retapizó/.test(r.txt) && /Entregada/.test(r.txt), r.txt);
  chk('2 · …y dice que no frena', /No frena/.test(r.txt), r.txt);
  await page.fill('#f-celular', '79999999'); await page.waitForTimeout(120);
  r = await page.evaluate(() => !document.getElementById('atc-otra').hidden);
  chk('2 · con un celular sin ATC, el aviso se va', r===false, r);
  await page.fill('#f-celular', '70011111'); await page.evaluate(() => { segSet('f-doc-tipo','OC'); setDocTipo(); }); await page.waitForTimeout(150);
  r = await page.evaluate(() => !document.getElementById('atc-otra').hidden);
  chk('2 · en una venta (OC) no se muestra', r===false, r);
  await page.evaluate(() => { resetForm(); editPedido('a2'); }); await page.waitForTimeout(300);
  r = await page.evaluate(() => { var b=document.getElementById('atc-otra'); return { vis:!b.hidden, txt:b.innerText.replace(/\s+/g,' ') }; });
  chk('2 · al editar la 2ª: muestra las OTRAS dos, nunca a sí misma', r.vis && /ya tuvo 2 ATC/.test(r.txt) && r.txt.indexOf('ATC 11-001')<0 && /ATC 09-001/.test(r.txt) && /ATC 11-002/.test(r.txt), r.txt);
  r = await page.evaluate(() => { var f=atcFaltan(findById('a2')); return f.map(function(x){ return x.id; }); });
  chk('2 · no agrega nada a lo que falta para guardar (solo avisa)', r.indexOf('f-celular')<0 && r.indexOf('atc-otra')<0, r);
  await page.evaluate(() => { resetForm(); }); await page.waitForTimeout(120);
  r = await page.evaluate(() => document.getElementById('atc-otra').hidden);
  chk('2 · un formulario limpio no lo muestra', r===true, r);

  /* ---- 5. el informe PDF ---- */
  r = await page.evaluate(() => {
    var D=atciDatos('2026-11'), Dt=atciDatos('todas');
    return { rep:D.cal.rep.length, repT:Dt.cal.rep.length, edadN:D.cal.edad.n, tasa:D.cal.tasa.tot.atc+'/'+D.cal.tasa.tot.vend, tasaT:Dt.cal.tasa.tot.atc+'/'+Dt.cal.tasa.tot.vend,
      gar:atciDatos('2026-11','stc').cal.edad.n };
  });
  chk('5 · noviembre: 1 cliente con más de una ATC (contando la de septiembre) y 4 ATC en los meses', r.rep===1 && r.edadN===4, r);
  chk('5 · la tasa del informe es la misma ventana con el mes y con «todas»', r.tasa===r.tasaT, [r.tasa, r.tasaT]);
  chk('5 · con «solo contra costo» los meses son solo de esas (ninguna en noviembre)', r.gar===0, r.gar);
  await page.evaluate(() => { abrirInformeAtc(); document.getElementById('atci-alc').value='mes'; document.getElementById('atci-mes').value='2026-11'; document.getElementById('atci-tipo').value=''; atciPintar(); });
  await page.waitForTimeout(400);
  r = await page.evaluate(() => {
    var H=[].slice.call(document.querySelectorAll('#atci-hojas .ai-pag')), out=[];
    document.getElementById('atci-hojas').style.zoom='1';
    H.forEach(function(h){
      var t=(h.querySelector('h2')||{}).innerText||''; if(!/vendidos|meses de la compra/.test(t)) return;
      var pie=h.querySelector('.ai-pie').getBoundingClientRect().top, mx=0;
      h.querySelectorAll('.ai-cuerpo *').forEach(function(e){ var b=e.getBoundingClientRect(); if(b.height && b.bottom>mx) mx=b.bottom; });
      out.push({ t:t, txt:h.innerText.replace(/\s+/g,' '), pisa:mx>pie-2 });
    });
    return out;
  });
  const hT=r.find(h=>/vendidos/.test(h.t)), hM=r.find(h=>/meses de la compra/.test(h.t));
  chk('5 · la hoja «¿Cuántas ATC cada 100 vendidos?» con la tabla y TITANIO 12 %', !!hT && /TITANIO 3 25 12 %/.test(hT.txt) && /Raya roja = 8 %/i.test(hT.txt), hT && hT.txt.slice(0,400));
  chk('5 · …y «1 cliente con más de una ATC», contando las de antes (con el nombre de su ATC más nueva)', !!hT && /1 cliente con más de una ATC/.test(hT.txt) && /contando las de antes/.test(hT.txt) && /ROSA P\. · 3 ATC/.test(hT.txt), hT && hT.txt);
  chk('5 · la hoja «¿A cuántos meses de la compra falla?» con los tramos, por motivo y por línea', !!hM && /0 a 3 meses/.test(hM.txt) && /Sin fecha de compra/.test(hM.txt) && /Por motivo/.test(hM.txt) && /Por línea/.test(hM.txt), hM && hM.txt.slice(0,300));
  chk('5 · nada pisa el pie de las hojas nuevas', r.length===2 && r.every(h=>!h.pisa), r.map(h=>[h.t, h.pisa]));
  r = await page.evaluate(() => {
    var mal=[];
    [].forEach.call(document.styleSheets, function(s){ var rs; try{ rs=s.cssRules; }catch(e){ return; }
      [].forEach.call(rs||[], function(x){ if(x.selectorText && /\.ai-q/.test(x.selectorText) && /color-mix|oklch|box-shadow/.test(x.cssText)) mal.push(x.selectorText); }); });
    return mal;
  });
  chk('5 · el CSS de las hojas nuevas sin color-mix, oklch ni box-shadow (html2canvas)', r.length===0, r);
  await page.evaluate(() => atciCerrar());

  /* ---- tarjetas (pantalla angosta) ---- */
  const p2 = await ctx.newPage(); p2.on('pageerror', e => errores.push(e.message));
  await p2.setViewportSize({ width:820, height:1100 });
  await p2.clock.setFixedTime(new Date('2026-11-13T11:00:00-04:00'));
  await p2.goto(ARCH, { waitUntil:'load' }); await p2.waitForTimeout(900);
  await p2.evaluate(PREPARAR);
  await p2.evaluate(() => { showView('atc'); segSet('atc-mode','todo'); renderAtc(); }); await p2.waitForTimeout(300);
  r = await p2.evaluate(() => [].map.call(document.querySelectorAll('#atv-cards .atv-c'), function(c){ return c.innerText.replace(/\s+/g,' '); }));
  chk('2 · en tarjetas (iPad parado) también el chip de la 2ª y la 3ª', r.some(t=>/ATC 11-001/.test(t) && /🔁 2ª ATC/.test(t)) && r.some(t=>/ATC 11-002/.test(t) && /🔁 3ª ATC/.test(t)) && !r.some(t=>/ATC 09-001/.test(t) && /ª ATC/.test(t)), r.filter(t=>/ATC (09-001|11-00[12])/.test(t)));
  r = await p2.evaluate(() => { var g=document.querySelector('#atc-calidad .atq-grid'), w=document.documentElement.clientWidth, b=g ? g.getBoundingClientRect() : null;
    var cajas=[].map.call(document.querySelectorAll('#atc-calidad .atq-caja'), function(c){ return Math.round(c.getBoundingClientRect().right); });
    return { ancho:b ? Math.round(b.width) : 0, w:w, der:b ? Math.round(b.right) : 0, cajas:cajas }; });
  chk('4 · a 820 px los bloques entran en la pantalla', r.ancho>0 && r.der<=r.w+1 && r.cajas.every(x=>x<=r.w+1), r);

  chk('sin errores de la página', errores.length===0, errores);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
