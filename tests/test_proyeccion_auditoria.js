/* 📈 TRES BORDES DE LA PROYECCIÓN DEL MES (25/10, auditoría Codex/Astra FIN-2/3/4, §4mk).

   LO QUE CUIDA:
   1. FIN-2 · Un mes cerrado en que la marca vendió 0 ES un mes: agosto 2.000 + septiembre 0 promedian 1.000 (antes 2.000, el cero se
      salteaba). Un mes SIN DATOS (ninguna venta del equipo en el panel) no entra y se dice cuál.
   2. FIN-3 · La prueba de un mes usa solo los meses cerrados ANTES de él: cambiar septiembre no cambia la prueba de agosto (antes la
      curva de agosto salía de septiembre).
   3. FIN-4 · El día del negocio es el de Bolivia aunque el aparato esté en UTC: el 31/10 a las 22:00 de Bolivia (01/11 02:00 UTC) la
      Proyección sigue en octubre «en curso», y Contabilidad, el Cuadre, los retiros y «Tu día» arrancan en octubre (antes, noviembre).

   Solo datos sintéticos. Se corre:  node tests/test_proyeccion_auditoria.js   (PEDIDOS=… para correrla contra otra versión) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

const PREPARAR = () => {
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; UNLOCKED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
  apiSave=function(x){ return Promise.resolve({ ok:true, pedido:x }); };
  var k=0;
  window.V=function(vend, fecha, reg, bs){ k++;
    return { id:'v'+k, oc:'10-'+(100+k), nota:String(900+k), vendedor:vend, cliente:'CLIENTE '+k, fecha:fecha, turno:'AM',
             productos:[{ desc:'COLCHON', medida:'140x190', cant:1 }], saldo:bs, acuenta:0, pagado:false, metodoPago:'', entregado:false,
             ts:new Date(reg+'T10:00:00-04:00').getTime(), fotos:[] }; };
  window.rep=function(out, n, vend, fecha, reg, bs){ for(var i=0;i<n;i++) out.push(V(vend, fecha, reg, bs)); return out; };
};

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];

  // ═══ 1-2. FIN-2 y FIN-3, con el aparato en Bolivia ═════════════════════════════════════════
  {
    const ctx = await browser.newContext({ viewport:{ width:1180, height:900 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await ctx.route(/^https:\/\//, r => r.abort());
    await page.clock.setFixedTime(new Date('2026-10-14T15:00:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate(PREPARAR);
    const r = await page.evaluate(() => {
      /* Heaven (Maria Flores): agosto 20 × 100 = 2.000; septiembre NADA. Sueña (Mauricio) vende los dos meses: el panel se usaba. */
      var S=[]; rep(S, 20, 'Maria Flores', '2026-08-20', '2026-08-10', 100);
      rep(S, 20, 'Mauricio Merida', '2026-08-12', '2026-08-05', 500); rep(S, 20, 'Mauricio Merida', '2026-09-12', '2026-09-05', 500);
      rep(S, 5, 'Maria Flores', '2026-10-20', '2026-10-06', 100);
      STATE=S;
      var Vs=pryVentas(), C=pryCurva(Vs, 'heaven', ['2026-08','2026-09']), C3=pryCurva(Vs, 'heaven', ['2026-07','2026-08','2026-09']);
      var R=proyeccionMes('2026-10');
      /* FIN-3: la prueba de agosto con septiembre como está, y con septiembre cambiado por completo */
      var H=['2026-08','2026-09'], hoy=todayStr();
      var pA=function(){ var P=pryPrueba(pryVentas(), '2026-08', H, hoy); return JSON.stringify({ m:P.cur.heaven.meses, f:P.filas.map(function(f){ return [f.d, Math.round(f.s.heaven.ritmo), f.s.heaven.curva]; }) }); };
      var antes=pA(), sepS=pryPrueba(pryVentas(), '2026-09', H, hoy).cur.suena.meses;
      STATE=S.concat(rep([], 30, 'Maria Flores', '2026-09-28', '2026-09-26', 9000));
      var despues=pA();
      return { meses:C.meses, prom:C.prom, sin:C3.sinDatos, meses3:C3.meses, met:R.metodos.heaven, antes:antes, despues:despues, sepS:sepS };
    });
    chk('1a. Heaven: agosto 2.000 y septiembre 0 (con el panel en uso) → los dos meses cuentan y el promedio es 1.000 (antes 2.000)',
        JSON.stringify(r.meses)==='["2026-08","2026-09"]' && Math.round(r.prom)===1000, r);
    chk('1b. un mes SIN ninguna venta del equipo (julio) no entra y queda anotado como «sin datos»',
        JSON.stringify(r.sin)==='["2026-07"]' && JSON.stringify(r.meses3)==='["2026-08","2026-09"]', [r.sin, r.meses3]);
    chk('1c. la proyección de octubre usa ese promedio (1.000)', r.met && r.met.m==='curva' && Math.round(r.met.prom)===1000, r.met);
    chk('2a. la prueba de agosto no usa septiembre: agosto es el primer mes, su curva no tiene meses (antes salía de septiembre)',
        JSON.parse(r.antes).m.length===0 && JSON.parse(r.antes).f.every(f=>f[2]===null), r.antes);
    chk('2b. …y cambiar septiembre no cambia en nada la prueba de agosto', r.antes===r.despues, [r.antes, r.despues]);
    chk('2c. la prueba de septiembre sí usa agosto (el anterior)', JSON.stringify(r.sepS)==='["2026-08"]', r.sepS);
    await ctx.close();
  }

  // ═══ 3. FIN-4: el aparato con la hora en UTC, el 31/10 a las 22:00 de Bolivia ════════════════
  {
    const ctx = await browser.newContext({ viewport:{ width:1180, height:900 }, timezoneId:'UTC' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await ctx.route(/^https:\/\//, r => r.abort());
    await page.clock.setFixedTime(new Date('2026-11-01T02:00:00Z'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate(PREPARAR);
    const r = await page.evaluate(async () => {
      var S=[]; rep(S, 20, 'Maria Flores', '2026-10-20', '2026-10-10', 100); STATE=S;
      ['cta-mes','cta-dia','cua-mes','cua-dia','pry-mes','ret-mes'].forEach(function(id){ var e=document.getElementById(id); if(e) e.value=''; });
      showView('conta'); await new Promise(function(res){ setTimeout(res, 200); });
      try{ refreshConta(); }catch(e){}
      var R=proyeccionMes((typeof diaNegocio==='function' ? diaNegocio() : todayStr()).slice(0,7));
      try{ abrirRetiros(); }catch(e){}
      var ret=(document.getElementById('ret-mes')||{}).value;
      try{ closeModal(); }catch(e){} try{ document.getElementById('retiros-overlay').style.display='none'; }catch(e){}
      var ef=null; try{ ef=misEfectivoDatos('Maria Flores'); }catch(e){}
      return { aparato:todayStr(), ctaMes:(document.getElementById('cta-mes')||{}).value, cuaMes:(document.getElementById('cua-mes')||{}).value,
               cuaDia:(document.getElementById('cua-dia')||{}).value, pryMes:(document.getElementById('pry-mes')||{}).value,
               cuadre:cuadrePeriodo(), R:{ ym:R.ym, estado:R.estado, hoy:R.hoy }, ret:ret, efMes:ef && ef.mes };
    });
    chk('3 (el aparato dice 01/11: el reloj de quien mira)', r.aparato==='2026-11-01', r.aparato);
    chk('3a. la Proyección: octubre sigue «en curso» con hoy = 31/10 (antes, octubre cerrado)', r.R.ym==='2026-10' && r.R.estado==='curso' && r.R.hoy==='2026-10-31', r.R);
    chk('3b. Contabilidad y el Cuadre arrancan en octubre (y el día, el 31/10)', r.ctaMes==='2026-10' && r.cuaMes==='2026-10' && r.cuaDia==='2026-10-31' && r.pryMes==='2026-10', r);
    chk('3c. el Cuadre del mes sin elegir nada es el de octubre', r.cuadre && r.cuadre.val==='2026-10', r.cuadre);
    chk('3d. los retiros y el efectivo de «Tu día», también octubre', r.ret==='2026-10' && r.efMes==='2026-10', [r.ret, r.efMes]);
    await ctx.close();
  }
  chk('sin errores en la página', !errores.length, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
