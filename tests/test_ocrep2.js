/* 🔢 LAS OC REPETIDAS NO PUEDEN GRITAR PARA SIEMPRE.
   El dueño, con captura del panel en septiembre: *"ESTO SIGUE SALIENDO, por más que ponga
   mes en curso… en teoría en septiembre no deberían haber duplicados"*. Y el aviso listaba
   veinticinco números, todos `08-xxx`.

   Dos fallas encadenadas:
     1. `ocsRepetidas()` miraba TODA la planilla sin importar el filtro, así que en
        septiembre seguía gritando los repetidos de AGOSTO.
     2. Escupía los 25 números en una sola línea, todos los días. Eso es fatiga de alarma:
        el aviso rojo permanente se deja de leer, y el día que aparezca uno NUEVO va a pasar
        desapercibido — que es justo lo que el aviso venía a evitar.

   ⚠️ LO QUE ESTE TEST CUIDA POR ENCIMA DE TODO: que acotar al período NO sea esconder. Los
   repetidos de otros meses se siguen contando y se ofrece ir a verlos. Es la misma lección
   de §4bo, donde filtrar por mes escondió las entregas de septiembre sin avisar. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1500,height:1000} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  /* El escenario real: agosto sucio (12 OC repetidas), septiembre limpio. Los meses se
     arman relativos a HOY para que el test no caduque cuando pase el año. */
  const prep = (repSept) => page.evaluate(async (repSept) => {
    document.getElementById('conn-form').style.display='none';
    CONNECTED=true; UNLOCKED=true;
    document.getElementById('admin-lock').style.display='none';
    document.getElementById('admin-content').style.display='block';
    mostrarBotonesTodos();
    apiSave=function(){ return Promise.resolve({ok:true}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
    var hoy=new Date();
    var esteMes=isoLocal(hoy).slice(0,7);
    var ant=new Date(hoy.getFullYear(), hoy.getMonth()-1, 15);
    var mesAnt=isoLocal(ant).slice(0,7);
    var mk=function(id, oc, iso){
      var t=new Date(iso+'T10:00:00');
      return { id:id, cliente:'CLI '+id, nota:id, vendedor:'Maria Flores', fecha:iso, ts:t.getTime(),
        oc:oc, saldo:0, acuenta:0, pagado:true, cobradoBs:0, metodoPago:'', entregado:false,
        verificado:false, observaciones:'', garantia:'', facturarA:'', nit:'', estado:'',
        vehiculo:'', chofer:'', turno:'AM', celular:'7', zona:'N', direccion:'Av', maps:'',
        nroDia:1, productos:[{desc:'X',medida:'1x1',codigo:'A',cant:1}] };
    };
    var mm=function(m){ return m.slice(5,7); };
    STATE=[];
    /* Mes pasado: 12 números repetidos (dos pedidos cada uno). */
    for(var i=1;i<=12;i++){
      var oc=mm(mesAnt)+'-'+('00'+i).slice(-3), f=mesAnt+'-1'+(i%9);
      STATE.push(mk('a'+i, oc, f));
      STATE.push(mk('b'+i, oc, f));
    }
    /* Este mes: números limpios… salvo que el test pida uno repetido. */
    for(var j=1;j<=6;j++) STATE.push(mk('s'+j, mm(esteMes)+'-'+('00'+j).slice(-3), esteMes+'-0'+j));
    if(repSept) STATE.push(mk('sdup', mm(esteMes)+'-001', esteMes+'-01'));
    saveMirror();
    if(typeof OCREP_OPEN!=='undefined') OCREP_OPEN=false;
    showView('admin');
    await new Promise(r=>setTimeout(r,250));
    return { esteMes:esteMes, mesAnt:mesAnt };
  }, repSept);

  /* Pone el filtro del panel en un período concreto. */
  const filtro = (modo, val) => page.evaluate(async (a) => {
    var [modo,val]=a;
    segSet('adm-mode', modo);
    document.getElementById('wrap-dia').style.display=(modo==='dia')?'block':'none';
    document.getElementById('wrap-mes').style.display=(modo==='mes')?'block':'none';
    if(modo==='mes' && val) document.getElementById('adm-mes').value=val;
    if(modo==='dia' && val) document.getElementById('adm-dia').value=val;
    if(typeof admTopeReset==='function') admTopeReset();
    renderAdmin();
    await new Promise(r=>setTimeout(r,180));
    var el=document.getElementById('adm-revisar');
    return { txt:(el.textContent||'').replace(/\s+/g,' ').trim(),
             html:(el.innerHTML||'') };
  }, [modo,val]);

  const M = await prep(false);

  // ============ 1. ⚠️ EL RECLAMO: el mes en curso está limpio ============
  let f = await filtro('mes', M.esteMes);
  chk('⚠️ mirando el mes en curso NO grita los repetidos del mes pasado',
      !/N° de OC repetidos?:/.test(f.txt), f.txt.slice(0,140));
  chk('⚠️ …y NO lista los números viejos', !/-001,/.test(f.txt), f.txt.slice(0,120));

  // ============ 2. …pero tampoco los esconde: los cuenta y ofrece ir ============
  chk('⚠️ igual avisa que hay 12 repetidos en otros meses (acotar no es esconder)',
      /Además hay 12 N° repetidos de otros meses/.test(f.txt), f.txt.slice(0,160));
  chk('…con un botón que lleva a ese mes',
      /admIrAlMes/.test(f.html) && /ver \w+ de \d{4} \(12\)/.test(f.txt), f.txt.slice(0,180));

  // ============ 3. mirando el mes sucio, sí los muestra ============
  f = await filtro('mes', M.mesAnt);
  chk('mirando el mes pasado SÍ avisa, con el número',
      /12 N° de OC repetidos/.test(f.txt), f.txt.slice(0,120));
  chk('⚠️ …pero NO vomita los 12 en una línea: muestra 8 y pliega el resto',
      /y 4 más/.test(f.txt), f.txt.slice(0,200));
  chk('…y ya no hay nada "de otros meses" que avisar',
      !/Además hay/.test(f.txt), f.txt.slice(0,160));

  const abierto = await page.evaluate(async () => {
    toggleOcRep();
    await new Promise(r=>setTimeout(r,150));
    return (document.getElementById('adm-revisar').textContent||'').replace(/\s+/g,' ');
  });
  chk('«y 4 más» los despliega', /ocultar/.test(abierto) && !/y 4 más/.test(abierto), abierto.slice(0,180));
  await page.evaluate(() => toggleOcRep());

  // ============ 4. ⚠️ un repetido NUEVO del mes en curso SÍ se ve ============
  /* Es la razón de ser del aviso. Si acotar al período lo tapara, el arreglo sería peor
     que el problema. */
  await prep(true);
  f = await filtro('mes', M.esteMes);
  chk('⚠️ un repetido NUEVO de este mes se ve fuerte y con su número',
      /1 N° de OC repetido:/.test(f.txt), f.txt.slice(0,140));
  chk('…y los viejos siguen contados aparte, sin taparlo',
      /Además hay 12/.test(f.txt), f.txt.slice(0,190));

  // ============ 5. con «Todo» se ven todos, que es lo que «Todo» significa ============
  f = await filtro('todo', '');
  chk('con «Todo» aparecen los 13', /13 N° de OC repetidos/.test(f.txt), f.txt.slice(0,120));
  chk('…y no dice "de otros meses", porque no quedó ninguno afuera',
      !/Además hay/.test(f.txt), f.txt.slice(0,150));

  // ============ 6. ⚠️ una ATC NO cuenta como repetida de su venta ============
  /* `ATC 09-001` y `09-001` son dos series distintas. Si se comparara el número pelado,
     CADA ATC saldría como duplicado de la venta del mismo número — cientos de falsos
     positivos, y el aviso quedaría inservible. */
  const conAtc = await page.evaluate(async (esteMes) => {
    var mm=esteMes.slice(5,7);
    var t=new Date(esteMes+'-05T10:00:00');
    STATE=STATE.filter(function(p){ return p.id!=='sdup'; });
    STATE.push({ id:'atc1', cliente:'ATC CLI', nota:'x', vendedor:'Maria Flores',
      fecha:esteMes+'-05', ts:t.getTime(), oc:'ATC '+mm+'-001', saldo:0, acuenta:0, pagado:true,
      cobradoBs:0, metodoPago:'', entregado:false, verificado:false, observaciones:'', garantia:'',
      facturarA:'', nit:'', estado:'', vehiculo:'', chofer:'', turno:'AM', celular:'7', zona:'N',
      direccion:'Av', maps:'', nroDia:1, productos:[{desc:'X',medida:'1x1',codigo:'A',cant:1}] });
    saveMirror(); renderAdmin();
    await new Promise(r=>setTimeout(r,180));
    return { rep:ocsRepetidas(), txt:(document.getElementById('adm-revisar').textContent||'').replace(/\s+/g,' ') };
  }, M.esteMes);
  chk('⚠️ «ATC 09-001» no se cuenta como repetida de la venta «09-001»',
      !conAtc.rep.some(function(o){ return /^ATC/.test(o); }), JSON.stringify(conAtc.rep.slice(0,5)));

  // ============ 7. sin ningún repetido, el aviso no aparece ============
  const limpio = await page.evaluate(async () => {
    STATE=STATE.filter(function(p){ return /^[ab]/.test(p.id)===false; });   // fuera el mes sucio
    STATE=STATE.filter(function(p){ return p.id!=='atc1'; });
    saveMirror(); renderAdmin();
    await new Promise(r=>setTimeout(r,180));
    var el=document.getElementById('adm-revisar');
    return { txt:(el.textContent||'').replace(/\s+/g,' ').trim(), clase:el.className };
  });
  chk('sin repetidos NO queda ningún aviso de OC', !/N° de OC/.test(limpio.txt) && !/Además hay/.test(limpio.txt),
      limpio.txt.slice(0,100)||'(vacío)');

  chk('sin errores JS', errors.length===0, errors.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
