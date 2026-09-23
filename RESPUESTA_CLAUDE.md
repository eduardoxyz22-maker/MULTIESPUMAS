# RESPUESTA DE CLAUDE — Informe de errores MULTIESPUMAS, segunda vuelta (23/09/2026)

**Para:** el dueño y Codex (revisión).
**Rama:** `claude/pedidos-fecha-entrega-bgt0em`. **Commits de esta vuelta: `5205ce8`** (código, pruebas y
bitácora) **y `9ee9c2e`**, el del incidente (§0: `probarAntesDeImplementar`, la alarma del repaso
parado y el procedimiento de §7).
**Nada de esto está publicado.** `main` sigue en `ebc3eab` y el servidor volvió a `2026-09-20-a`. Pero
el repaso de Kommo del script sigue parado desde las 11:24 (ver §0).

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
- Falta saber **cómo** se cortó el pegado (de dónde se copió y con qué programa se abrió el archivo).
  Le pregunté al dueño: es lo que hay que evitar al subir la 23-b. `probarAntesDeImplementar`
  (§5) detecta justo esto, **si se corre**: su prueba C es un pegado cortado antes de `kommoRepaso`.

### Qué se le pidió al dueño
Nada de esto afecta al equipo: guardar en el editor no cambia lo implementado.
1. Captura del error de `kommoRepaso` en Ejecuciones.
2. Pegar de nuevo la 20-a, sacada del raw de `main`, y guardar.
3. Ejecutar `estadoKommo` y `kommoRepaso` desde el editor.
4. **No tocar «Implementar».**

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
  corridas del 23: el webhook no avisó nada en todo el día, y las ventas entraron por los repasos.
  - Puede ser normal: el respaldo filtra por `updated_at`, no por cambio de etapa.
  - Igual hay que mirarlo en Kommo → Webhooks.
- **Producción ahora:**
  - Implementado: panel `ebc3eab` + `.gs` `2026-09-20-a`, que es lo que ese panel espera.
  - En el editor: lo pegado a las 11:24, hasta que el dueño lo reemplace.
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
| `tests/test_servidor.js` (194 → 201 → **214**) | **214/214** | 23-a: 7 rojos · §11 `probarAntesDeImplementar` (13, con un pegado cortado de verdad): 5 rojos contra el 23-b de `5205ce8` |
| `tests/test_traer.py` (§6 nueva, 15) | **64/64** | `traer_kommo.py` de `main`: 4 rojos (con el repaso parado 3 h, la corrida salía en verde) |
| `tests/test_mixto.js` (28 → 33) | **33/33** | `d890468`: 4 rojos (3.000 → 3.600) |
| `tests/test_medias.js` (23 → 24) | **24/24** | cambió a propósito: «not found» = borrado, y respuesta perdida = «no se sabe» |
| `tests/test_adm_alta.js` | **18/18** | — |
| Batería completa (`tests/correr.sh`, 74 suites) | **74/74 en verde, 2.776 comprobaciones** (2.748 sobre `5205ce8` + 13 + 15 del incidente) | — |

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

## 7 · Cómo publicar (cuando el dueño y Codex digan) — reescrito después del incidente

0. **Antes que nada, el editor tiene que estar sano.** `estadoKommo` corre sin error y el repaso está
   al día (lo que se le pidió al dueño en §0).
1. **Mergear la rama a `main`** y esperar el deploy de Pages, 1 a 2 minutos. El panel nuevo anda con el
   servidor de ahora (20-a), sin la protección del stock.
2. **Pegar el `.gs` 23-b en el editor.**
   - Copiarlo de https://raw.githubusercontent.com/eduardoxyz22-maker/MULTIESPUMAS/main/google-apps-script.gs
     (después del merge es el 23-b): Ctrl+A y Ctrl+C.
   - En el editor: clic en el código, Ctrl+A, Supr (tiene que quedar **vacío**), Ctrl+V y Ctrl+S.
     No tiene que salir ningún mensaje rojo.
   - La última línea con texto es la **1889** y dice `}`; justo antes dice `return borrador;`.
   - ⚠️ **Desde este momento los disparadores ya corren el 23-b**, aunque no se implemente. Su parte de
     Kommo es igual a la de 20-a.
3. **Probar antes de implementar:** elegir `probarAntesDeImplementar` en la lista de al lado de
   ▶ Ejecutar y ejecutarlo. Si pide permisos, se aceptan.
   - Tiene que terminar en **«✅ Se puede implementar»**.
   - Con una ❌ o un error rojo **no se implementa**: se vuelve a pegar la 20-a (paso 6) y se manda la
     captura.
4. **Implementar → Administrar implementaciones → ✏️ la de siempre → Versión nueva → Implementar.**
   **Nunca «Nueva implementación».**
5. **Verificar enseguida:**
   - el panel (F5) dice «Conectado»;
   - el cuadro de 🔒 Cerrar día dice `2026-09-23-b`;
   - o se corre Actions → «Traer ventas de Kommo (respaldo)» → Run workflow: dice la versión, y ahora
     sale en rojo si el repaso del script está parado.
6. **Si alguien queda sin conexión, volver atrás son DOS cosas:**
   - ✏️ → la versión anterior: arregla el panel;
   - **y** pegar de nuevo la 20-a en el editor: arregla los disparadores. Después del merge, `main` ya es
     23-b, así que la 20-a se saca de un commit fijo:
     https://raw.githubusercontent.com/eduardoxyz22-maker/MULTIESPUMAS/ebc3eab108594105b3d7db0013a3f4ff82edfafe/google-apps-script.gs
     (1732 líneas).
   - El panel nuevo anda con la 20-a.
7. **Pedir a todos que recarguen (F5).** Hasta entonces, cada computadora vieja no toca el stock ni
   borra (§4.1).

---

## 8 · Decisiones que necesitan tu opinión

1. **Publicar** esta vuelta (panel + `.gs` 23-b juntos, §7), cuando la apruebes vos o Codex.
2. **La captura de Ejecuciones con el error de `kommoRepaso`**, y confirmar que volviste a pegar la
   20-a y que el repaso volvió (§0). Lo necesito antes de pedirte que subas la 23-b: si el problema
   fue el pegado, el mismo camino puede repetirlo.
3. **Excel del Cuadre:** ¿el cierre en una hoja aparte (a) o se deja como está (b)?
4. **«Entrega»:** ¿(a) agendada y rotulada, (b) solo lo entregado, o (c) guardar el día real?
5. **Pago mixto:** ¿marcar el 2° método en el historial, en vez de reconocerlo por día y recibo?
6. Siguen pendientes: MEDIA-4, MEDIA-5 y `PANEL_KEY` (en espera).

---

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
