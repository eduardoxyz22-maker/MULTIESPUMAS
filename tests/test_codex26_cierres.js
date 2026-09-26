/* 🔏 LOS DÍAS CERRADOS Y LAS TILDES DE LA CARGA ENTRE DOS COMPUTADORAS — hallazgo 3 de Codex (26/09)

   Codex: «Ambos leen el estado vacío; uno guarda el cierre del 01/10 y otro el del 02/10. Las escrituras
   contienen cada una una sola fecha. La cola nueva no hace atómica la lectura y escritura entre
   dispositivos. La resolución debe ocurrir en servidor bajo bloqueo … validando revisión y reintentando
   una mezcla.» Eso se hizo: el panel manda el sello con el que leyó y `juntar`; el servidor 2026-09-26-a
   lo compara bajo su candado y, si otra guardó en el medio, contesta `conflicto` con la fila actual; el
   panel le aplica encima SOLO lo suyo y vuelve a guardar.

   Navegadores con el panel de verdad contra el google-apps-script.gs de verdad (el arnés de
   test_concurrencia.js). La carrera se arma con una regla `hold`: A ya releyó y su guardado queda
   retenido; B lee (vacío), guarda, y recién ahí sale el de A, con el sello viejo.

   Dientes (tienen que salir en rojo):
     · la página publicada contra el servidor nuevo:  PEDIDOS=/ruta/a8e3c5e/pedidos.html node tests/test_codex26_cierres.js
     · esta página contra el servidor de hoy (23-b):   GS=/ruta/23b.gs node tests/test_codex26_cierres.js
   Solo datos sintéticos: el repo es público. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), vm = require('vm'), path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,260)):''); };
const GS = process.env.GS || path.resolve('google-apps-script.gs');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

/* ── El servidor: el .gs real con un Google de mentira (igual que test_concurrencia.js) ── */
function hacerPlanilla(filas){
  const datos = filas.map(f => f.slice());
  return {
    _datos: datos,
    getLastRow: () => datos.length, getLastColumn: () => (datos[0]||[]).length,
    getDataRange: () => ({ getValues: () => datos.map(f => f.slice()) }),
    setFrozenRows: () => {}, appendRow: (r) => { datos.push(r.slice()); }, deleteRow: (n) => { datos.splice(n-1, 1); },
    getRange: (fila, col, nFilas, nCols) => ({
      getValue: () => (datos[fila-1]||[])[col-1],
      setValue: (v) => { if(!datos[fila-1]) datos[fila-1]=[]; datos[fila-1][col-1]=v; },
      getValues: () => { const out=[]; for(let i=0;i<(nFilas||1);i++){ const f=datos[fila-1+i]||[], r=[]; for(let j=0;j<(nCols||1);j++) r.push(f[col-1+j]); out.push(r); } return out; },
      setValues: (v) => { for(let i=0;i<v.length;i++) datos[fila-1+i]=v[i].slice(); },
      setFontWeight: () => {}
    })
  };
}
function servidor(){
  const HDR = ['id','Fecha','N° OC','Vendedor','Cliente','Productos','Celular','Turno','Zona','Dirección','Link Maps','Pagado','Saldo (Bs)','ts',
    '_productos_json','Método pago','Observaciones','Estado stock','Entregado','Vehículo','Chofer','Garantía (a nombre de)','Nota de venta',
    'A cuenta (Bs)','Facturar a','NIT','N° del día','Verificado','Fotos entrega'];
  const sh = hacerPlanilla([HDR]), shR = hacerPlanilla([]), props = {};
  const cache = { _m:{}, get(k){ return Object.prototype.hasOwnProperty.call(this._m,k)?this._m[k]:null; }, put(k,v){ this._m[k]=String(v); }, putAll(o){ for(const k in o) this._m[k]=String(o[k]); }, remove(k){ delete this._m[k]; } };
  const ctx = {
    console, Date,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => n==='Rechazos' ? shR : sh, insertSheet: (n) => n==='Rechazos' ? shR : sh }), flush: () => {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty:(k)=>props[k]!=null?props[k]:null, setProperty:(k,v)=>{ props[k]=v; },
      deleteProperty:(k)=>{ delete props[k]; }, setProperties:(o)=>{ Object.assign(props,o); } }) },
    UrlFetchApp: { fetch: () => ({ getResponseCode: () => 404, getContentText: () => '{}' }) },
    LockService: { getScriptLock: () => ({ waitLock(){}, releaseLock(){} }) },
    CacheService: { getScriptCache: () => cache },
    ContentService: { MimeType:{JSON:'json'}, createTextOutput: (t) => ({ _t:t, setMimeType(){ return this; } }) },
    DriveApp: { getFoldersByName: () => ({ hasNext:()=>false }), createFolder: () => ({ getId:()=>'f' }), getFileById: () => { throw new Error('no'); } },
    Utilities: { formatDate: (d)=>String(d), base64Decode: () => [], newBlob: () => ({}) },
    Session: { getScriptTimeZone: () => 'America/La_Paz', getTemporaryActiveUserKey: () => 'ABCDEFGH' },
    ScriptApp: { newTrigger: () => ({ timeBased: () => ({ after: () => ({ create: () => ({}) }), everyMinutes: () => ({ create: () => ({}) }), everyDays: () => ({ atHour: () => ({ create: () => ({}) }) }) }) }),
                 getProjectTriggers: () => [], deleteTrigger: () => {} }
  };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(GS,'utf8'), ctx);
  const post = (bodyTxt) => ctx.doPost({ postData:{ contents: bodyTxt }, parameter:{} })._t;
  const fila = (id) => { const r = sh._datos.find(f => f[0]===id); return r ? ctx.rowToRec_(r) : null; };
  return { ctx, sh, shR, post, fila, version: ctx.SCRIPT_VERSION };
}
function sembrar(S){
  const p = (rec) => JSON.parse(S.post(JSON.stringify({ action:'save', pedido:rec })));
  p({ id:'__dias_cerrados__', fecha:'', cliente:'🔒 DÍAS DE ENTREGA CERRADOS', observaciones:'', rev:0 });
  p({ id:'__carga_chk__', fecha:'', cliente:'📦 TILDES DE LA LISTA DE CARGA', observaciones:'', rev:0 });
}

/* Lo que corre ANTES que el panel: el `fetch` va al .gs de este proceso y acepta reglas (`hold`). */
function INIT(){
  window.__ctl = { rules: [], holds: {}, log: [] };
  window.__soltar = function(name){ var f = window.__ctl.holds[name]; if(f){ delete window.__ctl.holds[name]; f(); return true; } return false; };
  window.__regla = function(r){ r.n = r.n || 1; window.__ctl.rules.push(r); };
  window.fetch = function(url, o){
    var body = (o && o.body) || '{}';
    var P = {}; try { P = JSON.parse(body); } catch(e) {}
    var act = P.action || 'save', id = String((P.pedido && P.pedido.id) || P.id || '');
    window.__ctl.log.push({ act: act, id: id, rev: P.pedido ? P.pedido.rev : null, juntar: !!P.juntar });
    var resp = function(t){ return { ok:true, status:200, json:function(){ return Promise.resolve(JSON.parse(t)); }, text:function(){ return Promise.resolve(t); } }; };
    var real = function(){ return window.__gs(body).then(resp); };
    for (var i=0;i<window.__ctl.rules.length;i++){
      var r = window.__ctl.rules[i];
      if (r.n > 0 && r.act === act && (!r.id || r.id === id)) {
        r.n--;
        if (r.mode === 'hold') return new Promise(function(res){ window.__ctl.holds[r.name] = function(){ res(real()); }; });
      }
    }
    return real();
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores = [];
  let contextos = [];
  const abrir = async (S, nombre) => {
    const context = await browser.newContext({ viewport:{width:1300,height:900}, timezoneId:'America/La_Paz' });
    contextos.push(context);
    await context.exposeFunction('__gs', (body) => S.post(body));
    await context.addInitScript(INIT);
    await context.route(/^https?:/, r => r.abort());
    const page = await context.newPage();
    page.on('pageerror', e => errores.push(nombre+': '+e.message));
    page.on('dialog', d => d.accept());
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      var c=document.getElementById('conn-form'); if(c) c.style.display='none';
      UNLOCKED=true; CONNECTED=true;
      if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
      if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
    });
    await page.evaluate(async () => { await refrescarEstado(); });       // cada uno lee la planilla (y su sello)
    return page;
  };
  const cerrar = async () => { for (const c of contextos) { try { await c.close(); } catch(e){} } contextos = []; };
  const hasta = async (cond, ms) => { const fin = Date.now() + (ms||15000); while (Date.now() < fin) { if (await cond()) return true; await new Promise(r => setTimeout(r, 80)); } return false; };
  const esc = async (titulo, fn) => { console.log('\n── '+titulo+' ──'); try { await fn(); } catch(e) { chk('(el escenario no terminó) '+titulo, false, String(e && e.stack || e).slice(0,300)); } await cerrar(); };
  const diasEn = (S) => { const f = S.fila('__dias_cerrados__'); return String((f && f.observaciones) || '').split(/[^\d-]+/).filter(s => /^\d{4}-\d{2}-\d{2}$/.test(s)).sort(); };
  const tildesEn = (S) => { const f = S.fila('__carga_chk__'); return String((f && f.observaciones) || '').split(';').map(s => s.trim()).filter(Boolean).sort(); };
  const S0 = servidor();
  console.log('servidor: '+S0.version+' · panel: '+path.relative(process.cwd(), PEDIDOS));

  // ══ 1. Dos administraciones cierran días DISTINTOS a la vez ═════════════════════════════
  await esc('1. A cierra el 01/10 y B el 02/10, los dos sobre la planilla vacía', async () => {
    const S = servidor(); sembrar(S);
    const A = await abrir(S,'A'), B = await abrir(S,'B');
    // A: relee, arma su guardado… y queda retenido en el camino.
    await A.evaluate(() => { __regla({ act:'save', id:'__dias_cerrados__', mode:'hold', name:'a1' }); cerrarDia('2026-10-01'); });
    const retenido = await hasta(() => A.evaluate(() => !!window.__ctl.holds.a1));
    chk('(A ya releyó y su guardado quedó retenido)', retenido);
    // B: relee (todavía vacío) y guarda el suyo.
    await B.evaluate(() => { cerrarDia('2026-10-02'); });
    await hasta(() => diasEn(S).indexOf('2026-10-02')>=0);
    chk('(B guardó el 02/10)', diasEn(S).join(' ')==='2026-10-02', diasEn(S));
    // Sale el de A, con el sello de ANTES del guardado de B.
    await A.evaluate(() => { __soltar('a1'); });
    await hasta(() => diasEn(S).length>=2, 8000);
    chk('⚠️ los DOS días quedan cerrados en la planilla (antes: solo el 01/10, el de A pisaba el de B)', diasEn(S).join(' ')==='2026-10-01 2026-10-02', diasEn(S));
    const a = await A.evaluate(() => DIAS_CERRADOS.slice().sort());
    chk('…y A los ve cerrados a los dos', a.join(' ')==='2026-10-01 2026-10-02', a);
    const log = await A.evaluate(() => window.__ctl.log.filter(x => x.act==='save' && x.id==='__dias_cerrados__'));
    chk('…A mandó `juntar` y su sello (no a ciegas)', log.length>=1 && log.every(x => x.juntar && Number(x.rev)>0), log);
    chk('…el choque no quedó como «guardado rechazado» en la planilla', !S.shR._datos.some(f => f.indexOf('__dias_cerrados__')>=0), S.shR._datos.length+' filas');
  });

  // ══ 2. Reabrir en una y cerrar otro día en la otra ═════════════════════════════════════
  await esc('2. A reabre el 01/10 mientras B cierra el 03/10', async () => {
    const S = servidor(); sembrar(S);
    S.post(JSON.stringify({ action:'save', pedido:Object.assign(S.fila('__dias_cerrados__'), { observaciones:'🔒 2026-10-01' }) }));
    const A = await abrir(S,'A'), B = await abrir(S,'B');
    await A.evaluate(() => { __regla({ act:'save', id:'__dias_cerrados__', mode:'hold', name:'a1' }); abrirDia('2026-10-01'); });
    await hasta(() => A.evaluate(() => !!window.__ctl.holds.a1));
    await B.evaluate(() => { cerrarDia('2026-10-03'); });
    await hasta(() => diasEn(S).indexOf('2026-10-03')>=0);
    await A.evaluate(() => { __soltar('a1'); });
    await hasta(() => diasEn(S).indexOf('2026-10-01')<0, 8000);
    chk('⚠️ queda cerrado el 03/10 de B y reabierto el 01/10 de A', diasEn(S).join(' ')==='2026-10-03', diasEn(S));
  });

  // ══ 3. Dos cargadores tildan a la vez ══════════════════════════════════════════════════
  await esc('3. Dos cargadores tildan productos distintos a la vez', async () => {
    const S = servidor(); sembrar(S);
    const A = await abrir(S,'A'), B = await abrir(S,'B');
    await A.evaluate(() => { __regla({ act:'save', id:'__carga_chk__', mode:'hold', name:'a1' }); setCargaChk('2026-10-01|COLCHON TITANIO', true); });
    await hasta(() => A.evaluate(() => !!window.__ctl.holds.a1));
    await B.evaluate(() => { setCargaChk('2026-10-01|SOMIER NEGRO', true); });
    await hasta(() => tildesEn(S).length>=1);
    await A.evaluate(() => { __soltar('a1'); });
    await hasta(() => tildesEn(S).length>=2, 8000);
    chk('⚠️ las DOS tildes quedan en la planilla (antes: una)', tildesEn(S).join(' ; ')==='2026-10-01|COLCHON TITANIO ; 2026-10-01|SOMIER NEGRO', tildesEn(S));
  });

  // ══ 4. Sin carrera, todo como siempre ══════════════════════════════════════════════════
  await esc('4. Sin carrera: cerrar y reabrir como siempre', async () => {
    const S = servidor(); sembrar(S);
    const A = await abrir(S,'A');
    await A.evaluate(async () => { cerrarDia('2026-10-05'); });
    await hasta(() => diasEn(S).indexOf('2026-10-05')>=0);
    chk('cerrar un día entra de una', diasEn(S).join(' ')==='2026-10-05', diasEn(S));
    await A.evaluate(async () => { abrirDia('2026-10-05'); });
    await hasta(() => diasEn(S).length===0);
    chk('…y reabrirlo también', diasEn(S).length===0, diasEn(S));
    const saves = await A.evaluate(() => window.__ctl.log.filter(x => x.act==='save' && x.id==='__dias_cerrados__').length);
    chk('…sin choques ni reintentos de más (un guardado por cambio)', saves===2, saves);
  });

  chk('sin errores JS en los navegadores', errores.length===0, errores.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
