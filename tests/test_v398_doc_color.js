/* 🎨 CADA DOCUMENTO CON SU COLOR: ATC, RPT, VENTA DE TIENDA (16/11/2026, mejora 398; el dueño la eligió en «Mejoras visuales 390-440»).

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin `DOC_COLOR_PRUEBA` (Playwright): el formulario de siempre («Nuevo pedido», «🧾 Tu pedido», sin clases de color ni cinta).
   2. Con la bandera, una ATC: el formulario fucsia (la variable --doc), el título «Nueva ATC», la cinta «Estás cargando una ATC · …», «🎧 Tu
      ATC» con su ícono y «ATC» en «Tu pedido».
   3. Una RPT: café, «Nueva reposición», «📦 Tu reposición».
   4. La venta de tienda: celeste, «Venta de tienda», sin cinta (ya tiene su recuadro), el paso «Entrega» dice «Se lo lleva».
   5. Volver a un pedido común: turquesa, sin clases, sin cinta, «Nuevo pedido». Editando: «Corregir ATC».
   Datos SINTÉTICOS. Reloj clavado el lunes 16/11/2026 10:00. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_v398_doc_color.js */
const { chromium } = require('playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  await ev(() => {
    CONNECTED=true; CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:[] }); };
    window.FH_PRUEBA=1; window.FP_PRUEBA=1;
    showView('form'); resetForm();
    var v=document.getElementById('f-vendedor'); v.value='Carola Chavez'; v.dispatchEvent(new Event('input',{bubbles:true}));
    window.__tipo=function(t){ segSet('f-doc-tipo', t); setDocTipo(); };
    window.__mirar=function(){ var vf=document.getElementById('view-form'), c=document.getElementById('p398-cinta');
      return { cls:vf.className, doc:getComputedStyle(vf).getPropertyValue('--doc').trim(), tit:((document.querySelector('#fh h3')||{}).textContent||'').trim(),
        cinta:c && !c.hidden ? c.innerText.replace(/\s+/g,' ').trim() : '', der:((document.querySelector('#fx-der > .fx-lt')||{}).textContent||'').trim(),
        av:((document.querySelector('#fx-der .fx-cab .av')||{}).textContent||'').trim(), sb:((document.querySelector('#fx-der .fx-cab .sb')||{}).textContent||'').trim(),
        barra:[].map.call(document.querySelectorAll('#fp-barra .fp-b'), function(b){ return b.textContent.replace(/^[✓!\d]/,''); }) }; };
  });
  await page.waitForTimeout(300);

  console.log('\n── 1. Sin la bandera ──');
  let r = await ev(async () => { __tipo('ATC'); await new Promise(x=>setTimeout(x,200)); fxDerPintar(); return __mirar(); });
  chk('1 una ATC sin la bandera se ve como siempre: «Nuevo pedido», «🧾 Tu pedido», sin color ni cinta', r.tit==='Nuevo pedido' && r.der==='🧾 Tu pedido' && !/p398/.test(r.cls) && !r.cinta, r);

  console.log('\n── 2. ATC ──');
  r = await ev(async () => { window.DOC_COLOR_PRUEBA=1; __tipo('OC'); __tipo('ATC'); await new Promise(x=>setTimeout(x,200)); return __mirar(); });
  chk('2a fucsia: la clase y --doc #D946EF', /p398-atc/.test(r.cls) && /p398-on/.test(r.cls) && r.doc.toUpperCase()==='#D946EF', [r.cls, r.doc]);
  chk('2b el título «Nueva ATC»', r.tit==='Nueva ATC', r.tit);
  chk('2c la cinta «Estás cargando una ATC · no es una venta…»', /^🎧 Estás cargando una ATC Reclamo de un cliente: no es una venta, no se cobra y no va a Contabilidad\.$/.test(r.cinta), r.cinta);
  chk('2d «🎧 Tu ATC» con su ícono y «ATC · Carola Chavez»', r.der==='🎧 Tu ATC' && r.av==='🎧' && /^ATC · Carola Chavez$/.test(r.sb), [r.der, r.av, r.sb]);

  console.log('\n── 3. RPT ──');
  r = await ev(async () => { __tipo('RPT'); await new Promise(x=>setTimeout(x,200)); return __mirar(); });
  chk('3 café: «Nueva reposición», «📦 Tu reposición» y su cinta', /p398-rpt/.test(r.cls) && r.doc==='#9a5b2c' && r.tit==='Nueva reposición' && r.der==='📦 Tu reposición' && /Estás cargando una reposición \(RPT\)/.test(r.cinta), r);

  console.log('\n── 4. Venta de tienda ──');
  r = await ev(async () => { __tipo('OC'); abrirVentaTienda(); await new Promise(x=>setTimeout(x,300)); fpPintar(); return __mirar(); });
  chk('4a celeste: «Venta de tienda», «🛍️ Tu venta de tienda», sin cinta', /p398-tienda/.test(r.cls) && r.doc==='#0ea5e9' && r.tit==='Venta de tienda' && r.der==='🛍️ Tu venta de tienda' && !r.cinta, r);
  chk('4b el paso «Entrega» dice «Se lo lleva»', r.barra.indexOf('Se lo lleva')>=0 && r.barra.indexOf('Entrega')<0, r.barra);

  console.log('\n── 5. Un pedido común y editando ──');
  r = await ev(async () => { cancelarVentaTienda(); await new Promise(x=>setTimeout(x,300)); var v=document.getElementById('f-vendedor'); v.value='Carola Chavez'; v.dispatchEvent(new Event('input',{bubbles:true})); fxDerPintar(); fpPintar(); return __mirar(); });
  chk('5a el pedido común queda como siempre: sin clases, sin cinta, «Nuevo pedido», «🧾 Tu pedido», «Entrega»', !/p398-(atc|rpt|tienda|on)/.test(r.cls) && !r.cinta && r.tit==='Nuevo pedido' && r.der==='🧾 Tu pedido' && r.barra.indexOf('Entrega')>=0, r);
  r = await ev(async () => { EDIT_ID='x1'; __tipo('ATC'); await new Promise(x=>setTimeout(x,200)); var o=__mirar(); EDIT_ID=null; __tipo('OC'); return o; });
  chk('5b editando una ATC: «Corregir ATC»', r.tit==='Corregir ATC', r.tit);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
