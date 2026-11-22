/* ▤ (22/11, mejora 469) ADMINISTRACIÓN COMPACTA EN LA COMPU: una línea por pedido (N° del día, color, cliente, productos, de dónde sale y el
   camión), agrupada por día y turno como las fichas, con la MISMA lista (filtros, búsqueda). Tocar la línea abre la ficha de siempre.
   Se recuerda por compu en `me_adm_vista`; en el celular (≤700 px) se ve como fichas.
   Se corre:  node tests/test_adm_compacta.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_u2_turno.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));
const ARMAR = async (page)=>{
  await page.evaluate('('+PREPARAR+')()');
  await page.evaluate(async()=>{
    UNLOCKED=true;
    var L=function(ex){ return [_lin('CH1201|TITANIO ICE|160x190',1,Object.assign({ chk:'ok' }, ex||{}))]; };
    var ps=[
      _ped('c1','2026-10-22','AM',L(),{ cliente:'CLIENTE UNO', maps:'https://www.google.com/maps?q=-17.75,-63.17', vehiculo:'Carry', chofer:'Omar', verificado:true, ts:_ts('2026-10-20','09:00:00') }),
      _ped('c2','2026-10-22','AM',[_lin('CH1201|TITANIO ICE|160x190',2,{ chk:'no' }), _lin('CD1403|ALMOHADA|50x70',2,{ chk:'ok' })],{ cliente:'CLIENTE DOS', ts:_ts('2026-10-20','10:00:00') }),
      _ped('c3','2026-10-22','PM',L(),{ cliente:'CLIENTE TRES', ts:_ts('2026-10-20','11:00:00') }),
      _ped('c4','2026-10-24','AM',L(),{ cliente:'CLIENTE SABADO', ts:_ts('2026-10-20','12:00:00') })
    ];
    await _cargar(ps, _stock(function(s){ s.c.u[_K]=10; }));
    document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block';
    showView('admin'); var seg=document.querySelector('#adm-mode [data-val="todo"]'); if(seg) seg.click(); renderAdmin();
  });
};
(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{ width:1440, height:900 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('dialog', d=>d.accept());
  await page.clock.setFixedTime(new Date('2026-10-22T09:10:00-04:00'));   // jueves
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
  await ARMAR(page);
  const sin=await page.evaluate(()=>{ try{ localStorage.setItem('me_adm_vista','compacta'); }catch(e){} return admVista(); });
  chk('en Playwright, sin pedirlo, sigue la tabla aunque la compu tenga guardada la compacta', sin==='tabla', sin);
  const r=await page.evaluate(()=>{
    window.ADM_COMPACTA_PRUEBA=1; renderAdmin();
    var box=document.getElementById('adm-fichas'), T=function(e){ return e ? e.textContent.replace(/\s+/g,' ').trim() : ''; };
    var R=[].slice.call(box.querySelectorAll('.acp-r')), de=function(n){ return R.filter(function(x){ return T(x).indexOf(n)>=0; })[0]; };
    return { v:admVista(), sw:[].map.call(document.querySelectorAll('#adm-vista button'), T), on:T(document.querySelector('#adm-vista button.on')),
      tabla:document.getElementById('tbl-pedidos-w').hidden, n:R.length, fichas:box.querySelectorAll('.af-f').length, grupos:[].map.call(box.querySelectorAll('.af-gt'), T),
      c1:T(de('CLIENTE UNO')), c1n:T(de('CLIENTE UNO').querySelector('.acp-n')), c1cls:de('CLIENTE UNO').className, c2:T(de('CLIENTE DOS')), c2cls:de('CLIENTE DOS').className,
      c3cam:T(de('CLIENTE TRES').querySelector('.acp-cam')), c1lug:T(de('CLIENTE UNO').querySelector('.acp-lg')) };
  });
  chk('1 · con la bandera: «🃏 Fichas | ▤ Compacta | ☰ Tabla», la compacta encendida y la tabla escondida', r.v==='compacta' && r.sw.join('|')==='🃏 Fichas|▤ Compacta|☰ Tabla' && /Compacta/.test(r.on) && r.tabla, r);
  chk('2 · una línea por pedido (no fichas), agrupada por día y turno como las fichas', r.n===4 && r.fichas===0 && r.grupos.length===3 && /Mañana/.test(r.grupos[0]) && /Tarde/.test(r.grupos[1]), r.grupos);
  chk('3 · la línea: N° del día, cliente, productos, de dónde sale y el camión con su chofer; el color de la ficha (verde/rojo)',
      r.c1n==='1' && /CLIENTE UNO/.test(r.c1) && /1× TITANIO ICE 160×190/.test(r.c1) && /PTF/.test(r.c1lug) && /Carry · Omar/.test(r.c1) && /acp-k-stock/.test(r.c1cls) && /✅ Listo/.test(r.c1), r);
  chk('3 · varios productos resumidos en la misma línea, y el rojo cuando le falta algo', /2× TITANIO ICE 160×190 · 2× ALMOHADA/.test(r.c2) && /acp-k-nohay/.test(r.c2cls) && /Sin camión/.test(r.c3cam), r);
  const t=await page.evaluate(async()=>{
    var f=[].slice.call(document.querySelectorAll('#adm-fichas .acp-r')).filter(function(x){ return /CLIENTE TRES/.test(x.textContent); })[0];
    f.click(); var abre=document.getElementById('modal').classList.contains('on'), cli=(document.getElementById('modal-box').textContent.indexOf('CLIENTE TRES')>=0); closeModal();
    var s=document.getElementById('adm-search'); s.value='sabado'; s.dispatchEvent(new Event('input')); renderAdmin();
    var nB=document.querySelectorAll('#adm-fichas .acp-r').length, txt=document.getElementById('adm-fichas').textContent;
    s.value=''; s.dispatchEvent(new Event('input')); renderAdmin();
    return { abre:abre, cli:cli, nB:nB, sab:/CLIENTE SABADO/.test(txt), guardada:localStorage.getItem('me_adm_vista') };
  });
  chk('4 · tocar la línea abre la ficha de siempre', t.abre && t.cli, t);
  chk('5 · la búsqueda de Administración filtra también la compacta (misma lista que las fichas)', t.nB===1 && t.sab, t);
  const sw=await page.evaluate(()=>{ admVistaPoner('tabla'); var a={ v:admVista(), filas:document.querySelectorAll('#tbl-pedidos tbody tr').length, g:localStorage.getItem('me_adm_vista') };
    admVistaPoner('fichas'); a.fichas=document.querySelectorAll('#adm-fichas .af-f').length; a.lineas=document.querySelectorAll('#adm-fichas .acp-r').length;
    admVistaPoner('compacta'); a.vuelve=document.querySelectorAll('#adm-fichas .acp-r').length; a.g2=localStorage.getItem('me_adm_vista'); return a; });
  chk('6 · se pasa a la tabla y a las fichas y vuelve; queda guardada por compu (me_adm_vista)', sw.v==='tabla' && sw.filas===4 && sw.g==='tabla' && sw.fichas===4 && sw.lineas===0 && sw.vuelve===4 && sw.g2==='compacta', sw);
  await page.close();
  /* 📱 en el celular la compacta se ve como fichas */
  const ctx2 = await browser.newContext({ viewport:{ width:600, height:900 }, timezoneId:'America/La_Paz' });
  await ctx2.route(/^https?:\/\//, r => r.abort());
  const p2 = await ctx2.newPage(); p2.on('pageerror', e=>errs.push(e.message)); p2.on('dialog', d=>d.accept());
  await p2.clock.setFixedTime(new Date('2026-10-22T09:10:00-04:00'));
  await p2.goto('file://' + PEDIDOS, { waitUntil:'load' }); await p2.waitForTimeout(400);
  await ARMAR(p2);
  const m=await p2.evaluate(()=>{ window.ADM_COMPACTA_PRUEBA=1; try{ localStorage.setItem('me_adm_vista','compacta'); }catch(e){} renderAdmin();
    return { v:admVista(), fichas:document.querySelectorAll('#adm-fichas .af-f').length, lineas:document.querySelectorAll('#adm-fichas .acp-r').length,
      sw:[].map.call(document.querySelectorAll('#adm-vista button'), function(b){ return b.textContent; }) }; });
  chk('7 · en el celular (≤700 px) se ve como fichas y no se ofrece la compacta', m.v==='fichas' && m.fichas===4 && m.lineas===0 && m.sw.join('|').indexOf('Compacta')<0, m);
  chk('sin errores en la página', errs.length===0, errs);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
