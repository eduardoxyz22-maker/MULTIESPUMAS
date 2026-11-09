/* 📅💵 EFECTIVO A UNA FECHA (09/11/2026; Contabilidad, por el dueño: «¿cuánto efectivo pendiente de retiro tenía Juan Pablo el 2 de
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
   8. La pantalla: tabla, detalle de una persona con lo cerrado plegado, abrir una venta y «← Volver al efectivo a una fecha», ◀ ▶ sin pasar
      de hoy ni de octubre, los que solo tienen lo de un mes cerrado plegados, Copiar y Excel (3 hojas).
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
    /* 8. la pantalla */
    var bt=document.getElementById('efd-btn'); out.hayBtn=!!bt;
    if(bt) bt.click(); await esperar(150);
    out.diaIni=(document.getElementById('efd-dia')||{}).value||'';
    out.txtHoy=(document.getElementById('efd')||{}).innerText||'';
    efdElegirDia('2026-11-05'); await esperar(80);
    out.txt05=document.getElementById('efd').innerText.replace(/\s+/g,' ');
    efdMover(1); await esperar(60); out.dMas=EFD.d;
    efdMover(10); await esperar(60); out.dTope=EFD.d;
    efdElegirDia('2026-09-15'); await esperar(60); out.dMin=EFD.d;
    efdElegirDia('2026-11-02'); await esperar(80);
    out.txt02=document.getElementById('efd').innerText.replace(/\s+/g,' ');
    out.filas02=document.querySelectorAll('#efd-cuerpo tbody tr.efe-fila').length;
    var mas=document.querySelector('#efd-cuerpo .efd-mas'); out.mas02=mas?mas.innerText:'';
    if(mas){ mas.click(); await esperar(60); }
    out.filas02b=document.querySelectorAll('#efd-cuerpo tbody tr.efe-fila').length;
    EFD.cerr=false;
    efdElegirDia('2026-11-05'); await esperar(60);
    var fj=[].slice.call(document.querySelectorAll('#efd-cuerpo tr.efe-fila')).filter(function(t){ return /Juan Pablo/.test(t.innerText); })[0];
    if(fj) fj.click(); await esperar(100);
    out.det=document.getElementById('efd').innerText.replace(/\s+/g,' ');
    out.detCerr=!!document.querySelector('#efd-cuerpo details.efd-cerr');
    out.detFilas=document.querySelectorAll('#efd-cuerpo > .tw tr.efe-fila').length;
    var cob=document.querySelector('#efd-cuerpo > .tw tr.efe-fila'); if(cob){ cob.click(); await esperar(150); }
    var vol=document.getElementById('pc-volver'); out.volTxt=vol?vol.innerText:'';
    if(vol){ vol.click(); await esperar(150); }
    out.qJP=normNombre('Juan Pablo Paredes');
    out.volvio={ hay:!!document.getElementById('efd'), d:(document.getElementById('efd-dia')||{}).value, q:EFD.q,
                 txt:((document.getElementById('efd')||{}).innerText||'').slice(0,400) };
    /* Copiar y Excel */
    var copiado=''; var cp=copyText; copyText=function(t){ copiado=t; };
    efdPersona(''); efdCopiar(); copyText=cp; out.copia=copiado;
    var hojas=null, nom=''; var bx=buildXlsx, dl=downloadBlob;
    buildXlsx=function(h){ hojas=h; return new Uint8Array(1); }; downloadBlob=function(b, n){ nom=n; };
    efdExcel(); buildXlsx=bx; downloadBlob=dl;
    out.xls={ nom:nom, hojas:hojas?hojas.map(function(h){ return h.name; }):[], filas:hojas?hojas[0].matrix.length:0,
              jp:hojas?JSON.stringify(hojas[0].matrix.filter(function(f){ return f[0]==='Juan Pablo Paredes'; })[0]):'' ,
              det:hojas?hojas[1].matrix.length:0 };
    closeModal();
    return out;
  });
  if(r.falta){ chk('existe abrirEfectivoFecha', false); console.log('\n'+PASS+' bien · '+FAIL+' mal'); await browser.close(); process.exit(1); }
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
  // 8 pantalla
  chk('8a 05/11: el total y JP en pantalla', /Bs 3\.630,00/.test(r.txt05) && /Juan Pablo Paredes/.test(r.txt05) && /todo, hasta el 06\/11/.test(r.txt05), r.txt05.slice(0,500));
  chk('8b ▶ pasa al día siguiente y no pasa de hoy', r.dMas==='2026-11-06' && r.dTope==='2026-11-09', [r.dMas, r.dTope]);
  chk('8c no va antes de octubre (desde ahí se emparejan los retiros)', r.dMin==='2026-10-01', r.dMin);
  chk('8d 02/11: los que solo tienen lo de octubre van plegados', /persona.* más solo con lo de un mes cerrado/.test(r.mas02) && r.filas02b>r.filas02, [r.mas02, r.filas02, r.filas02b]);
  chk('8e detalle de JP: sus cobros, lo cerrado plegado, el día por día', /Juan Pablo Paredes/.test(r.det) && /Lo que tenía sin recoger ese día/.test(r.det) && /✅ el 06\/11/.test(r.det) && r.detCerr && /Día por día de noviembre/.test(r.det), r.det.slice(0,600));
  chk('8f detalle: solo los 3 cobros de noviembre a la vista', r.detFilas===3, r.detFilas);
  chk('8g abrir una venta y volver', /Volver al efectivo a una fecha/.test(r.volTxt) && r.volvio.hay && r.volvio.d==='2026-11-05' && r.volvio.q===r.qJP, [r.volTxt, r.volvio]);
  chk('8h Copiar', /Efectivo sin recoger al cierre del jue 05\/11/.test(r.copia) && /Juan Pablo Paredes/.test(r.copia) && /3\.630/.test(r.copia), r.copia.slice(0,300));
  chk('8i Excel con 3 hojas', r.xls.nom==='efectivo-al-2026-11-05.xlsx' && r.xls.hojas.length===3 && r.xls.hojas[1]==='Sin recoger' && r.xls.det>1, r.xls);
  chk('8j sin errores de la página', errores.length===0, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
