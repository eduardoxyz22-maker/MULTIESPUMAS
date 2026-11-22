// 📷 (22/11, idea 455) La foto de cada producto (`prodFotoDe` / `prodFotoImg` / `pfotoVer`), en lugar del dibujito de la idea 211.
// Dueño, con la muestra de las fotos de su Drive: «Si ármalo». Una foto por LÍNEA; lo que no tiene foto sigue con el dibujito.
// Solo mira: el `alt` va vacío (no suma letras) y tocarla no cambia el tilde de la Lista de carga. Datos inventados.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_u2_turno.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));
(async()=>{
  const browser = await chromium.launch({ executablePath:process.env.CHROME_PATH||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('dialog', d=>d.accept());
  await page.clock.setFixedTime(new Date('2026-11-22T09:10:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');

  /* ── 0. Apagado en Playwright: el dibujito de siempre ── */
  const r0 = await page.evaluate(()=>({ va:prodFotoVa(), k:prodFotoDe({ codigo:'CH1129', desc:'TITANIO LATEX' }), h:prodIcoHtml({ codigo:'CH1129' }) }));
  chk('0 · sin FOTO_PRUEBA no hay foto: sigue el dibujito', !r0.va && r0.k==='' && /^<svg/.test(r0.h), r0);

  /* ── 1. Qué línea tiene foto ── */
  const r1 = await page.evaluate(()=>{
    window.FOTO_PRUEBA=1;
    var C=[
      [{ codigo:'CH1129', desc:'TITANIO LATEX', medida:'140x190' }, 'titanio-latex'],
      [{ codigo:'', desc:'COLCHON TITANIO LATEX', medida:'160x200' }, 'titanio-latex'],
      [{ codigo:'', desc:'Colchón Titanio Látex 2 plazas', medida:'140x190' }, 'titanio-latex'],
      [{ codigo:'CH1150', desc:'SOMIER TITANIO LATEX', medida:'160x190' }, 'somier-titanio-latex'],
      [{ codigo:'', desc:'SOMIER TITANIO LATEX', medida:'200x200' }, 'somier-titanio-latex'],
      [{ codigo:'CH1156', desc:'SOMIER ESPECIAL', medida:'180x190' }, 'somier-especial'],
      /* sin foto: otra línea, otra cosa con el mismo nombre, el combo, lo que el código dice que es otro */
      [{ codigo:'CH1220', desc:'TITANIO ICE', medida:'140x190' }, ''],
      [{ codigo:'CH1212', desc:'SOMIER TITANIO ICE', medida:'140x190' }, ''],
      [{ codigo:'', desc:'PROTECTOR TITANIO LATEX', medida:'140x190' }, ''],
      [{ codigo:'', desc:'SOMIER ESPECIAL TROPICAL', medida:'140x190' }, ''],
      [{ codigo:'', desc:'ESPECIAL SEMIORTOPEDICO', medida:'140x190' }, ''],
      [{ codigo:'CD1403', desc:'TITANIO LATEX', medida:'50x70' }, ''],
      [{ codigo:'CMBSE002', desc:'COMBO SUEÑA ESSENTIAL', medida:'140x190' }, ''],
      [{ codigo:'', desc:'', medida:'' }, '']
    ];
    return C.map(function(c){ var k=prodFotoDe(c[0]); return { d:(c[0].codigo?c[0].codigo+' ':'')+c[0].desc, quiero:c[1], da:k, ok:k===c[1] }; });
  });
  const mal1=r1.filter(x=>!x.ok);
  chk('1 · '+r1.length+' renglones: la foto de su línea, o ninguna', mal1.length===0, mal1);

  /* ── 2. La foto en lugar del dibujito: sin letras, con su archivo ── */
  const r2 = await page.evaluate(()=>{
    var h=prodIcoHtml({ codigo:'CH1129' }), d=new DOMParser().parseFromString('<div>'+h+'</div>','text/html'), im=d.querySelector('img');
    var h2=prodIcoHtml({ codigo:'CH1220' });
    return { img:!!im, src:im&&im.getAttribute('src'), alt:im&&im.getAttribute('alt'), txt:d.body.textContent, cls:im&&im.className, ice:/^<svg/.test(h2), lineas:PFOTO_LINEAS.map(function(a){ return a[1]; }) };
  });
  chk('2a · un Titanio Latex lleva su foto (img, alt vacío, sin letras)', r2.img && r2.alt==='' && r2.txt==='' && /^fotos-productos\/titanio-latex\.jpg\?v=/.test(r2.src) && /\bpfoto\b/.test(r2.cls), r2);
  chk('2b · un Titanio Ice (sin foto todavía) sigue con el dibujito', r2.ice, r2);
  const raiz = path.resolve(__dirname, '..');
  const faltan = r2.lineas.filter(k=>!fs.existsSync(path.join(raiz,'fotos-productos',k+'.jpg')) || !fs.existsSync(path.join(raiz,'fotos-productos','grande',k+'.jpg')));
  chk('2c · cada línea de PFOTO_LINEAS tiene su foto chica y la grande', faltan.length===0, faltan);
  const pesos = r2.lineas.map(k=>fs.statSync(path.join(raiz,'fotos-productos',k+'.jpg')).size);
  chk('2d · las chicas pesan menos de 25 KB cada una', pesos.every(n=>n<25000), pesos);

  /* ── 3. El formulario: la foto aparece al poner el código y se va al cambiarlo ── */
  const r3 = await page.evaluate(async()=>{
    showView('form'); await new Promise(r=>setTimeout(r,60));
    var box=document.getElementById('f-productos'); box.innerHTML=''; addProdRow();
    var card=box.querySelector('.prod-card'), fo=card.querySelector('.prod-foto'), c=card.querySelector('.prod-codigo');
    var antes={ hay:!!fo, oculto:fo&&fo.hidden };
    c.value='CH1129'; c.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,30));
    var con={ oculto:fo.hidden, k:fo.getAttribute('data-k'), img:!!fo.querySelector('img.pfoto'), desc:card.querySelector('.prod-desc').value };
    c.value='CD1403'; c.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,30));
    var otro={ oculto:fo.hidden, img:!!fo.querySelector('img') };
    var d=card.querySelector('.prod-desc'); c.value=''; d.value='SOMIER TITANIO LATEX'; d.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,30));
    var escrito={ oculto:fo.hidden, k:fo.getAttribute('data-k') };
    return { antes, con, otro, escrito };
  });
  chk('3a · un renglón nuevo trae el lugar de la foto, escondido', r3.antes.hay && r3.antes.oculto, r3.antes);
  chk('3b · con el código CH1129 aparece la foto del Titanio Latex', !r3.con.oculto && r3.con.k==='titanio-latex' && r3.con.img, r3.con);
  chk('3c · con el código de una almohada se va', r3.otro.oculto && !r3.otro.img, r3.otro);
  chk('3d · escrito a mano «SOMIER TITANIO LATEX» también la pone', !r3.escrito.oculto && r3.escrito.k==='somier-titanio-latex', r3.escrito);

  /* ── 4. Tocar la foto: la ve grande y NO cambia el tilde de la Lista de carga ── */
  const r4 = await page.evaluate(async()=>{
    var w=document.createElement('div'); w.setAttribute('data-carga-lugar','1');
    w.innerHTML='<label><input type="checkbox" id="__pf_chk">'+prodIcoHtml({ codigo:'CH1150' })+'<span>SOMIER TITANIO LATEX</span></label>';
    document.body.appendChild(w);
    var im=w.querySelector('img.pfoto'); im.click(); await new Promise(r=>setTimeout(r,250));
    var ov=document.getElementById('pfoto-ov'), big=document.getElementById('pfoto-ov-img');
    var r={ chk:document.getElementById('__pf_chk').checked, abierto:!!ov && ov.style.display!=='none', src:big&&big.getAttribute('src'), nom:(document.getElementById('pfoto-ov-n')||{}).textContent,
            ancho:getComputedStyle(im).width, cargo:big&&big.naturalWidth };
    document.dispatchEvent(new KeyboardEvent('keydown',{ key:'Escape', bubbles:true }));
    r.cerro=ov.style.display==='none';
    w.querySelector('span').click(); r.chkTexto=document.getElementById('__pf_chk').checked;
    w.remove(); return r;
  });
  chk('4a · tocar la foto abre la grande', r4.abierto && /^fotos-productos\/grande\/somier-titanio-latex\.jpg/.test(r4.src) && /Somier Titanio Latex/.test(r4.nom), r4);
  chk('4b · y no tilda la línea de la carga', r4.chk===false, r4);
  chk('4c · la grande se carga de verdad', r4.cargo>0, r4);
  chk('4d · Esc la cierra; tocar el nombre sigue tildando como siempre', r4.cerro && r4.chkTexto===true, r4);
  chk('4e · en la Lista de carga la foto es más grande que el dibujito (58 px)', r4.ancho==='58px', r4.ancho);

  chk('9 · sin errores de la página', errs.length===0, errs);
  console.log(`\n${PASS} bien, ${FAIL} mal`);
  await browser.close(); process.exit(FAIL?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
