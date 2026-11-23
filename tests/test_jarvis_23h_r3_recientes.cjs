'use strict';
// Uso: node 23h3-recientes.cjs /ruta/al/proyecto
// Corre el .gs y el render de la página con tres contactos ficticios de Kommo.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const file = path.join(root, 'tests/test_quien_atiende.js');
const src = fs.readFileSync(file, 'utf8');
const end = src.indexOf('\nfunction servidor()');
assert(end > 0, 'Se esperaba la maqueta de Kommo');
const mods = { fs, path, vm };
const { kommo, cargar, S, D, U_CAR, U_MAR } = vm.runInNewContext(
  src.slice(0, end) + '\n({kommo,cargar,S,D,U_CAR,U_MAR})',
  { console, Date, __dirname: path.dirname(file), process: { env: { GS: path.join(root, 'google-apps-script.gs') } },
    require: n => { assert(Object.hasOwn(mods,n)); return mods[n]; } }
);
const html = fs.readFileSync(path.join(root, 'pedidos.html'), 'utf8');
function cargarFuncion(nombre, ctx) {
  const i = html.indexOf('\nfunction ' + nombre + '(');
  assert(i >= 0, nombre);
  for (let j = html.indexOf('}', i); j >= 0; j = html.indexOf('}', j + 1)) {
    try {
      const script = new vm.Script(html.slice(i, j + 1));
      script.runInContext(ctx);
      return;
    } catch (e) {
      if (!(e instanceof SyntaxError)) throw e;
    }
  }
  throw Error('No se encontró el final de ' + nombre);
}
const box = {};
const ui = vm.createContext({ QA_DIAS: 15, QA_PAR_H: 24, QA_PANEL_DIAS: 90, QA_MARCA: { heaven: 'Heaven', suena: 'Sueña' },
  qaYo: () => 'Maria Flores', qaPanelPedidos: () => [],
  document: { getElementById: k => k === 'qa-res' ? box : null, querySelectorAll: () => [] } });
for (const fn of ['esc','isoDeTsBolivia','fmtFechaCorta','qaHace','qaN','sinTildes','qaNom','qaMismo','qaIncompleto','qaVeredicto','qaLeadHtml','qaCartel','qaPintar']) cargarFuncion(fn,ui);
function escenario(telNorte, telSur) {
  const k = kommo();
  k.contacto(11, 'ANA ROJAS NORTE', telNorte, [111]);
  k.contacto(12, 'ANA ROJAS SUR', telSur, [121,122,123,124]);
  k.contacto(13, 'ANA ROJAS ESTE', '75559876', [131]);
  const mover = (id,usuario,dias) => k.lead(id,{responsible_user_id:usuario, created_by:usuario, created_at:S-dias*D, updated_at:S-dias*D});
  mover(111,U_MAR,1); mover(131,U_MAR,2);
  for (const id of [121,122,123]) mover(id,U_MAR,3);
  mover(124,U_CAR,4);
  const app = cargar(k.K);
  const nombre = 'ana rojas';
  const r = app.post({action:'quienAtiende',nombre,quien:'Maria Flores'});
  assert(r.ok && !r.incompleto && r.cuentas[0].contactos === 3);
  assert(r.cuentas[0].recientes.some(l=>l.id==='124' && l.cli==='ANA ROJAS SUR'));
  ui.QA = {r,nom:nombre,c8:''};
  ui.qaPintar();
  const grupos = Array.from(box.innerHTML.matchAll(/class="qa-grupo-t">Cliente \d+ · (.*?) · <span[^>]*>[^<]*<\/span><\/div><div class="qa-ver[^"]*"><div class="qa-v-ic">[^<]*<\/div><div><b>(.*?)<\/b>/g),m=>({persona:m[1],cartel:m[2]}));
  return { grupos, telefono: tel => {
    const respuesta = app.post({action:'quienAtiende',cel:tel,quien:'Maria Flores'});
    return ui.qaVeredicto(respuesta,'Maria Flores').rec.some(l=>l.n==='Carola Chavez');
  }};
}
let errores = 0;
function check(t,ok,detalle) {console.log((ok?'✓ ':'✗ ')+t,JSON.stringify(detalle)); if(!ok) errores++;}
const ojos = r => r.grupos.filter(g=>g.cartel.includes('Carola')).map(g=>g.persona);
const separado = escenario('70001234','79994567');
check('Terminaciones diferentes: tres carteles y el amarillo solo para Sur',separado.grupos.length===3 && ojos(separado).join()==='ANA ROJAS SUR',separado.grupos);
const igual = escenario('70001234','79991234');
check('Números completos distintos con la misma terminación: cada persona tiene su propio cartel',igual.grupos.length===3,igual.grupos);
check('El aviso de Carola aparece solo en el cartel de Sur, aun coincidiendo el final de los celulares',ojos(igual).join()==='ANA ROJAS SUR',ojos(igual));
check('Buscar los números completos distingue Norte (sin aviso) y Sur (con aviso)',!igual.telefono('70001234') && igual.telefono('79991234'),['Norte','Sur']);
const duplicado = escenario('70001234','70001234');
check('Dos contactos con el mismo número completo siguen en un solo grupo',duplicado.grupos.length===2 && ojos(duplicado).length===1,duplicado.grupos);
process.exitCode = errores ? 1 : 0;
