/* 📒💵 MAYOR Y SALDOS DEL EFECTIVO — antes «efectivo a una fecha» (09/11/2026; el dueño: «En contabilidad se llama Mayor y saldos»; Contabilidad, por el dueño: «¿cuánto efectivo pendiente de retiro tenía Juan Pablo el 2 de
   noviembre, el 5 y el 8? … no tenemos una forma o historial de ver eso» → «si hazlo»).

   LO QUE CUIDA (datos inventados, los mismos de test_efe_pareo; reloj CLAVADO el lunes 09/11/2026 19:00 de Bolivia):
   1. El botón «📅 Efectivo a una fecha» está en el Cuadre y abre la ventana en el día de hoy.
   2. Al cierre de un día pasado, lo que cada uno tenía SIN RECOGER sale de la MISMA regla del Cuadre cortada en los retiros de hasta ese
      día: Juan Pablo al 02/11 nada de noviembre (🔒 3.990 de octubre), al 05/11 Bs 3.630 (recogido todo el 06/11), al 06/11 nada.
   3. Mauricio: al 04/11 Bs 3.290 (se recogió el 07/11); al 07/11 le quedan 1.480 que hoy todavía faltan.
   4. Un chofer (Luis Pierre) tiene lo que cobró en la puerta; Fernando lo suyo.
   5. Hoy da lo mismo que «Le queda en la mano» del Cuadre del mes, persona por persona.
   6. El día por día termina en el mismo número que la tabla, y cada día cuadra: queda(ayer) + cobró − lo que tapó ese día = queda(hoy).
   7. Un retiro de octubre por plata de septiembre se ve como «no tapa ningún cobro».
   8. La pantalla: Saldos y Mayor, abrir una venta y «← Volver al mayor y saldos», ◀ ▶ sin pasar de hoy ni de octubre, «Desde», «Todas las
      cuentas», Copiar y Excel (3 hojas).
   9. Cada persona es una cuenta de caja: debe = cobró, haber = retiros y el «🔒 cierre de octubre» (el 03/11); saldo anterior + debe − haber
      = saldo, nunca negativo, y hoy = el Cuadre.
   Se corre:  node tests/test_efectivo_fecha.js   (PEDIDOS=… para correrla contra otra versión) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1280, height:900 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await ctx.route(/^https:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-11-09T19:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  const r = await page.evaluate(async () => {
    var out={};
    if(typeof abrirEfectivoFecha!=='function'){ out.falta=true; return out; }
    var c0=document.getElementById('conn-form'); if(c0) c0.style.display='none';
    CONNECTED=true; UNLOCKED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR=''; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    var esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
    var P=function(id, v, cli, cobros, ts){ return { id:id, oc:'11-'+id.replace(/\D/g,''), vendedor:v, cliente:cli, celular:'70001001', zona:'Norte', turno:'AM', nota:'9'+id.replace(/\D/g,''),
      fecha:'2026-11-20', productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:9000 }], saldo:0, acuenta:0, pagado:false,
      ts:new Date((ts||'2026-10-05')+'T11:00:00-04:00').getTime(), metodoPago:textoCobros(cobros.map(function(c, i){ return Object.assign({ metodo:'Efectivo', nota:String(100+i) }, c); })) }; };
    var R=function(id, v, monto, dia){ return { id:'__ret_'+id+'__', fecha:'', cliente:'💵 RETIRO DE EFECTIVO — fila del sistema, NO BORRAR', vendedor:v, chofer:'Contabilidad',
      acuenta:monto, zona:'FACTURADO', nota:'', ts:new Date(dia+'T12:00:00-04:00').getTime() }; };
    var L=[
      // 1. Mirian
      P('m1', 'Mirian Salazar', 'CLIENTE AQUIN', [{ monto:5440, fecha:'2026-10-30' }], '2026-10-27'),
      P('m2', 'Mirian Salazar', 'CLIENTE SARAVIA', [{ monto:2140, fecha:'2026-11-03' }], '2026-11-03'),
      R('m1', 'Mirian Salazar', 5440, '2026-11-03'), R('m2', 'Mirian Salazar', 2140, '2026-11-03'),
      // 2. Mauricio
      P('d1', 'Mauricio Merida', 'CLIENTE OCTUBRE', [{ monto:1000, fecha:'2026-10-20' }]),
      R('d1', 'Mauricio Merida', 1000, '2026-10-25'),
      P('d5', 'Mauricio Merida', 'CLIENTE SIN RETIRO', [{ monto:400, fecha:'2026-10-21' }]),   // lo de octubre que nadie retiró: con la regla vieja se comía parte del retiro de noviembre
      P('d2', 'Mauricio Merida', 'CLIENTE ALGARANAZ', [{ monto:700, fecha:'2026-11-03' }], '2026-11-03'),
      P('d3', 'Mauricio Merida', 'CLIENTE SALAS', [{ monto:2590, fecha:'2026-11-04' }], '2026-11-04'),
      P('d4', 'Mauricio Merida', 'CLIENTE VELEZ', [{ monto:1480, fecha:'2026-11-07' }], '2026-11-07'),
      R('d2', 'Mauricio Merida', 3290, '2026-11-07'),
      // 3. Juan Pablo
      P('j1', 'Juan Pablo Paredes', 'CLIENTE DIEZ', [{ monto:3000, fecha:'2026-10-10' }]),
      P('j2', 'Juan Pablo Paredes', 'CLIENTE PENA', [{ monto:990, fecha:'2026-10-31' }]),
      P('j3', 'Juan Pablo Paredes', 'CLIENTE CARLOS', [{ monto:910, fecha:'2026-11-03' }], '2026-11-03'),
      P('j4', 'Juan Pablo Paredes', 'CLIENTE ROMERO', [{ monto:1480, fecha:'2026-11-03' }], '2026-11-03'),
      P('j5', 'Juan Pablo Paredes', 'CLIENTE PERALTA', [{ monto:1240, fecha:'2026-11-05' }], '2026-11-05'),
      R('j1', 'Juan Pablo Paredes', 1000, '2026-11-03'), R('j2', 'Juan Pablo Paredes', 4620, '2026-11-06'),
      // 4. Isabel: septiembre rendido en octubre
      P('i1', 'Isabel Robledo', 'CLIENTE SEPTIEMBRE', [{ monto:300, fecha:'2026-09-28' }], '2026-09-20'),
      R('i1', 'Isabel Robledo', 300, '2026-10-02'),
      // 7. Fernando: una venta suya que cobró un chofer
      P('f1', 'Fernando Peinado', 'CLIENTE PROPIO', [{ monto:800, fecha:'2026-11-05' }], '2026-11-05'),
      P('f2', 'Fernando Peinado', 'CLIENTE PUERTA', [{ monto:500, fecha:'2026-11-04', recibio:'Luis Pierre' }], '2026-11-04')
    ];
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(L)) }); };
    apiSave=function(x){ return Promise.resolve({ ok:true, pedido:x }); };
    await refrescarEstado(); await esperar(150);
    showView('conta'); await esperar(150);
    try{ setContaTab('cuadre'); }catch(e){}
    segSet('cua-mode', 'mes'); document.getElementById('cua-mes').value='2026-11'; document.getElementById('cua-vendedor').value='';
    renderCuadre(); await esperar(80);
    var pick=function(o){ return o ? { cob:o.cob, ret:o.ret, aMes:o.aMes, aAnt:o.aAnt, sobra:o.sobra, mano:o.mano, ant:o.ant, antCerr:o.antCerr,
                                       todo:o.recogioTodo, ult:o.recogioUlt, falta:o.faltaHoy, chofer:o.chofer, nPend:o.pend.length } : null; };
    var K=function(n){ return normNombre(n); };
    var d=function(D, n){ return pick(efdDatos(D).por[K(n)]); };
    out.jp={ d02:d('2026-11-02','Juan Pablo Paredes'), d05:d('2026-11-05','Juan Pablo Paredes'), d06:d('2026-11-06','Juan Pablo Paredes'), d08:d('2026-11-08','Juan Pablo Paredes') };
    out.mau={ d04:d('2026-11-04','Mauricio Merida'), d07:d('2026-11-07','Mauricio Merida') };
    out.fer05=d('2026-11-05','Fernando Peinado'); out.lp05=d('2026-11-05','Luis Pierre');
    out.isa=d('2026-10-05','Isabel Robledo');
    out.tot02=efdDatos('2026-11-02').tot;
    /* 5. hoy = el Cuadre del mes */
    var E=cuadreEfectivo({ modo:'mes', val:'2026-11' }, ''), X=efdDatos('2026-11-09'), cmp=[];
    E.filas.forEach(function(o){ var e=X.por[K(o.nombre)]; cmp.push([o.nombre, o.falta, e?e.mano:0]); });
    out.cmp=cmp;
    /* 6. el día por día */
    var malDia=[];
    ['Juan Pablo Paredes','Mauricio Merida','Mirian Salazar','Fernando Peinado','Luis Pierre'].forEach(function(n){
      var k=K(n), dd=efdDias(k, '2026-11-09'), prev=null;
      dd.forEach(function(e){ var x=efdDatos(e.f).por[k]; var m=x?x.mano:0, a=x?(x.ant+x.antCerr):0;
        if(Math.abs(m-e.mano)>0.005 || Math.abs(a-e.ant)>0.005) malDia.push([n, e.f, e.mano, m, e.ant, a]);
        if(prev && e.mano>prev.mano+e.cob+0.005) malDia.push([n, e.f, 'sube sin cobro']); prev=e; });
    });
    out.malDia=malDia;
    out.diasJP=efdDias(K('Juan Pablo Paredes'), '2026-11-09').map(function(e){ return [e.f, e.cob, e.ret, e.mano, e.ant]; });
    /* 9. el MAYOR y los SALDOS (cuentas de caja: debe = cobró, haber = retiros y cierres) */
    var sal=function(D){ var S=mysSaldos(D), o={}; S.filas.forEach(function(f){ o[f.nombre]={ ini:f.ini, debe:f.debe, haber:f.haber, saldo:f.saldo, mes:f.mes }; }); o._tot=S.tot; return o; };
    out.s05=sal('2026-11-05'); out.s02=sal('2026-11-02'); out.s09=sal('2026-11-09'); out.s1005=sal('2026-10-05');
    out.mayJP=mysMovs(K('Juan Pablo Paredes'), '2026-11-09').map(function(m){ return [m.f, m.tipo, m.debe, m.haber, m.saldo]; });
    out.mayIsa=mysMovs(K('Isabel Robledo'), '2026-11-09').map(function(m){ return [m.f, m.tipo, m.debe, m.haber, m.saldo]; });
    var neg=[], ks={}; var PR=efePareo(); Object.keys(PR.cob).forEach(function(k){ ks[k]=1; }); PR.ret.forEach(function(x){ ks[x.k]=1; });
    Object.keys(ks).forEach(function(k){ mysMovs(k,'2026-11-09').forEach(function(m){ if(m.saldo<-0.005) neg.push([k, m.f, m.saldo]); }); });
    out.neg=neg;
    var cuad=[]; ['2026-10-20','2026-11-02','2026-11-04','2026-11-07','2026-11-09'].forEach(function(D){ mysSaldos(D).filas.forEach(function(f){ if(Math.abs(f.ini+f.debe-f.haber-f.saldo)>0.005) cuad.push([D, f.nombre, f.ini, f.debe, f.haber, f.saldo]); }); });
    out.cuadra=cuad;
    /* 8. la pantalla */
    var bt=document.getElementById('efd-btn'); out.hayBtn=!!bt; out.btnTxt=bt?bt.innerText:'';
    if(bt) bt.click(); await esperar(150);
    out.diaIni=(document.getElementById('efd-dia')||{}).value||'';
    out.txtHoy=(document.getElementById('efd')||{}).innerText||'';
    out.desdeOculto=document.getElementById('mys-desde-box').hidden;
    efdElegirDia('2026-11-05'); await esperar(80);
    out.txt05=document.getElementById('efd').innerText.replace(/\s+/g,' ');
    efdMover(1); await esperar(60); out.dMas=EFD.d;
    efdMover(10); await esperar(60); out.dTope=EFD.d;
    efdElegirDia('2026-09-15'); await esperar(60); out.dMin=EFD.d;
    efdElegirDia('2026-11-05'); await esperar(60);
    var fj=[].slice.call(document.querySelectorAll('#efd-cuerpo tr.efe-fila')).filter(function(t){ return /Juan Pablo/.test(t.innerText); })[0];
    if(fj) fj.click(); await esperar(100);
    out.vistaMayor={ vista:EFD.vista, q:EFD.q, desdeVisible:!document.getElementById('mys-desde-box').hidden, desde:(document.getElementById('mys-desde')||{}).value };
    out.det=document.getElementById('efd').innerText.replace(/\s+/g,' ');
    var cob=document.querySelector('#efd-cuerpo .mys-tab tr.efe-fila'); if(cob){ cob.click(); await esperar(150); }
    var vol=document.getElementById('pc-volver'); out.volTxt=vol?vol.innerText:'';
    if(vol){ vol.click(); await esperar(150); }
    out.qJP=normNombre('Juan Pablo Paredes');
    out.volvio={ hay:!!document.getElementById('efd'), d:(document.getElementById('efd-dia')||{}).value, q:EFD.q, vista:EFD.vista };
    var copiado=''; var cp=copyText; copyText=function(t){ copiado=t; };
    efdCopiar(); out.copiaMayor=copiado;
    mysCuenta(''); await esperar(60); out.bloques=document.querySelectorAll('#efd-cuerpo .mys-blq').length;
    mysDesde('2026-11-04'); await esperar(60); out.desde04=(document.getElementById('efd').innerText.match(/03\/11\s+Saldo anterior/)||[]).length;
    mysDesde('');
    mysVista('saldos'); await esperar(60);
    efdCopiar(); copyText=cp; out.copia=copiado;
    var hojas=null, nom=''; var bx=buildXlsx, dl=downloadBlob;
    buildXlsx=function(h){ hojas=h; return new Uint8Array(1); }; downloadBlob=function(b, n){ nom=n; };
    efdExcel(); buildXlsx=bx; downloadBlob=dl;
    out.xls={ nom:nom, hojas:hojas?hojas.map(function(h){ return h.name; }):[],
              jp:hojas?JSON.stringify(hojas[0].matrix.filter(function(f){ return f[0]==='Caja · Juan Pablo Paredes'; })[0]):'',
              may:hojas?hojas[1].matrix.length:0 };
    /* 10. la revisión de Fable (10/11) */
    if(hojas){ var det=hojas[2].matrix.slice(1), sr=0; det.forEach(function(f){ if(f[7] && typeof f[7]==='object') sr=r2(sr+f[7].v); });
      out.xlsSin={ suma:sr, pos:mysSaldos('2026-11-05').tot.pos, jpOct10:det.filter(function(f){ return f[0]==='Caja · Juan Pablo Paredes' && f[1]===fmtFecha('2026-10-10'); }).length,
                   plata:det.every(function(f){ return !f[7] || (typeof f[7]==='object' && f[7].t==='n' && f[7].s===2); }) }; }
    /* 10b la lista de lo sin recoger de cada cuenta suma su saldo, todos los días del 01/10 al 09/11 */
    var malLista=[], PR2=efePareo(), ks2={}; Object.keys(PR2.cob).forEach(function(k){ ks2[k]=1; }); PR2.ret.forEach(function(x){ ks2[x.k]=1; });
    for(var dd2='2026-10-01', n2=0; dd2<='2026-11-09' && n2<60; dd2=stockSumarDias(dd2,1), n2++){
      var X2=efdDatos(dd2);
      Object.keys(ks2).forEach(function(k){ var e=X2.por[k], ex=mysExtras(k, dd2), s=0; (e?e.pend:[]).forEach(function(x){ s=r2(s+x.saldo); });
        s=r2(s+ex.antes-ex.demas); var sal=mysSaldoAl(mysMovs(k, dd2), dd2); if(Math.abs(s-sal)>0.005) malLista.push([k, dd2, s, sal]); });
    }
    out.malLista=malLista;
    /* 10c el Mayor desde el 01/10 trae también las cuentas que no se movieron en noviembre (Isabel) */
    mysVista('mayor'); mysCuenta(''); mysDesde('2026-10-01'); efdElegirDia('2026-11-09'); await esperar(60);
    out.ctasOct=[].slice.call(document.querySelectorAll('#mys-cta option')).map(function(o){ return o.textContent; });
    /* 10d reabrir desde el botón: hoy, Saldos, sin «Desde» */
    closeModal(); await esperar(40); document.getElementById('efd-btn').click(); await esperar(120);
    out.reabre={ vista:EFD.vista, d:EFD.d, desde:EFD.desde, q:EFD.q };
    /* 10e una vendedora del Cuadre sin ningún movimiento sale con su nombre */
    closeModal(); abrirEfectivoFecha('', normNombre('Andrea Orias'), 'Andrea Orias'); await esperar(80);
    out.andrea=(document.getElementById('efd')||{}).innerText||'';
    closeModal();
    /* 10f un retiro que no tapa nada (Carola, 04/11) y un cobro tildado con fecha posterior al retiro (María, cobro 08/11, retiro 06/11) */
    var mf=P('mf1', 'Maria Flores', 'CLIENTE FECHA', [{ monto:300, fecha:'2026-11-08' }], '2026-11-08');
    var rmf=R('mf1', 'Maria Flores', 300, '2026-11-06'); rmf.garantia='efe:mf1|2026-11-08|300';
    var L2=L.concat([R('cz1', 'Carola Chavez', 500, '2026-11-04'), mf, rmf]);
    var posAntes=mysSaldos('2026-11-09').tot.pos;
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(L2)) }); };
    await refrescarEstado(); await esperar(150);
    var T9=mysSaldos('2026-11-09').tot; out.neg9={ posAntes:posAntes, pos:T9.pos, neg:T9.neg, nNeg:T9.nNeg };
    abrirEfectivoFecha('', ''); await esperar(80); out.txtNeg=document.getElementById('efd').innerText.replace(/\s+/g,' ');
    efdPersona(normNombre('Carola Chavez')); await esperar(80); out.txtCarola=document.getElementById('efd').innerText.replace(/\s+/g,' ');
    efdPersona(normNombre('Maria Flores')); efdElegirDia('2026-11-07'); await esperar(80); out.txtMaria=document.getElementById('efd').innerText.replace(/\s+/g,' ');
    var cp2=copyText, cop2=''; copyText=function(t){ cop2=t; }; mysVista('saldos'); efdCopiar(); copyText=cp2; out.copiaNeg=cop2;
    closeModal();
    return out;
  });
  if(r.falta){ chk('existe abrirEfectivoFecha', false); console.log('\n'+PASS+' bien · '+FAIL+' mal'); await browser.close(); process.exit(1); }
  /* 10i en el celular (390 px) los Saldos van en dos columnas, la cuenta (con lo cobrado, lo retirado y de qué es debajo del nombre) y su saldo */
  await page.setViewportSize({ width:390, height:844 });
  const cel = await page.evaluate(async () => {
    abrirEfectivoFecha('', ''); await new Promise(function(r){ setTimeout(r, 150); });
    var th=document.querySelector('.mys-sal th:nth-child(2)'), th6=document.querySelector('.mys-sal th:nth-child(6)'), de=document.querySelector('.mys-sal .mys-de-in'), tw=document.querySelector('#efd .tw');
    var th3=document.querySelector('.mys-sal th:nth-child(3)'); var o={ th3:th3?getComputedStyle(th3).display:'', deTxt:de?de.innerText:'', th2:th?getComputedStyle(th).display:'', th6:th6?getComputedStyle(th6).display:'', de:de?getComputedStyle(de).display:'', sw:document.documentElement.scrollWidth,
            tabla:(document.querySelector('.mys-sal')||{}).scrollWidth||0, caja:tw?tw.clientWidth:0 };
    closeModal(); return o;
  });
  const near=(a,b)=>Math.abs((a||0)-(b||0))<0.006;
  // 1
  chk('1a el botón 📅 Efectivo a una fecha está en el Cuadre', r.hayBtn);
  chk('1b abre en el día de hoy', r.diaIni==='2026-11-09', r.diaIni);
  chk('1c dice al cierre de hoy', /Al cierre del lun 09\/11/.test(r.txtHoy), r.txtHoy.slice(0,200));
  // 2 Juan Pablo
  chk('2a JP al 02/11: nada de noviembre, 🔒 3.990 de octubre', r.jp.d02 && near(r.jp.d02.mano,0) && near(r.jp.d02.cob,0) && near(r.jp.d02.antCerr,3990), r.jp.d02);
  chk('2b JP al 05/11: cobró 3.630, retiró 1.000 (de antes), le quedan 3.630', r.jp.d05 && near(r.jp.d05.cob,3630) && near(r.jp.d05.ret,1000) && near(r.jp.d05.aAnt,1000) && near(r.jp.d05.mano,3630), r.jp.d05);
  chk('2c JP al 05/11: se recogió todo el 06/11 y quedan 🔒 2.990', r.jp.d05 && r.jp.d05.todo===true && r.jp.d05.ult==='2026-11-06' && near(r.jp.d05.antCerr,2990), r.jp.d05);
  chk('2d JP al 06/11: nada de noviembre, 🔒 2.000', r.jp.d06 && near(r.jp.d06.mano,0) && near(r.jp.d06.antCerr,2000) && near(r.jp.d06.aMes,3630), r.jp.d06);
  chk('2e JP al 08/11 igual que al 06/11', r.jp.d08 && near(r.jp.d08.mano,0) && near(r.jp.d08.ret,5620), r.jp.d08);
  // 3 Mauricio
  chk('3a Mauricio al 04/11: 3.290 sin recoger, recogido el 07/11', r.mau.d04 && near(r.mau.d04.mano,3290) && r.mau.d04.todo===true && r.mau.d04.ult==='2026-11-07', r.mau.d04);
  chk('3b Mauricio al 07/11: le quedan 1.480 que hoy todavía faltan', r.mau.d07 && near(r.mau.d07.mano,1480) && r.mau.d07.todo===false && near(r.mau.d07.falta,1480), r.mau.d07);
  chk('3c Mauricio: lo de octubre sin retiro va como 🔒 (400)', r.mau.d07 && near(r.mau.d07.antCerr,400) && near(r.mau.d07.ant,0), r.mau.d07);
  // 4
  chk('4a Fernando al 05/11: 800 sin recoger, hoy falta todo', r.fer05 && near(r.fer05.mano,800) && near(r.fer05.falta,800), r.fer05);
  chk('4b Luis Pierre (chofer) al 05/11: 500 de la puerta', r.lp05 && r.lp05.chofer===true && near(r.lp05.mano,500), r.lp05);
  // 5
  chk('5 hoy = «Le queda en la mano» del Cuadre, persona por persona', r.cmp.length>0 && r.cmp.every(function(x){ return near(x[1],x[2]); }), r.cmp);
  // 6
  chk('6a el día por día da lo mismo que la tabla de cada día', r.malDia.length===0, r.malDia);
  chk('6b JP día por día', JSON.stringify(r.diasJP.filter(function(e){ return ['2026-11-02','2026-11-03','2026-11-05','2026-11-06'].indexOf(e[0])>=0; }))===
        JSON.stringify([['2026-11-02',0,0,0,3990],['2026-11-03',2390,1000,2390,2990],['2026-11-05',1240,0,3630,2990],['2026-11-06',0,4620,0,2000]]), r.diasJP);
  // 7
  chk('7 Isabel al 05/10: el retiro de septiembre no tapa ningún cobro', r.isa && near(r.isa.ret,300) && near(r.isa.sobra,300), r.isa);
  // 9 mayor y saldos
  const S=(o,n)=>o[n]||{};
  chk('9a Saldos al 05/11 de JP: 3.990 + 3.630 − 3.000 = 4.620 (3.630 de noviembre)', near(S(r.s05,'Juan Pablo Paredes').ini,3990) && near(S(r.s05,'Juan Pablo Paredes').debe,3630) && near(S(r.s05,'Juan Pablo Paredes').haber,3000) && near(S(r.s05,'Juan Pablo Paredes').saldo,4620) && near(S(r.s05,'Juan Pablo Paredes').mes,3630), S(r.s05,'Juan Pablo Paredes'));
  chk('9b Mayor de JP: el 03/11 el cierre de octubre (2.000) y el 06/11 queda en 0', JSON.stringify(r.mayJP.filter(function(m){ return m[0]>='2026-11-03' && m[0]<='2026-11-06'; }))===
        JSON.stringify([['2026-11-03','cob',910,0,4900],['2026-11-03','cob',1480,0,6380],['2026-11-03','ret',0,1000,5380],['2026-11-03','cierre',0,2000,3380],['2026-11-05','cob',1240,0,4620],['2026-11-06','ret',0,4620,0]]), r.mayJP);
  chk('9c Saldos al 02/11: lo de octubre sigue en el saldo (JP 3.990, Mauricio 400, Mirian 5.440)', near(S(r.s02,'Juan Pablo Paredes').saldo,3990) && near(S(r.s02,'Mauricio Merida').saldo,400) && near(S(r.s02,'Mirian Salazar').saldo,5440), r.s02);
  chk('9d Saldos al 05/11 de Mauricio: el cierre se lleva los 400 de octubre', near(S(r.s05,'Mauricio Merida').haber,400) && near(S(r.s05,'Mauricio Merida').saldo,3290), S(r.s05,'Mauricio Merida'));
  chk('9e hoy: el saldo de cada cuenta = «Le queda en la mano» del Cuadre', r.cmp.every(function(x){ return near(x[1], S(r.s09,x[0]).saldo||0); }), [r.cmp, r.s09]);
  chk('9f Isabel: el retiro de plata de septiembre va contra «saldo de antes del 01/10» y no deja negativo', JSON.stringify(r.mayIsa)===JSON.stringify([['2026-09-30','ini',300,0,300],['2026-10-02','ret',0,300,0]]), r.mayIsa);
  chk('9i Saldos al 05/10 de Isabel: lo de antes va en «Saldo al 30/09», no como debe de octubre', near(S(r.s1005,'Isabel Robledo').ini,300) && near(S(r.s1005,'Isabel Robledo').debe,0) && near(S(r.s1005,'Isabel Robledo').haber,300) && near(S(r.s1005,'Isabel Robledo').saldo,0), S(r.s1005,'Isabel Robledo'));
  chk('9g ninguna cuenta queda en negativo', r.neg.length===0, r.neg);
  chk('9h siempre: saldo anterior + debe − haber = saldo', r.cuadra.length===0, r.cuadra);
  // 8 pantalla
  chk('8a el botón dice «📒 Mayor y saldos»', /Mayor y saldos/.test(r.btnTxt), r.btnTxt);
  chk('8b Saldos al 05/11 en pantalla', /Caja · Juan Pablo Paredes/.test(r.txt05) && /Bs 4\.620,00/.test(r.txt05) && /SALDO AL 31\/10|Saldo al 31\/10/i.test(r.txt05) && /se recogió hasta el 06\/11/.test(r.txt05), r.txt05.slice(0,600));
  chk('8c en Saldos no se ve «Desde»', r.desdeOculto===true);
  chk('8d ▶ pasa al día siguiente y no pasa de hoy; no va antes de octubre', r.dMas==='2026-11-06' && r.dTope==='2026-11-09' && r.dMin==='2026-10-01', [r.dMas, r.dTope, r.dMin]);
  chk('8e tocar una cuenta abre su Mayor desde el 1° del mes', r.vistaMayor.vista==='mayor' && r.vistaMayor.q===r.qJP && r.vistaMayor.desdeVisible && r.vistaMayor.desde==='2026-11-01', r.vistaMayor);
  chk('8f el Mayor: saldo anterior, cobros, retiro, cierre de octubre, sumas', /Saldo anterior/.test(r.det) && /Cierre de octubre: se dio por retirado/.test(r.det) && /Sumas/.test(r.det) && /saldo al 05\/11: Bs 4\.620,00/.test(r.det) && /Lo que tenía sin recoger al cierre del 05\/11/.test(r.det), r.det.slice(0,700));
  chk('8f2 la lista de JP al 05/11 trae lo de octubre que tapó el retiro del 06/11 (990) y suma el saldo', /CLIENTE PENA de octubre/.test(r.det) && /Total = saldo al 05\/11 Bs 4\.620,00/.test(r.det), r.det.slice(-900));
  chk('8g abrir una venta desde el Mayor y volver', /Volver al mayor y saldos/.test(r.volTxt) && r.volvio.hay && r.volvio.d==='2026-11-05' && r.volvio.q===r.qJP && r.volvio.vista==='mayor', [r.volTxt, r.volvio]);
  chk('8h «Todas las cuentas» y «Desde»', r.bloques>=4 && r.desde04>=1, [r.bloques, r.desde04]);
  chk('8i Copiar: el Mayor y los Saldos', /Saldo anterior/.test(r.copiaMayor) && /Caja · Juan Pablo Paredes/.test(r.copiaMayor) && /Saldos de caja \(efectivo\) al cierre del jue 05\/11/.test(r.copia) && /4\.620/.test(r.copia), [r.copiaMayor.slice(0,200), r.copia.slice(0,200)]);
  chk('8k Excel: Saldos, Mayor y Sin recoger', r.xls.nom==='mayor-y-saldos-al-2026-11-05.xlsx' && JSON.stringify(r.xls.hojas)===JSON.stringify(['Saldos al 05-11','Mayor','Sin recoger']) && /4620/.test(r.xls.jp) && r.xls.may>5, r.xls);
  // 10 la revisión de Fable
  chk('10a Excel «Sin recoger»: sin lo de octubre que el cierre ya se llevó, y suma lo sin recoger', r.xlsSin && r.xlsSin.jpOct10===0 && near(r.xlsSin.suma, r.xlsSin.pos) && r.xlsSin.plata, r.xlsSin);
  chk('10b la lista de lo sin recoger de cada cuenta suma su saldo, todos los días', r.malLista.length===0, r.malLista.slice(0,10));
  chk('10c el Mayor desde el 01/10 trae a Isabel (sin movimiento en noviembre)', r.ctasOct.some(function(t){ return /Isabel Robledo/.test(t); }), r.ctasOct);
  chk('10d reabrir desde el botón: hoy, Saldos, sin «Desde»', r.reabre.vista==='saldos' && r.reabre.d==='2026-11-09' && r.reabre.desde==='' && r.reabre.q==='', r.reabre);
  chk('10e una vendedora sin movimientos sale con su nombre', /Caja · Andrea Orias/.test(r.andrea), r.andrea.slice(0,300));
  chk('10f un retiro que no tapa nada no achica lo sin recoger y se dice aparte', near(r.neg9.pos, r.neg9.posAntes) && near(r.neg9.neg,500) && r.neg9.nNeg===1 &&
        /Aparte, 1 cuenta con Bs 500,00 retirado de más/.test(r.txtNeg) && /retirado de más/.test(r.copiaNeg) && /TOTAL SIN RECOGER/.test(r.copiaNeg), [r.neg9, r.txtNeg.slice(0,400), r.copiaNeg.slice(-300)]);
  chk('10g el Mayor de Carola: el retiro dice «no tapa ningún cobro» y la lista dice «retirado de más»', /no tapa ningún cobro/.test(r.txtCarola) && /Retirado de más/.test(r.txtCarola) && /Total = saldo al 09\/11 −?-?Bs ?500|Total = saldo al 09\/11 Bs -500|Total = saldo al 09\/11 -Bs 500/.test(r.txtCarola), r.txtCarola.slice(-600));
  chk('10h un cobro tildado con fecha posterior al retiro se avisa en el Mayor', /posterior al retiro/.test(r.txtMaria), r.txtMaria.slice(0,800));
  chk('10i celular: el saldo a la vista (sin deslizar) y la página no se sale de costado', cel.th2==='none' && cel.th3==='none' && cel.th6==='none' && cel.de==='block' && /Cobró Bs .* retirado Bs /.test(cel.deTxt) && cel.sw<=390 && cel.tabla<=cel.caja+1, cel);
  chk('8j sin errores de la página', errores.length===0, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
