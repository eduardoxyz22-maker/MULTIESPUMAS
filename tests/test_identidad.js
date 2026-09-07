/* 🎯 LA IDENTIDAD DE UN PRODUCTO: qué es «el mismo» y qué no (§4cy).

   Salió de correr el 🤖 con los DOS Excel reales del almacén (07/09/2026) y cotejar cada
   número a mano. El panel sumaba cosas que no son lo mismo:
     · «CH1297 SOMIER PARRILLA NEGRO 140X190» (10) al «SR2012 SOMIER NEGRO» (3) → «hay 13»
     · «CH1001 Almohada Heaven Celeste 50x70» (28) a la «ALMOHADA 50x70» (21) → «hay 49»
     · «CH2151 SOMIER SEMIPEDIC» a un COLCHÓN (el SEMIPEDIC)
     · «ICH2195 FORRO COLCHON PILLOW PEDIC» (una funda) al colchón PILLOW PEDIC
   y perdía medidas: «2,0 - T.A.», «1,5 [Pr.]», «2,0 VER. 2026», «140*190» quedaban sin
   medida, y así dos tamaños de SOMIER BAHIA terminaban en un solo renglón.

   ⚠️ LO QUE ESTE TEST CUIDA, por orden de importancia:
   1. Dos códigos son dos productos. Un renglón del almacén con un código que el catálogo NO
      conoce queda con su propio nombre; nunca se suma por «parecerse» a otro.
   2. La familia manda: un SOMIER no es un colchón, un FORRO no es un colchón, una ALMOHADA
      es solo una almohada.
   3. Cuando hay duda no se adivina: si dos productos del catálogo empatan, o si al nombre le
      sobra una palabra que es de OTRO producto, queda con su nombre.
   4. El nombre exacto del almacén gana sobre lo que el catálogo «cree»: si el pedido dice
      «SOMIER PARRILLA NEGRO» y el almacén tiene uno, es ese.
   5. Las medidas del almacén de Moreno se leen todas.
   Los datos son sintéticos (nombres reales del almacén, cantidades inventadas).

   Se corre:  node tests/test_identidad.js   (desde la raíz del repo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1300,height:900} });
  const errores=[]; page.on('pageerror',e=>errores.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  const faltan = await page.evaluate(() => ['stockClaveCruda','stockFamilia','stockHayEnInventario','existLeer','stockEnCatalogo']
    .filter(f => typeof window[f] !== 'function'));
  if(faltan.length){
    chk('el panel distingue productos por código, familia y nombre crudo (§4cy)', false, 'faltan: '+faltan.join(', '));
    console.log('\n'+PASS+' bien · '+FAIL+' mal'); await browser.close(); process.exit(1);
  }
  await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    apiSave=function(r){ return Promise.resolve({ok:true,pedido:r}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:[]}); };
    STATE=[]; STOCK={ c:{f:'',u:{}}, e:[], p:[], a:{}, g:{}, al:{}, h:[] }; saveMirror();
  });

  // ══ 1. Las medidas que escribe el almacén de Moreno ═══════════════════════
  console.log('\n── 1. Las medidas, como las escribe el almacén ──');
  let r = await page.evaluate(() => ({
    ta:medidaDeTexto('SOMIER BAHIA BEIGE  2,0 -  T.A.'), pr:medidaDeTexto('COLCHON CONFORT PLUS 1,5 [Pr.]'),
    ver:medidaDeTexto('COLCHON FORTE FLEX 2,0 VER. 2026'), ast:medidaDeTexto('COLCHON SOFT 140*190'),
    bb:medidaDeTexto('COLCHON BB 75*110'), muestra:medidaDeTexto('Colchon Muestra 1,0[Con Chulo y cierre]'),
    cm22:medidaDeTexto('COLCHON SEMIORTOPEDICO 22 CM 105X190'), anio:medidaDeTexto('COLCHON VER. 2026'),
    fin:medidaDeTexto('SOMIER NEGRO 2,5'), plz:medidaDeTexto('RESPALDAR DEL EMPERADOR 3,0 PLZ') }));
  chk('«2,0 - T.A.» es 140x190', r.ta==='140x190', r.ta);
  chk('«1,5 [Pr.]» es 105x190', r.pr==='105x190', r.pr);
  chk('«2,0 VER. 2026» es 140x190 — y el 2026 no es una medida', r.ver==='140x190' && r.anio==='', r.ver+' · '+r.anio);
  chk('«140*190» (con asterisco) es 140x190, «75*110» también se lee', r.ast==='140x190' && r.bb==='75x110', r.ast+' · '+r.bb);
  chk('«1,0[Con Chulo…» es 90x190', r.muestra==='90x190', r.muestra);
  chk('«22 CM 105X190»: manda la medida en centímetros, no el 22', r.cm22==='105x190', r.cm22);
  chk('lo de antes sigue: «2,5» al final y «3,0 PLZ»', r.fin==='160x190' && r.plz==='180x190', r.fin+' · '+r.plz);

  // ══ 2. Dos códigos son dos productos ══════════════════════════════════════
  console.log('\n── 2. El Excel: un código que el catálogo no conoce es OTRO producto ──');
  r = await page.evaluate(() => {
    var f=[{},{C:'MORENO',X:'EXISTENCIAS ALMACEN  AL ',AR:'07/09/2026',AZ:'(Productos con existencia <> 0)'},
           {F:'Almacén Inicial :',P:'01-05-003  PRODUCTOS TERMINADOS FAB.'},
           {G:'Código Producto',W:'Nombre Producto'},
           {G:'SR2012',  W:'SOMIER ROHO PEDIC 140X190',AY:'3'},
           {G:'CH1297',  W:'SOMIER PARRILLA NEGRO 140X190',AY:'10'},
           {G:'CD1403',  W:'ALMOHADA 50X70 EXPO 2019',AY:'21'},
           {G:'CH1001',  W:'Almohada Heaven Celeste 50x70',AY:'28'},
           {G:'CH1683',  W:'COLCHON PILLOW PEDIC 160X190',AY:'2'},
           {G:'ICH2195', W:'FORRO COLCHON PILLOW PEDIC 2,5 PLZ',AY:'5'},
           {G:'CD1913',  W:'SemiPedic by Heaven 105x190',AY:'7'},
           {G:'CH2151',  W:'SOMIER SEMIPEDIC 105X190',AY:'1'},
           {G:'CD1941',  W:'SOMIER BAHIA BEIGE  1,5 -  T.A.',AY:'4'},
           {G:'CD1942',  W:'SOMIER BAHIA BEIGE  2,0 -  T.A.',AY:'10'},
           {G:'CD2051',  W:'SOMIER BAHIA NEGRO  1,5 -  T.A.',AY:'1'},
           {G:'CS1011',  W:'COLCHON CONFORT PLUS 1,5 [Pr.]',AY:'6'},
           {G:'CH1311',  W:'COLCHON SUEÑA CONFORT PLUS 105X190 +2CM',AY:'1'},
           {G:'CH1262',  W:'COLCHON FORTE FLEX 2,0 VER. 2026',AY:'5'},
           {G:'CH2109',  W:'Colchon Forte flex 140x190',AY:'16'},
           {G:'COLT0097',W:'COLCHON SEMIORTOP 85*180',AY:'1'},
           {G:'ch1280',  W:'COLCHON TITANIO ICE 140X200',AY:'1'},
           {G:'CH1195',  W:'ALMOHADA VISCOLASTICA NASA',AY:'33'},
           {G:'CH1246',  W:'ALMOHADA TRAVESSEIRO ANTISOFOCANTE NASA',AY:'19'},
           {G:'CH1129',  W:'COLCHON TITANIO LATEX 140X190',AY:'6'},
           /* El dueño (07/09): «Ya no se fabrica el Jr, ahora es antialérgico» + la tabla del
              antialérgico con sus códigos (CH2391…CH2396). O sea: el JUNIOR (CH1075) es OTRO
              colchón, discontinuado, y NO se suma al antialérgico (§4cz). */
           {G:'CH1075',  W:'COLCHON ESPECIAL JUNIOR 105X190',AY:'4'},
           {G:'CH2391',  W:'COLCHON ESPECIAL ANTIALERGICO 105X190',AY:'1'}];
    var R=existLeer(f); if(R.error) return {error:R.error};
    var por={}; R.items.forEach(function(i){ por[String(i.cod).toUpperCase()]={k:i.k, cant:i.cant, cat:i.cat}; });
    EXIST_IMP=R; renderImportExist(); confirmarImportExist();
    return { n:R.items.length, rep:R.repetidos, por:por, K:function(){}, sr:stockClave({codigo:'SR2012'}), alm:stockClave({codigo:'CD1403'}),
             pp:stockClave({codigo:'CH1683'}), semi:stockClave({codigo:'CD1913'}), cp:stockClave({codigo:'CS1011'}), ff:stockClave({codigo:'CH2109'}),
             nasa:stockClave({codigo:'CH1195'}) };
  });
  if(r.error){ chk('el reporte sintético se lee', false, r.error); }
  const P=(c)=>r.por[c]||{};
  chk('el reporte se lee entero (22 renglones) y NINGÚN renglón se sumó a otro', r.n===22 && r.rep===0, r.n+' items · repetidos='+r.rep);
  chk('⚠️ el «ESPECIAL JUNIOR» (CH1075) NO es el ESPECIAL ANTIALERGICO (CH2391): 4 y 1, no 5',
      P('CH1075').k==='ESPECIAL JUNIOR|105X190' && P('CH1075').cant===4 && P('CH2391').k==='ESPECIAL ANTIALERGICO|105X190' && P('CH2391').cant===1,
      P('CH1075').k+' ×'+P('CH1075').cant+' · '+P('CH2391').k+' ×'+P('CH2391').cant);
  chk('⚠️ SOMIER PARRILLA NEGRO (CH1297) NO es el SOMIER NEGRO (SR2012): 10 y 3, no 13',
      P('CH1297').k!==r.sr && P('SR2012').k===r.sr && P('CH1297').cant===10 && P('SR2012').cant===3, P('CH1297').k+' vs '+r.sr);
  chk('…y queda con su nombre crudo, con la medida aparte', P('CH1297').k==='SOMIER PARRILLA NEGRO|140X190', P('CH1297').k);
  chk('⚠️ la Almohada Heaven Celeste (CH1001) NO es la ALMOHADA 50x70 (CD1403): 28 y 21, no 49',
      P('CH1001').k!==r.alm && P('CD1403').k===r.alm && P('CH1001').cant===28, P('CH1001').k+' vs '+r.alm);
  chk('⚠️ el FORRO (una funda) NO es el colchón PILLOW PEDIC', P('ICH2195').k!==r.pp && /FORRO/.test(P('ICH2195').k), P('ICH2195').k);
  chk('⚠️ el SOMIER SEMIPEDIC NO es el colchón SEMIPEDIC', P('CH2151').k!==r.semi && /^SOMIER SEMIPEDIC\|105X190$/.test(P('CH2151').k), P('CH2151').k);
  chk('⚠️ SOMIER BAHIA BEIGE 1,5 y 2,0 son DOS renglones, cada uno con su medida',
      P('CD1941').k==='SOMIER BAHIA BEIGE|105X190' && P('CD1942').k==='SOMIER BAHIA BEIGE|140X190', P('CD1941').k+' · '+P('CD1942').k);
  chk('⚠️ SOMIER BAHIA NEGRO no es el SOMIER NEGRO (tiene BAHIA y NEGRO: empate → nombre propio)',
      P('CD2051').k==='SOMIER BAHIA NEGRO|105X190', P('CD2051').k);
  chk('SUEÑA CONFORT PLUS +2CM (CH1311) no se suma al CONFORT PLUS 1,5 (CS1011)', P('CH1311').k!==r.cp && P('CS1011').k===r.cp && P('CS1011').cant===6, P('CH1311').k);
  chk('FORTE FLEX 2,0 VER. 2026 (CH1262) no se suma al Forte flex 140x190 (CH2109), pero sí tiene su medida',
      P('CH1262').k!==r.ff && /\|140X190$/.test(P('CH1262').k) && P('CH2109').cant===16, P('CH1262').k);
  chk('«SEMIORTOP 85*180» conserva su medida rara', P('COLT0097').k==='SEMIORTOP|85X180', P('COLT0097').k);
  chk('un código en minúscula que el catálogo no conoce («ch1280») queda con su nombre, sin el COLCHON de relleno',
      P('CH1280').k==='TITANIO ICE|140X200' && P('CH1280').cat===false, P('CH1280').k);
  chk('⚠️ la ALMOHADA VISCOLASTICA NASA (CH1195) es la ALM/NASA del catálogo, y la TRAVESSEIRO (CH1246) es otra',
      P('CH1195').k===r.nasa && P('CH1246').k!==r.nasa && P('CH1195').cant===33, P('CH1195').k+' · '+P('CH1246').k);
  chk('lo del catálogo sigue resolviéndose por código (TITANIO LATEX 140)', P('CH1129').k==='TITANIO LATEX|140X190' && P('CH1129').cat===true, P('CH1129').k);

  // ══ 3. El pedido encuentra lo que el almacén tiene, con el nombre que sea ═══
  console.log('\n── 3. Lo que escribe la vendedora encuentra lo del almacén ──');
  r = await page.evaluate(() => {
    var f=function(d,m,c){ var k=stockClave({desc:d,medida:m||'',codigo:c||''}); return {k:k, hay:stockDeposito(k)}; };
    return { parrilla:f('SOMIER PARRILLA NEGRO 2 PLAZAS'), pedic:f('somier pedic 2 plazas'), negro:f('SOMIER NEGRO','140x190'),
             nasa:f('ALMOHADA NASA'), almo:f('ALMOHADA','50x70'), celeste:f('Almohada Heaven Celeste','50x70'),
             ssemi:f('SOMIER SEMIPEDIC 1.5 plz'), semi:f('SEMIPEDIC','105x190'), forro:f('FORRO PILLOW PEDIC 2,5'), pp:f('PILLOW PEDIC','160x190'),
             bahia:f('somier bahia beige 2 plazas'), bahiaN:f('SOMIER BAHIA NEGRO 1,5'), cp:f('CONFORT PLUS','105x190'),
             ice:f('TITANIO ICE 140x200'), ice2:f('COLCHON TITANIO ICE 140X200'), suena:f('COLCHON SUEÑA CONFORT PLUS 105X190 +2CM'),
             byHeaven:stockInfo({desc:'COLCHON SEMIPEDIC 2.5 PLAZAS 160X190CM BY HEAVEN',medida:''}),
             cod:stockNombreDe(stockInfo({desc:'ALMOHADA',medida:''}),{desc:'ALMOHADA'}).cod,
             cod2:stockNombreDe(stockInfo({desc:'ALMOHADA',medida:'50x70'}),{desc:'ALMOHADA',medida:'50x70'}).cod };
  });
  chk('⚠️ «SOMIER PARRILLA NEGRO 2 PLAZAS» es el del almacén (hay 10), no el SOMIER NEGRO del catálogo',
      r.parrilla.k==='SOMIER PARRILLA NEGRO|140X190' && r.parrilla.hay===10, r.parrilla.k+' → '+r.parrilla.hay);
  chk('«somier pedic 2 plazas» y «SOMIER NEGRO 140x190» son el SR2012 (hay 3)', r.pedic.k===r.negro.k && r.pedic.hay===3, r.pedic.k+' → '+r.pedic.hay);
  chk('⚠️ «ALMOHADA NASA» es la ALM/NASA del catálogo: hay 33 (antes mandaba a fabricar)', /ALM\/NASA/.test(r.nasa.k) && r.nasa.hay===33, r.nasa.k+' → '+r.nasa.hay);
  chk('«ALMOHADA 50x70» a secas sigue siendo la CD1403: hay 21, no 49', r.almo.k==='ALMOHADA|50X70' && r.almo.hay===21, r.almo.k+' → '+r.almo.hay);
  chk('«Almohada Heaven Celeste 50x70» es la del almacén: hay 28', r.celeste.k==='ALMOHADA HEAVEN CELESTE|50X70' && r.celeste.hay===28, r.celeste.k+' → '+r.celeste.hay);
  chk('⚠️ «SOMIER SEMIPEDIC 1.5 plz» es el somier (hay 1), no el colchón SEMIPEDIC (hay 7)',
      r.ssemi.k==='SOMIER SEMIPEDIC|105X190' && r.ssemi.hay===1 && r.semi.hay===7, r.ssemi.k+' → '+r.ssemi.hay);
  chk('«FORRO PILLOW PEDIC 2,5» es la funda (hay 5), no el colchón (hay 2)', r.forro.hay===5 && r.pp.hay===2, r.forro.k+' → '+r.forro.hay);
  chk('«somier bahia beige 2 plazas» encuentra el «SOMIER BAHIA BEIGE 2,0 - T.A.» (hay 10)', r.bahia.k==='SOMIER BAHIA BEIGE|140X190' && r.bahia.hay===10, r.bahia.k+' → '+r.bahia.hay);
  chk('«SOMIER BAHIA NEGRO 1,5» no es el SOMIER NEGRO: es el suyo (hay 1)', r.bahiaN.k==='SOMIER BAHIA NEGRO|105X190' && r.bahiaN.hay===1, r.bahiaN.k+' → '+r.bahiaN.hay);
  chk('«CONFORT PLUS 105x190» es el del catálogo (hay 6): el +2CM va aparte', r.cp.hay===6, r.cp.k+' → '+r.cp.hay);
  chk('«TITANIO ICE 140x200» y «COLCHON TITANIO ICE 140X200» son el mismo renglón del almacén (hay 1)',
      r.ice.k===r.ice2.k && r.ice.hay===1, r.ice.k+' · '+r.ice2.k);
  chk('«SUEÑA CONFORT PLUS +2CM»: SUEÑA es de otro producto → no se adivina, es el suyo (hay 1)', r.suena.hay===1 && !/^COLCHON CONFORT PLUS\|/.test(r.suena.k), r.suena.k+' → '+r.suena.hay);
  chk('…pero «BY HEAVEN» es marca, no otro producto: el SEMIPEDIC de ROHO sigue encontrándose',
      !!r.byHeaven.cat && r.byHeaven.cat.d==='SEMIPEDIC' && r.byHeaven.k==='SEMIPEDIC|160X190', r.byHeaven.k);
  chk('sin medida no hay código (sería el de UNA de las medidas); con medida sí', r.cod==='' && r.cod2==='CD1403', r.cod+' / '+r.cod2);

  // ══ 4. La misma clave en los dos almacenes es UNA candidata ═══════════════
  console.log('\n── 4. Un producto en los dos almacenes ──');
  r = await page.evaluate(() => {
    STOCK.g['IM - PRODUCTOTERMINADO']={ f:todayStr(), u:{ 'ALMOHADA|50X70':5 } }; STOCK.al['IM - PRODUCTOTERMINADO']='otro';
    stockOlvidarIndice();
    var k=stockClave({desc:'ALMOHADA',medida:''});
    delete STOCK.g['IM - PRODUCTOTERMINADO']; stockOlvidarIndice();
    return k;
  });
  chk('«ALMOHADA» sin medida, estando la 50x70 acá Y en Moreno, igual la encuentra (no ve «dos candidatas»)', r==='ALMOHADA|50X70', r);

  // ══ 5. Lo que ya no se fabrica (§4cz) ═════════════════════════════════════
  /* «Ya no se fabrica el Jr, ahora es antialérgico». Quedan 4 JUNIOR 105 en el almacén. Si
     alguien vende 6, faltan 2 — y esos 2 NO pueden ir al pedido a fábrica. */
  console.log('\n── 5. El JUNIOR: se vende lo que queda, no se pide ──');
  r = await page.evaluate(() => {
    var adel=function(n){ var d=new Date(); d.setDate(d.getDate()+n); return isoLocal(d); };
    var P=function(o){ return Object.assign({id:'p'+Math.random(),fecha:adel(1),oc:'190100',vendedor:'V',cliente:'C',celular:'70000000',
      turno:'AM',zona:'N',direccion:'x',maps:'',pagado:true,saldo:0,ts:Date.now(),metodoPago:'',observaciones:'',estado:'',entregado:false,
      vehiculo:'',chofer:'',garantia:'',nota:'',acuenta:0,facturarA:'',nit:'',nroDia:1,verificado:false,fotos:[]},o); };
    STATE=[ P({id:'j1',cliente:'Vende 6 junior',productos:[{desc:'ESPECIAL JUNIOR',medida:'105x190',codigo:'CH1075',cant:6}]}),
            P({id:'a1',cliente:'Vende 3 antialergico',productos:[{desc:'ESPECIAL ANTIALERGICO 1.5PLZ 105X190CM',medida:'',codigo:'',cant:3}]}),
            P({id:'a0',cliente:'Vende 1 antialergico 1 plz',productos:[{desc:'ESPECIAL ANTIALERGICO 1.0PLZ 90X190CM',medida:'',codigo:'',cant:1}]}) ];
    saveMirror(); REVSTK_DIAS='todos';
    var R=stockAsignar(), lin={};
    R.pedidos.forEach(function(g){ lin[g.p.id]=g.lineas[0]; });
    var d=stockData(), jr=d.lista.filter(function(o){ return o.k==='ESPECIAL JUNIOR|105X190'; })[0]||{};
    var t=''; var o=window.copyText; window.copyText=function(x){ t=x; }; copiarStock(); window.copyText=o;
    return { jr:lin.j1, anti:lin.a1, a0:lin.a0, k90:stockClave({desc:'ESPECIAL ANTIALERGICO 1.0PLZ 90X190CM',medida:''}),
             faltan:R.faltan.map(function(x){ return x.nom+' ×'+x.u; }), descont:R.descont.map(function(x){ return x.nom+' ×'+x.u; }),
             tot:R.tot.descont, aviso:jr.aviso, pedir:jr.pedir, ch1137:!!CODIGOS.CH1137, msg:t };
  });
  chk('⚠️ 6 JUNIOR con 4 en el almacén → ✗ no hay, y la línea dice que ya no se fabrica', r.jr && r.jr.ahora==='no' && r.jr.falta===2 && r.jr.descont===true, JSON.stringify(r.jr));
  chk('⚠️ …y esos 2 NO van a la lista de «hay que fabricar»: van a la de «no se fabrica más»',
      !r.faltan.some(function(s){ return /JUNIOR/.test(s); }) && r.descont.length===1 && /JUNIOR.*×2/.test(r.descont[0]) && r.tot===1, 'faltan='+r.faltan.join('|')+' · descont='+r.descont.join('|'));
  chk('el antialérgico 105 (CH2391) sí: 3 vendidos con 1 → ✗ y a fábrica', r.anti && r.anti.ahora==='no' && r.faltan.some(function(s){ return /ESPECIAL ANTIALERGICO · 105x190 ×2/i.test(s); }), JSON.stringify(r.faltan));
  chk('«ESPECIAL ANTIALERGICO 1.0PLZ 90X190CM» es el CH2396 nuevo', r.k90==='ESPECIAL ANTIALERGICO|90X190' && r.a0 && r.a0.ahora==='no', r.k90);
  chk('el CH1137 (que no está en la tabla del dueño) ya no existe en el catálogo', r.ch1137===false);
  chk('en la tabla el JUNIOR dice «se acaba y no se fabrica más», y no sugiere pedir', r.aviso==='agotado' && r.pedir===0, r.aviso+' · pedir '+r.pedir);
  chk('⚠️ el mensaje a la fábrica pide el antialérgico y NO el JUNIOR', /ESPECIAL ANTIALERGICO · 105x190/i.test(r.msg) && !/JUNIOR/.test(r.msg), r.msg.split('\n').filter(function(l){ return /^[•🚨]/.test(l); }).join(' / '));

  chk('la página no tiró ningún error de JavaScript', errores.length===0, errores.join(' | ').slice(0,300));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
