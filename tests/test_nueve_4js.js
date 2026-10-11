/* ✨ LAS NUEVE MEJORAS (§4js, 11/10/2026). El dueño eligió «P1, P3, M1, M3, C1, C2, A1, A2, A3», vio las muestras y dijo
   «todo está bueno, solo falta pulir el diseño». Esta prueba mira que cada una haga lo que dice, con datos inventados:
     P1 el celular completa los datos del cliente que ya compró (y «No es él» los vacía) · P3 el mensaje para el cliente al guardar
     M1 la 5ª ficha «🔔 Mañana» y su lista · M3 el festejo · C1 el cierre del mes en un Excel · C2 los pagos sin terminar
     A1 el camión sugerido · A2 la hoja de ruta por cercanía · A3 el aviso de las 15:00
   Red cortada, servidor simulado, reloj clavado. Se corre:  node tests/test_nueve_4js.js
   Dientes:  PEDIDOS=/ruta/a/un/pedidos.html/viejo node tests/test_nueve_4js.js            */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,extra)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, extra!=null?('· '+(typeof extra==='string'?extra:JSON.stringify(extra))):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];

  async function nueva(iso) {
    const ctx = await browser.newContext({ viewport:{width:1300,height:1000}, timezoneId:'America/La_Paz', locale:'es-BO' });
    const page = await ctx.newPage();
    await page.clock.setFixedTime(new Date(iso));
    page.on('pageerror', e => errores.push(e.message));
    page.on('dialog', d => d.accept());
    await page.route(/^https?:/, r => r.abort());
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    const ok = await page.evaluate(() => typeof nxCliBuscar==='function');
    if(!ok) return page;
    await page.evaluate(() => {
      var c=document.getElementById('conn-form'); if(c) c.style.display='none';
      CONNECTED=true; UNLOCKED=true;
      CARGA_GEN++; CARGA_ESTADO='ok';
      if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; }
      if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
      if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
      if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
      try{ localStorage.clear(); }catch(e){}
      window.__XLSX=null; window.__NOMBRE='';
      buildXlsx=function(sheets){ window.__XLSX=JSON.parse(JSON.stringify(sheets)); return new Uint8Array([1]); };
      downloadBlob=function(b,n){ window.__NOMBRE=n; };
      window.SRV=[];
      apiPost=function(b){
        if(b.action==='save'){
          var c=JSON.parse(JSON.stringify(b.pedido)); c.rev=(Number(c.rev)||0)+1;
          window.SRV=window.SRV.filter(function(x){ return x.id!==c.id; }).concat([c]);
          return Promise.resolve({ok:true, pedido:JSON.parse(JSON.stringify(c))});
        }
        if(b.action==='list') return Promise.resolve({ok:true, pedidos:JSON.parse(JSON.stringify(window.SRV))});
        return Promise.resolve({ok:true});
      };
      apiList=function(){ return new Promise(function(res){ setTimeout(function(){ res({ok:true, pedidos:JSON.parse(JSON.stringify(window.SRV))}); },0); }); };
      window.hoy=todayStr();
      window.dia=function(n){ var d=new Date(window.hoy+'T12:00:00'); d.setDate(d.getDate()+n); return isoLocal(d); };
      window.tsDe=function(f){ return new Date(f+'T12:00:00').getTime(); };
      window.P=function(o){
        var b={ turno:'AM', celular:'', nit:'', zona:'Norte', direccion:'Calle 1', fecha:window.dia(2), maps:'', observaciones:'',
                estado:'', entregado:false, chofer:'', vehiculo:'', nroDia:1, fotos:[], vendedor:'Carola Chavez', ts:window.tsDe(window.hoy),
                acuenta:0, saldo:0, pagado:true, metodoPago:'', productos:[{desc:'COLCHON SOFT',medida:'140x190',cant:1}] };
        var q={}; for(var k in b) q[k]=b[k]; for(var k2 in o) q[k2]=o[k2]; return q;
      };
      window.cargar=async function(filas){
        closeModal();
        window.SRV=JSON.parse(JSON.stringify(filas)); setPending([]);
        STATE=[]; RETIROS=[];
        SAVE_ULTIMO={}; SAVE_REV={}; SAVE_EN_VUELO={}; SAVE_EN_ESPERA={};
        await refrescarEstado();
      };
      window.esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
    });
    return page;
  }

  /* ─────────────────────────────── viernes 09/10/2026, 11:00 de Bolivia (mañana = sábado 10/10) */
  let page = await nueva('2026-10-09T15:00:00Z');
  if(!(await page.evaluate(() => typeof nxCliBuscar==='function'))){
    chk('existen las funciones de §4js', false); console.log(`\n${PASS} bien · ${FAIL} mal`); await browser.close(); process.exit(1);
  }

  console.log('\n── P1 · el cliente que ya compró ──');
  let r = await page.evaluate(async () => {
    await cargar([ P({ id:'A1', oc:'09-112', cliente:'JUAN CARLOS ROCA', celular:'71234567', zona:'Equipetrol', direccion:'Av. Banzer 123', maps:'https://www.google.com/maps?q=-17.76,-63.19', facturarA:'ROCA SRL', nit:'4455', fecha:window.dia(-20), ts:window.tsDe(window.dia(-25)) }),
                   P({ id:'A0', oc:'08-050', cliente:'JUAN ROCA', celular:'591 712 34567', zona:'Viejo', fecha:window.dia(-60), ts:window.tsDe(window.dia(-61)) }) ]);
    showView('form'); resetForm();
    var c=document.getElementById('f-celular'); c.value='712 3456'; c.dispatchEvent(new Event('input',{bubbles:true}));
    await esperar(450);
    var antes=document.getElementById('f-cliente').value;
    c.value='712 34567'; c.dispatchEvent(new Event('input',{bubbles:true}));
    await esperar(450);
    var g=function(id){ return document.getElementById(id).value; }, box=document.getElementById('nx-cli');
    return { antes:antes, cli:g('f-cliente'), zona:g('f-zona'), dir:g('f-direccion'), maps:g('f-maps'), fac:g('f-facturar'), nit:g('f-nit'),
             visible:!box.hidden, txt:box.innerText };
  });
  chk('con 7 números de un celular todavía no busca', r.antes==='', r.antes);
  chk('completa el nombre del pedido más nuevo', r.cli==='JUAN CARLOS ROCA', r.cli);
  chk('y zona, dirección, ubicación, facturar a y NIT', r.zona==='Equipetrol' && r.dir==='Av. Banzer 123' && /q=-17.76/.test(r.maps) && r.fac==='ROCA SRL' && r.nit==='4455', r);
  chk('el cartel dice que ya compró, cuántos pedidos y el último', r.visible && /Ya compró · 2 pedidos/.test(r.txt) && /09-112/.test(r.txt), r.txt.slice(0,120));
  r = await page.evaluate(async () => {
    document.getElementById('f-zona').value='Norte (lo cambié)';
    nxCliNoEs();
    var g=function(id){ return document.getElementById(id).value; };
    return { cli:g('f-cliente'), zona:g('f-zona'), dir:g('f-direccion'), oculto:document.getElementById('nx-cli').hidden };
  });
  chk('«No es él» vacía lo completado y respeta lo que se cambió a mano', r.cli==='' && r.dir==='' && r.zona==='Norte (lo cambié)' && r.oculto, r);
  r = await page.evaluate(async () => {
    resetForm();
    document.getElementById('f-cliente').value='OTRO NOMBRE';
    var c=document.getElementById('f-celular'); c.value='71234567'; c.dispatchEvent(new Event('input',{bubbles:true}));
    await esperar(450);
    var cli=document.getElementById('f-cliente').value, zona=document.getElementById('f-zona').value;
    resetForm(); EDIT_ID='A1';
    c.value='71234567'; c.dispatchEvent(new Event('input',{bubbles:true}));
    await esperar(450);
    var editZona=document.getElementById('f-zona').value, oculto=document.getElementById('nx-cli').hidden;
    resetForm();
    return { cli:cli, zona:zona, editZona:editZona, oculto:oculto };
  });
  chk('lo ya escrito no se pisa (completa solo lo vacío)', r.cli==='OTRO NOMBRE' && r.zona==='Equipetrol', r);
  chk('al corregir un pedido no completa nada', r.editZona==='' && r.oculto, r);

  console.log('\n── P3 · el mensaje para el cliente ──');
  r = await page.evaluate(async () => {
    var p=P({ id:'W1', oc:'10-045', cliente:'JUAN CARLOS ROCA', celular:'71234567', fecha:window.dia(4), turno:'PM', pagado:false, saldo:1200, direccion:'Los Pinos 123',
              productos:[{desc:'TITANIO LATEX',medida:'140x190',cant:1},{desc:'SOMIER ORO',medida:'140x190',cant:1}] });
    STATE.push(p);
    showWhatsappModal(p);
    var t=(document.getElementById('nx-wa-cli')||{}).value||'', btn=[].slice.call(document.querySelectorAll('#modal-box button')).some(function(b){ return /WhatsApp de Juan/.test(b.textContent); });
    closeModal();
    var atc=P({ id:'W2', oc:'ATC 10-003', cliente:'X', celular:'71234567' }); STATE.push(atc);
    showWhatsappModal(atc); var enAtc=!!document.getElementById('nx-wa-cli'); closeModal();
    showWhatsappModal(p, 'closeModal()', true); var enReenvio=!!document.getElementById('nx-wa-cli'); closeModal();
    confirmEdicionModal(p, ['📅 cambió la fecha de entrega']); var conCambio=!!document.querySelector('#modal-box button[onclick*="nxAvisarCambio"]'); closeModal();
    confirmEdicionModal(p, ['✏️ cambió el cliente']); var sinCambio=!!document.querySelector('#modal-box button[onclick*="nxAvisarCambio"]'); closeModal();
    var url=nxWaClienteUrl(p.celular, 'hola');
    return { t:t, btn:btn, enAtc:enAtc, enReenvio:enReenvio, conCambio:conCambio, sinCambio:sinCambio, url:url };
  });
  chk('al guardar sale el mensaje para el cliente', /Hola Juan 👋, te confirmamos tu pedido OC 10-045/.test(r.t), r.t.split('\n')[0]);
  chk('con los productos, el día, la tarde, la dirección y el saldo', /TITANIO LATEX 140x190/.test(r.t) && /SOMIER ORO/.test(r.t) && /por la tarde, de 14:30 a 18:30/.test(r.t) && /Los Pinos 123/.test(r.t) && /Saldo a pagar al recibir: Bs 1\.200/.test(r.t), r.t);
  chk('el botón abre el WhatsApp DEL CLIENTE', r.btn && r.url==='https://wa.me/59171234567?text=hola', r.url);
  chk('ni en una ATC ni al reenviar la venta', !r.enAtc && !r.enReenvio, r);
  chk('al corregir: «avisarle al cliente» solo si cambió el día o el turno', r.conCambio && !r.sinCambio, r);

  console.log('\n── M1 · recordatorio de entrega (Mis pedidos) ──');
  const m1 = async (iso) => {
    await page.clock.setFixedTime(new Date(iso));
    return page.evaluate(async () => {
      var man=proximoDiaEntrega();
      await cargar([ P({ id:'M1', cliente:'ANA GUTIERREZ', celular:'76543210', fecha:man, turno:'AM' }),
                     P({ id:'M2', cliente:'PEDRO VACA', celular:'70011223', fecha:man, turno:'PM', pagado:false, saldo:650 }),
                     P({ id:'M3', cliente:'DE OTRA', celular:'70000000', fecha:man, vendedor:'Maria Flores' }),
                     P({ id:'M4', cliente:'TIENDA X', oc:'RPT 10-001', fecha:man }) ]);
      setVendedorMem('Carola Chavez'); document.getElementById('mis-vendedor').value='Carola Chavez';
      showView('mis'); await esperar(150); renderMis();
      var f=document.querySelector('#mis-metrics .mi-f5'), b=document.querySelector('#tab-mis .nx-tb');
      return { man:man, txt:f?f.innerText:'', late:!!(f && f.classList.contains('mi-late')), badge:b?b.textContent:'' };
    });
  };
  r = await m1('2026-10-09T15:00:00Z');   // 11:00
  chk('la 5ª ficha cuenta solo las entregas suyas del próximo día (sin la de otra ni la reposición)', /0 de 2/.test(r.txt), r.txt);
  chk('el sábado 10/10 dice «Mañana»', /mañana/i.test(r.txt) && r.man==='2026-10-10', r);
  chk('a las 11:00 no late ni hay número en la pestaña', !r.late && r.badge==='', r);
  r = await m1('2026-10-09T21:30:00Z');   // 17:30
  chk('desde las 17:00 late y la pestaña dice cuántos faltan', r.late && r.badge==='2', r);
  r = await page.evaluate(async () => {
    nxM1Toggle(); await esperar(80);
    var filas=document.querySelectorAll('#nx-m1 .nx-m1-r').length, wa=(document.querySelector('#nx-m1 a.nx-btn-wa')||{}).href||'';
    nxM1Avisar('M1'); await esperar(200);
    var f=document.querySelector('#mis-metrics .mi-f5'), b=document.querySelector('#tab-mis .nx-tb');
    var hecho=document.querySelectorAll('#nx-m1 .nx-m1-r.ok').length, msg=(document.querySelector('#nx-m1 .nx-burbuja')||{}).innerText||'';
    nxM1Avisar('M2'); await esperar(200);
    var f2=document.querySelector('#mis-metrics .mi-f5');
    return { filas:filas, wa:decodeURIComponent(wa), txt:f.innerText, badge:b?b.textContent:'', hecho:hecho, msg:msg, todos:f2.innerText, listo:f2.classList.contains('mi-listo') };
  });
  chk('tocarla despliega las 2 entregas', r.filas===2, r.filas);
  chk('el «Avisar» abre su WhatsApp con el mensaje de mañana', /wa\.me\/59176543210\?text=Hola Ana/.test(r.wa) && /Mañana sábado 10\/10 te lo llevamos, por la mañana, de 9:00 a 12:00/.test(r.wa), r.wa.slice(0,140));
  chk('avisado: 1 de 2, la fila en verde y el número baja a 1', /1 de 2/.test(r.txt) && r.hecho===1 && r.badge==='1', r);
  chk('se ve el mensaje que se le mandó', /Hola Ana/.test(r.msg), r.msg.slice(0,60));
  chk('con todos avisados la ficha se pone en verde', /2 de 2/.test(r.todos) && /todos avisados/.test(r.todos) && r.listo, r.todos);

  console.log('\n── M3 · el festejo al pasar el mes anterior ──');
  r = await page.evaluate(async () => {
    await cargar([ P({ id:'S1', fecha:'2026-09-15', productos:[{desc:'X',cant:1,precio:1000}], acuenta:0, saldo:0, pagado:true, metodoPago:'Efectivo 1000 @2026-09-15' }),
                   P({ id:'O1', fecha:'2026-10-20', productos:[{desc:'X',cant:1,precio:1500}], acuenta:0, saldo:0, pagado:true, metodoPago:'Efectivo 1500 @2026-10-05' }) ]);
    renderMis(); await esperar(50);
    var m=document.querySelector('#mis-anillo .nx-medalla'), g=document.querySelector('#mis-anillo .mis-gana');
    var vistos=nxLS('me_m3_fiesta')||{};
    return { med:m?m.innerText:'', gana:!!g, una:Object.keys(vistos).length };
  });
  chk('pasó septiembre: medalla con el porcentaje y la dona dorada', /Pasaste lo de septiembre/.test(r.med) && /\+50%/.test(r.med) && r.gana, r);
  chk('el festejo queda anotado (una vez por mes)', r.una===1, r.una);
  r = await page.evaluate(async () => {
    await cargar([ P({ id:'S1', fecha:'2026-09-15', productos:[{desc:'X',cant:1,precio:2000}], pagado:true, metodoPago:'Efectivo 2000 @2026-09-15' }),
                   P({ id:'O1', fecha:'2026-10-20', productos:[{desc:'X',cant:1,precio:1500}], pagado:true, metodoPago:'Efectivo 1500 @2026-10-05' }) ]);
    renderMis(); return !!document.querySelector('#mis-anillo .nx-medalla');
  });
  chk('sin pasarlo, no hay medalla', !r);

  console.log('\n── C1 · el cierre del mes en un Excel ──');
  r = await page.evaluate(async () => {
    await cargar([ P({ id:'C1', nota:'101', cliente:'CLI UNO', fecha:'2026-10-05', ts:window.tsDe('2026-10-05'), productos:[{desc:'SOFT',medida:'140x190',codigo:'CH1',cant:2,precio:500}], pagado:true, metodoPago:'Efectivo 1000 @2026-10-05 #101' }),
                   P({ id:'C2', nota:'102', cliente:'CLI DOS', fecha:'2026-10-06', ts:window.tsDe('2026-10-06'), productos:[{desc:'TITANIO',medida:'160x200',codigo:'CH2',cant:1,precio:3000}], pagado:true, metodoPago:'QR BISA 3000 @2026-10-06 #102' }) ]);
    showView('conta'); await esperar(150);
    segSet('cta-mode','dia'); document.getElementById('cta-search').value='algo';
    nxCierreAbrir(); await esperar(30);
    var res=document.getElementById('nx-cierre-res').innerText;
    document.getElementById('nx-cierre-mes').value='2026-10';
    await nxCierreBajar();
    var hojas=(window.__XLSX||[]).map(function(h){ return h.name; });
    var ctrl={ modo:segVal('cta-mode'), q:document.getElementById('cta-search').value };
    var fin=document.getElementById('nx-cierre-fin').innerText;
    closeModal();
    return { res:res, hojas:hojas, nombre:window.__NOMBRE, ctrl:ctrl, fin:fin };
  });
  chk('el resumen dice ventas, pagos y productos del mes', /2 ventas/.test(r.res) && /2 pagos/.test(r.res) && /2 productos/.test(r.res), r.res.replace(/\n/g,' | '));
  chk('un solo Excel con Ventas, Cuadre y Productos', JSON.stringify(r.hojas)===JSON.stringify(['Ventas','Cuadre','Productos','Productos (detalle)']), r.hojas);
  chk('el archivo se llama cierre-2026-10-…', /^cierre-2026-10-(ingreso|entrega)\.xlsx$/.test(r.nombre), r.nombre);
  chk('los controles de Ventas vuelven como estaban (Día, la búsqueda)', r.ctrl.modo==='dia' && r.ctrl.q==='algo', r.ctrl);
  chk('dice que quedó listo', /cierre-2026-10/.test(r.fin), r.fin);
  await page.evaluate(() => { segSet('cta-mode','mes'); document.getElementById('cta-search').value=''; });

  console.log('\n── C2 · pagos sin terminar ──');
  r = await page.evaluate(async () => {
    await cargar([ P({ id:'Q1', cliente:'SIN FOTO', ts:window.tsDe(window.dia(-3)), pagado:false, saldo:500, productos:[{desc:'X',cant:1,precio:1500}], metodoPago:'QR 1000 @'+window.dia(-3) }),
                   P({ id:'Q2', cliente:'COMPLETO', ts:window.tsDe(window.dia(-3)), metodoPago:'Efectivo 900 @'+window.dia(-3)+' #555' }),
                   P({ id:'Q3', cliente:'VIEJO', ts:window.tsDe(window.dia(-90)), metodoPago:'QR 900 @'+window.dia(-90) }),
                   P({ id:'Q4', cliente:'PAGADA SIN MONTO', ts:window.tsDe(window.dia(-2)), pagado:true, metodoPago:'Efectivo' }),
                   P({ id:'Q5', cliente:'SIN NADA', ts:window.tsDe(window.dia(-2)), pagado:true, metodoPago:'' }) ]);
    showView('conta'); await esperar(150); renderConta();
    var L=nxPstLista(), b=document.getElementById('nx-pst-btn'), t=document.querySelector('#tab-conta .nx-tb');
    var q1=L.filter(function(x){ return x.p.id==='Q1'; })[0], q4=L.filter(function(x){ return x.p.id==='Q4'; })[0];
    nxPstAbrir(); var m=document.getElementById('modal-box').innerText; closeModal();
    return { n:L.length, falta:q1?q1.falta:[], q4:q4?q4.falta:[], btn:b.innerText, tab:t?t.textContent:'', m:m };
  });
  chk('cuenta los pagos a los que les falta algo (no el completo ni el de hace 90 días)', r.n===2, r.n);
  chk('la PAGADA sin monto entra (como el aviso 💸 del Cuadre)', /PAGADA sin monto/.test(String(r.q4)), r.q4);
  chk('le falta recibo, comprobante y banco', JSON.stringify(r.falta)===JSON.stringify(['el N° de recibo','la foto del comprobante','el banco']), r.falta);
  chk('el número en el botón y en la pestaña', /Pagos sin terminar\s*2/.test(r.btn) && r.tab==='2', r);
  chk('la lista dice el cliente y «Completar»', /SIN FOTO/.test(r.m) && /Completar/.test(r.m), r.m.slice(0,100));

  console.log('\n── A1 · camión sugerido ──');
  await page.clock.setFixedTime(new Date('2026-10-08T15:00:00Z'));   // jueves 08/10, 11:00 → mañana viernes 09/10
  r = await page.evaluate(async () => {
    var man=proximoDiaEntrega();
    await cargar([ P({ id:'K1', cliente:'YA VA', fecha:man, zona:'Norte', vehiculo:'Carry', chofer:'Luis Pierre' }),
                   P({ id:'K2', cliente:'OTRO NORTE', fecha:man, zona:'norte' }),
                   P({ id:'K3', cliente:'LEJOS', fecha:man, zona:'Plan 3000' }),
                   P({ id:'K4', cliente:'FOTON', fecha:man, zona:'Urbari', vehiculo:'Foton nuevo', chofer:'Luis Eyzaguirre', maps:'https://www.google.com/maps?q=-17.8,-63.2' }),
                   P({ id:'K5', cliente:'CERCA DE FOTON', fecha:man, zona:'Otra zona', maps:'https://www.google.com/maps?q=-17.8001,-63.2001' }) ]);
    showView('admin'); await esperar(150); renderAdmin();
    var D=nxSugDatos(man), de=function(id){ for(var i=0;i<D.lista.length;i++) if(D.lista[i].p.id===id) return D.lista[i]; return {}; };
    var txt=document.getElementById('nx-sug').innerText;
    return { n:D.lista.length, k2:de('K2'), k3:de('K3'), k5:de('K5'), txt:txt };
  });
  chk('lista los 3 sin camión', r.n===3 && /Sin camión para mañana/.test(r.txt), r.txt.slice(0,80));
  chk('el de la misma zona va al camión que ya va ahí (sin mirar mayúsculas)', r.k2.v==='Carry' && /ya va a norte/i.test(r.k2.por), r.k2);
  chk('el que tiene una parada cerca va a ese camión', r.k5.v==='Foton nuevo' && /km/.test(r.k5.por), r.k5);
  chk('si no, el que lleva menos paradas entre los que salen', (r.k3.v==='Carry'||r.k3.v==='Foton nuevo') && /menos paradas/.test(r.k3.por), r.k3);
  r = await page.evaluate(async () => {
    nxSugAceptar('K2'); await esperar(500);
    var p=findById('K2'), srv=window.SRV.filter(function(x){ return x.id==='K2'; })[0]||{};
    nxSugAceptarTodas(); await esperar(100);
    var quedan=nxSugSin(proximoDiaEntrega()).length;
    return { v:p.vehiculo, ch:p.chofer, srv:srv.vehiculo, quedan:quedan, txt:document.getElementById('nx-sug').innerText };
  });
  chk('«Aceptar» pone el camión y su primer chofer, y se guarda', r.v==='Carry' && r.ch==='Luis Pierre' && r.srv==='Carry', r);
  chk('«Aceptar todas» deja a todos con camión', r.quedan===0, r.quedan);

  console.log('\n── A3 · aviso de las 15:00 ──');
  const a3 = async (iso) => {
    await page.clock.setFixedTime(new Date(iso));
    return page.evaluate(async () => {
      var man=proximoDiaEntrega();
      await cargar([ P({ id:'Z1', cliente:'SIN CAMION', fecha:man, zona:'Norte' }) ]);
      showView('admin'); await esperar(150); renderAdmin(); nxBadges();
      var b=document.querySelector('#tab-admin .nx-tb');
      return { a3:document.getElementById('nx-a3').innerText, badge:b?b.textContent:'' };
    });
  };
  r = await a3('2026-10-08T18:00:00Z');   // 14:00
  chk('a las 14:00 todavía no avisa', r.a3==='' && r.badge==='', r);
  r = await a3('2026-10-08T19:30:00Z');   // 15:30
  chk('a las 15:30 sale el cartel y el número rojo en la pestaña', /quedan 1 pedido de mañana/.test(r.a3) && r.badge==='1', r);
  r = await page.evaluate(async () => {
    nxA3Posponer(); var pos=document.getElementById('nx-a3').innerText;
    var b=document.querySelector('#tab-admin .nx-tb');
    return { pos:pos, badge:b?b.textContent:'' };
  });
  chk('«Recordar en 30 min» esconde el cartel y el número queda', r.pos==='' && r.badge==='1', r);

  console.log('\n── A2 · la hoja de ruta por cercanía ──');
  r = await page.evaluate(async () => {
    var man=proximoDiaEntrega(), P0=almUbic('ptf');
    var lejos='https://www.google.com/maps?q='+(P0.lat+0.06).toFixed(5)+','+(P0.lng).toFixed(5);
    var cerca='https://www.google.com/maps?q='+(P0.lat+0.01).toFixed(5)+','+(P0.lng).toFixed(5);
    await cargar([ P({ id:'R1', cliente:'AAA LEJOS', fecha:man, zona:'A zona', maps:lejos, vehiculo:'Carry', chofer:'Luis Pierre' }),
                   P({ id:'R2', cliente:'BBB CERCA', fecha:man, zona:'B zona', maps:cerca, vehiculo:'Carry', chofer:'Luis Pierre' }),
                   P({ id:'R3', cliente:'CCC SIN PIN', fecha:man, zona:'0 zona', vehiculo:'Carry', chofer:'Luis Pierre' }) ]);
    abrirRuta(); setRutaDia('manana');
    var orden=function(){ return [].slice.call(document.querySelectorAll('#ruta-body b')).map(function(b){ return b.textContent; }).filter(function(t){ return /^\d\)/.test(t); }); };
    var a=orden(), txt=document.getElementById('ruta-body').innerText;
    nxRutaSetCerca(false); var b=orden(); nxRutaSetCerca(true);
    closeRuta();
    var guardado=JSON.stringify(findById('R1'));
    return { a:a, b:b, txt:txt, limpio:!/_nxKm/.test(guardado) };
  });
  chk('por cercanía: primero el más cerca de PTF, el sin ubicación al final', JSON.stringify(r.a)===JSON.stringify(['1) BBB CERCA','2) AAA LEJOS','3) CCC SIN PIN']), r.a);
  chk('dice los km y «sin ubicación»', /km/.test(r.txt) && /sin ubicación/.test(r.txt), r.txt.slice(0,160));
  chk('«Como estaba» vuelve a turno y zona', JSON.stringify(r.b)===JSON.stringify(['1) CCC SIN PIN','2) AAA LEJOS','3) BBB CERCA']), r.b);
  chk('los km no se meten en el pedido que se guarda', r.limpio);

  console.log('\n── sin errores de la página ──');
  chk('ningún error de JavaScript', errores.length===0, errores.slice(0,3));

  console.log(`\n${PASS} bien · ${FAIL} mal`);
  await browser.close();
  process.exit(FAIL?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
