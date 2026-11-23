/* 🔎 LA REVISIÓN DE VENTAS ANTERIORES EN «VENTAS EN PUGNA» (23/11/2026; dueño: «se supone que debería salirme acá, en el panel» → «SI»).
   La revisión de GitHub deja su resultado en la fila del sistema `__cruces_rev__`; el panel la muestra con la contraseña. Datos inventados:
     1. la fila es del sistema (no es una venta: no entra en Contabilidad ni en Administración);
     2. con la contraseña, «Ventas en pugna» la muestra: el resumen arriba, cada venta de la misma marca con su cliente (de la planilla),
        quién la cargó, quién atendía y por qué, «lo que más se repite», y las de la otra marca aparte;
     3. una venta que ya no está en la planilla no se muestra (se dice cuántas); sin la fila, «todavía no corrió»;
     4. sin la contraseña no se ve nada.
   Se corre:  node tests/test_cruces_rev_pagina.js   (PEDIDOS=… para correrla contra otra versión) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1280, height:900 }, timezoneId:'America/La_Paz' });
  await ctx.addInitScript(()=>{ window.QA_PRUEBA=1; });
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await ctx.route(/^https:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-11-23T11:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  const r = await page.evaluate(async () => {
    CONNECTED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR=''; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    var esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
    var P=function(id, v, cli, dia){ return { id:id, oc:'11-'+id.replace(/\D/g,''), vendedor:v, cliente:cli, celular:'70001001', zona:'Norte', turno:'AM', nota:'5'+id.replace(/\D/g,''),
      fecha:'2026-11-28', productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:9000 }], saldo:9000, acuenta:0, pagado:false,
      ts:new Date(dia+'T10:00:00-04:00').getTime(), metodoPago:'' }; };
    var T=function(d){ return new Date(d+'T10:00:00-04:00').getTime(); };
    var rev={ v:1, t:T('2026-11-23'), d:14, n:164, i:[
      { id:'s1', v:'Fernando Peinado', m:'s', o:[['Juan Pablo Paredes','s','c',1,'27372541']], mm:1, wa:1, yo:1, td:0, ts:T('2026-11-12') },
      { id:'s2', v:'Fernando Peinado', m:'s', o:[['Juan Pablo Paredes','s','c',0]], mm:1, wa:1, yo:0, td:1, ts:T('2026-11-14') },
      { id:'h1', v:'Isabel Robledo', m:'h', o:[['Maria Flores','h','t',0,'c9001']], mm:1, wa:1, yo:0, td:0, ts:T('2026-11-18') },
      { id:'h2', v:'Isabel Robledo', m:'h', o:[['Mauricio Merida','s','c',0]], mm:0, wa:0, yo:0, td:0, ts:T('2026-11-19') },
      { id:'ya-no-esta', v:'Isabel Robledo', m:'h', o:[['Maria Flores','h','c',0]], mm:1, wa:1, yo:0, td:0, ts:T('2026-11-10') } ] };
    var L=[ P('s1','Fernando Peinado','CLIENTE ALFA','2026-11-12'), P('s2','Fernando Peinado','CLIENTE BETA','2026-11-14'),
            P('h1','Isabel Robledo','CLIENTE GAMA','2026-11-18'), P('h2','Isabel Robledo','CLIENTE DELTA','2026-11-19'),
            Object.assign(filaSistema(CRUREV_ID, '🔎 REVISIÓN DE CRUCES DE VENTAS (no tocar: la lee el panel)', JSON.stringify(rev)), { ts:T('2026-11-23') }) ];
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(L)) }); };
    apiSave=function(x){ return Promise.resolve({ ok:true, pedido:x }); };
    await refrescarEstado(); await esperar(150);
    var out={};
    var fila=findById(CRUREV_ID);
    out.sistema=!!fila && esFilaSistema(fila);
    try{ out.enConta=contaLista().some(function(p){ return String(p.id)===CRUREV_ID; }); }catch(e){ out.enConta='err '+e; }
    UNLOCKED=false; showView('qa'); await esperar(150); qaPugnaPintar();
    var box=document.getElementById('qa-pugna'); out.sinClave=box ? (box.hidden || !box.textContent.trim()) : true;
    UNLOCKED=true; QA_PUGNA_ABIERTO=true; qaPugnaPintar(); await esperar(50);
    out.txt=box ? box.textContent.replace(/\s+/g,' ') : '';
    out.items=box ? box.querySelectorAll('.crv-rev').length : 0;
    out.links=box ? Array.prototype.map.call(box.querySelectorAll('.crv-rev a[href]'), function(x){ return x.getAttribute('href')+' | '+x.textContent.trim(); }) : [];
    STATE=STATE.filter(function(p){ return String(p.id)!==CRUREV_ID; }); qaPugnaPintar();
    out.sinFila=box ? box.textContent.replace(/\s+/g,' ') : '';
    return out;
  });
  chk('1 · la fila es del sistema y no entra en Contabilidad', r.sistema && r.enConta===false, { s:r.sistema, c:r.enConta });
  chk('4 · sin la contraseña no se ve nada', r.sinClave);
  chk('2a · el resumen arriba dice cuántas de la misma marca', /🔎 revisión: 3 de la misma marca/.test(r.txt), r.txt.slice(0,200));
  chk('2b · la sección dice de cuándo es y cuántas miró', /Revisión de ventas anteriores/.test(r.txt) && /miró 164 ventas de los últimos 14 días/.test(r.txt) && /23\/11 10:00/.test(r.txt));
  chk('2c · cada venta con su cliente (de la planilla), quién la cargó, quién atendía y por qué', /OC 11-1 · CLIENTE ALFA/.test(r.txt) && /por Fernando Peinado · según Kommo, Juan Pablo Paredes conversaba con el cliente/.test(r.txt) && /Maria Flores tenía una tarea abierta/.test(r.txt));
  chk('2d · «lo que más se repite»: Fernando Peinado → Juan Pablo Paredes ×2', /Lo que más se repite: Fernando Peinado → Juan Pablo Paredes ×2/.test(r.txt));
  chk('2e · marcas útiles: «la otra empezó primero», «la que vendió también conversaba», venta de tienda', /la otra empezó primero/.test(r.txt) && /la que vendió también conversaba/.test(r.txt) && /venta de tienda/.test(r.txt));
  chk('2f · la de la otra marca va aparte, con la marca', /Con alguien de la OTRA marca \(1\)/.test(r.txt) && /Mauricio Merida \(Sueña\) conversaba/.test(r.txt));
  chk('3a · la que ya no está en la planilla no se muestra y se dice', !/ya-no-esta/.test(r.txt) && /1 venta de la revisión ya no está en la planilla/.test(r.txt) && r.items===4, r.items);
  chk('5a · (23/11, dueño: «¿cómo sé que lo hizo por celular?») cada venta dice que se encontró por el celular y en qué Kommo', /Se encontró por el celular 70001001 \(no por el nombre\) en el Kommo de Sueña/.test(r.txt) && /en el Kommo de Heaven/.test(r.txt), r.txt.slice(0,600));
  chk('5b · con el lead guardado, el enlace al chat en el Kommo de esa marca', r.links.some(function(l){ return l.indexOf('https://gerenciamultiespumasviscarra.kommo.com/leads/detail/27372541 | 💬 Ver el chat de Juan Pablo Paredes en Kommo')===0; }), r.links);
  chk('5c · un contacto sin lead lleva a su ficha de contacto', r.links.some(function(l){ return l.indexOf('https://eanez.kommo.com/contacts/detail/9001 |')===0; }), r.links);
  chk('5d · sin el lead (una revisión de antes), dice que lo busquen por ese número', /buscá ese número en Kommo: el contacto puede tener otro nombre/.test(r.txt) && r.links.length===2, r.links);
  chk('3b · sin la fila: «todavía no corrió»', /Revisión de ventas anteriores \(todavía no corrió\)/.test(r.sinFila), r.sinFila.slice(-200));
  chk('sin errores en la página', !errores.length, errores);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exitCode = FAIL ? 1 : 0;
})().catch(e=>{ console.error(e); process.exitCode=2; });
