/* 🙈 OCULTAR EN MIS PEDIDOS Y EN ADMINISTRACIÓN (13/10). El dueño: «falta botón ocultar para que no se les haga larguísima la página en
   Mis pedidos a las vendedoras, ahora que también salen sus mensajes» y «lo mismo en Administración para ocultar».
   Lo que cuida: las ventas de Kommo y lo que contestaron los clientes al bot se pliegan con «🙈 Ocultar» (queda la línea con cuántas
   son) y vuelven con «👁️ Mostrar»; se recuerda en el aparato; Administración tiene su propio botón. Y la hora del mensaje se lee
   («13/10 09:41», no «Tue Oct 13 2026 09:41:00 GMT-0400…»). Datos SINTÉTICOS.
   Se corre:  node tests/test_ocultar.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const ARCH='file://'+(process.env.PEDIDOS||path.resolve('pedidos.html'));
(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{ width:1180, height:900 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await page.clock.setFixedTime(new Date('2026-10-13T10:30:00-04:00'));
  await page.route(/^https?:/, r => r.abort());
  await page.goto(ARCH, { waitUntil:'load' }); await page.waitForTimeout(700);
  let r = await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    loadFromServer=function(){}; apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE.concat(window.__BORR||[]))) }); };   // las ventas de Kommo vienen en la lista: si no, la lectura de fondo las borra
    try{ localStorage.removeItem('me_mis_plegado'); }catch(e){}
    STATE=[{ id:'p1', fecha:'2026-10-14', turno:'PM', oc:'10-145', vendedor:'Carola Chavez', cliente:'JUAN PEREZ', celular:'70000002', productos:[{desc:'COLCHON',cant:1}], ts:1 }];
    BORRADORES=[{ id:'kommo-1', estado:BORRADOR_EST, fecha:'', vendedor:'Carola Chavez', cliente:'MARCO ENRIQUEZ', celular:'70000003', productos:[{desc:'ESPECIAL ANTIALERGICO', medida:'105x190', cant:2}], ts:2 },
                { id:'kommo-2', estado:BORRADOR_EST, fecha:'', vendedor:'Carola Chavez', cliente:'ANA ROJAS', celular:'70000004', productos:[{desc:'TITANIO LATEX', medida:'140x190', cant:1}], ts:3 }];
    window.__BORR=JSON.parse(JSON.stringify(BORRADORES));
    WA_BOT=true;
    WA_RESP=[{ w:'wamid.a', ms:1, t:'Tue Oct 13 2026 09:41:00 GMT-0400 (hora de Bolivia)', id:'p1', oc:'10-145', nom:'Juan', num:'59170000002', txt:'¿A qué hora llegan?', at:'' }];
    document.getElementById('mis-vendedor').value='Carola Chavez'; showView('mis'); renderMis(); renderBorradoresMis(); waRespPintar();
    var k=document.getElementById('mis-borradores'), w=document.getElementById('wa-resp-mis');
    return { kTxt:k.innerText, kBtn:!!k.querySelector('[data-plegar="kommo"]'), kCards:(k.innerText.match(/MARCO ENRIQUEZ|ANA ROJAS/g)||[]).length,
             wTxt:w.innerText, wBtn:!!w.querySelector('[data-plegar="wa-mis"]'), wCards:w.querySelectorAll('.wa-resp-c').length };
  });
  chk('Mis pedidos: las ventas de Kommo con «🙈 Ocultar» y sus tarjetas', r.kBtn && /2 ventas vinieron de Kommo/.test(r.kTxt) && r.kCards>=2 && /🙈 Ocultar/.test(r.kTxt), r.kTxt.slice(0,200));
  chk('…y lo que contestaron los clientes, también con «🙈 Ocultar»', r.wBtn && r.wCards===1, r);
  chk('la hora del mensaje se lee: «13/10 09:41», no la fecha larga en inglés', /13\/10 09:41/.test(r.wTxt) && !/GMT/.test(r.wTxt), r.wTxt.slice(0,200));
  r = await page.evaluate(() => {
    document.querySelector('#mis-borradores [data-plegar="kommo"]').click();
    document.querySelector('#wa-resp-mis [data-plegar="wa-mis"]').click();
    var k=document.getElementById('mis-borradores'), w=document.getElementById('wa-resp-mis'), guardado=null;
    try{ guardado=JSON.parse(localStorage.getItem('me_mis_plegado')); }catch(e){}
    return { kTxt:k.innerText, kCards:(k.innerText.match(/MARCO ENRIQUEZ|ANA ROJAS/g)||[]).length, wCards:w.querySelectorAll('.wa-resp-c').length, wTxt:w.innerText, guardado:guardado };
  });
  chk('«Ocultar»: queda la línea con cuántas son y el botón «👁️ Mostrar»; las tarjetas se van', /2 ventas vinieron de Kommo/.test(r.kTxt) && r.kCards===0 && /👁️ Mostrar/.test(r.kTxt) && r.wCards===0 && /1 cliente le respondió/.test(r.wTxt), r);
  chk('se recuerda en el aparato', r.guardado && r.guardado.kommo===1 && r.guardado['wa-mis']===1, r.guardado);
  r = await page.evaluate(() => {
    UNLOCKED=true; document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block';
    showView('admin'); renderAdmin(); waRespPintar();
    var a=document.getElementById('wa-resp-adm'), antes=a.querySelectorAll('.wa-resp-c').length;
    a.querySelector('[data-plegar="wa-adm"]').click();
    var despues=document.getElementById('wa-resp-adm').querySelectorAll('.wa-resp-c').length;
    showView('mis'); renderMis(); waRespPintar();
    return { antes:antes, despues:despues, mis:document.getElementById('wa-resp-mis').querySelectorAll('.wa-resp-c').length };
  });
  chk('Administración tiene su propio «Ocultar» (no depende del de Mis pedidos)', r.antes===1 && r.despues===0, r);
  r = await page.evaluate(() => {
    document.querySelector('#mis-borradores [data-plegar="kommo"]').click();
    var k=document.getElementById('mis-borradores'); return { kCards:(k.innerText.match(/MARCO ENRIQUEZ|ANA ROJAS/g)||[]).length, txt:k.innerText.slice(0,120) };
  });
  chk('«👁️ Mostrar» las vuelve a poner', r.kCards>=2, r);
  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e => { console.error(e); process.exit(1); });
