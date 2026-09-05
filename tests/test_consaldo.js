/* ⏳ «CON SALDO» TIENE QUE CONTAR LO MISMO QUE LA TARJETA «FALTA COBRAR» (§4cg).

   Una auditoría externa lo vio en la pantalla: la tarjeta decía **5 ventas con saldo** y
   el resumen de abajo **7**. En Mayoristas, «Con saldo: 3» al lado de «no queda saldo
   pendiente». El resumen contaba cualquier venta no marcada pagada —incluidas las que no
   tienen monto anotado y las cobradas del todo que nadie marcó—, y la tarjeta usaba
   `contaFaltaCobrar`. Dos reglas para la misma palabra.

   Se corre:  node tests/test_consaldo.js   (desde la raíz del repo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1600,height:1100} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    var hoy=todayStr(), ts=new Date(new Date().setHours(12,0,0,0)).getTime();
    var base={fecha:hoy,turno:'AM',celular:'70000000',nit:'1',zona:'Norte',direccion:'Av. X',
              vendedor:'Carola Chavez',chofer:'Juan',
              productos:[{desc:'SOFT ICE',medida:'120X190',cant:1,precio:1500}],ts:ts};
    function P(o){ var q={}; for(var k in base)q[k]=base[k]; for(var k in o)q[k]=o[k]; return q; }
    window._FIX=STATE=[
      /* sin nada anotado: NO es una deuda, es un dato que falta */
      P({id:'s1', nota:'900', oc:'08-400', cliente:'SIN NADA ANOTADO', acuenta:0, saldo:0, pagado:false, metodoPago:''}),
      /* debe de verdad */
      P({id:'s2', nota:'901', oc:'08-401', cliente:'DEBE DE VERDAD', acuenta:0, saldo:1500, pagado:false, metodoPago:''}),
      /* a cuenta + saldo: debe */
      P({id:'s3', nota:'902', oc:'08-402', cliente:'A CUENTA CON SALDO', acuenta:500, saldo:1000, pagado:false, metodoPago:'~Efectivo 500 @'+hoy+' #902 %I3'}),
      /* a cuenta que cubre todo, sin marcar pagada: NO debe */
      P({id:'s4', nota:'903', oc:'08-403', cliente:'A CUENTA SIN SALDO', acuenta:1500, saldo:0, pagado:false, metodoPago:'~Efectivo 1500 @'+hoy+' #903 %I4'}),
      /* pagada */
      P({id:'s5', nota:'904', oc:'08-404', cliente:'PAGADA OK', acuenta:0, saldo:0, pagado:true, metodoPago:'Efectivo 1500 @'+hoy+' #904 %I5'}),
      /* pagos en el historial, saldo 0, sin marcar: NO debe */
      P({id:'s6', nota:'905', oc:'08-405', cliente:'CON LEDGER', acuenta:0, saldo:0, pagado:false, metodoPago:'Efectivo 1500 @'+hoy+' #905 %I6'})
    ];
    apiSave=function(){ return Promise.resolve({ok:true}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(window._FIX))}); };
    document.getElementById('admin-lock').style.display='none';
    document.getElementById('admin-content').style.display='block';
    showView('conta'); segSet('cta-tab','ventas'); setContaTab('ventas');
    segSet('cta-mode','todo'); setContaModo('todo');
  });
  await page.waitForTimeout(400);

  const r = await page.evaluate(() => {
    var res=(document.getElementById('cta-resumen')||{}).textContent||'';
    var tarj=(document.getElementById('cta-metrics')||{}).textContent||'';
    var m=res.match(/Con saldo:\s*(\d+)/), t=tarj.match(/(\d+)\s+ventas? con saldo/);
    return { resumen: res.replace(/\s+/g,' '), tarjeta: tarj.replace(/\s+/g,' '),
             conSaldo: m?Number(m[1]):-1, tarjetaN: t?Number(t[1]):-1,
             sinMonto: (res.match(/Sin monto anotado:\s*(\d+)/)||[])[1],
             sinMarcar: (res.match(/sin marcar pagadas:\s*(\d+)/)||[])[1],
             pagados: (res.match(/Pagados:\s*(\d+)/)||[])[1] };
  });
  console.log('\n── El resumen y la tarjeta cuentan lo mismo ──');
  chk('la tarjeta «Falta cobrar» cuenta 2 ventas con saldo (las que deben de verdad)', r.tarjetaN===2, r.tarjeta.slice(0,160));
  chk('⚠️ el resumen dice «Con saldo: 2», IGUAL que la tarjeta (antes decía 5)', r.conSaldo===2, r.resumen.slice(0,200));
  chk('la que no tiene monto anotado va aparte: «Sin monto anotado: 1»', r.sinMonto==='1', r.sinMonto);
  chk('las cobradas del todo pero sin marcar van aparte: 2', r.sinMarcar==='2', r.sinMarcar);
  chk('Pagados: 1', r.pagados==='1', r.pagados);
  chk('las cuatro categorías suman las 6 ventas', (1+2+Number(r.sinMonto||0)+Number(r.sinMarcar||0))===6);
  chk('el monto del resumen es lo que falta cobrar de verdad (Bs 2.500,00)', /Con saldo: 2 \(Bs 2\.500,00\)/.test(r.resumen), r.resumen.slice(0,200));

  // ── Mayoristas: «Con saldo» y «no queda saldo pendiente» no pueden convivir ──
  const m = await page.evaluate(async () => {
    var hoy=todayStr(), ts=new Date(new Date().setHours(12,0,0,0)).getTime();
    window._FIX=STATE=[
      {id:'m1',fecha:hoy,turno:'AM',celular:'70000000',zona:'Norte',direccion:'x',vendedor:'ROHO',oc:'4521',nota:'',
       cliente:'ROHO SRL',productos:[{desc:'COLCHON',cant:2,precio:800}],acuenta:0,saldo:0,pagado:false,metodoPago:'',ts:ts},
      {id:'m2',fecha:hoy,turno:'AM',celular:'70000000',zona:'Norte',direccion:'x',vendedor:'ROHO',oc:'4522',nota:'',
       cliente:'ROHO SRL',productos:[{desc:'COLCHON',cant:1,precio:800}],acuenta:0,saldo:0,pagado:true,metodoPago:'Transferencia 800 @'+hoy+' #1',ts:ts}
    ];
    segSet('cta-tab','mayor'); setContaTab('mayor');
    renderConta();
    await new Promise(r=>setTimeout(r,200));
    var res=(document.getElementById('cta-resumen')||{}).textContent||'';
    var tarj=(document.getElementById('cta-metrics')||{}).textContent||'';
    return { resumen: res.replace(/\s+/g,' '), tarjeta: tarj.replace(/\s+/g,' '), ambito: contaAmbito() };
  });
  if(m.ambito==='mayor'){
    chk('Mayoristas: con una sin monto y una pagada, el resumen NO dice «Con saldo: 1»', !/Con saldo: 1/.test(m.resumen), m.resumen.slice(0,200));
    chk('…y coincide con la tarjeta que dice que no queda saldo pendiente', /no queda saldo pendiente/.test(m.tarjeta) && /Con saldo: 0/.test(m.resumen), m.tarjeta.slice(0,120));
  }else{
    console.log('   (no se pudo abrir el ámbito Mayoristas desde el test: '+m.ambito+')');
  }

  chk('la página no tiró ningún error de JavaScript', errors.length===0, errors.join(' | ').slice(0,300));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
