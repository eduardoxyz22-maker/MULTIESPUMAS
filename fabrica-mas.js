/* ============================================================================
   🎬 LA FÁBRICA DE EDUARDO, LAS 14 MEJORAS 144-157 (10/11/2026; el dueño las vio armadas y dijo «Me gusta, hazlo y publica»).
   Archivo aparte de pedidos.html: se baja la primera vez que se abre la fábrica 3D de Mis pedidos (`fabMasCargar`; `fabMasQuiere()`:
   siempre, salvo `me_fab_mas`=0 en ese aparato o en Playwright sin `FAB_MAS_PRUEBA`). Si no baja, la fábrica sale como antes.
   Cada idea se prende y se apaga sola en `fabMas.on`. Usa las piezas de la fábrica (depCaja, depPersona, depMontacargas, depTween,
   depVidaIr…) y los datos de siempre de Mis pedidos (`DEP`, `VIDA`), el stock del cuadrito (`saldoDatos`) y «Ya salió» (`camionSalio`).
   SOLO DIBUJO: nada escribe pedidos, cupos, tildes ni la planilla. Con «reducir movimiento» queda todo quieto en su lugar.
   Al cambiarlo: subir `FABMAS_V` en pedidos.html y `node --check fabrica-mas.js`.
   ========================================================================== */
(function(){
'use strict';
var M=window.fabMas={
  on:{ carga:1, camiones:1, stock:1, torre:1, luz:1, piso:1, linea:1, afuera:1, caras:1, situ:1, paseo:1, tele:1, sonido:1, festejo:1 },
  hora:null,            // para mirar otra hora del día sin esperar: 7, 12, 17.5, 21
  stockDemo:null,       // para la muestra: [{ n:'TITANIO 140', u:12 }]
  S:null, antes:{ car:null, sal:null, salT:0, falta:null, ctx:'', t:0 }, luzDe:null, audio:null
};
function col(c){ return new THREE.Color(c).convertSRGBToLinear(); }
function aditivo(c, op){ return new THREE.MeshBasicMaterial({ color:col(c), transparent:true, opacity:op, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide, fog:false }); }
function horaAhora(){ if(M.hora!=null) return M.hora; var d=horaBolivia(); return d.getHours()+d.getMinutes()/60; }
function momento(h){ return (h<5.5 || h>=18.9) ? 'noche' : h<9.5 ? 'manana' : h<16.2 ? 'dia' : 'tarde'; }
function quieto(){ return visQuieto(); }
function luego(fn, ms){ return depVidaLuego(fn, ms); }
function mudo(){ try{ return localStorage.getItem('me_asis_mudo')==='1'; }catch(e){ return false; } }
var LUZ={ manana:{ sol:'#ffe9c4', si:1.0,  sp:[-17,14,12], hi:.62, cielo:'#e9f1f1', exp:1.08 },
          dia:   { sol:'#fff6e8', si:1.0,  sp:[10,20,14],  hi:.6,  cielo:'#dfe7ea', exp:1.08 },
          tarde: { sol:'#ff9a4a', si:1.25, sp:[19,6.5,9],  hi:.38, cielo:'#f2cfae', exp:1.1 },
          noche: { sol:'#8fa8ff', si:.1,   sp:[-8,18,10],  hi:.1,  cielo:'#0b1320', exp:.95 } };

M.armar=function(ctx){
  var W=DEP.w3; if(!W || !VIDA) return;
  var S=M.S={ ctx:ctx, g:ctx.g, ancho:ctx.ancho, fz:ctx.fz, cada:[], mom:momento(horaAhora()), t:0 }, on=M.on;
  /* el celular: menos luces de verdad (cada una le cuesta a TODOS los materiales) */
  try{ S.chico=(W.box.clientWidth||900)<700 || !!(window.matchMedia && matchMedia('(pointer:coarse)').matches && (W.box.clientWidth||900)<1000); }catch(e){ S.chico=false; }
  /* «se tildó recién» y «se terminó de cargar» valen solo contra la MISMA vista de hace un rato (mismos clientes y período): cambiar de
     período o volver al otro día no es cargar nada */
  var clave=(DEP.per||'')+'|'+todayStr()+'|'+(ctx.C||[]).map(function(c){ return c.c; }).join('¦');
  S.mismo=M.antes.ctx===clave && Date.now()-M.antes.t<15*60000; if(!S.mismo){ M.antes.car=null; M.antes.falta=null; } M.antes.ctx=clave; M.antes.t=Date.now();
  [['luz',M.luz],['afuera',M.portones],['torre',M.torre],['piso',M.piso],['linea',M.linea],['stock',M.stockCarteles],['tele',M.tele],['caras',M.caras],
   ['situ',M.situ],['paseo',M.botones],['camiones',M.camiones],['carga',M.carga],['festejo',M.festejoMirar]].forEach(function(p){
    if(!on[p[0]] && !(p[0]==='afuera' && on.camiones) && !(p[0]==='paseo' && on.sonido)) return;
    try{ p[1](S); }catch(e){ console.error('fabMas.'+p[0], e); } });
  /* la hora sigue corriendo: cuando cambia el momento del día (mañana → día → tarde → noche) la escena se arma de nuevo con su luz */
  var mt=0; S.cada.push(function(t, dt){ mt+=dt; if(mt<20) return; mt=0; if(on.luz && momento(horaAhora())!==S.mom) setTimeout(function(){ if(M.S===S && DEP.w3 && DEP.w3.modo==='mis' && DEP.C) depConstruir(DEP.C); }, 0); });
  /* con «reducir movimiento» nadie llama a `paso`: una pasada sola deja cada cosa en su lugar (el colchón entre los dos operarios…) */
  if(quieto()) M.paso(0, 0, true);
};
M.paso=function(t, dt, una){ var S=M.S; if(!S || !VIDA) return; S.t=t;
  for(var i=0;i<S.cada.length;i++){ try{ S.cada[i](t, dt); }catch(e){ console.error('fabMas.paso', e); S.cada.splice(i--, 1); } } };   // lo que falla se saca: no rompe lo demás ni se repite en cada cuadro
M.salir=function(){ M.luzVolver(); M.S=null; var b=document.getElementById('fab-mas-bot'); if(b) b.remove(); M.sonar(false); };

/* ---------- 148 · la hora de Bolivia en la luz ---------- */
function luces(){ var W=DEP.w3, o={}; W.esc.children.forEach(function(c){ if(c.isDirectionalLight) o.sol=c; if(c.isHemisphereLight) o.hemi=c; }); return o; }
M.luzVolver=function(){ var W=DEP.w3, d=M.luzDe; if(!W || !d) return; var L=luces();
  L.sol.color.copy(d.sc); L.sol.intensity=d.si; L.sol.position.copy(d.sp); L.hemi.intensity=d.hi; W.esc.background.copy(d.bg); W.esc.fog.color.copy(d.bg); W.r.toneMappingExposure=d.exp;
  (d.puntos||[]).forEach(function(p){ W.esc.remove(p); }); M.luzDe=null; };
M.luz=function(S){
  var W=DEP.w3, L=luces(), mom=S.mom, c=LUZ[mom]; if(!L.sol || !L.hemi) return;
  if(!M.luzDe) M.luzDe={ sc:L.sol.color.clone(), si:L.sol.intensity, sp:L.sol.position.clone(), hi:L.hemi.intensity, bg:W.esc.background.clone(), exp:W.r.toneMappingExposure, puntos:[] };
  M.luzDe.puntos.forEach(function(p){ W.esc.remove(p); }); M.luzDe.puntos=[];
  L.sol.color.copy(col(c.sol)); L.sol.intensity=c.si; L.sol.position.set(c.sp[0],c.sp[1],c.sp[2]); L.hemi.intensity=c.hi; W.esc.background.copy(col(c.cielo)); W.esc.fog.color.copy(col(c.cielo)); W.r.toneMappingExposure=c.exp;
  var g=S.g, A=S.ancho;
  if(mom==='tarde' || mom==='manana'){   // los rayos entran por los ventanales del costado, con el polvo adentro
    var lado=mom==='tarde'?1:-1, rayos=[];
    [-5.5,-1.5,2.5,6.5,10.5].forEach(function(z, i){ var gr=new THREE.Group(), m=new THREE.Mesh(new THREE.PlaneGeometry(13,2.1), aditivo(mom==='tarde'?'#ffb866':'#fff0c8', .15));
      m.rotation.x=-Math.PI/2; gr.add(m); gr.position.set(lado*(A/2+1.5), 3.1, z); gr.rotation.z=lado*.44; g.add(gr); rayos.push(m);
      var piso=new THREE.Mesh(new THREE.PlaneGeometry(4.6,2.1), aditivo(mom==='tarde'?'#ffa64d':'#fff0c8', .2)); piso.rotation.x=-Math.PI/2; piso.position.set(lado*(A/2-5.6), .02, z); g.add(piso); });
    S.cada.push(function(t){ rayos.forEach(function(m, i){ m.material.opacity=(mom==='tarde'?.15:.1)+Math.sin(t*.5+i)*.03; }); });
  }
  if(mom==='noche'){   // de noche alumbran las lámparas: tres luces de verdad (sin sombra) y su charco en el piso
    (S.chico?[0]:[-1,0,1]).forEach(function(l){ var p=new THREE.PointLight(0xffd9a0, S.chico?.7:.5, S.chico?24:17, 2); p.position.set(l*A/3, 6.2, S.fz+5); W.esc.add(p); M.luzDe.puntos.push(p);
      var q=new THREE.PointLight(0xffd9a0, .42, 15, 2); q.position.set(l*A/3, 5.4, 9); W.esc.add(q); M.luzDe.puntos.push(q);
      [[S.fz+5,6.4],[9,5.6]].forEach(function(zy){ var cono=new THREE.Mesh(new THREE.ConeGeometry(3.6,zy[1],20,1,true), aditivo('#ffdca0', .028)); cono.position.set(l*A/3, zy[1]/2, zy[0]); g.add(cono);
        var ch=new THREE.Mesh(new THREE.CircleGeometry(3.7,24), aditivo('#ffd9a0', .07)); ch.rotation.x=-Math.PI/2; ch.position.set(l*A/3, .021, zy[0]); g.add(ch); }); });
    M.sereno(S);
  }
};
/* el sereno hace su ronda con la linterna */
M.sereno=function(S){
  var P=depPersona({ camisa:'#1f2937', pant:'#111827', gorra:'#111827' }), A=S.ancho, lx=A/2+1.2, ronda=[{ x:-lx, z:4.9 }, { x:lx, z:4.9 }, { x:lx, z:-5.6 }, { x:-lx, z:-5.6 }];
  P.g.position.set(-lx,0,4.9); S.g.add(P.g);
  P.md.add(depCaja(.07,.07,.26,'#374151',0,-.44,.1));
  var haz=new THREE.Mesh(new THREE.ConeGeometry(1.5,5.2,18,1,true), aditivo('#fff3c4', .11)); haz.rotation.x=-Math.PI/2; haz.position.set(0,-.44,2.85); P.md.add(haz);
  var punto=S.chico?new THREE.Object3D():new THREE.PointLight(0xfff0c0, .8, 8, 2); DEP.w3.esc.add(punto); M.luzDe.puntos.push(punto);
  var Q=VIDA.q.sereno={ P:P, n:'Sereno:', col:'#334155', dy:2.1, vel:1.1, modo:'quieto', i:0, ronda:ronda };
  S.cada.push(function(t, dt){ depVidaMover(Q, dt); if(!Q.path){ Q.i=(Q.i+1)%ronda.length; depVidaIr(Q, [ronda[Q.i]]); }
    depVidaAnimar(P, 'anda', t); P.bd.rotation.x=-.5; P.md.rotation.x=-.9+Math.sin(t*.8)*.12; P.bd.rotation.z=Math.sin(t*.5)*.25;
    var y=P.g.rotation.y, p=P.g.position; punto.position.set(p.x+Math.sin(y)*4, 1.2, p.z+Math.cos(y)*4); });
};

/* ---------- 151 · afuera del portón (y las puertas por donde salen los camiones, 145) ---------- */
function afueraTex(mom){
  var T=depVidaTex(512,512), x=T.x, G=x.createLinearGradient(0,0,0,330);
  var cielo={ manana:['#9fd3f2','#fde9c9'], dia:['#5fb2ea','#cfe9f7'], tarde:['#f08a4b','#fbd28a'], noche:['#0b1430','#1d2a52'] }[mom];
  G.addColorStop(0,cielo[0]); G.addColorStop(1,cielo[1]); x.fillStyle=G; x.fillRect(0,0,512,512);
  if(mom==='noche'){ x.fillStyle='#fdf6d8'; x.beginPath(); x.arc(400,80,26,0,6.3); x.fill(); for(var s=0;s<40;s++){ x.fillRect((s*97)%512, (s*53)%240, 2, 2); } }
  else { x.fillStyle=mom==='tarde'?'#fff1b8':'#fffbe6'; x.beginPath(); x.arc(mom==='manana'?110:400, mom==='dia'?70:150, 30, 0, 6.3); x.fill();
    x.fillStyle='rgba(255,255,255,.85)'; [[120,90,46],[170,100,34],[330,60,40],[380,72,30]].forEach(function(c){ x.beginPath(); x.ellipse(c[0],c[1],c[2],c[2]*.42,0,0,6.3); x.fill(); }); }
  var osc=mom==='noche';
  [[10,210,90,'#8f9aa3'],[110,170,70,'#a9b3ba'],[190,230,110,'#7f8b94'],[310,190,80,'#9aa5ad'],[400,220,112,'#86929b']].forEach(function(b){
    x.fillStyle=osc?'#131c2e':b[3]; x.fillRect(b[0], b[1], b[2], 330-b[1]);
    for(var wy=b[1]+12; wy<318; wy+=22) for(var wx=b[0]+8; wx<b[0]+b[2]-10; wx+=18){ x.fillStyle=osc?(((wx+wy)%5)<2?'#ffd772':'#1b2740'):'rgba(255,255,255,.5)'; x.fillRect(wx, wy, 9, 11); } });
  x.fillStyle=osc?'#0c2b1e':'#2f9e44'; [[60,300],[250,296],[470,302]].forEach(function(p){ x.fillRect(p[0]-3, p[1], 6, 40); for(var k=0;k<7;k++){ x.save(); x.translate(p[0], p[1]); x.rotate(-1.4+k*.47); x.beginPath(); x.ellipse(22,0,24,6,0,0,6.3); x.fill(); x.restore(); } });
  x.fillStyle=osc?'#1a1f27':'#59626b'; x.fillRect(0,335,512,177); x.fillStyle=osc?'#2a313c':'#c9d1d4'; x.fillRect(0,330,512,10);
  x.fillStyle='#f5d04a'; for(var d=0;d<512;d+=70) x.fillRect(d+10, 418, 40, 7);
  T.t.needsUpdate=true; return T.t;
}
M.portones=function(S){
  var g=S.g, A=S.ancho, n=Math.max(2, Math.round(A/7)), tex=afueraTex(S.mom); S.puertas=[];
  for(var p=0;p<n;p++){ var px=-A/2+(p+.5)*A/n;
    var vista=new THREE.Mesh(new THREE.PlaneGeometry(4.0,4.2), new THREE.MeshBasicMaterial({ map:tex, fog:false })); vista.position.set(px, 2.12, S.fz-2.19); g.add(vista);
    var cort=depCaja(4.1,4.3,.1,'#5e666c',px,2.15,S.fz-2.12); g.add(cort);
    var pu={ x:px, cort:cort, abierta:false }; S.puertas.push(pu);
    if(M.on.afuera && p===n-1) M.puerta(pu, true, true); }
};
M.puerta=function(pu, abrir, ya){ pu.abierta=abrir; var y=abrir?4.15:2.15; if(ya){ pu.cort.position.y=y; pu.cort.scale.y=abrir?.12:1; return; }
  depTween(pu.cort.position, { y:y }, 1.1, 0); depTween(pu.cort.scale, { y:abrir?.12:1 }, 1.1, 0); };

/* ---------- 145 · los camiones salen y vuelven ---------- */
/* «Está afuera» = lo marcaron «🚚 Ya salió» o lo dice el GPS (`camionSalio`, la de siempre) y el GPS todavía no lo vio volver del todo
   (`gpsVolvioDelTodo`). Solo mira. */
function afueraDe(v){ var s=''; try{ s=camionSalio(todayStr(), v)||''; if(s){ var d=gpsDiaDe(v); if(d && gpsVolvioDelTodo(d)) s=''; } }catch(e){} return s; }
M.afueraDe=afueraDe;
function etqDe(obj){ var r=null; DEP.w3.etqs.forEach(function(t){ if(t.obj===obj) r=t; }); return r; }
function cartel(c, s){ var t=etqDe(c.t.g); if(!t) return; if(c.etq0==null) c.etq0=t.el.innerHTML;
  t.el.innerHTML=s?('🛣️ '+esc(c.v)+'<small>salió a las '+esc(s)+' · en camino</small>'):c.etq0; t.el.style.setProperty('--c', s?'#1d4ed8':'#14232a'); t.w=0; }
M.camiones=function(S){
  var prev=M.antes.sal, fresco=!!prev && Date.now()-M.antes.salT<15000, ahora={};
  S.ctx.cams.forEach(function(c){ var s=afueraDe(c.v); ahora[c.v]=s; c.casa={ x:c.t.g.position.x, z:c.t.g.position.z };
    if(!s) return;
    if(fresco && prev[c.v]==='') M.camionSale(S, c, s);       // salió recién, mirando la fábrica: se va por el portón
    else M.camionFuera(S, c, s); });                             // ya estaba afuera: el andén queda vacío, con su cartel
  M.antes.sal=ahora; M.antes.salT=Date.now(); var tic=0;
  S.cada.push(function(t, dt){ tic+=dt; if(tic<2) return; tic=0; var viejo=Date.now()-M.antes.salT>20000;   // la fábrica estuvo escondida: se pone al día sin función
    S.ctx.cams.forEach(function(c){ var s=afueraDe(c.v), a=M.antes.sal[c.v]||'';
      if(s && !c.fuera){ if(viejo) M.camionFuera(S, c, s); else M.camionSale(S, c, s); }
      else if(!s && c.fuera===2) M.camionVuelve(S, c, viejo);
      else if(s && s!==a && c.fuera===2) cartel(c, s);
      M.antes.sal[c.v]=s; }); M.antes.salT=Date.now(); });
};
function puertaDe(S, c){ var m=null; (S.puertas||[]).forEach(function(p){ if(!m || Math.abs(p.x-c.casa.x-1.2)<Math.abs(m.x-c.casa.x-1.2)) m=p; }); return m; }
function choferDe(c){ var k=(VIDA.chof||[]).filter(function(q){ return VIDA.q[q].v===c.v; })[0]; return k?VIDA.q[k]:null; }
function puertaFija(S, pu){ return !!M.on.afuera && pu===S.puertas[S.puertas.length-1]; }
M.camionFuera=function(S, c, s){ var tg=c.t.g; c.fuera=2; tg.visible=false; tg.position.set(c.casa.x, 0, c.casa.z); tg.rotation.y=0; var q=choferDe(c); if(q) q.P.g.visible=false; cartel(c, s||afueraDe(c.v)||'—'); };
M.camionSale=function(S, c, s){
  if(c.fuera) return; c.fuera=1; var tg=c.t.g, pu=puertaDe(S, c), q=choferDe(c); if(quieto() || !pu){ M.camionFuera(S, c, s); return; }
  if(q){ depDecir(VIDA.chof.filter(function(k){ return VIDA.q[k]===q; })[0], '¡Me voy a entregar! 🚚', 2.2); luego(function(){ q.P.g.visible=false; }, 900); }
  tg.rotation.order='YXZ'; M.puerta(pu, true); M.pitido(3);
  depTween(tg.position, { x:pu.x, z:c.casa.z+.9 }, 2.0, .9); depTween(tg.rotation, { y:Math.PI/2 }, 2.0, .9, depSuave, function(){
    depTween(tg.position, { z:S.fz-15 }, 2.6, .15, depCae, function(){ M.camionFuera(S, c, s); M.puerta(pu, puertaFija(S, pu)); }); });
};
M.camionVuelve=function(S, c, ya){
  var tg=c.t.g, pu=puertaDe(S, c), q=choferDe(c); cartel(c, '');
  if(ya || quieto() || !pu){ tg.visible=true; tg.position.set(c.casa.x,0,c.casa.z); tg.rotation.y=0; c.fuera=0; if(q) q.P.g.visible=true; return; }
  c.fuera=1; tg.visible=true; tg.rotation.order='YXZ'; tg.rotation.y=Math.PI/2; tg.position.set(pu.x, 0, S.fz-15); M.puerta(pu, true); M.pitido(4);
  depTween(tg.position, { z:c.casa.z+.9 }, 2.6, .8, depSale, function(){ depTween(tg.position, { x:c.casa.x, z:c.casa.z }, 2.0, 0); depTween(tg.rotation, { y:0 }, 2.0, 0, depSuave, function(){
    c.fuera=0; if(q) q.P.g.visible=true; M.puerta(pu, puertaFija(S, pu)); }); });
};

/* ---------- 144 · la carga se ve: el montacargas lleva al camión lo que se tildó ---------- */
M.carga=function(S){
  var prev=M.antes.car, ahora={};
  S.ctx.cams.forEach(function(c){ (c.pgs||[]).forEach(function(d){ var k=c.v+'|'+d.k; ahora[k]=d.u;
    if(prev && d.u>(prev[k]||0) && !quieto() && !c.fuera && (S.llevando||0)<3){ var zi=-1; S.llevando=(S.llevando||0)+1;   // como mucho tres a la vez: lo demás cae como siempre S.ctx.C.forEach(function(cl, i){ if(zi<0 && cl.prod[d.k] && cl.prod[d.k].cam && cl.prod[d.k].cam[c.v]) zi=i; });
      M.llevar(S, (S.ctx.zonas[zi]||{ x:0 }).x, c, d.pg); } }); });
  M.antes.car=ahora;
};
M.llevar=function(S, x0, cam, pg){
  var W=DEP.w3, mc=depMontacargas(), Q={ P:{ g:mc.g }, vel:3.4, modo:'quieto' }, zc=S.fz+3.55, xc=cam.x-.95+pg.position.x, vivo=true;
  DEP.tw=DEP.tw.filter(function(t){ return t.o!==pg.position; }); pg.visible=false; pg.position.y=0;
  var pila=new THREE.Group(); for(var i=0;i<3;i++) pila.add(depMesh(depPaquete(1.2,.24,1.5,.05), depMat('#9fb2c4'), 0,.1+i*.24,0)); pila.add(depCaja(1.15,.1,1.25,'#b48a55',0,.05,0)); mc.carga.add(pila);
  mc.carro.position.y=.45; mc.g.position.set(x0,0,-1.5); mc.g.rotation.y=Math.PI; S.g.add(mc.g);
  var bal=depMesh(new THREE.SphereGeometry(.12,10,8), new THREE.MeshBasicMaterial({ color:0xff8a00 }), 0,2.18,-.05,false); mc.g.add(bal);
  S.cada.push(function(t, dt){ if(!vivo) return; var p=mc.g.position, ax=p.x, az=p.z; depVidaMover(Q, dt); var d=Math.hypot(p.x-ax, p.z-az); if(d) mc.ruedas.forEach(function(r){ r.rotation.x+=d*3; });
    bal.visible=(Math.floor(t*3)%2)===0; });
  depVidaIr(Q, [{ x:x0, z:-2.6 }, { x:xc, z:-2.6 }, { x:xc, z:zc }], function(){
    depTween(mc.carro.position, { y:1.0 }, .7, 0, depRebote, function(){
      mc.carga.remove(pila); pg.visible=true; pg.position.y=.5; depTween(pg.position, { y:0 }, .35, 0, depCae, function(){ cam.t.g.position.y=-.05; depTween(cam.t.g.position, { y:0 }, .5, 0, depRebote); });
      depTween(mc.carro.position, { y:.2 }, .7, .2, null, function(){ depVidaIr(Q, [{ x:xc, z:-2.6 }, { x:S.ancho/2+9, z:-2.6 }], function(){ vivo=false; S.g.remove(mc.g); S.llevando=Math.max(0, (S.llevando||1)-1); }); }); }); });
  M.pitido(2);
};

/* ---------- 146 · «Producto terminado» con el stock de verdad ---------- */
/* Las pilas: a la izquierda HEAVEN (y lo de Moreno), a la derecha SUEÑA; con la fábrica ancha (3 columnas por lado) la de afuera es de
   somieres. Sale del stock del cuadrito (`saldoDatos`, la MISMA cuenta de siempre): lo que hay en PTF (`o.deposito`), lo que más rota
   primero; 2 unidades por colchón dibujado, hasta 9 de alto. Un lugar sin producto queda con el pallet vacío. Sin Excel cargado → null
   y las pilas quedan de adorno, como antes. */
M.stockDatos=function(nc){
  if(!M.on.stock) return null; nc=nc||M._nc||3; M._nc=nc;
  if(M._sdT && M._sdN===nc && Date.now()-M._sdT<1500) return M._sd;
  var L=M.stockDemo;
  if(!L){ try{ L=saldoDatos().d.lista.filter(function(o){ return o && o.deposito>0; }).map(function(o){ var tp=''; try{ tp=pryTipoProd({ codigo:o.cod||'', desc:o.desc })||''; }catch(e){}
      return { n:depCorto({ d:String(o.desc||o.k||'').replace(/^COLCHON\s+(?=\S)/,''), m:String(o.medida||'').toLowerCase() }), u:Math.round(o.deposito), rot:o.vendidosRotacion||0, s:tp==='somier', ok:tp==='colchon'||tp==='somier', su:stockMarcaDeNombre(o.desc)==='suena' }; })
      .filter(function(o){ return o.ok && o.u>0; }); }catch(e){ L=null; } }
  M._sdT=Date.now(); M._sdN=nc; if(!L || !L.length) return M._sd=null;
  var orden=function(a, b){ return (b.rot||0)-(a.rot||0) || b.u-a.u; }, de=function(su, som){ return L.filter(function(o){ return !!o.su===su && !!o.s===som; }).sort(orden); };
  var R=[], lado=function(su){ var col=de(su, false), som=de(su, true), i; if(nc<3){ col=col.concat(som).sort(orden); som=[]; }
    for(i=0;i<4;i++) R.push(col[i]||null); if(nc>=3) for(i=0;i<2;i++) R.push(som[i]||null); };
  lado(false); lado(true);
  return M._sd=R.map(function(o){ return o ? { n:o.n, u:o.u, h:Math.max(1, Math.min(9, Math.ceil(o.u/2))) } : { n:'', u:0, h:0 }; });
};
M.stockCarteles=function(S){
  var F=VIDA.fab, SR=M.stockDatos(); if(!F || !F.stockPos || !SR) return;
  F.stockPos.forEach(function(p, i){ if(!SR[i] || !SR[i].u) return; var o=new THREE.Object3D(); o.position.set(p.x, .35+p.h*.28, p.z); S.g.add(o);
    depEtq(o, SR[i].u+' · '+esc(SR[i].n), 'dep-etq-pila dep-etq-mini', SR[i].u<=3?'#b4182b':'#0b6f69', .25); });
};

/* ---------- 147 · la torre de luz del día ---------- */
M.torre=function(S){
  var g=new THREE.Group(), D=depVidaDatos(), est=D.atr>0?'r':D.falta>0?'a':'v', cols={ r:'#ef4444', a:'#f59e0b', v:'#22c55e' };
  g.position.set(-S.ancho/2-.6, 0, 3.6); S.g.add(g);
  g.add(depCil(.35,.12,'#374151',0,.06,0,16)); g.add(depCil(.07,3.0,'#4b5563',0,1.5,0,10));
  var luz=null; ['v','a','r'].forEach(function(k, i){ var on=k===est, m=depMesh(new THREE.CylinderGeometry(.2,.2,.32,16), on?new THREE.MeshBasicMaterial({ color:col(cols[k]) }):depMat(k==='r'?'#5b1d1d':k==='a'?'#5b4310':'#14532d'), 0,3.05+i*.36,0,false); g.add(m);
    if(on){ luz=new THREE.Mesh(new THREE.SphereGeometry(.42,16,12), new THREE.MeshBasicMaterial({ color:col(cols[k]), transparent:true, opacity:.3, depthWrite:false })); luz.position.copy(m.position); g.add(luz);
      var ch=new THREE.Mesh(new THREE.CircleGeometry(1.7,24), new THREE.MeshBasicMaterial({ color:col(cols[k]), transparent:true, opacity:.2, depthWrite:false })); ch.rotation.x=-Math.PI/2; ch.position.y=.022; g.add(ch); } });
  g.add(depCil(.22,.06,'#374151',0,4.16,0,16));
  depEtq(g, est==='r'?('🔴 '+D.atr+' atrasado'+(D.atr===1?'':'s')):est==='a'?('🟠 Faltan '+D.falta+' por cargar'):'🟢 Todo cargado', 'dep-etq-pila', cols[est]==='#22c55e'?'#15803d':est==='a'?'#b45309':'#b4182b', 4.5);
  S.cada.push(function(t){ if(luz){ var p=est==='r'?(.12+Math.abs(Math.sin(t*3.2))*.3):(.2+Math.sin(t*1.6)*.06); luz.material.opacity=p; luz.scale.setScalar(1+Math.sin(t*(est==='r'?3.2:1.6))*.06); } });
};

/* ---------- 149 · piso y materiales ---------- */
function ruedasTex(){
  var T=depVidaTex(512,512), x=T.x; x.clearRect(0,0,512,512); x.lineCap='round';
  for(var i=0;i<26;i++){ var a=(i*137)%512, b=(i*71)%512, r=60+(i*37)%180; x.strokeStyle='rgba(20,24,28,'+(.06+(i%5)*.028)+')'; x.lineWidth=7; x.beginPath(); x.arc(a, b, r, (i%7)*.9, (i%7)*.9+1.1+(i%3)*.5); x.stroke();
    x.beginPath(); x.arc(a+9, b+4, r+13, (i%7)*.9, (i%7)*.9+1.1+(i%3)*.5); x.stroke(); }
  T.t.needsUpdate=true; return T.t;
}
M.piso=function(S){
  var g=S.g, A=S.ancho, noche=S.mom==='noche';
  g.traverse(function(o){ if(o.isMesh && o.material && o.material.map && o.material.map.repeat && o.material.map.repeat.x===10 && o.material.roughness>.8){ o.material=o.material.clone(); o.material.roughness=.28; o.material.metalness=.22; } });
  var hu=new THREE.Mesh(new THREE.PlaneGeometry(A+8,16), new THREE.MeshBasicMaterial({ map:ruedasTex(), transparent:true, depthWrite:false })); hu.rotation.x=-Math.PI/2; hu.position.set(0,.015,-2.4); g.add(hu);
  /* lámparas colgantes que se mecen, con su charco de luz */
  var lamp=[]; [-A/3.2, 0, A/3.2].forEach(function(x, i){ var l=new THREE.Group(); l.position.set(x, 6.7, 1.2); g.add(l);
    l.add(depCil(.015,1.6,'#1f2937',0,-.8,0,6)); var pant=depMesh(new THREE.ConeGeometry(.5,.36,18,1,true), depMat('#0b6f69',{ side:THREE.DoubleSide }), 0,-1.7,0); l.add(pant);
    l.add(depMesh(new THREE.SphereGeometry(.12,10,8), new THREE.MeshBasicMaterial({ color:0xfff2c8 }), 0,-1.8,0,false));
    var haz=new THREE.Mesh(new THREE.ConeGeometry(2.6,4.9,20,1,true), aditivo('#ffe8b8', noche?.07:.03)); haz.position.set(0,-4.3,0); l.add(haz);
    var ch=new THREE.Mesh(new THREE.CircleGeometry(2.7,24), aditivo('#ffe2a8', noche?.2:.07)); ch.rotation.x=-Math.PI/2; ch.position.set(x,.023,1.2); g.add(ch); lamp.push({ l:l, ch:ch, x:x, i:i }); });
  /* los faros del montacargas de Ernesto y del segundo */
  [VIDA.q.ern, VIDA.q.mc2].forEach(function(Q){ if(!Q || !Q.mc) return; [-.36,.36].forEach(function(x){ Q.mc.g.add(depMesh(new THREE.BoxGeometry(.14,.1,.04), new THREE.MeshBasicMaterial({ color:0xfff6c8 }), x,.5,.74,false)); });
    var f=new THREE.Mesh(new THREE.ConeGeometry(1.25,4.4,16,1,true), aditivo('#fff3c4', noche?.12:.045)); f.rotation.x=-Math.PI/2; f.position.set(0,.42,2.95); Q.mc.g.add(f); });
  S.cada.push(function(t){ lamp.forEach(function(o){ var a=Math.sin(t*.9+o.i*1.7)*.045; o.l.rotation.z=a; o.ch.position.x=o.x+Math.sin(a)*5.2; }); });
};

/* ---------- 150 · la línea más viva ---------- */
M.linea=function(S){
  var F=VIDA.fab, g=S.g; if(!F) return;
  /* la sierra corta espuma: cuando la hoja baja, vuela la viruta */
  var N=160, geo=new THREE.BufferGeometry(), pos=new Float32Array(N*3), vel=[], vida=[]; for(var i=0;i<N;i++){ vel.push([0,0,0]); vida.push(0); pos[i*3+1]=-9; }
  geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
  var pts=new THREE.Points(geo, new THREE.PointsMaterial({ color:0xfff3b0, size:.17, transparent:true, opacity:.95, depthWrite:false })); pts.frustumCulled=false; g.add(pts);
  var sv=new THREE.Vector3(), k=0;
  /* el plástico del embolsado se infla cuando pasa un colchón */
  var bolsa=new THREE.Mesh(new THREE.SphereGeometry(.62,16,12), new THREE.MeshStandardMaterial({ color:col('#dff3ff'), transparent:true, opacity:.36, roughness:.1 })); bolsa.position.set(F.xemb, 1.32, F.Lz); g.add(bolsa);
  /* dos operarios llevan un colchón entre los dos */
  var a=depFabPersona('#2563eb'), b=depFabPersona('#2563eb', true), cm=depFabColchon(F, true), zl=8.3, x0=Math.min(F.xp-2.2, S.ancho/2-1.8), x1=-S.ancho/2-1.5, ida=true;
  var QA={ P:a, vel:1.25, modo:'quieto' }, QB={ P:b, vel:1.25, modo:'quieto' }; a.g.position.set(x0,0,zl); b.g.position.set(x0+1.9,0,zl); g.add(a.g); g.add(b.g); g.add(cm);
  VIDA.q.dosA={ P:a, n:'Operario:', col:'#1d4ed8', dy:2.1 }; VIDA.q.dosB={ P:b, n:'Operaria:', col:'#1d4ed8', dy:2.1 };
  function otra(){ ida=!ida; var xa=ida?x0:x1; depVidaIr(QA, [{ x:xa, z:zl }]); depVidaIr(QB, [{ x:xa+1.9, z:zl }]); }
  otra();
  S.cada.push(function(t, dt){
    F.sierra.hoja.getWorldPosition(sv); var baja=F.sierra.hoja.position.y<1.05;
    for(var n=0;n<N;n++){ if(vida[n]>0){ vida[n]-=dt; vel[n][1]-=2.4*dt; pos[n*3]+=vel[n][0]*dt; pos[n*3+1]+=vel[n][1]*dt; pos[n*3+2]+=vel[n][2]*dt; if(vida[n]<=0 || pos[n*3+1]<.02) { vida[n]=0; pos[n*3+1]=-9; } } }
    if(baja) for(var e=0;e<5;e++){ k=(k+1)%N; vida[k]=1.0+Math.random()*.8; pos[k*3]=sv.x; pos[k*3+1]=sv.y; pos[k*3+2]=sv.z+(Math.random()-.5)*1.6; vel[k]=[(Math.random()-.5)*1.8, .8+Math.random()*1.3, (Math.random()-.5)*1.8]; }
    geo.attributes.position.needsUpdate=true;
    var s=.55+(F.sopla||0)*.6+Math.sin(t*9)*.02*(F.sopla||0); bolsa.scale.set(1.25*s, s, 1.05*s); bolsa.material.opacity=.16+(F.sopla||0)*.3;
    depVidaMover(QA, dt); depVidaMover(QB, dt); if(!QA.path && !QB.path){ if(!S.dosT) S.dosT=t+3.5; if(t>S.dosT){ S.dosT=0; otra(); } }
    var anda=!!(QA.path||QB.path); [a,b].forEach(function(P, i){ depVidaAnimar(P, anda?'anda':'quieto', t+i*.4); P.bi.rotation.x=P.bd.rotation.x=-.42; P.mi.rotation.x=P.md.rotation.x=-1.05; P.bi.rotation.z=-.1; P.bd.rotation.z=.1; });
    var pa=a.g.position, pb=b.g.position; a.g.rotation.y=Math.atan2(pb.x-pa.x, pb.z-pa.z); b.g.rotation.y=a.g.rotation.y+Math.PI; QA.yawT=QB.yawT=null;
    cm.position.set((pa.x+pb.x)/2, .98+Math.abs(Math.sin((a.fase||0)))*.02, zl+.02); cm.rotation.y=0; cm.visible=true;
  });
};

/* ---------- 152 · caras que hablan ---------- */
M.caras=function(S){
  var grita={ senala:1, festeja:0 };
  function vestir(Q){ var P=Q.P; if(!P || !P.cabeza || P.boca) return;
    P.boca=depMesh(new THREE.BoxGeometry(.11,.028,.03), depMat('#6b2a2a'), 0,-.118,.252,false); P.cabeza.add(P.boca);
    if(Q!==VIDA.q.yer){ P.cejas=depMesh(depUnir('cejas', [[new THREE.BoxGeometry(.09,.022,.02), '#2b2018', -.09,0,0], [new THREE.BoxGeometry(.09,.022,.02), '#2b2018', .09,0,0]]), depMatColores(), 0,.108,.262,false); P.cabeza.add(P.cejas); } }
  S.cada.push(function(t, dt){
    var ks=Object.keys(VIDA.q), hab=[]; ks.forEach(function(k){ var Q=VIDA.q[k]; vestir(Q); if(Q.habla && Q.P && Q.P.g) hab.push(Q); });
    ks.forEach(function(k){ var Q=VIDA.q[k], P=Q.P; if(!P || !P.boca) return; var h=!!Q.habla;
      P.boca.scale.y=h?(1.3+Math.abs(Math.sin(t*13+(P.sem||0)))*3.6):1; P.boca.scale.x=h?.95:1.2;
      if(P.cejas) P.cejas.position.y=.108+(Q.modo==='senala'?-.022:h?.016:0);
      /* mira a quien le habla (sin dejar lo que hace): la cabeza gira hacia el que habla más cerca */
      var obj=0; if(!h && !(Q.path && Q.path.length)){ var m=null, md=6.5, p=P.g.position; hab.forEach(function(o){ var d=Math.hypot(o.P.g.position.x-p.x, o.P.g.position.z-p.z); if(o!==Q && d<md){ md=d; m=o; } });
        if(m){ var a=Math.atan2(m.P.g.position.x-p.x, m.P.g.position.z-p.z)-P.g.rotation.y-(P.tr?P.tr.rotation.y:0); a=Math.atan2(Math.sin(a), Math.cos(a)); obj=Math.max(-1.05, Math.min(1.05, a)); } }
      P.mY=(P.mY||0)+(obj-(P.mY||0))*Math.min(1, dt*5); if(Math.abs(P.mY)>.003) P.cabeza.rotation.y=Math.max(-1.2, Math.min(1.2, P.cabeza.rotation.y*(1-Math.min(1,Math.abs(P.mY)*1.4))+P.mY)); });
  });
};

/* ---------- 153 · más situaciones ---------- */
M.situ=function(S){
  var F=VIDA.fab, E=VIDA.q.edu, I=VIDA.q.isa, Dg=VIDA.q.perro, ern=VIDA.q.ern, enfria=6, gatoT=M.gatoEn!=null?M.gatoEn:38;
  /* Isabel lleva el café en bandeja */
  var band=depCaja(.46,.03,.32,'#9ca3af',0,-.6,.14);
  /* el gato: su lugar arriba de la espuma */
  var gato=F && F.gato, casa=gato?gato.g.position.clone():null, gst=0;
  M.demoGato=function(){ gatoT=0; };
  S.cada.push(function(t, dt){
    if(I && I.P.md){ if(I.P.taza && !band.parent) I.P.md.add(band); else if(!I.P.taza && band.parent) band.parent.remove(band); }
    /* Ernesto toca bocina si alguien se le cruza */
    enfria-=dt; if(ern && ern.path && ern.path.length && enfria<=0){ var p=ern.P.g.position; ['edu','isa','cal','lim','sereno','dosA'].some(function(k){ var Q=VIDA.q[k]; if(!Q || !Q.P || !Q.P.g) return false; var q=Q.P.g.position;
        if(Math.hypot(q.x-p.x, q.z-p.z)>2.6) return false; enfria=16; var v=ern.vel; ern.vel=.02; M.bocina();
        depDecir('ern', '¡Piii-piiip! ¡Cuidado, que voy cargado! 📯', 2.4); luego(function(){ depDecir(k, depVidaUno(['¡Uy, perdón, Ernesto!','¡Pasá, pasá!','¡Casi me llevás puesto! 😅']), 2.2); }, 700); luego(function(){ ern.vel=v; }, 1700); return true; }); }
    /* el gato baja de la espuma, el perro le ladra y el gato vuelve a subir */
    if(!gato || !Dg || quieto()) return; gatoT-=dt;
    if(gst===0 && gatoT<=0){ gst=1; var gx=casa.x+2.6, gz=casa.z-2.8;
      depTween(gato.g.position, { x:casa.x+1.3, y:.02, z:casa.z-1.4 }, .7, 0, depCae, function(){ depTween(gato.g.position, { x:gx, z:gz }, 2.6, .3, null, function(){ gst=2; S.gatoQ=t; }); });
      gato.g.rotation.y=2.4; Dg.sigue=gato.g.position; Dg.vel=3.4; }
    if(gst===1 || gst===2){ gato.g.position.y=.02+Math.abs(Math.sin(t*9))*.05*(gst===1?1:0); var dp=Dg.P.g.position;
      if(Math.hypot(dp.x-gato.g.position.x-.85, dp.z-gato.g.position.z-.6)<1.5 && !S.ladro){ S.ladro=1; depDecir('perro', '¡Guau! ¡Guau! 🐶', 2.2); M.ladrido();
        luego(function(){ gst=3; Dg.sigue=null; gato.g.rotation.y=-.7;
          depTween(gato.g.position, { x:casa.x+1.2, z:casa.z-1.3 }, .9, 0, null, function(){ depTween(gato.g.position, { x:casa.x, y:casa.y, z:casa.z }, .55, 0, depSale, function(){ gato.g.rotation.y=.6; gst=0; S.ladro=0; gatoT=45+Math.random()*30; }); }); }, 1500); } }
  });
};

/* ---------- 155 · la pantalla de la pared ---------- */
M.tele=function(S){
  var T=depVidaTex(640,400), x=T.x, g=new THREE.Group(), noche=S.mom==='noche';
  g.position.set(S.ancho/2+2.2, 0, 9.3); g.rotation.y=-.8; S.g.add(g);
  g.add(depCil(.5,.08,'#1f2937',0,.04,0,18)); g.add(depCil(.07,1.5,'#374151',0,.8,0,10)); g.add(depCaja(2.5,1.62,.1,'#111827',0,2.2,0));
  var pan=new THREE.Mesh(new THREE.PlaneGeometry(2.36,1.48), new THREE.MeshBasicMaterial({ map:T.t, fog:false })); pan.position.set(0,2.2,.056); g.add(pan);
  var br=new THREE.Mesh(new THREE.PlaneGeometry(3.4,2.4), aditivo('#7fe3dc', noche?.1:.03)); br.position.set(0,2.2,.3); g.add(br);
  function pintar(){
    var d='', am=0, pm=0, top=[], DIAS=['dom','lun','mar','mié','jue','vie','sáb'];
    try{ d=hdrProximoAbierto().d; am=Math.max(0, limTurno(d,'AM')-cuposUsadosTurno(d,'AM')); pm=Math.max(0, limTurno(d,'PM')-cuposUsadosTurno(d,'PM')); }catch(e){}
    try{ var mes=todayStr().slice(0,7), por={}; (DEP.mine||[]).forEach(function(p){ if(esATC(p.oc) || esRPT(p.oc) || ventaMes(p)!==mes) return; var c=String(p.cliente||'').trim().toUpperCase(); if(!c) return; por[c]=(por[c]||0)+(ventaTotal(p)||0); });
      top=Object.keys(por).map(function(c){ return [c, por[c]]; }).sort(function(a,b){ return b[1]-a[1]; }).slice(0,3); }catch(e){}
    x.fillStyle='#0b1220'; x.fillRect(0,0,640,400); x.fillStyle='#00a39b'; x.fillRect(0,0,640,64);
    x.fillStyle='#fff'; x.font='900 34px system-ui,Arial,sans-serif'; x.textAlign='left'; x.fillText('PRÓXIMO CAMIÓN', 24, 44);
    var hb=horaBolivia(); x.textAlign='right'; x.font='800 30px system-ui,Arial,sans-serif'; x.fillText(('0'+hb.getHours()).slice(-2)+':'+('0'+hb.getMinutes()).slice(-2), 616, 44);
    x.textAlign='left'; x.fillStyle='#e2f7f5'; x.font='900 44px system-ui,Arial,sans-serif'; var dd=d?new Date(d+'T12:00:00'):null; x.fillText(dd?(DIAS[dd.getDay()]+' '+d.slice(8)+'/'+d.slice(5,7)):'—', 24, 122);
    x.font='800 28px system-ui,Arial,sans-serif'; x.fillStyle=am?'#86efac':'#fca5a5'; x.fillText('Mañana: '+(am?(am+' lugares'):'lleno'), 250, 104); x.fillStyle=pm?'#86efac':'#fca5a5'; x.fillText('Tarde: '+(pm?(pm+' lugares'):'lleno'), 250, 138);
    x.fillStyle='#1e293b'; x.fillRect(24,164,592,3); x.fillStyle='#fde68a'; x.font='900 28px system-ui,Arial,sans-serif'; x.fillText('MIS CLIENTES DEL MES', 24, 206);
    top.forEach(function(c, i){ var y=250+i*48; x.fillStyle=['#fbbf24','#cbd5e1','#d6a372'][i]; x.font='900 30px system-ui,Arial,sans-serif'; x.textAlign='left'; x.fillText((i+1)+'°', 24, y);
      x.fillStyle='#f1f5f9'; x.font='700 28px system-ui,Arial,sans-serif'; x.fillText(c[0].slice(0,22), 74, y); x.textAlign='right'; x.fillStyle='#5eead4'; x.font='900 28px system-ui,Arial,sans-serif'; x.fillText('Bs '+Math.round(c[1]).toLocaleString('es-BO'), 616, y); });
    if(!top.length){ x.fillStyle='#94a3b8'; x.font='700 26px system-ui,Arial,sans-serif'; x.textAlign='left'; x.fillText('Todavía sin ventas este mes', 24, 252); }
    S.tele={ d:d, am:am, pm:pm, top:top }; T.t.needsUpdate=true;
  }
  pintar(); var tic=0; S.cada.push(function(t, dt){ tic+=dt; if(tic>30){ tic=0; pintar(); } });
};

/* ---------- 154 · modo paseo y seguir a Eduardo · 156 · el sonido ---------- */
M.botones=function(S){
  var W=DEP.w3, v=document.getElementById('fab-mas-bot'); if(v) v.remove();
  var b=document.createElement('div'); b.id='fab-mas-bot'; b.style.cssText='position:absolute;right:10px;top:10px;z-index:2;display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end';
  var ch=!!S.chico, corto=function(t){ return ch?t.split(' ')[0]:t; };   // en el celular, solo el ícono: tres botones con letras tapaban media fábrica
  function bot(txt, fn, id){ var e=document.createElement('button'); e.type='button'; e.textContent=corto(txt); e.title=txt.replace(/^\S+\s/,''); e.setAttribute('aria-label', e.title); if(id) e.id=id; e.style.cssText='font:inherit;font-size:.78rem;font-weight:800;background:#fff;border:1px solid #cfd8dc;border-radius:9px;padding:6px 10px;cursor:pointer;min-height:34px';
    e.addEventListener('click', function(ev){ ev.stopPropagation(); fn(e); }); b.appendChild(e); return e; }
  if(M.on.paseo && !quieto()){ bot('▶ Recorrer', function(){ M.paseo(S); }, 'fab-paseo'); bot('🧔 Seguir a Eduardo', function(e){ S.sigue=!S.sigue; S.paseando=false; e.style.background=S.sigue?'#00B5AD':'#fff'; e.style.color=S.sigue?'#fff':''; if(!S.sigue) depVerTodo(false); }, 'fab-seguir'); }
  if(M.on.sonido) bot(M.audio?'🔊 Sonido':'🔈 Sonido', function(e){ if(!M.audio && mudo()){ try{ toast('Está puesto el silencio de Bloki (🔇): sacalo y la fábrica suena.', 'warn', 4500); }catch(x){} return; }
    M.sonar(!M.audio); e.textContent=corto(M.audio?'🔊 Sonido':'🔈 Sonido'); }, 'fab-sonido');
  W.box.appendChild(b);
  /* «↺ Ver todo» suelta a Eduardo y corta el recorrido */
  var vt=W.box.querySelector('.dep-todo'); if(vt && !vt._fm){ vt._fm=1; vt.addEventListener('click', function(){ var s=M.S, e=document.getElementById('fab-seguir'); if(s){ s.sigue=false; s.paseando=false; } if(e){ e.style.background='#fff'; e.style.color=''; } }); }
  if(!M._pd){ M._pd=1; W.r.domElement.addEventListener('pointerdown', function(){ if(M.S){ M.S.paseando=false; } }); }
  S.cada.push(function(t, dt){ if(!S.sigue) return; var p=VIDA.q.edu.P.g.position, k=Math.min(1, dt*2.2), c=W.cam.position, tg=W.ctl.target;
    DEP.tw=DEP.tw.filter(function(x){ return x.o!==c && x.o!==tg; }); tg.x+=(p.x-tg.x)*k; tg.y+=(1.1-tg.y)*k; tg.z+=(p.z-tg.z)*k; c.x+=(p.x+3.4-c.x)*k; c.y+=(3.3-c.y)*k; c.z+=(p.z+4.4-c.z)*k; });
};
M.paseo=function(S){
  var W=DEP.w3, A=S.ancho, F=VIDA.fab, h=VIDA.home, i=0; S.sigue=false; S.paseando=true;
  var P=[ [[-A*.55,9,13],[0,1,-4],2.2], [[-A/2-2,3.2,-2.5],[-A/4,1.4,S.fz+1],3.2], [[A/2+2,3.4,-1.5],[A/4,1.4,S.fz+1],4.2], [[A/3,2.6,6.4],[0,1,1.2],3.4],
          [[h.x+3.2,2.3,h.z+4.2],[h.x,1.1,h.z],3.2], [[F?F.xc-4:-4,3.0,9.2],[F?F.xc:0,1.1,12.2],3.2], [[F?F.xp+1:6,3.2,9.4],[F?F.xemb:3,1.1,12.2],4.2] ];
  (function sig(){ if(!M.S || M.S!==S || !S.paseando){ return; } var p=P[i++]; if(!p){ S.paseando=false; depVerTodo(false); return; }
    depTween(W.ctl.target, { x:p[1][0], y:p[1][1], z:p[1][2] }, p[2], 0); depTween(W.cam.position, { x:p[0][0], y:p[0][1], z:p[0][2] }, p[2], 0, depSuave, function(){ luego(sig, 500); }); })();
};
/* el sonido de fábrica: sintetizado, apagado de entrada y callado por el 🔇 de Bloki */
M.sonar=function(prender){
  if(!prender){ if(M.audio){ clearInterval(M.audio.iv); try{ M.audio.c.close(); }catch(e){} M.audio=null; } return; }
  if(mudo() || M.audio) return; var AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
  var c=new AC(), n=c.sampleRate*2, buf=c.createBuffer(1,n,c.sampleRate), d=buf.getChannelData(0), u=0; for(var i=0;i<n;i++){ var w=Math.random()*2-1; u=(u+.02*w)/1.02; d[i]=u*3.2; }
  var src=c.createBufferSource(); src.buffer=buf; src.loop=true; var lp=c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=210; var g=c.createGain(); g.gain.value=.16; src.connect(lp); lp.connect(g); g.connect(c.destination); src.start();
  var os=c.createOscillator(); os.type='square'; os.frequency.value=24; var bp=c.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=900; var g2=c.createGain(); g2.gain.value=.012; os.connect(bp); bp.connect(g2); g2.connect(c.destination); os.start();   // la máquina de coser
  /* suena solo mientras la fábrica se ve: otra pestaña del panel, la ventana escondida, la ciudad o el 🔇 de Bloki la callan */
  var iv=setInterval(function(){ var A=M.audio; if(!A) return; var W=DEP.w3, ve=!!(M.S && W && W.box && W.box.offsetParent && !W.alt && !document.hidden && !mudo());
    try{ if(ve && A.c.state==='suspended') A.c.resume(); else if(!ve && A.c.state==='running') A.c.suspend(); }catch(e){} }, 700);
  M.audio={ c:c, iv:iv };
};
function tono(f, dur, vol, tipo, cuando){ var A=M.audio; if(!A || mudo()) return; var c=A.c, o=c.createOscillator(), g=c.createGain(), t0=c.currentTime+(cuando||0); o.type=tipo||'sine'; o.frequency.value=f; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0+.01); g.gain.linearRampToValueAtTime(0, t0+dur); o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0+dur+.02); }
M.pitido=function(n){ for(var i=0;i<(n||2);i++) tono(1180, .16, .05, 'square', i*.5); };
M.bocina=function(){ tono(420, .28, .09, 'sawtooth', 0); tono(420, .5, .09, 'sawtooth', .36); };
M.ladrido=function(){ tono(520, .1, .08, 'sawtooth', 0); tono(430, .14, .08, 'sawtooth', .22); };

/* ---------- 157 · el festejo ---------- */
M.festejoMirar=function(S){
  var D=depVidaDatos(), prev=M.antes.falta; M.antes.falta=D.falta;
  if(prev!=null && prev>0 && D.falta===0 && D.car>0) luego(function(){ M.festejo(S); }, 900);
};
M.festejo=function(S){
  S=S||M.S; if(!S || quieto()) return; var g=S.g, N=520, geo=new THREE.BufferGeometry(), pos=new Float32Array(N*3), colr=new Float32Array(N*3), vel=[], pal=['#00B5AD','#F7E7A0','#DA8B62','#E7B5D5','#ff7a00','#2B3566','#ffffff'];
  for(var i=0;i<N;i++){ pos[i*3]=(Math.random()-.5)*(S.ancho+6); pos[i*3+1]=6+Math.random()*5; pos[i*3+2]=-6+Math.random()*16; var c=col(pal[i%pal.length]); colr[i*3]=c.r; colr[i*3+1]=c.g; colr[i*3+2]=c.b; vel.push([ (Math.random()-.5)*.8, 1.1+Math.random()*1.4, Math.random()*6 ]); }
  geo.setAttribute('position', new THREE.BufferAttribute(pos,3)); geo.setAttribute('color', new THREE.BufferAttribute(colr,3));
  var pts=new THREE.Points(geo, new THREE.PointsMaterial({ size:.3, vertexColors:true, transparent:true, opacity:1, depthWrite:false })); pts.frustumCulled=false; g.add(pts);
  var E=VIDA.q.edu, I=VIDA.q.isa, t0=null, modoE=E.modo, modoI=I.modo, vivo=true;
  if(!E.path) E.modo='festeja'; if(!I.path && !I.P.taza) I.modo='festeja';
  depDecir('edu', '¡TODO CARGADO! 🎉 ¡Así se trabaja, carajo!', 4.5); luego(function(){ depDecir('isa', '¡Bravo, equipo! 👏', 3); }, 900); luego(function(){ depDecir('perro', '¡Guau! 🐶', 2); M.ladrido(); }, 1500);
  [0,.18,.36,.6].forEach(function(d, i){ tono([523,659,784,1047][i], .22, .07, 'triangle', d); });
  S.cada.push(function(t, dt){ if(!vivo) return; if(t0==null) t0=t; var e=t-t0;
    for(var n=0;n<N;n++){ pos[n*3]+=(vel[n][0]+Math.sin(t*2+vel[n][2])*.5)*dt; pos[n*3+1]-=vel[n][1]*dt; if(pos[n*3+1]<.04) pos[n*3+1]=.04; }
    geo.attributes.position.needsUpdate=true; if(e>7) pts.material.opacity=Math.max(0, 1-(e-7)/1.5);
    if(e>5.2 && E.modo==='festeja'){ E.modo='quieto'; if(I.modo==='festeja') I.modo=modoI==='festeja'?'cel':modoI; }
    if(e>8.5){ vivo=false; g.remove(pts); geo.dispose(); } });
};
})();
