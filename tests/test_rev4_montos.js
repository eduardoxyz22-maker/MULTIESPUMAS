/* 💵 UN MONTO MAL ESCRITO NO SE GUARDA COMO OTRO NÚMERO (26/09, revisión de Codex, hallazgo 5)

   `parseMonto` saca todo lo que no es número y arma uno con lo que queda. Con los campos de plata
   ya de texto (§4gb), eso dejaba pasar sin aviso:
     · «−1500» (el menos de Unicode que ponen algunos teclados) y «Bs -1500»: se guardaban 1.500
       (`montoNegativo` solo miraba un «-» ASCII al principio);
     · «1e3» = 13, «12abc» = 12, «1500 2000» = 15.002.000 y «.50» = 50;
     · el arqueo, los retiros, el cobro del chofer y el precio de «Corregir precios y montos» ni
       miraban el signo menos (el precio negativo se BORRABA en silencio).
   Ahora `montoError` mira el texto ENTERO antes de convertirlo, y cada lugar donde una persona
   tipea plata frena con el motivo (aviso rojo, el campo marcado y nada guardado). Lo bien escrito
   vale lo mismo que antes («1.500,50», «Bs. 1.500.-», «3 500», «1.500.50»…), y un DESCUENTO sigue
   siendo «los precios suman más que el total», con su aviso: nunca un precio negativo.

     0. `montoError`/`montoNegativo` solas: lo limpio, lo negativo (siete signos menos) y lo mal escrito.
     1. Formulario: A cuenta, Saldo, Monto total cobrado, flete, 2° método y precio c/u.
     2. Contabilidad (Ventas y Mayoristas): Registrar pago, ✏️ Corregir este pago, el flete (cambiar
        lo pactado y cobrarlo desde Mis pedidos), ✏️ Corregir precios y montos, 💵 Anotar el monto.
     3. Cuadre: el arqueo y el retiro (y editar un retiro viejo de 1500.125 sin tocar el monto).
     4. Chofer: el monto del cobro en la puerta (y «Aceptar» lo que propone con un saldo de 1234.567:
        `parseMonto` lo leía 1.234.567 — lo que el panel pone en un campo va con `r2`).
     5. Descuentos: siguen como antes (se avisan, no se frenan).

   Todo se TIPEA con el teclado (`page.keyboard.type`); los dos `prompt` se contestan como los
   contestaría la persona. Red cortada, servidor simulado (la planilla vive en `window.SRV`).
   Reloj CLAVADO el miércoles 16/09/2026 a las 11 de Bolivia. Solo datos sintéticos.

   Se corre:  node tests/test_rev4_montos.js           (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/al/viejo/pedidos.html node tests/test_rev4_montos.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,extra)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, extra!=null?('· '+(typeof extra==='string'?extra:JSON.stringify(extra)).slice(0,300)):''); };
const J=x=>JSON.stringify(x);
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const ENTREGA = '2026-09-18';                                  // viernes

/* Los textos mal escritos que se prueban en CADA lugar, con lo que el aviso tiene que decir. */
const NEG = /negativ/i, COMO = /escrib/i, CERO = /0,50/;
const MALOS = [ ['−1500', NEG], ['Bs -1500', NEG], ['1e3', COMO], ['12abc', COMO], ['1500 2000', COMO], ['.50', CERO] ];

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  /* Los diálogos se contestan desde Node (un evaluate dentro del handler se cuelga). */
  const D = { confirm:true, promptVal:'' };
  const ctx = await browser.newContext({ viewport:{width:1400,height:1000}, timezoneId:'America/La_Paz', locale:'es-BO' });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-09-16T15:00:00Z'));   // miércoles 16/09, 11:00 de Bolivia
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', async d => {
    if (d.type()==='prompt') await d.accept(D.promptVal==null ? d.defaultValue() : String(D.promptVal));   // null = «Aceptar» lo que propone
    else if (D.confirm===false) await d.dismiss();
    else await d.accept();
  });
  await page.route(/^https?:/, r => r.abort());
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    CARGA_GEN++; CARGA_ESTADO='ok';
    if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; }
    if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
    window.esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms||0); }); };
    window.quieto=async function(){ for(var i=0;i<60;i++){ await esperar(25); if(!Object.keys(SAVE_EN_VUELO).length && !Object.keys(SAVE_EN_ESPERA).length) break; } await esperar(40); };
    window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(k||'')+': '+String(m)); return _t(m,k,ms); };
    window.rojos=function(){ return window._toasts.filter(function(t){ return /^err/.test(t); }); };
    // El servidor: guardar sella la fila y la deja en la planilla; listar la devuelve.
    window.SRV=[]; window.__saves=0;
    apiPost=function(b){
      if(b.action==='save'){
        window.__saves++;
        var c=JSON.parse(JSON.stringify(b.pedido)); c.rev=(Number(c.rev)||0)+1;
        window.SRV=window.SRV.filter(function(x){ return x.id!==c.id; }).concat([c]);
        return Promise.resolve({ok:true, pedido:JSON.parse(JSON.stringify(c))});
      }
      if(b.action==='delete'){ window.SRV=window.SRV.filter(function(x){ return x.id!==b.id; }); return Promise.resolve({ok:true}); }
      if(b.action==='list') return Promise.resolve({ok:true, pedidos:JSON.parse(JSON.stringify(window.SRV))});
      return Promise.resolve({ok:true});
    };
    apiList=function(){ return new Promise(function(res){ setTimeout(function(){ res({ok:true, pedidos:JSON.parse(JSON.stringify(window.SRV))}); },0); }); };
    apiBorrarFoto=function(){ return Promise.resolve({ok:true}); };
    window.hoy=todayStr();
    window.tsDe=function(f){ return new Date(f+'T12:00:00').getTime(); };
    window.P=function(o){
      var b={ turno:'AM', celular:'7', nit:'1', zona:'Norte', direccion:'X', fecha:'2026-09-18', maps:'', observaciones:'',
              estado:'', entregado:false, chofer:'', nroDia:1, fotos:[], vendedor:'Carola Chavez', ts:window.tsDe(window.hoy),
              acuenta:0, saldo:0, pagado:false, metodoPago:'', productos:[{desc:'COLCHON SOFT',medida:'140x190',cant:1}] };
      var q={}; for(var k in b) q[k]=b[k]; for(var k2 in o) q[k2]=o[k2]; return q;
    };
    window.fila=function(id){ return window.SRV.filter(function(x){ return x.id===id; })[0]||null; };
    window.porCliente=function(c){ return window.SRV.filter(function(x){ return x.cliente===c; })[0]||null; };
    // Carga la planilla como quien entra (se relee: `cobradoBs` no viaja, §4fg).
    window.cargar=async function(filas){
      try{ closeModal(); }catch(e){}
      window.SRV=JSON.parse(JSON.stringify(filas)); setPending([]);
      STATE=[]; RETIROS=[];
      SAVE_ULTIMO={}; SAVE_REV={}; SAVE_EN_VUELO={}; SAVE_EN_ESPERA={};
      await refrescarEstado();
      window._toasts=[]; window.__saves=0;
    };
    window.aVentas=async function(filas, tab){
      await cargar(filas);
      showView('conta'); segSet('cta-tab', tab||'ventas'); setContaTab(tab||'ventas');
      await esperar(120);                                        // el refresco que dispara showView
      segSet('cta-mode','mes'); document.getElementById('cta-mes').value=window.hoy.slice(0,7); setContaModo('mes');
      CTA_ULTIMA=''; window._toasts=[]; window.__saves=0;
    };
    window.aCuadre=async function(filas){
      await cargar(filas);
      showView('conta'); segSet('cta-tab','cuadre'); setContaTab('cuadre');
      await esperar(120);
      document.getElementById('cua-vendedor').value='';
      segSet('cua-mode','mes'); document.getElementById('cua-mes').value=window.hoy.slice(0,7); setCuadreModo('mes');
      window._toasts=[]; window.__saves=0;
    };
    // El botón de la ficha cuyo onclick llama a `fn`.
    window.boton=function(fn, txt){ return [].slice.call(document.querySelectorAll('#modal-box button')).filter(function(b){
      return new RegExp(fn).test(b.getAttribute('onclick')||'') && (txt==null || txt.test(b.textContent)); })[0]||null; };
    window.rojo=function(sel){ var e=document.querySelector(sel); return !!(e && e.classList.contains('err')); };
    // Un pedido nuevo en el formulario, con lo mínimo y la planilla vacía (cada intento arranca de cero).
    window.empezarForm=async function(cliente){
      await cargar([]);
      showView('form'); await esperar(150); resetForm();
      document.getElementById('f-vendedor').value='Mirian Salazar'; applyVendedorLite();
      document.getElementById('f-cliente').value=cliente;
      document.getElementById('f-celular').value='70000001';
      document.getElementById('f-zona').value='Norte';
      document.getElementById('f-nota').value='2001';
      document.getElementById('f-fecha').value='2026-09-18';
      document.querySelector('#f-productos .prod-desc').value='TITANIO LATEX';
      window._toasts=[]; window.__saves=0;
    };
    window.guardarForm=async function(sel, cliente){
      window._toasts=[]; window.__saves=0;
      submitPedido();
      // O guarda (relee la planilla y recién ahí manda) o frena con un aviso rojo: se espera a una de las dos (tope 3 s).
      for(var i=0;i<120;i++){ await esperar(25); if(window.__saves>0 || rojos().length) break; }
      await quieto();
      var o={ saves:window.__saves, rojos:rojos(), marcado:rojo(sel), fila:porCliente(cliente) };
      try{ closeModal(); }catch(e){}
      return o;
    };
  });

  /* Tipea como la gente: vacía el campo y escribe tecla por tecla. */
  const tipear = async (sel, txt) => { await page.fill(sel, ''); await page.focus(sel); await page.keyboard.type(txt); };
  const elegir = (seg, val) => page.click('#'+seg+' button[data-val="'+val+'"]');
  const aviso = (o, re) => o.rojos.some(t => re.test(t));

  // ══ 0 · LA FUNCIÓN SOLA ══════════════════════════════════════════════════════════════════════
  console.log('\n── 0. montoError / montoNegativo ──');
  let r = await page.evaluate(() => {
    function NEG_OK(t){ return /negativ/i.test(montoError(t)) && montoNegativo(t)===true; }
    if(typeof montoError!=='function') return { falta:true, neg:['−1500','Bs -1500','–1500','—1500','‒1500','﹣1500','－1500'].filter(function(t){ return !montoNegativo(t); }) };
    var limpios=[['1500',1500],['1.500',1500],['1.500,50',1500.5],['1500,50',1500.5],['1,500.50',1500.5],['1500.5',1500.5],['0,50',0.5],
                 ['Bs. 1.500.-',1500],['1.500 Bs',1500],['3 500',3500],['1.500.50',1500.5],
                 ['Bs 2.000,00.-',2000],['1.500 Bs.',1500],['Bs.1500',1500],['BS 150',150],['bs. 150',150],['1,500,50',1500.5],
                 ['12.345.678',12345678],['1.500.000,50',1500000.5],['0.05',0.05],['1.500,-',1500],['  2500 ',2500],['0',0],['',0]];
    var negativos=['-1500','−1500','– 1500','—1500','‒1500','﹣1500','－1500','Bs -1500','Bs. −1.500','bs.-1500',' - 1.500,50','-0,50'];
    var malos=['1e3','1E3','12abc','1500 2000','.50',',50','(1500)','$1500','$us 100','1500+200','1.5000','1500.123','0.500','1500,000',
               '1.500,000','1500.','Bs','abc','15 00'];
    return {
      limpiosMal: limpios.filter(function(c){ return montoError(c[0])!=='' || parseMonto(c[0])!==c[1]; }).map(function(c){ return c[0]+' → «'+montoError(c[0])+'» '+parseMonto(c[0]); }),
      negMal: negativos.filter(function(t){ return !NEG_OK(t); }).map(function(t){ return t+' → «'+montoError(t)+'» '+montoNegativo(t); }),
      malosMal: malos.filter(function(t){ var e=montoError(t); return !e || /negativ/i.test(e); }).map(function(t){ return t+' → «'+montoError(t)+'»'; }),
      motivos: { e:montoError('1e3'), dos:montoError('1500 2000'), cero:montoError('.50'), neg:montoError('Bs -1500') },
      puntoGuion: [montoNegativo('Bs. 1.500.-'), montoNegativo('1.500,-'), montoNegativo('1500')],
      form: (function(){ var i=document.createElement('input'); i.value='−500'; var a=montoForm(i); i.value='1e3'; var b=montoForm(i); i.value='1.500,50'; return [a,b,montoForm(i)]; })()
    };
  });
  if (r.falta) {
    chk('existe `montoError` (valida el texto entero)', false, 'no está');
    chk('⚠️ `montoNegativo` ve los siete signos menos (−, –, —, ‒, ﹣, －) y el de «Bs -1500»', r.neg.length===0, r.neg);
  } else {
    chk('existe `montoError` (valida el texto entero)', true);
    chk('lo bien escrito no tiene error y vale lo mismo que con `parseMonto` («1.500,50», «Bs. 1.500.-», «3 500», «1.500.50»…)', r.limpiosMal.length===0, r.limpiosMal);
    chk('⚠️ los siete signos menos, con o sin «Bs» adelante, dicen «no puede ser negativo»', r.negMal.length===0, r.negMal);
    chk('⚠️ «1e3», «12abc», «1500 2000», «.50», «(1500)», «$1500», «1500,000»… son un error (no negativo)', r.malosMal.length===0, r.malosMal);
    chk('…y el motivo dice cómo escribirlo', /1\.500,50/.test(r.motivos.e) && /1\.500,50/.test(r.motivos.dos) && /0,50/.test(r.motivos.cero) && /negativ/i.test(r.motivos.neg), r.motivos);
    chk('el «.-» del final de «Bs. 1.500.-» no es un signo menos', J(r.puntoGuion)==='[false,false,false]', r.puntoGuion);
    chk('`montoForm` (lo que suma en pantalla) da 0 con un monto mal escrito, como con el negativo', J(r.form)==='[0,0,1500.5]', r.form);
  }

  // ══ 1 · FORMULARIO ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── 1. Formulario: los seis campos de plata ──');
  const campos = [
    { nombre:'A cuenta', sel:'#f-acuenta',
      arma: async () => { await tipear('#f-acuenta','500'); await elegir('f-metodo','Efectivo'); await tipear('#f-saldo','2500'); await page.evaluate(() => { FORM_COMPS=['IMGA']; }); },
      bueno:'Bs. 1.500,50.-', ok: f => f && f.acuenta===1500.5 && f.saldo===2500, ver: f => f && { acuenta:f.acuenta, saldo:f.saldo } },
    { nombre:'Saldo', sel:'#f-saldo', arma: async () => {},
      bueno:'1,500.50', ok: f => f && f.saldo===1500.5 && f.acuenta===0, ver: f => f && { acuenta:f.acuenta, saldo:f.saldo } },
    { nombre:'Monto total cobrado', sel:'#f-cobrado',
      arma: async () => { await elegir('f-pagado','SI'); await elegir('f-metodo','Efectivo'); await page.evaluate(() => { FORM_COMPS=['IMGC']; }); },
      bueno:'3 500', ok: f => f && /^~Efectivo 3500 @/.test(f.metodoPago), ver: f => f && f.metodoPago },
    { nombre:'flete', sel:'#f-envio', arma: async () => { await tipear('#f-saldo','3000'); },
      bueno:'150,50', ok: f => f && /\^150\.5\b/.test(f.metodoPago) && f.saldo===3000, ver: f => f && { mp:f.metodoPago, saldo:f.saldo } },
    { nombre:'2° método', sel:'#f-monto2',
      arma: async () => { await tipear('#f-acuenta','2000'); await elegir('f-metodo','Efectivo'); await tipear('#f-saldo','1000');
                          await page.evaluate(() => { FORM_COMPS=['IMGM1']; toggleMixto(true); }); await elegir('f-metodo2','Tarjeta');
                          await page.evaluate(() => { FORM_COMPS2=['IMGM2']; }); },
      bueno:'500,50', ok: f => f && /^~Efectivo 1499\.5 @\S+ #2001 %IMGM1 \+ Tarjeta 500\.5 @/.test(f.metodoPago) && f.acuenta===2000, ver: f => f && { mp:f.metodoPago, acuenta:f.acuenta } },
    { nombre:'precio c/u', sel:'#f-productos .prod-precio', arma: async () => { await tipear('#f-saldo','3000'); },
      bueno:'1.250', ok: f => f && f.productos[0].precio===1250, ver: f => f && f.productos }
  ];
  let nCli = 0;
  for (const c of campos) {
    for (const [txt, re] of MALOS) {
      const cli = 'MAL '+(++nCli);
      await page.evaluate(n => empezarForm(n), cli);
      await c.arma();
      await tipear(c.sel, txt);
      const g = await page.evaluate(a => guardarForm(a.sel, a.cli), { sel:c.sel, cli });
      chk('⚠️ '+c.nombre+' «'+txt+'» NO se guarda, se marca y se dice por qué', g.saves===0 && !g.fila && g.marcado && aviso(g, re),
          g.fila ? { guardado:c.ver(g.fila) } : { saves:g.saves, marcado:g.marcado, rojos:g.rojos });
    }
    const cli = 'BIEN '+(++nCli);
    await page.evaluate(n => empezarForm(n), cli);
    await c.arma();
    await tipear(c.sel, c.bueno);
    const g = await page.evaluate(a => guardarForm(a.sel, a.cli), { sel:c.sel, cli });
    chk('control · '+c.nombre+' «'+c.bueno+'» se guarda bien, sin avisos rojos', c.ok(g.fila) && !g.rojos.length, g.fila ? c.ver(g.fila) : g);
  }
  // el aviso nombra el campo, lo tipeado y el motivo
  {
    await page.evaluate(n => empezarForm(n), 'NOMBRA EL CAMPO');
    await tipear('#f-productos .prod-precio', '1500 2000');
    const g = await page.evaluate(() => guardarForm('#f-productos .prod-precio', 'NOMBRA EL CAMPO'));
    chk('el aviso dice QUÉ campo, lo que se tipeó y el motivo («precio», «1500 2000», «dos números»)',
        g.rojos.some(t => /precio/i.test(t) && /1500 2000/.test(t) && /dos n[úu]meros/i.test(t)), g.rojos);
  }

  // ══ 2 · CONTABILIDAD ═════════════════════════════════════════════════════════════════════════
  console.log('\n── 2a. Contabilidad: «Registrar pago» (Ventas y Mayoristas) ──');
  const PAGO = () => page.evaluate(async () => {
    window._toasts=[]; window.__saves=0;
    var n=document.getElementById('cta-pago-nota'); if(n) n.value='777';
    CTA_PAGO.comps=['IMGP'];
    var b=boton('ctaRegistrarPago'); if(b) b.click();
    await esperar(80); await quieto();
    var p=findById('RP')||{};
    return { boton:!!b, saves:window.__saves, rojos:rojos(), marcado:rojo('#cta-pago-monto'), mp:(fila('RP')||{}).metodoPago, cobros:cobrosReales(p).length, saldo:p.saldo };
  });
  for (const [txt, re] of MALOS) {
    await page.evaluate(async () => { await aVentas([ P({ id:'RP', nota:'301', oc:'09-301', cliente:'REGISTRAR PAGO', saldo:3000 }) ]); showContaModal('RP'); });
    await tipear('#cta-pago-monto', txt);
    r = await PAGO();
    chk('⚠️ Registrar pago «'+txt+'» NO se anota, se marca y se dice por qué', r.boton && r.saves===0 && r.cobros===0 && !r.mp && r.marcado && aviso(r, re), r);
  }
  await page.evaluate(async () => { await aVentas([ P({ id:'RP', nota:'301', oc:'09-301', cliente:'REGISTRAR PAGO', saldo:3000 }) ]); showContaModal('RP'); });
  await tipear('#cta-pago-monto', '1.500,50');
  r = await PAGO();
  chk('control · Registrar pago «1.500,50» anota Bs 1.500,50 y quedan 1.499,50', /^Efectivo 1500\.5 @2026-09-16 #777/.test(r.mp||'') && r.saldo===1499.5 && !r.rojos.length, r);
  // Mayoristas: la misma ficha
  await page.evaluate(async () => { await aVentas([ P({ id:'RP', nota:'302', oc:'09-302', cliente:'MAYORISTA', vendedor:CONTA_MAYORISTAS[0], saldo:3000 }) ], 'mayor'); showContaModal('RP'); });
  await tipear('#cta-pago-monto', '−1500');
  r = await PAGO();
  chk('⚠️ Mayoristas: Registrar pago «−1500» tampoco se anota', r.boton && r.saves===0 && r.cobros===0 && r.marcado && aviso(r, NEG), r);

  console.log('\n── 2b. Contabilidad: «✏️ Corregir este pago» ──');
  const abrirCP = () => page.evaluate(async () => {
    await aVentas([ P({ id:'CP', nota:'10', oc:'09-310', cliente:'CORREGIR PAGO', saldo:2000,
                        metodoPago:textoCobros([{ metodo:'Efectivo', monto:1000, fecha:'2026-09-16', nota:'10', comps:['C1'] }]) }) ]);
    showContaModal('CP'); ctaEditarPago('CP', 0);
  });
  const guardarCP = () => page.evaluate(async () => {
    window._toasts=[]; window.__saves=0;
    var b=boton('ctaGuardarPago'); if(b) b.click();
    await esperar(80); await quieto();
    var c=cobrosReales(findById('CP')||{})[0]||{};
    return { boton:!!b, saves:window.__saves, rojos:rojos(), marcado:rojo('#cta-ed-monto'), monto:c.monto, mp:(fila('CP')||{}).metodoPago };
  });
  for (const [txt, re] of MALOS) {
    await abrirCP();
    await tipear('#cta-ed-monto', txt);
    r = await guardarCP();
    chk('⚠️ Corregir este pago «'+txt+'» NO cambia el pago de 1.000, se marca y se dice por qué', r.boton && r.saves===0 && r.monto===1000 && r.marcado && aviso(r, re), r);
  }
  await abrirCP();
  await tipear('#cta-ed-monto', '1.200');
  r = await guardarCP();
  chk('control · Corregir este pago «1.200» deja el pago en 1.200', r.monto===1200 && /^Efectivo 1200 @2026-09-16 #10/.test(r.mp||'') && !r.rojos.length, r);

  console.log('\n── 2c. Contabilidad: el flete (cambiar lo pactado, y cobrarlo desde Mis pedidos) ──');
  const abrirFL = () => page.evaluate(async () => {
    await aVentas([ P({ id:'FL', nota:'320', oc:'09-320', cliente:'FLETE PACTADO', saldo:3000, metodoPago:textoCobros([{ envio:true, metodo:'', monto:150 }]) }) ]);
    showContaModal('FL'); ctaEditarEnvio('FL', 1);
  });
  const guardarFL = () => page.evaluate(async () => {
    window._toasts=[]; window.__saves=0;
    var b=boton('ctaGuardarEnvio'); if(b) b.click();
    await esperar(80); await quieto();
    var p=findById('FL')||{};
    return { boton:!!b, saves:window.__saves, rojos:rojos(), marcado:rojo('#cta-env-monto'), pactado:envioPorCobrar(p), mp:(fila('FL')||{}).metodoPago };
  });
  for (const [txt, re] of MALOS) {
    await abrirFL();
    await tipear('#cta-env-monto', txt);
    r = await guardarFL();
    chk('⚠️ cambiar el flete pactado a «'+txt+'» NO cambia los 150, se marca y se dice por qué', r.boton && r.saves===0 && r.pactado===150 && r.marcado && aviso(r, re), r);
  }
  await abrirFL();
  await tipear('#cta-env-monto', '200');
  r = await guardarFL();
  chk('control · el flete pactado «200» queda en 200', r.pactado===200 && /\^200\b/.test(r.mp||'') && !r.rojos.length, r);

  const abrirFC = () => page.evaluate(async () => {
    await cargar([ P({ id:'FC', nota:'330', oc:'09-330', cliente:'COBRAR FLETE', saldo:3000, metodoPago:textoCobros([{ envio:true, metodo:'', monto:150 }]) }) ]);
    showView('mis'); await esperar(120);
    cobrarFlete('FC'); await esperar(150);
    window._toasts=[]; window.__saves=0;
  });
  const cobrarFC = () => page.evaluate(async () => {
    window._toasts=[]; window.__saves=0;
    var n=document.getElementById('cta-pago-nota'); if(n) n.value='901';
    CTA_PAGO.comps=['IMGF'];
    var b=boton('ctaRegistrarPago'); if(b) b.click();
    await esperar(80); await quieto();
    var p=findById('FC')||{};
    return { tipo:CTA_TIPO, boton:!!b, saves:window.__saves, rojos:rojos(), marcado:rojo('#cta-pago-monto'), cobrado:envioCobrado(p), saldo:p.saldo };
  });
  for (const [txt, re] of MALOS) {
    await abrirFC();
    await tipear('#cta-pago-monto', txt);
    r = await cobrarFC();
    chk('⚠️ cobrar el flete (desde Mis pedidos) con «'+txt+'» NO se anota, se marca y se dice por qué', r.boton && r.saves===0 && r.cobrado===0 && r.marcado && aviso(r, re), r);
  }
  await abrirFC();
  await tipear('#cta-pago-monto', '150');
  r = await cobrarFC();
  chk('control · cobrar el flete «150» lo anota como flete cobrado y la venta sigue debiendo 3.000', r.cobrado===150 && r.saldo===3000 && !r.rojos.length, r);

  console.log('\n── 2d. Contabilidad: «✏️ Corregir precios y montos» ──');
  const abrirCM = () => page.evaluate(async () => {
    await aVentas([ P({ id:'CM', nota:'340', oc:'09-340', cliente:'CORREGIR MONTOS', saldo:3000,
                        productos:[{desc:'COLCHON SOFT', medida:'140x190', cant:1, precio:3000}] }) ]);
    showContaModal('CM');
  });
  const guardarCM = (sel) => page.evaluate(async (sel) => {
    window._toasts=[]; window.__saves=0;
    var b=boton('ctaGuardarMontos'); if(b) b.click();
    await esperar(80); await quieto();
    var f=fila('CM')||{}, p=findById('CM')||{};
    return { boton:!!b, saves:window.__saves, rojos:rojos(), marcado:rojo(sel), precio:((p.productos||[])[0]||{}).precio,
             acuenta:p.acuenta, saldo:p.saldo, srv:{ precio:((f.productos||[])[0]||{}).precio, acuenta:f.acuenta, saldo:f.saldo } };
  }, sel);
  const CM_MALOS = [ ['−2500', NEG], ['-2500', NEG], ['Bs -2500', NEG], ['1e3', COMO], ['12abc', COMO], ['1500 2000', COMO], ['.50', CERO] ];
  for (const [id, nombre] of [['#cta-pr-0','el precio'], ['#cta-acuenta','A cuenta'], ['#cta-saldo','el saldo']]) {
    for (const [txt, re] of CM_MALOS) {
      await abrirCM();
      await tipear(id, txt);
      r = await guardarCM(id);
      chk('⚠️ Corregir precios y montos: '+nombre+' «'+txt+'» NO se guarda (queda 3.000 · 0 · 3.000), se marca y se dice por qué',
          r.boton && r.saves===0 && r.precio===3000 && (Number(r.acuenta)||0)===0 && r.saldo===3000 && r.marcado && aviso(r, re), r);
    }
  }
  await abrirCM();
  await tipear('#cta-pr-0', '2.800,50'); await tipear('#cta-saldo', '2.800,50');
  r = await guardarCM('#cta-pr-0');
  chk('control · precio «2.800,50» y saldo «2.800,50» se guardan así', r.precio===2800.5 && r.saldo===2800.5 && r.srv.precio===2800.5 && !r.rojos.length, r);

  console.log('\n── 2e. Contabilidad: «💵 Anotar el monto» (venta PAGADA sin monto) ──');
  const anotar = (val) => { D.promptVal=val; return page.evaluate(async () => {
    await aVentas([ P({ id:'AM', nota:'350', oc:'09-350', cliente:'PAGADA SIN MONTO', pagado:true, metodoPago:'Efectivo %AM1' }) ]);
    showContaModal('AM');
    var b=boton('ctaAnotarMonto'); if(b) b.click();
    await esperar(80); await quieto();
    var p=findById('AM')||{}, c=cobrosDe(p)[0]||{};
    return { boton:!!b, saves:window.__saves, rojos:rojos(), sinMonto:!!c.sinMonto, monto:Number(c.monto)||0, cobrado:totalCobrado(p) };
  }); };
  for (const [txt, re] of MALOS) {
    r = await anotar(txt);
    chk('⚠️ Anotar el monto «'+txt+'» NO se anota (sigue sin monto) y se dice por qué', r.boton && r.saves===0 && r.sinMonto && r.cobrado===0 && aviso(r, re), r);
  }
  r = await anotar('Bs. 1.500.-');
  chk('control · Anotar el monto «Bs. 1.500.-» anota 1.500', !r.sinMonto && r.monto===1500 && !r.rojos.length, r);

  // ══ 3 · CUADRE ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n── 3a. Cuadre: el arqueo ──');
  await page.evaluate(async () => {
    await aCuadre([ P({ id:'Q1', nota:'11', oc:'09-011', cliente:'CON QR', pagado:true,
                        metodoPago:textoCobros([{ metodo:'QR', banco:'BISA', monto:1500.5, fecha:window.hoy, nota:'11', comps:['Q1'] }]) }) ]);
    ARQUEO={}; renderCuadre();
  });
  const arqueo = async (txt) => {
    await page.evaluate(() => { window._toasts=[]; window.__saves=0; });
    await page.locator('#cua-cierre input.cua-arqueo').first().click();
    await page.keyboard.press('Control+A'); await page.keyboard.press('Backspace');
    await page.keyboard.type(txt); await page.keyboard.press('Tab');
    await page.waitForTimeout(80);
    return page.evaluate(() => ({ v:cuadreArqueo('QR BISA'), saves:window.__saves, rojos:rojos(), marcado:rojo('#cua-cierre input.cua-arqueo') }));
  };
  r = await arqueo('900');
  chk('(el extracto anotado primero: 900)', r.v===900, r);
  for (const [txt, re] of MALOS) {
    r = await arqueo(txt);
    chk('⚠️ arqueo «'+txt+'» NO pisa los 900 anotados, se marca y se dice por qué', r.v===900 && r.saves===0 && r.marcado && aviso(r, re), r);
  }
  r = await arqueo('Bs. 1.500,50.-');
  chk('control · arqueo «Bs. 1.500,50.-» anota 1.500,50 y el cuadre cierra', r.v===1500.5 && !r.rojos.length && !r.marcado, r);

  console.log('\n── 3b. Cuadre: el retiro ──');
  const retiro = async (txt) => {
    await page.evaluate(async () => {
      await aCuadre([ P({ id:'E1', nota:'12', oc:'09-012', cliente:'EFECTIVO', pagado:true,
                          metodoPago:textoCobros([{ metodo:'Efectivo', monto:6000, fecha:window.hoy, nota:'12', comps:['E1'] }]) }) ]);
      abrirRetiros(); document.getElementById('ret-entrega').value='Carola Chavez'; retEntregaCambio();
      document.getElementById('ret-nota-nueva').value='12'; retAgregarNota();
      window._toasts=[]; window.__saves=0;
    });
    await page.locator('#ret-monto').click(); await page.keyboard.type(txt);
    return page.evaluate(async () => {
      var ok=guardarRetiroForm(); await esperar(80); await quieto();
      return { ok:ok, saves:window.__saves, rojos:rojos(), marcado:rojo('#ret-monto'), montos:retirosTodos().map(function(x){ return x.monto; }),
               srv:window.SRV.filter(esFilaRetiro).map(function(x){ return x.acuenta; }) };
    });
  };
  for (const [txt, re] of MALOS) {
    r = await retiro(txt);
    chk('⚠️ retiro «'+txt+'» NO se registra, se marca y se dice por qué', r.saves===0 && !r.montos.length && !r.srv.length && r.marcado && aviso(r, re), r);
  }
  r = await retiro('5.000');
  chk('control · retiro «5.000» se registra por Bs 5.000', J(r.montos)==='[5000]' && J(r.srv)==='[5000]' && !r.rojos.length, r);
  // Un retiro viejo con tres decimales (tocado a mano en la hoja): editarlo sin tocar el monto no lo multiplica por mil.
  r = await page.evaluate(async () => {
    var f=filaDeRetiro({ id:RETIRO_PREF+'v1__', fecha:window.hoy, entrega:'Carola Chavez', retira:'Eduardo Añez', monto:1500, notas:['12'], tipo:'Facturado', fotos:[], obs:'' });
    f.acuenta=1500.125;
    await aCuadre([ f ]);
    abrirRetiros(); editarRetiro(RETIRO_PREF+'v1__');
    var campo=document.getElementById('ret-monto').value;
    var ok=guardarRetiroForm(); await esperar(80); await quieto();
    return { campo:campo, ok:ok, rojos:rojos(), montos:retirosTodos().map(function(x){ return x.monto; }) };
  });
  chk('⚠️ editar un retiro viejo de 1500.125 sin tocar el monto lo deja en 1.500,13 (no 1.500.125, ni frenado)', r.campo==='1500.13' && J(r.montos)==='[1500.13]' && !r.rojos.length, r);

  // ══ 4 · CHOFER ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n── 4. Chofer: el cobro en la puerta ──');
  const cobra = (val, saldo) => { D.promptVal=val; return page.evaluate(async (saldo) => {
    await cargar([ P({ id:'CH', nota:'360', oc:'09-360', cliente:'COBRA EL CHOFER', fecha:window.hoy, chofer:'Luis Pierre', saldo:saldo||1500 }) ]);
    showView('chofer'); await esperar(120);
    llenarSelectChoferes(); document.getElementById('cho-nombre').value='Luis Pierre'; renderChofer();
    window._toasts=[]; window.__saves=0;
    choCobrarMetodo('CH','Efectivo');
    await esperar(80); await quieto();
    var p=findById('CH')||{};
    return { saves:window.__saves, rojos:rojos(), cobros:cobrosReales(p).map(function(c){ return c.monto; }), mp:(fila('CH')||{}).metodoPago };
  }, saldo); };
  for (const [txt, re] of MALOS) {
    r = await cobra(txt);
    chk('⚠️ el chofer cobra «'+txt+'»: NO se anota y se dice por qué', r.saves===0 && !r.cobros.length && !r.mp && aviso(r, re), r);
  }
  r = await cobra('1.500');
  chk('control · el chofer cobra «1.500»: queda anotado Bs 1.500', J(r.cobros)==='[1500]' && /^Efectivo 1500 @/.test(r.mp||'') && !r.rojos.length, r);
  // Un saldo viejo con tres decimales: «Aceptar» lo que propone el panel no lo multiplica por mil.
  r = await cobra(null, 1234.567);
  chk('⚠️ con un saldo viejo de 1234.567, «Aceptar» lo propuesto anota 1.234,57 (no 1.234.567, ni frenado)', J(r.cobros)==='[1234.57]' && !r.rojos.length, r);

  // ══ 5 · DESCUENTOS: SE AVISAN, NO SE FRENAN ══════════════════════════════════════════════════
  console.log('\n── 5. Descuentos (los precios suman más que el total) ──');
  await page.evaluate(n => empezarForm(n), 'CON DESCUENTO');
  await tipear('#f-productos .prod-precio', '3.000');
  await tipear('#f-saldo', '2.800');
  let g = await page.evaluate(() => guardarForm('#f-saldo', 'CON DESCUENTO'));
  chk('control · formulario: precio 3.000 y saldo 2.800 se guarda (el descuento no se frena)', g.fila && g.fila.productos[0].precio===3000 && g.fila.saldo===2800 && !g.rojos.length, g.fila ? { prods:g.fila.productos, saldo:g.fila.saldo } : g);
  await abrirCM();
  await tipear('#cta-saldo', '2.800');
  const aviso5 = await page.evaluate(() => { ctaRecalc(); return (document.getElementById('cta-tot-aviso')||{}).textContent||''; });
  r = await guardarCM('#cta-saldo');
  chk('control · «Corregir precios y montos» avisa «Puede ser un descuento» (precios 3.000, total 2.800)', /Puede ser un descuento/.test(aviso5), aviso5);
  chk('control · …y lo guarda igual: precio 3.000, saldo 2.800', r.precio===3000 && r.saldo===2800 && !r.rojos.length, r);

  chk('sin errores JS', errores.length===0, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
