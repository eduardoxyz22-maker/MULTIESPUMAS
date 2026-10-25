/* 🪙 EL CENTAVO CUENTA (25/10, §4mm; auditoría Codex/Astra FIN-03/FIN-22; dueño: «Sí, hacelo exacto»).

   LO QUE CUIDA (los casos del informe, con datos ficticios):
   1. Precio 100,01 pagado con 100: NO queda «pagada» y le falta 0,01 (antes pagado=sí y falta 0 con el saldo 0,01 escondido); la ficha de
      Contabilidad y «Falta cobrar» lo dicen.
   2. Precio 0,30 pagado con 0,31: 0,01 cobrado de más se ve (antes exceso 0).
   3. Dos ventas entregadas que deben 0,01 y 0,02: el aviso del Cuadre suma 0,03 de las dos (antes, solo la de 0,02).
   4. Lo de siempre sigue igual: 100 pagado con 100 queda pagada y sin exceso.

   Reloj CLAVADO (domingo 25/10/2026, 12:00 de Bolivia). Solo datos sintéticos.
   Se corre:  node tests/test_centavo_exacto.js   (PEDIDOS=… para correrla contra otra versión) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1280, height:900 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await ctx.route(/^https:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-25T12:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  const r = await page.evaluate(async () => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
    apiSave=function(x){ return Promise.resolve({ ok:true, pedido:x }); };
    var hoy=todayStr(), n=0;
    var P=function(precio, o){ n++; return Object.assign({ id:'c'+n, oc:'10-'+(100+n), nota:String(5000+n), cliente:'CLIENTE '+n, celular:'7000000'+n, fecha:'2026-10-24', turno:'AM',
      zona:'Norte', vendedor:'Maria Flores', productos:[{ desc:'COLCHON', medida:'140x190', cant:1, precio:precio }], saldo:precio, acuenta:0, pagado:false, metodoPago:'',
      ts:new Date('2026-10-20T10:00:00-04:00').getTime(), rev:1 }, o||{}); };
    var cobrar=function(p, monto){ aplicarCobros(p, [{ metodo:'Efectivo', monto:monto, fecha:hoy, nota:'7', comps:['f'] }]); return p; };
    var a=cobrar(P(100.01), 100.00), b=cobrar(P(0.30), 0.31), d=cobrar(P(100), 100);
    var e1=cobrar(P(10.01, { entregado:true }), 10.00), e2=cobrar(P(20.02, { entregado:true }), 20.00);
    STATE=[a, b, d, e1, e2];
    var out={ a:{ pagado:!!a.pagado, saldo:r2(Number(a.saldo)||0), falta:contaFaltaCobrar(a) }, b:{ pagado:!!b.pagado, exceso:excesoCobro(b) }, d:{ pagado:!!d.pagado, falta:contaFaltaCobrar(d), exceso:excesoCobro(d) } };
    showView('conta'); await new Promise(function(res){ setTimeout(res, 200); });
    try{ segSet('cua-mode','todo'); }catch(e){}
    var al=[]; try{ al=cuadreAlertas(cuadrePagos()); }catch(e){ al=[{ txt:'ERR '+e.message }]; }
    var ent=al.filter(function(x){ return x.k==='entregado'; })[0];
    out.alerta=ent ? ent.txt.replace(/<[^>]+>/g,'') : '';
    showContaModal(a.id); await new Promise(function(res){ setTimeout(res, 80); });
    out.ficha=((document.getElementById('modal-box')||{}).innerText||'').replace(/\s+/g,' ');
    try{ closeModal(); }catch(e){}
    return out;
  });
  chk('1a. 100,01 pagado con 100: no queda «pagada» y le falta 0,01 (antes pagada, falta 0)', r.a.pagado===false && r.a.saldo===0.01 && Math.abs(r.a.falta-0.01)<1e-9, r.a);
  chk('1b. …y la ficha de Contabilidad dice el saldo de Bs 0,01, no «PAGADO»', /saldo\s*Bs 0,01/i.test(r.ficha) && !/saldo\s*PAGADO/i.test(r.ficha), r.ficha.replace(/^.*?TOTAL DE LA VENTA/,'').slice(0,500));
  chk('2. 0,30 pagado con 0,31: se ve el centavo cobrado de más (antes 0)', Math.abs(r.b.exceso-0.01)<1e-9, r.b);
  chk('3. entregadas que deben 0,01 y 0,02: el aviso suma Bs 0,03 de las 2 (antes solo la de 0,02)', /\b2\b.*ya entregadas.*Bs 0,03/.test(r.alerta), r.alerta);
  chk('4. 100 pagado con 100 sigue pagada, sin saldo ni exceso', r.d.pagado===true && r.d.falta===0 && r.d.exceso===0, r.d);
  chk('sin errores en la página', !errores.length, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
