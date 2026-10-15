/* 🔗 COMPLETAR LAS ATC CON TRELLO (15/10, §4lf). El dueño: «tenés la api del trello, revisá todas las atc que tenemos en el panel con
   las del trello y añadí los datos faltantes en el panel, como motivo y fecha de garantía o contrato (cuándo fue la compra)».
   Lo que cuida, con un respaldo de Trello INVENTADO (mismo formato que `atc-semanal.csv`) y ATC inventadas:
     · el CSV con comillas, comas y saltos de línea adentro; los celulares (con guiones, con 591, no un NIT de 7 cifras);
     · la fecha de compra solo con día, mes y año pegados a «compra/compró/vendió»; mes y año o el año solo se muestran sin inventar
       el día; el motivo con las palabras del reclamo; el detalle sin rótulos, dirección, imágenes ni adjuntos;
     · el cruce: por el celular (tildado), solo por el nombre (sin tildar), sin tarjeta, y las completas no aparecen;
     · guardar: solo lo tildado y solo lo VACÍO (nunca pisa: se vuelve a mirar al guardar), con el enlace de la tarjeta;
     · sin la contraseña de Administración no abre.
   Se corre:  node tests/test_atc_trello.js   (desde la raíz) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const ARCH='file://'+(process.env.PEDIDOS||path.resolve('pedidos.html'));
const q = s => '"'+String(s).replace(/"/g,'""')+'"';
const fila = (lista, tarj, desc, arch, url) => ['ATC', lista, tarj, desc, '', 'Pendiente', 'No', '', '', arch||'No', url].map(q).join(',');
const CSV = '﻿Tablero,Lista,Tarjeta,Descripcion,Vencimiento,Estado,Completada,Etiquetas,Asignado_a,Archivada,URL\n'+[
  fila('ATC DEVUELTAS LOG','ATCMARIA - JUAN ROCA',
    'DATOS DEL CLIENTE |  | CLIENTE\tJUAN ROCA\tFECHA\t02/10/2026 | NRO DE FACTURA\t\t | TELEFONO\t7011-1222\tFECHA DE COMPRA\t13/09/2021 | DIRECCION\tAV. BUSCH 3ER ANILLO | '+
    'DETALLES DEL RECLAMO El colchón está UNDIDO en el centro, "dice" que no descansa | ![foto](https://trello.com/x/foto.webp) | Atencion cliente Juan Roca.xlsx','No','https://trello.com/c/AAA111/1-atc-juan'),
  fila('ATC SOLICITADAS COM','ATC MIRIAN--ANA PAZ','ATC MIRIAN ANA PAZ |  | +591 70000001 |  | TIT ICE 2 PLZ |  | SUENAN LOS RESORTES, TIENE GARANTIA LO COMPRO EL 11-05-2022','No','https://trello.com/c/BBB222/2-atc-ana'),
  fila('ATC EN PRODUCCION','ATC-ISABEL LUIS ALBERTO SOSA','CLIENTE LUIS ALBERTO SOSA FECHA 05/10/2026 NRO DE FACTURA TELEFONO 7999-9999 | compra junio-2022 | se le descosturó el ribete del costado','No','https://trello.com/c/CCC333/3-atc-luis'),
  fila('ATC DEVUELTAS LOG','ATC CAROLA - ROSA VACA','Celular 70000004 | NIT 6808887 | COMPRO 2024-TIENE GARANTIA | el cliente quiere cambio de colchon','Sí','https://trello.com/c/DDD444/4-atc-rosa'),
  fila('ATC DEVUELTAS LOG','ATC MARIA - EVA ROJAS','TELEFONO 70000005 | SE VENDIO EL 06/12/2026 | la tela tiene bolitas y manchas','No','https://trello.com/c/EEE555/5-atc-eva'),
  fila('ATC SOLICITADAS COM','ATC OTRO CLIENTE','TELEFONO 79999999 | NO TIENE GARANTIA, hacer cotizacion','No','https://trello.com/c/FFF666/6-atc-otro')
].join('\n')+'\n';

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{ width:1280, height:900 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await page.clock.setFixedTime(new Date('2026-10-15T10:00:00-04:00'));
  await page.route(/^https?:/, r => r.abort());
  await page.goto(ARCH, { waitUntil:'load' }); await page.waitForTimeout(600);

  /* ---- 1. leer el respaldo ---- */
  let r = await page.evaluate((CSV) => {
    var T=atctCsv(CSV).map(atctTarjeta);
    return T.map(function(t){ return { tit:t.tit, cels:t.cels, compra:t.compra, fecha:t.fecha, mot:t.mot&&t.mot.mot, det:t.det, nom:t.nom, arch:t.arch }; });
  }, CSV);
  chk('el CSV con BOM, comillas, comas y saltos adentro: 6 tarjetas, la descripción entera', r.length===6 && /no descansa/.test(r[0].det) && r[0].tit==='ATCMARIA - JUAN ROCA', r.map(x=>x.tit));
  chk('celulares: «7011-1222», «+591 70000001»; no el NIT de 7 cifras', r[0].cels.join()==='70111222' && r[1].cels.join()==='70000001' && r[3].cels.join()==='70000004', r.map(x=>x.cels));
  chk('fecha de compra: «FECHA DE COMPRA 13/09/2021» y «LO COMPRO EL 11-05-2022» con el día',
    r[0].compra.f==='2021-09-13' && r[1].compra.f==='2022-05-11', [r[0].compra, r[1].compra]);
  chk('«compra junio-2022» y «COMPRO 2024» se muestran pero NO se inventa el día', r[2].compra && r[2].compra.f==='' && /JUNIO-2022/.test(r[2].compra.txt) && r[3].compra && r[3].compra.f==='' && /2024/.test(r[3].compra.txt), [r[2].compra, r[3].compra]);
  chk('la fecha de la ATC en Trello (no la de compra): 02/10 y 05/10', r[0].fecha==='2026-10-02' && r[2].fecha==='2026-10-05' && r[1].fecha==='', r.map(x=>x.fecha));
  chk('motivos: Hundimiento, Resortes, Retapizado / costura, Cambio de producto, Tela / pillow, Cotización',
    r.map(x=>x.mot).join('|')==='Hundimiento|Resortes|Retapizado / costura|Cambio de producto|Tela / pillow|Cotización', r.map(x=>x.mot));
  chk('el detalle sin rótulos, dirección, imagen ni el adjunto (y sin «DETALLES DEL RECLAMO»)', /^El colchón está UNDIDO en el centro/.test(r[0].det) && !/AV\. BUSCH|webp|xlsx|TELEFONO|DETALLES/i.test(r[0].det), r[0].det);
  chk('el nombre del cliente: del campo CLIENTE, o del título sin «ATC» ni la vendedora', r[0].nom.join(' ')==='JUAN ROCA' && r[1].nom.join(' ')==='ANA PAZ' && r[2].nom.join(' ')==='LUIS ALBERTO SOSA', r.map(x=>x.nom));

  /* ---- 2. las ATC del panel ---- */
  await page.evaluate((CSV) => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; CARGA_GEN++; CARGA_ESTADO='ok';
    if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
    window.__guardados=[];
    apiSave=function(p){ __guardados.push(JSON.parse(JSON.stringify(p))); return Promise.resolve({ ok:true, pedido:p }); };
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
    atctTraerCsv=function(){ ATCT.fecha='Sat, 03 Oct 2026 23:24:26 GMT'; return Promise.resolve(CSV); };
    var ts=function(f){ return new Date(f+'T10:00:00-04:00').getTime(); };
    var A=function(id, oc, entro, cel, cli, atc){ return { id:id, oc:oc, fecha:'2026-10-20', turno:'AM', cliente:cli, vendedor:'Maria Flores', celular:cel, ts:ts(entro), productos:[{ desc:'TITANIO', medida:'140x190', cant:1, atc:atc }] }; };
    STATE=[
      A('a1','ATC 10-001','2026-10-02','70111222','JUAN CARLOS ROCA', { mot:'', det:'', fcom:'' }),              // celular: completa las tres
      A('a2','ATC 10-002','2026-10-03','591 70000001','ANA MARIA PAZ', { mot:'Ruido', det:'ya escrito', fcom:'' }),  // celular: solo la fecha
      A('a3','ATC 10-003','2026-10-05','60000003','LUIS ALBERTO SOSA', { mot:'', det:'', fcom:'' }),           // solo por el nombre
      A('a4','ATC 10-004','2026-10-06','70000005','EVA ROJAS', { mot:'', det:'', fcom:'' }),                   // compra posterior a la ATC
      A('a5','ATC 10-005','2026-10-07','69999998','NADIE CONOCIDO', { mot:'', det:'', fcom:'' }),              // sin tarjeta
      A('a6','ATC 10-006','2026-10-08','70000004','ROSA VACA', { mot:'Patas', det:'algo', fcom:'2024-01-01' }), // completa
      { id:'o1', oc:'10-050', fecha:'2026-10-14', cliente:'JUAN ROCA', celular:'70111222', vendedor:'Maria Flores', ts:ts('2026-10-01'), productos:[{ desc:'TITANIO', cant:1 }] }
    ];
  }, CSV);
  r = await page.evaluate((CSV) => atctCruzar(atctCsv(CSV).map(atctTarjeta)).map(function(x){ return x.p.id+':'+x.falta.join('+')+':'+(x.t?x.t.tit:'—')+':'+x.por; }), CSV);
  chk('el cruce: a1 y a2 por el celular (con o sin 591), a3 solo por el nombre, a5 sin tarjeta; la venta común no entra',
    r.length===6 && r[0]==='a1:mot+fcom+det:ATCMARIA - JUAN ROCA:cel' && r[1]==='a2:fcom:ATC MIRIAN--ANA PAZ:cel' && r[2]==='a3:mot+fcom+det:ATC-ISABEL LUIS ALBERTO SOSA:nom' &&
    r[4]==='a5:mot+fcom+det:—:' && r[5]==='a6::ATC CAROLA - ROSA VACA:cel', r);

  /* ---- 3. la ventana ---- */
  r = await page.evaluate(() => { UNLOCKED=false; var t0=document.getElementById('toast'); abrirAtcTrello(); return { ov:document.getElementById('atct-ov').style.display, t:(document.getElementById('toast')||{}).textContent||'' }; });
  chk('sin la contraseña de Administración no abre (y lo dice)', r.ov==='none' && /contraseña de Administración/.test(r.t), r);
  await page.evaluate(() => { UNLOCKED=true; showView('atc'); abrirAtcTrello();   /* (§4lm) el botón se sacó de la barra: la ventana sigue */ });
  await page.waitForTimeout(200);
  r = await page.evaluate(() => {
    var b=document.getElementById('atct-body'), f=function(id){ var i=ATCT.filas.findIndex(function(x){ return x.p.id===id; }); return document.getElementById('atct-f'+i); };
    var cb=function(id, k){ var el=f(id); var c=el && el.querySelector('input[type=checkbox][data-k="'+k+'"]'); return c ? c.checked : null; };
    var val=function(id, k){ var el=f(id); var c=el && el.querySelector('[data-c="'+k+'"]'); return c ? c.value : null; };
    return { txt:b.innerText, info:document.getElementById('atct-info').textContent, guardar:document.getElementById('atct-guardar').textContent,
      a1:[cb('a1','mot'), val('a1','mot'), cb('a1','fcom'), val('a1','fcom'), cb('a1','det')], a2:[!!f('a2').querySelector('[data-c="mot"]'), cb('a2','fcom'), val('a2','fcom')],
      a3:[cb('a3','mot'), val('a3','mot'), cb('a3','fcom'), val('a3','fcom')], a4:[cb('a4','fcom'), val('a4','fcom'), cb('a4','mot')], a6:!!f('a6') };
  });
  chk('abre con el resumen: 6 ATC, 1 completa, 3 por el celular, 1 por el nombre, 1 sin tarjeta', /6 tarjetas de Trello \(respaldo del 03\/10\/2026\)/.test(r.info) &&
    /6\s*ATC en el panel/.test(r.txt) && /1\s*ya completas/.test(r.txt) && /3\s*encontradas por el celular/.test(r.txt) && /1\s*solo por el nombre/.test(r.txt) && /1\s*sin tarjeta/.test(r.txt), r.txt.slice(0,400));
  chk('por el celular: motivo, fecha y detalle propuestos y TILDADOS', r.a1.join()==='true,Hundimiento,true,2021-09-13,true', r.a1);
  chk('a la que ya tenía motivo y detalle solo se le propone la fecha', r.a2.join()==='false,true,2022-05-11', r.a2);
  chk('solo por el nombre: propuesto pero SIN tildar; la fecha sin día queda vacía y lo dice', r.a3.join()==='false,Retapizado / costura,false,' && /sin el día: ponelo si lo sabés/.test(r.txt), r.a3);
  chk('una compra POSTERIOR a la ATC no se propone (y lo dice)', r.a4.join()==='false,,true' && /es posterior a la ATC: no se pone/.test(r.txt), r.a4);
  chk('la completa no aparece; la sin tarjeta, en su lista con lo que le falta', !r.a6 && /ATC 10-005 NADIE CONOCIDO \(falta motivo, fecha de compra, detalle\)/.test(r.txt), r.txt.slice(-300));
  chk('el botón cuenta las ATC tildadas (3: a1, a2, a4)', /\(3 ATC\)/.test(r.guardar), r.guardar);

  /* ---- 4. guardar ---- */
  r = await page.evaluate(async () => {
    /* mientras se revisaba, alguien le puso el motivo a a1 desde otro lado: no se pisa */
    var p1=findById('a1'); mergeAtcDatos(p1, { mot:'Otro' });
    atctGuardar();
    for(var i=0;i<50 && ATCT.ocupado;i++) await new Promise(function(ok){ setTimeout(ok, 50); });
    var A=function(id){ var a=atcDe(findById(id))||{}; return [a.mot||'', a.fcom||'', a.det||'', a.tre||''].join('|'); };
    return { a1:A('a1'), a2:A('a2'), a3:A('a3'), a4:A('a4'), n:__guardados.length, ids:__guardados.map(function(x){ return x.id; }).join(), t:(document.getElementById('toast')||{}).textContent||'' };
  });
  chk('a1: el motivo que pusieron mientras tanto NO se pisa; la fecha y el detalle sí, con el enlace de la tarjeta',
    /^Otro\|2021-09-13\|El colchón está UNDIDO/.test(r.a1) && /\|https:\/\/trello\.com\/c\/AAA111\/1-atc-juan$/.test(r.a1), r.a1);
  chk('a2: solo la fecha (el motivo y el detalle que tenía quedan)', r.a2==='Ruido|2022-05-11|ya escrito|https://trello.com/c/BBB222/2-atc-ana', r.a2);
  chk('a3 (solo por el nombre, sin tildar) no se toca; a4 solo el motivo y el detalle (la fecha posterior no)', r.a3==='|||' && /^Tela \/ pillow\|\|la tela tiene bolitas/.test(r.a4), [r.a3, r.a4]);
  chk('se guardaron 3 ATC, de a una, y lo dice', r.n===3 && r.ids==='a1,a2,a4' && /Completadas 3 ATC/.test(r.t), r);

  r = await page.evaluate(async () => {
    var i=ATCT.filas.findIndex(function(x){ return x.p.id==='a3'; }), el=document.getElementById('atct-f'+i);
    var c=el.querySelector('input[type=checkbox][data-k="mot"]'); c.checked=true;
    var d=el.querySelector('[data-c="fcom"]'); d.value='2022-06-15'; atctTocar(d);
    atctGuardar();
    for(var k=0;k<50 && ATCT.ocupado;k++) await new Promise(function(ok){ setTimeout(ok, 50); });
    var a=atcDe(findById('a3'))||{};
    return { a3:[a.mot, a.fcom, a.det||'', a.tre].join('|'), n:__guardados.length, rest:ATCT.filas.filter(function(x){ return x.falta.length && x.t; }).map(function(x){ return x.p.id; }).join() };
  });
  chk('tildando la del nombre a mano y poniendo el día, se guarda eso (el detalle sin tildar no)', r.a3==='Retapizado / costura|2022-06-15||https://trello.com/c/CCC333/3-atc-luis' && r.n===4, r);
  chk('después de guardar, la lista se rehace con lo que sigue faltando', r.rest.indexOf('a2')<0, r.rest);

  /* ---- 5. lo leído de los ADJUNTOS de cada tarjeta (§4lf-b: fotos con Claude y Excel, `atc-trello-adjuntos.json`) ---- */
  r = await page.evaluate(() => {
    var t=atctSumarAdjuntos({ tit:'x', cels:['70000009'], compra:null, fecha:'', mot:null, det:'', nom:[] },
      { cels:['7012-3456', '70000009'], fcom:'', fcomTxt:'junio 2022', fuente:'la foto «a.jpg»', reclamo:'  suenan   los resortes del medio', cliente:'Pedro Inventado Suarez', creada:'2026-09-30' });
    var u=atctSumarAdjuntos({ tit:'y', cels:[], compra:{ f:'2021-01-02', txt:'compro 02/01/2021' }, fecha:'2026-10-01', mot:{ mot:'Patas', txt:'PATA' }, det:'escrito', nom:['ANA'] },
      { cels:[], fcom:'2019-05-05', fcomTxt:'05/05/2019', fuente:'la factura «f.jpg»', reclamo:'se hundió', cliente:'Otra', creada:'2026-09-01' });
    var v=atctSumarAdjuntos({ tit:'z', cels:[], compra:{ f:'', txt:'COMPRO 2024' }, fecha:'', mot:null, det:'', nom:[] }, { fcom:'2024-03-03', fcomTxt:'03/03/2024', fuente:'la factura «g.jpg»' });
    return { t:t, u:u, v:v.compra };
  });
  chk('adjunto: suma los celulares, el reclamo, el motivo, el nombre y el día; mes y año solos quedan como texto (de qué archivo sale)',
    r.t.cels.join()==='70000009,70123456' && r.t.compra && r.t.compra.f==='' && r.t.compra.txt==='junio 2022' && r.t.compra.de==='la foto «a.jpg»' &&
    r.t.det==='suenan los resortes del medio' && r.t.mot && r.t.mot.mot==='Resortes' && r.t.mot.de==='la foto «a.jpg»' && r.t.nom.join(' ')==='PEDRO INVENTADO SUAREZ' && r.t.fecha==='2026-09-30', r.t);
  chk('adjunto: lo que el texto de la tarjeta ya dice NO se reemplaza (fecha entera, motivo, detalle, nombre, día)',
    r.u.compra.f==='2021-01-02' && !r.u.compra.de && r.u.mot.mot==='Patas' && r.u.det==='escrito' && r.u.nom.join()==='ANA' && r.u.fecha==='2026-10-01', r.u);
  chk('adjunto: con «COMPRO 2024» en el texto (sin día), la fecha entera de la factura sí entra', r.v.f==='2024-03-03' && r.v.de==='la factura «g.jpg»', r.v);

  await page.evaluate(() => {
    atctCerrar(); __guardados=[];
    var ts=function(f){ return new Date(f+'T10:00:00-04:00').getTime(); };
    var A=function(id, oc, entro, cel, cli, atc){ return { id:id, oc:oc, fecha:'2026-10-20', turno:'AM', cliente:cli, vendedor:'Maria Flores', celular:cel, ts:ts(entro), productos:[{ desc:'TITANIO', medida:'140x190', cant:1, atc:atc }] }; };
    STATE=[
      A('b1','ATC 10-011','2026-10-02','70111222','JUAN ROCA', { mot:'Hundimiento', det:'escrito', fcom:'' }),     // el texto dice 13/09/2021: gana al adjunto
      A('b3','ATC 10-013','2026-10-05','60000003','PEDRO GOMEZ', { mot:'x', det:'y', fcom:'' }),                     // solo el celular del Excel la encuentra
      A('b5','ATC 10-015','2026-10-07','69999998','NADIE CONOCIDO', { mot:'', det:'', fcom:'' })                     // el celular y la fecha de la factura
    ];
    atctTraerAdj=function(){ return Promise.resolve({ generado:'2026-10-15T23:20:00Z', tarjetas:[
      { sl:'AAA111', fcom:'2020-01-01', fcomTxt:'01/01/2020', fuente:'la foto «x.jpg»', cels:[], cliente:'', reclamo:'' },
      { sl:'CCC333', fcom:'2022-06-20', fcomTxt:'20/06/2022', fuente:'el Excel «ATC Luis.xlsx»', cels:['60000003'], cliente:'', reclamo:'' },
      { sl:'FFF666', fcom:'2023-04-10', fcomTxt:'10/04/2023', fuente:'la factura «f.jpg»', cels:['69999998'], cliente:'NADIE CONOCIDO', reclamo:'' },
      { sl:'ZZZ999', fcom:'2023-01-01', fcomTxt:'01/01/2023', fuente:'la foto', cels:['60000003'], cliente:'', reclamo:'' }       // una tarjeta que el CSV no trae: no se usa
    ] }); };
    abrirAtcTrello();   /* (§4lm) el botón se sacó de la barra: la ventana sigue */
  });
  await page.waitForTimeout(200);
  r = await page.evaluate(() => {
    var f=function(id){ var i=ATCT.filas.findIndex(function(x){ return x.p.id===id; }); return document.getElementById('atct-f'+i); };
    var cb=function(id, k){ var el=f(id); var c=el && el.querySelector('input[type=checkbox][data-k="'+k+'"]'); return c ? c.checked : null; };
    var val=function(id, k){ var el=f(id); var c=el && el.querySelector('[data-c="'+k+'"]'); return c ? c.value : null; };
    return { info:document.getElementById('atct-info').textContent, b1:[val('b1','fcom'), f('b1').innerText], b3:[cb('b3','fcom'), val('b3','fcom'), f('b3').innerText],
      b5:[cb('b5','fcom'), val('b5','fcom'), cb('b5','mot'), val('b5','mot')] };
  });
  chk('arriba dice que se leyeron los adjuntos y cuándo (3 tarjetas del respaldo… 4 con fecha en el archivo)', /📎 fotos y Excel adjuntos leídos el 15\/10\/2026 \(4 con la fecha de compra\)/.test(r.info), r.info);
  chk('la fecha escrita en la tarjeta gana a la de un adjunto', r.b1[0]==='2021-09-13' && !/📎/.test(r.b1[1]), r.b1);
  chk('con el celular del Excel se encuentra (tildada) y la fecha dice de qué archivo sale', r.b3[0]===true && r.b3[1]==='2022-06-20' && /📎 En el Excel «ATC Luis\.xlsx» dice «20\/06\/2022»/.test(r.b3[2]) && /mismo celular/.test(r.b3[2]), r.b3);
  chk('la que no tenía tarjeta ahora la tiene por el celular de la factura: fecha de la factura y motivo del texto', r.b5.join()==='true,2023-04-10,true,Cotización', r.b5);
  r = await page.evaluate(async () => {
    atctGuardar();
    for(var i=0;i<50 && ATCT.ocupado;i++) await new Promise(function(ok){ setTimeout(ok, 50); });
    var a=atcDe(findById('b5'))||{};
    return [a.fcom, a.mot, a.tre].join('|');
  });
  chk('se guarda con la fecha del adjunto y el enlace de su tarjeta', r==='2023-04-10|Cotización|https://trello.com/c/FFF666/6-atc-otro', r);
  r = await page.evaluate(() => { atctTomarAdj(null); return [ATCT.adjPor, ATCT.adj, atctAdjTxt()]; });
  chk('sin el archivo de los adjuntos sigue con el texto y lo dice', r[0]===null && r[1]===null && /todavía sin leer las fotos/.test(r[2]), r);

  /* ---- 6. 📥 LAS QUE ESTÁN EN TRELLO Y NO EN EL PANEL (15/10, §4lf-c; dueño: «las que están en Trello y no en el panel deberían
     estar»). Con el historial de cada tarjeta (`atc-trello-historial.json`): cuándo se creó y cuándo pasó por cada lista. ---- */
  const CSV2 = '﻿Tablero,Lista,Tarjeta,Descripcion,Vencimiento,Estado,Completada,Etiquetas,Asignado_a,Archivada,URL\n'+[
    fila('ATC DEVUELTAS LOG','ATCMARIA - JUAN ROCA','TELEFONO 7011-1222 | FECHA DE COMPRA 13/09/2021 | se hundió el colchón en el centro','No','https://trello.com/c/AAA111/1-atc-juan'),
    fila('ATC DEVUELTAS LOG','ATC MIRIAN -- LEONELA INVENTADA','ATC MIRIAN LEONELA INVENTADA |  | 78449545 |  | TIT ICE 2.5 PLZ |  | ESTA UNDIDO LOS LATERALES Y DEMASIADO BLANDO','No','https://trello.com/c/G01/1-atc'),
    fila('ATC EN PRODUCCION','ATC ISABEL - PEDRO PRUEBA','TELEFONO 70000222 | LINEA\ttitanio\tMODELO\tICE\tplaza\t2plz | SUENA UN RESORTE del medio | COMPRO EL 05/10/2026','No','https://trello.com/c/G02/2-atc'),
    fila('ATC LISTAS PARA DEVOLVER PROD','ATC MARIA - ANA LUZMILA','TELEFONO 70000333 | ORO ORTOPEDICO 3.5 PLZ | la tela tiene bolitas','No','https://trello.com/c/G03/3-atc'),
    fila('ATC SOLICITADAS COM','ATC CAROLA - EVA MARGARITA','TELEFONO 70000444 | compro 2024 | las patas del somier están rotas','No','https://trello.com/c/G04/4-atc'),
    fila('ATC DEVUELTAS LOG','ATCMARIA EVA MARGARITA','TELEFONO 70000444 | patas rotas','Sí','https://trello.com/c/G05/5-atc'),
    fila('POST VENT (COMERCIAL)','ATC MARIA - RUTH MONTEAGUDO','TELEFONO 70000666 | no tiene garantia, hacer cotizacion','No','https://trello.com/c/G06/6-atc'),
    fila('POST VENT (COMERCIAL)','ATC MIRIAN - OSCAR VILLALBA','TELEFONO 70000777 | SEMI ORTOPEDICO 2.5 PLZ / se hunde','No','https://trello.com/c/G07/7-atc'),
    fila('ATC SOLICITADAS COM','ATC MIRIAN - SIN HISTORIA','TELEFONO 70000888 | cruje la base','No','https://trello.com/c/G08/8-atc'),
    fila('ATC SOLICITADAS COM','ATC MARIA - OLVIDADA ENTRETELA','TELEFONO 70000999 | se hundió','No','https://trello.com/c/G09/9-atc'),
    fila('ATC EN PRODUCCION','Cliente Alberto Pareja (Ejemplo)','Fecha solicitada: |  | Vendedora: |  | Adjuntar solicitud de Garantía (WORD)','Sí','https://trello.com/c/G10/10-atc'),
    fila('ATC DEVUELTAS LOG','ATC MARIA - ANA LUZMILA','TELEFONO 70000333 | TITANIO ICE 2 PLZ | se hundió el centro','No','https://trello.com/c/G11/11-atc')
  ].join('\n')+'\n';
  const ms = f => new Date(f+'T10:00:00-04:00').getTime();
  const HIST = { generado:'2026-10-15T11:02:00-04:00', tablero:'x', tarjetas:[
    { sl:'AAA111', creada:'2026-09-30', creadaMs:ms('2026-09-30'), lista:'ATC DEVUELTAS LOG', archivada:false, ultima:'2026-10-10', pasos:[] },
    { sl:'G01', creada:'2026-03-02', creadaMs:ms('2026-03-02'), lista:'ATC DEVUELTAS LOG', archivada:false, ultima:'2026-03-26', pasos:[
      { l:'ATC SOLICITADAS COM', f:'2026-03-02' }, { l:'ATC EN PRODUCCION', f:'2026-03-05' }, { l:'ATC LISTAS PARA DEVOLVER PROD', f:'2026-03-20' }, { l:'ATC DEVUELTAS LOG', f:'2026-03-25' } ] },
    { sl:'G02', creada:'2026-09-28', creadaMs:ms('2026-09-28'), lista:'ATC EN PRODUCCION', archivada:false, ultima:'2026-10-01', pasos:[ { l:'ATC EN PRODUCCION', f:'2026-10-01' } ] },
    { sl:'G03', creada:'2026-09-10', creadaMs:ms('2026-09-10'), lista:'ATC LISTAS PARA DEVOLVER PROD', archivada:false, ultima:'2026-10-05', pasos:[ { l:'ATC LISTAS PARA DEVOLVER PROD', f:'2026-10-05' } ] },
    { sl:'G04', creada:'2026-10-08', creadaMs:ms('2026-10-08'), lista:'ATC SOLICITADAS COM', archivada:false, ultima:'2026-10-08', pasos:[ { l:'ATC SOLICITADAS COM', f:'2026-10-08' } ] },
    { sl:'G05', creada:'2026-01-05', creadaMs:ms('2026-01-05'), lista:'ATC DEVUELTAS LOG', archivada:true, ultima:'2026-01-20', pasos:[ { l:'ATC DEVUELTAS LOG', f:'2026-01-20' } ] },
    { sl:'G06', creada:'2026-04-01', creadaMs:ms('2026-04-01'), lista:'POST VENT (COMERCIAL)', archivada:false, ultima:'2026-04-02', pasos:[ { l:'POST VENT (COMERCIAL)', f:'2026-04-01' } ] },
    { sl:'G09', creada:'2025-12-10', creadaMs:ms('2025-12-10'), lista:'ATC SOLICITADAS COM', archivada:false, ultima:'2026-01-05', pasos:[ { l:'ATC SOLICITADAS COM', f:'2025-12-10' } ] },
    { sl:'G10', creada:'2025-11-19', creadaMs:ms('2025-11-19'), lista:'ATC EN PRODUCCION', archivada:true, ultima:'2025-11-19', pasos:[] },
    { sl:'G11', creada:'2026-01-10', creadaMs:ms('2026-01-10'), lista:'ATC DEVUELTAS LOG', archivada:false, ultima:'2026-01-30', pasos:[ { l:'ATC DEVUELTAS LOG', f:'2026-01-30' } ] },
    { sl:'G07', creada:'2026-02-15', creadaMs:ms('2026-02-15'), lista:'POST VENT (COMERCIAL)', archivada:false, ultima:'2026-03-01', pasos:[ { l:'ATC DEVUELTAS LOG', f:'2026-02-28' }, { l:'POST VENT (COMERCIAL)', f:'2026-03-01' } ] }
  ] };
  await page.evaluate(({ CSV2, HIST }) => {
    atctCerrar(); __guardados=[];
    var ts=function(f){ return new Date(f+'T10:00:00-04:00').getTime(); };
    STATE=[ { id:'p1', oc:'ATC 10-001', fecha:'2026-10-20', turno:'AM', cliente:'JUAN ROCA', vendedor:'Maria Flores', celular:'70111222', ts:ts('2026-10-02'),
              productos:[{ desc:'TITANIO', medida:'140x190', cant:1, atc:{ mot:'Hundimiento', det:'x', fcom:'2021-09-13' } }] } ];
    atctTraerCsv=function(){ return Promise.resolve(CSV2); };
    atctTraerAdj=function(){ return Promise.resolve({ generado:'2026-10-15T15:07:00Z', tarjetas:[
      { sl:'G01', fcom:'2021-12-23', fcomTxt:'jueves, 23 de diciembre de 2021', fuente:'el certificado de garantía «garantia.jpg»', cels:['78449545'], cliente:'LEONELA INVENTADA', reclamo:'' } ] }); };
    atctTraerHist=function(){ return Promise.resolve(HIST); };
    abrirAtcTrello();   /* (§4lm) el botón se sacó de la barra: la ventana sigue */
  }, { CSV2, HIST });
  await page.waitForTimeout(250);
  r = await page.evaluate(() => {
    var F={}; ATCT.fuera.forEach(function(x){ F[x.sl]={ est:x.est, entro:x.entro, r:x.r, dev:x.dev, ent:x.ent, fcom:x.fcom, vend:x.vend, prod:x.prod, cli:x.cliente, tilde:x.tilde, nota:x.nota }; });
    return { F:F, sls:ATCT.fuera.map(function(x){ return x.sl; }).join(), txt:document.getElementById('atct-body').innerText, btn:document.getElementById('atct-traer').textContent,
      basura:(ATCT.basura||[]).map(function(b){ return atctSl(b.t.url)+':'+b.por; }).join() };
  });
  chk('se ofrecen las que NO están en el panel (no la de Juan Roca, que ya está por el celular), de la más nueva a la más vieja',
    r.sls.indexOf('AAA111')<0 && /^G04,G02,G03,G06,G01,G07,G11,G05,G09/.test(r.sls) && r.sls.indexOf('G08')>=0, r.sls);
  chk('la tarjeta de EJEMPLO de Trello no se ofrece (y arriba se dice cuántas no son una ATC)', r.sls.indexOf('G10')<0 && /^G10:la tarjeta de ejemplo/.test(r.basura) && /No se ofrecen 1 tarjetas que no son una ATC/.test(r.txt), r.basura);
  chk('el mismo cliente con OTRO reclamo meses antes (otro producto) es otra ATC: viene tildada, no «parece la misma»', r.F.G11 && r.F.G11.tilde && !r.F.G11.nota && r.F.G11.est==='cerrada', r.F.G11);
  chk('devuelta: cerrada el día que entró a «DEVUELTAS» (25/03), recogida el 05/03, lista el 20/03; entró el 02/03 (creación de la tarjeta)',
    r.F.G01.est==='cerrada' && r.F.G01.ent==='2026-03-25' && r.F.G01.r==='2026-03-05' && r.F.G01.dev==='2026-03-20' && r.F.G01.entro==='2026-03-02', r.F.G01);
  chk('la fecha de COMPRA sale del certificado de garantía (23/12/2021), no de la creación; vendedora, cliente y producto de la tarjeta',
    r.F.G01.fcom==='2021-12-23' && r.F.G01.vend==='Mirian Salazar' && r.F.G01.cli==='LEONELA INVENTADA' && r.F.G01.prod==='TIT ICE 2.5 PLZ', r.F.G01);
  chk('en producción: en fábrica desde el 01/10; una «compra» posterior a la ATC no se pone; «LINEA… MODELO…» = el producto',
    r.F.G02.est==='fabrica' && r.F.G02.r==='2026-10-01' && r.F.G02.fcom==='' && r.F.G02.prod==='TITANIO ICE' && r.F.G02.vend==='Isabel Robledo', r.F.G02);
  chk('lista para devolver desde el 05/10; solicitada = por recoger (y «compro 2024» sin día no inventa la fecha)',
    r.F.G03.est==='lista' && r.F.G03.dev==='2026-10-05' && r.F.G04.est==='sinrecoger' && r.F.G04.fcom==='', [r.F.G03, r.F.G04]);
  chk('vienen tildadas G01, G02, G03, G04 y la de POST VENT que sí se devolvió (G07); sin tildar: la archivada, la POST VENT sin devolver y la sin historial',
    r.F.G01.tilde && r.F.G02.tilde && r.F.G03.tilde && r.F.G04.tilde && r.F.G07.tilde && r.F.G07.est==='cerrada' && r.F.G07.ent==='2026-02-28' &&
    !r.F.G05.tilde && /archivada/.test(r.F.G05.nota) && !r.F.G06.tilde && /POST VENT/.test(r.F.G06.nota) && r.F.G08 && !r.F.G08.tilde && /sin el historial/.test(r.F.G08.nota), r.F);
  chk('una abierta que en Trello no se movió en más de 60 días se ofrece SIN tildar y lo dice', r.F.G09 && r.F.G09.est==='sinrecoger' && !r.F.G09.tilde && /sin movimiento desde el 05\/01\/26/.test(r.F.G09.nota), r.F.G09);
  chk('arriba lo explica: el día en que se creó la tarjeta, la fecha de compra de la tarjeta o sus adjuntos, sin día de viaje; y el botón cuenta 5',
    /En Trello y no en el panel/.test(r.txt) && /creó la tarjeta/.test(r.txt) && /certificado de garantía/.test(r.txt) && /sin día de viaje/i.test(r.txt) && /Traer al panel \(6 ATC\)/.test(r.btn), r.btn);
  r = await page.evaluate(() => { atctFueraTodas(false); var a=document.getElementById('atct-traer').textContent; atctFueraTodas('rec'); return [a, document.getElementById('atct-traer').textContent, typeof document.querySelector('[onclick*="atctFueraTodas(true)"]')]; });
  chk('«Destildar todas» y «Tildar las recomendadas» (vuelve a las 6 propuestas); ya no hay «Tildar todas»', /\(0 ATC\)/.test(r[0]) && /\(6 ATC\)/.test(r[1]) && r[2]==='object' && !(await page.evaluate(() => !!document.querySelector('[onclick*="atctFueraTodas(true)"]'))), r);

  r = await page.evaluate(async () => {
    /* el avance se ve mientras guarda: un apiSave lento para mirarlo a la mitad */
    var lento=apiSave, mitad=null; apiSave=function(p){ return new Promise(function(ok){ setTimeout(function(){ ok(lento(p)); }, 60); }); };
    atctTraer();
    await new Promise(function(ok){ setTimeout(ok, 100); });
    mitad={ av:(document.getElementById('atct-av-t')||{}).textContent||'', btn:document.getElementById('atct-traer').textContent, va:[].map.call(document.querySelectorAll('.atct-fu .t4.va'), function(e){ return e.textContent; }).join('|') };
    for(var i=0;i<120 && ATCT.ocupado;i++) await new Promise(function(ok){ setTimeout(ok, 50); });
    apiSave=lento;
    window.__mitad=mitad;
    var G=function(sl){ var p=findById('atc-tre-'+sl); if(!p) return null; var a=atcDe(p)||{};
      return { oc:p.oc, fecha:p.fecha, turno:p.turno, ent:p.entregado, est:atcEstado(p), dias:atcDias(p), entro:atcEntro(p), a:a, vend:p.vendedor, cli:p.cliente, cel:p.celular, prod:p.productos[0].desc, obs:p.observaciones }; };
    return { ids:__guardados.map(function(x){ return x.id; }).join(), G11:G('G11'), G01:G('G01'), G02:G('G02'), G03:G('G03'), G04:G('G04'), G07:G('G07'), G05:G('G05'),
      sinFecha:__guardados.every(function(x){ return x.fecha===''; }), resto:ATCT.fuera.map(function(x){ return x.sl; }).join(), t:(document.getElementById('toast')||{}).textContent||'',
      mitad:window.__mitad, fin:(document.getElementById('atct-av-t')||{}).textContent||'' };
  });
  chk('«Traer al panel» guarda las 6 tildadas, de la más vieja a la más nueva, y lo dice', r.ids==='atc-tre-G11,atc-tre-G07,atc-tre-G01,atc-tre-G03,atc-tre-G02,atc-tre-G04' && /Traídas 6 ATC de Trello/.test(r.t), [r.ids, r.t]);
  chk('mientras guarda SE VE: «Guardando en la planilla: N de 6», el botón «⏳ Guardando N de 6…» y el renglón «⏳ guardando…»',
    /Guardando en la planilla: \d de 6/.test(r.mitad.av) && /⏳ Guardando \d de 6…/.test(r.mitad.btn) && /guardando…/.test(r.mitad.va), r.mitad);
  chk('al terminar lo dice: «Terminó: 6 guardadas en la planilla»', /Terminó: 6 guardadas en la planilla/.test(r.fin), r.fin);
  chk('el N° de ATC es del mes en que ENTRÓ (enero, febrero, marzo, septiembre ×2, octubre después de la 10-001 que ya estaba)',
    r.G11 && r.G11.oc==='ATC 01-001' && r.G07.oc==='ATC 02-001' && r.G01.oc==='ATC 03-001' && r.G03.oc==='ATC 09-001' && r.G02.oc==='ATC 09-002' && r.G04.oc==='ATC 10-002', [r.G07.oc, r.G01.oc, r.G03.oc, r.G02.oc, r.G04.oc]);
  chk('todas SIN día de viaje ni turno (no ocupan cupo, el bot no les manda nada)', r.sinFecha && r.G01.turno==='', r.sinFecha);
  chk('la devuelta queda ✅ Entregada: entró el 02/03, 23 días de circuito, recojo 05/03, compra 23/12/2021 y el enlace de la tarjeta',
    r.G01.est==='cerrada' && r.G01.ent===true && r.G01.entro==='2026-03-02' && r.G01.dias===23 && r.G01.a.rec==='2026-03-05' && r.G01.a.fcom==='2021-12-23' &&
    r.G01.a.tre==='https://trello.com/c/G01/1-atc' && r.G01.a.mot==='Hundimiento' && r.G01.cel==='78449545' && r.G01.vend==='Mirian Salazar' && /Traída de Trello/.test(r.G01.obs), r.G01);
  chk('en producción → 🏭 En fábrica; lista → 📦 Lista; solicitada → 🚚 Por recoger (sin ✅)',
    r.G02.est==='fabrica' && r.G02.ent===true && r.G03.est==='lista' && r.G04.est==='sinrecoger' && r.G04.ent===false, [r.G02.est, r.G03.est, r.G04.est]);
  chk('la archivada no se trajo y, con su gemela ya en el panel (mismo celular que G04), deja de ofrecerse; quedan la POST VENT sin devolver y la sin historial',
    r.G05===null && r.resto.split(',').sort().join()==='G06,G08,G09', r.resto);
  r = await page.evaluate(() => {
    var F=atctCruzar(ATCT.tarj).filter(function(x){ return String(x.p.id).indexOf('atc-tre-')===0; });
    var D=atciDatos('todas');
    return { cruce:F.map(function(x){ return x.p.id+':'+(x.t ? atctSl(x.t.url) : '—'); }).join(), n:D.n, cerr:D.cerr.length, tRec:D.tRec.length };
  });
  chk('cada traída se cruza con SU tarjeta (por el enlace) al completar', r.cruce.split(',').every(function(s){ var m=s.match(/atc-tre-(\w+):(\w+)/); return m && m[1]===m[2]; }), r.cruce);
  chk('el informe «Todas» las cuenta: 7 ATC (1 + 6), 3 cerradas; el tramo «hasta el recojo» solo con el recojo de verdad de Trello (G01, no G07 ni G11)', r.n===7 && r.cerr===3 && r.tRec===1, r);
  r = await page.evaluate(async () => {
    /* 🗂️ las ya traídas: se listan, y una que no debía entrar (la de ejemplo) se saca con el borrado de siempre */
    var ej=atctNuevaAtc({ t:{ tit:'Cliente Alberto Pareja (Ejemplo)', url:'https://trello.com/c/G10/10-atc', cels:[], nom:[], mot:null, det:'' }, sl:'G10', lista:'ATC EN PRODUCCION', arch:true,
      entro:'2025-11-19', ms:new Date('2025-11-19T10:00:00-04:00').getTime(), est:'fabrica', r:'2025-11-19', cliente:'ALBERTO PAREJA EJEMPLO' });
    upsert(ej); atctPintar();
    var tx=document.getElementById('atct-body').innerText, malas=atctTraidas().filter(function(x){ return x.por; }).map(function(x){ return x.p.id+':'+x.por; }).join();
    /* la planilla todavía la tiene hasta que se borra (el doble de apiList devolvía lo de la pantalla, que ya la sacó) */
    var enHoja=JSON.parse(JSON.stringify(ej)), listaVieja=apiList;
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)).concat(__borrados.length ? [] : [enHoja]) }); };
    window.__borrados=[]; apiDelete=function(id){ __borrados.push(id); return Promise.resolve({ ok:true }); };
    atctSacarMalas();
    for(var i=0;i<60 && findById('atc-tre-G10');i++) await new Promise(function(ok){ setTimeout(ok, 50); });
    for(var j=0;j<60 && !__borrados.length;j++) await new Promise(function(ok){ setTimeout(ok, 50); });
    await new Promise(function(ok){ setTimeout(ok, 150); });
    apiList=listaVieja;
    return { tx:tx, malas:malas, borrados:__borrados.join(), sigue:!!findById('atc-tre-G10'), otras:atctTraidas().length, tx2:document.getElementById('atct-body').innerText };
  });
  chk('«🗂️ Ya traídas de Trello: 7 · 1 no deberían estar» con la de ejemplo marcada', /Ya traídas de Trello: 7 · 1 no deberían estar/.test(r.tx) && r.malas==='atc-tre-G10:la tarjeta de ejemplo de Trello', [r.malas, (r.tx.match(/Ya traídas[^\n]*/)||[''])[0]]);
  chk('«🗑 Sacar las que no son ATC» la borra en la planilla (con el borrado de siempre) y quedan las 6 buenas', r.borrados==='atc-tre-G10' && !r.sigue && r.otras===6 && /Ya traídas de Trello: 6/.test(r.tx2) && !/no deberían estar/.test(r.tx2), [r.borrados, r.sigue, r.otras, (r.tx2.match(/Ya traídas[^\n]*/)||[''])[0]]);
  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e => { console.error(e); process.exit(1); });
