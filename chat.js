/* ============================================================================================================================
   💬 EL CHAT DEL EQUIPO ADENTRO DEL PANEL (mejora 344, 16/11/2026). El dueño (15/11): «si es posible crear un chat interno en el panel
   entre vendedores y Eduardo también». Vio el diseño y la maqueta y eligió 3C y 5B; en lo demás, lo recomendado (1A, 2A, 4A):
   · 1A — 👥 «Todo el equipo» (el grupo), cada uno por privado con Eduardo, las «ventanillas» de 🚚 Logística y 🧾 Contabilidad (cada
     vendedora su hilo: las demás no lo ven) y privado entre compañeras.
   · 2A — sin PIN. Cada privada lo dice: «Lo ven ustedes dos en el panel. Queda guardado en la planilla de la empresa: no es para claves ni
     cosas personales». Nadie tiene «ver todo» en el panel.
   · 3C — SIN WhatsApp por lo no leído: el número rojo del botón (y de la pestaña del navegador), el aviso de Windows (`escritorio.js`,
     tipo «chat») y Bloki (un aviso más en `asisAvisos`).
   · 4A — se guarda 90 días (lo borra el servidor).
   · 5B — «@Bloki» contesta con los números del panel (el MISMO motor de «💬 Preguntame»: `blokiEntender` → `blokiResponder`), gratis y sin
     IA. En el grupo y en las ventanillas NUNCA dice plata; el saldo de un cliente, solo por privado.
   Archivo APARTE (como `escritorio.js`): se carga con `<script src="chat.js?v=…" defer>` al final de `pedidos.html`. ⚠️ Al cambiarlo, subir
   el `?v=` de esa línea y validarlo con `node --check chat.js`.
   Quién es cada uno = «¿Quién está usando el panel?» (`quienRol`, el nombre recordado `getVendedorMem`): una vendedora es su nombre,
   «Eduardo Añez» el dueño, «Logística» y «Contabilidad» sus ventanillas; con «Administración» se pregunta una vez si es Eduardo. Eso NO
   es control de acceso, y el chat lo dice.
   Servidor: la hoja «Chat» con `chatEnviar` / `chatLeer` / `chatBorrar` / `chatFoto`, afuera del candado de doPost. Con el chat CERRADO no
   hay llamadas de más: la lectura `list` de cada 2 minutos lleva `cq` (quién es) y `cv` (la versión que tiene la página) y vuelve con
   `chat:{v, n, t}` (cuántos sin leer y la hora del último). Si llegó algo nuevo, UNA lectura del chat (para el texto del aviso). Con el chat
   ABIERTO y a la vista, `chatLeer` cada 10 s (20 s si no hubo movimiento en 2 minutos). Todo con el servidor 2026-11-16-a o más nuevo:
   con uno anterior el botón no aparece.
   Lo escrito sin señal queda en la cola del aparato (`me_chat_cola`) y sale solo; el servidor no lo duplica (mismo id).
   En Playwright (navigator.webdriver) no hace nada salvo `window.CHAT_PRUEBA`. `tests/test_chat.js`, `tests/test_servidor_chat.js`.
   ============================================================================================================================ */
(function(){
'use strict';
var CHAT_SERVIDOR='2026-11-16-a';
var CHAT_LEER_RAPIDO=10000, CHAT_LEER_LENTO=20000, CHAT_MOVIDO_MS=120000, CHAT_FRIO_MS=300000, CHAT_TIC_MS=2000, CHAT_SOLAPA_MS=60000;
var CHAT_BORRAR_MS=10*60000, CHAT_TXT_MAX=1000, CHAT_FOTOS_MAX=4, CHAT_POR_VEZ=10, CHAT_REINTENTO_MS=15000, CHAT_FOTO_TOPE=90000;
var LS_YO='me_chat_yo', LS_COLA='me_chat_cola', LS_GRUPO='me_chat_grupo';
var EDU_N='Eduardo Añez';
var COLORES=['#2d6fd6','#7c3aed','#e9609a','#f08a24','#16a34a','#0369a1','#b45309','#c0392b','#0f766e','#9333ea','#ca8a04','#475569'];
var C={ montado:false, abierto:false, cur:null, uno:false, msgs:{}, vistos:{}, vistoPend:{}, yoK:'', datos:false, leyendo:false, ultLeer:0, ultAhora:0,
  ultMov:0, vSrv:'', srvN:0, srvNT:0, frio:false, necesitaLeer:false, cola:[], enviando:false, reintentoEn:0, resp:null, urg:false, ac:null, acI:0,
  fotos:[], corte:{}, gen:0, pintadoGen:-1, timer:null, desdeSrv:0, mas:{}, sinMas:{}, fichaDesdeChat:false, ultAviso:0 };
window.CHAT=C;

function activo(){ try{ return !(navigator.webdriver && !window.CHAT_PRUEBA); }catch(e){ return true; } }
function servidorOk(){ try{ return typeof servidorTiene==='function' && servidorTiene(CHAT_SERVIDOR); }catch(e){ return false; } }
function E(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSet(k, v){ try{ if(v==null) localStorage.removeItem(k); else localStorage.setItem(k, v); return true; }catch(e){ return false; } }
function $(id){ return document.getElementById(id); }
function hh(ms){ var d=new Date(Number(ms)-4*3600000), z=function(n){ return (n<10?'0':'')+n; }; return z(d.getUTCHours())+':'+z(d.getUTCMinutes()); }
function diaDe(ms){ return new Date(Number(ms)-4*3600000).toISOString().slice(0,10); }
function hoyBo(){ return diaDe(Date.now()); }
function diaTxt(f){
  var h=hoyBo(), ay=new Date(Date.parse(h+'T12:00:00Z')-864e5).toISOString().slice(0,10);
  if(f===h) return 'Hoy'; if(f===ay) return 'Ayer';
  var d=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'][new Date(f+'T12:00:00Z').getUTCDay()];
  return d.charAt(0).toUpperCase()+d.slice(1)+' '+f.slice(8,10)+'/'+f.slice(5,7);
}
function cuando(ms){ var f=diaDe(ms); return f===hoyBo() ? hh(ms) : (diaTxt(f)==='Ayer' ? 'Ayer' : f.slice(8,10)+'/'+f.slice(5,7)); }

/* ---------- quién es quién ---------- */
/** La clave de una persona: la MISMA cuenta que `chatPersona_` del servidor (test_chat las compara). */
function chatClave(s){
  return String(s==null?'':s).toLowerCase().replace(/[áàäâ]/g,'a').replace(/[éèëê]/g,'e').replace(/[íìïî]/g,'i').replace(/[óòöô]/g,'o')
    .replace(/[úùüû]/g,'u').replace(/\s+/g,' ').trim().replace(/ñ/g,'n').replace(/[^a-z0-9 ]+/g,'').replace(/\s+/g,' ').trim().slice(0,40);
}
var EDU_K=chatClave(EDU_N);
window.chatClave=chatClave;
function esInterno(v){ try{ return typeof cliEsInterno==='function' && cliEsInterno(v); }catch(e){ return false; } }
/** Quién usa el chat en este aparato: {k, r, n} (r: v vendedora/or · d dueño · l logística · c contabilidad) o null. */
function yo(){
  var rol='', v='';
  try{ rol=quienRol()||''; }catch(e){}
  try{ v=getVendedorMem()||''; }catch(e){}
  if(rol==='logistica'){ var ln=''; try{ ln=quienLogNombre()||''; }catch(e){} return { k:'log', r:'l', n:'Logística'+(ln?(' · '+ln):'') }; }
  if(rol==='conta') return { k:'conta', r:'c', n:'Contabilidad' };
  if(v){
    var k=chatClave(v);
    if(k===EDU_K) return { k:EDU_K, r:'d', n:EDU_N };
    if(k && k!=='roho' && !esInterno(v)) return { k:k, r:'v', n:(typeof nombreCanonico==='function' ? nombreCanonico(v) : v) };
    return null;
  }
  if(rol==='admin' && lsGet(LS_YO)==='eduardo') return { k:EDU_K, r:'d', n:EDU_N };
  return null;
}
/** Por qué no hay chat para este aparato: '' (hay), 'nadie', 'admin', 'fuera' (ROHO o un interno). */
function sinYo(){
  if(yo()) return '';
  var rol='', v=''; try{ rol=quienRol()||''; }catch(e){} try{ v=getVendedorMem()||''; }catch(e){}
  if(v) return 'fuera';
  if(rol==='admin') return 'admin';
  return 'nadie';
}
/** Las vendedoras y vendedores del equipo (de `VENDEDORES`, sin ROHO, sin los internos y sin Eduardo): un nombre nuevo aparece solo. */
function equipo(){
  var L=[], ya={};
  (typeof VENDEDORES!=='undefined' ? VENDEDORES : []).forEach(function(v){
    var k=chatClave(v); if(!k || ya[k] || k==='roho' || k===EDU_K || esInterno(v)) return;
    ya[k]=1; L.push({ k:k, n:(typeof nombreCanonico==='function' ? nombreCanonico(v) : v) });
  });
  return L;
}
function todos(){ return equipo().map(function(x){ return x.k; }).concat([EDU_K, 'log', 'conta']); }
function nombreDe(k, m){
  if(k===EDU_K) return EDU_N; if(k==='log') return (m && m.n) || 'Logística'; if(k==='conta') return 'Contabilidad'; if(k==='bloki') return 'Bloki';
  var e=equipo().filter(function(x){ return x.k===k; })[0];
  if(e) return e.n;
  if(m && m.n) return m.n;
  return String(k||'').replace(/\b\w/g, function(c){ return c.toUpperCase(); });
}
function corto(k, m){ var n=nombreDe(k, m); return (k==='log' || k==='conta') ? n.split(' · ')[0] : n.split(' ')[0]; }
function colorDe(k){
  if(k===EDU_K) return '#1f3b73'; if(k==='log') return '#5b6b7d'; if(k==='conta') return '#a16207'; if(k==='bloki') return '#0f8f86';
  var L=equipo(), i=0; for(var j=0;j<L.length;j++) if(L[j].k===k){ i=j; break; }
  return COLORES[i%COLORES.length];
}
function iniciales(n){ return String(n||'').split(/\s+/).filter(Boolean).slice(0,2).map(function(w){ return w.charAt(0).toUpperCase(); }).join(''); }
function pk(a, b){ return 'p:'+(a<b ? a+'|'+b : b+'|'+a); }
/** ¿`q` está en la conversación? La MISMA regla que `chatVe_` del servidor. */
function chatVe(conv, q){
  if(!conv || !q) return false;
  if(conv==='eq') return true;
  var m=/^p:([^|]+)\|(.+)$/.exec(conv); if(m) return m[1]===q || m[2]===q;
  m=/^b:(log|conta)\|(.+)$/.exec(conv); if(m) return m[2]===q || m[1]===q;
  return false;
}
function miembros(conv){
  if(conv==='eq') return todos();
  var m=/^p:([^|]+)\|(.+)$/.exec(conv); if(m) return [m[1], m[2]];
  m=/^b:(log|conta)\|(.+)$/.exec(conv); if(m) return [m[2], m[1]];
  return [];
}
/** Las conversaciones de esta persona (las vacías también, para poder empezar una). */
function convsDe(Y){
  var L=[{ c:'eq', g:1 }], V=equipo();
  if(Y.r==='v'){
    L.push({ c:'b:log|'+Y.k, g:1 }, { c:'b:conta|'+Y.k, g:1 }, { c:pk(Y.k, EDU_K) });
    V.forEach(function(v){ if(v.k!==Y.k) L.push({ c:pk(Y.k, v.k) }); });
  } else if(Y.r==='d'){
    V.forEach(function(v){ L.push({ c:pk(EDU_K, v.k) }); });
    L.push({ c:pk(EDU_K, 'log') }, { c:pk(EDU_K, 'conta') });
  } else {
    var b=Y.r==='l' ? 'log' : 'conta';
    V.forEach(function(v){ L.push({ c:'b:'+b+'|'+v.k }); });
    L.push({ c:pk(EDU_K, Y.k) });
  }
  var ya={}; L.forEach(function(o){ ya[o.c]=1; });
  Object.keys(C.msgs).forEach(function(i){ var c=C.msgs[i].c; if(!ya[c] && chatVe(c, Y.k)){ ya[c]=1; L.push({ c:c }); } });
  return L;
}
/** Cómo se llama una conversación para quien la mira. */
function nombreConv(c, Y){
  if(c==='eq') return { t:'Todo el equipo', av:'👥', col:'#00A09A', g:1, sub:'Lo ve todo el equipo · '+todos().length+' personas' };
  var m=/^b:(log|conta)\|(.+)$/.exec(c);
  if(m){
    var log=m[1]==='log';
    if(m[2]===Y.k) return { t:log?'Logística':'Contabilidad', av:log?'🚚':'🧾', col:log?'#5b6b7d':'#a16207', g:1, sub:log?'Lo ve quien esté en Logística':'Lo ve quien esté en Contabilidad', ven:1 };
    return { t:nombreDe(m[2]), av:iniciales(nombreDe(m[2])), col:colorDe(m[2]), sub:(log?'🚚 le pregunta a Logística':'🧾 Contabilidad le escribe'), p:m[2], ven:1 };
  }
  var mm=/^p:([^|]+)\|(.+)$/.exec(c); if(!mm) return { t:c, av:'?', col:'#999', sub:'' };
  var o=mm[1]===Y.k ? mm[2] : mm[1];
  var g=(o==='log' || o==='conta');
  return { t:nombreDe(o), av:g ? (o==='log'?'🚚':'🧾') : iniciales(nombreDe(o)), col:colorDe(o), g:g, sub:o===EDU_K ? 'El dueño' : (g ? (o==='log'?'Logística':'Contabilidad') : 'Por privado'), p:o, priv:1 };
}

/* ---------- los mensajes de acá ---------- */
function msgsDe(c){ var L=[]; for(var i in C.msgs) if(C.msgs[i].c===c) L.push(C.msgs[i]); L.sort(function(a,b){ return (a.t-b.t) || (a.i<b.i?-1:1); }); return L; }
function vistoDe(c, k){ var o=C.vistos[c]; return (o && Number(o[k])) || 0; }
function deOtro(m, Y){ return m.d!==Y.k && m.b!==Y.k; }
/** Cuántos sin leer: la MISMA cuenta que `chatSinLeer_` del servidor. */
function sinLeerConv(c, Y){ var v=vistoDe(c, Y.k), n=0; msgsDe(c).forEach(function(m){ if(!m.bt && !m.pend && deOtro(m, Y) && m.t>v) n++; }); return n; }
function sinLeerTotal(Y){
  var n=0; Object.keys(C.msgs).forEach(function(i){ var m=C.msgs[i]; if(!m.bt && !m.pend && deOtro(m, Y) && chatVe(m.c, Y.k) && m.t>vistoDe(m.c, Y.k)) n++; });
  return n;
}
/** ¿Avisa (Windows y Bloki)? Lo privado y lo de las ventanillas, sí; del grupo, si te nombran, si escribe Eduardo o si pediste «todo el grupo». */
function menciona(m, Y){
  var x=String(m.x||''); if(x.indexOf('@')<0) return false;
  var mios={ todos:1, equipo:1 };
  if(Y.r==='l'){ mios.logistica=1; var ln=''; try{ ln=quienLogNombre()||''; }catch(e){} var k=chatClave(String(ln).split(' ')[0]); if(k) mios[k]=1; }
  else if(Y.r==='c') mios.contabilidad=1;
  else mios[chatClave(String(Y.n).split(' ')[0])]=1;
  var re=/@([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)/g, r;
  while((r=re.exec(x))) if(mios[chatClave(r[1])]) return true;
  return false;
}
function avisable(m, Y){
  if(m.c!=='eq') return true;
  return menciona(m, Y) || m.d===EDU_K || lsGet(LS_GRUPO)==='1';
}
function sinLeerLista(Y){
  var L=[]; Object.keys(C.msgs).forEach(function(i){ var m=C.msgs[i]; if(!m.bt && !m.pend && deOtro(m, Y) && chatVe(m.c, Y.k) && m.t>vistoDe(m.c, Y.k)) L.push(m); });
  L.sort(function(a,b){ return a.t-b.t; });
  return L;
}

/* ---------- el número rojo ---------- */
var TITULO0=null;
function numero(){
  var Y=yo(); if(!Y) return 0;
  var local=sinLeerTotal(Y);
  return (C.datos && C.ultLeer>=C.srvNT) ? local : Math.max(C.srvN, C.datos ? local : 0);
}
function pintarNumero(salta){
  var b=$('cht-btn'), nb=$('cht-n'); if(!b || !nb) return;
  var n=numero();
  nb.hidden=!n; nb.textContent=n>99 ? '99+' : String(n);
  b.setAttribute('aria-label', 'Chat del equipo'+(n?(' · '+n+' sin leer'):''));
  try{
    var t=document.title.replace(/^\(\d+\+?\)\s*/, '');
    document.title=(n ? '('+(n>99?'99+':n)+') ' : '')+t;
  }catch(e){}
  try{ if(navigator.setAppBadge){ if(n) navigator.setAppBadge(n).catch(function(){}); else if(navigator.clearAppBadge) navigator.clearAppBadge().catch(function(){}); } }catch(e){}
  if(salta && n){ b.classList.remove('suena'); void b.offsetWidth; b.classList.add('suena'); }
}

/* ---------- la red ---------- */
function reset(Y){
  C.yoK=Y ? Y.k : ''; C.msgs={}; C.vistos={}; C.vistoPend={}; C.datos=false; C.vSrv=''; C.srvN=0; C.srvNT=0; C.ultLeer=0; C.ultAhora=0; C.corte={};
  C.mas={}; C.sinMas={}; C.gen++;
  if(C.abierto){ C.cur=null; pintarTodo(); }
}
function colaLeer(){ try{ var a=JSON.parse(lsGet(LS_COLA)||'[]'); return Array.isArray(a) ? a : []; }catch(e){ return []; } }
function colaGuardar(){
  var txt=JSON.stringify(C.cola);
  var ok=(typeof lsPoner==='function') ? lsPoner(LS_COLA, txt) : lsSet(LS_COLA, txt);
  return ok;
}
/** Una lectura del chat. Lleva el «visto» de lo que esta persona tuvo a la vista. */
function leer(){
  var Y=yo(); if(!Y || C.leyendo || !servidorOk() || typeof apiPost!=='function') return Promise.resolve(null);
  if(C.yoK!==Y.k) reset(Y);
  var pl={ action:'chatLeer', cq:Y.k }, primera=!C.datos;
  if(C.datos && C.ultAhora) pl.desde=C.ultAhora-CHAT_SOLAPA_MS;
  var vp={}, hay=false; for(var k in C.vistoPend){ vp[k]=C.vistoPend[k]; hay=true; }
  if(hay && !window.PRACTICA) pl.visto=vp;
  C.leyendo=true;
  var t0=Date.now();
  return apiPost(pl).then(function(r){
    if(!(r && r.ok)) return null;
    if(chatYoK()!==pl.cq) return null;                     // cambió de persona mientras leía
    var nuevos=tomar(r, Y, primera);
    for(var k2 in vp) if(C.vistoPend[k2]!=null && C.vistoPend[k2]<=vp[k2]) delete C.vistoPend[k2];
    C.ultLeer=t0; C.datos=true; C.necesitaLeer=false;
    if(nuevos.length && !primera) avisar(nuevos, Y);
    return r;
  }).catch(function(){ return null; }).then(function(r){ C.leyendo=false; C.gen++; pintarTodo(); try{ if(window.escRevisar && r) window.escRevisar(); }catch(e){} return r; });
}
function chatYoK(){ var Y=yo(); return Y ? Y.k : ''; }
function tomar(r, Y, primera){
  var nuevos=[];
  (r.msgs||[]).forEach(function(m){
    if(!m || !m.i) return;
    var ya=C.msgs[m.i];
    C.msgs[m.i]=m;
    if(!ya && !m.bt && deOtro(m, Y) && m.t>vistoDe(m.c, Y.k)) nuevos.push(m);
  });
  var V=r.vistos||{};
  for(var c in V){ var o=C.vistos[c]||(C.vistos[c]={}); for(var p in V[c]){ if(Number(V[c][p])>(Number(o[p])||0)) o[p]=Number(V[c][p]); } }
  /* lo que esta persona vio desde este aparato y todavía no viajó, sigue valiendo */
  for(var c2 in C.vistoPend){ var o2=C.vistos[c2]||(C.vistos[c2]={}); if(C.vistoPend[c2]>(Number(o2[Y.k])||0)) o2[Y.k]=C.vistoPend[c2]; }
  if(r.v) C.vSrv=String(r.v);
  if(r.ahora) C.ultAhora=Number(r.ahora);
  if(r.desde && !C.desdeSrv) C.desdeSrv=Number(r.desde);
  if(nuevos.length) C.ultMov=Date.now();
  return nuevos;
}
/** Manda lo que está en la cola (hasta 10 por vez). Un «no» firme (el servidor no lo acepta nunca) se saca de la cola y se dice. */
function enviar(){
  if(C.enviando || !C.cola.length || typeof apiPost!=='function') return Promise.resolve(null);
  if(window.PRACTICA) return Promise.resolve(null);
  if(!servidorOk()) return Promise.resolve(null);
  C.enviando=true;
  var lote=C.cola.slice(0, CHAT_POR_VEZ);
  return apiPost({ action:'chatEnviar', msgs:lote }).then(function(r){
    if(r && r.ok){
      var malo={}; (r.malos||[]).forEach(function(x){ if(x && x.id) malo[x.id]=x.motivo||'no'; });
      var ts=r.ts||{};
      lote.forEach(function(x){
        var m=C.msgs[x.id];
        if(ts[x.id]){ if(m){ m.t=Number(ts[x.id]); delete m.pend; delete m.err; } }
        else if(malo[x.id]){ if(m){ delete m.pend; m.err='No se pudo mandar ('+malo[x.id]+')'; } }
        else return;   // ni entró ni se rechazó: sigue en la cola
        C.cola=C.cola.filter(function(y){ return y.id!==x.id; });
      });
      if(r.v){ /* la versión cambió: la lectura siguiente trae el mensaje con su hora */ }
      C.reintentoEn=0;
    } else C.reintentoEn=Date.now()+CHAT_REINTENTO_MS;
    return r;
  }, function(){ C.reintentoEn=Date.now()+CHAT_REINTENTO_MS; return null; }).then(function(r){
    C.enviando=false; colaGuardar(); C.gen++; pintarTodo();
    if(r && r.ok && C.cola.length) return enviar();
    if(r && r.ok && C.abierto) setTimeout(leer, 300);
    return r;
  });
}

/* ---------- lo que viene en la lectura de la planilla (`apiList`) ---------- */
window.chatListaPedir=function(pl){
  if(!activo()) return;
  var Y=yo(); if(!Y) return;
  if(C.yoK!==Y.k) reset(Y);
  pl.cq=Y.k; if(C.vSrv) pl.cv=C.vSrv;
};
window.chatListaTomar=function(ch){
  if(!activo()) return;
  if(!servidorOk()) { botonPintar(); return; }
  var Y=yo(); botonPintar();
  if(!ch){ C.frio=true; return; }
  C.frio=false;
  if(ch.x) C.necesitaLeer=true;
  if(ch.n!=null && Y){
    C.srvN=Number(ch.n)||0; C.srvNT=Date.now();
    var maxT=0; Object.keys(C.msgs).forEach(function(i){ var m=C.msgs[i]; if(!m.pend && m.t>maxT) maxT=m.t; });
    if((C.srvN>0 && Number(ch.t)>maxT) || (C.datos && C.srvN!==sinLeerTotal(Y))) C.necesitaLeer=true;
    if(ch.v && !C.necesitaLeer) C.vSrv=String(ch.v);
  }
  pintarNumero(C.srvN>0);
};

/* ---------- 🔔 cuando llega algo ---------- */
function sonar(k){
  try{
    if(typeof asisMudo==='function' && asisMudo()) return false;
    if(navigator.webdriver && !window.SON_PRUEBA) return false;
    var A=(typeof asisAudio==='function') ? asisAudio() : null; if(!A) return false;
    if(A.state==='suspended' && A.resume) A.resume();
    var t=A.currentTime, f=k==='suave' ? [[880,0,.12,.06]] : [[660,0,.16,.12],[990,.12,.22,.12]];
    f.forEach(function(x){ var o=A.createOscillator(), g=A.createGain(); o.frequency.value=x[0]; g.gain.setValueAtTime(0,t+x[1]); g.gain.linearRampToValueAtTime(x[3],t+x[1]+.01);
      g.gain.exponentialRampToValueAtTime(.0001,t+x[1]+x[2]); o.connect(g); g.connect(A.destination); o.start(t+x[1]); o.stop(t+x[1]+x[2]+.05); });
    try{ if(typeof SON_LOG!=='undefined') SON_LOG.push('chat'); }catch(e){}
    return true;
  }catch(e){ return false; }
}
function avisar(nuevos, Y){
  var abiertaVis=C.abierto && !document.hidden;
  var otros=nuevos.filter(function(m){ return !(abiertaVis && C.cur===m.c && !(C.uno && !C.en)); });
  if(!otros.length){ sonar('suave'); return; }
  pintarNumero(true);
  if(otros.some(function(m){ return avisable(m, Y); })) sonar('tlin');
  try{ if(typeof ASIS!=='undefined' && ASIS.montado) asisRefrescar(); }catch(e){}
}

/* ---------- 🧽 @Bloki: contesta con los números del panel (sin IA) ---------- */
var BK_PLATA={ cliente:1, deben:1, efectivo:1, ventas:1, factura:1, avisos:1, mensaje:1, precio:1 };
function blokiPlano(a){
  var L=[], div=document.createElement('div');
  var txt=function(h){ div.innerHTML=String(h||''); return div.textContent.replace(/\s+/g,' ').trim(); };
  if(a.h) L.push(txt(a.h)); else if(a.txt) L.push(String(a.txt));
  if(a.dia && a.dia.t) L.push(String(a.dia.t));
  (a.nums||[]).forEach(function(x){ L.push('· '+x.l+': '+x.n+(x.s?(' ('+x.s+')'):'')); });
  (a.sub||[]).forEach(function(s){ var t=txt(s); if(t) L.push(t); });
  (a.warn||[]).forEach(function(w){ L.push('⚠️ '+w); });
  (a.cods||[]).forEach(function(r){ L.push('· '+(r.c||'—')+' '+r.n+(r.s?(' ('+r.s+')'):'')); });
  if(a.msg) L.push(String(a.msg));
  (a.filas||[]).slice(0, 12).forEach(function(r){ L.push('· '+r.t+(r.s?(' — '+r.s):'')+(r.m?(' · '+r.m):'')); });
  if(a.filas && a.filas.length>12) L.push('… y '+(a.filas.length-12)+' más');
  (a.opc||[]).slice(0, 6).forEach(function(o){ L.push('· '+o[0]); });
  return L.filter(Boolean).join('\n').slice(0, CHAT_TXT_MAX-80);
}
/** La respuesta de Bloki a una pregunta con «@Bloki», para la conversación `conv`. En el grupo y en las ventanillas, nada de plata. */
function blokiTexto(q, conv){
  var preg=String(q||'').replace(/@bloki\b[:,]?/ig, ' ').replace(/\s+/g, ' ').trim();
  var privado=/^p:/.test(conv);
  var queSe='Te puedo decir el stock de un producto, los lugares del camión, qué se entrega un día o cuándo sale un pedido'+(privado ? ' y, como es privado, el saldo de un cliente.' : '.');
  if(!preg) return '👋 Hola. Preguntame con @Bloki: '+queSe.charAt(0).toLowerCase()+queSe.slice(1);
  var o=null; try{ o=(typeof blokiEntender==='function') ? blokiEntender(preg) : null; }catch(e){ o=null; }
  if(!o) return 'No sé contestar eso todavía 🙈. '+queSe;
  var plataNo='💵 Eso es plata: preguntámelo por privado ('+(conv==='eq' ? 'este grupo lo ve todo el equipo' : 'esta conversación la ve otra persona')+').';
  if(!privado && BK_PLATA[o.tipo]) return plataNo;
  var a=null; try{ a=blokiResponder(o); }catch(e){ a=null; }
  if(!a) return 'No sé contestar eso todavía 🙈. '+queSe;
  var t=blokiPlano(a);
  if(!t) return 'No sé contestar eso todavía 🙈. '+queSe;
  if(!privado && /\bBs\.?\s*[\d.,]*\d/i.test(t)) return plataNo;
  return t;
}
window.chatBlokiTexto=blokiTexto;

/* ---------- mandar ---------- */
function nuevoId(){
  var a=''; try{ a=localStorage.getItem('me_aparato')||''; }catch(e){}
  if(!/^[a-z0-9]{4}$/.test(a)) a=Math.random().toString(36).slice(2,6);
  return 'c'+Date.now().toString(36)+'-'+a+'-'+Math.random().toString(36).slice(2,6);
}
function aparatoTxt(){ try{ return entAparato(); }catch(e){ return ''; } }
/** Los pedidos nombrados con «#11-188»: el id fijo del pedido (el más nuevo con esa OC en los últimos 12 meses). */
function pedidoDeOc(oc){
  var lim=new Date(Date.now()-365*864e5).toISOString().slice(0,10), mejor=null;
  (typeof STATE!=='undefined' ? STATE : []).forEach(function(p){
    if(!p || !p.oc) return;
    try{ if(esFilaSistema(p) || esBorrador(p)) return; }catch(e){}
    var o=String(p.oc).replace(/^OC\s*/i,'').trim();
    if(o!==oc && o.replace(/^(ATC|RPT)\s+/i,'')!==oc) return;
    var f=String(p.fecha||'')||String(new Date(Number(p.ts)||0).toISOString().slice(0,10));
    if(f && f<lim) return;
    if(!mejor || (Number(p.ts)||0)>(Number(mejor.ts)||0)) mejor=p;
  });
  return mejor;
}
var RE_OC=/#((?:ATC|RPT)\s?)?(\d{2}-\d{3,4})\b/gi;
function pedsDe(txt){
  var out=[], ya={}; String(txt||'').replace(RE_OC, function(x, pre, oc){
    var p=pedidoDeOc(oc); if(p && !ya[p.id]){ ya[p.id]=1; out.push(String(p.id).replace(/[~;]/g,'')+'~'+oc); } return x; });
  return out.slice(0, 6);
}
function encolar(m){
  C.msgs[m.id]={ i:m.id, t:Date.now(), c:m.conv, d:m.de, r:m.rol, n:m.dn, x:m.txt, f:(m.fotos||[]).slice(), p:(m.ped||[]).slice(), q:m.resp||'', u:m.u?1:0, b:m.por||'', pend:1 };
  C.cola.push(m);
  if(!colaGuardar()) toast('⚠️ Este aparato no tiene lugar para guardar el mensaje: se manda ahora y, si no hay señal, se pierde.', 'warn', 6000);
}
function chatMandar(txtIn){
  var Y=yo(); if(!Y || !C.cur) return false;
  if(window.PRACTICA){ toast('🧪 En práctica el chat se puede leer, pero no manda nada.', 'warn', 5000); return false; }
  var tx=$('cht-tx'), txt=String(txtIn!=null ? txtIn : (tx ? tx.value : '')).replace(/\r\n?/g,'\n').replace(/^\s+|\s+$/g,'');
  if(C.fotos.some(function(f){ return f.estado==='sube'; })){ toast('📷 Esperá a que termine de subir la foto.', 'warn', 3500); return false; }
  var fotos=C.fotos.filter(function(f){ return f.estado==='ok' && f.fid; }).map(function(f){ return f.fid; });
  if(!txt && !fotos.length) return false;
  if(txt.length>CHAT_TXT_MAX){ toast('El mensaje es muy largo: hasta '+CHAT_TXT_MAX+' letras.', 'warn', 4000); return false; }
  var m={ id:nuevoId(), conv:C.cur, de:Y.k, rol:Y.r, dn:Y.n, txt:txt, fotos:fotos, ped:pedsDe(txt), ap:aparatoTxt() };
  if(C.resp) m.resp=C.resp;
  if(C.urg) m.u=1;
  encolar(m);
  if(/@bloki\b/i.test(txt)){
    var r=blokiTexto(txt, C.cur);
    if(r) encolar({ id:nuevoId(), conv:C.cur, de:'bloki', rol:'b', dn:'Bloki', por:Y.k, txt:r, ap:aparatoTxt() });
  }
  C.resp=null; C.urg=false; C.fotos=[]; C.ultMov=Date.now();
  if(tx && txtIn==null){ tx.value=''; tx.style.height=''; }
  C.gen++; pintarConvEntera(true);
  enviar();
  return true;
}
window.chatMandar=chatMandar;

/* ---------- 📷 fotos ---------- */
function fotoAgregar(files){
  var Y=yo(); if(!Y || !C.cur) return;
  if(window.PRACTICA){ toast('🧪 En práctica el chat no manda fotos.', 'warn', 4000); return; }
  var L=[].slice.call(files||[]).filter(function(f){ return f && /^image\//.test(f.type||''); });
  if(!L.length) return;
  var lugar=CHAT_FOTOS_MAX-C.fotos.length;
  if(lugar<=0){ toast('📷 Hasta '+CHAT_FOTOS_MAX+' fotos por mensaje.', 'warn', 3500); return; }
  if(L.length>lugar){ toast('📷 Van las primeras '+lugar+' (hasta '+CHAT_FOTOS_MAX+' por mensaje).', 'warn', 3500); L=L.slice(0, lugar); }
  L.forEach(function(file){
    var f={ k:'f'+Math.random().toString(36).slice(2,8), estado:'sube', fid:'', url:'' };
    try{ f.url=URL.createObjectURL(file); }catch(e){}
    C.fotos.push(f); fotosPintar();
    var achicar=(typeof fotoCronometro==='function') ? fotoCronometro(file, 1600, 0.72) : Promise.reject(new Error('sin'));
    achicar.then(function(d){
      var p=apiPost({ action:'chatFoto', dataUrl:d, cq:Y.k });
      return (typeof conTopeDuro==='function') ? conTopeDuro(p, CHAT_FOTO_TOPE, 'tardo_foto') : p;
    }).then(function(r){
      if(r && r.ok && r.fotoId){ f.fid=String(r.fotoId); f.estado='ok'; f.tiempo=(typeof fotoTiempoTxt==='function') ? fotoTiempoTxt() : ''; }
      else { f.estado='mal'; toast('📷 No se pudo subir la foto'+(r && r.error ? (' ('+r.error+')') : '')+'. Probá de nuevo.', 'err', 6000); }
    }, function(){ f.estado='mal'; toast('📷 No se pudo subir la foto (sin señal o Google tardó). Probá de nuevo.', 'err', 6000); }).then(fotosPintar);
  });
}
function fotosPintar(){
  var b=$('cht-fotos'); if(!b) return;
  b.hidden=!C.fotos.length;
  b.innerHTML=C.fotos.map(function(f){
    return '<span class="cht-fp'+(f.estado!=='ok'?(' '+f.estado):'')+'">'+(f.url?('<img src="'+E(f.url)+'" alt="">'):'📷')+
      '<em>'+(f.estado==='sube' ? 'subiendo…' : (f.estado==='mal' ? 'no subió' : '✓'))+'</em>'+
      '<button type="button" class="cht-fpx" data-fq="'+E(f.k)+'" aria-label="Sacar la foto">✕</button></span>';
  }).join('');
  var env=$('cht-env'); if(env) env.disabled=C.fotos.some(function(f){ return f.estado==='sube'; });
}
function fotoVer(fid){
  var v=$('cht-visor'); if(!v) return;
  var src=(typeof fotoThumb==='function') ? fotoThumb(fid, 1600) : ('https://lh3.googleusercontent.com/d/'+encodeURIComponent(fid)+'=w1600');
  v.innerHTML='<div class="cht-vis-c"><img src="'+E(src)+'" alt="Foto del chat"><div class="cht-vis-b"><a href="'+E(src)+'" target="_blank" rel="noopener">Abrir en otra pestaña ↗</a><button type="button" class="cht-bt" data-vx="1">Cerrar</button></div></div>';
  v.hidden=false;
}

/* ---------- abrir, cerrar ---------- */
function chatAbrir(conv){
  if(!activo()) return;
  montar();
  if(!servidorOk()){ toast('💬 El chat necesita la versión nueva del servidor. Avisale a Eduardo.', 'warn', 6000); return; }
  C.abierto=true; document.body.classList.add('cht-on');
  var b=$('cht-btn'); if(b){ b.classList.add('on'); b.setAttribute('aria-expanded','true'); }
  /* la ficha al costado vive en el mismo lugar: abrir el chat la cierra */
  try{ if(document.body.classList.contains('ficha-costado') && typeof closeModal==='function') closeModal(); }catch(e){}
  try{ if(typeof asisGloboOcultar==='function') asisGloboOcultar(); }catch(e){}
  medir();
  var Y=yo();
  if(Y && C.yoK!==Y.k) reset(Y);
  if(conv && Y && chatVe(conv, Y.k)) irConv(conv);
  else if(!C.cur && Y && !C.uno){ var L=convsDe(Y).filter(function(o){ return sinLeerConv(o.c, Y); }); irConv((L[0]||{ c:'eq' }).c, true); }
  else { pintarTodo(); }
  if(Y && (!C.datos || Date.now()-C.ultLeer>3000)) leer();
}
function chatCerrar(){
  C.abierto=false; C.corte={}; C.resp=null; C.urg=false;
  document.body.classList.remove('cht-on'); document.body.classList.remove('cht-lleno');
  var b=$('cht-btn'); if(b){ b.classList.remove('on'); b.setAttribute('aria-expanded','false'); }
  var ac=$('cht-acm'); if(ac) ac.hidden=true;
}
function chatToggle(){ if(C.abierto) chatCerrar(); else chatAbrir(); }
window.chatAbrir=chatAbrir; window.chatCerrar=chatCerrar; window.chatToggle=chatToggle; window.chatLeerYa=leer; window.chatEnviarYa=enviar;
function irConv(c, sinFoco){
  if(c!==C.cur){ C.resp=null; C.urg=false; C.fotos=[]; }
  C.cur=c; C.en=true;
  var Y=yo(); if(Y && C.datos && C.corte[c]==null) C.corte[c]=vistoDe(c, Y.k);
  C.saltar=c;
  pintarTodo();
  if(!sinFoco){ var t=$('cht-tx'); if(t) try{ t.focus({ preventScroll:true }); }catch(e){} }
}
function volverLista(){ C.en=false; C.cur=null; C.corte={}; pintarTodo(); }
/** Ancho del chat: 420 px en la compu, 640 en la de 1920 (con el panel agrandado), la pantalla entera en el iPad parado y el celular. */
function medir(){
  var p=$('cht-panel'); if(!p) return;
  var w=p.getBoundingClientRect().width/((typeof zoomPag==='function' && zoomPag()) || 1);
  var vw=window.innerWidth/((typeof zoomPag==='function' && zoomPag()) || 1);
  C.uno=w<600;
  p.classList.toggle('cht-uno', C.uno);
  document.body.classList.toggle('cht-lleno', C.abierto && w>=vw-4);
  document.body.style.setProperty('--cht-w', Math.round(w)+'px');
}

/* ---------- lo que se ve ---------- */
var CSS=
'.cht-btn{ position:relative; flex:none; display:inline-flex; align-items:center; gap:7px; background:rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.32); color:#fff; border-radius:12px; padding:8px 12px; font:inherit; font-weight:700; font-size:.82rem; cursor:pointer; margin-left:-8px; -webkit-backdrop-filter:blur(4px); backdrop-filter:blur(4px); }'+
'.cht-btn:hover{ background:rgba(255,255,255,.26); } .cht-btn.on{ background:#fff; color:#007a74; }'+
'.cht-btn[hidden]{ display:none!important; } .cht-btn + .vivo-btn{ margin-left:-8px; } .cht-btn + .hstat{ margin-left:0; }'+
'.cht-n{ position:absolute; top:-6px; right:-6px; min-width:20px; height:20px; padding:0 5px; border-radius:10px; background:#d23645; color:#fff; font-size:.68rem; font-weight:900; display:grid; place-items:center; border:2px solid rgba(255,255,255,.9); }'+
'.cht-n[hidden]{ display:none!important; }'+
'.cht-btn.suena{ animation:cht-salta .9s ease-in-out 2; } @keyframes cht-salta{ 25%{ transform:rotate(7deg) scale(1.06); } 75%{ transform:rotate(-7deg) scale(1.06); } }'+
'@media(max-width:700px){ .cht-btn{ padding:0; width:40px; height:40px; justify-content:center; border-radius:50%; } .cht-btn-t{ display:none; } }'+
'#cht-panel{ position:fixed; right:0; top:var(--hdr-h,64px); bottom:0; width:420px; max-width:calc(100vw / var(--vz,1)); z-index:3200; display:flex; background:#fff; color:#2D2D2D; border-left:1px solid #E2E2E2; box-shadow:-24px 0 40px -30px rgba(0,60,60,.55);'+
  ' transform:translateX(102%); visibility:hidden; transition:transform .26s cubic-bezier(.3,1,.4,1), visibility 0s .26s; font-size:14px; line-height:1.45; }'+
'body.cht-on #cht-panel{ transform:none; visibility:visible; transition:transform .26s cubic-bezier(.3,1,.4,1); }'+
'@media(min-width:1700px){ #cht-panel{ width:640px; } } @media(max-width:900px){ #cht-panel{ width:calc(100vw / var(--vz,1)); } }'+
'body.cht-on:not(.cht-lleno) .asis{ right:calc(var(--cht-w,420px) + 12px); transition:right .28s cubic-bezier(.3,1.1,.4,1); }'+
'body.cht-on.cht-lleno .asis{ opacity:0; pointer-events:none; }'+
'#cht-panel *{ box-sizing:border-box; } #cht-panel button, #cht-panel input, #cht-panel textarea{ font:inherit; color:inherit; }'+
'.cht-cl{ width:250px; flex:none; border-right:1px solid #E2E2E2; display:flex; flex-direction:column; min-width:0; background:#fbfdfd; }'+
'.cht-cc{ flex:1; display:flex; flex-direction:column; min-width:0; position:relative; background:#fff; }'+
'#cht-panel.cht-uno .cht-cl{ width:100%; border-right:0; } #cht-panel.cht-uno:not(.en) .cht-cc, #cht-panel.cht-uno.en .cht-cl{ display:none; }'+
'.cht-clh{ display:flex; align-items:center; gap:6px; padding:12px 12px 8px; } .cht-clh b{ font-size:1rem; color:#17302f; flex:1; }'+
'.cht-ix{ border:0; background:#f1f6f6; border-radius:10px; min-width:36px; height:36px; font-weight:800; color:#5d6f6e; cursor:pointer; padding:0 8px; }'+
'.cht-ix:hover{ background:#E6F7F6; } .cht-ix.on{ background:#E6F7F6; color:#007a74; }'+
'.cht-bus{ margin:0 12px 8px; border:1px solid #E2E2E2; border-radius:10px; padding:8px 10px; width:calc(100% - 24px); background:#fff; }'+
'.cht-lst{ overflow:auto; flex:1; padding:0 6px 10px; }'+
'.cht-sc{ font-size:.7rem; letter-spacing:.09em; text-transform:uppercase; font-weight:800; color:#6B6B6B; padding:10px 8px 4px; }'+
'.cht-it{ display:flex; gap:10px; align-items:center; width:100%; border:0; background:none; text-align:left; padding:8px; border-radius:12px; min-height:54px; cursor:pointer; color:#2D2D2D; }'+
'.cht-it:hover{ background:#E6F7F6; } .cht-it.on{ background:#E6F7F6; box-shadow:inset 3px 0 0 #00B5AD; }'+
'.cht-av{ position:relative; flex:none; width:38px; height:38px; border-radius:50%; background:var(--c); color:#fff; display:grid; place-items:center; font-weight:800; font-size:.8rem; }'+
'.cht-av.g{ border-radius:12px; font-size:1.05rem; }'+
'.cht-itt{ flex:1; min-width:0; } .cht-itt b{ display:block; font-size:.88rem; color:#17302f; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }'+
'.cht-itt small{ display:block; color:#6B6B6B; font-size:.78rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }'+
'.cht-it.nl .cht-itt small{ color:#17302f; font-weight:600; }'+
'.cht-itd{ display:flex; flex-direction:column; align-items:flex-end; gap:4px; font-size:.7rem; color:#6B6B6B; }'+
'.cht-cn{ min-width:20px; height:20px; padding:0 6px; border-radius:10px; background:#00B5AD; color:#fff; font-size:.7rem; font-weight:800; display:grid; place-items:center; } .cht-cn.r{ background:#d23645; }'+
'.cht-cch{ display:flex; align-items:center; gap:10px; padding:10px 12px; border-bottom:1px solid #E2E2E2; }'+
'.cht-nota{ font-size:.75rem; color:#5d6f6e; background:#f5fafa; border-bottom:1px solid #E2E2E2; padding:6px 14px; }'+
'.cht-ms{ flex:1; overflow:auto; padding:12px 14px 8px; display:flex; flex-direction:column; gap:6px; background:linear-gradient(180deg,#f7fbfb,#fff 180px); }'+
'.cht-dia{ align-self:center; font-size:.72rem; font-weight:700; color:#6B6B6B; background:#eef4f4; border-radius:999px; padding:2px 10px; margin:6px 0; }'+
'.cht-nue{ display:flex; align-items:center; gap:8px; color:#d23645; font-size:.74rem; font-weight:800; margin:6px 0; } .cht-nue::before,.cht-nue::after{ content:""; flex:1; height:1px; background:#f3b4bb; }'+
'.cht-m{ max-width:82%; align-self:flex-start; background:#fff; border:1px solid #E2E2E2; border-radius:4px 14px 14px 14px; padding:7px 10px 5px; position:relative; font-size:.88rem; overflow-wrap:anywhere; color:#2D2D2D; }'+
'.cht-m.yo{ align-self:flex-end; background:#dcf5f3; border-color:#b3e4e0; border-radius:14px 4px 14px 14px; }'+
'.cht-m.bk{ background:#fff8e8; border-color:#f6dca0; } .cht-m.u{ box-shadow:inset 3px 0 0 #d23645; } .cht-m.err{ border-color:#f5c0c5; background:#fdeaec; }'+
'.cht-m .de{ display:block; font-size:.74rem; font-weight:800; color:var(--c); }'+
'.cht-m .ft{ display:flex; gap:6px; justify-content:flex-end; align-items:center; font-size:.68rem; color:#6B6B6B; margin-top:2px; flex-wrap:wrap; }'+
'.cht-ck{ color:#94a3a3; } .cht-ck.v{ color:#0ea5e9; }'+
'.cht-m .ac{ position:absolute; top:-12px; right:6px; display:none; gap:4px; } .cht-m:hover .ac, .cht-m:focus-within .ac{ display:flex; }'+
'.cht-m .ac button{ border:1px solid #E2E2E2; background:#fff; border-radius:8px; width:30px; height:26px; font-size:.8rem; cursor:pointer; }'+
'.cht-cita{ border-left:3px solid #00B5AD; background:rgba(0,181,173,.08); border-radius:6px; padding:3px 8px; font-size:.78rem; color:#6B6B6B; margin-bottom:4px; }'+
'.cht-ped{ display:inline-flex; gap:5px; align-items:center; border:1px solid #99DDD9; background:#fff; color:#0d5753; border-radius:999px; padding:1px 9px; font-size:.8rem; font-weight:700; vertical-align:1px; cursor:pointer; }'+
'.cht-ped:hover{ background:#E6F7F6; } .cht-men{ color:#008F88; font-weight:700; }'+
'.cht-foto{ display:inline-block; border:0; padding:0; margin:2px 4px 3px 0; border-radius:10px; overflow:hidden; background:#eee; line-height:0; cursor:zoom-in; }'+
'.cht-foto img{ width:200px; max-width:100%; height:auto; max-height:200px; object-fit:cover; display:block; }'+
'.cht-tag{ font-size:.72rem; color:#B45309; background:#FEF3E2; border-radius:8px; padding:2px 8px; margin-top:4px; display:inline-block; }'+
'.cht-tag.r{ color:#CE2939; background:#FDEAEC; }'+
'.cht-vis{ border:0; background:none; color:#0ea5e9; font-size:.68rem; padding:0; text-decoration:underline dotted; cursor:pointer; }'+
'.cht-borr{ color:#6B6B6B; font-style:italic; }'+
'.cht-mas{ align-self:center; border:1px dashed #99DDD9; background:#E6F7F6; color:#0d5753; border-radius:12px; padding:6px 12px; font-weight:700; cursor:pointer; }'+
'.cht-cmp{ border-top:1px solid #E2E2E2; padding:8px 10px 10px; background:#fff; position:relative; }'+
'.cht-rb{ display:flex; align-items:center; gap:8px; margin-bottom:6px; } .cht-rb .cht-cita{ flex:1; margin:0; }'+
'.cht-tl{ display:flex; gap:6px; margin-bottom:6px; flex-wrap:wrap; }'+
'.cht-tl button{ border:1px solid #E2E2E2; background:#fff; border-radius:999px; padding:4px 10px; font-size:.78rem; font-weight:600; color:#3d5352; min-height:32px; cursor:pointer; }'+
'.cht-tl button:hover{ border-color:#99DDD9; background:#E6F7F6; } .cht-tl button.u.on{ background:#FDEAEC; border-color:#f5c0c5; color:#CE2939; }'+
'.cht-ew{ display:flex; gap:8px; align-items:flex-end; }'+
'.cht-ew textarea{ flex:1; resize:none; border:1px solid #99DDD9; border-radius:12px; padding:9px 11px; min-height:42px; max-height:120px; outline:none; background:#fff; color:#2D2D2D; }'+
'.cht-ew textarea:focus{ box-shadow:0 0 0 3px rgba(0,181,173,.18); }'+
'.cht-bt{ border:0; border-radius:10px; padding:8px 14px; font-weight:700; background:#00A09A; color:#fff; min-height:42px; cursor:pointer; } .cht-bt:disabled{ opacity:.5; cursor:default; }'+
'.cht-bt.sec{ background:#f1f6f6; color:#17302f; }'+
'.cht-acm{ position:absolute; left:10px; right:10px; bottom:calc(100% - 4px); background:#fff; border:1px solid #99DDD9; border-radius:12px; box-shadow:0 16px 30px -18px rgba(0,60,60,.6); max-height:230px; overflow:auto; padding:4px; z-index:5; }'+
'.cht-acm[hidden]{ display:none; }'+
'.cht-acm button{ display:flex; gap:10px; width:100%; border:0; background:none; text-align:left; padding:7px 9px; border-radius:9px; font-size:.84rem; align-items:center; cursor:pointer; color:#2D2D2D; }'+
'.cht-acm button.on, .cht-acm button:hover{ background:#E6F7F6; } .cht-acm small{ color:#6B6B6B; }'+
'.cht-fotos{ display:flex; gap:6px; flex-wrap:wrap; margin-bottom:6px; } .cht-fotos[hidden]{ display:none; }'+
'.cht-fp{ position:relative; width:64px; height:64px; border-radius:10px; overflow:hidden; background:#eef4f4; display:grid; place-items:center; }'+
'.cht-fp img{ width:100%; height:100%; object-fit:cover; } .cht-fp em{ position:absolute; left:0; right:0; bottom:0; font-style:normal; font-size:.62rem; text-align:center; background:rgba(0,0,0,.55); color:#fff; }'+
'.cht-fp.mal em{ background:#CE2939; } .cht-fpx{ position:absolute; top:2px; right:2px; border:0; border-radius:50%; width:20px; height:20px; background:rgba(0,0,0,.6); color:#fff; font-size:.65rem; cursor:pointer; }'+
'.cht-vac{ color:#6B6B6B; text-align:center; padding:40px 20px; }'+
'.cht-yo{ padding:30px 22px; text-align:center; color:#17302f; } .cht-yo p{ color:#5d6f6e; } .cht-yo .cht-bt{ margin:6px; }'+
'.cht-aviso{ font-size:.76rem; background:#FEF3E2; color:#7c4b00; border-radius:10px; padding:6px 10px; margin-bottom:6px; }'+
'.cht-sv{ font-size:.72rem; color:#6B6B6B; margin-left:auto; }'+
'.cht-ficha{ background:#E6F7F6!important; color:#007a74!important; border:1px solid #99DDD9!important; font-weight:700; }'+
'.cht-sos{ font-size:.74rem; color:#6B6B6B; padding:2px 8px 0; } .cht-sos b{ color:#17302f; }'+
'#cht-visor{ position:fixed; left:0; right:0; bottom:0; top:max(var(--wco-h,0px), var(--sa-t,0px)); z-index:4100; background:rgba(15,40,45,.72); display:flex; align-items:center; justify-content:center; padding:20px; }'+
'#cht-visor[hidden]{ display:none; } .cht-vis-c{ background:#fff; border-radius:14px; padding:10px; max-width:min(1100px,100%); max-height:100%; display:flex; flex-direction:column; gap:8px; }'+
'.cht-vis-c img{ max-width:100%; max-height:calc(80vh / var(--vz,1)); object-fit:contain; } .cht-vis-b{ display:flex; gap:10px; align-items:center; justify-content:flex-end; }'+
'@media(prefers-reduced-motion:reduce){ #cht-panel, body.cht-on #cht-panel, .cht-btn.suena{ transition:none; animation:none; } }'+
'@media print{ .cht-btn, #cht-panel, #cht-visor{ display:none!important; } }';

function montar(){
  if(C.montado || !activo() || !document.body) return;
  C.montado=true;
  var st=document.createElement('style'); st.id='cht-css'; st.textContent=CSS; document.head.appendChild(st);
  var pal=$('pal-btn');
  var b=document.createElement('button'); b.type='button'; b.id='cht-btn'; b.className='cht-btn no-print'; b.hidden=true;
  b.setAttribute('aria-expanded','false'); b.setAttribute('aria-label','Chat del equipo'); b.title='Chat del equipo: Eduardo, las compañeras, Logística y Contabilidad';
  b.innerHTML='<span aria-hidden="true">💬</span><span class="cht-btn-t">Chat</span><span class="cht-n" id="cht-n" hidden>0</span>';
  if(pal && pal.parentNode) pal.parentNode.insertBefore(b, pal.nextSibling); else { var hi=document.querySelector('.header-in'); if(hi) hi.appendChild(b); }
  var p=document.createElement('aside'); p.id='cht-panel'; p.className='no-print'; p.setAttribute('aria-label','Chat del equipo');
  p.innerHTML='<div class="cht-cl"><div class="cht-clh"><b>💬 Chat</b><button type="button" class="cht-ix" id="cht-grupo" title="Avisarme de TODO lo del grupo (si no, solo cuando me nombran o escribe Eduardo)">🔔</button>'+
      '<button type="button" class="cht-ix" id="cht-x" aria-label="Cerrar el chat">✕</button></div>'+
      '<input class="cht-bus" id="cht-bus" type="search" placeholder="🔎 Buscar en el chat" aria-label="Buscar en el chat"><div class="cht-lst" id="cht-lst"></div></div>'+
    '<div class="cht-cc" id="cht-cc"></div>';
  document.body.appendChild(p);
  var v=document.createElement('div'); v.id='cht-visor'; v.className='no-print'; v.hidden=true; document.body.appendChild(v);
  var inp=document.createElement('input'); inp.type='file'; inp.accept='image/*'; inp.multiple=true; inp.id='cht-file'; inp.hidden=true; document.body.appendChild(inp);
  inp.addEventListener('change', function(){ fotoAgregar(inp.files); inp.value=''; });
  window.addEventListener('resize', function(){ if(C.abierto){ medir(); pintarTodo(); } });
  enlazar();
  botonPintar();
}
function botonPintar(){
  var b=$('cht-btn'); if(!b) return;
  var ver=activo() && servidorOk();
  if(b.hidden===ver) b.hidden=!ver;
  if(!ver && C.abierto) chatCerrar();
  pintarNumero();
}
function pintarTodo(){
  if(!C.montado) return;
  pintarNumero();
  if(!C.abierto) return;
  var p=$('cht-panel'); if(!p) return;
  medir();
  p.classList.toggle('en', !!(C.uno && ((C.en && C.cur) || !yo())));   // sin saber quién es: la pantalla de «¿quién sos?» (en la columna de la conversación)
  var g=$('cht-grupo'); if(g) g.classList.toggle('on', lsGet(LS_GRUPO)==='1');
  pintarLista();
  pintarConvEntera(false);
}
function ultimo(c){ var L=msgsDe(c); return L[L.length-1]; }
function pintarLista(){
  var box=$('cht-lst'); if(!box) return;
  var Y=yo();
  if(!Y){ box.innerHTML=''; return; }
  var q=chatClave(($('cht-bus')||{}).value||''), L=convsDe(Y).map(function(o){ o.u=ultimo(o.c); o.n=nombreConv(o.c, Y); return o; });
  if(q) L=L.filter(function(o){ return chatClave(o.n.t).indexOf(q)>=0 || msgsDe(o.c).some(function(m){ return chatClave(m.x).indexOf(q)>=0; }); });
  var grupos=L.filter(function(o){ return o.g; }), gente=L.filter(function(o){ return !o.g; });
  gente.sort(function(a, b){ return ((b.u?b.u.t:0)-(a.u?a.u.t:0)) || ((a.n.p===EDU_K)?-1:((b.n.p===EDU_K)?1:0)) || a.n.t.localeCompare(b.n.t); });
  var item=function(o){
    var n=sinLeerConv(o.c, Y), u=o.u, hit='';
    if(q && u){ var mm=msgsDe(o.c).filter(function(m){ return chatClave(m.x).indexOf(q)>=0; }); if(mm.length){ u=mm[mm.length-1]; hit='🔎 '; } }
    var prev=u ? hit+(u.d===Y.k && u.r!=='b' ? 'Vos: ' : ((o.c==='eq' || u.r==='b') ? corto(u.r==='b'?'bloki':u.d, u)+': ' : ''))+(u.bt ? '🗑 Mensaje borrado' : ((u.f && u.f.length && !u.x) ? '📷 Foto' : u.x)) : 'Escribile algo';
    var rojo=n && (o.c!=='eq');
    return '<button type="button" class="cht-it'+(o.c===C.cur?' on':'')+(n?' nl':'')+'" data-cc="'+E(o.c)+'"><span class="cht-av'+(o.n.g?' g':'')+'" style="--c:'+o.n.col+'">'+E(o.n.av)+'</span>'+
      '<span class="cht-itt"><b>'+E(o.n.t)+'</b><small>'+E(prev)+'</small></span><span class="cht-itd">'+(u?E(cuando(u.t)):'')+(n?'<span class="cht-cn'+(rojo?' r':'')+'">'+n+'</span>':'')+'</span></button>';
  };
  var h='<div class="cht-sos">Sos <b>'+E(Y.n)+'</b> · <button type="button" class="cht-vis" data-yo="otro">no soy yo</button></div>'+
    (grupos.length?'<div class="cht-sc">Grupos</div>'+grupos.map(item).join(''):'')+(gente.length?'<div class="cht-sc">Personas</div>'+gente.map(item).join(''):'')+
    (!L.length?'<div class="cht-vac">Nada con «'+E(($('cht-bus')||{}).value)+'»</div>':'');
  if(box._h!==h){ var st=box.scrollTop; box.innerHTML=h; box._h=h; box.scrollTop=st; }
}
/* el texto de un mensaje: #pedido = su ficha, @nombre en color, enlaces */
function pedChip(m, oc){
  var id='';
  (m.p||[]).forEach(function(x){ var k=String(x).split('~'); if(k[1]===oc && !id) id=k[0]; });
  var p=null; try{ if(id) p=findById(id); }catch(e){}
  if(!p) p=pedidoDeOc(oc);
  if(!p) return null;
  var dia=''; try{ if(p.fecha) dia=['dom','lun','mar','mié','jue','vie','sáb'][new Date(p.fecha+'T12:00:00Z').getUTCDay()]; }catch(e){}
  return '<button type="button" class="cht-ped" data-pid="'+E(p.id)+'">📄 '+E(oc)+' · '+E(String(p.cliente||'').split(/\s+/)[0]||'—')+(dia?(' · '+dia):'')+(p.entregado?' · ✅':'')+'</button>';
}
function texto(m){
  var t=E(m.x||'');
  t=t.replace(/#((?:ATC|RPT)\s?)?(\d{2}-\d{3,4})\b/gi, function(x, pre, oc){ var c=pedChip(m, oc); return c || (x+' <small>(no lo encuentro)</small>'); });
  t=t.replace(/(^|[\s(])(@[A-Za-zÁÉÍÓÚáéíóúÑñ]{2,20}(?:\s·\s[A-Za-zÁÉÍÓÚáéíóúÑñ]+)?)/g, '$1<span class="cht-men">$2</span>');
  t=t.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  return t.replace(/\n/g,'<br>');
}
function checks(m, Y){
  if(m.err) return '<span class="cht-ck" style="color:#CE2939">⚠️ '+E(m.err)+'</span>';
  if(m.pend) return '<span class="cht-ck">⏳ '+(C.reintentoEn ? 'sin enviar · <button type="button" class="cht-vis" data-reint="1">reintentar</button>' : 'enviando')+'</span>';
  var otros=miembros(m.c).filter(function(p){ return p!==m.d && p!==m.b; }), vieron=otros.filter(function(p){ return vistoDe(m.c, p)>=m.t; });
  if(m.c==='eq') return '<button type="button" class="cht-vis" data-vv="'+E(m.i)+'">✓✓ visto por '+vieron.length+' de '+otros.length+'</button>';
  if(vieron.length){
    var b=/^b:(log|conta)\|/.exec(m.c);
    return '<span class="cht-ck v">✓✓ Visto'+(b && m.d!=='log' && m.d!=='conta' ? (' por '+(b[1]==='log'?'Logística':'Contabilidad')) : '')+'</span>';
  }
  return '<span class="cht-ck">✓ Enviado</span>';
}
function burbuja(m, Y){
  var bk=m.r==='b', mio=(m.d===Y.k && !bk), h='<div class="cht-m'+(mio?' yo':'')+(bk?' bk':'')+(m.u?' u':'')+(m.err?' err':'')+'" data-mid="'+E(m.i)+'" style="--c:'+colorDe(bk?'bloki':m.d)+'">';
  if(!mio && (m.c==='eq' || bk || /^b:/.test(m.c))) h+='<span class="de">'+(bk ? '🧽 Bloki'+(m.b && m.b!==Y.k ? (' · le contesta a '+E(corto(m.b))) : '') : E(nombreDe(m.d, m)))+'</span>';
  if(m.bt) return h+'<span class="cht-borr">🗑 Mensaje borrado</span><div class="ft">'+hh(m.t)+'</div></div>';
  if(m.q){ var r=C.msgs[m.q]; if(r) h+='<div class="cht-cita">↩️ '+E(r.r==='b'?'Bloki':corto(r.d, r))+': '+E(String(r.bt?'Mensaje borrado':(r.x||'📷 Foto')).slice(0,70))+'</div>'; }
  (m.f||[]).forEach(function(fid){
    var src=(typeof fotoThumb==='function') ? fotoThumb(fid, 400) : ('https://lh3.googleusercontent.com/d/'+encodeURIComponent(fid)+'=w400');
    h+='<button type="button" class="cht-foto" data-fid="'+E(fid)+'" aria-label="Ver la foto"><img src="'+E(src)+'" alt="Foto" loading="lazy"></button>';
  });
  if(m.x) h+='<div>'+texto(m)+'</div>';
  if(m.u) h+='<div><span class="cht-tag r">🔴 Urgente</span></div>';
  if(bk) h+='<div class="ft" style="justify-content:flex-start">Con los números del panel de las '+hh(m.t)+' · sin IA</div>';
  h+='<div class="ft">'+hh(m.t)+(mio?(' '+checks(m, Y)):'')+'</div>';
  var acc='';
  if(!m.pend && !m.err) acc+='<button type="button" data-rr="'+E(m.i)+'" title="Responder" aria-label="Responder">↩️</button>';
  if((mio || (bk && m.b===Y.k)) && (m.pend || m.err || Date.now()-m.t<CHAT_BORRAR_MS)) acc+='<button type="button" data-bb="'+E(m.i)+'" title="Borrar (hasta 10 minutos)" aria-label="Borrar">🗑</button>';
  if(acc) h+='<span class="ac">'+acc+'</span>';
  return h+'</div>';
}
function notaDe(c, n){
  if(c==='eq') return '👥 Lo ve todo el equipo. Para avisos que tienen que gritar, sigue «📢 Decir anuncio».';
  if(n.priv) return '🔒 Lo ven ustedes dos en el panel. Queda guardado en la planilla de la empresa: no es para claves ni cosas personales.';
  var log=/^b:log/.test(c);
  if(n.p) return '📬 Es la conversación de '+corto(n.p)+' con '+(log?'Logística':'Contabilidad')+': la contesta quien esté en ese puesto. Las otras vendedoras no la ven.';
  return '📬 La contesta quien esté en '+n.t+'. Las otras vendedoras no ven esta conversación.';
}
/** La conversación abierta. `envio`: recién se mandó algo (abajo de todo). Sin cambios desde la última vez, no se redibuja (no pierde lo escrito). */
function pintarConvEntera(envio){
  var cc=$('cht-cc'); if(!cc) return;
  var Y=yo(), sy=sinYo();
  if(!Y){
    var t=sy==='admin' ? '<p><b>¿Sos Eduardo?</b></p><p>El chat necesita saber quién escribe.</p><button type="button" class="cht-bt" data-yo="eduardo">Sí, soy Eduardo</button><button type="button" class="cht-bt sec" data-yo="otro">No, soy otra persona</button>'
      : (sy==='fuera' ? '<p><b>El chat es del equipo</b>: las vendedoras, Eduardo, Logística y Contabilidad.</p><button type="button" class="cht-bt sec" data-yo="otro">👋 Cambiar quién soy</button>'
      : '<p><b>👋 Primero decime quién sos</b></p><p>Así te muestro tus conversaciones.</p><button type="button" class="cht-bt" data-yo="otro">👋 Elegir mi nombre</button>');
    if(cc._k!=='yo|'+sy){ cc.innerHTML='<div class="cht-yo">'+t+'</div>'; cc._k='yo|'+sy; }
    var cl=$('cht-lst'); if(cl){ cl.innerHTML=''; cl._h=''; }
    return;
  }
  var c=C.cur;
  if(!c){ if(cc._k!=='nada'){ cc.innerHTML='<div class="cht-vac">'+(C.datos ? 'Elegí una conversación de la lista 👈' : 'Cargando…')+'</div>'; cc._k='nada'; } return; }
  var n=nombreConv(c, Y);
  if(cc._k!==c+'|'+Y.k){
    cc._k=c+'|'+Y.k;
    var urgVa=(Y.r==='v' && c!=='eq' && (/^b:/.test(c) || miembros(c).indexOf(EDU_K)>=0));   // a Eduardo o a una ventanilla, no en el grupo
    cc.innerHTML='<div class="cht-cch">'+(C.uno?'<button type="button" class="cht-ix" id="cht-atras" aria-label="Volver a la lista">←</button>':'')+
        '<span class="cht-av'+(n.g?' g':'')+'" style="--c:'+n.col+'">'+E(n.av)+'</span><span class="cht-itt"><b>'+E(n.t)+'</b><small>'+E(n.sub)+'</small></span>'+
        (C.uno?'':'<button type="button" class="cht-ix" id="cht-x2" aria-label="Cerrar el chat">✕</button>')+'</div>'+
      '<div class="cht-nota">'+E(notaDe(c, n))+'</div><div class="cht-ms" id="cht-ms" aria-live="polite"></div>'+
      '<div class="cht-cmp"><div class="cht-acm" id="cht-acm" hidden></div><div id="cht-rb"></div><div class="cht-fotos" id="cht-fotos" hidden></div>'+
        (window.PRACTICA ? '<div class="cht-aviso">🧪 En práctica el chat se puede leer, pero no manda nada.</div>' : '')+
        '<div class="cht-tl"><button type="button" id="cht-tfoto" title="Una foto o una captura (también podés pegarla con Ctrl + V)">📷 Foto</button>'+
        '<button type="button" id="cht-tped" title="Nombrar un pedido: se abre su ficha"># Pedido</button>'+
        '<button type="button" id="cht-tbk" title="Preguntale a Bloki: stock, lugares del camión, cuándo sale un pedido">🧽 Bloki</button>'+
        (urgVa ? '<button type="button" id="cht-turg" class="u'+(C.urg?' on':'')+'" title="Le aparece en rojo y el aviso de Windows queda fijo">🔴 Urgente</button>' : '')+'</div>'+
        '<div class="cht-ew"><textarea id="cht-tx" rows="1" maxlength="'+CHAT_TXT_MAX+'" placeholder="Escribí… (Enter manda)" title="Enter manda · Shift + Enter, otra línea" aria-label="Mensaje"></textarea>'+
        '<button type="button" class="cht-bt" id="cht-env">Enviar ➤</button></div></div>';
    C.pintadoGen=-1;
  } else {
    var sub=cc.querySelector('.cht-cch .cht-itt small'); if(sub && sub.textContent!==n.sub) sub.textContent=n.sub;
  }
  var rb=$('cht-rb');
  if(rb){ var r=C.resp && C.msgs[C.resp]; var hr=r ? '<div class="cht-rb"><div class="cht-cita">↩️ '+E(r.r==='b'?'Bloki':corto(r.d, r))+': '+E(String(r.x||'📷 Foto').slice(0,80))+'</div><button type="button" class="cht-ix" id="cht-rbx" aria-label="No responder">✕</button></div>' : '';
    if(rb._h!==hr){ rb.innerHTML=hr; rb._h=hr; } }
  fotosPintar();
  var ug=$('cht-turg'); if(ug) ug.classList.toggle('on', !!C.urg);
  pintarMensajes(envio);
}
function pintarMensajes(envio){
  var ms=$('cht-ms'), Y=yo(), c=C.cur; if(!ms || !Y || !c) return;
  var firma=C.gen+'|'+c+'|'+Math.floor(Date.now()/60000);
  if(ms._f===firma && !envio && C.saltar!==c){ marcarVisto(); return; }
  ms._f=firma;
  var abajo0=ms.scrollHeight-ms.scrollTop-ms.clientHeight<60, top0=ms.scrollTop, alto0=ms.scrollHeight;
  if(C.corte[c]==null && C.datos) C.corte[c]=vistoDe(c, Y.k);   // hasta dónde había leído al abrirla: la raya «N sin leer»
  var L=msgsDe(c), corte=C.corte[c]!=null ? C.corte[c] : vistoDe(c, Y.k), h='', dia=null, sep=false;
  var esNue=function(m){ return m.t>corte && deOtro(m, Y) && !m.bt && !m.pend; }, nNue=L.filter(esNue).length;
  var primero=L.length ? L[0].t : 0;
  if(!C.sinMas[c] && (L.length && primero>(C.desdeSrv||0)+60000 || C.mas[c])) h+='<button type="button" class="cht-mas" data-mas="1">⬆ Ver los mensajes anteriores</button>';
  else if(C.sinMas[c] && L.length) h+='<div class="cht-dia">No hay mensajes más viejos (se guardan 90 días)</div>';
  L.forEach(function(m){
    var d=diaDe(m.t); if(d!==dia){ dia=d; h+='<div class="cht-dia">'+E(diaTxt(d))+'</div>'; }
    if(!sep && nNue && esNue(m)){ sep=true; h+='<div class="cht-nue" id="cht-nue">'+nNue+' sin leer</div>'; }
    h+=burbuja(m, Y);
  });
  if(!L.length) h+='<div class="cht-vac">'+(C.datos ? 'Todavía no hay mensajes. ¡Escribí el primero! 👇' : 'Cargando…')+'</div>';
  ms.innerHTML=h;
  if(C.saltar===c && C.datos){ C.saltar=null; var nu=$('cht-nue'); ms.scrollTop=nu ? Math.max(0, nu.offsetTop-ms.offsetTop-70) : ms.scrollHeight; }
  else if(envio || abajo0) ms.scrollTop=ms.scrollHeight;
  else if(C.antesAlto){ ms.scrollTop=ms.scrollHeight-C.antesAlto+top0; C.antesAlto=0; }
  else ms.scrollTop=top0;
  marcarVisto();
}
/** Con la conversación a la vista, lo que hay queda visto (viaja en la lectura siguiente). */
var VISTO_T=0;
function marcarVisto(){
  var Y=yo(), c=C.cur; if(!Y || !c || !C.abierto || document.hidden || (C.uno && !C.en)) return;
  var mx=0; msgsDe(c).forEach(function(m){ if(!m.pend && m.t>mx) mx=m.t; });
  if(!(mx>vistoDe(c, Y.k))) return;
  (C.vistos[c]=C.vistos[c]||{})[Y.k]=mx; C.vistoPend[c]=mx;
  pintarNumero(); pintarLista();
  try{ if(typeof ASIS!=='undefined' && ASIS.montado) asisRefrescar(); }catch(e){}
  clearTimeout(VISTO_T); VISTO_T=setTimeout(function(){ if(!C.leyendo) leer(); }, 600);
}

/* ---------- autocompletar: # pedido, @ persona o Bloki ---------- */
function acMirar(){
  var tx=$('cht-tx'), a=$('cht-acm'), Y=yo(); if(!tx || !a || !Y) return;
  var antes=tx.value.slice(0, tx.selectionStart), x=/(^|\s)([#@])([^\s#@]*)$/.exec(antes);
  if(!x){ a.hidden=true; C.ac=null; return; }
  var q=chatClave(x[3]), L=[];
  if(x[2]==='#'){
    var ps=(typeof STATE!=='undefined' ? STATE : []).filter(function(p){
      try{ if(!p || !p.oc || esFilaSistema(p) || esBorrador(p)) return false; }catch(e){ return false; }
      if(!q) return true;
      var hay=chatClave([p.oc, p.cliente, p.nota, p.celular].join(' '));
      return hay.indexOf(q)>=0 || hay.replace(/[\s-]/g,'').indexOf(q.replace(/[\s-]/g,''))>=0;
    });
    ps.sort(function(a2, b2){ return String(b2.fecha||'').localeCompare(String(a2.fecha||'')) || (Number(b2.ts)||0)-(Number(a2.ts)||0); });
    ps.slice(0, 7).forEach(function(p){ var oc=String(p.oc).replace(/^OC\s*/i,'').replace(/^(ATC|RPT)\s+/i,'');
      L.push({ v:'#'+oc, h:'<b>📄 '+E(p.oc)+'</b> · '+E(p.cliente||'')+' <small>· '+E((p.fecha?fmtFechaCorta(p.fecha):'sin fecha')+' · '+(p.vendedor||''))+'</small>' }); });
  } else {
    L.push({ v:'@Bloki', h:'<b>🧽 Bloki</b> <small>· te contesta con los números del panel</small>' });
    miembros(C.cur).forEach(function(p){ if(p===Y.k) return; var nn=p==='log' ? 'Logística' : (p==='conta' ? 'Contabilidad' : nombreDe(p).split(' ')[0]);
      L.push({ v:'@'+nn, h:'<b>'+E(nombreDe(p))+'</b>' }); });
    L=L.filter(function(o){ return !q || chatClave(o.v).indexOf(q)>=0; });
  }
  if(!L.length){ a.hidden=true; C.ac=null; return; }
  C.ac={ L:L.slice(0, 7), ini:antes.length-x[3].length-1 }; C.acI=0; acPintar();
}
function acPintar(){ var a=$('cht-acm'); if(!a || !C.ac) return; a.innerHTML=C.ac.L.map(function(o, i){ return '<button type="button" class="'+(i===C.acI?'on':'')+'" data-ac="'+i+'">'+o.h+'</button>'; }).join(''); a.hidden=false; }
function acElegir(i){
  var tx=$('cht-tx'), o=C.ac && C.ac.L[i]; if(!tx || !o) return;
  var fin=tx.selectionStart;
  tx.value=tx.value.slice(0, C.ac.ini)+o.v+' '+tx.value.slice(fin);
  var p=C.ac.ini+o.v.length+1; try{ tx.setSelectionRange(p, p); }catch(e){}
  tx.focus(); var a=$('cht-acm'); if(a) a.hidden=true; C.ac=null;
}

/* ---------- ventanitas ---------- */
function verVistos(id){
  var m=C.msgs[id]; if(!m || typeof openModal!=='function') return;
  var otros=miembros(m.c).filter(function(p){ return p!==m.d && p!==m.b; });
  var si=otros.filter(function(p){ return vistoDe(m.c, p)>=m.t; }), no=otros.filter(function(p){ return vistoDe(m.c, p)<m.t; });
  openModal('<div class="modal-h"><h3>✓✓ ¿Quién lo vio?</h3><button class="modal-x" onclick="closeModal()" aria-label="Cerrar">✕</button></div>'+
    '<div class="modal-b"><p><b>Lo vieron ('+si.length+'):</b><br>'+(si.map(function(p){ return E(nombreDe(p)); }).join('<br>')||'—')+'</p>'+
    '<p><b>Todavía no ('+no.length+'):</b><br>'+(no.map(function(p){ return E(nombreDe(p)); }).join('<br>')||'—')+'</p>'+
    '<div class="modal-actions"><span style="flex:1"></span><button type="button" class="btn btn-sm" onclick="closeModal()">Listo</button></div></div>');
}
function abrirPedido(id){
  var Y=yo(); C.fichaDesdeChat=true;
  try{
    var adm=!!(typeof UNLOCKED!=='undefined' && UNLOCKED) || (Y && (Y.r==='l' || Y.r==='d'));
    if(adm && typeof showPedidoModal==='function') showPedidoModal(id); else if(typeof showMisModal==='function') showMisModal(id);
  }catch(e){}
  setTimeout(function(){ C.fichaDesdeChat=false; }, 400);
}
function borrar(id){
  var m=C.msgs[id], Y=yo(); if(!m || !Y) return;
  if(m.pend || m.err){ C.cola=C.cola.filter(function(x){ return x.id!==id; }); colaGuardar(); delete C.msgs[id]; C.gen++; pintarTodo(); return; }
  /* ❓ (16/11, la 282 en todo el panel) la ventana del panel (`preguntaYa` de pedidos.html): al contestar, vuelve a correr `borrar` */
  var _t='¿Borrar este mensaje? Lo deja de ver todo el que estaba en la conversación.';
  var _si=(typeof window.preguntaYa==='function')
    ? window.preguntaYa(_t, { titulo:'¿Borrar este mensaje?', icono:'🗑️', peligro:true, lineas:['Lo deja de ver todo el que estaba en la conversación.'],
        no:'No, dejarlo', si:'🗑 Sí, borrarlo' }, function(){ borrar(id); })
    : confirm(_t);
  if(!_si) return;
  apiPost({ action:'chatBorrar', id:id, cq:Y.k }).then(function(r){
    if(r && r.ok){ m.bt=r.bt||Date.now(); m.x=''; m.f=[]; C.gen++; pintarTodo(); toast('🗑 Borrado: ya no lo ve nadie en el panel.', 'ok', 3500); }
    else toast(r && r.error==='tarde' ? '🗑 Pasaron más de 10 minutos: ya no se puede borrar.' : '🗑 No se pudo borrar. Probá de nuevo.', 'warn', 4500);
  }, function(){ toast('🗑 Sin señal: no se pudo borrar.', 'warn', 4000); });
}
function verAnteriores(){
  var Y=yo(), c=C.cur; if(!Y || !c) return;
  var L=msgsDe(c).filter(function(m){ return !m.pend; }), antes=L.length ? L[0].t : Date.now();
  var ms=$('cht-ms'); C.antesAlto=ms ? ms.scrollHeight : 0;
  apiPost({ action:'chatLeer', cq:Y.k, conv:c, antes:antes }).then(function(r){
    if(!(r && r.ok)) return;
    (r.msgs||[]).forEach(function(m){ if(m && m.i && !C.msgs[m.i]) C.msgs[m.i]=m; });
    C.mas[c]=!!r.mas; if(!r.mas) C.sinMas[c]=true;
    C.gen++; pintarTodo();
  });
}

/* ---------- los toques ---------- */
function enlazar(){
  document.addEventListener('click', function(e){
    var t=e.target, b;
    if(!t || !t.closest) return;
    if(t.closest('#cht-btn')){ chatToggle(); return; }
    var vis=$('cht-visor');
    if(vis && !vis.hidden && (t===vis || t.closest('[data-vx]'))){ vis.hidden=true; return; }
    var panel=$('cht-panel'); if(!panel || !panel.contains(t)) return;
    if(t.closest('#cht-x') || t.closest('#cht-x2')){ chatCerrar(); return; }
    if(t.closest('#cht-atras')){ volverLista(); return; }
    if(t.closest('#cht-grupo')){ var on=lsGet(LS_GRUPO)!=='1'; lsSet(LS_GRUPO, on?'1':'0'); toast(on ? '🔔 Te aviso de TODO lo del grupo.' : '🔕 Del grupo te aviso solo si te nombran o escribe Eduardo.', 'ok', 3500); pintarTodo(); return; }
    if((b=t.closest('[data-cc]'))){ irConv(b.getAttribute('data-cc')); return; }
    if((b=t.closest('[data-yo]'))){ var q=b.getAttribute('data-yo'); if(q==='eduardo'){ lsSet(LS_YO, 'eduardo'); C.yoK=''; chatAbrir(); } else { lsSet(LS_YO, null); try{ quienAbrir(true); }catch(er){} } return; }
    if(t.closest('#cht-env')){ chatMandar(); return; }
    if(t.closest('#cht-tfoto')){ var f=$('cht-file'); if(f) f.click(); return; }
    if(t.closest('#cht-tped') || t.closest('#cht-tbk')){ var tx=$('cht-tx'); if(!tx) return; var ins=t.closest('#cht-tped') ? '#' : '@Bloki ';
      try{ tx.setRangeText((tx.value && !/\s$/.test(tx.value.slice(0, tx.selectionStart)) ? ' ' : '')+ins, tx.selectionStart, tx.selectionEnd, 'end'); }catch(er){ tx.value+=ins; }
      tx.focus(); acMirar(); return; }
    if(t.closest('#cht-turg')){ C.urg=!C.urg; t.closest('#cht-turg').classList.toggle('on', C.urg); return; }
    if((b=t.closest('[data-ac]'))){ acElegir(+b.getAttribute('data-ac')); return; }
    if((b=t.closest('[data-pid]'))){ abrirPedido(b.getAttribute('data-pid')); return; }
    if((b=t.closest('[data-fid]'))){ fotoVer(b.getAttribute('data-fid')); return; }
    if((b=t.closest('[data-fq]'))){ var k=b.getAttribute('data-fq'); C.fotos=C.fotos.filter(function(x){ return x.k!==k; }); fotosPintar(); return; }
    if((b=t.closest('[data-vv]'))){ verVistos(b.getAttribute('data-vv')); return; }
    if((b=t.closest('[data-rr]'))){ C.resp=b.getAttribute('data-rr'); pintarConvEntera(false); var tx2=$('cht-tx'); if(tx2) tx2.focus(); return; }
    if((b=t.closest('[data-bb]'))){ borrar(b.getAttribute('data-bb')); return; }
    if(t.closest('#cht-rbx')){ C.resp=null; pintarConvEntera(false); return; }
    if(t.closest('[data-mas]')){ verAnteriores(); return; }
    if(t.closest('[data-reint]')){ C.reintentoEn=0; enviar(); return; }
  });
  document.addEventListener('keydown', function(e){
    if(e.target && e.target.id==='cht-tx'){
      if(C.ac){
        if(e.key==='ArrowDown' || e.key==='ArrowUp'){ C.acI=(C.acI+(e.key==='ArrowDown'?1:-1)+C.ac.L.length)%C.ac.L.length; acPintar(); e.preventDefault(); return; }
        if(e.key==='Enter' || e.key==='Tab'){ acElegir(C.acI); e.preventDefault(); return; }
        if(e.key==='Escape'){ var a=$('cht-acm'); if(a) a.hidden=true; C.ac=null; e.preventDefault(); e.stopPropagation(); return; }
      }
      if(e.key==='Enter' && !e.shiftKey && !e.isComposing){ e.preventDefault(); chatMandar(); return; }
      if(e.key!=='Escape') return;
    }
    if(e.key==='Escape'){
      var v=$('cht-visor'); if(v && !v.hidden){ v.hidden=true; return; }
      var mo=$('modal'); if(mo && mo.classList.contains('on')) return;   // primero se cierra la ficha
      if(C.abierto) chatCerrar();
    }
  });
  document.addEventListener('input', function(e){
    if(!e.target) return;
    if(e.target.id==='cht-tx'){ var t=e.target; t.style.height='auto'; t.style.height=Math.min(120, t.scrollHeight)+'px'; acMirar(); }
    if(e.target.id==='cht-bus') pintarLista();
  });
  /* 📋 pegar una captura (Ctrl + V) y arrastrar el archivo */
  document.addEventListener('paste', function(e){
    if(!C.abierto || !C.cur) return;
    var panel=$('cht-panel'); if(!panel || !panel.contains(document.activeElement)) return;
    var it=(e.clipboardData && e.clipboardData.items) || [], L=[];
    for(var i=0;i<it.length;i++) if(it[i].kind==='file' && /^image\//.test(it[i].type)){ var f=it[i].getAsFile(); if(f) L.push(f); }
    if(L.length){ e.preventDefault(); fotoAgregar(L); }
  });
  document.addEventListener('dragover', function(e){ var p=$('cht-panel'); if(C.abierto && C.cur && p && p.contains(e.target)) e.preventDefault(); });
  document.addEventListener('drop', function(e){
    var p=$('cht-panel'); if(!(C.abierto && C.cur && p && p.contains(e.target))) return;
    e.preventDefault(); if(e.dataTransfer && e.dataTransfer.files) fotoAgregar(e.dataTransfer.files);
  });
  document.addEventListener('visibilitychange', function(){ if(!document.hidden && C.abierto){ marcarVisto(); if(Date.now()-C.ultLeer>5000) leer(); } });
  window.addEventListener('online', function(){ C.reintentoEn=0; enviar(); });
}

/* ---------- el reloj ---------- */
function tic(){
  if(!activo()) return;
  montar(); botonPintar();
  if(!servidorOk()) return;
  var Y=yo(); if(!Y) return;
  if(C.yoK!==Y.k) reset(Y);
  var ahora=Date.now(), vis=!document.hidden;
  if(C.cola.length && !C.enviando && ahora>=C.reintentoEn) enviar();
  if(C.leyendo) return;
  if(C.abierto && vis){
    var cada=(ahora-C.ultMov<CHAT_MOVIDO_MS) ? CHAT_LEER_RAPIDO : CHAT_LEER_LENTO;
    if(ahora-C.ultLeer>=cada){ leer(); return; }
    pintarMensajes(false);
  }
  if(C.necesitaLeer){ C.necesitaLeer=false; leer(); return; }
  if(C.frio && ahora-C.ultLeer>=CHAT_FRIO_MS) leer();
}

/* ---------- Bloki, el aviso de Windows, Ctrl + K y la ficha al costado ---------- */
/** Lo sin leer que avisa, para `escritorio.js` (`pendientes`): una clave por mensaje, el último de cada conversación reemplaza al anterior. */
window.chatPendientes=function(){
  if(!activo() || !servidorOk()) return [];
  var Y=yo(); if(!Y || !C.datos) return [];
  return sinLeerLista(Y).filter(function(m){ return avisable(m, Y) && !(C.abierto && !document.hidden && C.cur===m.c); }).map(function(m){
    var quien=m.r==='b' ? 'Bloki' : corto(m.d, m), donde=m.c==='eq' ? ' en el grupo' : (/^b:/.test(m.c) && Y.r==='v' ? (' ('+(/^b:log/.test(m.c)?'Logística':'Contabilidad')+')') : '');
    return { k:'chat|'+m.i, tag:'chat|'+m.c, tipo:'chat', id:m.c, kd:m.u ? 'err' : 'ok', fijo:!!m.u,
      t:'🗨️ '+quien+donde+(m.u?' · 🔴 urgente':''), b:(m.f && m.f.length && !m.x) ? '📷 Foto' : String(m.x||'').replace(/\s+/g,' ').slice(0,140) };
  });
};
function blokiAviso(){
  var Y=yo(); if(!Y || !C.datos || !servidorOk()) return null;
  var L=sinLeerLista(Y).filter(function(m){ return avisable(m, Y) && !(C.abierto && C.cur===m.c); });
  if(!L.length) return null;
  var m=L[L.length-1], quien=m.r==='b' ? 'Bloki' : corto(m.d, m), urg=L.some(function(x){ return x.u; });
  return { k:'chat|'+m.c+'|'+m.i, sev:urg ? 'ro' : '', ico:'💬', t:quien+' te escribió'+(m.c==='eq'?' en «Todo el equipo»':'')+(L.length>1?(' (y '+(L.length-1)+' más)'):''),
    x:'«'+String(m.x || '📷 Foto').replace(/\s+/g,' ').slice(0,90)+'»', b:['Abrir el chat', "chatAbrir('"+String(m.c).replace(/['\\]/g,'')+"')"] };
}
window.chatBlokiAviso=blokiAviso;
/* 💬 «Preguntar por este pedido» en la ficha (la de Mis pedidos y la de Administración): abre la conversación que corresponde con
   «#11-188 » ya escrito. Una vendedora → su ventanilla de Logística; Logística / Contabilidad → la ventanilla de la vendedora del pedido;
   Eduardo → su privado con ella. Sin vendedora del equipo (ROHO, internos), no aparece. */
function fichaConv(p, Y){
  if(!p || !Y) return null;
  var vk=chatClave(p.vendedor||''), esEq=equipo().some(function(x){ return x.k===vk; });
  if(Y.r==='v') return { c:'b:log|'+Y.k, t:'💬 Preguntarle a Logística por este pedido' };
  if(!esEq) return null;
  if(Y.r==='l') return { c:'b:log|'+vk, t:'💬 Escribirle a '+nombreDe(vk).split(' ')[0]+' por este pedido' };
  if(Y.r==='c') return { c:'b:conta|'+vk, t:'💬 Escribirle a '+nombreDe(vk).split(' ')[0]+' por este pedido' };
  if(Y.r==='d') return { c:pk(EDU_K, vk), t:'💬 Escribirle a '+nombreDe(vk).split(' ')[0]+' por este pedido' };
  return null;
}
function fichaBoton(id){
  if(!activo() || !servidorOk()) return;
  var p=null; try{ p=findById(id); }catch(e){} if(!p || !p.oc) return;
  var f=fichaConv(p, yo()), box=$('modal-box'); if(!f || !box || box.querySelector('.cht-ficha')) return;
  var oc=String(p.oc).replace(/^OC\s*/i,'').trim();
  var b='<button type="button" class="btn btn-sm cht-ficha no-print" data-chtc="'+E(f.c)+'" data-chto="'+E(oc)+'">'+E(f.t)+'</button>';
  var ac=box.querySelector('.fl-listo') ? box.querySelector('.fl-listo').parentNode : null, acs=box.querySelectorAll('.modal-actions');
  if(ac) ac.insertAdjacentHTML('afterbegin', b);
  else if(acs.length) acs[acs.length-1].insertAdjacentHTML('beforeend', b);
  else box.insertAdjacentHTML('beforeend', '<div style="margin-top:10px">'+b+'</div>');
}
function fichaPreguntar(c, oc){
  try{ if(typeof closeModal==='function') closeModal(); }catch(e){}
  chatAbrir(c);
  setTimeout(function(){ var t=$('cht-tx'); if(!t) return; var ins='#'+oc+' '; if(t.value.indexOf(ins)<0) t.value=ins+t.value; try{ t.focus(); t.setSelectionRange(t.value.length, t.value.length); }catch(e){} }, 60);
}
document.addEventListener('click', function(e){
  var b=e.target && e.target.closest && e.target.closest('[data-chtc]'); if(!b) return;
  fichaPreguntar(b.getAttribute('data-chtc'), b.getAttribute('data-chto'));
});
function engancharPanel(){
  ['showMisModal', 'showPedidoModal'].forEach(function(fn){
    if(typeof window[fn]!=='function' || window[fn]._cht) return;
    var _o=window[fn];
    window[fn]=function(id){ var r=_o.apply(this, arguments); try{ fichaBoton(id); }catch(e){} return r; };
    window[fn]._cht=1;
  });
  if(typeof window.asisAvisos==='function' && !window.asisAvisos._cht){
    var _aa=window.asisAvisos;
    window.asisAvisos=function(){
      var A=_aa.apply(this, arguments);
      try{
        var a=blokiAviso();
        if(a && !(typeof asisOculto==='function' && asisOculto(asisVistos(), a.k))){
          var i=0; while(i<A.length && (A[i].anuncio || /^(anuncio|res)/.test(String(A[i].k||'')))) i++;
          A.splice(i, 0, a);
        }
      }catch(e){}
      return A;
    };
    window.asisAvisos._cht=1;
  }
  if(typeof window.palAcciones==='function' && !window.palAcciones._cht){
    var _pa=window.palAcciones;
    window.palAcciones=function(){
      var A=_pa.apply(this, arguments);
      if(!activo() || !servidorOk()) return A;
      var Y=yo(), L=[{ ic:'💬', t:'Abrir el chat', s:'el grupo, Eduardo, Logística y Contabilidad', q:'chat mensajes escribir grupo equipo conversacion', fn:function(){ chatAbrir(); } }];
      if(Y && Y.r!=='d') L.push({ ic:'🧑‍💼', t:'Escribirle a Eduardo', s:'por privado, en el chat', q:'escribir eduardo privado chat dueno', fn:function(){ chatAbrir(pk(Y.k, EDU_K)); } });
      if(Y && Y.r==='v') L.push({ ic:'🚚', t:'Preguntarle a Logística', s:'en el chat', q:'logistica preguntar chat camion', fn:function(){ chatAbrir('b:log|'+Y.k); } });
      return A.concat(L);
    };
    window.palAcciones._cht=1;
  }
  if(typeof window.fichaCostadoAplicar==='function' && !window.fichaCostadoAplicar._cht){
    var _fc=window.fichaCostadoAplicar;
    window.fichaCostadoAplicar=function(){
      var r=_fc.apply(this, arguments);
      try{ if(C.abierto && !C.fichaDesdeChat && document.body.classList.contains('ficha-costado')) chatCerrar(); }catch(e){}
      return r;
    };
    window.fichaCostadoAplicar._cht=1;
  }
}

/* ---------- arranque ---------- */
if(!activo()) return;
C.cola=colaLeer();
function empezar(){
  montar(); engancharPanel();
  if(C.timer) clearInterval(C.timer);
  C.timer=setInterval(tic, CHAT_TIC_MS);
  tic();
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', empezar); else empezar();
})();
