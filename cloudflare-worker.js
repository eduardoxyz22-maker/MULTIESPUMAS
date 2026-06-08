/* ============================================================================
 * Heaven · Puente Panel → Kommo  (Cloudflare Worker)
 *
 * Crea una TAREA real en Kommo asignada a la vendedora responsable del lead,
 * cuando en el panel se toca ✓ (atender) o 🕐 (posponer).
 *
 * El TOKEN de Kommo vive AQUÍ (como secreto del Worker), nunca en la página
 * pública. El panel solo llama a esta URL; el Worker habla con Kommo.
 *
 * ── Variables/Secretos que debes configurar en el Worker (Settings → Variables):
 *      KOMMO_TOKEN       (Secret)  = el token largo de Kommo (el mismo del panel)
 *      KOMMO_SUBDOMAIN   (Text)    = eanez
 *
 * ── Ajusta tu dominio permitido aquí abajo si cambia:
 * ========================================================================== */
const ALLOWED_ORIGIN = "https://eduardoxyz22-maker.github.io";

export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    };

    // Preflight CORS
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    // Chequeo de salud rápido (abrir la URL en el navegador)
    if (request.method === "GET") {
      return json({ ok: true, service: "heaven-kommo-bridge", up: true }, 200, cors);
    }
    if (request.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405, cors);

    // Solo aceptar llamadas desde el panel (mitiga abuso desde otros sitios)
    const origin = request.headers.get("Origin") || "";
    if (origin && origin !== ALLOWED_ORIGIN) {
      return json({ ok: false, error: "forbidden_origin" }, 403, cors);
    }

    let body;
    try { body = await request.json(); } catch { return json({ ok: false, error: "bad_json" }, 400, cors); }

    const action = body.action;                                   // "done" | "snooze"
    const leadId = parseInt(body.leadId, 10);
    const days = Math.min(30, Math.max(1, parseInt(body.days || (action === "snooze" ? 3 : 1), 10)));
    if (!leadId || !["done", "snooze"].includes(action)) {
      return json({ ok: false, error: "bad_params" }, 400, cors);
    }

    const sub = (env.KOMMO_SUBDOMAIN || "eanez").trim();
    const token = env.KOMMO_TOKEN;
    if (!token) return json({ ok: false, error: "missing_token" }, 500, cors);

    const base = `https://${sub}.kommo.com/api/v4`;
    const headers = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };

    // 1) Buscar la vendedora responsable del lead
    let uid = null;
    try {
      const r = await fetch(`${base}/leads/${leadId}`, { headers });
      if (r.ok) { const d = await r.json(); uid = d.responsible_user_id || null; }
    } catch (e) { /* si falla, la tarea queda sin responsable explícito */ }

    // 2) Fecha límite (hoy para ✓, +N días para 🕐) a las 18:00 hora Bolivia (UTC-4)
    const now = new Date();
    const due = new Date(now.getTime() + days * 86400000);
    due.setUTCHours(22, 0, 0, 0);                                  // 22:00 UTC = 18:00 Bolivia
    const completeTill = Math.floor(due.getTime() / 1000);

    const text = action === "done"
      ? "✅ Seguimiento solicitado desde el panel — contactar al cliente hoy."
      : `🕐 Reprogramar seguimiento (+${days} días) — solicitado desde el panel.`;

    const task = [{
      text,
      complete_till: completeTill,
      entity_id: leadId,
      entity_type: "leads",
      ...(uid ? { responsible_user_id: uid } : {}),
    }];

    // 3) Crear la tarea en Kommo
    try {
      const r = await fetch(`${base}/tasks`, { method: "POST", headers, body: JSON.stringify(task) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return json({ ok: false, error: "kommo_error", status: r.status, detail: d }, 502, cors);
      const created = d?._embedded?.tasks?.[0]?.id || null;
      return json({ ok: true, taskId: created, leadId, responsibleUserId: uid }, 200, cors);
    } catch (e) {
      return json({ ok: false, error: "fetch_failed", detail: String(e) }, 502, cors);
    }
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...cors } });
}
