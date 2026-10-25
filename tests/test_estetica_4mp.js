/* 🎨 SEGUNDA VUELTA DE LO QUE SE VEÍA MAL (25/10, §4mp; el dueño: «¿No hay más mejoras visuales?»).
   Capturas de la ficha, el Cuadre, el Plan de stock, la Lista de carga, lo de abajo de Proyección y Mis pedidos, el iPad parado y el celular
   (con una copia de la planilla con clientes inventados, en el scratchpad). Solo apariencia.

   LO QUE CUIDA:
   1. Celular (390): sin el margen doble (22 + 28 px por lado): el formulario usa el ancho; «25 libres» de la agenda parte el renglón.
   2. iPad parado (820): las seis pestañas en UNA fila y el número de cada pestaña en la esquina (no pisa la letra).
   3. Plan de stock: con textos largos en «Qué hacer hoy», la tabla entra entera en la compu (las columnas «Pedir» quedaban afuera).
   4. Proyección, «De dónde sale lo vendido»: las dos tablas con las columnas alineadas.
   5. La ficha: los botones de cada producto en la misma columna, diga lo que diga «de dónde sale».
   6. La ficha en el celular: «Qué hacer» sin la flechita suelta.

   Reloj CLAVADO (martes 27/10/2026, 10:00 de Bolivia). Solo datos sintéticos.
   Se corre:  node tests/test_estetica_4mp.js   (PEDIDOS=… para correrla contra otra versión) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

const PREPARAR = async () => {
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  var lk=document.getElementById('admin-lock'); if(lk) lk.style.display='none';
  var ac=document.getElementById('admin-content'); if(ac) ac.style.display='block';
  var n=0, P=function(o){ n++; return Object.assign({ id:'p'+n, oc:'10-'+(100+n), nota:String(5000+n), cliente:'CLIENTE '+n, celular:'7000000'+n,
    fecha:'2026-10-28', turno:'AM', zona:'Norte', direccion:'CALLE '+n, vendedor:'Maria Flores',
    productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:3000 }],
    saldo:3000, acuenta:0, pagado:false, metodoPago:'', ts:new Date('2026-10-20T10:00:00-04:00').getTime(), rev:1 }, o); };
  STATE=[
    P({ productos:[ { desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:3000, chk:'no' },
                    { desc:'SOMIER ORO', medida:'160x190', cant:1, precio:1500, chk:'ok' },
                    { desc:'ALMOHADA', medida:'50x70', codigo:'CD1403', cant:2, precio:100 } ], observaciones:'llamar antes' }),
    P({ vendedor:'Carola Chavez', fecha:'2026-10-20', pagado:true, saldo:0, metodoPago:'Efectivo 3000 @2026-10-20' }),
    P({ fecha:'2026-10-21', pagado:true, saldo:0, metodoPago:'Efectivo 3000 @2026-10-21' })
  ];
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
  apiSave=function(x){ return Promise.resolve({ ok:true, pedido:x }); };
};
const espera = ms => 'await new Promise(function(r){ setTimeout(r,'+ms+'); });';

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  for (const [w,h] of [[1440,900],[820,1180],[390,844]]) {
    const ctx = await browser.newContext({ viewport:{ width:w, height:h }, timezoneId:'America/La_Paz', hasTouch:w<700, isMobile:w<700 });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(w+': '+e.message)); page.on('dialog', d => d.accept());
    await ctx.route(/^https:\/\//, r => r.abort());
    await page.addInitScript(() => { window.ADM_FICHAS_PRUEBA=1; window.ADM_TABS_PRUEBA=1; window.FP_PRUEBA=1; });
    await page.clock.setFixedTime(new Date('2026-10-27T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate(PREPARAR);
    await page.evaluate(async () => { await refrescarEstado(); try{ nxBadges(); }catch(e){} });
    const tag = w+'×'+h;

    if (w===390) {
      const r = await page.evaluate(async () => {
        showView('form'); await new Promise(function(r){ setTimeout(r,400); });
        var f=document.getElementById('f-fecha'), card=document.querySelector('#view-form .card') || document.querySelector('#view-form .form-card');
        var q=document.querySelector('#fx-dias .fx-dia .q');
        return { campo:Math.round(f.getBoundingClientRect().width), wrap:getComputedStyle(document.querySelector('.wrap')).paddingLeft,
                 card:card ? getComputedStyle(card).paddingLeft : '', q: q ? { ws:getComputedStyle(q).whiteSpace, cortado:q.scrollWidth>q.clientWidth+1 } : null };
      });
      chk(`1·${tag}. celular: el margen de los costados ya no es doble (página ${r.wrap}, tarjeta ${r.card}) y la fecha mide ${r.campo} px (antes ~276)`,
          parseFloat(r.wrap)<=10 && parseFloat(r.card)<=12 && r.campo>=320, r);
      chk(`1·${tag}. la agenda: «25 libres» parte el renglón en vez de «25 …»`, r.q && r.q.ws==='normal' && !r.q.cortado, r.q);
      const f6 = await page.evaluate(async () => {
        showView('admin'); showPedidoModal('p1'); await new Promise(function(r){ setTimeout(r,500); });
        var s=[].filter.call(document.querySelectorAll('#modal .fl-qh-s'), function(e){ return e.getClientRects().length; }).length;
        var hay=document.querySelectorAll('#modal .fl-qh').length; closeModal(); return { flechas:s, hay:hay };
      });
      chk(`6·${tag}. la ficha en el celular: «Qué hacer» sin la flechita suelta`, f6.hay>0 && f6.flechas===0, f6);
    }

    if (w===820) {
      const r = await page.evaluate(() => {
        var bs=[].filter.call(document.querySelectorAll('.nav button'), function(b){ return !b.hidden && b.getClientRects().length; });
        var tops=bs.map(function(b){ return Math.round(b.getBoundingClientRect().top); });
        var bad=[].map.call(document.querySelectorAll('.nav .nx-tb'), function(t){ var b=t.closest('button').getBoundingClientRect(), r=t.getBoundingClientRect(); return { arriba:r.top<b.top, derecha:r.right>b.right-1 }; });
        return { n:bs.length, filas:tops.filter(function(t,i){ return tops.indexOf(t)===i; }).length, bad:bad };
      });
      chk(`2·${tag}. iPad parado: las ${r.n} pestañas en UNA fila (la de «Bot» caía sola abajo)`, r.n>=5 && r.filas===1, r);
      chk(`2·${tag}. …y cada número en la esquina de su pestaña, sin pisar la letra`, r.bad.length>0 && r.bad.every(b=>b.arriba && b.derecha), r.bad);
    }

    if (w===1440) {
      // 3 · la tabla del Plan con textos largos (los de verdad: «✓ Ya pedí 101 el 22/10 · se entrega desde ~27/10», el aviso del vencido)
      const r3 = await page.evaluate(() => {
        var d=document.createElement('div'); d.id='stk-plan'; d.style.width='1386px';
        var largo='<span class="pl-que pl-ya"><i class="late-dot"></i>🚨 Pedí 39 ya · ya vienen 81 de fábrica · ⚠️ revisá el saldo</span>'+
          '<div class="pl-ya-venc">⚠️ Ya pedí 74 el 16/10: tenía que llegar el 21/10 y ningún Excel lo mostró. Ya no se cuenta: reclamá a la fábrica o volvé a pedir.</div>'+
          '<label class="pl-ya-chk"><input type="checkbox" checked> ✓ Ya pedí 101 el 22/10 · se entrega desde ~27/10</label><label class="pl-ya-chk"><input type="checkbox"> Ya pedí 39 más</label>';
        d.innerHTML='<div class="pl-tabla"><table><thead><tr><th>Producto</th><th>Hay<small>PTF · Banzer · Moreno</small></th><th>Vendido<small>sin entregar</small></th><th>Se corta</th><th>Qué hacer hoy</th><th>Tener<small>objetivo · punto de pedido</small></th><th>Pedir<small>7 días</small></th><th>Pedir<small>15 días · incluye los 7</small></th><th>Pedir<small>noviembre · además de 15 días</small></th></tr></thead><tbody>'+
          '<tr class="pl-fila"><td><div class="pl-nm">ORO ANATOMICO VISCOLASTICO</div><small>180x190 · cód CH1038</small></td><td class="pl-hay"><b>7</b><small>2 · 5 · 0</small></td><td class="pl-comp">26</td><td class="pl-corta"><span class="pl-hoy">Ya falta para lo vendido</span></td>'+
          '<td class="pl-q">'+largo+'</td><td class="pl-tener"><b>103</b><small>pedí al bajar a 65 · libre 64</small></td><td class="pl-p7">39</td><td class="pl-p15">129</td><td class="pl-pm">133</td></tr></tbody></table></div>';
        document.body.appendChild(d);
        var t=d.querySelector('.pl-tabla'), o={ cw:t.clientWidth, sw:t.scrollWidth }; d.remove(); return o;
      });
      chk(`3·${tag}. Plan de stock: con los textos largos la tabla entra entera (${r3.sw} de ${r3.cw} px): «Pedir 7 / 15 / el mes» a la vista`, r3.cw>1000 && r3.sw<=r3.cw+1, r3);

      // 4 · las dos tablas de «De dónde sale lo vendido», alineadas
      const r4 = await page.evaluate(async () => {
        var h=''; try{ h=pryPlataHtml('2026-10'); }catch(e){ return { err:String(e) }; }
        var box=document.createElement('div'); box.id='pry-plata'; box.style.width='1300px'; box.innerHTML=h; document.body.appendChild(box);
        var ts=box.querySelectorAll('.pry-tabla'); if(ts.length<2){ box.remove(); return { tablas:ts.length }; }
        var cols=function(t){ var r=t.querySelector('tbody tr'); return [].map.call(r.children, function(td){ return Math.round(td.getBoundingClientRect().left); }); };
        var a=cols(ts[0]), b=cols(ts[1]); box.remove(); return { a:a, b:b };
      });
      chk(`4·${tag}. «De dónde sale lo vendido»: las columnas de las dos tablas empiezan en el mismo lugar`, r4.a && r4.b && r4.a.length===r4.b.length && r4.a.length>=3 && r4.a[1]>0 && r4.a.every((x,i)=>Math.abs(x-r4.b[i])<=1), r4);

      // 5 · la ficha: los botones de cada producto en la misma columna
      const r5 = await page.evaluate(async () => {
        showView('admin'); showPedidoModal('p1'); await new Promise(function(r){ setTimeout(r,600); });
        var bs=[].map.call(document.querySelectorAll('#modal .fl-prod .fl-prbtns'), function(e){ return Math.round(e.getBoundingClientRect().right); });
        var pl=[].map.call(document.querySelectorAll('#modal .fl-prod .fl-pls'), function(e){ return e.textContent.trim(); });
        closeModal(); return { bs:bs, pl:pl };
      });
      chk(`5·${tag}. la ficha: los botones de los ${r5.bs.length} productos terminan en la misma columna (dice «${r5.pl.join(' / ')}» al lado)`,
          r5.bs.length>=2 && Math.max.apply(null,r5.bs)-Math.min.apply(null,r5.bs)<=1, r5);
    }
    await ctx.close();
  }
  chk('sin errores en la página', !errores.length, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
