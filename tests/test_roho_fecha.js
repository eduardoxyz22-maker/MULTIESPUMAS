/* 📅 IMPORTAR ROHO PARA EL DÍA QUE DECIDE LOGÍSTICA (20/11; dueño: «ese botón debería dejar cargar para un día que decida logística, no
   importa si está lleno; que puedan igual y muestre 29/15 si hace falta»).

   LO QUE CUIDA (página de verdad, datos INVENTADOS, reloj clavado en el viernes 20/11/2026 10:00 de Bolivia):
   1. Sin elegir día, cada pedido va a la fecha de su nota (como siempre).
   2. Eligiendo un día, TODOS van a ese día (también una nota de fecha pasada).
   3. Con el turno lleno, la vista previa dice cuántos quedarían contra el cupo («14/12») y que se cargan igual.
   4. Al crear, lo que cae en un turno lleno va forzado (`forzar:true`); lo que entra, sin forzar.
   5. Un día pasado no se puede elegir.
   6. Un domingo o un feriado no se puede elegir, y una nota que cae en domingo, feriado o la tarde del sábado NO se fuerza.
   7. La clave se pide si alguno VA a quedar forzado (cuenta los que entran), no solo si hoy ya está lleno.
   Se corre:  node tests/test_roho_fecha.js */
const { chromium } = require('playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 400)) : ''); };

(async () => {
  const b = await chromium.launch(), pg = await b.newPage();
  await pg.route(/^https:\/\//, r => r.abort());
  pg.on('dialog', d => d.accept());
  await pg.clock.setFixedTime(new Date('2026-11-20T10:00:00-04:00'));
  await pg.goto('file://' + PEDIDOS);
  await pg.waitForFunction(() => typeof confirmarImportRoho === 'function');
  const r = await pg.evaluate(async () => {
    var espera = (ms) => new Promise(x => setTimeout(x, ms));
    var DIA = '2026-11-25';   // miércoles: AM 12
    STATE = [];
    for (var i = 0; i < 11; i++) STATE.push({ id:'ya' + i, oc:'11-5' + (10 + i), fecha:DIA, turno:'AM', vendedor:'Isabel Robledo', cliente:'C' + i, productos:[{ desc:'X', cant:1 }], rev:1 });
    var pr = function (n, f) { return { oc:'R' + n, fecha:f, cliente:'CLIENTE INVENTADO ' + n, celular:'70000000', zona:'Norte', direccion:'Calle 1', maps:'', productos:[{ desc:'COLCHON', cant:1 }], obs:'', combos:0, pagado:false, nit:'' }; };
    ROHO_IMP = { filas:3, nuevos:[pr(1, '2026-11-23'), pr(2, '2026-11-24'), pr(3, '2026-11-26')], viejos:[pr(4, '2026-11-18')], yaEstan:[], sinFecha:[], malos:[] };
    ROHO_TURNO = 'AM'; ROHO_VIEJOS = false; ROHO_FECHA = ''; ROHO_CREANDO = false;
    var out = {};
    out.sinDia = rohoElegidos().map(p => p.fecha);
    renderImportRoho(); await espera(50);
    out.campo = !!document.getElementById('roho-fecha');
    rohoSetFecha('2026-11-19'); out.pasado = ROHO_FECHA;
    rohoSetFecha(DIA); await espera(50);
    out.conDia = rohoElegidos().map(p => p.fecha);
    out.texto = (document.getElementById('modal-box') || {}).textContent || '';
    CONNECTED = true; SERVER_AUTH = '';
    var llamadas = [];
    window.apiSave = function (rec, opts) { llamadas.push({ oc:rec.oc, fecha:rec.fecha, forzar:!!(opts && opts.forzar) }); return Promise.resolve({ ok:true, pedido:rec }); };
    window.ubicarImportadosRoho = function () {};
    confirmarImportRoho(); await espera(400);
    out.llamadas = llamadas;
    rohoSetFecha('2026-11-22'); out.domingo = ROHO_FECHA;
    rohoSetFecha('2026-12-25'); out.feriado = ROHO_FECHA;
    out.noForzar = [rohoForzar('2026-11-22','AM'), rohoForzar('2026-12-25','AM'), rohoForzar('2026-11-28','PM'), rohoForzar(DIA,'AM')];
    ROHO_FECHA = ''; ROHO_TURNO = 'AM';
    var dos = [pr(7, '2026-11-26'), pr(8, '2026-11-26')];
    STATE = []; for (var j = 0; j < 11; j++) STATE.push({ id:'b' + j, oc:'11-6' + (10 + j), fecha:'2026-11-26', turno:'AM', vendedor:'Isabel Robledo', cliente:'D' + j, productos:[{ desc:'X', cant:1 }], rev:1 });
    out.prev = [rohoHayQueForzar(dos), rohoHayQueForzar([dos[0]]), rohoHayQueForzar([pr(9, '2026-11-22')])];
    ROHO_IMP = { filas:1, nuevos:[pr(9, '2026-11-22')], viejos:[], yaEstan:[], sinFecha:[], malos:[] };
    renderImportRoho(); await espera(50);
    out.textoDom = (document.getElementById('modal-box') || {}).textContent || '';
    return out;
  });
  chk('1. sin elegir día, cada pedido va a la fecha de su nota (las pasadas no)', JSON.stringify(r.sinDia) === JSON.stringify(['2026-11-23', '2026-11-24', '2026-11-26']), r.sinDia);
  chk('5. el campo del día está y un día pasado no se acepta', r.campo && r.pasado === '', r);
  chk('⚠️ 2. eligiendo un día, TODOS van a ese día (también la nota de fecha pasada)', r.conDia.length === 4 && r.conDia.every(f => f === '2026-11-25'), r.conDia);
  chk('⚠️ 3. con el turno lleno dice «quedarían 15/12» y que se cargan igual', /quedarían 15\/12/.test(r.texto) && /se cargan igual/.test(r.texto) && /aunque el turno esté lleno/.test(r.texto), r.texto.match(/quedarían[^·]*/));
  const L = r.llamadas;
  chk('⚠️ 4. el primero entra (11 → 12 de 12) sin forzar; los otros tres van forzados al mismo día', L.length === 4 && L.every(x => x.fecha === '2026-11-25') && !L[0].forzar && L.slice(1).every(x => x.forzar), L);
  chk('⚠️ 6. un domingo o un feriado no se pueden elegir', r.domingo === '' && r.feriado === '', [r.domingo, r.feriado]);
  chk('⚠️ 6. domingo, feriado y la tarde del sábado NUNCA van forzados; un día hábil lleno sí', JSON.stringify(r.noForzar) === '[false,false,false,true]', r.noForzar);
  chk('⚠️ 7. con 11/12, dos pedidos piden la clave (el 2º queda forzado) y uno no', JSON.stringify(r.prev) === '[true,false,false]', r.prev);
  chk('6. la vista previa dice que en domingo no se cargan', /no se cargan/.test(r.textoDom) && !/se cargan igual/.test(r.textoDom), r.textoDom.match(/22\/11[^·]*·[^·]*/));
  await b.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal'); process.exit(FAIL ? 1 : 0);
})();
