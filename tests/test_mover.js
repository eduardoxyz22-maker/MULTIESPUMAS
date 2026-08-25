/* 🚪 LA EDICIÓN NO ES UNA PUERTA TRASERA (§4be).
   Al darles el botón Editar (§4bc) quedó un agujero: TODOS los porteros de fecha
   (domingo, sábado PM, día cerrado, cupos) tenían `!isEdit`, y el freno del servidor es
   solo para filas NUEVAS. O sea: una vendedora ya no podía CARGAR para un día cerrado,
   pero podía MOVER su pedido a un día cerrado o a un turno lleno — y el camión armado
   recibía un bulto más sin que nadie lo aprobara.
   La regla: si la edición CAMBIA la fecha o el turno y NO está la clave de
   administración, el destino pasa por los mismos porteros que un pedido nuevo. El que ya
   estaba en un día cerrado se sigue corrigiendo EN ese día, sin preguntar nada. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1400,height:1000} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  let DIALOGOS=0; page.on('dialog',d=>{ DIALOGOS++; d.accept(); });
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  /* Deja el tablero armado: F1 (día abierto, con el pedido PM), F2 (día CERRADO),
     F3 (día abierto con el turno AM LLENO). Devuelve las fechas. */
  const prep = (conClave) => page.evaluate(async (conClave) => {
    var el=document.getElementById('conn-form'); if(el) el.style.display='none';
    CONNECTED=true; UNLOCKED=!!conClave; VENTA_TIENDA=false;
    window._pl=[]; window._toasts=[];
    if(!window._toastOrig) window._toastOrig=window.toast;
    window.toast=function(m,k){ window._toasts.push(k+': '+m); return window._toastOrig.apply(null,arguments); };
    apiSave=function(r){ var g=JSON.parse(JSON.stringify(r));
      window._pl=window._pl.filter(function(p){return p.id!==g.id;}).concat([g]); return Promise.resolve({ok:true}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(window._pl))}); };
    var _d=new Date(), F1,F2,F3;
    do { _d.setDate(_d.getDate()+1); F1=isoLocal(_d); } while(diaDomingo(F1)||diaSabado(F1));
    do { _d.setDate(_d.getDate()+1); F2=isoLocal(_d); } while(diaDomingo(F2)||diaSabado(F2));
    do { _d.setDate(_d.getDate()+1); F3=isoLocal(_d); } while(diaDomingo(F3)||diaSabado(F3));
    DIAS_CERRADOS=[F2]; saveCierresMirror();
    var mk=function(id,fecha,turno,extra){ return Object.assign({ id:id, fecha:fecha, turno:turno,
      oc:'', nota:'9', vendedor:'Maria Flores', cliente:'C-'+id, celular:'7', zona:'N',
      direccion:'Av. Uno', maps:'', pagado:false, saldo:100, acuenta:0, cobradoBs:0,
      metodoPago:'', observaciones:'', garantia:'', facturarA:'', nit:'', estado:'',
      entregado:false, verificado:false, vehiculo:'', chofer:'', nroDia:1, ts:Date.now(),
      productos:[{desc:'SOFT ICE', medida:'140x190', codigo:'A1', cant:1}] }, extra||{}); };
    STATE=[ mk('PM', F1, 'AM', {oc:'08-700', verificado:true,
              productos:[{desc:'SOFT ICE',medida:'140x190',codigo:'A1',cant:1,chk:'ok'}]}) ];
    for(var i=0;i<limTurno(F3,'AM');i++) STATE.push(mk('LL'+i, F3, 'AM'));
    window._pl=JSON.parse(JSON.stringify(STATE)); saveMirror();
    return {F1:F1, F2:F2, F3:F3};
  }, conClave);

  /* Abre PM en el formulario, aplica cambios y guarda. Devuelve cómo quedó. */
  const mover = (cambios) => page.evaluate(async (cambios) => {
    editPedido('PM');
    await new Promise(r=>setTimeout(r,150));
    eval('(function(){'+cambios+'})()');
    window._toasts=[];
    submitPedido();
    await new Promise(r=>setTimeout(r,700));
    var q=findById('PM');
    return { fecha:q.fecha, turno:normTurno(q.turno), dir:q.direccion, toasts:window._toasts.slice() };
  }, cambios);

  // ============ 1. SIN clave: mover al día CERRADO → frenada ============
  let F = await prep(false);
  let r = await mover("document.getElementById('f-fecha').value='"+F.F2+"';");
  chk('sin clave NO se mueve un pedido a un día CERRADO', r.fecha===F.F1, r.fecha+' (cerrado: '+F.F2+')');
  chk('…y el aviso dice por qué', r.toasts.some(t=>/CERRADO/.test(t)), JSON.stringify(r.toasts));

  // ============ 2. SIN clave: mover a un turno LLENO → frenada ============
  await prep(false);
  r = await mover("document.getElementById('f-fecha').value='"+F.F3+"';");
  chk('sin clave NO se mueve a un turno lleno', r.fecha===F.F1, r.fecha);
  chk('…avisando que está lleno', r.toasts.some(t=>/lleno/i.test(t)), JSON.stringify(r.toasts));

  // ============ 3. SIN clave: mover a DOMINGO → frenada ============
  await prep(false);
  const DOM = await page.evaluate(() => { var d=new Date(), f;
    do { d.setDate(d.getDate()+1); f=isoLocal(d); } while(!diaDomingo(f)); return f; });
  r = await mover("var fe=document.getElementById('f-fecha'); fe.removeAttribute('min'); fe.value='"+DOM+"';");
  chk('sin clave NO se mueve a un DOMINGO', r.fecha===F.F1, r.fecha+' (domingo: '+DOM+')');

  // ============ 4. SIN clave: sábado PM → frenada ============
  await prep(false);
  const SAB = await page.evaluate(() => { var d=new Date(), f;
    do { d.setDate(d.getDate()+1); f=isoLocal(d); } while(!diaSabado(f)); return f; });
  r = await mover("document.getElementById('f-fecha').value='"+SAB+"'; segSet('f-turno','PM');");
  chk('sin clave NO se mueve a un sábado PM', !(r.fecha===SAB && r.turno==='PM'), r.fecha+' '+r.turno);

  // ============ 5. SIN clave: mover a AYER → frenada ============
  await prep(false);
  const AYER = await page.evaluate(() => { var d=new Date(); d.setDate(d.getDate()-1); return isoLocal(d); });
  r = await mover("var fe=document.getElementById('f-fecha'); fe.removeAttribute('min'); fe.value='"+AYER+"';");
  chk('sin clave NO se mueve la entrega a una fecha que ya pasó', r.fecha===F.F1, r.fecha);

  // ============ 6. SIN clave: mover a un día VÁLIDO → pasa, y avisa 📅 ============
  await prep(false);
  const F4 = await page.evaluate((f3) => { var d=new Date(f3+'T12:00:00'), f;
    do { d.setDate(d.getDate()+1); f=isoLocal(d); } while(diaDomingo(f)); return f; }, F.F3);
  r = await mover("document.getElementById('f-fecha').value='"+F4+"';");
  chk('a un día abierto y con lugar SÍ se mueve', r.fecha===F4, r.fecha+' · '+JSON.stringify(r.toasts));
  chk('…y a logística le llega el 📅 en el aviso de modificado',
      await page.evaluate(()=>{ var m=modDe(findById('PM')); return !!m && m.d.some(t=>/📅/.test(t)); }));

  // ============ 7. SIN clave: corregir EN el día cerrado (sin moverlo) → pasa ============
  await prep(false);
  await page.evaluate((f2) => { var p=findById('PM'); p.fecha=f2;
    STATE=[p].concat(STATE.filter(function(x){return x.id!=='PM';}));
    window._pl=JSON.parse(JSON.stringify(STATE)); saveMirror(); }, F.F2);
  DIALOGOS=0;
  r = await mover("document.getElementById('f-direccion').value='Av. Corregida 900';");
  chk('el pedido que YA estaba en el día cerrado se corrige EN ese día', r.dir==='Av. Corregida 900',
      r.dir+' · '+JSON.stringify(r.toasts));
  chk('…sin ningún cartel de por medio', DIALOGOS===0, DIALOGOS+' diálogos');
  chk('…y sin moverse de fecha', r.fecha===F.F2, r.fecha);

  // ============ 8. CON clave: mover al día cerrado → pregunta y deja ============
  F = await prep(true);
  DIALOGOS=0;
  r = await mover("document.getElementById('f-fecha').value='"+F.F2+"';");
  chk('con la clave puesta, mover al día cerrado PREGUNTA', DIALOGOS>=1, DIALOGOS+' diálogos');
  chk('…y aceptando, lo mueve (administración manda)', r.fecha===F.F2, r.fecha);

  chk('sin errores JS', errors.length===0, errors.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
