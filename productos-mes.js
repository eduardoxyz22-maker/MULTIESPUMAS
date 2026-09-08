/* Contabilidad → Ventas. Un mismo corte de datos alimenta pantalla y Excel.
   Precio y total: se usan prodPrecio/prodSub y ventaTotal, sin repartir el total
   de una venta entre sus productos ni relacionar una línea con cada pago. */
var PM_REPORTE=null, PM_TURNO=0, PM_PESTANA='consolidado';
function pmNorm(v){return String(v==null?'':v).trim().replace(/\s+/g,' ').toUpperCase();}
function pmNumero(v){return v!==null&&v!==undefined&&String(v).trim()!==''&&isFinite(Number(v))?Number(v):null;}
function pmFecha(p,base){return base==='entrega'?(fechaSalida(p)||contaFecha(p)):contaFecha(p);}
function pmMesTexto(m){return new Date(m+'-15T12:00:00').toLocaleDateString('es-BO',{month:'long',year:'numeric'});}
function pmMonto(n){return n==null?'Sin dato':fmtBs(n);}
function pmCantidad(n){return n==null?'Sin dato':Number(n).toLocaleString('es-BO',{maximumFractionDigits:6});}
function pmCalcular(lista,cfg,pendientes){
  var vistos=Object.create(null), repetidos=0;
  // Una fila de servidor por id. Nunca se deduplica por nota, cliente o importe.
  var unicos=(lista||[]).filter(function(p){if(!p)return false;var id=String(p.id||'');if(id&&vistos[id]){repetidos++;return false;}if(id)vistos[id]=1;return true;});
  var pedidos=unicos.filter(function(p){
    return !esFilaSistema(p)&&!esBorrador(p)&&!fueraDeConta(p,'tienda')&&
      (!cfg.vendedor||mismoVendedor(p.vendedor,cfg.vendedor))&&pmFecha(p,cfg.base).slice(0,7)===cfg.mes;
  });
  var dup=indiceDuplicados(pedidos), grupos=Object.create(null), detalle=[], ajustes=[], avisos=[];
  var unidades=0,sinCantidad=0,sinPrecio=0,sinProductos=0,totalPedidos=0,sinTotal=0,conocido=0;
  pedidos.forEach(function(p,pi){
    var id=String(p.id||('sin-id-'+pi)), nota=p.nota||p.oc||id;
    var total=sinMontoAnotado(p)?null:ventaTotal(p);
    if(total==null)sinTotal++;else totalPedidos=r2(totalPedidos+total);
    var prods=Array.isArray(p.productos)?p.productos:[], suma=0, incompleto=!prods.length;
    if(!prods.length)sinProductos++;
    prods.forEach(function(x){
      if(!x){incompleto=true;return;}
      var codigo=String(x.codigo||'').trim(), nombre=String(x.desc||'Sin descripción').trim(), variante=String(x.medida||'').trim();
      var clave=JSON.stringify([codigo?'codigo':'nombre',pmNorm(codigo||nombre),pmNorm(variante)]);
      var q=pmNumero(x.cant), precio=prodPrecio(x)>0?prodPrecio(x):null;
      // En el esquema actual, precio 0 o ausente significa que no se anotó precio.
      var importe=q!=null&&precio!=null?prodSub(x):null;
      if(q==null)sinCantidad++;else unidades+=q;
      if(importe==null){sinPrecio++;incompleto=true;}else{suma=r2(suma+importe);conocido=r2(conocido+importe);}
      var observacion=dup.marca[p.id]?'Posible duplicado: revisar la venta; incluida sin eliminar.':'';
      if(importe==null)observacion+=(observacion?' ':'')+'Importe sin dato.';
      if(q==null)observacion+=(observacion?' ':'')+'Cantidad sin dato.';
      var l={fecha:pmFecha(p,cfg.base),nota:nota,id:id,vendedor:p.vendedor||'',cliente:p.cliente||'',codigo:codigo,nombre:nombre,variante:variante,cantidad:q,precio:precio,importe:importe,observacion:observacion};
      detalle.push(l);
      if(!grupos[clave])grupos[clave]={codigo:codigo,nombre:nombre,variante:variante,unidades:0,sinCantidad:0,conocido:0,sinPrecio:0,pedidos:Object.create(null)};
      var g=grupos[clave];g.pedidos[id]=1;
      if(q==null)g.sinCantidad++;else g.unidades+=q;
      if(importe==null)g.sinPrecio++;else g.conocido=r2(g.conocido+importe);
    });
    var diferencia=total==null?null:r2(total-suma);
    if(incompleto||total==null||Math.abs(diferencia)>0.01)ajustes.push({nota:nota,vendedor:p.vendedor||'',total:total,detalle:suma,diferencia:diferencia,
      motivo:total==null?'Total de venta sin dato':incompleto?'Importe sin desglose: faltan productos o precios':'Ajuste sin distribuir (diferencia entre venta y productos)'});
  });
  var consolidado=Object.keys(grupos).map(function(k){var g=grupos[k];g.nPedidos=Object.keys(g.pedidos).length;g.importe=g.sinPrecio?null:g.conocido;return g;})
    .sort(function(a,b){return b.unidades-a.unidades||a.nombre.localeCompare(b.nombre)||a.variante.localeCompare(b.variante);});
  detalle.sort(function(a,b){return a.fecha.localeCompare(b.fecha)||a.nota.localeCompare(b.nota);});
  if(sinPrecio)avisos.push(sinPrecio+' líneas sin importe: el total monetario por producto es incompleto. No se valoran como cero.');
  if(sinCantidad)avisos.push(sinCantidad+' líneas sin cantidad válida: las unidades son incompletas.');
  if(sinProductos)avisos.push(sinProductos+' pedidos no tienen productos detallados.');
  if(sinTotal)avisos.push(sinTotal+' pedidos sin monto de venta registrado: el importe total vendido es incompleto.');
  if(dup.n)avisos.push(dup.n+' ventas pueden estar duplicadas. Se incluyen todas: revisarlas antes de facturar.');
  if(ajustes.length)avisos.push('La conciliación separa las diferencias del total de los pedidos. No se asignan descuentos generales a productos sin desglose.');
  var pend=(pendientes||[]).filter(function(p){return pedidos.some(function(q){return q.id===p.id;});}).length;
  if(pend)avisos.push(pend+' pedidos tienen cambios locales pendientes de sincronización, incluidos en este reporte.');
  if(repetidos)avisos.push('Se recibió más de una copia del mismo identificador; cada pedido se cuenta una sola vez.');
  avisos.push('Mismo alcance que Ventas: excluye ROHO, mayoristas, ATC y borradores. Las ventas eliminadas no están en la fuente. El sistema no registra anulaciones/devoluciones comerciales separadas; este reporte no deduce devoluciones a partir de una ATC.');
  avisos.push('El precio disponible es unitario; no hay un campo de descuento por línea. Los importes usan ese precio tal como quedó registrado. El recargo de entrega queda fuera de la venta.');
  return {cfg:cfg,titulo:'Productos vendidos — '+pmMesTexto(cfg.mes)+' — '+(cfg.vendedor||'Todos los vendedores'),
    criterio:'Fecha de '+(cfg.base==='entrega'?'entrega':'ingreso'),emitido:new Date().toLocaleString('es-BO'),
    pedidos:pedidos.length,productos:consolidado.length,unidades:unidades,sinCantidad:sinCantidad,sinPrecio:sinPrecio,
    total:sinTotal?null:totalPedidos,totalConocido:totalPedidos,conocido:conocido,consolidado:consolidado,detalle:detalle,ajustes:ajustes,avisos:avisos};
}
function pmCerrar(){PM_TURNO++;var el=document.getElementById('pm-overlay');if(el)el.remove();PM_REPORTE=null;}
function pmMarco(html){
  var el=document.getElementById('pm-overlay');
  if(!el){el=document.createElement('div');el.id='pm-overlay';el.className='pm-overlay';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Productos vendidos del mes');document.body.appendChild(el);}
  el.innerHTML='<div class="pm-cabecera"><b>📦 Productos del mes</b><button class="btn btn-sm" onclick="pmCerrar()" aria-label="Cerrar reporte">✕ Cerrar</button></div><div id="pm-body" class="pm-body">'+html+'</div>';
}
function abrirProductosMes(){
  if(contaTab()!=='ventas'){toast('Abrí Contabilidad → Ventas para consultar productos del mes.','err');return Promise.resolve();}
  var mes=(document.getElementById('cta-mes')||{}).value||'';
  if(segVal('cta-mode')!=='mes'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)){
    toast('Elegí «Mes» y seleccioná el mes que querés consultar.','err',6000);return Promise.resolve();
  }
  var cfg={mes:mes,base:contaBase(),vendedor:((document.getElementById('cta-vendedor')||{}).value||'').trim()};
  var turno=++PM_TURNO;PM_REPORTE=null;PM_PESTANA='consolidado';pmMarco('<p role="status">Cargando todas las ventas del mes…</p>');
  var consulta=CONNECTED?apiList():Promise.reject(Error('El panel está sin conexión. Conectalo para consultar el mes completo.'));
  return consulta.then(function(res){
    if(turno!==PM_TURNO)return;
    if(!res||!res.ok||!Array.isArray(res.pedidos))throw Error('No se pudieron consultar las ventas. Revisá la conexión y el acceso al panel.');
    // Superpone pendientes por id sin modificar STATE, filtros, pagos ni filas del sistema.
    var lista=res.pedidos.slice(),pend=getPending();
    pend.forEach(function(p){lista=lista.filter(function(q){return q.id!==p.id;});lista.push(p);});
    PM_REPORTE=pmCalcular(lista,cfg,pend);pmRender();
  }).catch(function(e){if(turno!==PM_TURNO)return;pmMarco('<p role="alert">'+esc(e.message)+'</p><button class="btn btn-primary" onclick="abrirProductosMes()">Reintentar</button>');});
}
function pmCambiar(tab){PM_PESTANA=tab==='detalle'?'detalle':'consolidado';pmRender();}
function pmTabla(headers,rows,footer){
  var celda=function(v){return '<td>'+esc(v)+'</td>';};
  return '<div class="pm-tabla"><table class="roho-tabla stk-tabla"><thead><tr>'+headers.map(function(h){return '<th>'+esc(h)+'</th>';}).join('')+'</tr></thead><tbody>'+rows.map(function(r){return '<tr>'+r.map(celda).join('')+'</tr>';}).join('')+'</tbody>'+(footer?'<tfoot><tr>'+footer.map(celda).join('')+'</tr></tfoot>':'')+'</table></div>';
}
function pmFilas(r,tipo,excel){
  var n=function(v,moneda){return excel?(v==null?'Sin dato':{v:v,t:'n',s:moneda?2:0}):(moneda?pmMonto(v):pmCantidad(v));};
  if(tipo==='consolidado')return r.consolidado.map(function(g){return [g.codigo||'Sin código',g.nombre,g.variante||'—',n(g.sinCantidad?null:g.unidades),n(g.nPedidos),n(g.importe,true)];});
  return r.detalle.map(function(l){return [l.fecha,l.nota,l.vendedor,l.cliente,l.codigo||'Sin código',l.nombre,l.variante||'—',n(l.cantidad),n(l.precio,true),n(l.importe,true),l.observacion];});
}
var PM_HC=['Código','Producto','Medida / variante','Unidades vendidas','Cantidad de pedidos','Importe vendido (Bs)'];
var PM_HD=['Fecha','Nota / pedido','Vendedor','Cliente','Código','Producto','Medida / variante','Cantidad','Precio unitario (Bs)','Importe línea (Bs)','Advertencias'];
function pmRender(){
  var r=PM_REPORTE;if(!r)return;
  var cards=[['Pedidos',r.pedidos],['Productos distintos',r.productos],['Unidades vendidas',r.sinCantidad?'Incompleto · '+pmCantidad(r.unidades)+' conocidas':pmCantidad(r.unidades)],['Importe total vendido',pmMonto(r.total)]];
  var html='<h2>'+esc(r.titulo)+'</h2><p>'+esc(r.criterio)+' · Emitido: '+esc(r.emitido)+'</p><div class="pm-resumen">'+cards.map(function(c){return '<div><small>'+esc(c[0])+'</small><strong>'+esc(c[1])+'</strong></div>';}).join('')+'</div>';
  html+='<div class="pm-avisos">'+r.avisos.map(function(a){return '<p>'+esc(a)+'</p>';}).join('')+'</div>';
  if(!r.detalle.length)html+='<p role="status"><b>No hay productos vendidos para este mes y vendedor.</b></p>';
  html+='<div class="pm-acciones"><div class="seg"><button class="'+(PM_PESTANA==='consolidado'?'active':'')+'" onclick="pmCambiar(\'consolidado\')">Consolidado por producto</button><button class="'+(PM_PESTANA==='detalle'?'active':'')+'" onclick="pmCambiar(\'detalle\')">Detalle de ventas</button></div><button class="btn btn-primary btn-sm" onclick="exportProductosMes()">Exportar Excel</button></div>';
  html+=pmTabla(PM_PESTANA==='detalle'?PM_HD:PM_HC,pmFilas(r,PM_PESTANA,false),PM_PESTANA==='detalle'?['TOTAL','','','','','','',r.sinCantidad?'Sin dato':pmCantidad(r.unidades),'',r.sinPrecio?'Sin dato':pmMonto(r.conocido),'']:['TOTAL','','',r.sinCantidad?'Sin dato':pmCantidad(r.unidades),r.pedidos+' pedidos únicos',r.sinPrecio?'Sin dato':pmMonto(r.conocido)]);
  html+='<p>Subtotal de líneas con importe conocido: <b>'+pmMonto(r.conocido)+'</b>. El total de pedidos cuenta cada venta una sola vez; no se suman los conteos de pedidos por producto.</p>';
  if(r.ajustes.length)html+='<h3>Conciliación con el total de ventas</h3>'+pmTabla(['Nota / pedido','Vendedor','Total venta (Bs)','Líneas conocidas (Bs)','Diferencia (Bs)','Tratamiento'],r.ajustes.map(function(a){return [a.nota,a.vendedor,pmMonto(a.total),pmMonto(a.detalle),pmMonto(a.diferencia),a.motivo];}));
  document.getElementById('pm-body').innerHTML=html;
}
function pmHojas(r){
  var n=function(v){return v==null?'Sin dato':{v:v,t:'n',s:2};};
  var meta=[[r.titulo],[r.criterio],['Mes',r.cfg.mes],['Vendedor',r.cfg.vendedor||'Todos los vendedores'],['Emitido',r.emitido],
    ['Pedidos',r.pedidos],['Productos distintos',r.productos],['Unidades',r.sinCantidad?'Sin dato':{v:r.unidades,t:'n'}],['Importe total vendido (Bs)',n(r.total)],['Subtotal de líneas conocidas (Bs)',n(r.conocido)]];
  r.avisos.forEach(function(a){meta.push(['Advertencia',a]);});meta.push([]);
  return ['consolidado','detalle'].map(function(tipo){
    var h=tipo==='detalle'?PM_HD:PM_HC,rows=meta.slice();rows.push(h.map(function(s){return {v:s,s:1};}));
    rows=rows.concat(pmFilas(r,tipo,true));
    var u=r.sinCantidad?'Sin dato':{v:r.unidades,t:'n'},imp=r.sinPrecio?'Sin dato':n(r.conocido);
    rows.push(tipo==='detalle'?['TOTAL','','','','','','',u,'',imp,'']:['TOTAL','','',u,r.pedidos+' pedidos únicos',imp]);
    if(r.ajustes.length){rows.push([],['Conciliación con el total de ventas'],['Nota / pedido','Vendedor','Total venta (Bs)','Líneas conocidas (Bs)','Diferencia (Bs)','Tratamiento']);r.ajustes.forEach(function(a){rows.push([a.nota,a.vendedor,n(a.total),n(a.detalle),n(a.diferencia),a.motivo]);});}
    return {name:tipo==='detalle'?'Detalle':'Consolidado',cols:tipo==='detalle'?[15,20,25,28,17,38,22,18,22,22,55]:[20,48,27,24,26,60],matrix:rows};
  });
}
function exportProductosMes(){
  if(!PM_REPORTE)return;
  var r=PM_REPORTE,tag=(r.cfg.vendedor||'todos').replace(/[^a-z0-9áéíóúñ]+/gi,'-');
  downloadBlob(buildXlsx(pmHojas(r)),'productos-'+r.cfg.mes+'-'+tag+'-'+r.cfg.base+'.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
