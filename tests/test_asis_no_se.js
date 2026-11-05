/* §4ok-E2 (05/11) BLOKI DICE «NO SÉ» CUANDO NO SABE, Y LO ANOTA.
   Con la planilla del 02/11 la fila `__asis_preguntas__` (§4kh K) estaba vacía: Bloki encontraba SIEMPRE alguna respuesta aunque no
   tuviera que ver («cómo anulo una venta» → «¿Cómo cargo un pedido nuevo?», por la palabra «venta»), y lo que no sabía no se anotaba nunca.
   Ahora una respuesta sale solo si coinciden MÁS DE LA MITAD de las palabras de la pregunta (sin las vacías: cómo, dónde, quiero…).

   LO QUE CUIDA (datos inventados; reloj clavado el jueves 05/11/2026 a las 10:00 de Bolivia):
   1. «cómo anulo una venta», «como cancelo una venta» y «el cliente no contesta» → ninguna respuesta (antes: una que no tenía que ver).
   2. Lo que sabe sigue contestando: «cómo cargo un pedido», «cómo anoto el pago», «¿dónde pongo la plata?», un error de tipeo
      («reprogramr», «como cobrr el flete»), «cómo cargo una atc», «registro un pago en contabilidad»; y por la raíz de la palabra,
      «como edito un pedido» → «¿Cómo corrijo un pedido que ya guardé?».
   3. Mientras se escribe («cómo cargo un ped») sigue encontrando; sin escribir nada, están todas; una palabra rara, ninguna.
   4. En la ventana: «No tengo esa respuesta todavía»; quieta 3 s se anota en el aparato con quién preguntó y va a `__asis_preguntas__`.
      Lo que sí contesta («cómo cargo un pedido») no se anota.
   Se corre:  node tests/test_asis_no_se.js   (PEDIDOS=… para correrla contra otra versión) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1280, height:900 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await ctx.route(/^https?:\/\//, r => r.abort());
  await page.addInitScript(() => { window.ASIS_PRUEBA=1; try{ sessionStorage.setItem('me_quien_ok','1'); localStorage.setItem('me_asis_tour','1'); localStorage.setItem('me_asis_video', JSON.stringify('ofrecido')); }catch(e){} });
  await page.clock.setFixedTime(new Date('2026-11-05T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(1800);   // Bloki se arma ~1,5 s después de abrir
  await page.evaluate(()=>{
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    loadFromServer=function(){};
    STATE=[{ id:'p1', oc:'11-001', nota:'2401', vendedor:'Mirian Salazar', cliente:'CLIENTE UNO', fecha:'2026-11-06', turno:'AM', productos:[{ desc:'COLCHON SOFT', medida:'140x190', cant:1, precio:3000 }],
             saldo:0, acuenta:0, pagado:true, metodoPago:'Efectivo 3000', entregado:false, ts:Date.now()-86400000, celular:'70000001', zona:'Norte', rev:1 }];
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
    window._saves=[]; apiSave=function(p){ var r=JSON.parse(JSON.stringify(p)); window._saves.push(r); return Promise.resolve({ ok:true, pedido:r }); };
    try{ ['me_asis_preg','me_quien_rol'].forEach(function(k){ localStorage.removeItem(k); }); }catch(e){}
    UNLOCKED=false; quienRol(''); setVendedorMem('Mirian Salazar');
  });
  const ev = async (fn, arg) => { try{ return await page.evaluate(fn, arg); }catch(e){ return { __err:String(e.message||e).slice(0,200) }; } };

  /* 1-3 · la búsqueda */
  let r = await ev(()=>{
    var q=function(t){ var i=asisBuscar(t); return i.length ? ASIS_AYUDA[i[0]].q : '(nada)'; };
    var T=['cómo anulo una venta','como cancelo una venta','el cliente no contesta','cómo cargo un pedido','cómo anoto el pago','¿dónde pongo la plata?','reprogramr',
           'como cobrr el flete','cómo cargo una atc','registro un pago en contabilidad','como edito un pedido','cómo cargo un ped','xyzw'], o={};
    T.forEach(function(t){ o[t]=q(t); });
    o.__todas=asisBuscar('').length===ASIS_AYUDA.filter(function(a){ return a.solo!=='adm'; }).length;
    return o; });
  chk('1 · «cómo anulo una venta» → ninguna respuesta (antes: «¿Cómo cargo un pedido nuevo?» por «venta»)', r['cómo anulo una venta']==='(nada)', r['cómo anulo una venta']);
  chk('1 · «como cancelo una venta» y «el cliente no contesta» → ninguna', r['como cancelo una venta']==='(nada)' && r['el cliente no contesta']==='(nada)', [r['como cancelo una venta'], r['el cliente no contesta']]);
  chk('2 · «cómo cargo un pedido» sigue contestando «¿Cómo cargo un pedido nuevo?»', r['cómo cargo un pedido']==='¿Cómo cargo un pedido nuevo?', r['cómo cargo un pedido']);
  chk('2 · «cómo anoto el pago» y «¿dónde pongo la plata?» → el pago', /anoto el pago/.test(r['cómo anoto el pago']) && /pago/.test(r['¿dónde pongo la plata?']), [r['cómo anoto el pago'], r['¿dónde pongo la plata?']]);
  chk('2 · los errores de tipeo siguen: «reprogramr», «como cobrr el flete»', /reprogramar/.test(r['reprogramr']) && /flete/.test(r['como cobrr el flete']), [r['reprogramr'], r['como cobrr el flete']]);
  chk('2 · «cómo cargo una atc» y «registro un pago en contabilidad» siguen', /cargo una ATC/.test(r['cómo cargo una atc']) && /pago en Contabilidad/.test(r['registro un pago en contabilidad']), [r['cómo cargo una atc'], r['registro un pago en contabilidad']]);
  chk('2 · por la raíz: «como edito un pedido» → «¿Cómo corrijo un pedido que ya guardé?» (antes: «cargo un pedido nuevo»)', r['como edito un pedido']==='¿Cómo corrijo un pedido que ya guardé?', r['como edito un pedido']);
  chk('3 · a medio escribir («cómo cargo un ped») sigue encontrando; sin escribir, todas (las de logística no, para una vendedora); «xyzw», ninguna', /cargo un pedido/.test(r['cómo cargo un ped']) && r.__todas===true && r.xyzw==='(nada)', r);

  /* 4 · en la ventana, y se anota */
  r = await ev(async ()=>{
    var esp=function(ms){ return new Promise(function(res){ setTimeout(res, ms); }); };
    asisAbrir('ayuda'); await esp(200); ASIS.q='cómo anulo una venta'; asisAyudaLista();
    var txt=(document.getElementById('asis-lista')||{}).textContent||'';
    await esp(3300);
    var ls=JSON.parse(localStorage.getItem('me_asis_preg')||'[]');
    CONNECTED=true; ULTIMO_REFRESCO=Date.now(); CARGA_ESTADO='ok';
    asisPreguntasMandar(); await esp(300);
    var s=window._saves.filter(function(x){ return x.id==='__asis_preguntas__'; }).pop(), o=s ? JSON.parse(s.observaciones) : null;
    /* lo que sí sabe no se anota */
    window._saves=[]; ASIS.q='cómo cargo un pedido'; asisAyudaLista(); var txt2=(document.getElementById('asis-lista')||{}).textContent||'';
    await esp(3300);
    var ls2=JSON.parse(localStorage.getItem('me_asis_preg')||'[]');
    asisCerrar(); CONNECTED=false;
    return { txt:txt.replace(/\s+/g,' ').slice(0,200), ls:ls.map(function(x){ return x.t+'|'+x.v; }), q:o && o.q.map(function(x){ return x.t; }), txt2:txt2.replace(/\s+/g,' ').slice(0,120), ls2:ls2.map(function(x){ return x.t; }) };
  });
  chk('4 · la ventana dice «No tengo esa respuesta todavía»', /No tengo esa respuesta todavía/.test(r.txt||''), r.txt);
  chk('4 · quieta 3 s se anota en el aparato con quién preguntó', r.ls && r.ls[0]==='cómo anulo una venta|Mirian Salazar', r.ls);
  chk('4 · y va a la fila del sistema «__asis_preguntas__» (la que ve Administración)', r.q && r.q.indexOf('cómo anulo una venta')>=0, r.q);
  chk('4 · «cómo cargo un pedido» contesta y NO se anota', /Cómo cargo un pedido nuevo/.test(r.txt2||'') && r.ls2 && r.ls2.indexOf('cómo cargo un pedido')<0, r);

  chk('sin errores de la página', errores.length===0, errores);
  await browser.close();
  console.log('\n'+PASS+' bien, '+FAIL+' mal');
  process.exit(FAIL ? 1 : 0);
})();
