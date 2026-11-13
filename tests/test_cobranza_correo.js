/* 📧 EL ESTADO DE CUENTA DEL MAYORISTA AL CORREO EN UN TOQUE (13/11/2026, idea 182 de Contabilidad).
   Contabilidad → «📅 Cobranza» → Mayoristas → la ficha de cada cliente: al lado de «📋 Copiar» y «⬇️ Excel», el bloque «📧 Mandar el estado
   de cuenta por correo» con «📧 Abrir en Gmail» (arma el correo Y baja el Excel para adjuntar), «✉️ Otro correo», «⬇️ Excel para adjuntar»
   y «📋 Copiar el mensaje». Como el correo de la ATC (§4li): el panel NO manda nada.

   LO QUE CUIDA (datos SINTÉTICOS; reloj clavado el jueves 12/11/2026 15:00 de Bolivia):
   1. La ficha de Multicenter tiene el bloque; uno sin saldo no.
   2. Asunto «Estado de cuenta Multicenter — MultiEspumas — al 12/11/2026».
   3. El mensaje es el MISMO estado de cuenta de «📋 Copiar»: las mismas líneas de cada OC, lo vencido ARRIBA, sin los asteriscos de WhatsApp,
      con «Adjuntamos el detalle en Excel (…)». Y «📋 Copiar» también pone lo vencido arriba.
   4. «📧 Abrir en Gmail» abre Gmail con Para, Asunto y Mensaje, y baja el Excel; no guarda nada en la planilla.
   5. El «Para» se recuerda por cliente en el aparato (`me_cbz_correo`); otro cliente arranca vacío; sin «Para» avisa y abre igual.
   6. Con OC tildadas se ofrece «Solo las N tildadas»: el mensaje, el Excel (filas y nombre) y los totales son solo de esas.
   7. Lo retocado en el mensaje es lo que va al correo y sobrevive a tildar una OC; cambiar qué OC van lo vuelve a armar.
   8. «✉️ Otro correo» arma el mailto; un mensaje que no entra en el enlace va con el resumen y el entero queda copiado.
   9. En el celular (390 px) la página no corre de costado.
   Se corre:  node tests/test_cobranza_correo.js   (PEDIDOS=… para correrla contra otra versión) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,700)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  try{ localStorage.removeItem('me_cbz_correo'); }catch(e){}
  loadFromServer=function(){};
  window.GUARDADOS=[];
  apiSave=function(rec){ GUARDADOS.push(JSON.parse(JSON.stringify(rec))); return Promise.resolve({ ok:true, pedido:rec }); };
  guardarDurable=function(rec){ GUARDADOS.push(JSON.parse(JSON.stringify(rec))); return Promise.resolve({ ok:true, pedido:rec }); };
  window.DESCARGAS=[]; window.HOJAS=[];
  downloadBlob=function(bytes, nombre){ DESCARGAS.push(nombre); };
  var bx=buildXlsx; buildXlsx=function(sh){ HOJAS.push(JSON.parse(JSON.stringify(sh))); return bx.apply(this, arguments); };
  window.COPIADO='';
  copyText=function(t){ COPIADO=t; };
  window.ABIERTOS=[];
  window.open=function(u){ ABIERTOS.push(String(u)); return null; };
  var n=0;
  var V=function(cliente, fecha, total, acuenta, o){
    o=o||{}; n++;
    var saldo=Math.max(0, total-(acuenta||0));
    return { id:'v'+n, oc:o.oc||('10-'+(400+n)), nota:o.nota||String(1200+n), vendedor:o.vend||'Eduardo Añez', cliente:cliente, celular:o.cel||('7000000'+n),
             fecha:fecha, turno:'AM', productos:o.prods||[{desc:'COLCHON TITANIO',medida:'140x190',cant:1,precio:total}],
             acuenta:acuenta||0, saldo:saldo, pagado:saldo<0.01, metodoPago:(acuenta?('Efectivo'):''), entregado:!!o.ent,
             ts:new Date((o.reg||'2026-07-01')+'T10:00:00-04:00').getTime(), fotos:[] };
  };
  window.FIX=function(){
    n=0;
    return [
      V('CLIENTE EQUIPO',   '2026-08-01', 5000, 1000, { vend:'Carola Chavez' }),              // v1 · del equipo: no es de Mayoristas
      V('MULTICENTER',      '2026-08-10', 2000,    0, { nota:'30791', oc:'08-050' }),          // v2 · a 60: venció el 09/10, hace 34
      V('Multicenter SRL',  '2026-10-25', 1500,    0, { nota:'33100', oc:'10-300' }),          // v3 · a 60: vence el 24/12
      V('MULTICENTER',      '2026-11-20', 1200,    0, { nota:'33555', oc:'11-100' }),          // v4 · por entregar
      V('MULTICENTER',      '2026-07-20',  900,    0, { nota:'30500', oc:'07-020' }),          // v5 · a 60: venció el 18/09, hace 55 (la más atrasada)
      V('MULTICENTER',      '2026-07-01',  700,  700, { nota:'30100', oc:'07-001' }),          // v6 · pagada: no va en el correo
      V('JOSE CARLOS COPACABA','2026-09-20', 3000, 0, { oc:'09-200', nota:'C-77' }),             // v7 · otro cliente
      V('CAMSA',            '2026-09-01',  400,  400, { oc:'09-010' })                         // v8 · pagada entera: su ficha no tiene correo
    ];
  };
  window._txt=function(sel){ var e=document.querySelector(sel); return e ? e.innerText.replace(/\s+/g,' ').trim() : ''; };
  window.MAYOR=function(){ closeModal(); segSet('cta-tab','mayor'); setContaTab('mayor'); };
  window.CLI=function(k){ MAYOR(); cbzAbrir(); cbzCliAbrir(k); };
  window.BOTON=function(re){ return [].slice.call(document.querySelectorAll('#cbz-correo button')).filter(function(b){ return re.test(b.innerText); })[0]; };
  window.CUERPO=function(u){ var m=String(u).match(/[?&]body=([^&]*)/); return m ? decodeURIComponent(m[1]) : ''; };
  window.PARAM=function(u, k){ var m=String(u).match(new RegExp('[?&]'+k+'=([^&]*)')); return m ? decodeURIComponent(m[1]) : ''; };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1280, height:900 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-11-12T15:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(350);
  await page.evaluate(PREPARAR);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  await ev(() => { showView('conta'); });
  await page.waitForTimeout(150);
  await ev(() => { STATE=FIX(); });

  const hay = await ev(() => typeof cbzCorreoHtml==='function');
  chk('el panel tiene el correo del estado de cuenta (cbzCorreoHtml)', hay===true, hay);
  if(hay!==true){ console.log(`\n${PASS} bien · ${FAIL} mal`); await browser.close(); process.exit(1); }

  // ═══ 1-3. El bloque, el asunto y el mensaje ══════════════════════════════════════════════════
  console.log('\n── 1-3. El bloque, el asunto y el mensaje ──');
  let r = await ev(() => { CLI('Multicenter'); var b=document.getElementById('cbz-correo');
    var acc=document.querySelector('#cbz .cbz-acc');
    return { hay:!!b, txt:_txt('#cbz-correo'), para:(document.getElementById('cbz-correo-para')||{}).value, asunto:(document.getElementById('cbz-correo-asunto')||{}).value,
             texto:(document.getElementById('cbz-correo-texto')||{}).value||'', alc:document.querySelectorAll('#cbz-correo [role=radio]').length,
             antesDeAcc:!!(b && acc && (b.compareDocumentPosition(acc) & Node.DOCUMENT_POSITION_FOLLOWING)) }; });
  chk('1 · la ficha de Multicenter tiene «📧 Mandar el estado de cuenta por correo», justo arriba de Copiar y Excel', r.hay && /Mandar el estado de cuenta por correo/.test(r.txt) && r.antesDeAcc, r.txt.slice(0,200));
  chk('1 · con «📧 Abrir en Gmail», «✉️ Otro correo», «⬇️ Excel para adjuntar» y «📋 Copiar el mensaje»', /Abrir en Gmail/.test(r.txt) && /Otro correo/.test(r.txt) && /Excel para adjuntar/.test(r.txt) && /Copiar el mensaje/.test(r.txt), r.txt);
  chk('1 · dice que el panel no manda nada y el nombre del Excel', /El panel no manda nada solo/.test(r.txt) && /estado-de-cuenta-multicenter-2026-11-12\.xlsx/.test(r.txt), r.txt);
  chk('5 · la primera vez el «Para» está vacío y sin tildadas no ofrece «solo las tildadas»', r.para==='' && r.alc===0, r);
  chk('2 · Asunto «Estado de cuenta Multicenter — MultiEspumas — al 12/11/2026»', r.asunto==='Estado de cuenta Multicenter — MultiEspumas — al 12/11/2026', r.asunto);
  const T=r.texto;
  chk('3 · el mensaje arranca con el saludo y no tiene asteriscos de WhatsApp', /^Buen día:\n\nLes enviamos el estado de cuenta de Multicenter con MultiEspumas al 12\/11\/2026\./.test(T) && !/\*/.test(T), T.slice(0,200));
  chk('3 · con el plazo y los totales: entregado 4.400 (3 OC), vencido 2.900 (2 OC), por vencer 1.500 (1 OC), por entregar 1.200 (1 OC)',
      /Plazo de pago: 60 días desde la entrega\./.test(T) && /Entregado y sin pago: Bs 4\.400,00 \(3 OC\)/.test(T) && /Vencido: Bs 2\.900,00 \(2 OC\)/.test(T) &&
      /Por vencer: Bs 1\.500,00 \(1 OC\)/.test(T) && /Por entregar: Bs 1\.200,00 \(1 OC\)/.test(T), T);
  const iV=T.indexOf('VENCIDAS'), iP=T.indexOf('POR VENCER'), iE=T.indexOf('POR ENTREGAR'), i5=T.indexOf('N° 30500'), i2=T.indexOf('N° 30791'), i3=T.indexOf('N° 33100'), i4=T.indexOf('N° 33555');
  chk('3 · lo vencido ARRIBA: VENCIDAS (30500 a 55 d, después 30791 a 34 d), POR VENCER (33100), POR ENTREGAR (33555)', iV>0 && iV<i5 && i5<i2 && i2<iP && iP<i3 && i3<iE && iE<i4, [iV,i5,i2,iP,i3,iE,i4]);
  chk('3 · cada OC dice cuándo vence y cuánto debe; la pagada (30100) no está', /• N° 30500 · 20\/07 · vence 18\/09 \(vencida hace 55 d\) · Bs 900,00/.test(T) && /• N° 33100 · 25\/10 · vence 24\/12 · Bs 1\.500,00/.test(T) && /• N° 33555 · 20\/11 \(por entregar\) · Bs 1\.200,00/.test(T) && !/30100/.test(T), T);
  chk('3 · con el renglón «Adjuntamos el detalle en Excel (…)» y la firma', /\nAdjuntamos el detalle en Excel \(estado-de-cuenta-multicenter-2026-11-12\.xlsx\)\.\n/.test(T) && /Saludos,\nMultiEspumas$/.test(T), T.slice(-200));
  r = await ev(() => { cbzCliCopiar('Multicenter'); return COPIADO; });
  const lineas=T.split('\n').filter(function(l){ return /^• /.test(l); });
  chk('3 · es el MISMO estado de cuenta de «📋 Copiar»: las mismas 4 líneas de OC, en el mismo orden', lineas.length===4 && lineas.join('\n')===r.split('\n').filter(function(l){ return /^• /.test(l); }).join('\n'), [lineas, r]);
  chk('3 · «📋 Copiar» (WhatsApp) sigue con sus negritas y ahora también pone lo vencido arriba', /^🏭 \*Estado de cuenta · Multicenter\* · al 12\/11 · plazo de pago: a 60 días/.test(r) && /Vencido: \*Bs 2\.900,00\*/.test(r) &&
      r.indexOf('*Vencidas (pasó el plazo de pago)*')>0 && r.indexOf('*Vencidas')<r.indexOf('*Por vencer*') && r.indexOf('*Por vencer*')<r.indexOf('*Por entregar*'), r);

  // ═══ 4-5. Abrir en Gmail ══════════════════════════════════════════════════════════════════
  console.log('\n── 4-5. Abrir en Gmail ──');
  r = await ev(() => { GUARDADOS=[]; DESCARGAS=[]; ABIERTOS=[]; HOJAS=[];
    var inp=document.getElementById('cbz-correo-para'); inp.value='cobranzas@ejemplo.com'; inp.dispatchEvent(new Event('input')); inp.dispatchEvent(new Event('change'));
    BOTON(/Abrir en Gmail/).click();
    var u=ABIERTOS[0]||''; var h=HOJAS[HOJAS.length-1]||[];
    return { n:ABIERTOS.length, u:u, to:PARAM(u,'to'), su:PARAM(u,'su'), body:CUERPO(u), d:DESCARGAS.slice(), g:GUARDADOS.length, hoja:(h[0]||{}).name, filas:((h[0]||{}).matrix||[]).length,
             ls:(function(){ try{ return localStorage.getItem('me_cbz_correo'); }catch(e){ return 'x'; } })(), texto:document.getElementById('cbz-correo-texto').value }; });
  chk('4 · «📧 Abrir en Gmail» abre el borrador de Gmail', r.n===1 && /^https:\/\/mail\.google\.com\/mail\/\?view=cm&fs=1&to=/.test(r.u), r.u.slice(0,120));
  chk('4 · …con el Para, el Asunto y el Mensaje del bloque', r.to==='cobranzas@ejemplo.com' && r.su==='Estado de cuenta Multicenter — MultiEspumas — al 12/11/2026' && r.body===r.texto, [r.to, r.su, r.body.slice(0,80)]);
  chk('4 · …y baja el Excel para adjuntar (el mismo estado de cuenta)', r.d.join()==='estado-de-cuenta-multicenter-2026-11-12.xlsx' && r.hoja==='Estado de cuenta', r);
  chk('4 · no guarda nada en la planilla (el panel no manda nada)', r.g===0, r.g);
  chk('5 · el «Para» queda guardado para ESE cliente en el aparato', r.ls==='{"Multicenter":"cobranzas@ejemplo.com"}', r.ls);
  await page.waitForTimeout(100);
  r = await ev(() => _txt('#toast'));
  chk('4 · el aviso dice que se abrió Gmail, que se bajó el Excel y que lo adjunte', /Se abrió Gmail/.test(r) && /se bajó el Excel/.test(r) && /adjuntalo/.test(r), r);
  r = await ev(() => { CLI('Copacaba'); var a=(document.getElementById('cbz-correo-para')||{}).value; CLI('Multicenter'); var b=(document.getElementById('cbz-correo-para')||{}).value;
    var asu=(document.getElementById('cbz-correo-asunto')||{}).value; CLI('Copacaba'); var asc=(document.getElementById('cbz-correo-asunto')||{}).value; return { cop:a, mc:b, asu:asu, asc:asc }; });
  chk('5 · al volver a Multicenter el «Para» ya está; Copacaba arranca vacío y con su propio asunto', r.mc==='cobranzas@ejemplo.com' && r.cop==='' && /Multicenter/.test(r.asu) && /Copacaba/.test(r.asc), r);
  r = await ev(() => { ABIERTOS=[]; DESCARGAS=[]; BOTON(/Abrir en Gmail/).click(); return { n:ABIERTOS.length, to:PARAM(ABIERTOS[0]||'','to'), d:DESCARGAS.slice() }; });
  await page.waitForTimeout(80);
  const avisoSinPara = await ev(() => _txt('#toast'));
  chk('5 · sin «Para» abre igual (vacío), baja el Excel y avisa que falta', r.n===1 && r.to==='' && r.d.join()==='estado-de-cuenta-copacaba-2026-11-12.xlsx' && /Falta el «Para»/.test(avisoSinPara), [r, avisoSinPara]);
  r = await ev(() => { CLI('CAMSA'); return { hay:!!document.getElementById('cbz-correo'), txt:_txt('#cbz') }; });
  chk('1 · un cliente sin nada que cobrar no tiene el bloque del correo', !r.hay && /no debe nada/.test(r.txt), r);

  // ═══ 6-7. Solo las tildadas y lo retocado ═══════════════════════════════════════════════════
  console.log('\n── 6-7. Solo las tildadas y lo retocado ──');
  r = await ev(() => { CLI('Multicenter'); cbzSel('v2', true);
    return { alc:[].slice.call(document.querySelectorAll('#cbz-correo [role=radio]')).map(function(b){ return (b.getAttribute('aria-checked')==='true'?'*':'')+b.innerText.trim(); }), texto:document.getElementById('cbz-correo-texto').value }; });
  chk('6 · con una OC tildada ofrece «Todas sus OC con saldo (4)» (elegida) o «Solo las 1 tildada»', r.alc.length===2 && /^\*Todas sus OC con saldo \(4\)/.test(r.alc[0]) && /Solo las 1 tildada$/.test(r.alc[1]) && /N° 33100/.test(r.texto), r.alc);
  r = await ev(() => { [].slice.call(document.querySelectorAll('#cbz-correo [role=radio]'))[1].click();
    var t=document.getElementById('cbz-correo-texto').value; ABIERTOS=[]; DESCARGAS=[]; HOJAS=[]; BOTON(/Abrir en Gmail/).click();
    var h=(HOJAS[HOJAS.length-1]||[])[0]||{}, m=h.matrix||[];
    return { t:t, body:CUERPO(ABIERTOS[0]||''), d:DESCARGAS.slice(), tit:((m[0]||[])[0]||{}).v, res:(m[3]||[]).map(function(c){ return c&&c.v!=null?c.v:c; }),
             notas:m.slice(7).map(function(f){ return f[1]; }), ventana:_txt('#cbz-correo') }; });
  chk('6 · «Solo las tildadas»: el mensaje es solo de la 30791 («de 1 OC», vencido 2.000)', /de 1 OC\./.test(r.t) && /N° 30791/.test(r.t) && !/N° 33100|N° 30500|N° 33555/.test(r.t) && /Entregado y sin pago: Bs 2\.000,00 \(1 OC\)/.test(r.t) && /Vencido: Bs 2\.000,00 \(1 OC\)/.test(r.t) && !/Por vencer:/.test(r.t), r.t);
  chk('6 · …Gmail lleva ese mensaje y el Excel es solo de esa OC (nombre, título, totales y filas)', r.body===r.t && r.d.join()==='estado-de-cuenta-multicenter-1-oc-2026-11-12.xlsx' &&
      /· 1 OC$/.test(r.tit||'') && r.res[1]===2000 && r.res[3]===2000 && r.res[5]===0 && JSON.stringify(r.notas)==='["30791"]', r);
  chk('6 · …y el bloque nombra ese Excel', /estado-de-cuenta-multicenter-1-oc-2026-11-12\.xlsx/.test(r.ventana), r.ventana.slice(0,300));
  r = await ev(() => { var ta=document.getElementById('cbz-correo-texto'); ta.value='Hola, les mando lo que deben. Saludos.'; ta.dispatchEvent(new Event('input'));
    var a=document.getElementById('cbz-correo-asunto'); a.value='Asunto retocado'; a.dispatchEvent(new Event('input'));
    ABIERTOS=[]; BOTON(/Abrir en Gmail/).click(); return { body:CUERPO(ABIERTOS[0]||''), su:PARAM(ABIERTOS[0]||'','su') }; });
  chk('7 · lo retocado (mensaje y asunto) es lo que va al correo', r.body==='Hola, les mando lo que deben. Saludos.' && r.su==='Asunto retocado', r);
  r = await ev(() => { [].slice.call(document.querySelectorAll('#cbz-correo [role=radio]'))[0].click(); var ta=document.getElementById('cbz-correo-texto'); var t0=ta.value;
    ta.value='Texto mío para todas'; ta.dispatchEvent(new Event('input'));
    var p=document.getElementById('cbz-correo-para'); p.value='otro@ejemplo.com'; p.dispatchEvent(new Event('input'));
    cbzSel('v5', true);   // tildar otra OC redibuja la ficha
    return { t0:t0, t1:document.getElementById('cbz-correo-texto').value, para:document.getElementById('cbz-correo-para').value, sel:Object.keys(CBZ.sel).sort().join() }; });
  chk('7 · cambiar a «Todas» vuelve a armar el mensaje de las 4 OC', /N° 30500/.test(r.t0) && /N° 33555/.test(r.t0), r.t0.slice(0,120));
  chk('7 · lo retocado y el «Para» sobreviven a tildar otra OC (la ficha se redibuja)', r.t1==='Texto mío para todas' && r.para==='otro@ejemplo.com' && r.sel==='v2,v5', r);
  r = await ev(() => { [].slice.call(document.querySelectorAll('#cbz-correo [role=radio]'))[1].click(); return document.getElementById('cbz-correo-texto').value; });
  chk('7 · elegir «Solo las 2 tildadas» lo vuelve a armar con esas dos (la más atrasada primero)', /de 2 OC\./.test(r) && r.indexOf('N° 30500')>0 && r.indexOf('N° 30500')<r.indexOf('N° 30791') && !/33100/.test(r), r);
  r = await ev(() => { cbzSelVarias('nada'); return { radios:document.querySelectorAll('#cbz-correo [role=radio]').length, alc:CBZ.correo.alc, t:document.getElementById('cbz-correo-texto').value }; });
  chk('6 · sin tildadas vuelve a «todas» (y sin la opción)', r.radios===0 && r.alc==='todas' && /N° 33100/.test(r.t), r);

  // ═══ 8. Otro correo y el mensaje largo ═══════════════════════════════════════════════════════
  console.log('\n── 8. Otro correo y el mensaje largo ──');
  r = await ev(() => { var c=cbzCliDe('Multicenter'); var A=cbzCorreoArmar(c, 'mailto'); return { u:A.url, largo:A.largo }; });
  chk('8 · «✉️ Otro correo» arma el mailto con el «Para», el asunto y el mensaje', /^mailto:otro@ejemplo\.com\?subject=/.test(r.u) && /&body=/.test(r.u) && !r.largo, r.u.slice(0,120));
  r = await ev(() => {
    for(var i=0;i<140;i++) STATE.push({ id:'g'+i, oc:'11-'+(500+i), nota:'G-'+(1000+i), vendedor:'Eduardo Añez', cliente:'CLIENTE GRANDE', celular:'', fecha:'2026-09-'+String(1+(i%28)).padStart(2,'0'), turno:'AM',
      productos:[{desc:'COLCHON TITANIO',medida:'140x190',cant:1,precio:1000}], acuenta:0, saldo:1000, pagado:false, metodoPago:'', entregado:true, ts:1, fotos:[] });
    CLI('CLIENTE GRANDE'); COPIADO=''; ABIERTOS=[]; DESCARGAS=[];
    var completo=document.getElementById('cbz-correo-texto').value;
    var res=cbzCorreoAbrir('gmail'); var u=ABIERTOS[0]||'';
    return { largo:res.largo, ulen:u.length, body:CUERPO(u), copiado:COPIADO, completo:completo, d:DESCARGAS.slice() }; });
  chk('8 · con 140 OC el mensaje no entra en el enlace: Gmail se abre con el resumen («el detalle va en el Excel adjunto»)', r.largo===true && r.ulen<=7500 && /El detalle de cada OC va en el Excel adjunto/.test(r.body) && !/• N°/.test(r.body) && /Vencido: Bs 140\.000,00 \(140 OC\)/.test(r.body), [r.largo, r.ulen, r.body.slice(0,300)]);
  chk('8 · …el mensaje ENTERO queda copiado para pegarlo, y el Excel se baja igual', r.copiado===r.completo && (r.copiado.match(/\n• N° /g)||[]).length===140 && r.d.length===1, [r.copiado.length, r.d]);
  await page.waitForTimeout(450);
  r = await ev(() => _txt('#toast'));
  chk('8 · …y el aviso lo dice (pegalo con Ctrl+V)', /quedó copiado/.test(r) && /Ctrl\+V/.test(r), r);

  // ═══ 9. Celular ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── 9. En el celular ──');
  await page.setViewportSize({ width:390, height:844 });
  await ev(() => { CLI('Multicenter'); cbzSel('v2', true); var d=document.querySelector('#cbz-correo details'); if(d) d.open=true; });
  await page.waitForTimeout(200);
  r = await ev(() => ({ w:document.documentElement.scrollWidth, vw:innerWidth, bw:(function(){ var b=document.getElementById('cbz-correo'); var m=document.querySelector('#modal-box'); return b&&m ? [Math.round(b.getBoundingClientRect().right), Math.round(m.getBoundingClientRect().right)] : null; })() }));
  chk('9 · a 390 px la página no corre de costado y el bloque entra en la ventana', r.w<=r.vw+1 && r.bw && r.bw[0]<=r.bw[1]+1, r);

  chk('sin errores de la página', !errores.length, errores);
  console.log(`\n${PASS} bien · ${FAIL} mal`);
  await browser.close();
  process.exit(FAIL?1:0);
})();
