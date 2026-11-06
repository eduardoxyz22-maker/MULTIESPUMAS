/* 📌 EL LUGAR DE ENTREGA DE UN CLIENTE FIJO, UNA SOLA VEZ (05/11/2026, plan del jueves, item 110, §4ok-110).
   Eduardo vende casi todo a las bodegas de dos mayoristas y muchos pedidos salían sin pin (no aparecían en el mapa, el recorrido, la
   sugerencia de camión ni el GPS).

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. `__destinos__` es una fila del sistema (no es una venta, no se cuenta en ningún lado).
   2. La ficha del cliente ofrece los lugares de SUS pedidos (el mismo punto junto, lo más usado primero) con «📌 Guardar como su lugar de
      entrega», por vendedor (elegible si le vendieron varios).
   3. Guardar relee la planilla y JUNTA con lo que guardó otro aparato (sello + `juntar`; ante `conflicto`, junta y vuelve a guardar).
   4. Un pedido NUEVO de ese cliente con ese vendedor y sin enlace lo toma al guardar (enlace, y zona y dirección si estaban vacías), y el
      formulario lo dice antes. Un enlace pegado manda; una dirección escrita distinta no se pisa; otro vendedor no lo toma; editar no lo toca.
   5. «Quitar» lo saca (y deja lo de los otros clientes). Sin señal queda en la cola con sus cambios y sale con la señal.
   6. Un nombre genérico («CLIENTE») no puede guardar un lugar.
   Datos SINTÉTICOS. Reloj clavado el jueves 05/11/2026 a las 10:00 de Bolivia.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_destino_cliente.js */
const { chromium } = require('playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport:{ width:1300, height:950 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.setFixedTime(new Date('2026-11-05T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  const espera = (ms) => page.waitForTimeout(ms);

  const L1='https://www.google.com/maps?q=-17.7701,-63.1802', L1b='https://maps.google.com/?q=-17.77010,-63.18020', L2='https://www.google.com/maps?q=-17.7500,-63.1500', L3='https://www.google.com/maps?q=-17.8000,-63.2000';
  await ev((L) => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CONNECTED=true; UNLOCKED=false;
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    var cp=function(x){ return JSON.parse(JSON.stringify(x)); };
    var n=0, V=function(vend, cli, o){ n++; return Object.assign({ id:'e'+n, oc:'11-'+(500+n), nota:String(9000+n), vendedor:vend, cliente:cli, celular:'', fecha:'2026-10-2'+n, turno:'AM',
      zona:'Parque Industrial', direccion:'BODEGA CALLE 3', maps:'', productos:[{ desc:'TITANIO LATEX', medida:'140x190', cant:2, precio:3000 }], saldo:0, pagado:true, entregado:true, ts:Date.parse('2026-10-2'+n+'T10:00:00-04:00'), fotos:[], rev:1 }, o||{}); };
    var otro=JSON.stringify(['d', normNombre('OTRO CLIENTE'), talVendKey('Eduardo Añez'), 1000, L.L2, 'Norte', 'CALLE OTRA', 'OTRO CLIENTE', 'Eduardo Añez']);
    window.SRV={ rows:{}, saves:[], antes:null };
    [ V('Eduardo Añez','TIENDA AMIGA',{ maps:L.L1 }), V('Eduardo Añez','TIENDA AMIGA',{ maps:L.L1b, zona:'Parque Industrial', direccion:'BODEGA CALLE 3' }), V('Eduardo Añez','Tienda Amiga',{ maps:'' }),
      V('Mirian Salazar','TIENDA AMIGA',{ maps:L.L2, zona:'Norte', direccion:'SUCURSAL NORTE' }), V('Eduardo Añez','CLIENTE',{ maps:L.L3 }) ].forEach(function(p){ SRV.rows[p.id]=p; });
    SRV.rows[DEST_ID]=Object.assign(filaSistema(DEST_ID, '📌 LUGARES', JSON.stringify({ v:1, k:[otro] })), { rev:2 });
    window.__otro=otro;
    apiPost=function(pl){
      if(pl && pl.action==='list') return Promise.resolve({ ok:true, ahora:Date.now(), pedidos:Object.keys(SRV.rows).map(function(k){ return cp(SRV.rows[k]); }) });
      if(pl && pl.action==='save'){
        var p=cp(pl.pedido), cur=SRV.rows[p.id];
        if(SRV.antes && String(p.id)===DEST_ID){ var f=SRV.antes; SRV.antes=null; f(); cur=SRV.rows[p.id]; }
        SRV.saves.push({ id:p.id, rev:Number(p.rev)||0, juntar:!!pl.juntar, obs:p.observaciones, maps:p.maps, zona:p.zona, dir:p.direccion, cli:p.cliente });
        if(cur && String(p.id).indexOf('__')===0 && pl.juntar && (Number(p.rev)||0)!==(Number(cur.rev)||0)) return Promise.resolve({ ok:false, error:'conflicto', pedido:cp(cur), ahora:Date.now() });
        delete p._cambios; p.rev=(cur ? (Number(cur.rev)||0) : 0)+1; SRV.rows[p.id]=p;
        return Promise.resolve({ ok:true, pedido:cp(p), ahora:Date.now() });
      }
      return Promise.resolve({ ok:true });
    };
    loadFromServer=function(){};
  }, { L1, L1b, L2, L3 });
  await ev(async () => { await refrescarEstadoYa(); });

  console.log('\n── 1. Una fila del sistema ──');
  let r = await ev(() => ({ sis:esFilaSistema({ id:DEST_ID }), conta:fueraDeConta({ id:DEST_ID, oc:'' }), de:destDe('TIENDA AMIGA','Eduardo Añez'), otro:(destDe('Otro Cliente','Eduardo Añez')||{}).m }));
  chk('`__destinos__` es fila del sistema y no es una venta', r.sis===true && r.conta===true, r);
  chk('lee lo que guardó otro aparato (OTRO CLIENTE con Eduardo) y TIENDA AMIGA todavía no tiene', r.de===null && r.otro===L2, r);

  console.log('\n── 2. La ficha del cliente ofrece los lugares de sus pedidos ──');
  r = await ev(() => {
    clfAbrir('e1','admin');
    var b=document.querySelector('#modal-box .clf-dest'), sel=b && b.querySelector('#clf-dest-v');
    return { txt:b ? b.innerText.replace(/\s+/g,' ') : '', ops:sel ? [].map.call(sel.options, function(o){ return o.value; }) : [], v:sel ? sel.value : '', n:b ? b.querySelectorAll('.clf-dest-l li').length : 0 };
  });
  chk('el cuadro «📌 Lugar de entrega» está en la ficha, para los pedidos de Eduardo (le vendieron Eduardo y Mirian)', /Lugar de entrega/.test(r.txt) && r.v==='Eduardo Añez' && r.ops.indexOf('Mirian Salazar')>=0, r);
  chk('el mismo punto con dos enlaces distintos va junto: «en 2 pedidos», primero; y el de Mirian aparte', /BODEGA CALLE 3.*en 2 pedidos/.test(r.txt) && r.n===2 && /SUCURSAL NORTE/.test(r.txt), r.txt);
  chk('…y dice que todavía no tiene uno guardado', /Todavía no tiene un lugar guardado/.test(r.txt), r.txt);

  console.log('\n── 3. Guardar: relee, junta y queda en la planilla ──');
  await ev(() => { SRV.saves=[]; document.querySelector('#modal-box .clf-dest-ok').click(); });
  await espera(1600);
  r = await ev(() => {
    var row=SRV.rows[DEST_ID], k=JSON.parse(row.observaciones).k, b=document.querySelector('#modal-box .clf-dest');
    var s=SRV.saves.filter(function(x){ return x.id===DEST_ID; });
    return { k:k, s:s.map(function(x){ return x.rev+':'+x.juntar; }), de:destDe('Tienda Amiga','EDUARDO AÑEZ'), txt:b ? b.innerText.replace(/\s+/g,' ') : '', rev:row.rev };
  });
  chk('la fila de la planilla tiene lo de OTRO CLIENTE (del otro aparato) Y lo nuevo', r.k.length===2 && r.k.indexOf(await ev(()=>window.__otro))>=0, r.k);
  chk('…mandado con el sello de la planilla (2) y `juntar`', r.s.join(',')==='2:true' && r.rev===3, r.s);
  chk('destDe(TIENDA AMIGA, Eduardo) = el enlace más nuevo de los dos (con cualquier mayúscula)', r.de && (r.de.m===L1 || r.de.m===L1b) && r.de.z==='Parque Industrial' && r.de.d==='BODEGA CALLE 3', r.de);
  chk('la ficha dice «✅ Guardado: Parque Industrial · BODEGA CALLE 3»', /Guardado: Parque Industrial · BODEGA CALLE 3/.test(r.txt) && !/BODEGA CALLE 3.*en 2 pedidos/.test(r.txt), r.txt);
  const M1 = r.de && r.de.m;

  r = await ev(async () => {
    /* otro aparato guarda en el medio (después de nuestra lectura): el servidor contesta `conflicto` y se junta */
    var otro2=JSON.stringify(['d', normNombre('TERCER CLIENTE'), talVendKey('Eduardo Añez'), 2000, 'https://www.google.com/maps?q=-17.7,-63.1', '', '', 'TERCER CLIENTE', 'Eduardo Añez']);
    SRV.antes=function(){ var row=SRV.rows[DEST_ID], o=JSON.parse(row.observaciones); o.k.push(otro2); row.observaciones=JSON.stringify(o); row.rev=(Number(row.rev)||0)+1; };
    SRV.saves=[];
    destGuardar('TIENDA AMIGA', 'Mirian Salazar', 'https://www.google.com/maps?q=-17.7500,-63.1500', 'Norte', 'SUCURSAL NORTE');
    await new Promise(res=>setTimeout(res, 1600));
    var k=JSON.parse(SRV.rows[DEST_ID].observaciones).k;
    return { n:k.length, tercero:k.indexOf(otro2)>=0, s:SRV.saves.filter(function(x){ return x.id===DEST_ID; }).map(function(x){ return x.rev+':'+x.juntar; }), mir:(destDe('Tienda Amiga','Mirian Salazar')||{}).d, edu:(destDe('Tienda Amiga','Eduardo Añez')||{}).d };
  });
  chk('si otro aparato guardó en el medio: `conflicto` → junta y vuelve a guardar sin perder nada (4 lugares)', r.n===4 && r.tercero && r.s.length===2 && r.mir==='SUCURSAL NORTE' && r.edu==='BODEGA CALLE 3', r);

  console.log('\n── 4. Un pedido NUEVO sin enlace lo toma ──');
  const llenar = (o) => ev((o) => {
    if(document.getElementById('modal').classList.contains('on')) closeModal();
    showView('form'); resetForm();
    document.getElementById('f-fecha').value='2026-11-06'; segSet('f-turno','AM');
    var fv=document.getElementById('f-vendedor'); fv.value=o.vend; applyVendedorLite(); fv.dispatchEvent(new Event('input', { bubbles:true }));
    var fc=document.getElementById('f-cliente'); fc.value=o.cli; fc.dispatchEvent(new Event('input', { bubbles:true }));
    if(o.cel) document.getElementById('f-celular').value=o.cel;
    if(o.nota) document.getElementById('f-nota').value=o.nota;
    document.getElementById('f-zona').value=o.zona||'';
    var fd=document.getElementById('f-direccion'); fd.value=o.dir||''; fd.dispatchEvent(new Event('input', { bubbles:true }));
    var fm=document.getElementById('f-maps'); fm.value=o.maps||''; fm.dispatchEvent(new Event('input', { bubbles:true }));
    var box=document.getElementById('f-productos'); box.innerHTML=''; addProdRow('TITANIO LATEX', '140x190', '', 1, ''); box.lastElementChild.querySelector('.prod-precio').value='3000'; refreshDelButtons();
    if(o.saldo){ segSet('f-pagado','NO'); document.getElementById('f-saldo').value=o.saldo; try{ updateMetodoVisibility(); }catch(e){} }
    var h=document.getElementById('f-dest-hint'); return { hint:h && !h.hidden ? h.innerText : '' };
  }, o);
  const guardar = (cli) => ev(async (cli) => {
    var n0=SRV.saves.length; submitPedido();
    for(var i=0;i<40;i++){ await new Promise(res=>setTimeout(res, 100)); if(SRV.saves.slice(n0).some(function(s){ return s.cli===cli && s.id.indexOf('__')!==0; })) break; }
    await new Promise(res=>setTimeout(res, 200));
    var s=SRV.saves.slice(n0).filter(function(s){ return s.cli===cli && s.id.indexOf('__')!==0; }).pop()||null;
    return { s:s, toast:(document.getElementById('toast')||{}).textContent||'' };
  }, cli);

  let f = await llenar({ vend:'Eduardo Añez', cli:'Tienda Amiga' });
  chk('el formulario lo dice ANTES de guardar (debajo de «Ubicación de Google Maps»)', /tiene su lugar de entrega guardado/.test(f.hint) && /BODEGA CALLE 3/.test(f.hint), f);
  r = await guardar('Tienda Amiga');
  chk('guardado con el enlace guardado, la zona y la dirección (estaban vacías)', r.s && r.s.maps===M1 && r.s.zona==='Parque Industrial' && r.s.dir==='BODEGA CALLE 3', r);
  chk('…y lo avisa', /lugar de entrega guardado/.test(r.toast), r.toast);

  f = await llenar({ vend:'Eduardo Añez', cli:'TIENDA AMIGA', zona:'Norte', maps:L3 });
  r = await guardar('TIENDA AMIGA');
  chk('un enlace pegado manda (y no hay aviso)', r.s && r.s.maps===L3 && !f.hint, { s:r.s, hint:f.hint });

  f = await llenar({ vend:'Eduardo Añez', cli:'TIENDA AMIGA', zona:'Centro', dir:'AV. CAÑOTO 99' });
  r = await guardar('TIENDA AMIGA');
  chk('con otra dirección escrita no se le pone el pin de la bodega (y se dice por qué)', r.s && r.s.maps==='' && r.s.dir==='AV. CAÑOTO 99' && /escribiste otra dirección/.test(f.hint), { s:r.s, hint:f.hint });

  f = await llenar({ vend:'Carola Chavez', cli:'TIENDA AMIGA', zona:'Norte', cel:'70000001', nota:'4321', saldo:'3000' });
  r = await guardar('TIENDA AMIGA');
  chk('otro vendedor (sin lugar guardado con ese cliente) no lo toma', r.s && r.s.maps==='' && !f.hint, { s:r.s, hint:f.hint });

  r = await ev(async () => {
    if(document.getElementById('modal').classList.contains('on')) closeModal();
    showView('form'); editPedido('e3');
    await new Promise(res=>setTimeout(res, 200));
    var hint=document.getElementById('f-dest-hint'), h=hint && !hint.hidden;
    var n0=SRV.saves.length; submitPedido();
    for(var i=0;i<30;i++){ await new Promise(res=>setTimeout(res, 100)); if(SRV.saves.slice(n0).some(function(s){ return s.id==='e3'; })) break; }
    var s=SRV.saves.slice(n0).filter(function(s){ return s.id==='e3'; }).pop()||null;
    return { s:s, hint:h };
  });
  chk('editar un pedido viejo sin enlace no lo toca', r.s && r.s.maps==='' && !r.hint, r);

  console.log('\n── 5. Quitar, y sin señal ──');
  r = await ev(async () => {
    if(document.getElementById('modal').classList.contains('on')) closeModal();
    clfAbrir('e1','admin'); document.querySelector('#modal-box .clf-dest-g button').click();
    await new Promise(res=>setTimeout(res, 1600));
    var k=JSON.parse(SRV.rows[DEST_ID].observaciones).k;
    return { de:destDe('TIENDA AMIGA','Eduardo Añez'), n:k.length, otro:k.indexOf(window.__otro)>=0, mir:!!destDe('TIENDA AMIGA','Mirian Salazar'), txt:document.querySelector('#modal-box .clf-dest').innerText.replace(/\s+/g,' ') };
  });
  chk('«Quitar» lo saca de la planilla; los de los otros clientes y el de Mirian quedan', r.de===null && r.n===3 && r.otro && r.mir && /Todavía no tiene un lugar guardado/.test(r.txt), r);

  r = await ev(async () => {
    CONNECTED=false;
    destGuardar('TIENDA AMIGA', 'Eduardo Añez', 'https://www.google.com/maps?q=-17.7701,-63.1802', 'Parque Industrial', 'BODEGA CALLE 3');
    await new Promise(res=>setTimeout(res, 900));
    var q=getPending().filter(function(p){ return p && p.id===DEST_ID; })[0], antes=JSON.parse(SRV.rows[DEST_ID].observaciones).k.length;
    CONNECTED=true; await flushPending(); await new Promise(res=>setTimeout(res, 400));
    var k=JSON.parse(SRV.rows[DEST_ID].observaciones).k;
    return { cola:!!(q && q._cambios), antes:antes, n:k.length, enCola:getPending().some(function(p){ return p && p.id===DEST_ID; }) };
  });
  chk('sin señal: queda en la cola con sus cambios, y con la señal llega a la planilla (junto con lo que ya había)', r.cola && r.antes===3 && r.n===4 && !r.enCola, r);

  console.log('\n── 6. Un nombre genérico no ──');
  r = await ev(() => { if(document.getElementById('modal').classList.contains('on')) closeModal(); clfAbrir('e5','admin'); var b=document.querySelector('#modal-box .clf-dest'); return { txt:b ? b.innerText : '', btn:!!(b && b.querySelector('.clf-dest-ok')), g:destGuardar('CLIENTE','Eduardo Añez', 'https://www.google.com/maps?q=-17.7,-63.1', '', '') }; });
  chk('«CLIENTE» no puede guardar un lugar (no alcanza para reconocerlo)', /no se puede guardar un lugar/.test(r.txt) && !r.btn && r.g===null, r);

  chk('sin errores de la página', !errores.length, errores.slice(0, 3));
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
