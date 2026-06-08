# Conectar los botones ✓/🕐 del panel con Kommo (Cloudflare Worker)

Esto hace que, al tocar **✓** o **🕐** en *Seguimiento*, se cree una **tarea real en Kommo**
asignada a la vendedora responsable del lead (le aparece como pendiente/notificación).

El token de Kommo queda guardado **dentro del Worker** (lado servidor), nunca en la página
pública. El panel solo llama a la URL del Worker.

---

## Parte 1 — Crear el Worker en Cloudflare (gratis, ~5 min, funciona en iPad)

1. Entra a **https://dash.cloudflare.com** y crea una cuenta gratis (o inicia sesión).
2. En el menú izquierdo: **Workers & Pages** → botón **Create application** → **Create Worker**.
3. Te pone un nombre tipo `heaven-kommo` (puedes cambiarlo). Pulsa **Deploy**.
4. Pulsa **Edit code** (o **Quick edit**). Verás un editor con un código de ejemplo.
5. **Borra todo** lo que haya y **pega** el contenido del archivo `cloudflare-worker.js`
   (el que te entregué). Pulsa **Deploy / Save and Deploy**.

## Parte 2 — Guardar el token de Kommo en el Worker (secreto)

6. En tu Worker, ve a la pestaña **Settings** → **Variables and Secrets**.
7. Agrega DOS variables:
   - **KOMMO_TOKEN** → tipo **Secret** → pega el token largo de Kommo (el mismo que pusiste
     en GitHub como secreto). *Encrypt / Secret.*
   - **KOMMO_SUBDOMAIN** → tipo **Text** → escribe: `eanez`
8. Pulsa **Deploy** otra vez para que tome las variables.

## Parte 3 — Probar que está vivo

9. Copia la **URL** de tu Worker (algo como `https://heaven-kommo.TU-CUENTA.workers.dev`).
10. Ábrela en el navegador. Debe responder:
    `{"ok":true,"service":"heaven-kommo-bridge","up":true}`
    Si ves eso, está funcionando.

## Parte 4 — Conectarlo al panel

Tienes dos opciones (elige una):

**Opción A — me pasas la URL** y yo la dejo fija en el panel (lo más simple).

**Opción B — secreto en GitHub** (si prefieres manejarlo tú):
   - En tu repo MULTIESPUMAS → **Settings → Secrets and variables → Actions → New secret**.
   - Nombre: `PANEL_WORKER_URL`  ·  Valor: la URL de tu Worker.
   - El panel ya está preparado para leer ese secreto; en la próxima actualización los
     botones quedan conectados.

---

## ¿Qué hace cada botón?

- **✓ (atender)** → crea una tarea *"contactar al cliente hoy"* para la vendedora, con
  vencimiento **hoy** a las 18:00.
- **🕐 (posponer)** → crea una tarea *"reprogramar seguimiento"* con vencimiento **+3 días**.

En ambos casos: el panel muestra un aviso ("✓ Tarea creada en Kommo") y la tarea aparece
en Kommo asignada a la vendedora dueña del lead.

## Seguridad

- El token vive en el Worker, no en la página. ✔
- El Worker solo acepta llamadas desde tu dominio del panel (`github.io`). ✔
- Riesgo residual: como el panel es público, alguien que lo abra podría, en teoría, pedir
  crear tareas. El daño máximo sería "tareas de más" en Kommo (no fuga de datos). Si te
  preocupa, en Cloudflare puedes activar **Rate Limiting** gratis para limitar llamadas.

> Nota aparte que sigue pendiente: **revoca el token de GitHub** que me diste para los despliegues.
