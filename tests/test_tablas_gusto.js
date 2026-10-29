/* 🗂️ TABLAS A TU GUSTO (§4nr, 29/10; dueño, del muestrario 24-33: «33 tb»).
   Lo que cuida esta prueba: en Contabilidad → Ventas y en la tabla de Administración, «☰ Columnas» esconde y muestra columnas (las celdas
   siguen ahí, solo no se ven), un clic en el título ordena y otro lo da vuelta, y las dos cosas quedan guardadas EN LA COMPU (sobreviven a
   recargar la página); «Volver a como estaba» lo borra; no se pueden esconder todas; con las fichas de Administración o las tarjetas de
   Contabilidad la barra no está; sin `TBL_PRUEBA` (Playwright) los títulos y la tabla son los de siempre.
   Reloj clavado: viernes 23/10/2026 15:00 de Bolivia.   Se corre:  node tests/test_tablas_gusto.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const HOY = '2026-10-23T15:00:00-04:00';

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  loadFromServer=function(){};
  var n=0, V=function(o){ n++; return Object.assign({ id:'p'+n, oc:'10-'+(100+n), nota:String(700+n), vendedor:'Maria Flores', cliente:'C', celular:'7000000'+n, fecha:'2026-10-27', turno:'AM',
    zona:'Norte', productos:[{desc:'COLCHON SOFT',medida:'140x190',cant:1}], saldo:0, pagado:true, ts:new Date('2026-10-10T10:00:00-04:00').getTime()+n*60000, rev:1, fotos:[] }, o); };
  STATE=[ V({ cliente:'BRUNO', saldo:300, pagado:false, turno:'PM', vehiculo:'KSC' }), V({ cliente:'ANA', saldo:0, turno:'AM', vehiculo:'' }),
          V({ cliente:'CARLA', saldo:1200, pagado:false, turno:'PM', vehiculo:'Hino' }), V({ cliente:'DIEGO', saldo:50, pagado:false, turno:'AM', vehiculo:'KSC' }) ];
  UNLOCKED=true; var ac=document.getElementById('admin-content'); if(ac) ac.style.display='block'; var lk=document.getElementById('admin-lock'); if(lk) lk.style.display='none';
}
function CONTA(){ showView('conta'); segSet('cta-tab','ventas'); setContaTab('ventas'); document.getElementById('cta-mes').value='2026-10'; renderConta(); }
function LEER(){
  var cab=function(id){ return [].map.call(document.querySelectorAll('#'+id+' thead th'), function(t){ return getComputedStyle(t).display==='none' ? '-' : t.textContent.replace(/\s+/g,' ').trim(); }); };
  var col=function(id, i){ return [].map.call(document.querySelectorAll('#'+id+' tbody tr'), function(tr){ var td=tr.children[i]; return td ? td.textContent.trim() : ''; }); };
  var bar=function(id){ var b=document.getElementById(id); return b ? { hidden:b.hidden, txt:b.innerText.replace(/\s+/g,' ').trim() } : null; };
  return { conta:cab('tbl-conta'), contaCli:col('tbl-conta', 4), admin:cab('tbl-pedidos'), adminCli:col('tbl-pedidos', 6), cxBar:bar('cx-tcol'), admBar:bar('adm-tcol'),
    celVisible:[].map.call(document.querySelectorAll('#tbl-conta tbody td:nth-child(7)'), function(t){ return getComputedStyle(t).display; })[0],
    cxHead:(document.querySelector('#tbl-conta thead')||{}).innerHTML||'' };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  async function nueva(con){
    const ctx = await browser.newContext({ viewport:{ width:1440, height:900 }, timezoneId:'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r=>r.abort());
    if(con) await ctx.addInitScript(()=>{ window.TBL_PRUEBA=1; });
    return ctx;
  }
  async function abrir(ctx){
    const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.dismiss());
    await page.clock.setFixedTime(new Date(HOY));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(350);
    await page.evaluate(PREPARAR);
    return page;
  }

  // ---------- 1. Sin TBL_PRUEBA: como siempre ----------
  let ctx = await nueva(false), page = await abrir(ctx);
  await page.evaluate(CONTA); let r = await page.evaluate(LEER);
  chk('1a sin TBL_PRUEBA los títulos de Contabilidad son los de siempre', r.cxHead.indexOf('<tr><th>Ingresado</th><th>Entrega agendada</th><th>N° Nota</th>')===0 && r.cxHead.indexOf('sortable')<0, r.cxHead.slice(0,160));
  chk('1b y no hay barra de columnas', r.cxBar && r.cxBar.hidden, r.cxBar);
  await page.evaluate(() => { showView('admin'); renderAdmin(); }); r = await page.evaluate(LEER);
  chk('1c Administración: «N° OC», «Turno» y «Vehículo» siguen sin ordenar', r.admin.indexOf('N° OC / ATC')>=0 && r.admin.indexOf('Turno')>=0 && r.admin.indexOf('Vehículo')>=0, r.admin);
  chk('1d sin barra', r.admBar && r.admBar.hidden, r.admBar);
  await ctx.close();

  // ---------- 2. Contabilidad: esconder columnas y ordenar ----------
  ctx = await nueva(true); page = await abrir(ctx);
  await page.evaluate(CONTA); r = await page.evaluate(LEER);
  chk('2a la barra está: «☰ Columnas 14 de 14 · Tocá un título para ordenar»', r.cxBar && !r.cxBar.hidden && /Columnas\s*14 de 14/.test(r.cxBar.txt) && /Tocá un título/.test(r.cxBar.txt), r.cxBar);
  await page.click('#cx-tcol .tcol-b'); await page.waitForTimeout(100);
  const n = await page.locator('#cx-tcol .tcol-l input').count();
  chk('2b el menú tiene una casilla por columna', n===14, n);
  await page.locator('#cx-tcol .tcol-l label', { hasText:'Celular' }).click(); await page.waitForTimeout(100);
  r = await page.evaluate(LEER);
  chk('2c «Celular» se esconde (título y celdas)', r.conta[6]==='-' && r.celVisible==='none', [r.conta, r.celVisible]);
  chk('2d la celda sigue en la tabla (solo no se ve)', await page.evaluate(() => document.querySelectorAll('#tbl-conta tbody tr')[0].children.length)===14);
  chk('2e la barra dice 13 de 14 y «Guardado en esta compu»', /13 de 14/.test(r.cxBar.txt) && /Guardado en esta compu/.test(r.cxBar.txt), r.cxBar.txt);
  await page.mouse.click(5, 5); await page.waitForTimeout(100);
  chk('2f tocar afuera cierra el menú', await page.locator('#cx-tcol .tcol-pop').count()===0);
  await page.click('#tbl-conta thead th:nth-child(5)'); await page.waitForTimeout(100); r = await page.evaluate(LEER);
  chk('2g clic en «Cliente»: de la A a la Z', JSON.stringify(r.contaCli)===JSON.stringify(['ANA','BRUNO','CARLA','DIEGO']), r.contaCli);
  chk('2h con la flechita y «Ordenado por Cliente ▲»', /Cliente ▲/.test(r.conta[4]) && /Ordenado por Cliente ▲/.test(r.cxBar.txt), [r.conta[4], r.cxBar.txt]);
  await page.click('#tbl-conta thead th:nth-child(5)'); await page.waitForTimeout(100); r = await page.evaluate(LEER);
  chk('2i otro clic: al revés', JSON.stringify(r.contaCli)===JSON.stringify(['DIEGO','CARLA','BRUNO','ANA']), r.contaCli);
  await page.click('#tbl-conta thead th:nth-child(11)'); await page.waitForTimeout(100); r = await page.evaluate(LEER);
  chk('2j «Pago»: de lo que menos falta a lo que más', JSON.stringify(r.contaCli)===JSON.stringify(['ANA','DIEGO','BRUNO','CARLA']), r.contaCli);
  // ---------- 3. Queda guardado en la compu ----------
  await page.close(); page = await abrir(ctx);
  await page.evaluate(CONTA); r = await page.evaluate(LEER);
  chk('3a después de recargar: «Celular» sigue escondido', r.conta[6]==='-', r.conta);
  chk('3b y el orden por «Pago» sigue', JSON.stringify(r.contaCli)===JSON.stringify(['ANA','DIEGO','BRUNO','CARLA']) && /Ordenado por Pago/.test(r.cxBar.txt), [r.contaCli, r.cxBar.txt]);
  await page.click('#cx-tcol .tcol-ord button'); await page.waitForTimeout(100); r = await page.evaluate(LEER);
  chk('3c ✕ saca el orden (vuelve al de siempre) y deja las columnas', !/Ordenado/.test(r.cxBar.txt) && r.conta[6]==='-', r.cxBar.txt);
  // no se pueden esconder todas
  r = await page.evaluate(() => { for(var i=0;i<14;i++) tblColTocar('conta', i, false); return tblPref('conta').ocultas.length; });
  chk('3d no se pueden esconder las 14 (queda una)', r===13, r);
  await page.click('#cx-tcol .tcol-v'); await page.waitForTimeout(100); r = await page.evaluate(LEER);
  chk('3e «Volver a como estaba» las muestra todas', r.conta.every(function(t){ return t!=='-'; }) && /14 de 14/.test(r.cxBar.txt) && !/Volver a como estaba/.test(r.cxBar.txt), r);
  chk('3f y no queda nada guardado', await page.evaluate(() => localStorage.getItem('me_tbl_conta'))===null);
  // tarjetas: sin barra
  r = await page.evaluate(() => { CX_ANGOSTO=99999; cxLS('me_cx_tabla', null); renderConta(); var b=document.getElementById('cx-tcol'); var h=b.hidden; CX_ANGOSTO=900; renderConta(); return h; });
  chk('3g con las tarjetas (pantalla angosta) la barra no está', r===true, r);

  // ---------- 4. Administración ----------
  await page.evaluate(() => { showView('admin'); admVistaPoner('tabla'); });
  r = await page.evaluate(LEER);
  chk('4a la barra está en la tabla de Administración', r.admBar && !r.admBar.hidden && /16 de 16/.test(r.admBar.txt), r.admBar);
  await page.locator('#tbl-pedidos thead th', { hasText:'Turno' }).click(); await page.waitForTimeout(100); r = await page.evaluate(LEER);
  chk('4b ahora «Turno» ordena: la mañana primero', r.adminCli.slice(0,2).sort().join()==='ANA,DIEGO', r.adminCli);
  await page.locator('#tbl-pedidos thead th', { hasText:'Vehículo' }).click(); await page.waitForTimeout(100); r = await page.evaluate(LEER);
  chk('4c «Vehículo» también (sin camión al final)', r.adminCli[r.adminCli.length-1]==='ANA', r.adminCli);
  await page.evaluate(() => tblColTocar('admin', 2, false)); r = await page.evaluate(LEER);
  chk('4d esconder «Sale de»', r.admin[2]==='-', r.admin);
  await page.close(); page = await abrir(ctx);
  await page.evaluate(() => { showView('admin'); renderAdmin(); }); r = await page.evaluate(LEER);
  chk('4e después de recargar sigue ordenada por Vehículo y sin «Sale de»', /Vehículo ▲/.test(r.admin.join('|')) && r.admin[2]==='-' && r.adminCli[r.adminCli.length-1]==='ANA', r);
  r = await page.evaluate(() => { window.ADM_FICHAS_PRUEBA=1; admVistaPoner('fichas'); return document.getElementById('adm-tcol').hidden; });
  chk('4f con las fichas la barra no está', r===true, r);
  r = await page.evaluate(() => { admVistaPoner('tabla'); tblVolver('admin'); return { k:SORT_KEY, st:document.getElementById('tbl-cols-st').textContent, g:localStorage.getItem('me_tbl_admin') }; });
  chk('4g «Volver a como estaba» en Administración: sin orden, todas las columnas, nada guardado', r.k==='' && r.st.indexOf('tbl-pedidos')<0 && r.g===null, r);
  await ctx.close();

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
