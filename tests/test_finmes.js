/* 📅 EL FILTRO POR MES ESCONDE LAS ENTREGAS DEL MES QUE VIENE.
   Lo destapó el calendario, no una idea: el 31 de agosto la batería empezó a fallar sola.
   `test_resumen` sembraba pedidos "para mañana" y de golpe medía CERO — porque mañana ya
   era septiembre y el filtro «Mes» corta por fecha de ENTREGA.

   O sea que en los últimos días de cada mes, todo lo que se entrega el mes siguiente
   —justo lo que se está preparando— desaparecía de la tabla. La Lista de carga y el Excel
   lo seguían viendo, pero la TABLA es donde se asigna chofer y se tilda verificado.

   El arreglo tiene dos partes y las dos se prueban acá:
     1. El filtro de fábrica volvió a «Todo» (§4bo), así que de entrada no se esconde nada.
     2. Cuando alguien ELIGE «Mes» —que lo hace, y es legítimo— aparece un aviso ámbar con
        cuántas entregas quedan afuera y un botón para saltar a ese mes.
   ⚠️ El aviso mira solo hacia ADELANTE: esconder lo viejo es para lo que sirve el filtro. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1400,height:900} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  /* Se arma el fin de mes A MANO en vez de depender de qué día se corra el test:
     3 entregas en el mes en curso, 4 en el que viene, 1 vieja del mes pasado. */
  const prep = () => page.evaluate(async () => {
    document.getElementById('conn-form').style.display='none';
    CONNECTED=true; UNLOCKED=true;
    document.getElementById('admin-lock').style.display='none';
    document.getElementById('admin-content').style.display='block';
    mostrarBotonesTodos();
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
    var hoy=new Date(), mes=isoLocal(hoy).slice(0,7);
    var mas=function(d){ var x=new Date(hoy.getTime()); x.setDate(x.getDate()+d); return isoLocal(x); };
    var menos=function(d){ var x=new Date(hoy.getTime()); x.setDate(x.getDate()-d); return isoLocal(x); };
    var mk=function(id,f){ return { id:id, cliente:'CLI '+id, nota:id, vendedor:'Maria Flores',
      fecha:f, ts:Date.now(), saldo:0, acuenta:0, pagado:true, cobradoBs:0, metodoPago:'Efectivo',
      entregado:false, verificado:false, oc:'08-'+id, observaciones:'', garantia:'', facturarA:'',
      nit:'', estado:'', vehiculo:'', chofer:'', turno:'AM', celular:'7', zona:'N',
      direccion:'Av', maps:'', nroDia:1, productos:[{desc:'X',medida:'1x1',codigo:'A',cant:1}] }; };
    /* Se buscan fechas que caigan seguro en el mes de al lado y en el de atrás. */
    var futuro=[], d=1;
    while(futuro.length<4 && d<70){ var f=mas(d); if(f.slice(0,7)>mes) futuro.push(f); d++; }
    var pasado=null; d=1;
    while(!pasado && d<70){ var g=menos(d); if(g.slice(0,7)<mes) pasado=g; d++; }
    var hoyStr=isoLocal(hoy);
    STATE=[mk('h1',hoyStr), mk('h2',hoyStr), mk('h3',hoyStr)]
      .concat(futuro.map(function(f,i){ return mk('f'+i,f); }))
      .concat(pasado?[mk('v1',pasado)]:[]);
    saveMirror();
    showView('admin'); renderAdmin();
    await new Promise(r=>setTimeout(r,200));
    return { mes:mes, futuro:futuro, pasado:pasado, mesQueViene:futuro[0].slice(0,7) };
  });

  const foto = () => page.evaluate(() => {
    /* Tolera que la versión vieja no tenga el aviso: así el test REPRUEBA con checks en
       rojo en vez de reventar, y quien lo corra ve QUÉ falta. */
    var el=document.getElementById('adm-fuera') || {textContent:'NO EXISTE #adm-fuera', className:'', querySelectorAll:function(){return [];}};
    return { txt:(el.textContent||'').replace(/\s+/g,' ').trim(), clase:el.className,
             botones:[].slice.call(el.querySelectorAll('button')).map(b=>b.textContent.trim()),
             filas:document.querySelectorAll('#tbl-pedidos tbody tr').length,
             modo:segVal('adm-mode') };
  });
  const aMes = () => page.evaluate(async () => {
    segSet('adm-mode','mes');
    document.getElementById('wrap-dia').style.display='none';
    document.getElementById('wrap-mes').style.display='block';
    document.getElementById('adm-mes').value=isoLocal(new Date()).slice(0,7);
    admTopeReset(); renderAdmin();
    await new Promise(r=>setTimeout(r,150));
  });

  const info = await prep();

  // ============ 1. de fábrica no se esconde nada ============
  let f = await foto();
  chk('el panel abre en «Todo», así que las entregas del mes que viene SE VEN',
      f.modo==='todo' && f.filas===8, f.modo+' · '+f.filas+' filas');
  chk('…y por lo tanto no hace falta ningún aviso', f.txt==='', f.txt.slice(0,70));

  // ============ 2. eligiendo «Mes» aparece el aviso ============
  await aMes();
  f = await foto();
  chk('con «Mes» la tabla muestra solo las 3 de este mes', f.filas===3, f.filas);
  chk('⚠️ …y AVISA que hay 4 entregas afuera (si no, se preparan a ciegas)',
      /Hay 4 pedidos con entrega fuera de este mes/.test(f.txt), f.txt.slice(0,90));
  chk('…con la pinta de alerta, no de texto suelto', f.clase==='revisar', f.clase);
  chk('…y un botón que lleva a ese mes', f.botones.some(b=>/^ver /.test(b)), JSON.stringify(f.botones));

  // ============ 3. ⚠️ NO cuenta lo viejo: para eso sirve filtrar por mes ============
  chk('⚠️ la entrega del mes PASADO no se cuenta como escondida (ya se entregó)',
      !/Hay 5/.test(f.txt) && /Hay 4/.test(f.txt), f.txt.slice(0,60));

  // ============ 4. el botón lleva de verdad ============
  const tras = await page.evaluate(async () => {
    var b=document.querySelector('#adm-fuera button');
    if(!b) return { mes:'no hay aviso ni botón', filas:-1, txt:'' };
    b.click();
    await new Promise(r=>setTimeout(r,200));
    return { mes:document.getElementById('adm-mes').value,
             filas:document.querySelectorAll('#tbl-pedidos tbody tr').length,
             txt:(document.getElementById('adm-fuera').textContent||'').replace(/\s+/g,' ').trim() };
  });
  chk('el botón salta al mes que viene', tras.mes===info.mesQueViene, tras.mes+' (esperado '+info.mesQueViene+')');
  chk('…y ahí sí se ven las 4 entregas', tras.filas===4, tras.filas);
  /* Parado en septiembre, las 3 entregas de HOY pasan a ser las escondidas: el aviso
     funciona para los dos lados, no solo "hacia adelante desde el mes en curso". */
  chk('…y desde septiembre avisa al revés: las 3 de hoy quedaron afuera',
      /Hay 3 pedidos con entrega fuera de este mes/.test(tras.txt), tras.txt.slice(0,80));

  // ============ 5. en «Todo» y en «Día» el aviso no se entromete ============
  const enTodo = await page.evaluate(async () => {
    segSet('adm-mode','todo');
    document.getElementById('wrap-mes').style.display='none';
    admTopeReset(); renderAdmin();
    await new Promise(r=>setTimeout(r,150));
    var e=document.getElementById('adm-fuera');
    return e ? (e.textContent||'').trim() : 'NO EXISTE #adm-fuera';
  });
  chk('en «Todo» no aparece (no hay nada escondido que avisar)', enTodo==='', enTodo.slice(0,60));

  const enDia = await page.evaluate(async () => {
    segSet('adm-mode','dia');
    document.getElementById('wrap-dia').style.display='block';
    document.getElementById('adm-dia').value=isoLocal(new Date());
    admTopeReset(); renderAdmin();
    await new Promise(r=>setTimeout(r,150));
    var e=document.getElementById('adm-fuera');
    return e ? (e.textContent||'').trim() : 'NO EXISTE #adm-fuera';
  });
  chk('en «Día» tampoco: ahí el día lo eligió una persona a propósito', enDia==='', enDia.slice(0,60));

  // ============ 6. ⚠️ plegar el resumen NO puede tapar el aviso ============
  await aMes();
  const plegado = await page.evaluate(async () => {
    if(resumenAdmVisible()) toggleResumenAdm();
    await new Promise(r=>setTimeout(r,150));
    var e=document.getElementById('adm-fuera');
    if(!e){ if(!resumenAdmVisible()) toggleResumenAdm(); return { vis:false, txt:'NO EXISTE #adm-fuera' }; }
    var vis=true;
    for(var n=e; n && n!==document.body; n=n.parentElement){
      if(n.style && n.style.display==='none'){ vis=false; break; } }
    var txt=(e.textContent||'').replace(/\s+/g,' ').trim();
    if(!resumenAdmVisible()) toggleResumenAdm();
    return { vis:vis, txt:txt };
  });
  chk('⚠️ con el resumen plegado el aviso SIGUE a la vista (es alerta, no consolidado)',
      plegado.vis===true && /entrega fuera de este mes/.test(plegado.txt),
      plegado.vis+' · '+plegado.txt.slice(0,60));

  // ============ 7. singular bien escrito ============
  const uno = await page.evaluate(async () => {
    var hoy=new Date(), mas=function(d){ var x=new Date(hoy.getTime()); x.setDate(x.getDate()+d); return isoLocal(x); };
    var mes=isoLocal(hoy).slice(0,7), f=null, d=1;
    while(!f && d<70){ var c=mas(d); if(c.slice(0,7)>mes) f=c; d++; }
    STATE=STATE.filter(function(p){ return (p.fecha||'').slice(0,7)<=mes; })
               .concat([{ id:'u1', cliente:'UNO', nota:'u1', vendedor:'Maria Flores', fecha:f,
      ts:Date.now(), saldo:0, acuenta:0, pagado:true, cobradoBs:0, metodoPago:'Efectivo',
      entregado:false, verificado:false, oc:'08-u1', observaciones:'', garantia:'', facturarA:'',
      nit:'', estado:'', vehiculo:'', chofer:'', turno:'AM', celular:'7', zona:'N',
      direccion:'Av', maps:'', nroDia:1, productos:[{desc:'X',medida:'1x1',codigo:'A',cant:1}] }]);
    saveMirror();
    document.getElementById('adm-mes').value=mes;
    admTopeReset(); renderAdmin();
    await new Promise(r=>setTimeout(r,150));
    var e2=document.getElementById('adm-fuera');
    return e2 ? (e2.textContent||'').replace(/\s+/g,' ').trim() : 'NO EXISTE #adm-fuera';
  });
  chk('con una sola dice «1 pedido … que no se ve», bien escrito',
      /Hay 1 pedido con/.test(uno) && /que no se ve en/.test(uno), uno.slice(0,80));

  chk('sin errores JS', errors.length===0, errors.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
