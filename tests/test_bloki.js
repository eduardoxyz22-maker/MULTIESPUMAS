/* 🧽 BLOKI, EL ASISTENTE (15/10). El dueño mandó su dibujo: «Bloki, el asistente de Multiespumas · un bloque de espuma con la franja
   turquesa del colchón. Cambia de traje según quién usa el panel» — Bloki (el de todos y Administración), Vendedor (tablita y gorra),
   Logística (casco, chaleco y camión), Contabilidad (anteojos y calculadora) y Anuncio (megáfono, gritando) — y cinco capturas del panel
   con Bloki en la esquina, en la ventana («Soy Bloki, tu asistente del panel») y con el megáfono en el globo del anuncio.

   ⚠️ LO QUE ESTA PRUEBA CUIDA (falla contra lo publicado, `15eb607`, que tiene la foto 3D de Eduardo):
   1. Los cinco trajes son SVG que se leen bien, cada uno con lo suyo (chispa, gorra y tablita, casco, chaleco y camión, anteojos y
      calculadora, megáfono y cejas de enojo).
   2. El traje sale de la PESTAÑA, para todos (27/10 a la noche, dueño: «Según pestaña, todos»): Nuevo pedido y Mis pedidos → vendedor,
      Contabilidad → contabilidad, Administración → logística; en ATC, Bot y Chofer, de QUIÉN eligió ser («¿Quién está usando el panel?»):
      vendedor/a, logística, contabilidad (botón nuevo); Administración o nadie → Bloki.
   3. La figura de la esquina, la cabecera de la ventana y «¿Quién está usando…?» llevan a Bloki; la ventana dice «Soy Bloki».
   4. Con el globo del anuncio, Bloki se pone el megáfono; cuando el globo se va, vuelve a su traje.
   5. El grito del anuncio (pantalla entera) es Bloki con su megáfono.
   6. El Eduardo de verdad (el vendedor) sigue siendo Eduardo: «preguntale a Eduardo por WhatsApp».
   Datos SINTÉTICOS. Se corre:  node tests/test_bloki.js   (desde la raíz del repo; PEDIDOS=<otro html> para los dientes) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const page = await browser.newPage({ viewport:{ width:1280, height:860 }, timezoneId:'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.addInitScript(() => { window.ASIS_PRUEBA=1; window.QUIEN_PRUEBA=1; try{ localStorage.clear(); sessionStorage.clear(); }catch(e){} });
  await page.clock.setFixedTime(new Date('2026-10-15T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(1500);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  await ev(() => { CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR=''; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    loadFromServer=function(){}; apiList=function(){ return Promise.resolve({ ok:true, pedidos:[] }); }; STATE=[];
    try{ quienCerrar(); }catch(e){} });

  console.log('\n── 1. Los cinco trajes ──');
  /* el reloj de la prueba cae en octubre (Halloween, §7): los trajes de siempre se miran con el tema de todo el año */
  const ponerTema = (t) => ev((t) => { var h=document.documentElement; h.className=h.className.replace(/(^|\s)tema-[a-z-]+/g,' ')+' tema-'+t; BLOKI_SRC={}; }, t);
  await ponerTema('espuma');
  let r = await ev(() => {
    if(typeof blokiSvg!=='function') return { no:1 };
    var o={};
    Object.keys(BLOKI_TRAJES).forEach(function(t){
      var svg=blokiSvg(t), d=new DOMParser().parseFromString(svg, 'image/svg+xml');
      o[t]={ ok:!d.querySelector('parsererror') && d.documentElement.nodeName==='svg', traje:d.documentElement.getAttribute('data-traje'),
        franja:svg.indexOf('#1aafa4')>=0, costura:/stroke-dasharray="7 6"/.test(svg), chispa:/class="bk-chispa"/.test(svg), mega:/class="bk-mega"/.test(svg),
        casco:/#facc15/.test(svg) && /#f97316/.test(svg), anteojos:/r="14"/.test(svg), tablita:/#9aa5ad/.test(svg), calc:/#2f3a40/.test(svg),
        cejas:/M90 95 L111 102/.test(svg), src:/^data:image\/svg\+xml/.test(blokiSrc(t)) };
    });
    return o;
  });
  chk('hay Bloki (blokiSvg) y los cinco trajes: Bloki, Vendedor, Logística, Contabilidad y Anuncio', r && !r.no && ['bloki','vendedor','logistica','conta','anuncio'].every(function(t){ return r[t] && r[t].ok && r[t].traje===t && r[t].src; }), r);
  chk('todos con la franja turquesa y su costura blanca', r && !r.no && Object.keys(r).every(function(t){ return r[t].franja && r[t].costura; }), r);
  chk('cada uno con lo suyo: chispa · gorra y tablita · casco y chaleco · anteojos y calculadora · megáfono y cejas de enojo',
      r && !r.no && r.bloki.chispa && r.vendedor.tablita && r.logistica.casco && r.conta.anteojos && r.conta.calc && r.anuncio.mega && r.anuncio.cejas &&
      !r.bloki.mega && !r.vendedor.casco && !r.conta.tablita, r);

  console.log('\n── 2. El traje según quién usa el panel ──');
  r = await ev(async () => {
    if(typeof blokiTraje!=='function') return { no:1 };
    var espera=function(ms){ return new Promise(function(ok){ setTimeout(ok, ms); }); };
    var fig=function(){ var i=document.querySelector('#asis-yo img'); return i ? i.getAttribute('data-traje') : null; };
    var o={};
    setVendedorMem(''); quienRol(''); var mv=document.getElementById('mis-vendedor'); if(mv) mv.value='';
    showView('form'); await espera(50); o.nadieForm=[blokiTraje(), fig()];
    showView('conta'); await espera(50); o.nadieConta=[blokiTraje(), fig()];
    showView('atc'); await espera(50); o.nadieAtc=[blokiTraje(), fig()];
    showView('mis'); await espera(50); o.nadieMis=[blokiTraje(), fig()];
    quienAbrir(true); var q=document.getElementById('quien');
    o.botonConta=!!(q && [].some.call(q.querySelectorAll('.quien-otros button'), function(b){ return /Contabilidad/.test(b.textContent); }));
    o.quienBloki=!!(q && q.querySelector('.quien-h img') && /^data:image\/svg/.test(q.querySelector('.quien-h img').getAttribute('src')));
    quienElegir('', 'conta'); showView('atc'); await espera(50); o.conta=[blokiTraje(), fig()];
    showView('admin'); await espera(50); o.contaAdm=[blokiTraje(), fig()];
    quienAbrir(false); o.sigoConta=/Sigo en Contabilidad/.test((document.getElementById('quien')||{}).textContent||''); quienCerrar();
    quienElegir('', 'logistica'); showView('atc'); await espera(50); o.logistica=[blokiTraje(), fig()];
    showView('form'); await espera(50); o.logForm=[blokiTraje(), fig()];
    quienElegir('', 'admin'); o.admin={};
    var vs=['form','mis','conta','admin','atc'];
    for(var i=0;i<vs.length;i++){ showView(vs[i]); await espera(50); o.admin[vs[i]]=[blokiTraje(), fig()]+''; }
    quienElegir('Mirian Salazar'); showView('atc'); await espera(50); o.vendedora=[blokiTraje(), fig()];
    showView('conta'); await espera(50); o.vendConta=[blokiTraje(), fig()];
    showView('admin'); await espera(50); o.vendAdm=[blokiTraje(), fig()];
    return o;
  });
  chk('sin elegir: Nuevo pedido y Mis pedidos → vendedor; Contabilidad → contabilidad; ATC → Bloki (la figura de la esquina cambia)',
      r && !r.no && r.nadieForm+''==='vendedor,vendedor' && r.nadieMis+''==='vendedor,vendedor' && r.nadieConta+''==='conta,conta' && r.nadieAtc+''==='bloki,bloki', r);
  chk('«¿Quién está usando el panel?» tiene a Bloki arriba y el botón «🧾 Contabilidad»', r && r.botonConta && r.quienBloki, r);
  /* (27/10 a la noche, dueño: «Según pestaña, todos») la pestaña manda para todos; quien eligió ser decide solo en ATC, Bot y Chofer. */
  chk('Contabilidad → anteojos en ATC (una pestaña sin traje propio), casco en Administración; y «Sigo en Contabilidad» la próxima vez', r && r.conta+''==='conta,conta' && r.contaAdm+''==='logistica,logistica' && r.sigoConta, r);
  chk('Logística → casco en ATC; en Nuevo pedido, la gorra de la pestaña', r && r.logistica+''==='logistica,logistica' && r.logForm+''==='vendedor,vendedor', r);
  chk('Administración → según la pestaña: pedido y Mis pedidos de vendedor, Contabilidad de contador, Administración con casco, lo demás Bloki',
    r && r.admin && r.admin.form==='vendedor,vendedor' && r.admin.mis==='vendedor,vendedor' && r.admin.conta==='conta,conta'
      && r.admin.admin==='logistica,logistica' && r.admin.atc==='bloki,bloki', r && r.admin);
  chk('una vendedora → gorra y tablita en ATC; en Contabilidad, anteojos; en Administración, casco (según la pestaña, para todos)', r && r.vendedora+''==='vendedor,vendedor' && r.vendConta+''==='conta,conta' && r.vendAdm+''==='logistica,logistica', r);

  console.log('\n── 3. La ventana ──');
  r = await ev(() => { showView('mis'); asisAbrir('ayuda'); var p=document.getElementById('asis-panel'), im=p && p.querySelector('.asis-h img');
    var o={ txt:p ? p.querySelector('.asis-h').textContent : '', img:im ? im.getAttribute('src').slice(0,30) : '', traje:im && im.getAttribute('data-traje'),
      aria:p && p.getAttribute('aria-label'), yo:(document.getElementById('asis-yo')||{}).getAttribute && document.getElementById('asis-yo').getAttribute('aria-label') };
    asisCerrar(); return o; });
  chk('la ventana dice «Soy Bloki, tu asistente del panel» y no «Eduardo»', /Soy Bloki, tu asistente del panel/.test(r.txt||'') && !/Eduardo/.test(r.txt||''), r.txt);
  chk('la cabecera lleva a Bloki con el traje de la pestaña (Mis pedidos → vendedor)', /^data:image\/svg/.test(r.img||'') && r.traje==='vendedor', r);
  chk('los nombres para lectores de pantalla dicen Bloki', /Bloki/.test(r.aria||'') && /Bloki/.test(r.yo||''), r);

  console.log('\n── 4-5. El anuncio ──');
  r = await ev(async () => {
    var espera=function(ms){ return new Promise(function(ok){ setTimeout(ok, ms); }); };
    var fig=function(){ return document.querySelector('#asis-yo img').getAttribute('data-traje'); };
    asisGlobo({ ico:'📢', t:'No hay insumos para el ICE.', x:'', anuncio:1, ms:300 }, true);
    var o={ conGlobo:fig() };
    await espera(500); o.despues=fig(); o.globoVisto=!document.getElementById('asis-globo').hidden;
    asisGlobo({ ico:'📢', t:'No hay insumos para el ICE.', x:'', anuncio:1, ms:60000 }, true);
    asisAbrir('avisos'); o.alAbrir=fig(); asisCerrar();
    anuncioGrito({ t:'No hay insumos para el ICE', ts:Date.now() });
    var g=document.getElementById('anu-grito'), gi=g && g.querySelector('.ag-yo img');
    o.grito={ ve:!!g && !g.hidden, traje:gi && gi.getAttribute('data-traje'), svg:gi && /^data:image\/svg/.test(gi.getAttribute('src')), viejo:!!(g && g.querySelector('svg.ag-mega')) };
    anuncioGritoCerrar();
    var t=document.getElementById('anu-btn'); o.boton=t ? (t.getAttribute('title')+' | '+t.getAttribute('data-d')) : '';
    return o;
  });
  chk('con el globo del anuncio, Bloki se pone el megáfono', r.conGlobo==='anuncio', r);
  chk('cuando el globo se va (o se abre la ventana), vuelve a su traje', r.despues==='vendedor' && !r.globoVisto && r.alAbrir==='vendedor', r);
  chk('el grito en pantalla entera es Bloki con su megáfono (sin el megáfono suelto de antes)', r.grito.ve && r.grito.traje==='anuncio' && r.grito.svg && !r.grito.viejo, r.grito);
  chk('el botón «📢 Decir anuncio» dice que lo grita Bloki', /Bloki lo grita/.test(r.boton||'') && !/Eduardo/.test(r.boton||''), r.boton);

  console.log('\n── 7. Se viste según el tema del mes, con TODOS los trajes (31/10, dueño: «¿no debería vestirse acorde a la temática del mes?») ──');
  const TEMAS={ halloween:'bk-capa', 'todos-santos':'bk-calavera', navidad:'bk-bufanda', 'anio-nuevo':'bk-mono', carnaval:'bk-serpentinas', madre:'#e11d48', patria:'bk-bandera', 'santa-cruz':'bk-bandera' };
  const visto={};
  for(const t of Object.keys(TEMAS)){
    await ponerTema(t);
    visto[t] = await ev((marca) => {
      var o={};
      Object.keys(BLOKI_TRAJES).forEach(function(tr){
        var svg=blokiSvg(tr), d=new DOMParser().parseFromString(svg, 'image/svg+xml');
        o[tr]={ ok:!d.querySelector('parsererror') && d.documentElement.nodeName==='svg', tema:svg.indexOf(marca)>=0,
          gorra:/#9aa5ad/.test(svg) && /M60 62 Q62 24 120 22/.test(svg), casco:/M62 60 Q64 18 120 16 Q176 18 178 60 Z/.test(svg), anteojos:/r="14"/.test(svg),
          mega:/class="bk-mega"/.test(svg), franja:svg.indexOf('#1aafa4')>=0, chispa:/class="bk-chispa"/.test(svg),
          cabeza:/class="bk-(bruja|corona|gorro|fiesta|plumas)"/.test(svg), src:blokiSrc(tr) };
      });
      return o;
    }, TEMAS[t]);
  }
  const trajes=['bloki','vendedor','logistica','conta','anuncio'];
  chk('en cada tema los cinco trajes son SVG que se leen bien', Object.keys(visto).every(t => trajes.every(tr => visto[t][tr] && visto[t][tr].ok)), '');
  chk('en cada tema TODOS los trajes llevan algo del tema (también el vendedor y logística, que era el reclamo)',
      Object.keys(visto).every(t => trajes.every(tr => visto[t][tr].tema)), Object.keys(visto).map(t => t+':'+trajes.filter(tr => !visto[t][tr].tema)).join(' '));
  chk('y cada traje sigue siendo él: gorra y tablita, casco, anteojos, megáfono, la franja turquesa',
      Object.keys(visto).every(t => visto[t].vendedor.gorra && visto[t].logistica.casco && visto[t].conta.anteojos && visto[t].anuncio.mega && trajes.every(tr => visto[t][tr].franja)), '');
  chk('el vendedor y logística no se ponen nada ENCIMA de su gorra o su casco (sombrero de bruja, corona, gorro, gorrito)',
      Object.keys(visto).every(t => !visto[t].vendedor.cabeza && !visto[t].logistica.cabeza), '');
  chk('Bloki con algo en la cabeza no lleva la chispa (Halloween, Todos Santos, Navidad, Año Nuevo); con la mano ocupada (Madre, banderas) sí',
      ['halloween','todos-santos','navidad','anio-nuevo'].every(t => visto[t].bloki.cabeza && !visto[t].bloki.chispa) && ['madre','patria','santa-cruz','carnaval'].every(t => visto[t].bloki.chispa), '');
  chk('la bandera del 6 de Agosto es la de Bolivia y la del 24 de Septiembre la de Santa Cruz',
      /#d52b1e/.test(decodeURIComponent(visto.patria.bloki.src)) && /#f9e300/.test(decodeURIComponent(visto.patria.bloki.src)) && !/#f9e300/.test(decodeURIComponent(visto['santa-cruz'].bloki.src)) && /#00843d/.test(decodeURIComponent(visto['santa-cruz'].bloki.src)), '');
  chk('la memoria de dibujos va por traje Y tema: el mismo traje en otro mes es otro dibujo', visto.halloween.vendedor.src!==visto['todos-santos'].vendedor.src && visto.navidad.bloki.src!==visto.madre.bloki.src, '');
  await ponerTema('espuma');
  r = await ev(() => { var s=blokiSvg('vendedor'); return { capa:/bk-capa/.test(s), cal:/bk-calavera/.test(s), buf:/bk-bufanda/.test(s), band:/bk-bandera/.test(s) }; });
  chk('el resto del año (Espuma), sin nada de temporada', !r.capa && !r.cal && !r.buf && !r.band, r);
  /* la figura de la esquina toma el tema de la página (la clase del <head> por la fecha: la prueba corre el 15/10 → Halloween) */
  await ponerTema('halloween');
  r = await ev(async () => { var espera=function(ms){ return new Promise(function(ok){ setTimeout(ok, ms); }); };
    showView('mis'); await espera(60); var i=document.querySelector('#asis-yo img'); i.removeAttribute('data-traje'); blokiPoner();
    return { traje:i.getAttribute('data-traje'), capa:/bk-capa/.test(decodeURIComponent(i.getAttribute('src'))) }; });
  chk('la figura de la esquina sale vestida con el tema (Mis pedidos en octubre: vendedor con capa)', r.traje==='vendedor' && r.capa, r);

  console.log('\n── 6. El Eduardo de verdad sigue siendo Eduardo ──');
  const fuente=require('fs').readFileSync(PEDIDOS, 'utf8');
  chk('«preguntale a Eduardo por WhatsApp» (el dueño, cuando Bloki no sabe) sigue igual', /preguntale a Eduardo por WhatsApp/.test(fuente));
  r = await ev(() => VENDEDORES.indexOf('Eduardo Añez')>=0);
  chk('Eduardo Añez sigue en la lista de vendedores', r===true);

  chk('sin errores de la página', errores.length===0, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
