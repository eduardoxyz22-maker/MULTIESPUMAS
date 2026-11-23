/* 🗓️ «EFECTIVO · Bs X sin entregar · N días (desde el …)» DICE LO MISMO QUE LA VENTANA (23/11/2026; captura del dueño con Fernando: «una
   cosa acá y otra acá»: la tira decía «18 días · desde el 05/11» y «Efectivo por retirar», «el más viejo del 21/11 (hace 2 días)»).
   Datos inventados, reloj clavado el lunes 23/11/2026 11:00 de Bolivia:
     · un cobro del 05/11 de Bs 4.760 y tres del 21/11 (1.020 + 300 + 850 = 2.170); un retiro del 23/11 de Bs 4.760 tapa el del 05/11;
     · lo que queda (Bs 2.170) es de los tres del 21/11: «2 días», «desde el 21/11», igual que la ventana.
   Y un control: sin retiros, el más viejo sigue siendo el primero del mes.
   Se corre:  node tests/test_efectivo_desde.js   (PEDIDOS=… para correrla contra otra versión) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1280, height:900 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await ctx.route(/^https:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-11-23T11:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  const r = await page.evaluate(async () => {
    CONNECTED=true; UNLOCKED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR=''; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    var esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
    var P=function(id, v, cli, cobros, ts){ return { id:id, oc:'11-'+id.replace(/\D/g,''), vendedor:v, cliente:cli, celular:'70001001', zona:'Norte', turno:'AM', nota:'9'+id.replace(/\D/g,''),
      fecha:'2026-11-28', productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:9000 }], saldo:0, acuenta:0, pagado:false,
      ts:new Date(ts+'T10:00:00-04:00').getTime(), metodoPago:textoCobros(cobros.map(function(c, i){ return Object.assign({ metodo:'Efectivo', nota:String(100+i) }, c); })) }; };
    var R=function(id, v, monto, dia){ return { id:'__ret_'+id+'__', fecha:'', cliente:'💵 RETIRO DE EFECTIVO — fila del sistema, NO BORRAR', vendedor:v, chofer:'Contabilidad',
      acuenta:monto, zona:'FACTURADO', nota:'', ts:new Date(dia+'T12:00:00-04:00').getTime() }; };
    var L=[
      P('f1', 'Fernando Peinado', 'CLIENTE VIEJO', [{ monto:4760, fecha:'2026-11-05' }], '2026-11-05'),
      P('f2', 'Fernando Peinado', 'CLIENTE UNO', [{ monto:1020, fecha:'2026-11-21' }], '2026-11-21'),
      P('f3', 'Fernando Peinado', 'CLIENTE DOS', [{ monto:300, fecha:'2026-11-21' }], '2026-11-21'),
      P('f4', 'Fernando Peinado', 'CLIENTE TRES', [{ monto:850, fecha:'2026-11-21' }], '2026-11-21'),
      R('f1', 'Fernando Peinado', 4760, '2026-11-23'),
      P('m1', 'Mirian Salazar', 'CLIENTE SIN RETIRO', [{ monto:600, fecha:'2026-11-10' }], '2026-11-10'),
      P('m2', 'Mirian Salazar', 'CLIENTE OTRO', [{ monto:400, fecha:'2026-11-18' }], '2026-11-18')
    ];
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(L)) }); };
    apiSave=function(x){ return Promise.resolve({ ok:true, pedido:x }); };
    await refrescarEstado(); await esperar(150);
    var ef=function(v){ return alDiaCalcular(v).D.filter(function(d){ return d.k==='ef'; })[0]; };
    var F=ef('Fernando Peinado'), M=ef('Mirian Salazar');
    var mano=null; try{ var D=efeManoDatos('Fernando Peinado'); mano=D && D.P[0] ? { viejo:D.P[0].viejo, dias:D.P[0].dias, tot:D.P[0].tot } : null; }catch(e){ mano={ err:String(e) }; }
    return { F:{ bs:F.bs, dias:F.dias, s:F.s, corto:alDiaCorto(F) }, M:{ bs:M.bs, dias:M.dias, s:M.s }, mano:mano };
  });
  chk('Fernando: Bs 2.170 sin entregar (lo que el retiro del 23/11 no tapó)', Math.abs(r.F.bs-2170)<0.01, r.F);
  chk('…desde el 21/11 y hace 2 días (no «desde el 05/11 · 18 días»)', r.F.dias===2 && /desde el 21\/11/.test(r.F.s) && /2 días/.test(r.F.corto), r.F);
  chk('…lo mismo que dice «Efectivo por retirar»', !r.mano || (r.mano.viejo==='2026-11-21' && r.mano.dias===r.F.dias), r.mano);
  chk('control: sin retiros, desde el primer cobro del mes (10/11, 13 días)', Math.abs(r.M.bs-1000)<0.01 && r.M.dias===13 && /desde el 10\/11/.test(r.M.s), r.M);
  chk('sin errores en la página', !errores.length, errores);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exitCode = FAIL ? 1 : 0;
})().catch(e=>{ console.error(e); process.exitCode=2; });
