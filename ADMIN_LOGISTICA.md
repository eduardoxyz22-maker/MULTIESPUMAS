# Resumen logístico de Administración

La escena vive exclusivamente dentro de #adm-resumen en pedidos.html. Conserva
toggleResumenAdm(), su preferencia local, el contador al plegar y todos los avisos y
botones exteriores. Los consolidados previos siguen disponibles en «Ver cifras y
consolidados del resumen». No modifica Lista de carga ni el backend.

Datos: admin-logistica.js lee admFilter(), vehiculoDe(), STOCK.c y STOCK.g, usando
los normalizadores de almacenes existentes. Los camiones son las asignaciones del
filtro, incluidos vehículos históricos. Los depósitos muestran fecha y referencias
del corte; no se presentan como stock disponible. Las fichas usan showPedidoModal()
y abrirStock(). No se crean rutas, capacidades, GPS, salidas o movimientos de stock.

Render: admin-logistica-scene.mjs carga Three.js local solo cuando el resumen está
visible en Administración. Usa render bajo demanda, DPR limitado, geometría estática
instanciada y alternativa accesible si no carga WebGL. Ocultar, salir, cambiar de
pestaña o sacar la escena de pantalla libera renderer/contexto, RAF, observador,
controles, geometrías, materiales y texturas. La escena limita a ocho vehículos
simultáneos; todos están en el selector y seleccionar uno fuera del grupo lo incorpora.

La versión visual 2 fue aprobada el 08/10/2026. Es una escena procedural interactiva,
no una reproducción fotográfica del concepto. La disposición es ilustrativa.

## Pruebas

Desde la raíz:
- node tests/test_admin_logistica.cjs — 44 comprobaciones de navegador real por HTTP,
  sin acceso externo: carga diferida, clic 3D, detalles y cierre, stock intacto,
  cinco montajes/desmontajes, navegación, recursos, móvil, errores y vacíos.
- node tests/test_resumen.js — 29 comprobaciones de los interruptores y consolidados.
- node tests/test_auditoria.js — 176 comprobaciones de las vistas y acciones del panel.

La primera acepta CHROME_PATH y NODE_PATH; LOGISTICA_CAPTURAS cambia la carpeta de
capturas (por defecto, temporal). Las otras conservan el arnés Linux del repositorio;
en Windows se ejecutaron con un preload local que remapea Playwright/Chrome y bloquea
red externa, sin modificar los contratos de sus pruebas. Se comprobó sintaxis de
todos los scripts inline y de los nuevos módulos.

## Publicación, pendiente de autorización

1. Revisar el diff y actualizar esta rama con main vigente preservando cambios ajenos.
2. Confirmar únicamente pedidos.html, admin-logistica.*, vendor/logistica-three/,
   las dos pruebas y este documento. Excluir Panel.html/panel.html: colisionan por
   mayúsculas en Windows y no forman parte de este cambio.
3. Con autorización de publicación, usar el flujo normal de revisión y publicación
   del repositorio; no hace falta implementar una nueva versión de Apps Script.
4. Verificar en el sitio publicado que los archivos JS/MJS/CSS locales responden,
   hacer recarga completa y comprobar resumen, selección, plegado y móvil.
5. Para revertir esta integración, revertir solo su commit, conservando otros cambios.

Three.js 0.186.1 y OrbitControls provienen del ZIP verificado de referencia. Se
conserva su licencia MIT; OrbitControls usa un import relativo al vendor local.
