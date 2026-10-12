/* 💬 LO QUE CONTESTAN LOS CLIENTES AL BOT, EN EL PANEL (12/10, §4kk). El dueño: «haz que las respuestas de los clientes aparezcan en
   el panel». Lo que cuida, con el servidor de mentira: con el servidor 2026-10-12-c y el bot prendido, el panel pide `waRespuestas`;
   la vendedora del pedido lo ve arriba de Mis pedidos (otra vendedora no); Administración ve todas; «✓ Ya lo atendí» manda
   `waRespAtendida` con su nombre y la tarjeta se va de las pendientes; con un servidor viejo no pide nada.
   Se corre:  node tests/test_wa_resp.js   (desde la raíz) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const ARCH='file://'+(process.env.PEDIDOS||path.resolve('pedidos.html'));
(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{ width:1180, height:900 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await page.clock.setFixedTime(new Date('2026-10-12T17:20:00-04:00'));
  await page.route(/^https?:/, r => r.abort());
  await page.goto(ARCH, { waitUntil:'load' }); await page.waitForTimeout(700);
  let r = await page.evaluate(() => {
    CARGA_GEN++; CARGA_ESTADO='ok';
    STATE=[{ id:'p1', fecha:'2026-10-13', turno:'PM', oc:'10-145', vendedor:'Carola Chavez', cliente:'EDUARDO PRUEBA', celular:'62505280', productos:[{desc:'COLCHON',cant:1}], ts:1 },
           { id:'p2', fecha:'2026-10-14', turno:'AM', oc:'10-150', vendedor:'Maria Flores', cliente:'ANA ROJAS', celular:'70000001', productos:[{desc:'COLCHON',cant:1}], ts:2 }];
    window.__llamadas=[];
    var RESP=[{ w:'wamid.a', ms:1, t:'12/10 17:09', id:'p1', oc:'10-145', nom:'Eduardo', num:'59162505280', txt:'Quiero modificar mi horario y día de entrega', at:'' },
              { w:'wamid.b', ms:2, t:'12/10 17:12', id:'p2', oc:'10-150', nom:'Ana', num:'59170000001', txt:'¿A qué hora llegan?', at:'' }];
    apiPost=function(b){ __llamadas.push(b);
      if(b.action==='waRespuestas') return Promise.resolve({ ok:true, version:SERVER_VER, resp:JSON.parse(JSON.stringify(RESP)) });
      if(b.action==='waRespAtendida'){ RESP.forEach(function(x){ if(x.w===b.w) x.at=b.quien+' · 12/10 17:20'; }); return Promise.resolve({ ok:true, at:b.quien+' · 12/10 17:20' }); }
      return Promise.resolve({ ok:true }); };
    SERVER_VER='2026-10-09-a'; WA_BOT=true; WA_RESP_T=0; waRespTraer();
    var viejo=__llamadas.length;
    SERVER_VER='2026-10-12-c'; WA_RESP_T=0; waRespTraer();
    return { viejo:viejo, nuevo:__llamadas.filter(function(x){ return x.action==='waRespuestas'; }).length };
  });
  chk('con un servidor viejo no pide nada; con el 2026-10-12-c pide waRespuestas', r.viejo===0 && r.nuevo===1, r);
  await page.waitForTimeout(150);
  r = await page.evaluate(() => {
    document.getElementById('mis-vendedor').value='Carola Chavez'; showView('mis'); renderMis();
    var m=document.getElementById('wa-resp-mis');
    return { txt:m.innerText, n:m.querySelectorAll('.wa-resp-c').length, wa:(m.querySelector('a[href*="wa.me"]')||{}).href||'' };
  });
  chk('Carola ve SOLO la respuesta de su cliente, con el texto, la OC y «Escribirle»', r.n===1 && /Quiero modificar mi horario/.test(r.txt) && /OC 10-145/.test(r.txt) && !/A qué hora/.test(r.txt) && /wa\.me\/59162505280/.test(r.wa), r);
  r = await page.evaluate(() => { document.getElementById('mis-vendedor').value='Maria Flores'; renderMis(); return document.getElementById('wa-resp-mis').innerText; });
  chk('Maria ve la suya y no la de Carola', /A qué hora llegan/.test(r) && !/Quiero modificar/.test(r), r);
  r = await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none'; UNLOCKED=true;
    document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block';
    showView('admin'); renderAdmin(); var a=document.getElementById('wa-resp-adm');
    return { n:a.querySelectorAll('.wa-resp-c').length, tit:(a.querySelector('.wa-resp-tit')||{}).textContent||'' };
  });
  chk('Administración ve las dos: «💬 2 clientes le respondieron al bot de WhatsApp»', r.n===2 && /2 clientes le respondieron/.test(r.tit), r);
  r = await page.evaluate(async () => {
    setVendedorMem && setVendedorMem('Carola Chavez'); document.getElementById('mis-vendedor').value='Carola Chavez';
    waRespAtender('wamid.a'); await new Promise(function(ok){ setTimeout(ok, 80); });
    var ll=__llamadas.filter(function(x){ return x.action==='waRespAtendida'; });
    return { ll:ll, pend:waRespPend().map(function(x){ return x.w; }), adm:document.getElementById('wa-resp-adm').querySelectorAll('.wa-resp-c').length };
  });
  chk('«✓ Ya lo atendí» manda waRespAtendida con el nombre y la saca de las pendientes', r.ll.length===1 && r.ll[0].w==='wamid.a' && /Carola/.test(r.ll[0].quien) && JSON.stringify(r.pend)==='["wamid.b"]' && r.adm===1, r);
  r = await page.evaluate(() => { showView('mis'); renderMis(); return document.getElementById('wa-resp-mis').innerText; });
  chk('…y a Carola ya no le aparece', r.trim()==='', r);
  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e => { console.error(e); process.exit(1); });
