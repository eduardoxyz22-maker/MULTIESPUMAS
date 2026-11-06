/* §4ok-E1 (05/11) EL CIERRE COMERCIAL NO CUENTA COMO «SIN CARGAR» LO QUE YA ESTÁ CARGADO.
   Con la planilla del 02/11 el cierre comercial (§4nv, 74) le decía a Maria «22 sin cargar» y 13 de esas ventas de Kommo ya estaban
   cargadas en el panel. La regla es la de la 81 (`borrYaCargada`): el mismo lead, o el mismo celular y la misma vendedora con una venta viva.

   LO QUE CUIDA (servidor de mentira; solo datos inventados; reloj clavado el martes 03/11/2026 a las 10:00 de Bolivia):
   1. La venta de Kommo con el MISMO LEAD que un pedido cargado no cuenta; la del mismo celular y la misma vendedora (venta viva) tampoco.
   2. Siguen contando: la de un celular que nadie tiene, la del mismo celular pero de OTRA vendedora, y la de un cliente cuya compra
      anterior es vieja y ya se entregó (es una compra nueva).
   3. La lista dice cuántas ya estaban cargadas («· 2 ya están cargadas en el panel y no cuentan») y el número de «Para revisar» no las suma.
   4. Si TODAS las de una vendedora ya están cargadas, no aparece en «Ventas de Kommo sin cargar».
   Se corre:  node tests/test_ccm_kommo_cargadas.js   (PEDIDOS=… para correrla contra otra versión) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

const PREPARAR = () => {
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  var L=[], ts=function(d){ return new Date(d+'T10:00:00-04:00').getTime(); };
  var V=function(id, oc, v, cel, f, reg, bs, lead){ var x={ id:id, oc:oc, nota:'N'+id, cliente:'CLIENTE '+id, celular:cel, fecha:f, turno:'AM', zona:'Norte', direccion:'CALLE 1',
    vendedor:v, productos:[{ desc:'COLCHON SOFT', medida:'140x190', codigo:'', cant:1, precio:bs }], saldo:0, acuenta:0, pagado:true, metodoPago:'Efectivo '+bs, ts:ts(reg), rev:1, entregado:f<'2026-11-03' };
    if(lead) x.productos[0].klead=String(lead); L.push(x); };
  V('m1','10-001','Maria Flores','71110001','2026-10-20','2026-10-15',4000);            // la misma venta que K-CEL (mismo celular y vendedora)
  V('m2','10-002','Maria Flores','71110002','2026-10-22','2026-10-18',5000, '900002');  // ya unida al lead 900002 (K-LEAD)
  V('m3','06-003','Maria Flores','71110005','2026-06-12','2026-06-08',3000);            // compra VIEJA y entregada: K-VIEJA es una compra nueva
  V('m4','10-004','Mirian Salazar','71110007','2026-10-25','2026-10-21',6000);          // la de Mirian: K-ISA tiene ese celular pero es de Isabel
  V('i1','10-005','Isabel Robledo','71110009','2026-10-26','2026-10-22',2500);          // Isabel: su única de Kommo ya está cargada
  var B=function(lead, v, cel, bs, d){ return { id:'kommo-'+lead, fecha:'', oc:'', vendedor:v, cliente:'CLIENTE K'+lead, celular:cel, productos:[], saldo:bs, ts:ts(d), estado:'Borrador Kommo', metodoPago:'', rev:1 }; };
  var BR=[ B('900001','Maria Flores','71110001',4000,'2026-10-14'),   // K-CEL   → ya cargada (celular)
           B('900002','Maria Flores','71110099',5000,'2026-10-17'),   // K-LEAD  → ya cargada (lead)
           B('900003','Maria Flores','71110003',7000,'2026-10-19'),   // K-NUEVA → sin cargar
           B('900005','Maria Flores','71110005',3300,'2026-10-24'),   // K-VIEJA → sin cargar (la anterior es de junio y ya se entregó)
           B('900007','Isabel Robledo','71110007',6000,'2026-10-21'), // K-ISA   → sin cargar (el celular es de una venta de Mirian)
           B('900009','Isabel Robledo','71110009',2500,'2026-10-21') ]; // K-ISA2  → ya cargada
  L.push({ id:'__metas__', fecha:'', cliente:'🎯 METAS', observaciones:JSON.stringify({ v:1, m:{ '2026-10':{ heaven:150000, suena:40000, t:1 } } }), rev:3 });
  STATE=L.slice(); BORRADORES=JSON.parse(JSON.stringify(BR)); SALDO_GEN=(Number(SALDO_GEN)||0)+1;
  window.SRV=JSON.parse(JSON.stringify(L.concat(BR)));
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window.SRV)) }); };
  apiSave=function(x){ return Promise.resolve({ ok:true, pedido:x }); };
  ULTIMO_REFRESCO=Date.now();
};

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept('heaven2026'));
  await ctx.route(/^https?:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-11-03T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  await page.evaluate(PREPARAR);
  await page.waitForTimeout(120);
  const ev = async (fn, arg) => { try{ return await page.evaluate(fn, arg); }catch(e){ return { __err:String(e.message||e).slice(0,200) }; } };

  /* 1-2 · la cuenta */
  let r = await ev(()=>{ var K=ccmKommo('2026-10'), o={}; K.forEach(function(k){ o[k.v]={ n:k.n, bs:k.bs, car:k.car||0 }; });
    return { o:o, vend:K.map(function(k){ return k.v; }), carT:K.cargadas, ya:BORRADORES.map(function(b){ return borrYaCargada(b); }) }; });
  chk('0 · la regla de la 81 dice cuáles ya están cargadas (lead, celular+vendedora, y la de Isabel): las mismas que usa el cierre', JSON.stringify(r.ya)==='[true,true,false,false,false,true]', r.ya);
  const mar=(r.o||{})['Maria Flores']||{}, isa=(r.o||{})['Isabel Robledo']||{};
  chk('1 · Maria: la del mismo lead y la del mismo celular NO cuentan → quedan 2 sin cargar (Bs 10.300)', mar.n===2 && mar.bs===10300, mar);
  chk('2 · siguen contando la del celular nuevo y la del cliente cuya compra anterior es de junio y ya se entregó', mar.n===2, mar);
  chk('2 · la de Isabel con el celular de una venta de MIRIAN sigue «sin cargar» (otra vendedora): Isabel 1, Bs 6.000', isa.n===1 && isa.bs===6000, isa);
  chk('3 · cuenta aparte cuántas ya estaban cargadas: Maria 2, Isabel 1 (3 en total)', mar.car===2 && isa.car===1 && r.carT===3, r);

  /* 3-4 · lo que se ve en el cierre */
  r = await ev(()=>{ showView('conta'); segSet('cta-tab','proy'); setContaTab('proy'); renderProyeccion(); ccmAbrir('2026-10');
    var R=ccmDatos('2026-10'), t=document.getElementById('ccm-body').innerText.replace(/\s+/g,' ');
    return { n:R.rev.n, kommo:R.rev.kommo.length, t:t }; });
  const tk = (/📥 Ventas de Kommo sin cargar(.*?)(Si son de|$)/.exec(r.t||'')||[])[1]||'';
  chk('3 · «Maria Flores: 2 sin cargar (Bs 10.300,00 según Kommo; 2 llegaron en octubre) · 2 ya están cargadas en el panel y no cuentan»',
      /Maria Flores: 2 sin cargar \(Bs 10\.300,00 según Kommo; 2 llegaron en octubre\) · 2 ya están cargadas en el panel y no cuentan/.test(tk), tk);
  chk('3 · Isabel: «1 sin cargar … · 1 ya está cargada en el panel y no cuentan»', /Isabel Robledo: 1 sin cargar \(Bs 6\.000,00[^)]*\) · 1 ya está cargada en el panel y no cuentan/.test(tk), tk);
  chk('3 · la nota explica que las cargadas no se cuentan y se unen en Mis pedidos', /Las que ya están cargadas \(mismo celular y vendedora\) no se cuentan acá/.test(r.t||''), (r.t||'').slice(0,300));

  /* 4 · todas cargadas: la vendedora no aparece */
  r = await ev(()=>{ BORRADORES=BORRADORES.filter(function(b){ return /^kommo-90000(1|2|9)$/.test(b.id); }); SALDO_GEN++;
    var K=ccmKommo('2026-10'), R=ccmDatos('2026-10'); return { k:K.map(function(x){ return x.v+':'+x.n; }), carT:K.cargadas, revKommo:R.rev.kommo.length }; });
  chk('4 · con todas sus ventas de Kommo ya cargadas, nadie aparece «sin cargar» y «Para revisar» no las cuenta', r.k && r.k.length===0 && r.revKommo===0 && r.carT===3, r);

  chk('sin errores de la página', errores.length===0, errores);
  await browser.close();
  console.log('\n'+PASS+' bien, '+FAIL+' mal');
  process.exit(FAIL ? 1 : 0);
})();
