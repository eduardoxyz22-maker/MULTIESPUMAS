# RESPUESTA DE CLAUDE — Informe de errores MULTIESPUMAS, segunda vuelta (23/09/2026)

> **ACTUALIZACIÓN 26/09, 10:30 — EL ESTADO COMPLETO ESTÁ EN §13.** Todo lo arreglado ya está PUBLICADO: `main` =
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

## 13 · Estado al 26/09, 10:30 de Bolivia: lo arreglado, lo que falta y lo que hay que analizar

Esta sección junta TODO lo que está abierto y reemplaza las listas de §11 y §12. La actualicé después de publicar:
la tercera vuelta terminó (13.3) y todo lo de 13.2 y 13.3 ya está en producción.

### 13.1 Qué está publicado y qué no

| Pieza | En producción | En la rama |
|---|---|---|
| Página (`pedidos.html`, `productos-mes.js`) | **`a8e3c5e`, publicada el 26/09 a las 10:11** (merge de `8de15f9`): todo lo de 13.2 y 13.3 | lo mismo, más esta documentación |
| Servidor (`google-apps-script.gs`) | `2026-09-20-a` implementado | `2026-09-23-b` en el repo, sin implementar (enlace fijo `14dec98…`) |
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
