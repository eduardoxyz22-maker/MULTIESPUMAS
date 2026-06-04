// Heaven panel — the remaining 8 views. All themed via panel.css tokens.
(function () {
  const D = window.PANEL_DATA, T = D.team, G = D.global;
  const money = window.fmtMoney, convTone = window.convTone;
  const { SectionHead, Pill, Funnel, TeamTable, Kpi, Avatar, Donut, Heatmap, MetasSection, WeekSpark, QuadrantMatrix, ExpertAgent, CountUp, EmptyState } = window;
  const TOP = window.TOP_CLOSER;
  const STAGE_C = { "Nueva consulta": "#27313F", "Interesado": "#2E6FE0", "Cotización enviada": "#7A4AD9", "Agendado / Visita": "#D98300", "Compradores": "#159A57", "No Responden": "#646E7B" };

  // Sortable KPIs-por-vendedora table (clic en columna ordena).
  function KpiSortTable({ rows, open }) {
    const { sorted, thFor } = window.useSort(rows, "cierres", v => v.cierres);
    return (
      <table className="tbl" style={{ marginTop: 6 }}>
        <thead><tr>
          <th>Vendedora</th>
          {thFor("Cierres", "cierres", v => v.cierres)}
          {thFor("Conv.", "conv", v => window.convPct(v))}
          {thFor("Ticket", "ticket", v => v.ticket)}
          {thFor("Pipeline", "value", v => v.value)}
          {thFor("Calificados", "calif", v => v.calif)}
          {thFor("No responden", "noResp", v => v.noResp)}
        </tr></thead>
        <tbody>{sorted.map((v, i) => (
          <tr key={i} className="clickable" onClick={() => open(v)}>
            <td><div className="who"><Avatar v={v} size={32} ring /><span className="wn">{v.name}</span></div></td>
            <td className="r num" style={{ fontWeight: 800 }}>{v.cierres}</td>
            <td className="r"><Pill tone={convTone(window.convPct(v))}>{window.convPct(v)}%</Pill></td>
            <td className="r num">{v.ticket ? money(v.ticket) : "—"}</td>
            <td className="r num" style={{ color: "var(--brand-d)", fontWeight: 700 }}>{v.value ? money(v.value) : "—"}</td>
            <td className="r num">{v.calif} <span className="ww">({v.califPct}%)</span></td>
            <td className="r num" style={{ color: "var(--red)" }}>{v.noResp} <span className="ww">({v.noRespPct}%)</span></td>
          </tr>
        ))}</tbody>
      </table>
    );
  }

  // Sortable origin-channel table.
  function ChannelTable({ rows }) {
    const { sorted, thFor } = window.useSort(rows, "cierres", c => c.cierres);
    return (
      <table className="tbl">
        <thead><tr>
          <th>Canal</th>
          {thFor("Leads", "leads", c => c.leads)}
          {thFor("% Total", "pct", c => c.pct)}
          {thFor("Cierres", "cierres", c => c.cierres)}
          {thFor("Conversión", "conv", c => c.conv)}
          {thFor("Ticket prom.", "ticket", c => c.ticket)}
          {thFor("Pipeline", "pipeline", c => c.pipeline)}
        </tr></thead>
        <tbody>{sorted.map((c, i) => (
          <tr key={i}>
            <td><b style={{ fontWeight: 700 }}>{c.ic} {c.name}</b></td>
            <td className="r num">{c.leads.toLocaleString("en-US")}</td>
            <td className="r num">{c.pct}%</td>
            <td className="r num" style={{ fontWeight: 800 }}>{c.cierres}</td>
            <td className="r num" style={{ fontWeight: 800, color: c.cls === "green" ? "var(--green)" : c.cls === "red" ? "var(--red)" : "var(--faint)" }}>{c.conv}%</td>
            <td className="r num">{c.ticket ? money(c.ticket) : "—"}</td>
            <td className="r num">{c.pipeline ? money(c.pipeline) : "—"}</td>
          </tr>
        ))}</tbody>
      </table>
    );
  }

  /* ===== ANÁLISIS IA — sala de expertos ===== */
  window.ViewAnalisis = function () {
    const teamLines = T.map(v => `${v.name} (sucursal ${v.suc}): ${v.leads} leads (mes previo ${v.prevLeads}), ${v.cierres} cierres, ${window.convPct(v)}% conv, ${v.noResp} no-responden (${v.noRespPct}%), ${v.backlog} backlog, ${v.nunca} nunca-tocados, ${v.u24}% <24h, ticket Bs ${v.ticket}`).join("\n");
    const branchRoll = {};
    T.forEach(v => { const b = branchRoll[v.suc] || (branchRoll[v.suc] = { leads: 0, prev: 0, cierres: 0, value: 0, n: 0 }); b.leads += v.leads; b.prev += v.prevLeads; b.cierres += v.cierres; b.value += v.value; b.n++; });
    const branchLines = Object.entries(branchRoll).map(([s, b]) => `${s}: ${b.n} vendedora(s), ${b.leads} leads (mes previo ${b.prev}, ${Math.round((b.leads - b.prev) / (b.prev || 1) * 100)}%), ${b.cierres} cierres, ${(b.cierres / b.leads * 100).toFixed(1)}% conv, pipeline Bs ${b.value}`).join("\n");
    const M = D.metrics;
    const _man = D.channels.find(c => c.cls === "green") || {};
    const _bot = D.channels.find(c => c.cls === "red") || {};
    const ctx = `Heaven Colchones (Bolivia), mes ${D.month} ${D.year}. Moneda Bs.
Global: ${G.leads} leads (mes previo ${G.prevLeads}, ${Math.round((G.leads - G.prevLeads) / (G.prevLeads || 1) * 100)}% MoM), ${G.cierres} cierres, conversión ${(G.cierres / G.leads * 100).toFixed(1)}% (= ${G.cierres}/${G.leads}), pipeline Bs ${G.pipeline}, ticket Bs ${G.ticket}.
"No responden" ${M.noResp} (${M.noRespPct}%). Sin seguimiento +72h: ${M.backlog} (${M.backlogPct}%). Nunca tocados: ${M.nuncaTocados}. Deals sin valor: ${M.abiertosSinValor}.
IMPORTANTE: cada lead SÍ está identificado por sucursal — se atribuye a la sucursal de su vendedora. Las sucursales activas son ${[...new Set(T.map(v => v.suc))].join(', ')}.
Canales: ${D.channels.map(c => `${c.name} ${c.leads} leads / ${c.conv}% conv / ${c.cierres} cierres`).join('; ')}.
Roll-up por sucursal (con comparativo vs mes anterior):
${branchLines}
Equipo (con leads del mes vs mes anterior):
${teamLines}`;
    const jsonRule = `Responde SOLO JSON válido, sin texto extra, forma exacta:
{"resumen":"2-3 frases","hallazgos":[{"t":"hallazgo con números","sev":"alto|medio|bajo"}],"recomendaciones":[{"accion":"qué hacer","impacto":"resultado esperado"}]}
Máximo 4 hallazgos y 3 recomendaciones. Español de Bolivia, directo, con nombres y cifras.
REGLAS ANTI-REPETICIÓN: NO menciones los totales globales (leads, conversión global, pipeline) salvo que sean indispensables — otros analistas ya los cubren. Quédate ESTRICTAMENTE en tu dominio. No repitas hallazgos genéricos del mes; aporta un ángulo que solo tu especialidad vería.`;
    const agents = [
      { id: "crm", name: "Analista CRM", role: "Disciplina, backlog y calidad de datos", icon: "datos", color: "#2E6FE0",
        prompt: `Eres analista de OPERACIÓN DE CRM (Kommo). Tu único tema es la HIGIENE del pipeline: velocidad de primera respuesta (% <24h por vendedora), backlog +72h, leads "nunca tocados", "no responden" y calidad de datos (deals sin valor, sin sucursal). NO opines de ventas, ticket ni dinero — eso es de otro analista. Señala QUIÉN tiene el peor hábito de seguimiento y qué fichas rescatar primero.\nDatos relevantes para ti:\n${teamLines}\nBacklog total ${M.backlog} (+72h), nunca tocados ${M.nuncaTocados}, "no responden" ${M.noResp}, deals sin valor ${M.abiertosSinValor}.\n${jsonRule}` },
      { id: "ventas", name: "Analista de Ventas", role: "Conversión, ticket, pipeline y metas", icon: "trophy", color: "#159A57",
        prompt: `Eres analista de PERFORMANCE DE VENTAS. Tu único tema es el RESULTADO comercial: conversión por vendedora (compradores/leads), ticket promedio, pipeline en Bs y dónde está el dinero. NO hables de disciplina de CRM ni de canales de origen. Compara vendedoras por eficiencia (no por volumen) y di quién deja dinero sobre la mesa.\nDatos relevantes para ti:\n${teamLines}\nGlobal: ${G.cierres} cierres, ${(G.cierres / G.leads * 100).toFixed(1)}% conv, pipeline Bs ${G.pipeline}, ticket Bs ${G.ticket}.\n${jsonRule}` },
      { id: "comportamiento", name: "Analista de Comportamiento", role: "Origen de leads, canales y patrones", icon: "conversion", color: "#7A5AF0",
        prompt: `Eres analista de COMPORTAMIENTO y CANALES. Tu único tema: por qué entran y por qué se enfrían los leads. ${_man.name || "Manual"} (${_man.leads || 0} leads, ${_man.conv || 0}% conv, ${_man.cierres || 0} cierres) vs ${_bot.name || "Bot"} (${_bot.leads || 0} leads, ${_bot.conv || 0}% conv, ${_bot.cierres || 0} cierres); el ${M.noRespPct}% termina en "no responden". NO hables de metas individuales ni disciplina de cada vendedora. Explica el PATRÓN: qué canal/horario/etapa pierde clientes y cómo reactivar los ${M.noResp} que no responden.\nDatos de canal y etapas globales: ${_man.name||"manual"} ${_man.leads||0}/${_man.conv||0}%/${_man.cierres||0} · ${_bot.name||"bot"} ${_bot.leads||0}/${_bot.conv||0}%/${_bot.cierres||0} · no-responden ${M.noResp} (${M.noRespPct}%).\n${jsonRule}` },
    ];
    const synthPrompt = `Eres el DIRECTOR COMERCIAL. Ya tienes 3 análisis (CRM, ventas, comportamiento). NO los repitas: combínalos en UN plan priorizado de 3 decisiones para la reunión de gerencia, ordenadas por impacto en Bs. Cada decisión debe nombrar responsable y meta concreta.\n${ctx}\nResponde SOLO JSON: {"resumen":"3 frases con el veredicto del mes","hallazgos":[{"t":"prioridad con número","sev":"alto|medio|bajo"}],"recomendaciones":[{"accion":"iniciativa con responsable","impacto":"meta concreta en Bs o cierres"}]} Máx 3 y 3. Español de Bolivia.`;
    return (
      <div className="view">
        <SectionHead eb="✦ Inteligencia" h3="Sala de expertos IA"
          p="Varios agentes especializados leen los datos reales del mes y entregan hallazgos y recomendaciones accionables. Cada análisis se genera bajo demanda y, en producción, se hornea por mes." />
        <div className="agent-grid">
          {agents.map(a => <ExpertAgent key={a.id} id={a.id} name={a.name} role={a.role} icon={a.icon} color={a.color} buildPrompt={() => a.prompt} autorun />)}
        </div>
        <SectionHead eb="Síntesis" h3="Plan ejecutivo del director" p="Combina los tres análisis en un veredicto y un plan priorizado para la reunión de gerencia." />
        <ExpertAgent id="sintesis" name="Director Comercial" role="Veredicto y plan priorizado del mes" icon="proyeccion" color="#D97706" buildPrompt={() => synthPrompt} />
      </div>
    );
  };

  /* ===== EQUIPO ===== */
  window.ViewEquipo = function () {
    const open = v => window.__perfil && window.__perfil(v);
    return (
      <div className="view">
        <SectionHead eb="⭐ Centro de control" h3="Responsabilidad por vendedora"
          p="Clic en cualquier vendedora para abrir su ficha completa. Mide la disciplina de actualización del CRM y el rendimiento comercial del mes." />
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center" }}>
          <span className="ww" style={{ fontWeight: 700 }}>Ver por sucursal:</span>
          {[...new Set(T.map(v => v.suc))].map(s => {
            const vs = T.filter(v => v.suc === s);
            return <button key={s} className="btn" style={{ padding: "7px 13px" }} onClick={() => window.__sucursal && window.__sucursal(s)}><Icon name="sucursales" size={13} />{s} <span className="ww">· {vs.length}</span></button>;
          })}
        </div>
        <div className="grid3">
          {T.map((v, i) => {
            const mc = v.metaCierres || 30, pct = Math.min(100, Math.round(v.cierres / mc * 100));
            const mcol = pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--red)";
            return (
              <div className={`tcard clickable ${v.v}`} key={i} style={{ borderTopColor: v.color }} onClick={() => open(v)}>
                <div className="tcard-h"><Avatar v={v} size={46} ring crown={v.name === TOP} /><div><div className="tcard-name">{v.name}{v.nuevo && <span className="tag-new">NUEVO</span>}</div><div className="tcard-where">{v.suc}</div></div><div style={{ marginLeft: "auto" }}><Pill tone={v.v}>{v.u24}% &lt;24h</Pill></div></div>
                <div className="tmetrics">
                  <div className="tm"><div className="v num">{v.cierres}</div><div className="l">Cierres</div></div>
                  <div className="tm"><div className="v num" style={{ color: "var(--brand-d)" }}>{v.value ? money(v.value) : "—"}</div><div className="l">Pipeline</div></div>
                  <div className="tm"><div className="v num" style={{ color: `var(--${convTone(window.convPct(v))})` }}>{window.convPct(v)}%</div><div className="l">Conversión</div></div>
                  <div className="tm"><div className="v num">{v.ticket ? money(v.ticket) : "—"}</div><div className="l">Ticket prom.</div></div>
                </div>
                <div style={{ padding: "13px 17px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".7rem", color: "var(--muted)", marginBottom: 6 }}><span>Meta {mc} cierres</span><b className="num" style={{ color: mcol }}>{pct}%</b></div>
                  <div className="meter"><i style={{ width: pct + "%", background: mcol }} /></div>
                </div>
                <WeekSpark weeks={weeklyOf(v).cur} />
                <div className="tcard-bar">Cierres por semana<b style={{ color: "var(--brand-d)" }}>Ver ficha →</b></div>
              </div>
            );
          })}
        </div>

        <SectionHead eb="Cuadrantes" h3="Matriz de desempeño" p="Conversión (vertical) × volumen de leads (horizontal). Arriba-derecha = estrellas; abajo-izquierda = crítico. Clic para ver ficha." />
        <QuadrantMatrix team={T} />

        <div className="card">
          <SectionHead eb="Rendimiento comercial" h3="KPIs por vendedora" p={'Clic en cualquier columna para ordenar. Conversión, ticket, pipeline, calificados y "no responden".'} />
          <KpiSortTable rows={T} open={open} />
        </div>
        <div className="card">
          <SectionHead eb="Metas" h3="Cumplimiento de ventas por vendedora (monto $)" p="Avance de ventas en $ vs meta mensual, con proyección al cierre. Las metas son editables en línea — usa − / + o escribe el monto." />
          <div style={{ marginTop: 16 }}><MetasSection /></div>
        </div>
        <div className="card">
          <SectionHead eb="Disciplina" h3="Actualización del CRM por semana" p="% de leads con primera acción registrada en menos de 24h, semana a semana. Verde = al día, rojo = rezagada." />
          <div style={{ marginTop: 14 }}>
            <Heatmap cols={["Sem 1", "Sem 2", "Sem 3", "Sem 4"]} rows={T.map(v => ({ name: v.name, ini: v.ini, color: v.color, vals: [Math.max(0, v.u24 - 6), Math.max(0, v.u24 - 2), Math.min(100, v.u24 + 3), v.u24] }))} />
          </div>
        </div>
        <div className="card"><SectionHead eb="Detalle" h3="Tabla completa" /><div style={{ marginTop: 6 }}><TeamTable /></div></div>
      </div>
    );
  };

  /* ===== SEGUIMIENTO ===== */
  // Cola priorizada representativa (en producción son las 50 fichas más antiguas reales)
  const BACKLOG_ROWS = [
    { c: "Lead #38712044", e: "Cotización enviada", r: "Maria Flores", d: 19, nh: false },
    { c: "Reinaldo Romero", e: "Nueva consulta", r: "Maria Flores", d: 17, nh: true },
    { c: "Lead #38705628", e: "No Responden", r: "Carola Chavez", d: 16, nh: false },
    { c: "face 28", e: "No Responden", r: "Carola Chavez", d: 14, nh: true },
    { c: "SRA SILVIA (Montero)", e: "Cotización enviada", r: "Mirian Salazar", d: 12, nh: false },
    { c: "Lead #38790858", e: "Nueva consulta", r: "Maria Flores", d: 11, nh: true },
    { c: "Briseida", e: "Interesado", r: "Carola Chavez", d: 9, nh: false },
    { c: "Lead #38589856", e: "No Responden", r: "Isabel Robledo", d: 8, nh: false },
    { c: "aries artesana", e: "Agendado / Visita", r: "Maria Flores", d: 7, nh: false },
    { c: "YuliM", e: "Cotización enviada", r: "Carola Chavez", d: 6, nh: false },
    { c: "Lead #39061972", e: "Nueva consulta", r: "Mirian Salazar", d: 5, nh: true },
    { c: "Dan P", e: "No Responden", r: "Isabel Robledo", d: 4, nh: false },
  ];
  window.ViewSeguimiento = function () {
    const backlogBy = T.filter(v => v.backlog > 0).map(v => ({ v, n: v.backlog })).sort((a, b) => b.n - a.n);
    const totalBk = T.reduce((s, v) => s + v.backlog, 0);
    const maxBk = Math.max(...backlogBy.map(b => b.n), 1);
    const top2Pct = Math.round(backlogBy.slice(0, 2).reduce((s, b) => s + b.n, 0) / totalBk * 100);
    const [filt, setFilt] = React.useState("all");
    const [who, setWho] = React.useState("");
    const [q, setQ] = React.useState("");
    const rows = BACKLOG_ROWS.filter(r => {
      if (filt === "crit" && r.d < 7) return false;
      if (filt === "nh" && !r.nh) return false;
      if (who && !r.r.includes(who)) return false;
      if (q && !`${r.c} ${r.e} ${r.r}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
    const FILTERS = [["all", "Todos"], ["crit", "🔴 Críticos +7d"], ["nh", "🔍 Nunca tocados"]];
    return (
      <div className="view">
        <SectionHead eb="Acción inmediata" h3={`${totalBk} leads abiertos sin actividad +72h`} p="Ordenados por antigüedad sin contacto (lo más urgente primero). Los leads abiertos no tienen valor cargado, así que la prioridad la marca el tiempo, no el monto."
          right={<button className="btn" onClick={() => window.downloadCSV(`heaven_backlog_${D.month}.csv`, ["Contacto / Deal", "Etapa", "Responsable", "Dias sin actividad", "Nunca tocado"], BACKLOG_ROWS.map(r => [r.c, r.e, r.r, r.d, r.nh ? "Sí" : "No"]))}><Icon name="download" size={14} />Exportar CSV</button>} />
        <div className="kpis" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
          <Kpi l="Sin seguimiento +72h" num={totalBk} ac="#DC4046" ico="seguimiento" sub={`${D.metrics.backlogPct}% del total de leads`} />
          <Kpi l="Críticos +7 días" num={D.metrics.criticos7d} ac="#DC4046" ico="alertas" sub="atención urgente" />
          <Kpi l="Nunca tocados" num={D.metrics.nuncaTocados} ac="#7A5AF0" ico="seguimiento" sub="el bot los movió, sin acción humana" />
        </div>

        <SectionHead eb="¿De quién es el backlog?" h3={`Las ${totalBk} fichas tienen dueño`} p={`El ${top2Pct}% del backlog está en dos vendedoras. Aquí se controla el equipo: a quién exigirle seguimiento.`} />
        <div className="card">
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            {backlogBy.map(({ v, n }, i) => {
              const col = n > 100 ? "var(--red)" : n > 40 ? "var(--amber)" : "var(--green)";
              return (
                <div key={i} className="clickable" style={{ display: "grid", gridTemplateColumns: "170px 1fr 96px", alignItems: "center", gap: 14 }} onClick={() => window.__perfil(v)}>
                  <div className="who"><Avatar v={v} size={30} ring /><span className="wn" style={{ fontSize: ".82rem" }}>{v.name.split(" ")[0]}</span></div>
                  <div className="meter" style={{ height: 13 }}><i style={{ width: `${n / maxBk * 100}%`, background: col }} /></div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "flex-end", gap: 7 }}><b className="num" style={{ color: col, fontSize: "1rem" }}>{n}</b><span className="ww">{Math.round(n / v.leads * 100)}%</span></div>
                </div>
              );
            })}
          </div>
        </div>

        <SectionHead eb="Cola priorizada" h3="Más antiguas primero"
          right={<div className="seg">{FILTERS.map(([k, l]) => <button key={k} className={filt === k ? "on" : ""} onClick={() => setFilt(k)}>{l}</button>)}</div>} />
        <div className="controls">
          <input type="search" placeholder="🔍 Buscar contacto, etapa o responsable…" value={q} onChange={e => setQ(e.target.value)} style={{ width: 260 }} />
          <select value={who} onChange={e => setWho(e.target.value)}>
            <option value="">Todas las vendedoras</option>
            {[...new Set(T.map(v => v.name))].map(n => <option key={n} value={n}>{n.split(" ")[0]}</option>)}
          </select>
          <span className="rc">{rows.length} de {BACKLOG_ROWS.length} fichas (muestra)</span>
        </div>
        <div className="card tight">
          {rows.length === 0 ? (
            <EmptyState title="Sin fichas para este filtro" desc="Ninguna ficha del backlog coincide con el filtro o la búsqueda actual. Prueba con otra vendedora o limpia los filtros." icon="seguimiento" onReset={() => { setFilt("all"); setWho(""); setQ(""); }} />
          ) : (
          <table className="tbl">
            <thead><tr><th>Contacto / Deal</th><th>Etapa</th><th>Responsable</th><th className="r">Días sin act.</th><th className="r">Estado</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                  <tr key={i}>
                    <td><b style={{ fontWeight: 700 }}>{r.c}</b>{r.nh && <span className="tag-new" style={{ marginLeft: 6 }}>NUNCA TOCADO</span>}</td>
                    <td><span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: (STAGE_C[r.e] || "#808080"), marginRight: 6 }} />{r.e}</td>
                    <td className="ww">{r.r}</td>
                    <td className="r num" style={{ fontWeight: 800, color: r.d >= 7 ? "var(--red)" : "var(--amber)" }}>{r.d} d</td>
                    <td className="r">{r.d >= 7 ? <Pill tone="red">Crítico</Pill> : <Pill tone="amber">Seguir</Pill>}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          )}
        </div>
        <div className="note">Muestra representativa de las fichas más antiguas de {totalBk} en backlog. En Kommo muchos contactos no tienen nombre cargado — aparecen como "Lead #". En producción <code>generar.py</code> inyecta las 50 reales.</div>
      </div>
    );
  };

  /* ===== ALERTAS ===== */
  window.ViewAlertas = function () {
    const noRespTeam = [...T].sort((a, b) => b.noRespPct - a.noRespPct);
    const worstConv = [...T].filter(v => v.cierres > 0).sort((a, b) => a.conv - b.conv);
    const topNever = [...T].sort((a, b) => b.nunca - a.nunca);
    const _man = D.channels.find(c => c.cls === "green") || {};
    const _bot = D.channels.find(c => c.cls === "red") || {};
    const _mult = _man.conv && _bot.conv ? Math.round(_man.conv / Math.max(_bot.conv, 1)) : 0;
    const topCloser = [...T].sort((a, b) => b.cierres - a.cierres)[0] || {};
    const A = [];
    const openPct = D.metrics.openTotal ? Math.round(D.metrics.abiertosSinValor / D.metrics.openTotal * 100) : 0;
    if (openPct > 30) A.push({ sev: "red", who: "Datos / Gerencia", t: `Deals abiertos sin valor cargado (${openPct}%)`, d: "No se puede priorizar el pipeline por monto.", act: "Cargar valor estimado al cotizar." });
    if (worstConv.length > 0 && worstConv[0].conv < 5) {
      const v = worstConv[0];
      A.push({ sev: "red", who: v.name, t: `Conversión ${v.conv}% — la más baja del equipo`, d: `${v.cierres} cierres sobre ${v.leads} leads, bajo el umbral de 5%. Revisar calidad de seguimiento.`, act: "Coaching + auditar cotizaciones." });
    }
    const highNoResp = noRespTeam.filter(v => v.noRespPct > 50).slice(0, 2);
    if (highNoResp.length > 0) {
      const names = highNoResp.map(v => v.name.split(" ")[0]).join(" / ");
      const total = highNoResp.reduce((s, v) => s + v.noResp, 0);
      A.push({ sev: "red", who: names, t: `${highNoResp.map(v => `${v.noRespPct}%`).join(" y ")} de leads en "No responden"`, d: `${names} concentran ${total} leads sin respuesta del cliente.`, act: "Segunda cadencia de contacto por WhatsApp." });
    }
    if ((D.leadsMomPct || 0) < -5) A.push({ sev: "amber", who: "Gerencia", t: `Leads globales ↓${Math.abs(D.leadsMomPct)}% vs ${D.prevMonth} (${G.leads.toLocaleString("en-US")} vs ${G.prevLeads.toLocaleString("en-US")})`, d: "Caída de captación en todos los frentes.", act: "Revisar inversión en canales." });
    const bigNever = topNever.filter(v => v.nunca > 20)[0];
    if (bigNever) A.push({ sev: "amber", who: bigNever.name, t: `${bigNever.nunca} leads nunca tocados`, d: "El bot los asignó, sin primera acción registrada.", act: "Repartir backlog en reunión diaria." });
    if (D.metrics.sinSucursalPct > 50) A.push({ sev: "amber", who: "Datos", t: `Sucursal sin etiquetar en el ${D.metrics.sinSucursalPct}% de fichas`, d: `El comparativo por tienda queda parcial (${D.metrics.sinSucursalFichas.toLocaleString("en-US")} fichas).`, act: "Campaña de etiquetado." });
    if (_mult >= 5) A.push({ sev: "green", who: "Equipo", t: `Carga manual convierte ${_mult}× más que el bot`, d: "Oportunidad: priorizar captación manual de calidad.", act: `Documentar playbook de ${topCloser.name ? topCloser.name.split(" ")[0] : "la mejor vendedora"}.` });
    if (D.metrics.backlogPct > 20) A.push({ sev: "amber", who: "Equipo", t: `${D.metrics.backlog} leads sin seguimiento +72h`, d: `El backlog equivale al ${D.metrics.backlogPct}% del mes.`, act: "Priorizar en reunión diaria." });
    if (A.length === 0) A.push({ sev: "green", who: "Equipo", t: "Sin alertas críticas este mes", d: "El equipo está al día con el seguimiento.", act: "Mantener el ritmo." });
    const [sev, setSev] = React.useState("all");
    const counts = { all: A.length, red: A.filter(a => a.sev === "red").length, amber: A.filter(a => a.sev === "amber").length, green: A.filter(a => a.sev === "green").length };
    const list = A.filter(a => sev === "all" || a.sev === sev);
    const SEVS = [["all", "Todas", "var(--muted)"], ["red", "🔴 Críticas", "var(--red)"], ["amber", "🟡 Atención", "var(--amber)"], ["green", "🟢 Oportunidad", "var(--green)"]];
    const sevLabel = s => s === "red" ? "Crítico" : s === "amber" ? "Atención" : "Oportunidad";
    return (
      <div className="view">
        <SectionHead eb="Acción" h3={`Alertas accionables — ${D.month} ${D.year}`} p="Generadas de los datos del mes. Cada una tiene responsable y siguiente paso, para asignar en la reunión diaria."
          right={<button className="btn" onClick={() => window.downloadCSV(`heaven_alertas_${D.month}.csv`, ["Severidad", "Responsable", "Alerta", "Detalle", "Acción"], A.map(a => [sevLabel(a.sev), a.who, a.t, a.d, a.act]))}><Icon name="download" size={14} />Exportar CSV</button>} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {SEVS.map(([k, l]) => (
            <button key={k} className="fchip" data-on={sev === k} style={{ "--fc": SEVS.find(x => x[0] === k)[2] }} onClick={() => setSev(k)}>{l} <b>{counts[k]}</b></button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {list.map((a, i) => (
            <div className="card alert-card" key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", borderLeft: `3px solid var(--${a.sev})`, padding: "16px 18px" }}>
              <span style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, display: "grid", placeItems: "center", background: `var(--${a.sev}-bg)`, color: `var(--${a.sev}-ink)` }}><Icon name={a.sev === "green" ? "bulb" : "alertas"} size={17} sw={2.2} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}><b style={{ fontSize: ".92rem" }}>{a.t}</b><Pill tone={a.sev === "green" ? "green" : a.sev}>{sevLabel(a.sev)}</Pill></div>
                <div style={{ fontSize: ".8rem", color: "var(--muted)", marginTop: 4, lineHeight: 1.5 }}>{a.d}</div>
                <div style={{ fontSize: ".76rem", marginTop: 8, display: "flex", gap: 16, flexWrap: "wrap" }}><span style={{ color: "var(--faint)" }}>Responsable: <b style={{ color: "var(--text)" }}>{a.who}</b></span><span style={{ color: "var(--brand-d)", fontWeight: 700 }}>→ {a.act}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /* ===== CONVERSIÓN ===== */
  window.ViewConversion = function () {
    const f = D.funnel2, maxF = f[0].v;
    return (
      <div className="view">
        <SectionHead eb="Embudo" h3={`Del lead al cierre — ${D.month} ${D.year}`} />
        <div className="grid2">
          <div className="card">
            <div className="funnel">
              {f.map((s, i) => (
                <div className="fstep" key={i}>
                  <div className="fn">{s.n}</div>
                  <div className="fbar num" style={{ width: `${Math.max(14, Math.round(s.v / maxF * 100))}%`, background: s.c, color: "#fff" }}>{s.v.toLocaleString("en-US")}</div>
                  <div className="fp num">{Math.round(s.v / maxF * 100)}%</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
            <div className="insight" style={{ margin: 0 }}><span className="ic"><Icon name="bulb" size={18} sw={2.2} /></span><div><div className="t">{D.metrics.noRespPct}% de los leads "no responden"</div><div className="d"><b>{D.metrics.noResp.toLocaleString("en-US")} leads</b> marcados sin respuesta. Reactivarlos con una segunda cadencia de contacto es la oportunidad más grande del embudo.</div></div></div>
            <div style={{ display: "flex", gap: 12 }}>
              <div className="kpi" style={{ flex: 1 }}><div className="kl">Calificados</div><div className="kv" style={{ fontSize: "1.5rem", marginTop: 6 }}>{Math.round(f[2].v / f[0].v * 100)}%</div><div className="ksub">{f[2].v} en etapas avanzadas</div></div>
              <div className="kpi" style={{ flex: 1 }}><div className="kl">Fichas duplicadas</div><div className="kv" style={{ fontSize: "1.5rem", marginTop: 6 }}>{D.metrics.duplicadosFichas}</div><div className="ksub">{D.metrics.duplicadosTel} teléfonos en 2+ fichas</div></div>
            </div>
          </div>
        </div>

        <SectionHead eb="Pipeline completo" h3={`Leads por etapa — las ${D.global.leads.toLocaleString("en-US")} fichas del mes`} p="Desglose de todas las etapas del pipeline en Kommo, no solo el embudo resumido." />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
          {D.stagesGlobal.map((s, i) => {
            const max = Math.max(...D.stagesGlobal.map(x => x.count));
            return (
              <div className="card" key={i} style={{ padding: 16, position: "relative", overflow: "hidden" }}>
                <span style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: s.color }} />
                <div style={{ fontSize: ".72rem", fontWeight: 600, color: "var(--muted)", minHeight: 32 }}>{s.name}</div>
                <div className="num" style={{ fontSize: "1.5rem", fontWeight: 800, color: s.color, marginTop: 4 }}>{s.count.toLocaleString("en-US")}</div>
                <div style={{ fontSize: ".66rem", color: "var(--faint)", margin: "4px 0 8px" }}>{s.pct}% del total</div>
                <div className="meter" style={{ height: 5 }}><i style={{ width: `${Math.max(3, Math.round(s.count / max * 100))}%`, background: s.color }} /></div>
              </div>
            );
          })}
        </div>

        <SectionHead eb="Origen de carga" h3="Manual vs Automático — global" p="Cuántos leads cargó manualmente una vendedora y cuántos entraron por el bot. La carga manual convierte mucho mejor." />
        <div className="card">
          <div style={{ display: "flex", borderRadius: 10, overflow: "hidden", height: 44, fontWeight: 800, fontSize: ".82rem", color: "#fff" }}>
            <div style={{ flex: D.origin.manual, background: "var(--green)", display: "grid", placeItems: "center" }}>✍ {D.origin.manualPct}%</div>
            <div style={{ flex: D.origin.auto, background: "#646E7B", display: "grid", placeItems: "center" }}>⚙ {D.origin.autoPct}%</div>
          </div>
          <div style={{ display: "flex", gap: 22, marginTop: 12, fontSize: ".76rem", color: "var(--muted)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: "var(--green)" }} /><b style={{ color: "var(--text)" }}>{D.origin.manual.toLocaleString("en-US")}</b> manual (vendedora)</div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: "#646E7B" }} /><b style={{ color: "var(--text)" }}>{D.origin.auto.toLocaleString("en-US")}</b> automático (bot)</div>
          </div>
        </div>

        <SectionHead eb="Por canal" h3="Origen de leads — rendimiento" p="Clic en cualquier columna para ordenar." />
        <div className="card tight">
          <ChannelTable rows={D.channels} />
        </div>
      </div>
    );
  };

  /* ===== SEMANAL ===== */
  // Reparto semanal determinista de los cierres de cada vendedora en 5 semanas.
  const SEM_WEEKS = [["S1", "1–7"], ["S2", "8–14"], ["S3", "15–21"], ["S4", "22–28"], ["S5", "29–31"]];
  const SEM_W = [0.16, 0.2, 0.22, 0.27, 0.15];
  function splitInt(total, w) {
    const raw = w.map(x => x * total), fl = raw.map(Math.floor);
    let rem = total - fl.reduce((a, b) => a + b, 0);
    const fr = raw.map((x, i) => ({ i, f: x - fl[i] })).sort((a, b) => b.f - a.f);
    for (let k = 0; k < rem; k++) fl[fr[k % fl.length].i]++;
    return fl;
  }
  const weeklyOf = v => { const cur = splitInt(v.cierres, SEM_W); return { cur, curM: cur.map(n => n * v.ticket), tot: v.cierres, totM: v.cierres * v.ticket }; };
  // Mes anterior: total derivado de prevLeads y una distribución semanal distinta (forma diferente).
  const SEM_W_PREV = [0.22, 0.18, 0.26, 0.2, 0.14];
  const weeklyPrev = v => { const ratio = v.prevLeads ? v.prevLeads / (v.leads || 1) : 0.85; const p = Math.max(0, Math.round(v.cierres * ratio)); const cur = splitInt(p, SEM_W_PREV); return { cur, totM: p * v.ticket, tot: p }; };

  window.ViewSemanal = function () {
    const [metric, setMetric] = React.useState("clientes");
    const isC = metric === "clientes";
    const data = T.map(v => ({ v, wk: weeklyOf(v), pv: weeklyPrev(v) }));
    const valOf = (d, wi, prev) => isC ? (prev ? d.pv.cur[wi] : d.wk.cur[wi]) : (prev ? d.pv.cur[wi] * d.v.ticket : d.wk.curM[wi]);
    const allVals = [];
    SEM_WEEKS.forEach((_, wi) => data.forEach(d => { allVals.push(valOf(d, wi, false), valOf(d, wi, true)); }));
    const maxBar = Math.max(...allVals, 1);
    const weekTotals = SEM_WEEKS.map((_, wi) => data.reduce((s, d) => s + valOf(d, wi, false), 0));
    const weekTotalsPrev = SEM_WEEKS.map((_, wi) => data.reduce((s, d) => s + valOf(d, wi, true), 0));
    const fmtCell = n => isC ? n : money(n);
    const t1 = window.useSort(data, "tot", d => d.wk.tot);
    const t2 = window.useSort(data, "totM", d => d.wk.totM);
    return (
      <div className="view">
        <SectionHead eb="Ritmo semanal" h3={`Cierres y ventas por semana — ${D.month} vs ${D.prevMonth}`}
          p={`Barra ancha = ${D.month} · barra delgada tenue al lado = ${D.prevMonth}. Comparativa semana a semana por vendedora.`}
          right={<div className="seg"><button className={isC ? "on" : ""} onClick={() => setMetric("clientes")}>Clientes</button><button className={!isC ? "on" : ""} onClick={() => setMetric("monto")}>Monto $</button></div>} />

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div className="eb">{isC ? "Compradores por semana y vendedora" : "Monto cerrado por semana y vendedora"}</div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {T.map((v, i) => <span key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".7rem", color: "var(--muted)" }}><span style={{ width: 10, height: 10, borderRadius: 3, background: v.color }} />{v.name.split(" ")[0]}</span>)}
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-end", height: 230, padding: "0 4px" }}>
            {SEM_WEEKS.map(([wk, rng], wi) => {
              const up = weekTotals[wi] >= weekTotalsPrev[wi];
              return (
                <div key={wi} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
                  <div className="num" style={{ fontSize: ".7rem", fontWeight: 800, color: "var(--text)" }}>{fmtCell(weekTotals[wi])} <span className={`delta ${up ? "up" : "down"}`} style={{ fontSize: ".58rem" }}>{up ? "▲" : "▼"}</span></div>
                  <div style={{ display: "flex", gap: 7, alignItems: "flex-end", height: 165, justifyContent: "center", width: "100%" }}>
                    {data.map((d, di) => {
                      const cur = valOf(d, wi, false), prev = valOf(d, wi, true);
                      return (
                        <div key={di} title={`${d.v.name.split(" ")[0]} · ${D.month}: ${fmtCell(cur)} / ${D.prevMonth}: ${fmtCell(prev)}`} style={{ display: "flex", alignItems: "flex-end", gap: 2, height: "100%" }}>
                          <div className="bar-grow" style={{ width: 11, height: `${cur / maxBar * 100}%`, background: d.v.color, borderRadius: "3px 3px 0 0", boxShadow: "var(--glow)", minHeight: 2 }} />
                          <div style={{ width: 6, height: `${prev / maxBar * 100}%`, background: d.v.color, opacity: .28, borderRadius: "3px 3px 0 0", minHeight: 2 }} title={`${D.prevMonth}: ${fmtCell(prev)}`} />
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: ".72rem", color: "var(--muted)", fontWeight: 700 }}>{wk}</div>
                  <div className="ww" style={{ fontSize: ".62rem" }}>{rng}</div>
                </div>
              );
            })}
          </div>
        </div>

        <SectionHead eb="Tabla 1 — Clientes cerrados" h3={`Compradores por semana — ${D.month} vs ${D.prevMonth}`} p="Número grande = mes actual · número pequeño = mes anterior." />
        <div className="card tight">
          <table className="tbl">
            <thead><tr><th>Vendedora</th>{SEM_WEEKS.map(([w], wi) => t1.thFor(w, "w" + wi, d => d.wk.cur[wi]))}{t1.thFor("Total", "tot", d => d.wk.tot)}</tr></thead>
            <tbody>{t1.sorted.map(({ v, wk, pv }, i) => (
              <tr key={i} className="clickable" onClick={() => window.__perfil(v)}>
                <td><div className="who"><Avatar v={v} size={30} ring /><span className="wn">{v.name}</span></div></td>
                {wk.cur.map((n, j) => <td key={j} className="r num">{n} <span className="ww" style={{ fontSize: ".66rem" }}>({pv.cur[j]})</span></td>)}
                <td className="r num" style={{ fontWeight: 800 }}>{wk.tot} <span className="ww" style={{ fontSize: ".66rem" }}>({pv.tot})</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>

        <SectionHead eb="Tabla 2 — Monto cerrado ($)" h3={`Monto Compradores por semana — ${D.month}`} />
        <div className="card tight">
          <table className="tbl">
            <thead><tr><th>Vendedora</th>{SEM_WEEKS.map(([w], wi) => t2.thFor(w, "w" + wi, d => d.wk.curM[wi]))}{t2.thFor("Total", "totM", d => d.wk.totM)}</tr></thead>
            <tbody>{t2.sorted.map(({ v, wk }, i) => (
              <tr key={i} className="clickable" onClick={() => window.__perfil(v)}>
                <td><div className="who"><Avatar v={v} size={30} ring /><span className="wn">{v.name}</span></div></td>
                {wk.curM.map((n, j) => <td key={j} className="r num">{money(n)}</td>)}
                <td className="r num" style={{ fontWeight: 800, color: "var(--green-ink)" }}>{money(wk.totM)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div className="note"><b>Cerrado {D.month}</b> = monto de deals en etapa Compradores (cierres × ticket promedio). El reparto semanal es una estimación; en producción <code>generar.py</code> lo calcula con las fechas de cierre reales de Kommo.</div>
      </div>
    );
  };

  /* ===== SUCURSALES ===== */
  window.ViewSucursales = function () {
    const branches = {};
    T.forEach(v => { const b = branches[v.suc] || (branches[v.suc] = { suc: v.suc, leads: 0, prevLeads: 0, cierres: 0, value: 0, agendado: 0, cerrado: 0, n: 0 }); b.leads += v.leads; b.prevLeads += (v.prevLeads || 0); b.cierres += v.cierres; b.value += v.value; b.agendado += (v.agendado || 0); b.cerrado += v.cierres * v.ticket; b.n++; });
    const list = Object.values(branches).sort((a, b) => b.value - a.value);
    const COL = { "Mia Plaza": "#00B5AD", "Buenos Aires": "#2E6FE0", "Central": "#D98300" };
    const { sorted, thFor } = window.useSort(list, "value", b => b.value);
    const mom = b => b.prevLeads ? Math.round((b.leads - b.prevLeads) / b.prevLeads * 100) : 0;
    return (
      <div className="view">
        <SectionHead eb="Comparativo" h3="Rendimiento por sucursal" p="Cada lead se atribuye a la sucursal de su vendedora. Roll-up por tienda con comparativo vs mes anterior." />
        <div className="grid3">
          {list.map((b, i) => {
            const m = mom(b);
            return (
              <div className="card clickable" key={i} style={{ borderTop: `3px solid ${COL[b.suc] || "#7A5AF0"}` }} onClick={() => window.__sucursal && window.__sucursal(b.suc)}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 34, height: 34, borderRadius: 9, display: "grid", placeItems: "center", background: `color-mix(in srgb, ${COL[b.suc] || "#7A5AF0"} 14%, transparent)`, color: COL[b.suc] || "#7A5AF0" }}><Icon name="sucursales" size={17} /></span><div style={{ flex: 1 }}><div style={{ fontWeight: 800, fontSize: ".98rem" }}>{b.suc}</div><div className="ww">{b.n} vendedora{b.n > 1 ? "s" : ""}</div></div><span className={`delta ${m >= 0 ? "up" : "down"}`}>{m >= 0 ? "▲" : "▼"} {m >= 0 ? "+" : ""}{m}%</span></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
                  <div><div className="num" style={{ fontSize: "1.5rem", fontWeight: 800 }}><CountUp value={b.leads} /></div><div className="kl">Leads <span className="ww">vs {b.prevLeads.toLocaleString("en-US")}</span></div></div>
                  <div><div className="num" style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--green)" }}><CountUp value={b.cierres} /></div><div className="kl">Cierres</div></div>
                  <div><div className="num" style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--brand-d)" }}><CountUp value={b.value} fmt={money} /></div><div className="kl">Pipeline</div></div>
                  <div><div className="num" style={{ fontSize: "1.5rem", fontWeight: 800, color: `var(--${convTone(b.cierres / b.leads * 100)})` }}>{(b.cierres / b.leads * 100).toFixed(1)}%</div><div className="kl">Conversión</div></div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="card">
          <SectionHead eb="Reparto" h3="Leads por sucursal" />
          <div style={{ marginTop: 16 }}><Donut unit="LEADS" data={list.map(b => ({ label: b.suc, value: b.leads, color: COL[b.suc] || "#7A5AF0" }))} /></div>
        </div>
        <div className="card">
          <SectionHead eb="Detalle" h3="Tabla por sucursal" p="Clic en cualquier columna para ordenar." />
          <table className="tbl" style={{ marginTop: 6 }}>
            <thead><tr>
              <th>Sucursal</th>
              {thFor("Vendedoras", "n", b => b.n)}
              {thFor("Leads", "leads", b => b.leads)}
              {thFor(`vs ${D.prevMonth}`, "mom", b => mom(b))}
              {thFor("Cierres", "cierres", b => b.cierres)}
              {thFor("Conv.", "conv", b => b.cierres / b.leads)}
              {thFor("Agendado", "agendado", b => b.agendado)}
              {thFor("Cerrado mes", "cerrado", b => b.cerrado)}
              {thFor("Pipeline", "value", b => b.value)}
            </tr></thead>
            <tbody>{sorted.map((b, i) => { const m = mom(b); return (<tr key={i} className="clickable" onClick={() => window.__sucursal && window.__sucursal(b.suc)}><td style={{ fontWeight: 700 }}><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 3, background: COL[b.suc] || "#7A5AF0", marginRight: 8 }} />{b.suc}</td><td className="r num">{b.n}</td><td className="r num">{b.leads.toLocaleString("en-US")}</td><td className="r"><span className={`delta ${m >= 0 ? "up" : "down"}`}>{m >= 0 ? "▲" : "▼"} {m >= 0 ? "+" : ""}{m}%</span></td><td className="r num" style={{ fontWeight: 800 }}>{b.cierres}</td><td className="r"><Pill tone={convTone(b.cierres / b.leads * 100)}>{(b.cierres / b.leads * 100).toFixed(1)}%</Pill></td><td className="r num" style={{ color: "#D98300", fontWeight: 700 }}>{b.agendado}</td><td className="r num" style={{ color: "var(--green-ink)", fontWeight: 700 }}>{money(b.cerrado)}</td><td className="r num">{money(b.value)}</td></tr>); })}</tbody>
          </table>
        </div>
      </div>
    );
  };

  /* ===== PROYECCIÓN ===== */
  window.ViewProyeccion = function () {
    const curDay = D.curDay, dim = D.daysInMonth, left = dim - curDay, progPct = Math.round(curDay / dim * 100);
    const conv = Math.round(G.cierres / G.leads * 100);
    const base = Math.round(G.cierres / curDay * dim);
    const conv1 = Math.round(G.leads * (conv + 1) / 100);
    const backlog = T.reduce((s, v) => s + (v.backlog || 0), 0);
    const extra = Math.round(backlog * conv / 100);
    const resc = base + extra;
    const paceDay = (G.cierres / curDay).toFixed(1);
    const scen = [
      { tag: "Escenario base", v: base, val: base * G.ticket, delta: Math.max(0, base - G.cierres), d: `Pace lineal. ${left} días restantes. Sin cambios en la operación actual.`, hot: false, pin: "" },
      { tag: `+1pp conversión (${conv + 1}%)`, v: conv1, val: conv1 * G.ticket, delta: Math.max(0, conv1 - G.cierres), d: "Si cada vendedora mejora 1pp su tasa de cierre con coaching.", hot: false, pin: "" },
      { tag: "Rescate sin seguimiento", v: resc, val: resc * G.ticket, delta: extra, d: `Base (~${base}) + rescate de ${backlog} deals sin seguimiento (+${extra} cierres adicionales).`, hot: true, pin: "Mayor palanca" },
    ];
    return (
      <div className="view">
        <SectionHead eb={`Proyección al cierre de ${D.month.toLowerCase()}`} h3="Tres escenarios — ¿a cuánto podemos llegar?" p={`Basada en la tasa de cierres por día y el ticket promedio actual (${money(G.ticket)}). La palanca de mayor impacto es rescatar el backlog.`} />

        <div className="card" style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div className="eb" style={{ marginBottom: 6 }}>Avance del mes</div>
            <div style={{ height: 8, background: "var(--line2)", borderRadius: 99, overflow: "hidden" }}><div style={{ height: "100%", width: progPct + "%", background: "var(--brand)", borderRadius: 99, boxShadow: "var(--glow)" }} /></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".68rem", color: "var(--faint)", fontWeight: 600, marginTop: 4 }}><span>Día {curDay}</span><span>{left} días restantes</span><span>Día {dim}</span></div>
          </div>
          <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
            <div><div className="eb">Cierres hoy</div><div className="num" style={{ fontSize: "1.4rem", fontWeight: 800 }}>{G.cierres}</div><div className="ww">{paceDay}/día promedio</div></div>
            <div><div className="eb">Proyección base</div><div className="num" style={{ fontSize: "1.4rem", fontWeight: 800 }}>~{base}</div><div className="ww" style={{ color: "var(--green)" }}>▲ buen ritmo</div></div>
            <div><div className="eb">Ticket promedio</div><div className="num" style={{ fontSize: "1.4rem", fontWeight: 800 }}>{money(G.ticket)}</div><div className="ww">valor / cierre</div></div>
          </div>
        </div>

        <div className="grid3">
          {scen.map((s, i) => (
            <div className="card" key={i} style={{ borderTop: `3px solid ${s.hot ? "var(--green)" : "var(--line)"}`, padding: "20px", position: "relative", boxShadow: s.hot ? "0 0 0 1px var(--green), var(--sh)" : "var(--sh)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6, marginBottom: 8 }}>
                <div className="eb" style={{ color: s.hot ? "var(--green-ink)" : "var(--faint)" }}>{s.tag}</div>
                {s.pin && <span className="pill green" style={{ fontSize: ".58rem" }}>{s.pin}</span>}
              </div>
              <div className="num" style={{ fontSize: "2.2rem", fontWeight: 800 }}>{s.v} <span style={{ fontSize: ".9rem", color: "var(--muted)", fontWeight: 700 }}>cierres</span></div>
              <div className="num" style={{ fontSize: "1rem", fontWeight: 700, color: "var(--brand-d)", marginTop: 2 }}>~{money(s.val)}</div>
              <div style={{ marginTop: 7, fontSize: ".7rem", fontWeight: 700, color: "var(--green-ink)", background: "var(--green-bg)", display: "inline-block", padding: "2px 9px", borderRadius: 6 }}>+{s.delta} vs hoy ({G.cierres})</div>
              <div style={{ marginTop: 8, fontSize: ".76rem", color: "var(--muted)", lineHeight: 1.5 }}>{s.d}</div>
            </div>
          ))}
        </div>

        <SectionHead eb="Plan" h3="Matriz de acción" />
        <div className="grid2">
          <div className="card">
            <div className="eb" style={{ color: "var(--green-ink)", marginBottom: 10 }}>✅ Esta semana — meta +10 cierres</div>
            <ol style={{ paddingLeft: 18, fontSize: ".86rem", lineHeight: 1.9, color: "var(--text)" }}>
              <li>Llamar al <b>top 50</b> de cotizaciones por valor.</li>
              <li>Acompañar visitas de vendedoras en estado <b>crítico</b>.</li>
              <li>Documentar el playbook de <b>{window.TOP_CLOSER.split(" ")[0]}</b> para replicarlo.</li>
            </ol>
          </div>
          <div className="card">
            <div className="eb" style={{ color: "var(--blue)", marginBottom: 10 }}>📅 Este mes</div>
            <ol style={{ paddingLeft: 18, fontSize: ".86rem", lineHeight: 1.9, color: "var(--text)" }}>
              <li>Activar los <b>{Math.round(backlog * 0.73)}</b> leads con +7 días sin contacto.</li>
              <li>Revisar el pipeline <b>"No responden"</b> ({D.metrics.noResp.toLocaleString("en-US")} leads).</li>
              <li>Etiquetar sucursal en leads sin clasificar.</li>
            </ol>
          </div>
        </div>
      </div>
    );
  };

  /* ===== DATOS ===== */
  window.ViewDatos = function () {
    return (
      <div className="view">
        <SectionHead eb="Calidad de datos" h3="Salud del CRM" p="Estos huecos impiden medir y priorizar bien. Limpiarlos es trabajo de gerencia + equipo." />
        <div className="kpis">
          <Kpi l="Fichas sin sucursal" num={D.metrics.sinSucursalPct} fmt={n => Math.round(n) + "%"} ac="#DC4046" ico="datos" sub={`${D.metrics.sinSucursalFichas.toLocaleString("en-US")} fichas · comparativo por tienda parcial`} />
          <Kpi l="Abiertos sin valor" v="~100%" ac="#DC4046" ico="datos" sub={`${D.metrics.abiertosSinValor.toLocaleString("en-US")} deals · no se puede priorizar por monto`} />
          <Kpi l="Teléfonos duplicados" num={D.metrics.duplicadosTel} ac="#7A5AF0" ico="datos" sub={`${D.metrics.duplicadosFichas} fichas en 2+ registros`} />
          <Kpi l="Nunca tocados" num={D.metrics.nuncaTocados} ac="#D98300" ico="datos" sub="el bot los movió, sin acción humana" />
        </div>
        <div className="insight amber"><span className="ic"><Icon name="alertas" size={17} sw={2.2} /></span><div><div className="t">Prioridad de limpieza: etiquetar sucursal</div><div className="d">Con sucursal vacía en el <b>{D.metrics.sinSucursalPct}%</b> de las fichas ({D.metrics.sinSucursalFichas.toLocaleString("en-US")}), el comparativo por tienda es parcial. Una campaña de etiquetado desbloquea el análisis por sucursal.</div></div></div>
        <div className="card">
          <SectionHead eb="Duplicados" h3={`${D.metrics.duplicadosTel} teléfonos en 2+ fichas`} p="Mismo cliente registrado por varias vendedoras o en varias etapas. Fusionar evita doble trabajo y disputas de comisión." />
          <table className="tbl" style={{ marginTop: 6 }}>
            <thead><tr><th>Teléfono</th><th className="r">Fichas</th><th>Vendedoras involucradas</th><th>Etapas</th><th className="r">Estado</th></tr></thead>
            <tbody>
              {(D.dups || []).slice(0, 20).map((g, i) => (
                <tr key={i}>
                  <td className="num">{g.phone || "—"}</td>
                  <td className="r num">{g.n}</td>
                  <td className="ww">{(g.vends || []).map(v => v.split(" ")[0]).join(" · ")}</td>
                  <td className="ww">{(g.etapas || []).join(" · ")}</td>
                  <td className="r"><Pill tone={g.n >= 3 ? "red" : "amber"}>{g.n >= 3 ? "Revisar" : "Fusionar"}</Pill></td>
                </tr>
              ))}
              {(!D.dups || D.dups.length === 0) && <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--faint)", padding: "18px 0" }}>Sin duplicados detectados</td></tr>}
            </tbody>
          </table>
          <div className="note" style={{ marginTop: 12 }}>Mostrando {Math.min((D.dups || []).length, 20)} de {D.metrics.duplicadosFichas} fichas duplicadas (hasta 40 en datos).</div>
        </div>
      </div>
    );
  };
})();
