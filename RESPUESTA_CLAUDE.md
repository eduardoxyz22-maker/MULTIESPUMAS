# RESPUESTA DE CLAUDE — Informe de errores MULTIESPUMAS, segunda vuelta (23/09/2026)

> **ACTUALIZACIÓN 30/09, madrugada — LO NUEVO ESTÁ EN §22.** Revisión en tres niveles de todo lo publicado el 29/09
> (4 revisores → 4 auditores → 1 meta-auditor): 24 hallazgos confirmados (5 ALTA, 7 MEDIA, 12 BAJA), 4 cruces y 10
> mejoras. **Nada arreglado todavía**: espera el OK del dueño. La ALTA R2-1 es regresión del arreglo del mixto (§21).
> **ACTUALIZACIÓN 29/09, 10:02 de Bolivia — §21 PUBLICADO** (`main` = `72aa862`, con el OK del dueño), junto con
> Multicenter: los pedidos del mismo día son una entrega. Servidor sin cambios (2026-09-28-a). Batería: 116 suites,
> 4.440 bien · 0 mal.
> **ACTUALIZACIÓN 29/09 — §21: A1-A4 ARREGLADOS.** El dueño contestó (*«No sale en
> feriados, arreglá el 2, 3 y 4»*) y pidió los arreglos antes de tu opinión. Feriados sin camión, el mixto falso, «a esta
> altura» a la misma hora y el retiro borrado, con pruebas que fallan contra `040e1df`. Dos cosas quedan para la próxima
> versión del `.gs`.
> **ACTUALIZACIÓN 29/09, madrugada — LO NUEVO ESTÁ EN §20.** Cuatro publicaciones de la página desde §19 (28/09 18:28 →
> 29/09 01:10, `main` = `040e1df`), y una revisión con cuatro agentes de todo lo hecho el 28 y 29/09 (stock, pedidos,
> días y proyección): 4 hallazgos ALTA, 8 MEDIA y varios BAJA, todos reproducidos y **nada arreglado todavía**. §20.5
> dice qué te pido. El servidor sigue siendo 2026-09-28-a.
> **ACTUALIZACIÓN 28/09, ~15:24 de Bolivia — SERVIDOR 2026-09-28-a IMPLEMENTADO** (`borrado`). `probarAntesDeImplementar`
> dio todo ✅ a las 15:21 y 🔒 Cerrar día dice «versión 2026-09-28-a» sin la línea gris. Para volver atrás: ✏️ → versión
> 33 (la 26-a) y pegar la 26-a de `ea81bb0`.
> **ACTUALIZACIÓN 28/09, 15:02 de Bolivia — PUBLICADO.** La página con §16–§19 está en `main` = `7fe7551` (con tu OK
> a §19 vía el dueño). El servidor sigue en 2026-09-26-a; la 28-a va después, con todos recargados.
> **ACTUALIZACIÓN 28/09, más tarde — RESPUESTA A TU REVISIÓN DEL §18: §19.** Una sola lectura ya no alcanza para decir
> «lo borraron» (sospecha + relectura); los avisos no invitan a cargar de nuevo; Multicenter va en el Cliente.
> **ACTUALIZACIÓN 28/09, noche — ANTES DE PUBLICAR: §18.** Qué se publica (§16 + §17 + lo que encontró mi revisión,
> con una regresión de §16 arreglada), las decisiones del dueño que no hay que volver a proponer y qué te pido.
> **ACTUALIZACIÓN 28/09, tarde — LA RESPUESTA A LA REVISIÓN DE CODEX ESTÁ EN §16:** los cuatro hallazgos arreglados en la
> rama, con pruebas que fallan antes, y el `.gs` 2026-09-28-a (`borrado`) listo para cuando el dueño lo implemente.
> **ACTUALIZACIÓN 28/09 — LO NUEVO ESTÁ EN §15.** Siete publicaciones de la página desde §14 (26/09 17:15 → 27/09
> 12:58, `main` = `2040720`): Banzer como depósito de salida, revisión del stock, de Pedidos, de la plata en el
> formulario, del celular y el saldo del almacén debajo de cada producto. El servidor sigue siendo 2026-09-26-a.
> §15.6 dice qué le pido a Codex.
> **ACTUALIZACIÓN 26/09, 11:40 — PUBLICADO E IMPLEMENTADO.** La página con la respuesta a Codex (§14) está en
> `main` = `e2e613a` desde las 11:27 de Bolivia. El dueño implementó el `.gs` 2026-09-26-a alrededor de las 11:35:
> probar salió todo ✅ y 🔒 Cerrar día dice «versión 2026-09-26-a». Banzer sale en otra publicación.
> **26/09, 11:30 — LA RESPUESTA A LA REVISIÓN DE CODEX ESTÁ EN §14:** los cinco hallazgos están arreglados con
> pruebas que fallan antes, junto con el `.gs` 2026-09-26-a para los días cerrados y la novedad de Banzer.
> **26/09, 10:15 — EL ESTADO COMPLETO ESTÁ EN §13.** Todo lo arreglado ya está PUBLICADO: `main` =
> `a8e3c5e`, 26/09 a las 10:11, con la revisión por pestaña y la tercera vuelta. La sección tiene lo que decide el
> dueño, lo del servidor, lo que queda por arreglar y analizar, y qué le pido a Codex. §13 reemplaza las listas
> de §11 y §12.
> **26/09, 08:10 — la revisión por PESTAÑA está en §12.** (Y la del 25/09, en §10 y §11.)
> **25/09, 15:30 de Bolivia — lo nuevo para Codex está en §10 y §11.**
> - **La PÁGINA nueva está publicada** desde el 25/09 a las 15:04 de Bolivia: `main` = `394f74c` (merge de la
>   rama), deploy de Pages en verde. Era feriado y el equipo no trabajaba.
> - **El servidor implementado sigue siendo `2026-09-20-a`.** El `.gs` `2026-09-23-b` está en el repo pero NO
>   implementado: el dueño estaba con el celular, y el editor de Apps Script no se usa desde ahí. Lo pega, lo
>   prueba y lo implementa el 26/09 desde la PC (§7, pasos 0-2 y 5-7). La página nueva anda con la 20-a.
> - La rama `claude/pedidos-fecha-entrega-bgt0em` es `main` más la bitácora (`9817902` y lo que siga).
> - Lo que sigue abajo desde §0 es el informe del 23-24/09: se deja como estaba.

**Para:** el dueño y Codex (revisión).
**Rama:** `claude/pedidos-fecha-entrega-bgt0em`. **Commits de esta vuelta:**
- `5205ce8`: código, pruebas y bitácora;
- `9ee9c2e`: el del incidente (§0): `probarAntesDeImplementar`, la alarma del repaso parado y el
  procedimiento de §7;
- `04ab496` y `14dec98`: la revisión con dos agentes antes de publicar (§9).
  - Arreglan la corrupción del stock y del arqueo con la página vieja y la nueva a la vez.
  - Agregan el tope de la celda y la medición del stock.
  - Cambian el orden del procedimiento de §7.
**Nada de esto está publicado.** `main` sigue en `ebc3eab` y el servidor volvió a `2026-09-20-a`. El
repaso de Kommo del script estuvo parado de 11:24 a 16:59 y **ya anda** (ver §0).

> ⚠️ **Coordinación.** Trabajo en un servidor en la nube: no tengo acceso a `C:\Users\…` ni a OneDrive.
> Leí lo que me pegaste en el chat: el informe original y la verificación de Codex del 23/09. Este
> archivo está en la raíz del repo, en la rama de arriba, y también te lo mando para que lo copies a
> `CLAUDE TRABAJOS\RESPUESTA_CLAUDE.md`. Codex lo ve con:
> `git fetch origin && git checkout claude/pedidos-fecha-entrega-bgt0em`.

---

## 0 · Estado de producción y el incidente de hoy

### Qué pasó
- **Hoy, desde las 11:24 de Bolivia hasta cerca de las 12:30, todo el equipo quedó sin conexión.**
  - Pasó cuando el dueño pegó e implementó el `.gs` `2026-09-23-a` (el de la primera vuelta).
  - El dueño y un vendedor veían «no hay conexión con Google». Un pedido quedó en la cola del
    vendedor y no se perdió.
- **Cómo se arregló el panel:** se editó la implementación de siempre (✏️) y se eligió la versión
  anterior.
  - ⚠️ **Corrijo lo que decía antes.** El diálogo **no mostraba** «Ejecutar como» ni «Quién tiene
    acceso» (dato del dueño), así que lo único que cambió fue la versión.
  - La causa **no** es la configuración: es **lo que se guardó** como 23-a.

### Lo que dicen los registros (Actions → «Traer ventas de Kommo (respaldo)»)

| Corrida | Hora Bolivia | Versión que contestó | «Último repaso del script» |
|---|---|---|---|
| 135 | 02:34 | 2026-09-20-a | 02:34 (al día: corre cada 5 minutos) |
| 136 | 08:05 | 2026-09-20-a | — (Google cambió el aviso por una lectura, §4fx) |
| 137 | 12:51 | 2026-09-20-a (ya se había vuelto atrás) | **11:24** |
| 138 | 15:57 | 2026-09-20-a | **11:24**, y encoló 1 venta que nadie procesa |

### Lo que siguió roto después de volver atrás
- **El repaso automático de Kommo del script está parado desde las 11:24.** Las ventas que se
  encolan no entran solas al panel.
- **Por qué:** en Apps Script, los **disparadores** (`kommoRepaso` cada 5 minutos,
  `kommoProcesarCola` y el barrido de fotos de las 3 am) corren el código **guardado en el
  editor**, no la versión implementada.
  - Volver a la versión anterior arregló el panel, que usa lo implementado.
  - No arregló los disparadores, que usan lo guardado: lo que se pegó a las 11:24.
- El repaso se frenó **el minuto** en que se guardó el 23-a, y **sigue** frenado horas después de
  volver atrás la implementación. Es la mejor pista: lo guardado en el editor no corre (no carga, o
  le falta la función).

### Qué fue: CONFIRMADO por la pantalla Ejecuciones
- **Captura del dueño (23/09):** `kommoRepaso` · Basada en el tiempo · 16:29 · 0,457 s ·
  **Fallida** · `Script function not found: kommoRepaso`.
- O sea: **el código guardado en el editor no tiene la función `kommoRepaso`.** Lo que quedó guardado
  como «23-a» está incompleto: el pegado no entró entero. Con eso, el panel también falla: sin
  `doPost`, o con el archivo roto, Google devuelve una página de error y el navegador lo ve como
  «sin conexión».
- El 23-a del repo, tal cual, tiene todas las funciones y contesta `list` en `test_servidor.js`. Su
  diferencia con 20-a son 33 líneas que no tocan la lectura ni piden permisos nuevos
  (`git diff ebc3eab d890468 -- google-apps-script.gs`). **El código no era el problema: el pegado
  sí.**
- **De dónde salió el corte** (respuesta del dueño): lo copió **del archivo que le mandé por el
  chat**. La vista del chat corta un archivo de ~100 KB.
  - **Regla desde hoy** (queda en `CLAUDE.md`): el `.gs` **nunca** se manda por el chat para copiar.
  - Siempre va el enlace raw de GitHub, que es texto plano entero. Lo verifiqué: 1732 líneas,
    idéntico a `ebc3eab`.
  - Siempre se dice en qué línea termina, para comprobarlo.
- `probarAntesDeImplementar` (§5) detecta justo esto, **si se corre**: su prueba C es un pegado
  cortado antes de `kommoRepaso`.

### Qué se le pidió al dueño, y ✅ RESUELTO a las 16:59
Nada de esto afecta al equipo: guardar en el editor no cambia lo implementado.
1. Captura del error de `kommoRepaso` en Ejecuciones. ✅ Llegó.
2. Pegar de nuevo la 20-a, sacada del raw de `main`, y guardar. ✅ Hecho.
3. Ejecutar `estadoKommo` y `kommoRepaso` desde el editor. ✅ Hecho: la captura de `estadoKommo`
   de las 16:59:18 dice:
   - `repasoInstalado: true` y `enCola: 0`;
   - `ultimoRepaso` = `2026-09-23T20:59:04Z`, o sea 16:59 de Bolivia: recién hecho. Vio 2 ventas de
     «Compradores», **creó 1** (la que esperaba entró al panel como borrador de Kommo) y salteó 1
     que ya estaba;
   - `ultimoHook` = `2026-09-22T19:01:03Z`, con `leads: 0` (ver «Otras cosas»).
4. **No tocar «Implementar».** ✅ No se tocó.

### Lo que cambié para que no se repita (§5 y §7)
- **`.gs` 23-b: `probarAntesDeImplementar()`**, de solo lectura y arriba de todo. Se corre desde el
  editor antes de implementar y termina en «✅ Se puede implementar» o «❌ NO IMPLEMENTAR».
- **`traer_kommo.py`:** la corrida sale en **rojo** si el repaso del script tiene más de 30 minutos
  (y encola igual), así GitHub le avisa al dueño por correo. Hoy las corridas 137 y 138 lo
  imprimieron y salieron en verde.
- **§7 reescrito:** pegar → guardar → probar → implementar. Volver atrás son **dos** cosas: la versión
  y el código del editor.

### Otras cosas
- **Por qué parecía falta de internet.** Cuando el Apps Script falla al arrancar, o no deja entrar sin
  sesión, Google devuelve una página sin el permiso CORS, y para el navegador eso es igual que no
  tener red. `motivoDeError` ahora lo dice (ver §5).
- **Visto y sin conclusión.** «Último aviso de Kommo al panel» dice **22/09 19:01 UTC** en todas las
  corridas del 23, y `estadoKommo` agrega que ese último aviso traía **0 leads**. El webhook no avisó
  ninguna venta en todo el día, y las ventas entraron por los repasos.
  - Puede ser normal: el respaldo filtra por `updated_at`, no por cambio de etapa.
  - Igual hay que mirarlo en Kommo → Webhooks.
  - No es urgente: el repaso de 5 minutos trae las ventas igual.
- **Producción ahora (16:59):**
  - Implementado: panel `ebc3eab` + `.gs` `2026-09-20-a`, que es lo que ese panel espera.
  - En el editor: la misma 20-a, re-pegada desde el raw y comprobada con `estadoKommo`. Los
    disparadores andan otra vez.
  - En esta combinación el stock y el arqueo **se siguen pisando entre dispositivos**, y borrar no mira
    el sello. Es lo que se corrige acá, y hay que publicarlo todo junto (ver §7).

---

## 1 · Respuesta a la verificación de Codex

### P1 — La misma recogida recibida en dos dispositivos se cuenta dos veces: **CONFIRMADO y CORREGIDO**

**Reproducción** (`tests/test_concurrencia.js` §2a). A y B tocan «✅ Llegó» sobre la misma recogida de 3.
Con la primera vuelta (`d890468` + `.gs` 23-a):
- quedaban dos entradas de 3;
- Moreno bajaba de 10 a 4;
- la recogida decía 3 recibidas.

La causa es que la junta contaba multiconjuntos: juntar DOS VECES el mismo cambio lo contaba dos
veces. Mi agente encontró lo mismo por otros caminos:
- con la respuesta perdida (E1), el reintento chocaba con el guardado propio;
- con el mismo «🔗 Unir» hecho en dos dispositivos (E6/#12).

**Corrección: la recepción es una operación con nombre e idempotente.**
- **Recepciones** (`pedidos.html`):
  - Cada «Llegó» agrega una recepción `{id, u, f, ts, se}` a la lista `q.recs` del pedido.
    - Se agrega en `recibirStockPedido` `:15727`, con `stockRecNuevo` `:13658`.
    - Dar por llegados desde el Excel de acá (`confirmarImportExist` `:16683`) agrega una con `se:1`,
      que no genera entrada.
    - Lo viejo, que es `q.ru` sin lista, queda como la recepción `legacy` (`stockRecsDe`).
  - **`stockNormalizarRecepciones(S)`** `:13707` deriva todo lo demás a partir de las recepciones:
    - lo pendiente (`q.ru/u/r`);
    - una entrada al depósito por recepción, con `rec:1` y el mismo id que la recepción;
    - en una recogida, la resta del almacén de origen contra la foto de ese almacén. `g[de].rs` dice
      qué recepciones ya se restaron y `g[de].t` cuándo se subió la foto.
  - Es idempotente. Corre al leer (`leerStock` `:13439`) y al final de cada junta. Así la entrada, el
    origen y el pedido **no pueden contradecirse**.
- **La junta** (`stockFusionar` `:13769`):
  - Une las recepciones por id (`fusPedidoFab` `:13679`, `fusRecs` `:13666`).
  - **Si suman más de lo pedido**, es la misma llegada anotada dos veces: se sacan las que trajo solo
    el otro lado y se avisa «se contó una sola vez».
  - **Si caben**, pueden ser dos llegadas de verdad: se cuentan las dos y se avisa «casi a la vez, si
    era la misma corregí el depósito».
- **Todo lo demás también tiene nombre.**
  - Las entradas nuevas llevan id. Las viejas reciben al leerlas un id **fijo** sacado del contenido
    (`v:f|k|u|fab|de#n`, antes de migrar claves), el mismo en todos los dispositivos.
  - `fusPorId` `:13639` junta entradas, pedidos e historial por id.

**Pruebas** (`test_concurrencia.js` §2, con el panel y el `.gs` reales):

| Caso pedido por Codex | Resultado | Con la primera vuelta |
|---|---|---|
| 2a · la misma recepción completa en A y B | 1 entrada de 3, Moreno 7, 1 recepción, aviso a B | entradas [3,3], Moreno 4 |
| 2b · dos parciales de verdad a la vez (1 y 2 de 3) | entradas [1,2], Moreno 7, completa, aviso «casi a la vez» | solo [2], la recogida sigue abierta |
| 2c · la misma parcial dos veces (2 y 2 de 3) | 1 entrada de 2, Moreno 8, queda 1 pendiente, aviso | [2,2], Moreno 6 |
| 2d · reenvío tras perder la respuesta (recogida y entrada) | 1 entrada de 3 y Moreno 7; la de 5 que salió por la cola está una vez | [3,3], Moreno 4, [5,5] |

### P1 — La protección del servidor era opcional para clientes viejos: **CONFIRMADO y CORREGIDO** (`.gs` `2026-09-23-b`)

En 23-a, un panel sin sello pasaba «para no trabarlo», y ese es justo el que pisa. Mi agente midió
además un efecto peor (#8): con 23-a, el segundo guardado seguido del panel viejo SÍ llevaba sello,
chocaba, y el panel viejo **tiraba** la anotación y metía `__stock__` en su lista de pedidos.

**Corrección** (`google-apps-script.gs`):
- `doSave(p, forzar, juntar)` `:883` (y `:925`): sobre `__stock__`/`__arqueo_cuadre__` ya sellados, un
  guardado **sin `juntar`** contesta **`actualizar`** y no toca la hoja. Con `juntar` se compara el
  sello; sin sello da `conflicto`.
- `doDelete(id, rev)` `:982` (y `:1001`): sobre una fila sellada, **sin `rev`** contesta
  **`actualizar`** y no borra. Una fila nunca sellada se borra como siempre.
- `actualizar` queda en «Rechazos» con el texto «panel viejo: esa computadora tiene que recargar la
  página» (`RECHAZOS_REGISTRAR` `:302`, `rechazoDetalle_` `:318`).
- `SCRIPT_VERSION = '2026-09-23-b'` (`:77`), igual que `SCRIPT_VERSION_ESPERADA` del panel (`:1935`).

**Qué hace un panel viejo con esto** (medido, `test_concurrencia.js` §8, con `ebc3eab` sacado de git):
- **Stock:** no pisa la fila; su guardado queda en su cola.
- **Borrar:** no borra y le dice «No se pudo borrar del servidor. Actualizá».
- **Pedidos:** los sigue guardando como siempre (eso ya pedía sello desde §4ce).
- **Al recargar con el panel nuevo**, lo que tenía en la cola **se junta y entra**.

**Riesgo de transición (documentado, no escondido):** hasta que cada computadora recargue, esa
computadora no puede tocar el stock, el arqueo ni borrar. No es «todo protegido»: ver §4.

### «La revisión adversarial seguía pendiente»: ya está, abajo en §2.

---

## 2 · Revisión adversarial (mi agente, sobre `d890468`)

Arnés: el `.gs` real en Node y páginas Playwright con el `fetch` instalado con `addInitScript`, que
sobrevive a las recargas. Reglas por página: `lose` (el servidor procesa y la respuesta se pierde),
`drop`, `busy` y `hold`. Sus escenarios pasan todos contra esta vuelta. En dos de borrado hubo que
mover el momento de soltar el guardado retenido, porque ahora el borrado lo espera a propósito.

| # | Sev. | Hallazgo | Estado | Dónde / prueba |
|---|---|---|---|---|
| 1 | ALTA | Respuesta perdida en el stock: el reintento se juntaba contra sí mismo (+5 fantasma; Moreno 4) | **Corregido** (junta por id; un `conflicto` que trae exactamente lo mandado es un ok tardío) | `apiSaveAhora` `:2091`; §2d |
| 2 | ALTA | Recargar con el stock en la cola → memoria vacía → **borraba el stock entero** (de antes) | **Corregido** (memoria por pestaña en `sessionStorage`, `ME_SIS_V2`; memoria sin cargar → `rev 0` y unión; sin cargar pero en vuelo → se une) | `filaStock` `:13516`, `leerCierresDeLista` `:9172`; §3a, §3c |
| 3 | ALTA | Junta sin base («gana lo mío» con copia vieja) | **Corregido** (la base viaja con la fila, `_base`) | §3b |
| 4 | ALTA | Dos pestañas: B tiraba lo que A dejó en la cola | **Corregido** (la memoria es de cada pestaña; una fila de otra pestaña se junta siempre). Un primer intento sincronizaba pestañas con el evento `storage` y se descartó: reemplazar la memoria podía borrar un cambio propio sin guardar | `sisPlegar`, `sisFilaEnMemoria`; §4 |
| 5 | ALTA | La misma recogida en A y B: dos entradas y dos restas | **Corregido** (P1 de Codex) | §2a |
| 6 | ALTA | Adelanto implícito: corregir un cobro inflaba el total (3.000 → 3.600) | **Corregido** | `anticipoEscrito` `:6730`, `mixtoEn` `:6739`, `ctaGuardarPago` `:5752`; `test_mixto.js` §4c |
| 7 | MEDIA | Arqueo: la recarga revertía la corrección del otro | **Corregido** (misma maquinaria; `ARQUEO_CARGADO`) | §6b |
| 8 | MEDIA | Panel viejo + `.gs` 23-a: su 2° guardado chocaba y se tiraba | **Corregido en el servidor** (`actualizar`) | §8; `test_servidor.js` |
| 9 | MEDIA | Borrado con la respuesta perdida: «sigue ahí», y al corregirla se recreaba | **Corregido** (reintento seguro; `incierto` no repone) | `borrarEnServidor` `:2335`; §7c |
| 10 | BAJA | Borrar con un guardado propio en vuelo: falso «otra persona» | **Corregido** (`esperarGuardadoDe` `:2326`) | §7b |
| 11 | BAJA | Retiro salido de la cola: sin `rev` → falso conflicto | **Corregido** (`borrarRetiro` por `borrarEnServidor`; `aplicarSello` sella la copia de `RETIROS`) | `:4916`, `:2205`; §7d |
| 12 | BAJA | El mismo «Unir» en dos dispositivos duplicaba entradas | **Corregido** | §5a |
| 13 | BAJA | «Descartar» sin red: el borrador no volvía | **Corregido** con criterio: un «no» claro lo devuelve; si Google no confirma, no se sabe si se borró y lo dice | `descartarBorrador` `:10883` |
| 14 | BAJA | El tope de 3 juntas dejaba la fila fuera de la cola | **Corregido** (`junta` ya no es firme) | `sisFusionarYGuardar` `:13849` |
| P1 | ALTA | Borrar con un guardado propio en vuelo: el guardado la **recreaba** (también pasa hoy en producción) | **Corregido** | §7b |
| P2 | MEDIA | Un retiro todavía en la cola no se podía borrar | **Corregido** (sale de la cola antes) | §7d |

**Encontré tres más mientras corregía:**
- **Una foto VIEJA en la cola revivía lo cancelado.** Un guardado falló y el siguiente entró; al salir
  la cola, la junta traía de vuelta lo que se canceló después. Ahora lo que entró saca de la cola lo
  que ya estaba adentro (`sisColaLimpiar` `:13895`). Prueba §3d.
- **El guardado que esperaba turno salía con contenido viejo y el sello nuevo.** El `SAVE_REV` de §4eo
  es para pedidos; acá dejaba pisar sin choque. Ahora se manda siempre la memoria (`sisPlegar`).
- **Pago mixto:** después de la primera corrección, una venta vieja «parecía» un pago mixto (anticipo
  y cobro del mismo día y recibo), y el formulario habría restado el cobro del adelanto al guardar.
  `mixtoEn` ahora exige además que «A cuenta» cierre con los dos. Prueba `test_mixto.js` §4c.

---

## 3 · Compatibilidad (medida con `test_concurrencia.js`, 50 comprobaciones)

| Panel \ Servidor | `2026-09-20-a` (hoy en producción) | `2026-09-23-a` (se subió y se volvió atrás) | `2026-09-23-b` (esta vuelta) |
|---|---|---|---|
| `ebc3eab` (publicado) | **31 rojos**: stock, arqueo y borrados sin proteger | #8 (su 2° guardado se tira) | no pisa: `actualizar` hasta recargar |
| `d890468` (1ª vuelta) | — | **25 rojos** (recepciones, recargas, pestañas, borrados) | — |
| **Esta vuelta** | **20 rojos**: el stock y el arqueo se pisan (el servidor no compara); borrar sí queda protegido desde el panel | 4 rojos (solo la protección contra paneles viejos) | **50/50** |

**Corrección a la primera respuesta:** decía «`ebc3eab` + `.gs` 23-a = como siempre» y no era exacto
(#8). **Conclusión:** el panel y el servidor se publican juntos (§7).

---

## 4 · Lo que NO queda protegido

1. **Una computadora con la página vieja abierta** no puede guardar el stock ni el arqueo, ni borrar,
   hasta que recargue (F5). Lo suyo espera en su cola y se junta al recargar (probado). Mientras tanto
   Administración lo ve en «Rechazos» como «panel viejo».
2. **Dos pestañas abiertas a la vez:** cada una trabaja con su memoria y ve lo de la otra recién
   cuando la otra guarda y esta relee. No se pierde nada, pero una puede mostrar el stock de hace un
   momento.
3. **Dos parciales que son la misma llegada pero no pasan lo pedido:** no se distinguen de dos llegadas
   de verdad. Se cuentan las dos y se avisa.
4. **Relojes de los dispositivos:** «antes/después del conteo» y «antes/después de la foto del
   almacén» usan la hora de cada uno.
5. **Filas que dejó en la cola un panel viejo** (sin base): se juntan como unión. Pueden revivir algo
   que otro borró en el medio. Pasa solo en la transición.
6. **La foto de un almacén vale desde que se SUBE**, no desde la hora del reporte: una recogida
   anotada entre las dos se da por incluida (igual que antes).
7. **`mixtoDe` sigue siendo heurística** para los anticipos escritos («~»): es decisión del dueño (§8).
8. **No se probó contra la planilla real ni en celulares**: todo con datos sintéticos y el `.gs` en Node.
9. **Un pegado roto frena los disparadores aunque no se implemente** (§0), porque corren lo guardado.
   - `probarAntesDeImplementar` lo detecta, **si se corre**.
   - La corrida de GitHub también lo detecta y sale en rojo, pero GitHub la corre cada ~3,5 horas.
   - Entre una cosa y la otra, el repaso de Kommo puede estar parado sin que nadie lo vea.

---

## 5 · Otros cambios de esta vuelta

- **Borrar** (`borrarEnServidor` `:2335`):
  - Espera un guardado propio en el aire, con tope de 60 s.
  - Saca la fila de la cola **después** de esperar.
  - Usa el último sello propio.
  - Ante un error pasajero reintenta una vez: borrar dos veces con el mismo sello es seguro. Si sigue
    sin saberse, es `incierto` y **no la repone**.
  - Son «no» seguros, y entonces sí la repone: `respuesta_de_lectura` (§4fx) y
    `navigator.onLine===false`.
  - El motivo va en palabras (`motivoBorrar` `:2377`).
- **Mensajes:**
  - `motivoDeError` `:8329`: si le pasa a todo el equipo a la vez, no es internet, y dice qué revisar
    en la implementación.
  - `motivoDelServidor` `:8399` traduce `actualizar`.
  - `scriptPendienteHtml` `:1947` dice «recargá la página» cuando el servidor es más nuevo que la
    página.
- **Stock con la planilla sin cargar:** `renderStock` `:14720` lo avisa y lo que se anote se une al
  conectar.
- **Después del incidente (§0):**
  - **`probarAntesDeImplementar()`** (`google-apps-script.gs`, arriba de todo, justo después de
    `SCRIPT_VERSION`). No escribe nada, y revisa:
    - la versión;
    - las 18 funciones clave, hasta la última del archivo (`borradorDeLead_`), para detectar un
      pegado cortado;
    - la planilla, leída como `list` y sin `getSheet()`, que agrega encabezados;
    - que cada disparador apunte a una función que exista; los ajenos se nombran y no se tocan;
    - el último repaso, en hora de Bolivia, y la cola.

    Una ❌ da «NO IMPLEMENTAR». Los ⚠️ (repaso parado, sin disparadores, cola) avisan y no frenan,
    porque el panel no depende de ellos. Va arriba para que un pegado cortado la conserve.
  - **La cabecera del `.gs`** dice el procedimiento de actualización y ya no dice «New deployment».
  - **`traer_kommo.py`:** `repaso_parado()` + `REPASO_PARADO_MIN=30`. Sale en rojo **al final**,
    después de encolar. Solo imprime una hora: nada de clientes.

---

## 6 · Pruebas

| Suite | Resultado | Dientes |
|---|---|---|
| `tests/test_concurrencia.js` (**rehecho**, 18 → 50) | **50/50** | `d890468`+23-a: 25 rojos · `ebc3eab`+20-a: 31 · panel nuevo+20-a: 20 · panel nuevo+23-a: 4 |
| `tests/test_servidor.js` (194 → 201 → **226**) | **226/226** | 23-a: 7 rojos · §11 `probarAntesDeImplementar` (con un pegado cortado de verdad): 5 rojos contra el 23-b de `5205ce8` y otros 5 contra el de `9ee9c2e` · §12 `celda_llena` |
| `tests/test_traer.py` (§6 y §7 nuevas) | **68/68** | `traer_kommo.py` de `main`: 4 rojos (con el repaso parado 3 h, la corrida salía en verde); el de `d9f6326`: 4 rojos (repaso roto, ids en el registro) |
| `tests/test_transicion.js` (**nueva**, §9) | **18/18** | panel de `04ab496`: 11 rojos (Moreno 4, entrada perdida, arqueo revertido, ids repetidos) |
| `tests/test_mixto.js` (28 → 33) | **33/33** | `d890468`: 4 rojos (3.000 → 3.600) |
| `tests/test_medias.js` (23 → 24) | **24/24** | cambió a propósito: «not found» = borrado, y respuesta perdida = «no se sabe» |
| `tests/test_adm_alta.js` | **18/18** | — |
| Batería completa (`tests/correr.sh`, 75 suites) | **75/75 en verde, 2.810 comprobaciones** sobre `14dec98` | — |

**Cómo verificar (Codex):**
```
git fetch origin && git checkout claude/pedidos-fecha-entrega-bgt0em
./tests/correr.sh                              # batería completa
node tests/test_concurrencia.js                # dos navegadores contra el .gs real (incluye el panel viejo por git show)
node tests/test_servidor.js                    # el .gs solo (§11 = probarAntesDeImplementar)
python3 tests/test_traer.py                    # el respaldo de Kommo (§6 = repaso parado en rojo)
# dientes:
git show 5205ce8:google-apps-script.gs > /tmp/gs23b0.gs && GS=/tmp/gs23b0.gs node tests/test_servidor.js   # 5 rojos (§11)
git show d890468:google-apps-script.gs > /tmp/gs23a.gs && GS=/tmp/gs23a.gs node tests/test_servidor.js
git show ebc3eab:google-apps-script.gs > /tmp/gs20a.gs && GS=/tmp/gs20a.gs node tests/test_concurrencia.js
mkdir -p /tmp/v && git show d890468:pedidos.html > /tmp/v/pedidos.html && git show d890468:productos-mes.js > /tmp/v/productos-mes.js \
  && PEDIDOS=/tmp/v/pedidos.html GS=/tmp/gs23a.gs node tests/test_concurrencia.js
```
Las rutas de Playwright y Chromium son las de Linux (`/opt/node22/…`, `/opt/pw-browsers/…`).

---

## 7 · Cómo publicar (cuando el dueño y Codex digan) — reescrito después de la revisión del 24/09

**Cambió el orden.**
- Primero se pega y se prueba el servidor en el editor, sin implementar: nadie del equipo se entera,
  y así se mide el stock antes de tocar nada.
- Después se publica la página y **todos recargan**.
- Recién ahí se implementa.

Motivo: la revisión (§9) mostró que la página vieja y la nueva abiertas a la vez corrompían el
stock. Ya está arreglado en el código, pero que nadie quede con la página vieja es la primera
defensa.

**No publicar a las 10:00 ni a las 17:00 de Bolivia**: a esa hora corre `panel.yml` y un push a
`main` en ese momento falla.

0. **Dueño: anotar la versión activa.** Implementar → Administrar implementaciones → anotar el número
   de «Versión» que está activa hoy (la 20-a). **Es a la que se vuelve si algo sale mal.**
   ⚠️ **Nunca «la anterior» a ciegas**: la del 23/09 quedó guardada en Google y es el pegado roto.
1. **Dueño: pegar la 23-b en el editor (sin implementar).**
   - Copiarla de este enlace **fijo a un commit**, con Ctrl+A y Ctrl+C:
     https://raw.githubusercontent.com/eduardoxyz22-maker/MULTIESPUMAS/14dec98a83955ce8f7a7e979fa9bd2bd19b3ad6d/google-apps-script.gs
     - Verificado: **1956 líneas**, idéntico al de la rama.
     - No usar el de `main`: se cachea unos 5 minutos. Nunca copiarlo del chat.
   - En el editor:
     - a la izquierda, **un solo** archivo `.gs`;
     - clic en el código, Ctrl+A, Supr (tiene que quedar **vacío**), Ctrl+V y Ctrl+S;
     - no tiene que salir ningún mensaje rojo;
     - la última línea es la **1956**: `}`, con `return borrador;` justo antes.
   - Desde acá los disparadores corren la 23-b, cuya parte de Kommo es igual a la de la 20-a. El
     panel del equipo sigue con la 20-a implementada.
2. **Dueño: `probarAntesDeImplementar` → Ejecutar** (si pide permisos, se aceptan).
   - Tiene que terminar en **«✅ Se puede implementar»**.
   - **Mandar la captura: dice cuánto ocupa el stock en su celda.**
   - Con ❌ o un error rojo: volver a pegar la 20-a y parar. El enlace es
     https://raw.githubusercontent.com/eduardoxyz22-maker/MULTIESPUMAS/ebc3eab108594105b3d7db0013a3f4ff82edfafe/google-apps-script.gs
     (1732 líneas). Nada más cambió.
3. **Claude: publicar la página.**
   - Mirar que `panel.yml` no esté corriendo.
   - Hacer el merge de la rama a `main` y esperar el deploy de Pages.
   - Comprobar que la página publicada espera `2026-09-23-b`. Con F5 en el panel, el cuadro de
     🔒 Cerrar día dice «…la última es `2026-09-23-b`»; la página vieja no lo dice.
4. **Todos: recargar (F5) en cada computadora y celular, y confirmarlo uno por uno.**
   - Hasta que el dueño avise, **nadie toca 📦 Stock ni el arqueo del Cuadre**.
   - Los pedidos y los cobros se cargan normal.
5. **Dueño: implementar.** Implementar → Administrar implementaciones → ✏️ la de siempre → Versión:
   «Nueva versión», con **`2026-09-23-b` en «Descripción»** → Implementar. **Nunca «Nueva
   implementación».**
6. **Verificar** (condición de Codex: conexión, versión y una ejecución automática de Kommo exitosa):
   - **Conexión:** el panel (F5) dice «Conectado», sin el cartel rojo.
   - **Versión:** el cuadro de 🔒 Cerrar día dice `2026-09-23-b` (o Actions → «Traer ventas de Kommo
     (respaldo)» → Run workflow).
   - **Kommo automático:** esperar 5 minutos **sin** ejecutar `kommoRepaso` a mano. Después:
     - `probarAntesDeImplementar` otra vez tiene que dar ✅ «El repaso de Kommo corrió hace N minutos,
       sin errores»;
     - en **Ejecuciones**, la fila más nueva de `kommoRepaso` tiene que decir «Basada en el tiempo»
       → **«Completada»**.
7. **Recomendado:** volver a subir el Excel de existencias de Moreno con el panel nuevo, para que las
   fotos de los almacenes queden al día.

**Volver atrás:**
- **Falla en los pasos 1–2:** se vuelve a pegar la 20-a, y nada más: el panel no cambió.
- **Varios dispositivos sin conexión después del paso 5** (si es uno solo, primero F5):
  - ✏️ → la versión **anotada en el paso 0**, que arregla el panel;
  - **y** volver a pegar la 20-a en el editor, que arregla los disparadores.
  - El panel nuevo anda con la 20-a si todos recargaron.
- **Si el que falla es el panel nuevo:** Claude revierte el merge en `main` y todos recargan.

---

## 8 · Decisiones que necesitan tu opinión

1. **Publicar** esta vuelta (panel + `.gs` 23-b juntos, §7), cuando la apruebes vos o Codex.
2. **Confirmar que volviste a pegar la 20-a desde el enlace raw y que el repaso volvió.** Mandame la
   captura de `estadoKommo` (§0). Lo necesito antes de pedirte que subas la 23-b. La captura de
   Ejecuciones ya llegó: `Script function not found: kommoRepaso`.
3. **Excel del Cuadre:** ¿el cierre en una hoja aparte (a) o se deja como está (b)?
4. **«Entrega»:** ¿(a) agendada y rotulada, (b) solo lo entregado, o (c) guardar el día real?
5. **Pago mixto:** ¿marcar el 2° método en el historial, en vez de reconocerlo por día y recibo?
6. Siguen pendientes: MEDIA-4, MEDIA-5 y `PANEL_KEY` (en espera).

---

## 9 · Revisión con dos agentes antes de publicar (24/09, madrugada)

El dueño pidió una revisión más antes de publicar. Dos agentes, cada uno en su copia del repo y
sin tocar nada:
- **Agente 1:** revisó lo agregado después de Codex (servidor, alarma y procedimiento).
- **Agente 2:** revisó la **transición**, con la página vieja y la nueva a la vez contra los dos
  servidores, y corrió la batería con el reloj corrido a otros días.

Verifiqué cada hallazgo antes de corregirlo.

**Confirmado y arreglado** (`04ab496` y `14dec98`):

| # | Sev. | Hallazgo | Arreglo |
|---|---|---|---|
| T1 | ALTA | La página VIEJA reescribe las fotos de almacén sin `rs` ni `t`. Al leerlas, la nueva volvía a restar las recogidas: **Moreno 10 → 7 → 4**, en silencio. Pasaba con el 20-a y también al recargar con el 23-b | `stockLeerDePanelViejo`: una foto sin `rs` trae adentro las recepciones de esa misma fila, que se anotan como ya restadas. `fusFoto` le devuelve la hora a la misma foto |
| T2 | ALTA | El «Llegaron» de la página vieja (solo sube `q.ru`) se perdía: la **entrada de 2 desaparecía** y la recogida se reabría | `q.ru` mayor que la suma de las recepciones pasa a ser una recepción `legacy:d<n>`: sin resta ni entrada nueva, y la entrada de la vieja queda |
| T3 | ALTA | Arqueo: al recargar, la cola de la página vieja **pisaba la corrección de otro** (950 → 900) | Una fila sin `_dev` (página vieja) se junta con la regla «viejo»: en lo compartido gana la planilla, se agrega lo que la planilla no tiene, y se avisa |
| T4 | MEDIA | Una pestaña nueva que anotaba el arqueo **antes** de tener la planilla revertía correcciones con el espejo del navegador, y avisaba en rojo tres veces «no se pudo juntar» | La base es lo que mostró el espejo (`ARQUEO_ESPEJO_TXT`), y `poner` marca `ARQUEO_CARGADO` |
| T5 | BAJA | Dos entradas iguales (una ya numerada) recibían el mismo id fijo, y la junta dejaba una | `idFijo` salta los ids ya usados |
| T6 | — | **Tamaño:** el stock va en UNA celda y Google corta en 50.000 letras. Con un stock inventado grande: 48.288 → 53.236 después de un día con el formato nuevo. **El tamaño real no se conoce** | El servidor contesta `celda_llena` sin tocar la hoja (antes: excepción = «sin conexión»). `probarAntesDeImplementar` mide el stock y el arqueo: ⚠️ desde 35.000, ❌ desde 42.000. El panel avisa pasadas las 45.000. **Se mide en el paso 2 de §7, antes de publicar la página** |
| A1 | ALTA | «Volver a la anterior» en ✏️ caía en el **pegado roto del 23/09**, que quedó guardado como versión | Anotar antes la versión activa y volver a ESA (§7 paso 0, cabecera del `.gs`, `CLAUDE.md`) |
| A2–A4 | MEDIA/BAJA | La prueba del editor daba ✅ en tres casos: con código viejo mezclado, con un repaso que corre pero falla por dentro, y con disparadores ajenos | Arreglado en `04ab496` (ver el commit) |
| — | BAJA | «actualizar» salía crudo en Rechazos y contaba como «hay que volver a hacerlo». «Sin conexión» mandaba a revisar «Ejecutar como», que ya se había descartado. Seis carteles enseñaban a publicar sin pegar ni probar | Textos arreglados (`PUBLICAR_PASOS`) |
| — | MEDIA (pruebas) | `test_concurrencia` se pudría los domingos y entre las 20 y las 24 de Bolivia | «hoy» en hora de Bolivia, y las ventas sembradas en un día abierto |

**Nueva:** `tests/test_transicion.js`. Monta la página vieja (sacada de git) y la nueva contra los dos
servidores, con 8 escenarios. Resultado: 18/18, y 11 rojos contra el panel de `04ab496`.

**No arreglado, a propósito o pendiente:**
- **Lo que VE la página vieja con el 23-b:** mensajes verdes que no se guardaron y ningún «recargá».
  Es código viejo y no se puede cambiar. Se cubre con el paso 4 de §7: todos recargan antes de
  implementar.
- **La lista de 18 funciones** de la prueba del editor solo detecta un corte al final del archivo;
  un hueco en el medio no. Es improbable con el enlace raw, y el guardado con error de sintaxis
  cubre la mayoría de los cortes.
- **Pruebas que se van a pudrir a fin de mes**, sin nada roto en el panel:
  - `test_botones` los días 29 y 30/09;
  - `test_chofer` y `test_resumen` el 30/09;
  - `test_cuadre` el 1/10;
  - `test_ventas_panel` desde octubre (tiene fechas fijas).

  Quedan para después de publicar.
- **Plausibles, sin probar contra Google:**
  - una pestaña vieja con el stock congelado puede aplicar marcas ✔/📥/✗ a pedidos;
  - en el mismo navegador, una pestaña vieja y una nueva a la vez: la vieja reemplaza en la cola la
    fila de la nueva.

  El paso 4 de §7 cubre los dos.

---

## 10 · Revisión con cuatro agentes que ARREGLAN (25/09) — para que la mires

El dueño pidió «revisa que no haya más errores… contabilidad, conciliación, entregas, stock, predicción de
producción y pedidos». Cuatro agentes en copias aisladas, con la consigna: solo lo CONFIRMADO, primero una
prueba que falla, sin tocar el `.gs` ni las reglas del dueño. Revisé cada diff antes de juntarlo. **El `.gs`
no cambió: el enlace fijo de §7 sigue valiendo.** Detalle completo en `BITACORA_CLAUDE.md` §4ga.

| Área | Commits | Prueba nueva | Contra `50f9d22` |
|---|---|---|---|
| Stock y producción | 4 | `tests/test_rev_stock.js` (19) | 11 rojos |
| Entregas y logística | 5 | `tests/test_rev_entregas.js` (42) | 29 rojos |
| Contabilidad y Cuadre | 11 | `tests/test_rev_conta.js` (38) | 28 rojos |
| Pedidos y lo demás | 7 | `tests/test_rev_pedidos.js` (41) | 28 rojos |

**Lo más grave de lo arreglado:**
- `flushPending` reemplazaba la cola entera al terminar: lo encolado MIENTRAS se mandaba se perdía.
- Un borrador de Kommo completado sin señal volvía a la bandeja, y «Descartar» borraba la venta entera.
- Salir de la edición mandaba a la papelera el comprobante del adelanto (método suelto con dos imágenes).
- El flete de una venta YA pagada entraba como cobro de más (regresión de §4fk: ver el cambio en
  `test_conta_alta` §4fk, que medía una pantalla que no existe).
- El 💰✓ de Administración borraba sin preguntar el pago registrado por Contabilidad.
- «1.500» en «Corregir precios y montos» valía 1,50.
- `stockMigrar` volvía a sumar por nombre un código que el catálogo no conoce, en cada relectura de la fila.
- Mover una ATC con la devolución programada la dejaba en el día viejo.

**Más:**
- `herramientas/marcar-entregados-agosto.gs`: archivo APARTE del proyecto de Apps Script, para marcar
  «entregado» lo de agosto. No toca Código.gs. `test_servidor.js` §13 lo prueba contra el `.gs` 20-a y
  contra el 23-b.
- 5 pruebas que se pudrían a fin de mes.
- **Batería: 79 suites, 2.985 bien · 0 mal.**

**Qué me gustaría que mires:**
1. `flushPending` (comparación por JSON de antes de mandar).
2. `leerCierresDeLista` + `borradorEnColaComoPedido`.
3. `CTA_FORM_ENV` contra el espíritu de §4fk.
4. `stockMigrar` con `cod`.
5. `atcAlMarcarEntregado` con `rfAuto`.

**Después, la tarde del 25/09:**
- **El quinto agente, de uso diario (solo informe), se cortó a las 11:20 sin entregar nada.** Se relanzó con 35
  minutos de tope contra la rama con los 27 arreglos. No encontró bloqueantes, pero sí esto:
  - **MEDIA — la «Ubicación de Google Maps» frenaba lo que se pega de verdad.** Pasaba con el nombre + el enlace
    al compartir desde Maps, «Mi ubicación:», los enlaces sin https y los grados. Antes se guardaba vacío en
    silencio; con el arreglo del agente de pedidos, no dejaba guardar.
    - **Arreglado en `cdfbda7`.** `normalizaUbicacion` saca el primer enlace del texto, sin la puntuación del
      final. Le agrega https a `maps.app.goo.gl`, `goo.gl/maps` y `google.*/maps`, y entiende «-17.78°, -63.18°»
      y los grados con minutos y segundos.
    - Frena solo si no hay ninguna ubicación (una dirección escrita va en «Dirección»). Un enlace solo se guarda
      tal cual, como siempre.
    - Prueba: `test_rev_pedidos` §5 (43).
  - **BAJA — ficha de Contabilidad, venta pagada SIN flete.** El botón del bloque «🚚 Anotar el recargo» anota
    flete sin preguntar; antes preguntaba «¿cobro de más?» y lo anotaba como pago de la venta. Es coherente con lo
    que dice el bloque: se deja así.
  - **BAJA — el aviso del 💰✓.** Decía «lo registró Contabilidad o la tienda»; ahora dice «recibo o comprobante»,
    porque el QR del chofer con foto tampoco es un cobro de la puerta.
- **Batería final: 79 suites, 2.987 bien · 0 mal.**

## 11 · Publicación del 25/09 y lo que falta

### Qué se publicó
- `394f74c` en `main`, el merge de la rama:
  - `pedidos.html` y `productos-mes.js` (sin cambios en este último);
  - `google-apps-script.gs`, solo el ARCHIVO en el repo: no se implementó nada;
  - `traer_kommo.py` y `panel.yml` (el push del bot ahora reintenta y avisa si falla);
  - pruebas y documentos.
- Se hizo sin `panel.yml` corriendo. Pages (`pages build and deployment` #1516) quedó en verde a las 19:04 UTC.
- ⚠️ Desde mi sesión no puedo abrir `github.io` ni `script.google.com` (el proxy los rechaza). Lo verifiqué por el
  deploy y porque el `pedidos.html` de `main` es idéntico al de la rama probada.

### Qué NO cambió en producción
El servidor implementado y el código guardado en el editor siguen siendo la 20-a.

### La página nueva con la 20-a
- Hay prueba: `test_transicion`, escenarios 1, 2 y 4. El «volver atrás» de §7 ya la daba por buena.
- **Stock y arqueo:** se guardan sin sello. Gana el último que guarda, como antes: la protección entre dos equipos
  rige recién con la 23-b.
- **Borrar:** el panel manda `rev`; la 20-a lo ignora, pero el panel relee la fila antes de borrar.
- **Celda llena:** la 20-a no tiene `celda_llena`; el panel avisa pasadas las 45.000 letras.
- **Lo único visible:** en 🔒 Cerrar día, la línea gris «hay una versión más nueva del script sin publicar».

### `traer_kommo.py` nuevo con la 20-a
- `origen:'repaso'` y `ultimoRepaso` existen desde §4et y §4eg.
- La 20-a anota `KOMMO_REPASO_ULTIMO` en CADA pasada, aunque no haya leads. Por eso la alarma de «repaso parado»
  (más de 30 minutos) no salta en falso.

### Lo que falta: 26/09, desde la PC (hay un recordatorio agendado a las 07:45)
- **Antes de empezar:** que todos recarguen (F5, o cerrar y abrir la pestaña). Hasta que lo confirmen, nadie toca
  📦 Stock ni el arqueo.
- **Pasos de §7:**
  - 0: anotar la versión activa;
  - 1: pegar la 23-b del enlace fijo `14dec98…` (1956 líneas; verificado hoy de nuevo, idéntico);
  - 2: `probarAntesDeImplementar` con «✅» y la captura del tamaño del stock;
  - 5: ✏️ Versión nueva, con `2026-09-23-b` en «Descripción»;
  - 6: verificar la conexión, la versión y `kommoRepaso` «Basada en el tiempo» → «Completada»;
  - 7: volver a subir el Excel de Moreno.
- **Opcional:** marcar agosto con `herramientas/marcar-entregados-agosto.gs` (enlace fijo `67fc83d…`, archivo
  APARTE del proyecto).
- **Volver atrás la página:** revierto `394f74c` en `main`. El servidor no cambia.

### Decisiones que esperan al dueño
Detalle en `BITACORA_CLAUDE.md` §4ga, «Quedan para decidir»:
- Moreno queda con unidades fantasma si se entrega una línea 📥 sin anotar la recogida.
- Los recojos de ATC aparecen en «A cargar en el camión».
- Una vendedora sin clave puede sacar un pedido de un día cerrado sin que nadie se entere.
- La celda de 50.000 letras del stock.
- `ocAutoGs_` no conoce el prefijo RPT (arreglarlo exige republicar).
- El formulario todavía lee los montos con `parseFloat` («1.500» vale 1,5).

### Qué le pido a Codex
1. Revisar los diffs de §10, en especial la lista «qué me gustaría que mires».
2. Decir si ve algún problema en tener la página nueva con la 20-a hasta mañana.
3. Mirar `normalizaUbicacion` (`cdfbda7`) por algún texto común que ahora se guarde mal. Una URL que no es de Maps
   se acepta tal cual, como antes.

## 12 · Revisión por PESTAÑA (26/09) — para que la mires

Ocho agentes, uno por pestaña, con la misma consigna que §10. Revisé cada diff y junté 35 commits (salteé uno que
repetía el aviso del comodín). Después agregué dos arreglos míos, que reportaron ellos:
- los doce campos de plata que quedaban como `type=number`, que perdían la coma;
- el chofer sin señal, que se entera de lo que no entró.

**Batería: 89 suites, 3.254 bien · 0 mal.** Cada `tests/test_rev2_*.js` falla contra `cb99ab3` (entre 13 y 25 rojos).
El detalle está en `BITACORA_CLAUDE.md` §4gb.

**Qué me gustaría que mires:**
1. `guardarCierres` + `CIERRES_CAMBIOS` (Cerrar día relee la planilla antes de escribir).
2. `choEntregado`, que reaplica el ✅ una vez cuando choca.
3. `rechazoPerdido` / `choRechazosHtml`: se AVISA, no se reaplica.
4. `montoForm` y la regla del signo menos.
5. Recepción `nr` en `stockNormalizarRecepciones` / `stockLeerDePanelViejo`.
6. `mergePending` con los retiros en la cola.

## 13 · Estado al 26/09, 10:15 de Bolivia: lo arreglado, lo que falta y lo que hay que analizar

Esta sección junta TODO lo que está abierto y reemplaza las listas de §11 y §12. La actualicé después de publicar:
la tercera vuelta terminó (13.3) y todo lo de 13.2 y 13.3 ya está en producción.

### 13.1 Qué está publicado y qué no

| Pieza | En producción | En la rama |
|---|---|---|
| Página (`pedidos.html`, `productos-mes.js`) | **`a8e3c5e`, publicada el 26/09 a las 10:11** (merge de `8de15f9`): todo lo de 13.2 y 13.3 | lo mismo, más esta documentación |
| Servidor (`google-apps-script.gs`) | `2026-09-20-a` implementado: **«Versión 30 del 21 sept 2026, 9:41 a.m.»**, anotada por el dueño en el paso 0 (26/09, 10:25). **Es la de volver atrás.** | `2026-09-23-b` en el repo, sin implementar (enlace fijo `14dec98…`) |
| Agosto «entregado» | sin correr | `herramientas/marcar-entregados-agosto.gs`, lo corre el dueño desde el editor |

**Lo que falta hoy:**
1. Todos recargan (F5). Ya se les avisó a las 10:12.
2. El dueño, desde la PC, hace los pasos 0-2 y 5-7 de §7 para el servidor 23-b.

La página anda con la 20-a y con la 23-b. Se publicó sin `panel.yml` corriendo, y el deploy de Pages (#1520) quedó
en verde a las 14:12 UTC.

**Batería sobre `8de15f9`:** 95 suites, 3.454 bien · 0 mal.

### 13.2 ARREGLADO Y PUBLICADO: la revisión por pestaña (§4gb)

Son los 35 commits de los 8 agentes por pestaña (33 con un arreglo y 2 solo de pruebas) y 2 míos. Cada arreglo tiene su prueba, que falla contra el panel de antes. Detalle en `BITACORA_CLAUDE.md` §4gb.

**＋ Nuevo pedido** (`tests/test_rev2_form.js`, 29 · `tests/test_montos_texto.js`, 9)
- `0cc02c4` ALTA · «1.500» tipeado se guardaba como 1,50 en A cuenta, Saldo, cobrado, flete, 2° método y precio: `montoForm` = `parseMonto` en todas las lecturas. Un monto con signo menos frena el guardado (`montoNegativo`).
- `255d2a8` MEDIA · cantidad 0, 2,5, −2 o vacía se guardaba distinta: ahora frena (`cantidadesMal`, la misma regla que `rohoCant`).
- `360d5b2` MEDIA · un método elegido y después sin pago trababa el guardado (pedía un comprobante de un pago que no existe): `_hayPago`. Pasar a ATC o RPT limpia el método, el mixto y las imágenes nuevas.
- `bdbb4ac` ALTA (mío) · con `type="number"`, Chromium tira la coma antes de que el panel la vea: «1500,50» valía Bs 150.050 y «1.500,50», Bs 1,50. Los doce campos de plata del formulario y de Contabilidad pasan a texto con `inputmode="decimal"`.

**📋 Mis pedidos** (`tests/test_rev2_mis.js`, 39)
- `ccec65e` la ficha:
  - mostraba el historial de pagos crudo, con los ids de las imágenes;
  - decía «Sin saldo» a la venta sin monto y a las ATC/RPT;
  - no mostraba el 🏭.
- `bf50e9f` el WhatsApp ponía «💰 PAGADO» a una venta sin monto anotado y a una ATC.
- `38b02aa` la venta de tienda:
  - caía al fondo y el tope de 120 la escondía sin avisar;
  - su ficha pedía GPS.
- `4463e52` un borrador de Kommo completado decía «no cambió nada» y no ofrecía el WhatsApp.
- `560e869` «Reintentar ahora» decía «Reintentado» aunque no saliera nada.
- `6f130ea` el WhatsApp no nombraba el flete pactado que se cobra en la puerta.

**🚚 Chofer** (`tests/test_rev2_chofer.js`, 28 · `tests/test_chofer_sin_senal.js`, 8)
- `9531ee2` ALTA · un doble toque en ✅ desmarcaba la entrega: desmarcar ahora pregunta.
- `03ecb0b` ALTA · el ✅ con la copia vieja chocaba (`conflicto`) y la entrega quedaba sin marcar. Ahora se reaplica una vez sobre la fila del servidor; la plata no se reaplica así.
- `a45124b` MEDIA · el flete pactado no aparecía en la tarjeta.
- `5b69a15` BAJA · a 320 px, el botón «📷 Foto de la entrega» quedaba ilegible.
- `3f88ede` ALTA (mío; lo reportó el agente) · sin señal, un ✅, un cobro o una foto en cola que chocaba se descartaba y el chofer no se enteraba. Ahora ve un cartel rojo en SU pantalla hasta tocar «Ya lo revisé». No se reaplica solo, a propósito.

**💰 Contabilidad → Ventas** (`tests/test_rev2_ventas.js`, 20)
- `420b1f6` ALTA · «✏️ Corregir este pago» perdía la fecha, el monto y el recibo al elegir el método.
- `d25bf05` MEDIA · regresión del 25/09 (`CTA_FORM_ENV`): una venta SIN MONTO ANOTADO mandaba el pago al flete.
- `2c8de76` MEDIA · Productos del mes contaba una «PAGADA sin monto» como Bs 0 conocido (`productos-mes.js?v=20260926a`).

**🧮 Cuadre** (`tests/test_rev2_cuadre.js`, 55)
- `0088f9f` ALTA-MEDIA · el arqueo y los retiros perdían la coma (lo mismo que `bdbb4ac`).
- `68d25e2` MEDIA · un retiro corregido en la cola volvía al monto viejo, y uno borrado reaparecía.
- `49e5e76` el Excel no bajaba con solo retiros; filtrado por vendedora, ahora lo dice en el nombre.
- `404fb96` «N de M formas anotadas» no contaba el arqueo sin pagos, y el texto decía «cierra» con formas sin contar.
- `cc1bedf` Contabilidad se corría de costado a 360 y 320 px.
- `67a7cc6` el refresco automático sacaba el foco del arqueo mientras se tipeaba.

**🎧 ATC** (`tests/test_rev2_atc.js`, 35)
- `33ada34` ALTA · cerrar o reabrir desde «Anotar avance» no movía el ✅ de la devolución (`atcEntregadoComoEnt`).
- `6c783fa` MEDIA · el comodín no llegaba al chofer, la carga, la hoja de ruta ni el grupo, y el grupo decía «PAGADO».
- `b14affa` MEDIA · programar la devolución el día del recojo borraba el viaje de hoy: ahora pregunta si ya se recogió.
- `4e1be08` BAJA · «📋 Copiar» salía sin encabezado.

**🔒 Administración** (`tests/test_rev2_admin.js`, 22)
- `e749c32` MEDIA · con dos computadoras, un día cerrado se reabría solo: `guardarCierres` relee la planilla y aplica `CIERRES_CAMBIOS`.
- `33a352f` BAJA · el Parte del día contaba ATC/RPT como «por cobrar».
- `5efd152` BAJA · el sábado no decía cuántos se forzaron de más.

**📦 Stock** (`tests/test_rev2_stock.js`, 22)
- `512374d` ALTA · «📋 Conté a mano» volvía al corte viejo con fecha de hoy y perdía `c.cod`.
- `8b4fc72` MEDIA · una recogida que el Excel de Moreno ya no tenía no se podía dar por llegada: recepción `nr`.
- `e12ed3c` MEDIA · el detalle pedía de más con el depósito negativo.
- `71065bd` BAJA · el historial de cortes no comparaba con el mismo almacén.

### 13.3 ARREGLADO Y PUBLICADO: la tercera vuelta (§4gc)

Seis agentes, de 08:17 a 10:00. Revisé cada diff, junté 28 commits y agregué uno mío. Las pruebas nuevas son
`tests/test_rev3_{plata,entregas,atc_mis,admin,conta,stock}.js`, y cada una falla contra `3da79ab`. El detalle
está en `BITACORA_CLAUDE.md` §4gc.

**Regresiones que habían metido los arreglos de 13.2**
- **ALTA** · `0b04944`: «Bs. 1.500.-» pegado de WhatsApp se guardaba como Bs 0,10, porque desde que los campos
  de plata son texto `parseMonto` tomaba el punto de «Bs.» y el «.-». Ahora ignora los separadores de las puntas
  y, con separadores repetidos, toma el último como decimal. ⚠️ «.50» vale 50.
- **MEDIA** · `f663317`: el ✅ reintentado (`03ecb0b`) borraba el aviso del cobro perdido (`3f88ede`).
  `rechazoResuelto` saca solo lo que el reintento volvió a poner.
- **MEDIA, solo en la transición** · `714ebdd`: la página vieja no conoce la recepción `nr` y le dejaba colchones
  fantasma a Moreno. Ahora la `nr` deja una marca de 0 unidades en `rs`.
- **MEDIA** · `d478135`: con «A cuenta» vuelto a 0 y la foto ya subida no se podía guardar, porque la imagen
  quedaba escondida.
- **MEDIA** · `7ebece5` (mío): cancelar «¿borrar el pago?» dejaba el 0 en «A cuenta», y con lo tipeado que ahora
  sobrevive al repintado, guardar el precio volvía a preguntar. `test_noborra` salió 32/3 en la batería del
  conjunto; ahora cancelar repone lo guardado.

**Pendientes que habían quedado reportados**
- **Hoja de ruta** · `2add89f`: dice el flete pactado con las palabras de la tarjeta del chofer. Dos agentes lo
  hicieron; revertí el otro (`1c35845`).
- **Lista de carga y cierres** · `9db5e72`:
  - con dos cargadores ya no se pierden tildes;
  - lo hecho sin señal ya no pisa la planilla al volver.
  Es el mismo mecanismo de Cerrar día: `REESCRITAS`, `_cambios` en la cola y `mandarReescritaDeCola` en
  `flushPending`.
- **Administración:**
  - `87b52f5`: los chips AM/PM cuentan como el cupo;
  - `63c9dc1`: «Todos» de carga y ruta, sin las ventas de tienda;
  - `d0f8636`: el 💰✓ pregunta antes de deshacer un cobro del chofer.
- **ATC:**
  - `25fde37`: «Quitar la devolución» repone el turno del recojo (`rturno`) y borra `rec`; con ese turno lleno
    va con `forzar`;
  - `868e62a`: el chip dice «devolución» también con el ✅ puesto.
- **Mis pedidos:**
  - `0290b41`: un borrador completado desde Administración vuelve a Administración;
  - `ac5bad3`: el aviso diario reconoce el nombre con y sin tilde;
  - `6985f4c`: la ficha de un pedido que espera en la cola dice «⏳ sin enviar».
- **Contabilidad:**
  - `cbfb634`: «Corregir precios y montos» recuerda lo tipeado;
  - `84f9572`: `tsFmt` va en hora de Bolivia;
  - `cae7385`: «Anotar el monto» frena el signo menos;
  - `18f57a1`: el pago en curso de un flete vuelve como flete.
- **Cuadre:**
  - `cad8278`: el Excel tiene el TOTAL del efectivo, la «PAGADA sin monto» sale del detalle y dos pagos sin fecha
    iguales cuentan dos;
  - `13bd857`: pasar con Tab por el arqueo ya no pierde el foco.
- **Stock:**
  - `41a9a39`: una llegada anotada después del Excel de la tarde ya suma;
  - `2c06e02`: con la casilla destildada, la recogida programada cubre su línea 📥;
  - `adf636c`: los ✗ de días pasados van a su grupo del detalle;
  - `a223c60`: buscador de productos en «Pedí a fábrica» y «Llegó».

### 13.4 POR ARREGLAR, pero decide el dueño

No son errores de programación: arreglarlos cambia una regla o cómo trabaja el equipo. Nadie los toca hasta que el dueño decida.
1. **«Qué producir» y la tabla de stock pueden pedir cantidades distintas.** El cuadro de 7 días (`o.fabricar`) puede decir «producir 3» en un producto que la tabla marca «🚚 Ya pedido», «✓ alcanza» o «📦 Pedido único». Pasa cuando la reserva de rotación pide más de lo que hay antes de fábrica + margen. Además, «📋 Copiar pedido a fábrica» no lo incluye.
2. **El producto de un recojo de ATC entra en «A cargar»** y en el TOTAL A CARGAR.
3. **Una vendedora sin clave puede sacar su pedido de un día cerrado.** El panel y el servidor miran solo la fecha nueva, no la que deja. Arreglarlo exige también el `.gs`.
4. **El stock va en una celda que Google corta en 50.000 letras.** La salida sería podar `STOCK.p` recibidos. El tamaño real lo mide hoy `probarAntesDeImplementar`.
5. **Moreno puede quedar con unidades de más o de menos:**
   - de más, si se entrega una línea 📥 sin anotar la recogida;
   - de menos, si el Excel de Moreno se sacó después de cargar la camioneta. No hay forma de saber la hora del retiro.
6. **«Productos más entregados» cuenta las ATC** (`prodRankData`). §4cx solo las sacó del stock.
7. **«Qué se hizo» de una ATC** solo se anota con el paso opcional «Listo en fábrica» (§4eb).
8. **Mis pedidos, «Hoy» y «Este mes»:** cuentan por fecha de ENTREGA aunque «Hoy» dice «pedidos cargados», y las ventas de tienda nunca cuentan ahí.
9. **`avisoClienteText`** le escribe «Heaven Colchones» también al cliente de una venta Sueña.
10. **📍 «Ubicación guardada ✓»** sale antes de que conteste el servidor. Si falla, queda en la cola sin cartel rojo; no se pierde nada.
11. **El cobro por QR del chofer se guarda sin banco** y cae suelto en el Cierre por forma de pago (el BAJA-1 de §4fy).
12. **§4fy:**
    - MEDIA-4: el 💵 de Administración deja el efectivo en la vendedora aunque haya cobrado el chofer;
    - MEDIA-5: un cobro nuevo sobre una venta ya ✅ no avisa.
13. **Cuadre:**
    - «Entrega» corta por la fecha PROGRAMADA (no hay campo con el día real);
    - el `SUMA` de la columna MONTO del Excel;
    - los retiros con Eduardo como quien entrega;
    - el efectivo que un chofer cobra en ventas de Eduardo o de ROHO.
14. **«Recoger de fábrica»:** la línea «🛏️ traer el comodín» va en el viaje a FÁBRICA, pero el comodín está en la casa del cliente. El texto es de §4eb.

### 13.5 POR ARREGLAR en el servidor (exige republicar el `.gs`)

La 23-b está congelada para implementarla hoy: no se toca. Propuesta: juntar esto en una versión siguiente, DESPUÉS de que la 23-b esté implementada y estable, con el mismo procedimiento de §7.
1. **Borrador de Kommo con la OC repetida** (`google-apps-script.gs:1131`). Si la OC automática choca, contesta `oc_repetida` en vez de renumerar como con un pedido nuevo, porque la fila del borrador ya existe (`foundRow` ≠ −1).
   - La vendedora ve «Verificá el número» sobre un campo que no puede editar. Al reintentar, el panel toma el número libre: no se pierde nada.
   - Arreglo propuesto: tratar la fila «Borrador Kommo» como nueva para renumerar. Reproducido con los dos `.gs`.
2. **`ocAutoGs_` no conoce la serie RPT.**
3. **El portero de día cerrado** mira solo la fecha nueva (13.4, punto 3), si el dueño decide cerrarlo.

### 13.6 POR ARREGLAR Y PARA ANALIZAR (lo que dejó la tercera vuelta)

**Confirmados, de bajo impacto, sin tocar.** Ninguno pierde plata ni stock en el uso normal:
- **ATC.** Mover con 📅, con el turno o con ✏️ una devolución YA entregada deja `pdev` en el día viejo: el chip
  vuelve a «🎧 ATC» y, si se destilda el ✅, la ATC no se reabre. Arreglo posible: `atcViajeDevolucion` en el
  `antes` de `atcSeguirViaje` (hoy `atcEnDevolucion`, que da falso con el ✅ puesto).
- **Chofer.**
  - `choRechazosHtml` no mira qué chofer está elegido: en un celular compartido, uno ve lo perdido del otro.
    Habría que guardar `rec.chofer` en el rechazo.
  - `choCobrarMetodo` acepta «-1500» como Bs 1.500.
- **«Entregado» y el Parte del día** no nombran el flete pactado sin cobrar: una venta pagada con Bs 150 de flete
  dice «Sin saldo» y «Por cobrar: Bs 0». Es el mismo hueco que se cerró en la hoja de ruta.
- **Mis pedidos.** `cobrarFlete` reemplaza el pago en curso sin guardarlo por venta: una imagen ya subida en otra
  venta queda huérfana en Drive.
- **Montos con signo menos:**
  - el retiro y el arqueo aceptan «-500» como 500;
  - `montoNegativo` no ve «Bs. -500»;
  - en «Corregir precios y montos», un precio negativo se borra en silencio en vez de frenar.
- **Lista de carga.** `textoCargaChk` nunca borra las tildes viejas de ventas de tienda.
- **Stock.**
  - Con la casilla «solo sin marcar» MARCADA, si desde la misma revisión se toca «🚚 Programar la recogida» y se
    vuelve, la línea pasa a ✗ con la recogida en camino. Exige decidir qué marca llevan esas unidades frente al
    orden acá → Banzer → IM.
  - La nota `noHayViejo` de la tabla no sale nunca (`test_stock` la fija en 0, §4de).
- **Cuadre.** En «Todo», el aviso de pagos sin fecha dice «ni en el detalle de abajo», pero ahí sí salen.

**Plausibles, sin reproducir:**
- **Pago mixto.** Si se registra el saldo el mismo día y con el mismo recibo que el adelanto, `mixtoDe` ve dos
  candidatos y deja de reconocer el 2° método. La plata del historial no cambia; lo que se desalinea es el
  formulario.
- **Cerrar día con el servidor `busy`.** La fila queda en la cola.
- **Foto.** Sale un aviso rojo de más cuando la foto entra al segundo intento.
- **Stock.**
  - Con un Excel de la tarde, una llegada que entró antes del reporte pero se anotó después de subirlo se cuenta
    dos veces (la regla por hora de §4fz-b).
  - Una recogida anterior al 14/09 sin `de` no se descuenta de lo libre en Moreno.
- **Arqueo.** «↺ Borrar lo anotado» puede pedir dos clics justo después de tipear.
- **Formulario.** Un precio escrito antes de pasar la venta a RPT se guarda escondido.
- **Transición.** Hasta que todos recarguen:
  - una fila de cierre o de carga que dejó en la cola la página del 25/09 se manda tal cual;
  - la página del 25/09 puede podar una llegada anotada después del Excel de la tarde.

### 13.7 Qué le pido a Codex

1. **Revisar lo publicado hoy: `394f74c..a8e3c5e`.** En especial:
   - `parseMonto` (`0b04944`) con lo que se pega de WhatsApp, y el paso a texto de los campos de plata
     (`bdbb4ac`);
   - `REESCRITAS` / `mandarReescritaDeCola` en `flushPending` (`9db5e72`): es código de la cola que usan todas
     las filas;
   - `guardarCierres` + `CIERRES_CAMBIOS`, y las tildes de la carga con `CARGA_CAMBIOS`;
   - `choEntregado` (reaplica el ✅ una vez) y `rechazoResuelto`;
   - la recepción `nr` y su marca de 0 unidades en `rs` (`714ebdd`), con la página del 25/09 abierta;
   - `ctaMontosRecordar` y el cancelar de `ctaGuardarMontos`;
   - `stockEntradaVale` por hora, y la entrada de una recepción con su `ts` (`41a9a39`);
   - `cantidadesMal` y `montoNegativo`: ¿traban algún caso legítimo? Los descuentos no son precios negativos: son
     «los precios suman más que el total».
2. **Dar su opinión sobre cada punto de 13.4.** Qué recomendaría; decide el dueño.
3. **Revisar el alcance y el orden de 13.5.**
4. **Decir cuáles de 13.6 arreglaría ya.**
5. **Decir qué uso real no probamos.** Lo que las pruebas no cubren y el equipo hace todos los días.

## 14 · Respuesta a la revisión de Codex del 26/09

Codex revisó `df3594d` y reprodujo cinco problemas con `tests/audit_codex_26.cjs`, un diagnóstico sin aserciones.
Ese archivo no está en el repo: lo tiene el dueño. Acá cada reproducción quedó como una prueba **que falla con el
comportamiento de antes y pasa con el arreglo**, como pidió Codex. Los cinco estaban **CONFIRMADOS** y quedaron
**ARREGLADOS** en la rama. **Todavía no están publicados**; espero el OK del dueño.

| # | Hallazgo | Arreglo | Prueba (rojos con lo de antes) |
|---|---|---|---|
| 1 | ALTA · cobro perdido sin aviso (`rechazoPerdido`: método + monto, sin multiplicidad ni fecha) | Compara cobro por cobro con clave método\|monto\|fecha\|quién recibió; cada cobro de la planilla vale por uno de acá. Sin id propio en `metodoPago` (ponérselo cambiaría el formato); ante la duda, avisa de más | `test_codex26.js` §1 (2) |
| 2 | ALTA · el ✅ reintentado marca el viaje reprogramado (`choEntregado`) | Reaplica solo si la fila del servidor es el MISMO viaje: fecha, y en una ATC recojo o devolución (`atcViajeDevolucion`). Si no, no marca, avisa y queda en el cartel del chofer con adónde lo pasaron | `test_codex26.js` §2 (6) |
| 3 | ALTA · dos dispositivos pisan los días cerrados | Se hizo lo que pidió Codex, «validando revisión y reintentando una mezcla», en el servidor y bajo candado. El panel manda el sello con el que leyó y `juntar`; el `.gs` **2026-09-26-a** (`SISTEMA_JUNTA_OPCIONAL`) compara bajo el candado y, en conflicto, devuelve la fila actual; el panel aplica solo lo suyo y reguarda. Vale también para las tildes de la carga. Un panel sin `juntar` no se traba | `test_codex26_cierres.js`: dos navegadores contra el `.gs` real, 5 rojos con la página publicada y 4 con el `.gs` 23-b; `test_servidor.js` §14 (4 rojos con la 23-b) |
| 4 | MEDIA · el aviso pendiente desaparece a las 48 h | Dura hasta «Ya lo revisé». Además es de cada chofer, «Ya lo revisé» marca solo lo suyo y el tope de 20 rechazos ya no tira lo que nadie revisó | `test_codex26.js` §4 (6) |
| 5 | MEDIA · entradas mal formadas valen otro número | `montoError(t)` valida el texto ENTERO antes de `parseMonto`, en todos los formularios de plata (formulario, Contabilidad, Cuadre, retiro y chofer). `montoNegativo` reconoce los ocho signos menos | `test_rev4_montos.js` (111) |

**Las prioridades que marcó Codex** (`test_rev4_atc_flete.js`, 41 rojos):
- signos negativos en cobros, retiros y arqueos: dentro de 5;
- reprogramación y reapertura de la ATC: mover una devolución ya entregada ahora usa `atcViajeDevolucion`;
- el flete omitido al mostrar que no queda deuda: «Entregado» y el Parte del día;
- además: `cobrarFlete` ya no pierde el pago en curso de otra venta, la carga poda las tildes viejas sin fecha y el
  aviso de pagos sin fecha dice la verdad en cada modo;
- los avisos por chofer: dentro de 4.

**Batería sobre `f70311e`: 99 suites, 3.696 bien · 0 mal.**

**Sobre «no se verificó contra producción».** El dueño implementó la 23-b hoy alrededor de las 10:30:
- anotó antes la versión 30 (la 20-a) para volver atrás;
- `probarAntesDeImplementar` salió todo ✅, con el stock en 20.932 de 50.000 letras;
- el panel dice «Conectado»;
- falta su captura del cuadro de versión.

Desde esta sesión no puedo abrir Google ni correr el workflow de Actions (403), así que la versión la confirma él.
La **2026-09-26-a** se implementa con el mismo procedimiento de §7: la página nueva anda con la 23-b y con la 26-a, y
la de hoy anda con la 26-a.

**Lo nuevo del dueño hoy.** Banzer es un depósito del que salen camiones, no un lugar al que hay que ir a buscar
(«solo de Moreno hay que ir a traer»). Hoy el panel descuenta de fábrica lo que sale de Banzer y lo manda a
«recoger». Está en curso: `BITACORA_CLAUDE.md` §4gd.

**Qué le pido a Codex:**
1. Revisar `a8e3c5e..f70311e`, sobre todo:
   - `reescritaJuntarYGuardar` + `SISTEMA_JUNTA_OPCIONAL`: ¿alguna carrera que el sello opcional deje pasar?
   - `montoError`: ¿algún formato legítimo que ahora se frene?
2. Correr su `audit_codex_26.cjs` contra la rama. Con los cinco en verde, pasarlo a pruebas con aserciones
   (`tests/`).
3. Cuando esté, mirar el cambio de Banzer: es el más delicado (cuentas del stock por depósito).

## 15 · Lo publicado desde §14 (26/09 17:15 → 27/09 12:58) — para que lo revises

**Estado al 28/09.** La página en producción es `main` = **`2040720`** (27/09, 12:58 de Bolivia, Pages 1532 en verde).
El servidor sigue siendo el **`.gs` 2026-09-26-a**: nada de esta sección lo tocó. Son siete publicaciones, todas
con el OK del dueño y con la batería completa en verde antes de salir. Cada arreglo tiene una prueba que falla con
la versión anterior. Para volver atrás, el volver de cada una es la anterior de la tabla.

| Publicado (Bolivia) | `main` | Qué | Prueba (rojas con lo de antes) | Batería |
|---|---|---|---|---|
| 26/09 17:15 | `39b833c` | **Banzer es un depósito del que salen camiones** (§4ge). Antes el panel lo trataba como un lugar al que hay que ir a buscar | `test_banzer_salida.js` 77 (62 contra `e2e613a`) | 100 suites, 3.773 · 0 |
| 26/09 19:38 | `2c777fe` | Revisión del stock y los almacenes después de Banzer (§4gf) | `test_rev_banzer.js` 25 | 100 suites, 3.797 · 1 suelta¹ |
| 26/09 20:40 | `caef927` | Revisión de Pedidos a fondo (§4gg) | `test_rev5_pedidos.js` 49 (30 contra `2c777fe`) | 102 suites, 3.848 · 0 |
| 26/09 21:21 | `13d00ee` | Dos decisiones de plata del dueño en el formulario (§4gh) | `test_rev6_plata_form.js` 52 (42 contra `e1e207b`) | 103 suites, 3.900 · 0 |
| 26/09 23:14 | `bd5dde3` | «Nuevo pedido» y «Mis pedidos» desde el celular (§4gi) | `test_rev7_celular.js` 35 (20 contra `13d00ee`) | 104 suites, 3.935 · 0 |
| 27/09 11:16 | `fecb3c6` | **El saldo del almacén debajo de cada producto del formulario** (§4gj) | `test_saldo_almacen.js` 83 (73 contra `bd5dde3`) | 105 suites, 4.018 · 0 |
| 27/09 12:58 | `2040720` | Revisión de ese saldo: medida especial y código de otra medida (§4gk) | `test_rev8_saldo.js` 55 (23 contra `fecb3c6`, 10 más contra `89512b1`) | 106 suites, 4.074 · 0² |

¹ `test_borradores` 94/1 con la máquina cargada; solo, 95/0 tres veces.
² La corrida anterior dio 7 rojas en `test_ubic` (6) y `test_rev2_cuadre` (1), dos pestañas que el cambio no toca:
solas pasaron 5 veces y la batería siguiente salió entera en verde. `test_ubic` mide un «servidor lento a propósito»
con relojes de verdad, y con 4 suites en paralelo puede perder la carrera.

### 15.1 · Banzer, depósito de salida (§4ge, §4gf)
El dueño: *«salen camiones de la banzer y de productos terminados fábrica; solo de moreno hay que ir a traer»*.
- **Quién es de salida lo dice una sola función, `almEsSalida(nm)`**: manda el rol elegido al subir el Excel
  (`STOCK.al`: `'sale'`/`'trae'`); con el `'otro'` de antes decide `ALM_SALIDA=['Banzer']`. IM nunca es de salida.
- **La marca**: «✔ hay en Banzer» = `chk:'ok'` + `chkDe`; partida, `chkDes`. El tipo de cada parte lo da el lugar
  (`prodPartes`: `aca`/`sale`/`trae`). `prodHay(x)` = se carga; `esRecoger(x)` = hay algo que ir a buscar.
- **Cuentas**: lo entregado desde Banzer baja `STOCK.g[Banzer]` (`salSale`, con su propio `g[nm].inc`); lo
  disponible para cargar es `stockHaySalir(o)` = acá + Banzer. El orden del dueño no cambió: acá → Banzer → IM, y
  «el que la cubre entera» primero (confirmado por él a las 19:35).
- **Transición**: las marcas viejas «📥 Banzer» se leen como ✔ Banzer sin reescribir la planilla, salvo las que
  tienen una recogida de Banzer anotada (`saleRecogidaViva`), que siguen como recogida hasta cerrarla.
- **Lista de carga** en dos bloques: «🏭 Cargar en fábrica» y «🏪 Cargar en Banzer» (clave `…|@Banzer`).
- §4gf: `normNombre`, `stockNorm` y `stockAlmLimpio` recuerdan su resultado (memo con tope). La lista de carga de
  «Todos» con 900 pedidos bajó de ~1 s a 0,16 s. **Tienen que seguir siendo puras.** `leerStock` repone `g[nm].inc`
  desde el historial cuando una página vieja lo borró.

### 15.2 · Pedidos y plata en el formulario (§4gg, §4gh)
- **Un pago ya registrado no se cambia callado desde el formulario** (`EDIT_PLATA0`): si con los montos iguales se
  tocó el método, el banco o el «Monto total cobrado», pregunta y manda a Contabilidad.
- **Corregir el PRECIO conserva los pagos** (decisión del dueño, `_soloPrecio`): fecha, recibo, `>chofer`,
  imágenes, adelanto, mixto y flete quedan; el saldo y «pagado» se recalculan como `aplicarCobros`. Si cambió «A
  cuenta», se corrige solo el adelanto (`_rehaceAdel`). «¿Borrar el historial?» se pregunta solo si de verdad se va
  un pago (`_seBorran`).
- **«SÍ, pagado» al editar una venta con pagos** (decisión del dueño, `pagoRestoPrev`): lo ya cobrado queda en su
  día y lo que faltaba entra HOY como cobro nuevo, con su imagen si es QR o tarjeta.
- `cobradoFueraDeAcuenta(p)`, `pagadoSugerirTotal`, `PAGO_NO_VISTO` (tocar SÍ y después NO repone los montos).
- **Lecturas tardías**: `BORRADO_AQUI` (90 s) impide que una lectura vieja devuelva lo recién borrado, y
  `mergePending` conserva lo guardado acá hace menos de 90 s que la lectura todavía no trae.
- ATC/RPT → OC toma el número de las OC de su mes; editar no cambia el vendedor recordado; en una RPT, elegir otra
  sucursal reemplaza lo que puso la anterior.

### 15.3 · Desde el celular (§4gi)
- **ALTA arreglada**: «＋ Nuevo pedido» con una edición abandonada seguía siendo esa edición, y el pedido nuevo
  **pisaba la venta anterior** en la planilla. Ahora `tabNuevoPedido` pregunta y arranca uno nuevo.
- Los avisos (`toast`) usan el ancho de la pantalla, no tapan Guardar y duran lo que lleva leerlos (`toastMs`).
- Mis pedidos cuenta por la fecha de ENTREGA (decisión del dueño) y los filtros van justo arriba de la lista.

### 15.4 · El saldo debajo de cada producto (§4gj, §4gk) — lo más nuevo
El dueño pidió que la vendedora, al cargar un producto, vea si hay y qué decirle al cliente. Primero pidió una
pestaña y después, en vez de eso, un aviso en el formulario.
- **Un cuadrito debajo de cada producto** (OC y RPT; nunca ATC, venta de tienda, entregados ni productos de
  tienda): ✅ disponible · 📥 hay en Moreno (1 día) · ⏳ en producción (llega el DD/MM) · 🏭 no hay (mandar a
  producir). Debajo, «En almacén · Pendientes de entrega · Libres/Faltan», con **libre = saldo en almacén −
  pendientes de entrega** (al editar, el propio pedido no se cuenta).
- **Una sola cuenta**: todo sale de `stockData()`, la misma de Stock y reposición (`saldoDatos`/`SALDO_CACHE`, una
  vez por lectura), y de `saldoVeredicto`. `stockData` ganó `enRecogida` y un argumento opcional para productos del
  catálogo que no están en ningún Excel; sin él da lo mismo que antes (comparado contra `bd5dde3`).
- **Los «~X días»** son días reales hasta el primer día de entrega con cupo; sin cupo, domingo y días cerrados se
  saltan. Si la fecha elegida es antes, una línea roja (solo avisa).
- **Siempre al día**: se repinta con cada lectura; al completar un producto con la última lectura de más de un
  minuto, lee de nuevo (tope: una por minuto por dispositivo); 🔄 Actualizar, **como mucho una vez cada 15 s**
  (decisión del dueño; con la última lectura fallida lee igual).
- **Al guardar**, si algo no tiene saldo libre o la fecha es antes de lo posible, un `confirm` con la planilla
  recién leída. Aceptar guarda igual: nunca frena la venta.
- **La revisión (§4gk)** encontró cinco errores. Los tres primeros eran renglones que no salen del saldo y a los que
  el cuadrito contestaba con el saldo de OTRO colchón:
  - 📐 **Medida especial** («Otros 150x200»): antes decía «✅ DISPONIBLE» con el stock del 160x190. Ahora, en azul,
    «se fabrica a pedido: ~X días». El código de la medida estándar se **borra solo** (decisión del dueño) al salir
    del campo y al guardar. ⚠️ **Nunca en un renglón ya guardado tal cual**: lo de logística lo sigue por
    `prodClave` (`heredarMarcas`) y se perdería; ahí el cuadrito avisa «borralo».
  - 🏷️ **Código de otra medida** (se elige 160x190 y se cambia a 140x190): avisa y dice cuál es el bueno.
  - 🏭 **Lo ya mandado a fabricar para ESE pedido** dice cuándo llega, en vez de «no hay, mandá a producir».
  - Una ATC que pasa a OC pregunta al guardar.
  - En una RPT, la pregunta habla de la sucursal.
  - Además, el filtro «🔵 Especiales» ya no marca «160X190CM».
- **Ventana que queda, dicha al dueño**: dos vendedoras que guardan la última unidad en los mismos 1-3 s la venden
  dos veces, porque el servidor no revisa stock. La lectura siguiente les muestra «Faltan» a las dos.

### 15.5 · Lo que espera al dueño (no se tocó)
- **Celular**: encabezado alto; aviso antes de perder un pedido nuevo a medio escribir al abrir otra edición; botones
  chicos (✕ de comprobantes 22 px, «📎 abrir imagen» 18 px); detalles de la venta de tienda.
- **Banzer**: cerrar o cancelar las recogidas de Banzer anotadas antes del 26/09 a las 17:15; la ficha de una línea
  Banzer + IM enciende solo «📥 IM»; «Qué producir» dice «sin contar» si acá no hay Excel pero Banzer sí.
- **Saldo**: al cambiar a otra medida NORMAL, poner solo el código correcto (hoy solo avisa); cuántos cortes
  guarda el historial (hoy 14 en total, entre todos los almacenes).
- De antes (§4ga, §4fy): Moreno con unidades fantasma si se entrega una línea 📥 sin anotar la recogida; recojos de
  ATC en «A cargar»; sacar un pedido de un día cerrado sin clave; la celda de 50.000 letras del stock; `ocAutoGs_`
  sin RPT; MEDIA-4 y MEDIA-5; el `SUMA` de MONTO en el Excel del Cuadre; «Entrega» es la fecha agendada.
- El número de la versión 23-b en Google, para poder volver atrás de la 26-a.

### 15.6 · Qué le pido a Codex
1. **Revisar `e2e613a..2040720`** (solo `pedidos.html` y las pruebas; el `.gs` no cambió). Lo más delicado:
   - **Banzer** (`almEsSalida`, `prodPartes`, `stockAsignar` con `tomarIM(solo)`, `salSale`, `stockHaySalir`): ¿alguna
     unidad que se cuente dos veces o se pierda entre acá, Banzer e IM, sobre todo con marcas de la página vieja?
   - **Los memos** (`normNombre`, `stockNorm`, `stockAlmLimpio`): ¿alguno depende de algo que no sea su texto?
   - **El formulario de plata** (`_soloPrecio`, `_rehaceAdel`, `pagoRestoPrev`, `EDIT_PLATA0`): ¿algún camino que
     borre o duplique un pago ya registrado?
   - **`BORRADO_AQUI` y `mergePending` a 90 s**: ¿una carrera con OTRO dispositivo que borre o cambie lo mismo?
   - **El saldo** (`saldoVeredicto`, `saldoClasificar`, `codigoEspecialBorrar`): ¿algún renglón que muestre el
     saldo de otro producto, o que pierda lo de logística al guardar?
2. Correr su auditoría contra `2040720` y pasar a `tests/` lo que encuentre, con pruebas que fallen antes del
   arreglo, como en §14.
3. Opinar sobre la ventana de §15.4: ¿vale la pena que el servidor revise el stock al guardar? Eso exige republicar
   el `.gs`.

## 16 · Respuesta a la revisión de Codex del 28/09 (sobre §15)

Codex revisó `2040720` y dejó `tests/test_codex28.cjs`: 5 aserciones rojas y 3 controles. Los reproduje igual (5 rojas, 3
controles en verde) y los **cuatro hallazgos quedaron CONFIRMADOS y ARREGLADOS** en la rama, con pruebas que fallan con lo
de antes. **Todavía no está publicado**: espero el OK del dueño. La prueba de Codex quedó en `tests/` con sus 8
comprobaciones intactas; solo le agregué la línea «N bien · N mal» para la batería, y el JSON va a la carpeta temporal
en vez de la raíz del repo.

| # | Hallazgo | Arreglo | Pruebas (rojas con lo de antes) |
|---|---|---|---|
| 1 | ALTA · un pedido borrado desde otro equipo se recrea | **Panel:** cada lectura marca en qué momento se pidió (`apiList` → `_pedidaN`) y cada guardado confirmado, en qué momento se confirmó (`aplicarSello` → `okN`). Si una lectura pedida DESPUÉS de la confirmación no trae la fila, se toma como borrada: sale de la pantalla y avisa (`borradoFuera`). Si la lectura se pidió antes, es atrasada y manda lo de acá. Es un contador (`RED_N`), no la hora: con reloj fijo «antes» y «después» coincidían. `submitPedido` no guarda si la lectura de justo antes ya no trae el pedido. **Servidor 2026-09-28-a:** un guardado CON sello de una fila ausente → `borrado`, sin tocar la hoja. Las filas fijas del sistema (`__…` salvo `__ret_…`) pueden volver a nacer. Un alta nueva no trae sello, y su reenvío tras perder la respuesta sigue siendo `conflicto` (el ok tardío). El panel trata `borrado` como «no» firme: lo saca de la pantalla y de la cola, lo anota en rechazos con lo que se perdió y avisa | `test_codex28.cjs` 2 · `test_codex28_flujos.js` §1-4 (11) |
| 2 | MEDIA · una recogida futura se promete en un día | `saldoEntradas`: lo que no está a mano se ordena por fecha. Lo de Moreno sin programar llega en `STOCK_DIAS_RECOGIDA`; cada recogida, en SU `llega`, y `enRecogida` se reparte sin pasarse (el total no cambia). Se consume primero lo ya vendido. Cartel: «🚚 VIENE DE MORENO · logística lo trae el lunes 05/10: programá desde el martes 06/10 (si logística la puede adelantar, que te lo confirme)». Si la recogida está atrasada, se dice | `test_codex28.cjs` 1 · `test_rev8_saldo.js` §10 (5) |
| 3 | MEDIA · una revisión más nueva queda oculta 90 s | `localManda`: en vuelo, esperando turno o en cola manda acá. Ya confirmado: si la lectura trae la fila, gana el sello mayor. Vale también para los retiros | `test_codex28.cjs` 1 · `test_codex28_flujos.js` §5 (1) |
| 4 | BAJA · sin cupo se propone un día cerrado | `saldoDiaConCupo` → `{ f:'', sinCupo:true }` y `saldoPonerDia` no promete día («⚠️ SIN CUPO…», en ámbar), en todos los tipos | `test_codex28.cjs` 1 · `test_rev8_saldo.js` §11 (4) |

**Qué cubre cada mitad del #1.** `test_codex28_flujos.js`, dos equipos contra el `.gs` real:
- **Página nueva + `.gs` 2026-09-28-a:** 23/23.
- **Página `2040720` + `.gs` 26-a:** 10/23. Fallan las 13 que deben fallar; los 4 controles pasan en las dos combinaciones.
- **Página nueva + `.gs` 26-a:** 16/23. Sin el servidor nuevo quedan abiertos:
  - una corrección sin relectura: no mueve la fecha ni cambia productos, así que el formulario no relee antes de guardar;
  - la cola de un celular sin señal;
  - un retiro borrado.

  Eso es lo que Codex señaló como previo a esta vuelta. Se cierra con el `.gs` 28-a.

**Lo que probé antes de generalizar el rechazo, como pediste:**
- un alta nueva sin sello: entra;
- el reenvío de un alta cuya respuesta se perdió: `conflicto`, que es el ok tardío del panel;
- una fila fija del sistema borrada de la hoja: vuelve a nacer;
- un retiro borrado: `borrado`;
- la cola sin señal: sale de la cola con lo perdido anotado, sin reintentar para siempre;
- completar un borrador de Kommo: conserva el id y el sello de su fila.

**Límite que queda.** `doGet` contesta con la misma forma que la lectura por POST y usa una caché de 20 s. Si Google
convirtiera la lectura del panel en GET (§4fx) y la caché fuera anterior a un guardado, el panel tomaría como borrado un
pedido recién guardado:
- desaparece de la pantalla, con el aviso, hasta la lectura siguiente;
- en la planilla no se pierde nada.

El arreglo de fondo es que el servidor informe la hora de su lectura en la respuesta: otra versión del `.gs`, que no hice.

**Stock en el servidor.** Coincido: no bloquear la venta sin stock, y antes definir en el `.gs` las mismas reglas que
`stockData`. No se hizo; lo decide el dueño.

**Batería sobre esta rama:** 108 suites, 4.116 bien · 0 mal (la primera corrida atajó que `probarAntesDeImplementar` seguía diciendo 26-a: corregido).

**Qué le pido a Codex:**
1. Revisar `2040720..` la rama, sobre todo:
   - `localManda` y el contador `RED_N`: ¿hay alguna lectura que no pase por `apiList` y que no deba contar como
     «pedida después»?
   - la regla `borrado` del `.gs`: ¿hay algún camino legítimo que guarde con sello una fila ausente que no sea del sistema?
2. Correr `tests/test_codex28.cjs` y `tests/test_codex28_flujos.js` contra la rama, y con `GS=` apuntando al `.gs` 26-a para
   ver qué queda sin el servidor nuevo.

## 17 · Eduardo → Multicenter en la proyección de stock (28/09) — hecho y probado, SIN publicar

El dueño pidió que la proyección de stock incluya las ventas de Eduardo a Multicenter y que las demás reglas no
cambien. Está en la rama `claude/pedidos-fecha-entrega-bgt0em`, junto con §16 (que tampoco está publicada).
Detalle en `BITACORA_CLAUDE.md` §4gm.

**La regla.** No se sacó ninguna de las dos exclusiones: se agregó una excepción explícita, en el orden pedido.
`stockPedidoUnico(p)` evalúa, en este orden:
1. `esRPT` → `true`;
2. `stockEduardoMulticenter(p)` → `false`;
3. `stockPuntual(p)` → `true`;
4. `stockEsEduardo(p)`.

Las identidades se definen UNA vez y las usan la exclusión y la excepción:
- `stockEsMulticenter`: la palabra entera «MULTICENTER» en `normNombre(cliente)`. No hay id de cliente: el pedido no lo
  trae y Kommo tampoco lo manda. Los tableros de ventas del repo (mayo a agosto) lo escriben «MULTICENTER» o
  «Multicenter» y nada más. «multi» a secas, «MULTI CENTER» y «MULTICENTRO» NO cuentan.
- `stockEsConsignacion`: manda también sobre Multicenter.
- `stockEsEduardo`: la prueba de siempre.

| Lo que pidió el dueño | Dónde | Prueba (`tests/test_eduardo_multicenter.js`) |
|---|---|---|
| Eduardo → Multicenter entra al ritmo de 15 d, a los 30 d, al índice mensual, a 60/90 d y a la tendencia | todo pasa por `stockPedidoUnico`: `stockData` (15 d y 30 d) y `ventasPanelIndex` (→ `stockRangoMes`) | §1: +8 en 15 d, +14 en 30 d, agosto +18 y septiembre +8 en el índice; 7 d, 15 d y octubre suben |
| Eduardo → otros clientes, afuera | paso 4 | §2 (y §6 al cambiar el cliente) |
| Multicenter de otro vendedor, sin cambios | paso 3, `stockPuntual` intacto | §3 (y §6 al cambiar el vendedor) |
| Consignación y los otros puntuales, afuera | `stockEsConsignacion` gana; paso 3 | §0 y §2 |
| RPT: no es venta, sigue en «Qué va a pedir cada tienda» y no se suma a «Qué producir» | paso 1; `stockTiendas` sin tocar | §4 |
| Lo pendiente compromete una sola vez | `comp` como siempre, con `max(comp, ritmo)` | §5: el pendiente solo de 5 con 2 en depósito da «pedir 3» |
| Cambiar cantidad, cliente o vendedor recalcula todo, índices incluidos | no hay caché de la regla: el índice se arma de cero y `SALDO_CACHE` se renueva con cada lectura | §6. El cuadrito del formulario NO cambia con esta regla (usa lo pendiente de todos): la prueba lo compara con `2040720` y da igual (§18) |
| Las demás ventas del equipo no cambian | — | §7: sin Eduardo → Multicenter, cada número es IGUAL al de `2040720` con los mismos pedidos |
| Mismos umbrales | `STOCK_VENTAS_MIN`, `alta` sin tocar | 40 en UNA entrega: `baja`, sin ritmo, «pedir 0» |

**Ejemplo** (TITANIO ICE 160x190, acá 3 · Moreno 2, los mismos pedidos, reloj el 10/09/2026):

| | antes (`2040720`) | después | aporte de Multicenter |
|---|---|---|---|
| 15 d: unidades · entregas | 10 · 5 | 18 · 6 | 8 en 1 entrega |
| rotación · por día | media · 0,667 | alta · 1,2 | pasa el umbral de `alta` (≥15 en ≥2 tramos) |
| margen · reserva (días) | 2 · 3 | 4 · 7 | |
| pedir (recoger · fabricar) | 3 (2 · 1) | 14 (2 · 12) | |
| «Qué producir»: 7 d · 15 d · octubre | 1 · 9 · 15 | 12 · 22 · 22 | |
| 30 d: unidades · entregas | 18 · 9 | 32 · 11 | 14 en 2 entregas |
| índice agosto · septiembre | 14 · 10 | 32 · 18 | +18 · +8 |
| estimaciones de octubre | 30 d 18,6 · 60 d 12,7 · 90 d 15 · oct-25 8 · tendencia 24 | 30 d 33,1 · 60 d 21,9 · 90 d 21,1 · oct-25 8 · tendencia 24 | la tendencia no se mueve: ya estaba en el tope ×3 |

**Límites reales del histórico.** `VENTAS_HIST` (el consolidado del sistema, ene-25 a jul-26) trae unidades por
producto y por mes. No dice vendedor ni cliente, y trae TODAS las ventas del sistema. Ahí no se puede separar a
Multicenter, y no se inventó ninguna separación. Lo usan:
- «mismo mes del año pasado»;
- el divisor de la tendencia;
- los meses de antes de 2026-08 en 60 d y 90 d. Al 28/09, 60 d = agosto (panel) + julio (sistema).

Esas estimaciones ya mezclaban «solo el equipo» con «todo»; con Multicenter adentro, la diferencia se achica. El
cartel de «Qué producir» lo dice.

**Dos efectos que el dueño tiene que decidir** (no los resolví solo porque serían reglas nuevas):
1. **Los umbrales miran el producto, no la compra.** Las ventas de Multicenter se suman a las del equipo antes de
   medir `media`/`alta`. En el ejemplo, 8 de Multicenter llevan el producto de `media` a `alta`, y la reserva sube de
   3 a 7 días.
2. **El plan del mes que viene no tiene umbral de entregas, para nadie.** 60 d y 90 d promedian meses enteros del
   índice. Con el producto rotando por el equipo, una compra ÚNICA de 40 de Eduardo a Multicenter en agosto sube
   «producir en octubre» de 9 a 24 (`test_adm_alta` §3). La mediana no alcanza: 60 d pasa de 8,7 a 29,1, 90 d de
   12,2 a 25,8, y la mediana salta a la tendencia (24). Con una venta grande del equipo pasa lo mismo desde siempre.
   Si el dueño no lo quiere, la opción más simple es que en el índice mensual Multicenter cuente solo con sus
   propias 3 entregas del producto en la ventana de 90 días. El costo: si Multicenter compra una vez por mes, en 90
   días tiene 3 entregas y cuenta; si compra menos seguido, no cuenta.

**Decisión del dueño (28/09):** las compras grandes y sueltas de Multicenter no se cargan al panel, para no entorpecer
los pedidos regulares. Por eso no hay tope nuevo en el código. Se le avisó que esas unidades, si salen de un depósito
contado, el panel no las aparta ni las descuenta hasta el Excel de existencias siguiente, y que «Qué producir» no las
pide. Se propuso una marca en el cliente («PEDIDO ÚNICO») para cargarlas como pedido único, y el dueño la
descartó: los pedidos grandes van directo a logística, que los fabrica aparte para no dejar sin stock a los
vendedores.

**Archivos:**
- `pedidos.html`: la regla, dos contadores para los textos, los textos y los comentarios.
- `tests/test_eduardo_multicenter.js` (nueva).
- `tests/test_adm_alta.js` §3, cambiada a conciencia: la venta de 40 de Eduardo pasó a otro cliente, y se agregó el
  caso de Multicenter y el texto nuevo de la cabecera.
- `BITACORA_CLAUDE.md` §4gm, `CLAUDE.md` y este informe.

**Pruebas:**
- `test_eduardo_multicenter.js`: 29 bien. Contra `2040720` (`PEDIDOS=`): 17 rojas, y ahí pasan las de «lo que no
  cambia».
- `test_adm_alta.js`: 19 bien.
- Las 20 de stock, sin tocarlas: `test_producir`, `test_rotacion`, `test_rpt`, `test_ventas_panel`, `test_banzer`,
  `test_banzer_salida`, `test_rev_banzer`, `test_stock`, `test_revstock`, `test_rev_stock`, `test_rev2_stock`,
  `test_rev3_stock`, `test_saldo_almacen`, `test_rev8_saldo`, `test_consaldo` y las cinco `.cjs`.
- Batería completa: 109 suites, 4.145 bien · 1 mal. La roja fue `test_rev2_cuadre`, intermitente y anterior a este
  cambio: miraba la tarjeta del Cuadre 40 ms fijos después de tipear, y el repintado va en un `setTimeout`. Ahora
  espera el repintado: 7/7, también con cuatro corriendo a la vez.

## 18 · Antes de publicar (28/09): qué va, qué te pido y cómo probarlo

**Qué se publica.** Solo la página (`pedidos.html`) de la rama `claude/pedidos-fecha-entrega-bgt0em`. Contra lo
publicado (`main` = `2040720`) cambia en tres cosas:
1. §16: los cuatro hallazgos de tu revisión del 28/09 (`7f4a74e`).
2. §17: las ventas de Eduardo a Multicenter en la proyección de stock (`f08de8b`).
3. Lo que encontró mi revisión antes de publicar (abajo, «Mi revisión»; bitácora §4gn).

El servidor queda en 2026-09-26-a. El `.gs` 2026-09-28-a (`borrado`) está en el repo pero el dueño lo implementa
después de publicar la página. Hasta entonces «Cerrar día» muestra la línea gris de «versión vieja». Lo que necesita
el servidor nuevo está en §16 («Qué cubre cada mitad»).

**Decisiones del dueño, para no volver a proponerlas:**
- Eduardo → Multicenter es demanda: fue su pedido explícito (§17). Eduardo a otros clientes, Multicenter de otros
  vendedores, consignación, ROHO a tienda y las RPT siguen afuera.
- Las compras grandes y sueltas NO se cargan al panel. Van directo a logística, que las fabrica aparte: solo salen del
  almacén si hay la mitad del pedido y queda saldo para los vendedores. Por eso no hay tope nuevo en el plan del mes
  ni una marca «pedido único»: las dos cosas se propusieron y el dueño las descartó.
- El `.gs` 28-a y validar el stock en el servidor, «más adelante».

**Mi revisión antes de publicar** (dos agentes: uno con §17, otro con §16 contra el servidor 26-a):
1. **MEDIA, una regresión de §16, arreglada.** Pasaba así:
   - un `doGet` que empieza a leer la hoja antes de un guardado y termina después deja su foto vieja 20 s en la
     caché (§4du);
   - si Google convierte la lectura del panel en GET (§4fx), `localManda` tomaba esa copia por una lectura buena
     «pedida después»;
   - el pedido recién cargado salía de la pantalla con «lo borraron desde otro equipo», y su corrección enseguida NO
     se guardaba («hacelo como pedido nuevo»: un duplicado);
   - un retiro desaparecía sin aviso.

   Con los servidores 26-a y 28-a esa copia tiene la misma forma que una lectura buena.
   **Arreglo:** nada se da por borrado en los primeros `LECTURA_VIEJA_MS` = 45 s después de la confirmación.
   - Cada lectura lleva cuándo se pidió (`_pedidaT`) y cada confirmación, cuándo llegó (`okT`).
   - Las dos salen de `relojMs()`, que es `performance.now`: solo avanza.
   - El orden sigue saliendo de `RED_N`.

   El costo, a propósito: un borrado de verdad en esos 45 s se ve en la lectura siguiente pasada la ventana (antes de
   §16 eran 90 s). Una corrección dentro de esa ventana todavía recrea el pedido con la 26-a; la 28-a la rechaza.
   Prueba: `tests/test_lectura_vieja.js` (15). Da 9 rojas contra `7f4a74e` y 3 contra `2040720`, las de «detecta un
   borrado de verdad», que la publicada nunca hizo.

   `test_codex28_flujos` §1-2 (B borraba en el mismo segundo) ahora corre el `okT` de A para atrás (`pasaElTiempo`).
   Tu `test_codex28.cjs` quedó intacta y en 8/8: una lista sin marcas cuenta como pedida después de todo y sin copia
   vieja.
2. **BAJA, anotados para antes de implementar la 28-a:**
   - con equipos todavía en `2040720`, su cola reintenta `borrado` para siempre (F5 lo cura);
   - los textos de `borrado` en el cartel del chofer y en el formulario. **Quedan como están**, por decisión del dueño
     del 28/09: los choferes todavía no marcan ✅ ni cobros en el panel;
   - la 28-a no protege filas nunca selladas (`rev` 0).
3. **§17, todo BAJA, arreglado:**
   - una consignación de Eduardo a Multicenter mal escrita («MULTICENTER CONSIGNADO») contaba como demanda. Ahora
     `stockPareceConsignacion` (`/\bCONSIG/`) la saca, y los otros vendedores siguen con «CONSIGNACI…»;
   - `stockPuntual` usa las mismas funciones de identidad (`STOCK_PUNTUAL` ya no existe);
   - «Lo vendió Eduardo:» salía para un Multicenter de otra vendedora. Ahora lo dice `stockUnicoQuien`;
   - «0 de eduardo, excluidas» salía al lado de «incluye 6 de Eduardo a Multicenter»;
   - lo que se copia para la fábrica dice cuánto es de Multicenter, y que el mes es lo probable de cinco estimaciones;
   - yo había escrito que la regla cambia el cuadrito del formulario, y no lo cambia: usa lo pendiente de todos. La
     prueba ahora lo COMPARA con `2040720` y da igual;
   - las pruebas miran los números exactos del ejemplo.

   `test_eduardo_multicenter.js`: 35, con 21 rojas contra `2040720`.
4. **Sin confirmar:** si en los pedidos de Eduardo a Multicenter «MULTICENTER» va en el cliente o en «Facturar a». La
   regla mira el cliente, igual que la exclusión de siempre. Se le preguntó al dueño.

**Batería sobre la rama con todo esto:** 110 suites, 4.167 bien · 0 mal.

**Qué te pido:**
1. Revisar la rama contra `2040720` en `pedidos.html`, sobre todo:
   - que ningún camino haga desaparecer de la pantalla un pedido que SÍ está en la planilla con el aviso «lo borraron
     desde otro equipo» (`localManda`, `RED_N`, `LECTURA_VIEJA_MS`, `borradoFuera`), con el servidor 26-a;
   - si 45 s alcanzan, o si ves otra forma de reconocer la copia de `doGet` sin cambiar el servidor;
   - que `stockPedidoUnico` y las cuentas que cuelgan de ella (15 d, 30 d, `ventasPanelIndex`) hagan exactamente la
     regla del dueño.
2. Correr las pruebas desde la raíz del repo:
   - `node tests/test_eduardo_multicenter.js`: abre también la página publicada desde git; con `ANTES=<sha>` elegís otra.
   - `node tests/test_codex28.cjs`: tu prueba, intacta. Pide `CHROME_PATH` (el Chromium) y `NODE_PATH` (donde esté
     Playwright), como la escribiste.
   - `node tests/test_codex28_flujos.js` y `node tests/test_lectura_vieja.js`, que montan el `.gs` real. Con `GS=` los
     apuntás al 26-a (`git show 2040720:google-apps-script.gs`) y ves qué queda sin el servidor nuevo.
   - `./tests/correr.sh`: la batería entera.

## 19 · Respuesta a tu revisión del §18 (28/09, noche)

Gracias. Tomé las tres cosas.
- **Eduardo → Multicenter**: el dueño confirmó que Multicenter se escribe en el **Cliente**. La regla queda como la
  revisaste.
- **«45 s no garantizan que la lectura sea actual»: de acuerdo, y lo arreglé como recomendaste.** Pasada la ventana, la
  PRIMERA lectura que no trae un pedido confirmado acá es una sospecha:
  - `SAVE_ULTIMO[id].faltaT` = cuándo llegó esa lectura. El pedido se queda en pantalla y no se avisa nada.
  - `borradoConfirmarLuego` relee sola a los `BORRADO_CONFIRMA_MS` = 25 s.
  - Recién una lectura PEDIDA después de eso confirma el borrado. Si alguna lo trae, la sospecha se borra.

  El argumento: una copia de la caché dura como mucho `GET_CACHE_SEG` (20 s) desde que se escribe, y la que pudo traer
  la primera lectura ya estaba escrita cuando esa llegó. No es garantía: dos `doGet` lentos seguidos todavía podrían
  engañarlo, y así lo dejé escrito.
  No mostré un aviso en la sospecha: casi siempre es una copia vieja, y el panel ya relee solo. Solo se avisa con el
  borrado confirmado.
- **Los avisos de borrado ya no dicen «hacelo como pedido nuevo»** (tres en el formulario y el de `borrado` del
  servidor). Ahora dicen: «antes de volver a cargarlo, confirmá con administración que de verdad lo borraron». Así un
  falso aviso no termina en un duplicado.

Tu reproductor quedó en tu máquina. Escribí el mismo caso en `tests/test_lectura_vieja.js` §5 (el `doGet` lento de
46 s), con el `.gs` real:
- 21 comprobaciones;
- 6 rojas contra `5b39386`, tu caso incluido, y 6 contra `2040720`;
- con `GS=` apuntando al 26-a: 21/21;
- `test_codex28_flujos`: 23/23, y con la 26-a 16/7 como antes (esas 7 son lo que necesita el servidor).

**Lo que sigue abierto, como dijiste:**
- con la 26-a, la página sola no cierra todas las recreaciones de un pedido borrado: hace falta la 28-a;
- una garantía de frescura necesita un `.gs` que diga en cada respuesta de qué lectura sale (hoja o caché, y de
  cuándo). La 28-a no lo hace.

Si te parece bien, eso queda como la próxima versión del servidor.

**Batería sobre la rama con esto:** 110 suites, 4.173 bien · 0 mal.

## 20 · Lo publicado desde §19 y la revisión con cuatro agentes (28-29/09) — para que la mires

### 20.1 · Lo publicado desde §19 (todo en `main`, servidor sin cambios: 2026-09-28-a)

| Cuándo (Bolivia) | `main` | Qué | Bitácora |
|---|---|---|---|
| 28/09 18:28 | `bf19fc8` | Cuadrito del saldo: la hora en que entra el pedido (corte 17:00, sábado 12:00), Moreno sin hora, lo que se fabrica sale a las 48 h (2 días hábiles), `FERIADOS` hasta 2027. Y el botón «↩️ Era un pago de la venta» (`ctaEnvioAPago`) | §4gq, §4gs, §4gr |
| 28/09 19:14 | `6146f6d` | «📈 Proyección del mes» en Contabilidad, solo con la contraseña de Administración: lo VENDIDO por entrega agendada, por vendedor y marca, con el ritmo | §4gt |
| 29/09 00:24 | `a904137` | La proyección con la curva de cada marca (`pryCurva`, `pryMezcla` con peso f²), la prueba contra los meses cerrados (`pryPrueba`/`pryErrores`) y cómo se vendió cada mes (`pryPatron`) | §4gu |
| 29/09 01:10 | `040e1df` | «📊 A esta altura» (el mes contra otro al mismo día, en plata y en unidades; unidades = colchones y somieres), las fichas de Sueña y Heaven en Contabilidad → Ventas, y los montos largos que se achican para entrar (`fichasMontoEntero`) | §4gv, §4gw |

Batería sobre `644e2ab` (lo publicado a las 01:10): **114 suites, 4.376 bien · 0 mal.**

### 20.2 · Cómo se revisó

El dueño pidió revisar todo lo del 28 y 29/09 en stock, pedidos, días y proyección. Corrieron cuatro agentes, uno por
área. Solo leyeron el repo, sin tocar nada, y armaron escenarios con datos inventados: el panel real en Chromium y el
`.gs` real en Node, como `test_codex28_flujos`. Los scripts quedaron fuera del repo, y yo volví a correr los de los
hallazgos ALTA y los principales MEDIA: dan lo que dice acá.
Todas las pruebas existentes de cada área pasan. Lo que sigue son casos que ninguna prueba cubría.

**Nada de esto está arreglado todavía.** Te lo paso antes, para que opines sobre los arreglos propuestos.

### 20.3 · Hallazgos

#### ALTA

**A1 · Días: el cuadrito promete entregas en feriados.** (Viene de §4gj/§4gl; §4gs agregó `FERIADOS` solo para
fabricar y recoger).
- **Dónde:**
  - `saldoDiaConCupo` (`pedidos.html` ~17721) saltea domingos y días cerrados, pero no `FERIADOS`.
  - `limTurno` (~9891) da cupos en feriado, y `proximoDiaEntrega` (~1675) solo saltea el domingo.
  - El formulario y el portero del `.gs` (`porteroFecha_`) aceptan un feriado.
- **Reproducido** con el formulario real y el reloj clavado:
  - Jueves 24/12 10:00, con stock a mano: «✅ DISPONIBLE · podés programar desde mañana, viernes 25/12».
  - Miércoles 30/12, con stock en Moreno: «programá desde el viernes 01/01».
  - Domingo 01/11: «desde mañana, lunes 02/11» (Todos Santos).
  - Viernes 05/02/2027: «desde el lunes 08/02» (Carnaval).
  - Guardar con entrega el 25/12 pasa sin ninguna pregunta.
  - En una matriz de 582 cuadritos (97 momentos × 6 tipos), 64 prometen un día de `FERIADOS`. Los otros 518 cumplen
    la regla escrita.
- **Arreglo propuesto:**
  - Que `saldoDiaConCupo` saltee `FERIADOS[f]`: con eso quedan cubiertos todos los tipos de cuadrito.
  - Que la línea roja «para el … no llega» también salte cuando la fecha elegida es feriado.
  - Si el dueño confirma que el camión no sale en feriados: `limTurno` = 0 en feriado (panel y `.gs`), y
    `proximoDiaEntrega` los saltea, igual que el domingo en §4ex.
- ⚠️ **Falta que el dueño confirme** si se entrega en feriados. Nada en el repo dice que sí, y el 25/09 (feriado de
  Santa Cruz) el equipo no trabajó.

**A2 · Pedidos/plata: «↩️ Era un pago de la venta» fabrica un «pago mixto» que no existe.** (Regresión de §4gr,
publicada el 28/09 a las 18:28).
- **El caso habitual:** la vendedora carga «SÍ, pagado» y además el flete «Sí, ya lo cobré» en el mismo formulario.
  `_cobrarAhora` (~8714) lo escribe con el mismo día y el mismo recibo que el pago de la venta.
- **Qué pasa cuando Contabilidad toca el botón:**
  - `ctaEnvioAPago` (~7075) pasa ese cobro a los pagos de la venta tal cual.
  - `mixtoEn` (~8111) lo toma por el 2° método del mixto: con A cuenta 0 y la venta pagada, acepta cualquier cobro
    del mismo día y recibo (~8118).
- **Reproducido** con el formulario y el `.gs` 28-a reales (venta de Bs 3.000 en efectivo + flete de Bs 300 en efectivo):
  1. Después del botón, `mixtoDe` da «Efectivo 300».
  2. Corregir SOLO la dirección no se guarda: «El segundo método es igual al primero… quitá el segundo método».
  3. Si se sigue el aviso y se acepta «ese historial se borra», el pago queda `~Efectivo 3300 @<hoy>`. Los Bs 3.300
     se mudan del cuadre del día de la venta al de hoy.
- **Con un mixto de verdad** (Efectivo 1.000 + QR 500, más un flete del mismo día y recibo):
  - el mixto deja de reconocerse y `cobradoFueraDeAcuenta` da 800;
  - «SÍ, pagado» propone 3.500 para una venta de 3.000;
  - guardar lo propuesto anota Bs 500 que nadie cobró.
- **Arreglo propuesto:**
  - En `mixtoEn`: descartar candidatos con el mismo método y banco que el adelanto (el formulario ya lo prohíbe). Con
    varios candidatos, elegir el que cierra `acuenta`, en vez de devolver `null`.
  - En `ctaEnvioAPago`: comparar `mixtoDe` antes y después, y frenar o avisar si cambia.
- **Para analizar:** registrar en Contabilidad un pago el mismo día y con el recibo del adelanto probablemente dispara
  lo mismo, sin el botón. No está probado.

**A3 · Proyección: «📊 A esta altura» (y la curva) compara lo cargado HASTA AHORA con el DÍA ENTERO del otro mes.**
(Regresión de §4gv; la curva viene de §4gu).
- **Dónde:**
  - `pryVentas` guarda solo el día en que se cargó (`reg`, ~4466).
  - `pryAcum` corta el otro mes en `x.reg <= lim`, que es el día entero, mientras el mes en curso trae lo cargado hasta
    este momento.
  - `pryCurvaF` hace lo mismo con la historia contra la K de hoy.
- **Reproducido:** con 10 ventas por día hábil cargadas de 9 a 18 h, iguales todos los meses, «Todo el equipo» da:

  | Día | 09:30 | 13:30 | 20:00 |
  |---|---|---|---|
  | 14/10 | 1% arriba | 4% arriba | 7% arriba |
  | 02/10 | 2% arriba | — | 25% arriba |

  La curva de Heaven el 14/10 da Bs 404.997 a las 09:30 y Bs 423.745 a las 20:00. A la mañana el mes siempre parece
  peor de lo que va, y mucho peor en los primeros días: justo el número con el que el dueño dijo que ajusta campañas.
- **Arreglo propuesto:** usar el `ts` y cortar el otro mes a la misma hora de Bolivia, o cortar los dos al fin de ayer
  («al día 13»). Lo mismo en `pryCurvaF`. Me inclino por la misma hora, con el `ts`.

**A4 · Pedidos: un retiro de efectivo borrado vuelve a la planilla.** (Previo, no es regresión, pero la 28-a no lo
frena y `test_codex28_flujos` §3 lo daba por cubierto).
- **Dónde:**
  - `guardarRetiroForm` arma la fila con `filaDeRetiro` sin `rev` (~6280 → `persistRetiro` ~6089).
  - El `.gs` contesta `borrado` solo si llega `rev > 0` (`google-apps-script.gs` ~1126).
  - Además, en el control del sello (~1099/1114), el `.gs` trata `__ret_…` como fila del sistema.
- **Reproducido** con el `.gs` 28-a:
  - B borra un retiro y A lo corrige de 400 a 500 desde la ventana de retiros: la planilla lo vuelve a tener y A ve
    «Retiro actualizado en la planilla ✓».
  - Lo mismo pasa desde la cola sin señal.
  - Dos equipos corrigiendo el mismo retiro: gana el último y los dos ven ✓.
  - `test_codex28_flujos` §3 no lo agarra porque le pasa al servidor el sello de la hoja.
- **Arreglo propuesto:**
  - Al editar, mandar `RETIROS[i].rev` o `SAVE_REV[id]`: con eso la 28-a ya contesta `borrado`.
  - Para las correcciones simultáneas, que el `.gs` mire el sello también en `__ret_…`. Eso pide otra versión del
    servidor.

#### MEDIA

**M1 · Pedidos: «lo borraron desde otro equipo… tu cambio NO se guardó» de un pedido que existe.** (Regresión de
§4gl.)
- **Qué pasa:**
  1. B carga un pedido y A lo corrige.
  2. La relectura de antes de guardar la contesta `doGet` con su copia vieja de 20 s.
  3. `submitPedido` (~9025) no guarda, saca el pedido de la pantalla y deja `BORRADO_FUERA` puesto toda la sesión.
- **Por qué:** la ventana de 45 s solo protege lo que tiene `SAVE_ULTIMO` en ESE dispositivo. No cubre lo cargado por
  otro equipo, ni lo propio después de un F5.
- Al segundo intento guarda. `2040720` guardaba.
- **Arreglo propuesto:**
  - Con la 28-a implementada, si `EDIT_REV > 0`, no frenar: el servidor ya contesta `borrado` si de verdad no está.
  - Sin sello, preguntar en vez de afirmar.
  - Limpiar `BORRADO_FUERA` cuando una lectura lo vuelve a traer.

**M2 · Stock: el Excel de Moreno subido después de cargar la camioneta deja al cuadrito en «🏭 NO HAY».** (Viene de §4gj,
27/09.)
- **El caso:** acá hay 0 y hay 4 pendientes. Logística programó una recogida de 5 para hoy y el Excel nuevo de Moreno
  ya no las muestra (el comentario de `recibirStockPedido` del 26/09 dice que pasa).
- **Qué muestra cada pantalla:**
  - La tabla de stock dice «5 en camino», y «Qué producir» dice «hay 5».
  - El cuadrito dice «NO HAY · decile al cliente que espere ~3 días: hay que mandar a producir». Viene de `stockData`
    (~17096): `enRecogida` = Excel − libres. Lo usan `saldoEntradas` (~17702) y `saldoVeredicto` (~17653).
- **Arreglo propuesto:** si una recogida pendiente tiene fecha igual o anterior a la del Excel de su almacén, contarla
  entera como en camino. Como mínimo, un aviso ámbar: «hay N programadas que el último Excel de Moreno ya no muestra:
  confirmá con logística».

**M3 · Días: lo ya pedido a fábrica (⏳) y lo que «se fabrica para ESTE pedido» (🏭) cuentan las 48 h desde el día
anotado, aunque no sea hábil.**
- **Dónde:** `saldoSaleDeFabrica(q.f)` (~17674) y `saldoSaleDeFabrica(v.pedidoF)` (~17764), sin `diaArranque`.
- **Consecuencia:** prometen un día antes que el 🏭 que se mostró para la misma tanda.
- **Reproducido:**
  - Pedido anotado el domingo 04/10: ofrece el miércoles 07/10. El 🏭 de ese domingo decía jueves 08/10.
  - Anotado el lunes 28/09 a las 18:15: ofrece el jueves 01/10 en vez del viernes 02/10.
- **Arreglo propuesto:** `saldoSaleDeFabrica(diaHabil(f) ? f : sigDiaHabil(f))`. Para la hora, guardar el instante
  (`ts` en `STOCK.p`, `prodT` en el renglón) y aplicarle el corte.

**M4 · Días: una recogida programada para domingo o feriado se toma tal cual.**
- **Dónde:** el modal propone `tomorrowStr()` (~19094). El sábado eso es el domingo, y `saldoEntradas` lo usa tal cual.
- **Reproducido:** el sábado 03/10 el cuadrito dice «logística lo trae el domingo 04/10: programá desde el lunes 05/10».
  Lo esperado es el martes 06/10.
- **Arreglo propuesto:** en `saldoEntradas`, pasar un día no hábil al siguiente. En el modal, proponer
  `saldoDiaRecoge()` y avisar si la fecha no es hábil.

**M5 · Días: la lista `FERIADOS` se acaba el 31/12/2027 sin aviso.**
- **Consecuencias:**
  - El 29/12/2027, 🏭 y 📐 prometen el 01/01/2028.
  - En febrero de 2028 no sabe de Carnaval.
  - En 2026 el DS 5521 trasladó feriados y agregó viernes puente: un decreto así no lo va a tener.
- **Arreglo propuesto:** una prueba que falle cuando `FERIADOS` no cubra los próximos 12 meses. Carnaval, Viernes Santo
  y Corpus, calculados desde Pascua.

**M6 · Proyección: una marca sin ventas en el mes (o solo sin monto) proyecta igual, y la lista por vendedor no cierra.**
- **Dónde:** `proyeccionMes` (~4516-4551) calcula su método aunque no tenga filas, y la proyección entra en el equipo.
  Pero `grupo` no dibuja una marca sin filas, y cada vendedor recibe vendido × P ÷ K = 0.
- **Reproducido** el 01/10 a las 09:00, con Sueña todavía sin cargar octubre:
  - la ficha dice «Sueña Bs 0,00 · 📈 proyección Bs 100.000»;
  - la lista por vendedor no tiene Sueña, y su «TOTAL EQUIPO 📈 Bs 202.000» no es la suma de los grupos.
- **Arreglo propuesto:** mostrar el grupo con una fila «todavía sin ventas: lo que suele entrar desde acá», o con K = 0
  no aplicar la curva y decirlo.

**M7 · Días (decisión que conviene revisar): la hora de corte usa el reloj del dispositivo.** Es lo decidido en §4gq
(«`todayStr()` es el reloj del dispositivo a propósito», §4fu), pero tiene consecuencias concretas:
- un celular en Lima (UTC−5) a las 17:30 de Bolivia promete un día antes;
- uno en UTC corta a las 13:00 de Bolivia, y desde las 20:00 toma el día siguiente como «hoy».

Propuesta: calcular el corte con la hora de Bolivia (UTC−4 fija, como `isoDeTsBolivia`), o avisar cuando el
dispositivo está en otra zona.

**M8 · Pedidos (previo, §4fz): «Pedido eliminado ✓» sin haber borrado nada.**
- **Qué pasa:** la relectura de `borrarEnServidor` la contesta la copia vieja de `doGet`, y el panel no manda el
  borrado. El pedido vuelve a aparecer a los 90 s.
- **Arreglo propuesto:** no dar por borrado sin la respuesta del borrado. Si la relectura no trae la fila, mandar el
  borrado igual con el sello que se tenía. La 28-a lo rechaza si cambió, y no pasa nada si ya no está.

#### BAJA (resumidas; cada una tiene su reproductor)

**Stock**
- `saldoEntradas` reparte `enRecogida` por fecha sin mirar el almacén de cada recogida. Con IM programado para el 30/09
  sin respaldo y el almacén X con respaldo para el 05/10, promete el 30/09 cuando lo correcto es el 06/10.
- «Sin cupo» en el cuadrito de «hecho para este pedido» se pone ámbar sin decir por qué: `saldoTitulo` `'fabcli'` no
  agrega el texto.
- La copia «el mes» para la fábrica (`copiarProducir`, ~18921) dice «entre los últimos 30, 60 y 90 días… sin ventas
  puntuales», aunque el número salga del histórico del sistema, que trae todas las ventas.
- **Previas, no son de estos días:**
  - «Eduardo.Añez» y «Eduardo-Añez» no se reconocen como Eduardo.
  - ROHO a «TIENDA 12» no cuenta: la expresión admite un solo dígito.
  - La leyenda «Vende por día = todo lo vendido…» (~18402) quedó vieja.
  - `copiarStock` dice «+ 7 días de venta» también con rotación media.

**Pedidos**
- Una lectura atrasada vuelve a mostrar un pedido ya avisado como borrado. Con la 28-a no se recrea.
- La relectura de `borradoConfirmarLuego` no repinta, y una segunda sospecha queda sin temporizador.
- `saveReciente` y `localManda` siguen midiendo con `Date.now()`: un reloj adelantado 2 minutos hace desaparecer un
  pedido recién guardado. Es previo.

**Días**
- «(48 h)» aparece aunque el plazo cruce el domingo. Mejor «2 días hábiles».
- Al editar un pedido forzado a un turno lleno (13/12), dice «desde el miércoles» aunque ya está el martes.
- Eduardo y ROHO pueden agendar para hoy, pero con stock a mano el cuadrito les dice «desde mañana».
- **Proyección:** el 07/08/2026 también fue feriado (viernes puente del DS 5521), así que agosto tuvo 24 días hábiles y
  no 26. Hay que confirmarlo con el dueño.

**Proyección**
- **Los días 29 a 31 contra febrero** (el otro mes entero): con ventas iguales, «4%», «8%» y «13% arriba». El titular no
  dice que febrero es más corto.
- **El repintado automático** de cada 2 minutos cierra «📅 Semana por semana».
- **Unidades:** 23 de 52 renglones inventados dan otra cosa que la esperada.
  - «COLCHON TITANIO S/SOMIER»: el «/» de `PRY_PEDAZOS` parte el renglón y el pedazo «SOMIER» suma un somier. Es
    regresión mía de §4gv.
  - «SOMMIER», «BASE» y «BOX SPRING» no se reconocen como somier.
  - Cuentan como colchón: TRASLADO, MANO DE OBRA, CAMAROTE, LITERA, CATRE, CUNA (sola), NORDICO, y errores de tipeo
    como «ALMOADA» y «ALM NASA».
  - «COMBO COLCHON + ALMOHADA» suma un somier.
  - Los códigos del catálogo, «colchón + 2 almohadas», «colchón y somier» y «protector de colchón» se cuentan bien.
- **Las fichas:** la de «Sin marca» no muestra su proyección, y las fichas no suman la del total.
- **El lunes 02/11/2026** (el mes arranca con domingo y feriado), con una marca que vende al principio, la curva da Bs
  7.200 para un mes de ~100.000. Lo atenúa el aviso «Van 0 días hábiles».
- **Una tercera marca en `MARCAS`** rompe la pestaña (`'suena'`/`'heaven'` fijos en ~4516 y ~4692). Hoy no pasa.
- **Textos que confunden:**
  - «⏳ Van 0 días hábiles del mes».
  - «no hay un mes cerrado con al menos 20 ventas», cuando la regla suma los meses.
  - «el ritmo 3% y la curva 3% → va con la curva», cuando eran 3,2% y 2,9%.

#### Para analizar

**Proyección y fichas**
- **La fuente Inter** carga con `display=swap`, y `fichasMontoEntero` no se vuelve a correr cuando termina de cargar.
  Un monto medido con la fuente de reemplazo puede quedar cortado después del cambio. Acá Google Fonts está bloqueado y
  no lo pude medir. Propuesta: `document.fonts.ready.then(acomodarFichas)`.
- **Los primeros días del mes:** el porcentaje de «A esta altura» es sobre todo ruido de calendario, aun corregido A3.

**Pedidos**
- **F5 justo después de guardar:** la ventana de `LECTURA_VIEJA_MS` vive en memoria, y con la copia vieja el pedido
  recién guardado desaparece sin aviso. Hay riesgo de que lo vuelvan a cargar. Es previo.
- **Celular dormido:** `performance.now()` puede no avanzar mientras duerme, y un borrado real podría salir sin aviso.
  No se pudo emular.

### 20.4 · Decisiones que conviene revisar con el dueño

**Stock**
- **Una compra de Multicenter cargada como un pedido por sucursal arma ritmo.**
  - 15 unidades en UN pedido: rotación baja, no pide nada.
  - Las mismas 15 en 3 pedidos del mismo día («MULTICENTER - SUC. NORTE/SUR/CENTRO»): rotación media, «PEDIR YA» 6, y
    entra al plan del mes.
  - Propuesta: contar como una sola entrega los pedidos de Eduardo a Multicenter con la misma fecha de entrega.
  - Depende de cómo los cargan.
- **Una recogida atrasada promete un día antes que Moreno sin programar.** `saldoEntradas` usa `max(llega, hoy)`.
  Propuesta: `max(llega, saldoDiaRecoge())`.

**Proyección**
- **La prueba** prueba cada mes con la curva de los OTROS meses cerrados, también los posteriores. Con un negocio que se
  duplica cada mes elige el ritmo, y probando solo con los anteriores elegiría la curva. Con +25% o una campaña, la
  elección no cambia.
- **La elección no tiene margen:** 3,2% contra 2,9% mueve la proyección de Sueña de Bs 420.937 a 394.644.
- **La curva y su promedio** usan todos los meses cerrados, sin ventana: `PRY_MESES_PRUEBA` limita solo la prueba.
- **Los mayoristas con el ritmo:** una venta de 40.000 da «📈 Bs 90.000» el 14/10, y el día 2 daría ~540.000.
- **«Bs por unidad»** divide también lo vendido en accesorios por los colchones y somieres.

**Pedidos**
- **El freno del lado del panel en `submitPedido` (M1)**, ahora que la 28-a ya decide.
- **Que el servidor no mire el sello de los retiros al guardar (A4).**

**Fuera de lo revisado, pero importante**
- **La contraseña de Administración por defecto** está escrita en un comentario de `pedidos.html` (~1454), junto con su
  hash, en el repo público.
  - Es por dispositivo: en uno donde nadie la cambió, cualquiera que lea el repo abre Administración y la Proyección.
  - Los datos ya se leen sin clave: `PANEL_KEY` está en espera por decisión del dueño.
  - Aun así, la sugerencia es sacar ese comentario y que el dueño la cambie. No la repito acá.

### 20.5 · Qué te pido

1. **Tu opinión sobre los arreglos de A1-A4 y M1-M8** antes de que los haga, en especial:
   - A2: en `mixtoEn`, ¿excluir mismo método y banco alcanza, o preferís marcar el 2° método del mixto en el propio
     renglón (una letra, como el `^` del flete) y dejar de adivinarlo?
   - A3: ¿cortar a la misma hora (con el `ts`) o al fin de ayer?
   - A4 y M1: ¿vale una versión del `.gs` que mire el sello de los retiros y diga en cada respuesta de qué lectura sale
     (hoja o caché, y de cuándo)? Es lo que quedó abierto en §19 y cerraría M1, M8 y el F5 de «para analizar».
2. Si ves otros escenarios en estas cuatro áreas que ninguna prueba cubra.

**Lo que le pregunto al dueño** (va en el mismo mensaje):
- ¿Sale el camión en feriados? (A1)
- ¿Multicenter se carga en varios pedidos, uno por sucursal?
- ¿Logística sube el Excel de Moreno después de cargar la camioneta? (M2)
- ¿El 07/08/2026 fue feriado?
- El orden en que quiere los arreglos.

**Qué está bien** (lo revisaron y lo probaron):
- **Stock:** `stockPedidoUnico` es el único camino para 15 días, 30 días y `ventasPanelIndex`. Sin doble conteo. Con
  1.000 pedidos, el cuadrito del formulario da igual que en `2040720`, y `stockData` pasa de 4,0 a 4,8 ms.
- **Pedidos:** `localManda`/`RED_N` ordenan bien. `borrado` saca de la cola solo ese id. `ctaEnvioAPago` contra el
  servidor real no pierde ni duplica plata (sin red, respuesta perdida, conflicto).
- **Días:** fuera de los feriados, los 518 cuadritos restantes cumplen la regla. También cupos (15/15), coherencia
  entre el cuadrito y la pregunta al guardar, y los días hábiles de la proyección.
- **Proyección:**
  - las cuentas a mano coinciden: día 1, lunes, último día hábil, mes cerrado y mes futuro;
  - la prueba nunca usa el propio mes;
  - sin contraseña no hay camino a la pestaña;
  - los nombres con HTML salen escapados;
  - las fichas de marca suman «Vendido en el período» en todos los cortes;
  - `renderProyeccion` tarda 21-35 ms con 1.500 ventas;
  - no hay scroll de costado a 820, 1180 y 390.

## 21 · Los arreglos de A1-A4 (29/09) — PUBLICADOS 29/09 10:02 (`72aa862`)

El dueño contestó y pidió los arreglos antes de tu opinión: *«No sale en feriados, arreglá el 2, 3 y 4»*.
- El 6 y el 7/08 fueron feriado.
- Logística NO sube el Excel de Moreno después de cargar, así que M2 no pasa en la práctica.
- Multicenter (§20.4): *«hace pedidos y todos son a su bodega, pero hace pedidos por unidades: a veces hasta 4 pedidos en
  el mismo día para su bodega»*. Hice lo que proponía §20.4: los pedidos de Eduardo a Multicenter con la misma fecha son
  UNA entrega para la rotación (`stockEntregaClave`: 15 días por fecha de salida, 30 días por fecha de venta). Las
  unidades se suman igual y los umbrales no cambian. Prueba: `test_eduardo_multicenter` §8, con 4 rojas contra `040e1df`.

Lo hecho está publicado desde el 29/09 a las 10:02 (`main` = `72aa862`, bitácora §4gy). Si algo no te cierra, se cambia
en la próxima vuelta.

**A1 · Feriados.**
- `feriadoDe(f)` lee `FERIADOS`. `limTurno` da 0 en feriado, y `proximoDiaEntrega()` y `saldoDiaConCupo` los saltean.
- El formulario frena un pedido nuevo o una fecha movida a un feriado, con las reglas del domingo. Administración pasa
  con `forzar`, y lo que ya estaba en un feriado se corrige igual.
- Los carteles de cupos lo dicen.
- ⚠️ **Pendiente del servidor:** el portero del `.gs` no conoce los feriados. Una página sin F5 todavía puede guardar uno.
- Los feriados que ya pasaron (06/08, 07/08, 25/09) van en `FERIADOS_PASADOS`, que usa solo la proyección
  (`pryDiaHabil`). En `FERIADOS` rompían las pruebas del cuadrito que clavan el reloj en esos días, y las entregas no
  miran atrás.

**A2 · El mixto falso.** De las dos opciones que te planteé en §20.5, fui por la primera (seguir adivinando, con una
regla más) y no por la letra en el renglón.
- `mixtoMismoMetodo(c, a)` descarta los candidatos con el mismo método que el anticipo (y el mismo banco, si es QR). Es
  la regla del formulario.
- Con varios candidatos, vale el que cierra el «A cuenta».
- No agregué el aviso en `ctaEnvioAPago`: con la regla nueva, los casos del informe no cambian el mixto.
- Queda una ambigüedad: en una «SÍ, pagado», un pago de OTRO método del mismo día y recibo se lee como el 2° método. No
  se distingue de un mixto de verdad, y los montos cierran igual.
- Si preferís la letra, se puede hacer después sin tocar los datos viejos.

**A3 · A la misma hora.**
- `pryVentas` guarda los minutos del día en Bolivia (`pryMinBo(ts)`), y `pryAcum`/`pryCurvaF` cortan el otro mes al
  mismo día y a la misma hora de ahora.
- La prueba (🧪) sigue con días enteros.
- Un mes más corto entra entero, y el texto lo dice.

**A4 · El retiro borrado.**
- Corregir un retiro manda `rev` (el de la lista o `SAVE_REV`), y con la 28-a ya contesta `borrado`, también desde la
  cola.
- El retiro sale de la lista de ese equipo, con aviso.
- ⚠️ **Pendiente del servidor:** dos correcciones simultáneas del mismo retiro. Gana la última, porque el `.gs` no compara
  el sello de `__ret_…`.

**La BAJA de unidades («S/SOMIER»)**, que era regresión mía, también quedó arreglada: `PRY_SIN`, SOMMIER, BOX SPRING y más
palabras que no cuentan.

**Pruebas nuevas** (rojas contra lo publicado, `040e1df`):
- `test_rev29_dias.js`: 26, 21 rojas;
- `test_rev29_pedidos.js`: 25, 15 rojas, con el `.gs` real;
- `test_proyeccion.js`: 126, 8 rojas.

Los reproductores de los agentes para A1-A4 dan todo en verde. **Batería: 116 suites, 4.434 bien · 0 mal.**

**Sigue pendiente:** M1, M3-M8 y las otras BAJA de §20.3. Para la próxima versión del `.gs` se juntan tres cosas: los
feriados en el portero, el sello de los retiros y la respuesta que diga de qué lectura sale (M1, M8).

## 22 · La revisión en tres niveles de lo hecho el 29/09 — NADA ARREGLADO TODAVÍA

El dueño: *«Quiero agentes que revisen todo lo de hoy, y otros agentes que revisen a los agentes y esos agentes revisen a
los agentes. Promueve cada vez hay “errores que se te escapan” y también mejoras que podamos implementar»*.

### 22.1 · Cómo se revisó
- **Alcance**: lo publicado el 29/09, de `6146f6d` a `2207922`: §4gu, §4gv, §4gw, §4gy (A1-A4, unidades, Multicenter), §4gz y §4ha.
- **Nivel 1**: cuatro revisores, uno por área (días y feriados · plata · proyección · formulario y stock). 19 hallazgos.
- **Nivel 2**: un auditor por revisor. Reprodujo cada hallazgo por su cuenta (19 de 19 confirmados; 6 con otra severidad) y
  buscó lo que se le había escapado al revisor: 7 nuevos.
- **Nivel 3**: un meta-auditor volvió a verificar todo lo ALTA y MEDIA (y una BAJA por área), buscó los cruces entre áreas
  (4) y armó la lista final: **24 (5 ALTA, 7 MEDIA, 12 BAJA)** y 10 mejoras.
- **Yo** volví a correr los scripts de las 5 ALTA: las 5 se reproducen. Chromium con el reloj clavado y datos inventados;
  nada se escribió en el repo ni en la planilla.

### 22.2 · La lista final

| # | Sev. | Lo encontró | ¿Del 29/09? | Qué pasa |
|---|---|---|---|---|
| A4-1 (+X-3) | ALTA | auditor | sí | Un renglón con solo el código se pierde al guardar, y a veces la pregunta del saldo lo nombra igual |
| R4-1 | ALTA | revisor | no (previo) | Código del almacén en un renglón de otra medida u otro producto: ✅ DISPONIBLE con el stock del producto del código, sin aviso, y el pedido reserva ese otro |
| R2-1 | ALTA | revisor | sí | Pago en dos métodos con el 2° del mismo método que el anticipo: «A cuenta» lo suma pero el formulario ya no lo reconoce y cuenta Bs 500 de más o de menos, sin preguntar |
| A2-1 | ALTA | auditor | no (previo) | Venta cargada «SÍ, pagado» que vuelve a deber: «Usar como total» pone de saldo el total entero y la venta se guarda al doble |
| R4-5 + A4-2 (+X-4) | ALTA | revisor | no (previo) | Producto del almacén fuera de la lista que se agota: el panel olvida su código y pasan al producto parecido sus pedidos, lo pedido a fábrica y lo que llega (ya anotado el 25/09, pero es peor) |
| R1-2 | MEDIA | revisor | sí | Un pedido que queda con fecha de feriado desaparece de todo lo que es «Mañana» y de «Hoy» después; nada avisa que hay que reprogramarlo |
| R4-3 | MEDIA | revisor | sí | Multicenter: «el mismo día» es la entrega en los 15 días y la carga en los 30; los mismos pedidos dan 1 entrega en un lado y 3-4 en el otro |
| R2-5 | MEDIA | revisor | no (previo) | Al abrir el panel sin conexión con la planilla, los retiros desaparecen (incluso el que espera en la cola), y se pueden cargar dos veces sin aviso |
| R2-3 | MEDIA | revisor | no (previo) | Retiros: la versión que quedó en la cola pisa, a los 2 minutos, la corrección que se guardó después con conexión |
| R4-2 | MEDIA | revisor | sí | La lectura que completa un código del almacén pisa la medida elegida a mano y vuelve a poner un producto que la vendedora sacó |
| A3-1 | MEDIA | auditor | sí | Unidades: un accesorio escrito «P/ COLCHÓN», «P/ SOMIER» o «CON ELÁSTICO PARA COLCHÓN» cuenta como colchón o somier, por su cantidad |
| R3-3 | MEDIA | revisor | sí | «Qué días se vende más» cuenta los feriados como días sin ventas: el viernes y el jueves salen más flojos de lo que son |
| R1-1 | BAJA | revisor | no (previo) | El aviso «🏭 Recoger de fábrica» de una ATC cuenta los 2 días hábiles salteando solo el domingo |
| A1-1 | BAJA | auditor | sí | «🔒 Cerrar día» la víspera de un feriado propone el feriado y dice que «se pueden seguir agregando» pedidos |
| R1-4 | BAJA | revisor | sí | Cambiar solo el turno de un pedido que quedó en feriado dice «Turno lleno (0/0)» en vez de «es feriado» |
| R1-3 | BAJA | revisor | no (previo) | La víspera de un feriado, el formulario de pedido nuevo propone el feriado como fecha de entrega |
| A1-2 | BAJA | auditor | no (previo) | En un feriado o domingo, el cuadrito pide «que suba el de hoy» a logística, que ese día no trabaja |
| R2-2 | BAJA | revisor | no (previo) | Retiros: si la lista se relee entre ✏️ y Guardar, el retiro que otro equipo borró vuelve a la planilla |
| R2-4 | BAJA | revisor | sí | Adelanto en dos métodos más un tercer cobro del mismo día y recibo: corregir el banco del 2° pago baja el «A cuenta» que se ve |
| R3-1 + R3-2 | BAJA | revisor | sí | La proyección de cada marca se mueve sola durante el día: domingos y feriados a la mañana, y días hábiles cuyo día equivalente cae en domingo o feriado |
| R3-4 | BAJA | revisor | sí | Unidades: un colchón escrito a mano con ENTREGA, CAMAROTE, LITERA, REGALO o CAMA en el renglón no cuenta |
| R4-4 | BAJA | revisor | sí | El nombre que se completa desde el histórico conserva la medida en plazas o unos corchetes vacíos |
| A4-3 | BAJA | auditor | sí | En una RPT, el aviso del código del almacén pide «Poné el precio a mano» |
| R1-5 | BAJA | revisor | sí | Nueve o más pruebas de la batería dan rojo la víspera de cada feriado (la próxima: 31/10 y 1/11) |

Detalle de cada uno (dónde está y el arreglo propuesto, que NO se aplicó):

**A4-1 (+X-3) · ALTA · Un renglón con solo el código se pierde al guardar, y a veces la pregunta del saldo lo nombra igual**
- *Para el dueño*: Si la vendedora escribe solo el código de un producto del almacén que no está en la lista de precios y el renglón no se completa, el pedido se guarda sin ese producto. Pasa con el panel recién abierto, sin conexión, o si ese producto se agotó y no figura en el Excel del día. A veces, encima, el panel le pregunta por el saldo de ese producto como si estuviera en el pedido.
- *Dónde*: - `submitPedido` arma `productos` con `getProductos()` (8325) ANTES de la lectura (9084). `getProductos` saltea el renglón sin nombre (3284).
  - Después `saldoTrasLectura` → `prodCodigosDelAlmacen` completa ese renglón en pantalla, y `saldoConfirmarAlGuardar` (vía `saldoFilasForm`) pregunta por lo que hay en pantalla, no por `rec.productos`.
  - Con la lectura lenta (más de 4 s) se guarda sin ninguna pregunta.
  - Con el saldo cargado y el producto agotado (X-3), el manejador del código no avisa nada y el renglón se descarta igual.
  - Descartar un renglón sin nombre es previo; §4ha (4b194bd) sumó la pregunta engañosa y la costumbre de escribir solo el código.
- *Arreglo propuesto*: Al empezar `submitPedido`, frenar si hay un renglón con código o precio y sin producto: marcarlo en rojo y decir qué hacer.
  Probado en …/rev30/meta/pedidos_fix_meta_stock.html:
  - t_n3 y x_stock ya no guardan y lo dicen;
  - test_codigo_almacen 13/0, test_saldo_almacen 84/0, test_rev8_saldo 66/0, test_guardado 14/0 y test_rev7_celular 35/0.
  Completar desde el histórico un código que no está en ningún Excel, y que la pregunta del saldo mire solo lo que se va a guardar.

**R4-1 · ALTA · Código del almacén en un renglón de otra medida u otro producto: ✅ DISPONIBLE con el stock del producto del código, sin aviso, y el pedido reserva ese otro**
- *Para el dueño*: Si una vendedora pone el código de un producto del almacén y después le cambia la medida o el nombre (al cargar o al editar), el cuadrito dice ✅ DISPONIBLE con el stock del producto del código; por ejemplo, un somier 200x200 para uno de 160x190. No avisa nada, el pedido queda reservando el otro producto y logística ve «✔ hay» del equivocado. Con la lista de precios, en el mismo caso, el panel avisa.
- *Dónde*: - `saldoCodigoOtro` y `saldoCodigoDeEstandar` (y por eso `codigoEspecialBorrar`) solo miran `CODIGOS`.
  - `stockInfo`/`stockClaveInv` identifican por el código del almacén.
  - En medida especial el código queda puesto, cuenta como pendiente del 200x200, y `stockAsignar` propone ✔.
  - Es previo (identidad por código §4cv, protección de §4gk solo para la lista); §4ha (2207922) lo volvió el camino habitual.
- *Arreglo propuesto*: - En `saldoCodigoOtro` y `saldoCodigoDeEstandar`, usar también `productoDeAlmacen(cod)`: aviso «el código es de otra medida / de otro producto», pregunta al guardar, y borrarlo solo en medida especial (decisión del dueño del 27/09).
  - Que la revisión automática no proponga ✔ en esos renglones.
  - Sumar los casos a test_codigo_almacen.

**R2-1 · ALTA · Pago en dos métodos con el 2° del mismo método que el anticipo: «A cuenta» lo suma pero el formulario ya no lo reconoce y cuenta Bs 500 de más o de menos, sin preguntar**
- *Para el dueño*: Desde ayer, si una venta tiene el adelanto pagado con dos métodos y Contabilidad corrige uno para que queden iguales (por ejemplo, todo por QR del mismo banco), el formulario de la vendedora cuenta el segundo pago dos veces. «SÍ, pagado» deja una venta de 3.000 en 3.500 cobrados, y «Usar como total» le cobra 500 de menos al cliente. Pasa también con ventas que ya estaban así desde antes.
- *Dónde*: `mixtoMismoMetodo`/`mixtoEn` (8163-8181, 72aa862) descartan el renglón del mismo método. Pero:
  - `p.acuenta` sigue incluyéndolo: `ctaGuardarPago`, rama del anticipo, hace `acuenta = monto + mxM`;
  - `cobradoFueraDeAcuenta` (3493-3497) lo cuenta «afuera»;
  - `pagadoSugerirTotal` y `usarTotalProds` suman 500 de más;
  - `_rehaceAdel` lo deja como «otro pago».
  Resultado: a) 3.500, b) 3.500, c) 2.500.
  Antes de hoy: a) daba 3.000, y b/c frenaban. El número inflado entra además en la proyección (X-1).
- *Arreglo propuesto*: Lo probado en …/rev30/meta/pedidos_fix_meta.html:
  1. Una función para PROPONER montos (lo cobrado − mín(lo cobrado, máx(A cuenta guardado, A cuenta del formulario))), solo en «Usar como total» y «SÍ, pagado».
  2. `cobradoFueraDeAcuenta` (el freno) cuenta como del adelanto lo que «A cuenta» tiene de más sobre el anticipo.
  3. Frenar la corrección de «A cuenta» cuando el adelanto está en dos pagos sin reconocer, y mandar a Contabilidad.
  Resultado: a/b/c y A2-1 bien, freno intacto, 6 suites en verde.
  Falta:
  - en Contabilidad, al dejar el anticipo con el mismo método que el 2° pago, `acuenta = monto` (o juntar los dos renglones);
  - el arreglo de R2-4;
  - una prueba de invariantes de la plata del formulario.
  NO aplicar tal cual el arreglo del auditor (X-2).

**A2-1 · ALTA · Venta cargada «SÍ, pagado» que vuelve a deber: «Usar como total» pone de saldo el total entero y la venta se guarda al doble**
- *Para el dueño*: Si una venta se cargó «SÍ, pagado» y después se le agrega algo (por ejemplo, una almohada de 300), al tocar «Usar como total» el panel pone de saldo el total entero (2.800) en vez de 300, y guarda sin preguntar. La venta queda en 5.300 y el chofer saldría a cobrar 2.800. Viene de antes.
- *Dónde*: Una venta nueva «SÍ, pagado» se guarda como `~Efectivo 2500 @fecha #nota %img` con `acuenta` 0 (§4cb).
  - `cobradoFueraDeAcuenta` solo suma `totalCobrado` (los cobros, no el anticipo): da 0.
  - `usarTotalProds` hace saldo = total − A cuenta (0) − 0 = 2.800, y se guarda por `_soloPrecio`.
  - «SÍ, pagado» propone 300: pregunta, y si se acepta queda en 300, «cobrada de más».
- *Arreglo propuesto*: El mismo de R2-1 (función para proponer montos con todo lo cobrado que «A cuenta» no muestra). Probado en …/rev30/meta/pedidos_fix_meta.html: saldo 300, total 2.800, y el freno «poné el saldo» sigue. Sumar el caso a las pruebas.

**R4-5 + A4-2 (+X-4) · ALTA · Producto del almacén fuera de la lista que se agota: el panel olvida su código y pasan al producto parecido sus pedidos, lo pedido a fábrica y lo que llega (ya anotado el 25/09, pero es peor)**
- *Para el dueño*: Cuando un producto que no está en la lista de precios se agota y deja de figurar en el Excel, el panel lo confunde con uno parecido de la lista (por ejemplo, el somier parrilla negro con el somier negro). Sus pedidos y lo que logística ya pidió a fábrica pasan al otro, queda guardado así, y cuando llega se suma al otro. A la vendedora el cuadrito le promete con el stock del otro producto. Estaba anotado como pendiente el 25/09, pero es peor de lo que se anotó.
- *Dónde*: - `confirmarImportExist` reemplaza el mapa `cod` del almacén con el del Excel nuevo (20487/20492), que no trae lo agotado.
  - `stockInfo` cae en el parecido del catálogo.
  - `stockMigrar` vuelve a resolver por nombre las claves de `STOCK.p`/`STOCK.e`/`rs`, y `filaStock` lo escribe en la planilla (A4-2). No se revierte si el producto vuelve.
  - El histórico de «Qué producir» también se suma al parecido (X-4: 42 de 249 códigos, poco efecto hoy).
  - Previo; en la bitácora §4ga, «Quedan para decidir» (6).
- *Arreglo propuesto*: - Recordar las claves de los códigos del almacén mientras algo las nombre (pedidos pendientes, `STOCK.p` sin cerrar, `STOCK.e`, `rs`), y podarlas después, cuidando la celda de 50.000.
  - Completar el renglón desde el histórico si el código no está en ningún Excel.
  - En el histórico, usar la clave cruda para códigos que la lista no conoce.
  - No usar «no adivinar por nombre» a secas: rompe un caso que hoy anda (…/rev30/a4-stock/t_riesgo_arreglo2.js).

**R1-2 · MEDIA · Un pedido que queda con fecha de feriado desaparece de todo lo que es «Mañana» y de «Hoy» después; nada avisa que hay que reprogramarlo**
- *Para el dueño*: Si un pedido queda con fecha de feriado, la víspera no aparece en el «Mañana» de nadie y después solo figura entre los atrasados. Puede pasar porque vino así en el Excel de ROHO, porque lo movió Administración o porque se cargó antes del 29/09 para el 2/11 o el 25/12. Logística no lo ve para cambiarle el día, y el cliente se entera cuando no llega. Conviene revisar ya si hay pedidos cargados para el 2/11 y el 25/12.
- *Dónde*: `proximoDiaEntrega()` (1675) saltea el feriado. Carga, ruta, chofer, Mis pedidos, mapa, faltantes, parte, WhatsApp, `renderRevisar` y la revisión de stock en «Mañana» miran solo ese día.
  El importador de ROHO:
  - los crea en el feriado, con un aviso;
  - dice «ocupan lugar en el camión… 2 de 0 · lleno».
  Después del feriado, el stock los da por salidos (§4co) y vuelven a quedar «libres» con el Excel siguiente. Con 040e1df salían en «Mañana».
- *Arreglo propuesto*: - Un bloque ámbar «⚠️ Quedaron en un día sin camión», con los no entregados en feriado o domingo (también los ya pasados desde el último camión), arriba de la carga y de «Revisar entregas», cada uno con 📅 Reprogramar.
  - El importador de ROHO no dice «ocupan lugar» en un feriado.
  - Mover esos pedidos solos al próximo camión lo decide el dueño.

**R4-3 · MEDIA · Multicenter: «el mismo día» es la entrega en los 15 días y la carga en los 30; los mismos pedidos dan 1 entrega en un lado y 3-4 en el otro**
- *Para el dueño*: Para los pedidos de Eduardo a Multicenter, la tabla de stock junta los del mismo día por la fecha de ENTREGA (como decidiste), pero el plan del mes que viene los junta por el día en que se cargaron. Con los mismos pedidos, uno dice «pedido único» y el otro manda producir 5. Se arregla cambiando una línea.
- *Dónde*: `stockEntregaClave` se llama con `fs` en la ventana de 15 días (17164) y con `fv` en la de 30 (17180).
  - Caso A: 4 entregas en 15 días y 1 en 30.
  - Caso B: 1 en 15 días y 3 en 30 («mes» 5).
  34ecbab, publicado en 72aa862.
- *Arreglo propuesto*: - `ek30 = stockEntregaClave(p, fs)`, la decisión del dueño (00b0c68). La ventana de 30 días se sigue midiendo por fecha de venta. Probado: A 4/4, B 1/1, test_eduardo_multicenter 40/0.
  - Sumar a su §8 un caso con fecha de carga distinta de la de entrega.

**R2-5 · MEDIA · Al abrir el panel sin conexión con la planilla, los retiros desaparecen (incluso el que espera en la cola), y se pueden cargar dos veces sin aviso**
- *Para el dueño*: Si Contabilidad abre el panel cuando Google no responde, los retiros de efectivo desaparecen de la ventana y del cuadre hasta que vuelve la conexión; también el que acababa de cargar y esperaba para subir. Si lo vuelve a cargar porque no lo ve, el panel no avisa que ya existe y queda dos veces: a la vendedora se le descuenta dos veces.
- *Dónde*: `loadMirror` (1633-1639) llama a `leerCierresDeLista(STATE)` antes de `loadRetirosMirror()`. Adentro:
  - `RETIROS=rets` ([]);
  - `saveRetirosMirror()` graba la copia vacía (lo mismo con `BORRADORES`).
  Los pendientes de la cola solo se suman en `mergePending`, después de una lectura buena. El aviso de «retiro igual» (§4ek) mira `RETIROS`. Previo.
- *Arreglo propuesto*: - Que `leerCierresDeLista` reemplace RETIROS y BORRADORES solo cuando la lista viene del servidor. Probado por el auditor en …/rev30/a2-plata/pedidos_fix_ret.html: se ven los 2 y avisa «YA HAY UN RETIRO IGUAL».
  - Que el aviso de duplicado mire también la cola.
  - Marcar «⏳ todavía no está en la planilla».

**R2-3 · MEDIA · Retiros: la versión que quedó en la cola pisa, a los 2 minutos, la corrección que se guardó después con conexión**
- *Para el dueño*: Si un retiro no se pudo guardar (sin conexión o con el servidor ocupado) y enseguida lo corrigen con conexión, a los dos minutos el panel manda la versión vieja que había quedado esperando. El retiro vuelve al monto anterior, sin aviso.
- *Dónde*: Cuando un guardado posterior sale bien, `persistRetiro` no saca de la cola la versión vieja, y `flushPending` la manda. El .gs no compara el sello de `__ret_` y la acepta. Un pedido en el mismo caso choca con «conflicto» y no pisa. Previo (§4ek).
- *Arreglo propuesto*: Cuando un guardado de un id sale bien, sacar de la cola sus versiones anteriores, o no mandar lo encolado antes de la última confirmación. El sello en `__ret_` del .gs (pendiente del servidor) también lo cubriría.

**R4-2 · MEDIA · La lectura que completa un código del almacén pisa la medida elegida a mano y vuelve a poner un producto que la vendedora sacó**
- *Para el dueño*: Si la vendedora escribe un código del almacén antes de que termine de cargar el saldo y elige la medida a mano, cuando llega el saldo el panel le cambia la medida sin avisar. Y si al editar saca un producto borrándole el nombre, con la actualización automática vuelve a aparecer y se guarda en el pedido.
- *Dónde*: `prodCodigosDelAlmacen` (16772-16783) corre en cada lectura (`saldoTrasLectura`). Completa todo renglón con código y sin nombre y escribe la medida sin mirar la que había. No avisa ni repinta la suma. 4b194bd.
- *Arreglo propuesto*: Completar solo el renglón cuyo código se escribió sin saldo (con una marca), solo si la medida está vacía o coincide, una sola vez, con el mismo aviso del campo código y repintando la suma.

**A3-1 · MEDIA · Unidades: un accesorio escrito «P/ COLCHÓN», «P/ SOMIER» o «CON ELÁSTICO PARA COLCHÓN» cuenta como colchón o somier, por su cantidad**
- *Para el dueño*: En las unidades de la proyección y de las fichas de Heaven y Sueña, un accesorio escrito a mano con «p/» o «para colchón» cuenta como colchón o somier; por ejemplo, «PATAS P/SOMIER» por 4 o «sábanas con elástico para colchón». Una venta de un colchón con protector y 4 patas figura con 6 unidades, y el «Bs por unidad» baja mucho.
- *Dónde*: `PRY_PEDAZOS` (4431) parte el renglón en «/» y «CON», y en `pryTipoProd` (4443-4457) un pedazo que no es el primero cuenta si dice COLCHON o SOMIER. `pryUnidadesDe` multiplica por la cantidad. Los accesorios no están en `CODIGOS`, así que siempre se escriben a mano. 040e1df (§4gv); 72aa862 arregló solo «S/» y «SIN».
- *Arreglo propuesto*: - «P/» → «PARA», y cortar lo que sigue a «PARA» y a una palabra de servicio o mueble (lo que también arregla R3-4). Probado por el auditor en …/rev30/a3-proyeccion/pedidos_fix_a3.html: 28 de 29 casos, test_proyeccion 126/0, catálogo sin cambios.
  - Sumar los casos a test_proyeccion §15.

**R3-3 · MEDIA · «Qué días se vende más» cuenta los feriados como días sin ventas: el viernes y el jueves salen más flojos de lo que son**
- *Para el dueño*: En «Qué días se vende más», el viernes y el jueves salen más flojos de lo que son. El panel cuenta el 6 y el 7 de agosto y el 25 de septiembre, que fueron feriados, como días de semana sin ventas. Si decidís promociones o personal por día de la semana con ese cuadro, hoy te lleva a una conclusión equivocada.
- *Dónde*: `pryPatron` (~4764-4765) cuenta todos los días del período en `cnt[dowDe(d)]`, también los de `FERIADOS_PASADOS`/`FERIADOS`. Con 2 meses de historia, el viernes queda 25 % abajo y el jueves 12,5 %. Nació con el cuadro (a904137, hoy).
- *Arreglo propuesto*: Dejar afuera los feriados en el conteo y en lo cargado ese día. Probado en …/rev30/r3-proyeccion/pedidos_fix_r3.html (test_proyeccion 126/0). Y decir «parejo» cuando la diferencia es menor a ~10 %.

**R1-1 · BAJA · El aviso «🏭 Recoger de fábrica» de una ATC cuenta los 2 días hábiles salteando solo el domingo**
- *Para el dueño*: El aviso para ir a buscar a fábrica el producto de una ATC dos días hábiles antes de devolverla no salta los feriados. Con Carnaval, la pestaña ATC y la carga de «Hoy» lo muestran recién el mismo día; la carga de «Mañana» sí lo muestra antes.
- *Dónde*: `atcRecogerFabDesde` (1884-1889) resta días salteando solo el domingo. Previo (§4eb).
- *Arreglo propuesto*: Usar `diaHabil(d)` en el bucle. Probado por el revisor en …/rev30/r1-dias/arreglo/pedidos.html, con test_rev2_atc, test_rev4_atc_flete y test_rev_entregas en verde.

**A1-1 · BAJA · «🔒 Cerrar día» la víspera de un feriado propone el feriado y dice que «se pueden seguir agregando» pedidos**
- *Para el dueño*: La víspera de un feriado, «Cerrar día» ofrece cerrar el feriado y dice que ese día se pueden seguir agregando pedidos. Si logística cierra lo que le ofrece, el camión de verdad (el del día siguiente al feriado) queda abierto.
- *Dónde*: `abrirCierreDias`/`renderCierreDias` (11245-11311) usan `tomorrowStr()`, y el cartel verde no mira `feriadoDe`. El resto del panel empezó a saltear feriados en 72aa862.
- *Arreglo propuesto*: Botón «Próximo camión» con `proximoDiaEntrega()`, y en un feriado el texto «es feriado: no sale el camión». La fecha por defecto puede quedar como está (§4ex).

**R1-4 · BAJA · Cambiar solo el turno de un pedido que quedó en feriado dice «Turno lleno (0/0)» en vez de «es feriado»**
- *Para el dueño*: Si una vendedora le cambia solo el turno a un pedido que quedó en un feriado, el panel le dice «turno lleno, probá el otro turno» en vez de «es feriado, cambiale el día».
- *Dónde*: El freno de feriado de `submitPedido` (8865) mira solo `_nuevo`/`_mueveFecha`; el de cupo (8889-8891) arma «(0/0)». `renderCupoForm` agrega «se puede guardar igual».
- *Arreglo propuesto*: Si `_mueveVend` y `limTurno` da 0, usar el texto de feriado o domingo de `cambiarTurno`. «Se puede guardar igual» solo si no se cambia fecha ni turno.

**R1-3 · BAJA · La víspera de un feriado, el formulario de pedido nuevo propone el feriado como fecha de entrega**
- *Para el dueño*: La víspera de un feriado, el formulario de pedido nuevo trae el feriado como día de entrega. La vendedora ve el cartel rojo y tiene que cambiarlo a mano.
- *Dónde*: `resetForm` (~9641) usa `tomorrowStr()`. Desde 72aa862 ya no se guarda, pero la propuesta quedó.
- *Arreglo propuesto*: En `resetForm`, `_ff.value = proximoDiaEntrega()`; el mínimo sigue en `tomorrowStr()`.

**A1-2 · BAJA · En un feriado o domingo, el cuadrito pide «que suba el de hoy» a logística, que ese día no trabaja**
- *Para el dueño*: En un feriado o un domingo, el cuadrito le dice a la vendedora que le pida a logística el Excel de hoy, aunque logística ese día no trabaja. Los números están bien.
- *Dónde*: `saldoAvisos` (18026-18028) compara el corte con `todayStr()`. Previo (§4gj).
- *Arreglo propuesto*: Avisar solo si el corte es anterior al último día hábil.

**R2-2 · BAJA · Retiros: si la lista se relee entre ✏️ y Guardar, el retiro que otro equipo borró vuelve a la planilla**
- *Para el dueño*: Si alguien borra un retiro mientras otra persona lo está corrigiendo, y justo la pantalla de la segunda se actualiza, al guardar el retiro borrado vuelve. Es muy poco probable.
- *Dónde*: `guardarRetiroForm` busca el sello recién al guardar (6319-6323), y `editarRetiro` no lo guarda. Después de una relectura se manda sin `rev` y el .gs 28-a lo crea. Previo; el arreglo de A4 no cubre este orden.
- *Arreglo propuesto*: Guardar el sello al abrir ✏️, y si el retiro ya no está en la lista, no guardar a ciegas.

**R2-4 · BAJA · Adelanto en dos métodos más un tercer cobro del mismo día y recibo: corregir el banco del 2° pago baja el «A cuenta» que se ve**
- *Para el dueño*: En una venta con el adelanto en dos métodos y otro pago del mismo día y recibo, corregir el banco del segundo método baja el «A cuenta» que se ve (de 1.500 a 1.000). Lo que falta cobrar no cambia.
- *Dónde*: En la rama de cobro de `ctaGuardarPago`, `_mxDesp = mixtoEn(_antX, arr)` va sin `p` (~7030). Con dos candidatos da null y `p.acuenta` queda solo el anticipo.
- *Arreglo propuesto*: Decidir `_sigue` mirando el propio renglón: misma fecha y recibo que el anticipo, y otro método.

**R3-1 + R3-2 · BAJA · La proyección de cada marca se mueve sola durante el día: domingos y feriados a la mañana, y días hábiles cuyo día equivalente cae en domingo o feriado**
- *Para el dueño*: La proyección de Heaven o Sueña se mueve sola hasta un 4 % durante el día, sin que entre ninguna venta: los domingos y feriados a la mañana sale más alta, y algunos días hábiles a la mañana más baja. Está dentro del error propio del método, pero confunde.
- *Dónde*: - `proyeccionMes` pasa la hora a `pryCurvaF` también en un día no hábil (R3-1, 72aa862).
  - `pryAlDia` puede devolver un domingo o feriado, y `pryCargadaAl` cuenta entero el hábil anterior (R3-2, nació con la curva en a904137; A3 lo achicó).
- *Arreglo propuesto*: - Hora solo si hoy es hábil, y como día equivalente el último hábil (arreglo del revisor, probado: 0,0 % de movimiento y test_proyeccion 126/0).
  - Una prueba que exija el mismo número a las 08:00 y a las 21:00.

**R3-4 · BAJA · Unidades: un colchón escrito a mano con ENTREGA, CAMAROTE, LITERA, REGALO o CAMA en el renglón no cuenta**
- *Para el dueño*: Si una vendedora escribe un colchón a mano y en el mismo renglón pone «entrega», «camarote», «litera», «regalo» o «cama», ese colchón no se suma a las unidades.
- *Dónde*: `PRY_NO_UNIDAD` (4420-4426) sumó ENTREGAS, CAMAROTES y LITERAS en 72aa862, y `pryPedazoTipo` toma la primera palabra con significado.
- *Arreglo propuesto*: El mismo de A3-1 (cortar en palabras de servicio o mueble y después de «PARA»).

**R4-4 · BAJA · El nombre que se completa desde el histórico conserva la medida en plazas o unos corchetes vacíos**
- *Para el dueño*: Cuando el código se completa desde el almacén, a veces el nombre trae la medida en plazas adentro («SOMIER PARRILLA NEGRO 1,5») o unos corchetes vacíos. Es solo de forma: el stock lo cuenta bien.
- *Dónde*: `nombreSinMedida` (16751-16756) solo saca «NNNxNNN» y «N,N PLZ». 4b194bd.
- *Arreglo propuesto*: Sacar los mismos patrones que `stockClaveCruda` («N,N» suelto, « - T.A.», corchetes).

**A4-3 · BAJA · En una RPT, el aviso del código del almacén pide «Poné el precio a mano»**
- *Para el dueño*: En una reposición de tienda (RPT), el aviso del código del almacén dice «poné el precio a mano», pero la RPT no lleva precio.
- *Dónde*: El texto del manejador del campo código (~3194) no mira `docTipoSel()`.
- *Arreglo propuesto*: Agregar esa frase solo si no es RPT.

**R1-5 · BAJA · Nueve o más pruebas de la batería dan rojo la víspera de cada feriado (la próxima: 31/10 y 1/11)**
- *Para el dueño*: Algunas pruebas automáticas del panel dan rojo la víspera de cada feriado, aunque el panel ande bien. La próxima vez es el 31/10 y el 1/11.
- *Dónde*: Las pruebas buscan «el primer día entregable» salteando solo el domingo, y desde 72aa862 el formulario frena ese día si es feriado. El auditor cuenta 21 archivos con ese patrón.
- *Arreglo propuesto*: Un ayudante común para las pruebas: primer día que no sea domingo, feriado ni día cerrado, o usar `proximoDiaEntrega()`.

### 22.3 · Los cruces entre áreas (los encontró el meta-auditor)
- **X-1 · BAJA** — Las ventas que el formulario deja infladas (R2-1, A2-1) inflan también lo vendido de la marca en la proyección y en las fichas de Contabilidad. Cuando el formulario deja una venta inflada, ese número también entra en lo vendido de Heaven o Sueña en la proyección y en las fichas de Contabilidad. Frente al mes es poco, pero no es real.
- **X-2 · ALTA** — El arreglo que propuso el auditor para R2-1 y A2-1 apaga el freno «poné el saldo» y deja reescribir el adelanto de una venta pagada sin preguntar. No es un error del panel publicado, sino del arreglo que propuso un auditor para los errores de plata. Tal como está, dejaría bajar el adelanto de una venta pagada de 2.500 a 2.000 sin preguntar. Hay una versión probada sin ese problema.
- **X-3 · ALTA** — Con el saldo cargado, el código de un producto del almacén que se agotó no completa nada ni avisa, y el renglón se pierde al guardar (R4-5 × A4-1). Aunque el panel esté bien cargado, si un producto que no está en la lista de precios se agotó y ya no figura en el Excel del día, su código no completa nada y no avisa. Si la vendedora no escribe el nombre, el pedido se guarda sin ese producto, justo cuando hay que mandarlo a fabricar.
- **X-4 · BAJA** — En «Qué producir», la historia del sistema de un producto fuera de la lista que no está en el Excel de hoy se suma a otro parecido del catálogo. En «Qué producir», las ventas viejas de un producto que no está en la lista de precios (y hoy no está en el Excel) se suman a otro parecido; por ejemplo, las medidas especiales 160x200 al 160x190. Con los datos de hoy son pocas unidades.

⚠️ X-2 no es un error del panel publicado: es del arreglo que propuso el auditor de plata para R2-1 y A2-1, que apagaba el
freno «poné el saldo». El meta-auditor dejó probada otra versión que no lo toca (su carpeta, `pedidos_fix_meta.html`).

### 22.4 · Las mejoras, en el orden del meta-auditor
1. **Frenar al guardar un renglón que tiene código o precio pero no tiene producto (y que la pregunta del saldo mire solo lo que se guarda)** (esfuerzo chico, riesgo bajo). Arregla A4-1 y X-3: pedidos que se guardan sin un producto, sin que nadie lo note. Está probado en …/rev30/meta/pedidos_fix_meta_stock.html, con 5 suites en verde.
2. **Plata del formulario: proponer montos con todo lo ya cobrado que «A cuenta» no muestra, sin tocar el freno; frenar la corrección de un adelanto registrado en dos pagos; y una prueba que exija que el total no cambie** (esfuerzo medio, riesgo medio). Arregla R2-1 (regresión de hoy), A2-1 y R2-4, y evita el efecto lateral del arreglo del auditor (X-2). Está probado en …/rev30/meta/pedidos_fix_meta.html, con 6 suites en verde.
3. **Que los códigos del almacén tengan las mismas protecciones que la lista de precios, y que la revisión automática no proponga «✔ hay» en esos renglones** (esfuerzo chico, riesgo bajo). Arregla R4-1. El dueño ya decidió esta regla para la lista de precios el 27/09.
4. **Multicenter: la ventana de 30 días junta los pedidos por fecha de entrega, más un caso de prueba donde la carga y la entrega son días distintos** (esfuerzo chico, riesgo bajo). Arregla R4-3 con una línea. El dueño ya lo decidió (00b0c68) y está probado (test_eduardo_multicenter 40/0).
5. **Feriados: revisar ya si hay pedidos para el 02/11 y el 25/12, y agregar el aviso «Quedaron en un día sin camión» (también para los días ya pasados)** (esfuerzo chico, riesgo bajo). Arregla R1-2. Los pedidos cargados antes del 29/09 para esos días no aparecen en ningún «Mañana»; revisarlos es un minuto en Administración. Que el importador de ROHO los mueva solo al próximo camión lo decide el dueño.
6. **Que el panel no olvide el código de un producto agotado: recordar sus claves mientras algo las nombre y completar el renglón desde el histórico** (esfuerzo medio, riesgo medio). Arregla R4-5, A4-2 y X-4: pedidos, pedidos a fábrica y llegadas que pasan al producto parecido. Hay que cuidar la celda de 50.000 del stock, sin guardar todo para siempre.
7. **Retiros: sacar de la cola la versión vieja, no vaciar los retiros al abrir sin conexión, avisar un duplicado también contra la cola, y tomar el sello al abrir ✏️** (esfuerzo chico, riesgo bajo). Arregla R2-3, R2-5 y R2-2, casos donde la plata vuelve atrás o se descuenta dos veces. Ya pasó una vez (§4ek). El sello de `__ret_` en el .gs sigue pendiente del servidor.
8. **Proyección: corregir la curva de una sola vez, sacar los feriados de «Qué días se vende más», contar bien las unidades escritas con «P/» o «PARA», y sumar una lista plegable para revisar unidades** (esfuerzo chico, riesgo bajo). Arregla R3-1, R3-2, R3-3, A3-1 y R3-4. Los arreglos del revisor y del auditor están probados (test_proyeccion 126/0). La lista deja ver con datos reales cómo se cuentan los renglones escritos a mano.
9. **Días: arreglos chicos que van juntos** (esfuerzo chico, riesgo bajo). Van en un solo cambio: - fecha por defecto = próximo día con camión (R1-3); - mensaje de feriado al cambiar el turno (R1-4); - «Próximo camión» en Cerrar día (A1-1); - aviso de ATC contando días hábiles (R1-1); - aviso del corte solo en día hábil (A1-2); - un ayudante común en las pruebas (R1-5).
10. **Próxima versión del .gs y feriados que se puedan cargar** (esfuerzo medio, riesgo medio; exige el `.gs`, decide el dueño). Van juntos: - el portero con los feriados; - el sello en los retiros; - una lectura que diga de cuándo es (M1, M8); - feriados «puente» cargables desde Administración, porque un decreto no se puede prever (M5).

### 22.5 · Qué se le escapó a cada nivel (del meta-auditor)
**Al que escribió el código:**
- El arreglo A2 dejó sin reconocer el 2° pago del mismo método dentro de «A cuenta», y el formulario lo cuenta dos veces (R2-1, R2-4).
- A1 escondió de «Mañana» los pedidos que quedan en un feriado (R1-2), desfasó «Cerrar día» (A1-1) y pudre pruebas en las vísperas (R1-5).
- A3 hizo que la curva se mueva sola en domingos y feriados (R3-1). La curva nueva ya traía el día equivalente no hábil (R3-2) y cuenta los feriados en los días de la semana (R3-3).
- Las unidades cuentan accesorios escritos con «P/» y pierden colchones que dicen ENTREGA o CAMAROTE (A3-1, R3-4).
- Multicenter quedó con dos claves distintas (R4-3).
- §4ha no llevó a los códigos del almacén las protecciones de §4gk (R4-1). Pisa lo elegido con la lectura (R4-2), deja perder un renglón con solo el código (A4-1, X-3) y no contempló el producto agotado (R4-5, A4-2, anotado en §4ga-6).
- Además hay tres cosas previas, no de hoy: A2-1, R2-3 y R2-5.

**A los revisores:**
- No vieron A2-1, que está en la misma función que R2-1.
- A1-1 lo vieron y lo dejaron como mejora; A1-2 no lo vieron.
- A3-1 se les pasó porque solo miraron colchones que no cuentan.
- A4-1, A4-2 y A4-3 tampoco los vieron.
- Inflaron R1-1, R2-2, R3-1 y R3-2, y bajaron R2-5 y R4-2.
- R4-5 ya estaba en la bitácora y no lo dijeron.

**A los auditores:**
- No refutaron nada mal, pero nadie conectó la plata con la proyección: la venta inflada entra en lo vendido (X-1).
- El arreglo del auditor A2 apaga el freno «poné el saldo» y deja bajar un adelanto de 2.500 a 2.000 sin preguntar (X-2). Sus tres suites no pasan por ahí.
- El auditor A4 limitó A4-1 a «sin saldo»; también pasa con el saldo cargado si el producto se agotó (X-3). No midió el efecto en «Qué producir» (X-4).
- El script de R2-5 no es del todo estable: 1 de 4 corridas salió distinta.

**Lo que se pidió mirar y está bien:**
- los feriados futuros en los días hábiles de la proyección;
- «PTF» frente a los otros textos;
- los feriados del cuadrito contra los cupos y la fábrica (474 cuadritos sin días imposibles, fuera de M4, que ya se conocía);
- el feriado, que frena antes de la lectura al guardar.

### 22.6 · Lo que dijo el dueño esa noche
- **Multicenter**: «el mismo día» es la **fecha de entrega** que pone él (*«cuando se entrega es la fecha que yo coloco de
  entrega, a veces cargo el pedido el mismo día para entregar ese mismo día»*). Anotado en `00b0c68`; R4-3 se arregla con
  `ek30 = stockEntregaClave(p, fs)` (la ventana de 30 días se sigue midiendo por fecha de venta, §4dv).
- **Feriados**: con la herramienta de diagnóstico (bitácora §4hb), a las 00:57 del 30/09 **no había ningún pedido agendado
  para un feriado** de acá en adelante (el meta-auditor recomendaba revisar el 02/11 y el 25/12).
- **«No conecta» (22:21-22:40)**: no era el panel ni el servidor, sino Google lento a ratos con la planilla entera sin
  comprimir (901 KB). Bitácora §4hb; propuesto para el 30/09: el cartel, la lectura comprimida y la de lo cambiado.

### 22.7 · Qué sigue
Nada de §22 está arreglado: espera el OK del dueño. Orden propuesto: las ALTA de plata juntas (R2-1, que es regresión del
29/09, con A2-1 y R2-4, con la versión del meta-auditor), el renglón que se pierde (A4-1/X-3), el código del almacén de
otra medida (R4-1), Multicenter (R4-3, ya decidido), el aviso «Quedaron en un día sin camión» (R1-2) y los retiros (R2-3,
R2-5). R4-5 (el producto agotado que el panel olvida) es más grande y toca la celda de 50.000 del stock: va aparte.

## Primera vuelta (`d890468`), resumida

| # | Hallazgo del informe original | Veredicto | Estado hoy |
|---|---|---|---|
| 1 | Stock y arqueo se pisan entre dispositivos | CONFIRMADO | Corregido y rehecho en esta vuelta (§1, §2) |
| 2 | Borrar desde una copia vieja se lleva un pago nuevo | CONFIRMADO (y el caso del borrador de Kommo ya completado) | Corregido; reforzado en esta vuelta |
| 3 | Pago mixto: corregir el 2° método deja «A cuenta» viejo | CONFIRMADO | Corregido; la 2ª vuelta cierra el caso del adelanto implícito (E6) |
| 4 | `SUMA(H:H)` del Excel del Cuadre duplica | CONFIRMADO (formato, no plata) | Sin tocar: decisión tuya |
| 5 | El Excel no trae el arqueo sin pagos | CONFIRMADO, más amplio | Corregido (`cuadreCierre`) |
| 6 | «Entrega» es la fecha agendada | CONFIRMADO | Rotulado «Entrega agendada»; el cambio de fondo es decisión tuya |
| — | `panel.yml` daba verde aunque el push fallara | CONFIRMADO | Corregido |
| — | Bitácora vieja | CONFIRMADO | Al día (§4fz y §4fz-b) |

## Commit

- **`5205ce8`** — «§4fz-b: la misma llegada no se cuenta dos veces, y el servidor no deja pisar a un
  panel viejo». Toca `pedidos.html`, `google-apps-script.gs`, `tests/test_concurrencia.js`,
  `tests/test_servidor.js`, `tests/test_mixto.js`, `tests/test_medias.js`, `BITACORA_CLAUDE.md` (§4fz-b)
  y `CLAUDE.md`.
- **Batería:** `./tests/correr.sh` → **74/74 suites en verde, 2.748 comprobaciones**. Revisada con el
  filtro que mira TODAS las formas de falla, no solo «N mal».
- **`test_concurrencia.js` bajo carga:** 4 corridas a la vez, 50/50 cada una. En dos pasadas
  anteriores salió 49/1 una vez. La causa era la prueba: la pestaña B vaciaba la cola antes de ver en
  el localStorage lo que A había dejado (el volcado lo mostró: B no mandó nada). Ahora B espera a
  verla. De paso, la memoria del panel pasó a ser por pestaña: sincronizar pestañas reemplazando la
  memoria podía borrar un cambio propio todavía sin guardar.
- **Escenarios de la auditoría** (arnés propio, fuera del repo): los 31 pasan contra este commit.
- **`9ee9c2e`**: «Incidente del 23/09: el pegado del .gs no entró entero, y los disparadores
  siguieron rotos».
  - Toca `google-apps-script.gs` (`probarAntesDeImplementar` y la cabecera), `traer_kommo.py` (la
    alarma del repaso parado), `tests/test_servidor.js` §11, `tests/test_traer.py` §6, este informe,
    `BITACORA_CLAUDE.md` §4fz-b y `CLAUDE.md`.
  - El panel (`pedidos.html`) no cambió.
  - **Batería sobre este commit: 74/74 en verde, 2.776 comprobaciones.**
