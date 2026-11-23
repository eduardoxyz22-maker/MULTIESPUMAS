'use strict';
// node 23h3-cache.cjs /ruta/a/MULTIESPUMAS
// Usa los servicios simulados del proyecto y el sello real de la cola de ventas.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const raiz = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const archivo = path.join(raiz, 'tests', 'test_cruce_ventas.js');
const texto = fs.readFileSync(archivo, 'utf8');
const corte = texto.indexOf("console.log('\\n── 1. Qué se encola");
assert(corte > 0, 'No se encontró el inicio de las pruebas del proyecto');
const modulos = { fs, path, vm };
function nuevo() {
  const m = vm.runInNewContext(texto.slice(0, corte) + '\n({RELOJ,S,U_CAR,U_ISA,VEND,kommoHeaven,servidor,ped})', {
    require(n) { assert(Object.hasOwn(modulos,n)); return modulos[n]; },
    __dirname:path.dirname(archivo), process:{env:{}}, console
  }, {filename:archivo});
  const k = m.kommoHeaven({sinCharla:true});
  k.leads[71].created_by = m.U_ISA;
  const a = m.servidor(m.VEND,k);
  const t0 = m.RELOJ.ms;
  const reloj = ms => { m.RELOJ.ms=t0+ms; };
  const visita = () => k.notas.push({id:87, entity_id:71, note_type:'common', created_by:m.U_CAR,
    params:{text:'La clienta pasará por Banzer a comprar'}, created_at:m.S(), updated_at:m.S()});
  const consulta = () => {
    const r=a.post({action:'quienAtiende',auto:1,solo:'heaven',cel:'70011122',quien:'Isabel Robledo'});
    assert(r.ok && !r.incompleto, 'La consulta del formulario debe completarse');
    return r;
  };
  const guardado = () => {
    const p=m.ped();
    assert(a.guardar(p).ok && a.cola()[0].ms === m.RELOJ.ms, 'La venta debe conservar su sello en ms');
  };
  const resultado = () => {
    reloj(62500);
    const leidas=a.kommo.length;
    a.ctx.waRepaso();
    assert.equal(a.cola().length,0);
    return {avisos:a.cx().length, lecturasEnRepaso:a.kommo.length-leidas};
  };
  return {m,a,reloj,visita,consulta,guardado,resultado};
}
function notaAntes(consultar) {
  const s=nuevo();
  s.reloj(100);
  if (consultar) s.consulta();
  s.reloj(400); s.visita();
  s.reloj(800); s.guardado();
  return s.resultado();
}
function respuestaTardia(consultar) {
  const s=nuevo();
  s.reloj(100); s.guardado();
  s.reloj(800);
  if (consultar) {
    // Una segunda instancia del panel pregunta en el mismo segundo. Cuando llega
    // la respuesta de notas, Kommo ya incorporó la visita escrita 3 s más tarde.
    const obtener=s.a.ctx.UrlFetchApp.fetch;
    let llego=false;
    s.a.ctx.UrlFetchApp.fetch=(url,op) => {
      if (!llego && url.includes('/leads/notes?')) { s.reloj(3200); s.visita(); llego=true; }
      return obtener(url,op);
    };
    const r=s.consulta();
    s.a.ctx.UrlFetchApp.fetch=obtener;
    assert(llego);
    assert(r.cuentas[0].leads.some(l => l.nota && l.nota.ts>r.ahora), 'La respuesta de notas debe ser posterior al inicio');
  } else { s.reloj(3200); s.visita(); }
  return s.resultado();
}
const casos=[
  ['Nota antes de vender, sin consulta previa', notaAntes, false, 1],
  ['Nota antes de vender, consulta previa en el mismo segundo', notaAntes, true, 1],
  ['Nota 3 s posterior, sin consulta del formulario', respuestaTardia, false, 0],
  ['Nota 3 s posterior, consulta que arranca en el segundo de la venta y la recibe después', respuestaTardia, true, 0]
];
let errores=0;
for (const [nombre, caso, consulta, avisosEsperados] of casos) {
  const r=caso(consulta), bien=r.avisos===avisosEsperados;
  console.log((bien?'✓ ':'✗ ')+nombre+' '+JSON.stringify({...r, avisosEsperados}));
  if (!bien) errores++;
}
process.exitCode=errores?1:0;
