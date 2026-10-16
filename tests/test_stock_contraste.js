/* 🎨 LOS ENCABEZADOS DE STOCK SE LEEN (16/10, §4lp). El dueño, con una captura del «📋 Plan de stock»: «corregí el color de eso, no
   leo: fondo negro, letra gris casi negra también… en stock y reposición». El `thead th` general del panel es negro y la tabla del plan
   le ponía letra gris (contraste 3,3).
   ⚠️ LO QUE ESTA PRUEBA CUIDA (falla contra lo publicado, `6a55598`): todo encabezado de tabla a la vista en la pantalla de Stock (con
   «👁️ Más vistas» y los desplegables abiertos) tiene contraste ≥ 4,5 entre la letra y su fondo; el del plan es claro con letra oscura.
   Reloj clavado en el 16/10/2026, datos sintéticos.  Se corre:  node tests/test_stock_contraste.js  · `PEDIDOS=<archivo>` otra página. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const path=require('path');
(async()=>{
  const PED=process.env.PEDIDOS || 'pedidos.html';
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ timezoneId:'America/La_Paz', viewport:{width:1500,height:1000} });
  const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('dialog', d=>d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-16T10:20:00-04:00'));
  await page.goto('file://'+path.resolve(PED), { waitUntil:'load' });
  await page.waitForTimeout(400);
  const r=await page.evaluate(()=>{
    document.getElementById('conn-form').style.display='none'; CONNECTED=true; UNLOCKED=true;
    apiSave=function(rec){ return Promise.resolve({ok:true, pedido:rec}); }; apiList=function(){ return Promise.resolve({ok:true,pedidos:[]}); };
    var K=stockClave({desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201'}), K2=stockClave({desc:'TITANIO LATEX',medida:'140x190',codigo:'CH1129'});
    STOCK=stockVacio(); STOCK_CARGADO=true;
    STOCK.c={ f:'2026-10-16', hora:'09:00:00', u:{}, solo0:true, alm:'PRODUCTOS TERMINADOS FAB.', t:Date.now() }; STOCK.c.u[K]=3; STOCK.c.u[K2]=12;
    STOCK.g={'Almacen Distribucion Banzer':{ f:'2026-10-16', hora:'09:00:00', u:{}, solo0:true, t:Date.now(), rs:{} }}; STOCK.g['Almacen Distribucion Banzer'].u[K]=2;
    STOCK.al={'PRODUCTOS TERMINADOS FAB.':'log','Almacen Distribucion Banzer':'sale'};
    STATE=[]; for(var i=0;i<8;i++){ var d=new Date('2026-10-'+(String(3+i).padStart(2,'0'))+'T12:00:00-04:00');
      STATE.push({ id:'s'+i, fecha:'2026-10-'+String(3+i).padStart(2,'0'), oc:'10-0'+(10+i), vendedor:'Carola Chavez', cliente:'C'+i, celular:'7', turno:'AM', zona:'Norte', direccion:'x', maps:'', pagado:true, saldo:0, ts:d.getTime(), metodoPago:'', observaciones:'', estado:'', entregado:true, vehiculo:'', chofer:'', garantia:'', nota:'1', acuenta:0, facturarA:'', nit:'', nroDia:1, verificado:true, fotos:[], productos:[{desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201',cant:1,chk:'ok'}] }); }
    STATE.push({ id:'f1', fecha:'2026-10-18', oc:'10-099', vendedor:'Carola Chavez', cliente:'FUT', celular:'7', turno:'AM', zona:'Norte', direccion:'x', maps:'', pagado:true, saldo:0, ts:Date.now(), metodoPago:'', observaciones:'', estado:'', entregado:false, vehiculo:'', chofer:'', garantia:'', nota:'1', acuenta:0, facturarA:'', nit:'', nroDia:1, verificado:true, fotos:[], productos:[{desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201',cant:4}] });
    stockOlvidarIndice(); try{ visPrefSet('masVistas', true); }catch(e){}
    abrirStock(); renderStock();
    try{ document.querySelectorAll('#stock-overlay details').forEach(function(d){ d.open=true; }); }catch(e){}
    var rgb=function(s){ var m=String(s).match(/rgba?\(([^)]+)\)/); if(!m) return null; var p=m[1].split(',').map(function(x){ return parseFloat(x); }); return { r:p[0], g:p[1], b:p[2], a:p.length>3?p[3]:1 }; };
    var lum=function(c){ var f=function(v){ v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4); }; return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b); };
    var bgDe=function(el){ while(el){ var b=rgb(getComputedStyle(el).backgroundColor); if(b && b.a>0.5) return b; el=el.parentElement; } return {r:255,g:255,b:255,a:1}; };
    var malos=[], total=0;
    document.querySelectorAll('#stock-overlay th, #stock-overlay th small').forEach(function(el){
      if(!el.offsetParent || !el.textContent.trim()) return; total++;
      var cs=getComputedStyle(el), c=rgb(cs.color), b=bgDe(el); if(!c) return;
      var L1=lum(c), L2=lum(b), ratio=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
      if(ratio<4.5) malos.push({ t:el.textContent.trim().slice(0,30), tabla:(el.closest('table')&&el.closest('table').parentElement||{}).className||'', ratio:Math.round(ratio*100)/100, color:cs.color, fondo:'rgb('+b.r+','+b.g+','+b.b+')' });
    });
    var pl=document.querySelector('#stk-plan .pl-tabla th'); var plc=pl?{color:getComputedStyle(pl).color, bg:getComputedStyle(pl).backgroundColor}:null;
    var y=document.getElementById('stk-plan'); if(y) y.scrollIntoView();
    return { total:total, malos:malos, plc:plc };
  });
  chk('la pantalla de stock tiene encabezados a la vista (con «Más vistas» abierto)', r.total>=10, r.total);
  chk('ningún encabezado de tabla de Stock tiene letra que no se lea sobre su fondo (contraste ≥ 4,5)', r.malos.length===0, r.malos.slice(0,4));
  chk('el encabezado del «📋 Plan de stock» es claro con letra oscura', !!r.plc && /227, 243, 241/.test(r.plc.bg) && /15, 61, 58/.test(r.plc.color), r.plc);
  chk('la página no tiró ningún error de JavaScript', errs.length===0, errs.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
