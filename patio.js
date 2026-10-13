/* 🏙️ PATIO DE CARGA 3D — la ciudad con los camiones, la carga y la gente (§4kn, 13/10/2026).
   El dueño, después de 13 versiones de la muestra (https://claude.ai/artifact/DvJvxjSQAQchD5g5h4LVxL): «Me gusta, publica y vemos
   cómo queda». Acá la muestra se alimenta de lo de siempre, nada inventado:
     · los camiones, sus líneas y sus tildes = cargaVivaDatos() (la Lista de carga; la misma tilde, `setCargaChk`);
     · «salió» = camionSalio() / camionSalioMarcar() (el botón «🚚 Ya salió» de Administración);
     · las paradas = los pedidos de cada camión, con el pin de almPunto(); una RPT va a SU tienda;
     · lo que Ernesto revisa y lo que David le reta = los pedidos del día (Eduardo, ROHO, Multicenter, sin camión, ✗ sin stock,
       días pasados sin ✅).
   Lo único que escribe es lo que el panel ya escribía: una tilde de carga y «Ya salió». Con el GPS (servidor 2026-10-13-a, §4ko) el
   camión que salió va por las calles hasta donde dice el GPS (`cams[].gps`); sin GPS hace su recorrido ESTIMADO (en orden, sin
   marcar nada). El ✅ entregado lo sigue marcando logística.
   Se baja recién al tocar «🏙️ Ver la ciudad» (pedidos.html → patioAbrirCiudad) y dibuja con el MISMO lienzo de three.js que la
   fábrica de Eduardo y los camiones de Administración (`depIniciar3D` + `DEP.w3.alt`): nunca un segundo WebGLRenderer. */
(function(){
'use strict';
if(window.patioAbrir) return;
var PT={ armado:false, abierto:false, firma:'', D:null, api:null, timer:null };
function escH(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }


/* ═════════ el mapa: cuadras de 70 m con calles de 10 m; los tres almacenes donde los pone el GPS (achicado) ═════════
   Con el NORTE ARRIBA de la pantalla (dueño, 13/10: «nuestra vista va de abajo hacia arriba»): la cámara mira en diagonal, así que el norte
   de la escena es (-x,-z). Pines del dueño (13/10): PTF -17.7489091,-63.1429133 · Banzer -17.7202386,-63.1631265 (~3,2 km al norte, ~2,1 al
   oeste: arriba a la izquierda) · Moreno -17.7623355,-63.0675466 (~8 km al este: a la derecha). */
var G=70, RW=10, X0=-5*G, X1=6*G, Z0=-3*G, Z1=10*G;   // (13/10, dueño) más ciudad abajo: así se ven los anillos alrededor de la plaza 24 de Septiembre
var ALM={ ptf:{ n:'PTF', bx:35, bz:35, w:40, d:22, h:9, puertas:5, col:0x1e5fd0, marca:true, sub:'Productos terminados', cartel:'MULTIESPUMAS · PTF' },
          bz:{ n:'Banzer', bx:-105, bz:-35, w:30, d:18, h:8, puertas:4, col:0x2b7be4, marca:true, sub:'Almacén de salida', cartel:'ALMACÉN BANZER' },
          im:{ n:'Moreno', bx:315, bz:-105, w:26, d:22, h:9, puertas:3, col:0x7b3fb0, sub:'Fábrica', cartel:'INDUSTRIAS MORENO' } };
Object.keys(ALM).forEach(function(k){ var A=ALM[k]; A.x=A.bx; A.fz=A.bz+10; A.z=A.fz-A.d/2; A.fila=A.bz+G/2; A.dock=A.fz+5.8; });
/* las tiendas: los pines del dueño (13/10) con el norte arriba, a ~36 de escena por km; como en la escena una cuadra son ~2 km, las tiendas
   (a 300-800 m una de otra) se separan a mano como pidió el dueño: Central a una cuadra de Mia Plaza, Buenos Aires dos cuadras a la izquierda
   de Charcas, Carmelo abajo a la derecha. Todas con el frente hacia abajo (hacia la cámara) menos Central. */
var PTF_GEO={ lat:-17.7489091, lng:-63.1429133 }, KM=36;
/* (13/10, dueño, con el GPS de verdad al lado: «los 4 camiones… no coinciden al menos un poco») la ciudad está armada A MANO: PTF, Banzer,
   Moreno, la plaza 24 de Septiembre y las tiendas están donde los ubicó el dueño, no a escala. Un punto real (un pin, el GPS) se ubica
   ANCLADO en esos lugares: la cuenta derecha (afín, por cuadrados mínimos, los depósitos y la plaza pesan más) que mejor los acierta, más un
   ajuste local que lleva lo que cae a pocas cuadras de un ancla a donde está esa ancla en la ciudad. Lejos de todo, la cuenta derecha sola. */
var GEO_AF=null, GEO_ANCLAS=null, GEO_RADIO_KM=.45;
function geoKm(lat,lng){ return [(lng-PTF_GEO.lng)*106.0, (lat-PTF_GEO.lat)*110.6]; }
function geoArmar(){
  var A=[[-17.7489091,-63.1429133,35,35,6], [-17.7202386,-63.1631265,-105,-35,6], [-17.7623355,-63.0675466,315,-105,6], [-17.78368,-63.18215,-35,315,5]];   // PTF, Banzer, Moreno, la plaza
  var T=(typeof TIENDAS!=='undefined' && TIENDAS) || null;
  if(T) T.forEach(function(t){ if(t.fijo && isFinite(t.lat)) A.push([t.lat, t.lng, t.fijo.x, t.fijo.fila, 1]); });
  var M=[[0,0,0],[0,0,0],[0,0,0]], bx=[0,0,0], bz=[0,0,0];
  A.forEach(function(a){ var k=geoKm(a[0],a[1]), v=[k[0],k[1],1], w=a[4]; for(var i=0;i<3;i++){ for(var j=0;j<3;j++) M[i][j]+=w*v[i]*v[j]; bx[i]+=w*v[i]*a[2]; bz[i]+=w*v[i]*a[3]; } });
  var resolver=function(b){ var m=M.map(function(r,i){ return r.concat([b[i]]); });
    for(var i=0;i<3;i++){ var p=i; for(var k=i+1;k<3;k++) if(Math.abs(m[k][i])>Math.abs(m[p][i])) p=k; var t=m[i]; m[i]=m[p]; m[p]=t;
      for(var k2=i+1;k2<3;k2++){ var f=m[k2][i]/m[i][i]; for(var j=i;j<4;j++) m[k2][j]-=f*m[i][j]; } }
    var x=[0,0,0]; for(var i2=2;i2>=0;i2--){ var s=m[i2][3]; for(var j2=i2+1;j2<3;j2++) s-=m[i2][j2]*x[j2]; x[i2]=s/m[i2][i2]; } return x; };
  var af={ cx:resolver(bx), cz:resolver(bz) };
  var anc=A.map(function(a){ var k=geoKm(a[0],a[1]); return { k:k, rx:a[2]-(af.cx[0]*k[0]+af.cx[1]*k[1]+af.cx[2]), rz:a[3]-(af.cz[0]*k[0]+af.cz[1]*k[1]+af.cz[2]) }; });
  if(T){ GEO_AF=af; GEO_ANCLAS=anc; }   // sin las tiendas todavía (no pasa: están todas fijas) no se guarda
  return { af:af, anc:anc };
}
function geoAEscena(lat,lng){
  var G0=GEO_AF ? { af:GEO_AF, anc:GEO_ANCLAS } : geoArmar(), k=geoKm(lat,lng), af=G0.af;
  var x=af.cx[0]*k[0]+af.cx[1]*k[1]+af.cx[2], z=af.cz[0]*k[0]+af.cz[1]*k[1]+af.cz[2], sw=0, cx=0, cz=0;
  G0.anc.forEach(function(a){ var dx=k[0]-a.k[0], dy=k[1]-a.k[1], w=Math.exp(-(dx*dx+dy*dy)/(GEO_RADIO_KM*GEO_RADIO_KM)); sw+=w; cx+=w*a.rx; cz+=w*a.rz; });
  return { x:x+cx/(sw+.05), z:z+cz/(sw+.05) };
}
var TIENDAS=[ { n:'Mia Plaza', marca:'heaven', fijo:{ x:-24, fila:210, lado:-1 }, lat:-17.7702734, lng:-63.1697256 }, { n:'Buenos Aires', marca:'heaven', fijo:{ x:-119, fila:280, lado:-1 }, lat:-17.7807965, lng:-63.1836189 },
  { n:'Central', marca:'heaven', fijo:{ x:116, fila:210, lado:1 }, lat:-17.7727299, lng:-63.1672416 }, { n:'Mutualista', marca:'suena', fijo:{ x:-24, fila:140, lado:-1 }, lat:-17.765811, lng:-63.162066 },
  { n:'Charcas', marca:'suena', fijo:{ x:21, fila:280, lado:-1 }, lat:-17.7801473, lng:-63.1762546 }, { n:'Carmelo', marca:'suena', fijo:{ x:186, fila:280, lado:-1 }, lat:-17.7919108, lng:-63.1538966 } ];
TIENDAS.forEach(function(t,i){ if(t.fijo){ t.fila=t.fijo.fila; t.lado=t.fijo.lado; t.x=t.fijo.x; t.z=t.fila+t.lado*(RW/2+6); t.pt={ x:t.x, z:t.fila }; return; } var p=geoAEscena(t.lat,t.lng), fila=Math.round(p.z/G)*G, lado=p.z>fila?1:-1, col=Math.round(p.x/G)*G, x=p.x;
  if(Math.abs(x-col)<16) x=col+(x>=col?16:-16);
  TIENDAS.slice(0,i).concat(TIENDAS.filter(function(o){ return o.fijo; })).forEach(function(o){ if(o===t) return; if(o.fila===fila && o.lado===lado && Math.abs(o.x-x)<17) x=o.x+18*(x>=o.x?1:-1); });
  t.fila=fila; t.lado=lado; t.x=x; t.z=fila+lado*(RW/2+6); t.pt={ x:x, z:fila }; });
function tienda(n){ return TIENDAS.filter(function(t){ return t.n===n; })[0]; }
function enTienda(x,z,w,d){ return TIENDAS.some(function(t){ return Math.abs(x-t.x)<(w/2+10) && Math.abs(z-t.z)<(d/2+8); }); }
function puertaX(A,i){ return A.x-A.w/2+A.w/(A.puertas+1)*(i+1); }

/* ═════════ los datos del día: lo mismo que los camiones de Administración ═════════
   `patioDatos()` no toca three.js: es lo que la prueba (tests/test_patio.js) mira sin 3D. Respeta Hoy/Mañana (`CV_DIA`). */
var COL_CAM=[0x2f6fd6,0x00a59e,0x1f3b73,0x7b3fb0,0xc2410c,0x0f766e,0x9d174d];
function normT(s){ return typeof normNombre==='function' ? normNombre(s) : String(s||'').toUpperCase(); }
/* la tienda de una RPT: el destino va en `cliente` (la sucursal, §4dk) */
function tiendaDe(p){ var c=normT(p && p.cliente); if(!c) return null;
  for(var i=0;i<TIENDAS.length;i++){ if(c.indexOf(normT(TIENDAS[i].n))>=0) return TIENDAS[i]; } return null; }
/* el punto de la escena de un pedido: su pin (almPunto), girado con el norte arriba y llevado a la calle más cercana */
function ptDePedido(p){
  var t=(typeof esRPT==='function' && esRPT(p.oc)) ? tiendaDe(p) : null;
  if(t) return { x:t.pt.x, z:t.pt.z, tienda:t };
  var g=null; try{ g=typeof almPunto==='function' ? almPunto(p) : null; }catch(e){}
  if(!g) return null;
  var q=geoAEscena(Number(g.lat), Number(g.lng));
  return { x:Math.max(X0+8, Math.min(X1-8, q.x)), z:Math.round(Math.max(Z0, Math.min(Z1, q.z))/G)*G };
}
/* 🛰️ (§4ko) dónde dice el GPS que está el camión, en la escena (la misma cuenta que el pin de un pedido): solo hoy */
function gpsEscenaDe(veh){ var x=(typeof camionGps==='function') ? camionGps(veh) : null; if(!x) return null;
  var q=geoAEscena(Number(x.la), Number(x.lo));
  return { x:Math.max(X0+8, Math.min(X1-8, q.x)), z:Math.round(Math.max(Z0, Math.min(Z1, q.z))/G)*G, v:x.v, m:x.m, f:x.f, vu:x.vu||'', depId:(x.dep && x.dep.id) || '',
           enMor:(typeof gpsEnMoreno==='function' && gpsEnMoreno(x)),   // (13/10) en Moreno: se estaciona ahí, no en la calle de atrás
           hace:(typeof gpsHace==='function' ? gpsHace(x) : ''), donde:(typeof gpsDondeTxt==='function' ? gpsDondeTxt(x) : '') }; }
/* 🛰️ (13/10, dueño: «falta la pestaña recorrido gps y "lo que dijo el gps"») el recorrido del día de este aparato (gpsHistDe,
   pedidos.html) y sus paradas, en la escena. Sin pegar a las calles: es el rastro de verdad. Hasta 400 puntos. */
function gpsAEscena(la, lo){ var q=geoAEscena(Number(la), Number(lo)); return { x:Math.max(X0, Math.min(X1, q.x)), z:Math.max(Z0, Math.min(Z1, q.z)) }; }
function gpsRutaDe(veh){ if(typeof gpsHistDe!=='function') return [];
  var L=gpsHistDe(veh), paso=Math.max(1, Math.ceil(L.length/400)), out=[];
  for(var i=0;i<L.length;i+=paso){ var q=gpsAEscena(L[i][1], L[i][2]); out.push({ x:q.x, z:q.z, t:L[i][0], v:L[i][3] }); }
  if(L.length && (L.length-1)%paso){ var u=L[L.length-1], q2=gpsAEscena(u[1], u[2]); out.push({ x:q2.x, z:q2.z, t:u[0], v:u[3] }); }
  return out; }
function gpsParadasDe(veh){ if(typeof gpsParadas!=='function') return [];
  return gpsParadas(veh).map(function(s){ var q=gpsAEscena(s.lat, s.lng);
    var ps=(s.peds && s.peds.length) ? s.peds : (s.ped ? [s.ped] : []);   // (§4kp) el servidor puede nombrar varios en el mismo lugar
    return { x:q.x, z:q.z, h0:gpsHoraTxt(s.t0), dur:gpsDurTxt(s.t1-s.t0), abierta:!!s.abierta, cli:ps.map(function(p){ return p.cliente||'—'; }).join(' y '),
             oc:ps.map(function(p){ return p.oc||''; }).filter(Boolean).join(' y '), m:s.pm,
             base:(s.base && s.base.m<2000) ? ('a '+(typeof gpsKmTxt==='function' ? gpsKmTxt(s.base.m) : (s.base.m+' m'))+' de '+s.base.n) : '' }; }); }
function diaDe(f, n){ var d=new Date(f+'T12:00:00'); d.setDate(d.getDate()+n); return (typeof isoLocal==='function') ? isoLocal(d) : d.toISOString().slice(0,10); }
function delDia(p){ return !esVentaTienda(p) && !esFilaSistema(p) && !esBorrador(p); }
function patioDatos(){
  var D=null; try{ D=cargaVivaDatos(); }catch(e){ console.error(e); }
  if(!D) return null;
  var fecha=D.fecha, hoy=todayStr(), cams=[], sin={ stops:[], lineas:[] }, i=0;
  var linea=function(l){
      var fab=l.lugar==='fabrica';
      var st=l.on ? 'camion' : (fab && l.no>=l.u) ? 'falta' : (fab && l.rec>0) ? 'moreno' : 'espera';
      return { key:l.key, prod:l.kk, u:l.u, lugar:l.lugar, st:st, alm:l.alm||'', no:l.no||0, rec:l.rec||0 }; };
  D.cams.forEach(function(c){
    /* (13/10, dueño: «por cargar sale vacío») lo de los pedidos sin camión también se carga: va con sus líneas */
    if(c.sin){ sin.stops=(c.stops||[]).slice(); sin.lineas=(c.lineas||[]).map(linea); return; }
    var lin=c.lineas.map(function(l){
      var fab=l.lugar==='fabrica';
      var st=l.on ? 'camion' : (fab && l.no>=l.u) ? 'falta' : (fab && l.rec>0) ? 'moreno' : 'espera';
      return { key:l.key, prod:l.kk, u:l.u, lugar:l.lugar, st:st, alm:l.alm||'', no:l.no||0, rec:l.rec||0 };
    });
    var soloBz=lin.length>0 && lin.every(function(l){ return l.lugar!=='fabrica'; });
    var stops=(c.stops||[]).map(function(p){
      var q=ptDePedido(p), rpt=!!(typeof esRPT==='function' && esRPT(p.oc)), tnd=q && q.tienda;
      return { id:p.id, oc:p.oc||'', rpt:rpt, turno:String(p.turno||'').toUpperCase(), ok:!!p.entregado, pt:q?{ x:q.x, z:q.z }:null,
        n: rpt ? (String(p.oc||'RPT').trim()+' · '+(tnd ? (tnd.marca==='heaven'?'Heaven ':'Sueña ')+tnd.n : (p.cliente||''))) : (p.cliente||'—'),
        z: rpt ? 'Reposición de tienda' : (p.zona||'') };
    });
    cams.push({ k:c.k, p:(typeof VEHICULO_PLACA!=='undefined' && VEHICULO_PLACA[c.k]) || c.k, col:COL_CAM[i++%COL_CAM.length],
      alm:soloBz?'bz':'ptf', lineas:lin, chofer:(c.choferes||[]).join(' / '), conPedidos:(c.stops||[]).length>0,
      stops:stops, salio:camionSalio(fecha, c.k), salioMano:!!(typeof salioClave==='function' && salioClave(fecha, c.k)),
      gps:(fecha===hoy ? gpsEscenaDe(c.k) : null), gpsRuta:(fecha===hoy ? gpsRutaDe(c.k) : []), gpsParadas:(fecha===hoy ? gpsParadasDe(c.k) : []) });
  });
  var list=STATE.filter(function(p){ return delDia(p) && p.fecha===fecha; });
  var camDe=function(L){ var v=L.map(function(p){ return vehiculoDe(p)||''; }).filter(Boolean); return v.length ? ((typeof VEHICULO_PLACA!=='undefined' && VEHICULO_PLACA[v[0]])||v[0]) : ''; };
  var edu=list.filter(stockEsEduardo), roho=list.filter(function(p){ return /\bROHO\b/i.test(String(p.vendedor||'')); }), multi=list.filter(stockEsMulticenter);
  var desde=diaDe(hoy,-3), sinMarcar=STATE.filter(function(p){ return delDia(p) && p.fecha && p.fecha<hoy && p.fecha>=desde && !p.entregado; }).length;
  var faltan=list.filter(function(p){ return !p.entregado && (p.productos||[]).some(function(x){ return x.chk==='no'; }); });
  /* lo que va tarde HOY: a las 12:00 sigue sin salir un camión con entregas de la mañana (o sin turno); a las 16:00, uno con las de la tarde.
     Sin GPS solo sabemos «🚚 Ya salió» (camionSalio): un camión que salió no se reclama. */
  var tarde=null, tardeSin=0;
  if(fecha===hoy && typeof horaBolivia==='function'){
    var hb=horaBolivia(), hh=hb.getHours()+hb.getMinutes()/60, hTxt=('0'+hb.getHours()).slice(-2)+':'+('0'+hb.getMinutes()).slice(-2);
    var vaTarde=function(s){ return !s.ok && (s.turno.indexOf('PM')>=0 ? hh>=16 : hh>=12); };
    cams.forEach(function(c){ if(c.salio) return; var L=c.stops.filter(vaTarde); if(!L.length) return;
      var pm=L.every(function(s){ return s.turno.indexOf('PM')>=0; });
      if(!tarde || L.length>tarde.n) tarde={ k:c.k, p:c.p, n:L.length, turno:pm?'PM':'AM', hora:hTxt, cams:(tarde?tarde.cams:0)+1 };
      else tarde.cams++; });
    tardeSin=sin.stops.filter(vaTarde).length;
    if(tarde) tarde.hora=hTxt;
  }
  return { fecha:fecha, hoy:fecha===hoy, cams:cams, sin:sin, im:D.im||{ u:0, alm:{} }, pedidos:D.pedidos,
    dia:{ eduardo:edu.length, eduardoCam:camDe(edu), roho:roho.length, rohoCam:camDe(roho), multi:multi.length, multiCam:camDe(multi),
          sinCamion:sin.stops.length, sinMarcar:sinMarcar, faltan:faltan.length, faltanOc:faltan.slice(0,3).map(function(p){ return p.oc||p.cliente; }),
          tarde:tarde, tardeSin:tardeSin,
          gpsLog:(fecha===hoy && typeof gpsEventosHoy==='function') ? gpsEventosHoy() : [],
          gpsVivo:(typeof gpsVigente==='function' && gpsVigente()), gpsDesde:gpsDesdeTxt(), gpsSrv:(typeof gpsDiaHay==='function' && gpsDiaHay()) } };
}
window.patioDatos=patioDatos;
window.patioTiendas=function(){ return TIENDAS.map(function(t){ return { n:t.n, marca:t.marca, pt:{ x:t.pt.x, z:t.pt.z } }; }); };
function firmaDe(D){ return D ? JSON.stringify([D.fecha, D.cams.map(function(c){ return [c.k, c.alm, c.chofer, c.salio, c.lineas.map(function(l){ return l.key+'='+l.u+l.st; }),
  c.stops.map(function(s){ return s.id+(s.ok?'✓':'')+(s.pt?s.pt.x+','+s.pt.z:''); })]; }), D.sin.stops.length, D.im.u, diaFirma(D.dia)]) : ''; }
/* la hora de «va tarde» cambia cada minuto: no cuenta como cambio de la escena (la dice David en el momento, `horaYa`) */
function diaFirma(d){ if(!d) return d; var t=d.tarde, o=Object.assign({}, d, { gpsLog:0, gpsVivo:0, gpsDesde:0, gpsSrv:0 });   // lo del GPS cambia cada minuto: va por api.gps
  if(t) o.tarde={ k:t.k, n:t.n, turno:t.turno, cams:t.cams }; return o; }
/* desde qué hora tiene recorrido este aparato (el primer punto de hoy de cualquier camión) */
function gpsDesdeTxt(){ if(typeof gpsHistCargar!=='function') return ''; var H=gpsHistCargar(), m=0;
  Object.keys(H.u||{}).forEach(function(p){ var L=H.u[p]; if(L && L.length && (!m || L[0][0]<m)) m=L[0][0]; });
  return m ? gpsHoraTxt(m) : ''; }
var CSS="#pt-ov{\n  --fondo:#e9f0f7; --papel:#ffffff; --tinta:#14243a; --suave:#5d7086; --linea:#dbe4ee;\n  --azul:#2f6fd6; --teal:#00a59e; --morado:#7b3fb0; --ambar:#c26a00; --verde:#15803d; --rojo:#c0392b; --calabaza:#e8731a;\n  --sombra:0 8px 28px rgba(20,36,58,.13);\n  --f-tit:'Archivo','Arial Narrow',system-ui,sans-serif; --f-txt:'Nunito Sans',system-ui,-apple-system,sans-serif;\n  color-scheme:light;\n}\n#pt-ov{ background:var(--fondo); color:var(--tinta); font-family:var(--f-txt); transition:background .6s; }\n#pt-ov.noche{ --fondo:#0f1a2c; }\n#pt-ov .pt-app{ position:relative; height:100%; min-height:640px; overflow:hidden; }\n#pt-ov #pt-esc{ position:absolute; inset:0; overflow:hidden; }\n#pt-ov #pt-esc canvas{ display:block; width:100%; height:100%; touch-action:none; }\n#pt-ov .capa{ position:absolute; pointer-events:none; }\n#pt-ov .capa > *{ pointer-events:auto; }\n#pt-ov button{ font:inherit; }\n#pt-ov button:focus-visible{ outline:3px solid var(--azul); outline-offset:2px; }\n#pt-ov .barra{ top:12px; left:16px; right:16px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; }\n#pt-ov .marca{ display:flex; align-items:center; gap:10px; background:var(--papel); border-radius:12px; padding:8px 14px; box-shadow:var(--sombra); }\n#pt-ov .marca b{ font-family:var(--f-tit); font-size:1.05rem; letter-spacing:.02em; }\n#pt-ov .marca small{ color:var(--suave); display:block; font-size:.74rem; }\n#pt-ov .logo{ width:28px; height:28px; border-radius:8px; background:linear-gradient(135deg,var(--teal),var(--azul)); display:grid; place-items:center; color:#fff; font-weight:800; font-family:var(--f-tit); }\n#pt-ov .vistas{ display:flex; gap:6px; flex-wrap:wrap; background:var(--papel); border-radius:14px; padding:5px; box-shadow:var(--sombra); }\n#pt-ov .vistas button{ border:0; background:#eef3f8; color:var(--suave); font-weight:700; font-size:.8rem; padding:6px 11px; border-radius:10px; cursor:pointer; display:flex; gap:6px; align-items:center; min-height:34px; }\n#pt-ov .vistas button b{ font-family:var(--f-tit); width:18px; height:18px; border-radius:6px; display:grid; place-items:center; background:#d7e1ec; color:var(--tinta); font-size:.7rem; }\n#pt-ov .vistas button.on{ background:var(--tinta); color:#fff; }\n#pt-ov .vistas button.on b{ background:var(--teal); color:#fff; }\n#pt-ov .vivo{ margin-left:auto; background:var(--papel); border-radius:999px; padding:7px 14px; box-shadow:var(--sombra); font-weight:700; font-size:.85rem; color:var(--verde); display:flex; align-items:center; gap:8px; font-variant-numeric:tabular-nums; }\n#pt-ov .vivo i{ width:8px; height:8px; border-radius:50%; background:var(--verde); box-shadow:0 0 0 4px rgba(21,128,61,.18); }\n#pt-ov .vivo small{ color:var(--suave); font-weight:600; font-size:.72rem; }\n#pt-ov .kpis{ top:70px; left:16px; display:flex; gap:10px; flex-wrap:wrap; max-width:calc(100% - 360px); }\n#pt-ov .kpi{ background:var(--papel); border-radius:12px; padding:9px 13px; box-shadow:var(--sombra); display:flex; gap:10px; align-items:center; min-width:138px; }\n#pt-ov .kpi .ic{ width:32px; height:32px; border-radius:10px; display:grid; place-items:center; font-size:1rem; background:#eaf1fc; }\n#pt-ov .kpi small{ color:var(--suave); font-size:.72rem; display:block; }\n#pt-ov .kpi b{ font-family:var(--f-tit); font-size:1.3rem; font-variant-numeric:tabular-nums; }\n#pt-ov .kpi.rojo .ic{ background:#fdecea; }\n#pt-ov .kpi.rojo b{ color:var(--rojo); }\n#pt-ov .lado{ top:70px; right:16px; width:min(320px, calc(100% - 32px)); max-height:calc(100% - 300px); overflow:auto; display:flex; flex-direction:column; gap:10px; }\n#pt-ov .ficha{ background:var(--papel); border-radius:14px; box-shadow:var(--sombra); padding:14px; display:flex; flex-direction:column; gap:10px; }\n#pt-ov .ficha .cab{ display:flex; gap:10px; align-items:center; }\n#pt-ov .ficha .cab .ic{ width:40px; height:40px; border-radius:12px; display:grid; place-items:center; font-size:1.3rem; background:#eaf1fc; flex:none; }\n#pt-ov .ficha .cab small{ color:var(--suave); font-size:.7rem; text-transform:uppercase; letter-spacing:.06em; display:block; }\n#pt-ov .ficha .cab b{ font-family:var(--f-tit); font-size:1.08rem; }\n#pt-ov .placa{ font-family:var(--f-tit); font-size:.72rem; background:#fff7d6; border:1.5px solid #1d2b3a; border-radius:5px; padding:1px 6px; letter-spacing:.05em; margin-left:6px; vertical-align:2px; }\n#pt-ov .chip{ display:inline-flex; align-items:center; gap:6px; border-radius:999px; padding:3px 10px; font-size:.76rem; font-weight:700; background:#e7f6ee; color:var(--verde); width:fit-content; }\n#pt-ov .chip.am{ background:#fff4e2; color:var(--ambar); }\n#pt-ov .chip.az{ background:#e9f0fd; color:var(--azul); }\n#pt-ov .chip.mo{ background:#f2eafa; color:var(--morado); }\n#pt-ov .chip.ro{ background:#fdecea; color:var(--rojo); }\n#pt-ov .barrita{ height:8px; border-radius:999px; background:#edf2f7; overflow:hidden; }\n#pt-ov .barrita i{ display:block; height:100%; background:linear-gradient(90deg,var(--teal),var(--azul)); border-radius:999px; transition:width .6s; }\n#pt-ov .filas{ display:flex; flex-direction:column; gap:6px; font-size:.84rem; }\n#pt-ov .filas div{ display:flex; justify-content:space-between; gap:10px; }\n#pt-ov .filas span{ color:var(--suave); }\n#pt-ov .filas b{ text-align:right; }\n#pt-ov .prods{ display:flex; flex-direction:column; gap:5px; font-size:.82rem; border-top:1px dashed var(--linea); padding-top:8px; }\n#pt-ov .prods label{ display:flex; gap:8px; align-items:center; }\n#pt-ov .prods input{ width:18px; height:18px; accent-color:var(--azul); }\n#pt-ov .paradas{ display:flex; flex-direction:column; gap:6px; font-size:.82rem; border-top:1px dashed var(--linea); padding-top:8px; }\n#pt-ov .paradas div{ display:grid; grid-template-columns:22px minmax(0,1fr) auto; gap:6px; align-items:start; }\n#pt-ov .paradas small{ color:var(--suave); display:block; }\n#pt-ov .boton{ border:0; border-radius:10px; padding:10px 12px; font-weight:800; background:var(--azul); color:#fff; cursor:pointer; min-height:44px; }\n#pt-ov .boton:disabled{ background:#c7d3e2; cursor:default; }\n#pt-ov .nota-gps{ font-size:.76rem; color:var(--suave); background:#f3f7fb; border-radius:8px; padding:7px 9px; }\n#pt-ov .alertas h4{ margin:0; font-family:var(--f-tit); font-size:.92rem; color:var(--rojo); display:flex; gap:6px; align-items:center; }\n#pt-ov .al{ display:grid; grid-template-columns:28px minmax(0,1fr); gap:8px; align-items:start; text-align:left; border:0; background:#fff6f5; border-radius:10px; padding:8px 10px; cursor:pointer; color:var(--tinta); }\n#pt-ov .al:hover{ background:#fdecea; }\n#pt-ov .al .ic{ font-size:1.1rem; }\n#pt-ov .al b{ font-size:.84rem; display:block; }\n#pt-ov .al small{ color:var(--suave); font-size:.76rem; }\n#pt-ov .abajo{ left:16px; right:16px; bottom:14px; }\n#pt-ov .pie{ background:var(--papel); border-radius:14px; box-shadow:var(--sombra); padding:10px 14px 14px; max-width:980px; }\n#pt-ov .tabs{ display:flex; gap:4px; flex-wrap:wrap; border-bottom:1px solid var(--linea); margin-bottom:10px; }\n#pt-ov .tabs button{ border:0; background:none; font-weight:700; font-size:.84rem; color:var(--suave); padding:8px 10px; border-bottom:3px solid transparent; cursor:pointer; }\n#pt-ov .tabs button.on{ color:var(--tinta); border-bottom-color:var(--azul); }\n#pt-ov .tabs button[hidden]{ display:none; }\n#pt-ov .tabs button em{ font-style:normal; background:#e9f0fd; color:var(--azul); border-radius:999px; padding:0 7px; font-size:.72rem; margin-left:4px; }\n#pt-ov .pasos{ display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); position:relative; }\n#pt-ov .pasos::before{ content:\"\"; position:absolute; left:10%; right:10%; top:13px; height:3px; background:#e3eaf3; }\n#pt-ov .pasos .lleno{ position:absolute; left:10%; top:13px; height:3px; background:var(--azul); transition:width .6s; }\n#pt-ov .paso{ text-align:center; position:relative; font-size:.74rem; color:var(--suave); }\n#pt-ov .paso i{ width:28px; height:28px; border-radius:50%; margin:0 auto 4px; display:grid; place-items:center; background:#e3eaf3; color:#fff; font-style:normal; font-size:.8rem; position:relative; z-index:1; }\n#pt-ov .paso.ok i{ background:var(--azul); }\n#pt-ov .paso.ya i{ background:var(--papel); border:3px solid var(--azul); color:var(--azul); }\n#pt-ov .paso b{ display:block; color:var(--tinta); font-size:.76rem; }\n#pt-ov .rutas{ display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:10px; }\n#pt-ov .ruta{ border:1px solid var(--linea); border-radius:12px; padding:10px 12px; display:flex; flex-direction:column; gap:8px; cursor:pointer; }\n#pt-ov .ruta:hover{ border-color:var(--azul); }\n#pt-ov .ruta .t{ display:flex; justify-content:space-between; gap:8px; align-items:center; font-size:.84rem; }\n#pt-ov .ruta .t b{ font-family:var(--f-tit); }\n#pt-ov .linea{ position:relative; height:26px; }\n#pt-ov .linea::before{ content:\"\"; position:absolute; left:6px; right:6px; top:12px; height:3px; background:#e3eaf3; border-radius:3px; }\n#pt-ov .linea .hecho{ position:absolute; left:6px; top:12px; height:3px; background:var(--teal); border-radius:3px; transition:width 1s; }\n#pt-ov .linea .pt{ position:absolute; top:7px; width:13px; height:13px; border-radius:50%; background:var(--papel); border:3px solid #c7d3e2; transform:translateX(-50%); }\n#pt-ov .linea .pt.ok{ border-color:var(--teal); background:var(--teal); }\n#pt-ov .linea .pt.base{ border-color:var(--tinta); border-radius:3px; }\n#pt-ov .linea .cam{ position:absolute; top:-2px; font-size:1.05rem; transform:translateX(-50%) scaleX(-1); transition:left 1s; }\n#pt-ov .ruta .p{ font-size:.78rem; color:var(--suave); }\n#pt-ov .ruta .p b{ color:var(--tinta); }\n#pt-ov .vacio{ color:var(--suave); font-size:.84rem; padding:6px 0; }\n#pt-ov .log{ display:flex; flex-direction:column; gap:4px; max-height:150px; overflow:auto; font-size:.8rem; }\n#pt-ov .log div{ display:grid; grid-template-columns:48px minmax(0,1fr); gap:8px; padding:4px 0; border-top:1px solid var(--linea); }\n#pt-ov .log div:first-child{ border-top:0; }\n#pt-ov .log time{ font-variant-numeric:tabular-nums; color:var(--suave); font-weight:700; }\n#pt-ov .log .nuevo{ animation:pt-brilla 1.6s; }\n@keyframes pt-brilla{ from{ background:#fff4c2; } to{ background:transparent; } }\n#pt-ov .and{ display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:6px 14px; }\n#pt-ov .and .a{ display:grid; grid-template-columns:auto minmax(0,1fr) auto; gap:4px 10px; align-items:center; font-size:.8rem; padding:6px 0; border-top:1px solid var(--linea); cursor:pointer; }\n#pt-ov .and .a small{ color:var(--suave); display:block; }\n#pt-ov .and .a .dot{ width:10px; height:10px; border-radius:3px; }\n#pt-ov .etq{ position:absolute; transform:translate(-50%,-100%); pointer-events:none; font-family:var(--f-tit); font-weight:700; white-space:nowrap; }\n#pt-ov .etq.galpon{ background:var(--papel); border-radius:10px; padding:5px 10px; box-shadow:var(--sombra); font-size:.82rem; display:flex; gap:6px; align-items:center; }\n#pt-ov .etq.galpon small{ font-family:var(--f-txt); color:var(--suave); font-weight:600; }\n#pt-ov .etq.mini{ background:var(--azul); color:#fff; border-radius:8px; padding:2px 7px; font-size:.7rem; }\n#pt-ov .etq.mini.mo{ background:var(--morado); }\n#pt-ov .etq.mini.calle{ background:var(--teal); }\n#pt-ov .etq.alerta{ background:var(--rojo); color:#fff; border-radius:9px; padding:4px 9px; font-size:.74rem; box-shadow:0 6px 16px rgba(192,57,43,.35); animation:pt-late 1.6s ease-in-out infinite; }\n#pt-ov .etq.gps{ background:var(--tinta); color:#fff; border-radius:8px; padding:3px 8px; font-size:.7rem; }\n@keyframes pt-late{ 50%{ transform:translate(-50%,-112%); } }\n#pt-ov .pt-toast{ position:absolute; left:50%; top:118px; bottom:auto; width:max-content; height:auto; transform:translateX(-50%); background:var(--tinta); color:#fff; border-radius:12px; padding:9px 14px; font-weight:700; font-size:.84rem; box-shadow:var(--sombra); max-width:min(90%,520px); text-align:center; z-index:5; transition:opacity .4s; pointer-events:none; }\n#pt-ov .ir{ top:140px; left:16px; display:flex; flex-direction:column; gap:6px; }\n#pt-ov .ir button{ border:0; background:var(--papel); box-shadow:var(--sombra); border-radius:10px; padding:7px 11px; font-weight:700; font-size:.8rem; color:var(--tinta); cursor:pointer; text-align:left; min-height:36px; }\n#pt-ov .ir button.on{ background:var(--azul); color:#fff; }\n#pt-ov .etq.tag{ background:#fff; color:var(--tinta); border:1.5px solid var(--teal); border-radius:7px; padding:1px 6px; font-size:.64rem; font-family:var(--f-txt); }\n#pt-ov .etq.tag.sig{ background:var(--teal); color:#fff; }\n#pt-ov .etq.pin{ background:var(--papel); color:var(--tinta); border-radius:8px; padding:2px 8px; font-size:.7rem; box-shadow:var(--sombra); }\n#pt-ov .etq.pin.ok{ color:var(--verde); }\n#pt-ov .etq.flota{ color:var(--verde); font-size:1rem; text-shadow:0 1px 0 #fff, 0 0 8px #fff; transition:transform 1.4s ease-out, opacity 1.4s; }\n#pt-ov .etq.npc{ background:#ff7a00; color:#fff; border-radius:7px; padding:1px 7px; font-size:.66rem; letter-spacing:.06em; }\n#pt-ov .etq.habla{ background:#fff; color:#14243a; border:2px solid #c0392b; border-radius:12px; padding:5px 10px; font-size:.78rem; font-family:var(--f-txt); font-weight:800; max-width:260px; white-space:normal; text-align:center; box-shadow:var(--sombra); }\n#pt-ov .etq.npc.ern{ background:#2f6fd6; }\n#pt-ov .etq.npc.dav{ background:#15803d; }\n#pt-ov .etq.habla.calma{ border-color:#2f6fd6; }\n#pt-ov .etq.habla.calma::after{ border-top-color:#2f6fd6; }\n#pt-ov .etq.habla.jefe{ border-color:#15803d; background:#f0fbf3; }\n#pt-ov .etq.habla.jefe::after{ border-top-color:#15803d; }\n#pt-ov .etq.tienda{ color:#fff; border-radius:6px; padding:2px 8px; font-size:.68rem; font-weight:800; letter-spacing:.04em; box-shadow:var(--sombra); }\n#pt-ov .etq.tienda.hv{ background:#1f2f6b; }\n#pt-ov .etq.fuego{ background:#d9480f; color:#fff; border-radius:8px; padding:3px 9px; font-size:.72rem; letter-spacing:.04em; box-shadow:0 6px 16px rgba(217,72,15,.4); animation:pt-late 1.2s ease-in-out infinite; }\n#pt-ov .etq.tienda.su{ background:#f5c400; color:#14243a; }\n#pt-ov .ir hr{ border:0; border-top:1px solid rgba(20,36,58,.15); margin:4px 0; width:100%; }\n#pt-ov .ir .cams{ display:flex; flex-direction:column; gap:6px; }\n#pt-ov .ir .cams button small{ font-weight:600; }\n#pt-ov .etq.habla::after{ content:\"\"; position:absolute; left:50%; bottom:-9px; margin-left:-7px; border:7px solid transparent; border-top-color:#c0392b; border-bottom:0; }\n#pt-ov .aviso{ position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); background:var(--papel); padding:16px 20px; border-radius:12px; box-shadow:var(--sombra); }\n@media (min-width:981px){#pt-ov .barra{ top:10px; left:12px; right:12px; gap:8px; }\n#pt-ov .marca{ padding:5px 10px; gap:8px; border-radius:10px; }\n#pt-ov .marca b{ font-size:.92rem; }\n#pt-ov .marca small{ font-size:.64rem; }\n#pt-ov .logo{ width:24px; height:24px; font-size:.8rem; border-radius:7px; }\n#pt-ov .vistas{ padding:3px; gap:3px; border-radius:11px; }\n#pt-ov .vistas button{ font-size:.72rem; padding:4px 8px; min-height:30px; border-radius:8px; }\n#pt-ov .vistas button b{ display:none; }\n#pt-ov .vivo{ padding:5px 11px; font-size:.76rem; }\n#pt-ov .vivo small{ display:none; }\n#pt-ov .kpis{ top:54px; left:12px; gap:5px; max-width:calc(100% - 310px); }\n#pt-ov .kpi{ min-width:0; padding:3px 10px 3px 6px; gap:5px; border-radius:999px; }\n#pt-ov .kpi .ic{ width:auto; height:auto; background:none; font-size:.82rem; }\n#pt-ov .kpi > div:last-child{ display:flex; gap:5px; align-items:baseline; }\n#pt-ov .kpi small{ font-size:.66rem; }\n#pt-ov .kpi b{ font-size:.9rem; }\n#pt-ov .ir{ top:90px; left:12px; gap:4px; }\n#pt-ov .ir button{ font-size:.72rem; padding:4px 9px; min-height:30px; border-radius:8px; }\n#pt-ov .ir .cams{ gap:4px; }\n#pt-ov .ir hr{ margin:2px 0; }\n#pt-ov .lado{ top:54px; right:12px; width:min(270px, calc(100% - 24px)); max-height:calc(100% - 120px); gap:7px; }\n#pt-ov .ficha{ padding:10px 11px; gap:7px; border-radius:12px; }\n#pt-ov .ficha .cab .ic{ width:30px; height:30px; font-size:1rem; border-radius:9px; }\n#pt-ov .ficha .cab small{ font-size:.62rem; }\n#pt-ov .ficha .cab b{ font-size:.92rem; }\n#pt-ov .placa{ font-size:.64rem; }\n#pt-ov .chip{ font-size:.7rem; padding:2px 8px; }\n#pt-ov .barrita{ height:6px; }\n#pt-ov .filas{ font-size:.76rem; gap:4px; }\n#pt-ov .prods, #pt-ov .paradas{ font-size:.73rem; gap:4px; }\n#pt-ov .prods input{ width:15px; height:15px; }\n#pt-ov .boton{ min-height:34px; padding:6px 10px; font-size:.78rem; }\n#pt-ov .nota-gps{ font-size:.68rem; padding:5px 8px; }\n#pt-ov .alertas h4{ font-size:.82rem; }\n#pt-ov .al{ padding:6px 8px; }\n#pt-ov .al b{ font-size:.76rem; }\n#pt-ov .al small{ font-size:.68rem; }\n#pt-ov .abajo{ left:12px; right:auto; bottom:10px; width:min(760px, calc(100% - 300px)); }\n#pt-ov .pie{ padding:4px 10px 10px; border-radius:12px; }\n#pt-ov .tabs{ margin-bottom:8px; flex-wrap:nowrap; overflow-x:auto; gap:2px; }\n#pt-ov .tabs button{ font-size:.72rem; padding:6px 6px; white-space:nowrap; flex:none; }\n#pt-ov .paso{ font-size:.66rem; }\n#pt-ov .paso b{ font-size:.68rem; }\n#pt-ov .paso i{ width:22px; height:22px; font-size:.68rem; }\n#pt-ov .pasos::before, #pt-ov .pasos .lleno{ top:10px; }\n#pt-ov .rutas{ grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:7px; }\n#pt-ov .ruta{ padding:7px 9px; gap:5px; }\n#pt-ov .ruta .t{ font-size:.76rem; }\n#pt-ov .ruta .p{ font-size:.7rem; }\n#pt-ov .log{ max-height:110px; font-size:.72rem; }\n#pt-ov .and .a{ font-size:.72rem; padding:4px 0; }\n#pt-ov .pt-toast{ top:92px; font-size:.78rem; }\n#pt-ov .etq.habla{ font-size:.72rem; padding:4px 9px; max-width:230px; }\n\n}\n#pt-ov .ruta{ min-width:0; overflow-wrap:anywhere; }\n#pt-ov .plegar{ border:0; background:#eef3f8; border-radius:8px; font-weight:800; font-size:.72rem; color:var(--suave); padding:4px 9px; cursor:pointer; min-height:28px; }\n#pt-ov .plegar:hover{ background:#e2eaf3; color:var(--tinta); }\n#pt-ov .lado .plegar{ align-self:flex-end; box-shadow:var(--sombra); background:var(--papel); }\n#pt-ov .tabs .plegar{ margin-left:auto; border-bottom:0; }\n#pt-ov .lado.plegado .ficha:not(.alertas) > :not(.cab):not(.chip){ display:none; }\n#pt-ov .lado.plegado .alertas{ display:none; }\n#pt-ov .abajo.plegado #tab-cuerpo{ display:none; }\n#pt-ov .abajo.plegado .tabs{ margin-bottom:0; border-bottom:0; }\n#pt-ov .abajo.plegado .pie{ padding-bottom:4px; }\n#pt-ov .solo-btn{ border:0; background:var(--tinta); color:#fff; border-radius:10px; padding:5px 11px; font-weight:800; font-size:.74rem; cursor:pointer; min-height:30px; box-shadow:var(--sombra); }\n#pt-ov.solo .kpis, #pt-ov.solo .lado, #pt-ov.solo .abajo, #pt-ov.solo .vistas, #pt-ov.solo .marca small, #pt-ov.solo .ir .cams, #pt-ov.solo .ir hr{ display:none; }\n@media (max-width:980px){#pt-ov .solo-btn{ display:none; }\n }\n@media (max-width:980px){#pt-ov .ir .cams{ flex-direction:row; flex-wrap:wrap; }\n#pt-ov .ir hr{ display:none; }\n#pt-ov .pt-app{ height:auto; min-height:0; overflow:visible; display:flex; flex-direction:column; gap:12px; padding-inline:16px; padding-block:12px 20px; }\n#pt-ov #pt-esc{ position:relative; inset:auto; height:58vh; min-height:340px; margin-inline:-16px; order:2; }\n#pt-ov .capa{ position:static; }\n#pt-ov .barra{ order:0; }\n#pt-ov .ir{ order:1; flex-direction:row; flex-wrap:wrap; }\n#pt-ov .kpis{ order:1; max-width:none; }\n#pt-ov .lado{ order:3; width:auto; max-height:none; }\n#pt-ov .abajo{ order:4; }\n#pt-ov .vivo{ margin-left:0; }\n#pt-ov .kpi{ min-width:0; flex:1 1 140px; }\n#pt-ov .pt-toast{ position:fixed; top:12px; }\n#pt-ov .paso{ font-size:.66rem; }\n#pt-ov .paso b{ font-size:.68rem; }\n\n}\n@media (prefers-reduced-motion: reduce){#pt-ov .barrita i, #pt-ov .pasos .lleno, #pt-ov .linea .hecho, #pt-ov .linea .cam{ transition:none; }\n#pt-ov .etq.alerta, #pt-ov .log .nuevo{ animation:none; }\n }\n\n";

/* ═════════ la escena: se arma UNA vez (la primera vez que se abre) y después solo se acomoda con cada lectura ═════════ */
function armar(ren, box){
var OV=document.getElementById('pt-ov');
var W=box.clientWidth||800, H=box.clientHeight||600, CHICO=W<980;
var lin=function(c){ return new THREE.Color(c).convertSRGBToLinear(); };
var esc=new THREE.Scene(); esc.background=lin(0xdfe9f3);
var zDe=function(a){ return a<1.3 ? Math.min(64, 34/Math.max(.5,a)) : 46; }, Z=zDe(W/H), cam=new THREE.OrthographicCamera(-Z*W/H, Z*W/H, Z, -Z, -400, 700);
var OJO=new THREE.Vector3(80,68,92);
cam.position.copy(OJO); cam.updateProjectionMatrix();
var ctl=new THREE.OrbitControls(cam, ren.domElement); ctl.enableDamping=true; ctl.dampingFactor=.08;
ctl.maxPolarAngle=Math.PI*.42; ctl.minPolarAngle=Math.PI*.16; ctl.minZoom=.18; ctl.maxZoom=4;
var hemi=new THREE.HemisphereLight(0xffffff, 0x9fb0c6, .6); esc.add(hemi);
var sol=new THREE.DirectionalLight(0xffffff, .8); sol.castShadow=true; sol.shadow.mapSize.set(2048, 2048);
var sc=sol.shadow.camera; sc.left=-120; sc.right=120; sc.top=110; sc.bottom=-110; sc.near=1; sc.far=420; sol.shadow.bias=-.0008; esc.add(sol); esc.add(sol.target);
var BRILLA=[], LUCES=[], EST=new THREE.Group();   // EST = lo que no se mueve: al final se junta por material (pocas llamadas de dibujo)
var M=function(c,o){ var m=new THREE.MeshStandardMaterial(Object.assign({ roughness:.75, metalness:.05 }, o||{})); m.color=lin(c); return m; };
var PRISMA=null, PUERTA=null, VIDRIO_B=null;   // los de la casa: se arman al primer uso
var MCACHE={}, Mc=function(c,o){ var k=c+'|'+(o?JSON.stringify(o):''); return MCACHE[k]||(MCACHE[k]=M(c,o)); };   // (13/10) el mismo material para lo que no se mueve: menos llamadas de dibujo
var Mbrilla=function(c,e){ var m=M(c,{ roughness:.4 }); m.emissive=lin(e); m.emissiveIntensity=0; BRILLA.push(m); return m; };
var caja=function(w,h,d,mat,x,y,z,g,sombra){ var m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat); m.position.set(x||0,y||0,z||0); m.castShadow=sombra!==false; m.receiveShadow=true; (g||EST).add(m); return m; };
var cil=function(r,h,mat,x,y,z,g,seg){ var m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,seg||16), mat); m.position.set(x,y,z); m.castShadow=true; (g||EST).add(m); return m; };
var luz=function(x,y,z,col,i,dist){ var l=new THREE.PointLight(col,0,dist||16,2); l.position.set(x,y,z); esc.add(l); LUCES.push({ l:l, i:i }); return l; };
var S=11; function rnd(){ S=(S*16807)%2147483647; return (S-1)/2147483646; }
/* ── el logo de MultiEspumas (el que mandó el dueño): se le saca el gris del fondo y se recorta ── */
var LOGO_IMG=new Image(), LOGO=null, LOGO_PEND=[];
LOGO_IMG.onload=function(){ var c=document.createElement('canvas'); c.width=LOGO_IMG.width; c.height=LOGO_IMG.height; var g=c.getContext('2d'); g.drawImage(LOGO_IMG,0,0);
  var im=g.getImageData(0,0,c.width,c.height), p=im.data, x0=c.width, y0=c.height, x1=0, y1=0;
  for(var y=0;y<c.height;y++) for(var x=0;x<c.width;x++){ var i=(y*c.width+x)*4, r=p[i], gg=p[i+1], b=p[i+2];
    if(r>200&&gg>200&&b>200&&Math.max(r,gg,b)-Math.min(r,gg,b)<16){ p[i+3]=0; } else { if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; } }
  g.putImageData(im,0,0); LOGO={ c:c, x:x0, y:y0, w:x1-x0+1, h:y1-y0+1 }; LOGO_PEND.forEach(function(f){ f(); }); LOGO_PEND=[]; };
LOGO_IMG.src='data:image/jpeg;base64,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';
function texLogo(w,h,pintar){ var c=document.createElement('canvas'); c.width=w; c.height=h; var g=c.getContext('2d'), t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; t.anisotropy=4;
  function dib(){ g.clearRect(0,0,w,h); pintar(g,w,h); t.needsUpdate=true; } dib(); if(!LOGO) LOGO_PEND.push(dib); return t; }
function dibLogo(g, x, y, alto){ if(!LOGO) return 0; var an=LOGO.w*alto/LOGO.h; g.drawImage(LOGO.c, LOGO.x, LOGO.y, LOGO.w, LOGO.h, x, y, an, alto); return an; }

/* ── texturas pintadas ── */
function lienzo(w,h,fn){ var c=document.createElement('canvas'); c.width=w; c.height=h; fn(c.getContext('2d'),w,h); var t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; t.anisotropy=4; return t; }
var FACH=lienzo(512,512,function(g){ g.fillStyle='#ffffff'; g.fillRect(0,0,512,512);
  for(var i=0;i<4;i++) for(var j=0;j<4;j++){ var x=i*128, y=j*128; g.fillStyle='#d3dbe5'; g.fillRect(x,y+116,128,12); g.fillStyle='#4f6884'; g.fillRect(x+20,y+28,88,66); g.fillStyle='#86a9cf'; g.fillRect(x+24,y+32,38,58); g.fillStyle='#a9c4e2'; g.fillRect(x+66,y+32,38,58); } });
var FACH_E=lienzo(512,512,function(g){ g.fillStyle='#000'; g.fillRect(0,0,512,512);
  for(var i=0;i<4;i++) for(var j=0;j<4;j++){ var r=rnd(); if(r<.58){ g.fillStyle=r<.12?'#bfe0ff':'#ffd27a'; g.fillRect(i*128+20,j*128+28,88,66); } } });
[FACH,FACH_E].forEach(function(t){ t.wrapS=t.wrapT=THREE.RepeatWrapping; });
var CHAPA=lienzo(128,128,function(g){ g.fillStyle='#ffffff'; g.fillRect(0,0,128,128); for(var x=0;x<128;x+=16){ g.fillStyle='#dfe6ee'; g.fillRect(x,0,6,128); g.fillStyle='#f6f9fc'; g.fillRect(x+6,0,3,128); } });
CHAPA.wrapS=CHAPA.wrapT=THREE.RepeatWrapping;
function cartelTex(txt, fondo, letra, w, h){ return lienzo(w||1024,h||160,function(g,W2,H2){ g.fillStyle=fondo; g.fillRect(0,0,W2,H2);
  g.fillStyle=letra; var fs=Math.round(H2*.5); g.font='800 '+fs+'px Archivo, Arial Narrow, sans-serif'; var mw=g.measureText(txt).width; if(mw>W2*.9){ fs=Math.floor(fs*W2*.9/mw); g.font='800 '+fs+'px Archivo, Arial Narrow, sans-serif'; }   // (13/10, dueño: «los nombres no se leen») la letra se achica hasta entrar
  g.textAlign='center'; g.textBaseline='middle'; g.fillText(txt, W2/2, H2/2+4); }); }
function uvEscala(geo, uw, ud, vh){ var uv=geo.attributes.uv; for(var f=0;f<6;f++){ var a=f<2?ud:(f<4?0:uw), b=(f===2||f===3)?0:vh;
  for(var v=0;v<4;v++){ var i=f*4+v; uv.setXY(i, uv.getX(i)*a, uv.getY(i)*b); } } uv.needsUpdate=true; }
var FMAT={}, TECHO2=M(0x9aa8b8);
function fachMat(col){ if(FMAT[col]) return FMAT[col]; var m=M(col,{ roughness:.85 }); m.map=FACH; m.emissiveMap=FACH_E; m.emissive=lin(0xffffff); m.emissiveIntensity=0; BRILLA.push(m); return FMAT[col]=m; }
function bloqueFach(x,z,w,d,h,col,g){ var geo=new THREE.BoxGeometry(w,h,d); uvEscala(geo,w/16,d/16,h/12.8); var m=new THREE.Mesh(geo,fachMat(col)); m.position.set(x,h/2,z); m.castShadow=m.receiveShadow=true; (g||EST).add(m); return m; }

/* ── suelo, calles, veredas ── */
var ASF=M(0x8f9db0), VER=M(0xf1f4f8), BLANCO=M(0xffffff), AMARILLO=M(0xf2b705), PASTO=M(0x9fd3a0), HORM=M(0xe9eef3);
var plano=function(w,d,x,z,y,mat,g){ var m=new THREE.Mesh(new THREE.PlaneGeometry(w,d), mat); m.rotation.x=-Math.PI/2; m.position.set(x,y||.02,z); m.receiveShadow=true; (g||EST).add(m); return m; };
var piso=new THREE.Mesh(new THREE.PlaneGeometry(2000,2000), M(0xcfdac6)); piso.position.z=200; piso.rotation.x=-Math.PI/2; piso.receiveShadow=true; esc.add(piso);
for(var zi=Z0; zi<=Z1; zi+=G){ plano(X1-X0+RW,RW,(X0+X1)/2,zi,.03,ASF); for(var xd=X0; xd<X1; xd+=7) plano(3,.3,xd+3.5,zi,.05,BLANCO); }
for(var xi=X0; xi<=X1; xi+=G){ plano(RW,Z1-Z0+RW,xi,(Z0+Z1)/2,.031,ASF); for(var zd=Z0; zd<Z1; zd+=7) plano(.3,3,xi,zd+3.5,.051,BLANCO); }
for(var a1=X0; a1<=X1; a1+=G) for(var b1=Z0; b1<=Z1; b1+=G) plano(RW,RW,a1,b1,.052,ASF);   // los cruces sin rayas

/* ── colchones sobre pallet ── */
var matCol=[M(0xffffff,{roughness:.9}), M(0xf3f6f9,{roughness:.9})], banda=M(0x00a59e), madera=M(0xc9a26b);
function pallet(g, n, x, y, z){ var p=new THREE.Group(); p.position.set(x||0,y||0,z||0); (g||EST).add(p);
  caja(1.7,.18,1.2,madera,0,.09,0,p); for(var i=0;i<n;i++){ caja(1.6,.32,1.1,matCol[i%2],0,.34+i*.34,0,p); caja(1.62,.06,1.12,banda,0,.34+i*.34,0,p); } return p; }

/* ── cada almacén en su predio: piso de hormigón, cerco, portón con caseta ── */
var TOCA=[], ETQ=[], LUZ_ANDEN={};
function arbol(x,z,s,g){ if(!g && VIA_ON && enVia(x,z,1.4)) return; s=s||1; cil(.2*s,1.6*s,Mc(0x8a6a4b),x,.8*s,z,g); var c=new THREE.Mesh(new THREE.IcosahedronGeometry(1.3*s,0), [Mc(0x58b368,{ flatShading:true }),Mc(0x4ea35c,{ flatShading:true }),Mc(0x6cc077,{ flatShading:true })][Math.floor(rnd()*3)]);
  c.position.set(x,2.4*s,z); c.castShadow=true; (g||EST).add(c); }
var POSTE=M(0x8c99a8);
function predio(A){
  var x0=A.bx-G/2+RW/2+1, x1=A.bx+G/2-RW/2-1, z0=A.bz-G/2+RW/2+1, z1=A.bz+G/2-RW/2-1;
  plano(x1-x0,z1-z0,A.bx,A.bz,.04,HORM);
  [x0,x1].forEach(function(x){ for(var z=z0;z<z1;z+=3) caja(.15,2.2,.15,POSTE,x,1.1,z,null,false); caja(.08,.1,z1-z0,POSTE,x,2,(z0+z1)/2,null,false); });
  for(var x=x0;x<x1;x+=3) caja(.15,2.2,.15,POSTE,x,1.1,z0,null,false); caja(x1-x0,.1,.08,POSTE,(x0+x1)/2,2,z0,null,false);
  caja(3,2.8,3,M(0xf4f7fb),x0+3,1.4,z1-2.5); caja(3.4,.3,3.4,M(A.col),x0+3,2.95,z1-2.5);
  for(var t=0;t<4;t++) arbol(x0+1.5,z0+4+t*7,.9);
}
/* ── los galpones ── */
function galpon(k){
  var A=ALM[k], g=new THREE.Group(); g.position.set(A.x,0,A.z); EST.add(g); LUZ_ANDEN[k]=[];
  predio(A);
  var pared=M(A.marca?0xf2f5fa:A.col,{ roughness:.55 }); pared.map=CHAPA;
  var geo=new THREE.BoxGeometry(A.w,A.h,A.d); uvEscala(geo,A.w/3,A.d/3,A.h/3);
  var cuerpo=new THREE.Mesh(geo,pared); cuerpo.position.y=A.h/2; cuerpo.castShadow=cuerpo.receiveShadow=true; g.add(cuerpo);
  caja(A.w+.4,.5,A.d+.4,M(new THREE.Color(A.col).multiplyScalar(.7).getHex()),0,.25,0,g);
  var techo=M(A.marca?0x2e2f6e:new THREE.Color(A.col).multiplyScalar(.78).getHex(),{ roughness:.45 }); techo.map=CHAPA;
  var tra=Mbrilla(0xd9ecff,0xfff3c4);
  [-1,1].forEach(function(s){ var r=caja(A.w+.8,.4,A.d/2+1.2,techo,0,A.h+1.3,s*A.d/4,g); r.rotation.x=s*.3;   /* (13/10, dueño) a dos aguas: antes quedaba en V */
    for(var t=0;t<Math.floor(A.w/6);t++){ var xt=-A.w/2+3+t*6; caja(2.2,.12,A.d/2-2,tra,xt,.26,0,r,false); } });
  caja(A.w+.9,.5,.9,techo,0,A.h+2.5,0,g);
  for(var u=0;u<3;u++) caja(2,1.1,1.6,M(0xc5ced8),-A.w/2+5+u*5,A.h+2.6,-A.d/4-1,g);
  var cartTex=A.marca ? texLogo(1024,160,function(g2,w2,h2){ g2.fillStyle='#ffffff'; g2.fillRect(0,0,w2,h2); var an=dibLogo(g2,14,6,h2-12);
      g2.fillStyle='#2e2f6e'; var fs2=Math.round(h2*.42), tx2=A.n+' · '+A.sub, lib=w2-(30+an)-24; g2.font='800 '+fs2+'px Archivo, Arial Narrow, sans-serif'; var mw2=g2.measureText(tx2).width; if(mw2>lib){ fs2=Math.floor(fs2*lib/mw2); g2.font='800 '+fs2+'px Archivo, Arial Narrow, sans-serif'; } g2.textBaseline='middle'; g2.fillText(tx2, 30+an, h2/2+4); }) : cartelTex(A.cartel,'#ffffff','#14243a');
  var cart=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(A.w*.62,22),2.2), new THREE.MeshBasicMaterial({ map:cartTex }));
  cart.position.set(0,A.h-1.3,A.d/2+.06); g.add(cart);
  caja(A.w+.4,1.2,2,M(0xcfd8e3),0,.6,A.d/2+1,g);
  if(A.marca) [0xf2c14e,0xf39237,0xe8505b,0xc98fd0].forEach(function(col,k){ var mt=M(col,{ roughness:.5 }); [-1,1].forEach(function(sx){ caja(.12,.32,A.d,mt,sx*(A.w/2+.07),A.h-1.1-k*.34,0,g,false); }); caja(A.w,.32,.12,mt,0,A.h-1.1-k*.34,-A.d/2-.07,g,false); });
  caja(A.w-1,.25,3.4,M(0xe8edf3),0,6.4,A.d/2+1.7,g);
  var boca=Mbrilla(0x1d2b3a,0xffc66b), porton=M(0xe3e9f0), goma=M(0x1c242c);
  for(var i=0;i<A.puertas;i++){ var x=puertaX(A,i)-A.x;
    caja(4.4,4.8,.2,boca,x,3.6,A.d/2+.02,g); caja(4.4,1.4,.25,porton,x,5.3,A.d/2+.06,g);
    caja(4.8,.3,.3,BLANCO,x,6.1,A.d/2+.12,g); caja(.3,4.8,.3,BLANCO,x-2.3,3.6,A.d/2+.12,g); caja(.3,4.8,.3,BLANCO,x+2.3,3.6,A.d/2+.12,g);
    caja(.5,.7,.35,goma,x-1.5,1,A.d/2+2.1,g); caja(.5,.7,.35,goma,x+1.5,1,A.d/2+2.1,g);
    var lm=M(0x3a4552); lm.emissive=lin(0x22c55e); lm.emissiveIntensity=0; caja(.35,.35,.2,lm,x+2.8,4.2,A.d/2+.2,g,false); LUZ_ANDEN[k].push(lm);
    pallet(g, 3, x-.8, 1.2, A.d/2-1.4); pallet(g, 2, x+1, 1.2, A.d/2-1.8);
    var raya=new THREE.Mesh(new THREE.PlaneGeometry(.25,14), AMARILLO); raya.rotation.x=-Math.PI/2; raya.position.set(x-2.6,.05,A.d/2+9); g.add(raya);
    var raya2=raya.clone(); raya2.position.x=x+2.6; g.add(raya2);
  }
  luz(A.x, 7, A.fz+5, 0xffd08a, 1.7, 26);
  for(var s=0;s<3;s++){ var e=new THREE.Group(); e.position.set(A.w/2+3, 0, -A.d/2+3+s*4.6); g.add(e);
    [0,1.7,3.4].forEach(function(y){ caja(2.2,.14,3.8,M(0x7d8fa6),0,y+.07,0,e); if(y<3.4){ pallet(e, 2, 0, y+.14, -.9); pallet(e, 3, 0, y+.14, .95); } });
    [-1,1].forEach(function(xx){ [-1.8,1.8].forEach(function(zz){ caja(.12,3.6,.12,AMARILLO,xx,1.8,zz,e); }); }); }
  if(k==='ptf'){ var of=new THREE.Group(); of.position.set(-A.w/2-4.8,0,A.d/2-5); g.add(of);
    caja(7,6,9,M(0x9ec5ff,{ roughness:.1, metalness:.3 }),0,3,0,of); caja(7.4,.4,9.4,M(0xf4f7fb),0,6.2,0,of); caja(7.2,.25,9.2,M(0xf4f7fb),0,3,0,of); }
  ETQ.push({ el:etiqueta('galpon', (k==='ptf'?'🏭 ':k==='bz'?'🏪 ':'📥 ')+A.n+' <small>'+A.sub+'</small>'), pos:new THREE.Vector3(A.x, A.h+5.5, A.z) });
}
['ptf','bz','im'].forEach(galpon);

/* ── la ciudad ── */
var COLS=[0xf1e3cf,0xdfe8f2,0xf4d7c9,0xd6e6d8,0xe8e1f2,0xf6efd9,0xcfdae7,0xf0d9e0], TOLDOS=[0xe23d3d,0x00a59e,0xf2b705,0x2f6fd6,0x7b3fb0];
var TOLDOM=TOLDOS.map(function(c){ return M(c); }), TANQUE=M(0x5d6b7c), AIRE=M(0xc5ced8);
/* lo que tapa: un edificio entre la cámara y una tienda o una fábrica queda bajito, más bajo cuanto más cerca, para ver y maniobrar */
var MIRAR=[];
function altoFrente(x,z,h){ var ux=.656, uz=.755;
  MIRAR.forEach(function(m){ var rx=x-m.x, rz=z-m.z, a=rx*ux+rz*uz, p=Math.abs(-rx*uz+rz*ux);
    if(a>-m.r*.5 && a<m.r*3.6 && p<m.r+16) h=Math.min(h, 3.5+Math.max(0,a-m.r*1.3)*.14+Math.max(0,p-m.r)*.25); });
  return h; }
function edificio(x,z,w,d,h){ h=altoFrente(x,z,h);
  bloqueFach(x,z,w,d,h,COLS[Math.floor(rnd()*COLS.length)]); caja(w+.3,.5,d+.3,TECHO2,x,h+.25,z);
  if(rnd()<.55) cil(.9,1.6,TANQUE,x+w/4,h+1.3,z-d/4,null,12);
  if(rnd()<.5) caja(2.2,1.2,1.6,AIRE,x-w/4,h+1.1,z+d/5);
  if(h>22 && rnd()<.6) caja(.15,6,.15,TANQUE,x,h+3.5,z);
  if(h<16 && rnd()<.7) caja(w*.86,.25,1.6,TOLDOM[Math.floor(rnd()*TOLDOM.length)],x,3.4,z+(EDIF_FRENTE||1)*(d/2+.8));
}
function cuadraEdif(x,z,w,d,h){ if(enTienda(x,z,w,d)) return; edificio(x,z,w,d,h); }
/* 🛣️ (13/10, dueño: «Santa Cruz es la ciudad de los anillos, se ve así desde arriba») los anillos alrededor de la plaza 24 de Septiembre y las
   avenidas que salen del centro hacia Banzer, PTF (Mutualista), Moreno (Virgen de Cotoca) y al oeste (Roca y Coronado). Escala de juguete: los
   radios esquivan las tiendas y los galpones (por donde pasaría, el anillo se corta). De noche brillan naranja, como en la foto desde el avión. */
var PLAZA={ x:-35, z:315 }, AN_HW=7, VIA_ON=false, VIA_ASF=Mbrilla(0x6c7a8e,0xb8701e), VIA_RAYA=M(0xf4f6f9), VIA_FOCO=Mbrilla(0xffe0b0,0xffa640), VIA_POSTE=M(0x5d6b7c);
/* (13/10, dueño: «las avenidas de los anillos se ven raro, no se integran con las calles; siguen su forma, como una ruta») los anillos son
   CALLES de la cuadrícula hechas avenida (camellón, faroles, rayas) alrededor de la plaza, con las esquinas redondeadas como en el mapa; las
   calles que llegan los cruzan como en cualquier esquina. Las avenidas que salen del centro también van por calles. */
var ANILLOS=[ { s:105, rc:35, n:'1er ANILLO' }, { s:175, rc:35, n:'2do ANILLO' }, { s:245, rc:35, n:'3er ANILLO' }, { s:315, rc:35, n:'4to ANILLO' } ], AV_RECTAS=[], AV_ARCOS=[];
ANILLOS.forEach(function(A, an){ var s=A.s, rc=A.rc, xa=PLAZA.x-s, xb=PLAZA.x+s, za=PLAZA.z-s, zb=PLAZA.z+s;
  AV_RECTAS.push({ eje:'x', c:za, a:xa+rc, b:xb-rc, an:an }, { eje:'x', c:zb, a:xa+rc, b:xb-rc, an:an }, { eje:'z', c:xa, a:za+rc, b:zb-rc, an:an }, { eje:'z', c:xb, a:za+rc, b:zb-rc, an:an });
  [[1,-1,0],[-1,-1,Math.PI/2],[-1,1,Math.PI],[1,1,Math.PI*1.5]].forEach(function(q){ AV_ARCOS.push({ x:PLAZA.x+q[0]*(s-rc), z:PLAZA.z+q[1]*(s-rc), r:rc, t0:q[2], an:an }); }); });
AV_RECTAS.push({ eje:'z', c:-70, a:Z0, b:PLAZA.z-105 }, { eje:'x', c:280, a:PLAZA.x+105, b:X1 }, { eje:'z', c:0, a:PLAZA.z+105, b:Z1 });   // hacia Banzer, hacia Moreno, hacia el Urubó y al sur
function viaLibre(x,z){ if(x<X0-RW/2||x>X1+RW/2||z<Z0-RW/2||z>Z1+RW/2) return false;
  for(var k in ALM){ var A=ALM[k]; if(Math.abs(x-A.bx)<G/2-2 && Math.abs(z-A.bz)<G/2-2) return false; }
  return !TIENDAS.some(function(t){ var dx=x-t.x, dz=z-t.z; return dx*dx+dz*dz<18*18; }); }
function enVia(x,z,rad){ for(var i=0;i<AV_ARCOS.length;i++){ var C=AV_ARCOS[i], dx=x-C.x, dz=z-C.z, d=Math.sqrt(dx*dx+dz*dz), t=Math.atan2(-dz,dx); if(t<0) t+=Math.PI*2;   // solo las curvas pisan manzanas: lo recto va por la calle
    var dt=t-C.t0; if(dt<-.1) dt+=Math.PI*2; if(dt<=Math.PI/2+.1 && Math.abs(d-C.r)<RW/2+rad) return true; } return false; }
function cuadraCruza(cx,cz){ var h=(G-RW)/2; for(var i=-2;i<=2;i++) for(var j=-2;j<=2;j++) if(enVia(cx+i*h/2, cz+j*h/2, 2)) return true; return false; }
function viaAdorno(x,z,i,conArbol){ if(i%2===0){ cil(.12,6.5,VIA_POSTE,x,3.25,z,EST,6); caja(.8,.3,.8,VIA_FOCO,x,6.6,z,EST,false); } else if(conArbol) arbol(x,z,1.2,EST); }
function viaTramos(n, libre){ var out=[], ini=-1; for(var i=0;i<=n;i++){ var ok=i<n && libre(i); if(ok && ini<0) ini=i; if(!ok && ini>=0){ out.push([ini,i-1]); ini=-1; } } return out; }
AV_RECTAS.forEach(function(R){ var a=Math.max(R.a, R.eje==='x'?X0-RW/2:Z0-RW/2), b=Math.min(R.b, R.eje==='x'?X1+RW/2:Z1+RW/2); if(b-a<2) return;
  var L=b-a, m=(a+b)/2, X=function(p){ return R.eje==='x'?p:R.c; }, Z=function(p){ return R.eje==='x'?R.c:p; };
  plano(R.eje==='x'?L:RW, R.eje==='x'?RW:L, X(m), Z(m), .06, VIA_ASF);
  var o0=R.eje==='x'?X0:Z0, cortes=[], p0=a;   // (13/10, dueño: «siguen habiendo líneas verdes entre los cruces») el camellón y las rayas se cortan en cada calle que cruza
  for(var gx=o0; gx<=b+G; gx+=G){ if(gx+RW/2+.5<=a || gx-RW/2-.5>=b) continue; if(gx-RW/2-.5>p0) cortes.push([p0, gx-RW/2-.5]); p0=gx+RW/2+.5; } if(b>p0) cortes.push([p0,b]);
  for(var gx2=o0; gx2<=b+G; gx2+=G){ if(gx2-RW/2<a || gx2+RW/2>b) continue; for(var pp=gx2-RW/2+.6; pp<gx2+RW/2-.4; pp+=2.2) [-1,1].forEach(function(sd){ var mm=pp+.6; plano(R.eje==='x'?1.2:.3, R.eje==='x'?.3:1.2, X(mm)+(R.eje==='x'?0:sd*(RW/2-.6)), Z(mm)+(R.eje==='x'?sd*(RW/2-.6):0), .068, VIA_RAYA); }); }   // (13/10, dueño: «faltan las líneas que siguen») en el cruce las rayas siguen punteadas
  cortes.forEach(function(c){ var l=c[1]-c[0], mm=(c[0]+c[1])/2; if(l<1) return; var c0=c[0]+(c[0]>a+.1?3:0), c1=c[1]-(c[1]<b-.1?3:0), lc=c1-c0, mc=(c0+c1)/2;   // (13/10, dueño) el camellón termina antes del paso de cebra
    if(lc>1) plano(R.eje==='x'?lc:1.4, R.eje==='x'?1.4:lc, X(mc), Z(mc), .07, PASTO);
    [-1,1].forEach(function(sd){ plano(R.eje==='x'?l:.3, R.eje==='x'?.3:l, X(mm)+(R.eje==='x'?0:sd*(RW/2-.6)), Z(mm)+(R.eje==='x'?sd*(RW/2-.6):0), .068, VIA_RAYA); }); });
  var arb=R.an!=null && R.an<2; for(var p=a+7, k=0; p<b-4; p+=7, k++){ var md=((p%G)+G)%G; if(md<8||md>G-8) continue; if(arb) viaAdorno(X(p), Z(p), k, true); else if(k%2===0) viaAdorno(X(p), Z(p), 0, false); } });   // (13/10, dueño) 1er y 2do anillo: árboles y luces en el camellón; 3ro y avenidas: solo luces   // faroles en el camellón, no en los cruces
AV_ARCOS.forEach(function(C, ci){ var n=Math.max(12, Math.round(C.r*Math.PI/2/2.5)), paso=Math.PI/2/n, px=function(i){ return C.x+C.r*Math.cos(C.t0+i*paso); }, pz=function(i){ return C.z-C.r*Math.sin(C.t0+i*paso); };
  viaTramos(n+1, function(i){ return viaLibre(px(i),pz(i)); }).forEach(function(T){ var t0=C.t0+T[0]*paso, tl=(T[1]-T[0])*paso; if(tl<=0) return;
    [[C.r-RW/2,C.r+RW/2,VIA_ASF,.06],[C.r-.7,C.r+.7,PASTO,.07],[C.r+RW/2-.75,C.r+RW/2-.45,VIA_RAYA,.068],[C.r-RW/2+.45,C.r-RW/2+.75,VIA_RAYA,.068]].forEach(function(q){
      var g=new THREE.RingGeometry(q[0], q[1], Math.max(4,T[1]-T[0]), 1, t0, tl); g.rotateX(-Math.PI/2); var m=new THREE.Mesh(g, q[2]); m.position.set(C.x,q[3],C.z); m.receiveShadow=true; EST.add(m); });
    for(var j=T[0]+2, k=0; j<=T[1]-2; j+=Math.max(2,Math.round(7/(C.r*paso))), k++) viaAdorno(px(j), pz(j), k, C.an<2); }); });
ANILLOS.forEach(function(A){ viaCartel(A.n, PLAZA.x-A.s-9, PLAZA.z+26); });
function viaCartel(txt, x, z){ var p=M(0x5d6b7c), sw=Math.max(9, txt.length*.62), hp=sw/2-1.1; caja(.25,5.4,.25,p,x-hp*.755,2.7,z+hp*.656); caja(.25,5.4,.25,p,x+hp*.755,2.7,z-hp*.656);
  var s=new THREE.Mesh(new THREE.PlaneGeometry(sw,2.2), new THREE.MeshBasicMaterial({ map:cartelTex(txt,'#0f6b3a','#ffffff',Math.round(512*sw/9),124), side:THREE.DoubleSide })); s.position.set(x,6.3,z); s.rotation.y=Math.atan2(80,92); EST.add(s); }
function palmera(x,z,h){ if(VIA_ON && enVia(x,z,1.5)) return; h=h||7+rnd()*3; cil(.22,h,Mc(0x9c8a6a),x,h/2,z,EST,6); var hoja=Mc(0x4e9a4f,{ flatShading:true });
  for(var i=0;i<7;i++){ var an=i/7*Math.PI*2+rnd()*.4, f=caja(.55,.12,3.4,hoja,x+Math.cos(an)*1.5,h-.1,z+Math.sin(an)*1.5); f.rotation.order='YXZ'; f.rotation.y=Math.PI/2-an; f.rotation.x=.42; } }
function colonial(x,z,w,d,rot){ var g=new THREE.Group(); g.position.set(x,0,z); g.rotation.y=rot||0; EST.add(g); var bl=Mc(0xf7f2e8), t=Mc([0xc0563a,0xb5502f,0xcc6a3c][Math.floor(rnd()*3)]), h=7.5, s=d/2+.9;   // casona blanca con teja y galería, como alrededor de la plaza
  bloqueFach(0,0,w,d,h,0xf7f2e8,g); var ta=caja(w+.4,.35,s,t,0,h+.75,-d/4,g); ta.rotation.x=-.5; var tb=caja(w+.4,.35,s,t,0,h+.75,d/4,g); tb.rotation.x=.5;
  caja(w-.6,3.4,.15,Mc(0x6b5d50),0,1.7,d/2+.08,g,false); caja(w+.2,.5,2.8,bl,0,3.85,d/2+1.3,g); for(var c=-w/2+.6; c<=w/2-.5; c+=2.3) caja(.45,3.6,.45,bl,c,1.8,d/2+2.4,g); }
function plazaPrincipal(cx,cz){ var a=G-RW, pie=Mc(0xe9dcc4), BR=Mc(0xc0683f), BRF=0xc0683f, BL=Mc(0xf3e6d4), OSC=Mc(0x3a2a22);   // (13/10, dueño, con fotos) la catedral de ladrillo con sus dos torres y la plaza 24 de Septiembre con palmeras
  plano(a,a,cx,cz,.04,pie);
  [[-1,1],[1,1],[-1,-1],[1,-1]].forEach(function(q){ plano(a/2-6,16,cx+q[0]*(a/4+1.5),cz+12+q[1]*10,.045,PASTO); });   // los cuatro jardines
  var cz0=cz-19;   // la catedral al fondo, mirando a la plaza (y a la cámara)
  caja(18,13,18,BR,cx,6.5,cz0-6); [-5,0,5].forEach(function(k){ [-1,1].forEach(function(sd){ caja(.25,3.4,1.6,OSC,cx+sd*9.05,7.5,cz0-6+k); }); });   // la nave, ladrillo liso con ventanas de arco
  var r1=caja(10.4,.4,19,Mc(0xb5502f),cx-4.6,15.1,cz0-6); r1.rotation.z=.46; var r2=caja(10.4,.4,19,Mc(0xb5502f),cx+4.6,15.1,cz0-6); r2.rotation.z=-.46;
  caja(24,16,4,BR,cx,8,cz0+5); [-6.5,6.5].forEach(function(dx){ caja(1.6,3,.25,OSC,cx+dx,10.5,cz0+7.1); }); caja(2.4,2.4,.25,OSC,cx,12.5,cz0+7.1); caja(10,5,3.8,BR,cx,18.5,cz0+5); caja(4.5,3,3.6,BR,cx,22.4,cz0+5); caja(24.6,.6,4.6,BL,cx,16.2,cz0+5);   // la fachada con su frontón
  caja(3.2,6.5,.3,OSC,cx,3.25,cz0+7.1); [-6.5,6.5].forEach(function(dx){ caja(2,4.6,.3,OSC,cx+dx,2.3,cz0+7.1); });   // las puertas
  [-12.5,12.5].forEach(function(dx){ var x=cx+dx, z=cz0+5;   // las dos torres con cúpula
    caja(7,22,7,BR,x,11,z); [[0,3.55,0],[3.55,0,Math.PI/2]].forEach(function(o){ [6.5,16.5].forEach(function(y){ caja(1.3,2.8,.25,OSC,x+o[0],y,z+o[1]).rotation.y=o[2]; }); }); caja(7.6,.6,7.6,BL,x,22.3,z); caja(7.4,.4,7.4,BL,x,11,z); caja(5.4,5.6,5.4,BR,x,25.4,z); caja(5.8,.5,5.8,BL,x,28.4,z);
    [[0,2.75,0],[2.75,0,Math.PI/2]].forEach(function(o){ caja(1.5,2.6,.25,OSC,x+o[0],25.6,z+o[1]).rotation.y=o[2]; });
    cil(2.3,1.6,BR,x,29.4,z,null,12); var cu=new THREE.Mesh(new THREE.SphereGeometry(2.5,14,8,0,Math.PI*2,0,Math.PI/2), Mc(0xb85a35)); cu.position.set(x,30.2,z); cu.castShadow=true; EST.add(cu);
    cil(.55,1.6,BL,x,33.4,z,null,8); caja(.18,1.6,.18,Mc(0xf2b705),x,35,z); caja(.9,.18,.18,Mc(0xf2b705),x,35.3,z); });
  cil(2.2,1.4,Mc(0xd9d2c4),cx,.7,cz+12,null,8); cil(.55,7,Mc(0xf3ede2),cx,4.8,cz+12,null,10); caja(1,1.8,.8,Mc(0x8a7a5a),cx,9.2,cz+12);   // el monumento del centro
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(q){ for(var i=0;i<2;i++) palmera(cx+q[0]*(6+i*8), cz+12+q[1]*(4+i*2.5)); arbol(cx+q[0]*22, cz+12+q[1]*12, 1.5, EST); });
  for(var p=-24;p<=24;p+=12){ palmera(cx+p, cz+28); palmera(cx-28, cz+p*.55+12); palmera(cx+28, cz+p*.55+12); }
  [[-9,4],[9,4],[-9,20],[9,20]].forEach(function(b){ caja(2.4,.5,.7,Mc(0x8a6a4b),cx+b[0],.5,cz+b[1]); }); }
/* 🌳 (13/10, dueño, con foto: «Equipetrol termina y empieza el borde ecológico y el río Piraí… y un puente que atraviesa el río simulando la
   entrada al Urubó»; «el puente que cruza al final de Equipetrol es el del Urubó, no el de la Roca y Coronado») al oeste: el cinturón
   ecológico, el río Piraí con su arenal, y la calle de Equipetrol (z = ZU) que sigue derecho, cruza el río por el PUENTE URUBÓ y llega al
   Urubó (condominios y torres del otro lado). El río corre en z, como el real (del suroeste al noreste). */
var BORDE_X=X0-RW/2-2, ZU=210;
function rioX(z){ return BORDE_X-150+16*Math.sin(z/95)+7*Math.sin(z/41); }
(function borde(){ var z0=Z0-60, z1=Z1+60, BOSQ=[Mc(0x3f7a3c,{ flatShading:true }),Mc(0x4c8a42,{ flatShading:true }),Mc(0x356b34,{ flatShading:true }),Mc(0x5a9a4a,{ flatShading:true })], ICO=new THREE.IcosahedronGeometry(1,0);
  var xr=rioX(ZU), urX0=xr-46, urX1=BORDE_X-420, claro=function(x,z){ return x<urX0 && x>urX1 && Math.abs(z-ZU)<62; };   // el Urubó: el claro del otro lado del río
  var copa=function(x,z,r){ if(Math.abs(z-ZU)<11 || claro(x,z)) return; var m=new THREE.Mesh(ICO, BOSQ[Math.floor(rnd()*BOSQ.length)]); m.scale.set(r,r*(.75+rnd()*.35),r); m.position.set(x,r*.75,z); m.rotation.y=rnd()*3; m.receiveShadow=true; EST.add(m); };
  plano(420,z1-z0,BORDE_X-210,(z0+z1)/2,.03,Mc(0x5f8f4e));   // el piso del bosque
  for(var z=z0; z<z1; z+=8.5) for(var x=BORDE_X-3; x>BORDE_X-420; x-=8.5){ var jx=x+(rnd()-.5)*5, jz=z+(rnd()-.5)*5; if(Math.abs(jx-rioX(jz))<40) continue; copa(jx,jz,3.4+rnd()*2.4); }
  var AR=Mc(0xdccaa0), AG=Mc(0x5d9bd0,{ roughness:.3 });
  for(var zr=z0; zr<z1; zr+=12){ var a=rioX(zr), b=rioX(zr+12), fi=Math.atan((b-a)/12);
    var s=plano(74,13,(a+b)/2,zr+6,.05,AR); s.rotation.z=fi;   // el arenal
    var w=plano(34+8*Math.sin(zr/53),13,(a+b)/2+5*Math.sin(zr/29),zr+6,.06,AG); w.rotation.z=fi; }   // el agua: es un río
  var xb0=xr+42, xb1=xr-42, gp=Mc(0xe3e8ee), bl=Mc(0xf7f9fc);
  [[BORDE_X,xb0],[xb1,urX1+10]].forEach(function(s){ var L=s[0]-s[1], m1=plano(L,AN_HW*2,(s[0]+s[1])/2,ZU,.061,VIA_ASF); var m2=plano(L,3,(s[0]+s[1])/2,ZU,.071,PASTO);
    for(var xx=s[0]-4; xx>s[1]+2; xx-=10) viaAdorno(xx, ZU, Math.round(xx/10), true); });
  var Lp=xb0-xb1+8, cx=(xb0+xb1)/2;   // el puente Urubó
  caja(Lp,1.2,AN_HW*2+1.6,gp,cx,2.6,ZU); caja(Lp,.1,AN_HW*2-.4,VIA_ASF,cx,3.25,ZU); caja(Lp,1.6,.3,PASTO,cx,3.3,ZU);
  [-1,1].forEach(function(sd){ caja(Lp,1,.35,bl,cx,3.8,ZU+sd*(AN_HW+.5)); });
  for(var k=0;k<=6;k++){ var px=xb0+4-k*Lp/6; caja(2.2,2.6,AN_HW*2,gp,px,1.3,ZU); if(k>0&&k<6){ caja(.3,7,.3,bl,px,7,ZU-AN_HW-.5); caja(.3,7,.3,bl,px,7,ZU+AN_HW+.5); caja(.9,.3,.9,VIA_FOCO,px,10.4,ZU-AN_HW-.5,EST,false); caja(.9,.3,.9,VIA_FOCO,px,10.4,ZU+AN_HW+.5,EST,false); } }
  [[urX0-14,ZU-30,14,13,4],[urX0-34,ZU-30,14,13,7],[urX0-54,ZU-32,14,13,4],[urX0-14,ZU+30,14,13,7],[urX0-34,ZU+30,14,13,4],[urX0-58,ZU+34,16,16,30],[urX0-80,ZU-36,16,16,24]].forEach(function(c,i){   // el Urubó: casas de condominio y torres
    if(c[4]>10) edificio(c[0],c[1],c[2],c[3],c[4]); else casa(c[0],c[1],[0xf7f3ea,0xf1e3cf,0xfaf7f0,0xf6efd9][i%4],[0xc0563a,0xb5502f,0xcc6a3c][i%3],c[1]<ZU?Math.PI:0,c[4]>5?2:1,c[2]-1,c[3]-1); });
  plano(urX0-urX1-10,120,(urX0+urX1)/2,ZU,.035,Mc(0xa9cf8f));   // el pasto del Urubó
  viaCartel('CINTURÓN ECOLÓGICO', BORDE_X-16, ZU-13); viaCartel('PUENTE URUBÓ · RÍO PIRAÍ', xb0+10, ZU-13); viaCartel('URUBÓ', urX0-4, ZU+13); })();
VIA_ON=true;
var PATIO=M(0xcfe3bf), LOTE=M(0xf1ede3), CASACOL=[0xf7f3ea,0xf1e3cf,0xf6efd9,0xfaf7f0,0xf4d7c9,0xdfe8f2,0xf0d9c4], TT=[0xc0563a,0xb5502f,0xcc6a3c,0xa9442e,0xd2734a,0x9a4a3a]; function zonaAlta(cx,cz){ var ex=(cx+330)/150, ez=(cz-200)/230, nx=(cx-70)/230, nz=(cz+140)/150; return Math.max(0,1-Math.sqrt(ex*ex+ez*ez), .5*(1-Math.sqrt(nx*nx+nz*nz))); }   /* Equipetrol: torres al oeste, pegadas al bosque (13/10, dueño) */   // (13/10, dueño: «se ve bruto y vacío, no como una ciudad mixta») cuadras llenas con patio al fondo; hacia el centro/Equipetrol más edificios, sueltos, nunca una pared
function lote(x,z,ww,dd,rot,za){ if(enTienda(x,z,ww,dd)) return; if(enVia(x,z,Math.max(ww,dd)*.5)){ if(!enVia(x,z,2)) arbol(x,z,1+rnd()*.4); return; }   // donde pasa la curva del anillo: un árbol, no un hueco
  var r=rnd(), de=Math.abs(Math.sin(rot))>.5; EDIF_FRENTE=Math.cos(rot)<-.5?-1:1; if(LOTE_COL && LOTE_FRENTE && r<.85){ colonial(x,z,(de?dd:ww)-.6,(de?ww:dd)-.6,rot); return; }
  if(r<.04+.26*za){ edificio(x,z,ww,dd,12+Math.floor(rnd()*(8+22*za))); return; }   // un edificio suelto entre las casas
  if(r<.11+.22*za){ edificio(x,z,ww,dd,rnd()<.55?3.8:7); return; }   // comercio de 1 o 2 pisos con su toldo, o casa de losa con tanque
  casa(x,z,CASACOL[Math.floor(rnd()*CASACOL.length)],TT[Math.floor(rnd()*TT.length)],rot,rnd()<.38?2:1,(de?dd:ww)-.6,(de?ww:dd)-.6); }   // casa de 1 o 2 pisos con techo de teja
var LOTE_COL=false, LOTE_FRENTE=false, EDIF_FRENTE=1, PASAJE=Mc(0x8f9db0); function cuadra(cx,cz){ LOTE_COL=Math.abs(cx-PLAZA.x)<=G && Math.abs(cz-PLAZA.z)<=G; var a=G-RW-2, x0=cx-a/2, za=zonaAlta(cx,cz), n=4, lw=a/n, fd=16, ad=a/2-fd-1;
  plano(a+2,a+2,cx,cz,.04,LOTE);   // (13/10, dueño: «detrás de las casas se ve vacío, parece un cuadrado dentro de otro cuadrado») un solo piso, sin el cuadrado de adentro
  var pas={}, r0=LOTE_COL?0:rnd(); if(r0>.25){ if(r0<.6) pas[2]=1; else if(r0<.85){ pas[1]=pas[3]=1; } else pas[1]=pas[2]=pas[3]=1; }   // (13/10, dueño: «me gusta la A, pero donde se pueda poné los pasajes para verlos desde arriba») de calle a calle, entre las casas; no en todas
  Object.keys(pas).forEach(function(k){ plano(4.8,a+2,x0+lw*k,cz,.05,PASAJE); plano(.25,a+2,x0+lw*k,cz,.052,VIA_RAYA); });
  var hor=!LOTE_COL && rnd()<.35; if(hor){ plano(a+2,4.8,cx,cz,.0505,PASAJE); plano(a+2,.25,cx,cz,.0525,VIA_RAYA); }   // (13/10, dueño: «todos son rectos hacia el norte, uno que otro horizontal») a veces también uno a lo largo, por el medio
  for(var j=0;j<2;j++) for(var i=0;i<n;i++){ var iz=pas[i]?2.6:1.1, de=pas[i+1]?2.6:1.1, ww=lw-iz-de, lx=x0+lw*i+iz+ww/2, sg=j===0?-1:1, fz=cz+sg*(a/2-1-fd/2), bz=cz+sg*(ad/2+.5+(hor?1.6:0)), adb=ad-(hor?3.2:0);   // dos filas, cada casa mirando a SU calle
    LOTE_FRENTE=true; var rk=RESTO_EN[cx+','+cz]; if(rk && rk[0]===i && rk[1]===j && !enTienda(lx,fz,ww,fd) && !enVia(lx,fz,Math.max(ww,fd)*.5)) restaurante(lx, fz, rk[3]!=null?fd:ww, rk[3]!=null?ww:fd, rk[3]!=null?rk[3]:(j===0?Math.PI:0), rk[2]); else lote(lx, fz, ww, fd, j===0?Math.PI:0, za);
    if(!enTienda(lx,bz,ww,adb) && !enVia(lx,bz,Math.max(lw,adb)*.5)) fondo(lx,bz,ww-1.2,adb);   // y su construcción del fondo hasta el medio: no queda vacío
    if(i<n-1 && !pas[i+1] && rnd()<.35) arbol(x0+lw*(i+1), fz+sg*(fd/2-1.5), .8+rnd()*.35); }   // algún árbol en la vereda, entre casa y casa (no en un pasaje)
  LOTE_COL=LOTE_FRENTE=false; EDIF_FRENTE=1; }
/* 🍔 (13/10, dueño: «en algunos lugares poné un Burger King, y algunos restaurantes repartidos: Hot Burger, KFC, Pollos Luisín, etc.») */
var RESTOS={ bk:{ n:'BURGER KING', f:'#f5ebdc', l:'#d62300', pared:0xf5ebdc, borde:0xd62300, toldo:0x502314 },
  kfc:{ n:'KFC', f:'#e4002b', l:'#ffffff', pared:0xffffff, borde:0xe4002b, toldo:0xe4002b, rayas:1 },
  hot:{ n:'HOT BURGER', f:'#e23d3d', l:'#ffd400', pared:0xfff3d6, borde:0xe23d3d, toldo:0xffd400 },
  luisin:{ n:'POLLOS LUISÍN', f:'#f28c00', l:'#ffffff', pared:0xfff1d6, borde:0xf28c00, toldo:0xc0563a },
  kiky:{ n:'POLLOS KIKY', f:'#ffd400', l:'#c8102e', pared:0xfffbe6, borde:0xc8102e, toldo:0xc8102e } };
var RESTO_EN={ '-105,35':[0,0,'bk'], '175,385':[2,1,'bk'], '35,175':[1,1,'kfc'], '-315,385':[2,1,'kfc'], '-245,245':[3,1,'hot'], '245,455':[1,1,'luisin'], '-175,525':[2,1,'kiky'], '105,595':[1,1,'hot'] };   // manzana: [casa, fila, marca, giro]; (13/10, dueño) el BK en la esquina de arriba a la izquierda de la manzana donde estaba la obra, frente a Banzer; la obra se fue al este, fuera del 4to anillo
function restaurante(x,z,w,d,rot,k){ var R=RESTOS[k], g=new THREE.Group(); g.position.set(x,0,z); g.rotation.y=rot; EST.add(g); var bd=d-5, bz=-2.5;
  bloqueFach(0,bz,w,bd,4.4,R.pared,g); caja(w+.5,.9,bd+.5,Mc(R.borde),0,4.75,bz,g); caja(w-.5,.1,bd-.5,TECHO2,0,5.22,bz,g,false); caja(2.2,1,1.6,Mc(0xc5ced8),-w/4,5.7,bz-bd/5,g);   // el local con su franja de color
  if(R.rayas) for(var r=-w/2+.6;r<w/2;r+=1.6) caja(.8,.92,.1,Mc(0xffffff),r,4.75,bz+bd/2+.3,g,false);   // las rayas rojas y blancas
  caja(w*.86,.25,2.2,Mc(R.toldo),0,3.3,bz+bd/2+1.1,g);
  var fr=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w*.9,R.n.length*1.05+2.5),1.3), new THREE.MeshBasicMaterial({ map:cartelTex(R.n,R.f,R.l,1024,150) })); fr.position.set(0,4.75,bz+bd/2+.32); g.add(fr);   // el nombre en el frente
  [[-w/4,d/2-1.5],[w/4,d/2-1.5]].forEach(function(m){ cil(.7,.12,Mc(0xffffff),m[0],1,m[1],g,10); cil(.08,1,Mc(0x5d6b7c),m[0],.5,m[1],g,6); var u=new THREE.Mesh(new THREE.ConeGeometry(1.6,.7,8), Mc(R.borde)); u.position.set(m[0],2.6,m[1]); g.add(u); cil(.05,2.3,Mc(0x5d6b7c),m[0],1.4,m[1],g,6); });   // mesas con sombrilla afuera
  var lx=w/2-1, lz=d/2-.5, c=Math.cos(rot), s2=Math.sin(rot), px=x+lx*c+lz*s2, pz=z-lx*s2+lz*c, sw=Math.max(5.5,R.n.length*.6);   // el cartel alto en el poste, mirando a la cámara
  cil(.18,10,Mc(0x5d6b7c),px,5,pz,null,8);
  var cart=new THREE.Mesh(new THREE.PlaneGeometry(sw,2.4), new THREE.MeshBasicMaterial({ map:cartelTex(R.n,R.f,R.l,Math.round(256*sw/2.4),256), side:THREE.DoubleSide })); cart.position.set(px,10.6,pz); cart.rotation.y=Math.atan2(80,92); EST.add(cart);
  caja(sw+.3,2.7,.25,Mc(0x3d4752),px-.14*Math.sin(Math.atan2(80,92)),10.6,pz-.14*Math.cos(Math.atan2(80,92))).rotation.y=Math.atan2(80,92); }
/* 🛒 (13/10, dueño, marcado en su captura: «ahí colocá un Hipermaxi, un supermercado con su parqueo; como referencia, cruzás el 4to anillo y
   entrás al puente del Urubó») en la manzana pegada al 4to anillo y a la calle que va al puente. */
function hipermaxi(cx,cz){ var a=G-RW, ROJO=Mc(0xd7261e), AM=Mc(0xffc20e), bw=a-6, bd=22, bz=cz-a/2+3+bd/2, ra=VIA_RAYA;
  plano(a,a,cx,cz,.04,LOTE); plano(a-3,a-3,cx,cz,.045,Mc(0x8f9bab));   // el parqueo
  bloqueFach(cx,bz,bw,bd,8,0xf4f6f9); caja(bw+.6,1.5,bd+.6,ROJO,cx,8.6,bz); caja(bw+.62,.45,bd+.62,AM,cx,7.65,bz); caja(bw-.6,.1,bd-.6,TECHO2,cx,9.4,bz,null,false);
  [-bw/4,bw/4].forEach(function(dx){ caja(3,1.4,2.2,Mc(0xc5ced8),cx+dx,10.1,bz-3); });
  caja(12,4.2,.3,Mc(0x8fb8d8,{ roughness:.15, metalness:.2 }),cx,2.1,bz+bd/2+.12,null,false); caja(16,.4,3.2,ROJO,cx,4.5,bz+bd/2+1.6);   // la entrada vidriada con su alero
  var fr=new THREE.Mesh(new THREE.PlaneGeometry(22,3.2), new THREE.MeshBasicMaterial({ map:cartelTex('HIPERMAXI','#d7261e','#ffffff',1024,150) })); fr.position.set(cx,6.3,bz+bd/2+.35); EST.add(fr);
  var p0=bz+bd/2+5, cols=[0xe23d3d,0xffffff,0x2f6fd6,0x1f2937,0xc0c7d1,0x15803d,0xf2b705];
  [p0+5, p0+16].forEach(function(zr, r){ for(var k=-a/2+4; k<a/2-3; k+=3.4){ plano(.25,5.2,cx+k,zr,.05,ra); var kk=k+1.7; if(kk<a/2-3 && rnd()<.55) autoQuieto(cx+kk, zr+(r?.4:-.4), Math.PI/2, cols[Math.floor(rnd()*cols.length)]); } });   // cajones y autos estacionados
  plano(a-6,.3,cx,p0+10.5,.05,ra);
  for(var c=0;c<4;c++){ caja(1.1,.9,.8,Mc(0xd7261e),cx-a/2+3+c*1.25,.55,p0+.8); }   // carritos
  var px=cx+a/2-4, pz=cz+a/2-3, sw=7; cil(.22,12,Mc(0x5d6b7c),px,6,pz,null,8);   // el cartel alto, mirando a la cámara
  var cart=new THREE.Mesh(new THREE.PlaneGeometry(sw,2.6), new THREE.MeshBasicMaterial({ map:cartelTex('HIPERMAXI','#d7261e','#ffffff',700,260), side:THREE.DoubleSide })); cart.position.set(px,12.6,pz); cart.rotation.y=Math.atan2(80,92); EST.add(cart);
  for(var t=-a/2+3; t<a/2; t+=9){ arbol(cx+t, cz+a/2-1.2, .9); } }
function fondo(x,z,w,d){ var r=rnd();
  if(r<.55){ bloqueFach(x,z,w,d,3.4,CASACOL[Math.floor(rnd()*CASACOL.length)]); caja(w+.3,.4,d+.3,TECHO2,x,3.6,z); if(rnd()<.4) cil(.8,1.4,TANQUE,x,4.5,z,null,10); }
  else if(r<.85){ bloqueFach(x,z,w,d,3.2,0xf1e3cf); caja(w+.4,.3,d+.4,Mc(TT[Math.floor(rnd()*TT.length)]),x,3.45,z); }
  else { bloqueFach(x,z,w,d,6.2,CASACOL[Math.floor(rnd()*CASACOL.length)]); caja(w+.3,.4,d+.3,TECHO2,x,6.4,z); cil(.9,1.6,TANQUE,x,7.4,z,null,12); } }
function casa(x,z,col,techo,rot,pisos,w,d){ w=w||7; d=d||6; if(!PRISMA){ PRISMA=new THREE.CylinderGeometry(1,1,1,3); PRISMA.rotateX(-Math.PI/2); PUERTA=Mc(0x5b4636); VIDRIO_B=Mc(0xf4f6f9); } var h=pisos===2?7:4, g=new THREE.Group(); g.position.set(x,0,z); g.rotation.y=rot||0; EST.add(g); bloqueFach(0,0,w,d,h,col,g);   // (13/10, dueño: «las casas están de costado, su frente está de costado») el triángulo del techo, la puerta y el alero miran a la calle
  var t=Mc(techo), s=w/2+.9, ta=caja(s,.35,d+.7,t,-w/4,h+.75,0,g); ta.rotation.z=.55; var tb=caja(s,.35,d+.7,t,w/4,h+.75,0,g); tb.rotation.z=-.55;
  var hg=.45+.26*s, pr=new THREE.Mesh(PRISMA, Mc(col)); pr.scale.set(w/1.732, hg/1.5, d); pr.position.set(0,h+hg/3,0); pr.castShadow=true; g.add(pr);
  caja(1.7,2.9,.15,PUERTA,0,1.45,d/2+.08,g,false); caja(3.6,.18,1.4,t,0,3.25,d/2+.7,g);
  if(pisos===2){ caja(w*.6,.22,1.3,VIDRIO_B,0,4.35,d/2+.65,g); caja(w*.6,.8,.12,VIDRIO_B,0,4.85,d/2+1.25,g,false); } }
function parque(cx,cz){ plano(G-RW,G-RW,cx,cz,.04,PASTO); plano(G-RW,3,cx,cz,.05,Mc(0xe8dcc0)); plano(3,G-RW,cx,cz,.05,Mc(0xe8dcc0));
  cil(4,.6,Mc(0xcfd8e3),cx,.3,cz,null,32); cil(3.3,.2,Mbrilla(0x7fc4ec,0x7fc4ec),cx,.65,cz,null,32); cil(.4,2.6,Mc(0xcfd8e3),cx,1.3,cz,null,12);
  for(var t=0;t<26;t++){ var ax=cx-28+rnd()*56, az=cz-28+rnd()*56; if(Math.abs(ax-cx)<3||Math.abs(az-cz)<3) continue; arbol(ax,az,1.1+rnd()*.7); }
  [[-6,-3],[6,-3],[-6,3],[6,3]].forEach(function(b){ caja(2.4,.5,.7,Mc(0x8a6a4b),cx+b[0],.5,cz+b[1]); }); }
function surtidor(cx,cz){ plano(G-RW,G-RW,cx,cz,.04,HORM); var col=M(0xe23d3d);
  [-8,8].forEach(function(dx){ [-6,6].forEach(function(dz){ caja(.5,5,.5,M(0xdfe6ee),cx+dx,2.5,cz+dz); }); });
  caja(22,1,16,M(0xffffff),cx,5.5,cz); caja(22.2,.4,16.2,col,cx,5,cz);
  for(var i=-1;i<=1;i++) for(var j=-1;j<=1;j+=2){ caja(1,1.8,.7,M(0xf4f7fb),cx+i*6,.9,cz+j*3); caja(1.05,.4,.75,col,cx+i*6,1.6,cz+j*3); }
  bloqueFach(cx,cz-18,18,9,5,0xf6efd9); var c2=new THREE.Mesh(new THREE.PlaneGeometry(10,1.6), new THREE.MeshBasicMaterial({ map:cartelTex('SURTIDOR','#e23d3d','#ffffff',512,90) })); c2.position.set(cx,4.2,cz-13.4); EST.add(c2);
  luz(cx,4.6,cz,0xffffff,1.2,20); }
function escuela(cx,cz){ plano(G-RW,G-RW,cx,cz,.04,VER); bloqueFach(cx-10,cz-14,34,12,9,0xf6efd9);
  plano(26,16,cx+6,cz+12,.05,M(0x2f9e74)); plano(.3,16,cx+6,cz+12,.06,BLANCO); plano(26,.3,cx+6,cz+4.2,.06,BLANCO); plano(26,.3,cx+6,cz+19.8,.06,BLANCO);
  [cx-6.5,cx+18.5].forEach(function(x){ caja(.2,3.2,.2,BLANCO,x,1.6,cz+12); caja(.1,1,1.4,BLANCO,x,3.4,cz+12); });
  for(var t=0;t<6;t++) arbol(cx-26+t*3.5,cz+26,.9); }
function iglesia(cx,cz){ plano(G-RW,G-RW,cx,cz,.04,M(0xe8dcc0)); var bl=0xf4ede0;
  bloqueFach(cx,cz-8,14,22,10,bl); var t=M(0xb24a3a); var a=caja(15,.4,8.2,t,cx,11.6,cz-11.5); a.rotation.x=-.6; var b=caja(15,.4,8.2,t,cx,11.6,cz-4.5); b.rotation.x=.6;
  bloqueFach(cx,cz+5,6,6,20,bl); var cono=new THREE.Mesh(new THREE.ConeGeometry(4.3,7,4), t); cono.position.set(cx,23.5,cz+5); cono.rotation.y=Math.PI/4; cono.castShadow=true; EST.add(cono);
  caja(.25,2.4,.25,M(0xf2b705),cx,28,cz+5); caja(1.4,.25,.25,M(0xf2b705),cx,28.4,cz+5);
  for(var t2=0;t2<14;t2++) arbol(cx-24+rnd()*48, cz+12+rnd()*14, 1); }
var GRUA=null;
function obra(cx,cz){ plano(G-RW,G-RW,cx,cz,.04,M(0xd9c7a3)); var gris=M(0xb7c2cf), am=M(0xf2b705);
  for(var p=0;p<5;p++){ caja(26,.5,18,gris,cx-6,p*3.6+.25,cz); [-1,1].forEach(function(sx){ [-1,1].forEach(function(sz){ caja(.6,3.6,.6,gris,cx-6+sx*12,p*3.6+2,cz+sz*8); }); }); }
  caja(1.2,34,1.2,am,cx+14,17,cz-8); GRUA=new THREE.Group(); GRUA.position.set(cx+14,34,cz-8); esc.add(GRUA);
  caja(34,1,1,am,8,0,0,GRUA,true); caja(4,2,2,M(0x5d6b7c),-8,-.2,0,GRUA,true); var cable=caja(.08,12,.08,M(0x1c242c),20,-6,0,GRUA,false); caja(1.7,.8,1.2,matCol[0],20,-12.4,0,GRUA,true);
  for(var i=0;i<4;i++) pallet(null,3,cx+18+i*2,0,cz+16); }
function barrio(cx,cz){ plano(G-RW,G-RW,cx,cz,.04,VER); for(var i=0;i<3;i++){ casa(cx-20+i*14, cz-16, COLS[(i+2)%COLS.length], [0xc0563a,0x9a4a3a,0x6b7d8f][i%3], 0); edificio(cx-20+i*14, cz+12, 10, 9, 5+Math.floor(rnd()*5)); arbol(cx-13+i*14, cz-4, .8); } kiosco(cx+22, cz-2, 0xf2b705); } function casas(cx,cz){ plano(G-RW,G-RW,cx,cz,.04,M(0xc7deb8)); var tt=[0xc0563a,0x9a4a3a,0x6b7d8f];
  for(var i=0;i<4;i++) for(var j=0;j<3;j++){ casa(cx-21+i*14, cz-18+j*17, COLS[(i+j)%COLS.length], tt[(i+j)%3], j%2?Math.PI:0); arbol(cx-16+i*14, cz-14+j*17, .8); } }
var ESPECIAL={ '-315,175':hipermaxi, '35,105':parque, '105,35':surtidor, '-35,35':escuela, '105,-35':iglesia, '-105,35':cuadra, '315,385':obra, '385,385':fidalga, '-175,35':cuadra, '-175,-35':cuadra, '245,35':cuadra };
TIENDAS.forEach(function(t){ MIRAR.push({ x:t.x, z:t.z, r:15 }); }); Object.keys(ALM).forEach(function(k){ var A=ALM[k]; MIRAR.push({ x:A.x, z:A.fz+6, r:Math.max(A.w,A.d)*.75+6 }); });
for(var bi=-5; bi<=5; bi++) for(var bj=-3; bj<=9; bj++){ var cx=35+bi*G, cz=35+bj*G, key=cx+','+cz, fe=ESPECIAL[key]||(bj>=4&&((bi*3+bj+40)%7===0)?parque:null);
  if((cx===ALM.ptf.bx&&cz===ALM.ptf.bz)||(cx===ALM.bz.bx&&cz===ALM.bz.bz)||(cx===ALM.im.bx&&cz===ALM.im.bz)) continue;
  if(cx===PLAZA.x&&cz===PLAZA.z) plazaPrincipal(cx,cz); else if(fe && !cuadraCruza(cx,cz)) fe(cx,cz); else cuadra(cx,cz); }
/* 🏪 las tiendas Heaven y Sueña, con su vidriera, su toldo y su cartel; ahí llegan las reposiciones (RPT) */
TIENDAS.forEach(function(t){ var g=new THREE.Group(); g.position.set(t.x,0,t.z); g.rotation.y=t.lado>0?Math.PI:0; EST.add(g);
  var hv=t.marca==='heaven', col=hv?0x14243a:0xf5c400, blanco=M(0xf7f9fc);
  caja(15,6.5,10,blanco,0,3.25,0,g); caja(15.4,.5,10.4,M(col),0,6.75,0,g);
  caja(13,3.6,.15,M(0x9ec5ff,{ roughness:.08, metalness:.35 }),0,2.2,5.05,g); [-3.5,0,3.5].forEach(function(dx){ caja(2.6,.35,1.8,matCol[0],dx,1.2,3.6,g); caja(2.62,.07,1.82,banda,dx,1.2,3.6,g); });
  caja(14,.25,2.4,M(hv?0x2f6fd6:0xf5c400),0,4.6,6.1,g);
  var cart=new THREE.Mesh(new THREE.PlaneGeometry(13,1.7), new THREE.MeshBasicMaterial({ map:cartelTex(hv?'HEAVEN COLCHONES':'SUEÑA COLCHONES', hv?'#14243a':'#f5c400', hv?'#ffffff':'#14243a',1024,134) }));
  cart.position.set(0,5.7,5.08); g.add(cart);
  var nom=new THREE.Mesh(new THREE.PlaneGeometry(5,.8), new THREE.MeshBasicMaterial({ map:cartelTex('Tienda '+t.n,'#ffffff','#14243a',640,102) })); nom.position.set(0,4.15,5.1); g.add(nom);
  ETQ.push({ el:etiqueta('tienda '+(hv?'hv':'su'), (hv?'🛏️ HEAVEN':'💛 SUEÑA')+' · '+t.n), pos:new THREE.Vector3(t.x,9.5,t.z) }); });

/* carteles de las marcas, semáforos y faroles */
function cartelRuta(x,z,txt,fondo,letra){ var g=new THREE.Group(); g.position.set(x,0,z); EST.add(g); [-3.2,3.2].forEach(function(dx){ caja(.35,7,.35,M(0x5d6b7c),dx,3.5,0,g); });
  var p=new THREE.Mesh(new THREE.BoxGeometry(10,3.6,.3),[M(0xdfe6ee),M(0xdfe6ee),M(0xdfe6ee),M(0xdfe6ee),new THREE.MeshBasicMaterial({ map:cartelTex(txt,fondo,letra,1024,370) }),M(0xdfe6ee)]);
  p.position.y=8.2; p.castShadow=true; g.add(p); }
cartelRuta(60,77,'HEAVEN COLCHONES','#14243a','#ffffff'); cartelRuta(-60,-63,'SUEÑA COLCHONES','#f5c400','#14243a'); cartelRuta(150,7,'HEAVEN COLCHONES','#14243a','#ffffff');
var SEMAFOROS=[], CEBRAS=[[70,70],[0,70],[0,-70],[-70,-70],[140,0],[210,0],[70,0]];
CEBRAS.forEach(function(q){ var d=RW/2+1.8, CB=Mc(0xf7f9fc);   // (13/10, dueño: «pasos de cebra donde pusiste semáforos, gente cruzando ahí») uno en cada brazo del cruce
  for(var k=-3.6;k<=3.61;k+=1.2){ plano(2.6,.6,q[0]+d,q[1]+k,.08,CB); plano(2.6,.6,q[0]-d,q[1]+k,.08,CB); plano(.6,2.6,q[0]+k,q[1]+d,.08,CB); plano(.6,2.6,q[0]+k,q[1]-d,.08,CB); } });
[[70,70],[0,70],[0,-70],[-70,-70],[140,0],[210,0],[70,0]].forEach(function(q,i){ var g=new THREE.Group(); g.position.set(q[0]+6,0,q[1]+6); EST.add(g); cil(.15,5,M(0x3d4752),0,2.5,0,g,8);
  caja(.6,1.6,.5,M(0x1c242c),0,5.3,0,g); var ro=M(0x3a1515), ve=M(0x153a20); ro.emissive=lin(0xff2a2a); ve.emissive=lin(0x22e06a);
  caja(.3,.3,.1,ro,0,5.75,.27,g,false); caja(.3,.3,.1,ve,0,4.85,.27,g,false); SEMAFOROS.push({ ro:ro, ve:ve, f:i%2 }); });
var FOCO=Mbrilla(0xdfe6ee,0xfff1b8), FAROL=M(0x5d6b7c);
for(var fx=X0; fx<=X1; fx+=G) for(var fz=Z0; fz<=Z1; fz+=G){ if(enVia(fx-6.5,fz-6.5,1)) continue; var g2=new THREE.Group(); g2.position.set(fx-6.5,0,fz-6.5); EST.add(g2);
  cil(.14,7,FAROL,0,3.5,0,g2,8); caja(2,.14,.14,FAROL,.9,6.95,0,g2); caja(.7,.22,.45,FOCO,1.7,6.8,0,g2,false); }
['ptf','bz','im'].forEach(function(k){ var A=ALM[k]; luz(A.x-20,6,A.fila-6,0xffe2a0,1.4,20); luz(A.x+20,6,A.fila-6,0xffe2a0,1.4,20); });
for(var ax=X0; ax<X1; ax+=12){ if(Math.abs(((ax%G)+G)%G)<8||Math.abs(((ax%G)+G)%G)>62) continue; arbol(ax,G+6.5,.8); arbol(ax,-G+6.5,.8); }

/* ── más ciudad: autos estacionados, paradas de micro, kioscos, banderas de Bolivia en cada predio, árboles en todas las veredas ── */
var ACOL=[0xe23d3d,0xffffff,0x2f6fd6,0x1f2937,0xf2b705,0x9aa8b8,0x15803d,0xc0c7d1];
function autoQuieto(x,z,rot,col){ var g=new THREE.Group(); g.position.set(x,0,z); g.rotation.y=rot; EST.add(g); var c=M(col,{ roughness:.35 });
  caja(4,1,1.9,c,0,.85,0,g); caja(2,.75,1.7,M(0x9ec5ff,{ roughness:.1, metalness:.3 }),-.2,1.7,0,g); var ne=M(0x1c242c);
  [[1.2,.95],[-1.2,.95],[1.2,-.95],[-1.2,-.95]].forEach(function(r){ var w=cil(.4,.3,ne,r[0],.4,r[1],g,10); w.rotation.x=Math.PI/2; }); }
for(var pr=Z0; pr<=Z1; pr+=G) for(var px=X0+12; px<X1-8; px+=9){ if(rnd()<.62||enVia(px,pr,4)) continue; var lado=rnd()<.5?1:-1; autoQuieto(px,pr+lado*4.2,0,ACOL[Math.floor(rnd()*ACOL.length)]); }
for(var pc=X0; pc<=X1; pc+=G) for(var pz=Z0+12; pz<Z1-8; pz+=9){ if(rnd()<.7||enVia(pc,pz,4)) continue; var lado2=rnd()<.5?1:-1; autoQuieto(pc+lado2*4.2,pz,Math.PI/2,ACOL[Math.floor(rnd()*ACOL.length)]); }
function parada(x,z,rot){ var g=new THREE.Group(); g.position.set(x,0,z); g.rotation.y=rot||0; EST.add(g); var gris=M(0x5d6b7c);
  caja(4.4,.18,1.8,M(0x00a59e),0,2.8,0,g); caja(4.2,2.2,.1,M(0xbfe3ff,{ roughness:.1, metalness:.2 }),0,1.6,-.8,g); [-2,2].forEach(function(dx){ caja(.12,2.8,.12,gris,dx,1.4,-.8,g); });
  caja(3.4,.15,.6,M(0x8a6a4b),0,.7,-.4,g); caja(.5,.5,.12,M(0xf2b705),2.4,2.4,0,g); }
[[60,63.2],[-20,63.2],[130,-6.8],[-90,-76.8],[200,-76.8],[20,-136.8]].forEach(function(q){ parada(q[0],q[1],0); });
function kiosco(x,z,col){ caja(2.2,1.6,1.6,Mc(0xf4f7fb),x,.8,z); caja(2.4,.12,1.8,Mc(0x8a6a4b),x,1.62,z); var u=new THREE.Mesh(new THREE.ConeGeometry(2.2,1,10), Mc(col)); u.position.set(x,3.2,z); u.castShadow=true; EST.add(u); cil(.06,2.2,Mc(0x5d6b7c),x,2,z,null,6); }
kiosco(8,78,0xe23d3d); kiosco(-30,78,0xf2b705); kiosco(-62,64,0x2f6fd6); kiosco(132,64,0x15803d); kiosco(-12,-6,0xe23d3d);
var BANDERA=lienzo(192,128,function(g){ g.fillStyle='#d52b1e'; g.fillRect(0,0,192,43); g.fillStyle='#f9e300'; g.fillRect(0,43,192,42); g.fillStyle='#007934'; g.fillRect(0,85,192,43); });
function bandera(x,z){ cil(.12,9,M(0xdfe6ee),x,4.5,z,null,8); var b=new THREE.Mesh(new THREE.PlaneGeometry(3,2), new THREE.MeshBasicMaterial({ map:BANDERA, side:THREE.DoubleSide })); b.position.set(x+1.5,8,z); EST.add(b); }
['ptf','bz','im'].forEach(function(k){ var A=ALM[k]; bandera(A.bx-G/2+RW/2+6, A.bz+G/2-RW/2-3); });
for(var tr=Z0; tr<=Z1; tr+=G){ if(tr===G||tr===-G) continue; for(var tx=X0+6; tx<X1; tx+=14){ if(Math.abs(((tx%G)+G)%G)<9||Math.abs(((tx%G)+G)%G)>61) continue; if(rnd()<.5) arbol(tx,tr+6.6,.75); if(rnd()<.35) arbol(tx+5,tr-6.6,.75); } }

/* 🎃 octubre */
var OCTUBRE=new Date(Date.now()-4*3600e3).getUTCMonth()===9;
if(OCTUBRE){ var calab=Mbrilla(0xe8731a,0xff7a00), tallo=M(0x3f7d3a);
  ['ptf','bz','im'].forEach(function(k){ var A=ALM[k]; [-1,1].forEach(function(s){ var x=A.x+s*(A.w/2+1.6), z=A.fz+2.5;
    var c=new THREE.Mesh(new THREE.SphereGeometry(.8,16,12), calab); c.scale.y=.75; c.position.set(x,.6,z); c.castShadow=true; EST.add(c); cil(.1,.38,tallo,x,1.25,z,null,6); }); }); }

/* ── juntar todo lo quieto por material: miles de piezas, pocas llamadas de dibujo ── */
(function juntar(){
  esc.add(EST); EST.updateMatrixWorld(true);
  var B={}, sueltos=[]; EST.traverse(function(o){ if(!o.isMesh) return; if(Array.isArray(o.material)){ sueltos.push(o); return; } var k=o.material.uuid; (B[k]=B[k]||{ m:o.material, l:[] }).l.push(o); });
  sueltos.forEach(function(o){ esc.attach(o); });
  Object.keys(B).forEach(function(k){ var L=B[k].l, nv=0, ni=0;
    L.forEach(function(o){ var g=o.geometry; nv+=g.attributes.position.count; ni+=g.index?g.index.count:g.attributes.position.count; });
    var P=new Float32Array(nv*3), N=new Float32Array(nv*3), U=new Float32Array(nv*2), I=new Uint32Array(ni), ov=0, oi=0, v=new THREE.Vector3(), nm=new THREE.Matrix3();
    L.forEach(function(o){ var g=o.geometry, p=g.attributes.position, n=g.attributes.normal, u=g.attributes.uv; nm.getNormalMatrix(o.matrixWorld);
      for(var i=0;i<p.count;i++){ v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld); P[(ov+i)*3]=v.x; P[(ov+i)*3+1]=v.y; P[(ov+i)*3+2]=v.z;
        v.fromBufferAttribute(n,i).applyMatrix3(nm).normalize(); N[(ov+i)*3]=v.x; N[(ov+i)*3+1]=v.y; N[(ov+i)*3+2]=v.z;
        U[(ov+i)*2]=u?u.getX(i):0; U[(ov+i)*2+1]=u?u.getY(i):0; }
      if(g.index){ for(var j=0;j<g.index.count;j++) I[oi+j]=g.index.getX(j)+ov; oi+=g.index.count; } else { for(var j2=0;j2<p.count;j2++) I[oi+j2]=ov+j2; oi+=p.count; }
      ov+=p.count; });
    var geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(P,3)); geo.setAttribute('normal',new THREE.BufferAttribute(N,3)); geo.setAttribute('uv',new THREE.BufferAttribute(U,2)); geo.setIndex(new THREE.BufferAttribute(I,1));
    var mm=new THREE.Mesh(geo,B[k].m); mm.castShadow=L.some(function(o){ return o.castShadow; }); mm.receiveShadow=true; esc.add(mm); });
  esc.remove(EST);
})();
/* ═════════ lo que se mueve ═════════ */
var VIVO=esc;
function cajaV(w,h,d,mat,x,y,z,g,sombra){ return caja(w,h,d,mat,x,y,z,g||VIVO,sombra); }
function cilV(r,h,mat,x,y,z,g,seg){ return cil(r,h,mat,x,y,z,g||VIVO,seg); }
function palletV(g,n,x,y,z){ return pallet(g||VIVO,n,x,y,z); }

/* autos y micros por todas las calles */
var AUTOS=[], AC=[0xe23d3d,0xffffff,0x2f6fd6,0x1f2937,0xf2b705,0x9aa8b8,0x15803d,0xc0c7d1,0x7b3fb0];
/* 🚦 (13/10, dueño: «autos detenidos en los semáforos, adelante un micro, los autos puteando al micrero, y luego se mueven y siguen su curso»)
   tres colas en cruces con semáforo: el micro adelante, tres autos atrás. En rojo esperan antes del paso de cebra; en verde el micrero se queda
   pensando, le tocan bocina y lo putean, y recién arranca; pasan y se pierden a media cuadra, y vuelven a llegar al semáforo en el próximo rojo. */
var COLAS=[ { si:0, x:70, z:70, eje:'x', s:1, mc:0xf2b705 }, { si:2, x:0, z:-70, eje:'z', s:1, mc:0x15803d }, { si:4, x:140, z:0, eje:'x', s:-1, mc:0x2f6fd6 } ];
function colaUsa(eje, c, s){ return COLAS.some(function(Q){ return Q.eje===eje && (eje==='x'?Q.z:Q.x)===c && Q.s===s; }); }
var COLA_PUTEA=['¡Avanzá, micrero!','¡Está en verde, carajo!','¡Pííí! ¡Movete, pues!','¡Micrero de mierda, dale!','¡¿Qué esperás, que se ponga rojo?!','¡Chuta, este micrero!','¡Arrancá esa carcacha, carajo!'],
    COLA_MICRO=['¡Ya voy, ya voy, carajo!','¡Estoy cargando pasajeros, pues!','¡Calmate, che, que no es tu casa!','¡Pará, que sube una doña!'];
COLAS.forEach(function(Q, qi){ Q.v=[]; [[Q.mc,1],[AC[(qi*3+1)%AC.length]],[AC[(qi*3+4)%AC.length]],[AC[(qi*3+7)%AC.length]]].forEach(function(o){ var mi=!!o[1], L=mi?9:4; Q.v.push({ g:auto(o[0], mi), L:L, h:L/2, d:0, oc:false, e:1 }); });
  var d=-8.3; Q.v.forEach(function(v){ v.d=d-v.h; d=v.d-v.h-1.4; }); Q.rojoAnt=null; Q.verdeT=99; Q.flojo=false; });
function colaPoner(Q, v){ var p=Q.s*v.d, g=v.g; if(Q.eje==='x'){ g.position.set(Q.x+p,0,Q.z+Q.s*2.6); g.rotation.y=Q.s>0?0:Math.PI; } else { g.position.set(Q.x-Q.s*2.6,0,Q.z+p); g.rotation.y=Q.s>0?-Math.PI/2:Math.PI/2; } g.scale.setScalar(Math.max(.01,v.e)); g.visible=v.e>.02; }
function colaHabla(v, txt, micro, i){ if(!v.etq){ v.etq={ el:etiqueta('habla'+(micro?' calma':''),''), obj:v.g, dy:micro?5.4:(i%2?6.4:3.8), oculta:true }; ETQ.push(v.etq); }
  if(txt){ if(v.etq.oculta || v.etq.txt!==txt){ v.etq.el.textContent=(micro?'💬 ':'🗯️ ')+txt; v.etq.txt=txt; } v.etq.oculta=false; } else v.etq.oculta=true; }
function colasPaso(dt, t){ var fase=Math.floor(t/8)%2, tf=t%8;
  COLAS.forEach(function(Q, qi){ var rojo=(fase+(Q.si%2))%2===0, lim=Infinity, mic=Q.v[0], parado=!mic.oc && mic.d+mic.h>=-8.3-1.2 && mic.d+mic.h<=-8.2;
    if(rojo!==Q.rojoAnt){ Q.flojo=!rojo && parado; Q.rojoAnt=rojo; }   // el micrero se queda pensando solo si estaba esperando la luz
    Q.verdeT=(!rojo && Q.flojo)?tf:99;   // con la hora del semáforo, no con los cuadros: en un aparato lento pasa igual
    if(rojo && tf<2.5 && Q.v.every(function(v){ return v.oc; })){ var d=-40; Q.v.forEach(function(v){ v.d=d-v.h; d=v.d-v.h-1.6; v.oc=false; v.e=.05; }); }   // vuelven a llegar al semáforo
    var demora=4.5, espera=!rojo && Q.verdeT<demora;
    Q.v.forEach(function(v, i){ if(v.oc){ colaHabla(v,''); return; }
      var meta=Infinity; if(v.d+v.h<=-8.3+.05){ if(rojo) meta=-8.3-v.h; if(i===0 && espera) meta=Math.min(meta, v.d); }
      meta=Math.min(meta, lim-v.h); v.d=Math.min(v.d+9*dt, Math.max(v.d, meta)); lim=v.d-v.h-1.4;
      if(v.d>58){ v.e-=dt*3; if(v.e<=0){ v.e=0; v.oc=true; } } else if(v.e<1) v.e=Math.min(1,v.e+dt*3);
      colaPoner(Q, v);
      var txt=''; if(espera && Q.verdeT>.4){ if(i===0){ if(Q.verdeT>2.2) txt=COLA_MICRO[(qi+Math.floor(t/16))%COLA_MICRO.length]; } else if(Q.verdeT>.4+i*.35) txt=COLA_PUTEA[(qi*3+i+Math.floor(t/16))%COLA_PUTEA.length]; }
      colaHabla(v, txt, i===0, i); }); }); }
function auto(col, micro, yango){ var g=new THREE.Group(), L=micro?9:4, A2=micro?2.4:1.9, c=M(col,{ roughness:.35 });
  cajaV(L,micro?2.2:1,A2,c,0,micro?1.6:.85,0,g); if(!micro) cajaV(L*.5,.75,A2*.9,M(0x9ec5ff,{ roughness:.1, metalness:.3 }),-.2,1.7,0,g);
  else { cajaV(L-.6,.8,A2+.02,M(0x9ec5ff,{ roughness:.1, metalness:.3 }),0,2.1,0,g); cajaV(L+.02,.3,A2+.02,M(0xffffff),0,1.15,0,g); }
  var fa=Mbrilla(0xf6f7f9,0xfff6d8); cajaV(.08,.25,.4,fa,L/2+.02,.9,A2/2-.4,g,false); cajaV(.08,.25,.4,fa,L/2+.02,.9,-A2/2+.4,g,false);
  var ne=M(0x1c242c); [[L/2-.8,1],[-L/2+.8,1],[L/2-.8,-1],[-L/2+.8,-1]].forEach(function(r){ var w=cilV(.4,.3,ne,r[0],.4,r[1]*A2/2,g,14); w.rotation.x=Math.PI/2; });
  if(yango){ var cy=cajaV(1.5,.42,.5,M(0xff2d2d),-.2,2.28,0,g,false); [1,-1].forEach(function(sd){ var pl=new THREE.Mesh(new THREE.PlaneGeometry(1.46,.4), new THREE.MeshBasicMaterial({ map:YANGO_TEX })); pl.position.set(-.2,2.28,sd*.26); if(sd<0) pl.rotation.y=Math.PI; g.add(pl); });
    cajaV(L+.02,.18,A2+.02,M(0xff2d2d),0,.62,0,g,false); }
  esc.add(g); return g; }
/* 🚕 Yango: autos con su cartelito rojo en el techo y motos de entrega con su caja (Santa Cruz los tiene por todos lados) */
var YANGO_TEX=cartelTex('YANGO','#ff2d2d','#ffffff',256,72);
var nA=0;
for(var r=Z0; r<=Z1; r+=G) [1,-1].forEach(function(s,i){ if(colaUsa('x',r,s)) return; AUTOS.push({ g:auto(AC[(nA++)%AC.length], nA%7===0), eje:'x', c:r, s:s, v:7+rnd()*5, p:X0+rnd()*(X1-X0) }); });
for(var ny=0; ny<16; ny++){ var ex=ny%2===0, cy2=ex?Z0+G*Math.floor(rnd()*((Z1-Z0)/G+1)):X0+G*Math.floor(rnd()*((X1-X0)/G+1)), sy=rnd()<.5?1:-1;
  if(!colaUsa(ex?'x':'z',cy2,sy)) AUTOS.push({ g:auto([0xf7f9fc,0xc9d1db,0x1f2937,0xb8c4d0][ny%4], false, true), eje:ex?'x':'z', c:cy2, s:sy, v:8+rnd()*5, p:(ex?X0:Z0)+rnd()*(ex?X1-X0:Z1-Z0) }); }
for(var q=X0; q<=X1; q+=G) [1,-1].forEach(function(s){ if(rnd()<.35||colaUsa('z',q,s)) return; AUTOS.push({ g:auto(AC[(nA++)%AC.length], nA%9===0), eje:'z', c:q, s:s, v:7+rnd()*5, p:Z0+rnd()*(Z1-Z0) }); });
/* camiones: la caja es de lona transparente, para ver lo que lleva */
var LONA=M(0xf1f4f8,{ roughness:.5, transparent:true, opacity:.32 }); LONA.depthWrite=false;
var LOGO_CAMION=texLogo(720,160,function(g2,w2,h2){ var an=LOGO?LOGO.w*(h2-10)/LOGO.h:0; dibLogo(g2,(w2-an)/2,5,h2-10); });
function camion(c){
  var g=new THREE.Group(), cab=M(c.col,{ roughness:.4 }), negro=M(0x1c242c), marco=M(0xdfe6ee);
  cajaV(7.2,.35,2.3,M(0x39424d),0,.75,0,g);
  cajaV(5.4,.18,2.4,marco,-.9,1.03,0,g); cajaV(5.4,.12,2.4,marco,-.9,3.75,0,g); [-3.55,1.75].forEach(function(x){ [-1.15,1.15].forEach(function(z){ cajaV(.14,2.7,.14,marco,x,2.4,z,g); }); });
  var lona=cajaV(5.4,2.8,2.4,LONA,-.9,2.35,0,g,false); lona.renderOrder=2;
  cajaV(5.4,.9,2.44,M(0xffffff,{ roughness:.5 }),-.9,3.25,0,g);
  [1,-1].forEach(function(s){ var pl=new THREE.Mesh(new THREE.PlaneGeometry(3.6,.8), new THREE.MeshBasicMaterial({ map:LOGO_CAMION, transparent:true })); pl.position.set(-.9,3.25,s*1.23); pl.rotation.y=s>0?0:Math.PI; g.add(pl); });
  cajaV(5.42,.35,2.42,M(0x00a59e),-.9,1.25,0,g);
  cajaV(1.8,2.1,2.3,cab,2.75,1.95,0,g); cajaV(.08,.9,1.9,M(0x9ec5ff,{ roughness:.1, metalness:.3 }),3.66,2.4,0,g);
  var faro=Mbrilla(0xf6f7f9,0xfff6d8); cajaV(.08,.28,.42,faro,3.68,1.35,.75,g,false); cajaV(.08,.28,.42,faro,3.68,1.35,-.75,g,false);
  [[-2.6,1.2],[-1.4,1.2],[2.6,1.2],[-2.6,-1.2],[-1.4,-1.2],[2.6,-1.2]].forEach(function(r){ var w=cilV(.48,.4,negro,r[0],.48,r[1],g,18); w.rotation.x=Math.PI/2; });
  var carga=new THREE.Group(); carga.position.set(-.9,1.15,0); g.add(carga);
  g.userData={ tipo:'camion', c:c, carga:carga }; TOCA.push(g); esc.add(g); return g;
}
function enFila(z){ return Math.abs(z/G-Math.round(z/G))<1e-6; } function enCol(x){ return Math.abs(x/G-Math.round(x/G))<1e-6; }
function ruta(p,q){ var o=[];
  if(enFila(p.z)&&enFila(q.z)){ if(p.z===q.z) o.push({x:q.x,z:q.z}); else { var xc=Math.round(((p.x+q.x)/2)/G)*G; o.push({x:xc,z:p.z},{x:xc,z:q.z},{x:q.x,z:q.z}); } }
  else if(enFila(p.z)) o.push({x:q.x,z:p.z},{x:q.x,z:q.z});
  else if(enFila(q.z)) o.push({x:p.x,z:q.z},{x:q.x,z:q.z});
  else { var zr=Math.round(((p.z+q.z)/2)/G)*G; o.push({x:p.x,z:zr},{x:q.x,z:zr},{x:q.x,z:q.z}); }
  return o; }
function montacargas(chaleco){
  var g=new THREE.Group(), am=M(chaleco||0xf2b705,{ roughness:.45 }), gris=M(0x3d4752), negro=M(0x1c242c);
  cajaV(1.5,.9,2.1,am,0,.75,0,g); cajaV(1.3,.5,.7,gris,0,1.45,.55,g);
  [[-.65,.8],[.65,.8],[-.65,-.8],[.65,-.8]].forEach(function(q){ cajaV(.08,1.5,.08,gris,q[0],2.2,q[1]*.6+.15,g); });
  cajaV(1.4,.08,1.3,gris,0,2.95,.25,g); cajaV(.3,.18,.3,Mbrilla(0xff9f1c,0xff9f1c),0,3.08,.25,g,false);
  var ch=new THREE.Group(); ch.position.set(0,1.6,.1); g.add(ch); cajaV(.5,.6,.4,M(0x2f6fd6),0,.3,0,ch); cilV(.2,.36,M(0xe0b089),0,.78,0,ch,10); cilV(.24,.12,M(0xf2b705),0,1,0,ch,10);
  cajaV(.12,2.6,.12,gris,-.45,1.3,-1.15,g); cajaV(.12,2.6,.12,gris,.45,1.3,-1.15,g);
  var horq=new THREE.Group(); horq.position.set(0,.3,-1.3); g.add(horq); cajaV(.12,.06,1.3,gris,-.35,0,-.6,horq); cajaV(.12,.06,1.3,gris,.35,0,-.6,horq);
  var p=palletV(horq, 2, 0, .05, -.65); p.scale.setScalar(.75); p.visible=false;
  [[-.75,.7],[.75,.7],[-.75,-.6],[.75,-.6]].forEach(function(r){ var w=cilV(.3,.25,negro,r[0],.3,r[1],g,14); w.rotation.z=Math.PI/2; });
  g.scale.setScalar(1.6); g.userData={ tipo:'monta', horq:horq, pallet:p }; TOCA.push(g); esc.add(g); return g;
}
function persona(o){
  var g=new THREE.Group(), piel=M(o.piel||0xe0b089), camisa=M(o.camisa,{ roughness:.5 }), pant=M(o.pant||0x2f4f7f), negro=M(0x1c242c);
  function pierna(x){ var p=new THREE.Group(); p.position.set(x,.95,0); g.add(p); cajaV(.24,.9,.26,pant,0,-.45,0,p); cajaV(.26,.14,.36,negro,0,-.9,.06,p); return p; }
  function brazo(x){ var b=new THREE.Group(); b.position.set(x,1.72,0); g.add(b); cajaV(.18,.72,.2,camisa,0,-.32,0,b); cilV(.1,.16,piel,0,-.74,0,b,8); return b; }
  var pi=pierna(-.16), pd=pierna(.16);
  cajaV(.66,.82,.4,camisa,0,1.36,0,g);
  if(o.refl){ var r=M(0xf4f7fb); cajaV(.68,.06,.42,r,0,1.2,0,g); cajaV(.68,.06,.42,r,0,1.5,0,g); }
  if(o.panza){ var pz=new THREE.Mesh(new THREE.SphereGeometry(.3,14,10), camisa); pz.position.set(0,1.18,.2); pz.scale.set(1,.9,.8); g.add(pz); }
  var bi=brazo(-.43), bd=brazo(.43);
  if(o.tabla){ cajaV(.36,.48,.04,M(0xc9a26b),0,-.6,.16,bd); cajaV(.3,.38,.02,M(0xffffff),0,-.6,.19,bd); }
  var cabeza=new THREE.Group(); cabeza.position.y=2.05; g.add(cabeza);
  cabeza.add(new THREE.Mesh(new THREE.SphereGeometry(.27,16,12), piel));
  if(o.bigote) cajaV(.36,.1,.12,M(0x3b2a1e),0,-.1,.22,cabeza);
  if(o.gorra){ var gm=M(o.gorra); cilV(.29,.14,gm,0,.18,0,cabeza,16); cajaV(.34,.04,.24,gm,0,.12,.3,cabeza); }
  else cajaV(.5,.14,.5,M(o.pelo||0x2b2018),0,.2,0,cabeza);
  if(o.lentes) cajaV(.4,.08,.06,negro,0,.04,.25,cabeza);
  g.scale.setScalar(1.35); TOCA.push(g); esc.add(g);
  return { g:g, pi:pi, pd:pd, bi:bi, bd:bd, cabeza:cabeza };
}
function animar(P, modo, t, vel){ if(modo==='anda'){ var w=Math.sin(t*(vel||10)); P.pi.rotation.x=w*.6; P.pd.rotation.x=-w*.6; P.bi.rotation.x=-w*.5; P.bd.rotation.x=w*.5; P.bi.rotation.z=P.bd.rotation.z=0; P.cabeza.rotation.y=0; P.g.position.y=0; return; }
  P.pi.rotation.x=P.pd.rotation.x=0;
  if(modo==='putea'){ var s=Math.sin(t*14); P.bi.rotation.x=-2.4+s*.5; P.bd.rotation.x=-1.4-s*.6; P.bi.rotation.z=-.3; P.bd.rotation.z=.3; P.cabeza.rotation.y=Math.sin(t*9)*.35; P.g.position.y=Math.abs(Math.sin(t*7))*.12; return; }
  if(modo==='contesta'){ P.bi.rotation.x=0; P.bd.rotation.x=-1.2+Math.sin(t*6)*.4; P.bi.rotation.z=P.bd.rotation.z=0; P.cabeza.rotation.y=Math.sin(t*3)*.2; P.g.position.y=0; return; }
  if(modo==='revisa'){ P.bi.rotation.x=-.4; P.bd.rotation.x=-1.25; P.bi.rotation.z=P.bd.rotation.z=0; P.cabeza.rotation.y=Math.sin(t*1.3)*.6; P.g.position.y=0; return; }
  if(modo==='reta'){ var s2=Math.sin(t*8); P.bd.rotation.x=-1.6+s2*.25; P.bi.rotation.x=-.3; P.bi.rotation.z=-.5; P.bd.rotation.z=0; P.cabeza.rotation.y=s2*.15; P.g.position.y=0; return; }
  P.bi.rotation.x=0; P.bd.rotation.x=(P.tabla?-.6:0); P.bi.rotation.z=P.bd.rotation.z=0; P.cabeza.rotation.y=0; P.g.position.y=0; }
var GAR=persona({ camisa:0xff7a00, refl:true, panza:true, bigote:true, gorra:0x14243a }); GAR.g.userData={ tipo:'npc', quien:'gar' };
var ERN=persona({ camisa:0x2f6fd6, pant:0x3d4752, tabla:true, pelo:0x1c1410, lentes:true }); ERN.tabla=true; ERN.g.userData={ tipo:'npc', quien:'ern' };
var DAV=persona({ camisa:0x15803d, pant:0x5d4a3a, gorra:0xffffff, tabla:true }); DAV.tabla=true; DAV.g.userData={ tipo:'npc', quien:'dav' };
var OFI={ x:ALM.ptf.x-ALM.ptf.w/2-4.8, z:ALM.ptf.z+ALM.ptf.d/2-5+6.2 };
ERN.g.position.set(OFI.x+1.5,0,OFI.z); ERN.g.rotation.y=.3;
DAV.g.position.set(ALM.ptf.x-4,0,ALM.ptf.dock+13);
var NPCS={ gar:{ P:GAR, n:'EDUARDO', cls:'npc' }, ern:{ P:ERN, n:'ERNESTO', cls:'npc ern' }, dav:{ P:DAV, n:'DAVID', cls:'npc dav' } };
Object.keys(NPCS).forEach(function(k){ var N=NPCS[k]; N.etq={ el:etiqueta(N.cls,N.n), obj:N.P.g, dy:3.9 }; ETQ.push(N.etq); N.modo='quieto'; });
function decir(k, txt, seg, ic){ var N=NPCS[k]; callar(k); N.habla={ el:etiqueta('habla'+(k==='gar'?'':(k==='dav'&&ic)?' jefe':' calma'),(ic||(k==='gar'?'🗯️ ':'💬 '))+txt), obj:N.P.g, dy:5.6 }; ETQ.push(N.habla); N.hablaT=seg||3.8; }
function callar(k){ var N=NPCS[k]; if(N.habla){ ETQ.splice(ETQ.indexOf(N.habla),1); N.habla.el.remove(); N.habla=null; } }
var FRASES={
  cargando:['¡Carajo, ese montacargas parece tortuga!','¡La puta madre, faltan {n} bultos todavía!','¡{p}, cargá de una vez, me cago en diez!','¡DAVID, carajo, apurá esa carga del {p}!','¡Chuta, con esta lentitud llegamos mañana!'],
  listo:['¡¿Qué esperás para salir, carajo?!','¡Arrancá ese fierro de una vez, la puta madre!','¡ERNESTO, firmá la salida del {p}, carajo!','¡{p} cargado y quieto! ¡Qué macana!'],
  sinchofer:['¡¿Y el chofer?! ¡La reputa madre!','¡ERNESTO! ¿Quién maneja el {p}? ¡Me cago en todo!','¡Camión sin chofer otra vez, qué cagada, DAVID!','¡Alguien que maneje esta porquería, carajo!'],
  volvio:['¡Volvió el {p}! ¿Y la plata del cobro, carajo?','¡Lavá ese camión que está hecho mierda!','¡¿Recién volvés?! ¡Ni que fueras a Cochabamba!'],
  espera:['¡DAVID, ¿quién dejó {n} pallets en espera desde hace una hora?!','¡La zona de espera es un quilombo, la puta madre!','¡Sacá eso de ahí y cargalo, carajo!'],
  suelto:['¡Quién dejó este pallet acá, la puta madre!','¡Hace un calor de mierda!','¡Carajo, otra vez sin señal!','¡Esto es un quilombo, chuta!','¡Se quema el Fidalga y ustedes rascándose, carajo!','¡Carajo, otra vez se está quemando un Fidalga!'],
  vacio:['¡{p} vacío y ocupando andén, carajo!','¡Este {p} no lleva nada, la puta madre!','¡¿Y el {p}? ¡Sin carga y tomando sol!'],
  calle:['¡Qué tráfico de mierda, carajo!','¡Los micros manejan como el orto!','¡Chuta, me cansé de caminar!','¡Esos mototaxis me van a matar, carajo!','¡Chuta, con el humo del Fidalga no se ve nada!','¡Carajo, otra vez se está quemando un Fidalga!'],
  ernesto:['¡ERNESTO, dejá el celular y asigná choferes, carajo!','¡ERNESTO, tu planilla es un desastre, me cago en diez!','¡ERNESTO! ¿Y la Lista de carga? ¡La puta madre!','¡ERNESTO! ¡Carajo, otra vez se está quemando un Fidalga y vos con el celular!'],
  david:['¡DAVID, ese montacargas no se maneja solo, carajo!','¡DAVID! ¿Quién contó el stock, un ciego? ¡La puta madre!','¡DAVID, la zona de espera parece feria, ordená eso!','¡DAVID, carajo, otra vez se está quemando un Fidalga!']
};
var RESP={ ern:['¡Calmate, Eduardo, ya lo asigno!','¡No me grites, que está en la Lista de carga!','¡Ya va, ya va, estoy en eso!','¡Andá a putear a David, que es su turno!'],
           dav:['¡Tranquilo, viejo, que ya sale!','¡Eduardo, el jefe acá soy yo, andá a trabajar!','¡Ya le digo a Ernesto, no te sulfures!','¡Eduardo, tomate un mate y relajate!'] };
var ULT={};
function frase(L, tipo, c){ var f=L[Math.floor(Math.random()*L.length)]; if(f===ULT[tipo] && L.length>1) f=L[(L.indexOf(f)+1)%L.length]; ULT[tipo]=f;
  return f.replace('{p}', c?c.p:'').replace('{n}', c?(tipo==='espera'?c.nEspera:(c.total-c.dentro)):''); }
/* lo de Eduardo a Ernesto y a David sale del día: pedidos sin camión, Moreno, camiones sin chofer */
function garExtra(tipo){ var d=D0?D0.dia:{}, L=[];
  if(tipo==='ernesto'){ if(d.sinCamion) L.push('¡ERNESTO! ¿Y el camión para los '+d.sinCamion+' pedidos sin camión? ¡La puta madre!');
    if(D0 && D0.im && D0.im.u) L.push('¡ERNESTO! ¡Moreno tiene '+D0.im.u+' para traer y nadie va!'); }
  if(tipo==='ernesto' && d.tarde) L.push('¡ERNESTO! ¡Son las '+horaYa()+' y el '+d.tarde.p+' sigue acá! ¡Los clientes van a llamar a las vendedoras!');
  if(tipo==='david'){ var c=CAMS.filter(function(x){ return x.total>0 && !x.chofer && !x.enCalle; })[0]; if(c) L.push('¡DAVID, carajo, el '+c.p+' sigue sin chofer!'); }
  if(tipo==='david' && d.tarde) L.push('¡DAVID! ¡El '+d.tarde.p+' tenía que haber salido hace rato! ¿Quién manda acá?');
  return L; }
function garFrase(tipo, c){ return frase(FRASES[tipo].concat(garExtra(tipo)), tipo, c); }
var GARN={ st:'quieto', espera:1, sitio:'ptf', rants:0, path:null, pi:0, a:'' };
GAR.g.position.set(ALM.ptf.x-8, 0, ALM.ptf.fz+12);
function garParados(sitio){ return CAMS.filter(function(c){ return c.alm===sitio && !c.enCalle && !c.anim && CAMG[c.k].visible; }); }
function garTipo(c){ if(!c.total) return 'vacio'; if(c.nEspera>=2 && Math.random()<.4) return 'espera'; if(c.dentro<c.total) return 'cargando'; if(!c.chofer) return 'sinchofer'; return 'listo'; }
function garIr(pts, tipo){ GARN.path=pts; GARN.pi=0; GARN.st=tipo||'camina'; }
function garElegir(){
  var L=garParados(GARN.sitio), otro=Object.keys(ALM).filter(function(k){ return k!==GARN.sitio && garParados(k).length; })[0];
  var libres=['ern','dav'].filter(function(k){ return k==='ern' ? (ERNN.st!=='escucha' && DAVN.st!=='va') : DAVN.st==='ronda'; });
  if(GARN.sitio==='ptf' && libres.length && Math.random()<.42){ var quien=libres[Math.floor(Math.random()*libres.length)], Q=NPCS[quien].P.g.position, dx=GAR.g.position.x-Q.x, dz=GAR.g.position.z-Q.z, d=Math.hypot(dx,dz)||1;
    GARN.blanco=null; GARN.a=quien; garIr([{ x:Q.x+dx/d*1.9, z:Q.z+dz/d*1.9 }]); return; }
  if((GARN.rants>=5 || !L.length) && otro){ GARN.rants=0; var A=ALM[GARN.sitio], B=ALM[otro], p=GAR.g.position;
    var pts=[{ x:p.x, z:A.fila-5.5 }, { x:p.x, z:A.fila }].concat(ruta({ x:p.x, z:A.fila },{ x:B.x, z:B.fila })).concat([{ x:B.x, z:B.fila-5.5 }]);
    GARN.destino=otro; GARN.a=''; garIr(pts,'cruza'); decir('gar', garFrase('calle'),3); return; }
  if(!L.length){ var A2=ALM[GARN.sitio]; GARN.a=''; garIr([{ x:A2.x-A2.w/2+Math.random()*A2.w, z:A2.fz+8+Math.random()*8 }]); GARN.blanco=null; return; }
  var c=L[Math.floor(Math.random()*L.length)], t=CAMG[c.k].position; GARN.blanco=c; GARN.a=''; garIr([{ x:t.x-3.6, z:t.z+1.2 }]); }
var ERNN={ st:'ofi', t:4, path:null, c:null, dest:'', vueltas:0 }, DAVN={ st:'ronda', t:9, w:0, tema:0 };
function caminar(P, q, vel, dt){ var p=P.g.position, dx=q.x-p.x, dz=q.z-p.z, d=Math.hypot(dx,dz); if(d>.05) P.g.rotation.y=Math.atan2(dx,dz);
  if(d<=vel*dt){ p.x=q.x; p.z=q.z; return true; } p.x+=dx/d*vel*dt; p.z+=dz/d*vel*dt; return false; }
function mirar(P, q){ var p=P.g.position; P.g.rotation.y=Math.atan2(q.x-p.x, q.z-p.z); }
function ernCamiones(){ return CAMS.filter(function(c){ return c.alm==='ptf' && !c.enCalle && !c.anim && CAMG[c.k].visible; }); }
function ernPunto(c){ var a=anden(c); return { x:a.x+6.6, z:a.z+4.5 }; }
function rptDe(c){ return c.paradas.filter(function(s){ return s.rpt; })[0]; }
/* lo que Ernesto ve en cada camión: sus líneas de verdad */
function ernRevisa(c){ var esp=c.items.filter(function(it){ return it.st==='espera'; })[0], mor=c.items.filter(function(it){ return it.st==='moreno'; })[0],
    fal=c.items.filter(function(it){ return it.st==='falta'; })[0], rpt=rptDe(c), L=[];
  if(!c.total && !c.items.length) return 'El '+c.p+' no lleva nada '+(D0&&D0.hoy?'hoy':'ese día')+'. Andén libre.';
  if(!c.chofer) L.push('Reviso el '+c.p+': '+c.dentro+' de '+c.total+' adentro… y sin chofer. ¿A quién llamo?');
  if(esp) L.push(c.p+': '+c.dentro+' de '+c.total+'. Falta cargar el '+esp.prod+' ×'+esp.u+'.');
  if(mor) L.push(c.p+': el '+mor.prod+' ×'+mor.u+' hay que traerlo de '+(mor.alm||'Moreno')+'.');
  if(fal) L.push('Ojo: del '+fal.prod+' no hay stock. Que la vendedora avise al cliente.');
  if(rpt) L.push(c.p+' lleva la '+rpt.n.replace(' · ',' a ')+'. Que no falte el Excel.');
  if(c.total && c.dentro>=c.total && c.chofer) L.push(c.p+' completo ✔ '+c.total+' de '+c.total+'. Listo para salir.');
  if(!L.length) L.push('Reviso el '+c.p+'… '+c.dentro+' de '+c.total+'. Va bien.');
  return L[Math.floor(Math.random()*L.length)]; }
function ernOfi(){ var L=['📋 Anoto en el panel lo que revisé.','A ver la Lista de carga de mañana…'], d=D0?D0.dia:{};
  if(d.sinMarcar) L.push('Tengo '+d.sinMarcar+' de días pasados sin ✅… hago el cierre.');
  var c=CAMS.filter(function(x){ return x.total>0 && !x.chofer && !x.enCalle; })[0]; if(c) L.push('¿Y el chofer del '+c.p+'? Le escribo.');
  return L[Math.floor(Math.random()*L.length)]; }
function ernIr(dest, c){ var E=ERNN; E.dest=dest; E.c=c||null; E.st='va';
  E.path=[dest==='ofi' ? { x:OFI.x+1.5, z:OFI.z } : ernPunto(c)]; }
function ernLlega(){ var E=ERNN;
  if(E.dest==='ofi'){ E.st='ofi'; E.vueltas=0; E.t=5+Math.random()*4; ERN.g.rotation.y=.3; if(Math.random()<.5) decir('ern', ernOfi(), 3.2); return; }
  var c=E.c; E.st='revisa'; E.vueltas++; E.t=4.6; mirar(ERN, anden(c)); decir('ern', ernRevisa(c), 4.2, '🔎 '); }
function ernPaso(dt, t){ var E=ERNN, N=NPCS.ern, p=ERN.g.position;
  if(E.st==='escucha'){ animar(ERN, N.modo==='contesta'?'contesta':'quieto', t); return; }
  /* si Eduardo viene a putearlo, lo espera */
  var gp=GAR.g.position, acosado=GARN.a==='ern' && GARN.path && Math.hypot(gp.x-p.x,gp.z-p.z)<7;
  if(E.path && !acosado && N.modo!=='contesta'){ if(caminar(ERN, E.path[0], 3.2, dt)){ E.path.shift(); if(!E.path.length){ E.path=null; ernLlega(); } } animar(ERN,'anda',t,9); return; }
  if(N.modo==='contesta'){ animar(ERN,'contesta',t); return; }
  animar(ERN, E.st==='revisa'?'revisa':'quieto', t);
  if(acosado || E.path) return;
  E.t-=dt; if(E.t>0) return;
  var L=ernCamiones().filter(function(c){ return c!==E.c; });
  if(E.st==='revisa' && (E.vueltas>=3 || !L.length || Math.random()<.3)) ernIr('ofi');
  else if(L.length){ var malos=L.filter(function(c){ return !c.chofer || c.dentro<c.total; }), B=malos.length&&Math.random()<.7?malos:L; ernIr('cam', B[Math.floor(Math.random()*B.length)]); }
  else E.t=3; }
/* David, jefe de logística: da vueltas por la zona de espera y cada tanto le cae a Ernesto con lo pendiente */
function camDeDia(k){ return k ? ' Van en el '+k+'.' : ''; }
/* lo que va tarde: si el camión todavía no tiene todo adentro o no tiene chofer, Ernesto contesta con eso */
function horaYa(){ var h=typeof horaBolivia==='function' ? horaBolivia() : new Date(), z=function(n){ return (n<10?'0':'')+n; }; return z(h.getHours())+':'+z(h.getMinutes()); }
function jefeTarde(){ var d=D0.dia, T=d.tarde;
  if(!T){ return d.tardeSin ? { d:'¡Ernesto! Ya pasó la hora y '+(d.tardeSin===1?'hay 1 entrega':'hay '+d.tardeSin+' entregas')+' de hoy sin camión. ¡Los clientes están esperando!', e:'¡Ya les asigno camión, jefe, ahorita salen!' } : null; }
  var c=CAMS.filter(function(x){ return x.k===T.k; })[0], falta=c && c.total>c.dentro ? c.total-c.dentro : 0;
  var cuando=T.turno==='PM' ? 'de la tarde' : 'de la mañana';
  var e=c && !c.chofer ? 'Jefe… el '+T.p+' no tiene chofer. Estoy llamando.'
    : falta ? 'Le faltan '+falta+' bulto'+(falta===1?'':'s')+', jefe. En diez minutos sale.'
    : 'Ya sale, jefe. Y que alguien toque «🚚 Ya salió» en el panel.';
  return { d:'¡ERNESTO! Son las '+horaYa()+' y el '+T.p+' con '+T.n+' entrega'+(T.n===1?'':'s')+' '+cuando+' todavía no salió. '+(T.cams>1?'¡Y no es el único! ':'')+'¡Los clientes esperan!', e:e }; }
var JEFE=[
  jefeTarde,
  function(){ var d=D0.dia; return d.eduardo?{ d:'¡ERNESTO! No te olvides '+(d.eduardo===1?'la entrega':'las '+d.eduardo+' entregas')+' de Eduardo. ¡Esas salen primero!', e:d.eduardoCam?'Sí, jefe, van en el '+d.eduardoCam+'.':'Sí, jefe… ahora les asigno camión.' }:null; },
  function(){ var c=CAMS.filter(function(x){ return x.total>0 && !x.chofer && !x.enCalle; })[0]; return c?{ d:'¿Por qué el '+c.p+' sigue sin chofer? ¡Asignalo YA, Ernesto!', e:'Estoy llamando a uno, jefe… no contesta.' }:null; },
  function(){ var d=D0.dia; return d.roho?{ d:'¿Y lo de ROHO, Ernesto? '+(d.roho===1?'Es 1 pedido':'Son '+d.roho+' pedidos')+'. ¿Quién lo lleva?', e:d.rohoCam?'Ya está, jefe: va en el '+d.rohoCam+'.':'Ya le busco camión, jefe.' }:null; },
  function(){ var d=D0.dia; return d.sinMarcar?{ d:'¡Marcá lo entregado! Hay '+d.sinMarcar+' de días pasados sin ✅ y después nadie sabe qué salió.', e:'Ahorita hago el cierre de entregas, jefe.' }:null; },
  function(){ var c=CAMS.filter(function(x){ return !x.enCalle && x.nEspera>0; }).sort(function(a,b){ return b.nEspera-a.nEspera; })[0]; return c?{ d:'Al '+c.p+' le faltan '+(c.total-c.dentro)+' bultos por cargar. ¡Revisá la Lista de carga, carajo!', e:'Ya le aviso al del montacargas, jefe.' }:null; },
  function(){ var d=D0.dia; return d.multi?{ d:'Hay Multicenter: '+d.multi+' pedido'+(d.multi===1?'':'s')+' a su bodega. ¡Un solo viaje!', e:d.multiCam?'Anotado, jefe: todo en el '+d.multiCam+'.':'Anotado, jefe: todo junto en un camión.' }:null; },
  function(){ var d=D0.dia; return d.faltan?{ d:'Hay '+d.faltan+' pedido'+(d.faltan===1?'':'s')+' con ✗ sin stock ('+d.faltanOc.join(', ')+'). ¡Avisá y reprogramá!', e:'Ya les escribo a las vendedoras, jefe.' }:null; },
  function(){ var d=D0.dia; return d.sinCamion?{ d:'Hay '+d.sinCamion+' pedido'+(d.sinCamion===1?'':'s')+' sin camión. ¿Los vas a llevar en la espalda?', e:'¡Ya les asigno camión, jefe!' }:null; },
  function(){ var c=CAMS.filter(function(x){ return !x.enCalle && rptDe(x); })[0]; return c?{ d:'¿La reposición de la tienda va en el '+c.p+'? ¡Que la tienda no se quede sin colchones!', e:'Sí, jefe, la RPT va en el '+c.p+'.' }:null; },
  function(){ return D0.im && D0.im.u?{ d:'Moreno tiene '+D0.im.u+' para traer. ¿Quién va a buscarlos?', e:'Sale una recogida, jefe.' }:null; }
];
var ERN_QUEJA=['¡Ya va, jefe, ya va!','Jefe, si me deja trabajar, ya está…','Sí, jefe… (otra vez lo mismo)'];
function jefeTema(){ if(!D0) return { d:'Ernesto, ¿cómo vamos?', e:'Todo en orden, jefe.' }; for(var i=0;i<JEFE.length;i++){ var j=(DAVN.tema+i)%JEFE.length, f=JEFE[j](); if(f){ DAVN.tema=(j+1)%JEFE.length; return f; } } return { d:'Ernesto, ¿cómo vamos?', e:'Todo en orden, jefe.' }; }
function davPaso(dt, t){ var D=DAVN, N=NPCS.dav, A=ALM.ptf, p=DAV.g.position;
  if(D.st==='ronda'){
    var gp=GAR.g.position, viene=GARN.a==='dav' && GARN.path && Math.hypot(gp.x-p.x,gp.z-p.z)<7;
    if(N.modo==='contesta' || viene){ animar(DAV, N.modo==='contesta'?'contesta':'quieto', t); return; }
    var q={ x:A.x-6+Math.sin(D.w*.18)*12, z:A.dock+13+Math.cos(D.w*.25)*2.5 };
    if(Math.hypot(q.x-p.x,q.z-p.z)>.6) caminar(DAV, q, 4, dt); else { D.w+=dt; caminar(DAV, q, 99, dt); }
    animar(DAV,'anda',t,7);
    D.t-=dt; if(D.t<=0 && ERNN.st!=='escucha' && !(GARN.a==='ern' && GARN.path) && !NPCS.ern.habla){ D.st='va'; D.f=jefeTema(); D.persigue=0; }
    return; }
  if(D.st==='va'){ var e=ERN.g.position, dx=p.x-e.x, dz=p.z-e.z, d=Math.hypot(dx,dz)||1;
    if(d<2.4){ D.st='reta'; mirar(DAV, e); mirar(ERN, p); callar('ern');
      ERNN.antes=ERNN.st; ERNN.pathAntes=ERNN.path; ERNN.path=null; ERNN.st='escucha';
      decir('dav', D.f.d, 4.2, '📢 '); D.r=4.3; D.t=7.8; return; }
    caminar(DAV, { x:e.x+dx/d*1.9, z:e.z+dz/d*1.9 }, 4.6, dt); animar(DAV,'anda',t,10); return; }
  if(D.st==='reta'){ animar(DAV, D.r>0?'reta':'quieto', t);
    if(D.r>0){ D.r-=dt; if(D.r<=0){ decir('ern', Math.random()<.75?D.f.e:ERN_QUEJA[Math.floor(Math.random()*ERN_QUEJA.length)], 3.3); N.modo='quieto'; NPCS.ern.modo='contesta'; NPCS.ern.modoT=3.3; } }
    D.t-=dt; if(D.t<=0){ D.st='ronda'; D.t=15+Math.random()*7; ERNN.st=ERNN.antes||'ofi'; ERNN.path=ERNN.pathAntes; ERNN.t=Math.max(ERNN.t,1.2);
      if(Math.random()<.35) decir('dav', ['¡Y que no te lo tenga que repetir!','Después lo reviso yo, ¿eh?','¡Vamos, que el camión no espera!'][Math.floor(Math.random()*3)], 2.6, '📢 '); } }
}
function npcPaso(dt, t){
  Object.keys(NPCS).forEach(function(k){ var N=NPCS[k]; if(N.habla){ N.hablaT-=dt; if(N.hablaT<=0) callar(k); } if(N.resp!=null){ N.resp-=dt; if(N.resp<=0){ N.resp=null; decir(k, RESP[k][Math.floor(Math.random()*RESP[k].length)], 3.2); N.modo='contesta'; N.modoT=3; } }
    if(N.modoT!=null){ N.modoT-=dt; if(N.modoT<=0){ N.modoT=null; N.modo='quieto'; } } });
  ernPaso(dt, t); davPaso(dt, t);
  var p=GAR.g.position, anda=GARN.st==='camina'||GARN.st==='cruza';
  if(anda && GARN.path){ var q=GARN.path[GARN.pi], vel=GARN.st==='cruza'?9:3.6, dx=q.x-p.x, dz=q.z-p.z, d=Math.hypot(dx,dz);
    if(d>.05) GAR.g.rotation.y=Math.atan2(dx,dz);
    if(d<=vel*dt){ p.x=q.x; p.z=q.z; GARN.pi++;
      if(GARN.pi>=GARN.path.length){ GARN.path=null;
        if(GARN.st==='cruza'){ GARN.sitio=GARN.destino; GARN.st='quieto'; GARN.espera=.5; return; }
        if(GARN.a){ var Q=NPCS[GARN.a].P.g.position, lejos=Math.hypot(Q.x-p.x,Q.z-p.z);
          if(lejos>2.6){ var ux=(p.x-Q.x)/lejos, uz=(p.z-Q.z)/lejos; GARN.persigue=(GARN.persigue||0)+1; if(GARN.persigue<6){ garIr([{ x:Q.x+ux*1.9, z:Q.z+uz*1.9 }]); return; } }
          GARN.persigue=0; GAR.g.rotation.y=Math.atan2(Q.x-p.x,Q.z-p.z); NPCS[GARN.a].P.g.rotation.y=Math.atan2(p.x-Q.x,p.z-Q.z);
          decir('gar', garFrase(GARN.a==='ern'?'ernesto':'david'), 4); NPCS[GARN.a].resp=2.2; GARN.st='putea'; GARN.espera=4.2; GARN.rants++; return; }
        var c=GARN.blanco; if(c && !c.enCalle && !c.anim){ var tp=CAMG[c.k].position; GAR.g.rotation.y=Math.atan2(tp.x-p.x, tp.z-p.z);
          decir('gar', garFrase(garTipo(c), c)); GARN.st='putea'; GARN.espera=3.8; GARN.rants++; }
        else { if(Math.random()<.4) decir('gar', garFrase('suelto'),3); GARN.st='quieto'; GARN.espera=1.5; } } }
    else { p.x+=dx/d*vel*dt; p.z+=dz/d*vel*dt; }
    animar(GAR,'anda',t,GARN.st==='cruza'?16:10);
    if(GARN.st==='cruza' && Math.random()<dt*.08 && !NPCS.gar.habla) decir('gar', garFrase('calle'),2.6);
    return; }
  animar(GAR, GARN.st==='putea'?'putea':'quieto', t);
  GARN.espera-=dt; if(GARN.espera<=0){ if(GARN.st==='putea'){ GARN.st='quieto'; GARN.espera=1.2+Math.random()*1.4; } else garElegir(); }
}
/* ═════════ la ciudad con vida: gente por las veredas, mototaxis y pájaros ═════════ */
var PEATONES=[], MOTOS=[], AVES=[];
var ROPA=[0xe23d3d,0x2f6fd6,0xf2b705,0x15803d,0x7b3fb0,0xffffff,0x1f2937,0xff7a00,0x00a59e], PIEL=[0xe0b089,0xc68e5f,0x8d5a3b,0xf1c9a5];
for(var np=0; np<48; np++){ var g=new THREE.Group(), ropa=M(ROPA[np%ROPA.length]), piel=M(PIEL[np%PIEL.length]);
  cilV(.3,1.05,ropa,0,1.35,0,g,8); cilV(.22,.9,M(np%3?0x2f4f7f:0x3d4752),0,.45,0,g,8); var h=new THREE.Mesh(new THREE.SphereGeometry(.26,10,8), piel); h.position.y=2.1; g.add(h);
  if(np%4===0){ var som=new THREE.Mesh(new THREE.ConeGeometry(.5,.25,10), M(0xf4ede0)); som.position.y=2.4; g.add(som); }
  g.scale.setScalar(1.25); esc.add(g); var fila=np%2===0;
  PEATONES.push({ g:g, eje:fila?'x':'z', c:(fila?Z0+G*Math.floor(rnd()*((Z1-Z0)/G+1)):X0+G*Math.floor(rnd()*((X1-X0)/G+1))), lado:rnd()<.5?1:-1, s:rnd()<.5?1:-1, v:1.2+rnd()*1.1, p:(fila?X0:Z0)+rnd()*(fila?X1-X0:Z1-Z0), f:rnd()*6 }); }
for(var nm=0; nm<34; nm++){ var yg=nm>=16, g2=new THREE.Group(), col=M(yg?0xff2d2d:[0xe23d3d,0x1f2937,0x2f6fd6,0xf2b705][nm%4],{ roughness:.4 }), ne=M(0x1c242c);
  cajaV(1.7,.5,.45,col,0,.75,0,g2); [[.7],[-.7]].forEach(function(r){ var w=cilV(.32,.18,ne,r[0],.35,0,g2,12); w.rotation.x=Math.PI/2; });
  cilV(.24,.8,M(ROPA[nm%ROPA.length]),-.15,1.4,0,g2,8); var hh2=new THREE.Mesh(new THREE.SphereGeometry(.26,10,8), M(yg?0xff2d2d:0x1f2937)); hh2.position.set(-.15,2,0); g2.add(hh2);
  if(yg){ cajaV(.7,.62,.7,M(0xff2d2d),-.75,1.35,0,g2,false); [1,-1].forEach(function(sd){ var pl=new THREE.Mesh(new THREE.PlaneGeometry(.66,.2), new THREE.MeshBasicMaterial({ map:YANGO_TEX })); pl.position.set(-.75,1.4,sd*.36); if(sd<0) pl.rotation.y=Math.PI; g2.add(pl); }); }
  g2.scale.setScalar(1.3); esc.add(g2); var f2=nm%2===0;
  MOTOS.push({ g:g2, eje:f2?'x':'z', c:(f2?Z0+G*Math.floor(rnd()*((Z1-Z0)/G+1)):X0+G*Math.floor(rnd()*((X1-X0)/G+1))), s:rnd()<.5?1:-1, v:12+rnd()*6, p:(f2?X0:Z0)+rnd()*(f2?X1-X0:Z1-Z0) }); }
for(var nb=0; nb<3; nb++) for(var na=0; na<5; na++){ var g3=new THREE.Group(), pm=M(0x1f2937);
  var a1=cajaV(.9,.06,.25,pm,-.42,0,0,g3,false), a2=cajaV(.9,.06,.25,pm,.42,0,0,g3,false); esc.add(g3);
  AVES.push({ g:g3, a1:a1, a2:a2, b:nb, i:na, r:50+nb*25, cx:35+nb*20, cz:-40+nb*15, v:.12+nb*.03 }); }
var CRUZAN=[]; CEBRAS.forEach(function(q,qi){ for(var n=0;n<2;n++){ var g=new THREE.Group(), ropa=M(ROPA[(qi*2+n)%ROPA.length]), piel=M(PIEL[(qi+n)%PIEL.length]);
  cilV(.3,1.05,ropa,0,1.35,0,g,8); cilV(.22,.9,M(0x2f4f7f),0,.45,0,g,8); var h=new THREE.Mesh(new THREE.SphereGeometry(.26,10,8), piel); h.position.y=2.1; g.add(h); g.scale.setScalar(1.25); esc.add(g);
  var brazo=(qi+n*2)%4; CRUZAN.push({ g:g, x:q[0], z:q[1], b:brazo, t:n*4.5+qi*1.3, f:qi+n }); } });   // en cada cruce con semáforo, dos personas que cruzan por la cebra
function cruzarPaso(dt, t){ CRUZAN.forEach(function(c){ c.t+=dt; var ciclo=c.t%14, d=RW/2+1.8, L=RW+3, u=0, ida=true;
  if(ciclo<3) u=0; else if(ciclo<7){ u=(ciclo-3)/4; } else if(ciclo<10){ u=1; } else { u=1-(ciclo-10)/4; ida=false; }
  var anda=(ciclo>=3&&ciclo<7)||ciclo>=10, y=anda?Math.abs(Math.sin((t+c.f)*7))*.09:0, p=-L/2+u*L, sx=c.b<2?1:-1;
  if(c.b%2===0){ c.g.position.set(c.x+sx*d, y, c.z+p); c.g.rotation.y=ida?0:Math.PI; } else { c.g.position.set(c.x+p, y, c.z+sx*d); c.g.rotation.y=ida?Math.PI/2:-Math.PI/2; } }); }
function vidaPaso(dt, t){ cruzarPaso(dt, t);
  PEATONES.forEach(function(q){ q.p+=q.s*q.v*dt; var lim0=q.eje==='x'?X0:Z0, lim1=q.eje==='x'?X1:Z1; if(q.p>lim1) q.p=lim0; if(q.p<lim0) q.p=lim1;
    var off=q.lado*6.6, y=Math.abs(Math.sin((t+q.f)*7))*.09;
    if(q.eje==='x'){ q.g.position.set(q.p,y,q.c+off); q.g.rotation.y=q.s>0?Math.PI/2:-Math.PI/2; } else { q.g.position.set(q.c+off,y,q.p); q.g.rotation.y=q.s>0?0:Math.PI; } });
  MOTOS.forEach(function(m){ m.p+=m.s*m.v*dt; if(m.eje==='x'){ if(m.p>X1+15) m.p=X0-15; if(m.p<X0-15) m.p=X1+15; m.g.position.set(m.p,0,m.c+m.s*1.4); m.g.rotation.y=m.s>0?0:Math.PI; }
    else { if(m.p>Z1+15) m.p=Z0-15; if(m.p<Z0-15) m.p=Z1+15; m.g.position.set(m.c-m.s*1.4,0,m.p); m.g.rotation.y=m.s>0?-Math.PI/2:Math.PI/2; } });
  AVES.forEach(function(b){ var ang=t*b.v+b.b*2, dx=-Math.sin(ang), dz=Math.cos(ang), off=b.i-2;
    b.g.position.set(b.cx+Math.cos(ang)*b.r - dx*Math.abs(off)*2 + dz*off*1.6, 30+b.b*4+Math.sin(t*2+b.i)*.4, b.cz+Math.sin(ang)*b.r - dz*Math.abs(off)*2 - dx*off*1.6);
    b.g.rotation.y=Math.atan2(-dz,dx); var fl=Math.sin(t*9+b.i)*.5; b.a1.rotation.x=fl; b.a2.rotation.x=-fl; });
}
function etiqueta(cls, html){ var d=document.createElement('div'); d.className='etq '+cls; d.innerHTML=html; box.appendChild(d); return d; }
var v3=new THREE.Vector3();
function moverEtiquetas(){ ETQ.forEach(function(e){ if(e.oculta){ e.el.style.display='none'; return; }
  if(e.obj){ if(!e.obj.visible){ e.el.style.display='none'; return; } v3.copy(e.obj.position); v3.y+=e.dy; } else v3.copy(e.pos);
  v3.project(cam); var x=(v3.x*.5+.5)*W, y=(-v3.y*.5+.5)*H; e.el.style.left=x+'px'; e.el.style.top=y+'px'; e.el.style.display=(v3.z>1||x<-60||x>W+60||y<-40||y>H+40)?'none':''; }); }
function flota(pos, txt){ var d=etiqueta('flota', txt), e={ el:d, pos:pos.clone().setY(5) }; ETQ.push(e);
  requestAnimationFrame(function(){ d.style.transform='translate(-50%,-260%)'; d.style.opacity='0'; });
  setTimeout(function(){ ETQ.splice(ETQ.indexOf(e),1); d.remove(); }, 1500); }
function pin(col){ var g=new THREE.Group(), m=M(col,{ roughness:.3 }); var s=new THREE.Mesh(new THREE.SphereGeometry(.9,18,14), m); s.position.y=4.4; g.add(s);
  var co=new THREE.Mesh(new THREE.ConeGeometry(.7,1.6,16), m); co.rotation.x=Math.PI; co.position.y=3.2; g.add(co);
  var w=new THREE.Mesh(new THREE.SphereGeometry(.36,12,10), M(0xffffff)); w.position.set(0,4.45,.7); g.add(w); esc.add(g); return g; }
var LINEA=null;
function pintarLinea(){ if(LINEA){ esc.remove(LINEA); LINEA=null; } var c=SEL; if(!c||!c.enCalle||!V.calle) return;
  var pts=[new THREE.Vector3(c.pos.x,.5,c.pos.z)]; for(var i=c.pi;i<c.path.length;i++) pts.push(new THREE.Vector3(c.path[i].x,.5,c.path[i].z));
  var geo=new THREE.BufferGeometry().setFromPoints(pts); LINEA=new THREE.Line(geo, new THREE.LineDashedMaterial({ color:0x00a59e, dashSize:2.4, gapSize:1.6 })); LINEA.computeLineDistances(); esc.add(LINEA); }
var ANILLO=new THREE.Mesh(new THREE.RingGeometry(4.6,5.3,48), new THREE.MeshBasicMaterial({ color:0x00a59e, transparent:true, opacity:.85 })); ANILLO.rotation.x=-Math.PI/2; ANILLO.position.y=.12; esc.add(ANILLO);
function ponerNoche(on){ OV.classList.toggle('noche', on); esc.background=lin(on?0x0f1a2c:0xdfe9f3); piso.material.color=lin(on?0x5f6f5a:0xcfdac6);
  hemi.intensity=on?.14:.6; hemi.color=lin(on?0x8fa6d6:0xffffff); sol.intensity=on?.14:.8; sol.color=lin(on?0x9fb4ff:0xffffff);
  LUCES.forEach(function(L){ L.l.intensity=on?L.i:0; }); BRILLA.forEach(function(m){ m.emissiveIntensity=on?1:0; });
  ALERTAS.forEach(function(a){ if(a.obj) a.obj.children[1].material.emissiveIntensity=on?1:.35; }); }
/* 🔥 (13/10, dueño, con una captura de la zona de la obra y el parque: «de paso poné un supermercado Fidalga en llamas, nomás por
   diversión, en ese sector») SOLO DE ADORNO: no sale de ningún dato y no toca nada. Va en la manzana de al lado de la obra
   ('385,385' en ESPECIAL). Lo que se mueve (llamas, humo, la luz, las balizas y el chorro) va en FUEGO y lo anima fuegoPaso desde
   el bucle de la escena; lo quieto, en EST. ⚠️ `var FUEGO;` SIN valor: este archivo corre DESPUÉS de armar la ciudad, y un
   `var FUEGO=null;` borraría lo que fidalga() dejó. Sin rnd(): no corre la suerte de las casas que se arman después. */
var FUEGO;
function fidalga(cx,cz){ var a=G-RW, bw=a-10, bd=20, bz=cz-a/2+3+bd/2, ROJO=Mc(0xc8102e), HOLLIN=Mc(0x2a2522), ra=VIA_RAYA;
  plano(a,a,cx,cz,.04,LOTE); plano(a-3,a-3,cx,cz,.045,Mc(0x8f9bab));                                   // el parqueo
  bloqueFach(cx,bz,bw,bd,7,0xf4f6f9); caja(bw+.6,1.4,bd+.6,ROJO,cx,7.7,bz); caja(bw-.6,.1,bd-.6,Mc(0x3b3634),cx,8.45,bz,null,false);
  var hund=caja(bw*.38,.5,bd*.6,HOLLIN,cx+bw*.26,7.3,bz-1,null,false); hund.rotation.z=.32; hund.rotation.x=-.12;   // el techo que se vino abajo
  [[-bw/2+4,bz+bd/2+.08,7,3],[bw/2-6,bz+bd/2+.08,9,4.5],[0,bz+bd/2+.08,5,2.4]].forEach(function(q){ caja(q[2],q[3],.12,HOLLIN,cx+q[0],7-q[3]/2,q[1],null,false); });   // el hollín en la fachada
  caja(12,4,.3,Mc(0x1f2329),cx,2,bz+bd/2+.12,null,false); caja(15,.4,3,ROJO,cx,4.4,bz+bd/2+1.5);       // la entrada (vidrios rotos) con su alero
  var fr=new THREE.Mesh(new THREE.PlaneGeometry(20,2.8), new THREE.MeshBasicMaterial({ map:cartelTex('FIDALGA','#c8102e','#ffffff',1024,150) }));
  fr.position.set(cx-1,5.9,bz+bd/2+.35); fr.rotation.z=-.06; EST.add(fr);                               // el cartel, medio caído
  var p0=bz+bd/2+5;
  for(var k=-a/2+4; k<a/2-3; k+=3.4) plano(.25,5.2,cx+k,p0+5,.05,ra);
  [[-22,0xffffff],[-15,0x2f6fd6],[22,0x1f2937]].forEach(function(q){ autoQuieto(cx+q[0]+1.7, p0+4.6, Math.PI/2, q[1]); });   // los que quedaron en el parqueo (lejos del camión de bomberos)
  for(var c=0;c<3;c++){ var ca=caja(1.1,.9,.8,ROJO,cx-a/2+5+c*2.2,.55,p0+.8); ca.rotation.y=c*.7; }    // carritos tirados
  /* los bomberos: el camión con la escalera, dos bomberos y la manguera */
  var bx=cx+8, bzz=p0+11, BOMB=Mc(0xd61f1f), CROMO=Mc(0xd8dee6);
  caja(13,3.2,4,BOMB,bx,2.2,bzz); caja(4,3.6,4,BOMB,bx-8,2.4,bzz); caja(3.4,1.6,4.05,Mc(0x9ec5ff,{ roughness:.1 }),bx-8.3,3.3,bzz,null,false);
  caja(13.1,.35,4.1,CROMO,bx,1.2,bzz,null,false); caja(13.1,.3,4.1,Mc(0xffffff),bx,3.1,bzz,null,false);
  [-8,-3,2,5.2].forEach(function(dx){ [-2.1,2.1].forEach(function(dz){ var r=cil(.9,.6,Mc(0x1c242c),bx+dx,.9,bzz+dz,null,14); r.rotation.x=Math.PI/2; }); });
  var esc2=caja(16,.35,1.2,CROMO,bx-4,7.5,bzz-3.5); esc2.rotation.z=.42; esc2.rotation.y=.55;              // la escalera, hacia el techo
  [[-3,-4],[1,-5.5]].forEach(function(q){ cil(.45,1.6,Mc(0x2b2b2b),bx+q[0],.8,bzz+q[1],null,10); var cas=new THREE.Mesh(new THREE.SphereGeometry(.42,10,8), Mc(0xf2b705)); cas.position.set(bx+q[0],1.9,bzz+q[1]); EST.add(cas); });
  /* lo que se mueve */
  FUEGO={ llamas:[], humo:[], t:0, beac:[] };
  var gF=new THREE.Group(); esc.add(gF); FUEGO.g=gF;
  var cono=new THREE.ConeGeometry(1,1,8), bola=new THREE.SphereGeometry(1,10,8);
  var matL=function(c,o){ return new THREE.MeshBasicMaterial({ color:lin(c), transparent:true, opacity:o, depthWrite:false, blending:THREE.AdditiveBlending }); };
  var NAR=matL(0xff5a10,.85), AMA=matL(0xffc21a,.9), ROJ=matL(0xd8250f,.75);
  var focos=[[-bw/2+3,8.6,-bd/2+4,1.5],[-bw/2+9,8.6,1,1.2],[bw*.26,7.6,-1,1.9],[bw*.26-5,8.6,-5,1.4],[bw/2-4,8.6,4,1.3],[2,8.6,-7,1.1],
             [-bw/2+4,4.5,bd/2+.6,.9],[bw/2-6,4.5,bd/2+.6,1],[0,2.6,bd/2+.8,.8]];
  focos.forEach(function(f, i){ [ROJ,NAR,AMA].forEach(function(mat, j){
    var m=new THREE.Mesh(cono, mat); var s=f[3]*(1.9-j*.5), h=f[3]*(5.5-j*1.3);
    m.position.set(cx+f[0]+(j-1)*.35, f[1]+h/2, bz+f[2]); m.scale.set(s,h,s); gF.add(m);
    FUEGO.llamas.push({ m:m, s:s, h:h, y:f[1], f:i*1.7+j*2.3, v:3.2+j*1.1+(i%3)*.6 }); }); });
  for(var i=0;i<28;i++){ var mh=new THREE.Mesh(bola, new THREE.MeshBasicMaterial({ color:lin(i%3?0x2a2a2e:0x4a4a50), transparent:true, opacity:0, depthWrite:false }));
    var f2=focos[i%6], dur=8+(i%5)*.9; gF.add(mh); FUEGO.humo.push({ m:mh, x0:cx+f2[0], z0:bz+f2[2], y0:f2[1]+4, vida:dur*((i*7)%28)/28, dur:dur }); }   // ya arranca con la columna de humo armada
  FUEGO.luz=new THREE.PointLight(0xff6a1a, 2.2, 70, 1.6); FUEGO.luz.position.set(cx, 14, bz+4); esc.add(FUEGO.luz);
  [[bx-8,4.4,bzz-1.2,0xff2020],[bx-8,4.4,bzz+1.2,0x2f6fff]].forEach(function(q){ var b=new THREE.Mesh(new THREE.BoxGeometry(.8,.45,.8), new THREE.MeshBasicMaterial({ color:lin(q[3]) })); b.position.set(q[0],q[1],q[2]); gF.add(b); FUEGO.beac.push(b); });
  var chorro=new THREE.Mesh(new THREE.CylinderGeometry(.18,.5,15,8,1,true), new THREE.MeshBasicMaterial({ color:lin(0x7cc8ff), transparent:true, opacity:.6, depthWrite:false }));
  chorro.position.set(bx-12.5,10.6,bzz-9); chorro.rotation.z=.95; chorro.rotation.y=.55; gF.add(chorro); FUEGO.chorro=chorro;
  ETQ.push({ el:etiqueta('fuego','🔥 FIDALGA'), pos:new THREE.Vector3(cx, 24, bz) });
}
function fuegoPaso(dt, t){ var F=FUEGO; if(!F) return;
  F.llamas.forEach(function(l){ var o=Math.sin(t*l.v+l.f)*.18+Math.sin(t*l.v*2.3+l.f*1.7)*.1, k=1+o;
    l.m.scale.set(l.s*(1-o*.4), l.h*k, l.s*(1-o*.4)); l.m.position.y=l.y+l.h*k/2; l.m.rotation.y=t*.6+l.f; });
  F.humo.forEach(function(h){ h.vida+=dt; var u=h.vida/h.dur;
    if(u>=1){ h.vida=0; u=0; }
    h.m.position.set(h.x0+u*14+Math.sin(t*.7+h.dur)*.9, h.y0+u*34, h.z0-u*6); var s=2+u*7; h.m.scale.set(s,s,s);
    h.m.material.opacity=(u<.1 ? u/.1 : 1-u*.85)*.62; });
  F.luz.intensity=1.8+Math.sin(t*13)*.35+Math.sin(t*7.3)*.3;
  var on=Math.floor(t*3)%2; F.beac[0].visible=!!on; F.beac[1].visible=!on;
  F.chorro.material.opacity=.4+Math.sin(t*20)*.12; F.chorro.scale.x=F.chorro.scale.z=1+Math.sin(t*16)*.12; }

/* ═════════ los camiones del panel: cada lectura los acomoda (sincronizar) ═════════
   Cada línea de la Lista de carga es UN pallet (con sus unidades): 🅿️ por cargar en el carril del camión (PTF o Banzer, según la
   marca del producto), 📥 en Moreno si hay que ir a traerlo, ⛔ sin stock (no hay pallet: no se carga), 🚚 en el camión si está
   tildada. Cuando alguien tilda (acá o en la Lista de carga, en cualquier equipo) el montacargas lo sube. */
var CAMS=[], CAMG={}, SEL=null, TAB='rec', SEGUIR=false, V={ calle:true, noche:false, alertas:true }, D0=null;
function camPorK(k){ for(var i=0;i<CAMS.length;i++) if(CAMS[i].k===k) return CAMS[i]; return null; }
function anden(c){ var A=ALM[c.alm]; return { x:puertaX(A,c.anden), z:A.dock }; }
function hechas(c){ return c.paradas.filter(function(p){ return p.ok; }).length; }
function activo(c){ return !!c && !c.enCalle && !c.anim; }
function contar(c){ var t=0, d=0, ne=0, nf=0, nm=0;
  c.items.forEach(function(it){ if(it.st==='falta'){ nf++; return; } t+=it.u; if(it.st==='camion') d+=it.u; else if(it.st==='moreno') nm++; else ne++; });
  c.total=t; c.dentro=d; c.nEspera=ne; c.nFalta=nf; c.nMoreno=nm; }

/* el carril de espera pintado en el piso, con la placa del camión */
var CARRIL_MAX=5, CARRILES={}, CARRIL_MAT=M(0xf2b705), CARRIL_PISO=M(0xfff6d6);
function carrilBase(dep, pu){ var A=ALM[dep]; return { x:puertaX(A,pu)+4.4, z:A.dock+1.6 }; }
function carril(dep, pu, placa){ var k=dep+'|'+pu, L=CARRILES[k]; if(L && L.placa===placa) return; if(L) esc.remove(L.g);
  var g=new THREE.Group(); esc.add(g); var p0=carrilBase(dep,pu), Lg=CARRIL_MAX*2.3;
  plano(3.2,Lg,p0.x,p0.z+Lg/2-1.15,.045,CARRIL_PISO,g); [-1.6,1.6].forEach(function(o){ plano(.22,Lg,p0.x+o,p0.z+Lg/2-1.15,.05,CARRIL_MAT,g); });
  plano(3.4,.22,p0.x,p0.z-1.15,.05,CARRIL_MAT,g); plano(3.4,.22,p0.x,p0.z+Lg-1.15,.05,CARRIL_MAT,g);
  var cart=new THREE.Mesh(new THREE.PlaneGeometry(3,1), new THREE.MeshBasicMaterial({ map:cartelTex('🅿️ '+placa,'#fff6d6','#14243a',512,170) }));
  cart.position.set(p0.x,1.9,p0.z+Lg-.4); g.add(cart); caja(.12,1.4,.12,POSTE,p0.x,.7,p0.z+Lg-.5,g);
  CARRILES[k]={ g:g, placa:placa }; }
function carrilPos(dep, pu, i){ var b=carrilBase(dep,pu); return { x:b.x, y:Math.floor(i/CARRIL_MAX)*1.3, z:b.z+(i%CARRIL_MAX)*2.3 }; }
['ptf','bz'].forEach(function(k){ var A=ALM[k], g=new THREE.Group(); g.position.set(A.x-A.w/2-2.5,0,A.dock+6); esc.add(g);
  [-2.4,2.4].forEach(function(dx){ caja(.25,4.2,.25,M(0x5d6b7c),dx,2.1,0,g); });
  var p=new THREE.Mesh(new THREE.PlaneGeometry(5.6,1.8), new THREE.MeshBasicMaterial({ map:cartelTex('ZONA DE ESPERA · POR CARGAR','#f2b705','#14243a',1024,300) }));
  p.position.y=4.6; g.add(p); });

/* los pallets de cada línea */
function quitarPallet(it){ if(it.g){ esc.remove(it.g); var i=TOCA.indexOf(it.g); if(i>=0) TOCA.splice(i,1); it.g=null; } }
function cambiar(c, it, st, dep, animar){
  var prev=it.st;
  if(st==='camion'){
    if(animar && prev==='espera' && it.g && activo(c) && it.dep===c.alm){ it.pend=true; it.st='camion'; return; }   // lo sube el montacargas
    quitarPallet(it); it.pend=false; it.st='camion'; it.dep=dep;
    if(animar && prev && CAMG[c.k].visible && !c.enCalle){ flota(CAMG[c.k].position, '+'+it.u+' '+String(it.prod).split(' ')[0]); c.pop=true; }
    return; }
  it.pend=false; it.carry=false; it.st=st; it.dep=dep;
  if(st==='falta'){ quitarPallet(it); return; }
  if(!it.g){ it.g=palletV(null, Math.max(1,Math.min(4,it.u)), 0, 0, 0); it.g.rotation.y=Math.PI/2; it.g.userData={ tipo:'espera', c:c, it:it }; TOCA.push(it.g); }
}
function itemsSync(c, d, animar){
  var vistos={}; c.byKey=c.byKey||{};
  d.lineas.forEach(function(l){ vistos[l.key]=1; var it=c.byKey[l.key];
    if(!it){ it=c.byKey[l.key]={ key:l.key, st:null }; c.items.push(it); }
    it.prod=l.prod; it.u=l.u; it.lugar=l.lugar; it.alm=l.alm;
    var dep = l.st==='moreno' ? 'im' : (l.lugar==='fabrica' ? 'ptf' : 'bz');
    if(it.st!==l.st || (it.dep!==dep && !it.pend)) cambiar(c, it, l.st, dep, animar && it.st!=null);
  });
  c.items=c.items.filter(function(it){ if(vistos[it.key]) return true; quitarPallet(it); delete c.byKey[it.key]; return false; });
  contar(c);
}
/* dónde espera cada pallet: el carril de su camión en ese depósito (la puerta del camión si está ahí; si no, una libre) */
function acomodar(){
  var usadas={ ptf:{}, bz:{}, im:{} };
  CAMS.forEach(function(c){ if(!c.enCalle && !c.anim) usadas[c.alm][c.anden]=c.k; });
  CAMS.forEach(function(c){
    var porDep={};
    c.items.forEach(function(it){ if(it.g && !it.carry) (porDep[it.dep]=porDep[it.dep]||[]).push(it); });
    c.puertas=c.puertas||{};
    Object.keys(porDep).forEach(function(dep){
      var pu;
      if(dep===c.alm && !c.enCalle) pu=c.anden;
      else { pu=c.puertas[dep]; var A=ALM[dep];
        if(pu==null || (usadas[dep][pu] && usadas[dep][pu]!==c.k)){ pu=null; for(var j=A.puertas-1;j>=0;j--){ if(!usadas[dep][j]){ pu=j; break; } } if(pu==null) pu=(c.slot||0)%A.puertas; }
        usadas[dep][pu]=c.k; }
      c.puertas[dep]=pu; carril(dep, pu, c.p);
      porDep[dep].forEach(function(it,i){ var q=carrilPos(dep, pu, i); it.g.position.set(q.x, q.y, q.z); });
    });
  });
}

/* los camiones */
function montaCasa(c){ var a=anden(c); return { x:a.x+7.6, z:a.z+11.5 }; }
function montaDe(c){ if(c.monta) return c.monta; var g=montacargas(); g.userData.c=c; var m={ g:g, c:c, rol:'carga', st:'quieto', t:0, casa:montaCasa(c) }; MONTA.push(m); c.monta=m; return m; }
function llenar(c, pop){ var cg=CAMG[c.k].userData.carga; while(cg.children.length) cg.remove(cg.children[0]);
  var n=c.items.filter(function(it){ return it.st==='camion' && !it.pend; }).length;
  if(c.enCalle && c.paradas.length) n=Math.max(0, n-Math.round(n*hechas(c)/c.paradas.length));
  for(var i=0;i<Math.min(n,6);i++){ var p=palletV(cg, 2, -1.7+(i%3)*1.7, (i>=3?.92:0), 0); p.scale.setScalar(.85); if(pop && i===Math.min(n,6)-1) p.userData.pop=0; }
  c.mini.innerHTML=escH(c.p)+(c.enCalle?' · '+hechas(c)+'/'+c.paradas.length:' · '+c.dentro+'/'+c.total); }
function aparcar(c){ var t=CAMG[c.k], a=anden(c); c.enCalle=false; c.anim=null; c.path=null; t.position.set(a.x,0,a.z); t.rotation.y=-Math.PI/2; t.visible=true;
  c.mini.classList.remove('calle'); var m=montaDe(c); m.casa=montaCasa(c); m.g.visible=true; if(m.st==='quieto'){ m.g.position.set(m.casa.x,0,m.casa.z); m.g.rotation.y=0; } }
function arrancar(c, alGps){ var a=anden(c), A=ALM[c.alm]; c.enCalle=true; c.anim=null; c.pos={ x:a.x, z:A.fila }; c.dir={ x:0, z:1 }; armarRuta(c, c.pos);
  /* al abrir (o al cambiar de día): directo a donde dice el GPS; si sale mientras se mira, maneja hasta ahí (manejar) */
  if(alGps && c.gps){ c.pos={ x:c.gps.x, z:c.gps.z }; c.gpsF=c.gps.x+','+c.gps.z; c.path=[{ x:c.gps.x, z:c.gps.z, gpsFin:true }]; c.pi=0; c.pausa=0; }
  c.mini.classList.add('calle'); if(c.monta){ terminarCarga(c.monta); c.monta.st='quieto'; c.monta.g.visible=false; } CAMG[c.k].visible=V.calle; llenar(c); }
function salir(c){ var t=CAMG[c.k], a=anden(c), A=ALM[c.alm]; if(c.monta){ terminarCarga(c.monta); c.monta.st='quieto'; c.monta.g.visible=false; }
  c.anim={ t:0, dur:1.6, f:function(k){ t.position.z=a.z+k*(A.fila-2.4-a.z); }, fin:function(){ arrancar(c); pintarTodo(); } }; }
/* sin GPS: el recorrido es ESTIMADO, en orden (AM primero, después PM, cada vez el más cerca) y da la vuelta sin marcar nada */
function ordenParadas(c, desde){ var pend=c.paradas.filter(function(s){ return !s.ok && s.pt; }), orden=[], pos=desde;
  ['AM','PM',''].forEach(function(tu){ var gr=pend.filter(function(s){ var t=s.turno.indexOf('PM')>=0?'PM':(s.turno.indexOf('AM')>=0?'AM':''); return t===tu; });
    while(gr.length){ var mi=0, md=1e9; gr.forEach(function(s,i){ var d=Math.abs(s.pt.x-pos.x)+Math.abs(s.pt.z-pos.z); if(d<md){ md=d; mi=i; } }); var s=gr.splice(mi,1)[0]; orden.push(s); pos=s.pt; } });
  return orden; }
function armarRuta(c, desde){ var pts=[], cur={ x:desde.x, z:desde.z };
  ordenParadas(c, cur).forEach(function(s){ var r=ruta(cur, s.pt); r[r.length-1].stop=s; pts=pts.concat(r); cur=s.pt; });
  var a=anden(c), gate={ x:a.x, z:ALM[c.alm].fila }, r2=ruta(cur, gate); r2[r2.length-1].fin=true; pts=pts.concat(r2);
  c.path=pts; c.pi=0; c.pausa=0; c.enParada=null; c.firmaRuta=c.paradas.map(function(s){ return s.id+(s.ok?'✓':'')+(s.pt?s.pt.x+','+s.pt.z:''); }).join('|'); }
function proximaParada(c){ if(c.enCalle && c.path){ for(var i=c.pi;i<c.path.length;i++) if(c.path[i].stop) return c.path[i].stop; }
  return c.paradas.filter(function(s){ return !s.ok; })[0] || null; }

/* ── montacargas: uno por camión en el andén, sube lo que se tilda ── */
var MONTA=[];
['ptf','bz','im'].forEach(function(k, i){ var A=ALM[k], m=montacargas();
  var desde={ x:A.x+A.w/2+3, z:A.fz+3.2 }, hasta={ x:A.x+A.w/2-4, z:A.fz+3.4 }; m.position.set(desde.x,0,desde.z);
  MONTA.push({ g:m, a:desde, b:hasta, t:i*2, st:'paseo' }); });
var SPEED=7;
function irA(m, x, z, st){ var p=m.g.position, dx=x-p.x, dz=z-p.z, d=Math.hypot(dx,dz); m.st=st; m.de={ x:p.x, z:p.z }; m.a={ x:x, z:z }; m.t=0; m.dur=Math.max(.3,d/SPEED);
  if(d>.01) m.g.rotation.y=Math.atan2(dx,dz)+Math.PI; }
function terminarCarga(m){ var it=m.obj; m.g.userData.pallet.visible=false; m.g.userData.horq.position.y=.3; m.obj=null;
  if(!it) return; it.carry=false; var c=m.c;
  if(it.pend){ it.pend=false; quitarPallet(it); llenar(c,true); if(CAMG[c.k].visible && !c.enCalle) flota(CAMG[c.k].position, '+'+it.u+' '+String(it.prod).split(' ')[0]); }
  else if(it.st!=='camion' && !it.g){ cambiar(c, it, it.st, it.dep, false); acomodar(); }   // la destildaron mientras la llevaba: vuelve al carril
  refrescarCarga(c); }
function montaPaso(m, dt){
  if(m.st==='paseo'){ if(quieto) return; m.t+=dt; var u=(m.t%9)/9, ida=u<.5, k=suave(ida?u*2:(u-.5)*2), A=ida?m.a:m.b, B=ida?m.b:m.a;
    m.g.position.set(A.x+(B.x-A.x)*k, 0, A.z+(B.z-A.z)*k); m.g.rotation.y=Math.atan2(B.x-A.x,B.z-A.z)+Math.PI; m.g.userData.pallet.visible=ida; return; }
  var c=m.c, p=m.g.position;
  if(m.st==='quieto'){ m.espera=(m.espera||0)+dt; if(m.espera<.6) return; m.espera=0; if(!activo(c)) return;
    var e=c.items.filter(function(it){ return it.pend && it.g && !it.carry; })[0]; if(!e) return;
    m.obj=e; e.carry=true; irA(m, e.g.position.x+3.1, e.g.position.z, 'ir'); return; }
  if(!activo(c)){ terminarCarga(m); m.st='quieto'; return; }
  m.t+=dt; var k2=Math.min(1,m.t/m.dur);
  if(m.st==='ir'||m.st==='llevar'||m.st==='volver'){ p.x=m.de.x+(m.a.x-m.de.x)*suave(k2); p.z=m.de.z+(m.a.z-m.de.z)*suave(k2); }
  if(m.st==='subir'){ m.g.userData.horq.position.y=.3+.6*k2; }
  if(k2<1) return;
  if(m.st==='ir'){ var e2=m.obj; if(!e2 || !e2.pend || !e2.g){ if(e2) e2.carry=false; m.obj=null; irA(m, m.casa.x, m.casa.z, 'volver'); return; }
    m.g.rotation.y=Math.atan2(e2.g.position.x-p.x, e2.g.position.z-p.z)+Math.PI; quitarPallet(e2); m.g.userData.pallet.visible=true; m.st='subir'; m.t=0; m.dur=.5; acomodar(); refrescarCarga(c); return; }
  if(m.st==='subir'){ var a=anden(c); irA(m, a.x+3.4, a.z-1.2, 'llevar'); return; }
  if(m.st==='llevar'){ terminarCarga(m); irA(m, m.casa.x, m.casa.z, 'volver'); return; }
  if(m.st==='volver'){ m.st='quieto'; m.espera=0; }
}
function lucesAnden(){ Object.keys(LUZ_ANDEN).forEach(function(k){ LUZ_ANDEN[k].forEach(function(m){ m.emissiveIntensity=0; }); });
  CAMS.forEach(function(c){ if(c.enCalle || !LUZ_ANDEN[c.alm] || !c.total) return; var m=LUZ_ANDEN[c.alm][c.anden]; if(!m) return; var listo=c.dentro>=c.total && c.chofer;
    m.emissive=lin(listo?0x22e06a:0xff3b2f); m.emissiveIntensity=1; }); }
function refrescarCarga(c){ contar(c); lucesAnden(); pintarKpis(); if(c===SEL) pintarFicha(); if(TAB==='rec'||TAB==='esp') pintarTab(); pintarTags(); pintarCamiones(); }

/* ═════════ alertas: lo que hay que resolver, sacado del día ═════════ */
var ALERTAS=[];
function cartel(x,z,alto){ var g=new THREE.Group(); g.position.set(x,0,z); esc.add(g); var rojo=Mbrilla(0xc0392b,0xff3b2f);
  cilV(.12,alto,M(0x5d6b7c),0,alto/2,0,g,8); cajaV(2,1.2,.14,rojo,0,alto+.4,0,g); return g; }
var PTF=ALM.ptf, pilaSin=new THREE.Group(); esc.add(pilaSin); palletV(pilaSin,3,PTF.x+24,0,PTF.fz+15); palletV(pilaSin,2,PTF.x+26,0,PTF.fz+15); palletV(pilaSin,3,PTF.x+25,0,PTF.fz+17);
function armarAlertas(D){
  ALERTAS.forEach(function(a){ if(a.etq){ var i=ETQ.indexOf(a.etq); if(i>=0) ETQ.splice(i,1); a.etq.el.remove(); } if(a.obj) esc.remove(a.obj); });
  ALERTAS=[];
  CAMS.forEach(function(c){ if(c.total>0 && !c.chofer && !c.enCalle) ALERTAS.push({ ic:'🧑‍✈️', t:c.p+' sin chofer', d:c.k+' · '+ALM[c.alm].n+' andén '+(c.anden+1)+' · '+c.total+' bulto'+(c.total===1?'':'s'),
    pos:function(){ var a=anden(c); return new THREE.Vector3(a.x,0,a.z); }, k:c, dy:7, ir:c.alm }); });
  var ns=D.sin.stops.length; pilaSin.visible=ns>0 && V.alertas;
  if(ns) ALERTAS.push({ ic:'📦', t:ns+' pedido'+(ns===1?'':'s')+(D.hoy?' de hoy':'')+' sin camión', d:D.sin.stops.slice(0,4).map(function(p){ return 'OC '+(p.oc||'—'); }).join(' · ')+(ns>4?' · …':'')+' · asignalos en Administración',
    pos:function(){ return new THREE.Vector3(PTF.x+25,0,PTF.fz+16); }, dy:5.2, obj:cartel(PTF.x+28,PTF.fz+17,2.8), ir:'ptf', sinCam:true });
  if(D.im && D.im.u>0){ var q=[]; CAMS.forEach(function(c){ c.items.forEach(function(it){ if(it.st==='moreno') q.push(it.prod+' ×'+it.u+' ('+c.p+')'); }); });
    /* (13/10) también se va a buscar a las tiendas (🏬): el cartel nombra los lugares; solo Moreno, como siempre */
    var lugs=Object.keys(D.im.alm||{}), otros=lugs.some(function(a){ return a!=='Moreno'; });
    ALERTAS.push({ ic:'📥', t:(otros ? ('Por traer: '+D.im.u+' de '+lugs.join(' + ')) : ('Moreno: '+D.im.u+' por traer')), d:q.slice(0,3).join(' · ')+(q.length>3?' · …':''),
      pos:function(){ return new THREE.Vector3(ALM.im.x,0,ALM.im.fz+8); }, dy:5.4, obj:cartel(ALM.im.x+9,ALM.im.fz+9,3.2), ir:'im' }); }
  var nf=0; CAMS.forEach(function(c){ nf+=c.nFalta||0; });
  if(nf) ALERTAS.push({ ic:'⛔', t:nf+' línea'+(nf===1?'':'s')+' sin stock', d:'✗ no hay: avisá al cliente y reprogramá la entrega', pos:function(){ return new THREE.Vector3(PTF.x+6,0,PTF.fz+3); }, dy:7.5, ir:'ptf' });
  ALERTAS.forEach(function(a){ a.etq={ el:etiqueta('alerta', '⚠️ '+escH(a.t)), pos:a.pos().clone().setY(a.dy), alerta:true, oculta:!V.alertas }; ETQ.push(a.etq);
    if(a.obj){ a.obj.visible=V.alertas; a.obj.children[1].material.emissiveIntensity=V.noche?1:.35; } });
}

/* 🛰️ dónde lo pone el GPS: en la calle, o en un depósito ('ptf', 'banzer', 'moreno'). UNA cuenta para sincronizar y gpsAlDia (si no,
   la escena se rearmaba cada 1,5 s creyendo que algo cambió). */
function gpsLugar(g){ var enMor=!!(g && g.enMor); return { calle:!!(g && g.f && !enMor), dep:g ? (enMor ? 'moreno' : (!g.f ? (g.depId||'') : '')) : '' }; }
/* ═════════ sincronizar: la escena se pone igual a lo que dice el panel ═════════ */
function sincronizar(D, animar){
  D0=D;
  D.cams.forEach(function(d){
    var c=camPorK(d.k);
    if(!c){ c={ k:d.k, p:d.p, col:d.col, items:[], byKey:{}, paradas:[], anden:0, slot:CAMS.length }; CAMS.push(c);
      var t=camion(c); CAMG[c.k]=t; c.mini=etiqueta('mini', escH(c.p)); ETQ.push({ el:c.mini, obj:t, dy:5.2 }); }
    c.alm=d.alm; c.chofer=d.chofer; c.paradas=d.stops; c.salio=d.salio; c.salioMano=d.salioMano; c.conPedidos=d.conPedidos;
    c.gps=d.gps; c.volvio=!!(d.gps && !d.gps.f && d.gps.vu); c.gpsRuta=d.gpsRuta||[]; c.gpsParadas=d.gpsParadas||[];
    /* (13/10, dueño: «los 4 camiones salen en el mismo lugar, no en vivo») con GPS, el camión está DONDE DICE EL GPS: lejos de PTF y de
       Banzer → en la calle, en su punto; en PTF o en Banzer → en ese depósito. Sin GPS, como antes («Ya salió» y el recorrido estimado). */
    /* (13/10, dueño: «¿por qué está parado ese camión? Está atrás de la fábrica en plena calle») a ≤ 400 m de Moreno el camión ESTÁ en
       Moreno (fue a recoger): se estaciona en su andén. Antes contaba como «en la calle» y quedaba en la calle más cercana a su punto. */
    var GL=gpsLugar(d.gps); c.gpsCalle=GL.calle; c.gpsDep=GL.dep;
    if(c.gpsDep) c.alm=(c.gpsDep==='banzer') ? 'bz' : (c.gpsDep==='moreno') ? 'im' : 'ptf';   // 🛰️ (§4ko) el GPS dice dónde está: a su andén
  });
  /* los andenes: salteados (0, 2, 4…) mientras alcancen, así cada camión tiene su carril de espera al costado sin pisar al vecino */
  ['ptf','bz','im'].forEach(function(k){ var L=CAMS.filter(function(c){ return c.alm===k; }), np=ALM[k].puertas, salto=L.length<=Math.ceil(np/2);
    L.forEach(function(c,i){ var pu=salto ? i*2 : i%np; if(c.anden!==pu && !c.enCalle){ c.anden=pu; c.movido=true; } else c.anden=pu; }); });
  D.cams.forEach(function(d){ itemsSync(camPorK(d.k), d, animar); });
  CAMS.forEach(function(c){
    var calle=c.gps ? c.gpsCalle : (c.salio && !c.volvio);
    if(calle){
      if(!c.enCalle && !c.anim){ if(animar && CAMG[c.k].visible) salir(c); else arrancar(c, !!c.gpsCalle); }
      else if(c.enCalle){ var fr=c.paradas.map(function(s){ return s.id+(s.ok?'✓':'')+(s.pt?s.pt.x+','+s.pt.z:''); }).join('|'); if(fr!==c.firmaRuta) armarRuta(c, c.pos); }
    } else if(c.enCalle || c.anim || c.movido || !c.monta){ aparcar(c); c.movido=false; }
    if(c.enCalle) CAMG[c.k].visible=V.calle;
    llenar(c, c.pop); c.pop=false;
  });
  acomodar();
  if(!SEL || !camPorK(SEL.k)) SEL=CAMS.filter(function(c){ return c.alm==='ptf' && !c.enCalle && c.total>c.dentro; })[0] || CAMS.filter(function(c){ return !c.enCalle && c.total>c.dentro; })[0] || CAMS.filter(function(c){ return c.total>0 || c.enCalle; })[0] || CAMS[0] || null;
  armarAlertas(D);
  pintarTodo();
}

/* los nombres de lo que espera, solo del camión elegido */
var TAGS=[];
function pintarTags(){ TAGS.forEach(function(e){ var i=ETQ.indexOf(e); if(i>=0) ETQ.splice(i,1); e.el.remove(); }); TAGS=[];
  var c=SEL; if(!c || c.enCalle) return;
  var L=c.items.filter(function(it){ return it.g && (it.st==='espera' || it.st==='moreno' || it.pend); });
  var por={}; L.forEach(function(it){ (por[it.dep]=por[it.dep]||[]).push(it); });
  Object.keys(por).forEach(function(dep){ var e=por[dep][0], n=por[dep].length;
    var t={ el:etiqueta('tag'+(dep===c.alm?' sig':''), (dep==='im'?'📥 ':dep==='bz'&&c.alm!=='bz'?'🏪 ':'🛺 ')+escH(e.prod)+' ×'+e.u+(n>1?' <span style="opacity:.8">+'+(n-1)+'</span>':'')), pos:e.g.position.clone().setY(2.3+e.g.position.y) };
    ETQ.push(t); TAGS.push(t); }); }
/* los pines de las paradas: de los camiones en la calle; los nombres, los del camión elegido */
var PINES=[];
function pintarPines(){ PINES.forEach(function(p){ esc.remove(p.g); if(p.e){ var i=ETQ.indexOf(p.e); if(i>=0) ETQ.splice(i,1); p.e.el.remove(); } }); PINES=[];
  if(!V.calle) return;
  CAMS.forEach(function(c){ if(!c.enCalle && c!==SEL) return; c.paradas.forEach(function(s){ if(!s.pt) return; if(s.ok && c!==SEL) return;
    var g=pin(s.ok?0x15803d:c.col); g.position.set(s.pt.x+3, 0, s.pt.z-7.5); var o={ g:g };
    if(c===SEL){ o.e={ el:etiqueta('pin'+(s.ok?' ok':''), (s.ok?'✅ ':'')+(s.rpt?'🏪 '+escH(s.n.split(' · ')[0]):escH(s.n)+(s.z?' · '+escH(s.z):''))), pos:new THREE.Vector3(s.pt.x+3,6.4,s.pt.z-7.5) }; ETQ.push(o.e); }
    PINES.push(o); }); }); }

/* ═════════ la ficha del camión elegido, las alertas, los números y las pestañas ═════════ */
function estadoChip(c){
  if(c.enCalle) return '<span class="chip az">'+(c.salioMano?'🛣️':'🛰️')+(c.salio?' Salió '+escH(c.salio):' En la calle · lo dice el GPS')+' · '+hechas(c)+' de '+c.paradas.length+' entregados</span>';
  if(c.gpsDep==='moreno') return '<span class="chip">📥 En Moreno · lo dice el GPS'+(c.total?' · '+c.dentro+'/'+c.total+' cargado':'')+'</span>';
  if(!c.total && !c.items.length) return '<span class="chip">Sin carga '+(D0&&D0.hoy?'hoy':'para ese día')+'</span>';
  if(!c.total) return '<span class="chip ro">⛔ Todo sin stock</span>';
  if(c.dentro>=c.total && !c.chofer) return '<span class="chip ro">🧑‍✈️ Cargado, sin chofer</span>';
  if(c.dentro>=c.total) return '<span class="chip">✅ Listo para salir</span>';
  return '<span class="chip am">⏳ Cargando '+c.dentro+'/'+c.total+(!c.chofer?' · sin chofer':'')+'</span>';
}
var ITEM_TX={ camion:function(){ return '🚚 en el camión'; }, pend:function(){ return '🛺 subiendo'; },
  espera:function(it){ return it.dep==='bz' ? '🏪 por cargar en Banzer' : '🅿️ por cargar en PTF'; },
  moreno:function(it){ return '📥 traer de '+escH(it.alm||'Moreno'); }, falta:function(){ return '⛔ sin stock'; } };
function pintarFicha(){
  var el=document.getElementById('pt-ficha'); if(!el) return; var c=SEL;
  if(!c){ el.innerHTML='<div class="vacio">No hay camiones cargados en el panel.</div>'; return; }
  var A=ALM[c.alm], hoy=!!(D0 && D0.hoy);
  var h='<div class="cab"><div class="ic">🚚</div><div><small>Camión · '+A.n+' andén '+(c.anden+1)+'</small><b>'+escH(c.k)+'<span class="placa">'+escH(c.p)+'</span></b></div></div>'+estadoChip(c);
  if(c.enCalle){
    h+='<div class="filas"><div><span>Chofer</span><b>'+escH(c.chofer||'—')+'</b></div><div><span>Salió</span><b>'+escH(c.salio)+(c.salioMano?' (marcado en el panel)':' (lo dice el GPS)')+'</b></div>'+
      (c.gps?'<div><span>🛰️ GPS</span><b>'+escH(c.gps.donde)+' · '+c.gps.v+' km/h'+(c.gps.hace?' · '+escH(c.gps.hace):'')+'</b></div>':'')+'</div>'+
      '<div class="paradas">'+c.paradas.map(function(p){ var aca=c.enParada===p, prox=proximaParada(c)===p;
        return '<div data-id="'+escH(p.id)+'" title="Tocá para ver el pedido"><span>'+(p.ok?'✅':(aca?'🚚':'○'))+'</span><span><b>'+escH(p.n)+'</b><small>'+escH(p.z)+(p.pt?'':' · sin ubicación')+'</small></span><small>'+(p.ok?'entregado':(prox?'próxima':''))+'</small></div>'; }).join('')+'</div>'+
      '<button class="boton" type="button" id="pt-b-seguir">'+(SEGUIR?'📷 Dejar de seguirlo':'📷 Seguirlo con la cámara')+'</button>'+
      (hoy && c.salioMano?'<button class="boton gris" type="button" id="pt-b-volvio">↩️ Deshacer «salió»</button>':'')+
      (c.gps ? '<div class="nota-gps">🛰️ El camión está <b>donde dice el GPS</b> (se actualiza cada minuto). Las paradas no se marcan solas: el <b>✅ entregado</b> lo marca logística en el cierre de entregas.</div>'
             : '<div class="nota-gps">🛣️ Recorrido <b>estimado</b>: sin GPS, el camión pasa por sus paradas en orden. El <b>✅ entregado</b> lo marca logística en el cierre de entregas.</div>');
  } else {
    var pct=c.total?Math.round(100*c.dentro/c.total):0;
    h+='<div class="barrita"><i style="width:'+pct+'%"></i></div>'+
      '<div class="filas"><div><span>Chofer</span><b>'+(c.chofer?escH(c.chofer):(c.conPedidos?'<span style="color:var(--rojo)">sin asignar</span>':'—'))+'</b></div><div><span>Carga</span><b>'+c.dentro+' de '+c.total+' bultos</b></div><div><span>Paradas</span><b>'+c.paradas.length+'</b></div></div>';
    if(c.items.length){
      h+='<div class="prods">'+c.items.map(function(it){ var info=ITEM_TX[it.pend?'pend':it.st](it);
        return '<label><input type="checkbox" data-key="'+escH(it.key)+'"'+(it.st==='camion'?' checked':'')+(it.st==='falta'?' disabled':'')+'><span style="flex:1;min-width:0">'+escH(it.prod)+' <b>×'+it.u+'</b> <small style="color:var(--suave)">· '+info+'</small></span></label>'; }).join('')+'</div>'+
        '<div class="nota-gps">✅ Cada tilde es <b>la misma de la Lista de carga</b>: tildar acá lo marca allá y al revés. El montacargas sube al camión lo que se tilda.</div>';
      if(c.paradas.length) h+='<div class="paradas">'+c.paradas.map(function(p){ return '<div data-id="'+escH(p.id)+'" title="Tocá para ver el pedido"><span>'+(p.rpt?'🏪':'📍')+'</span><span><b>'+escH(p.n)+'</b><small>'+escH(p.z)+(p.turno?' · '+escH(p.turno):'')+'</small></span><small></small></div>'; }).join('')+'</div>';
      if(hoy) h+='<button class="boton" type="button" id="pt-b-salio">🚚 Ya salió</button>';
    } else h+='<div class="vacio">Sin pedidos '+(hoy?'hoy':'para ese día')+'.</div>';
  }
  el.innerHTML=h;
  [].forEach.call(el.querySelectorAll('input[data-key]'), function(inp){ inp.onchange=function(){ try{ setCargaChk(inp.getAttribute('data-key'), inp.checked); }catch(e){ console.error(e); } PT.refrescar(true); }; });
  [].forEach.call(el.querySelectorAll('.paradas [data-id]'), function(d){ d.onclick=function(){ if(typeof showPedidoModal==='function') showPedidoModal(d.getAttribute('data-id')); }; });
  var b=document.getElementById('pt-b-salio'); if(b) b.onclick=function(){ try{ camionSalioMarcar(c.k, true); }catch(e){ console.error(e); } PT.refrescar(true); };
  var b1=document.getElementById('pt-b-volvio'); if(b1) b1.onclick=function(){ try{ camionSalioMarcar(c.k, false); }catch(e){ console.error(e); } PT.refrescar(true); };
  var b2=document.getElementById('pt-b-seguir'); if(b2) b2.onclick=function(){ SEGUIR=!SEGUIR; pintarFicha(); };
}
function pintarAlertas(){ var el=document.getElementById('pt-alertas'); if(!el) return; el.hidden=!V.alertas || !ALERTAS.length; if(el.hidden) return;
  el.innerHTML='<h4>⚠️ Para resolver ('+ALERTAS.length+')</h4>'+ALERTAS.map(function(a,i){ return '<button type="button" class="al" data-i="'+i+'"><span class="ic">'+a.ic+'</span><span><b>'+escH(a.t)+'</b><small>'+escH(a.d)+'</small></span></button>'; }).join('');
  [].forEach.call(el.querySelectorAll('.al'), function(b){ b.onclick=function(){ var a=ALERTAS[+b.dataset.i], p=a.pos(); SEGUIR=false; volar(p.x,p.z,1.2); marcarIr(a.ir); if(a.k) elegir(a.k); if(a.sinCam) toast('📦 Asignales camión en Administración → camiones, ficha «Sin vehículo».'); }; }); }
function pintarKpis(){
  var tot=0, den=0, calle=0, por=0, fal=0; CAMS.forEach(function(c){ if(c.enCalle){ calle++; return; } tot+=c.total; den+=c.dentro; c.items.forEach(function(it){ if(it.st==='espera'||it.st==='moreno') por+=it.u; if(it.st==='falta') fal+=it.u; }); });
  ((D0 && D0.sin && D0.sin.lineas) || []).forEach(function(l){ if(l.st==='espera'||l.st==='moreno') por+=l.u; if(l.st==='falta') fal+=l.u; });   // (13/10) lo de los pedidos sin camión también
  var k=[['🅿️','Por cargar',por],['⛔','Sin stock',fal],['🛣️','En la calle',calle],['✅','Cargado',(tot?Math.round(100*den/tot):100)+'%']];
  if(!V.calle) k.splice(2,1);
  var h=k.map(function(x){ return '<div class="kpi"><div class="ic">'+x[0]+'</div><div><small>'+x[1]+'</small><b>'+x[2]+'</b></div></div>'; }).join('');
  if(V.alertas) h+='<div class="kpi rojo"><div class="ic">⚠️</div><div><small>Para resolver</small><b>'+ALERTAS.length+'</b></div></div>';
  document.getElementById('pt-kpis').innerHTML=h; var nc=document.getElementById('pt-n-calle'); if(nc) nc.textContent=calle; lucesAnden(); }
function tabRec(){ var c=SEL; if(!c) return '<div class="vacio">—</div>';
  var n=c.paradas.length, ok=hechas(c), conSt=c.items.filter(function(it){ return it.st!=='falta'; }).length, p0=proximaParada(c);
  var etapa=!n?0:c.enCalle?(ok>=n?5:3.5):(c.total&&c.dentro>=c.total?2.6:(c.dentro?2:1.5));
  var P=[['📋','Pedidos',n?String(n):'—'],['📦','Con stock',c.items.length?conSt+' de '+c.items.length:'—'],[c.dentro+'/'+c.total,'Cargando',''],['🛣️','Salió',c.salio||'—'],['🏠','Entregado',n?ok+' de '+n:'—']];
  return '<div style="font-family:var(--f-tit);font-size:.86rem;margin-bottom:10px">'+escH(c.p)+(p0?' · próxima parada: '+escH(p0.n)+' <span style="color:var(--suave);font-family:var(--f-txt);font-weight:600">· '+escH(p0.z)+'</span>':' · sin paradas pendientes')+'</div>'+
    '<div class="pasos"><div class="lleno" style="width:'+(Math.min(etapa,4)/4*80)+'%"></div>'+P.map(function(p,i){
    var cl=i<Math.floor(etapa)?'ok':(i===Math.floor(etapa)?'ya':''), tx=i===2?p[0]:(cl==='ok'?'✓':p[0]);
    return '<div class="paso '+cl+'"><i>'+tx+'</i><b>'+p[1]+'</b>'+escH(p[2])+'</div>'; }).join('')+'</div>'; }
function tabCalle(){ var L=CAMS.filter(function(c){ return c.enCalle; });
  if(!L.length) return '<div class="vacio">Ningún camión marcado «Ya salió» '+(D0&&D0.hoy?'hoy':'ese día')+'.</div>';
  return '<div class="rutas">'+L.map(function(c){ var n=c.paradas.length||1, hc=hechas(c), pos=function(i){ return 6+(i+1)/(n+1)*88; }, prox=proximaParada(c);
    return '<div class="ruta" data-k="'+escH(c.k)+'"><div class="t"><b>'+escH(c.p)+' · '+escH(c.chofer||'—')+'</b><span class="chip az">'+hc+' de '+c.paradas.length+' ✅</span></div>'+
      '<div class="linea"><i class="pt base" style="left:6%"></i><div class="hecho" style="width:'+Math.max(0,pos(hc-1)-6)+'%"></div>'+
      c.paradas.map(function(p,i){ return '<i class="pt'+(p.ok?' ok':'')+'" style="left:'+pos(i)+'%" title="'+escH(p.n)+'"></i>'; }).join('')+
      '<span class="cam" style="left:'+(hc>=n?pos(n-1):(pos(hc-1)+pos(hc))/2)+'%">🚚</span></div>'+
      '<div class="p">'+(prox?'Próxima: <b>'+escH(prox.n)+'</b> · '+escH(prox.z):'<b>Vuelve a '+ALM[c.alm].n+'</b>')+'</div>'+
      '<div class="p">Salió '+escH(c.salio)+' · '+(c.gps?('🛰️ '+escH(c.gps.donde)+' · '+c.gps.v+' km/h'):'≈ recorrido estimado (sin GPS)')+' · tocá para verlo</div></div>'; }).join('')+'</div>'; }
function tabAnd(){ if(!CAMS.length) return '<div class="vacio">—</div>';
  return '<div class="and">'+CAMS.map(function(c){ var A=ALM[c.alm], est=c.enCalle?'🛣️ '+hechas(c)+'/'+c.paradas.length:!c.total&&!c.items.length?'— vacío':(c.total&&!c.chofer?'⚠️ sin chofer':c.total&&c.dentro>=c.total?'✅ listo':(c.dentro+'/'+c.total));
  return '<div class="a" data-k="'+escH(c.k)+'"><i class="dot" style="background:#'+new THREE.Color(c.col).getHexString()+'"></i><div><b>'+A.n+' · andén '+(c.anden+1)+'</b><small>'+escH(c.p)+' · '+escH(c.chofer||'sin chofer')+'</small></div><b>'+est+'</b></div>'; }).join('')+'</div>'; }
function tabEsp(){ var L=CAMS.filter(function(c){ return !c.enCalle && c.items.length; }), S=(D0 && D0.sin) || { stops:[], lineas:[] };
  if(!L.length && !S.lineas.length) return '<div class="vacio">Nada para cargar '+(D0&&D0.hoy?'hoy':'ese día')+'.</div>';
  /* (13/10, dueño: «por cargar sale vacío») lo de los pedidos sin camión, primero: está por cargar y le falta el camión */
  var sinH=S.lineas.length ? ('<div class="ruta sin"><div class="t"><b>⚠️ Sin camión · '+S.stops.length+' pedido'+(S.stops.length===1?'':'s')+'</b><span class="chip am">asignales camión en Administración</span></div>'+
    '<div class="p" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">'+
    [['🏭 PTF / 🏪 Banzer', function(l){ return l.st==='espera'; }], ['📥 Traer de Moreno', function(l){ return l.st==='moreno'; }], ['⛔ Sin stock', function(l){ return l.st==='falta'; }]].map(function(g){
      var x=S.lineas.filter(g[1]); return '<div><b>'+g[0]+'</b>'+(x.length?x.map(function(l){ return '<div>· '+escH(l.prod)+' ×'+l.u+(l.lugar!=='fabrica'&&l.st==='espera'?' 🏪':'')+'</div>'; }).join(''):'<div style="color:var(--suave)">—</div>')+'</div>'; }).join('')+
    '</div></div>') : '';
  return '<div class="rutas">'+sinH+L.map(function(c){ function lista(f){ var x=c.items.filter(f); return x.length?x.map(function(it){ return '<div>· '+escH(it.prod)+' ×'+it.u+(it.st==='moreno'?' 📥':it.dep==='bz'&&c.alm!=='bz'?' 🏪':'')+'</div>'; }).join(''):'<div style="color:var(--suave)">—</div>'; }
    return '<div class="ruta" data-k="'+escH(c.k)+'"><div class="t"><b>'+escH(c.p)+' · '+ALM[c.alm].n+'</b><span class="chip'+(c.total&&c.dentro>=c.total?'':' am')+'">'+c.dentro+'/'+c.total+' cargado</span></div>'+
      '<div class="p" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px"><div><b>🅿️ Por cargar</b>'+lista(function(it){ return it.st==='espera'||it.st==='moreno'||it.pend; })+'</div><div><b>⛔ Sin stock</b>'+lista(function(it){ return it.st==='falta'; })+'</div><div><b>🚚 En el camión</b>'+lista(function(it){ return it.st==='camion'&&!it.pend; })+'</div></div></div>'; }).join('')+'</div>'; }
/* 🛰️ (13/10, dueño: «falta la pestaña recorrido gps y "lo que dijo el gps"») */
function gpsQuieto(){ return D0 && D0.hoy ? '' : '<div class="vacio">El GPS dice lo de HOY: tocá «Hoy» arriba.</div>'; }
function tabGpsRec(){ var q=gpsQuieto(); if(q) return q;
  var conG=CAMS.filter(function(c){ return c.gps || (c.gpsRuta && c.gpsRuta.length); });
  if(!conG.length) return '<div class="vacio">'+(D0.dia.gpsVivo?'El GPS todavía no mandó recorridos hoy.':'Sin noticias del GPS: el panel lo lee cada minuto (de 6:00 a 21:00, lunes a sábado).')+'</div>';
  var c=(SEL && conG.indexOf(SEL)>=0) ? SEL : conG[0];
  var chips='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">'+conG.map(function(x){ return '<button type="button" class="chip'+(x===c?' az':'')+'" data-k="'+escH(x.k)+'" style="cursor:pointer;border:0">🚚 '+escH(x.p)+'</button>'; }).join('')+'</div>';
  var R=c.gpsRuta||[], km=0; for(var i=1;i<R.length;i++){ var dx=R[i].x-R[i-1].x, dz=R[i].z-R[i-1].z; km+=Math.sqrt(dx*dx+dz*dz); }
  var pasos=[];
  if(c.salio) pasos.push({ ic:c.salioMano?'🛣️':'🛰️', h:c.salio, t:'Salió'+(c.salioMano?' (marcado en el panel)':' (lo dice el GPS)') });
  (c.gpsParadas||[]).forEach(function(s){ pasos.push({ ic:s.cli?'📍':'🛑', h:s.h0, t:(s.abierta?'Parado hace ':'Se paró ')+s.dur+(s.cli?' · cerca de <b>'+escH(s.cli)+'</b>'+(s.oc?' · '+escH(s.oc):'')+' ('+s.m+' m)':' · sin pedido de hoy cerca'+(s.base?' · '+escH(s.base):'')) }); });
  if(c.gps && c.gps.vu) pasos.push({ ic:'🏁', h:c.gps.vu, t:'Volvió' });
  pasos.sort(function(a,b){ return a.h<b.h?-1:a.h>b.h?1:0; });
  var ahora=c.gps ? ('<b>Ahora:</b> '+escH(c.gps.donde)+' · '+c.gps.v+' km/h'+(c.gps.m?'':' · motor apagado')+(c.gps.hace?' · reporte '+escH(c.gps.hace):'')) : 'Sin posición del GPS en los últimos 10 minutos.';
  return chips+'<div class="log">'+(pasos.length?pasos.map(function(p){ return '<div><time>'+escH(p.h)+'</time><span>'+p.ic+' '+p.t+'</span></div>'; }).join(''):'<div><time>—</time><span>Hoy todavía no salió ni se paró en la calle.</span></div>')+'</div>'+
    '<div class="nota-gps" style="margin-top:8px">'+ahora+(R.length>1?' · rastro de '+R.length+' reportes (la línea de su color en la ciudad)':'')+'. Una parada es '+4+' min o más quieto fuera de PTF'+(D0.dia.gpsSrv?', Banzer y Moreno':' y Banzer')+'; «cerca» = a menos de 300 m de un pedido suyo de hoy (📍). El ✅ entregado lo sigue marcando logística.</div>'; }
function tabGps(){ var q=gpsQuieto(); if(q) return q;
  var L=D0.dia.gpsLog||[];
  return '<div class="log">'+(L.length?L.map(function(e){ return '<div data-k="'+escH(e.k)+'" style="cursor:pointer"><time>'+escH(e.h)+'</time><span>'+e.ic+' '+e.x+'</span></div>'; }).join(''):'<div><time>—</time><span>'+(D0.dia.gpsVivo?'El GPS todavía no dijo nada de hoy: ni salidas, ni vueltas, ni paradas.':'Sin noticias del GPS en los últimos 10 minutos.')+'</span></div>')+'</div>'+
    '<div class="nota-gps" style="margin-top:8px">📡 '+(D0.dia.gpsVivo?'El GPS se lee cada minuto':'⚠️ Sin noticias del GPS')+'. «Salió» = 15 min seguidos lejos de PTF y de Banzer'+(D0.dia.gpsSrv?
      '; ir a recoger a Moreno o pasar de un depósito al otro no cuenta. Las paradas y este registro los anota el servidor cada minuto, para todos (aunque nadie tenga el panel abierto).':
      '. Las paradas salen del recorrido que este aparato fue leyendo'+(D0.dia.gpsDesde?' (desde las '+escH(D0.dia.gpsDesde)+')':'')+'.')+'</div>'; }
function pintarTab(){
  [].forEach.call(document.querySelectorAll('#pt-tabs button[data-t]'), function(b){ var t=b.dataset.t; b.hidden=(t==='calle'&&!V.calle); b.classList.toggle('on', t===TAB); });
  if(TAB==='calle'&&!V.calle) TAB='rec';
  document.getElementById('pt-tab-cuerpo').innerHTML=TAB==='rec'?tabRec():TAB==='esp'?tabEsp():TAB==='calle'?tabCalle():TAB==='gpsr'?tabGpsRec():TAB==='gps'?tabGps():tabAnd();
  [].forEach.call(document.querySelectorAll('#pt-tab-cuerpo [data-k]'), function(d){ d.onclick=function(){ var c=camPorK(d.dataset.k); if(c) elegir(c, true); }; });
}
/* 🛰️ (13/10) el rastro del GPS del camión elegido: una línea de su color por donde pasó hoy y un 🛑 en cada parada */
var RASTRO=null;
function pintarRastro(){
  if(RASTRO){ esc.remove(RASTRO); RASTRO.traverse(function(o){ if(o.geometry) o.geometry.dispose(); }); RASTRO=null; }
  var c=SEL; if(!c || !c.gpsRuta || c.gpsRuta.length<2 || !(D0 && D0.hoy)) return;
  RASTRO=new THREE.Group(); RASTRO.name='rastro-gps';
  var pts=c.gpsRuta.map(function(p){ return new THREE.Vector3(p.x, .55, p.z); });
  RASTRO.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color:c.col, transparent:true, opacity:.9 })));
  (c.gpsParadas||[]).forEach(function(s){ var m=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.1,.5,14), new THREE.MeshBasicMaterial({ color:s.cli?0x16a34a:0xdc2626 })); m.position.set(s.x,.6,s.z); RASTRO.add(m); });
  esc.add(RASTRO); c.rastroN=c.gpsRuta.length;
}
function pintarTodo(){ pintarCamiones(); pintarFicha(); pintarAlertas(); pintarKpis(); pintarTab(); pintarTags(); pintarPines(); pintarLinea(); pintarRastro(); }
document.getElementById('pt-tabs').onclick=function(e){ var b=e.target.closest('button'); if(!b || !b.dataset.t) return; PT.plegar('pt-abajo', false); TAB=b.dataset.t; pintarTab(); };
function elegir(c, mover){ if(!c) return; var antes=SEL; SEL=c; if(antes!==c) SEGUIR=false; pintarCamiones(); pintarFicha(); if(TAB==='rec'||TAB==='gpsr') pintarTab(); pintarTags(); pintarPines(); pintarLinea(); pintarRastro();
  var t=CAMG[c.k]; t.userData.salto=0;
  if(mover){ volar(t.position.x, t.position.z, 1.1); marcarIr(c.enCalle?null:c.alm); if(c.enCalle){ SEGUIR=true; pintarFicha(); } } }

/* ── la cámara ── */
var DEST=null;
function volar(x,z,zoom){ DEST={ x0:ctl.target.x, z0:ctl.target.z, x:x, z:z, zm0:cam.zoom, zm:zoom||cam.zoom, t:0 }; }
var IR={ ptf:function(){ return [ALM.ptf.x-8, ALM.ptf.fz+9, 1.9]; }, bz:function(){ return [ALM.bz.x-4, ALM.bz.fz+9, 1.9]; }, im:function(){ return [ALM.im.x, ALM.im.fz+8, 1.7]; }, todo:function(){ return [35,245, Z/470]; }, centro:function(){ return [PLAZA.x+2, PLAZA.z-6, 1.25]; } };
function pintarCamiones(){ var el=document.getElementById('pt-ir-cam'); if(!el) return;
  el.innerHTML=CAMS.map(function(c){ var e=c.enCalle?'🛣️':(!c.total&&!c.items.length)?'⚪':(c.total&&!c.chofer)?'⚠️':(c.total&&c.dentro>=c.total)?'✅':'⏳';
    return '<button type="button" data-cam="'+escH(c.k)+'" class="'+(SEL===c?'on':'')+'">'+e+' '+escH(c.p)+' <small style="opacity:.75">'+(c.enCalle?hechas(c)+'/'+c.paradas.length:c.dentro+'/'+c.total)+'</small></button>'; }).join(''); }
function marcarIr(k){ [].forEach.call(document.querySelectorAll('#pt-ir button[data-ir]'), function(b){ b.classList.toggle('on', b.dataset.ir===k); }); }
document.getElementById('pt-ir').onclick=function(e){ var b=e.target.closest('button'); if(!b) return; if(b.dataset.cam){ elegir(camPorK(b.dataset.cam), true); return; } if(!b.dataset.ir) return;
  var v=IR[b.dataset.ir](); SEGUIR=false; volar(v[0],v[1],v[2]); marcarIr(b.dataset.ir); };
/* (13/10) `pt-toast`, no `toast`: la clase `.toast` de la página (abajo, fija, `bottom:24px`) se sumaba a la de acá (`top:118px`)
   y el aviso se estiraba de arriba hasta abajo: un recuadro oscuro enorme en medio de la ciudad (captura del dueño, 12:36). */
var tt=null; function toast(txt){ var d=OV.querySelector('.pt-toast'); if(!d){ d=document.createElement('div'); d.className='pt-toast'; OV.querySelector('.pt-app').appendChild(d); }
  d.innerHTML=txt; d.style.opacity=1; clearTimeout(tt); tt=setTimeout(function(){ d.style.opacity=0; }, 3800); }

/* manejar por la calle: por la derecha, frena en cada cliente (sin marcar nada: el ✅ es de logística) y da la vuelta */
function manejar(c, dt){ var t=CAMG[c.k];
  /* 🛰️ (§4ko) con GPS y en la calle: va por las calles hasta donde dice el GPS y se queda ahí hasta el próximo reporte */
  if(c.gps && c.gps.f){ var fk=c.gps.x+','+c.gps.z;
    if(c.gpsF!==fk && c.pos){ c.gpsF=fk; var rg=ruta({ x:c.pos.x, z:c.pos.z }, { x:c.gps.x, z:c.gps.z }); if(rg.length) rg[rg.length-1].gpsFin=true; c.path=rg; c.pi=0; c.pausa=0; c.enParada=null; } }
  else if(c.gpsF){ c.gpsF=null; if(c.pos) armarRuta(c, c.pos); }
  if(!c.path) return;
  if(c.pausa>0){ c.pausa-=dt; } else if(!quieto){
    var obj=c.path[c.pi]; if(!obj){ if(!c.gpsF) armarRuta(c, c.pos); return; }
    var dx=obj.x-c.pos.x, dz=obj.z-c.pos.z, d=Math.hypot(dx,dz), paso=11*dt;
    if(d>.01){ c.dir={ x:dx/d, z:dz/d }; }
    if(d<=paso){ c.pos.x=obj.x; c.pos.z=obj.z;
      if(obj.gpsFin){ c.enParada=null; }
      else {
        if(obj.stop){ c.pausa=2.4; c.enParada=obj.stop; if(SEL===c) pintarFicha(); } else c.enParada=null;
        if(obj.fin){ c.pausa=3; armarRuta(c, { x:c.pos.x, z:c.pos.z }); if(SEL===c){ pintarLinea(); if(TAB==='rec') pintarTab(); } return; }
        c.pi++; if(SEL===c) pintarLinea();
      }
    } else { c.pos.x+=dx/d*paso; c.pos.z+=dz/d*paso; } }
  var ox=-c.dir.z*2.6, oz=c.dir.x*2.6; t.position.set(c.pos.x+ox, 0, c.pos.z+oz);
  var meta=Math.atan2(-c.dir.z, c.dir.x), dif=meta-t.rotation.y; dif=((dif+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI; t.rotation.y+=dif*Math.min(1,dt*8); t.rotation.y=((t.rotation.y+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;
  if(LINEA && SEL===c){ var pos=LINEA.geometry.attributes.position; pos.setXYZ(0,c.pos.x,.5,c.pos.z); pos.needsUpdate=true; }
}

/* ═════════ botones de vista ═════════ */
function aplicarVistas(){ ponerNoche(V.noche);
  ALERTAS.forEach(function(a){ if(a.obj) a.obj.visible=V.alertas; if(a.etq) a.etq.oculta=!V.alertas; }); pilaSin.visible=V.alertas && !!(D0 && D0.sin.stops.length);
  CAMS.forEach(function(c){ if(c.enCalle) CAMG[c.k].visible=V.calle; });
  pintarTodo(); }
document.getElementById('pt-vistas').onclick=function(e){ var b=e.target.closest('button'); if(!b) return; var v=b.dataset.v; V[v]=!V[v]; b.classList.toggle('on', V[v]); aplicarVistas(); };

/* ═════════ tocar ═════════ */
var ray=new THREE.Raycaster(), ptr=new THREE.Vector2(), bajo=null;
ren.domElement.addEventListener('pointerdown', function(e){ if(!PT.abierto) return; bajo={ x:e.clientX, y:e.clientY }; });
ren.domElement.addEventListener('pointerup', function(e){ if(!PT.abierto || !bajo || Math.abs(e.clientX-bajo.x)+Math.abs(e.clientY-bajo.y)>6) return;
  var r=ren.domElement.getBoundingClientRect(); ptr.x=((e.clientX-r.left)/r.width)*2-1; ptr.y=-((e.clientY-r.top)/r.height)*2+1; ray.setFromCamera(ptr, cam);
  var hit=ray.intersectObjects(TOCA.filter(function(o){ return o.visible && o.parent; }), true)[0]; if(!hit) return; var o=hit.object; while(o && !o.userData.tipo) o=o.parent; if(!o) return;
  var u=o.userData;
  if(u.tipo==='espera'){ var c=u.c; elegir(c); toast((u.it.st==='moreno'?'📥 ':'🅿️ ')+'<b>'+escH(u.it.prod)+' ×'+u.it.u+'</b> para el '+escH(c.p)+' · '+ITEM_TX[u.it.pend?'pend':u.it.st](u.it)+'. Se tilda en la ficha (es la tilde de la Lista de carga).'); return; }
  if(u.tipo==='npc'){ if(u.quien==='gar'){ var cerca=garParados(GARN.sitio)[0]; decir('gar', cerca?garFrase(garTipo(cerca),cerca):garFrase('suelto')); toast('🧔 Es EDUARDO. No le hagas caso, putea a todos.'); }
    else if(u.quien==='ern'){ var cc=ERNN.c||ernCamiones()[0]; if(ERNN.st!=='escucha') decir('ern', cc?ernRevisa(cc):RESP.ern[0], 3.6, '🔎 '); toast('📋 ERNESTO, de logística: recorre los andenes y revisa la carga de cada camión.'); }
    else { if(DAVN.st!=='reta') decir('dav', jefeTema().d, 3.8, '📢 '); toast('🧑‍💼 DAVID, jefe de logística: le recuerda a Ernesto lo pendiente del día.'); } return; }
  if(u.c) elegir(u.c, false); });

/* ═════════ el cuadro: lo llama el dibujante compartido (DEP.w3.alt) ═════════ */
var reloj=new THREE.Clock(), quieto=window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
function suave(k){ return k<.5 ? 2*k*k : 1-Math.pow(-2*k+2,2)/2; }
function cuadro(){
  var crudo=reloj.getDelta(), dt=Math.min(.05, crudo), t=reloj.elapsedTime;
  MONTA.forEach(function(m){ if(m.g.visible) montaPaso(m, dt); });
  if(!quieto){ npcPaso(dt, t); vidaPaso(dt, t); }
  CAMS.forEach(function(c){ var tr=CAMG[c.k];
    if(c.anim){ c.anim.t+=dt; var k=Math.min(1,c.anim.t/c.anim.dur); c.anim.f(suave(k)); if(k>=1){ var fin=c.anim.fin; c.anim=null; if(fin) fin(); } }
    else if(c.enCalle) manejar(c, dt);
    if(tr.userData.salto!=null){ tr.userData.salto+=dt; var s=tr.userData.salto; tr.scale.y=1+Math.sin(Math.min(1,s/.45)*Math.PI)*.12; if(s>.45){ tr.scale.y=1; tr.userData.salto=null; } }
    tr.userData.carga.children.forEach(function(p){ if(p.userData.pop!=null){ p.userData.pop+=dt; var q=Math.min(1,p.userData.pop/.35); p.scale.setScalar(.85*(q<1?(.4+.75*Math.sin(q*Math.PI/2)):1)); if(q>=1) p.userData.pop=null; } }); });
  if(!quieto){ AUTOS.forEach(function(a){ a.p+=a.s*a.v*dt;
      if(a.eje==='x'){ if(a.p>X1+15) a.p=X0-15; if(a.p<X0-15) a.p=X1+15; a.g.position.set(a.p,0,a.c+a.s*2.6); a.g.rotation.y=a.s>0?0:Math.PI; }
      else { if(a.p>Z1+15) a.p=Z0-15; if(a.p<Z0-15) a.p=Z1+15; a.g.position.set(a.c-a.s*2.6,0,a.p); a.g.rotation.y=a.s>0?-Math.PI/2:Math.PI/2; } });
    if(GRUA) GRUA.rotation.y=Math.sin(t*.15)*1.2; fuegoPaso(dt, t); colasPaso(dt, t); }
  var fase=Math.floor(t/8)%2; SEMAFOROS.forEach(function(s2){ var rojo=(fase+s2.f)%2===0; s2.ro.emissiveIntensity=rojo?1:0; s2.ve.emissiveIntensity=rojo?0:1; });
  var st=SEL?CAMG[SEL.k]:null; ANILLO.visible=!!(st && st.visible); if(st){ ANILLO.position.x=st.position.x; ANILLO.position.z=st.position.z; var pul=1+Math.sin(t*4)*.08; ANILLO.scale.set(pul,pul,pul); }
  var nx=ctl.target.x, nz=ctl.target.z;
  if(SEGUIR && SEL && SEL.enCalle && st){ nx+=(st.position.x-nx)*.08; nz+=(st.position.z-nz)*.08; }
  if(DEST){ DEST.t+=Math.min(.25,crudo); var k3=suave(Math.min(1,DEST.t/1.4)); nx=DEST.x0+(DEST.x-DEST.x0)*k3; nz=DEST.z0+(DEST.z-DEST.z0)*k3; cam.zoom=DEST.zm0+(DEST.zm-DEST.zm0)*k3; cam.updateProjectionMatrix(); if(DEST.t>=1.4) DEST=null; }
  var ddx=nx-ctl.target.x, ddz=nz-ctl.target.z; ctl.target.x=nx; ctl.target.z=nz; cam.position.x+=ddx; cam.position.z+=ddz;
  sol.target.position.set(ctl.target.x,0,ctl.target.z); sol.position.set(ctl.target.x+60,110,ctl.target.z+50);
  ctl.update(); ren.render(esc, cam); moverEtiquetas();
}
function medir(w,h){ W=w||box.clientWidth; H=h||box.clientHeight; if(!W||!H) return; ren.setSize(W,H,false); var a=W/H; Z=zDe(a); cam.left=-Z*a; cam.right=Z*a; cam.top=Z; cam.bottom=-Z; cam.updateProjectionMatrix(); }
var v0=IR.ptf(); ctl.target.set(v0[0],0,v0[1]); cam.position.set(v0[0],0,v0[1]).add(OJO); cam.zoom=v0[2]; cam.updateProjectionMatrix(); ctl.update();
ponerNoche(false);
/* 🛰️ (§4ko) el GPS cambia cada minuto: se pasa sin rearmar la escena (no entra en la firma) */
function gpsAlDia(D){ var cambio=false, otro=false; (D && D.cams || []).forEach(function(d){ var c=camPorK(d.k); if(!c) return;
  var vo=!!(d.gps && !d.gps.f && d.gps.vu), fk=d.gps ? [d.gps.x, d.gps.z, d.gps.v, d.gps.f, d.gps.hace].join('|') : '';
  var GL=gpsLugar(d.gps), gc=GL.calle, gd=GL.dep;
  if(vo!==!!c.volvio || gc!==!!c.gpsCalle || gd!==(c.gpsDep||'') || !!d.gps!==!!c.gps) cambio=true;   // salió a la calle, llegó a un depósito, o apareció/se fue el GPS: la escena se acomoda
  if(fk!==(c.gpsK||'')){ otro=true; if(c===SEL) c.gpsRepinta=true; }
  c.gps=d.gps; c.volvio=vo; c.gpsK=fk;
  var rk=(d.gpsRuta||[]).length+'|'+(d.gpsParadas||[]).map(function(s){ return s.h0+s.dur; }).join(',');
  if(rk!==(c.rastroK||'')){ otro=true; c.rastroK=rk; c.gpsRuta=d.gpsRuta||[]; c.gpsParadas=d.gpsParadas||[]; if(c===SEL) c.rastroOtro=true; } });
  if(D && D0 && D.dia && JSON.stringify(D.dia.gpsLog)!==JSON.stringify(D0.dia.gpsLog)){ D0.dia.gpsLog=D.dia.gpsLog; D0.dia.gpsVivo=D.dia.gpsVivo; D0.dia.gpsDesde=D.dia.gpsDesde; D0.dia.gpsSrv=D.dia.gpsSrv; otro=true; }
  /* solo si cambió algo del GPS (corre cada 1,5 s): la ficha, las pestañas y el rastro */
  if(otro){ if(SEL && SEL.gpsRepinta){ SEL.gpsRepinta=false; pintarFicha(); } if(SEL && SEL.rastroOtro){ SEL.rastroOtro=false; pintarRastro(); } if(TAB==='calle'||TAB==='gps'||TAB==='gpsr') pintarTab(); }
  return cambio; }
return { sincronizar:sincronizar, cuadro:cuadro, medir:medir, ctl:ctl, aplicarVistas:aplicarVistas, toast:toast, gps:gpsAlDia,
  estado:function(){ return { camiones:CAMS.map(function(c){ return { k:c.k, p:c.p, alm:c.alm, anden:c.anden, enCalle:!!c.enCalle, saliendo:!!c.anim, monta:c.monta?(c.monta.st+(c.monta.g.visible?'':'/oculto')+(c.monta.obj?'/'+c.monta.obj.prod:'')):'', total:c.total, dentro:c.dentro,
    items:c.items.map(function(it){ return { prod:it.prod, u:it.u, st:it.st, dep:it.dep, pend:!!it.pend, carry:!!it.carry, pallet:!!it.g }; }), paradas:c.paradas.length }; }),
    alertas:ALERTAS.map(function(a){ return a.t; }), sel:SEL?SEL.k:'', fuego:FUEGO?FUEGO.llamas.length:0, fuegoAlto:FUEGO?Math.round(FUEGO.llamas[0].m.scale.y*100)/100:0 }; } };
}

/* ═════════ la pantalla: se arma la primera vez que se abre ═════════ */
var HTML=
'<div class="pt-app">'+
  '<div id="pt-esc"></div>'+
  '<div class="capa barra">'+
    '<div class="marca"><div class="logo">M</div><div><b>Patio de carga</b><small id="pt-sub"></small></div></div>'+
    '<div class="vistas" id="pt-vistas">'+
      '<button type="button" class="on" data-v="calle" title="Los camiones que salieron, con sus paradas">🛣️ En la calle</button>'+
      '<button type="button" data-v="noche" title="Día y noche, con luces">🌙 Noche</button>'+
      '<button type="button" class="on" data-v="alertas" title="Lo que hay que resolver, encima de la escena">⚠️ Alertas</button>'+
    '</div>'+
    '<div class="dias" id="pt-dias"><button type="button" data-d="hoy">Hoy</button><button type="button" data-d="manana">Mañana</button></div>'+
    '<button type="button" class="solo-btn" id="pt-solo" title="Esconde los paneles para ver y mover la ciudad">⛶ Solo la ciudad</button>'+
    '<div class="vivo"><i></i> <span id="pt-hora"></span></div>'+
    '<button type="button" class="cerrar" id="pt-cerrar" title="Volver al panel">✕ Cerrar</button>'+
  '</div>'+
  '<div class="capa kpis" id="pt-kpis"></div>'+
  '<div class="capa ir" id="pt-ir">'+
    '<button type="button" data-ir="ptf" class="on">🏭 PTF</button><button type="button" data-ir="bz">🏪 Banzer</button><button type="button" data-ir="im">📥 Moreno</button><button type="button" data-ir="centro">⛪ Centro</button><button type="button" data-ir="todo">🗺️ Ver todo</button>'+
    '<hr><div class="cams" id="pt-ir-cam"></div>'+
  '</div>'+
  '<aside class="capa lado" id="pt-lado"><button type="button" class="plegar" id="pt-pl-lado">▴ Achicar</button><div class="ficha" id="pt-ficha"></div><div class="ficha alertas" id="pt-alertas"></div></aside>'+
  '<div class="capa abajo" id="pt-abajo"><section class="pie">'+
    '<div class="tabs" id="pt-tabs">'+
      '<button type="button" class="on" data-t="rec">🛤️ Recorrido del camión</button><button type="button" data-t="esp">📦 Por cargar</button>'+
      '<button type="button" data-t="calle">🛣️ En la calle <em id="pt-n-calle">0</em></button><button type="button" data-t="gpsr">🛰️ Recorrido GPS</button>'+
      '<button type="button" data-t="gps">📡 Lo que dijo el GPS</button><button type="button" data-t="and">🅿️ Andenes</button>'+
      '<button type="button" class="plegar" id="pt-pl-pie">▾ Achicar</button>'+
    '</div><div id="pt-tab-cuerpo"></div></section></div>'+
  '<div class="armando" id="pt-armando" hidden>🏗️ Armando la ciudad…</div>'+
'</div>';
var CSS_EXTRA=
'#pt-ov{ position:fixed; inset:0; z-index:3200; overflow:auto; -webkit-overflow-scrolling:touch; }'+
'#pt-ov[hidden]{ display:none !important; }'+
'#pt-ov .pt-app{ height:100%; }'+
'#pt-ov [hidden]{ display:none !important; }'+
'#pt-ov .cerrar{ border:0; background:var(--tinta); color:#fff; border-radius:10px; padding:5px 12px; font-weight:800; font-size:.78rem; cursor:pointer; min-height:30px; box-shadow:var(--sombra); }'+
'#pt-ov .dias{ display:flex; background:var(--papel); border-radius:10px; padding:3px; gap:3px; box-shadow:var(--sombra); }'+
'#pt-ov .dias button{ border:0; background:#eef3f8; color:var(--suave); font-weight:800; font-size:.74rem; padding:4px 10px; border-radius:8px; cursor:pointer; min-height:28px; }'+
'#pt-ov .dias button.on{ background:var(--azul); color:#fff; }'+
'#pt-ov .armando{ position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); background:var(--papel); padding:14px 20px; border-radius:12px; box-shadow:var(--sombra); font-weight:800; z-index:4; }'+
'#pt-ov .boton.gris{ background:#e8eef5; color:var(--tinta); }'+
'#pt-ov .paradas div[data-id]{ cursor:pointer; } #pt-ov .paradas div[data-id]:hover b{ color:var(--azul); }'+
'#pt-ov .prods label{ cursor:pointer; } #pt-ov .prods input:disabled + span{ opacity:.6; }'+
'#pt-ov .sin3d{ position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); background:var(--papel); padding:16px 20px; border-radius:12px; box-shadow:var(--sombra); max-width:min(90%,420px); text-align:center; }'+
'#pt-ov #pt-esc canvas{ position:absolute; inset:0; width:100% !important; height:100% !important; }'+
'body.patio-abierto > .header, body.patio-abierto > .nav, body.patio-abierto > .wrap, body.patio-abierto > .footer{ visibility:hidden; }'+
'@media (max-width:980px){ #pt-ov #pt-esc canvas{ position:static; } #pt-ov .cerrar{ order:-1; } }';
function armarDom(){
  if(document.getElementById('pt-ov')) return;
  var st=document.createElement('style'); st.id='pt-css'; st.textContent=CSS+CSS_EXTRA; document.head.appendChild(st);
  var d=document.createElement('div'); d.id='pt-ov'; d.hidden=true; d.setAttribute('role','dialog'); d.setAttribute('aria-label','Patio de carga'); d.innerHTML=HTML; document.body.appendChild(d);
  document.getElementById('pt-cerrar').onclick=function(){ window.patioCerrar(); };
  document.getElementById('pt-pl-lado').onclick=function(){ plegar('pt-lado', !document.getElementById('pt-lado').classList.contains('plegado')); };
  document.getElementById('pt-pl-pie').onclick=function(){ plegar('pt-abajo', !document.getElementById('pt-abajo').classList.contains('plegado')); };
  document.getElementById('pt-solo').onclick=function(){ soloCiudad(!d.classList.contains('solo')); };
  document.getElementById('pt-dias').onclick=function(e){ var b=e.target.closest('button'); if(!b) return; CV_DIA=b.dataset.d; CV_SEL=''; pintarDias(); refrescar(true); };
  document.addEventListener('keydown', function(e){ if(e.key==='Escape' && PT.abierto && !document.querySelector('.modal-overlay[style*="flex"]')) window.patioCerrar(); });
  var chico=window.innerWidth<1400, gl=guardado('lado'), ga=guardado('abajo');
  plegar('pt-lado', gl!=null ? gl==='1' : window.innerWidth<1250); plegar('pt-abajo', ga!=null ? ga==='1' : chico); soloCiudad(guardado('solo')==='1');
}
/* paneles que se pliegan (lo recuerda este aparato) */
function guardado(k){ try{ return localStorage.getItem('patio_'+k); }catch(e){ return null; } }
function guardar(k,v){ try{ localStorage.setItem('patio_'+k, v); }catch(e){} }
function plegar(id, si){ var el=document.getElementById(id); if(!el) return; el.classList.toggle('plegado', si); var lado=id==='pt-lado';
  var b=document.getElementById(lado?'pt-pl-lado':'pt-pl-pie'); b.textContent=si?(lado?'▾ Ver la ficha':'▴ Ver más'):(lado?'▴ Achicar':'▾ Achicar'); guardar(lado?'lado':'abajo', si?'1':'0'); }
PT.plegar=plegar;
function soloCiudad(si){ var d=document.getElementById('pt-ov'); d.classList.toggle('solo', si); var b=document.getElementById('pt-solo'); b.textContent=si?'☰ Mostrar paneles':'⛶ Solo la ciudad'; guardar('solo', si?'1':'0'); }
function pintarDias(){ [].forEach.call(document.querySelectorAll('#pt-dias button'), function(b){ b.classList.toggle('on', b.dataset.d===(CV_DIA==='manana'?'manana':'hoy')); }); }
function pintarSub(D){ var s=document.getElementById('pt-sub'); if(!s) return;
  s.textContent='MULTIESPUMAS · '+(D ? (D.hoy?'hoy':'mañana')+' '+fmtFecha(D.fecha)+' · '+D.pedidos+' pedido'+(D.pedidos===1?'':'s') : 'sin datos todavía'); }
function pintarHora(){ var el=document.getElementById('pt-hora'); if(!el) return; var h=(typeof horaBolivia==='function')?horaBolivia():new Date(), z=function(n){ return (n<10?'0':'')+n; };
  el.textContent='Ahora '+z(h.getHours())+':'+z(h.getMinutes()); }
/* lo que dice el panel → la escena; solo cuando algo cambió */
function refrescar(forzar){
  if(!PT.abierto) return;
  var D=patioDatos(); pintarSub(D); pintarHora(); if(!D || !PT.api) return;
  var vuelta=false; try{ if(PT.api.gps) vuelta=PT.api.gps(D); }catch(e){ console.error(e); }   // 🛰️ (§4ko) el GPS, sin rearmar la escena
  var f=firmaDe(D); if(!forzar && !vuelta && f===PT.firma) return;
  var animar=!!PT.firma && PT.firma.indexOf(JSON.stringify(D.fecha))===1;   // el mismo día: lo que cambió se anima; otro día: se acomoda de una
  PT.firma=f; try{ PT.api.sincronizar(D, animar); }catch(e){ console.error(e); }
}
PT.refrescar=refrescar;
function sin3d(msg){ var b=document.getElementById('pt-esc'); if(!b || b.querySelector('.sin3d')) return;
  var a=document.getElementById('pt-armando'); if(a) a.hidden=true;
  b.insertAdjacentHTML('beforeend','<div class="sin3d">'+(msg||'La ciudad en 3D no se pudo cargar en este equipo (sin internet o sin 3D).<br>Los camiones de Administración tienen todo.')+'</div>'); }
function enchufar(){
  var W3=DEP.w3; if(!W3 || !PT.api) return;
  W3.alt={ cuadro:PT.api.cuadro, tam:PT.api.medir, patio:true };
  if(W3.ctl) W3.ctl.enabled=false; PT.api.ctl.enabled=true;
  W3.r.toneMapping=THREE.NoToneMapping; W3.r.toneMappingExposure=1;
  PT.api.medir(); PT.firma=''; refrescar(true);
  clearInterval(PT.timer); PT.timer=setInterval(function(){ refrescar(false); }, 1500);
}
window.patioAbrir=function(){
  armarDom();
  var ov=document.getElementById('pt-ov'); ov.hidden=false; PT.abierto=true; window.PATIO_ABIERTO=true;
  try{ document.documentElement.style.overflow='hidden'; document.body.classList.add('patio-abierto'); }catch(e){}
  pintarDias(); pintarSub(patioDatos()); pintarHora();
  depLibs(function(ok){
    if(!PT.abierto) return;
    var box=document.getElementById('pt-esc');
    if(!ok){ sin3d(); return; }
    if(!depIniciar3D(box)){ sin3d(); return; }
    if(PT.api){ enchufar(); return; }
    var arm=document.getElementById('pt-armando'); arm.hidden=false;
    setTimeout(function(){
      if(!PT.abierto) return;
      try{ PT.api=armar(DEP.w3.r, box); }catch(e){ console.error(e); sin3d('No se pudo armar la ciudad: '+escH(e.message||e)); return; }
      arm.hidden=true; enchufar();
    }, 40);
  });
};
window.patioCerrar=function(){
  PT.abierto=false; window.PATIO_ABIERTO=false; clearInterval(PT.timer); PT.timer=null;
  var W3=window.DEP && DEP.w3;
  if(W3 && W3.alt){ W3.alt=null; if(W3.ctl) W3.ctl.enabled=true; W3.r.toneMapping=THREE.ACESFilmicToneMapping; W3.r.toneMappingExposure=1.08; }
  if(PT.api) PT.api.ctl.enabled=false;
  var ov=document.getElementById('pt-ov'); if(ov) ov.hidden=true;
  try{ document.documentElement.style.overflow=''; document.body.classList.remove('patio-abierto'); }catch(e){}
  try{ if(typeof cargaVivaPintar==='function') cargaVivaPintar(); }catch(e){ console.error(e); }
};
window.patioEstado=function(){ return PT.api ? PT.api.estado() : null; };
})();
