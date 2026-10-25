/* 📒 LO QUE DIJO LA PROYECCIÓN CADA DÍA (25/10, §4mn; el dueño: «si guardar la proyección hazlo»).

   LO QUE CUIDA (con un servidor de mentira que guarda lo que le mandan; solo datos sintéticos):
   1. A las 17:30 de Bolivia cualquier aparato con la planilla al día guarda SOLO la foto del día en `__pry_hist__`: la hora, lo vendido y la
      proyección del equipo y de cada marca (con qué se proyectó), igual a lo que dice la pantalla de Proyección.
   2. No la vuelve a guardar ese día; antes de las 17:00 no guarda; sin señal no guarda ni queda trabado.
   3. Junta con lo que hay en la planilla: los días de otro aparato quedan, lo de hace más de 400 días se va, y de un día gana la foto más
      tarde (una de las 18:10 no la pisa una de las 17:30). Nunca pasa de `PRY_HIST_TOPE` letras.
   4. Al mirar Proyección con la contraseña se guarda la foto y aparece la tabla; con un mes cerrado, cada día dice cuánto se equivocó contra
      el cierre y abajo el promedio.
   5. La fila no aparece como un pedido (Administración, Contabilidad) y sin `PRY_HIST_PRUEBA` (Playwright) no escribe nada.

   Reloj CLAVADO (martes 27/10/2026). Se corre:  node tests/test_pry_hist.js   (PEDIDOS=… para correrla contra otra versión) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

/* Ventas de agosto, septiembre y octubre para Heaven y Sueña (curva con historia) + el servidor de mentira. */
const PREPARAR = () => {
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
  STATE=L.slice();
  window.SRV=JSON.parse(JSON.stringify(L)); window.SAVES=[]; window.SIN_RED=false;
  apiList=function(){ if(window.SIN_RED) return Promise.reject(new Error('sin red')); return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window.SRV)) }); };
  apiSave=function(x){ window.SAVES.push(JSON.parse(JSON.stringify(x)));
    var y=JSON.parse(JSON.stringify(x)); y.rev=(Number(y.rev)||0)+1;
    window.SRV=window.SRV.filter(function(p){ return String(p.id)!==String(x.id); }).concat([y]);
    return Promise.resolve({ ok:true, pedido:y }); };
  ULTIMO_REFRESCO=Date.now();
  PRY_HIST_ULT=0; PRY_HIST_ENV=0; PRY_HIST_RESPIRO=0;
};
const espera=()=>new Promise(r=>setTimeout(r,60));

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (hora, conFlag=true) => {
    const ctx = await browser.newContext({ viewport:{ width:1280, height:900 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await ctx.route(/^https:\/\//, r => r.abort());
    if(conFlag) await page.addInitScript(() => { window.PRY_HIST_PRUEBA=1; window.ADM_FICHAS_PRUEBA=1; });
    await page.clock.setFixedTime(new Date('2026-10-27T'+hora+':00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate(PREPARAR);
    return { ctx, page };
  };

  /* 1-3 · la foto de la tarde, sola */
  { const { ctx, page } = await abrir('17:30');
    const r = await page.evaluate(async (ESPERA) => {
      var w=function(){ return new Promise(function(res){ setTimeout(res, 60); }); }, o={};
      pryHistAuto(); await w(); await w();
      var f=SRV.filter(function(p){ return p.id==='__pry_hist__'; })[0], d=f ? JSON.parse(f.observaciones).d : {};
      var R=proyeccionMes('2026-10'), H=R.marcas.filter(function(m){ return m.g.k==='heaven'; })[0], S=R.marcas.filter(function(m){ return m.g.k==='suena'; })[0];
      o.uno={ saves:SAVES.length, dias:Object.keys(d), e:d['2026-10-27'], esp:{ p:Math.round(R.equipo.proy), v:Math.round(R.equipo.vendido), hp:Math.round(H.tot.proy), sp:Math.round(S.tot.proy),
              hm:R.metodos.heaven.m, sm:R.metodos.suena.m, dt:R.dt, dr:R.dr } };
      /* 2 · otra vez el mismo día (pasada la media hora): no escribe */
      PRY_HIST_ULT=Date.now()-3600000; pryHistAuto(); await w(); await w();
      o.dos={ saves:SAVES.length };
      /* 2 · sin señal: no escribe y no queda trabado */
      STATE=STATE.filter(function(p){ return p.id!=='__pry_hist__'; }); PRY_HIST_ULT=0; SIN_RED=true; pryHistAuto(); await w(); await w();
      o.sinRed={ saves:SAVES.length, env:PRY_HIST_ENV };
      SIN_RED=false;
      /* 3 · junta: otro aparato ya guardó el 26/10 y una foto de HOY a las 18:10; hay un día de hace más de 400 días */
      var otro={ v:1, d:{ '2025-08-01':{ h:'17:00', p:1 }, '2026-10-26':{ h:'17:20', dt:22, dr:5, v:111, p:222, b:{} }, '2026-10-27':{ h:'18:10', dt:23, dr:4, v:333, p:444, b:{} } } };
      SRV=SRV.filter(function(p){ return p.id!=='__pry_hist__'; }).concat([Object.assign(filaSistema('__pry_hist__','x',JSON.stringify(otro)), { rev:5 })]);
      PRY_HIST_ULT=0; await pryHistGuardar(proyeccionMes('2026-10'));
      var f3=SRV.filter(function(p){ return p.id==='__pry_hist__'; })[0], d3=JSON.parse(f3.observaciones).d;
      o.tres={ dias:Object.keys(d3).sort(), hoy:d3['2026-10-27'], ayer:d3['2026-10-26'], rev:SAVES[SAVES.length-1].rev };
      /* 3 · y si la de la planilla es más TEMPRANA, gana la de ahora */
      otro.d['2026-10-27'].h='09:15';
      SRV=SRV.filter(function(p){ return p.id!=='__pry_hist__'; }).concat([Object.assign(filaSistema('__pry_hist__','x',JSON.stringify(otro)), { rev:6 })]);
      await pryHistGuardar(proyeccionMes('2026-10'));
      var d4=JSON.parse(SRV.filter(function(p){ return p.id==='__pry_hist__'; })[0].observaciones).d;
      o.cuatro=d4['2026-10-27'].h;
      /* 3 · el tope de letras: 400 días llenos */
      var mucho={}; for(var i=1;i<=420;i++){ var k=stockSumarDias('2026-10-26', -i); mucho[k]={ h:'17:05', dt:20, dr:6, v:1234567, p:2345678, b:{ heaven:[1234567,2345678,'c'], suena:[234567,345678,'r'] }, mp:12345, ru:45 }; }
      var J=pryHistJuntar(mucho, '2026-10-27', { h:'17:30', p:1, v:1, b:{} });
      o.tope={ len:JSON.stringify({ v:1, d:J }).length, n:Object.keys(J).length, hoy:!!J['2026-10-27'], viejo:Object.keys(J).sort()[0] };
      return o;
    });
    const u=r.uno, e=u.e||{};
    chk('1. a las 17:30 guarda sola la foto de hoy en __pry_hist__ (un guardado, solo el día de hoy)', u.saves===1 && u.dias.join()==='2026-10-27', u);
    chk('1b. …con la hora y lo mismo que dice Proyección: lo vendido, la proyección del equipo, los días hábiles', e.h==='17:30' && e.p===u.esp.p && e.v===u.esp.v && e.dt===u.esp.dt && e.dr===u.esp.dr && e.p>0, [e.h, e.p, e.v, e.dt, e.dr, u.esp]);
    chk('1c. …y cada marca con su proyección y con qué se proyectó (la curva / el ritmo)', e.b && e.b.heaven && e.b.heaven[1]===u.esp.hp && e.b.suena[1]===u.esp.sp &&
        e.b.heaven[2]===(u.esp.hm==='curva'?'c':'r') && e.b.suena[2]===(u.esp.sm==='curva'?'c':'r'), [e.b, u.esp]);
    chk('2. ya hay una foto de la tarde de hoy: no la vuelve a guardar', r.dos.saves===1, r.dos);
    chk('2b. sin señal: no guarda y no queda trabado', r.sinRed.saves===1 && r.sinRed.env===0, r.sinRed);
    chk('3. junta: queda el 26/10 de otro aparato, se va el de hace más de 400 días', r.tres.dias.join()==='2026-10-26,2026-10-27' && r.tres.ayer.p===222, r.tres);
    chk('3b. …de hoy gana la foto más tarde (la de las 18:10 no la pisa una de las 17:30), con el sello de la planilla', r.tres.hoy.h==='18:10' && r.tres.hoy.p===444 && r.tres.rev===5, r.tres);
    chk('3c. …y si la de la planilla es más temprana (09:15), gana la de ahora', r.cuatro==='17:30', r.cuatro);
    chk('3d. nunca pasa del tope de letras (Google corta la celda en 50.000) y conserva hoy', r.tope.len<=40000 && r.tope.hoy && r.tope.n>100, r.tope);
    await ctx.close(); }

  /* 2 · antes de las 17:00 no guarda sola */
  { const { ctx, page } = await abrir('16:40');
    const r = await page.evaluate(async () => { pryHistAuto(); await new Promise(function(res){ setTimeout(res, 150); }); return SAVES.length; });
    chk('2c. a las 16:40 no guarda sola', r===0, r);
    await ctx.close(); }

  /* 4 · al mirar Proyección, y el mes cerrado */
  { const { ctx, page } = await abrir('11:00');
    const r = await page.evaluate(async () => {
      var w=function(ms){ return new Promise(function(res){ setTimeout(res, ms||80); }); }, o={};
      showView('conta'); await w(150);
      segSet('cta-tab','proy'); setContaTab('proy'); await w(150);
      var f=SRV.filter(function(p){ return p.id==='__pry_hist__'; })[0];
      o.vista={ saves:SAVES.length, h:f && JSON.parse(f.observaciones).d['2026-10-27'] && JSON.parse(f.observaciones).d['2026-10-27'].h,
                tabla:((document.getElementById('pry-hist')||{}).innerText||'').replace(/\s+/g,' ') };
      /* un render más enseguida: no vuelve a guardar (media hora) */
      renderProyeccion(); await w(150); o.vista.saves2=SAVES.length;
      /* septiembre cerrado, con tres fotos guardadas */
      var R9=proyeccionMes('2026-09'), real=Math.round(R9.equipo.vendido), H9=R9.marcas.filter(function(m){ return m.g.k==='heaven'; })[0];
      var hr=Math.round(H9.tot.vendido);
      var d=JSON.parse(SRV.filter(function(p){ return p.id==='__pry_hist__'; })[0].observaciones).d;
      d['2026-09-10']={ h:'17:10', dt:8, dr:16, v:50000, p:Math.round(real*1.2), b:{ heaven:[30000, Math.round(hr*0.92), 'c'] } };
      d['2026-09-21']={ h:'17:40', dt:17, dr:7, v:90000, p:Math.round(real*1.06), b:{ heaven:[60000, Math.round(hr*1.3), 'r'] } };
      var fila=Object.assign(filaSistema('__pry_hist__','x',JSON.stringify({ v:1, d:d })), { rev:9 });
      STATE=STATE.filter(function(p){ return p.id!=='__pry_hist__'; }).concat([fila]);
      document.getElementById('pry-mes').value='2026-09'; renderProyeccion(); await w(150);
      var t=document.getElementById('pry-hist-t');
      o.cerrado={ txt:((document.getElementById('pry-hist')||{}).innerText||'').replace(/\s+/g,' '), filas:t ? t.tBodies[0].rows.length : 0,
                  errs:t ? [].slice.call(t.tBodies[0].rows).map(function(tr){ return [].slice.call(tr.cells).map(function(td){ var s=td.querySelector('small.pry-ok,small.pry-reg,small.pry-mal'); return s ? s.className+':'+s.textContent : ''; }); }) : [],
                  foot:t && t.tFoot ? t.tFoot.innerText.replace(/\s+/g,' ') : '', real:real, saves:SAVES.length };
      /* 5 · la fila no es un pedido */
      /* …ni el anuncio (en la planilla real desde el 23/10 salía en Ventas como una venta de Bs 0) */
      var anu=Object.assign(filaSistema(ANUNCIO_ID,'📢 ANUNCIO',JSON.stringify({ v:1, t:'No hay ICE', ts:Date.now() })), { ts:new Date('2026-10-23T09:00:00-04:00').getTime() });
      var n0=proyeccionMes('2026-10').equipo.n; STATE.push(anu); segSet('cta-mode','mes'); document.getElementById('cta-mes').value='2026-10';
      o.sis={ es:esFilaSistema(fila), conta:contaLista().some(function(p){ return p.id==='__pry_hist__' || p.id===ANUNCIO_ID; }), pryN:[n0, proyeccionMes('2026-10').equipo.n], fuera:fueraDeConta(anu,'tienda') };
      showView('admin'); await w(200); try{ renderAdmin(); }catch(e){}
      o.sis.adm=(document.getElementById('view-admin')||{}).innerText.indexOf('LO QUE DIJO LA PROYECCI')>=0;
      return o;
    });
    chk('4. al mirar Proyección con la contraseña guarda la foto de hoy (11:00)', r.vista.saves===1 && r.vista.h==='11:00', r.vista);
    chk('4b. …y la tabla «📒 Lo que dijo la proyección cada día» la muestra', /Lo que dijo la proyección cada día/i.test(r.vista.tabla) && /mar 27\/10/i.test(r.vista.tabla) && /a las 11:00/.test(r.vista.tabla), r.vista.tabla.slice(0,300));
    chk('4c. otro dibujo enseguida no vuelve a guardar (como mucho cada media hora)', r.vista.saves2===1, r.vista);
    chk('4d. septiembre cerrado: un renglón por foto guardada, con «la curva»/«el ritmo»', r.cerrado.filas===2 && /la curva/.test(r.cerrado.txt) && /el ritmo/.test(r.cerrado.txt), r.cerrado.txt.slice(0,400));
    chk('4e. …cada día dice cuánto se equivocó contra el cierre (+20 % ámbar, +6 % verde; Heaven −8 % verde, +30 % rojo)',
        r.cerrado.errs[0][2]==='pry-reg:+20%' && r.cerrado.errs[1][2]==='pry-ok:+6%' && r.cerrado.errs[0][3]==='pry-ok:−8%' && r.cerrado.errs[1][3]==='pry-mal:+30%', r.cerrado.errs);
    chk('4f. …y abajo «Cerró en» con el cierre real y el promedio (13 % el equipo, 19 % Heaven)', /Cerró en/.test(r.cerrado.foot) && r.cerrado.foot.indexOf(r.cerrado.real.toLocaleString('es-BO'))>=0 &&
        /promedio 13% 19%/.test(r.cerrado.foot), [r.cerrado.foot, r.cerrado.real]);
    chk('4g. mirar un mes cerrado no guarda nada', r.cerrado.saves===1, r.cerrado.saves);
    chk('5. la fila es del sistema: no es un pedido en Contabilidad ni en Administración', r.sis.es && !r.sis.conta && !r.sis.adm, r.sis);
    chk('5c. el anuncio tampoco es una venta (antes: Bs 0 en Ventas y «1 sin monto» en Proyección)', r.sis.fuera && r.sis.pryN[0]===r.sis.pryN[1], r.sis);
    await ctx.close(); }

  /* 5 · en Playwright sin PRY_HIST_PRUEBA no escribe (ni sola ni al mirar Proyección) */
  { const { ctx, page } = await abrir('17:30', false);
    const r = await page.evaluate(async () => {
      pryHistAuto(); showView('conta'); await new Promise(function(res){ setTimeout(res, 150); });
      segSet('cta-tab','proy'); setContaTab('proy'); await new Promise(function(res){ setTimeout(res, 200); });
      return { saves:SAVES.length, tabla:!!document.getElementById('pry-hist-box') };
    });
    chk('5b. en las pruebas (Playwright) sin PRY_HIST_PRUEBA no escribe, y la caja se ve igual', r.saves===0 && r.tabla, r);
    await ctx.close(); }

  chk('sin errores en la página', !errores.length, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
