'use strict';
// Uso: node prueba-cache-al-guardar.cjs /ruta/al/proyecto
// Reloj y servicios simulados del proyecto. Ninguna llamada a servicios reales.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const raiz = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const archivo = path.join(raiz, 'tests/test_cruce_ventas.js');
const fuente = fs.readFileSync(archivo, 'utf8');
const corte = fuente.indexOf("console.log('\\n── 1. Qué se encola");
assert(corte > 0);
const modulos = {fs, path, vm};
function maqueta() {
  return vm.runInNewContext(fuente.slice(0, corte) + '\n({RELOJ,S,D,U_CAR,VEND,kommoHeaven,servidor,ped})', {
    require(n) { assert(Object.hasOwn(modulos, n)); return modulos[n]; },
    __dirname: path.dirname(archivo), process:{env:{}}, console
  }, {filename:archivo});
}
function caso(nombre, momentoNota, consultaAntes, demora, esperados) {
  const m = maqueta();
  const k = m.kommoHeaven({sinCharla:true});
  k.leads[71].created_by = m.U_CAR;
  const a = m.servidor(m.VEND, k);
  const base = m.S();
  const reloj = seg => { m.RELOJ.ms = (base + seg) * 1000; };
  function nota(seg) {
    k.notas.push({id:87, entity_id:71, note_type:'common', created_by:m.U_CAR,
      params:{text:'Le mandé la cotización'}, created_at:base + seg, updated_at:base + seg});
  }
  // El doble upstream no caduca claves. Aquí cada put usa su TTL real.
  const cache = a.ctx.CacheService.getScriptCache(), caduca = new Map();
  const get = cache.get.bind(cache), put = cache.put.bind(cache);
  cache.put = (key, valor, ttl) => { caduca.set(key, m.S() + (ttl || 600)); return put(key,valor,ttl); };
  cache.get = key => caduca.has(key) && m.S() >= caduca.get(key) ? null : get(key);
  if (momentoNota <= 0) nota(momentoNota);
  if (consultaAntes) {
    const r = a.post({action:'quienAtiende',auto:1,solo:'heaven',cel:'70011122',quien:'Isabel Robledo'});
    assert(r.ok && !r.incompleto, 'Necesita una consulta completa');
  }
  if (momentoNota > 0 && momentoNota <= 10) { reloj(momentoNota); nota(momentoNota); }
  reloj(10);
  const venta = m.ped();
  assert(a.guardar(venta).ok && a.cola()[0].ms === m.RELOJ.ms, 'Necesita una venta encolada');
  if (momentoNota > 10) { reloj(momentoNota); nota(momentoNota); }
  reloj(10 + demora);
  const previo = a.kommo.length;
  a.ctx.waRepaso();
  assert.equal(a.cola().length,0,'La venta ya debió procesarse');
  const real = a.cx().length;
  const datos = { ttl:a.ctx.QA_CACHE_SEG, edadAlRepaso:10+demora, llamadasKommo:a.kommo.length-previo, esperados, real };
  console.log((real===esperados?'✓ ':'✗ ')+nombre+' '+JSON.stringify(datos));
  return real === esperados;
}
const dias15=15*86400;
const resultados=[
  caso('Control sin consulta previa: nota 5 s antes de vender',5,false,61,1),
  caso('Consulta 10 s antes: la nota entra 5 s antes de vender',5,true,61,1),
  caso('Control sin consulta previa: nota vencida 5 s antes de vender',-dias15+5,false,61,0),
  caso('Consulta 10 s antes: la nota vence 5 s antes de vender',-dias15+5,true,61,0),
  caso('Caché ya vencida: se encuentra la nota escrita antes de vender',5,true,95,1),
  caso('Caché ya vencida: se excluye la nota caducada antes de vender',-dias15+5,true,95,0),
  caso('La nota escrita después de vender queda fuera',15,true,95,0)
];
process.exitCode = resultados.every(Boolean) ? 0 : 1;
