/* 👤 LOGIN POR USUARIO EN EL SERVIDOR (27/11; dueño: «cada usuario de los vendedores debe tener su propio ingreso de login y clave y no
   pueden ver lo del otro»; «correo + contraseña del panel»; «solo números, sin clientes»; Administración, Eduardo, Contabilidad, logística y
   ROHO ven todo). Contra el .gs de verdad, con un Google de mentira. Datos INVENTADOS.
   Se corre:  node tests/test_login_servidor.js */
const fs = require('fs'), vm = require('vm'), path = require('path');
const GS = process.env.GS || path.resolve('google-apps-script.gs');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 400)) : ''); };
/* ── El servidor de mentira (el de test_factura_conflicto.js) ── */
function hacerPlanilla(filas) {
  const datos = filas.map(f => f.slice());
  return {
    _datos: datos,
    getLastRow: () => datos.length, getLastColumn: () => (datos[0] || []).length,
    getDataRange: () => ({ getValues: () => datos.map(f => f.slice()) }),
    setFrozenRows: () => {}, appendRow: (r) => { datos.push(r.slice()); }, deleteRow: (n) => { datos.splice(n - 1, 1); }, deleteRows: (n, k) => { datos.splice(n - 1, k); },
    getRange: (fila, col, nFilas, nCols) => ({
      getValue: () => (datos[fila - 1] || [])[col - 1],
      setValue: (v) => { if (!datos[fila - 1]) datos[fila - 1] = []; datos[fila - 1][col - 1] = v; },
      getValues: () => { const out = []; for (let i = 0; i < (nFilas || 1); i++) { const f = datos[fila - 1 + i] || [], r = []; for (let j = 0; j < (nCols || 1); j++) r.push(f[col - 1 + j]); out.push(r); } return out; },
      setValues: (v) => { for (let i = 0; i < v.length; i++) { const r = datos[fila - 1 + i] || (datos[fila - 1 + i] = []); for (let j = 0; j < v[i].length; j++) r[col - 1 + j] = v[i][j]; } },
      setFontWeight: () => {}, setNumberFormat: () => {}
    })
  };
}
function servidor(src) {
  const HDR = ['id', 'Fecha', 'N° OC', 'Vendedor', 'Cliente', 'Productos', 'Celular', 'Turno', 'Zona', 'Dirección', 'Link Maps', 'Pagado', 'Saldo (Bs)', 'ts',
    '_productos_json', 'Método pago', 'Observaciones', 'Estado stock', 'Entregado', 'Vehículo', 'Chofer', 'Garantía (a nombre de)', 'Nota de venta',
    'A cuenta (Bs)', 'Facturar a', 'NIT', 'N° del día', 'Verificado', 'Fotos entrega', 'Revisión'];
  const sh = hacerPlanilla([HDR]), shR = hacerPlanilla([]), props = {};
  const cache = { _m: {}, get(k) { return Object.prototype.hasOwnProperty.call(this._m, k) ? this._m[k] : null; }, put(k, v) { this._m[k] = String(v); }, putAll(o) { for (const k in o) this._m[k] = String(o[k]); }, remove(k) { delete this._m[k]; }, removeAll() {} };
  const ctx = {
    console, Date,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => n === 'Rechazos' ? shR : (n === 'Pedidos' ? sh : null), insertSheet: (n) => n === 'Rechazos' ? shR : hacerPlanilla([]) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] != null ? props[k] : null, setProperty: (k, v) => { props[k] = v; },
      deleteProperty: (k) => { delete props[k]; }, setProperties: (o) => { Object.assign(props, o); }, getProperties: () => Object.assign({}, props) }) },
    UrlFetchApp: { fetch: () => ({ getResponseCode: () => 404, getContentText: () => '{}' }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock() { return true; } }) },
    CacheService: { getScriptCache: () => cache },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ _t: t, setMimeType() { return this; } }) },
    DriveApp: { getFoldersByName: () => ({ hasNext: () => false }), createFolder: () => ({ getId: () => 'f' }), getFileById: () => { throw new Error('no'); } },
    Utilities: { formatDate: (d) => String(d), base64Decode: () => [], newBlob: () => ({}), DigestAlgorithm: { SHA_256: 'sha256' },
      computeDigest: (alg, txt) => Array.from(require('crypto').createHash('sha256').update(String(txt), 'utf8').digest()).map(b => b > 127 ? b - 256 : b),
      getUuid: () => require('crypto').randomUUID(), base64Encode: (b) => Buffer.from(b.map(x => (x + 256) % 256)).toString('base64') },
    Session: { getScriptTimeZone: () => 'America/La_Paz', getTemporaryActiveUserKey: () => 'ABCDEFGH' },
    ScriptApp: { newTrigger: () => ({ timeBased: () => ({ after: () => ({ create: () => ({}) }), everyMinutes: () => ({ create: () => ({}) }), everyDays: () => ({ atHour: () => ({ create: () => ({}) }) }) }) }),
      getProjectTriggers: () => [], deleteTrigger: () => {} }
  };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(src, ctx);
  const post = (bodyTxt) => ctx.doPost({ postData: { contents: bodyTxt }, parameter: {} })._t;
  const filas = () => sh._datos.slice(1).map(r => ctx.rowToRec_(r));
  const fila = (id) => filas().filter(r => String(r.id) === String(id))[0] || null;
  const guardar = (rec) => JSON.parse(post(JSON.stringify({ action: 'save', pedido: rec })));
  return { post, filas, fila, guardar, rechazos: () => shR._datos.slice(1), props, ctx, sh };
}


const S = servidor(fs.readFileSync(GS, 'utf8'));
const J = (o) => JSON.parse(S.post(JSON.stringify(o)));
S.props.ADMIN_KEY = 'adminclave10';
const ped = (id, v, cli, extra) => Object.assign({ id, fecha:'2026-12-02', oc:'12-' + id, vendedor:v, cliente:cli, celular:'7000000' + id.slice(-1), turno:'AM', direccion:'Calle ' + cli,
  productos:[{ codigo:'CH1', desc:'COLCHON X', medida:'140x190', cant:1, precio:2500 }], observaciones:'llamar antes', metodoPago:'Efectivo 500', acuenta:500, nit:'123456' }, extra || {});
[ped('p1', 'Isabel Robledo', 'CLIENTA UNO'), ped('p2', 'María Flores', 'CLIENTE DOS'), ped('p3', 'Isabel Robledo', 'CLIENTE TRES')].forEach(p => S.guardar(p));

/* 1. Sin login prendido, todo como antes */
let r = J({ action:'list' });
chk('1a · sin LOGIN_ACTIVO la lista sale entera y dice login:0', r.ok && r.pedidos.length === 3 && r.login === 0 && r.pedidos.every(p => p.cliente), r.pedidos && r.pedidos.map(p => p.cliente));

/* 2. Crear usuarios pide la clave de Administración */
r = J({ action:'usuarios', op:'crear', u:'isabel@x.com', n:'Isabel Robledo', r:'v' });
chk('2a · sin adminKey no crea', !r.ok && r.error === 'admin', r);
r = J({ action:'usuarios', op:'activar', adminKey:'adminclave10' });
chk('2b · no se prende sin ningún usuario que vea todo', !r.ok && r.error === 'sin_admin', r);
const cI = J({ action:'usuarios', op:'crear', u:'Isabel@X.com ', n:'Isabel Robledo', r:'v', adminKey:'adminclave10' });
const cM = J({ action:'usuarios', op:'crear', u:'maria@x.com', n:'Maria Flores', r:'v', adminKey:'adminclave10' });
const cA = J({ action:'usuarios', op:'crear', u:'admin', n:'Administración', r:'t', adminKey:'adminclave10' });
chk('2c · crea y devuelve la contraseña UNA vez (10 letras)', cI.ok && /^[a-z2-9]{10}$/.test(cI.clave) && cI.u === 'isabel@x.com' && cM.ok && cA.ok, { u:cI.u, n:cI.usuarios && cI.usuarios.length });
chk('2d · la propiedad guarda la huella, no la contraseña', S.props.USUARIOS.indexOf(cI.clave) < 0 && /"h":"[0-9a-f]{64}"/.test(S.props.USUARIOS), S.props.USUARIOS.slice(0, 120));
r = J({ action:'usuarios', op:'crear', u:'isabel@x.com', n:'Otra', adminKey:'adminclave10' });
chk('2e · el mismo usuario dos veces no', !r.ok && r.error === 'existe', r);

/* 3. Entrar */
r = J({ action:'login', u:'isabel@x.com', p:'mala' });
chk('3a · contraseña mala: login_mal (no dice si el usuario existe)', !r.ok && r.error === 'login_mal', r);
r = J({ action:'login', u:'nadie@x.com', p:'mala' });
chk('3b · usuario que no existe: el mismo login_mal', !r.ok && r.error === 'login_mal', r);
const sI = J({ action:'login', u:'ISABEL@x.com', p:cI.clave });
const sM = J({ action:'login', u:'maria@x.com', p:cM.clave });
const sA = J({ action:'login', u:'admin', p:cA.clave });
chk('3c · entra con la buena (sin mayúsculas en el usuario) y pide cambiarla la primera vez', sI.ok && sI.ses && sI.n === 'Isabel Robledo' && sI.r === 'v' && sI.cambiar === true, { ok:sI.ok, n:sI.n, r:sI.r, c:sI.cambiar });

/* 4. Prender el login */
r = J({ action:'usuarios', op:'activar', adminKey:'adminclave10' });
chk('4a · se prende con Administración', r.ok && r.activo === 1 && S.props.LOGIN_ACTIVO === '1', r);
r = J({ action:'list' });
chk('4b · sin sesión: login', !r.ok && r.error === 'login' && r.login === 1, r);
r = J({ action:'list', ses:'inventada' });
chk('4c · con una sesión inventada: login', !r.ok && r.error === 'login', r);
r = S.ctx.doGet({ parameter:{} }); r = JSON.parse(r._t);
chk('4d · la puerta GET queda cerrada', !r.ok && r.error === 'get_cerrado', r);

/* 5. Lo que ve cada una */
r = J({ action:'list', ses:sI.ses });
const p1 = r.pedidos.find(p => p.id === 'p1'), p2 = r.pedidos.find(p => p.id === 'p2');
chk('5a · Isabel ve lo suyo entero', p1 && p1.cliente === 'CLIENTA UNO' && p1.celular && p1.productos[0].precio === 2500 && !p1.oculto, p1);
chk('5b · de María: sin cliente, celular, dirección, NIT, pagos ni precios', p2 && p2.oculto === 1 && !p2.cliente && !p2.celular && !p2.direccion && !p2.nit && !p2.metodoPago && !p2.acuenta && !p2.observaciones && p2.productos[0].precio == null, p2);
chk('5c · …pero con día, turno, vendedora y productos (los cupos y el stock siguen andando)', p2 && p2.fecha === '2026-12-02' && p2.turno === 'AM' && p2.vendedor === 'María Flores' && p2.productos[0].codigo === 'CH1' && p2.productos[0].cant === 1, p2);
chk('5d · la misma cantidad de filas y los mismos sellos (la cuenta de control no cambia)', r.pedidos.length === 3 && r.n === 3, { n:r.n, l:r.pedidos.length });
chk('5e · dice quién es', r.yo && r.yo.n === 'Isabel Robledo' && r.yo.r === 'v', r.yo);
r = J({ action:'list', ses:sA.ses });
chk('5f · Administración ve todo', r.ok && r.pedidos.every(p => p.cliente && !p.oculto), r.pedidos.map(p => p.cliente));
r = J({ action:'list', adminKey:'adminclave10' });
chk('5g · las herramientas con la clave de Administración ven todo', r.ok && r.pedidos.every(p => p.cliente), r.ok);

/* 6. Escribir solo lo suyo */
r = J({ action:'save', ses:sI.ses, pedido:Object.assign(S.fila('p2'), { cliente:'PISADO' }) });
chk('6a · Isabel no guarda un pedido de María', !r.ok && r.error === 'ajeno' && S.fila('p2').cliente === 'CLIENTE DOS', r);
r = J({ action:'save', ses:sI.ses, pedido:ped('p9', 'María Flores', 'A NOMBRE DE OTRA') });
chk('6b · ni carga uno nuevo a nombre de otra', !r.ok && r.error === 'ajeno' && !S.fila('p9'), r);
r = J({ action:'save', ses:sI.ses, pedido:Object.assign(S.fila('p1'), { observaciones:'cambio mío' }) });
chk('6c · lo suyo sí', r.ok && S.fila('p1').observaciones === 'cambio mío', r.error);
r = J({ action:'delete', ses:sI.ses, id:'p2', rev:S.fila('p2').rev });
chk('6d · ni borra lo de María', !r.ok && r.error === 'ajeno' && !!S.fila('p2'), r);
r = J({ action:'save', ses:sI.ses, pedido:{ id:'__vistos__', fecha:'', vendedor:'', cliente:'x', productos:[] } });
chk('6e · las filas del sistema, como siempre', r.ok, r.error);
r = J({ action:'rechazos', ses:sI.ses });
chk('6f · lo de Administración (rechazos) no', !r.ok && r.error === 'permiso', r);

/* 7. Su contraseña */
r = J({ action:'miClave', ses:sI.ses, actual:'mala', nueva:'nuevaclave1' });
chk('7a · cambiar con la actual mala, no', !r.ok && r.error === 'login_mal', r);
r = J({ action:'miClave', ses:sI.ses, actual:cI.clave, nueva:'123' });
chk('7b · una muy corta, no', !r.ok && r.error === 'corta', r);
r = J({ action:'miClave', ses:sI.ses, actual:cI.clave, nueva:'nuevaclave1' });
const s2 = J({ action:'login', u:'isabel@x.com', p:'nuevaclave1' });
chk('7c · la cambia y entra con la nueva (ya no pide cambiarla)', r.ok && s2.ok && s2.cambiar === false, s2.error);

/* 8. Salir, frenar, borrar */
J({ action:'salir', ses:s2.ses });
r = J({ action:'list', ses:s2.ses });
chk('8a · después de salir esa sesión ya no sirve', !r.ok && r.error === 'login', r);
for (let i = 0; i < 5; i++) J({ action:'login', u:'maria@x.com', p:'mala' + i });
r = J({ action:'login', u:'maria@x.com', p:cM.clave });
chk('8b · 5 contraseñas malas seguidas la frenan (también con la buena)', !r.ok && r.error === 'login_frenado', r);
r = J({ action:'usuarios', op:'clave', u:'isabel@x.com', adminKey:'adminclave10' });
const viejaSes = J({ action:'list', ses:sI.ses });
chk('8c · Administración le genera otra contraseña y cierra sus sesiones', r.ok && /^[a-z2-9]{10}$/.test(r.clave) && !viejaSes.ok && viejaSes.error === 'login', viejaSes.error);
r = J({ action:'usuarios', op:'borrar', u:'maria@x.com', adminKey:'adminclave10' });
chk('8d · borrar un usuario', r.ok && !r.usuarios.some(x => x.u === 'maria@x.com'), r.usuarios);
r = J({ action:'usuarios', op:'apagar', adminKey:'adminclave10' });
const sinLogin = J({ action:'list' });
chk('8e · apagar: todo como antes', r.ok && r.activo === 0 && sinLogin.ok && sinLogin.pedidos.length === 4 && sinLogin.pedidos.filter(p => !/^__/.test(p.id)).every(p => p.cliente), [r.ok, r.activo, sinLogin.ok, sinLogin.error]);
chk('8f · ningún registro con contraseñas: «Rechazos» sin nada de esto', S.rechazos().length === 0 && !JSON.stringify(S.props).match(new RegExp(cI.clave + '|nuevaclave1')), JSON.stringify(S.rechazos()).slice(0,300));

console.log(`\n${PASS} bien · ${FAIL} mal`);
process.exit(FAIL ? 1 : 0);
