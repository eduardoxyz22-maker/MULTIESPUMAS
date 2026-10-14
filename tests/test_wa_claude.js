/* 🧠 LO QUE CLAUDE ENTENDIÓ Y CONTESTÓ, EN EL PANEL (14/10, §4lc, servidor 2026-10-14-b). El dueño eligió que Claude «entienda y
   conteste» lo que los clientes le escriben al bot. Lo que cuida, con el servidor de mentira:
     · cada tarjeta dice qué quiere el cliente, el resumen y lo que Claude le contestó; los mensajes que contestó juntos van en UNA;
     · lo urgente se ve en rojo; lo que Claude resolvió solo (atendido «🤖 Claude») no le queda pendiente a nadie, pero se cuenta y se
       puede ver con «Ver cuáles»; una reacción no se cuenta como consulta;
     · el texto de arriba cambia («Claude ya le contestó…») y el aviso de Eduardo usa el resumen;
     · con respuestas de antes de Claude (sin `ia`) todo se ve como hasta hoy.
   Datos SINTÉTICOS. Se corre:  node tests/test_wa_claude.js   (desde la raíz) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const ARCH='file://'+(process.env.PEDIDOS||path.resolve('pedidos.html'));
(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{ width:1180, height:900 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await page.clock.setFixedTime(new Date('2026-10-14T10:20:00-04:00'));
  await page.route(/^https?:/, r => r.abort());
  await page.goto(ARCH, { waitUntil:'load' }); await page.waitForTimeout(700);
  let r = await page.evaluate(() => {
    CARGA_GEN++; CARGA_ESTADO='ok';
    STATE=[{ id:'p1', fecha:'2026-10-15', turno:'PM', oc:'10-145', vendedor:'Carola Chavez', cliente:'JUAN ROCA', celular:'70111222', productos:[{desc:'COLCHON',cant:1}], ts:1 },
           { id:'p2', fecha:'2026-10-16', turno:'AM', oc:'10-150', vendedor:'Carola Chavez', cliente:'ANA ROJAS', celular:'70000001', productos:[{desc:'COLCHON',cant:1}], ts:2 },
           { id:'p3', fecha:'2026-10-16', turno:'AM', oc:'10-151', vendedor:'Maria Flores', cliente:'LUIS PAZ', celular:'70000002', productos:[{desc:'COLCHON',cant:1}], ts:3 }];
    window.__llamadas=[];
    var RESP=[
      { w:'wamid.u', ms:5, t:'14/10 10:12', id:'p1', oc:'10-145', nom:'Juan', num:'59170111222', txt:'no voy a estar mañana, ¿pueden el sábado?', at:'',
        ia:'🤖 contestó · 🚨 urgente', cat:'no_esta', res:'No va a estar el jueves; pide el sábado', resp:'¡Hola Juan! Ya le pasé tu mensaje a tu vendedora 🙏', urg:true, antes:['Hola'] },
      { w:'wamid.h', ms:4, t:'14/10 10:05', id:'p2', oc:'10-150', nom:'Ana', num:'59170000001', txt:'¿A qué hora llega?', at:'🤖 Claude · 14/10 10:06',
        ia:'🤖 contestó', cat:'hora', res:'Pregunta a qué hora llega', resp:'¡Hola Ana! Llega el viernes por la mañana, entre las 9:00 y las 12:00.', urg:false, antes:[] },
      { w:'wamid.r', ms:3, t:'14/10 10:01', id:'p2', oc:'10-150', nom:'Ana', num:'59170000001', txt:'[reacción] 👍', at:'🤖 reacción · 14/10 10:01', ia:'— reacción: no se contesta', antes:[] },
      { w:'wamid.x', ms:2, t:'14/10 09:50', id:'p2', oc:'10-150', nom:'Ana', num:'59170000001', txt:'[audio]', at:'',
        ia:'⏭️ Claude no contestó: HTTP 529 · Overloaded', antes:[] },
      { w:'wamid.v', ms:1, t:'13/10 17:09', id:'p3', oc:'10-151', nom:'Luis', num:'59170000002', txt:'Quiero cambiar el día', at:'' } ];
    apiPost=function(b){ __llamadas.push(b);
      if(b.action==='waRespuestas') return Promise.resolve({ ok:true, version:SERVER_VER, resp:JSON.parse(JSON.stringify(RESP)) });
      if(b.action==='waRespAtendida') return Promise.resolve({ ok:true, at:b.quien+' · 14/10 10:20' });
      return Promise.resolve({ ok:true }); };
    SERVER_VER='2026-10-14-b'; WA_BOT=true; WA_RESP_T=0; waRespTraer();
    return __llamadas.filter(function(x){ return x.action==='waRespuestas'; }).length;
  });
  chk('con el servidor 2026-10-14-b el panel pide las respuestas como siempre', r===1, r);
  await page.waitForTimeout(150);
  r = await page.evaluate(() => {
    document.getElementById('mis-vendedor').value='Carola Chavez'; showView('mis'); renderMis();
    var m=document.getElementById('wa-resp-mis'), cs=m.querySelectorAll('.wa-resp-c');
    return { txt:m.innerText, n:cs.length, urg:!!m.querySelector('.wa-resp-c.urg .wa-resp-cat.urg'), tit:(m.querySelector('.wa-resp-tit')||{}).textContent||'' };
  });
  chk('Carola ve 2 pendientes (la urgente y el audio sin contestar), no la que Claude resolvió ni la reacción', r.n===2 && /2 clientes le respondieron/.test(r.tit) && !/A qué hora llega\?/.test(r.txt) && !/reacción/.test(r.txt), r);
  chk('la urgente: «🏠 No va a estar · 🚨 urgente», el resumen y lo que Claude le contestó, en rojo', r.urg && /🏠 No va a estar · 🚨 urgente/.test(r.txt) && /🧠 No va a estar el jueves; pide el sábado/.test(r.txt) &&
      /🤖 Claude le contestó: «¡Hola Juan! Ya le pasé tu mensaje a tu vendedora 🙏»/.test(r.txt), r.txt);
  chk('los dos mensajes que contestó juntos van en UNA tarjeta («Hola» arriba)', /«Hola»\s*«no voy a estar mañana/.test(r.txt), r.txt);
  chk('si Claude no pudo, dice que le llegó la automática y por qué', /🤖 Le llegó la respuesta automática de siempre \(Claude no contestó: HTTP 529 · Overloaded\)\./.test(r.txt), r.txt);
  chk('arriba: «Claude ya le contestó al cliente…» y abajo cuántas resolvió solo (1, sin contar la reacción)', /Claude ya le contestó al cliente con los datos de su pedido/.test(r.txt) && /Claude resolvió solo 1 consulta \(cuándo llega/.test(r.txt), r.txt);
  r = await page.evaluate(() => {
    var b=[].slice.call(document.querySelectorAll('#wa-resp-mis .wa-resp-hechas button')).filter(function(x){ return /Ver cuáles/.test(x.textContent); })[0]; b.click();
    var m=document.getElementById('wa-resp-mis');
    return { n:m.querySelectorAll('.wa-resp-c').length, hecha:m.querySelectorAll('.wa-resp-c.hecha').length, txt:m.innerText };
  });
  chk('«Ver cuáles» muestra la que resolvió Claude (atendida, con «⏰ Pregunta cuándo llega» y lo que le contestó)', r.n===3 && r.hecha===1 && /⏰ Pregunta cuándo llega/.test(r.txt) && /✓ 🤖 Claude · 14\/10 10:06/.test(r.txt) && /Llega el viernes por la mañana/.test(r.txt), r);
  r = await page.evaluate(() => { document.getElementById('mis-vendedor').value='Maria Flores'; renderMis(); return document.getElementById('wa-resp-mis').innerText; });
  chk('Maria ve la suya de antes de Claude (sin `ia`) con el texto de siempre', /Quiero cambiar el día/.test(r) && /El bot solo manda avisos y no lee/.test(r) && !/Claude/.test(r), r);
  r = await page.evaluate(() => {
    document.getElementById('mis-vendedor').value='Carola Chavez'; setVendedorMem && setVendedorMem('Carola Chavez');
    var A=asisAvisos('mis')||[]; var a=A.filter(function(x){ return /^resp\|/.test(x.k); })[0]; return a ? a.x : '';
  });
  chk('el aviso de Eduardo usa el resumen de Claude y dice que es urgente', /🧠 No va a estar el jueves; pide el sábado · 🚨 urgente\. Claude ya le contestó/.test(r), r);
  r = await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none'; UNLOCKED=true; WA_RESP_VER_IA=false;
    document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block';
    showView('admin'); renderAdmin(); var a=document.getElementById('wa-resp-adm');
    return { n:a.querySelectorAll('.wa-resp-c').length, txt:a.innerText };
  });
  chk('Administración ve las 3 pendientes de todos y «Claude resolvió solo 1»', r.n===3 && /Claude resolvió solo 1 consulta/.test(r.txt), r.n);
  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e => { console.error(e); process.exit(1); });
