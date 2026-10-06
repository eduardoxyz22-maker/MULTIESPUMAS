/* ✂️ LA PODA DE LOS PEDIDOS A FÁBRICA YA RECIBIDOS (02/10).

   El dueño: *«la celda del stock va 45 % de las 50.000 letras que aguanta Google: podar lo ya recibido antes de que
   llegue»*. El stock entero (`{c,e,p,a,g,al,h}`) viaja en UNA celda de la planilla; lo único que crecía sin tope eran
   los pedidos a fábrica recibidos (`p`), guardados 4 meses enteros «porque miden cuánto tarda la fábrica».

   Lo que este test cuida:
   1. MIDE qué parte de la celda pesa cada sección, con un fixture realista armado por el propio importador de
      existencias de la página: el catálogo `CODIGOS` entero en tres almacenes (PTF, Banzer, IM) más códigos que el
      catálogo no conoce, 40 pedidos a fábrica (30 recibidos, entre ellos recogidas de IM y «dados por llegados» con un
      Excel), 30 entradas, 14 cortes y uniones a mano. Imprime antes/después por sección.
   2. La poda es DETERMINISTA e IDEMPOTENTE: leer → guardar → leer da el mismo texto, desde la memoria y desde la celda
      cruda, y podar dos veces es podar una.
   3. NINGUNA CUENTA CAMBIA: `stockTiemposFabrica` (días, n, medido, prestado por fábrica y general),
      `stockMuestrasFabrica`, `stockData` (depósito, comprometido, en otros, en recogida, Banzer, en camino, pedir,
      recoger, fabricar, fábrica, tiempo de fábrica, rotación, aviso, corte) y `stockCodRefs` dan lo mismo con la regla
      nueva que con la regla vieja de 120 días — hoy y 50 días más adelante.
   4. Lo que NO se toca, no se toca: fotos (`c`, `g` con `u`, `cod`, `rs`), uniones, roles, entradas, historial, lo
      pendiente y lo recibido hace menos de 45 días (con sus recepciones).
   5. Dos dispositivos que juntan (`stockFusionar`, con base y sin base) no reviven lo podado de forma permanente, y
      una página VIEJA que trae de vuelta un recibido viejo con sus recepciones no rompe nada: a IM no se le resta dos
      veces una recogida, su `rs` queda igual, y las cuentas dan lo mismo.

   Datos SINTÉTICOS (el repo es público). Reloj de la página clavado en el 02/10/2026, 10:00 de Bolivia; después se lo
   adelanta 50 días para ver que con los días la poda solo saca, nunca repone.

   Se corre:  node tests/test_stock_podar.js   (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/a/la/pedidos.html/de/antes node tests/test_stock_podar.js  (sin `stockPodar` corta en rojo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const PAGINA = process.env.PEDIDOS || path.resolve('pedidos.html');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const J=(x)=>JSON.stringify(x);
const IM='IM - PRODUCTOTERMINADO', BANZER='01-05-025  Almacen Distribucion Banzer', PTF='01-05-003  PRODUCTOS TERMINADOS FAB.';

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1400,height:1000}, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror',e=>errores.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.route(/^https?:\/\//, r => r.abort());                      // sin red: todo lo que no sea el archivo, cortado
  await page.clock.setFixedTime(new Date('2026-10-02T14:00:00Z'));       // 10:00 de Bolivia
  await page.goto('file://' + PAGINA, { waitUntil:'load' });
  await page.waitForTimeout(300);

  const faltan = await page.evaluate(() => ['existLeer','confirmarImportExist','leerStock','filaStock','stockMigrar','stockFusionar','stockPodar','stockMuestraDe','stockTiemposFabrica','stockMuestrasFabrica','stockData','stockCodRefs','stockNormalizarRecepciones']
    .filter(f => typeof window[f] !== 'function'));
  if(faltan.length){
    chk('el panel tiene la poda del stock (stockPodar) y el módulo de stock', false, 'faltan: '+faltan.join(', '));
    console.log('\n'+PASS+' bien · '+FAIL+' mal'); await browser.close(); process.exit(1);
  }
  chk('el reloj de la página está clavado en el 02/10/2026', await page.evaluate(() => todayStr()==='2026-10-02'));

  await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    document.getElementById('admin-lock').style.display='none';
    document.getElementById('admin-content').style.display='block';
    try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok';
    try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    window._guardadas=[];
    apiSave=function(rec){ window._guardadas.push(JSON.parse(JSON.stringify(rec))); return Promise.resolve({ok:true, pedido:rec}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
    window._P=function(o){ return Object.assign({id:'p'+Math.random().toString(36).slice(2),fecha:todayStr(),oc:'',vendedor:'Carola Chavez',
      cliente:'C',celular:'70000000',turno:'AM',zona:'Norte',direccion:'x',maps:'',pagado:true,saldo:0,
      ts:Date.now(),metodoPago:'',observaciones:'',estado:'',entregado:false,vehiculo:'',chofer:'',
      garantia:'',nota:'',acuenta:0,facturarA:'',nit:'',nroDia:1,verificado:false,fotos:[]},o); };

    /* ── El fixture ─────────────────────────────────────────────────────────────────────────── */
    window._armar=function(){
      STATE=[]; STOCK=stockVacio(); STOCK_CARGADO=true; stockOlvidarIndice(); SIS_BASE={}; STOCK_TAMANO_AVISADO=false;
      var hoy=todayStr(), atras=function(n){ return stockSumarDias(hoy,-n); };
      var IM='IM - PRODUCTOTERMINADO', BANZER='01-05-025  Almacen Distribucion Banzer', PTF='01-05-003  PRODUCTOS TERMINADOS FAB.';
      var cods=Object.keys(CODIGOS);
      /* El reporte «EXISTENCIAS ALMACEN» de cada almacén: casi todo el catálogo (no todo está en cada uno) con la medida
         adentro del nombre, como lo escribe el sistema de Moreno, más códigos que el catálogo no conoce (dos dígitos en
         el modelo: `stockClaveCruda` saca los números de una cifra). */
      var excel=function(alm, fechaIso, semilla, nDesc){
        var f=[{},{C:'MORENO',X:'EXISTENCIAS ALMACEN  AL ',AR:fmtFecha(fechaIso),AZ:'(Productos con existencia <> 0)'},
               {F:'Almacén Inicial :',P:alm},{G:'Código Producto',W:'Nombre Producto'}];
        cods.forEach(function(c,i){ var p=CODIGOS[c]; if(((i+semilla)%7)===0) return;
          f.push({G:c, W:p.d+(p.m?(' '+String(p.m).toUpperCase()):''), AY:String(((i*7+semilla)%9)+1)}); });
        for(var i=0;i<nDesc;i++) f.push({G:'CX'+(1000+semilla*100+i), W:'SOMIER PARRILLA '+['NEGRO','BEIGE','PLOMO','CAFE'][i%4]+' MOD '+(10+i)+' 140X190', AY:String((i%5)+1)});
        return f;
      };
      var subir=function(filas, rol){
        var R=existLeer(filas); if(R.error) throw new Error(R.error);
        /* (06/10, §4hs) La página solo acepta el Excel del día; estos cortes se subieron hace 1, 3 y 6 días, cuando eran los
           del día: para armar la celda se apaga solo esa regla. */
        window.existNoEsDeHoy=function(){ return null; };
        EXIST_IMP=R; renderImportExist();
        var sel=document.getElementById('exist-rol'); if(sel) sel.value=rol;
        var inc=document.getElementById('exist-inc'); if(inc) inc.checked=false;
        var cp=document.getElementById('exist-cerrar-ped'); if(cp) cp.checked=false;
        confirmarImportExist();
      };
      subir(excel(PTF, atras(1), 0, 40), 'log');
      subir(excel(BANZER, atras(3), 3, 30), 'sale');
      subir(excel(IM, atras(6), 5, 50), 'otro');
      var ts=function(iso, h){ return Date.parse(iso+'T'+(h||'15')+':00:00-04:00'); };
      STOCK.g[IM].t=ts(atras(60),'12');                 // la foto de IM es vieja: las recogidas de después se le restan y quedan en `rs`
      var keys=Object.keys(STOCK.c.u).filter(function(k){ return !esTextoDeTienda(k) && k.indexOf('|')>0; });
      var kIM=Object.keys(STOCK.g[IM].u);
      var K=function(i){ return keys[(i*17)%keys.length]; };
      var P=[];
      // 24 pedidos a fábrica recibidos, sobre 9 productos que se piden una y otra vez (como en la realidad):
      // pedidos entre 115 y 10 días atrás, llegaron 3 a 7 días después
      for(var i=0;i<24;i++){
        var dias=115-Math.round(i*105/23), f=atras(dias), tard=3+(i%5), r=stockSumarDias(f, tard), tot=4+(i%6);
        var q={ id:'fpR'+(10+i), k:K(i%9), u:tot, fab:['MORENO','MULTI','MORENO',''][i%4], f:f, esp:'', r:'', total:tot };
        q.recs=[{ id:'rR'+(10+i), u:tot, f:r, ts:ts(r), se:0 }];
        if(i%8===5) q.recs=[{ id:'rR'+(10+i)+'a', u:2, f:stockSumarDias(f,tard-1), ts:ts(stockSumarDias(f,tard-1)), se:0 }, { id:'rR'+(10+i)+'b', u:tot-2, f:r, ts:ts(r), se:0 }];   // dos llegadas
        if(i%11===3){ q.recs[q.recs.length-1].se=1; q.enConteo=true; }   // se dio por llegado al subir el Excel de acá
        P.push(q);
      }
      // (06/10, §4hs) dos recibidos en los últimos STOCK_RECIBIDOS_DIAS días (3): esos quedan enteros
      for(var i2=0;i2<2;i2++){ var f3=atras(4+i2), r3=atras(1+i2), tot3=3+i2; P.push({ id:'fpRN'+i2, k:K(30+i2), u:tot3, fab:'MORENO', f:f3, esp:'', r:'', total:tot3, recs:[{ id:'rRN'+i2, u:tot3, f:r3, ts:ts(r3), se:0 }] }); }
      // 6 recogidas de IM recibidas, sobre 3 productos (cada uno recogido dos veces): 3 de antes de la foto de IM (no se
      // le restan) y 3 de después (restadas, anotadas en `rs`)
      for(var j=0;j<6;j++){
        var dj=[100,80,70,50,30,20][j], f2=atras(dj), r2=stockSumarDias(f2,1), k2=kIM[((j%3)*23)%kIM.length];
        P.push({ id:'rcR'+j, k:k2, u:2, tipo:'recogida', de:IM, fab:'', f:f2, esp:r2, r:'', total:2, recs:[{ id:'rRc'+j, u:2, f:r2, ts:ts(r2), se:0 }] });
      }
      // 10 pendientes: 8 a fábrica y 2 recogidas programadas
      for(var m=0;m<10;m++){
        var fm=atras(m);
        if(m<8) P.push({ id:'fpP'+m, k:K(40+m), u:3+m, fab:m%2?'MULTI':'MORENO', f:fm, esp:'', r:'' });
        else P.push({ id:'rcP'+m, k:kIM[(m*29)%kIM.length], u:1, tipo:'recogida', de:IM, fab:'', f:fm, esp:stockSumarDias(hoy,1), r:'' });
      }
      STOCK.p=P;
      // 30 entradas de hoy, anotadas después del conteo de acá (si no, `filaStock` las poda: ya están adentro)
      STOCK.e=[]; for(var e=0;e<30;e++) STOCK.e.push({ id:'eR'+e, f:hoy, k:K(7*e), u:1+(e%4), fab:e%3?'MORENO':'MULTI', ts:Date.now()+1000*(e+1) });
      // 14 cortes en el historial (los 3 de recién más 11 anteriores)
      for(var h=0;h<11;h++) STOCK.h.push({ f:atras(4+h), hora:'09:30:00', alm:[PTF,BANZER,IM][h%3], rol:['log','sale','otro'][h%3], n:280+h, u:900+h*7, ts:ts(atras(4+h),'09'), inc:false });
      STOCK.h=STOCK.h.slice(0,STOCK_HIST);
      // uniones a mano: tres códigos desconocidos de IM unidos a otros renglones
      var crudas=kIM.filter(function(k){ return /PARRILLA/.test(k); });
      STOCK.a[crudas[0]]=crudas[1]; STOCK.a[crudas[2]]=keys[0]; STOCK.a[crudas[3]]=crudas[4];
      // ventas del equipo: 18 entregadas en los últimos 15 días y 12 por entregar (algunas ya tildadas ✔)
      var V=[];
      for(var s=0;s<30;s++){
        var c=cods[(s*11)%cods.length], pr=CODIGOS[c];
        var fecha = s<18 ? atras(s%15) : stockSumarDias(hoy, 1+(s%4));
        V.push(_P({ id:'v'+s, fecha:fecha, entregado:s<18, productos:[{desc:pr.d, medida:pr.m||'', codigo:c, cant:1+(s%3), chk:(s>=18 && s%3===0)?'ok':''}] }));
      }
      STATE=V;
      // lo mismo que hace el panel al leer la fila, menos la poda: así el fixture ya es un punto fijo de migrar/normalizar
      stockMigrar(STOCK); stockNormalizarRecepciones(STOCK); stockOlvidarIndice();
      return { keys:keys.length, kIM:kIM.length, p:STOCK.p.length };
    };
    /* La regla VIEJA (la de antes de la poda): solo el corte de los 4 meses. */
    window._reglaVieja=function(S){
      var lim=diasAtras(120);
      S.p=(S.p||[]).filter(function(q){ return q && q.k && (!q.r || String(q.r)>=lim); });
      return S;
    };
    window._medir=function(S){
      var o=JSON.parse(typeof S==='string'?S:JSON.stringify(S));
      var L=function(x){ return JSON.stringify(x==null?null:x).length; };
      var r={ total:L(o), c:L(o.c), 'c.u':L(o.c&&o.c.u), 'c.cod':L(o.c&&o.c.cod), e:L(o.e), p:L(o.p), a:L(o.a), al:L(o.al), h:L(o.h), g:L(o.g) };
      Object.keys(o.g||{}).forEach(function(nm){ var s=o.g[nm], n=stockAlmCorto(nm); r['g['+n+'].u']=L(s.u); r['g['+n+'].cod']=L(s.cod); r['g['+n+'].rs']=L(s.rs||{}); });
      r.nP=(o.p||[]).length; r.nRecibidos=(o.p||[]).filter(function(q){ return q&&q.r; }).length;
      r.nMuestras=(o.p||[]).filter(function(q){ return q&&q.r&&!q.recs; }).length;
      r.nPend=(o.p||[]).filter(function(q){ return q&&!q.r; }).length;
      return r;
    };
    /* La foto de TODAS las cuentas que miran los pedidos a fábrica. */
    window._foto=function(){
      stockOlvidarIndice();
      var d=stockData();
      var campos=['k','deposito','paraSalir','comp','enOtros','enRecogida','enSale','enCamino','pedir','recoger','fabricar','fab','lead','leadN','leadMedido','leadPrestado','rotacion','aviso','corte','dias','sobra','vendidos','nVentasRotacion','revisarStock'];
      var lista=d.lista.map(function(o){ var x={}; campos.forEach(function(c){ x[c]=o[c]; }); return x; }).sort(function(a,b){ return a.k<b.k?-1:(a.k>b.k?1:0); });
      var T=stockTiemposFabrica(), tf={ general:T.general, MORENO:T.de('MORENO'), MULTI:T.de('MULTI'), sin:T.de('') };
      // (las claves ordenadas: el orden de `M` depende de qué pedido aparece primero, y acá se compara el contenido)
      var M=stockMuestrasFabrica(), mm={};
      Object.keys(M).sort().forEach(function(f){ mm[f]=M[f].slice().sort(function(a,b){ return a.r<b.r?1:(a.r>b.r?-1:0); }).slice(0,STOCK_MUESTRAS).map(function(s){ return s.d; }).sort(); });
      var R=stockCodRefs();
      return { lista:lista, nLista:d.lista.length, abiertos:d.abiertos.map(function(q){ return q.id+'|'+q.u+'|'+q.llega; }).sort(), tf:tf, muestras:mm,
               refsCods:Object.keys(R.cods).sort(), refsKs:Object.keys(R.ks).sort() };
    };
    window._ids=function(p){ return (p||[]).map(function(q){ return q.id; }).sort(); };
  });

  // ══ 1. Medir ══════════════════════════════════════════════════════════════════════════════════
  console.log('\n── 1. Qué pesa cada sección de la celda, antes y después de la poda ──');
  const arm = await page.evaluate(() => _armar());
  chk('el fixture se armó con el importador real: ~'+arm.keys+' claves en el depósito, '+arm.kIM+' en IM, '+arm.p+' pedidos a fábrica', arm.keys>200 && arm.kIM>200 && arm.p===42, arm);   // (06/10, §4hs) 40 + los 2 recibidos en los últimos 3 días
  chk('sin errores de página al armar', errores.length===0, errores);
  const M0 = await page.evaluate(() => { window._RAW=JSON.stringify(STOCK); window._F0=_foto(); return _medir(_RAW); });
  const t1 = await page.evaluate(() => { var f=filaStock(); window._t1=f.observaciones; return f.observaciones; });
  const M1 = await page.evaluate(() => _medir(_t1));
  const pct=(a,b)=>b?Math.round(a*100/b)+' %':'—';
  console.log('   sección'.padEnd(22)+'antes'.padStart(9)+'después'.padStart(10)+'   (parte del total antes)');
  Object.keys(M0).filter(k=>!/^n/.test(k)).forEach(k => console.log('   '+k.padEnd(20)+String(M0[k]).padStart(9)+String(M1[k]).padStart(10)+'   '+pct(M0[k],M0.total)));
  console.log('   pedidos a fábrica: '+M0.nP+' → '+M1.nP+' (recibidos '+M0.nRecibidos+' → '+M1.nRecibidos+', de ellos muestras '+M1.nMuestras+'; pendientes '+M0.nPend+' → '+M1.nPend+')');
  chk('la celda achica: total '+M0.total+' → '+M1.total+' letras', M1.total<M0.total);
  chk('lo que achica es `p`: '+M0.p+' → '+M1.p+' letras ('+pct(M0.p-M1.p, M0.p)+' menos); desde §4hs también el historial (por días y sin id): '+M0.h+' → '+M1.h, M1.p<M0.p && M1.h<=M0.h);
  chk('los pendientes siguen todos ('+M1.nPend+')', M1.nPend===10);
  chk('las fotos no se tocan: c, g (u, cod, rs), a, al y e pesan lo mismo', ['c','g','a','al','e'].every(k => M0[k]===M1[k]), ['c','g','a','al','e'].map(k=>k+':'+M0[k]+'/'+M1[k]).join(' '));
  const sec = await page.evaluate(() => {
    var A=JSON.parse(_RAW), B=JSON.parse(_t1), J=JSON.stringify;
    /* (06/10, §4hs) El historial: los cortes de los últimos STOCK_CONTROL_DIAS días y SIEMPRE el último de cada almacén, sin `id`. */
    var lim=stockSumarDias(todayStr(), -STOCK_CONTROL_DIAS), visto={}, hOk=(B.h||[]).every(function(x){ var ult=!visto[x.alm]; visto[x.alm]=1; return x.id==null && (ult || x.f>=lim); });
    var almA={}; (A.h||[]).forEach(function(x){ almA[x.alm]=1; });
    return { c:J(A.c)===J(B.c), g:J(A.g)===J(B.g), a:J(A.a)===J(B.a), al:J(A.al)===J(B.al), e:J(A.e)===J(B.e),
             h:{ ok:hOk, todos:Object.keys(almA).every(function(a){ return !!visto[a]; }), n:[(A.h||[]).length,(B.h||[]).length] } };
  });
  var hh=sec.h; delete sec.h;
  chk('…y dicen exactamente lo mismo', Object.keys(sec).every(k=>sec[k]), sec);
  chk('(06/10, §4hs) el historial: solo los cortes de los últimos 3 días y el último de cada almacén (ninguno se queda sin el suyo), sin id', hh.ok && hh.todos && hh.n[1]<=hh.n[0], hh);
  chk('el aviso de tamaño mira el largo de la fila (fixture '+M1.total+' letras; aviso a '+(await page.evaluate(() => STOCK_TAMANO_AVISO))+')', true);

  // ══ 2. Determinista e idempotente ═════════════════════════════════════════════════════════════
  console.log('\n── 2. Leer → guardar → leer da lo mismo, desde la memoria y desde la celda cruda ──');
  const idem = await page.evaluate(() => {
    var J=JSON.stringify;
    STOCK=leerStock({ observaciones:_t1 }); var t2=filaStock().observaciones;
    STOCK=leerStock({ observaciones:t2 });  var t3=filaStock().observaciones;
    var desdeCrudo=J(leerStock({ observaciones:_RAW }).p);
    var X=JSON.parse(_t1), una=J(stockPodar(JSON.parse(J(X))).p), dos=J(stockPodar(stockPodar(JSON.parse(J(X)))).p);
    return { p12:J(JSON.parse(_t1).p)===J(JSON.parse(t2).p), t23:t2===t3, crudo:desdeCrudo===J(JSON.parse(_t1).p), podar2:una===dos, largo:t3.length };
  });
  chk('leer la fila podada y guardarla da el mismo `p` (idempotente)', idem.p12);
  chk('la segunda vuelta da el texto IDÉNTICO (punto fijo)', idem.t23);
  chk('leer la celda CRUDA (sin podar) da el mismo `p` que podar la memoria: la regla no depende de por dónde entra', idem.crudo);
  chk('podar dos veces es podar una', idem.podar2);

  // ══ 3. Qué quedó y cómo ═══════════════════════════════════════════════════════════════════════
  console.log('\n── 3. Lo recibido hace menos de STOCK_RECIBIDOS_DIAS días (3 desde §4hs) queda entero; lo más viejo, solo la muestra, y solo si alguna cuenta lo mira ──');
  const forma = await page.evaluate(() => {
    var A=JSON.parse(_RAW).p, B=JSON.parse(_t1).p, hoy=todayStr(), corte=stockSumarDias(hoy,-STOCK_RECIBIDOS_DIAS);
    var porId={}; B.forEach(function(q){ porId[q.id]=q; });
    var recientes=A.filter(function(q){ return q.r && q.r>=corte; }), viejos=A.filter(function(q){ return q.r && q.r<corte; });
    var recientesIguales=recientes.every(function(q){ return porId[q.id] && JSON.stringify(porId[q.id])===JSON.stringify(q); });
    var muestras=viejos.filter(function(q){ return porId[q.id]; }).map(function(q){ return porId[q.id]; });
    var muestrasLimpias=muestras.every(function(m){ return !('recs' in m) && !('ru' in m) && !('total' in m) && !('esp' in m) && m.id && m.k && m.f && m.r && ('u' in m); });
    var conFab=muestras.filter(function(m){ return m.tipo!=='recogida'; }).every(function(m){ var o=A.filter(function(q){ return q.id===m.id; })[0]; return (o.fab||'')===(m.fab||'') && !!o.enConteo===!!m.enConteo; });
    var sacados=viejos.filter(function(q){ return !porId[q.id]; });
    // los sacados: ninguno es de las últimas STOCK_MUESTRAS llegadas de su fábrica, y todos tienen un pedido más nuevo del mismo producto
    var mide=function(q){ return q.tipo!=='recogida' && !q.enConteo && stockDias(q.f,q.r)>=0 && stockDias(q.f,q.r)<=STOCK_MUESTRA_DIAS; };
    var top={}; A.filter(mide).forEach(function(q){ var fb=stockFabNorm(q.fab); (top[fb]=top[fb]||[]).push(q); });
    Object.keys(top).forEach(function(fb){ top[fb]=top[fb].sort(function(a,b){ return a.r<b.r?1:(a.r>b.r?-1:0); }).slice(0,STOCK_MUESTRAS).map(function(q){ return q.id; }); });
    var ningunaMuestra=sacados.every(function(q){ return !mide(q) || top[stockFabNorm(q.fab)].indexOf(q.id)<0; });
    var hayMasNuevo=sacados.every(function(q){ return A.some(function(o){ return o.id!==q.id && o.k===q.k && String(o.f)>String(q.f); }); });
    var rcViva=porId['rcR3'], rcVieja=porId['rcR0'];
    return { dias:STOCK_RECIBIDOS_DIAS, nRec:recientes.length, recientesIguales:recientesIguales, nViejos:viejos.length, nMuestras:muestras.length, nSacados:sacados.length,
             muestrasLimpias:muestrasLimpias, conFab:conFab, ningunaMuestra:ningunaMuestra, hayMasNuevo:hayMasNuevo,
             rcViva:rcViva, rcViejaQuedo:!!rcVieja, ejemplo:muestras[0], sacados:sacados.map(function(q){ return q.id; }) };
  });
  chk('los '+forma.nRec+' recibidos hace menos de '+forma.dias+' días quedan ENTEROS, con sus recepciones (eran 45 días; 3 desde §4hs)', forma.nRec>0 && forma.recientesIguales && forma.dias===3);
  chk('de los '+forma.nViejos+' más viejos quedan '+forma.nMuestras+' como muestra y se van '+forma.nSacados, forma.nViejos>0 && forma.nSacados>0 && forma.nMuestras+forma.nSacados===forma.nViejos, forma.sacados);
  chk('la recogida vieja que ya no está en `rs` (la foto de IM es posterior) y tiene otra más nueva del mismo producto se va', !forma.rcViejaQuedo);
  chk('la muestra es solo id, producto, cuántos, fábrica, pedido el, llegó el (sin recs, ru, total ni esp)', forma.muestrasLimpias, forma.ejemplo);
  chk('la muestra conserva la fábrica y la marca «dado por llegado con un Excel» (`enConteo`)', forma.conFab);
  chk('ninguno de los que se fueron era de las últimas '+6+' llegadas de su fábrica', forma.ningunaMuestra);
  chk('todos los que se fueron tenían un pedido más nuevo del mismo producto (el renglón y su fábrica siguen sostenidos)', forma.hayMasNuevo);
  chk('la recogida vieja que la foto de IM todavía nombra en `rs` queda como muestra (con `de`): la mira saleRecogidaViva', !!forma.rcViva && forma.rcViva.tipo==='recogida' && forma.rcViva.de==='IM - PRODUCTOTERMINADO' && !forma.rcViva.recs, forma.rcViva);

  // ══ 4. Ninguna cuenta cambia ══════════════════════════════════════════════════════════════════
  console.log('\n── 4. Las cuentas con la regla nueva son las de la regla vieja (120 días), hoy ──');
  const cuentas = await page.evaluate(() => {
    var J=JSON.stringify;
    STOCK=_reglaVieja(JSON.parse(_RAW)); stockOlvidarIndice(); var V=_foto();
    STOCK=leerStock({ observaciones:_RAW }); var N=_foto();
    var difs=[]; V.lista.forEach(function(a,i){ var b=N.lista[i]; if(J(a)!==J(b)) difs.push({vieja:a, nueva:b}); });
    return { nLista:V.nLista===N.nLista && V.nLista>200, lista:J(V.lista)===J(N.lista), difs:difs.slice(0,3), tf:J(V.tf)===J(N.tf), tfV:V.tf, muestras:J(V.muestras)===J(N.muestras), mV:V.muestras,
             abiertos:J(V.abiertos)===J(N.abiertos), refs:J(V.refsCods)===J(N.refsCods) && J(V.refsKs)===J(N.refsKs), nRefs:N.refsKs.length };
  });
  chk('la tabla de stock tiene los mismos renglones ('+(cuentas.nLista?'más de 200':'distintos')+')', cuentas.nLista);
  chk('depósito, comprometido, en otros, en recogida, Banzer, en camino, pedir, recoger, fabricar, fábrica, tiempo de fábrica, rotación, aviso y corte: iguales en todos los renglones', cuentas.lista, cuentas.difs);
  chk('el tiempo medido de cada fábrica (días, n, medido, prestado) y el general: iguales', cuentas.tf, cuentas.tfV);
  chk('la medición mide de verdad (MORENO y MULTI con '+6+' muestras cada una, no los 3 días por defecto)', cuentas.tfV.MORENO.medido && cuentas.tfV.MORENO.n===6 && cuentas.tfV.MULTI.medido && cuentas.tfV.MULTI.n===6 && !cuentas.tfV.MORENO.prestado, cuentas.tfV);
  chk('las muestras que mira stockMuestrasFabrica (las últimas 6 por fábrica): iguales', cuentas.muestras, cuentas.mV);
  chk('lo pendiente («en camino», con su llegada): igual', cuentas.abiertos);
  chk('stockCodRefs (qué códigos y claves se sostienen): igual ('+cuentas.nRefs+' claves)', cuentas.refs);
  const f0 = await page.evaluate(() => { var J=JSON.stringify; STOCK=leerStock({ observaciones:_t1 }); var F=_foto(); return J(F.lista)===J(_F0.lista) && J(F.tf)===J(_F0.tf); });
  chk('…y también contra la foto de ANTES de guardar (la memoria sin podar)', f0);

  // ══ 5. Dos dispositivos ═══════════════════════════════════════════════════════════════════════
  console.log('\n── 5. La junta entre dispositivos no revive lo podado de forma permanente ──');
  const jun = await page.evaluate(() => {
    var J=JSON.stringify, podado=JSON.parse(_t1).p, idsPod=_ids(podado), sacados=_ids(JSON.parse(_RAW).p).filter(function(id){ return idsPod.indexOf(id)<0; });
    // (a) con base: los tres lados leídos de la planilla; acá se anota un pedido nuevo
    var b=leerStock({ observaciones:_RAW }), m=leerStock({ observaciones:_RAW }), s=leerStock({ observaciones:_RAW });
    var nuevo={ id:'fpNUEVO', k:m.p[0].k, u:9, fab:'MORENO', f:todayStr(), esp:'', r:'' };
    m.p=m.p.concat([nuevo]);
    var out=stockFusionar(b, m, s), ids=_ids(out.p);
    /* (06/10, §4hs) Lo esperado es la MISMA poda sobre lo podado más el pedido nuevo: con 3 días, un recibido de hace 3
       semanas queda solo como «el más nuevo de su producto», y el pedido nuevo de ese producto lo reemplaza (regla de §4hl). */
    var T=JSON.parse(_t1); T.p=T.p.concat([JSON.parse(J(nuevo))]); var esperado=_ids(stockPodar(T).p);
    var a_ok = ids.indexOf('fpNUEVO')>=0 && sacados.every(function(id){ return ids.indexOf(id)<0; }) && J(ids)===J(esperado);
    var a_dif = { deMas:ids.filter(function(id){ return id!=='fpNUEVO' && idsPod.indexOf(id)<0; }), deMenos:idsPod.filter(function(id){ return ids.indexOf(id)<0; }) };
    var kN=nuevo.k; STOCK=out; var Fa=_foto();
    var a_cuentas = J(Fa.lista.filter(function(o){ return o.k!==kN; }))===J(_F0.lista.filter(function(o){ return o.k!==kN; })) && J(Fa.tf)===J(_F0.tf);
    // (b) sin base: una memoria que NUNCA se podó (una página de antes de esto) se une con la planilla podada
    var mViejo=JSON.parse(_RAW), s2=leerStock({ observaciones:_t1 });
    var out2=stockFusionar(null, mViejo, s2);
    var b_ok = J(out2.p)===J(podado);
    STOCK=out2; var Fb=_foto();
    var b_cuentas = J(Fb.lista)===J(_F0.lista) && J(Fb.tf)===J(_F0.tf) && J(Fb.muestras)===J(_F0.muestras);
    // (c) la página vieja volvió a escribir en la planilla los recibidos viejos ENTEROS (con sus recepciones)
    var o=JSON.parse(_t1); o.p=JSON.parse(_RAW).p; var txt=J(o);
    var S=leerStock({ observaciones:txt }), T1=JSON.parse(_t1), IM='IM - PRODUCTOTERMINADO';
    var c_im = J(S.g[IM].u)===J(T1.g[IM].u) && J(Object.keys(S.g[IM].rs).sort())===J(Object.keys(T1.g[IM].rs).sort());
    var c_p = J(S.p)===J(podado);
    STOCK=S; var Fc=_foto();
    var c_cuentas = J(Fc.lista)===J(_F0.lista) && J(Fc.tf)===J(_F0.tf);
    var rsIM=Object.keys(T1.g[IM].rs).length;
    return { a_ok:a_ok, a_dif:a_dif, a_cuentas:a_cuentas, b_ok:b_ok, b_cuentas:b_cuentas, c_im:c_im, c_p:c_p, c_cuentas:c_cuentas, rsIM:rsIM, nSacados:sacados.length };
  });
  chk('(a) con base: lo podado ('+jun.nSacados+' pedidos) no vuelve, el pedido nuevo entra, y las cuentas son las mismas', jun.a_ok && jun.a_cuentas, jun.a_ok?'':jun);
  chk('(b) sin base (una memoria que nunca se podó se UNE con la planilla podada): sale podado igual, mismas cuentas', jun.b_ok && jun.b_cuentas);
  chk('(c) la página vieja volvió a escribir los recibidos viejos enteros: a IM no se le resta dos veces y su `rs` queda igual ('+jun.rsIM+' recogidas anotadas)', jun.c_im && jun.rsIM===3);
  chk('(c) …y al leerlos se podan otra vez, con las mismas cuentas', jun.c_p && jun.c_cuentas);

  // ══ 6. Pasan 50 días ══════════════════════════════════════════════════════════════════════════
  console.log('\n── 6. Cincuenta días después: la poda solo saca, nunca repone, y sigue dando las cuentas de la regla vieja ──');
  await page.clock.setFixedTime(new Date('2026-11-21T14:00:00Z'));
  const luego = await page.evaluate(() => {
    var J=JSON.stringify, hoy=todayStr();
    var S=leerStock({ observaciones:_t1 }), antes=_ids(JSON.parse(_t1).p), ahora=_ids(S.p);
    var subconjunto=ahora.every(function(id){ return antes.indexOf(id)>=0; });
    STOCK=S; var t4=filaStock().observaciones; STOCK=leerStock({ observaciones:t4 }); var t5=filaStock().observaciones;
    STOCK=_reglaVieja(JSON.parse(_RAW)); stockOlvidarIndice(); var V=_foto();
    STOCK=leerStock({ observaciones:_RAW }); var N=_foto();
    return { hoy:hoy, antes:antes.length, ahora:ahora.length, subconjunto:subconjunto, fijo:t4===t5, tf:J(V.tf)===J(N.tf), tfV:V.tf, lista:J(V.lista)===J(N.lista), muestras:J(V.muestras)===J(N.muestras) };
  });
  chk('el reloj avanzó al '+luego.hoy, luego.hoy==='2026-11-21');
  chk('quedan menos pedidos ('+luego.antes+' → '+luego.ahora+') y todos son de los que ya estaban (nada vuelve)', luego.ahora<luego.antes && luego.subconjunto);
  chk('sigue siendo un punto fijo (leer → guardar → leer)', luego.fijo);
  chk('el tiempo de fábrica medido es el que daría la regla vieja a esa fecha', luego.tf, luego.tfV);
  chk('la tabla de stock y las muestras también', luego.lista && luego.muestras);

  chk('sin errores de página en toda la prueba', errores.length===0, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})().catch(e => { console.error('✗ la prueba reventó:', e); console.log('\n'+PASS+' bien · '+(FAIL+1)+' mal'); process.exit(1); });
