/* 🎨 MEJORA 432 — BOT: LA RESPUESTA DEL CLIENTE COMO EN WHATSAPP (16/11/2026; el dueño eligió las ideas visuales 390-440 menos la 403).

   En la pestaña 🤖 Bot cada cliente que contestó es una conversación: nombre e iniciales arriba, lo que escribió en globos blancos con la hora,
   el resumen de Claude al medio, lo que le contestó en globo verde (✓✓), el pedido en etiquetas y «✓ Ya lo atendí» grande. Urgentes primero.

   LO QUE ESTA PRUEBA CUIDA:
   1. Sin la bandera `WZ_PRUEBA` (Playwright): las tarjetas de siempre (`.wa-resp-c`).
   2. Con la bandera: una conversación por cliente que espera, la urgente primero (con borde rojo), con todo lo de antes: quién, lo que escribió
      (y lo de antes), el resumen, lo que le contestó, la categoría, el pedido (OC, día y turno, vendedora) y la ubicación que mandó.
   3. Los mismos botones: «Abrir el pedido» abre su ficha, «✓ Ya lo atendí» lo marca (la misma acción al servidor) y lo saca; «Escribirle»
      va a wa.me con su número; «Ver cuáles» muestra lo que Claude resolvió solo (sin el botón, con quién lo atendió).
   4. Lo que Claude todavía está leyendo (⏳) lo dice; una respuesta sin pedido dice «No sé de qué pedido es».
   5. Plegado («Ocultar») queda solo el título; Mis pedidos sigue con las tarjetas de siempre.
   6. El título se lee: oscuro con Espuma, claro con Black Friday.
   Datos INVENTADOS. Reloj clavado: lunes 16/11/2026 a las 10:00 de Bolivia.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 TZ=America/La_Paz node tests/test_v432_bot_whatsapp.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

function PREPARAR(){
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  loadFromServer=function(){};
  var P=function(i, v, f, t){ return { id:'p'+i, oc:'11-'+(300+i), nota:String(800+i), vendedor:v, cliente:'CLIENTE INVENTADO '+i, celular:'7000'+(1000+i), fecha:f, turno:t, zona:'NORTE',
    direccion:'Calle '+i, productos:[{desc:'COLCHON INVENTADO',medida:'140x190',cant:1,precio:1000}], saldo:0, acuenta:1000, pagado:true, metodoPago:'', entregado:false, ts:Date.parse('2026-11-14T10:00:00-04:00'), fotos:[] }; };
  STATE=[P(1,'Carola Chavez','2026-11-17','AM'), P(2,'Maria Flores','2026-11-18','PM'), P(3,'Isabel Robledo','2026-11-16','PM')];
  window.__POSTS=[];
  apiPost=function(o){ window.__POSTS.push(o); return Promise.resolve(o && o.action==='waRespAtendida' ? { ok:true, at:'Logística · 10:01' } : { ok:true }); };
  UNLOCKED=true;
  WA_RESP=[
    { w:'w1', id:'p1', nom:'ROSA INVENTADA PEÑA', num:'59170001001', t:'16/11 09:41', txt:'mañana no voy a estar, ¿se puede el jueves?', ia:'🤖 cambio', cat:'cambio',
      res:'Pide pasar la entrega al jueves 19/11.', resp:'Hola, le paso tu pedido a logística para el jueves 19/11.' },
    { w:'w2', id:'p2', nom:'LUIS INVENTADO VACA', num:'59170001002', t:'16/11 09:52', antes:['Buen día'], txt:'el colchón llegó con una mancha', ia:'🤖 urgente', cat:'reclamo', urg:true,
      res:'Reclama una mancha.', resp:'Lamentamos mucho: ya le avisé a tu vendedora.', ubi:{ r:'guardada', id:'p2', link:'https://www.google.com/maps?q=-17.78,-63.18' } },
    { w:'w3', id:'', oc:'', nom:'', num:'59170001003', t:'16/11 08:15', txt:'hola', ia:'⏳' },
    { w:'w4', id:'p3', nom:'Cliente', num:'59170001004', t:'16/11 07:58', txt:'¿a qué hora llegan?', ia:'🤖 hora', at:'🤖 Claude', cat:'hora', resp:'Entre las 14:30 y las 18:30.' }
  ];
  showView('bot');
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (o) => {
    o=o||{};
    const ctx = await browser.newContext({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await ctx.route(/^https?:/, r => r.abort());
    await page.addInitScript((o) => { if(o.flag) window.WZ_PRUEBA=1; try{ localStorage.removeItem('me_mis_plegado'); }catch(e){} }, o);
    await page.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS + (o.q||'?tema=espuma'), { waitUntil:'load' });
    await page.waitForTimeout(450);
    await page.evaluate(PREPARAR);
    await page.evaluate(() => { waRespPintar(); });
    await page.waitForTimeout(250);
    page._ctx=ctx; return page;
  };
  const leer = (page) => page.evaluate(() => {
    var box=document.getElementById('wa-resp-adm'), cs=[].slice.call(box.querySelectorAll('.wz'));
    var t=box.querySelector('.wz-tit');
    return { viejas:box.querySelectorAll('.wa-resp-c').length, n:cs.length, tit:t ? t.innerText.replace(/\s+/g,' ').trim() : '', titColor:t ? getComputedStyle(t).color : '',
      cards:cs.map(function(c){ return { urg:c.classList.contains('urg'), quien:(c.querySelector('.wz-q b')||{}).textContent, ini:(c.querySelector('.wz-av')||{}).textContent, cat:(c.querySelector('.wz-cat')||{}).textContent||'',
        entra:[].map.call(c.querySelectorAll('.wz-in'), function(b){ return b.childNodes[0].textContent; }), sale:(c.querySelector('.wz-out')||{}).textContent||'', notas:[].map.call(c.querySelectorAll('.wz-res'), function(x){ return x.textContent; }),
        ped:(c.querySelector('.wz-ped')||{}).innerText||'', ubi:!!c.querySelector('.wa-resp-ubi'), bt:[].map.call(c.querySelectorAll('.wz-bt .btn, .wz-bt .wa-resp-at'), function(b){ return b.textContent.trim(); }),
        wa:(c.querySelector('.wz-bt a')||{}).href||'' }; }) };
  });

  console.log('\n── 1. Sin la bandera ──');
  let page = await abrir({});
  let r = await leer(page);
  chk('1a. sin `WZ_PRUEBA`: las tarjetas de siempre', r.viejas===3 && r.n===0, r);
  await page._ctx.close();

  console.log('\n── 2-5. Con la bandera ──');
  page = await abrir({ flag:true });
  r = await leer(page);
  chk('2a. una conversación por cliente que espera (3), sin las tarjetas de antes', r.n===3 && r.viejas===0, r.n);
  chk('2b. la urgente primero, con su borde rojo', r.cards[0] && r.cards[0].urg && r.cards[0].quien==='LUIS INVENTADO VACA' && !r.cards[1].urg, r.cards.map(c=>c.quien+(c.urg?'!':'')));
  chk('2c. el título dice cuántos esperan una persona', /3 clientes esperan una respuesta de una persona/.test(r.tit), r.tit);
  const c0=r.cards[0], c1=r.cards[1];
  chk('2d. quién (con sus iniciales) y qué quiere', c0.ini==='LI' && /Reclamo/.test(c0.cat) && /urgente/.test(c0.cat) && /cambiar la entrega/.test(c1.cat), [c0.ini, c0.cat, c1.cat]);
  chk('2e. lo que escribió (y lo de antes) en globos, con la hora', JSON.stringify(c0.entra)==='["Buen día","el colchón llegó con una mancha"]', c0.entra);
  chk('2f. el resumen de Claude y lo que le contestó (con ✓✓)', c0.notas.some(n=>/Reclama una mancha/.test(n)) && /Lamentamos mucho/.test(c0.sale), [c0.notas, c0.sale]);
  chk('2g. el pedido en etiquetas: OC, día y turno, vendedora', /OC 11-302/.test(c0.ped) && /18\/11 PM/.test(c0.ped) && /Maria Flores/.test(c0.ped), c0.ped);
  chk('2h. la ubicación que mandó, adentro', c0.ubi, c0.ubi);
  chk('4a. lo que Claude está leyendo (⏳) lo dice; sin pedido, «No sé de qué pedido es»', r.cards[2] && r.cards[2].notas.some(n=>/está leyendo/.test(n)) && /No sé de qué pedido es/.test(r.cards[2].ped), r.cards[2]);
  chk('3a. «Escribirle» va a wa.me con su número', /wa\.me\/59170001002$/.test(c0.wa), c0.wa);
  r = await page.evaluate(async () => { [].filter.call(document.querySelectorAll('#wa-resp-adm .wz')[0].querySelectorAll('button'), function(b){ return /Abrir el pedido/.test(b.textContent); })[0].click(); await new Promise(x=>setTimeout(x, 300));
    var o={ on:document.getElementById('modal').classList.contains('on'), tit:(document.querySelector('#modal-box')||{}).innerText||'' }; closeModal(); return o; });
  chk('3b. «Abrir el pedido» abre la ficha de ESE pedido', r.on && /CLIENTE INVENTADO 2/.test(r.tit), r.on);
  r = await page.evaluate(async () => { document.querySelectorAll('#wa-resp-adm .wz')[0].querySelector('.wz-ok').click(); await new Promise(x=>setTimeout(x, 300));
    return { post:window.__POSTS.filter(function(p){ return p.action==='waRespAtendida'; }).map(function(p){ return p.w; }), n:document.querySelectorAll('#wa-resp-adm .wz').length, tit:(document.querySelector('#wa-resp-adm .wz-tit')||{}).innerText||'' }; });
  chk('3c. «✓ Ya lo atendí» manda lo de siempre al servidor y lo saca (quedan 2)', JSON.stringify(r.post)==='["w2"]' && r.n===2 && /^\D*2 clientes/.test(r.tit.replace(/\s+/g,' ')), r);
  r = await page.evaluate(async () => { [].filter.call(document.querySelectorAll('#wa-resp-adm .wz-hechas button'), function(b){ return /Ver cuáles/.test(b.textContent); })[0].click(); await new Promise(x=>setTimeout(x, 200));
    var h=[].slice.call(document.querySelectorAll('#wa-resp-adm .wz.hecha')); return { n:h.length, at:h.map(function(c){ return (c.querySelector('.wa-resp-at')||{}).textContent; }), ok:h.map(function(c){ return !!c.querySelector('.wz-ok'); }) }; });
  chk('3d. «Ver cuáles»: lo que Claude resolvió solo (1), con quién lo atendió y sin el botón', r.n===1 && r.at.every(a=>/✓/.test(a||'')) && r.ok.every(x=>!x), r);
  r = await page.evaluate(async () => { var b=document.querySelector('#wa-resp-adm .wz-tit button'); if(b) b.click(); await new Promise(x=>setTimeout(x, 200));
    var o={ n:document.querySelectorAll('#wa-resp-adm .wz').length, tit:!!document.querySelector('#wa-resp-adm .wz-tit') }; var b2=document.querySelector('#wa-resp-adm .wz-tit button'); if(b2) b2.click(); return o; });
  chk('5a. plegado («Ocultar») queda solo el título', r.tit && r.n===0, r);
  r = await page.evaluate(async () => { document.getElementById('mis-vendedor').value='Carola Chavez'; waRespPintar(); await new Promise(x=>setTimeout(x, 100));
    var m=document.getElementById('wa-resp-mis'); return { viejas:m.querySelectorAll('.wa-resp-c').length, wz:m.querySelectorAll('.wz').length }; });
  chk('5b. Mis pedidos sigue con las tarjetas de siempre', r.wz===0 && r.viejas===1, r);
  r = await leer(page);
  chk('6a. con Espuma el título va oscuro', /rgb\((\d+), (\d+), (\d+)\)/.test(r.titColor) && +RegExp.$1<100, r.titColor);
  await page._ctx.close();
  page = await abrir({ flag:true, q:'?tema=black-friday' });
  r = await leer(page);
  chk('6b. con Black Friday el título va claro', /rgb\(250, 250, 249\)/.test(r.titColor), r.titColor);
  await page._ctx.close();

  chk('sin errores en la página', errores.length===0, errores.slice(0,4));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
