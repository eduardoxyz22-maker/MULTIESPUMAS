/* 🚛 LOS CAMIONES: LA FIESTA ESPERA AL GUARDADO, Y LA LÍNEA CON LOS CAMIONES ESCONDIDOS (10/10, §4jh).

   Revisión de Astra (10/10) + dueño: «1 ok» y «5 ok».
     1. Completar un camión con la planilla que NO confirma (rechazo o sin señal): no hay papel picado y el panel dice «Sin enviar».
        Con la planilla que confirma, el papel picado sale después de «✓ Guardado».
     2. Con «🙈 Ocultar camiones» queda una línea con el próximo reparto: pedidos sin camión, lo que hay que recoger y cuántos
        camiones tienen la carga completa; tocarla vuelve a mostrar los camiones.
   Reloj clavado en el 08/10/2026. Se corre:  node tests/test_carga_sync.js
   Dientes:  PEDIDOS=/ruta/a/pedidos_viejo.html node tests/test_carga_sync.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const J=x=>JSON.stringify(x);
const ARCH = 'file://' + (process.env.PEDIDOS||require('path').resolve('pedidos.html'));

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{width:1300,height:1000}, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-10-08T10:00:00-04:00'));
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.route('https://**', r=>r.abort());
  await page.goto(ARCH, { waitUntil:'load' });
  await page.waitForTimeout(300);

  const hay = await page.evaluate(() => typeof cargaVivaDatos==='function' && !!document.getElementById('carga-viva'));
  if(!hay){ chk('el panel tiene los camiones en Administración', false); console.log('\n'+PASS+' bien · '+FAIL+' mal'); await browser.close(); process.exit(1); }

  await page.evaluate(async () => {
    var el=document.getElementById('conn-form'); if(el) el.style.display='none';
    CONNECTED=true; UNLOCKED=true; VENTA_TIENDA=false;
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    document.getElementById('admin-lock').style.display='none';
    document.getElementById('admin-content').style.display='block';
    mostrarBotonesTodos();
    /* Un servidor de mentira que guarda las filas del sistema (los tildes de la carga viajan en una): si no, la relectura
       de después de tildar los borraba y la prueba medía otra cosa. */
    window._SRV={};
    apiSave=function(rec){ var r=JSON.parse(JSON.stringify(rec)); r.rev=(Number((_SRV[r.id]||{}).rev)||0)+1; _SRV[r.id]=r; return Promise.resolve({ok:true, pedido:r}); };
    apiList=function(){ var l=JSON.parse(JSON.stringify(STATE.filter(function(p){ return !esFilaSistema(p); })));
      Object.keys(_SRV).forEach(function(k){ if(esFilaSistema(_SRV[k])) l.push(JSON.parse(JSON.stringify(_SRV[k]))); });
      return Promise.resolve({ok:true,pedidos:l}); };
    try{ localStorage.removeItem(LS_RESUMEN); localStorage.removeItem(LS_PEND); }catch(e){}
    var hoy=todayStr(), man=proximoDiaEntrega(), n=0;
    var P=function(f,veh,chofer,cli,prods){ n++; return { id:'cv'+n, fecha:f, oc:'10-'+(30+n), vendedor:'Maria Flores', cliente:cli, celular:'7', turno:'AM', zona:'Norte',
      direccion:'Calle '+n, maps:'', pagado:true, saldo:0, ts:Date.now(), metodoPago:'', observaciones:'', estado:'', entregado:false, vehiculo:veh, chofer:chofer,
      garantia:'', nota:'', acuenta:0, facturarA:'', nit:'', nroDia:n, verificado:false, fotos:[], productos:prods }; };
    var x=function(c,d,m,cant,extra){ return Object.assign({codigo:c,desc:d,medida:m,cant:cant},extra||{}); };
    STATE=[
      P(hoy,'Foton nuevo','Luis Eyzaguirre','CLIENTE A',[x('CH1129','TITANIO LATEX','140x190',2)]),
      P(hoy,'Foton nuevo','Luis Eyzaguirre','CLIENTE B',[x('CH1107','ESPECIAL SEMIORTOPEDICO','140x190',3,{chk:'im'})]),
      P(hoy,'Foton encarpado','Cristhian','CLIENTE C',[x('CH1761','ORO BI RELAX','140x190',2,{chk:'ok',chkDe:'Banzer'}),x('CH1121','HEAVEN TROPICAL','140x190',1)]),
      P(hoy,'','','CLIENTE D',[x('CH1130','TITANIO LATEX','160x190',1)]),
      P(man,'Carry','Luis Pierre','CLIENTE E',[x('CH1036','ORO ANATOMICO VISCOLASTICO','140x190',4)])
    ];
    STOCK=stockVacio(); STOCK_CARGADO=true; STOCK.al={'Banzer':'sale'};
    CARGA_CHK={}; saveMirror();
    showView('admin'); segSet('adm-mode','todo'); QUICK_FILTER=''; renderAdmin();
    await new Promise(r=>setTimeout(r,150));
    CV_DIA='hoy'; CV_SEL='Foton nuevo'; cargaVivaPintar();
  });


  const tildarTodo = async (veh) => page.evaluate(async (veh) => {
    CV_SEL=veh; cargaVivaPintar();
    [].slice.call(document.querySelectorAll('#cv-panel .cv-fila:not(.on)')).forEach(function(f){ var el=document.querySelector('#cv-panel .cv-fila[data-k="'+CSS.escape(f.getAttribute('data-k'))+'"]'); if(el) cvTildar(el); });
    await new Promise(r=>setTimeout(r,2000));
    return { est:cargaVivaDatos().porK[veh].est, conf:document.querySelectorAll('#cv-capa .cv-chispa').length, sync:(document.getElementById('cv-sync')||{}).textContent||'' };
  }, veh);

  console.log('\n── 1. La fiesta espera al guardado ──');
  await page.evaluate(()=>{ window._apiSaveBueno=apiSave; apiSave=function(){ return Promise.resolve({ ok:false, error:'busy' }); }; });
  let r = await tildarTodo('Foton nuevo');
  chk('la planilla no confirma (ocupada): el camión queda completo en pantalla pero SIN papel picado', r.est==='ok' && r.conf===0, J(r));
  chk('…y el panel dice «Sin enviar»', /Sin enviar/.test(r.sync), r.sync);
  await page.evaluate(()=>{ CARGA_CHK={}; CARGA_CAMBIOS={}; try{ setPending([]); }catch(e){} CONNECTED=false; cargaVivaPintar(); });
  r = await tildarTodo('Foton nuevo');
  chk('sin señal tampoco hay fiesta, y lo dice', r.est==='ok' && r.conf===0 && /Sin enviar/.test(r.sync), J(r));
  await page.evaluate(()=>{ CARGA_CHK={}; CARGA_CAMBIOS={}; try{ setPending([]); }catch(e){} CONNECTED=true; apiSave=window._apiSaveBueno; cargaVivaPintar(); });
  await page.waitForTimeout(3600);
  r = await tildarTodo('Foton nuevo');
  chk('con la planilla que confirma: «✓ Guardado» y papel picado', r.est==='ok' && r.conf>0 && /Guardado en la planilla/.test(r.sync), J(r));

  console.log('\n── 2. Con los camiones escondidos ──');
  r = await page.evaluate(()=>{
    try{ localStorage.setItem(LS_CAMIONES,'1'); }catch(e){}
    toggleCamionesAdm();
    var l=document.getElementById('carga-viva-linea');
    return { visible:document.getElementById('carga-viva').style.display, txt:l?l.innerText.replace(/\s+/g,' '):'' };
  });
  chk('escondidos: la imagen no está y queda UNA línea con el reparto', r.visible==='none' && /🚚 Hoy \(08\/10\)/.test(r.txt), r.txt);
  chk('…con los pedidos sin camión y lo que hay que recoger', /1 pedido sin camión/.test(r.txt) && /3 por recoger de Moreno/.test(r.txt), r.txt);
  chk('…y cuántos camiones tienen la carga completa', /1 de 2 camiones con la carga completa · faltan \d+ bultos?/.test(r.txt), r.txt);
  r = await page.evaluate(()=>{ document.getElementById('carga-viva-linea').click(); return { visible:document.getElementById('carga-viva').style.display, lin:document.getElementById('carga-viva-linea').innerText }; });
  chk('tocar la línea vuelve a mostrar los camiones (y la línea se va)', r.visible==='' && !r.lin.trim(), J(r));

  chk('ningún error de JavaScript', errors.length===0, errors.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
