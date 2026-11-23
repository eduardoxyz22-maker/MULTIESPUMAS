'use strict';
// Uso: node 23h3-hist.cjs /ruta/al/proyecto
// Usa el servidor y las maquetas locales del proyecto. Sin credenciales ni servicios externos.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const raiz = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const archivo = path.join(raiz, 'tests', 'test_cruce_ventas.js');
const fuente = fs.readFileSync(archivo, 'utf8');
const comienzo = fuente.indexOf("console.log('\\n── 1. Qué se encola");
assert(comienzo > 0, 'Cambió la maqueta de test_cruce_ventas');
const modulos = { fs, path, vm };

function maqueta() {
  return vm.runInNewContext(fuente.slice(0, comienzo) + '\n({S, D, U_CAR, U_ISA, VEND, kommoHeaven, servidor, ped, pasar})', {
    require(n) { assert(Object.hasOwn(modulos, n)); return modulos[n]; },
    __dirname: path.dirname(archivo), process: {env: {}}, console
  }, { filename: archivo });
}

let correctas = 0, fallos = 0;
function prueba(nombre, o, esperado) {
  const m = maqueta();
  const k = m.kommoHeaven({ sinCharla: !o.charla, nota: o.antes });
  k.leads[71].created_by = o.esCreadora ? m.U_CAR : m.U_ISA;
  if (o.futuro) {
    k.leads[71].created_at = m.S() + 5;
    k.notas[0].created_at = m.S() + 6; k.notas[0].updated_at = m.S() + 6;
  }
  const s = m.servidor(m.VEND, k);
  const corte = m.S();
  const venta = m.ped();
  assert(s.guardar(venta).ok && s.cola().length === 1);
  m.pasar(1);
  if (o.despues) {
    k.notas[0].updated_at = m.S();
    k.notas[0].params.text = o.despues;
  }
  m.pasar(1);
  const h = s.ctx.qaConsulta_('70011122', '', '', corte, 'heaven', true);
  const cuenta = h.cuentas[0], ficha = cuenta.leads.find(l => String(l.id) === '71');
  s.ctx.waRepaso();
  const atencion = {
    creoNota: Boolean(ficha && ficha.creoNota), visita: Boolean(ficha && ficha.nota),
    avisos: s.cx().length, dudas: cuenta.notasDudosas || 0, leads: cuenta.leads.length
  };
  const ok = Object.entries(esperado).every(([k, v]) => atencion[k] === v);
  if (ok) correctas++; else fallos++;
  console.log((ok ? '✓ ' : '✗ ') + nombre, JSON.stringify({esperado, observado:atencion}));
}

const neutral = 'Le dejé el mensaje, espera hablar el lunes';
const editada = 'Le dejé el mensaje, espera hablar el martes';
const visita = 'Pasará por Banzer a comprar';
const automatica = '🧾 Venta registrada desde el panel de pedidos';
prueba('Nota manual de seguimiento de la creadora, intacta', {antes:neutral, esCreadora:true}, {creoNota:true, visita:false, avisos:1});
prueba('La creadora corrige lunes por martes después de guardar: ya había anotado', {antes:neutral, despues:editada, esCreadora:true}, {creoNota:true, visita:false, avisos:1});
prueba('La creadora cambia su nota a visita después: el aviso corresponde por autoría, sin atribuirle visita', {antes:neutral, despues:visita, esCreadora:true}, {creoNota:true, visita:false, avisos:1});
prueba('Otra persona agrega una visita después: solo ese texto no alcanza', {antes:neutral, despues:visita}, {creoNota:false, visita:false, avisos:0});
prueba('Otra persona edita una nota y también hay una conversación válida anterior', {antes:neutral, despues:visita, charla:true}, {visita:false, avisos:1});
prueba('Nota automática del panel con id de la creadora, intacta', {antes:automatica, esCreadora:true}, {creoNota:false, visita:false, avisos:0});
prueba('Nota automática del panel con id de la creadora, sigue siendo automática tras editarse', {antes:automatica, despues:automatica+' (actualizada)', esCreadora:true}, {creoNota:false, visita:false, avisos:0});
prueba('Lead y nota creados después de guardar: sin ficha ni aviso', {antes:neutral, esCreadora:true, futuro:true}, {leads:0, avisos:0});

console.log(correctas + ' bien · ' + fallos + ' mal');
process.exitCode = fallos ? 1 : 0;
