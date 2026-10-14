/* 🌅🌆 LA CARGA SEPARADA EN MAÑANA Y TARDE (14/10). El dueño, viendo los camiones de Administración: «¿solo muestra los AM?»
   y después «sí, hazlo, separa mañana y tarde».

   ⚠️ LO QUE ESTA PRUEBA CUIDA (contra lo publicado, `61dbaf8`, todo iba mezclado en una sola línea por producto):
   1. Cada camión tiene sus líneas por turno: el mismo producto en la mañana y en la tarde son DOS líneas con DOS tildes.
   2. El tilde de la mañana es la clave de SIEMPRE (lo ya tildado hoy no se pierde); el de la tarde lleva «|~PM».
   3. Tildar la mañana no carga la tarde; las cuentas del camión suman las dos.
   4. Las fichas de los camiones (3D) muestran «🌅 Mañana» y «🌆 Tarde» con lo cargado de cada uno; un camión solo de la mañana
      se ve como siempre.
   5. La Lista de carga también separa (con los MISMOS tildes, en los dos sentidos); un camión sin tarde, como siempre.
   6. Tocar un producto de la tarde muestra solo los pedidos de la tarde; «la fábrica de Eduardo» cuenta con el tilde del turno.
   Datos SINTÉTICOS. Reloj clavado en el miércoles 14/10/2026 a las 10:00 de Bolivia.
   Se corre:  node tests/test_carga_turnos.js   (desde la raíz del repo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const ARCH = 'file://' + (process.env.PEDIDOS||path.resolve('pedidos.html'));

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{ width:1300, height:1000 }, timezoneId:'America/La_Paz' });
  await page.clock.setFixedTime(new Date('2026-10-14T10:00:00-04:00'));
  const errores=[]; page.on('pageerror', e=>errores.push(e.message));
  page.on('dialog', d=>d.accept());
  await page.route('https://**', r=>r.abort());
  await page.goto(ARCH, { waitUntil:'load' });
  await page.waitForTimeout(300);
  const ev = (fn, arg) => page.evaluate(fn, arg).catch(e => ({ error:String(e.message||e).slice(0,300) }));

  await ev(async () => {
    var el=document.getElementById('conn-form'); if(el) el.style.display='none';
    CONNECTED=true; UNLOCKED=true; VENTA_TIENDA=false;
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block';
    mostrarBotonesTodos();
    window._SRV={};
    apiSave=function(rec){ var r=JSON.parse(JSON.stringify(rec)); r.rev=(Number((_SRV[r.id]||{}).rev)||0)+1; _SRV[r.id]=r; return Promise.resolve({ok:true, pedido:r}); };
    apiList=function(){ var l=JSON.parse(JSON.stringify(STATE.filter(function(p){ return !esFilaSistema(p); })));
      Object.keys(_SRV).forEach(function(k){ if(esFilaSistema(_SRV[k])) l.push(JSON.parse(JSON.stringify(_SRV[k]))); });
      return Promise.resolve({ok:true,pedidos:l}); };
    try{ localStorage.removeItem(LS_PEND); }catch(e){}
    var hoy=todayStr(), n=0;
    var P=function(veh,chofer,cli,turno,prods){ n++; return { id:'ct'+n, fecha:hoy, oc:'10-'+(300+n), vendedor:'Maria Flores', cliente:cli, celular:'7', turno:turno, zona:'Norte',
      direccion:'Calle '+n, maps:'', pagado:true, saldo:0, ts:Date.now(), metodoPago:'', observaciones:'', estado:'', entregado:false, vehiculo:veh, chofer:chofer,
      garantia:'', nota:'', acuenta:0, facturarA:'', nit:'', nroDia:n, verificado:false, fotos:[], productos:prods }; };
    var x=function(c,d,m,cant,extra){ return Object.assign({codigo:c,desc:d,medida:m,cant:cant},extra||{}); };
    STATE=[
      P('Foton nuevo','Luis Eyzaguirre','CLIENTE MAÑANA','AM',[x('CH1129','TITANIO LATEX','140x190',2)]),
      P('Foton nuevo','Luis Eyzaguirre','CLIENTE TARDE','PM',[x('CH1129','TITANIO LATEX','140x190',1), x('CH1761','ORO BI RELAX','140x190',1,{chk:'ok',chkDe:'Banzer'})]),
      P('Carry','Luis Pierre','CLIENTE SOLO MAÑANA','AM',[x('CH1121','HEAVEN TROPICAL','140x190',1)]),
      P('Foton encarpado','Cristhian','CLIENTE SOLO TARDE','PM',[x('CH1130','TITANIO LATEX','160x190',2)]),
      P('','','SIN CAMION TARDE','PM',[x('CH1036','ORO ANATOMICO VISCOLASTICO','140x190',1)])
    ];
    STOCK=stockVacio(); STOCK_CARGADO=true; STOCK.al={'Banzer':'sale'};
    CARGA_CHK={}; saveMirror();
    showView('admin'); segSet('adm-mode','todo'); QUICK_FILTER=''; renderAdmin();
    await new Promise(r=>setTimeout(r,150));
    CV_DIA='hoy'; cargaVivaPintar();
  });

  console.log('\n── 1-3. Las líneas y los tildes por turno ──');
  let r = await ev(() => {
    var D=cargaVivaDatos(), c=D.porK['Foton nuevo'], hoy=todayStr();
    var tit=c.lineas.filter(function(l){ return /TITANIO/.test(l.kk); });
    return { n:tit.length, t:tit.map(function(l){ return l.t+':'+l.u; }), keys:tit.map(function(l){ return l.key; }), total:c.total,
      viejaAM:cargaChkKey(hoy,'Foton nuevo',tit[0] && tit[0].kk), bz:c.lineas.filter(function(l){ return l.lugar!=='fabrica'; }).map(function(l){ return l.t+':'+l.key; }) };
  });
  chk('el mismo producto en la mañana (2) y en la tarde (1) son dos líneas', r.n===2 && r.t.join(',')==='AM:2,PM:1', r);
  chk('el tilde de la mañana es la clave de siempre; el de la tarde lleva «|~PM»', r.keys[0]===r.viejaAM && /\|~PM$/.test(r.keys[1]) && r.keys[0]!==r.keys[1], r.keys);
  chk('lo de Banzer de la tarde también tiene su tilde de la tarde', r.bz.length===1 && /^PM:.*\|@Banzer\|~PM$/.test(r.bz[0]), r.bz);
  chk('el camión suma los dos turnos (2 + 1 + 1 de Banzer)', r.total===4, r.total);
  r = await ev(() => {
    var D=cargaVivaDatos(), c=D.porK['Foton nuevo'], am=c.lineas.filter(function(l){ return l.t==='AM'; })[0];
    setCargaChk(am.key, true);
    var D2=cargaVivaDatos(), c2=D2.porK['Foton nuevo'];
    return { lineas:c2.lineas.map(function(l){ return l.t+(l.on?'✓':'·'); }), dentro:c2.dentro, total:c2.total };
  });
  chk('tildar lo de la mañana NO carga lo de la tarde', r.lineas.join(',')==='AM✓,PM·,PM·' && r.dentro===2 && r.total===4, r);

  console.log('\n── 4. Las fichas de los camiones ──');
  r = await ev(() => {
    cv3dColsPintar(cargaVivaDatos());
    var col=function(k){ return document.querySelector('#cv-cols .cvc[data-k="'+k+'"]'); };
    var fn=col('Foton nuevo'), tur=[].map.call(fn.querySelectorAll('.cvc-turno'), function(e){ return e.getAttribute('data-turno')+'|'+e.textContent; });
    var carry=col('Carry'), enc=col('Foton encarpado'), sin=col('Sin vehículo');
    return { tur:tur, carry:carry ? carry.querySelectorAll('.cvc-turno').length : -1, carryL:carry ? carry.querySelectorAll('.cvc-l').length : -1,
      enc:enc ? [].map.call(enc.querySelectorAll('.cvc-turno'), function(e){ return e.getAttribute('data-turno'); }) : null,
      sin:sin ? [].map.call(sin.querySelectorAll('.cvc-turno'), function(e){ return e.getAttribute('data-turno'); }) : null,
      orden:[].map.call(fn.querySelectorAll('.cvc-turno, .cvc-l'), function(e){ return e.classList.contains('cvc-turno') ? e.getAttribute('data-turno') : 'l'; }).join(' ') };
  });
  chk('el camión con los dos turnos muestra «🌅 Mañana» y «🌆 Tarde», cada uno con lo cargado', r.tur.length===2 && /^AM\|🌅 Mañana.*cargado/.test(r.tur[0]) && /^PM\|🌆 Tarde.*0 de 2/.test(r.tur[1]), r.tur);
  chk('y sus productos van debajo de cada cartel (1 de la mañana, 2 de la tarde)', r.orden==='AM l PM l l', r.orden);
  chk('un camión solo de la mañana se ve como siempre (sin carteles)', r.carry===0 && r.carryL===1, r);
  chk('un camión solo de la tarde dice «🌆 Tarde»; «Sin vehículo» también separa', JSON.stringify(r.enc)==='["PM"]' && JSON.stringify(r.sin)==='["PM"]', r);

  console.log('\n── 5. La Lista de carga ──');
  r = await ev(() => {
    CARGA_DIA='hoy'; renderCarga();
    var cam=function(k){ return document.querySelector('#carga-body .carga-cam[data-veh="'+k+'"]'); };
    var fn=cam('Foton nuevo'), secs=[].map.call(fn.querySelectorAll('.carga-turno'), function(d){ return d.getAttribute('data-turno')+'|'+d.querySelector('.carga-turno-h').textContent; });
    var chks=[].map.call(fn.querySelectorAll('.carga-turno input[type=checkbox]'), function(i){ return { t:i.closest('.carga-turno').getAttribute('data-turno'), k:i.getAttribute('data-k'), on:i.checked, u:i.getAttribute('data-u') }; });
    return { secs:secs, chks:chks, carry:cam('Carry').querySelectorAll('.carga-turno').length, carryChk:cam('Carry').querySelectorAll('input[type=checkbox]').length,
      enc:[].map.call(cam('Foton encarpado').querySelectorAll('.carga-turno'), function(d){ return d.getAttribute('data-turno'); }) };
  });
  chk('la Lista separa «🌅 Mañana» y «🌆 Tarde» con sus bultos y paradas', r.secs.length===2 && /^AM\|🌅 Mañana.*2 bultos.*1 parada/.test(r.secs[0]) && /^PM\|🌆 Tarde.*2 bultos.*1 parada/.test(r.secs[1]), r.secs);
  chk('con los MISMOS tildes que los camiones: la mañana tildada, la tarde no', r.chks.length===3 && r.chks[0].t==='AM' && r.chks[0].on && r.chks.filter(function(c){ return c.t==='PM'; }).every(function(c){ return !c.on && /\|~PM$/.test(c.k); }), r.chks);
  chk('un camión sin tarde se ve como siempre; uno solo de la tarde lleva su cartel', r.carry===0 && r.carryChk===1 && JSON.stringify(r.enc)==='["PM"]', r);
  r = await ev(() => {
    var i=document.querySelector('#carga-body .carga-cam[data-veh="Foton nuevo"] .carga-turno[data-turno="PM"] [data-carga-lugar="fabrica"] input[type=checkbox]');
    i.checked=true; i.dispatchEvent(new Event('change', { bubbles:true }));
    var c=cargaVivaDatos().porK['Foton nuevo'];
    return { lineas:c.lineas.map(function(l){ return l.t+(l.on?'✓':'·'); }), dentro:c.dentro };
  });
  chk('tildar la tarde en la Lista la carga en los camiones (y no toca la mañana)', r.lineas.join(',')==='AM✓,PM✓,PM·' && r.dentro===3, r);

  console.log('\n── 6. Los pedidos de cada línea y la fábrica de Eduardo ──');
  r = await ev(() => {
    var vistos=null, orig=cv3dAbrir; cv3dAbrir=function(q){ vistos=q.peds.map(function(p){ return p.cliente; }); };
    var c=cargaVivaDatos().porK['Foton nuevo'], pm=c.lineas.filter(function(l){ return l.t==='PM' && l.lugar==='fabrica'; })[0], am=c.lineas.filter(function(l){ return l.t==='AM'; })[0];
    cv3dPedidos(c, pm); var dePM=vistos; cv3dPedidos(c, am); var deAM=vistos; cv3dAbrir=orig;
    var tarde=STATE.filter(function(p){ return p.cliente==='CLIENTE TARDE'; })[0], man=STATE.filter(function(p){ return p.cliente==='CLIENTE MAÑANA'; })[0];
    return { dePM:dePM, deAM:deAM, carT:depCargado(tarde, tarde.productos[0]).u, carT2:depCargado(tarde, tarde.productos[1]).u, carM:depCargado(man, man.productos[0]).u };
  });
  chk('tocar el producto de la tarde muestra solo el pedido de la tarde (y el de la mañana, el suyo)', JSON.stringify(r.dePM)==='["CLIENTE TARDE"]' && JSON.stringify(r.deAM)==='["CLIENTE MAÑANA"]', r);
  chk('la fábrica de Eduardo cuenta con el tilde de su turno (tarde: 1 en el camión, lo de Banzer todavía no; mañana: 2)', r.carT===1 && r.carT2===0 && r.carM===2, r);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e => { console.error(e); process.exit(1); });
