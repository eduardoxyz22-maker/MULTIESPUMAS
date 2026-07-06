# -*- coding: utf-8 -*-
# CSS extraido del dashboard verificado (identico byte a byte). No editar a mano.
CSS = r'''
/* ============================================================================
   HEAVEN COLCHONES — Design System tokens (colors_and_type.css)
   ========================================================================== */
:root {
  --teal:#00B5AD; --teal-mid:#00A09A; --teal-dk:#008F88; --teal-lt:#E6F7F6; --teal-border:#99DDD9;
  --black:#1A1A1A; --text:#2D2D2D; --muted:#6B6B6B; --gray:#808080; --gray-md:#E2E2E2; --gray-lt:#F5F6F7; --white:#FFFFFF;
  --red:#CE2939; --red-lt:#FDEAEC; --red-border:#F5C0C5;
  --amber:#D97706; --amber-lt:#FEF3E2; --amber-border:#FCD34D;
  --green:#22A06B; --green-lt:#E6F9F0; --purple:#7C3AED; --purple-lt:#F3EBFF;
  --series-blue:#3B82F6;
  --heaven-cross:#E2231A;
  --font-sans:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;
  --r-sm:8px; --r-md:10px; --r-lg:12px; --r-pill:20px; --r-round:50px;
  --sh-card:0 1px 5px rgba(0,0,0,.06); --sh-soft:0 2px 10px rgba(0,0,0,.08); --sh-hover:0 8px 24px rgba(0,0,0,.13);
  --sh-header:0 4px 20px rgba(0,0,0,.25); --sh-fab:0 4px 16px rgba(0,181,173,.45);
  --glass-bg:rgba(255,255,255,.75); --glass-bg-2:rgba(255,255,255,.72); --glass-border:rgba(255,255,255,.7); --glass-blur:blur(14px);
  --bg-app:linear-gradient(135deg,#e6fffe 0%,#f4f7ff 45%,#eef2ff 100%);
  --grad-header:linear-gradient(135deg,#00B5AD,#0f766e,#1e3a5f,#1d4ed8,#0f5c8a,#00B5AD);
  --ease:cubic-bezier(.4,0,.2,1); --t-fast:.12s; --t-base:.18s; --lift:translateY(-3px);
}
.ds-muted { color:var(--muted); font-size:.68rem; }
.ds-body { font-family:var(--font-sans); font-weight:400; font-size:.82rem; line-height:1.55; color:var(--text); }

/* ============================================================================
   Reporting UI Kit (kit.css) — trimmed to what this dashboard uses
   ========================================================================== */
* { box-sizing:border-box; margin:0; padding:0; }
body { font-family:var(--font-sans); color:var(--text); -webkit-font-smoothing:antialiased; }
.app-daily { background:var(--bg-app); min-height:100vh; }
.container { max-width:1500px; margin:0 auto; padding:32px 36px 28px; }
.scroll-bar { position:fixed; top:0; left:0; height:3px; background:linear-gradient(90deg,var(--teal),var(--series-blue)); z-index:9999; transition:width .1s linear; pointer-events:none; }

@keyframes grad-move { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
.header { display:flex; justify-content:space-between; align-items:stretch; padding:0 36px; }
.header.grad { background:var(--grad-header); background-size:300% 300%; animation:grad-move 12s ease infinite; box-shadow:var(--sh-header); }
@media (prefers-reduced-motion:reduce){ .header.grad { animation:none; } }
.hl { display:flex; align-items:center; padding:16px 0; }
.logo { border-right:1px solid rgba(255,255,255,.3); padding-right:24px; margin-right:24px; }
.logo-h { font-size:1.75rem; font-weight:800; color:#fff; letter-spacing:.14em; line-height:1; }
.logo-s { font-size:.68rem; color:rgba(255,255,255,.8); letter-spacing:.04em; margin-top:1px; }
.htitle h1 { font-size:.98rem; font-weight:600; color:#fff; letter-spacing:.01em; }
.htitle p { font-size:.7rem; color:rgba(255,255,255,.7); margin-top:3px; }
.hr { display:flex; align-items:center; margin-left:auto; padding:16px 0; border-left:1px solid rgba(255,255,255,.25); }
.hstat { text-align:center; padding:0 24px; border-right:1px solid rgba(255,255,255,.2); }
.hstat:last-child { border-right:none; }
.hstat-v { font-size:1.5rem; font-weight:800; color:#fff; line-height:1; }
.hstat-l { font-size:.62rem; color:rgba(255,255,255,.7); margin-top:3px; text-transform:uppercase; letter-spacing:.06em; }

.sec { font-size:.68rem; font-weight:700; color:var(--teal); text-transform:uppercase; letter-spacing:.1em; margin-bottom:12px; display:flex; align-items:center; gap:10px; }
.sec::after { content:''; flex:1; height:1px; background:var(--gray-md); }

.metrics { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:26px; }
.mc { background:var(--glass-bg); backdrop-filter:var(--glass-blur); -webkit-backdrop-filter:var(--glass-blur); border-radius:var(--r-lg); padding:20px 22px; border:1px solid var(--glass-border); position:relative; box-shadow:var(--sh-soft); transition:transform var(--t-base) var(--ease), box-shadow var(--t-base) var(--ease); }
.mc:hover { transform:var(--lift); box-shadow:var(--sh-hover); }
.mc-bar { position:absolute; left:0; top:0; bottom:0; width:5px; border-radius:12px 0 0 12px; }
.mc-lbl { font-size:.68rem; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.07em; margin-bottom:8px; }
.mc-val { font-size:2rem; font-weight:800; line-height:1; }
.mc-sub { font-size:.68rem; color:var(--muted); margin-top:5px; }

.badge { display:inline-block; padding:3px 9px; border-radius:var(--r-pill); font-size:.66rem; font-weight:700; }
.b-teal { background:var(--teal-lt); color:var(--teal-dk); border:1px solid var(--teal-border); }
.b-amber { background:var(--amber-lt); color:var(--amber); border:1px solid var(--amber-border); }
.b-red { background:var(--red-lt); color:var(--red); border:1px solid var(--red-border); }
.b-green { background:var(--green-lt); color:var(--green); border:1px solid #b8e6d0; }
.b-gray { background:var(--gray-lt); color:var(--gray); border:1px solid var(--gray-md); }
@keyframes rp { 0%,100%{box-shadow:0 0 0 0 rgba(206,41,57,.5)} 65%{box-shadow:0 0 0 7px rgba(206,41,57,0)} }
.badge.pulse { animation:rp 2.4s ease-out infinite; }

.tw { background:#fff; border:1px solid var(--gray-md); border-radius:var(--r-lg); overflow:hidden; box-shadow:var(--sh-card); }
table { width:100%; border-collapse:collapse; font-size:.79rem; }
thead th { background:var(--black); color:rgba(255,255,255,.75); padding:10px 13px; text-align:left; font-weight:600; font-size:.67rem; text-transform:uppercase; letter-spacing:.07em; border-bottom:3px solid var(--teal); }
tbody tr { border-bottom:1px solid var(--gray-lt); transition:background var(--t-fast); }
tbody td { padding:9px 13px; color:var(--text); vertical-align:middle; }

.tab-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; flex-wrap:wrap; gap:10px; }
.tabs { display:flex; border:1px solid var(--gray-md); border-radius:var(--r-sm); overflow:hidden; background:#fff; }
.tab { padding:7px 20px; font-size:.76rem; font-weight:600; cursor:pointer; border:none; background:transparent; color:var(--muted); transition:all .15s; font-family:inherit; }
.tab.active { background:var(--teal); color:#fff; }
.tab:hover:not(.active) { background:var(--teal-lt); color:var(--teal-dk); }
.rc { font-size:.72rem; color:var(--muted); }

.barlist { background:#fff; border:1px solid var(--gray-md); border-radius:var(--r-lg); padding:20px 22px; box-shadow:var(--sh-card); }
.bl-row { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
.bl-row:last-child { margin-bottom:0; }
.bl-name { width:110px; font-size:.78rem; font-weight:600; color:var(--text); }
.bl-track { flex:1; background:#F0F0F0; border-radius:4px; height:22px; overflow:hidden; }
.bl-fill { height:100%; border-radius:4px; display:flex; align-items:center; padding-left:8px; font-size:.72rem; font-weight:700; color:#fff; min-width:28px; }

.alert { border-radius:var(--r-sm); padding:13px 18px; margin-bottom:18px; display:flex; align-items:center; gap:12px; font-size:.82rem; }
.alert .ico { font-size:1.2rem; }
.alert.amber { background:var(--amber-lt); border:1px solid var(--amber-border); border-left:4px solid var(--amber); color:#7C4B00; }
.alert.amber b { color:var(--amber); }
.exec { border-left:4px solid var(--teal); padding:15px 20px; margin-bottom:22px; background:#fff; border-radius:0 var(--r-md) var(--r-md) 0; border:1px solid var(--gray-md); }
.exec-lbl { font-size:.67rem; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.07em; margin-bottom:7px; }
.exec p { font-size:.82rem; line-height:1.65; color:var(--text); }

.fab { position:fixed; bottom:22px; right:22px; background:var(--teal); color:#fff; border:none; border-radius:var(--r-round); padding:11px 22px; font-size:.78rem; font-weight:700; cursor:pointer; z-index:1000; box-shadow:var(--sh-fab); transition:all .2s; font-family:inherit; letter-spacing:.03em; }
.fab:hover { background:var(--teal-dk); transform:translateY(-2px); }
.footer { text-align:center; padding:18px; font-size:.68rem; color:var(--muted); border-top:1px solid var(--gray-md); background:#fff; }

/* ============================================================================
   Component styles (from Dashboard Hoja1.dc.html <style>)
   ========================================================================== */
.two-col { display:grid; grid-template-columns:repeat(auto-fit,minmax(460px,1fr)); gap:24px; margin-bottom:28px; align-items:start; }
.cap { font-size:.66rem; color:var(--muted); margin-top:8px; line-height:1.5; }
.num { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
.up { color:var(--green); font-weight:700; }
.dn { color:var(--red); font-weight:700; }
.trow-total td { font-weight:800; background:var(--gray-lt); border-top:2px solid var(--black); }
.trow-sub td:first-child { padding-left:30px; color:var(--muted); font-weight:400; }

/* ---- Liquid glass ---- */
.lg { position:relative; background:linear-gradient(155deg, rgba(255,255,255,.86) 0%, rgba(244,255,254,.52) 100%); backdrop-filter:blur(22px) saturate(150%); -webkit-backdrop-filter:blur(22px) saturate(150%); border:1px solid rgba(255,255,255,.75); border-radius:20px; box-shadow:0 12px 36px rgba(9,72,68,.13), inset 0 1px 0 rgba(255,255,255,.95), inset 0 -1px 0 rgba(0,181,173,.06); overflow:hidden; }
.lg::before { content:''; position:absolute; inset:0; background:radial-gradient(130% 90% at 12% -12%, rgba(255,255,255,.6), transparent 44%); pointer-events:none; z-index:0; }
.lg-glow::after { content:''; position:absolute; width:360px; height:360px; right:-100px; top:-130px; background:radial-gradient(circle, rgba(0,181,173,.3), transparent 68%); pointer-events:none; z-index:0; }
.lg > * { position:relative; z-index:1; }
.glass-card { position:relative; background:linear-gradient(160deg, rgba(255,255,255,.8), rgba(244,255,254,.5)); backdrop-filter:blur(16px) saturate(140%); -webkit-backdrop-filter:blur(16px) saturate(140%); border:1px solid rgba(255,255,255,.7); border-radius:16px; box-shadow:0 6px 22px rgba(9,72,68,.1), inset 0 1px 0 rgba(255,255,255,.9); padding:18px 20px; overflow:hidden; transition:transform var(--t-base) var(--ease), box-shadow var(--t-base) var(--ease); }
.glass-card:hover { transform:translateY(-3px); box-shadow:0 12px 30px rgba(9,72,68,.16); }
.glass-card::before { content:''; position:absolute; inset:0; background:radial-gradient(120% 80% at 15% -10%, rgba(255,255,255,.55), transparent 42%); pointer-events:none; }
.glass-card > * { position:relative; }
.gc-bar { position:absolute; left:0; top:0; bottom:0; width:5px; border-radius:16px 0 0 16px; }

.ring { width:138px; height:138px; border-radius:50%; display:grid; place-items:center; position:relative; flex-shrink:0; box-shadow:0 4px 14px rgba(0,181,173,.18); }
.ring::after { content:''; position:absolute; inset:13px; background:rgba(255,255,255,.9); border-radius:50%; box-shadow:inset 0 1px 4px rgba(0,0,0,.08); }
.ring > div { position:relative; z-index:1; text-align:center; }

.mchip { display:flex; align-items:center; gap:10px; background:rgba(255,255,255,.55); border:1px solid rgba(255,255,255,.7); border-radius:13px; padding:9px 13px; backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); }
.dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
.dchip { display:inline-flex; align-items:center; gap:5px; padding:5px 12px; border-radius:20px; font-size:.72rem; font-weight:700; }

body.v-mes .anual-only { display:none !important; }
body.v-anio .mensual-only { display:none !important; }
body.v-mes .semanal-block, body.v-anio .semanal-block, body.v-todas .semanal-block { display:none !important; }
body.v-todas .brand-cards-anual { display:none !important; }
body.v-sem main > *:not(.viewtabs):not(.semanal-block) { display:none !important; }
.vtab.active { background:var(--teal) !important; color:#fff !important; box-shadow:0 3px 12px rgba(0,181,173,.4); }
.vtab:hover:not(.active) { background:var(--teal-lt); color:var(--teal-dk); }
.sembar { transition:height .35s var(--ease); }

/* ===== MARFIL TEMPLADO ===== */
html, body { background:#E8EAE5; }
.app-daily {
  --text:#253230; --muted:#838b88;
  --gray-md:rgba(15,95,109,.14); --gray-lt:rgba(15,95,109,.05);
  --black:#0F5F6D;
  background:
    radial-gradient(1200px 700px at 5% -6%, rgba(15,95,109,.15), transparent 58%),
    radial-gradient(1000px 720px at 100% 0%, rgba(27,148,164,.13), transparent 56%),
    radial-gradient(920px 820px at 90% 108%, rgba(15,95,109,.11), transparent 60%),
    radial-gradient(780px 640px at 42% 55%, rgba(210,192,148,.16), transparent 62%),
    linear-gradient(165deg, #F1EFE9 0%, #E8E8E0 46%, #DFE6E2 100%);
  background-attachment:fixed;
  min-height:100vh; color:var(--text);
}
.app-daily .sec { color:#0F5F6D; }
.app-daily .sec::after { background:rgba(15,95,109,.16); }
.app-daily .tw {
  background:linear-gradient(160deg, rgba(255,255,255,.66), rgba(255,255,255,.42));
  border:1px solid rgba(255,255,255,.85);
  backdrop-filter:blur(26px) saturate(155%); -webkit-backdrop-filter:blur(26px) saturate(155%);
  box-shadow:0 2px 6px rgba(20,58,60,.05), 0 20px 46px rgba(18,70,72,.15), inset 0 1px 0 rgba(255,255,255,1);
}
.app-daily thead th { background:linear-gradient(180deg,#137180,#0E4A55); color:rgba(255,255,255,.92); border-bottom:2px solid #2BBFBF; box-shadow:inset 0 1px 0 rgba(255,255,255,.16); }
.app-daily tbody tr { border-bottom:1px solid rgba(15,95,109,.08); }
.app-daily tbody td { color:#303c3a; }
.app-daily tbody td.up { color:var(--green); font-weight:700; }
.app-daily tbody td.dn { color:var(--red); font-weight:700; }
.app-daily tbody tr:hover { background:rgba(15,95,109,.06); }
.app-daily .trow-total td { background:rgba(15,95,109,.06); border-top:1px solid rgba(15,95,109,.22); color:#1c2a28; }
.app-daily .mc, .app-daily .glass-card, .app-daily .lg, .app-daily .exec, .app-daily .barlist {
  background:linear-gradient(152deg, rgba(255,255,255,.74) 0%, rgba(255,255,255,.4) 100%);
  border:1px solid rgba(255,255,255,.85);
  backdrop-filter:blur(28px) saturate(165%); -webkit-backdrop-filter:blur(28px) saturate(165%);
  box-shadow:0 2px 5px rgba(20,58,60,.05), 0 18px 44px rgba(18,70,72,.16), inset 0 1px 0 rgba(255,255,255,1), inset 0 -16px 34px rgba(15,95,109,.05);
}
.app-daily .lg::before, .app-daily .glass-card::before { background:radial-gradient(130% 90% at 12% -12%, rgba(255,255,255,.62), transparent 44%); }
.app-daily .mc:hover, .app-daily .glass-card:hover, .app-daily .lg:hover {
  transform:translateY(-3px); box-shadow:0 4px 8px rgba(20,58,60,.06), 0 28px 60px rgba(18,70,72,.22), inset 0 1px 0 rgba(255,255,255,1); border-color:rgba(15,95,109,.2);
}
.app-daily .mc-val { color:#212e2c; }
.app-daily .exec p, .app-daily .ds-body { color:#3a4644; }
.app-daily .lg-glow::after { background:radial-gradient(circle, rgba(15,95,109,.15), transparent 68%); }
.app-daily .ring::after { background:#f8f8f3; box-shadow:inset 0 1px 4px rgba(20,58,60,.14); }
.app-daily .mchip { background:rgba(255,255,255,.66); border-color:rgba(255,255,255,.9); }
.app-daily .footer { background:rgba(255,255,255,.6); border-color:rgba(15,95,109,.12); color:var(--muted); }
.app-daily .header.grad { background-image:linear-gradient(135deg,#12707E,#0E4A55,#0b3a44,#0F5F6D,#0E4A55,#12707E); box-shadow:0 14px 40px rgba(11,58,68,.32), inset 0 1px 0 rgba(255,255,255,.18); }
.app-daily .tabs { background:rgba(255,255,255,.7); border-color:rgba(15,95,109,.14); }
.app-daily .tab { color:var(--muted); }
.app-daily .tab:hover:not(.active) { background:rgba(15,95,109,.08); color:#0F5F6D; }
.app-daily .tab.active { background:#0F5F6D; color:#fff; }
.app-daily .vtab { color:var(--muted); }
.app-daily .vtab.active { background:#0F5F6D !important; color:#fff !important; box-shadow:0 3px 12px rgba(15,95,109,.4); }
.app-daily .vtab:hover:not(.active) { background:rgba(15,95,109,.08); color:#0F5F6D; }
.app-daily .bl-track { background:rgba(15,95,109,.08); }
/* softer, rounder */
.app-daily .mc, .app-daily .glass-card, .app-daily .exec, .app-daily .barlist, .app-daily .tw { border-radius:22px; }
.app-daily .lg { border-radius:26px; }
.app-daily .mc-bar, .app-daily .gc-bar { left:10px; top:14px; bottom:14px; width:5px; border-radius:10px; }
.app-daily .alert { border-radius:16px; }
.app-daily .header.grad { border-radius:30px; }
@media print { .fab, .scroll-bar { display:none !important; } .header.grad { animation:none !important; } }
'''
