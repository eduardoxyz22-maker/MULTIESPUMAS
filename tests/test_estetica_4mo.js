/* 🎨 LO QUE SE VEÍA MAL EN LA COMPU Y EL IPAD (25/10, §4mo; el dueño: «sigo esperando mejoras visuales estéticas»).
   Mirado con capturas de la planilla real (en el scratchpad, nunca en el repo). Solo apariencia: ninguna cuenta cambia.

   LO QUE CUIDA:
   1. El encabezado se achica al bajar (la ciudad con el camión se esconde) y vuelve arriba de todo; la página NO salta al cambiar
      (el alto escondido pasa a margen) y `--hdr-h` dice lo que tapa arriba.
   2. La barra de pasos del formulario se pega DEBAJO del encabezado (`--hdr-h` + 8), no detrás.
   3. En el iPad acostado (1180) la barra de pasos entra entera («0 de 4 listos» se va si no entra).
   4. Contabilidad → Ventas: el cliente parte el renglón y los productos tienen lugar (≥ 290 px).
   5. «Hoy» de Administración en el iPad: ninguna etiqueta cortada con «…».
   6. «Conectado a Google Sheets» es una pastilla cuando no hay nada que avisar; con el aviso de la clave, la franja de siempre.
   7. Halloween: el anillo «PM» lleva su fondo (la telaraña no cruza la letra).
   8. Administración en fichas: de un día que ya pasó se ve solo lo que falta entregar; lo entregado, plegado en una línea con «Ver todo».
      Buscando no se pliega nada.
   9. ATC: los títulos de los filtros quedan a la misma altura (todos los campos 44 px).
  10. «Herramientas» blanca como las otras dos fichas grandes, con su flechita.
  11. Stock: la explicación de cada carril con su renglón apretado.

   Reloj CLAVADO (martes 27/10/2026, 10:00 de Bolivia: octubre = tema de Halloween). Solo datos sintéticos.
   Se corre:  node tests/test_estetica_4mo.js   (PEDIDOS=… para correrla contra otra versión) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const espera = ms => new Promise(r => setTimeout(r, ms));

const PREPARAR = async () => {
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  var lk=document.getElementById('admin-lock'); if(lk) lk.style.display='none';
  var ac=document.getElementById('admin-content'); if(ac) ac.style.display='block';
  var n=0, P=function(o){ n++; return Object.assign({ id:'p'+n, oc:'10-'+(100+n), nota:String(5000+n), cliente:'CLIENTE CON UN NOMBRE BASTANTE LARGO '+n, celular:'7000000'+n,
    fecha:'2026-10-28', turno:'AM', zona:'Norte', direccion:'CALLE '+n, vendedor:'Maria Flores',
    productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:3000 },{ desc:'ALMOHADA FIBRA SILICONADA', medida:'50x70', cant:2, precio:150 }],
    saldo:3300, acuenta:0, pagado:false, metodoPago:'', ts:new Date('2026-10-20T10:00:00-04:00').getTime(), rev:1 }, o); };
  STATE=[
    /* el 20/10 ya pasó y está todo entregado → no aparece */
    P({ fecha:'2026-10-20', entregado:true }), P({ fecha:'2026-10-20', entregado:true }), P({ fecha:'2026-10-20', turno:'PM', entregado:true }),
    /* el 23/10 ya pasó: uno entregado y uno NO → se ve solo el que falta */
    P({ fecha:'2026-10-23', entregado:true, cliente:'YA ENTREGADO DEL 23' }), P({ fecha:'2026-10-23', cliente:'FALTA ENTREGAR DEL 23' }),
    /* lo que viene */
    P(), P({ turno:'PM' }), P({ fecha:'2026-10-29' })
  ];
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
  apiSave=function(x){ return Promise.resolve({ ok:true, pedido:x }); };
};

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  for (const [w,h] of [[1440,900],[1180,820]]) {
    const ctx = await browser.newContext({ viewport:{ width:w, height:h }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(w+': '+e.message)); page.on('dialog', d => d.accept());
    await ctx.route(/^https:\/\//, r => r.abort());
    await page.addInitScript(() => { window.ADM_FICHAS_PRUEBA=1; window.ADM_TABS_PRUEBA=1; window.CX_TOP_PRUEBA=1; window.FP_PRUEBA=1; });
    await page.clock.setFixedTime(new Date('2026-10-27T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate(PREPARAR);
    await page.evaluate(async () => { await refrescarEstado(); });
    const tag = w+'×'+h;

    // 1 · el encabezado se achica al bajar y la página no salta
    await page.evaluate(() => { showView('form'); window.scrollTo(0,0); });
    await page.waitForTimeout(400);
    const e1 = await page.evaluate(async () => {
      var root=document.documentElement, hv=function(){ return parseFloat(getComputedStyle(root).getPropertyValue('--hdr-h')); };
      var ref=document.getElementById('f-cliente') || document.querySelector('#view-form input');
      var arriba={ chico:document.body.classList.contains('hdr-chico'), hdr:hv() };
      var posA=ref.getBoundingClientRect().top+window.scrollY;
      window.scrollTo(0, 400); window.dispatchEvent(new Event('scroll'));
      await new Promise(function(r){ setTimeout(r, 450); });
      var abajo={ chico:document.body.classList.contains('hdr-chico'), hdr:hv(), alto:Math.round(document.querySelector('.header').getBoundingClientRect().height) };
      var posB=ref.getBoundingClientRect().top+window.scrollY;
      var bar=document.getElementById('fp-barra'), barTop=bar && !bar.hidden ? Math.round(bar.getBoundingClientRect().top) : null;
      var cab=document.querySelector('.header').getBoundingClientRect().bottom;
      window.scrollTo(0, 0); window.dispatchEvent(new Event('scroll'));
      await new Promise(function(r){ setTimeout(r, 450); });
      return { arriba:arriba, abajo:abajo, salto:Math.round(posB-posA), barTop:barTop, cab:Math.round(cab), vuelve:!document.body.classList.contains('hdr-chico'), hdrVuelta:hv() };
    });
    chk(`1·${tag}. al bajar se esconde la ciudad (el encabezado pasa de ${Math.round(e1.arriba.hdr)} a ${Math.round(e1.abajo.hdr)} px) y arriba de todo vuelve`,
        !e1.arriba.chico && e1.abajo.chico && e1.abajo.hdr < e1.arriba.hdr-40 && e1.vuelve && Math.abs(e1.hdrVuelta-e1.arriba.hdr)<2, e1);
    chk(`1·${tag}. …y la página no salta al esconderla (un campo queda en el mismo lugar del documento)`, Math.abs(e1.salto)<=1, e1);
    chk(`1·${tag}. «--hdr-h» = lo que tapa de verdad el encabezado chico`, Math.abs(e1.abajo.hdr-e1.abajo.alto)<=2, e1.abajo);
    // 2 · la barra de pasos, debajo del encabezado
    chk(`2·${tag}. la barra de pasos se pega DEBAJO del encabezado (top ${e1.barTop}, encabezado hasta ${e1.cab})`, e1.barTop!=null && e1.barTop>=e1.cab+4 && e1.barTop<=e1.cab+14, e1);
    // 3 · la barra de pasos entra
    const e3 = await page.evaluate(() => { var b=document.getElementById('fp-barra'); return { sw:b.scrollWidth, cw:b.clientWidth, av:(function(){ var a=b.querySelector('.fp-av'); return a ? getComputedStyle(a).display : 'no'; })() }; });
    chk(`3·${tag}. la barra de pasos entra entera, sin correrla de costado`, e3.sw<=e3.cw+1, e3);

    // 4 · Contabilidad: los productos tienen lugar
    const e4 = await page.evaluate(async () => {
      showView('conta'); try{ segSet('cta-mode','todo'); setContaTab('ventas'); renderConta(); }catch(e){}
      await new Promise(function(r){ setTimeout(r, 400); });
      var t=document.getElementById('tbl-conta'), pc=t && t.querySelector('tbody td.prod-cell'), cli=t && t.querySelector('tbody td:nth-child(4)');
      return pc ? { prod:Math.round(pc.getBoundingClientRect().width), cliWs:getComputedStyle(cli).whiteSpace, filas:t.querySelectorAll('tbody tr').length } : null;
    });
    chk(`4·${tag}. Ventas: los productos tienen ≥ 290 px y el cliente parte el renglón`, e4 && e4.prod>=288 && e4.cliWs==='normal', e4);

    // 5 · «Hoy» sin etiquetas cortadas; 6 · conexión; 7 · el anillo; 10 · Herramientas
    const e5 = await page.evaluate(async () => {
      showView('admin'); try{ renderAdmin(); }catch(e){}
      await new Promise(function(r){ setTimeout(r, 400); });
      var cort=[].filter.call(document.querySelectorAll('#adm-hoy .ah-st small'), function(s){ return s.scrollWidth>s.clientWidth+1 || getComputedStyle(s).textOverflow==='ellipsis'; }).map(function(s){ return s.textContent; });
      SERVER_AUTH='clave'; SERVER_ADMIN_AUTH='clave'; renderConnEstado();
      var ca=document.getElementById('conn-admin'), pill={ cls:ca.className, w:Math.round(ca.getBoundingClientRect().width), r:getComputedStyle(ca).borderRadius };
      SERVER_AUTH='abierto'; renderConnEstado();
      var franja={ cls:ca.className, w:Math.round(ca.getBoundingClientRect().width) };
      var an=document.querySelector('.h-an.pm') || document.querySelector('.h-an'), anBg=an ? getComputedStyle(an).backgroundImage : '';
      var her=[].filter.call(document.querySelectorAll('#adm-secs button'), function(b){ return /Herramientas/.test(b.textContent); })[0];
      var herI={ bg:her ? getComputedStyle(her).backgroundColor : '', fl:her ? getComputedStyle(her,'::after').content : '', txt:her ? her.textContent.trim() : '' };
      return { cort:cort, n:document.querySelectorAll('#adm-hoy .ah-st small').length, pill:pill, franja:franja, anBg:anBg, her:herI, hw:document.documentElement.classList.contains('tema-halloween') };
    });
    chk(`5·${tag}. «Hoy»: ninguna de las ${e5.n} etiquetas cortada con «…»`, e5.n>=3 && !e5.cort.length, e5.cort);
    chk(`6·${tag}. sin nada que avisar, «Conectado» es una pastilla (${e5.pill.w} px); con el aviso de la clave, la franja (${e5.franja.w} px)`,
        /conn-solo/.test(e5.pill.cls) && / on$/.test(e5.pill.cls) && !/conn-solo/.test(e5.franja.cls) && e5.pill.w < e5.franja.w/2, [e5.pill, e5.franja]);
    chk(`7·${tag}. octubre: el anillo «PM» lleva su fondo de noche (la telaraña no cruza la letra)`, e5.hw && /radial-gradient/.test(e5.anBg), e5.anBg.slice(0,80));
    chk(`10·${tag}. «Herramientas» blanca como las otras, con su flechita, y el texto del botón igual que antes`,
        e5.her.bg==='rgb(255, 255, 255)' && /▾/.test(e5.her.fl) && /^🧰\s*Herramientas/.test(e5.her.txt) && !/▾/.test(e5.her.txt), e5.her);

    // 8 · Administración en fichas: lo de días pasados
    const e8 = await page.evaluate(async () => {
      var nombres=function(){ return [].map.call(document.querySelectorAll('#adm-fichas .af-f .af-who b'), function(b){ return b.textContent; }); };
      try{ segSet('adm-mode','todo'); }catch(e){} admPasadosVer(false);
      await new Promise(function(r){ setTimeout(r, 200); });
      var pas=document.querySelector('#adm-fichas .af-pas');
      var a={ pas:pas ? pas.textContent.replace(/\s+/g,' ').trim() : null, nombres:nombres(), grupos:[].map.call(document.querySelectorAll('#adm-fichas .af-g'), function(g){ return g.textContent.replace(/\s+/g,' ').trim(); }) };
      pas.querySelector('button').click(); await new Promise(function(r){ setTimeout(r, 200); });
      var b={ nombres:nombres(), btn:(document.querySelector('#adm-fichas .af-pas button')||{}).textContent };
      admPasadosVer(false);
      var s=document.getElementById('adm-search'); s.value='DEL 23'; renderAdmin(); await new Promise(function(r){ setTimeout(r, 200); });
      var c={ nombres:nombres(), pas:!!document.querySelector('#adm-fichas .af-pas') };
      s.value=''; renderAdmin();
      return { a:a, b:b, c:c };
    });
    chk(`8·${tag}. lo ya entregado de días que pasaron, plegado en UNA línea: «4 pedidos · del 20/10 al 23/10»`,
        e8.a.pas && /plegado/.test(e8.a.pas) && /4 pedidos/.test(e8.a.pas) && /20\/10/.test(e8.a.pas) && /23\/10/.test(e8.a.pas) && /Ver todo/.test(e8.a.pas), e8.a.pas);
    chk(`8·${tag}. …de días pasados se ve solo lo que falta entregar (y lo que viene, entero)`,
        e8.a.nombres.length===4 && e8.a.nombres.indexOf('FALTA ENTREGAR DEL 23')>=0 && e8.a.nombres.indexOf('YA ENTREGADO DEL 23')<0, e8.a.nombres);
    chk(`8·${tag}. …el 20/10 (todo entregado) ni aparece; el 23/10 dice «1 de 2 entregados» y «1 sin entregar», sin cupos ni «listos»`,
        !e8.a.grupos.some(g=>/20\/10|martes 20/i.test(g)) && e8.a.grupos.some(g=>/23\/10/.test(g) && /1 de 2 entregados/.test(g) && /1 sin entregar/.test(g) && !/cupo|listo/.test(g)), e8.a.grupos);
    chk(`8·${tag}. «Ver todo» los muestra a todos (8) y el botón pasa a «Plegarlos»`, e8.b.nombres.length===8 && /Plegarlos/.test(e8.b.btn||''), e8.b);
    chk(`8·${tag}. buscando no se pliega nada (se encuentran los dos del 23/10)`, e8.c.nombres.length===2 && !e8.c.pas, e8.c);

    // 9 · ATC: los títulos de los filtros a la misma altura
    const e9 = await page.evaluate(async () => {
      showView('atc'); await new Promise(function(r){ setTimeout(r, 300); });
      var fs=[].slice.call(document.querySelectorAll('#view-atc .filters > .field')).filter(function(f){ return f.offsetParent && f.querySelector('.lb'); });
      var tops=fs.map(function(f){ return Math.round(f.querySelector('.lb').getBoundingClientRect().top); });
      var fila=tops.filter(function(t){ return Math.abs(t-tops[0])<20; });
      var altos=fs.map(function(f){ var c=f.querySelector('input,select,.seg'); return c ? Math.round(c.getBoundingClientRect().height) : 0; });
      return { tops:fila, altos:altos };
    });
    chk(`9·${tag}. ATC: los títulos de la fila de filtros a la misma altura y los campos de 44 px`,
        e9.tops.length>=3 && Math.max.apply(null,e9.tops)-Math.min.apply(null,e9.tops)<=1 && e9.altos.every(a=>a===44), e9);

    // 11 · Stock: el renglón de cada carril
    const e11 = await page.evaluate(() => {
      var d=document.createElement('div'); d.className='ci-est'; d.innerHTML='<div class="ci-placa"><b>🏭 Pedir esta semana · 4</b><small>alcanzan para lo que tarda la fábrica, sin margen</small></div>';
      (document.getElementById('stock-overlay')||document.body).appendChild(d);
      var s=d.querySelector('small'), cs=getComputedStyle(s), r={ lh:parseFloat(cs.lineHeight), fs:parseFloat(cs.fontSize), col:getComputedStyle(d).gridTemplateColumns };
      d.remove(); return r;
    });
    chk(`11·${tag}. Stock: la explicación del carril con su renglón apretado (${e11.lh} px con letra de ${e11.fs})`, e11.lh<=e11.fs*1.4+0.5 && /^186px/.test(e11.col), e11);
    await ctx.close();
  }
  chk('sin errores en la página', !errores.length, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
