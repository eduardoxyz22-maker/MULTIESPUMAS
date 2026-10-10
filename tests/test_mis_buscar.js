/* 🔎 MIS PEDIDOS: BUSCAR POR NOTA, CLIENTE, PRODUCTO U OC (10/10, §4jf).

   El dueño: «en mis pedidos eduardo necesita un buscador, para buscar por nro de nota, nombre cliente o producto».

   Lo que se mira:
     1. El campo aparece con un nombre elegido (y no sin nombre).
     2. Encuentra por N° de nota (también sin el guion: «08230» = «08-230»), por cliente sin acentos ni mayúsculas, por
        producto (nombre y código) y por OC. Varias palabras = tienen que estar todas.
     3. Al empezar a buscar estando en «📅 Hoy», pasa a «📋 Todos» (una nota vieja no es de hoy).
     4. Los chips cuentan dentro de lo encontrado; los números de arriba (Total cargados) no cambian.
     5. Sin resultados lo dice; ✕ limpia y vuelven todos. Escribir no le saca el foco al campo.
     6. Solo busca en los pedidos del vendedor elegido.

   ⚠️ Reloj clavado en el sábado 10/10/2026 a las 10 de Bolivia. Solo datos sintéticos: el repo es público.
   Se corre:  node tests/test_mis_buscar.js          Dientes:  PEDIDOS=/ruta/a/pedidos_viejo.html node tests/test_mis_buscar.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,300)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{width:390,height:844}, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-10-10T10:00:00-04:00'));
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.route(/^https?:/, r=>r.abort());
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    CONNECTED=false;
    try{ CARGA_GEN++; CARGA_ESTADO='ok'; clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    showView('mis');
  });
  await page.waitForTimeout(150);

  const r0 = await page.evaluate(() => {
    var P=function(o){ return Object.assign({id:'x'+Math.random(),fecha:'2026-10-12',oc:'10-001',
      vendedor:'Eduardo Añez',cliente:'C',productos:[{desc:'COLCHON SOFT',codigo:'CH1000',medida:'140x190',cant:1}],
      celular:'70000001',turno:'AM',zona:'NORTE',direccion:'x',maps:'',pagado:false,saldo:100,
      ts:Date.parse('2026-10-01T10:00:00-04:00'),metodoPago:'',entregado:false,nota:'',acuenta:0,facturarA:''},o); };
    STATE=[
      P({id:'a', oc:'08-120', nota:'08-230', cliente:'MULTICENTER', fecha:'2026-08-20', entregado:true, productos:[{desc:'TITANIO LATEX',codigo:'CH2001',medida:'160x200',cant:2}]}),
      P({id:'b', oc:'10-050', nota:'4567', cliente:'José Pérez Ñuflo', fecha:'2026-10-10'}),
      P({id:'c', oc:'10-051', nota:'4568', cliente:'TIENDA CENTRO', fecha:'2026-10-10', productos:[{desc:'TITANIO LATEX',codigo:'CH2002',medida:'140x190',cant:1}]}),
      P({id:'d', oc:'10-052', nota:'', cliente:'OTRO', fecha:'2026-10-13', productos:[{desc:'SOMIER ORO',codigo:'SM100',medida:'160x200',cant:1}]}),
      P({id:'z', oc:'10-060', nota:'4567', cliente:'CLIENTE DE CAROLA', vendedor:'Carola Chavez'})
    ];
    document.getElementById('mis-q').value=''; MIS_Q=''; MIS_FILTER='todos';
    var mv=document.getElementById('mis-vendedor'); mv.value=''; renderMis();
    var sinNombre=getComputedStyle(document.getElementById('mis-busca')).display;
    mv.value='Eduardo Añez'; renderMis();
    return { sinNombre:sinNombre, conNombre:getComputedStyle(document.getElementById('mis-busca')).display };
  });
  chk('1. sin nombre no hay buscador; con nombre sí', r0.sinNombre==='none' && r0.conNombre==='flex', r0);

  // Escribe como una persona (teclado real) y devuelve qué tarjetas se ven
  const buscar = async (txt) => {
    await page.fill('#mis-q', '');
    await page.focus('#mis-q');
    if (txt) await page.keyboard.type(txt, { delay:5 });
    await page.waitForTimeout(60);
    return page.evaluate(() => {
      var ocs=[].slice.call(document.querySelectorAll('#mis-lista .cho-card')).map(function(c){ var m=c.innerText.match(/(\d{2}-\d{3})/); return m?m[1]:'?'; });
      var chips={}; [].slice.call(document.querySelectorAll('#mis-chips .qchip')).forEach(function(b){ chips[b.innerText.replace(/\s*\d+$/,'').trim()]=Number((b.querySelector('.n')||{}).textContent); });
      var tot=[].slice.call(document.querySelectorAll('#mis-metrics .mc')).map(function(d){ return d.textContent.replace(/\s+/g,' '); }).filter(function(t){ return /Total cargados/.test(t); })[0]||'';
      return { ocs:ocs.sort(), filtro:MIS_FILTER, info:document.getElementById('mis-q-info').innerText, empty:getComputedStyle(document.getElementById('mis-empty')).display==='none'?'':document.getElementById('mis-empty').innerText,
        foco:document.activeElement && document.activeElement.id, x:getComputedStyle(document.getElementById('mis-q-x')).display, chips:chips, tot:tot };
    });
  };

  // 3. desde «Hoy», buscar una nota vieja
  await page.evaluate(() => { setMisFiltro('hoy'); });
  let r = await buscar('08-230');
  chk('2. por N° de nota «08-230» encuentra el pedido de agosto', JSON.stringify(r.ocs)==='["08-120"]', r);
  chk('3. …aunque estaba en «📅 Hoy»: la búsqueda pasa a «📋 Todos»', r.filtro==='todos', r.filtro);
  chk('5. …el campo sigue con el foco mientras se escribe, y aparece la ✕', r.foco==='mis-q' && r.x!=='none', r);
  chk('…dice cuántos encontró', /1 pedido con «08-230»/.test(r.info), r.info);
  r = await buscar('08230');
  chk('…sin el guion («08230») también', JSON.stringify(r.ocs)==='["08-120"]', r.ocs);
  r = await buscar('jose perez');
  chk('2. por cliente sin acentos ni mayúsculas («jose perez» → José Pérez Ñuflo)', JSON.stringify(r.ocs)==='["10-050"]', r.ocs);
  r = await buscar('titanio');
  chk('2. por producto («titanio» → los dos pedidos con TITANIO)', JSON.stringify(r.ocs)==='["08-120","10-051"]', r.ocs);
  chk('4. los chips cuentan dentro de lo encontrado (Todos 2, Entregados 1); Total cargados sigue 4', r.chips['📋 Todos']===2 && r.chips['🚚 Entregados']===1 && /Total cargados ?4 ?histórico/.test(r.tot), r);
  r = await buscar('titanio 140');
  chk('…varias palabras: tienen que estar todas («titanio 140» → solo el 140x190)', JSON.stringify(r.ocs)==='["10-051"]', r.ocs);
  r = await buscar('sm100');
  chk('2. por código de producto («sm100»)', JSON.stringify(r.ocs)==='["10-052"]', r.ocs);
  r = await buscar('10-052');
  chk('2. por OC', JSON.stringify(r.ocs)==='["10-052"]', r.ocs);
  r = await buscar('4567');
  chk('6. solo los pedidos del vendedor elegido (la nota 4567 de Carola no aparece)', JSON.stringify(r.ocs)==='["10-050"]', r.ocs);
  r = await buscar('nadaquever');
  chk('5. sin resultados lo dice', r.ocs.length===0 && /Ningún pedido tuyo tiene «nadaquever»/.test(r.empty), r);
  await page.click('#mis-q-x'); await page.waitForTimeout(60);
  r = await page.evaluate(() => ({ n:document.querySelectorAll('#mis-lista .cho-card').length, q:document.getElementById('mis-q').value, MIS_Q:MIS_Q, x:getComputedStyle(document.getElementById('mis-q-x')).display }));
  chk('5. ✕ limpia y vuelven los cuatro', r.n===4 && r.q==='' && r.MIS_Q==='' && r.x==='none', r);

  chk('ningún error de JavaScript', errors.length===0, errors.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
