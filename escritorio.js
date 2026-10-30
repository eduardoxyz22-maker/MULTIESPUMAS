/* ============================================================================================================================
   🖥️ EL PANEL COMO PROGRAMA (25) Y LOS AVISOS DE WINDOWS (26) — §4ns, 29/10/2026
   El dueño, del muestrario 24-33 y con la explicación de nuevo: «ok todas menos la 24, ármalo y pasame el js para que lo revise».
   Archivo APARTE (como `productos-mes.js`): se carga con `<script src="escritorio.js?v=…" defer>` al final de `pedidos.html`, después
   de todo lo demás, así que acá se pueden usar las funciones del panel. ⚠️ Al cambiarlo, subir el `?v=` de esa línea (si no, la compu
   sigue con el viejo en caché) y validarlo aparte con `node --check escritorio.js`.

   ⚠️ (30/10, §4nt, captura del dueño desde el iPhone: «¿dónde está mi botón instalar app?») El botón «📲 Instalar» está SIEMPRE mientras no
   esté instalado (`yaInstalado`): con el pedido del navegador, un clic; si no (iPhone/iPad, o Chrome que todavía no lo ofreció), la guía
   `guiaHtml` con tres pasos grandes y el dibujo de lo que hay que tocar, según el aparato (`aparato`). «Ya lo instalé» / `appinstalled` lo
   anotan en `me_esc_inst`. Y `.esc-banner[hidden]` lleva su regla: sin ella, el cartel escondido se veía como un recuadro vacío.
   25 · 📲 INSTALAR EL PANEL EN LA COMPU (una «aplicación web»): con `manifest.webmanifest` + `sw.js` + los íconos de `iconos/`, Chrome y
        Edge ofrecen «Instalar Panel MultiEspumas»: queda un ícono en el escritorio y el panel se abre en su propia ventana, sin la barra
        del navegador. Es la MISMA página: `sw.js` NO guarda copias del panel (siempre va a internet; sin internet muestra un cartel), así
        que lo que se publica se ve igual que en el navegador. Acá: el botón «📲 Instalar» (el evento `beforeinstallprompt`), y avisar
        cuando quedó instalado.
   26 · 🔔 AVISOS EN LA ESQUINA DE LA PANTALLA (las notificaciones de Windows), aunque se esté en el Excel o en otra pestaña:
        · 💬 un cliente le contestó al bot (lo de `WA_RESP` sin atender: el de la vendedora elegida; logística/administración, todos);
        · 🧾 Contabilidad le dejó un aviso de un pago a la vendedora (`ctaAvAbiertos`);
        · 📥 le entró una venta de Kommo para completar (`borradoresDe`);
        · 📦 a logística, desde las 10:00 de un día hábil, si todavía no se subió el Excel del depósito de HOY (`STOCK.c.f`);
        · 📢 un anuncio nuevo de Administración (`anuncioLeer`).
        Cada persona elige cuáles quiere en ESA compu (`me_esc_tipos`). Lo que ya se vio no se repite (`me_esc_vistos`, 10 días): al abrir
        la página, lo que ya estaba se da por visto sin avisar (lo muestran Bloki y los carteles de siempre). Con el panel a la vista y en
        foco, en vez de la notificación sale un aviso de los de siempre (`toast`). Tocar la notificación trae el panel adelante y abre lo
        que nombra.
        · Con el panel ESCONDIDO (otra pestaña, minimizado) el panel no se refresca solo (`autoRefrescar` no lee con `document.hidden`):
          con los avisos prendidos se lee la planilla cada `ESC_OCULTO_MS` (3 min; la lectura de «lo cambiado», ~1 KB) y las respuestas al
          bot. Sin avisos prendidos no lee nada de más.
        · Windows pide permiso la primera vez (solo al tocar «Prender los avisos»: nunca se pide solo). Si la persona lo bloqueó, se dice
          cómo volver a permitirlo.
   SOLO MIRA: no escribe nada en la planilla, no cambia ninguna cuenta ni ningún pedido.
   En Playwright (navigator.webdriver) no hace nada salvo `window.ESC_PRUEBA`. `tests/test_escritorio.js`.
   ============================================================================================================================ */
(function(){
'use strict';
var ESC_OCULTO_MS=180000, ESC_TIC_MS=30000, ESC_VISTOS_DIAS=10, ESC_NO_DIAS=7, ESC_EXCEL_HORA=10, ESC_GRACIA_MS=90000,
    ESC_LECTURA_TOPE_MS=60000, ESC_RENUEVA_MS=864e5, ESC_DESTINO_MS=120000;
var LS_TIPOS='me_esc_tipos', LS_VISTOS='me_esc_vistos', LS_NO='me_esc_no', LS_INST='me_esc_inst';
var TIPOS=[
  { k:'bot',     ic:'💬', t:'Un cliente le contestó al bot',             s:'lo que escribe el cliente al WhatsApp del bot y necesita una persona' },
  { k:'conta',   ic:'🧾', t:'Contabilidad me avisa de un pago',          s:'un pago que Contabilidad te pide revisar o corregir' },
  { k:'kommo',   ic:'📥', t:'Me entró una venta de Kommo',               s:'una venta de Kommo para completar en el panel' },
  { k:'excel',   ic:'📦', t:'Falta el Excel de hoy (logística)',         s:'desde las 10:00, si todavía no se subió el Excel del depósito de hoy' },
  { k:'anuncio', ic:'📢', t:'Un anuncio nuevo de Administración',        s:'lo que Administración le dice a todo el equipo' }
];
var ESC={ instalar:null, reg:null, sembrado:false, ultLectura:0, leyendo:false, timer:null, t0:Date.now(), qk:null, perm:null, pend:null, pendT:0, pendTimer:null };
window.ESC=ESC; window.ESC_TIPOS=TIPOS;

function activo(){ try{ return !(navigator.webdriver && !window.ESC_PRUEBA); }catch(e){ return true; } }
function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSet(k, v){ try{ if(v==null) localStorage.removeItem(k); else localStorage.setItem(k, v); }catch(e){} }
function lsJson(k, def){ try{ var o=JSON.parse(lsGet(k)||'null'); return (o && typeof o==='object') ? o : def; }catch(e){ return def; } }
function e_(s){ return (typeof esc==='function') ? esc(s) : String(s==null?'':s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
/* el día de Bolivia (como el Excel del día, `existNoEsDeHoy`), no el reloj de la compu */
function hoy(){ try{ if(typeof diaNegocio==='function') return diaNegocio(); return todayStr(); }catch(e){ return new Date().toISOString().slice(0,10); } }

/* ---------- 25 · instalar ---------- */
function instalado(){
  try{ if(window.matchMedia && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: window-controls-overlay)').matches)) return true; }catch(e){}
  return !!navigator.standalone;
}
/* ya lo instaló desde esta pestaña (Chrome lo dice con `appinstalled`) o tocó «Ya lo instalé» en la guía: la pestaña del navegador sigue
   siendo una pestaña, pero no se le vuelve a ofrecer */
function yaInstalado(){ return instalado() || lsGet(LS_INST)==='1'; }
/* ¿Qué aparato y qué navegador? Para la guía: en el iPhone y el iPad NINGÚN navegador deja que una página se instale sola (Apple no lo
   permite), así que ahí son tres toques que hay que enseñar; en Chrome y Edge, cuando el navegador lo ofrece, se instala con un clic. */
function aparato(){
  var ua=navigator.userAgent||'', ios=/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints||0)>1), and=/Android/i.test(ua);
  var nav=/EdgiOS|EdgA\/|Edg\//.test(ua) ? 'edge' : /CriOS/.test(ua) ? 'chrome' : /FxiOS|Firefox\//.test(ua) ? 'firefox' : /SamsungBrowser/.test(ua) ? 'samsung'
        : ios ? 'safari' : /Chrome\/|Chromium/.test(ua) ? 'chrome' : /Safari\//.test(ua) ? 'safari' : 'otro';
  return { tipo:ios ? 'ios' : (and ? 'android' : 'compu'), nav:nav };
}
function puedeSw(){ return ('serviceWorker' in navigator) && (location.protocol==='https:' || location.hostname==='localhost' || location.hostname==='127.0.0.1'); }
function registrarSw(){
  if(!puedeSw()) return Promise.resolve(null);
  /* el alcance es SOLO pedidos.html: el dashboard de ventas (index.html), la guía y los demás no quedan adentro */
  return navigator.serviceWorker.register('sw.js', { scope:'pedidos.html' }).then(function(r){ ESC.reg=r; return r; }, function(){ return null; });
}
window.addEventListener('beforeinstallprompt', function(e){
  if(!activo()) return;
  e.preventDefault(); ESC.instalar=e; bannerPintar(); ajustesRepintar();
});
window.addEventListener('appinstalled', function(){
  ESC.instalar=null; lsSet(LS_INST, '1'); bannerPintar(); ajustesRepintar();
  aviso('✅ Listo: el panel quedó instalado. Lo abrís con su ícono, en su propia ventana.', 'ok');
});
/* 📲 El botón: con el pedido del navegador (Chrome/Edge en la compu y en Android), un clic y listo; sin él (iPhone, iPad, o un navegador
   que todavía no lo ofreció), la guía paso a paso con dibujos. El botón está SIEMPRE mientras no esté instalado. */
function escInstalar(){
  var ev=ESC.instalar;
  if(!ev){ guiaAbrir(); return; }
  ESC.instalar=null;
  try{ ev.prompt(); }catch(err){ guiaAbrir(); return; }
  (ev.userChoice||Promise.resolve({})).then(function(r){
    if(r && r.outcome==='accepted') return;
    /* el navegador da UN solo pedido por carga de la página: dicho que no, el mismo botón abre la guía */
    bannerPintar(); ajustesRepintar();
    aviso('Cuando quieras, tocá otra vez «📲 Instalar»: te muestro cómo, paso a paso.', 'ok');
  });
}

/* ---------- la guía para instalar: tres pasos grandes, con el dibujo de lo que hay que tocar ---------- */
var ICO={
  share:'<svg viewBox="0 0 24 24" fill="none" stroke="#007AFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M7.5 10H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1.5"/></svg>',
  mas:'<svg viewBox="0 0 24 24" fill="none" stroke="#1f2d2d" stroke-width="2" stroke-linecap="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><path d="M12 8v8M8 12h8"/></svg>',
  pv:'<svg viewBox="0 0 24 24" fill="#1f2d2d"><circle cx="12" cy="5" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="12" cy="19" r="2.2"/></svg>',
  ph:'<svg viewBox="0 0 24 24" fill="#1f2d2d"><circle cx="5" cy="12" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="19" cy="12" r="2.2"/></svg>',
  menu:'<svg viewBox="0 0 24 24" fill="none" stroke="#1f2d2d" stroke-width="2.2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  compu:'<svg viewBox="0 0 24 24" fill="none" stroke="#1f2d2d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/><path d="M12 7v5M9.5 9.5 12 12l2.5-2.5"/></svg>',
  ok:'<svg viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M7.5 12.5l3 3 6-6.5"/></svg>'
};
function boton(t){ return '<span class="esc-g-btn">'+t+'</span>'; }
function guiaPasos(tipo, nav){
  var finCel='Aparece el ícono del panel en tu pantalla, como el de WhatsApp. <b>Desde ahora abrí el panel con ese ícono.</b>';
  if(tipo==='ios'){
    var donde=nav==='chrome' ? 'Está al lado de la dirección de la página, arriba o abajo de la pantalla.'
      : nav==='safari' ? 'En el iPhone está abajo; en el iPad, arriba a la derecha. Si no lo ves, tocá primero los tres puntitos <b>•••</b>.'
      : 'Está en el menú del navegador (los tres puntitos o las tres rayitas).';
    return { pasos:[
      { ic:'share', t:'Tocá el botón <b>Compartir</b>', s:'Es un cuadradito con una flecha para arriba. '+donde },
      { ic:'mas', t:'Tocá <b>«Agregar a inicio»</b>', s:'Si no lo ves, deslizá la lista para arriba. También puede decir «Agregar a la pantalla de inicio».' },
      { ic:'ok', t:'Tocá '+boton('Agregar'), s:'Arriba a la derecha.' }
    ], fin:finCel+'<br>Abrilo desde el ícono y ahí te deja prender los avisos.', nota:'El iPhone y el iPad no dejan que una página se instale sola: por eso son estos tres toques.' };
  }
  if(tipo==='android'){
    if(nav==='samsung') return { pasos:[
      { ic:'menu', t:'Tocá el menú <b>☰</b>', s:'Abajo a la derecha.' },
      { ic:'mas', t:'Tocá <b>«Agregar página a»</b> y después <b>«Pantalla de inicio»</b>' },
      { ic:'ok', t:'Tocá '+boton('Agregar') }
    ], fin:finCel };
    return { pasos:[
      { ic:'pv', t:'Tocá los <b>tres puntitos ⋮</b>', s:'Arriba a la derecha.' },
      { ic:'mas', t:'Tocá <b>«Instalar app»</b>', s:'Si no está, tocá «Agregar a la pantalla principal».' },
      { ic:'ok', t:'Tocá '+boton('Instalar') }
    ], fin:finCel };
  }
  var finCompu='Queda un ícono en el escritorio y en el menú Inicio. <b>Desde ahora abrí el panel con ese ícono:</b> se abre en su propia ventana.';
  if(nav==='edge') return { pasos:[
    { ic:'ph', t:'Arriba a la derecha, hacé clic en los <b>tres puntitos ⋯</b>' },
    { ic:'compu', t:'Elegí <b>«Aplicaciones»</b> y después <b>«Instalar este sitio como una aplicación»</b>' },
    { ic:'ok', t:'Hacé clic en '+boton('Instalar') }
  ], fin:finCompu };
  if(nav==='safari') return { pasos:[
    { ic:'compu', t:'Arriba, en el menú, hacé clic en <b>«Archivo»</b>' },
    { ic:'mas', t:'Elegí <b>«Agregar al Dock»</b>' },
    { ic:'ok', t:'Hacé clic en '+boton('Agregar') }
  ], fin:'Queda un ícono en el Dock. <b>Desde ahora abrí el panel con ese ícono.</b>' };
  if(nav==='firefox' || nav==='otro') return { no:true };
  return { pasos:[
    { ic:'pv', t:'Arriba a la derecha, hacé clic en los <b>tres puntitos ⋮</b>' },
    { ic:'compu', t:'Elegí <b>«Transmitir, guardar y compartir»</b> y después <b>«Instalar página como aplicación»</b>', s:'En algunas compus dice «Instalar Panel MultiEspumas». También sirve el ícono de la compu con la flechita, a la derecha de la dirección.' },
    { ic:'ok', t:'Hacé clic en '+boton('Instalar') }
  ], fin:finCompu };
}
var GUIA={ tipo:null };
function guiaHtml(){
  var A=aparato(), t=GUIA.tipo||A.tipo, nav=(t===A.tipo) ? A.nav : (t==='ios' ? 'safari' : 'chrome'), G=guiaPasos(t, nav);
  var tabs=[['ios','📱 iPhone o iPad'],['android','🤖 Android'],['compu','💻 Compu']].map(function(x){
    return '<button type="button" aria-pressed="'+(x[0]===t)+'" onclick="escGuia(\''+x[0]+'\')">'+x[1]+'</button>'; }).join('');
  var cuerpo=G.no
    ? '<div class="esc-g-fin esc-g-no"><span style="font-size:2rem">🌐</span><div>Este navegador no instala el panel.<br><b>Abrí el panel en Google Chrome</b> y tocá otra vez «📲 Instalar».</div></div>'
    : '<ol class="esc-g-pasos">'+G.pasos.map(function(p, i){
        return '<li class="esc-g-paso"><span class="esc-g-n">'+(i+1)+'</span><span class="esc-g-ic" aria-hidden="true">'+ICO[p.ic]+'</span>'+
          '<span class="esc-g-t">'+p.t+(p.s ? '<small class="esc-g-s">'+p.s+'</small>' : '')+'</span></li>'; }).join('')+'</ol>'+
      '<div class="esc-g-fin"><img src="iconos/panel-192.png" alt=""><div>✅ '+G.fin+'</div></div>'+
      (G.nota ? '<p class="esc-chico" style="margin:0">'+G.nota+'</p>' : '');
  return '<div class="modal-h"><h3>📲 Poné el panel en tu pantalla</h3><button class="modal-x" onclick="closeModal()" aria-label="Cerrar">✕</button></div>'+
    '<div class="modal-b esc-g">'+
      '<p class="esc-g-intro">Son <b>3 toques</b>. Después lo abrís con su ícono, como WhatsApp.</p>'+
      '<div class="esc-g-tabs" role="group" aria-label="Tu aparato">'+tabs+'</div>'+cuerpo+
      '<div class="modal-actions"><button type="button" class="btn btn-ghost btn-sm" onclick="escYaInstale()">✅ Ya lo instalé</button><span style="flex:1"></span>'+
        '<button type="button" class="btn btn-primary btn-sm" onclick="closeModal()">Entendido</button></div>'+
    '</div>';
}
function guiaAbrir(tipo){ GUIA.tipo=tipo||null; try{ openModal(guiaHtml()); }catch(e){} }
function escYaInstale(){ lsSet(LS_INST, '1'); try{ closeModal(); }catch(e){} bannerPintar(); aviso('✅ Listo. Desde ahora abrí el panel con su ícono.', 'ok'); }
window.escGuia=guiaAbrir; window.escYaInstale=escYaInstale; window.escAparato=aparato;

/* ---------- 26 · avisos ---------- */
function permiso(){ try{ return ('Notification' in window) ? Notification.permission : 'nohay'; }catch(e){ return 'nohay'; } }
function tipos(){ var o=lsJson(LS_TIPOS, null); if(!o){ o={}; TIPOS.forEach(function(t){ o[t.k]=1; }); } return o; }
function tipoOn(k){ return !!tipos()[k]; }
function escTipo(k, si, el){
  var o=tipos(); o[k]=si?1:0; lsSet(LS_TIPOS, JSON.stringify(o));
  if(si) sembrar(true);   // prender uno: lo que ya había no llueve
  /* desde la ventana: solo el renglón (redibujar la ventana entera le sacaba el foco a la casilla) */
  var lb=el && el.closest ? el.closest('label') : null;
  if(lb) lb.classList.toggle('on', !!si); else ajustesRepintar();
}
function prendidos(){ return activo() && permiso()==='granted' && TIPOS.some(function(t){ return tipoOn(t.k); }); }
function vistos(){ var o=lsJson(LS_VISTOS, {}), lim=Date.now()-ESC_VISTOS_DIAS*864e5, out={};
  Object.keys(o).forEach(function(k){ if(Number(o[k])>lim) out[k]=o[k]; }); return out; }
function vistosPoner(o){ lsSet(LS_VISTOS, JSON.stringify(o)); }
function escPrender(){
  if(permiso()==='nohay'){ aviso('Este navegador no tiene avisos de Windows. Probá con Chrome o Edge.', 'err'); return Promise.resolve(false); }
  if(permiso()==='denied'){ ajustesAbrir(); return Promise.resolve(false); }
  /* los Safari viejos contestan por la función que se les pasa y no devuelven nada; los de ahora, una promesa: las dos */
  var p=new Promise(function(res){
    var hecho=false, fin=function(r){ if(!hecho){ hecho=true; res(r); } };
    try{ var q=Notification.requestPermission(fin); if(q && typeof q.then==='function') q.then(fin, function(){ fin(permiso()); }); }
    catch(e){ fin(permiso()); }
  });
  return p.then(function(r){
    r=r||permiso(); ESC.perm=permiso();
    if(r==='granted'){
      sembrar(true);
      aviso('🔔 Avisos prendidos en esta compu. Te llegan aunque estés en otra cosa.', 'ok');
      mostrar({ k:'prueba|'+Date.now(), tipo:'prueba', t:'🔔 Así te van a llegar los avisos', b:'Tocá un aviso y se abre el panel en lo que dice.' }, true);
    } else if(r==='denied') aviso('Windows no dejó prender los avisos. En «Avisos de Windows» te digo cómo permitirlos.', 'err');
    bannerPintar(); ajustesRepintar(); arrancar();
    return r==='granted';
  });
}
function escProbar(){
  if(permiso()!=='granted'){ escPrender(); return; }
  mostrar({ k:'prueba|'+Date.now(), tipo:'prueba', t:'🔔 Aviso de prueba', b:'Así se ve un aviso del panel. Tocalo y se abre el panel.' }, true);
}

/* Lo que hay ahora para avisar, con una clave por cosa (la misma cosa = la misma clave en todos los aparatos) */
function quienSoy(){ var v=''; try{ v=asisVendedor(); }catch(e){} var adm=false; try{ adm=asisVeAdm(); }catch(e){} return { v:v, adm:adm }; }
function corto(s, n){ s=String(s||'').replace(/\s+/g,' ').trim(); return s.length>n ? (s.slice(0, n-1)+'…') : s; }
function nombre(s){ return String(s||'').trim().split(/\s+/).slice(0,2).join(' '); }
/* las funciones del panel que se usan adentro de un bloque: si una faltara, el `try` se tragaría el bloque entero (no un aviso) */
function mismaVend(a, b){ if(typeof mismoVendedor==='function') return mismoVendedor(a, b); return String(a||'').trim().toLowerCase()===String(b||'').trim().toLowerCase(); }
function fechaCorta(f){ return (typeof fmtFechaCorta==='function') ? fmtFechaCorta(f) : String(f||''); }
function pendientes(){
  var Q=quienSoy(), L=[];
  // 💬 respuestas al bot sin atender
  try{
    if(typeof WA_RESP!=='undefined' && Array.isArray(WA_RESP)) WA_RESP.forEach(function(r){
      if(!r || r.at || !r.w) return;
      var p=(typeof waRespPed==='function') ? waRespPed(r) : null;
      if(!Q.adm && !(Q.v && p && mismaVend(p.vendedor, Q.v))) return;
      /* la clave es por MENSAJE (cada mensaje nuevo avisa); el `tag`, por cliente: en la esquina queda el último de cada uno, no una pila */
      L.push({ k:'bot|'+r.w, tag:'bot|'+(r.num || r.id || r.w), tipo:'bot', id:p ? String(p.id) : '', kd:r.urg ? 'err' : 'ok',
        t:'💬 '+(nombre(r.nom || (p && p.cliente)) || 'Un cliente')+' le contestó al bot'+(r.urg?' · 🚨 urgente':''),
        b:'«'+corto(r.txt, 120)+'»'+(p && p.oc ? (' · OC '+p.oc) : '') });
    });
  }catch(e){}
  // 🧾 avisos de Contabilidad a la vendedora
  try{
    if(Q.v && typeof ctaAvAbiertos==='function') ctaAvAbiertos(Q.v).forEach(function(a){
      L.push({ k:'conta|'+(a.id||(a.k+'|'+a.t)), tipo:'conta', id:String(a.pid||''), kd:'warn',
        t:'🧾 Contabilidad te pide revisar un pago', b:corto((a.cli?(a.cli+' · '):'')+(a.txt||''), 140) });
    });
  }catch(e){}
  // 📥 ventas de Kommo para completar
  try{
    if(Q.v && typeof borradoresDe==='function') borradoresDe(Q.v).forEach(function(p){
      L.push({ k:'kommo|'+p.id, tipo:'kommo', id:String(p.id), t:'📥 Te entró una venta de Kommo', b:'Completala en Mis pedidos: '+corto(p.cliente||'(sin nombre)', 60) });
    });
  }catch(e){}
  // 📦 el Excel de hoy (logística)
  try{
    var h=hoy(), hb=(typeof horaBolivia==='function') ? horaBolivia() : new Date();
    if(Q.adm && (typeof diaHabil!=='function' || diaHabil(h)) && hb.getHours()>=ESC_EXCEL_HORA && typeof STOCK!=='undefined' && STOCK){
      var cf=(STOCK.c && STOCK.c.f) || '';
      if(cf!==h) L.push({ k:'excel|'+h, tipo:'excel', kd:'warn', t:'📦 Falta el Excel de hoy', b:cf ? ('El último del depósito es del '+fechaCorta(cf)+'. Subilo en Stock → 📥 Subir existencias.') : 'Subí el Excel del depósito en Stock → 📥 Subir existencias.' });
    }
  }catch(e){}
  // 📢 un anuncio
  try{
    var an=(typeof anuncioLeer==='function') ? anuncioLeer() : null;
    if(an && an.ts && Date.now()-an.ts<864e5) L.push({ k:'anuncio|'+an.ts, tipo:'anuncio', t:'📢 Anuncio'+(an.por?(' de '+nombre(an.por)):''), b:corto(an.t, 160) });
  }catch(e){}
  return L.filter(function(x){ return tipoOn(x.tipo); });
}
function listo(){ try{ return typeof STATE!=='undefined' && Array.isArray(STATE) && (typeof ULTIMO_REFRESCO==='undefined' || ULTIMO_REFRESCO>0); }catch(e){ return false; } }
/* Lo que ya está se da por visto (al abrir la página y al prender los avisos): se avisa solo lo que llega DESPUÉS. */
function sembrar(forzar){
  if(ESC.sembrado && !forzar) return;
  if(!listo()) return;
  var V=vistos(), n=Date.now(), cambio=false;
  pendientes().forEach(function(x){ if(!V[x.k]){ V[x.k]=n; cambio=true; } });
  if(cambio) vistosPoner(V);   // en los 90 s de gracia corre en cada vuelta: sin nada nuevo, no se escribe
  ESC.sembrado=true;
}
function revisar(){
  if(!prendidos() || !listo()) return [];
  /* Al abrir la página (los primeros `ESC_GRACIA_MS`: la planilla y las respuestas al bot llegan en dos lecturas) y al cambiar de
     vendedora en Mis pedidos, lo que hay se da por visto: si no, abrir el panel o elegir otro nombre era una lluvia de avisos viejos. */
  var q=quienSoy(), qk=q.v+'|'+(q.adm?1:0);
  if(!ESC.sembrado || qk!==ESC.qk || Date.now()-ESC.t0<ESC_GRACIA_MS){ sembrar(true); ESC.qk=qk; return []; }
  var V=vistos(), n=Date.now(), P=pendientes(), renovo=false;
  /* lo que sigue pendiente no se olvida a los 10 días (una respuesta al bot sin atender volvería a avisar): se renueva una vez por día */
  P.forEach(function(x){ if(V[x.k] && n-Number(V[x.k])>ESC_RENUEVA_MS){ V[x.k]=n; renovo=true; } });
  var nuevos=P.filter(function(x){ return !V[x.k]; });
  if(!nuevos.length){ if(renovo) vistosPoner(V); return []; }
  nuevos.forEach(function(x){ V[x.k]=n; }); vistosPoner(V);   // ANTES de mostrar: otra pestaña no lo repite
  /* varios a la vez (volvió la señal, la compu despertó): un aviso por cosa hasta 3; más, uno solo que los cuenta */
  if(nuevos.length>3) mostrar({ k:'varios|'+n, tipo:nuevos[0].tipo, kd:nuevos.some(function(x){ return x.kd==='err'; }) ? 'err' : 'ok', t:'🔔 '+nuevos.length+' cosas nuevas en el panel',
    b:nuevos.slice(0,4).map(function(x){ return x.t.replace(/^\S+\s/,''); }).join(' · ') });
  else nuevos.forEach(function(x){ mostrar(x); });
  return nuevos;
}
function enFoco(){ try{ return document.visibilityState==='visible' && document.hasFocus(); }catch(e){ return false; } }
function mostrar(x, siempre){
  if(!siempre && enFoco()){ aviso(x.t+' — '+x.b, x.kd||'ok'); return; }   // mirando el panel: el aviso de siempre, en rojo si es urgente
  /* sin `badge`: es el dibujito de la barra de Android y tiene que ser de un solo color; en Windows no se usa */
  var tag=x.tag||x.k;
  var op={ body:x.b, tag:tag, icon:'iconos/panel-192.png', data:{ tipo:x.tipo, id:x.id||'', k:x.k }, renotify:tag!==x.k };
  if(ESC.reg && ESC.reg.showNotification){ ESC.reg.showNotification(x.t, op).catch(function(){ mostrarDirecto(x, op); }); return; }
  mostrarDirecto(x, op);
}
function mostrarDirecto(x, op){
  try{ var no=new Notification(x.t, op); no.onclick=function(){ try{ window.focus(); }catch(e){} ir(op.data); no.close(); }; }catch(e){}
}
/* Tocar el aviso: el panel adelante y lo que nombra a la vista */
function ir(d){
  d=d||{};
  try{
    if(d.tipo==='bot'){ if(typeof botVe==='function' && botVe()) showView('bot'); else { showView('mis'); if(d.id && findById(d.id)) showMisModal(d.id); } }
    else if(d.tipo==='conta'){ showView('mis'); if(d.id && findById(d.id)) showMisModal(d.id); }
    else if(d.tipo==='kommo'){ showView('mis'); }
    else if(d.tipo==='excel'){ showView('admin'); if(typeof abrirStock==='function') abrirStock(); }
    else if(d.tipo==='anuncio'){   // el globo de Bloki con el anuncio (el grito grande es UNA vez al entrar, §4kw)
      var an=(typeof anuncioLeer==='function') ? anuncioLeer() : null;
      if(an && typeof anuncioRecordar==='function') anuncioRecordar(an);
    }
  }catch(e){}
}
window.escIr=ir;
/* Con el panel CERRADO, `sw.js` lo abre con `pedidos.html#esc=<tipo>&id=<id>`: se lee una vez, se borra de la dirección y se abre
   recién cuando llegó la planilla (si no, `findById` no encuentra el pedido nuevo). */
function destinoDeHash(){
  var m=/^#esc=([^&]*)(?:&id=(.*))?$/.exec(location.hash||'');
  if(!m) return null;
  try{ history.replaceState(null, '', location.pathname+location.search); }catch(e){}
  try{ return { tipo:decodeURIComponent(m[1]||''), id:decodeURIComponent(m[2]||'') }; }catch(e){ return null; }
}
function irPendiente(){
  if(!ESC.pend) return true;
  if(!listo() && Date.now()-ESC.pendT<ESC_DESTINO_MS) return false;   // sin planilla en 2 min: se abre igual lo que se pueda
  var d=ESC.pend; ESC.pend=null; ir(d); return true;
}
function esperarDestino(d){
  if(!d || !d.tipo) return;
  ESC.pend=d; ESC.pendT=Date.now();
  if(ESC.pendTimer) clearInterval(ESC.pendTimer);
  ESC.pendTimer=setInterval(function(){ if(irPendiente()){ clearInterval(ESC.pendTimer); ESC.pendTimer=null; } }, 1000);
}
window.escDestinoDeHash=destinoDeHash; window.escIrPendiente=irPendiente; window.escEsperarDestino=esperarDestino;

/* El permiso cambiado desde afuera (el candado 🔒 de la barra, la configuración de Windows): el cartel y la ventana se ponen al día, y
   al quedar permitido lo que ya había se da por visto (si no, llovían los avisos de lo que pasó mientras estaba apagado). */
function permMirar(){
  var pm=permiso();
  if(ESC.perm!==null && pm!==ESC.perm){ if(pm==='granted') sembrar(true); ESC.perm=pm; ajustesRepintar(); }
  ESC.perm=pm; bannerPintar();
}
/* Con el panel escondido no se lee solo: con los avisos prendidos, cada `ESC_OCULTO_MS` */
function tic(){
  permMirar();
  irPendiente();
  if(ESC.leyendo && Date.now()-ESC.ultLectura>ESC_LECTURA_TOPE_MS+5000) ESC.leyendo=false;   // una lectura que nunca contestó no traba las siguientes
  if(!prendidos()) return;
  var oculto=document.hidden, ult=Math.max(ESC.ultLectura, (typeof ULTIMO_REFRESCO==='number') ? ULTIMO_REFRESCO : 0);
  if(oculto && !ESC.leyendo && typeof CONNECTED!=='undefined' && CONNECTED && Date.now()-ult>=ESC_OCULTO_MS && !(typeof autoOcupado==='function' && autoOcupado())){
    ESC.leyendo=true; ESC.ultLectura=Date.now();
    /* la planilla y las respuestas al bot a la vez, y se revisa cuando llegaron las DOS (si no, lo del bot avisaba en la vuelta siguiente) */
    var lect=Promise.all([
      Promise.resolve().then(function(){ return refrescarEstado(); }).catch(function(){}),
      Promise.resolve().then(function(){ return (typeof waRespTraer==='function') ? waRespTraer(true) : null; }).catch(function(){})
    ]);
    var tope=new Promise(function(res){ setTimeout(res, ESC_LECTURA_TOPE_MS); });   // `refrescarEstado` ya corta a los 45 s; esto, por las dudas
    Promise.race([lect, tope]).then(function(){ ESC.leyendo=false; revisar(); });
    return;
  }
  revisar();
}
function arrancar(){ if(ESC.timer || !activo()) return; ESC.timer=setInterval(tic, ESC_TIC_MS); }

/* ---------- lo que se ve: el cartel de arriba y la ventana de ajustes ---------- */
function aviso(t, k){ try{ toast(t, k||'ok', 7000); }catch(e){} }
function noHasta(){ return Number(lsGet(LS_NO))||0; }
function bannerPintar(){
  var b=document.getElementById('esc-banner');
  if(!b){ var c=document.getElementById('carga-banner'); if(!c || !c.parentNode) return; b=document.createElement('div'); b.id='esc-banner'; b.className='esc-banner'; b.hidden=true; c.parentNode.insertBefore(b, c.nextSibling); }
  /* 📲 mientras no esté instalado, el botón está SIEMPRE (con el navegador que lo ofrece, un clic; si no, la guía); 🔔 si los avisos
     todavía no se prendieron (en el iPhone, solo con el panel instalado: el navegador no tiene avisos) */
  var inst=!yaInstalado(), notif=permiso()==='default';
  var ver=activo() && (inst || notif) && Date.now()>noHasta();
  b.hidden=!ver; if(!ver){ b.innerHTML=''; b._h=''; return; }
  var A=aparato();
  var tit=inst ? ('📲 Poné el panel en tu '+(A.tipo==='compu' ? 'escritorio' : 'pantalla')) : '🔔 Que el panel te avise';
  var sub=inst ? ('Así lo abrís con un toque, como WhatsApp.'+(notif ? ' Y te avisa cuando un cliente contesta.' : ''))
               : 'Un aviso en la esquina de la pantalla cuando un cliente contesta, hay un pago para revisar o te entra una venta de Kommo.';
  var h='<img class="esc-b-logo" src="iconos/panel-192.png" alt=""><div class="esc-b-tx"><b>'+tit+'</b><small>'+sub+'</small></div>'+
    '<div class="esc-b-acc">'+(inst ? '<button type="button" class="esc-b-p esc-b-gr" onclick="escInstalar()">📲 Instalar</button>' : '')+
      (notif ? '<button type="button" class="'+(inst ? 'esc-b-s' : 'esc-b-p esc-b-gr')+'" onclick="escPrender()">🔔 '+(inst ? 'Avisos' : 'Prender los avisos')+'</button>' : '')+
      '<button type="button" class="esc-b-x" onclick="escBannerNo()" title="Vuelve en '+ESC_NO_DIAS+' días">Ahora no</button></div>';
  if(b._h!==h){ b.innerHTML=h; b._h=h; }
}
function escBannerNo(){ lsSet(LS_NO, String(Date.now()+ESC_NO_DIAS*864e5)); bannerPintar(); }
var AJ_ABIERTA=false;
function ajustesHtml(){
  var p=permiso(), inst=instalado(), T=tipos();
  var est=function(ok, si, no){ return '<span class="esc-est '+(ok?'ok':'no')+'">'+(ok?si:no)+'</span>'; };
  var nav=/Edg\//.test(navigator.userAgent) ? 'Edge' : 'Chrome';
  var instTxt=inst ? 'Estás usando el panel instalado: se abre con su ícono, en su propia ventana.'
    : 'Tocá «📲 Instalar el panel»: si el navegador lo deja, se instala con un clic; si no, te muestro cómo, paso a paso.';
  var pTxt=p==='granted' ? 'Prendidos en esta compu.' : p==='denied' ? ('Están <b>bloqueados</b> para el panel. Para permitirlos: tocá el candado 🔒 a la izquierda de la dirección → <b>Notificaciones</b> → <b>Permitir</b>, y recargá. En Windows, además: Configuración → Sistema → Notificaciones → '+nav+' prendido.')
    : p==='nohay' ? (aparato().tipo==='ios' ? 'En el iPhone y el iPad los avisos andan solo con el panel instalado: tocá «📲 Instalar el panel» y después abrilo desde su ícono.' : 'Este navegador no tiene avisos. Usá Chrome o Edge.')
    : 'Todavía apagados: tocá «🔔 Prender los avisos» y Windows te pregunta si dejás.';
  return '<div class="modal-h"><h3>🖥️ El panel en esta compu</h3><button class="modal-x" onclick="closeModal()" aria-label="Cerrar">✕</button></div>'+
    '<div class="modal-b esc-aj">'+
      '<div class="esc-sec"><div class="esc-st"><b>📲 Como programa</b>'+est(inst, 'Instalado', 'No instalado')+'</div><p>'+instTxt+'</p>'+
        (!inst ? '<button type="button" class="btn btn-primary btn-sm" onclick="escInstalar()">📲 Instalar el panel</button>' : '')+
        '<p class="esc-chico">Es la misma página de siempre: cada vez que se publica algo, se ve igual. No guarda copias viejas.</p></div>'+
      '<div class="esc-sec"><div class="esc-st"><b>🔔 Avisos de Windows</b>'+est(p==='granted', 'Prendidos', p==='denied' ? 'Bloqueados' : 'Apagados')+'</div><p>'+pTxt+'</p>'+
        (p==='default' ? '<button type="button" class="btn btn-primary btn-sm" onclick="escPrender()">🔔 Prender los avisos</button>' : '')+
        (p==='granted' ? '<button type="button" class="btn btn-ghost btn-sm" onclick="escProbar()">Mandar un aviso de prueba</button>' : '')+
        '<div class="esc-tipos">'+TIPOS.map(function(t){
          return '<label class="'+(T[t.k]?'on':'')+'"><input type="checkbox"'+(T[t.k]?' checked':'')+' onchange="escTipo(\''+t.k+'\', this.checked, this)"><span><b>'+t.ic+' '+e_(t.t)+'</b><small>'+e_(t.s)+'</small></span></label>';
        }).join('')+'</div>'+
        '<p class="esc-chico">Lo que elegís queda en esta compu. Te avisa de lo tuyo: elegí tu nombre en «Mis pedidos» (logística y Administración ven las respuestas al bot de todos y el Excel del día). El panel tiene que estar abierto en alguna pestaña o instalado; con el panel a la vista, el aviso sale adentro del panel.</p></div>'+
      '<div class="modal-actions"><span style="flex:1"></span><button type="button" class="btn btn-sm" onclick="closeModal()">Listo</button></div>'+
    '</div>';
}
function ajustesAbrir(){ AJ_ABIERTA=true; try{ openModal(ajustesHtml()); }catch(e){} }
function ajustesRepintar(){
  var box=document.getElementById('modal-box'), ov=document.getElementById('modal');
  if(!AJ_ABIERTA || !box || !ov || !ov.classList.contains('on') || !box.querySelector('.esc-aj')){ AJ_ABIERTA=false; return; }
  var y1=ov.scrollTop, y2=box.scrollTop;   // redibujada, la ventana queda donde estaba
  openModal(ajustesHtml());
  ov.scrollTop=y1; box.scrollTop=y2;
}
window.escInstalar=escInstalar; window.escPrender=escPrender; window.escProbar=escProbar; window.escTipo=escTipo;
window.escAjustesAbrir=ajustesAbrir; window.escBannerNo=escBannerNo;
window.escPendientes=pendientes; window.escRevisar=revisar; window.escSembrar=sembrar; window.escTic=tic; window.escBannerPintar=bannerPintar;

/* el buscador (Ctrl+K): «Instalar el panel» y «Avisos de Windows» */
if(typeof window.palAcciones==='function'){
  var _pa=window.palAcciones;
  window.palAcciones=function(){
    var A=_pa.apply(this, arguments);
    if(!activo()) return A;
    return A.concat([
      { ic:'📲', t:'Instalar el panel', s:'un ícono en el escritorio y su propia ventana', q:'instalar programa icono escritorio aplicacion app ventana', fn:function(){ escInstalar(); } },
      { ic:'🔔', t:'Avisos de Windows', s:'que el panel te avise aunque estés en otra cosa', q:'avisos notificaciones windows alertas campana', fn:function(){ ajustesAbrir(); } }
    ]);
  };
}

/* ---------- arranque ---------- */
if(!activo()) return;
var css=document.createElement('style');
css.textContent=
  '.esc-banner[hidden]{display:none!important}'+   /* sin esto el cartel escondido se veía como un recuadro vacío (29/10, captura del dueño) */
  '.esc-banner{display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:#fff;border:1px solid #99DDD9;border-radius:16px;padding:10px 12px 10px 14px;margin:0 0 14px;box-shadow:0 1px 2px rgba(0,60,60,.05),0 4px 14px rgba(0,60,60,.045)}'+
  '.esc-b-ic{flex:none;width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:#E6F7F6;font-size:1.2rem}'+
  '.esc-b-tx{flex:1;min-width:200px;display:flex;flex-direction:column;gap:1px}.esc-b-tx b{font-size:.9rem;color:#1f2d2d}.esc-b-tx small{font-size:.76rem;color:#5d7473;line-height:1.4}'+
  '.esc-b-acc{display:flex;gap:6px;align-items:center;flex-wrap:wrap}'+
  '.esc-b-acc button{width:auto;font:inherit;font-weight:800;font-size:.78rem;border-radius:10px;padding:8px 13px;cursor:pointer;border:1px solid #99DDD9;background:#E6F7F6;color:#007a74;min-height:36px}'+
  '.esc-b-acc .esc-b-p{background:#00A09A;border-color:#00A09A;color:#fff}.esc-b-acc .esc-b-x{background:transparent;border-color:transparent;color:#7a8c8b;padding:6px 9px}'+
  '.esc-aj{display:flex;flex-direction:column;gap:12px}.esc-sec{border:1px solid #e1ebea;border-radius:14px;padding:12px 14px;background:#fbfdfd}'+
  '.esc-sec p{margin:6px 0 8px;font-size:.84rem;line-height:1.5}.esc-sec .btn{width:auto}.esc-chico{font-size:.74rem!important;color:#5d7473}'+
  '.esc-st{display:flex;align-items:center;justify-content:space-between;gap:8px}.esc-st b{font-size:.92rem}'+
  '.esc-est{font-size:.7rem;font-weight:800;border-radius:999px;padding:2px 9px}.esc-est.ok{background:#dcfce7;color:#15803d}.esc-est.no{background:#f1f4f4;color:#5d7473}'+
  '.esc-tipos{display:flex;flex-direction:column;gap:4px;margin:10px 0 6px}'+
  '.esc-tipos label{display:flex;gap:10px;align-items:flex-start;padding:7px 9px;border-radius:10px;cursor:pointer;border:1px solid transparent}'+
  '.esc-tipos label.on{background:#fff;border-color:#e1ebea}.esc-tipos input{margin-top:3px;width:16px;height:16px;accent-color:#00A09A}'+
  '.esc-tipos b{display:block;font-size:.84rem}.esc-tipos small{display:block;font-size:.74rem;color:#5d7473}'+
  '.toast.warn{background:#b45309}'+
  '.esc-b-logo{flex:none;width:46px;height:46px;border-radius:12px}.esc-banner .esc-b-tx b{font-size:1rem}.esc-banner .esc-b-tx small{font-size:.82rem}'+
  '.esc-b-acc .esc-b-gr{font-size:.92rem;padding:10px 18px;min-height:44px}'+
  '.esc-b-acc .esc-b-x{text-decoration:underline;font-weight:700}'+
  '.esc-g{display:flex;flex-direction:column;gap:12px}.esc-g-intro{margin:0;font-size:1rem;color:#1f2d2d}'+
  '.esc-g-tabs{display:flex;gap:6px;flex-wrap:wrap}'+
  '.esc-g-tabs button{flex:1 1 0;min-width:96px;width:auto;font:inherit;font-weight:800;font-size:.84rem;padding:10px 8px;border-radius:12px;border:1px solid #cfe3e1;background:#fff;color:#1f2d2d;cursor:pointer;min-height:44px}'+
  '.esc-g-tabs button[aria-pressed="true"]{background:#00A09A;border-color:#00A09A;color:#fff}'+
  '.esc-g-pasos{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}'+
  '.esc-g-paso{display:grid;grid-template-columns:44px 54px minmax(0,1fr);gap:12px;align-items:center;background:#fbfdfd;border:1px solid #e1ebea;border-radius:16px;padding:12px}'+
  '.esc-g-n{width:44px;height:44px;border-radius:50%;background:#00A09A;color:#fff;font-weight:900;font-size:1.35rem;display:grid;place-items:center}'+
  '.esc-g-ic{width:54px;height:54px;border-radius:14px;background:#fff;border:1px solid #e1ebea;display:grid;place-items:center}.esc-g-ic svg{width:32px;height:32px}'+
  '.esc-g-t{font-size:1.04rem;line-height:1.35;color:#1f2d2d}.esc-g-s{display:block;font-size:.84rem;color:#5d7473;margin-top:4px;line-height:1.45}'+
  '.esc-g-btn{display:inline-block;background:#007AFF;color:#fff;font-weight:800;border-radius:9px;padding:2px 11px;font-size:.95rem}'+
  '.esc-g-fin{display:flex;gap:12px;align-items:center;background:#E6F7F6;border:1px solid #99DDD9;border-radius:16px;padding:12px 14px;font-size:.95rem;line-height:1.45;color:#1f2d2d}'+
  '.esc-g-fin img{width:50px;height:50px;border-radius:12px;flex:none}.esc-g-no{background:#FFF7E6;border-color:#F5D08A}'+
  '@media (max-width:420px){.esc-g-paso{grid-template-columns:36px 44px minmax(0,1fr);gap:9px;padding:10px}.esc-g-n{width:36px;height:36px;font-size:1.1rem}.esc-g-ic{width:44px;height:44px}.esc-g-ic svg{width:26px;height:26px}.esc-g-t{font-size:.98rem}}';
document.head.appendChild(css);
registrarSw();
/* tocar un aviso con el panel abierto: `sw.js` le manda qué abrir */
if('serviceWorker' in navigator) try{
  navigator.serviceWorker.addEventListener('message', function(ev){ var m=ev.data||{}; if(m.tipo==='aviso') ir(m.d); });
  if(navigator.serviceWorker.startMessages) navigator.serviceWorker.startMessages();
}catch(e){}
try{ if(navigator.permissions && navigator.permissions.query) navigator.permissions.query({ name:'notifications' }).then(function(st){ st.onchange=permMirar; }, function(){}); }catch(e){}
esperarDestino(destinoDeHash());
function empezar(){ ESC.t0=Date.now(); ESC.perm=permiso(); bannerPintar(); arrancar(); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', empezar); else empezar();
document.addEventListener('visibilitychange', function(){ if(!document.hidden) setTimeout(function(){ permMirar(); revisar(); }, 1500); });
})();
