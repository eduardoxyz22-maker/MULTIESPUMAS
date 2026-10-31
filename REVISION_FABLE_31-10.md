# Revisión pedida a Fable: tres cambios del 31/10 en el panel de pedidos de MultiEspumas

> Archivo para pegar entero en la API de Claude (Fable). Código público del repositorio `eduardoxyz22-maker/MULTIESPUMAS`;
> sin claves ni datos de clientes.

## Qué te pido

Sos un revisor de código con experiencia. Revisá los tres cambios de abajo y buscá **errores reales**: casos concretos en los que el
panel haga algo mal, pierda o duplique plata, frene a quien no tiene que frenar, deje pasar lo que debería frenar, se cuelgue o
muestre algo falso. No me interesan cambios de estilo ni «buenas prácticas» sin un caso que falle.

Para cada hallazgo, en este formato:

1. **Dónde** (función y, si podés, la línea `pedidos.html:N` que figura arriba de cada fragmento).
2. **Gravedad**: ALTA (plata, datos o se bloquea el trabajo) · MEDIA (resultado equivocado que alguien puede notar) · BAJA.
3. **Cómo falla**: un caso concreto paso a paso (qué toca la persona, qué datos tiene la venta, qué pasa y qué debería pasar).
4. **Arreglo** propuesto (corto).

Al final, aparte: **las dudas** (lo que no podés confirmar con el código que tenés acá) y **la lista de lo que revisaste**. Si algo
no está en este archivo y lo necesitás para decidir, decilo en vez de suponerlo.

## Cómo es el panel (lo mínimo para entender el código)

- Una página sola (`pedidos.html`, ~51.000 líneas de JavaScript sin frameworks) que usan vendedoras, logística y contabilidad desde
  la compu y el celular. Guarda en una planilla de Google por un Apps Script (`apiPost`/`apiSave`). `STATE` = la lista de pedidos
  en memoria; `findById(id)` busca uno.
- Cada pedido guarda sus pagos en UN texto (`p.metodoPago`): `~QR BISA 1000 @2026-10-20 #5071 %fotoId + Efectivo 500 @2026-10-28`.
  `~` = el adelanto (anticipo), `^` = recargo por entrega (flete), `%id` = foto del comprobante en Drive. `contaPagos(p)` lo devuelve
  como lista (adelanto primero), `cobrosDe(p)` solo los cobros, `anticipoDe(p)` el adelanto, `enviosDe(p)` los recargos.
- En Playwright (las pruebas) varias cosas nuevas van apagadas salvo una marca (`window.X_PRUEBA`), para no cambiar las pruebas viejas.
- Montos: `parseMonto`/`montoForm` (acepta «1.500,50»), `r2` redondea a centavos, las comparaciones de plata van contra 0,005.

---

## 1 · 📎 La foto que se pega a un pago YA registrado también se lee (sin publicar)

**Pedido del dueño:** que la foto que Contabilidad le agrega con 📎 a un pago ya registrado (cobro, adelanto o recargo) se lea con IA
en ese momento, como ya pasa con la foto que se sube al cargar un pago nuevo.

**Cómo era:** la lectura al subir (`iasSubida` → `iasPedir` → `iasMandar`, POST `{action:'iaComprobantes', fotos:[ids]}` al Apps
Script, que la manda a Claude y guarda la lectura de cada foto: una foto leída nunca se vuelve a pagar) solo corría en dos lugares:
el formulario del pedido y «Registrar pago» de Contabilidad. El 📎 sobre un pago ya anotado (`onCompElegido` con `destino`) no leía:
esas fotos quedaban para la ventana «Revisar las fotos con IA» del mes, que lee lo pendiente de una vez (y ahí el dueño ve el costo).

**El cambio:** en las tres ramas con `destino` de `onCompElegido`, después de reescribir el pago, `iasPegada(p.id, fotoId)`:
- `iasPegX` busca el pago en `compsPagosDe(p)` (la MISMA lista que usa la revisión del mes: deja afuera el efectivo y los montos 0).
- Pide la lectura de TODAS las fotos de ese pago que falten (para comparar la suma con lo anotado).
- Debajo del renglón del pago en la ficha, `iasPegBox` dibuja una caja `.ias-peg` con lo que dice la foto, con la misma comparación del
  mes (`iacComparar`): «Leyendo…», «✅ coincide» o el aviso, SIN botones de arreglo (el pago ya está anotado: se corrige con ✏️ Corregir).
- Cuando llega la lectura, `iasRepintar` → `iasPintarPeg` rehace SOLO esas cajas (no toda la ficha, para no perder lo tipeado).

**Mirá en especial:**
- ¿`iasPegX` puede encontrar el pago EQUIVOCADO (la misma foto en dos pagos de la venta, o el índice `data-i` de `contaPagos` que no
  coincide con el pago que muestra la caja después de que otro equipo cambió la venta y llegó una lectura nueva)?
- ¿Hay algún caso en que se pague una lectura que la revisión del mes no habría pagado (efectivo, pagos de otro mes, fotos de otra
  venta)? ¿O en que se pida la misma foto dos veces a la vez?
- `aplicarCobros`/`aplicarCompsAnticipo`/`aplicarEnvios` reescriben `p.metodoPago` en el momento y guardan después: ¿`compsPagosDe(p)`
  ya ve la foto nueva cuando se llama a `iasPegada`? ¿Qué pasa si el guardado falla o choca (`conflicto`) y la planilla vuelve atrás?
- ¿La caja puede quedar en «Leyendo…» para siempre?

### El cambio (diff)

```diff
diff --git a/pedidos.html b/pedidos.html
index 973a881..da8665a 100644
--- a/pedidos.html
+++ b/pedidos.html
@@ -13890,6 +13890,7 @@ function contaPagosHtml(p){
       faltaMonto+
       cajaEdit+
       comp+
+      iasPegBox(p, c, i)+                          // 🔎 (31/10) lo que dice la foto que se pegó acá con 📎
       envBtns+
     '</div>';
   }).join('');
@@ -13982,12 +13983,14 @@ function onCompElegido(ev){
       ae[_e].comps=compsArr(compsArr(ae[_e].comps!=null?ae[_e].comps:ae[_e].comp).concat([res.fotoId]));
       ae[_e].comp=ae[_e].comps[0]||'';
       aplicarEnvios(p, ae);
+      iasPegada(p.id, res.fotoId);                  // 🔎 (31/10) también la del 📎 se lee ya
       toast('Comprobante del recargo adjuntado ✓','ok');
       showContaModal(p.id);
     }else if(destino && destino.anticipo){
       // Al ADELANTO: su renglón se reescribe aparte (no está en la lista de cobros).
       var a0=anticipoDe(p);
       if(a0) aplicarCompsAnticipo(p, compsArr(a0.comps!=null?a0.comps:a0.comp).concat([res.fotoId]));
+      if(a0) iasPegada(p.id, res.fotoId);           // 🔎 (31/10) también la del 📎 se lee ya
       toast('Comprobante del adelanto adjuntado ✓','ok');
       showContaModal(p.id);
     }else if(destino){
@@ -13998,6 +14001,7 @@ function onCompElegido(ev){
         c0.comps=compsArr(compsArr(c0.comps!=null?c0.comps:c0.comp).concat([res.fotoId]));
         c0.comp=c0.comps[0]||'';
         aplicarCobros(p, arr);
+        iasPegada(p.id, res.fotoId);                // 🔎 (31/10) también la del 📎 se lee ya
       }
       toast('Comprobante adjuntado ✓','ok');
       showContaModal(p.id);
@@ -49289,7 +49293,7 @@ function ctaAvOk(id, v){
    · `iacPuede` (la contraseña) sigue para la ventana de Contabilidad, que lee el mes entero; esto es foto por foto y solo lo que se sube.
    · En Playwright apagado salvo `window.IAC_SUBIR_PRUEBA`.
    ========================================================================== */
-var IAS={ mias:{}, lee:{}, err:{}, intentos:{}, cola:[], tic:null, enVuelo:false, parado:0, refsT:0, refsCorre:false, rec:null, recK:'' };
+var IAS={ mias:{}, peg:{}, lee:{}, err:{}, intentos:{}, cola:[], tic:null, enVuelo:false, parado:0, refsT:0, refsCorre:false, rec:null, recK:'' };
 var IAS_REFS_DIAS=45, IAS_PAUSA_MS=15*60000, IAS_REINTENTOS=2, IAS_ESPERA_MS=4000, IAS_JUNTA_MS=600, IAS_TOPE_MS=75000, IAS_REFS_CADA_MS=30*60000;
 function iasActivo(){ return !navigator.webdriver || !!window.IAC_SUBIR_PRUEBA; }
 function iasPuedeLeer(){ return iasActivo() && iacServidorOk() && !!CONNECTED && !(IAS.parado && Date.now()-IAS.parado<IAS_PAUSA_MS); }
@@ -49395,7 +49399,7 @@ function iasLinea(cls, txt, btns){ return '<div class="ias '+cls+'"><span class=
 /* ctx: { donde:'f1'|'f2'|'cta', ef (se puede agregar efectivo), cor (se puede corregir el monto), tienda, sinFecha } */
 function iasHtml(c, ctx){
   if(!c) return '';
-  if(c.est==='pe') return iasLinea('ias-lee', '🔎 Leyendo el comprobante… <small>puede tardar unos segundos; si guardás antes, no pasa nada</small>');
+  if(c.est==='pe') return iasLinea('ias-lee', '🔎 Leyendo el comprobante… <small>puede tardar unos segundos'+(ctx && ctx.donde==='peg' ? '' : '; si guardás antes, no pasa nada')+'</small>');
   if(c.est==='ok') return iasLinea('ias-ok', '✅ La foto coincide con lo anotado.');
   if(c.est==='nl') return iasLinea('ias-gris', '❓ '+esc(String(c.c||c.chip||'').replace(/^./, function(s){ return s.toUpperCase(); }))+'.');
   var out=[], hoy=diaNegocio(), d=ctx.donde;
@@ -49450,7 +49454,51 @@ function iasPintarConta(){
     if(c) h=iasHtml(c, { donde:'cta', ef:false, cor:true, tienda:false, sinFecha:false, met:x.met, ban:x.ban }); }catch(e){ h=''; }
   if(box._h!==h){ box.innerHTML=h; box._h=h; }
 }
-function iasRepintar(){ iasPintarForm(); iasPintarConta(); }
+function iasRepintar(){ iasPintarForm(); iasPintarConta(); iasPintarPeg(); }
+/* 📎 (31/10, el dueño: «sí, que se lea también el 📎») La foto que Contabilidad le pega a un pago YA registrado (cobro, adelanto o
+   recargo) también se lee en ese momento, con la MISMA cuenta de la revisión del mes (`compsPagosDe` + `iacComparar`), y lo que dice va
+   debajo de ese pago en la ficha. Se piden todas las fotos del pago que falten (las ya leídas el servidor las devuelve sin gastar). El
+   efectivo no se lee (`compsPagosDe` no lo trae). Sin botones de arreglo: el pago ya está anotado, se corrige con ✏️ Corregir. */
+function iasPegX(p, fid){
+  var L=p ? compsPagosDe(p) : [];
+  for(var i=0;i<L.length;i++) if(L[i].comps.indexOf(fid)>=0) return L[i];
+  return null;
+}
+function iasPegada(pid, fid){
+  fid=String(fid||''); if(!fid || !iasActivo()) return;
+  var x=iasPegX(findById(pid), fid); if(!x) return;
+  IAS.peg[fid]=String(pid);
+  x.comps.forEach(function(f){ iasPedir(f); });
+}
+function iasPegEvaluar(x){
+  if(!x || !x.comps.some(function(f){ return IAS.peg[f]; })) return null;
+  var cs=x.comps.filter(function(f){ return IAC.res[f] || IAS.lee[f]; });
+  if(!cs.length) return null;                     // no se pudo leer (tope, sin crédito, red): no se dice nada, como al subir
+  if(cs.some(function(f){ return !IAC.res[f]; })) return { est:'pe' };
+  var y=Object.assign({}, x, { comps:cs });
+  var refs=iacRefs(iasPagosRecientes().filter(function(z){ return !z.comps.some(function(f){ return cs.indexOf(f)>=0; }); }));
+  return iacComparar(y, refs);
+}
+function iasPegHtml(p, i){
+  var c=contaPagos(p)[i]; if(!c) return '';
+  var cs=compsArr(c.comps!=null?c.comps:c.comp), fid=''; cs.forEach(function(f){ if(!fid && IAS.peg[f]) fid=f; });
+  if(!fid) return '';
+  var x=iasPegX(p, fid), r=iasPegEvaluar(x); if(!r) return '';
+  return iasHtml(r, { donde:'peg', ef:false, cor:false, tienda:false, sinFecha:false, met:x.met, ban:x.ban })+
+    (r.est==='mal' ? iasLinea('ias-gris', '<small>Si hay que arreglarlo: <b>✏️ Corregir</b> en este pago.</small>') : '');
+}
+function iasPegBox(p, c, i){
+  var cs=compsArr(c && (c.comps!=null?c.comps:c.comp));
+  if(!cs.some(function(f){ return IAS.peg[f]; })) return '';
+  var h=''; try{ h=iasPegHtml(p, i); }catch(e){ h=''; }
+  return '<div class="ias-box ias-peg" aria-live="polite" data-id="'+esc(String(p.id))+'" data-i="'+i+'">'+h+'</div>';
+}
+function iasPintarPeg(){
+  [].slice.call(document.querySelectorAll('.ias-peg')).forEach(function(box){
+    var h=''; try{ var p=findById(box.getAttribute('data-id')); if(p) h=iasPegHtml(p, +box.getAttribute('data-i')); }catch(e){ h=''; }
+    if(box._h!==h){ box.innerHTML=h; box._h=h; }
+  });
+}
 /* 💵 «Agregar efectivo»: el segundo método del pago mixto (§4ej), en efectivo, con lo que la foto no cubre. Si entre las fotos está el
    recibo / la nota de venta (Claude dijo que NO es un comprobante de pago), pasa a ese pago: es el respaldo del efectivo. */
 function iasAgregarEfectivo(m){
```

### El código que usa (como queda en la rama)

```js
// pedidos.html:13947
function onCompElegido(ev){
  var f=(ev.target.files||[])[0]; if(!f) return;
  var pid=ev.target.dataset.pedido||'', p=findById(pid); if(!p) return;
  var destino=COMP_DESTINO; COMP_DESTINO=null;
  // Cuántas tiene ya: las del pago que se está por registrar, o las del pago elegido.
  var yaTiene = !destino ? compsArr(CTA_PAGO.comps).length
    : destino.envio
      ? (function(){ var c=enviosDe(p)[Number(destino.e)||0]; return c ? compsArr(c.comps!=null?c.comps:c.comp).length : 0; })()   // §4fy: el tope se mide en EL flete elegido, no en el primero
      : destino.anticipo
        ? (function(){ var c=anticipoDe(p); return c ? compsArr(c.comps!=null?c.comps:c.comp).length : 0; })()
        : (function(){ var a=cobrosDe(p), c=a[destino.idx];
            return c ? compsArr(c.comps!=null?c.comps:c.comp).length : 0; })();
  if(yaTiene>=COMP_MAX){ toast('Ese pago ya tiene las '+COMP_MAX+' imágenes','err'); return; }
  toast('Achicando y subiendo el comprobante…','ok');
  COMP_SUBIENDO++; showContaModal(p.id);          // que se vea "⏳ Subiendo…" desde ya
  return fotoCronometro(f, 1280, 0.72).then(function(dataUrl){
    return subirFoto(p.id, 'comprobante_'+(p.cliente||''), dataUrl);
  }).then(function(res){
    COMP_SUBIENDO--;
    p=findById(pid)||p;                             // 🖼️ §4ep: el refresco pudo cambiar el objeto mientras subía
    if(!res || !res.ok || !res.fotoId){
      showContaModal(p.id);
      toast(res && res.version ? ('No se pudo guardar el comprobante ('+(res.error||'error')+')')
                               : 'El Apps Script no está actualizado: pegalo de nuevo e implementá una versión nueva','err');
      return;
    }
    if(destino && destino.envio){
      // Al RECARGO POR ENTREGA: se reescribe solo su renglón.
      var ae=enviosDe(p), _e=Number(destino.e)||0;
      /* §4fy: si el renglón no aparece, NO se pega en el primero que haya (eso era poner la
         captura de un QR como respaldo de un efectivo, con aviso verde): se dice. */
      if(!ae.length || _e<0 || _e>=ae.length || !envioYaCobrado(ae[_e])){
        toast('No encontré ese recargo por entrega: la imagen se subió pero no quedó pegada a ningún pago. Volvé a abrir la venta y adjuntala de nuevo.','err',8000);
        showContaModal(p.id);
        return;
      }
      ae[_e].comps=compsArr(compsArr(ae[_e].comps!=null?ae[_e].comps:ae[_e].comp).concat([res.fotoId]));
      ae[_e].comp=ae[_e].comps[0]||'';
      aplicarEnvios(p, ae);
      iasPegada(p.id, res.fotoId);                  // 🔎 (31/10) también la del 📎 se lee ya
      toast('Comprobante del recargo adjuntado ✓','ok');
      showContaModal(p.id);
    }else if(destino && destino.anticipo){
      // Al ADELANTO: su renglón se reescribe aparte (no está en la lista de cobros).
      var a0=anticipoDe(p);
      if(a0) aplicarCompsAnticipo(p, compsArr(a0.comps!=null?a0.comps:a0.comp).concat([res.fotoId]));
      if(a0) iasPegada(p.id, res.fotoId);           // 🔎 (31/10) también la del 📎 se lee ya
      toast('Comprobante del adelanto adjuntado ✓','ok');
      showContaModal(p.id);
    }else if(destino){
      // A un pago YA registrado: se reescribe ese renglón con su comprobante.
      var arr=cobrosDe(p).slice();
      if(destino.idx>=0 && destino.idx<arr.length){
        var c0=arr[destino.idx];
        c0.comps=compsArr(compsArr(c0.comps!=null?c0.comps:c0.comp).concat([res.fotoId]));
        c0.comp=c0.comps[0]||'';
        aplicarCobros(p, arr);
        iasPegada(p.id, res.fotoId);                // 🔎 (31/10) también la del 📎 se lee ya
      }
      toast('Comprobante adjuntado ✓','ok');
      showContaModal(p.id);
    }else{
      CTA_PAGO.comps=compsArr(compsArr(CTA_PAGO.comps).concat([res.fotoId]));   // al pago que se está por registrar
      iasSubida(res.fotoId);                        // 🔎 (§78) se lee ya y se compara con lo anotado
      toast(CTA_PAGO.comps.length<COMP_MAX ? 'Imagen lista ✓ — podés sumar el recibo'
                                           : 'Las '+COMP_MAX+' imágenes listas ✓ — ahora tocá "Registrar pago"','ok');
      showContaModal(p.id);
    }
  }).catch(function(e){
    if(COMP_SUBIENDO>0) COMP_SUBIENDO--;          // que no quede colgado en "Subiendo…"
    showContaModal(p.id);
    toast('No se pudo subir el comprobante: '+motivoDeError(e),'err');
  });
}

// pedidos.html:13765
function contaPagosHtml(p){
  var cob=contaPagos(p);
  if(!cob.length) return '<span style="color:var(--muted)">— sin pagos registrados —</span>';
  var pid=p.id;
  return cob.map(function(c,i){
    var n=limpiaNota(c.nota);
    var idx=ctaIdxCobro(p, i, c);                   // el anticipo y el recargo (idx<0) van por otra vía
    var esQR=metodoConComprobante(c.metodo);
    var cs=compsArr(c.comps!=null?c.comps:c.comp);
    var comp = cs.length
      ? ('<div class="fotos" style="align-items:center;margin-top:5px">'+
           cs.map(function(fid,k){
             return '<span class="foto">'+
               fotoImgHtml(fid,{alt:'Imagen '+(k+1)+' del pago', title:'Ver en grande',
                 onclick:"window.open('"+fotoVer(fidLimpio(fid))+"','_blank')"})+
               (idx>=0?('<button type="button" title="Quitar esta imagen" onclick="ctaQuitarComp(\''+pid+'\','+idx+','+k+')">✕</button>')
                : (esEnvio(c)?('<button type="button" title="Quitar esta imagen" onclick="ctaEnvioQuitarComp(\''+pid+'\','+ctaIdxEnvio(p,i)+','+k+')">✕</button>'):''))+
             '</span>';
           }).join('')+
           ((esQR && idx>=0 && cs.length<COMP_MAX)
             ? ('<button class="btn btn-sm" style="background:#fff;border:1px dashed var(--gray-md);color:var(--muted);font-size:.76rem;padding:4px 10px;width:auto" onclick="ctaAdjuntar(\''+pid+'\','+idx+')">📎 Agregar el recibo</button>')
             : '')+
         '</div>')
      : (esQR && idx>=0
          ? ('<div style="margin-top:4px"><button class="btn btn-sm" style="background:#fff;border:1px dashed var(--gray-md);color:var(--muted);font-size:.76rem;padding:4px 10px" onclick="ctaAdjuntar(\''+pid+'\','+idx+')">📎 Adjuntar comprobante</button></div>')
          : '');
    /* El recargo por entrega no se toca con los botones de los cobros (no está en esa
       lista): tiene los suyos, que reescriben solo su renglón. */
    var envBtns = esEnvio(c)
      ? ('<div style="margin-top:4px;display:flex;gap:6px;flex-wrap:wrap">'+
           (cs.length<COMP_MAX
             ? '<button class="btn btn-sm" style="background:#fff;border:1px dashed var(--gray-md);color:var(--muted);font-size:.76rem;padding:4px 10px;width:auto" onclick="ctaEnvioAdjuntar(\''+pid+'\','+ctaIdxEnvio(p,i)+')">📎 '+(cs.length?'Agregar otra imagen':'Adjuntar comprobante')+'</button>'
             : '')+
           /* ↩️ (28/09) Un cobro anotado como recargo que en realidad era un pago de la venta: pasa a los pagos tal cual. */
           ((envioYaCobrado(c) && !noSeCobra(p))
             ? '<button class="btn btn-sm" style="background:#fff;border:1px solid var(--teal-border);color:var(--teal-dk);font-size:.76rem;padding:4px 10px;width:auto;font-weight:700" title="Si este cobro era un pago de la venta y no un flete: lo pasa a los pagos, con su fecha, nota y fotos" onclick="ctaEnvioAPago(\''+pid+'\','+ctaIdxEnvio(p,i)+')">↩️ Era un pago de la venta</button>'
             : '')+
           '<button class="btn btn-sm" style="background:#fff;border:1px solid var(--gray-md);color:var(--muted);font-size:.76rem;padding:4px 10px;width:auto" onclick="ctaBorrarEnvio(\''+pid+'\')">🗑 Quitar el recargo</button>'+
         '</div>')
      : '';
    /* La venta que se marcó PAGADA sin anotar cuánto entró: acá se arregla.
       Es la que aparece en "Revisar antes de cerrar" y no sale en el detalle de pagos. */
    var faltaMonto = (idx>=0 && !((Number(c.monto)||0)>0))
      ? ('<div style="margin-top:4px"><button class="btn btn-sm" style="background:var(--amber-lt);border:1px solid var(--amber-border);color:var(--amber);font-size:.76rem;padding:4px 10px;width:auto;font-weight:700" onclick="ctaAnotarMonto(\''+pid+'\','+idx+')">💵 Anotar el monto</button></div>')
      : '';
    // Para volver a mandarlo al grupo cuando haga falta, no solo al registrarlo.
    var wa = ((Number(c.monto)||0)>0)
      ? (' <button class="btn btn-sm" style="background:#fff;border:1px solid var(--green-border);color:var(--green);font-size:.72rem;padding:2px 8px;width:auto;font-weight:700" title="Copiar este pago para WhatsApp" onclick="showPagoWhatsapp(\''+pid+'\','+i+')">📲 WhatsApp</button>')
      : '';
    /* ✏️ Corregir el pago YA anotado: fecha, monto, N° de recibo y método.
       Hace falta porque todo eso se escribe de una sola vez al registrarlo y después no
       había cómo tocarlo: el pago que entró el sábado quedaba con la fecha de hoy, un
       monto mal tipeado quedaba mal para siempre, y un "Efectivo" que en realidad era QR
       descuadraba la caja contra el banco. Vale para los tres renglones: anticipo, cobro
       y recargo por entrega. */
    var editando = (CTA_EDIT_I===i), _ev = editando ? (CTA_EDIT_V||{}) : {};
    var btnEditar = '<button class="btn btn-sm" style="background:#fff;border:1px solid var(--teal-border);color:var(--teal-dk);font-size:.7rem;padding:2px 8px;width:auto;font-weight:700" title="Corregir fecha, monto, N° de recibo o método de este pago" onclick="'+esc("ctaEditarPago('"+pid+"',"+i+")")+'">✏️ Corregir</button>';
    var cajaEdit='';
    if(editando){
      var bancosV=bancosDeVendedor(p.vendedor);
      var mb2=function(m){ return '<button type="button" class="btn btn-sm" style="width:auto;padding:5px 11px;font-size:.76rem;'+(CTA_EDIT_M===m?'background:var(--teal);color:#fff':'background:#fff;border:1px solid var(--gray-md);color:var(--muted)')+'" onclick="'+esc("ctaEditMetodo('"+pid+"','"+m+"')")+'">'+esc(m)+'</button>'; };
      var bb2=function(x){ return '<button type="button" class="btn btn-sm" style="width:auto;padding:5px 11px;font-size:.76rem;'+(CTA_EDIT_B===x?'background:var(--teal-dk);color:#fff':'background:#fff;border:1px solid var(--gray-md);color:var(--muted)')+'" onclick="'+esc("ctaEditBanco('"+pid+"','"+String(x).replace(/'/g,'')+"')")+'">🏦 '+esc(x)+'</button>'; };
      cajaEdit='<div style="margin-top:7px;background:var(--teal-lt);border:1px solid var(--teal-border);border-radius:8px;padding:10px 12px">'+
        '<div class="lb" style="margin-bottom:7px">✏️ Corregir este pago</div>'+
        '<div style="display:flex;gap:8px;flex-wrap:wrap">'+
          '<div style="flex:1;min-width:130px"><label class="lb">¿Qué día entró?</label>'+
            '<input type="date" id="cta-ed-fecha" value="'+esc(_ev.fecha!=null?_ev.fecha:(c.fecha||contaFecha(p)||todayStr()))+'" max="'+todayStr()+'" style="width:100%"></div>'+
          '<div style="flex:1;min-width:100px"><label class="lb">Monto</label>'+
            '<input type="text" inputmode="decimal" autocomplete="off" id="cta-ed-monto" value="'+esc(_ev.monto!=null?_ev.monto:((Number(c.monto)||0)>0?r2(c.monto):''))+'" placeholder="Bs" style="width:100%"></div>'+
          '<div style="flex:1;min-width:110px"><label class="lb">N° nota de venta</label>'+
            '<input type="text" id="cta-ed-nota" value="'+esc(_ev.nota!=null?_ev.nota:limpiaNota(c.nota))+'" placeholder="del recibo" autocomplete="off" style="width:100%"></div>'+
        '</div>'+
        '<div style="margin-top:8px"><label class="lb">Método</label>'+
          '<div style="display:flex;gap:6px;flex-wrap:wrap">'+METODOS.map(mb2).join('')+'</div></div>'+
        (CTA_EDIT_M==='Efectivo' ? ctaRecibioHtml(p, {edit:true}) : '')+
        (CTA_EDIT_M==='QR' ? ('<div style="margin-top:8px"><label class="lb">Banco</label><div style="display:flex;gap:6px;flex-wrap:wrap">'+bancosV.map(bb2).join('')+'</div></div>') : '')+
        /* 📎 El comprobante, acá adentro. Antes había que buscar el botón afuera —y para
           el ANTICIPO no existía— así que un pago al que se le olvidaron la captura se
           quedaba sin respaldo para siempre. Ver §4bg en la bitácora. */
        '<div style="margin-top:9px"><label class="lb">📎 Imágenes de respaldo'+
          ' <span style="font-weight:600;text-transform:none;color:var(--muted)">· hasta '+COMP_MAX+'</span></label>'+
          '<div class="fotos" style="align-items:center;margin-top:4px">'+
            cs.map(function(fid,k){
              return '<span class="foto">'+
                fotoImgHtml(fid,{alt:'Imagen '+(k+1)+' del pago', title:'Ver en grande',
                  onclick:"window.open('"+fotoVer(fidLimpio(fid))+"','_blank')"})+
                '<button type="button" title="Quitar esta imagen" onclick="'+esc("ctaQuitarCompEdit('"+pid+"',"+i+","+k+")")+'">✕</button>'+
              '</span>';
            }).join('')+
            (COMP_SUBIENDO>0
              ? '<span style="font-size:.78rem;color:var(--muted)"><span class="spin"></span> Subiendo…</span>'
              : (cs.length<COMP_MAX
                  ? '<button class="btn btn-sm" style="background:#fff;border:1px dashed var(--gray-md);color:var(--muted);font-size:.76rem;padding:4px 10px;width:auto" onclick="'+esc("ctaAdjuntarEdit('"+pid+"',"+i+")")+'">📎 '+(cs.length?'Agregar otra imagen':'Adjuntar '+nombreComprobante(CTA_EDIT_M))+'</button>'
                  : '<span style="font-size:.74rem;color:var(--muted)">ya tiene las '+COMP_MAX+'</span>'))+
          '</div>'+
          (cs.length?'':'<div style="font-size:.72rem;color:var(--amber);font-weight:700;margin-top:3px">⚠️ Este pago no tiene ninguna imagen de respaldo.</div>')+
        '</div>'+
        '<div style="display:flex;gap:7px;margin-top:10px">'+
          '<button class="btn btn-primary btn-sm" style="flex:1" onclick="'+esc("ctaGuardarPago('"+pid+"',"+i+")")+'">💾 Guardar</button>'+
          '<button class="btn btn-ghost btn-sm" style="width:auto;padding:8px 14px" onclick="'+esc("ctaEditarPago('"+pid+"',-1)")+'">Cancelar</button>'+
          /* 🗑 (02/10) Borrar el pago anotado por error o duplicado: solo un renglón de verdad (el de mentira no existe, §4fg). */
          (((Number(c.monto)||0)>0 && !c.sinMonto)
            ? '<button class="btn btn-sm" style="width:auto;padding:8px 12px;background:#fff;border:1px solid var(--red);color:var(--red);font-weight:700" title="Borrar este pago: el total de la venta no cambia, vuelve a faltar lo borrado" onclick="'+esc("ctaBorrarPago('"+pid+"',"+i+")")+'">🗑 Borrar este pago</button>'
            : '')+
        '</div>'+
        '<div style="font-size:.72rem;color:var(--muted);margin-top:6px">La fecha es el día en que <b>entró la plata</b>, no el de la venta — el cuadre la cuenta por ahí. '+
          (c.anticipo?'Cambiar el monto del adelanto <b>no mueve el total de la venta</b>: ajusta lo que falta cobrar.'
            :(esEnvio(c)?'Este es el <b>recargo por entrega</b>: va aparte y no le baja el saldo a la venta.'
                       :'Cambiar el monto <b>no mueve el total de la venta</b>: ajusta lo que falta cobrar.'))+
          ' Las imágenes se agregan y se quitan acá mismo, y se guardan solas — no hace falta tocar «Guardar».</div>'+
      '</div>';
    }
    var otroMes=pagoOtroMes(p, c);
    return '<div style="padding:3px 0'+(i?';border-top:1px solid var(--gray-lt)':'')+'">'+
      '<span style="color:var(--muted)">'+esc(c.fecha?fmtFecha(c.fecha):'sin fecha')+'</span>'+
      (otroMes?(' <span class="badge b-amber" style="font-size:.6rem">📆 se pagó en '+esc(otroMes)+'</span>'):'')+' · '+
      '<b>'+esc(contaMetodoTxt(c))+'</b> · '+
      ((Number(c.monto)||0)>0 ? esc(contaMontoTxt(c)) : '<b style="color:var(--amber)">'+esc(contaMontoTxt(c))+'</b>')+
      (n?(' · <span class="badge b-gray">🧾 nota '+esc(n)+'</span>')
        :' · <span style="color:var(--amber);font-weight:700">sin nota</span>')+
      recibioBadge(c)+
      (c.anticipo?' <span class="badge b-gray" style="font-size:.62rem">ANTICIPO</span>':'')+
      (esEnvio(c)?' <span class="badge b-amber" style="font-size:.62rem">🚚 RECARGO POR ENTREGA</span>':'')+
      wa+
      ' '+btnEditar+
      faltaMonto+
      cajaEdit+
      comp+
      iasPegBox(p, c, i)+                          // 🔎 (31/10) lo que dice la foto que se pegó acá con 📎
      envBtns+
    '</div>';
  }).join('');
}

// pedidos.html:48488
function compsPagosDe(p){
  var out=[];
  if(!p || esFilaSistema(p) || borradorDe(p.id) || fueraDeConta(p)) return out;
  var tieneAnt=!!anticipoDe(p);   // `contaPagos` pone el adelanto (el pago al cargar la venta) PRIMERO
  contaPagos(p).forEach(function(c, i){
    var f=c.fecha||contaFecha(p), m=Number(c.monto)||0;
    if(!(m>0) || c.metodo==='Efectivo') return;
    out.push({ p:p, f:f, met:cobroMetodoTxt(c)||'Sin método', monto:m, nota:limpiaNota(c.nota), comps:compsArr(c.comps!=null?c.comps:c.comp), envio:esEnvio(c),
               metB:String(c.metodo||''), ban:String(c.banco||''),   // 🤖 (§4mq C4) el método y el banco por separado, para comparar con la foto
               ant:tieneAnt && i===0, fCarga:contaFecha(p) });       // 📅 el primer pago va con la fecha en que se cargó la venta
  });
  return out;
}

// pedidos.html:49462
function iasPegX(p, fid){
  var L=p ? compsPagosDe(p) : [];
  for(var i=0;i<L.length;i++) if(L[i].comps.indexOf(fid)>=0) return L[i];
  return null;
}

// pedidos.html:49467
function iasPegada(pid, fid){
  fid=String(fid||''); if(!fid || !iasActivo()) return;
  var x=iasPegX(findById(pid), fid); if(!x) return;
  IAS.peg[fid]=String(pid);
  x.comps.forEach(function(f){ iasPedir(f); });
}

// pedidos.html:49473
function iasPegEvaluar(x){
  if(!x || !x.comps.some(function(f){ return IAS.peg[f]; })) return null;
  var cs=x.comps.filter(function(f){ return IAC.res[f] || IAS.lee[f]; });
  if(!cs.length) return null;                     // no se pudo leer (tope, sin crédito, red): no se dice nada, como al subir
  if(cs.some(function(f){ return !IAC.res[f]; })) return { est:'pe' };
  var y=Object.assign({}, x, { comps:cs });
  var refs=iacRefs(iasPagosRecientes().filter(function(z){ return !z.comps.some(function(f){ return cs.indexOf(f)>=0; }); }));
  return iacComparar(y, refs);
}

// pedidos.html:49482
function iasPegHtml(p, i){
  var c=contaPagos(p)[i]; if(!c) return '';
  var cs=compsArr(c.comps!=null?c.comps:c.comp), fid=''; cs.forEach(function(f){ if(!fid && IAS.peg[f]) fid=f; });
  if(!fid) return '';
  var x=iasPegX(p, fid), r=iasPegEvaluar(x); if(!r) return '';
  return iasHtml(r, { donde:'peg', ef:false, cor:false, tienda:false, sinFecha:false, met:x.met, ban:x.ban })+
    (r.est==='mal' ? iasLinea('ias-gris', '<small>Si hay que arreglarlo: <b>✏️ Corregir</b> en este pago.</small>') : '');
}

// pedidos.html:49490
function iasPegBox(p, c, i){
  var cs=compsArr(c && (c.comps!=null?c.comps:c.comp));
  if(!cs.some(function(f){ return IAS.peg[f]; })) return '';
  var h=''; try{ h=iasPegHtml(p, i); }catch(e){ h=''; }
  return '<div class="ias-box ias-peg" aria-live="polite" data-id="'+esc(String(p.id))+'" data-i="'+i+'">'+h+'</div>';
}

// pedidos.html:49496
function iasPintarPeg(){
  [].slice.call(document.querySelectorAll('.ias-peg')).forEach(function(box){
    var h=''; try{ var p=findById(box.getAttribute('data-id')); if(p) h=iasPegHtml(p, +box.getAttribute('data-i')); }catch(e){ h=''; }
    if(box._h!==h){ box.innerHTML=h; box._h=h; }
  });
}

// pedidos.html:49457
function iasRepintar(){ iasPintarForm(); iasPintarConta(); iasPintarPeg(); }

// pedidos.html:49301
function iasSubida(fid){
  if(!fid || !iasActivo()) return;
  IAS.mias[String(fid)]=Date.now();
  iasRepintar();
}

// pedidos.html:49306
function iasPedir(fid){
  fid=String(fid||''); if(!fid || IAC.res[fid] || IAS.lee[fid] || IAS.err[fid] || !iasPuedeLeer()) return;
  IAS.lee[fid]=Date.now(); IAS.cola.push(fid);
  iasRefsCargar();
  if(!IAS.enVuelo){ clearTimeout(IAS.tic); IAS.tic=setTimeout(iasMandar, IAS_JUNTA_MS); }
}

// pedidos.html:49313
function iasMandar(){
  if(IAS.enVuelo) return;
  var t=IAS.cola.splice(0, 8); if(!t.length) return;
  IAS.enVuelo=true;
  var reintentar=false;
  conTopeDuro(apiPost({ action:'iaComprobantes', fotos:t }), IAS_TOPE_MS, 'tardo_ia').then(function(r){
    if(!r || !r.ok) throw new Error((r && r.error) || 'sin_respuesta');
    iacTomar(r);
    /* tope, sin crédito, sin clave, apagado, pausa: no se muestra nada y se deja de pedir un rato */
    if(r.estado){ IAS.parado=Date.now(); t.forEach(function(f){ if(!IAC.res[f]) IAS.err[f]=r.estado; }); return; }
    (r.pendientes||[]).forEach(function(f){
      if(IAC.res[f] || t.indexOf(f)<0) return;
      IAS.intentos[f]=(IAS.intentos[f]||0)+1;
      if(IAS.intentos[f]<=IAS_REINTENTOS){ IAS.cola.push(f); reintentar=true; } else IAS.err[f]='ocupado';
    });
  }).catch(function(){ t.forEach(function(f){ if(!IAC.res[f]) IAS.err[f]='red'; }); })
  .then(function(){
    t.forEach(function(f){ if(IAC.res[f] || IAS.err[f] || IAS.cola.indexOf(f)<0){ delete IAS.lee[f]; if(!IAC.res[f] && !IAS.err[f]) IAS.err[f]='nada'; } });
    IAS.enVuelo=false; iasRepintar();
    if(IAS.cola.length){ clearTimeout(IAS.tic); IAS.tic=setTimeout(iasMandar, reintentar ? IAS_ESPERA_MS : 0); }
  });
}

// pedidos.html:49299
function iasPuedeLeer(){ return iasActivo() && iacServidorOk() && !!CONNECTED && !(IAS.parado && Date.now()-IAS.parado<IAS_PAUSA_MS); }

// pedidos.html:49298
function iasActivo(){ return !navigator.webdriver || !!window.IAC_SUBIR_PRUEBA; }

// pedidos.html:49336
function iasPagosRecientes(){
  var k=(STATE||[]).length+'|'+SALDO_GEN+'|'+diaNegocio();
  if(IAS.recK===k && IAS.rec) return IAS.rec;
  var desde=isoDeTsBolivia(Date.now()-IAS_REFS_DIAS*86400000), out=[];
  (STATE||[]).forEach(function(p){ compsPagosDe(p).forEach(function(x){ if(String(x.f)>=desde && x.comps.length) out.push(x); }); });
  IAS.rec=out; IAS.recK=k; return out;
}

// pedidos.html:49344
function iasRefsCargar(){
  if(IAS.refsCorre || (IAS.refsT && Date.now()-IAS.refsT<IAS_REFS_CADA_MS) || !iacServidorOk() || !CONNECTED) return;
  IAS.refsT=Date.now();
  var ids=[], v={}; iasPagosRecientes().forEach(function(x){ x.comps.forEach(function(f){ if(!v[f] && !IAC.res[f]){ v[f]=1; ids.push(f); } }); });
  if(!ids.length) return;
  IAS.refsCorre=true;
  conTopeDuro(apiPost({ action:'iaComprobantes', fotos:ids.slice(0, 1900), leer:1 }), IAS_TOPE_MS, 'tardo_ia')
    .then(function(r){ if(r && r.ok) iacTomar(r); }, function(){})
    .then(function(){ IAS.refsCorre=false; iasRepintar(); });
}

// pedidos.html:49380
function iasEvaluar(x){
  if(!x || !x.comps.some(function(f){ return IAS.mias[f]; })) return null;
  x.comps.forEach(function(f){ if(IAS.mias[f]) iasPedir(f); });
  var cs=x.comps.filter(function(f){ return IAC.res[f] || IAS.lee[f]; });
  if(!cs.length) return null;
  if(cs.some(function(f){ return !IAC.res[f]; })) return { est:'pe' };
  var y=Object.assign({}, x, { comps:cs });
  /* las otras ventas (no este mismo pago: al editar, sus fotos de antes están en la planilla) */
  var refs=iacRefs(iasPagosRecientes().filter(function(z){ return !z.comps.some(function(f){ return cs.indexOf(f)>=0; }); }));
  var plata=function(c){ return (c.mot||[]).some(function(m){ return m.k==='menos' || m.k==='mas' || m.k==='mixto'; }); };
  var c=iacComparar(y, refs);
  if(x.flete && plata(c)){ var c2=iacComparar(Object.assign({}, y, { monto:r2(y.monto+x.flete) }), refs); if(!plata(c2)) c=c2; }   // la foto incluye el flete
  return c;
}

// pedidos.html:48793
function iacComparar(x, refs){
  var L=x.comps.map(function(f){ return { f:f, o:IAC.res[f] }; });
  if(!L.length || L.some(function(l){ return !l.o; })) return { est:'pe', chip:'⏳ Sin revisar', txt:'Todavía no se leyó'+(L.length>1?' alguna de sus fotos':' la foto')+'.' };
  var buenas=L.filter(function(l){ return iacBuena(l.o); });
  if(!buenas.length){
    var o=L[0].o, por, hacer;
    if(o.err==='ajena'){ por='no está en la carpeta de fotos del panel'; hacer='Revisala a mano.'; }
    else if(o.err==='tipo'){ por='no es una imagen ni un PDF'; hacer='Revisala a mano.'; }
    else if(o.err==='grande'){ por='es muy pesada para leerla (más de 3,5 MB)'; hacer='Revisala a mano.'; }
    else if(o.err==='no_existe'){ por='ya no está en Drive'; hacer='Pedile otra al cliente.'; }
    else if(o.err==='drive'){ por='no la entregó Drive'; hacer='Probá «Leer de nuevo».'; }
    else if(o.err){ por='no la pudo leer Claude'+(o.no?(' ('+o.no+')'):''); hacer='Probá «Leer de nuevo» o revisala a mano.'; }
    else if(o.cp===false){ por='no es un comprobante de pago'+(o.no?(' ('+o.no+')'):''); hacer='Pedile el comprobante al cliente.'; }
    else { por='está borrosa o cortada: no se ve el monto'; hacer='Pedile otra al cliente.'; }
    return { est:'nl', chip:(o.cp===false && !o.err) ? '❓ No es un comprobante' : '❓ No se lee bien', txt:'La foto '+esc(por)+'. '+hacer, c:'la foto '+por+' — '+hacer.replace(/\.$/,'').toLowerCase() };
  }
  var bs=buenas.filter(function(l){ return l.o.mo!=='USD'; }), usd=buenas.filter(function(l){ return l.o.mo==='USD'; });
  var suma=0; bs.forEach(function(l){ suma=r2(suma+Number(l.o.m)); });
  var monto=r2(x.monto), okM=bs.length>0 && (Math.abs(suma-monto)<0.005 || bs.some(function(l){ return Math.abs(Number(l.o.m)-monto)<0.005; }));
  /* (30/10, §78) Cada motivo lleva también SUS números (`dice`, `dif`, `ne`, `fFoto`, `otro`…): con eso el aviso al subir la foto arma
     el arreglo de un toque sin volver a hacer la cuenta. */
  var mot=[], b0=(bs[0]||buenas[0]).o, dice=bs.length>1 ? suma : Number(b0.m);
  if(!okM && usd.length && !bs.length) mot.push({ k:'usd', chip:'⚠️ Está en dólares', t:'La foto dice <b>US$ '+esc(String(usd[0].o.m))+'</b> y anotaste <b>'+fmtBs(monto)+'</b>. Revisá el tipo de cambio.',
    c:'la foto está en dólares (US$ '+usd[0].o.m+')', usd:Number(usd[0].o.m)||0 });
  else if(!okM){
    /* (26/10, el dueño: «dice que falta dinero siendo que algunas compras hay efectivo pagado… 390 en QR y 600 en efectivo, lo dice la
       segunda imagen») Que la foto diga MENOS no es «falta plata»: muchas veces el resto se pagó en efectivo y se anotó todo como QR. Si la
       NOTA DE VENTA está leída (servidor 26-b: `nv`, con lo pagado por medio) y QR + efectivo cierran, se dice eso; si no, se explica la
       diferencia sin acusar. */
    var dif=r2(monto-dice), metNom=String(x.metB||'QR'), nvs=L.filter(function(l){ return l.o && !l.o.err && l.o.nv; }).map(function(l){ return l.o; }), nv=nvs[0]||null;
    var nEf=nv ? r2(Number(nv.ne)||0) : 0, sumTxt=bs.length>1 ? (' (sumando las '+bs.length+' fotos)') : '';
    if(nv && nEf>0.005 && Math.abs(dice+nEf-monto)<0.005) mot.push({ k:'mixto', chip:'🧾 Una parte fue en efectivo',
      t:'La nota de venta dice <b>'+esc(metNom)+' '+fmtBs(dice)+'</b> + <b>efectivo '+fmtBs(nEf)+'</b> = '+fmtBs(monto)+'. La plata está, pero se anotó todo como '+esc(x.met)+
        ': corregí el pago a '+esc(metNom)+' '+fmtBs(dice)+' y efectivo '+fmtBs(nEf)+'.',
      c:'la nota de venta dice '+metNom+' '+fmtBs(dice)+' + efectivo '+fmtBs(nEf)+': la plata está, pero se anotó todo como '+x.met+' — corregí el pago a '+metNom+' '+fmtBs(dice)+' y efectivo '+fmtBs(nEf),
      dice:dice, ne:nEf, monto:monto });
    else if(dif>0) mot.push({ k:'menos', chip:'⚠️ La foto dice menos',
      t:'La foto dice <b>'+fmtBs(dice)+'</b>'+sumTxt+' y el pago está anotado <b>'+fmtBs(monto)+'</b> como '+esc(x.met)+': la foto cubre <b>'+fmtBs(dif)+'</b> menos. '+
        'Si esa parte se pagó en efectivo u otro medio, anotala como otro pago ('+esc(metNom)+' '+fmtBs(dice)+' + efectivo '+fmtBs(dif)+'); si no, falta el comprobante de esa parte.',
      c:'la foto dice '+fmtBs(dice)+' y está anotado '+fmtBs(monto)+' como '+x.met+' ('+fmtBs(dif)+' menos): si esa parte fue en efectivo, anotala como otro pago; si no, falta su comprobante',
      dice:dice, dif:dif, monto:monto });
    else mot.push({ k:'mas', chip:'⚠️ La foto dice más',
      t:'La foto dice <b>'+fmtBs(dice)+'</b>'+sumTxt+' y el pago está anotado <b>'+fmtBs(monto)+'</b>: la foto dice <b>'+fmtBs(-dif)+'</b> más. ¿Se anotó de menos, o la foto es de otro pago?',
      c:'la foto dice '+fmtBs(dice)+' y está anotado '+fmtBs(monto)+' ('+fmtBs(-dif)+' más): ¿se anotó de menos o la foto es de otro pago?',
      dice:dice, dif:dif, monto:monto });
  }
  var ban=iacBanco(x.ban);
  if(ban && !/^Tarjeta/i.test(String(x.metB||''))){
    var bds=buenas.map(function(l){ return String(l.o.bd||''); }).filter(Boolean);
    if(bds.length && !bds.some(function(b){ return iacBanco(b)===ban; })) mot.push({ k:'banco', chip:'⚠️ Otro banco', t:'La foto dice que entró a <b>'+esc(bds[0])+'</b> y está anotado en <b>'+esc(x.ban)+'</b>.',
      c:'la foto dice que entró a '+bds[0]+' y está anotado en '+x.ban, bd:bds[0] });
  }
  /* 📅 (26/10, el dueño: «el primer pago se debe cargar con la fecha en que se creó la venta, y puede haber más pagos registrados, que
     deben coincidir con la fecha de registro; si no, informarlo») La fecha de la foto tiene que ser la del PRIMER pago = el día en que se
     cargó la venta (`x.ant` → `x.fCarga`), o la de cada pago registrado después (`x.f`). Si no coincide, se dice y nada más. */
  var fs=buenas.map(function(l){ return l.o.f; }).filter(Boolean), fEsp=x.ant ? (x.fCarga||x.f) : x.f;
  if(fs.length && fEsp && fs.indexOf(fEsp)<0){
    var f0=fs.slice().sort(function(a,b){ return iacDias(a, fEsp)-iacDias(b, fEsp); })[0];
    var queTxt=x.ant ? 'la venta se cargó el ' : 'el pago se registró el ';
    mot.push({ k:'dia', chip:'⚠️ Otra fecha', t:'La foto es del <b>'+esc(fmtFechaCorta(f0))+'</b> y '+queTxt+'<b>'+esc(fmtFechaCorta(fEsp))+'</b>.',
      c:'la foto es del '+fmtFechaCorta(f0)+' y '+queTxt+fmtFechaCorta(fEsp), fFoto:f0, fEsp:fEsp });
  }
  var vistos={};
  buenas.forEach(function(l){
    var r=iacRefLimpia(l.o.ref); if(!r || vistos[r]) return;
    var otros=((refs||{})[r]||[]).filter(function(y){ return y.x!==x && y.f!==l.f; });
    if(otros.length){ vistos[r]=1; mot.push({ k:'rep', chip:'🚨 Comprobante repetido', t:'El mismo comprobante (N° <b>'+esc(l.o.ref)+'</b>) está también en el pago de <b>'+esc(iacCliCorto(otros[0].x.p))+'</b> ('+fmtBs(otros[0].x.monto)+'). Puede ser la misma transferencia anotada dos veces.',
      c:'el mismo comprobante (N° '+l.o.ref+') está también en el pago de '+iacCliCorto(otros[0].x.p)+' ('+fmtBs(otros[0].x.monto)+')', otro:otros[0].x, ref:l.o.ref }); }
  });
  var desc='La foto dice <b>'+(bs.length ? fmtBs(dice) : ('US$ '+esc(String(b0.m))))+'</b>'+(b0.bd?(' · '+esc(b0.bd)):'')+(b0.f?(' · '+esc(fmtFechaCorta(b0.f))):'')+(b0.ref?(' · N° '+esc(b0.ref)):'');
  if(!mot.length) return { est:'ok', chip:'✅ Coincide', txt:desc+'. Igual a lo anotado.' };
  if(mot.some(function(m){ return m.k==='rep'; })) mot.sort(function(a,b){ return (b.k==='rep')-(a.k==='rep'); });
  return { est:'mal', chip:mot[0].chip, mot:mot, txt:mot.map(function(m){ return m.t; }).join(' ') };
}

// pedidos.html:48769
function iacTomar(r){
  if(!r) return;
  var R=r.res||{}; Object.keys(R).forEach(function(k){ if(R[k] && typeof R[k]==='object') IAC.res[k]=R[k]; });
  if(r.dia) IAC.dia=r.dia;
}

// pedidos.html:48787
function iacRefs(L){
  var R={}; (L||[]).forEach(function(x){ x.comps.forEach(function(f){ var o=IAC.res[f]; if(!iacBuena(o)) return; var r=iacRefLimpia(o.ref); if(r) (R[r]=R[r]||[]).push({ x:x, f:f }); }); });
  return R;
}

// pedidos.html:48785
function iacBuena(o){ return !!o && !o.err && o.cp!==false && o.le!==false && Number(o.m)>0; }

// pedidos.html:14438
function aplicarCompsAnticipo(p, comps){
  var ant=anticipoDe(p); if(!ant) return false;
  ant=JSON.parse(JSON.stringify(ant));
  ant.comps=compsArr(comps); ant.comp=ant.comps[0]||''; ant.anticipo=true;
  // ⚠️ leerlos ANTES de pisar metodoPago; y `cobrosReales`, no `cobrosDe` (§4fg): el anticipo
  // y el pago de mentira salen del MISMO texto suelto, así que escribir los dos lo duplicaba.
  var cobros=cobrosReales(p), env=enviosDe(p);
  p.metodoPago=conMarcaReg(textoCobros([ant].concat(cobros).concat(env)), regEnSistema(p));
  persistPedido(p);
  return true;
}

// pedidos.html:14501
function aplicarEnvios(p, arr){
  /* ⚠️ `cobrosReales`, no `cobrosDe` (§4fg): en una venta «PAGADA sin monto» el pago de
     mentira se escribía como «Efectivo 0 %IMG» y la venta perdía el pago y la marca de
     pagada por haberle anotado un flete. `textoHistorial` le devuelve el método suelto. */
  var ant=anticipoDe(p), cobros=cobrosReales(p);
  var env=(arr||[]).map(function(c){ c.envio=true; c.anticipo=false; return c; })
                   .filter(function(c){ return (Number(c.monto)||0)>0; });
  // ✅→📥 (02/10, MEDIA-5) un recargo COBRADO nuevo también saca la marca «cargada en el sistema contable» (ver `registradoSigue`)
  var _reg=registradoSigue(p, (env.filter(envioYaCobrado).length>enviosDe(p).filter(envioYaCobrado).length) ? 'flete' : '');
  p.metodoPago=conMarcaReg(textoHistorial(p, (ant?[ant]:[]).concat(cobros).concat(env)), _reg);
  return persistPedido(p);          // §4fp: quien llama necesita saber si el guardado entró
}

```

### Las líneas que arman `IAS` y el `iasHtml` (lo que se dibuja)

```js
// pedidos.html:49296
var IAS={ mias:{}, peg:{}, lee:{}, err:{}, intentos:{}, cola:[], tic:null, enVuelo:false, parado:0, refsT:0, refsCorre:false, rec:null, recK:'' };
// pedidos.html:49297
var IAS_REFS_DIAS=45, IAS_PAUSA_MS=15*60000, IAS_REINTENTOS=2, IAS_ESPERA_MS=4000, IAS_JUNTA_MS=600, IAS_TOPE_MS=75000, IAS_REFS_CADA_MS=30*60000;
// pedidos.html:49400
function iasHtml(c, ctx){
  if(!c) return '';
  if(c.est==='pe') return iasLinea('ias-lee', '🔎 Leyendo el comprobante… <small>puede tardar unos segundos'+(ctx && ctx.donde==='peg' ? '' : '; si guardás antes, no pasa nada')+'</small>');
  if(c.est==='ok') return iasLinea('ias-ok', '✅ La foto coincide con lo anotado.');
  if(c.est==='nl') return iasLinea('ias-gris', '❓ '+esc(String(c.c||c.chip||'').replace(/^./, function(s){ return s.toUpperCase(); }))+'.');
  var out=[], hoy=diaNegocio(), d=ctx.donde;
  (c.mot||[]).forEach(function(m){
    if(m.k==='menos' || m.k==='mixto'){
      var dice=r2(m.dice), ef=r2(m.k==='mixto' ? m.ne : m.dif), anot=r2(m.monto);
      /* la nota de venta YA dice que el resto fue en efectivo: ahí «Corregir» (que pasa la diferencia al saldo) no va, salvo en Contabilidad */
      var b=(ctx.ef ? iasBtn('💵 Agregar efectivo', 'iasAgregarEfectivo('+ef+')', true) : '')+((ctx.cor && !(m.k==='mixto' && ctx.ef)) ? iasBtn('Corregir a '+iasNum(dice), 'iasCorregir(\''+d+'\','+dice+')') : '');
      out.push(iasLinea('ias-am', (m.k==='mixto'
        ? ('🧾 La nota de venta dice <b>'+esc(ctx.met||'QR')+' '+iasBs(dice)+'</b> + <b>efectivo '+iasBs(ef)+'</b>: anotá el efectivo como otro pago.')
        : ('⚠️ La foto dice <b>'+iasBs(dice)+'</b> y anotaste <b>'+iasNum(anot)+'</b>: ¿los <b>'+iasBs(ef)+'</b> fueron en efectivo?'))+
        ((!ctx.ef && d==='cta') ? ' <small>Si fue así, registrá ese efectivo después, como otro pago.</small>' : ''), b));
    }
    else if(m.k==='mas'){
      var dice2=r2(m.dice);
      out.push(iasLinea('ias-am', '⚠️ La foto dice <b>'+iasBs(dice2)+'</b> y anotaste <b>'+iasNum(m.monto)+'</b>: ¿anotaste de menos, o la foto es de otro pago?',
        ctx.cor ? iasBtn('Corregir a '+iasNum(dice2), 'iasCorregir(\''+d+'\','+dice2+')') : ''));
    }
    else if(m.k==='usd') out.push(iasLinea('ias-am', '⚠️ La foto está en dólares (<b>US$ '+esc(String(m.usd))+'</b>): revisá el tipo de cambio.'));
    else if(m.k==='banco') out.push(iasLinea('ias-am', '⚠️ La foto dice que entró a <b>'+esc(m.bd)+'</b> y elegiste <b>'+esc(ctx.ban||'')+'</b>.'));
    else if(m.k==='rep'){
      var o=m.otro||{}, op=o.p||{}, n=String(op.oc||'').trim();
      out.push(iasLinea('ias-mal', '🚨 Esta foto ya está en la venta <b>'+esc(n || iacCliCorto(op))+'</b>'+(n?(' ('+esc(iacCliCorto(op))+', '+iasBs(o.monto)+')'):(' ('+iasBs(o.monto)+')'))+
        ': ¿es la misma transferencia? <small>Pedile al cliente el comprobante de este pago.</small>'));
    }
    else if(m.k==='dia'){
      if(ctx.sinFecha) return;
      var ff=String(m.fFoto||'');
      if(ctx.tienda && ff && ff<=hoy) out.push(iasLinea('ias-am', '📅 La foto es del <b>'+esc(fmtFechaCorta(ff))+'</b>: ¿la venta fue ese día?', iasBtn('Sí, fue el '+esc(fmtFechaCorta(ff)), 'iasFechaVenta(\''+ff+'\')', true)));
      else out.push(iasLinea('ias-gris', '📅 La foto es del <b>'+esc(fmtFechaCorta(ff))+'</b> y el pago va con fecha '+esc(fmtFechaCorta(m.fEsp||''))+'.'));
    }
  });
  return out.join('');
}

// pedidos.html:49398
function iasLinea(cls, txt, btns){ return '<div class="ias '+cls+'"><span class="ias-tx">'+txt+'</span>'+(btns||'')+'</div>'; }

```

---

## 2 · 💵 El precio de venta de cada producto es obligatorio (publicado hoy, versión 2026-10-31-c)

**Pedido del dueño:** *«que al cargar una venta los vendedores coloquen sí o sí precio de venta del producto; no pueden generar un pedido
ni nada»*. Después aclaró: un regalo NO va en 0, y a él (Eduardo, el dueño, que también carga ventas) no se le pide precio.

**Cómo quedó:** en una venta (documento «OC», también la venta de tienda), cada producto con nombre necesita «Precio c/u» > 0 para
guardar. No se pide en ATC (reclamos), RPT (reposiciones a tienda), ni a Eduardo/ROHO (`esVendedorLite`) ni a los pedidos internos
(`cliEsInterno`). Un pedido VIEJO que ya estaba guardado sin precio (`data-sin-precio`, puesto por `editPedido` en los renglones que
traía) también lo pide; con la clave de Administración (`UNLOCKED`) se puede guardar igual tras un `confirm`. La barra de pasos
(`fxPasosEstado`) y la lista «Para guardar» (`fxDerPintar`) piden lo mismo que Guardar.

**Mirá en especial:**
- ¿Hay un camino que guarde una venta SIN pasar por `submitPedido` (reintentos de la cola, importadores, Kommo, chofer, Contabilidad) y
  que ahora deje una venta sin precio, o al revés, que ahora frene algo que no debería?
- `preciosFaltan` mira los renglones con `.prod-desc` escrito: ¿un renglón con código y sin nombre, o un renglón que se va a borrar,
  puede frenar el guardado?
- La excepción del pedido viejo (`her`): ¿un vendedor puede saltarse la regla cambiando algo del renglón sin que deje de contar como viejo?
- ¿El cambio de vendedora en el formulario (de Eduardo a una vendedora) vuelve a pintar el asterisco y vuelve a pedir el precio?

### El cambio (diff)

```diff
diff --git a/pedidos.html b/pedidos.html
index 5d1892a..973a881 100644
--- a/pedidos.html
+++ b/pedidos.html
@@ -181,6 +181,8 @@ input.err,textarea.err,select.err{border-color:var(--red);box-shadow:0 0 0 3px v
 .prod-sub{display:grid;grid-template-columns:1.15fr 1fr 58px 88px;gap:8px;align-items:end}
 @media(max-width:520px){ .prod-sub{grid-template-columns:1fr 1fr;} }
 .prod-card .prod-precio{text-align:right}
+/* 💵 (31/10) En una venta el precio c/u es obligatorio (`precioObligatorio`): el asterisco como el de los campos de arriba. */
+#view-form.precio-oblig .prod-precio-w .mini-lb::after{content:' *';color:var(--red,#dc2626);font-weight:800}
 /* Subtotal de la línea: se actualiza solo al escribir el precio o la cantidad. */
 .prod-rpt{display:grid;grid-template-columns:150px 1fr;gap:2px 8px;align-items:end;margin-top:8px;padding-top:8px;border-top:1px dashed var(--rpt-border)}
 .prod-rpt .mini-lb{margin-bottom:0}
@@ -8223,6 +8225,35 @@ function cantidadesMal(){
   }
   return mal;
 }
+/* 💵 EL PRECIO DE VENTA ES OBLIGATORIO (31/10, dueño: «que al cargar una venta los vendedores coloquen sí o sí precio de venta del
+   producto. no pueden generar un pedido ni nada si no cargan el precio»). En una VENTA (📄 OC, también la venta de tienda) cada
+   producto lleva su «Precio c/u» mayor a 0, al crearla y al editarla. No en una ATC ni en una RPT (no se vende nada: no tienen
+   precio), ni para Eduardo y ROHO (`esVendedorLite`: los pedidos de ROHO llegan sin precio) ni en los pedidos internos
+   (`cliEsInterno`: ALBA, FÁBRICA…). Un renglón que el pedido YA traía sin precio (`data-sin-precio`, lo pone `editPedido`) y
+   sigue igual (`data-orig`) es «heredado»: con la clave de Administración se puede guardar igual tras preguntar (como la ATC
+   vieja, §4lh); un vendedor no. Lo mismo piden `fxPasosEstado` y «Para guardar» (§4mj: lo mismo que Guardar). */
+function precioObligatorio(vend){
+  if(navigator.webdriver && !window.PRECIO_PRUEBA) return false;   // en Playwright solo con `PRECIO_PRUEBA`: las pruebas de siempre guardan ventas de ejemplo sin precio
+  return docTipoSel()==='OC' && !esVendedorLite(vend) && !cliEsInterno(vend);
+}
+function preciosFaltan(vend){
+  if(!precioObligatorio(vend)) return [];
+  var out=[];
+  Array.prototype.forEach.call(document.querySelectorAll('#f-productos .prod-card'), function(c){
+    var d=c.querySelector('.prod-desc'), e=c.querySelector('.prod-precio'), dn=d ? String(d.value||'').trim() : '';
+    if(!dn || !e) return;
+    if(montoForm(e)>0.005) return;
+    var ms=c.querySelector('.prod-medida'), ot=c.querySelector('.prod-medida-otro');
+    var ahora=dn+'|'+(ms && ms.value==='Otros' ? String((ot&&ot.value)||'').trim() : String((ms&&ms.value)||''));
+    out.push({ c:c, e:e, n:dn, her: !!(c.getAttribute('data-sin-precio') && c.getAttribute('data-de-pedido') && c.getAttribute('data-orig')===ahora) });
+  });
+  return out;
+}
+/* El asterisco de «Precio c/u» (y el aviso de abajo) según quién vende y qué documento es: lo pintan `applyVendedorLite` y `pintarDocTipo`. */
+function precioObligPintar(){
+  var v=document.getElementById('f-vendedor'), view=document.getElementById('view-form');
+  if(view) view.classList.toggle('precio-oblig', precioObligatorio(v ? v.value : ''));
+}
 function getProductos(){
   var cards=document.querySelectorAll('#f-productos .prod-card'),out=[],rptForm=(docTipoSel()==='RPT');
   for(var i=0;i<cards.length;i++){
@@ -15726,6 +15757,18 @@ function submitPedido(){
     try{ _mal[0].e.focus(); _mal[0].e.scrollIntoView({block:'center'}); }catch(e){}
     return;
   }
+  /* 💵 (31/10) Sin el precio de venta de cada producto, una venta no se guarda (`preciosFaltan`). */
+  var _sinPre=preciosFaltan(vendedor);
+  if(_sinPre.length && UNLOCKED && _sinPre.every(function(x){ return x.her; }) &&
+     confirm('💵 Este pedido ya estaba guardado SIN el precio de: '+_sinPre.map(function(x){ return x.n; }).join(', ')+'.\n\n'+
+             'Un vendedor NO puede guardarlo así. Vos tenés la clave de Administración.\n\nAceptar: guardarlo igual, sin precio.\nCancelar: ponerle el precio.')) _sinPre=[];
+  if(_sinPre.length){
+    _sinPre.forEach(function(x){ x.e.classList.add('err'); });
+    toast('💵 Poné el PRECIO de venta (c/u) de '+(_sinPre.length===1 ? ('«'+_sinPre[0].n+'»') : ('los '+_sinPre.length+' productos marcados en rojo'))+
+          ': una venta no se guarda sin el precio de cada producto.','err',9000);
+    try{ _sinPre[0].e.focus(); _sinPre[0].e.scrollIntoView({block:'center'}); }catch(e){}
+    return;
+  }
   var _acu=montoForm('f-acuenta');
   if(!lite){
     if((segVal('f-pagado')==='SI' || _acu>0) && !segVal('f-metodo')){ toast('Elegí con qué pagó (Efectivo / QR / Tarjeta)','err'); document.getElementById('wrap-metodo').scrollIntoView({block:'center'}); return; }
@@ -16884,6 +16927,7 @@ function applyVendedorLite(){
   var v=document.getElementById('f-vendedor'), view=document.getElementById('view-form');
   var lite=v?esVendedorLite(v.value):false, roho=v?esRoho(v.value):false;
   if(view){ view.classList.toggle('lite-vendedor', lite); view.classList.toggle('roho-vendedor', roho); }
+  precioObligPintar();   // 💵 (31/10)
   /* El tope de fecha es SOLO para pedidos nuevos. Editando (desde Administración) no se
      pone ninguno: hay que poder pasar una entrega a HOY o corregir una fecha que ya pasó,
      y con el `min` puesto el calendario del navegador ni siquiera deja elegirlas.
@@ -17134,6 +17178,7 @@ function setDocTipo(){ pintarCampoOc(esRoho(document.getElementById('f-vendedor'
    tipo a mano; al abrir un pedido viejo va en falso para no borrarle nada. */
 function pintarDocTipo(limpiar){
   var tipo=docTipoSel(), sinVenta=(tipo!=='OC');
+  try{ precioObligPintar(); }catch(e){}   // 💵 (31/10)
   /* 🎧 Una ATC no es una venta (§4bt) y una RPT tampoco (§4dk): no tienen N° de nota ni
      cobro. `fueraDeConta` ya las deja a las dos fuera de Contabilidad y del Cuadre, así
      que lo que se anotara ahí no aparecería en ningún total. */
@@ -17552,6 +17597,7 @@ function editPedido(id){
   /* (30/09) Los renglones que YA traía el pedido: vaciarle el nombre a uno es sacarlo (como siempre); el freno de «código sin
      producto» de `submitPedido` es para un renglón nuevo al que nunca se le completó el nombre. */
   Array.prototype.forEach.call(box.querySelectorAll('.prod-card'), function(c){ if(String((c.querySelector('.prod-desc')||{}).value||'').trim()){ c.setAttribute('data-de-pedido','1');
+    if(!(montoForm(c.querySelector('.prod-precio'))>0.005)) c.setAttribute('data-sin-precio','1');   // 💵 (31/10) ya venía sin precio: `preciosFaltan` lo llama heredado
     /* (25/10) Cómo venía el renglón: mientras siga igual, `prodCodigoAuto` no le pone código (cambiaría `prodClave`). */
     var _ms=c.querySelector('.prod-medida'), _ot=c.querySelector('.prod-medida-otro');
     c.setAttribute('data-orig', String((c.querySelector('.prod-desc')||{}).value||'').trim()+'|'+(_ms && _ms.value==='Otros' ? String((_ot&&_ot.value)||'').trim() : String((_ms&&_ms.value)||''))); } });
@@ -18871,6 +18917,7 @@ function fxDerPintar(){
   if(tipo==='OC' && (tot>0 || acu>0 || sal>0)) h+='<div class="fx-tot">'+(tot>0?('<span>Los ítems suman</span><b>'+fmtBs(r2(tot))+'</b>'):'')+
       (pagado ? '<span>Pago</span><b style="color:var(--green)">✅ pagado</b>' : ('<span>A cuenta</span><b>'+fmtBs(acu)+'</b><span>Saldo por cobrar</span><span class="gr">'+fmtBs(sal)+'</span>'))+'</div>';
   var chk=[['Vendedor',!!v],['Cliente',!!cli],['Productos',prods.length>0]];
+  if(prods.length && precioObligatorio(v)) chk.push(['Precios', !preciosFaltan(v).some(function(x){ return !(x.her && UNLOCKED); })]);   // 💵 (31/10)
   if(!tienda){ chk.push(['Fecha',!!f]); if(tipo!=='RPT') chk.push(['Zona',!!zona]); }
   if(tipo==='OC' && !lite){ chk.push(['Celular',!!cel]); chk.push(['Nota',!!val('f-nota')]); if(!cliEsInterno(v)) chk.push(['Saldo o pagado', !!fxPasosEstado()[3]]); }
   if(tipo==='ATC'){                                     // 🎧 (§4lh) lo obligatorio de la ATC, la misma cuenta que `submitPedido`
@@ -19370,6 +19417,7 @@ function fxPasosEstado(){
      más (`cantidadesMal`) y ningún renglón con código o precio pero sin producto. Con cantidad 0 decía «4 de 4 ¡listo para guardar!». */
   try{
     if(prods && cantidadesMal().length) prods=false;
+    if(prods && preciosFaltan(val('f-vendedor')).some(function(x){ return !(x.her && UNLOCKED); })) prods=false;   // 💵 (31/10) lo mismo que Guardar
     if(prods && [].some.call(document.querySelectorAll('#f-productos .prod-card'), function(c){
       if(c.getAttribute('data-de-pedido')) return false;
       var d=c.querySelector('.prod-desc'), co=c.querySelector('.prod-codigo'), pr=c.querySelector('.prod-precio');
```

### El código que usa

```js
// pedidos.html:8235
function precioObligatorio(vend){
  if(navigator.webdriver && !window.PRECIO_PRUEBA) return false;   // en Playwright solo con `PRECIO_PRUEBA`: las pruebas de siempre guardan ventas de ejemplo sin precio
  return docTipoSel()==='OC' && !esVendedorLite(vend) && !cliEsInterno(vend);
}

// pedidos.html:8239
function preciosFaltan(vend){
  if(!precioObligatorio(vend)) return [];
  var out=[];
  Array.prototype.forEach.call(document.querySelectorAll('#f-productos .prod-card'), function(c){
    var d=c.querySelector('.prod-desc'), e=c.querySelector('.prod-precio'), dn=d ? String(d.value||'').trim() : '';
    if(!dn || !e) return;
    if(montoForm(e)>0.005) return;
    var ms=c.querySelector('.prod-medida'), ot=c.querySelector('.prod-medida-otro');
    var ahora=dn+'|'+(ms && ms.value==='Otros' ? String((ot&&ot.value)||'').trim() : String((ms&&ms.value)||''));
    out.push({ c:c, e:e, n:dn, her: !!(c.getAttribute('data-sin-precio') && c.getAttribute('data-de-pedido') && c.getAttribute('data-orig')===ahora) });
  });
  return out;
}

// pedidos.html:8253
function precioObligPintar(){
  var v=document.getElementById('f-vendedor'), view=document.getElementById('view-form');
  if(view) view.classList.toggle('precio-oblig', precioObligatorio(v ? v.value : ''));
}

// pedidos.html:16928
function esVendedorLite(v){ return mismoVendedor(v,'Eduardo Añez') || esRoho(v); }

// pedidos.html:28609
function cliEsInterno(v){ for(var i=0;i<CONTA_INTERNOS.length;i++) if(mismoVendedor(CONTA_INTERNOS[i], v)) return true; return false; }

// pedidos.html:17156
function docTipoSel(){ var v=segVal('f-doc-tipo'); return (v==='ATC'||v==='RPT') ? v : 'OC'; }

// pedidos.html:19416
function fxPasosEstado(){
  var val=function(id){ return String((document.getElementById(id)||{}).value||'').trim(); };
  var lite=esVendedorLite(val('f-vendedor')), tipo=docTipoSel(), tienda=VENTA_TIENDA;
  var prods=[].some.call(document.querySelectorAll('#f-productos .prod-desc'), function(d){ return !!d.value.trim(); });
  /* (25/10, §4ml, auditoría Codex OPS-03) Productos «listo» también con lo que Guardar pide de cada renglón: una cantidad entera de 1 o
     más (`cantidadesMal`) y ningún renglón con código o precio pero sin producto. Con cantidad 0 decía «4 de 4 ¡listo para guardar!». */
  try{
    if(prods && cantidadesMal().length) prods=false;
    if(prods && preciosFaltan(val('f-vendedor')).some(function(x){ return !(x.her && UNLOCKED); })) prods=false;   // 💵 (31/10) lo mismo que Guardar
    if(prods && [].some.call(document.querySelectorAll('#f-productos .prod-card'), function(c){
      if(c.getAttribute('data-de-pedido')) return false;
      var d=c.querySelector('.prod-desc'), co=c.querySelector('.prod-codigo'), pr=c.querySelector('.prod-precio');
      return d && !String(d.value||'').trim() && ((co && String(co.value||'').trim()) || (pr && String(pr.value||'').trim()));
    })) prods=false;
  }catch(e){}
  var pag=segVal('f-pagado');
  /* ⚠️ (25/10, auditoría N-UI3) Lo mismo que exige `submitPedido`, ni más ni menos: sin la nota decía «4 de 4 ¡listo para guardar!»
     y Guardar la pedía. Celular: todo menos RPT (también la ATC); la zona, también en una RPT; ROHO, su N° de OC; la ATC, lo de `atcFaltan`. */
  var atcMal=false; try{ atcMal = tipo==='ATC' && atcFaltan(EDIT_ID ? findById(EDIT_ID) : null).length>0; }catch(e){}
  return [
    !!val('f-vendedor') && !!val(tipo==='RPT'?'f-rpt-suc':'f-cliente') && (lite || tipo==='RPT' || !!val('f-celular')) &&
      (lite || tipo!=='OC' || !!val('f-nota')) && (!esRoho(val('f-vendedor')) || !!val('f-oc')) && !atcMal,
    prods,
    tienda || (!!val('f-fecha') && !!val('f-zona')),
    tipo!=='OC' || lite || cliEsInterno(val('f-vendedor')) || (pag==='SI' ? !!segVal('f-metodo') : (pag==='NO' && (montoForm('f-saldo')>0 || cobroFormCobAparte()>0.009)))
  ];
}

// submitPedido (91 KB entera): las primeras validaciones hasta la del precio
// pedidos.html:15653
function submitPedido(){
  clearErr();
  /* 📐 (27/09, el dueño) El código de la medida estándar en un renglón de medida especial se borra también acá, por si se
     guardó sin salir del campo (Enter). Solo en un renglón nuevo o cambiado: el guardado tal cual conserva lo de logística. */
  try{ codigoEspecialBorrar(null, EDIT_ID ? findById(EDIT_ID) : null); }catch(e){}
  /* (30/09, A4-1 y X-3) Un renglón con CÓDIGO o PRECIO y SIN producto no se descarta callado: `getProductos` saltea el renglón sin
     nombre, así que el pedido se guardaba sin ese producto (y a veces la pregunta del saldo lo nombraba igual). Pasa con un código
     del almacén escrito antes de que llegue el saldo, o de un producto agotado que no está en el Excel de hoy. */
  /* Un renglón que ya traía el pedido (`data-de-pedido`, lo pone `editPedido`) y al que se le vació el nombre es SACARLO, como
     siempre: se deja pasar (el aviso ➖ de «pedido modificado» lo cuenta). */
  var _sinNombre=Array.prototype.filter.call(document.querySelectorAll('#f-productos .prod-card'), function(c){
    if(c.getAttribute('data-de-pedido')) return false;
    var d=c.querySelector('.prod-desc'), co=c.querySelector('.prod-codigo'), pr=c.querySelector('.prod-precio');
    return d && !String(d.value||'').trim() && ((co && String(co.value||'').trim()) || (pr && String(pr.value||'').trim()));
  });
  if(_sinNombre.length){
    _sinNombre.forEach(function(c){ c.querySelector('.prod-desc').classList.add('err'); });
    var _pend=_sinNombre.some(function(c){ return !!c.getAttribute('data-alm-pend'); });
    toast('Hay '+(_sinNombre.length===1?'un renglón':(_sinNombre.length+' renglones'))+' con código o precio pero SIN producto: escribí qué producto es, o borrá el renglón (×). '+
          ((_pend && !STOCK_CARGADO) ? 'Todavía no llegó el saldo del almacén: esperá unos segundos y se completa solo.'
           : (!stockHayAlgunExcel() ? 'Todavía no hay ningún Excel del almacén cargado: escribí el producto a mano.'
                                    : 'Si es un código del almacén, puede que ese producto no esté en el Excel de hoy.')),'err',10000);
    try{ _sinNombre[0].querySelector('.prod-desc').focus(); _sinNombre[0].scrollIntoView({block:'center'}); }catch(e){}
    return;
  }
  var vendedor=document.getElementById('f-vendedor').value.trim();
  /* 🏪 En una reposición el «cliente» es la SUCURSAL de destino, y se escribe en su propio
     campo (§4dk): el de cliente está escondido y traería lo que quedó de antes. */
  var _rpt=(docTipoSel()==='RPT');
  var cliente=_rpt ? document.getElementById('f-rpt-suc').value.trim()
                   : document.getElementById('f-cliente').value.trim();
  var productos=getProductos();
  var ok=true;
  var lite=esVendedorLite(vendedor); // Eduardo Añez y ROHO: nota, celular y cobro NO obligatorios
  // Salvo el N° de OC en ROHO: es lo que identifica el pedido y lo que va al Excel.
  var faltaOcRoho=false;
  if(esRoho(vendedor) && !document.getElementById('f-oc').value.trim()){ markErr('f-oc'); ok=false; faltaOcRoho=true; }
  /* La nota de venta no se exige en una ATC: no hay venta que anotar, y el campo ni se
     muestra — sin esta excepción el formulario se trababa pidiendo algo invisible (§4bt). */
  if(!lite && docTipoSel()==='OC' && !document.getElementById('f-nota').value.trim()){ markErr('f-nota'); ok=false; }
  if(!vendedor){ markErr('f-vendedor'); ok=false; }
  if(!cliente){ markErr(_rpt?'f-rpt-suc':'f-cliente'); ok=false; }
  // 🏪 A una sucursal no se la llama por teléfono para coordinar: el celular no aplica.
  if(!lite && !_rpt && !document.getElementById('f-celular').value.trim()){ markErr('f-celular'); ok=false; }
  if(!VENTA_TIENDA && !document.getElementById('f-zona').value.trim()){ markErr('f-zona'); ok=false; }
  if(productos.length===0){ var pd=document.querySelector('#f-productos .prod-desc'); if(pd)pd.classList.add('err'); ok=false; }
  /* 🎧 Sin motivo la ATC no sirve para lo que se pidió: no habría con qué contar POR QUÉ
     se generan (§4bq). (15/10, §4lh) Y el dueño pidió más: motivo, DETALLE, FECHA DE COMPRA y qué se le recoge son
     obligatorios (`atcFaltan`), al crear y al editar. El recuadro rojo del bloque dice qué falta y se va achicando. */
  var faltaAtc=[], okSinAtc=ok;
  if(docTipoSel()==='ATC'){
    var _prevAtc=EDIT_ID ? findById(EDIT_ID) : null;
    faltaAtc=atcFaltan(_prevAtc);
    /* 🔑 Con la clave de Administración, una ATC vieja a la que YA le faltaba eso se puede guardar igual, preguntando. */
    if(faltaAtc.length && UNLOCKED && atcFaltanHeredados(faltaAtc, _prevAtc).length===faltaAtc.length &&
       confirm('🎧 Esta ATC ya estaba guardada sin: '+atcFaltanTxt(faltaAtc)+'.\n\nUn vendedor NO puede guardarla así. Vos tenés la clave de Administración.\n\nAceptar: guardarla igual, sin completarlo.\nCancelar: completarlo ahora.')) faltaAtc=[];
    faltaAtc.forEach(function(x){ markErr(x.id); });
    if(faltaAtc.length) ok=false;
  }
  pintarAtcFalta(faltaAtc);
  var faltaMotivo=faltaAtc.length>0;
  var faltaSuc = _rpt && !cliente;
  if(!ok){
    toast(faltaOcRoho ? 'Para ROHO el N° de OC es obligatorio — es lo que identifica el pedido.'
        : faltaMotivo ? ((okSinAtc ? '' : 'Completá los campos marcados en rojo (*). ')+'🎧 No se puede guardar la ATC: falta '+atcFaltanTxt(faltaAtc)+'.')
        : faltaSuc ? '🏪 Poné a qué SUCURSAL va la reposición — es a dónde tiene que ir el camión.'
        : ('Falta: '+formFaltanNombres().join(', ')+'. Está marcado en rojo (*).'),'err');
    /* 📱 (25/10, auditoría Codex/Astra) En el celular el campo que falta podía quedar 2.700 px más arriba y el foco seguía en «Guardar»:
       la vendedora no veía qué faltaba. Se la lleva al PRIMER campo en rojo (los casos de abajo eligen el suyo). */
    if(!faltaSuc && !faltaMotivo && !faltaOcRoho) formIrAlPrimerError();
    if(faltaSuc){ var fs2=document.getElementById('f-rpt-suc'); if(fs2){ fs2.focus(); fs2.scrollIntoView({block:'center'}); } }
    if(faltaMotivo){ var fm=okSinAtc ? document.getElementById(faltaAtc[0].id) : (document.querySelector('#view-form .err')||document.getElementById(faltaAtc[0].id));
      if(fm){ try{ if(fm.focus) fm.focus(); }catch(e){} fm.scrollIntoView({block:'center'}); } }
    if(faltaOcRoho){ var fo0=document.getElementById('f-oc'); if(fo0){ fo0.focus(); fo0.scrollIntoView({block:'center'}); } }
    return;
  }
  /* 📷 (§4lh) Una foto del producto que todavía está subiendo se perdería: el pedido se guardaría sin ella. */
  if(docTipoSel()==='ATC' && ATC_FOTO_SUBIENDO>0){
    toast('📷 Esperá que termine de subir la foto del producto y volvé a tocar Guardar.','err',7000);
    try{ document.getElementById('wrap-atc-fotos').scrollIntoView({block:'center'}); }catch(e){}
    return;
  }
  var _cantMal=cantidadesMal();   // (26/09) 0, 2,5, −2 o vacía: no se inventa otra cantidad
  if(_cantMal.length){
    _cantMal.forEach(function(q){ q.classList.add('err'); });
    toast('🔢 La cantidad tiene que ser un número entero, de 1 para arriba (sin decimales ni signo menos). Corregí la que quedó en rojo.','err');
    try{ _cantMal[0].focus(); _cantMal[0].scrollIntoView({block:'center'}); }catch(e){}
    return;
  }
  /* 💵 UN MONTO CON SIGNO MENOS NO SE GUARDA (26/09). Con `parseFloat` quedaba «A cuenta −500» o
     «Saldo −100» en la planilla, y un flete «−50» borraba callado el pactado; `montoForm` (como
     `parseMonto`) le sacaría el signo. Se frena el campo A LA VISTA, como «Corregir precios y montos».
     (26/09, revisión de Codex) Y no solo el menos del teclado: «−1500» (el de Unicode) y «Bs -1500» se
     guardaban 1.500, «1e3» 13, «12abc» 12, «1500 2000» 15.002.000 y «.50» 50. `montoError` mira el
     texto ENTERO, y el aviso dice qué campo, qué se tipeó y cómo escribirlo. */
  var _mal=[];
  [['f-acuenta','A cuenta'],['f-saldo','Saldo por cobrar'],['f-cobrado','Monto total cobrado'],
   ['f-monto2','Monto del 2° método'],['f-envio','Recargo por entrega']].forEach(function(x){
    var e=document.getElementById(x[0]); if(e) _mal.push({e:e, n:x[1]});
  });
  Array.prototype.forEach.call(document.querySelectorAll('#f-productos .prod-card'), function(card){
    var e=card.querySelector('.prod-precio'), d=card.querySelector('.prod-desc'), dn=d?d.value.trim():'';
    if(e) _mal.push({e:e, n:'Precio c/u'+(dn?(' de '+dn):'')});
  });
  _mal=_mal.filter(function(x){ if(x.e.offsetParent===null) return false; x.err=montoError(x.e.value); return !!x.err; });
  if(_mal.length){
    _mal.forEach(function(x){ x.e.classList.add('err'); });
    toast(montoAviso(_mal[0].n, _mal[0].e.value, _mal[0].err)+(_mal.length>1?(' Hay '+(_mal.length-1)+' más en rojo.'):''),'err',9000);
    try{ _mal[0].e.focus(); _mal[0].e.scrollIntoView({block:'center'}); }catch(e){}
    return;
  }
  /* 💵 (31/10) Sin el precio de venta de cada producto, una venta no se guarda (`preciosFaltan`). */
  var _sinPre=preciosFaltan(vendedor);
  if(_sinPre.length && UNLOCKED && _sinPre.every(function(x){ return x.her; }) &&
     confirm('💵 Este pedido ya estaba guardado SIN el precio de: '+_sinPre.map(function(x){ return x.n; }).join(', ')+'.\n\n'+
             'Un vendedor NO puede guardarlo así. Vos tenés la clave de Administración.\n\nAceptar: guardarlo igual, sin precio.\nCancelar: ponerle el precio.')) _sinPre=[];
  if(_sinPre.length){
    _sinPre.forEach(function(x){ x.e.classList.add('err'); });
    toast('💵 Poné el PRECIO de venta (c/u) de '+(_sinPre.length===1 ? ('«'+_sinPre[0].n+'»') : ('los '+_sinPre.length+' productos marcados en rojo'))+
          ': una venta no se guarda sin el precio de cada producto.','err',9000);
    try{ _sinPre[0].e.focus(); _sinPre[0].e.scrollIntoView({block:'center'}); }catch(e){}
    return;
  }
  var _acu=montoForm('f-acuenta');
  if(!lite){
    if((segVal('f-pagado')==='SI' || _acu>0) && !segVal('f-metodo')){ toast('Elegí con qué pagó (Efectivo / QR / Tarjeta)','err'); document.getElementById('wrap-metodo').scrollIntoView({block:'center'}); return; }
    // Mismo orden que en pantalla: método → monto → banco → comprobante.
    if(segVal('f-pagado')==='SI' && !(montoForm('f-cobrado')>0)){
```

---

## 3 · 📅 Administración abre en «Hoy» (publicado hoy, versión 2026-10-31-b)

**Pedido del dueño:** Administración abría en «Todos» (todas las entregas del mes) y con cientos de fichas se ponía lenta; tiene que
abrir en «📅 Hoy». Cómo quedó: `QUICK_FILTER='hoy'` al entrar (`ADM_HOY_DEF`). Mientras nadie elija otro chip, escribir en el buscador
mira TODO (una venta de la semana pasada no está en Hoy) y al borrarlo vuelve a Hoy. Elegir un chip apaga ese comportamiento. Hoy sin
pedidos (domingo, feriado) dice «Hoy no hay entregas agendadas» y ofrece el próximo día y «Ver todos». En Playwright sigue «Todos».

**Mirá en especial:** ¿algún camino deja `QUICK_FILTER` en un valor y `ADM_HOY_DEF` en true, de modo que buscar o borrar la búsqueda
salte a otra lista que la que la persona eligió? ¿Bloki u otro aviso que «lleva» a un pedido de otro día lo encuentra si la lista
está en Hoy?

### El cambio (diff)

```diff
diff --git a/pedidos.html b/pedidos.html
index ea3fa67..5d1892a 100644
--- a/pedidos.html
+++ b/pedidos.html
@@ -20996,7 +20996,12 @@ function loadFromServer(showToastOk){
 /* ============================================================================
    Admin: filtros / render
    ========================================================================== */
-var QUICK_FILTER='';                 // '', 'cobrar','sinchofer','noentregado','am','pm','especial'
+/* 📅 (31/10, dueño: «administración entra por defecto en "todas" en vez de hoy día y eso ralentiza un poco y satura todo») Administración
+   ABRE EN «📅 Hoy». Mientras nadie elija otro chip (`ADM_HOY_DEF`), escribir en el buscador mira TODO (una venta de la semana pasada no
+   está en Hoy) y al borrarlo vuelve a Hoy. Hoy sin pedidos lo dice con «➡️ Ver el próximo día» y «Ver todos» (`admVacioPintar`).
+   En Playwright sigue «Todos» (las pruebas de siempre leen la lista entera) salvo `window.ADM_HOY_PRUEBA`. */
+var ADM_HOY_DEF=!(typeof navigator!=='undefined' && navigator.webdriver) || !!window.ADM_HOY_PRUEBA;
+var QUICK_FILTER=ADM_HOY_DEF?'hoy':'';   // '', 'hoy', 'manana', 'semana', 'cobrar','sinchofer','noentregado','am','pm','especial'…
 var SORT_KEY='', SORT_DIR=1;         // orden de columnas (1 asc, -1 desc)
 var QUICK_DEFS=[
   {k:'',            lbl:'Todos',           test:function(p){return true;}},
@@ -21142,7 +21147,7 @@ function semanaVer(k){ SEMANA_VER=(SEMANA_VER===k?'':k); admTopeReset(); renderA
 function semanaArrancar(){ SEMANA_DIA=''; var T=semanaDatos().tot; SEMANA_VER=T.falta ? 'falta' : ''; }
 function admVerSemana(v){
   try{ admSecPoner('ped'); }catch(e){}
-  QUICK_FILTER='semana'; SEMANA_DIA=''; SEMANA_VER=v||'';
+  QUICK_FILTER='semana'; ADM_HOY_DEF=false; SEMANA_DIA=''; SEMANA_VER=v||'';
   admTopeReset(); renderAdmin();
   try{ admIrA('adm-chips'); }catch(e){}
 }
@@ -21342,7 +21347,7 @@ function renderRptAtrasadas(){
 /* El aviso recorre TODO el historial; el chip y la tabla van por el filtro Mes/Día. Con una
    RPT de agosto sin entregar en septiembre el botón dejaba la tabla vacía y el chip en 0
    (§4ew): se pasa a «Todo» y se deja el filtro puesto (sin el toggle de `setQuick`). */
-function admVerRptAtrasadas(){ QUICK_FILTER='rpt'; admVerTodoElHistorial(); }
+function admVerRptAtrasadas(){ QUICK_FILTER='rpt'; ADM_HOY_DEF=false; admVerTodoElHistorial(); }
 /* ============================================================================
    🏪 LA REPOSICIÓN QUE NO FUE ENTERA PIDE MANDAR LO QUE FALTÓ (30/10, propuesta 83; dueño: «83»)
    En octubre la RPT 09-020 de Central y la 10-016 de Carmelo se tildaron ✅ con 11 unidades marcadas ✗ (no hay) o mandadas a
@@ -22002,7 +22007,7 @@ function renderAdmin(){
   if(admVista()==='fichas'){   // 🃏 (24/10) con las fichas, la tabla ni se arma (se arma al volver a «Ver como tabla»)
     if(deMas) list=list.slice(0, ADM_TOPE);
     admFichasPintar(list, dn); admMasPintar(deMas);
-    document.getElementById('pedidos-empty').style.display=list.length?'none':'block';
+    admVacioPintar(list.length);
     try{ tblBarPintar('admin'); }catch(e){}   // 🗂️ (§4nr, 33) con las fichas, la barra de columnas no va
     return;
   }
@@ -22049,7 +22054,7 @@ function renderAdmin(){
   }).join('');
   document.getElementById('tbl-pedidos').innerHTML=head+'<tbody>'+body+'</tbody>';
   admFichasPintar(list, dn);
-  document.getElementById('pedidos-empty').style.display=list.length?'none':'block';
+  admVacioPintar(list.length);
   document.getElementById('tbl-pedidos').style.display=list.length?'table':'none';
   admMasPintar(deMas);
   try{ tblEstilo(); tblBarPintar('admin'); }catch(e){ console.error(e); }   // 🗂️ (§4nr, 33)
@@ -22103,7 +22108,18 @@ function mc(color,lbl,val,sub,txt){ return '<div class="mc"><div class="mc-bar"
 function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
 
 /* ---- Filtros rápidos (chips) + orden de columnas ---- */
-function setQuick(k){ QUICK_FILTER=(QUICK_FILTER===k?'':k); if(k==='semana' && QUICK_FILTER==='semana') semanaArrancar(); renderAdmin();
+/* 📅 (31/10) El cartel de «no hay pedidos»: con «Hoy» elegido dice que hoy no hay entregas y ofrece el próximo día y todos. */
+function admVacioPintar(n){
+  var el=document.getElementById('pedidos-empty'); if(!el) return;
+  el.style.display=n?'none':'block'; if(n) return;
+  if(QUICK_FILTER==='hoy' && !(document.getElementById('adm-search')||{}).value){
+    var d=quickDef('manana'), lbl=d && d.lblF ? d.lblF() : '➡️ Mañana';
+    el.innerHTML='Hoy no hay entregas agendadas. '+
+      '<span class="adm-vacio-b"><button type="button" class="btn btn-sm" onclick="setQuick(\'manana\')">'+esc(lbl)+'</button> '+
+      '<button type="button" class="btn btn-ghost btn-sm" onclick="setQuick(\'\')">Ver todos</button></span>';
+  }else el.textContent='No hay pedidos para este filtro todavía.';
+}
+function setQuick(k){ ADM_HOY_DEF=false; QUICK_FILTER=(QUICK_FILTER===k?'':k); if(k==='semana' && QUICK_FILTER==='semana') semanaArrancar(); renderAdmin();
   if(k==='rpt' && QUICK_FILTER==='rpt' && rptFaltaPendientes().length) setTimeout(function(){ admIrA('adm-rpt'); }, 60); }   // 🏪 (propuesta 83) a la lista de las que faltó algo
 function renderChips(){
   var el=document.getElementById('adm-chips'); if(!el) return;
@@ -51139,7 +51155,9 @@ document.addEventListener('DOMContentLoaded',function(){
   document.getElementById('f-submit').addEventListener('click',submitPedido);
   document.getElementById('adm-dia').value=todayStr();
   document.getElementById('adm-mes').value=monthStr();
-  var sb=document.getElementById('adm-search'); if(sb) sb.addEventListener('input',function(){ if(UNLOCKED){ admTopeReset(); renderAdmin(); } });
+  var sb=document.getElementById('adm-search'); if(sb) sb.addEventListener('input',function(){
+    if(ADM_HOY_DEF && (QUICK_FILTER==='hoy' || QUICK_FILTER==='')) QUICK_FILTER=sb.value.trim() ? '' : 'hoy';   // 📅 (31/10) buscar mira todo; borrar vuelve a Hoy
+    if(UNLOCKED){ admTopeReset(); renderAdmin(); } });
   document.getElementById('adm-dia').addEventListener('change',function(){ if(UNLOCKED){ admTopeReset(); renderAdmin(); } });
   document.getElementById('adm-mes').addEventListener('change',function(){ if(UNLOCKED){ admTopeReset(); renderAdmin(); } });
   document.getElementById('f-fecha').addEventListener('change',renderCupoForm);
```

### El código que usa

```js
// pedidos.html:22174
function setQuick(k){ ADM_HOY_DEF=false; QUICK_FILTER=(QUICK_FILTER===k?'':k); if(k==='semana' && QUICK_FILTER==='semana') semanaArrancar(); renderAdmin();
  if(k==='rpt' && QUICK_FILTER==='rpt' && rptFaltaPendientes().length) setTimeout(function(){ admIrA('adm-rpt'); }, 60); }   // 🏪 (propuesta 83) a la lista de las que faltó algo
function renderChips(){
  var el=document.getElementById('adm-chips'); if(!el) return;
  var base=admBaseList(), todo=null;
  el.innerHTML=QUICK_DEFS.map(function(d){
    var b=d.todo?(todo||(todo=admBaseList(true))):base;
    var n=d.k?b.filter(d.test).length:b.length;
    var active=(QUICK_FILTER===d.k);
    /* 🔴 (26/10) `alerta`: el botón parpadea en rojo y dice cuántos (la semana: productos sin revisar o sin pedir a producción) */
    var al=0; if(d.alerta){ try{ al=d.alerta()||0; }catch(e){} }
    return '<button class="qchip'+(active?' active':'')+(al?' qchip-alerta':'')+'" data-k="'+d.k+'" onclick="setQuick(\''+d.k+'\')"'+(d.tit?(' title="'+esc(d.tit(al))+'"'):'')+'>'+
      (al?'<i class="late-dot"></i>':'')+(d.lblF?d.lblF():d.lbl)+' <span class="n">'+n+'</span>'+(al?(' <span class="qa">🔴 '+al+' '+esc(d.alertaTxt||'')+'</span>'):'')+'</button>';
  }).join('');
  semanaPintar();
}

// pedidos.html:22164
function admVacioPintar(n){
  var el=document.getElementById('pedidos-empty'); if(!el) return;
  el.style.display=n?'none':'block'; if(n) return;
  if(QUICK_FILTER==='hoy' && !(document.getElementById('adm-search')||{}).value){
    var d=quickDef('manana'), lbl=d && d.lblF ? d.lblF() : '➡️ Mañana';
    el.innerHTML='Hoy no hay entregas agendadas. '+
      '<span class="adm-vacio-b"><button type="button" class="btn btn-sm" onclick="setQuick(\'manana\')">'+esc(lbl)+'</button> '+
      '<button type="button" class="btn btn-ghost btn-sm" onclick="setQuick(\'\')">Ver todos</button></span>';
  }else el.textContent='No hay pedidos para este filtro todavía.';
}

// pedidos.html:21596
function admBaseList(sinPeriodo){
  var mode=sinPeriodo?'todo':segVal('adm-mode');   // (12/10) Hoy/Mañana: sin el corte por día o mes
  var q=sinTildes(document.getElementById('adm-search').value);
  var list=STATE.slice();
  if(mode==='dia'){ var d=document.getElementById('adm-dia').value; if(d) list=list.filter(function(p){return p.fecha===d;}); }
  else if(mode==='mes'){ var m=document.getElementById('adm-mes').value; if(m) list=list.filter(function(p){ return (p.fecha||'').slice(0,7)===m || admAvisaEnMes(p, m); }); }
  // Sin acentos ni mayúsculas (§4ew): «perez» encuentra a PÉREZ y «colchon» al COLCHÓN, como en «Quién vendió qué».
  if(q) list=list.filter(function(p){ return sinTildes([p.oc,p.nota,p.vendedor,p.cliente,p.celular,p.zona,p.direccion,prodText(p.productos)].join(' ')).indexOf(q)>=0; });
  return list;
}

```
