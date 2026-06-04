// Real Heaven Colchones panel data — Mayo 2026 (from window.DASH / TEAM_DEFAULT)
window.PANEL_DATA = {
  month: "Mayo", year: 2026, prevMonth: "Abril",
  curDay: 26, daysInMonth: 31,
  // Historial de meses publicados (cada uno enlaza a su HTML generado)
  archives: [
    { label: "Junio 2026", url: "#" },
    { label: "Mayo 2026", url: "#" },
    { label: "Abril 2026", url: "#" },
    { label: "Marzo 2026", url: "#" },
  ],
  global: { leads: 2576, prevLeads: 3000, cierres: 127, pipeline: 654540, ticket: 5153 },
  // Embudo del mes (lead → cierre)
  funnel2: [
    { n: "Leads del mes", v: 2576, c: "#27313F" },
    { n: "Sin respuesta", v: 1330, c: "#646E7B" },
    { n: "Calificados", v: 315, c: "#2E6FE0" },
    { n: "En etapas avanz.", v: 777, c: "#00B5AD" },
    { n: "Compradores", v: 127, c: "#159A57" },
  ],
  // Pipeline completo — todas las etapas (suma real de STAGES_BY_V)
  stagesGlobal: [
    { name: "Nueva consulta", count: 302, pct: 12, color: "#27313F" },
    { name: "Interesado", count: 85, pct: 3, color: "#2E6FE0" },
    { name: "Cotización enviada", count: 584, pct: 23, color: "#7A4AD9" },
    { name: "Agendado / Visita", count: 108, pct: 4, color: "#D98300" },
    { name: "Compradores", count: 122, pct: 5, color: "#159A57" },
    { name: "No Responden", count: 1330, pct: 52, color: "#646E7B" },
    { name: "Pedido cancelado – perdido", count: 13, pct: 1, color: "#9AA3AF" },
  ],
  // Origen de carga
  origin: { manual: 514, manualPct: 20, auto: 2029, autoPct: 80 },
  // Rendimiento por canal
  channels: [
    { ic: "✍", name: "Carga manual vendedora", leads: 514, pct: 20, cierres: 106, conv: 21, ticket: 5076, pipeline: 538140, cls: "green" },
    { ic: "⚙", name: "Automático (bot)", leads: 2029, pct: 80, cierres: 15, conv: 1, ticket: 2944, pipeline: 44170, cls: "red" },
    { ic: "🚶", name: "Walk-in (Tienda)", leads: 1, pct: 0, cierres: 1, conv: 100, ticket: 0, pipeline: 0, cls: "muted" },
  ],
  // conversion = 127 / 2576 ≈ 4.9%
  // Métricas agregadas del mes — fuente única de verdad (en producción generar.py las rellena desde Kommo)
  metrics: {
    noResp: 1330, noRespPct: 52,
    backlog: 890, backlogPct: 35,
    criticos7d: 650,
    nuncaTocados: 146,
    sinSucursalFichas: 2269, sinSucursalPct: 89,
    abiertosSinValor: 1078,
    duplicadosTel: 44, duplicadosFichas: 89,
    interesado: 85, agendado: 108,
  },
  leadsMomPct: -14,
  team: [
    { ini: "IR", name: "Isabel Robledo", suc: "Mia Plaza",    color: "#00B5AD", photo: "", leads: 620, prevLeads: 756, cierres: 44, conv: 7, ticket: 5253, value: 248000, calif: 61,  califPct: 10, noResp: 524, noRespPct: 85, agendado: 18, u24: 17, promTxt: "1 d",    tarde: 335, nunca: 7,   backlog: 7,   metaCierres: 45, metaMonto: 250000, v: "amber" },
    { ini: "MF", name: "Maria Flores",   suc: "Buenos Aires", color: "#2E6FE0", photo: "", leads: 624, prevLeads: 758, cierres: 34, conv: 5, ticket: 3832, value: 138000, calif: 126, califPct: 21, noResp: 23,  noRespPct: 4,  agendado: 12, u24: 90, promTxt: "8.9 h",  tarde: 3,   nunca: 135, backlog: 528, metaCierres: 40, metaMonto: 160000, v: "red" },
    { ini: "MS", name: "Mirian Salazar", suc: "Mia Plaza",    color: "#7A5AF0", photo: "", leads: 652, prevLeads: 732, cierres: 25, conv: 4, ticket: 4891, value: 132000, calif: 40,  califPct: 6,  noResp: 570, noRespPct: 88, agendado: 15, u24: 59, promTxt: "6.6 h",  tarde: 176, nunca: 2,   backlog: 44,  metaCierres: 35, metaMonto: 160000, v: "green" },
    { ini: "CC", name: "Carola Chavez",  suc: "Central",      color: "#D98300", photo: "", leads: 655, prevLeads: 754, cierres: 24, conv: 4, ticket: 5075, value: 136540, calif: 79,  califPct: 12, noResp: 210, noRespPct: 33, agendado: 10, u24: 13, promTxt: "22.4 h", tarde: 203, nunca: 0,   backlog: 311, metaCierres: 35, metaMonto: 150000, v: "green" },
    { ini: "JM", name: "Jonathan Monje", suc: "Central",      color: "#159A57", photo: "", leads: 25,  prevLeads: 0,   cierres: 0,  conv: 0, ticket: 0,    value: 0,      calif: 9,   califPct: 36, noResp: 3,   noRespPct: 12, agendado: 1,  u24: 77, promTxt: "15.5 h", tarde: 0,   nunca: 2,   backlog: 0,   metaCierres: 8,  metaMonto: 20000,  v: "green", nuevo: true },
  ],
  funnel: [
    { name: "Nueva consulta",     count: 1180 },
    { name: "Interesado",         count: 640 },
    { name: "Cotización enviada", count: 352 },
    { name: "Agendado / Visita",  count: 196 },
    { name: "Compradores",        count: 127 },
    { name: "No Responden",       count: 418 },
  ],
  nav: [
    { id: "resumen", label: "Resumen" },
    { id: "equipo", label: "Equipo", badge: "5" },
    { id: "seguimiento", label: "Seguimiento", badge: "890" },
    { id: "alertas", label: "Alertas", badge: "8" },
    { id: "analisis", label: "Análisis IA" },
    { id: "conversion", label: "Conversión" },
    { id: "semanal", label: "Semanal" },
    { id: "sucursales", label: "Sucursales" },
    { id: "proyeccion", label: "Proyección" },
    { id: "datos", label: "Datos" },
  ],
  stagesByV: {
    "Isabel Robledo": [["Nueva consulta", 11], ["Interesado", 2], ["Cotización enviada", 20], ["Agendado / Visita", 17], ["Compradores", 44], ["No Responden", 524]],
    "Maria Flores": [["Nueva consulta", 231], ["Interesado", 24], ["Cotización enviada", 232], ["Agendado / Visita", 70], ["Compradores", 34], ["No Responden", 23]],
    "Mirian Salazar": [["Nueva consulta", 3], ["Cotización enviada", 33], ["Agendado / Visita", 15], ["Compradores", 25], ["No Responden", 570]],
    "Carola Chavez": [["Nueva consulta", 55], ["Interesado", 51], ["Cotización enviada", 289], ["Agendado / Visita", 5], ["Compradores", 24], ["No Responden", 210]],
    "Jonathan Monje": [["Nueva consulta", 2], ["Interesado", 8], ["Cotización enviada", 10], ["Agendado / Visita", 1], ["No Responden", 3]],
  },
};
// Helpers — moneda local: Boliviano (Bs)
window.fmtMoney = (n) => "Bs " + Math.round(n).toLocaleString("en-US");
window.fmtK = (n) => n >= 1000 ? "Bs " + (n / 1000).toFixed(n >= 100000 ? 0 : 1) + "k" : "Bs " + Math.round(n);
// Conversión = compradores ÷ leads (× 100). Calculada en vivo desde cierres y
// leads reales — nunca un valor escrito a mano, para evitar inconsistencias.
window.convPct = (v) => v && v.leads ? +(v.cierres / v.leads * 100).toFixed(1) : 0;
