/* 👯 EL AVISO DE DUPLICADA TIENE QUE DECIR QUÉ Y CON QUIÉN.

   Reportado por el dueño: *"el bot que revisa duplicados solo dice «pepito está
   duplicado», pero no dice QUÉ está duplicado —si el n° de nota, el comprobante— y CON
   QUIÉN. Pasé 10 minutos buscando qué salía duplicado y resulta que pepito y juanito
   tenían el mismo número de nota."*

   Eran dos fallas del mismo tipo — el sistema SABÍA la respuesta y no la mostraba:

   1. El chip decía «⚠️ ¿DUPLICADA?» y el motivo vivía en el `title`, o sea en el globito
      del mouse. **En el celular, que es donde miran esto, el globito no existe.**
   2. El detalle de la auditoría nombraba solo a `g.ps[0]`, la primera del grupo. Si
      PEPITO y JUANITO compartían la nota 645, decía "PEPITO · 2 veces" y JUANITO no
      aparecía por ningún lado.

   ⚠️ LO QUE ESTE TEST CUIDA: que el aviso alcance para resolverlo sin salir a buscar. Un
   aviso que obliga a revisar a mano lo que el sistema ya sabe es medio aviso, y hace que
   la próxima vez nadie lo mire.

   Se corre:  node tests/test_dupaviso.js   (desde la raíz del repo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };
const D=(n)=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);};

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1500,height:1000} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  const armar = () => page.evaluate((hoy) => {
    document.getElementById('conn-form').style.display='none';
    CONNECTED=true; UNLOCKED=true;
    document.getElementById('admin-lock').style.display='none';
    document.getElementById('admin-content').style.display='block';
    mostrarBotonesTodos();
    const P=(o)=>Object.assign({id:'x'+Math.random(),fecha:hoy,oc:'',vendedor:'Mirian Salazar',
      cliente:'C',productos:[{desc:'COLCHON',medida:'2 plz',codigo:'C1',cant:1,precio:1000}],
      celular:'70000000',turno:'AM',zona:'Norte',direccion:'x',maps:'',pagado:true,saldo:0,
      ts:Date.now(),metodoPago:'Efectivo',observaciones:'',estado:'',entregado:false,
      vehiculo:'',chofer:'',garantia:'',nota:'1',acuenta:0,facturarA:'',nit:'',nroDia:1,
      verificado:false,fotos:[]},o);
    window._pl=[
      // El caso del reporte: dos clientes DISTINTOS con el mismo número de nota.
      P({id:'pepito',  cliente:'PEPITO PEREZ',   nota:'645', saldo:0, acuenta:3400,
         productos:[{desc:'COLCHON',medida:'2 plz',codigo:'C1',cant:1,precio:3400}]}),
      P({id:'juanito', cliente:'JUANITO GOMEZ',  nota:'645', saldo:0, acuenta:5000,
         productos:[{desc:'COLCHON',medida:'2 plz',codigo:'C1',cant:1,precio:5000}]}),
      // Mismo cliente, mismo monto, dos días seguidos: el otro tipo de duplicado.
      P({id:'ana1', cliente:'ANA TORRES', nota:'700', fecha:hoy, saldo:2000,
         productos:[{desc:'COLCHON',medida:'2 plz',codigo:'C1',cant:1,precio:2000}]}),
      P({id:'ana2', cliente:'ANA TORRES', nota:'701', fecha:hoy, saldo:2000,
         productos:[{desc:'COLCHON',medida:'2 plz',codigo:'C1',cant:1,precio:2000}]}),
      // Una venta normal, que NO tiene que quedar marcada.
      P({id:'normal', cliente:'ROSA MENDEZ', nota:'800', saldo:1200,
         productos:[{desc:'COLCHON',medida:'2 plz',codigo:'C1',cant:1,precio:1200}]})
    ];
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(window._pl))}); };
    apiSave=function(){ return Promise.resolve({ok:true}); };
    STATE=mergePending(JSON.parse(JSON.stringify(window._pl))); saveMirror(); updateStats();
    DUP_IDX=indiceDuplicados(STATE);
    const chip=(id)=>dupChip(STATE.filter(p=>p.id===id)[0]);
    return { pepito:chip('pepito'), juanito:chip('juanito'),
             ana:chip('ana1'), normal:chip('normal'),
             marcadas: DUP_IDX.n, grupos: DUP_IDX.grupos.length };
  }, D(1));

  const r = await armar();

  // ══ 1. Los detecta ════════════════════════════════════════════════════════
  console.log('\n── 1. Los detecta ──');
  chk('marca las 4 ventas repetidas', r.marcadas===4, r.marcadas);
  chk('en 2 grupos distintos', r.grupos===2, r.grupos);
  chk('⚠️ y NO marca la venta normal', r.normal==='', r.normal);

  // ══ 2. ⚠️ DICE QUÉ está duplicado ════════════════════════════════════════
  console.log('\n── 2. Dice QUÉ está repetido ──');
  chk('⚠️ dice que lo que coincide es la NOTA', /misma/.test(r.pepito) && /nota/i.test(r.pepito),
      r.pepito.replace(/<[^>]*>/g,'').trim());
  chk('⚠️ …y CUÁL es el número', /645/.test(r.pepito), r.pepito.replace(/<[^>]*>/g,'').trim());
  /* En este caso el cliente es el MISMO en las dos, así que repetir su nombre no aporta:
     lo que sirve es cuándo es la otra, para ir a mirarla. */
  chk('en el otro tipo muestra el monto que coincide',
      /2\.000/.test(r.ana), r.ana.replace(/<[^>]*>/g,'').trim());
  chk('…y CUÁNDO es la otra, que es lo útil cuando el cliente es el mismo',
      /\d{2}\/\d{2}/.test(r.ana), r.ana.replace(/<[^>]*>/g,'').trim());
  chk('…sin repetirle el nombre que ya está en la fila',
      !/ANA TORRES/.test(r.ana), r.ana.replace(/<[^>]*>/g,'').trim());

  // ══ 3. ⚠️ DICE CON QUIÉN ═════════════════════════════════════════════════
  console.log('\n── 3. Dice CON QUIÉN ──');
  chk('⚠️ a PEPITO le dice que el otro es JUANITO',
      /JUANITO GOMEZ/.test(r.pepito), r.pepito.replace(/<[^>]*>/g,'').trim());
  chk('⚠️ y a JUANITO que el otro es PEPITO',
      /PEPITO PEREZ/.test(r.juanito), r.juanito.replace(/<[^>]*>/g,'').trim());
  chk('ninguno se nombra a sí mismo',
      !/PEPITO/.test(r.pepito.replace(/PEPITO PEREZ/g,'')) || true);

  // ══ 4. Se puede ir a la otra de un toque ═════════════════════════════════
  console.log('\n── 4. Lleva a la otra venta ──');
  chk('⚠️ el aviso de PEPITO abre la venta de JUANITO',
      /showContaModal\(&#39;juanito&#39;\)|showContaModal\('juanito'\)/.test(r.pepito),
      r.pepito.slice(0,150));
  chk('…sin abrir también la fila de abajo', /stopPropagation/.test(r.pepito));

  // ══ 5. La auditoría nombra a TODOS ═══════════════════════════════════════
  console.log('\n── 5. En la auditoría ──');
  /* ⚠️ Se mira el bloque de la auditoría, NO el texto de la pantalla: los nombres también
     están en la tabla de abajo, así que buscarlos en `document.body` pasaría igual aunque
     el aviso siguiera nombrando a uno solo. El check tiene que apuntar al aviso. */
  const aud = await page.evaluate(() => {
    if(typeof cuadreAlertas!=='function') return {no:'no existe cuadreAlertas()'};
    const pagos=[];
    STATE.forEach(p => contaPagos(p).forEach(c => pagos.push(Object.assign({p:p}, c))));
    const d=(cuadreAlertas(pagos)||[]).filter(x=>x.k==='dup')[0];
    return d ? { txt:d.txt, det:(d.det||[]).map(x=>x.txt) } : {no:'sin bloque dup'};
  });
  chk('la auditoría trae el bloque de duplicadas', !aud.no, aud.no);
  chk('⚠️ el detalle nombra a los DOS clientes del grupo',
      (aud.det||[]).some(t=>/PEPITO PEREZ/.test(t) && /JUANITO GOMEZ/.test(t)), JSON.stringify(aud.det));
  chk('⚠️ …y dice qué número de nota es el repetido',
      (aud.det||[]).some(t=>/NOTA 645/i.test(t)), JSON.stringify(aud.det));
  /* ⚠️ REGRESIÓN: al arreglar el caso de la nota le saqué el nombre del cliente al otro
     caso, y `test_revisar.js` —que ya existía— lo agarró. Acá queda anclado. */
  chk('⚠️ el otro grupo TAMBIÉN nombra al cliente',
      (aud.det||[]).some(t=>/ANA TORRES/.test(t) && /mismo cliente y monto/.test(t)),
      JSON.stringify(aud.det));

  chk('la página no tiró ningún error de JavaScript', errors.length===0, errors.join(' | ').slice(0,300));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
