/* 🚚 DOS RECOGIDAS DE MORENO A LA VEZ Y MÁS DE LO QUE HABÍA (25/10, auditoría Codex/Astra S3, §4mk).

   La cronología de la auditoría: Moreno 6, PTF 0, dos recogidas distintas de 5 (A y B) que dos aparatos confirman con la MISMA lectura
   vieja y después se juntan. Medido en cada paso (Moreno = la foto del Excel menos lo restado; PTF = las entradas de las recepciones):
     junta     → Moreno 0 + PTF 10, y la diferencia de 4 A LA VISTA (antes, igual, pero callada)
     anular A  → Moreno 1 + PTF 5 = 6 (antes 5 + 5 = 10: devolvía lo que no había restado)
     anular B  → Moreno 6 + PTF 0 = 6 (antes 10 + 0)
   Lo mismo invirtiendo A y B. Y una recogida normal (que alcanza) sigue igual. Con las funciones de la página (stockFusionar,
   stockNormalizarRecepciones, stockAnularRecepcion), sin red.

   Reloj CLAVADO (martes 27/10/2026, 10:00 de Bolivia). Solo datos sintéticos.
   Se corre:  node tests/test_recogidas_moreno.js   (PEDIDOS=… para correrla contra otra versión) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1440, height:1000 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await ctx.route(/^https:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-27T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  const r = await page.evaluate(async () => {
    CONNECTED=false; try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    guardarStock=function(){}; renderStock=function(){}; renderAdmin=function(){};
    var K='TITANIO ICE|160X190', ALM='IM - PRODUCTOTERMINADO', T0=new Date('2026-10-27T08:00:00-04:00').getTime();
    var X=function(){ var S=stockVacio();
      S.c={ f:'2026-10-27', hora:'08:00', u:{}, t:T0 }; S.c.u[K]=0;
      S.g[ALM]={ f:'2026-10-27', hora:'08:00', u:{}, t:T0, rs:{} }; S.g[ALM].u[K]=6;
      S.p=[{ id:'qa', k:K, u:5, total:5, tipo:'recogida', de:ALM, f:'2026-10-27', recs:[] }, { id:'qb', k:K, u:5, total:5, tipo:'recogida', de:ALM, f:'2026-10-27', recs:[] }];
      return S; };
    var copia=function(S){ return JSON.parse(JSON.stringify(S)); };
    var recibir=function(S, qid, ts){ var q=S.p.filter(function(x){ return x.id===qid; })[0]; var rc=stockRecNuevo(5, '2026-10-27'); rc.id='r-'+qid; rc.ts=ts; stockRecsDe(q).push(rc); stockNormalizarRecepciones(S); return S; };
    var medir=function(S){ var ptf=0; (S.e||[]).forEach(function(e){ if(e && e.rec && e.k===K) ptf+=Number(e.u)||0; }); return { moreno:Number(S.g[ALM].u[K])||0, ptf:ptf, falta:(typeof stockRecogidasDeMas==='function' ? ((stockRecogidasDeMas(S)[0]||{}).falta||0) : -1) }; };
    var anular=function(S, qid){ STOCK=S; stockAnularRecepcion(qid, 'r-'+qid, 'prueba'); return STOCK; };
    var corrida=function(prim, seg){
      var base=X(), tP=new Date('2026-10-27T09:00:00-04:00').getTime(), tS=tP+60000;
      var A=recibir(copia(base), prim, tP), B=recibir(copia(base), seg, tS);
      var J=stockFusionar(base, B, A); stockNormalizarRecepciones(J);
      var out={ antes:medir(base), A:medir(A), junta:medir(J) };
      J=anular(J, prim); out.anulaPrim=medir(J);
      J=anular(J, seg); out.anulaSeg=medir(J);
      return out;
    };
    var normal=(function(){ var S=X(); S.g[ALM].u[K]=12; recibir(S, 'qa', new Date('2026-10-27T09:00:00-04:00').getTime()); var m1=medir(S); recibir(S, 'qb', new Date('2026-10-27T09:30:00-04:00').getTime()); return { una:m1, dos:medir(S) }; })();
    return { ab:corrida('qa','qb'), ba:corrida('qb','qa'), normal:normal };
  });
  for (const [nom, c] of [['A y B', r.ab], ['B y A', r.ba]]) {
    chk(`${nom} · (partida) Moreno 6 + PTF 0; un aparato recibe 5 → 1 + 5`, c.antes.moreno===6 && c.antes.ptf===0 && c.A.moreno===1 && c.A.ptf===5, c);
    chk(`${nom} · junta: Moreno 0 + PTF 10 y la diferencia de 4 queda a la vista`, c.junta.moreno===0 && c.junta.ptf===10 && c.junta.falta===4, c.junta);
    chk(`${nom} · anular la primera: Moreno 1 + PTF 5 = 6 (antes 5 + 5 = 10)`, c.anulaPrim.moreno===1 && c.anulaPrim.ptf===5 && c.anulaPrim.falta===0, c.anulaPrim);
    chk(`${nom} · anular las dos: Moreno 6 + PTF 0, como la foto (antes 10 + 0)`, c.anulaSeg.moreno===6 && c.anulaSeg.ptf===0, c.anulaSeg);
  }
  chk('una recogida que alcanza sigue igual: 12 → 7 + 5 → 2 + 10, sin aviso', r.normal.una.moreno===7 && r.normal.una.ptf===5 && r.normal.dos.moreno===2 && r.normal.dos.ptf===10 && r.normal.dos.falta===0, r.normal);
  chk('sin errores en la página', !errores.length, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
