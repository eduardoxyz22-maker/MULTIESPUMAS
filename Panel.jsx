// Heaven panel — shell + shared components + Resumen view.
const { useState, useEffect } = React;
const D = window.PANEL_DATA;
const fmtMoney = window.fmtMoney;

/* ---------- shared bits ---------- */
function SectionHead({ eb, h3, p, right }) {
  return (
    <div className="sh">
      <div>{eb && <div className="eb">{eb}</div>}<h3>{h3}</h3>{p && <p>{p}</p>}</div>
      {right}
    </div>
  );
}
function Pill({ tone, children }) { return <span className={`pill ${tone}`}><span className="pd" />{children}</span>; }

// Vendor avatar — per-vendor color gradient + initials, optional real photo,
// optional ring and #1 crown. Photo (data.photo) overrides initials when set.
function Avatar({ v, size = 34, ring = false, crown = false }) {
  const c = v.color || "#6B7785";
  return (
    <span className={`avatar${ring ? " ring" : ""}`} style={{ width: size, height: size, "--ac": c, fontSize: Math.round(size * 0.4) }}>
      {v.photo ? <img src={v.photo} alt={v.name} /> : <span>{v.ini}</span>}
      {crown && <span className="crown" title="Top del mes"><Icon name="trophy" size={Math.round(size * 0.34)} sw={2.4} /></span>}
    </span>
  );
}
const convTone = c => c >= 6 ? "green" : c >= 4 ? "amber" : "red";

// Animated count-up. Always lands on the real value even if rAF is throttled
// (backgrounded tab): a timer fallback + visibility guard snap to the final.
function CountUp({ value, fmt, dur = 950 }) {
  if (value == null || isNaN(value)) value = 0;
  const [n, setN] = useState(value);
  useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || document.hidden) { setN(value); return; }
    let raf, start, done = false;
    const finish = () => { if (!done) { done = true; setN(value); } };
    setN(0);
    const step = t => { if (!start) start = t; const p = Math.min(1, (t - start) / dur); setN(value * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(step); else finish(); };
    raf = requestAnimationFrame(step);
    const safety = setTimeout(finish, dur + 350);
    const onVis = () => { if (document.hidden) finish(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelAnimationFrame(raf); clearTimeout(safety); document.removeEventListener("visibilitychange", onVis); };
  }, [value]);
  return <React.Fragment>{fmt ? fmt(n) : Math.round(n).toLocaleString("en-US")}</React.Fragment>;
}

// Mini trend sparkline (SVG, stretches to container width).
function Sparkline({ data, color }) {
  if (!data || data.length < 2) return null;
  const w = 120, h = 30, max = Math.max(...data), min = Math.min(...data), span = max - min || 1;
  const pts = data.map((d, i) => [i / (data.length - 1) * w, h - 3 - (d - min) / span * (h - 7)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ "--kc": color }}>
      <path className="area" d={area} />
      <path className="line" d={line} vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="2.4" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// Donut chart. data = [{label, value, color}]. Hover a segment/legend to focus.
function Donut({ data, size = 132, unit = "" }) {
  if (!data || data.length === 0) return null;
  const total = data.reduce((s, d) => s + d.value, 0), r = size / 2 - 8, c = 2 * Math.PI * r;
  const [hov, setHov] = useState(-1);
  let off = 0;
  return (
    <div className="donut-wrap">
      <svg className="donut" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle className="track" cx={size / 2} cy={size / 2} r={r} />
        {data.map((d, i) => {
          const len = d.value / total * c;
          const pct = Math.round(d.value / total * 100);
          const el = <circle key={i} className="seg" cx={size / 2} cy={size / 2} r={r} stroke={d.color} strokeWidth={hov === i ? 18 : undefined} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-off} transform={`rotate(-90 ${size / 2} ${size / 2})`} opacity={hov === -1 || hov === i ? 1 : .4} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(-1)}><title>{`${d.label}: ${d.value.toLocaleString("en-US")} (${pct}%)`}</title></circle>;
          off += len; return el;
        })}
        <text className="donut-center" x="50%" y="44%" textAnchor="middle" dominantBaseline="central" fontSize={size * 0.2} fill="var(--text)">{hov >= 0 ? data[hov].value.toLocaleString("en-US") : total.toLocaleString("en-US")}</text>
        <text x="50%" y="60%" textAnchor="middle" dominantBaseline="central" fontSize={size * 0.07} fill="var(--muted)" fontWeight="700" letterSpacing="1">{hov >= 0 ? data[hov].label.toUpperCase().slice(0, 14) : unit}</text>
      </svg>
      <div className="legend">{data.map((d, i) => (
        <div className="lr" key={i} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(-1)} style={{ opacity: hov === -1 || hov === i ? 1 : .5, cursor: "default" }}>
          <span className="sw" style={{ background: d.color }} />{d.label}
          <span className="lv"><span className="num" style={{ color: "var(--muted)", fontWeight: 600, marginRight: 6 }}>{d.value.toLocaleString("en-US")}</span>{Math.round(d.value / total * 100)}%</span>
        </div>
      ))}</div>
    </div>
  );
}

// Heatmap. rows=[{name,v,vals:[..]}], cols=[labels]. value 0..100 → color.
function Heatmap({ rows, cols }) {
  const heat = v => v >= 80 ? "#159A57" : v >= 55 ? "#7FB000" : v >= 30 ? "#D98300" : "#DC4046";
  return (
    <div className="heat" style={{ "--cols": cols.length }}>
      <div className="hrow"><div /> {cols.map((c, i) => <div className="hhead" key={i}>{c}</div>)}</div>
      {rows.map((r, i) => (
        <div className="hrow" key={i}>
          <div className="hname"><Avatar v={r} size={24} />{r.name.split(" ")[0]}</div>
          {(r.vals || []).map((v, j) => <div className="cell" key={j} style={{ background: heat(v), opacity: .35 + v / 100 * .65 }} title={`${cols[j]}: ${v}%`}>{v}</div>)}
        </div>
      ))}
    </div>
  );
}

// Skeleton loading state shown briefly on refresh.
function SkeletonView() {
  return (
    <div className="view">
      <div className="skel" style={{ height: 150, borderRadius: 18 }} />
      <div className="kpis">{[0, 1, 2, 3].map(i => <div className="skel" key={i} style={{ height: 132, borderRadius: 14 }} />)}</div>
      <div className="grid2"><div className="skel" style={{ height: 260, borderRadius: 14 }} /><div className="skel" style={{ height: 260, borderRadius: 14 }} /></div>
      <div className="skel" style={{ height: 280, borderRadius: 14 }} />
    </div>
  );
}

// Vendor profile drawer — the expandable "ficha" opened by clicking a vendor.
function ProfileDrawer({ vendor: v, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const cerrado = v ? Math.round(v.cierres * v.ticket) : 0;
  const diff = v ? v.leads - (v.prevLeads || 0) : 0;
  const metas = useMetas();
  const metaMonto = v ? (metas[v.name] || 0) : 0;
  const metaPct = metaMonto ? Math.round(cerrado / metaMonto * 100) : 0;
  const proy = v ? Math.round(cerrado * (D.daysInMonth || 31) / (D.curDay || 26)) : 0;
  const proyPct = metaMonto ? Math.round(proy / metaMonto * 100) : 0;
  const metaCol = metaPct >= 100 ? "var(--green)" : metaPct >= 70 ? "var(--amber)" : "var(--red)";
  return (
    <React.Fragment>
      <div className={`scrim${v ? " show" : ""}`} onClick={onClose} />
      <aside className={`drawer${v ? " show" : ""}`}>
        {v && (
          <React.Fragment>
            <div className="drawer-head">
              <div style={{ display: "flex", gap: 13, alignItems: "center", minWidth: 0 }}>
                <Avatar v={v} size={46} ring crown={v.name === window.TOP_CLOSER} />
                <div><div className="drawer-name">{v.name}</div><div className="ww" style={{ display: "flex", gap: 7, alignItems: "center", marginTop: 4 }}>{v.suc} <Pill tone={v.v}>{v.u24}% &lt;24h</Pill></div></div>
              </div>
              <button className="drawer-close" onClick={onClose} aria-label="Cerrar">×</button>
            </div>
            <div className="drawer-body">
              <div className="dr-sec">Tendencia de leads</div>
              <div className="dr-mom"><span className="big">{v.leads.toLocaleString("en-US")}</span><span className={`delta ${diff >= 0 ? "up" : "down"}`}>{diff >= 0 ? "▲" : "▼"} {Math.abs(diff)}</span><span className="ww">vs {(v.prevLeads || 0).toLocaleString("en-US")} en {D.prevMonth}</span></div>
              <div className="dr-sec">KPIs comerciales</div>
              <div className="dr-kpis" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 10 }}>
                <div className="dr-k" style={{ borderLeft: "3px solid var(--green)" }}><div className="v" style={{ color: "var(--green-ink)" }}>{fmtMoney(cerrado)}</div><div className="l">Cerrado mes (Compradores)</div></div>
                <div className="dr-k" style={{ borderLeft: "3px solid var(--brand)" }}><div className="v" style={{ color: "var(--brand-d)" }}>{v.value ? fmtMoney(v.value) : "—"}</div><div className="l">Monto registrado</div></div>
              </div>
              <div className="dr-kpis">
                <div className="dr-k"><div className="v" style={{ color: `var(--${convTone(window.convPct(v))})` }}><CountUp value={window.convPct(v)} fmt={n => n.toFixed(1) + "%"} /></div><div className="l">Conversión</div></div>
                <div className="dr-k"><div className="v">{v.ticket ? <CountUp value={v.ticket} fmt={fmtMoney} /> : "—"}</div><div className="l">Ticket prom.</div></div>
                <div className="dr-k"><div className="v"><CountUp value={v.cierres} /></div><div className="l">Cierres</div></div>
                <div className="dr-k"><div className="v"><CountUp value={v.calif} /> <span style={{ fontSize: ".7rem", color: "var(--muted)" }}>({v.califPct}%)</span></div><div className="l">Calificados</div></div>
                <div className="dr-k"><div className="v" style={{ color: "var(--red)" }}><CountUp value={v.noResp} /> <span style={{ fontSize: ".7rem", color: "var(--muted)" }}>({v.noRespPct}%)</span></div><div className="l">No responden</div></div>
                <div className="dr-k"><div className="v" style={{ color: "#D98300" }}><CountUp value={v.backlog} /></div><div className="l">Backlog</div></div>
              </div>
              <div className="dr-sec">Disciplina del CRM</div>
              <div className="dr-kpis">
                <div className="dr-k"><div className="v">{v.promTxt}</div><div className="l">Tiempo prom. 1ª acción</div></div>
                <div className="dr-k"><div className="v">{v.u24}%</div><div className="l">Actualiza en &lt;24h</div></div>
                <div className="dr-k"><div className="v" style={{ color: v.nunca > 50 ? "var(--red)" : "inherit" }}>{v.nunca}</div><div className="l">Nunca tocados</div></div>
              </div>
              <div className="dr-sec">Distribución de etapas — pipeline actual</div>
              {D.stagesByV[v.name] && (
                <div style={{ marginBottom: 6 }}>
                  <Donut size={120} unit="LEADS" data={D.stagesByV[v.name].map(([name, val]) => ({ label: name, value: val, color: ({ "Nueva consulta": "#27313F", "Interesado": "#2E6FE0", "Cotización enviada": "#7A4AD9", "Agendado / Visita": "#D98300", "Compradores": "#159A57", "No Responden": "#646E7B" })[name] || "#9AA3AF" }))} />
                </div>
              )}
              <div className="dr-sec">Meta de ventas del mes (Bs) — editable</div>
              <div className="dr-k" style={{ padding: "15px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "baseline", gap: 7 }}><b className="num" style={{ fontSize: "1.1rem", color: metaCol }}>{fmtMoney(cerrado)}</b><span className="ww">/</span></span>
                  <MetaStepper name={v.name} metas={metas} />
                </div>
                <div className="meta-bar" style={{ height: 12 }}><i style={{ width: Math.min(100, metaPct) + "%", background: metaCol }} /><span className="proy" style={{ left: Math.min(100, proyPct) + "%" }} title="Proyección" /></div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7, fontSize: ".7rem" }}><b className="num" style={{ color: metaCol }}>{metaPct}% cumplido</b><span className="ww">proy. {fmtMoney(proy)} ({proyPct}%)</span></div>
              </div>
            </div>
          </React.Fragment>
        )}
      </aside>
    </React.Fragment>
  );
}
window.ProfileDrawer = ProfileDrawer;

// Branch (sucursal) drawer — global de la tienda + una tarjeta por vendedora.
function SucursalDrawer({ name, onClose, onVendor }) {
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const vends = name ? D.team.filter(v => v.suc === name) : [];
  const tot = vends.reduce((a, v) => ({ leads: a.leads + v.leads, cierres: a.cierres + v.cierres, value: a.value + v.value, cerrado: a.cerrado + v.cierres * v.ticket, agendado: a.agendado + (v.agendado || 0) }), { leads: 0, cierres: 0, value: 0, cerrado: 0, agendado: 0 });
  const totConv = tot.leads ? (tot.cierres / tot.leads * 100).toFixed(1) : "0.0";
  return (
    <React.Fragment>
      <div className={`scrim${name ? " show" : ""}`} onClick={onClose} />
      <aside className={`drawer${name ? " show" : ""}`}>
        {name && (
          <React.Fragment>
            <div className="drawer-head">
              <div style={{ display: "flex", gap: 13, alignItems: "center", minWidth: 0 }}>
                <span className="avatar" style={{ width: 46, height: 46, "--ac": "#00B5AD", fontSize: 17 }}><Icon name="sucursales" size={20} /></span>
                <div><div className="drawer-name">{name}</div><div className="ww" style={{ marginTop: 3 }}>{vends.map(v => v.name.split(" ")[0]).join(" · ")}</div></div>
              </div>
              <button className="drawer-close" onClick={onClose} aria-label="Cerrar">×</button>
            </div>
            <div className="drawer-body">
              <div className="dr-sec">Global de la sucursal</div>
              <div className="dr-kpis" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
                <div className="dr-k"><div className="v"><CountUp value={tot.leads} /></div><div className="l">Leads</div></div>
                <div className="dr-k"><div className="v"><CountUp value={tot.cierres} /></div><div className="l">Cierres</div></div>
                <div className="dr-k"><div className="v" style={{ color: "var(--green-ink)" }}><CountUp value={tot.cerrado} fmt={fmtMoney} /></div><div className="l">Cerrado mes</div></div>
                <div className="dr-k"><div className="v" style={{ color: "var(--brand-d)" }}><CountUp value={tot.value} fmt={fmtMoney} /></div><div className="l">Monto reg.</div></div>
              </div>
              <div className="dr-k" style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}><div className="l" style={{ margin: 0 }}>📅 Agendado / Visita · Conversión {totConv}%</div><div className="v" style={{ color: "#D98300" }}>{tot.agendado}</div></div>
              <div className="dr-sec">Por vendedora — toca para ver perfil completo</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {vends.map((v, i) => {
                  const conv = v.leads ? (v.cierres / v.leads * 100).toFixed(1) : "0.0";
                  const lPct = tot.leads ? Math.round(v.leads / tot.leads * 100) : 0;
                  return (
                    <div className="dr-k clickable" key={i} style={{ padding: "13px 15px" }} onClick={() => onVendor(v)}>
                      <div style={{ display: "flex", gap: 11, alignItems: "center", marginBottom: 11 }}>
                        <Avatar v={v} size={34} ring />
                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: ".92rem" }}>{v.name}</div><Pill tone={v.v}>{v.u24}% &lt;24h</Pill></div>
                        <span className="ww" style={{ whiteSpace: "nowrap" }}>{lPct}% · ver perfil →</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 }}>
                        <div><div className="v" style={{ fontSize: "1.05rem" }}>{v.leads.toLocaleString("en-US")}</div><div className="l">Leads</div></div>
                        <div><div className="v" style={{ fontSize: "1.05rem" }}>{v.cierres}</div><div className="l">Cierres</div></div>
                        <div><div className="v" style={{ fontSize: "1.05rem", color: "var(--green-ink)" }}>{fmtMoney(v.cierres * v.ticket)}</div><div className="l">Cerrado</div></div>
                        <div><div className="v" style={{ fontSize: "1.05rem", color: "var(--muted)" }}>{v.value ? fmtMoney(v.value) : "—"}</div><div className="l">Monto reg.</div></div>
                        <div><div className="v" style={{ fontSize: "1.05rem", color: `var(--${convTone(+conv)})` }}>{conv}%</div><div className="l">Conv.</div></div>
                      </div>
                      <div style={{ marginTop: 10, paddingTop: 9, borderTop: "1px solid var(--line2)", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: ".72rem" }}>
                        <span style={{ color: "var(--muted)", fontWeight: 600 }}>📅 Agendado / Visita</span>
                        <b style={{ color: "#D98300", fontSize: ".92rem" }}>{v.agendado || 0}</b>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </React.Fragment>
        )}
      </aside>
    </React.Fragment>
  );
}
window.SucursalDrawer = SucursalDrawer;

// Editable sales-goal store — shared by the Metas section AND the vendor ficha,
// so editing in either place syncs everywhere. Persisted to localStorage.
const META_KEY = "heaven_metas_monto_v1", META_STEP = 5000;
function readMetas() {
  const base = {}; D.team.forEach(v => base[v.name] = v.metaMonto);
  try { Object.assign(base, JSON.parse(localStorage.getItem(META_KEY) || "{}")); } catch (e) {}
  return base;
}
function setMetaVal(name, raw) {
  let n = Math.round(parseFloat(String(raw).replace(/[^0-9.]/g, ""))); if (isNaN(n) || n < 0) n = 0; if (n > 50000000) n = 50000000;
  const m = readMetas(); m[name] = n;
  try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch (e) {}
  window.dispatchEvent(new CustomEvent("metas-change"));
}
function bumpMetaVal(name, d) { setMetaVal(name, (readMetas()[name] || 0) + d * META_STEP); }
function useMetas() {
  const [m, setM] = useState(readMetas);
  useEffect(() => { const h = () => setM(readMetas()); window.addEventListener("metas-change", h); return () => window.removeEventListener("metas-change", h); }, []);
  return m;
}
// Reusable Bs stepper control
function MetaStepper({ name, metas }) {
  return (
    <span className="meta-stepper" onClick={e => e.stopPropagation()}>
      <button onClick={() => bumpMetaVal(name, -1)} aria-label="menos">−</button>
      <span className="meta-pre">Bs</span>
      <input className="meta-input" type="text" inputMode="numeric" value={(metas[name] || 0).toLocaleString("en-US")} onChange={e => setMetaVal(name, e.target.value)} onClick={e => e.target.select()} />
      <button onClick={() => bumpMetaVal(name, 1)} aria-label="más">+</button>
    </span>
  );
}
window.useMetas = useMetas; window.MetaStepper = MetaStepper; window.cerradoOf = v => v.cierres * v.ticket;

function MetasSection() {
  const metas = useMetas();
  const cerradoOf = v => v.cierres * v.ticket;
  const proyOf = v => Math.round(cerradoOf(v) * (D.daysInMonth || 31) / (D.curDay || 26));
  const rows = D.team.filter(v => (metas[v.name] || 0) > 0).map(v => ({ v, meta: metas[v.name], cerrado: cerradoOf(v), proy: proyOf(v) }))
    .sort((a, b) => b.cerrado / b.meta - a.cerrado / a.meta);
  const totMeta = D.team.reduce((s, v) => s + (metas[v.name] || 0), 0);
  const totCerr = D.team.reduce((s, v) => s + cerradoOf(v), 0);
  const totProy = D.team.reduce((s, v) => s + proyOf(v), 0);
  const totPipe = D.team.reduce((s, v) => s + v.value, 0);
  const tPct = totMeta ? Math.min(100, Math.round(totCerr / totMeta * 100)) : 0;
  const tCol = tPct >= 100 ? "var(--green)" : tPct >= 70 ? "var(--amber)" : "var(--red)";
  const Stepper = ({ v }) => <MetaStepper name={v.name} metas={metas} />;
  return (
    <div className="metas-box">
      {rows.map(({ v, meta, cerrado, proy }, i) => {
        const pct = meta ? Math.round(cerrado / meta * 100) : 0;
        const proyPct = meta ? Math.round(proy / meta * 100) : 0;
        const col = pct >= 100 ? "var(--green)" : pct >= 70 ? "var(--amber)" : "var(--red)";
        return (
          <div className="meta-row" key={i}>
            <div className="top">
              <span className="meta-name"><Avatar v={v} size={26} ring />{v.name}{v.nuevo && <span className="ww">(nuevo)</span>}</span>
              <span className="meta-right">
                <b className="meta-cerr" style={{ color: col }}>{fmtMoney(cerrado)}</b><span className="ww">/</span>
                <Stepper v={v} />
                <span className="meta-proy">· proy. {fmtMoney(proy)} ({proyPct}%)</span>
              </span>
            </div>
            <div className="meta-bar"><i style={{ width: Math.min(100, pct) + "%", background: col }} /><span className="proy" style={{ left: Math.min(100, proyPct) + "%" }} title="Proyección" /></div>
          </div>
        );
      })}
      <div className="meta-row meta-total">
        <div className="top">
          <span className="meta-name" style={{ fontWeight: 800 }}>Equipo (total)</span>
          <span className="meta-right"><b className="meta-cerr" style={{ color: tCol }}>{fmtMoney(totCerr)}</b><span className="ww">/ registrado {fmtMoney(totPipe)} / meta <b className="num">{fmtMoney(totMeta)}</b> · proy. {fmtMoney(totProy)} <b style={{ color: tCol }}>({tPct}%)</b></span></span>
        </div>
        <div className="meta-bar"><i style={{ width: tPct + "%", background: tCol }} /></div>
      </div>
    </div>
  );
}
window.MetasSection = MetasSection;

// useSort — sortable-table hook. Returns {sorted, thFor}.
function useSort(rows, initialKey, initialGet) {
  const [key, setKey] = useState(initialKey ? { k: initialKey, get: initialGet } : null);
  const [dir, setDir] = useState("desc");
  const thFor = (label, k, getter, align) => (
    <th key={k} className={`sortable ${align !== "l" ? "r" : ""}${key && key.k === k ? " sorted" : ""}`}
      onClick={() => { if (key && key.k === k) setDir(d => d === "asc" ? "desc" : "asc"); else { setKey({ k, get: getter }); setDir("desc"); } }}>
      {label} <span className="sort-ar">{key && key.k === k ? (dir === "desc" ? "▼" : "▲") : "▾"}</span>
    </th>
  );
  const sorted = React.useMemo(() => {
    if (!key) return rows;
    const r = [...rows].sort((a, b) => {
      const va = key.get(a), vb = key.get(b);
      if (typeof va === "number") return vb - va;
      return String(va).localeCompare(String(vb));
    });
    if (dir === "asc") r.reverse();
    return r;
  }, [rows, key, dir]);
  return { sorted, thFor };
}
window.useSort = useSort;

// Weekly cierres sparkline for vendor cards (5 bars).
function WeekSpark({ weeks }) {
  if (!weeks || weeks.length === 0) return null;
  const mx = Math.max(...weeks, 1);
  return <div className="tcard-spark">{weeks.map((n, i) => <i key={i} className={n === mx && mx > 1 ? "hi" : ""} style={{ height: `${Math.max(8, n / mx * 100)}%` }} title={`Sem ${i + 1}: ${n}`} />)}</div>;
}
window.WeekSpark = WeekSpark;

// Quadrant matrix — conversión (Y) × volumen de leads (X). Rank-based para
// repartir parejo (los datos reales se agrupan); medianas dividen cuadrantes.
function QuadrantMatrix({ team }) {
  const n = team.length;
  const rankOf = (arr, v) => arr.filter(x => x < v).length; // 0..n-1
  const leadsSorted = team.map(v => v.leads).sort((a, b) => a - b);
  const convSorted = team.map(v => v.conv).sort((a, b) => a - b);
  const pos = team.map(v => ({
    v,
    x: 14 + (n > 1 ? rankOf(leadsSorted, v.leads) / (n - 1) * 72 : 36),
    y: 14 + (n > 1 ? rankOf(convSorted, v.conv) / (n - 1) * 72 : 36),
  }));
  return (
    <div className="quad">
      <div className="axis axyx" /><div className="axis axxy" />
      <div className="qlbl" style={{ top: 0, right: 0 }}>⭐ Estrella</div>
      <div className="qlbl" style={{ top: 0, left: 0 }}>◆ Potencial</div>
      <div className="qlbl" style={{ bottom: 0, right: 0 }}>■ Volumen</div>
      <div className="qlbl" style={{ bottom: 0, left: 0, color: "var(--red)" }}>○ Crítico</div>
      <div className="axhint axhint-x">leads →</div>
      <div className="axhint axhint-y">conversión →</div>
      {pos.map(({ v, x, y }, i) => (
        <div className="qpt" key={i} style={{ left: `${x}%`, bottom: `${y}%` }} onClick={() => window.__perfil(v)} title={`${v.name}: ${v.conv}% conv · ${v.leads} leads`}>
          <Avatar v={v} size={32} ring />
          <span className="qnm">{v.name.split(" ")[0]}</span>
        </div>
      ))}
    </div>
  );
}
window.QuadrantMatrix = QuadrantMatrix;

// Illustrated empty state for filters with no results.
function EmptyState({ title = "Sin resultados", desc, icon = "seguimiento", onReset, resetLabel = "Limpiar filtros" }) {
  return (
    <div className="empty">
      <div className="empty-ic"><Icon name={icon} size={26} sw={1.6} /></div>
      <div className="empty-t">{title}</div>
      {desc && <div className="empty-d">{desc}</div>}
      {onReset && <button className="btn" onClick={onReset}><Icon name="refresh" size={13} />{resetLabel}</button>}
    </div>
  );
}
window.EmptyState = EmptyState;
const F_COLORS = ["#00B5AD", "#22A7C9", "#2E6FE0", "#7A5AF0", "#159A57", "#DC4046"];

function Funnel() {
  const maxF = Math.max(...D.funnel.map(f => f.count), 1);
  const topCount = D.funnel.length > 0 ? D.funnel[0].count : 1;
  return (
    <div className="funnel">
      {D.funnel.map((f, i) => (
        <div className="fstep" key={i}>
          <div className="fn">{f.name}</div>
          <div className="fbar num" data-tip={`${f.name}: ${f.count.toLocaleString("en-US")} leads · ${Math.round(f.count / (topCount || 1) * 100)}% del tope`} style={{ width: `${Math.max(12, f.count / maxF * 100)}%`, background: F_COLORS[i] }}>{f.count.toLocaleString("en-US")}</div>
          <div className="fp num">{Math.round(f.count / (topCount || 1) * 100)}%</div>
        </div>
      ))}
    </div>
  );
}

function TeamTable({ cols = "full" }) {
  const T = D.team, maxLeads = T.length ? Math.max(...T.map(v => v.leads)) : 1;
  return (
    <table className="tbl">
      <thead><tr>
        <th>Vendedora</th><th className="r">Leads</th><th className="r">Cierres</th><th className="r">Conv.</th>
        {cols === "full" && <th className="r">Ticket</th>}
        {cols === "full" && <th className="r">Monto reg.</th>}
        <th>Disciplina CRM</th>
      </tr></thead>
      <tbody>
        {T.map((v, i) => (
          <tr key={i} className={`clickable ${v.name === window.TOP_CLOSER ? "toprow " : ""}${v.v === "red" ? "crit" : v.v === "amber" ? "warn" : ""}`} onClick={() => window.__perfil && window.__perfil(v)}>
            <td><div className="who"><Avatar v={v} size={36} ring crown={v.name === window.TOP_CLOSER} /><div><div className="wn">{v.name}{v.nuevo && <span className="tag-new">NUEVO</span>}</div><div className="ww">{v.suc}</div></div></div></td>
            <td className="r num"><span className="mbar"><i style={{ width: `${v.leads / maxLeads * 100}%` }} /></span>{v.leads}</td>
            <td className="r num" style={{ fontWeight: 800 }}>{v.cierres}</td>
            <td className="r"><Pill tone={convTone(window.convPct(v))}>{window.convPct(v)}%</Pill></td>
            {cols === "full" && <td className="r num">{v.ticket ? fmtMoney(v.ticket) : "—"}</td>}
            {cols === "full" && <td className="r num">{v.value ? fmtMoney(v.value) : "—"}</td>}
            <td><Pill tone={v.v}>{v.u24}% en &lt;24h</Pill></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// CSV download helper — quotes fields, triggers browser download.
function downloadCSV(filename, headers, rows) {
  const esc = s => `"${String(s == null ? "" : s).replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(","), ...rows.map(r => r.map(esc).join(","))].join("\r\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportTeamCSV() {
  downloadCSV(`heaven_equipo_${D.month}_${D.year}.csv`,
    ["Vendedora", "Sucursal", "Leads", "Cierres", "Conversion %", "Ticket (Bs)", "Monto registrado (Bs)", "Calificados", "No responden", "Backlog", "% <24h"],
    D.team.map(v => [v.name, v.suc, v.leads, v.cierres, v.conv, v.ticket, v.value, v.calif, v.noResp, v.backlog, v.u24]));
}
window.downloadCSV = downloadCSV; window.exportTeamCSV = exportTeamCSV;

// AI-driven monthly diagnostic. Auto-runs on first load (cached per month in
// sessionStorage), reads the REAL month data, and writes the headline +
// diagnosis + levers + risk. Falls back to a static reading while loading or
// if the model is unavailable. In production, generar.py bakes the result.
function getDiagFallback() {
  const G = D.global;
  const top = D.team.length ? [...D.team].sort((a, b) => b.cierres - a.cierres)[0] : null;
  const dir = (D.leadsMomPct || 0) < 0 ? `cayó ${Math.abs(D.leadsMomPct)}%` : `creció ${Math.abs(D.leadsMomPct || 0)}%`;
  return {
    titular: "No falta gente que entre. Falta seguir y cerrar la que ya entró.",
    diagnostico: `Con ${G.leads.toLocaleString("en-US")} leads (captación ${dir}) el cuello de botella no es captación — es disciplina de seguimiento y conversión. ${D.metrics?.backlog || 0} fichas sin seguimiento +72h y ${D.metrics?.noResp || 0} en "No responden" son la prioridad.`,
    palancas: [
      top ? `Replicar el playbook de seguimiento de ${top.name.split(" ")[0]}` : "Replicar el playbook de la mejor vendedora",
      `Llamar al top 50 de cotizaciones con más días sin actividad`,
      `Activar los ${D.metrics?.backlog || 0} leads sin seguimiento +72h`,
    ],
    riesgo: `${D.metrics?.noResp || 0} leads en "No responden" se enfrían cada día sin una segunda cadencia de contacto.`,
  };
}
function DiagnosticoMes() {
  const G = D.global;
  const CACHE_KEY = `heaven_diag_ai_${D.month}_${D.year}`;
  const [ai, setAi] = useState(() => {
    if (D.ai_diagnostico) return { state: "done", ...D.ai_diagnostico };
    try { const c = sessionStorage.getItem(CACHE_KEY); if (c) return { state: "done", ...JSON.parse(c) }; } catch (e) {}
    return { state: "idle" };
  });
  const buildPrompt = () => {
    const top = D.team.length ? [...D.team].sort((a, b) => b.cierres - a.cierres)[0] : null;
    const worst = D.team.length ? [...D.team].filter(v => v.cierres > 0).sort((a, b) => a.conv - b.conv)[0] : null;
    const teamLines = D.team.map(v => `${v.name} (${v.suc}): ${v.leads} leads, ${v.cierres} cierres, ${v.conv}% conv, ${v.noResp} no-responden, ${v.backlog} backlog, ${v.u24}% actualiza <24h`).join("\n");
    const _man = D.channels.find(c => c.cls === "green") || {};
    const _bot = D.channels.find(c => c.cls === "red") || {};
    return `Eres analista comercial senior de Heaven Colchones (Bolivia). Analiza el mes ${D.month} ${D.year} y responde SOLO con JSON válido, sin texto extra, forma exacta:
{"titular":"frase contundente de máx 11 palabras","diagnostico":"2-3 frases con el insight central y números","palancas":["acción 1","acción 2","acción 3"],"riesgo":"el mayor riesgo en 1 frase"}
Datos (moneda Bs): Leads ${G.leads} (mes anterior ${G.prevLeads}, ${Math.round((G.leads - G.prevLeads) / (G.prevLeads || 1) * 100)}%). Cierres ${G.cierres}, conversión ${(G.leads ? G.cierres / G.leads * 100 : 0).toFixed(1)}%. Pipeline Bs ${G.pipeline}, ticket Bs ${G.ticket}. "No responden" ${D.metrics?.noResp || 0} (${D.metrics?.noRespPct || 0}%). Sin seguimiento +72h: ${D.metrics?.backlog || 0} (${D.metrics?.backlogPct || 0}%). Canal manual convierte ${_man.conv || 0}% vs ${_bot.conv || 0}% bot.
Equipo:
${teamLines}
Top: ${top ? top.name : "N/A"}. Más débil en conversión: ${worst ? worst.name : "N/A"}. Sé directo, específico con nombres y números, español de Bolivia.`;
  };
  const run = async (force) => {
    if (!window.claude || !window.claude.complete) { setAi({ state: "error" }); return; }
    setAi({ state: "loading" });
    try {
      const raw = await window.claude.complete(buildPrompt());
      let p = null;
      try { p = JSON.parse(raw.replace(/```json|```/g, "").trim()); } catch (e) { const m = raw.match(/\{[\s\S]*\}/); if (m) p = JSON.parse(m[0]); }
      if (!p || !p.titular) throw new Error("parse");
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(p)); } catch (e) {}
      setAi({ state: "done", ...p });
    } catch (e) { setAi({ state: "error" }); }
  };
  useEffect(() => { if (ai.state === "idle") run(); }, []);
  const live = ai.state === "done" ? ai : getDiagFallback();
  const isLoading = ai.state === "loading";
  return (
    <div>
      <div className="diag2">
        <div className="diag2-main">
          <span className="diag2-eyebrow">
            <Icon name="bulb" size={13} sw={2.4} />Diagnóstico IA · {D.month} {D.year}
            {ai.state === "done" && <button className="diag2-refresh" title="Re-analizar" onClick={() => run(true)}><Icon name="refresh" size={11} /></button>}
          </span>
          <h2 className="diag2-h">{titularJSX(live.titular)}</h2>
          <p className="diag2-p">{isLoading ? <span className="diag2-skel-line" /> : live.diagnostico}</p>
          {isLoading && <span className="diag2-analyzing"><span className="ai-dot" /><span className="ai-dot" /><span className="ai-dot" /> Analizando {G.leads.toLocaleString("en-US")} leads del mes…</span>}
        </div>
        <div className="diag2-stats">
          <div className="diag2-stat" style={{ "--sc": "var(--brand)" }}>
            <div className="diag2-ic"><Icon name="conversion" size={16} /></div>
            <div><div className="diag2-v"><CountUp value={G.leads ? +(G.cierres / G.leads * 100).toFixed(1) : 0} fmt={n => n.toFixed(1) + "%"} /></div><div className="diag2-l">Conversión global</div></div>
          </div>
          <div className="diag2-stat" style={{ "--sc": "var(--red)" }}>
            <div className="diag2-ic"><Icon name="alertas" size={16} /></div>
            <div><div className="diag2-v"><CountUp value={D.metrics?.noResp || 0} /></div><div className="diag2-l">En "No responden"</div></div>
          </div>
          <div className="diag2-stat" style={{ "--sc": "var(--green)" }}>
            <div className="diag2-ic"><Icon name="trophy" size={16} /></div>
            <div><div className="diag2-v"><CountUp value={G.pipeline} fmt={fmtMoney} /></div><div className="diag2-l">Monto registrado</div></div>
          </div>
        </div>
      </div>

      <div className="diag-levers">
        <div className="diag-levers-col">
          <div className="ai-sub">Palancas del mes {ai.state !== "done" && <span className="ww" style={{ textTransform: "none", letterSpacing: 0 }}>· lectura base</span>}</div>
          {(live.palancas || []).map((p, i) => <div className="ai-pal" key={i}><span className="ai-num">{i + 1}</span>{isLoading ? <span className="diag2-skel-line" style={{ width: "70%" }} /> : p}</div>)}
        </div>
        <div className="diag-risk">
          <div className="ai-sub" style={{ color: "var(--red-ink)" }}>Mayor riesgo</div>
          <div className="diag-risk-body"><Icon name="alertas" size={16} sw={2.2} /><span>{isLoading ? <span className="diag2-skel-line" /> : live.riesgo}</span></div>
          {ai.state === "error" && <div className="ai-err" style={{ marginTop: 10 }}>Análisis en vivo no disponible. Agrega <code>ANTHROPIC_API_KEY</code> en GitHub Secrets para generar el diagnóstico automáticamente al correr el workflow.</div>}
        </div>
      </div>
    </div>
  );
}
// Render the AI titular, italicizing a key verb phrase if present.
function titularJSX(t) {
  if (!t) return null;
  const phrases = ["seguir y cerrar", "convertir", "seguimiento", "cerrar", "rescatar"];
  for (const ph of phrases) { const i = t.toLowerCase().indexOf(ph); if (i >= 0) return <React.Fragment>{t.slice(0, i)}<em>{t.slice(i, i + ph.length)}</em>{t.slice(i + ph.length)}</React.Fragment>; }
  return t;
}
window.DiagnosticoMes = DiagnosticoMes;

// Reusable expert AI agent card — runs a focused Claude analysis and renders
// structured output (resumen + hallazgos + recomendaciones). Cached per month.
function ExpertAgent({ id, name, role, icon, color, buildPrompt, autorun }) {
  const KEY = `heaven_agent_${id}_${D.month}_${D.year}`;
  const [st, setSt] = useState(() => {
    if (D.ai_agents && D.ai_agents[id]) return { s: "done", ...D.ai_agents[id] };
    try { const c = sessionStorage.getItem(KEY); if (c) return { s: "done", ...JSON.parse(c) }; } catch (e) {}
    return { s: "idle" };
  });
  const run = async () => {
    if (!window.claude || !window.claude.complete) { setSt({ s: "error" }); return; }
    setSt({ s: "loading" });
    try {
      const raw = await window.claude.complete(buildPrompt());
      let p = null; try { p = JSON.parse(raw.replace(/```json|```/g, "").trim()); } catch (e) { const m = raw.match(/\{[\s\S]*\}/); if (m) p = JSON.parse(m[0]); }
      if (!p || !p.resumen) throw new Error("parse");
      try { sessionStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {}
      setSt({ s: "done", ...p });
    } catch (e) { setSt({ s: "error" }); }
  };
  useEffect(() => { if (autorun && st.s === "idle") run(); }, []);
  const sevCol = s => s === "alto" || s === "red" ? "var(--red)" : s === "medio" || s === "amber" ? "var(--amber)" : "var(--green)";
  return (
    <div className="agent" style={{ "--ac": color }}>
      <div className="agent-head">
        <span className="agent-ic"><Icon name={icon} size={18} /></span>
        <div style={{ flex: 1, minWidth: 0 }}><div className="agent-name">{name}</div><div className="agent-role">{role}</div></div>
        {st.s === "idle" && <button className="btn pri" style={{ fontSize: ".74rem" }} onClick={run}><Icon name="analisis" size={13} />Analizar</button>}
        {st.s === "done" && <button className="agent-refresh" title="Re-analizar" onClick={run}><Icon name="refresh" size={13} /></button>}
      </div>
      {st.s === "loading" && <div className="agent-loading"><span className="ai-dot" /><span className="ai-dot" /><span className="ai-dot" /> Analizando…</div>}
      {st.s === "error" && <div className="ai-err" style={{ margin: "4px 0 0" }}>Análisis en vivo no disponible. En producción <code>generar.py</code> lo hornea por mes.</div>}
      {st.s === "idle" && <p className="agent-hint">{role}. Pulsa Analizar para generar hallazgos y recomendaciones de este mes.</p>}
      {st.s === "done" && (
        <div className="agent-body">
          <p className="agent-resumen">{st.resumen}</p>
          {st.hallazgos && st.hallazgos.length > 0 && (
            <div className="agent-sec"><div className="ai-sub">Hallazgos</div>
              {st.hallazgos.map((h, i) => <div className="agent-find" key={i}><span className="agent-dot" style={{ background: sevCol(h.sev) }} />{h.t || h}</div>)}
            </div>
          )}
          {st.recomendaciones && st.recomendaciones.length > 0 && (
            <div className="agent-sec"><div className="ai-sub">Recomendaciones</div>
              {st.recomendaciones.map((r, i) => <div className="agent-rec" key={i}><span className="ai-num">{i + 1}</span><div><div>{r.accion || r}</div>{r.impacto && <div className="agent-impacto">Impacto: {r.impacto}</div>}</div></div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
window.ExpertAgent = ExpertAgent;

function Kpi({ l, v, num, fmt, ac, ico, sub, spark, tip }) {
  return (
    <div className="kpi" style={{ "--kc": ac }} data-tip={tip}>
      <span className="ac" style={{ background: ac }} />
      <div className="ktop"><span className="kl">{l}</span><span className="ki" style={{ background: ac + "1A", color: ac }}><Icon name={ico} size={16} /></span></div>
      <div className="kv">{num != null ? <CountUp value={num} fmt={fmt} /> : v}</div>
      <div className="ksub">{sub}</div>
      {spark && <Sparkline data={spark} color={ac} />}
    </div>
  );
}
window.SectionHead = SectionHead; window.Pill = Pill; window.Funnel = Funnel; window.Avatar = Avatar;
window.TeamTable = TeamTable; window.Kpi = Kpi; window.convTone = convTone; window.F_COLORS = F_COLORS;
window.CountUp = CountUp; window.Sparkline = Sparkline; window.Donut = Donut; window.Heatmap = Heatmap;
window.TOP_CLOSER = D.team.length ? D.team.reduce((a, b) => (b.cierres > a.cierres ? b : a), D.team[0]).name : "";

/* ---------- Resumen view ---------- */
function ViewResumen() {
  const G = D.global;
  const topV = D.team.length ? D.team.reduce((a, b) => b.cierres > a.cierres ? b : a, D.team[0]) : null;
  return (
    <div className="view">
      <div className="rhero">
        <div className="rhero-left">
          <span className="diag2-eyebrow"><Icon name="resumen" size={13} sw={2.4} />Resumen ejecutivo · {D.month} {D.year}</span>
          <div className="rhero-line">
            <span><b className="num">{G.leads.toLocaleString("en-US")}</b> leads</span>
            <span className="rhero-sep" />
            <span><b className="num">{G.cierres}</b> cierres</span>
            <span className="rhero-sep" />
            <span><b className="num">{G.leads ? (G.cierres / G.leads * 100).toFixed(1) : "0.0"}%</b> conversión</span>
            <span className="rhero-sep" />
            <span><b className="num">{fmtMoney(G.pipeline)}</b> registrado</span>
          </div>
          <p className="rhero-sub">{D.fecha ? `Actualizado ${D.fecha}` : "Datos en vivo"} · desde Kommo. El análisis del mes vive en la pestaña de inteligencia.</p>
          <button className="btn pri diag2-cta" onClick={() => window.__go("analisis")}><Icon name="analisis" size={14} />Ver análisis IA del mes</button>
        </div>
        <div className="diag2-stats rhero-stats">
          <div className="diag2-stat" style={{ "--sc": "var(--brand)" }}>
            <div className="diag2-ic"><Icon name="conversion" size={16} /></div>
            <div><div className="diag2-v"><CountUp value={G.leads ? G.cierres / G.leads * 100 : 0} fmt={n => n.toFixed(1) + "%"} /></div><div className="diag2-l">Conversión global</div></div>
          </div>
          <div className="diag2-stat" style={{ "--sc": "var(--red)" }}>
            <div className="diag2-ic"><Icon name="alertas" size={16} /></div>
            <div><div className="diag2-v"><CountUp value={D.metrics?.noResp || 0} /></div><div className="diag2-l">En "No responden"</div></div>
          </div>
          <div className="diag2-stat" style={{ "--sc": "var(--green)" }}>
            <div className="diag2-ic"><Icon name="trophy" size={16} /></div>
            <div><div className="diag2-v"><CountUp value={G.pipeline} fmt={fmtMoney} /></div><div className="diag2-l">Monto registrado</div></div>
          </div>
        </div>
      </div>

      <div>
        <SectionHead eb="Indicadores" h3="Pulso del mes" p="Las 9 métricas clave del mes — pasa el cursor sobre cada ficha para ver su definición." />
        <div className="kpis" style={{ marginTop: 14, gridTemplateColumns: "repeat(auto-fill,minmax(168px,1fr))" }}>
          <Kpi l="Total leads" num={G.leads} ac="#808A96" ico="equipo" tip="Leads ingresados este mes vs el mes anterior." sub={<span><span className={`delta ${(D.leadsMomPct || 0) < 0 ? "down" : "up"}`}>{(D.leadsMomPct || 0) < 0 ? "▼" : "▲"} {Math.abs(D.leadsMomPct || 0)}%</span> vs {D.prevMonth}</span>} />
          <Kpi l="Conversión" num={G.leads ? G.cierres / G.leads * 100 : 0} fmt={n => n.toFixed(1) + "%"} ac="#2E6FE0" ico="conversion" tip="Compradores ÷ leads. Meta del sector: 5–8%." sub={<span>{G.cierres} compradores</span>} />
          <Kpi l="Cerrado en el mes" num={G.cierres * G.ticket} fmt={fmtMoney} ac="#159A57" ico="trophy" tip="Monto de deals que llegaron a Compradores (revenue confirmado)." sub={`${G.cierres} compradores`} />
          <Kpi l="Monto registrado" num={G.pipeline} fmt={fmtMoney} ac="#00B5AD" ico="proyeccion" tip="Suma de montos cargados en Kommo: ventas cerradas + pagos parciales de otras etapas." sub="ventas + pagos parciales" />
          <Kpi l="Sin seguimiento" num={D.metrics?.backlogPct || 0} fmt={n => Math.round(n) + "%"} ac="#DC4046" ico="seguimiento" tip="Deals abiertos sin actividad en Kommo +72h." sub={<span><b style={{ color: "var(--red-ink)" }}>{D.metrics?.backlog || 0} leads</b> +72h</span>} />
          <Kpi l="Ticket promedio" num={G.ticket} fmt={fmtMoney} ac="#D98300" ico="conversion" tip="Monto registrado ÷ número de compradores." sub={<span>valor / cierre</span>} />
          <Kpi l="Interesado" num={D.metrics?.interesado || 0} ac="#2E6FE0" ico="conversion" tip="Leads en etapa Interesado — interés activo." sub="leads en interés" />
          <Kpi l="Agendado / Visita" num={D.metrics?.agendado || 0} ac="#D98300" ico="semanal" tip="Leads con visita o cita agendada — mayor probabilidad de cierre." sub="visitas programadas" />
          <Kpi l="Compradores" num={G.cierres} ac="#159A57" ico="trophy" tip="Leads que cerraron como venta confirmada este mes." sub={<span><span className={`delta ${(G.cierres / (G.leads || 1) * 100) >= 5 ? "up" : "down"}`}>{(G.cierres / (G.leads || 1) * 100).toFixed(1)}% conv</span> · {fmtMoney(G.pipeline)}</span>} />
        </div>
      </div>

      <div className="grid2">
        <div className="card"><div className="eb">Embudo del mes</div><Funnel /></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="insight">
            <span className="ic"><Icon name="trophy" size={18} sw={2.2} /></span>
            <div><div className="t">{topV ? topV.name.split(" ")[0] : "—"} concentra el {topV && G.cierres ? Math.round(topV.cierres / G.cierres * 100) : 0}% de los cierres</div><div className="d">Con <b>{topV ? topV.cierres : 0} de {G.cierres} cierres</b>, replicar su método de seguimiento al equipo es la palanca #1.</div></div>
          </div>
          <div className="insight amber">
            <span className="ic"><Icon name="alertas" size={17} sw={2.2} /></span>
            <div><div className="t">{D.metrics?.backlog || 0} leads sin seguimiento</div><div className="d">El backlog equivale al <b>{D.metrics?.backlogPct || 0}% del mes</b>. Cada día sin contacto reduce la probabilidad de cierre.</div></div>
          </div>
        </div>
      </div>

      <div className="card">
        <SectionHead eb="Control del equipo" h3="Tablero de responsabilidad" right={<button className="btn" onClick={() => window.__go("equipo")}>Ver detalle →</button>} />
        <div style={{ marginTop: 6 }}><TeamTable /></div>
      </div>

      <div>
        <SectionHead eb={`Tendencia vs ${D.prevMonth}`} h3="Leads del mes — mes a mes" p={`La captación ${(D.leadsMomPct || 0) < 0 ? "cayó" : "creció"} ${Math.abs(D.leadsMomPct || 0)}% (${G.leads.toLocaleString("en-US")} vs ${G.prevLeads.toLocaleString("en-US")}). El reto no es entrada de leads, es convertir los que ya hay.`} />
        <div className="card">
          <div className="eb" style={{ marginBottom: 14 }}>Leads por vendedora — {D.month} vs {D.prevMonth}</div>
          {D.team.map((v, i) => {
            const max = D.team.length ? Math.max(...D.team.map(x => Math.max(x.leads, x.prevLeads || 0))) : 1;
            const diff = v.leads - (v.prevLeads || 0);
            return (
              <div key={i} className="clickable" style={{ display: "grid", gridTemplateColumns: "130px 1fr", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: i < D.team.length - 1 ? "1px solid var(--line2)" : "none" }} onClick={() => window.__perfil(v)}>
                <div className="who"><Avatar v={v} size={26} ring /><span className="wn" style={{ fontSize: ".8rem" }}>{v.name.split(" ")[0]}</span></div>
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "52px 1fr 78px", alignItems: "center", gap: 7, marginBottom: 5 }}>
                    <div className="num" style={{ fontSize: ".7rem", color: "var(--muted)", textAlign: "right" }}>{(v.prevLeads || 0).toLocaleString("en-US")}</div>
                    <div className="meter" style={{ height: 7 }}><i style={{ width: `${(v.prevLeads || 0) / max * 100}%`, background: "var(--faint)" }} /></div>
                    <div className="ww" style={{ fontSize: ".62rem" }}>{D.prevMonth}</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "52px 1fr 78px", alignItems: "center", gap: 7 }}>
                    <div className="num" style={{ fontSize: ".76rem", fontWeight: 700, textAlign: "right" }}>{v.leads.toLocaleString("en-US")}</div>
                    <div className="meter" style={{ height: 7 }}><i style={{ width: `${v.leads / max * 100}%`, background: "var(--brand)", boxShadow: "var(--glow)" }} /></div>
                    <div>{!v.prevLeads ? <span className="delta up">nuevo</span> : <span className={`delta ${diff >= 0 ? "up" : "down"}`}>{diff >= 0 ? "▲" : "▼"} {diff >= 0 ? "+" : ""}{Math.round(diff / (v.prevLeads || 1) * 100)}%</span>}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        {(() => {
          const man = D.channels.find(c => c.cls === "green") || {};
          const bot = D.channels.find(c => c.cls === "red") || {};
          const mult = man.conv && bot.conv ? Math.round(man.conv / Math.max(bot.conv, 1)) : "?";
          return (
            <React.Fragment>
              <SectionHead eb="Hallazgo clave" h3={`El canal manual rinde ${mult}× más`} />
              <div className="insight" style={{ alignItems: "center" }}>
                <span className="ic"><Icon name="bulb" size={18} sw={2.2} /></span>
                <div>
                  <div className="t">La carga manual convierte {man.conv || 0}% vs {bot.conv || 0}% del bot</div>
                  <div className="d">Ticket promedio manual <b>{fmtMoney(man.ticket || 0)}</b> contra {fmtMoney(bot.ticket || 0)} del automático. El <b>{bot.pct || 0}%</b> de los leads llegan por bot pero solo aportan <b>{bot.cierres || 0} cierres</b>; <b>{man.cierres || 0} de {G.cierres} cierres</b> vinieron de carga manual. Priorizar la carga manual tiene el mayor retorno por lead.</div>
                </div>
              </div>
            </React.Fragment>
          );
        })()}
      </div>
    </div>
  );
}
window.ViewResumen = ViewResumen;

/* ---------- shell ---------- */
const VIEW_META = {
  resumen:    { crumb: "Control diario", title: `Resumen ejecutivo — ${D.month} ${D.year}` },
  analisis:   { crumb: "Análisis & datos", title: "Análisis IA — Sala de expertos" },
  equipo:     { crumb: "Control diario", title: "Responsabilidad por vendedora" },
  seguimiento:{ crumb: "Control diario", title: "Backlog de seguimiento" },
  alertas:    { crumb: "Control diario", title: `Alertas accionables — ${D.month} ${D.year}` },
  conversion: { crumb: "Análisis & datos", title: "Conversión y embudo" },
  semanal:    { crumb: "Análisis & datos", title: "Ritmo semanal" },
  sucursales: { crumb: "Análisis & datos", title: "Rendimiento por sucursal" },
  proyeccion: { crumb: "Análisis & datos", title: `Proyección al cierre — ${D.month}` },
  datos:      { crumb: "Análisis & datos", title: "Salud del CRM" },
};
function bodyFor(view) {
  const map = {
    resumen: ViewResumen, equipo: window.ViewEquipo, seguimiento: window.ViewSeguimiento,
    alertas: window.ViewAlertas, analisis: window.ViewAnalisis, conversion: window.ViewConversion, semanal: window.ViewSemanal,
    sucursales: window.ViewSucursales, proyeccion: window.ViewProyeccion, datos: window.ViewDatos,
  };
  return map[view] || ViewResumen;
}

function Panel() {
  const [theme, setTheme] = useState(() => localStorage.getItem("heaven_theme") || "light");
  const [view, setView] = useState(() => localStorage.getItem("heaven_view") || "resumen");
  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); localStorage.setItem("heaven_theme", theme); }, [theme]);
  useEffect(() => { localStorage.setItem("heaven_view", view); }, [view]);
  useEffect(() => { window.__go = setView; }, []);
  const scrollRef = React.useRef(null);
  const [prog, setProg] = useState(0);
  const [showTop, setShowTop] = useState(false);
  const [pres, setPres] = useState(false);
  useEffect(() => { document.body.classList.toggle("pres", pres); }, [pres]);
  const onScroll = e => { const el = e.target; const m = el.scrollHeight - el.clientHeight; setProg(m > 0 ? el.scrollTop / m * 100 : 0); setShowTop(el.scrollTop > 300); };
  const [loading, setLoading] = useState(false);
  const refresh = () => { setLoading(true); setTimeout(() => setLoading(false), 850); };
  const [perfil, setPerfil] = useState(null);
  const [sucursal, setSucursal] = useState(null);
  const [histOpen, setHistOpen] = useState(false);
  useEffect(() => {
    if (!histOpen) return;
    const close = () => setHistOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [histOpen]);
  useEffect(() => { window.__perfil = v => { setSucursal(null); setPerfil(v); }; window.__sucursal = n => { setPerfil(null); setSucursal(n); }; }, []);
  const meta = VIEW_META[view] || VIEW_META.resumen;
  const Body = bodyFor(view);

  return (
    <React.Fragment>
      <aside className="rail">
        <div className="brand"><img className="logo-img" src="logo.png" alt="Heaven Colchones" /><div className="s">Panel comercial</div></div>
        <nav className="nav">
          <div className="nl">Control diario</div>
          {D.nav.slice(0, 4).map(n => (
            <button key={n.id} className={`ni${view === n.id ? " active" : ""}`} onClick={() => setView(n.id)}><Icon name={n.id} />{n.label}{n.badge && <span className="bdg">{n.badge}</span>}</button>
          ))}
          <div className="nl">Análisis &amp; datos</div>
          {D.nav.slice(4).map(n => (
            <button key={n.id} className={`ni${view === n.id ? " active" : ""}`} onClick={() => setView(n.id)}><Icon name={n.id} />{n.label}</button>
          ))}
        </nav>
        <div className="foot"><span className="dot" />Datos en vivo · Kommo<br />{D.fecha ? `Actualizado ${D.fecha}` : "Datos en vivo"}</div>
      </aside>

      <div className="main">
        <header className="top">
          <div className="mob-brand"><img className="logo-img" src="logo.png" alt="Heaven Colchones" style={{height:"22px",width:"auto",filter:"brightness(0) invert(1)"}} /></div>
          <div><div className="crumb">{meta.crumb}</div><h1>{meta.title}</h1></div>
          <div className="tr">
            <span className="chip">eanez.kommo.com</span>
            <div className="hist" onClick={e => e.stopPropagation()}>
              <button className="btn" title="Ver meses anteriores" onClick={() => setHistOpen(o => !o)}><Icon name="history" size={14} />Historial<Icon name="chevron" size={13} /></button>
              {histOpen && (
                <div className="hist-menu">
                  <div className="lbl">Meses publicados</div>
                  {D.archives.map((a, i) => (
                    <a key={i} href={a.url} className={i === 1 ? "cur" : ""} onClick={e => { if (a.url === "#") e.preventDefault(); setHistOpen(false); }}><Icon name="semanal" size={14} />{a.label}{i === 1 && <span className="ww" style={{ marginLeft: "auto" }}>actual</span>}</a>
                  ))}
                </div>
              )}
            </div>
            <button className="btn icon" title="Modo presentación" onClick={() => setPres(p => !p)}><Icon name="present" size={15} /></button>
            <button className="btn icon" title="Cambiar tema" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}>
              <Icon name={theme === "dark" ? "sun" : "moon"} size={15} />
            </button>
            <button className="btn" onClick={refresh}><Icon name="refresh" size={14} style={loading ? { animation: "spin .8s linear infinite" } : null} />Actualizar</button>
            <button className="btn pri" onClick={exportTeamCSV} title="Descargar KPIs del equipo (CSV)"><Icon name="download" size={14} />Exportar</button>
          </div>
        </header>
        <div className="scroll" ref={scrollRef} onScroll={onScroll}>
          {loading ? <SkeletonView /> : <Body key={view} />}
        </div>
      </div>
      <div className="scrollbar" style={{ width: prog + "%" }} />
      <button className={`totop${showTop ? " show" : ""}`} title="Volver arriba" onClick={() => scrollRef.current && scrollRef.current.scrollTo({ top: 0, behavior: "smooth" })}><Icon name="up" size={18} /></button>
      <ProfileDrawer vendor={perfil} onClose={() => setPerfil(null)} />
      <SucursalDrawer name={sucursal} onClose={() => setSucursal(null)} onVendor={v => { setSucursal(null); setPerfil(v); }} />
      <nav className="mob-nav">
        {D.nav.slice(0, 5).map(n => (
          <button key={n.id} className={view === n.id ? "active" : ""} onClick={() => setView(n.id)}>
            <Icon name={n.id} size={20} />
            {n.label.split(" ")[0]}
            {n.badge ? <span className="mob-bdg">{n.badge}</span> : null}
          </button>
        ))}
      </nav>
    </React.Fragment>
  );
}
window.Panel = Panel;
