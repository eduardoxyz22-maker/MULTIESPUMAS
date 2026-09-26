/* 🚚 REVISIÓN POR PESTAÑA: «🚚 Chofer» (26/09/2026) — lo que se encontró y se arregló.

   1. ✅ Un DOBLE TOQUE en «Marcar entregado» la dejaba SIN entregar: el primer toque marca y
      repinta la tarjeta, el segundo cae en «✓ Entregado» y la desmarca, sin preguntar. En la
      planilla quedaba «pendiente».

   Reloj clavado (miércoles 23/09/2026, 10:00 de Bolivia), red cortada,
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

  chk('sin errores JS', errores.length===0, J(errores.slice(0,3)));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
