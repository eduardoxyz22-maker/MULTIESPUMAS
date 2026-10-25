/* 🎨 CUATRO ARREGLOS VISUALES DE LA AUDITORÍA DE CODEX/ASTRA (25/10, §4mn; el dueño: «Sí, hacé los 4 arreglos»).

   LO QUE CUIDA (en compu, iPad acostado y parado; el equipo usa PC):
   1. UI-01 · Venta de tienda: el formulario ya no cae en la columna angosta de la agenda (340 px en 1440, 236 en 1180) y el selector de la
      tienda se puede usar (medía 18 px en todos los anchos). Sin una columna vacía; en 820 como siempre.
   2. UI-02 · Los tres montos de Ventas (Vendido · Ya cobrado · Falta cobrar) van enteros, sin «…», con siete cifras, en 1180 y 1440.
   3. UI-04 · Los botones naranjas («Ver quiénes», «Ver stock»…): la letra se lee (contraste ≥ 4,5:1 en las dos puntas del degradé).
   4. Las etiquetas de los botones de cada ficha de Administración: 11 px o más en compu e iPad; en un celular de 320 px los seis entran.

   Reloj CLAVADO (martes 27/10/2026, 10:00 de Bolivia). Solo datos sintéticos.
   Se corre:  node tests/test_visual_4mn.js   (PEDIDOS=… para correrla contra otra versión) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

const PREPARAR = async () => {
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  var lk=document.getElementById('admin-lock'); if(lk) lk.style.display='none';
  var ac=document.getElementById('admin-content'); if(ac) ac.style.display='block';
  var n=0, P=function(o){ n++; return Object.assign({ id:'p'+n, oc:'10-'+(100+n), nota:String(5000+n), cliente:'CLIENTE '+n, celular:'7000000'+n, fecha:proximoDiaEntrega(), turno:'AM',
    zona:'Norte', direccion:'CALLE '+n, vendedor:'Maria Flores', productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:3000 }],
    saldo:3000, acuenta:0, pagado:false, metodoPago:'', ts:new Date('2026-10-20T10:00:00-04:00').getTime(), rev:1 }, o); };
  /* una venta de siete cifras (para los montos) y pedidos para las fichas */
  STATE=[ P({ productos:[{ desc:'LOTE GRANDE', cant:1, precio:1255567.89 }], saldo:1255567.89, fecha:'2026-10-26' }), P(), P({ turno:'PM' }) ];
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
  apiSave=function(x){ return Promise.resolve({ ok:true, pedido:x }); };
};
const contraste=(rgb, hex)=>{ const L=(r,g,b)=>{ const f=c=>{ c/=255; return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4); }; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); };
  const m=rgb.match(/\d+/g).map(Number), h=hex.replace('#',''), q=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16));
  const a=L(m[0],m[1],m[2]), b=L(q[0],q[1],q[2]); return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05); };

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  for (const [w,h] of [[1440,1000],[1180,820],[820,1180],[320,700]]) {
    const ctx = await browser.newContext({ viewport:{ width:w, height:h }, timezoneId:'America/La_Paz', hasTouch:w<700 });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(w+': '+e.message)); page.on('dialog', d => d.accept());
    await ctx.route(/^https:\/\//, r => r.abort());
    await page.addInitScript(() => { window.ADM_FICHAS_PRUEBA=1; window.CX_TOP_PRUEBA=1; window.FP_PRUEBA=1; });
    await page.clock.setFixedTime(new Date('2026-10-27T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate(PREPARAR);
    const r = await page.evaluate(async () => {
      var o={};
      // 1 · venta de tienda
      showView('conta'); await new Promise(function(res){ setTimeout(res, 200); });
      abrirVentaTienda(); await new Promise(function(res){ setTimeout(res, 400); });
      var fc=document.querySelector('#view-form .form-card'), der=document.getElementById('fx-der'), sel=document.getElementById('f-tienda-suc');
      var F=fc.getBoundingClientRect(), D=der && der.getClientRects().length ? der.getBoundingClientRect() : null;
      o.tienda={ form:Math.round(F.width), sel:Math.round(sel.getBoundingClientRect().width), opciones:sel.options.length,
                 derAlLado: D ? (D.left>=F.right-2) : null, huecoDer: D ? Math.round(innerWidth-D.right) : Math.round(innerWidth-F.right) };
      cancelarVentaTienda(); await new Promise(function(res){ setTimeout(res, 200); });
      // 2 · los montos de Ventas
      try{ segSet('cta-mode','todo'); }catch(e){}
      try{ segSet('cta-tab','ventas'); setContaTab('ventas'); }catch(e){}
      try{ renderConta(); }catch(e){}
      await new Promise(function(res){ setTimeout(res, 300); });
      o.montos=[].slice.call(document.querySelectorAll('#cx-top .lb-tres b')).map(function(e){ return { t:e.textContent.trim(), entero:e.scrollWidth<=e.clientWidth+1, ell:getComputedStyle(e).textOverflow }; });
      var bn=document.querySelector('#cx-top .ah-go-a') || (function(){ var x=document.createElement('button'); x.className='ah-go ah-go-a'; x.textContent='Ver quiénes'; document.body.appendChild(x); return x; })();
      o.naranja={ color:getComputedStyle(bn).color };
      // 4 · las etiquetas de las fichas
      showView('admin'); await new Promise(function(res){ setTimeout(res, 300); }); try{ renderAdmin(); }catch(e){}
      var f=document.querySelector('#adm-fichas .af-f'), tb=f && f.querySelector('.af-tb'), sm=f && f.querySelector('.af-tb small');
      o.fichas=f ? { fs:parseFloat(getComputedStyle(sm).fontSize), cabe: tb.scrollWidth<=f.clientWidth+1,
                     tapadas:[].slice.call(tb.querySelectorAll('button')).filter(function(b){ var s=b.querySelector('small'); return s && s.scrollWidth>b.clientWidth+1; }).length } : null;
      return o;
    });
    const tag = w+'×'+h;
    if (w>=1120) {
      chk(`1·${tag}. venta de tienda: el formulario usa el ancho (antes ${w===1440?340:236} px) y el pedido en vivo queda al lado, sin columna vacía`,
          r.tienda.form>=(w>=1300?560:520) && r.tienda.derAlLado!==false && r.tienda.huecoDer<w*0.2, r.tienda);
    } else chk(`1·${tag}. venta de tienda: el formulario ocupa su ancho de siempre`, r.tienda.form>=Math.min(560, w-44), r.tienda);
    chk(`1·${tag}. …y el selector de la tienda se puede usar (≥ 160 px, antes 18), con sus ${r.tienda.opciones} tiendas`, r.tienda.sel>=160 && r.tienda.opciones>=5, r.tienda);
    if (w>=820) chk(`2·${tag}. Vendido / Ya cobrado / Falta cobrar enteros, sin «…» (con una venta de Bs 1.255.568: Bs 1.261.568)`,
          r.montos.length===3 && r.montos.every(m=>m.entero && m.ell!=='ellipsis') && r.montos.some(m=>/1\.261\.568/.test(m.t)), r.montos);
    const cr = [contraste(r.naranja.color,'#F7A928'), contraste(r.naranja.color,'#E07B06')].map(x=>Math.round(x*100)/100);
    chk(`3·${tag}. el botón naranja se lee: contraste ${cr.join(' y ')} (antes 1,97 y 3,00)`, cr.every(x=>x>=4.5), [r.naranja, cr]);
    if (w>=820) chk(`4·${tag}. las etiquetas de los botones de la ficha: ≥ 11 px (antes 9,6) y todas entran`, r.fichas && r.fichas.fs>=11 && r.fichas.cabe && r.fichas.tapadas===0, r.fichas);
    else chk(`4·${tag}. en el celular de 320 px los seis botones de la ficha entran y ninguna etiqueta se sale`, r.fichas && r.fichas.cabe && r.fichas.tapadas===0 && r.fichas.fs>=9.5, r.fichas);
    await ctx.close();
  }
  chk('sin errores en la página', !errores.length, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
