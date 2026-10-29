/* 🖥️ EL «SERVICE WORKER» DEL PANEL INSTALADO (§4ns, 29/10/2026; dueño: «ok todas menos la 24»). Lo registra `escritorio.js` SOLO para
   `pedidos.html` (alcance `pedidos.html`): el dashboard de ventas, la guía y lo demás no quedan adentro.
   Hace tres cosas, nada más:
   1. Que Chrome/Edge dejen INSTALAR el panel (piden un service worker que atienda las páginas).
   2. NO guarda copias del panel: cada vez va a internet a buscar la página (la última publicada). Solo si no hay internet muestra un cartel
      «sin internet» en vez del dinosaurio. Lo demás (la planilla, las fotos, Google, los .js) ni lo toca: el navegador lo pide como siempre.
   3. Tocar un aviso de Windows trae el panel adelante (o lo abre) y le dice qué abrir.
   ⚠️ Al cambiarlo, subir `VERSION` (el navegador compara el archivo y se actualiza solo). */
var VERSION='2026-10-29a';
var CAJA='me-sin-internet-'+VERSION;
var SIN_INTERNET='<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<title>Panel MultiEspumas · sin internet</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f2f7f7;'+
  'font-family:Inter,system-ui,Segoe UI,Arial,sans-serif;color:#1f2d2d;padding:16px;box-sizing:border-box}.c{max-width:420px;background:#fff;'+
  'border:1px solid #e1ebea;border-radius:18px;padding:26px 24px;text-align:center;box-shadow:0 10px 30px -18px rgba(0,60,60,.35)}h1{font-size:1.2rem;'+
  'margin:10px 0 6px}p{color:#5d7473;font-size:.92rem;line-height:1.5}button{margin-top:10px;font:inherit;font-weight:800;border:0;border-radius:12px;'+
  'padding:11px 20px;background:#00A09A;color:#fff;cursor:pointer}</style></head><body><div class="c"><div style="font-size:2.2rem">📡</div>'+
  '<h1>Sin internet</h1><p>El panel necesita internet para leer la planilla. Revisá el wifi o los datos y volvé a intentar.</p>'+
  '<button onclick="location.reload()">🔄 Volver a intentar</button></div></body></html>';

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CAJA).then(function(c){
    return c.put('sin-internet', new Response(SIN_INTERNET, { headers:{ 'Content-Type':'text/html; charset=utf-8' } }));
  }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){ return k.indexOf('me-sin-internet-')===0 && k!==CAJA; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  if(e.request.mode!=='navigate') return;   // la planilla, las fotos, los .js: como siempre, sin pasar por acá
  e.respondWith(fetch(e.request).catch(function(){
    return caches.open(CAJA).then(function(c){ return c.match('sin-internet'); }).then(function(r){ return r || Response.error(); });
  }));
});
self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var d=e.notification.data || {};
  e.waitUntil(self.clients.matchAll({ type:'window', includeUncontrolled:true }).then(function(L){
    var w=null;
    for(var i=0;i<L.length;i++){ if(/pedidos\.html/.test(L[i].url)){ w=L[i]; break; } }
    if(w){ w.postMessage({ tipo:'aviso', d:d }); return w.focus(); }
    return self.clients.openWindow('pedidos.html');
  }));
});
