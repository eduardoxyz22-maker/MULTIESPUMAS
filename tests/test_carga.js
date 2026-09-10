/* 🎯 PRIMERA CARGA: que se vea qué pasa (§4di).

   El dueño: *"a veces entro de otra pc o lugar y aparece todo en 0, no carga el servidor,
   ¿o qué pasa?"*. Pasaba que el panel le pedía la planilla al servidor UNA vez al abrir; si
   esa vez fallaba, no decía nada, el cartel seguía en verde «Conectado» y el próximo intento
   era dos minutos después. En una compu nueva (sin copia guardada) eso es «todo en 0».

   ⚠️ LO QUE ESTE TEST CUIDA, por orden de importancia:
   1. Que si la primera lectura falla, se REINTENTE sola y la pantalla lo DIGA, con el motivo
      en castellano y un botón para reintentar ya.
   2. Que «Conectado» se diga recién cuando el servidor contestó de verdad.
   3. Que cuando por fin contesta, todo se llene y el cartel se vaya solo.
   4. Que con copia guardada el cartel diga que se está viendo la copia, no «todo en 0».

   Se corre:  node tests/test_carga.js   (desde la raíz del repo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1300,height:900} });
  const errores=[]; page.on('pageerror',e=>errores.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.route(/^https?:/, r=>r.abort());          // la red cortada, como en una compu sin señal
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(250);

  const faltan = await page.evaluate(() => ['cargaInicial','cargaBanner','cargaEstado','motivoDeError','refrescarEstado']
    .filter(f => typeof window[f] !== 'function'));
  if(faltan.length){
    chk('el panel explica la primera carga (§4di)', false, 'faltan: '+faltan.join(', '));
    console.log('\n'+PASS+' bien · '+FAIL+' mal'); await browser.close(); process.exit(1);
  }

  // ══ 0. Al abrir, ya está intentando ═══════════════════════════════════════
  console.log('\n── 0. Al abrir el panel ──');
  let r = await page.evaluate(() => ({ estado:CARGA_ESTADO, conectado:CONNECTED }));
  chk('⚠️ apenas abre, la carga está en marcha (no espera dos minutos)', r.conectado && (r.estado==='cargando' || r.estado==='reintento' || r.estado==='error'), r.estado);

  const leer = () => page.evaluate(() => {
    var b=document.getElementById('carga-banner');
    return { estado:CARGA_ESTADO, n:window._n||0, state:STATE.length, motivo:ULTIMO_ERROR,
             visible:b.style.display!=='none', banner:(b.innerText||'').replace(/\s+/g,' '),
             boton:!!b.querySelector('button'),
             cartel:(document.getElementById('conn-form-txt').innerText||'').replace(/\s+/g,' '),
             cartelAdm:(document.getElementById('conn-admin-txt').innerText||'').replace(/\s+/g,' '),
             verde:document.getElementById('conn-form').className };
  });
  const P = `function(o){ return Object.assign({id:'p'+Math.random().toString(36).slice(2),fecha:todayStr(),oc:'1',vendedor:'Carola Chavez',cliente:'C',
      celular:'70000000',turno:'AM',zona:'Norte',direccion:'x',maps:'',pagado:true,saldo:0,ts:Date.now(),metodoPago:'',observaciones:'',
      estado:'',entregado:false,vehiculo:'',chofer:'',garantia:'',nota:'',acuenta:0,facturarA:'',nit:'',nroDia:1,verificado:false,fotos:[],
      productos:[{desc:'COLCHON',medida:'140x190',codigo:'',cant:1}]},o); }`;

  // ══ 1. Falla dos veces y a la tercera contesta ════════════════════════════
  console.log('\n── 1. Google no contesta dos veces; a la tercera sí ──');
  await page.evaluate((P) => {
    var mk=eval('('+P+')');
    CONNECTED=true; STATE=[]; saveMirror(); updateStats(); ULTIMO_REFRESCO=0;
    CARGA_INTENTOS=[150,150,150]; window._n=0;
    apiList=function(){ window._n++; return window._n<=2 ? Promise.reject(new TypeError('Failed to fetch'))
                                                        : Promise.resolve({ok:true, version:SCRIPT_VERSION_ESPERADA, pedidos:[mk({id:'a'}),mk({id:'b'}),mk({id:'c'})]}); };
    cargaInicial();
  }, P);
  await page.waitForTimeout(60);
  r = await leer();
  chk('⚠️ después del primer fallo el cartel dice que NO pudo, y por qué', r.estado==='reintento' && r.visible && /No se pudo leer la planilla/.test(r.banner) && /no hay conexión con Google/.test(r.banner), r.banner.slice(0,140));
  chk('…que va a reintentar solo, y que por eso la pantalla está en 0', /Reintento solo en \d+ s/.test(r.banner) && /la pantalla está en 0/.test(r.banner), r.banner.slice(0,200));
  chk('…con un botón para volver a intentar ya (que NO se llama «Reintentar»: ese nombre es del botón de Productos del mes y su test cuenta uno solo)',
      r.boton===true && /Volver a intentar/.test(r.banner) && !/Reintentar/.test(r.banner), r.banner.slice(-60));
  chk('⚠️ el cartel de conexión NO dice «Conectado»: dice «Sin respuesta del servidor»', /Sin respuesta del servidor/.test(r.cartel) && !/Conectado al equipo/.test(r.cartel) && /off/.test(r.verde), r.cartel.slice(0,100));
  await page.waitForTimeout(500);
  r = await leer();
  chk('⚠️ a la tercera contestó: los pedidos entraron y el cartel se fue solo', r.estado==='ok' && r.n===3 && r.state===3 && !r.visible, 'estado '+r.estado+' · intentos '+r.n+' · pedidos '+r.state);
  chk('…y recién ahora dice «Conectado al equipo»', /Conectado al equipo/.test(r.cartel) && /on/.test(r.verde), r.cartel.slice(0,80));

  // ══ 2. No contesta nunca ═══════════════════════════════════════════════════
  console.log('\n── 2. Google devuelve una página en vez de datos, todas las veces ──');
  await page.evaluate(() => {
    STATE=[]; saveMirror(); updateStats(); ULTIMO_REFRESCO=0; CARGA_INTENTOS=[50,50,50]; window._n=0;
    apiList=function(){ window._n++; return Promise.reject(new SyntaxError('Unexpected token < in JSON at position 0')); };
    cargaInicial();
  });
  await page.waitForTimeout(450);
  r = await leer();
  chk('⚠️ después de 4 intentos se rinde y lo dice, con el motivo traducido', r.estado==='error' && r.n===4 && /después de 4 intentos/.test(r.banner) && /Google devolvió una página/.test(r.banner), r.banner.slice(0,160));
  chk('…y sigue ofreciendo reintentar', r.boton===true && /Por eso no se ve ningún pedido/.test(r.cartelAdm), r.cartelAdm.slice(0,100));
  await page.evaluate((P) => { var mk=eval('('+P+')'); apiList=function(){ window._n++; return Promise.resolve({ok:true, pedidos:[mk({id:'z'})]}); }; }, P);
  await page.click('#carga-banner button');
  await page.waitForTimeout(120);
  r = await leer();
  chk('⚠️ «Volver a intentar» carga y limpia el cartel', r.estado==='ok' && r.state===1 && !r.visible && /Conectado al equipo/.test(r.cartel), 'estado '+r.estado+' · pedidos '+r.state);

  // ══ 3. Con copia guardada, se dice que es la copia ════════════════════════
  console.log('\n── 3. La compu de siempre: hay copia guardada pero el servidor no contesta ──');
  await page.evaluate((P) => {
    var mk=eval('('+P+')');
    STATE=[mk({id:'viejo'})]; saveMirror(); updateStats(); ULTIMO_REFRESCO=0; CARGA_INTENTOS=[50]; window._n=0;
    apiList=function(){ window._n++; return Promise.resolve({ok:false, error:'boom'}); };
    cargaInicial();
  }, P);
  await page.waitForTimeout(250);
  r = await leer();
  chk('⚠️ el cartel dice que se está viendo la copia guardada, no «todo en 0»', r.estado==='error' && /copia guardada en este dispositivo/.test(r.banner) && !/pantalla está en 0/.test(r.banner), r.banner.slice(0,160));
  chk('…y muestra lo que contestó el servidor', /el servidor contestó: boom/.test(r.banner) && /copia guardada/.test(r.cartelAdm), r.motivo);
  chk('la copia sigue en pantalla (no se borró nada)', r.state===1, r.state);

  // ══ 4. Los motivos, en castellano ═════════════════════════════════════════
  console.log('\n── 4. Los motivos ──');
  r = await page.evaluate(() => [motivoDeError(new TypeError('Failed to fetch')), motivoDeError(new SyntaxError('Unexpected token <')), motivoDeError(new Error('clave')), motivoDeError(new Error('otra cosa rara')), motivoDeError(null)]);
  chk('sin red → «no hay conexión con Google…»', /no hay conexión con Google/.test(r[0]) && /bloqueador/.test(r[0]), r[0]);
  chk('página en vez de JSON → «Google devolvió una página…»', /Google devolvió una página/.test(r[1]), r[1]);
  chk('clave → «pide la clave del equipo»', /pide la clave del equipo/.test(r[2]), r[2]);
  chk('otro error → se muestra tal cual, y sin nada → «no respondió»', /otra cosa rara/.test(r[3]) && /no respondió/.test(r[4]), r[3]+' | '+r[4]);

  /* §4dm — el 09/09 a la tarde el Apps Script empezó a dar 404 (a las 14:23 contestaba,
     a las 17:53 ya no): la implementación había dejado de existir. El panel decía «Google
     devolvió una página… suele ser momentáneo» y todo el mundo reintentaba para siempre.
     Un 404 NO se arregla solo: el cartel tiene que decir qué hacer. */
  console.log('\n── 5. Los códigos de Google, con qué hacer ──');
  const cod = await page.evaluate(async () => {
    // y que apiPost de verdad los tire, en vez de reventar contra r.json()
    var origFetch=window.fetch;
    window.fetch=function(){ return Promise.resolve({ ok:false, status:404,
      json:function(){ return Promise.reject(new SyntaxError('Unexpected token <')); } }); };
    var lanzado=await apiPost({action:'list'}).then(function(){ return 'no falló'; },
                                                    function(e){ return String(e&&e.message); });
    window.fetch=origFetch;
    return { m404: motivoDeError(new Error('http404')), m403: motivoDeError(new Error('http403')),
             m401: motivoDeError(new Error('http401')), m500: motivoDeError(new Error('http500')),
             m418: motivoDeError(new Error('http418')), lanzado: lanzado };
  });
  const lanzado = cod.lanzado;
  chk('⚠️ 404 → dice que la dirección ya no existe y CÓMO arreglarlo (implementación nueva vs. actualizar)',
      /ya no existe/.test(cod.m404) && /Administrar implementaciones/.test(cod.m404) && !/momentáneo/.test(cod.m404), cod.m404.slice(0,110));
  chk('403 → dice que hay que poner «Cualquier persona»', /Cualquier persona/.test(cod.m403), cod.m403.slice(0,80));
  chk('401 → dice que quedó restringida', /restringida/.test(cod.m401), cod.m401.slice(0,70));
  chk('5xx → dice que es de Google y que suele arreglarse solo', /Google está caído/.test(cod.m500) && /solo/.test(cod.m500), cod.m500.slice(0,70));
  chk('cualquier otro código se muestra igual, no se traga', /error 418/.test(cod.m418), cod.m418);
  chk('⚠️ apiPost avisa del código HTTP en vez de reventar contra el JSON',
      lanzado==='http404', lanzado);

  /* §4dp — el 09/09 el panel daba 404 en el navegador del dueño y andaba en INCÓGNITO, con
     el mismo Apps Script contestándole bien a GitHub Actions. Era la caché del navegador:
     un `/exec` contesta con un redirect que el navegador guarda, y al reimplementar la
     dirección guardada muere. Con un número distinto por pedido no hay redirect reusable. */
  const cache = await page.evaluate(async () => {
    var urls=[], ini=[];
    var orig=window.fetch;
    window.fetch=function(u,o){ urls.push(String(u)); ini.push(o||{});
      return Promise.resolve({ok:true,status:200,json:function(){ return Promise.resolve({ok:true}); }}); };
    await apiPost({action:'list'});
    await new Promise(function(r){ setTimeout(r,3); });
    await apiPost({action:'list'});
    window.fetch=orig;
    var n=function(u){ var m=String(u).match(/[?&]_=(\d+)/); return m?m[1]:''; };
    return { u1:urls[0]||'', u2:urls[1]||'', t1:n(urls[0]), t2:n(urls[1]),
             cache:(ini[0]||{}).cache, cred:(ini[0]||{}).credentials };
  });
  chk('⚠️ cada pedido lleva su propio número: el navegador no puede reusar una dirección guardada',
      !!cache.t1 && !!cache.t2 && cache.t1!==cache.t2, cache.t1+' ≠ '+cache.t2);
  chk('…y se pide sin caché y sin arrastrar la sesión de Google',
      cache.cache==='no-store' && cache.cred==='omit', cache.cache+' / '+cache.cred);
  /* ⚠️ El Apps Script desvía al camino de Kommo si ve `k` o `kommo` en la dirección: el
     número de la caché NO puede llamarse así o el panel entero dejaría de guardar. */
  chk('⚠️ el parámetro no se llama «k» ni «kommo» (eso desviaría al camino de Kommo)',
      !/[?&](k|kommo)=/.test(cache.u1), cache.u1.replace(/^.*\/exec/,'…/exec'));

  /* §4dq — «a veces tardan hasta 4 min en subir una foto», con el botón clavado en
     «⏳ Subiendo la imagen…». Un `fetch` no tiene tope: si Google se cuelga, se espera
     para siempre. Y el celular achicaba pasando la foto por un texto base64 gigante. */
  console.log('\n── 6. La foto: tope de espera y cuánto tardó cada mitad ──');
  const foto = await page.evaluate(async () => {
    var out={};
    out.rapido = (typeof createImageBitmap==='function');
    // el tope corta y dice «tardo», en vez de esperar para siempre
    var t0=Date.now();
    var colgada=new Promise(function(){});          // no resuelve nunca
    out.corto = await conTopeDuro(colgada, 60).then(function(){ return 'no cortó'; },
                                                    function(e){ return String(e&&e.message); });
    out.ms = Date.now()-t0;
    // …y el motivo se dice en castellano, no como «tardo»
    out.motivo = motivoDeError(new Error('tardo'));
    // el cronómetro deja los dos tiempos
    FOTO_T={achicar:1.2, subir:0, t1:Date.now()-3400};
    out.txt = fotoTiempoTxt();
    // una promesa que sí resuelve pasa igual
    out.pasa = await conTopeDuro(Promise.resolve('ok'), 500);
    return out;
  });
  chk('⚠️ la espera por una foto se corta sola, no queda colgada para siempre',
      foto.corto==='tardo' && foto.ms<2000, foto.corto+' en '+foto.ms+' ms');
  chk('…y lo explica en castellano, con los segundos', /Google tardó más de \d+ segundos/.test(foto.motivo), foto.motivo);
  chk('…sin romper una subida que sí anda', foto.pasa==='ok', foto.pasa);
  chk('⚠️ el panel mide y dice cuánto tardó CADA mitad (achicar vs subir)',
      /achicar 1\.2s · subir 3\.[34]s/.test(foto.txt), foto.txt);
  chk('el navegador tiene el camino rápido para achicar (createImageBitmap)', foto.rapido===true, foto.rapido);

  /* §4ds — «lleva 3 intentos y no conecta», con el cartel clavado en «⏳ Conectando con la
     planilla del equipo…». Es el MISMO agujero de la foto, en el camino de los datos: si
     Google abre la conexión y no contesta nunca, el `fetch` no resuelve NI falla, y el
     reintento —que se agenda recién cuando el intento anterior termina— no llega nunca.
     Sin tope, el panel se queda diciendo «conectando» para siempre. */
  console.log('\n── 7. Una lectura colgada se corta sola y reintenta ──');
  const colgado = await page.evaluate(async () => {
    var out={}, esperar=function(ms){ return new Promise(function(r){ setTimeout(r,ms); }); };
    CONNECTED=true; STATE=[]; CARGA_GEN++;
    if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; }
    if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
    var topeOrig=CARGA_TOPE, listOrig=window.apiList, intOrig=CARGA_INTENTOS;
    CARGA_TOPE=2000; CARGA_INTENTOS=[8000];      // la espera larga, para poder mirar la cuenta regresiva
    window.apiList=function(){ return new Promise(function(){}); };   // no contesta nunca
    var t0=Date.now();
    var p=cargaInicial(0);
    await esperar(1100);
    out.mientras = CARGA_ESTADO;
    out.chip = (document.getElementById('conn-admin-txt')||{}).innerHTML||'';
    out.seg = cargaSeg();
    await p;                                    // el tope tiene que hacerla terminar sola
    out.ms = Date.now()-t0;
    out.despues = CARGA_ESTADO;
    out.motivo = ULTIMO_ERROR;
    out.reintenta = !!CARGA_TIMER;
    out.banner = (document.getElementById('carga-banner')||{}).innerHTML||'';
    out.chip2 = (document.getElementById('conn-admin-txt')||{}).innerHTML||'';
    /* ⚠️ La MISMA cuenta regresiva se dibuja en dos lugares: el cartel de arriba y el chip
       de adentro de la pestaña. Si solo late uno, quedan diciendo números distintos. */
    await esperar(2200);
    var seg=function(t){ var m=String(t).match(/(\d+)\s*<\/b>\s*s|(\d+)\s*s\b/); return m?(m[1]||m[2]):''; };
    out.segBanner=seg((document.getElementById('carga-banner')||{}).innerHTML||'');
    out.segChip  =seg((document.getElementById('conn-form-txt')||{}).innerHTML||'');
    out.bajo = (out.segBanner!=='' && Number(out.segBanner)<8);   // de verdad bajó
    out.busy = motivoDelServidor('busy');
    if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; }
    if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
    CARGA_TOPE=topeOrig; CARGA_INTENTOS=intOrig; window.apiList=listOrig; CARGA_GEN++; CARGA_ESTADO='ok';
    return out;
  });
  chk('⚠️ una lectura que no contesta NUNCA se corta sola (antes: «Conectando…» para siempre)',
      colgado.despues==='reintento' && colgado.ms>=2000 && colgado.ms<6000, colgado.despues+' en '+colgado.ms+' ms');
  chk('…y dice el motivo en castellano, con los segundos que esperó',
      /Google no contestó en 2 segundos/.test(colgado.motivo), colgado.motivo);
  chk('…y deja agendado el reintento solo, sin que nadie toque nada', colgado.reintenta===true);
  chk('mientras espera, el cartel muestra los segundos que lleva (no un texto quieto)',
      colgado.mientras==='cargando' && colgado.seg>=1 && /\d+ s/.test(colgado.chip), colgado.mientras+' · '+colgado.seg+' s · '+colgado.chip.slice(0,90));
  chk('al cortarse, el cartel dice en cuánto reintenta y ofrece «Volver a intentar»',
      /Reintenta solo en/.test(colgado.chip2) && /Volver a intentar/.test(colgado.banner), colgado.chip2.slice(0,120));
  chk('⚠️ la cuenta regresiva baja y dice LO MISMO en el cartel de arriba y en el chip de la pestaña',
      colgado.segBanner!=='' && colgado.segBanner===colgado.segChip && colgado.bajo,
      'cartel '+colgado.segBanner+' s · chip '+colgado.segChip+' s');
  chk('«busy» del servidor se dice en castellano, no como código', /ocupado con otra operación/.test(colgado.busy), colgado.busy.slice(0,80));

  chk('la página no tiró ningún error de JavaScript', errores.length===0, errores.join(' | ').slice(0,300));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
