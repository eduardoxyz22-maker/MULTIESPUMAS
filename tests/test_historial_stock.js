/* 📚 EL HISTORIAL DEL STOCK DESDE LA PÁGINA (§4in, 09/10; dueño: *«armá la hoja de historial»*).
   El servidor `2026-10-09-a` guarda una fila por día en la hoja «Historial stock» (lo prueba `test_servidor` §23). Acá, la página:
     1. con un servidor anterior NO manda nada (contestaría «no id» y ensuciaría «Rechazos»);
     2. con el nuevo, después de leer, manda SOLO los Excel de HOY de cada almacén, sin los ceros;
     3. no repite lo mismo (huella en el teléfono), y vuelve a mandar si cambió o si el envío falló;
     4. «📜 Historial de cortes» dice cuántos días tiene la hoja y dibuja una barrita por día.
   Reloj clavado en el viernes 09/10/2026 a las 10:00 de Bolivia. Solo datos sintéticos.
   Se corre:  node tests/test_historial_stock.js        Dientes:  PEDIDOS=/ruta/a/pedidos_bf34dab.html node tests/test_historial_stock.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ if(typeof c==='function'){ try{ c=!!c(); }catch(err){ c=false; } } c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{ width:1180, height:820 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-09T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(300);
  const ev = async (fn,arg) => { try{ return await page.evaluate(fn,arg); }catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };

  await ev(()=>{
    CONNECTED=true; CARGA_GEN++; CARGA_ESTADO='ok'; if(window.CARGA_TIMER) clearTimeout(CARGA_TIMER); if(window.CARGA_TIC) clearInterval(CARGA_TIC);
    try{ localStorage.removeItem('me_hist_env'); }catch(e){}
    window._env=[]; window._falla=false;
    var apiPost0=apiPost;
    apiPost=function(b){
      if(b && b.action==='histStock'){ window._env.push(JSON.parse(JSON.stringify(b))); return Promise.resolve(window._falla ? { ok:false, error:'busy' } : { ok:true, version:'2026-10-09-a' }); }
      if(b && b.action==='histStockLeer') return Promise.resolve({ ok:true, version:'2026-10-09-a', dias:[
        { fecha:'2026-10-07', datos:{ PTF:{ f:'2026-10-07', u:{ 'A|140X190':10, 'B|160X190':5 } } } },
        { fecha:'2026-10-08', datos:{ 'IM - PRODUCTOTERMINADO':{ f:'2026-10-08', u:{ 'A|140X190':3 } } } },
        { fecha:'2026-10-09', datos:{ PTF:{ f:'2026-10-09', u:{ 'A|140X190':20 } } } } ] });
      return Promise.resolve({ ok:false, error:'no se espera en esta prueba' });
    };
    var LOG='PRODUCTOS TERMINADOS FAB.', IM='IM - PRODUCTOTERMINADO', BZ='01-05-025  Almacen Distribucion Banzer', hoy=todayStr();
    STOCK={ v:2, pv:3, c:{ f:hoy, hora:'08:30:00', u:{ 'TITANIO ICE|160X190':6, 'ORO BI RELAX|140X190':0 }, solo0:true, alm:LOG, cod:{} }, e:[], p:[], a:{}, g:{}, al:{}, h:[], det:[], sm:[] };
    STOCK.g[IM]={ f:hoy, hora:'08:00:00', u:{ 'MEMORY FLEX|160X190':8 }, solo0:true, cod:{}, rs:{} };
    STOCK.g[BZ]={ f:'2026-10-08', hora:'17:00:00', u:{ 'TITANIO ICE|160X190':2 }, solo0:true, cod:{}, rs:{} };   // el de Banzer es de AYER
    STOCK_CARGADO=true; STATE=[];
  });

  console.log('\n── 1. Con el servidor de antes no manda nada ──');
  let r = await ev(()=>{ SERVER_VER='2026-10-06-a'; var x=histStockAlDia(); return { x:x, n:window._env.length }; });
  chk('servidor 2026-10-06-a: no manda (contestaría «no id» y ensuciaría «Rechazos»)', ()=>(r.x===false && r.n===0), r);

  console.log('\n── 2. Con el nuevo manda los Excel de hoy ──');
  r = await ev(async()=>{ SERVER_VER='2026-10-09-a'; var x=histStockAlDia(); await new Promise(function(ok){ setTimeout(ok,30); }); return { x:x, env:window._env }; });
  chk('manda una vez, con la fecha de hoy', ()=>(r.x===true && r.env.length===1 && r.env[0].action==='histStock' && r.env[0].fecha==='2026-10-09'), r.env);
  chk('lleva PTF y Moreno (los de hoy) y NO Banzer (su Excel es de ayer)', ()=>{ var k=Object.keys(r.env[0].datos).sort().join(); return k==='IM - PRODUCTOTERMINADO,PTF'; }, Object.keys(((r.env||[])[0]||{}).datos||{}));
  chk('sin los ceros, con la hora del corte y «lo que no figura está en 0»', ()=>{ var p=r.env[0].datos.PTF; return p.u['TITANIO ICE|160X190']===6 && !('ORO BI RELAX|140X190' in p.u) && p.h==='08:30:00' && p.s0===true; }, ((r.env||[])[0]||{}).datos);

  console.log('\n── 3. No repite, y vuelve a mandar si cambió o si falló ──');
  r = await ev(async()=>{ var x=histStockAlDia(); await new Promise(function(ok){ setTimeout(ok,30); }); return { x:x, n:window._env.length }; });
  chk('lo mismo otra vez: no lo manda de nuevo', ()=>(r.x===false && r.n===1), r);
  r = await ev(async()=>{ STOCK.c.u['TITANIO ICE|160X190']=4; STOCK.c.hora='15:00:00'; window._falla=true; histStockAlDia(); await new Promise(function(ok){ setTimeout(ok,30); });
    var n1=window._env.length; window._falla=false; histStockAlDia(); await new Promise(function(ok){ setTimeout(ok,30); });
    var n2=window._env.length; histStockAlDia(); await new Promise(function(ok){ setTimeout(ok,30); });
    return { n1:n1, n2:n2, n3:window._env.length, u:(window._env.length?window._env[window._env.length-1].datos.PTF.u['TITANIO ICE|160X190']:null) }; });
  chk('un Excel nuevo de la tarde se manda; si el servidor falló, se reintenta con la lectura siguiente; y después no se repite', ()=>(r.n1===2 && r.n2===3 && r.n3===3 && r.u===4), r);
  r = await ev(async()=>{ STOCK_CARGADO=false; STOCK.c.u['TITANIO ICE|160X190']=1; var x=histStockAlDia(); STOCK_CARGADO=true; return { x:x, n:window._env.length }; });
  chk('sin haber leído el stock de la planilla, no manda (lo de la memoria puede ser viejo)', ()=>(r.x===false && r.n===3), r);
  r = await ev(()=>{ STOCK.c.f='2026-10-08'; STOCK.g['IM - PRODUCTOTERMINADO'].f='2026-10-08'; var x=histStockAlDia(); return { x:x, n:window._env.length }; });
  chk('sin ningún Excel de hoy, no manda', ()=>(r.x===false && r.n===3), r);

  console.log('\n── 4. «📜 Historial de cortes» lo muestra ──');
  r = await ev(async()=>{ abrirStockHistorial(); await new Promise(function(ok){ setTimeout(ok,60); });
    var el=document.getElementById('hist-libro'); var t=el?el.innerText.replace(/\s+/g,' '):''; var n=el?el.querySelectorAll('.hist-barras i').length:-1; closeModal(); return { t:t, n:n }; });
  chk('dice cuántos días tiene la hoja y desde cuándo, con una barrita por día', ()=>(/3 días guardados en la hoja, del 07\/10 al 09\/10/.test(r.t) && r.n===3), r);
  r = await ev(async()=>{ SERVER_VER='2026-10-06-a'; abrirStockHistorial(); await new Promise(function(ok){ setTimeout(ok,30); }); var t=(document.getElementById('hist-libro')||{}).innerText||''; closeModal(); return t; });
  chk('con el servidor de antes dice que se empieza a llenar cuando esté implementado el nuevo', ()=>/2026-10-09-a/.test(r) && /se empieza a llenar/.test(r), r);

  chk('ningún error de JavaScript', errores.length===0, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close(); process.exit(FAIL?1:0);
})();
