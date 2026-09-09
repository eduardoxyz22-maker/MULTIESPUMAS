const fs=require('fs'),assert=require('assert/strict'),path=require('path'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME_PATH});try{
const p=await b.newPage({timezoneId:'America/La_Paz'});await p.route(/^https?:/,r=>r.abort());const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve(process.env.PANEL_TEST||'pedidos.html')).href);
const checks=await p.evaluate(()=>{
 const out=[],ck=(n,v)=>out.push([n,!!v]);const k=stockClave({codigo:'CH1129'}),h=todayStr();
 const order=(id,seller,n,d=0,chk='')=>({id,cliente:id,vendedor:seller,fecha:stockSumarDias(h,d),productos:[{codigo:'CH1129',desc:'TITANIO LATEX',medida:'140x190',cant:n,chk}]});
 const reset=()=>{STOCK=stockVacio();STOCK.c={f:h,u:{[k]:0}};STATE=[];};const data=()=>stockData().lista.find(o=>o.k===k);
 reset();STATE=[order('e','EDUARDO',40,-1)];let o=data();ck('Eduardo no crea reserva especulativa',o.vendidosUnicos===40&&o.vendidosRotacion===0&&o.porDia===0&&o.pedir===0&&o.aviso==='unico');
 // Regla confirmada por el dueño el 09/09 («Deja como lo dejó ChatGPT nomás», §4dg): una venta del equipo, aunque sea una sola, SÍ es rotación. Solo Eduardo queda afuera.
 for(const seller of ['Sueña','Fernando','Mauricio','Juan Pablo','Carola','María','Mirian','Isabel','Jonathan','Jonahatan','ROHO']){STATE=[order('s',seller,8,-1)];o=data();ck(seller+' aporta rotación incluso en una venta',o.vendidosRotacion===8&&o.vendidosUnicos===0&&o.porDia>0&&o.aviso!=='unico');}
 STATE=[order('e','Eduardo',80,-1),order('s','Fernando',8,-1),order('p','Eduardo',3,1)];o=data();ck('mezcla excluye solo Eduardo del ritmo y conserva su pendiente',o.vendidosRotacion===8&&o.vendidosUnicos===80&&o.comp===3);
 STATE=[order('s','Fernando',1,-1)];ck('poca venta no se etiqueta pedido único',data().aviso!=='unico');
 reset();STATE=[order('m','Fernando',2,-1,'im')];STOCK.g={Moreno:{f:h,u:{[k]:2}}};o=data();ck('recogida vencida sigue pendiente y no se resta de fábrica',o.comp===2&&o.salidas===0);REVSTK_SOLO_VACIOS=true;REVSTK_DIAS='todos';let r=stockAsignar();ck('revisita conserva Moreno vencido visible',r.revisadas.length===1&&r.tot.im===1);
 reset();STATE=[order('m','Fernando',2,1,'im'),order('n','Fernando',2,2,'')];STOCK.g={Moreno:{f:h,u:{[k]:4}}};STOCK.p=[{id:'r',k,u:2,tipo:'recogida',de:'Moreno',f:h,esp:tomorrowStr(),r:''}];o=data();ck('recogida reservada no se ofrece dos veces',o.enOtros===2&&o.enCamino===2);r=stockAsignar();ck('marca Moreno y traslado no duplican reserva',r.pedidos[0].lineas[0].ahora==='im');
 ['guardarStock','closeModal','renderStock','renderAdmin','toast'].forEach(n=>window[n]=()=>{});
 document.body.insertAdjacentHTML('beforeend','<input id="stk-rec-k"><input id="stk-rec-u" value="2"><input id="stk-rec-f">');document.getElementById('stk-rec-k').value=k;document.getElementById('stk-rec-f').value=tomorrowStr();guardarStockRecogida();ck('programa únicamente unidades libres',STOCK.p.length===2&&stockLibreOrigen(k,'Moreno')===0);guardarStockRecogida();ck('doble programación no supera origen',STOCK.p.length===2);STOCK.p=STOCK.p.filter(q=>q.id==='r');
 document.body.insertAdjacentHTML('beforeend','<input id="stk-rec-r" value="1">');recibirStockPedido('r');ck('recepción parcial mantiene saldo pendiente',STOCK.p[0].u===1&&!STOCK.p[0].r&&STOCK.p[0].ru===1);ck('movimiento conserva unidades físicas',STOCK.g.Moreno.u[k]===3&&STOCK.e.reduce((n,x)=>n+x.u,0)===1);recibirStockPedido('r');ck('doble clic no duplica recepción',STOCK.e.length===1);document.getElementById('stk-rec-r').disabled=false;recibirStockPedido('r');ck('segunda recepción completa y conserva total',!!STOCK.p[0].r&&STOCK.p[0].u===2&&STOCK.p[0].ru===2&&STOCK.g.Moreno.u[k]===2);
 reset();STATE=[order('p','Fernando',5,1)];STOCK.c.u[k]=1;STOCK.g={Moreno:{f:h,u:{[k]:2}}};o=data();ck('faltante separa recogida de fabricación',o.recoger===2&&o.fabricar===2&&o.pedir===4);
 r=stockAsignar();ck('revisión incluye recogida parcial y solo fabrica déficit',r.traerIM[0].u===2&&r.faltan[0].u===2);let copiado='';copyText=t=>copiado=t;copiarRevStkFabricar();ck('copiar revisión coincide con la cantidad visible',copiado.includes('× 2'));
 reset();STATE=[order('p','Fernando',4,1)];STOCK.p=[{id:'t',k,u:4,f:h,esp:stockSumarDias(h,-1),r:''}];o=data();ck('llegada vencida sigue pendiente sin duplicar fabricación',o.deposito===0&&o.pedir===0&&o.enCamino===4&&o.corte);r=stockAsignar();ck('revisión no repite fabricación ya encargada',r.faltan.length===0);
 ck('Carioca Río, Premier y Bahía no se fabrican',['COLCHON CARIOCA RIO|140x190','COLCHON CARIOCA PREMIER|140x190','COLCHON CARIOCA BAHIA|140x190'].every(stockCariocaDescontinuado));
 return out;
});checks.forEach(([n,v])=>console.log((v?'OK ':'FALLO ')+n));assert(checks.every(x=>x[1]));assert.deepEqual(errors,[]);console.log(checks.length+' comprobaciones sin errores JS');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1);});

