/* 🔎 «REVISAR ANTES DE CERRAR» — los controles que apoyan a contabilidad.
   El dueño pidió opciones para reforzar ese panel y eligió todas. Lo que se prueba acá no
   es solo que cada aviso APAREZCA: también que NO grite en falso, que es lo que mata a un
   aviso (el de duplicados venía con 11 falsos de 19 y ya nadie lo miraba).

   Cada bloque arma el caso de verdad Y el que se le parece pero no lo es. */
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

  /* Carga una planilla a medida y devuelve los avisos que salen, ya en texto. */
  const avisos = (ventas) => page.evaluate(async (ventas) => {
    var el=document.getElementById('conn-form'); if(el) el.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    apiSave=function(){ return Promise.resolve({ok:true}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:[]}); };
    STATE=ventas.map(function(v){
      return { id:v.id, cliente:v.cliente, nota:v.nota==null?'':String(v.nota),
        vendedor:v.vendedor||'Isabel Robledo', fecha:v.fecha,
        ts:new Date(v.fecha+'T10:00:00').getTime(),
        saldo:v.saldo||0, acuenta:v.acuenta||0, pagado:!!v.pagado, cobradoBs:0,
        metodoPago:v.metodoPago||'', entregado:!!v.entregado, verificado:false,
        oc:'', observaciones:v.obs||'', garantia:'', facturarA:'', nit:'',
        estado:'', vehiculo:'', chofer:'', turno:'AM', celular:'7', zona:'N',
        direccion:'Av', maps:'', nroDia:1,
        productos:v.productos||[{desc:'X', medida:'', codigo:'', cant:1}] };
    });
    saveMirror();
    /* El cuadre en modo TODO, sin filtrar por vendedora. */
    segSet('cua-mode','todo');
    var sv=document.getElementById('cua-vendedor'); if(sv) sv.value='';
    await new Promise(r=>setTimeout(r,50));
    return cuadreAlertas(cuadrePagos()).map(function(a){
      return { ico:a.ico, k:a.k, sev:a.sev, txt:a.txt.replace(/<[^>]+>/g,''),
               det:(a.det||[]).map(function(d){ return d.txt; }),
               /* Desde §4bk los números del talonario viven en el globito, no en el texto. */
               tips:(a.det||[]).map(function(d){ return d.tip||''; }) };
    });
  }, ventas);
  const hay = (A, ico) => A.filter(a=>a.ico===ico)[0] || null;

  const pago = (metodo,monto,fecha,nota,comps) =>
    ({metodo:metodo, monto:monto, fecha:fecha, nota:nota, comps:comps||[]});
  const ledger = (arr) => page.evaluate(a=>textoCobros(a), arr);

  // ============================================================================
  // A) DUPLICADOS — el caso real, y los falsos que antes lo tapaban
  // ============================================================================
  let A = await avisos([
    {id:'d1', cliente:'ALZER',    nota:'0',   fecha:'2026-08-05', saldo:0},
    {id:'d2', cliente:'OTRO',     nota:'0',   fecha:'2026-08-06', saldo:0},
    {id:'d3', cliente:'TERCERO',  nota:'S/N', fecha:'2026-08-07', saldo:500},
    {id:'d4', cliente:'CUARTO',   nota:'S/N', fecha:'2026-08-08', saldo:700},
    {id:'d5', cliente:'MEDICION', nota:'MEDICION', fecha:'2026-08-09', saldo:300},
    {id:'d6', cliente:'JUAN PEREZ', nota:'900', fecha:'2026-08-11', saldo:1690},
    {id:'d7', cliente:'JUAN PEREZ', nota:'901', fecha:'2026-08-11', saldo:1690},
    {id:'d8', cliente:'ANA LOPEZ',  nota:'910', fecha:'2026-08-12', saldo:2500},
    {id:'d9', cliente:'ANA LOPEZ',  nota:'911', fecha:'2026-08-13', saldo:2500},
    {id:'da', cliente:'REPETIDA',   nota:'777', fecha:'2026-08-14', saldo:100},
    {id:'db', cliente:'REPETIDA 2', nota:'777', fecha:'2026-08-20', saldo:100}
  ]);
  let dup = hay(A,'👯');
  chk('el aviso de duplicadas existe', !!dup, dup && dup.txt);
  chk('la nota "0" ya NO junta ventas que no tienen nada que ver',
      !!dup && !dup.det.some(t=>/ALZER|OTRO/.test(t)), dup && JSON.stringify(dup.det));
  chk('la nota "S/N" tampoco', !!dup && !dup.det.some(t=>/TERCERO|CUARTO/.test(t)),
      dup && JSON.stringify(dup.det));
  chk('ni una nota que es texto suelto', !!dup && !dup.det.some(t=>/MEDICION/.test(t)));
  chk('el mismo cliente y monto el MISMO día sigue saltando',
      !!dup && dup.det.some(t=>/JUAN PEREZ/.test(t)), dup && JSON.stringify(dup.det));
  chk('💡 y ahora también en días DISTINTOS (era lo que se escapaba)',
      !!dup && dup.det.some(t=>/ANA LOPEZ/.test(t)), dup && JSON.stringify(dup.det));
  chk('…diciendo los dos días, para poder compararlos',
      !!dup && dup.det.some(t=>/ANA LOPEZ/.test(t) && /12\/08/.test(t) && /13\/08/.test(t)),
      dup && JSON.stringify(dup.det.filter(t=>/ANA/.test(t))));
  chk('una nota de talonario repetida de verdad SÍ salta, aunque sea otra semana',
      !!dup && dup.det.some(t=>/misma nota 777/.test(t)), dup && JSON.stringify(dup.det));
  chk('el aviso quedó limpio: 3 grupos, no 6', !!dup && dup.det.length===3,
      dup && dup.det.length+' → '+JSON.stringify(dup.det));

  // ============================================================================
  // B) EL MISMO COMPROBANTE EN DOS VENTAS
  // ============================================================================
  const L1 = await ledger([pago('QR',1000,'2026-08-05','100',['FOTO_A'])]);
  const L2 = await ledger([pago('QR',1000,'2026-08-06','101',['FOTO_A'])]);
  const L3 = await ledger([pago('QR', 500,'2026-08-07','102',['FOTO_B'])]);
  // misma imagen DOS VECES pero dentro de la MISMA venta: eso no es un problema
  const L4 = await ledger([pago('QR',300,'2026-08-08','103',['FOTO_C']),
                           pago('Efectivo',200,'2026-08-09','104',['FOTO_C'])]);
  A = await avisos([
    {id:'c1', cliente:'UNO',  nota:'100', fecha:'2026-08-05', metodoPago:L1, pagado:true},
    {id:'c2', cliente:'DOS',  nota:'101', fecha:'2026-08-06', metodoPago:L2, pagado:true},
    {id:'c3', cliente:'TRES', nota:'102', fecha:'2026-08-07', metodoPago:L3, pagado:true},
    {id:'c4', cliente:'CUATRO', nota:'103', fecha:'2026-08-08', metodoPago:L4, pagado:true}
  ]);
  let rep = hay(A,'🖼️');
  chk('salta cuando la MISMA imagen respalda dos ventas', !!rep, rep && rep.txt);
  chk('…nombrando a las dos', !!rep && rep.det.some(t=>/UNO/.test(t) && /DOS/.test(t)),
      rep && JSON.stringify(rep.det));
  chk('la misma imagen repetida DENTRO de una venta no es problema',
      !!rep && !rep.det.some(t=>/CUATRO/.test(t)), rep && JSON.stringify(rep.det));
  chk('…y una imagen usada una sola vez no molesta',
      !!rep && !rep.det.some(t=>/TRES/.test(t)), rep && JSON.stringify(rep.det));
  chk('es UN solo grupo', !!rep && rep.det.length===1, rep && rep.det.length);

  // ============================================================================
  // C) ENTREGADO Y SIN COBRAR
  // ============================================================================
  A = await avisos([
    {id:'e1', cliente:'ENTREGADO DEBE', nota:'200', fecha:'2026-08-05', saldo:1500, entregado:true},
    {id:'e2', cliente:'NO SALIO AUN',   nota:'201', fecha:'2026-08-05', saldo:900,  entregado:false},
    {id:'e3', cliente:'ENTREGADO OK',   nota:'202', fecha:'2026-08-05', saldo:0, pagado:true,
      metodoPago: await ledger([pago('Efectivo',800,'2026-08-05','202',['F1'])]), entregado:true}
  ]);
  let ent = hay(A,'🚚') && hay(A,'🚚').txt.indexOf('sin cobrar')>=0 ? hay(A,'🚚') : null;
  chk('salta la venta ya entregada que sigue debiendo', !!ent, ent && ent.txt);
  chk('…con el monto que está en la calle', !!ent && /1\.500,00/.test(ent.txt), ent && ent.txt);
  chk('la que todavía NO salió del depósito no entra ahí',
      !!ent && !ent.det.some(t=>/NO SALIO/.test(t)), ent && JSON.stringify(ent.det));
  chk('…ni la entregada y cobrada', !!ent && !ent.det.some(t=>/ENTREGADO OK/.test(t)));

  // ============================================================================
  // D) LOS PRECIOS NO DAN EL TOTAL  ·  G) FECHAS IMPOSIBLES
  // ============================================================================
  A = await avisos([
    // productos 2×900=1800, pero la venta dice 1000 → descuadra
    {id:'p1', cliente:'DESCUADRA', nota:'300', fecha:'2026-08-05', saldo:1000,
      productos:[{desc:'X', cant:2, precio:900}]},
    // productos 1×1000, venta 1000 → cuadra
    {id:'p2', cliente:'CUADRA', nota:'301', fecha:'2026-08-05', saldo:1000,
      productos:[{desc:'X', cant:1, precio:1000}]},
    // sin precios cargados: no se reclama nada (los viejos no tienen)
    {id:'p3', cliente:'SIN PRECIO', nota:'302', fecha:'2026-08-05', saldo:1000,
      productos:[{desc:'X', cant:1}]},
    // pago fechado ANTES de la venta
    {id:'p4', cliente:'PAGO ANTES', nota:'303', fecha:'2026-08-10', pagado:true,
      metodoPago: await ledger([pago('Efectivo',500,'2026-08-01','303',['F2'])])},
    // pago normal
    {id:'p5', cliente:'PAGO OK', nota:'304', fecha:'2026-08-10', pagado:true,
      metodoPago: await ledger([pago('Efectivo',500,'2026-08-12','304',['F3'])])}
  ]);
  let desc = hay(A,'🧮');
  chk('salta la venta cuyos precios no dan el total', !!desc, desc && desc.txt);
  chk('…mostrando los dos números', !!desc && desc.det.some(t=>/1\.800,00/.test(t) && /1\.000,00/.test(t)),
      desc && JSON.stringify(desc.det));
  chk('la que cuadra no salta', !!desc && !desc.det.some(t=>/^CUADRA/.test(t)), desc && JSON.stringify(desc.det));
  chk('la que no tiene precios cargados tampoco (las viejas no son un error)',
      !!desc && !desc.det.some(t=>/SIN PRECIO/.test(t)));

  let fr = hay(A,'📆');
  chk('salta el pago fechado ANTES de la venta', !!fr, fr && fr.txt);
  chk('…diciendo las dos fechas', !!fr && fr.det.some(t=>/PAGO ANTES/.test(t) && /01\/08/.test(t) && /10\/08/.test(t)),
      fr && JSON.stringify(fr.det));
  chk('un pago posterior a la venta es normal y no salta',
      !!fr && !fr.det.some(t=>/PAGO OK/.test(t)), fr && JSON.stringify(fr.det));

  // ============================================================================
  // E) PAGOS SIN IMAGEN  ·  I) CLIENTE CON VARIAS NOTAS ABIERTAS
  // ============================================================================
  A = await avisos([
    {id:'s1', cliente:'SIN RESPALDO', nota:'400', fecha:'2026-08-05', pagado:true,
      metodoPago: await ledger([pago('Efectivo',1200,'2026-08-05','400',[])])},
    {id:'s2', cliente:'CON RESPALDO', nota:'401', fecha:'2026-08-05', pagado:true,
      metodoPago: await ledger([pago('QR',800,'2026-08-05','401',['F9'])])},
    {id:'s3', cliente:'DON PEPE', nota:'402', fecha:'2026-08-05', saldo:500},
    {id:'s4', cliente:'don  pepe', nota:'403', fecha:'2026-08-06', saldo:700},
    {id:'s5', cliente:'OTRA', nota:'404', fecha:'2026-08-07', saldo:900}
  ]);
  let sr = hay(A,'📎');
  chk('salta el pago sin ninguna imagen de respaldo', !!sr, sr && sr.txt);
  chk('…con cuánta plata queda sin poder probarse', !!sr && /1\.200,00/.test(sr.txt), sr && sr.txt);
  chk('el pago que sí tiene imagen no salta', !!sr && !sr.det.some(t=>/CON RESPALDO/.test(t)));

  let vc = hay(A,'👥');
  chk('salta el cliente que debe en más de una venta', !!vc, vc && vc.txt);
  chk('…aunque el nombre esté escrito distinto (mayúsculas y espacios)',
      !!vc && vc.det.some(t=>/2 ventas/.test(t) && /1\.200,00/.test(t)), vc && JSON.stringify(vc.det));
  chk('el que debe en una sola no salta', !!vc && !vc.det.some(t=>/OTRA/.test(t)), vc && JSON.stringify(vc.det));

  // ============================================================================
  // F) HUECOS EN EL TALONARIO
  // ============================================================================
  A = await avisos([
    {id:'t1', cliente:'A', nota:'720', fecha:'2026-08-01', vendedor:'Isabel Robledo', saldo:1},
    {id:'t2', cliente:'B', nota:'721', fecha:'2026-08-02', vendedor:'Isabel Robledo', saldo:1},
    {id:'t3', cliente:'C', nota:'723', fecha:'2026-08-03', vendedor:'Isabel Robledo', saldo:1},
    // salto enorme: es otro talonario, no un olvido
    {id:'t4', cliente:'D', nota:'9000', fecha:'2026-08-04', vendedor:'Isabel Robledo', saldo:1},
    // salto de 8: tampoco. Un olvido deja uno o dos huecos, no ocho seguidos.
    {id:'t9', cliente:'I', nota:'740', fecha:'2026-08-04', vendedor:'Isabel Robledo', saldo:1},
    {id:'tA', cliente:'J', nota:'749', fecha:'2026-08-04', vendedor:'Isabel Robledo', saldo:1},
    // otra vendedora, sin huecos
    {id:'t5', cliente:'E', nota:'50', fecha:'2026-08-01', vendedor:'Maria Flores', saldo:1},
    {id:'t6', cliente:'F', nota:'51', fecha:'2026-08-02', vendedor:'Maria Flores', saldo:1},
    // notas que no son correlativos: no deben inventar huecos
    {id:'t7', cliente:'G', nota:'001-08', fecha:'2026-08-05', vendedor:'Carola Chavez', saldo:1},
    {id:'t8', cliente:'H', nota:'S/N',    fecha:'2026-08-06', vendedor:'Carola Chavez', saldo:1}
  ]);
  let hu = hay(A,'🔢');
  chk('salta el N° salteado del talonario', !!hu, hu && hu.txt);
  chk('…diciendo quién y cuántas le faltan, no un muro de números',
      !!hu && hu.det.some(t=>/Isabel/.test(t) && /faltante/.test(t)) && !hu.det.some(t=>/722/.test(t)),
      hu && JSON.stringify(hu.det));
  chk('…y los números concretos quedan en el globito', !!hu && hu.tips.some(t=>/722/.test(t)),
      hu && JSON.stringify(hu.tips));
  chk('un salto enorme NO se cuenta como faltante (es otro talonario)',
      !!hu && !hu.det.some(t=>/8999/.test(t)), hu && JSON.stringify(hu.det));
  chk('un salto de 8 tampoco: un olvido deja uno o dos huecos, no ocho',
      !!hu && !hu.det.some(t=>/74[1-8]/.test(t)), hu && JSON.stringify(hu.det));
  chk('pero un hueco SÍ se reporta', !!hu && hu.det.length>0, hu && JSON.stringify(hu.det));
  chk('la vendedora sin huecos no aparece', !!hu && !hu.det.some(t=>/Maria/.test(t)));
  chk('las notas que no son correlativos no inventan huecos',
      !!hu && !hu.det.some(t=>/Carola/.test(t)), hu && JSON.stringify(hu.det));

  // ============================================================================
  // H) TRAMOS DE ANTIGÜEDAD DE LA DEUDA
  // ============================================================================
  const tramos = await page.evaluate(() => {
    var mk=function(d,bs){ return {dias:d, saldo:bs, desde:'2026-08-01', p:{id:'x',cliente:'C'}}; };
    var h=tramosDeudaHtml([mk(3,100), mk(20,200), mk(45,300), mk(90,400), mk(120,500)]);
    return { html:h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(),
             uno:tramosDeudaHtml([mk(3,100), mk(5,200)]) };
  });
  chk('los tramos muestran los cuatro cortes',
      /0 a 15/.test(tramos.html) && /16 a 30/.test(tramos.html) &&
      /31 a 60/.test(tramos.html) && /más de 60/.test(tramos.html), tramos.html);
  chk('…con la plata de cada uno', /100,00/.test(tramos.html) && /200,00/.test(tramos.html) &&
      /300,00/.test(tramos.html) && /900,00/.test(tramos.html), tramos.html);
  chk('con toda la deuda en un solo tramo no se dibuja nada (no aporta)',
      tramos.uno==='', tramos.uno);

  // ============================================================================
  // Y lo más importante: sin problemas, el panel se calla
  // ============================================================================
  /* Con la marca "· REGISTRADO": si no, salta —con razón— el aviso de «todavía sin
     cargar al sistema contable», que no es un defecto sino el aviso haciendo su trabajo. */
  const LOK = await page.evaluate(async () =>
    conMarcaReg(textoCobros([{metodo:'QR', monto:1000, fecha:'2026-08-06', nota:'500', comps:['FZ']}]), true));
  A = await avisos([
    {id:'ok1', cliente:'TODO BIEN', nota:'500', fecha:'2026-08-05', pagado:true, entregado:true,
      productos:[{desc:'X', cant:1, precio:1000}], metodoPago: LOK}
  ]);
  chk('una venta sin nada que reclamar no dispara NINGÚN aviso', A.length===0,
      JSON.stringify(A.map(a=>a.ico+' '+a.txt.slice(0,50))));

  // ============================================================================
  // 🔎 EL BUSCADOR DEL DETALLE DE PAGOS
  //    Con 250 renglones, sin buscador contabilidad no puede encontrar nada.
  // ============================================================================
  const buscar = (q) => page.evaluate(async (q) => {
    cuaBuscar(q);
    await new Promise(r=>setTimeout(r,150));
    var box=document.getElementById('cua-detalle');
    var filas=[].slice.call(box.querySelectorAll('tbody tr')).map(function(tr){
      return [].slice.call(tr.querySelectorAll('td')).map(function(td){ return td.textContent.trim(); }).join(' | ');
    });
    return { n:filas.length, filas:filas,
             titulo:(box.querySelector('.cua-t')||{}).textContent||'',
             vacio:!!box.querySelector('.empty'),
             valor:(document.getElementById('cua-buscar')||{}).value };
  }, q);

  await page.evaluate(async () => {
    /* ⚠️ `showView('conta')` vuelve a bajar la planilla: si el "servidor" simulado sigue
       devolviendo vacío (como en los bloques de arriba), STATE se vacía y la tabla queda
       sin renglones. Ver tests/LEEME.md. */
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
    var L=function(a){ return textoCobros(a); };
    var mk=function(o){ return { id:o.id, cliente:o.cliente, nota:String(o.nota),
      vendedor:o.vendedor, fecha:o.fecha, ts:new Date(o.fecha+'T10:00:00').getTime(),
      saldo:0, acuenta:0, pagado:true, cobradoBs:0, metodoPago:o.metodoPago,
      entregado:false, verificado:false, oc:'', observaciones:'', garantia:'',
      facturarA:'', nit:'', estado:'', vehiculo:'', chofer:'', turno:'AM', celular:'7',
      zona:'N', direccion:'Av', maps:'', nroDia:1, productos:[{desc:'X',cant:1}] }; };
    STATE=[
      mk({id:'x1', cliente:'MARIO HUANCA COTA', nota:'963', vendedor:'Mirian Salazar', fecha:'2026-08-03',
          metodoPago:L([{metodo:'QR', banco:'BISA', monto:5120, fecha:'2026-08-03', nota:'963', comps:['F1']}])}),
      mk({id:'x2', cliente:'MARIO HUANCA COTA', nota:'964', vendedor:'Mirian Salazar', fecha:'2026-08-03',
          metodoPago:L([{metodo:'QR', banco:'BISA', monto:300, fecha:'2026-08-03', nota:'964', comps:['F2']}])}),
      mk({id:'x3', cliente:'DENISSE ROJAS', nota:'1004', vendedor:'Juan Pablo Paredes', fecha:'2026-08-04',
          metodoPago:L([{metodo:'QR', banco:'Económico', monto:760, fecha:'2026-08-04', nota:'1004', comps:['F3']}])}),
      mk({id:'x4', cliente:'NETO ESPOSO', nota:'729', vendedor:'Mauricio Merida', fecha:'2026-08-04',
          metodoPago:L([{metodo:'Efectivo', monto:790, fecha:'2026-08-04', nota:'729', comps:['F4']}])})
    ];
    saveMirror();
    showView('conta'); segSet('cta-tab','cuadre'); setContaTab('cuadre');
    await new Promise(r=>setTimeout(r,300));
    segSet('cua-mode','todo'); setCuadreModo('todo');
    await new Promise(r=>setTimeout(r,300));
  });

  let b = await buscar('');
  chk('sin buscar están los cuatro pagos', b.n===4, b.n+' · '+b.titulo.trim());

  b = await buscar('963');
  chk('buscar por N° de nota del pago encuentra el suyo', b.n===1 && /963/.test(b.filas[0]),
      b.n+' → '+JSON.stringify(b.filas));

  b = await buscar('huanca');
  chk('buscar por cliente, sin importar mayúsculas, trae sus dos pagos', b.n===2,
      b.n+' → '+JSON.stringify(b.filas));
  chk('…y el título dice cuántos de cuántos', /2 de 4/.test(b.titulo), b.titulo.trim());
  chk('…y SUMA lo filtrado, para no sacar la cuenta a mano',
      /5\.420,00/.test(b.titulo), b.titulo.trim());

  b = await buscar('mirian');
  chk('buscar por vendedora trae lo suyo', b.n===2, b.n+' → '+JSON.stringify(b.filas));

  b = await buscar('efectivo');
  chk('buscar por forma de pago', b.n===1 && /NETO/.test(b.filas[0]), b.n+' → '+JSON.stringify(b.filas));

  b = await buscar('economico');
  chk('…incluido el banco del QR, y sin tilde', b.n===1 && /DENISSE/.test(b.filas[0]),
      b.n+' → '+JSON.stringify(b.filas));

  b = await buscar('5120');
  chk('buscar por monto tal como se tipea (sin puntos)', b.n===1 && /5\.120,00/.test(b.filas[0]),
      b.n+' → '+JSON.stringify(b.filas));
  b = await buscar('5.120,00');
  chk('…y también como se ve en pantalla', b.n===1, b.n);

  b = await buscar('mirian qr');
  chk('dos palabras: tienen que estar las dos', b.n===2, b.n+' → '+JSON.stringify(b.filas));
  b = await buscar('mirian efectivo');
  chk('…y si una no está, no trae nada', b.n===0 && b.vacio, b.n);

  b = await buscar('zzz');
  chk('sin resultados lo dice con el texto buscado', b.vacio && b.n===0, b.n);

  b = await buscar('');
  chk('limpiar el buscador devuelve los cuatro', b.n===4, b.n);
  chk('…y el título vuelve a ser el simple', !/de 4/.test(b.titulo), b.titulo.trim());

  // ============================================================================
  // 🔎 EL PANEL PLEGADO (§4bk): titulares que se abren, agrupados por gravedad
  // ============================================================================
  const panel = () => page.evaluate(() => {
    var box=document.getElementById('cua-alertas');
    return { grupos:[].slice.call(box.querySelectorAll('.cua-gr')).map(function(g){ return g.textContent.trim(); }),
             filas:[].slice.call(box.querySelectorAll('.cua-av')).map(function(f){
               return { k:((f.getAttribute('onclick')||'').match(/cuaToggleAviso\('([^']+)'\)/)||[])[1]||'?',
                        abierto:f.classList.contains('on'),
                        txt:f.textContent.replace(/\s+/g,' ').trim() };
             }),
             detalles:[].slice.call(box.querySelectorAll('.cua-det')).length,
             chips:[].slice.call(box.querySelectorAll('.cua-chip')).length,
             alto:Math.round(box.getBoundingClientRect().height) };
  });

  await page.evaluate(async () => {
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
    var L=function(a){ return textoCobros(a); };
    var mk=function(o){ return { id:o.id, cliente:o.cliente, nota:String(o.nota),
      vendedor:o.vendedor||'Isabel Robledo', fecha:o.fecha, ts:new Date(o.fecha+'T10:00:00').getTime(),
      saldo:o.saldo||0, acuenta:0, pagado:!!o.pagado, cobradoBs:0, metodoPago:o.metodoPago||'',
      entregado:!!o.entregado, verificado:false, oc:'', observaciones:'', garantia:'',
      facturarA:'', nit:'', estado:'', vehiculo:'', chofer:'', turno:'AM', celular:'7',
      zona:'N', direccion:'Av', maps:'', nroDia:1, productos:[{desc:'X',cant:1}] }; };
    STATE=[
      // 🔴 plata: entregado y debiendo
      mk({id:'z1', cliente:'DEBE UNO', nota:'800', fecha:'2026-08-01', saldo:1500, entregado:true}),
      mk({id:'z2', cliente:'DEBE DOS', nota:'801', fecha:'2026-08-02', saldo:900,  entregado:true}),
      // 🟡 datos: pago sin respaldo
      mk({id:'z3', cliente:'SIN FOTO', nota:'802', fecha:'2026-08-03', pagado:true,
          metodoPago:L([{metodo:'Efectivo', monto:700, fecha:'2026-08-03', nota:'802', comps:[]}])}),
      // ⚪ para mirar: hueco en el talonario (falta la 804)
      mk({id:'z4', cliente:'OTRA', nota:'805', fecha:'2026-08-04', saldo:0, pagado:true,
          metodoPago:L([{metodo:'QR', banco:'BISA', monto:100, fecha:'2026-08-04', nota:'805', comps:['FQ']}])})
    ];
    saveMirror();
    CUA_AV_ABIERTO=null;
    showView('conta'); segSet('cta-tab','cuadre'); setContaTab('cuadre');
    await new Promise(r=>setTimeout(r,300));
    segSet('cua-mode','todo'); setCuadreModo('todo');
    await new Promise(r=>setTimeout(r,350));
  });

  let P = await panel();
  chk('los avisos vienen agrupados por gravedad', P.grupos.length>=2, JSON.stringify(P.grupos));
  chk('…con la plata primero', /PLATA/i.test(P.grupos[0]||''), JSON.stringify(P.grupos));
  chk('cada aviso es UN renglón, no un párrafo con todos los nombres',
      P.filas.length>=3, P.filas.length+' → '+JSON.stringify(P.filas.map(f=>f.txt.slice(0,40))));
  chk('los de PLATA vienen abiertos: es lo que no se puede pasar por alto',
      P.filas.filter(f=>f.k==='entregado')[0] && P.filas.filter(f=>f.k==='entregado')[0].abierto===true,
      JSON.stringify(P.filas.map(f=>f.k+':'+f.abierto)));
  chk('los demás vienen plegados',
      P.filas.filter(f=>f.k==='sinresp')[0] && P.filas.filter(f=>f.k==='sinresp')[0].abierto===false,
      JSON.stringify(P.filas.map(f=>f.k+':'+f.abierto)));
  chk('los nombres se ven como chips, no como texto corrido', P.chips>0, P.chips);
  const altoInicial = P.alto;

  const abierto = await page.evaluate(async () => {
    cuaToggleAviso('sinresp');
    await new Promise(r=>setTimeout(r,200));
    var box=document.getElementById('cua-alertas');
    return { abierto:!!box.querySelector('.cua-av.on'),
             filas:[].slice.call(box.querySelectorAll('.cua-av')).map(function(f){
               return ((((f.getAttribute('onclick')||'').match(/cuaToggleAviso\('([^']+)'\)/)||[])[1])||'?')+':'+f.classList.contains('on'); }),
             alto:Math.round(box.getBoundingClientRect().height) };
  });
  chk('tocar un renglón plegado lo abre',
      abierto.filas.indexOf('sinresp:true')>=0, JSON.stringify(abierto.filas));
  chk('…y el panel crece al abrirlo (o sea, estaba plegado de verdad)',
      abierto.alto>altoInicial, altoInicial+' → '+abierto.alto);

  const cerrado = await page.evaluate(async () => {
    cuaToggleAviso('entregado');
    await new Promise(r=>setTimeout(r,200));
    var box=document.getElementById('cua-alertas');
    return { filas:[].slice.call(box.querySelectorAll('.cua-av')).map(function(f){
               return ((((f.getAttribute('onclick')||'').match(/cuaToggleAviso\('([^']+)'\)/)||[])[1])||'?')+':'+f.classList.contains('on'); }) };
  });
  chk('y tocar uno abierto lo cierra',
      cerrado.filas.indexOf('entregado:false')>=0, JSON.stringify(cerrado.filas));

  chk('«Por cobrar» ya no se estira a la altura de los avisos (era el espacio blanco)',
      await page.evaluate(()=>{
        var g=document.querySelector('.cua-2col');
        return !!g && getComputedStyle(g).alignItems==='start';
      }));

  chk('sin errores JS', errors.length===0, errors.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
