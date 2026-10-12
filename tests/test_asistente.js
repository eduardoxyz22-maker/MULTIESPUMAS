/* 🧑‍💼 EDUARDO, EL ASISTENTE DEL PANEL (§4jx, 11/10). El dueño eligió la burbuja en la esquina, su imagen con lentes, con sonido y
   que ayude a cada vendedor con lo suyo.

   ⚠️ LO QUE ESTA PRUEBA CUIDA (falla contra lo publicado, `1f881f5`, que no tiene asistente):
   1. En las pruebas automáticas no aparece (taparía botones) salvo `window.ASIS_PRUEBA`.
   2. La burbuja lleva la cara del dueño y el número de avisos.
   3. Mis pedidos: avisa los clientes de mañana sin avisar (desde las 17:00), los saldos de hace más de una semana y los pedidos sin
      ubicación, solo del vendedor elegido. «Entendido» lo guarda en este aparato y deja de avisar.
   4. Administración (con la clave): los pedidos de mañana sin camión.
   5. Al guardar con el cliente y sin celular ni ubicación, avisa (no frena nada).
   6. La ayuda busca sin acentos y «Mostrame dónde» cambia de pestaña e ilumina el lugar. (12/10) SIEMPRE algo que se ve: sin la
      clave, la tarjeta de la contraseña; sin nombre, «elegí tu nombre»; el pago, la parte del cobro que está a la vista.
   6c. (12/10) Los avisos de saldo y sin ubicación tienen «Ver cuáles»: la lista entera, y cada cliente abre su pedido.
   7. 🔇 se recuerda en el aparato.
   Datos SINTÉTICOS. Reloj clavado en el viernes 18/09/2026 a las 18:00 de Bolivia.
   Se corre:  node tests/test_asistente.js   (desde la raíz del repo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  loadFromServer=function(){};
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
  try{ localStorage.removeItem('me_asis_vistos'); localStorage.removeItem('me_asis_mudo'); }catch(e){}
  var n=0, man=proximoDiaEntrega();
  var V=function(o){ n++; return Object.assign({ id:'a'+n, oc:'09-'+(400+n), nota:String(900+n), vendedor:'Mirian Salazar', cliente:'CLIENTE A'+n, fecha:man, turno:'AM',
    productos:[{desc:'COLCHON TITANIO',medida:'140x190',cant:1,precio:3000}], saldo:0, acuenta:0, pagado:true, metodoPago:'', entregado:false,
    ts:new Date('2026-09-10T10:00:00-04:00').getTime(), fotos:[], chofer:'', vehiculo:'', maps:'https://maps.app.goo.gl/x', celular:'7000000' }, o); };
  window.FIX=function(){ n=0; return [
    V({}),                                                                                           // mañana, sin avisar y sin camión
    V({ cliente:'DEBE MUCHO', fecha:'2026-09-05', entregado:true, pagado:false, saldo:1500 }),       // saldo hace 13 días
    V({ cliente:'SIN PIN', fecha:'2026-09-25', maps:'' }),                                           // sin ubicación
    V({ vendedor:'Maria Flores', cliente:'DE OTRA', fecha:'2026-09-01', entregado:true, pagado:false, saldo:900, maps:'' })   // de otra vendedora: no
  ]; };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (conAsis) => {
    const page = await browser.newPage({ viewport:{ width:1180, height:900 }, timezoneId:'America/La_Paz' });
    page.on('pageerror', e => errores.push(e.message));
    page.on('dialog', d => d.accept());
    await page.route(/^https?:/, r => r.abort());
    if (conAsis) await page.addInitScript(() => { window.ASIS_PRUEBA=1; });
    await page.clock.setFixedTime(new Date('2026-09-18T18:00:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(1600);
    return page;
  };

  console.log('\n── 1. En las pruebas automáticas no aparece ──');
  let p0 = await abrir(false);
  chk('sin ASIS_PRUEBA no hay burbuja (no tapa botones de las otras pruebas)', await p0.evaluate(() => !document.getElementById('asis')));
  await p0.close();

  const page = await abrir(true);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  await ev(PREPARAR);
  await ev(() => { showView('mis'); });
  await page.waitForTimeout(150);

  console.log('\n── 2-3. Mis pedidos ──');
  let r = await ev(async () => {
    STATE=FIX(); var mv=document.getElementById('mis-vendedor'); mv.value='Mirian Salazar'; renderMis();
    asisRefrescar();
    var yo=document.getElementById('asis-yo'), img=yo && yo.querySelector('img');
    return { img:img && img.getAttribute('src'), n:(document.getElementById('asis-n')||{}).textContent, nOculto:(document.getElementById('asis-n')||{}).hidden,
             ks:asisAvisos().map(function(a){ return a.k.split('|')[0]+':'+a.t; }), globo:!document.getElementById('asis-globo').hidden };
  });
  chk('el asistente es el 3D del dueño de cuerpo entero', /asistente\/eduardo-3d\.webp/.test(r.img||''), r);
  chk('avisa: clientes de mañana sin avisar, el saldo de hace 13 días y el pedido sin ubicación (3), solo de Mirian',
      r.n==='3' && !r.nOculto && r.ks.some(function(k){ return /^m1:.*Mañana se entrega 1 pedido tuyo/.test(k); }) &&
      r.ks.some(function(k){ return /^deben:1 cliente tuyo/.test(k); }) && r.ks.some(function(k){ return /^sinub:1 pedido sin ubicación/.test(k); }) &&
      !r.ks.some(function(k){ return /DE OTRA/.test(k); }), r);
  chk('y lo dice en el globito', r.globo, r);

  r = await ev(() => {
    asisAbrir('avisos');
    var avs=[].map.call(document.querySelectorAll('#asis-panel .asis-av'), function(a){ return a.innerText.replace(/\s+/g,' '); });
    var b=[].filter.call(document.querySelectorAll('#asis-panel .asis-b'), function(x){ return x.textContent==='Entendido'; })[0];
    b.click();
    return { avs:avs, despues:document.querySelectorAll('#asis-panel .asis-av').length, n:document.getElementById('asis-n').textContent,
             ls:localStorage.getItem('me_asis_vistos')||'', saludo:(document.querySelector('#asis-panel .asis-h b')||{}).textContent };
  });
  chk('la ventana muestra los 3 avisos y saluda a la vendedora', r.avs.length===3 && /Mirian/.test(r.saludo||''), r);
  chk('«Entendido» lo saca, baja el número y queda guardado en este aparato', r.despues===2 && r.n==='2' && /m1\|/.test(r.ls), r);

  console.log('\n── 4. Administración ──');
  r = await ev(async () => {
    asisCerrar(); UNLOCKED=true; showView('admin'); await new Promise(function(res){ setTimeout(res, 600); });
    return asisAvisos().map(function(a){ return a.k.split('|')[0]+':'+a.t; });
  });
  chk('con la clave: «1 pedido de mañana sin camión»', r.some(function(k){ return /^a3:1 pedido de mañana sin camión/.test(k); }), r);

  console.log('\n── 5. Al guardar ──');
  r = await ev(async () => {
    tabNuevoPedido(); await new Promise(function(res){ setTimeout(res, 500); });
    document.getElementById('f-cliente').value='JUAN PEREZ'; document.getElementById('f-celular').value=''; document.getElementById('f-maps').value='';
    asisAlGuardar();
    return { ks:asisAvisos().map(function(a){ return a.t; }), globo:document.getElementById('asis-globo').innerText };
  });
  chk('sin celular ni ubicación: avisa las dos cosas (y no frena el guardado)',
      r.ks.some(function(t){ return /Te faltó el celular de JUAN PEREZ/.test(t); }) && r.ks.some(function(t){ return /Sin ubicación de Google Maps/.test(t); }) && /celular/.test(r.globo), r);

  console.log('\n── 6. La ayuda ──');
  r = await ev(async () => {
    asisAbrir('ayuda'); ASIS.q='cómo anoto el PAGO'; asisAyudaLista();
    var qs=[].map.call(document.querySelectorAll('#asis-lista .asis-pq'), function(b){ return b.textContent; });
    var sin=asisBuscar('xyzw').length;
    showView('mis'); await new Promise(function(res){ setTimeout(res, 300); });
    asisMostrar(asisBuscar('pago')[0]); await new Promise(function(res){ setTimeout(res, 700); });
    var el=ASIS_FOCO;
    return { qs:qs, sin:sin, vista:asisVista(), foco:!!el && /^(wrap-metodo|wrap-cobro-todo)$/.test(el.id) && asisSeVe(el) && el.classList.contains('asis-foco'), id:el&&el.id, cerrado:document.getElementById('asis-panel').hidden };
  });
  chk('«cómo anoto el PAGO» encuentra primero «¿Cómo anoto el pago o un adelanto?»; una palabra rara no encuentra nada', /pago o un adelanto/.test(r.qs[0]||'') && r.sin===0, r);
  chk('«Mostrame dónde» lleva a Nuevo pedido e ilumina la parte del pago que SE VE (el método está escondido hasta elegir)', r.vista==='form' && r.foco && r.cerrado, r);

  console.log('\n── 6b. (12/10, dueño: «algunos no lleva y muestra») cada «Mostrame dónde» ilumina algo que se ve ──');
  const recorrer = async (un, nombre, rol) => ev(async (o) => {
    UNLOCKED=o.un; quienRol(o.rol||''); var lk=document.getElementById('admin-lock'), ac=document.getElementById('admin-content');
    if(lk) lk.style.display=o.un?'none':''; if(ac) ac.style.display=o.un?'block':'none';
    var mv=document.getElementById('mis-vendedor'); mv.value=''; try{ localStorage.removeItem('me_mis_vendedor'); }catch(e){} ASIS.alGuardar=[];
    if(o.nombre){ setVendedorMem(o.nombre); }
    var out=[];
    for(var i=0;i<ASIS_AYUDA.length;i++){
      showView('mis'); mv.value=''; renderMis(); await new Promise(function(res){ setTimeout(res, 150); });
      if(ASIS_FOCO){ ASIS_FOCO.classList.remove('asis-foco'); ASIS_FOCO=null; }
      asisMostrar(i); await new Promise(function(res){ setTimeout(res, 1300); });
      var el=ASIS_FOCO, rc=el && el.getBoundingClientRect(), gl=document.getElementById('asis-globo');
      out.push({ i:i+1, v:ASIS_AYUDA[i].v, solo:ASIS_AYUDA[i].solo||'', vista:asisVista(), id:el?(el.id||el.textContent.slice(0,20)):'', ve:asisSeVe(el) && rc.height>0 && rc.top<innerHeight && rc.bottom>0, glo:gl.hidden?'':gl.innerText.replace(/\s+/g,' ') });
      gl.hidden=true;
    }
    return out;
  }, { un:un, nombre:nombre, rol:rol });
  const R13 = (x) => Array.isArray(x) ? x : Array.from({length:13}, () => ({}));
  r = R13(await recorrer(false, '', 'logistica'));
  chk('logística sin clave y sin nombre: las 13 iluminan algo que se ve', Array.isArray(r) && r.length===13 && r.every(function(x){ return x.ve; }), r);
  chk('Administración sin la clave → la tarjeta de la contraseña, y Eduardo lo dice',
      r.filter(function(x){ return x.v==='admin'; }).every(function(x){ return x.id==='admin-lock' && /contraseña de Administración/.test(x.glo); }), r);
  chk('buscar/corregir sin nombre elegido → «Primero elegí tu nombre»',
      r[7].id==='mis-vendedor' && /elegí tu nombre/.test(r[7].glo) && r[8].id==='mis-vendedor', [r[7], r[8]]);
  console.log('\n── 6b2. (12/10, dueño: «eso no es para los vendedores, solo para logística y administración») ──');
  let rv = await ev(async () => {
    UNLOCKED=false; quienRol(''); setVendedorMem('Mirian Salazar');
    var busca=asisBuscar('cómo asigno un camión').concat(asisBuscar('cierre de entregas')).map(function(i){ return ASIS_AYUDA[i].solo||''; });
    var todas=asisBuscar('').map(function(i){ return ASIS_AYUDA[i].q; });
    if(ASIS_FOCO){ ASIS_FOCO.classList.remove('asis-foco'); ASIS_FOCO=null; }
    showView('mis'); await new Promise(function(res){ setTimeout(res, 150); });
    var iAdm=ASIS_AYUDA.map(function(a,i){ return a.solo==='adm'?i:-1; }).filter(function(i){ return i>=0; });
    asisMostrar(iAdm[0]); await new Promise(function(res){ setTimeout(res, 700); });
    var r1={ busca:busca, n:todas.length, hayAdm:todas.some(function(q){ return /camión|cierre de entregas/i.test(q); }), vista:asisVista(), foco:!!ASIS_FOCO };
    quienRol('logistica'); r1.logVe=asisBuscar('').length; r1.logCamion=asisBuscar('cómo asigno un camión').some(function(i){ return ASIS_AYUDA[i].solo==='adm'; });
    quienRol(''); UNLOCKED=true; r1.claveVe=asisBuscar('').length; UNLOCKED=false;
    return r1;
  });
  chk('un vendedor NO ve «¿Cómo asigno un camión?» ni «¿Cómo hago el cierre de entregas?», ni buscándolas',
      rv.busca && rv.busca.indexOf('adm')<0 && rv.n===11 && !rv.hayAdm, rv);
  chk('…y «Mostrame dónde» de una de esas no lo lleva a Administración', rv.vista==='mis' && !rv.foco, rv);
  chk('logística y quien tiene la clave las ven (13)', rv.logVe===13 && rv.logCamion && rv.claveVe===13, rv);
  r = R13(await recorrer(true, 'Mirian Salazar', ''));
  chk('con la clave y el nombre recordado: las 13 iluminan algo que se ve', Array.isArray(r) && r.length===13 && r.every(function(x){ return x.ve; }), r);
  chk('buscar un pedido: pone el nombre de este aparato y lleva al buscador', r[7].id==='mis-q' && !r[7].glo, r[7]);
  chk('cierre de entregas → el botón «✅ Cierre de entregas»; asignar camión → los camiones', /Cierre de entregas/.test(r[10].id) && /^carga-viva|Lista de carga/.test(r[9].id), [r[9], r[10]]);

  console.log('\n── 6c. (12/10, dueño: «5 clientes tuyos tienen saldo, das clic y no hace nada») «Ver cuáles» los muestra y abre cada uno ──');
  r = await ev(async () => {
    asisCerrar(); try{ localStorage.removeItem('me_asis_vistos'); }catch(e){}
    showView('mis'); STATE=FIX(); var mv=document.getElementById('mis-vendedor'); mv.value='Mirian Salazar'; renderMis(); await new Promise(function(res){ setTimeout(res, 150); });
    asisAbrir('avisos');
    var avs=[].slice.call(document.querySelectorAll('#asis-panel .asis-av'));
    var deb=avs.filter(function(a){ return /con saldo/.test(a.innerText); })[0];
    var btn=deb && [].filter.call(deb.querySelectorAll('.asis-b'), function(b){ return /Ver cuáles/.test(b.textContent); })[0];
    if(btn) btn.click();
    deb=[].filter.call(document.querySelectorAll('#asis-panel .asis-av'), function(a){ return /con saldo/.test(a.innerText); })[0];
    var filas=deb ? [].map.call(deb.querySelectorAll('.asis-li button'), function(b){ return b.innerText.replace(/\s+/g,' '); }) : [];
    var ub=[].filter.call(document.querySelectorAll('#asis-panel .asis-av'), function(a){ return /sin ubicación/.test(a.innerText); })[0];
    var tieneUb=!!(ub && [].some.call(ub.querySelectorAll('.asis-b'), function(b){ return /Ver cuáles/.test(b.textContent); }));
    var f=deb && deb.querySelector('.asis-li button'); if(f) f.click();
    await new Promise(function(res){ setTimeout(res, 300); });
    var m=document.getElementById('modal');
    return { btn:!!btn, filas:filas, tieneUb:tieneUb, cerrado:document.getElementById('asis-panel').hidden,
             modal:!!m && getComputedStyle(m).display!=='none' && /DEBE MUCHO/.test((document.getElementById('modal-box')||{}).innerText||'') };
  });
  chk('el aviso del saldo tiene «Ver cuáles» y muestra al cliente con lo que debe y desde cuándo',
      r.btn && r.filas.length===1 && /DEBE MUCHO/.test(r.filas[0]) && /1\.500/.test(r.filas[0]) && /hace 13 días/.test(r.filas[0]) && !r.filas.some(function(t){ return /DE OTRA/.test(t); }), r);
  chk('el de «sin ubicación» también tiene «Ver cuáles»', r.tieneUb, r);
  chk('tocar un cliente cierra a Eduardo y abre la ficha de ese pedido', r.cerrado && r.modal, r);
  await ev(() => { try{ closeModal(); }catch(e){} });

  console.log('\n── 7. El sonido ──');
  r = await ev(() => { asisAbrir('avisos'); asisMudoCambiar(); return { ls:localStorage.getItem('me_asis_mudo'), btn:[].map.call(document.querySelectorAll('#asis-panel .asis-x'), function(b){ return b.textContent; }).join('') }; });
  chk('🔇 silencia y se recuerda en el aparato', r.ls==='1' && /🔇/.test(r.btn), r);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
