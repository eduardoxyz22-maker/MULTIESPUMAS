/* 🏬 (27/10, §4na) El stock de cada tienda. El dueño (14/10, §4kx): «hace falta llevar el saldo de cada tienda»; (27/10): «armarlo y
   veamos cómo queda, quiero ver que no altere fórmulas ni nada que ya tenemos trabajando… sería el último día laboral del mes».
   Reloj clavado en el JUEVES 05/11/2026 a las 09:00 de Bolivia. Mia Plaza y Charcas se contaron el sábado 31/10 (último día hábil de
   octubre); Central no tiene conteo. Lo que pasó después:
     · RPT a Mia Plaza el 03/11 (2 TITANIO ICE 160) → le llegó +2. La del 31/10 ya estaba en el conteo; la del 06/11 todavía no llegó;
       la línea ✗ del 03/11 no salió.
     · Venta de tienda de Mia Plaza el 04/11 (1 TITANIO) → vendió −1. La del 30/10 es de antes del conteo. La de Central no cuenta (sin conteo).
     · Un pedido con el TITANIO marcado «🏬 Tienda Mia Plaza» entregado el 03/11 → se recogió −1; otro para el 07/11 → apartado 1.
     · Pase de 1 SOMIER de Mia Plaza a Charcas el 04/11.
   Mia Plaza: TITANIO 3 + 2 − 1 − 1 = 3 (apartado 1, libres 2); SOMIER 2 − 1 = 1. Charcas: SOMIER 0 + 1 = 1.
   ⚠️ Y lo más importante: con o sin el conteo de las tiendas, TODAS las cuentas del stock de fábrica dan lo mismo.
   Se corre:  node tests/test_tiendas_stock.js   (TST_CAP=<carpeta> deja capturas) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const CAP = process.env.TST_CAP || '';
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_u2_turno.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));

async function abrir(browser, w, conConteo){
  const ctx = await browser.newContext({ viewport:{ width:w, height:900 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('dialog', d=>d.accept());
  await page.clock.setFixedTime(new Date('2026-11-05T09:00:00-04:00'));   // jueves
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');
  await page.evaluate(async(conConteo)=>{
    UNLOCKED=true;
    /* La planilla de mentira guarda también la fila de las tiendas. */
    apiSave=function(rec){
      if(rec && rec.id==='__stock__') window._guardado=rec.observaciones;
      if(rec && rec.id==='__tiendas_stock__'){
        var r=JSON.parse(JSON.stringify(rec)); r.rev=(Number(rec.rev)||0)+1;
        window._SRV.pedidos=window._SRV.pedidos.filter(function(p){ return p.id!==rec.id; }); window._SRV.pedidos.push(r);
        window._tstGuardado=(window._tstGuardado||0)+1;
        return Promise.resolve({ ok:true, pedido:r });
      }
      return Promise.resolve({ ok:true, pedido:rec });
    };
    var ts=function(f,h){ return new Date(f+'T'+(h||'11:00')+'-04:00').getTime(); };
    var tienda=function(id, f, suc, lineas){ return _ped(id, '', '', lineas, { cliente:'CLIENTE TIENDA '+id, direccion:'SALIÓ DE TIENDA · '+suc, zona:'TIENDA', ts:ts(f), pagado:true, fecha:'' }); };
    var rpt=function(id, f, suc, lineas){ return _ped(id, f, 'AM', lineas, { cliente:suc, oc:'RPT 10-'+id.slice(-3), ts:ts('2026-10-20') }); };
    var deTienda=function(cant, suc){ return _lin(_T, cant, { chk:'im', chkDe:'Tienda '+suc }); };
    var ps=[
      rpt('r01','2026-11-03','Mia Plaza',[_lin(_T,2,{ chk:'ok' }), _lin(_S,1,{ chk:'no' })]),   // le llegó 2 TITANIO (el SOMIER ✗ no)
      rpt('r02','2026-10-31','Mia Plaza',[_lin(_T,1,{ chk:'ok' })]),                          // el día del conteo: ya estaba adentro
      rpt('r03','2026-11-06','Mia Plaza',[_lin(_T,4,{ chk:'ok' })]),                          // mañana: todavía no llegó
      tienda('v01','2026-11-04','Mia Plaza',[_lin(_T,1)]),                                    // vendió 1 después del conteo
      tienda('v02','2026-10-30','Mia Plaza',[_lin(_T,1)]),                                    // antes del conteo
      tienda('v03','2026-11-04','Central',[_lin(_T,1)]),                                      // Central no tiene conteo
      tienda('v04','2026-11-04','Mia Plaza',[_lin('|PROTECTOR DE COLCHON|160x190',3)]),       // lo de tienda queda afuera
      _ped('p01','2026-11-03','AM',[deTienda(1,'Mia Plaza')],{ cliente:'JUAN PEREZ', ts:ts('2026-11-02') }),        // se recogió (fecha pasada)
      _ped('p02','2026-11-07','AM',[deTienda(1,'Mia Plaza')],{ cliente:'ANA ROJAS', ts:ts('2026-11-04') }),         // apartado
      _ped('p03','2026-11-06','AM',[_lin(_T,2,{ chk:'ok' })],{ cliente:'PEDIDO DE FABRICA', ts:ts('2026-11-04') })    // de PTF: no toca las tiendas
    ];
    if(conConteo){
      var D={ v:1, s:{
        'Mia Plaza':{ f:'2026-10-31', hora:'19:30', t:ts('2026-10-31','19:40'), de:'mano', u:{}, tot:5 },
        'Charcas':{ f:'2026-10-31', hora:'19:30', t:ts('2026-10-31','19:41'), de:'excel', u:{}, tot:1 } },
        x:[{ id:'tp1', f:'2026-11-04', de:'Mia Plaza', a:'Charcas', k:_K2, u:1, ts:ts('2026-11-04') }], h:[] };
      D.s['Mia Plaza'].u[_K]=3; D.s['Mia Plaza'].u[_K2]=2; D.s['Charcas'].u[_K]=1;
      ps.push({ id:'__tiendas_stock__', fecha:'', cliente:'🏬 STOCK DE LAS TIENDAS', observaciones:JSON.stringify(D), rev:1 });
    }
    await _cargar(ps, _stock(function(s){ s.c.u[_K]=10; s.c.u[_K2]=4; s.g[_BZ].u[_K]=2; s.g[_IM].u[_K]=5; }));
  }, !!conConteo);
  await page.waitForTimeout(100);
  return { ctx, page, errs };
}
/* Una foto de TODAS las cuentas del stock de fábrica que ya andaban (para comparar con y sin el conteo de las tiendas). */
const fotoFabrica = page => page.evaluate(()=>{
  var d=stockData(), out={};
  out.lista=d.lista.map(function(o){ return [o.k, o.deposito, o.comp, o.libre, o.fabricar, o.recoger, o.enOtros, o.aviso, o.porDia, stockHaySalir(o)]; });
  var R=stockProducir(d); out.prod=R.bloques.map(function(B){ return [B.k, B.filas.map(function(f){ return [f.o.k, f.sem, f.quin, f.mes, f.tot]; })]; });
  /* La revisión automática ENTERA, sin su `firma`: es la planilla copiada tal cual para saber si cambió (cambia con cualquier fila
     nueva, también `__pry_hist__`), no una cuenta. */
  var A=stockAsignar(); delete A.firma; out.asig=JSON.stringify(A);
  out.sem=semanaDatos().tot;
  out.saldo=saldoVeredicto(_K, 1, '', '2026-11-09', true);
  out.tiendas=stockTiendas(stockMesSiguiente(todayStr())).map(function(t){ return [t.n, t.v, t.r, t.q15, t.mes]; });
  return JSON.stringify(out);
});

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });

  /* 1 · No cambia nada de lo que ya funciona */
  let A0=await abrir(browser, 1440, false), A1=await abrir(browser, 1440, true);
  const sin=await fotoFabrica(A0.page), con=await fotoFabrica(A1.page);
  chk('1 · con el conteo de las tiendas cargado, el stock de fábrica, el pedido a producción, la revisión automática, la semana, el cuadrito y «qué va a pedir cada tienda» dan EXACTAMENTE lo mismo',
    sin===con, sin===con ? '' : { sin:sin.slice(0,300), con:con.slice(0,300) });
  const fila=await A1.page.evaluate(()=>({ sis:esFilaSistema(findById('__tiendas_stock__')), conta:fueraDeConta(findById('__tiendas_stock__')), cuenta:stockCuenta(findById('__tiendas_stock__')) }));
  chk('1 · la fila de las tiendas es del sistema: no es una venta ni cuenta para el stock', fila.sis && fila.conta && !fila.cuenta, fila);
  const sinConteo=await A0.page.evaluate(()=>({ hay:tstHayConteo(), dc:JSON.stringify(tstDeClave(_K)) }));
  chk('1 · sin ningún conteo, nada que mostrar en la ficha', !sinConteo.hay && sinConteo.dc==='{}', sinConteo);
  await A0.ctx.close();
  let page=A1.page;

  /* 2 · La cuenta de cada tienda */
  let r=await page.evaluate(()=>{ var T=tstCalcular(), mp=T['Mia Plaza'], ch=T['Charcas'], ce=T['Central'];
    var f=function(t,k){ var x=t.P[k]; return x ? { c:x.c, rpt:x.rpt, ven:x.ven, rec:x.rec, pas:x.pas, tiene:x.tiene, apart:x.apart, libre:x.libre } : null; };
    return { T:f(mp,_K), S:f(mp,_K2), chS:f(ch,_K2), chT:f(ch,_K), tot:mp.tot, ce:!!ce.base, ceF:ce.filas.length,
             prot:Object.keys(mp.P).filter(function(k){ return /PROTECTOR/.test(k); }).length }; });
  chk('2 · Mia Plaza, TITANIO: contó 3, le llegaron 2, vendió 1, se recogió 1 → tiene 3; 1 apartado, 2 libres',
    r.T && r.T.c===3 && r.T.rpt===2 && r.T.ven===1 && r.T.rec===1 && r.T.tiene===3 && r.T.apart===1 && r.T.libre===2, r.T);
  chk('2 · la RPT del día del conteo, la de mañana y la línea ✗ no suman; la venta de antes del conteo no resta', r.T && r.T.rpt===2 && r.T.ven===1, r.T);
  chk('2 · el pase: el SOMIER baja en Mia Plaza (2 → 1) y sube en Charcas (0 → 1)', r.S && r.S.tiene===1 && r.S.pas===-1 && r.chS && r.chS.tiene===1 && r.chS.pas===1, { S:r.S, ch:r.chS });
  chk('2 · Central sin conteo no muestra nada (su venta no se cuenta en ninguna parte)', !r.ce && r.ceF===0, r);
  chk('2 · los protectores (lo de tienda) quedan afuera', r.prot===0, r);
  chk('2 · total de Mia Plaza: tiene 4, apartado 1, libres 3', r.tot.tiene===4 && r.tot.apart===1 && r.tot.libre===3, r.tot);

  /* 3 · La ventana */
  await page.evaluate(()=>{ abrirStock(); });
  await page.waitForTimeout(150);
  const boton=await page.evaluate(()=>{ var b=document.getElementById('stk-tst-btn'); return b ? b.textContent : ''; });
  chk('3 · en la barra de Stock, el botón «🏬 Stock de las tiendas»', /Stock de las tiendas/.test(boton), boton);
  await page.evaluate(()=>{ abrirTst(); TST_ABIERTA['Mia Plaza']=1; tstPintar(); });
  await page.waitForTimeout(120);
  r=await page.evaluate(()=>{ var b=document.getElementById('tst-body'), ov=document.getElementById('tst-overlay');
    var card=function(n){ var c=document.querySelector('.tst-card[data-tienda="'+n+'"]'); return c ? c.innerText.replace(/\s+/g,' ') : ''; };
    return { vis:getComputedStyle(ov).display, txt:b.innerText.replace(/\s+/g,' '), mp:card('Mia Plaza'), ch:card('Charcas'), ce:card('Central'),
             filas:[].map.call(document.querySelectorAll('.tst-card[data-tienda="Mia Plaza"] tbody tr'), function(tr){ return tr.innerText.replace(/\s+/g,' '); }),
             cuando:(document.getElementById('tst-cuando')||{}).innerText||'', info:document.getElementById('tst-info').textContent }; });
  chk('3 · se abre la ventana', r.vis==='flex', r.vis);
  chk('3 · cada tienda con su conteo: Mia Plaza «contado el sábado 31/10 · tiene 4 · apartado 1 · libres 3»',
    /contado el s[aá]bado 31\/10/.test(r.mp) && /tiene 4/.test(r.mp) && /apartado 1/.test(r.mp) && /libres 3/.test(r.mp), r.mp);
  chk('3 · Central dice «sin conteo todavía»', /sin conteo todav[ií]a/.test(r.ce), r.ce);
  chk('3 · la tabla de Mia Plaza: TITANIO contado 3, le llegó 2, vendió −1, se recogió −1, tiene 3, apartado 1, libres 2',
    r.filas.some(function(t){ return /TITANIO ICE · 160x190 3 2 -1 -1 — 3 1 2/i.test(t); }), r.filas);
  chk('3 · el próximo conteo: «el lun 30/11, último día hábil de noviembre» (30/11 es lunes)', /último día hábil de noviembre/.test(r.cuando) && /30\/11/.test(r.cuando), r.cuando);
  chk('3 · arriba: cuántas tiendas tienen conteo', /2 de 6 tiendas/.test(r.info), r.info);
  chk('3 · dice que solo mira y no cambia el stock de fábrica', /no cambia ninguna cuenta del stock de f[aá]brica/.test(r.txt), '');
  const ultimo=await page.evaluate(()=>{ var f0=todayStr, o={}; try{
      todayStr=function(){ return '2026-10-31'; }; o.oct=tstUltimoHabilMes('2026-10-31'); o.txt=tstCuandoHtml();
      o.dic=tstUltimoHabilMes('2026-12-15'); o.ene=tstUltimoHabilMes('2027-01-10');
    } finally { todayStr=f0; } return o; });
  chk('3 · el último día hábil del mes: sáb 31/10 (y ese día dice «Hoy es el último día hábil de octubre»), jue 31/12, sáb 30/01/2027 (el 31 es domingo)',
    ultimo.oct==='2026-10-31' && /Hoy es el último día hábil de octubre/.test(ultimo.txt) && ultimo.dic==='2026-12-31' && ultimo.ene==='2027-01-30', ultimo);
  if(CAP){ fs.mkdirSync(CAP,{recursive:true}); await page.screenshot({ path:path.join(CAP,'tiendas-ventana.png'), animations:'disabled' }); }

  /* 4 · El conteo a mano y el control: lo que el panel esperaba contra lo contado */
  await page.evaluate(()=>{ tstVer('mano'); });
  await page.evaluate(()=>{ document.getElementById('tst-m-t').value='Mia Plaza'; var x=document.getElementById('tst-m-x'); x.value='CH1201 2\nCH1212\tSOMIER TITANIO ICE 140x190\t1\nZZ999 4'; tstManoLeer(); });
  r=await page.evaluate(()=>document.getElementById('tst-m-ok').innerText.replace(/\s+/g,' '));
  chk('4 · lee «código cantidad» y dos columnas pegadas; avisa el código que no conoce', /2 productos, 3 unidades/.test(r) && /No entiendo 1 rengl/.test(r) && /ZZ999/.test(r), r);
  await page.evaluate(()=>{ tstManoVer(); });
  r=await page.evaluate(()=>!!TST_PREV);
  chk('4 · con un renglón que no entiende, no sigue', !r, r);
  await page.evaluate(()=>{ var x=document.getElementById('tst-m-x'); x.value='CH1201 2\nCH1212 1'; tstManoLeer(); tstManoVer(); });
  await page.waitForTimeout(80);
  r=await page.evaluate(()=>{ var p=document.getElementById('tst-prev'); return p ? p.innerText.replace(/\s+/g,' ') : ''; });
  chk('4 · la vista previa: el panel esperaba 4 y contaron 3: −1 en el TITANIO', /esperaba 4/.test(r) && /contaron 3/.test(r) && /-1 en total/.test(r) && /TITANIO ICE · 160x190 3 2 -1/i.test(r), r);
  if(CAP) await page.screenshot({ path:path.join(CAP,'tiendas-control.png'), animations:'disabled' });
  await page.evaluate(()=>tstGuardarConteo());
  await page.waitForTimeout(80);
  r=await page.evaluate(()=>{ var D=tstLeer(), T=tstCalcular(); return { n:window._tstGuardado||0, f:D.s['Mia Plaza'].f, tiene:T['Mia Plaza'].tot.tiene, apart:T['Mia Plaza'].tot.apart,
    pase:D.x.length, ch:D.s['Charcas'].f, h:D.h.map(function(e){ return [e.n,e.f,e.tot,e.esp]; }), prev:!!TST_PREV }; });
  chk('4 · al guardar: Mia Plaza queda contada hoy (05/11), Charcas y el pase siguen', r.n===1 && r.f==='2026-11-05' && r.ch==='2026-10-31' && r.pase===1 && !r.prev, r);
  chk('4 · desde el conteo nuevo: tiene 3 (lo contado), apartado 1 (el pedido del 07/11 sigue en la tienda)', r.tiene===3 && r.apart===1, r);
  chk('4 · queda anotado el conteo con lo que esperaba el panel', JSON.stringify(r.h)===JSON.stringify([['Mia Plaza','2026-11-05',3,4]]), r.h);

  /* 5 · Un conteo más viejo que el que hay no entra; una fecha futura tampoco */
  await page.evaluate(()=>{ TST_PREV={ lista:[{ n:'Mia Plaza', f:'2026-11-02', de:'mano', u:{} }], fuera:[] }; tstPintar(); });
  r=await page.evaluate(()=>({ txt:document.getElementById('tst-prev').innerText.replace(/\s+/g,' '), dis:document.getElementById('tst-guardar').disabled }));
  chk('5 · un conteo más viejo que el guardado: «Ya hay un conteo más nuevo» y no se puede guardar', /Ya hay un conteo m[aá]s nuevo de Mia Plaza/.test(r.txt) && r.dis, r);
  await page.evaluate(()=>{ TST_PREV=null; tstPintar(); });

  /* 6 · El Excel: el de una tienda entra; el de PTF/Banzer/Moreno no */
  r=await page.evaluate(()=>{
    var it=function(cod, d, m, c){ return { cod:cod, desc:d+' '+m, medida:m, cant:c, k:stockClave({ desc:d, medida:m, codigo:cod }) }; };
    tstPrevDeExcel([{ almacen:'01-07-003 ALMACEN TIENDA CHARCAS', fecha:'2026-11-05', items:[it('CH1201','TITANIO ICE','160x190',2), it('CH1212','SOMIER TITANIO ICE','140x190',1), { cod:'PR01', desc:'PROTECTOR DE COLCHON 160x190', medida:'160x190', cant:5, k:'PROTECTOR DE COLCHON|160x190' }] },
                    { almacen:'PRODUCTOS TERMINADOS FAB.', fecha:'2026-11-05', items:[it('CH1201','TITANIO ICE','160x190',9)] }], 'tiendas.xlsx');
    var P=TST_PREV, e=P && P.lista[0];
    var out={ n:P && P.lista.length, tienda:e && e.n, u:e && e.u, fuera:P && P.fuera, txt:(document.getElementById('tst-prev')||{}).innerText };
    tstPrevDeExcel([{ almacen:'PRODUCTOS TERMINADOS FAB.', fecha:'2026-11-05', items:[it('CH1201','TITANIO ICE','160x190',9)] }], 'ptf.xlsx');
    out.solo=!!TST_PREV; out.msg=TST_MSG; TST_PREV=null; TST_MSG=''; tstPintar();
    return out; });
  chk('6 · «ALMACEN TIENDA CHARCAS» es Charcas: entra con 2 TITANIO y 1 SOMIER (sin el protector)',
    r.n===1 && r.tienda==='Charcas' && Object.keys(r.u).length===2 && Object.values(r.u).reduce((a,b)=>a+b,0)===3, r);
  chk('6 · el de PTF en el mismo archivo no se usa y se dice', JSON.stringify(r.fuera)===JSON.stringify(['PRODUCTOS TERMINADOS FAB.']) && /No es de una tienda/.test(r.txt||''), r.fuera);
  chk('6 · un Excel solo de PTF: «va en 📥 Subir existencias»', !r.solo && /Subir existencias/.test(r.msg), r.msg);

  /* 7 · El pase, con su control; anular */
  await page.evaluate(()=>{ tstVer('pase'); document.getElementById('tst-p-de').value='Charcas'; document.getElementById('tst-p-a').value='Mutualista';
    var c=document.getElementById('tst-p-c'); c.value='CH1201'; tstPaseLeer(); document.getElementById('tst-p-u').value='1'; });
  r=await page.evaluate(()=>document.getElementById('tst-p-ok').innerText);
  chk('7 · al escribir el código dice qué producto es', /TITANIO ICE/.test(r), r);
  await page.evaluate(()=>{ document.getElementById('tst-p-a').value='Charcas'; return tstPaseGuardar(); });
  r=await page.evaluate(()=>tstLeer().x.length);
  chk('7 · de una tienda a la misma no se anota', r===1, r);
  await page.evaluate(()=>{ document.getElementById('tst-p-a').value='Mutualista'; return tstPaseGuardar(); });
  await page.waitForTimeout(60);
  r=await page.evaluate(()=>{ var T=tstCalcular(); return { n:tstLeer().x.length, ch:T['Charcas'].P[stockAliasDe(_K)].tiene, vista:TST_VISTA }; });
  chk('7 · el pase se anota y Charcas baja 1 TITANIO (1 → 0)', r.n===2 && r.ch===0 && r.vista==='', r);
  const idP=await page.evaluate(()=>tstLeer().x.filter(function(q){ return q.de==='Charcas'; })[0].id);
  await page.evaluate(id=>tstPaseAnular(id), idP);
  await page.waitForTimeout(60);
  r=await page.evaluate(()=>{ var T=tstCalcular(); return { ch:T['Charcas'].P[stockAliasDe(_K)].tiene, an:tstLeer().x.filter(function(q){ return q.an; }).length }; });
  chk('7 · anular el pase lo devuelve (Charcas vuelve a 1) y queda la marca de anulado', r.ch===1 && r.an===1, r);

  /* 8 · Dos aparatos: lo de la planilla y lo de acá se juntan sin perder nada */
  r=await page.evaluate(()=>{
    var a={ s:{ 'Mia Plaza':{ f:'2026-11-05', t:5, u:{} }, 'Carmelo':{ f:'2026-10-31', t:1, u:{} } }, x:[{ id:'q1', f:'2026-11-04', de:'Carmelo', a:'Central', k:'X|1', u:1 }], h:[] };
    var b={ s:{ 'Mia Plaza':{ f:'2026-11-05', t:9, u:{ 'Y|1':1 } } }, x:[{ id:'q1', f:'2026-11-04', de:'Carmelo', a:'Central', k:'X|1', u:1, an:7 }, { id:'q2', f:'2026-11-05', de:'Central', a:'Charcas', k:'X|1', u:2 }], h:[] };
    var D=tstJuntar(a, b);
    return { mp:D.s['Mia Plaza'].t, car:!!D.s['Carmelo'], x:D.x.map(function(q){ return q.id+(q.an?'·an':''); }) };
  });
  chk('8 · de cada tienda gana el conteo subido después; los pases se juntan y uno anulado sigue anulado',
    r.mp===9 && r.car && JSON.stringify(r.x)===JSON.stringify(['q1·an','q2']), r);

  /* 9 · En la ficha: «🏬 ¿De qué tienda se recoge?» dice cuánto hay en cada una */
  r=await page.evaluate(()=>{ var p=findById('p02'); TDA_ELIGE=p.id+'|0'; var h=tiendaElegirHtml(p, p.productos[0], 0); TDA_ELIGE='';
    var d=document.createElement('div'); d.innerHTML=h; return [].map.call(d.querySelectorAll('button'), function(b){ return b.textContent.replace(/\s+/g,' ').trim(); }); });
  chk('9 · Mia Plaza «hay 1» (contaron 2 hoy y 1 está apartado para este mismo pedido), Charcas «hay 1», y las que no tienen conteo sin número',
    r.some(function(t){ return /^Mia Plaza.*hay 1/.test(t); }) && r.some(function(t){ return /^Charcas.*hay 1/.test(t); }) && r.some(function(t){ return t==='Central' || /^Central$/.test(t); }), r);

  /* 10 · Sin señal no guarda (y lo dice) */
  r=await page.evaluate(async()=>{ CONNECTED=false; var n=window._tstGuardado; var res=await tstGuardarCon(function(D){ D.x.push({ id:'zz', f:'2026-11-05', de:'Charcas', a:'Central', k:'X|1', u:1 }); }, 'ok');
    CONNECTED=true; return { res:res, n:window._tstGuardado===n, x:tstLeer().x.length }; });
  chk('10 · sin conexión no se guarda nada', r.res===null && r.n && r.x===2, r);

  /* 11 · Celular: la ventana entra en la pantalla */
  const C=await abrir(browser, 390, true);
  await C.page.evaluate(()=>{ abrirTst(); TST_ABIERTA['Mia Plaza']=1; tstPintar(); });
  await C.page.waitForTimeout(100);
  r=await C.page.evaluate(()=>{ var b=document.getElementById('tst-body'); return { sw:b.scrollWidth, cw:b.clientWidth }; });
  chk('11 · en el celular (390 px) no se sale de la pantalla (la tabla se desliza adentro)', r.sw<=r.cw+1, r);
  if(CAP) await C.page.screenshot({ path:path.join(CAP,'tiendas-cel.png'), animations:'disabled', fullPage:false });

  chk('sin errores de la página', !A1.errs.length && !C.errs.length, A1.errs.concat(C.errs));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
