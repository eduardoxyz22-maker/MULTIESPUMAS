/* 🎧📋 TERCERA REVISIÓN: 🎧 ATC Y 📋 MIS PEDIDOS (26/09/2026) — lo que había quedado reportado en
   §4gb y en las revisiones de esas dos pestañas. Cada sección dice qué pasaba.

   Reloj clavado en el miércoles 23/09/2026 10:00 de Bolivia: las fechas no se pudren.
   Red cortada, servidor simulado, datos sintéticos (el repo es público).
   Se corre:  node tests/test_rev3_atc_mis.js          (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/al/viejo/pedidos.html node tests/test_rev3_atc_mis.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,300)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const J = (o) => JSON.stringify(o);
const MIERCOLES = '2026-09-23T10:00:00-04:00';

const BASE = `
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true; SERVER_AUTH='abierto';
  document.getElementById('admin-lock').style.display='none';
  document.getElementById('admin-content').style.display='block';
  try{ localStorage.removeItem(LS_PEND); localStorage.removeItem(LS_RECHAZOS); }catch(e){}
  if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  CARGA_GEN++; CARGA_ESTADO='ok'; NO_ENCOLAR={}; SAVE_ULTIMO={}; SAVE_REV={};
  window._saves=[];
  apiSave=function(rec, opts){ window._saves.push({rec:JSON.parse(JSON.stringify(rec)), opts:opts||null}); return Promise.resolve({ok:true, pedido:JSON.parse(JSON.stringify(rec))}); };
  apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
  window._P=function(o){ return Object.assign({id:'p'+Math.random().toString(36).slice(2),fecha:todayStr(),oc:'',vendedor:'Carola Chavez',
    cliente:'C',celular:'70000000',turno:'AM',zona:'Norte',direccion:'Av. Banzer 123',maps:'https://www.google.com/maps?q=-17.7,-63.1',pagado:false,saldo:0,
    ts:Date.parse('2026-09-20T10:00:00-04:00'),metodoPago:'',observaciones:'',estado:'',entregado:false,vehiculo:'Foton nuevo',chofer:'Luis Pierre',
    garantia:'',nota:'',acuenta:0,facturarA:'',nit:'',nroDia:1,verificado:true,fotos:[]},o); };
  /* Una ATC: el recojo en su día y turno, y lo que diga \`atc\`. */
  window._atc=function(id, fecha, turno, entregado, atc){
    STATE=STATE.filter(function(p){ return p.id!==id; });
    STATE.push(_P({id:id, oc:'ATC 09-0'+id.length+id.charCodeAt(0), fecha:fecha, turno:turno, entregado:!!entregado, cliente:'CLIENTE '+id,
      productos:[{desc:'SOFT', medida:'140x190', cant:1, atc:Object.assign({mot:'Hundimiento'}, atc||{})}]}));
    saveMirror();
    return findById(id);
  };
  /* «🔁 Programar devolución» con el botón de siempre. */
  window._programar=function(id, fecha, turno){
    abrirProgramarDevAtc(id);
    document.getElementById('pdev-fecha').value=fecha; segSet('pdev-turno', turno);
    guardarProgramarDevAtc(id);
    return findById(id);
  };
  window._ver=function(id){ var p=findById(id), a=atcDe(p)||{};
    return { fecha:p.fecha, turno:p.turno||'', entregado:!!p.entregado, pdev:a.pdev||'', ent:a.ent||'',
             recojo:atcRecogida(p), estado:atcEstado(p), chip:atcChip(p).replace(/<[^>]+>/g,'') }; };
  window._ultimo=function(){ var s=window._saves[window._saves.length-1]; if(!s) return null; var a=atcDe(s.rec)||{};
    return { fecha:s.rec.fecha, turno:s.rec.turno||'', rec:a.rec||'', pdev:a.pdev||'', forzar:!!(s.opts&&s.opts.forzar) }; };
  /* La celda «🚚 Recojo» de la matriz de ATC, como la ve logística. */
  window._celdaRecojo=function(id){
    showViewAhora('atc'); segSet('atc-mode','todo'); renderAtc();
    var th=[].map.call(document.querySelectorAll('#tbl-atc thead th'), function(x){ return x.textContent.trim(); });
    var col=th.indexOf('🚚 Recojo'), cli='CLIENTE '+id;
    var fila=[].filter.call(document.querySelectorAll('#tbl-atc tbody tr'), function(tr){ return tr.textContent.indexOf(cli)>=0; })[0];
    return fila ? fila.children[col].textContent.trim() : '(no está)';
  };
`;

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const nueva = async (fixed, ancho) => {
    const page = await browser.newPage({ viewport:{width:ancho||1400,height:950}, timezoneId:'America/La_Paz' });
    page.on('pageerror', e=>errores.push(e.message));
    page.on('dialog', d=>{ if(d.type()==='prompt') d.accept('300'); else d.accept(); });
    await page.route(/^https?:/, r=>r.abort());
    await page.clock.setFixedTime(new Date(fixed||MIERCOLES));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    return page;
  };

  // ═══ 1. «↺ Quitar la devolución» devuelve el recojo con SU turno, y sin `rec` viejo ═══
  /* Ponía `turno=''` (el recojo de la TARDE volvía como de la mañana: el cupo lo contaba en AM) y
     dejaba `a.rec` puesto, así que si después se movía el recojo con 📅, la matriz seguía mostrando el
     día viejo y lo daba por recogido. Ahora el turno del recojo se guarda al programar (`rturno`,
     adentro del JSON de la ATC, sin columna nueva) y vuelve al quitar; `rec` se borra al quitar, y
     una fila que ya quedó con `rec` suelto (sin devolución) se lee por su fecha. */
  console.log('\n── 1. 🔁 Quitar la devolución: el recojo vuelve con su turno y la matriz sigue a la fecha ──');
  {
    const page = await nueva();
    const r = await page.evaluate(async (base) => {
      eval(base);
      STATE=[]; var out={};
      // (a) El recojo es HOY a la TARDE y el chofer no lo tildó; confirman «ya lo recogieron» y se programa
      //     la devolución para el lunes 28 AM. Después se dan cuenta de que era un error y la quitan.
      _atc('a1','2026-09-23','PM', false);
      _programar('a1','2026-09-28','AM');
      out.programada=_ver('a1');
      window._saves=[];
      quitarProgramarDevAtc('a1');
      out.quitada=_ver('a1'); out.mandado=_ultimo();
      out.cupoPM=cuposUsadosTurno('2026-09-23','PM'); out.cupoAM=cuposUsadosTurno('2026-09-23','AM');
      // …el chofer no había ido: destilda el ✅ y logística mueve el recojo con 📅 al jueves 24 PM
      choEntregado('a1');
      MODAL_KIND='carga'; reprogramarPedido('a1'); REPRO.fecha='2026-09-24'; REPRO.turno='PM'; reproConfirmar();
      out.movida=_ver('a1');
      out.celda=_celdaRecojo('a1');
      // (b) «🔁 Cambiar devolución» sobre una ya programada NO pisa el turno del recojo con el de la devolución
      _atc('b1','2026-09-21','PM', true);
      _programar('b1','2026-09-28','AM');
      _programar('b1','2026-09-29','AM');
      quitarProgramarDevAtc('b1');
      out.cambiada=_ver('b1');
      // (c) una fila que ya quedó así (quitada con el panel de antes y el recojo movido al martes 22 con 📅):
      //     `rec` suelto con el día viejo y sin devolución
      _atc('c1','2026-09-22','PM', true, {rec:'2026-09-21'});
      out.vieja={ recojo:atcRecogida(findById('c1')), celda:_celdaRecojo('c1') };
      _programar('c1','2026-09-28','AM');
      out.viejaProg=(atcDe(findById('c1'))||{}).rec||'';
      quitarProgramarDevAtc('c1');
      out.viejaQuitada=_ver('c1');
      // (d) el turno del recojo se llenó mientras la ATC estaba en su devolución: quitarla va con `forzar`
      //     (el recojo ya pasó: no le suma un bulto a ningún camión)
      _atc('d1','2026-09-23','PM', true);
      _programar('d1','2026-09-28','AM');
      for(var i=0;i<13;i++) STATE.push(_P({id:'lleno'+i, fecha:'2026-09-23', turno:'PM', cliente:'LLENO '+i, productos:[{desc:'X',cant:1}]}));
      window._saves=[];
      quitarProgramarDevAtc('d1');
      out.llena=_ultimo();
      // (e) control: una ATC que todavía es el RECOJO (sin devolución) se sigue leyendo por su fecha
      _atc('e1','2026-09-25','AM', false);
      out.recojo=_ver('e1');
      return out;
    }, BASE);
    chk('punto de partida: programada, la ATC vive en el lunes 28 AM', r.programada.fecha==='2026-09-28' && r.programada.turno==='AM' && r.programada.pdev==='2026-09-28', J(r.programada));
    chk('⚠️ quitarla vuelve al recojo de HOY con su turno de la TARDE (antes: turno vacío = AM)',
        r.quitada.fecha==='2026-09-23' && r.quitada.turno==='PM' && r.quitada.pdev==='' && r.quitada.entregado===true, J(r.quitada));
    chk('⚠️ …y a la planilla va con el turno PM y sin el `rec` viejo', r.mandado && r.mandado.turno==='PM' && r.mandado.rec==='' && r.mandado.pdev==='', J(r.mandado));
    chk('⚠️ …y el cupo la cuenta en la TARDE, no en la mañana', r.cupoPM===1 && r.cupoAM===0, J([r.cupoPM, r.cupoAM]));
    chk('⚠️ movido el recojo con 📅 al jueves 24, la ATC dice ese día (antes seguía en el 23, el `rec` viejo)',
        r.movida.fecha==='2026-09-24' && r.movida.recojo==='2026-09-24', J(r.movida));
    chk('⚠️ …y vuelve a «🚚 Por recoger»: el recojo nuevo no pasó (antes «🏭 En fábrica»)', r.movida.estado==='sinrecoger', r.movida.estado);
    chk('⚠️ …y la matriz lo muestra en la columna «🚚 Recojo»', r.celda==='24/09', r.celda);
    chk('⚠️ «Cambiar devolución» y después quitarla: vuelve al recojo del lunes 21 con SU turno (PM), no el de la devolución',
        r.cambiada.fecha==='2026-09-21' && r.cambiada.turno==='PM' && r.cambiada.pdev==='', J(r.cambiada));
    chk('⚠️ una fila con `rec` suelto (quitada con el panel de antes) se lee por su fecha: martes 22, no lunes 21',
        r.vieja.recojo==='2026-09-22' && r.vieja.celda==='22/09', J(r.vieja));
    chk('⚠️ …programarle la devolución guarda el recojo de verdad (22), y quitarla vuelve al 22 PM',
        r.viejaProg==='2026-09-22' && r.viejaQuitada.fecha==='2026-09-22' && r.viejaQuitada.turno==='PM', J([r.viejaProg, r.viejaQuitada]));
    chk('⚠️ con el turno del recojo lleno (13 de 13), quitarla va con `forzar` y con su turno (si no, el portero contesta «turno lleno»)',
        r.llena && r.llena.forzar===true && r.llena.turno==='PM' && r.llena.fecha==='2026-09-23', J(r.llena));
    chk('control: una ATC que todavía es el recojo se lee por su fecha y sigue «🚚 Por recoger»',
        r.recojo.recojo==='2026-09-25' && r.recojo.estado==='sinrecoger' && !/devolución/.test(r.recojo.chip), J(r.recojo));
    await page.close();
  }

  chk('sin errores JS', errores.length===0, J(errores));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
