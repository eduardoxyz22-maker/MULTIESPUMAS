/* 🔎 Prueba de Jarvis (revisión de la 2026-11-23-h, 23/11), tal cual la mandó; solo se cambió la raíz por defecto (la carpeta del proyecto). */
'use strict';
// Ejecutar con Node desde la raíz del proyecto, o indicar la carpeta como primer argumento.
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
  return vm.runInNewContext(texto.slice(0,fin)+'\n({S, D, U_CAR, VEND, kommoHeaven, servidor, ped, pasar})', {
    require(n) {assert(Object.hasOwn(modulos,n)); return modulos[n];},
    __dirname: path.dirname(fuente), process:{env:{}}, console
  }, {filename:fuente});
}
function caso(nombre, notasAntes, notaDespues, esperados) {
  const m = maqueta();
  const k = m.kommoHeaven({sinCharla:true});
  k.leads[71].created_by=m.U_CAR;
  function anotar(t) {
    k.notas.push({id:k.notas.length+1, entity_id:71, note_type:'common',
      params:{text:'Le mandé la cotización'}, created_at:t, updated_at:t, created_by:m.U_CAR});
  }
  notasAntes.forEach(delta=>anotar(m.S()+delta));
  const a=m.servidor(m.VEND,k);
  const venta=m.ped();
  assert(a.guardar(venta).ok && a.cola().length===1, 'El guardado debía encolar la venta');
  m.pasar(1); if(notaDespues) anotar(m.S());
  m.pasar(1); a.ctx.waRepaso();
  const recibidos=a.cx().length;
  console.log((esperados===recibidos?'✓':'✗')+' '+nombre+' · avisos simulados esperados '+esperados+', obtenidos '+recibidos);
  return recibidos===esperados;
}
const dia=86400;
const casos=[
  caso('Sin nota',[],false,0),
  caso('Nota un día antes de la venta',[-dia],false,1),
  caso('Única nota un minuto después de la venta',[],true,0),
  caso('Vigente al vender, vence mientras la venta espera en la cola',[-15*dia+60],false,1),
  caso('Una nota anterior y otra posterior',[-dia],true,1)
];
process.exitCode=casos.every(Boolean)?0:1;
