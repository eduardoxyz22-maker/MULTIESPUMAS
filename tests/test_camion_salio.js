/* 🛣️ «YA SALIÓ EL CAMIÓN» Y EL CARTEL «SIN CAMIÓN» QUE SE TOCA (12/10). El dueño: *«falta cómo hacemos que "ya salió el camión"
   mientras»* (hasta tener el GPS de Monnet) y *«sí»* a tocar el cartel «⚠️ SIN CAMIÓN» de la escena 3D.
   ⚠️ LO QUE CUIDA (rojo contra lo publicado, `e2f1021`):
   1. En la ficha del camión (Administración → camiones) hay «🚚 Ya salió»; tocarlo guarda la hora en la fila de los tildes de la
      carga (`__carga_chk__`), para todo el equipo, y la ficha dice «Salió a las HH:MM» con «deshacer».
   2. En Mis pedidos, el viaje de un pedido de ese camión pasa a «Salió HH:MM» (en camino); el de otro camión, no.
   3. Si al camión le falta tildar carga, pregunta antes; «deshacer» lo saca.
   4. «⚠️ SIN CAMIÓN»: `cv3dSinCamion` lista esos pedidos con «🚚 Asignar camión…»; asignar uno lo saca de la lista.
   Datos SINTÉTICOS, reloj clavado en el miércoles 14/10/2026 10:42 de Bolivia.  Se corre:  node tests/test_camion_salio.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{ width:1300, height:900 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e => errores.push(e.message));
  page.__resp=[]; page.on('dialog', d => { const r=page.__resp.length?page.__resp.shift():true; r?d.accept():d.dismiss(); });
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-14T10:42:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(1500);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  await ev(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=false; UNLOCKED=true; CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    loadFromServer=function(){}; apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)).concat([{ id:'__carga_chk__', observaciones:textoCargaChk(CARGA_CHK), rev:1 }]) }); };
    window._guardados=[]; apiSave=function(p){ window._guardados.push(JSON.parse(JSON.stringify(p))); return Promise.resolve({ ok:true, pedido:p }); };
    var hoy=todayStr(), n=0;
    var V=function(o){ n++; return Object.assign({ id:'v'+n, oc:'10-'+(800+n), cliente:'CLI '+n, fecha:hoy, turno:'AM', vendedor:'Mirian Salazar', chofer:'', vehiculo:'',
      productos:[{ desc:'TITANIO LATEX', medida:'140x190', cant:1, precio:3000, chk:'ok' }], saldo:0, pagado:true, entregado:false, maps:'', ts:1, fotos:[] }, o); };
    STATE=[ V({ vehiculo:'Carry', chofer:'Luis Pierre' }), V({ vehiculo:'Foton nuevo', chofer:'Luis Eyzaguirre' }), V({ cliente:'SIN CAMION A' }), V({ cliente:'SIN CAMION B' }) ];
    CARGA_CHK={}; CV_DIA='hoy'; showView('admin');
  });
  await page.waitForTimeout(400);

  console.log('\n── 1. «🚚 Ya salió» en la ficha del camión ──');
  let r = await ev(() => {
    var D=cargaVivaDatos(), c=D.porK['Carry'];
    var antes=cvSalioHtml(D, c);
    /* lo de Carry, tildado entero: el botón se llena y no pregunta */
    c.lineas.forEach(function(l){ setCargaChk(l.key, true); });
    var D1=cargaVivaDatos(); antes=antes+' ‖ '+cvSalioHtml(D1, D1.porK['Carry']);
    camionSalioMarcar('Carry', true);
    var D2=cargaVivaDatos(), despues=cvSalioHtml(D2, D2.porK['Carry']);
    return { antes:antes, despues:despues, hora:camionSalio(todayStr(), 'Carry'), celda:textoCargaChk(CARGA_CHK), guardo:(typeof CARGA_CAMBIOS!=='undefined') };
  });
  chk('el botón «🚚 Ya salió»: claro con carga pendiente, lleno con todo cargado', /^<button type="button" class="cvc-salio-btn" /.test(r.antes||'') && /‖ <button type="button" class="cvc-salio-btn listo"/.test(r.antes||''), r.antes);
  chk('al tocarlo queda la hora de Bolivia y va en la fila de los tildes de la carga', r.hora==='10:42' && /\|Carry\|🚚 SALIÓ\|10:42/.test(r.celda||''), r);
  chk('la ficha dice «Salió a las 10:42» con «deshacer»', /Salió a las 10:42/.test(r.despues||'') && /deshacer/.test(r.despues||''), r.despues);

  console.log('\n── 1b. La ventana que se abre al tocar el camión en 3D trae «Ya salió» ──');
  r = await ev(() => { var D=cargaVivaDatos(); cv3dCamPanel(D.porK['Foton nuevo']);
    var m=document.getElementById('dep-modal'), b=m && m.querySelector('.cvc-salio-btn');
    var out={ btn:!!b, txt:m ? m.innerText.replace(/\s+/g,' ') : '' }; depPanel(null); return out; });
  chk('tocar el camión abre sus pedidos con «🚚 Ya salió» abajo', r.btn && /Ya salió/.test(r.txt) && /Revisá los pedidos/.test(r.txt), r.txt.slice(0,200));

  console.log('\n── 2. Mis pedidos: el viaje del pedido ──');
  r = await ev(() => ({ carry:pedidoViajeDatos(findById('v1')), foton:pedidoViajeDatos(findById('v2')) }));
  chk('el pedido del Carry dice «Salió 10:42» y espera «Entregado»', r.carry.pasos[3].lbl==='Salió 10:42' && r.carry.pasos[3].hecho && r.carry.ahora===4, r.carry);
  chk('el del Foton nuevo, no (sigue «En camino» sin marcar)', r.foton.pasos[3].lbl==='En camino' && !r.foton.pasos[3].hecho, r.foton);

  console.log('\n── 3. Con carga sin tildar pregunta; «deshacer» lo saca ──');
  page.__resp=[false];
  r = await ev(() => { camionSalioMarcar('Foton nuevo', true); return camionSalio(todayStr(), 'Foton nuevo'); });
  chk('le faltan bultos y se contesta «no»: no se marca', r==='', r);
  page.__resp=[true];
  r = await ev(() => { camionSalioMarcar('Carry', false); return { hora:camionSalio(todayStr(), 'Carry'), celda:textoCargaChk(CARGA_CHK) }; });
  chk('«deshacer» saca la marca de la fila', r.hora==='' && !/SALIÓ/.test(r.celda), r);

  console.log('\n── 4. El cartel «⚠️ SIN CAMIÓN» se toca ──');
  r = await ev(async () => {
    cv3dSinCamion(); var m=document.getElementById('modal-ov')||document.querySelector('.modal-ov')||document.body;
    var txt=document.body.innerText.replace(/\s+/g,' '), sels=document.querySelectorAll('.cv-sinc .cvc-sel');
    var s=sels[0]; s.value='Foton insumo'; s.dispatchEvent(new Event('change'));
    await new Promise(function(res){ setTimeout(res, 500); });
    var quedan=document.querySelectorAll('.cv-sinc .cvc-sel').length;
    return { lista:/2 pedidos sin camión/.test(txt) && /SIN CAMION A/.test(txt) && /SIN CAMION B/.test(txt), sels:sels.length, quedan:quedan, veh:findById('v3').vehiculo };
  });
  chk('lista los 2 pedidos sin camión, cada uno con «Asignar camión…»', r.lista && r.sels===2, r);
  chk('asignar uno lo pone en ese camión y la lista queda con el otro', r.veh==='Foton insumo' && r.quedan===1, r);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
