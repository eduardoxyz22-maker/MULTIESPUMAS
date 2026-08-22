/* 🔒 Cerrar un día de entrega — el candado que se saltearon.
   Reporte real del 21/08: *"hace 40 min usé el botón cerrar día y sin embargo los
   vendedores lograron meter 2 pedidos más"*.

   Cerrar un día tiene DOS trancas y hay que entender la diferencia:
     1. **El panel** no deja elegir esa fecha… pero cada computadora tiene que ENTERARSE.
        Una pestaña abierta desde antes del cierre no se entera sola.
     2. **El servidor** (Apps Script) rechaza el pedido aunque el panel lo mande. Es la
        única que no se puede saltear — y solo existe si lo PUBLICADO en Google está al día.

   Y encima había un agujero propio del panel: cualquier rechazo del servidor que no fuera
   "día cerrado" o "cupos llenos" se ENCOLABA y mostraba **"Guardado ✓" en verde**. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1400,height:1000} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  const prep = () => page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; VENTA_TIENDA=false;
    try{ localStorage.removeItem(LS_PEND); }catch(e){}
    DIAS_CERRADOS=[]; saveCierresMirror();
    window._planilla=[]; window._cerradosEnServidor=[]; window._servidorViejo=false;
    /* El servidor de verdad: rechaza si el día está cerrado — SALVO que esté corriendo
       una versión vieja, que es el caso que hay que poder distinguir. */
    apiSave=function(rec){
      var g=JSON.parse(JSON.stringify(rec));
      if(String(g.id).indexOf('__')===0){        // fila del sistema (los días cerrados)
        window._cerradosEnServidor=String(g.observaciones||'').split(/\s+/).filter(Boolean);
        return Promise.resolve({ok:true, version:SCRIPT_VERSION_ESPERADA});
      }
      var yaEsta=window._planilla.some(function(p){ return p.id===g.id; });
      if(!yaEsta && g.fecha && !window._servidorViejo && window._cerradosEnServidor.indexOf(g.fecha)>=0)
        return Promise.resolve({ok:false, error:'dia_cerrado', fecha:g.fecha, version:SCRIPT_VERSION_ESPERADA});
      window._planilla.push(g);
      return Promise.resolve({ok:true, version:SCRIPT_VERSION_ESPERADA});
    };
    apiList=function(){
      SERVER_VER = window._servidorViejo ? '2026-07-01-a' : SCRIPT_VERSION_ESPERADA;
      var out=JSON.parse(JSON.stringify(window._planilla));
      if(window._cerradosEnServidor.length){
        out.push({ id:CIERRE_ID, fecha:'', observaciones:window._cerradosEnServidor.join(' '),
                   cliente:'cierres', productos:[], saldo:0, ts:1 });
      }
      return Promise.resolve({ok:true, pedidos:out, version:SERVER_VER});
    };
    SERVER_VER=SCRIPT_VERSION_ESPERADA;
    STATE=[];
    document.getElementById('admin-lock').style.display='none';
    document.getElementById('admin-content').style.display='block';
    showView('form');
    /* ⚠️ NO sirve `tomorrowStr()` a secas: si mañana cae DOMINGO el panel no agenda y el
       test se cae solo los sábados. Se busca el primer día entregable de acá en adelante.
       (Es la misma trampa de las fechas fijas, disfrazada de "mañana".) */
    var d=new Date(); var f;
    do { d.setDate(d.getDate()+1); f=isoLocal(d); } while(diaDomingo(f));
    return f;
  });

  const cargarPara = (cliente, fecha) => page.evaluate(async (a) => {
    var [cliente,fecha]=a;
    resetForm();
    document.getElementById('f-vendedor').value='Carola Chavez'; applyVendedorLite();
    document.getElementById('f-cliente').value=cliente;
    document.getElementById('f-celular').value='70000000';
    document.getElementById('f-zona').value='Norte';
    document.getElementById('f-direccion').value='Av. X';
    document.getElementById('f-nota').value='1';
    document.getElementById('f-fecha').value=fecha;
    var pd=document.querySelector('#f-productos .prod-desc'); if(pd) pd.value='SOFT ICE';
    var pm=document.querySelector('#f-productos .prod-medida'); if(pm) pm.value='140x190';
    var pc=document.querySelector('#f-productos .prod-cant'); if(pc) pc.value='1';
    var avisos=[]; var _t=toast; toast=function(m,k){ avisos.push((k||'ok')+': '+String(m||'')); };
    submitPedido();
    await new Promise(r=>setTimeout(r,5200));
    toast=_t;
    return { enPlanilla:window._planilla.some(function(p){ return p.cliente===cliente; }),
             enPantalla:STATE.some(function(p){ return p.cliente===cliente; }),
             enCola:getPending().length, avisos:avisos };
  }, [cliente,fecha]);

  const MAN = await prep();

  // ---------- 1. con el día abierto entra normal ----------
  let r = await cargarPara('ANTES DE CERRAR', MAN);
  chk('con el día abierto el pedido entra', r.enPlanilla===true, r.avisos.join(' | '));

  // ---------- 2. se cierra el día ----------
  r = await page.evaluate(async (man)=>{
    cerrarDia(man);
    await new Promise(x=>setTimeout(x,300));
    return { local:diaCerrado(man), enServidor:window._cerradosEnServidor };
  }, MAN);
  chk('al cerrar, el día queda cerrado y se avisa al servidor',
      r.local===true && r.enServidor.includes(MAN), r.enServidor.join(', '));

  // ---------- 3. desde ESTA computadora ya no deja ----------
  r = await cargarPara('DESPUES DE CERRAR', MAN);
  chk('en la computadora que cerró, el panel no lo deja cargar', r.enPlanilla===false,
      r.avisos.join(' | ').slice(0,90));

  // ---------- 4. EL CASO DEL REPORTE: la pestaña abierta desde antes ----------
  /* Esta computadora NO se enteró del cierre: su DIAS_CERRADOS está vacío, igual que una
     vendedora con el panel abierto desde la mañana. El panel la deja pasar… y el SERVIDOR
     tiene que frenarla. Esa es la tranca que no se puede saltear. */
  r = await page.evaluate(()=>{
    DIAS_CERRADOS=[]; saveCierresMirror();
    /* Y además se deja CIEGA la mirada previa a la planilla: en la vida real eso pasa
       cuando la hoja tarda más de 4 segundos en contestar (con un mes de datos encima es
       de lo más común) — el panel entonces guarda igual para no trabar a la vendedora.
       Ahí es donde la ÚNICA defensa que queda es el servidor. */
    window._listOriginal=apiList;
    apiList=function(){ return new Promise(function(){}); };   // no contesta nunca
    return DIAS_CERRADOS.length;
  });
  chk('(se simula una compu que NO se enteró, y la planilla que no contesta)', r===0, '');

  r = await cargarPara('PESTAÑA VIEJA', MAN);
  chk('🔒 el SERVIDOR frena el pedido aunque el panel lo mande', r.enPlanilla===false,
      r.avisos.join(' | ').slice(0,100));
  chk('  y le dice a la vendedora que el día está CERRADO (no "guardado")',
      /CERRAD[OA]|se acaba de CERRAR/.test(r.avisos.join(' ')) && !/ok: .*[Gg]uardado/.test(r.avisos.join(' ')),
      r.avisos.join(' | ').slice(0,110));
  chk('  NO queda como pedido fantasma en su pantalla', r.enPantalla===false, '');
  chk('  NI encolado para reintentar por siempre', r.enCola===0, 'cola='+r.enCola);
  r = await page.evaluate((man)=>diaCerrado(man), MAN);
  chk('  y esa compu APRENDE que el día está cerrado', r===true, '');

  // ---------- 5. un rechazo cualquiera del servidor NO se disfraza de "guardado" ----------
  /* Este era el agujero: todo lo que no fuera "día cerrado" o "cupos llenos" se encolaba
     con un cartel VERDE de "Guardado ✓". El servidor decía NO y la vendedora creía que sí. */
  r = await page.evaluate(async ()=>{
    DIAS_CERRADOS=[]; saveCierresMirror();
    window._cerradosEnServidor=[];                 // acá el día no es el problema
    apiList=window._listOriginal;                  // la planilla vuelve a contestar
    apiSave=function(){ return Promise.resolve({ok:false, error:'busy'}); };   // servidor ocupado
    return getPending().length;
  });
  r = await cargarPara('SERVIDOR OCUPADO', MAN);
  chk('si el servidor está OCUPADO, se lo dice — no le miente con "Guardado ✓"',
      /err:/.test(r.avisos.join(' ')) && !/ok: .*[Gg]uardado/.test(r.avisos.join(' ')),
      r.avisos.join(' | ').slice(0,110));
  chk('  y no lo deja como fantasma ni en pantalla ni en la cola',
      r.enPantalla===false && r.enCola===0, 'pantalla='+r.enPantalla+' cola='+r.enCola);

  // ---------- 6. el botón dice si el candado está DE VERDAD ----------
  r = await page.evaluate(async ()=>{
    SERVER_VER=SCRIPT_VERSION_ESPERADA;
    abrirCierreDias(); await new Promise(x=>setTimeout(x,200));
    var bien=document.getElementById('modal-box').textContent;
    closeModal();
    SERVER_VER='2026-07-01-a';                       // lo publicado quedó viejo
    abrirCierreDias(); await new Promise(x=>setTimeout(x,200));
    var mal=document.getElementById('modal-box').textContent;
    closeModal();
    SERVER_VER='';                                   // todavía no se sabe…
    apiList=function(){ return new Promise(function(){}); };   // …y el servidor no contesta
    abrirCierreDias(); await new Promise(x=>setTimeout(x,200));
    var nose=document.getElementById('modal-box').textContent;
    closeModal();
    apiList=window._listOriginal;
    SERVER_VER=SCRIPT_VERSION_ESPERADA;
    return { bien:bien, mal:mal, nose:nose };
  });
  chk('el botón confirma cuando el candado SÍ está en el servidor',
      /candado está en el servidor/.test(r.bien) && /No se puede saltear/.test(r.bien), '');
  chk('  y AVISA FUERTE cuando está solo en los navegadores',
      /SOLO en los navegadores/.test(r.mal) && /Nueva versión/.test(r.mal), '');
  chk('  y dice que no sabe cuando todavía no preguntó', /Todavía no sé/.test(r.nose), '');

  chk('sin errores JS', errors.length===0, errors.slice(0,2).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
