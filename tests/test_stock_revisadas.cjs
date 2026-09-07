const assert=require('assert/strict'),path=require('path'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROME_PATH});try{
const page=await browser.newPage({timezoneId:'America/La_Paz'}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>r.abort());await page.goto(pathToFileURL(path.resolve(process.env.PANEL_TEST||'pedidos.html')).href);
const r=await page.evaluate(async()=>{
const checks=[];function check(nombre,b){checks.push([nombre,!!b]);}
const hoy=todayStr(),manana=tomorrowStr();stockData=()=>({lista:[{k:'A',desc:'Producto A',deposito:1,enOtros:1}]});stockClave=x=>x.codigo;stockDescontinuadoK=()=>false;stockCuenta=p=>!p.atc;esATCPedido=p=>!!p.atc;esProdDeTienda=x=>!!x.tienda;
const pedido=(id,chk,fecha=hoy)=>({id,fecha,cliente:id,productos:[{codigo:'A',desc:'Producto A',cant:1,chk}]});
STATE=[pedido('nuevo',''),pedido('revisado','ok',manana),pedido('moreno','im',manana),pedido('faltante','no')];STOCK={};
abrirStockRevisar();check('protección activa al abrir',REVSTK_SOLO_VACIOS);check('las tres marcas existentes no se proponen',REVSTK.tot.revisadas===3&&revStkCambios().length===1);check('reserva ambos almacenes para lo revisado',revStkCambios()[0].lineas[0].ahora==='no');check('la casilla aparece marcada',document.querySelector('input[onchange="revStkSoloVacios()"]').checked);
REVSTK_DIAS='hoy';REVSTK=stockAsignar();check('las reservas de mañana no se liberan al filtrar hoy',revStkCambios()[0].lineas[0].ahora==='no');
revStkSoloVacios();check('revisión total sigue siendo opcional',!REVSTK_SOLO_VACIOS&&REVSTK.tot.contra>0);abrirStockRevisar();check('reabrir vuelve a proteger lo revisado',REVSTK_SOLO_VACIOS);
STATE=[pedido('nuevo','')];REVSTK_DIAS='todos';abrirStockRevisar();STATE[0].productos[0].chk='im';aplicarStockRevisar();check('marca puesta después de la vista previa no se pisa',STATE[0].productos[0].chk==='im'&&revStkCambios().length===0);
STATE=[pedido('nuevo','')];abrirStockRevisar();let writes=0;CONNECTED=true;apiSave=async()=>{writes++;return {ok:true};};[ 'saveMirror','updateStats','renderAdmin','refreshCarga','renderChoferSiActivo','renderEntregasSiActivo','renderStock'].forEach(k=>window[k]=()=>{});upsert=p=>{};
aplicarStockRevisar();aplicarStockRevisar();await new Promise(r=>setTimeout(r,60));check('aplicar dos veces no duplica guardados',writes===1);check('la marca se aplicó',STATE[0].productos[0].chk==='ok');abrirStockRevisar();check('repetir revisión no cambia la marca aplicada',revStkCambios().length===0);
STATE=JSON.parse(JSON.stringify(STATE));abrirStockRevisar();check('recargar datos conserva lo revisado',revStkCambios().length===0);
STATE=[pedido('sin','')];abrirStockRevisar();STOCK={c:{f:hoy}};aplicarStockRevisar();check('cambiar el inventario invalida la propuesta',STATE[0].productos[0].chk==='');
STATE=[pedido('nuevo','')];STATE[0].productos[0].tienda=true;abrirStockRevisar();check('productos de tienda se excluyen',revStkCambios().length===0);STATE[0].productos[0].tienda=false;STATE[0].productos[0].enProd=true;abrirStockRevisar();check('producción confirmada se excluye',revStkCambios().length===0);
STATE=[pedido('atc','')];STATE[0].atc=true;abrirStockRevisar();check('ATC se excluye',revStkCambios().length===0);
STATE=[pedido('revisado','ok'),pedido('nuevo','')];stockData=()=>({lista:[]});abrirStockRevisar();check('una marca previa no convierte stock desconocido en cero',revStkCambios().length===0&&REVSTK.tot.sinContar===1);
return checks;
});r.forEach(([n,b])=>{console.log((b?'OK ':'FALLO ')+n);});assert(r.every(x=>x[1]));assert.deepEqual(errors,[]);console.log(r.length+' comprobaciones correctas, sin errores JS');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
