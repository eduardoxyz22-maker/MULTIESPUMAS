/* 🎸 LA MELODÍA DE TODOS SANTOS (§4ni, 27/10; dueño: «falta el tema de noviembre… algo estilo la película Coco y su canción»).
   «Recuérdame», la de la película, tiene derechos: no se copia. Esta es una melodía PROPIA en ese estilo: vals en la menor (3/4),
   guitarra punteada (bajo en el 1, acorde en el 2 y el 3) y trompeta; en la segunda frase entra otra trompeta una tercera abajo, como
   un mariachi. La escuchó en el muestrario (16 compases); acá suenan los 8 primeros y el rasgueo final, ~12 s.
   · La carga el script del <head> SOLO con el tema de noviembre, en el panel de pedidos y en el dashboard.
   · Los navegadores no dejan sonar nada al abrir: suena con el PRIMER toque, clic o tecla, UNA vez por apertura (como la risa de
     Halloween). El 🔇 de Bloki la calla (`me_asis_mudo`, el mismo de todos los sonidos del panel).
   · Todo sale del navegador (WebAudio): no hay archivo de sonido. Guitarra = Karplus-Strong (un ruido corto que se repite y se va
     apagando, como una cuerda); trompeta = dos dientes de sierra un poco desafinados, filtro y vibrato.
   · En las pruebas automáticas no suena salvo `window.TS_MUSICA_PRUEBA`. `window.temaMelodia` = { tocar, parar, sonando, veces }. */
(function(){
  'use strict';
  if(window.temaMelodia) return;
  var AC=null, master=null, sonando=false, finT=null, veces=0;
  var mf=function(m){ return 440*Math.pow(2,(m-69)/12); };
  var BEAT=0.43;
  var ACORDES={Am:{b:45,t:[57,60,64]}, Dm:{b:50,t:[57,62,65]}, E7:{b:40,t:[56,62,64]}, C:{b:48,t:[55,60,64]}, G7:{b:43,t:[55,59,65]}};
  // [acorde, [[nota MIDI o null, tiempos], …]] por compás. 8 compases (la primera frase).
  var SCORE=[
    ['Am',[[76,2],[72,1]]], ['Am',[[69,1],[71,1],[72,1]]], ['Dm',[[74,1],[77,1],[81,1]]], ['E7',[[80,2],[77,1]]],
    ['E7',[[76,1],[74,1],[71,1]]], ['E7',[[76,3]]], ['Am',[[72,1],[71,1],[69,1]]], ['Am',[[69,3]]]
  ];
  var ESCALA=[]; [45,47,48,50,52,53,56].forEach(function(n){ for(var o=0;o<4;o++) ESCALA.push(n+12*o); }); ESCALA.sort(function(a,b){ return a-b; });
  var terceraAbajo=function(m){ var i=ESCALA.indexOf(m); return i>=2 ? ESCALA[i-2] : m-4; };
  var KS={};
  function cuerda(f, dur){
    var k=f.toFixed(2)+'|'+dur; if(KS[k]) return KS[k];
    var sr=AC.sampleRate, n=Math.floor(sr*dur), buf=AC.createBuffer(1,n,sr), d=buf.getChannelData(0);
    var N=Math.max(2,Math.round(sr/f)), y=new Float32Array(N), p=0, prev=0, i, j;
    for(i=0;i<N;i++){ var r=Math.random()*2-1; y[i]=0.6*r+0.4*prev; prev=y[i]; }
    for(j=0;j<n;j++){ var a=y[p], b=y[(p+1)%N]; y[p]=0.5*(a+b)*0.9965; d[j]=a; p=(p+1)%N; }
    return (KS[k]=buf);
  }
  function punteo(m, t, vol, dur){
    var s=AC.createBufferSource(), g=AC.createGain(); s.buffer=cuerda(mf(m), dur||1.6); g.gain.value=vol;
    s.connect(g); g.connect(master); s.start(t);
  }
  function trompeta(m, t, dur, vol){
    var f=mf(m), g=AC.createGain(), lp=AC.createBiquadFilter(), pk=AC.createBiquadFilter(), lfo=AC.createOscillator(), lg=AC.createGain();
    lp.type='lowpass'; lp.Q.value=1; lp.frequency.setValueAtTime(900,t); lp.frequency.linearRampToValueAtTime(2800,t+0.06); lp.frequency.linearRampToValueAtTime(2000,t+dur);
    pk.type='peaking'; pk.frequency.value=1400; pk.gain.value=6; pk.Q.value=1.2;
    lfo.frequency.value=5.6; lg.gain.setValueAtTime(0,t); lg.gain.linearRampToValueAtTime(f*0.006,t+Math.min(0.25,dur*0.6));
    lfo.connect(lg);
    [-4,4].forEach(function(c){ var o=AC.createOscillator(); o.type='sawtooth'; o.frequency.value=f; o.detune.value=c; lg.connect(o.frequency); o.connect(lp); o.start(t); o.stop(t+dur+0.12); });
    lp.connect(pk); pk.connect(g); g.connect(master);
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+0.035); g.gain.setValueAtTime(vol*0.85,t+Math.max(0.05,dur-0.06)); g.gain.linearRampToValueAtTime(0,t+dur+0.1);
    lfo.start(t); lfo.stop(t+dur+0.12);
  }
  function tocar(){
    if(sonando) return false;
    var C=window.AudioContext||window.webkitAudioContext; if(!C) return false;
    if(!AC) AC=new C();
    if(AC.state==='suspended' && AC.resume) AC.resume();
    master=AC.createGain(); master.gain.value=0.75;
    var comp=AC.createDynamicsCompressor(); master.connect(comp); comp.connect(AC.destination);
    var t0=AC.currentTime+0.08;
    SCORE.forEach(function(bar, bi){
      var t=t0+bi*3*BEAT, A=ACORDES[bar[0]], tb=t;
      punteo(A.b, t, 0.55, 1.6);
      [1,2].forEach(function(b){ A.t.forEach(function(m,j){ punteo(m, t+b*BEAT+j*0.012, 0.22, 0.9); }); });
      bar[1].forEach(function(nt){
        if(nt[0]!=null){ trompeta(nt[0], tb, nt[1]*BEAT*0.92, 0.11); if(bi>=4) trompeta(terceraAbajo(nt[0]), tb, nt[1]*BEAT*0.92, 0.07); }
        tb+=nt[1]*BEAT;
      });
    });
    var tf=t0+SCORE.length*3*BEAT;
    [45,52,57,60,64,69].forEach(function(m,j){ punteo(m, tf+j*0.025, 0.32, 2.4); });
    sonando=true; veces++;
    clearTimeout(finT); finT=setTimeout(function(){ sonando=false; }, (SCORE.length*3*BEAT+2.6)*1000);
    return true;
  }
  function parar(){
    if(master && AC){ try{ var mm=master; mm.gain.setTargetAtTime(0, AC.currentTime, 0.05); setTimeout(function(){ try{ mm.disconnect(); }catch(e){} }, 400); }catch(e){} }
    sonando=false; clearTimeout(finT);
  }
  window.temaMelodia={ tocar:tocar, parar:parar, sonando:function(){ return sonando; }, veces:function(){ return veces; } };
  if(navigator.webdriver && !window.TS_MUSICA_PRUEBA) return;
  var EV=['touchend','click','keydown'], hecho=false;
  function mudo(){ try{ return localStorage.getItem('me_asis_mudo')==='1'; }catch(e){ return false; } }
  function soltar(){ EV.forEach(function(ev){ document.removeEventListener(ev, primer, true); }); }
  function primer(){
    if(hecho) return; hecho=true; soltar();
    if(mudo()) return;
    // La risa de Halloween no convive con esta (otro mes), pero el grito del anuncio sí: si está gritando, la melodía no se suma.
    try{ if(document.getElementById('anu-grito') && document.getElementById('anu-grito').offsetParent) return; }catch(e){}
    try{ tocar(); }catch(e){}
  }
  EV.forEach(function(ev){ document.addEventListener(ev, primer, true); });
})();
