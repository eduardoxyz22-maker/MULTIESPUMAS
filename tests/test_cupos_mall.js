/* 🛍️ LOS CUPOS DEL MALL (14/11, mejoras 266 y 267)
   El dueño abre una tienda en el mall con 4 vendedores: *«si cada uno vende 3 por día son 12 entregas más por día»*, y en noviembre ya
   se llenaron 3 turnos. Aprobó la 266 y la 267.

   LO QUE CUIDA:
   1. ➕ `__cupos_extra__`: `limTurno` suma lo abierto de más (solo en un turno que sale), y lo dicen el cartel del formulario («13/14
      (+2 abiertos)»), el del sábado, el de Administración y «Ver los pedidos del turno». La fila es del sistema: no es un pedido ni ocupa cupo.
   2. «➕ Abrir cupos» SOLO con la contraseña: elegir cuántos, se guarda releyendo la planilla y con `juntar` (lo que otro aparato abrió
      en otro turno no se pisa), un `conflicto` se junta y se vuelve a guardar, sin señal queda en la cola con sus cambios; quitar = 0.
   3. Con un servidor de antes de 2026-11-14-b el extra se ve, y si el guardado vuelve con `cupos_llenos` el aviso dice que hay que
      implementar el servidor nuevo.
   4. 📈 Lo que se va a llenar: con la historia de la planilla (cuánto suele entrar para un día cuando faltan N días hábiles, a esta hora)
      marca los turnos de los próximos 3 días hábiles; va a «Para hacer» de Administración, al cartel con «Abrir cupos» y arriba del
      formulario. En Playwright, apagado salvo `CUP_PRON_PRUEBA`.
   5. ⏳ El lugar apartado (servidor 2026-11-14-b, `APARTO_PRUEBA`): abrir el formulario no aparta; elegir día y turno sí (`apartarCupo`
      con quién y el aparato) y se ve «⏳ Lugar apartado… para vos · m:ss»; cambiar de turno suelta y aparta; se renueva con actividad;
      va como `aparto` al guardar (y no se suelta otra vez); limpiar el formulario y cerrar la página lo sueltan; `cupos_llenos` se dice
      como un turno lleno; un fallo de red no frena el guardado; ni al corregir un pedido ni en una ATC; sin el servidor nuevo, nada.
   6. Lo apartado por OTRA venta ocupa lugar en las cuentas y se dice; lo de este aparato no.

   Reloj CLAVADO: jueves 19/11/2026, 10:00 de Bolivia. Un servidor de mentira en la página (`SRV`, por `fetch`). Solo datos inventados.
   Capturas (con `CAPTURAS=1`, o siempre en /tmp): /tmp/mall_cupos_{aviso,abrir,apartado}_{1280,390}.png
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 https_proxy=http://127.0.0.1:9 node tests/test_cupos_mall.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,420)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const CAPT = process.env.CAPTURAS_DIR || '/tmp';

function PREPARAR(){
  window.HOY='2026-11-19'; window.VIE='2026-11-20'; window.SAB='2026-11-21'; window.DOM='2026-11-22'; window.LUN='2026-11-23'; window.MAR='2026-11-24';
  window._toasts=[];
  if(!window._toastOrig) window._toastOrig=window.toast;
  window.toast=function(m){ window._toasts.push(String(m)); return window._toastOrig.apply(null, arguments); };
  window.esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms||0); }); };
  window._ts=function(f, h){ return new Date(f+'T'+(h||'09:00')+':00-04:00').getTime(); };
  var n=0;
  window.P=function(o){
    n++;
    return Object.assign({ id:'p'+n, oc:'11-'+(500+n), nota:String(7000+n), cliente:'CLIENTE '+n, celular:'7000'+(1000+n), nit:'1', fecha:VIE, turno:'AM',
      zona:'Norte', direccion:'Calle '+n, maps:'', observaciones:'', estado:'', entregado:false, vendedor:'Carola Chavez', chofer:'', vehiculo:'',
      nroDia:n, fotos:[], acuenta:0, saldo:0, pagado:false, metodoPago:'', garantia:'', facturarA:'', verificado:false,
      productos:[{ desc:'COLCHON TITANIO', medida:'140x190', codigo:'CH1201', cant:1, precio:1000 }], ts:_ts('2026-11-16'), rev:10 }, o||{});
  };
  window.EXTRA=function(d, rev){ var f=filaSistema('__cupos_extra__', '➕ CUPOS ABIERTOS DE MÁS', JSON.stringify({ v:1, d:d })); f.rev=rev||50; return f; };
  /* El servidor de mentira: lista (con `apartados` desde 2026-11-14-b), guardar (portero con lo abierto de más y lo apartado, y el sello de
     las filas del sistema que se juntan), apartar y soltar. */
  window.SRV={ ver:'2026-11-14-b', rows:[], ap:{}, calls:[], n:0, rev:100, lleno:false, falla:false, listaVieja:null };
  window.SRV_LIM=function(f, t){
    var b=limTurnoBase(f, t); if(b<=0) return 0;
    if(SRV.ver>='2026-11-14-b'){ var x=SRV.rows.filter(function(r){ return r.id==='__cupos_extra__'; })[0];
      if(x){ try{ var d=JSON.parse(x.observaciones).d||{}; b+=Number(d[f+'|'+t])||0; }catch(e){} } }
    return b;
  };
  window.SRV_USADOS=function(f, t, sin){
    var n2=SRV.rows.filter(function(r){ return r.fecha===f && normTurno(r.turno)===t; }).length;
    var L=(SRV.ap[f+'|'+t]||[]).filter(function(a){ return a.id!==sin && a.hasta>Date.now(); });
    return n2+L.length;
  };
  window.fetch=function(url, o){
    var b={}; try{ b=JSON.parse(o.body); }catch(e){}
    SRV.calls.push(b);
    var r;
    if(b.action==='list'){
      var rows=SRV.listaVieja||SRV.rows; SRV.listaVieja=null;
      r={ ok:true, version:SRV.ver, auth:'abierto', ahora:Date.now(), pedidos:JSON.parse(JSON.stringify(rows)) };
      if(SRV.ver>='2026-11-14-b') r.apartados=JSON.parse(JSON.stringify(SRV.ap));
    }else if(b.action==='apartarCupo'){
      if(SRV.falla) return Promise.reject(new TypeError('Failed to fetch'));
      var k=b.fecha+'|'+b.turno, L=SRV.ap[k]=SRV.ap[k]||[], ya=b.id ? L.filter(function(a){ return a.id===b.id; })[0] : null;
      if(!ya && (SRV.lleno || SRV_USADOS(b.fecha, b.turno)>=SRV_LIM(b.fecha, b.turno))) r={ ok:false, error:'cupos_llenos', version:SRV.ver };
      else { if(!ya){ ya={ id:'ap'+(++SRV.n), aparato:b.aparato, quien:b.quien }; L.push(ya); } ya.hasta=Date.now()+600000;
        r={ ok:true, id:ya.id, hasta:ya.hasta, libres:SRV_LIM(b.fecha, b.turno)-SRV_USADOS(b.fecha, b.turno), version:SRV.ver }; }
    }else if(b.action==='soltarCupo'){
      for(var k2 in SRV.ap) SRV.ap[k2]=SRV.ap[k2].filter(function(a){ return a.id!==b.id; });
      r={ ok:true, version:SRV.ver };
    }else if(b.action==='save'){
      var p=b.pedido, i=-1; SRV.rows.forEach(function(x, j){ if(String(x.id)===String(p.id)) i=j; });
      var t=normTurno(p.turno);
      if(i>=0 && b.juntar && String(p.id).indexOf('__')===0 && Number(p.rev||0)!==Number(SRV.rows[i].rev||0)) r={ ok:false, error:'conflicto', pedido:JSON.parse(JSON.stringify(SRV.rows[i])), version:SRV.ver };
      else if(i<0 && p.fecha && SRV_USADOS(p.fecha, t, b.aparto)>=SRV_LIM(p.fecha, t)) r={ ok:false, error:'cupos_llenos', turno:t, fecha:p.fecha, version:SRV.ver };
      else {
        var g=JSON.parse(JSON.stringify(p)); g.rev=++SRV.rev; if(i>=0) SRV.rows[i]=g; else SRV.rows.push(g);
        if(b.aparto) for(var k3 in SRV.ap) SRV.ap[k3]=SRV.ap[k3].filter(function(a){ return a.id!==b.aparto; });
        r={ ok:true, pedido:g, version:SRV.ver };
      }
    }else r={ ok:true, version:SRV.ver };
    return Promise.resolve({ ok:true, status:200, json:function(){ return Promise.resolve(JSON.parse(JSON.stringify(r))); } });
  };
  window.CARGAR=async function(rows){
    SRV.rows=JSON.parse(JSON.stringify(rows||[])); SRV.calls=[];
    try{ localStorage.removeItem(LS_PEND); }catch(e){}
    /* Cada sección arranca con otra planilla: lo guardado en la sección anterior no «manda» sobre esta (con el reloj clavado, los 90 s
       de `saveReciente` no pasan nunca) y el sello de la fila del sistema vuelve a empezar. */
    delete SAVE_ULTIMO['__cupos_extra__']; REESCRITA_REV['__cupos_extra__']=0; CUPX_CAMBIOS={}; CUPX_VER++;
    LISTA_BASE=null;
    await refrescarEstado(); await esperar(30);
  };
  window.LLAMADAS=function(a){ return SRV.calls.filter(function(b){ return b.action===a; }); };
  CONNECTED=true; UNLOCKED=false;
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  CARGA_GEN++; CARGA_ESTADO='ok';
  if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; }
  if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
  try{ localStorage.setItem(LS_ADMIN, sha256('clave-de-prueba')); localStorage.removeItem(LS_PEND); }catch(e){}
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{ width:1280, height:950 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage();
  const errores=[]; page.on('pageerror', e=>errores.push(e.message));
  const dialogos=[]; page.on('dialog', d=>{ dialogos.push(d.message()); d.accept(d.type()==='prompt' ? 'clave-de-prueba' : undefined); });
  await page.clock.setFixedTime(new Date('2026-11-19T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  await ev('('+PREPARAR+')()');

  // ═════════ 1 · ➕ el extra en las cuentas y en los carteles ═════════
  console.log('\n── 1. Los cupos abiertos de más ──');
  let r = await ev(async()=>{
    var rows=[EXTRA({ '2026-11-20|AM':2, '2026-11-20|PM':0, '2026-11-21|AM':1, '2026-11-21|PM':3, '2026-11-22|AM':5, '2026-11-23|AM':99, 'malo':4 })];
    for(var i=0;i<13;i++) rows.push(P({ fecha:VIE, turno:'AM' }));
    await CARGAR(rows);
    var x=STATE.filter(function(p){ return p.id==='__cupos_extra__'; })[0];
    var o={ vieAM:limTurno(VIE,'AM'), viePM:limTurno(VIE,'PM'), sabAM:limTurno(SAB,'AM'), sabPM:limTurno(SAB,'PM'), dom:limTurno(DOM,'AM'), lunAM:limTurno(LUN,'AM'),
      base:limTurnoBase(VIE,'AM'), sist:!!x && esFilaSistema(x), conta:!!x && fueraDeConta(x), usados:cuposUsadosTurno(VIE,'AM'), pedidos:cuposPedidosTurno(VIE,'AM') };
    showView('form'); resetForm();
    document.getElementById('f-fecha').value=VIE; segSet('f-turno','AM'); renderCupoForm();
    o.form=document.getElementById('cupo-form').textContent.replace(/\s+/g,' ').trim();
    STATE.push(P({ fecha:VIE, turno:'AM' })); renderCupoForm();
    o.lleno=document.getElementById('cupo-form').textContent.replace(/\s+/g,' ').trim();
    document.getElementById('f-fecha').value=SAB; renderCupoForm();
    o.sab=document.getElementById('cupo-form').textContent.replace(/\s+/g,' ').trim();
    verCuposTurno(VIE,'AM');
    o.ver=document.getElementById('modal-box').textContent.replace(/\s+/g,' ').trim();
    o.botonSinClave=!!document.querySelector('#modal-box .cupx-btn');
    closeModal();
    UNLOCKED=true;
    document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block';
    showView('admin'); segSet('adm-mode','dia'); document.getElementById('adm-dia').value=VIE; renderAdmin();
    o.adm=document.getElementById('cupo-admin').textContent.replace(/\s+/g,' ').trim();
    UNLOCKED=false;
    return o;
  });
  chk('1a · `limTurno` suma lo abierto de más: viernes mañana 12 + 2 = 14 (la tarde con 0 sigue en 13)', r.vieAM===14 && r.viePM===13 && r.base===12, r);
  chk('1b · solo en un turno que sale: la tarde del sábado y el domingo siguen en 0; el sábado a la mañana 15 + 1 = 16', r.sabPM===0 && r.dom===0 && r.sabAM===16, r);
  chk('1c · un número fuera de 1..20 o una clave mal escrita no valen (lunes mañana con 99 → 12)', r.lunAM===12, r);
  chk('1d · `__cupos_extra__` es una fila del sistema: no es una venta ni ocupa cupo', r.sist && r.conta && r.usados===13 && r.pedidos===13, r);
  chk('1e · el cartel del formulario dice lo libre de 14 con «(+2 abiertos)» («AM: 1/14 (+2 abiertos)»)', /AM: 1\/14 \(\+2 abiertos\)/.test(r.form) && !/lleno/i.test(r.form), r.form);
  chk('1f · lleno con 14: «Turno AM lleno … (14/14 (+2 abiertos))»', /Turno AM lleno/.test(r.lleno) && /\(14\/14 \(\+2 abiertos\)\)/.test(r.lleno), r.lleno);
  chk('1g · el sábado sale de `limTurno` (16 con 1 abierto), no de un 15 escrito', /16 \(\+1 abierto\) libres/.test(r.sab) && /los sábados no hay PM/.test(r.sab), r.sab);
  chk('1h · «Ver los pedidos del turno» dice lo abierto: «(+2 abiertos)» y «entran 12 + 2 = 14»', /\(\+2 abiertos\)/.test(r.ver) && /entran 12 \+ 2 = 14/.test(r.ver), r.ver.slice(0,300));
  chk('1i · sin la contraseña no hay botón para abrir cupos', r.botonSinClave===false, r);
  chk('1j · el cartel de cupos de Administración también: «/14 (+2 abiertos)»', /AM: 0\/14 \(\+2 abiertos\)/.test(r.adm), r.adm);

  // ═════════ 2 · «➕ Abrir cupos» con la contraseña ═════════
  console.log('\n── 2. Abrir cupos ──');
  r = await ev(async()=>{
    window.CUPX_PRUEBA=1; UNLOCKED=false;
    var rows=[EXTRA({ '2026-11-20|AM':2 }, 50)];
    for(var i=0;i<12;i++) rows.push(P({ fecha:LUN, turno:'AM' }));
    await CARGAR(rows);
    var o={};
    o.sinClave=cupxPoner(LUN,'AM',3);
    o.toastSin=_toasts.slice(-1)[0]||'';
    UNLOCKED=true;
    showView('form'); resetForm();
    verCuposTurno(LUN,'AM');
    var b=document.querySelector('#modal-box .cupx-btn'); o.boton=b ? b.textContent : null;
    if(b) b.click();
    o.tit=(document.querySelector('#modal-box .modal-h h3')||{}).textContent||'';
    o.n0=(document.getElementById('cupx-n')||{}).textContent;
    document.querySelectorAll('#modal-box .cupx-m')[1].click(); document.querySelectorAll('#modal-box .cupx-m')[1].click();
    o.n=(document.getElementById('cupx-n')||{}).textContent;
    o.res=(document.querySelector('#modal-box .cupx-res')||{}).textContent||'';
    /* Mientras tanto, otro aparato abrió 4 en el sábado: la planilla ya lo tiene (la relectura lo trae). */
    SRV.rows[0]=EXTRA({ '2026-11-20|AM':2, '2026-11-21|AM':4 }, 51);
    document.getElementById('cupx-ok').click();
    o.limYa=limTurno(LUN,'AM');
    o.volvio=(document.querySelector('#modal-box .modal-h h3')||{}).textContent||'';
    await esperar(900);
    var sv=LLAMADAS('save').filter(function(x){ return x.pedido && x.pedido.id==='__cupos_extra__'; });
    o.saves=sv.length; o.juntar=sv.length ? sv[0].juntar : null; o.rev=sv.length ? sv[0].pedido.rev : null;
    o.d=sv.length ? JSON.parse(sv[sv.length-1].pedido.observaciones) : null;
    o.listaAntes=SRV.calls.map(function(x){ return x.action; }).join(',');
    o.lim=limTurno(LUN,'AM'); o.limSab=limTurno(SAB,'AM');
    o.verDespues=document.getElementById('modal-box').textContent.replace(/\s+/g,' ').trim();
    o.cola=getPending().length;
    closeModal();
    return o;
  });
  chk('2a · sin la contraseña `cupxPoner` no anota nada y lo dice', r.sinClave===false && /contraseña de Administración/.test(r.toastSin), r);
  chk('2b · con la contraseña, «Ver los pedidos del turno» trae «➕ Abrir cupos» y abre la ventana', r.boton==='➕ Abrir cupos' && /Abrir cupos · 🌅 mañana del lunes 23\/11/.test(r.tit), r);
  chk('2c · arranca en 1 (el turno está justo lleno) y con + llega a 3: «entran 12 + 3 = 15»', r.n0==='1' && r.n==='3' && /entran 12 \+ 3 = 15/.test(r.res), r);
  chk('2d · al tocar «Abrir 3 de más» el límite cambia en el acto y vuelve a la lista del turno', r.limYa===15 && /Turno AM/.test(r.volvio), r);
  chk('2e · se guarda UNA vez, releyendo la planilla primero, con `juntar` y el sello que se leyó', r.saves===1 && r.juntar===1 && r.rev===51 && /list.*save/.test(r.listaAntes), r);
  chk('2f · lo que abrió el otro aparato (sábado 4) no se pisa: la fila queda con los tres', r.d && r.d.v===1 && r.d.d['2026-11-23|AM']===3 && r.d.d['2026-11-21|AM']===4 && r.d.d['2026-11-20|AM']===2, r.d);
  chk('2g · después de guardar: lunes 15, sábado 19, nada en la cola, y la lista del turno dice «entran 12 + 3 = 15»', r.lim===15 && r.limSab===19 && r.cola===0 && /entran 12 \+ 3 = 15/.test(r.verDespues), r);

  r = await ev(async()=>{
    var o={};
    /* Un `conflicto`: la relectura volvió con la fila de antes (sello 52) y en el medio otro guardó (sello 53, martes PM 2). */
    var actual=JSON.parse(JSON.stringify(SRV.rows[0]));
    var otro=EXTRA(Object.assign(JSON.parse(actual.observaciones).d, { '2026-11-24|PM':2 }), 53);
    SRV.rows[0]=otro; SRV.listaVieja=[actual].concat(SRV.rows.slice(1)); SRV.calls=[];
    cupxPoner(VIE,'AM',5);
    await esperar(1000);
    var sv=LLAMADAS('save').filter(function(x){ return x.pedido && x.pedido.id==='__cupos_extra__'; });
    o.saves=sv.length; o.revs=sv.map(function(x){ return x.pedido.rev; });
    o.d=JSON.parse(SRV.rows[0].observaciones).d;
    o.vieAM=limTurno(VIE,'AM'); o.marPM=limTurno(MAR,'PM');
    /* Quitar: 0 saca el turno de la fila. */
    SRV.calls=[]; cupxPoner(VIE,'AM',0); await esperar(1000);
    o.dQuitar=JSON.parse(SRV.rows[0].observaciones).d; o.vieAM0=limTurno(VIE,'AM');
    /* Dos números en el mismo turno (la junta dejó los dos): gana el de este aparato; si ninguno, el más alto. */
    o.res1=cupxResolver({ '2026-12-01|AM|3':1, '2026-12-01|AM|4':1 }, { '2026-12-01|AM|3':true })['2026-12-01|AM'];
    o.res2=cupxResolver({ '2026-12-01|AM|3':1, '2026-12-01|AM|4':1 }, {})['2026-12-01|AM'];
    /* Sin señal: queda en la cola con sus cambios. */
    CONNECTED=false; SRV.calls=[];
    cupxPoner(MAR,'AM',2); await esperar(900);
    var q=getPending().filter(function(x){ return x.id==='__cupos_extra__'; })[0];
    o.cola=!!q && !!q._cambios && q._cambios['2026-11-24|AM|2']===true; o.marAM=limTurno(MAR,'AM'); o.llamadas=SRV.calls.length;
    CONNECTED=true;
    await flushPending(); await esperar(300);
    o.trasCola=JSON.parse(SRV.rows[0].observaciones).d; o.colaDesp=getPending().filter(function(x){ return x.id==='__cupos_extra__'; }).length;
    return o;
  });
  chk('2h · `conflicto`: se junta lo de este aparato sobre la fila actual y se vuelve a guardar con el sello nuevo', r.saves===2 && r.revs[1]===53 && r.d['2026-11-20|AM']===5 && r.d['2026-11-24|PM']===2 && r.d['2026-11-23|AM']===3, r);
  chk('2i · …y la pantalla lo ve: viernes 17, martes tarde 15', r.vieAM===17 && r.marPM===15, r);
  chk('2j · poner 0 saca ese turno de la fila (el viernes vuelve a 12) sin tocar los demás', !('2026-11-20|AM' in r.dQuitar) && r.vieAM0===12 && r.dQuitar['2026-11-23|AM']===3, r.dQuitar);
  chk('2k · dos números en el mismo turno: gana el de este aparato; si no, el más alto', r.res1===3 && r.res2===4, r);
  chk('2l · sin señal queda en la cola con sus cambios (y ya se ve: martes mañana 14), y sale con la señal', r.cola && r.marAM===14 && r.llamadas===0 && r.trasCola['2026-11-24|AM']===2 && r.colaDesp===0, r);

  // ═════════ 3 · el servidor de antes ═════════
  console.log('\n── 3. Con el servidor de antes ──');
  r = await ev(async()=>{
    SRV.ver='2026-11-14-a';
    var rows=[EXTRA({ '2026-11-20|AM':2 }, 60)];
    for(var i=0;i<12;i++) rows.push(P({ fecha:VIE, turno:'AM' }));
    await CARGAR(rows);
    var o={ sv:SERVER_VER, lim:limTurno(VIE,'AM') };
    verCuposTurno(VIE,'AM'); o.ver=document.getElementById('modal-box').textContent.replace(/\s+/g,' ').trim(); closeModal();
    showView('form'); resetForm();
    document.getElementById('f-vendedor').value='Carola Chavez'; applyVendedorLite();
    document.getElementById('f-fecha').value=VIE; segSet('f-turno','AM'); renderCupoForm();
    var set=function(sel, v){ var x=document.querySelector(sel); x.value=v; x.dispatchEvent(new Event('input',{bubbles:true})); x.dispatchEvent(new Event('change',{bubbles:true})); };
    set('#f-nota','8801'); set('#f-cliente','CLIENTE DEL MALL'); set('#f-celular','71234567'); set('#f-productos .prod-codigo','CH1201'); set('#f-productos .prod-cant','1');
    set('#f-zona','Norte'); set('#f-direccion','Av. Banzer 4to anillo'); set('#f-saldo','3000');
    await esperar(300);
    _toasts.length=0; SRV.calls=[];
    submitPedido(); await esperar(1500);
    o.saves=LLAMADAS('save').length;
    o.toast=_toasts.join(' | ');
    o.txtSrv=cupxServidorViejoTxt(VIE,'AM');
    SRV.ver='2026-11-14-b'; SERVER_VER='2026-11-14-b'; o.txtNuevo=cupxServidorViejoTxt(VIE,'AM');
    return o;
  });
  chk('3a · con el servidor de antes el extra se VE igual (14) y «Ver los pedidos» avisa que hay que implementar el nuevo', r.lim===14 && /implementá el servidor 2026-11-14-b/.test(r.ver), r);
  chk('3b · el guardado rebota con `cupos_llenos` (el portero de antes no conoce el extra) y el aviso lo dice', r.saves===1 && /Turno AM lleno/.test(r.toast) && /implementá el servidor 2026-11-14-b/.test(r.toast), r.toast);
  chk('3c · con el servidor nuevo esa frase no sale', /2026-11-14-b/.test(r.txtSrv) && r.txtNuevo==='', r);

  // ═════════ 4 · 📈 lo que se va a llenar ═════════
  console.log('\n── 4. Lo que se va a llenar ──');
  r = await ev(async()=>{
    var rows=[], d=stockSumarDias(HOY,-42);
    for(; d<HOY; d=stockSumarDias(d,1)){
      if(!pryDiaHabil(d)) continue;
      var sab=diaSabado(d), ant1=cupHabilAtras(d,1), ant5=stockSumarDias(d,-6);
      var fin=sab?15:12, tarde=sab?5:4;   // 4 (5 el sábado) entran el día hábil anterior a la tarde; el resto, una semana antes
      for(var i=0;i<fin;i++) rows.push(P({ fecha:d, turno:'AM', ts:_ts(i<fin-tarde ? ant5 : ant1, i<fin-tarde ? '09:00' : '15:00') }));
      if(!sab) for(var j=0;j<6;j++) rows.push(P({ fecha:d, turno:'PM', ts:_ts(ant5,'09:00') }));
    }
    for(var a=0;a<9;a++) rows.push(P({ fecha:VIE, turno:'AM', ts:_ts('2026-11-12') }));
    for(var b=0;b<2;b++) rows.push(P({ fecha:VIE, turno:'PM', ts:_ts('2026-11-12') }));
    for(var c=0;c<10;c++) rows.push(P({ fecha:SAB, turno:'AM', ts:_ts('2026-11-12') }));
    for(var e=0;e<12;e++) rows.push(P({ fecha:LUN, turno:'AM', ts:_ts('2026-11-12') }));
    for(var f=0;f<3;f++) rows.push(P({ fecha:LUN, turno:'PM', ts:_ts('2026-11-12') }));
    await CARGAR(rows);
    var o={};
    delete window.CUP_PRON_PRUEBA;
    o.apagado=cupPronDatos().length;
    window.CUP_PRON_PRUEBA=1;
    var L=cupPronDatos();
    o.lista=L.map(function(x){ return x.f+' '+x.t+' '+x.hay+'+'+x.suele+'/'+x.lim+(x.lleno?' lleno':''); });
    o.vie=cupPronDe(VIE,'AM'); o.viePM=cupPronDe(VIE,'PM'); o.sab=cupPronDe(SAB,'AM'); o.lunPM=cupPronDe(LUN,'PM'); o.mar=cupPronDe(MAR,'AM');
    UNLOCKED=true; window.CUPX_PRUEBA=1; window.ADM_TABS_PRUEBA=1;
    document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block';
    showView('admin'); segSet('adm-mode','mes'); renderAdmin();
    o.av=JSON.parse(JSON.stringify(ADM_AV.cupos||{}));
    var it=admHacerDatos().filter(function(x){ return x.k==='cupos'; })[0];
    o.hacer=it ? { sev:it.sev, n:it.n, t:it.t, s:it.s } : null;
    o.cartel=document.getElementById('adm-cupos-pron').textContent.replace(/\s+/g,' ').trim();
    o.botones=document.querySelectorAll('#adm-cupos-pron .cupx-btn').length;
    o.hacerHtml=document.getElementById('adm-hacer').textContent.replace(/\s+/g,' ');
    showView('form'); resetForm();
    document.getElementById('f-fecha').value=VIE; segSet('f-turno','AM'); renderCupoForm();
    o.form=document.getElementById('cupo-form').textContent.replace(/\s+/g,' ').trim();
    window.FH_PRUEBA=1; renderCupoForm();
    o.fh=document.getElementById('fh').textContent.replace(/\s+/g,' ').trim(); o.fhPron=[].map.call(document.querySelectorAll('#fh .fh-alerta.k-pron'), function(x){ return x.textContent.replace(/\s+/g,' ').trim(); });
    o.tag=[].map.call(document.querySelectorAll('#fh .fh-t1 em'), function(x){ return x.textContent; });
    /* La ventana de abrir sugiere lo que falta: hay 9 + suelen entrar 4 = 13 en 12 → 2 (uno de margen). */
    cupxAbrir(VIE,'AM'); o.sug=(document.getElementById('cupx-n')||{}).textContent; o.sugTxt=(document.querySelector('#modal-box .cupx-pr')||{}).textContent||''; cupxCerrar();
    return o;
  });
  chk('4a · en Playwright, sin `CUP_PRON_PRUEBA`, no se calcula ni se muestra', r.apagado===0, r);
  chk('4b · viernes (falta 1 día hábil): hay 9 de 12 y suelen entrar 4 → se llena; la tarde (2 + 0) no', r.vie && r.vie.k===1 && r.vie.hay===9 && r.vie.suele===4 && r.vie.llena && !r.vie.lleno && r.viePM && !r.viePM.llena, [r.vie, r.viePM]);
  chk('4c · el sábado va con lo de los sábados (faltan 2): 10 + 5 = 15 de 15 → se llena', r.sab && r.sab.k===2 && r.sab.suele===5 && r.sab.llena, r.sab);
  chk('4d · el lunes ya está lleno (12 de 12) y sale como «lleno»; el martes (faltan 4) queda fuera de los 3 días', /2026-11-23 AM 12\+4\/12 lleno/.test(r.lista.join('|')) && r.mar===null && r.lista.length===3, r.lista);
  chk('4e · «Para hacer» de Administración: «3 turnos se van a llenar…» en rojo, con los números del cartel', r.hacer && r.hacer.sev==='r' && r.hacer.n===3 && /3 turnos se van a llenar/.test(r.hacer.t) && r.av.n===3 && /vie 20\/11 mañana \(9 de 12 \+ ~4\)/.test(r.hacer.s), r.hacer);
  chk('4f · el cartel completo: cada turno con lo que hay, lo que suele entrar y «➕ Abrir cupos»', /3 turnos se van a llenar/.test(r.cartel) && /9 de 12 · suelen entrar 4 más → ~13/.test(r.cartel) && /Lleno: 12 de 12/.test(r.cartel) && r.botones===3, r.cartel.slice(0,400));
  chk('4g · arriba del formulario (el cartel de siempre): «La mañana del vie 20/11 se va a llenar…»', /La mañana del vie 20\/11 se va a llenar: hay 9 de 12/.test(r.form), r.form);
  chk('4h · …y en el encabezado nuevo: la tarjeta dice «Se llena», el aviso lo explica y nombra los otros días que se llenan', r.tag.indexOf('Se llena')>=0 && /se va a llenar/.test(r.fh) && r.fhPron.some(function(x){ return /En los próximos días se llenan: sáb 21\/11 mañana · lun 23\/11 mañana \(lleno\)/.test(x); }), { tag:r.tag, pron:r.fhPron });
  chk('4i · «Abrir cupos» sugiere lo que falta con un lugar de margen (2) y lo explica', r.sug==='2' && /suelen entrar 4 más: te sugiero 2/.test(r.sugTxt), r);

  r = await ev(async()=>{
    var o={};
    cupxPoner(VIE,'AM',2); await esperar(900);
    o.vie=cupPronDe(VIE,'AM'); o.n=cupPronDatos().length;
    renderAdmin(); o.hacer=admHacerDatos().filter(function(x){ return x.k==='cupos'; }).map(function(x){ return x.n; });
    return o;
  });
  chk('4j · con 2 abiertos (14) el viernes ya no se llena (9 + 4 = 13) y «Para hacer» baja a 2', r.vie && !r.vie.llena && r.vie.lim===14 && r.n===2 && r.hacer[0]===2, r);

  const sinToast = () => ev(()=>{ var t=document.getElementById('toast'); if(t){ t.className='toast'; t.style.display='none'; setTimeout(function(){ t.style.display=''; }, 1500); } });
  /* 📸 el aviso (1280 y 390) */
  await sinToast();
  await ev(async()=>{ showView('admin'); renderAdmin(); admAvisosAbrir(true, true); var el=document.getElementById('adm-cupos-pron'); if(el) el.scrollIntoView({ block:'start' }); window.scrollTo(0,0); });
  await page.waitForTimeout(300);
  try{ await page.locator('#adm-top').screenshot({ path:CAPT+'/mall_cupos_aviso_1280.png' }); }catch(e){ console.log('captura', e.message); }
  try{ await page.locator('#adm-cupos-pron').screenshot({ path:CAPT+'/mall_cupos_aviso_cartel_1280.png' }); }catch(e){ console.log('captura', e.message); }
  await page.setViewportSize({ width:390, height:844 }); await page.waitForTimeout(300);
  await ev(async()=>{ renderAdmin(); });
  try{ await page.locator('#adm-hacer').screenshot({ path:CAPT+'/mall_cupos_aviso_390.png' }); }catch(e){ console.log('captura', e.message); }
  try{ await page.locator('#adm-cupos-pron').screenshot({ path:CAPT+'/mall_cupos_aviso_cartel_390.png' }); }catch(e){ console.log('captura', e.message); }
  /* 📸 abrir cupos */
  await ev(async()=>{ admAvisosAbrir(false, true); cupxAbrir(SAB,'AM'); var o=document.getElementById('modal'); if(o) o.scrollTop=0; var b=document.getElementById('modal-box'); if(b) b.scrollTop=0; });
  await sinToast(); await page.waitForTimeout(500);
  try{ await page.screenshot({ path:CAPT+'/mall_cupos_abrir_390.png' }); }catch(e){ console.log('captura', e.message); }
  await page.setViewportSize({ width:1280, height:950 }); await page.waitForTimeout(400);
  await sinToast();
  try{ await page.screenshot({ path:CAPT+'/mall_cupos_abrir_1280.png' }); }catch(e){ console.log('captura', e.message); }
  await ev(async()=>{ cupxCerrar(); closeModal(); });

  // ═════════ 5 · ⏳ el lugar apartado ═════════
  console.log('\n── 5. El lugar apartado ──');
  r = await ev(async()=>{
    window.APARTO_PRUEBA=1; delete window.FH_PRUEBA;
    var rows=[];
    for(var i=0;i<8;i++) rows.push(P({ fecha:VIE, turno:'AM' }));
    for(var j=0;j<5;j++) rows.push(P({ fecha:VIE, turno:'PM' }));
    rows.push(P({ id:'existente', fecha:LUN, turno:'AM', cliente:'PEDIDO VIEJO' }));
    await CARGAR(rows);
    var o={ sv:SERVER_VER };
    showView('form'); resetForm(); await esperar(600);
    o.alAbrir=LLAMADAS('apartarCupo').length;
    var fe=document.getElementById('f-fecha'); fe.value=VIE; fe.dispatchEvent(new Event('input',{bubbles:true})); fe.dispatchEvent(new Event('change',{bubbles:true}));
    document.querySelector('#f-turno button[data-val="AM"]').click();
    await esperar(700);
    var ap=LLAMADAS('apartarCupo');
    o.ap1=ap.map(function(x){ return { f:x.fecha, t:x.turno, id:x.id||null, ap:x.aparato, q:x.quien }; });
    o.yo=entAparato();
    o.id1=APARTO && APARTO.id;
    var el=document.getElementById('aparto'); o.linea=el.hidden ? '' : el.textContent.replace(/\s+/g,' ').trim();
    /* cambiar a la tarde: suelta la mañana y aparta la tarde */
    SRV.calls=[]; document.querySelector('#f-turno button[data-val="PM"]').click(); await esperar(700);
    o.cambio=SRV.calls.map(function(x){ return x.action+(x.id?(':'+x.id):'')+(x.turno?(':'+x.turno):''); });
    o.id2=APARTO && APARTO.id; o.srvAM=(SRV.ap[VIE+'|AM']||[]).length; o.srvPM=(SRV.ap[VIE+'|PM']||[]).length;
    o.linea2=document.getElementById('aparto').textContent.replace(/\s+/g,' ').trim();
    /* renovar: pasaron 4 minutos y la persona siguió escribiendo */
    SRV.calls=[]; APARTO.ren=Date.now()-5*60000; APARTO_ACT=Date.now(); apartoTic(); await esperar(200);
    o.renueva=LLAMADAS('apartarCupo').map(function(x){ return x.id||''; });
    /* sin actividad desde la última renovación, no se renueva */
    SRV.calls=[]; APARTO.ren=Date.now()-5*60000; APARTO_ACT=APARTO.ren-1000; apartoTic(); await esperar(200);
    o.sinActividad=LLAMADAS('apartarCupo').length;
    APARTO_ACT=Date.now();
    return o;
  });
  chk('5a · con el servidor 2026-11-14-b, abrir el formulario NO aparta nada (no hay quien esté cargando)', r.sv==='2026-11-14-b' && r.alAbrir===0, r);
  chk('5b · elegir día y turno aparta: `apartarCupo` con la fecha, el turno, el aparato y quién', r.ap1.length===1 && r.ap1[0].f==='2026-11-20' && r.ap1[0].t==='AM' && r.ap1[0].ap===r.yo && !r.ap1[0].id, r.ap1);
  chk('5c · se ve «⏳ Lugar apartado: viernes 20/11 AM para vos · m:ss»', /Lugar apartado: viernes 20\/11 AM para vos · \d{1,2}:\d\d/.test(r.linea), r.linea);
  chk('5d · cambiar de turno suelta el de la mañana y aparta la tarde', r.cambio.indexOf('soltarCupo:'+r.id1)>=0 && r.cambio.some(function(x){ return /^apartarCupo:PM$/.test(x); }) && r.srvAM===0 && r.srvPM===1 && r.id2 && r.id2!==r.id1 && /viernes 20\/11 PM/.test(r.linea2), r);
  chk('5e · pasados 4 minutos con actividad se renueva con su id', r.renueva.length===1 && r.renueva[0]===r.id2, r.renueva);
  chk('5f · sin actividad no se renueva (se vence solo en el servidor)', r.sinActividad===0, r);

  /* 📸 el lugar apartado (1280 y 390), con el encabezado nuevo y el aviso de lo que se llena */
  await ev(async()=>{ window.FH_PRUEBA=1; renderCupoForm(); apartoPintar(); window.scrollTo(0,0); });
  await sinToast(); await page.waitForTimeout(400);
  try{ await page.screenshot({ path:CAPT+'/mall_cupos_apartado_1280.png', clip:{ x:0, y:0, width:1280, height:620 } }); }catch(e){ console.log('captura', e.message); }
  await page.setViewportSize({ width:390, height:844 }); await page.waitForTimeout(400);
  await ev(async()=>{ renderCupoForm(); window.scrollTo(0,0); }); await sinToast();
  try{ await page.screenshot({ path:CAPT+'/mall_cupos_apartado_390.png' }); }catch(e){ console.log('captura', e.message); }
  await page.setViewportSize({ width:1280, height:950 }); await page.waitForTimeout(200);
  await ev(async()=>{ delete window.FH_PRUEBA; renderCupoForm(); });

  r = await ev(async()=>{
    var o={};
    /* guardar: el save lleva `aparto` y después no se suelta otra vez */
    var set=function(sel, v){ var x=document.querySelector(sel); x.value=v; x.dispatchEvent(new Event('input',{bubbles:true})); x.dispatchEvent(new Event('change',{bubbles:true})); };
    document.getElementById('f-vendedor').value='Carola Chavez'; applyVendedorLite();
    set('#f-nota','8802'); set('#f-cliente','CLIENTE APARTADO'); set('#f-celular','71234568'); set('#f-productos .prod-codigo','CH1201'); set('#f-productos .prod-cant','1');
    set('#f-zona','Norte'); set('#f-direccion','Av. Banzer 4to anillo'); set('#f-saldo','3000');
    await esperar(500);
    var id=APARTO && APARTO.id; o.idAntes=id;
    SRV.calls=[]; _toasts.length=0;
    submitPedido(); await esperar(1500);
    var sv=LLAMADAS('save').filter(function(x){ return x.pedido && x.pedido.cliente==='CLIENTE APARTADO'; });
    o.aparto=sv.length ? sv[0].aparto : null; o.ok=/Pedido enviado al equipo/.test(_toasts.join('|'));
    o.soltoDespues=LLAMADAS('soltarCupo').length; o.APARTO=APARTO; o.srvPM=(SRV.ap[VIE+'|PM']||[]).length;
    try{ closeModal(); }catch(e){}
    /* limpiar el formulario suelta lo apartado */
    showView('form'); resetForm(); await esperar(100);
    var fe=document.getElementById('f-fecha'); fe.value=VIE; fe.dispatchEvent(new Event('change',{bubbles:true}));
    document.querySelector('#f-turno button[data-val="AM"]').click(); await esperar(700);
    var id3=APARTO && APARTO.id; SRV.calls=[];
    resetForm(); await esperar(100);
    o.limpiar=LLAMADAS('soltarCupo').map(function(x){ return x.id; }); o.id3=id3; o.lineaLimpia=document.getElementById('aparto').hidden;
    /* cerrar la página: con `sendBeacon` */
    fe.value=VIE; fe.dispatchEvent(new Event('change',{bubbles:true})); document.querySelector('#f-turno button[data-val="AM"]').click(); await esperar(700);
    var id4=APARTO && APARTO.id, beacons=[];
    var nb=navigator.sendBeacon; navigator.sendBeacon=function(u, b){ beacons.push(b); return true; };
    window.dispatchEvent(new Event('pagehide'));
    navigator.sendBeacon=nb;
    o.beacon=null; if(beacons.length){ var t=await beacons[0].text(); o.beacon=JSON.parse(t); }
    o.id4=id4; o.trasCerrar=APARTO;
    return o;
  });
  chk('5g · al guardar el pedido nuevo, el `save` lleva `aparto` con el id del lugar apartado', !!r.idAntes && r.aparto===r.idAntes && r.ok, r);
  chk('5h · con el sí del servidor el apartado ya está suelto: no se manda `soltarCupo` y no queda nada apartado', r.soltoDespues===0 && r.APARTO===null && r.srvPM===0, r);
  chk('5i · limpiar el formulario suelta el lugar y se va el cartel', r.limpiar.length===1 && r.limpiar[0]===r.id3 && r.lineaLimpia===true, r);
  chk('5j · cerrar la página lo suelta con `sendBeacon` (`soltarCupo` con su id)', r.beacon && r.beacon.action==='soltarCupo' && r.beacon.id===r.id4 && r.trasCerrar===null, r.beacon);

  r = await ev(async()=>{
    var o={};
    /* lo apartado por OTRA venta ocupa lugar; lo de este aparato no */
    var rows=[]; for(var i=0;i<11;i++) rows.push(P({ fecha:VIE, turno:'AM' }));
    SRV.ap={}; SRV.ap[VIE+'|AM']=[{ id:'otro1', aparato:'iPad · zzzz', quien:'Isabel Robledo', hasta:Date.now()+300000 }, { id:'mio9', aparato:entAparato(), quien:'yo', hasta:Date.now()+300000 },
      { id:'vencido', aparato:'Windows · yyyy', quien:'Jonathan', hasta:Date.now()-1000 }];
    await CARGAR(rows);
    o.usados=cuposUsadosTurno(VIE,'AM'); o.pedidos=cuposPedidosTurno(VIE,'AM'); o.otros=apartadosOtros(VIE,'AM');
    showView('form'); resetForm();
    document.getElementById('f-fecha').value=VIE; segSet('f-turno','AM'); renderCupoForm();
    o.form=document.getElementById('cupo-form').textContent.replace(/\s+/g,' ').trim();
    verCuposTurno(VIE,'AM'); o.ver=document.getElementById('modal-box').textContent.replace(/\s+/g,' ').trim(); closeModal();
    window.FH_PRUEBA=1; renderCupoForm(); o.fh=document.getElementById('fh').textContent.replace(/\s+/g,' ').trim(); delete window.FH_PRUEBA; renderCupoForm();
    /* con el turno lleno por lo apartado, elegirlo no aparta */
    SRV.calls=[]; var fe=document.getElementById('f-fecha'); fe.dispatchEvent(new Event('change',{bubbles:true})); document.querySelector('#f-turno button[data-val="AM"]').click(); await esperar(700);
    o.apartaLleno=LLAMADAS('apartarCupo').length;
    SRV.ap={};
    return o;
  });
  chk('6a · lo apartado por otra venta ocupa lugar (11 pedidos + 1 = 12); el de este aparato y el vencido no', r.pedidos===11 && r.otros===1 && r.usados===12, r);
  chk('6b · el cartel dice «Turno AM lleno … (12/12 · ⏳ 1 apartado por otra venta)»', /Turno AM lleno/.test(r.form) && /\(12\/12 · ⏳ 1 apartado por otra venta\)/.test(r.form), r.form);
  chk('6c · «Ver los pedidos del turno»: 12 de 12 ocupados y «1 lugar apartado por otra venta», con 11 pedidos en la lista', /12de 12 cupos ocupados/.test(r.ver) && /1 lugar apartado por otra venta/.test(r.ver), r.ver.slice(0,260));
  chk('6d · el encabezado nuevo: «Ver los 11 pedidos» (los pedidos, no lo apartado) y «⏳ 1 apartado por otra venta»', /Ver los 11 pedidos/.test(r.fh) && /⏳ 1 apartado por otra venta/.test(r.fh), r.fh.slice(0,300));
  chk('6e · con el turno lleno no se aparta nada (el cartel ya dice lleno)', r.apartaLleno===0, r);

  r = await ev(async()=>{
    var o={};
    var rows=[]; for(var i=0;i<5;i++) rows.push(P({ fecha:LUN, turno:'AM' }));
    rows.push(P({ id:'existente', fecha:LUN, turno:'AM', cliente:'PEDIDO VIEJO' }));
    await CARGAR(rows);
    /* el servidor dice lleno al apartar */
    showView('form'); resetForm(); SRV.lleno=true; SRV.calls=[]; _toasts.length=0;
    var fe=document.getElementById('f-fecha'); fe.value=LUN; fe.dispatchEvent(new Event('change',{bubbles:true})); document.querySelector('#f-turno button[data-val="AM"]').click();
    await esperar(800);
    o.toast=_toasts.join(' | '); o.APARTO=APARTO; o.linea=document.getElementById('aparto').textContent.replace(/\s+/g,' ').trim();
    o.relee=LLAMADAS('list').length;
    SRV.lleno=false;
    /* con algo apartado, pasar a ATC lo suelta; y abrir otro pedido para corregirlo, también */
    resetForm(); await esperar(100); SRV.calls=[];
    fe.value=LUN; fe.dispatchEvent(new Event('change',{bubbles:true})); document.querySelector('#f-turno button[data-val="PM"]').click(); await esperar(700);
    var idA=APARTO && APARTO.id;
    segSet('f-doc-tipo','ATC'); pintarDocTipo(true); await esperar(700);
    o.atcSuelta=LLAMADAS('soltarCupo').map(function(x){ return x.id; }).indexOf(idA)>=0 && !!idA && APARTO===null;
    resetForm(); await esperar(100); SRV.calls=[];
    fe.value=LUN; fe.dispatchEvent(new Event('change',{bubbles:true})); document.querySelector('#f-turno button[data-val="PM"]').click(); await esperar(700);
    var idB=APARTO && APARTO.id;
    editPedido('existente'); await esperar(200);
    o.editSuelta=LLAMADAS('soltarCupo').map(function(x){ return x.id; }).indexOf(idB)>=0 && !!idB && APARTO===null;
    /* corregir un pedido: no aparta */
    resetForm(); await esperar(100); SRV.calls=[];
    editPedido('existente'); await esperar(150);
    document.querySelector('#f-turno button[data-val="PM"]').click(); await esperar(700);
    o.editar=LLAMADAS('apartarCupo').length;
    /* una ATC: no aparta */
    resetForm(); await esperar(100); SRV.calls=[];
    segSet('f-doc-tipo','ATC'); pintarDocTipo(true);
    fe.value=LUN; fe.dispatchEvent(new Event('change',{bubbles:true})); document.querySelector('#f-turno button[data-val="AM"]').click(); await esperar(700);
    o.atc=LLAMADAS('apartarCupo').length;
    /* un fallo de red al apartar: nada apartado, el guardado sigue como siempre (sin `aparto`) */
    resetForm(); await esperar(100); SRV.falla=true; SRV.calls=[];
    fe.value=LUN; fe.dispatchEvent(new Event('change',{bubbles:true})); document.querySelector('#f-turno button[data-val="AM"]').click(); await esperar(700);
    o.fallaPidio=SRV.calls.filter(function(x){ return x.action==='apartarCupo'; }).length; o.fallaAP=APARTO;
    var set=function(sel, v){ var x=document.querySelector(sel); x.value=v; x.dispatchEvent(new Event('input',{bubbles:true})); x.dispatchEvent(new Event('change',{bubbles:true})); };
    document.getElementById('f-vendedor').value='Carola Chavez'; applyVendedorLite();
    set('#f-nota','8803'); set('#f-cliente','CLIENTE SIN RED'); set('#f-celular','71234569'); set('#f-productos .prod-codigo','CH1201'); set('#f-productos .prod-cant','1');
    set('#f-zona','Norte'); set('#f-direccion','Av. Banzer 4to anillo'); set('#f-saldo','3000');
    await esperar(400); _toasts.length=0;
    submitPedido(); await esperar(1500);
    var sv=LLAMADAS('save').filter(function(x){ return x.pedido && x.pedido.cliente==='CLIENTE SIN RED'; });
    o.fallaSave=sv.length; o.fallaAparto=sv.length ? (sv[0].aparto||null) : 'x'; o.fallaOk=/Pedido enviado al equipo/.test(_toasts.join('|'));
    SRV.falla=false; try{ closeModal(); }catch(e){}
    /* sin `APARTO_PRUEBA` (Playwright) o con el servidor de antes: nada */
    delete window.APARTO_PRUEBA; showView('form'); resetForm(); SRV.calls=[];
    fe.value=LUN; fe.dispatchEvent(new Event('change',{bubbles:true})); document.querySelector('#f-turno button[data-val="AM"]').click(); await esperar(700);
    o.sinBandera=LLAMADAS('apartarCupo').length;
    window.APARTO_PRUEBA=1; SERVER_VER='2026-11-14-a'; resetForm(); SRV.calls=[];
    fe.value=LUN; fe.dispatchEvent(new Event('change',{bubbles:true})); document.querySelector('#f-turno button[data-val="AM"]').click(); await esperar(700);
    o.viejo=LLAMADAS('apartarCupo').length;
    return o;
  });
  chk('7a · `cupos_llenos` al apartar se dice como un turno lleno, se relee la planilla y no queda nada apartado', /Turno AM lleno para el 23\/11\/2026/.test(r.toast) && r.APARTO===null && r.relee>=1 && /La mañana del lunes 23\/11 se llenó/.test(r.linea), r);
  chk('7b · corregir un pedido que ya existe no aparta', r.editar===0, r);
  chk('7b2 · con un lugar apartado, pasar a ATC lo suelta, y abrir otro pedido para corregirlo también', r.atcSuelta===true && r.editSuelta===true, r);
  chk('7c · una ATC no aparta', r.atc===0, r);
  chk('7d · un fallo de red al apartar no frena nada: el pedido se guarda igual, sin `aparto`', r.fallaPidio===1 && r.fallaAP===null && r.fallaSave===1 && r.fallaAparto===null && r.fallaOk, r);
  chk('7e · sin `APARTO_PRUEBA` (las pruebas de siempre) y con el servidor de antes, nunca se llama a `apartarCupo`', r.sinBandera===0 && r.viejo===0, r);

  chk('sin errores de JavaScript en la página', errores.length===0, errores.slice(0,4));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
