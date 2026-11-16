/* 🎨 LOS BOTONES DEL TURNO DICEN LOS LUGARES Y LA HORA (16/11/2026, mejora 399; el dueño la eligió en «Mejoras visuales 390-440»).

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin `TURNO_CARDS_PRUEBA` (Playwright): «🌅 AM» y «🌆 PM» de siempre.
   2. Con la bandera: «🌅 Mañana · llega de 9:00 a 12:00 · N libres de 12» y «🌆 Tarde · llega de 14:30 a 18:30 · N libres de 13», con los
      MISMOS números de `cuposUsadosTurno`/`limTurno`; la etiqueta dice el día.
   3. Un turno lleno dice «Lleno (12 de 12)» y se puede tocar igual (como siempre).
   4. Tocar una tarjeta elige el turno (los mismos botones: `segVal`).
   5. El sábado la tarde queda apagada y lo dice.
   Datos SINTÉTICOS. Reloj clavado el lunes 16/11/2026 10:00. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_v399_turno_cards.js */
const { chromium } = require('playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  await ev(() => {
    CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    var P=function(i, f, t){ return { id:'c'+i, oc:'11-'+(100+i), fecha:f, turno:t, vendedor:'Maria Flores', cliente:'C'+i, celular:'70000000', zona:'Norte', productos:[{ desc:'COLCHON SOFT', medida:'140x190', cant:1 }], ts:Date.now(), entregado:false, fotos:[] }; };
    STATE=[]; for(var i=0;i<4;i++) STATE.push(P(i,'2026-11-18','AM')); for(var j=0;j<3;j++) STATE.push(P(10+j,'2026-11-18','PM')); for(var k=0;k<12;k++) STATE.push(P(20+k,'2026-11-19','AM'));
    showView('form'); resetForm();
    window.__dia=function(f){ var e=document.getElementById('f-fecha'); e.value=f; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); renderCupoForm(); };
    window.__mirar=function(){ var lab=document.getElementById('f-turno').closest('.field').querySelector('label');
      return { bs:[].map.call(document.querySelectorAll('#f-turno button'), function(b){ return { v:b.getAttribute('data-val'), t:b.innerText.replace(/\s+/g,' ').trim(), dis:b.disabled, act:b.classList.contains('active') }; }),
        lab:lab.textContent.replace(/\s+/g,' ').trim(), cls:document.getElementById('f-turno').className }; };
  });

  console.log('\n── 1. Sin la bandera ──');
  let r = await ev(() => { __dia('2026-11-18'); return __mirar(); });
  chk('1 «🌅 AM» y «🌆 PM» de siempre', r.bs[0].t==='🌅 AM' && r.bs[1].t==='🌆 PM' && !/p399/.test(r.cls), r.bs);

  console.log('\n── 2. Con la bandera ──');
  r = await ev(() => { window.TURNO_CARDS_PRUEBA=1; __dia('2026-11-18'); var o=__mirar(); o.u=[cuposUsadosTurno('2026-11-18','AM'), limTurno('2026-11-18','AM'), cuposUsadosTurno('2026-11-18','PM'), limTurno('2026-11-18','PM')]; return o; });
  chk('2a «🌅 Mañana · llega de 9:00 a 12:00 · 8 libres de 12»', r.bs[0].t==='🌅 Mañana llega de 9:00 a 12:00 8 libres de 12', r.bs[0].t);
  chk('2b «🌆 Tarde · llega de 14:30 a 18:30 · 10 libres de 13»', r.bs[1].t==='🌆 Tarde llega de 14:30 a 18:30 10 libres de 13', r.bs[1].t);
  chk('2c los números son los de cuposUsadosTurno/limTurno', r.u.join(',')==='4,12,3,13', r.u);
  chk('2d la etiqueta dice el día: «Turno de entrega · miércoles 18/11»', /^Turno de entrega · miércoles 18\/11/.test(r.lab), r.lab);

  console.log('\n── 3-4. Lleno, y tocar ──');
  r = await ev(() => { __dia('2026-11-19'); return __mirar(); });
  chk('3 el jueves la mañana está llena: «Lleno (12 de 12)», y se puede tocar igual', /Lleno \(12 de 12\)/.test(r.bs[0].t) && !r.bs[0].dis, r.bs[0]);
  r = await ev(() => { document.querySelector('#f-turno button[data-val="PM"]').click(); var a=segVal('f-turno'); document.querySelector('#f-turno button[data-val="AM"]').click(); return [a, segVal('f-turno'), document.querySelector('#f-turno button[data-val="AM"]').classList.contains('active')]; });
  chk('4 tocar una tarjeta elige el turno (los mismos botones)', r.join(',')==='PM,AM,true', r);

  console.log('\n── 5. El sábado ──');
  r = await ev(() => { __dia('2026-11-21'); return __mirar(); });
  chk('5 el sábado la tarde queda apagada y lo dice; la mañana con sus 15', r.bs[1].dis && /el sábado no hay camión a la tarde/.test(r.bs[1].t) && /15 libres de 15/.test(r.bs[0].t), r.bs);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
