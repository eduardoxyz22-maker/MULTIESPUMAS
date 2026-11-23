'use strict';
// Uso: node prueba-nota-editada.cjs /ruta/al/proyecto
// Carga el servidor real y las maquetas de Kommo, Meta y Google de test_cruce_ventas.js.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');
const raiz = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const fuente = path.join(raiz,'tests','test_cruce_ventas.js');
const texto = fs.readFileSync(fuente,'utf8');
const fin = texto.indexOf("console.log('\\n── 1. Qué se encola");
assert(fin > 0, 'Cambió el punto de inicio de la batería');
const modulos = {fs, path, vm};
function maqueta() {
  return vm.runInNewContext(texto.slice(0,fin)+'\n({S, D, U_CAR, U_ISA, VEND, kommoHeaven, servidor, ped, pasar})', {
    require(n) {assert(Object.hasOwn(modulos,n)); return modulos[n];},
    __dirname: path.dirname(fuente), process:{env:{}}, console
  }, {filename:fuente});
}

function comprobar(nombre, textoAlVender, textoEditado, esperados) {
  const m = maqueta();
  const k = m.kommoHeaven({sinCharla:true, nota:textoAlVender});
  assert(m.U_ISA > 0 && m.U_ISA !== m.U_CAR);
  k.leads[71].created_by = m.U_ISA; // La persona que anota es distinta de quien creó el lead.
  const a = m.servidor(m.VEND, k);
  assert(a.guardar(m.ped()).ok);
  m.pasar(1);
  if (textoEditado) {
    k.notas[0].updated_at = m.S();
    k.notas[0].params.text = textoEditado;
  }
  m.pasar(1);
  a.ctx.waRepaso();
  const avisos = a.cx().length;
  console.log((esperados === avisos ? '✓ ' : '✗ ')+nombre, JSON.stringify({esperados, avisos}));
  return esperados === avisos;
}
const visita = 'El cliente pasará por Banzer a comprar';
const comun = 'No contesta, llamar mañana';
const resultados = [
  comprobar('Visita anterior, sin edición', visita, null, 1),
  comprobar('Nota común de otra persona, sin edición', comun, null, 0),
  comprobar('La visita solo apareció en una edición posterior a la venta', comun, visita, 0)
];
process.exitCode = resultados.every(Boolean) ? 0 : 1;
