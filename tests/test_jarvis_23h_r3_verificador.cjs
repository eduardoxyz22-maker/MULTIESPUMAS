'use strict';
// Uso: node 23h3-verificador.cjs /ruta/al/proyecto
// Usa el transporte ficticio de la suite. No necesita red ni credenciales.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const assert = require('node:assert/strict');

const raiz = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const archivo = path.join(raiz, 'tests', 'test_verificar_cruce.js');
const fuente = fs.readFileSync(archivo, 'utf8');
const inicio = fuente.indexOf("chk(typeof gs.quienAtiende_");
assert(inicio > 0, 'No se encontró la maqueta del verificador');
for (const k of ['KOMMO_TOKEN','KOMMO_TOKEN_SUENA','PANEL_URL','PANEL_KEY']) delete process.env[k];
const maqueta = vm.runInNewContext(fuente.slice(0, inicio) + `
  ({ escenario(cantidad, posteriores, hayVigente) {
    nuevo();
    const p = venta('p-ejemplo', 'Isabel Robledo', '70010001');
    const { lid } = cliente('heaven', p.celular, 12);
    for (let i = 0; i < cantidad; i++) {
      K.heaven.tasks.push({entity_type:'leads', entity_id:lid, complete_till:posteriores ? T+2*D : T-D, created_by:12,
         responsible_user_id:12, created_at:posteriores ? T+1 : T-7*D, is_completed:false});
    }
    if (hayVigente) tarea('heaven', lid, 12, T-D);
    const R = V.resumir([p], evaluar, pg, marcaDe, gs.cruceOtros_);
    const paginas = LLAMADAS.map(u=>new URL(u)).filter(u=>u.pathname.endsWith('/tasks') &&
      u.searchParams.get('filter[entity_type]')==='leads').map(u=>Number(u.searchParams.get('page')||1));
    return { paginas, si:R.wa.si, no:R.wa.no, pendiente:R.wa.pend,
             evidenciaParcial:R.wa.parcial, cobertura:R.cob.heaven };
  } })`, {require:createRequire(archivo), __dirname:path.dirname(archivo), URL, console},
  {filename:archivo});

let fallos = 0;
function caso(titulo, cantidad, posteriores, vigente, evaluar) {
  const r = maqueta.escenario(cantidad, posteriores, vigente);
  const ok = evaluar(r);
  if (!ok) fallos++;
  console.log((ok ? '✓ ' : '✗ ') + titulo + ' ' + JSON.stringify(r));
}
caso('Control, una única tarea vigente', 0, false, true,
  r=>r.si===1 && r.evidenciaParcial===0 && r.paginas.join(',')==='1');
caso('250 vencidas y sin página siguiente, negativo verificable', 250, false, false,
  r=>r.no===1 && r.pendiente===0 && r.paginas.join(',')==='1');
caso('Dos páginas completas leídas, positivo con cobertura completa', 250, false, true,
  r=>r.si===1 && r.evidenciaParcial===0 && r.paginas.join(',')==='1,2');
caso('La primera página solo tiene tareas posteriores. La segunda sí prueba el cruce', 250, true, true,
  r=>r.si===1 && r.evidenciaParcial===0 && r.paginas.join(',')==='1,2');
caso('Control, más de cuatro páginas y ninguna prueba en las primeras cuatro', 1001, false, false,
  r=>r.pendiente===1 && r.paginas.join(',')==='1,2,3,4');
process.exitCode = fallos ? 1 : 0;
