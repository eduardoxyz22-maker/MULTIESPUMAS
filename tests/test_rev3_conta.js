/* 🧾 TERCERA REVISIÓN DE CONTABILIDAD (Ventas, Mayoristas y Cuadre) — lo que quedó REPORTADO (26/09)

   Una sección por arreglo, todo por los botones que usa la gente, con el reloj CLAVADO en un
   miércoles de mitad de mes (no se pudre a fin de mes, ni los sábados, ni los domingos).

     1. «✏️ Corregir precios y montos» perdía lo tipeado (precios, A cuenta y saldo) si otro botón
        repintaba la ficha antes de «💾 Guardar»: ✅, el método o el banco del pago nuevo, «💵 Pago /
        🚚 Recargo», abrir ✏️ Corregir un pago, 📲… y «Guardar» guardaba lo viejo sin decir nada.
     2. La columna «Ingresado», la ficha y el INGRESADO del Excel leían el `ts` con el reloj del
        DISPOSITIVO; el filtro del mes lo lee en hora de Bolivia (§4fu). En un celular con la zona
        mal puesta la venta del 31/08 21:30 salía en agosto… diciendo «2026-09-01 01:30».
     3. «💵 Anotar el monto» tomaba «-1500» como 1.500 (`parseMonto` saca el signo).
     4. Un pago EN CURSO de flete, con su imagen, se recordaba por venta (§4ep) pero sin el tipo:
        al volver a esa venta aparecía en «💵 Pago» con el saldo entero de monto, y «Registrar
        pago» anotaba la captura del flete como pago de la venta.
     5. Cuadre: (a) el Excel no tenía la fila TOTAL de «Efectivo cobrado vs. retirado»; (b) en
        «Todo», una venta «PAGADA sin monto» salía en el detalle con Bs 0 (pantalla y Excel) y se
        contaba en «N pagos», aunque el aviso dice que no sale ahí; (c) dos pagos sin fecha
        iguales de la misma venta de otro mes se contaban como uno; (d) pasar con Tab de un campo
        del arqueo al siguiente dejaba el foco en la nada: lo que se tipeaba no entraba.

   Red cortada, servidor simulado (la planilla vive en `window.SRV`). Se corre:
       node tests/test_rev3_conta.js
   Dientes:  PEDIDOS=/ruta/a/un/pedidos.html/viejo node tests/test_rev3_conta.js            */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,extra)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, extra!=null?('· '+(typeof extra==='string'?extra:JSON.stringify(extra))):''); };
const J=x=>JSON.stringify(x);
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  /* Los diálogos se contestan desde Node (un evaluate dentro del handler se cuelga). */
  const D = { confirm:true, promptVal:'', vistos:[] };

  /* Una página con el reloj clavado y la zona que se pida (la de un celular mal configurado, o la
     de Bolivia). `apiPost` atiende como el servidor: guardar sella la fila, listar la devuelve. */
  async function nueva(iso, tz) {
    const ctx = await browser.newContext({ viewport:{width:1400,height:1000}, timezoneId:tz||'America/La_Paz', locale:'es-BO' });
    const page = await ctx.newPage();
    await page.clock.setFixedTime(new Date(iso));
    page.on('pageerror', e => errores.push(e.message));
    page.on('dialog', async d => {
      D.vistos.push(d.message());
      if (d.type()==='prompt') await d.accept(String(D.promptVal));
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
      window.__XLSX=null;
      buildXlsx=function(sheets){ window.__XLSX=JSON.parse(JSON.stringify(sheets)); return new Uint8Array([1]); };
      downloadBlob=function(){};
      window.SRV=[];
      apiPost=function(b){
        if(b.action==='save'){
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
      // La imagen «subida»: sin red, el achicado y la subida se simulan (el resto es el camino real).
      fotoCronometro=function(){ return Promise.resolve('data:image/jpeg;base64,AAAA'); };
      window.__FOTO='F0';
      subirFoto=function(){ return Promise.resolve({ok:true, fotoId:window.__FOTO}); };
      window.hoy=todayStr();
      window.dia=function(n){ var d=new Date(window.hoy+'T12:00:00'); d.setDate(d.getDate()+n); return isoLocal(d); };
      window.tsDe=function(f){ return new Date(f+'T12:00:00').getTime(); };
      window.P=function(o){
        var b={ turno:'AM', celular:'7', nit:'1', zona:'Norte', direccion:'X', fecha:window.dia(2), maps:'', observaciones:'',
                estado:'', entregado:false, chofer:'', nroDia:1, fotos:[], vendedor:'Carola Chavez', ts:window.tsDe(window.hoy),
                acuenta:0, saldo:0, pagado:true, metodoPago:'', productos:[{desc:'COLCHON SOFT',medida:'140x190',cant:1}] };
        var q={}; for(var k in b) q[k]=b[k]; for(var k2 in o) q[k2]=o[k2]; return q;
      };
      window.R=function(o){ return filaDeRetiro({ id:o.id, fecha:o.fecha||window.hoy, entrega:o.entrega||'Carola Chavez', retira:o.retira||'Eduardo Añez',
                                                  monto:o.monto, notas:o.notas||['10'], tipo:o.tipo||'Facturado', fotos:[], obs:'' }); };
      // Carga la planilla como quien entra (se relee: `cobradoBs` no viaja, §4fg).
      window.cargar=async function(filas){
        closeModal();                                             // la ficha de la escena anterior
        window.SRV=JSON.parse(JSON.stringify(filas)); setPending([]);
        STATE=[]; RETIROS=[];
        SAVE_ULTIMO={}; SAVE_REV={}; SAVE_EN_VUELO={}; SAVE_EN_ESPERA={};
        await refrescarEstado();
      };
      window.aVentas=async function(filas, mes){
        await cargar(filas);
        showView('conta'); segSet('cta-tab','ventas'); setContaTab('ventas');
        await new Promise(function(r){ setTimeout(r,120); });     // el refresco que dispara showView
        segSet('cta-mode','mes'); document.getElementById('cta-mes').value=mes||window.hoy.slice(0,7); setContaModo('mes');
        CTA_ULTIMA='';
      };
      window.aCuadre=async function(filas, modo, val){
        await cargar(filas);
        showView('conta'); segSet('cta-tab','cuadre'); setContaTab('cuadre');
        await new Promise(function(r){ setTimeout(r,120); });
        document.getElementById('cua-vendedor').value='';
        segSet('cua-mode', modo||'mes');
        if((modo||'mes')==='mes') document.getElementById('cua-mes').value=val||window.hoy.slice(0,7);
        if(modo==='dia') document.getElementById('cua-dia').value=val||window.hoy;
        setCuadreModo(modo||'mes');
      };
      // El botón de la ficha cuyo onclick llama a `fn` (y, si se dice, con ese texto).
      window.boton=function(fn, txt){ return [].slice.call(document.querySelectorAll('#modal-box button')).filter(function(b){
        return new RegExp(fn).test(b.getAttribute('onclick')||'') && (txt==null || txt.test(b.textContent)); })[0]||null; };
      window.valM=function(){ var g=function(id){ var e=document.getElementById(id); return e?e.value:null; };
        return { pr0:g('cta-pr-0'), pr1:g('cta-pr-1'), acu:g('cta-acuenta'), sal:g('cta-saldo') }; };
      window.tipear=function(o){ for(var id in o){ var e=document.getElementById(id); if(e) e.value=o[id]; } };
      // Sube una imagen al pago que se está por registrar, por el camino de 📎 (sin red).
      window.subir=function(id, fid){ window.__FOTO=fid; ctaAdjuntar(id);
        return onCompElegido({ target:{ files:[new Blob(['x'],{type:'image/jpeg'})], dataset:{pedido:id} } }) || new Promise(function(r){ setTimeout(r,30); }); };
    });
    return page;
  }

  const page = await nueva('2026-09-16T15:00:00Z');           // miércoles 16/09/2026, 11:00 de Bolivia

  /* ══ 1 · «✏️ CORREGIR PRECIOS Y MONTOS» NO PIERDE LO TIPEADO CUANDO OTRO BOTÓN REPINTA LA FICHA ══
     La venta llegó sin precios y con el adelanto y el saldo mal: la contadora pone 800 y 400 c/u, el
     adelanto 600 y el saldo «1.100», y antes de guardar toca ✅, el método del pago nuevo, «🚚/💵»
     y abre ✏️ Corregir un pago. Cada toque repintaba la ficha: los campos volvían a lo guardado y
     «💾 Guardar precios y montos» guardaba lo VIEJO (sin precios, adelanto 500, saldo 1.000). */
  D.confirm=true; D.vistos=[];
  let r = await page.evaluate(async () => {
    await aVentas([ P({ id:'M1', nota:'70', oc:'09-070', cliente:'CORREGIR MONTOS', pagado:false, acuenta:500, saldo:1000,
                        productos:[{desc:'COLCHON SOFT',medida:'140x190',cant:2},{desc:'ALMOHADA',medida:'',cant:1}],
                        metodoPago:textoCobros([{anticipo:true,metodo:'QR',banco:'BISA',monto:500,fecha:dia(-3),nota:'70',comps:['A1']},
                                                {metodo:'Efectivo',monto:300,fecha:hoy,nota:'71',comps:['A2']}]) }) ]);
    showContaModal('M1');
    tipear({'cta-pr-0':'800', 'cta-pr-1':'400', 'cta-acuenta':'600', 'cta-saldo':'1.100'});
    var out={};
    boton('ctaToggleRegistrado').click();                     out.ok=valM();
    boton('ctaSetMetodo', /^QR$/).click();                    out.metodo=valM();
    boton('ctaSetBanco', /BISA/).click();                     out.banco=valM();
    boton('ctaSetTipo', /Recargo/).click();                   out.tipo=valM();
    boton('ctaSetTipo', /Pago de la venta/).click();
    boton("ctaEditarPago\\('M1',1\\)").click();              out.editar=valM();
    boton("ctaEditarPago\\('M1',-1\\)").click();              // «Cancelar» del editor del pago
    out.cancelar=valM();
    boton('ctaGuardarMontos').click();
    await new Promise(function(r){ setTimeout(r,60); });
    var p=findById('M1'), a=anticipoDe(p)||{};
    out.guardado={ precios:(p.productos||[]).map(function(x){ return prodPrecio(x); }), ant:a.monto, saldo:Number(p.saldo)||0,
                   total:ventaTotal(p), cobro:totalCobrado(p), reg:regEnSistema(p) };
    out.despues=valM();
    out.aviso=!!document.getElementById('cta-montos-viejo');
    return out;
  });
  const TIP = {pr0:'800', pr1:'400', acu:'600', sal:'1.100'};
  const igual = (v) => v && v.pr0===TIP.pr0 && v.pr1===TIP.pr1 && v.acu===TIP.acu && v.sal===TIP.sal;
  chk('1 · ✅ «Pago registrado en sistema» no borra los precios, el A cuenta ni el saldo tipeados', igual(r.ok), J(r.ok));
  chk('1 · …ni elegir el método del pago nuevo', igual(r.metodo), J(r.metodo));
  chk('1 · …ni el banco', igual(r.banco), J(r.banco));
  chk('1 · …ni pasar a «🚚 Recargo por entrega» y volver', igual(r.tipo), J(r.tipo));
  chk('1 · …ni abrir ✏️ Corregir un pago (y cerrarlo)', igual(r.editar) && igual(r.cancelar), J({editar:r.editar, cancelar:r.cancelar}));
  chk('1 · ⚠️ «💾 Guardar precios y montos» guarda lo TIPEADO: 800 y 400 c/u, adelanto 600, saldo 1.100 → total 2.000',
      J(r.guardado.precios)==='[800,400]' && r.guardado.ant===600 && r.guardado.saldo===1100 && r.guardado.total===2000 && r.guardado.cobro===300, J(r.guardado));
  chk('1 · …y la ficha vuelve con lo guardado, sin ningún aviso de «cambió mientras corregías»',
      r.despues.pr0==='800' && r.despues.pr1==='400' && r.despues.acu==='600' && r.despues.sal==='1100' && !r.aviso && r.guardado.reg===true, J({despues:r.despues, aviso:r.aviso}));

  /* 1b · Lo que NADIE tocó sigue a la venta: la contadora pone solo el precio y registra un pago
     de 400. Al volver de la ventana «✅ Guardado», el precio sigue ahí y el SALDO es el nuevo (600),
     no el de antes del pago como si alguien lo hubiera tipeado. */
  r = await page.evaluate(async () => {
    await aVentas([ P({ id:'M2', nota:'80', oc:'09-080', cliente:'PRECIO Y PAGO', pagado:false, saldo:1000 }) ]);
    showContaModal('M2');
    tipear({'cta-pr-0':'1000'});
    await subir('M2', 'R1');
    var tras=valM();
    tipear({'cta-pago-monto':'400', 'cta-pago-nota':'81'});
    boton('ctaRegistrarPago').click();
    await new Promise(function(r){ setTimeout(r,60); });
    var ventana=(document.getElementById('modal-box')||{}).textContent||'';
    boton('showContaModal', /volver a la venta/).click();
    var p=findById('M2');
    return { tras:tras, ventana:/Guardado/.test(ventana), vuelta:valM(), saldo:Number(p.saldo)||0, cobro:totalCobrado(p),
             aviso:!!document.getElementById('cta-montos-viejo') };
  });
  chk('1b · subir la imagen del pago nuevo (📎) no borra el precio tipeado', r.tras.pr0==='1000', J(r.tras));
  chk('1b · ⚠️ registrar un pago y volver de «✅ Guardado» deja el precio tipeado', r.ventana && r.vuelta.pr0==='1000', J(r.vuelta));
  chk('1b · …y el saldo, que nadie tocó, es el NUEVO (600), no el de antes del pago', r.vuelta.sal==='600' && r.saldo===600 && r.cobro===400 && !r.aviso, J(r));

  /* 1c · Lo tipeado sobre algo que cambió ABAJO no vuelve en silencio: pone el saldo en 900 (cree que
     el total es 1.200) y corrige el cobro de 300 a 350 → el saldo guardado pasa a 650. Volver a
     poner 900 en el campo haría un total de 1.250; perderlo sin decir nada era el bug. */
  r = await page.evaluate(async () => {
    await aVentas([ P({ id:'M3', nota:'90', oc:'09-090', cliente:'SALDO VIEJO', pagado:false, saldo:700,
                        metodoPago:textoCobros([{metodo:'Efectivo',monto:300,fecha:hoy,nota:'91',comps:['C1']}]) }) ]);
    showContaModal('M3');
    tipear({'cta-saldo':'900'});
    boton("ctaEditarPago\\('M3',0\\)").click();
    var abierto=valM();
    tipear({'cta-ed-monto':'350'});
    boton('ctaGuardarPago').click();
    await new Promise(function(r){ setTimeout(r,60); });
    var av=document.getElementById('cta-montos-viejo'), p=findById('M3');
    var out={ abierto:abierto, sal:valM().sal, saldo:Number(p.saldo)||0, aviso:av?av.textContent:'' };
    showContaModal('M3');                                     // otro repintado: el aviso no se repite
    out.otraVez=!!document.getElementById('cta-montos-viejo');
    return out;
  });
  chk('1c · con el editor del pago abierto, el saldo tipeado sigue ahí', r.abierto.sal==='900', J(r.abierto));
  chk('1c · corregido el cobro (300 → 350), el campo muestra el saldo NUEVO (650), no el 900 tipeado sobre el viejo', r.sal==='650' && r.saldo===650, J(r));
  chk('1c · ⚠️ …y lo DICE: lo que se había escrito en el saldo ya no valía', /Saldo/.test(r.aviso) && /900/.test(r.aviso), r.aviso.slice(0,160));
  chk('1c · el aviso sale una vez (el repintado siguiente ya no lo repite)', r.otraVez===false, '');

  // 1d · Control: pasar a OTRA venta y volver arranca de lo guardado (como el pago en curso).
  r = await page.evaluate(async () => {
    await aVentas([ P({ id:'M4', nota:'100', oc:'09-100', cliente:'IDA Y VUELTA', pagado:false, saldo:1000 }),
                    P({ id:'M5', nota:'110', oc:'09-110', cliente:'LA OTRA', pagado:false, saldo:500 }) ]);
    showContaModal('M4'); tipear({'cta-pr-0':'999', 'cta-saldo':'1234'});
    boton('ctaToggleRegistrado').click();
    showContaModal('M5'); var otra=valM();
    showContaModal('M4'); return { otra:otra, vuelta:valM() };
  });
  chk('1d · control: lo tipeado en una venta no aparece en OTRA', r.otra.pr0==='' && r.otra.sal==='500', J(r.otra));
  chk('1d · control: y al volver a la primera arranca de lo guardado', r.vuelta.pr0==='' && r.vuelta.sal==='1000', J(r.vuelta));

  /* ══ 2 · «INGRESADO» EN HORA DE BOLIVIA, COMO EL FILTRO (§4fu) ════════════════════════════════
     Venta cargada el 31/08 a las 21:30 de Bolivia (= 01/09 01:30 UTC), mirada desde una compu con la
     zona en UTC. El filtro la pone en AGOSTO (bien), pero la columna, la ficha y el Excel decían
     «2026-09-01 01:30»: una venta «de septiembre» en el listado de agosto. */
  const ING = async (tz) => {
    const pg = await nueva('2026-09-16T15:00:00Z', tz);
    const x = await pg.evaluate(async () => {
      await aVentas([ P({ id:'I1', nota:'31', oc:'08-031', cliente:'A LAS NUEVE Y MEDIA', ts:Date.UTC(2026,8,1,1,30,0), fecha:'2026-09-02' }),
                      P({ id:'I2', nota:'32', oc:'09-032', cliente:'DE SEPTIEMBRE', ts:Date.UTC(2026,8,10,16,0,0) }) ], '2026-08');
      var fila=[].slice.call(document.querySelectorAll('#tbl-conta tbody tr')).filter(function(tr){ return /A LAS NUEVE/.test(tr.textContent); })[0];
      var col=fila?fila.querySelector('td').textContent.trim():'';
      var agosto=contaLista().map(function(p){ return p.id; });
      showContaModal('I1');
      var ficha=((document.getElementById('modal-box')||{}).textContent||'').match(/Ingresado\s*([0-9:\- ]+)/);
      closeModal();
      exportConta();
      var m=window.__XLSX&&window.__XLSX[0].matrix, c=m&&m[1]&&m[1][0];
      var excel=(c&&typeof c==='object')?String(c.v):String(c||'');
      document.getElementById('cta-mes').value='2026-09'; renderConta();
      var sept=contaLista().map(function(p){ return p.id; });
      return { col:col, ficha:ficha?ficha[1].trim():'', excel:excel, agosto:agosto, sept:sept };
    });
    await pg.context().close();
    return x;
  };
  r = await ING('UTC');
  chk('2 · (compu en UTC) el filtro pone la venta del 31/08 21:30 en agosto, no en septiembre', J(r.agosto)==='["I1"]' && J(r.sept)==='["I2"]', J({ago:r.agosto, sep:r.sept}));
  chk('2 · ⚠️ …y la columna «Ingresado» dice 2026-08-31 21:30 (no 2026-09-01 01:30)', r.col==='2026-08-31 21:30', r.col);
  chk('2 · …la ficha también', r.ficha==='2026-08-31 21:30', r.ficha);
  chk('2 · …y el INGRESADO del Excel', r.excel==='2026-08-31 21:30', r.excel);
  r = await ING('America/La_Paz');
  chk('2 · control: en una compu bien configurada da lo mismo que antes', r.col==='2026-08-31 21:30' && r.ficha==='2026-08-31 21:30' && r.excel==='2026-08-31 21:30', J(r));

  /* ══ 3 · «💵 ANOTAR EL MONTO» NO TOMA «-1500» COMO 1.500 ══════════════════════════════════════
     La venta «PAGADA sin monto» (§4fg): el prompt pide cuánto entró. `parseMonto` le saca el signo,
     así que «-1500» se anotaba como un pago de Bs 1.500. El formulario ya frenaba el menos. */
  D.promptVal='-1500';
  r = await page.evaluate(async () => {
    await aVentas([ P({ id:'S1', nota:'120', oc:'09-120', cliente:'PAGADA SIN MONTO', pagado:true, metodoPago:'Efectivo %S1' }) ]);
    showContaModal('S1');
    var b=boton('ctaAnotarMonto'); if(b) b.click();
    var p=findById('S1'), c=cobrosDe(p)[0]||{};
    var toast=(document.getElementById('toast')||{}).textContent||'';
    return { boton:!!b, sinMonto:!!c.sinMonto, monto:Number(c.monto)||0, cobrado:totalCobrado(p), toast:toast };
  });
  chk('3 · ⚠️ «-1500» en «💵 Anotar el monto» NO se anota (la venta sigue sin monto)', r.boton && r.sinMonto===true && r.cobrado===0, J(r));
  chk('3 · …y se dice por qué', /negativ|monto válido/i.test(r.toast), r.toast);
  D.promptVal='1.500';
  r = await page.evaluate(async () => {
    await aVentas([ P({ id:'S1', nota:'120', oc:'09-120', cliente:'PAGADA SIN MONTO', pagado:true, metodoPago:'Efectivo %S1' }) ]);
    showContaModal('S1');
    boton('ctaAnotarMonto').click();
    var p=findById('S1'), c=cobrosDe(p)[0]||{};
    return { sinMonto:!!c.sinMonto, monto:Number(c.monto)||0, fecha:c.fecha, pagado:p.pagado };
  });
  chk('3 · control: «1.500» se anota como 1.500, con la fecha de la venta', r.sinMonto===false && r.monto===1500 && r.pagado===true && !!r.fecha, J(r));

  /* ══ 4 · EL PAGO EN CURSO DE FLETE RECUERDA QUE ERA FLETE ═════════════════════════════════════
     Venta con saldo 1.000 y flete pactado de 150. La contadora elige «🚚 Recargo por entrega», QR
     BISA, sube la captura del flete… y antes de registrar abre otra venta. Al volver, la imagen
     estaba (§4ep) pero el bloque era «💵 Registrar un pago» por Bs 1.000: «Registrar pago» anotaba la
     captura del flete como pago de la VENTA (saldo 0) y el flete seguía «por cobrar». */
  r = await page.evaluate(async () => {
    await aVentas([ P({ id:'F1', nota:'130', oc:'09-130', cliente:'CON FLETE', pagado:false, saldo:1000, metodoPago:textoCobros([{envio:true,metodo:'',monto:150}]) }),
                    P({ id:'F2', nota:'140', oc:'09-140', cliente:'OTRA VENTA', pagado:false, saldo:800 }) ]);
    showContaModal('F1');
    boton('ctaSetTipo', /Recargo/).click();
    boton('ctaSetMetodo', /^QR$/).click();
    boton('ctaSetBanco', /BISA/).click();
    await subir('F1', 'FL1');
    showContaModal('F2');                                    // abre otra venta (desde la tabla, el cuadre…)
    showContaModal('F1');                                    // …y vuelve
    var toast=(document.getElementById('toast')||{}).textContent||'';
    var reg=boton('ctaRegistrarPago'), m=document.getElementById('cta-pago-monto');
    var vuelta={ tipo:CTA_TIPO, boton:reg?reg.textContent.trim():'', monto:m?m.value:null, comps:compsArr(CTA_PAGO.comps).join(','), toast:toast };
    tipear({'cta-pago-nota':'131'});
    reg.click();
    await new Promise(function(r){ setTimeout(r,60); });
    var p=findById('F1'), e=enviosDe(p).filter(envioYaCobrado)[0]||{};
    return { vuelta:vuelta, env:{monto:e.monto, metodo:e.metodo, banco:e.banco, comps:compsArr(e.comps).join(',')},
             saldo:Number(p.saldo)||0, cobrado:totalCobrado(p), porCobrar:envioPorCobrar(p) };
  });
  chk('4 · al volver a la venta, el pago en curso sigue siendo del FLETE (no «💵 Pago» por el saldo)',
      r.vuelta.tipo==='envio' && /flete|recargo/i.test(r.vuelta.boton) && r.vuelta.monto==='150' && r.vuelta.comps==='FL1', J(r.vuelta));
  chk('4 · …y el aviso de la imagen esperando dice que es del flete', /flete|recargo/i.test(r.vuelta.toast), r.vuelta.toast);
  chk('4 · ⚠️ registrar anota el FLETE (QR BISA 150 con su captura) y la venta sigue debiendo 1.000',
      r.env.monto===150 && r.env.metodo==='QR' && r.env.banco==='BISA' && r.env.comps==='FL1' && r.saldo===1000 && r.cobrado===0 && r.porCobrar===0, J(r));

  // 4b · Control: el pago en curso de la VENTA sigue volviendo como pago de la venta.
  r = await page.evaluate(async () => {
    await aVentas([ P({ id:'F3', nota:'150', oc:'09-150', cliente:'PAGO EN CURSO', pagado:false, saldo:900, metodoPago:textoCobros([{envio:true,metodo:'',monto:100}]) }),
                    P({ id:'F4', nota:'160', oc:'09-160', cliente:'OTRA MAS', pagado:false, saldo:700 }) ]);
    showContaModal('F3');
    await subir('F3', 'PG1');
    showContaModal('F4'); showContaModal('F3');
    var reg=boton('ctaRegistrarPago'), m=document.getElementById('cta-pago-monto');
    return { tipo:CTA_TIPO, boton:reg?reg.textContent.trim():'', monto:m?m.value:null, comps:compsArr(CTA_PAGO.comps).join(',') };
  });
  chk('4b · control: el pago en curso de la VENTA vuelve como «Registrar pago» por el saldo, con su imagen',
      r.tipo==='pago' && /Registrar pago/.test(r.boton) && r.monto==='900' && r.comps==='PG1', J(r));

  /* ══ 5a · EL EXCEL DEL CUADRE TRAE EL TOTAL DE «EFECTIVO COBRADO VS. RETIRADO» ═════════════════
     La pantalla tiene la fila TOTAL (cobrado, retirado facturado / no facturado, retirado, en la
     mano); el Excel terminaba en la última persona y el contador sumaba a mano. */
  r = await page.evaluate(async () => {
    await aCuadre([ P({ id:'E1', nota:'10', oc:'09-010', cliente:'EFECTIVO CAROLA', metodoPago:textoCobros([{metodo:'Efectivo',monto:1000,fecha:hoy,nota:'10',comps:['E1']}]) }),
                    P({ id:'E2', nota:'20', oc:'09-020', cliente:'EFECTIVO MARIA', vendedor:'Maria Flores', metodoPago:textoCobros([{metodo:'Efectivo',monto:500,fecha:hoy,nota:'20',comps:['E2']}]) }),
                    P({ id:'E3', nota:'30', oc:'09-030', cliente:'COBRO CHOFER', metodoPago:textoCobros([{metodo:'Efectivo',monto:200,fecha:hoy,nota:'30',recibio:'Luis Pierre',comps:['E3']}]) }),
                    R({ id:'__ret_e1__', monto:600, notas:['10'], tipo:'Facturado' }),
                    R({ id:'__ret_e2__', entrega:'Maria Flores', monto:100, notas:['20'], tipo:'No facturado' }) ]);
    var celdas=[].slice.call(document.querySelectorAll('#cua-retiros tr')).filter(function(tr){ return /^\s*TOTAL/.test(tr.textContent); })
                  .map(function(tr){ return [].slice.call(tr.querySelectorAll('td')).map(function(td){ return td.textContent.trim(); }); })[0]||[];
    exportCuadre();
    var m=window.__XLSX[0].matrix, ini=-1, tot=null;
    for(var i=0;i<m.length;i++){ var c0=m[i]&&m[i][0]; var t=(c0&&typeof c0==='object')?c0.v:c0; if(t==='EFECTIVO COBRADO VS. RETIRADO') ini=i; }
    if(ini>=0) for(var j=ini+1;j<m.length && m[j] && m[j].length;j++){ var t0=m[j][0]; t0=(t0&&typeof t0==='object')?t0.v:t0; if(/^TOTAL/.test(String(t0))) tot=m[j].map(function(c){ return (c&&typeof c==='object')?c.v:c; }); }
    return { pantalla:celdas, excel:tot, ini:ini };
  });
  chk('5a · control: la pantalla tiene la fila TOTAL (1.700 cobrado · 600 fact. · 100 no fact. · 700 retirado)',
      r.pantalla.length>=6 && /1\.700,00/.test(r.pantalla[1]) && /600,00/.test(r.pantalla[2]) && /100,00/.test(r.pantalla[3]) && /700,00/.test(r.pantalla[4]), J(r.pantalla));
  chk('5a · ⚠️ el Excel también: TOTAL 1.700 · 600 · 100 · 700 · 1.000 en la mano', !!r.excel && r.excel[2]===1700 && r.excel[3]===600 && r.excel[4]===100 && r.excel[5]===700 && r.excel[6]===1000, J(r.excel));

  /* ══ 5b · EN «TODO», UNA «PAGADA SIN MONTO» NO ES UN PAGO DE Bs 0 ═════════════════════════════
     El aviso dice «no se sabe cuánto ni cuándo entró, por eso no salen en el detalle de abajo»; en
     «Todo» el pago fabricado (sin fecha, Bs 0) sí salía en el detalle y en el Excel, y el cierre
     decía «Efectivo (2 pagos)» con uno solo de verdad. El texto no lo listaba: tres versiones. */
  r = await page.evaluate(async () => {
    await aCuadre([ P({ id:'T1', nota:'40', oc:'09-040', cliente:'PAGADA SIN MONTO', metodoPago:'Efectivo %T1' }),
                    P({ id:'T2', nota:'50', oc:'09-050', cliente:'PAGADA DE VERDAD', metodoPago:textoCobros([{metodo:'Efectivo',monto:1000,fecha:hoy,nota:'50',comps:['T2']}]) }) ], 'todo');
    var det=(document.getElementById('cua-detalle')||{}).textContent||'';
    var cierre=[].slice.call(document.querySelectorAll('#cua-cierre tbody tr')).map(function(tr){
      return [].slice.call(tr.querySelectorAll('td')).map(function(td){ return td.textContent.replace(/\s+/g,' ').trim(); }).join('|'); });
    var al=cuadreAlertas(cuadrePagos()).filter(function(a){ return a.k==='sinmonto'; })[0];
    var txt=cuadreTexto();
    exportCuadre();
    var m=window.__XLSX[0].matrix, filas=[];
    for(var i=1;i<m.length && m[i] && m[i].length;i++) filas.push(String((m[i][1]&&m[i][1].v)||m[i][1]));
    return { enDetalle:/PAGADA SIN MONTO/.test(det), cierre:cierre, aviso:al?al.txt.replace(/<[^>]+>/g,''):'', avisoDet:al?al.det.map(function(d){ return d.txt; }):[],
             texto:txt.split('\n').filter(function(l){ return /Efectivo:/.test(l); })[0]||'', excel:filas, n:cuadrePagos().length };
  });
  chk('5b · control: el aviso nombra la venta «PAGADA sin monto» y dice que no sale en el detalle', /no salen en el detalle/.test(r.aviso) && /PAGADA SIN MONTO/.test(J(r.avisoDet)), r.aviso.slice(0,90));
  chk('5b · ⚠️ …y en «Todo» NO sale en el detalle de la pantalla (antes: un renglón de Bs 0)', r.enDetalle===false && r.n===1, J({enDetalle:r.enDetalle, n:r.n}));
  chk('5b · ⚠️ …ni en el Excel', J(r.excel)==='["PAGADA DE VERDAD"]', J(r.excel));
  chk('5b · ⚠️ el cierre dice «Efectivo · 1 pago» en la pantalla y en el texto (no 2 con uno de Bs 0)',
      /Efectivo\|1\|Bs\s1\.000,00/.test(r.cierre[0]||'') && /\(1 pago\)/.test(r.texto), J({cierre:r.cierre[0], texto:r.texto}));

  /* ══ 5c · DOS PAGOS SIN FECHA IGUALES NO SE CUENTAN COMO UNO ═════════════════════════════════
     Una venta de agosto con dos cobros de Bs 500 en efectivo sin fecha ni recibo (el 💰 de §4fd los
     dejaba así). Mirando septiembre, §4fn los busca en TODAS las ventas… y los juntaba por
     «venta|monto|nota»: el aviso decía «1 pago sin fecha» y listaba uno. Arreglaban uno y listo. */
  r = await page.evaluate(async () => {
    await aCuadre([ P({ id:'D1', nota:'60', oc:'08-060', cliente:'DOS SIN FECHA', ts:tsDe('2026-08-20'), metodoPago:'Efectivo 500 + Efectivo 500' }),
                    P({ id:'D2', nota:'61', oc:'09-061', cliente:'DOS SIN FECHA DEL MES', metodoPago:'QR BISA 300 + QR BISA 300' }) ]);
    var al=cuadreAlertas(cuadrePagos()).filter(function(a){ return a.k==='sinfecha'; })[0];
    return { txt:al?al.txt.replace(/<[^>]+>/g,''):'', det:al?al.det.map(function(d){ return d.txt; }):[] };
  });
  chk('5c · control: los dos de una venta DEL MES se cuentan los dos', r.det.filter(function(t){ return /DEL MES/.test(t); }).length===2, J(r.det));
  chk('5c · ⚠️ los dos de la venta de agosto también: «4 pagos sin fecha (2 de ventas de otro mes)»',
      /^4 pagos sin fecha/.test(r.txt) && /\(2 de ventas de otro mes\)/.test(r.txt) && r.det.filter(function(t){ return /venta del 20\/08/.test(t); }).length===2, J(r));

  chk('sin errores JS', errores.length===0, errores.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
