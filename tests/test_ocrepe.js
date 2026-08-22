/* 🔢 N° de OC repetidas.
   El caso real: en agosto aparecieron 25 OC duplicadas (08-001, 08-002, 08-010…) y el
   dueño preguntó, con razón, cómo puede repetirse un número que asigna el sistema solo.
   La causa no era el correlativo: era CUÁNDO lo calculaba. Lo sacaba de la planilla que
   esa computadora tenía EN MEMORIA, que es de la última vez que se miró. Una vendedora
   con la pestaña abierta toda la mañana calculaba max+1 sobre el panel de hace horas y
   se llevaba un número que otra ya había usado. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1400,height:1000} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  /* Carga un pedido por el formulario, igual que una vendedora. `enPlanilla` es lo que
     el SERVIDOR tiene (lo que verían las demás); STATE es lo que ve ESTA computadora. */
  const cargar = (cliente) => page.evaluate(async (cliente) => {
    resetForm();
    document.getElementById('f-vendedor').value='Carola Chavez'; applyVendedorLite();
    document.getElementById('f-cliente').value=cliente;
    document.getElementById('f-celular').value='70000000';
    document.getElementById('f-zona').value='Norte';
    document.getElementById('f-direccion').value='Av. X';
    document.getElementById('f-nota').value='1';
    /* ⚠️ resetForm() pone MAÑANA, y si mañana cae DOMINGO el panel no agenda: el test se
       caería solo los sábados. Se corre al primer día entregable. Ver tests/LEEME.md. */
    var _d=new Date(), _f;
    do { _d.setDate(_d.getDate()+1); _f=isoLocal(_d); } while(diaDomingo(_f));
    document.getElementById('f-fecha').value=_f;
    var pd=document.querySelector('#f-productos .prod-desc'); if(pd) pd.value='SOFT ICE';
    var pm=document.querySelector('#f-productos .prod-medida'); if(pm) pm.value='140x190';
    var pc=document.querySelector('#f-productos .prod-cant'); if(pc) pc.value='1';
    submitPedido();
    await new Promise(r=>setTimeout(r,600));
    var g=(window._planilla||[]).filter(function(p){ return p.cliente===cliente; })[0];
    return g?g.oc:'(no se guardó)';
  }, cliente);

  const prep = () => page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; VENTA_TIENDA=false;
    OC_DESDE='2000-01-01';                       // el correlativo, siempre activo
    window._planilla=[];                          // lo que hay EN LA PLANILLA (el servidor)
    apiSave=function(rec){ window._planilla.push(JSON.parse(JSON.stringify(rec))); return Promise.resolve({ok:true}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(window._planilla))}); };
    STATE=[];
    showView('form');
  });

  // ---------- 1. numeración normal ----------
  await prep();
  const a1 = await cargar('CLIENTE UNO');
  const a2 = await cargar('CLIENTE DOS');
  const a3 = await cargar('CLIENTE TRES');
  const mes = await page.evaluate(()=>todayStr().slice(5,7));
  chk('los pedidos van tomando números correlativos', a1===mes+'-001' && a2===mes+'-002' && a3===mes+'-003',
      [a1,a2,a3].join(' · '));

  // ---------- 2. EL CASO REPORTADO ----------
  /* Otra vendedora cargó 5 pedidos mientras esta tenía la pestaña abierta. La planilla
     los tiene; el STATE de esta computadora, no. Antes: se llevaba el 004 otra vez. */
  const r2 = await page.evaluate(async () => {
    var mes=todayStr().slice(5,7), ts=Date.now();
    for(var i=4;i<=8;i++){
      window._planilla.push({ id:'otra'+i, oc:mes+'-'+('00'+i).slice(-3), fecha:tomorrowStr(),
        vendedor:'Maria Flores', cliente:'DE OTRA COMPU '+i, nota:String(i), turno:'AM',
        celular:'7', zona:'Sur', direccion:'Y', productos:[{desc:'A',cant:1}], saldo:0, ts:ts });
    }
    // ESTA computadora sigue viendo lo de antes: 3 pedidos, no 8.
    return { veEnPantalla:STATE.length, hayEnPlanilla:window._planilla.length };
  });
  chk('la computadora está viendo la planilla vieja (3 de 8)', r2.veEnPantalla===3 && r2.hayEnPlanilla===8,
      've '+r2.veEnPantalla+' de '+r2.hayEnPlanilla);

  const a9 = await cargar('EL QUE SE REPETIA');
  chk('igual le toca el número que sigue de VERDAD, no el que veía', a9===mes+'-009', a9+' (esperado '+mes+'-009)');

  const rep = await page.evaluate(()=>{
    STATE=JSON.parse(JSON.stringify(window._planilla));
    return { repetidas:ocsRepetidas(), ocs:window._planilla.map(function(p){return p.oc;}) };
  });
  chk('  y no queda ninguna OC repetida', rep.repetidas.length===0, rep.ocs.join(', '));

  // ---------- 3. la venta de TIENDA también ----------
  const r3 = await page.evaluate(async () => {
    var mes=todayStr().slice(5,7), ts=Date.now();
    window._planilla.push({ id:'otra10', oc:mes+'-010', fecha:tomorrowStr(), vendedor:'Maria Flores',
      cliente:'OTRA MAS', nota:'10', turno:'AM', celular:'7', zona:'Sur', direccion:'Y',
      productos:[{desc:'A',cant:1}], saldo:0, ts:ts });
    return STATE.length;
  });
  const t1 = await page.evaluate(async () => {
    // se simula la venta de tienda: no tiene fecha de entrega ni día que se cierre
    STATE=STATE.slice(0,3);                       // otra vez con la pantalla vieja
    abrirVentaTienda();
    document.getElementById('f-vendedor').value='Carola Chavez'; applyVendedorLite();
    document.getElementById('f-cliente').value='VENTA DE TIENDA';
    document.getElementById('f-celular').value='70000001';
    document.getElementById('f-nota').value='2';
    var pd=document.querySelector('#f-productos .prod-desc'); if(pd) pd.value='SOFT ICE';
    var pm=document.querySelector('#f-productos .prod-medida'); if(pm) pm.value='140x190';
    var pc=document.querySelector('#f-productos .prod-cant'); if(pc) pc.value='1';
    submitPedido();
    await new Promise(r=>setTimeout(r,700));
    var g=(window._planilla||[]).filter(function(p){ return p.cliente==='VENTA DE TIENDA'; })[0];
    return g?g.oc:'(no se guardó)';
  });
  chk('la venta de TIENDA también mira la planilla antes de numerar', t1===mes+'-011',
      t1+' (esperado '+mes+'-011)');

  // ---------- 4. sin internet no traba: guarda con el provisorio ----------
  const sin = await page.evaluate(async () => {
    STATE=JSON.parse(JSON.stringify(window._planilla));
    apiList=function(){ return new Promise(function(){}); };   // no contesta nunca
    resetForm();
    document.getElementById('f-vendedor').value='Carola Chavez'; applyVendedorLite();
    document.getElementById('f-cliente').value='SIN RED';
    document.getElementById('f-celular').value='70000002';
    document.getElementById('f-zona').value='Norte';
    document.getElementById('f-direccion').value='Av. Z';
    document.getElementById('f-nota').value='3';
    var _d=new Date(), _f;                                   // el primer día entregable (no domingo)
    do { _d.setDate(_d.getDate()+1); _f=isoLocal(_d); } while(diaDomingo(_f));
    document.getElementById('f-fecha').value=_f;
    var pd=document.querySelector('#f-productos .prod-desc'); if(pd) pd.value='SOFT ICE';
    var pm=document.querySelector('#f-productos .prod-medida'); if(pm) pm.value='140x190';
    var pc=document.querySelector('#f-productos .prod-cant'); if(pc) pc.value='1';
    submitPedido();
    await new Promise(r=>setTimeout(r,5200));      // el tope es de 4 segundos
    var g=(window._planilla||[]).filter(function(p){ return p.cliente==='SIN RED'; })[0];
    return g?g.oc:'(no se guardó)';
  });
  chk('si la planilla no contesta, NO traba a la vendedora: guarda igual', /^\d{2}-\d{3}$/.test(sin), sin);

  chk('sin errores JS', errors.length===0, errors.slice(0,2).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
