/* 👥 LAS METAS DE CADA VENDEDORA EN LA VENTANA «🎯 METAS POR MARCA» (13/11, mejora 174). Las metas por vendedora existían (mínima y
   presupuesto, `m[ym].vd` de `__metas__`) pero solo se cargaban en «🏁 Cierre comercial del mes»; ahora también acá, debajo de cada marca.
   LO QUE CUIDA (servidor de mentira; solo datos inventados; reloj clavado el jueves 12/11/2026 a las 11:00 de Bolivia):
   1. Debajo de cada marca, una fila por vendedora de esa marca (`MARCAS`), adentro de la tarjeta de la marca; noviembre sin metas por
      vendedora guardadas: muestra las de octubre como SUGERIDAS y lo dice («guardá para confirmarlas»); Carola con tilde en octubre empareja.
   2. Lo vendido y la proyección de cada vendedora = los MISMOS números de «👤 Por vendedor» de Proyección (el texto de la pantalla).
   3. El % = lo vendido ÷ el presupuesto (sin presupuesto, la mínima); «¿Llega?» con la proyección: verde llega, ámbar cerca (≥ 90 %), rojo
      lejos; sin meta, «sin meta» y «—».
   4. Abajo de cada marca, la suma de los presupuestos contra la meta de la marca («se pasa por» / «faltan … sin repartir»), y todo se
      recalcula mientras se escribe sin rearmar la ventana (el cursor no se pierde).
   5. Guardar escribe `m[ym].vd` con lo que se ve (las sugeridas quedan confirmadas) y conserva TODO lo demás: `esc`, las metas por marca,
      octubre entero, y una vendedora guardada que ya no está en `MARCAS`. Un monto mal escrito o una mínima mayor que el presupuesto no se
      guardan. La proyección no cambia por tener metas.
   6. El cierre comercial lee lo mismo: después de guardar acá, `ccmMetas` da las de acá (confirmadas) y lo que se guarda en el cierre se ve
      acá.
   7. «📋 Copiar las de <mes anterior>» copia también las de las vendedoras.
   8. Un mes cerrado: sin columna de proyección, «¿Llegó?»; en el celular la ventana no se ensancha; sin errores.
   Se corre:  node tests/test_metas_vendedoras.js   (PEDIDOS=… contra otra versión; META_CAP=<carpeta> deja capturas) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const CAP = process.env.META_CAP || '';

const PREPARAR = () => {
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  var L=[], n=0;
  var V=function(v, f, bs, reg){ n++; L.push({ id:'v'+n, oc:'11-'+(100+n), nota:String(8000+n), cliente:'CLIENTE '+n, celular:'7100000'+n, fecha:f, turno:'AM', zona:'Norte',
    direccion:'CALLE '+n, vendedor:v, productos:[{ desc:'COLCHON SOFT', medida:'140x190', codigo:'', cant:1, precio:bs }], saldo:0, acuenta:0, pagado:true,
    metodoPago:'Efectivo '+bs, ts:new Date((reg||f)+'T10:00:00-04:00').getTime(), rev:1 }); };
  /* octubre (cerrado) y noviembre hasta hoy, más lo agendado para después */
  ['2026-10'].forEach(function(m){ for(var d=1; d<=30; d+=3){ var f=m+'-'+(d<10?'0':'')+d; if(dowDe(f)===0) continue;
    V('Maria Flores', f, 9000); V('Isabel Robledo', f, 14000); V('Carola Chavez', f, 6000); V('Mauricio Merida', f, 8000); } });
  for(var d=2; d<=12; d++){ var f='2026-11-'+(d<10?'0':'')+d; if(dowDe(f)===0) continue;
    V('Maria Flores', f, 9500); V('Isabel Robledo', f, 4000); if(d%2) V('Carola Chavez', f, 11000); if(d%3===0) V('Mauricio Merida', f, 7000); }
  V('Isabel Robledo','2026-11-25', 20000, '2026-11-10');   // agendada para después de hoy
  /* octubre con metas por vendedora (Carola con tilde, como la escribe Kommo) y escala; noviembre solo con las de marca y su escala */
  var ESC={ heaven:{ t:[['min',100,2],['pres',100,3]], bono:1 }, suena:{ t:[['min',100,2]], bono:0 } };
  L.push({ id:'__metas__', fecha:'', cliente:'🎯 METAS', rev:5, observaciones:JSON.stringify({ v:1, m:{
    '2026-10':{ heaven:300000, suena:80000, t:1, vd:{ 'Maria Flores':[100000,130000], 'Isabel Robledo':[125000,160000], 'Carola Chávez':[90000,100000], 'Mauricio Merida':[75000,120000] }, esc:ESC },
    '2026-11':{ heaven:390000, suena:100000, t:2, esc:ESC } } }) });
  STATE=L.slice();
  window.SRV=JSON.parse(JSON.stringify(L)); window.SAVES=[]; window.SIN_RED=false;
  apiList=function(){ if(window.SIN_RED) return Promise.reject(new Error('sin red')); return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window.SRV)) }); };
  apiSave=function(x){ window.SAVES.push(JSON.parse(JSON.stringify(x)));
    var y=JSON.parse(JSON.stringify(x)); y.rev=(Number(y.rev)||0)+1;
    window.SRV=window.SRV.filter(function(p){ return String(p.id)!==String(x.id); }).concat([y]);
    return Promise.resolve({ ok:true, pedido:y }); };
  ULTIMO_REFRESCO=Date.now();
};
const espera=ms=>new Promise(r=>setTimeout(r,ms||80));
const fotoPry = page => page.evaluate(()=>{ var R=proyeccionMes('2026-11'); return JSON.stringify({ e:R.equipo, m:R.marcas.map(function(m){ return [m.g.k, m.tot, m.filas.map(function(r){ return [r.vendedor, r.vendido, r.proy]; })]; }) }); });
/* Lo que se ve de cada vendedora en la ventana */
const VENTANA = () => {
  var o={};
  document.querySelectorAll('#modal-box .mt-vd tr[data-vd]').forEach(function(tr){
    var td=tr.querySelectorAll('td'), ins=tr.querySelectorAll('input');
    o[tr.getAttribute('data-vd')]={ marca:tr.closest('.mt-vd').getAttribute('data-marca'), mi:ins[0].value, pr:ins[1].value,
      vend:(tr.querySelector('.mt-vd-v')||{}).innerText, proy:(tr.querySelector('.mt-vd-p')||{}).innerText||null, pc:tr.querySelector('.mt-vd-pc').innerText,
      est:(tr.querySelector('.mt-vs')||{}).innerText, cls:(tr.querySelector('.mt-vs')||{className:''}).className };
  });
  return o;
};

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (w) => {
    const ctx = await browser.newContext({ viewport:{ width:w, height:900 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await ctx.route(/^https?:\/\//, r => r.abort());
    await page.clock.setFixedTime(new Date('2026-11-12T11:00:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate(PREPARAR);
    await page.evaluate(()=>{ showView('conta'); segSet('cta-tab','proy'); setContaTab('proy'); document.getElementById('pry-mes').value='2026-11'; renderProyeccion(); });
    await page.waitForTimeout(150);
    return { ctx, page };
  };

  let { ctx, page } = await abrir(1280);
  const antes=await fotoPry(page);
  /* lo que dice «👤 Por vendedor» de Proyección, tal cual en la pantalla */
  const porVend=await page.evaluate(()=>{ var o={}; document.querySelectorAll('#cta-pane-proy .pry-fila').forEach(function(f){ var q=f.querySelector('.pry-q b'), n=f.querySelector('.pry-n b'), p=f.querySelector('.pry-n .pry-p');
    if(q && n) o[q.innerText.trim()]={ vend:n.innerText.trim(), proy:p ? p.innerText.replace('📈','').trim() : null }; }); return o; });

  /* 1 · la ventana de noviembre */
  await page.evaluate(()=>metasAbrir('2026-11'));
  await espera();
  let W=await page.evaluate(VENTANA);
  let r=await page.evaluate(()=>{ var b=document.getElementById('modal-box');
    var dentro=MARCAS.every(function(g){ var c=document.getElementById('mt-in-'+g.k).closest('.mt-campo'); return c && c.querySelector('.mt-vd[data-marca="'+g.k+'"]'); });
    return { av:(b.querySelector('.mt-vd-av')||{}).innerText||'', dentro:dentro, h:document.getElementById('mt-in-heaven').value, nv:MARCAS.map(function(g){ return [g.k, g.vendedores.length, b.querySelectorAll('.mt-vd[data-marca="'+g.k+'"] tr[data-vd]').length]; }) }; });
  chk('1 · cada marca tiene su bloque de vendedoras ADENTRO de su tarjeta, con una fila por vendedora de MARCAS', r.dentro && r.nv.every(function(x){ return x[1]===x[2]; }), r.nv);
  chk('1 · la meta de la marca sigue arriba (Heaven 390.000)', r.h==='390.000', r.h);
  chk('1 · noviembre sin metas por vendedora: «sugeridas: las de octubre — guardá para confirmarlas»', /sugeridas: las de octubre de 2026/i.test(r.av) && /guardá para confirmarlas/.test(r.av), r.av);
  chk('1 · las sugeridas son las de octubre: Maria 100.000 / 130.000, Mauricio 75.000 / 120.000', (W['Maria Flores']||{}).mi==='100.000' && (W['Maria Flores']||{}).pr==='130.000' && (W['Mauricio Merida']||{}).mi==='75.000' && (W['Mauricio Merida']||{}).pr==='120.000' && (W['Mauricio Merida']||{}).marca==='suena', [(W['Maria Flores']||{}), (W['Mauricio Merida']||{})]);
  chk('1 · «Carola Chávez» (con tilde, guardada así en octubre) empareja con Carola Chavez: 90.000 / 100.000', (W['Carola Chavez']||{}).mi==='90.000' && (W['Carola Chavez']||{}).pr==='100.000', (W['Carola Chavez']||{}));

  /* 2 · los mismos números de «Por vendedor» */
  const conVenta=Object.keys(W).filter(function(v){ return porVend[v]; });
  chk('2 · lo vendido y la proyección de cada vendedora son los de «👤 Por vendedor» (el texto de la pantalla)', conVenta.length>=4 && conVenta.every(function(v){ return (W[v]||{}).vend===porVend[v].vend && (W[v]||{}).proy===porVend[v].proy; }),
    conVenta.map(function(v){ return [v, (W[v]||{}).vend, porVend[v].vend, (W[v]||{}).proy, porVend[v].proy]; }));
  chk('2 · una vendedora de la marca sin ventas sale con Bs 0,00', (W['Jonathan Monje']||{}) && (W['Jonathan Monje']||{}).vend==='Bs 0,00', (W['Jonathan Monje']||{}));

  /* 3 · el % y si llega */
  r=await page.evaluate(()=>{ var R=proyeccionMes('2026-11'), o={}; R.marcas.forEach(function(m){ m.filas.forEach(function(f){ o[f.vendedor]={ v:f.vendido, p:f.proy }; }); }); return o; });
  const esperado=(v, p, M)=>{ if(v>=M-0.005) return 'ok'; if(p>=M-0.005) return 'ok'; if(p>=0.9*M) return 'cerca'; return 'lejos'; };
  const casos=[['Maria Flores',130000],['Isabel Robledo',160000],['Carola Chavez',100000],['Mauricio Merida',120000]];
  chk('3 · el % = lo vendido ÷ el presupuesto, redondeado', casos.every(function(c){ return (W[c[0]]||{}).pc===Math.round(r[c[0]].v/c[1]*100)+'%'; }), casos.map(function(c){ return [c[0], (W[c[0]]||{}).pc, Math.round(r[c[0]].v/c[1]*100)]; }));
  chk('3 · «¿Llega?» con la proyección contra el presupuesto (verde llega, ámbar desde el 90 %, rojo lejos)', casos.every(function(c){ return ((W[c[0]]||{}).cls||'').indexOf('mt-vs-'+esperado(r[c[0]].v, r[c[0]].p, c[1]))>=0; }),
    casos.map(function(c){ return [c[0], (W[c[0]]||{}).est, esperado(r[c[0]].v, r[c[0]].p, c[1]), Math.round(r[c[0]].p/c[1]*100)]; }));
  chk('3 · hay de los tres colores en el caso (para que la prueba muerda)', ['ok','cerca','lejos'].every(function(k){ return casos.some(function(c){ return esperado(r[c[0]].v, r[c[0]].p, c[1])===k; }); }), casos.map(function(c){ return esperado(r[c[0]].v, r[c[0]].p, c[1]); }));
  chk('3 · sin meta: «sin meta» y «—»', (W['Jonathan Monje']||{}).est==='sin meta' && (W['Jonathan Monje']||{}).pc==='—', (W['Jonathan Monje']||{}));

  /* 4 · la suma contra la meta de la marca, y en vivo */
  r=await page.evaluate(()=>({ h:document.getElementById('mt-vd-pie-heaven').innerText, s:document.getElementById('mt-vd-pie-suena').innerText }));
  chk('4 · Heaven: 130.000 + 160.000 + 100.000 = 390.000 contra la meta 390.000: «cuadra justo»', /suman Bs 390\.000/.test(r.h) && /cuadra justo/.test(r.h), r.h);
  chk('4 · Sueña: 120.000 contra 100.000: «se pasa por Bs 20.000»', /suman Bs 120\.000/.test(r.s) && /se pasa por Bs 20\.000/.test(r.s), r.s);
  r=await page.evaluate(()=>{
    var i=META_ED.vs.map(function(o){ return o.v; }).indexOf('Maria Flores'), el=document.getElementById('mt-vd-pr-'+i);
    el.focus(); el.value='100000'; el.dispatchEvent(new Event('input', { bubbles:true }));
    var h=document.getElementById('mt-in-heaven'); h.value='450.000'; h.dispatchEvent(new Event('input', { bubbles:true }));
    el.focus();
    var R=proyeccionMes('2026-11'), f=R.marcas[1].filas.filter(function(x){ return x.vendedor==='Maria Flores'; })[0];
    return { pie:document.getElementById('mt-vd-pie-heaven').innerText, pc:document.getElementById('mt-vd-pc-'+i).innerText, esperado:Math.round(f.vendido/100000*100)+'%',
             mismo:document.activeElement===el, eq:document.getElementById('mt-suma').innerText };
  });
  chk('4 · al escribir el presupuesto de Maria (100.000) cambia su % sin rearmar la ventana', r.pc===r.esperado && r.mismo, r);
  chk('4 · y al cambiar la meta de Heaven a 450.000: «faltan Bs 90.000 sin repartir»', /suman Bs 360\.000/.test(r.pie) && /faltan Bs 90\.000 sin repartir/.test(r.pie), r.pie);
  chk('4 · la suma del equipo (las marcas) sigue: Bs 550.000', /550\.000/.test(r.eq), r.eq);
  if(CAP){ fs.mkdirSync(CAP,{recursive:true}); await page.evaluate(()=>{ var t=document.getElementById('toast'); if(t) t.className='toast'; }); await page.screenshot({ path:path.join(CAP,'metas-vendedoras.png'), fullPage:false, animations:'disabled' }); }

  /* 5 · lo mal escrito no se guarda */
  r=await page.evaluate(()=>{ var i=META_ED.vs.map(function(o){ return o.v; }).indexOf('Isabel Robledo'), el=document.getElementById('mt-vd-mi-'+i);
    el.value='12abc'; el.dispatchEvent(new Event('input', { bubbles:true })); var rojo=el.classList.contains('mt-mal-in'); metasGuardar();
    return { n:window.SAVES.length, rojo:rojo }; });
  await espera();
  chk('5 · «12abc» en la mínima de Isabel: se marca en rojo y no se guarda', r.n===0 && r.rojo, r);
  r=await page.evaluate(()=>{ var i=META_ED.vs.map(function(o){ return o.v; }).indexOf('Isabel Robledo'), el=document.getElementById('mt-vd-mi-'+i);
    el.value='200.000'; el.dispatchEvent(new Event('input', { bubbles:true })); metasGuardar(); return { n:window.SAVES.length, t:(document.getElementById('toast')||{}).innerText||'' }; });
  await espera();
  chk('5 · una mínima (200.000) mayor que el presupuesto (160.000) no se guarda y lo dice', r.n===0 && /mínima .* es más que el presupuesto/.test(r.t), r);
  await page.evaluate(()=>{ var i=META_ED.vs.map(function(o){ return o.v; }).indexOf('Isabel Robledo'), el=document.getElementById('mt-vd-mi-'+i); el.value='125.000'; el.dispatchEvent(new Event('input', { bubbles:true })); });

  /* 5 · guardar */
  await page.evaluate(()=>metasGuardar());
  await espera(200);
  r=await page.evaluate(()=>{ var s=window.SAVES.filter(function(x){ return x.id==='__metas__'; }).pop(), o=s ? JSON.parse(s.observaciones) : null;
    return { n:window.SAVES.length, nov:o && o.m['2026-11'], oct:o && o.m['2026-10'], rev:s && s.rev, modal:document.getElementById('modal').classList.contains('on') }; });
  const nov=r.nov||{};
  chk('5 · guarda noviembre: Heaven 450.000, Sueña 100.000, con el sello de la planilla, y cierra la ventana', r.n===1 && nov.heaven===450000 && nov.suena===100000 && r.rev===5 && !r.modal, { n:r.n, h:nov.heaven, s:nov.suena, rev:r.rev });
  chk('5 · …con las de las vendedoras como se veían (Maria 100.000 / 100.000; Carola con su nombre de la lista)', nov.vd && JSON.stringify(nov.vd['Maria Flores'])==='[100000,100000]' && JSON.stringify(nov.vd['Carola Chavez'])==='[90000,100000]' &&
    JSON.stringify(nov.vd['Isabel Robledo'])==='[125000,160000]' && JSON.stringify(nov.vd['Mauricio Merida'])==='[75000,120000]', nov.vd);
  chk('5 · las que no tienen nada no se guardan (Jonathan, Mirian…)', nov.vd && !nov.vd['Jonathan Monje'] && !nov.vd['Mirian Salazar'], nov.vd && Object.keys(nov.vd));
  chk('5 · conserva la escala de noviembre y octubre entero (metas por marca, vendedoras y escala)', nov.esc && nov.esc.heaven && nov.esc.heaven.t.length===2 && r.oct && r.oct.heaven===300000 && r.oct.vd && r.oct.vd['Carola Chávez'] && r.oct.esc, { esc:nov.esc, oct:r.oct });
  const despues=await fotoPry(page);
  chk('5 · la proyección (lo vendido y lo proyectado de cada vendedora y marca) da EXACTAMENTE lo mismo', antes===despues, '');

  /* 6 · el cierre comercial lee lo mismo */
  r=await page.evaluate(()=>{ var mt=ccmMetas('2026-11'), D=ccmDatos('2026-11'), c=D.filas.filter(function(f){ return normNombre(f.v)===normNombre('Carola Chavez'); })[0];
    return { ok:mt.ok, maria:ccmMetaDe(mt.vd,'Maria Flores'), carola:c ? [c.mi, c.pr] : null }; });
  chk('6 · después de guardar acá, el cierre comercial las toma como guardadas (no sugeridas) con los mismos números', r.ok===true && r.maria.join()==='100000,100000' && r.carola && r.carola.join()==='90000,100000', r);
  await page.evaluate(()=>{ ccmAbrir('2026-11'); ccmEdAbrir(); var i=CCM.ed.vs.map(function(o){ return o.v; }).indexOf('Jonathan Monje'); CCM.ed.mi[i]='60.000'; CCM.ed.pr[i]='80.000';
    var a=document.getElementById('ccm-mi-'+i), b=document.getElementById('ccm-pr-'+i); if(a) a.value='60.000'; if(b) b.value='80.000';
    return ccmEdGuardar(); });
  await espera(200);
  await page.evaluate(()=>{ try{ ccmCerrarVentana(); }catch(e){} metasAbrir('2026-11'); });
  await espera();
  W=await page.evaluate(VENTANA);
  r=await page.evaluate(()=>({ av:!!document.querySelector('#modal-box .mt-vd-av') }));
  chk('6 · y lo que se guarda en el cierre comercial (Jonathan 60.000 / 80.000) se ve acá, sin el aviso de sugeridas', (W['Jonathan Monje']||{}).mi==='60.000' && (W['Jonathan Monje']||{}).pr==='80.000' && !r.av && (W['Maria Flores']||{}).pr==='100.000', [(W['Jonathan Monje']||{}), r]);
  await page.evaluate(()=>{ closeModal(); META_ED=null; });

  /* 5b · una vendedora guardada que ya no está en MARCAS no se pierde al guardar acá */
  await page.evaluate(()=>{ var p=window.SRV.filter(function(x){ return x.id==='__metas__'; })[0], D=JSON.parse(p.observaciones); D.m['2026-11'].vd['Vieja Vendedora']=[50000,60000]; p.observaciones=JSON.stringify(D);
    STATE=STATE.filter(function(x){ return x.id!=='__metas__'; }).concat([JSON.parse(JSON.stringify(p))]); window.SAVES=[]; metasAbrir('2026-11'); });
  await espera();
  r=await page.evaluate(()=>({ ve:!!document.querySelector('#modal-box tr[data-vd="Vieja Vendedora"]') }));
  await page.evaluate(()=>metasGuardar());
  await espera(200);
  r.vd=await page.evaluate(()=>{ var s=window.SAVES.pop(); return s ? JSON.parse(s.observaciones).m['2026-11'].vd : null; });
  chk('5b · una vendedora guardada que ya no está en la lista (no se ve acá) queda guardada igual', !r.ve && r.vd && JSON.stringify(r.vd['Vieja Vendedora'])==='[50000,60000]' && r.vd['Jonathan Monje'], r);

  /* 7 · copiar las del mes anterior */
  await page.evaluate(()=>{ metasAbrir('2026-12'); });
  await espera();
  r=await page.evaluate(()=>({ av:(document.querySelector('#modal-box .mt-vd-av')||{}).innerText||'' }));
  chk('7 · diciembre: sugeridas las de noviembre', /sugeridas: las de noviembre de 2026/i.test(r.av), r.av);
  await page.evaluate(()=>{ var i=META_ED.vs.map(function(o){ return o.v; }).indexOf('Maria Flores'); document.getElementById('mt-vd-pr-'+i).value='999.999'; metasCopiarAnterior(); });
  W=await page.evaluate(VENTANA);
  r=await page.evaluate(()=>({ h:document.getElementById('mt-in-heaven').value, t:(document.getElementById('toast')||{}).innerText||'' }));
  chk('7 · «📋 Copiar las de noviembre» trae la meta de Heaven y las de las vendedoras (Maria vuelve a 100.000, Jonathan 60.000 / 80.000)', r.h==='450.000' && (W['Maria Flores']||{}).pr==='100.000' && (W['Jonathan Monje']||{}).mi==='60.000' && /vendedoras/.test(r.t), [r, (W['Maria Flores']||{}), (W['Jonathan Monje']||{})]);
  await page.evaluate(()=>{ closeModal(); META_ED=null; });

  /* 8 · un mes cerrado */
  await page.evaluate(()=>{ metasAbrir('2026-10'); });
  await espera();
  W=await page.evaluate(VENTANA);
  r=await page.evaluate(()=>{ var b=document.getElementById('modal-box'); return { th:[].map.call(b.querySelectorAll('.mt-vd[data-marca="heaven"] th'), function(t){ return t.innerText; }).join('|'), av:!!b.querySelector('.mt-vd-av') }; });
  const okCerrado=['Maria Flores','Isabel Robledo','Carola Chavez'].every(function(v){ return /^(🎉 llegó|cerró en el \d+%)$/.test((W[v]||{}).est) && (W[v]||{}).proy===null; });
  chk('8 · octubre (cerrado): sin columna de proyección, «¿Llegó?», cada una «🎉 llegó» o «cerró en el N%», y no son sugeridas', okCerrado && !/Proyección/i.test(r.th) && /Llegó/i.test(r.th) && !r.av, { th:r.th, W:['Maria Flores','Isabel Robledo','Carola Chavez'].map(function(v){ return (W[v]||{}).est; }) });
  await ctx.close();

  const C=await abrir(390);
  await C.page.evaluate(()=>metasAbrir('2026-11'));
  await espera();
  r=await C.page.evaluate(()=>{ var b=document.getElementById('modal-box'); return { sw:b.scrollWidth, cw:b.clientWidth, dw:document.documentElement.scrollWidth, dc:document.documentElement.clientWidth }; });
  chk('8 · en el celular (390 px) la ventana no se ensancha (la tabla de vendedoras se desliza adentro)', r.sw<=r.cw+1 && r.dw<=r.dc+1, r);
  if(CAP) await C.page.screenshot({ path:path.join(CAP,'metas-vendedoras-cel.png'), animations:'disabled' });
  await C.ctx.close();

  chk('sin errores de la página', !errores.length, errores);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
