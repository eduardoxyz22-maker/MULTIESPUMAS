/* 🔒 TERCERA REVISIÓN DE ADMINISTRACIÓN (26/09/2026) — lo que quedó reportado y se arregló.

   1. 🚚 La hoja de ruta no decía el flete pactado: una venta pagada con flete salía «✅ PAGADO» y
      el chofer no se enteraba de que tenía que cobrar el flete en la puerta (§4ai). La tarjeta del
      chofer ya lo dice (a4fbfe0): la hoja de ruta —pantalla, impresa y WhatsApp— dice lo mismo,
      con las mismas palabras. ATC y RPT no cambian.

   Reloj clavado (miércoles 23/09/2026, 10:00 de Bolivia). Red cortada, servidor simulado, datos
   sintéticos. Se corre:  node tests/test_rev3_admin.js
   Dientes contra el panel viejo:  PEDIDOS=/ruta/al/viejo.html node tests/test_rev3_admin.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const J = (o) => JSON.stringify(o);
const MIERCOLES = '2026-09-23T10:00:00-04:00';

const BASE = `
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true; SERVER_AUTH='abierto';
  document.getElementById('admin-lock').style.display='none';
  document.getElementById('admin-content').style.display='block';
  try{ localStorage.removeItem(LS_PEND); localStorage.removeItem(LS_RECHAZOS); }catch(e){}
  if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  CARGA_GEN++; CARGA_ESTADO='ok'; NO_ENCOLAR={}; SAVE_ULTIMO={}; SAVE_REV={};
  SERVER_VER=SCRIPT_VERSION_ESPERADA;
  window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(m)); return _t(m,k,ms); };
  window._P=function(o){ return Object.assign({id:'p'+Math.random().toString(36).slice(2),fecha:todayStr(),oc:'',vendedor:'Carola Chavez',
    cliente:'C',celular:'70000000',turno:'AM',zona:'Norte',direccion:'Av. Banzer 123',maps:'',pagado:false,saldo:0,
    ts:Date.now(),metodoPago:'',observaciones:'',estado:'',entregado:false,vehiculo:'Foton nuevo',chofer:'Luis Pierre',
    garantia:'',nota:'',acuenta:0,facturarA:'',nit:'',nroDia:1,verificado:true,fotos:[]},o); };
  /* La planilla compartida por «todas las computadoras»: las dos filas que se reescriben enteras. */
  window._srv={ cierre:'', carga:'', lee:0, saves:[], tardaSave:0, listFalla:false, saveFalla:false };
  window._diasSrv=function(){ return (String(window._srv.cierre||'').match(/\\d{4}-\\d{2}-\\d{2}/g)||[]).sort().join(' '); };
  window._cargaSrv=function(){ return Object.keys(parseCargaChk(window._srv.carga)).sort().join(' ; '); };
  apiList=function(){
    window._srv.lee++;
    if(window._srv.listFalla) return Promise.reject(new Error('sin_red'));
    var out=JSON.parse(JSON.stringify(STATE));
    if(window._srv.cierre) out.push({ id:CIERRE_ID, fecha:'', observaciones:window._srv.cierre, cliente:'cierres', productos:[], saldo:0, ts:1 });
    if(window._srv.carga) out.push({ id:CARGA_ID, fecha:'', observaciones:window._srv.carga, cliente:'carga', productos:[], saldo:0, ts:1 });
    return Promise.resolve({ok:true, version:SCRIPT_VERSION_ESPERADA, pedidos:out});
  };
  apiSave=function(rec){
    var g=JSON.parse(JSON.stringify(rec)); window._srv.saves.push(g);
    return new Promise(function(res, rej){ setTimeout(function(){
      if(window._srv.saveFalla) return rej(new Error('Failed to fetch'));
      if(g.id===CIERRE_ID) window._srv.cierre=String(g.observaciones||'');
      if(g.id===CARGA_ID) window._srv.carga=String(g.observaciones||'');
      res({ok:true, pedido:g});
    }, window._srv.tardaSave||0); });
  };
  window._espera=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
`;

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const D={ confirm:true, vistos:[] };
  const nueva = async (fixed, ancho) => {
    const page = await browser.newPage({ viewport:{width:ancho||1400,height:950}, timezoneId:'America/La_Paz' });
    page.on('pageerror', e=>errores.push(e.message));
    page.on('dialog', async d=>{ D.vistos.push(d.type()+': '+d.message()); if(d.type()==='confirm' && D.confirm===false) await d.dismiss(); else await d.accept(); });
    await page.route(/^https?:/, r=>r.abort());
    await page.clock.setFixedTime(new Date(fixed||MIERCOLES));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate(BASE);
    return page;
  };

  // ═══ 1. La hoja de ruta dice el flete pactado ═════════════════════════════════════════
  console.log('\n── 1. 🚚 La hoja de ruta dice el flete que se cobra en la puerta ──');
  {
    const page = await nueva(MIERCOLES);
    const r = await page.evaluate(async () => {
      STATE=[
        /* Pagada entera con el adelanto, y el flete pactado: la hoja de ruta decía «✅ PAGADO». */
        _P({id:'f1', cliente:'CLIENTE PAGADA', pagado:true, saldo:0, acuenta:1000, metodoPago:'~Efectivo 1000 @2026-09-20 #11 + ^ 150'}),
        _P({id:'f2', cliente:'CLIENTE SALDO', saldo:1000, metodoPago:'^ 150'}),
        _P({id:'f3', cliente:'CLIENTE COBRADO', pagado:true, saldo:0, metodoPago:'Efectivo 1000 @2026-09-20 #12 + ^Efectivo 150 @2026-09-20 #12'}),
        _P({id:'f4', cliente:'CLIENTE NORMAL', saldo:500}),
        _P({id:'f5', cliente:'CLIENTE MIGUEL', chofer:'Miguel', vehiculo:'Foton encarpado', pagado:true, saldo:0, metodoPago:'Efectivo 900 @2026-09-20 #13 + ^ 80'}),
        _P({id:'a1', cliente:'CLIENTE ATC', oc:'ATC 09-001', metodoPago:'^ 100', productos:[{desc:'SOFT',cant:1,atc:{mot:'Hundimiento'}}]})
      ];
      saveMirror();
      var txt=function(el){ return String((el&&el.textContent)||'').replace(/\s+/g,' ').trim(); };
      var out={ ct:{} };
      ['f1','f2','f3','f4','f5','a1'].forEach(function(id){ var cr=cobroRutaTxt(findById(id)); out.ct[id]=cr.t+(cr.f?(' | '+cr.f):''); });
      // la tarjeta del chofer, para comparar las palabras
      out.tarjeta=txt((function(){ var d=document.createElement('div'); d.innerHTML=cobroChoferHtml(findById('f1')); return d; })());
      var wa=[]; window.open=function(u){ wa.push(decodeURIComponent(String(u)).replace(/^https:\/\/wa\.me\/\?text=/,'')); return null; }; copyText=function(){};
      abrirRuta(); setRutaDia('hoy');
      out.paradas={}; out.cabeceras={};
      [].forEach.call(document.querySelectorAll('#ruta-body .ruta-chofer'), function(b){
        var kids=[].slice.call(b.children), cab=txt(kids[0]);
        out.cabeceras[/Miguel/.test(cab)?'miguel':'luis']=cab;
        kids.slice(1).forEach(function(d){ var t=txt(d); out.paradas[(t.match(/CLIENTE (PAGADA|SALDO|COBRADO|NORMAL|MIGUEL|ATC)/)||['','?'])[1]]=t; });
      });
      var idxLuis=RUTA_ORDER.indexOf('Luis Pierre'), idxMig=RUTA_ORDER.indexOf('Miguel');
      rutaWhatsapp(idxLuis); rutaWhatsapp(idxMig); closeRuta();
      out.waLuis=wa[0]||''; out.waMig=wa[1]||'';
      return out;
    });
    const frase = (s)=>((String(s).match(/Cobrar también el flete: Bs [\d.,]+ — aparte de la venta/)||[''])[0]);
    const fTarj = frase(r.tarjeta);
    chk('(la tarjeta del chofer dice «Cobrar también el flete: Bs 150,00 — aparte de la venta»)', /150,00/.test(fTarj), r.tarjeta.slice(0,200));
    chk('🔴 venta PAGADA con flete pactado: la hoja de ruta (pantalla) dice que hay que cobrar el flete, con las mismas palabras que la tarjeta',
        !!fTarj && (r.paradas.PAGADA||'').indexOf(fTarj)>=0, r.paradas.PAGADA);
    chk('🔴 …y ya no dice solo «✅ PAGADO» (dice que la VENTA está pagada)', !/✅ PAGADO(?!\w)/.test(r.ct.f1) && /VENTA YA ESTÁ PAGADA/i.test(r.ct.f1), r.ct.f1);
    chk('🔴 venta con saldo y flete: la hoja dice las dos cosas (Bs 1.000 y el flete de Bs 150)',
        /COBRAR Bs 1\.000,00/.test(r.paradas.SALDO||'') && /Cobrar también el flete: Bs 150,00/.test(r.paradas.SALDO||''), r.paradas.SALDO);
    chk('🔴 el WhatsApp de la ruta lo dice en la parada', /Cobrar también el flete: Bs 150,00 — aparte de la venta/.test(r.waLuis), r.waLuis.slice(0,400));
    chk('🔴 la cabecera del chofer suma el flete aparte (Bs 1.500 de ventas + Bs 300 de flete)',
        /A cobrar: Bs 1\.500,00/.test(r.cabeceras.luis||'') && /\+ Bs 300,00 de flete/.test(r.cabeceras.luis||''), r.cabeceras.luis);
    chk('🔴 el WhatsApp de un chofer con todo pagado pero un flete por cobrar ya no dice «✅ Todo pagado»',
        !/Todo pagado/.test(r.waMig) && /80,00 de flete/.test(r.waMig), r.waMig.slice(0,200));
    chk('🔴 …y su cabecera en pantalla tampoco se lo calla', /80,00 de flete/.test(r.cabeceras.miguel||''), r.cabeceras.miguel);
    chk('control: el flete ya cobrado no se vuelve a pedir', !/flete/i.test(r.paradas.COBRADO||'x') && /PAGADO/.test(r.ct.f3), r.paradas.COBRADO);
    chk('control: una venta sin flete no habla de flete', !/flete/i.test(r.paradas.NORMAL||'x') && /COBRAR Bs 500,00/.test(r.ct.f4), r.paradas.NORMAL);
    chk('control: la ATC no cambia (no se cobra, ni el flete)', /NO SE COBRA \(ATC\)/.test(r.ct.a1) && !/flete/i.test(r.ct.a1) && !/flete/i.test(r.paradas.ATC||'x'), r.ct.a1);
    await page.close();
  }

  chk('la página no tiró ningún error de JavaScript', errores.length===0, errores.join(' | ').slice(0,300));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
