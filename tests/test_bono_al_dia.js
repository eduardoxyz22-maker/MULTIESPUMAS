/* 🏆 EL BONO TITANIO CON LA FOTO DEL LUNES (16/11/2026; regla del dueño para la 376: «1A, 2B»).

   La vendedora cobra el bono Titanio de un mes solo si (a) llega a su MÍNIMA y (b) tuvo el «panel al día» (nada en rojo en las 5 marcas de
   `alDiaCalcular`) en TODAS las fotos de los lunes de ese mes. La foto la saca el primer aparato con la planilla al día que abre el panel el
   lunes desde las 08:00, en `__al_dia_sem__`; nunca pisa una foto ya guardada. Rige desde el lunes 23/11/2026; un lunes sin foto no castiga.

   LO QUE ESTA PRUEBA CUIDA (los datos de `test_mis_comision.js`; fotos SINTÉTICAS):
   1. Sin la bandera `AL_DIA_BONO_PRUEBA`: el bono como hoy aunque haya una foto en rojo.
   2. La regla en el cierre (`ccmCuenta` de noviembre, mirado el 01/12): las dos fotos al día → bono; una en rojo → bono 0 con la razón y el
      total baja lo mismo; un lunes sin foto (o una foto sin ella) no castiga; sin la mínima → sin bono; «si siguen así» igual; la tabla
      del cierre lo dice.
   3. Antes del 23/11 no rige (el bono como hoy); los lunes de diciembre; un lunes feriado → la foto el primer día hábil de esa semana.
   4. La foto sola: el lunes 23/11 a las 07:30 no; a las 09:00 sí, UNA fila `__al_dia_sem__` con todas las del equipo (sin Eduardo ni ROHO) y
      lo que cada una tenía en rojo (lo mismo que «¿al día?»); otra vuelta no la vuelve a guardar; si otro aparato ya la guardó, no la pisa;
      el martes (no es día de foto) no se saca; sin la bandera, nada.
   5. «Tu día» (martes 24/11): «📸 Esta semana… 🔴 en rojo: Factura…» y en la escalera «⚠️ Sin bono Titanio (Bs 200): el lunes 23/11 tenías
      en rojo…», con el total de la comisión sin el bono; con la foto al día, «✅ panel al día» y el bono.
   6. `__al_dia_sem__` es una fila del sistema (no es una venta).
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_bono_al_dia.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const _src = fs.readFileSync(path.join(__dirname, 'test_mis_comision.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\n(async()=>{'));

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (cuando) => {
    const ctx = await browser.newContext({ viewport:{ width:1440, height:900 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await ctx.route(/^https?:/, r => r.abort());
    await page.clock.setFixedTime(new Date(cuando+'-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate('('+PREPARAR+')()');
    await page.evaluate(() => {
      var ts=function(d){ return new Date(d+'T10:00:00-04:00').getTime(); };
      /* Jonathan: un Titanio, pero lejos de su mínima (125.000) */
      window._L.push({ id:'j2', oc:'11-032', nota:'Nj2', cliente:'CLIENTE J2', celular:'71000077', fecha:'2026-11-18', turno:'AM', zona:'Norte', direccion:'CALLE 2', maps:'https://maps.google.com/?q=-17.78,-63.18',
        vendedor:'Jonathan Monje', productos:[{ desc:'COLCHON TITANIO ICE', medida:'140x190', codigo:'', cant:1, precio:20000 }], saldo:0, acuenta:0, pagado:true, metodoPago:'Efectivo 20000 @2026-11-10 #j2', ts:ts('2026-11-10'), rev:1 });
      window._fotos=async function(s){ window._L=window._L.filter(function(p){ return p.id!=='__al_dia_sem__'; });
        if(s) window._L.push({ id:'__al_dia_sem__', fecha:'', cliente:'✅ PANEL AL DÍA', rev:1, observaciones:JSON.stringify({ v:1, s:s }) });
        await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok'; MIS_COM_MEMO=null; COM_ESC_SIGUE={}; };
      window._F=function(r, d){ return { t:1, f:'x', por:{ 'Isabel Robledo':{ r:r?1:0, d:d||'' }, 'Jonathan Monje':{ r:0, d:'' } } }; };
      window._fila=function(K, v){ return K.filas.filter(function(r){ return normNombre(r.v)===normNombre(v); })[0]||{}; };
      window._cc=function(v){ MIS_COM_MEMO=null; var K=ccmCuenta('2026-11'), r=_fila(K, v); return { bo:r.bo, to:r.to, co:r.co, boSin:r.boSin||0, razon:r.boRazon||'', B:r.boRegla||null }; };
    });
    page._ctx=ctx; return page;
  };

  console.log('\n── 1-3. La regla en el cierre (mirado el martes 01/12) ──');
  let page = await abrir('2026-12-01T10:00:00');
  let r = await page.evaluate(async () => { await _fotos({ '2026-11-23':_F(1, 'Factura (2 ventas sin N° de factura o remisión)'), '2026-11-30':_F(0) }); return _cc('Isabel Robledo'); });
  chk('1a. sin la bandera: el bono como hoy (Bs 200) aunque haya una foto en rojo', r.bo===200 && !r.B, r);
  r = await page.evaluate(async () => { window.AL_DIA_BONO_PRUEBA=1; await _fotos({ '2026-11-23':_F(0), '2026-11-30':_F(0) }); return _cc('Isabel Robledo'); });
  const toBien=r.to;
  chk('2a. las dos fotos al día y la mínima: bono Bs 200, «cumple», dos semanas con foto', r.bo===200 && r.B && r.B.rige && r.B.ok && r.B.semanas.length===2 && r.B.sinFoto.length===0, r);
  r = await page.evaluate(async () => { await _fotos({ '2026-11-23':_F(1, 'Factura (2 ventas sin N° de factura o remisión)'), '2026-11-30':_F(0) }); return _cc('Isabel Robledo'); });
  chk('2b. el lunes 23/11 en rojo: bono 0, la razón dice qué y cuándo, y el total baja Bs 200', r.bo===0 && r.boSin===200 && r.to===toBien-200 && /el lunes 23\/11 tenía en rojo: Factura/.test(r.razon), r);
  r = await page.evaluate(async () => { await _fotos({ '2026-11-23':_F(0) }); var a=_cc('Isabel Robledo');
    await _fotos({ '2026-11-23':_F(0), '2026-11-30':{ t:1, f:'x', por:{ 'Otra Vendedora':{ r:1, d:'Factura' } } } }); var b=_cc('Isabel Robledo'); return { a:a, b:b }; });
  chk('2c. un lunes sin foto (nadie abrió el panel) no castiga: bono Bs 200 y se dice «sin foto»', r.a.bo===200 && r.a.B.ok && r.a.B.sinFoto.join()==='2026-11-30', r.a);
  chk('2d. una foto en la que ella no está, tampoco', r.b.bo===200 && r.b.B.ok && r.b.B.sinFoto.join()==='2026-11-30', r.b);
  r = await page.evaluate(async () => { await _fotos({ '2026-11-23':_F(0), '2026-11-30':_F(0) }); var o=_cc('Jonathan Monje');
    window.AL_DIA_BONO_PRUEBA=0; o.antes=_cc('Jonathan Monje').bo; window.AL_DIA_BONO_PRUEBA=1; return o; });
  chk('2e. sin llegar a la mínima: sin bono (hoy cobraba Bs '+r.antes+'), «no llegó a su mínima»', r.antes===200 && r.bo===0 && /no llegó a su mínima/.test(r.razon), r);
  r = await page.evaluate(async () => { await _fotos({ '2026-11-23':_F(1, 'Efectivo (Bs 500 en efectivo sin entregar)'), '2026-11-30':_F(0) }); MIS_COM_MEMO=null;
    var R=ccmDatos('2026-11'), m=R.marcas.filter(function(x){ return x.filas.some(function(y){ return normNombre(y.v)===normNombre('Isabel Robledo'); }); })[0];
    var html=m ? ccmMarcaHtml(R, m.g, m.filas, m.tot, false) : '';
    return { tabla:/sin bono: 🔴 el lunes 23\/11 tenía en rojo: Efectivo/.test(html) }; });
  chk('2f. la tabla del 🏁 cierre comercial dice «sin bono: 🔴 el lunes 23/11 tenía en rojo: Efectivo…»', r.tabla, r);
  r = await page.evaluate(() => { var F={ '2026-11-23':_F(1,'Factura') };
    var a=alDiaBonoCumple(F, 'Isabel Robledo', '2026-11', 130000, 125000, '2026-11-20'), b=alDiaBonoCumple(F, 'Isabel Robledo', '2026-10', 130000, 125000, '2026-12-01');
    var dic=alDiaSemLunesDelMes('2026-12'), nov=alDiaSemLunesDelMes('2026-11').filter(function(l){ return l>=AL_DIA_BONO_DESDE; });
    FERIADOS['2026-12-07']='feriado de prueba'; var fer=alDiaSemDiaFoto('2026-12-07'); delete FERIADOS['2026-12-07'];
    return { a:a, b:b, dic:dic, nov:nov, fer:fer, normal:alDiaSemDiaFoto('2026-12-14'), lun:alDiaSemLunes('2026-11-29') }; });
  chk('3a. (16/11, el dueño) noviembre rige ya antes del 23/11: la mínima cuenta, todavía sin fotos', r.a.rige && r.a.ok && !r.a.semanas.length, r.a);
  chk('3b. octubre (sin lunes desde el 23/11) no rige', !r.b.rige && r.b.ok, r.b);
  chk('3c. noviembre cuenta los lunes 23/11 y 30/11; diciembre, sus 4 lunes', r.nov.join()==='2026-11-23,2026-11-30' && r.dic.join()==='2026-12-07,2026-12-14,2026-12-21,2026-12-28', [r.nov, r.dic]);
  chk('3d. un lunes feriado: la foto el primer día hábil de esa semana (el martes); el domingo 29/11 es de la semana del lunes 23/11', r.fer==='2026-12-08' && r.normal==='2026-12-14' && r.lun==='2026-11-23', r);
  await page._ctx.close();

  console.log('\n── 4. La foto sola, el lunes 23/11 ──');
  page = await abrir('2026-11-23T07:30:00');
  r = await page.evaluate(async () => { await _fotos(null); window.SAVES=[]; CONNECTED=true; ULTIMO_REFRESCO=Date.now();
    var o={ sinBandera:alDiaSemAuto() }; window.AL_DIA_BONO_PRUEBA=1; o.temprano=alDiaSemAuto(); await new Promise(x=>setTimeout(x, 200)); o.saves=window.SAVES.length; return o; });
  chk('4a. sin la bandera no saca nada; con la bandera, a las 07:30 todavía no', r.sinBandera===null && r.temprano===null && r.saves===0, r);
  await page.clock.setFixedTime(new Date('2026-11-23T09:00:00-04:00'));
  r = await page.evaluate(async () => { ULTIMO_REFRESCO=Date.now(); var p=alDiaSemAuto(); if(p) await p;
    var g=window.SAVES.filter(function(x){ return x.id==='__al_dia_sem__'; }), o=g.length ? JSON.parse(g[0].observaciones) : null, F=o && o.s['2026-11-23'];
    var esp=alDiaDatos('Isabel Robledo'), rojo=esp.D.filter(function(d){ return d.sev==='r'; }).length ? 1 : 0;
    return { n:g.length, F:F, vends:F ? Object.keys(F.por) : [], isa:F ? F.por['Isabel Robledo'] : null, rojo:rojo, enState:!!alDiaSemLeer()['2026-11-23'] }; });
  chk('4b. a las 09:00 la saca: UNA fila `__al_dia_sem__` con el lunes 23/11', r.n===1 && !!r.F && r.F.f==='2026-11-23' && r.enState, { n:r.n, f:r.F && r.F.f });
  chk('4c. con todas las del equipo (Isabel, Maria, Mirian, Jonathan…) y sin Eduardo ni ROHO', ['Isabel Robledo','Maria Flores','Mirian Salazar','Jonathan Monje'].every(function(v){ return r.vends.indexOf(v)>=0; }) && r.vends.indexOf('Eduardo Añez')<0 && r.vends.indexOf('ROHO')<0, r.vends);
  chk('4d. lo de cada una es lo de «¿al día?» (rojo = '+r.rojo+')', !!r.isa && r.isa.r===r.rojo && (r.rojo ? r.isa.d.length>0 : true), r.isa);
  r = await page.evaluate(async () => { var n=window.SAVES.length; AL_DIA_SEM_ULT=0; var p=alDiaSemAuto(); if(p) await p; return { mas:window.SAVES.length-n }; });
  chk('4e. otra vuelta del reloj no la vuelve a guardar', r.mas===0, r);
  r = await page.evaluate(async () => { var otra={ t:1, f:'2026-11-23', por:{ 'Isabel Robledo':{ r:0, d:'de otro aparato' } } };
    window._L=window._L.filter(function(p){ return p.id!=='__al_dia_sem__'; }); window._L.push({ id:'__al_dia_sem__', fecha:'', cliente:'x', rev:4, observaciones:JSON.stringify({ v:1, s:{ '2026-11-23':otra } }) });
    STATE=STATE.filter(function(p){ return p.id!=='__al_dia_sem__'; }); var n=window.SAVES.length; AL_DIA_SEM_ULT=0; ULTIMO_REFRESCO=Date.now();
    var p=alDiaSemAuto(); var res=p ? await p : null; return { mas:window.SAVES.length-n, ya:res && res.ya, queda:(alDiaSemLeer()['2026-11-23'].por['Isabel Robledo']||{}).d }; });
  chk('4f. si otro aparato ya la guardó, no la pisa (gana la primera) y se queda con esa', r.mas===0 && r.ya===true && r.queda==='de otro aparato', r);
  await page.clock.setFixedTime(new Date('2026-11-24T09:30:00-04:00'));
  r = await page.evaluate(async () => { STATE=STATE.filter(function(p){ return p.id!=='__al_dia_sem__'; }); var n=window.SAVES.length; AL_DIA_SEM_ULT=0; ULTIMO_REFRESCO=Date.now(); var p=alDiaSemAuto(); return { p:p, mas:window.SAVES.length-n }; });
  chk('4g. el martes (no es día de foto) no se saca, aunque falte la del lunes', r.p===null && r.mas===0, r);
  await page._ctx.close();

  console.log('\n── 5. «Tu día» y la escalera (martes 24/11) ──');
  page = await abrir('2026-11-24T10:00:00');
  r = await page.evaluate(async () => { window.COM_ESCALERA_PRUEBA=1; await _fotos({ '2026-11-23':_F(1, 'Factura (2 ventas sin N° de factura o remisión)') }); await _ver('Isabel Robledo');
    var o={ sem:!!document.getElementById('mis-al-dia-sem'), bono:(document.querySelector('#mis-com [data-k="bono"]')||{}).textContent||'' };
    window.AL_DIA_BONO_PRUEBA=1; MIS_COM_MEMO=null; COM_ESC_SIGUE={}; await _ver('Isabel Robledo');
    o.sem2=(document.getElementById('mis-al-dia-sem')||{}).textContent||''; o.bono2=(document.querySelector('#mis-com [data-k="bono"]')||{}).textContent||'';
    o.cls2=(document.querySelector('#mis-com [data-k="bono"]')||{}).className||''; o.to2=(document.getElementById('mis-com')||{}).getAttribute('data-to');
    await _fotos({ '2026-11-23':_F(0) }); await _ver('Isabel Robledo');
    o.sem3=(document.getElementById('mis-al-dia-sem')||{}).textContent||''; o.bono3=(document.querySelector('#mis-com [data-k="bono"]')||{}).textContent||''; o.to3=(document.getElementById('mis-com')||{}).getAttribute('data-to');
    return o; });
  chk('5a. sin la bandera: ni la línea de la foto ni la regla («🏆 Bono Titanio: Bs 200 (ya está sumado arriba)»)', !r.sem && /Bono Titanio: Bs\s?200 \(ya está sumado arriba\)/.test(r.bono), r);
  chk('5b. con la foto en rojo: «📸 Esta semana (foto del lunes 23/11): 🔴 en rojo: Factura…»', /Esta semana/.test(r.sem2) && /23\/11/.test(r.sem2) && /🔴 en rojo: Factura/.test(r.sem2), r.sem2);
  chk('5c. y la escalera: «🔴 Perdiste el bono Titanio de noviembre: el lunes 23/11 tenías en rojo Factura…», en rojo, SIN el monto (dueño 16/11), con el total sin el bono', /Perdiste el bono Titanio de noviembre: el lunes 23\/11 tenías en rojo Factura/.test(r.bono2) && !/Bs/.test(r.bono2.replace(/Bs 130\.000/,'')) && /cesc-bono-r/.test(r.cls2) && Number(r.to2)===Number(r.to3)-200, [r.bono2, r.to2, r.to3]);
  chk('5d. con la foto al día: «✅ panel al día» y «🏆 Bono Titanio: Bs 200», y como HOY tiene algo en rojo, el aviso de que el lunes lo pierde', /✅ panel al día/.test(r.sem3) && /Bono Titanio: Bs\s?200/.test(r.bono3) && /Hoy tenés en rojo: .*si el lunes sigue así, perdés el bono/.test(r.bono3), [r.sem3, r.bono3]);
  r = await page.evaluate(async () => { var o={}; await _fotos({ '2026-11-23':_F(1, 'Factura') }); MIS_COM_MEMO=null; var S=ccmSigueDatos('2026-11', ccmCuenta('2026-11'));
    var f=(S ? S.filas : []).filter(function(x){ return normNombre(x.v)===normNombre('Isabel Robledo'); })[0]; o.rojo=f ? f.bo : null;
    await _fotos({ '2026-11-23':_F(0) }); MIS_COM_MEMO=null; S=ccmSigueDatos('2026-11', ccmCuenta('2026-11')); f=(S ? S.filas : []).filter(function(x){ return normNombre(x.v)===normNombre('Isabel Robledo'); })[0]; o.bien=f ? f.bo : null; return o; });
  chk('5e. «💰 Comisiones · si siguen así» (Proyección) con la misma regla: con el lunes en rojo, sin bono; al día, con bono', r.rojo===0 && r.bien>0, r);
  r = await page.evaluate(async () => { await _fotos({ '2026-11-23':_F(0) }); var o={ ok:comEscBonoTxt({ ym:'2026-11', v:'Isabel Robledo', bs:130000, mi:120000, bo:200, boR:alDiaBonoCumple({ '2026-11-23':_F(0) }, 'Isabel Robledo', '2026-11', 130000, 120000, '2026-11-24') }) };
    o.min=comEscBonoTxt({ ym:'2026-11', v:'Isabel Robledo', bs:90000, mi:120000, bo:0, boSin:200, boR:alDiaBonoCumple({}, 'Isabel Robledo', '2026-11', 90000, 120000, '2026-11-24') });
    o.sin=comEscBonoTxt({ ym:'2026-11', v:'Isabel Robledo', bs:90000, mi:0, pr:150000, bo:0, boSin:200, boR:alDiaBonoCumple({}, 'Isabel Robledo', '2026-11', 90000, 0, '2026-11-24') });
    return o; });
  chk('5f. sin llegar a la mínima: «⚠️ Perdés el bono Titanio si no llegás a tu mínima (Bs 120.000) y no tenés el panel al día cada lunes: te faltan Bs 30.000», sin el monto del bono', /Perdés el bono Titanio si no llegás a tu mínima \(Bs\s?120\.000\) y no tenés el panel al día cada lunes: te faltan Bs\s?30\.000/.test(r.min[0]) && !/Bs\s?200\b/.test(r.min[0]) && r.min[1]==='cesc-bono-a', r.min);
  chk('5g. sin mínima cargada: «⚠️ Sin mínima no hay bono Titanio… pedísela a Eduardo»', /Sin mínima no hay bono Titanio/.test(r.sin[0]) && /Eduardo/.test(r.sin[0]) && !/Bs\s?200\b/.test(r.sin[0]), r.sin);
  r = await page.evaluate(() => ({ sis:esFilaSistema({ id:'__al_dia_sem__' }), venta:!fueraDeConta({ id:'__al_dia_sem__', vendedor:'Isabel Robledo' }, 'tienda') }));
  chk('6a. `__al_dia_sem__` es una fila del sistema (no es una venta)', r.sis && !r.venta, r);
  await page._ctx.close();

  chk('sin errores en la página', errores.length===0, errores.slice(0,4));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
