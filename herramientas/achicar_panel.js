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
