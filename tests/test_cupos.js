/* 🎟️ LOS CUPOS DEL CAMIÓN (§4fh)
   *«edité un pedido, le puse fecha 24 y NO LIBERÓ EL ESPACIO DEL 23»* (dueño, 22/09).
   El cupo se cuenta por FECHA **y TURNO**, así que mover un pedido de la mañana no
   destraba la tarde; y el cartel decía un número pelado, sin forma de ver quién lo ocupa.
   Acá se fija la regla —qué cuenta y qué no— y que la lista nueva dice la verdad. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,extra)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, extra!=null?('· '+extra):''); };
const J=x=>JSON.stringify(x);

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1500,height:1000}, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror',e=>errores.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.route(/^https?:/, r=>r.abort());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(350);

  await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    CARGA_GEN++; CARGA_ESTADO='ok';
    if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; }
    if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
    apiSave=function(){ return Promise.resolve({ok:true}); };
    apiList=function(){ return Promise.resolve({ok:true, pedidos:JSON.parse(JSON.stringify(STATE))}); };
    /* Un MIÉRCOLES, para que valgan los límites de todos los días (12 AM / 13 PM) y no
       los del sábado. Se busca uno adelante, así nunca cae en un día ya pasado. */
    var d=new Date(); d.setHours(12,0,0,0);
    while(d.getDay()!==3) d.setDate(d.getDate()+1);
    window.MIE=isoLocal(d);
    var d2=new Date(d); d2.setDate(d2.getDate()+1); window.JUE=isoLocal(d2);
    window.P=function(o){
      var b={ turno:'AM', celular:'7', nit:'1', zona:'Norte', direccion:'X', maps:'', observaciones:'',
              estado:'', entregado:false, vendedor:'Carola Chavez', chofer:'', nroDia:1, fotos:[],
              acuenta:0, saldo:0, pagado:false, metodoPago:'', productos:[{desc:'A',cant:1,precio:10}] };
      var q={}; for(var k in b) q[k]=b[k]; for(var k2 in o) q[k2]=o[k2]; return q;
    };
  });

  // ---------- 1. la regla: fecha Y turno ----------
  let r = await page.evaluate(() => {
    STATE=[];
    for(var i=0;i<12;i++) STATE.push(P({id:'am'+i, oc:'09-1'+i, nota:'1'+i, cliente:'AM '+i, fecha:MIE, turno:'AM', nroDia:i+1}));
    for(var j=0;j<5;j++)  STATE.push(P({id:'pm'+j, oc:'09-2'+j, nota:'2'+j, cliente:'PM '+j, fecha:MIE, turno:'PM', nroDia:j+1}));
    return { am:cuposUsadosTurno(MIE,'AM'), pm:cuposUsadosTurno(MIE,'PM'),
             limAM:limTurno(MIE,'AM'), limPM:limTurno(MIE,'PM') };
  });
  chk('el turno AM cuenta solo los AM', r.am===12 && r.pm===5, J(r));
  chk('  y los límites del día hábil son 12 / 13', r.limAM===12 && r.limPM===13, J(r));

  // ---------- 2. mover un pedido de día SÍ libera el cupo ----------
  r = await page.evaluate(() => {
    var p=findById('am0');
    var antes=cuposUsadosTurno(MIE,'AM');
    p.fecha=JUE; upsert(p);
    return { antes:antes, despues:cuposUsadosTurno(MIE,'AM'), destino:cuposUsadosTurno(JUE,'AM') };
  });
  chk('§4fh · mover un pedido al día siguiente LIBERA el cupo del día viejo', r.antes===12 && r.despues===11, J(r));
  chk('  …y lo ocupa en el nuevo', r.destino===1, J(r));

  // ---------- 3. mover de AM a PM libera AM, no al revés ----------
  r = await page.evaluate(() => {
    var p=findById('am1'); p.turno='PM'; upsert(p);
    return { am:cuposUsadosTurno(MIE,'AM'), pm:cuposUsadosTurno(MIE,'PM') };
  });
  chk('§4fh · pasar un pedido de AM a PM descuenta de AM y suma en PM', r.am===10 && r.pm===6, J(r));

  // ---------- 4. lo que NO ocupa cupo ----------
  r = await page.evaluate(() => {
    var antes=cuposUsadosTurno(MIE,'AM');
    STATE.push(P({id:'tienda', oc:'09-900', nota:'900', cliente:'VENTA DE TIENDA', fecha:'', turno:'AM'}));
    STATE.push(P({id:'__ret_1__', oc:'', nota:'', cliente:'RETIRO', fecha:'', turno:''}));
    STATE.push(P({id:'kommo-123', oc:'', nota:'', cliente:'BORRADOR KOMMO', fecha:'', turno:'', estado:BORRADOR_EST}));
    return { antes:antes, despues:cuposUsadosTurno(MIE,'AM') };
  });
  chk('§4fh · lo que no lleva fecha (tienda, retiros, borradores de Kommo) no ocupa cupo', r.antes===r.despues, J(r));

  // ---------- 5. el cartel y la lista nueva ----------
  r = await page.evaluate(() => {
    STATE=[];
    for(var i=0;i<12;i++) STATE.push(P({id:'x'+i, oc:'09-3'+i, nota:'3'+i, cliente:'CLIENTE '+i, fecha:MIE, turno:'AM', nroDia:i+1}));
    STATE.push(P({id:'p1', oc:'09-400', nota:'400', cliente:'EL DE LA TARDE', fecha:MIE, turno:'PM', nroDia:1}));
    showView('form');
    document.getElementById('f-fecha').value=MIE;
    segSet('f-turno','AM');
    renderCupoForm();
    var cartel=document.getElementById('cupo-form');
    var out={ lleno:/Turno AM lleno/.test(cartel.textContent), texto:cartel.textContent.replace(/\s+/g,' ').trim(),
              hayBoton:/Ver los 12 pedidos del turno AM/.test(cartel.textContent) };
    verCuposTurno(MIE,'AM');
    var modal=document.getElementById('modal-box');
    out.modalAbre=document.getElementById('modal').classList.contains('on');
    out.modalTxt=modal.textContent.replace(/\s+/g,' ').trim();
    out.lista=cuposDelTurno(MIE,'AM').map(function(p){ return p.cliente; });
    out.listaPM=cuposDelTurno(MIE,'PM').map(function(p){ return p.cliente; });
    closeModal();
    // ahora con el turno PM elegido: hay lugar, pero el botón tiene que estar igual
    segSet('f-turno','PM'); renderCupoForm();
    out.pmTexto=document.getElementById('cupo-form').textContent.replace(/\s+/g,' ').trim();
    return out;
  });
  chk('el cartel avisa que el turno AM está lleno', r.lleno===true, r.texto.slice(0,90));
  chk('§4fh · y ofrece VER los 12 pedidos que lo ocupan', r.hayBoton===true, r.texto.slice(0,140));
  chk('§4fh · la lista abre y son exactamente los del turno AM', r.modalAbre===true && r.lista.length===12 && r.lista.indexOf('EL DE LA TARDE')<0, J(r.lista.slice(0,3))+' … '+r.lista.length);
  chk('  …y el de la tarde está en la lista de PM, no en la de AM', J(r.listaPM)===J(['EL DE LA TARDE']), J(r.listaPM));
  chk('§4fh · la lista explica que el cupo va por fecha Y por turno', /por fecha .*y por turno/i.test(r.modalTxt), r.modalTxt.slice(0,160));
  chk('  …y qué hacer si el que se movió sigue apareciendo', /todavía no llegó a la planilla/.test(r.modalTxt), '');
  chk('con lugar en PM el botón para ver quiénes lo ocupan sigue estando (y en singular)', /Ver el pedido del turno PM/.test(r.pmTexto), r.pmTexto.slice(0,120));

  // ---------- 6. el día FORZADO: 13 en un turno de 12 ----------
  /* ⚠️ Éste es el que explica la pregunta del dueño. Administración puede meter un pedido
     de más con la clave (`_forzar`, y el portero del `.gs` lo deja pasar con `forzar:true`).
     El cartel decía «(12/12)» calculado como `lim+'/'+lim`, así que 13 se veía igual que 12:
     sacar uno liberaba de verdad, pero el cartel no cambiaba y parecía que no había pasado. */
  r = await page.evaluate(() => {
    STATE=[];
    for(var i=0;i<13;i++) STATE.push(P({id:'f'+i, oc:'09-5'+i, nota:'5'+i, cliente:'FORZADO '+i, fecha:MIE, turno:'AM', nroDia:i+1}));
    showView('form');
    document.getElementById('f-fecha').value=MIE; segSet('f-turno','AM'); renderCupoForm();
    var trece=document.getElementById('cupo-form').textContent.replace(/\s+/g,' ').trim();
    // se mueve uno al día siguiente: quedan 12, sigue lleno, pero el número tiene que bajar
    var p=findById('f0'); p.fecha=JUE; upsert(p); renderCupoForm();
    var doce=document.getElementById('cupo-form').textContent.replace(/\s+/g,' ').trim();
    return { trece:trece, doce:doce, usados:cuposUsadosTurno(MIE,'AM') };
  });
  chk('§4fh · con 13 en un turno de 12 el cartel dice 13, no «12/12»', /\(13\/12\)/.test(r.trece), r.trece.slice(0,80));
  chk('  …y avisa que administración forzó uno y que sacar uno no alcanza', /1 más de los 12 que entran/.test(r.trece) && /va a seguir lleno/.test(r.trece), r.trece.slice(0,190));
  chk('§4fh · al mover uno el número BAJA a 12 (antes el cartel no cambiaba)', r.usados===12 && /\(12\/12\)/.test(r.doce) && !/más de los 12/.test(r.doce), r.doce.slice(0,80));

  // ---------- 7. el número de una COPIA VIEJA tiene que avisarlo (§4fi) ----------
  /* *«y tb sale eso a pesar de estar conectado»* (dueño, 22/09, con el 404 abajo y el cartel
     VERDE arriba en la misma pantalla). `loadFromServer` avisaba con un toast y nada más:
     no tocaba `CARGA_ESTADO`, así que el panel seguía diciendo «Conectado a Google Sheets» y
     el contador de cupos mostraba, sin decirlo, un número de la copia guardada. */
  r = await page.evaluate(async () => {
    STATE=[]; for(var i=0;i<12;i++) STATE.push(P({id:'v'+i, oc:'09-6'+i, nota:'6'+i, cliente:'VIEJO '+i, fecha:MIE, turno:'AM', nroDia:i+1}));
    ULTIMO_REFRESCO=Date.now()-95*60000;                       // la última lectura buena, hace 1 h 35
    apiList=function(){ return Promise.reject(new Error('http404')); };
    showView('admin');
    loadFromServer(false);
    await new Promise(r=>setTimeout(r,250));
    var out={ estado:CARGA_ESTADO, error:ULTIMO_ERROR,
              admTxt:document.getElementById('conn-admin-txt').textContent.replace(/\s+/g,' ').trim(),
              admVerde:document.getElementById('conn-admin').className };
    showView('form');
    document.getElementById('f-fecha').value=MIE; segSet('f-turno','AM'); renderCupoForm();
    out.cupo=document.getElementById('cupo-form').textContent.replace(/\s+/g,' ').trim();
    // y cuando vuelve a andar, el cartel tiene que volver a verde
    apiList=function(){ return Promise.resolve({ok:true, pedidos:JSON.parse(JSON.stringify(STATE))}); };
    showView('admin'); loadFromServer(false);
    await new Promise(r=>setTimeout(r,250));
    out.vuelve={ estado:CARGA_ESTADO, clase:document.getElementById('conn-admin').className,
                 txt:document.getElementById('conn-admin-txt').textContent.replace(/\s+/g,' ').trim() };
    showView('form'); renderCupoForm();
    out.cupoOk=document.getElementById('cupo-form').textContent.replace(/\s+/g,' ').trim();
    return out;
  });
  chk('§4fi · si 🔄 Actualizar falla, el panel DEJA de decir «Conectado»', r.estado==='error' && !/ on$/.test(r.admVerde), r.admVerde+' · '+r.estado);
  chk('  …y dice el motivo, en castellano', /404/.test(r.admTxt) || /404/.test(String(r.error)), r.admTxt.slice(0,120));
  chk('  …y de cuándo es la copia que se está mirando', /leída hace 1 hora/.test(r.admTxt), r.admTxt.slice(0,160));
  chk('§4fi · el contador de cupos avisa que el número es de la copia guardada', /copia guardada en este equipo/.test(r.cupo) && /Tocá 🔄 Actualizar/.test(r.cupo), r.cupo.slice(0,200));
  chk('§4fi · cuando el servidor vuelve, el cartel vuelve a verde', r.vuelve.estado==='ok' && / on$/.test(r.vuelve.clase), r.vuelve.clase+' · '+r.vuelve.estado);
  chk('  …y el aviso de copia vieja desaparece del contador', !/copia guardada en este equipo/.test(r.cupoOk), r.cupoOk.slice(0,120));

  chk('sin errores JS', errores.length===0, errores.slice(0,2).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
