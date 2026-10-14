/* 📢 EL ANUNCIO DE ADMINISTRACIÓN (13/10) y 📣 EL GRITO (14/10). El dueño: «crea un botón en administración "decir anuncio" para que
   Eduardo lo repita cada 3 min a los vendedores, por ejemplo a veces quiero avisar "no hay insumos para el ICE" hasta nuevo aviso»; y
   al otro día: «a Eduardo no lo veo gritando el anuncio cada 3 min como acordamos… haz que grite, tiemble la pantalla, que Eduardo
   aparezca con su megáfono gritando!»; y enseguida: «si sale en pantalla completa cada 3 min sería molesto… solo la primera vez, tal
   como está, y luego el pequeño saca el anuncio cada 3 min sin molestar, solo muestra el globo de anuncio».

   ⚠️ LO QUE ESTA PRUEBA CUIDA (las de §3-§4 fallan contra lo publicado, `60a98e8`: ahí era un globito y solo a los vendedores):
   1. El botón «📢 Decir anuncio» está en Administración y abre la ventana; sin la contraseña no la abre.
   2. Publicarlo guarda la fila del sistema `__anuncio__` (que NO es un pedido) con el texto; vacío o repetido no guarda.
   3. Eduardo lo GRITA UNA VEZ al entrar: pantalla entera con Eduardo, su megáfono y el texto; la pantalla tiembla; sirena y la voz
      del navegador en castellano (sin emojis). Mientras habla no se cierra; después se va solo. A los 3 minutos (no antes) NO vuelve
      a gritar: sale el GLOBO de Eduardo con el anuncio, callado; y así cada 3 minutos. Un anuncio NUEVO sí se grita.
      Tocar en cualquier lado, «Entendido» o Esc lo cierran y lo callan. Con 🔇 sale la pantalla, sin sirena ni voz. Si la persona
      está escribiendo, espera a que termine. La risa de Halloween se espera. No tiene «Entendido» en los avisos de Eduardo.
   4. El navegador no deja sonar sin un toque: al abrir la página grita callado y el PRIMER toque lo hace gritar (sin cerrarlo).
   5. En logística y en Administración TAMBIÉN (grito al entrar y globo cada 3 min); con la clave, el grito trae «✏️ Cambiar o quitar».
   6. Quitarlo deja la fila con el texto vacío, cierra el grito y Eduardo deja de gritarlo. Si el servidor no lo guarda, lo dice.
   Datos SINTÉTICOS. Reloj clavado en el miércoles 14/10/2026.
   Se corre:  node tests/test_anuncio.js   (desde la raíz del repo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

/* la voz del navegador, de mentira: anota lo que dice; «termina de hablar» a los `_hablaMs` */
function VOZ_DE_MENTIRA(){
  window.ASIS_PRUEBA=1;
  window._habla=[]; window._cancel=0; window._hablaMs=3000;
  var voces=[{ name:'Google español', lang:'es-ES' }, { name:'Jorge', lang:'es-MX' }, { name:'Paulina', lang:'es-MX' }, { name:'Samantha', lang:'en-US' }];
  Object.defineProperty(window, 'speechSynthesis', { configurable:true, value:{
    speak:function(u){ window._habla.push({ t:u.text, lang:u.lang, voz:u.voice ? u.voice.name : '', vol:u.volume });
      setTimeout(function(){ if(u.onstart) u.onstart(); }, 10); setTimeout(function(){ if(u.onend) u.onend(); }, window._hablaMs); },
    cancel:function(){ window._cancel++; }, getVoices:function(){ return voces; } } });
  window.SpeechSynthesisUtterance=function(t){ this.text=t; };
}
function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  var q=document.getElementById('quien'); if(q) q.hidden=true;
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR=''; ULTIMO_REFRESCO=Date.now();
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  loadFromServer=function(){};
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
  window._saves=[]; window._respuesta=null;
  apiSave=function(p){ var r=JSON.parse(JSON.stringify(p)); window._saves.push(r); if(window._respuesta) return Promise.resolve(window._respuesta); r.rev=(Number(r.rev)||0)+1; return Promise.resolve({ ok:true, pedido:r }); };
  try{ ['me_asis_vistos','me_asis_mudo','me_asis_tour','me_asis_preg','me_quien_rol'].forEach(function(k){ localStorage.removeItem(k); }); }catch(e){}
  window._pops=0; asisPop=function(){ window._pops++; };   // el sonido: se cuenta en vez de sonar
  window._sirenas=0; anuncioSirena=function(){ window._sirenas++; return 1.32; };
  window._puedeReal=window.anuncioPuedeSonar; window.anuncioPuedeSonar=function(){ return true; };   // como si ya hubieran tocado la pantalla
  window.hwRisaAudio=null;
  window.PED=function(){ return { id:'a1', oc:'10-501', nota:'901', vendedor:'Mirian Salazar', cliente:'CLIENTE UNO', fecha:todayStr(), turno:'AM',
    productos:[{desc:'COLCHON TITANIO',medida:'140x190',cant:1,precio:3000,chk:'ok'}], saldo:0, acuenta:0, pagado:true, metodoPago:'', entregado:false,
    ts:Date.now()-86400000, fotos:[], chofer:'', vehiculo:'', maps:'https://maps.app.goo.gl/x', celular:'70000000', zona:'Norte' }; };
  window.FILA=function(t, ts){ return filaSistema(ANUNCIO_ID, '📢 ANUNCIO', JSON.stringify({ v:1, t:t, d:todayStr()+' 09:15', ts:ts||Date.now(), por:'Administración' })); };
  window.GRITO=function(){ var g=document.getElementById('anu-grito'), q=function(s){ return !!(g && g.querySelector(s)); };
    return { ve:!!g && !g.hidden, txt:g ? g.textContent : '', mega:q('svg.ag-mega'), img:q('.ag-yo img'), ondas:q('.ag-ondas i'), cambiar:q('.ag-cambiar'),
      tiembla:document.body.classList.contains('anu-tiembla') }; };
  window.HABLA=function(){ return window._habla.filter(function(h){ return /Atención/.test(h.t); }); };
  window.GLOBO=function(){ var g=document.getElementById('asis-globo'); return { ve:!!g && !g.hidden, anu:!!g && g.classList.contains('asis-anuncio'), txt:g ? g.textContent : '' }; };
  window.OTRO_GRITO=function(){ ANUNCIO.ts=-1; anuncioTic(); };   // como si Administración pusiera uno nuevo: se grita
  window.CALLAR_OTROS=function(){ asisAvisos().forEach(function(a){ if(!a.anuncio) ASIS.anunciados[a.k]=1; }); };   // se mira solo el anuncio
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (vw) => {
    const page = await browser.newPage({ viewport:vw || { width:1180, height:900 }, timezoneId:'America/La_Paz' });
    page.on('pageerror', e => errores.push(e.message));
    page.on('dialog', d => d.accept());
    await page.route(/^https?:/, r => r.abort());
    await page.addInitScript(VOZ_DE_MENTIRA);
    await page.clock.install({ time:new Date('2026-10-14T10:00:00-04:00') });
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.clock.runFor(1700);
    await page.evaluate(PREPARAR);
    return page;
  };
  const ev = (page, fn, arg) => page.evaluate(fn, arg).catch(e => ({ error:String(e.message||e).slice(0,300) }));

  /* ---------------------------------------------------------------- 1 y 2 */
  console.log('\n── 1-2. Administración lo escribe ──');
  let page = await abrir();
  let r = await ev(page, () => {
    STATE=[PED()]; UNLOCKED=false;
    var b=document.getElementById('anu-btn');
    var grupo=b ? (b.closest('.at-g').querySelector('h5')||{}).textContent : '';
    anuncioAbrir(); var sinClave=document.getElementById('anu'); var abiertaSin=!!sinClave && !sinClave.hidden;
    UNLOCKED=true; b.click();
    var box=document.getElementById('anu');
    return { hay:!!b, txt:b && b.textContent.trim(), grupo:grupo, abiertaSin:abiertaSin, abierta:!!box && !box.hidden, ta:!!document.getElementById('anu-txt'),
      quitar:!!document.getElementById('anu-quitar'), dice:(box.querySelector('.anu-h small')||{}).textContent };
  });
  chk('el botón «📢 Decir anuncio» está en «Mensajes y partes» de Administración', r.hay && r.txt==='📢 Decir anuncio' && /Mensajes/.test(r.grupo), r);
  chk('sin la contraseña de Administración no abre la ventana', !r.abiertaSin, r);
  chk('con la contraseña abre la ventana (sin «Quitar»: todavía no hay) y dice que Eduardo lo GRITA en todos los aparatos', r.abierta && r.ta && !r.quitar && /GRITA en todos/.test(r.dice), r);

  r = await ev(page, async () => {
    var ta=document.getElementById('anu-txt'); ta.value='   '; anuncioGuardar(false); await new Promise(function(z){ setTimeout(z, 30); });
    var vacio={ saves:_saves.length, est:document.getElementById('anu-est').textContent };
    ta.value='  No hay insumos para el ICE   hasta nuevo aviso.  '; document.getElementById('anu-pub').click();
    await new Promise(function(z){ setTimeout(z, 50); });
    var s=_saves.filter(function(x){ return x.id===ANUNCIO_ID; })[0], o=s ? JSON.parse(s.observaciones) : {};
    var fila=STATE.filter(function(p){ return p.id===ANUNCIO_ID; })[0];
    var box=document.getElementById('anu');
    return { vacio:vacio, guardo:!!s, t:o.t, ts:o.ts, d:o.d, fecha:s && s.fecha, sis:!!fila && esFilaSistema(fila), cerrada:!box || box.hidden,
      leido:(anuncioLeer()||{}).t, btnOn:document.getElementById('anu-btn').classList.contains('anu-on'), btnD:document.getElementById('anu-btn').getAttribute('data-d'),
      grito:GRITO() };
  });
  chk('vacío no guarda y dice qué falta', r.vacio.saves===0 && /Escrib/.test(r.vacio.est), r.vacio);
  chk('publicar guarda la fila `__anuncio__` con el texto limpio, la hora y SIN fecha de entrega', r.guardo && r.t==='No hay insumos para el ICE hasta nuevo aviso.' && r.ts>0 && /^2026-10-14 10:00$/.test(r.d) && r.fecha==='', r);
  chk('esa fila es del sistema (no es un pedido) y la ventana se cierra', r.sis && r.cerrada, r);
  chk('el botón queda marcado y dice el anuncio de ahora', r.btnOn && /ICE/.test(r.btnD), r);
  chk('y en el mismo aparato de Administración Eduardo ya lo grita (así lo ven todos)', r.grito.ve && /ICE/.test(r.grito.txt) && r.grito.cambiar, r.grito);

  r = await ev(page, async () => {
    anuncioGritoCerrar();
    var A=asisAvisos(), a=A[0]||{};
    asisAbrir('avisos'); var el=document.querySelector('#asis-panel .asis-av'), html=el ? el.innerHTML : '';
    var cambiar=el && el.classList.contains('anu-av') && /Cambiar o quitar/.test(html), entendido=/Entendido/.test(html);
    asisCerrar();
    anuncioAbrir(); var ta=document.getElementById('anu-txt'), igual=ta.value;
    anuncioGuardar(false); await new Promise(function(z){ setTimeout(z, 30); });
    var est=document.getElementById('anu-est').textContent, n=_saves.length;
    return { k:a.k, anuncio:!!a.anuncio, cambiar:cambiar, entendido:entendido, igual:igual, est:est, n:n, quitar:!!document.getElementById('anu-quitar'), x:a.x };
  });
  chk('en Administración queda PRIMERO en los avisos de Eduardo, con «✏️ Cambiar o quitar» y sin «Entendido»', r.anuncio && r.cambiar && !r.entendido, r);
  chk('y dice que lo grita al entrar y lo recuerda cada 3 minutos', /grita en todos los aparatos al entrar al panel y lo recuerda cada 3 minutos/.test(r.x), r.x);
  chk('al reabrir, la ventana trae el anuncio puesto y el botón «🗑 Quitar anuncio»', /ICE/.test(r.igual) && r.quitar, r);
  chk('el mismo texto otra vez no vuelve a guardar', r.n===1 && /mismo/.test(r.est), r);
  await page.close();

  /* ---------------------------------------------------------------- 3 */
  console.log('\n── 3. El grito: pantalla entera, temblor, sirena y voz, cada 3 minutos ──');
  page = await abrir();
  r = await ev(page, () => {
    UNLOCKED=false; quienRol(''); setVendedorMem('Mirian Salazar');
    STATE=[PED(), FILA('🚫 No hay insumos para el ICE hasta nuevo aviso.', 111)];
    CALLAR_OTROS(); _pops=0; window._hablaMs=20000; asisRefrescar();
    var g=document.getElementById('anu-grito');
    return { g:GRITO(), rol:g && g.getAttribute('role'), globo:!document.getElementById('asis-globo').hidden };
  });
  chk('apenas llega, Eduardo aparece en pantalla entera con su megáfono, las ondas y el anuncio', r.g.ve && r.g.img && r.g.mega && r.g.ondas && /No hay insumos para el ICE/.test(r.g.txt) && /Anuncio de Administración/.test(r.g.txt), r);
  chk('la pantalla tiembla y avisa a los lectores de pantalla (alertdialog); ya no es el globito', r.g.tiembla && r.rol==='alertdialog' && !r.globo, r);
  chk('el vendedor no ve «Cambiar o quitar» y lee que se lo recuerda cada 3 minutos', !r.g.cambiar && /recuerdo cada 3 minutos/.test(r.g.txt), r.g.txt);
  await page.clock.runFor(1200);
  r = await ev(page, () => ({ tiembla:document.body.classList.contains('anu-tiembla'), sir:_sirenas, h:HABLA().length }));
  chk('el temblor dura un segundo y suena la sirena; la voz todavía no (espera la sirena)', !r.tiembla && r.sir===1 && r.h===0, r);
  await page.clock.runFor(1000);
  r = await ev(page, () => ({ h:HABLA() }));
  chk('después la voz lee el anuncio en castellano, con voz de Latinoamérica y de hombre si hay, y sin el emoji', r.h.length===1 && r.h[0].t==='¡Atención, atención! No hay insumos para el ICE hasta nuevo aviso.' && r.h[0].voz==='Jorge' && r.h[0].lang==='es-MX' && r.h[0].vol===1, r.h);
  await page.clock.runFor(12000);   // 14 s: pasaron los 12, pero sigue hablando
  r = await ev(page, () => ({ g:GRITO() }));
  chk('mientras habla, la pantalla no se cierra sola', r.g.ve, r.g.ve);
  await page.clock.runFor(11000);   // terminó de hablar a los ~21,7 s, + 2,5 s
  r = await ev(page, () => ({ g:GRITO(), cancel:_cancel }));
  chk('al terminar de hablar, se va sola un ratito después', !r.g.ve, r);
  await page.clock.runFor(118000);  // 2 min 23 s desde que llegó
  r = await ev(page, () => ({ g:GRITO(), sir:_sirenas, h:HABLA().length }));
  chk('antes de los 3 minutos no lo repite', !r.g.ve && r.sir===1 && r.h===1, r);
  r = await ev(page, () => { window._p0=_pops; return {}; });
  await page.clock.runFor(53000);   // 3 min 16 s: el reloj mira cada 15 s, así que recuerda entre los 3:00 y los 3:15
  r = await ev(page, () => ({ g:GRITO(), gl:GLOBO(), sir:_sirenas, pops:_pops-_p0 }));
  await page.clock.runFor(2000);
  let r2 = await ev(page, () => ({ h:HABLA().length }));
  chk('a los 3 minutos NO vuelve la pantalla entera: sale el globo de Eduardo con el anuncio', !r.g.ve && r.gl.ve && r.gl.anu && /ICE/.test(r.gl.txt) && /Anuncio de Administración/.test(r.gl.txt), r);
  chk('y el globo es callado: sin sirena, sin voz y sin «pop»', r.sir===1 && r2.h===1 && r.pops===0, [r, r2]);
  await page.clock.runFor(21000);
  r = await ev(page, () => ({ gl:GLOBO() }));
  chk('el globo se va solo a los 20 segundos', !r.gl.ve, r.gl);
  await page.clock.runFor(160000);  // ~6 min 20 s: el segundo recordatorio
  r = await ev(page, () => ({ g:GRITO(), gl:GLOBO(), sir:_sirenas }));
  chk('y así cada 3 minutos: otra vez el globo, nunca la pantalla entera', !r.g.ve && r.gl.ve && r.gl.anu && r.sir===1, r);
  r = await ev(page, () => { OTRO_GRITO(); return { a:GRITO().ve }; });
  await page.clock.runFor(1000);   // el toque de los primeros 700 ms no lo cierra (es el que lo hace gritar)
  r = await ev(page, (a) => { var c0=_cancel; document.getElementById('anu-grito').click(); return { a:a, g:GRITO(), callo:_cancel>c0 }; }, r.a);
  chk('un anuncio NUEVO sí se grita en grande; tocar en cualquier lado lo cierra y lo calla', r.a && !r.g.ve && r.callo, r);
  r = await ev(page, () => {
    var A=asisAvisos(), a=A[0]||{};
    asisPosponer(a.k, 24*3600000);   // aunque alguien lo esconda a mano, sigue
    var B=asisAvisos();
    asisAbrir('avisos'); var el=document.querySelector('#asis-panel .asis-av.anu-av'), html=el ? el.innerHTML : ''; asisCerrar();
    return { primero:!!a.anuncio, sigue:B.some(function(x){ return x.anuncio; }), entendido:/Entendido/.test(html), luego:/En 1 hora|Mañana/.test(html),
      cambiar:/Cambiar o quitar/.test(html), x:a.x, hayEl:!!el };
  });
  chk('en los avisos de Eduardo va primero, sin «Entendido» ni «En 1 hora», y esconderlo a mano no lo esconde', r.hayEl && r.primero && r.sigue && !r.entendido && !r.luego, r);
  chk('en los avisos el vendedor no ve «Cambiar o quitar» y lee que se lo recuerda cada 3 minutos', !r.cambiar && /recuerdo cada 3 minutos/.test(r.x), r);
  /* «Entendido» y Esc */
  r = await ev(page, () => {
    OTRO_GRITO(); var abierto=GRITO().ve;
    document.querySelector('#anu-grito .ag-ok').click(); var tras=GRITO().ve;
    OTRO_GRITO(); var otra=GRITO().ve;
    document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
    return { abierto:abierto, tras:tras, otra:otra, esc:GRITO().ve };
  });
  chk('«👍 Entendido» lo cierra', r.abierto && !r.tras, r);
  chk('Esc también', r.otra && !r.esc, r);
  await page.close();

  /* ---------------------------------------------------------------- 3b: 🔇, escribiendo y la risa (página nueva, sin apuros) */
  console.log('\n── 3b. 🔇, mientras escribe y la risa de Halloween ──');
  page = await abrir();
  r = await ev(page, () => {
    UNLOCKED=false; quienRol(''); STATE=[PED(), FILA('No hay insumos para el ICE.', 444)]; CALLAR_OTROS();
    localStorage.setItem(ASIS_LS_MUDO, '1'); asisRefrescar(); return { g:GRITO() };
  });
  await page.clock.runFor(3000);
  r2 = await ev(page, () => ({ sir:_sirenas, h:HABLA().length }));
  chk('con 🔇 la pantalla sale igual, pero sin sirena ni voz', r.g.ve && /ICE/.test(r.g.txt) && r2.sir===0 && r2.h===0, [r.g.ve, r2]);
  r = await ev(page, () => {
    localStorage.removeItem(ASIS_LS_MUDO); anuncioGritoCerrar();
    var inp=document.getElementById('f-cliente') || document.querySelector('input[type=text]'); inp.focus();
    inp.value='Juan Pér'; inp.dispatchEvent(new Event('input', { bubbles:true }));
    OTRO_GRITO();
    return { g:GRITO(), foco:document.activeElement===inp, id:inp.id };
  });
  chk('si está escribiendo en un campo, no le tapa el formulario: espera', !r.g.ve && r.foco, r);
  await page.clock.runFor(16000);   // dejó de escribir hace más de 8 s y el reloj vuelve a mirar
  r = await ev(page, () => ({ g:GRITO() }));
  chk('cuando deja de escribir, lo grita', r.g.ve, r.g.ve);
  r = await ev(page, () => {
    anuncioGritoCerrar(); document.activeElement.blur();
    window._risaFin=null; window.hwRisaAudio={ paused:false, ended:false, addEventListener:function(ev, fn){ if(ev==='ended') window._risaFin=fn; } };
    var s0=_sirenas, h0=HABLA().length; window._s0=s0; window._h0=h0;
    OTRO_GRITO(); return { g:GRITO() };
  });
  await page.clock.runFor(3000);
  r2 = await ev(page, () => ({ sir:_sirenas-_s0, h:HABLA().length-_h0, espera:typeof window._risaFin==='function' }));
  chk('🎃 si la risa de bruja está sonando, Eduardo espera a que termine', r.g.ve && r2.sir===0 && r2.h===0 && r2.espera, r2);
  await ev(page, () => { window._risaFin(); });
  await page.clock.runFor(2000);
  r2 = await ev(page, () => ({ sir:_sirenas-_s0, h:HABLA().length-_h0 }));
  chk('y apenas termina la risa, sirena y voz', r2.sir===1 && r2.h===1, r2);
  await page.close();

  /* ---------------------------------------------------------------- 4 */
  console.log('\n── 4. Sin un toque no suena: el primer toque lo hace gritar ──');
  page = await abrir({ width:390, height:844 });
  r = await ev(page, () => {
    /* Playwright evalúa «como si hubieran tocado» (userGesture), así que `navigator.userActivation` ya dice que sí: se simula con
       un toque de verdad (`pointerdown`, que llega antes que el `touchend`/`click` que escucha el anuncio) */
    window._tocaron=0; document.addEventListener('pointerdown', function(){ window._tocaron=1; }, true);
    anuncioPuedeSonar=function(){ return !!window._tocaron; };
    var real=(typeof _puedeReal==='function');
    UNLOCKED=false; quienRol(''); STATE=[PED(), FILA('No hay insumos para el ICE.', 555)]; CALLAR_OTROS();
    asisRefrescar(); return { g:GRITO(), sinVoz:ANUNCIO.sinVoz, puede:anuncioPuedeSonar(), real:real, ancho:document.documentElement.scrollWidth, vw:innerWidth };
  });
  await page.clock.runFor(2500);
  r2 = await ev(page, () => ({ sir:_sirenas, h:HABLA().length }));
  chk('al abrir la página, sin ningún toque todavía: la pantalla sale, callada, y queda pendiente', r.g.ve && !r.puede && r.sinVoz===1 && r2.sir===0 && r2.h===0, [r, r2]);
  chk('en el celular entra sin scroll de costado', r.ancho<=r.vw, r);
  await page.mouse.click(195, 760);
  r = await ev(page, () => ({ g:GRITO(), sinVoz:ANUNCIO.sinVoz }));
  await page.clock.runFor(2500);
  r2 = await ev(page, () => ({ sir:_sirenas, h:HABLA().length, g:GRITO() }));
  chk('el primer toque lo hace gritar (sirena y voz) y NO lo cierra', r.g.ve && r.sinVoz===0 && r2.sir===1 && r2.h===1 && r2.g.ve, [r, r2]);
  await page.mouse.click(195, 760);
  r = await ev(page, () => ({ g:GRITO() }));
  chk('el toque siguiente sí lo cierra', !r.g.ve, r.g.ve);
  await page.close();

  /* ---------------------------------------------------------------- 5 */
  console.log('\n── 5. Logística y Administración: también cada 3 minutos ──');
  page = await abrir();
  r = await ev(page, () => {
    UNLOCKED=false; quienRol('logistica');
    STATE=[PED(), FILA('No hay insumos para el ICE.', 222)]; CALLAR_OTROS();
    asisRefrescar(); var g1=GRITO(); var A=asisAvisos(); anuncioGritoCerrar(); window._s0=_sirenas;
    return { g1:g1, primero:!!(A[0]||{}).anuncio };
  });
  chk('logística lo ve gritado al llegar y primero en los avisos', r.g1.ve && /ICE/.test(r.g1.txt) && r.primero, r);
  await page.clock.runFor(3*60000+16000);
  r = await ev(page, () => ({ g:GRITO(), gl:GLOBO(), sir:_sirenas-_s0 }));
  chk('y a los 3 minutos le sale el globo del anuncio (antes, a logística no), sin pantalla entera ni sirena', !r.g.ve && r.gl.ve && r.gl.anu && r.sir===0, r);
  r = await ev(page, async () => {
    anuncioGritoCerrar(); quienRol(''); UNLOCKED=true;
    OTRO_GRITO(); var g=GRITO();
    document.querySelector('#anu-grito .ag-cambiar').click();
    var box=document.getElementById('anu');
    return { g:g, cerro:!GRITO().ve, ventana:!!box && !box.hidden };
  });
  chk('con la contraseña también, y el grito trae «✏️ Cambiar o quitar»', r.g.ve && r.g.cambiar, r.g);
  chk('«✏️ Cambiar o quitar» cierra el grito y abre la ventana del anuncio', r.cerro && r.ventana, r);
  await page.close();

  /* ---------------------------------------------------------------- 6 */
  console.log('\n── 6. Quitarlo, y si el servidor no lo guarda ──');
  page = await abrir();
  r = await ev(page, async () => {
    UNLOCKED=true; STATE=[PED(), FILA('No hay insumos para el ICE.', 333)]; STATE[1].rev=4; CALLAR_OTROS();
    asisRefrescar(); var gritando=GRITO().ve;
    window._respuesta={ ok:false, error:'busy' };
    anuncioAbrir(); document.getElementById('anu-quitar').click(); await new Promise(function(z){ setTimeout(z, 50); });
    var box=document.getElementById('anu');
    var fallo={ abierta:!box.hidden, est:document.getElementById('anu-est').textContent, sigue:(anuncioLeer()||{}).t, rev:_saves[0] && _saves[0].rev, botonOk:!document.getElementById('anu-pub').disabled };
    window._respuesta=null;
    document.getElementById('anu-quitar').click(); await new Promise(function(z){ setTimeout(z, 50); });
    var s=_saves[_saves.length-1], o=JSON.parse(s.observaciones);
    return { gritando:gritando, fallo:fallo, t:o.t, id:s.id, leido:anuncioLeer(), btnOn:document.getElementById('anu-btn').classList.contains('anu-on'),
      aviso:asisAvisos().some(function(a){ return a.anuncio; }), grito:GRITO().ve };
  });
  chk('si el servidor no lo guarda, la ventana queda abierta, lo dice y el anuncio sigue igual', r.fallo.abierta && /No se guard/.test(r.fallo.est) && /ICE/.test(r.fallo.sigue) && r.fallo.botonOk, r.fallo);
  chk('el guardado lleva el sello de la fila que se leyó', r.fallo.rev===4, r.fallo);
  chk('«🗑 Quitar anuncio» guarda la fila con el texto vacío: no hay anuncio, ni aviso, ni botón marcado, y el grito se cierra', r.gritando && r.id==='__anuncio__' && r.t==='' && r.leido===null && !r.aviso && !r.btnOn && !r.grito, r);
  r = await ev(page, () => { UNLOCKED=false; quienRol(''); var s0=_sirenas; ANUNCIO.ult=0; anuncioTic(); asisRefrescar(); return { g:GRITO(), sir:_sirenas-s0 }; });
  await page.clock.runFor(4*60000);
  r2 = await ev(page, () => ({ g:GRITO(), gl:GLOBO(), sir:_sirenas }));
  chk('quitado, Eduardo ya no lo grita ni lo recuerda (ni a los 4 minutos)', !r.g.ve && r.sir===0 && !r2.g.ve && !(r2.gl.ve && r2.gl.anu), [r, r2.g.ve, r2.gl]);
  await page.close();

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e => { console.error(e); process.exit(1); });
