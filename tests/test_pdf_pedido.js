/* 📄 EL PDF DEL PEDIDO DEL CLIENTE EN LA FICHA (20/11; dueño: «cada vez que entre y cargues un pedido de Multicenter, Tienda Amiga, debes
   adjuntar el PDF para que Ernesto lo pueda descargar… en el pedido en el panel. ¿Se puede?»).
   La revisión de correos sube el PDF (servidor 2026-11-20-b, acción `pdfPedido`) y deja `opdf` = [{i, n}] en el primer producto.
   Lo que esta prueba cuida (falla contra lo de antes: `pdfPedidoHtml` no existe):
   1. La ficha de Administración y la de Mis pedidos muestran «📄 PDF del pedido del cliente» con «👁 Ver» y «⬇️ Descargar» (enlaces de Drive
      con el id), y el nombre del archivo escapado.
   2. Un pedido sin PDF no muestra nada.
   3. Un id raro no arma un enlace con otra cosa (solo letras, números, - y _).
   4. ✏️ Editar (`heredarMarcas`) conserva el PDF aunque cambien los productos.
   Reloj clavado el viernes 20/11/2026 10:00 de Bolivia. Red cortada, datos inventados.
   Se corre:  node tests/test_pdf_pedido.js   · `PEDIDOS=<archivo>` corre contra otra página. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ if(e && e.error) c=false; c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function BASE(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=false; SERVER_AUTH='abierto';
  if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  CARGA_GEN++; CARGA_ESTADO='ok';
  apiPost=function(p){ return Promise.resolve(p && p.action==='list' ? { ok:true, pedidos:STATE } : { ok:true, pedido:p.pedido }); };
  apiList=function(){ return apiPost({ action:'list' }); };
  window._P=function(o){ return Object.assign({ id:'x', fecha:'2026-11-23', oc:'11-260', vendedor:'Eduardo Añez', cliente:'MULTICENTER', celular:'',
    turno:'AM', zona:'PARQUE INDUSTRIAL', direccion:'ALMACENES MULTICENTER', maps:'', pagado:false, saldo:4275, ts:Date.now(), metodoPago:'',
    observaciones:'', estado:'', entregado:false, vehiculo:'', chofer:'', garantia:'', nota:'33278', acuenta:0, facturarA:'', nit:'', nroDia:3,
    verificado:false, fotos:[], productos:[{ desc:'COLCHON TITANIO ICE', medida:'140x190', cant:1, codigo:'CH1220', precio:4275 }] }, o); };
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms||30); }); };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const page = await browser.newPage({ viewport:{ width:1400, height:950 }, timezoneId:'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.install({ time:new Date('2026-11-20T10:00:00-04:00') });
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.clock.runFor(1500);
  await page.evaluate(BASE);
  const ev = (fn, arg) => page.evaluate(fn, arg).catch(e => ({ error:String(e.message||e).slice(0,300) }));

  console.log('\n── 1-2. Las dos fichas ──');
  let r = await ev(async () => {
    var con=_P({ id:'c1' }); con.productos[0].opdf=[{ i:'1AbC-_xyz', n:'pedido_MULTICENTER__33278__OC <33278>.pdf' }];
    var sin=_P({ id:'s1', oc:'11-261', nota:'33300' });
    STATE=[con, sin]; saveMirror();
    var lee=function(){ var b=document.querySelector('#modal .opdf'); if(!b) return null;
      var a=[].slice.call(b.querySelectorAll('a')).map(function(x){ return { t:x.textContent.trim(), h:x.getAttribute('href'), tg:x.getAttribute('target') }; });
      return { txt:b.textContent, a:a, html:b.innerHTML }; };
    quienRol('logistica'); setVendedorMem('');
    showPedidoModal('c1'); await _esperar(); var adm=lee(); closeModal();
    showPedidoModal('s1'); await _esperar(); var admSin=lee(); closeModal();
    showMisModal('c1'); await _esperar(); var mis=lee(); closeModal();
    showMisModal('s1'); await _esperar(); var misSin=lee(); closeModal();
    return { adm:adm, admSin:admSin, mis:mis, misSin:misSin };
  });
  const bien = (x) => x && /PDF del pedido del cliente/.test(x.txt) && /OC <33278>\.pdf/.test(x.txt) && !/<33278>/.test(x.html) &&
    x.a.length===2 && /👁 Ver/.test(x.a[0].t) && x.a[0].h==='https://drive.google.com/file/d/1AbC-_xyz/view' &&
    /Descargar/.test(x.a[1].t) && x.a[1].h==='https://drive.google.com/uc?export=download&id=1AbC-_xyz' && x.a.every(a => a.tg==='_blank');
  chk('la ficha de Administración trae el PDF con «👁 Ver» y «⬇️ Descargar» (enlaces de Drive) y el nombre escapado', bien(r.adm), r.adm);
  chk('…y la de Mis pedidos también', bien(r.mis), r.mis);
  chk('un pedido sin PDF no muestra nada, en las dos fichas', r.admSin===null && r.misSin===null, r);

  console.log('\n── 3. Un id raro ──');
  r = await ev(() => { var p=_P({ id:'z1' }); p.productos[0].opdf=[{ i:'"><script>x</script>', n:'a.pdf' }, { i:'1AbC', n:'b.pdf' }, { i:'1AbC', n:'repetido.pdf' }];
    return { d:pdfPedidoDe(p), h:pdfPedidoHtml(p) }; });
  chk('solo letras, números, - y _ en el id; el repetido sale una vez', r.d && r.d.length===2 && r.d[0].i==='scriptxscript' && r.d[1].i==='1AbC' && !/<script>/.test(r.h), r);

  console.log('\n── 4. ✏️ Editar conserva el PDF ──');
  r = await ev(() => { var viejos=[{ desc:'COLCHON TITANIO ICE', medida:'140x190', cant:1, codigo:'CH1220', precio:4275, opdf:[{ i:'F1', n:'oc.pdf' }] }];
    var n1=heredarMarcas([{ desc:'COLCHON PILLOW', medida:'160x190', cant:2, codigo:'CH1300', precio:3000 }], viejos);
    var n2=heredarMarcas([{ desc:'X', medida:'1', cant:1, codigo:'A' }, { desc:'Y', medida:'2', cant:1, codigo:'B', opdf:[{ i:'F2', n:'otro.pdf' }] }], viejos);
    return { n1:pdfPedidoDe({ productos:n1 }), n2:pdfPedidoDe({ productos:n2 }) }; });
  chk('cambiar los productos no pierde el PDF del pedido', r.n1 && r.n1.length===1 && r.n1[0].i==='F1', r.n1);
  chk('un renglón que ya trae su PDF lo conserva (y el pedido sigue con el de antes)', r.n2 && r.n2.some(f=>f.i==='F2') && r.n2.some(f=>f.i==='F1'), r.n2);

  chk('sin errores de página', errores.length===0, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
