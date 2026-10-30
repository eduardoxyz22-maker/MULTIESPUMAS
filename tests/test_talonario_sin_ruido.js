/* 🔢 EL CONTROL DEL CIERRE DE CONTABILIDAD SIN RUIDO (30/10, propuesta 82; dueño: «82»).

   En octubre «Revisar antes de cerrar» listaba 176 ventas «sin cargar al sistema» (166 de tres tiendas que nunca se marcan) y 68 N°
   de nota salteados (7 eran recibos de saldos cobrados en octubre de ventas de septiembre; no había cómo dejar un número como
   anulado). Así no se veían los pocos pendientes de verdad.

   LO QUE CUIDA:
   1. El recibo de un PAGO del mes cuenta como usado aunque la venta sea de otro mes (tapa el hueco, no arma huecos nuevos).
   2. El N° de un RETIRO de la MISMA vendedora (desde que empieza el período) no es un salteado: «es de un retiro». El retiro de otra
      vendedora con el mismo número, o uno de antes del período, no tapa nada.
   3. «Anulado / ya lo vi» por número (y «Deshacer»): sale del aviso, se guarda en la fila del sistema `__talonario__` (que no es una
      venta) con `juntar`, y una marca de OTRO aparato que ya estaba en la planilla no se pisa.
   4. «🏪 Tiendas que se cargan al sistema en otro lado»: vacía de entrada, pide la contraseña de Administración; con una tienda
      tildada sus ventas no cuentan como «sin cargar al sistema» y se dice «N de <tienda> no se cuentan: se cargan en otro lado».
   5. UNA sola cuenta: el aviso, el texto para copiar, el control del cierre del mes, la tarjeta y el chip de Ventas y el Excel.
   6. Sin señal: la marca queda en la cola con sus cambios.

   Reloj CLAVADO (martes 27/10/2026, 10:00 de Bolivia). Solo datos sintéticos.
   Se corre:  node tests/test_talonario_sin_ruido.js
   Dientes contra el panel viejo:  PEDIDOS=/ruta/al/viejo.html node tests/test_talonario_sin_ruido.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1440, height:1000 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await ctx.route(/^https:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-27T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  /* Con el panel viejo (dientes) las funciones nuevas no existen: lo que no vino, vacío, para que cada comprobación diga ✗ y no se corte. */
  const D = (r, d) => Object.assign({}, d, (r && !r.__error) ? r : {});

  const arranque = await ev(async () => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=false; try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    try{ localStorage.setItem(LS_ADMIN, sha256('clave-de-prueba')); }catch(e){}
    var ts=function(f){ return new Date(f+'T11:00:00-04:00').getTime(); }, n=0;
    var V=function(o){ n++; return Object.assign({ id:'v'+n, oc:'10-'+(100+n), nota:'', cliente:'CLIENTE '+n, celular:'7000000'+n, fecha:'2026-10-26', turno:'AM', zona:'Norte',
      vendedor:'Isabel Robledo', productos:[{ desc:'COLCHON SOFT', medida:'140x190', codigo:'CH1001', cant:1, precio:1000 }], saldo:0, acuenta:0, pagado:true,
      metodoPago:'', ts:ts('2026-10-05') }, o); };
    window._BASE=[
      // Isabel (Mia Plaza): notas de octubre 1801, 1803 y 1806 → huecos 1802, 1804 y 1805. Todas «REGISTRADO».
      V({ id:'i1', nota:'1801', metodoPago:'Efectivo 1000 @2026-10-05 #1801 %IMG1 · REGISTRADO' }),
      V({ id:'i2', nota:'1803', metodoPago:'Efectivo 1000 @2026-10-06 #1803 %IMG2 · REGISTRADO', ts:ts('2026-10-06') }),
      V({ id:'i3', nota:'1806', metodoPago:'Efectivo 1000 @2026-10-08 #1806 %IMG3 · REGISTRADO', ts:ts('2026-10-08') }),
      // …una venta de SEPTIEMBRE de Isabel cuyo saldo se cobró el 10/10 con el recibo 1802 (de su talonario) …
      V({ id:'s1', nota:'1700', ts:ts('2026-09-20'), fecha:'2026-09-25', metodoPago:'Efectivo 500 @2026-09-20 #1700 %IMG4 + QR BISA 500 @2026-10-10 #1802 %IMG5 · REGISTRADO' }),
      // …y otra de septiembre de Isabel con un pago de SEPTIEMBRE con el recibo 1807: no es de octubre, no tapa nada (no hay hueco ahí igual).
      // Carola (Central): una registrada y una sin registrar.
      V({ id:'c1', nota:'900', vendedor:'Carola Chavez', metodoPago:'Efectivo 1000 @2026-10-07 #900 %IMG6 · REGISTRADO', ts:ts('2026-10-07') }),
      V({ id:'c2', nota:'901', vendedor:'Carola Chavez', metodoPago:'Efectivo 1000 @2026-10-07 #901 %IMG7', ts:ts('2026-10-07') }),
      // Maria Flores (Buenos Aires): dos sin registrar.
      V({ id:'m1', nota:'2400', vendedor:'Maria Flores', metodoPago:'QR BISA 1000 @2026-10-09 #2400 %IMG8', ts:ts('2026-10-09') }),
      V({ id:'m2', nota:'2401', vendedor:'Maria Flores', metodoPago:'QR BISA 1000 @2026-10-09 #2401 %IMG9', ts:ts('2026-10-09') })
    ];
    /* Retiros: el de Isabel del 12/10 nombra el 1804 (tapa); el de Carola del 12/10 nombra el 1805 (otra vendedora: NO tapa);
       uno de Isabel del 20/09 nombra el 1805 (antes del período: NO tapa). */
    var R=function(id, vend, nota, f){ var r=filaSistema(id, retiroTitulo(), ''); r.vendedor=vend; r.chofer='Eduardo Añez'; r.acuenta=500; r.zona='FACTURADO'; r.nota=nota; r.ts=ts(f); r.direccion='Retiro'; return r; };
    window._RET=[ R('__ret_a1__','Isabel Robledo','1804','2026-10-12'), R('__ret_a2__','Carola Chavez','1805','2026-10-12'), R('__ret_a3__','Isabel Robledo','1805','2026-09-20') ];
    STATE=JSON.parse(JSON.stringify(window._BASE)); RETIROS=JSON.parse(JSON.stringify(window._RET));
    window._srv=null;   // la fila __talonario__ que «tiene la planilla»
    window._saves=[];
    apiList=function(){ var L=JSON.parse(JSON.stringify(window._BASE)).concat(JSON.parse(JSON.stringify(window._RET))); if(window._srv) L.push(JSON.parse(JSON.stringify(window._srv))); return Promise.resolve({ ok:true, pedidos:L }); };
    apiSave=function(r, o){ window._saves.push({ rec:JSON.parse(JSON.stringify(r)), opts:o||null }); if(String(r.id)==='__talonario__'){ var g=JSON.parse(JSON.stringify(r)); g.rev=(Number(r.rev)||0)+1; window._srv=g; return Promise.resolve({ ok:true, pedido:g }); } return Promise.resolve({ ok:true, pedido:r }); };
    showView('conta'); await new Promise(function(r){ setTimeout(r, 250); });
    STATE=JSON.parse(JSON.stringify(window._BASE)); RETIROS=JSON.parse(JSON.stringify(window._RET));
    segSet('cua-mode','mes'); document.getElementById('cua-mes').value='2026-10'; var sv=document.getElementById('cua-vendedor'); if(sv) sv.value='';
    segSet('cta-mode','mes'); document.getElementById('cta-mes').value='2026-10'; var cv=document.getElementById('cta-vendedor'); if(cv) cv.value='';
    window._al=function(){ return cuadreAlertas(cuadrePagos()); };
    window._av=function(k){ return window._al().filter(function(a){ return a.k===k; })[0]||null; };
    return { ok:true };
  });
  if(arranque.__error) console.log('arranque:', arranque.__error);

  /* 1 y 2 */
  console.log('\n── 1-2. Los recibos de los pagos del mes y los retiros de la misma vendedora ──');
  let r = await ev(() => {
    var a=_av('talonario'), d=a ? a.det.filter(function(x){ return /Isabel/.test(x.txt); })[0] : null;
    var H=talonarioHuecos(null, { modo:'mes', val:'2026-10' }, '').filter(function(h){ return /Isabel/.test(h.vendedor); })[0];
    return { txt:a?a.txt.replace(/<[^>]+>/g,''):'', faltan:d?d.numeros:null, H:H?{ f:H.faltan, ret:H.deRetiro.map(function(x){ return x.n+'@'+x.fecha; }), anu:H.anulados }:null };
  }); r=D(r, { txt:'', faltan:null, H:null });
  chk('1. el recibo 1802 (pago del 10/10 de una venta de septiembre) ya no es un salteado', r.faltan && r.faltan.indexOf(1802)<0, r);
  chk('2a. el 1804 nombrado en un retiro de Isabel del 12/10 tampoco: queda como «de un retiro»', r.H && r.H.ret.join()==='1804@2026-10-12' && r.faltan.indexOf(1804)<0, r.H);
  chk('2b. el 1805 sigue salteado: el retiro de Carola no tapa el talonario de Isabel, ni uno de Isabel de septiembre', r.faltan && r.faltan.join()==='1805', r.faltan);
  chk('2c. el aviso cuenta 1 y dice que no cuenta el del retiro', /^1 N° de nota salteado/.test(r.txt) && /no se cuenta 1 que es de un retiro/.test(r.txt), r.txt);

  /* 3. Anulado / ya lo vi, desde el chip del aviso */
  console.log('\n── 3. «Anulado / ya lo vi» y «Deshacer» ──');
  r = await ev(async () => {
    CUA_AV_ABIERTO={ talonario:true }; CUA_CHIP_ABIERTO={}; segSet('cta-tab','cuadre'); setContaTab('cuadre'); renderCuadre();
    var box=document.getElementById('cua-alertas');
    var chip=[].slice.call(box.querySelectorAll('.cua-chip')).filter(function(c){ return /Isabel/.test(c.textContent); })[0]; if(chip) chip.click();
    var sub=box.querySelector('.cua-sub'), btns=sub ? [].slice.call(sub.querySelectorAll('.tal-n button')).map(function(b){ return b.parentNode.textContent; }) : [];
    var b=sub ? [].slice.call(sub.querySelectorAll('.tal-n button')).filter(function(x){ return /1805/.test(x.parentNode.textContent); })[0] : null;
    if(b) b.click();
    var sinAviso=!_av('talonario');
    await new Promise(function(res){ setTimeout(res, 1100); });   // el respiro de 700 ms y la relectura
    var sv=_saves.filter(function(s){ return s.rec.id==='__talonario__'; });
    var ult=sv[sv.length-1], k=ult ? JSON.parse(ult.rec.observaciones).k : [];
    var fila=STATE.filter(function(p){ return p.id==='__talonario__'; })[0];
    return { btns:btns, sinAviso:sinAviso, n:sv.length, k:k, juntar:!!(ult && ult.opts && ult.opts.juntar), sist:esFilaSistema(fila||{id:'__talonario__'}), fuera:fueraDeConta(fila||{id:'__talonario__'}), cola:getPending().filter(function(p){ return p.id==='__talonario__'; }).length };
  }); r=D(r, { btns:[], k:[] });
  chk('3a. al abrir el chip de Isabel, el 1805 trae «Anulado / ya lo vi» y el 1804 dice «retiro del 12/10»', r.btns && r.btns.some(function(t){ return /1805/.test(t) && /Anulado \/ ya lo vi/.test(t); }), r.btns);
  chk('3b. marcarlo saca el aviso del talonario', r.sinAviso===true, r);
  chk('3c. se guarda UNA vez en «__talonario__», con juntar, la clave a|isabel robledo|1805', r.n===1 && r.juntar && r.k.join()==='a|isabel robledo|1805', r);
  chk('3d. la fila es del sistema: no es una venta y no queda en la cola', r.sist && r.fuera && r.cola===0, r);

  r = await ev(async () => {
    talAbrir('2026-10');
    var tx=(document.getElementById('tal-cuerpo')||{}).innerText||'';
    var des=[].slice.call(document.querySelectorAll('#tal-cuerpo .tal-ok button'))[0];
    var tieneDes=!!des; if(des) des.click();
    await new Promise(function(res){ setTimeout(res, 1100); });
    var vuelve=!!_av('talonario');
    var sv=_saves.filter(function(s){ return s.rec.id==='__talonario__'; }), k=JSON.parse(sv[sv.length-1].rec.observaciones).k;
    closeModal();
    return { tx:tx, tieneDes:tieneDes, vuelve:vuelve, k:k };
  }); r=D(r, { tx:'', k:[1] });
  chk('3e. la ventana del talonario lo muestra marcado, con «Deshacer», y el 1804 como de un retiro', /Isabel Robledo/.test(r.tx) && /1805/.test(r.tx) && r.tieneDes && /retiro del 12\/10/.test(r.tx), r.tx.slice(0,300));
  chk('3f. «Deshacer» lo vuelve a poner en el aviso y la fila queda sin la marca', r.vuelve && r.k.length===0, r);

  /* 3g. Otro aparato ya había marcado algo: no se pisa (se relee y se aplica solo lo de acá) */
  r = await ev(async () => {
    window._srv=filaSistema('__talonario__', 'x', JSON.stringify({ v:1, k:['a|carola chavez|777'] })); window._srv.rev=9;
    talMarcar('Isabel Robledo', 1805, true);
    await new Promise(function(res){ setTimeout(res, 1100); });
    var sv=_saves.filter(function(s){ return s.rec.id==='__talonario__'; }), ult=sv[sv.length-1];
    return { k:JSON.parse(ult.rec.observaciones).k, rev:ult.rec.rev };
  }); r=D(r, { k:[] });
  chk('3g. con una marca de otro aparato en la planilla, se guardan las dos y con el sello leído', r.k.join()==='a|carola chavez|777,a|isabel robledo|1805' && r.rev===9, r);

  /* 4 y 5. Las tiendas */
  console.log('\n── 4-5. Tiendas que se cargan en otro lado: una sola cuenta ──');
  r = await ev(async () => {
    var sis0=_av('sistema'); var n0=sis0?sis0.det.length:0;
    talAbrir('', 'tiendas');
    var cb=[].slice.call(document.querySelectorAll('#tal-cuerpo .tal-tiendas input'));
    var vacia=cb.every(function(x){ return !x.checked; }), apagadas=cb.every(function(x){ return x.disabled; });
    var noms=cb.map(function(x){ return x.parentNode.textContent.replace(/\s+/g,' '); });
    talTienda('Buenos Aires', true);   // sin la contraseña: no
    var sinClave=!talSet()['t|Buenos Aires'];
    talClave('mala'); var mala=!talTiendasPuede();
    talClave('clave-de-prueba');
    var ba=[].slice.call(document.querySelectorAll('#tal-cuerpo .tal-tiendas input')).filter(function(x){ return /Buenos Aires/.test(x.parentNode.textContent); })[0];
    ba.checked=true; ba.dispatchEvent(new Event('change'));
    await new Promise(function(res){ setTimeout(res, 1100); });
    closeModal();
    var sis=_av('sistema'), txt=sis?sis.txt.replace(/<[^>]+>/g,''):'';
    var C=nxCierreHojas('2026-10').control, car=C.ambar.concat(C.ok).filter(function(o){ return /cargar al sistema|cargado al sistema/i.test(o.t); })[0];
    segSet('cta-tab','ventas'); setContaTab('ventas'); renderConta();
    var tarjeta=[].slice.call(document.querySelectorAll('#cta-metrics .mc')).filter(function(m){ return /Por cargar al sistema/.test(m.textContent); })[0];
    var chipCarg=CX_CHIPS.filter(function(c){ return c.k==='carg'; })[0], nChip=contaLista().filter(chipCarg.f).length;
    var texto=cuadreTexto();
    var m1=findById('m1'), c2=findById('c2');
    var sv=_saves.filter(function(s){ return s.rec.id==='__talonario__'; }), k=JSON.parse(sv[sv.length-1].rec.observaciones).k;
    return { n0:n0, vacia:vacia, apagadas:apagadas, noms:noms, sinClave:sinClave, mala:mala, txt:txt, n1:sis?sis.det.length:0, car:car&&(car.t+' | '+car.s), tarjeta:tarjeta?tarjeta.textContent.replace(/\s+/g,' '):'', nChip:nChip,
      texto:texto, xlsM:talEnSistemaTxt(m1), xlsC:talEnSistemaTxt(c2), k:k };
  }); r=D(r, { noms:[], txt:'', car:'', tarjeta:'', texto:'', k:[] });
  chk('4a. la lista de tiendas arranca VACÍA, apagada sin la contraseña, con las 6 tiendas (sin Tiendas Roho) y cuántas faltan', r.vacia && r.apagadas && r.noms.length===6 && !r.noms.some(function(t){ return /Roho/.test(t); }) && r.noms.some(function(t){ return /Buenos Aires.*2 ventas sin marcar/.test(t); }), r.noms);
  chk('4b. sin la contraseña (o con una mala) no se tilda', r.sinClave && r.mala, r);
  chk('4c. antes: 3 ventas sin cargar al sistema; con Buenos Aires tildada: 1, y lo dice', r.n0===3 && r.n1===1 && /2 de Buenos Aires no se cuentan: se cargan en otro lado/.test(r.txt), r.txt);
  chk('5a. el control del cierre del mes da lo mismo (1 por cargar) y lo dice', /^1 venta por cargar al sistema/.test(r.car||'') && /2 de Buenos Aires no se cuentan/.test(r.car||''), r.car);
  chk('5b. la tarjeta «Por cargar al sistema» y el chip de Ventas: 1', /Por cargar al sistema\s*1/.test(r.tarjeta) && /Buenos Aires no se cuentan/.test(r.tarjeta) && r.nChip===1, r.tarjeta+' · chip '+r.nChip);
  chk('5c. el texto para copiar dice lo mismo', /1 venta con plata en este período todavía sin cargar al sistema contable · 2 de Buenos Aires no se cuentan/.test(r.texto), r.texto.split('\n').filter(function(l){ return /sistema/.test(l); }).join(' | '));
  chk('5d. en los Excel, «EN SISTEMA» dice «EN OTRO LADO» para Buenos Aires y «NO» para Central', r.xlsM==='EN OTRO LADO' && r.xlsC==='NO', r);
  chk('5e. la tienda queda en la misma fila: t|Buenos Aires', r.k.indexOf('t|Buenos Aires')>=0, r.k);

  /* 5f. El control del cierre trae el talonario con la misma cuenta, y su «Ver» abre la ventana */
  r = await ev(async () => {
    talMarcar('Isabel Robledo', 1805, false);
    await new Promise(function(res){ setTimeout(res, 1100); });
    nxCierreAbrir(); await new Promise(function(res){ setTimeout(res, 100); });
    var am=[].map.call(document.querySelectorAll('#nx-cierre-chk .c3-am'), function(x){ return x.textContent; });
    var it=[].slice.call(document.querySelectorAll('#nx-cierre-chk .c3-am')).filter(function(x){ return /talonario/.test(x.textContent); })[0];
    var b=it?it.querySelector('button'):null; if(b) b.click();
    var abre=!!document.getElementById('tal-cuerpo') && document.getElementById('modal').classList.contains('on') && /octubre/.test(document.getElementById('tal-cuerpo').textContent);
    closeModal();
    return { am:am, abre:abre };
  }); r=D(r, { am:[] });
  chk('5f. el control del cierre suma «1 N° de nota salteado en el talonario» (la misma cuenta) y «Ver» abre la ventana del mes', r.am.some(function(t){ return /1 N° de nota salteado en el talonario/.test(t); }) && r.abre, r);

  /* 6. Sin señal */
  console.log('\n── 6. Sin señal ──');
  r = await ev(async () => {
    CONNECTED=false;
    talMarcar('Isabel Robledo', 1805, true);
    await new Promise(function(res){ setTimeout(res, 900); });
    var q=getPending().filter(function(p){ return p.id==='__talonario__'; })[0];
    CONNECTED=true;
    return { q:!!q, cam:q && q._cambios, k:q ? JSON.parse(q.observaciones).k : [], sigue:!_av('talonario') };
  }); r=D(r, { k:[] });
  chk('6. sin señal la marca vale en pantalla y espera en la cola con sus cambios', r.q && r.cam && r.cam['a|isabel robledo|1805']===true && r.k.indexOf('a|isabel robledo|1805')>=0 && r.sigue, r);

  chk('sin errores en la página', !errores.length, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
