/* 🔎 STOCK: LO QUE ENCONTRÓ LA REVISIÓN DEL 09/10 (§4ix; dos expertos + un super agente, con la planilla real).
   Solo lo que no depende de una decisión del dueño. Casos inventados (el repo es público).

   1. N1 · «Revisá el saldo» ya no esconde lo que se corta hoy: va a «🚨 Pedí ya» (carril «ya» de la cinta) y lo dice.
   2. M1 · Con algo para fabricar, el aviso no puede decir «✅ Alcanza»: pasa a «🏭 Pedí … esta semana».
   3. B1 · Lo vendido para dentro de 40 días no entra en «Pedir 7 días»; lo de los próximos días sí.
   4. ALTA2 · Un pedido marcado «✔ hay» sin unidades detrás aparece en la revisión automática con su OC y no cuenta como «con stock».
   5. M4 · «FORTEFLEX» y «PILLOWFLEX» escritos pegados son el FORTE FLEX y el PILLOW FLEX.
   6. Sin errores de la página.

   Se corre:  node tests/test_stock_4ix.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,extra)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, extra!=null?('· '+(typeof extra==='string'?extra:JSON.stringify(extra))):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{ width:1300, height:800 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e=>errores.push(e.message));
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.setFixedTime(new Date('2026-10-06T10:00:00-04:00'));   // martes, antes de las 17
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  const r = await page.evaluate(()=>{
    try{ CARGA_GEN++; CARGA_ESTADO='ok'; clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    var out={};
    var k=stockClave({codigo:'CH1129'});
    var ped=function(id,u,f,chk,extra){ return Object.assign({ id:id, oc:id.toUpperCase(), cliente:'CLIENTE '+id, vendedor:'Mirian Salazar', fecha:f, productos:[{codigo:'CH1129',desc:'TITANIO LATEX',medida:'140x190',cant:u,chk:chk||''}] }, extra||{}); };
    var seed=function(L, dep){ STOCK=stockVacio(); STOCK.c={f:todayStr(), u:{}}; STOCK.c.u[k]=dep; STATE=L; STOCK_MEMO={}; try{ stockOlvidarIndice(); }catch(e){} };
    var fila=function(){ return stockData().lista.find(function(x){ return x.k===k; }); };

    // 1. dos marcados «✔ hay» para mañana con 0 en el Excel: se corta hoy.
    seed([ ped('a1',2,diasAdelante(1),'ok') ], 0);
    var o=fila();
    out.n1={ rev:o.revisarStock, aviso:o.aviso, accion:sfAccion(o), grupo:planGrupoDe(o), dias:o.dias, lead:o.lead };

    // 2. vende 2 por día (15 entregas en 15 días), hay 18: alcanza más que la fábrica + margen, pero no la reserva de 7 días.
    var L=[]; for(var i=1;i<=15;i++) L.push(ped('h'+i,2,diasAtras(i)));
    seed(L, 18);
    o=fila();
    out.m1={ aviso:o.aviso, fab:o.fabricar, dias:o.dias, lead:o.lead, mg:o.margen, rot:o.rotacion, accion:sfAccion(o) };

    // 3. sin rotación: 1 vendido para dentro de 3 días y 1 para dentro de 40, con 0.
    seed([ ped('c1',1,diasAdelante(3)), ped('c2',1,diasAdelante(40)) ], 0);
    o=fila();
    out.b1={ comp:o.comp, nec:stockNecesario(o), pedir:o.pedir, aviso:o.aviso };

    // 4. tres marcados «✔ hay» (mañana 2, en 5 días 2) con 2 en el Excel: el segundo no tiene respaldo.
    seed([ ped('m1',2,diasAdelante(1),'ok'), ped('m2',2,diasAdelante(5),'ok') ], 2);
    var A=stockAsignar();
    out.alta2={ ok:A.tot.ok, sinResp:A.tot.sinResp, lista:(A.sinRespaldo||[]).map(function(x){ return x.oc+'|'+x.faltan; }),
                html:(renderRevisionFija()||'').indexOf('sin stock que la respalde')>=0 && (renderRevisionFija()||'').indexOf('M2')>=0 };

    // 5. nombres pegados
    out.m4={ forte: stockClave({desc:'FORTEFLEX', medida:'140x190'})===stockClave({desc:'FORTE FLEX', medida:'140x190'}),
             pillow: stockClave({desc:'COLCHON PILLOWFLEX', medida:'160x190'})===stockClave({desc:'COLCHON PILLOW FLEX', medida:'160x190'}) };
    return out;
  });
  chk('1a. marcado de más y se corta hoy: «🚨 Pedí ya», no «Revisá el saldo»', r.n1.rev && r.n1.aviso==='urgente', r.n1);
  chk('1b. …y la acción igual dice que hay que revisar el saldo', /Pedí .* ya/.test(r.n1.accion) && /revisá el saldo/.test(r.n1.accion), r.n1.accion);
  chk('1c. …y en la cinta va al carril «Pedir ya»', r.n1.grupo==='ya', r.n1.grupo);
  chk('2. con algo para fabricar no dice «Alcanza»: pide esta semana', r.m1.fab>0 && r.m1.aviso==='pedir' && /esta semana/.test(r.m1.accion), r.m1);
  chk('3a. lo vendido para dentro de 40 días no entra en «7 días»', r.b1.comp===2 && Math.abs(r.b1.nec-1)<1e-9 && r.b1.pedir===1, r.b1);
  chk('4a. el «✔ hay» sin unidades detrás aparece con su OC', r.alta2.lista.length===1 && r.alta2.lista[0]==='M2|2', r.alta2);
  chk('4b. …y no cuenta como «con stock para cargar»', r.alta2.ok===1 && r.alta2.sinResp===1, r.alta2);
  chk('4c. la revisión automática lo dice arriba', r.alta2.html, r.alta2);
  chk('5. FORTEFLEX = FORTE FLEX y PILLOWFLEX = PILLOW FLEX', r.m4.forte && r.m4.pillow, r.m4);
  chk('6. ningún error de JavaScript', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
