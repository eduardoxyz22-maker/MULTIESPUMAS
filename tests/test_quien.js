/* 👋 ¿QUIÉN ESTÁ USANDO EL PANEL? (12/10, dueño: «falta que al entrar al panel cada vendedor se identifique»).
   Lo que cuida:
   1. En las pruebas automáticas no sale (taparía todo) salvo `window.QUIEN_PRUEBA`.
   2. Al abrir el panel sale la ventana con todos los vendedores, «Soy de logística» y «Administración».
   3. Tocar un nombre lo recuerda en el aparato (el mismo «Tu nombre» de siempre), lo pone en el formulario y en Mis pedidos, y cierra.
   4. Recargar la MISMA pestaña no vuelve a preguntar; una pestaña nueva sí, con «Sigo siendo …» primero.
   5. «Soy de logística» olvida el nombre y la próxima vez ofrece «Sigo en Logística».
   6. La ventana de Eduardo dice «¿No sos Mirian?» y abre la ventana para cambiar.
   7. Sin scroll de costado en 390 px. Sin errores.
   Datos SINTÉTICOS. Se corre:  node tests/test_quien.js   (desde la raíz) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const ARCH='file://'+(process.env.PEDIDOS||path.resolve('pedidos.html'));
const FOTOS=process.env.FOTOS||'';

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1180, height:860 }, timezoneId:'America/La_Paz' });
  const nueva = async (con, vp) => {
    const page = await ctx.newPage(); if(vp) await page.setViewportSize(vp);
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await page.route(/^https?:/, r => r.abort());
    if (con) await page.addInitScript(() => { window.QUIEN_PRUEBA=1; window.ASIS_PRUEBA=1; });
    if (FOTOS) await page.emulateMedia({ reducedMotion:'reduce' });
    await page.goto(ARCH, { waitUntil:'load' }); await page.waitForTimeout(1700);
    return page;
  };
  const ev=async (pg, fn, arg) => { try{ return await pg.evaluate(fn, arg); }catch(e){ return { __error:String(e.message||e).slice(0,300) }; } };
  const vis=() => { var b=document.getElementById('quien'); return !!b && !b.hidden && getComputedStyle(b).display!=='none'; };

  console.log('\n── 1. En las pruebas automáticas no sale ──');
  let p0=await nueva(false); chk('sin QUIEN_PRUEBA no hay ventana', await ev(p0, vis)===false); await p0.close();

  console.log('\n── 2-3. Al entrar ──');
  let p=await nueva(true);
  let r=await ev(p, () => { var b=document.getElementById('quien'); return { vis:!!b && !b.hidden, txt:b?b.innerText.replace(/\s+/g,' '):'', n:b?b.querySelectorAll('.quien-b').length:0, sigo:!!(b && b.querySelector('.quien-sigo')) }; });
  chk('sale «¿Quién está usando el panel?» con todos los vendedores, logística y administración', r.vis && /Quién está usando el panel/.test(r.txt) && r.n>=9 && /Mirian Salazar/.test(r.txt) && /logística/.test(r.txt) && /Administración/.test(r.txt), r);
  chk('la primera vez no hay «Sigo siendo»', !r.sigo, r);
  if(FOTOS) await p.screenshot({ path:FOTOS+'/quien_1180.png' });
  r=await ev(p, async () => { var b=[].filter.call(document.querySelectorAll('#quien .quien-b'), function(x){ return /Mirian Salazar/.test(x.textContent); })[0]; b.click();
    await new Promise(function(res){ setTimeout(res, 100); });
    return { cerrada:document.getElementById('quien').hidden, mem:localStorage.getItem('me_mis_vendedor'), form:document.getElementById('f-vendedor').value, mis:document.getElementById('mis-vendedor').value }; });
  chk('tocar «Mirian Salazar» lo recuerda, lo pone en el formulario y en Mis pedidos, y cierra', r.cerrada && r.mem==='Mirian Salazar' && r.form==='Mirian Salazar' && r.mis==='Mirian Salazar', r);
  r=await ev(p, async () => { await new Promise(function(res){ setTimeout(res, 300); });
    var g=document.getElementById('asis-globo'), t=document.getElementById('toast');
    return { globo:g && !g.hidden ? g.textContent : '', toast:t ? t.textContent : '' }; });
  chk('el saludo lo dice Eduardo en su globito («¡Hola, Mirian!»), no un aviso del panel', /Hola, Mirian/.test(r.globo) && !/Hola/.test(r.toast||''), r);
  r=await ev(p, async () => { showView('conta'); await new Promise(function(res){ setTimeout(res, 250); });
    var a=document.getElementById('cta-vendedor').value;
    var cu=document.getElementById('cua-vendedor'); llenarSelectContaVendedor();
    document.getElementById('cta-vendedor').value=''; renderConta(); llenarSelectContaVendedor();
    return { cta:a, cua:cu.value, despuesTodos:document.getElementById('cta-vendedor').value }; });
  chk('Contabilidad (Ventas y Cuadre) arranca filtrada en Mirian Salazar', r.cta==='Mirian Salazar' && r.cua==='Mirian Salazar', r);
  chk('si después elige «Todos» a mano, no se lo vuelve a poner', r.despuesTodos==='', r);

  console.log('\n── 4. Recargar y pestaña nueva ──');
  await p.reload({ waitUntil:'load' }); await p.waitForTimeout(1700);
  chk('recargar la misma pestaña no vuelve a preguntar', await ev(p, vis)===false);
  const p2=await nueva(true, { width:390, height:844 });
  r=await ev(p2, () => { var s=document.querySelector('#quien .quien-sigo'); return { vis:!document.getElementById('quien').hidden, sigo:s?s.textContent:'', ancho:document.documentElement.scrollWidth, vw:innerWidth,
    cabe:document.querySelector('#quien .quien-c').getBoundingClientRect().right<=innerWidth }; });
  chk('una pestaña nueva pregunta otra vez, con «Sigo siendo Mirian Salazar» primero', r.vis && /Sigo siendo Mirian Salazar/.test(r.sigo), r);
  chk('en 390 px entra entera, sin scroll de costado', r.ancho<=r.vw && r.cabe, r);
  if(FOTOS) await p2.screenshot({ path:FOTOS+'/quien_390.png' });

  console.log('\n── 5. Logística ──');
  r=await ev(p2, async () => { [].filter.call(document.querySelectorAll('#quien .quien-otros button'), function(b){ return /logística/.test(b.textContent); })[0].click();
    await new Promise(function(res){ setTimeout(res, 80); });
    var mem=localStorage.getItem('me_mis_vendedor'), rol=localStorage.getItem('me_quien_rol');
    quienAbrir(false); var s=document.querySelector('#quien .quien-sigo'); var t=s?s.textContent:''; quienCerrar();
    return { mem:mem, rol:rol, sigo:t, form:document.getElementById('f-vendedor').value, cta:(document.getElementById('cta-vendedor')||{}).value }; });
  chk('«Soy de logística» olvida el nombre de vendedor y después ofrece «Sigo en Logística»', r.mem==='' && r.rol==='logistica' && /Sigo en Logística/.test(r.sigo) && r.form==='' && !r.cta, r);

  console.log('\n── 6. Cambiar desde la ventana de Eduardo ──');
  r=await ev(p, async () => { setVendedorMem('Mirian Salazar'); document.getElementById('mis-vendedor').value='Mirian Salazar';
    asisAbrir('avisos'); var a=document.querySelector('#asis-panel .asis-quien'); var t=a?a.textContent:''; if(a) a.click();
    await new Promise(function(res){ setTimeout(res, 80); });
    var b=document.getElementById('quien'); return { t:t, vis:!!b && !b.hidden, x:!!(b && b.querySelector('.quien-x')), panel:document.getElementById('asis-panel').hidden }; });
  chk('la ventana de Eduardo dice «¿No sos Mirian?» y abre el cambio (con ✕ para cerrar)', /No sos Mirian/.test(r.t) && r.vis && r.x && r.panel, r);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e => { console.error(e); process.exit(1); });
