/* 📄 LA TABLA DE ADMINISTRACIÓN NO PUEDE CRECER PARA SIEMPRE.
   El dueño lo vio venir: *"lo del retraso en pintar solo sería cuando le dan ver TODO"*.
   Tenía razón en la dirección, y medirlo bien (con calentamiento y mediana) lo confirmó:

        1.500 ventas → Mes 172 ms · Todo 864 ms
        3.000 ventas → Mes 796 ms · Todo 1.469 ms

   Pero con dos vueltas de tuerca: «Todo» era el filtro **de fábrica** (el `active` estaba
   ahí), así que nadie estaba en el modo rápido; y la tabla dibujaba UNA FILA POR VENTA DE
   LA HISTORIA, y se repinta sola cada dos minutos y en cada tilde.

   Se hicieron dos arreglos: topar las filas con un «ver más», y arrancar en «Mes».
   ⚠️ EL SEGUNDO SE REVIRTIÓ (§4bo, 31/08). Medida la velocidad DESPUÉS del tope, «Mes» y
   «Todo» quedaron en 84 y 98 ms con 3.000 ventas: el tope fue lo que arregló la lentitud.
   Y «Mes» corta por fecha de ENTREGA, así que el 31 de agosto escondía las entregas de
   septiembre —justo las que se están preparando—. Catorce milisegundos no pagan eso.

   ⚠️⚠️ Y VOLVIÓ A «MES» el 05/09 (§4cj), pedido por el dueño. Lo que lo hacía peligroso ya
   no existe: desde §4bo hay un aviso ámbar (`renderFueraDelMes`) que dice cuántas entregas
   quedan afuera del mes filtrado y lleva a ellas de un toque — o sea que a fin de mes ya no
   desaparecen en silencio, que era el daño real. La lentitud que motivó el pedido NO era el
   filtro (medido: Todo 42 ms · Mes 21 ms con 3.000 ventas) sino la pantalla en blanco
   mientras bajaba la planilla; eso se arregló aparte, en `loadFromServer`.
   El tope de 150 filas sigue siendo lo que de verdad sostiene la velocidad, y el orden por
   fecha descendente sigue poniendo arriba las entregas más próximas.

   ⚠️ Lo que este test cuida por encima de todo: que el BUSCADOR siga mirando TODA la
   planilla. Un tope que esconda lo que alguien está buscando sería mucho peor que la
   lentitud que vino a arreglar. */
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

  /* `n` ventas repartidas en varios meses, para que «Mes» y «Todo» den distinto. */
  const prep = (n) => page.evaluate(async (n) => {
    var el=document.getElementById('conn-form'); if(el) el.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    document.getElementById('admin-lock').style.display='none';
    document.getElementById('admin-content').style.display='block';
    mostrarBotonesTodos();
    apiSave=function(){ return Promise.resolve({ok:true}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
    var V=['Maria Flores','Isabel Robledo','Carola Chavez','Mirian Salazar'];
    STATE=[];
    for(var i=0;i<n;i++){
      var d=new Date(2026,7,1); d.setDate(d.getDate()+(i%150));   // ~5 meses
      var f=isoLocal(d);
      STATE.push({ id:'t'+i, cliente:'CLIENTE '+i, nota:''+(1000+i), vendedor:V[i%4],
        fecha:f, ts:d.getTime(), saldo:0, acuenta:0, pagado:true, cobradoBs:0, metodoPago:'',
        entregado:false, verificado:false, oc:'08-'+i, observaciones:'', garantia:'',
        facturarA:'', nit:'', estado:'', vehiculo:'', chofer:'', turno:'AM', celular:'7',
        zona:'Norte', direccion:'Av '+i, maps:'', nroDia:i,
        productos:[{desc:'SOFT ICE', medida:'140x190', codigo:'A1', cant:1}] });
    }
    saveMirror();
    if(typeof admTopeReset==='function') admTopeReset();
    var sb=document.getElementById('adm-search'); if(sb) sb.value='';
    document.getElementById('adm-mes').value='2026-08';
    showView('admin'); renderAdmin();
    await new Promise(r=>setTimeout(r,150));
  }, n);

  const foto = () => page.evaluate(() => ({
    modo: segVal('adm-mode'),
    filas: document.querySelectorAll('#tbl-pedidos tbody tr').length,
    aviso: (document.getElementById('adm-mas')||{textContent:''}).textContent||'',
    botones: [].slice.call(document.querySelectorAll('#adm-mas button')).map(b=>b.textContent.trim()),
    mesVisible: document.getElementById('wrap-mes').style.display!=='none'
  }));
  const modo = (m) => page.evaluate(async (m) => {
    segSet('adm-mode', m);
    document.getElementById('wrap-dia').style.display=(m==='dia')?'block':'none';
    document.getElementById('wrap-mes').style.display=(m==='mes')?'block':'none';
    if(typeof admTopeReset==='function') admTopeReset();
    renderAdmin();
    await new Promise(r=>setTimeout(r,120));
  }, m);

  // ============ 1. arranca en MES (§4cj) ============
  await prep(400);
  let f = await foto();
  chk('el filtro arranca en «Mes»', f.modo==='mes', f.modo);
  chk('…y el selector de mes se ve de entrada (si no, no se sabe qué mes se está mirando)',
      f.mesVisible===true, f.mesVisible);
  /* ⚠️ ARRANCAR EN «MES» ESCONDE LAS ENTREGAS DE LOS OTROS MESES. Eso se aguanta SOLO
     porque hay un aviso que lo dice y lleva ahí. Sin ese aviso, esto vuelve a ser el bug
     del 31/08 (§4bo) y hay que volver a «Todo». */
  const avisoFuera = await page.evaluate(() => (document.getElementById('adm-fuera')||{}).textContent||'');
  chk('⚠️ …y avisa cuántas entregas quedan afuera del mes que se está mirando',
      /entrega fuera de este mes/.test(avisoFuera), avisoFuera.replace(/\s+/g,' ').slice(0,110));
  chk('…con un botón para ir a verlas', /ver \w+/i.test(avisoFuera), avisoFuera.replace(/\s+/g,' ').slice(0,140));

  // A partir de acá se mide el tope, que es lo que sostiene la velocidad: se necesita
  // «Todo» para tener las 400 en la lista.
  await modo('todo');
  f = await foto();
  chk('con «Todo» quedan las 400 a la vista y el tope las corta en 150', f.filas===150, f.filas);
  /* ⚠️ Lo que hace seguro «Todo» con tope: el orden de fábrica es por fecha DESCENDENTE,
     así que las 150 dibujadas son las entregas MÁS PRÓXIMAS, no 150 pedidos viejos. Si
     alguien cambia el orden por defecto, esto lo agarra. */
  const arriba = await page.evaluate(() => {
    /* Se compara la fecha MÁS VIEJA de las dibujadas contra la MÁS NUEVA de las que
       quedaron afuera: si el orden es el correcto, todo lo dibujado es igual o más nuevo. */
    var todas=admFilter();                                  // las 400, ya ordenadas
    var n=document.querySelectorAll('#tbl-pedidos tbody tr').length;
    var dentro=todas.slice(0,n).map(function(p){return p.fecha;});
    var fuera =todas.slice(n).map(function(p){return p.fecha;});
    return { dibujadas:n, masViejaDentro:dentro.sort()[0],
             masNuevaFuera:fuera.sort()[fuera.length-1],
             primeraFila:todas[0].fecha };
  });
  chk('⚠️ lo dibujado es lo MÁS PRÓXIMO: nada de lo escondido es más nuevo',
      arriba.masViejaDentro >= arriba.masNuevaFuera,
      'la más vieja dibujada '+arriba.masViejaDentro+' · la más nueva escondida '+arriba.masNuevaFuera);
  chk('…y arriba de todo va la entrega más lejana en el futuro',
      arriba.primeraFila===(await page.evaluate(()=>admFilter().map(function(p){return p.fecha;}).sort().pop())),
      arriba.primeraFila);

  // ============ 2. el tope de filas ============
  f = await foto();
  chk('con 400 ventas la tabla dibuja 150, no 400', f.filas===150, f.filas);
  chk('…y avisa que hay más, con los dos números', /150 de 400/.test(f.aviso.replace(/\s+/g,' ')),
      f.aviso.replace(/\s+/g,' ').trim().slice(0,90));
  chk('…y manda al buscador, que es como se encuentra uno puntual',
      /buscador/i.test(f.aviso), f.aviso.replace(/\s+/g,' ').trim().slice(0,120));
  chk('con botón para ver más', f.botones.some(b=>/Ver 150 más/.test(b)), JSON.stringify(f.botones));
  chk('…y otro para ver los 400 de una', f.botones.some(b=>/Ver los 400/.test(b)),
      JSON.stringify(f.botones));

  // ============ 3. ver más suma de a 150 ============
  let mas = await page.evaluate(async () => { if(typeof admVerMas!=='function') return -1; admVerMas(); await new Promise(r=>setTimeout(r,150));
    return document.querySelectorAll('#tbl-pedidos tbody tr').length; });
  chk('«Ver más» pasa a 300', mas===300, mas);
  mas = await page.evaluate(async () => { if(typeof admVerTodos!=='function') return {filas:-1,aviso:'no existe admVerTodos'}; admVerTodos(); await new Promise(r=>setTimeout(r,200));
    return { filas:document.querySelectorAll('#tbl-pedidos tbody tr').length,
             aviso:(document.getElementById('adm-mas')||{textContent:''}).textContent.trim() }; });
  chk('«Ver los 400» las muestra todas', mas.filas===400, mas.filas);
  chk('…y ahí ya no queda nada que avisar', mas.aviso==='', mas.aviso.slice(0,60));

  // ============ 4. cambiar de filtro devuelve el tope a su base ============
  await modo('mes');
  await modo('todo');
  f = await foto();
  chk('cambiar de filtro NO deja pegado el «ver todos» de antes', f.filas===150, f.filas);

  // ============ 5. 🔎 LO QUE MÁS IMPORTA: el buscador mira TODA la planilla ============
  const buscado = await page.evaluate(async () => {
    /* El cliente 399 está en el fondo del fondo: fuera de las 150 que se dibujan. */
    var sb=document.getElementById('adm-search'); sb.value='CLIENTE 399';
    if(typeof admTopeReset==='function') admTopeReset();
    renderAdmin();
    await new Promise(r=>setTimeout(r,150));
    var filas=[].slice.call(document.querySelectorAll('#tbl-pedidos tbody tr'));
    return { n:filas.length, txt:filas.map(function(t){return t.textContent;}).join(' ') };
  });
  chk('🔎 el buscador encuentra una venta que quedó FUERA del tope',
      buscado.n>=1 && /CLIENTE 399/.test(buscado.txt), buscado.n+' filas');
  chk('…y trae solo esa, no las 150 primeras', buscado.n<=2, buscado.n);

  const porNota = await page.evaluate(async () => {
    var sb=document.getElementById('adm-search'); sb.value='1399';
    if(typeof admTopeReset==='function') admTopeReset();
    renderAdmin();
    await new Promise(r=>setTimeout(r,150));
    return document.querySelectorAll('#tbl-pedidos tbody tr').length;
  });
  chk('…y también por N° de nota', porNota>=1 && porNota<=2, porNota);

  await page.evaluate(async () => { document.getElementById('adm-search').value='';
    if(typeof admTopeReset==='function') admTopeReset();
    renderAdmin(); await new Promise(r=>setTimeout(r,150)); });

  // ============ 6. con pocos pedidos no molesta con nada ============
  await prep(40);
  await modo('todo');
  f = await foto();
  chk('con 40 ventas se ven las 40', f.filas===40, f.filas);
  chk('…y no aparece ningún aviso de «ver más»', f.aviso.trim()==='', f.aviso.trim().slice(0,60));

  // ============ 7. los totales de arriba NO se topan: cuentan todo ============
  await prep(400);
  await modo('todo');
  const totales = await page.evaluate(() => {
    /* Se lee la ficha «Pedidos» por su etiqueta, no buscando "400" en todo el texto:
       los textos van pegados ("Pedidos400400 unidades") y un match suelto no prueba nada. */
    var ficha=function(lbl){
      var l=[].slice.call(document.querySelectorAll('#adm-metrics .mc-lbl'))
              .filter(function(e){ return e.textContent.trim()===lbl; })[0];
      return l ? l.parentElement.querySelector('.mc-val').textContent.trim() : 'NO ESTÁ';
    };
    return { pedidos:ficha('Pedidos'), pagados:ficha('Pagados'),
             filas:document.querySelectorAll('#tbl-pedidos tbody tr').length };
  });
  chk('⚠️ la ficha «Pedidos» sigue diciendo 400, aunque se dibujen 150',
      totales.pedidos==='400', totales.filas+' filas · la ficha dice '+totales.pedidos);
  chk('…y la de «Pagados» también cuenta las 400', totales.pagados==='400', totales.pagados);
  const linea = await page.evaluate(() =>
    document.getElementById('adm-metodos').textContent.replace(/\s+/g,' '));
  chk('…y la línea de entregados cuenta sobre el total, no sobre lo dibujado',
      /\/ 400/.test(linea), linea.slice(-60));

  /* ⚠️ El tope es de la TABLA y de nadie más. Si alguna vez alguien "optimiza" metiéndolo
     dentro de admFilter(), el Excel saldría con 150 ventas de 400 y nadie se daría cuenta
     hasta que el contador reclame. Esto lo agarra. */
  const fuentes = await page.evaluate(() => {
    /* cargaLista() filtra por día (hoy / mañana / todos): se la pone en "todos" para
       comparar contra las 400, si no compara peras con manzanas. */
    var _c=(typeof CARGA_DIA!=='undefined')?CARGA_DIA:null;
    if(_c!==null) CARGA_DIA='todos';
    var carga=(typeof cargaLista==='function') ? cargaLista().length : 'no existe';
    if(_c!==null) CARGA_DIA=_c;
    return { excel: admFilter().length,        // de acá saca las filas exportExcel()
             carga: carga,
             filas: document.querySelectorAll('#tbl-pedidos tbody tr').length };
  });
  chk('📊 el Excel sigue exportando las 400 (el tope es solo de la tabla)',
      fuentes.excel===400, fuentes.filas+' filas dibujadas · admFilter() da '+fuentes.excel);
  chk('📦 la Lista de carga también ve las 400', fuentes.carga===400, fuentes.carga);

  /* ============ ⚡ ENTRAR NO PUEDE SER UNA PANTALLA EN BLANCO (§4cj) ============
     Lo que el dueño sentía como «tarda en cargar» NO era el filtro (medido: Todo 42 ms ·
     Mes 21 ms con 3.000 ventas — 21 ms no se sienten). Era que `loadFromServer` no dibujaba
     nada hasta que Google contestaba, y bajar la planilla tarda segundos… teniendo la copia
     local ya cargada en memoria desde el arranque. La espera era gratis. */
  const blanco = await page.evaluate(async () => {
    var pintados=0, orig=window.renderAdmin;
    window.renderAdmin=function(){ pintados++; return orig.apply(null,arguments); };
    var resolver=null;
    apiList=function(){ return new Promise(function(r){ resolver=r; }); };   // el servidor todavía no contesta
    loadFromServer(false);
    await new Promise(r=>setTimeout(r,120));
    var mientrasViaja=document.querySelectorAll('#tbl-pedidos tbody tr').length;
    resolver({ok:true, pedidos:JSON.parse(JSON.stringify(STATE))});
    await new Promise(r=>setTimeout(r,250));
    window.renderAdmin=orig;
    return { mientrasViaja:mientrasViaja, pintados:pintados,
             despues:document.querySelectorAll('#tbl-pedidos tbody tr').length };
  });
  chk('⚠️ mientras la planilla viaja, la tabla YA muestra la copia local',
      blanco.mientrasViaja>0, blanco.mientrasViaja+' filas a la vista');
  chk('…o sea que dibuja antes de pedir, y otra vez al llegar', blanco.pintados>=2, blanco.pintados+' repintados');
  chk('…y al llegar la respuesta sigue habiendo pedidos', blanco.despues>0, blanco.despues);

  chk('sin errores JS', errors.length===0, errors.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
