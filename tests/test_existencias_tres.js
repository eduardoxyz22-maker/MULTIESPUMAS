/* 📚 LOS TRES ALMACENES EN UN SOLO EXCEL (16/10, §4lp). El dueño: «para cargar el stock y reposición logística me está pidiendo
   usar esta planilla que ya trae los 3 almacenes». Es el reporte «EXISTENCIAS ALMACEN» del sistema de Moreno con un bloque por
   almacén (fila «105003 | PRODUCTOS TERMINADOS FAB.» … «TOTAL : | PRODUCTOS TERMINADOS FAB. | 523») y arriba «Almacén Inicial /
   Final : IM».

   ⚠️ LO QUE ESTA PRUEBA CUIDA (falla contra lo publicado, `6a55598`, que lo tomaba ENTERO como IM con las unidades SUMADAS):
   1. El archivo se parte en sus bloques y se muestra la vista previa de cada uno, en el orden del archivo: «1 de 3», cuál sigue,
      el botón «Usar … y seguir con Banzer», con el «¿qué almacén es?» de cada uno.
   2. Cada «Usar» deja SU conteo (PTF en `STOCK.c`, Banzer e IM en `STOCK.g`), sin mezclar unidades de otro almacén, y abre el
      próximo; el último cierra.
   3. «⏭ Saltar» deja ese almacén como estaba y sigue; «Cancelar todo» no toca nada.
   4. Un archivo de otro día no entra (ninguno de los tres).
   5. El reporte de UN almacén, con o sin bloque, sigue como siempre; si su bloque dice otro almacén que el encabezado, manda el bloque.
   6. Si el TOTAL del bloque no coincide con lo leído, la vista previa lo avisa.
   Reloj clavado en el viernes 16/10/2026 10:20 de Bolivia. Red cortada, datos sintéticos (el repositorio es público).
   Se corre:  node tests/test_existencias_tres.js   · `PEDIDOS=<archivo>` corre contra otra página. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

/* ── Un .xlsx de verdad (ZIP sin comprimir), con la forma del reporte de Moreno: comillas simples, la cantidad sin encabezado. ── */
function crc32(buf){ let crc=0xFFFFFFFF; for(let n=0;n<buf.length;n++){ let c=(crc^buf[n])&0xFF; for(let k=0;k<8;k++) c=(c&1)?((c>>>1)^0xEDB88320):(c>>>1); crc=(crc>>>8)^c; } return (crc^0xFFFFFFFF)>>>0; }
function zip(files){
  const partes=[], central=[]; let off=0;
  files.forEach(f=>{
    const name=Buffer.from(f.name,'utf8'), data=Buffer.from(f.data,'utf8'), crc=crc32(data);
    const lh=Buffer.alloc(30); lh.writeUInt32LE(0x04034b50,0); lh.writeUInt16LE(20,4); lh.writeUInt32LE(crc,14); lh.writeUInt32LE(data.length,18); lh.writeUInt32LE(data.length,22); lh.writeUInt16LE(name.length,26);
    partes.push(lh,name,data);
    const ch=Buffer.alloc(46); ch.writeUInt32LE(0x02014b50,0); ch.writeUInt16LE(20,4); ch.writeUInt16LE(20,6); ch.writeUInt32LE(crc,16); ch.writeUInt32LE(data.length,20); ch.writeUInt32LE(data.length,24); ch.writeUInt16LE(name.length,28); ch.writeUInt32LE(off,42);
    central.push(ch,name); off+=30+name.length+data.length;
  });
  const cd=Buffer.concat(central), eocd=Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50,0); eocd.writeUInt16LE(files.length,8); eocd.writeUInt16LE(files.length,10); eocd.writeUInt32LE(cd.length,12); eocd.writeUInt32LE(off,16);
  return Buffer.concat(partes.concat([cd,eocd]));
}
const esc=(t)=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
/* bloques: [{ cod:'105003', alm:'PRODUCTOS TERMINADOS FAB.', items:[[código, nombre, cant]], total }]. Sin `bloques`, el reporte
   de un almacén de siempre (sin filas de bloque). */
function reporte({ al='16/10/2026', pie='16/10/2026 10:10:16', cab='01-05-103  IM - PRODUCTOTERMINADO', bloques, items }){
  const celda=(ref,v)=> typeof v==='number' ? `<c r='${ref}' s='11'><v>${v}</v></c>` : `<c r='${ref}' t='inlineStr' s='11'><is><t>${esc(v)}</t></is></c>`;
  let n=0; const filas=[]; const fila=(cs)=>{ n++; filas.push(`<row r="${n}">${cs.map(([c,v])=>celda(c+n,v)).join('')}</row>`); };
  fila([['C','MULTIESPUMAS']]);
  fila([['C','MORENO'],['X','EXISTENCIAS ALMACEN  AL '],['AR',al]]);
  fila([['BC','(Productos con existencia <> 0)']]);
  fila([['F','Almacén Inicial :'],['P',cab],['AK','Almacén Final :'],['AX',cab]]);
  fila([['C','Línea de Productos'],['BA','Cantidad']]);
  fila([['G','Código Producto'],['W','Nombre Producto'],['AZ',' CUI'],['BD','Unidad']]);
  const prods=(its)=>its.forEach(it=>fila([['G',it[0]],['W',it[1]],['AY',it[2]],['BD','PZA']]));
  let gral=0;
  if(bloques){
    bloques.forEach(b=>{
      fila([['Y',Number(b.cod)],['AE',b.alm]]);
      fila([['B','COLCHONES PROPIOS']]); fila([['D','HEAVEN']]);
      prods(b.items);
      const s=b.items.reduce((a,it)=>a+it[2],0);
      fila([['H','SUBTOTAL'],['M','HEAVEN'],['AV',s]]);
      fila([['Q','TOTAL :'],['U',b.alm],['AV',b.total!=null?b.total:s]]); gral+=s;
    });
    fila([['AF','TOTAL GENERAL :'],['AV',gral]]);
  } else prods(items);
  if(pie) fila([['B','iv380_34'],['Z','Página 1 de 1'],['AZ','Fecha : '+pie+' - logistica']]);
  const hoja='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+filas.join('')+'</sheetData></worksheet>';
  return zip([ { name:'[Content_Types].xml', data:'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>' },
               { name:'xl/workbook.xml', data:'<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheets><sheet name="Sheet1" sheetId="1"/></sheets></workbook>' },
               { name:'xl/worksheets/sheet1.xml', data:hoja } ]);
}
const LOG='PRODUCTOS TERMINADOS FAB.', BZ='Almacen Distribucion Banzer', IM='IM - PRODUCTOTERMINADO';
const TRES = (o={}) => reporte(Object.assign({ bloques:[
  { cod:'105003', alm:LOG, items:[['CH1201','TITANIO ICE 2.5PLZ 160X190CM',13],['CH1129','COLCHON TITANIO LATEX 140X190',4]] },
  { cod:'105025', alm:BZ,  items:[['CH1201','TITANIO ICE 2.5PLZ 160X190CM',7],['CH1129','COLCHON TITANIO LATEX 140X190',2],['ZZ9001','COLCHON DE PRUEBA 100X190',1]] },
  { cod:'105103', alm:IM,  items:[['CH1201','TITANIO ICE 2.5PLZ 160X190CM',30]] } ] }, o));

const BASE = `
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true; SERVER_AUTH='abierto';
  try{ localStorage.removeItem(LS_PEND); localStorage.removeItem(LS_RECHAZOS); }catch(e){}
  if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  CARGA_GEN++; CARGA_ESTADO='ok'; NO_ENCOLAR={}; SAVE_ULTIMO={}; SAVE_REV={};
  apiSave=function(rec){ return Promise.resolve({ok:true, pedido:rec}); };
  apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
  window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(m)); return _t(m,k,ms); };
  window.K=stockClave({desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201'});
  window.K2=stockClave({desc:'TITANIO LATEX',medida:'140x190',codigo:'CH1129'});
  window._suma=function(u){ var t=0; Object.keys(u||{}).forEach(function(k){ t+=Number(u[k])||0; }); return t; };
  /* Un stock de ayer en los tres, con los roles ya elegidos (como en producción). */
  window._base=function(){
    STOCK=stockVacio(); STOCK_CARGADO=true; STATE=[];
    var ayer='2026-10-15';
    STOCK.c={ f:ayer, hora:'09:00:00', u:{}, solo0:true, alm:'${LOG}', t:Date.now()-86400000 }; STOCK.c.u[K]=11;
    STOCK.g={}; STOCK.g['${BZ}']={ f:ayer, hora:'09:00:00', u:{}, solo0:true, t:Date.now()-86400000, rs:{} }; STOCK.g['${BZ}'].u[K]=5;
    STOCK.g['${IM}']={ f:ayer, hora:'09:00:00', u:{}, solo0:true, t:Date.now()-86400000, rs:{} }; STOCK.g['${IM}'].u[K]=25;
    STOCK.al={}; STOCK.al['${LOG}']='log'; STOCK.al['${BZ}']='sale'; STOCK.al['${IM}']='otro';
    STOCK.p=[]; stockOlvidarIndice();
  };
  window._vista=function(){ var R=EXIST_IMP, mb=(document.getElementById('modal-box')||{}).textContent||'';
    return { alm:R?R.almacen:null, total:R?R.total:null, n:R?R.items.length:null, rol:(document.getElementById('exist-rol')||{}).value||'',
      banner:((document.getElementById('exist-lote')||{}).textContent||'').replace(/\\s+/g,' '), usar:((document.getElementById('exist-usar')||{}).textContent||''),
      saltar:!!document.getElementById('exist-saltar'), mal:((document.getElementById('exist-total-mal')||{}).textContent||''), cola:(typeof EXIST_COLA!=='undefined')?EXIST_COLA.length:-1,
      noHoy:!!document.getElementById('exist-no-hoy'), txt:mb.replace(/\\s+/g,' ').slice(0,400) }; };
`;

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const nueva = async () => {
    const page = await browser.newPage({ viewport:{width:1400,height:1000}, timezoneId:'America/La_Paz' });
    page.on('pageerror', e=>errores.push(e.message));
    page.on('dialog', d=>d.accept());
    await page.route(/^https?:/, r=>r.abort());
    await page.clock.setFixedTime(new Date('2026-10-16T10:20:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate((b)=>{ eval(b); _base(); }, BASE);
    return page;
  };
  const subir = async (page, name, buffer) => {
    await page.evaluate(()=>{ EXIST_IMP=null; try{ closeModal(); }catch(e){} });
    await page.setInputFiles('#exist-input', { name, mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer });
    await page.waitForFunction(()=>!!EXIST_IMP || /no es de hoy|❌/.test((document.getElementById('modal-box')||{}).textContent||'') || (window._toasts||[]).some(function(t){ return /❌/.test(t); }), null, { timeout:8000 }).catch(()=>{});
    await page.waitForTimeout(150);
    return page.evaluate(()=>_vista());
  };
  const usar = (page) => page.evaluate(async ()=>{ confirmarImportExist(); await new Promise(function(r){ setTimeout(r,50); }); return _vista(); });
  const seccion = async (nombre, fn) => { const page=await nueva(); try{ await fn(page); }catch(e){ chk(nombre+' · la sección se cayó: '+String(e&&e.message||e).slice(0,200), false); } await page.close(); };

  console.log('\n── 1-2. El archivo con los tres: uno detrás del otro, cada uno con su conteo ──');
  await seccion('1', async (page) => {
    const v1 = await subir(page, 'Excel_16-10-2026_10_12_15.xlsx', TRES());
    chk('1a · se muestra PRIMERO el de fábrica (PTF), con SUS 17 unidades — no las 57 de los tres', v1.alm===LOG && v1.total===17 && v1.n===2, v1);
    chk('1b · el cartel dice «3 almacenes», «1 de 3» y qué sigue (Banzer y después Moreno)', /3 almacenes/.test(v1.banner) && /1 de 3/.test(v1.banner) && /Banzer/.test(v1.banner) && /Moreno/.test(v1.banner), v1.banner);
    chk('1c · el botón dice «… y seguir con Banzer», hay «⏭ Saltar» y el rol es «depósito de fábrica»', /seguir con Banzer/.test(v1.usar) && v1.saltar && v1.rol==='log' && v1.cola===2, v1);
    const v2 = await usar(page);
    const s1 = await page.evaluate(()=>({ c:_suma(STOCK.c.u), cK:STOCK.c.u[K], f:STOCK.c.f, h:STOCK.c.hora, bz:_suma(STOCK.g['Almacen Distribucion Banzer'].u), im:_suma(STOCK.g['IM - PRODUCTOTERMINADO'].u) }));
    chk('2a · «Usar» deja el conteo de fábrica con lo de PTF (13 + 4, al 16/10 10:10:16) y todavía no toca Banzer ni IM', s1.c===17 && s1.cK===13 && s1.f==='2026-10-16' && s1.h==='10:10:16' && s1.bz===5 && s1.im===25, s1);
    chk('2b · …y abre Banzer: «2 de 3», 10 unidades, rol «también salen camiones», sigue Moreno', v2.alm===BZ && v2.total===10 && /2 de 3/.test(v2.banner) && v2.rol==='sale' && /seguir con Moreno/.test(v2.usar), v2);
    const v3 = await usar(page);
    chk('2c · después Moreno: «3 de 3», «Es el último», sin «Saltar», rol «ir a buscar»', v3.alm===IM && v3.total===30 && /3 de 3/.test(v3.banner) && /último/.test(v3.banner) && !v3.saltar && v3.rol==='otro', v3);
    const v4 = await usar(page);
    const s2 = await page.evaluate(()=>({ c:_suma(STOCK.c.u), bz:_suma(STOCK.g['Almacen Distribucion Banzer'].u), im:_suma(STOCK.g['IM - PRODUCTOTERMINADO'].u),
      bzF:STOCK.g['Almacen Distribucion Banzer'].f, imF:STOCK.g['IM - PRODUCTOTERMINADO'].f, otros:Object.keys(STOCK.g).length,
      hist:(STOCK.h||[]).slice(0,3).map(function(x){ return x.alm+'='+x.u; }) }));
    chk('2d · al final: PTF 17, Banzer 10, IM 30, cada uno con su día — nada mezclado ni almacenes de más', s2.c===17 && s2.bz===10 && s2.im===30 && s2.bzF==='2026-10-16' && s2.imF==='2026-10-16' && s2.otros===2, s2);
    chk('2e · el historial anota los tres cortes por separado', s2.hist.indexOf('IM - PRODUCTOTERMINADO=30')>=0 && s2.hist.indexOf('Almacen Distribucion Banzer=10')>=0 && s2.hist.indexOf('PRODUCTOS TERMINADOS FAB.=17')>=0, s2.hist);
    chk('2f · el último cierra la ventana y no queda nada en espera', v4.alm===null && v4.cola===0, v4);
  });

  console.log('\n── 3. Saltar y cancelar ──');
  await seccion('3', async (page) => {
    await subir(page, 'Excel_16-10-2026_10_12_15.xlsx', TRES());
    await usar(page);
    const sal = await page.evaluate(()=>{ existSaltar(); return _vista(); });
    const s = await page.evaluate(()=>({ bz:_suma(STOCK.g['Almacen Distribucion Banzer'].u), bzF:STOCK.g['Almacen Distribucion Banzer'].f }));
    chk('3a · «⏭ Saltar» en Banzer: Banzer queda como estaba (5, del 15/10) y pasa a Moreno', sal.alm===IM && s.bz===5 && s.bzF==='2026-10-15', { sal:sal.alm, s:s });
  });
  await seccion('3b', async (page) => {
    await subir(page, 'Excel_16-10-2026_10_12_15.xlsx', TRES());
    const r = await page.evaluate(()=>{ existCancelar(); return { v:_vista(), c:_suma(STOCK.c.u), f:STOCK.c.f }; });
    chk('3b · «Cancelar todo» no toca nada y no deja ninguno esperando', r.v.alm===null && r.v.cola===0 && r.c===11 && r.f==='2026-10-15', r);
  });

  console.log('\n── 4. De otro día no entra ninguno ──');
  await seccion('4', async (page) => {
    const v = await subir(page, 'Excel_15-10-2026_10_12_15.xlsx', TRES({ al:'15/10/2026', pie:'15/10/2026 10:10:16' }));
    chk('4 · el archivo de AYER: «no es de hoy», dice que trae 3 almacenes y no deja ninguno esperando', v.noHoy && /3 almacenes/.test(v.txt) && v.cola===0, v);
  });

  console.log('\n── 5. El reporte de un almacén sigue igual ──');
  await seccion('5', async (page) => {
    const v = await subir(page, 'Excel_16-10-2026_10_12_15.xlsx', reporte({ cab:'01-05-003  PRODUCTOS TERMINADOS FAB.', items:[['CH1201','TITANIO ICE 2.5PLZ 160X190CM',9]] }));
    chk('5a · sin bloques (el de siempre): un solo almacén, sin cartel ni «Saltar», «Usar estas existencias» a secas', v.alm===LOG && v.total===9 && !v.banner && !v.saltar && v.usar.trim()==='💾 Usar estas existencias' && v.cola===0, v);
    const v2 = await subir(page, 'Excel_16-10-2026_10_12_15.xlsx', reporte({ cab:'01-05-025  Almacen Distribucion Banzer', bloques:[{ cod:'105025', alm:BZ, items:[['CH1201','TITANIO ICE 2.5PLZ 160X190CM',6]] }] }));
    chk('5b · con UN bloque: un solo almacén (Banzer), sin cartel de «varios»', v2.alm===BZ && v2.total===6 && !v2.banner && !v2.saltar, v2);
    const v3 = await subir(page, 'Excel_16-10-2026_10_12_15.xlsx', reporte({ cab:'01-05-103  IM - PRODUCTOTERMINADO', bloques:[{ cod:'105003', alm:LOG, items:[['CH1129','COLCHON TITANIO LATEX 140X190',3]] }] }));
    chk('5c · si el encabezado dice IM pero el bloque es PTF, manda el bloque (PTF)', v3.alm===LOG && v3.total===3, v3);
  });

  console.log('\n── 6. El TOTAL del bloque no coincide ──');
  await seccion('6', async (page) => {
    const v = await subir(page, 'Excel_16-10-2026_10_12_15.xlsx', reporte({ bloques:[
      { cod:'105003', alm:LOG, items:[['CH1201','TITANIO ICE 2.5PLZ 160X190CM',13]], total:99 },
      { cod:'105103', alm:IM, items:[['CH1201','TITANIO ICE 2.5PLZ 160X190CM',2]] } ] }));
    chk('6 · la vista previa avisa que el reporte dice 99 y el panel leyó 13', /99/.test(v.mal) && /13/.test(v.mal) && v.alm===LOG, v);
  });

  console.log('\n── 7. Sin errores ──');
  chk('la página no tiró ningún error de JavaScript', errores.length===0, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
