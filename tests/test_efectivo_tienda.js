/* 🏪 EFECTIVO POR TIENDA, PARA ORGANIZAR EL RECOJO (13/11/2026, idea 183 de Contabilidad).
   En el Cuadre, la ventana «Efectivo por retirar» (`abrirEfectivoMano`) suma la vista «🏪 Por tienda»: el efectivo sin recoger agrupado
   por la tienda de quien lo tiene (el día del cobro), cuánto hay, de quién y desde cuándo; los choferes aparte («🚚 Con los choferes»).

   LO QUE CUIDA (datos inventados; reloj CLAVADO el lunes 09/11/2026 19:00 de Bolivia):
   1. La ventana tiene «👤 Por persona | 🏪 Por tienda»; de entrada, por persona (lo de siempre).
   2. Por tienda: Mutualista 1.480 (Mauricio), Charcas 800 (Fernando), Mia Plaza 550 (Mirian 300 + Jonathan 250), Central 400 (Isabel),
      «Sin tienda asignada» 100 (una vendedora sin tienda) y el chofer aparte (Luis Pierre 500). Ordenadas por monto, la sin tienda al final.
   3. El total de las tiendas + los choferes = el título de la ventana = la vista por persona = la ficha «Efectivo por retirar» (3.830).
   4. Cada tienda dice desde cuándo (el cobro más viejo y hace cuántos días) y de quién (cada uno con lo suyo y desde cuándo).
   5. «📋 Copiar la ruta» arma el texto para quien sale a recoger, con los choferes aparte y el total.
   6. La vista elegida se recuerda en el aparato (`me_efe_mano_vista`): cerrar y volver a abrir la deja por tienda; abrir una venta desde
      «Ver los cobros» y «← Volver» vuelve a la vista por tienda.
   7. La tienda sale del día del COBRO (`sucursalDeVendedor(nombre, fecha)`): Carola antes del 01/11 en Central, después en la Tienda Banzer.
   8. El faltante del mes anterior va en la tarjeta de su tienda («incluye …»), aparte del total del período (con datos armados a mano).
   9. Con una vendedora elegida, lo de sus ventas que tiene el chofer va aparte («de ventas de…»), fuera del total.
   10. Sin poder guardar en el aparato (localStorage que falla) la vista igual cambia.
   Se corre:  node tests/test_efectivo_tienda.js   (PEDIDOS=… para correrla contra otra versión) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,700)):''); };
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
    if(typeof efeTiendaDatos!=='function'){ out.falta=true; return out; }
    var c0=document.getElementById('conn-form'); if(c0) c0.style.display='none';
    CONNECTED=true; UNLOCKED=true; try{ localStorage.removeItem(LS_PEND); localStorage.removeItem('me_efe_mano_vista'); }catch(e){}
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
      P('m3', 'Mirian Salazar', 'CLIENTE MIRIAN', [{ monto:300, fecha:'2026-11-06' }], '2026-11-06'),
      P('j1', 'Jonathan Monje', 'CLIENTE JONATHAN', [{ monto:250, fecha:'2026-11-08' }], '2026-11-08'),
      P('d5', 'Mauricio Merida', 'CLIENTE SIN RETIRO', [{ monto:400, fecha:'2026-10-21' }]),          // octubre cerrado: no se le pide a nadie
      P('d2', 'Mauricio Merida', 'CLIENTE ALGARANAZ', [{ monto:700, fecha:'2026-11-03' }], '2026-11-03'),
      P('d3', 'Mauricio Merida', 'CLIENTE SALAS', [{ monto:2590, fecha:'2026-11-04' }], '2026-11-04'),
      P('d4', 'Mauricio Merida', 'CLIENTE VELEZ', [{ monto:1480, fecha:'2026-11-07' }], '2026-11-07'),
      R('d2', 'Mauricio Merida', 3290, '2026-11-07'),
      P('i2', 'Isabel Robledo', 'CLIENTE PARCIAL', [{ monto:1000, fecha:'2026-11-02' }], '2026-11-02'),
      R('i2', 'Isabel Robledo', 600, '2026-11-04'),
      P('f1', 'Fernando Peinado', 'CLIENTE PROPIO', [{ monto:800, fecha:'2026-11-05' }], '2026-11-05'),
      P('f2', 'Fernando Peinado', 'CLIENTE PUERTA', [{ monto:500, fecha:'2026-11-04', recibio:'Luis Pierre' }], '2026-11-04', 'Equipetrol'),
      P('n1', 'Vendedora Nueva', 'CLIENTE SIN TIENDA', [{ monto:100, fecha:'2026-11-08' }], '2026-11-08')
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
    var tabs=function(){ return [].slice.call(document.querySelectorAll('#efe-mano .efe-vista button')).map(function(b){ return (b.classList.contains('on')?'*':'')+b.innerText.trim(); }); };
    var tarjetas=function(){ return [].slice.call(document.querySelectorAll('#efe-mano .efe-tnd')).map(function(t){ return t.innerText.replace(/\s+/g,' '); }); };
    var boton=function(re){ return [].slice.call(document.querySelectorAll('#efe-mano button')).filter(function(b){ return re.test(b.innerText); })[0]; };
    /* 1. de entrada, por persona */
    ver(''); await esperar(80);
    var f=ficha(); out.ficha=f?f.innerText.replace(/\s+/g,' '):'';
    if(f) f.click(); await esperar(150);
    out.t1={ tabs:tabs(), tit:titulo(), persona:!!document.querySelector('#efe-mano .efe-mano-blq'), tnd:document.querySelectorAll('#efe-mano .efe-tnd').length, copia:!!boton(/Copiar la lista/) };
    var personaTxt=modal();
    /* 2. por tienda */
    var bt=boton(/Por tienda/); if(bt) bt.click(); await esperar(120);
    out.t2={ tabs:tabs(), tit:titulo(), persona:!!document.querySelector('#efe-mano .efe-mano-blq'), cards:tarjetas(), txt:modal(), ruta:!!boton(/Copiar la ruta/), lista:!!boton(/Copiar la lista/),
             tiendas:[].slice.call(document.querySelectorAll('#efe-mano .efe-tnd[data-tienda]')).map(function(t){ return t.getAttribute('data-tienda'); }),
             choferes:[].slice.call(document.querySelectorAll('#efe-mano .efe-tnd[data-chofer]')).map(function(t){ return t.getAttribute('data-chofer'); }),
             pref:(function(){ try{ return localStorage.getItem('me_efe_mano_vista'); }catch(e){ return 'x'; } })() };
    var S=efeTiendaDatos(efeManoDatos('')), Dm=efeManoDatos('');
    out.sumas={ tiendas:S.T.tiendas, choferes:S.T.choferes, mano:S.T.mano, dmano:Dm.T.mano, sumCards:S.L.reduce(function(s,g){ return s+g.mano+g.ant; },0)+S.ch.reduce(function(s,x){ return x.aparte?s:s+x.mano+x.ant; },0) };
    out.persTot=personaTxt;
    /* 5. copiar la ruta */
    var copiado=''; var cp=copyText; copyText=function(t){ copiado=t; };
    var br=boton(/Copiar la ruta/); if(br) br.click(); out.ruta=copiado; copyText=cp;
    /* 6. recordar la vista: cerrar y volver a abrir */
    closeModal(); await esperar(80);
    f=ficha(); if(f) f.click(); await esperar(150);
    out.t6={ tabs:tabs(), cards:tarjetas().length };
    /* 6b. abrir una venta desde «Ver los cobros» y volver */
    var det=[].slice.call(document.querySelectorAll('#efe-mano .efe-tnd[data-tienda="Mia Plaza"] details'))[0];
    if(det) det.open=true; await esperar(40);
    var fila=det ? [].slice.call(det.querySelectorAll('tr.efe-fila')).map(function(t){ return t.innerText.replace(/\s+/g,' '); }) : [];
    out.miaFilas=fila;
    var fv=det ? det.querySelector('tr.efe-fila') : null; if(fv) fv.click(); await esperar(200);
    var vol=document.getElementById('pc-volver'); out.volTxt=vol?vol.innerText:'';
    if(vol){ vol.click(); await esperar(150); }
    out.volvio={ tabs:tabs(), cards:tarjetas().length, tit:titulo() };
    /* volver a persona */
    var bp=boton(/Por persona/); if(bp) bp.click(); await esperar(100);
    out.t6c={ tabs:tabs(), persona:!!document.querySelector('#efe-mano .efe-mano-blq'), pref:(function(){ try{ return localStorage.getItem('me_efe_mano_vista'); }catch(e){ return 'x'; } })() };
    closeModal(); await esperar(60);
    /* 7. la tienda sale del día del cobro */
    out.dia={ antes:efeTiendaDe({ nombre:'Carola Chavez', chofer:false }, { f:'2026-10-20', p:{} }), despues:efeTiendaDe({ nombre:'Carola Chavez', chofer:false }, { f:'2026-11-05', p:{} }),
              chofer:efeTiendaDe({ nombre:'Luis Pierre', chofer:true }, { f:'2026-11-05', p:{ vendedor:'Isabel Robledo' } }),
              porVenta:efeTiendaDe({ nombre:'Alguien', chofer:false }, { f:'2026-11-05', p:{ vendedor:'Isabel Robledo' } }) };
    /* 8. el faltante del mes anterior (datos armados: Isabel con 100 de noviembre y 50 de octubre sin cerrar) */
    var Dx={ hoy:'2026-11-09', mesTxt:'noviembre de 2026', vSel:'', T:{ mano:100, ant:50, aparte:0 }, P:[
      { nombre:'Isabel Robledo', chofer:false, aparte:false, tot:100, totAnt:50, antMes:'2026-10', viejo:'2026-10-20', sobra:0,
        its:[{ p:{ id:'x1', vendedor:'Isabel Robledo', cliente:'UNO' }, f:'2026-11-05', m:100, fa:100, cub:0, ref:'' }],
        ant:[{ p:{ id:'x2', vendedor:'Isabel Robledo', cliente:'DOS' }, f:'2026-10-20', m:50, fa:50, cub:0, ref:'' }] } ] };
    var S8=efeTiendaDatos(Dx);
    out.ant={ T:S8.T, L:S8.L.map(function(g){ return [g.tienda, g.mano, g.ant, g.antMes]; }), html:(function(){ var d=document.createElement('div'); d.innerHTML=efeTiendaHtml(Dx, function(){ return ''; }, ''); document.body.appendChild(d); var t=d.innerText.replace(/\s+/g,' '); d.remove(); return t; })() };
    var cp8=copyText, c8=''; copyText=function(t){ c8=t; }; var eM=efeManoDatos; efeManoDatos=function(){ return Dx; }; copiarEfectivoRuta(''); efeManoDatos=eM; copyText=cp8; out.antRuta=c8;
    /* 9. Fernando elegido: el chofer de sus ventas aparte */
    ver('Fernando Peinado'); await esperar(80);
    f=ficha(); if(f) f.click(); await esperar(150);
    var b9t=boton(/Por tienda/); if(b9t) b9t.click(); await esperar(100);
    out.t9={ tit:titulo(), cards:tarjetas(), txt:modal(), tabs:tabs() };
    var S9=efeTiendaDatos(efeManoDatos('')); out.s9=S9.T;
    var c9=''; var cp9=copyText; copyText=function(t){ c9=t; }; var b9=boton(/Copiar la ruta/); if(b9) b9.click(); copyText=cp9; out.ruta9=c9;
    closeModal(); await esperar(60);
    /* 10. sin localStorage la vista igual cambia */
    ver(''); await esperar(60);
    var gi=Storage.prototype.getItem, si=Storage.prototype.setItem;
    Storage.prototype.getItem=function(){ throw new Error('bloqueado'); }; Storage.prototype.setItem=function(){ throw new Error('bloqueado'); };
    try{
      EFE_MANO_VISTA=''; abrirEfectivo('', 'mano'); await esperar(120);
      out.t10a=tabs();
      var b10=boton(/Por tienda/); if(b10) b10.click(); await esperar(80);
      out.t10b={ tabs:tabs(), cards:tarjetas().length };
    } finally { Storage.prototype.getItem=gi; Storage.prototype.setItem=si; }
    closeModal();
    return out;
  });
  if(r.falta){ chk('existe efeTiendaDatos (la vista por tienda)', false); await browser.close(); console.log('\n'+PASS+' bien · '+FAIL+' mal'); process.exit(1); }
  const T=r.t2.txt;
  chk('la ficha «Efectivo por retirar» dice Bs 3.830,00', /Bs 3\.830,00/.test(r.ficha), r.ficha);
  chk('1 · la ventana tiene «👤 Por persona | 🏪 Por tienda» y de entrada va por persona', r.t1.tabs.length===2 && /^\*👤 Por persona/.test(r.t1.tabs[0]) && /Por tienda/.test(r.t1.tabs[1]) && r.t1.persona && r.t1.tnd===0 && r.t1.copia, r.t1);
  chk('2 · «Por tienda» cambia la vista ahí mismo (sin la lista por persona) y el título no cambia', /^\*🏪 Por tienda/.test(r.t2.tabs[1]||'') && !r.t2.persona && r.t2.tit===r.t1.tit && /Bs 3\.830,00/.test(r.t2.tit), [r.t2.tabs, r.t2.tit]);
  chk('2 · tiendas por monto: Mutualista, Charcas, Mia Plaza, Central y la sin tienda al final', JSON.stringify(r.t2.tiendas)===JSON.stringify(['Mutualista','Charcas','Mia Plaza','Central','']), r.t2.tiendas);
  chk('2 · cada tienda con su monto: Mutualista 1.480 · Charcas 800 · Mia Plaza 550 · Central 400 · Sin tienda 100',
      /Mutualista Bs 1\.480,00/.test(r.t2.cards[0]||'') && /Charcas Bs 800,00/.test(r.t2.cards[1]||'') && /Mia Plaza Bs 550,00/.test(r.t2.cards[2]||'') && /Central Bs 400,00/.test(r.t2.cards[3]||'') && /Sin tienda asignada Bs 100,00/.test(r.t2.cards[4]||''), r.t2.cards);
  chk('2 · los choferes aparte: «🚚 Con los choferes» · Luis Pierre Bs 500,00 (no está en ninguna tienda)', /🚚 Con los choferes/.test(T) && JSON.stringify(r.t2.choferes)==='["Luis Pierre"]' && /Luis Pierre Bs 500,00/.test(r.t2.cards[5]||'') && !r.t2.cards.slice(0,5).some(function(c){ return /Luis Pierre/.test(c); }), r.t2.cards);
  chk('3 · tiendas 3.330 + choferes 500 = 3.830 = el título = la vista por persona = la ficha', r.sumas.tiendas===3330 && r.sumas.choferes===500 && r.sumas.mano===3830 && r.sumas.dmano===3830 && Math.abs(r.sumas.sumCards-3830)<0.005 && /en total Bs 3\.830,00/.test(T), r.sumas);
  chk('4 · Mia Plaza: de Mirian (300, desde el 06/11, hace 3 días) y Jonathan (250, desde el 08/11, hace 1 día); el más viejo del 06/11',
      /Mirian Salazar · Bs 300,00 desde el 06\/11 \(hace 3 días\)/.test(r.t2.cards[2]||'') && /Jonathan Monje · Bs 250,00 desde el 08\/11 \(hace 1 día\)/.test(r.t2.cards[2]||'') && /2 cobros sin recoger · el más viejo desde el 06\/11/.test(r.t2.cards[2]||''), r.t2.cards[2]);
  chk('4 · Central: Isabel con lo que le queda del parcial (400), desde el 02/11', /Isabel Robledo · Bs 400,00 desde el 02\/11 \(hace 7 días\)/.test(r.t2.cards[3]||''), r.t2.cards[3]);
  chk('4 · lo ya retirado y lo de octubre (cerrado) no aparece', !/SARAVIA|ALGARANAZ|SALAS|SIN RETIRO/.test(r.miaFilas.join('|')+T), T.slice(0,200));
  chk('5 · «Copiar la lista» se cambia por «📋 Copiar la ruta»', r.t2.ruta && !r.t2.lista, r.t2);
  chk('5 · la ruta: «Recojo de efectivo — 09/11/2026» y una línea por tienda con de quién y desde cuándo',
      /^Recojo de efectivo — 09\/11\/2026\n/.test(r.ruta) && /\n🏪 Mutualista: Bs 1\.480,00 \(Mauricio Merida, desde el 07\/11\)\n/.test(r.ruta) &&
      /\n🏪 Mia Plaza: Bs 550,00 \(Mirian Salazar Bs 300,00, desde el 06\/11 · Jonathan Monje Bs 250,00, desde el 08\/11\)\n/.test(r.ruta) &&
      /\n❓ Sin tienda asignada: Bs 100,00 \(Vendedora Nueva, desde el 08\/11\)\n/.test(r.ruta), r.ruta);
  chk('5 · …los choferes aparte y el total (3.830)', /\n🚚 Con los choferes:\n• Luis Pierre: Bs 500,00 \(desde el 04\/11\)\n/.test(r.ruta) && /\nTotal: Bs 3\.830,00$/.test(r.ruta) && !/CLIENTE/.test(r.ruta), r.ruta);
  chk('6 · la vista queda guardada en el aparato («tienda»)', r.t2.pref==='tienda', r.t2.pref);
  chk('6 · cerrar y volver a abrir la deja por tienda', /^\*🏪 Por tienda/.test(r.t6.tabs[1]||'') && r.t6.cards===6, r.t6);
  chk('6 · «Ver los cobros» de Mia Plaza lista los dos cobros (cliente y monto)', r.miaFilas.length===2 && /CLIENTE MIRIAN.*Bs 300,00/.test(r.miaFilas[0]) && /CLIENTE JONATHAN.*Bs 250,00/.test(r.miaFilas[1]), r.miaFilas);
  chk('6 · abrir una venta y «← Volver al efectivo por retirar» vuelve a la vista por tienda', /Volver al efectivo por retirar/.test(r.volTxt) && /^\*🏪 Por tienda/.test(r.volvio.tabs[1]||'') && r.volvio.cards===6 && /todo el equipo/.test(r.volvio.tit), [r.volTxt, r.volvio]);
  chk('6 · «Por persona» vuelve a la lista de siempre y queda guardado', /^\*👤 Por persona/.test(r.t6c.tabs[0]||'') && r.t6c.persona && r.t6c.pref==='persona', r.t6c);
  chk('7 · la tienda sale del día del cobro: Carola el 20/10 en Central, el 05/11 en la Tienda Banzer; un chofer no tiene tienda; sin tienda propia, la del vendedor de la venta',
      r.dia.antes==='Central' && r.dia.despues==='Tienda Banzer' && r.dia.chofer==='' && r.dia.porVenta==='Central', r.dia);
  chk('8 · el faltante del mes anterior va a la tienda de ESE día (octubre: Isabel en Mia Plaza) y aparte del total del período',
      r.ant.T.mano===100 && r.ant.T.ant===50 && JSON.stringify(r.ant.L)===JSON.stringify([['Central',100,0,''],['Mia Plaza',0,50,'2026-10']]), r.ant);
  chk('8 · …la tarjeta dice «incluye Bs 50,00 faltante de octubre» y el resumen, aparte', /Mia Plaza Bs 50,00/.test(r.ant.html) && /incluye Bs 50,00 faltante de octubre/.test(r.ant.html) && /en total Bs 100,00 · ⚠️ \+ Bs 50,00 faltante del mes anterior/.test(r.ant.html), r.ant.html);
  chk('8 · …y en la ruta el total a recoger dice cuánto es del mes anterior', /🏪 Mia Plaza: Bs 50,00 \(Isabel Robledo, desde el 20\/10; incluye Bs 50,00 faltante de octubre\)/.test(r.antRuta) && /Total: Bs 150,00 \(Bs 100,00 de noviembre de 2026 \+ Bs 50,00 faltante del mes anterior\)/.test(r.antRuta), r.antRuta);
  chk('9 · con Fernando elegido sigue por tienda: Charcas 800 y el chofer aparte «de ventas de Fernando Peinado», fuera del total',
      /^\*🏪 Por tienda/.test(r.t9.tabs[1]||'') && /ventas de Fernando Peinado · Bs 800,00/.test(r.t9.tit) && r.t9.cards.length===2 && /Charcas Bs 800,00/.test(r.t9.cards[0]) &&
      /Luis Pierre Bs 500,00/.test(r.t9.cards[1]) && /de ventas de Fernando Peinado · lo rinde a Contabilidad/.test(r.t9.cards[1]) && r.s9.mano===800 && r.s9.aparte===500 && /lo tiene el chofer/.test(r.t9.txt), [r.t9, r.s9]);
  chk('9 · …y la ruta lo dice', /• Luis Pierre: Bs 500,00 \(desde el 04\/11\) — de ventas de Fernando Peinado, lo rinde a Contabilidad/.test(r.ruta9) && /Total: Bs 800,00 · 🚚 \+ Bs 500,00 lo tiene el chofer/.test(r.ruta9), r.ruta9);
  chk('10 · sin poder guardar en el aparato, abre por persona y «Por tienda» igual cambia la vista', /^\*👤 Por persona/.test((r.t10a||[])[0]||'') && /^\*🏪 Por tienda/.test(((r.t10b||{}).tabs||[])[1]||'') && (r.t10b||{}).cards===6, [r.t10a, r.t10b]);
  chk('sin errores de la página', errores.length===0, errores);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
