/* 🎨 EL CUADRITO DEL STOCK, SIN EL MISMO AVISO TRES VECES (16/11/2026, mejora 390; el dueño la eligió en «Mejoras visuales 390-440»).
   Un lunes con los Excel del sábado, CADA producto repetía «El último corte es del…», lo mismo de Banzer y de Moreno, su 🔄 y «Saldo al
   corte…». Ahora lo que vale para todos sale UNA vez en la franja `#ps-franja` arriba de los productos, y cada cuadrito queda con lo suyo.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin `PS_FRANJA_PRUEBA` (Playwright): el cuadrito de siempre, con «pedile a logística…», «Saldo al corte…» y su 🔄; sin franja.
   2. Con la bandera y los Excel viejos: UNA franja ámbar «Los saldos son del lunes 21/09…», con PTF · Banzer · Moreno y su día, y UN 🔄;
      ningún cuadrito repite el aviso, el corte ni el 🔄.
   3. Cada cuadrito: el mismo título, los mismos números (en fichitas: Libres en verde, Faltan en rojo con su cuenta), la línea roja de
      «no llega» y «Está en: PTF · Banzer · Moreno» con lo que hay en turquesa.
   4. Con los Excel de hoy: la franja tranquila «Saldo al corte de hoy 08:30…» y los almacenes «hoy».
   5. Solo Banzer viejo: «El Excel de Banzer es del…». Sin conexión: la franja lo dice.
   6. Sin productos completos, o en una ATC: sin franja.
   Datos SINTÉTICOS. Reloj clavado el miércoles 23/09/2026 15:00. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_v390_saldo_franja.js */
const { chromium } = require('playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  window._SRV={ pedidos:[], stock:null };
  apiList=function(){ var l=JSON.parse(JSON.stringify(window._SRV.pedidos)); if(window._SRV.stock) l.push({ id:'__stock__', fecha:'', cliente:'📦 STOCK', observaciones:JSON.stringify(window._SRV.stock) }); return Promise.resolve({ ok:true, pedidos:l }); };
  apiSave=function(r){ return Promise.resolve({ ok:true, pedido:r }); };
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  window.LOG='PRODUCTOS TERMINADOS FAB.'; window.BAN='01-05-025  Almacen Distribucion Banzer'; window.IMN='IM - PRODUCTOTERMINADO';
  window.PR={ TIT:{ desc:'TITANIO ICE', medida:'160x190', codigo:'CH1201' }, ALM:{ desc:'ALMOHADA', medida:'50x70', codigo:'CD1403' } };
  window.K={}; Object.keys(PR).forEach(function(n){ K[n]=stockClave(PR[n]); });
  window._stock=function(op){
    op=op||{}; var hoy=todayStr();
    var st={ c:{ f:op.fAca||hoy, hora:'08:30:00', u:{}, solo0:true, alm:LOG, t:Date.now()-6*3600000 }, e:[], p:[], a:{}, g:{}, al:{}, h:[] };
    st.g[BAN]={ f:op.fBan||hoy, hora:'08:30:00', u:{}, solo0:true, cod:{}, t:Date.now()-6*3600000, rs:{} };
    st.g[IMN]={ f:op.fIm||hoy, hora:'08:00:00', u:{}, solo0:true, cod:{}, t:Date.now()-7*3600000, rs:{} };
    st.al[LOG]='log'; st.al[BAN]='sale'; st.al[IMN]='otro';
    Object.keys(op.aca||{}).forEach(function(n){ st.c.u[K[n]]=op.aca[n]; });
    Object.keys(op.ban||{}).forEach(function(n){ st.g[BAN].u[K[n]]=op.ban[n]; });
    Object.keys(op.im||{}).forEach(function(n){ st.g[IMN].u[K[n]]=op.im[n]; });
    return st;
  };
  window._escenario=async function(stock){ window._SRV.stock=stock; STOCK_CARGADO=false; await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok'; };
  window._nuevo=function(){ showView('form'); resetForm(); };
  window._renglon=function(i, o){
    var cards=document.querySelectorAll('#f-productos .prod-card');
    while(cards.length<=i){ addProdRow(); cards=document.querySelectorAll('#f-productos .prod-card'); }
    var c=cards[i], ev=function(e,t){ e.dispatchEvent(new Event(t||'input', { bubbles:true })); };
    if(o.codigo!=null){ var e=c.querySelector('.prod-codigo'); e.value=o.codigo; ev(e); }
    if(o.cant!=null){ var q=c.querySelector('.prod-cant'); q.value=String(o.cant); ev(q); }
  };
  window._cajas=function(){ return [].map.call(document.querySelectorAll('#f-productos .prod-saldo'), function(b){ return { hidden:!!b.hidden, cls:b.className, txt:b.innerText.replace(/\s+/g,' ').trim(), html:b.innerHTML }; }).filter(function(x){ return !x.hidden; }); };
  window._franja=function(){ var f=document.getElementById('ps-franja'); return { hidden:!f || f.hidden, txt:f ? f.innerText.replace(/\s+/g,' ').trim() : '', mal:!!(f && f.querySelector('.ps390-f.mal')), boton:f ? f.querySelectorAll('.ps-act').length : 0 }; };
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.setFixedTime(new Date('2026-09-23T15:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  await ev(PREPARAR);
  const llenar = async (stock) => ev(async (st) => {
    await _escenario(_stock(st)); _nuevo();
    _renglon(0, { codigo:'CH1201', cant:5 }); _renglon(1, { codigo:'CD1403', cant:1 });
    await _esperar(600); saldoAvisosPintarYa(); await _esperar(50);
    return { cajas:_cajas(), franja:_franja(), botones:document.querySelectorAll('#view-form .ps-act').length };
  }, stock);
  const VIEJO={ fAca:'2026-09-21', fBan:'2026-09-21', fIm:'2026-09-21', aca:{ TIT:2 }, ban:{ TIT:1 }, im:{ ALM:30 } };

  console.log('\n── 1. Sin la bandera ──');
  let r = await llenar(VIEJO);
  chk('1a cada cuadrito con «pedile a logística», «Saldo al corte…» y su 🔄 (como siempre)', r.cajas.length===2 && r.cajas.every(c=>/El último corte es del 21\/09: pedile a logística/.test(c.txt) && /Saldo al corte del 21\/09 08:30/.test(c.txt) && /Actualizar/.test(c.txt)), r.cajas.map(c=>c.txt));
  chk('1b sin franja', r.franja.hidden, r.franja);
  const sinBandera = r;

  console.log('\n── 2. Con la bandera y los Excel del lunes ──');
  await ev(() => { window.PS_FRANJA_PRUEBA=1; });
  r = await llenar(VIEJO);
  chk('2a UNA franja ámbar: «Los saldos son del lunes 21/09 a las 08:30» y que logística todavía no subió los de hoy', !r.franja.hidden && r.franja.mal && /Los saldos son del lunes 21\/09 a las 08:30\./.test(r.franja.txt) && /Logística todavía no subió los Excel de hoy/.test(r.franja.txt), r.franja);
  chk('2b la franja con PTF · Banzer · Moreno y su día', /PTF · 21\/09/.test(r.franja.txt) && /Banzer · 21\/09/.test(r.franja.txt) && /(Moreno|IM)[^·]* · 21\/09/.test(r.franja.txt), r.franja.txt);
  chk('2c UN solo 🔄 en todo el formulario (el de la franja)', r.franja.boton===1 && r.botones===1, r.botones);
  chk('2d ningún cuadrito repite el aviso, el corte ni el 🔄', r.cajas.length===2 && r.cajas.every(c=>!/pedile a logística|El último corte|El Excel de|Saldo al corte|Actualizar/.test(c.txt)), r.cajas.map(c=>c.txt));

  console.log('\n── 3. Cada cuadrito con lo suyo ──');
  chk('3a el mismo título que sin la bandera', r.cajas.every((c,i)=>{ var t=sinBandera.cajas[i].txt.split(' En almacén')[0]; return c.txt.indexOf(t)===0; }), [r.cajas[0].txt.slice(0,90), sinBandera.cajas[0].txt.slice(0,90)]);
  r.fich = await ev(() => [].map.call(document.querySelectorAll('#f-productos .prod-saldo'), function(b){ return { fichas:[].map.call(b.querySelectorAll('.ps390-n span'), function(s){ return [s.className, s.textContent.replace(/\s+/g,' ').trim()]; }),
    donde:(b.querySelector('.ps390-donde')||{}).textContent||'', si:[].map.call(b.querySelectorAll('.ps390-donde i.si'), function(i){ return i.textContent; }), noLlega:!!b.querySelector('.ps-f') }; }));
  const t0=r.fich[0];
  chk('3b los números en fichitas: «En almacén 3», «Pendientes de entrega 0» y «Faltan 2» en rojo con su cuenta', t0.fichas.some(f=>f[1]==='En almacén 3') && t0.fichas.some(f=>/^Pendientes de entrega 0/.test(f[1])) && t0.fichas.some(f=>f[0]==='fal' && /^Faltan 2 \(5 de este pedido − 3 en almacén\)/.test(f[1])), t0.fichas);
  chk('3c los números dicen lo mismo que sin la bandera', (function(){ var n=sinBandera.cajas[0].txt; return t0.fichas.every(f=>n.indexOf(f[1].replace(/ \(.*$/,''))>=0); })(), [t0.fichas, sinBandera.cajas[0].txt]);
  chk('3d «Está en: PTF 2 · Banzer 1 · Moreno 0», con lo que hay en turquesa', /^Está en: PTF 2Banzer 1Moreno 0/.test(t0.donde) && t0.si.join('|')==='PTF 2|Banzer 1', t0);
  chk('3e la almohada: «Libres» en verde y «Moreno 30» en turquesa', r.fich[1].fichas.some(f=>f[0]==='lib' && /^Libres 30/.test(f[1])) && r.fich[1].si.join('|')==='Moreno 30', r.fich[1]);
  chk('3f la línea roja de «no llega» se queda en su cuadrito', await ev(async () => { var f=document.getElementById('f-fecha'); f.value=todayStr(); f.dispatchEvent(new Event('change',{bubbles:true})); await _esperar(450); saldoAvisosPintarYa(); var b=document.querySelectorAll('#f-productos .prod-saldo')[1]; return !!b.querySelector('.ps-f') && /no llega/.test(b.querySelector('.ps-f').textContent); }), '');

  console.log('\n── 4. Con los Excel de hoy ──');
  r = await llenar({ aca:{ TIT:9 }, im:{ ALM:30 } });
  chk('4a la franja tranquila: «Saldo al corte de hoy 08:30, ya descontado lo entregado»', !r.franja.hidden && !r.franja.mal && /Saldo al corte de hoy 08:30, ya descontado lo entregado/.test(r.franja.txt) && /PTF · hoy/.test(r.franja.txt), r.franja);
  chk('4b sigue un solo 🔄', r.botones===1, r.botones);

  console.log('\n── 5. Solo Banzer viejo · sin conexión ──');
  r = await llenar({ fBan:'2026-09-21', aca:{ TIT:9 }, ban:{ TIT:1 }, im:{ ALM:30 } });
  chk('5a «El Excel de Banzer es del lunes 21/09.» y «todavía no subió el Excel de hoy»', r.franja.mal && /El Excel de Banzer es del lunes 21\/09\./.test(r.franja.txt) && /no subió el Excel de hoy/.test(r.franja.txt), r.franja.txt);
  r = await ev(async () => { CARGA_ESTADO='error'; ULTIMO_ERROR='sin red'; saldoAvisosPintarYa(); await _esperar(30); var f=_franja(); CARGA_ESTADO='ok'; ULTIMO_ERROR=''; return f; });
  chk('5b sin conexión: la franja lo dice', r.mal && /Sin conexión/.test(r.txt), r.txt);

  console.log('\n── 6. Sin productos o en una ATC ──');
  r = await ev(async () => { _nuevo(); await _esperar(450); saldoAvisosPintarYa(); return _franja(); });
  chk('6a sin productos completos: sin franja', r.hidden, r);
  r = await ev(async () => { _renglon(0, { codigo:'CH1201', cant:1 }); await _esperar(450); saldoAvisosPintarYa(); var a=_franja();
    segSet('f-doc-tipo','ATC'); setDocTipo();
    await _esperar(450); saldoAvisosPintarYa(); return { antes:a.hidden, atc:_franja().hidden }; });
  chk('6b con un producto sale; en una ATC (sin cuadrito) se va', r.antes===false && r.atc===true, r);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
