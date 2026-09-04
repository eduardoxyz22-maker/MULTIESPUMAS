/* ⏳ EL BOTÓN QUE PARECÍA MUERTO.
   El dueño, con captura: *"al presionar «Probar de nuevo» o «Resolver uno» no sabe si está
   ejecutando o en proceso, ya que no aparece nada… pareciera como si el botón no
   funcionara"*.

   Y tenía razón: el panel mandaba la consulta, mostraba un cartelito de 2,8 segundos y
   después NADA — con un servidor que abre los enlaces cortos **uno por uno** y tarda entre
   veinte segundos y un minuto. El botón quedaba igual, el panel igual, y lo natural era
   volver a apretarlo… disparando OTRA consulta de un minuto encima de la anterior.

   ⚠️ LO QUE ESTE TEST CUIDA POR ENCIMA DE TODO: que mientras el servidor trabaja haya
   SIEMPRE algo en pantalla que lo diga, y que insistir con el botón no dispare una segunda
   consulta. Lo segundo es lo que costaba plata en tiempo de espera. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1200,height:1000} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  /* Servidor LENTO a propósito: si contestara al instante no habría "mientras tanto" que
     probar, que es justo lo que se rompió. `demora` y `resultado` se controlan por test. */
  const prep = (demora, ok) => page.evaluate(async (a) => {
    var [demora, ok]=a;
    document.getElementById('conn-form').style.display='none';
    CONNECTED=true; UNLOCKED=true; mostrarBotonesTodos();
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
    apiSave=function(){ return Promise.resolve({ok:true}); };
    window._geoLlamadas=0;
    apiGeocode=function(links){
      window._geoLlamadas++;
      return new Promise(function(res, rej){ setTimeout(function(){
        if(ok==='error') return rej(new Error('sin respuesta'));
        res({ ok:true, version:SCRIPT_VERSION_ESPERADA,
              geo:links.map(function(l,i){
                return (ok==='si') ? {link:l, lat:-17.78+i/1000, lng:-63.18} : {link:l, lat:null, lng:null};
              }) });
      }, demora); });
    };
    var hoy=todayStr();
    STATE=[];
    for(var i=0;i<3;i++) STATE.push({ id:'g'+i, cliente:'CLIENTE '+i, nota:''+i, vendedor:'Maria Flores',
      fecha:hoy, ts:Date.now(), oc:'09-00'+i, saldo:0, acuenta:0, pagado:true, cobradoBs:0, metodoPago:'',
      entregado:false, verificado:false, observaciones:'', garantia:'', facturarA:'', nit:'', estado:'',
      vehiculo:'', chofer:'', turno:'AM', celular:'7', zona:'Norte', direccion:'Av '+i,
      maps:'https://maps.app.goo.gl/ABC'+i, nroDia:i, productos:[{desc:'X',medida:'1x1',codigo:'A',cant:1}] });
    /* ⚠️ Se limpia TODO el rastro del intento anterior. Sin vaciar `MAPA_COORDS`, los
       enlaces que la prueba pasada resolvió quedan cacheados: dejan de contar como
       "enlace corto", el bloque no se dibuja y el botón ni existe. */
    MAPA_COORDS={};
    REV_INTENTO=false; REV_N=0; REV_TOT=0; REV_MOTIVO=''; REV_RESPONDIO=false;
    if(typeof revTerminar==='function') revTerminar();
    if(typeof REV_EN_CURSO!=='undefined') REV_EN_CURSO=false;
    saveMirror(); showView('admin');
    await new Promise(r=>setTimeout(r,200));
    abrirRevUbic();
    await new Promise(r=>setTimeout(r,200));
  }, [demora, ok]);

  /* Tolera que la versión vieja no tenga el botón con id: así el test REPRUEBA con checks
     en rojo en vez de reventar, y quien lo corra ve QUÉ falta. */
  const tocar = () => page.evaluate(() => {
    var b=document.getElementById('rev-btn-resolver');
    if(b){ b.click(); return true; }
    if(typeof resolverCortosRev==='function'){ resolverCortosRev(); return 'sin id, se llamó a mano'; }
    return false;
  });

  const foto = () => page.evaluate(() => {
    var btn=document.getElementById('rev-btn-resolver');
    var bloque=document.getElementById('rev-en-curso');
    return { hayBoton:!!btn,
             texto:(btn||{textContent:'NO HAY BOTÓN'}).textContent.replace(/\s+/g,' ').trim(),
             apagado:!!(btn&&btn.disabled),
             girito:!!(btn&&btn.querySelector('.spin')),
             hayBloque:!!bloque,
             bloque:bloque?bloque.textContent.replace(/\s+/g,' ').trim():'',
             seg:(document.querySelector('.rev-elapsed')||{}).textContent||'',
             llamadas:window._geoLlamadas };
  });

  // ============ 1. antes de tocar nada ============
  await prep(3000,'no');
  let f = await foto();
  chk('el botón está listo para tocar', f.hayBoton===true && f.apagado===false, f.texto);
  chk('…y todavía no dice que esté consultando', f.hayBloque===false, f.bloque.slice(0,60));

  // ============ 2. ⚠️ MIENTRAS EL SERVIDOR TRABAJA ============
  await tocar();
  await page.waitForTimeout(500);
  f = await foto();
  chk('⚠️ el botón se APAGA al tocarlo (antes quedaba igual y parecía muerto)',
      f.apagado===true, f.texto);
  chk('…con un girito que se mueve', f.girito===true, f.girito);
  chk('…y el propio botón dice qué está haciendo', /Consultando/.test(f.texto), f.texto);
  chk('⚠️ …y aparece un bloque explicando que puede tardar',
      f.hayBloque===true && /uno por uno/.test(f.bloque), f.bloque.slice(0,90));
  chk('…que dice cuántos enlaces son', /3 enlaces/.test(f.bloque), f.bloque.slice(0,70));
  chk('…y avisa que se puede cerrar la ventana sin cortar nada',
      /cerrar esta ventana/i.test(f.bloque), f.bloque.slice(-90));

  // ============ 3. el contador AVANZA: prueba de que sigue vivo ============
  /* ⚠️ Hay DOS contadores a la vez —en el botón y en el bloque— y tienen que avanzar los
     dos. La primera versión los tenía como id repetido y solo avanzaba el primero: el del
     bloque quedaba congelado en 0. Lo agarró la auditoría de ids repetidos (§4bx). */
  const leer = () => page.evaluate(() => [].slice.call(document.querySelectorAll('.rev-elapsed')).map(function(e){ return Number(e.textContent); }));
  const t1 = await leer();
  await page.waitForTimeout(2200);
  const t2 = await leer();
  chk('hay dos contadores a la vista (botón y bloque)', t1.length===2, t1.length+' contadores');
  chk('⚠️ y AVANZAN LOS DOS (antes el del bloque quedaba congelado en 0)',
      t2.length===2 && t2.every(function(v,i){ return v>t1[i]; }), JSON.stringify(t1)+' → '+JSON.stringify(t2));

  // ============ 4. ⚠️ INSISTIR NO DISPARA OTRA CONSULTA ============
  const insistir = await page.evaluate(() => {
    var btn=document.getElementById('rev-btn-resolver');
    if(btn) btn.disabled=false;          // aunque alguien lo fuerce desde fuera
    resolverCortosRev(); resolverCortosRev();
    return { llamadas:window._geoLlamadas,
             aviso:(document.getElementById('toast')||{}).textContent||'' };
  });
  chk('⚠️ insistir con el botón NO manda una segunda consulta (cada una tarda un minuto)',
      insistir.llamadas===1, insistir.llamadas+' llamadas');
  chk('…y le explica que ya está en curso, con cuánto lleva',
      /Ya está consultando/.test(insistir.aviso) && /\d+ s/.test(insistir.aviso), insistir.aviso);

  // ============ 5. al terminar vuelve a la normalidad ============
  await page.waitForTimeout(2500);
  f = await foto();
  chk('al terminar el botón se vuelve a encender', f.apagado===false, f.texto);
  chk('…y ofrece «Probar de nuevo»', /Probar de nuevo/.test(f.texto), f.texto);
  chk('…y el bloque de "consultando" desaparece', f.hayBloque===false, f.bloque.slice(0,60));
  const resultado = await page.evaluate(() => (document.getElementById('toast')||{}).textContent||'');
  chk('…y avisa el resultado', /No se pudo con ninguno de los 3/.test(resultado), resultado);

  // ============ 6. cuando SÍ resuelve, lo dice con los segundos que tardó ============
  await prep(1200,'si');
  await tocar();
  await page.waitForTimeout(2200);
  const bien = await page.evaluate(() => ({
    toast:(document.getElementById('toast')||{}).textContent||'',
    apagado:!!(document.getElementById('rev-btn-resolver')||{}).disabled
  }));
  chk('cuando ubica, dice cuántos de cuántos', /Ubicados 3 de 3/.test(bien.toast), bien.toast);
  chk('…y cuánto tardó, que es lo que estaba faltando', /\(\d+ s\)/.test(bien.toast), bien.toast);
  chk('…y el botón queda libre otra vez', bien.apagado===false, bien.apagado);

  // ============ 7. ⚠️ si el servidor NO responde, tampoco queda colgado ============
  /* Sin esto el botón quedaría apagado para siempre y habría que recargar la página. */
  await prep(800,'error');
  await tocar();
  await page.waitForTimeout(1800);
  const roto = await page.evaluate(() => ({
    apagado:!!(document.getElementById('rev-btn-resolver')||{}).disabled,
    hayBloque:!!document.getElementById('rev-en-curso'),
    toast:(document.getElementById('toast')||{}).textContent||'',
    enCurso:(typeof REV_EN_CURSO!=='undefined') ? REV_EN_CURSO : 'no existe REV_EN_CURSO'
  }));
  chk('⚠️ si el servidor falla, el botón NO queda apagado para siempre',
      roto.apagado===false, roto.apagado);
  chk('…ni queda el bloque de "consultando" colgado', roto.hayBloque===false, roto.hayBloque);
  chk('…y se puede volver a intentar', roto.enCurso===false, roto.enCurso);
  chk('…avisando que no respondió', /no respondió/.test(roto.toast), roto.toast);

  // ============ 8. cerrar la ventana no corta la consulta ============
  /* Con un minuto de espera es lo más probable que hagan. La consulta sigue, y al terminar
     NO se abre la ventana sola —sería invasivo— sino que avisa por el cartel. */
  await prep(1500,'si');
  const cerrada = await page.evaluate(async () => {
    var _b=document.getElementById('rev-btn-resolver');
    if(_b) _b.click(); else if(typeof resolverCortosRev==='function') resolverCortosRev();
    await new Promise(r=>setTimeout(r,200));
    closeModal();                                  // la persona se va a otra cosa
    await new Promise(r=>setTimeout(r,2200));      // el servidor termina con el panel cerrado
    return { llamadas:window._geoLlamadas,
             abierto:document.getElementById('modal').classList.contains('on'),
             toast:(document.getElementById('toast')||{}).textContent||'',
             enCurso:(typeof REV_EN_CURSO!=='undefined')?REV_EN_CURSO:'no existe REV_EN_CURSO',
             ubicados:REV_N };
  });
  chk('cerrar la ventana NO cancela la consulta', cerrada.ubicados===3, cerrada.ubicados+' ubicados');
  chk('⚠️ …y NO se abre la ventana sola encima de lo que esté haciendo',
      cerrada.abierto===false, cerrada.abierto);
  chk('…pero avisa que terminó y dónde verlo',
      /Ubicados 3 de 3/.test(cerrada.toast) && /Revisar ubicaciones/.test(cerrada.toast), cerrada.toast);
  chk('…y el estado queda limpio para la próxima', cerrada.enCurso===false, cerrada.enCurso);

  chk('sin errores JS', errors.length===0, errors.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
