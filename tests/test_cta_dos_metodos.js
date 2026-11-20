/* 💳 «PAGÓ CON DOS MÉTODOS» EN «REGISTRAR PAGO» DE CONTABILIDAD (20/11; dueño: «en la pestaña cargar pago no sale la opción de 2 métodos
   como en el pedido»). Pago 1 (el de siempre) + Pago 2 (`CTA_PAGO.mx`): mismo día y recibo, cada uno con su método, banco e imagen; se
   registran DOS cobros en un guardado. Mismo método (o QR al mismo banco) no se deja; sin imagen del Pago 2 no se registra; el efectivo del
   Pago 2 lleva «¿Quién recibió?». Red cortada, servidor simulado, reloj clavado.  Se corre:  node tests/test_cta_dos_metodos.js */
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

  const page = await nueva('2026-11-20T15:00:00Z');           // viernes 20/11/2026, 11:00 de Bolivia
  await page.evaluate(async () => { await aVentas([ P({ id:'V1', nota:'980', oc:'11-234', cliente:'DOS METODOS', pagado:false, saldo:990, fecha:dia(-1) }) ]); });

  console.log('\n── 1. El botón está y abre el Pago 2 ──');
  let r = await page.evaluate(async () => {
    showContaModal('V1');
    var b=document.getElementById('cta-mx-btn'); var hay=!!b; if(b) b.click();
    await new Promise(function(r){ setTimeout(r,80); });
    return { hay:hay, pago2:!!document.getElementById('cta-pago-monto2'), txt:(document.getElementById('cta-mx')||{}).textContent||'',
             reg:(boton('ctaRegistrarPago')||{}).textContent||'' };
  });
  chk('1 · «➕ Pagó con dos métodos» está y abre el «2️⃣ Pago 2»', r.hay && r.pago2 && /Pago 2/.test(r.txt), r);
  chk('1 · el botón dice «Registrar los dos pagos»', /los dos pagos/.test(r.reg), r.reg);

  console.log('\n── 2. Escribir el Pago 1 propone el resto en el Pago 2 ──');
  r = await page.evaluate(async () => {
    var e=document.getElementById('cta-pago-monto'); e.value='500'; e.dispatchEvent(new Event('input'));
    return { m2:document.getElementById('cta-pago-monto2').value, suma:document.getElementById('cta-mx-suma').textContent };
  });
  chk('2 · 990 − 500 = 490 en el Pago 2 y la suma dice «justo»', r.m2==='490' && /justo/.test(r.suma), r);

  console.log('\n── 3. Mismo método no se deja; sin imagen del Pago 2 tampoco ──');
  r = await page.evaluate(async () => {
    await subir('V1', 'F1');                                     // imagen del Pago 1 (efectivo)
    tipear({'cta-pago-nota':'982'});
    ctaRecibioAutoPoner(findById('V1')); CTA_PAGO.rEleg=true;   // quién recibió: la vendedora
    ctaMxMetodo('V1','Efectivo');
    tipear({'cta-pago-monto':'500','cta-pago-monto2':'490','cta-pago-nota':'982'});
    boton('ctaRegistrarPago').click(); await new Promise(function(r){ setTimeout(r,60); });
    var n1=cobrosDe(findById('V1')).length;
    ctaMxMetodo('V1','QR'); ctaMxBanco('V1', bancosDeVendedor('Carola Chavez')[0]);
    tipear({'cta-pago-monto':'500','cta-pago-monto2':'490','cta-pago-nota':'982'});
    boton('ctaRegistrarPago').click(); await new Promise(function(r){ setTimeout(r,60); });
    var n2=cobrosDe(findById('V1')).length;
    return { n1:n1, n2:n2, sigue:!!document.getElementById('cta-pago-monto2') };
  });
  chk('3 · efectivo + efectivo NO se registra', r.n1===0, r);
  chk('3 · sin la imagen del Pago 2 NO se registra y el Pago 2 sigue abierto', r.n2===0 && r.sigue, r);

  console.log('\n── 4. Con la imagen, se registran los DOS pagos ──');
  r = await page.evaluate(async () => {
    window.__FOTO='F2'; ctaAdjuntarMx('V1');
    await onCompElegido({ target:{ files:[new Blob(['x'],{type:'image/jpeg'})], dataset:{pedido:'V1'} } });
    tipear({'cta-pago-monto':'500','cta-pago-monto2':'490','cta-pago-nota':'982'});
    boton('ctaRegistrarPago').click(); await new Promise(function(r){ setTimeout(r,120); });
    var p=findById('V1'), c=cobrosDe(p);
    return { n:c.length, c:c.map(function(x){ return [x.metodo, x.banco||'', x.monto, x.fecha, x.nota, compsArr(x.comps).join(',')]; }),
             saldo:Number(p.saldo)||0, pagado:!!p.pagado, mx:CTA_PAGO.mx, wa:(document.getElementById('wa-pago')||{}).value||'' };
  });
  chk('4 · dos cobros: Efectivo 500 (F1) y QR 490 (F2), mismo día y recibo 982', r.n===2 && r.c[0][0]==='Efectivo' && r.c[0][2]===500 && r.c[0][5]==='F1' &&
      r.c[1][0]==='QR' && r.c[1][1] && r.c[1][2]===490 && r.c[1][5]==='F2' && r.c[0][3]===r.c[1][3] && r.c[0][4]==='982' && r.c[1][4]==='982', r.c);
  chk('4 · la venta queda PAGADA (saldo 0)', r.saldo===0 && r.pagado, r);
  chk('4 · el Pago 2 se cierra para el siguiente pago', r.mx==null, r.mx);
  chk('4 · el WhatsApp lleva los dos pagos', /500/.test(r.wa) && /490/.test(r.wa) && /SEGUNDO MÉTODO/.test(r.wa), r.wa.slice(0,200));

  console.log('\n── 5. Efectivo en el Pago 2: pide quién recibió y lo anota en ese ──');
  await page.evaluate(async () => { await aVentas([ P({ id:'V2', nota:'990', oc:'11-235', cliente:'DOS METODOS 2', pagado:false, saldo:1000, fecha:dia(-1) }) ]); });
  r = await page.evaluate(async () => {
    showContaModal('V2'); ctaSetMetodo('V2','Tarjeta'); ctaMxToggle('V2', true); await new Promise(function(r){ setTimeout(r,60); });
    window.__FOTO='T1'; await subir('V2','T1');
    ctaMxMetodo('V2','Efectivo');
    var hayRec=!!document.getElementById('cta-recibio');
    window.__FOTO='E2'; ctaAdjuntarMx('V2'); await onCompElegido({ target:{ files:[new Blob(['x'],{type:'image/jpeg'})], dataset:{pedido:'V2'} } });
    ctaSetRecibio('V2', 'Ysrael');
    tipear({'cta-pago-monto':'600','cta-pago-monto2':'400','cta-pago-nota':'991'});
    boton('ctaRegistrarPago').click(); await new Promise(function(r){ setTimeout(r,120); });
    var c=cobrosDe(findById('V2'));
    return { hayRec:hayRec, c:c.map(function(x){ return [x.metodo, x.monto, x.recibio||'']; }) };
  });
  chk('5 · el efectivo del Pago 2 muestra «¿Quién recibió la plata?»', r.hayRec, r);
  chk('5 · Tarjeta 600 sin chofer y Efectivo 400 en la mano de Ysrael', JSON.stringify(r.c)===JSON.stringify([['Tarjeta',600,''],['Efectivo',400,'Ysrael']]), r.c);

  console.log('\n── 6. Un solo método sigue como siempre ──');
  await page.evaluate(async () => { await aVentas([ P({ id:'V3', nota:'995', oc:'11-236', cliente:'UN METODO', pagado:false, saldo:300, fecha:dia(-1) }) ]); });
  r = await page.evaluate(async () => {
    showContaModal('V3'); ctaSetMetodo('V3','Tarjeta'); await subir('V3','U1');
    var mon=document.getElementById('cta-pago-monto').value;
    tipear({'cta-pago-nota':'996'}); boton('ctaRegistrarPago').click(); await new Promise(function(r){ setTimeout(r,120); });
    return { mon:mon, n:cobrosDe(findById('V3')).length, saldo:Number(findById('V3').saldo)||0 };
  });
  chk('6 · el monto viene con el saldo y entra un solo pago', r.mon==='300' && r.n===1 && r.saldo===0, r);

  chk('sin errores JS', errores.length===0, errores.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
