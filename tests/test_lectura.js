/* 🔀 GOOGLE CAMBIA EL ENVÍO POR UNA LECTURA (§4fx)

   Un POST al `/exec` de Apps Script a veces llega al script como GET: contesta `doGet`
   —`{ok:true, version, pedidos:[…]}`, la planilla entera— y `doPost` nunca corre. Quedó en
   el registro del respaldo de Kommo (corridas 131 y 136 del 22 y 23/09), pedido desde los
   servidores de GitHub: no es un navegador ni su caché.

   Para un GUARDADO eso era lo peor posible: `ok:true` sin `pedido`, el panel lo daba por
   guardado, mostraba ✓, y en la planilla no había nada — *«cargó, salió LISTO, y cuando
   volvés a abrir el pedido nunca subió»*.

   Acá se simula ese Google con un `fetch` de mentira y se mira que el panel:
     1. NO dé por guardado un envío que volvió con la lista;
     2. lo reintente una vez, y si el reintento entra, lo tome como guardado;
     3. si Google insiste, lo deje en la cola (no se pierde) y lo diga;
     4. trate igual el `get_cerrado` de §4dv (la misma puerta, cerrada);
     5. no rompa la lectura normal (`list`), que SÍ devuelve la lista;
     6. no dé por borrado un borrado que volvió con la lista.

   Se corre:  node tests/test_lectura.js                                                 */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,extra)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, extra!=null?('· '+extra):''); };
const J=x=>JSON.stringify(x);
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1300,height:900}, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror',e=>errores.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.route(/^https?:/, r=>r.abort());
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(350);

  await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    CARGA_GEN++; CARGA_ESTADO='ok';
    if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; }
    if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    SHEETS_URL='https://script.google.com/macros/s/PRUEBA/exec';
    window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(k||'')+': '+String(m)); return _t(m,k,ms); };
    /* El Google de mentira: cada llamada saca la próxima respuesta de la fila. Una
       respuesta de «lectura» es EXACTAMENTE lo que contesta `doGet`. */
    window._fila=[]; window._pedidos=[];
    var LECTURA=function(){ return { ok:true, version:'2026-09-20-a', pedidos:[{ id:'otro', cliente:'OTRA VENTA' }] }; };
    window.LECTURA=LECTURA;
    window.fetch=function(url, o){
      var body={}; try{ body=JSON.parse(o&&o.body); }catch(e){}
      window._pedidos.push(body.action||'?');
      var r=window._fila.length ? window._fila.shift() : { ok:true };
      if(typeof r==='function') r=r(body);
      return Promise.resolve({ ok:true, status:200, json:function(){ return Promise.resolve(r); } });
    };
    // el reintento de §4fa espera 1,5 s: acá se acorta para que el test no tarde
    var _st=window.setTimeout; window.setTimeout=function(f,ms){ return _st(f, ms===1500?20:ms); };
    try{ localStorage.removeItem(LS_PEND); }catch(e){}
    window.P=function(id){ return { id:id, fecha:todayStr(), turno:'AM', cliente:'CLIENTE '+id, vendedor:'Carola Chavez', celular:'7', zona:'Norte',
                                    direccion:'X', nota:'1', oc:'09-001', productos:[{desc:'C',cant:1,precio:100}], acuenta:0, saldo:100, pagado:false,
                                    metodoPago:'', ts:Date.now(), rev:0 }; };
  });

  // ── 1+2. Google contesta la LECTURA una vez y después el guardado de verdad ──
  let r = await page.evaluate(async () => {
    window._fila=[ LECTURA(), function(b){ return { ok:true, mode:'update', pedido:Object.assign({}, b.pedido, { rev:7 }) }; } ];
    window._pedidos=[];
    var p=P('s1'); STATE=[p];
    var res=await persistPedido(p);
    return { res:{ ok:res&&res.ok, rev:res&&res.pedido&&res.pedido.rev }, pedidos:window._pedidos.slice(), cola:getPending().length };
  });
  chk('⚠️ un guardado que volvió con la LISTA no se da por guardado: se reintenta', J(r.pedidos)===J(['save','save']), J(r.pedidos));
  chk('  …y si el reintento entra, queda guardado de verdad (con su sello)', r.res.ok===true && r.res.rev===7 && r.cola===0, J(r));

  // ── 3. Google insiste: los dos intentos vuelven con la lista → a la cola, y se dice ──
  r = await page.evaluate(async () => {
    window._toasts=[]; window._fila=[ LECTURA(), LECTURA() ];
    var p=P('s2'); STATE=[p];
    var res=await persistPedido(p);
    return { ok:res&&res.ok, cola:getPending().map(function(x){ return x.id; }), toasts:window._toasts.slice() };
  });
  chk('⚠️ si Google insiste, NO hay ✓: el guardado queda en la cola del dispositivo', r.ok!==true && r.cola.indexOf('s2')>=0, J(r.cola));
  chk('  …y el aviso dice que NO está en la planilla', r.toasts.some(function(t){ return /NO está en la planilla/.test(t); }), J(r.toasts));

  // ── 4. el `get_cerrado` de §4dv es la misma puerta: tampoco es un guardado ──
  r = await page.evaluate(async () => {
    try{ localStorage.removeItem(LS_PEND); }catch(e){}
    window._fila=[ { ok:false, error:'get_cerrado', version:'2026-09-20-a' }, { ok:false, error:'get_cerrado', version:'2026-09-20-a' } ];
    window._pedidos=[];
    var p=P('s3'); STATE=[p];
    var res=await persistPedido(p);
    return { ok:res&&res.ok, intentos:window._pedidos.length, cola:getPending().map(function(x){ return x.id; }) };
  });
  chk('§4fx · un «get_cerrado» a un guardado se reintenta y después queda en la cola', r.ok!==true && r.intentos===2 && r.cola.indexOf('s3')>=0, J(r));

  // ── 5. la LECTURA normal (`list`) sigue andando: ahí la lista es la respuesta correcta ──
  r = await page.evaluate(async () => {
    window._fila=[ { ok:true, version:'2026-09-20-a', pedidos:[{ id:'a1', cliente:'UNO' }] } ];
    var res=await apiList();
    var err='';
    window._fila=[ { ok:false, error:'get_cerrado', version:'2026-09-20-a' } ];
    try{ await apiList(); }catch(e){ err=String(e&&e.message||e); }
    return { n:(res&&res.pedidos||[]).length, err:err, motivo:motivoDeError(new Error('respuesta_de_lectura')) };
  });
  chk('la lectura normal (list) sigue devolviendo la planilla', r.n===1, J(r.n));
  chk('  …pero un «get_cerrado» a la lectura es un error, no una planilla vacía', r.err==='respuesta_de_lectura', r.err);
  chk('  …y el motivo se dice en castellano y sin mandar a tocar la implementación', /cambió el envío por una lectura/.test(r.motivo) && !/Administrar implementaciones/.test(r.motivo), r.motivo.slice(0,90));

  // ── 6. un BORRADO que volvió con la lista no se da por borrado ──
  r = await page.evaluate(async () => {
    window._fila=[ LECTURA() ];
    var out='';
    try{ var res=await apiDelete('x1'); out='resolvió ok='+(res&&res.ok); }catch(e){ out='error '+String(e&&e.message||e); }
    return out;
  });
  chk('§4fx · un borrado que volvió con la lista NO se toma por borrado', /^error respuesta_de_lectura/.test(r), r);

  // ── 7. el guardado normal sigue igual: una sola vuelta, sin reintentos ──
  r = await page.evaluate(async () => {
    try{ localStorage.removeItem(LS_PEND); }catch(e){}
    window._fila=[ function(b){ return { ok:true, mode:'add', pedido:Object.assign({}, b.pedido, { rev:3 }) }; } ];
    window._pedidos=[];
    var p=P('s4'); STATE=[p];
    var res=await persistPedido(p);
    return { ok:res&&res.ok, intentos:window._pedidos.length, cola:getPending().length };
  });
  chk('el guardado normal sigue siendo UNA vuelta, sin reintentos ni cola', r.ok===true && r.intentos===1 && r.cola===0, J(r));

  chk('sin errores JS', errores.length===0, errores.slice(0,2).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
