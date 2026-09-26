/* 🚚 REVISIÓN POR PESTAÑA: «🚚 Chofer» (26/09/2026) — lo que se encontró y se arregló.

   1. ✅ Un DOBLE TOQUE en «Marcar entregado» la dejaba SIN entregar: el primer toque marca y
      repinta la tarjeta, el segundo cae en «✓ Entregado» y la desmarca, sin preguntar. En la
      planilla quedaba «pendiente».
   2. ✅ Con la copia vieja (celular bloqueado horas, o sin señal para refrescar) y un cambio de
      otra persona en el medio —Contabilidad registró el QR—, el ✅ daba `conflicto` y la entrega
      quedaba SIN marcar: solo un aviso de 9 s que el chofer, con el celular en el bolsillo, no ve.
   3. 🚚 El FLETE pactado («se cobra en la puerta», §4ai) no aparecía en la tarjeta: una venta
      pagada con flete decía «✅ Ya pagado — no tenés que cobrar».

   Reloj clavado (miércoles 23/09/2026 y sábado 26/09/2026, 10:00 de Bolivia), red cortada,
   servidor simulado con el sello de revisión (`rev`) como el `.gs`, datos sintéticos.
   Se corre:  node tests/test_rev2_chofer.js
   Dientes contra el panel viejo:  PEDIDOS=/ruta/al/viejo.html node tests/test_rev2_chofer.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const J = (o) => JSON.stringify(o);
const MIERCOLES = '2026-09-23T10:00:00-04:00';
const SABADO    = '2026-09-26T10:00:00-04:00';

/* El servidor simulado hace lo que hace el `.gs` con un pedido: si el sello que manda el panel no
   es el de la hoja, contesta `conflicto` con la fila actual; si coincide, guarda y sube el sello.
   `SRV_CAIDO` = la red se corta (para el reintento sin señal). */
const BASE = `
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=false; SERVER_AUTH='abierto';
  try{ localStorage.removeItem(LS_PEND); localStorage.removeItem(LS_RECHAZOS); }catch(e){}
  if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  CARGA_GEN++; CARGA_ESTADO='ok'; NO_ENCOLAR={}; SAVE_ULTIMO={}; SAVE_REV={};
  window.SRV={}; window._saves=[]; window.SRV_CAIDO=false;
  window._cp=function(o){ return JSON.parse(JSON.stringify(o)); };
  apiPost=function(pl){
    if(pl.action==='save'){
      if(window.SRV_CAIDO) return Promise.reject(new Error('Failed to fetch'));
      var p=pl.pedido, s=SRV[p.id]; window._saves.push(_cp(p));
      if(s && (Number(p.rev)||0)!==(Number(s.rev)||0)) return Promise.resolve({ok:false,error:'conflicto',pedido:_cp(s)});
      var n=_cp(p); n.rev=(s?(Number(s.rev)||0):0)+1; SRV[p.id]=n; return Promise.resolve({ok:true,pedido:_cp(n)});
    }
    if(pl.action==='list') return Promise.resolve({ok:true,pedidos:Object.keys(SRV).map(function(k){ return _cp(SRV[k]); })});
    return Promise.resolve({ok:true});
  };
  window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(m)); return _t(m,k,ms); };
  window._P=function(o){ return Object.assign({id:'p'+Math.random().toString(36).slice(2),fecha:todayStr(),oc:'09-001',vendedor:'Carola Chavez',
    cliente:'C',celular:'70000000',turno:'AM',zona:'Norte',direccion:'Av. Prueba 123',maps:'',pagado:false,saldo:0,
    ts:Date.now(),metodoPago:'',observaciones:'',estado:'',entregado:false,vehiculo:'Carry',chofer:'Luis Pierre',
    garantia:'',nota:'1',acuenta:0,facturarA:'',nit:'',nroDia:1,verificado:true,fotos:[],rev:3,
    productos:[{desc:'SOFT',medida:'140x190',cant:1,precio:1000,chk:'ok'}]},o); };
  /* El chofer tiene la copia VIEJA (rev 3); en la planilla ya hay otra (rev 4) con lo que cambió otro. */
  window._cargar=function(locales, servidor){
    SRV={}; (servidor||locales).forEach(function(p){ SRV[p.id]=_cp(p); });
    STATE=locales.map(_cp); saveMirror();
  };
  window._abrirChofer=async function(filtro){
    showView('chofer'); await new Promise(function(r){ setTimeout(r,150); });   // refresca con SRV…
    llenarSelectChoferes(); document.getElementById('cho-nombre').value='Luis Pierre'; setChoFiltro(filtro||'hoy');
  };
  window._tarjeta=function(cli){
    var c=[].slice.call(document.querySelectorAll('#cho-lista .cho-card')).filter(function(x){ return x.textContent.indexOf(cli)>=0; })[0];
    return c ? c.textContent.replace(/\\s+/g,' ') : '(no está)';
  };
`;

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const D = { confirm:true, promptVal:'', vistos:[] };
  const nueva = async (fixed) => {
    const page = await browser.newPage({ viewport:{width:360,height:800}, timezoneId:'America/La_Paz', hasTouch:true });
    page.on('pageerror', e=>errores.push(e.message));
    page.on('dialog', async d=>{
      D.vistos.push(d.type()+': '+d.message());
      if(d.type()==='prompt') await d.accept(D.promptVal);
      else if(D.confirm===false) await d.dismiss(); else await d.accept();
    });
    await page.route(/^https?:/, r=>r.abort());
    await page.clock.setFixedTime(new Date(fixed||MIERCOLES));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate(BASE);
    return page;
  };

  // ═══ 1. Doble toque en «✅ Marcar entregado» ═════════════════════════════════════════
  console.log('\n── 1. ✅ Un doble toque no puede dejar la entrega sin marcar ──');
  {
    const page = await nueva();
    await page.evaluate(async () => {
      _cargar([_P({id:'d1', cliente:'CLIENTE DOBLE', saldo:0, pagado:true, metodoPago:'Efectivo 1000 @2026-09-20 #9'})]);
      await _abrirChofer('hoy');
    });
    D.vistos.length=0; D.confirm=false;                      // si el celular pregunta, el chofer dice que NO
    await page.locator('#cho-lista .cho-card .cho-btn.ent').first().dblclick();
    await page.waitForTimeout(400);
    let r = await page.evaluate(() => ({ local:findById('d1').entregado, srv:!!SRV.d1.entregado, toasts:_toasts.slice(-2) }));
    chk('⚠️ con un doble toque la entrega queda MARCADA (en la pantalla y en la planilla)', r.local===true && r.srv===true, J(r));
    chk('…porque desmarcar pregunta (y el chofer puede decir que no)', D.vistos.some(v=>/confirm: .*NO entregad/i.test(v)), J(D.vistos));
    /* Los controles arrancan de un estado puesto a mano: no dependen de lo de arriba. */
    const poner = (v) => page.evaluate(async (v) => {
      var p=findById('d1'); p.entregado=v; SRV.d1.entregado=v; p.rev=SRV.d1.rev; SAVE_REV={}; SAVE_ULTIMO={};
      saveMirror(); renderChofer(); await new Promise(function(r){ setTimeout(r,50); });
    }, v);
    await poner(true); D.confirm=true; D.vistos.length=0;
    await page.locator('#cho-lista .cho-card .cho-btn.ent').first().click();
    await page.waitForTimeout(400);
    r = await page.evaluate(() => ({ local:findById('d1').entregado, srv:!!SRV.d1.entregado }));
    chk('control: desmarcar sigue andando (se puede deshacer)', r.local===false && r.srv===false, J(r));
    chk('…pero ahora pregunta antes, una vez', D.vistos.length===1 && /NO entregad/i.test(D.vistos[0]), J(D.vistos));
    await poner(false); D.vistos.length=0;
    await page.locator('#cho-lista .cho-card .cho-btn.ent').first().click();
    await page.waitForTimeout(400);
    r = await page.evaluate(() => ({ local:findById('d1').entregado, srv:!!SRV.d1.entregado }));
    chk('control: MARCAR no pregunta nada (un toque, como antes)', r.local===true && r.srv===true && D.vistos.length===0, J([r, D.vistos]));
    await page.close();
  }

  // ═══ 2. ✅ con la copia vieja y un cambio de otra persona en el medio ═════════════════
  console.log('\n── 2. ✅ con la copia vieja: el conflicto no deja la entrega sin marcar ──');
  {
    const page = await nueva();
    const r = await page.evaluate(async () => {
      var hoy=todayStr(), out={};
      var k1=_P({id:'k1', cliente:'CLIENTE QR', saldo:1000});
      var k1s=_cp(k1); k1s.rev=4; k1s.saldo=0; k1s.pagado=true; k1s.metodoPago='QR BISA 1000 @'+hoy+' #55 %IMGQR55';   // Contabilidad registró el QR
      var y1=_P({id:'y1', cliente:'CLIENTE YA', saldo:0, pagado:true, metodoPago:'Efectivo 900 @2026-09-20 #7'});
      var y1s=_cp(y1); y1s.rev=4; y1s.entregado=true;                                  // logística ya la tildó desde Administración
      var a1=_P({id:'a1', oc:'ATC 09-001', cliente:'CLIENTE ATC', productos:[{desc:'SOFT',medida:'140x190',cant:1,
               atc:{mot:'Hundimiento', rec:'2026-09-21', pdev:hoy, pturno:'AM'}}]});
      var a1s=_cp(a1); a1s.rev=5; a1s.observaciones='Llamar antes de ir';
      _cargar([k1, y1, a1], [k1s, y1s, a1s]);
      await _abrirChofer('hoy');
      STATE=[_cp(k1), _cp(y1), _cp(a1)]; saveMirror(); renderChofer();   // el celular estuvo bloqueado: la copia es la de antes
      _saves=[];
      choEntregado('k1'); await new Promise(function(r){ setTimeout(r,500); });
      out.k1={ local:findById('k1').entregado, srv:!!SRV.k1.entregado, qr:String(SRV.k1.metodoPago).indexOf('IMGQR55')>=0 && SRV.k1.pagado===true,
               saves:_saves.filter(function(s){ return s.id==='k1'; }).length, ultimo:_toasts[_toasts.length-1],
               rech:rechazosLocales().filter(function(x){ return x.id==='k1'; }).length, tarjeta:_tarjeta('CLIENTE QR') };
      choEntregado('y1'); await new Promise(function(r){ setTimeout(r,500); });
      out.y1={ local:findById('y1').entregado, srv:!!SRV.y1.entregado, saves:_saves.filter(function(s){ return s.id==='y1'; }).length, ultimo:_toasts[_toasts.length-1] };
      choEntregado('a1'); await new Promise(function(r){ setTimeout(r,500); });
      var a=atcDe(SRV.a1)||{};
      out.a1={ srv:!!SRV.a1.entregado, ent:a.ent||'', rf:a.rf||'', obs:SRV.a1.observaciones, hoy:hoy };
      return out;
    });
    chk('⚠️ Contabilidad registró el QR mientras tanto: la entrega igual queda MARCADA (pantalla y planilla)', r.k1.local===true && r.k1.srv===true, J(r.k1));
    chk('…sobre la fila nueva: el QR con su captura sigue ahí (no se pisa lo del otro)', r.k1.qr===true, J(r.k1));
    chk('…y el último aviso dice que quedó entregado, no «volvé a hacer tu cambio»', /Entregado/.test(r.k1.ultimo) && !/volvé a hacer/.test(r.k1.ultimo), r.k1.ultimo);
    chk('…y no queda anotado como «el servidor NO aceptó» en este celular', r.k1.rech===0, J(r.k1.rech));
    chk('…y la tarjeta lo muestra entregado', /✓ Entregado/.test(r.k1.tarjeta), r.k1.tarjeta.slice(0,120));
    chk('control: si en la planilla YA estaba entregada, no se vuelve a guardar', r.y1.local===true && r.y1.srv===true && r.y1.saves===1, J(r.y1));
    chk('⚠️ la devolución de una ATC con conflicto también se cierra (ent y recogido de fábrica en la fila nueva)',
        r.a1.srv===true && r.a1.ent===r.a1.hoy && r.a1.rf===r.a1.hoy && r.a1.obs==='Llamar antes de ir', J(r.a1));
    await page.close();
  }

  // ═══ 2b. …y si en el reintento se corta la señal, queda en la cola ═════════════════════
  console.log('\n── 2b. ✅ con conflicto y SIN señal en el reintento: queda en la cola ──');
  {
    const page = await nueva();
    const r = await page.evaluate(async () => {
      var o1=_P({id:'o1', cliente:'CLIENTE SIN SEÑAL', saldo:500});
      var o1s=_cp(o1); o1s.rev=4; o1s.observaciones='Portón negro';
      _cargar([o1], [o1s]);
      await _abrirChofer('hoy');
      STATE=[_cp(o1)]; saveMirror(); renderChofer();
      var _post=apiPost, n=0;
      apiPost=function(pl){ if(pl.action==='save' && ++n>1) return Promise.reject(new Error('Failed to fetch')); return _post(pl); };
      choEntregado('o1'); await new Promise(function(r){ setTimeout(r,2600); });   // apiSaveAhora reintenta a los 1,5 s
      var cola=getPending().filter(function(p){ return p.id==='o1'; })[0]||null;
      return { cola:cola?{entregado:cola.entregado, rev:cola.rev, obs:cola.observaciones}:null, local:findById('o1').entregado };
    });
    chk('⚠️ el ✅ espera en la cola (sobre la fila nueva) en vez de perderse', !!r.cola && r.cola.entregado===true && r.cola.rev===4 && r.cola.obs==='Portón negro', J(r));
    await page.close();
  }

  // ═══ 3. El flete pactado en la tarjeta ═══════════════════════════════════════════════
  console.log('\n── 3. 🚚 El flete que se cobra en la puerta aparece en la tarjeta ──');
  {
    const page = await nueva();
    const r = await page.evaluate(async () => {
      _cargar([
        /* Pagada entera en la tienda (el adelanto cubre todo) y el flete pactado: la tarjeta decía
           «✅ Ya pagado — no tenés que cobrar». */
        _P({id:'f1', cliente:'CLIENTE PAGADA', pagado:true, saldo:0, acuenta:1000, metodoPago:'~Efectivo 1000 @2026-09-20 #11 + ^ 150'}),
        _P({id:'f2', cliente:'CLIENTE SALDO', saldo:1000, metodoPago:'^ 150'}),
        _P({id:'f3', cliente:'CLIENTE COBRADO', pagado:true, saldo:0, metodoPago:'Efectivo 1000 @2026-09-20 #12 + ^Efectivo 150 @2026-09-20 #12'}),
        _P({id:'f4', cliente:'CLIENTE NORMAL', saldo:800})
      ]);
      await _abrirChofer('hoy');
      return { f1:_tarjeta('CLIENTE PAGADA'), f2:_tarjeta('CLIENTE SALDO'), f3:_tarjeta('CLIENTE COBRADO'), f4:_tarjeta('CLIENTE NORMAL'),
               met:document.getElementById('cho-metrics').textContent.replace(/\s+/g,' ') };
    });
    chk('⚠️ venta pagada con flete pactado: la tarjeta dice que hay que cobrar el flete (Bs 150)', /flete/i.test(r.f1) && /150,00/.test(r.f1), r.f1);
    chk('⚠️ …y ya NO dice «no tenés que cobrar»', !/no tenés que cobrar/i.test(r.f1), r.f1);
    chk('⚠️ venta con saldo y flete: dice las dos cosas (Bs 1.000 de la venta y Bs 150 de flete)', /1\.000,00/.test(r.f2) && /flete/i.test(r.f2) && /150,00/.test(r.f2), r.f2);
    chk('control: el flete ya cobrado no se vuelve a pedir', !/cobrar el flete/i.test(r.f3) && !/flete: /i.test(r.f3), r.f3);
    chk('control: una venta sin flete no habla de flete', !/flete/i.test(r.f4), r.f4);
    chk('las métricas avisan el flete aparte (Bs 300 de los dos), sin mezclarlo con lo de la venta', /Por cobrar ?Bs 1\.800,00/.test(r.met) && /300,00 de flete/.test(r.met), r.met);
    D.vistos.length=0; D.confirm=false; D.promptVal='1150';
    await page.evaluate(() => { choCobrarMetodo('f2','Efectivo'); });
    await page.waitForTimeout(200);
    D.confirm=true;
    const r2 = await page.evaluate(() => ({ cobrado:totalCobrado(findById('f2')) }));
    chk('⚠️ si anota el flete junto con la venta («te estás pasando»), el aviso le dice que eso es el flete', D.vistos.some(v=>/^confirm:[\s\S]*FLETE/.test(v)), J(D.vistos));
    chk('…y si dice que no, no se anota nada', r2.cobrado===0, J(r2));
    await page.close();
  }

  // ═══ 4. El sábado: «Mañana» es el lunes, y todo lo de arriba vale igual ══════════════════
  console.log('\n── 4. Sábado: la tarjeta del lunes (en «🌅 Mañana») con flete y con conflicto ──');
  {
    const page = await nueva(SABADO);
    const r = await page.evaluate(async () => {
      var lun=proximoDiaEntrega();
      var s1=_P({id:'s1', fecha:lun, cliente:'CLIENTE LUNES', pagado:true, saldo:0, metodoPago:'Efectivo 1000 @2026-09-25 #21 + ^ 80'});
      var s1s=_cp(s1); s1s.rev=4; s1s.observaciones='Timbre 2';
      _cargar([s1], [s1s]);
      await _abrirChofer('manana');
      STATE=[_cp(s1)]; saveMirror(); renderChofer();
      var tarjeta=_tarjeta('CLIENTE LUNES');
      choEntregado('s1'); await new Promise(function(r){ setTimeout(r,500); });
      return { lun:lun, tarjeta:tarjeta, srv:!!SRV.s1.entregado, obs:SRV.s1.observaciones };
    });
    chk('el sábado «Mañana» es el lunes 28 y la tarjeta trae el flete (Bs 80)', r.lun==='2026-09-28' && /flete/i.test(r.tarjeta) && /80,00/.test(r.tarjeta), J(r));
    chk('…y el ✅ con conflicto queda marcado también', r.srv===true && r.obs==='Timbre 2', J(r));
    await page.close();
  }

  chk('sin errores JS', errores.length===0, J(errores.slice(0,3)));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
