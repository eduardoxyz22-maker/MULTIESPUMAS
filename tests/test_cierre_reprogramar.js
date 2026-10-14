/* 📅 REPROGRAMAR DESDE EL CIERRE DE ENTREGAS (13/10). El dueño, con la captura del cierre: «al tildar lo entregado debería
   permitir ahí mismo reprogramar lo que no se entregó».

   ⚠️ LO QUE ESTA PRUEBA CUIDA (falla contra lo publicado, `27cce45`, que no tiene el botón):
   1. Cada renglón (de hoy y atrasado) tiene «📅 No salió · reprogramar»; abre debajo los días (Hoy PM si era de la mañana, el
      próximo camión, el siguiente, cualquier fecha) y el turno, con los cupos libres. Abrirlo destilda el pedido.
   2. Tocar adentro del recuadro NO tilda el pedido (va afuera del <label>).
   3. «✓ Pasar al…» mueve el pedido (día, turno y número del día nuevo) SIN cerrar la ventana; sale de la lista y queda en
      «📅 Reprogramados en este cierre». Un atrasado también.
   4. Con el turno lleno avisa, pregunta y guarda con `forzar`; un sábado no deja PM.
   5. Lo reprogramado no se confirma como entregado; lo tildado sí, como siempre.
   6. «Hoy PM» deja el pedido en hoy, a la tarde.
   Reloj clavado en el miércoles 14/10/2026 17:00 de Bolivia. Red cortada, servidor simulado, datos sintéticos.
   Se corre:  node tests/test_cierre_reprogramar.js   (desde la raíz) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function BASE(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true; SERVER_AUTH='abierto';
  document.getElementById('admin-lock').style.display='none';
  document.getElementById('admin-content').style.display='block';
  try{ localStorage.removeItem(LS_PEND); localStorage.removeItem(LS_RECHAZOS); localStorage.setItem('me_cierre_quien','Ernesto'); }catch(e){}
  if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  CARGA_GEN++; CARGA_ESTADO='ok'; NO_ENCOLAR={}; SAVE_ULTIMO={}; SAVE_REV={};
  window._saves=[];
  apiSave=function(rec, opts){ window._saves.push({ rec:JSON.parse(JSON.stringify(rec)), opts:opts||null }); return Promise.resolve({ ok:true, pedido:JSON.parse(JSON.stringify(rec)) }); };
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
  window._confirms=[]; window.confirm=function(m){ window._confirms.push(String(m)); return true; };
  window._P=function(o){ return Object.assign({ id:'p'+Math.random().toString(36).slice(2), fecha:todayStr(), oc:'', vendedor:'Carola Chavez',
    cliente:'C', celular:'70000000', turno:'AM', zona:'Norte', direccion:'Av. Banzer 123', maps:'', pagado:false, saldo:0,
    ts:Date.now(), metodoPago:'', observaciones:'', estado:'', entregado:false, vehiculo:'Foton nuevo', chofer:'Luis Pierre',
    garantia:'', nota:'', acuenta:0, facturarA:'', nit:'', nroDia:1, verificado:true, fotos:[],
    productos:[{ desc:'SOFT', medida:'140x190', cant:1, codigo:'CH1001' }] }, o); };
  window._armar=function(){
    STATE=[];
    STATE.push(_P({ id:'h1', oc:'10-001', cliente:'HOY UNO', turno:'AM', nroDia:1 }));
    STATE.push(_P({ id:'h2', oc:'10-002', cliente:'HOY DOS', turno:'AM', nroDia:2 }));
    STATE.push(_P({ id:'h3', oc:'10-003', cliente:'HOY TRES', turno:'PM', nroDia:3 }));
    STATE.push(_P({ id:'a1', oc:'10-004', cliente:'ATRASADO', fecha:'2026-10-12', nroDia:4 }));
    saveMirror();
  };
  window._filas=function(){ return Array.from(document.querySelectorAll('.cie-ent-chk')).map(function(c){ return c.getAttribute('data-id'); }); };
  window._sel=function(id){ var c=document.querySelector('.cie-ent-chk[data-id="'+id+'"]'); return !!(c && c.checked); };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const page = await browser.newPage({ viewport:{ width:1200, height:900 }, timezoneId:'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.install({ time:new Date('2026-10-14T17:00:00-04:00') });
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.clock.runFor(1500);
  await page.evaluate(BASE);
  const ev = (fn, arg) => page.evaluate(fn, arg).catch(e => ({ error:String(e.message||e).slice(0,300) }));

  console.log('\n── 1. El botón y el recuadro ──');
  let r = await ev(() => { _armar(); showView('admin'); abrirCierreEntregas();
    var bs=Array.from(document.querySelectorAll('#modal-box .cie-rp-btn')).map(function(b){ return b.getAttribute('data-id'); });
    return { bs:bs, filas:_filas(), prox:proximoDiaEntrega() }; });
  chk('cada renglón (hoy y atrasado) tiene «📅 No salió · reprogramar»', ['h1','h2','h3','a1'].every(id => r.bs && r.bs.includes(id)), r);
  chk('el próximo camión es el jueves 15/10', r.prox==='2026-10-15', r);
  await page.click('.cie-ent-chk[data-id="h2"]');
  r = await ev(() => ({ sel:_sel('h2') }));
  chk('(tildo HOY DOS)', r.sel, r);
  await page.click('.cie-rp-btn[data-id="h2"]');
  r = await ev(() => { var b=document.querySelector('.cie-rp[data-id="h2"]');
    return { hay:!!b, txt:b ? b.innerText : '', sel:_sel('h2'), f:CIERRE_ENT_RP.f, t:CIERRE_ENT_RP.t,
      dias:b ? Array.from(b.querySelectorAll('.cie-rp-dia')).map(function(x){ return x.textContent; }) : [] }; });
  chk('abre el recuadro debajo del renglón, con el próximo camión elegido y el mismo turno', r.hay && r.f==='2026-10-15' && r.t==='AM', r);
  chk('ofrece Hoy PM, el jueves 15/10 y el viernes 16/10, y dice los cupos', r.dias.length===3 && /Hoy PM/.test(r.dias[0]) && /15\/10/.test(r.dias[1]) && /16\/10/.test(r.dias[2]) && /quedan \d+ de (12|8) /.test(r.txt), r);   // (14/10) el jueves 15/10 tiene 8 en la mañana: un camión en mantenimiento (CUPOS_FECHA)
  chk('abrirlo destilda el pedido (si no salió, no puede quedar tildado)', !r.sel, r);
  await page.click('.cie-rp[data-id="h2"] .cie-rp-t');
  r = await ev(() => ({ sel:_sel('h2'), abierto:!!document.querySelector('.cie-rp[data-id="h2"]') }));
  chk('tocar adentro del recuadro no tilda el pedido', !r.sel && r.abierto, r);

  console.log('\n── 3. Pasarlo al jueves sin cerrar la ventana ──');
  await page.click('.cie-rp[data-id="h2"] .cie-rp-ok');
  await page.waitForTimeout(80);
  r = await ev(() => { var p=findById('h2'), s=_saves.filter(function(x){ return x.rec.id==='h2'; }).pop();
    return { f:p.fecha, t:p.turno, nro:p.nroDia, ent:!!p.entregado, guardo:!!s && s.rec.fecha==='2026-10-15', abierto:document.getElementById('modal').classList.contains('on'),
      filas:_filas(), hechos:(document.querySelector('#modal-box .cie-rp-hechos')||{}).innerText||'' }; });
  chk('el pedido pasó al jueves 15/10 AM, con su número del día nuevo, y se guardó', r.f==='2026-10-15' && r.t==='AM' && r.nro>=1 && r.guardo, r);
  chk('la ventana del cierre sigue abierta y el pedido ya no está en la lista', r.abierto && !r.filas.includes('h2') && r.filas.includes('h1'), r);
  chk('queda en «📅 Reprogramados en este cierre»', /Reprogramados en este cierre · 1/.test(r.hechos) && /10-002/.test(r.hechos) && /15\/10/.test(r.hechos), r);

  console.log('\n── 6. Hoy PM ──');
  await page.click('.cie-rp-btn[data-id="h1"]');
  await page.click('.cie-rp[data-id="h1"] .cie-rp-dia >> nth=0');
  await page.click('.cie-rp[data-id="h1"] .cie-rp-ok');
  await page.waitForTimeout(80);
  r = await ev(() => { var p=findById('h1'); return { f:p.fecha, t:p.turno, filas:_filas() }; });
  chk('«Hoy PM» lo deja hoy, a la tarde, y sigue en la lista de hoy', r.f==='2026-10-14' && r.t==='PM' && r.filas.includes('h1'), r);

  console.log('\n── 4. Turno lleno y sábado ──');
  r = await ev(() => { for(var i=0;i<12;i++) STATE.push(_P({ id:'lleno'+i, fecha:'2026-10-15', turno:'AM', nroDia:10+i })); _saves.length=0; _confirms.length=0;
    cierreEntRpAbrir('h3'); cierreEntRpFecha('2026-10-15','AM');
    var b=document.querySelector('.cie-rp[data-id="h3"]'); return { av:b ? b.innerText : '' }; });
  chk('con el turno lleno lo avisa en el recuadro', /lleno/.test(r.av) && /Se puede igual/.test(r.av), r);
  r = await ev(async () => { await cierreEntRpConfirmar(); var s=_saves.filter(function(x){ return x.rec.id==='h3'; }).pop();
    return { conf:_confirms.length, forzar:!!(s && s.opts && s.opts.forzar), f:findById('h3').fecha, t:findById('h3').turno }; });
  chk('pregunta antes y guarda con forzar (Administración decide)', r.conf===1 && r.forzar && r.f==='2026-10-15' && r.t==='AM', r);
  r = await ev(() => { cierreEntRpAbrir('a1'); cierreEntRpFecha('2026-10-17','PM');
    var b=document.querySelector('.cie-rp[data-id="a1"] .cie-rp-tur:nth-child(2)');
    return { t:CIERRE_ENT_RP.t, pmOff:!!(b && b.disabled) }; });
  chk('un sábado no deja PM: queda en AM y el botón PM está apagado', r.t==='AM' && r.pmOff, r);
  r = await ev(async () => { cierreEntRpFecha('2026-10-16','AM'); await cierreEntRpConfirmar(); var p=findById('a1');
    return { f:p.fecha, ent:!!p.entregado, filas:_filas() }; });
  chk('un atrasado también se reprograma y sale de «Atrasados»', r.f==='2026-10-16' && !r.ent && !r.filas.includes('a1'), r);

  console.log('\n── 5. Confirmar lo tildado sigue igual ──');
  r = await ev(async () => { cierreEntToggle('h1', true); var res=await confirmarCierreEntregas();
    return { h1:!!findById('h1').entregado, h2:!!findById('h2').entregado, h3:!!findById('h3').entregado, a1:!!findById('a1').entregado, hechos:res && res.hechos }; });
  chk('se confirma solo lo tildado; lo reprogramado no queda entregado', r.h1 && !r.h2 && !r.h3 && !r.a1 && r.hechos===1, r);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e => { console.error(e); process.exit(1); });
