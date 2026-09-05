/* 📥 IMPORTAR LOS PEDIDOS DE ROHO DESDE SU EXCEL (§4ci).

   ROHO trabaja en otro sistema que no tiene ni API ni conector. Logística baja de ahí el
   reporte «DETALLE NOTA DE VENTA PARA PROVEEDOR» y lo sube al panel.

   ⚠️ CORRE CONTRA EL EXCEL DE VERDAD (`tests/datos/roho.xlsx`, el que mandó el dueño el
   05/09/2026, con los nombres de clientes cambiados). Un Excel inventado por mí probaría
   que mi lector entiende lo que yo mismo escribí, que no es lo que hay que probar: este
   archivo trae las rarezas reales —textos guardados «en línea» y no en la tabla compartida,
   una columna con 30.000 caracteres de HTML, teléfonos con +591, combos en una sola línea,
   notas repartidas en varias filas y entregas de hace meses—.

   Lo que se cuida:
   - que NO duplique: subir el mismo archivo dos veces no crea un pedido de más;
   - que NO pise nada de lo que ya está cargado;
   - que una nota con 3 productos sea UN pedido con 3 líneas;
   - que los combos se partan (el panel no acepta un combo en una sola línea);
   - que no invente zonas;
   - y que lo que no puede resolver lo DIGA antes de guardar, no después.

   Se corre:  node tests/test_roho.js   (desde la raíz del repo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const XLSX = path.resolve('tests/datos/roho.xlsx');
  if(!fs.existsSync(XLSX)){ console.log('✗ falta tests/datos/roho.xlsx'); process.exit(1); }
  const bytes = Array.from(fs.readFileSync(XLSX));

  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1500,height:1000} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  const armar = () => page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; MIS_TODOS=false;
    try{ localStorage.removeItem(LS_PEND); }catch(e){}
    NO_ENCOLAR={};
    var hoy=todayStr();
    /* Un pedido que YA ESTÁ CARGADO, con zona escrita por el equipo: sirve para dos cosas
       —comprobar que no se lo pisa, y darle al importador el vocabulario de zonas reales—. */
    window._pl=[{id:'ya1',fecha:hoy,oc:'188827',vendedor:'ROHO',cliente:'VICTOR GARCIA',
      productos:[{desc:'COLCHON FORTE FLEX',medida:'140x190',codigo:'',cant:1}],
      celular:'71039979',turno:'AM',zona:'Norte',direccion:'AV 6 DE AGOSTO',maps:'',pagado:true,
      saldo:0,ts:Date.now(),metodoPago:'',observaciones:'NO ME TOQUES',estado:'',entregado:false,
      vehiculo:'',chofer:'',garantia:'',nota:'',acuenta:0,facturarA:'',nit:'',nroDia:1,verificado:false,fotos:[]}];
    window._guardados=[]; window._falla=null;
    apiSave=function(rec){
      if(window._falla) { var f=window._falla(rec); if(f) return Promise.resolve(f); }
      window._guardados.push(JSON.parse(JSON.stringify(rec)));
      window._pl.push(JSON.parse(JSON.stringify(rec)));
      return Promise.resolve({ok:true, pedido:rec});
    };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(window._pl))}); };
    STATE=JSON.parse(JSON.stringify(window._pl)); saveMirror(); updateStats();
    document.getElementById('admin-lock').style.display='none';
    document.getElementById('admin-content').style.display='block';
  });

  const leer = (arr) => page.evaluate(async (a) => {
    const buf = new Uint8Array(a).buffer;
    const archivos = await xlsxDescomprimir(buf);
    const filas = xlsxHoja(archivos);
    const r = rohoArmarPedidos(filas);
    return { r:r, nFilas:filas.length, hojas:Object.keys(archivos).filter(k=>/worksheets/.test(k)) };
  }, arr);

  await armar();

  // ══ 1. Leer el archivo de verdad ═══════════════════════════════════════════
  console.log('\n── 1. Leer el .xlsx sin librerías ──');
  let { r, nFilas } = await leer(bytes);
  chk('abre el Excel y encuentra las filas', nFilas>30, nFilas);
  chk('no devolvió error', !r.error, r.error);
  chk('⚠️ lee los textos guardados «en línea» (así los manda ROHO)',
      !!(r.nuevos.concat(r.viejos)[0]||{}).cliente, JSON.stringify((r.nuevos.concat(r.viejos)[0]||{}).cliente));

  // ══ 2. Agrupar por nota ════════════════════════════════════════════════════
  console.log('\n── 2. Una nota = un pedido ──');
  const todos = r.nuevos.concat(r.viejos, r.yaEstan, r.sinFecha);
  chk('35 líneas del Excel se agrupan en 32 notas', todos.length===32, todos.length+' notas');
  const n185088 = todos.filter(p=>p.oc==='185088')[0];
  chk('⚠️ la nota 185088 (3 líneas en el Excel) es UN pedido', !!n185088);
  chk('…con sus 3 productos adentro (más los somieres de los combos)',
      n185088 && n185088.productos.length>=3, n185088 && n185088.productos.length);
  const n182240 = todos.filter(p=>p.oc==='182240')[0];
  chk('la nota 182240 (2 líneas) también es UNA sola', !!n182240 && n182240.productos.length>=2,
      n182240 && n182240.productos.length);

  // ══ 3. Fechas ══════════════════════════════════════════════════════════════
  console.log('\n── 3. Las fechas ──');
  const { hoy, manana } = await page.evaluate(()=>({hoy:todayStr(), manana:tomorrowStr()}));
  chk('convierte el número de Excel a fecha de verdad',
      /^\d{4}-\d{2}-\d{2}$/.test((todos[0]||{}).fecha||''), (todos[0]||{}).fecha);
  /* ⚠️ REGLA DEL DUEÑO: «si hoy es 05, agendar los del 06 en adelante». El camión de hoy
     ya está armado y salió; meterle una entrega más no la hace llegar. */
  chk('⚠️ solo son «nuevas» las entregas de MAÑANA en adelante',
      r.nuevos.every(p=>p.fecha>=manana), 'mañana='+manana+' · '+r.nuevos.map(p=>p.fecha).join(' '));
  chk('⚠️ …las de HOY quedan afuera, con las pasadas',
      !r.nuevos.some(p=>p.fecha===hoy), 'hoy='+hoy);
  chk('…y las de hoy o de antes se separan para decidirlas aparte',
      r.viejos.length>0 && r.viejos.every(p=>p.fecha<manana), r.viejos.length+' apartadas');

  // ══ 4. No duplicar ni pisar ════════════════════════════════════════════════
  console.log('\n── 4. Lo que ya está cargado ──');
  chk('⚠️ la nota 188827, que ya está en el panel, NO se vuelve a crear',
      r.yaEstan.some(p=>p.oc==='188827') && !r.nuevos.some(p=>p.oc==='188827'),
      'ya estaban: '+r.yaEstan.map(p=>p.oc).join(','));

  // ══ 5. Los combos ══════════════════════════════════════════════════════════
  console.log('\n── 5. Los combos se parten ──');
  const combo = await page.evaluate(() => ({
    conMas: rohoPartirCombo('COMBO COLCHON PILLOWFLEX+SOMIER 3 PLAZAS 180X190CM FLEX'),
    espacios: rohoPartirCombo('COMBO COLCHON EUROPEDIC + SOMIER 2 PLAZAS FULL HEAVEN'),
    sinMas: rohoPartirCombo('COMBO COLCHON ECO FLEX 2 PLAZAS 140X190CM FLEX'),
    normal: rohoPartirCombo('COLCHON ECO FLEX 2 PLAZAS 140X190CM FLEX')
  }));
  chk('⚠️ «COMBO …PILLOWFLEX+SOMIER…» se parte en dos', combo.conMas.length===2, JSON.stringify(combo.conMas));
  chk('…y al colchón le queda la medida, que estaba solo al final',
      /180X190/i.test(combo.conMas[0]) && /^COLCHON/i.test(combo.conMas[0]), combo.conMas[0]);
  chk('…y el somier queda como somier', /^SOMIER/i.test(combo.conMas[1]), combo.conMas[1]);
  chk('con espacios alrededor del «+» también', combo.espacios.length===2, JSON.stringify(combo.espacios));
  chk('⚠️ un COMBO que NO dice «+somier» igual lleva somier (lo confirmó el dueño)',
      combo.sinMas.length===2 && /^SOMIER/i.test(combo.sinMas[1]), JSON.stringify(combo.sinMas));
  chk('un producto normal NO se parte', combo.normal.length===1, JSON.stringify(combo.normal));
  chk('⚠️ ninguna línea importada empieza con «COMBO» — el panel las rechaza',
      !todos.some(p=>p.productos.some(x=>/^\s*comb/i.test(x.desc))),
      (todos.flatMap(p=>p.productos).filter(x=>/^\s*comb/i.test(x.desc))[0]||{}).desc);
  /* Y comprobado con la PROPIA función del panel, no con un regex mío: es la que va a
     rechazar el pedido si mañana alguien lo edita. */
  const rechazados = await page.evaluate(
      (descs) => descs.filter(function(d){ return esCombo(d); }),
      todos.reduce((a,p)=>a.concat(p.productos.map(x=>x.desc)),[]));
  chk('…comprobado con la propia función del panel (`esCombo`)', rechazados.length===0, rechazados.slice(0,2).join(' | '));

  // ══ 6. Celular, zona y dirección ═══════════════════════════════════════════
  console.log('\n── 6. Los datos del cliente ──');
  const cel = await page.evaluate(() => ({
    con591: rohoCel('+59171039979'), sinPlus: rohoCel('59171039979'),
    pelado: rohoCel('71039979'), fijo: rohoCel('+5913345678'), vacio: rohoCel('')
  }));
  chk('«+59171039979» queda en 8 dígitos', cel.con591==='71039979', cel.con591);
  chk('…también sin el «+»', cel.sinPlus==='71039979', cel.sinPlus);
  chk('…y uno ya pelado no se toca', cel.pelado==='71039979', cel.pelado);
  chk('⚠️ un número que no es celular boliviano se descarta', cel.fijo==='' && cel.vacio==='', cel.fijo);
  chk('la mayoría de los pedidos trae celular',
      todos.filter(p=>p.celular).length >= todos.length-2, todos.filter(p=>!p.celular).length+' sin celular');

  const zona = await page.evaluate(() => ({
    dice: rohoZona('VALLE SANCHEZ, ZONA NORTE'),
    equip: rohoZona('3ER ANIILLO EQUIPETROL CALLE NRO8, ZONA EQUIPETROL'),
    delEquipo: rohoZona('AV 6 DE AGOSTO CONDOMINIO ESPIRITU SANTO NORTE'),
    nada: rohoZona('CALLE LIMON EDIFICIO BARUC 2DO ANILLO AV. ALEMANA')
  }));
  chk('saca la zona cuando la dirección la dice', zona.dice==='Norte', zona.dice);
  chk('…también «ZONA EQUIPETROL»', zona.equip==='Equipetrol', zona.equip);
  chk('⚠️ NO inventa la zona por avenida ni por anillo — la deja vacía', zona.nada==='', zona.nada);
  /* ⚠️ EL FALSO POSITIVO QUE VIO EL DUEÑO en la primera vista previa de verdad: a una
     clienta de «AV.VIRGEN DE COTOCA» le puso zona «Cotoca», que queda a media hora para el
     otro lado. Buscar el nombre de la zona suelto adentro de la dirección no sirve: tiene
     que ser un TRAMO ENTERO. */
  const falso = await page.evaluate(() => {
    var st=STATE.slice();
    STATE=st.concat([{id:'z1',zona:'Cotoca',fecha:todayStr(),vendedor:'ROHO',cliente:'X',productos:[],
      celular:'',turno:'AM',direccion:'',maps:'',pagado:false,saldo:0,ts:1,metodoPago:'',observaciones:'',
      estado:'',entregado:false,vehiculo:'',chofer:'',garantia:'',nota:'',acuenta:0,facturarA:'',nit:'',
      oc:'zz1',nroDia:0,verificado:false,fotos:[]}]);
    var r={ avenida: rohoZona('AV.VIRGEN DE COTOCA 3ER ANILLO EXTERNO, CALLE SARGENTO LEONARDO'),
            tramo:   rohoZona('CALLE 5, COTOCA, CASA VERDE') };
    STATE=st; return r;
  });
  chk('⚠️ «AV.VIRGEN DE COTOCA» NO es la zona Cotoca', falso.avenida==='', falso.avenida);
  chk('…pero «…, COTOCA, …» como tramo propio sí', falso.tramo==='Cotoca', falso.tramo);
  chk('…y reconoce una zona que el equipo YA usa cuando va como tramo', zona.delEquipo==='', zona.delEquipo);
  chk('la dirección le saca el «Santa Cruz de la Sierra, Bolivia» que repite en todas',
      !todos.some(p=>/santa cruz de la sierra/i.test(p.direccion)),
      (todos.filter(p=>/santa cruz/i.test(p.direccion))[0]||{}).direccion);
  chk('la referencia del domicilio va en las observaciones',
      todos.some(p=>/📍/.test(p.obs)), (todos[0]||{}).obs);
  chk('⚠️ y NO se cuela el HTML gigante de la columna RESUMEN',
      !todos.some(p=>/<div|<img|<span/i.test(JSON.stringify(p))), 'limpio');

  // ══ 7. La vista previa dice qué va a hacer ANTES de hacerlo ════════════════
  console.log('\n── 7. La vista previa ──');
  let vp = await page.evaluate(async (a) => {
    const buf = new Uint8Array(a).buffer;
    ROHO_IMP = rohoArmarPedidos(xlsxHoja(await xlsxDescomprimir(buf)));
    ROHO_TURNO='AM'; ROHO_VIEJOS=false;
    renderImportRoho();
    return { txt:(document.getElementById('modal-box').textContent||'').replace(/\s+/g,' '),
             abierto:document.getElementById('modal').classList.contains('on'),
             guardados:window._guardados.length, enState:STATE.length };
  }, bytes);
  chk('se abre la ventana con el resumen', vp.abierto);
  chk('⚠️ …y TODAVÍA no guardó nada', vp.guardados===0 && vp.enState===1, vp.guardados+' guardados');
  chk('dice cuántos son nuevos', /pedidos? nuevos? para entregar/.test(vp.txt), vp.txt.slice(0,150));
  chk('dice cuántos ya estaban', /ya estaban cargados/.test(vp.txt), '');
  chk('dice cuántos son para hoy o para días pasados', /para hoy o para días que ya pasaron/.test(vp.txt), vp.txt.slice(120,300));
  chk('⚠️ y dice desde qué fecha va a agendar (mañana)',
      vp.txt.indexOf(await page.evaluate(()=>fmtFecha(tomorrowStr())))>=0, await page.evaluate(()=>fmtFecha(tomorrowStr())));
  chk('⚠️ avisa de los combos que partió', /combos? partidos?/.test(vp.txt), '');
  chk('⚠️ avisa de los que quedan sin zona', /sin zona/.test(vp.txt), '');
  chk('deja elegir el turno', /Todos AM/.test(vp.txt) && /Repartir/.test(vp.txt), '');

  // ══ 8. Importar de verdad ══════════════════════════════════════════════════
  console.log('\n── 8. Crear los pedidos ──');
  let imp = await page.evaluate(async () => {
    confirmarImportRoho();
    await new Promise(r=>setTimeout(r,1500));
    var creados=window._guardados;
    return { n:creados.length,
             vendedores:Array.from(new Set(creados.map(p=>p.vendedor))),
             turnos:Array.from(new Set(creados.map(p=>p.turno))),
             ocs:creados.map(p=>p.oc),
             viejo:STATE.filter(p=>p.id==='ya1')[0],
             progreso:(document.getElementById('roho-progreso')||{}).textContent||'' };
  });
  chk('crea los pedidos nuevos', imp.n===r.nuevos.length && imp.n>0, imp.n+' de '+r.nuevos.length);
  chk('⚠️ todos quedan a nombre de ROHO', imp.vendedores.length===1 && imp.vendedores[0]==='ROHO', imp.vendedores.join(','));
  chk('con el turno elegido', imp.turnos.length===1 && imp.turnos[0]==='AM', imp.turnos.join(','));
  chk('⚠️ NO importó las de hoy ni las pasadas (no estaban tildadas)',
      !imp.ocs.some(oc=>r.viejos.some(p=>p.oc===oc)), imp.ocs.join(','));
  chk('⚠️ NO tocó el pedido que ya estaba', imp.viejo && imp.viejo.observaciones==='NO ME TOQUES',
      imp.viejo && imp.viejo.observaciones);
  /* ✅ EL RESULTADO TIENE QUE VERSE Y CONTESTAR «¿de verdad entraron?».
     El dueño: *"ese letrero abajo de «4 pedidos creados» ni se ve ahí abajo"* — era un
     renglón debajo del botón, o sea fuera de la pantalla justo cuando más importa. */
  const fin = await page.evaluate(() => ({
    txt:(document.getElementById('modal-box').textContent||'').replace(/\s+/g,' '),
    abierto:document.getElementById('modal').classList.contains('on'),
    filas:[].slice.call(document.querySelectorAll('#modal-box tbody tr')).map(t=>t.textContent.replace(/\s+/g,' ').trim()),
    botones:[].slice.call(document.querySelectorAll('#modal-box .modal-actions button')).map(b=>b.textContent.trim())
  }));
  /* El título dice «en la planilla» y ya no «creados» (§4cl): «creado» era ambiguo —lo
     decía igual de uno que solo había quedado en la cola de este dispositivo—. */
  chk('⚠️ al terminar, el resultado ocupa la ventana entera (no un renglón perdido abajo)',
      fin.abierto && /pedidos? de ROHO en la planilla/.test(fin.txt), fin.txt.slice(0,90));
  chk('⚠️ …y dice, día por día, cómo quedó el CUPO del turno después de importar',
      /Cupo del turno/.test(fin.txt) && fin.filas.some(t=>/de \d+/.test(t)), fin.filas[0]||'');
  chk('…y qué notas entraron en cada día', fin.filas.some(t=>/1887\d\d|1888\d\d/.test(t)), fin.filas[0]||'');
  chk('…con un botón para ir a verlos en la tabla',
      fin.botones.some(b=>/Ver los pedidos/.test(b)), JSON.stringify(fin.botones));

  const irA = await page.evaluate(() => {
    var mes=(window._guardados[0]||{}).fecha.slice(0,7);
    irAImportadosRoho(mes);
    return { modal:document.getElementById('modal').classList.contains('on'),
             vista:document.getElementById('view-admin').classList.contains('active'),
             modo:segVal('adm-mode'), mes:(document.getElementById('adm-mes')||{}).value,
             busca:(document.getElementById('adm-search')||{}).value,
             enTabla:(document.getElementById('tbl-pedidos').textContent||'').indexOf('ROHO')>=0 };
  });
  chk('el botón cierra la ventana y lleva a Administración', irA.modal===false && irA.vista===true, JSON.stringify(irA));
  chk('…al mes de las entregas importadas y buscando ROHO', irA.busca==='ROHO' && irA.modo==='mes', irA.modo+' · '+irA.mes+' · '+irA.busca);
  chk('⚠️ …y ahí están, en la tabla', irA.enTabla===true, irA.enTabla);

  /* ⚠️ EL PEDIDO GUARDADO TIENE QUE LLEVAR TODO LO QUE EL EXCEL TRAE. El dueño preguntó
     dos veces si la dirección y el teléfono se importaban: sí se importaban, pero la vista
     previa mostraba 5 columnas y no se veían. Esto lo comprueba en el pedido GUARDADO, que
     es lo que de verdad importa, y no en la pantalla. */
  const guardado = await page.evaluate(() => {
    var g=window._guardados;
    return { conDir: g.filter(p=>p.direccion&&p.direccion.length>5).length,
             conCel: g.filter(p=>/^[67]\d{7}$/.test(p.celular)).length,
             conRecibe: g.filter(p=>/Recibe:/.test(p.observaciones||'')).length,
             conNit: g.filter(p=>p.nit).length,
             total: g.length, muestra: g[0] };
  });
  chk('⚠️ todos los pedidos creados llevan la DIRECCIÓN del Excel',
      guardado.conDir===guardado.total, guardado.conDir+' de '+guardado.total+' · ej: '+((guardado.muestra||{}).direccion||'').slice(0,60));
  chk('⚠️ …y el CELULAR, en 8 dígitos',
      guardado.conCel===guardado.total, guardado.conCel+' de '+guardado.total+' · ej: '+(guardado.muestra||{}).celular);
  chk('⚠️ …y «quién recibe» va en las observaciones',
      guardado.conRecibe===guardado.total, guardado.conRecibe+' de '+guardado.total+' · ej: '+((guardado.muestra||{}).observaciones||'').slice(0,80));
  chk('…y el CI/NIT cuando el Excel lo trae', guardado.conNit>=0, guardado.conNit+' con NIT');

  /* Y que la vista previa los MUESTRE: el dueño no puede confiar en algo que no ve. */
  const columnas = await page.evaluate(() => {
    renderImportRoho();
    return [].slice.call(document.querySelectorAll('#modal-box thead th')).map(t=>t.textContent.trim());
  });
  chk('⚠️ la vista previa muestra la dirección, el celular y las observaciones',
      ['Celular','Dirección','Observaciones'].every(c=>columnas.indexOf(c)>=0), columnas.join(' | '));

  // ══ 9. Subirlo DOS VECES no duplica ════════════════════════════════════════
  console.log('\n── 9. El mismo archivo dos veces ──');
  let dos = await page.evaluate(async (a) => {
    var antes=window._guardados.length;
    const buf = new Uint8Array(a).buffer;
    ROHO_IMP = rohoArmarPedidos(xlsxHoja(await xlsxDescomprimir(buf)));
    ROHO_TURNO='AM'; ROHO_VIEJOS=false;
    var nuevos=ROHO_IMP.nuevos.length, yaEstan=ROHO_IMP.yaEstan.length;
    confirmarImportRoho();
    await new Promise(r=>setTimeout(r,900));
    return { nuevos:nuevos, yaEstan:yaEstan, antes:antes, despues:window._guardados.length,
             ocsRepetidas: ocsRepetidas().length };
  }, bytes);
  chk('⚠️ la segunda vez NO hay ningún pedido nuevo que crear', dos.nuevos===0, dos.nuevos);
  /* Los reconocidos son los 9 que se acaban de importar + el que ya estaba. Las 22 de
     fecha pasada NO se importaron (no estaban tildadas), así que siguen contando como
     viejas y no como cargadas — que es justo lo correcto. */
  chk('…reconoce como ya cargados los que acaba de crear, más el que ya estaba',
      dos.yaEstan===r.nuevos.length+1, dos.yaEstan+' (esperado '+(r.nuevos.length+1)+')');
  chk('⚠️ y no se guardó ni un pedido de más', dos.despues===dos.antes, dos.antes+' → '+dos.despues);
  chk('⚠️ no quedó ninguna OC repetida en el panel', dos.ocsRepetidas===0, dos.ocsRepetidas);

  // ══ 10. Si el servidor dice que no, se informa y no se inventa nada ════════
  console.log('\n── 10. Cuando el servidor rechaza ──');
  let rech = await page.evaluate(async (a) => {
    window._pl=window._pl.filter(p=>p.id==='ya1'); window._guardados=[];
    STATE=JSON.parse(JSON.stringify(window._pl)); saveMirror();
    var n=0;
    window._falla=function(){ n++; return n<=2 ? {ok:false, error:'cupos_llenos', turno:'AM', fecha:todayStr()} : null; };
    const buf = new Uint8Array(a).buffer;
    ROHO_IMP = rohoArmarPedidos(xlsxHoja(await xlsxDescomprimir(buf)));
    ROHO_TURNO='AM'; ROHO_VIEJOS=false;
    var aCrear=ROHO_IMP.nuevos.length;
    confirmarImportRoho();
    await new Promise(r=>setTimeout(r,1500));
    return { aCrear:aCrear, guardados:window._guardados.length,
             enState:STATE.filter(p=>p.vendedor==='ROHO'&&p.id!=='ya1').length,
             /* El detalle de los rechazos vive en la pantalla de resultado, no en el
                renglón de progreso: ese quedaba debajo del botón y no se veía. */
             resultado:(document.getElementById('modal-box')||{}).textContent||'' };
  }, bytes);
  chk('los que el servidor rechaza NO quedan en pantalla como si hubieran entrado',
      rech.enState===rech.guardados, rech.enState+' en pantalla vs '+rech.guardados+' guardados');
  chk('⚠️ …y se dice cuáles fallaron y por qué', /no entraron/.test(rech.resultado) && /lleno/.test(rech.resultado),
      rech.resultado.replace(/\s+/g,' ').slice(0,160));
  chk('…y que se pueden volver a subir con el mismo Excel',
      /volv[ée] a subir el mismo Excel/.test(rech.resultado), rech.resultado.replace(/\s+/g,' ').slice(-160));
  chk('los demás sí entran', rech.guardados===rech.aCrear-2, rech.guardados+' de '+(rech.aCrear-2));

  /* ══ 11. LOS CUATRO HALLAZGOS DE LA AUDITORÍA EXTERNA (§4cl) ══════════════
     Los cuatro se reprodujeron antes de tocar nada, con los números exactos que decía el
     informe. Quedan anclados acá porque ninguno de ellos rompe nada visible: el pedido se
     crea igual, solo que con el turno, la cantidad o el estado equivocados. */
  const armarLista = (page, notas) => page.evaluate((notas) => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; NO_ENCOLAR={};
    try{ localStorage.removeItem(LS_PEND); }catch(e){}
    STATE=[]; saveMirror(); window._g=[];
    apiSave=function(rec){ window._g.push(JSON.parse(JSON.stringify(rec))); return Promise.resolve({ok:true,pedido:rec}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
    ROHO_IMP={nuevos:notas, viejos:[], yaEstan:[], sinFecha:[], malos:[], filas:notas.length};
    ROHO_VIEJOS=false;
  }, notas);

  console.log('\n── 11. Reparto AM/PM: cada pedido se cuenta UNA vez ──');
  let rep = await page.evaluate(async () => {
    var d=new Date(); do{ d.setDate(d.getDate()+1); }while(d.getDay()===0||d.getDay()===6);
    var F=isoLocal(d), lista=[];
    for(var i=0;i<12;i++) lista.push({ oc:'N'+i, fecha:F, cliente:'C', celular:'70000000',
      direccion:'x', zona:'Norte', nit:'', pagado:true, obs:'', combos:0,
      productos:[{desc:'COLCHON',medida:'140x190',codigo:'',cant:1}] });
    STATE=[]; saveMirror(); window._g=[];
    apiSave=function(rec){ window._g.push(JSON.parse(JSON.stringify(rec))); return Promise.resolve({ok:true,pedido:rec}); };
    ROHO_IMP={nuevos:lista, viejos:[], yaEstan:[], sinFecha:[], malos:[], filas:12};
    ROHO_TURNO='repartir'; ROHO_VIEJOS=false;
    confirmarImportRoho();
    await new Promise(r=>setTimeout(r,2600));
    return { am:window._g.filter(p=>p.turno==='AM').length, pm:window._g.filter(p=>p.turno==='PM').length,
             lim:limTurno(F,'AM') };
  });
  chk('⚠️ con 12 lugares libres, los 12 van a AM (antes repartía 6 y 6)',
      rep.am===12 && rep.pm===0, 'AM '+rep.am+' · PM '+rep.pm+' · límite AM '+rep.lim);

  let sab = await page.evaluate(async () => {
    var d=new Date(); do{ d.setDate(d.getDate()+1); }while(d.getDay()!==6);
    var F=isoLocal(d), lista=[];
    for(var i=0;i<10;i++) lista.push({ oc:'S'+i, fecha:F, cliente:'C', celular:'70000000',
      direccion:'x', zona:'Norte', nit:'', pagado:true, obs:'', combos:0,
      productos:[{desc:'COLCHON',medida:'140x190',codigo:'',cant:1}] });
    STATE=[]; saveMirror(); window._g=[];
    apiSave=function(rec){ window._g.push(JSON.parse(JSON.stringify(rec))); return Promise.resolve({ok:true,pedido:rec}); };
    ROHO_IMP={nuevos:lista, viejos:[], yaEstan:[], sinFecha:[], malos:[], filas:10};
    ROHO_TURNO='repartir';
    confirmarImportRoho();
    await new Promise(r=>setTimeout(r,2400));
    return { am:window._g.filter(p=>p.turno==='AM').length, pm:window._g.filter(p=>p.turno==='PM').length,
             limPM:limTurno(F,'PM') };
  });
  chk('⚠️ el SÁBADO no tiene turno PM: ninguno se manda ahí', sab.pm===0 && sab.am===10,
      'AM '+sab.am+' · PM '+sab.pm+' · límite PM del sábado '+sab.limPM);

  let parcial = await page.evaluate(async () => {
    /* El AM ya tiene 10 de 12 ocupados por pedidos de otras vendedoras: solo 2 caben. */
    var d=new Date(); do{ d.setDate(d.getDate()+1); }while(d.getDay()===0||d.getDay()===6);
    var F=isoLocal(d);
    STATE=[];
    for(var k=0;k<10;k++) STATE.push({id:'otro'+k,fecha:F,turno:'AM',vendedor:'Mirian Salazar',
      cliente:'X',oc:'x'+k,productos:[],celular:'',zona:'',direccion:'',maps:'',pagado:true,saldo:0,
      ts:1,metodoPago:'',observaciones:'',estado:'',entregado:false,vehiculo:'',chofer:'',garantia:'',
      nota:'',acuenta:0,facturarA:'',nit:'',nroDia:k+1,verificado:false,fotos:[]});
    saveMirror(); window._g=[];
    apiSave=function(rec){ window._g.push(JSON.parse(JSON.stringify(rec))); return Promise.resolve({ok:true,pedido:rec}); };
    var lista=[];
    for(var i=0;i<5;i++) lista.push({ oc:'P'+i, fecha:F, cliente:'C', celular:'70000000',
      direccion:'x', zona:'Norte', nit:'', pagado:true, obs:'', combos:0,
      productos:[{desc:'COLCHON',medida:'140x190',codigo:'',cant:1}] });
    ROHO_IMP={nuevos:lista, viejos:[], yaEstan:[], sinFecha:[], malos:[], filas:5};
    ROHO_TURNO='repartir';
    confirmarImportRoho();
    await new Promise(r=>setTimeout(r,1800));
    return { am:window._g.filter(p=>p.turno==='AM').length, pm:window._g.filter(p=>p.turno==='PM').length };
  });
  chk('⚠️ con el AM a 10 de 12, entran 2 al AM y el resto al PM', parcial.am===2 && parcial.pm===3,
      'AM '+parcial.am+' · PM '+parcial.pm);

  console.log('\n── 12. Creado ≠ guardado en la planilla ──');
  let red = await page.evaluate(async () => {
    var d=new Date(); do{ d.setDate(d.getDate()+1); }while(d.getDay()===0||d.getDay()===6);
    STATE=[]; saveMirror(); try{ localStorage.removeItem(LS_PEND); }catch(e){}
    window._g=[]; CONNECTED=true;
    apiSave=function(){ return Promise.reject(new Error('sin señal')); };
    ROHO_IMP={nuevos:[{ oc:'R1', fecha:isoLocal(d), cliente:'SIN RED', celular:'70000000',
      direccion:'x', zona:'Norte', nit:'', pagado:true, obs:'', combos:0,
      productos:[{desc:'COLCHON',medida:'140x190',codigo:'',cant:1}] }], viejos:[], yaEstan:[], sinFecha:[], malos:[], filas:1};
    ROHO_TURNO='AM';
    confirmarImportRoho();
    await new Promise(r=>setTimeout(r,900));
    var t=(document.getElementById('modal-box').textContent||'').replace(/\s+/g,' ');
    return { confirmados:window._g.length, enCola:getPending().length, txt:t,
             titulo:(document.querySelector('#modal-box .modal-h h3')||{}).textContent||'',
             pie:(document.getElementById('footer').textContent||'') };
  });
  chk('⚠️ si se corta la red, NO dice que están en la planilla',
      !/Ya están en la planilla/.test(red.txt), red.titulo);
  chk('…lo dice al revés: no llegaron al servidor todavía',
      /NO llegaron al servidor/.test(red.txt), red.txt.slice(0,120));
  chk('⚠️ …y avisa que todavía NO ocupan lugar en ningún camión',
      /no ocupan lugar/i.test(red.txt), red.txt.slice(0,220));
  chk('el pedido no se pierde: queda en la cola de «sin enviar»', red.enCola===1, red.enCola);
  chk('…y el pie de página lo muestra', /sin enviar/.test(red.pie), red.pie.slice(0,90));
  chk('…y dice qué nota quedó pendiente', /R1/.test(red.txt), '');

  let local = await page.evaluate(async () => {
    var d=new Date(); do{ d.setDate(d.getDate()+1); }while(d.getDay()===0||d.getDay()===6);
    STATE=[]; saveMirror(); try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CONNECTED=false;
    ROHO_IMP={nuevos:[{ oc:'R2', fecha:isoLocal(d), cliente:'SIN PLANILLA', celular:'70000000',
      direccion:'x', zona:'Norte', nit:'', pagado:true, obs:'', combos:0,
      productos:[{desc:'COLCHON',medida:'140x190',codigo:'',cant:1}] }], viejos:[], yaEstan:[], sinFecha:[], malos:[], filas:1};
    ROHO_TURNO='AM';
    confirmarImportRoho();
    await new Promise(r=>setTimeout(r,700));
    var t=(document.getElementById('modal-box').textContent||'').replace(/\s+/g,' ');
    CONNECTED=true;
    return { enCola:getPending().length, afirma:/Ya están en la planilla/.test(t) };
  });
  chk('⚠️ sin planilla conectada tampoco dice que están guardadas allá', local.afirma===false);
  chk('…y queda en la cola, no solo en la pantalla (antes se perdía)', local.enCola===1, local.enCola);

  console.log('\n── 13. La cantidad no se inventa ──');
  const cant = await page.evaluate(() => {
    var hdr={A:'FECHA PROGRAMADA',B:'# NOTA DE VENTA',C:'DESCRIPCION',D:'CANTIDAD',E:'NOMBRE CLIENTE',F:'DIRECCION',G:'STATUS'};
    var d=new Date(); d.setDate(d.getDate()+3);
    var serial=Math.round((d-new Date(Date.UTC(1899,11,30)))/86400000);
    var fila=function(n,c){ return {A:String(serial),B:n,C:'COLCHON ECO FLEX 2 PLAZAS 140X190CM',D:c,E:'CLI',F:'calle',G:'PAGADA'}; };
    STATE=[];
    var res=rohoArmarPedidos([hdr, fila('Q1','0'), fila('Q2','-3'), fila('Q3','2,5'),
                              fila('Q4','abc'), fila('Q5','4'), fila('Q6','2,0'), fila('Q7','1.0')]);
    var imp={}; (res.nuevos||[]).forEach(function(p){ imp[p.oc]=(p.productos[0]||{}).cant; });
    var mal={}; (res.malos||[]).forEach(function(p){ mal[p.oc]=p.malo; });
    ROHO_IMP=res; ROHO_TURNO='AM'; ROHO_VIEJOS=false; renderImportRoho();
    return { imp:imp, mal:mal, pantalla:(document.getElementById('modal-box').textContent||'').replace(/\s+/g,' ') };
  });
  chk('⚠️ «0», «-3», «2,5» y «abc» NO se convierten en 1', Object.keys(cant.mal).sort().join(',')==='Q1,Q2,Q3,Q4',
      'rechazadas: '+Object.keys(cant.mal).join(',')+' · importadas: '+JSON.stringify(cant.imp));
  chk('…esas notas no se importan', !('Q3' in cant.imp) && !('Q1' in cant.imp), JSON.stringify(cant.imp));
  chk('⚠️ …y la vista previa dice cuál y por qué', /cantidad ilegible/.test(cant.pantalla) && /Q3/.test(cant.pantalla),
      cant.pantalla.slice(cant.pantalla.indexOf('no se importa'), cant.pantalla.indexOf('no se importa')+150));
  chk('«4» y «1.0» se leen bien', cant.imp.Q5===4 && cant.imp.Q7===1, JSON.stringify(cant.imp));
  chk('…y «2,0» con coma también', cant.imp.Q6===2, cant.imp.Q6);

  console.log('\n── 14. «NO PAGADO» no es pagado ──');
  const pago = await page.evaluate(() => ({
    pagada:rohoPagado('PAGADA'), pagado:rohoPagado('PAGADO'),
    noPagado:rohoPagado('NO PAGADO'), noPagada:rohoPagado('NO PAGADA'),
    pend:rohoPagado('PENDIENTE'), parcial:rohoPagado('PAGO PARCIAL'),
    vacio:rohoPagado(''), raro:rohoPagado('EN REVISION'),
    conocido:rohoEstadoConocido('EN REVISION'), conocido2:rohoEstadoConocido('PAGADA')
  }));
  chk('⚠️ «NO PAGADO» ya NO se lee como pagado', pago.noPagado===false && pago.noPagada===false,
      'NO PAGADO→'+pago.noPagado+' · NO PAGADA→'+pago.noPagada);
  chk('«PAGADA» y «PAGADO» sí', pago.pagada===true && pago.pagado===true);
  chk('«PENDIENTE» y «PAGO PARCIAL» no', pago.pend===false && pago.parcial===false);
  chk('⚠️ un estado que no se entiende queda como NO pagado (que el chofer pregunte es recuperable)',
      pago.raro===false && pago.vacio===false);
  chk('…y se sabe que no se entendió', pago.conocido===false && pago.conocido2===true);

  chk('la página no tiró ningún error de JavaScript', errors.length===0, errors.join(' | ').slice(0,300));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
