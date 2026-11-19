/* 🎨 AL GUARDAR, LO QUE FALTA SE MARCA EN EL MISMO CAMPO (16/11/2026, mejora 392; el dueño la eligió en «Mejoras visuales 390-440»).
   Antes el aviso «Falta: celular, zona» salía abajo a la izquierda, lejos del formulario, y «con qué pagó» recién en el segundo intento.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin `FALTA_CAMPO_PRUEBA` (Playwright): el aviso de siempre («Falta: celular, zona. Está marcado en rojo (*).») y ninguna frase nueva.
   2. Con la bandera: debajo de CADA campo que falta una frase roja (celular, zona y «con qué pagó» a la vez), sin el aviso de la esquina
      (el texto queda para lectores de pantalla), la barra de pasos con «!» en Cliente, Entrega y Cobro, y «Para guardar · faltan 3» con
      los que faltan en rojo.
   3. Guardar sigue frenando: no se guardó nada.
   4. Al escribir el celular, su frase se va; al tocar Efectivo, la del pago; con todo listo, ningún «!».
   5. Volver a empezar (formulario nuevo) no deja frases viejas.
   Datos SINTÉTICOS. Reloj clavado el lunes 16/11/2026 10:00. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_v392_falta_campo.js */
const { chromium } = require('playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  await ev(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:[] }); };
    window.__saves=0; apiSave=function(r){ window.__saves++; return Promise.resolve({ ok:true, pedido:r }); };
    window.FP_PRUEBA=1;
    window.__esp=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
    window.__llenar=function(){
      showView('form'); resetForm();
      var set=function(id,v){ var e=document.getElementById(id); e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); };
      set('f-vendedor','Carola Chavez'); set('f-cliente','CLIENTE DE PRUEBA'); set('f-nota','1188'); set('f-fecha','2026-11-17');
      var card=document.querySelector('#f-productos .prod-card'), co=card.querySelector('.prod-codigo'); co.value='CH1201'; co.dispatchEvent(new Event('input',{bubbles:true}));
      var pr=card.querySelector('.prod-precio'); pr.value='4290'; pr.dispatchEvent(new Event('input',{bubbles:true}));
      [].filter.call(document.querySelectorAll('#f-pagado button'), function(b){ return b.getAttribute('data-val')==='SI'; })[0].click();
    };
    window.__mirar=function(){
      return { frases:[].map.call(document.querySelectorAll('#view-form .p392-falta'), function(d){ return [d.getAttribute('data-k'), d.textContent.replace(/^!/,'')]; }),
        toast:((document.getElementById('toast')||{}).textContent||'').replace(/\s+/g,' '), sr:(document.getElementById('p392-sr')||{}).textContent||'',
        barra:[].map.call(document.querySelectorAll('#fp-barra .fp-b'), function(b){ return (b.classList.contains('p392-b')?'!':'')+b.textContent.replace(/^[!✓\d]/,''); }),
        mal:[].map.call(document.querySelectorAll('#view-form .p392-mal'), function(e){ return e.id; }),
        der:(document.querySelector('#fx-der .p392-n')||{}).textContent||'', rojos:document.querySelectorAll('#fx-der .p392-r').length };
    };
  });

  console.log('\n── 1. Sin la bandera ──');
  let r = await ev(async () => { __llenar(); await __esp(300); document.getElementById('f-submit').click(); await __esp(300); return __mirar(); });
  chk('1a el aviso de siempre: «Falta: celular, zona. Está marcado en rojo (*).»', /Falta: celular, zona\. Está marcado en rojo/.test(r.toast), r.toast);
  chk('1b ninguna frase nueva', r.frases.length===0 && r.mal.length===0, r);

  console.log('\n── 2. Con la bandera ──');
  r = await ev(async () => { window.FALTA_CAMPO_PRUEBA=1; var t=document.getElementById('toast'); if(t){ t.textContent=''; t.className=''; }
    __llenar(); await __esp(300); document.getElementById('f-submit').click(); await __esp(350); return __mirar(); });
  const k=r.frases.map(f=>f[0]).join('|');
  chk('2a una frase debajo de cada campo que falta, todo a la vez: celular, zona y con qué pagó', k==='Celular|Zona|Saldo o pagado' &&
      /Falta el celular del cliente \(8 números, ej\. 71234567\)/.test(r.frases[0][1]) && /Falta la zona: escribila o pegá la ubicación y se pone sola/.test(r.frases[1][1]) &&
      /Falta con qué pagó: tocá Efectivo, QR o Tarjeta/.test(r.frases[2][1]), r.frases);
  chk('2b los campos con el borde rojo', r.mal.indexOf('f-celular')>=0 && r.mal.indexOf('f-zona')>=0 && r.mal.indexOf('f-metodo')>=0, r.mal);
  chk('2c sin el aviso de la esquina; el texto queda para lectores de pantalla', !/Falta:/.test(r.toast) && /^Falta: celular, zona\./.test(r.sr), [r.toast, r.sr]);
  chk('2d la barra de pasos: «!» en Cliente, Entrega y Cobro; Productos listo', r.barra.join('|')==='!Cliente|Productos|!Entrega|!Cobro', r.barra);
  chk('2e «Para guardar · faltan 3» con los tres en rojo (con «Tu pedido» a la vista)', !(await ev(()=>fxAncho())) || (r.der==='faltan 3' && r.rojos===3), [r.der, r.rojos]);
  r.saves = await ev(() => window.__saves);
  chk('3 Guardar sigue frenando: no se guardó nada', r.saves===0, r.saves);

  console.log('\n── 4. Se van solas ──');
  r = await ev(async () => { var c=document.getElementById('f-celular'); c.value='71234567'; c.dispatchEvent(new Event('input',{bubbles:true})); await __esp(350); return __mirar(); });
  chk('4a escribir el celular saca su frase (y su borde)', r.frases.map(f=>f[0]).join('|')==='Zona|Saldo o pagado' && r.mal.indexOf('f-celular')<0, r);
  chk('4b el «!» de Cliente se va', r.barra[0]==='Cliente', r.barra);
  r = await ev(async () => { [].filter.call(document.querySelectorAll('#f-metodo button'), function(b){ return b.getAttribute('data-val')==='Efectivo'; })[0].click(); await __esp(350); return __mirar(); });
  chk('4c tocar Efectivo cambia o saca la frase del pago (ya no dice «con qué pagó»)', r.frases.every(f=>!/con qué pagó/.test(f[1])), r.frases);
  r = await ev(async () => { var z=document.getElementById('f-zona'); z.value='Norte'; z.dispatchEvent(new Event('input',{bubbles:true})); await __esp(350); return __mirar(); });
  chk('4d con la zona, su frase se va', r.frases.every(f=>f[0]!=='Zona') && r.barra[2]==='Entrega', r);

  console.log('\n── 5. Formulario nuevo ──');
  r = await ev(async () => { resetForm(); await __esp(250); return __mirar(); });
  chk('5 un formulario nuevo no deja frases ni «!»', r.frases.length===0 && r.barra.every(b=>b[0]!=='!'), r);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
