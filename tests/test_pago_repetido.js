/* 🔁 EL MISMO PAGO DOS VECES (10/10, auditoría de Antigravity y Codex, hallazgo 2).

   «Registrar pago» en Contabilidad aceptaba el MISMO comprobante otra vez (mismo monto, día, método, banco y N° de recibo) sin
   decir nada, y el saldo bajaba dos veces. Ahora pregunta antes (`pagoRepetido`); Cancelar no anota nada y Aceptar lo anota igual
   (puede haber dos pagos iguales de verdad). Un recibo distinto no pregunta.

   Red cortada, servidor simulado, reloj clavado. Se corre:  node tests/test_pago_repetido.js
   Dientes:  PEDIDOS=/ruta/a/un/pedidos.html/viejo node tests/test_pago_repetido.js            */
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
  const registrar = (nota, foto) => page.evaluate(async (a) => {
    showContaModal('V1');
    await subir('V1', a.foto);
    tipear({'cta-pago-monto':'400', 'cta-pago-nota':a.nota});
    boton('ctaRegistrarPago').click();
    await new Promise(function(r){ setTimeout(r,80); });
    var p=findById('V1');
    return { n:cobrosDe(p).length, saldo:Number(p.saldo)||0 };
  }, {nota, foto});

  await page.evaluate(async () => { await aVentas([ P({ id:'V1', nota:'80', oc:'09-080', cliente:'PAGO REPETIDO', pagado:false, saldo:1000 }) ]); });

  console.log('\n── 1. El primer pago entra sin preguntar ──');
  D.confirm=true; D.vistos=[];
  let r = await registrar('81', 'R1');
  chk('1 · el primer pago de 400 (recibo 81) se anota y el saldo baja a 600', r.n===1 && r.saldo===600, J(r));
  chk('1 · …sin ninguna pregunta de «pago igual»', !D.vistos.some(m=>/pago IGUAL/.test(m)), J(D.vistos));

  console.log('\n── 2. El mismo pago otra vez pregunta; Cancelar no anota nada ──');
  D.confirm=false; D.vistos=[];
  r = await registrar('81', 'R2');
  chk('2 · ⚠️ el mismo recibo (400, mismo día, mismo método, 81) PREGUNTA antes', D.vistos.some(m=>/Ya hay un pago IGUAL/.test(m) && /81/.test(m)), J(D.vistos));
  chk('2 · Cancelar: no se anota y el saldo sigue en 600', r.n===1 && r.saldo===600, J(r));

  console.log('\n── 3. Aceptar lo anota igual ──');
  D.confirm=true; D.vistos=[];
  r = await registrar('81', 'R3');
  chk('3 · Aceptar: queda anotado dos veces y el saldo baja a 200', r.n===2 && r.saldo===200, J(r));

  console.log('\n── 4. Otro recibo no pregunta ──');
  await page.evaluate(async () => { await aVentas([ P({ id:'V1', nota:'80', oc:'09-080', cliente:'PAGO REPETIDO', pagado:false, saldo:1000 }) ]); });
  D.confirm=true; D.vistos=[];
  await registrar('81', 'R4');
  D.vistos=[];
  r = await registrar('82', 'R5');
  chk('4 · el mismo monto con OTRO recibo (82) no pregunta y entra', !D.vistos.some(m=>/pago IGUAL/.test(m)) && r.n===2 && r.saldo===200, J({r, vistos:D.vistos}));

  chk('sin errores JS', errores.length===0, errores.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
