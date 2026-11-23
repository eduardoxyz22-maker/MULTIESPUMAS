/* 🔎 Prueba de Jarvis (revisión de la 2026-11-23-h, 23/11), tal cual la mandó; solo se cambió la raíz por defecto (la carpeta del proyecto). */
'use strict';
// Uso: node prueba-leads-omitidos-23h.cjs [carpeta del proyecto]
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
let fallos=0;
function prueba(nombre,numero,porNombre){
 const k=kommo(),todos=Array.from({length:numero},(_,i)=>100+i),antiguo=todos[0];
 k.contacto(11,'CLIENTE FICTICIO','70011122',todos);
 todos.forEach((id,i)=>k.lead(id,{created_by:i?U_MAR:U_CAR,responsible_user_id:i?U_MAR:U_CAR,
  created_at:S-(i?1:4)*D,updated_at:S-(i?1:3)*D,status_id:103}));
 k.K.notas.push({id:4,entity_id:antiguo,created_by:U_CAR,created_at:S-3*D,updated_at:S-3*D,
  note_type:'common',params:{text:'No contesta, volver a llamar.'}});
 const s=cargar(k.K);
 const r=s.post({action:'quienAtiende',quien:'Maria Flores',...(porNombre?{nombre:'CLIENTE FICTICIO'}:{cel:'70011122'})});
 assert(r.ok);const h=r.cuentas[0],resumen=s.hojas['Quién atiende'].filas[1][4];
 const v=pagina.qaVeredicto(r,'Maria Flores');
 const datos={cartel:v.k,avisos:(v.rec||[]).length,vistos:h.leads.length,omitidos:h.masLeads,notaLeida:h.leads.some(l=>l.creoNota),incompleto:r.incompleto,resumen};
 const correcto=v.k==='otro' || (v.k==='nose' && r.incompleto===true);
 console.log(correcto?'✓':'✗',nombre,JSON.stringify(datos));if(!correcto)fallos++;
}
prueba('Celular, ocho leads y la nota relevante en el más antiguo',8,false);
prueba('Celular, nueve leads y la nota relevante en el más antiguo',9,false);
prueba('Nombre, tres leads y la nota relevante en el más antiguo',3,true);
prueba('Nombre, cuatro leads y la nota relevante en el más antiguo',4,true);
process.exitCode=fallos?1:0;
