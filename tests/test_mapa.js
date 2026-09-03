/* 🗺️ EL MAPA POR MES Y POR MARCA.
   Pedido del dueño: *"mapa de entrega debería poder filtrar por mes para ver dónde fueron
   las entregas del mes. Así como también poder separar las entregas de Sueña (Fernando,
   Juan Pablo y Mauricio) y las de Heaven (Carola, Jonathan, Mirian, Maria e Isabel),
   filtrando y quitando las de ROHO y otros, para mapear las zonas de mayor entrega"*.

   ⚠️ LA PARTE QUE MÁS IMPORTA es la última frase, no la primera: el objetivo es ver LAS
   ZONAS. Con el mapa coloreando por CHOFER —lo de siempre— un mes entero queda de veinte
   colores y no se lee nada. Por eso, al elegir «Mes», el color pasa solo a ZONA, y la
   leyenda se ordena por CANTIDAD: la primera de la lista es la zona de mayor entrega.

   ⚠️ Y elegir una marca tiene que SACAR a ROHO y a los que no están en ninguna lista, sin
   ningún filtro aparte. */
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

  /* Se siembran entregas de ESTE mes y del anterior, de las dos marcas y de ROHO, en tres
     zonas con cantidades distintas para que el ranking tenga un ganador claro.
     Los enlaces llevan las coordenadas adentro: así el mapa resuelve sin servidor. */
  const M = await page.evaluate(async () => {
    document.getElementById('conn-form').style.display='none';
    CONNECTED=true; UNLOCKED=true; mostrarBotonesTodos();
    apiSave=function(){ return Promise.resolve({ok:true}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
    apiGeocode=function(){ return Promise.resolve({ok:true,geo:[]}); };
    var hoy=new Date();
    var esteMes=isoLocal(hoy).slice(0,7);
    var ant=new Date(hoy.getFullYear(), hoy.getMonth()-1, 15);
    var mesAnt=isoLocal(ant).slice(0,7);
    var i=0;
    /* ⚠️ Ningún dato sembrado puede caer HOY: el test comprueba después que el botón «Hoy»
       trae UNA sola entrega, y si el calendario coincide con un día sembrado fallaría solo
       ciertos días del mes. El día de hoy se corre al 28 (y al 27 si hoy ES 28). */
    var diaHoy=hoy.getDate();
    var seguro=function(d){ d=((d-1)%28)+1; if(d===diaHoy) d=(diaHoy===28)?27:28; return d; };
    var mk=function(vend, zona, mes, dia){
      dia=seguro(dia); i++;
      return { id:'m'+i, cliente:'CLI '+i, nota:''+i, vendedor:vend,
        fecha:mes+'-'+('0'+dia).slice(-2), ts:new Date(mes+'-'+('0'+dia).slice(-2)+'T10:00:00').getTime(),
        oc:'09-'+('00'+i).slice(-3), saldo:0, acuenta:0, pagado:true, cobradoBs:0, metodoPago:'',
        entregado:true, verificado:true, observaciones:'', garantia:'', facturarA:'', nit:'',
        estado:'', vehiculo:'', chofer:'Chofer '+(i%4), turno:'AM', celular:'7', zona:zona,
        direccion:'Av '+i, maps:'https://www.google.com/maps?q=-17.7'+(i%9)+',-63.1'+(i%9),
        nroDia:i, productos:[{desc:'X',medida:'1x1',codigo:'A',cant:1}] };
    };
    STATE=[];
    /* ESTE MES · Heaven: 5 en Norte, 2 en Sur → Norte tiene que ganar el ranking. */
    ['Maria Flores','Isabel Robledo','Carola Chavez','Mirian Salazar','Jonathan Monje']
      .forEach(function(v,k){ STATE.push(mk(v,'Norte',esteMes,3+k)); });
    STATE.push(mk('Maria Flores','Sur',esteMes,9));
    STATE.push(mk('Carola Chavez','Sur',esteMes,10));
    /* ESTE MES · Sueña: 3 en Este. */
    ['Fernando Peinado','Juan Pablo Paredes','Mauricio Merida']
      .forEach(function(v,k){ STATE.push(mk(v,'Este',esteMes,11+k)); });
    /* ESTE MES · los que NO son de ninguna marca. */
    STATE.push(mk('ROHO','Norte',esteMes,15));
    STATE.push(mk('Eduardo Añez','Norte',esteMes,16));
    /* MES ANTERIOR · para probar que el filtro por mes corta de verdad. */
    STATE.push(mk('Maria Flores','Norte',mesAnt,5));
    STATE.push(mk('Fernando Peinado','Este',mesAnt,6));
    saveMirror();
    MAPA_MARCA=''; MAPA_MES=''; MAPA_COLOR_POR='chofer'; MAPA_SOLO_SIN=false;
    return { esteMes:esteMes, mesAnt:mesAnt, total:STATE.length };
  });

  /* Aplica filtros sin abrir Leaflet (no hay internet en el sandbox): se mide la LISTA y la
     leyenda, que es donde vive toda la lógica que se pidió. */
  const ver = (dia, mes, marca, color) => page.evaluate((a) => {
    var [dia, mes, marca, color]=a;
    MAPA_DIA=dia; MAPA_MES=mes||''; MAPA_MARCA=marca||''; MAPA_COLOR_POR=color||'chofer';
    MAPA_COLOROF={}; MAPA_COLIDX=0;
    MAPA_LIST=mapaFilteredList();
    MAPA_LIST.forEach(function(p){ var u=String(p.maps).trim();
      if(!MAPA_COORDS[u]){ var c=coordsDeLink(u); if(c) MAPA_COORDS[u]={link:u,lat:c.lat,lng:c.lng}; } });
    if(typeof pintarMapaBotones==='function') pintarMapaBotones();
    renderMapaLegend();
    var cnt={};
    MAPA_LIST.forEach(function(p){ var k=mapaKey(p); cnt[k]=(cnt[k]||0)+1; });
    return { n:MAPA_LIST.length,
             vendedores:MAPA_LIST.map(function(p){return p.vendedor;}),
             claves:cnt,
             leyenda:(document.getElementById('mapa-legend')||{textContent:''}).textContent.replace(/\s+/g,' ').trim(),
             info:(document.getElementById('mapa-info')||{textContent:''}).textContent.replace(/\s+/g,' ').trim() };
  }, [dia, mes, marca, color]);

  // ============ 1. el filtro por MES ============
  let v = await ver('todos','', '', 'chofer');
  chk('sin filtro están las 14 entregas', v.n===14, v.n);
  v = await ver('mes', M.esteMes, '', 'zona');
  chk('⚠️ filtrando por MES quedan solo las 12 de este mes', v.n===12, v.n);
  v = await ver('mes', M.mesAnt, '', 'zona');
  chk('…y eligiendo el mes pasado, las 2 de ese mes', v.n===2, v.n);
  chk('…y el encabezado dice qué mes se está mirando',
      /de \d{4}/.test(v.info), v.info);

  // ============ 2. ⚠️ SEPARAR LAS MARCAS (y sacar ROHO solo) ============
  v = await ver('mes', M.esteMes, 'heaven', 'zona');
  chk('⚠️ Heaven trae solo sus 7 entregas', v.n===7, v.n+' · '+v.vendedores.join(', '));
  chk('⚠️ …y NO se cuela ROHO ni Eduardo Añez (sin filtro aparte)',
      !v.vendedores.some(function(x){ return /ROHO|Añez/.test(x); }), v.vendedores.join(', '));
  chk('…ni ningún vendedor de Sueña',
      !v.vendedores.some(function(x){ return /Fernando|Juan Pablo|Mauricio/.test(x); }), v.vendedores.join(', '));

  v = await ver('mes', M.esteMes, 'suena', 'zona');
  chk('⚠️ Sueña trae solo las 3 de Fernando, Juan Pablo y Mauricio', v.n===3, v.n+' · '+v.vendedores.join(', '));
  chk('…y son exactamente esos tres',
      v.vendedores.every(function(x){ return /Fernando|Juan Pablo|Mauricio/.test(x); }), v.vendedores.join(', '));
  chk('…y el encabezado dice de qué marca es', /Sueña/.test(v.info), v.info);

  // ============ 3. ⚠️ LAS ZONAS DE MAYOR ENTREGA ============
  /* Es para lo que se pidió todo esto: la leyenda ordenada por cantidad, no alfabética. */
  v = await ver('mes', M.esteMes, '', 'zona');
  chk('coloreando por ZONA, las claves son zonas y no choferes',
      Object.keys(v.claves).sort().join(',')==='Este,Norte,Sur', Object.keys(v.claves).join(','));
  chk('⚠️ la leyenda arranca por la zona de MÁS entregas (Norte, 7)',
      /^Norte \(7\)/.test(v.leyenda), v.leyenda);
  chk('…y sigue en orden descendente (Este 3, Sur 2)',
      /Norte \(7\).*Este \(3\).*Sur \(2\)/.test(v.leyenda), v.leyenda);

  /* Y filtrando por marca, el ranking cambia — que es justo lo que se quiere comparar. */
  v = await ver('mes', M.esteMes, 'suena', 'zona');
  chk('⚠️ el ranking de zonas de SUEÑA es distinto: todo Este',
      /^Este \(3\)/.test(v.leyenda) && !/Norte/.test(v.leyenda), v.leyenda);

  // ============ 4. colorear por marca ============
  v = await ver('mes', M.esteMes, '', 'marca');
  chk('coloreando por marca aparecen las dos y los que no tienen',
      /Heaven/.test(v.leyenda) && /Sueña/.test(v.leyenda) && /Otros/.test(v.leyenda), v.leyenda);
  chk('…y Heaven va primero por ser la de más entregas (7)',
      /^💚 Heaven \(7\)/.test(v.leyenda), v.leyenda);

  // ============ 5. lo de siempre sigue funcionando ============
  v = await ver('todos','', '', 'chofer');
  chk('coloreando por chofer vuelven a ser choferes',
      Object.keys(v.claves).every(function(k){ return /^Chofer /.test(k); }), Object.keys(v.claves).join(','));

  const hoy = await page.evaluate(async () => {
    /* Una entrega para HOY, que los botones Hoy/Mañana sigan cortando bien. */
    STATE.push({ id:'zz', cliente:'DE HOY', nota:'z', vendedor:'Maria Flores', fecha:todayStr(),
      ts:Date.now(), oc:'09-999', saldo:0, acuenta:0, pagado:true, cobradoBs:0, metodoPago:'',
      entregado:false, verificado:false, observaciones:'', garantia:'', facturarA:'', nit:'',
      estado:'', vehiculo:'', chofer:'Luis', turno:'AM', celular:'7', zona:'Norte',
      direccion:'Av', maps:'https://www.google.com/maps?q=-17.78,-63.18', nroDia:1,
      productos:[{desc:'X',medida:'1x1',codigo:'A',cant:1}] });
    saveMirror();
    MAPA_DIA='hoy'; MAPA_MES=''; MAPA_MARCA='';
    MAPA_LIST=mapaFilteredList();
    return MAPA_LIST.map(function(p){return p.cliente;});
  });
  chk('«Hoy» sigue trayendo solo lo de hoy', hoy.length===1 && hoy[0]==='DE HOY', hoy.join(', '));

  // ============ 6. al elegir «Mes» el color pasa solo a zona ============
  const auto = await page.evaluate(async () => {
    MAPA_COLOR_POR='chofer'; MAPA_DIA='todos';
    setMapaDia('mes');
    await new Promise(r=>setTimeout(r,150));
    var campo=document.getElementById('mapa-mes');
    return { color:MAPA_COLOR_POR, mes:MAPA_MES,
             campoVisible: campo ? campo.style.display!=='none' : 'no existe' };
  });
  chk('⚠️ al elegir «Mes» el color pasa solo a ZONA (por chofer un mes es ilegible)',
      auto.color==='zona', auto.color);
  chk('…y aparece el campo para elegir el mes', auto.campoVisible===true, auto.campoVisible);
  chk('…con el mes en curso ya puesto', auto.mes===M.esteMes, auto.mes);

  chk('sin errores JS', errors.length===0, errors.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
