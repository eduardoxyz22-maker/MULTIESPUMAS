/* 🐱 LOS DOS AVISOS CON EL GATO — a TODO el equipo, no a una lista.
   Pedido del dueño: *"la alerta que falta adjuntar comprobante, y el gato de meme que sale
   a Isabel, que salga a todos los demás vendedores"*.

   Había dos avisos distintos con la misma imagen:
   · FALTA EL COMPROBANTE — ya salía para las 8 vendedoras (Eduardo Añez y ROHO quedan
     fuera porque su formulario ni siquiera pide método de pago).
   · ESCRIBIÓ UN COMBO — salía SOLO para tres (`MEME_COMBO`), y el resto veía un toast que
     se les pasaba de largo. Eso es lo que se abrió a todos.

   Este test cruza los DOS casos contra TODOS los vendedores, así la lista no puede volver
   a encogerse sin que salte. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1300,height:900} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  const barrido = await page.evaluate(async () => {
    var el=document.getElementById('conn-form'); if(el) el.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    apiSave=function(){ return Promise.resolve({ok:true}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:[]}); };
    STATE=[];
    var d=new Date(), F; do { d.setDate(d.getDate()+1); F=isoLocal(d); } while(diaDomingo(F));
    var out=[];
    for (var k=0;k<VENDEDORES.length;k++) {
      var v=VENDEDORES[k];
      // ---- A) cobra por QR y NO adjunta el comprobante ----
      closeModal(); resetForm();
      document.getElementById('f-vendedor').value=v; applyVendedorLite();
      document.getElementById('f-cliente').value='X'; document.getElementById('f-celular').value='70000000';
      document.getElementById('f-zona').value='Norte'; document.getElementById('f-direccion').value='Av';
      document.getElementById('f-nota').value='1'; document.getElementById('f-oc').value='OC'+k;
      document.getElementById('f-fecha').value=F;
      document.querySelector('#f-productos .prod-desc').value='SOFT ICE';
      document.querySelector('#f-productos .prod-cant').value='1';
      segSet('f-pagado','SI'); updateMetodoVisibility(); segSet('f-metodo','QR'); updateBancoVisibility();
      segSet('f-banco', bancosDeVendedor(v)[0]);
      document.getElementById('f-cobrado').value='100';
      FORM_COMPS=[];
      submitPedido();
      await new Promise(r=>setTimeout(r,150));
      var m=document.getElementById('modal'), abierto=!!(m && m.classList.contains('on'));
      var html=abierto?m.innerHTML:'';
      var compGato = abierto && /combo-instrucciones\.jpg/.test(html) && /Falta el comprobante/i.test(html);
      var compGuardo = abierto && /Pedido guardado/i.test(html);
      closeModal();

      // ---- B) escribe un COMBO ----
      var comboGato = memeCombo(v, 'COMBO ORTOPEDICO');
      var m2=document.getElementById('modal');
      var htmlCombo=(m2 && m2.classList.contains('on'))?m2.innerHTML:'';
      closeModal();

      out.push({ v:v, lite:esVendedorLite(v), compGato:compGato, compGuardo:compGuardo,
                 comboGato:!!comboGato, comboImg:/combo-instrucciones\.jpg/.test(htmlCombo),
                 comboDice:/una línea por producto/i.test(htmlCombo),
                 comboNombra:new RegExp(String(v).split(' ')[0],'i').test(htmlCombo) });
    }
    return out;
  });

  const normales = barrido.filter(r=>!r.lite);
  const lites    = barrido.filter(r=>r.lite);

  // ============ 1. el gato del COMBO, ahora para todos ============
  const sinCombo = barrido.filter(r=>!r.comboGato).map(r=>r.v);
  chk('el gato del COMBO le sale a los '+barrido.length+' vendedores, sin lista',
      sinCombo.length===0, sinCombo.join(', '));
  chk('…con la imagen', barrido.every(r=>r.comboImg));
  chk('…y diciendo cómo cargarlo (una línea por producto)', barrido.every(r=>r.comboDice));
  chk('…y llamándolos por su nombre', barrido.every(r=>r.comboNombra),
      barrido.filter(r=>!r.comboNombra).map(r=>r.v).join(', '));

  // ============ 2. el gato del COMPROBANTE, para todas las vendedoras ============
  const sinComp = normales.filter(r=>!r.compGato).map(r=>r.v);
  chk('el gato de FALTA EL COMPROBANTE le sale a las '+normales.length+' vendedoras',
      sinComp.length===0, sinComp.join(', '));
  chk('Isabel no es un caso especial: le sale lo mismo que a las demás',
      (barrido.filter(r=>/Isabel/.test(r.v))[0]||{}).compGato===true);

  // ============ 3. Eduardo Añez y ROHO quedan fuera del comprobante, a propósito ============
  chk('a Eduardo Añez y ROHO NO se les pide comprobante (su formulario ni pide método)',
      lites.length===2 && lites.every(r=>!r.compGato), lites.map(r=>r.v+':'+r.compGato).join(' '));
  chk('…y el pedido de ellos SÍ se guarda, no queda trabado',
      lites.every(r=>r.compGuardo), lites.map(r=>r.v+':'+r.compGuardo).join(' '));

  // ============ 4. sin nombre elegido, el cartel no queda cojo ============
  const anon = await page.evaluate(() => {
    closeModal();
    memeCombo('', 'COMBO ORTOPEDICO');
    var h=(document.getElementById('modal').querySelector('h3')||{}).textContent||'';
    closeModal();
    return h;
  });
  chk('sin vendedor elegido el título no queda colgando con una coma',
      /combos se cargan por separado/i.test(anon) && !/,\s*…/.test(anon), anon.trim());

  // ============ 5. el combo igual NO se guarda ============
  const bloqueado = await page.evaluate(async () => {
    closeModal(); resetForm(); STATE=[];
    var d=new Date(), F; do { d.setDate(d.getDate()+1); F=isoLocal(d); } while(diaDomingo(F));
    document.getElementById('f-vendedor').value='Isabel Robledo'; applyVendedorLite();
    document.getElementById('f-cliente').value='X'; document.getElementById('f-celular').value='70000000';
    document.getElementById('f-zona').value='Norte'; document.getElementById('f-direccion').value='Av';
    document.getElementById('f-nota').value='1'; document.getElementById('f-fecha').value=F;
    document.querySelector('#f-productos .prod-desc').value='COMBO ORTOPEDICO';
    document.querySelector('#f-productos .prod-cant').value='1';
    segSet('f-pagado','NO');
    submitPedido();
    await new Promise(r=>setTimeout(r,250));
    return STATE.length;
  });
  chk('el pedido con combo sigue SIN guardarse (el gato no lo deja pasar)', bloqueado===0, bloqueado);

  chk('sin errores JS', errors.length===0, errors.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
