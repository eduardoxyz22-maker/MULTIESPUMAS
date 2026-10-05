/* ✅ CIERRE DE ENTREGAS (§4hn, etapa 1 — 05/10/2026). El dueño: logística se olvida de marcar las entregas una
   por una. Codex (PDF del 05/10): a las 16:30 una lista con los pedidos del día tildados como propuesta; se destilda lo
   que no salió y se confirma todo junto; abrir no escribe; se relee la planilla antes de confirmar; registro de quién y
   cuándo; los atrasados aparte y nunca por omisión; se puede repetir. Sin parciales por línea (dueño: «no pasa»).

   Reloj clavado en el miércoles 07/10/2026 (10:00 y 17:00 de Bolivia). Red cortada, servidor simulado, datos sintéticos.
   Se corre:  node tests/test_cierre_entregas.js
   Dientes contra el panel viejo:  PEDIDOS=/ruta/al/viejo.html node tests/test_cierre_entregas.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const J = (o) => JSON.stringify(o);
const MANANA_10 = '2026-10-07T10:00:00-04:00';
const TARDE_17  = '2026-10-07T17:00:00-04:00';

const BASE = `
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true; SERVER_AUTH='abierto';
  document.getElementById('admin-lock').style.display='none';
  document.getElementById('admin-content').style.display='block';
  try{ localStorage.removeItem(LS_PEND); localStorage.removeItem(LS_RECHAZOS); localStorage.removeItem('me_cierre_quien'); }catch(e){}
  if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  CARGA_GEN++; CARGA_ESTADO='ok'; NO_ENCOLAR={}; SAVE_ULTIMO={}; SAVE_REV={};
  window._saves=[];
  apiSave=function(rec, opts){ window._saves.push({rec:JSON.parse(JSON.stringify(rec)), opts:opts||null}); return Promise.resolve({ok:true, pedido:JSON.parse(JSON.stringify(rec))}); };
  /* La «planilla»: lo que la relectura devuelve. Por defecto, una copia de STATE. */
  window._planilla=null;
  apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(window._planilla||STATE))}); };
  window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(m)); return _t(m,k,ms); };
  window._P=function(o){ return Object.assign({id:'p'+Math.random().toString(36).slice(2),fecha:todayStr(),oc:'',vendedor:'Carola Chavez',
    cliente:'C',celular:'70000000',turno:'AM',zona:'Norte',direccion:'Av. Banzer 123',maps:'',pagado:false,saldo:0,
    ts:Date.now(),metodoPago:'',observaciones:'',estado:'',entregado:false,vehiculo:'Foton nuevo',chofer:'Luis Pierre',
    garantia:'',nota:'',acuenta:0,facturarA:'',nit:'',nroDia:1,verificado:true,fotos:[],
    productos:[{desc:'SOFT',medida:'140x190',cant:1,codigo:'CH1001'}]},o); };
  /* El escenario de siempre: hoy es el miércoles 07/10. */
  window._armar=function(){
    STATE=[];
    STATE.push(_P({id:'h1', oc:'10-001', cliente:'HOY AM', turno:'AM', nroDia:1}));
    STATE.push(_P({id:'h2', oc:'10-002', cliente:'HOY PM', turno:'PM', nroDia:2, productos:[{desc:'TITANIO',medida:'160x190',cant:2,codigo:'CH1220'},{desc:'ALMOHADA',cant:2}]}));
    STATE.push(_P({id:'h3', oc:'RPT 10-001', cliente:'Mia Plaza', zona:'Mia Plaza', turno:'AM', nroDia:3}));
    STATE.push(_P({id:'h4', oc:'10-004', cliente:'YA MARCADO', entregado:true}));
    STATE.push(_P({id:'m1', oc:'10-005', cliente:'MAÑANA', fecha:'2026-10-08'}));
    STATE.push(_P({id:'t1', oc:'10-006', cliente:'TIENDA', fecha:'', direccion:DIR_TIENDA, zona:ZONA_TIENDA}));
    STATE.push(_P({id:'k1', oc:'', cliente:'BORRADOR KOMMO', estado:BORRADOR_EST}));
    STATE.push(_P({id:'a1', oc:'10-007', cliente:'ATRASADO LUNES', fecha:'2026-10-05'}));
    STATE.push(_P({id:'a2', oc:'10-008', cliente:'ATRASADO VIEJO', fecha:'2026-09-10'}));   // 27 días: fuera de la ventana de 14
    STATE.push(_P({id:'__ret_x__', oc:'', cliente:'RETIRO', vendedor:'Carola Chavez'}));
    saveMirror();
  };
  window._ver=function(id){ var p=findById(id); if(!p) return null; var c=cierreEntDe(p); return { entregado:!!p.entregado, c:c, xs:(p.productos||[]).map(function(x){ return [x.eF||'', x.eQ||'', x.eT?1:0]; }) }; };
  window._modalTxt=function(){ var m=document.getElementById('modal'); return m && m.classList.contains('on') ? (m.innerText||'') : ''; };
  window._tildados=function(){ return Array.from(document.querySelectorAll('.cie-ent-chk')).map(function(c){ return [c.getAttribute('data-id'), c.checked]; }); };
`;

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const nueva = async (fixed, ancho) => {
    const page = await browser.newPage({ viewport:{width:ancho||1400,height:950}, timezoneId:'America/La_Paz' });
    page.on('pageerror', e=>errores.push(e.message));
    page.on('dialog', d=>d.accept());
    await page.route(/^https?:/, r=>r.abort());
    await page.clock.setFixedTime(new Date(fixed||TARDE_17));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    return page;
  };

  // ═══ 1. La lista: quién entra, quién no, y el cartel de las 16:30 ═══════════════════
  console.log('\n── 1. La lista de hoy y los atrasados; el cartel desde las 16:30 ──');
  {
    const page = await nueva(MANANA_10);
    const r = await page.evaluate((base) => {
      eval(base); _armar(); renderAdmin();
      var out={};
      out.existe = typeof abrirCierreEntregas==='function';
      out.boton = !!Array.from(document.querySelectorAll('button')).filter(function(b){ return /Cierre de entregas/.test(b.textContent); }).length;
      out.hoy = cierreEntHoy().map(function(p){ return p.id; });
      out.atr = cierreEntAtrasados().map(function(p){ return p.id; });
      out.esHora = cierreEntEsHora();
      out.cartel = (document.getElementById('adm-cierre-ent')||{}).innerText||'';
      return out;
    }, BASE);
    chk('el botón «✅ Cierre de entregas» está en Administración y las funciones existen', r.existe && r.boton, J([r.existe, r.boton]));
    chk('entran los de HOY sin marca (OC y RPT), ordenados AM → PM; no entran el ya marcado, el de mañana, la venta de tienda, el borrador de Kommo ni el retiro',
        J(r.hoy)===J(['h1','h3','h2']), J(r.hoy));
    chk('los atrasados van aparte: el del lunes sí, el de hace 27 días no (ventana de 14 días)', J(r.atr)===J(['a1']), J(r.atr));
    chk('a las 10:00 todavía no es hora: sin cartel en Administración', r.esHora===false && r.cartel==='', J([r.esHora, r.cartel]));
    await page.close();
  }
  {
    const page = await nueva(TARDE_17);
    const r = await page.evaluate((base) => {
      eval(base); _armar(); renderAdmin();
      var el=document.getElementById('adm-cierre-ent');
      return { esHora:cierreEntEsHora(), cartel:(el||{}).innerText||'', boton:!!(el && el.querySelector('button')) };
    }, BASE);
    chk('a las 17:00 el cartel cuenta los de hoy sin confirmar (3) y el atrasado (1), con botón para hacer el cierre',
        r.esHora===true && /3 pedidos de hoy sin confirmar/.test(r.cartel) && /1 atrasado/.test(r.cartel) && r.boton, J(r));
    await page.close();
  }

  // ═══ 2. Abrir no escribe nada; destildar y confirmar ═════════════════════════════════
  console.log('\n── 2. Abrir no escribe; destildar uno y confirmar los otros ──');
  {
    const page = await nueva(TARDE_17);
    const r = await page.evaluate(async (base) => {
      eval(base); _armar(); renderAdmin();
      var out={};
      var antes=JSON.stringify(STATE);
      abrirCierreEntregas();
      out.abierto=_modalTxt();
      out.tildados=_tildados();
      out.sinEscribir = window._saves.length===0 && JSON.stringify(STATE)===antes;
      // sin nombre no confirma
      document.getElementById('cie-ent-quien').value='';
      await confirmarCierreEntregas();
      out.sinQuien = { saves:window._saves.length, toast:window._toasts.slice(-1)[0]||'' };
      // destildo «HOY PM» (no salió) y confirmo
      var chk=document.querySelector('.cie-ent-chk[data-id="h2"]'); chk.checked=false; chk.dispatchEvent(new Event('change'));
      out.botonTxt=document.getElementById('cie-ent-confirmar').textContent;
      document.getElementById('cie-ent-quien').value='Marisol';
      var res=await confirmarCierreEntregas();
      out.res=res;
      out.h1=_ver('h1'); out.h2=_ver('h2'); out.h3=_ver('h3'); out.a1=_ver('a1');
      out.saves=window._saves.map(function(s){ return s.rec.id; });
      out.quien=cierreEntQuien();
      out.resultado=_modalTxt();
      out.quedan=cierreEntHoy().map(function(p){ return p.id; });
      return out;
    }, BASE);
    chk('abrir la lista muestra los 3 de hoy tildados y el atrasado destildado, y NO escribe nada',
        J(r.tildados)===J([['h1',true],['h3',true],['h2',true],['a1',false]]) && r.sinEscribir, J([r.tildados, r.sinEscribir]));
    chk('sin «quién cierra» no confirma y lo dice', r.sinQuien.saves===0 && /quién/i.test(r.sinQuien.toast), J(r.sinQuien));
    chk('destildar uno actualiza el botón: «Confirmar 2 entregas»', /Confirmar 2 entregas/.test(r.botonTxt), r.botonTxt);
    chk('los dos tildados quedan entregados con el registro en cada producto (día de hoy, quién, cuándo)',
        r.h1.entregado && r.h3.entregado && r.h1.c && r.h1.c.f==='2026-10-07' && r.h1.c.q==='Marisol' && r.h1.c.t>0 &&
        J(r.h1.xs)===J([['2026-10-07','Marisol',1]]), J([r.h1, r.h3]));
    chk('el destildado sigue pendiente, sin registro, igual que el atrasado', !r.h2.entregado && !r.h2.c && J(r.h2.xs)===J([['','',0],['','',0]]) && !r.a1.entregado, J([r.h2, r.a1]));
    chk('se guardó exactamente UNA vez cada confirmado (h1, h3) y nada más', J(r.saves.slice().sort())===J(['h1','h3']), J(r.saves));
    chk('quién cierra queda recordado en el aparato', r.quien==='Marisol', r.quien);
    chk('la respuesta dice 2 confirmadas y 0 salteadas, y la ventana de resultado lo cuenta', r.res && r.res.hechos===2 && r.res.saltados===0 && /2 entregas confirmadas/.test(r.resultado), J([r.res && [r.res.hechos, r.res.saltados], r.resultado.slice(0,120)]));
    chk('repetir: queda solo el destildado para después', J(r.quedan)===J(['h2']), J(r.quedan));
    await page.close();
  }

  // ═══ 3. Revalidar antes de confirmar: lo que cambió en la planilla no se marca ══════
  console.log('\n── 3. La relectura manda: reprogramado, borrado y ya marcado se saltean ──');
  {
    const page = await nueva(TARDE_17);
    const r = await page.evaluate(async (base) => {
      eval(base); _armar(); renderAdmin();
      abrirCierreEntregas();
      /* Mientras la lista está abierta, otro equipo: reprograma h1 al jueves, borra h3 y marca h2 entregado. */
      var pl=JSON.parse(JSON.stringify(STATE));
      pl.forEach(function(p){ if(p.id==='h1'){ p.fecha='2026-10-08'; p.rev=9; } if(p.id==='h2'){ p.entregado=true; p.rev=9; } });
      pl=pl.filter(function(p){ return p.id!=='h3'; });
      window._planilla=pl;
      document.getElementById('cie-ent-quien').value='Marisol';
      var res=await confirmarCierreEntregas();
      return { res:res, h1:_ver('h1'), h2:_ver('h2'), h3:_ver('h3'), saves:window._saves.map(function(s){ return s.rec.id; }), txt:_modalTxt(), fechaH1:(findById('h1')||{}).fecha };
    }, BASE);
    chk('ninguno se marcó desde acá: 0 confirmadas, 3 salteadas, 0 guardados', r.res && r.res.hechos===0 && r.res.saltados===3 && r.saves.length===0, J([r.res && [r.res.hechos, r.res.saltados], r.saves]));
    chk('el reprogramado sigue sin marca y con la fecha nueva; el borrado ya no está; el que marcó otro equipo quedó como lo dejó él (sin registro de acá)',
        r.h1 && !r.h1.entregado && r.fechaH1==='2026-10-08' && r.h3===null && r.h2 && r.h2.entregado && !r.h2.c, J([r.h1, r.fechaH1, r.h3, r.h2]));
    chk('la ventana de resultado dice por qué cada uno', /reprogramaron para el 08\/10\/2026/.test(r.txt) && /lo borraron/.test(r.txt) && /ya lo marcó otro equipo/.test(r.txt), r.txt.slice(0,300));
    await page.close();
  }

  // ═══ 4. Atrasado tildado con su día; ATC en devolución; sin señal ═══════════════════
  console.log('\n── 4. Un atrasado tildado dice qué día se entregó; la ATC se cierra; sin señal queda en cola ──');
  {
    const page = await nueva(TARDE_17);
    const r = await page.evaluate(async (base) => {
      eval(base); _armar();
      /* Una ATC con la devolución programada para HOY (vive en su día de devolución). */
      STATE.push(_P({id:'atc1', oc:'ATC 10-001', cliente:'DEVOLUCION', fecha:'2026-10-07', productos:[{desc:'SOFT',medida:'140x190',cant:1,atc:{mot:'Hundimiento', pdev:'2026-10-07', pturno:'AM', rf:'2026-10-06'}}]}));
      saveMirror(); renderAdmin();
      abrirCierreEntregas();
      var out={};
      out.enLista = _tildados().map(function(t){ return t[0]; });
      // tildo el atrasado y digo que se entregó el martes 06
      var c=document.querySelector('.cie-ent-chk[data-id="a1"]'); c.checked=true; c.dispatchEvent(new Event('change'));
      var d=document.querySelector('.cie-ent-dia[data-id="a1"]'); d.value='2026-10-06'; d.dispatchEvent(new Event('change'));
      document.getElementById('cie-ent-quien').value='Marisol';
      var res=await confirmarCierreEntregas();
      out.res=res;
      out.a1=_ver('a1');
      var atc=findById('atc1'); out.atc={ entregado:!!atc.entregado, ent:(atcDe(atc)||{}).ent||'', estado:atcEstado(atc) };
      return out;
    }, BASE);
    chk('la ATC en su día de devolución entra a la lista de hoy', r.enLista.indexOf('atc1')>=0, J(r.enLista));
    chk('el atrasado tildado queda entregado con el día elegido (06/10), no con hoy', r.a1.entregado && r.a1.c && r.a1.c.f==='2026-10-06', J(r.a1));
    chk('la ATC confirmada queda cerrada (el ✅ anota la devolución como siempre)', r.atc.entregado && r.atc.ent==='2026-10-07' && r.atc.estado==='cerrada', J(r.atc));
    await page.close();
  }
  {
    const page = await nueva(TARDE_17);
    const r = await page.evaluate(async (base) => {
      eval(base); _armar(); renderAdmin();
      apiList=function(){ return Promise.reject(new TypeError('Failed to fetch')); };
      apiSave=function(){ return Promise.reject(new TypeError('Failed to fetch')); };
      abrirCierreEntregas();
      document.getElementById('cie-ent-quien').value='Marisol';
      var res=await confirmarCierreEntregas();
      await new Promise(function(r){ setTimeout(r,200); });
      return { res:res, h1:_ver('h1'), cola:getPending().map(function(q){ return q.id; }).sort(), txt:_modalTxt(), toasts:window._toasts.filter(function(t){ return /NO se guardó/.test(t); }).length };
    }, BASE);
    chk('sin señal: se confirma con la copia de acá, se avisa que no se releyó, y los 3 quedan en la cola durable',
        r.res && r.res.hechos===3 && r.res.leyo===false && /No se pudo releer/.test(r.txt) && J(r.cola)===J(['h1','h2','h3']) && r.h1.entregado, J([r.res && [r.res.hechos, r.res.leyo], r.cola]));
    await page.close();
  }

  // ═══ 5. La ficha muestra quién confirmó ═══════════════════════════════════════════════
  console.log('\n── 5. La ficha del pedido dice quién lo confirmó y cuándo ──');
  {
    const page = await nueva(TARDE_17);
    const r = await page.evaluate(async (base) => {
      eval(base); _armar(); renderAdmin();
      abrirCierreEntregas();
      document.getElementById('cie-ent-quien').value='Marisol';
      await confirmarCierreEntregas();
      closeModal(); showPedidoModal('h1');
      var t=_modalTxt();
      return { ficha:t, dice:/confirmado por Marisol el 2026-10-07 17:00/.test(t) };
    }, BASE);
    chk('«confirmado por Marisol el 2026-10-07 17:00 · entrega del 07/10» en la ficha', r.dice && /entrega del 07\/10/.test(r.ficha), (r.ficha.match(/confirmado[^\n]*/)||[''])[0]);
    await page.close();
  }

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
