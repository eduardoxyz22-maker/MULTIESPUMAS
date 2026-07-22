# Conectar el formulario de pedidos a Google Sheets

Esto hace que **todos los vendedores carguen desde su celular** y que **todos los pedidos caigan en una sola planilla compartida** que vos ves en el panel de Administración.

Es gratis, no necesita servidor ni instalar nada. Toma ~5 minutos. Hacelo **una sola vez**.

---

## Paso 1 — Crear la planilla
1. Andá a **https://sheets.google.com** → botón **＋ (Planilla en blanco)**.
2. Ponele nombre arriba, por ejemplo **`PEDIDOS MultiEspumas`**.

## Paso 2 — Abrir el editor de código
1. En la planilla: menú **Extensiones → Apps Script**.
2. Se abre una pestaña nueva con un editor. Borrá todo lo que aparezca (el `function myFunction(){}`).

## Paso 3 — Pegar el código
1. Abrí el archivo **`google-apps-script.gs`** (está en esta misma carpeta / repo).
2. Copiá **todo** su contenido y pegalo en el editor de Apps Script.
3. Guardá con el ícono 💾 (o `Ctrl+S`).

## Paso 4 — Publicar como aplicación web
1. Arriba a la derecha: **Deploy (Implementar) → New deployment (Nueva implementación)**.
2. En **⚙️ (Select type)** elegí **Web app (Aplicación web)**.
3. Completá:
   - **Description:** `pedidos v1` (cualquier cosa)
   - **Execute as (Ejecutar como):** **Me / Yo (tu correo)**
   - **Who has access (Quién tiene acceso):** **Anyone (Cualquier persona)**  ← importante
4. **Deploy**.
5. Google te va a pedir **autorizar**: elegí tu cuenta → *"Google no verificó esta app"* → **Configuración avanzada → Ir a (nombre) (no seguro) → Permitir**. (Es tu propio código, es seguro.)
6. Te muestra una **Web app URL** que termina en **`/exec`**. **Copiala.**

Ejemplo: `https://script.google.com/macros/s/AKfy...largo.../exec`

## Paso 5 — Pasarme la URL
Pegámela en el chat y yo la meto en `pedidos.html` y publico el enlace.
(O si querés hacerlo vos: en `pedidos.html`, línea `var SHEETS_URL = '';` → poné tu URL entre las comillas.)

---

## Listo ✅
- El enlace del formulario lo comparten los vendedores; cada pedido que envían aparece en la planilla y en tu panel **Administración** (contraseña `heaven2026`, cambiable).
- Si un celular se queda sin señal, el pedido se guarda y **se envía solo** cuando vuelve internet.
- Podés abrir la planilla de Google directo para ver todo, y desde el panel bajar **Excel** o **respaldo**.

## Notas
- **Cambiar el código después:** si editás el `.gs`, tenés que **Deploy → Manage deployments → ✏️ → Version: New version → Deploy** para que tome los cambios (la URL sigue igual).
- **Privacidad:** cualquiera que tenga la URL `/exec` puede mandar o leer pedidos. Es un enlace secreto (no está indexado), suficiente para uso interno. Si más adelante querés candado real (token/login), se puede agregar.
- **Seguridad de datos:** Google guarda historial de versiones de la planilla (Archivo → Historial), así que un borrado por error se puede recuperar.
