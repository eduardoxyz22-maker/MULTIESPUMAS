/* 🔎 AL SUBIR EL EXCEL: LO MARCADO ✔ QUE YA NO ESTÁ (15/11/2026, mejora 314; dueño: «314» → «que solo AVISE»).
   Al terminar los Excel solo salía «guardado»: nadie abría la Revisión automática justo cuando cambia lo que hay.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin `EX_AVISO_PRUEBA` no sale nada (ni al confirmar el Excel).
   2. Con la bandera, lo de HOY y el próximo día con camión: ⚠️ lo marcado ✔ que ningún almacén tiene (`stockAsignar().sinRespaldo`),
      📍 el «✔ Banzer» que está en Moreno (`realoja`/`almMal`) y ⬜ lo sin marcar (`semanaLinea`). No entran lo de dentro de 10 días,
      lo que sí tiene stock, lo entregado ni una ATC.
   3. La ventana sale al confirmar el ÚLTIMO almacén del archivo (con otro esperando en la cola, todavía no) y no cambia ninguna marca
      ni guarda ningún pedido.
   4. «👀 Ver el pedido» abre la ficha con «← Volver al aviso del Excel»; «🤖 Revisar y marcar» abre la Revisión automática.
   5. Sin nada que decir, no sale. Cortar el resto del archivo después de usar un almacén avisa igual; sin haber usado ninguno, no.
   Datos SINTÉTICOS. Reloj clavado el jueves 05/11/2026 a las 10:00. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_excel_aviso.js */
const { chromium } = require('playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport:{ width:1366, height:950 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e=>errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.setFixedTime(new Date('2026-11-05T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(500);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  await ev(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    loadFromServer=function(){};
    try{ localStorage.removeItem(LS_PEND); }catch(e){}
    window._env=[];
    apiPost=function(pl){ var c=JSON.parse(JSON.stringify(pl)); window._env.push(c);
      if(c.action==='save'){ var p=Object.assign({}, c.pedido, { rev:(Number(c.pedido.rev)||0)+1 }); return Promise.resolve({ ok:true, version:'2026-11-14-a', pedido:p, mode:'update', ahora:Date.now() }); }
      return Promise.resolve({ ok:true }); };
    var LOG='PRODUCTOS TERMINADOS FAB.', BZ='01-05-025  Almacen Distribucion Banzer', IMN='IM - PRODUCTOTERMINADO';
    var ki=function(d, m, c){ return stockInfo({ desc:d, medida:m, codigo:c||'' }).k; };
    var K1=ki('TITANIO LATEX','140x190','CH1129'), K2=ki('TITANIO ICE','160x190','CH1201'), K3=ki('PILLOW FLEX','140x190',''), K4=ki('MEMORY FLEX','90x190','');
    window.__X={ LOG:LOG, BZ:BZ, IMN:IMN, K1:K1, K2:K2, K3:K3, K4:K4 };
    window.__seed=function(soloOk){
      var hoy=todayStr(), prox=proximoDiaEntrega(), t0=Date.parse(hoy+'T07:00:00-04:00'), n=0;
      STOCK=stockVacio(); STOCK_CARGADO=true;
      STOCK.c={ f:hoy, hora:'09:00:00', u:{}, solo0:true, alm:LOG, t:Date.parse(hoy+'T09:05:00-04:00') }; STOCK.c.u[K1]=0; STOCK.c.u[K4]=5;
      STOCK.g={}; STOCK.al={}; STOCK.al[LOG]='log';
      STOCK.g[BZ]={ f:hoy, hora:'09:00:00', u:{}, solo0:true, cod:{}, t:Date.parse(hoy+'T09:05:00-04:00'), rs:{} }; STOCK.g[BZ].u[K2]=0; STOCK.al[BZ]='sale';
      STOCK.g[IMN]={ f:hoy, hora:'08:00:00', u:{}, solo0:true, cod:{}, t:Date.parse(hoy+'T08:05:00-04:00'), rs:{} }; STOCK.g[IMN].u[K2]=2; STOCK.al[IMN]='otro';
      var P=function(id, oc, f, x, extra){ n++; return Object.assign({ id:id, oc:oc, cliente:'CLIENTE '+id.toUpperCase(), fecha:f, turno:'AM', vendedor:'Mirian Salazar', zona:'Norte', direccion:'Calle '+n,
        productos:[Object.assign({ cant:1, chk:'' }, x)], entregado:false, ts:t0-n*1000, rev:2, fotos:[] }, extra||{}); };
      STATE = soloOk ? [ P('ok1','11-205',hoy,{ desc:'MEMORY FLEX', medida:'90x190', cant:1, chk:'ok' }) ] : [
        P('a1','11-201',hoy,{ desc:'TITANIO LATEX', medida:'140x190', codigo:'CH1129', cant:3, chk:'ok' }),
        P('b1','11-202',prox,{ desc:'TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, chk:'ok', chkDe:BZ }),
        P('v1','11-203',hoy,{ desc:'PILLOW FLEX', medida:'140x190', cant:2 }),
        P('f1','11-204',diasAdelante(10),{ desc:'TITANIO LATEX', medida:'140x190', codigo:'CH1129', cant:2, chk:'ok' }),
        P('ok1','11-205',hoy,{ desc:'MEMORY FLEX', medida:'90x190', cant:1, chk:'ok' }),
        P('d1','11-206',hoy,{ desc:'TITANIO LATEX', medida:'140x190', codigo:'CH1129', cant:1, chk:'ok' }, { entregado:true }),
        P('t1','ATC 11-007',hoy,{ desc:'PILLOW FLEX', medida:'140x190', cant:1 })
      ];
      STOCK_MEMO={}; try{ stockOlvidarIndice(); }catch(e){}
      window._env=[];
    };
    window.__marcas=function(){ return JSON.stringify(STATE.map(function(p){ return [p.id, p.entregado, (p.productos||[]).map(function(x){ return [x.chk||'', x.chkDe||'', x.chkDes||null]; })]; })); };
    window.__imp=function(alm, items, hora){
      var it=items.map(function(i){ return { cod:i.cod, desc:i.desc, medida:i.medida, cant:i.cant, cat:true, k:i.k }; }), cods={};
      it.forEach(function(i){ cods[i.cod]=i.k; });
      return { fecha:todayStr(), sinFecha:false, hora:hora, almacen:alm, items:it, total:it.reduce(function(a,i){ return a+i.cant; },0), repetidos:0, malos:0, colCant:'G', solo0:true, cods:cods,
        esLog:normNombre(alm)===normNombre(STOCK_ALM_LOG)||(STOCK.al||{})[alm]==='log', conocido:!!(STOCK.al||{})[alm] };
    };
    window.__modal=function(){ var m=document.getElementById('modal'), b=document.getElementById('modal-box');
      return { on:!!(m && m.classList.contains('on')), t:b ? b.innerText.replace(/\s+/g,' ') : '', h3:(b && b.querySelector('h3')) ? b.querySelector('h3').innerText : '' }; };
  });

  console.log('\n── 1. Sin la bandera ──');
  let r = await ev(() => {
    __seed(); closeModal();
    var out={ ret:exAvisoAlTerminar(), m1:__modal().on };
    EXIST_COLA=[]; EXIST_IMP=__imp(__X.IMN, [{ cod:'CH1201', desc:'TITANIO ICE 2.5PLZ 160X190CM', medida:'160x190', cant:2, k:__X.K2 }], '09:30:00');
    renderImportExist(); confirmarImportExist();
    out.m2=__modal(); return out;
  });
  chk('sin EX_AVISO_PRUEBA, exAvisoAlTerminar no hace nada', r.ret===null && r.m1===false, r);
  chk('…y al confirmar el Excel no sale ninguna ventana', r.m2 && r.m2.on===false, r.m2);

  console.log('\n── 2. Con la bandera: qué junta ──');
  await ev(() => { window.EX_AVISO_PRUEBA=1; });
  r = await ev(() => {
    __seed(); closeModal();
    var D=exAvisoDatos();
    return { prox:D.prox, sin:D.sin.map(function(x){ return x.id+'|'+x.u+'|'+x.faltan; }), lug:D.lug.map(function(x){ return x.id+'|'+x.dice+'|'+x.esta; }), vac:D.vac.map(function(x){ return x.id+'|'+x.u; }), n:D.n };
  });
  chk('⚠️ lo marcado ✔ de HOY que ningún almacén tiene: solo 11-201 (3 de 3 faltan)', r.sin && r.sin.length===1 && r.sin[0]==='a1|3|3', r);
  chk('📍 el «✔ Banzer» del próximo día está en Moreno: «marcado Banzer, pero 1 en 📥 IM»', r.lug && r.lug.length===1 && /^b1\|.*Banzer\|1 en 📥 IM$/.test(r.lug[0]), r.lug);
  chk('⬜ lo sin marcar: solo 11-203 (no la ATC)', r.vac && r.vac.length===1 && r.vac[0]==='v1|2', r.vac);
  chk('no entran lo de dentro de 10 días, lo que tiene stock ni lo entregado', r.n===3 && !JSON.stringify(r).match(/f1|ok1|d1|t1/), r);

  console.log('\n── 3. Al confirmar el último almacén del archivo ──');
  r = await ev(() => {
    __seed(); closeModal();
    var antes=__marcas(), out={};
    // un archivo con dos almacenes: Banzer primero (con IM esperando en la cola), IM después
    EXIST_COLA=[ __imp(__X.IMN, [{ cod:'CH1201', desc:'TITANIO ICE 2.5PLZ 160X190CM', medida:'160x190', cant:2, k:__X.K2 }], '09:30:00') ];
    EXIST_IMP=__imp(__X.BZ, [{ cod:'CH1201', desc:'TITANIO ICE 2.5PLZ 160X190CM', medida:'160x190', cant:0, k:__X.K2 }], '09:30:00');
    renderImportExist(); confirmarImportExist();
    out.medio=__modal(); out.usado=EX_AVISO_USADO;
    confirmarImportExist();
    out.fin=__modal(); out.usado2=EX_AVISO_USADO;
    out.mismas=(__marcas()===antes);
    out.guardo=_env.filter(function(c){ return c.action==='save' && c.pedido && !/^__/.test(String(c.pedido.id||'')); }).map(function(c){ return c.pedido.id; });
    out.botones=[].map.call(document.querySelectorAll('#modal-box .exa-r button'), function(b){ return b.getAttribute('data-id'); });
    return out;
  });
  chk('con otro almacén esperando en la cola, todavía no avisa (sale la vista previa del que sigue)', r.medio && r.medio.on && !/Con el Excel de hoy/.test(r.medio.h3) && r.usado===true, r.medio && r.medio.h3);
  chk('con el último, sale «🔎 Con el Excel de hoy, lo de hoy y mañana»', r.fin && r.fin.on && /🔎 Con el Excel de hoy, lo de hoy y mañana/.test(r.fin.h3) && r.usado2===false, r.fin && r.fin.h3);
  chk('el resumen: «⚠️ 1 pedido con ✔ que el Excel ya no tiene · 📍 1 marcado en un lugar que está en otro · ⬜ 1 sin marcar»',
    r.fin && /⚠️ 1 pedido con ✔ que el Excel ya no tiene · 📍 1 marcado en un lugar que está en otro · ⬜ 1 sin marcar/.test(r.fin.t), r.fin && r.fin.t);
  chk('cada renglón con su OC, cliente, producto y día', r.fin && /OC 11-201 · CLIENTE A1 · TITANIO LATEX.* × 3 · hoy/.test(r.fin.t) && /OC 11-202 · CLIENTE B1 · .*marcado Banzer, pero 1 en 📥 IM · mañana/.test(r.fin.t) && /OC 11-203 · CLIENTE V1 · PILLOW FLEX 140x190 × 2 · hoy/.test(r.fin.t), r.fin && r.fin.t);
  chk('dice que no cambia ninguna marca solo', r.fin && /no cambia ninguna marca solo/.test(r.fin.t), r.fin && r.fin.t);
  chk('un «👀 Ver el pedido» por renglón (a1, b1, v1)', JSON.stringify(r.botones)===JSON.stringify(['a1','b1','v1']), r.botones);
  chk('ninguna marca cambió y no se guardó ningún pedido (solo el stock)', r.mismas===true && r.guardo.length===0, { mismas:r.mismas, guardo:r.guardo });

  console.log('\n── 4. Los botones ──');
  r = await ev(() => {
    var out={};
    document.querySelector('#modal-box .exa-r button[data-id="a1"]').click();
    out.ficha=__modal(); out.volver=!!document.getElementById('exa-volver');
    document.getElementById('exa-volver').click();
    out.vuelta=__modal();
    REVSTK=null;
    document.querySelector('#modal-box .exa-rev').click();
    out.rev={ revstk:!!REVSTK, stock:(document.getElementById('stock-overlay')||{style:{}}).style.display!=='none', m:__modal() };
    try{ cerrarStock(); }catch(e){} closeModal();
    return out;
  });
  chk('«👀 Ver el pedido» abre la ficha de ese pedido con «← Volver al aviso del Excel»', r.ficha && r.ficha.on && /CLIENTE A1/.test(r.ficha.t) && !/Con el Excel de hoy/.test(r.ficha.h3) && r.volver, r.ficha && r.ficha.h3);
  chk('«← Volver» vuelve al aviso', r.vuelta && /🔎 Con el Excel de hoy/.test(r.vuelta.h3), r.vuelta && r.vuelta.h3);
  chk('«🤖 Revisar y marcar» abre la Revisión automática (sin aplicar nada)', r.rev && r.rev.revstk && r.rev.stock, r.rev);

  console.log('\n── 5. Sin nada que decir · cortar el resto del archivo ──');
  r = await ev(() => {
    __seed(true); closeModal();
    var out={}, D=exAvisoAlTerminar(); out.nada={ n:D && D.n, m:__modal().on };
    __seed(); closeModal();
    var n=0, orig=window.exAvisoAlTerminar; window.exAvisoAlTerminar=function(){ n++; EX_AVISO_USADO=false; return null; };
    try{
      EX_AVISO_USADO=false; EXIST_IMP=__imp(__X.IMN, [], '09:30:00'); existCancelar(); out.sinUsar=n;
      EX_AVISO_USADO=true; EXIST_IMP=__imp(__X.IMN, [], '09:30:00'); existCancelar(); out.usado=n;
    } finally { window.exAvisoAlTerminar=orig; }
    closeModal();
    return out;
  });
  chk('todo con stock y marcado: no sale nada', r.nada && r.nada.n===0 && r.nada.m===false, r.nada);
  chk('«Cancelar» sin haber usado ningún almacén: no avisa', r.sinUsar===0, r);
  chk('cortar el resto después de usar un almacén: avisa', r.usado===1, r);

  chk('sin errores en la página', errores.length===0, errores);
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
