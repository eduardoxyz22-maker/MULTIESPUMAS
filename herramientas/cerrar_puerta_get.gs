/* ============================================================================
 * 🚪 CERRAR LA PUERTA GET DEL SERVIDOR — archivo APARTE (22/11/2026, mejora 451)
 * Pedido del dueño (22/11): «451» — cerrar la puerta por donde leen de afuera.
 *
 * Qué es: el servidor del panel contesta también a un GET (abrir la dirección /exec en un navegador) con la planilla
 * entera. NADA del panel ni de las herramientas del repositorio lee por GET (el panel, el respaldo de Kommo, la revisión de
 * correos y el dashboard usan POST), y el 10/09 se vio a alguien de afuera leyendo por ahí cada 3-4 segundos (§4dv). Con la
 * propiedad GET_CERRADO = 1 el servidor contesta {error:'get_cerrado'} sin leer la hoja. Lo único que sigue entrando por GET es
 * la verificación del webhook del bot de WhatsApp (Meta), que el servidor atiende ANTES de mirar la puerta.
 *
 * Por qué un archivo aparte: la pantalla de Propiedades del script del dueño tiene más de 50 propiedades y queda de solo
 * lectura (no deja agregar una). Desde una función sí se puede.
 *
 * ⚠️ VA EN UN ARCHIVO NUEVO DEL PROYECTO (➕ al lado de «Archivos» → Secuencia de comandos, nombre «cerrar_puerta_get»),
 * NUNCA adentro de Código.gs. Se corre desde el EDITOR (la lista de al lado de ▶ Ejecutar):
 *   ▶ cerrarPuertaGetUnaVez  — pone GET_CERRADO = 1. No hace falta volver a implementar: vale desde la próxima lectura.
 *   ▶ abrirPuertaGetUnaVez   — la saca (vuelve como estaba).
 *   ▶ verPuertaGetUnaVez     — solo dice cómo está, no cambia nada.
 * Después se puede dejar el archivo (no corre solo) o borrarlo: la propiedad queda puesta.
 *
 * ⚠️ Todos los archivos del proyecto comparten los nombres: acá solo hay funciones que terminan en «UnaVez» y dicen
 * «PuertaGet», que NO existen en Código.gs. Uno repetido pisaría al de Código.gs.
 * ========================================================================== */
function cerrarPuertaGetUnaVez() {
  PropertiesService.getScriptProperties().setProperty('GET_CERRADO', '1');
  var t = '✅ La puerta GET quedó CERRADA (GET_CERRADO = 1): abrir la dirección del servidor en un navegador ya no muestra la planilla. ' +
          'El panel sigue igual (usa POST). Para volver atrás: ▶ abrirPuertaGetUnaVez.';
  Logger.log(t);
  return t;
}
function abrirPuertaGetUnaVez() {
  PropertiesService.getScriptProperties().deleteProperty('GET_CERRADO');
  var t = '↩️ La puerta GET quedó ABIERTA otra vez (sin GET_CERRADO), como antes.';
  Logger.log(t);
  return t;
}
function verPuertaGetUnaVez() {
  var v = String(PropertiesService.getScriptProperties().getProperty('GET_CERRADO') || '').trim().toLowerCase();
  var cerrada = !!v && v !== '0' && v !== 'no';
  var t = cerrada ? '🚪 La puerta GET está CERRADA (GET_CERRADO = ' + v + ').' : '🚪 La puerta GET está ABIERTA (no hay GET_CERRADO).';
  Logger.log(t);
  return t;
}
