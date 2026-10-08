/* Administración: vista de lectura sobre los contratos existentes del panel.
   No calcula capacidades, no geolocaliza camiones y no escribe stock/pedidos. */
(function () {
  'use strict';
  var root = document.getElementById('adm-logistica');
  if (!root) return;
  var scene = null, pending = false, failed = false, generation = 0;
  var selected = null, model = null, inViewport = true, lastSignature = '';
  var selectButtons = new Map();
  var stage = root.querySelector('.adm-logistica-stage');
  var canvasHost = root.querySelector('.adm-logistica-canvas');
  var labels = root.querySelector('.adm-logistica-labels');
  var status = root.querySelector('[data-log-status]');
  var list = root.querySelector('[data-log-entities]');
  var detail = root.querySelector('[data-log-detail]');
  var number = function (n) { return Number.isFinite(Number(n)) ? Number(n) : 0; };
  var text = function (tag, value, className) {
    var el = document.createElement(tag); el.textContent = value;
    if (className) el.className = className;
    return el;
  };
  function button(value, action, className) {
    var el = text('button', value, className); el.type = 'button'; el.addEventListener('click', action); return el;
  }
  function snapshot() {
    var rows = admFilter();
    var byTruck = new Map(), unassigned = 0, units = 0;
    rows.forEach(function (p) {
      var name = vehiculoDe(p);
      var qty = (p.productos || []).reduce(function (n, x) { return n + number(x.cant); }, 0);
      units += qty;
      if (!name) { unassigned++; return; }
      if (!byTruck.has(name)) byTruck.set(name, {id:'truck:'+name, name:name, kind:'truck', units:0, delivered:0, drivers:new Set(), orders:[]});
      var truck = byTruck.get(name);
      truck.units += qty; truck.delivered += p.entregado ? 1 : 0;
      if (p.chofer) truck.drivers.add(String(p.chofer));
      // Keep only the fields used by the view, never retain mutable product objects.
      truck.orders.push({id:p.id, oc:p.oc, client:p.cliente, date:p.fecha, delivered:!!p.entregado});
    });
    var trucks = Array.from(byTruck.values()).sort(function (a,b) { return a.name.localeCompare(b.name, 'es'); });
    trucks.forEach(function (t) { t.drivers = Array.from(t.drivers).join(' · ') || 'Sin chofer asignado'; });
    var stock = typeof STOCK === 'object' && STOCK ? STOCK : {};
    var groups = stock.g || {};
    var depots = [
      {id:'depot:PTF', name:'PTF', subtitle:'Acá en fábrica', kind:'depot', reports:stock.c && stock.c.f ? [{name:'PTF', cut:stock.c}] : []},
      {id:'depot:BANZER', name:'Banzer', subtitle:'Depósito de salida', kind:'depot', reports:[]},
      {id:'depot:MORENO', name:'Moreno', subtitle:'Industrias Moreno', kind:'depot', reports:[]}
    ];
    Object.keys(groups).forEach(function (name) {
      if (stockEsLog(name)) return;
      var depot = recogerMismo('Banzer', name) ? depots[1] : stockAlmNombre(name) === 'Industrias Moreno' ? depots[2] : null;
      if (depot && groups[name] && groups[name].f) depot.reports.push({name:name, cut:groups[name]});
    });
    depots.forEach(function (d) {
      d.reports = d.reports.map(function (r) {
        return {name:r.name, date:String(r.cut.f || ''), time:String(r.cut.hora || ''), references:Object.keys(r.cut.u || {}).length};
      });
    });
    return {trucks:trucks, depots:depots, count:rows.length, units:units, unassigned:unassigned,
      state:typeof CARGA_ESTADO === 'string' ? CARGA_ESTADO : '',
      connected:!!CONNECTED, stockLoaded:!!STOCK_CARGADO};
  }
  function visible() {
    return !!(root.isConnected && document.getElementById('view-admin').classList.contains('active') &&
      document.getElementById('admin-content').style.display !== 'none' &&
      resumenAdmVisible() && !document.hidden && inViewport);
  }
  function release() {
    generation++; pending = false;
    if (scene) { scene.dispose(); scene = null; }
    canvasHost.replaceChildren(); labels.replaceChildren();
    root.dataset.scene = 'idle';
  }
  function select(id, focusDetail) {
    selected = id;
    renderDetail();
    selectButtons.forEach(function (el, key) { el.setAttribute('aria-pressed', String(key === selected)); });
    if (scene) scene.select(selected);
    if (focusDetail) {
      var heading = detail.querySelector('h3');
      if (heading) heading.focus({preventScroll:true});
    }
  }
  function renderDetail() {
    detail.replaceChildren();
    var entity = model && model.trucks.concat(model.depots).find(function (e) { return e.id === selected; });
    if (!entity) {
      selected = null;
      detail.append(text('div', 'TU OPERACIÓN', 'adm-logistica-eyebrow'), text('h3', 'Todo a la vista'),
        text('p', 'Seleccioná un camión para ver sus pedidos o un depósito para consultar su último corte.'),
        text('div', String(model ? model.count : 0), 'adm-logistica-number'), text('p', 'pedidos en el filtro actual'),
        text('small', 'Los vehículos representan asignaciones. Su posición en la escena es ilustrativa.'));
      return;
    }
    var close = button('Cerrar detalle ×', function () {
      var previous = selected; select(null, false);
      var el = selectButtons.get(previous); if (el) el.focus({preventScroll:true});
    }, 'adm-logistica-close');
    var heading = text('h3', entity.name); heading.tabIndex = -1;
    detail.append(close, text('div', entity.kind === 'truck' ? 'CAMIÓN SELECCIONADO' : 'DEPÓSITO SELECCIONADO', 'adm-logistica-eyebrow'), heading);
    if (entity.kind === 'truck') {
      detail.append(text('p', entity.drivers), text('div', String(entity.orders.length), 'adm-logistica-number'),
        text('p', 'pedidos asignados · ' + entity.units + ' unidades'),
        text('p', entity.delivered + ' entregados · ' + (entity.orders.length - entity.delivered) + ' pendientes', 'adm-logistica-pill'),
        text('small', 'Capacidad y ubicación en vivo no disponibles.'));
      var orders = text('div', '', 'adm-logistica-orders');
      entity.orders.forEach(function (order) {
        orders.append(button((order.oc ? 'OC ' + order.oc + ' · ' : '') + (order.client || 'Sin nombre') + ' ↗', function () {
          // Revalidate against current data before using the existing detail action.
          if (findById(order.id)) showPedidoModal(order.id);
          else refresh();
        }, 'adm-logistica-order'));
      });
      detail.append(orders);
    } else {
      detail.append(text('p', entity.subtitle));
      if (!model.stockLoaded && model.connected) detail.append(text('p', 'Esperando las existencias de la planilla.', 'adm-logistica-pill'));
      else if (!entity.reports.length) detail.append(text('p', 'Sin corte de existencias registrado.', 'adm-logistica-pill'));
      else entity.reports.forEach(function (r) {
        detail.append(text('p', 'Corte del ' + fmtFecha(r.date) + (r.time ? ' · ' + r.time : '')),
          text('p', r.references + ' referencias en el corte'),
          text('small', r.name));
      });
      detail.append(text('small', 'El corte es una foto del reporte. Consultá las existencias calculadas en Stock y reposición.'),
        button('Abrir Stock y reposición ↗', function () { abrirStock(); }, 'adm-logistica-primary'));
    }
  }
  function renderModel() {
    root.querySelector('[data-log-count]').textContent = model.count + ' pedidos · ' + model.units + ' unidades';
    var note = model.state === 'error' || model.state === 'reintento' ? 'Sin respuesta del servidor · mostrando los datos disponibles'
      : model.connected && (model.state === 'cargando' || model.state === 'inicio') ? 'Actualizando pedidos…'
      : !model.connected ? 'Datos de este dispositivo'
      : 'Asignaciones según los filtros de Administración';
    root.querySelector('[data-log-note]').textContent = note;
    root.querySelector('[data-log-empty]').textContent = !model.count ? 'No hay pedidos con estos filtros.' :
      !model.trucks.length ? 'Los pedidos del filtro todavía no tienen vehículo asignado.' :
      model.unassigned ? model.unassigned + (model.unassigned === 1 ? ' pedido sin vehículo asignado.' : ' pedidos sin vehículo asignado.') : '';
    if (model.trucks.length > 8) root.querySelector('[data-log-empty]').textContent += ' La escena muestra hasta 8 camiones. Todos están disponibles en los botones.';
    var focused = document.activeElement && document.activeElement.dataset.logId;
    list.replaceChildren(); selectButtons.clear();
    model.depots.concat(model.trucks).forEach(function (entity) {
      var el = button('', function () { select(entity.id, false); }, 'adm-logistica-entity');
      el.dataset.logId = entity.id;
      el.setAttribute('aria-pressed', String(entity.id === selected));
      el.append(text('span', entity.kind === 'truck' ? '↗' : '▤', 'adm-logistica-entity-icon'),
        text('strong', entity.name), text('small', entity.kind === 'truck' ? entity.orders.length + (entity.orders.length === 1 ? ' pedido' : ' pedidos') : entity.subtitle));
      list.append(el); selectButtons.set(entity.id, el);
    });
    if (focused && selectButtons.has(focused)) selectButtons.get(focused).focus({preventScroll:true});
    renderDetail();
  }
  function sceneError() {
    release(); failed = true; root.dataset.scene = 'fallback';
    status.hidden = false;
    status.replaceChildren(text('p', 'La vista 3D no está disponible. Podés consultar todos los camiones y depósitos en los botones de abajo.'),
      button('Reintentar vista 3D', function () { failed = false; refresh(); }, 'adm-logistica-retry'));
  }
  function refresh() {
    if (!visible()) { release(); return; }
    try {
      model = snapshot();
      var signature = JSON.stringify(model);
      if (signature !== lastSignature) { lastSignature = signature; renderModel(); if (scene) scene.update(model, selected); }
      if (scene || pending || failed) return;
      pending = true; var token = ++generation;
      root.dataset.scene = 'loading'; status.hidden = false; status.textContent = 'Preparando la vista 3D…';
      import('./admin-logistica-scene.mjs').then(function (module) {
        if (token !== generation || !visible()) return;
        pending = false;
        scene = module.mountScene({host:canvasHost, labels:labels, model:model, selected:selected,
          onSelect:function (id) { select(id, true); }, onError:sceneError});
        root.dataset.scene = 'ready'; status.hidden = true;
      }).catch(function () { if (token === generation) sceneError(); });
    } catch (error) { sceneError(); }
  }
  root.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && selected) { event.preventDefault(); var old = selected; select(null, false); selectButtons.get(old)?.focus(); }
  });
  root.querySelector('[data-log-reset]').addEventListener('click', function () { if (scene) scene.reset(); });
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('pagehide', release);
  window.addEventListener('pageshow', refresh);
  if (window.IntersectionObserver) {
    var observer = new IntersectionObserver(function (entries) { inViewport = entries[0].isIntersecting; refresh(); }, {rootMargin:'120px'});
    observer.observe(stage);
  }
  // Also repaint loading/error state when the panel's existing connection banner changes.
  var connectionObserver = new MutationObserver(refresh);
  connectionObserver.observe(document.getElementById('conn-admin'), {childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
  window.AdminLogistica = {refresh:refresh};
  refresh();
}());
