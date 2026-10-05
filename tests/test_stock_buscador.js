/* 🔎 EL BUSCADOR DEL STOCK, EN LA BARRA DE ARRIBA (§4hp, 05/10).

   El dueño, con la pantalla de Stock abierta en el iPad: «no hay un buscado en stock....». El buscador EXISTÍA
   (desde §4cp) pero vivía abajo de los cuadros de hoy, la revisión automática, «qué producir» y las tiendas: tres
   pantallas más abajo, nadie lo encontraba. Lo que este test cuida:
   1. `#stk-q` está en la barra FIJA de arriba (fuera de `#stock-body`), a la vista apenas se abre la pantalla, y es
      UNO solo (la tabla ya no dibuja otro).
   2. Con algo escrito, los cuadros grandes se esconden y queda la tabla filtrada + el cartel «🔎 Buscando…».
      Busca por nombre y por código.
   3. Escribir no pierde el cursor ni lo manda al final: la barra no se redibuja con la tabla.
   4. «Borrar la búsqueda» (o vaciar el campo con la ✕ del navegador) devuelve los cuadros.
   5. Cerrar y volver a abrir la pantalla mantiene lo buscado en el campo.
   6. En el iPad parado (820 px) el campo sigue a la vista, arriba.

   Se corre:  node tests/test_stock_buscador.js   (desde la raíz del repo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };
const J=(x)=>JSON.stringify(x);

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{width:1500,height:1000}, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  const faltan = await page.evaluate(() => ['stockBuscar','stockFiltroLimpiar','abrirStock','renderStock','stockClave','proximoDiaEntrega'].filter(f => typeof window[f] !== 'function'));
  if(faltan.length){
    chk('el panel tiene la pantalla de stock con buscador', false, 'faltan: '+faltan.join(', '));
    console.log('\n'+PASS+' bien · '+FAIL+' mal'); await browser.close(); process.exit(1);
  }

  /* Tres productos con saldo y un pedido pendiente cada uno (así entran en la tabla «lo que se mueve»):
     COLCHON SMART 140x190 (CH2522, §4ho), TITANIO ICE 160x190 (CH1201) y NUEVO ECO FLEX 140x190 (CH1332). */
  const armar = (p) => p.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    apiSave=function(rec){ return Promise.resolve({ok:true, pedido:rec}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
    var manana=proximoDiaEntrega();
    var P=function(o){ return Object.assign({id:'p'+Math.random(),fecha:manana,oc:'',vendedor:'Carola Chavez',
      cliente:'C',celular:'70000000',turno:'AM',zona:'Norte',direccion:'x',maps:'',pagado:true,saldo:0,
      ts:Date.now(),metodoPago:'',observaciones:'',estado:'',entregado:false,vehiculo:'',chofer:'',
      garantia:'',nota:'',acuenta:0,facturarA:'',nit:'',nroDia:1,verificado:true,fotos:[]},o); };
    STATE=[
      P({id:'s1', productos:[{desc:'COLCHON SMART',medida:'140x190',codigo:'CH2522',cant:1}]}),
      P({id:'t1', productos:[{desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201',cant:2}]}),
      P({id:'e1', productos:[{desc:'ECO FLEX',medida:'140x190',codigo:'CH1332',cant:1}]})
    ];
    STOCK={ c:{f:todayStr(), u:{}}, e:[], p:[], a:{} };
    STOCK.c.u[stockClave({codigo:'CH2522'})]=5;
    STOCK.c.u[stockClave({codigo:'CH1201'})]=8;
    STOCK.c.u[stockClave({codigo:'CH1332'})]=3;
    STOCK_FILTRO={ q:'', aviso:'', marca:'', medida:'', orden:'', dir:1 };
    saveMirror(); updateStats();
    abrirStock();
  });
  await armar(page);
  await page.waitForTimeout(250);

  const foto = (p) => p.evaluate(() => {
    var q=document.getElementById('stk-q'), body=document.getElementById('stock-body');
    var r=q?q.getBoundingClientRect():null;
    var filas=[].slice.call(document.querySelectorAll('#stock-body tr[data-stock-k]')).map(function(tr){ return (tr.querySelector('td')||{}).textContent.replace(/\s+/g,' ').trim().slice(0,40); });
    return { hay:!!q, unico:document.querySelectorAll('#stk-q').length, enBody:!!(q && body && body.contains(q)),
             visible:!!(q && r && r.width>0 && r.height>0), top:r?Math.round(r.top):null, right:r?Math.round(r.right):null, ancho:window.innerWidth,
             valor:q?q.value:null, foco:document.activeElement===q, caret:q?q.selectionStart:null,
             q:STOCK_FILTRO.q, buscando:!!document.getElementById('stk-buscando'),
             cuadros:{ producir:!!document.getElementById('producir'), revision:/🤖 Revisión automática · /.test(body.textContent), tiendas:/🏪|tiendas/i.test(body.textContent) },
             filas:filas };
  });

  // ══ 1. Está arriba, a la vista, y es uno solo ═══════════════════════════════════════
  console.log('\n── 1. El buscador está en la barra de arriba, a la vista ──');
  let r = await foto(page);
  chk('⚠️ hay un buscador `#stk-q`, UNO solo', r.hay && r.unico===1, J({hay:r.hay, unico:r.unico}));
  chk('…fuera de `#stock-body`: vive en la barra fija de arriba', r.enBody===false);
  chk('…visible apenas se abre la pantalla, arriba de todo (sin scroll)', r.visible && r.top!=null && r.top>=0 && r.top<60, 'top='+r.top);
  chk('…y sin escribir nada, los cuadros grandes están (qué producir y la revisión automática)', r.cuadros.producir && r.cuadros.revision, J(r.cuadros));
  chk('…con los tres productos en la tabla', r.filas.length===3, J(r.filas));
  chk('sin errores de JS al abrir', errors.length===0, errors.join(' | '));

  // ══ 2. Escribir filtra, esconde los cuadros y no pierde el cursor ═══════════════════
  console.log('\n── 2. Escribir filtra la tabla y esconde los cuadros ──');
  await page.click('#stk-q');
  await page.keyboard.type('smart', { delay:30 });
  await page.waitForTimeout(450);   // el debounce de 180 ms ya dibujó
  r = await foto(page);
  chk('⚠️ con «smart» escrito, la tabla muestra SOLO el SMART', r.q==='smart' && r.filas.length===1 && /SMART/.test(r.filas[0]), J({q:r.q, filas:r.filas}));
  chk('…los cuadros grandes se esconden (qué producir, revisión, tiendas)', !r.cuadros.producir && !r.cuadros.revision && !r.cuadros.tiendas, J(r.cuadros));
  chk('…y aparece el cartel «🔎 Buscando» con el enlace para borrar', r.buscando && await page.evaluate(() => /Borrar la búsqueda/.test(document.getElementById('stk-buscando').textContent)));
  chk('…el campo sigue con el foco y el cursor al final de lo escrito', r.foco && r.caret===5 && r.valor==='smart', J({foco:r.foco, caret:r.caret, valor:r.valor}));

  // El cursor en el MEDIO: se escribe adelante y el redibujo de la tabla no lo manda al final.
  await page.keyboard.press('Home');
  await page.keyboard.type('colchon ', { delay:30 });
  await page.waitForTimeout(450);
  r = await foto(page);
  chk('⚠️ escribir adelante («colchon » + Home) deja el cursor donde estaba, no al final', r.valor==='colchon smart' && r.caret===8 && r.foco, J({valor:r.valor, caret:r.caret, foco:r.foco}));
  chk('…y la búsqueda es palabra por palabra: sigue mostrando solo el SMART', r.q==='colchon smart' && r.filas.length===1 && /SMART/.test(r.filas[0]), J(r.filas));

  // ══ 3. Borrar la búsqueda devuelve los cuadros ══════════════════════════════════════
  console.log('\n── 3. Borrar la búsqueda devuelve los cuadros ──');
  // (contra una página vieja no hay cartel: se limpia por función para que el resto de la prueba siga, sin colgarse 30 s)
  const enlace = await page.$('#stk-buscando a');
  if(enlace) await enlace.click(); else await page.evaluate(() => stockFiltroLimpiar());
  await page.waitForTimeout(200);
  r = await foto(page);
  chk('«Borrar la búsqueda» vacía el campo de arriba y el filtro', r.valor==='' && r.q==='', J({valor:r.valor, q:r.q}));
  chk('…vuelven los cuadros y las tres filas', r.cuadros.producir && r.cuadros.revision && !r.buscando && r.filas.length===3, J({cuadros:r.cuadros, filas:r.filas.length}));

  // ══ 4. Por código, y vaciar el campo (la ✕ del navegador) ══════════════════════════
  console.log('\n── 4. Buscar por código y vaciar el campo ──');
  await page.fill('#stk-q', 'ch1201');
  await page.waitForTimeout(450);
  r = await foto(page);
  chk('⚠️ por código («ch1201») encuentra el TITANIO ICE 160x190, y nada más', r.filas.length===1 && /TITANIO ICE/.test(r.filas[0]) && !r.cuadros.producir, J(r.filas));
  await page.fill('#stk-q', '');   // la ✕ del `type=search` dispara `input` con el campo vacío
  await page.waitForTimeout(450);
  r = await foto(page);
  chk('vaciar el campo (sin tocar el enlace) también devuelve los cuadros', r.q==='' && r.cuadros.producir && r.filas.length===3 && !r.buscando, J({q:r.q, filas:r.filas.length}));

  // ══ 5. Cerrar y volver a abrir mantiene lo buscado ══════════════════════════════════
  console.log('\n── 5. Cerrar y volver a abrir la pantalla ──');
  await page.evaluate(() => { stockBuscar('titanio'); });
  await page.waitForTimeout(400);
  await page.evaluate(() => { closeStock(); document.getElementById('stk-q').value='zzz'; abrirStock(); });   // otra pantalla pudo tocar el campo
  await page.waitForTimeout(200);
  r = await foto(page);
  chk('al volver a abrir, el campo muestra lo que se está buscando («titanio») y la tabla sigue filtrada', r.valor==='titanio' && r.q==='titanio' && r.filas.length===1 && r.buscando, J({valor:r.valor, q:r.q, filas:r.filas}));
  await page.evaluate(() => stockFiltroLimpiar());
  r = await foto(page);
  chk('`stockFiltroLimpiar()` desde afuera también vacía el campo de arriba', r.valor==='' && r.filas.length===3);
  chk('sin errores de JS en toda la vuelta', errors.length===0, errors.join(' | '));

  // ══ 6. En el iPad parado (820 px) sigue arriba y a la vista ═════════════════════════
  console.log('\n── 6. iPad parado (820 px) ──');
  const ipad = await (await browser.newContext({ viewport:{width:820,height:1180}, timezoneId:'America/La_Paz', hasTouch:true })).newPage();
  const errI=[]; ipad.on('pageerror',e=>errI.push(e.message)); ipad.on('dialog',d=>d.accept());
  await ipad.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await ipad.waitForTimeout(300);
  await armar(ipad);
  await ipad.waitForTimeout(250);
  r = await foto(ipad);
  chk('⚠️ en 820 px el buscador está a la vista en la barra de arriba (sin scroll)', r.visible && r.top>=0 && r.top<140 && r.right<=r.ancho, J({top:r.top, right:r.right, ancho:r.ancho}));
  await ipad.fill('#stk-q', 'eco');
  await ipad.waitForTimeout(450);
  r = await foto(ipad);
  chk('…y escribir «eco» deja solo el ECO FLEX, con los cuadros escondidos', r.filas.length===1 && /ECO FLEX/.test(r.filas[0]) && !r.cuadros.producir && r.buscando, J(r.filas));
  chk('sin errores de JS en el iPad', errI.length===0, errI.join(' | '));

  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})().catch(e => { console.error('✗ reventó:', e); console.log('\n'+PASS+' bien · '+(FAIL+1)+' mal'); process.exit(1); });
