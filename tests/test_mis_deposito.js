/* 📦 MIS PEDIDOS: EL DEPÓSITO DE EDUARDO (10/10, §4jg).

   El dueño: «como Eduardo maneja solo proveedores, quiero arriba al lado de la dona… MULTICENTER 15 semi de 2 plazas… y al darle
   clic muestre los pedidos» y «pendiente es todo lo que no está marcado como entregado… para saber qué tienen por entregar y
   cuánto en la semana».

   Lo que se mira (la escena 3D no carga en la prueba: la red está cortada, así que se mira también el aviso de reemplazo):
     1. Con una vendedora elegida o en «👑 Ver todos» no aparece; con Eduardo, sí.
     2. Pendiente = sin ✅, aunque la fecha haya pasado. Lo entregado y la venta de tienda no entran.
     3. Los períodos cuentan productos por la fecha de entrega: esta semana (lunes a domingo), próxima, atrasados y todo.
     4. Por cliente se suma por producto y medida, con lo que marcó logística (✔ / 📥 / ✗ / 🏭 / sin revisar) y el % listo.
     5. Tocar un cliente muestra sus pedidos; tocar un pedido abre su ficha de Mis pedidos.
     6. Sin 3D lo dice y la lista sigue. Ningún error de JavaScript.

   ⚠️ Reloj clavado en el sábado 10/10/2026 a las 10 de Bolivia. Solo datos sintéticos: el repo es público.
   Se corre:  node tests/test_mis_deposito.js          Dientes:  PEDIDOS=/ruta/a/pedidos_viejo.html node tests/test_mis_deposito.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.setFixedTime(new Date('2026-10-10T10:00:00-04:00'));
  await page.goto('file://'+PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
  await page.evaluate(()=>{ try{ CARGA_GEN++; CARGA_ESTADO='ok'; clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){} CONNECTED=false; showView('mis'); });
  await page.waitForTimeout(200);
  await page.evaluate(()=>{
    window.autoAbrirAvisos=function(){};
    var P=function(o){ return Object.assign({ vendedor:'Eduardo Añez', turno:'AM', zona:'NORTE', direccion:'Av. Siempre Viva', maps:'', pagado:false, saldo:0,
      ts:Date.parse('2026-10-01T10:00:00-04:00'), metodoPago:'', entregado:false, acuenta:0 }, o); };
    STATE=[
      P({ id:'a', oc:'10-001', nota:'32601', cliente:'MULTICENTER', fecha:'2026-10-08', productos:[{ desc:'ESPECIAL SEMIORTOPEDICO', medida:'140x190', cant:4, chk:'no' }] }),
      P({ id:'b', oc:'10-002', nota:'32610', cliente:'Multicenter', fecha:'2026-10-10', productos:[{ desc:'ESPECIAL SEMIORTOPEDICO', medida:'140x190', cant:6, chk:'ok' }, { desc:'SOMIER ORO', medida:'140x190', cant:3 }] }),
      P({ id:'c', oc:'10-003', nota:'260600190', cliente:'TIENDA AMIGA', fecha:'2026-10-13', productos:[{ desc:'CONFORT PLUS', medida:'140x190', cant:2, chk:'im' }] }),
      P({ id:'d', oc:'09-090', nota:'5521', cliente:'FULANITO', fecha:'2026-10-01', productos:[{ desc:'DREAM', medida:'160x200', cant:1, chk:'no', enProd:true }] }),
      P({ id:'e', oc:'10-004', nota:'32500', cliente:'MULTICENTER', fecha:'2026-10-09', entregado:true, productos:[{ desc:'SOMIER ORO', medida:'140x190', cant:9 }] }),
      P({ id:'f', oc:'10-005', nota:'777', cliente:'VENTA EN TIENDA', fecha:'', direccion:'SALIÓ DE TIENDA · Central', zona:'TIENDA', productos:[{ desc:'DREAM', medida:'140x190', cant:5 }] }),
      P({ id:'g', oc:'10-006', nota:'1', cliente:'CLIENTE DE MARIA', vendedor:'Maria Flores', fecha:'2026-10-10', productos:[{ desc:'DREAM', medida:'140x190', cant:7 }] })
    ];
    window.__ver=function(nombre, todos){
      UNLOCKED=!!todos; MIS_TODOS=!!todos; MIS_FILTER='todos';
      if(window.DEP){ DEP.per='sem'; DEP.perTocado=false; DEP.sel=null; DEP.firma=''; }
      document.getElementById('mis-vendedor').value=nombre; renderMis();
      var box=document.getElementById('mis-dep');
      return { visible:!!box && !box.hidden, panel:(document.getElementById('dep-panel')||{}).innerText||'', chips:(document.getElementById('dep-chips')||{}).innerText||'' };
    };
  });

  let r=await page.evaluate(()=>__ver('Maria Flores'));
  chk('1. con una vendedora elegida no aparece', r.visible===false, r);
  r=await page.evaluate(()=>__ver('Eduardo Añez', true));
  chk('…tampoco en «👑 Ver todos»', r.visible===false, r);
  r=await page.evaluate(()=>__ver('Eduardo Añez'));
  chk('…con Eduardo, sí (arriba, al lado de la dona)', r.visible===true, r);

  const per=await page.evaluate(()=>{ var out={}; ['sem','prox','atras','todo'].forEach(function(k){ var D=depDatos(STATE.filter(function(p){ return mismoVendedor(p.vendedor,'Eduardo Añez'); }), k); out[k]={ n:D.cuenta[k], C:D.C.map(function(c){ return c.c+':'+c.u; }) }; }); return out; });
  chk('2. pendiente = sin ✅ (lo atrasado sigue), sin lo entregado ni la venta de tienda: todo = 16', per.todo.n===16 && JSON.stringify(per.todo.C)==='["Multicenter:13","TIENDA AMIGA:2","FULANITO:1"]' || (per.todo.n===16 && per.todo.C.join()==='MULTICENTER:13,TIENDA AMIGA:2,FULANITO:1'), per.todo);
  chk('3. esta semana (lun 05 a dom 11/10) = 13 (el 08/10 sin ✅ incluido), próxima = 2, atrasados = 5', per.sem.n===13 && per.prox.n===2 && per.atras.n===5, per);
  chk('…los botones lo dicen', /Esta semana\s*13/.test(r.chips) && /Próxima\s*2/.test(r.chips) && /Atrasados\s*5/.test(r.chips) && /Todo\s*16/.test(r.chips), r.chips);
  chk('…el mismo cliente escrito distinto («MULTICENTER» / «Multicenter») es uno solo', per.sem.C.length===1 && /:13$/.test(per.sem.C[0]), per.sem);

  r=await page.evaluate(()=>{ DEP.perTocado=true; depPer('todo'); return document.getElementById('dep-panel').innerText; });
  chk('4. el total y los clientes con su % listo (MULTICENTER 6 de 13 = 46 %)', /16\s*productos por entregar/.test(r) && /3 clientes · 4 pedidos/.test(r) && /13 productos · 46% listo para cargar/i.test(r), r.slice(0,300));
  r=await page.evaluate(()=>{ var b=[].slice.call(document.querySelectorAll('.dep-cli')).filter(function(x){ return /MULTICENTER|Multicenter/.test(x.innerText); })[0]; b.click(); return document.getElementById('dep-panel').innerText; });
  chk('…por producto y medida, con lo que marcó logística', /10\s*ESPECIAL SEMIORTOPEDICO 140x190/.test(r) && /6 ✔ hay/.test(r) && /4 ✗ no hay/.test(r) && /3\s*SOMIER ORO 140x190/.test(r) && /sin revisar/.test(r), r);
  chk('5. tocar un cliente muestra sus pedidos (con nota, día y ⏰ si está atrasado)', /Nota 32601 · entrega 08\/10\/2026 ⏰ atrasado/.test(r) && /Nota 32610 · entrega 10\/10\/2026/.test(r), r);
  r=await page.evaluate(()=>{ document.querySelector('.dep-ped[data-id="a"]').click(); var m=document.getElementById('modal')||document.querySelector('.modal-bg'); return { kind:window.MODAL_KIND, txt:document.body.innerText.indexOf('32601')>=0 }; });
  chk('…y tocar un pedido abre su ficha de Mis pedidos', r.kind==='mis', r);
  await page.evaluate(()=>{ try{ closeModal(); }catch(e){} });

  r=await page.evaluate(()=>{ var b=[].slice.call(document.querySelectorAll('.dep-cli')).filter(function(x){ return /FULANITO/.test(x.innerText); })[0]; b.click(); return document.getElementById('dep-panel').innerText; });
  chk('…lo que ya está en fábrica dice 🏭', /🏭 en fábrica/.test(r), r);
  r=await page.evaluate(()=>{ var b=[].slice.call(document.querySelectorAll('.dep-cli')).filter(function(x){ return /TIENDA AMIGA/.test(x.innerText); })[0]; b.click(); return document.getElementById('dep-panel').innerText; });
  chk('…y lo que hay que ir a buscar, 📥 recoger', /📥 recoger/.test(r) && /2 productos · 100% listo/.test(r), r);

  await page.waitForTimeout(1500);
  r=await page.evaluate(()=>{ var s=document.querySelector('#dep-esc .dep-sin3d'); return s?s.innerText:''; });
  chk('6. sin internet ni 3D lo dice, y la lista sigue', /no se pudo cargar/.test(r), r);

  r=await page.evaluate(()=>__ver('Maria Flores'));
  chk('…al cambiar a una vendedora se va', r.visible===false, r);
  chk('ningún error de JavaScript', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
