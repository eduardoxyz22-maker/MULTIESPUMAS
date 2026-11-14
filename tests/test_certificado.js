/* 🛡️ EL CERTIFICADO DE GARANTÍA (264, 14/11; dueño: «lo revisaremos y diseñaremos el formato» y «debe llevar un QR también»).
   Primera versión para que el dueño la revise. Lo que cuida esta prueba, con pedidos INVENTADOS y el reloj clavado en el sábado
   14/11/2026 a las 10:00 de Bolivia:
     1. sale SOLO con la contraseña (`UNLOCKED`) o con `?cert=1` (y en Playwright solo con `CERT_PRUEBA`); `CERT_PARA_TODOS` sigue apagado;
        no sale en ATC, RPT, una venta sin colchón ni somier, ni en lo de ROHO; sí en «✅ Pedido guardado» (después del mensaje para el
        cliente), en la ficha de Mis pedidos y en la de Administración;
     2. los datos: a nombre de quien va la garantía, la tienda, la fecha de compra (el día de la carga), solo colchones/somieres, la línea, los
        años de `CERT_ANOS` («a definir» mientras es null) y «vale hasta»; `CERT_DESDE`; el código `<N°>-<4 letras>` es el MISMO en otra carga
        de la página (sin azar) y distinto entre pedidos;
     3. el lienzo se dibuja (1080×1350, con el color de la marca); sin la librería del QR sale sin QR y lo dice; con una librería de mentira
        el QR se pide con el texto esperado (código, producto, compra, «vale hasta») y se dibuja; el modo 'url';
     4. el buscador (Ctrl+K) encuentra el código (con o sin guiones) y Enter abre ese pedido;
     5. «⬇️ Bajar imagen» baja el PNG y «💬 Mandar por WhatsApp» (en la compu) lo baja y abre el chat del cliente con el código;
     6. la ATC: con el celular propone las compras con colchón/somier (las más nuevas primero), «Usar esta compra» llena la fecha y, si están
        vacíos, los productos; nunca pisa lo escrito; «Es otra» la esconde; elegir el cliente por el nombre también la muestra.
   Con la librería de verdad (`npm pack qrcode-generator@1.4.4` en el scratch, o `CERT_QR_LIB=<qrcode.js>`) también saca las capturas
   (`CERT_SALIDA`, por omisión /tmp): mall_cert_certificado.png, mall_cert_certificado_suena.png, mall_cert_pedido_guardado.png,
   mall_cert_atc.png y mall_cert_sin_qr.png.
   Se corre (desde la raíz):  HTTPS_PROXY=http://127.0.0.1:9 https_proxy=http://127.0.0.1:9 node tests/test_certificado.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const HOY = '2026-11-14T10:00:00-04:00';
const QR_LIB = process.env.CERT_QR_LIB || '/tmp/claude-0/-home-user-MULTIESPUMAS/dab3dfa4-9445-5474-b412-a4265b40568c/scratchpad/qrlib/package/qrcode.js';
const HAY_QR = fs.existsSync(QR_LIB);
/* Un lector de QR (jsQR 1.4.0, `npm pack jsqr@1.4.0`) para comprobar que el QR dibujado se LEE y dice lo que tiene que decir. Opcional. */
const JSQR = process.env.CERT_JSQR || '/tmp/claude-0/-home-user-MULTIESPUMAS/dab3dfa4-9445-5474-b412-a4265b40568c/scratchpad/qrlib/jsqr/package/dist/jsQR.js';
const HAY_JSQR = fs.existsSync(JSQR);
const SALIDA = process.env.CERT_SALIDA || '/tmp';
const QR_URL = /(cdnjs\.cloudflare\.com\/ajax\/libs\/qrcode-generator\/1\.4\.4\/qrcode\.min\.js|cdn\.jsdelivr\.net\/npm\/qrcode-generator@1\.4\.4\/qrcode\.js)$/;

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  loadFromServer=function(){}; apiSave=function(r){ return Promise.resolve({ ok:true, pedido:r }); };
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
  var ts=function(f){ return new Date(f+'-04:00').getTime(); };
  window.V=function(o){
    return Object.assign({ oc:'', nota:'', vendedor:'Isabel Robledo', cliente:'', celular:'', fecha:'2026-11-17', turno:'AM', zona:'Norte',
      direccion:'Calle Las Flores 12', maps:'', productos:[], saldo:0, acuenta:0, pagado:true, metodoPago:'', entregado:false, rev:1, fotos:[] }, o, { ts:ts(o.reg||'2026-11-14T09:00:00') });
  };
  window.FIX=function(){ return [
    V({ id:'c01', oc:'11-245', nota:'9001', cliente:'PEREZ ANA', celular:'71234567', reg:'2026-11-14T09:30:00',
        productos:[{ desc:'COLCHON TITANIO ICE', medida:'140x190', codigo:'CH1220', cant:1, precio:3500 }, { desc:'ALMOHADA FIBRA SILICONADA', medida:'50x70', cant:2, precio:120 }] }),
    V({ id:'c02', oc:'10-112', nota:'8001', cliente:'PEREZ ANA', celular:'+591 712-34567', vendedor:'Mauricio Merida', reg:'2026-10-03T11:00:00', fecha:'2026-10-06', entregado:true,
        productos:[{ desc:'COLCHON SUEÑA LITE', medida:'140x190', codigo:'CH2532', cant:1, precio:2100 }, { desc:'SOMIER SUEÑA', medida:'140x190', cant:1, precio:900 }] }),
    V({ id:'c03', oc:'09-050', cliente:'PEREZ ANA', celular:'71234567', reg:'2026-09-10T10:00:00', fecha:'2026-09-12', entregado:true,
        productos:[{ desc:'ALMOHADA FIBRA SILICONADA', medida:'50x70', cant:2, precio:120 }] }),                                                // sin colchón: no es compra para el certificado
    V({ id:'c09', oc:'08-020', cliente:'PEREZ ANA', celular:'71234567', vendedor:'Maria Flores', reg:'2026-08-01T10:00:00', fecha:'2026-08-04', entregado:true,
        productos:[{ desc:'COLCHON ESPECIAL SEMIORTOPEDICO', medida:'100x190', cant:2, precio:1500 }] }),
    V({ id:'c04', oc:'ATC 11-010', cliente:'PEREZ ANA', celular:'71234567', reg:'2026-11-12T10:00:00', pagado:false,
        productos:[{ desc:'TITANIO ICE', medida:'140x190', cant:1, atc:{ mot:'Hundimiento', det:'Se hunde en el medio', tipo:'gar' } }] }),
    V({ id:'c05', oc:'RPT 11-003', cliente:'Central', reg:'2026-11-13T10:00:00', productos:[{ desc:'TITANIO ICE', medida:'140x190', cant:2 }] }),
    V({ id:'c06', oc:'11-250', cliente:'ROJAS LUIS', celular:'76500011', reg:'2026-11-13T16:00:00', fecha:'', direccion:'SALIÓ DE TIENDA · Central', zona:'TIENDA',
        productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x200', codigo:'', cant:1, precio:4200 }] }),                                         // venta de tienda con colchón: sí
    V({ id:'c07', oc:'260012844', cliente:'Roho', vendedor:'ROHO', reg:'2026-11-13T10:00:00', productos:[{ desc:'COLCHON TITANIO ICE', medida:'140x190', cant:1 }] }),
    V({ id:'c08', oc:'11-246', cliente:'GOMEZ MARTA', garantia:'GOMEZ LUIS', celular:'76543210', reg:'2026-11-14T09:45:00',
        productos:[{ desc:'COLCHON ORO ANATOMICO', medida:'160x200', cant:1, precio:5200 }, { desc:'SOMIER TITANIO LATEX', medida:'160x200', codigo:'', cant:1, precio:1800 }] })
  ]; };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  let qrSi=false;
  async function abrir(o){
    o=o||{};
    const ctx = await browser.newContext({ viewport:{ width:o.w||1366, height:o.h||900 }, timezoneId:'America/La_Paz', acceptDownloads:true });
    await ctx.route(/^https?:\/\//, r => {
      if(qrSi && HAY_QR && QR_URL.test(r.request().url())) return r.fulfill({ status:200, contentType:'application/javascript', body:fs.readFileSync(QR_LIB) });
      return r.abort();
    });
    const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
    if(o.cert!==false) await page.addInitScript(()=>{ window.CERT_PRUEBA=1; });
    if(o.atc) await page.addInitScript(()=>{ window.ATC_COMPRA_PRUEBA=1; });
    await page.clock.setFixedTime(new Date(HOY));
    await page.goto('file://' + PEDIDOS + (o.q||''), { waitUntil:'load' }); await page.waitForTimeout(350);
    await page.evaluate(PREPARAR);
    await page.evaluate((u) => { STATE=FIX(); UNLOCKED=!!u; saveMirror(); }, !!o.unlocked);
    return page;
  }
  const hayBloque = (page, como) => page.evaluate((como) => {
    closeModal();
    if(como==='mis') showMisModal('c01'); else if(como==='adm') showPedidoModal('c01'); else showWhatsappModal(findById('c01'));
    var b=document.getElementById('cert-b'); return b ? b.textContent.replace(/\s+/g,' ') : '';
  }, como);

  // ============ 1. quién lo ve y en qué pedidos ============
  let page = await abrir({ unlocked:false });
  let r = await page.evaluate(() => ({ ve:certVe(), todos:CERT_PARA_TODOS, desde:CERT_DESDE, modo:CERT_QR_MODO, url:CERT_QR_URL, src:CERT_QR_SRC }));
  chk('1a sin la contraseña ni ?cert=1 no se ve', r.ve===false, r);
  chk('1b CERT_PARA_TODOS=false, CERT_DESDE=compra, CERT_QR_MODO=datos y la dirección vacía', r.todos===false && r.desde==='compra' && r.modo==='datos' && r.url==='', r);
  chk('1c la librería del QR es qrcode-generator 1.4.4 (jsDelivr, y cdnjs de respaldo)', r.src==='https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js', r.src);
  chk('1d …y en la ficha de Mis pedidos no hay certificado', (await hayBloque(page, 'mis'))==='');
  await page.evaluate(() => { UNLOCKED=true; });
  let t = await hayBloque(page, 'mis');
  chk('1e con la contraseña: la ficha de Mis pedidos trae el certificado', /Certificado de garantía/.test(t) && /11-245-[A-Z]{4}/.test(t), t);
  chk('1f …dice «a definir», a nombre de quién y que es para revisar', /a definir/.test(t) && /PEREZ ANA/.test(t) && /Primera versión para revisar/.test(t), t);
  t = await hayBloque(page, 'adm');
  chk('1g la ficha de Administración también', /Certificado de garantía/.test(t), t);
  r = await page.evaluate(() => { closeModal(); showWhatsappModal(findById('c01'));
    var box=document.getElementById('modal-box'), cli=box.querySelector('.nx-cli-msg'), cb=document.getElementById('cert-b');
    return { hay:!!cb, despues: !!(cli && cb && (cli.compareDocumentPosition(cb) & Node.DOCUMENT_POSITION_FOLLOWING)), tit:(box.querySelector('h3')||{}).textContent };
  });
  chk('1h «✅ Pedido guardado» lo trae, después del mensaje para el cliente', r.hay && r.despues && /Pedido guardado/.test(r.tit), r);
  r = await page.evaluate(() => ['c03','c04','c05','c07','c06','c08','c02'].map(function(id){ closeModal(); showMisModal(id); return id+':'+(document.getElementById('cert-b') ? 'si' : 'no'); }).join(' '));
  chk('1i no sale en la venta sin colchón, la ATC, la RPT ni lo de ROHO; sí en la venta de tienda y en las otras ventas', r==='c03:no c04:no c05:no c07:no c06:si c08:si c02:si', r);
  const cod1 = await page.evaluate(() => certCodigo(findById('c01')));
  await page.context().close();

  // sin CERT_PRUEBA (Playwright) no aparece aunque esté la contraseña
  page = await abrir({ unlocked:true, cert:false });
  chk('1j en Playwright sin CERT_PRUEBA no aparece (con la contraseña)', (await hayBloque(page, 'mis'))==='');
  await page.context().close();

  // con ?cert=1 sí, sin la contraseña
  page = await abrir({ unlocked:false, q:'?cert=1' });
  r = await page.evaluate(() => ({ ve:certVe(), cod:certCodigo(findById('c01')), cod8:certCodigo(findById('c08')) }));
  chk('1k con ?cert=1 se ve sin la contraseña', r.ve===true, r);
  t = await hayBloque(page, 'mis');
  chk('1l …y la ficha lo trae', /Certificado de garantía/.test(t), t);

  // ============ 2. los datos y el código ============
  chk('2a el código es <N° de pedido>-<4 letras> (sin I, L ni O)', /^11-245-[A-HJKMNP-Z]{4}$/.test(cod1), cod1);
  chk('2b el mismo pedido da el MISMO código en otra carga de la página (sin azar)', r.cod===cod1, [r.cod, cod1]);
  chk('2c otro pedido, otro código', r.cod8!==cod1 && /^11-246-[A-HJKMNP-Z]{4}$/.test(r.cod8), r.cod8);
  r = await page.evaluate(() => { var D=certDatos(findById('c01')), D8=certDatos(findById('c08')), D2=certDatos(findById('c02')), D6=certDatos(findById('c06'));
    return { cli:D.cliente, tienda:D.tienda, compra:D.compra, n:D.lineas.length, l0:D.lineas[0], def:D.aDefinir, marca:D.marca.k,
      cli8:D8.cliente, lin8:D8.lineas.map(function(l){ return l.lin+':'+l.tipo; }).join(','), marca2:D2.marca.k, lin2:D2.lineas.map(function(l){ return l.lin; }).join(','),
      tienda2:D2.tienda, tienda6:D6.tienda, compra6:D6.compra, uni8:certUnidadesTxt(D8.lineas) }; });
  chk('2d a nombre del cliente, tienda Central (Isabel, noviembre), compra = el día de la carga', r.cli==='PEREZ ANA' && r.tienda==='Central' && r.compra==='2026-11-14', r);
  chk('2e solo el colchón (las almohadas no), línea Titanio, marca Heaven, «a definir»', r.n===1 && r.l0.lin==='Titanio' && r.l0.codigo==='CH1220' && r.l0.medida==='140x190' && r.marca==='heaven' && r.def===true && r.l0.anos===null && r.l0.vence==='', r.l0);
  chk('2f con «Garantía — a nombre de» va a ese nombre', r.cli8==='GOMEZ LUIS', r.cli8);
  chk('2g el somier es «Somier» y el colchón Oro es «Oro»', r.lin8==='Oro:colchon,Somier:somier' && r.uni8==='1 colchón y 1 somier', [r.lin8, r.uni8]);
  chk('2h la venta de Sueña: marca Sueña, líneas Sueña y Somier, tienda de octubre (Mutualista)', r.marca2==='suena' && r.lin2==='Sueña,Somier' && r.tienda2==='Mutualista', r);
  chk('2i la venta de tienda: la tienda de la venta y la compra = el día de la venta', r.tienda6==='Central' && r.compra6==='2026-11-13', r);
  r = await page.evaluate(() => {
    CERT_ANOS['Titanio']=10; var a=certDatos(findById('c01')).lineas[0];
    CERT_DESDE='entrega'; var b=certDatos(findById('c01'));
    CERT_ANOS['Titanio']=null; CERT_DESDE='compra';
    return { anos:a.anos, vence:a.vence, def:certDatos(findById('c01')).aDefinir, desde:b.desde, vence2:b.lineas[0].vence, bis:certSumarAnos('2028-02-29', 1), cinco:certSumarAnos('2026-11-14', 5) };
  });
  chk('2j con años en CERT_ANOS: «vale hasta» = la compra + los años', r.anos===10 && r.vence==='2036-11-14', r);
  chk('2k CERT_DESDE=entrega cuenta desde el día agendado', r.desde==='2026-11-17' && r.vence2==='2036-11-17', r);
  chk('2l el 29 de febrero pasa al 28 en un año que no es bisiesto', r.bis==='2029-02-28' && r.cinco==='2031-11-14', r);
  await page.context().close();

  // ============ 3. el lienzo y el QR ============
  page = await abrir({ unlocked:true });
  r = await page.evaluate(async () => {
    var x=await certArmar('c01'), ctx=x.cv.getContext('2d');
    var px=function(X,Y){ var d=ctx.getImageData(X,Y,1,1).data; return [d[0],d[1],d[2]]; };
    return { w:x.cv.width, h:x.cv.height, qr:x.qr, falla:x.falla, cab:px(60,60), blanco:px(540,700), qrc:px(80+920-88, 1112+88) };
  });
  chk('3a el lienzo es de 1080×1350', r.w===1080 && r.h===1350, r);
  chk('3b el encabezado tiene el color de Heaven (turquesa), no blanco', r.cab[1]>120 && r.cab[0]<60, r.cab);
  chk('3c sin la librería sale SIN QR y lo marca', r.qr===false && r.falla==='sin_lib', r);
  r = await page.evaluate(async () => { closeModal(); showMisModal('c01'); await certVer('c01');
    var im=document.querySelector('#cert-prev img'), av=document.getElementById('cert-aviso');
    return { img:!!im, nw:im && im.naturalWidth, aviso:av && !av.hidden ? av.textContent : '' }; });
  chk('3d «👁️ Ver el certificado» muestra la imagen', r.img && r.nw===1080, r);
  chk('3e …y dice que salió sin QR', /sin QR/.test(r.aviso) && /internet/.test(r.aviso), r.aviso);
  r = await page.evaluate(async () => { var a=document.querySelector('#cert-b .cert-ver').textContent; await certVer('c01');
    return { a:a, b:document.querySelector('#cert-b .cert-ver').textContent, oculto:document.getElementById('cert-prev').hidden }; });
  chk('3d2 el botón dice «Esconder» con la imagen a la vista, y otra vez la esconde', /Esconder/.test(r.a) && /Ver el certificado/.test(r.b) && r.oculto, r);
  if(HAY_QR){
    const b64 = await page.evaluate(async () => { var x=await certArmar('c01'); return x.cv.toDataURL('image/png').split(',')[1]; });
    fs.writeFileSync(path.join(SALIDA, 'mall_cert_sin_qr.png'), Buffer.from(b64, 'base64'));
  }
  // una librería de mentira: anota lo que le piden y dibuja un tablero
  r = await page.evaluate(async () => {
    window.__qr=[];
    window.qrcode=function(tipo, nivel){ var t=''; return { addData:function(s){ t=s; window.__qr.push({ t:s, tipo:tipo, nivel:nivel }); }, make:function(){},
      getModuleCount:function(){ return 25; }, isDark:function(r, c){ return (r+c)%2===0; } }; };
    window.qrcode.stringToBytesFuncs={ 'UTF-8':function(){ return []; } };
    var x=await certArmar('c01'), D=certDatos(findById('c01')), ctx=x.cv.getContext('2d');
    var oscuros=0; for(var i=0;i<40;i++){ var d=ctx.getImageData(80+920-196+20+i*3, 1104+40+i*2, 1, 1).data; if(d[0]<80) oscuros++; }
    return { qr:x.qr, falla:x.falla, pedido:window.__qr.length ? window.__qr[window.__qr.length-1] : null, esperado:D.qr, oscuros:oscuros };
  });
  chk('3f con la librería el QR se pide con el texto del certificado', r.qr===true && r.pedido && r.pedido.t===r.esperado && r.pedido.nivel==='M', r.pedido);
  chk('3g …el texto lleva el código, el producto, la compra y «vale hasta»',
    r.esperado.indexOf(cod1)>=0 && /COLCHON TITANIO ICE 140x190 · vale hasta a definir/.test(r.esperado) && /Compra: 14\/11\/2026/.test(r.esperado) && /vale hasta a definir/.test(r.esperado) && !/ALMOHADA/.test(r.esperado), r.esperado);
  chk('3h …y el QR queda dibujado en su lugar', r.oscuros>=8, r.oscuros);
  r = await page.evaluate(() => {
    CERT_QR_MODO='url'; var a=certQrTexto(certDatos(findById('c01')));
    CERT_QR_URL='https://ejemplo.invalid/garantia'; var b=certQrTexto(certDatos(findById('c01')));
    CERT_QR_URL='https://ejemplo.invalid/g?x=1'; var c=certQrTexto(certDatos(findById('c01')));
    CERT_QR_MODO='datos'; CERT_QR_URL='';
    return { a:a, b:b, c:c, cod:certCodigo(findById('c01')) };
  });
  chk('3i modo url: <dirección>?c=<código>; con la dirección vacía, los datos', /^MULTIESPUMAS/.test(r.a) && r.b==='https://ejemplo.invalid/garantia?c='+r.cod && r.c==='https://ejemplo.invalid/g?x=1&c='+r.cod, r);

  // ============ 4. el buscador ============
  r = await page.evaluate(() => { delete window.qrcode; return 1; });
  await page.evaluate(() => { closeModal(); palAbrir(); });
  await page.fill('#pal-in', cod1);
  r = await page.evaluate(() => PAL.res.slice(0,2).map(function(x){ return x.g+' | '+x.t+' | '+x.s; }));
  chk('4a Ctrl+K con el código: el primer resultado es el certificado de ese pedido', /^Certificado de garantía \| PEREZ ANA · OC 11-245/.test(r[0]||''), r);
  await page.press('#pal-in', 'Enter'); await page.waitForTimeout(150);
  r = await page.evaluate(() => { var b=document.getElementById('modal-box'); return { on:document.getElementById('modal').classList.contains('on'), t:b ? b.textContent.replace(/\s+/g,' ').slice(0,300) : '' }; });
  chk('4b Enter abre ese pedido', r.on && /11-245/.test(r.t), r);
  r = await page.evaluate((c) => { closeModal(); var a=certPalBuscar(c.replace(/-/g,'').toLowerCase()), b=certPalBuscar('OC '+c), z=certPalBuscar('11-245-ZZZZ'), n=certPalBuscar('11245');
    return { a:a.length && a[0].t, b:b.length, z:z.filter(function(x){ return /PEREZ ANA · OC 11-245/.test(x.t); }).length, n:n.length }; }, cod1);
  chk('4c sin guiones y en minúscula, o con «OC» adelante, también', /PEREZ ANA/.test(r.a||'') && r.b>=1, r);
  chk('4d otras letras no lo encuentran, y un número solo no es un código', r.z===0 && r.n===0, r);
  r = await page.evaluate((c) => { UNLOCKED=false; var n=certPalBuscar(c).length; UNLOCKED=true; return n; }, cod1);
  chk('4e sin poder ver certificados, el buscador no los ofrece', r===0, r);

  // ============ 5. bajar y mandar ============
  await page.evaluate(() => { closeModal(); showMisModal('c01'); });
  let dl = page.waitForEvent('download', { timeout:10000 });
  await page.click('#cert-b .cert-baja');
  let d = await dl.catch(()=>null);
  chk('5a «⬇️ Bajar imagen» baja el PNG con el N° y el cliente', !!d && d.suggestedFilename()==='Certificado-garantia-11-245-PEREZ-ANA.png', d && d.suggestedFilename());
  await page.evaluate(() => { window.__abrio=[]; window.open=function(u){ window.__abrio.push(u); return null; }; });
  dl = page.waitForEvent('download', { timeout:10000 });
  await page.click('#cert-b .cert-wa');
  d = await dl.catch(()=>null);
  await page.waitForTimeout(150);
  r = await page.evaluate(() => window.__abrio.slice());
  chk('5b «💬 Mandar por WhatsApp» en la compu: baja la imagen…', !!d && /\.png$/.test(d.suggestedFilename()), d && d.suggestedFilename());
  chk('5c …y abre el chat del cliente con el código', r.length===1 && r[0].indexOf('https://wa.me/59171234567?text=')===0 && decodeURIComponent(r[0]).indexOf(cod1)>=0, r);
  await page.context().close();

  // ============ 6. la ATC: «Tiene compras» ============
  page = await abrir({ unlocked:false, atc:true, cert:false });
  const atcNueva = (pg, cel) => pg.evaluate((cel) => {
    showView('form'); resetForm(); segSet('f-doc-tipo','ATC'); setDocTipo();
    var c=document.getElementById('f-celular'); c.value=cel; c.dispatchEvent(new Event('input', { bubbles:true }));
    var b=document.getElementById('atc-compra');
    return { vis:!!b && !b.hidden, filas:[].map.call(b.querySelectorAll('.atc-compra-x'), function(x){ return x.textContent.replace(/\s+/g,' ').trim(); }) };
  }, cel);
  r = await atcNueva(page, '712 34567');
  chk('6a con el celular aparece «Tiene compras» (para todos, sin la contraseña)', r.vis && r.filas.length===3, r);
  chk('6b las más nuevas primero: 14/11, 03/10, 01/08 (ni la de almohadas ni la ATC)',
    /^compró el 14\/11\/2026 · COLCHON TITANIO ICE 140x190 · N° 11-245$/.test(r.filas[0]||'') && /03\/10\/2026 · COLCHON SUEÑA LITE 140x190 \+ SOMIER SUEÑA 140x190 · N° 10-112/.test(r.filas[1]||'') && /01\/08\/2026 · 2 × COLCHON ESPECIAL/.test(r.filas[2]||''), r.filas);
  r = await page.evaluate(() => { document.querySelectorAll('#atc-compra .atc-compra-usar')[1].click();
    return { f:document.getElementById('f-atc-compra').value, prods:[].map.call(document.querySelectorAll('#f-productos .prod-card'), function(c){
      var m=c.querySelector('.prod-medida'); return c.querySelector('.prod-desc').value+'|'+(m.value==='Otros' ? c.querySelector('.prod-medida-otro').value : m.value)+'|'+c.querySelector('.prod-codigo').value+'|'+c.querySelector('.prod-cant').value; }),
      ok:[].map.call(document.querySelectorAll('#atc-compra .atc-compra-f.usada'), function(x){ return x.textContent; }).join(' ') }; });
  chk('6c «Usar esta compra» llena la fecha de compra', r.f==='2026-10-03', r.f);
  chk('6d …y, con los productos vacíos, los de esa compra', r.prods.join(' / ')==='COLCHON SUEÑA LITE|140x190|CH2532|1 / SOMIER SUEÑA|140x190||1', r.prods);
  chk('6e …y la compra usada queda marcada', /Es la fecha que quedó/.test(r.ok), r.ok);
  r = await page.evaluate(() => { document.querySelectorAll('#atc-compra .atc-compra-usar')[0].click();
    return { f:document.getElementById('f-atc-compra').value, n:document.querySelectorAll('#f-productos .prod-card').length, d0:document.querySelector('#f-productos .prod-desc').value, toast:(document.getElementById('toast')||{}).textContent||'' }; });
  chk('6f otra compra después NO pisa la fecha ni los productos, y lo dice', r.f==='2026-10-03' && r.n===2 && r.d0==='COLCHON SUEÑA LITE' && /No cambié nada/.test(r.toast), r);
  r = await page.evaluate(() => {
    showView('form'); resetForm(); segSet('f-doc-tipo','ATC'); setDocTipo();
    document.getElementById('f-atc-compra').value='2025-01-20';
    document.querySelector('#f-productos .prod-desc').value='COLCHON ORO';
    var c=document.getElementById('f-celular'); c.value='71234567'; c.dispatchEvent(new Event('input', { bubbles:true }));
    document.querySelector('#atc-compra .atc-compra-usar').click();
    return { f:document.getElementById('f-atc-compra').value, d:[].map.call(document.querySelectorAll('#f-productos .prod-desc'), function(x){ return x.value; }), toast:(document.getElementById('toast')||{}).textContent||'' };
  });
  chk('6g con la fecha y el producto escritos por la vendedora, no cambia nada', r.f==='2025-01-20' && r.d.join(',')==='COLCHON ORO' && /ya tenías escrito la fecha de compra \(20\/01\/2025\) y los productos/.test(r.toast), r);
  r = await page.evaluate(() => {
    showView('form'); resetForm(); segSet('f-doc-tipo','ATC'); setDocTipo();
    document.querySelector('#f-productos .prod-desc').value='COLCHON ORO';
    var c=document.getElementById('f-celular'); c.value='71234567'; c.dispatchEvent(new Event('input', { bubbles:true }));
    document.querySelector('#atc-compra .atc-compra-usar').click();
    return { f:document.getElementById('f-atc-compra').value, d:[].map.call(document.querySelectorAll('#f-productos .prod-desc'), function(x){ return x.value; }), toast:(document.getElementById('toast')||{}).textContent||'' };
  });
  chk('6h con el producto escrito: llena solo la fecha, y lo dice', r.f==='2026-11-14' && r.d.join(',')==='COLCHON ORO' && /Completé la fecha de compra \(14\/11\/2026\).*no lo toqué: los productos/.test(r.toast), r);
  r = await page.evaluate(() => {
    document.querySelector('#atc-compra .atc-compra-otra').click();
    var b=document.getElementById('atc-compra'), a=b.hidden;
    var c=document.getElementById('f-celular'); c.value='71234567 '; c.dispatchEvent(new Event('input', { bubbles:true }));
    return { a:a, b:b.hidden };
  });
  chk('6i «Es otra» la esconde y no vuelve con el mismo celular', r.a && r.b, r);
  r = await page.evaluate(() => {
    showView('form'); resetForm(); segSet('f-doc-tipo','ATC'); setDocTipo();
    var c=document.getElementById('f-celular'); c.value='71234567'; c.dispatchEvent(new Event('input', { bubbles:true }));
    var vis1=!document.getElementById('atc-compra').hidden;
    segSet('f-doc-tipo','OC'); setDocTipo(); atcCompraPintar();
    return { vis1:vis1, oc:document.getElementById('atc-compra').hidden };
  });
  chk('6j en una ATC nueva vuelve a salir; en una venta (OC) no', r.vis1 && r.oc, r);
  r = await page.evaluate(() => {
    showView('form'); resetForm(); segSet('f-doc-tipo','ATC'); setDocTipo();
    nxCliLlenar(findById('c08'), 1, 'nom');
    var b=document.getElementById('atc-compra');
    return { cel:document.getElementById('f-celular').value, vis:!b.hidden, t:b.textContent.replace(/\s+/g,' ') };
  });
  chk('6k elegir el cliente (se completa el celular) también la muestra', r.cel==='76543210' && r.vis && /N° 11-246/.test(r.t), r);
  r = await page.evaluate(() => {
    showView('form'); resetForm(); segSet('f-doc-tipo','ATC'); setDocTipo();
    var c=document.getElementById('f-celular'); c.value='70000999'; c.dispatchEvent(new Event('input', { bubbles:true }));
    return !document.getElementById('atc-compra').hidden;
  });
  chk('6l un celular sin compras no muestra nada', r===false, r);
  await page.context().close();
  page = await abrir({ unlocked:true, cert:false });
  r = await atcNueva(page, '71234567');
  chk('6m en Playwright sin ATC_COMPRA_PRUEBA no aparece', r.vis===false, r);
  await page.context().close();

  // ============ capturas con el QR de verdad (datos inventados) ============
  if(HAY_QR){
    qrSi=true;
    page = await abrir({ unlocked:true, w:1366, h:1000, q:'?tema=espuma' });
    r = await page.evaluate(async () => {
      var x=await certArmar('c01'), y=await certArmar('c02');
      return { qr:x.qr, falla:x.falla, a:x.cv.toDataURL('image/png').split(',')[1], b:y.cv.toDataURL('image/png').split(',')[1], qr2:y.qr, n:certQrMatriz(certDatos(findById('c01')).qr) };
    });
    chk('7a con qrcode-generator 1.4.4 de verdad el QR sale dibujado', r.qr===true && r.qr2===true && r.n && r.n.n>=21, { qr:r.qr, n:r.n && r.n.n, falla:r.falla });
    fs.writeFileSync(path.join(SALIDA, 'mall_cert_certificado.png'), Buffer.from(r.a, 'base64'));
    fs.writeFileSync(path.join(SALIDA, 'mall_cert_certificado_suena.png'), Buffer.from(r.b, 'base64'));
    if(HAY_JSQR){
      await page.addScriptTag({ content:'var module={exports:{}};var exports=module.exports;\n'+fs.readFileSync(JSQR, 'utf8')+'\nwindow.jsQR=module.exports.default||module.exports;' });
      r = await page.evaluate(async () => {
        var out=[];
        for(var id of ['c01','c02','c08']){
          var x=await certArmar(id), d=x.cv.getContext('2d').getImageData(0, 0, x.cv.width, x.cv.height), q=jsQR(d.data, d.width, d.height);
          out.push({ id:id, ok:!!q && q.data===x.D.qr, leido:q && q.data });
        }
        CERT_QR_MODO='url'; CERT_QR_URL='https://ejemplo.invalid/garantia';
        var u=await certArmar('c01'), du=u.cv.getContext('2d').getImageData(0, 0, u.cv.width, u.cv.height), qu=jsQR(du.data, du.width, du.height);
        out.push({ id:'url', ok:!!qu && qu.data===u.D.qr, leido:qu && qu.data });
        CERT_QR_MODO='datos'; CERT_QR_URL='';
        return out;
      });
      chk('7b un lector de QR (jsQR) lee el QR de cada certificado y dice exactamente su texto (también con dos productos y en modo url)', r.every(function(x){ return x.ok; }), r);
    } else console.log('… sin la copia de jsQR (npm pack jsqr@1.4.0, o CERT_JSQR=…/jsQR.js): se saltea la lectura del QR');
    await page.evaluate(async () => { closeModal(); showWhatsappModal(findById('c01')); await certVer('c01'); });
    await page.waitForTimeout(700);
    const clip = await page.evaluate(() => { var b=document.getElementById('cert-b'), box=document.getElementById('modal-box');
      var cli=box.querySelector('.nx-cli-msg'); (cli||b).scrollIntoView({ block:'start' });
      var r=box.getBoundingClientRect(); return { x:Math.max(0,r.left), y:Math.max(0,r.top), width:Math.min(innerWidth,r.right)-Math.max(0,r.left), height:Math.min(innerHeight,r.bottom)-Math.max(0,r.top) }; });
    await page.waitForTimeout(200);
    await page.screenshot({ path:path.join(SALIDA, 'mall_cert_pedido_guardado.png'), clip:clip });
    await page.context().close();
    page = await abrir({ unlocked:true, atc:true, w:1366, h:1000, q:'?tema=espuma' });
    await page.evaluate(() => { showView('form'); resetForm(); segSet('f-doc-tipo','ATC'); setDocTipo();
      document.getElementById('f-vendedor').value='Isabel Robledo'; applyVendedorLite();
      document.getElementById('f-cliente').value='PEREZ ANA';
      var c=document.getElementById('f-celular'); c.value='71234567'; c.dispatchEvent(new Event('change', { bubbles:true })); atcCompraPintar(); });
    await page.waitForTimeout(900);
    const clip2 = await page.evaluate(() => { var a=document.getElementById('wrap-cliente'), b=document.getElementById('atc-compra'); a.scrollIntoView({ block:'start' }); window.scrollBy(0, -120);
      var ra=a.getBoundingClientRect(), rb=b.getBoundingClientRect(), x=Math.min(ra.left, rb.left)-16, r=Math.max(ra.right, rb.right)+16;
      return { x:Math.max(0,x), y:Math.max(0, ra.top-12), width:Math.min(innerWidth,r)-Math.max(0,x), height:Math.min(innerHeight, rb.bottom+14)-Math.max(0, ra.top-12) }; });
    await page.screenshot({ path:path.join(SALIDA, 'mall_cert_atc.png'), clip:clip2 });
    await page.context().close();
    console.log('… capturas en '+SALIDA+': mall_cert_certificado.png, mall_cert_certificado_suena.png, mall_cert_sin_qr.png, mall_cert_pedido_guardado.png, mall_cert_atc.png');
  } else console.log('… sin la copia de qrcode-generator (npm pack qrcode-generator@1.4.4, o CERT_QR_LIB=…/qrcode.js): se saltean el QR de verdad y las capturas');

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
