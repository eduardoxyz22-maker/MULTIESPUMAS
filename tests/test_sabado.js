/* 📅 SÁBADO: «MAÑANA» ES EL LUNES, NO EL DOMINGO (§4ex, §4er Entregas BAJA).

   El domingo no se entrega (el panel lo sabe: cupo 0, no se agenda). Pero `tomorrowStr()` no lo
   saltaba, y un sábado a la tarde el chofer, la lista de carga, la hoja de ruta, el mapa, los
   faltantes, el parte y el WhatsApp «pedidos de mañana» miraban el domingo: «No tenés entregas
   para mañana», «0 pedidos», «Todavía no hay pedidos cargados» — con dos entregas el lunes.
   Ahora `proximoDiaEntrega()` = mañana, y si es domingo, el lunes. El FORMULARIO no cambia
   (su mínimo sigue siendo mañana: el domingo lo frena el portero), ni el cierre de días, ni la
   recogida de Moreno, ni el importador de ROHO.

   Reloj clavado en el sábado 19/09/2026 18:00 (hora Bolivia) y, de control, en un martes.
   Se corre:  node tests/test_sabado.js
   Dientes contra el panel viejo:  PEDIDOS=/ruta/al/viejo.html node tests/test_sabado.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const J = (o) => JSON.stringify(o);

const ARMAR = `
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true;
  document.getElementById('admin-lock').style.display='none';
  document.getElementById('admin-content').style.display='block';
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
  CARGA_GEN++; CARGA_ESTADO='ok';
  apiSave=function(rec){ return Promise.resolve({ok:true, pedido:JSON.parse(JSON.stringify(rec))}); };
  apiList=function(){ return Promise.resolve({ok:true, pedidos:JSON.parse(JSON.stringify(STATE))}); };
  var ts=Date.now();
  window.pedidoEl=function(id, fecha, extra){ return Object.assign({ id:id, oc:'', fecha:fecha, turno:'AM', zona:'Norte', ts:ts, chofer:'', vehiculo:'', vendedor:'Carola Chavez', cliente:'CLIENTE '+id,
    celular:'70000001', direccion:'Av. X', maps:'', acuenta:0, saldo:500, pagado:false, entregado:false, metodoPago:'', productos:[{desc:'SOFT',cant:1}], fotos:[], nota:'1', verificado:true }, extra||{}); };
`;

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const nueva = async (fixed) => {
    const page = await browser.newPage({ viewport:{width:1300,height:900}, timezoneId:'America/La_Paz' });
    page.on('pageerror', e=>errores.push(e.message));
    page.on('dialog', d=>d.accept());
    await page.route(/^https?:/, r=>r.abort());
    await page.clock.setFixedTime(new Date(fixed));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    return page;
  };

  console.log('\n── Sábado 19/09/2026 a las 18:00, con dos entregas el lunes 21 ──');
  {
    const page = await nueva('2026-09-19T18:00:00-04:00');
    const r = await page.evaluate(async (armar) => {
      eval(armar);
      var lunes='2026-09-21';
      STATE=[ pedidoEl('l1', lunes, { chofer:'Luis Pierre', vehiculo:'Foton nuevo', turno:'AM' }),
              pedidoEl('l2', lunes, { turno:'PM', vendedor:'Maria Flores', saldo:0, pagado:true }) ];
      saveMirror(); updateStats();
      var out={ hoy:todayStr(), dow:new Date().getDay(), manana:tomorrowStr(), prox:(typeof proximoDiaEntrega==='function')?proximoDiaEntrega():'(no existe)' };
      showView('chofer'); llenarSelectChoferes(); document.getElementById('cho-nombre').value='Luis Pierre'; setChoFiltro('manana');
      await new Promise(r=>setTimeout(r,80));
      out.choferVacio=(document.getElementById('cho-empty')||{}).textContent||'';
      out.choferLista=(document.getElementById('cho-lista')||{}).textContent.replace(/\s+/g,' ');
      out.choferChips=[].map.call(document.querySelectorAll('#cho-chips .qchip'),function(b){ return b.textContent.replace(/\s+/g,' ').trim(); }).join(' | ');
      showView('mis'); MIS_TODOS=true; setMisFiltro('manana'); await new Promise(r=>setTimeout(r,80));
      out.misChips=[].map.call(document.querySelectorAll('#mis-chips .qchip'),function(b){ return b.textContent.replace(/\s+/g,' ').trim(); }).join(' | ');
      showView('admin'); await new Promise(r=>setTimeout(r,80));
      abrirCarga(); setCargaDia('manana'); out.carga=(document.getElementById('carga-info')||{}).textContent; closeCarga();
      abrirRuta(); setRutaDia('manana'); out.ruta=(document.getElementById('ruta-info')||{}).textContent; closeRuta();
      abrirFaltantes(); setFaltDia('manana'); out.falt=(document.getElementById('falt-info')||{}).textContent; closeFaltantes();
      out.envio=envioTexto('manana').split('\n').slice(0,3).join(' / ');
      out.parte=parteText().split('\n').filter(function(l){ return /Mañana|mañana/.test(l); }).join(' / ');
      out.exportManana=exportScopeInfo('manana').list.length;
      MAPA_DIA='manana'; out.mapa=STATE.filter(mapaEntra).length;
      out.stat=(document.getElementById('stat-hoy-l')||{}).innerHTML||'';
      return out;
    }, ARMAR);
    chk('el reloj está en sábado: «mañana» del calendario es domingo 20, el próximo día de entrega es el lunes 21', r.dow===6 && r.manana==='2026-09-20' && r.prox==='2026-09-21', J([r.dow, r.manana, r.prox]));
    chk('⚠️ el chofer ve su entrega del lunes en «Mañana» (antes: «No tenés entregas para mañana (20/09/2026)»)', /CLIENTE l1/.test(r.choferLista) && !/No tenés entregas para mañana/.test(r.choferVacio) && /Mañana 1/.test(r.choferChips), r.choferVacio+' · '+r.choferChips);
    chk('…y «Mis pedidos» también cuenta los del lunes en «Mañana»', /Mañana 2/.test(r.misChips), r.misChips);
    chk('⚠️ la lista de carga «Mañana» trae los 2 del lunes con su fecha', /2 pedidos/.test(r.carga) && /21\/09\/2026/.test(r.carga), r.carga);
    chk('⚠️ la hoja de ruta «Mañana» también', /^2 pedidos/.test(r.ruta) || /2 pedidos/.test(r.ruta), r.ruta);
    chk('…y los faltantes', /21\/09\/2026/.test(r.falt), r.falt);
    chk('⚠️ «Pedidos de mañana» para el grupo dice el lunes y lista las entregas (antes: «domingo 20/09 … Todavía no hay pedidos»)', /lunes 21\/09\/2026/i.test(r.envio) && !/Todavía no hay pedidos/.test(r.envio), r.envio);
    chk('el parte del día cuenta lo del lunes como «mañana»', /2/.test(r.parte), r.parte);
    chk('el Excel «Mañana» y el mapa «Mañana» también van al lunes', r.exportManana===2 && r.mapa===2, J([r.exportManana, r.mapa]));
    chk('las estadísticas muestran los cupos del LUNES y lo dicen (antes: «Mañana: domingo (cerrado)»)', /Cupos el lunes 21\/09\/2026/.test(r.stat) && /🌅11/.test(r.stat), r.stat);
    await page.close();
  }
  console.log('\n── Control: un martes cualquiera, «mañana» sigue siendo mañana; el formulario no cambia ──');
  {
    const page = await nueva('2026-09-22T18:00:00-04:00');
    const r = await page.evaluate((armar) => {
      eval(armar);
      STATE=[ pedidoEl('m1', '2026-09-23', { chofer:'Luis Pierre', vehiculo:'Foton nuevo' }) ];
      saveMirror(); updateStats();
      var out={ manana:tomorrowStr(), prox:proximoDiaEntrega(), exportManana:exportScopeInfo('manana').list.length };
      resetForm(); out.formMin=document.getElementById('f-fecha').min;
      return out;
    }, ARMAR);
    chk('un martes: próximo día de entrega = mañana (miércoles 23)', r.manana==='2026-09-23' && r.prox==='2026-09-23' && r.exportManana===1, J(r));
    chk('el mínimo del formulario sigue siendo «mañana» a secas (el domingo lo frena el portero)', r.formMin==='2026-09-23', r.formMin);
    await page.close();
  }
  {
    const page = await nueva('2026-09-19T18:00:00-04:00');
    const r = await page.evaluate((armar) => { eval(armar); resetForm(); return { formMin:document.getElementById('f-fecha').min, prox:proximoDiaEntrega() }; }, ARMAR);
    chk('…y un sábado el formulario sigue con mínimo domingo (no se agenda igual: portero) mientras las entregas miran el lunes', r.formMin==='2026-09-20' && r.prox==='2026-09-21', J(r));
    await page.close();
  }

  chk('sin errores JS', errores.length===0, J(errores));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
