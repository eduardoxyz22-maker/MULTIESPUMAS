/* 📈 PROYECCIÓN DEL MES DE LA REVISIÓN EN TRES NIVELES (30/09, bitácora §4hd, RESPUESTA §22-§23): R3-1…R3-4 y A3-1.

   Historial INVENTADO (el repo es público), del 20/07 al 31/12/2026: 💚 Heaven con 6 ventas por día hábil de lunes a jueves,
   8 el viernes y 10 el sábado, cargadas entre las 09:10 y las 19:40; 🛏️ Sueña con 4 por día hábil. Nada en domingos ni en
   feriados (FERIADOS + FERIADOS_PASADOS de la página). Reloj clavado en cada caso. Sin la clave real de Administración: una
   inventada que se guarda como hash en este navegador.

   ⚠️ LO QUE CUIDA (las marcadas «diente» fallan contra lo publicado el 29/09, `2207922`):
   1. R3-1 (diente) — un domingo o un feriado no se vende: la proyección de las 08:00 y la de las 21:00 son IGUALES (antes la
      curva «a esta hora» subía o bajaba sola hasta 4 % sin que entrara ninguna venta).
   2. R3-2 (diente) — en un día hábil cuyo día equivalente de un mes cerrado cae en domingo o feriado, la curva corta en el
      último día HÁBIL a la misma hora (antes ese día hábil entraba ENTERO). En un día sin ese problema no cambia nada.
   3. R3-3 (diente) — «Qué días se vende más» no cuenta los feriados como días sin ventas (el jueves y el viernes salían más
      bajos), lo dice («los feriados no cuentan»), y con menos de 10 % de diferencia dice «parejo».
   4. A3-1 / R3-4 (diente) — unidades: «P/» es «PARA» (lo que sigue es el uso: «PATAS P/SOMIER» no es un somier), un servicio o
      un mueble en el medio corta el nombre («TITANIO LATEX ENTREGA INMEDIATA» sí es un colchón), y «FORRO DE COLCHON Y SOMIER»
      es un forro.

   Se corre:  node tests/test_rev30_proyeccion.js          (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/a/pedidos_2207922.html node tests/test_rev30_proyeccion.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ localStorage.removeItem(LS_PEND); }catch(e){}
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  try{ cargaBanner(); }catch(e){}
  loadFromServer=function(){};
  window.UNLOCK=function(){ localStorage.setItem(LS_ADMIN, sha256('clave-de-prueba')); document.getElementById('admin-pass').value='clave-de-prueba'; tryUnlock(); return UNLOCKED; };
  window.PRY=function(ym){ if(!document.getElementById('view-conta').classList.contains('active')) showView('conta'); segSet('cta-tab','proy'); setContaTab('proy'); document.getElementById('pry-mes').value=ym; renderProyeccion(); };
  /* Día hábil del historial: ni domingo ni feriado (los de la página, que en esta prueba no se tocan). */
  window.HABA=function(d){ return !!d && new Date(d+'T12:00:00').getDay()!==0 && !FERIADOS[d] && !FERIADOS_PASADOS[d]; };
  window.FIXA=function(hasta){
    var out=[], k=0, H=['09:10','10:25','11:40','12:15','13:05','14:30','15:20','16:45','18:05','19:40'];
    var sig=function(d,n){ var x=stockSumarDias(d,n); for(var i=0;i<10 && !HABA(x);i++) x=stockSumarDias(x,1); return x; };
    for(var d='2026-07-20'; d<=(hasta||'2026-12-31'); d=stockSumarDias(d,1)){
      if(!HABA(d)) continue;
      var w=new Date(d+'T12:00:00').getDay(), n = w===6 ? 10 : (w===5 ? 8 : 6);
      for(var i=0;i<n;i++){ k++;
        out.push({ id:'fa'+k, oc:'10-'+(5000+k), nota:String(9000+k), vendedor:(i%2===0) ? 'Maria Flores' : 'Carola Chavez', cliente:'CLIENTE F'+k,
                   fecha:sig(d, 2+(i%3)), turno:'AM', productos:[{desc:'COLCHON',medida:'140x190',cant:1}], saldo:2500+(k*37)%1501, acuenta:0,
                   pagado:false, metodoPago:'', entregado:false, ts:new Date(d+'T'+H[i]+':00-04:00').getTime(), fotos:[] });
      }
      ['10:00','12:30','15:00','17:30'].forEach(function(h){ k++;
        out.push({ id:'fa'+k, oc:'10-'+(5000+k), nota:String(9000+k), vendedor:'Mauricio Merida', cliente:'CLIENTE F'+k, fecha:sig(d,1), turno:'AM',
                   productos:[{desc:'COLCHON',medida:'140x190',cant:1}], saldo:5000, acuenta:0, pagado:false, metodoPago:'', entregado:false,
                   ts:new Date(d+'T'+h+':00-04:00').getTime(), fotos:[] });
      });
    }
    return out;
  };
  /* La curva «bien alineada»: en cada mes cerrado, el último día HÁBIL ≤ el día equivalente, cortado a la hora. */
  window.FBIEN=function(c, r, min){
    if(!c || !c.ok) return 0; var K=0;
    c.meses.forEach(function(m){ var d=pryAlDia(m, r); for(var i=0;i<10 && !HABA(d);i++) d=stockSumarDias(d,-1);
      c.por[m].forEach(function(x){ if(x.reg<d || (x.reg===d && x.m<=min)) K+=x.bs; }); });
    return K/c.T;
  };
  window.__FX=FIXA('2026-12-31');
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1180, height:900 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.setDefaultTimeout(120000);
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-11T08:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  await page.evaluate(PREPARAR);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,400) }; } };
  const reloj = (iso) => page.clock.setFixedTime(new Date(iso));

  // ═══ 1. R3-1: un domingo o un feriado, la proyección no se mueve con la hora ══════════════════════════════════════
  console.log('\n── 1. Un domingo o un feriado no se vende: la proyección de la mañana y la de la noche son iguales ──');
  const foto = () => ev(() => { var t=Date.now(); STATE=window.__FX.filter(function(p){ return p.ts<=t; });
    var R=proyeccionMes(todayStr().slice(0,7)); return { equipo:Math.round(R.equipo.proy), hm:R.metodos.heaven.m, hf:+(R.metodos.heaven.f||0).toFixed(6), hp:Math.round(R.metodos.heaven.proy||0) }; });
  const dias1 = {};
  for (const d of ['2026-10-11', '2026-11-02']) {
    await reloj(d+'T08:00:00-04:00'); const a = await foto();
    await reloj(d+'T21:00:00-04:00'); const b = await foto();
    dias1[d] = { a, b };
  }
  const D1 = dias1['2026-10-11'], D2 = dias1['2026-11-02'];
  chk('1. (diente) domingo 11/10: la curva de Heaven y el total del equipo dan lo MISMO a las 08:00 y a las 21:00',
      D1.a && D1.a.hm==='curva' && D1.a.hf===D1.b.hf && D1.a.hp===D1.b.hp && D1.a.equipo===D1.b.equipo, D1);
  chk('1. (diente) lunes 02/11 (Todos Santos): también', D2.a && D2.a.hf===D2.b.hf && D2.a.equipo===D2.b.equipo, D2);

  // ═══ 2. R3-2: en un día hábil, el día equivalente de un mes cerrado que cae en domingo o feriado ══════════════════
  console.log('\n── 2. Día hábil con un día equivalente no hábil: la curva corta en el último día hábil, a la misma hora ──');
  const curva = (iso) => reloj(iso).then(() => ev(() => {
    var t=Date.now(); STATE=window.__FX.filter(function(p){ return p.ts<=t; });
    var ym=todayStr().slice(0,7), R=proyeccionMes(ym), V=pryVentas(), c=pryCurva(V,'heaven',R.hist), min=pryMinBo(t);
    var eq={}; R.hist.forEach(function(H){ var a=pryAlDia(H, R.dr); eq[H]=a+(HABA(a)?'':'*'); });
    return { eq:eq, f:+pryCurvaF(c, R.dr, min).toFixed(6), bien:+FBIEN(c, R.dr, min).toFixed(6), pantalla:+(R.metodos.heaven.f||0).toFixed(6), m:R.metodos.heaven.m };
  }));
  const j08 = await curva('2026-10-08T09:30:00-04:00'), m13 = await curva('2026-10-13T09:30:00-04:00');
  chk('2. el jueves 08/10 el día equivalente de agosto (07/08, feriado puente) y el de septiembre (06/09, domingo) no son hábiles',
      j08 && j08.eq && /\*$/.test(j08.eq['2026-08']||'') && /\*$/.test(j08.eq['2026-09']||''), j08 && j08.eq);
  chk('2. (diente) …y la curva de las 09:30 corta en el último día hábil a esa hora (la de la pantalla también)',
      j08 && Math.abs(j08.f-j08.bien)<1e-6 && Math.abs(j08.pantalla-j08.bien)<1e-6, j08);
  chk('2. …un día sin ese problema (martes 13/10) sigue igual', m13 && Math.abs(m13.f-m13.bien)<1e-6, m13);

  // ═══ 3. R3-3: qué días se vende más, sin los feriados ═══════════════════════════════════════════════════════════
  console.log('\n── 3. «Qué días se vende más» no cuenta los feriados, y lo que es parejo se dice parejo ──');
  await reloj('2026-10-14T15:00:00-04:00');
  let r = await ev(() => {
    STATE=window.__FX.filter(function(p){ return p.ts<=Date.now(); });
    UNLOCK(); PRY('2026-10');
    var R=proyeccionMes('2026-10'), P=pryPatron(R.V,'2026-10','heaven',R.hist,R.hoy);
    var cnt=[0,0,0,0,0,0,0], bs=[0,0,0,0,0,0,0];
    R.V.forEach(function(x){ if(x.g==='heaven' && x.reg>='2026-08-01' && x.reg<='2026-09-30') bs[dowDe(x.reg)]+=x.bs; });
    for(var d='2026-08-01'; d<='2026-09-30'; d=stockSumarDias(d,1)) if(HABA(d)) cnt[dowDe(d)]++;
    var real=bs.map(function(b,i){ return cnt[i] ? Math.round(b/cnt[i]) : 0; });
    var e=document.querySelector('#pry-patron .pry-patron[data-g="heaven"] .pry-semtxt');
    var parejo=prySemanaHtml({ sem:[0,1000,1020,1040,990,1010,1050], semMeses:['2026-08','2026-09'] }, { col:'#0f766e' }).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
    var noParejo=prySemanaHtml({ sem:[0,1000,1020,1040,990,1010,1500], semMeses:['2026-08','2026-09'] }, { col:'#0f766e' }).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
    return { hist:R.hist, sem:P.sem.map(Math.round), real:real, txt:e ? e.innerText.replace(/\s+/g,' ').trim() : '', parejo:parejo, noParejo:noParejo };
  });
  chk('3. (diente) el promedio por día de la semana es el de los días TRABAJADOS (el 06/08, el 07/08 y el 25/09 no cuentan)',
      r && JSON.stringify(r.sem)===JSON.stringify(r.real), r && { pantalla:r.sem, trabajados:r.real });
  chk('3. (diente) …y el texto lo dice: «los feriados no cuentan»', r && /los feriados no cuentan/.test(r.txt) && /El que más: sábado/.test(r.txt), r && r.txt);
  chk('3. (diente) con menos de un 10 % entre el día que más y el que menos, dice «parejo» (y no elige un día)',
      r && /Es parejo/.test(r.parejo) && !/El que más/.test(r.parejo), r && r.parejo.slice(0,300));
  chk('3. …con más diferencia, sigue diciendo el que más y el que menos', r && /El que más: sábado/.test(r.noParejo) && !/parejo/.test(r.noParejo), r && r.noParejo.slice(0,300));

  // ═══ 4. A3-1 / R3-4: unidades ════════════════════════════════════════════════════════════════════════════════
  console.log('\n── 4. Unidades: «P/» es «PARA», un servicio o un mueble corta el nombre, y un forro es un forro ──');
  r = await ev(() => {
    var casos=[
      ['TITANIO LATEX ENTREGA INMEDIATA','colchon'], ['EUROPEDIC 140X190 ENTREGA EN TIENDA','colchon'], ['TITANIO LATEX PARA CAMAROTE','colchon'],
      ['SEMIPEDIC 1 PLAZA LITERA','colchon'], ['TITANIO LATEX REGALO 2 ALMOHADAS','colchon'], ['ORO BI RELAX CAMA 2 PLAZAS','colchon'],
      ['PILLOW PEDIC PARA CAMA DE 2 PLAZAS','colchon'], ['PROTECTOR P/ COLCHON 2 PLAZAS',''], ['PATAS P/SOMIER 2 PLAZAS',''], ['FUNDA P/ COLCHON',''],
      ['FORRO P/ SOMIER',''], ['SABANAS CON ELASTICO PARA COLCHON 2 PLAZAS',''], ['FORRO DE COLCHON Y SOMIER',''], ['PROTECTOR PARA COLCHON Y SOMIER',''],
      // lo que ya andaba y no se tiene que romper
      ['ENTREGA',''], ['RECARGO POR ENTREGA',''], ['COLCHON TITANIO + 2 ALMOHADAS','colchon'], ['COLCHON Y SOMIER TITANIO','combo'],
      ['ALMOHADA Y COLCHON TITANIO','colchon'], ['TITANIO LATEX','colchon'], ['PATAS PARA SOMIER','']
    ];
    var mal=casos.filter(function(c){ return pryTipoProd({ desc:c[0], medida:'140x190', cant:1 })!==c[1]; })
                 .map(function(c){ return c[0]+' → «'+pryTipoProd({ desc:c[0], medida:'140x190', cant:1 })+'» (esperado «'+c[1]+'»)'; });
    var venta={ productos:[{ desc:'TITANIO LATEX', medida:'140x190', cant:1 }, { desc:'PROTECTOR P/COLCHON', medida:'140x190', cant:1 }, { desc:'PATAS P/SOMIER', medida:'', cant:4 }] };
    return { mal:mal, n:casos.length, u:pryUnidadesDe(venta) };
  });
  chk('4. (diente) los 21 renglones escritos a mano dan lo que son (colchón, somier, combo o nada)', r && r.mal && r.mal.length===0, r && r.mal);
  chk('4. (diente) una venta de 1 TITANIO LATEX + PROTECTOR P/COLCHON + 4 PATAS P/SOMIER es 1 unidad (antes 6)', r && r.u && r.u.u===1 && r.u.c===1 && r.u.s===0, r && r.u);

  chk('ningún error de JavaScript', errores.length===0, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
