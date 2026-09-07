/* 🎯 BUSCAR PEDIDOS: por cliente, por producto y entre dos fechas (§4db).

   Pedido textual del dueño: *"Extrae del panel todos los pedidos de Juan Pablo Paredes que
   digan carioca premier, carioca bahía, premier deluxe, desde el primero de agosto al seis
   de septiembre, y después dale un PDF."* Es cerrar cuentas con un mayorista.

   ⚠️ LO QUE ESTE TEST CUIDA, por orden de importancia:
   1. Que NO se cuele lo que no pidió: otro cliente, otro producto, otra fecha. En una hoja
      que se le manda al cliente, un renglón de más es una discusión.
   2. Que no se PIERDA lo que sí pidió por cómo esté escrito: segundo apellido, acento en
      «bahía», mayúsculas, la medida pegada al nombre.
   3. Que los borradores de Kommo queden afuera (no son ventas) y las ATC entren marcadas.
   4. Que las cuentas cierren: unidades, plata, y aviso si algún renglón no tiene precio.
   5. Que sin cliente ni producto NO devuelva el panel entero.

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

  const faltan = await page.evaluate(() => ['abrirBuscar','buscarData','renderBuscar','copiarBusca','printBusca']
    .filter(f => typeof window[f] !== 'function'));
  if(faltan.length){
    chk('el panel busca pedidos por cliente, producto y fechas (§4db)', false, 'faltan: '+faltan.join(', '));
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
      // ── DENTRO de lo pedido ──
      P({id:'a1', fecha:'2026-08-01', oc:'190001', productos:pr('COLCHON CARIOCA PREMIER','140x190',2,1500)}),
      P({id:'a2', fecha:'2026-08-20', oc:'190002', cliente:'Juan Pablo Paredes Rojas',   // segundo apellido
                  productos:pr('SOMIER CARIOCA BAHIA','160x190',1,900)}),
      P({id:'a3', fecha:'2026-09-06', oc:'190003', cliente:'paredes juan pablo',         // orden cambiado y minúsculas
                  productos:pr('COLCHON SUEÑA PREMIER DELUXE','160x190',3,2000)}),
      P({id:'a4', fecha:'2026-08-28', oc:'190004', entregado:false, pagado:false, saldo:500,
                  productos:pr('COLCHON CARIOCA PREMIER 2 PLAZAS 140X190CM','',1,1500)}),  // medida adentro del nombre
      P({id:'a5', fecha:'2026-08-10', oc:'ATC 08-011', productos:pr('CARIOCA PREMIER','180x190',1,0)}),  // ATC y sin precio
      // ── FUERA: cada uno por un motivo distinto ──
      P({id:'x1', fecha:'2026-07-31', oc:'190010', productos:pr('COLCHON CARIOCA PREMIER','140x190',9,1500)}),   // un día antes
      P({id:'x2', fecha:'2026-09-07', oc:'190011', productos:pr('COLCHON CARIOCA PREMIER','140x190',9,1500)}),   // un día después
      P({id:'x3', fecha:'2026-08-15', oc:'190012', cliente:'JUAN PABLO ROJAS',                                    // otro cliente
                  productos:pr('COLCHON CARIOCA PREMIER','140x190',9,1500)}),
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

  const buscar = (cli,prod,desde,hasta) => page.evaluate(a => {
    abrirBuscar();
    document.getElementById('bus-cli').value=a.cli;
    document.getElementById('bus-prod').value=a.prod;
    document.getElementById('bus-desde').value=a.desde;
    document.getElementById('bus-hasta').value=a.hasta;
    renderBuscar();
    var d=BUSCA;
    return { ids:d.filas.map(function(r){ return r.p.id; }), prods:d.filas.map(function(r){ return r.x.desc; }),
             fechas:d.filas.map(function(r){ return r.f; }), uni:d.uni, plata:d.plata, nPed:d.nPed,
             sinPrecio:d.sinPrecio, pedir:!!d.pedir,
             texto:((document.getElementById('busca-body')||{}).textContent||'').replace(/\s+/g,' '),
             info:((document.getElementById('busca-info')||{}).textContent||'') };
  }, {cli:cli,prod:prod,desde:desde,hasta:hasta});

  // ══ 1. La búsqueda que pidió el dueño, tal cual ═══════════════════════════
  console.log('\n── 1. «Juan Pablo Paredes · carioca premier, carioca bahía, premier deluxe · 1/8 al 6/9» ──');
  let r = await buscar('Juan Pablo Paredes','carioca premier, carioca bahía, premier deluxe','2026-08-01','2026-09-06');
  chk('⚠️ trae los 6 renglones que corresponden, y ninguno más',
      r.ids.length===6 && ['a1','a2','a3','a4','a5','a6'].every(i=>r.ids.indexOf(i)>=0), r.ids.join(','));
  chk('…de 6 pedidos distintos', r.nPed===6, r.nPed);
  chk('⚠️ el segundo apellido no lo pierde («Juan Pablo Paredes Rojas»)', r.ids.indexOf('a2')>=0);
  chk('⚠️ el nombre al revés y en minúsculas tampoco («paredes juan pablo»)', r.ids.indexOf('a3')>=0);
  chk('⚠️ «bahía» con acento encuentra «BAHIA» sin acento', r.prods.some(s=>/BAHIA/.test(s)), r.prods.join(' | '));
  chk('⚠️ la medida pegada al nombre no molesta («…2 PLAZAS 140X190CM»)', r.ids.indexOf('a4')>=0);
  chk('salen ordenados por fecha', JSON.stringify(r.fechas)===JSON.stringify(r.fechas.slice().sort()), r.fechas.join(' '));

  // ══ 2. Lo que NO tiene que entrar ═════════════════════════════════════════
  console.log('\n── 2. Lo que queda afuera, y por qué ──');
  chk('⚠️ el del 31/07 queda afuera: es un día antes', r.ids.indexOf('x1')<0);
  chk('⚠️ el del 07/09 también: es un día después', r.ids.indexOf('x2')<0);
  chk('⚠️ «JUAN PABLO ROJAS» no es Paredes', r.ids.indexOf('x3')<0);
  chk('⚠️ el CARIOCA RIO no es el CARIOCA PREMIER', r.ids.indexOf('x4')<0 && !/CARIOCA RIO/.test(r.texto));
  chk('un producto que no pidió (TITANIO LATEX) no aparece', r.ids.indexOf('x5')<0 && !/TITANIO/.test(r.texto));
  chk('⚠️ un borrador de Kommo no es una venta: no entra', r.ids.indexOf('kommo-5')<0);
  chk('⚠️ del pedido con dos renglones sale SOLO el que coincide, no la almohada',
      r.prods.filter(s=>/ALMOHADA/.test(s)).length===0 && r.ids.filter(i=>i==='a6').length===1, r.prods.join(' | '));

  // ══ 3. Las cuentas ════════════════════════════════════════════════════════
  console.log('\n── 3. Que cierren las cuentas ──');
  /* 2×1500 + 1×900 + 3×2000 + 1×1500 + 1×0 + 1×2500 = 3000+900+6000+1500+0+2500 = 13.900 */
  chk('⚠️ suma 9 unidades y Bs 13.900', r.uni===9 && Math.abs(r.plata-13900)<0.01, r.uni+' u · '+r.plata);
  chk('⚠️ y avisa que 1 unidad no tiene precio cargado (la ATC)', r.sinPrecio===1 && /sin precio cargado/.test(r.texto), r.sinPrecio);
  chk('el encabezado dice cliente, productos y período', /Cliente: Juan Pablo Paredes/.test(r.texto) &&
      /Período: del 01\/08\/2026 al 06\/09\/2026/.test(r.texto), (r.texto.match(/Período:[^E]*/)||[''])[0].slice(0,60));
  /* ⚠️ El encabezado es lo que se IMPRIME y se le manda al cliente: ahí no puede decir
     «6 renglónes». El plural de «renglón» pierde el acento. */
  chk('…y el plural del encabezado impreso está bien escrito',
      /6 renglones en 6 pedidos/.test(r.texto) && !/renglónes/.test(r.texto),
      (r.texto.match(/\d+ rengl[^·]*/)||[''])[0].slice(0,40));
  chk('la ATC se ve marcada como tal', /ATC 08-011/.test(r.texto), (r.texto.match(/ATC[^ ]* ?[^ ]*/)||[''])[0]);
  chk('el pendiente se ve como pendiente y con su saldo', /pendiente/.test(r.texto) && /saldo/.test(r.texto));
  chk('el resumen de arriba cuenta renglones y pedidos (y el plural está bien escrito)',
      /6 renglones · 6 pedidos/.test(r.info) && !/renglónes/.test(r.info), r.info);

  // ══ 4. Buscar por cliente solo, o por producto solo ═══════════════════════
  console.log('\n── 4. Con un solo dato ──');
  r = await buscar('Juan Pablo Paredes','','2026-08-01','2026-09-06');
  /* Son 9 y no 7: x4 (CARIOCA RIO) y x5 (TITANIO LATEX) también son de Paredes — quedaban
     afuera por el PRODUCTO, no por el cliente. Sin filtro de producto tienen que entrar. */
  chk('solo cliente: trae TODO lo suyo del período, también lo que no pidió por producto',
      r.ids.length===9 && r.prods.some(s=>/ALMOHADA/.test(s)) && r.ids.indexOf('x4')>=0 && r.ids.indexOf('x5')>=0,
      r.ids.length+' renglones: '+r.ids.join(','));
  r = await buscar('','carioca premier','2026-08-01','2026-09-06');
  chk('solo producto: trae el de todos los clientes que lo compraron', r.ids.indexOf('x3')>=0 && r.ids.indexOf('a1')>=0, r.ids.join(','));
  r = await buscar('','','','');
  chk('⚠️ sin cliente ni producto NO devuelve el panel entero: pide un dato',
      r.pedir===true && r.ids.length===0 && /Escribí un/.test(r.texto), r.texto.slice(0,60));

  // ══ 5. El PDF y el texto para mandar ══════════════════════════════════════
  console.log('\n── 5. Imprimir y copiar ──');
  r = await buscar('Juan Pablo Paredes','carioca premier, carioca bahía, premier deluxe','2026-08-01','2026-09-06');
  const impr = await page.evaluate(() => {
    printBusca();
    var tiene=document.body.classList.contains('printing-busca');
    document.body.classList.remove('printing-busca');
    return tiene;
  });
  chk('🖨 Imprimir prepara la hoja (de ahí sale «Guardar como PDF»)', impr===true);
  const txt = await page.evaluate(() => { var t=''; var o=window.copyText; window.copyText=function(s){t=s;}; copiarBusca(); window.copyText=o; return t; });
  chk('📋 Copiar arma el detalle en texto, con el total',
      /Cliente: Juan Pablo Paredes/.test(txt) && /TOTAL: 9 unidades/.test(txt) && /13\.900/.test(txt),
      txt.split('\n').filter(l=>/TOTAL/.test(l)).join(''));
  chk('…con una línea por renglón y su fecha', (txt.match(/^\d{2}\/\d{2}\/\d{4}/gm)||[]).length===6,
      (txt.match(/^\d{2}\/\d{2}\/\d{4}[^\n]*/m)||[''])[0]);

  chk('la página no tiró ningún error de JavaScript', errores.length===0, errores.join(' | ').slice(0,300));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
