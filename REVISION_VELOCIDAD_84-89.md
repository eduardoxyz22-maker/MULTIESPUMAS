# Revisión pedida: velocidad del panel de pedidos (propuestas 84 a 89)

Repositorio `eduardoxyz22-maker/MULTIESPUMAS`, rama `claude/pedidos-fecha-entrega-bgt0em`, commit
`330560cc945ad7f92b8a99a17e42f2c95177ea16`. Archivo tocado: **`pedidos.html`** (una sola página de ~4,3 MB, JavaScript a mano
sin framework). **Todavía NO está publicado**: el dueño lo publica cuando la revisión dé el visto bueno.

## Para quien revisa (otra IA)

Buscá **errores de verdad**: algo que con datos concretos dé un resultado equivocado, pierda un pedido, muestre algo viejo, o se
cuelgue. No hace falta opinar de estilo ni de nombres (el código está en castellano a propósito y así sigue).

Para cada hallazgo, devolvé:

1. **Dónde**: número de línea (los del diff y los de las funciones de abajo son los del archivo en ese commit).
2. **Gravedad**: ALTA (se pierde o se muestra mal plata/pedidos), MEDIA (se ve algo viejo o falta algo hasta la próxima lectura), BAJA.
3. **Cómo falla**: los pasos o los datos concretos que lo disparan y qué pasa.
4. **Arreglo** que propondrías (corto).

Si algo te parece raro pero no podés armar un caso que falle, decilo aparte como «duda», no como hallazgo. Si no encontrás nada,
decilo: es una respuesta válida.

## Cómo funciona el panel (lo justo para revisar)

- Los pedidos viven en una planilla de Google (Apps Script). La página guarda una **copia** en el aparato
  (`localStorage`, clave `LS_KEY`) para abrir rápido y trabajar sin señal, y la reemplaza con lo que trae cada lectura.
- **La cola durable** (`LS_PEND`, octubre §4hh): antes de mandar un pedido, la página lo guarda en `localStorage` y verifica que
  quedó escrito (`prepararDurable` → `queuePending` → `setPending`). Si no puede escribirlo, **no lo manda** y avisa «El pedido NO se
  envió» (`errorCopiaDurable`). Esa cola NUNCA se puede perder: es la regla más importante del panel.
- **La lectura de cada minuto** (`autoRefrescar` → `refrescarEstado` → `refrescarEstadoYa` → `apiList`) pide «solo lo cambiado»
  desde la última copia (`desde`), y la página rearma la lista entera con su copia en memoria `LISTA_BASE` (`listaAplicarDelta`,
  con una cuenta de control `n` + `huella`; si no da, lee entera). `mergePending` junta la lista con lo que está en la cola o
  recién guardado acá (`localManda`). Un pedido que la lectura no trae y que se guardó acá hace poco pasa por una «sospecha» antes
  de darlo por borrado (`borradoConfirmarLuego`, 25 s).
- `autoRepintar` vuelve a dibujar SOLO la pestaña que se está mirando y devuelve el scroll donde estaba. `autoOcupado` frena todo
  mientras alguien escribe o tiene una ventana abierta.
- Las pruebas corren con Playwright (`navigator.webdriver`). Varias cosas visuales se apagan ahí salvo una bandera
  `window.*_PRUEBA`; las listas de a partes también (`TROZOS_PRUEBA`), para que las pruebas viejas sigan leyendo todas las filas.

## Lo que se midió (planilla real del 30/10, 1.649 filas, compu normal / compu 4 veces más lenta)

| | Antes | Después |
|---|---|---|
| Tocar Contabilidad | 0,60 s / 2,7 s | 0,30 s / 1,15 s |
| Tocar Mis pedidos | 0,24 s / 1,08 s | 0,17 s / 0,64 s |
| Lectura de cada minuto sin cambios, en Nuevo pedido | 126 ms / 553 ms | 46 ms / 212 ms |
| Copia en el aparato | 1.330.627 letras | 804.266 letras |

Chrome da ~5,2 millones de letras de `localStorage` por sitio (medido); Safari (iPad, iPhone) bastante menos. La copia crecía
~400.000 letras por mes.

## Cada cambio y qué mirar

### 84 · La copia del aparato con tope (`mirrorRecortar`, `lsPoner`, `saveMirror`)

- La copia guarda: lo cargado o con fecha de los últimos 45 días (`MIRROR_DIAS`), todo lo que viene, lo sin fecha, lo **no
  entregado** con fecha de los últimos 180 días (`MIRROR_PEND_DIAS`) y lo que tiene **saldo** (`!pagado && saldo>0.005`).
- `lsPoner(k, v, esCopia)`: si `setItem` falla (sin lugar), borra la copia de la planilla y prueba otra vez. Lo usan `setPending`
  (la cola), el borrado pendiente (`borrarPendPoner`), los pases entre tiendas (`tstPasesPendPoner`) y el cierre de entregas pendiente
  (`cierreEntPendienteGuardar`). Con `esCopia` (la copia misma) no reintenta: si no entra, queda sin copia y `MIRROR_SUCIO`.
- **Mirá**: ¿hay algo que lea `STATE` ANTES de la primera lectura del servidor y necesite pedidos de hace más de 45 días ya
  entregados y pagados? (al abrir sin señal, por ejemplo). ¿Algún camino que escriba en `localStorage` algo que no se puede perder y
  que no pase por `lsPoner`? (la lista de `localStorage.setItem` está en el archivo; las de preferencias de pantalla no importan).
  ¿La fecha `p.fecha` 'AAAA-MM-DD' se interpreta bien en hora de Bolivia (UTC−4)? ¿`ts` está siempre en milisegundos?
- Las filas del sistema (`__stock__`, `__dias_cerrados__`, etc.) **no** están en `STATE`: `loadMirror` y `mergePending` las sacan y
  cada una tiene su propia copia. Por eso no se tratan aparte en el recorte.

### 85 · La lectura sin cambios no hace nada de más (`_igual`, `LECTURA_IGUAL`, `autoRepintarPuedeEsperar`)

- `apiList` marca la lista con `_igual` cuando la respuesta de «lo cambiado» vino con **cero filas y cero borrados**, había copia
  `LISTA_BASE` y el reloj del servidor (`j.ahora`) no va para atrás. Si la cuenta de control falla, se lee entera (sin `_igual`).
- `refrescarEstadoYa`: con `_igual`, `saveMirror({igual:true})` no reescribe la copia si ya estaba al día (`MIRROR_SUCIO` falso);
  `updateStats({igual:true})` no recalcula los números de las pestañas si se calcularon hace menos de 55 s. **Si `mergePending`
  cambió el largo de `STATE`** (un pedido que otro equipo borró y recién ahora se confirma), cuenta como cambio.
- `autoRefrescar`: con `_igual`, en **Nuevo pedido, Mis pedidos y Contabilidad** no se llama a `autoRepintar` si se repintó hace
  menos de 5 minutos y es el mismo día. Administración y la vista del chofer se repintan siempre (las posiciones del GPS llegan con
  cada lectura aunque la planilla no cambie).
- **Mirá**: ¿hay algo que cambie `STATE` dentro de `mergePending` sin cambiar su largo y que se tenga que ver enseguida en esas
  tres pestañas? (una confirmación de un guardado propio, un pedido que vuelve de la cola, un borrador de Kommo…). ¿Hay algo en esas
  tres pestañas que dependa de la HORA y que no pueda esperar 5 minutos? (avisos que «laten» desde las 16:00/17:00, la cuenta
  regresiva del corte). ¿`saveMirror` sin argumento se sigue llamando en todos los caminos que cambian algo acá?

### 86 y 87 · Listas largas de a partes (`trozosHtml`, `trozosMas`, `trozosMirar`)

- Contabilidad (tabla `#tbl-conta`, 14 columnas, y tarjetas `#cx-cards`) y Mis pedidos (`#mis-lista`) dibujan el primer trozo (50 en
  la tabla, 30 en tarjetas) y un renglón/caja «⬇️ Ver N más». Un `IntersectionObserver` (700 px antes) agrega de a 100 al acercarse al
  final; el botón hace lo mismo.
- Las cuentas, la búsqueda, los totales y el Excel salen de la LISTA, no de lo dibujado. Se buscó en el archivo y nada consulta las
  filas de `#tbl-conta` ni las tarjetas de `#mis-lista` por id (las búsquedas por `data-id`/`data-pid` son de otras pantallas).
- **Mirá**: si la lista se vuelve a dibujar mientras un `trozosMas` está pendiente (`setTimeout`), ¿puede agregar filas de la lista
  VIEJA a la tabla NUEVA? (pista: `TROZOS[clave]` se reemplaza en cada `trozosHtml`, y el marcador se busca por `data-trz`). Ya se arregló uno de este tipo antes de mandarte esto: con la 1ª columna escondida el renglón del botón (una sola celda) se escondía con ella (`tr.trz>td{display:table-cell!important}`). ¿Puede
  quedar el observador mirando un marcador que ya no existe (pérdida de memoria o filas dobles)? ¿Se rompe el orden o los números
  `i+1` de Mis pedidos? ¿Las columnas escondidas de «☰ Columnas» (`tblEstilo`, un `<style>` con `nth-child`) siguen bien con el
  renglón del marcador (`<td colspan>`)?

### 88 y 89 · Detalles visuales (solo CSS)

- 88: el campo de la contraseña de Administración (`.lock-box .field input`) era el único con la cajita gris del navegador.
- 89: `.sem[hidden]{display:none!important}` (la lista de «Semana» escondida se dibujaba igual: una barra blanca vacía) y «A mañana»
  en un solo renglón en las fichas de Administración (`.af-tb small`).

## Lo que todavía NO está acá

- **90** (publicar una copia achicada de `pedidos.html`, 4,3 MB → 2,9 MB, con un workflow de GitHub Pages): se está armando y va en
  otra entrega.
- Las pruebas nuevas de 84 a 89 y la batería entera se están corriendo; el resultado va con la próxima entrega.

## El cambio entero (diff de `pedidos.html`)

```diff
diff --git a/pedidos.html b/pedidos.html
index 80b61b2..81a1670 100644
--- a/pedidos.html
+++ b/pedidos.html
@@ -2086,6 +2086,20 @@ html.wco .dep-modal,html.wco .anu-grito,html.wco .anu,html.wco .quien,html.wco .
 :root{--sa-t:env(safe-area-inset-top,0px)}
 .header{padding-top:var(--sa-t,0px)}
 body{padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px)}   /* el iPhone acostado: nada bajo la cámara */
+/* 🔑 (30/10, §4oa, 88) La contraseña de Administración: era el único campo con la cajita gris del navegador (el estilo general de los
+   campos no incluye type=password y este no tiene clase propia; los otros tres de contraseña usan `.msel`). */
+.lock-box .field input{width:100%;height:48px;padding:0 14px;border:1px solid var(--gray-md);border-radius:var(--r-md);font:inherit;font-size:1rem;text-align:center;letter-spacing:.06em;color:var(--text);background:#fff;transition:border .15s,box-shadow .15s}
+.lock-box .field input:focus{outline:none;border-color:var(--teal);box-shadow:0 0 0 3px var(--teal-lt)}
+/* 🧹 (§4oa, 89) La lista de «Semana» escondida se dibujaba igual: `.sem` pone display:flex y le ganaba a [hidden] (una barra blanca vacía
+   debajo de los filtros de Administración). Y «A mañana» ya no se parte en dos renglones en la ficha. */
+.sem[hidden]{display:none!important}
+.af-tb small{white-space:nowrap;letter-spacing:-.01em}
+/* ⚡ (§4oa, 86/87) El botón del trozo que sigue, en la tabla de Contabilidad y en las grillas de tarjetas. */
+.trz{grid-column:1/-1;text-align:center;padding:10px 0}
+tr.trz td{text-align:center;padding:12px 8px;background:#fafcfc}
+tr.trz>td{display:table-cell!important}   /* «☰ Columnas» esconde con `tr>*:nth-child(n)`: escondida la 1ª, el botón (una sola celda) se iba con ella */
+.trz-btn{font:inherit;font-size:.85rem;font-weight:700;color:var(--teal-dk);background:#fff;border:1px solid var(--teal-border);border-radius:999px;padding:8px 18px;cursor:pointer;min-height:40px}
+.trz-btn:hover{background:var(--teal-lt)}
 html.sa-top .adm-ov,html.sa-top #stock-overlay,html.sa-top #alm-overlay,html.sa-top #visor,
 html.sa-top [style*="position:fixed"][style*="inset:0"],html.sa-top [style*="position: fixed"][style*="inset: 0"],html.sa-top .modal-overlay,html.sa-top #obs-conf,html.sa-top .pal-ov,html.sa-top #salud-overlay,
 html.sa-top .dep-modal,html.sa-top .anu-grito,html.sa-top .anu,html.sa-top .quien,html.sa-top .pm-overlay,html.sa-top #pt-ov{border-top:var(--sa-t,0px) solid var(--wco-bg,#0f4c5c)!important}
@@ -5975,12 +5989,48 @@ function loadMirror(){
 }
 /* 🧾 (27/09) Cada vez que cambia la lista (o el stock) el saldo del formulario se vuelve a calcular (`saldoDatos`, §4gj). */
 var SALDO_GEN=0;
-function saveMirror(){ SALDO_GEN++; try{ localStorage.setItem(LS_KEY, JSON.stringify(STATE)); }catch(e){} }
+/* 🛟 (30/10, §4oa, propuesta 84; dueño: «ok todo») LA COPIA DEL APARATO TIENE TOPE. Era la planilla ENTERA (1,3 millones de letras el
+   30/10, ~400.000 más por mes) en el mismo lugar del navegador donde se guarda cada pedido ANTES de mandarlo (`LS_PEND`, §4hh). Chrome
+   da 5,2 millones (medido); Safari, menos. Lleno, `prepararDurable` no puede conservar el pedido y el panel dice «El pedido NO se
+   envió». Ahora la copia (solo sirve para abrir rápido y para trabajar sin señal) guarda lo de los últimos `MIRROR_DIAS` días, lo que
+   viene, lo no entregado de los últimos `MIRROR_PEND_DIAS` y lo que tiene saldo: unas 780.000 letras, y no crece con los meses.
+   ⚠️ Lo que falte se lee de la planilla con la primera lectura, como siempre. Y si igual falta lugar, `lsPoner` borra primero esta
+   copia y vuelve a intentar: nunca se pierde un pedido sin enviar por la copia. */
+var MIRROR_DIAS=45, MIRROR_PEND_DIAS=180;
+function mirrorRecortar(lista){
+  var ahora=Date.now(), lim=ahora-MIRROR_DIAS*864e5, limP=ahora-MIRROR_PEND_DIAS*864e5;
+  return (lista||[]).filter(function(p){
+    if(!p) return false;
+    var ts=Number(p.ts)||0, fe=p.fecha ? Date.parse(String(p.fecha).slice(0,10)+'T12:00:00-04:00') : 0;
+    if(!(fe>0)) fe=0;
+    if(ts>=lim || fe>=lim || (!ts && !fe)) return true;          // reciente, lo que viene, o sin fecha
+    if(!p.entregado && fe>=limP) return true;                       // sin entregar
+    if(!p.pagado && (Number(p.saldo)||0)>0.005) return true;        // con saldo
+    return false;
+  });
+}
+/* Guarda en el aparato y, si el navegador dice que no hay lugar, borra la copia de la planilla (se vuelve a bajar sola) y prueba otra
+   vez. `esCopia`: es la copia misma; si no entra, se borra la vieja para dejarle el lugar a lo que no se puede perder. */
+function lsPoner(k, v, esCopia){
+  try{ localStorage.setItem(k, v); return true; }catch(e){}
+  try{ localStorage.removeItem(LS_KEY); MIRROR_SUCIO=true; }catch(e){}
+  if(esCopia) return false;
+  try{ localStorage.setItem(k, v); return true; }catch(e){ return false; }
+}
+/* ⚡ (§4oa, propuesta 85) `o.igual`: la lectura de cada minuto vino sin ningún cambio (`apiList` → `_igual`). Si la copia ya estaba al
+   día no se vuelve a escribir (eran 1,3 MB cada minuto). Todo lo que cambia algo acá llama sin `o` y la escribe siempre. */
+var MIRROR_SUCIO=true;
+function saveMirror(o){
+  if(o && o.igual && !MIRROR_SUCIO) return;
+  SALDO_GEN++;
+  var txt; try{ txt=JSON.stringify(mirrorRecortar(STATE)); }catch(e){ return; }
+  MIRROR_SUCIO=!lsPoner(LS_KEY, txt, true);
+}
 function uid(){ return 'p'+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36); }
 function upsert(rec){ for(var i=0;i<STATE.length;i++){ if(STATE[i].id===rec.id){ STATE[i]=rec; return; } } STATE.unshift(rec); }
 
 function getPending(){ try{ return JSON.parse(localStorage.getItem(LS_PEND))||[]; }catch(e){ return []; } }
-function setPending(a){ try{ localStorage.setItem(LS_PEND, JSON.stringify(a)); }catch(e){} }
+function setPending(a){ try{ lsPoner(LS_PEND, JSON.stringify(a)); }catch(e){} }   // 🛟 (§4oa) sin lugar, primero se va la copia de la planilla
 /* ⚠️ Un «no» FIRME del servidor (conflicto, día cerrado, cupos, OC repetida) no se encola:
    reintentarlo es exactamente pisar lo que el servidor protegió, y además quedaría de
    zombi para siempre. `apiSave` lo anota en NO_ENCOLAR y acá se respeta (§4ce). */
@@ -6770,8 +6820,10 @@ function apiList(opts){
   }).then(function(j){
     if(j && j._otraVez) return apiList(opts);
     if(!(j && j.ok && Array.isArray(j.pedidos))) return j;
-    var lista;
+    var lista, igual=false;
     if(j.delta){
+      /* ⚡ (§4oa, 85) Lo cambiado vino vacío: la planilla está igual que en la lectura anterior. */
+      igual=!((j.pedidos||[]).length) && !((j.borrados||[]).length) && !!LISTA_BASE && Number(j.ahora)>=LISTA_BASE.ahora;
       lista=listaAplicarDelta(j);
       if(!lista){
         /* La cuenta de control no dio: se lee entera. Dos veces seguidas = algo de esta planilla que la de lo cambiado no
@@ -6787,6 +6839,7 @@ function apiList(opts){
       /* De cuándo es lo que trae (reloj de Google): el de la copia, que puede ser más nueva que esta respuesta. */
       var ahS=LISTA_BASE ? LISTA_BASE.ahora : (Number(j.ahora)||null);
       if(ahS) Object.defineProperty(lista, '_ahora', { value:ahS, enumerable:false, configurable:true, writable:true });
+      if(igual) Object.defineProperty(lista, '_igual', { value:true, enumerable:false, configurable:true, writable:true });
     }catch(e){}
     try{ localStorage.setItem(LS_LECTURA_T, String(Date.now())); }catch(e){}
     try{ if(j.gps) gpsTomar(j.gps, j.ahora); }catch(e){}   // 🛰️ (§4ko) las posiciones de los camiones vienen con la lectura
@@ -9257,6 +9310,44 @@ function lbMontoEntero(root){
     if(v.scrollWidth>v.clientWidth+1) v.style.whiteSpace='normal';
   });
 }
+/* ⚡ (30/10, §4oa, propuestas 86 y 87; dueño: «ok todo») LAS LISTAS LARGAS, DE A PARTES. Contabilidad dibujaba las ~311 ventas del mes
+   juntas (unos 10.000 elementos: 0,5 s en una compu normal, 2,4 s en una lenta, casi todo acomodándolas en la pantalla) y Mis pedidos
+   120 tarjetas. Ahora va el primer trozo y el resto llega solo al acercarse al final (o con «Ver más»). Las cuentas, la búsqueda, los
+   totales y el Excel no cambian: salen de la lista, no de lo dibujado.
+   ⚠️ En Playwright se dibuja todo de una (las pruebas leen las filas), salvo `window.TROZOS_PRUEBA`. */
+var TROZO_PRIMERO=50, TROZO_SIGUE=100, TROZOS={}, TROZOS_OBS=null;
+function trozosActivo(){ return !(navigator.webdriver && !window.TROZOS_PRUEBA); }
+/* El primer trozo (+ el marcador del resto). `fila(item, índice)`; `o.tabla`/`o.cols` para filas de tabla; `o.primero`. */
+function trozosHtml(clave, items, fila, o){
+  o=o||{}; items=items||[];
+  var n=trozosActivo() ? Math.min(items.length, o.primero||TROZO_PRIMERO) : items.length;
+  var html=items.slice(0, n).map(function(x, k){ return fila(x, k); }).join('');
+  if(n>=items.length){ delete TROZOS[clave]; return html; }
+  TROZOS[clave]={ items:items, fila:fila, i:n, o:o };
+  setTimeout(trozosMirar, 0);
+  return html+trozoMarcador(clave, items.length-n, o);
+}
+function trozoMarcador(clave, quedan, o){
+  var b='<button type="button" class="trz-btn" onclick="trozosMas(\''+clave+'\')">⬇️ Ver '+(quedan>TROZO_SIGUE ? (TROZO_SIGUE+' más · quedan '+quedan) : (quedan===1 ? 'la que queda' : ('las '+quedan+' que quedan')))+'</button>';
+  return o.tabla ? ('<tr class="trz" data-trz="'+clave+'"><td colspan="'+(o.cols||1)+'">'+b+'</td></tr>') : ('<div class="trz" data-trz="'+clave+'">'+b+'</div>');
+}
+function trozosMas(clave){
+  var T=TROZOS[clave], m=document.querySelector('[data-trz="'+clave+'"]'); if(!T || !m) return;
+  var desde=T.i, fin=Math.min(T.items.length, desde+TROZO_SIGUE);
+  var html=T.items.slice(desde, fin).map(function(x, k){ return T.fila(x, desde+k); }).join('');
+  T.i=fin;
+  if(TROZOS_OBS) TROZOS_OBS.unobserve(m);   // el marcador viejo se reemplaza: que el observador no lo siga mirando
+  m.insertAdjacentHTML('beforebegin', html);
+  if(fin<T.items.length) m.outerHTML=trozoMarcador(clave, T.items.length-fin, T.o);
+  else { m.remove(); delete TROZOS[clave]; }
+  setTimeout(trozosMirar, 0);
+}
+/* Al acercarse al final, el trozo siguiente llega solo. */
+function trozosMirar(){
+  if(!('IntersectionObserver' in window)) return;
+  if(!TROZOS_OBS) TROZOS_OBS=new IntersectionObserver(function(es){ es.forEach(function(e){ if(!e.isIntersecting) return; TROZOS_OBS.unobserve(e.target); var k=e.target.getAttribute('data-trz'); setTimeout(function(){ trozosMas(k); }, 0); }); }, { rootMargin:'700px 0px' });
+  document.querySelectorAll('[data-trz]').forEach(function(m){ TROZOS_OBS.observe(m); });
+}
 function renderConta(){
   var tbl=document.getElementById('tbl-conta'); if(!tbl) return;
   try{ nxPstBoton(); }catch(e){}   // 🧾 (§4js, C2) cuántos pagos sin terminar
@@ -9332,7 +9423,7 @@ function renderConta(){
   try{ cxCardsPintar(list, _todas); }catch(e){}
   var head='<thead><tr>'+ctaTh('ing','Ingresado')+ctaTh('ent','Entrega agendada')+ctaTh('nota','N° Nota')+ctaTh('vend','Vendedor')+ctaTh('cli','Cliente')+ctaTh('tipo','Entrega')+ctaTh('cel','Celular')+
            '<th>Productos</th>'+ctaTh('fact','Facturar a')+ctaTh('nit','NIT')+ctaTh('pago','Pago')+'<th>Pagos recibidos</th>'+ctaTh('env','Recargo entrega')+'<th>Observaciones</th></tr></thead>';
-  tbl.innerHTML=head+'<tbody>'+list.map(function(p){
+  tbl.innerHTML=head+'<tbody>'+trozosHtml('conta', list, function(p){
     var reg=regEnSistema(p);
     return '<tr onclick="showContaModal(\''+p.id+'\')" style="cursor:pointer'+(reg?';background:var(--green-lt)':'')+'" title="'+(reg?'Ya registrado en el sistema contable':'Abrir para ver todo y registrar pagos')+'">'+
       '<td style="white-space:nowrap">'+esc(tsFmt(p.ts)||fmtFecha(p.fecha))+'</td>'+
@@ -9350,7 +9441,7 @@ function renderConta(){
       '<td style="white-space:nowrap">'+envioCelda(p)+'</td>'+
       '<td class="prod-cell">'+esc(p.observaciones||'')+'</td>'+
     '</tr>';
-  }).join('')+'</tbody>';
+  }, { tabla:true, cols:14 })+'</tbody>';
   try{ tblEstilo(); tblBarPintar('conta'); }catch(e){ console.error(e); }   // 🗂️ (§4nr, 33)
 }
 /* La fecha de entrega, y el aviso cuando cae en OTRO MES que el ingreso: es el caso de
@@ -9702,7 +9793,7 @@ function cxCardsPintar(list, todas){
   if(!box) return;
   if(!tarj || !(todas||[]).length){ box.innerHTML=''; return; }
   if(!list.length){ box.innerHTML='<div class="empty" style="padding:18px 0">Ninguna venta con ese filtro. <a style="cursor:pointer;color:var(--teal-dk);font-weight:700" onclick="cxFiltro(null)">Ver todas</a></div>'; return; }
-  box.innerHTML=list.map(function(p, i){
+  box.innerHTML=trozosHtml('cx-cards', list, function(p, i){
     var st=cxEstadoVenta(p), reg=regEnSistema(p), prods=contaProdTxt(p.productos), env=envioTotal(p);
     var pagos=contaPagos(p).filter(function(c){ return (Number(c.monto)||0)>0; });
     var ing=contaFecha(p);
@@ -9719,7 +9810,7 @@ function cxCardsPintar(list, todas){
         (env>0 && envioPorCobrar(p)>0.005?('<span class="cx-pg cx-pg-env">🚚 flete por cobrar '+fmtBs0(envioPorCobrar(p))+'</span>'):'')+
       '</div>'+dupChip(p)+
     '</div>';
-  }).join('');
+  }, { primero:30 });
 }
 /* F · cargadas dos veces. «Son distintas» se recuerda en ESTE aparato: el par deja de marcarse acá (en la tabla, el resumen y los
    chips), no en la planilla ni en otras computadoras. */
@@ -17562,7 +17653,8 @@ function zonaCanonica(z, lista){
 /* 🔒 (§4jd, revisión del 10/10: A2-2/A3-1) El próximo camión que de verdad sale: un día que Administración CERRÓ no tiene cupos para
    ofrecer (el formulario ya lo frena y el cuadrito promete desde el siguiente). Antes los anillos decían «AM 7 libres» del sábado cerrado. */
 function hdrProximoAbierto(){ var d=proximoDiaEntrega(), cerr=[]; for(var n=0; n<14 && diaCerrado(d); n++){ cerr.push(d); d=sigDiaHabil(d); } return { d:d, cerrados:cerr }; }
-function updateStats(){
+var LECTURA_IGUAL=false, NX_BADGES_T=0;
+function updateStats(o){
   // El equipo agenda entregas con 1 día de anticipación: mostramos los cupos LIBRES de mañana (por turno).
   var PA=hdrProximoAbierto(), man=PA.d;   // un sábado es el LUNES (§4ex): los cupos que importan son los del próximo camión; un día cerrado se saltea (§4jd)
   var rAM=Math.max(0,limTurno(man,'AM')-cuposUsadosTurno(man,'AM')), rPM=Math.max(0,limTurno(man,'PM')-cuposUsadosTurno(man,'PM'));
@@ -17572,7 +17664,8 @@ function updateStats(){
   var lbl=document.getElementById('stat-hoy-l'); if(lbl) lbl.innerHTML= diaDomingo(man) ? 'Mañana: domingo (cerrado)' : ('Cupos '+_cuando+' · 🌅'+rAM+(diaSabado(man)?' (solo AM)':' 🌆'+rPM)+_cerr);
   hdrPintar(man, rAM, rPM);
   updateFooter();
-  if(typeof nxBadges==='function') nxBadges();   // ✨ (§4js) los números de las pestañas, con cada cambio
+  /* ⚡ (§4oa, 85) Con una lectura sin cambios no se recalculan si se calcularon hace menos de un minuto (su reloj propio los repasa igual). */
+  if(typeof nxBadges==='function' && !(o && o.igual && Date.now()-NX_BADGES_T<55000)) nxBadges();   // ✨ (§4js) los números de las pestañas, con cada cambio
   try{ vivoPintar(); }catch(e){}                  // 🔔 (§4ni, 10) la campanita «En vivo»
 }
 
@@ -18139,7 +18232,7 @@ function borrarPendPoner(id, x){
   id=String(id);
   if(x) BORRAR_PEND_MIO[id]=1; else delete BORRAR_PEND_MIO[id];   // la de esta página la sigue esta página
   try{
-    var m=borrarPendLeer(); if(x) m[id]=x; else delete m[id]; localStorage.setItem(LS_BORRAR_PEND, JSON.stringify(m));
+    var m=borrarPendLeer(); if(x) m[id]=x; else delete m[id]; lsPoner(LS_BORRAR_PEND, JSON.stringify(m));   // 🛟 (§4oa)
     var y=borrarPendLeer()[id]; return x ? !!(y && y.t===x.t) : !y;
   }catch(e){ return false; }
 }
@@ -19345,7 +19438,13 @@ function refrescarEstado(){
 function refrescarEstadoYa(){
   return conTopeDuro(apiList(), CARGA_TOPE, 'tardo_datos').then(function(res){
     if(res&&res.ok&&Array.isArray(res.pedidos)){
-      STATE=mergePending(res.pedidos); saveMirror(); updateStats();
+      /* ⚡ (§4oa, 85) Sin cambios: ni copia, ni números de pestañas, ni repintar. Si la junta con lo de acá sacó o agregó algo (un
+         pedido que otro equipo borró y recién ahora se confirma, §4go), sí cambió. */
+      var _igual=!!res.pedidos._igual, _n0=STATE.length;
+      STATE=mergePending(res.pedidos);
+      if(STATE.length!==_n0) _igual=false;
+      LECTURA_IGUAL=_igual;
+      saveMirror(_igual?{igual:true}:null); updateStats(_igual?{igual:true}:null);
       ULTIMO_REFRESCO=Date.now(); ULTIMO_ERROR='';
       cargaEstado('ok');
       saldoTrasLectura();                        // 🧾 (27/09) el saldo debajo de cada producto, con lo recién leído (§4gj)
@@ -19586,7 +19685,16 @@ function autoOcupado(){
 }
 /* Repinta SOLO la vista que se está mirando, y le devuelve el scroll donde estaba: que
    la lista salte sola mientras uno la lee es peor que tenerla desactualizada. */
+/* ⚡ (§4oa, 85) Con la lectura sin cambios, Nuevo pedido, Mis pedidos y Contabilidad no se vuelven a dibujar (en el formulario trababa
+   lo que se estaba escribiendo); igual se repintan cada `AUTO_REPINTAR_MS` y al cambiar el día, por lo que depende de la hora.
+   Administración y la vista del chofer se repintan siempre: las posiciones del GPS llegan con cada lectura aunque la planilla no cambie. */
+var AUTO_PINTADO_T=0, AUTO_PINTADO_DIA='', AUTO_REPINTAR_MS=5*60000;
+function autoRepintarPuedeEsperar(){
+  if(!LECTURA_IGUAL || Date.now()-AUTO_PINTADO_T>=AUTO_REPINTAR_MS || AUTO_PINTADO_DIA!==todayStr()) return false;
+  return ['view-form','view-mis','view-conta'].some(function(id){ var v=document.getElementById(id); return v && v.classList.contains('active'); });
+}
 function autoRepintar(){
+  AUTO_PINTADO_T=Date.now(); AUTO_PINTADO_DIA=todayStr();
   var y=window.scrollY;
   if(document.getElementById('view-form').classList.contains('active')){ renderCupoForm(); pintarBotonCierre(); }
   else if(document.getElementById('view-admin').classList.contains('active')){ if(UNLOCKED) renderAdmin(); }
@@ -19608,7 +19716,7 @@ function autoRefrescar(motivo){
   return flushPending().then(function(){
     if(autoOcupado()) { updateFooter(); return false; }
     return refrescarEstado().then(function(ok){
-      if(ok){ autoRepintar(); updateFooter(); }
+      if(ok){ if(!autoRepintarPuedeEsperar()) autoRepintar(); updateFooter(); }
       return ok;
     });
   });
@@ -27293,7 +27401,7 @@ function renderMis(){
   /* (26/09) El corte en 120 era callado: el chip decía «📋 Todos 300» y abajo no había nada que
      dijera que faltaban 180. Ahora lo dice y deja ver más. */
   var verNota=misVeNota(v);                         // (07/10) la nota de venta, solo a Eduardo
-  tbl.innerHTML=lista.slice(0,MIS_TOPE).map(function(p,i){ return misCardHtml(p, i+1, todos, verNota); }).join('')+
+  tbl.innerHTML=trozosHtml('mis', lista.slice(0,MIS_TOPE), function(p,i){ return misCardHtml(p, i+1, todos, verNota); }, { primero:30 })+   // ⚡ (§4oa, 87)
     (lista.length>MIS_TOPE ? ('<div style="grid-column:1/-1;text-align:center;font-size:.85rem;color:var(--muted);padding:8px 0">'+
       'Se ven los '+MIS_TOPE+' más nuevos de '+lista.length+'. '+
       '<button class="btn btn-ghost btn-sm" style="width:auto" onclick="MIS_TOPE+=120;renderMis()">Ver '+Math.min(120, lista.length-MIS_TOPE)+' más</button></div>') : '');
@@ -36353,7 +36461,7 @@ function tstPasesPend(){   // se relee cada vez: otra pestaña de este aparato p
 }
 function tstPasesPendPoner(L){
   TST_PASES_PEND=L; var txt=L.length ? JSON.stringify(L) : '', ok=false;
-  try{ if(L.length) localStorage.setItem(TST_PASE_LS, txt); else localStorage.removeItem(TST_PASE_LS); ok=((localStorage.getItem(TST_PASE_LS)||'')===txt); }catch(e){}
+  try{ if(L.length) lsPoner(TST_PASE_LS, txt); else localStorage.removeItem(TST_PASE_LS); ok=((localStorage.getItem(TST_PASE_LS)||'')===txt); }catch(e){}
   TST_PASE_LS_OK=ok; return ok;
 }
 function tstPaseIdGuardado(id){ try{ return (JSON.parse(localStorage.getItem(TST_PASE_LS)||'[]')||[]).some(function(x){ return x && x.id===id; }); }catch(e){ return false; } }
@@ -41568,7 +41676,7 @@ var CIERRE_ENT_EN_CURSO=false, CIERRE_ENT_ULT=null, LS_CIERRE_PEND='me_cierre_pe
 /* ⏳ (05/10, Codex H6) Un cierre que no pudo releer la planilla NO confirma nada: queda PENDIENTE DE SINCRONIZAR en este
    aparato (`localStorage`) y se aplica solo, revalidado, con la próxima lectura buena (`cierreEntSincronizar`). */
 function cierreEntPendiente(){ try{ var j=JSON.parse(localStorage.getItem(LS_CIERRE_PEND)||'null'); return (j && j.ids && j.ids.length) ? j : null; }catch(e){ return null; } }
-function cierreEntPendienteGuardar(x){ try{ if(x) localStorage.setItem(LS_CIERRE_PEND, JSON.stringify(x)); else localStorage.removeItem(LS_CIERRE_PEND); }catch(e){} }
+function cierreEntPendienteGuardar(x){ try{ if(x) lsPoner(LS_CIERRE_PEND, JSON.stringify(x)); else localStorage.removeItem(LS_CIERRE_PEND); }catch(e){} }
 /* El plan de un cierre: qué se tilda (con el día declarado) y cómo estaba cada pedido al abrir. Lo destildado no entra: no se
    le escribe nada (dueño, 05/10). */
 function cierreEntPlan(quien){
@@ -49708,6 +49816,7 @@ function nxBadge(idTab, n, cls, tit){
   b.title=tit||'';
 }
 function nxBadges(){
+  NX_BADGES_T=Date.now();
   try{
     var v=getVendedorMem(), D=v?nxM1Datos(v, false):null;
     nxBadge('tab-mis', (D && D.tarde) ? D.faltan : 0, 'nx-tb-nar', 'Clientes de mañana sin avisar');
```

## Las funciones de alrededor que hacen falta para revisar (como están en ese commit)

```js
 5983  function loadMirror(){
 5984    try{ STATE=JSON.parse(localStorage.getItem(LS_KEY))||[]; }catch(e){ STATE=[]; }
 5985    if(!Array.isArray(STATE))STATE=[];
 5986    STATE=leerCierresDeLista(STATE);   // por si una copia vieja todavía trae filas del sistema
 5987    loadCierresMirror(); loadArqueoMirror(); loadRetirosMirror(); loadCargaMirror(); loadBorrMirror();
 5988    sisCargarPestana();   // §4fz-b: el stock, el arqueo y la versión del servidor sobre la que trabaja ESTA pestaña
 5989  }

 6037  function queuePending(rec){
 6038    if(NO_ENCOLAR[rec.id] && Date.now()-NO_ENCOLAR[rec.id]<10000) return;
 6039    /* §4fz-b: la cola guarda UNA fila por id. Si la que había del stock o del arqueo la dejó OTRA
 6040       pestaña o un panel viejo, lo suyo no está en esta memoria: se junta antes de reemplazarla, o se
 6041       perdía. */
 6042    if(typeof SIS_FUSION!=='undefined' && SIS_FUSION[String(rec.id)]){
 6043      var vieja=getPending().filter(function(p){ return p && String(p.id)===String(rec.id) && !sisFilaEnMemoria(p); })[0], F=SIS_FUSION[String(rec.id)];
 6044      if(vieja && F.cargado()) rec=sisPlegar(vieja);
 6045      /* Sin memoria cargada (primera vez, sin señal) no hay dónde juntarla: se unen las DOS filas en
 6046         la que ya esperaba (con su base y su pestaña), así ninguna se pierde. */
 6047      else if(vieja){ var U=F.fusionar(null, F.leer(vieja.observaciones), F.leer(rec.observaciones)); rec=Object.assign({}, vieja, { observaciones:F.texto(U), _t:Date.now() }); }
 6048      // Lo que espera en la cola es la memoria de AHORA (con lo que haya juntado), no la foto del momento del toque.
 6049      else if(sisFilaEnMemoria(rec) && SIS_FUSION[String(rec.id)].cargado()) rec=SIS_FUSION[String(rec.id)].fila();
 6050    }
 6051    var a=getPending().filter(function(p){return p.id!==rec.id;}); a.push(rec); setPending(a); updateFooter();
 6052    return rec;
 6053  }

19865  function mergePending(serverList){
19866    /* (28/09) En qué momento se pidió esta lectura (`apiList`). Sin la marca —una prueba que llama directo— cuenta como
19867       pedida ahora: después de todo lo ya confirmado. */
19868    var t0=(serverList && serverList._pedidaN!=null) ? Number(serverList._pedidaN) : Infinity;
19869    var tPed=(serverList && serverList._pedidaT!=null) ? Number(serverList._pedidaT) : null;   // (28/09, 2ª revisión) ver `localManda`
19870    var ahS=(serverList && serverList._ahora!=null) ? Number(serverList._ahora) : null;         // (30/09, §4he) de cuándo es, con el reloj de Google
19871    SALDO_VISTO=ahS||0;                      // 📦 (02/10) la lectura con la que se va a calcular el saldo: su hora viaja con el guardado (`saldoReservaArmar`)
19872    serverList=(serverList||[]).filter(function(p){ return !(p && borradoAqui(p.id)); });   // (26/09) lo recién borrado acá no vuelve con una lectura vieja
19873    serverList=leerCierresDeLista(serverList, true);   // la fila de días cerrados NO es un pedido
19874    serverList.forEach(function(p){ if(p) p.oc=cleanOC(p.oc); });
19875    /* ⚠️ UN `list` QUE VUELVE TARDE NO PISA LO QUE SE ACABA DE TOCAR (§4eo). La consulta sale,
19876       el chofer marca Entregado, la consulta vuelve con la copia de ANTES y la pantalla le
19877       deshace la marca: lo toca de nuevo y ese segundo guardado revierte en el servidor. Es
19878       exactamente «revisa 2-3 veces y lo vuelve a subir». Para los pedidos con un guardado en
19879       vuelo, en espera o de hace menos de 90 s, y para los que esperan en la cola, manda la
19880       copia LOCAL. Cuando el servidor conteste, `aplicarSello` la actualiza. */
19881    var pendTodos=getPending();
19882    var enCola={}; pendTodos.forEach(function(p){ if(p) enCola[p.id]=1; });
19883    serverList=serverList.map(function(s){
19884      var id=s&&s.id; if(!id) return s;
19885      if(saveReciente(id)){ var local=findById(id); if(local && localManda(id, local, s, t0, enCola, tPed, ahS)) return local; }   // (28/09) una más nueva de la planilla gana
19886      for(var i=0;i<pendTodos.length;i++) if(pendTodos[i].id===id) return pendTodos[i];
19887      return s;
19888    });
19889    var ids={}; serverList.forEach(function(p){ids[p.id]=1;});
19890    var pend=pendTodos.filter(function(p){return !ids[p.id];});
19891    /* ⏳ (26/09, revisión de Pedidos) …Y EL PEDIDO NUEVO QUE ESA LECTURA TODAVÍA NO TRAE. La vuelta automática
19892       (cada 30 s en Mis pedidos) o la bajada de 4 s que hace `submitPedido` salen ANTES de guardar y, si Google
19893       tarda, vuelven DESPUÉS del «Pedido enviado al equipo ✓» con la planilla de antes: el pedido recién
19894       cargado desaparecía de la pantalla (y de los cupos) hasta la lectura siguiente, y la vendedora que no lo
19895       veía lo volvía a cargar. Lo guardado hace menos de 90 s que sigue en ESTE dispositivo se queda; uno que
19896       se borró o que el servidor rechazó ya no está en STATE (ni en SAVE_ULTIMO) y no vuelve. */
19897    for(var kS in SAVE_ULTIMO){
19898      if(ids[kS] || enCola[kS] || !saveReciente(kS)) continue;
19899      var locS=findById(kS);
19900      if(!locS || esFilaSistema(locS) || esBorrador(locS)) continue;
19901      /* (28/09, revisión de Codex) …solo si esta lectura salió ANTES de que el servidor lo confirmara. Si salió después y no
19902         lo trae, lo borraron desde otro equipo: conservarlo lo volvía a crear en la planilla al editarlo. */
19903      if(localManda(kS, locS, null, t0, enCola, tPed, ahS)){ serverList.push(locS); ids[kS]=1; }
19904      else borradoFuera(locS);
19905    }
19906    /* 💵 LOS RETIROS EN COLA TAMBIÉN (§4ek). `leerCierresDeLista` acaba de dejar en RETIROS
19907       solo lo que vino del servidor; un retiro que quedó en la cola (sin señal, sin clave,
19908       servidor ocupado) desaparecía de la ventana de retiros en el primer refresco aunque
19909       siguiera pendiente — la vendedora veía «1 sin enviar» abajo y el retiro no estaba en
19910       ningún lado. Se vuelve a sumar hasta que se mande. */
19911    var pendRet=pend.filter(esFilaRetiro);
19912    // …y los retiros con un guardado en vuelo (el list volvió antes que el «ok») también (§4eo)
19913    /* (28/09) Con la misma regla que los pedidos (`localManda`): un retiro corregido o borrado desde otro equipo no se tapa. */
19914    for(var kU in SAVE_ULTIMO){
19915      var rU=SAVE_ULTIMO[kU].rec;
19916      if(!esFilaRetiro(rU) || !saveReciente(kU)) continue;
19917      var sU=null; for(var iR=0;iR<RETIROS.length;iR++){ if(String(RETIROS[iR].id)===String(kU)){ sU=RETIROS[iR]; break; } }
19918      if(localManda(kU, rU, sU, t0, enCola, tPed, ahS)) pendRet=pendRet.concat([rU]);
19919    }
19920    if(pendRet.length){
19921      /* 26/09: y si el servidor ya lo tiene, manda la versión de la cola o del guardado en el aire,
19922         como con los pedidos (arriba). Antes solo se agregaban los que FALTABAN: un retiro corregido
19923         de 400 a 500 con el servidor ocupado volvía a 400 en el primer refresco y el cuadre decía
19924         «le quedan Bs 600» hasta que saliera la cola. */
19925      var idsR={}; RETIROS.forEach(function(r, i){ idsR[String(r.id)]=i; });
19926      pendRet.forEach(function(r){ var kR=String(r.id); if(idsR[kR]!=null) RETIROS[idsR[kR]]=r; else { idsR[kR]=RETIROS.length; RETIROS.push(r); } });
19927      saveRetirosMirror(); renderRetirosSiActivo();
19928    }
19929    /* ⚠️ Las filas del sistema en cola NO son pedidos (§4ev, §4er MEDIA): la del stock con el
19930       servidor ocupado quedaba en la cola, `leerCierresDeLista` la sacaba de la lista del
19931       servidor y este `concat` la volvía a meter en STATE — Administración en «Todo» dibujaba
19932       «📦 STOCK DEL DEPÓSITO — fila del sistema, NO BORRAR» como un pedido y las fichas
19933       contaban un pedido de más. Los retiros ya se sumaron a RETIROS arriba; el stock en
19934       memoria manda mientras esté en cola (`filaSistemaEnVuelo`). */
19935    return serverList.concat(pend.filter(function(p){ return !esFilaSistema(p); }));
19936  }

19842  function localManda(id, loc, srv, n0, enCola, tPed, ahoraSrv){
19843    if(SAVE_EN_VUELO[id] || SAVE_EN_ESPERA[id] || (enCola && enCola[id])) return true;
19844    var u=SAVE_ULTIMO[id];
19845    if(!u || !(Date.now()-u.t<90000)) return false;
19846    var revLoc=Math.max(Number(loc && loc.rev)||0, Number(SAVE_REV[id])||0);
19847    if(srv){ delete u.faltaT; return (Number(srv.rev)||0)<=revLoc; }                  // la lectura lo trae: no falta nada
19848    if(ahoraSrv!=null && u.okAhora!=null) return Number(ahoraSrv) < Number(u.okAhora)+MARGEN_RELOJ_MS;   // (30/09) se compara, no se adivina
19849    if(Number(n0)<((u.okN!=null) ? Number(u.okN) : -Infinity)) return true;          // pedida antes: lectura atrasada
19850    if(tPed==null) return false;                                                        // lista sin marcas (una prueba): fresca
19851    if(u.okT!=null && (Number(tPed)-Number(u.okT))<LECTURA_VIEJA_MS) return true;      // pedida enseguida: puede ser la copia vieja
19852    if(u.faltaT==null){ u.faltaT=relojMs(); borradoConfirmarLuego(); return true; }     // la 1ª ausencia: sospecha, se relee sola
19853    return (Number(tPed)-Number(u.faltaT))<BORRADO_CONFIRMA_MS;                         // otra lectura, pedida después: borrado
19854  }

 6768  function listaAplicarDelta(j){
 6769    var B=LISTA_BASE, ah=Number(j.ahora)||0;
 6770    if(!B || !(ah>0)) return null;
 6771    if(ah<B.ahora) return listaDeBase();                    // llegó tarde: la copia ya es más nueva que esta respuesta
 6772    var filas={}, k; for(k in B.filas) filas[k]=B.filas[k];
 6773    var orden=B.orden.slice(), fuera={}, hayFuera=false;
 6774    (j.borrados||[]).forEach(function(b){
 6775      var id=String((b&&b[0])||''), ms=Number(b&&b[1])||0;
 6776      if(filas[id] && !(filas[id].rev>ms)){ delete filas[id]; fuera[id]=1; hayFuera=true; }   // uno vuelto a crear después del borrado se queda
 6777    });
 6778    if(hayFuera) orden=orden.filter(function(id){ return !fuera[id]; });
 6779    (j.pedidos||[]).forEach(function(p){
 6780      var id=String((p&&p.id)||''); if(!id) return;
 6781      var r=Number(p.rev)||0;
 6782      if(filas[id]){ if(r<filas[id].rev) return; } else orden.push(id);
 6783      filas[id]={ txt:JSON.stringify(p), rev:r };
 6784    });
 6785    if(orden.length!==Number(j.n) || listaHuella(filas, orden)!==Number(j.huella)) return null;
 6786    LISTA_BASE={ ahora:ah, t:B.t, tw:B.tw, filas:filas, orden:orden };
 6787    LISTA_DELTA_FALLAS=0;
 6788    return listaDeBase();
 6789  }

19431  function refrescarEstado(){
19432    if(!CONNECTED) return Promise.resolve(false);
19433    var p=refrescarEstadoYa();
19434    REFRESCO_EN_VUELO=p;
19435    p.then(function(){ if(REFRESCO_EN_VUELO===p) REFRESCO_EN_VUELO=null; });
19436    return p;
19437  }

19665  function autoOcupado(){
19666    var m=document.getElementById('modal');
19667    if(m && m.classList.contains('on')) return 'ficha abierta';
19668    if(typeof COMP_SUBIENDO!=='undefined' && COMP_SUBIENDO>0) return 'subiendo una imagen';
19669    var b=document.getElementById('f-submit');
19670    if(b && b.disabled) return 'guardando el pedido';
19671    // 📦 «stock» también (§4ev): con la pantalla de stock abierta se anotan recogidas y conteos.
19672    var ids=['mapa','ruta','carga','faltantes','entregas','retiros','prods','reporte','parte','envio','stock'];
19673    for(var i=0;i<ids.length;i++){
19674      var o=document.getElementById(ids[i]+'-overlay');
19675      if(o && o.style.display && o.style.display!=='none') return ids[i];
19676    }
19677    var v=document.getElementById('visor');
19678    if(v && v.style.display && v.style.display!=='none') return 'visor';
19679    /* 🧮 26/09: tipeando el arqueo. El número se guarda al salir del campo; repintar el cuadre con el
19680       campo adentro se llevaba lo tipeado y el foco (y Chromium, al sacar el campo, disparaba su
19681       `change` en el medio del repintado: excepción). Se refresca en la próxima vuelta. */
19682    var ae=document.activeElement;
19683    if(ae && ae.classList && ae.classList.contains('cua-arqueo')) return 'anotando el arqueo';
19684    return '';
19685  }

19696  function autoRepintar(){
19697    AUTO_PINTADO_T=Date.now(); AUTO_PINTADO_DIA=todayStr();
19698    var y=window.scrollY;
19699    if(document.getElementById('view-form').classList.contains('active')){ renderCupoForm(); pintarBotonCierre(); }
19700    else if(document.getElementById('view-admin').classList.contains('active')){ if(UNLOCKED) renderAdmin(); }
19701    else if(document.getElementById('view-mis').classList.contains('active')) renderMis();
19702    else if(document.getElementById('view-chofer').classList.contains('active')) renderChofer();
19703    else if(document.getElementById('view-conta').classList.contains('active')) renderContaSiActiva();
19704    window.scrollTo(0,y);
19705  }

19706  function autoRefrescar(motivo){
19707    if(!CONNECTED) return Promise.resolve(false);
19708    if(document.hidden) return Promise.resolve(false);
19709    /* ⚠️ MANDAR LO QUE QUEDÓ SIN ENVIAR VA PRIMERO, y NO espera a que la pantalla esté
19710       quieta: no mueve nada en pantalla, y un pedido sin enviar es una venta que para el
19711       resto del equipo todavía no existe.
19712       Antes esto solo se reintentaba al recargar la página, al guardar otro pedido con
19713       éxito, o si alguien se daba cuenta del "sin enviar" del pie y tocaba "reintentar".
19714       O sea: una vendedora que se quedaba sin señal, cargaba el pedido y recuperaba señal
19715       podía tenerlo en la cola durante horas sin enterarse. */
19716    return flushPending().then(function(){
19717      if(autoOcupado()) { updateFooter(); return false; }
19718      return refrescarEstado().then(function(ok){
19719        if(ok){ if(!autoRepintarPuedeEsperar()) autoRepintar(); updateFooter(); }
19720        return ok;
19721      });
19722    });
19723  }

```
