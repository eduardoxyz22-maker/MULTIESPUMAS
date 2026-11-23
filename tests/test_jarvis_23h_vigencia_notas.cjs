/* 🔎 Prueba de Jarvis (revisión de la 2026-11-23-h, 23/11), tal cual la mandó; solo se cambió la raíz por defecto (la carpeta del proyecto). */
'use strict';
// node prueba-vigencia-notas-23h.cjs /ruta/al/proyecto
// Consulta al servidor completo con el CRM simulado del proyecto. Ejecuta la página y
// el verificador con las mismas respuestas; ningún servicio externo recibe llamadas.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const test = path.join(root, 'tests/test_quien_atiende.js');
const page = path.join(root, 'pedidos.html');
const verifier = path.join(root, 'herramientas/verificar_cruce_ventas.js');
const script = fs.readFileSync(test, 'utf8');
const start = script.indexOf('\nfunction servidor()');
assert(start >= 0, 'No se encontró la maqueta del proyecto');
const mods = {fs, path, vm};
const fixture = vm.runInNewContext(script.slice(0,start) + '\n({kommo,cargar,U_CAR,U_MAR,S,D})', {
  require:m => { assert(Object.hasOwn(mods, m)); return mods[m]; },
  console, Date, __dirname:path.dirname(test), process:{env:{GS:path.join(root,'google-apps-script.gs'), PEDIDOS:page}}
});
const exportsHolder = {exports:{}};
const libraries = {fs:{readFileSync:fs.readFileSync, mkdtempSync:()=>'maqueta'}, path, vm, os:{tmpdir:()=>'.'}, child_process:{}};
vm.runInNewContext(fs.readFileSync(verifier,'utf8'), {
  require:m => {assert(Object.hasOwn(libraries,m));return libraries[m];}, module:exportsHolder,
  __dirname:path.dirname(verifier), process:{env:{PANEL_URL:'local'},on(){}}, Date, console
});
const ver = exportsHolder.exports, pg = ver.cargarPagina();
const html = fs.readFileSync(page,'utf8');
const cartel = html.slice(html.indexOf('\nfunction qaCartel('),html.indexOf('\nfunction ',html.indexOf('\nfunction qaCartel(')+2));
function funcion(n) {
  const i=html.indexOf('\nfunction '+n+'(');assert(i>=0,n);
  let level=0;
  for(let j=html.indexOf('{',i);j<html.length;j++){
    if(html[j]==='{')level++;
    if(html[j]==='}' && --level===0)return html.slice(i,j+1);
  }
  throw Error(n);
}
assert(cartel.includes('function qaCartel('));
vm.runInContext('var QA_MARCA={heaven:"Heaven",suena:"Sueña"};\n'+['isoDeTsBolivia','fmtFechaCorta','hhmmDeTs','qaFecha','qaHace','esc','qaCreoTxt'].map(funcion).join('\n')+'\n'+cartel,pg);
const {S,D,U_CAR}=fixture;
let fallos=0;
function check(label,ok,datos){console.log((ok?'✓':'✗')+' '+label,JSON.stringify(datos));if(!ok)fallos++;}
function escenario(diasVisita,diasSeguimiento,opciones={}) {
  const k=fixture.kommo();
  const yo = opciones.yo || 'Maria Flores';
  const desdeContacto = opciones.contacto === true;
  k.contacto(82,'CLIENTE FICTICIO','77460002',[821]);
  k.lead(821,{responsible_user_id:U_CAR,created_by:U_CAR,created_at:S-40*D,status_id:opciones.perdido?143:103});
  if(diasVisita!==null)k.K.notas.push({id:101,entity_id:821,note_type:'common',params:{text:'Pasará por la tienda a comprar'},created_at:S-diasVisita*D,updated_at:S-diasVisita*D,created_by:U_CAR});
  if(diasSeguimiento!==null)k.K.notas.push({id:102,entity_id:desdeContacto?82:821,et:desdeContacto?'contacts':'leads',note_type:'common',params:{text:opciones.texto||'Le envié el presupuesto actualizado'},created_at:S-diasSeguimiento*D,updated_at:S-diasSeguimiento*D,created_by:U_CAR});
  const srv=fixture.cargar(k.K);
  const r=srv.post({action:'quienAtiende',cel:'77460002',quien:yo,auto:1,solo:'heaven'});
  assert.equal(r.ok,true);
  const c=r.cuentas[0];assert.equal(c.marca,'heaven');assert.equal(c.leads.length,1);
  const V=pg.qaVeredicto(r,yo);
  const ui=pg.qaCartel(V,false);
  const f=pg.cruceOtros(r,yo,'heaven');
  const bot=srv.ctx.cruceOtros_(c,yo,S,'heaven');
  const hist=ver.resumir([{id:'venta-ficticia',vendedor:yo,ts:S*1000}],()=>r,pg,()=> 'heaven',(...a)=>srv.ctx.cruceOtros_(...a));
  return {V,ui,f,bot,hist,l:c.leads[0]};
}
const f=escenario(14,1);
const venc=pg.fmtFechaCorta(pg.isoDeTsBolivia((S+14*D)*1000));
const anterior=pg.fmtFechaCorta(pg.isoDeTsBolivia((S+D)*1000));
assert.equal(f.l.nota.ts,S-14*D);assert.equal(f.l.creoNota.ts,S-D);
check('Servidor y bot conservan el seguimiento más reciente',f.bot.length===1 && f.bot[0].ts===S-D,{ultimaNota:f.l.creoNota.txt});
check('El cartel muestra el plazo real (hasta '+venc+')',f.V.k==='otro' && f.ui.includes('vale hasta el '+venc),{esperado:venc,mostroAnterior:f.ui.includes('vale hasta el '+anterior),texto:f.ui.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()});
check('El formulario usa la evidencia más reciente',f.f.length===1 && f.f[0].ts===S-D,{motivo:f.f[0]?.por,texto:f.f[0]?.txt});
check('El historial usa la razón del seguimiento vigente',f.hist.items[0]?.o[0]?.[2]==='l',{motivo:f.hist.items[0]?.o[0]?.[2]});
const control=escenario(null,1);
check('Solo seguimiento conserva el plazo correcto',control.ui.includes('vale hasta el '+venc) && control.f[0]?.ts===S-D,{motivo:control.f[0]?.por});
const ojo=escenario(null,null);
check('Ojo en amarillo, sin aviso de cruce',ojo.V.k==='libre' && ojo.ui.includes('Ojo: el lead es de') && !ojo.f.length && !ojo.bot.length && !ojo.hist.items.length,{veredicto:ojo.V.k,avisos:ojo.bot.length});
const propio=escenario(null,null,{yo:'Carola Chavez'});
check('Un lead propio sin actividad queda libre y sin Ojo',propio.V.k==='libre' && !propio.V.rec.length && !propio.ui.includes('Ojo: el lead es de'),{veredicto:propio.V.k,aviso:propio.V.rec.length});
const perdido=escenario(null,1,{perdido:true});
check('Un lead perdido con nota de la creadora queda sin Ojo ni cruce',perdido.V.k==='libre' && !perdido.V.rec.length && !perdido.f.length && !perdido.bot.length,{veredicto:perdido.V.k,aviso:perdido.V.rec.length});
const contacto=escenario(null,1,{contacto:true});
check('Nota genérica en el contacto no retiene a la compradora',contacto.V.k==='libre' && !contacto.l.creoNota && !contacto.f.length && !contacto.bot.length,{veredicto:contacto.V.k});
const visitaContacto=escenario(null,1,{contacto:true,texto:'Vendrá mañana a la tienda a comprar'});
check('Visita anotada en el contacto conserva su regla habitual',visitaContacto.V.k==='otro' && visitaContacto.f[0]?.por==='nota' && !visitaContacto.l.creoNota,{veredicto:visitaContacto.V.k,por:visitaContacto.f[0]?.por});
process.exitCode=fallos?1:0;
