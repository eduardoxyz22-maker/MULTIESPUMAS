# Revisión pedida, segunda vuelta: los arreglos de H1 y H2, y la propuesta 90

Repositorio `eduardoxyz22-maker/MULTIESPUMAS`, rama `claude/pedidos-fecha-entrega-bgt0em`. Sigue de la primera entrega
(`REVISION_VELOCIDAD_84-89.md`, commit `330560c`). **Nada de esto está publicado todavía.**

Mismo formato de respuesta que la vez anterior: dónde (línea), gravedad, cómo falla con un caso concreto, arreglo. Las dudas aparte.
**Tu revisión anterior me llegó cortada a mitad de H2** («La relectura de los 25…»): si tenías más hallazgos, dudas o la lista de lo
que revisaste, mandalos de nuevo junto con esta.

## 1 · Arreglos de tu revisión (commit `8c4193e`, `pedidos.html`)

- **H1 (la lista saltaba para arriba al repintar)**: `TROZOS_N[clave]` = cuántas filas de esa lista ya se dibujaron. `trozosHtml`
  dibuja `max(primer trozo, TROZOS_N[clave])` y `trozosMas` lo sube. Se vacía en `showViewAhora` cuando se cambia a OTRA pestaña (si
  no, el ahorro se perdería para siempre después de bajar una vez). Así sirve también para «Ver 120 más» de Mis pedidos, que llama a
  `renderMis`. No usé la comparación de largo que proponías: con un filtro nuevo la lista cambia de largo y el usuario sigue en el
  mismo lugar de la página; dibujar de más es solo un poco más lento, dibujar de menos es lo que hacía saltar la página.
- **H2 («sin cambios» contra la lectura anterior, no contra lo dibujado)**: `STATE_GEN` sube en cada `saveMirror()` sin `{igual:true}`.
  Todos los caminos que cambian `STATE` terminan ahí (las lecturas de Administración, ATC, chofer, Contabilidad, lo que se guarda
  acá, y `refrescarEstadoYa` cuando no es «sin cambios»). `autoRepintar` anota `AUTO_PINTADO_GEN=STATE_GEN`, y
  `autoRepintarPuedeEsperar` solo deja de repintar si `AUTO_PINTADO_GEN===STATE_GEN`. **Mirá**: ¿hay algún camino que cambie `STATE`
  SIN llamar a `saveMirror()`? (con eso, esta regla no lo vería).
- La prueba `tests/test_velocidad_4oa.js` (30) tiene los dos casos (3f y 4c), que fallan sin el arreglo.

## 2 · La propuesta 90: publicar `pedidos.html` achicado (commit `ff2a3ca`)

- `herramientas/achicar_panel.js`: busca los bloques `<script>` (sin `src`, de JavaScript) y `<style>` y los pasa por esbuild
  **solo con `minifyWhitespace`** (sin `minifySyntax` ni `minifyIdentifiers`: los nombres y la lógica no cambian). Controla que el
  resultado no tenga `</script`, que cada bloque compile (`vm.Script`) y que la cantidad de bloques sea la misma. Si cualquier cosa
  falla, escribe el ORIGINAL. Deja los comentarios del HTML como están.
- `.github/workflows/publicar-pages.yml`: arma el sitio (la rama `main` entera, `pedidos.html` achicado) y lo publica con
  `actions/deploy-pages`. **Solo si Pages está en «GitHub Actions»** (lo pregunta con `gh api …/pages --jq .build_type`); con la rama
  (hoy) no hace nada. Escucha `push` a main y `workflow_run` de los workflows que suben a main con el token de GitHub (esos push no
  disparan otro workflow).
- Medido: 4.281.905 → 2.901.141 letras; comprimido (lo que viaja) 1.338 KB → 839 KB. `tests/test_achicar.js` (25) abre las dos
  versiones en Chromium con los mismos pedidos: mismas 3.336 funciones globales, el mismo texto en cada pestaña, los mismos estilos
  calculados en 700 elementos, sin errores.
- **Mirá**: ¿algo del panel lee su propio código (`Function.prototype.toString`, buscar texto en `document.scripts`)? ¿Algún
  `<script>` dentro de una cadena o de un `<template>` que la expresión regular tome por un bloque? ¿El workflow puede publicar una
  versión ATRASADA (dos corridas casi juntas, `cancel-in-progress: false`, `ref: main`)? ¿Falta algún workflow en la lista de
  `workflow_run`? ¿Qué pasa si esbuild cambia comillas o escapa caracteres (vi que `PANEL_V='…'` pasa a `PANEL_V="…"`)?

## Los cambios enteros

### `pedidos.html` (H1 y H2)

```diff
diff --git a/pedidos.html b/pedidos.html
index 4d0a8e3..037cfaa 100644
--- a/pedidos.html
+++ b/pedidos.html
@@ -6065,7 +6065,14 @@ function lsPoner(k, v, esCopia){
 /* ⚡ (§4oa, propuesta 85) `o.igual`: la lectura de cada minuto vino sin ningún cambio (`apiList` → `_igual`). Si la copia ya estaba al
    día no se vuelve a escribir (eran 1,3 MB cada minuto). Todo lo que cambia algo acá llama sin `o` y la escribe siempre. */
 var MIRROR_SUCIO=true;
+/* (30/10, revisión de la otra IA, H2) Cada cambio de `STATE` sube `STATE_GEN`: todo camino que lo cambia (cada lectura con cambios, lo
+   que se guarda acá, Administración, ATC, el chofer…) termina en `saveMirror()` sin `o`. `autoRepintar` anota hasta qué cambio dibujó
+   (`AUTO_PINTADO_GEN`): una lectura «sin cambios» deja de repintar SOLO si la pantalla ya muestra el último cambio. Antes miraba solo
+   si la lectura era igual a la ANTERIOR, y una lectura con cambios que no repintó (con algo abierto, o la relectura de un borrado de
+   `borradoConfirmarLuego`, que no pasa por `autoRepintar`) dejaba la pantalla vieja hasta 5 minutos. */
+var STATE_GEN=0;
 function saveMirror(o){
+  if(!(o && o.igual)) STATE_GEN++;
   if(o && o.igual && !MIRROR_SUCIO) return;
   SALDO_GEN++;
   var txt; try{ txt=JSON.stringify(mirrorRecortar(STATE)); }catch(e){ return; }
@@ -7528,6 +7535,7 @@ function showViewAhora(v){
   /* (§4nl, 27/10, Astra A12) La ficha al costado es de la lista de Administración: yendo a otra pestaña se cierra (antes quedaba encima
      de Mis pedidos, con la página apretada a la izquierda). En el medio no pasa: su fondo tapa las pestañas. */
   if(v!=='admin' && document.body.classList.contains('ficha-costado')) closeModal();
+  if(!document.getElementById('view-'+v) || !document.getElementById('view-'+v).classList.contains('active')) TROZOS_N={};   // ⚡ (§4oa, H1) otra pestaña: las listas largas vuelven a arrancar por el primer trozo
   var _nav=null; try{ _nav=navFoto(); }catch(e){}   // 🧭 (§4ni, 5) dónde estaba la pestaña elegida, para deslizarla
   document.getElementById('view-form').classList.toggle('active',v==='form');
   document.getElementById('view-admin').classList.toggle('active',v==='admin');
@@ -9361,11 +9369,16 @@ function lbMontoEntero(root){
    totales y el Excel no cambian: salen de la lista, no de lo dibujado.
    ⚠️ En Playwright se dibuja todo de una (las pruebas leen las filas), salvo `window.TROZOS_PRUEBA`. */
 var TROZO_PRIMERO=50, TROZO_SIGUE=100, TROZOS={}, TROZOS_OBS=null;
+/* (30/10, revisión de la otra IA, H1) Cuántas filas de cada lista ya se dibujaron. Un redibujo (la lectura de cada minuto, «Ver 120
+   más» de Mis pedidos, un filtro) dibuja por lo menos esas: si volviera al primer trozo, la página se achica y `autoRepintar` no puede
+   devolver el scroll (la lista saltaba para arriba mientras se leía). Se vacía al cambiar de pestaña (`showViewAhora`). */
+var TROZOS_N={};
 function trozosActivo(){ return !(navigator.webdriver && !window.TROZOS_PRUEBA); }
 /* El primer trozo (+ el marcador del resto). `fila(item, índice)`; `o.tabla`/`o.cols` para filas de tabla; `o.primero`. */
 function trozosHtml(clave, items, fila, o){
   o=o||{}; items=items||[];
-  var n=trozosActivo() ? Math.min(items.length, o.primero||TROZO_PRIMERO) : items.length;
+  var n=trozosActivo() ? Math.min(items.length, Math.max(o.primero||TROZO_PRIMERO, TROZOS_N[clave]||0)) : items.length;
+  TROZOS_N[clave]=n;
   var html=items.slice(0, n).map(function(x, k){ return fila(x, k); }).join('');
   if(n>=items.length){ delete TROZOS[clave]; return html; }
   TROZOS[clave]={ items:items, fila:fila, i:n, o:o };
@@ -9380,7 +9393,7 @@ function trozosMas(clave){
   var T=TROZOS[clave], m=document.querySelector('[data-trz="'+clave+'"]'); if(!T || !m) return;
   var desde=T.i, fin=Math.min(T.items.length, desde+TROZO_SIGUE);
   var html=T.items.slice(desde, fin).map(function(x, k){ return T.fila(x, desde+k); }).join('');
-  T.i=fin;
+  T.i=fin; TROZOS_N[clave]=fin;
   if(TROZOS_OBS) TROZOS_OBS.unobserve(m);   // el marcador viejo se reemplaza: que el observador no lo siga mirando
   m.insertAdjacentHTML('beforebegin', html);
   if(fin<T.items.length) m.outerHTML=trozoMarcador(clave, T.items.length-fin, T.o);
@@ -19733,13 +19746,13 @@ function autoOcupado(){
 /* ⚡ (§4oa, 85) Con la lectura sin cambios, Nuevo pedido, Mis pedidos y Contabilidad no se vuelven a dibujar (en el formulario trababa
    lo que se estaba escribiendo); igual se repintan cada `AUTO_REPINTAR_MS` y al cambiar el día, por lo que depende de la hora.
    Administración y la vista del chofer se repintan siempre: las posiciones del GPS llegan con cada lectura aunque la planilla no cambie. */
-var AUTO_PINTADO_T=0, AUTO_PINTADO_DIA='', AUTO_REPINTAR_MS=5*60000;
+var AUTO_PINTADO_T=0, AUTO_PINTADO_DIA='', AUTO_PINTADO_GEN=-1, AUTO_REPINTAR_MS=5*60000;
 function autoRepintarPuedeEsperar(){
-  if(!LECTURA_IGUAL || Date.now()-AUTO_PINTADO_T>=AUTO_REPINTAR_MS || AUTO_PINTADO_DIA!==todayStr()) return false;
+  if(!LECTURA_IGUAL || AUTO_PINTADO_GEN!==STATE_GEN || Date.now()-AUTO_PINTADO_T>=AUTO_REPINTAR_MS || AUTO_PINTADO_DIA!==todayStr()) return false;
   return ['view-form','view-mis','view-conta'].some(function(id){ var v=document.getElementById(id); return v && v.classList.contains('active'); });
 }
 function autoRepintar(){
-  AUTO_PINTADO_T=Date.now(); AUTO_PINTADO_DIA=todayStr();
+  AUTO_PINTADO_T=Date.now(); AUTO_PINTADO_DIA=todayStr(); AUTO_PINTADO_GEN=STATE_GEN;
   var y=window.scrollY;
   if(document.getElementById('view-form').classList.contains('active')){ renderCupoForm(); pintarBotonCierre(); }
   else if(document.getElementById('view-admin').classList.contains('active')){ if(UNLOCKED) renderAdmin(); }
```

### `herramientas/achicar_panel.js`

```js
#!/usr/bin/env node
/* ⚡ (30/10, §4oa, propuesta 90; dueño: «ok todo») LA COPIA ACHICADA DE pedidos.html PARA PUBLICAR.
   pedidos.html pesa ~4,3 MB (la mitad son comentarios y espacios, que en el repo hacen falta). Este script arma una copia SOLO para
   GitHub Pages sin comentarios ni espacios de más en el JavaScript y el CSS de adentro de la página: ~2,9 MB (0,85 MB comprimida en
   vez de 1,36). No cambia nombres ni lógica: esbuild con `minifyWhitespace` y nada más (ni `minifySyntax` ni `minifyIdentifiers`).
   Si CUALQUIER cosa sale mal (esbuild no está, un bloque no se entiende, el resultado no compila o cambió la cantidad de bloques),
   escribe el archivo ORIGINAL tal cual y lo dice: nunca se publica una copia rota. El repo NUNCA guarda la copia achicada.
   Uso:  node herramientas/achicar_panel.js <entrada.html> <salida.html>
         ESBUILD_PATH=<carpeta del paquete esbuild o esbuild-wasm> (si no, require('esbuild'))
   Lo usa .github/workflows/publicar-pages.yml. Prueba: tests/test_achicar.js. */
'use strict';
const fs = require('fs'), vm = require('vm'), zlib = require('zlib');

/* Comentarios del HTML y bloques <script>/<style>, en el orden del archivo. Un comentario se reconoce primero, así un
   «<script>» dentro de un comentario no se toma por un bloque. */
const RE = /<!--[\s\S]*?-->|<(script|style)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi;

function esJs(attrs) {
  if (/\bsrc\s*=/i.test(attrs)) return false;
  const t = (attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)/i) || [])[1];
  return !t || /^(text|application)\/(java|ecma)script$/i.test(t);
}
function cuantos(html) {
  const n = { script: 0, style: 0 }; let m; RE.lastIndex = 0;
  while ((m = RE.exec(html))) if (m[1]) n[m[1].toLowerCase()]++;
  return n;
}

async function achicar(html, esb) {
  const partes = [], info = { js: 0, css: 0, js0: 0, js1: 0, css0: 0, css1: 0 };
  let ult = 0, m; RE.lastIndex = 0;
  while ((m = RE.exec(html))) {
    partes.push(html.slice(ult, m.index)); ult = RE.lastIndex;
    if (!m[1]) { partes.push(m[0]); continue; }             // los comentarios del HTML quedan: son pocos y no vale el riesgo
    const tag = m[1].toLowerCase(), attrs = m[2], cuerpo = m[3];
    if (tag === 'script' && esJs(attrs) && cuerpo.trim()) {
      const r = await esb.transform(cuerpo, { loader: 'js', minifyWhitespace: true, target: 'esnext', charset: 'utf8', legalComments: 'none' });
      const code = r.code.replace(/\n$/, '');
      if (/<\/script/i.test(code)) throw new Error('el JavaScript achicado tiene «</script»');
      if (/<!--/.test(code) && !/<!--/.test(cuerpo)) throw new Error('el JavaScript achicado tiene «<!--» y el original no');
      try { new vm.Script(code, { filename: 'script-' + (info.js + 1) }); } catch (e) { throw new Error('el bloque ' + (info.js + 1) + ' achicado no compila: ' + e.message); }
      info.js++; info.js0 += cuerpo.length; info.js1 += code.length;
      partes.push('<script' + attrs + '>' + code + '</script>');
    } else if (tag === 'style' && cuerpo.trim()) {
      const r = await esb.transform(cuerpo, { loader: 'css', minifyWhitespace: true, charset: 'utf8' });
      const code = r.code.replace(/\n$/, '');
      if (/<\/style/i.test(code)) throw new Error('el CSS achicado tiene «</style»');
      if (!code.trim()) throw new Error('un bloque de CSS quedó vacío');
      info.css++; info.css0 += cuerpo.length; info.css1 += code.length;
      partes.push('<style' + attrs + '>' + code + '</style>');
    } else partes.push(m[0]);
  }
  partes.push(html.slice(ult));
  const out = partes.join('');
  const a = cuantos(html), b = cuantos(out);
  if (a.script !== b.script || a.style !== b.style) throw new Error('cambió la cantidad de bloques: ' + JSON.stringify(a) + ' → ' + JSON.stringify(b));
  return { html: out, info };
}

async function main() {
  const [ent, sal] = process.argv.slice(2);
  if (!ent || !sal) { console.error('Uso: node herramientas/achicar_panel.js <entrada.html> <salida.html>'); process.exit(2); }
  const orig = fs.readFileSync(ent, 'utf8');
  let out = orig, motivo = '', info = null;
  try {
    const esb = require(process.env.ESBUILD_PATH || 'esbuild');
    const r = await achicar(orig, esb); out = r.html; info = r.info;
  } catch (e) { motivo = String((e && e.message) || e).split('\n')[0]; out = orig; }   // una línea: GitHub corta el aviso en el primer salto
  fs.writeFileSync(sal, out);
  const gz = s => zlib.gzipSync(Buffer.from(s)).length;
  const kb = n => (n / 1024).toFixed(0) + ' KB';
  if (motivo) console.log('::warning::No se achicó ' + ent + ' (se publica el original): ' + motivo);
  else console.log('Achicado ' + ent + ': ' + kb(orig.length) + ' → ' + kb(out.length) + ' · comprimido ' + kb(gz(orig)) + ' → ' + kb(gz(out)) +
    ' · ' + info.js + ' bloques de JavaScript, ' + info.css + ' de CSS');
}
if (require.main === module) main().then(() => process.exit(0), e => { console.error(e); process.exit(1); });
module.exports = { achicar, cuantos };
```

### `.github/workflows/publicar-pages.yml`

```yaml
# ⚡ (30/10, §4oa, propuesta 90; dueño: «ok todo») Publica GitHub Pages con pedidos.html ACHICADO: sin comentarios ni espacios de más en
# su JavaScript y su CSS (4,2 MB → 2,8 MB; comprimido 1,34 → 0,84 MB). El repo sigue con el original. Todo lo demás se publica igual
# que hasta hoy (la rama main entera). El script es herramientas/achicar_panel.js: si algo le sale mal, publica el original tal cual.
#
# ⚠️ SOLO PUBLICA si en Settings → Pages → «Build and deployment» → Source dice «GitHub Actions». Con «Deploy from a branch» (como hasta
#    hoy) este workflow mira, ve que no le toca y no hace nada: Pages sigue publicando la rama como siempre.
#    Volver atrás = Source → «Deploy from a branch» → main / (root) → Save. Nada más.
# ⚠️ Lo que los workflows del repo suben a main (el bot del dashboard, el reporte de ATC…) NO dispara un `push` (GitHub no encadena
#    los push hechos con su propio token): por eso este escucha a esos workflows cuando terminan. Un workflow NUEVO que suba algo a
#    main va en la lista de `workflow_run`, o lo que suba no se publica hasta el próximo push.
name: Publicar el panel (GitHub Pages, achicado)

on:
  push:
    branches: [main]
  workflow_run:
    workflows:
      - 'Generar Panel Heaven (Kommo → GitHub Pages)'
      - 'Reporte Semanal ATC'
      - 'Traer imágenes del asistente'
      - 'Leer adjuntos de Trello (ATC)'
      - 'Historial de las tarjetas de Trello (ATC)'
      - 'Regenerar Panel Mayo 2026 (Kommo)'
    types: [completed]
    branches: [main]
  workflow_dispatch:          # a mano: Actions → «Publicar el panel (GitHub Pages, achicado)» → Run workflow

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false   # una publicación en curso no se corta: la siguiente espera

jobs:
  ver:
    runs-on: ubuntu-latest
    outputs:
      modo: ${{ steps.p.outputs.modo }}
    steps:
      - id: p
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          m=$(gh api "repos/${{ github.repository }}/pages" --jq .build_type 2>/dev/null || echo desconocido)
          echo "Pages publica desde: $m («workflow» = este workflow; «legacy» = la rama, como siempre)"
          echo "modo=$m" >> "$GITHUB_OUTPUT"

  publicar:
    needs: ver
    if: needs.ver.outputs.modo == 'workflow'
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deploy.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
        with:
          ref: main           # siempre lo último de main (un workflow_run o un push viejo no publica una versión atrasada)
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Armar el sitio con pedidos.html achicado
        run: |
          set -e
          npm install --no-save --no-audit --no-fund --prefix "$RUNNER_TEMP/esb" esbuild@0.23.1 >/dev/null 2>&1 \
            || echo "::warning::No se pudo instalar esbuild: se publica pedidos.html sin achicar"
          SITIO="$RUNNER_TEMP/sitio"
          mkdir -p "$SITIO"
          rsync -a --exclude .git --exclude .github ./ "$SITIO/"
          ESBUILD_PATH="$RUNNER_TEMP/esb/node_modules/esbuild" node herramientas/achicar_panel.js pedidos.html "$SITIO/pedidos.html"
          grep -qE "PANEL_V=['\"]" "$SITIO/pedidos.html" || { echo "::error::al pedidos.html publicado le falta PANEL_V"; exit 1; }   # achicado lleva comillas dobles
          du -sh "$SITIO"
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ${{ runner.temp }}/sitio
      - id: deploy
        uses: actions/deploy-pages@v4
```
