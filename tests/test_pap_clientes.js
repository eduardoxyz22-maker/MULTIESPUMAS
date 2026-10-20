/* 👥 «QUÉ VA A DÓNDE»: PARA CLIENTES DE CADA TIENDA, LAS TIENDAS EN 0 CON EL PORQUÉ Y UN REPARTO QUE NO ACHICA (20/10; dueño, con la captura
   de 7 días: *«no te faltó Mia Plaza?»* y *«no aparece ni en 7 ni en 15 ni en 30?»*). Mia Plaza vende casi todo con entrega a domicilio:
   eso sale de PTF y Banzer y en la columna de su local quedaba en 0, sin decir nada.

   PC1  Lo de PTF y Banzer se reparte «para clientes de» la tienda de quien vendió (Mirian/Isabel → Mia Plaza, Carola → Central, Eduardo,
        ROHO → Tiendas Roho, ALBA → «Pedidos internos»), con lo vendido sin entregar; suma EXACTO lo de PTF y lo de Banzer en cada plazo.
   PC2  No cambia ningún número: PTF, Banzer, tiendas y el total son los de antes.
   PC3  Una tienda sin nada para su local aparece igual, con «0», el porqué y lo de sus clientes; la que más clientes tiene, primero.
   PC4  La pantalla: «👥 PTF y Banzer · para clientes de cada tienda» con sus fichas, la línea en la lista de PTF y en el detalle de un producto;
        en el celular (390 px) nada se sale.
   PC5  Las copias: «Para clientes de:» en PTF y Banzer, y «NADA PARA SU LOCAL EN ESTE PLAZO».
   PC6  El reparto entre tiendas no achica al alargar el plazo (de a una unidad, Sainte-Laguë): con pesos 1/3/3 el resto mayor daba 1/1/1 con 3
        y 0/2/2 con 4.
   PC7  Una RPT pendiente cargada hace 31 a 90 días se cuenta UNA vez en los pesos de 90 días (antes, dos).

   Reloj CLAVADO (martes 20/10, 10:30 de Bolivia). Red cortada, datos sintéticos (el repo es público).
   Se corre:  node tests/test_pap_clientes.js
   Dientes:   PEDIDOS=/ruta/a/pedidos_b42198c.html node tests/test_pap_clientes.js   (rojas PC1, PC3-PC7) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,700)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_textos.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));
const ERRS=[];

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{ width:1300, height:900 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage(); page.setDefaultTimeout(30000);
  page.on('pageerror', e => ERRS.push(e.message)); page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-20T10:30:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');

  /* El escenario (todo en 0 en PTF, Banzer y Moreno):
     · TITANIO ICE 160 (Heaven): 8 entregas a clientes en la semana → rota. 4 de Mirian Salazar y 1 de Isabel Robledo (Mia Plaza),
       2 de Carola Chavez (Central), 1 de ALBA (interno); de los dos lados de la línea. Y 2 vendidos sin entregar: uno de Isabel y uno de
       Eduardo. Ninguna venta de tienda: lo de Mia Plaza va TODO por PTF y Banzer.
     · COLCHON SOFT 140 (Sueña): venta de tienda en Charcas (6) → a Charcas.
     · COLCHON SOFT 160 (Sueña): una RPT a Carmelo que sale pasado mañana (3 u) → a Carmelo.
     · ALMOHADA FIBRA SILICONADA 50x90: una RPT a Carmelo cargada hace 40 días que sale pasado mañana (6 u). En almohadas la RPT es la
       venta: está en los 90 días Y pendiente → en los pesos de 90 días tiene que contar UNA vez (antes, 12). */
  const K = await page.evaluate(async () => {
    var k={ ti:_k('CH1201','TITANIO ICE','160x190'), s140:_k('COLT0048','COLCHON SOFT','140x190'), s160:_k('COLT0060','COLCHON SOFT','160x190'), alm:_k('CD1459','ALMOHADA FIBRA SILICONADA','50x90') };
    window._K=k;
    var OESTE='https://www.google.com/maps?q=-17.7200,-63.1900', ESTE='https://www.google.com/maps?q=-17.7600,-63.1000';
    var cli=function(id, dias, vend, lado){ return _ped({ id:id, fecha:_d(-dias), entregado:true, vendedor:vend, maps:lado, productos:[_lin('CH1201','TITANIO ICE','160x190', 1)] }); };
    var tienda=function(id, dias){ return _ped({ id:id, fecha:'', turno:'', direccion:DIR_TIENDA+' · Charcas', zona:ZONA_TIENDA, vendedor:'Fernando Peinado',
      cliente:'CLIENTE TIENDA', ts:_ts(_d(-dias), '11:00:00'), productos:[_lin('COLT0048','COLCHON SOFT','140x190', 2)] }); };
    window._P0=[
      cli('m1', 1, 'Mirian Salazar', OESTE), cli('m2', 2, 'Mirian Salazar', ESTE), cli('m3', 3, 'Mirian Salazar', OESTE), cli('m4', 4, 'Mirian Salazar', OESTE),
      cli('i1', 5, 'Isabel Robledo', ESTE), cli('c1', 2, 'Carola Chavez', ESTE), cli('c2', 6, 'Carola Chavez', OESTE), cli('a1', 3, 'ALBA', OESTE),
      _ped({ id:'ip', fecha:_d(2), vendedor:'Isabel Robledo', maps:OESTE, productos:[_lin('CH1201','TITANIO ICE','160x190', 1)] }),
      _ped({ id:'ep', fecha:_d(3), vendedor:'Eduardo Añez', cliente:'CLIENTE EDU', maps:ESTE, productos:[_lin('CH1201','TITANIO ICE','160x190', 1)] }),
      tienda('t1', 2), tienda('t2', 5), tienda('t3', 8),
      _ped({ id:'rp1', oc:'RPT 09-001', fecha:_d(2), cliente:'Carmelo', vendedor:'Juan Pablo Paredes', ts:_ts(_d(-1), '08:00:00'), productos:[_lin('COLT0060','COLCHON SOFT','160x190', 3)] }),
      _ped({ id:'rp2', oc:'RPT 09-002', fecha:_d(2), cliente:'Carmelo', vendedor:'Juan Pablo Paredes', ts:_ts(_d(-40), '08:00:00'), productos:[_lin('CD1459','ALMOHADA FIBRA SILICONADA','50x90', 6)] })
    ];
    window._ST0=function(){ return _stock(function(st){ [k.ti, k.s140, k.s160, k.alm].forEach(function(x){ st.c.u[x]=0; st.g[_BZ].u[x]=0; st.g[_IM].u[x]=0; }); }); };
    await _cargar(_P0, _ST0());
    return k;
  });

  const abrir = async () => {
    await page.evaluate(() => { abrirStock(); });
    await page.waitForTimeout(300);
    await page.evaluate(() => { PAP=null; abrirPap(); });
    await page.waitForFunction(() => window.PAP && PAP.listo, null, { timeout:20000 }).catch(()=>{});
  };
  await abrir();

  // ═══ PC1. Para clientes de ═══
  console.log('\n── PC1. Lo de PTF y Banzer, por la tienda de quien vendió ──');
  let r = await page.evaluate(() => {
    if(!(window.PAP && PAP.listo)) return null;
    var out={};
    PAP_H.forEach(function(h){
      var L=papLugares(h), sP=0, sB=0, cl={};
      (L.clientes||[]).forEach(function(x){ sP+=x.P; sB+=x.B; cl[x.nom]=x.n; });
      out[h]={ P:L.P.n, B:L.B.n, sP:sP, sB:sB, cl:cl, hay:!!L.clientes };
    });
    var f=null; PAP.TODAS.forEach(function(x){ if(x.k===_K.ti) f=x; });
    out.ti=f && { sem:f.sem, CP:f.rep.sem.CP, CB:f.rep.sem.CB, P:f.rep.sem.P, B:f.rep.sem.B };
    out.nombres=[['Mirian Salazar'],['Isabel Robledo'],['Carola Chavez'],['Eduardo Añez'],['ROHO'],['ALBA'],['Jhon Nadie Perez']].map(function(v){
      return typeof producirTiendaCliente==='function' ? producirTiendaCliente({ vendedor:v[0] }) : null; });
    return out;
  });
  chk('PC1a la ventana abrió con la cuenta lista', !!r, r);
  if(r){
    chk('PC1b cada plazo: los clientes suman EXACTO lo de PTF y lo de Banzer', PAP_H_OK(r) , r);
    chk('PC1c el TITANIO ICE 160 de PTF y Banzer queda casi todo para clientes de Mia Plaza (Mirian + Isabel: 6 de 10), después Central',
      r.ti && r.sem.hay && r.sem.cl['Mia Plaza']>0 && r.sem.cl['Mia Plaza']>=(r.sem.cl['Central']||0) && Object.keys(r.sem.cl).indexOf('Mia Plaza')>=0, { ti:r.ti, cl:r.sem.cl });
    chk('PC1d quién es quién: Mirian e Isabel → Mia Plaza, Carola → Central, Eduardo, ROHO → Tiendas Roho, ALBA → Pedidos internos, otro → su nombre',
      JSON.stringify(r.nombres)===JSON.stringify(['Mia Plaza','Mia Plaza','Central','Eduardo','Tiendas Roho','Pedidos internos','Jhon Nadie']), r.nombres);
    chk('PC1e lo vendido sin entregar también cuenta: Eduardo (un pendiente) aparece entre los clientes en todo noviembre', r.tot.hay && (r.tot.cl['Eduardo']||0)>0, r.tot.cl);
    chk('PC1f el pedido interno (ALBA) va como «Pedidos internos», no con su nombre', r.tot.hay && !r.tot.cl['ALBA'], r.tot.cl);
  }
  function PAP_H_OK(x){ return ['sem','quin','d30','tot'].every(function(h){ var o=x[h]; return o && o.hay && o.sP===o.P && o.sB===o.B; }); }

  // ═══ PC2. No cambia ningún número ═══
  console.log('\n── PC2. Ningún número cambia ──');
  r = await page.evaluate(() => {
    var R=stockProducirCalc(stockData()), out={ ok:true, det:[] };
    PAP_H.forEach(function(h){
      var tot=0; R.bloques.forEach(function(B){ B.filas.forEach(function(f){ tot+=f[h]||0; }); });
      var L=papLugares(h); if(L.total!==tot || L.P.n+L.B.n+L.T.n!==tot){ out.ok=false; }
      out.det.push([h, tot, L.total, L.P.n, L.B.n, L.T.n]);
    });
    var bad=[]; PAP.TODAS.forEach(function(f){ PAP_H.forEach(function(h){ var r=f.rep[h], s=r.P+r.B; Object.keys(r.T||{}).forEach(function(t){ s+=r.T[t]; }); if(s!==f[h]) bad.push([f.k, h, s, f[h]]); }); });
    out.bad=bad; out.interruptor=STOCK_SIN_TIENDAS;
    return out;
  });
  chk('PC2a el total de cada plazo = «Qué producir», y PTF + Banzer + tiendas = el total', r.ok, r.det);
  chk('PC2b cada producto: PTF + Banzer + tiendas = lo que se pide', r.bad.length===0, r.bad.slice(0,3));
  chk('PC2c el interruptor «sin tiendas» quedó apagado', r.interruptor===false, r.interruptor);

  // ═══ PC3. Las tiendas en 0 ═══
  console.log('\n── PC3. Las tiendas sin nada para su local, con el porqué ──');
  r = await page.evaluate(() => {
    var L=papLugares('sem');
    return { ceros:L.ceros||null, tiendas:L.tiendas.map(function(t){ return t.nom+' '+t.n; }) };
  });
  var mia = r.ceros && r.ceros.filter(function(z){ return z.nom==='Mia Plaza'; })[0];
  chk('PC3a Mia Plaza (sin venta de tienda) aparece entre las que no reciben nada para su local', !!mia, r);
  chk('PC3b dice el porqué (su local no vendió nada que se fabrique) y lo de sus clientes («sus clientes: N, salen de PTF o Banzer»)',
    mia && /no vendió nada que se fabrique/.test(mia.porque) && /sus clientes: \d+, salen de PTF o Banzer/.test(mia.clientes) && mia.cli>0, mia);
  chk('PC3c están las siete tiendas: las que reciben algo + las de 0 (Charcas recibe; Tiendas Roho, Central… en 0)',
    r.ceros && r.ceros.length+r.tiendas.length===7 && r.tiendas.some(function(t){ return /^Charcas /.test(t); }), r);
  chk('PC3d la que más clientes tiene, primero (Mia Plaza antes que las que no tienen)', r.ceros && r.ceros[0] && r.ceros[0].nom==='Mia Plaza', r.ceros && r.ceros.map(function(z){ return z.nom+':'+z.cli; }));

  // ═══ PC4. La pantalla ═══
  console.log('\n── PC4. La pantalla ──');
  r = await page.evaluate(async () => {
    PAP_S=papEstadoNuevo(); PAP_S.tab='donde'; PAP_S.plazo='sem'; papPintar();
    await new Promise(function(res){ setTimeout(res, 60); });
    var cli=document.querySelector('#pap-donde .pap-cli'), ce=document.querySelector('#pap-donde .pap-ceros');
    var fichas=cli ? [].map.call(cli.querySelectorAll('.pap-cl'), function(x){ return _txt(x).trim(); }) : [];
    var ceros=ce ? [].map.call(ce.querySelectorAll('li'), function(x){ return _txt(x).trim(); }) : [];
    var b=document.querySelector('#pap-donde [data-pap-lugar="P"]'); if(b) b.click();
    await new Promise(function(res){ setTimeout(res, 60); });
    var ld=document.querySelector('#pap-lugar-det .pap-ldcli');
    PAP_S.tab='pedir'; papPintar();
    var fb=null; document.querySelectorAll('#pap-pedir [data-pap-fila]').forEach(function(x){ if(x.getAttribute('data-pap-fila').indexOf(_K.ti)>=0) fb=x; });
    if(fb) fb.click();
    await new Promise(function(res){ setTimeout(res, 60); });
    var det=document.querySelector('#pap-pedir .pap-det');
    var como=_txt(document.getElementById('pap-como-donde'));
    return { tit:cli?_txt(cli.querySelector('.pap-eti')):'', fichas:fichas, nota:cli?_txt(cli.querySelector('.pap-cli-nota')):'', ceros:ceros,
             ld:ld?_txt(ld):'', det:det?_txt(det):'' };
  });
  chk('PC4a «👥 PTF y Banzer · para clientes de cada tienda» con una ficha por tienda y su número (Mia Plaza la primera)',
    /para clientes de cada tienda/i.test(r.tit) && r.fichas.length>=2 && /^Mia Plaza ?\d+$/.test(r.fichas[0]), r);
  chk('PC4b la nota dice que ya están adentro de PTF y Banzer y que no van a la tienda', /adentro de PTF y Banzer/.test(r.nota) && /no van a la tienda/.test(r.nota), r.nota);
  chk('PC4c Mia Plaza en 0 se ve con su porqué y sus clientes', r.ceros.some(function(t){ return /^Mia Plaza ?0/.test(t) && /Sus clientes: \d+, salen de PTF o Banzer/.test(t); }), r.ceros);
  chk('PC4d la lista de PTF arranca con «👥 Para clientes de: …»', /Para clientes de: .*\d/.test(r.ld), r.ld);
  chk('PC4e el detalle de un producto dice «PTF y Banzer, para clientes de» con 👥 Mia Plaza', /PTF y Banzer, para clientes de/.test(r.det) && /👥 Mia Plaza \d/.test(r.det), r.det);
  await page.setViewportSize({ width:390, height:844 });
  r = await page.evaluate(async () => {
    PAP_S=papEstadoNuevo(); PAP_S.tab='donde'; PAP_S.plazo='tot'; papPintar();
    await new Promise(function(res){ setTimeout(res, 80); });
    var sc=document.getElementById('pap-cuerpo'), fuera=[];
    document.querySelectorAll('#pap-donde .pap-cli *, #pap-donde .pap-ceros *').forEach(function(e){ var b=e.getBoundingClientRect(); if(b.width && (b.right>innerWidth+0.5 || b.left<-0.5)) fuera.push(e.className||e.tagName); });
    return { sw:sc.scrollWidth, cw:sc.clientWidth, doc:document.documentElement.scrollWidth, fuera:fuera.slice(0,5) };
  });
  chk('PC4f en el celular (390 px) nada se sale de la pantalla', r.sw<=r.cw && r.doc<=390 && !r.fuera.length, r);
  await page.setViewportSize({ width:1300, height:900 });

  // ═══ PC5. Las copias ═══
  console.log('\n── PC5. Las copias ──');
  r = await page.evaluate(() => ({ todo:papTextoTodo('sem'), ptf:papTextoLugar('P','sem'), bz:papTextoLugar('B','sem') }));
  chk('PC5a «Copiar todo el reparto»: PTF y BANZER con «Para clientes de: …»', /\nPTF \(\d+\):\nPara clientes de: /.test(r.todo) && /\nBANZER \(\d+\):\nPara clientes de: /.test(r.todo), r.todo);
  chk('PC5b …y «NADA PARA SU LOCAL EN ESTE PLAZO» con Mia Plaza, su porqué y sus clientes', /NADA PARA SU LOCAL EN ESTE PLAZO:\n• Mia Plaza: .+\(sus clientes: \d+, salen de PTF o Banzer\)/.test(r.todo), r.todo);
  chk('PC5c «Copiar lo de PTF» y «lo de Banzer» también dicen para clientes de quién', /Para clientes de: /.test(r.ptf) && /Para clientes de: /.test(r.bz), [r.ptf.slice(0,300), r.bz.slice(0,300)]);

  // ═══ PC6. El reparto no achica ═══
  console.log('\n── PC6. Un plazo más largo nunca le da menos a una tienda ──');
  r = await page.evaluate(() => {
    if(typeof producirRepartirParejo!=='function') return { falta:true };
    var W={ A:1, B:3, C:3 }, seq=[], mono=true, suma=true, prev=null;
    for(var n=1;n<=40;n++){ var x=producirRepartirParejo(n, W), s=0; ['A','B','C'].forEach(function(t){ s+=x[t]||0; if(prev && (x[t]||0)<(prev[t]||0)) mono=false; }); if(s!==n) suma=false; if(n<=5) seq.push([n, x.A||0, x.B||0, x.C||0]); prev=x; }
    var lr3=producirRepartir(3, W), lr4=producirRepartir(4, W);
    var cero=producirRepartirParejo(5, { A:0, B:2 });
    var mal=[]; PAP.TODAS.forEach(function(f){ var p=null; PAP_H.forEach(function(h){ var T=f.rep[h].T||{}; if(p) Object.keys(p).forEach(function(t){ if((T[t]||0)<p[t]) mal.push([f.k, t, h]); }); p=T; }); });
    var prop=producirRepartirParejo(12, { Charcas:8, Mutualista:4 });
    return { seq:seq, mono:mono, suma:suma, lr:[lr3, lr4], cero:cero, mal:mal, prop:prop };
  });
  chk('PC6a existe el reparto de a una unidad', !r.falta, r);
  if(!r.falta){
    chk('PC6b con pesos 1/3/3, de 1 a 40 unidades: siempre suma exacto y nadie baja al subir', r.mono && r.suma, r.seq);
    chk('PC6c (lo que pasaba: el resto mayor da 1/1/1 con 3 y 0/2/2 con 4)', (r.lr[0].A||0)===1 && (r.lr[1].A||0)===0, r.lr);
    chk('PC6d un peso 0 no recibe nada; con 8 y 4, 12 se reparten 8 y 4', !r.cero.A && r.cero.B===5 && r.prop.Charcas===8 && r.prop.Mutualista===4, [r.cero, r.prop]);
    chk('PC6e en la ventana: ninguna tienda recibe menos en 15 días que en 7, en 30 que en 15, ni en todo el mes que en 30', r.mal.length===0, r.mal.slice(0,4));
  }

  // ═══ PC7. La RPT pendiente vieja, una vez ═══
  console.log('\n── PC7. Una RPT de almohadas pendiente, de hace 40 días, se cuenta una vez ──');
  r = await page.evaluate(() => {
    var D=STOCK_TP && STOCK_TP.D; if(!D) return null;
    return { t90:(D.T90[_K.alm]||{}).Carmelo, t30:(D.T[_K.alm]||{}).Carmelo };
  });
  chk('PC7a pesos de 90 días: Carmelo 6 (la RPT de 6 almohadas, una vez; antes, 12)', r && r.t90===6, r);
  chk('PC7b pesos de 30 días: Carmelo 6 (está pendiente: va a su tienda)', r && r.t30===6, r);

  chk('Sin errores de la página', ERRS.length===0, ERRS.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
