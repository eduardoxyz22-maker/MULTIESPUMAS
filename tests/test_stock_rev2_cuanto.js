/* 🎯 CUÁNTO TENER DE LO QUE ROTA: PUNTO DE PEDIDO Y OBJETIVO (18/10, §4ls; decisión 4 del dueño, la regla «paso 2» de la revisión 2).

   LO QUE ESTA PRUEBA CUIDA (los ✗ fallan contra la página de antes, `f6581e5`):
   O1  La cuenta: venta por día hábil (últimos 26 días hábiles, por fecha de venta) y su desvío; punto de pedido = μ×5 + z·σ·√5 (z 1,28,
       o 1,645 si en 5 días se esperan ≥ 4 u); objetivo = punto de pedido + 1 día de venta, nunca menos que el pedido típico (el 75 % de
       las entregas de 8 semanas). Se calcula ACÁ, aparte, y la página tiene que dar lo mismo.
   O2  Se pide hasta el objetivo SOLO cuando lo libre (PTF + Banzer + lo que viene − lo vendido para 15 días) llega al punto de pedido: en
       el punto de pedido se pide objetivo − libre; con 1 más no se pide nada y el aviso no es «pedir» (aunque la proyección se corte).
   O3  Lo vendido sin stock (libre negativo) se pide hasta el objetivo; lo de Moreno se trae primero y lo que falta se fabrica; si Moreno
       lo cubre todo, «🚚 Traé N de Moreno».
   O4  Las almohadas: objetivo = punto de pedido + 5 días de venta.  O5  El pedido típico es el piso del objetivo.  O6  z alto.
   O7  QUÉ rota no cambia: 2 entregas en 15 días no tienen objetivo (se pide solo lo vendido, «a pedido» en el Plan); 3 entregas de 1
       unidad sí. Eduardo (salvo a Multicenter) no cuenta en la venta; Eduardo a Multicenter sí. Lo discontinuado no tiene objetivo.
   O8  UNA SOLA VERDAD: «Pedir 7 días» del Plan = «Qué producir» 7 días = la acción («Pedí N») = la copia para la fábrica = «Cómo se
       calcula»; el Plan muestra el objetivo y el punto de pedido («Tener»); la tabla dice el porqué; «Banzer o PTF» tiene lo mismo.
   O9  «15 días» y «el mes» con la misma regla: 15 días = lo vendido hasta 15 días + la fábrica + el objetivo + la venta de los días
       hábiles de esos 15 días − lo que hay; el mes = su venta (días hábiles) + lo vendido para el mes − lo que el 1° queda POR ENCIMA del
       objetivo. El ritmo de 15 días de la proyección («Se corta») no cambia (O1d): cómo se mide el ritmo es otra decisión.
   O10 No salta con el corte de las 16:30: «Pedir 7 días» y «15 días» dan lo mismo a las 12:00 y a las 16:31.

   Reloj CLAVADO (viernes 16/10/2026 de Bolivia). Red cortada, datos sintéticos.
   Se corre:  node tests/test_stock_rev2_cuanto.js
   Dientes:   PEDIDOS=/ruta/a/pedidos_f6581e5.html node tests/test_stock_rev2_cuanto.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,700)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

/* ── La regla, escrita aparte (la de ultra2/objetivos/pol_obj.py `final`, con L=4 y R=1) ── */
const sumar=(f,n)=>{ const d=new Date(f+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); };
const habil=(f,fer)=> new Date(f+'T12:00:00Z').getUTCDay()!==0 && !fer.has(f);
function regla(ventas, hoy, fer, almohada){
  const dias=[]; let f=hoy; while(dias.length<48){ if(habil(f,fer)) dias.push(f); f=sumar(f,-1); }
  const pos={}; dias.forEach((d,i)=>pos[d]=i);
  const serie=new Array(26).fill(0), ord={};
  for(const v of ventas){ let g=v.f; while(!(g in pos) && g>=dias[47]) g=sumar(g,-1); if(!(g in pos)) continue;
    const i=pos[g]; if(i<26) serie[i]+=v.u; ord[v.ek]=(ord[v.ek]||0)+v.u; }
  const tot=serie.reduce((a,b)=>a+b,0), mu=tot/26, sd=Math.sqrt(serie.reduce((a,x)=>a+(x-mu)*(x-mu),0)/25);
  let tam=Object.values(ord).sort((a,b)=>a-b); if(!tam.length) tam=[1];
  const q75=tam[Math.floor(0.75*(tam.length-1))];
  const z=(mu*5>=4)?1.645:1.28, prot=mu*5+z*sd*Math.sqrt(5), S=Math.max(prot+mu*(almohada?5:1), q75), s=Math.min(S-1, prot);
  return { mu, sd, q75, z, S, s, obj:Math.ceil(S-1e-9), pp:Math.floor(s+1e-9), tot, ini:dias[25] };
}
const pedirRegla=(R, libre)=> (libre<=R.s || libre<0) ? Math.max(0, Math.ceil(R.S-libre-1e-9)) : 0;
const habilesEntre=(a,b,fer)=>{ let n=0; for(let f=sumar(a,1); f<=b; f=sumar(f,1)) if(habil(f,fer)) n++; return n; };

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=false;
  try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  window._SRV={ pedidos:[], stock:null };
  apiList=function(){
    var l=JSON.parse(JSON.stringify(window._SRV.pedidos));
    if(window._SRV.stock) l.push({ id:'__stock__', fecha:'', cliente:'📦 STOCK', observaciones:JSON.stringify(window._SRV.stock) });
    return Promise.resolve({ ok:true, pedidos:l });
  };
  apiSave=function(rec){ return Promise.resolve({ ok:true, pedido:rec }); };
  window._copiado=''; copyText=function(t){ window._copiado=String(t); };
  window._LOG='PRODUCTOS TERMINADOS FAB.'; window._BZ='Almacen Distribucion Banzer'; window._IM='IM - PRODUCTOTERMINADO';
  window._k=function(cod, d, m){ return stockInfo({ codigo:cod, desc:d, medida:m }).k; };
  window._stock=function(fn){
    var hoy=todayStr(), t=new Date(hoy+'T08:00:00-04:00').getTime();
    var st={ v:2, pv:3, c:{ f:hoy, hora:'08:00:00', u:{}, solo0:true, alm:_LOG, cod:{}, t:t, inc:false }, e:[], p:[], a:{}, g:{}, al:{}, h:[], det:[], sm:[] };
    st.g[_BZ]={ f:hoy, hora:'08:00:00', u:{}, solo0:true, cod:{}, t:t, rs:{}, inc:false };
    st.g[_IM]={ f:hoy, hora:'08:00:00', u:{}, solo0:true, cod:{}, t:t, rs:{} };
    st.al[_LOG]='log'; st.al[_BZ]='sale'; st.al[_IM]='otro';
    if(fn) fn(st);
    return st;
  };
  window._n=0;
  window._ped=function(fecha, lineas, extra){
    var id='p'+(++window._n);
    return Object.assign({ id:id, oc:'OC 10-'+(800+window._n), fecha:fecha, turno:'AM', cliente:'CLIENTE '+id.toUpperCase(), vendedor:'Maria Flores',
             celular:'70000000', zona:'Norte', productos:lineas }, extra||{});
  };
  /* Ventas ya entregadas del equipo: [{f, u}] → una entrega por renglón, con fecha = día de venta (sin `ts`, contaFecha = fecha). */
  window._ventas=function(cod, desc, med, lista, extra){
    return lista.map(function(v){ return _ped(v.f, [{ codigo:cod, desc:desc, medida:med, cant:v.u, precio:1000 }], Object.assign({ entregado:true }, extra||{})); });
  };
  window._cargar=async function(pedidos, stock){
    window._SRV.pedidos=pedidos||[]; window._SRV.stock=stock||_stock(); STOCK_CARGADO=false;
    await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok';
    stockOlvidarIndice();
  };
  window._fila=function(k){ return stockData().lista.filter(function(o){ return o.k===k; })[0]||null; };
  window._txt=function(h){ var d=document.createElement('div'); d.innerHTML=h||''; return (d.innerText||d.textContent||'').replace(/\s+/g,' ').trim(); };
  window._o=function(o){ return o ? { rot:o.rotacion, objS:o.objS, objPP:o.objPP, obj:o.objetivo, pp:o.puntoPedido, mu:o.objMu, sd:o.objSd, tip:o.objTipico,
    porDia:o.porDia, pedir:o.pedir, fab:o.fabricar, rec:o.recoger, aviso:o.aviso, acc:sfAccion(o), hay:stockHaySalir(o), comp:o.comp, dias:o.dias, lead:o.lead } : null; };
}

/* El patrón de venta de TITANIO LATEX 140x190 (CH1129): 2 u en 12 entregas del equipo, 6 de ellas en los últimos 15 días (rotación media). */
const PATRON=['2026-09-17','2026-09-19','2026-09-22','2026-09-24','2026-09-29','2026-10-01','2026-10-03','2026-10-06','2026-10-08','2026-10-10','2026-10-13','2026-10-15'];

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (cuando) => {
    const page = await browser.newPage({ viewport:{ width:1300, height:1000 }, timezoneId:'America/La_Paz' });
    page.setDefaultTimeout(60000);
    page.on('pageerror', e => errores.push(e.message));
    page.on('dialog', d => d.accept());
    await page.route(/^https?:/, r => r.abort());
    await page.clock.setFixedTime(new Date(cuando));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate(PREPARAR);
    return page;
  };
  const ev = (page) => async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,500) }; } };

  const page = await abrir('2026-10-16T12:00:00-04:00');
  const E = ev(page);
  const HOY='2026-10-16';
  const fer = new Set(await page.evaluate(()=>Object.keys(FERIADOS||{}).concat(Object.keys(typeof FERIADOS_PASADOS!=='undefined'?FERIADOS_PASADOS:{}))));

  const vT = PATRON.map((f,i)=>({ f, u:2, ek:'e'+i }));
  const R = regla(vT, HOY, fer, false);

  /* ── O1. La cuenta ── */
  const o1 = await E(async (pat) => {
    var K=_k('CH1129','TITANIO LATEX','140x190');
    await _cargar(_ventas('CH1129','TITANIO LATEX','140x190', pat.map(function(f){ return { f:f, u:2 }; })), _stock(function(st){ st.c.u[K]=30; }));
    return _o(_fila(K));
  }, PATRON);
  chk('O1a. la venta por día hábil (26 días hábiles) y su desvío dan lo mismo que la cuenta aparte', o1 && Math.abs(o1.mu-R.mu)<1e-9 && Math.abs(o1.sd-R.sd)<1e-9, { pagina:o1&&[o1.mu,o1.sd], aparte:[R.mu,R.sd] });
  chk('O1b. punto de pedido y objetivo (con decimales y en unidades) iguales a la regla', o1 && Math.abs(o1.objPP-R.s)<1e-9 && Math.abs(o1.objS-R.S)<1e-9 && o1.pp===R.pp && o1.obj===R.obj, { pagina:o1&&[o1.objPP,o1.objS,o1.pp,o1.obj], regla:[R.s,R.S,R.pp,R.obj] });
  chk('O1c. con 30 a mano (sobre el punto de pedido) no se pide nada y el aviso no es «pedir»', o1 && o1.pedir===0 && o1.fab===0 && ['urgente','pedir','traer'].indexOf(o1.aviso)<0, o1);
  chk('O1d. el ritmo de 15 días (proyección, «Se corta», Banzer o PTF) NO cambia: 12 u en 15 días = 0,8 por día', o1 && Math.abs(o1.porDia-12/15)<1e-9, { porDia:o1&&o1.porDia });

  /* ── O2. Se pide al llegar al punto de pedido, hasta el objetivo ── */
  const o2 = await E(async (a) => {
    var K=_k('CH1129','TITANIO LATEX','140x190'), out={};
    var vend=_ventas('CH1129','TITANIO LATEX','140x190', a.pat.map(function(f){ return { f:f, u:2 }; }));
    await _cargar(vend, _stock(function(st){ st.c.u[K]=a.pp; }));                     // lo libre = punto de pedido
    out.en=_o(_fila(K));
    await _cargar(vend, _stock(function(st){ st.c.u[K]=a.pp+1; }));                   // uno más
    out.mas=_o(_fila(K));
    // en el punto de pedido con 1 vendido para dentro de 3 días (lo libre baja 1) y 1 vendido para dentro de 20 (no cuenta)
    var pend=[_ped('2026-10-19',[{ codigo:'CH1129', desc:'TITANIO LATEX', medida:'140x190', cant:1, precio:1000 }]), _ped('2026-11-05',[{ codigo:'CH1129', desc:'TITANIO LATEX', medida:'140x190', cant:1, precio:1000 }])];
    await _cargar(vend.concat(pend), _stock(function(st){ st.c.u[K]=a.pp+1; }));
    out.vend=_o(_fila(K));
    // lo que viene (pedido a fábrica, sin llegar) es «libre»
    await _cargar(vend, _stock(function(st){ st.c.u[K]=a.pp-2; st.p=[{ id:'fq-o2', k:K, u:3, fab:'MORENO', f:'2026-10-15', esp:'', r:'' }]; }));
    out.cam=_o(_fila(K));
    return out;
  }, { pat:PATRON, pp:R.pp });
  chk('O2a. con lo libre EN el punto de pedido se pide hasta el objetivo (objetivo − libre)', o2.en && o2.en.pedir===pedirRegla(R, R.pp) && o2.en.pedir===R.obj-R.pp && o2.en.fab===o2.en.pedir && ['pedir','urgente'].indexOf(o2.en.aviso)>=0, { en:o2.en, esperado:R.obj-R.pp });
  chk('O2b. con 1 más (sobre el punto de pedido) no se pide nada, y no dice «Pedí»', o2.mas && o2.mas.pedir===0 && !/Pedí/.test(o2.mas.acc||''), o2.mas);
  chk('O2c. lo vendido para los próximos 15 días baja lo libre (pedido para el 19/10); lo de dentro de 20 días no', o2.vend && o2.vend.pedir===pedirRegla(R, R.pp) && o2.vend.comp===2, o2.vend);
  chk('O2d. lo que viene de fábrica cuenta como libre: '+(R.pp-2)+' a mano + 3 en camino = '+(R.pp+1)+' → no se pide', o2.cam && o2.cam.pedir===0 && o2.cam.fab===0, o2.cam);

  /* ── O3. Vendido sin stock; primero de Moreno ── */
  const o3 = await E(async (a) => {
    var K=_k('CH1129','TITANIO LATEX','140x190'), out={};
    var vend=_ventas('CH1129','TITANIO LATEX','140x190', a.pat.map(function(f){ return { f:f, u:2 }; }));
    var pend=[_ped('2026-10-20',[{ codigo:'CH1129', desc:'TITANIO LATEX', medida:'140x190', cant:3, precio:1000 }])];
    await _cargar(vend.concat(pend), _stock(function(st){ st.c.u[K]=1; }));             // libre = 1 − 3 = −2
    out.neg=_o(_fila(K));
    await _cargar(vend.concat(pend), _stock(function(st){ st.c.u[K]=1; st.g[_IM].u[K]=2; }));   // 2 en Moreno
    out.im=_o(_fila(K));
    await _cargar(vend.concat(pend), _stock(function(st){ st.c.u[K]=1; st.g[_IM].u[K]=40; }));  // Moreno lo cubre todo
    out.imTodo=_o(_fila(K));
    return out;
  }, { pat:PATRON });
  const pNeg=pedirRegla(R, -2);
  chk('O3a. lo vendido sin stock (libre −2) se pide hasta el objetivo: objetivo + 2', o3.neg && o3.neg.pedir===pNeg && pNeg===R.obj+2 && o3.neg.fab===pNeg, { neg:o3.neg, esperado:pNeg });
  chk('O3b. primero se trae de Moreno (2) y lo que falta se fabrica', o3.im && o3.im.rec===2 && o3.im.fab===pNeg-2 && /traé 2 de Moreno/.test(o3.im.acc||''), o3.im);
  chk('O3c. si Moreno lo cubre todo: «🚚 Traé N de Moreno», nada para fabricar', o3.imTodo && o3.imTodo.rec===pNeg && o3.imTodo.fab===0 && o3.imTodo.aviso==='traer' && new RegExp('Traé '+pNeg+' de Moreno').test(o3.imTodo.acc||''), o3.imTodo);

  /* ── O4-O6. Almohadas, pedido típico, z alto ── */
  const vA = PATRON.map((f,i)=>({ f, u:2, ek:'a'+i }));
  const RA = regla(vA, HOY, fer, true);
  const big = PATRON.slice(4).map((f,i)=>({ f, u:(i<3?1:6), ek:'b'+i }));     // 8 entregas (6 en 15 días), la mayoría de 6: el típico
  const RB = regla(big, HOY, fer, false);
  const alto = PATRON.map((f,i)=>({ f, u:10, ek:'z'+i }));
  const RZ = regla(alto, HOY, fer, false);
  const o4 = await E(async (a) => {
    var KA=_k('CD1403','ALMOHADA','50x70'), KB=_k('CH1130','TITANIO LATEX','160x190'), KZ=_k('CH1131','TITANIO LATEX','180x190');
    var ped=_ventas('CD1403','ALMOHADA','50x70', a.pat.map(function(f){ return { f:f, u:2 }; }))
      .concat(_ventas('CH1130','TITANIO LATEX','160x190', a.big))
      .concat(_ventas('CH1131','TITANIO LATEX','180x190', a.pat.map(function(f){ return { f:f, u:10 }; })));
    await _cargar(ped, _stock(function(st){ st.c.u[KA]=0; st.c.u[KB]=0; st.c.u[KZ]=0; }));
    return { A:_o(_fila(KA)), B:_o(_fila(KB)), Z:_o(_fila(KZ)) };
  }, { pat:PATRON, big:big.map(v=>({ f:v.f, u:v.u })) });
  chk('O4. almohadas: objetivo = punto de pedido + 5 días de venta ('+RA.obj+'; un colchón con la misma venta, '+R.obj+')', o4.A && o4.A.obj===RA.obj && Math.abs(o4.A.objS-(RA.s+5*RA.mu))<1e-9 && RA.obj>R.obj, { A:o4.A, regla:RA });
  chk('O5. el pedido típico (6) es el piso del objetivo', o4.B && o4.B.tip===6 && o4.B.obj===RB.obj && RB.obj>=6 && o4.B.rot!=='baja', { B:o4.B, regla:RB });
  chk('O6. lo que vende mucho (≥ 4 u en 5 días) lleva el margen grande (z 1,645)', o4.Z && Math.abs(o4.Z.objS-RZ.S)<1e-9 && RZ.z===1.645, { Z:o4.Z && [o4.Z.objS, o4.Z.obj], regla:[RZ.S, RZ.obj, RZ.z] });

  /* ── O7. Qué rota no cambia ── */
  const o7 = await E(async (a) => {
    var K1=_k('CH1129','TITANIO LATEX','140x190'), K2=_k('CH1130','TITANIO LATEX','160x190'), KJ=_k('CH1075','ESPECIAL JUNIOR','90x190');
    var out={};
    // 2 entregas de 10 en 15 días (más viejas en el mes): sin rotación → sin objetivo; 4 vendidas sin entregar y 1 a mano → pedir 3
    var dos=_ventas('CH1129','TITANIO LATEX','140x190', [{f:'2026-09-18',u:10},{f:'2026-09-25',u:10},{f:'2026-10-07',u:10},{f:'2026-10-14',u:10}]);
    var pend=[_ped('2026-10-21',[{ codigo:'CH1129', desc:'TITANIO LATEX', medida:'140x190', cant:4, precio:1000 }])];
    // 3 entregas de 1 en 15 días: rota
    var tres=_ventas('CH1130','TITANIO LATEX','160x190', [{f:'2026-10-05',u:1},{f:'2026-10-09',u:1},{f:'2026-10-14',u:1}]);
    // discontinuado con rotación
    var jun=_ventas('CH1075','ESPECIAL JUNIOR','90x190', a.pat.map(function(f){ return { f:f, u:2 }; }));
    await _cargar(dos.concat(pend, tres, jun), _stock(function(st){ st.c.u[K1]=1; st.c.u[K2]=0; st.c.u[KJ]=0; }));
    var d=stockData(); out.dos=_o(_fila(K1)); out.tres=_o(_fila(K2)); out.jun=_o(_fila(KJ));
    PLAN_F='todos'; PLAN_TODOS=true; PLAN_ABIERTA='';
    var dv=document.createElement('div'); dv.innerHTML=stockPlanHtml(d, d.lista);
    var celda=function(k){ var tr=[].filter.call(dv.querySelectorAll('tr.pl-fila'), function(t){ return t.getAttribute('data-k')===k; })[0]; var c=tr&&tr.querySelector('td.pl-tener'); return c?c.innerText.replace(/\s+/g,' ').trim():null; };
    out.celdaDos=celda(K1);
    return out;
  }, { pat:PATRON });
  chk('O7a. 2 entregas en 15 días (aunque sean 40 u en el mes): sin objetivo, se pide solo lo vendido (4 − 1 = 3)', o7.dos && o7.dos.rot==='baja' && o7.dos.objS==null && o7.dos.pedir===3 && o7.dos.porDia===0, o7.dos);
  chk('O7b. …y en el Plan dice «a pedido»', o7.celdaDos==='a pedido', o7.celdaDos);
  chk('O7c. 3 entregas de 1 unidad en 15 días SÍ rotan: tienen objetivo', o7.tres && o7.tres.rot==='media' && o7.tres.objS!=null && o7.tres.obj>=1, o7.tres);
  chk('O7d. lo discontinuado no tiene objetivo ni se fabrica', o7.jun && o7.jun.objS==null && o7.jun.fab===0, o7.jun);

  const o7e = await E(async (a) => {
    var K=_k('CH1129','TITANIO LATEX','140x190'), out={};
    var base=_ventas('CH1129','TITANIO LATEX','140x190', a.pat.map(function(f){ return { f:f, u:2 }; }));
    var edu=_ventas('CH1129','TITANIO LATEX','140x190', [{f:'2026-10-02',u:5},{f:'2026-10-09',u:5}], { vendedor:'Eduardo' });
    var mc=_ventas('CH1129','TITANIO LATEX','140x190', [{f:'2026-10-02',u:5},{f:'2026-10-09',u:5}], { vendedor:'Eduardo', cliente:'MULTICENTER' });
    await _cargar(base, _stock(function(st){ st.c.u[K]=30; })); out.base=_o(_fila(K));
    await _cargar(base.concat(edu), _stock(function(st){ st.c.u[K]=30; })); out.edu=_o(_fila(K));
    await _cargar(base.concat(mc), _stock(function(st){ st.c.u[K]=30; })); out.mc=_o(_fila(K));
    return out;
  }, { pat:PATRON });
  chk('O7e. las ventas de Eduardo (a otro cliente) no cuentan en la venta del objetivo', o7e.base && o7e.edu && Math.abs(o7e.edu.mu-o7e.base.mu)<1e-9 && o7e.edu.obj===o7e.base.obj, { base:o7e.base&&o7e.base.mu, edu:o7e.edu&&o7e.edu.mu });
  chk('O7f. las de Eduardo a Multicenter sí (10 u más en la ventana)', o7e.mc && Math.abs(o7e.mc.mu-(o7e.base.mu+10/26))<1e-9 && o7e.mc.obj>o7e.base.obj, { base:o7e.base&&o7e.base.mu, mc:o7e.mc&&o7e.mc.mu });

  /* ── O8. Una sola verdad ── */
  const o8 = await E(async (a) => {
    var K=_k('CH1129','TITANIO LATEX','140x190');
    var vend=_ventas('CH1129','TITANIO LATEX','140x190', a.pat.map(function(f){ return { f:f, u:2 }; }));
    await _cargar(vend, _stock(function(st){ st.c.u[K]=1; }));
    var d=stockData(), o=d.lista.filter(function(x){ return x.k===K; })[0];
    PLAN_F='todos'; PLAN_TODOS=true; PLAN_ABIERTA=K;
    var dv=document.createElement('div'); dv.innerHTML=stockPlanHtml(d, d.lista);
    var tr=[].filter.call(dv.querySelectorAll('tr.pl-fila'), function(t){ return t.getAttribute('data-k')===K; })[0];
    var p7=tr && tr.querySelector('td.pl-p7'), ten=tr && tr.querySelector('td.pl-tener'), det=tr && tr.nextElementSibling;
    var th=[].map.call(dv.querySelectorAll('thead th'), function(x){ return x.innerText.replace(/\s+/g,' ').trim(); });
    var plan=stockPlanDatos(d, d.lista).filter(function(x){ return x.o.k===K; })[0];
    var prod=null; stockProducir(d).bloques.forEach(function(B){ B.filas.forEach(function(f){ if(f.o.k===K) prod=f; }); });
    window._copiado=''; copiarStock(); var copia=window._copiado;
    window._copiado=''; copiarProducirTodo('sem'); var copia7=window._copiado;
    var como=_txt(stockSaldoDetalleHtml(o));
    var nec=stockNecesario(o), nb=null; try{ var z=almZonaData(); (z.filas||z.lista||[]).forEach(function(x){ if((x.o||x).k===K) nb=x; }); }catch(e){}
    return { o:_o(o), p7:p7?p7.innerText.trim():null, tener:ten?ten.innerText.replace(/\s+/g,' ').trim():null, det:det?det.innerText.replace(/\s+/g,' ').trim():'', th:th,
      plan7:plan&&plan.p7, prod7:prod&&prod.sem, copia:copia, copia7:copia7, como:como, nec:nec, compH:stockCompHorizonte(o), objS:o.objS };
  }, { pat:PATRON });
  const p8 = pedirRegla(R, 1);
  chk('O8a. con 1 a mano: «Pedir 7 días» del Plan = la regla = «Qué producir» 7 días = o.fabricar', o8.o && o8.o.fab===p8 && o8.plan7===p8 && o8.prod7===p8 && o8.p7===String(p8), { o:o8.o&&o8.o.fab, plan:o8.plan7, prod:o8.prod7, celda:o8.p7, regla:p8 });
  chk('O8b. la acción dice «Pedí '+p8+'»', new RegExp('Pedí '+p8+' ').test(o8.o&&o8.o.acc||''), o8.o&&o8.o.acc);
  chk('O8c. el Plan tiene la columna «Tener» con el objetivo y el punto de pedido', o8.th.some(t=>/^TENER/i.test(t)) && new RegExp('^'+R.obj+'\\s*pedí al bajar a '+R.pp+' · libre 1$').test(o8.tener||''), { th:o8.th, tener:o8.tener });
  chk('O8d. el detalle de la fila explica: libre 1 ≤ punto de pedido '+R.pp+' → hasta '+R.obj, /lo libre .* es 1; llegó al punto de pedido \(\d+\) → pedí hasta tener \d+: \d+/.test(o8.det) && o8.det.indexOf('pedí hasta tener '+R.obj+': '+p8)>=0, o8.det.slice(0,300));
  chk('O8e. la copia para la fábrica pide '+p8+' y dice el objetivo', new RegExp('pedir '+p8+' ').test(o8.copia||'') && new RegExp('tener '+R.obj+' \\(se pide al bajar a '+R.pp+'\\)').test(o8.copia||'') && /punto de pedido/.test(o8.copia||''), (o8.copia||'').slice(0,400));
  chk('O8f. «📋 7 días» de Qué producir copia el mismo número', new RegExp('TITANIO LATEX · 140x190 \\(cód [^)]*\\): '+p8+' ').test(o8.copia7||''), (o8.copia7||'').slice(0,300));
  chk('O8g. «Cómo se calcula» muestra la cuenta con los mismos números', /Punto de pedido = la venta de 5 días hábiles/.test(o8.como) && o8.como.indexOf('→ '+R.pp+'.')>=0 && o8.como.indexOf('→ '+R.obj+'.')>=0 && o8.como.indexOf('= '+p8+'.')>=0, o8.como.slice(o8.como.indexOf('Cómo se calcula'), o8.como.indexOf('Cómo se calcula')+600));
  chk('O8h. lo que hay que TENER (torre, «Su historia», «Banzer o PTF») = lo vendido para 15 días + el objetivo', Math.abs(o8.nec-(o8.compH+o8.objS))<1e-9, { nec:o8.nec, compH:o8.compH, objS:o8.objS });

  /* ── O9. 15 días y el mes ── */
  const o9 = await E(async (a) => {
    var K=_k('CH1129','TITANIO LATEX','140x190');
    var vend=_ventas('CH1129','TITANIO LATEX','140x190', a.pat.map(function(f){ return { f:f, u:2 }; }));
    var pend=[_ped('2026-10-28',[{ codigo:'CH1129', desc:'TITANIO LATEX', medida:'140x190', cant:2, precio:1000 }]), _ped('2026-11-12',[{ codigo:'CH1129', desc:'TITANIO LATEX', medida:'140x190', cant:3, precio:1000 }])];
    await _cargar(vend.concat(pend), _stock(function(st){ st.c.u[K]=4; st.g[_IM].u[K]=1; }));
    var d=stockData(), f=null; stockProducir(d).bloques.forEach(function(B){ B.filas.forEach(function(x){ if(x.o.k===K) f=x; }); });
    var o=_fila(K);
    return { sem:f&&f.sem, quin:f&&f.quin, mes:f&&f.mes, mesNec:f&&f.mesNec, mesQueda:f&&f.mesQueda, rango:f&&f.rango, hay:f&&f.hay, o:_o(o), corte:o.corte, porDia:o.porDia };
  }, { pat:PATRON });
  {
    // la cuenta aparte: hay = 4 + 1 (Moreno); vendido 2 el 28/10 (dentro de 15 + 4) y 3 el 12/11 (noviembre)
    const hay=5, h15=habilesEntre(HOY, sumar(HOY,15), fer), hResto=habilesEntre(HOY,'2026-10-31',fer), hNov=habilesEntre('2026-10-31','2026-11-30',fer);
    const quin=Math.max(o9.sem||0, Math.ceil(2 + R.S + R.mu*h15 - hay - 1e-9), 0);
    /* (18/10, §4ls, corrector, a conciencia) El mes se redondea UNA vez, como la regla validada (`tabla.py`: ceil(μ·hábiles + vendido −
       lo que sobra)); «queda» se muestra como necesita − producir para que la fila cierre. Con «ceil − floor» daba +1 en 20 de 38
       productos que rotan el 16/10 (611 u contra 591). */
    const qRaw=hay + quin - (2 + R.S + R.mu*hResto), necRaw=3 + R.mu*hNov;
    const nec=Math.ceil(necRaw - 1e-9), mes=Math.max(0, Math.ceil(necRaw - qRaw - 1e-9)), queda=mes>0 ? nec-mes : Math.floor(qRaw + 1e-9);
    chk('O9a. 15 días = lo vendido + el objetivo + la venta de los días hábiles de esos 15 días − lo que hay ('+quin+')', o9.quin===quin && o9.quin>=o9.sem, { pagina:o9.quin, aparte:quin, sem:o9.sem, h15 });
    chk('O9b. el mes = su venta + lo vendido para el mes − lo que el 1° queda sobre el objetivo ('+nec+' · '+queda+' · '+mes+'), sin rango', o9.mes===mes && o9.mesNec===nec && o9.mesQueda===queda && o9.rango==null, { pagina:[o9.mesNec,o9.mesQueda,o9.mes], aparte:[nec,queda,mes] });
  }

  /* ── O10. No salta con el corte de las 16:30 ── */
  const page2 = await abrir('2026-10-16T16:31:00-04:00');
  const E2 = ev(page2);
  const corre = async (EE) => EE(async (a) => {
    var K=_k('CH1129','TITANIO LATEX','140x190');
    var vend=_ventas('CH1129','TITANIO LATEX','140x190', a.pat.map(function(f){ return { f:f, u:2 }; }));
    var pend=[_ped('2026-10-28',[{ codigo:'CH1129', desc:'TITANIO LATEX', medida:'140x190', cant:2, precio:1000 }])];
    await _cargar(vend.concat(pend), _stock(function(st){ st.c.u[K]=2; }));
    var d=stockData(), f=null; stockProducir(d).bloques.forEach(function(B){ B.filas.forEach(function(x){ if(x.o.k===K) f=x; }); });
    return { sem:f&&f.sem, quin:f&&f.quin, obj:_fila(K).objetivo };
  }, { pat:PATRON });
  const a12 = await corre(E), a1631 = await corre(E2);
  chk('O10. «Pedir 7 días», «15 días» y el objetivo dan lo mismo a las 12:00 y a las 16:31', a12.sem===a1631.sem && a12.quin===a1631.quin && a12.obj===a1631.obj && a12.sem>0, { a12, a1631 });
  /* O11 (§4ls, corrector). Lo libre de la regla cuenta lo vendido hasta HOY + 15 (`LIM15` de la regla validada), no hasta 15 días desde que
     arranca la fábrica: con un pedido para el día 16 (01/11), a las 16:31 (la fábrica arranca mañana) lo libre bajaba y «Pedir 7 días»
     saltaba. */
  const corre11 = async (EE) => EE(async (a) => {
    var K=_k('CH1129','TITANIO LATEX','140x190');
    var vend=_ventas('CH1129','TITANIO LATEX','140x190', a.pat.map(function(f){ return { f:f, u:2 }; }));
    var pend=[_ped('2026-11-01',[{ codigo:'CH1129', desc:'TITANIO LATEX', medida:'140x190', cant:4, precio:1000 }])];
    await _cargar(vend.concat(pend), _stock(function(st){ st.c.u[K]=20; }));
    var d=stockData(), f=null; stockProducir(d).bloques.forEach(function(B){ B.filas.forEach(function(x){ if(x.o.k===K) f=x; }); });
    var o=_fila(K);
    return { libre:stockLibreObj(o), compH:stockCompHorizonte(o), sem:f?f.sem:0, quin:f?f.quin:0, fab:o.fabricar };
  }, { pat:PATRON });
  const b12 = await corre11(E), b1631 = await corre11(E2);
  chk('O11. lo libre del objetivo cuenta lo vendido hasta hoy + 15: el pedido para el 01/11 no entra ni a las 12:00 ni a las 16:31 (lo libre y «Pedir 7 días» no saltan)',
      b12.libre===b1631.libre && b12.compH===0 && b1631.compH===0 && b12.fab===b1631.fab && b12.quin===b1631.quin, { b12, b1631 });

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
