/* 🎧 LAS ATC QUE ESPERAN EN FÁBRICA, EN EL RECLAMO DE LAS 10 (15/11/2026, mejora 318; dueño: «318» y «a veces se olvidan marcar»).

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin `ATC_FAB_PRUEBA` el reclamo y «Lo que nos debe la fábrica» quedan como siempre.
   2. Entra solo la ATC «en fábrica» hace más de 10 días desde el recojo; no: la de 4 días, la que volvió («lista»), la de devolución
      programada, la que todavía no se recogió, la entregada.
   3. En el reclamo (`__reclamo_fab__`, lo que lee el bot): al FINAL de «atrasados», con el número, el producto y los días, y PREGUNTA «¿Ya
      volvió?» (sin el cliente). Lo de los productos sigue primero.
   4. En «🏭 Lo que nos debe la fábrica»: la sección «🎧 ATC en fábrica» (también cuando la fábrica no debe nada) con «¿Ya volvió? Ver la
      ATC», que abre la ATC.
   5. Cuando se anota que volvió, sale sola.
   Datos SINTÉTICOS. Reloj clavado el jueves 05/11/2026. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_atc_fabrica.js */
const { chromium } = require('playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.setFixedTime(new Date('2026-11-05T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  await ev(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    loadFromServer=function(){};
    var A=function(id, oc, fecha, prod, atc, o){ return Object.assign({ id:id, oc:oc, cliente:'CLIENTE '+id.toUpperCase(), fecha:fecha, turno:'AM', vendedor:'Mirian Salazar', vehiculo:'Carry', chofer:'Omar',
      productos:[{ desc:prod[0], medida:prod[1], cant:1, atc:Object.assign({ mot:'hundimiento', det:'se hundió en el medio' }, atc||{}) }], entregado:true, ts:Date.parse(fecha+'T09:00:00-04:00'), rev:1, fotos:[] }, o||{}); };
    STATE=[
      A('f1', 'ATC 10-014', '2026-09-21', ['COLCHON TITANIO LATEX','160x190']),            // 45 días en fábrica
      A('f2', 'ATC 10-019', '2026-10-20', ['COLCHON SOFT','105x190']),                      // 16 días
      A('f3', 'ATC 11-002', '2026-11-01', ['COLCHON ORO','140x190']),                       // 4 días: todavía no
      A('f4', 'ATC 10-020', '2026-10-10', ['COLCHON CLOUD','140x190'], { dev:'2026-10-25' }),                 // volvió: «lista»
      A('f5', 'ATC 10-021', '2026-11-12', ['COLCHON CLOUD','90x190'], { pdev:'2026-11-12', rec:'2026-10-05', pturno:'AM' }, { entregado:false }),   // devolución programada
      A('f6', 'ATC 11-005', '2026-11-09', ['COLCHON CLOUD','90x190'], {}, { entregado:false }),             // todavía no se recogió
      A('f7', 'ATC 10-001', '2026-10-01', ['COLCHON CLOUD','90x190'], { ent:'2026-10-20' })                 // entregada
    ];
    fdLista=function(){ return []; };
    var sd=stockData; window.__sd=sd; stockData=function(){ return { lista:[], contado:true }; };
  });

  console.log('\n── 1. Sin la bandera ──');
  let r = await ev(() => { var d=reclamoFabDatos(); return { atr:d.atr, fd:fdHtml('stock'), L:atcFabEsperan().length }; });
  chk('el reclamo no lleva ATC y la caja dice «nada» como siempre', r.atr.length===0 && r.L===0 && !/ATC en fábrica/.test(r.fd), r);

  console.log('\n── 2-3. Con la bandera: el reclamo ──');
  r = await ev(() => {
    window.ATC_FAB_PRUEBA=1;
    var L=atcFabEsperan(), d=reclamoFabDatos();
    return { ids:L.map(function(x){ return x.p.id+':'+x.d; }), atr:d.atr };
  });
  chk('entran f1 (45 días) y f2 (16), la más vieja primero; no la de 4 días, la que volvió, la programada, la no recogida ni la entregada', r.ids.join()==='f1:45,f2:16', r.ids);
  chk('en «atrasados» del reclamo: número, producto, días, desde cuándo y «¿Ya volvió?»', r.atr.length===2 && r.atr[0]==='🎧 ATC 10-014 · COLCHON TITANIO LATEX 160x190: en fábrica hace 45 días según el panel (desde el 21/09). ¿Ya volvió?', r.atr);
  chk('el reclamo no nombra al cliente y cada renglón entra en 160 letras', r.atr.every(function(t){ return !/CLIENTE/.test(t) && t.length<=160; }), r.atr);
  r = await ev(() => {
    fdLista=function(){ return [{ fab:'MORENO', info:{ ico:'🏭', nombre:'Industrias Moreno', corto:'Moreno' }, prods:[] }]; };
    stockData=function(){ return { lista:[], contado:true }; };
    var real=reclamoFabDatos;
    return null;
  });
  r = await ev(() => {
    /* con productos atrasados de la fábrica: lo de los productos va primero */
    var fl=fdLista;
    fdLista=function(){ return [{ fab:'MORENO', info:{ ico:'🏭', nombre:'Industrias Moreno', corto:'Moreno' },
      prods:[{ k:'SOFT|140x190', falta:4, items:[{ falta:4, pedidas:4, esp:'2026-10-30', f:'2026-10-27', t:'ya' }] }] }]; };
    var d=reclamoFabDatos(); fdLista=fl; return d.atr;
  });
  chk('con productos atrasados, los productos van primero y las ATC al final', r.length===3 && /^SOFT · 140x190: faltan 4/.test(r[0]) && /^🎧 ATC 10-014/.test(r[1]), r);

  console.log('\n── 4. «Lo que nos debe la fábrica» ──');
  r = await ev(() => {
    fdLista=function(){ return []; };
    var vacia=fdHtml('stock');
    fdLista=function(){ return [{ fab:'MORENO', info:{ ico:'🏭', nombre:'Industrias Moreno', corto:'Moreno' }, prods:[] }]; };
    var llena=fdHtml('stock');
    return { vacia:vacia, llena:llena };
  });
  chk('sin nada que debe la fábrica: «nada» + la sección de las ATC', /Lo que nos debe la fábrica:<\/b> nada/.test(r.vacia) && /🎧 ATC en fábrica hace más de 10 días/.test(r.vacia) && /¿Ya volvió\? Ver la ATC/.test(r.vacia), r.vacia.slice(0,300));
  chk('con cosas que debe la fábrica: la sección va adentro de la misma caja', /<details class="fd-caja"/.test(r.llena) && r.llena.indexOf('ATC en fábrica')>0 && r.llena.indexOf('ATC en fábrica')<r.llena.indexOf('</details>'), r.llena.slice(-400));
  chk('la sección pregunta antes de reclamar (a veces se olvida marcar que volvió)', /preguntá antes de reclamar/.test(r.vacia), '');
  r = await ev(async () => {
    var box=document.createElement('div'); box.innerHTML=fdHtml('stock'); document.body.appendChild(box);
    box.querySelector('.fd-atc-r button[data-id="f1"]').click();
    await new Promise(function(ok){ setTimeout(ok, 120); });
    var t=document.getElementById('modal-box').innerText; box.remove();
    return { abierta:document.getElementById('modal').classList.contains('on'), t:t.slice(0,200) };
  });
  chk('«¿Ya volvió? Ver la ATC» abre la ATC', r.abierta && /CLIENTE F1/.test(r.t), r);

  console.log('\n── 5. Cuando vuelve, sale sola ──');
  r = await ev(() => { try{ closeModal(); }catch(e){} mergeAtcDatos(findById('f1'), { dev:'2026-11-05' }); return atcFabEsperan().map(function(x){ return x.p.id; }); });
  chk('f1 anotada como «volvió»: ya no está', r.join()==='f2', r);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
