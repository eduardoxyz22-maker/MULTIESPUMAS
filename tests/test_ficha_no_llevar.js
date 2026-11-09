/* ✂️ (09/11, dueño, con la ficha de un pedido real: «el bot marca LOS 2 COLCHONES ENTREGADOS si la nota dice claramente 1 y INDICA LA
   MEDIDA») La ficha de logística lee en la nota lo que ya se entregó en tienda y no se lleva (`fichaNoLlevar` dentro de `fichaNota`):
   por renglón y viñeta, con el encabezado «ENTREGADOS EN TIENDA:», la medida (plazas o cm), la cantidad y la familia sola («LAS 4
   ALMOHADAS»). Lo que no se sabe cuál es va a «⛔» (`noLlevarDuda`), sin tachar nada. Clientes y celulares inventados.
   Se corre:  node tests/test_ficha_no_llevar.js */
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
  await page.clock.setFixedTime(new Date('2026-11-09T11:10:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');
  const r = await page.evaluate(async()=>{
    var ICE200={ cant:1, desc:'COLCHON TITANIO ICE', medida:'200x200', codigo:'ch1222' }, ICE160={ cant:1, desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201' };
    var ALM2={ cant:2, desc:'ALMOHADA', medida:'50x70', codigo:'CD1403' };
    var C=function(prods, obs){ var p={ id:'x', fecha:'2026-11-10', turno:'PM', productos:JSON.parse(JSON.stringify(prods)), observaciones:obs }; var N=fichaNota(p); return { no:N.noLlevar, duda:N.noLlevarDuda||[], contras:fichaContras(p, N) }; };
    var CASO=[ICE200, ALM2, ICE160, ALM2];
    var NOTA='RECOGER COLCHON  DE 3.5 PLZ ICE DE TIENDA BUENOS AIRES (LLEVAR BOLSA) Y CUANDO ENTREGUEN  RECOGER EL COLCHON ICE DE 3 PLZ QUE TIENE LA CLIENTE Y DEJARLO EN LA CENTRAL PARA EXHIBICION.\nENTREGADOS EN TIENDA:\n* LAS 4 ALMOHADAS YA SE ENTREGARON EN TIENDA\n* 1 COLCHON TITANIO ICE DE 2.5 PLZ';
    var out={};
    out.real=C(CASO, NOTA);
    out.unaLinea=C(CASO, NOTA.replace(/\n/g,' '));
    out.coma=C(CASO, 'ENTREGADOS EN TIENDA:\n* las 4 almohadas ya se entregaron en tienda\n* 1 colchón titanio ice de 2,5 plazas');
    out.cm=C(CASO, 'Entregado en tienda: 4 almohadas y 1 colchon titanio ice 160x190');
    out.mediaPlaza=C(CASO, 'YA SE ENTREGO EN TIENDA 1 COLCHON TITANIO ICE 2 1/2 PLAZAS');
    out.sinMedida=C(CASO, '1 COLCHON TITANIO ICE YA SE ENTREGO EN TIENDA');
    out.llevar=C(CASO, 'LAS ALMOHADAS YA SE ENTREGARON EN TIENDA, LLEVAR EL COLCHON TITANIO ICE');
    out.noLlevar=C(CASO, 'NO LLEVAR LAS ALMOHADAS');
    out.soloRecoger=C(CASO, 'RECOGER COLCHON DE 3.5 PLZ ICE DE TIENDA BUENOS AIRES (LLEVAR BOLSA)');
    out.justo=C([{ cant:1, desc:'ALMOHADA', medida:'50x70', codigo:'CD1403' }, ALM2], '1 ALMOHADA YA SE ENTREGO EN TIENDA');
    out.nasa=C([{ cant:1, desc:'TITANIO ICE', medida:'160x190', codigo:'CH1201' }, { cant:2, desc:'ALMOHADA FIBRA SILICONADA', medida:'50x70', codigo:'CD1403' }, { cant:1, desc:'ALMOHADA NASA', medida:'', codigo:'CH1195' }, { cant:1, desc:'PROTECTOR DE COLCHON', medida:'160x190', codigo:'' }],
      'LAS ALM NASA YA SE ENTREGARON EN TIENDA, SOLO LLEVAR LAS 2 ALM DE FIBRA');
    out.protector=C([ICE160, { cant:1, desc:'PROTECTOR DE COLCHON', medida:'160x190', codigo:'' }], 'EL COLCHON YA SE ENTREGO EN TIENDA');
    // 🪤 las trampas de las notas reales (09/11, comparando contra las 1.078 notas de la planilla)
    var ORO={ cant:1, desc:'ORO ANATOMICO VISCOLASTICO', medida:'200x200', codigo:'' }, ALMC={ cant:2, desc:'ALMOHADA', medida:'50x70', codigo:'CD1403' }, NASA2={ cant:2, desc:'ALM/NASA', medida:'50x70', codigo:'' };
    out.protDe=C([ORO, ALMC, { cant:1, desc:'PROTECTOR IMPER. GELATTO', medida:'200x200', codigo:'' }], 'YA SE ENTREGO LAS ALMOHADAS Y EL PROTECTOR DE COLCHON EN TIENDA CENTRAL');
    out.otraAlm=C([ORO, { cant:1, desc:'SOMIER BIRELAX', medida:'200x200', codigo:'' }, ALMC], 'COMPRO 4 ALM NASA + 1PROTECTOR DE COLCHON = YA SE ENTREGO EN TIENDA ESOS PRODUCTOS');
    out.recibir=C([ORO, NASA2], 'POR FAVOR LLAMAR AL CLIENTE UNA HORA ANTES PARA QUE EL SE SALGA DE SU TRABAJO A RECIBIR SU COLCHON ( NO LLEVAR LAS ALMOHADAS YA LAS LLEVO DE LA TIENDA BUENOS AIRES)');
    out.saleTienda=C([{ cant:1, desc:'COLCHON CARIOCA PREMIER', medida:'160x190', codigo:'' }, { cant:1, desc:'COLCHON CONFORT PLUS', medida:'140x190', codigo:'' }], 'ENTREGA ANTES DEL MEDIO DIA - *PRODUCTO YA FACTURADO EN TIENDA*\n*colchon CARIOCA PREMIER 2.5PL SALE DE TIENDA CARMELO*');
    out.saleTiendaPor=(function(){ var N=fichaNota({ observaciones:'*colchon CARIOCA PREMIER 2.5PL SALE DE TIENDA CARMELO*', productos:[{ cant:1, desc:'COLCHON CARIOCA PREMIER', medida:'160x190', codigo:'' }] }); return N.noLlevarPor; })();
    out.parcial=C([{ cant:2, desc:'JUEGO DE SABANA CASA IN 3,0 PLAZA', medida:'180x190', codigo:'' }, { cant:1, desc:'EDREDON COLOR BEIG', medida:'200x200', codigo:'' }], '1 EDREDON Y 1 JUEGO DE SABANAS SE ENTREGO EN TIENDA CENTRAL');
    // la ficha del caso real
    var L=[ _lin('ch1222|COLCHON TITANIO ICE|200x200',1,{}), _lin('CD1403|ALMOHADA|50x70',2,{chk:'ok', chkDe:'Almacen Distribucion Banzer'}), _lin('CH1201|COLCHON TITANIO ICE|160x190',1,{}), _lin('CD1403|ALMOHADA|50x70',2,{chk:'ok', chkDe:'Almacen Distribucion Banzer'}) ];
    var p=_ped('f1','2026-11-10','PM',L,{ cliente:'CLIENTE PRUEBA', celular:'70000077', observaciones:NOTA });
    await _cargar([p], _stock(function(){}));
    showPedidoModal('f1');
    var box=document.getElementById('modal-box'), t=function(sel){ var e=box.querySelector(sel); return e?e.textContent.replace(/\s+/g,' '):''; };
    out.tachados=[].map.call(box.querySelectorAll('.fl-prod-no'), function(e){ return e.textContent.replace(/\s+/g,' '); });
    out.bultos=t('.fl-bultos'); out.qh=t('.fl-qh');
    out.medVivas=[].map.call(box.querySelectorAll('.fl-prod:not(.fl-prod-no) .fl-med'), function(e){ return e.textContent; });
    return out;
  });
  chk('1 · el caso real: las 4 almohadas (los dos renglones) y SOLO el colchón de 2.5 plazas (160x190) no se llevan', JSON.stringify(r.real.no)==='[1,2,3]' && !r.real.duda.length, r.real);
  chk('2 · igual con la nota en una sola línea (sin renglones, con las viñetas «*»)', JSON.stringify(r.unaLinea.no)==='[1,2,3]', r.unaLinea);
  chk('3 · en minúscula, con tilde y «2,5 plazas»', JSON.stringify(r.coma.no)==='[1,2,3]', r.coma);
  chk('4 · «Entregado en tienda: 4 almohadas y 1 colchon titanio ice 160x190» (en cm, en la misma línea)', JSON.stringify(r.cm.no)==='[1,2,3]', r.cm);
  chk('5 · «2 1/2 plazas» es el 160x190', JSON.stringify(r.mediaPlaza.no)==='[2]', r.mediaPlaza);
  chk('6 · «1 colchón» sin medida y hay 2 iguales: no tacha ninguno y lo avisa en «⛔»', r.sinMedida.no.length===0 && r.sinMedida.duda.length===1 && r.sinMedida.contras.some(x=>/fijate cuál no se lleva/.test(x) && /200×200/.test(x) && /160×190/.test(x)), r.sinMedida);
  chk('7 · «las almohadas ya se entregaron, LLEVAR el colchón»: solo las almohadas', JSON.stringify(r.llevar.no)==='[1,3]', r.llevar);
  chk('8 · «NO LLEVAR LAS ALMOHADAS»', JSON.stringify(r.noLlevar.no)==='[1,3]', r.noLlevar);
  chk('9 · «recoger … de tienda» no es «ya se entregó»', r.soloRecoger.no.length===0 && !r.soloRecoger.duda.length, r.soloRecoger);
  chk('10 · «1 almohada» con un renglón de 1 y otro de 2: tacha el de 1', JSON.stringify(r.justo.no)==='[0]', r.justo);
  chk('11 · lo de antes sigue: «las ALM NASA ya se entregaron…, solo llevar las 2 de FIBRA» tacha solo la NASA', JSON.stringify(r.nasa.no)==='[2]', r.nasa);
  chk('12 · «el colchón ya se entregó» no tacha el PROTECTOR de colchón', JSON.stringify(r.protector.no)==='[0]', r.protector);
  chk('15 · «el PROTECTOR DE COLCHON» no es el colchón: solo almohadas y protector', JSON.stringify(r.protDe.no)==='[1,2]', r.protDe);
  chk('16 · «4 ALM NASA» habla de OTRA almohada: la común del pedido se lleva', r.otraAlm.no.length===0, r.otraAlm);
  chk('17 · «…a recibir su colchón (NO LLEVAR LAS ALMOHADAS…)»: solo las almohadas', JSON.stringify(r.recibir.no)==='[1]', r.recibir);
  chk('18 · «colchon CARIOCA PREMIER 2.5PL SALE DE TIENDA» tacha ese y dice «sale de tienda»', JSON.stringify(r.saleTienda.no)==='[0]' && r.saleTiendaPor[0]==='sale de tienda', { n:r.saleTienda, p:r.saleTiendaPor });
  chk('19 · «1 juego de sábanas» de 2: no tacha el renglón, avisa «se carga solo 1»; el edredón sí', JSON.stringify(r.parcial.no)==='[1]' && r.parcial.contras.some(x=>/1 de los 2/.test(x) && /se carga solo 1/.test(x)), r.parcial);
  chk('13 · la ficha: tachados las 4 almohadas y el colchón 160×190; queda el 200×200', r.tachados.length===3 && r.tachados.every(x=>/No se lleva/.test(x)) && r.medVivas.join(',').indexOf('200×200')>=0 && r.medVivas.join(',').indexOf('160×190')<0, { t:r.tachados, v:r.medVivas });
  chk('14 · la ficha cuenta 1 bulto (el colchón 200×200)', /1 bulto\b/.test(r.bultos) && /1 colchón/.test(r.bultos), r.bultos);
  chk('sin errores en la página', errs.length===0, errs);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
