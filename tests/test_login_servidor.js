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
chk('5b · de María: sin cliente, celular, dirección, NIT, pagos ni notas; los MONTOS sí («solo números, sin clientes»: la proyección y el puesto)', p2 && p2.oculto === 1 && !p2.cliente && !p2.celular && !p2.direccion && !p2.nit && !p2.metodoPago && !p2.observaciones && p2.acuenta === 500 && p2.productos[0].precio === 2500, p2);
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

/* 9. La revisión de Fable (28/11) */
{
  const T = servidor(fs.readFileSync(GS, 'utf8'));
  const Q = (o) => JSON.parse(T.post(JSON.stringify(o)));
  T.props.ADMIN_KEY = 'adminclave10';
  [ped('q1', 'Isabel Robledo', 'CLIENTA UNO'), ped('q2', 'María Flores', 'CLIENTE DOS'),
   ped('q3', 'María Flores', 'MULTICENTER SRL', { direccion:'SALIÓ DE TIENDA · Carmelo', zona:'TIENDA', fecha:'', productos:[{ codigo:'CH1', desc:'COLCHON X', medida:'140x190', cant:1, precio:2500, avisa:'2026-12-09' }] }),
   ped('kommo-77', '', 'LEAD SIN VENDEDORA')].forEach(x => T.guardar(x));
  const A = (o) => Object.assign({ adminKey:'adminclave10' }, o);
  const cI = Q(A({ action:'usuarios', op:'crear', u:'isa', n:'Isabel Robledo', r:'v' })), cAd = Q(A({ action:'usuarios', op:'crear', u:'jefe', n:'Administración', r:'t' }));
  Q(A({ action:'usuarios', op:'activar' }));
  const sI = Q({ action:'login', u:'isa', p:cI.clave, ap:'compuIsa' });
  const sis = (id, obj) => ({ id, fecha:'', vendedor:'', cliente:'(sistema)', productos:[], observaciones:JSON.stringify(obj) });
  let r;
  r = Q({ action:'loQueSea', ses:sI.ses, pedido:Object.assign(T.fila('q2'), { cliente:'PISADO POR OTRA ACCION' }) });
  chk('9a · GRAVE: una acción desconocida no se saltea el control (no pisa lo de María)', !r.ok && r.error === 'ajeno' && T.fila('q2').cliente === 'CLIENTE DOS', r);
  r = Q({ action:'save', ses:sI.ses });
  chk('9b · un guardado sin pedido: ajeno, sin romper nada', !r.ok && r.error === 'ajeno', r);
  Q(A({ action:'save', pedido:sis('__avisos_conta__', { v:1, a:[{ id:'a1', pid:'q1', vend:'Isabel Robledo' }, { id:'a2', pid:'q2', vend:'María Flores', cli:'CLIENTE DOS' }] }) }));
  Q(A({ action:'save', pedido:sis('__destinos__', { v:1, k:[JSON.stringify(['d', 'CLIENTA UNO', 'ISABEL ROBLEDO', 1, 'https://m/1', '', '', '', 'Isabel Robledo']), JSON.stringify(['d', 'CLIENTE DOS', 'MARIA FLORES', 1, 'https://m/2', '', '', '', 'María Flores'])] }) }));
  Q(A({ action:'save', pedido:sis('__metas__', { v:1, m:{ '2026-12':{ heaven:[1, 2], vd:{ 'Isabel Robledo':[1, 2], 'María Flores':[3, 4] } } } }) }));
  Q(A({ action:'save', pedido:sis('__cierre_comercial__', { v:1, m:{ '2026-11':{ c:1, vt:[{ v:'Isabel Robledo', g:'heaven', bs:9 }, { v:'María Flores', g:'heaven', bs:7 }], s:{ q1:[0, 9, 0], q2:[1, 7, 0] }, aj:{ q2:[1, 1, 0, '2026-10'] } } } }) }));
  r = Q({ action:'list', ses:sI.ses });
  const LI = r, de = (id) => JSON.parse(LI.pedidos.find(x => x.id === id).observaciones);
  chk('9c · los avisos de Contabilidad: solo los suyos', de('__avisos_conta__').a.length === 1 && de('__avisos_conta__').a[0].id === 'a1', de('__avisos_conta__'));
  chk('9d · los lugares guardados: solo los suyos', de('__destinos__').k.length === 1 && /CLIENTA UNO/.test(de('__destinos__').k[0]), de('__destinos__'));
  chk('9e · las metas: la de la marca y solo la suya por vendedora', JSON.stringify(de('__metas__').m['2026-12'].vd) === '{"Isabel Robledo":[1,2]}' && de('__metas__').m['2026-12'].heaven, de('__metas__'));
  const cc = de('__cierre_comercial__').m['2026-11'];
  chk('9f · el cierre comercial: lo suyo, sin lo de María', cc.vt[0].v === 'Isabel Robledo' && cc.vt[1].v === '' && !cc.vt[1].bs && cc.s.q1 && !cc.s.q2 && !cc.aj.q2, cc);
  const q3 = r.pedidos.find(x => x.id === 'q3');
  chk('9g · ajeno: la clase del cliente (Multicenter), la venta de tienda y el «avisa» quedan; el nombre no', q3.oculto && q3.cliente === 'MULTICENTER' && /^SALIÓ DE TIENDA/.test(q3.direccion) && q3.zona === 'TIENDA' && q3.productos[0].avisa === '2026-12-09', q3);
  r = Q({ action:'save', ses:sI.ses, pedido:sis('__mio', { v:1 }) });
  chk('9g2 · una fila «__algo» inventada no la crea una vendedora', !r.ok && r.error === 'permiso' && !T.fila('__mio'), r);
  /* Isabel marca su aviso con la lista que le llegó (sin el de María): el de María sigue */
  const avMio = de('__avisos_conta__'); avMio.a[0].ok = 123; avMio.a[0].okPor = 'Isabel';
  r = Q({ action:'save', ses:sI.ses, juntar:true, pedido:Object.assign(sis('__avisos_conta__', avMio), { rev:1 }) });
  const avSrv = JSON.parse(T.fila('__avisos_conta__').observaciones);
  chk('9h · marcar «corregido» con su lista NO borra el aviso de María', r.ok && avSrv.a.length === 2 && avSrv.a.find(a => a.id === 'a1').ok === 123 && !avSrv.a.find(a => a.id === 'a2').ok, [r.error, avSrv]);
  chk('9i · y la respuesta le vuelve filtrada', r.pedido && JSON.parse(r.pedido.observaciones).a.length === 1, r.pedido && r.pedido.observaciones);
  const dsMio = de('__destinos__'); dsMio.k = [JSON.stringify(['d', 'CLIENTA NUEVA', 'ISABEL ROBLEDO', 2, 'https://m/3', '', '', '', 'Isabel Robledo'])];
  r = Q({ action:'save', ses:sI.ses, juntar:true, pedido:sis('__destinos__', dsMio) });
  const dsSrv = JSON.parse(T.fila('__destinos__').observaciones).k;
  chk('9j · guardar sus lugares no borra los de María', r.ok && dsSrv.length === 2 && dsSrv.some(k => /CLIENTE DOS/.test(k)) && dsSrv.some(k => /CLIENTA NUEVA/.test(k)) && !dsSrv.some(k => /CLIENTA UNO/.test(k)), [r.error, dsSrv]);
  r = Q({ action:'save', ses:sI.ses, pedido:sis('__metas__', { v:1, m:{} }) });
  const r2b = Q({ action:'save', ses:sI.ses, pedido:sis('__al_dia_sem__', { v:1, s:{} }) });
  chk('9k · una vendedora no escribe metas ni la foto del bono', !r.ok && r.error === 'permiso' && !r2b.ok && r2b.error === 'permiso' && JSON.parse(T.fila('__metas__').observaciones).m['2026-12'], [r, r2b]);
  r = Q({ action:'delete', ses:sI.ses, id:'__destinos__' });
  chk('9l · ni borra una fila del sistema', !r.ok && r.error === 'permiso' && !!T.fila('__destinos__'), r);
  r = Q({ action:'save', ses:sI.ses, pedido:{ id:'__ret_9', fecha:'2026-12-01', vendedor:'Luis Pierre', chofer:'Isabel Robledo', cliente:'(retiro)', productos:[], acuenta:500 } });
  chk('9m · un retiro que entregó un chofer y retiró ella: lo puede cargar', r.ok, r.error);
  r = Q({ action:'save', ses:sI.ses, pedido:Object.assign(T.fila('kommo-77'), { vendedor:'Isabel Robledo', cliente:'LEAD TOMADO' }) });
  chk('9n · un borrador de Kommo sin vendedora: lo completa', r.ok && T.fila('kommo-77').vendedor === 'Isabel Robledo', r.error);
  r = Q({ action:'kommoCierre', ses:sI.ses, id:'q2' });
  chk('9o · no cierra en Kommo la venta de otra', !r.ok && r.error === 'ajeno', r);
  Q(A({ action:'save', pedido:Object.assign(T.fila('q2'), { fotos:['FOTOdeMARIA1234567'] }) }));
  r = Q({ action:'borrarFoto', ses:sI.ses, fotoId:'FOTOdeMARIA1234567' });
  chk('9p · no borra una foto de un pedido de María', !r.ok && r.error === 'ajeno', r);
  r = Q({ action:'mallLeer', ses:sI.ses });
  chk('9q · el mostrador del mall sí lo lee', r.error !== 'permiso', r.error);
  /* Las sesiones con tope: una por usuario y aparato */
  const s2 = Q({ action:'login', u:'isa', p:cI.clave, ap:'compuIsa' });
  const nIsa = Object.values(JSON.parse(T.props.SESIONES)).filter(x => x[0] === 'isa').length;
  chk('9r · volver a entrar desde el mismo aparato reemplaza la sesión de antes', s2.ok && nIsa === 1 && !Q({ action:'list', ses:sI.ses }).ok, nIsa);
  for (let i = 0; i < 80; i++) Q({ action:'login', u:'jefe', p:cAd.clave, ap:'ap' + i });
  const SS = T.props.SESIONES;
  chk('9s · nunca más de 60 sesiones ni de 8.000 letras (la propiedad aguanta 9 KB)', Object.keys(JSON.parse(SS)).length <= 60 && SS.length <= 8000 && Q({ action:'list', ses:s2.ses }).ok, [Object.keys(JSON.parse(SS)).length, SS.length]);
  /* Cambiar la contraseña cierra las otras sesiones de esa cuenta */
  const s3 = Q({ action:'login', u:'isa', p:cI.clave, ap:'celuIsa' });
  r = Q({ action:'miClave', ses:s3.ses, actual:cI.clave, nueva:'otraclave99', ap:'celuIsa' });
  chk('9t · cambiar la contraseña cierra las otras sesiones (esta sigue)', r.ok && Q({ action:'list', ses:s3.ses }).ok && !Q({ action:'list', ses:s2.ses }).ok, r.error);
  /* El freno por aparato: el de otra persona no la deja afuera */
  for (let i = 0; i < 6; i++) Q({ action:'login', u:'isa', p:'mala' + i, ap:'intruso' });
  r = Q({ action:'login', u:'isa', p:'otraclave99', ap:'intruso' });
  const rB = Q({ action:'login', u:'isa', p:'otraclave99', ap:'celuIsa' });
  chk('9u · 5 malas frenan ESE aparato; el suyo entra igual', !r.ok && r.error === 'login_frenado' && rB.ok, [r.error, rB.error]);
  for (let i = 0; i < 25; i++) Q({ action:'login', u:'isa', p:'mala' + i, ap:'x' + i });
  r = Q({ action:'login', u:'isa', p:'otraclave99', ap:'nuevo' });
  const rC = Q({ action:'login', u:'isa', p:'otraclave99', ap:'celuIsa' });
  chk('9v · con 25 malas en total: uno nuevo espera, el que ya entró antes sí entra', !r.ok && r.error === 'login_frenado' && rC.ok, [r.error, rC.error]);
  r = Q({ action:'miClave', ses:rC.ses, actual:'mala', nueva:'xxxxxxx1', ap:'intruso' });
  chk('9w · cambiar la contraseña respeta el freno', !r.ok && r.error === 'login_frenado', r);
  /* El último que ve todo no se borra con el login prendido */
  r = Q(A({ action:'usuarios', op:'borrar', u:'jefe' }));
  const rR = Q(A({ action:'usuarios', op:'crear', u:'jefe', n:'Jefe', r:'v', reemplazar:true }));
  chk('9x · no se borra (ni se vuelve vendedora) el último usuario que ve todo', !r.ok && r.error === 'ultimo_admin' && !rR.ok && rR.error === 'ultimo_admin', [r, rR]);
  /* Si Google no deja leer las Propiedades: no pasa y no borra a nadie */
  const antesU = T.props.USUARIOS, antesS = T.props.SESIONES;
  const pp = T.ctx.PropertiesService.getScriptProperties;
  T.ctx.PropertiesService.getScriptProperties = () => ({ getProperty: () => { throw new Error('cupo'); }, getProperties: () => { throw new Error('cupo'); }, setProperty: () => {} });
  r = Q({ action:'list', ses:rC.ses });
  const rL = Q({ action:'login', u:'isa', p:'otraclave99', ap:'celuIsa' });
  T.ctx.PropertiesService.getScriptProperties = pp;
  chk('9y · sin poder leer las Propiedades: busy (ni pasa ni deja entrar)', !r.ok && r.error === 'busy' && !rL.ok && rL.error === 'busy', [r, rL]);
  const ro = { getProperty: (k) => { if (k === 'SESIONES' || k === 'USUARIOS') throw new Error('cupo'); return T.props[k] != null ? T.props[k] : null; }, getProperties: () => Object.assign({}, T.props), setProperty: (k, v) => { T.props[k] = v; } };
  T.ctx.PropertiesService.getScriptProperties = () => ro;
  r = Q({ action:'login', u:'isa', p:'otraclave99', ap:'celuIsa' });
  const rS = Q({ action:'salir', ses:rC.ses });
  T.ctx.PropertiesService.getScriptProperties = pp;
  chk('9z · y una lectura que falla adentro del candado no borra usuarios ni sesiones', !r.ok && r.error === 'busy' && !rS.ok && T.props.USUARIOS === antesU && Object.keys(JSON.parse(T.props.SESIONES)).length > 0, [r.error, rS.error]);
}

console.log(`\n${PASS} bien · ${FAIL} mal`);
process.exit(FAIL ? 1 : 0);
