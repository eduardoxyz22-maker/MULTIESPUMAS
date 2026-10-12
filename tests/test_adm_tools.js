/* ✨ ADMINISTRACIÓN: LAS HERRAMIENTAS EN GRUPOS (§4kb, 12/10). El dueño: «nos falta actualizar y modernizar esa parte del panel y lo que
   lleva dentro». Lo que cuida: los MISMOS botones (texto, onclick, ids) en cuatro grupos, cada uno con su explicación corta; las ventanas
   que abren llevan la clase `adm-ov` (el estilo nuevo); y en 390 px no hay scroll de costado.
   Se corre:  node tests/test_adm_tools.js   (desde la raíz) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const ARCH='file://'+(process.env.PEDIDOS||path.resolve('pedidos.html'));
(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  for (const [w,h] of [[1180,900],[390,844]]) {
    const page = await browser.newPage({ viewport:{ width:w, height:h }, timezoneId:'America/La_Paz' });
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await page.route(/^https?:/, r => r.abort());
    await page.goto(ARCH, { waitUntil:'load' }); await page.waitForTimeout(800);
    const r = await page.evaluate(() => {
      var c=document.getElementById('conn-form'); if(c) c.style.display='none'; UNLOCKED=true;
      document.getElementById('admin-lock').style.display='none'; document.getElementById('admin-content').style.display='block'; mostrarBotonesTodos();
      showView('admin'); renderAdmin();
      var tools=document.querySelector('#view-admin .btn-row.adm-tools');
      var grupos=[].map.call(tools.querySelectorAll('.at-g h5'), function(h){ return h.textContent.trim(); });
      var bs=[].slice.call(tools.querySelectorAll('button')), txt=bs.map(function(b){ return b.textContent.trim(); });
      var oc=bs.map(function(b){ return b.getAttribute('onclick')||''; }).join(' ');
      var esperados=['📦 Lista de carga','🧾 Hoja de ruta','🗺️ Mapa de entregas','📍 Revisar ubicaciones','🚚 Entregado','✅ Cierre de entregas','🔒 Cerrar día',
        '📋 Parte del día','📤 Cierre del día','📤 Mañana','📊 Reporte','📦 Stock y reposición','🏭 Faltantes / producción','🛏️ Productos más entregados',
        '🔎 Quién vendió qué','📥 Importar ROHO','🖨 Imprimir','💾 Respaldar (JSON)','❓ Guía','🔑 Cambiar contraseña','🔐 Clave del equipo','🛡️ Clave de administración'];
      var faltan=esperados.filter(function(t){ return txt.indexOf(t)<0; });
      var desc=[].every.call(tools.querySelectorAll('.at-t'), function(b){ return !!b.getAttribute('data-d'); });
      var ov=['mapa','ruta','entregas','carga','faltantes','parte','envio','retiros','busca','prods','reporte'].filter(function(i){ var o=document.getElementById(i+'-overlay'); return !o || !o.classList.contains('adm-ov'); });
      return { grupos:grupos, faltan:faltan, ids:!!document.getElementById('btn-mapa') && !!document.getElementById('btn-cerrar-dia'), desc:desc, ov:ov,
        oc:/exportExcel\('hoy'\)/.test(oc) && /abrirStock\(\)/.test(oc) && /abrirCierreDias\(\)/.test(oc), ancho:document.documentElement.scrollWidth, vw:innerWidth };
    });
    if (w>1000) {
      chk('cuatro grupos: Entregas del día, Mensajes y partes, Stock y ventas, Ajustes y claves', r.grupos.length===4 && /Entregas del día/.test(r.grupos[0]) && /Stock y ventas/.test(r.grupos[2]) && /Ajustes/.test(r.grupos[3]), r.grupos);
      chk('están TODOS los botones de antes, con su mismo texto y sus mismos ids', !r.faltan.length && r.ids, r.faltan);
      chk('cada herramienta dice para qué sirve (data-d) y hace lo mismo que antes (onclick)', r.desc && r.oc, r);
      chk('las ventanas que abren llevan el estilo nuevo (adm-ov)', !r.ov.length, r.ov);
    } else chk('en 390 px no hay scroll de costado', r.ancho<=r.vw, r);
    await page.close();
  }
  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e => { console.error(e); process.exit(1); });
