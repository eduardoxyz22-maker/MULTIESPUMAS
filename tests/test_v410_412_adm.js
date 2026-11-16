/* 🎨 (16/11/2026, mejoras 410, 411 y 412; el dueño las eligió) Administración:
   410 · el calendario de entregas dice los cupos de la mañana y la tarde (🌅 12/12 · 🌆 10/13: verde, ámbar con 3 o menos, rojo lleno, «+1 de
         más»), fondo blanco, lo que pasó en gris; domingos y feriados como siempre.
   411 · «Para hacer»: lo que sigue, en pastillas de color con su número (tocar = el botón de ese aviso), «▾ Ver todos».
   412 · «Semana»: el aviso rojo en un renglón («el primero: …», la regla en el «i») y lo que puede no llegar en otro.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin las banderas (`CAL_CUPOS_PRUEBA`, `HACER_PILLS_PRUEBA`, `SEM_RENGLON_PRUEBA`): todo como siempre.
   2. Con cada bandera: los mismos números (C.D[f].AM/PM y limTurno; admHacerDatos; semanaDatos) y los mismos botones.
   Datos SINTÉTICOS. Reloj clavado el jueves 22/10/2026 09:10. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_v410_412_adm.js */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_u2_turno.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));
(async()=>{
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('dialog', d=>d.accept());
  await page.clock.setFixedTime(new Date('2026-10-22T09:10:00-04:00'));   // jueves
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');
  await page.evaluate(async()=>{
    UNLOCKED=true; window.ADM_TABS_PRUEBA=1;
    var ps=[], T='CH1201|TITANIO ICE|160x190', n=0;
    var pon=function(f, tu, k, ex){ for(var i=0;i<k;i++){ n++; ps.push(_ped('c'+n, f, tu, [_lin(T,1,{ chk:'ok' })], Object.assign({ ts:_ts('2026-10-01','09:00:00') }, ex||{}))); } };
    pon('2026-10-22','AM',12); pon('2026-10-22','PM',10);   // hoy: mañana llena, tarde con 3 lugares
    pon('2026-10-23','AM',13);                               // mañana viernes: uno de más (forzado)
    pon('2026-10-20','AM',4);                                // un día que pasó
    ps.push(_ped('s1','2026-10-26','AM',[_lin(T,1,{})],{ ts:_ts('2026-10-01','10:00:00') }));                          // sin revisar (lunes)
    ps.push(_ped('s2','2026-10-27','AM',[_lin(T,2,{})],{ ts:_ts('2026-10-01','10:00:00') }));                          // sin revisar (martes)
    ps.push(_ped('t1','2026-10-23','PM',[_lin(T,1,{ chk:'prod', enProd:true, prodEn:'Moreno', prodF:'2026-10-22' })],{ ts:_ts('2026-10-01','11:00:00') }));   // puede no llegar
    await _cargar(ps, _stock(function(s){ s.c.u[_K]=80; }));
    document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block';
    showView('admin'); ADM_CAL_MES='2026-10';
  });

  console.log('\n── 410 · el calendario ──');
  const cal=()=>page.evaluate(()=>{ var d=document.createElement('div'); d.innerHTML=admCalHtml();
    var dia=function(f){ var b=d.querySelector('.cal-dia[data-f="'+f+'"]'); return b ? { cls:b.className, st:b.getAttribute('style')||'', txt:b.textContent.replace(/\s+/g,' ').trim(),
      t:[].map.call(b.querySelectorAll('.calc-t'), function(x){ return x.className+':'+x.textContent.replace(/\s+/g,' ').trim(); }) } : null; };
    return { hoy:dia('2026-10-22'), vie:dia('2026-10-23'), pas:dia('2026-10-20'), dom:dia('2026-10-25'), ley:!!d.querySelector('.calc-ley'), sub:d.querySelector('.cal-cab .vis-sub').textContent }; });
  let r=await cal();
  chk('410a sin la bandera: «22 pedidos» y el fondo que se oscurece', /22 pedidos/.test(r.hoy.txt) && /background/.test(r.hoy.st) && !r.hoy.t.length && !r.ley, r.hoy);
  await page.evaluate(()=>{ window.CAL_CUPOS_PRUEBA=1; });
  r=await cal();
  chk('410b hoy: 🌅 12/12 en rojo (lleno) y 🌆 10/13 en ámbar (3 lugares); fondo blanco (sin el oscurecido)', r.hoy.t.join('|')==='calc-t lleno:🌅12/12|calc-t poco:🌆10/13' && !/background/.test(r.hoy.st) && /22 ped\./.test(r.hoy.txt) && /hoy/.test(r.hoy.cls), r.hoy);
  chk('410c el viernes forzado: «🌅 +1 de más» en rojo', /calc-t lleno:🌅\+1 de más/.test(r.vie.t[0]||''), r.vie);
  chk('410d el día que pasó, en gris (calc-pas); el domingo como siempre («sin camión»)', /calc-pas/.test(r.pas.cls) && /cerrado/.test(r.dom.cls) && /sin camión/.test(r.dom.txt) && !r.dom.t.length, [r.pas.cls, r.dom]);
  chk('410e la leyenda y el texto de arriba', r.ley && /mañana 🌅 y a la tarde 🌆/.test(r.sub), r.sub);
  const det=await page.evaluate(()=>{ admCalVer('2026-10-22'); var d=document.createElement('div'); d.innerHTML=admCalHtml(); var t=d.querySelector('.cal-det').textContent; ADM_CAL_DIA=''; return t; });
  chk('410f los mismos números que el detalle del día (AM 12/12 · PM 10/13)', /AM 12\/12/.test(det) && /PM 10\/13/.test(det), det);

  console.log('\n── 411 · «Para hacer» en pastillas ──');
  await page.evaluate(()=>{
    window.__fn=[];
    admHacerDatos=function(){ var a=function(k, sev, n, tag){ return { k:k, sev:sev, ic:'📌', n:n, t:'Aviso '+k, s:'detalle '+k, b:'Ir', fn:"window.__fn.push('"+k+"')", tag:tag }; };
      return [a('a1','r',3,'uno'), a('a2','r',2,'dos'), a('a3','a',1,'tres'), a('a4','r',2,'ubicaciones'), a('a5','a',7,'sin camión'), a('a6','i',4,'ir a buscar hoy')]; };
    ADM_HACER_MAS=false; });
  const hacer=()=>page.evaluate(()=>{ var el=document.getElementById('adm-hacer'); el._h=''; admHacerPintar();
    return { mas:el.querySelector('.ah-mas') ? el.querySelector('.ah-mas').textContent : '', filas:el.querySelectorAll('.ah-it').length,
      pills:[].map.call(el.querySelectorAll('.ahp'), function(b){ return b.className+':'+b.textContent; }), ya:(el.querySelector('.ahp-w > b')||{}).textContent||'' }; });
  r=await hacer();
  chk('411a sin la bandera: «▾ Ver 3 más: ubicaciones (2) · …» en una frase', /Ver 3 más: ubicaciones \(2\) · sin camión \(7\) · ir a buscar hoy \(4\)/.test(r.mas) && !r.pills.length, r);
  await page.evaluate(()=>{ window.HACER_PILLS_PRUEBA=1; });
  r=await hacer();
  chk('411b con la bandera: «Y además:» y una pastilla por aviso, con su número y el color de su gravedad', r.ya==='Y además:' && r.pills.join('|')==='ahp ahp-r:2ubicaciones|ahp ahp-a:7sin camión|ahp ahp-i:4ir a buscar hoy' && r.filas===3 && !r.mas, r);
  let t=await page.evaluate(()=>{ document.querySelector('#adm-hacer .ahp-a').click(); var a=window.__fn.slice(); document.querySelector('#adm-hacer .ahp-todos').click();
    var el=document.getElementById('adm-hacer'); return { fn:a, filas:el.querySelectorAll('.ah-it').length, menos:(el.querySelector('.ah-mas')||{}).textContent||'' }; });
  chk('411c tocar una pastilla hace lo de ESE aviso', t.fn.join()==='a5', t);
  chk('411d «▾ Ver todos» abre la lista entera (con «▴ Ver menos» de siempre)', t.filas===6 && /Ver menos/.test(t.menos), t);

  console.log('\n── 412 · «Semana» en un renglón ──');
  const sem=()=>page.evaluate(()=>{ QUICK_FILTER='semana'; semanaArrancar(); var el=document.getElementById('adm-semana'); el._h=''; semanaPintar();
    var a=el.querySelector('.sem-alerta'), t=el.querySelector('.sem-tarde'), T=function(e){ return e ? e.textContent.replace(/\s+/g,' ').trim() : ''; };
    return { a:T(a), r1:!!(a && a.classList.contains('sem-r1')), lista:!!(a && a.querySelector('.sem-al-l')), tit:a && a.querySelector('b') ? (a.querySelector('b').getAttribute('title')||'') : '',
      btns:a ? [].map.call(a.querySelectorAll('.sem-al-b button'), T) : [], tarde:T(t), tr1:!!(t && t.classList.contains('sem-r1')), exVis:a && a.querySelector('.sem-r1-ex') ? getComputedStyle(a.querySelector('.sem-r1-ex')).display : '' }; });
  r=await sem();
  chk('412a sin la bandera: el recuadro de siempre con la lista de productos y la regla', !r.r1 && r.lista && /Revisalos ahora/.test(r.a) && /pueden? no llegar a tiempo/.test(r.tarde), r);
  await page.evaluate(()=>{ window.SEM_RENGLON_PRUEBA=1; });
  r=await sem();
  chk('412b con la bandera: un renglón «🔴 … sin revisar el stock · el primero: lunes 26/10 · 1 sin revisar», sin la lista', r.r1 && !r.lista && /🔴 .*sin revisar el stock/.test(r.a) && /el primero: lunes 26\/10 · 1 sin revisar/.test(r.a), r.a);
  chk('412c la lista entera queda al pasar el mouse por el título', /COLCHON|TITANIO/i.test(r.tit), r.tit);
  chk('412d los mismos botones: «Ver solo esos» y «🤖 Revisión automática»', r.btns.join('|')==='Ver solo esos|🤖 Revisión automática', r.btns);
  chk('412e la regla escondida hasta tocar el «i»', r.exVis==='none', r.exVis);
  t=await page.evaluate(()=>{ document.querySelector('#adm-semana .sem-alerta .sem-i').click(); return getComputedStyle(document.querySelector('#adm-semana .sem-alerta .sem-r1-ex')).display; });
  chk('412f tocar el «i» la muestra', t==='block', t);
  chk('412g lo que puede no llegar, en otro renglón con «Ver cuáles»', r.tr1 && /1 pedido a producción puede no llegar a tiempo/.test(r.tarde) && /Ver cuáles/.test(r.tarde), r.tarde);

  chk('sin errores en la página', errs.length===0, errs);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
