/* El verificador de cruces (herramientas/verificar_cruce_ventas.js): las cuentas, sin red (23/11, revisión de Jarvis).
   1 cada pedido cuenta (dos compras del mismo cliente con la misma vendedora = dos ventas)
   2 una consulta fallida o incompleta es PENDIENTE: no entra en el porcentaje; sin ninguna verificada (o con más de la mitad pendiente) sale en rojo
   3 Heaven ↔ Sueña cuenta ventas, y aparte asesores */
'use strict';
const path = require('path');
const V = require(path.join(__dirname, '..', 'herramientas', 'verificar_cruce_ventas.js'));
let ok = 0, mal = 0;
const chk = (c, m) => { if (c) ok++; else { mal++; console.log('  ✗ ' + m); } };
const real = V.cargarPagina();
chk(typeof real.qaVeredicto === 'function' && real.VENDEDORES.length > 3, '0 carga qaVeredicto y VENDEDORES de pedidos.html');
const pg = { VENDEDORES: real.VENDEDORES, qaMismo: real.qaMismo, qaVeredicto: (r) => r.V };
const VEND = pg.VENDEDORES.filter((v) => !/eduardo|roho/i.test(v));
const SUENA = ['Juan Pablo Paredes', 'Fernando Peinado', 'Mauricio Merida'];
const marcaDe = (v) => SUENA.some((s) => pg.qaMismo(s, v)) ? 'suena' : 'heaven';
const T = 1795000000;
const ped = (id, v, cel, ts, oc) => ({ id, vendedor: v, celular: cel, ts: ts * 1000, oc: oc || '11-' + id });

/* 1 */
const P = [ped('a', 'Isabel Robledo', '70011111', T - 5000), ped('b', 'Isabel Robledo', '70011111', T - 1000), ped('b', 'Isabel Robledo', '70011111', T - 1000),
  ped('c', 'Eduardo Añez', '70022222', T - 900), ped('d', 'Isabel Robledo', '123', T - 900), ped('e', 'Isabel Robledo', '70033333', T - 900, 'ATC 11-001'),
  ped('__x__', 'Isabel Robledo', '70044444', T - 900)];
const L = V.ventasARevisar(P, pg, VEND, T - 86400, T);
chk(L.length === 2 && L[0].id === 'a' && L[1].id === 'b', '1a dos compras del mismo cliente con la misma vendedora son dos ventas (y el mismo id una vez): ' + L.map((p) => p.id));

/* 2 */
const otro = (n, marca) => ({ V: { k: 'otro', quien: [], otros: [{ n, marca }], inc: false } });
const tuyo = { V: { k: 'tuyo', quien: [], otros: [], inc: false } };
const ventas10 = Array.from({ length: 10 }, (_, i) => ped('p' + i, 'Isabel Robledo', '7005555' + i, T - 100 * (10 - i)));
let resp = [otro('Maria Flores', 'heaven'), tuyo, null, null, null, null, null, null, { ok: false }, { V: { k: 'nose', quien: [], otros: [], inc: true } }];
let R = V.resumir(ventas10, (p) => resp[Number(p.id.slice(1))], pg, marcaDe);
chk(R.total === 10 && R.verif === 2 && R.pend === 8 && R.otro === 1, '2a 10 ventas, 8 fallan: 1 cruce de 2 verificadas, 8 pendientes (' + [R.total, R.verif, R.pend, R.otro] + ')');
chk(V.salidaDe(R) === 1, '2b con más de la mitad pendiente sale en rojo');
R = V.resumir(ventas10, () => null, pg, marcaDe);
chk(R.verif === 0 && R.otro === 0 && V.salidaDe(R) === 1, '2c todas fallan: 0 verificadas y en ROJO (nunca «0 cruces» en verde)');
R = V.resumir(ventas10, (p) => (p.id === 'p0' ? otro('Maria Flores', 'heaven') : tuyo), pg, marcaDe);
chk(R.verif === 10 && R.pend === 0 && V.salidaDe(R) === 0, '2d todo verificado: en verde');
R = V.resumir(ventas10.slice(0, 3), (p) => ({ p0: { V: { k: 'otro', quien: [], otros: [{ n: 'Maria Flores', marca: 'heaven' }], inc: true } }, p1: { V: { k: 'tuyo', quien: [], otros: [], inc: true } }, p2: tuyo })[p.id], pg, marcaDe);
chk(R.otro === 1 && R.verif === 2 && R.pend === 1 && R.k.incompleto === 1, '2e un cruce visto con datos incompletos cuenta; «tuyo» incompleto queda pendiente');
R = V.resumir(ventas10.slice(0, 2), (p) => (p.id === 'p0' ? null : tuyo), pg, marcaDe);
chk(R.pendPorMarca.heaven === 1 && !R.pendPorMarca.suena, '2f los pendientes se separan por marca de quien vendió');

/* 3 */
const dos = { V: { k: 'otro', quien: [], otros: [{ n: 'Fernando Peinado', marca: 'suena' }, { n: 'Mauricio Merida', marca: 'suena' }], inc: false } };
R = V.resumir(ventas10.slice(0, 2), (p) => (p.id === 'p0' ? dos : otro('Maria Flores', 'heaven')), pg, marcaDe);
chk(R.otraMarcaVentas === 1 && R.otraMarcaAsesores === 2 && R.otro === 2, '3a una venta con dos asesores de Sueña = 1 venta y 2 asesores (' + [R.otraMarcaVentas, R.otraMarcaAsesores] + ')');

/* 4: el mismo nombre con o sin tilde es UNA vendedora */
R = V.resumir([ped('m1', 'Maria Flores', '70066661', T - 9), ped('m2', 'María Flores', '70066662', T - 8)], () => tuyo, pg, marcaDe);
chk(Object.keys(R.porVend).length === 1 && R.porVend[Object.keys(R.porVend)[0]].ventas === 2, '4a «María Flores» y «Maria Flores» van en la misma fila: ' + Object.keys(R.porVend));

console.log('test_verificar_cruce: ' + ok + ' bien, ' + mal + ' mal');
process.exit(mal ? 1 : 0);
