/* 🧾 TERCERA REVISIÓN DE CONTABILIDAD (Ventas, Mayoristas y Cuadre) — lo que quedó REPORTADO (26/09)

   Una sección por arreglo, todo por los botones que usa la gente, con el reloj CLAVADO en un
   miércoles de mitad de mes (no se pudre a fin de mes, ni los sábados, ni los domingos).

     1. «✏️ Corregir precios y montos» perdía lo tipeado (precios, A cuenta y saldo) si otro botón
        repintaba la ficha antes de «💾 Guardar»: ✅, el método o el banco del pago nuevo, «💵 Pago /
        🚚 Recargo», abrir ✏️ Corregir un pago, 📲… y «Guardar» guardaba lo viejo sin decir nada.

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

  chk('sin errores JS', errores.length===0, errores.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
