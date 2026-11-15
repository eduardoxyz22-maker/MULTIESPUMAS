/* 🎯 MEJORA 342 — LA META DEL MES ARRIBA, SOLO CON LA CONTRASEÑA.

   El dueño (15/11): la meta del mes se veía solo en Contabilidad → Proyección. Ahora, con la contraseña puesta, una barrita debajo de la franja
   turquesa: «🎯 Noviembre · vendido 56 % · si sigue así 94 % de Bs 1.102.000 · faltan Bs 37.500 por día hábil». Los vendedores no la ven.

   LO QUE ESTA PRUEBA CUIDA:
   1. Sin la contraseña no se ve (tampoco sin la bandera `HDR_META_PRUEBA` en Playwright: las pruebas de siempre no cambian).
   2. Los números son los de «🎯 Cómo van contra la meta» (`metaMarcaDatos(proyeccionMes(mes))` de cada marca con meta, sumados).
   3. Verde si llega, ámbar si está cerca (90 %), rojo si no.
   4. Va adentro del encabezado: `--hdr-h` crece con ella (no tapa nada).
   5. Se calcula a lo sumo cada 10 minutos (la proyección es pesada); tocarla abre Proyección; sin metas, lo dice.
   Datos INVENTADOS. Reloj clavado: jueves 12/11/2026 a las 10:00 de Bolivia.
   Se corre:  node tests/test_hdr_meta.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function PREPARAR(){
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  loadFromServer=function(){};
  var n=0;
  window.V=function(vend, fecha, reg, bs){ n++;
    return { id:'p'+n, oc:fecha.slice(5,7)+'-'+(100+n), nota:String(500+n), vendedor:vend, cliente:'CLIENTE '+n, fecha:fecha, turno:'AM', zona:'', direccion:'',
             productos:[{desc:'COLCHON',medida:'140x190',cant:1}], saldo:bs, acuenta:0, pagado:false, metodoPago:'', entregado:false, ts:new Date(reg+'T10:00:00-04:00').getTime(), fotos:[] }; };
  window.METAS=function(m){ return filaSistema(META_ID, 'x', JSON.stringify({ v:1, m:m })); };
  window.FIX=function(){ return [V('Maria Flores','2026-11-04','2026-11-03',6000), V('Maria Flores','2026-11-18','2026-11-10',2000), V('Carola Chavez','2026-11-06','2026-11-03',4000),
    V('Mauricio Merida','2026-11-05','2026-11-04',5000), V('Mauricio Merida','2026-11-11','2026-11-09',5000), V('Andrea Orias','2026-11-17','2026-11-09',3000)]; };
  window._txt=function(sel){ var e=document.querySelector(sel); return e ? e.innerText.replace(/\s+/g,' ').trim() : ''; };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const page = await browser.newPage({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-11-12T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(350);
  await page.evaluate(PREPARAR);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,400) }; } };

  console.log('\n── 1. Solo con la contraseña ──');
  let r = await ev(() => {
    STATE=FIX().concat([METAS({ '2026-11':{ heaven:30000, suena:25000, t:1 } })]);
    window.HDR_META_PRUEBA=1; UNLOCKED=false; hdrMetaPintar(true);
    var o={ sinClave:document.getElementById('hdr-meta').hidden };
    window.HDR_META_PRUEBA=0; UNLOCKED=true; hdrMetaPintar(true); o.sinBandera=document.getElementById('hdr-meta').hidden;
    return o;
  });
  chk('1a. sin la contraseña, escondida (los vendedores no la ven)', r.sinClave===true, r);
  chk('1b. en Playwright sin `HDR_META_PRUEBA`, escondida aunque haya contraseña', r.sinBandera===true, r);

  console.log('\n── 2. Los números, los de «Cómo van contra la meta» ──');
  r = await ev(() => {
    window.HDR_META_PRUEBA=1; UNLOCKED=true;
    var h=document.querySelector('.header'), antes=h.offsetHeight;
    var R=proyeccionMes('2026-11'), M=0, v=0, p=0, dq=0; R.marcas.forEach(function(m){ var d=metaMarcaDatos(R, m); if(d){ M+=d.M; v+=d.v; p+=d.p; dq=d.dq; } });
    updateStats();   // el gancho de siempre (cada lectura) la pinta
    var el=document.getElementById('hdr-meta');
    return { vis:!el.hidden, t:_txt('#hdr-meta'), M:M, v:v, p:p, dq:dq, pv:metaPct(v, M), pp:metaPct(p, M), falta:(M-v)/dq,
             cls:(el.querySelector('.hm-c')||{}).className||'', antes:antes, despues:h.offsetHeight, hh:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr-h')),
             adentro:!!h.contains(el), aria:el.getAttribute('aria-label')||'' };
  });
  chk('2a. con la contraseña se ve, adentro del encabezado', r.vis && r.adentro, r);
  chk('2b. «🎯 Noviembre · vendido N % · si sigue así N % de Bs 55.000» con la cuenta de metaMarcaDatos (las dos marcas sumadas)',
      new RegExp('🎯 Noviembre vendido '+r.pv+' % · si sigue así '+r.pp+' % de Bs 55\\.000').test(r.t) && r.M===55000, [r.t, r.pv, r.pp, r.M]);
  chk('2c. «faltan Bs X por día hábil» = (meta − vendido) ÷ los días hábiles que quedan, contando hoy', r.t.indexOf('faltan '+('Bs '+Math.round(r.falta).toLocaleString('es-BO'))+' por día hábil')>=0, [r.t, r.falta, r.dq]);
  chk('2d. el color: '+(r.pp>=100 ? 'verde' : (r.pp>=90 ? 'ámbar' : 'rojo'))+' (se proyecta el '+r.pp+' %)', r.cls.indexOf(r.pp>=100 ? 'hm-ok' : (r.pp>=90 ? 'hm-cerca' : 'hm-mal'))>=0, r.cls);
  chk('2e. el encabezado creció y `--hdr-h` lo cuenta (no tapa nada)', r.despues>r.antes && Math.abs(r.hh-r.despues)<=1, [r.antes, r.despues, r.hh]);
  chk('2f. se lee en voz alta (aria-label)', /Meta de noviembre de 2026: vendido \d+ por ciento, si sigue así \d+ por ciento/.test(r.aria), r.aria);

  console.log('\n── 3. Verde, ámbar y rojo ──');
  r = await ev(() => {
    var p=proyeccionMes('2026-11').marcas.filter(function(m){ return m.g.k==='heaven'; })[0].tot.proy, o={};   // la meta va solo en Heaven
    [[Math.round(p*0.8), 'verde'], [Math.round(p*1.05), 'ambar'], [Math.round(p*1.5), 'rojo']].forEach(function(q){
      STATE=FIX().concat([METAS({ '2026-11':{ heaven:q[0], t:1 } })]); hdrMetaPintar(true);
      o[q[1]]=(document.querySelector('#hdr-meta .hm-c')||{}).className||'';
    });
    return o;
  });
  chk('3a. se proyecta más que la meta → verde; entre el 90 y el 100 % → ámbar; menos → rojo', /hm-ok/.test(r.verde) && /hm-cerca/.test(r.ambar) && /hm-mal/.test(r.rojo), r);

  console.log('\n── 4. A lo sumo cada 10 minutos, tocarla y sin metas ──');
  r = await ev(() => {
    STATE=FIX().concat([METAS({ '2026-11':{ heaven:30000, suena:25000, t:1 } })]); hdrMetaPintar(true);
    var t1=_txt('#hdr-meta');
    STATE=FIX().concat([METAS({ '2026-11':{ heaven:90000, t:1 } })]); hdrMetaPintar();
    var t2=_txt('#hdr-meta');
    HDR_META.t=Date.now()-11*60000; hdrMetaPintar();
    var t3=_txt('#hdr-meta');
    document.getElementById('hdr-meta').click();
    var o={ t1:t1, t2:t2, t3:t3, vista:(document.querySelector('.view.active')||{}).id||'', tab:contaTab() };
    STATE=FIX(); hdrMetaPintar(true); o.sin=_txt('#hdr-meta');
    return o;
  });
  chk('4a. otra meta guardada no se recalcula enseguida (la proyección es pesada)…', r.t1===r.t2, [r.t1, r.t2]);
  chk('4b. …pasados 10 minutos, sí (Bs 90.000)', /de Bs 90\.000/.test(r.t3) && r.t3!==r.t1, r.t3);
  chk('4c. tocarla abre Contabilidad → Proyección', r.vista==='view-conta' && r.tab==='proy', [r.vista, r.tab]);
  chk('4d. sin metas para el mes: «🎯 Noviembre todavía no tiene metas · cargalas en Proyección → 🎯 Metas»', /🎯 Noviembre todavía no tiene metas · cargalas en Proyección → 🎯 Metas/.test(r.sin), r.sin);

  chk('la página no tiró errores', errores.length===0, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
