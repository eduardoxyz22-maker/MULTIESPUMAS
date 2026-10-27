/* 🎯 LAS METAS POR MARCA Y MES (27/10, §4nb). El dueño (29/09): «las metas son por marca y cambian cada mes»; (27/10): «¿dónde están para
   colocar las metas?».
   LO QUE CUIDA (servidor de mentira; solo datos sintéticos; reloj clavado el martes 27/10/2026 a las 11:00):
   1. Sin metas, Proyección invita a cargarlas y ninguna cuenta cambia; con metas, tampoco (solo se agrega lo de la meta).
   2. «🎯 Metas» abre la ventana del mes de Proyección; se escribe «150.000» y queda 150000; guardar relee la planilla y cambia SOLO ese
      mes (lo que cargó otro aparato para otro mes queda).
   3. La caja «Cómo van contra la meta»: el % vendido, el % proyectado, la barra, cuánto falta por día hábil y si llega o no.
   4. La ficha «🎯 Meta del equipo» y el pie de la curva de cada marca.
   5. Un monto mal escrito no se guarda; sin señal tampoco; «Copiar las de septiembre».
   6. Un mes cerrado dice si llegó; la fila no es una venta; en el celular entra en la pantalla.
   Se corre:  node tests/test_metas.js   (META_CAP=<carpeta> deja capturas) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const CAP = process.env.META_CAP || '';

const PREPARAR = (conMetaSep) => {
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  var n=0, L=[];
  var P=function(v, f, bs, dCarga){ n++; L.push({ id:'h'+n, oc:'10-'+(100+n), nota:String(7000+n), cliente:'CLIENTE '+n, celular:'7100000'+n, fecha:f, turno:'AM', zona:'Norte',
    direccion:'CALLE '+n, vendedor:v, productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:bs }], saldo:0, acuenta:0, pagado:true,
    metodoPago:'Efectivo '+bs, ts:new Date((dCarga||f)+'T10:00:00-04:00').getTime(), rev:1 }); };
  ['2026-08','2026-09'].forEach(function(m){
    for(var d=1; d<=28; d++){ var f=m+'-'+(d<10?'0':'')+d; if(dowDe(f)===0) continue;
      P('Maria Flores', f, 3000+d*10); P('Isabel Robledo', f, 2500); if(d%2) P('Mauricio Merida', f, 2000); }
  });
  for(var d=1; d<=27; d++){ var f='2026-10-'+(d<10?'0':'')+d; if(dowDe(f)===0) continue; P('Maria Flores', f, 3100); if(d%2) P('Mauricio Merida', f, 2100); }
  P('Maria Flores','2026-10-30', 4000, '2026-10-20');   // agendada para después de hoy
  if(conMetaSep) L.push({ id:'__metas__', fecha:'', cliente:'🎯 METAS', observaciones:JSON.stringify({ v:1, m:{ '2026-09':{ heaven:140000, suena:30000, t:1 } } }), rev:3 });
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
const fotoPry = page => page.evaluate(()=>{ var R=proyeccionMes('2026-10'); return JSON.stringify({ e:R.equipo, m:R.marcas.map(function(m){ return [m.g.k, m.tot]; }), may:R.mayor.tot, sin:R.sinMarca.tot, mt:R.metodos }); });

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (w, conMetaSep) => {
    const ctx = await browser.newContext({ viewport:{ width:w, height:900 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await ctx.route(/^https?:\/\//, r => r.abort());
    await page.clock.setFixedTime(new Date('2026-10-27T11:00:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate(PREPARAR, !!conMetaSep);
    await page.evaluate(()=>{ showView('conta'); segSet('cta-tab','proy'); setContaTab('proy'); document.getElementById('pry-mes').value='2026-10'; renderProyeccion(); });
    await page.waitForTimeout(150);
    return { ctx, page };
  };

  /* 1 · Sin metas */
  let { ctx, page } = await abrir(1280, true);
  const antes=await fotoPry(page);
  let r=await page.evaluate(()=>({ caja:document.getElementById('pry-metas').innerText.replace(/\s+/g,' '), met:document.getElementById('pry-metrics').innerText,
    pie:[].map.call(document.querySelectorAll('#cx-pry .cx-kf-pie'), function(e){ return e.innerText; }), btn:!!document.getElementById('pry-metas-btn') }));
  chk('1 · sin metas de octubre: «Todavía no hay metas para octubre» con su botón, y el botón «🎯 Metas» arriba', /Todavía no hay metas para octubre/i.test(r.caja) && /Cargar las metas/.test(r.caja) && r.btn, r.caja);
  chk('1 · sin la ficha «Meta del equipo»', !/Meta del equipo/.test(r.met), r.met);
  chk('1 · la curva de cada marca dice «Meta: sin cargar»', r.pie.length && r.pie.every(function(t){ return /Meta: sin cargar/.test(t); }), r.pie);

  /* 2 · Cargar las de octubre */
  await page.evaluate(()=>metasAbrir());
  await espera();
  r=await page.evaluate(()=>{ var b=document.getElementById('modal-box'); return { tit:b.querySelector('h3').innerText, mes:document.getElementById('mt-mes-n').innerText,
    ins:[].map.call(b.querySelectorAll('.mt-campo label'), function(l){ return l.innerText; }), hist:b.querySelector('.mt-tab').innerText.replace(/\s+/g,' '),
    sub:[].map.call(b.querySelectorAll('.mt-campo small'), function(s){ return s.innerText; }) }; });
  chk('2 · la ventana: «🎯 Metas por marca», octubre, un campo por marca', /Metas por marca/.test(r.tit) && /octubre/i.test(r.mes) && r.ins.length===2 && r.ins.some(t=>/Heaven/.test(t)) && r.ins.some(t=>/Sueña/.test(t)), r);
  chk('2 · al lado de cada campo, la meta y lo vendido de septiembre (Heaven: meta Bs 140.000)', r.sub.some(t=>/septiembre de 2026: meta Bs 140\.000 · vendió Bs [\d.]+ \(\d+%\)/.test(t)), r.sub);
  chk('2 · «Cómo les fue»: agosto sin meta, septiembre con meta y %, octubre en curso', /agosto/i.test(r.hist) && /sin meta/.test(r.hist) && /septiembre.*Bs 140\.000/i.test(r.hist) && /en curso/.test(r.hist), r.hist);
  if(CAP) fs.mkdirSync(CAP,{recursive:true});
  await page.evaluate(()=>{ document.getElementById('mt-in-heaven').value='12abc'; document.getElementById('mt-in-suena').value='40.000'; metasSuma(); return metasGuardar(); });
  await espera();
  r=await page.evaluate(()=>window.SAVES.length);
  chk('5 · «12abc» no se guarda', r===0, r);
  await page.evaluate(()=>{ document.getElementById('mt-in-heaven').value='150.000'; metasSuma(); });
  r=await page.evaluate(()=>document.getElementById('mt-suma').innerText);
  if(CAP){ await page.evaluate(()=>{ var t=document.getElementById('toast'); if(t) t.className='toast'; }); await page.screenshot({ path:path.join(CAP,'metas-ventana.png'), animations:'disabled' }); }
  chk('2 · el equipo suma mientras se escribe: Bs 190.000', /190\.000/.test(r), r);
  await page.evaluate(()=>metasGuardar());
  await espera(150);
  r=await page.evaluate(()=>{ var s=window.SAVES.filter(function(x){ return x.id==='__metas__'; }).pop(); var o=s ? JSON.parse(s.observaciones) : null;
    return { n:window.SAVES.length, oct:o && o.m['2026-10'], sep:o && o.m['2026-09'], rev:s && s.rev, modal:document.getElementById('modal').classList.contains('on') }; });
  chk('2 · guarda octubre (150.000 y 40.000) con el sello de la planilla, y septiembre (de otro aparato) queda', r.n===1 && r.oct && r.oct.heaven===150000 && r.oct.suena===40000 && r.sep && r.sep.heaven===140000 && r.rev===3 && !r.modal, r);
  const despues=await fotoPry(page);
  chk('1 · con metas, la proyección (lo vendido, cada marca, cada método) da EXACTAMENTE lo mismo', antes===despues, '');

  /* 3 · Cómo van */
  r=await page.evaluate(()=>{ var R=proyeccionMes('2026-10'), h=R.marcas.filter(function(m){ return m.g.k==='heaven'; })[0], d=metaMarcaDatos(R, h);
    var card=document.querySelector('#pry-metas .mt-card[data-marca="heaven"]');
    return { d:d, dr:R.dr, v:h.tot.vendido, p:h.tot.proy, txt:card ? card.innerText.replace(/\s+/g,' ') : '', bar:card ? card.querySelector('.mt-bv').style.width : '',
             met:document.getElementById('pry-metrics').innerText.replace(/\s+/g,' '), pie:[].map.call(document.querySelectorAll('#cx-pry .cx-kf-pie'), function(e){ return e.innerText; }) }; });
  chk('3 · Heaven: % vendido = vendido ÷ 150.000, en la caja y en la barra', r.d && r.d.pv===Math.round(r.v/150000*100) && new RegExp('\\b'+r.d.pv+'%').test(r.txt) && r.bar===Math.min(100,r.d.pv)+'%', { d:r.d, v:r.v, txt:r.txt });
  chk('3 · % proyectado y «📈 Proyección» con la misma cuenta de la proyección', r.d.pp===Math.round(r.p/150000*100) && /📈 Proyección Bs/.test(r.txt), r.d);
  const diasQ=r.dr+1;   // el martes es día hábil: cuenta hoy
  chk('3 · cuánto falta por día hábil: (meta − vendido) ÷ días hábiles que quedan contando hoy', Math.abs(r.d.porDia-(150000-r.v)/diasQ)<0.01 && new RegExp('en los '+diasQ+' que quedan contando hoy').test(r.txt), { porDia:r.d.porDia, diasQ:diasQ });
  chk('3 · dice si llega o no con la proyección', /(Si sigue así, llega|Cerca:|Así no llega:)/.test(r.txt), r.txt);
  chk('4 · la ficha «🎯 Meta del equipo» Bs 190.000 con el % y el proyectado', /Meta del equipo Bs 190\.000 va el \d+% · se proyecta el \d+%/i.test(r.met), r.met);
  chk('4 · el pie de la curva de Heaven: «🎯 Meta Bs 150.000 · va el N%»', r.pie.some(t=>/Meta Bs 150\.000 · va el \d+%/.test(t)), r.pie);
  if(CAP){ await page.evaluate(()=>{ var t=document.getElementById('toast'); if(t) t.className='toast'; var e=document.getElementById('pry-metrics'); window.scrollTo(0, e.getBoundingClientRect().top+window.scrollY-110); });
    await espera(200); await page.screenshot({ path:path.join(CAP,'metas-proyeccion.png'), animations:'disabled' }); }

  /* 5 · Copiar las de septiembre, sin señal */
  await page.evaluate(()=>{ metasAbrir('2026-11'); metasCopiarAnterior(); });
  r=await page.evaluate(()=>({ h:document.getElementById('mt-in-heaven').value, s:document.getElementById('mt-in-suena').value, mes:document.getElementById('mt-mes-n').innerText }));
  chk('5 · noviembre: «Copiar las de octubre» trae 150.000 y 40.000', /noviembre/i.test(r.mes) && r.h==='150.000' && r.s==='40.000', r);
  await page.evaluate(()=>{ window.SIN_RED=true; return metasGuardar(); });
  await espera(120);
  r=await page.evaluate(()=>({ n:window.SAVES.length, nov:!!metasLeer().m['2026-11'], ed:!!META_ED }));
  chk('5 · sin señal no se guarda y la ventana sigue con lo escrito', r.n===1 && !r.nov && r.ed, r);
  await page.evaluate(()=>{ window.SIN_RED=false; closeModal(); META_ED=null; });

  /* 6 · Un mes cerrado; la fila no es una venta */
  r=await page.evaluate(()=>{ document.getElementById('pry-mes').value='2026-09'; renderProyeccion();
    var R=proyeccionMes('2026-09'), h=R.marcas.filter(function(m){ return m.g.k==='heaven'; })[0];
    return { d:metaMarcaDatos(R, h), txt:document.getElementById('pry-metas').innerText.replace(/\s+/g,' '), sis:esFilaSistema(findById('__metas__')), conta:fueraDeConta(findById('__metas__')) }; });
  chk('6 · septiembre (cerrado): «🎉 Llegó a la meta» o «Cerró en el N%»', r.d && (r.d.est==='llego' ? /Llegó a la meta/.test(r.txt) : /Cerró en el \d+%/.test(r.txt)) && !/Si sigue así/.test(r.txt), { d:r.d, txt:r.txt.slice(0,300) });
  chk('6 · la fila de las metas es del sistema: no es una venta', r.sis && r.conta, r);
  await ctx.close();

  const C=await abrir(390, true);
  await C.page.evaluate(()=>{ var D=metasLeer(findById('__metas__')); D.m['2026-10']={ heaven:150000, suena:40000, t:2 }; findById('__metas__').observaciones=JSON.stringify(D); renderProyeccion(); });
  await espera();
  r=await C.page.evaluate(()=>{ var p=document.getElementById('cta-pane-proy'); return { sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth }; });
  chk('6 · en el celular (390 px) la caja de metas no ensancha la página', r.sw<=r.cw+1, r);
  await C.page.evaluate(()=>metasAbrir());
  await espera();
  r=await C.page.evaluate(()=>{ var b=document.getElementById('modal-box'); return { sw:b.scrollWidth, cw:b.clientWidth }; });
  chk('6 · y la ventana de metas tampoco (la tabla se desliza adentro)', r.sw<=r.cw+1, r);
  if(CAP) await C.page.screenshot({ path:path.join(CAP,'metas-cel.png'), animations:'disabled' });
  await C.ctx.close();

  chk('sin errores de la página', !errores.length, errores);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
