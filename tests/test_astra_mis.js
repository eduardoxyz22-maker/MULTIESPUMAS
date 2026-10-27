/* 🔎 AUDITORÍA DE ASTRA DEL 27/10 — MIS PEDIDOS (§4nl, grupo «mis»: A06, A07, A08).
   Lo que cuida esta prueba:
   A07. «Tu mes» de «Tu día» (`misMesLineaHtml`) compara contra el mes pasado con el MISMO corte que el MoM de Proyección
        (`pryMomDe`/`pryCargadaAl`): mismo día Y misma hora de Bolivia. Antes cortaba en el día entero: a las 15:00 contaba una venta
        del mes pasado cargada ese día a las 19:00, y Proyección decía «▲ 100%» y Tu día «▼ 33%» con los mismos pedidos.
   A08. El mes de la plata de Mis pedidos (Tu día, la dona, la ficha «Por cobrar» y «Saldo por cobrar de este mes») es el de Bolivia
        (`diaNegocio`), no el reloj del aparato: con un aparato en UTC a las 02:00 del 01/11 (22:00 del 31/10 en Bolivia) decía
        «Vendido para noviembre» al lado del efectivo de octubre.
   A06. DECISIÓN DEL DUEÑO (26/09, §4gi: «las ventas de tienda no entran»): los números siguen sin la venta de tienda; solo se DICE
        (la dona lo nombra y «Vendido para…» lo explica al pasar el ratón).
   Datos inventados. Se corre:  node tests/test_astra_mis.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  loadFromServer=function(){};
  window.FERIADOS_PASADOS={};
  var n=0;
  /* Una venta: `bs` su total (como saldo), `fecha` la entrega agendada, `reg` cuándo se cargó (día y hora de Bolivia). */
  window.V=function(vend, fecha, bs, reg, o){
    o=o||{}; n++;
    var t=new Date(reg+(reg.length===10?'T10:00:00':'')+'-04:00').getTime();
    return Object.assign({ id:'p'+n, oc:'10-'+(100+n), nota:String(500+n), vendedor:vend, cliente:'CLIENTE '+n, fecha:fecha, turno:'AM',
      productos:[{desc:'COLCHON SOFT',medida:'140x190',cant:1}], saldo:bs, acuenta:0, pagado:false, metodoPago:'', entregado:false,
      ts:t, rev:t, fotos:[] }, o);
  };
  /* Mirian: septiembre 500 (cargada el 10/09) + 1.000 (cargada el 23/09 a las 19:00); octubre 1.000 (cargada el 23/10 a las 09:00). */
  window.FIX_A07=function(){ n=0; return [
    V('Mirian Salazar','2026-09-25',500,'2026-09-10'), V('Mirian Salazar','2026-09-28',1000,'2026-09-23T19:00:00'),
    V('Mirian Salazar','2026-10-27',1000,'2026-10-23T09:00:00') ]; };
  window._mis=async function(v){ showView('mis'); var s=document.getElementById('mis-vendedor'); s.value=v; renderMis(); await new Promise(function(r){ setTimeout(r,200); }); };
  window._txt=function(sel){ var e=document.querySelector(sel); return e ? e.textContent.replace(/\s+/g,' ').trim() : ''; };
  /* El % del MoM de la fila de Proyección para un vendedor (lo que dice «▲ N% vs sep.»). */
  window._pryMom=function(nom){
    UNLOCKED=true; showView('conta'); segSet('cta-tab','proy'); setContaTab('proy');
    document.getElementById('pry-mes').value=diaNegocio().slice(0,7); renderProyeccion();
    var f=[].slice.call(document.querySelectorAll('#pry-vendedores .pry-fila')).find(function(x){ return x.innerText.indexOf(nom)>=0; });
    return f ? ((f.querySelector('.pry-mom small')||{}).textContent||'') : '';
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  async function abrir(hoy, tz){
    const ctx = await browser.newContext({ viewport:{ width:1440, height:900 }, timezoneId:tz||'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r=>r.abort());
    await ctx.addInitScript(()=>{ window.MIS_TOP_PRUEBA=1; });
    const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.dismiss());
    await page.clock.setFixedTime(new Date(hoy));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(350);
    await page.evaluate(PREPARAR);
    page._ctx=ctx; return page;
  }

  // ═══ A07 · el mismo corte que Proyección ═══
  console.log('\n── A07. «Tu mes» corta el mes pasado igual que el MoM de Proyección (mismo día y hora) ──');
  for (const [hora, esp] of [['15:00','▲ 100%'], ['20:00','▼ 33%']]) {
    const page = await abrir('2026-10-23T'+hora+':00-04:00');
    const r = await page.evaluate(async () => {
      STATE=FIX_A07(); var pry=_pryMom('Mirian Salazar');
      await _mis('Mirian Salazar'); return { pry:pry, alt:_txt('#mis-top .td-alt') };
    });
    const pPry=(r.pry.match(/[▲▼] \d+%/)||[''])[0], pMis=(r.alt.match(/[▲▼] \d+%/)||[''])[0];
    chk('A07 · 23/10 '+hora+': Proyección dice «'+esp+' vs sep.» (la venta del 23/09 a las 19:00 '+(hora==='15:00'?'todavía no':'ya')+' estaba cargada)', pPry===esp, r.pry);
    chk('A07 · …y Tu día dice lo MISMO: «'+esp+' … que septiembre a esta altura»', pMis===esp && /que septiembre a esta altura/.test(r.alt), r.alt);
    await page._ctx.close();
  }
  {
    // El 31/10 contra un septiembre de 30 días: a esta altura septiembre ya había cerrado → entero (como `pryMomDe`, `enteroAntes`).
    const page = await abrir('2026-10-31T15:00:00-04:00');
    const r = await page.evaluate(async () => {
      STATE=FIX_A07().concat([V('Mirian Salazar','2026-09-30',1000,'2026-09-30T19:00:00')]); var pry=_pryMom('Mirian Salazar');
      await _mis('Mirian Salazar'); return { pry:pry, alt:_txt('#mis-top .td-alt') };
    });
    const pPry=(r.pry.match(/[▲▼] \d+%/)||[''])[0], pMis=(r.alt.match(/[▲▼] \d+%/)||[''])[0];
    chk('A07 · 31/10: septiembre entero (2.500) en los dos: «▼ 60%»', pPry==='▼ 60%' && pMis==='▼ 60%', r);
    await page._ctx.close();
  }

  // ═══ A08 · el mes de la plata es el de Bolivia ═══
  console.log('\n── A08. Aparato en UTC el 01/11 02:00 (31/10 22:00 en Bolivia): el mes de la plata sigue siendo octubre ──');
  {
    const page = await abrir('2026-11-01T02:00:00Z', 'UTC');
    const r = await page.evaluate(async () => {
      STATE=[ V('Mirian Salazar','2026-09-15',800,'2026-09-10'), V('Mirian Salazar','2026-10-20',1000,'2026-10-15'),
              V('Mirian Salazar','2026-11-05',500,'2026-10-28') ];
      var mine=STATE.slice(), R=misAnilloDatos(mine), E=misEfectivoDatos('Mirian Salazar');
      var hac=misHacerDatos('Mirian Salazar', mine).filter(function(o){ return /Saldo por cobrar de este mes/.test(o.t); })[0];
      await _mis('Mirian Salazar');
      var fichas=[].map.call(document.querySelectorAll('#mis-metrics .mc'), function(x){ return x.textContent.replace(/\s+/g,' ').trim(); });
      return { aparato:todayStr(), bolivia:diaNegocio(), mes:R.mes, ant:R.ant, bs:R.bs, efMes:E.mes, hac:hac ? hac.s : '',
               top:_txt('#mis-top'), lbl:_txt('#mis-top .td-lbl'), big:_txt('#mis-top .td-big'), alt:_txt('#mis-top .td-alt'), fichas:fichas };
    });
    chk('A08 · el escenario: el aparato ya está en noviembre y Bolivia todavía en octubre', r.aparato==='2026-11-01' && r.bolivia==='2026-10-31', [r.aparato, r.bolivia]);
    chk('A08 · el efectivo ya era de octubre (diaNegocio, §4mk)', r.efMes==='2026-10', r.efMes);
    chk('A08 · misAnilloDatos: el mes de octubre contra septiembre', r.mes==='2026-10' && r.ant==='2026-09' && r.bs===1000, [r.mes, r.ant, r.bs]);
    chk('A08 · Tu día: «Vendido para octubre» Bs 1.000, al lado del efectivo de octubre', /Vendido para octubre/i.test(r.lbl) && /1\.000/.test(r.big), [r.lbl, r.big]);
    chk('A08 · …«Falta cobrar del mes» Bs 1.000 (el de octubre, no los 500 de noviembre)', /Falta cobrar del mes\s*Bs 1\.000/.test(r.top), r.top.slice(r.top.indexOf('Falta'), r.top.indexOf('Falta')+40));
    chk('A08 · …y «a esta altura» es el 31: septiembre entero (800) → «▲ 25% más que septiembre»', /▲ 25% más que septiembre a esta altura/.test(r.alt), r.alt);
    chk('A08 · la ficha «Por cobrar» dice lo mismo (Bs 1.000 de octubre)', r.fichas.some(function(f){ return /Por cobrar/.test(f) && /1\.000/.test(f); }), r.fichas);
    chk('A08 · «Para hacer → Saldo por cobrar de este mes» también (Bs 1.000)', /1\.000/.test(r.hac) && !/Bs 500/.test(r.hac), r.hac);
    await page._ctx.close();
  }
  {
    // En Bolivia (el aparato con la hora de acá) nada cambia: noviembre ya empezó y es noviembre.
    const page = await abrir('2026-11-01T10:00:00-04:00');
    const r = await page.evaluate(async () => {
      STATE=[ V('Mirian Salazar','2026-10-20',1000,'2026-10-15'), V('Mirian Salazar','2026-11-05',500,'2026-10-28') ];
      var R=misAnilloDatos(STATE.slice()); return { mes:R.mes, bs:R.bs, bsAnt:R.bsAnt };
    });
    chk('A08 · en Bolivia el 01/11, noviembre (500) contra octubre (1.000), como siempre', r.mes==='2026-11' && r.bs===500 && r.bsAnt===1000, r);
    await page._ctx.close();
  }

  // ═══ A06 · decisión del dueño: sin ventas de tienda, pero dicho ═══
  console.log('\n── A06. La venta de tienda sigue afuera (dueño, 26/09) y ahora se dice ──');
  {
    const page = await abrir('2026-10-23T15:00:00-04:00');
    const r = await page.evaluate(async () => {
      STATE=[ V('Mirian Salazar','2026-09-15',800,'2026-09-10'), V('Mirian Salazar','2026-10-20',1000,'2026-10-15'),
              V('Mirian Salazar','',700,'2026-10-21', { direccion:DIR_TIENDA+' · Mia Plaza', zona:ZONA_TIENDA, pagado:true, saldo:0, acuenta:700 }) ];
      var R=misAnilloDatos(STATE.slice()), ani=misAnilloHtml(STATE.slice(), false);
      await _mis('Mirian Salazar');
      var l=document.querySelector('#mis-top .td-lbl');
      return { bs:R.bs, n:R.n, tienda:esVentaTienda(STATE[2]), ani:ani.replace(/<[^>]+>/g,' ').replace(/\s+/g,' '), big:_txt('#mis-top .td-big'), tit:l ? (l.getAttribute('title')||'') : '' };
    });
    chk('A06 · (la venta de tienda es de tienda)', r.tienda, r.tienda);
    chk('A06 · decisión del dueño: lo vendido del mes sigue SIN la venta de tienda (1.000, no 1.700)', r.bs===1000 && r.n===1 && /1\.000/.test(r.big) && !/1\.700/.test(r.big), [r.bs, r.n, r.big]);
    chk('A06 · la dona lo dice: «por fecha de entrega, sin ventas de tienda, ATC ni reposiciones»', /por fecha de entrega, sin ventas de tienda, ATC ni reposiciones/.test(r.ani), r.ani.slice(0,160));
    chk('A06 · «Vendido para octubre» lo explica al pasar el ratón (sin tienda: puede dar menos que Contabilidad y Proyección)', /venta[s]? de tienda/i.test(r.tit) && /Proyección/.test(r.tit), r.tit);
    await page._ctx.close();
  }

  chk('sin errores de JavaScript', !errores.length, errores.slice(0,3));
  await browser.close();
  console.log(`\n${PASS} bien · ${FAIL} mal`);
  process.exit(FAIL ? 1 : 0);
})();
