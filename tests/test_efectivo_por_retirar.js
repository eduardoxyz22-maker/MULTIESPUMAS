/* 💵👆 EFECTIVO POR RETIRAR (13/11/2026; el dueño, con la ficha del Cuadre marcada en rojo: «al dar clic ahí no pasa nada, ¿cómo veo o qué debería
   mostrar? ¿quién tiene la plata? ¿cuándo, dónde se cobró o qué cliente?»).

   LO QUE CUIDA (datos inventados, los de test_efectivo_fecha + un retiro parcial; reloj CLAVADO el lunes 09/11/2026 19:00 de Bolivia):
   1. La ficha «Efectivo por retirar» del Cuadre se toca y abre SOLO lo que sigue sin recoger, por persona: el cliente, la venta, el día (y hace
      cuántos días), dónde y cuánto queda en la mano. El total de la ventana = el de la ficha. Lo ya retirado y lo de octubre (cerrado) no sale.
   2. Un cobro retirado en parte dice cuánto falta «de» cuánto y cuánto ya se retiró.
   3. Lo que recibió un chofer dice «🚚 en la entrega» con la zona; con una vendedora elegida va aparte («lo tiene el chofer»).
   4. Tocar un cliente abre su venta y «← Volver al efectivo por retirar» vuelve a la misma lista.
   5. «Le queda en la mano» de la tabla también se toca y abre lo de ESA persona.
   6. «📋 Copiar la lista» copia solo lo pendiente; «👁 Ver todo lo cobrado» abre la lista de siempre.
   7. Con todo recogido la ficha no se toca.
   Se corre:  node tests/test_efectivo_por_retirar.js   (PEDIDOS=… para correrla contra otra versión) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
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
    if(typeof abrirEfectivoMano!=='function'){ out.falta=true; }
    var c0=document.getElementById('conn-form'); if(c0) c0.style.display='none';
    CONNECTED=true; UNLOCKED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR=''; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    var esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
    var P=function(id, v, cli, cobros, ts, zona){ return { id:id, oc:'11-'+id.replace(/\D/g,''), vendedor:v, cliente:cli, celular:'70001001', zona:zona||'Norte', turno:'AM', nota:'9'+id.replace(/\D/g,''),
      fecha:'2026-11-20', productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:9000 }], saldo:0, acuenta:0, pagado:false,
      ts:new Date((ts||'2026-10-05')+'T11:00:00-04:00').getTime(), metodoPago:textoCobros(cobros.map(function(c, i){ return Object.assign({ metodo:'Efectivo', nota:String(100+i) }, c); })) }; };
    var R=function(id, v, monto, dia){ return { id:'__ret_'+id+'__', fecha:'', cliente:'💵 RETIRO DE EFECTIVO — fila del sistema, NO BORRAR', vendedor:v, chofer:'Contabilidad',
      acuenta:monto, zona:'FACTURADO', nota:'', ts:new Date(dia+'T12:00:00-04:00').getTime() }; };
    var L=[
      P('m2', 'Mirian Salazar', 'CLIENTE SARAVIA', [{ monto:2140, fecha:'2026-11-03' }], '2026-11-03'),
      R('m2', 'Mirian Salazar', 2140, '2026-11-03'),
      P('d5', 'Mauricio Merida', 'CLIENTE SIN RETIRO', [{ monto:400, fecha:'2026-10-21' }]),          // octubre cerrado: no se le pide a nadie
      P('d2', 'Mauricio Merida', 'CLIENTE ALGARANAZ', [{ monto:700, fecha:'2026-11-03' }], '2026-11-03'),
      P('d3', 'Mauricio Merida', 'CLIENTE SALAS', [{ monto:2590, fecha:'2026-11-04' }], '2026-11-04'),
      P('d4', 'Mauricio Merida', 'CLIENTE VELEZ', [{ monto:1480, fecha:'2026-11-07' }], '2026-11-07'),
      R('d2', 'Mauricio Merida', 3290, '2026-11-07'),
      P('i2', 'Isabel Robledo', 'CLIENTE PARCIAL', [{ monto:1000, fecha:'2026-11-02' }], '2026-11-02'),
      R('i2', 'Isabel Robledo', 600, '2026-11-04'),
      P('f1', 'Fernando Peinado', 'CLIENTE PROPIO', [{ monto:800, fecha:'2026-11-05' }], '2026-11-05'),
      P('f2', 'Fernando Peinado', 'CLIENTE PUERTA', [{ monto:500, fecha:'2026-11-04', recibio:'Luis Pierre' }], '2026-11-04', 'Equipetrol')
    ];
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(L)) }); };
    apiSave=function(x){ return Promise.resolve({ ok:true, pedido:x }); };
    await refrescarEstado(); await esperar(150);
    showView('conta'); await esperar(150);
    try{ setContaTab('cuadre'); }catch(e){}
    var ver=function(v){ segSet('cua-mode', 'mes'); document.getElementById('cua-mes').value='2026-11'; document.getElementById('cua-vendedor').value=v||''; renderCuadre(); };
    var ficha=function(){ var fs=[].slice.call(document.querySelectorAll('#cua-metrics .mc')).filter(function(f){ return /Efectivo por retirar|Se retiró de más/i.test(f.innerText); }); return fs[0]||null; };
    var modal=function(){ var m=document.getElementById('efe-mano'); return m ? m.innerText.replace(/\s+/g,' ') : ''; };
    var titulo=function(){ var h=document.querySelector('.modal-h h3'); return h ? h.innerText : ''; };
    /* 1. Todos */
    ver(''); await esperar(80);
    var f=ficha(); out.f1={ hay:!!f, toca:!!(f && f.classList.contains('mc-toca')), txt:f?f.innerText.replace(/\s+/g,' '):'' };
    if(f) f.click(); await esperar(150);
    out.m1={ txt:modal(), tit:titulo() };
    out.filas1=[].slice.call(document.querySelectorAll('#efe-mano tr.efe-fila')).map(function(t){ return t.innerText.replace(/\s+/g,' '); });
    /* 4. abrir una venta y volver */
    var fv=[].slice.call(document.querySelectorAll('#efe-mano tr.efe-fila')).filter(function(t){ return /CLIENTE VELEZ/.test(t.innerText); })[0];
    if(fv) fv.click(); await esperar(200);
    var vol=document.getElementById('pc-volver'); out.volTxt=vol?vol.innerText:'';
    if(vol){ vol.click(); await esperar(150); }
    out.volvio=!!document.getElementById('efe-mano') && /todo el equipo/.test(titulo());
    /* 6. copiar y ver todo */
    var copiado=''; var cp=copyText; copyText=function(t){ copiado=t; };
    var bc=[].slice.call(document.querySelectorAll('#efe-mano button')).filter(function(b){ return /Copiar la lista/.test(b.innerText); })[0];
    if(bc) bc.click(); out.copia=copiado; copyText=cp;
    var bt=[].slice.call(document.querySelectorAll('#efe-mano button')).filter(function(b){ return /Ver todo lo cobrado/.test(b.innerText); })[0];
    if(bt) bt.click(); await esperar(120);
    out.todo={ lista:!!document.getElementById('efe-lista'), mano:!!document.getElementById('efe-mano'), txt:(document.getElementById('efe-lista')||{}).innerText||'' };
    closeModal(); await esperar(80);
    /* 5. «Le queda en la mano» de la tabla */
    var bq=[].slice.call(document.querySelectorAll('#cua-retiros button.efe-toca')).filter(function(b){ return /Mauricio/.test(b.getAttribute('data-q')||'') && /\bmano\b/.test(b.getAttribute('onclick')||''); })[0];
    out.tablaBtn=!!bq; if(bq) bq.click(); await esperar(150);
    out.m5={ txt:modal(), tit:titulo() };
    closeModal(); await esperar(80);
    /* 1b. Mauricio elegido */
    ver('Mauricio Merida'); await esperar(80);
    f=ficha(); out.f2={ toca:!!(f && f.classList.contains('mc-toca')), txt:f?f.innerText.replace(/\s+/g,' '):'' };
    if(f) f.click(); await esperar(150);
    out.m2={ txt:modal(), tit:titulo() };
    closeModal(); await esperar(80);
    /* 3. Fernando elegido: lo del chofer va aparte */
    ver('Fernando Peinado'); await esperar(80);
    f=ficha(); out.f3={ toca:!!(f && f.classList.contains('mc-toca')), txt:f?f.innerText.replace(/\s+/g,' '):'' };
    if(f) f.click(); await esperar(150);
    out.m3={ txt:modal(), tit:titulo() };
    closeModal(); await esperar(80);
    /* 7. Mirian: todo recogido, la ficha no se toca */
    ver('Mirian Salazar'); await esperar(80);
    f=ficha(); out.f4={ toca:!!(f && f.classList.contains('mc-toca')), txt:f?f.innerText.replace(/\s+/g,' '):'' };
    return out;
  });
  if(r.falta){ chk('existe abrirEfectivoMano', false); await browser.close(); console.log('\n'+PASS+' bien · '+FAIL+' mal'); process.exit(1); }
  const T=r.m1.txt;
  chk('1 · la ficha «Efectivo por retirar» se toca y lo dice', r.f1.hay && r.f1.toca && /Tocá para ver quién la tiene/.test(r.f1.txt), r.f1);
  chk('1 · la ficha dice Bs 3.180,00 (Mauricio 1.480 + Isabel 400 + Fernando 800 + el chofer 500)', /Bs 3\.180,00/.test(r.f1.txt), r.f1.txt);
  chk('1 · abre «Efectivo por retirar · todo el equipo · Bs 3.180,00» (el total = el de la ficha)', /Efectivo por retirar · todo el equipo · Bs 3\.180,00/.test(r.m1.tit), r.m1.tit);
  chk('1 · cada persona con lo que tiene: Mauricio 1.480, Fernando 800, Isabel 400, Luis Pierre (chofer) 500', /Mauricio Merida.*la tiene el vendedor\/a: Bs 1\.480,00/.test(T) && /Fernando Peinado.*Bs 800,00 sin recoger/.test(T) && /Isabel Robledo.*Bs 400,00 sin recoger/.test(T) && /Luis Pierre.*chofer.*la tiene el chofer: Bs 500,00/.test(T), T);
  chk('1 · el cliente, la venta, el día y hace cuántos días: CLIENTE VELEZ · 11-4 · nota 94 · 07/11 · hace 2 días', r.filas1.some(function(x){ return /07\/11.*hace 2 días.*CLIENTE VELEZ.*11-4.*nota 94.*Bs 1\.480,00/.test(x); }), r.filas1);
  chk('1 · lo ya retirado no sale (ALGARANAZ, SALAS, SARAVIA) ni lo de octubre cerrado (SIN RETIRO)', !/ALGARANAZ|SALAS|SARAVIA|SIN RETIRO/.test(T), T);
  chk('1 · el más viejo y el último retiro de cada uno', /el más viejo del 07\/11 \(hace 2 días\) · último retiro: 07\/11 por Bs 3\.290,00/.test(T) && /Fernando Peinado.*sin retiros en noviembre/i.test(T), T);
  chk('2 · un cobro retirado en parte: Bs 400 «de Bs 1.000 · Bs 600 ya retirado»', r.filas1.some(function(x){ return /CLIENTE PARCIAL.*Bs 400,00 de Bs 1\.000,00 · Bs 600,00 ya retirado/.test(x); }), r.filas1);
  chk('3 · lo del chofer: «🚚 en la entrega · Equipetrol»', r.filas1.some(function(x){ return /CLIENTE PUERTA.*🚚 en la entrega · Equipetrol.*Bs 500,00/.test(x); }), r.filas1);
  chk('3 · con todos, se ve el vendedor de cada venta', r.filas1.some(function(x){ return /CLIENTE PUERTA.*Fernando Peinado/.test(x); }), r.filas1);
  chk('4 · abrir un cliente y «← Volver al efectivo por retirar» vuelve a la misma lista', /Volver al efectivo por retirar/.test(r.volTxt) && r.volvio, [r.volTxt, r.volvio]);
  chk('6 · «Copiar la lista» copia solo lo pendiente', /Efectivo por retirar/.test(r.copia) && /CLIENTE VELEZ/.test(r.copia) && /Bs 400,00 \(de Bs 1\.000,00\)/.test(r.copia) && !/SALAS|ALGARANAZ/.test(r.copia), r.copia);
  chk('6 · «Ver todo lo cobrado y los retiros» abre la lista de siempre', r.todo.lista && !r.todo.mano && /CLIENTE SALAS/.test(r.todo.txt), r.todo);
  chk('5 · «Le queda en la mano» de la tabla se toca y abre lo de esa persona', r.tablaBtn && /Efectivo por retirar · Mauricio Merida · Bs 1\.480,00/.test(r.m5.tit) && !/Fernando|Isabel/.test(r.m5.txt), [r.tablaBtn, r.m5.tit]);
  chk('1b · con Mauricio elegido: la ficha 1.480 se toca y abre «ventas de Mauricio Merida · Bs 1.480,00»', r.f2.toca && /Bs 1\.480,00/.test(r.f2.txt) && /ventas de Mauricio Merida · Bs 1\.480,00/.test(r.m2.tit), [r.f2, r.m2.tit]);
  chk('1b · …sin la columna de vendedor', !/Vendedor/.test(r.m2.txt.split('Cliente y venta')[1]||'x'), r.m2.txt);
  chk('3 · con Fernando elegido: 800 en su mano y el chofer aparte («🚚 + Bs 500,00 lo tiene el chofer»)', r.f3.toca && /ventas de Fernando Peinado · Bs 800,00/.test(r.m3.tit) && /🚚 \+ Bs 500,00 lo tiene el chofer/.test(r.m3.txt) && /de ventas de Fernando Peinado · lo rinde a Contabilidad/.test(r.m3.txt), [r.m3.tit, r.m3.txt]);
  chk('7 · Mirian con todo recogido: la ficha dice «✅ Nada» y no se toca', !r.f4.toca && /Nada/.test(r.f4.txt), r.f4);
  chk('sin errores de la página', errores.length===0, errores);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
