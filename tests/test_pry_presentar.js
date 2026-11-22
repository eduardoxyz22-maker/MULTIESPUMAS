/* ▶ PRESENTAR (Proyección) y el circuito de ATC — la revisión de Fable del 19/11/2026 (dueño: «en modo presentación abre algo y se vuelve
   arriba de la nada»; para la presentación eligió la «A»: mientras se presenta, los números quedan quietos).
   ⚠️ LO QUE ESTE TEST CUIDA:
   P1/P2. La lectura automática (`autoRepintar`) y girar el iPad NO vuelven a dibujar Proyección mientras se presenta: la sección queda
          donde estaba (scroll) y lo abierto sigue abierto; se pone al día al cambiar de sección o al salir.
   P1b.  Lo que toca la persona (ordenar la tabla) repinta pero NO sube.
   P3.   «🎯 Cargar las metas» abre ENCIMA de la presentación; el primer Esc cierra la ventana, el segundo sale.
   P5.   Cambiar de pestaña sale de la presentación.
   P6.   Al salir no queda arriba de todo.
   P7.   AvPág no cambia de sección.
   A1.   Una ATC sin fecha (traída de Trello) con la devolución programada ya fue recogida: el recuadro NO ofrece «✓ Recogido».
   A2.   «Listo en fábrica» con el recojo sin marcar: se puede programar la devolución y no se pide marcar el recojo.
   A3.   Editar una ATC que vive en su devolución: la fecha dice «🔁 Día de la devolución».
   A4.   «Deshacer» del recogido cierra «Programar devolución» y dice «recogido».
   Datos INVENTADOS (los de test_pry_tiendas y test_stock_rev2_u2_turno).
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 TZ=America/La_Paz node tests/test_pry_presentar.js */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const srcT = fs.readFileSync(path.join(__dirname, 'test_pry_tiendas.js'), 'utf8');
const PREP_PRY = srcT.slice(srcT.indexOf('function PREPARAR(){'), srcT.indexOf('\n(async () => {'));
const srcA = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_u2_turno.js'), 'utf8');
const PREP_ATC = srcA.slice(srcA.indexOf('function PREPARAR(){'), srcA.indexOf('\nconst corre'));

(async () => {
  const browser = await chromium.launch();
  const errores=[];
  /* ---------------- ▶ Presentar ---------------- */
  {
    const W=820, H=1180;   // iPad parado
    const ctx = await browser.newContext({ viewport:{ width:W, height:H }, timezoneId:'America/La_Paz', reducedMotion:'reduce', hasTouch:true });
    await ctx.route(/^https?:/, r=>r.abort());
    await ctx.addInitScript(() => { try{ sessionStorage.setItem('me_quien_ok','1'); localStorage.setItem('me_asis_tour','1'); }catch(e){}
      /* el Chromium de las pruebas ahora SÍ entra a pantalla completa desde un evaluate, y después Playwright no puede girar el iPad:
         acá la pantalla completa no hace nada (lo que se prueba es que Presentar no repinte ni suba) */
      try{ Element.prototype.requestFullscreen=function(){ return Promise.resolve(); }; }catch(e){}
      window.PFC_PRUEBA=1; window.PRY_KPI_PRUEBA=1; window.PRY_ENT_PRUEBA=1; window.PRY_LINEAS_PRUEBA=1; window.PRY_TMETA_PRUEBA=1; });
    const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
    await page.clock.setFixedTime(new Date('2026-11-12T10:00:00-04:00'));
    await page.goto('file://'+PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
    await page.evaluate('('+PREP_PRY+')()');
    await page.evaluate(() => {
      STATE=FIX();
      showView('conta'); localStorage.setItem(LS_ADMIN, sha256('clave-de-prueba'));
      document.getElementById('admin-pass').value='clave-de-prueba'; tryUnlock();
      try{ closeModal(); }catch(e){}
      segSet('cta-tab','proy'); setContaTab('proy');
      try{ saludCerrar(); }catch(e){} document.getElementById('pry-mes').value='2026-11'; renderProyeccion(); window.scrollTo(0,0);
    });
    await page.waitForTimeout(300);
    const ir=(k)=>page.evaluate((k)=>{ var i=PFC_PRES.L.findIndex(s=>s.getAttribute('data-k')===k); pfcPresIr(i); return i; }, k);
    const est=()=>page.evaluate(()=>{ var pane=document.getElementById('cta-pane-proy'), cur=document.querySelector('#cta-pane-proy > .pix-s.pfc-cur');
      return { on:PFC_PRES.on, k:cur && cur.getAttribute('data-k'), st:Math.round(pane.scrollTop), mom:document.querySelectorAll('.pry-mom-det').length,
        det:[].filter.call(document.querySelectorAll('#cta-pane-proy .pfc-cur details'), d=>d.open).length, wy:Math.round(window.scrollY) }; });

    await page.evaluate(()=>window.scrollTo(0,900));
    await page.evaluate(()=>pfcPresAbrir()); await page.waitForTimeout(200);
    chk('Presentar arranca en la primera sección', (await est()).on && (await est()).k==='resumen', await est());

    await ir('vend');
    await page.evaluate(()=>{ var f=document.querySelectorAll('#pry-vendedores .pry-fila.pry-toca')[2]; f.click(); });
    await page.evaluate(()=>{ var d=document.querySelector('#cta-pane-proy .pfc-cur details'); if(d) d.open=true;
      var f=document.querySelectorAll('#pry-vendedores .pry-fila.pry-toca')[2]; f.scrollIntoView({block:'center'}); });
    const a=await est();
    let rep=await page.evaluate(()=>{ var n=0, o=renderProyeccion; renderProyeccion=function(){ n++; return o.apply(this, arguments); }; autoRepintar(); renderProyeccion=o; return n; });
    await page.waitForTimeout(150);
    const b=await est();
    chk('P1 la lectura automática no repinta Proyección mientras se presenta', rep===0, rep);
    chk('P1 la sección no sube sola', a.st>100 && b.st===a.st && b.k==='vend', [a.st, b.st]);
    chk('P2 lo abierto sigue abierto (tablita del vendedor y desplegable)', b.mom===a.mom && b.mom>0 && b.det===a.det, [a, b]);
    chk('P2 quedó anotado para ponerse al día', await page.evaluate(()=>PFC_PRES.sucio===true));

    /* girar el iPad: no repinta */
    rep=await page.evaluate(()=>{ var n=0, o=renderProyeccion; window.__o=o; renderProyeccion=function(){ n++; return o.apply(this, arguments); }; window.__n=function(){ return n; }; return 0; });
    await page.setViewportSize({ width:H, height:W }); await page.waitForTimeout(400);
    const giro=await est();
    rep=await page.evaluate(()=>{ var n=window.__n(); renderProyeccion=window.__o; return n; });
    await page.setViewportSize({ width:W, height:H }); await page.waitForTimeout(300);
    chk('P1 girar el iPad no repinta ni sube', rep===0 && giro.st===b.st, { rep, st:giro.st });

    /* lo que toca la persona repinta pero no sube */
    await page.evaluate(()=>{ document.getElementById('cta-pane-proy').scrollTop=400; });
    await page.evaluate(()=>pfcOrden('conv')); await page.waitForTimeout(150);
    chk('P1b ordenar la tabla no sube', (await est()).st===400, await est());

    /* cambiar de sección pone al día lo pendiente */
    rep=await page.evaluate(()=>{ var n=0, o=renderProyeccion; renderProyeccion=function(){ n++; return o.apply(this, arguments); }; pfcPresIr(PFC_PRES.i+1); renderProyeccion=o; return n; });
    await page.waitForTimeout(150);
    chk('al cambiar de sección se pone al día (un repintado) y arranca arriba', rep===1 && (await est()).st===0 && !(await page.evaluate(()=>PFC_PRES.sucio)), { rep, e:await est() });

    /* P7 AvPág baja, no cambia de sección */
    const k0=(await est()).k;
    await page.keyboard.press('PageDown'); await page.waitForTimeout(150);
    chk('P7 AvPág no cambia de sección', (await est()).k===k0, await est());
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(150);
    chk('→ cambia de sección', (await est()).k!==k0, await est());

    /* P3 las metas abren encima; Esc cierra primero la ventana */
    await ir('marcas');
    await page.evaluate(()=>{ try{ metasAbrir(); }catch(e){} }); await page.waitForTimeout(300);
    const m=await page.evaluate(([W,H])=>{ var mo=document.getElementById('modal'), top=document.elementFromPoint(W/2,H/2);
      return { on:mo.classList.contains('on'), encima:!!(top && top.closest('#modal')) }; }, [W,H]);
    chk('P3 «Cargar las metas» se ve encima de la presentación', m.on && m.encima, m);
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    chk('P3 el primer Esc cierra la ventana y sigue presentando', await page.evaluate(()=>!document.getElementById('modal').classList.contains('on') && PFC_PRES.on));
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    const sal=await est();
    chk('P6 el segundo Esc sale y la página no queda arriba de todo', !sal.on && sal.wy>0, sal);

    /* P5 cambiar de pestaña sale */
    await page.evaluate(()=>pfcPresAbrir()); await page.waitForTimeout(150);
    await page.evaluate(()=>showView('admin')); await page.waitForTimeout(200);
    chk('P5 cambiar de pestaña sale de la presentación', await page.evaluate(()=>!PFC_PRES.on && !document.body.classList.contains('pfc-pres') && !!document.getElementById('cta-pane-proy').closest('#view-conta')));
    await ctx.close();
  }

  /* ---------------- 🎧 ATC ---------------- */
  {
    const ctx=await browser.newContext({ viewport:{ width:1440, height:900 }, timezoneId:'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r=>r.abort());
    await ctx.addInitScript(()=>{ window.ATC_RECOGER_PRUEBA=1; window.ATC_DIA_PRUEBA=1; window.DESH_PRUEBA=1; });
    const page=await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
    await page.clock.setFixedTime(new Date('2026-11-25T10:00:00-04:00'));
    await page.goto('file://'+PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
    await page.evaluate('('+PREP_ATC+')()');
    await page.evaluate(async()=>{
      window.ADM_FICHAS_PRUEBA=1; UNLOCKED=true;
      var base={ tipo:'gar', mot:'Hundimiento', det:'hundido en el medio', fcom:'2025-06-10', r_col:1 };
      var L=function(o){ var l=_lin('CH1107|COLCHON ESPECIAL SEMIORTOPEDICO|140x190', 1); l.atc=Object.assign({}, base, o||{}); return [l]; };
      var X=function(id, fecha, turno, o, extra){ return _ped(id, fecha, turno, L(o), Object.assign({ oc:'ATC 11-'+id.slice(-3), cliente:'CLIENTE '+id.toUpperCase(), vehiculo:'Carry', chofer:'Omar', ts:_ts('2026-11-10','10:00:00') }, extra||{})); };
      await _cargar([
        X('a08','2026-11-24','AM'), X('a09','2026-11-24','AM'),
        X('t01','', '', { trh:1 }, { entregado:true, id:'atc-tre-t01' }),
        X('a05','2026-11-27','AM', { rec:'2026-11-23', rturno:'AM', pdev:'2026-11-27', pturno:'AM' })
      ], _stock(function(s){ s.c.u[_K]=10; }));
      document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block';
      ADM_PASADOS_VER=true; showView('admin'); setQuick(''); renderAdmin();
    });
    await page.waitForTimeout(150);
    const st=(id)=>page.evaluate((id)=>{ var p=findById(id); var a=atcDe(p)||{}; return { fecha:p.fecha, ent:p.entregado, est:atcEstado(p), fueRec:atcFueRecogida(p), pdev:a.pdev }; }, id);
    const modalOn=()=>page.evaluate(()=>document.getElementById('modal').classList.contains('on'));

    /* A1 */
    await page.evaluate(()=>{ abrirProgramarDevAtc('atc-tre-t01'); document.getElementById('pdev-fecha').value='2026-12-01'; guardarProgramarDevAtc('atc-tre-t01'); });
    await page.waitForTimeout(150);
    const t=await st('atc-tre-t01');
    const box=await page.evaluate(()=>{ var d=document.createElement('div'); d.innerHTML=atcFichaBoxHtml(findById('atc-tre-t01'));
      return [].map.call(d.querySelectorAll('.atcb-b'), b=>b.textContent.trim()); });
    chk('A1 ATC sin fecha con devolución programada: ya fue recogida', t.est==='programada' && t.fueRec, t);
    chk('A1 el recuadro no ofrece «✓ Recogido» (que la cerraba)', !box.some(x=>/^✓ Recogido$/.test(x)), box);

    /* A2 */
    await page.evaluate(()=>{ closeModal(); var p=findById('a09'); mergeAtcDatos(p,{ dev:'2026-11-25' }); upsert(p); });
    chk('A2 lista en fábrica: no pide marcar el recojo', await page.evaluate(()=>!atcRecojoSinMarcar(findById('a09')) && atcFueRecogida(findById('a09'))));
    await page.evaluate(()=>abrirProgramarDevAtc('a09')); await page.waitForTimeout(100);
    chk('A2 se puede programar la devolución', await page.evaluate(()=>!!document.getElementById('pdev-fecha')));
    await page.evaluate(()=>closeModal());

    /* A4 */
    await page.evaluate(()=>quickEntregado('a08')); await page.waitForTimeout(300);
    const dtxt=await page.evaluate(()=>{ var d=document.getElementById('desh'); return d ? d.textContent : ''; });
    chk('A4 el Deshacer dice «recogido»', /recogido/i.test(dtxt) && !/entregado/i.test(dtxt), dtxt.slice(0,80));
    chk('A4 se abrió «Programar devolución»', await page.evaluate(()=>!!document.getElementById('pdev-tras')));
    await page.evaluate(()=>{ var b=document.querySelector('#desh button'); if(b) b.click(); }); await page.waitForTimeout(300);
    chk('A4 «Deshacer» cierra «Programar devolución» y deja la ATC por recoger', !(await modalOn()) && (await st('a08')).est==='sinrecoger', await st('a08'));

    /* A3 */
    await page.evaluate(()=>{ try{ closeModal(); }catch(e){} EDIT_DESDE='admin'; editPedido('a05'); }); await page.waitForTimeout(400);
    const lbl=await page.evaluate(()=>document.getElementById('f-fecha-lbt').textContent);
    chk('A3 editar una ATC en su devolución: «Día de la devolución»', /devoluci/i.test(lbl), lbl);
    await ctx.close();
  }
  chk('sin errores de la página', errores.length===0, errores);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
