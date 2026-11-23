'use strict';
// node prueba-cierre-y-tareas.cjs /ruta/al/proyecto
// Datos inventados. Se cargan las maquetas de las suites del proyecto, sin red.
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const assert = require('node:assert/strict');
const raiz=path.resolve(process.argv[2] || path.join(__dirname, '..'));
function maqueta(archivo, inicio, nombres) {
  const dir=path.join(raiz,'tests'), f=path.join(dir,archivo), src=fs.readFileSync(f,'utf8');
  const fin=src.indexOf(inicio); assert(fin>0,'Cambió el comienzo de '+archivo);
  const modulos={fs,vm,path};
  return vm.runInNewContext(src.slice(0,fin)+'\n({'+nombres+'})', {
    __dirname:dir, process:{env:{}}, Date, console, require(n){assert(Object.hasOwn(modulos,n));return modulos[n];}
  }, {filename:f});
}
let fallos=0;
function caso(n,ok,datos){ console.log((ok?'✓ ':'✗ ')+n+' '+JSON.stringify(datos)); if(!ok)fallos++; }
function cierre(n,estado,cerrarAntes,esperado){
  const m=maqueta('test_cruce_ventas.js',"console.log('\\n── 1. Qué se encola",'S,D,VEND,U_CAR,ped,kommoHeaven,servidor,pasar');
  const k=m.kommoHeaven({sinCharla:true,nota:'Volver a llamar'}); k.leads[71].created_by=m.U_CAR;
  function cerrar(){ Object.assign(k.leads[71],{status_id:estado,updated_at:m.S(),closed_at:m.S()}); }
  if(cerrarAntes){cerrar();m.pasar(1);}
  const s=m.servidor(m.VEND,k), p=m.ped(), guardado=s.guardar(p);
  assert(guardado.ok && s.cola().length===1, 'La venta debe entrar en cola');
  m.pasar(1); if(!cerrarAntes && estado)cerrar();
  m.pasar(1); s.ctx.waRepaso();
  caso(n,s.cx().length===esperado,{avisos:s.cx().length,esperado});
}
cierre('Lead abierto al guardar y durante el repaso',0,false,1);
cierre('Lead ya perdido al guardar',143,true,0);
cierre('Lead perdido un minuto después de guardar',143,false,1);
cierre('Lead ya ganado y cerrado al guardar',142,true,0);
cierre('Lead ganado y cerrado un minuto después de guardar',142,false,1);

function tareas(n,anteriores){
  const m=maqueta('test_quien_atiende.js','function servidor()','kommo,cargar,S,D,U_CAR,U_MAR');
  const k=m.kommo(), ids=Array.from({length:40},(_,i)=>101+i);
  k.contacto(61,'CLIENTE INVENTADO','70011122',ids);
  ids.forEach(id=>k.lead(id,{created_at:m.S-m.D*35,updated_at:m.S-m.D*30,responsible_user_id:m.U_MAR}));
  // Tareas aún abiertas, pero vencidas repartidas por el grupo; solo la de Carola tiene fecha futura.
  const filas=Array.from({length:anteriores},(_,i)=>({id:i+1,entity_id:ids[i%40],created_by:m.U_MAR,responsible_user_id:m.U_MAR,created_at:m.S-m.D*12,complete_till:m.S-m.D}));
  filas.push({id:900,entity_id:ids[39],created_by:m.U_CAR,responsible_user_id:m.U_CAR,created_at:m.S-m.D,complete_till:m.S+m.D});
  const s=m.cargar(k.K), pasar=s.ctx.UrlFetchApp.fetch, paginas=[];
  s.ctx.UrlFetchApp.fetch=(url,op)=>{
    const u=new URL(url);
    if(!u.pathname.endsWith('/tasks') || u.searchParams.get('filter[entity_type]')!=='leads' || u.hostname.includes('gerencia'))return pasar(url,op);
    const grupo=u.searchParams.getAll('filter[entity_id][]'), todas=filas.filter(t=>grupo.includes(String(t.entity_id)));
    const pagina=Number(u.searchParams.get('page')||1),lim=Number(u.searchParams.get('limit')||250);
    const corte=pagina*lim, trozo=todas.slice(corte-lim,corte);
    const enlace=new URL(url);enlace.searchParams.set('page',String(pagina+1));
    const hayOtra=todas.length>corte;
    paginas.push({pagina,filas:trozo.length,hayOtra});
    const o={_embedded:{tasks:trozo},_links:hayOtra?{next:{href:enlace.href}}:{}};
    return {getResponseCode:()=>trozo.length?200:204,getContentText:()=>trozo.length?JSON.stringify(o):''};
  };
  const r=s.post({action:'quienAtiende',cel:'70011122',quien:'Maria Flores',solo:'heaven',auto:1});
  assert(r.ok && r.cuentas.length && paginas.length,'Consulta a Kommo simulada incompleta');
  const cuenta=r.cuentas.find(c=>c.marca==='heaven');
  const atiende=cuenta.leads.some(l=>l.tarea && l.tarea.quien==='Carola Chavez');
  const resumen=s.ctx.qaResumenDe_(r,null,m.S);
  caso(n,atiende||!!r.incompleto,{atiende,incompleto:r.incompleto,resumen,paginas});
}
tareas('La tarea que retiene está en la primera página',249);
tareas('La tarea que retiene está en la segunda página',250);
process.exitCode=fallos?1:0;
