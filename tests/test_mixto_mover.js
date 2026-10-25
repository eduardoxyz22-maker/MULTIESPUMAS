/* 💳 CORREGIR EL ADELANTO DE UN PAGO MIXTO MUEVE SU 2° MÉTODO, NO OTRO COBRO DEL MISMO DÍA (25/10, auditoría Codex/Astra FIN-03, §4mk).

   El caso de la auditoría: venta 2.000, «A cuenta» 1.200 = QR 800 (adelanto) + Efectivo 400 (el 2° método), y un cobro aparte
   Efectivo 100 del MISMO día y recibo; saldo 700. Contabilidad le cambia la fecha al adelanto al mes anterior: tiene que irse con él
   el de 400 (el que cierra el «A cuenta»), no el de 100. Antes se movía el primero que encontraba (el de 100): octubre quedaba
   corrido 300. Total y saldo no cambian.

   Reloj CLAVADO (martes 27/10/2026, 10:00 de Bolivia). Solo datos sintéticos.
   Se corre:  node tests/test_mixto_mover.js   (PEDIDOS=… para correrla contra otra versión) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1300, height:900 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await ctx.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-27T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  const r = await page.evaluate(async () => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    var p={ id:'mx1', oc:'10-401', nota:'900', cliente:'DON MIXTO', celular:'70000009', fecha:'2026-10-22', turno:'AM', zona:'Norte', vendedor:'Carola Chavez',
      productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:2000 }], saldo:700, acuenta:1200, pagado:false,
      metodoPago:textoCobros([{ anticipo:true, metodo:'QR', banco:'BISA', monto:800, fecha:'2026-10-20', nota:'900', comps:['IMG_A'] },
                               { metodo:'Efectivo', monto:100, fecha:'2026-10-20', nota:'900', comps:['IMG_B'] },
                               { metodo:'Efectivo', monto:400, fecha:'2026-10-20', nota:'900', comps:['IMG_C'] }]), ts:new Date('2026-10-20T11:00:00-04:00').getTime(), rev:1 };
    STATE=[p];
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
    apiSave=function(x){ return Promise.resolve({ ok:true, pedido:x }); };
    var antes={ mx:(mixtoDe(p)||{}).monto, total:ventaTotal(p), saldo:Number(p.saldo) };
    showView('conta'); await new Promise(function(r){ setTimeout(r, 150); });
    CTA_EDIT_I=-1; CTA_EDIT_V=null; showContaModal('mx1');
    var iA=-1; contaPagos(findById('mx1')).forEach(function(x,j){ if(x.anticipo && iA<0) iA=j; });
    ctaEditarPago('mx1', iA);
    document.getElementById('cta-ed-fecha').value='2026-09-28';
    ctaGuardarPago('mx1', iA, true); try{ closeModal(); }catch(e){}
    await new Promise(function(r){ setTimeout(r, 200); });
    var q=findById('mx1'), cs=contaPagos(q).map(function(x){ return (x.anticipo?'~':'')+x.metodo+' '+x.monto+' @'+x.fecha; });
    return { antes:antes, cs:cs, total:ventaTotal(q), saldo:Number(q.saldo), acuenta:Number(q.acuenta) };
  });
  chk('(partida) el 2° método es el de 400 (el que cierra «A cuenta» 1.200 con el QR 800)', r.antes.mx===400, r.antes);
  chk('1. el adelanto y SU 2° método (400) pasan al 28/09', r.cs.indexOf('~QR 800 @2026-09-28')>=0 && r.cs.indexOf('Efectivo 400 @2026-09-28')>=0, r.cs);
  chk('2. el cobro aparte de 100 se queda en su día (20/10; antes se movía éste)', r.cs.indexOf('Efectivo 100 @2026-10-20')>=0, r.cs);
  chk('3. total, saldo y «A cuenta» no cambian (2.000 / 700 / 1.200)', r.total===2000 && r.saldo===700 && r.acuenta===1200, r);
  chk('sin errores en la página', !errores.length, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
