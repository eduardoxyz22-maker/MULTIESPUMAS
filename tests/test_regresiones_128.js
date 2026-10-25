/* 🔧 LO QUE ROMPIÓ LA PUBLICACIÓN 128bc86 (25/10, segunda auditoría de Codex/Astra, §4mj).

   LO QUE CUIDA:
   1. N-UI1 · el formulario de 4 pasos NO se esconde entero:
      a. Nuevo → Mis pedidos → Administración (con su lectura, que repinta el formulario estando en otra pestaña) → Nuevo;
      b. editar → guardar → volver a editar;
      c. elegir ATC y volver a OC: vuelve el paso de Cobro.
      En 390 y 1440 px, con los botones de las pestañas.
   2. N-UI3 · sin la nota (u otro dato obligatorio de Guardar) la barra NO dice «4 de 4 ¡listo para guardar!» y el paso 1 no está Listo.
   3. N-UI2 · la barra de Stock en el celular (320/390/600) entra en la pantalla; la fila «Más» se desplaza adentro y el último
      botón se puede tocar.
   4. N-FIN1 · el Excel de Comprobantes lleva el MONTO como NÚMERO (no texto).
   5. FIN-02 · el Excel del Cuadre no lleva estilos que no son un número (`s="[object Object]"`).

   Reloj CLAVADO (martes 27/10/2026, 10:00 de Bolivia). Solo datos sintéticos.
   Se corre:  node tests/test_regresiones_128.js   (PEDIDOS=<archivo> para correrla contra otra versión) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

async function abrir(browser, ancho, marcas){
  const ctx = await browser.newContext({ viewport:{ width:ancho, height:900 }, timezoneId:'America/La_Paz', hasTouch: ancho<700 });
  const page = await ctx.newPage(); const errores=[];
  page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await ctx.route(/^https:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-27T10:00:00-04:00'));
  await page.addInitScript((m)=>{ (m||[]).forEach(function(k){ window[k]=1; }); }, marcas);
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    var mes=todayStr().slice(0,7);
    STATE=[{ id:'p1', oc:'10-101', nota:'5001', cliente:'ANA PRUEBA', celular:'70000001', fecha:proximoDiaEntrega(), turno:'AM', zona:'Norte', vendedor:'Carola Chavez',
             productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:3000 }], saldo:3000, acuenta:0, pagado:false, metodoPago:'',
             ts:new Date(mes+'-05T11:00:00-04:00').getTime(), rev:1 }];
    window._guardados=[];
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
    apiSave=function(r){ window._guardados.push(JSON.parse(JSON.stringify(r))); var o=JSON.parse(JSON.stringify(r)); o.rev=(Number(o.rev)||1)+1; return Promise.resolve({ ok:true, pedido:o }); };
    showView('form'); try{ renderCupoForm(); }catch(e){}
  });
  await page.waitForTimeout(200);
  return { page, ctx, errores };
}
const ev = async (page, fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
const pasos = (page) => ev(page, () => ({
  oc: docTipoSel(),
  vis: [1,2,3,4].map(function(n){ var e=document.getElementById('fp-'+n); return !!e && !e.hidden && e.offsetHeight>0; }),
  campos: ['f-cliente','f-productos','f-zona','wrap-cobro-todo'].map(function(id){ var e=document.getElementById(id); return !!e && e.offsetHeight>0; }),
  barra: (document.getElementById('fp-barra')||{}).textContent||''
}));
const tocar = async (page, sel) => { try { await page.click(sel, { timeout:3000 }); return true; } catch(e) { return false; } };
const cerrarModal = (page) => ev(page, () => { try{ closeModal(); }catch(e){} document.querySelectorAll('.modal-bg,.modal-wrap').forEach(function(m){ m.classList.remove('show'); }); });

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });

  for (const ancho of [390, 1440]) {
    const A = await abrir(browser, ancho, ['FP_PRUEBA']); const page=A.page;
    const p0 = await pasos(page);
    chk(`1·${ancho}. al abrir, los cuatro pasos a la vista`, p0.vis.every(Boolean) && p0.campos.every(Boolean), p0);

    /* a · Nuevo → Mis → Administración (lectura que repinta el formulario) → Nuevo */
    await tocar(page, '#tab-mis'); await page.waitForTimeout(200);
    await tocar(page, '#tab-admin'); await page.waitForTimeout(300);
    await ev(page, async () => { try{ await loadFromServer(false); }catch(e){} try{ renderCupoForm(); }catch(e){} try{ fpPintar(); }catch(e){} });   // la lectura con el formulario en otra pestaña
    await page.waitForTimeout(200);
    await tocar(page, '#tab-form'); await page.waitForTimeout(250);
    const pa = await pasos(page);
    chk(`1a·${ancho}. Nuevo → Mis → Administración → Nuevo: los pasos y los campos siguen a la vista`, pa.vis.every(Boolean) && pa.campos.every(Boolean), pa);

    /* b · editar → guardar → volver a editar */
    const rb = await ev(page, async () => {
      editPedido('p1'); await new Promise(function(r){ setTimeout(r, 250); });
      var z=document.getElementById('f-direccion'); if(z){ z.value='CALLE NUEVA 123'; z.dispatchEvent(new Event('input',{bubbles:true})); }
      try{ await submitPedido(new Event('submit')); }catch(e){ return { err:e.message }; }
      await new Promise(function(r){ setTimeout(r, 700); });
      return { n:window._guardados.length };
    });
    await cerrarModal(page); await page.waitForTimeout(150);
    await ev(page, async () => { editPedido('p1'); await new Promise(function(r){ setTimeout(r, 300); }); });
    const pb = await pasos(page);
    chk(`1b·${ancho}. editar → guardar → volver a editar: los pasos siguen a la vista`, rb.n>=1 && pb.vis.every(Boolean) && pb.campos.every(Boolean), { rb, pb });

    /* c · ATC → OC */
    await ev(page, async () => { try{ resetForm(); }catch(e){} await new Promise(function(r){ setTimeout(r, 120); }); });
    const t1 = await tocar(page, '#f-doc-tipo button[data-val="ATC"]'); await page.waitForTimeout(200);
    const pc1 = await pasos(page);
    const t2 = await tocar(page, '#f-doc-tipo button[data-val="OC"]'); await page.waitForTimeout(200);
    const pc2 = await pasos(page);
    chk(`1c·${ancho}. ATC esconde Cobro y volver a OC lo muestra otra vez (4 pasos)`, t1 && t2 && pc1.vis[3]===false && pc2.oc==='OC' && pc2.vis.every(Boolean) && pc2.campos[3] && /de 4/.test(pc2.barra), { t1, t2, pc1:pc1.vis, pc2 });

    chk(`1·${ancho}. sin errores en la página`, !A.errores.length, A.errores);
    await A.ctx.close();
  }

  /* 2 · N-UI3: sin la nota, no está listo */
  {
    const B = await abrir(browser, 1440, ['FP_PRUEBA']); const page=B.page;
    const r = await ev(page, async () => {
      var put=function(id,v){ var e=document.getElementById(id); e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); };
      editPedido('p1'); await new Promise(function(r){ setTimeout(r, 300); });
      var pg=document.querySelector('#f-pagado button[data-val="NO"]'); if(pg) pg.click();
      put('f-saldo','3000'); await new Promise(function(r){ setTimeout(r, 150); }); fpPintar();
      var con={ est:fxPasosEstado(), barra:document.getElementById('fp-barra').textContent, p1:document.getElementById('fp-1').getAttribute('data-est') };
      put('f-nota',''); await new Promise(function(r){ setTimeout(r, 150); }); fpPintar();
      var sin={ est:fxPasosEstado(), barra:document.getElementById('fp-barra').textContent, p1:document.getElementById('fp-1').getAttribute('data-est') };
      put('f-nota','5001'); put('f-celular',''); await new Promise(function(r){ setTimeout(r, 150); }); fpPintar();
      var sinCel={ est:fxPasosEstado() };
      return { con, sin, sinCel };
    });
    chk('2a. con todo lleno: 4 de 4 listo para guardar', r.con && r.con.est.every(Boolean) && /4 de 4/.test(r.con.barra), r.con);
    chk('2b. sin la nota: el paso 1 no está Listo y la barra NO promete «listo para guardar»', r.sin && r.sin.est[0]===false && r.sin.p1!=='ok' && !/4 de 4/.test(r.sin.barra) && !/listo para guardar/.test(r.sin.barra), r.sin);
    chk('2c. sin el celular: tampoco', r.sinCel && r.sinCel.est[0]===false, r.sinCel);
    const ratc = await ev(page, async () => {
      try{ resetForm(); }catch(e){} await new Promise(function(r){ setTimeout(r, 100); });
      document.querySelector('#f-doc-tipo button[data-val="ATC"]').click(); await new Promise(function(r){ setTimeout(r, 150); });
      var put=function(id,v){ var e=document.getElementById(id); e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); };
      put('f-vendedor','Carola Chavez'); put('f-cliente','ANA PRUEBA'); put('f-celular','70000001');
      return { est:fxPasosEstado()[0], faltan:atcFaltan(null).length };
    });
    chk('2d. una ATC sin motivo ni fecha de compra no está lista (lo mismo que pide Guardar)', ratc.est===false && ratc.faltan>0, ratc);
    chk('2. sin errores en la página', !B.errores.length, B.errores);
    await B.ctx.close();
  }

  /* 3 · N-UI2: la barra de Stock en el celular */
  for (const ancho of [320, 390, 600]) {
    const C = await abrir(browser, ancho, ['STK_TOP_PRUEBA']); const page=C.page;
    const r = await ev(page, async () => {
      try{ abrirStock(); }catch(e){ return { err:e.message }; }
      await new Promise(function(r){ setTimeout(r, 400); });
      var top=document.getElementById('stk-top'), mas=top && top.querySelector('.s3-mas');
      if(!top || top.hidden) return { sinBarra:true };
      var chs=mas ? [].slice.call(mas.querySelectorAll('.s3-ch')) : [], ult=chs[chs.length-1];
      var antes=mas ? mas.scrollLeft : 0; if(mas) mas.scrollLeft=9999; var desp=mas ? mas.scrollLeft : 0;
      if(ult) ult.scrollIntoView({ inline:'end', block:'nearest' });
      var R=ult ? ult.getBoundingClientRect() : null;
      return { vw:innerWidth, top:top.getBoundingClientRect().width, doc:document.documentElement.scrollWidth, masW:mas?mas.getBoundingClientRect().width:0,
               masSW:mas?mas.scrollWidth:0, desp:desp, antes:antes, ultDentro: !!R && R.left>=0 && R.right<=innerWidth+1, ult: ult?ult.textContent:'' };
    });
    chk(`3·${ancho}. la barra de Stock entra en la pantalla (no se estira)`, !r.err && !r.sinBarra && r.top<=r.vw+1 && r.masW<=r.vw+1, r);
    chk(`3·${ancho}. la fila «Más» se desplaza adentro y el último botón queda a la vista`, r.masSW<=r.masW+1 || (r.desp>0 && r.ultDentro), r);
    if (ancho===390) {
      const ult = await page.locator('#stk-top .s3-ch').last();
      let ok=false; try { await ult.click({ timeout:3000, trial:true }); ok=true; } catch(e) {}
      chk('3·390. el último botón de «Más» se puede tocar', ok);
    }
    await C.ctx.close();
  }

  /* 4 y 5 · los Excel */
  {
    const D = await abrir(browser, 1440, []); const page=D.page;
    const r = await ev(page, async () => {
      var mes=todayStr().slice(0,7);
      STATE=[{ id:'q1', oc:'10-201', nota:'6001', cliente:'BETO QR', celular:'70000002', fecha:mes+'-26', turno:'AM', zona:'Norte', vendedor:'Carola Chavez',
               productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:1500.5 }], saldo:0, acuenta:0, pagado:true,
               metodoPago:textoCobros([{ metodo:'QR', banco:'BISA', monto:1500.5, fecha:mes+'-05', nota:'11', comps:['fotoA'] }, { metodo:'Efectivo', monto:200, fecha:mes+'-06', nota:'12' }]), ts:new Date(mes+'-05T11:00:00-04:00').getTime() }];
      showView('conta'); await new Promise(function(r){ setTimeout(r, 200); });
      document.getElementById('cta-vendedor').value='';
      var hojas=null, bx=window.buildXlsx, dl=window.downloadBlob, xml='';
      compsAbrir(); await new Promise(function(r){ setTimeout(r, 80); });
      window.buildXlsx=function(sh){ hojas=sh; xml=sh.map(buildSheetXml).join(''); return 'x'; }; window.downloadBlob=function(){};
      try{ compsExcel(); }finally{ window.buildXlsx=bx; window.downloadBlob=dl; }
      try{ closeModal(); }catch(e){}
      var compsXml=xml, montoCel=hojas && hojas[0].matrix[1] && hojas[0].matrix[1][6];
      hojas=null; xml='';
      window.buildXlsx=function(sh){ hojas=sh; xml=sh.map(buildSheetXml).join(''); return 'x'; }; window.downloadBlob=function(){};
      try{ setContaTab && setContaTab('cuadre'); }catch(e){}
      await new Promise(function(r){ setTimeout(r, 150); });
      try{ exportCuadre(); }catch(e){ xml='ERR '+e.message; }
      finally{ window.buildXlsx=bx; window.downloadBlob=dl; }
      return { montoCel:montoCel, compsNum:/<c r="G2" s="2"><v>1500\.5<\/v><\/c>/.test(compsXml), compsTexto:/<c r="G2"[^>]*t="inlineStr"/.test(compsXml),
               cuadreObj:/s="\[object/.test(xml), cuadreS:(xml.match(/ s="([^"]*)"/g)||[]).filter(function(s){ return !/^ s="\d+"$/.test(s); }).slice(0,3),
               cuadreNum:/<v>1500\.5<\/v>/.test(xml), cuadreLargo:xml.length };
    });
    chk('4. Comprobantes: el MONTO va como número con formato Bs (1500,5 exacto)', r.compsNum && !r.compsTexto, r);
    chk('5a. Cuadre: ningún estilo que no sea un número (antes s="[object Object]")', !r.cuadreObj && !r.cuadreS.length && r.cuadreLargo>100, r);
    chk('5b. Cuadre: el monto sigue siendo el mismo número', r.cuadreNum, r);
    chk('4-5. sin errores en la página', !D.errores.length, D.errores);
    await D.ctx.close();
  }

  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
