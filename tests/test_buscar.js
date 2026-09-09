/* 🎯 QUIÉN VENDIÓ QUÉ: por producto, por vendedor y entre dos fechas (§4db → §4df).

   Nació como «los pedidos de un cliente» (§4db). El dueño lo dio vuelta el 09/09: *"a mí no
   me interesa buscar por cliente, quiero poner el producto y que vendedores vendieron ese
   producto o esos productos; en vez de cliente que se elija vendedor."*

   ⚠️ LO QUE ESTE TEST CUIDA, por orden de importancia:
   1. Que la RESPUESTA sea quién vendió cuánto: el cuadro por vendedor, con pedidos, unidades,
      plata y qué productos, el que más vendió primero — y que cada vendedor sume lo suyo.
   2. Que NO se cuele lo que no pidió: otro vendedor (si se eligió uno), otro producto, otra
      fecha. Y que no se PIERDA lo que sí pidió por cómo esté escrito: «bahía» con acento, la
      medida pegada al nombre, el vendedor en minúsculas.
   3. Que los borradores de Kommo queden afuera (no son ventas) y las ATC entren marcadas.
   4. Que las cuentas cierren: unidades, plata, y aviso si algún renglón no tiene precio.
   5. Que sin producto ni vendedor NO devuelva el panel entero.

   Los datos son inventados; los nombres de producto son los reales del catálogo.

   Se corre:  node tests/test_buscar.js   (desde la raíz del repo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1400,height:1000} });
  const errores=[]; page.on('pageerror',e=>errores.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  const faltan = await page.evaluate(() => ['abrirBuscar','busLlenarVendedores','buscarData','renderBuscar','copiarBusca','printBusca']
    .filter(f => typeof window[f] !== 'function'));
  if(faltan.length){
    chk('el panel dice quién vendió qué (§4df)', false, 'faltan: '+faltan.join(', '));
    console.log('\n'+PASS+' bien · '+FAIL+' mal'); await browser.close(); process.exit(1);
  }

  await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    document.getElementById('admin-lock').style.display='none';
    document.getElementById('admin-content').style.display='block';
    apiSave=function(r){ return Promise.resolve({ok:true,pedido:r}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:[]}); };
    var P=function(o){ return Object.assign({id:'p'+Math.random().toString(36).slice(2),fecha:'2026-08-15',oc:'190000',
      vendedor:'Carola Chavez',cliente:'JUAN PABLO PAREDES',celular:'70000000',turno:'AM',zona:'Norte',direccion:'x',
      maps:'',pagado:true,saldo:0,ts:Date.now(),metodoPago:'',observaciones:'',estado:'',entregado:true,vehiculo:'',
      chofer:'',garantia:'',nota:'',acuenta:0,facturarA:'',nit:'',nroDia:1,verificado:true,fotos:[]},o); };
    var pr=function(d,m,n,p){ return [{desc:d,medida:m,codigo:'',cant:n,precio:p}]; };
    STATE=[
      // ── Carola: DENTRO de lo pedido ──
      P({id:'a1', fecha:'2026-08-01', oc:'190001', productos:pr('COLCHON CARIOCA PREMIER','140x190',2,1500)}),
      P({id:'a2', fecha:'2026-08-20', oc:'190002', cliente:'Otro Cliente', productos:pr('SOMIER CARIOCA BAHIA','160x190',1,900)}),
      P({id:'a3', fecha:'2026-09-06', oc:'190003', vendedor:'carola chávez',                // minúsculas y acento: la misma
                  productos:pr('COLCHON SUEÑA PREMIER DELUXE','160x190',3,2000)}),
      P({id:'a4', fecha:'2026-08-28', oc:'190004', entregado:false, pagado:false, saldo:500,
                  productos:pr('COLCHON CARIOCA PREMIER 2 PLAZAS 140X190CM','',1,1500)}),  // medida adentro del nombre
      P({id:'a5', fecha:'2026-08-10', oc:'ATC 08-011', productos:pr('CARIOCA PREMIER','180x190',1,0)}),  // ATC y sin precio
      // ── Otros vendedores que TAMBIÉN vendieron eso: tienen que aparecer con «Todos» ──
      P({id:'m1', fecha:'2026-08-15', oc:'190012', vendedor:'mirian salazar',              // en minúsculas
                  productos:pr('COLCHON CARIOCA PREMIER','140x190',9,1500)}),
      P({id:'e1', fecha:'2026-09-03', oc:'190020', vendedor:'Eduardo Añez',                // no está en la lista fija
                  productos:pr('COLCHON SUEÑA PREMIER DELUXE','160x190',2,2000)}),
      // ── FUERA: cada uno por un motivo distinto ──
      P({id:'x1', fecha:'2026-07-31', oc:'190010', productos:pr('COLCHON CARIOCA PREMIER','140x190',9,1500)}),   // un día antes
      P({id:'x2', fecha:'2026-09-07', oc:'190011', productos:pr('COLCHON CARIOCA PREMIER','140x190',9,1500)}),   // un día después
      P({id:'x4', fecha:'2026-08-15', oc:'190013', productos:pr('COLCHON CARIOCA RIO','105x190',9,1200)}),        // CARIOCA, pero RIO
      P({id:'x5', fecha:'2026-08-15', oc:'190014', productos:pr('TITANIO LATEX','140x190',9,1800)}),              // otro producto
      P({id:'kommo-5', fecha:'2026-08-15', estado:'Borrador Kommo', turno:'',                                     // borrador
                  productos:pr('COLCHON CARIOCA PREMIER','140x190',9,1500)})
    ];
    // Un pedido con DOS renglones: solo tiene que salir el que coincide
    STATE.push(P({id:'a6', fecha:'2026-08-22', oc:'190005', productos:[
      {desc:'COLCHON CARIOCA PREMIER',medida:'200x200',codigo:'CH1720',cant:1,precio:2500},
      {desc:'ALMOHADA',medida:'50x70',codigo:'',cant:4,precio:80} ]}));
    saveMirror(); updateStats();
  });

  const buscar = (vend,prod,desde,hasta) => page.evaluate(a => {
    abrirBuscar();
    document.getElementById('bus-vend').value=a.vend;
    document.getElementById('bus-prod').value=a.prod;
    document.getElementById('bus-desde').value=a.desde;
    document.getElementById('bus-hasta').value=a.hasta;
    renderBuscar();
    var d=BUSCA;
    return { ids:d.filas.map(function(r){ return r.p.id; }), prods:d.filas.map(function(r){ return r.x.desc; }),
             fechas:d.filas.map(function(r){ return r.f; }), vends:d.filas.map(function(r){ return r.vend; }),
             uni:d.uni, plata:d.plata, nPed:d.nPed, sinPrecio:d.sinPrecio, pedir:!!d.pedir,
             porVend:(d.porVend||[]).map(function(g){ return { v:g.vend, uni:g.uni, plata:g.plata, nPed:g.nPed, sinPrecio:g.sinPrecio,
                                                                lista:g.lista.map(function(q){ return q.nom+' × '+q.uni; }) }; }),
             opciones:Array.prototype.map.call(document.getElementById('bus-vend').options, function(o){ return o.value; }),
             texto:((document.getElementById('busca-body')||{}).textContent||'').replace(/\s+/g,' '),
             info:((document.getElementById('busca-info')||{}).textContent||'') };
  }, {vend:vend,prod:prod,desde:desde,hasta:hasta});

  // ══ 1. La pregunta del dueño: ¿quién vendió estos productos entre estas fechas? ═══════
  console.log('\n── 1. «carioca premier, carioca bahía, premier deluxe · 1/8 al 6/9 · Todos» ──');
  let r = await buscar('','carioca premier, carioca bahía, premier deluxe','2026-08-01','2026-09-06');
  chk('⚠️ trae los 8 renglones de los 3 vendedores, y ninguno más',
      r.ids.length===8 && ['a1','a2','a3','a4','a5','a6','m1','e1'].every(i=>r.ids.indexOf(i)>=0), r.ids.join(','));
  chk('…de 8 pedidos distintos, de 3 vendedores', r.nPed===8 && r.porVend.length===3, r.nPed+' · '+r.porVend.length);
  chk('⚠️ EL CUADRO: cada vendedor con lo suyo — Carola 9 u / Bs 13.900 en 6 pedidos, Mirian 9 u / Bs 13.500, Eduardo 2 u / Bs 4.000',
      JSON.stringify(r.porVend.map(g=>[g.v,g.uni,g.plata,g.nPed]))===JSON.stringify([['Carola Chavez',9,13900,6],['Mirian Salazar',9,13500,1],['Eduardo Añez',2,4000,1]]),
      JSON.stringify(r.porVend.map(g=>[g.v,g.uni,g.plata,g.nPed])));
  chk('⚠️ el que más vendió va primero (empate en unidades: desempata la plata)', r.porVend[0].v==='Carola Chavez' && r.porVend[1].v==='Mirian Salazar');
  chk('⚠️ «mirian salazar» en minúsculas sale con el nombre de la lista', r.porVend.some(g=>g.v==='Mirian Salazar') && !r.porVend.some(g=>g.v==='mirian salazar'));
  chk('⚠️ «carola chávez» con acento se suma a Carola Chavez, no es otra vendedora', r.porVend.filter(g=>/carola/i.test(g.v)).length===1 && r.porVend[0].uni===9);
  chk('…y dice QUÉ vendió cada uno, con unidades', r.porVend[0].lista.indexOf('COLCHON CARIOCA PREMIER 140x190 × 2')>=0 &&
      r.porVend[0].lista.indexOf('COLCHON SUEÑA PREMIER DELUXE 160x190 × 3')>=0, r.porVend[0].lista.join(' | '));
  chk('la tabla del detalle va agrupada por vendedor, en el orden del cuadro',
      JSON.stringify(r.vends)===JSON.stringify(['Carola Chavez','Carola Chavez','Carola Chavez','Carola Chavez','Carola Chavez','Carola Chavez','Mirian Salazar','Eduardo Añez']), r.vends.join(','));
  chk('⚠️ «bahía» con acento encuentra «BAHIA» sin acento', r.prods.some(s=>/BAHIA/.test(s)), r.prods.join(' | '));
  chk('⚠️ la medida pegada al nombre no molesta («…2 PLAZAS 140X190CM»)', r.ids.indexOf('a4')>=0);
  chk('el desplegable tiene a Eduardo (salió de los pedidos) y a Carola (de la lista fija), y a Mirian UNA sola vez',
      r.opciones.indexOf('Eduardo Añez')>=0 && r.opciones.indexOf('Carola Chavez')>=0 && r.opciones.filter(o=>/mirian/i.test(o)).length===1,
      r.opciones.join(','));

  // ══ 2. Lo que NO tiene que entrar ═════════════════════════════════════════
  console.log('\n── 2. Lo que queda afuera, y por qué ──');
  chk('⚠️ el del 31/07 queda afuera: es un día antes', r.ids.indexOf('x1')<0);
  chk('⚠️ el del 07/09 también: es un día después', r.ids.indexOf('x2')<0);
  chk('⚠️ el CARIOCA RIO no es el CARIOCA PREMIER', r.ids.indexOf('x4')<0 && !/CARIOCA RIO/.test(r.texto));
  chk('un producto que no pidió (TITANIO LATEX) no aparece', r.ids.indexOf('x5')<0 && !/TITANIO/.test(r.texto));
  chk('⚠️ un borrador de Kommo no es una venta: no entra', r.ids.indexOf('kommo-5')<0);
  chk('⚠️ del pedido con dos renglones sale SOLO el que coincide, no la almohada',
      r.prods.filter(s=>/ALMOHADA/.test(s)).length===0 && r.ids.filter(i=>i==='a6').length===1, r.prods.join(' | '));

  // ══ 3. Eligiendo un vendedor ══════════════════════════════════════════════
  console.log('\n── 3. Solo Carola ──');
  r = await buscar('Carola Chavez','carioca premier, carioca bahía, premier deluxe','2026-08-01','2026-09-06');
  chk('⚠️ con Carola elegida salen sus 6 renglones y no los de Mirian ni Eduardo',
      r.ids.length===6 && r.ids.indexOf('m1')<0 && r.ids.indexOf('e1')<0, r.ids.join(','));
  chk('…incluido el «carola chávez» con acento y minúsculas', r.ids.indexOf('a3')>=0);
  chk('salen ordenados por fecha', JSON.stringify(r.fechas)===JSON.stringify(r.fechas.slice().sort()), r.fechas.join(' '));
  /* 2×1500 + 1×900 + 3×2000 + 1×1500 + 1×0 + 1×2500 = 3000+900+6000+1500+0+2500 = 13.900 */
  chk('⚠️ suma 9 unidades y Bs 13.900', r.uni===9 && Math.abs(r.plata-13900)<0.01, r.uni+' u · '+r.plata);
  chk('⚠️ y avisa que 1 unidad no tiene precio cargado (la ATC)', r.sinPrecio===1 && /sin precio cargado/.test(r.texto), r.sinPrecio);
  chk('el encabezado dice productos, vendedor y período', /Vendedor: Carola Chavez/.test(r.texto) &&
      /Período: del 01\/08\/2026 al 06\/09\/2026/.test(r.texto), (r.texto.match(/Período:[^E]*/)||[''])[0].slice(0,60));
  /* ⚠️ El encabezado es lo que se IMPRIME: ahí no puede decir «6 renglónes». */
  chk('…y el plural del encabezado impreso está bien escrito',
      /6 renglones en 6 pedidos/.test(r.texto) && !/renglónes/.test(r.texto),
      (r.texto.match(/\d+ rengl[^·]*/)||[''])[0].slice(0,40));
  chk('la ATC se ve marcada como tal', /ATC 08-011/.test(r.texto), (r.texto.match(/ATC[^ ]* ?[^ ]*/)||[''])[0]);
  chk('el pendiente se ve como pendiente y con su saldo', /pendiente/.test(r.texto) && /saldo/.test(r.texto));
  chk('el cliente sigue a la vista, chiquito, bajo la nota', /JUAN PABLO PAREDES/.test(r.texto) && /Otro Cliente/.test(r.texto));
  chk('el resumen de arriba cuenta renglones, pedidos y vendedores', /6 renglones · 6 pedidos · 1 vendedor$/.test(r.info), r.info);

  // ══ 4. Con un solo dato ═══════════════════════════════════════════════════
  console.log('\n── 4. Con un solo dato ──');
  r = await buscar('Carola Chavez','','2026-08-01','2026-09-06');
  /* Son 9 y no 7: x4 (CARIOCA RIO) y x5 (TITANIO LATEX) también los vendió Carola — quedaban
     afuera por el PRODUCTO, no por el vendedor. Sin filtro de producto tienen que entrar. */
  chk('solo vendedor: trae TODO lo que vendió en el período, también lo que no se pidió por producto',
      r.ids.length===9 && r.prods.some(s=>/ALMOHADA/.test(s)) && r.ids.indexOf('x4')>=0 && r.ids.indexOf('x5')>=0,
      r.ids.length+' renglones: '+r.ids.join(','));
  chk('…y el cuadro dice qué vendió, producto por producto', r.porVend.length===1 && r.porVend[0].lista.length>=6, r.porVend[0].lista.join(' | '));
  r = await buscar('','','','');
  chk('⚠️ sin producto ni vendedor NO devuelve el panel entero: pide un dato',
      r.pedir===true && r.ids.length===0 && /Escribí un/.test(r.texto), r.texto.slice(0,60));
  r = await buscar('Isabel Robledo','carioca premier','2026-08-01','2026-09-06');
  chk('una vendedora que no vendió eso: lo dice, sin inventar renglones', r.ids.length===0 && /Nadie vendió eso/.test(r.texto), r.texto.slice(0,60));

  // ══ 5. El PDF y el texto para mandar ══════════════════════════════════════
  console.log('\n── 5. Imprimir y copiar ──');
  r = await buscar('','carioca premier, carioca bahía, premier deluxe','2026-08-01','2026-09-06');
  const impr = await page.evaluate(() => {
    printBusca();
    var tiene=document.body.classList.contains('printing-busca');
    document.body.classList.remove('printing-busca');
    return tiene;
  });
  chk('🖨 Imprimir prepara la hoja (de ahí sale «Guardar como PDF»)', impr===true);
  const txt = await page.evaluate(() => { var t=''; var o=window.copyText; window.copyText=function(s){t=s;}; copiarBusca(); window.copyText=o; return t; });
  chk('📋 Copiar arma el texto con el cuadro por vendedor',
      /Vendedor: Todos/.test(txt) && /• Carola Chavez: 9 unidades en 6 pedidos  Bs 13\.900/.test(txt) && /• Mirian Salazar: 9 unidades en 1 pedido/.test(txt),
      txt.split('\n').filter(l=>/^•/.test(l)).join(' / '));
  chk('…con el total y cuántos vendedores', /TOTAL: 20 unidades  Bs 31\.400,00  ·  8 pedidos  ·  3 vendedores/.test(txt),
      txt.split('\n').filter(l=>/TOTAL/.test(l)).join(''));
  chk('…y una línea por renglón del detalle, con su fecha', (txt.match(/^\d{2}\/\d{2}\/\d{4}/gm)||[]).length===8,
      (txt.match(/^\d{2}\/\d{2}\/\d{4}[^\n]*/m)||[''])[0]);

  chk('la página no tiró ningún error de JavaScript', errores.length===0, errores.join(' | ').slice(0,300));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
