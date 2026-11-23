'use strict';
// Uso: node prueba-ojo-segun-cantidad.cjs [carpeta del proyecto]
// Busca por celular y por nombre con el Apps Script y el doble local de Kommo.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
const file=path.join(root,'tests','test_quien_atiende.js');
const src=fs.readFileSync(file,'utf8'),end=src.indexOf('function servidor()');
assert(end>0,'No se encontró el doble de Kommo');
const mods={fs,path,vm};
const {kommo,cargar,S,D,U_CAR,U_MAR}=vm.runInNewContext(src.slice(0,end)+'\n({kommo,cargar,S,D,U_CAR,U_MAR})',{
 console,Date,__dirname:path.dirname(file),process:{env:{GS:path.join(root,'google-apps-script.gs')}},
 require:n=>{assert(Object.hasOwn(mods,n));return mods[n]}
});
const verificador=fs.readFileSync(path.join(root,'herramientas','verificar_cruce_ventas.js'),'utf8');
const ini=verificador.indexOf('function cargarPagina()');
const fin=verificador.indexOf('return ctx;\n}',ini);
assert(ini>=0 && fin>ini, 'No se encontró la lectura de la página');
const pagina=vm.runInNewContext(verificador.slice(ini,fin+'return ctx;\n}'.length)+'\ncargarPagina()',{
 fs,vm,PEDIDOS:path.join(root,'pedidos.html')
});

let fallos = 0;
function verificar(nombre, cantidad, porNombre, edadAjeno, perdido, esperaOjo) {
  const k = kommo();
  const ids = Array.from({length:cantidad}, (_, i) => 100+i);
  k.contacto(11,'CLIENTE FICTICIO','70011122',ids);
  ids.forEach((id,i) => {
    const usuario = i === 0 ? U_CAR : U_MAR;
    const fecha = S - (i === 0 ? edadAjeno : 1) * D;
    k.lead(id,{created_by:usuario, responsible_user_id:usuario, created_at:fecha,
      updated_at:fecha, status_id:i===0 && perdido ? 143 : 103});
  });
  const servidor = cargar(k.K);
  const consulta = porNombre ? {nombre:'CLIENTE FICTICIO'} : {cel:'70011122'};
  const r = servidor.post({action:'quienAtiende', quien:'Maria Flores', ...consulta});
  assert(r.ok && !r.incompleto);
  const v = pagina.qaVeredicto(r,'Maria Flores');
  const aviso = (v.rec || []).some(x => x.n === 'Carola Chavez');
  const ok = v.k === 'libre' && aviso === esperaOjo;
  if (!ok) fallos++;
  console.log((ok ? '✓ ' : '✗ ')+nombre, JSON.stringify({esperaOjo, aviso, k:v.k, omitidos:r.cuentas[0].masLeads}));
}
verificar('Por nombre, lead ajeno de hace cuatro días entre tres',3,true,4,false,true);
verificar('Por nombre, mismo lead ajeno entre cuatro',4,true,4,false,true);
verificar('Por celular, lead ajeno de hace cuatro días entre ocho',8,false,4,false,true);
verificar('Por celular, mismo lead ajeno entre nueve',9,false,4,false,true);
verificar('Control de lead perdido',3,true,4,true,false);
verificar('Control fuera de la ventana',3,true,16,false,false);
process.exitCode = fallos ? 1 : 0;
