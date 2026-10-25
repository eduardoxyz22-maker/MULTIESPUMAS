/* 📥 DOS BORDES DEL EXCEL DE EXISTENCIAS (25/10, auditoría Codex/Astra, §4mk).

   LO QUE CUIDA:
   1. ⏭ El archivo de los tres almacenes con uno VACÍO (encabezado y «TOTAL : 0», sin productos): antes frenaba los tres. Ahora ese
      se salta (queda con su saldo anterior), los otros dos se leen y se avisa (el dueño eligió «saltarlo con un aviso»).
      Si vienen todos vacíos, no hay nada que cargar y se dice.
   2. 🏷️ Dos códigos que la lista no conoce con el MISMO nombre y medida (ZZ001 = 2, ZZ002 = 4): antes una fila con 6. Ahora dos
      productos (dos códigos son dos productos, §4cy), la vista previa lo dice, y el que ya tenía la clave en el corte anterior se la
      queda aunque cambie el orden del archivo.
   Con las funciones de la página (existLoteDe, existLeer, renderImportExist), sin red.

   Reloj CLAVADO (martes 27/10/2026, 10:00 de Bolivia). Solo datos sintéticos.
   Se corre:  node tests/test_existencias_bordes.js   (PEDIDOS=… para correrla contra otra versión) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1440, height:1000 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await ctx.route(/^https:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-27T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  const r = await page.evaluate(async () => {
    CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    /* como el reporte de Moreno (el mismo armado que test_existencias_tres): bloque = «105003 | almacén», grupo, productos, SUBTOTAL, «TOTAL :» */
    var cab=function(){ return [{ C:'MULTIESPUMAS' }, { C:'MORENO', X:'EXISTENCIAS ALMACEN  AL ', AR:'27/10/2026' }, { BC:'(Productos con existencia <> 0)' },
      { F:'Almacén Inicial :', P:'01-05-103  IM - PRODUCTOTERMINADO', AK:'Almacén Final :', AX:'01-05-103  IM - PRODUCTOTERMINADO' }, { C:'Línea de Productos', BA:'Cantidad' },
      { G:'Código Producto', W:'Nombre Producto', AZ:' CUI', BD:'Unidad' }]; };
    var bloque=function(cod, alm, prods){ var f=[{ Y:Number(cod), AE:alm }, { B:'COLCHONES PROPIOS' }, { D:'HEAVEN' }]; var t=0;
      prods.forEach(function(p){ f.push({ G:p[0], W:p[1], AY:p[2], BD:'PZA' }); t+=p[2]; });
      if(prods.length) f.push({ H:'SUBTOTAL', M:'HEAVEN', AV:t });
      f.push({ Q:'TOTAL :', U:alm, AV:t }); return f; };
    var pie=[{ B:'iv380_34', Z:'Página 1 de 1', AZ:'Fecha : 27/10/2026 08:00:00 - logistica' }];
    var PTF='PRODUCTOS TERMINADOS FAB.', BZ='Almacen Distribucion Banzer', IM='IM - PRODUCTOTERMINADO';
    var tres=cab().concat(bloque('105003', PTF, [['CH1201','TITANIO ICE 2.5PLZ 160X190CM',3]]), bloque('105004', BZ, []), bloque('105005', IM, [['CH1201','TITANIO ICE 2.5PLZ 160X190CM',7]]), pie);
    var L=existLoteDe(tres, '');
    var todos=existLoteDe(cab().concat(bloque('105003', PTF, []), bloque('105004', BZ, []), pie), '');
    var t=[]; var _t=toast; toast=function(m){ t.push(String(m)); };
    // 2 · los dos códigos desconocidos
    var dos=cab().concat(bloque('105003', PTF, [['ZZ001','PRODUCTO RARO 140X190',2],['ZZ002','PRODUCTO RARO 140X190',4]]), pie);
    var R2=(existLoteDe(dos, '')||{}).lista; R2=R2 && R2[0];
    if(!R2){ var _r=existLeer(dos); R2=_r; }
    var items=(R2&&R2.items||[]).map(function(x){ return x.cod+'='+x.cant+'@'+x.k; });
    EXIST_IMP=R2; EXIST_COLA=[]; try{ renderImportExist(); }catch(e){}
    var aviso=(document.getElementById('exist-colision')||{}).textContent||'';
    try{ closeModal(); }catch(e){}
    // el orden del archivo al revés, con ZZ002 como dueño de la clave en el corte anterior
    STOCK.c=STOCK.c||{}; STOCK.c.cod={ ZZ002:'PRODUCTO RARO|140X190' };
    var reves=cab().concat(bloque('105003', PTF, [['ZZ001','PRODUCTO RARO 140X190',2],['ZZ002','PRODUCTO RARO 140X190',4]]), pie);
    var R3=existLeer(reves, PTF);
    var k3={}; (R3.items||[]).forEach(function(x){ k3[x.cod]=x.k; });
    toast=_t;
    return { L:L && { error:L.error, n:(L.lista||[]).length, alms:(L.lista||[]).map(function(x){ return x.almacen; }), saltados:L.saltados },
             todos:todos && { error:todos.error }, items:items, aviso:aviso, k3:k3 };
  });
  chk('1a. el de los tres con Banzer vacío: se leen PTF e IM (antes no se leía ninguno)', r.L && !r.L.error && r.L.n===2 && /PRODUCTOS TERMINADOS/.test(r.L.alms[0]) && /IM/.test(r.L.alms[1]), r.L);
  chk('1b. …y Banzer queda anotado como saltado (para el aviso)', r.L && (r.L.saltados||[]).length===1 && /Banzer/.test(r.L.saltados[0]), r.L && r.L.saltados);
  chk('1c. todos vacíos: «no hay nada que cargar»', r.todos && /vacíos/.test(r.todos.error||''), r.todos);
  chk('2a. ZZ001 = 2 y ZZ002 = 4 son dos productos (antes una fila con 6)', r.items.length===2 && r.items.some(x=>/^ZZ001=2@/.test(x)) && r.items.some(x=>/^ZZ002=4@/.test(x)), r.items);
  chk('2b. la vista previa lo dice', /ZZ001 y ZZ002/.test(r.aviso) && /aparte/.test(r.aviso), r.aviso);
  chk('2c. el que ya tenía la clave en el corte anterior se la queda (ZZ002), el otro lleva su código', r.k3.ZZ002==='PRODUCTO RARO|140X190' && /ZZ001/.test(r.k3.ZZ001||''), r.k3);
  chk('sin errores en la página', !errores.length, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
