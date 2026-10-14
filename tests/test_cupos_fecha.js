/* 🔧 CUPOS DE UN DÍA DISTINTOS (14/10). El dueño: *«REDUCE LOS CUPOS DE MAÑANA 15: 4 MENOS EN LA MAÑANA Y 4 MENOS EN LA TARDE,
   tendremos un camión en mantenimiento, así que solo por mañana»*. Lo que cuida: el jueves 15/10 entran 8 AM y 9 PM (en vez de 12 y
   13), el resto de los días sigue igual (el sábado 15 AM), el cartel del formulario y el de Administración dicen el número de ESE
   día y por qué, y el formulario frena el 9° de la mañana.
   Se corre:  node tests/test_cupos_fecha.js   (desde la raíz) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,300)):''); };
(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{ width:1500, height:1000 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await page.clock.setFixedTime(new Date('2026-10-14T10:00:00-04:00'));
  await page.route(/^https?:/, r => r.abort());
  await page.goto('file://'+(process.env.PEDIDOS||path.resolve('pedidos.html')), { waitUntil:'load' });
  await page.waitForTimeout(400);
  let r = await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; CARGA_GEN++; CARGA_ESTADO='ok';
    if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
    apiSave=function(){ return Promise.resolve({ok:true}); };
    apiList=function(){ return Promise.resolve({ok:true, pedidos:JSON.parse(JSON.stringify(STATE))}); };
    return { am15:limTurno('2026-10-15','AM'), pm15:limTurno('2026-10-15','PM'), am16:limTurno('2026-10-16','AM'), pm16:limTurno('2026-10-16','PM'),
             sab:limTurno('2026-10-17','AM')+'/'+limTurno('2026-10-17','PM'), dom:limTurno('2026-10-18','AM'), hoy:limTurno('2026-10-14','AM') };
  });
  chk('el jueves 15/10: 8 en la mañana y 9 en la tarde (4 menos en cada turno)', r.am15===8 && r.pm15===9, r);
  chk('los otros días como siempre: 12 / 13, el sábado 15 AM sin PM, el domingo nada', r.am16===12 && r.pm16===13 && r.sab==='15/0' && r.dom===0 && r.hoy===12, r);
  r = await page.evaluate(() => {
    var P=function(i,t){ return { id:'x'+t+i, fecha:'2026-10-15', turno:t, oc:'10-'+t+i, cliente:'C '+i, vendedor:'Carola Chavez', celular:'70000000',
      productos:[{desc:'A',cant:1,precio:10}], entregado:false, estado:'', ts:i }; };
    STATE=[]; for(var i=0;i<7;i++) STATE.push(P(i,'AM')); for(var j=0;j<3;j++) STATE.push(P(j,'PM'));
    showView('form'); document.getElementById('f-fecha').value='2026-10-15'; segSet('f-turno','AM'); renderCupoForm();
    var a=document.getElementById('cupo-form').innerText;
    STATE.push(P(7,'AM')); renderCupoForm();
    var b=document.getElementById('cupo-form').innerText, cls=document.getElementById('cupo-form').className;
    return { a:a, b:b, cls:cls };
  });
  chk('el cartel del formulario: «AM: 1/8 · PM: 6/9 libres» y dice por qué', /AM: 1\/8/.test(r.a) && /PM: 6\/9/.test(r.a) && /menos cupos \(un camión en mantenimiento\)/.test(r.a), r.a);
  chk('con 8 en la mañana: «Turno AM lleno (8/8)» en rojo', /Turno AM lleno/.test(r.b) && /\(8\/8\)/.test(r.b) && /full/.test(r.cls), r.b);
  r = await page.evaluate(() => {
    document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block';
    showView('admin'); try{ segSet('adm-mode','dia'); }catch(e){}
    var d=document.getElementById('adm-dia'); if(d) d.value='2026-10-15';
    renderAdmin(); return (document.getElementById('cupo-admin')||{}).innerText||'';
  });
  chk('Administración: los cupos del 15 sobre 8 y 9, con el porqué', /AM: \d+\/8 /.test(r) && /PM: \d+\/9 /.test(r) && /un camión en mantenimiento/.test(r), r);
  r = await page.evaluate(() => {
    var t=document.getElementById('f-fecha'); showView('form'); t.value='2026-10-16'; renderCupoForm();
    return document.getElementById('cupo-form').innerText;
  });
  chk('otro día no dice nada de mantenimiento', /AM: 12\/12/.test(r) && !/mantenimiento/.test(r), r);
  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e => { console.error(e); process.exit(1); });
