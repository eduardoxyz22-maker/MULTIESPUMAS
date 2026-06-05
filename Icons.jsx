// Shared inline SVG icons (Lucide-style, stroke-based) for the panel redesigns.
const ICON_PATHS = {
  resumen: <g><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></g>,
  equipo: <g><circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 6.5a3 3 0 0 1 0 6"/><path d="M17.5 14.5a5.5 5.5 0 0 1 3 5.5"/></g>,
  seguimiento: <g><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></g>,
  alertas: <g><path d="M12 4l9 16H3z"/><path d="M12 10v4"/><path d="M12 17h.01"/></g>,
  conversion: <g><path d="M4 19V5"/><path d="M4 15l5-5 4 3 7-8"/></g>,
  semanal: <g><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18"/><path d="M8 2v4"/><path d="M16 2v4"/></g>,
  sucursales: <g><path d="M3 21h18"/><path d="M5 21V8l7-4 7 4v13"/><rect x="9" y="13" width="6" height="8"/></g>,
  proyeccion: <g><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></g>,
  datos: <g><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></g>,
  bolt: <g><path d="M13 2L3 14h7l-1 8 10-12h-7z"/></g>,
  bulb: <g><path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 1 4 10.5c-.7.7-1 1.2-1 2.5H9c0-1.3-.3-1.8-1-2.5A6 6 0 0 1 12 3z"/></g>,
  sun: <g><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></g>,
  moon: <g><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></g>,
  history: <g><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></g>,
  chevron: <g><path d="M6 9l6 6 6-6"/></g>,
  analisis: <g><path d="M12 3l1.9 4.6L18.5 9l-4.6 1.4L12 15l-1.9-4.6L5.5 9l4.6-1.4z"/><path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z"/></g>,
  up: <g><path d="M12 19V5M5 12l7-7 7 7"/></g>,
  present: <g><path d="M2 4h20"/><path d="M4 4v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4"/><path d="M12 17v4M9 21h6"/></g>,
  presentacion: <g><path d="M2 4h20"/><path d="M4 4v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4"/><path d="M12 17v4M9 21h6"/></g>,
  download: <g><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 19h16"/></g>,
  refresh: <g><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v5h-5"/></g>,
  trophy: <g><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M5 5H3v2a3 3 0 0 0 3 3M19 5h2v2a3 3 0 0 1-3 3"/></g>,
};
function Icon({ name, size = 17, sw = 2, style }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {ICON_PATHS[name] || null}
    </svg>
  );
}
window.Icon = Icon;
