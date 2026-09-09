/* 🏪 RPT — REPOSICIÓN DE TIENDA (§4dk)
   Pedido del dueño (09/09): *"necesitamos un 3er boton RPT (REPOSICION DE TIENDA) donde los
   vendedores coloquen los productos que requieren para sus tiendas y logistica pueda tenerlo
   en el panel y agendarlo. y una vez hecho se genere un excel para enviar por correo como te
   subí el archivo. y tb el botón de whatsapp"*.

   LO QUE ESTE TEST CUIDA POR ENCIMA DE TODO — las tres cosas que, si se rompen, rompen
   plata de verdad:
   1. Una reposición NO ES UNA VENTA. No puede aparecer en Contabilidad ni en el Cuadre:
      sumaría una plata que nunca entró y descuadraría la caja.
   2. …pero SÍ es mercadería que sale del depósito: el stock la tiene que cubrir como
      comprometida. Lo que NO puede es inventar rotación — el colchón que va a una sucursal
      no se vendió, solo cambió de lugar; contarlo como venta lo contaría dos veces (ahora y
      cuando la tienda lo venda) y el panel mandaría a fabricar el doble.
   3. El Excel tiene que salir CON LA FORMA DEL FORMATO que el dueño manda hoy por correo:
      mismas filas, mismos títulos, misma lista Reposición/Adicional y los mismos correos.
      Si cambia la forma, logística no lo reconoce y vuelve al papel. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1600,height:1000}, timezoneId:'America/La_Paz' });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.route(/^https?:/, r=>r.abort());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  /* Igual que en las otras suites: si la versión que se está probando no tiene lo nuevo,
     el test REPRUEBA en rojo diciendo qué falta, en vez de reventar. */
  await page.evaluate(() => {
    window._el=function(id){
      return document.getElementById(id) || { style:{}, value:'', textContent:'NO EXISTE #'+id,
        className:'', classList:{contains:function(){return false;},add:function(){},remove:function(){}},
        querySelectorAll:function(){return [];}, querySelector:function(){return null;}, addEventListener:function(){} };
    };
  });

  const base = () => page.evaluate(async () => {
    document.getElementById('conn-form').style.display='none';
    CONNECTED=true; UNLOCKED=true;
    window._pl=[];
    apiSave=function(rec){ var g=JSON.parse(JSON.stringify(rec));
      window._pl=window._pl.filter(function(x){return x.id!==g.id;}).concat([g]); return Promise.resolve({ok:true}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(window._pl))}); };
    STATE=[]; window._pl=[]; saveMirror();
  });

  /* Carga una RPT por el formulario, como lo haría una vendedora. */
  const cargar = (o) => page.evaluate(async (o) => {
    showView('form'); resetForm();
    /* La fecha, al primer día entregable: sin esto queda en «mañana» y los sábados eso es
       domingo → «No se agenda los DOMINGOS» y toda la suite en rojo (regla del LEEME). */
    var _d=new Date(), _f; do { _d.setDate(_d.getDate()+1); _f=isoLocal(_d); } while(diaDomingo(_f));
    document.getElementById('f-fecha').value=_f; segSet('f-turno','AM');
    segSet('f-doc-tipo', o.tipo||'RPT'); setDocTipo();
    document.getElementById('f-vendedor').value=o.vendedor||'Mirian Salazar'; applyVendedorLite();
    if((o.tipo||'RPT')==='RPT'){ _el('f-rpt-suc').value=o.suc||'Mia Plaza'; sucursalElegida(); }
    else { document.getElementById('f-cliente').value=o.cliente||'CLIENTE';
           document.getElementById('f-celular').value='70000000';
           document.getElementById('f-nota').value=o.nota||'1'; }
    if(!document.getElementById('f-zona').value) document.getElementById('f-zona').value='Norte';
    (o.prods||[{d:'COLCHON TITANIO LATEX',m:'140x190',c:'CH1129',n:2,t:'Reposición',ob:''}]).forEach(function(x,i){
      if(i) addProdRow();
      var cards=document.querySelectorAll('#f-productos .prod-card'), card=cards[cards.length-1];
      card.querySelector('.prod-desc').value=x.d;
      var md=card.querySelector('.prod-medida'); if(md && x.m) md.value=x.m;
      card.querySelector('.prod-codigo').value=x.c||'';
      card.querySelector('.prod-cant').value=String(x.n||1);
      var rt=card.querySelector('.prod-rtipo'); if(rt && x.t) rt.value=x.t;
      var ro=card.querySelector('.prod-robs'); if(ro && x.ob) ro.value=x.ob;
      if(x.precio){ var pi=card.querySelector('.prod-precio'); if(pi) pi.value=String(x.precio); }
    });
    submitPedido();
    await new Promise(r=>setTimeout(r,400));
    return { n:STATE.length, ultimo: STATE.length?STATE[0].id:null };
  }, o);

  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n── 1. El número: tres series, cada una por su cuenta ──');
  const num = await page.evaluate(() => {
    STATE=[];
    var mes=todayStr().slice(5,7);
    return {
      esRpt: esRPT('RPT 09-001'), noEsAtc: esATC('RPT 09-001')===false,
      tipo: ocTipoDe('RPT 09-001'), tipoAtc: ocTipoDe('ATC 09-001'), tipoOc: ocTipoDe('09-001'),
      sinPre: ocSinPre('RPT 09-007'),
      etiq: ocEtiq('RPT 09-001'), etiqOc: ocEtiq('09-001'),
      auto: ocAuto('RPT 09-001'),
      prim: nextOcMes(null,'RPT'), mes: mes
    };
  });
  chk('un N° que empieza con RPT es una reposición', num.esRpt===true, num.esRpt);
  chk('…y NO se confunde con una ATC', num.noEsAtc===true, num.noEsAtc);
  chk('ocTipoDe reconoce los tres tipos',
      num.tipo==='RPT' && num.tipoAtc==='ATC' && num.tipoOc==='OC',
      num.tipo+' / '+num.tipoAtc+' / '+num.tipoOc);
  chk('el prefijo se saca para comparar el correlativo', num.sinPre==='09-007', num.sinPre);
  chk('se muestra tal cual (ya trae su etiqueta), y la OC sí lleva «OC »',
      num.etiq==='RPT 09-001' && num.etiqOc==='OC 09-001', num.etiq+' / '+num.etiqOc);
  chk('el panel lo reconoce como número propio suyo (no escrito a mano)', num.auto===true, num.auto);
  chk('la primera reposición del mes es RPT MM-001', num.prim==='RPT '+num.mes+'-001', num.prim);

  const series = await page.evaluate(() => {
    var h=todayStr();
    STATE=[{id:'a',oc:'RPT '+h.slice(5,7)+'-001',fecha:h,ts:Date.now(),vendedor:'Mirian Salazar',productos:[]},
           {id:'b',oc:'ATC '+h.slice(5,7)+'-004',fecha:h,ts:Date.now(),vendedor:'Mirian Salazar',productos:[]},
           {id:'c',oc:h.slice(5,7)+'-009',       fecha:h,ts:Date.now(),vendedor:'Mirian Salazar',productos:[]}];
    return { rpt:nextOcMes(null,'RPT'), atc:nextOcMes(null,'ATC'), oc:nextOcMes(null,'OC'), m:h.slice(5,7) };
  });
  chk('⚠️ la serie RPT no la corren ni las OC ni las ATC',
      series.rpt==='RPT '+series.m+'-002', series.rpt);
  chk('…ni la RPT corre a las otras dos',
      series.atc==='ATC '+series.m+'-005' && series.oc===series.m+'-010',
      series.atc+' / '+series.oc);

  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n── 2. El formulario: qué se ve y qué desaparece ──');
  const form = await page.evaluate(() => {
    showView('form'); resetForm();
    var ver=function(id){ var e=document.getElementById(id); return !!e && e.style.display!=='none'; };
    var btn=[].slice.call(document.querySelectorAll('#f-doc-tipo button')).map(function(b){return b.dataset.val;});
    var antes={ rpt:ver('wrap-rpt'), cli:ver('wrap-cliente'), nota:ver('wrap-nota') };
    segSet('f-doc-tipo','RPT'); setDocTipo();
    var lb=(document.getElementById('f-oc-lb')||{}).childNodes;
    var card=document.querySelector('#f-productos .prod-card');
    var despues={ rpt:ver('wrap-rpt'), cli:ver('wrap-cliente'), nota:ver('wrap-nota'),
      cobro:ver('wrap-cobro-todo'), gar:ver('wrap-garantia'), fac:ver('wrap-factura'),
      atc:ver('wrap-atc-motivo'),
      rotulo: lb?String(lb[0].nodeValue||'').trim():'(sin rótulo)',
      lineaTipo: !!card && card.querySelector('.prod-rpt') && card.querySelector('.prod-rpt').style.display!=='none',
      lineaPrecio: !!card && card.querySelector('.prod-precio-w') && card.querySelector('.prod-precio-w').style.display!=='none',
      tipos: !!card && card.querySelector('.prod-rtipo') ? [].slice.call(card.querySelectorAll('.prod-rtipo option')).map(function(o){return o.textContent;}) : [],
      sucs: [].slice.call(document.querySelectorAll('#dl-sucursales option')).map(function(o){return o.value;}) };
    // y al volver a OC, todo vuelve a su lugar
    segSet('f-doc-tipo','OC'); setDocTipo();
    var vuelta={ rpt:ver('wrap-rpt'), cli:ver('wrap-cliente'), nota:ver('wrap-nota'),
      lineaPrecio: !!card && card.querySelector('.prod-precio-w') && card.querySelector('.prod-precio-w').style.display!=='none' };
    return {btn:btn, antes:antes, despues:despues, vuelta:vuelta};
  });
  chk('hay un TERCER botón RPT junto a OC y ATC',
      form.btn.join(',')==='OC,ATC,RPT', form.btn.join(','));
  chk('de entrada (OC) el bloque de reposición está escondido y el cliente se ve',
      form.antes.rpt===false && form.antes.cli===true, JSON.stringify(form.antes));
  chk('al tocar 🏪 RPT aparece el bloque de la reposición', form.despues.rpt===true, form.despues.rpt);
  chk('…y el bloque de la ATC sigue escondido (son excluyentes)', form.despues.atc===false, form.despues.atc);
  chk('el N° pasa a llamarse «N° de pedido»', form.despues.rotulo==='N° de pedido', form.despues.rotulo);
  chk('⚠️ desaparece «Nombre del cliente»: el destino es una SUCURSAL',
      form.despues.cli===false, form.despues.cli);
  chk('⚠️ desaparecen nota de venta y cobro (no se está vendiendo nada)',
      form.despues.nota===false && form.despues.cobro===false,
      form.despues.nota+' / '+form.despues.cobro);
  chk('…y también garantía y facturación', form.despues.gar===false && form.despues.fac===false,
      form.despues.gar+' / '+form.despues.fac);
  chk('cada renglón muestra Tipo y Observaciones', form.despues.lineaTipo===true, form.despues.lineaTipo);
  chk('…y esconde el precio', form.despues.lineaPrecio===false, form.despues.lineaPrecio);
  chk('el Tipo ofrece exactamente Reposición y Adicional, como el formato en papel',
      form.despues.tipos.join(',')==='Reposición,Adicional', form.despues.tipos.join(','));
  chk('la sucursal trae sugerencias', form.despues.sucs.length>=4, form.despues.sucs.join(' · '));
  chk('volviendo a OC vuelve todo a su lugar',
      form.vuelta.rpt===false && form.vuelta.cli===true && form.vuelta.nota===true && form.vuelta.lineaPrecio===true,
      JSON.stringify(form.vuelta));

  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n── 3. Guardarla: qué queda en la planilla ──');
  await base();
  const g = await cargar({ suc:'Mia Plaza', vendedor:'Mirian Salazar', prods:[
    {d:'COLCHON TITANIO LATEX',m:'140x190',c:'CH1129',n:2,t:'Reposición',ob:''},
    {d:'Posa pie de colchon MILA',m:'',c:'',n:3,t:'Adicional',ob:'Para las camas de 2,5 plazas'}
  ]});
  chk('la reposición se guarda', g.n===1, 'pedidos: '+g.n);
  const rec = await page.evaluate(() => {
    var p=STATE[0]||{};
    return { oc:p.oc, cliente:p.cliente, vendedor:p.vendedor, zona:p.zona, celular:p.celular,
             nota:p.nota, pagado:p.pagado, saldo:p.saldo,
             prods:(p.productos||[]).map(function(x){ return {d:x.desc,n:x.cant,t:x.rtipo,ob:x.robs,pr:x.precio}; }),
             esRpt:esRPT(p.oc), fuera:fueraDeConta(p), cuenta:stockCuenta(p), unico:stockPedidoUnico(p) };
  });
  chk('le tocó un número de la serie RPT', rec.esRpt===true, rec.oc);
  chk('⚠️ el destino quedó guardado como «cliente» (la sucursal)', rec.cliente==='Mia Plaza', rec.cliente);
  chk('la zona se completó sola al elegir la sucursal', !!rec.zona, rec.zona);
  chk('no quedó ni nota de venta ni cobro', !rec.nota && !rec.pagado && !(Number(rec.saldo)>0),
      rec.nota+' / '+rec.pagado+' / '+rec.saldo);
  chk('cada renglón guardó su tipo', rec.prods.length===2 && rec.prods[0].t==='Reposición' && rec.prods[1].t==='Adicional',
      JSON.stringify(rec.prods.map(function(x){return x.t;})));
  chk('…y la observación del renglón', rec.prods[1].ob==='Para las camas de 2,5 plazas', rec.prods[1].ob);
  chk('…y ningún precio (no es una venta)', rec.prods.every(function(x){ return x.pr==null; }),
      JSON.stringify(rec.prods.map(function(x){return x.pr;})));

  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n── 4. NO es una venta, pero SÍ sale del depósito ──');
  chk('⚠️ queda FUERA de Contabilidad y del Cuadre (no entró plata)', rec.fuera===true, rec.fuera);
  chk('⚠️ pero el stock SÍ la cuenta: esa mercadería sale del depósito', rec.cuenta===true, rec.cuenta);
  chk('⚠️ …y NO arma rotación: el colchón cambió de lugar, no se vendió', rec.unico===true, rec.unico);

  const conta = await page.evaluate(() => {
    var h=todayStr();
    var venta={id:'v1',oc:h.slice(5,7)+'-001',nota:'55',fecha:h,ts:Date.now(),vendedor:'Mirian Salazar',
      cliente:'Juana',productos:[{desc:'X',medida:'',codigo:'',cant:1,precio:100}],pagado:true,cobradoBs:100,saldo:0,acuenta:0,entregado:true};
    var repo=STATE[0];
    STATE=[venta,repo];
    return { pasan: STATE.filter(function(p){ return !fueraDeConta(p); }).map(function(p){return p.id;}) };
  });
  chk('en la lista de Contabilidad pasa la venta y no la reposición',
      conta.pasan.length===1 && conta.pasan[0]==='v1', conta.pasan.join(','));

  const rot = await page.evaluate(() => {
    var k=stockClave({codigo:'CH1129',desc:'COLCHON TITANIO LATEX',medida:'140x190'});
    var mk=function(id,oc,vend,dias,n){ return {id:id,oc:oc,cliente:'X',vendedor:vend,fecha:diasAtras(dias),ts:Date.now(),
      productos:[{codigo:'CH1129',desc:'COLCHON TITANIO LATEX',medida:'140x190',cant:n}]}; };
    STOCK=stockVacio(); STOCK.c={f:todayStr(),u:{}}; STOCK.c.u[k]=0; STOCK_MEMO={};
    var mes=todayStr().slice(5,7);
    // 3 reposiciones de tienda en 3 días distintos: cantidad de sobra para «rotación», pero no lo son.
    STATE=[mk('r1','RPT '+mes+'-001','Mirian Salazar',1,20), mk('r2','RPT '+mes+'-002','Mirian Salazar',3,20), mk('r3','RPT '+mes+'-003','Mirian Salazar',5,20)];
    STOCK_MEMO={};
    var a=stockData().lista.filter(function(o){return o.k===k;})[0]||{};
    var soloRpt={ vend:a.vendidos, rota:a.vendidosRotacion, uni:a.vendidosUnicos, rpt:a.vendidosRpt,
                  nVR:a.nVentasRotacion, rotacion:a.rotacion, porDia:a.porDia, pedir:a.pedir, aviso:a.aviso,
                  etq:stockUnicoEtq(a), solo:stockSoloEduardo(a) };
    // pero lo que está vendido y sin entregar SÍ se cubre
    STATE.push({id:'r4',oc:'RPT '+mes+'-004',cliente:'Mia Plaza',vendedor:'Mirian Salazar',fecha:diasAdelante(2),ts:Date.now(),
      productos:[{codigo:'CH1129',desc:'COLCHON TITANIO LATEX',medida:'140x190',cant:4}]});
    STOCK_MEMO={};
    var b=stockData().lista.filter(function(o){return o.k===k;})[0]||{};
    return { soloRpt:soloRpt, comp:b.comp, pedirPend:b.pedir };
  });
  chk('⚠️ 60 unidades en 3 reposiciones NO crean ritmo (serían «rotación alta» si fueran ventas)',
      rot.soloRpt.rotacion==='baja' && rot.soloRpt.porDia===0 && rot.soloRpt.aviso==='unico',
      rot.soloRpt.rotacion+' · porDia '+rot.soloRpt.porDia+' · '+rot.soloRpt.aviso);
  chk('…y no manda a fabricar nada por las dudas', rot.soloRpt.pedir===0, rot.soloRpt.pedir);
  chk('se cuentan aparte de las de Eduardo, para poder decirlo bien',
      rot.soloRpt.rpt===60 && rot.soloRpt.uni===60 && rot.soloRpt.rota===0,
      'rpt '+rot.soloRpt.rpt+' · únicas '+rot.soloRpt.uni+' · rotación '+rot.soloRpt.rota);
  chk('⚠️ el cartel dice «Reposición de tienda», NO «Eduardo»',
      rot.soloRpt.etq==='Reposición de tienda', rot.soloRpt.etq);
  chk('⚠️ pero lo pedido y sin entregar sí se cubre: ese camión sale igual',
      rot.comp===4 && rot.pedirPend===4, 'comprometido '+rot.comp+' · pedir '+rot.pedirPend);

  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n── 5. El Excel del formato, igual al que manda hoy por correo ──');
  const xls = await page.evaluate(async () => {
    var h=todayStr();
    var p={id:'x1',oc:'RPT 09-001',fecha:diasAdelante(1),turno:'AM',vendedor:'Fernando Peinado',
      cliente:'Tiendas Roho',zona:'Roho',direccion:'Av. Banzer',observaciones:'Urgente',ts:Date.now(),
      productos:[{desc:'Posa pie de colchon MILA',medida:'',codigo:'',cant:3,rtipo:'Adicional',robs:'Para 2,5 plazas'},
                 {desc:'COLCHON TITANIO LATEX',medida:'140x190',codigo:'CH1129',cant:2,rtipo:'Reposición'}]};
    var hoja=rptHoja(p);
    var bytes=buildXlsx([hoja]);
    /* Se relee con el MISMO lector que usa el panel para los Excel de Moreno: si el archivo
       estuviera mal armado —el ZIP, el orden de los bloques, los nombres de las partes—,
       no se podría volver a abrir. */
    var leido=null, err='';
    try{
      var ab=bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset+bytes.byteLength);
      leido=xlsxHoja(await xlsxDescomprimir(ab));
    }catch(e){ err=String(e&&e.message||e); }
    /* `xlsxHoja` devuelve cada fila indexada por LETRA de columna, como la lee Excel. */
    var LET='ABCDEFGH'.split('');
    var texto=function(r,c){ var f=leido&&leido[r]; return f?String(f[LET[c]]==null?'':f[LET[c]]).trim():''; };
    var filas=hoja.matrix.length;
    var enc=hoja.matrix[10].slice(0,7).map(function(x){ return x&&x.v; });
    return {
      bytes:bytes.length, err:err, leidoFilas: leido?leido.length:0,
      titulo: texto(4,0), enc:enc,
      suc: texto(7,0), quien: texto(7,4), num: texto(7,6),
      it1: [texto(11,2),texto(11,3),texto(11,4),texto(11,5)],
      it2: [texto(12,1),texto(12,2),texto(12,3),texto(12,4)],
      renglones: filas, dv: hoja.dv[0], merges: hoja.merges,
      logo: hoja.img && hoja.img.data ? hoja.img.data.length : 0,
      correo: [texto(40,0),texto(40,4),texto(41,0),texto(44,0)],
      /* La celda B del primer renglón va vacía (ese producto no tiene código): sirve de
         diente contra el lector que se comía la celda de al lado (§4dk). */
      bVacia: texto(11,1),
      nombre: nombreArchivoRpt(p),
      totales: [hoja.matrix[32][4].v, hoja.matrix[32][7].v]
    };
  });
  chk('el archivo se genera', xls.bytes>8000, xls.bytes+' bytes');
  chk('⚠️ …y se puede volver a abrir con el lector de Excel del propio panel',
      !xls.err && xls.leidoFilas>=45, xls.err||('filas leídas: '+xls.leidoFilas));
  chk('el título es el del formato del dueño',
      xls.titulo==='FORMATO DE PEDIDO / REPOSICIÓN DE TIENDA', xls.titulo);
  chk('la cabecera trae sucursal, quién lo pide y el N° de pedido',
      xls.suc==='Tiendas Roho' && xls.quien==='Fernando Peinado' && xls.num==='RPT 09-001',
      xls.suc+' / '+xls.quien+' / '+xls.num);
  chk('las 7 columnas son las del formato',
      xls.enc.join('|')==='N°|Código del producto|Nombre del producto|Cantidad|Tipo|Observaciones|Fecha requerida',
      xls.enc.join('|'));
  chk('el primer renglón lleva nombre, cantidad, tipo y observación',
      xls.it1[0]==='Posa pie de colchon MILA' && xls.it1[1]==='3' && xls.it1[2]==='Adicional' && xls.it1[3]==='Para 2,5 plazas',
      xls.it1.join(' | '));
  chk('el segundo lleva el CÓDIGO ya resuelto (sin fórmulas que se rompan)',
      xls.it2[0]==='CH1129' && xls.it2[1]==='COLCHON TITANIO LATEX 140x190' && xls.it2[2]==='2',
      xls.it2.join(' | '));
  chk('quedan los 20 renglones en blanco del formato para escribir a mano',
      xls.renglones>=47, 'filas: '+xls.renglones);
  chk('el resumen cuenta ítems y unidades', String(xls.totales[0])==='2' && String(xls.totales[1])==='5',
      xls.totales.join(' / '));
  chk('la columna Tipo es un desplegable Reposición/Adicional, como en el original',
      xls.dv && xls.dv.sqref==='E12:E31' && xls.dv.list==='"Reposición,Adicional"',
      JSON.stringify(xls.dv));
  chk('las celdas combinadas son las del formato original',
      ['A1:H4','A5:H5','A7:B7','A9:D9','A33:C33','A35:H35','A36:H38','A40:H40','A41:D41','A47:H47']
        .every(function(m){ return xls.merges.indexOf(m)>=0; }), xls.merges.length+' combinaciones');
  chk('lleva el logo adentro (no un enlace que no cargue)', xls.logo===7900, xls.logo+' bytes');
  chk('dice a qué correos va, igual que el formato',
      xls.correo[0]==='DIRIGIDO A' && xls.correo[1]==='CON COPIA A' &&
      xls.correo[2]==='logistica@colchonesheaven.com' && /@colchonesheaven\.com$/.test(xls.correo[3]),
      xls.correo.join(' | '));
  chk('⚠️ una celda vacía no le roba el valor a la de al lado (lector de .xlsx)',
      xls.bVacia==='' && xls.it1[0]==='Posa pie de colchon MILA', '[B]="'+xls.bVacia+'" [C]="'+xls.it1[0]+'"');
  chk('el archivo se llama por su número y su tienda', xls.nombre==='RPT-09-001-Tiendas-Roho.xlsx', xls.nombre);

  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n── 6. WhatsApp y los botones ──');
  const wa = await page.evaluate(() => {
    var p=STATE.filter(function(x){return esRPT(x.oc);})[0];
    if(!p){ p={id:'w1',oc:'RPT 09-009',cliente:'Mia Plaza',vendedor:'Mirian Salazar',fecha:todayStr(),turno:'AM',
      productos:[{desc:'ALMOHADA',medida:'',codigo:'',cant:4,rtipo:'Adicional',robs:'ojo'}]}; STATE.unshift(p); }
    var t=pedidoText(p);
    var venta={id:'v9',oc:'09-050',nota:'7',cliente:'Juana',vendedor:'Mirian Salazar',fecha:todayStr(),turno:'AM',
      productos:[{desc:'X',medida:'',codigo:'',cant:1}],celular:'700'};
    return { t:t, tv:pedidoText(venta), botones:botonesRpt(p), sinBotones:botonesRpt(venta) };
  });
  chk('el mensaje dice REPOSICIÓN DE TIENDA, no PEDIDO', /REPOSICIÓN DE TIENDA/.test(wa.t) && !/📦 \*PEDIDO/.test(wa.t), wa.t.split('\n')[0]);
  chk('…nombra la sucursal y quién lo pide', /🏬 Sucursal:/.test(wa.t) && /Solicitado por:/.test(wa.t));
  chk('…no habla de cobro ni de cliente', !/PAGADO|POR COBRAR|👤 /.test(wa.t));
  chk('…marca el tipo de cada renglón', /\[Adicional\]|\[Reposición\]/.test(wa.t));
  chk('…y recuerda los 7 días hábiles de los adicionales', /7 días hábiles/.test(wa.t));
  chk('una venta normal sigue con su mensaje de siempre', /📦 \*PEDIDO/.test(wa.tv), wa.tv.split('\n')[0]);
  chk('la ficha de una RPT ofrece Excel y WhatsApp',
      /bajarRptExcel/.test(wa.botones) && /whatsappUrl/.test(wa.botones), wa.botones.length+' car.');
  chk('…y una venta normal no muestra esos botones', wa.sinBotones==='', wa.sinBotones);

  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n── 7. Editarla no la convierte en otra cosa ──');
  const ed = await page.evaluate(async () => {
    STATE=[]; window._pl=[];
    var _d=new Date(), _f; do { _d.setDate(_d.getDate()+1); _f=isoLocal(_d); } while(diaDomingo(_f));
    var p={id:'e1',oc:'RPT 09-020',cliente:'Buenos Aires',vendedor:'Mirian Salazar',fecha:_f,turno:'AM',
      zona:'Centro',direccion:'Av. 2',observaciones:'obs general',ts:Date.now(),
      productos:[{desc:'ALMOHADA',medida:'',codigo:'CD1403',cant:4,rtipo:'Adicional',robs:'las blancas'}]};
    STATE=[p]; window._pl=[JSON.parse(JSON.stringify(p))]; saveMirror();
    editPedido('e1');
    var abre={ tipo:segVal('f-doc-tipo'), suc:(document.getElementById('f-rpt-suc')||{}).value,
      bloque:(document.getElementById('wrap-rpt')||{style:{}}).style.display!=='none',
      rtipo:(document.querySelector('#f-productos .prod-rtipo')||{}).value,
      robs:(document.querySelector('#f-productos .prod-robs')||{}).value };
    // se le corrige la cantidad y se guarda
    document.querySelector('#f-productos .prod-cant').value='6';
    submitPedido();
    await new Promise(r=>setTimeout(r,400));
    var q=STATE.filter(function(x){return x.id==='e1';})[0]||{};
    return { abre:abre, oc:q.oc, cliente:q.cliente, cant:(q.productos||[{}])[0].cant,
             rtipo:(q.productos||[{}])[0].rtipo, robs:(q.productos||[{}])[0].robs, obs:q.observaciones };
  });
  chk('al abrirla vuelve marcada como RPT', ed.abre.tipo==='RPT' && ed.abre.bloque===true,
      ed.abre.tipo+' · bloque '+ed.abre.bloque);
  chk('la sucursal vuelve a su campo', ed.abre.suc==='Buenos Aires', ed.abre.suc);
  chk('el tipo y la observación del renglón vuelven al formulario',
      ed.abre.rtipo==='Adicional' && ed.abre.robs==='las blancas', ed.abre.rtipo+' / '+ed.abre.robs);
  chk('⚠️ corregir la cantidad no le borra el tipo ni la observación',
      ed.cant===6 && ed.rtipo==='Adicional' && ed.robs==='las blancas',
      ed.cant+' · '+ed.rtipo+' · '+ed.robs);
  chk('…ni le cambia el número ni la sucursal', ed.oc==='RPT 09-020' && ed.cliente==='Buenos Aires',
      ed.oc+' / '+ed.cliente);

  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n── 8. Logística la ve en la lista ──');
  const vis = await page.evaluate(() => {
    var p=STATE[0];
    return { chip:docChip(p), cls:docCls(p), chipVenta:docChip({oc:'09-001'}),
             chipAtc:docChip({oc:'ATC 09-001'}), clsAtc:docCls({oc:'ATC 09-001'}) };
  });
  chk('lleva su chip 🏪 RPT en las listas y fichas', /🏪 RPT/.test(vis.chip), vis.chip);
  chk('…y su franja de color', vis.cls==='rpt', vis.cls);
  chk('la ATC conserva el suyo (no se pisaron)', /🎧 ATC/.test(vis.chipAtc) && vis.clsAtc==='atc', vis.chipAtc);
  chk('una venta normal no lleva ninguno', vis.chipVenta==='', vis.chipVenta);

  const falta = await page.evaluate(async () => {
    showView('form'); resetForm();
    segSet('f-doc-tipo','RPT'); setDocTipo();
    document.getElementById('f-vendedor').value='Mirian Salazar'; applyVendedorLite();
    document.getElementById('f-zona').value='Norte';
    document.querySelector('#f-productos .prod-desc').value='ALMOHADA';
    var antes=STATE.length;
    submitPedido();
    await new Promise(r=>setTimeout(r,250));
    var e=document.getElementById('f-rpt-suc');
    return { guardo: STATE.length>antes, marcado: !!e && e.classList.contains('err') };
  });
  chk('⚠️ sin sucursal no se guarda: el camión no sabría a dónde ir', falta.guardo===false, falta.guardo);
  chk('…y el campo queda marcado en rojo', falta.marcado===true, falta.marcado);

  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n── 9. Que no se cuele como venta, y que no quede a medias (§4dl) ──');
  const bus = await page.evaluate(() => {
    var h=todayStr();
    STATE=[
      {id:'s1',oc:h.slice(5,7)+'-010',nota:'1',cliente:'Juana',vendedor:'Fernando Peinado',fecha:h,ts:Date.now(),
        productos:[{desc:'COLCHON TITANIO',medida:'140x190',codigo:'CH1129',cant:1,precio:1000}]},
      {id:'s2',oc:'RPT '+h.slice(5,7)+'-060',cliente:'Mia Plaza',vendedor:'Fernando Peinado',fecha:h,ts:Date.now(),
        productos:[{desc:'COLCHON TITANIO',medida:'140x190',codigo:'CH1129',cant:30}]},
      {id:'s3',oc:'ATC '+h.slice(5,7)+'-002',cliente:'Pedro',vendedor:'Fernando Peinado',fecha:h,ts:Date.now(),
        productos:[{desc:'COLCHON TITANIO',medida:'140x190',codigo:'CH1129',cant:2}]}];
    showView('admin');
    document.getElementById('bus-prod').value='TITANIO';
    document.getElementById('bus-vend').value='';
    document.getElementById('bus-desde').value=''; document.getElementById('bus-hasta').value='';
    var d=buscarData();
    renderBuscar();
    var conTodo=(document.getElementById('busca-body')||{}).textContent.replace(/\s+/g,' ');
    STATE=[STATE[1]];   // solo la reposición
    renderBuscar();
    var soloRpt=(document.getElementById('busca-body')||{}).textContent.replace(/\s+/g,' ');
    return { uni:d.uni, plata:d.plata, nPed:d.nPed, fuera:d.fuera,
             txt:busFueraTxt(d).replace(/<[^>]+>/g,''), conTodo:conTodo, soloRpt:soloRpt };
  });
  chk('⚠️ «Quién vendió qué» ya NO cuenta la reposición como venta',
      bus.uni===1 && bus.plata===1000 && bus.nPed===1,
      bus.uni+' unidades · '+bus.plata+' · '+bus.nPed+' pedido');
  chk('…ni la ATC (es un servicio, el colchón vuelve)', bus.fuera.atc===2, JSON.stringify(bus.fuera));
  chk('⚠️ …pero lo DICE, para que no parezca que el panel las perdió',
      /30 unidades en 🏪 reposiciones/.test(bus.txt) && /2 unidades en 🎧 ATC/.test(bus.txt), bus.txt);
  chk('…y también en la carátula que se imprime', /reposiciones de tienda/.test(bus.conTodo));
  chk('⚠️ si SOLO hubo reposiciones no dice «nadie vendió eso» a secas',
      /Sí hubo/.test(bus.soloRpt) && /reposiciones de tienda/.test(bus.soloRpt),
      bus.soloRpt.slice(0,110));

  const roho = await page.evaluate(() => {
    showView('form'); resetForm();
    segSet('f-doc-tipo','RPT'); setDocTipo();
    var antes=docTipoSel();
    document.getElementById('f-vendedor').value='ROHO'; applyVendedorLite();
    return { antes:antes, tipo:docTipoSel(),
      selector:(document.getElementById('f-doc-tipo')||{style:{}}).style.display,
      bloque:(document.getElementById('wrap-rpt')||{style:{}}).style.display };
  });
  chk('⚠️ con ROHO (que esconde el selector) el tipo vuelve solo a OC, sin dejar el formulario a medias',
      roho.antes==='RPT' && roho.tipo==='OC' && roho.selector==='none' && roho.bloque==='none',
      roho.antes+' → '+roho.tipo+' · selector '+roho.selector+' · bloque '+roho.bloque);

  const grande = await page.evaluate(async () => {
    var prods=[]; for(var i=0;i<25;i++) prods.push({desc:'PROD '+(i+1),medida:'',codigo:'C'+i,cant:2,rtipo:'Reposición'});
    var p={id:'b1',oc:'RPT 09-050',cliente:'Central',vendedor:'Mirian',fecha:tomorrowStr(),ts:Date.now(),productos:prods};
    var h=rptHoja(p), bytes=buildXlsx([h]);
    var ab=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
    var l=xlsxHoja(await xlsxDescomprimir(ab));
    return { dv:h.dv[0].sqref, ultimo:(l[35]||{}).C, items:(l[37]||{}).E, uni:(l[37]||{}).H,
             pie:(l[l.length-1]||{}).A };
  });
  chk('⚠️ un pedido de 25 productos no se corta en el renglón 20: la hoja crece',
      grande.ultimo==='PROD 25' && grande.dv==='E12:E36',
      grande.ultimo+' · lista '+grande.dv);
  chk('…y el resumen y el pie se corren con ella',
      String(grande.items)==='25' && String(grande.uni)==='50' && /MultiESPUMAS/.test(grande.pie||''),
      grande.items+' ítems · '+grande.uni+' unidades');

  const viejos = await page.evaluate(() => {
    /* ⚠️ Los estilos del .xlsx son COMPARTIDOS: al agregar los del formato de reposición,
       los Excel de siempre tienen que seguir saliendo igual. */
    var h=todayStr(), sacado={};
    STATE=[{id:'v1',oc:h.slice(5,7)+'-001',nota:'5',cliente:'Juana',vendedor:'Mirian Salazar',fecha:h,turno:'AM',
      zona:'Norte',direccion:'Av 1',celular:'700',ts:Date.now(),pagado:true,cobradoBs:900,saldo:0,acuenta:0,
      productos:[{desc:'COLCHON',medida:'140x190',codigo:'CH1',cant:1,precio:900}]}];
    var orig=window.downloadBlob;
    window.downloadBlob=function(b,n){ sacado[n]=b.length; };
    try{ exportExcel('todos'); }catch(e){ sacado.errPedidos=String(e&&e.message||e); }
    try{ exportConta(); }catch(e){ sacado.errConta=String(e&&e.message||e); }
    window.downloadBlob=orig;
    return sacado;
  });
  chk('⚠️ el Excel de pedidos de siempre sigue saliendo',
      Object.keys(viejos).some(function(k){ return /^pedidos-.*\.xlsx$/.test(k) && viejos[k]>5000; }),
      Object.keys(viejos).join(' · '));
  chk('…y el de Contabilidad también',
      Object.keys(viejos).some(function(k){ return /^contabilidad-.*\.xlsx$/.test(k) && viejos[k]>5000; }),
      Object.keys(viejos).join(' · '));

  chk('sin errores JS', errors.length===0, errors.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
