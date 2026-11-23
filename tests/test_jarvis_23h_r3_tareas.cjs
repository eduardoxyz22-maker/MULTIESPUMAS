'use strict';

// node 23h3-tareas.cjs /ruta/a/MULTIESPUMAS
// Ejecuta el servidor y el veredicto de la página con los dobles del proyecto.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const test = path.join(root, 'tests/test_cruce_ventas.js');
const code = fs.readFileSync(test, 'utf8');
const end = code.indexOf("console.log('\\n── 1. Qué se encola");
assert(end > 0, 'Cambió la maqueta del proyecto');
const mods = {fs, path, vm};
function preparar() {
  return vm.runInNewContext(code.slice(0, end) + '\n({S,D,VEND,U_CAR,U_ISA,ped,kommoHeaven,servidor,pasar})', {
    console, Date, __dirname: path.dirname(test),
    process: {env: {GS: path.join(root, 'google-apps-script.gs')}},
    require(n) { assert(Object.hasOwn(mods, n)); return mods[n]; }
  });
}
const ver = fs.readFileSync(path.join(root, 'herramientas/verificar_cruce_ventas.js'), 'utf8');
const start = ver.indexOf('function cargarPagina()'), stop = ver.indexOf('return ctx;\n}', start);
assert(start >= 0 && stop > start);
const page = vm.runInNewContext(ver.slice(start, stop + 'return ctx;\n}'.length) + '\ncargarPagina()', {
  fs, vm, PEDIDOS: path.join(root, 'pedidos.html')
});
let total = 0, fallos = 0;
function check(label, ok, info) {
  total++; if (!ok) fallos++;
  console.log((ok ? '✓' : '✗') + ' ' + label, JSON.stringify(info));
}
function conTareas(m, k, lista, entidad = 'leads') {
  const s = m.servidor(m.VEND, k), leer = s.ctx.UrlFetchApp.fetch, pags = [];
  s.ctx.UrlFetchApp.fetch = (url, op) => {
    const u = new URL(url);
    const tipo = u.searchParams.get('filter[entity_type]');
    if (!u.pathname.endsWith('/tasks') || u.hostname.includes('gerencia') || tipo !== entidad) return leer(url, op);
    const ids = u.searchParams.getAll('filter[entity_id][]'), lim = Number(u.searchParams.get('limit')), p = Number(u.searchParams.get('page') || 1);
    const aplican = lista.filter(t => ids.includes(String(t.entity_id)));
    const trozo = aplican.slice((p-1)*lim,p*lim);
    pags.push(p);
    u.searchParams.set('page', p+1);
    const o = {_embedded: {tasks: trozo}, _links: p*lim < aplican.length ? {next: {href: u.href}} : {}};
    return {getResponseCode: () => trozo.length ? 200 : 204, getContentText: () => trozo.length ? JSON.stringify(o) : ''};
  };
  return {s,pags};
}
function tarea(m, id, dias, entidad = 'leads') {
  return {id, entity_type: entidad, entity_id: entidad === 'leads' ? 71 : 61, is_completed: false,
    created_by: m.U_CAR, responsible_user_id: m.U_CAR,
    created_at: m.S()-m.D*5, updated_at: m.S()-m.D*3, complete_till: m.S()+dias*m.D};
}
function paginacion(etiqueta, cantidad, futura, entidad, esperadas, estado, resumen) {
  const m = preparar(), k = m.kommoHeaven({sinCharla: true});
  const lista = Array.from({length: cantidad}, (_,i) => tarea(m, i+1, i+1 === futura ? 1 : -1, entidad));
  const {s,pags} = conTareas(m,k,lista,entidad);
  const r = s.post({action:'quienAtiende',cel:'70011122',quien:'Isabel Robledo',auto:1,solo:'heaven'});
  assert(r.ok && r.cuentas[0].marca === 'heaven');
  const v = page.qaVeredicto(r, 'Isabel Robledo'), txt = s.ctx.qaResumenDe_(r,null,m.S());
  check(etiqueta, JSON.stringify(pags) === JSON.stringify(esperadas) && v.k === estado && txt === resumen && r.incompleto === (estado === 'nose'), {pags, k:v.k, resumen:txt, incompleto:r.incompleto});
}
paginacion('2.000 vencidas, el cartel y el registro reconocen el corte',2000,0,'leads',[1,2,3,4],'nose','No se pudo consultar todo en Kommo');
paginacion('1.000 vencidas exactas, todas vistas',1000,0,'leads',[1,2,3,4],'libre','Libre');
paginacion('Tarea válida en la última fila de la cuarta página de contactos',1000,1000,'contacts',[1,2,3,4],'otro','Atiende: Carola Chavez');

function cruce(etiqueta, inicial, reprogramar, asignar, esperado) {
  const m = preparar(), k = m.kommoHeaven({sinCharla: true}), t = tarea(m,1,inicial);
  if (asignar) t.responsible_user_id = m.U_ISA;
  const {s} = conTareas(m,k,[t]);
  const p = m.ped(), r = s.guardar(p);
  assert(r.ok && s.cola().length === 1);
  m.pasar(1);
  if (reprogramar) { t.complete_till = m.S() + m.D; t.updated_at = m.S(); }
  if (asignar) { t.responsible_user_id = m.U_CAR; t.updated_at = m.S(); }
  m.pasar(1);
  s.ctx.waRepaso();
  const avisadas = s.cx().map(x => x.template.components[0].parameters[0].text);
  check(etiqueta, avisadas.length === esperado, {avisadas, esperadas:esperado});
}
cruce('Fecha futura ya acordada con Carola cuando se vende', 1, false, false, 1);
cruce('Fecha vencida que nadie tocó', -1, false, false, 0);
cruce('Una tarea vencida que se reprograma DESPUÉS no acredita atención al vender', -1, true, false, 0);
cruce('La tarea de quien vendió, reasignada a Carola DESPUÉS, no acredita a Carola al vender', 1, false, true, 0);
console.log(total + ' comprobaciones, ' + (total - fallos) + ' correctas, ' + fallos + ' fallidas');
process.exitCode = fallos ? 1 : 0;
