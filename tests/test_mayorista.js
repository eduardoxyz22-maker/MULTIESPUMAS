/* 🏭 La planilla de MAYORISTAS (Eduardo Añez), aparte de la del equipo de tienda.
   Eduardo es el jefe comercial y vende a mayoristas: necesita su propio control de qué
   vendió y qué le falta cobrar, sin mezclarse con las vendedoras (y sin ensuciarles a
   ellas los totales). El Cuadre NO se toca: sigue siendo el de la caja del equipo. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,extra)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, extra!=null?('· '+extra):''); };

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
    window._bajados=[];
    downloadBlob=function(b,n){ window._bajados.push(n); };
    var hoy=todayStr(), ts=new Date(new Date().setHours(12,0,0,0)).getTime();
    var base={fecha:hoy,turno:'AM',celular:'70000000',nit:'1',zona:'Norte',direccion:'X',ts:ts};
    function P(o){ var q={}; for(var k in base)q[k]=base[k]; for(var k in o)q[k]=o[k]; return q; }
    window._FIX=STATE=[
      /* ---- MAYORISTAS: las de Eduardo ---- */
      P({id:'e1', nota:'500', oc:'08-100', vendedor:'Eduardo Añez', cliente:'DISTRIBUIDORA NORTE',
         acuenta:2000, saldo:8000, pagado:false, metodoPago:'~Efectivo 2000 @'+hoy+' #500 %IE1',
         productos:[{desc:'TITANIO ICE',medida:'140x190',codigo:'CH1',cant:10,precio:1000}] }),
      P({id:'e2', nota:'501', oc:'08-101', vendedor:'Eduardo Anez', cliente:'MAYORISTA SUR',
         acuenta:0, saldo:0, pagado:true, metodoPago:'QR BISA 4000 @'+hoy+' #501 %IE2',
         productos:[{desc:'SOFT ICE',medida:'120X190',codigo:'CH2',cant:4,precio:1000}] }),
      /* una ATC de Eduardo: es un servicio, no va a NINGUNA de las dos planillas */
      P({id:'ea', nota:'502', oc:'ATC-08-003', vendedor:'Eduardo Añez', cliente:'ATC DEL JEFE',
         acuenta:0, saldo:0, pagado:true, metodoPago:'Efectivo 300 @'+hoy+' #502',
         productos:[{desc:'REVISION',medida:'',cant:1}] }),
      /* ---- TIENDA: las del equipo ---- */
      P({id:'c1', nota:'600', oc:'08-200', vendedor:'Carola Chavez', cliente:'CLIENTA DE TIENDA',
         acuenta:0, saldo:1500, pagado:false, metodoPago:'',
         productos:[{desc:'SOFT ICE',medida:'120X190',cant:1,precio:1500}] }),
      P({id:'c2', nota:'601', oc:'08-201', vendedor:'Maria Flores', cliente:'OTRA CLIENTA',
         acuenta:0, saldo:0, pagado:true, metodoPago:'Efectivo 900 @'+hoy+' #601 %IC2',
         productos:[{desc:'ALMOHADA',medida:'50x70',cant:1,precio:900}] }),
      /* ROHO sigue afuera de las dos */
      P({id:'r1', nota:'700', oc:'RH-1', vendedor:'ROHO', cliente:'ROHO CLIENTE',
         acuenta:0, saldo:0, pagado:true, metodoPago:'Efectivo 500 @'+hoy+' #700' })
    ];
    apiSave=function(rec){ var g=JSON.parse(JSON.stringify(rec)); delete g.cobradoBs;
      var i=-1; for(var k=0;k<window._FIX.length;k++) if(String(window._FIX[k].id)===String(g.id)){i=k;break;}
      if(i>=0) window._FIX[i]=g; else window._FIX.push(g); return Promise.resolve({ok:true}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(window._FIX))}); };
    document.getElementById('admin-lock').style.display='none';
    document.getElementById('admin-content').style.display='block';
    showView('conta'); segSet('cta-tab','ventas'); setContaTab('ventas');
    segSet('cta-mode','todo'); setContaModo('todo');
  });
  await page.waitForTimeout(400);

  const tabla = () => page.evaluate(()=>{
    var t=document.getElementById('tbl-conta');
    return { txt:(t&&t.style.display!=='none')?t.textContent:'', filas:t?t.querySelectorAll('tbody tr').length:0 };
  });

  // ---------- 1. la pestaña existe ----------
  let r = await page.evaluate(()=>{
    return [].slice.call(document.querySelectorAll('#cta-tab button')).map(function(b){ return b.dataset.val+':'+b.textContent.trim(); });
  });
  chk('Contabilidad tiene TRES pestañas', r.length===3, r.join(' | '));
  chk('  y la nueva es la de mayoristas', /mayor:.*Mayoristas/.test(r.join(' | ')), r.join(' | '));

  // ---------- 2. "Ventas" sigue igual que siempre ----------
  r = await tabla();
  chk('VENTAS · están las del equipo', /CLIENTA DE TIENDA/.test(r.txt) && /OTRA CLIENTA/.test(r.txt), r.filas+' filas');
  chk('  y NO las de Eduardo', !/DISTRIBUIDORA NORTE/.test(r.txt) && !/MAYORISTA SUR/.test(r.txt), r.filas+' filas');
  chk('  ni las de ROHO', !/ROHO CLIENTE/.test(r.txt), '');
  let ventasFilas = r.filas;

  r = await page.evaluate(()=>({
    banner:(document.getElementById('cta-banner')||{}).style.display,
    vend:(document.getElementById('cta-wrap-vend')||{}).style.display
  }));
  chk('  sin cartel de mayoristas y con el desplegable de vendedor a la vista',
      r.banner==='none' && r.vend!=='none', 'banner='+r.banner+' vend='+r.vend);

  // ---------- 3. la planilla de mayoristas ----------
  await page.evaluate(()=>{ segSet('cta-tab','mayor'); setContaTab('mayor'); });
  await page.waitForTimeout(250);
  r = await tabla();
  chk('MAYORISTAS · están las ventas de Eduardo', /DISTRIBUIDORA NORTE/.test(r.txt) && /MAYORISTA SUR/.test(r.txt), r.filas+' filas');
  chk('  y NO las del equipo de tienda', !/CLIENTA DE TIENDA/.test(r.txt) && !/OTRA CLIENTA/.test(r.txt), r.filas+' filas');
  chk('  ni las de ROHO', !/ROHO CLIENTE/.test(r.txt), '');
  chk('  ni las ATC (siguen siendo un servicio, no una venta)', !/ATC DEL JEFE/.test(r.txt), '');
  chk('  son exactamente sus 2 ventas', r.filas===2, r.filas+' filas');

  r = await page.evaluate(()=>({
    banner:(document.getElementById('cta-banner')||{}).style.display,
    bannerTxt:(document.getElementById('cta-banner')||{}).textContent||'',
    vend:(document.getElementById('cta-wrap-vend')||{}).style.display
  }));
  chk('  el cartel avisa de quién es la planilla', r.banner==='block' && /Eduardo Añez/.test(r.bannerTxt), (r.bannerTxt||'').slice(0,70));
  chk('  y se esconde el desplegable de vendedor (es de una sola persona)', r.vend==='none', 'vend='+r.vend);

  // ---------- 4. las tarjetas son SOLO de él ----------
  r = await page.evaluate(()=>({ m:(document.getElementById('cta-metrics')||{}).textContent||'',
                                 res:(document.getElementById('cta-resumen')||{}).textContent||'' }));
  chk('  "Vendido" suma solo lo suyo (10.000 + 4.000)', /Bs\s*14\.000,00/.test(r.m), (r.m.match(/Vendido en el período\s*Bs [\d.,]+/)||[''])[0]);
  chk('  "Falta cobrar" es el saldo de su mayorista', /Bs\s*8\.000,00/.test(r.m), (r.m.match(/Falta cobrar\s*Bs [\d.,]+/)||[''])[0]);
  chk('  y dice que son de Eduardo Añez, no "de todo el equipo"',
      /de Eduardo Añez/.test(r.m) && !/de todo el equipo/.test(r.m), (r.m.match(/de [^·]{0,24}/)||[''])[0]);
  chk('  el resumen también lo nombra', /Eduardo Añez/.test(r.res), r.res.slice(0,60));

  // ---------- 5. venir de Ventas con una vendedora filtrada NO vacía la planilla ----------
  r = await page.evaluate(()=>{
    var s=document.getElementById('cta-vendedor');
    segSet('cta-tab','ventas'); setContaTab('ventas');
    s.value='Carola Chavez'; renderConta();          // el caso real: estaba filtrando por ella
    var enVentas=contaLista().length;
    segSet('cta-tab','mayor'); setContaTab('mayor');  // y ahora se va a Mayoristas
    var mayor=contaLista().length, valMayor=s.value;
    segSet('cta-tab','ventas'); setContaTab('ventas');
    return { enVentas:enVentas, mayor:mayor, valMayor:valMayor, volviendo:contaLista().length, valVuelta:s.value };
  });
  await page.waitForTimeout(200);
  chk('en Ventas el filtro de vendedora sigue filtrando', r.enVentas===1, r.enVentas+' venta(s) de Carola');
  chk('  al pasar a Mayoristas ese filtro NO la deja en cero', r.mayor===2 && r.valMayor==='', r.mayor+' ventas · valor="'+r.valMayor+'"');
  chk('  y al volver a Ventas el desplegable dice lo que filtra ("Todos")',
      r.valVuelta==='' && r.volviendo===2, 'valor="'+r.valVuelta+'" · '+r.volviendo+' ventas');
  await page.evaluate(()=>{ segSet('cta-tab','mayor'); setContaTab('mayor'); });
  await page.waitForTimeout(200);

  // ---------- 6. el CUADRE no cambió: es la caja del equipo ----------
  r = await page.evaluate(()=>{
    segSet('cta-tab','cuadre'); setContaTab('cuadre'); segSet('cua-mode','todo'); setCuadreModo('todo');
    return { pane:document.getElementById('cta-pane-cuadre').style.display,
             detalle:(document.getElementById('cua-detalle')||{}).textContent||'',
             pend:(document.getElementById('cua-pendientes')||{}).textContent||'',
             nPagos:cuadrePagos().length,
             nPend:cuadrePendientes(true).length };
  });
  chk('CUADRE · sigue mostrando la caja del equipo', /OTRA CLIENTA/.test(r.detalle), r.nPagos+' pagos');
  chk('  y los pagos de Eduardo NO entran', !/DISTRIBUIDORA NORTE/.test(r.detalle) && !/MAYORISTA SUR/.test(r.detalle), r.nPagos+' pagos');
  chk('  lo por cobrar del equipo no incluye su mayorista',
      /CLIENTA DE TIENDA/.test(r.pend) && !/DISTRIBUIDORA NORTE/.test(r.pend), r.nPend+' pendientes');

  // ---------- 7. registrar un pago desde la ficha de mayoristas ----------
  r = await page.evaluate(async ()=>{
    segSet('cta-tab','mayor'); setContaTab('mayor');
    showContaModal('e1');
    await new Promise(x=>setTimeout(x,200));
    var hay=!!document.getElementById('cta-pago-monto');
    document.getElementById('cta-pago-monto').value='8000';
    document.getElementById('cta-pago-nota').value='500';
    document.getElementById('cta-pago-fecha').value=todayStr();
    CTA_PAGO.metodo='Efectivo'; CTA_PAGO.banco=''; CTA_PAGO.comps=['IMG_PAGO'];
    ctaRegistrarPago('e1');
    await new Promise(x=>setTimeout(x,350));
    var p=findById('e1');
    return { hay:hay, saldo:Number(p.saldo)||0, pagado:!!p.pagado,
             cobrado:contaCobrado(p), total:ventaTotal(p), falta:contaFaltaCobrar(p),
             guardado:(window._FIX.filter(function(x){return x.id==='e1';})[0]||{}).metodoPago||'' };
  });
  chk('la ficha de un mayorista deja registrar el pago', r.hay===true, '');
  chk('  el saldo queda saldado', r.saldo<=0.01 && r.pagado===true, 'saldo='+r.saldo+' pagado='+r.pagado);
  chk('  entró todo: los 2.000 del anticipo + los 8.000 de ahora',
      Math.abs(r.cobrado-10000)<0.01 && Math.abs(r.total-10000)<0.01 && r.falta<=0.01,
      'ingresó='+r.cobrado+' de '+r.total+' · falta '+r.falta);
  chk('  se guardó en la planilla compartida (se ve desde otra compu)', /8000/.test(r.guardado)&&/%IMG_PAGO/.test(r.guardado), r.guardado.slice(0,80));

  r = await page.evaluate(async ()=>{ closeModal(); await new Promise(x=>setTimeout(x,200));
    var t=document.getElementById('tbl-conta');
    return { txt:t.textContent, m:(document.getElementById('cta-metrics')||{}).textContent||'' }; });
  chk('  y la venta sigue en SU planilla después de cobrada', /DISTRIBUIDORA NORTE/.test(r.txt), '');
  chk('  con "Falta cobrar" en cero', /Falta cobrar\s*✅ Nada/.test(r.m), (r.m.match(/Falta cobrar[^·]{0,20}/)||[''])[0]);

  // ---------- 8. el Excel baja aparte ----------
  r = await page.evaluate(()=>{
    window._bajados=[];
    exportConta();
    segSet('cta-tab','ventas'); setContaTab('ventas');
    exportConta();
    segSet('cta-tab','mayor'); setContaTab('mayor');
    return window._bajados;
  });
  await page.waitForTimeout(200);
  chk('el Excel de mayoristas baja con su propio nombre', /^mayoristas-/.test(r[0]||''), r.join(' | '));
  chk('  y el del contador sigue siendo "contabilidad-"', /^contabilidad-/.test(r[1]||''), r.join(' | '));

  // ---------- 9. el cartel de vacío dice de quién ----------
  r = await page.evaluate(()=>{
    segSet('cta-mode','dia'); setContaModo('dia');
    document.getElementById('cta-dia').value='2020-01-01'; renderConta();
    var v=document.getElementById('cta-empty');
    var txt=v.textContent, vis=v.style.display;
    segSet('cta-mode','todo'); setContaModo('todo');
    return { txt:txt, vis:vis };
  });
  await page.waitForTimeout(200);
  chk('un período sin ventas avisa de quién está hablando', r.vis==='block' && /Eduardo Añez/.test(r.txt), r.txt);

  // ---------- 10. saltar a la ficha lleva a la planilla correcta ----------
  r = await page.evaluate(async ()=>{
    segSet('cta-tab','ventas'); setContaTab('ventas');
    irAContaDe(findById('e1'));
    await new Promise(x=>setTimeout(x,250));
    var deMayor=contaTab();
    irAContaDe(findById('c1'));
    await new Promise(x=>setTimeout(x,250));
    return { deMayor:deMayor, deTienda:contaTab(), tabDe:[contaTabDe(findById('e1')), contaTabDe(findById('c1'))] };
  });
  chk('abrir una venta de Eduardo cae en Mayoristas', r.deMayor==='mayor', r.deMayor);
  chk('  y una del equipo cae en Ventas', r.deTienda==='ventas', r.deTienda);
  chk('  contaTabDe reparte bien', r.tabDe[0]==='mayor' && r.tabDe[1]==='ventas', r.tabDe.join(' / '));

  // ---------- 11. Ventas quedó como estaba ----------
  r = await tabla();
  chk('la planilla del equipo quedó intacta', r.filas===ventasFilas && /CLIENTA DE TIENDA/.test(r.txt), r.filas+' filas (antes '+ventasFilas+')');

  chk('sin errores JS', errors.length===0, errors.slice(0,2).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
