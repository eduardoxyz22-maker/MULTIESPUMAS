/* 👤 LOGIN POR USUARIO EN LA PÁGINA (27/11; dueño: «cada usuario de los vendedores debe tener su propio ingreso de login y clave y no
   pueden ver lo del otro»). El .gs REAL detrás (Google de mentira, nada sale a la red), datos INVENTADOS.
   1. Con el login prendido, sin sesión sale la pantalla de entrada · 2. contraseña mala · 3. entra Isabel: lo de María llega tapado,
   sin la pestaña Administración, su nombre fijo · 4. la primera vez pide poner su propia contraseña · 5. «Salir» borra la copia ·
   6. Administración ve todo.   Se corre:  node tests/test_login_pagina.js */
const fs = require('fs'), vm = require('vm'), path = require('path');
const { chromium } = require('playwright');
const GS = process.env.GS || path.resolve('google-apps-script.gs');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 300)) : ''); };
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
const ped = (id, v, cli) => ({ id, fecha:'2026-12-02', oc:'12-' + id, vendedor:v, cliente:cli, celular:'7000000' + id.slice(-1), turno:'AM', direccion:'Calle ' + cli,
  productos:[{ codigo:'CH1', desc:'COLCHON X', medida:'140x190', cant:1, precio:2500 }], metodoPago:'Efectivo 500', acuenta:500 });
[ped('p1', 'Isabel Robledo', 'CLIENTA UNO'), ped('p2', 'Maria Flores', 'CLIENTE DOS')].forEach(p => S.guardar(p));
const cI = J({ action:'usuarios', op:'crear', u:'isabel@x.com', n:'Isabel Robledo', r:'v', adminKey:'adminclave10' });
const cA = J({ action:'usuarios', op:'crear', u:'admin', n:'Administración', r:'t', adminKey:'adminclave10' });
J({ action:'usuarios', op:'activar', adminKey:'adminclave10' });
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { window.LOGIN_PRUEBA = 1; window.PREG_PRUEBA = 1; });
  await ctx.route(/^https:\/\/script\.google(usercontent)?\.com\//, r => {
    const body = r.request().postData() || '{}';
    let txt; try { txt = S.post(body); } catch (e) { txt = JSON.stringify({ ok:false, error:'x' }); }
    r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: txt });
  });
  await ctx.route(/^https:\/\/(?!script\.google)/, r => r.abort());
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + PEDIDOS); await p.waitForTimeout(2500);
  const vis = () => p.evaluate(() => { const o = document.getElementById('login-ov'); return !!(o && !o.hidden && getComputedStyle(o).display !== 'none'); });
  chk('1 · con el login prendido y sin sesión, sale la pantalla de entrada', await vis());
  await p.fill('#login-u', 'isabel@x.com'); await p.fill('#login-p', 'equivocada'); await p.click('#login-btn'); await p.waitForTimeout(500);
  const m1 = await p.evaluate(() => document.getElementById('login-msg').textContent);
  chk('2 · contraseña mala: lo dice y no entra', /incorrectos/.test(m1) && await vis(), m1);
  await p.fill('#login-p', cI.clave); await p.click('#login-btn'); await p.waitForTimeout(1500);
  const R = await p.evaluate(() => { const a = (STATE || []).find(x => x.id === 'p1'), m = (STATE || []).find(x => x.id === 'p2');
    return { ses: !!(SES && SES.t), n: SES && SES.n, adm: document.getElementById('tab-admin').hidden, mis: document.getElementById('mis-vendedor').value, dis: document.getElementById('mis-vendedor').disabled,
      a: a && a.cliente, m: m && { c: m.cliente, cel: m.celular, o: m.oculto, f: m.fecha, pr: m.productos[0].precio } }; });
  chk('3a · entra: la pantalla se va y queda la sesión', !(await vis()) && R.ses && R.n === 'Isabel Robledo', R);
  chk('3b · lo suyo entero, lo de María tapado (sin cliente ni celular; con el día y el monto: «solo números»)', R.a === 'CLIENTA UNO' && R.m && !R.m.c && !R.m.cel && R.m.o === 1 && R.m.f === '2026-12-02' && R.m.pr === 2500, R.m);
  chk('3c · sin la pestaña Administración y con su nombre fijo en Mis pedidos', R.adm === true && R.mis === 'Isabel Robledo' && R.dis === true, R);
  const tit = await p.evaluate(() => { const o = document.querySelector('.preg-ov'); return o ? (o.querySelector('#preg-tit') || {}).textContent : null; });
  chk('4a · la primera vez le pide poner su propia contraseña', /propia contraseña/.test(tit || ''), tit);
  await p.fill('.preg-ov .preg-in', 'isabelnueva7'); await p.click('.preg-ov .preg-si'); await p.waitForTimeout(400);
  await p.fill('.preg-ov .preg-in', 'isabelnueva7'); await p.click('.preg-ov .preg-si'); await p.waitForTimeout(800);
  const s2 = J({ action:'login', u:'isabel@x.com', p:'isabelnueva7' });
  chk('4b · quedó guardada en el servidor (entra con la nueva)', s2.ok, s2.error);
  await p.evaluate(() => { showView('mis'); });
  await p.evaluate(() => loginSalir()); await p.waitForTimeout(300); await p.click('.preg-ov .preg-si'); await p.waitForTimeout(800);
  const R5 = await p.evaluate(() => ({ ses: localStorage.getItem('me_ses_v1'), n: (STATE || []).length, copia: (localStorage.getItem(LS_KEY) || '').indexOf('CLIENTA') }));
  chk('5 · «Salir»: sin sesión, sin la copia de sus pedidos y vuelve la pantalla de entrada', !R5.ses && R5.copia < 0 && await vis(), R5);
  await p.fill('#login-u', 'admin'); await p.fill('#login-p', cA.clave); await p.click('#login-btn'); await p.waitForTimeout(1500);
  const R6 = await p.evaluate(() => ({ adm: document.getElementById('tab-admin').hidden, c: (STATE || []).filter(x => !/^__/.test(x.id)).map(x => x.cliente) }));
  chk('6 · Administración entra y ve todo', R6.adm === false && R6.c.indexOf('CLIENTE DOS') >= 0 && R6.c.indexOf('CLIENTA UNO') >= 0, R6);
  await p.evaluate(() => { ADMIN_KEY_LOCAL = 'adminclave10'; usuAbrir(); }); await p.waitForTimeout(800);
  const R7 = await p.evaluate(() => { const m = document.getElementById('modal-box'); return m ? m.innerText : ''; });
  chk('7a · «👥 Usuarios» lista los usuarios y dice que el login está prendido', /isabel@x\.com/.test(R7) && /PRENDIDO/.test(R7), R7.slice(0, 200));
  await p.evaluate(() => { document.getElementById('usu-u').value = 'mirian@x.com'; document.getElementById('usu-n').value = 'Mirian Salazar'; usuCrear(); }); await p.waitForTimeout(800);
  const R8 = await p.evaluate(() => { const c = document.getElementById('usu-clave'); return c ? c.textContent : ''; });
  const s8 = J({ action:'login', u:'mirian@x.com', p:R8 });
  chk('7b · crea uno nuevo y muestra su contraseña, que sirve para entrar', /^[a-z2-9]{10}$/.test(R8) && s8.ok && s8.n === 'Mirian Salazar', [R8.length, s8.ok]);
  await p.evaluate(() => { document.getElementById('usu-u').value = 'x@x.com'; document.getElementById('usu-n').value = 'Nadie Inventada'; document.getElementById('usu-r').value = 'v'; usuCrear(); }); await p.waitForTimeout(400);
  chk('7c · una vendedora con un nombre que no es del panel, no', !J({ action:'usuarios', op:'lista', adminKey:'adminclave10' }).usuarios.some(x => x.u === 'x@x.com'));
  /* 8. La revisión de Fable (28/11) */
  const R9 = await p.evaluate(() => {
    const out = {}, antes = SES;
    sesGuardar({ t:'tA', u:'a@x', n:'Isabel Robledo', r:'v', vence:Date.now() + 1e9 });
    setPending([{ id:'x1', cliente:'A' }]);
    sesGuardar({ t:'tB', u:'b@x', n:'Maria Flores', r:'v', vence:Date.now() + 1e9 });
    out.bVe = getPending().map(x => x.id); out.todo = getPendingTodo().length;
    setPending([{ id:'y1', cliente:'B' }]);
    out.todo2 = getPendingTodo().map(x => x.id).sort();
    sesGuardar({ t:'tA', u:'a@x', n:'Isabel Robledo', r:'v', vence:Date.now() + 1e9 });
    out.aVe = getPending().map(x => x.id);
    out.bono = alDiaSemAuto(); let guardo = 0; const g = window.pryHistGuardar; window.pryHistGuardar = () => { guardo++; }; pryHistAuto(); window.pryHistGuardar = g; out.pry = guardo;
    out.firme = !!(RECHAZOS_FIRMES.ajeno && RECHAZOS_FIRMES.permiso);
    ADMIN_KEY_LOCAL = 'zzz'; try { localStorage.setItem('ME_CLAVE_ADMIN_V1', 'zzz'); localStorage.setItem('ME_RETIROS_V1', '[1]'); localStorage.setItem('me_cambio_foto', '{}'); } catch (e) {}
    loginLimpiarCopia();
    out.limpio = !ADMIN_KEY_LOCAL && !localStorage.getItem('ME_CLAVE_ADMIN_V1') && !localStorage.getItem('ME_RETIROS_V1') && !localStorage.getItem('me_cambio_foto') && !UNLOCKED;
    out.colaQueda = getPendingTodo().length === 2;
    setPending([]); sesGuardar({ t:'tB', u:'b@x', n:'Maria Flores', r:'v', vence:Date.now() + 1e9 }); setPending([]); sesGuardar(antes);
    loginAbrir(); out.adm = !!document.querySelector('#login-ov .login-adm'); loginCerrar();
    out.ap = /^[a-z0-9]{16}$/.test(loginAp());
    return out;
  });
  chk('8a · la cola es de quien la armó: la siguiente persona no la ve ni la manda, y no se le borra', R9.bVe.length === 0 && R9.todo === 1 && R9.todo2.join() === 'x1,y1' && R9.aVe.join() === 'x1', R9);
  chk('8b · una vendedora no saca la foto del bono ni la de la proyección', R9.bono === null && R9.pry === 0, R9);
  chk('8c · «ajeno» y «permiso» son un «no» firme (no quedan de zombi en la cola)', R9.firme);
  chk('8d · al cambiar de persona se borran la clave para forzar, la contraseña abierta y las copias (la cola queda)', R9.limpio && R9.colaQueda, R9);
  chk('8e · la pantalla de entrada tiene «Soy Administración» y el aparato tiene su id para el freno', R9.adm && R9.ap, R9);
  chk('sin errores en la página', !errs.length, errs);
  console.log(`\n${PASS} bien · ${FAIL} mal`);
  await b.close(); process.exit(FAIL ? 1 : 0);
})();
