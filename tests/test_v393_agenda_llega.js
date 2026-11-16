/* 🎨 LA AGENDA DICE DESDE QUÉ DÍA LLEGA TU PEDIDO (16/11/2026, mejora 393; el dueño la eligió en «Mejoras visuales 390-440»).
   Con un producto que solo está en Moreno, la agenda de la izquierda marcaba mañana con sus lugares libres como si estuviera todo bien.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin `AG_LLEGA_PRUEBA` (Playwright): la agenda de siempre, sin marcas.
   2. Con la bandera y la almohada solo en Moreno (se trae en 1 día): mañana rayado «⛔ No llega: Almohada (está en Moreno)», el viernes en
      verde «✅ Desde acá llega todo · tocá para elegirlo» y el sábado «✓ llega todo». Los cupos de cada día siguen diciendo lo mismo.
   3. El día sale del cuadrito: es el `minimo` del `saldoVeredicto` de la almohada.
   4. Con todo en PTF (llega desde mañana): ninguna marca.
   5. Tocar el día verde lo elige (como siempre).
   Datos SINTÉTICOS. Reloj clavado el miércoles 23/09/2026 15:00. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_v393_agenda_llega.js */
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
    var v=document.getElementById('f-vendedor'); v.value='Maria Flores'; v.dispatchEvent(new Event('input',{bubbles:true}));
    _renglon(0, { codigo:'CD1403', cant:1 });
    await _esperar(600); saldoAvisosPintarYa(); await _esperar(300); fxIzqPintar();
    var b=document.querySelector('#f-productos .prod-saldo');
    return { agenda:[].map.call(document.querySelectorAll('#fx-izq .fx-agd'), function(x){ return { f:x.getAttribute('data-f'), cls:x.className, tag:((x.querySelector('.p393-tag')||{}).textContent||''), ok:!!x.querySelector('.p393-ok'),
      cupos:[].map.call(x.querySelectorAll('.fx-tr .q'), function(q){ return q.textContent; }).join('|') }; }), minimo:b && b._v ? (b._v.minimo||b._v.desde) : null, tipo:b && b._v ? b._v.tipo : null };
  }, stock);

  console.log('\n── 1. Sin la bandera ──');
  let r0 = await llenar({ im:{ ALM:30 } });
  chk('1 la agenda de siempre, sin marcas', r0.agenda.length>3 && r0.agenda.every(a=>!/p393/.test(a.cls) && !a.tag && !a.ok), r0.agenda.slice(0,3));

  console.log('\n── 2-3. Con la bandera: la almohada solo en Moreno ──');
  await ev(() => { window.AG_LLEGA_PRUEBA=1; });
  let r = await llenar({ im:{ ALM:30 } });
  const A=(f)=>r.agenda.filter(a=>a.f===f)[0]||{};
  chk('2a el cuadrito dice Moreno y llega el viernes 25/09', r.tipo==='moreno' && r.minimo==='2026-09-25', [r.tipo, r.minimo]);
  chk('2b mañana (jueves 24/09) rayado: «⛔ No llega: Almohada (está en Moreno)»', /p393-no/.test(A('2026-09-24').cls) && /⛔ No llega: Almohada \(está en Moreno\)/.test(A('2026-09-24').tag), A('2026-09-24'));
  chk('2c el viernes 25/09 en verde: «✅ Desde acá llega todo · tocá para elegirlo»', /p393-si/.test(A('2026-09-25').cls) && /Desde acá llega todo · tocá para elegirlo/.test(A('2026-09-25').tag), A('2026-09-25'));
  chk('2d el sábado 26/09: «✓ llega todo»', /p393-ok/.test(A('2026-09-26').cls) && A('2026-09-26').ok, A('2026-09-26'));
  chk('2e el domingo sigue cerrado, sin marcas', !/p393/.test(A('2026-09-27').cls) && /off/.test(A('2026-09-27').cls), A('2026-09-27'));
  chk('3 los cupos de cada día dicen lo mismo que sin la bandera', r.agenda.every((a,i)=>a.cupos===r0.agenda[i].cupos), [r.agenda.map(a=>a.cupos), r0.agenda.map(a=>a.cupos)]);

  console.log('\n── 4. Todo en PTF ──');
  r = await llenar({ aca:{ ALM:30 } });
  chk('4 llega desde mañana: ninguna marca', r.agenda.every(a=>!/p393/.test(a.cls) && !a.tag), r.agenda.slice(0,2));

  console.log('\n── 5. Tocar el día verde ──');
  r = await llenar({ im:{ ALM:30 } });
  r = await ev(async () => { var b=document.querySelector('#fx-izq .fx-agd.p393-si'); b.click(); await _esperar(200); return document.getElementById('f-fecha').value; });
  chk('5 tocar el día verde lo elige', r==='2026-09-25', r);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
