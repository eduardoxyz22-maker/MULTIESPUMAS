/* 🤖 EL BOT DE WHATSAPP EN EL PANEL (11/10, §4jt). Con el servidor 2026-10-11-a prendido, cada respuesta trae `wa:1` y el panel lo
   DICE para que nadie mande el mismo mensaje dos veces: «🤖 El bot de WhatsApp se lo manda solo» al guardar, «le avisa del día
   nuevo» al cambiar el día, y en Mis pedidos → 🔔 «Lo avisa el bot» (cuenta como avisado). Los que el bot no toca (Eduardo, sin
   celular) siguen con el botón de siempre. Con el bot apagado (o un servidor viejo, sin `wa`), todo queda como antes.
   Red cortada, servidor simulado, reloj clavado. Se corre:  node tests/test_wa_pagina.js
   Dientes:  PEDIDOS=/ruta/a/un/pedidos.html/viejo node tests/test_wa_pagina.js            */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,extra)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, extra!=null?('· '+(typeof extra==='string'?extra:JSON.stringify(extra))):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];

  async function nueva(iso) {
    const ctx = await browser.newContext({ viewport:{width:1300,height:1000}, timezoneId:'America/La_Paz', locale:'es-BO' });
    const page = await ctx.newPage();
    await page.clock.setFixedTime(new Date(iso));
    page.on('pageerror', e => errores.push(e.message));
    page.on('dialog', d => d.accept());
    await page.route(/^https?:/, r => r.abort());
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    const ok = await page.evaluate(() => typeof nxBotManda==='function');
    if(!ok) return page;
    await page.evaluate(() => {
      var c=document.getElementById('conn-form'); if(c) c.style.display='none';
      CONNECTED=true; UNLOCKED=true;
      CARGA_GEN++; CARGA_ESTADO='ok';
      if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; }
      if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
      if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
      if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
      try{ localStorage.clear(); }catch(e){}
      window.__XLSX=null; window.__NOMBRE='';
      buildXlsx=function(sheets){ window.__XLSX=JSON.parse(JSON.stringify(sheets)); return new Uint8Array([1]); };
      downloadBlob=function(b,n){ window.__NOMBRE=n; };
      window.SRV=[];
      window.__apiPostReal=apiPost;
      apiPost=function(b){
        if(b.action==='save'){
          var c=JSON.parse(JSON.stringify(b.pedido)); c.rev=(Number(c.rev)||0)+1;
          window.SRV=window.SRV.filter(function(x){ return x.id!==c.id; }).concat([c]);
          return Promise.resolve({ok:true, pedido:JSON.parse(JSON.stringify(c))});
        }
        if(b.action==='list') return Promise.resolve({ok:true, pedidos:JSON.parse(JSON.stringify(window.SRV))});
        return Promise.resolve({ok:true});
      };
      apiList=function(){ return new Promise(function(res){ setTimeout(function(){ res({ok:true, pedidos:JSON.parse(JSON.stringify(window.SRV))}); },0); }); };
      window.hoy=todayStr();
      window.dia=function(n){ var d=new Date(window.hoy+'T12:00:00'); d.setDate(d.getDate()+n); return isoLocal(d); };
      window.tsDe=function(f){ return new Date(f+'T12:00:00').getTime(); };
      window.P=function(o){
        var b={ turno:'AM', celular:'', nit:'', zona:'Norte', direccion:'Calle 1', fecha:window.dia(2), maps:'', observaciones:'',
                estado:'', entregado:false, chofer:'', vehiculo:'', nroDia:1, fotos:[], vendedor:'Carola Chavez', ts:window.tsDe(window.hoy),
                acuenta:0, saldo:0, pagado:true, metodoPago:'', productos:[{desc:'COLCHON SOFT',medida:'140x190',cant:1}] };
        var q={}; for(var k in b) q[k]=b[k]; for(var k2 in o) q[k2]=o[k2]; return q;
      };
      window.cargar=async function(filas){
        closeModal();
        window.SRV=JSON.parse(JSON.stringify(filas)); setPending([]);
        STATE=[]; RETIROS=[];
        SAVE_ULTIMO={}; SAVE_REV={}; SAVE_EN_VUELO={}; SAVE_EN_ESPERA={};
        await refrescarEstado();
      };
      window.esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
    });
    return page;
  }

  let page = await nueva('2026-10-09T15:00:00Z');   // viernes 09/10, 11:00 de Bolivia
  if(!(await page.evaluate(() => typeof nxBotManda==='function'))){
    chk('existe nxBotManda (§4jt)', false); console.log(`\n${PASS} bien · ${FAIL} mal`); await browser.close(); process.exit(1);
  }
  console.log('\n── el servidor dice si el bot está prendido ──');
  let r = await page.evaluate(async () => {
    var antes=WA_BOT;
    var f0=window.fetch;
    window.fetch=function(){ return Promise.resolve({ ok:true, status:200, json:function(){ return Promise.resolve({ ok:true, version:'2026-10-11-a', wa:1, rechazos:[] }); } }); };
    var res=null; try{ res=await window.__apiPostReal({ action:'rechazos' }); }catch(e){ res=String(e); }
    var con=WA_BOT;
    window.fetch=function(){ return Promise.resolve({ ok:true, status:200, json:function(){ return Promise.resolve({ ok:true, version:'2026-10-09-a', rechazos:[] }); } }); };
    try{ await window.__apiPostReal({ action:'rechazos' }); }catch(e){}
    var viejo=WA_BOT;
    window.fetch=function(){ return Promise.resolve({ ok:true, status:200, json:function(){ return Promise.resolve({ ok:true, wa:0, rechazos:[] }); } }); };
    try{ await window.__apiPostReal({ action:'rechazos' }); }catch(e){}
    var apagado=WA_BOT;
    window.fetch=f0;
    return { antes:antes, con:con, viejo:viejo, apagado:apagado, res:typeof res==='string'?res:'' };
  });
  chk('arranca apagado; con `wa:1` se prende; un servidor sin `wa` no lo cambia; `wa:0` lo apaga', !r.antes && r.con && r.viejo && !r.apagado, r);

  console.log('\n── al guardar y al cambiar de día ──');
  r = await page.evaluate(async () => {
    var man=proximoDiaEntrega();
    var p=P({ id:'B1', cliente:'ANA GUTIERREZ', celular:'76543210', fecha:man }), e=P({ id:'B2', cliente:'MULTICENTER', celular:'76543210', fecha:man, vendedor:'Eduardo' });
    var s=P({ id:'B3', cliente:'SIN CEL', celular:'', fecha:man }), a=P({ id:'B4', cliente:'ATC', oc:'ATC 10-001', celular:'76543210', fecha:man });
    WA_BOT=false; var off=nxClienteBloque(p,'nuevo');
    WA_BOT=true;
    return { off:off, on:nxClienteBloque(p,'nuevo'), camb:nxClienteBloque(p,'cambio'), edu:nxClienteBloque(e,'nuevo'), sin:nxClienteBloque(s,'nuevo'),
             atc:nxClienteBloque(a,'nuevo'), manda:[p,e,s,a].map(nxBotManda) };
  });
  chk('apagado: el cuadro de siempre («Se puede corregir antes de mandarlo»)', /Se puede corregir/.test(r.off) && !/bot/i.test(r.off));
  chk('prendido: «🤖 El bot de WhatsApp se lo manda solo, en unos 2 minutos»', /🤖 El bot de WhatsApp se lo manda solo, en unos 2 minutos/.test(r.on), r.on.slice(0,300));
  chk('…y el botón a mano sigue ahí', /Abrir el WhatsApp de Ana/.test(r.on));
  chk('al cambiar de día: «le avisa del día nuevo solo»', /🤖 El bot de WhatsApp le avisa del día nuevo solo/.test(r.camb));
  chk('Eduardo y el sin celular: sin cartel del bot (se manda a mano, como siempre)', !/🤖/.test(r.edu) && !/🤖/.test(r.sin), [r.edu.slice(0,200), r.sin.slice(0,200)]);
  chk('nxBotManda: Ana sí; Eduardo, sin celular y ATC no', JSON.stringify(r.manda)==='[true,false,false,false]', r.manda);

  console.log('\n── Mis pedidos → 🔔 Mañana ──');
  const m1 = async (bot) => page.evaluate(async (bot) => {
    WA_BOT=bot;
    var man=proximoDiaEntrega();
    await cargar([ P({ id:'M1', cliente:'ANA GUTIERREZ', celular:'76543210', fecha:man, turno:'AM' }),
                   P({ id:'M2', cliente:'PEDRO VACA', celular:'', fecha:man, turno:'PM' }) ]);
    WA_BOT=bot;
    setVendedorMem('Carola Chavez'); document.getElementById('mis-vendedor').value='Carola Chavez';
    showView('mis'); await esperar(150); NX_M1_ABIERTA=true; renderMis(); await esperar(80);
    var f=document.querySelector('#mis-metrics .mi-f5'), filas=[].map.call(document.querySelectorAll('#nx-m1 .nx-m1-r'), function(x){ return x.innerText; });
    return { ficha:f?f.innerText:'', filas:filas, pie:(document.querySelector('#nx-m1 .nx-pie')||{}).innerText||'' };
  }, bot);
  r = await m1(false);
  chk('apagado: 0 de 2 y «💬 Avisar» para Ana', /0 de 2/.test(r.ficha) && r.filas.some(t => /ANA/.test(t) && /Avisar/.test(t)), r);
  r = await m1(true);
  chk('prendido: Ana cuenta como avisada (1 de 2) con «🤖 Lo avisa el bot»', /1 de 2/.test(r.ficha) && r.filas.some(t => /ANA/.test(t) && /Lo avisa el bot/.test(t)), r);
  chk('…Pedro (sin celular) sigue «sin celular»', r.filas.some(t => /PEDRO/.test(t) && /sin celular/.test(t)), r.filas);
  chk('…y el pie lo explica', /El bot de WhatsApp les manda el recordatorio.*17:00 los de la mañana y a las 19:00 los de la tarde/.test(r.pie), r.pie);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  console.log(`\n${PASS} bien · ${FAIL} mal`);
  await browser.close();
  process.exitCode = FAIL ? 1 : 0;
})();
