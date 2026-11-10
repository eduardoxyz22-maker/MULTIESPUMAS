// 🏪 En una REPOSICIÓN de tienda (RPT) las BOLSAS sí viajan (la tienda las pide a fábrica); protectores y sábanas no (dueño, 10/11).
// (10/11, dueño y David Alba: «se abre y solo muestra el colchón… no muestra las bolsas».) En una VENTA sigue como antes (24/10).
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,300)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_u2_turno.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));
(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('dialog', d=>d.accept());
  await page.clock.setFixedTime(new Date('2026-11-10T09:10:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');
  const r = await page.evaluate(async()=>{
    var BOL=function(m){ return _lin('|BOLSA PARA COLCHON|'+m, 2, {}); };
    var rpt=_ped('r1','2026-11-10','AM',[ _lin('CH1221|COLCHON TITANIO ICE|180x190',1,{chk:'ok', chkDe:'Almacen Distribucion Banzer'}), BOL('160x190'), BOL('180x190'), BOL('105x190'), BOL('200x200'), _lin('|PROTECTOR DE COLCHON|180x190',3,{}), _lin('|JUEGO DE SABANAS|180x190',1,{}) ],
                 { oc:'RPT 11-006', cliente:'Central', vendedor:'Isabel Robledo', observaciones:'PONER EN EXHIBICION' });
    var vta=_ped('v1','2026-11-10','AM',[ _lin('CH1221|COLCHON TITANIO ICE|180x190',1,{chk:'ok'}), _lin('|PROTECTOR DE COLCHON|180x190',2,{}) ],
                 { oc:'11-200', cliente:'CLIENTE PRUEBA', celular:'70000077', vendedor:'Isabel Robledo' });
    await _cargar([rpt, vta], _stock(function(){}));
    var out={}, box=document.getElementById('modal-box'), t=function(sel){ var e=box.querySelector(sel); return e?e.textContent.replace(/\s+/g,' '):''; };
    out.sonTienda=rpt.productos.slice(1).every(esProdDeTienda);
    out.viajan=rpt.productos.map(function(x){ return !deTiendaNoViaja(rpt, x); });
    showPedidoModal('r1');
    out.rFilas=[].map.call(box.querySelectorAll('.fl-prod'), function(e){ return e.textContent.replace(/\s+/g,' ').trim().slice(0,60); });
    out.rBultos=t('.fl-bultos'); out.rTiendita=t('.fl-tiendita'); out.rQue=t('.fl-que')||box.textContent.replace(/\s+/g,' ').slice(0,400);
    closeModal && closeModal();
    showPedidoModal('v1');
    out.vFilas=[].map.call(box.querySelectorAll('.fl-prod'), function(e){ return e.textContent.replace(/\s+/g,' ').trim().slice(0,60); });
    out.vBultos=t('.fl-bultos'); out.vTiendita=t('.fl-tiendita');
    closeModal && closeModal();
    // la ficha rápida de Administración y «Lo del día, por lugar»
    var dn={}; try{ out.afR=admFichaHtml(rpt, dn).replace(/<[^>]+>/g,' ').replace(/\s+/g,' '); out.afV=admFichaHtml(vta, dn).replace(/<[^>]+>/g,' ').replace(/\s+/g,' '); }catch(e){ out.afErr=String(e); }
    out.colR=admFichaColor(rpt); out.colV=admFichaColor(vta);
    var D1=admLugaresDatos('2026-11-10'); out.lugSin=D1.sin;
    // marcar una bolsa «✔ PTF» y ver que entra en «acá»
    var q=STATE.filter(function(x){ return x.id==='r1'; })[0]; q.productos[1].chk='ok'; var D2=admLugaresDatos('2026-11-10'); out.lugAca=D2.C.aca.some(function(x){ return /BOLSA/.test(x.t); }); out.lugSin2=D2.sin;
    // el stock NO cambia: las bolsas siguen sin ser stock
    out.stockBolsa=(stockData().lista||[]).some(function(o){ return /BOLSA/i.test(o.desc||''); });
    return out;
  });
  chk('0 · las bolsas son «de tienda» (la regla del stock no cambió)', r.sonTienda===true && r.stockBolsa===false, { t:r.sonTienda, s:r.stockBolsa });
  chk('1 · RPT: la ficha muestra los 5 renglones (el colchón y las 4 bolsas)', r.rFilas.length===5 && r.rFilas.filter(x=>/BOLSA PARA COLCHON/.test(x)).length===4, r.rFilas);
  chk('2 · RPT: cuenta 9 bultos (1 colchón + 8 bolsas); el protector y las sábanas NO se cargan (línea «De tienda»)', /9 bultos/.test(r.rBultos) && /1 colchón\b/.test(r.rBultos) && /8 otros/.test(r.rBultos) && /3 protector de colchon/.test(r.rTiendita) && /1 juego de sabanas/.test(r.rTiendita) && !/bolsa/.test(r.rTiendita), { b:r.rBultos, t:r.rTiendita });
  chk('2b · RPT: viajan el colchón y las bolsas; el protector y las sábanas no', JSON.stringify(r.viajan)==='[true,true,true,true,true,false,false]', r.viajan);
  chk('3 · VENTA: sigue igual — solo el colchón, 1 bulto, y el protector en la línea «De tienda»', r.vFilas.length===1 && /1 bulto\b/.test(r.vBultos) && /protector de colchon/.test(r.vTiendita), { f:r.vFilas, b:r.vBultos, t:r.vTiendita });
  chk('4 · ficha rápida de Administración: la RPT lista las bolsas; la venta no lista el protector como carga', !r.afErr && /BOLSA PARA COLCHON/.test(r.afR||'') , { e:r.afErr, r:(r.afR||'').slice(0,200) });
  chk('5 · color de la ficha rápida: la RPT con bolsas sin marcar NO sale «lista»', r.colR!=='stock', { r:r.colR, v:r.colV });
  chk('6 · «Lo del día, por lugar»: las 4 bolsas cuentan como «sin revisar» y, marcada ✔ una, aparece para cargar en PTF', r.lugSin===4 && r.lugAca===true && r.lugSin2===3, { sin:r.lugSin, sin2:r.lugSin2, aca:r.lugAca });
  chk('sin errores en la página', errs.length===0, errs);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
