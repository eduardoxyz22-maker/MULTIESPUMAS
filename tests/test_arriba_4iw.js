/* 🚚 ARRIBA DEL PANEL (§4iw, 09/10/2026; dueño: «A», «C, aprobado», «D2, D3, D5, D6»).

   1. El encabezado: el día de hoy en palabras, dos anillos con los cupos LIBRES del próximo camión (los mismos números de
      `#stat-hoy-l`, que sigue escrito) y el camión en la ruta, que va de derecha a izquierda (mira a la izquierda: de frente).
   2. Sábado: el anillo de la tarde va apagado con «—». Un turno lleno se pone rojo.
   3. En el celular (390 px) las pestañas bajan al pie, con su ícono y una palabra; la barra de pasos del formulario queda
      ENCIMA de esa barra, y nada del formulario queda tapado.
   4. D5: el sello sale con `FX_PRUEBA` y se va solo; sin `FX_PRUEBA` no sale (las pruebas no lo ven).
   5. D3: los números de las fichas cuentan hasta su valor y terminan EXACTAMENTE en el texto que puso el panel.
   6. D6: «Pedir ya» lleva el punto que late, en la cinta y en el plan.
   7. Sin errores de la página.

   Se corre:  node tests/test_arriba_4iw.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,extra)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, extra!=null?('· '+(typeof extra==='string'?extra:JSON.stringify(extra))):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  async function abrir(cuando, vp){
    const page = await browser.newPage(Object.assign({ viewport:{ width:1300, height:800 }, timezoneId:'America/La_Paz' }, vp||{}));
    page.on('pageerror', e=>errores.push(e.message));
    await page.route(/^https?:/, r=>r.abort());
    await page.clock.setFixedTime(new Date(cuando));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(400);
    await page.evaluate(()=>{ try{ CARGA_GEN++; CARGA_ESTADO='ok'; clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){} });
    return page;
  }
  /* Pedidos de ejemplo para el próximo camión, con turnos fijos. */
  const cargar = (page, filas) => page.evaluate((filas)=>{
    var man=proximoDiaEntrega();
    STATE = filas.map(function(f,i){ return { id:'pa'+i, oc:'10-9'+String(i).padStart(2,'0'), fecha:man, turno:f, cliente:'CLIENTE '+i, vendedor:'Mirian Salazar', productos:[{desc:'COLCHON X', medida:'140x190', cant:1}], ts:Date.now() }; });
    updateStats();
    return new Promise(function(r){ setTimeout(r, 120); });
  }, filas);

  // 1. Martes 06/10 → el próximo camión es el miércoles 07/10 (AM 12, PM 13).
  {
    const page = await abrir('2026-10-06T10:00:00-04:00');
    await cargar(page, ['AM','AM','AM','PM']);
    await page.waitForTimeout(150);
    const r = await page.evaluate(()=>{
      var an=[].map.call(document.querySelectorAll('#h-anillos .h-an'), function(e){ return { t:e.querySelector('i').textContent, n:e.querySelector('b').textContent, cls:e.className,
        off:parseFloat(e.querySelector('.v').getAttribute('data-o')) }; });
      var cam=document.querySelector('.h-camion'), cs=getComputedStyle(cam);
      return { dia:document.getElementById('hdr-dia').textContent, lbl:document.getElementById('stat-hoy-l').innerText, an:an,
        anim:cs.animationName, camVisible: cam.getBoundingClientRect().height>0, viejo:document.body.innerText.indexOf('Cargá desde el celular')>=0 };
    });
    chk('1a. arriba dice el día de hoy en palabras', r.dia==='Martes 6 de octubre', r.dia);
    chk('1b. el texto de cupos sigue escrito (los mismos números)', /🌅9/.test(r.lbl) && /🌆12/.test(r.lbl), r.lbl);
    chk('1c. dos anillos: AM con 9 libres y PM con 12', r.an.length===2 && r.an[0].t==='AM' && r.an[0].n==='9' && r.an[1].t==='PM' && r.an[1].n==='12', r.an);
    chk('1d. el anillo se llena con lo ocupado (AM 3 de 12 → 1/4 lleno)', Math.abs(r.an[0].off - 113.1*0.75) < 0.2, r.an[0].off);
    chk('1e. el camión anda (va de derecha a izquierda)', r.camVisible && /h-viaje/.test(r.anim), r.anim);
    chk('1f. ya no está «Cargá desde el celular · se comparte con el equipo»', !r.viejo);
    const css = await page.evaluate(()=>{ for (const s of document.styleSheets){ try{ for (const k of s.cssRules){ if(k.name==='h-viaje') return k.cssText; } }catch(e){} } return ''; });
    chk('1g. el viaje termina a la IZQUIERDA (anima «right» hasta pasar el borde)', /right:\s*calc\(100% \+ 40px\)/.test(css), css);
    // lleno
    await cargar(page, Array(12).fill('AM'));
    await page.waitForTimeout(150);
    const ll = await page.evaluate(()=>document.querySelector('#h-anillos .h-an.am').className);
    chk('2a. con el turno lleno el anillo se pone rojo', /lleno/.test(ll), ll);
    await page.close();
  }
  // 2b. Viernes 09/10 → el próximo camión es el sábado 10/10: sin tarde.
  {
    const page = await abrir('2026-10-09T10:00:00-04:00');
    await cargar(page, ['AM']);
    const r = await page.evaluate(()=>[].map.call(document.querySelectorAll('#h-anillos .h-an'), e=>({ cls:e.className, n:e.querySelector('b').textContent })));
    chk('2b. el sábado la tarde va apagada con «—»', r[1] && /cerr/.test(r[1].cls) && r[1].n==='—' && r[0].n==='14', r);
    await page.close();
  }
  // 3. Celular.
  {
    const page = await abrir('2026-10-06T10:00:00-04:00', { viewport:{ width:390, height:844 }, hasTouch:true, isMobile:true });
    const r = await page.evaluate(async ()=>{
      var nav=document.querySelector('.nav'), rn=nav.getBoundingClientRect(), cs=getComputedStyle(nav);
      var bs=[].map.call(nav.querySelectorAll('button'), function(b){ var rb=b.getBoundingClientRect(); return { id:b.id, w:Math.round(rb.width), cr:getComputedStyle(b.querySelector('.t-cr')).display, lb:getComputedStyle(b.querySelector('.t-lb')).display, txt:b.innerText.trim() }; });
      window.scrollTo(0,600); fxPasosPintar(); await new Promise(r=>setTimeout(r,250));
      var ps=document.getElementById('fx-pasos'), rp=ps.getBoundingClientRect();
      var b=document.getElementById('f-submit'); b.scrollIntoView({block:'end'}); await new Promise(r=>setTimeout(r,120));
      var rb=b.getBoundingClientRect(), en=document.elementFromPoint(rb.left+rb.width/2, rb.top+rb.height/2);
      var hd=document.querySelector('.header-in').getBoundingClientRect(), an=document.getElementById('h-anillos').getBoundingClientRect();
      return { pos:cs.position, abajo:Math.round(innerHeight-rn.bottom), alto:Math.round(rn.height), bs:bs, ancho:document.documentElement.scrollWidth, vw:innerWidth,
        pasosAbajo:Math.round(rp.bottom), navArriba:Math.round(rn.top), pasosOculto:ps.hidden, guardar:!!(en && (en===b || b.contains(en))),
        unaLinea: an.top < hd.top + 20 };
    });
    chk('3a. en el celular las pestañas van fijas al pie', r.pos==='fixed' && r.abajo===0 && r.alto<70, r);
    chk('3b. seis botones con ícono y palabra corta, todos del mismo ancho', r.bs.length===6 && r.bs.every(b=>b.cr==='block' && b.lb==='none') && Math.max(...r.bs.map(b=>b.w))-Math.min(...r.bs.map(b=>b.w))<=2,
        r.bs.map(b=>b.txt.replace(/\s+/g,' ')+'·'+b.w));
    chk('3c. la página no se va de costado', r.ancho<=r.vw, r.ancho);
    chk('3d. la barra de pasos queda ENCIMA de la barra del pie', !r.pasosOculto && r.pasosAbajo<=r.navArriba+2, r);
    chk('3e. el botón Guardar llevado a la vista no queda tapado', r.guardar, r);
    chk('3f. los anillos van en la misma línea que el logo', r.unaLinea, r);
    await page.tap('#tab-mis'); await page.waitForTimeout(250);
    const act = await page.evaluate(()=>({ mis:document.getElementById('view-mis').classList.contains('active'), tab:document.getElementById('tab-mis').classList.contains('active') }));
    chk('3g. tocar «Míos» abre Mis pedidos', act.mis && act.tab, act);
    await page.close();
  }
  // 4-6. Sello, números que cuentan y el punto que late.
  {
    const page = await abrir('2026-10-06T10:00:00-04:00');
    const s = await page.evaluate(async ()=>{
      fxSello('GUARDADO','ok'); var sin=document.querySelectorAll('.fx-sello').length;
      window.FX_PRUEBA=1; fxSello('COBRADO','plata'); var con=document.querySelector('.fx-sello'); var txt=con&&con.textContent, pe=con&&getComputedStyle(con).pointerEvents;
      await new Promise(r=>setTimeout(r,2100)); var queda=document.querySelectorAll('.fx-sello').length;
      return { sin:sin, txt:txt, pe:pe, queda:queda };
    });
    chk('4a. en las pruebas el sello no sale solo', s.sin===0, s);
    chk('4b. con FX_PRUEBA sale el sello, no se puede tocar (no tapa botones) y se va solo', s.txt==='COBRADO' && s.pe==='none' && s.queda===0, s);
    const c = await page.evaluate(async ()=>{
      window.FX_PRUEBA=1;
      var caja=document.createElement('div'); caja.id='prueba-mc'; caja.innerHTML=mc('#00B5AD','Vendido en el período', fmtBs(12345.67), 'x'); document.querySelector('.wrap').appendChild(caja);
      await new Promise(r=>setTimeout(r,120)); var medio=caja.querySelector('.mc-val').textContent;
      await new Promise(r=>setTimeout(r,1100)); var fin=caja.querySelector('.mc-val').textContent;
      caja.innerHTML=mc('#00B5AD','Vendido en el período', fmtBs(12345.67), 'x'); await new Promise(r=>setTimeout(r,150)); var igual=caja.querySelector('.mc-val').textContent;
      return { medio:medio, fin:fin, esperado:fmtBs(12345.67), igual:igual };
    });
    chk('5a. el número arranca contando (a mitad no es el final)', c.medio!==c.esperado, c);
    chk('5b. termina EXACTAMENTE en el texto del panel', c.fin===c.esperado, c);
    chk('5c. si se vuelve a dibujar igual, no cuenta de nuevo', c.igual===c.esperado, c);
    const d = await page.evaluate(()=>{
      var o={ k:'colchon x|140x190', desc:'COLCHON X', medida:'140x190', aviso:'urgente', fabricar:3, pedir:3, deposito:0, enSale:0, enOtros:0, comp:2, porDia:1, dias:0, lead:3 };
      var h=stockCintaHtml({ lista:[o] }) || '';
      var g=planGrupoDe(o);
      return { cinta:/ci-ya[\s\S]*late-dot/.test(h), g:g, css:!!document.querySelector('style') && getComputedStyle(document.body).getPropertyValue('--x')!==null };
    }).catch(e=>({ err:String(e) }));
    chk('6a. en la cinta, «Pedir ya» lleva el punto que late', d.cinta, d);
    const p6 = await page.evaluate(()=>/late-dot[\s\S]{0,40}sfAccion|x\.g==='ya'\?'<i class="late-dot"><\/i>'/.test(String(stockPlanHtml)));
    chk('6b. en el plan, la acción de «Pedir ya» lleva el punto que late', p6);
    await page.close();
  }
  chk('7. ningún error de JavaScript', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
