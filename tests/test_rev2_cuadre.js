/* 🧮 SEGUNDA REVISIÓN DEL CUADRE Y LA CONCILIACIÓN (26/09)

   Contabilidad → 🧮 Cuadre y conciliación, con la gente usándolo de verdad: tipeando con el
   teclado en el campo real, con la cola y el refresco automático en el medio, y en un celular.
   Una sección por arreglo, más las invariantes que tienen que seguir valiendo:

     1. El arqueo y el monto del retiro se tipean como se escribe en Bolivia («1.500,50»): el
        campo `type=number` de Chromium tiraba la coma y guardaba Bs 1,50 (o Bs 150.050).
     2. Un retiro CORREGIDO que espera en la cola (o en el aire) no vuelve al monto viejo con el
        refresco automático: el cuadre contaba lo que ya se había corregido.
     3. Un retiro BORRADO no reaparece con el refresco de los 90 s siguientes a guardarlo.
     4. El Excel del cuadre baja aunque en el período haya solo retiros (lo que la pantalla y el
        texto ya muestran), y con filtro por vendedora el nombre del archivo lo dice.
     5. «N de M formas anotadas» cuenta también el arqueo sin pagos, y el texto y el Excel dicen
        cuando la diferencia es de ALGUNAS formas (no «✅ El cuadre cierra» a secas).
     6. En un celular de 360 px (y de 320) la pantalla del cuadre no se corre de costado.
     7. El refresco automático no le saca el foco al arqueo que se está tipeando (ni tira una
        excepción a mitad del repintado).
     8. Invariantes con el reloj clavado el último día del año y el 1° de enero: la suma de los
        días da el mes, ningún pago aparece dos veces ni falta, pantalla = texto = Excel, y ATC,
        RPT y Eduardo quedan afuera.

   Red cortada, servidor simulado (la planilla vive en `window.SRV`). Se corre:
       node tests/test_rev2_cuadre.js
   Dientes:  PEDIDOS=/ruta/a/un/pedidos.html/viejo node tests/test_rev2_cuadre.js          */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,extra)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, extra!=null?('· '+(typeof extra==='string'?extra:JSON.stringify(extra))):''); };
const J=x=>JSON.stringify(x);
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];

  /* Una página con el reloj clavado. `iso` = el instante (UTC). La planilla es `window.SRV`, y
     `apiPost` la atiende como el servidor: guardar sella la fila, borrar la saca, listar la
     devuelve. Se usa el `apiSave` REAL (anota lo último que tocó la persona, §4eo). */
  async function nueva(iso, vp) {
    const ctx = await browser.newContext({ viewport: vp || {width:1400,height:1000}, timezoneId:'America/La_Paz', locale:'es-BO' });
    const page = await ctx.newPage();
    await page.clock.setFixedTime(new Date(iso));
    page.on('pageerror', e => errores.push(e.message));
    page.on('dialog', async d => { await d.accept(); });
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
      window.__XLSX=null; window.__NOMBRE='';
      buildXlsx=function(sheets){ window.__XLSX=JSON.parse(JSON.stringify(sheets)); return new Uint8Array([1]); };
      downloadBlob=function(b, nombre){ window.__NOMBRE=nombre; };
      window.SRV=[]; window.MODO='ok';
      apiPost=function(b){
        if(b.action==='save'){
          if(window.MODO==='busy') return Promise.resolve({ok:false, error:'busy'});
          if(window.MODO==='hold') return new Promise(function(){});
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
        var b={ turno:'AM', celular:'7', nit:'1', zona:'Norte', direccion:'X', fecha:window.hoy, maps:'', observaciones:'',
                estado:'', entregado:false, chofer:'', nroDia:1, fotos:[], vendedor:'Carola Chavez', ts:window.tsDe(window.hoy),
                acuenta:0, saldo:0, pagado:true, metodoPago:'', productos:[] };
        var q={}; for(var k in b) q[k]=b[k]; for(var k2 in o) q[k2]=o[k2]; return q;
      };
      window.R=function(o){ return filaDeRetiro({ id:o.id, fecha:o.fecha||window.hoy, entrega:o.entrega||'Carola Chavez', retira:o.retira||'Eduardo Añez',
                                                  monto:o.monto, notas:o.notas||['10'], tipo:o.tipo||'Facturado', fotos:[], obs:'' }); };
      // Carga la planilla y abre el cuadre, como quien entra a mirarlo.
      window.abrir=async function(filas, modo, val){
        window.SRV=JSON.parse(JSON.stringify(filas)); setPending([]);
        STATE=[]; RETIROS=[];
        // Cada escena arranca limpia: sin guardados en el aire ni «lo último que tocó» de la anterior.
        SAVE_ULTIMO={}; SAVE_REV={}; SAVE_EN_VUELO={}; SAVE_EN_ESPERA={};
        await refrescarEstado();
        showView('conta'); segSet('cta-tab','cuadre'); setContaTab('cuadre');
        await new Promise(function(r){ setTimeout(r,120); });     // el refresco que dispara showView
        document.getElementById('cua-vendedor').value='';
        segSet('cua-mode', modo||'mes');
        if((modo||'mes')==='mes') document.getElementById('cua-mes').value=val||window.hoy.slice(0,7);
        if(modo==='dia') document.getElementById('cua-dia').value=val||window.hoy;
        setCuadreModo(modo||'mes');
      };
    });
    return page;
  }

  // ══ 1 · EL ARQUEO Y EL RETIRO SE TIPEAN COMO SE ESCRIBE EN BOLIVIA ══════════════════════
  /* El campo era `type=number`: Chromium (en-US y es-419, que es como se ve un Chrome de Bolivia)
     tira la coma. «1.500,50» llegaba como «1.50050» → Bs 1,50, y «1500,50» como «150050» →
     Bs 150.050. La contadora anota el extracto como lo lee y el cuadre dice «falta Bs 1.499». */
  {
    const page = await nueva('2026-09-16T15:00:00Z');
    await page.evaluate(async () => {
      await abrir([ P({ id:'q1', nota:'11', oc:'09-011', cliente:'CON QR', metodoPago:textoCobros([{metodo:'QR',banco:'BISA',monto:1500.5,fecha:hoy,nota:'11',comps:['Q1']}]) }) ]);
    });
    const tipeos = [['1.500,50',1500.5], ['1500,50',1500.5], ['1500.50',1500.5], ['1.500',1500], ['2.345.678,90',2345678.9]];
    const vistos = [];
    for (const [t, esperado] of tipeos) {
      await page.evaluate(() => { ARQUEO={}; renderCuadre(); });
      const inp = page.locator('#cua-cierre input.cua-arqueo').first();
      await inp.click(); await page.keyboard.type(t); await page.keyboard.press('Tab');
      await page.waitForTimeout(40);
      const v = await page.evaluate(() => cuadreArqueo('QR BISA'));
      vistos.push(t+' → '+v);
      chk('1 · arqueo tipeado «'+t+'» se guarda como '+esperado, v===esperado, 'quedó '+v);
    }
    let r = await page.evaluate(() => ({ dif:cuadreCierre().difTotal, txt:document.getElementById('cua-metrics').innerText.replace(/\s+/g,' ') }));
    // El último tipeo (2.345.678,90) contra Bs 1.500,50 del panel: la diferencia es de verdad.
    chk('1 · …y la diferencia sale de ese número (no de uno 100 veces más grande o más chico)', r.dif===2344178.4, r.dif);
    await page.evaluate(() => { ARQUEO={}; renderCuadre(); });
    const inp2 = page.locator('#cua-cierre input.cua-arqueo').first();
    await inp2.click(); await page.keyboard.type('1.500,50'); await page.keyboard.press('Tab'); await page.waitForTimeout(40);
    r = await page.evaluate(() => ({ dif:cuadreCierre().difTotal, tarjeta:document.getElementById('cua-metrics').innerText.replace(/\s+/g,' '),
                                     texto:cuadreTexto(), fila:(textoArqueo(ARQUEO)) }));
    chk('1 · con el extracto «1.500,50» el cuadre CIERRA (pantalla)', r.dif===0 && /cierra/i.test(r.tarjeta), r.dif);
    chk('1 · …el texto para WhatsApp también', /El cuadre cierra/.test(r.texto), r.texto.split('\n').slice(0,6).join(' / '));
    chk('1 · …y a la planilla va 1500.5', /QR BISA=1500\.5\b/.test(r.fila), r.fila);

    // El monto del retiro, por la ventana de verdad.
    await page.evaluate(() => { abrirRetiros(); document.getElementById('ret-entrega').value='Carola Chavez'; retEntregaCambio();
                                document.getElementById('ret-nota-nueva').value='11'; retAgregarNota(); });
    await page.locator('#ret-monto').click(); await page.keyboard.type('5.000,50');
    await page.evaluate(() => guardarRetiroForm());
    await page.waitForTimeout(80);
    r = await page.evaluate(() => ({ montos:retirosTodos().map(function(x){ return x.monto; }), srv:window.SRV.filter(esFilaRetiro).map(function(x){ return x.acuenta; }) }));
    chk('1 · el retiro tipeado «5.000,50» es de Bs 5.000,50 (no Bs 5,00)', J(r.montos)==='[5000.5]' && J(r.srv)==='[5000.5]', J(r));
    await page.evaluate(() => { var i=document.getElementById('ret-monto'); i.value='';
                                document.getElementById('ret-entrega').value='Carola Chavez'; retEntregaCambio(); });
    await page.locator('#ret-monto').click(); await page.keyboard.type('700,25');
    await page.evaluate(() => { document.getElementById('ret-nota-nueva').value='12'; retAgregarNota(); guardarRetiroForm(); });
    await page.waitForTimeout(80);
    r = await page.evaluate(() => retirosTodos().map(function(x){ return x.monto; }).sort(function(a,b){ return a-b; }));
    chk('1 · …y «700,25» es Bs 700,25 (no Bs 70.025)', J(r)==='[700.25,5000.5]', J(r));
    await page.evaluate(() => closeRetiros());
    await page.context().close();
  }

  // ══ 2 · UN RETIRO CORREGIDO QUE ESPERA EN LA COLA NO VUELVE AL MONTO VIEJO ═══════════════
  /* Contabilidad corrige un retiro de 400 a 500; el servidor está ocupado y la corrección queda en
     la cola (o todavía en el aire). El refresco automático trae la fila de la planilla (400) y
     `mergePending` solo agregaba los retiros que faltaban: el cuadre volvía a contar 400 y decía
     «le quedan Bs 600» cuando son 500, hasta que la cola saliera — con el servidor ocupado, horas. */
  {
    const page = await nueva('2026-09-16T15:00:00Z');
    let r = await page.evaluate(async () => {
      await abrir([ P({ id:'e1', nota:'10', oc:'09-010', cliente:'EFECTIVO', metodoPago:textoCobros([{metodo:'Efectivo',monto:1000,fecha:hoy,nota:'10',comps:['E1']}]) }),
                    R({ id:'__ret_c1__', monto:400 }) ]);
      var antes=retirosTotal(retirosTodos());
      window.MODO='busy';
      abrirRetiros(); editarRetiro('__ret_c1__');
      document.getElementById('ret-monto').value='500';
      guardarRetiroForm();
      await new Promise(function(r){ setTimeout(r,80); });
      var enCola=getPending().filter(esFilaRetiro).map(function(x){ return x.acuenta; });
      closeRetiros();
      await refrescarEstado(); autoRepintar();
      var fila=cuadreEfectivo().filas.filter(function(o){ return o.nombre==='Carola Chavez'; })[0]||{};
      return { antes:antes, enCola:enCola, despues:retirosTotal(retirosTodos()), ret:fila.ret, falta:fila.falta,
               tarjeta:document.getElementById('cua-metrics').innerText.replace(/\s+/g,' ') };
    });
    chk('2 · la corrección (400 → 500) quedó en la cola con el servidor ocupado', r.antes===400 && J(r.enCola)==='[500]', J({antes:r.antes, cola:r.enCola}));
    chk('2 · ⚠️ después del refresco el cuadre sigue contando 500, no los 400 de la planilla', r.despues===500 && r.ret===500 && r.falta===500, J({total:r.despues, ret:r.ret, falta:r.falta}));
    chk('2 · …y la tarjeta «Efectivo retirado» dice Bs 500', /EFECTIVO RETIRADO Bs 500,00/i.test(r.tarjeta), r.tarjeta.slice(0,200));

    // En el aire (el servidor todavía no contestó): lo mismo.
    r = await page.evaluate(async () => {
      await abrir([ P({ id:'e1', nota:'10', oc:'09-010', cliente:'EFECTIVO', metodoPago:textoCobros([{metodo:'Efectivo',monto:1000,fecha:hoy,nota:'10',comps:['E1']}]) }),
                    R({ id:'__ret_c2__', monto:300 }) ]);
      window.MODO='hold';
      abrirRetiros(); editarRetiro('__ret_c2__');
      document.getElementById('ret-monto').value='350';
      guardarRetiroForm();
      await new Promise(function(r){ setTimeout(r,50); });
      closeRetiros();
      await refrescarEstado();
      return retirosTodos().map(function(x){ return x.monto; });
    });
    chk('2 · un retiro corregido con el guardado en el aire tampoco vuelve al monto viejo', J(r)==='[350]', J(r));

    // Cuando la cola sale, la planilla y la pantalla quedan iguales (nada contado dos veces).
    r = await page.evaluate(async () => {
      window.MODO='ok'; SAVE_EN_VUELO={}; SAVE_EN_ESPERA={};
      await abrir([ R({ id:'__ret_c3__', monto:400 }) ]);
      window.MODO='busy';
      abrirRetiros(); editarRetiro('__ret_c3__'); document.getElementById('ret-monto').value='500'; guardarRetiroForm();
      await new Promise(function(r){ setTimeout(r,60); });
      closeRetiros();
      window.MODO='ok';
      await flushPending(); await refrescarEstado();
      return { pant:retirosTodos().map(function(x){ return x.monto; }), srv:window.SRV.filter(esFilaRetiro).map(function(x){ return x.acuenta; }), cola:getPending().length };
    });
    chk('2 · al salir la cola: un solo retiro de 500 en la planilla y en pantalla', J(r.pant)==='[500]' && J(r.srv)==='[500]' && r.cola===0, J(r));
    await page.context().close();
  }

  // ══ 3 · UN RETIRO BORRADO NO REAPARECE CON EL REFRESCO ═════════════════════════════════
  /* §4ek: Mirian cargó el mismo retiro dos veces. Borra el repetido al toque («Retiro borrado» ✓,
     la planilla ya no lo tiene), y el refresco automático de los 90 s siguientes lo volvía a poner
     en pantalla —y a restar en el cuadre— desde «lo último que tocó la persona» (§4eo). Parece que
     el borrado no anduvo: o lo borra de nuevo, o borra el OTRO (el bueno). */
  {
    const page = await nueva('2026-09-16T15:00:00Z');
    const r = await page.evaluate(async () => {
      window.MODO='ok';
      await abrir([ P({ id:'e1', nota:'10', oc:'09-010', cliente:'EFECTIVO', metodoPago:textoCobros([{metodo:'Efectivo',monto:1000,fecha:hoy,nota:'10',comps:['E1']}]) }),
                    R({ id:'__ret_bueno__', monto:400, notas:['10'] }) ]);
      abrirRetiros();
      document.getElementById('ret-entrega').value='Carola Chavez'; retEntregaCambio();
      document.getElementById('ret-monto').value='400';
      document.getElementById('ret-nota-nueva').value='10'; retAgregarNota();
      guardarRetiroForm();                                    // el repetido (el aviso de §4ek se acepta)
      await new Promise(function(r){ setTimeout(r,80); });
      var repetido=RETIROS.filter(function(x){ return x.id!=='__ret_bueno__'; })[0];
      var trasGuardar=retirosTodos().length;
      borrarRetiro(repetido.id);
      await new Promise(function(r){ setTimeout(r,200); });
      var enPlanilla=window.SRV.filter(esFilaRetiro).length;
      await refrescarEstado(); autoRepintar();
      closeRetiros();
      return { trasGuardar:trasGuardar, enPlanilla:enPlanilla, pantalla:retirosTodos().map(function(x){ return x.id; }),
               retirado:retirosTotal(retirosDe(cuadrePeriodo(), '')) };
    });
    chk('3 · el repetido se guardó y se borró de la planilla', r.trasGuardar===2 && r.enPlanilla===1, J(r));
    chk('3 · ⚠️ el refresco NO lo vuelve a poner en pantalla: queda solo el bueno', J(r.pantalla)==='["__ret_bueno__"]', J(r.pantalla));
    chk('3 · …y el cuadre resta 400, no 800', r.retirado===400, r.retirado);
    await page.context().close();
  }

  // ══ 4 · EL EXCEL DEL CUADRE BAJA CON SOLO RETIROS, Y DICE DE QUIÉN ES ═══════════════════
  /* El día que Eduardo pasa a recoger el efectivo no entra ningún pago: la pantalla muestra el
     retiro («se retiró Bs 1.000 de más» ese día) y el texto también, pero el ⬇️ Excel decía «No hay
     pagos para exportar». Y con el filtro por vendedora el archivo se llamaba igual que el del
     equipo entero (Contabilidad → Ventas ya pone el nombre, §4fv). */
  {
    const page = await nueva('2026-09-16T15:00:00Z');
    let r = await page.evaluate(async () => {
      var ay=new Date(); ay.setDate(ay.getDate()-1); var ayer=isoLocal(ay);
      await abrir([ P({ id:'e1', nota:'10', oc:'09-010', cliente:'EFECTIVO', ts:tsDe(ayer), metodoPago:textoCobros([{metodo:'Efectivo',monto:1000,fecha:ayer,nota:'10',comps:['E1']}]) }),
                    R({ id:'__ret_d1__', monto:1000, notas:['10'] }) ], 'dia', hoy);
      var pant=document.getElementById('cua-retiros').innerText, txt=cuadreTexto();
      window.__XLSX=null; exportCuadre();
      var m=window.__XLSX?window.__XLSX[0].matrix:[];
      var plano=m.map(function(f){ return (f||[]).map(function(c){ return (c&&typeof c==='object')?c.v:c; }).join('|'); });
      return { pantRet:/1\.000,00/.test(pant), txtRet:/se le retiró Bs 1\.000,00/.test(txt), bajo:!!window.__XLSX,
               retiro:plano.some(function(l){ return /^2026-09-16\|Carola Chavez\|Eduardo Añez\|10\|Facturado\|1000/.test(l); }),
               efectivo:plano.some(function(l){ return /^Carola Chavez\|\|0\|1000\|0\|1000\|-1000$/.test(l); }), nombre:window.__NOMBRE };
    });
    chk('4 · la pantalla y el texto muestran el retiro del día', r.pantRet && r.txtRet, J(r));
    chk('4 · ⚠️ el Excel del día BAJA aunque no haya pagos', r.bajo===true, J(r));
    chk('4 · …con el retiro y el «cobrado vs. retirado» de ese día', r.retiro && r.efectivo, J(r));
    r = await page.evaluate(async () => {
      await abrir([ P({ id:'e2', nota:'20', oc:'09-020', cliente:'DE CAROLA', metodoPago:textoCobros([{metodo:'Efectivo',monto:800,fecha:hoy,nota:'20',comps:['E2']}]) }),
                    P({ id:'e3', nota:'30', oc:'09-030', cliente:'DE MARIA', vendedor:'Maria Flores', metodoPago:textoCobros([{metodo:'QR',banco:'BISA',monto:900,fecha:hoy,nota:'30',comps:['E3']}]) }) ]);
      exportCuadre(); var todos=window.__NOMBRE;
      document.getElementById('cua-vendedor').value='Carola Chavez'; renderCuadre();
      exportCuadre(); var carola=window.__NOMBRE;
      document.getElementById('cua-vendedor').value=''; renderCuadre();
      return { todos:todos, carola:carola };
    });
    chk('4 · con Todos el archivo es cuadre-2026-09.xlsx', r.todos==='cuadre-2026-09.xlsx', r.todos);
    chk('4 · ⚠️ filtrado por Carola el nombre lo dice (no pisa al del equipo)', r.carola!==r.todos && /carola-chavez/.test(r.carola), r.carola);
    await page.context().close();
  }

  // ══ 5 · «N DE M FORMAS ANOTADAS» Y EL «CIERRA» DEL TEXTO ═════════════════════════════════
  /* QR BISA y Tarjeta en el mes; se anotó el extracto del QR (cuadra) y Bs 300 de efectivo contado
     a mano sin ningún pago de efectivo (§4fo). La tarjeta decía «2 de 2 formas anotadas» — como si
     no faltara nada — con la Tarjeta sin contar. Y con solo el QR anotado el texto decía «✅ El
     cuadre cierra» a secas: el que lo lee en el grupo entiende que se contó todo. */
  {
    const page = await nueva('2026-09-16T15:00:00Z');
    let r = await page.evaluate(async () => {
      await abrir([ P({ id:'b1', nota:'11', oc:'09-011', cliente:'B', metodoPago:textoCobros([{metodo:'QR',banco:'BISA',monto:1000,fecha:hoy,nota:'11',comps:['B1']}]) }),
                    P({ id:'b2', nota:'12', oc:'09-012', cliente:'C', metodoPago:textoCobros([{metodo:'Tarjeta',monto:500,fecha:hoy,nota:'12',comps:['B2']}]) }) ]);
      var M=hoy.slice(0,7);
      ARQUEO={}; ARQUEO['mes|'+M+'|QR BISA']=1000; ARQUEO['mes|'+M+'|Efectivo']=300; renderCuadre();
      var t1=document.getElementById('cua-metrics').innerText.replace(/\s+/g,' ');
      ARQUEO={}; ARQUEO['mes|'+M+'|QR BISA']=1000; renderCuadre();
      var t2=document.getElementById('cua-metrics').innerText.replace(/\s+/g,' ');
      var txt=cuadreTexto();
      exportCuadre();
      var m=window.__XLSX[0].matrix;
      var dif=m.filter(function(f){ return f && f[0] && /DIFERENCIA TOTAL/.test(String(f[0].v!=null?f[0].v:f[0])); })[0];
      return { t1:t1, t2:t2, txt:txt, dif:dif?String(dif[0].v!=null?dif[0].v:dif[0]):'' };
    });
    chk('5 · ⚠️ con el efectivo sin pagos: «2 de 3 formas anotadas» (no «2 de 2»)', /2 de 3 formas anotadas/.test(r.t1), (r.t1.match(/\d+ de \d+ formas?[^·]*/)||[''])[0]);
    chk('5 · solo el QR anotado: la tarjeta dice «1 de 2»', /1 de 2 formas anotada\b/.test(r.t2), (r.t2.match(/\d+ de \d+ formas?[^·]*/)||[''])[0]);
    chk('5 · ⚠️ …y el texto no dice «El cuadre cierra» a secas: dice que es 1 de 2 formas', /El cuadre cierra.*1 de 2 formas/.test(r.txt), (r.txt.match(/.*cierra.*/)||[''])[0]);
    chk('5 · …el Excel también', /1 de 2 formas/.test(r.dif), r.dif);
    r = await page.evaluate(() => {
      var M=hoy.slice(0,7);
      ARQUEO={}; ARQUEO['mes|'+M+'|QR BISA']=1000; ARQUEO['mes|'+M+'|Tarjeta']=500; renderCuadre();
      return { tarjeta:document.getElementById('cua-metrics').innerText.replace(/\s+/g,' '), txt:cuadreTexto() };
    });
    chk('5 · con todas las formas contadas: «2 de 2» y «✅ El cuadre cierra» sin agregados', /2 de 2 formas anotadas/.test(r.tarjeta) && /✅ El cuadre cierra$/m.test(r.txt), (r.txt.match(/.*cierra.*/)||[''])[0]);
    await page.context().close();
  }

  // ══ 6 · EN UN CELULAR NO SE CORRE DE COSTADO ═════════════════════════════════════════════
  /* A 360 px la barra «📋 Ventas · 🏭 Mayoristas · 🧮 Cuadre y conciliación» medía 385: toda
     Contabilidad se corría 25 px de costado (y en 320, 65). Las tablas tienen su propio scroll. */
  for (const ancho of [360, 320]) {
    const page = await nueva('2026-09-16T15:00:00Z', {width:ancho, height:740});
    const r = await page.evaluate(async () => {
      await abrir([ P({ id:'b1', nota:'11', oc:'09-011', cliente:'CLIENTE CON UN NOMBRE BASTANTE LARGO S.R.L.', metodoPago:textoCobros([{metodo:'Efectivo',monto:1000,fecha:hoy,nota:'11',recibio:'Luis Pierre',comps:['B1']}]) }),
                    P({ id:'b2', nota:'12', oc:'09-012', cliente:'C', pagado:false, saldo:700, metodoPago:textoCobros([{anticipo:true,metodo:'QR',banco:'BISA',monto:500,fecha:hoy,nota:'12',comps:['B2']}]) }),
                    R({ id:'__ret_m1__', monto:300 }) ]);
      window.scrollTo(0,0);
      var fuera=[].slice.call(document.querySelectorAll('#view-conta *')).filter(function(e){
        var b=e.getBoundingClientRect(); return b.width>0 && b.right>window.innerWidth+1 && !e.closest('.tw');
      }).map(function(e){ return e.tagName+'#'+e.id+' '+Math.round(e.getBoundingClientRect().right); });
      return { sw:document.documentElement.scrollWidth, iw:window.innerWidth, fuera:fuera.slice(0,4),
               tabs:[].slice.call(document.querySelectorAll('#cta-tab button')).map(function(b){ return Math.round(b.getBoundingClientRect().width); }) };
    });
    chk('6 · a '+ancho+' px el cuadre no se corre de costado', r.sw<=r.iw && !r.fuera.length, J(r));
    chk('6 · …y las tres sub-pestañas se ven y se pueden tocar (≥ 44 px de ancho)', r.tabs.length===3 && r.tabs.every(function(w){ return w>=44; }), J(r.tabs));
    await page.context().close();
  }

  // ══ 7 · EL REFRESCO AUTOMÁTICO NO SE LLEVA EL ARQUEO QUE SE ESTÁ TIPEANDO ════════════════
  /* La contadora tiene el extracto en papel y va tipeando; el número se guarda al salir del
     campo. Si justo pasan los 2 minutos del refresco, `renderCuadre` rehacía la tabla con el
     campo adentro: el foco se perdía (lo que seguía tipeando no iba a ningún lado) y el
     repintado se cortaba a la mitad con una excepción. */
  {
    const page = await nueva('2026-09-16T15:00:00Z');
    await page.evaluate(async () => {
      await abrir([ P({ id:'q1', nota:'11', oc:'09-011', cliente:'CON QR', metodoPago:textoCobros([{metodo:'QR',banco:'BISA',monto:900,fecha:hoy,nota:'11',comps:['Q1']}]) }) ]);
      ARQUEO={}; renderCuadre();
    });
    await page.locator('#cua-cierre input.cua-arqueo').first().click();
    await page.keyboard.type('900');
    /* Contra el panel viejo el repintado además TIRA una excepción: al sacar el campo con el foco
       adentro, Chromium dispara su `change` en el medio del `innerHTML`, que vuelve a repintar. */
    const r1 = await page.evaluate(async () => { var err='';
      try{ await autoRefrescar('tic'); }catch(e){ err=String(e&&e.message||e).slice(0,90); }
      var i=document.querySelector('#cua-cierre input.cua-arqueo'); return { valor:i?i.value:null, foco:document.activeElement===i, err:err }; });
    await page.keyboard.press('Tab'); await page.waitForTimeout(40);
    const r2 = await page.evaluate(() => ({ arq:cuadreArqueo('QR BISA'), dif:cuadreCierre().difTotal }));
    chk('7 · ⚠️ con el refresco en el medio, lo tipeado sigue en el campo y con el foco (sin excepción)', r1.valor==='900' && r1.foco===true && !r1.err, J(r1));
    chk('7 · …y al salir del campo se guarda: 900, cuadra', r2.arq===900 && r2.dif===0, J(r2));
    const r3 = await page.evaluate(async () => { window.SRV=window.SRV.concat([P({ id:'q2', nota:'13', oc:'09-013', cliente:'OTRO QR', metodoPago:textoCobros([{metodo:'QR',banco:'BISA',monto:100,fecha:hoy,nota:'13',comps:['Q2']}]) })]);
      document.activeElement && document.activeElement.blur(); var ok=await autoRefrescar('tic'); return { ok:ok, n:cuadrePagos().length }; });
    chk('7 · sin nadie tipeando, el refresco repinta como siempre', r3.ok===true && r3.n===2, J(r3));
    await page.context().close();
  }

  // ══ 8 · INVARIANTES CON EL RELOJ EN EL CAMBIO DE AÑO ══════════════════════════════════════
  /* 31/12/2026 23:30 de Bolivia (= 01/01 03:30 UTC) y 01/01/2027 08:00. Pagos el 1°, el 15 y el 31
     de diciembre, uno el 1° de enero, un anticipo, un flete, un cobro del chofer, una ATC, una RPT
     y una venta de Eduardo (las tres cobradas: no entran). */
  for (const [iso, cual] of [['2027-01-01T03:30:00Z','31/12 23:30'], ['2027-01-01T12:00:00Z','01/01 08:00']]) {
    const page = await nueva(iso);
    const r = await page.evaluate(async () => {
      var filas=[
        P({ id:'i1', nota:'1', oc:'12-001', cliente:'UNO', fecha:'2026-12-01', ts:tsDe('2026-12-01'), metodoPago:textoCobros([{metodo:'Efectivo',monto:1000,fecha:'2026-12-01',nota:'1',comps:['I1']}]) }),
        P({ id:'i2', nota:'2', oc:'12-002', cliente:'DOS', fecha:'2026-12-15', ts:tsDe('2026-12-15'), pagado:false, saldo:0,
            metodoPago:textoCobros([{anticipo:true,metodo:'QR',banco:'BISA',monto:700,fecha:'2026-12-15',nota:'2',comps:['I2']},{metodo:'Efectivo',monto:300,fecha:'2026-12-31',nota:'3',recibio:'Luis Pierre'},{envio:true,metodo:'Efectivo',monto:150,fecha:'2026-12-31',nota:'3',recibio:'Luis Pierre'}]) }),
        P({ id:'i3', nota:'4', oc:'12-003', cliente:'TRES', fecha:'2026-12-31', ts:new Date('2027-01-01T03:10:00Z').getTime(), metodoPago:textoCobros([{metodo:'Tarjeta',monto:2000,fecha:'2026-12-31',nota:'4',comps:['I3']}]) }),
        P({ id:'i4', nota:'5', oc:'01-001', cliente:'CUATRO', fecha:'2027-01-01', ts:tsDe('2027-01-01'), metodoPago:textoCobros([{metodo:'Efectivo',monto:400,fecha:'2027-01-01',nota:'5',comps:['I4']}]) }),
        P({ id:'x1', nota:'6', oc:'ATC 12-001', cliente:'UNA ATC', metodoPago:textoCobros([{metodo:'Efectivo',monto:50,fecha:'2026-12-31',nota:'6'}]) }),
        P({ id:'x2', nota:'7', oc:'RPT 12-001', cliente:'Central', metodoPago:textoCobros([{metodo:'Efectivo',monto:60,fecha:'2026-12-31',nota:'7'}]) }),
        P({ id:'x3', nota:'8', oc:'12-009', cliente:'MAYORISTA', vendedor:'Eduardo Añez', metodoPago:textoCobros([{metodo:'Efectivo',monto:5000,fecha:'2026-12-31',nota:'8'}]) }),
        R({ id:'__ret_i1__', fecha:'2026-12-31', monto:1000, notas:['1'] }),
        R({ id:'__ret_i2__', fecha:'2026-12-31', entrega:'Luis Pierre', retira:'Contabilidad', monto:450, notas:['3'] })
      ];
      await abrir(filas, 'mes', '2026-12');
      var sumaTot=function(ps){ var t=0; ps.forEach(function(c){ t=r2(t+c.monto); }); return t; };
      var mes=cuadrePagos(), totMes=sumaTot(mes);
      var claves=mes.map(function(c){ return c.p.id+'|'+c.fecha+'|'+c.monto+'|'+(c.anticipo?'a':'')+(c.envio?'e':''); });
      var dias=0, nDias=0;
      segSet('cua-mode','dia');
      for(var d=1; d<=31; d++){
        document.getElementById('cua-dia').value='2026-12-'+(d<10?'0':'')+d; setCuadreModo('dia');
        var pd=cuadrePagos(); dias=r2(dias+sumaTot(pd)); nDias+=pd.length;
      }
      segSet('cua-mode','mes'); document.getElementById('cua-mes').value='2026-12'; setCuadreModo('mes');
      var pant=document.getElementById('cua-metrics').innerText.replace(/\s+/g,' ');
      var txt=cuadreTexto();
      exportCuadre();
      var m=window.__XLSX[0].matrix, excel=0, filasPago=0;
      for(var i=1;i<m.length && m[i] && m[i].length;i++){ filasPago++; excel=r2(excel+Number(m[i][7].v)); }
      var E=cuadreEfectivo().filas.map(function(o){ return o.nombre+':'+o.cobrado+'-'+o.ret+'='+o.falta; });
      segSet('cua-mode','mes'); document.getElementById('cua-mes').value='2027-01'; setCuadreModo('mes');
      var ene=cuadrePagos().map(function(c){ return c.p.id; });
      segSet('cua-mode','todo'); setCuadreModo('todo');
      var todo=cuadrePagos();
      return { hoy:hoy, totMes:totMes, n:mes.length, dias:dias, nDias:nDias, unicos:Object.keys(claves.reduce(function(o,k){ o[k]=1; return o; },{})).length,
               ids:mes.map(function(c){ return c.p.id; }), pant:pant, txt:txt, excel:excel, filasPago:filasPago, E:E, ene:ene, todo:sumaTot(todo), nTodo:todo.length };
    });
    const tag = '8 ('+cual+')';
    chk(tag+' · el reloj del panel está donde se dijo', r.hoy===(cual.startsWith('31')?'2026-12-31':'2027-01-01'), r.hoy);
    chk(tag+' · diciembre suma 1000 + 700 + 300 + 150 + 2000 = 4.150 en 5 pagos', r.totMes===4150 && r.n===5, J({tot:r.totMes, n:r.n}));
    chk(tag+' · la suma de los 31 días da el mes, pago por pago', r.dias===r.totMes && r.nDias===r.n, J({dias:r.dias, n:r.nDias}));
    chk(tag+' · ningún pago aparece dos veces', r.unicos===r.n, r.unicos+' de '+r.n);
    chk(tag+' · ATC, RPT y Eduardo quedan afuera', !r.ids.some(function(id){ return /^x/.test(id); }), J(r.ids));
    chk(tag+' · el 1° de enero va a enero, no a diciembre', J(r.ene)==='["i4"]', J(r.ene));
    chk(tag+' · «Todo» = diciembre + enero', r.todo===4550 && r.nTodo===6, J({todo:r.todo, n:r.nTodo}));
    chk(tag+' · pantalla = texto = Excel (Bs 4.150,00)', /Bs 4\.150,00/.test(r.pant) && /TOTAL: Bs 4\.150,00/.test(r.txt) && r.excel===4150 && r.filasPago===5, J({excel:r.excel, filas:r.filasPago}));
    chk(tag+' · el efectivo: Carola 1000−1000 y Luis Pierre (chofer) 450−450', J(r.E)==='["Carola Chavez:1000-1000=0","Luis Pierre:450-450=0"]', J(r.E));
    await page.context().close();
  }

  chk('sin errores JS', errores.length===0, errores.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
