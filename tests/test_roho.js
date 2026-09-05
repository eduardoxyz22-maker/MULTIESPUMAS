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
  chk('…y reconoce una zona que el equipo YA usa', zona.delEquipo==='Norte', zona.delEquipo);
  chk('⚠️ NO inventa la zona por avenida ni por anillo — la deja vacía', zona.nada==='', zona.nada);
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
  chk('avisa cuántos creó', /pedidos? creados?|pedido creado/.test(imp.progreso), imp.progreso.slice(0,90));

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
             progreso:(document.getElementById('roho-progreso')||{}).textContent||'' };
  }, bytes);
  chk('los que el servidor rechaza NO quedan en pantalla como si hubieran entrado',
      rech.enState===rech.guardados, rech.enState+' en pantalla vs '+rech.guardados+' guardados');
  chk('⚠️ …y se dice cuáles fallaron y por qué', /no entraron/.test(rech.progreso) && /lleno/.test(rech.progreso),
      rech.progreso.replace(/\s+/g,' ').slice(0,140));
  chk('los demás sí entran', rech.guardados===rech.aCrear-2, rech.guardados+' de '+(rech.aCrear-2));

  chk('la página no tiró ningún error de JavaScript', errors.length===0, errors.join(' | ').slice(0,300));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
