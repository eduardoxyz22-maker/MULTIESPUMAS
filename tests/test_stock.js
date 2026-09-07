/* 📦 AVISAR ANTES DE QUEDARSE SIN LO QUE MÁS SE VENDE (§4cn, rehecho en §4co).

   Pedido del dueño: *"más tipo moda, que se entrega más seguido, y alerte sobre tener
   stock"*, y después *"Todo"* a la lista de mejoras. No es la lista de faltantes —esa ya
   existe y mira lo que YA falta— sino el aviso ANTES.

   ⚠️ LO QUE ESTE TEST CUIDA, por orden de importancia:
   1. Que la demanda se mida por lo VENDIDO, no por lo entregado: un producto agotado deja
      de entregarse, y con la cuenta vieja el aviso desaparecía justo cuando más faltaba.
   2. Que el mismo colchón con tres nombres (vendedora, Excel de ROHO, catálogo) sea UN
      renglón. Partido en tres, ninguno rotaba lo suficiente para avisar.
   3. Que NO invente un número de depósito. Sin conteo no hay aviso.
   4. Que el cálculo sea IDEMPOTENTE y que un conteo nuevo borre el error acumulado.
   5. Que un pedido a fábrica anotado deje de molestar, que lo que llega entre en la
      proyección y que el panel aprenda cuánto tarda cada fábrica.
   6. Que la proyección mire TODO lo vendido hacia adelante, no solo 3 días.
   7. Que avise cuando el conteo quedó viejo o cuando un chofer marcó ✗ de algo que «hay».
   8. Que señale la plata parada y que el margen crezca si la venta es a los saltos.

   Se corre:  node tests/test_stock.js   (desde la raíz del repo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1500,height:1000} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  /* Contra un panel sin §4co este test no revienta: dice qué falta y termina en rojo. */
  const faltan = await page.evaluate(() => ['stockClave','stockInfo','stockProyectar','stockTiemposFabrica','stockMargen','stockContradice','stockSobra','abrirStockPedido','recibirStockPedido','abrirStockUnir','stockMigrar'].filter(f => typeof window[f] !== 'function'));
  if(faltan.length){
    chk('el panel tiene el stock de §4co (clave unificada, proyección, pedidos a fábrica, unir)', false, 'faltan: '+faltan.join(', '));
    console.log('\n'+PASS+' bien · '+FAIL+' mal'); await browser.close(); process.exit(1);
  }

  /* El escenario. El ECO FLEX 140x190 es el que más se vende: 28 en 28 días, parejito (7
     por semana), y con TRES nombres: «ECO FLEX» a mano, «COLCHON ECO FLEX 2 PLAZAS 140X190CM
     FLEX» del Excel de ROHO, y en el catálogo es «NUEVO ECO FLEX» (CH1332).
       · 4 pedidos pendientes marcados ✗ NO HAY (hace 1 a 4 días) — se vendieron igual
       · 1 pedido para HOY sin entregar todavía
       · 16 entregados por vendedoras (hace 5 a 20 días; el de hace 6 quedó sin marcar ✓,
         y como el día ya pasó se da por entregado) + 7 entregados de ROHO (21 a 27)
       · vendidos sin entregar: 5 para pasado mañana y 20 para dentro de 4 días
       · 3 hechos a pedido (🏭 Moreno): los trae la fábrica, no salen del depósito
     El PILLOW FLEX vende poco (2 en 28 días). El MEMORY FLEX vendió 28 pero todos en un solo
     pedido hace 2 días (venta a los saltos). Y «COLCHON XYZ» / «XYZ PLUS» no están en el
     catálogo. */
  const armar = () => page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    document.getElementById('admin-lock').style.display='none';
    document.getElementById('admin-content').style.display='block';
    try{ localStorage.removeItem(LS_PEND); }catch(e){}
    STOCK={ c:{f:'',u:{}}, e:[], p:[], a:{} };
    window._guardadas=[];
    apiSave=function(rec){ window._guardadas.push(JSON.parse(JSON.stringify(rec))); return Promise.resolve({ok:true, pedido:rec}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
    var atras=function(n){ var d=new Date(); d.setDate(d.getDate()-n); return isoLocal(d); };
    var adel =function(n){ var d=new Date(); d.setDate(d.getDate()+n); return isoLocal(d); };
    window._atras=atras; window._adel=adel;
    var P=function(o){ return Object.assign({id:'p'+Math.random(),fecha:todayStr(),oc:'',vendedor:'Carola Chavez',
      cliente:'C',celular:'70000000',turno:'AM',zona:'Norte',direccion:'x',maps:'',pagado:true,saldo:0,
      ts:Date.now(),metodoPago:'',observaciones:'',estado:'',entregado:false,vehiculo:'',chofer:'',
      garantia:'',nota:'',acuenta:0,facturarA:'',nit:'',nroDia:1,verificado:true,fotos:[]},o); };
    var eco =function(n,x){ return [Object.assign({desc:'ECO FLEX',medida:'140x190',codigo:'',cant:n},x||{})]; };
    var ecoR=function(n){ return [{desc:'COLCHON ECO FLEX 2 PLAZAS 140X190CM FLEX',medida:'140X190',codigo:'RH-77',cant:n}]; };
    var pill=function(n){ return [{desc:'COLCHON PILLOW FLEX 3 PLAZAS',medida:'180x190',codigo:'',cant:n}]; };
    var mem =function(n){ return [{desc:'MEMORY FLEX',medida:'160x190',codigo:'CH2291',cant:n}]; };
    STATE=[];
    for(var i=1;i<=4;i++) STATE.push(P({id:'nh'+i, fecha:atras(i), entregado:false, estado:'No hay', verificado:false, productos:eco(1,{chk:'no'})}));
    STATE.push(P({id:'hoy1', fecha:atras(0), entregado:false, productos:eco(1)}));
    // El de hace 6 días quedó SIN marcar «Entregado ✓» (pasa todo el tiempo): salió igual.
    for(var j=5;j<=20;j++) STATE.push(P({id:'e'+j, fecha:atras(j), entregado:(j!==6), productos:eco(1)}));
    for(var r=21;r<=27;r++) STATE.push(P({id:'r'+r, fecha:atras(r), entregado:true, productos:ecoR(1)}));
    STATE.push(P({id:'q1', fecha:atras(3), entregado:true, productos:pill(1)}));
    STATE.push(P({id:'q2', fecha:atras(9), entregado:true, productos:pill(1)}));
    /* ⚠️ EL MEMORY VENDE A LOS SALTOS, PERO VENDE (§4da). Antes eran 28 unidades en UNA sola
       entrega, y desde que el panel distingue rotación de pedido único eso ya no es un
       ritmo: es una venta mayorista suelta, de la que no se deduce nada (el dueño: «una
       única entrega o 2 en 1 mes no es tener rotación, eso es pedido único»). Para seguir
       probando lo que este fixture quiere probar —la venta DESPAREJA, que necesita más
       margen— las 28 se reparten en 4 entregas de la última semana y las otras 3 semanas
       quedan en cero. Eso sí es rotación, y sigue siendo «a los saltos». */
    for(var m=1;m<=4;m++) STATE.push(P({id:'m'+m, fecha:atras(m), entregado:true, productos:mem(7)}));
    STATE.push(P({id:'x1', fecha:atras(1), entregado:true, productos:[{desc:'COLCHON XYZ',medida:'140x190',codigo:'',cant:3}]}));
    STATE.push(P({id:'x2', fecha:atras(2), entregado:true, productos:[{desc:'XYZ PLUS',medida:'140x190',codigo:'',cant:2}]}));
    STATE.push(P({id:'v1', fecha:adel(2), entregado:false, productos:eco(5)}));
    STATE.push(P({id:'v2', fecha:adel(4), entregado:false, productos:ecoR(20)}));
    STATE.push(P({id:'f1', fecha:adel(1), entregado:false, productos:eco(3,{chk:'no',enProd:true,prodEn:'Moreno',prodF:atras(2)})}));
    // 📥 Un borrador de Kommo: NO es una venta todavía, no puede contar
    STATE.push(P({id:'kommo-99', fecha:'', turno:'', estado:'Borrador Kommo', entregado:false, productos:eco(50)}));
    saveMirror(); updateStats();
    window.K = stockClave({desc:'ECO FLEX',medida:'140x190'});
    window.KP= stockClave({desc:'COLCHON PILLOW FLEX 3 PLAZAS',medida:'180x190'});
    window.KM= stockClave({codigo:'CH2291'});
  });
  await armar();

  // ══ 1. Un solo producto, y se cuenta lo VENDIDO ═══════════════════════════
  console.log('\n── 1. Un solo colchón con tres nombres, y la venta de verdad ──');
  let r = await page.evaluate(() => {
    var d=stockData(), ecos=d.lista.filter(o=>/ECO FLEX/.test(o.desc)), eco=ecos[0]||{};
    var pill=d.lista.filter(o=>/PILLOW/.test(o.desc))[0]||{};
    return { n:ecos.length, desc:eco.desc, medida:eco.medida, cod:eco.cod, cat:eco.cat, otros:eco.otros,
             porDia:eco.porDia, vendidos:eco.vendidos, comp:eco.comp, aFab:eco.aFab, atrasados:eco.atrasados, noHay:eco.noHay, noHayViejo:eco.noHayViejo,
             pillPorDia:pill.porDia, ventana:STOCK_VENTANA,
             k1:stockClave({desc:'ECO FLEX',medida:'140x190'}),
             k2:stockClave({desc:'COLCHON ECO FLEX 2 PLAZAS 140X190CM FLEX',medida:'140X190',codigo:'RH-77'}),
             k3:stockClave({codigo:'CH1332'}),
             k4:stockClave({desc:'NUEVO ECO FLEX',medida:'140x190'}),
             pilloSolo:stockClave({desc:'PILLOW',medida:'140x190'}),
             somier:stockClave({desc:'SOMIER FLEX',medida:'140x190'}),
             dc:stockClave({desc:'ESPECIAL ORTOPEDICO D/C',medida:'180x190'}),
             sinDc:stockClave({desc:'ESPECIAL ORTOPEDICO',medida:'180x190'}),
             bahia:stockClave({desc:'Colchón Bahía 140x190',medida:''}),
             somierBahia:stockClave({desc:'SOMIER BAHIA',medida:'140x190'}) };
  });
  chk('⚠️ «ECO FLEX», el nombre largo de ROHO y el código CH1332 son LA MISMA clave',
      r.k1===r.k2 && r.k2===r.k3 && r.k3===r.k4, r.k1+' · '+r.k2+' · '+r.k3);
  chk('…y en la pantalla es UN renglón, con el nombre del catálogo', r.n===1 && r.desc==='NUEVO ECO FLEX' && r.medida==='140x190', r.n+' · '+r.desc+' · '+r.medida);
  chk('…con el código de la empresa aunque nadie lo haya escrito', r.cod==='CH1332', r.cod);
  chk('…y dice qué otros nombres juntó', (r.otros||[]).some(t=>/ROHO|COLCHON ECO FLEX 2 PLAZAS/.test(t)) && (r.otros||[]).indexOf('ECO FLEX')>=0, JSON.stringify(r.otros));
  chk('⚠️ vende 1 por día: 28 en 28 días contando los ✗ NO HAY, lo de ROHO y lo de hoy sin entregar',
      Math.abs(r.porDia-1)<0.02 && r.vendidos===28, r.porDia+' · '+r.vendidos+' vendidos');
  chk('…y el PILLOW mucho menos', r.pillPorDia<0.1, r.pillPorDia);
  chk('⚠️ el borrador de Kommo (50 unidades) NO cuenta como venta', r.comp===26, r.comp+' comprometidas (1 de hoy + 5 + 20)');
  chk('⚠️ un pedido de hace 6 días SIN marcar ✓ se da por entregado: no es «vendido sin entregar» (así se contaban 41 almohadas de más)',
      r.atrasados===1 && r.comp===26, r.atrasados+' de días pasados sin marcar');
  chk('los 4 ✗ NO HAY de días pasados se ven aparte, sin reprogramar, y no inflan lo comprometido', r.noHay===4 && r.noHayViejo===4, r.noHay+' · '+r.noHayViejo);
  chk('⚠️ lo hecho a pedido (🏭) se aparta: la fábrica lo trae para ese cliente', r.aFab===3, r.aFab);
  chk('«PILLOW» solo NO se confunde con PILLOW FLEX ni PILLOW PEDIC', r.pilloSolo==='PILLOW|140X190', r.pilloSolo);
  chk('un SOMIER FLEX no es un ECO FLEX', r.somier!==r.k1 && /SOMIER FLEX/.test(r.somier), r.somier);
  chk('«ESPECIAL ORTOPEDICO D/C» y «ESPECIAL ORTOPEDICO» son dos productos (el más específico gana)',
      r.dc!==r.sinDc && /D\/C/.test(r.dc) && !/D\/C/.test(r.sinDc), r.dc+' · '+r.sinDc);
  chk('«Colchón Bahía 140x190» (medida adentro del nombre, con tilde) es el COLCHON BAHIA del catálogo',
      r.bahia==='COLCHON BAHIA|140X190' && r.somierBahia==='SOMIER BAHIA|140X190', r.bahia+' · '+r.somierBahia);

  // ── 1b. Plazas y centímetros, y el nombre al que le falta una palabra (§4cu) ──
  console.log('\n── 1b. «2,5 plz» es «160x190», y se une solo ──');
  r = await page.evaluate(() => {
    var f=function(d,m){ var i=stockInfo({desc:d,medida:m}); return {k:i.k, por:i.cat&&i.cat.por}; };
    return { m25:normMedida('2,5 plz'), m2:normMedida('2 PLAZAS'), m35:normMedida('3.5 plz'),
             txt:medidaDeTexto('COLCHON ORO VISCOLASTICO 2,5 PLZ'),
             plz:f('ORO ANATOMICO VISCOLASTICO','2,5 plz'), cm:f('ORO ANATOMICO VISCOLASTICO','160x190'),
             oro:f('COLCHON ORO VISCOLASTICO 2.5PLZ 160X190CM HEAVEN',''),
             carioca:f('COLCHON CARIOCA','160x190'), pillow:f('PILLOW','140x190'),
             ortop:f('ESPECIAL ORTOPEDICO','180x190'), semi:f('ESPECIAL SEMIORTOPEDICO','160x190'),
             sinMed:f('ORO VISCOLASTICO','') };
  });
  /* Confirmado con los archivos reales del dueño (el Excel de ROHO escribe las dos formas
     juntas): 2 plz = 140x190 quince veces, 2,5 plz = 160x190 ocho veces. */
  chk('⚠️ «2,5 plz» y «160x190» son la MISMA medida', r.m25==='160x190' && r.m2==='140x190' && r.m35==='200x200',
      r.m25+' · '+r.m2+' · '+r.m35);
  chk('…también cuando la medida viene en plazas adentro del nombre', r.txt==='160x190', r.txt);
  chk('⚠️ el mismo colchón cargado en plazas y en centímetros es UN producto',
      r.plz.k===r.cm.k, r.plz.k+' vs '+r.cm.k);
  /* §4cw: el dueño pasó la tabla de códigos y ahí «ORO VISCOLASTICO» figura como el nombre
     que usa el equipo, así que dejó de ser una adivinanza por parecido y pasó a ser un ALIAS
     explícito — se resuelve por nombre, que es más firme. */
  chk('⚠️ «COLCHON ORO VISCOLASTICO 2.5PLZ 160X190CM HEAVEN» se une solo al del catálogo, sin tocar nada',
      r.oro.k==='ORO ANATOMICO VISCOLASTICO|160X190' && r.oro.por==='nombre', r.oro.k+' ['+r.oro.por+']');
  /* §4cy: la clave cruda ya no lleva el relleno (COLCHON, CM…): «COLCHON CARIOCA» queda como
     «CARIOCA|160X190», que es lo mismo que escribiría el almacén. Lo que importa acá sigue
     igual: NO se unió a ningún CARIOCA del catálogo. */
  chk('⚠️ …pero «CARIOCA» a secas NO se une: hay CARIOCA PREMIER y CARIOCA RIO, son distintos',
      !r.carioca.por && /^CARIOCA\|/.test(r.carioca.k), r.carioca.k);
  chk('…ni «PILLOW» a secas (PILLOW FLEX y PILLOW PEDIC)', !r.pillow.por, r.pillow.k);
  chk('…y ORTOPEDICO y SEMIORTOPEDICO siguen siendo dos colchones',
      r.ortop.k!==r.semi.k && r.ortop.por==='nombre' && r.semi.por==='nombre', r.ortop.k+' vs '+r.semi.k);
  /* Con el alias ya no hay nada que adivinar: «ORO VISCOLASTICO» ES ese producto, con
     medida o sin ella. Lo que sigue sin adivinarse es lo que NO tiene alias (ver CARIOCA). */
  chk('sin medida y con alias, igual lo reconoce por nombre', r.sinMed.k==='ORO ANATOMICO VISCOLASTICO|', r.sinMed.k);

  // ── 1c. La tabla de códigos que pasó el dueño (§4cw) ──
  console.log('\n── 1c. «somier pedic es el somier negro» ──');
  r = await page.evaluate(() => {
    var f=function(d,m,c){ var i=stockInfo({desc:d,medida:m,codigo:c}); return {k:i.k, por:i.cat&&i.cat.por, d:i.cat&&i.cat.d}; };
    return { pedic:f('SOMIER PEDIC','2,5',''), negro:f('SOMIER NEGRO','160x190',''),
             typo:f('ORO VICOLASTICO','1,0',''),           // así lo escriben, sin la S
             semi:f('SEMIPEDIC','2,0',''), euro:f('EUROPEDIC','3,5',''), dyn:f('DYNAMIC PEDIC','3,5',''),
             anti:f('','','CH2393'), esp:f('','','CH1034'),
             m20:normMedida('2,0'), m10:normMedida('1,0'), m30:normMedida('3,0'),
             m5070:normMedida('50x70'), mRara:normMedida('77x88') };
  });
  /* «2,0» y «2» son el mismo número, pero la tabla solo tenía uno: sin normalizar, la tabla
     de códigos del dueño —que escribe «SEMIPEDIC 2,0»— no encontraba nada. */
  chk('⚠️ «2,0» y «1,0» y «3,0» también son medidas', r.m20==='140x190' && r.m10==='90x190' && r.m30==='180x190',
      r.m20+' · '+r.m10+' · '+r.m30);
  chk('…y una medida de verdad no se toca', r.m5070==='50x70' && r.mRara==='77x88', r.m5070+' · '+r.mRara);
  chk('⚠️ «SOMIER PEDIC» es el «SOMIER NEGRO» — lo dijo el dueño',
      r.pedic.k===r.negro.k && r.pedic.d==='SOMIER NEGRO', r.pedic.k+' vs '+r.negro.k);
  chk('⚠️ «ORO VICOLASTICO» (sin la S, como lo escriben) es el ORO ANATOMICO VISCOLASTICO',
      r.typo.d==='ORO ANATOMICO VISCOLASTICO' && r.typo.k==='ORO ANATOMICO VISCOLASTICO|90X190', r.typo.k);
  chk('la tabla en plazas resuelve SEMIPEDIC, EUROPEDIC y DYNAMIC PEDIC',
      r.semi.k==='SEMIPEDIC|140X190' && r.euro.k==='EUROPEDIC|200X200' && r.dyn.k==='DYNAMIC PEDIC|200X200',
      r.semi.k+' · '+r.euro.k+' · '+r.dyn.k);
  chk('los códigos nuevos que pasó están en el catálogo',
      r.anti.d==='ESPECIAL ANTIALERGICO' && r.anti.k==='ESPECIAL ANTIALERGICO|160X190' && /ESPECIAL/.test(r.esp.d||''),
      r.anti.k+' · '+r.esp.d);

  // ══ 2. Sin conteo NO se inventa nada ═══════════════════════════════════════
  console.log('\n── 2. Sin haber contado el depósito ──');
  r = await page.evaluate(() => {
    var d=stockData(), eco=d.lista.filter(o=>/ECO FLEX/.test(o.desc))[0];
    renderAdmin();
    return { deposito:eco.deposito, dias:eco.dias, aviso:eco.aviso,
             banner:(document.getElementById('adm-stock')||{}).textContent||'' };
  });
  chk('⚠️ el depósito queda en «sin contar», NO en cero ni en un número inventado', r.deposito===null, JSON.stringify(r.deposito));
  chk('…y por lo tanto no dice cuándo se corta', r.dias===null, JSON.stringify(r.dias));
  chk('…lo marca como «sin contar», no como que falte', r.aviso==='sincontar', r.aviso);
  chk('⚠️ y NO aparece ningún aviso en Administración', r.banner.trim()==='', r.banner.slice(0,80));

  // ══ 3. Con el conteo: la proyección día por día ════════════════════════════
  console.log('\n── 3. Después de contar: se corta el día que se corta ──');
  r = await page.evaluate(() => {
    STOCK={ c:{f:todayStr(), u:{}}, e:[], p:[], a:{} };
    STOCK.c.u[K]=12; STOCK.c.u[KP]=30; STOCK.c.u[KM]=40;
    var d=stockData();
    var eco=d.lista.filter(o=>/ECO FLEX/.test(o.desc))[0], pill=d.lista.filter(o=>/PILLOW/.test(o.desc))[0], mem=d.lista.filter(o=>/MEMORY/.test(o.desc))[0];
    renderAdmin();
    return { eco:eco, pill:pill, mem:mem, corte4:window._adel(4), primero:d.lista[0].desc,
             banner:(document.getElementById('adm-stock')||{}).textContent||'', fabrica:STOCK_DIAS_FABRICA, colchon:STOCK_COLCHON };
  });
  chk('la fábrica tarda 3 días mientras no se mida (lo dijo el dueño)', r.fabrica===3 && r.eco.lead===3 && r.eco.leadMedido===false, r.eco.lead+' · medido '+r.eco.leadMedido);
  chk('el depósito del ECO FLEX es 12', r.eco.deposito===12, r.eco.deposito);
  chk('⚠️ se corta EN 4 DÍAS: ahí caen 20 vendidos que con 12 no se cubren (lo viejo miraba solo 3 días y decía «alcanza 12»)',
      r.eco.dias===4 && r.eco.corte===r.corte4, r.eco.dias+' días · '+r.eco.corte);
  chk('⚠️ …4 días es más que los 3 de fábrica pero menos que 3 + 2 de margen → PEDIR ESTA SEMANA',
      r.eco.aviso==='pedir' && r.eco.margen===2, r.eco.aviso+' · margen '+r.eco.margen);
  chk('…y dice cuánto pedir: los 26 vendidos menos los 12 que hay = 14', r.eco.pedir===14, r.eco.pedir);
  chk('el ECO FLEX vende parejo (7 por semana) → margen de 2 días, «venta pareja»', r.eco.cv<0.01, 'cv '+r.eco.cv);
  chk('⚠️ el PILLOW con 30 en depósito y 2 vendidos en 4 semanas es PLATA PARADA', r.pill.aviso==='sobra' && r.pill.sobra===true, r.pill.aviso);
  chk('el MEMORY FLEX con 40 (para 40 días) ni sobra ni falta', r.mem.aviso==='', r.mem.aviso+' · corte en '+r.mem.dias+' días');
  chk('lo que hay que pedir va primero en la lista', /ECO FLEX/.test(r.primero), r.primero);
  chk('⚠️ y avisa en Administración, diciendo cuál', /para pedir esta semana/.test(r.banner) && /ECO FLEX/.test(r.banner), r.banner.replace(/\s+/g,' ').slice(0,140));

  r = await page.evaluate(() => {
    STOCK.c.u[K]=0;
    var d=stockData(), eco=d.lista.filter(o=>/ECO FLEX/.test(o.desc))[0];
    renderAdmin(); renderStock();
    return { eco:eco, banner:(document.getElementById('adm-stock')||{}).textContent||'',
             fila:((document.getElementById('stock-body')||{}).textContent||'').replace(/\s+/g,' ') };
  });
  chk('⚠️ con 0 en depósito y 1 vendido para HOY se corta hoy → PEDIR YA', r.eco.aviso==='urgente' && r.eco.dias===0 && r.eco.saldoHoy<0, r.eco.aviso+' · '+r.eco.dias+' · saldo hoy '+r.eco.saldoHoy);
  chk('…el aviso de Administración lo dice con todas las letras', /se acaba/.test(r.banner) && /ECO FLEX/.test(r.banner), r.banner.replace(/\s+/g,' ').slice(0,120));
  chk('…y la pantalla muestra la fecha del corte y «PEDIR YA»', /PEDIR YA/.test(r.fila) && /Se corta/.test(r.fila) && /En camino/.test(r.fila), r.fila.slice(0,100));

  // ══ 4. La cuenta es idempotente ════════════════════════════════════════════
  console.log('\n── 4. Recalcular no cambia el resultado ──');
  r = await page.evaluate(() => {
    STOCK.c.u[K]=4;
    var v=[]; for(var i=0;i<10;i++) v.push(stockDeposito(K));
    for(var j=0;j<5;j++){ renderAdmin(); renderStock(); }
    v.push(stockDeposito(K));
    return { todos:v, iguales:v.every(function(x){ return x===v[0]; }) };
  });
  chk('⚠️ calcular el depósito 10 veces da SIEMPRE lo mismo', r.iguales===true, JSON.stringify(r.todos));
  chk('…y repintar la pantalla tampoco descuenta nada', r.todos[r.todos.length-1]===4, r.todos[r.todos.length-1]);

  // ══ 5. Entregar descuenta · llegar de fábrica suma · lo hecho a pedido no toca ═
  console.log('\n── 5. Se mueve con las entregas, no con lo que trae la fábrica para un cliente ──');
  r = await page.evaluate(() => {
    STOCK.c.u[K]=12;
    var antes=stockDeposito(K);
    var p=STATE.filter(function(x){ return x.id==='v1'; })[0];
    p.entregado=true; p.fecha=todayStr();                       // se entregan las 5
    var despues=stockDeposito(K);
    // Se entrega un pedido cuyo colchón lo trajo la fábrica (🏭 Moreno) — no sale del depósito
    STATE.push(Object.assign({}, STATE[0], {id:'f2', fecha:todayStr(), entregado:true, estado:'',
      productos:[{desc:'ECO FLEX',medida:'140x190',codigo:'',cant:2,chk:'ok',enProd:true,prodEn:'Moreno',prodF:window._atras(3),prodR:todayStr()}]}));
    var conHecho=stockDeposito(K);
    STOCK.e=STOCK.e.concat([{f:todayStr(), k:K, u:10, fab:'MORENO'}]);
    var conEntrada=stockDeposito(K);
    return { antes:antes, despues:despues, conHecho:conHecho, conEntrada:conEntrada };
  });
  chk('⚠️ al marcar entregadas 5 unidades, el depósito baja 5', r.despues===r.antes-5, r.antes+' → '+r.despues);
  chk('⚠️ entregar 2 que trajo la fábrica para ese cliente NO descuenta nada', r.conHecho===r.despues, r.conHecho);
  chk('⚠️ …y llegan 10 de fábrica: sube a '+(r.despues+10), r.conEntrada===r.despues+10, r.conEntrada);
  const negativo = await page.evaluate(() => {
    STOCK={ c:{f:window._atras(1), u:{}}, e:[], p:[], a:{} }; STOCK.c.u[K]=1;
    renderStock();
    return { dep:stockDeposito(K), txt:((document.getElementById('stock-body')||{}).textContent||'').replace(/\s+/g,' ') };
  });
  chk('un depósito negativo no se muestra como número raro', negativo.dep<0, negativo.dep);
  chk('⚠️ …dice que se entregó más de lo contado y que hay que volver a contar',
      /más de lo contado/.test(negativo.txt) && /volv[ée] a contar/.test(negativo.txt), (negativo.txt.match(/se entregaron[^·]*/)||[''])[0].slice(0,80));

  // ══ 6. Un conteo nuevo borra el error acumulado ════════════════════════════
  console.log('\n── 6. Volver a contar corrige la deriva ──');
  r = await page.evaluate(() => {
    var calculado=stockDeposito(K);
    STOCK={ c:{f:todayStr(), u:{}}, e:[{f:todayStr(), k:K, u:99, fab:'X'}], p:[], a:{} };
    STOCK.c.u[K]=4;
    var despuesDeContar=stockDeposito(K);
    guardarStock();
    return { calculado:calculado, despuesDeContar:despuesDeContar, podadas:STOCK.e.length,
             guardada:(window._guardadas.filter(function(x){return x.id===STOCK_ID;})[0]||{}).observaciones||'' };
  });
  /* 4 contados + 99 que llegaron hoy − 5 que se entregaron HOY = 98. Las 2 del pedido
     hecho a fábrica, entregadas hoy también, no se descuentan (§5).
     ⚠️ Las 5 de hoy se descuentan aunque el conteo también sea de hoy: no se sabe si el
     camión salió antes o después de contar, y se elige el lado que no deja sin avisar. */
  chk('⚠️ el conteo nuevo manda sobre lo calculado', r.despuesDeContar===4+99-5, 'calculado antes '+r.calculado+' · después de contar 4 (+99 de hoy −5 entregadas hoy) = '+r.despuesDeContar);
  chk('el conteo se guarda en la planilla como fila del sistema, con las claves del catálogo',
      /"c":/.test(r.guardada) && /NUEVO ECO FLEX\|140X190/.test(r.guardada), r.guardada.slice(0,90));
  r = await page.evaluate(() => {
    STOCK.e=[{f:'2020-01-01', k:K, u:77, fab:'VIEJA'}, {f:todayStr(), k:K, u:5, fab:'HOY'}];
    guardarStock();
    return { quedan:STOCK.e.length, total:stockEntradas(K) };
  });
  chk('⚠️ una entrada anterior al conteo se descarta (ya estaba contada)', r.quedan===1 && r.total===5, r.quedan+' entradas · '+r.total+' unidades');

  // ══ 7. Ida y vuelta por la planilla, y las claves viejas se juntan ═════════
  console.log('\n── 7. Sobrevive el viaje a la planilla ──');
  r = await page.evaluate(() => {
    var fila=window._guardadas.filter(function(x){ return x.id===STOCK_ID; }).pop();
    STOCK={ c:{f:'',u:{}}, e:[] };                        // como si se recargara la página
    var leido=leerStock(fila);
    return { fecha:leido.c.f, nProds:Object.keys(leido.c.u).length, sistema:esFilaSistema(fila), sinFecha:fila.fecha==='' };
  });
  chk('lo guardado se vuelve a leer igual', !!r.fecha && r.nProds>0, r.fecha+' · '+r.nProds+' productos');
  chk('⚠️ la fila del stock es del SISTEMA: no es un pedido', r.sistema===true);
  chk('⚠️ …y va sin fecha, así no ocupa cupo de ningún camión', r.sinFecha===true);
  r = await page.evaluate(() => {
    var fila=window._guardadas.filter(function(x){ return x.id===STOCK_ID; }).pop();
    STOCK={ c:{f:'',u:{}}, e:[] };
    var lista=leerCierresDeLista(STATE.concat([fila]));
    return { enLista:lista.filter(function(p){ return p.id===STOCK_ID; }).length, cargado:!!STOCK.c.f };
  });
  chk('⚠️ al bajar la planilla, la fila del stock NO aparece como pedido', r.enLista===0, r.enLista);
  chk('…y el conteo queda cargado solo', r.cargado===true);
  chk('aguanta una fila rota sin reventar', await page.evaluate(() => {
    var x=leerStock({observaciones:'esto no es json'}), y=leerStock({});
    return x.c.f==='' && !x.e.length && !x.p.length && y.c.f==='';
  }));
  r = await page.evaluate(() => {
    /* Un conteo guardado con la versión anterior, con las claves crudas: dos renglones del
       mismo colchón. Al leerlo se juntan bajo la clave del catálogo. */
    var vieja={ c:{f:todayStr(), u:{'ECO FLEX|140X190':3, 'COLCHON ECO FLEX 2 PLAZAS 140X190CM FLEX|140X190':4, 'COLCHON XYZ|140X190':1}},
                e:[{f:todayStr(), k:'ECO FLEX|140X190', u:2}] };
    var leido=leerStock({observaciones:JSON.stringify(vieja)});
    return { u:leido.c.u, ek:leido.e[0].k, k:K };
  });
  /* §4cy: lo que no es del catálogo también cambia a la clave cruda, sin el relleno:
     «COLCHON XYZ» pasa a «XYZ|140X190». Sigue siendo un renglón aparte, con su unidad. */
  chk('⚠️ un conteo viejo con las claves crudas se junta solo bajo la clave del catálogo (3+4=7)',
      r.u[r.k]===7 && r.u['XYZ|140X190']===1 && Object.keys(r.u).length===2, JSON.stringify(r.u));
  chk('…y la entrada vieja también cambia de clave', r.ek===r.k, r.ek);

  // ══ 8. «Ya lo pedí»: el pedido a fábrica anotado ═══════════════════════════
  console.log('\n── 8. Pedido a fábrica anotado: deja de molestar y aprende cuánto tarda ──');
  r = await page.evaluate(() => {
    var p=STATE.filter(function(x){ return x.id==='v1'; })[0]; p.entregado=false; p.fecha=window._adel(2);   // se deshace lo de §5
    STATE=STATE.filter(function(x){ return x.id!=='f2'; });
    STOCK={ c:{f:todayStr(), u:{}}, e:[], p:[{id:'fp1', k:K, u:20, fab:'MORENO', f:todayStr(), esp:'', r:''}], a:{} };
    STOCK.c.u[K]=12;
    var d=stockData(), eco=d.lista.filter(o=>/ECO FLEX/.test(o.desc))[0];
    renderAdmin(); renderStock();
    return { eco:eco, llega:window._adel(3), banner:(document.getElementById('adm-stock')||{}).textContent||'',
             pantalla:((document.getElementById('stock-body')||{}).textContent||'').replace(/\s+/g,' ') };
  });
  chk('⚠️ con 20 pedidas a Moreno (llegan en ~3 días) el ECO FLEX pasa a «ya pedido» y NO molesta más',
      r.eco.aviso==='pedido' && r.eco.enCamino===20, r.eco.aviso+' · '+r.eco.enCamino+' en camino');
  chk('…llegan el día que la fábrica suele tardar', r.eco.pedidos[0].llega===r.llega, r.eco.pedidos[0].llega);
  chk('…y recuerda que sin ese pedido se cortaba en 4 días', r.eco.sinCamino===4, r.eco.sinCamino);
  chk('el aviso de Administración se calla', r.banner.trim()==='', r.banner.slice(0,80));
  /* §4cr renombró la sección: «🚚 En camino — recogidas de Moreno y pedidos a fábrica»,
     porque ahora conviven las dos cosas. */
  chk('la pantalla lo lista «en camino» con la fecha', /Ya pedido/.test(r.pantalla) && /En camino/i.test(r.pantalla), r.pantalla.slice(0,60));
  r = await page.evaluate(() => {
    STOCK.p[0].esp=window._adel(6);        // la fábrica avisó que llega recién en 6 días: tarde
    var d=stockData(), eco=d.lista.filter(o=>/ECO FLEX/.test(o.desc))[0];
    return { aviso:eco.aviso, dias:eco.dias };
  });
  chk('⚠️ si lo pedido llega DESPUÉS del corte, sigue avisando que hay que pedir', r.aviso==='pedir' && r.dias===4, r.aviso+' · corte en '+r.dias);
  r = await page.evaluate(() => {
    STOCK.p[0].esp='';
    abrirStockEntrada();
    var hayInput=!!document.getElementById('stk-rec-fp1');
    recibirStockPedido('fp1');
    var d=stockData(), eco=d.lista.filter(o=>/ECO FLEX/.test(o.desc))[0];
    var T=stockTiemposFabrica();
    return { hayInput:hayInput, r:STOCK.p[0].r, entrada:STOCK.e[STOCK.e.length-1], deposito:eco.deposito, enCamino:eco.enCamino, aviso:eco.aviso,
             moreno:T.de('MORENO'), hoy:todayStr() };
  });
  chk('«📥 Llegó de fábrica» ofrece lo que estaba pedido', r.hayInput===true);
  chk('⚠️ al marcar que llegó: se cierra el pedido, se suma al depósito (12+20) y ya no está en camino',
      r.r===r.hoy && r.entrada && r.entrada.u===20 && r.entrada.de==='fp1' && r.deposito===32 && r.enCamino===0, r.deposito+' · '+r.enCamino+' · '+JSON.stringify(r.entrada));
  chk('…y con 32 para 30 vendidos ya no hay nada que pedir', r.aviso==='', r.aviso);
  chk('⚠️ …y quedó MEDIDO cuánto tardó Moreno esta vez', r.moreno.medido===true && r.moreno.n===1, JSON.stringify(r.moreno));

  // ══ 9. Cuánto tarda cada fábrica, medido ═══════════════════════════════════
  console.log('\n── 9. La fábrica tarda lo que tardó las últimas veces, no 3 fijo ──');
  r = await page.evaluate(() => {
    var A=window._atras;
    STOCK.p=STOCK.p.concat([
      {id:'fp2', k:K, u:10, fab:'MORENO', f:A(10), r:A(6)},     // 4 días
      {id:'fp3', k:K, u:10, fab:'Moreno', f:A(20), r:A(15)},    // 5 días (escrito distinto)
      {id:'fp4', k:K, u:10, fab:'MORENO', f:A(30), r:A(26)}     // 4 días
    ]);
    var T=stockTiemposFabrica();
    var d=stockData(), eco=d.lista.filter(o=>/ECO FLEX/.test(o.desc))[0];
    return { moreno:T.de('MORENO'), multi:T.de('MULTI'), lead:eco.lead, fab:eco.fab, txt:stockFabricasTxt(T) };
  });
  chk('⚠️ Moreno: la mediana de [0,4,4,5] días = 4 (no los 3 fijos)', r.moreno.dias===4 && r.moreno.n===4, JSON.stringify(r.moreno));
  chk('Multi sin medidas usa lo de la otra fábrica y lo dice', r.multi.dias===4 && r.multi.prestado===true, JSON.stringify(r.multi)+' · '+r.txt);
  chk('el ECO FLEX se pide a Moreno → cuenta con 4 días', r.lead===4 && r.fab==='MORENO', r.lead+' · '+r.fab);
  r = await page.evaluate(() => {
    /* Una línea marcada 🏭 Multiespumas en la ficha, sellada al marcar (prodF) y al pasar a
       ✔ hay (prodR): 2 días. Es la otra fuente de medidas. */
    STATE.push(Object.assign({}, STATE[0], {id:'f3', fecha:window._adel(1), entregado:false, estado:'',
      productos:[{desc:'PILLOW FLEX',medida:'180x190',codigo:'',cant:1,chk:'ok',enProd:true,prodEn:'Multiespumas',prodF:window._atras(9),prodR:window._atras(7)}]}));
    var T=stockTiemposFabrica();
    // Y con 4 días de fábrica, cortarse en 3 ya es URGENTE (con los 3 fijos era «pedir»)
    var v2=STATE.filter(function(x){ return x.id==='v2'; })[0]; v2.fecha=window._adel(3);
    STOCK.e=[]; STOCK.p=STOCK.p.map(function(q){ if(q.id==='fp1'){ q.r=''; q.ru=0; } return q; }).filter(function(q){ return q.id!=='fp1'; });
    STOCK.c.u[K]=10;
    var d=stockData(), eco=d.lista.filter(o=>/ECO FLEX/.test(o.desc))[0];
    v2.fecha=window._adel(4);
    return { multi:T.de('MULTI'), aviso:eco.aviso, dias:eco.dias, lead:eco.lead };
  });
  chk('⚠️ una línea 🏭 Multiespumas sellada en la ficha mide 2 días para Multi', r.multi.dias===2 && r.multi.medido===true && r.multi.prestado===false, JSON.stringify(r.multi));
  chk('⚠️ con Moreno en 4 días, cortarse en 3 es PEDIR YA (con 3 fijos era «esta semana»)', r.aviso==='urgente' && r.dias===3 && r.lead===4, r.aviso+' · '+r.dias+' · fábrica '+r.lead);
  r = await page.evaluate(() => {
    /* Los sellos los pone la ficha sola: al marcar 🏭 se anota el día, al pasar a ✔ el otro. */
    setProdProduccion('nh1', 0, 'Multiespumas');
    var x=findById('nh1').productos[0], f=x.prodF, enProd=x.enProd;
    setProdChk('nh1', 0, 'ok');
    var r2=findById('nh1').productos[0].prodR;
    setProdProduccion('nh1', 0, 'Multiespumas');     // se desmarca: se borran los sellos
    var x2=findById('nh1').productos[0];
    return { f:f, enProd:enProd, r:r2, hoy:todayStr(), borrados:(x2.prodF==null && x2.prodR==null && !x2.enProd) };
  });
  chk('⚠️ marcar 🏭 en la ficha sella el día del pedido', r.f===r.hoy && r.enProd===true, r.f);
  chk('…y pasar a ✔ hay sella el día que llegó', r.r===r.hoy, r.r);
  chk('…y desmarcar 🏭 borra los sellos', r.borrados===true);
  await page.evaluate(() => { var x=findById('nh1').productos[0]; x.chk='no'; delete x.enProd; delete x.prodEn; });

  // ══ 10. El conteo viejo y el chofer que dice que no hay ═══════════════════
  console.log('\n── 10. Cuándo hay que volver a contar ──');
  r = await page.evaluate(() => {
    STOCK={ c:{f:window._atras(25), u:{}}, e:[], p:[], a:{} }; STOCK.c.u[K]=40; STOCK.c.u[KP]=30;
    var d=stockData(); renderAdmin(); renderStock();
    var b=(document.getElementById('adm-stock')||{}).textContent||'';
    var s=((document.getElementById('stock-body')||{}).textContent||'').replace(/\s+/g,' ');
    STOCK.c.f=window._atras(5);
    var d2=stockData(); renderAdmin();
    var b2=(document.getElementById('adm-stock')||{}).textContent||'';
    return { viejo:d.conteoViejo, edad:d.diasConteo, banner:b, pantalla:s, viejo2:d2.conteoViejo, banner2:b2, tope:STOCK_RECONTAR };
  });
  chk('⚠️ un conteo de hace 25 días (más de '+r.tope+') pide contar de nuevo', r.viejo===true && r.edad===25, r.edad);
  chk('…lo dice en Administración', /25 días/.test(r.banner) && /contá de nuevo/.test(r.banner), r.banner.replace(/\s+/g,' ').slice(0,120));
  /* §4cr: se dice «corte» y no «conteo» — es lo que sale del sistema de Moreno, con hora. */
  chk('…y en la pantalla', /El corte tiene 25 días/.test(r.pantalla), r.pantalla.slice(0,80));
  chk('con 5 días, no', r.viejo2===false && !/tiene \d+ días/.test(r.banner2), r.banner2.replace(/\s+/g,' ').slice(0,80));
  r = await page.evaluate(() => {
    /* Conteo de hace 5 días: 40. Pero hay 4 pedidos de estos días con ✗ NO HAY marcado por el
       chofer. ¿Hay 40 o no hay? Uno de los dos miente: avisa. */
    var d=stockData(), eco=d.lista.filter(o=>/ECO FLEX/.test(o.desc))[0];
    renderAdmin();
    var b=(document.getElementById('adm-stock')||{}).textContent||'';
    STOCK.e=[{f:todayStr(), k:K, u:5, fab:'MORENO'}];         // llegó algo hoy: el ✗ puede ser de antes
    var d2=stockData(), eco2=d2.lista.filter(o=>/ECO FLEX/.test(o.desc))[0];
    STOCK.e=[]; STOCK.c.f=todayStr();                           // se contó hoy: el conteo es más nuevo que el ✗
    var d3=stockData(), eco3=d3.lista.filter(o=>/ECO FLEX/.test(o.desc))[0];
    return { contradice:eco.contradice, banner:b, conEntrada:eco2.contradice, contadoHoy:eco3.contradice };
  });
  chk('⚠️ «según el panel hay 40» y «el chofer marcó ✗ no hay» no pueden ser las dos ciertas', r.contradice===true);
  chk('…y lo dice en Administración', /no hay/.test(r.banner) && /contá de nuevo/.test(r.banner), r.banner.replace(/\s+/g,' ').slice(0,140));
  chk('si llegó algo de fábrica después del ✗, no molesta', r.conEntrada===false);
  chk('si se contó después del ✗, tampoco', r.contadoHoy===false);

  // ══ 11. Plata parada ═══════════════════════════════════════════════════════
  console.log('\n── 11. Lo que sobra también se ve ──');
  r = await page.evaluate(() => {
    STOCK.c.u['TITANIO ICE|160X190']=6;       // contado, sin una sola venta en 4 semanas
    var d=stockData(); renderStock();
    var pill=d.lista.filter(o=>/PILLOW/.test(o.desc))[0], tit=d.lista.filter(o=>/TITANIO/.test(o.desc))[0];
    return { n:d.sobran.length, pill:pill.aviso, meses:stockMesesSobra(pill), tit:tit&&tit.aviso, ultimo:d.lista[d.lista.length-1].desc,
             pantalla:((document.getElementById('stock-body')||{}).textContent||'').replace(/\s+/g,' ') };
  });
  chk('⚠️ el PILLOW (30 para 14 meses) y el TITANIO (6 sin ventas) son plata parada', r.n===2 && r.pill==='sobra' && r.tit==='sobra', r.n+' · '+r.pill+' · '+r.tit);
  chk('…dice para cuántos meses', r.meses>13 && r.meses<15, stockNumTxt(r.meses));
  chk('…van al final de la lista, no molestan arriba', /PILLOW|TITANIO/.test(r.ultimo), r.ultimo);
  /* §4cp cambió el texto a propósito: «sin ENTREGAS en 4 semanas», no «sin ventas». Con el
     Excel del almacén entero cargado, casi todo figura sin movimiento porque las tiendas
     venden por afuera de este panel — decir «sin ventas» era engañoso. */
  chk('…y hay un renglón «Plata parada» en la pantalla', /Plata parada/.test(r.pantalla) && /sin entregas en 4 semanas/.test(r.pantalla), (r.pantalla.match(/Plata parada[^.]*/)||[''])[0].slice(0,140));
  function stockNumTxt(n){ return String(Math.round(n*10)/10); }

  // ══ 12. El margen crece si la venta es a los saltos ════════════════════════
  console.log('\n── 12. Venta a los saltos, margen más grande ──');
  r = await page.evaluate(() => {
    var d=stockData(), mem=d.lista.filter(o=>/MEMORY/.test(o.desc))[0];
    /* Vende 1 por día. Se le deja stock para (fábrica + margen − 1) días: con el margen de
       5 hay que pedir; con los 2 fijos de antes (3+2=5) esos 6 días «alcanzaban». */
    var dias=mem.lead+mem.margen-1;
    STOCK.c.u[KM]=dias;
    d=stockData(); mem=d.lista.filter(o=>/MEMORY/.test(o.desc))[0];
    var eco=d.lista.filter(o=>/ECO FLEX/.test(o.desc))[0];
    return { margen:mem.margen, cv:mem.cv, txt:stockVentaTxt(mem), aviso:mem.aviso, dias:mem.dias, lead:mem.lead, esperado:dias, ecoMargen:eco.margen, ecoTxt:stockVentaTxt(eco) };
  });
  chk('⚠️ el MEMORY vendió las 28 en una sola semana (4 entregas) y nada en las otras 3: «a los saltos» → margen de 5 días, no 2',
      r.margen===5 && r.cv>1 && r.txt==='venta a los saltos', r.margen+' · cv '+r.cv+' · '+r.txt);
  chk('⚠️ …así que con stock para '+r.esperado+' días (fábrica '+r.lead+' + margen 5 − 1) ya hay que pedir; con margen fijo de 2 no avisaba',
      r.aviso==='pedir' && r.dias===r.esperado && r.esperado>=5, r.aviso+' · corte en '+r.dias);
  chk('el ECO FLEX, parejo, sigue con 2', r.ecoMargen===2 && r.ecoTxt==='venta pareja', r.ecoMargen+' · '+r.ecoTxt);

  // ══ 13. Unir a mano lo que el catálogo no conoce ═══════════════════════════
  console.log('\n── 13. «COLCHON XYZ» y «XYZ PLUS» son el mismo: se unen a mano ──');
  r = await page.evaluate(() => {
    var k1=stockClave({desc:'COLCHON XYZ',medida:'140x190'}), k2=stockClave({desc:'XYZ PLUS',medida:'140x190'});
    STOCK.c.u[k1]=3; STOCK.c.u[k2]=4;
    renderStock();
    var botones=[].slice.call(document.querySelectorAll('#stock-body button')).filter(function(b){ return /unir/.test(b.textContent); }).length;
    var antes=stockData().lista.filter(function(o){ return /XYZ/.test(o.desc); }).length;
    abrirStockUnir(k1);
    var sel=document.getElementById('stk-unir-a'); sel.value=k2;
    guardarStockUnir(k1);
    var d=stockData(), xyz=d.lista.filter(function(o){ return /XYZ/.test(o.desc); });
    var fila=window._guardadas.filter(function(x){ return x.id===STOCK_ID; }).pop();
    var leido=leerStock(fila);
    return { k1:k1, k2:k2, botones:botones, antes:antes, despues:xyz.length, desc:xyz[0]&&xyz[0].desc, vendidos:xyz[0]&&xyz[0].vendidos,
             dep:STOCK.c.u[k2], viejo:STOCK.c.u[k1], alias:STOCK.a[k1], resuelve:stockClave({desc:'COLCHON XYZ',medida:'140x190'}),
             guardado:leido.a[k1], k1EnLista:xyz.length===1 };
  });
  chk('los que no están en el catálogo ofrecen «🔗 unir» (los del catálogo no)', r.botones===2, r.botones+' botones');
  chk('⚠️ eran 2 renglones y quedan 1, con las ventas sumadas (3+2)', r.antes===2 && r.despues===1 && r.vendidos===5, r.antes+' → '+r.despues+' · '+r.vendidos+' vendidos');
  chk('…el conteo se junta (3+4=7) en el destino', r.dep===7 && r.viejo==null, r.dep+' · '+r.viejo);
  chk('…y desde ahora «COLCHON XYZ» resuelve a la clave del otro', r.alias===r.k2 && r.resuelve===r.k2, r.resuelve);
  chk('…la unión se guarda en la fila del sistema y vuelve', r.guardado===r.k2, r.guardado);
  r = await page.evaluate(() => {
    var k1=stockClave({desc:'COLCHON XYZ',medida:'140x190'});    // resuelve al destino ahora
    var src=Object.keys(STOCK.a)[0];
    stockSeparar(src);
    var d=stockData(), xyz=d.lista.filter(function(o){ return /XYZ/.test(o.desc); });
    return { separados:xyz.length, sinAlias:!STOCK.a[src], dep:STOCK.c.u[stockClave({desc:'XYZ PLUS',medida:'140x190'})] };
  });
  chk('«✕ separar» los vuelve a partir, y lo contado queda en el destino (para eso está «contá de nuevo»)', r.separados===2 && r.sinAlias===true && r.dep===7, r.separados+' · '+r.dep);

  // ══ 14. El mensaje para la fábrica ═════════════════════════════════════════
  console.log('\n── 14. El pedido a fábrica ──');
  r = await page.evaluate(() => {
    STOCK={ c:{f:todayStr(), u:{}}, e:[], p:[{id:'fp9', k:K, u:6, fab:'MORENO', f:todayStr(), esp:'', r:''}], a:{} }; STOCK.c.u[K]=0;
    var copiado='';
    if(!window._copyOrig) window._copyOrig=window.copyText;
    window.copyText=function(t){ copiado=t; };
    copiarStock();
    window.copyText=window._copyOrig;
    return copiado;
  });
  chk('arma el mensaje para la fábrica', /PEDIDO A F[ÁA]BRICA/.test(r), r.split('\n')[0]);
  chk('⚠️ dice cuántas unidades pedir: 26 vendidos − 0 que hay − 6 en camino = 20', /pedir 20/.test(r), (r.match(/pedir \d+[^\n]*/)||[''])[0].slice(0,100));
  chk('…y por qué: lo que queda, lo que viene, lo que se vende por día y cuándo se corta',
      /quedan 0/.test(r) && /6 en camino/.test(r) && /por día/.test(r) && /se corta hoy/.test(r), (r.match(/quedan[^\n]*/)||[''])[0].slice(0,140));

  chk('la página no tiró ningún error de JavaScript', errors.length===0, errors.join(' | ').slice(0,300));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
