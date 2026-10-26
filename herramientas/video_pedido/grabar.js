// 🎬 Video «Cómo cargar un pedido» (§4mv, 26/10) — pantalla de celular, datos INVENTADOS, nada sale a la red.
// Rehacerlo cuando cambie el formulario:
//   node herramientas/video_pedido/recibo.js                      (la foto del recibo, inventada → recibo.jpg al lado)
//   HTTPS_PROXY=http://127.0.0.1:9 node herramientas/video_pedido/grabar.js "$PWD/pedidos.html" /ruta/cuadros [pedido|pago|tienda]
//   (pedido = cómo cargar un pedido · pago = cobrar el saldo pendiente · tienda = registrar una venta de tienda)
//   python3 herramientas/video_pedido/armar.py /ruta/cuadros salida.mp4      (1080×1920; con 720 al final, el liviano para WhatsApp)
// LEAFLET_DIR = carpeta con leaflet.js/.css (npm pack leaflet@1.9.4 → package/dist): sin ella el mapita sale vacío.
// ⚠️ La captura a 1080 de ancho no pasa de ~12 cuadros/s en esta máquina: se graba a escala 2 (780×1386, ~20 cuadros/s) y se agranda.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
const PAG = process.argv[2], OUT = process.argv[3], ESC = process.argv[4] || 'pedido';
const ESCENAS = {
  pedido: { reloj:'2026-11-04T10:12:00-04:00', titulo:'Cómo cargar un pedido', sub:'Guía para vendedoras y vendedores nuevos: un pedido de principio a fin, en 4 pasos.' },
  pago:   { reloj:'2026-11-05T16:20:00-04:00', titulo:'Cómo cobrar el saldo pendiente', sub:'Cuando el cliente paga lo que faltaba: se registra en Contabilidad, con la foto del comprobante.' },
  tienda: { reloj:'2026-11-05T16:20:00-04:00', titulo:'Cómo registrar una venta de tienda', sub:'El cliente se lleva el producto del local: sin camión, sin fecha de entrega y sin dirección.' }
};
const E = ESCENAS[ESC]; if(!E) throw new Error('escena: pedido | pago | tienda');
const FOTOS = { recibo:'recibo.jpg', qrpago:'qr_pago.jpg', qrtienda:'qr_tienda.jpg' };   // lo que «sube» cada escena (recibo.js las arma)
const LF = process.env.LEAFLET_DIR || '';
fs.rmSync(OUT, { recursive:true, force:true }); fs.mkdirSync(OUT, { recursive:true });

/* Mapa: sin salida a los mapas de verdad, los cuadraditos se dibujan acá (calles y manzanas, estilo OSM). */
function tile(z, x, y){
  let s = (x*73856093 ^ y*19349663 ^ z*83492791) >>> 0; const r = () => ((s = (s*1103515245 + 12345) >>> 0) / 4294967296);
  let h = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#f2efe9"/>';
  for(let i=0;i<4;i++){ const px=r()*256, py=r()*256, w=30+r()*60, hh=30+r()*60; if(r()<.35) h+='<rect x="'+px+'" y="'+py+'" width="'+w+'" height="'+hh+'" fill="#d8ebc8"/>'; else h+='<rect x="'+px+'" y="'+py+'" width="'+w+'" height="'+hh+'" fill="#e6e1d8"/>'; }
  const off = (x*37+y*11)%64;
  for(let k=-1;k<5;k++){ const p=k*64+off; h+='<line x1="'+p+'" y1="0" x2="'+(p+8)+'" y2="256" stroke="#fff" stroke-width="7"/><line x1="0" y1="'+p+'" x2="256" y2="'+(p-6)+'" stroke="#fff" stroke-width="7"/>'; }
  if((x+y)%3===0) h+='<line x1="0" y1="'+(40+off)+'" x2="256" y2="'+(90+off)+'" stroke="#f7d38a" stroke-width="10"/>';
  return h+'</svg>';
}

(async()=>{
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox','--lang=es','--force-device-scale-factor=2'], env:Object.assign({}, process.env, { LANG:'es_ES.UTF-8', LANGUAGE:'es', LC_ALL:'es_ES.UTF-8' }) });
  const ctx = await b.newContext({ viewport:{ width:390, height:693 }, deviceScaleFactor:1, isMobile:false, hasTouch:true, timezoneId:'America/La_Paz', locale:'es-BO' });
  await ctx.route(/^https?:\/\//, r => {
    const u = r.request().url();
    if(LF && /leaflet(@[\d.]+)?\/dist\/leaflet\.js/.test(u)) return r.fulfill({ status:200, contentType:'application/javascript', body:fs.readFileSync(path.join(LF,'leaflet.js')) });
    if(LF && /leaflet(@[\d.]+)?\/dist\/leaflet\.css/.test(u)) return r.fulfill({ status:200, contentType:'text/css', body:fs.readFileSync(path.join(LF,'leaflet.css')) });
    const fo = u.match(/googleusercontent\.com\/d\/vid([a-z]+)/);
    if(fo && FOTOS[fo[1]]) return r.fulfill({ status:200, contentType:'image/jpeg', body:fs.readFileSync(path.join(__dirname, FOTOS[fo[1]])) });
    const t = u.match(/tile\.openstreetmap\.org\/(\d+)\/(\d+)\/(\d+)\.png/);
    if(t) return r.fulfill({ status:200, contentType:'image/svg+xml', body:tile(+t[1], +t[2], +t[3]) });
    return r.abort();   // la planilla, Google y todo lo demás: cortado
  });
  await ctx.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'webdriver', { get(){ return false; } });   // el panel se ve como en un celular de verdad
    try{ localStorage.setItem('me_asis_tour', JSON.stringify('ofrecido')); localStorage.setItem('me_asis_video', JSON.stringify('ofrecido')); }catch(e){}
    document.addEventListener('DOMContentLoaded', () => {
      const st = document.createElement('style'); st.textContent = `
        #vid-cap{position:fixed;left:10px;right:10px;bottom:12px;z-index:2147483000;background:#fff;border:2px solid #00B5AD;border-radius:18px;
          box-shadow:0 12px 34px rgba(0,60,58,.28);padding:11px 14px 12px;font-family:Inter,system-ui,sans-serif;color:#13302e;pointer-events:none;
          transition:opacity .35s ease, transform .35s ease;opacity:0;transform:translateY(14px)}
        #vid-cap.on{opacity:1;transform:none}
        #vid-cap.arriba{bottom:auto;top:12px}
        #vid-cap .k{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#00857f;margin-bottom:3px}
        #vid-cap .k i{font-style:normal;background:#00B5AD;color:#fff;border-radius:999px;padding:1px 8px;letter-spacing:.04em}
        #vid-cap .t{font-size:17px;font-weight:800;line-height:1.28;text-wrap:balance}
        #vid-cap .s{font-size:13.5px;line-height:1.38;color:#3d5b59;margin-top:4px}
        .vid-tap{position:fixed;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:rgba(0,181,173,.30);border:3px solid #00B5AD;
          z-index:2147483001;pointer-events:none;animation:vidtap .65s ease-out forwards}
        @keyframes vidtap{0%{transform:scale(.35);opacity:1}100%{transform:scale(1.55);opacity:0}}
        #vid-card{position:fixed;inset:0;z-index:2147483002;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;
          padding:28px 26px;font-family:Inter,system-ui,sans-serif;color:#13302e;background:linear-gradient(160deg,#e6fffe 0%,#f4f7ff 55%,#eef2ff 100%);
          transition:opacity .5s ease}
        #vid-card.fuera{opacity:0}
        #vid-card .band{position:absolute;left:0;right:0;top:0;height:10px;background:linear-gradient(90deg,#00B5AD,#0f766e,#1d4ed8)}
        #vid-card .marca{font-size:12px;font-weight:800;letter-spacing:.2em;color:#00857f}
        #vid-card h1{margin:2px 0 0;font-size:31px;line-height:1.12;font-weight:900;letter-spacing:-.01em;text-wrap:balance}
        #vid-card p{margin:0;font-size:15px;color:#3d5b59;max-width:30ch;line-height:1.45}
        #vid-card .pasos{display:grid;gap:8px;margin-top:10px;width:100%;max-width:310px;text-align:left}
        #vid-card .pasos div{display:flex;align-items:center;gap:11px;background:#fff;border:1px solid #cfe9e7;border-radius:14px;padding:9px 12px;font-size:14.5px;font-weight:700}
        #vid-card .pasos b{flex:none;width:28px;height:28px;border-radius:9px;background:#00B5AD;color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px}
        #vid-card .pasos small{display:block;font-weight:500;color:#55706f;font-size:12.5px}
        #vid-card img{width:120px;height:auto}
        #vid-card .pie{font-size:12.5px;color:#55706f;margin-top:6px}
        @media (prefers-reduced-motion:no-preference){ #vid-card img{animation:vidflota 2.4s ease-in-out infinite} }
        @keyframes vidflota{50%{transform:translateY(-6px)}}`;
      document.head.appendChild(st);
      const cap = document.createElement('div'); cap.id = 'vid-cap'; document.body.appendChild(cap);
      const card = document.createElement('div'); card.id = 'vid-card'; document.body.appendChild(card);
      document.addEventListener('pointerdown', e => { const d = document.createElement('div'); d.className = 'vid-tap'; d.style.left = e.clientX+'px'; d.style.top = e.clientY+'px';
        document.body.appendChild(d); setTimeout(() => d.remove(), 800); }, true);
    });
  });

  if(ESC!=='pedido') await ctx.addInitScript(() => {   // en «pago» y «tienda» ya eligió su nombre: no sale «¿Quién está usando el panel?»
    try{ sessionStorage.setItem('me_quien_ok', 'Maria Flores'); localStorage.setItem('me_mis_vendedor', 'Maria Flores'); }catch(e){}
  });
  const page = await ctx.newPage(); const errores = [];
  page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => { errores.push('dialogo: '+d.message().slice(0,160)); d.accept(); });
  await page.clock.setFixedTime(new Date(E.reloj));   // noviembre: sin el tema de Halloween

  /* ── los cuadros ── */
  const cdp = await ctx.newCDPSession(page); const cuadros = []; let n = 0, grabando = true;
  cdp.on('Page.screencastFrame', async f => {
    cdp.send('Page.screencastFrameAck', { sessionId:f.sessionId }).catch(() => {});
    const nom = String(n++).padStart(6,'0')+'.jpg';
    if(grabando){ cuadros.push({ nom, t:f.metadata.timestamp }); fs.writeFile(path.join(OUT, nom), Buffer.from(f.data, 'base64'), () => {}); }
  });

  await page.goto('file://'+PAG, { waitUntil:'domcontentloaded' });
  await page.evaluate(([t, s]) => {   // la tarjeta de entrada tapa la carga
    const c = document.getElementById('vid-card');
    c.innerHTML = '<div class="band"></div><img src="'+(typeof blokiSrc==='function'?blokiSrc('vendedor'):'')+'" alt=""><div class="marca">MULTIESPUMAS · PANEL DE PEDIDOS</div>'+
      '<h1>'+t+'</h1><p>'+s+'</p>'+
      '<div class="pie">Los clientes de este video son inventados.</div>';
  }, [E.titulo, E.sub]);
  await cdp.send('Page.startScreencast', { format:'jpeg', quality:88, maxWidth:780, maxHeight:1386, everyNthFrame:1 });
  await page.waitForTimeout(1200);

  /* ── la planilla de mentira: pedidos y stock inventados ── */
  await page.evaluate((esc) => {
    var c = document.getElementById('conn-form'); if(c) c.style.display = 'none';
    CONNECTED = true; UNLOCKED = false;
    try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO = 'ok'; ULTIMO_ERROR = '';
    try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    try{ cargaBanner(); }catch(e){}
    var LOG = 'PRODUCTOS TERMINADOS FAB.', BAN = '01-05-025  Almacen Distribucion Banzer', IMN = 'IM - PRODUCTOTERMINADO';
    var TIT = { desc:'TITANIO ICE', medida:'160x190', codigo:'CH1201' }, KT = stockClave(TIT);
    var ALM = { desc:'ALMOHADA', medida:'50x70', codigo:'CD1403' }, KA = stockClave(ALM);
    var hoy = todayStr(), d = function(n){ return stockSumarDias(hoy, n); };
    var ahora = Date.now();
    var st = { c:{ f:hoy, hora:'08:30:00', u:{}, solo0:true, alm:LOG, t:ahora-5000000 }, e:[], p:[], a:{}, g:{}, al:{}, h:[] };
    st.g[BAN] = { f:hoy, hora:'08:30:00', u:{}, solo0:true, cod:{}, t:ahora-5000000, rs:{} };
    st.g[IMN] = { f:hoy, hora:'08:00:00', u:{}, solo0:true, cod:{}, t:ahora-5200000, rs:{} };
    st.al[LOG] = 'log'; st.al[BAN] = 'sale'; st.al[IMN] = 'otro';
    st.c.u[KT] = 6; st.g[BAN].u[KT] = 2; st.g[IMN].u[KT] = 4; st.c.u[KA] = 30;
    var CL = ['ANA SUAREZ ROCA','JORGE PEÑA','CARMEN ORTIZ','LUIS ANTEZANA','SOFIA MENDEZ','RAUL TORREZ','ELENA RIOS','MARCO CUELLAR','VERO SALAS','DIEGO LIMA','PATRICIA VACA','HUGO ROCA','NORA ARZE','IVAN SORIA','LILIANA PARADA','OSCAR MOLINA','ROSA AÑEZ','TOMAS VARGAS'];
    var V = ['Carola Chavez','Mirian Salazar','Isabel Robledo','Juan Pablo Paredes','Mauricio Merida','Jonathan Monje'];
    var Z = ['Norte','Equipetrol','Plan 3000','Urubó','Villa 1ro de Mayo','Sur','Centro','Las Palmas'];
    var plan = [[1,'AM',9],[1,'PM',7],[2,'AM',11],[2,'PM',5],[3,'AM',6],[3,'PM',4],[5,'AM',3]];   // días desde hoy, turno, cuántos
    var P = [], k = 0;
    plan.forEach(function(x){ for(var i=0;i<x[2];i++){ k++;
      P.push({ id:'v'+k, fecha:d(x[0]), turno:x[1], oc:'11-'+String(200+k), nota:String(3100+k), vendedor:V[k%V.length], cliente:CL[k%CL.length], celular:'7'+String(1000000+k*7919).slice(0,7),
        zona:Z[k%Z.length], direccion:'Calle '+(k+3)+' #'+(100+k), maps:'https://www.google.com/maps?q=-17.7'+(60+k%30)+',-63.1'+(70+k%25), productos:[ k%4===0 ? Object.assign({ cant:2, precio:180 }, ALM) : { desc:'PILLOW PEDIC', medida:'140x190', codigo:'CH1682', cant:1, precio:2900 } ],
        pagado:false, acuenta:500, saldo:2400, metodoPago:'Efectivo 500', estado:'', entregado:false, vehiculo:'', chofer:'', garantia:'', facturarA:'', nit:'',
        observaciones:'', ts:ahora-86400000*(1+k%4), nroDia:i+1, verificado:false, fotos:[] }); } });
    P.push({ id:'v-tit', fecha:d(2), turno:'AM', oc:'11-299', nota:'3199', vendedor:'Carola Chavez', cliente:'HUGO ROCA', celular:'71234560', zona:'Norte', direccion:'Av. Banzer 4to anillo',
      maps:'https://www.google.com/maps?q=-17.745,-63.170', productos:[ Object.assign({ cant:1, precio:3400 }, TIT) ], pagado:false, acuenta:1000, saldo:2400, metodoPago:'Efectivo 1000',
      estado:'', entregado:false, vehiculo:'', chofer:'', garantia:'', facturarA:'', nit:'', observaciones:'', ts:ahora-86400000, nroDia:12, verificado:false, fotos:[] });
    if(esc!=='pedido'){
      /* Contabilidad con lo de todos los días: casi todo cobrado (con su recibo), y tres ventas con saldo. */
      P.forEach(function(p, i){ if(i%9===3) return; var tot=p.productos.reduce(function(a, x){ return a+x.cant*x.precio; }, 0);
        p.pagado=true; p.saldo=0; p.acuenta=0; p.metodoPago=textoCobros([{ metodo:'Efectivo', monto:tot, fecha:hoy, nota:p.nota, comps:['vidrecibo0'] }]); });
    }
    if(esc==='pago'){
      P.push({ id:'luc', fecha:hoy, turno:'AM', oc:'11-300', nota:'3245', vendedor:'Maria Flores', cliente:'LUCIA FERNANDEZ ROJAS', celular:'76543210', zona:'Equipetrol',
        direccion:'Calle Los Pinos 245, portón verde, frente a la plaza', maps:'https://www.google.com/maps?q=-17.7712,-63.1964', productos:[ Object.assign({ cant:1, precio:3400 }, TIT, { desc:'COLCHON TITANIO ICE' }) ],
        pagado:false, acuenta:1000, saldo:2400, metodoPago:'Efectivo %vidrecibo1', estado:'', entregado:true, vehiculo:'', chofer:'', garantia:'', facturarA:'', nit:'',
        observaciones:'Llamar antes de ir. Es un 3er piso, sin ascensor.', ts:ahora-86400000*2-3600000, nroDia:1, verificado:false, fotos:[] });
    }
    window._FOTO = esc==='pago' ? 'vidqrpago' : (esc==='tienda' ? 'vidqrtienda' : 'vidrecibo');
    window._SRV = { pedidos:P, stock:st };
    apiList = function(){ var l = JSON.parse(JSON.stringify(window._SRV.pedidos)); l.push({ id:'__stock__', fecha:'', cliente:'📦 STOCK', observaciones:JSON.stringify(window._SRV.stock) });
      return Promise.resolve({ ok:true, pedidos:l }); };
    apiSave = function(rec){ var r = JSON.parse(JSON.stringify(rec)); if(!/^__/.test(String(r.id))){ var i = window._SRV.pedidos.findIndex(function(p){ return p.id===r.id; }); if(i>=0) window._SRV.pedidos[i]=r; else window._SRV.pedidos.push(r); } window._guardado = r; return Promise.resolve({ ok:true, pedido:r }); };
    downloadBlob = function(){};
    WA_BOT = true;   // como en el panel de verdad: el bot de WhatsApp está prendido
    var _nf = 0; apiFoto = function(){ _nf++; return new Promise(function(r){ setTimeout(function(){ r({ ok:true, fotoId:window._FOTO+_nf }); }, 900); }); };
    window.open = function(){ return null; };
    STOCK_CARGADO = false;
    return refrescarEstado().then(function(){ ULTIMO_ERROR=''; CARGA_ESTADO='ok'; try{ showView('form'); resetForm(); }catch(e){} });
  }, ESC);
  await page.waitForTimeout(1800);

  /* ── ayudas ── */
  const espera = ms => page.waitForTimeout(ms);
  const leer = (t, s) => Math.max(2300, Math.round(((t||'')+' '+(s||'')).split(/\s+/).length * 330) + 900);
  async function cap(k, t, s, o){ o = o||{};
    await page.evaluate(([k, t, s, arriba]) => { const c = document.getElementById('vid-cap'); c.classList.remove('on');
      setTimeout(() => { c.classList.toggle('arriba', !!arriba); c.innerHTML = (k?'<div class="k">'+k+'</div>':'')+'<div class="t">'+t+'</div>'+(s?'<div class="s">'+s+'</div>':''); c.classList.add('on'); }, 260); }, [k, t, s, !!o.arriba]);
    await espera(o.ms != null ? o.ms : leer(t, s));
  }
  const sinCap = () => page.evaluate(() => document.getElementById('vid-cap').classList.remove('on'));
  async function verEn(sel, frac){   // lleva el elemento a la parte de arriba-media de la pantalla, suave
    await page.evaluate(([sel, frac]) => { const e = document.querySelector(sel); if(!e) return;
      const hdr = (typeof hdrAltoEn==='function') ? 0 : 0; const r = e.getBoundingClientRect();
      window.scrollTo({ top: Math.max(0, r.top + window.scrollY - innerHeight*frac), behavior:'smooth' }); }, [sel, frac==null?0.28:frac]);
    await espera(900);
  }
  async function toca(sel, frac){ if(frac !== false) await verEn(sel, frac); await page.locator(sel).first().tap(); await espera(650); }
  /* Para lo que está adentro de una ventana (no se mueve con la página): lo centra en su caja y lo toca. */
  const loc = (sel, txt) => txt ? page.locator(sel, { hasText:txt }).first() : page.locator(sel).first();
  async function centra(sel, txt){ await loc(sel, txt).evaluate(e => e.scrollIntoView({ block:'center', behavior:'smooth' })); await espera(850); }
  async function tocaT(sel, txt, sinCentrar){ if(!sinCentrar) await centra(sel, txt); await loc(sel, txt).tap(); await espera(650); }
  async function escribeT(sel, txt, ms, borrar){ const l = loc(sel); await l.tap(); await espera(250); if(borrar) await l.fill(''); await l.pressSequentially(txt, { delay: ms||85 }); await espera(450); }
  async function adjunta(boton, archivo){ const [fc] = await Promise.all([ page.waitForEvent('filechooser'), loc(boton).tap() ]); await fc.setFiles(path.join(__dirname, archivo)); await espera(2600); }
  async function cierre(titulo, pasos, pie){
    await sinCap();
    await page.evaluate(([titulo, pasos, pie]) => {
      const c = document.getElementById('vid-card'); c.style.display = ''; c.classList.add('fuera');
      c.innerHTML = '<div class="band"></div><img src="'+(typeof blokiSrc==='function'?blokiSrc('vendedor'):'')+'" alt=""><div class="marca">RESUMEN</div><h1>'+titulo+'</h1>'+
        '<div class="pasos">'+pasos.map(function(x, i){ return '<div><b>'+(i+1)+'</b><span>'+x[0]+'<small>'+x[1]+'</small></span></div>'; }).join('')+'</div>'+
        '<div class="pie">'+pie+'</div>';
      requestAnimationFrame(() => requestAnimationFrame(() => c.classList.remove('fuera')));
    }, [titulo, pasos, pie]);
    await espera(6500);
  }
  async function escribe(sel, txt, ms){ const l = page.locator(sel).first(); await l.tap(); await espera(250); await l.pressSequentially(txt, { delay: ms||85 }); await espera(450); }

  /* ── 0. entrada ── */
  await espera(2600);
  await page.evaluate(() => { const c = document.getElementById('vid-card'); c.classList.add('fuera'); setTimeout(() => { c.style.display = 'none'; }, 520); });
  await espera(700);

  if(ESC==='pedido'){
  /* ── 1. quién sos ── */
  await cap('Antes de empezar', 'Al abrir el panel, tocá tu nombre', 'Así el panel te muestra tus pedidos y te avisa lo tuyo.', { arriba:false });
  await toca('#quien .quien-b[data-v="Maria Flores"]', false);
  await espera(1500);
  await cap('Nuevo pedido', 'Estás en «Nuevo pedido»', 'El pedido se carga en 4 pasos. Arriba ves cuáles ya están listos.');

  /* ── 2. paso 1: cliente y venta ── */
  await verEn('#fp-1', 0.16);
  await cap('Paso 1 de 4 · Cliente y venta', 'Elegí el día de entrega', 'Cada día dice cuántos lugares le quedan al camión. Tocá el que acordaste con el cliente.');
  await toca('#fx-dias [data-f="2026-11-05"]', 0.32);
  await espera(600);
  await cap('Paso 1 de 4 · Cliente y venta', 'Escribí el N° de la nota de venta', null, { ms:1600 });
  await escribe('#f-nota', '3245');
  await cap('Paso 1 de 4 · Cliente y venta', 'Tu nombre ya está puesto. Ahora, el cliente', 'Nombre y apellido, y su celular: a ese número le llega el aviso de la entrega.', { ms:3200 });
  await escribe('#f-cliente', 'LUCIA FERNANDEZ ROJAS', 70);
  await escribe('#f-celular', '76543210', 110);
  await espera(800);

  /* ── 3. paso 2: productos ── */
  await verEn('#fp-2', 0.14);
  await cap('Paso 2 de 4 · Productos', 'Escribí el código del producto', 'El nombre y la medida se completan solos.', { ms:3000 });
  await escribe('#f-productos .prod-card .prod-codigo', 'CH1201', 140);
  await espera(1200);
  await cap('Paso 2 de 4 · Productos', 'Poné la cantidad y el precio de la nota', null, { ms:1800 });
  const cant = page.locator('#f-productos .prod-card .prod-cant').first();
  await cant.tap(); await cant.fill(''); await cant.pressSequentially('1', { delay:120 }); await espera(300);
  await escribe('#f-productos .prod-card .prod-precio', '3400', 130);
  await page.evaluate(() => { try{ saldoAvisosProgramar(); }catch(e){} });
  await espera(1300);
  await verEn('#f-productos .prod-card .prod-saldo', 0.30);
  await cap('Paso 2 de 4 · Productos', 'Abajo te dice si hay en el almacén', '✅ DISPONIBLE: se puede agendar ya. Si dice que hay que fabricar o traer, avisale al cliente cuántos días tarda.');
  await espera(600);

  /* ── 4. paso 3: entrega ── */
  await verEn('#fp-3', 0.14);
  await cap('Paso 3 de 4 · Entrega', 'Elegí el turno', '🌅 AM es a la mañana y 🌆 PM a la tarde.', { ms:2800 });
  await toca('#f-turno button[data-val="PM"]', 0.30);
  await toca('#f-turno button[data-val="AM"]', false);
  await cap('Paso 3 de 4 · Entrega', 'La zona y la ubicación', 'Pegá el enlace de Google Maps que te manda el cliente: logística lo usa para llegar.', { ms:3400 });
  await escribe('#f-zona', 'Equipetrol', 90);
  await page.locator('#f-maps').tap(); await espera(300);
  await page.locator('#f-maps').fill('https://www.google.com/maps?q=-17.7712,-63.1964');
  await page.evaluate(() => { const e = document.getElementById('f-maps'); e.dispatchEvent(new Event('input', { bubbles:true })); e.dispatchEvent(new Event('change', { bubbles:true })); });
  await espera(1500);
  await verEn('#fx-mapa', 0.30);
  await espera(1200);
  await cap('Paso 3 de 4 · Entrega', 'Y la dirección, con una referencia', null, { ms:1800 });
  await escribe('#f-direccion', 'Calle Los Pinos 245, portón verde, frente a la plaza', 55);
  await espera(600);

  /* ── 5. paso 4: cobro ── */
  await verEn('#fp-4', 0.14);
  await cap('Paso 4 de 4 · Cobro', '¿Pagó todo? Tocá «SÍ, pagado»', 'Si dejó un adelanto, dejá «NO» y anotá el adelanto en «A cuenta» y lo que falta en «Saldo».', { ms:4600 });
  await page.locator('#f-acuenta').tap(); await page.locator('#f-acuenta').fill(''); await page.locator('#f-acuenta').pressSequentially('1000', { delay:130 });
  await espera(700);
  await page.locator('#f-saldo').tap(); await page.locator('#f-saldo').fill(''); await page.locator('#f-saldo').pressSequentially('2400', { delay:130 });
  await espera(600);
  await cap('Paso 4 de 4 · Cobro', '¿Con qué pagó el adelanto?', 'Con QR o tarjeta, el panel te pide la foto del comprobante.', { ms:3000 });
  await toca('#f-metodo button[data-val="Efectivo"]', 0.32);
  await espera(500);
  await verEn('#wrap-comp', 0.30);
  await cap('Paso 4 de 4 · Cobro', 'Sacale una foto al recibo y adjuntala', 'Es obligatoria, también en efectivo: sin ella Contabilidad no puede confirmar el pago. Con QR o tarjeta, sumá la captura.', { ms:4200 });
  const [fc] = await Promise.all([ page.waitForEvent('filechooser'), page.locator('#f-comp-box [onclick^="adjuntarCompForm"]').first().tap() ]);
  await fc.setFiles(path.join(__dirname, 'recibo.jpg'));
  await espera(2600);
  await verEn('#f-obs', 0.30);
  await cap('Observaciones', 'Lo que logística tiene que saber', 'Por ejemplo: llamar antes, un piso sin ascensor, un horario.', { ms:2600 });
  await escribe('#f-obs', 'Llamar antes de ir. Es un 3er piso, sin ascensor.', 55);
  await espera(500);

  /* ── 6. guardar ── */
  await verEn('#f-submit', 0.55);
  await cap('Listo para guardar', 'Tocá «Guardar pedido»', null, { ms:1700 });
  await sinCap();
  await page.locator('#f-submit').tap();
  await espera(5600);
  const ov = await page.evaluate(() => { const e = [...document.querySelectorAll('body *')].find(x => /Tocá para seguir/.test(x.textContent||'') && x.children.length===0); if(!e) return null; const r = e.getBoundingClientRect(); return { x:r.left+r.width/2, y:r.top+r.height/2 }; });
  if(ov){ await page.touchscreen.tap(ov.x, ov.y); }
  await espera(1400);
  await cap('Pedido guardado ✅', 'Ya está en la planilla: logística lo ve', '🤖 El bot de WhatsApp le confirma la entrega al cliente solo, en unos 2 minutos.', { arriba:true, ms:3200 });
  await page.evaluate(() => { const b = document.querySelector('#modal .nx-cli-msg'); if(b) b.scrollIntoView({ block:'center', behavior:'smooth' }); });
  await espera(4200);
  await sinCap();
  const cerrar = page.locator('#modal .modal-actions button', { hasText:'Cerrar' }).first();
  await page.evaluate(() => { const c = document.querySelector('#modal .modal-actions'); if(c) c.scrollIntoView({ block:'center', behavior:'smooth' }); });
  await espera(900);
  if(await cerrar.count()) await cerrar.tap(); else await page.evaluate(() => { try{ closeModal(); }catch(e){} });
  await espera(1000);

  /* ── 7. mis pedidos ── */
  await toca('#tab-mis', false);
  await espera(1400);
  await cap('Mis pedidos', 'Tu pedido aparece en «Mis pedidos»', 'Ahí ves el día, si ya salió el camión y el saldo. Si te equivocaste, abrilo y tocá ✏️ Editar.', { arriba:true, ms:5600 });

  /* ── 8. cierre ── */
  await sinCap();
  await page.evaluate(() => {
    const c = document.getElementById('vid-card'); c.style.display = ''; c.classList.add('fuera');
    c.innerHTML = '<div class="band"></div><img src="'+(typeof blokiSrc==='function'?blokiSrc('vendedor'):'')+'" alt=""><div class="marca">RESUMEN</div><h1>¡Así de fácil!</h1>'+
      '<div class="pasos"><div><b>1</b><span>Cliente y venta<small>día, nota de venta, nombre y celular</small></span></div>'+
      '<div><b>2</b><span>Productos<small>código, cantidad, precio y si hay en almacén</small></span></div>'+
      '<div><b>3</b><span>Entrega<small>turno, zona, ubicación y dirección</small></span></div>'+
      '<div><b>4</b><span>Cobro<small>pagado o adelanto, método y comprobante</small></span></div></div>'+
      '<div class="pie">¿Dudas? Tocá a Bloki, abajo a la derecha → «¿Cómo hago…?»</div>';
    requestAnimationFrame(() => requestAnimationFrame(() => c.classList.remove('fuera')));
  });
  await espera(6500);
  }

  /* ════════ COBRAR EL SALDO PENDIENTE ════════ */
  if(ESC==='pago'){
    await espera(400);
    await cap('Cobrar el saldo', 'El cliente pagó lo que faltaba', 'Lucía dejó Bs 1.000 de adelanto y hoy pagó los Bs 2.400 que quedaban, por QR. Eso se registra en Contabilidad.', { ms:4600 });
    await cap('Cobrar el saldo', 'Entrá a 🧾 Contabilidad', null, { ms:1800 });
    await toca('#tab-conta', false);
    await espera(1600);
    await centra('#view-conta button', 'Ver quiénes');
    await cap('Contabilidad', 'En «Para hacer» están las ventas con saldo', 'Tocá «Ver quiénes». También podés buscar al cliente por nombre o N° de nota.', { ms:4200 });
    await tocaT('#view-conta button', 'Ver quiénes', true);
    await espera(900);
    await cap('Falta cobrar', 'Tocá al cliente', 'La lista va de la venta más vieja a la más nueva.', { ms:2600, arriba:true });
    await tocaT('#modal tr.pc-fila[data-id="luc"]');
    await espera(1100);
    await cap('La venta', 'Arriba, todo lo de la venta', 'Lo que compró, el total y los pagos que ya tiene: el adelanto de Bs 1.000.', { ms:3600, arriba:true });
    await centra('#cta-pago-monto');
    await cap('Registrar un pago', 'El monto ya viene con lo que falta', 'Si pagó solo una parte, cambiá el número. La fecha es la de hoy: el día en que entró la plata.', { ms:4200, arriba:true });
    await cap('Registrar un pago', 'El N° de nota de venta del recibo de este pago', null, { ms:2000, arriba:true });
    await escribeT('#cta-pago-nota', '3291', 140);
    await cap('Registrar un pago', '¿Cómo pagó? Elegí el método', 'Con QR, también a qué banco entró.', { ms:2400, arriba:true });
    await tocaT('#modal button', 'QR');
    await espera(500);
    await tocaT('#modal button', 'BISA');
    await espera(400);
    await centra('#modal [onclick^="ctaAdjuntar"]');
    await cap('Registrar un pago', 'Adjuntá la captura del pago', 'Y la foto del recibo que le diste. Al menos una es obligatoria.', { ms:3200, arriba:true });
    await adjunta('#modal [onclick^="ctaAdjuntar"]', 'qr_pago.jpg');
    await centra('#modal button', 'Registrar pago');
    await cap('Registrar un pago', 'Tocá «➕ Registrar pago»', null, { ms:1800, arriba:true });
    await tocaT('#modal button', 'Registrar pago', true);
    await espera(2200);
    await cap('Pago registrado ✅', 'Listo: el pago quedó guardado', 'La venta quedó PAGADA. Si querés, copiá el mensaje para el grupo.', { ms:4200, arriba:true });
    await centra('#modal button', 'volver a la venta');
    await tocaT('#modal button', 'volver a la venta', true);
    await espera(1200);
    await page.evaluate(() => { const r = [...document.querySelectorAll('#modal .dl-row')].find(x => (x.querySelector('.dl-k')||{}).textContent==='Pagos');
      if(r){ r.style.scrollMarginTop = '135px'; r.scrollIntoView({ block:'start', behavior:'smooth' }); } });
    await espera(900);
    await cap('La venta', 'En «Pagos» están los dos', 'El adelanto y el saldo, cada uno con su foto. Contabilidad después lo marca «✅ Pago registrado en sistema».', { ms:5200, arriba:true });
    await sinCap();
    await page.evaluate(() => { try{ closeModal(); }catch(e){} });
    await espera(700);
    await cierre('¡Saldo cobrado!', [
      ['Contabilidad → «Ver quiénes»', 'o buscá al cliente por nombre o N° de nota'],
      ['Tocá la venta', 'abajo está «💵 Registrar un pago»'],
      ['Monto, N° de nota y método', 'con QR, también el banco'],
      ['La foto del comprobante', 'y «➕ Registrar pago»']
    ], '¿Dudas? Tocá a Bloki → «¿Cómo registro un pago en Contabilidad?»');
  }

  /* ════════ REGISTRAR UNA VENTA DE TIENDA ════════ */
  if(ESC==='tienda'){
    await espera(400);
    await cap('Venta de tienda', 'El cliente se lo lleva del local', 'No va en el camión: no lleva fecha de entrega, turno ni dirección. Se registra desde Contabilidad.', { ms:4400 });
    await toca('#tab-conta', false);
    await espera(1600);
    await centra('#view-conta .lb-acc button', 'Venta de tienda');
    await cap('Contabilidad', 'Tocá «🏪 Venta de tienda»', null, { ms:2000 });
    await tocaT('#view-conta .lb-acc button', 'Venta de tienda', true);
    await espera(1300);
    await verEn('.tienda-banner', 0.12);
    await cap('Venta de tienda', 'Arriba dice «Venta de tienda»', 'La tienda se pone sola con la tuya; si fue en otra, elegila ahí.', { ms:3800 });
    await verEn('#f-nota', 0.30);
    await cap('Paso 1 · Cliente y venta', 'El N° de la nota de venta y el cliente', 'Nombre y celular, como en un pedido.', { ms:2800 });
    await escribe('#f-nota', '3260');
    const vend = await page.evaluate(() => (document.getElementById('f-vendedor')||{}).value || '');
    if(!vend) await escribe('#f-vendedor', 'Maria Flores', 70);
    await escribe('#f-cliente', 'JORGE SUAREZ', 70);
    await escribe('#f-celular', '71122334', 110);
    await verEn('#fp-2', 0.14);
    await cap('Paso 2 · Productos', 'El código, la cantidad y el precio', 'Igual que en un pedido: el nombre y la medida se completan solos.', { ms:3400 });
    await escribe('#f-productos .prod-card .prod-codigo', 'CH1682', 140);
    await espera(900);
    await escribe('#f-productos .prod-card .prod-precio', '2900', 130);
    await espera(700);
    await verEn('#fp-3', 0.20);
    await cap('Paso 3 · Entrega', 'No hace falta: ya dice «Listo»', 'Se lo llevó del local.', { ms:2600 });
    await verEn('#fp-4', 0.14);
    await cap('Paso 4 · Cobro', 'Si pagó todo, tocá «SÍ, pagado»', null, { ms:2000 });
    await toca('#f-pagado button[data-val="SI"]', 0.30);
    await cap('Paso 4 · Cobro', '¿Con qué pagó? Y cuánto entró', 'Con QR, también a qué banco.', { ms:2600 });
    await toca('#f-metodo button[data-val="QR"]', 0.30);
    await escribe('#f-cobrado', '2900', 130);
    await toca('#f-banco button', 0.35);
    await espera(300);
    await verEn('#wrap-comp', 0.30);
    await cap('Paso 4 · Cobro', 'Adjuntá la captura del pago', 'Y la foto del recibo que le diste. Al menos una es obligatoria.', { ms:3200 });
    await adjunta('#f-comp-box [onclick^="adjuntarCompForm"]', 'qr_tienda.jpg');
    await verEn('#f-submit', 0.55);
    await cap('Listo', 'Tocá «Registrar venta de tienda»', null, { ms:1800 });
    await sinCap();
    await page.locator('#f-submit').tap();
    await espera(5200);
    const ov2 = await page.evaluate(() => { const e = [...document.querySelectorAll('body *')].find(x => /Tocá para seguir/.test(x.textContent||'') && x.children.length===0); if(!e) return null; const r = e.getBoundingClientRect(); return { x:r.left+r.width/2, y:r.top+r.height/2 }; });
    if(ov2){ await page.touchscreen.tap(ov2.x, ov2.y); await espera(1400); }
    await cap('Venta registrada ✅', 'Queda como 🏪 SALIÓ DE TIENDA', 'No ocupa lugar en el camión y aparece en Contabilidad con su pago.', { ms:4600, arriba:true });
    await sinCap();
    await page.evaluate(() => { try{ closeModal(); }catch(e){} });
    await espera(900);
    await cierre('¡Venta registrada!', [
      ['Contabilidad → «🏪 Venta de tienda»', 'la tienda se pone sola'],
      ['Nota de venta y cliente', 'nombre y celular'],
      ['Productos', 'código, cantidad y precio'],
      ['Cobro', 'pagado, método, banco y la foto del comprobante']
    ], '¿Dudas? Tocá a Bloki → «¿Cómo registro una venta de tienda?»');
  }

  grabando = false;
  await cdp.send('Page.stopScreencast');
  fs.writeFileSync(path.join(OUT, 'cuadros.json'), JSON.stringify(cuadros));
  console.log('cuadros', cuadros.length, 'duración', (cuadros.length ? (cuadros[cuadros.length-1].t - cuadros[0].t).toFixed(1) : 0)+'s');
  console.log('errores', errores.length, errores.slice(0,6));
  console.log('guardado', await page.evaluate(() => window._guardado ? JSON.stringify({ cliente:_guardado.cliente, fecha:_guardado.fecha, turno:_guardado.turno, prods:_guardado.productos, acuenta:_guardado.acuenta, saldo:_guardado.saldo, pagado:_guardado.pagado, metodo:_guardado.metodoPago }) : 'NADA'));
  await b.close();
})();
