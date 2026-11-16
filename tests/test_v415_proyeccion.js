/* 🎨 MEJORAS 415, 416, 417, 425 y 426 (16/11/2026; dueño: «todas menos la 403») — lo que se ve en Contabilidad → 📈 Proyección.
   SOLO DIBUJO: ninguna cuenta cambia, todo sale de las funciones de siempre.

   LO QUE ESTA PRUEBA CUIDA
   415 · «👤 Por vendedor»: cada vendedora con su barra hacia el presupuesto GUARDADO (`ccmMetas(ym).ok`): «N % de Bs X · mín. Bs Y» y
         «📈 N % si sigue así / llega ✅», verde si llega, ámbar si queda cerca (90 %), rojo si no (con la proyección de la fila); la raya del
         presupuesto y la de la mínima; la leyenda arriba; sin meta, «sin meta guardada»; sin metas guardadas, nada; tocar la barra sigue
         abriendo la tablita del MoM; el renglón se sigue leyendo (nombre y plata); en el iPad (820) la barra baja a su propio renglón.
   416 · Arriba, el tablero «¿Llegamos?»: Vendido → Si sigue así → Meta del equipo (los números de `proyeccionMes` y `metaEquipo`), la
         pastilla «se proyecta el N %», «N de M días hábiles», una ficha por marca con su meta; las fichas de siempre se siguen armando,
         escondidas. Sin meta del equipo, las de siempre.
   417 · Cada curva (marca y tienda) con la raya de su meta, «🎯 meta Bs …», la pastilla «N % de la meta / ✅ llega a la meta» y el punto
         final pintado (verde / ámbar / rojo). La meta de la tienda es la de «Cada tienda contra su meta» (333).
   425 · Black Friday: cada marca y cada vendedora con dos barras (campaña y antes, los números de `bfnDatos`), con la pastilla
         «+N %», «−N %», «nuevo» o «↑ N veces» (de 5 veces para arriba); una escala por sección.
   426 · El calendario de calor con la columna «Semana» (el total de cada fila, sumado de lo que ya pinta) y «Lo que dice el calendario»
         (la mejor semana, el mejor día, el promedio por día hábil); cambia con Vendido / Entregas.
   Y sin las banderas (`PRY_VD_BARRA_PRUEBA`, `PRY_TABLERO_PRUEBA`, `PRY_CURVA_META_PRUEBA`, `BFN_BARRAS_PRUEBA`, `CALOR_SEMANA_PRUEBA`),
   todo como antes.
   Datos SINTÉTICOS. Reloj clavado: lunes 16/11/2026 10:00 de Bolivia (tercer día hábil de la campaña de Black Friday).
   Se corre:  node tests/test_v415_proyeccion.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,700)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const BANDERAS = ['PRY_VD_BARRA_PRUEBA','PRY_TABLERO_PRUEBA','PRY_CURVA_META_PRUEBA','BFN_BARRAS_PRUEBA','CALOR_SEMANA_PRUEBA'];

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  loadFromServer=function(){}; apiList=function(){ return Promise.resolve({ ok:true, pedidos:[] }); };
  var cb=document.getElementById('carga-banner'); if(cb) cb.style.display='none';
  var n=0;
  /* Una venta: `bs` su total, `fecha` la entrega agendada, `reg` cuándo se cargó ('AAAA-MM-DD', a las 09:00 de Bolivia). */
  window.V=function(vend, fecha, bs, reg){ n++;
    var t=new Date(reg+'T09:00:00-04:00').getTime();
    return { id:'p'+n, oc:fecha.slice(5,7)+'-'+(100+n), nota:String(500+n), vendedor:vend, cliente:'CLIENTE '+n, celular:'70000000', zona:'Norte', direccion:'Calle Ejemplo 1',
      fecha:fecha, turno:'AM', productos:[{desc:'COLCHON SOFT',medida:'140x190',cant:1,precio:bs}], saldo:bs, acuenta:0, pagado:false, metodoPago:'', entregado:false, ts:t, rev:t, fotos:[] };
  };
  window.METAS=function(m){ return filaSistema(META_ID, 'x', JSON.stringify({ v:1, m:m })); };
  window.VD={ 'Maria Flores':[10000,15000], 'Mauricio Merida':[20000,0], 'Carola Chavez':[10000,12000] };
  window.FIX=function(){ n=0; return [
    /* octubre (para el MoM) */
    V('Maria Flores','2026-10-06',3000,'2026-10-05'), V('Carola Chavez','2026-10-15',4000,'2026-10-14'), V('Mauricio Merida','2026-10-07',5000,'2026-10-06'),
    /* noviembre */
    V('Maria Flores','2026-11-04',6000,'2026-11-03'), V('Maria Flores','2026-11-18',2000,'2026-11-10'), V('Maria Flores','2026-11-19',5000,'2026-11-14'),
    V('Mauricio Merida','2026-11-05',5000,'2026-11-04'), V('Mauricio Merida','2026-11-11',5000,'2026-11-09'), V('Mauricio Merida','2026-11-20',6000,'2026-11-13'),
    V('Carola Chavez','2026-11-06',4000,'2026-11-03'), V('Carola Chavez','2026-11-20',4000,'2026-11-11'),
    V('Isabel Robledo','2026-11-17',6000,'2026-11-13'), V('Isabel Robledo','2026-11-12',1000,'2026-11-10'),
    V('Jonathan Monje','2026-11-13',1000,'2026-11-11')
  ]; };
  window._txt=function(sel){ var e=typeof sel==='string' ? document.querySelector(sel) : sel; return e ? e.innerText.replace(/\s+/g,' ').trim() : ''; };
  window.PINTAR=function(conMetas, conVd){
    var m={ '2026-11':{ heaven:40000, suena:20000, t:1 } }; if(conVd!==false) m['2026-11'].vd=VD;
    STATE=FIX().concat(conMetas===false ? [] : [METAS(m)]);
    UNLOCKED=true; showView('conta'); segSet('cta-tab','proy'); setContaTab('proy');
    document.getElementById('pry-mes').value='2026-11'; renderProyeccion();
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  async function abrir(w, banderas){
    const ctx = await browser.newContext({ viewport:{ width:w||1366, height:900 }, timezoneId:'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r=>r.abort());
    const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.dismiss());
    await page.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(350);
    await page.evaluate(PREPARAR);
    if(banderas) await page.evaluate((bs)=>{ bs.forEach(function(b){ window[b]=1; }); }, banderas);
    page._ctx=ctx; return page;
  }
  const ev = async (page, fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,400) }; } };

  /* ── sin las banderas: como antes ── */
  console.log('\n── 0. Sin las banderas, todo como antes ──');
  let page = await abrir(1366);
  let r = await ev(page, () => { PINTAR(); return { m415:document.querySelectorAll('.m415, .m415-sin, .m415-ley').length, m416:!!document.getElementById('m416'),
      metricsVis:document.getElementById('pry-metrics').offsetHeight>0, m417:document.querySelectorAll('.m417-meta, .m417-est').length,
      m425:document.querySelectorAll('.m425-r').length, bfnR:document.querySelectorAll('#bfn-vend .bfn-r').length,
      m426:document.querySelectorAll('.m426-wk, .m426-h, #m426-s').length, hdr:document.querySelectorAll('#pcal .h').length }; });
  chk('0a. sin banderas no hay barras por vendedora, ni tablero, ni rayas de meta, ni barras de Black Friday, ni columna «Semana»',
      r.m415===0 && !r.m416 && r.metricsVis && r.m417===0 && r.m425===0 && r.bfnR>0 && r.m426===0 && r.hdr===7, r);
  await page._ctx.close();

  page = await abrir(1366, BANDERAS);

  /* ── 415 ── */
  console.log('\n── 415. Por vendedor: la barra hacia el presupuesto ──');
  r = await ev(page, () => {
    PINTAR();
    var R=proyeccionMes('2026-11'), filas={}; R.marcas.forEach(function(m){ m.filas.forEach(function(x){ filas[x.vendedor]=x; }); });
    var out={ ley:_txt('#pry-vendedores .m415-ley'), on:!!document.querySelector('#pry-vendedores .cua-box.m415-on'), filas:{} };
    [].forEach.call(document.querySelectorAll('#pry-vendedores .pry-fila'), function(f){
      var nom=(f.querySelector('.pry-q b')||{}).textContent; if(!nom || !filas[nom]) return;
      var b=f.querySelector('.m415'), s=f.querySelector('.m415-sin'), x=filas[nom];
      out.filas[nom]={ txt:_txt(f), cls:b ? b.className : '', t:b ? _txt(b) : '', sin:s ? _txt(s) : '', proy:x.proy, vendido:x.vendido,
        rayas:b ? b.querySelectorAll('u').length : 0, min:b ? !!b.querySelector('u.min') : false, wv:b ? (b.querySelector('i.v')||{}).style.width : '', wp:b ? (b.querySelector('i.p')||{}).style.width : '',
        orden:b ? (f.querySelector('.pry-q').compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) && (b.compareDocumentPosition(f.querySelector('.pry-n')) & Node.DOCUMENT_POSITION_FOLLOWING) : false };
    });
    return out;
  });
  const est=(p)=> p>=100 ? 'ok' : (p>=90 ? 'ce' : 'ma');
  const M=r.filas['Maria Flores']||{}, Mm=r.filas['Mauricio Merida']||{}, C=r.filas['Carola Chavez']||{}, I=r.filas['Isabel Robledo']||{};
  chk('415a. la leyenda arriba: vendido · si sigue así · la raya = su presupuesto · verde llega, ámbar cerca (90 %), rojo no llega',
      r.on && /vendido/.test(r.ley) && /si sigue así/.test(r.ley) && /la raya = su presupuesto \(la gris, la mínima\)/.test(r.ley) && /ámbar cerca \(90 %\)/.test(r.ley), r.ley);
  chk('415b. Maria: «N % de Bs 15.000 · mín. Bs 10.000» con su vendido, y el color por su proyección contra el presupuesto',
      M.t.indexOf(Math.round(M.vendido/15000*100)+' % de Bs 15.000 · mín. Bs 10.000')===0 && M.cls==='m415 '+est(M.proy/15000*100) &&
      M.t.indexOf('📈 '+Math.round(M.proy/15000*100)+' %')>0 && M.rayas===2 && M.min, M);
  chk('415c. Mauricio (sin presupuesto): la barra contra su mínima de Bs 20.000, sin la raya gris',
      Mm.t.indexOf(Math.round(Mm.vendido/20000*100)+' % de Bs 20.000')===0 && !/mín\./.test(Mm.t) && Mm.rayas===1 && Mm.cls==='m415 '+est(Mm.proy/20000*100), Mm);
  chk('415d. «llega ✅» si la proyección pasa el presupuesto, «si sigue así» si no', [M, Mm, C].every(function(x){ var p=x.proy/((x===Mm)?20000:(x===M?15000:12000))*100; return p>=100 ? /llega ✅/.test(x.t) : /si sigue así/.test(x.t); }), [M.t, Mm.t, C.t]);
  chk('415e. Isabel (sin meta guardada): «sin meta guardada», sin barra', I.sin==='sin meta guardada' && !I.cls, I);
  chk('415f. la barra va entre el nombre y la plata, y el renglón se sigue leyendo (nombre, plata, proyección)',
      M.orden && /^Maria Flores/.test(M.txt) && /Bs 13\.000,00/.test(M.txt) && /📈 Bs/.test(M.txt), M.txt);
  chk('415g. lo vendido pinta menos que lo proyectado (las dos con su ancho)', parseFloat(M.wv)>0 && parseFloat(M.wp)>=parseFloat(M.wv), [M.wv, M.wp]);
  r = await ev(page, async () => {
    var f=document.querySelector('#pry-vendedores .pry-fila.pry-toca[data-vk*="maria"]'); if(!f) return { sin:1 };
    f.querySelector('.m415-b').click(); await new Promise(function(res){ setTimeout(res, 50); });
    return { abre:f.classList.contains('pry-abre'), det:!!f.querySelector('.pry-mom-det') };
  });
  chk('415h. tocar la barra sigue abriendo la tablita del MoM', r.abre && r.det, r);
  r = await ev(page, () => { PINTAR(true, false); return { n:document.querySelectorAll('.m415, .m415-sin, .m415-ley').length }; });
  chk('415i. sin metas por vendedora guardadas para el mes, no hay barras (las sugeridas no se dibujan)', r.n===0, r);

  /* ── 416 ── */
  console.log('\n── 416. El tablero «¿Llegamos?» ──');
  r = await ev(page, () => {
    PINTAR();
    var R=proyeccionMes('2026-11'), E=R.equipo, meta=metaEquipo('2026-11'), t=document.getElementById('m416');
    return { hay:!!t, enNota:!!(t && t.parentNode && t.parentNode.id==='pry-nota'), metricsOculto:document.getElementById('pry-metrics').offsetHeight===0,
             metricsArmado:document.querySelectorAll('#pry-metrics .mc').length,
             t:document.querySelector('#m416 .m416-h').textContent.replace(/\s+/g,' '), fichas:[].map.call(document.querySelectorAll('#m416 .m416-f'), function(f){ return _txt(f); }),
             vend:fmtBs0(E.vendido), proy:fmtBs0(E.proy), meta:fmtBs0(meta), pp:Math.round(E.proy/meta*100), pv:Math.round(E.vendido/meta*100), dt:R.dt, tot:R.dt+R.dr, n:E.n,
             bar:!!document.querySelector('#m416 .m416-bar u'),
             heaven:Math.round(R.marcas.filter(function(m){ return m.g.k==='heaven'; })[0].tot.proy/40000*100) };
  });
  chk('416a. el tablero va debajo de los avisos y las fichas de siempre se siguen armando, escondidas', r.hay && r.enNota && r.metricsOculto && r.metricsArmado>=3, r);
  chk('416b. Vendido en noviembre → Si sigue así → Meta del equipo, con los números de la proyección', r.t.indexOf('Vendido en noviembre'+r.vend)>=0 && r.t.indexOf('📈 Si sigue así'+r.proy)>0 && r.t.indexOf('🎯 Meta del equipo'+r.meta)>0, r.t);
  chk('416c. «N ventas · … · N % de la meta», la pastilla «se proyecta el N %» y «N de M días hábiles»',
      r.t.indexOf(r.n+' ventas')>=0 && r.t.indexOf(r.pv+' % de la meta')>0 && r.t.indexOf('se proyecta el '+r.pp+' %')>0 && r.t.indexOf(r.dt+' de '+r.tot+' días hábiles')>0 && r.bar, r.t);
  chk('416d. una ficha chica por marca con su meta («92 % de su meta»)', r.fichas.length>=2 && r.fichas.some(function(f){ return /Heaven/.test(f) && f.indexOf(r.heaven+' % de su meta')>0; }), r.fichas);
  r = await ev(page, () => { PINTAR(false); return { hay:!!document.getElementById('m416'), vis:document.getElementById('pry-metrics').offsetHeight>0 }; });
  chk('416e. sin meta del equipo para el mes, las fichas de siempre', !r.hay && r.vis, r);

  /* ── 417 ── */
  console.log('\n── 417. La meta como una raya en cada curva ──');
  r = await ev(page, () => {
    PINTAR();
    var R=proyeccionMes('2026-11'), out={ marcas:{}, tiendas:{} };
    var cards=[].slice.call(document.querySelectorAll('#cx-pry .cx-kfs:not(.cx-kfs-t) .cx-kf'));
    cards.forEach(function(c){ var t=_txt(c.querySelector('.cx-kf-h b')); out.marcas[t]={ raya:!!c.querySelector('line.m417-meta'), lab:_txt(c.querySelector('.m417-ml')), est:_txt(c.querySelector('.m417-est')),
      punto:(c.querySelector('.cx-k-p + circle')||{getAttribute:function(){return '';}}).getAttribute('fill') }; });
    R.marcas.forEach(function(m){ out[m.g.lbl]=Math.round(m.tot.proy/metaDe('2026-11', m.g.k)*100); });
    var TD=pryTMetaDatos(R); TD.filas.forEach(function(e){ out.tiendas[e.k]={ meta:e.meta, pp:Math.round(e.pp||0) }; });
    [].forEach.call(document.querySelectorAll('#cx-pry .cx-kfs-t .cx-kf'), function(c){ var t=_txt(c.querySelector('.cx-kf-h b')).replace(/^🏬\s*/,''); if(out.tiendas[t]){ out.tiendas[t].lab=_txt(c.querySelector('.m417-ml')); out.tiendas[t].est=_txt(c.querySelector('.m417-est')); } });
    return out;
  });
  const He=r.marcas['💚 Heaven']||{}, Su=r.marcas['🛏️ Sueña']||{};
  chk('417a. Heaven: la raya punteada en su meta con «🎯 meta Bs 40.000» y la pastilla con el % de la meta', He.raya && He.lab==='🎯 meta Bs 40.000' &&
      He.est===(r.Heaven>=100 ? '✅ llega a la meta' : r.Heaven+' % de la meta'), [He, r.Heaven]);
  chk('417b. Sueña: «🎯 meta Bs 20.000» y su pastilla', Su.raya && Su.lab==='🎯 meta Bs 20.000' && Su.est===(r['Sueña']>=100 ? '✅ llega a la meta' : r['Sueña']+' % de la meta'), [Su, r['Sueña']]);
  chk('417c. el punto final se pinta por el estado (verde llega, ámbar cerca, rojo no)', [[He, r.Heaven], [Su, r['Sueña']]].every(function(x){ var p=x[1]; return x[0].punto===(p>=100 ? '#059669' : (p>=90 ? '#d97706' : '#dc2626')); }), [He.punto, Su.punto]);
  const Bz=r.tiendas['Tienda Banzer']||{};
  chk('417d. la tienda lleva la meta de «Cada tienda contra su meta» (Tienda Banzer = Bs 12.000)', Bz.meta===12000 && Bz.lab==='🎯 meta Bs 12.000' && /de la meta|llega a la meta/.test(Bz.est||''), Bz);

  /* ── 425 ── */
  console.log('\n── 425. Black Friday: dos barras ──');
  r = await ev(page, () => {
    PINTAR();
    var D=BFN, out={ ley:_txt('#bfn-marcas .m425-ley'), nm:document.querySelectorAll('#bfn-marcas .m425-r').length, nmD:D ? D.marcas.length : -1,
      nv:document.querySelectorAll('#bfn-vend .m425-r').length, nvD:D ? D.vend.length : -1, viejas:document.querySelectorAll('#bfn-marcas .bfn-r, #bfn-vend .bfn-r').length, filas:{} };
    [].forEach.call(document.querySelectorAll('#bfn-vend .m425-r'), function(f){ var nom=_txt(f.querySelector('.m425-n'));
      var v=D.vend.filter(function(x){ return x.v===nom; })[0];
      out.filas[nom]={ p:_txt(f.querySelector('.m425-p')), c:_txt(f.querySelector('.m425-t:not(.a)')), a:_txt(f.querySelector('.m425-t.a')),
        wc:parseFloat(f.querySelector('.m425-b.c').style.width.replace(/[^\d.]/g,'')), wa:parseFloat(f.querySelector('.m425-b.a').style.width.replace(/[^\d.]/g,'')),
        cbs:v && v.c.bs, abs:v && v.a.bs, cu:v && v.c.u, au:v && v.a.u };
    });
    return out;
  });
  chk('425a. por marca y por vendedor, una fila con dos barras por cada una (las de bfnDatos) y la leyenda', r.nm===r.nmD && r.nv===r.nvD && r.nv>=4 && r.viejas===0 && /campaña \(desde el vie 13\/11\)/.test(r.ley) && /los mismos días hábiles de antes/.test(r.ley), r);
  const pill=(c,a)=>{ if(!(a>0.009)) return c>0.009 ? 'nuevo' : '—'; if(c/a>=5) return '↑ '+Math.round(c/a)+' veces'; const q=Math.round((c-a)/a*100); return (q>0?'+':(q<0?'−':''))+Math.abs(q)+' %'; };
  chk('425b. cada pastilla: «+N %», «−N %», «nuevo» o «↑ N veces»', Object.keys(r.filas).every(function(k){ var f=r.filas[k]; return f.p===pill(f.cbs, f.abs); }) &&
      Object.keys(r.filas).some(function(k){ return /veces/.test(r.filas[k].p); }) && Object.keys(r.filas).some(function(k){ return r.filas[k].p==='nuevo'; }), r.filas);
  chk('425c. al final de cada barra, el monto y las unidades («antes Bs …» en la gris)', Object.keys(r.filas).every(function(k){ var f=r.filas[k];
      return f.c.indexOf('Bs '+Math.round(f.cbs).toLocaleString('es-BO')+' · '+f.cu+' u.')===0 && f.a.indexOf('antes Bs '+Math.round(f.abs).toLocaleString('es-BO'))===0; }), r.filas);
  chk('425d. una escala por sección: la barra más larga es la del monto más grande', (function(){ var ks=Object.keys(r.filas), top=0, wTop=0;
      ks.forEach(function(k){ var f=r.filas[k]; if(f.cbs>top){ top=f.cbs; wTop=f.wc; } if(f.abs>top){ top=f.abs; wTop=f.wa; } });
      return ks.every(function(k){ return r.filas[k].wc<=wTop+0.01 && r.filas[k].wa<=wTop+0.01; }) && Math.abs(wTop-78)<0.01; })(), r.filas);

  /* ── 426 ── */
  console.log('\n── 426. El calendario con el total de cada semana ──');
  r = await ev(page, () => {
    PINTAR();
    var G=document.getElementById('pcal'), C=PRY_CALOR, D=C.v, out={ hdr:[].map.call(G.querySelectorAll('.h'), function(h){ return h.textContent; }), sem:[], esp:[] };
    [].forEach.call(G.querySelectorAll('.m426-wk'), function(w){ out.sem.push({ t:_txt(w), top:w.classList.contains('top'), vac:w.classList.contains('vac') }); });
    // lo esperado: noviembre 2026 empieza en domingo → semana 0 = el 1; semana 1 = del 2 al 8; …
    var sumas=[0,0,0,0,0,0]; for(var d=1; d<=30; d++){ var f='2026-11-'+(d<10?'0':'')+d, w=Math.floor((6+d-1)/7); sumas[w]+=(D[f]||0); }
    out.esp=sumas; out.lado=_txt('#m426-s');
    out.lugar=G.querySelectorAll(':scope > *').length;   // 8 títulos + 6 semanas × 8 (el 1 es domingo y el 30, lunes)
    pryCalorQ('e'); out.ent=[].map.call(G.querySelectorAll('.m426-wk:not(.vac)'), function(w){ return _txt(w); }); out.ladoE=_txt('#m426-s');
    pryCalorQ('v');
    return out;
  });
  const corto=v=> v>=1000 ? (Math.round(v/1000)+' mil') : String(Math.round(v));
  chk('426a. la grilla pasa a 8 columnas: los 7 días y «Semana»', JSON.stringify(r.hdr)===JSON.stringify(['lun','mar','mié','jue','vie','sáb','dom','Semana']) && r.lugar===8+6*8, [r.hdr, r.lugar]);
  chk('426b. el total de cada semana es la suma de sus días (lo que pinta el calendario)', r.sem.length===6 && r.sem.every(function(s, i){ return r.esp[i]>0 ? (s.t.indexOf(corto(r.esp[i]))===0 && !s.vac) : s.vac; }), [r.sem, r.esp]);
  const mx=Math.max.apply(null, r.esp), iTop=r.esp.indexOf(mx);
  chk('426c. la mejor semana, resaltada, y en «Lo que dice el calendario» con su total', r.sem[iTop] && r.sem[iTop].top && r.sem.filter(function(s){ return s.top; }).length===1 &&
      r.lado.indexOf('🏆 La mejor semana Bs '+Math.round(mx).toLocaleString('es-BO'))>=0, [r.sem, r.lado]);
  chk('426d. el mejor día y el promedio por día hábil hasta ayer', /⭐ El mejor día Bs [\d.]+/.test(r.lado) && /📊 Promedio por día hábil Bs [\d.]+ \d+ días hábiles hasta ayer · Bs [\d.]+ en total/.test(r.lado), r.lado);
  chk('426e. con «Entregas» cuenta pedidos («N pedidos») y el promedio del mes', r.ent.length>0 && r.ent.every(function(t){ return /^\d+ pedidos? /.test(t) && /con entregas/.test(t); }) && /días hábiles del mes/.test(r.ladoE), [r.ent, r.ladoE]);

  /* ── iPad parado ── */
  await page._ctx.close();
  console.log('\n── 820. En el iPad parado ──');
  page = await abrir(820, BANDERAS);
  r = await ev(page, () => {
    PINTAR();
    var f=document.querySelector('#pry-vendedores .pry-fila.pry-toca[data-vk*="maria"]'), b=f && f.querySelector('.m415'), q=f && f.querySelector('.pry-q');
    var rb=b.getBoundingClientRect(), rq=q.getBoundingClientRect(), rf=f.getBoundingClientRect();
    return { abajo:rb.top>=rq.bottom-1, ancho:rb.width/rf.width, scroll:document.documentElement.scrollWidth>document.documentElement.clientWidth,
             tab:getComputedStyle(document.querySelector('#m416 .m416-t')).gridTemplateColumns.split(' ').length };
  });
  chk('820a. en el iPad la barra baja a su propio renglón, a lo ancho, sin scroll de costado', r.abajo && r.ancho>0.85 && !r.scroll, r);
  chk('820b. el tablero en tres columnas (sin las flechas)', r.tab===3, r);
  await page._ctx.close();

  chk('sin errores de la página', errores.length===0, errores);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL ? 1 : 0);
})();
