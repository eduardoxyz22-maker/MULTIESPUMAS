// 🛏️ (14/11, idea 211) Un dibujito de cada producto: colchón, somier, combo, almohada, respaldar, tela u otro (`prodIcoTipo` / `prodIcoHtml`).
// Dueño: «Al lado de cada renglón, un dibujito chico según qué es… En la ficha, la Lista de carga y Mis pedidos se reconoce de un vistazo
// qué se carga, sin leer el nombre entero.» Solo dibujo: no suma ni una letra al texto de ninguna vista. Datos inventados.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_u2_turno.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));
(async()=>{
  const browser = await chromium.launch({ executablePath:process.env.CHROME_PATH||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('dialog', d=>d.accept());
  await page.clock.setFixedTime(new Date('2026-11-10T09:10:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');

  /* ── 1. Qué es cada renglón ── */
  const r1 = await page.evaluate(()=>{
    var C=[
      [{ codigo:'CH1220', desc:'TITANIO ICE', medida:'140x190' }, 'colchon'],
      [{ codigo:'CH1150', desc:'SOMIER TITANIO LATEX', medida:'160x190' }, 'somier'],
      [{ codigo:'CMBSE002', desc:'COMBO SUEÑA ESSENTIAL', medida:'140x190' }, 'combo'],
      [{ codigo:'CD1403', desc:'ALMOHADA', medida:'50x70' }, 'almohada'],
      [{ codigo:'CH1195', desc:'ALM/NASA', medida:'50x70' }, 'almohada'],
      [{ codigo:'CH1244', desc:'TRAVESSEIRO GELFLEX NASA ALTO DUOFLEX', medida:'' }, 'almohada'],
      [{ codigo:'CH1942', desc:'RESPALDAR PRAG.', medida:'140x190' }, 'respaldar'],
      [{ codigo:'', desc:'CABECERA MDF CAPITONEADA', medida:'160x190' }, 'respaldar'],
      [{ codigo:'', desc:'PROTECTOR DE COLCHON', medida:'140x190' }, 'textil'],
      [{ codigo:'', desc:'JUEGO DE SABANAS', medida:'160x190' }, 'textil'],
      [{ codigo:'', desc:'MANTA POLAR', medida:'' }, 'textil'],
      [{ codigo:'', desc:'PROTECTOR DE ALMOHADA', medida:'' }, 'textil'],
      [{ codigo:'', desc:'FORRO DE COLCHON Y SOMIER', medida:'' }, 'textil'],
      [{ codigo:'', desc:'ALMOHADA CON FUNDA', medida:'' }, 'almohada'],
      [{ codigo:'', desc:'COLCHON TITANIO + 2 ALMOHADAS', medida:'140x190' }, 'colchon'],
      [{ codigo:'', desc:'COLCHONETA', medida:'90x190' }, 'colchon'],
      [{ codigo:'', desc:'SOMIER 2P HEAVEN', medida:'140x190' }, 'somier'],
      [{ codigo:'', desc:'BOLSA PARA COLCHON', medida:'160x190' }, 'otro'],
      [{ codigo:'', desc:'PATAS PARA SOMIER', medida:'' }, 'otro'],
      [{ codigo:'', desc:'VARIOS', medida:'' }, 'otro'],
      /* el código del catálogo manda sobre lo escrito, como en la proyección y el stock */
      [{ codigo:'CD1403', desc:'TITANIO ICE', medida:'50x70' }, 'almohada'],
      [{ codigo:'CH1150', desc:'ALMOHADA', medida:'160x190' }, 'somier'],
      [{ codigo:'', desc:'', medida:'' }, '']
    ];
    return C.map(function(c){ var t=prodIcoTipo(c[0]); return { d:(c[0].codigo?c[0].codigo+' ':'')+c[0].desc, quiero:c[1], da:t, ok:t===c[1] }; });
  });
  const mal1 = r1.filter(x=>!x.ok);
  chk('1 · '+r1.length+' renglones: cada uno con su dibujito (colchón, somier, combo, almohada, respaldar, tela, otro)', mal1.length===0, mal1);
  const r1b = await page.evaluate(()=>{
    var tipos=['colchon','somier','combo','almohada','respaldar','textil','otro'], out={};
    tipos.forEach(function(t){
      var h, x={ colchon:{codigo:'CH1220'}, somier:{codigo:'CH1150'}, combo:{codigo:'CMBSE002'}, almohada:{codigo:'CD1403'}, respaldar:{codigo:'CH1942'}, textil:{desc:'PROTECTOR DE COLCHON'}, otro:{desc:'VARIOS'} }[t];
      h=prodIcoHtml(x);
      var d=new DOMParser().parseFromString('<div>'+h+'</div>', 'text/html'), s=d.querySelector('svg');
      out[t]={ svg:!!s, tipo:s&&s.getAttribute('data-pico'), cls:s&&s.getAttribute('class'), hidden:s&&s.getAttribute('aria-hidden'), txt:d.body.textContent, vb:s&&s.getAttribute('viewBox'),
               conTexto:!!(s && s.querySelector('text,title,desc')) };
    });
    out.vacio=prodIcoHtml({ desc:'' }); out.nulo=prodIcoHtml(null);
    return out;
  });
  chk('1b · un <svg class="pico"> por tipo, 46×32, escondido para el lector de pantalla y SIN ninguna letra (ni <text> ni <title>)',
    Object.keys(r1b).filter(k=>k!=='vacio'&&k!=='nulo').every(k=>{ var o=r1b[k]; return o.svg && o.tipo===k && /\bpico\b/.test(o.cls) && o.hidden==='true' && o.txt==='' && o.vb==='0 0 46 32' && !o.conTexto; }), r1b);
  chk('1c · sin nombre no hay dibujo', r1b.vacio==='' && r1b.nulo==='', { v:r1b.vacio, n:r1b.nulo });

  /* ── Los pedidos de la prueba ── */
  await page.evaluate(async()=>{
    var hoy=todayStr();
    var p1=_ped('p1', hoy, 'AM', [ _lin('CH1220|TITANIO ICE|140x190',1,{chk:'ok'}), _lin('CH1150|SOMIER TITANIO LATEX|160x190',1,{chk:'ok'}), _lin('CD1403|ALMOHADA|50x70',2,{chk:'ok'}),
                                    _lin('CH1942|RESPALDAR PRAG.|140x190',1,{chk:'ok'}) ],
                 { oc:'11-301', cliente:'CLIENTE PRUEBA UNO', vendedor:'Maria Flores', vehiculo:'Carry', chofer:'Omar', ts:_ts(hoy,'08:00:00') });
    var p2=_ped('p2', hoy, 'AM', [ _lin('CMBSE002|COMBO SUEÑA ESSENTIAL|140x190',1,{chk:'ok'}), _lin('|BOLSA PARA COLCHON|140x190',1,{}), _lin('|PROTECTOR DE COLCHON|140x190',1,{}) ],
                 { oc:'11-302', cliente:'CLIENTE PRUEBA DOS', vendedor:'Maria Flores', vehiculo:'Carry', chofer:'Omar', ts:_ts(hoy,'08:05:00') });
    await _cargar([p1, p2], _stock(function(){}));
  });

  /* ── 2. La ficha rápida de Administración (`admFichaHtml`) ── */
  const r2 = await page.evaluate(()=>{
    var dn=dayNumMap(), box=document.createElement('div'); document.body.appendChild(box);
    box.innerHTML=admFichaHtml(findById('p1'), dn)+admFichaHtml(findById('p2'), dn);
    var t1=[].map.call(box.querySelectorAll('.af-f')[0].querySelectorAll('.af-pl'), function(e){ var s=e.querySelector('svg.pico'); return s?s.getAttribute('data-pico'):'—'; });
    var t2=[].map.call(box.querySelectorAll('.af-f')[1].querySelectorAll('.af-pl'), function(e){ var s=e.querySelector('svg.pico'); return s?s.getAttribute('data-pico'):'—'; });
    var txt=box.textContent;
    var orden=(function(){ var pl=box.querySelector('.af-pl'), c=pl.querySelector('.af-c').getBoundingClientRect(), s=pl.querySelector('.pico').getBoundingClientRect(), n=pl.querySelector('.af-nm').getBoundingClientRect();
      return { entre:s.left>=c.right-0.5 && s.right<=n.left+0.5, w:Math.round(s.width), alto:Math.round(s.height) }; })();
    var real=prodIcoHtml; prodIcoHtml=function(){ return ''; };
    box.innerHTML=admFichaHtml(findById('p1'), dn)+admFichaHtml(findById('p2'), dn); var sin=box.textContent;
    prodIcoHtml=real; box.remove();
    return { t1:t1, t2:t2, mismoTexto:txt===sin, orden:orden };
  });
  chk('2 · ficha rápida: colchón, somier, almohada y respaldar, cada uno con su dibujito', JSON.stringify(r2.t1)==='["colchon","somier","almohada","respaldar"]', r2.t1);
  chk('2b · el combo (la bolsa y el protector de una VENTA son de tienda: no van en la ficha rápida, como siempre)', JSON.stringify(r2.t2)==='["combo"]', r2.t2);
  chk('2c · el dibujo va entre la cantidad y el nombre, chico (~22 px)', r2.orden.entre && r2.orden.w>=18 && r2.orden.w<=28, r2.orden);
  chk('2d · el texto de la ficha rápida es EXACTAMENTE el de antes', r2.mismoTexto, null);

  /* ── 3. La ficha de Administración (`showPedidoModal`) ── */
  const r3 = await page.evaluate(()=>{
    var box=document.getElementById('modal-box');
    showPedidoModal('p1');
    var filas=[].map.call(box.querySelectorAll('.fl-prod'), function(e){ var s=e.querySelector(':scope > svg.pico'); return s?s.getAttribute('data-pico'):'—'; });
    var pos=(function(){ var f=box.querySelector('.fl-prod'), q=f.querySelector('.fl-q').getBoundingClientRect(), s=f.querySelector(':scope > .pico').getBoundingClientRect(), n=f.querySelector('.fl-pn').getBoundingClientRect();
      return { entre:s.left>=q.right-0.5 && s.right<=n.left+0.5, centrado:Math.abs((s.top+s.bottom)/2-(q.top+q.bottom)/2)<=3, w:Math.round(s.width) }; })();
    var txt=box.querySelector('.fl-prods, .fl-col, .modal-b') ? [].map.call(box.querySelectorAll('.fl-prod'), function(e){ return e.textContent; }).join('|') : '';
    closeModal();
    var real=prodIcoHtml; prodIcoHtml=function(){ return ''; };
    showPedidoModal('p1'); var sin=[].map.call(box.querySelectorAll('.fl-prod'), function(e){ return e.textContent; }).join('|'); closeModal();
    prodIcoHtml=real;
    showPedidoModal('p2');
    var filas2=[].map.call(box.querySelectorAll('.fl-prod'), function(e){ var s=e.querySelector(':scope > svg.pico'); return s?s.getAttribute('data-pico'):'—'; });
    closeModal();
    return { filas:filas, filas2:filas2, pos:pos, mismo:txt===sin && txt.length>0 };
  });
  chk('3 · ficha de Administración: cada producto con su dibujito', JSON.stringify(r3.filas)==='["colchon","somier","almohada","respaldar"]', r3.filas);
  chk('3b · el combo en la otra ficha (la bolsa y el protector de una venta van en la línea «De tienda», como siempre)', JSON.stringify(r3.filas2)==='["combo"]', r3.filas2);
  chk('3c · entre el cuadrito de la cantidad y el nombre, centrado con la cantidad', r3.pos.entre && r3.pos.centrado && r3.pos.w>=22 && r3.pos.w<=32, r3.pos);
  chk('3d · el texto de los productos de la ficha no cambió', r3.mismo, null);

  /* ── 4. La Lista de carga ── */
  const r4 = await page.evaluate(()=>{
    CARGA_DIA='hoy'; renderCarga();
    var body=document.getElementById('carga-body');
    var ls=[].map.call(body.querySelectorAll('[data-carga-lugar] label'), function(l){ var s=l.querySelector('svg.pico'); return (s?s.getAttribute('data-pico'):'—')+'|'+l.textContent.replace(/\s+/g,' ').trim(); });
    var real=prodIcoHtml; prodIcoHtml=function(){ return ''; }; renderCarga();
    var sin=[].map.call(body.querySelectorAll('[data-carga-lugar] label'), function(l){ return l.textContent; }).join('|');
    prodIcoHtml=real; renderCarga();
    var con=[].map.call(body.querySelectorAll('[data-carga-lugar] label'), function(l){ return l.textContent; }).join('|');
    var l0=body.querySelector('[data-carga-lugar] label'), b=l0.querySelector('b').getBoundingClientRect(), s=l0.querySelector('.pico').getBoundingClientRect(), sp=l0.querySelector('span').getBoundingClientRect();
    return { ls:ls, mismo:sin===con, entre:s.left>=b.right-0.5 && s.right<=sp.left+0.5 };
  });
  const tipos4=r4.ls.map(x=>x.split('|')[0]).sort().join(',');
  chk('4 · Lista de carga: cada renglón con su dibujito (combo, colchón, somier, almohada, respaldar, la bolsa, el protector)', tipos4==='almohada,colchon,combo,otro,respaldar,somier,textil' && r4.ls.some(x=>/^almohada\|2× ALMOHADA 50x70/.test(x)), r4.ls);
  chk('4b · el texto de la Lista de carga no cambió y el dibujo va entre «N×» y el nombre', r4.mismo && r4.entre, r4);

  /* ── 5. Mis pedidos: la tarjeta (`misCardHtml`) y la ficha (`showMisModal`) ── */
  const r5 = await page.evaluate(()=>{
    var tiposDe=function(el){ return [].map.call(el.querySelectorAll('svg.pico'), function(s){ return s.getAttribute('data-pico'); }); };
    var box=document.createElement('div'); document.body.appendChild(box);
    box.innerHTML=misCardHtml(findById('p1'), 1, false)+misCardHtml(findById('p2'), 2, false);
    var c1=tiposDe(box.children[0]), c2=tiposDe(box.children[1]), txt=box.textContent;
    var real=prodIcoHtml; prodIcoHtml=function(){ return ''; };
    box.innerHTML=misCardHtml(findById('p1'), 1, false)+misCardHtml(findById('p2'), 2, false); var sin=box.textContent; prodIcoHtml=real; box.remove();
    showView('mis'); MIS_TODOS=false; MIS_FILTER='todos'; if(typeof MIS_TOPE!=='undefined') MIS_TOPE=120;
    document.getElementById('mis-vendedor').value='Maria Flores'; renderMis();
    var lista=[].map.call(document.querySelectorAll('#mis-lista .cho-card'), tiposDe);
    var mbox=document.getElementById('modal-box');
    showMisModal('p1'); var m1=tiposDe(mbox), mt=mbox.textContent; closeModal();
    prodIcoHtml=function(){ return ''; }; showMisModal('p1'); var msin=mbox.textContent; closeModal(); prodIcoHtml=real;
    showMisModal('p2'); var m2=tiposDe(mbox); closeModal();
    return { c1:c1, c2:c2, mismo:txt===sin, lista:lista, m1:m1, m2:m2, mmismo:mt===msin };
  });
  chk('5 · Mis pedidos, la tarjeta: un dibujito por producto', JSON.stringify(r5.c1)==='["colchon","somier","almohada","respaldar"]' && JSON.stringify(r5.c2)==='["combo","otro","textil"]', r5);
  chk('5b · …también en la lista de verdad de Mis pedidos', r5.lista.length===2 && r5.lista.some(l=>l.join()==='colchon,somier,almohada,respaldar') && r5.lista.some(l=>l.join()==='combo,otro,textil'), r5.lista);
  chk('5c · la ficha de Mis pedidos lleva los dibujitos', JSON.stringify(r5.m1)==='["colchon","somier","almohada","respaldar"]' && JSON.stringify(r5.m2)==='["combo","otro","textil"]', { m1:r5.m1, m2:r5.m2 });
  chk('5d · el texto de la tarjeta y de la ficha no cambió', r5.mismo && r5.mmismo, null);

  /* ── 6. El pedido en vivo del formulario (`#fx-der`, pantalla ancha) ── */
  const r6 = await page.evaluate(async()=>{
    var ev=function(e,t){ e.dispatchEvent(new Event(t||'input',{bubbles:true})); };
    showView('form'); resetForm();
    var vs=document.getElementById('f-vendedor'); vs.value='Maria Flores'; ev(vs); ev(vs,'change');
    var cards=function(){ return document.querySelectorAll('#f-productos .prod-card'); };
    var poner=function(i, cod){ while(cards().length<=i) document.getElementById('f-add-prod').click(); var e=cards()[i].querySelector('.prod-codigo'); e.value=cod; ev(e); ev(e,'change'); };
    poner(0,'CH1220'); poner(1,'CH1150'); poner(2,'CD1403'); poner(3,'CH1942');   // (los combos no se cargan en el formulario: van por separado)
    await new Promise(function(r){ setTimeout(r, 400); });
    fxDerPintar();
    var el=document.getElementById('fx-der');
    var t=[].map.call(el.querySelectorAll('.fx-pr'), function(e){ var s=e.querySelector('svg.pico'); return s?s.getAttribute('data-pico'):'—'; });
    var txt=el.textContent;
    var real=prodIcoHtml; prodIcoHtml=function(){ return ''; }; el._h=''; fxDerPintar(); var sin=el.textContent; prodIcoHtml=real; el._h=''; fxDerPintar();
    return { ancho:fxAncho(), t:t, mismo:txt===sin };
  });
  chk('6 · el pedido en vivo del formulario: colchón, somier, almohada y respaldar con su dibujito', r6.ancho && JSON.stringify(r6.t)==='["colchon","somier","almohada","respaldar"]', r6);
  chk('6b · el texto del pedido en vivo no cambió', r6.mismo, null);

  chk('sin errores en la página', errs.length===0, errs);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
