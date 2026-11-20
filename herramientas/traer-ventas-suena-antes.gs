/* 🛏️ TRAER LAS VENTAS DE SUEÑA DE ANTES (20/11, dueño: «trae las ventas de sueña de antes también»).

   El repaso de cada 5 minutos (kommoRepasoSuena_, servidor 2026-11-20-b) mira solo las últimas 6 horas: las ventas de Sueña que
   pasaron a «COMPRO» antes de implementar la 20-b no llegaron a la bandeja «Ventas de Kommo por cargar». Esto las trae UNA vez.

   CÓMO SE USA (no hay que reimplementar nada):
   1. En el proyecto de Apps Script: ➕ (Archivos) → Secuencia de comandos → nombre «traer_suena_antes» → pegar ESTE archivo entero.
      ⚠️ Archivo APARTE: nunca adentro de Código.gs.
   2. Guardar (💾) y, arriba, elegir la función  verVentasSuenaAntes  → Ejecutar. Solo LEE: dice cuántas hay desde el 01/11, de qué
      vendedor, cuántas ya están en el panel y cuántas traería. No escribe nada.
   3. Elegir  traerVentasSuenaAntes  → Ejecutar. Arma los borradores en la bandeja con las MISMAS reglas que el repaso: no repite lo que
      ya está, no trae lo descartado ni lo que cerró el panel. Si dice «faltan N, volvé a ejecutarla», ejecutarla otra vez (Google corta
      a los 6 minutos).
   4. Listo: se puede borrar este archivo del proyecto.

   Usa las funciones del Código.gs 2026-11-20-b (kcMeta_, kGet_, kEmb_, kSnapshot_, kcPropios_, kDescartadosLeer_, kommoProcesarObj_).
   Los nombres de acá empiezan con «suenaAntes» / «SUENA_ANTES» para no chocar con los de Código.gs (todos los archivos comparten nombres).
   En el registro van solo cantidades y vendedores, nunca clientes. */

var SUENA_ANTES_DESDE = '2026-11-01';     // las ventas con «Fecha contrato» desde este día (hora de Bolivia)
var SUENA_ANTES_TANDA = 10;               // de a cuántos leads por vuelta
var SUENA_ANTES_TOPE_MS = 270000;         // 4,5 minutos: deja margen antes del corte de 6 de Google

/** Los leads de Sueña en «COMPRO» con «Fecha contrato» (o, sin ella, el cierre) desde SUENA_ANTES_DESDE. Con KC_CTA = 'suena' puesto. */
function suenaAntesLeads_() {
  var m = kcMeta_(true);
  if (!m || m.error || !m.etapa) return { error:(m && m.error) || 'sin la etapa COMPRO' };
  var desde = Math.floor(new Date(SUENA_ANTES_DESDE + 'T00:00:00-04:00').getTime() / 1000);
  var out = [], vistos = {};
  for (var pg = 1; pg <= 40; pg++) {
    var r = kGet_('/leads?limit=250&page=' + pg + '&order[updated_at]=desc' +
                  '&filter[statuses][0][pipeline_id]=' + encodeURIComponent(m.embudo) +
                  '&filter[statuses][0][status_id]=' + encodeURIComponent(m.etapa) +
                  '&filter[updated_at][from]=' + desde);
    if (r === null) return { error:'Kommo de Sueña no contestó (página ' + pg + ')' };
    var ls = kEmb_(r, 'leads');
    for (var i = 0; i < ls.length; i++) {
      var l = ls[i], id = String(l.id || '');
      if (!id || vistos[id]) continue;
      vistos[id] = 1;
      var fc = 0, cf = l.custom_fields_values || [];
      for (var j = 0; j < cf.length; j++) if (String(cf[j].field_id) === String(m.fc) && cf[j].values && cf[j].values[0]) fc = Number(cf[j].values[0].value) || 0;
      var cuando = fc || Number(l.closed_at) || Number(l.updated_at) || 0;
      if (cuando < desde) continue;
      out.push({ id:id, uid:String(l.responsible_user_id || ''), cuando:cuando });
    }
    if (ls.length < 250 || !(r._links && r._links.next)) break;
  }
  out.sort(function (a, b) { return a.cuando - b.cuando; });   // de la más vieja a la más nueva
  return { m:m, leads:out };
}

/** Lo que falta traer: ni en el panel, ni cerrado desde el panel, ni descartado por una vendedora. */
function suenaAntesFaltan_(leads) {
  var snap = kSnapshot_(getSheet(), true), propios = kcPropios_(), desc = kDescartadosLeer_();
  var r = { ya:0, propios:0, descartados:0, faltan:[] };
  leads.forEach(function (x) {
    if (snap.cargados[x.id]) r.ya++;
    else if (propios[x.id]) r.propios++;
    else if (desc[x.id] != null) r.descartados++;
    else r.faltan.push(x);
  });
  return r;
}

/** ▶️ SOLO LEE: cuántas ventas de Sueña hay desde SUENA_ANTES_DESDE, de qué vendedor, cuántas ya están y cuántas traería. */
function verVentasSuenaAntes() {
  var L = [];
  if (!kProp_('KOMMO_TOKEN_SUENA')) { L.push('❌ Falta la propiedad KOMMO_TOKEN_SUENA.'); Logger.log(L.join('\n')); return L; }
  KC_CTA = 'suena';
  try {
    var R = suenaAntesLeads_();
    if (R.error) { L.push('❌ ' + R.error); return L; }
    var F = suenaAntesFaltan_(R.leads), porVend = {};
    F.faltan.forEach(function (x) { var nk = kcUsuarioNombre_(R.m, x.uid) || '', n = kSuenaVendedor_(x.uid, nk) || nk || ('usuario ' + x.uid); porVend[n] = (porVend[n] || 0) + 1; });
    L.push('Ventas de Sueña en «COMPRO» desde el ' + SUENA_ANTES_DESDE + ': ' + R.leads.length);
    L.push('  · ya están en el panel: ' + F.ya + ' · cerradas desde el panel: ' + F.propios + ' · descartadas por una vendedora: ' + F.descartados);
    L.push('  · traería a la bandeja: ' + F.faltan.length);
    Object.keys(porVend).sort().forEach(function (n) { L.push('      ' + n + ': ' + porVend[n]); });
    L.push(F.faltan.length ? '▶️ Para traerlas: ejecutar traerVentasSuenaAntes.' : '✅ No falta ninguna.');
  } finally { KC_CTA = ''; Logger.log(L.join('\n')); }
  return L;
}

/** ▶️ TRAE a la bandeja las que faltan (de a SUENA_ANTES_TANDA, hasta 4,5 minutos). Se puede ejecutar de nuevo: no repite nada. */
function traerVentasSuenaAntes() {
  var L = [], t0 = Date.now(), creados = 0, saltados = 0, err = '';
  if (!kProp_('KOMMO_TOKEN_SUENA')) { L.push('❌ Falta la propiedad KOMMO_TOKEN_SUENA.'); Logger.log(L.join('\n')); return L; }
  KC_CTA = 'suena';
  try {
    var R = suenaAntesLeads_();
    if (R.error) { L.push('❌ ' + R.error); return L; }
    var F = suenaAntesFaltan_(R.leads), ids = F.faltan.map(function (x) { return x.id; }), hechos = 0;
    while (hechos < ids.length && Date.now() - t0 < SUENA_ANTES_TOPE_MS) {
      var tanda = ids.slice(hechos, hechos + SUENA_ANTES_TANDA);
      var rr = kommoProcesarObj_(tanda, 'antes-suena');
      if (rr.ok === false) { err = String(rr.error || 'busy'); break; }
      creados += rr.creados || 0; saltados += (rr.saltados || []).length;
      hechos += tanda.length;
    }
    L.push('🛏️ Ventas de Sueña desde el ' + SUENA_ANTES_DESDE + ': ' + R.leads.length + ' · ya estaban: ' + (F.ya + F.propios + F.descartados));
    L.push('  · traídas a la bandeja «Ventas de Kommo por cargar»: ' + creados + (saltados ? ' · salteadas (sin datos o ya estaban): ' + saltados : ''));
    var faltan = ids.length - hechos;
    if (err) L.push('⚠️ La planilla estaba ocupada (' + err + '): volvé a ejecutar traerVentasSuenaAntes en un minuto.');
    else if (faltan > 0) L.push('⏳ Faltan ' + faltan + ': volvé a ejecutar traerVentasSuenaAntes (Google corta a los 6 minutos).');
    else L.push('✅ Listo: ya están todas. Las vendedoras de Sueña las completan desde «Ventas de Kommo por cargar».');
  } finally { KC_CTA = ''; Logger.log(L.join('\n')); }
  return L;
}
