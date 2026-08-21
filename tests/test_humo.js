/* 💨 Prueba de humo: recorrer TODO el panel con datos de verdad y ver si algo se rompe.
   No mira detalles finos — mira que ninguna pantalla explote. Con un mes de uso encima hay
   pedidos de todas las formas posibles conviviendo (ATC, ROHO, mayorista, tienda, con flete,
   sin ubicación, cobrados de más, sin monto…) y una pantalla que anda con datos limpios
   puede reventar con los de verdad. Cada error JS que aparezca acá es un botón que a
   alguien no le va a funcionar. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1600,height:1000} });
  const errores=[]; page.on('pageerror',e=>errores.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    window._bajados=[];
    downloadBlob=function(b,n){ window._bajados.push(n); };
    apiSave=function(){ return Promise.resolve({ok:true}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
    apiGeocode=function(){ return Promise.resolve({ok:true,geo:[]}); };
    apiFoto=function(){ return Promise.resolve({ok:true,fotoId:'IMG_X'}); };
    var hoy=todayStr(), man=tomorrowStr(), ts=new Date(new Date().setHours(12,0,0,0)).getTime();
    var ay=new Date(); ay.setDate(ay.getDate()-3); var ayer=isoLocal(ay);
    var b={celular:'70011122',nit:'1023456',zona:'Norte',direccion:'Av. Banzer 5to anillo',
           maps:'https://maps.app.goo.gl/AAA',ts:ts};
    function P(o){ var q={}; for(var k in b)q[k]=b[k]; for(var k in o)q[k]=o[k]; return q; }
    /* Un pedido de cada forma que existe. Si alguno rompe una pantalla, se ve acá. */
    STATE=[
      P({id:'p1', nota:'101', oc:'08-101', fecha:man, turno:'AM', vendedor:'Carola Chavez', cliente:'NORMAL CON SALDO',
         chofer:'Luis Pierre', vehiculo:'Carry', acuenta:500, saldo:1500, pagado:false,
         metodoPago:'~Efectivo 500 @'+hoy+' #101 %I1',
         productos:[{desc:'TITANIO ICE',medida:'160x190',codigo:'CH1',cant:1,precio:2000,chk:'ok'}]}),
      P({id:'p2', nota:'102', oc:'08-102', fecha:man, turno:'PM', vendedor:'Maria Flores', cliente:'PAGADA CON FLETE',
         chofer:'Giordano', vehiculo:'Foton', acuenta:0, saldo:0, pagado:true,
         metodoPago:'QR BISA 3000 @'+hoy+' #102 %I2 + ^Efectivo 150 @'+hoy+' #102 %I3 · REGISTRADO',
         productos:[{desc:'SOFT ICE',medida:'140x190',codigo:'CH2',cant:2,precio:1500,chk:'no'}]}),
      P({id:'p3', nota:'103', oc:'ATC-08-003', fecha:man, turno:'AM', vendedor:'Isabel Robledo', cliente:'UNA ATC',
         acuenta:0, saldo:0, pagado:true, metodoPago:'Efectivo 300 @'+hoy+' #103',
         productos:[{desc:'REVISION',medida:'',cant:1}]}),
      P({id:'p4', nota:'104', oc:'RH-77', fecha:man, turno:'AM', vendedor:'ROHO', cliente:'CLIENTE ROHO',
         acuenta:0, saldo:0, pagado:true, metodoPago:'Efectivo 900 @'+hoy+' #104',
         productos:[{desc:'ESPUMA',medida:'50x70',cant:4}]}),
      P({id:'p5', nota:'105', oc:'08-105', fecha:'', turno:'', vendedor:'Carola Chavez', cliente:'VENTA DE TIENDA',
         zona:ZONA_TIENDA, direccion:DIR_TIENDA, maps:'', acuenta:0, saldo:0, pagado:true,
         metodoPago:'~QR Ganadero 1200 @'+hoy+' #105 %I4',
         productos:[{desc:'ALMOHADA',medida:'50x70',cant:2,precio:600}]}),
      P({id:'p6', nota:'106', oc:'08-106', fecha:man, turno:'AM', vendedor:'Eduardo Añez', cliente:'MAYORISTA SRL',
         acuenta:0, saldo:9000, pagado:false, metodoPago:'',
         productos:[{desc:'RESORTADO',medida:'160x190',codigo:'CH3',cant:9,precio:1000,enProd:true,prodEn:'MORENO'}]}),
      P({id:'p7', nota:'107', oc:'08-107', fecha:ayer, turno:'PM', vendedor:'Maria Flores', cliente:'ENTREGADA ATRASADA',
         chofer:'Luis Pierre', entregado:true, acuenta:0, saldo:0, pagado:true,
         metodoPago:'Efectivo 1800 @'+hoy+' #107 %I5', fotos:['F1','F2'],
         productos:[{desc:'SEMIORTOPEDICO',medida:'105x190',cant:1,precio:1800,chk:'ok'}]}),
      P({id:'p8', nota:'108', oc:'08-108', fecha:man, turno:'AM', vendedor:'Carola Chavez', cliente:'SIN UBICACION',
         maps:'', acuenta:0, saldo:0, pagado:false, metodoPago:'',
         productos:[{desc:'MEDIDA RARA',medida:'123x456',cant:1}]}),
      P({id:'p9', nota:'109', oc:'08-109', fecha:man, turno:'PM', vendedor:'Isabel Robledo', cliente:'COBRO DE MAS',
         chofer:'Giordano', acuenta:0, saldo:-300, pagado:true,
         metodoPago:'Efectivo 2300 @'+hoy+' #109 %I6',
         productos:[{desc:'TITANIO ICE',medida:'180x190',cant:1,precio:2000,chk:'im'}]}),
      P({id:'p10', nota:'110', oc:'08-110', fecha:man, turno:'AM', vendedor:'Carola Chavez', cliente:'DUPLICADA A',
         acuenta:0, saldo:700, pagado:false, metodoPago:'', productos:[{desc:'X',cant:1,precio:700}]}),
      P({id:'p11', nota:'110', oc:'08-111', fecha:man, turno:'AM', vendedor:'Carola Chavez', cliente:'DUPLICADA A',
         acuenta:0, saldo:700, pagado:false, metodoPago:'', productos:[{desc:'X',cant:1,precio:700}]})
    ];
    document.getElementById('admin-lock').style.display='none';
    document.getElementById('admin-content').style.display='block';
    document.getElementById('mis-vendedor').value='Carola Chavez';
    document.getElementById('cho-nombre').value='Luis Pierre';
  });
  await page.waitForTimeout(300);

  const sinError = (etiqueta) => { const n=errores.length; return { n, etiqueta }; };
  const revisar = (etiqueta, antes) => {
    const nuevos = errores.slice(antes);
    chk(etiqueta, nuevos.length===0, nuevos.length ? nuevos.slice(0,2).join(' | ') : '');
  };

  // ---------- las cinco vistas ----------
  for (const v of [['form','+ Nuevo pedido'],['mis','Mis pedidos'],['chofer','Chofer'],
                   ['conta','Contabilidad'],['admin','Administración']]) {
    const antes = errores.length;
    await page.evaluate((v)=>{ showView(v); }, v[0]);
    await page.waitForTimeout(250);
    const pinta = await page.evaluate((v)=>{
      var el=document.getElementById('view-'+v);
      return { activa:el.classList.contains('active'), largo:(el.textContent||'').length };
    }, v[0]);
    chk('la vista «'+v[1]+'» se dibuja', pinta.activa && pinta.largo>50, pinta.largo+' caracteres');
    revisar('  sin errores JS al abrirla', antes);
  }

  // ---------- Contabilidad: las tres sub-pestañas y los dos cortes ----------
  let antes = errores.length;
  await page.evaluate(async ()=>{
    showView('conta');
    for (const t of ['ventas','mayor','cuadre']) { segSet('cta-tab',t); setContaTab(t); await new Promise(r=>setTimeout(r,80)); }
    segSet('cta-tab','ventas'); setContaTab('ventas');
    for (const m of ['dia','mes','todo']) { segSet('cta-mode',m); setContaModo(m); await new Promise(r=>setTimeout(r,60)); }
    for (const b of ['ingreso','entrega']) { segSet('cta-base',b); setContaBase(); await new Promise(r=>setTimeout(r,60)); }
    segSet('cta-tab','cuadre'); setContaTab('cuadre');
    for (const m of ['dia','mes','todo']) { segSet('cua-mode',m); setCuadreModo(m); await new Promise(r=>setTimeout(r,60)); }
  });
  await page.waitForTimeout(200);
  revisar('Contabilidad: las 3 pestañas, los 3 períodos y los 2 cortes', antes);

  // ---------- las pantallas completas ----------
  const pantallas = [
    ['abrirCarga','closeCarga','📦 Lista de carga'],
    ['abrirRuta','closeRuta','🧾 Hoja de ruta'],
    ['abrirFaltantes','closeFaltantes','🏭 Faltantes'],
    ['abrirEntregas','closeEntregas','🚚 Entregado'],
    ['abrirRetiros','closeRetiros','💵 Retiros'],
    ['abrirProds','closeProds','🛏️ Productos más entregados'],
    ['abrirReporte','closeReporte','📊 Reporte'],
    ['abrirParte','closeParte','📋 Parte del día'],
  ];
  /* Cada pantalla se abre Y se pasea por sus filtros de día. Sin esto el test miraba
     "Hoy" —que con estos datos está casi vacío— y no ejercitaba nada: la Lista de carga
     daba 132 caracteres contra los 1.382 de la Hoja de ruta. Un test que no toca la
     pantalla llena no sirve para saber si la pantalla llena anda. */
  const FILTROS = { carga:'setCargaDia', ruta:'setRutaDia', faltantes:'setFaltDia' };
  for (const [abrir, cerrar, nombre] of pantallas) {
    const a = errores.length;
    const clave = abrir.replace('abrir','').toLowerCase();
    const r = await page.evaluate(async (args)=>{
      var abrir=args[0], cerrar=args[1], clave=args[2], setDia=args[3];
      if (typeof window[abrir]!=='function') return {existe:false};
      window[abrir]();
      await new Promise(r=>setTimeout(r,250));
      var cuerpo=function(){
        var o=document.getElementById(clave+'-overlay');
        return (o && o.style.display && o.style.display!=='none') ? (o.textContent||'') : '';
      };
      var largos=[cuerpo().length];
      // los que tienen Hoy / Mañana / Todos: se pasea por los tres
      if (setDia && typeof window[setDia]==='function'){
        for (const d of ['manana','todos','hoy']){
          window[setDia](d); await new Promise(r=>setTimeout(r,120));
          largos.push(cuerpo().length);
        }
      }
      if (typeof window[cerrar]==='function') window[cerrar]();
      return { existe:true, largos:largos, maximo:Math.max.apply(null,largos) };
    }, [abrir, cerrar, clave, FILTROS[clave]||null]);
    chk(nombre+' abre y muestra contenido de verdad', r.existe && r.maximo>200,
        r.existe?(r.largos.join(' → ')+' caracteres'):'la función no existe');
    revisar('  sin errores JS (incluidos sus filtros de día)', a);
  }

  // ---------- las fichas, una por cada forma de pedido ----------
  for (const [fn, nombre] of [['showPedidoModal','Administración'],['showMisModal','Mis pedidos'],
                              ['showCargaModal','Lista de carga'],['showContaModal','Contabilidad']]) {
    const a = errores.length;
    const r = await page.evaluate(async (fn)=>{
      var ids=['p1','p2','p3','p4','p5','p6','p7','p8','p9'], vacias=[];
      for (const id of ids){
        window[fn](id);
        await new Promise(r=>setTimeout(r,90));
        var t=(document.getElementById('modal-box').textContent||'').trim();
        if (t.length<40) vacias.push(id);
        closeModal();
        await new Promise(r=>setTimeout(r,40));
      }
      return { vacias:vacias };
    }, fn);
    chk('la ficha de «'+nombre+'» abre con los 9 tipos de pedido', r.vacias.length===0,
        r.vacias.length?('salieron vacías: '+r.vacias.join(', ')):'');
    revisar('  sin errores JS', a);
  }

  // ---------- los Excel ----------
  antes = errores.length;
  const bajados = await page.evaluate(async ()=>{
    window._bajados=[];
    showView('conta'); segSet('cta-tab','ventas'); setContaTab('ventas'); segSet('cta-mode','todo'); setContaModo('todo');
    exportConta();
    segSet('cta-tab','mayor'); setContaTab('mayor'); exportConta();
    segSet('cta-tab','cuadre'); setContaTab('cuadre'); segSet('cua-mode','todo'); setCuadreModo('todo'); exportCuadre();
    showView('admin'); exportExcel('todo');
    await new Promise(r=>setTimeout(r,300));
    return window._bajados;
  });
  chk('los cuatro Excel se generan', bajados.length===4, bajados.join(' | '));
  revisar('  sin errores JS al generarlos', antes);

  // ---------- los textos para WhatsApp ----------
  antes = errores.length;
  const textos = await page.evaluate(async ()=>{
    var out={};
    var copiado=''; var oc=window.copyText; window.copyText=function(t){ copiado=String(t||''); };
    ['copiarFaltantes','copiarParte','copiarProds','copiarRetiros','copiarEntregas','copiarCuadre'].forEach(function(fn){
      if(typeof window[fn]!=='function'){ out[fn]='(no existe)'; return; }
      copiado=''; try{ window[fn](); out[fn]=copiado.length; }catch(e){ out[fn]='ERROR: '+e.message; }
    });
    window.copyText=oc;
    return out;
  });
  const malos = Object.keys(textos).filter(k=>typeof textos[k]!=='number' || textos[k]<10);
  chk('los textos para copiar a WhatsApp se arman', malos.length===0,
      malos.length?malos.map(k=>k+'='+textos[k]).join(', '):JSON.stringify(textos));
  revisar('  sin errores JS al armarlos', antes);

  console.log('\nerrores JS en TODO el recorrido: '+errores.length);
  if(errores.length) errores.slice(0,5).forEach(e=>console.log('   ✗ '+e));
  chk('el panel entero se recorre sin un solo error', errores.length===0, errores.length+' errores');

  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
