/* 🧾 MIS PEDIDOS: EL NÚMERO DE NOTA, SOLO PARA EDUARDO (07/10, §4hu).

   El dueño: «en mis pedidos las fichas de mis pedidos no muestran el nro de nota, ejemplo eduardo no puede saber qué
   número de OC es. Que solo a eduardo muestre también número de nota». La «OC 10-050» de la tarjeta es la serie del
   panel; el número que él busca es el de «N° Nota de venta».

   Lo que se mira:
     1. Con «Eduardo Añez» elegido: la tarjeta dice «Nota 4567» al lado de la OC; sin nota dice «sin nota»; una ATC o
        una RPT no dicen nada (no llevan nota). La ficha que se abre al tocarla lo dice arriba.
     2. Con una vendedora elegida: su tarjeta y su ficha siguen igual, aunque el pedido tenga nota.
     3. El nombre escrito distinto («Eduardo Anez», «EDUARDO AÑEZ») es el mismo Eduardo.
     4. «Ver todos» de administración: decide el nombre elegido, como en lo demás.
     5. La nota se escribe como texto (no como HTML), y quien llama a la tarjeta sin el 4° dato decide por el campo.

   ⚠️ Reloj clavado en el miércoles 07/10/2026 a las 10 de Bolivia, `timezoneId:'America/La_Paz'`.
   Se corre:  node tests/test_mis_nota.js          (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/al/viejo/pedidos.html node tests/test_mis_nota.js
   Solo datos sintéticos: el repo es público. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,300)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const RELOJ = '2026-10-07T10:00:00-04:00';           // miércoles, 10 de la mañana en Bolivia

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{width:390,height:844}, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(RELOJ));
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);

  await page.evaluate(() => {
    CONNECTED=false;
    if(typeof CARGA_TIMER!=='undefined' && CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; }
    if(typeof CARGA_TIC!=='undefined' && CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
    showView('mis');
  });
  await page.waitForTimeout(150);          // showView refresca con la foto de STATE de ese momento: el fixture va después

  await page.evaluate(() => {
    var P=function(o){ return Object.assign({id:'x'+Math.random(),fecha:'2026-10-09',oc:'10-001',
      vendedor:'Eduardo Añez',cliente:'MULTICENTER',productos:[{desc:'ESPECIAL SEMIORTOPEDICO',medida:'140x190',cant:1,precio:1641.5}],
      celular:'70000001',turno:'AM',zona:'PARQUE INDUSTRIAL',direccion:'Almacén',maps:'',pagado:false,saldo:1641.5,
      ts:Date.parse('2026-10-06T10:00:00-04:00'),metodoPago:'',observaciones:'',estado:'',entregado:false,vehiculo:'',chofer:'',garantia:'',
      nota:'',acuenta:0,facturarA:'',nit:'',nroDia:1,verificado:false,fotos:[]},o); };
    STATE=[
      P({id:'e-con',  oc:'10-050', nota:'4567'}),
      P({id:'e-sin',  oc:'10-051', nota:''}),
      P({id:'e-atc',  oc:'ATC 10-001', cliente:'UNA ATC', saldo:0}),
      P({id:'e-rpt',  oc:'RPT 10-001', cliente:'Mia Plaza', saldo:0}),
      P({id:'e-html', oc:'10-053', nota:'<img src=x onerror="window.__xss=1">'}),
      P({id:'c-con',  oc:'10-052', nota:'1024', vendedor:'Carola Chavez', cliente:'CLIENTE DE CAROLA'})
    ];
    /* Elige el nombre en Mis pedidos (como la vendedora) y devuelve el texto de cada tarjeta y de la ficha. */
    window.__ver=function(nombre, todos){
      UNLOCKED=!!todos; MIS_TODOS=!!todos; MIS_FILTER='todos'; if(typeof MIS_TOPE!=='undefined') MIS_TOPE=120;
      document.getElementById('mis-vendedor').value=nombre;
      renderMis();
      var cards=[].slice.call(document.querySelectorAll('#mis-lista .cho-card'));
      var de=function(id){ var c=cards.filter(function(x){ return (x.getAttribute('onclick')||'').indexOf("'"+id+"'")>=0; })[0];
                           return c?c.textContent.replace(/\s+/g,' '):null; };
      var ficha=function(id){ showMisModal(id); var h=document.querySelector('#modal-box .modal-h h3'); var t=h?h.textContent:null; closeModal(); return t; };
      var o={ cards:cards.length };
      ['e-con','e-sin','e-atc','e-rpt','e-html','c-con'].forEach(function(id){ o[id]=de(id); });
      o.fichaCon=ficha('e-con'); o.fichaSin=ficha('e-sin'); o.fichaCarola=ficha('c-con'); o.fichaAtc=ficha('e-atc');
      return o;
    };
  });

  // ══ 1. Eduardo ve la nota ═══════════════════════════════════════════════════
  console.log('\n── 1. Con «Eduardo Añez» elegido ──');
  let r = await page.evaluate(() => __ver('Eduardo Añez'));
  chk('sus 5 pedidos están en la lista (los de Carola no)', r.cards===5 && r['c-con']===null, r.cards);
  chk('la tarjeta dice la OC y la NOTA: «OC 10-050 · Nota 4567»', /OC 10-050 · Nota 4567/.test(r['e-con']||''), r['e-con']);
  chk('un pedido sin nota lo DICE: «OC 10-051 · sin nota»', /OC 10-051 · sin nota/.test(r['e-sin']||''), r['e-sin']);
  chk('una ATC no dice nota (no lleva)', r['e-atc'] && !/Nota|sin nota/.test(r['e-atc']), r['e-atc']);
  chk('una RPT no dice nota (no lleva)', r['e-rpt'] && !/Nota|sin nota/.test(r['e-rpt']), r['e-rpt']);
  chk('la ficha que se abre al tocarla también la dice arriba: «MULTICENTER · OC 10-050 · Nota 4567»',
      r.fichaCon==='MULTICENTER · OC 10-050 · Nota 4567', r.fichaCon);
  chk('…y la de un pedido sin nota queda como estaba', r.fichaSin==='MULTICENTER · OC 10-051', r.fichaSin);
  chk('…y la de la ATC también', r.fichaAtc==='UNA ATC · ATC 10-001', r.fichaAtc);

  // ══ 2. Una vendedora no la ve ═══════════════════════════════════════════════
  console.log('\n── 2. Con una vendedora elegida ──');
  r = await page.evaluate(() => __ver('Carola Chavez'));
  chk('Carola ve solo lo suyo', r.cards===1 && r['e-con']===null, r.cards);
  chk('su tarjeta sigue igual: la OC sí, la nota NO (aunque el pedido tenga nota 1024)',
      /OC 10-052/.test(r['c-con']||'') && !/Nota|sin nota|1024/.test(r['c-con']||''), r['c-con']);
  chk('su ficha tampoco dice la nota', r.fichaCarola==='CLIENTE DE CAROLA · OC 10-052', r.fichaCarola);

  // ══ 3. El nombre escrito distinto ════════════════════════════════════════════
  console.log('\n── 3. El mismo Eduardo escrito de otra forma ──');
  r = await page.evaluate(() => __ver('Eduardo Anez'));
  chk('«Eduardo Anez» (sin ñ) también ve la nota', /OC 10-050 · Nota 4567/.test(r['e-con']||''), r['e-con']);
  r = await page.evaluate(() => __ver('EDUARDO AÑEZ'));
  chk('«EDUARDO AÑEZ» también', /OC 10-050 · Nota 4567/.test(r['e-con']||''), r['e-con']);

  // ══ 4. «Ver todos» de administración ════════════════════════════════════════
  console.log('\n── 4. «Ver todos» (administración) ──');
  r = await page.evaluate(() => __ver('Carola Chavez', true));
  chk('con «Ver todos» y Carola elegida: están los 6 y ninguna tarjeta dice la nota',
      r.cards===6 && !/Nota 4567/.test(r['e-con']||'') && !/Nota 1024/.test(r['c-con']||''), [r.cards, r['e-con'], r['c-con']]);
  r = await page.evaluate(() => __ver('Eduardo Añez', true));
  chk('con «Ver todos» y Eduardo elegido: la ve en todas (también en la de Carola)',
      r.cards===6 && /Nota 4567/.test(r['e-con']||'') && /OC 10-052 · Nota 1024/.test(r['c-con']||''), [r.cards, r['c-con']]);

  // ══ 5. Texto, no HTML; y quien llama sin el 4° dato ═════════════════════════
  console.log('\n── 5. Seguridad y compatibilidad ──');
  r = await page.evaluate(async () => {
    __ver('Eduardo Añez');
    await new Promise(x=>setTimeout(x,50));
    var html=(document.getElementById('mis-lista').innerHTML||'');
    var o={ xss:!!window.__xss, escapado:html.indexOf('Nota &lt;img')>=0 };
    // Como `test_modif`: tarjeta con 3 datos → decide el nombre que está en el campo.
    document.getElementById('mis-vendedor').value='Eduardo Añez';
    o.tresEdu=misCardHtml(findById('e-con'), 1, false).indexOf('Nota 4567')>=0;
    document.getElementById('mis-vendedor').value='Carola Chavez';
    o.tresCar=misCardHtml(findById('e-con'), 1, false).indexOf('Nota 4567')>=0;
    return o;
  });
  chk('una nota con símbolos se muestra como texto: no se ejecuta nada', !r.xss && r.escapado, r);
  chk('misCardHtml con 3 datos (como lo llaman las pruebas viejas): Eduardo en el campo → la ve', r.tresEdu===true, r);
  chk('…y con una vendedora en el campo → no', r.tresCar===false, r);

  chk('la página no tiró ningún error de JavaScript', errors.length===0, errors.join(' | ').slice(0,300));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
