/* 💵🔗 EL EFECTIVO DEL CUADRE CON LOS RETIROS EMPAREJADOS (07/11/2026, el dueño con dos capturas del Cuadre de noviembre: «¿Revisa por qué no
   cuadra? ¿Porque ingresó en octubre y se retiró en noviembre? ¿Por eso figura con retiros de más? Al darle al efectivo, ¿no debería mostrar
   qué clientes pagaron y cuánto?»).

   LO QUE CUIDA (todo con datos inventados, reloj CLAVADO el sábado 07/11/2026 18:10 de Bolivia):
   1. Mirian: el retiro del 03/11 de Bs 5.440 era el cobro del 30/10 → noviembre «✅ todo recogido» con «↩️ era de octubre» (antes «se retiró
      Bs 5.440 de más»), y octubre lo muestra como «se retiró en noviembre» (antes seguía «en la mano»).
   2. Mauricio: el retiro de 3.290 = 700 + 2.590 aunque ese día entró otro cobro de 1.480 → le quedan 1.480 (la regla de antes miraba solo la
      tira que termina en el último y se lo comía lo de octubre).
   3. Juan Pablo: un retiro parcial de lo de octubre (del más viejo) y otro que junta octubre + noviembre.
   4. Un retiro de octubre por plata de septiembre (antes de EFE_EMPAREJA) no tapa nada y lo dice.
   5. Siempre: cobrado − queda = (retirado − era de antes − sin cobro) + se retiró después.
   6. Las fichas de arriba («Efectivo por retirar», «Efectivo retirado») y «☀️ Tu día» dicen lo mismo que la tabla.
   7. 👁 Tocar el monto cobrado (y la ficha «Efectivo (caja)») abre la lista de clientes con «¿Se retiró?»; un cliente abre su venta y
      «← Volver al efectivo cobrado» vuelve. Con una vendedora elegida, lo que recibió un chofer de sus ventas va también.
   8. «Todo» sigue con la cuenta de siempre (cobrado − retirado).
   9. El texto del Cuadre lo dice; el servidor (`waEfeCuentas_` del .gs) empareja IGUAL que la página, cobro por cobro.
   Se corre:  node tests/test_efe_pareo.js   (PEDIDOS=… / GS=… para correrla contra otra versión) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs'), vm = require('vm');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const GS = process.env.GS || path.resolve('google-apps-script.gs');

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1280, height:900 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await ctx.route(/^https:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-11-07T18:10:00-04:00'));
  await page.addInitScript(()=>{ window.MIS_TOP_PRUEBA=1; });
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  const r = await page.evaluate(async () => {
    var out={};
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
    out.lista=JSON.parse(JSON.stringify(L));
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(L)) }); };
    apiSave=function(x){ return Promise.resolve({ ok:true, pedido:x }); };
    await refrescarEstado(); await esperar(150);
    showView('conta'); await esperar(150);
    try{ setContaTab('cuadre'); }catch(e){}
    var ver=async function(modo, val, vend){
      segSet('cua-mode', modo);
      if(modo==='mes') document.getElementById('cua-mes').value=val;
      if(modo==='dia') document.getElementById('cua-dia').value=val;
      document.getElementById('cua-vendedor').value=vend||'';
      renderCuadre(); await esperar(80);
      var E=cuadreEfectivo(), f={};
      E.filas.forEach(function(o){ f[o.nombre]={ cobrado:o.cobrado, ret:o.ret, falta:o.falta, antes:o.antes||0, sobra:o.sobra||0, despues:o.despues||0 }; });
      return { pareo:E.pareo, f:f, txt:document.getElementById('cua-retiros').innerText.replace(/\s+/g,' '),
               cards:[].slice.call(document.querySelectorAll('#cua-metrics .mc')).map(function(x){ return x.innerText.replace(/\s+/g,' '); }) };
    };
    out.nov=await ver('mes','2026-11','');
    out.texto=cuadreTexto();
    // 7. la lista al tocar el monto de Mirian, abrir su venta y volver
    var bt=[].slice.call(document.querySelectorAll('#cua-retiros .efe-toca')).filter(function(b){ return b.getAttribute('data-q')==='Mirian Salazar'; })[0];
    if(bt) bt.click(); await esperar(120);
    out.listaMirian=(document.getElementById('efe-lista')||{}).innerText||'';
    var fila=document.querySelector('#efe-lista .efe-fila'); if(fila){ fila.click(); await esperar(150); }
    var vol=document.getElementById('pc-volver'); out.volverTxt=vol?vol.innerText:'';
    if(vol){ vol.click(); await esperar(150); }
    out.volvio=!!document.getElementById('efe-lista');
    closeModal(); await esperar(80);
    try{ abrirEfectivo('Mauricio Merida'); }catch(e){} await esperar(100);
    out.listaMauricio=(document.getElementById('efe-lista')||{}).innerText||'';
    closeModal(); await esperar(80);
    var caja=[].slice.call(document.querySelectorAll('#cua-metrics .mc-toca')).filter(function(x){ return /Efectivo \(caja\)/i.test(x.innerText); })[0];
    out.cajaToca=!!caja; if(caja){ caja.click(); await esperar(120); }
    out.listaTodos=(document.getElementById('efe-lista')||{}).innerText||'';
    closeModal(); await esperar(80);
    out.oct=await ver('mes','2026-10','');
    out.dia=await ver('dia','2026-11-03','');
    out.fer=await ver('mes','2026-11','Fernando Peinado');
    var caja2=[].slice.call(document.querySelectorAll('#cua-metrics .mc-toca')).filter(function(x){ return /Efectivo \(caja\)/i.test(x.innerText); })[0];
    if(caja2){ caja2.click(); await esperar(120); }
    out.listaFer=(document.getElementById('efe-lista')||{}).innerText||''; closeModal(); await esperar(80);
    out.todo=await ver('todo','','');
    // 6. «Tu día» = la tabla del mes
    var d=misEfectivoDatos('Mirian Salazar'), d2=misEfectivoDatos('Mauricio Merida');
    out.tuDia={ mirian:{ tot:d.tot, deMas:d.deMas }, mauricio:{ tot:d2.tot, deMas:d2.deMas } };
    // emparejamiento de la página, cobro por cobro (para compararlo con el servidor)
    var cubs={}; try{ var PR=efePareo(); for(var k in PR.cob) PR.cob[k].forEach(function(c){ cubs[c.id+'|'+c.j]=c.cub; }); }catch(e){}
    out.cubs=cubs;
    return out;
  });

  const N=r.nov.f, O=r.oct.f;
  // 1. Mirian
  chk('1a. Mirian noviembre: cobró 2.140, se le retiró 7.580, ↩️ 5.440 eran de octubre y le queda 0', N['Mirian Salazar'] && N['Mirian Salazar'].falta===0 && N['Mirian Salazar'].antes===5440 && N['Mirian Salazar'].ret===7580, N['Mirian Salazar']);
  chk('1b. la tabla de noviembre ya no dice «de más» y dice «era de octubre»', !/se retiró Bs [0-9.,]+ de más/.test(r.nov.txt) && /↩️ Bs 5\.440,00 era de octubre/.test(r.nov.txt), r.nov.txt.slice(0,400));
  chk('1c. Mirian octubre: los 5.440 se retiraron en noviembre (no quedan «en la mano»)', O['Mirian Salazar'] && O['Mirian Salazar'].falta===0 && O['Mirian Salazar'].despues===5440 && /se retiró en noviembre/.test(r.oct.txt), O['Mirian Salazar']);
  // 2. Mauricio
  chk('2a. Mauricio: 3.290 = 700 + 2.590 aunque después entró 1.480 → le quedan 1.480', N['Mauricio Merida'] && N['Mauricio Merida'].falta===1480 && N['Mauricio Merida'].antes===0, N['Mauricio Merida']);
  chk('2b. en la lista de Mauricio, el de 1.480 está ⏳ en la mano y los otros dos ✅ retirados el 07/11', /CLIENTE VELEZ[\s\S]*⏳ en la mano/.test(r.listaMauricio) && (r.listaMauricio.match(/✅ retirado el 07\/11/g)||[]).length===2, r.listaMauricio.slice(0,500));
  // 3. Juan Pablo
  chk('3a. Juan Pablo noviembre: 3.630 cobrados, 5.620 retirados, ↩️ 1.990 de octubre (1.000 del 10/10 + 990 del 31/10), le queda 0', N['Juan Pablo Paredes'] && N['Juan Pablo Paredes'].falta===0 && N['Juan Pablo Paredes'].antes===1990, N['Juan Pablo Paredes']);
  chk('3b. Juan Pablo octubre: del de 3.000 quedan 2.000 (se retiró 1.000 en noviembre) y el de 990 se retiró en noviembre', O['Juan Pablo Paredes'] && O['Juan Pablo Paredes'].falta===2000 && O['Juan Pablo Paredes'].despues===1990, O['Juan Pablo Paredes']);
  // 4. Septiembre
  chk('4. Isabel: el retiro de octubre por plata de septiembre no tapa nada y lo dice', O['Isabel Robledo'] && O['Isabel Robledo'].sobra===300 && O['Isabel Robledo'].falta===0 && /no tapa ningún cobro anotado desde octubre/.test(r.oct.txt), O['Isabel Robledo']);
  // 5. la cuenta cierra en todas las filas, en noviembre, octubre y el día
  const cierra=(F)=>Object.keys(F).every(k=>{ const o=F[k]; return Math.abs((o.cobrado-o.falta)-(o.ret-o.antes-o.sobra+o.despues))<0.005; });
  chk('5. en cada fila: cobrado − queda = retirado − era de antes − sin cobro + se retiró después', cierra(N) && cierra(O) && cierra(r.dia.f), { N, O });
  chk('5b. el día 03/11: Mirian cobró 2.140, se le retiró 7.580 (5.440 de octubre) y le queda 0', r.dia.pareo && r.dia.f['Mirian Salazar'] && r.dia.f['Mirian Salazar'].falta===0 && r.dia.f['Mirian Salazar'].antes===5440, r.dia.f['Mirian Salazar']);
  // 6. fichas y Tu día
  const tot=Object.keys(N).reduce((a,k)=>a+N[k].falta,0);
  const card=(re)=>(r.nov.cards.filter(x=>re.test(x))[0]||'');
  const bsTxt=(n)=>n.toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2});
  chk('6a. «Efectivo por retirar» = el total de «Le queda en la mano» de la tabla', /Efectivo por retirar/i.test(card(/por retirar/i)) && card(/por retirar/i).replace(/\./g,'').indexOf(String(tot).replace('.',',')+',00')>=0, { tot, c:card(/por retirar/i) });
  chk('6b. «Efectivo retirado» dice cuánto era de octubre', /era de octubre/.test(card(/Efectivo retirado/i)), card(/Efectivo retirado/i));
  chk('6c. «Tu día»: Mirian 0 con «5.440 eran de lo cobrado el mes pasado»; Mauricio 1.480', r.tuDia.mirian.tot===0 && r.tuDia.mirian.deMas===5440 && r.tuDia.mauricio.tot===1480, r.tuDia);
  // 7. la lista al tocar
  chk('7a. tocar el monto de Mirian abre qué clientes pagaron y cuánto, con «¿Se retiró?»', /CLIENTE SARAVIA/.test(r.listaMirian) && /2\.140,00/.test(r.listaMirian) && /✅ retirado el 03\/11/.test(r.listaMirian), r.listaMirian.slice(0,400));
  chk('7b. y sus retiros dicen qué tapó cada uno (↩️ el de octubre con el cliente)', /↩️ Bs 5\.440,00 de CLIENTE AQUIN \(30\/10\)/.test(r.listaMirian), r.listaMirian.slice(0,600));
  chk('7c. un cliente abre su venta con «← Volver al efectivo cobrado» y vuelve a la lista', /Volver al efectivo cobrado/.test(r.volverTxt) && r.volvio, { v:r.volverTxt, volvio:r.volvio });
  chk('7d. la ficha «Efectivo (caja)» se toca y abre la lista de todos', r.cajaToca && /Mirian Salazar/.test(r.listaTodos) && /Mauricio Merida/.test(r.listaTodos) && /Juan Pablo Paredes/.test(r.listaTodos), r.listaTodos.slice(0,200));
  chk('7e. con Fernando elegido, la lista trae lo que de sus ventas cobró el chofer', /CLIENTE PROPIO/.test(r.listaFer) && /Luis Pierre/.test(r.listaFer) && /CLIENTE PUERTA/.test(r.listaFer) && /de ventas de Fernando Peinado/.test(r.listaFer), r.listaFer.slice(0,500));
  chk('7f. la fila de Fernando no lleva lo del chofer (sigue aparte, como antes)', r.fer.f['Fernando Peinado'] && r.fer.f['Fernando Peinado'].cobrado===800 && !r.fer.f['Luis Pierre'], r.fer.f);
  // 8. Todo
  chk('8. «Todo» sigue con la cuenta de siempre (cobrado − retirado), sin emparejar', r.todo.pareo===false && Object.keys(r.todo.f).every(k=>Math.abs(r.todo.f[k].falta-(r.todo.f[k].cobrado-r.todo.f[k].ret))<0.005), r.todo.f);
  // 9. texto y servidor
  chk('9a. el texto del Cuadre dice lo de octubre y no «de más» para Mirian', /Mirian Salazar: cobró Bs 2\.140,00 · se le retiró Bs 7\.580,00 \(↩️ Bs 5\.440,00 era de octubre\)\s+✅/.test(r.texto), (r.texto.match(/Mirian[^\n]*/)||[''])[0]);
  const ctx0={console,Date,Math,JSON,PropertiesService:{getScriptProperties:()=>({getProperty:()=>null})},Logger:{log(){}},Utilities:{formatDate:(d)=>String(d)},Session:{getScriptTimeZone:()=>'America/La_Paz'}};
  ctx0.globalThis=ctx0; vm.createContext(ctx0); vm.runInContext(fs.readFileSync(GS,'utf8'), ctx0);
  const K=ctx0.waEfeCuentas_(r.lista), S={}; for(const k in K.cob) K.cob[k].forEach(c=>{ S[c.id+'|'+c.j]=Math.round(c.cub*100)/100; });
  /* El .gs empareja igual desde la 2026-11-07-f. Uno anterior (el de `main` hasta que el dueño implemente la 07-f) no trae `j`: se dice y se
     salta, sin contar. */
  const gs07f=Object.keys(K.cob).some(k=>K.cob[k].some(c=>c.j!=null));
  if(!gs07f && !process.env.GS) console.log('– 9b/9c: el .gs es anterior a la 2026-11-07-f (sin la misma regla): se comparan al implementarla');
  else {
    const ks=[...new Set([...Object.keys(S), ...Object.keys(r.cubs)])], mal=ks.filter(k=>Math.abs((S[k]??-1)-(r.cubs[k]??-1))>0.005);
    chk('9b. el servidor (`waEfeCuentas_`) empareja igual que la página, cobro por cobro ('+ks.length+')', ks.length>=12 && !mal.length, { mal:mal.map(k=>[k,S[k],r.cubs[k]]) });
    chk('9c. el servidor también ve a Mauricio con 1.480 de noviembre sin recoger', (K.cob['mauricio merida']||[]).filter(c=>c.f>='2026-11-01').reduce((a,c)=>a+(c.m-c.cub),0)===1480, (K.cob['mauricio merida']||[]).map(c=>[c.f,c.m,c.cub]));
  }
  chk('sin errores en la página', !errores.length, errores);
  console.log(`\n${PASS} bien, ${FAIL} mal`);
  await browser.close();
  process.exit(FAIL?1:0);
})();
