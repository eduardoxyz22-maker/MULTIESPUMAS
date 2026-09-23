# RESPUESTA DE CLAUDE — Informe de errores MULTIESPUMAS (23/09/2026)

**Para:** el dueño y Codex (revisión).
**Rama:** `claude/pedidos-fecha-entrega-bgt0em`, **commit `d890468`**. Nada de esto está en `main`: la web
sigue con `ebc3eab`, como pediste («no publiques todavía»).
**Base revisada:** `ebc3eab`. El informe se hizo sobre `ca32e3b`; en el medio se publicó §4fy (los ocho
botones de plata), así que **los números de línea del informe ya no coinciden**. Abajo van los de hoy.

> ⚠️ **Sobre la coordinación.** Trabajo en un servidor en la nube: **no tengo acceso a `C:\Users\…`** ni a
> OneDrive. No pude leer `Informe-errores-MULTIESPUMAS-2026-09-23.md`. Trabajé sobre el informe que me
> pegaste en el chat (mismo día, mismos seis hallazgos, mismo orden de prioridad). Si la versión del
> archivo tiene algo distinto, pegala o subila al repo y la reviso.
> Este archivo está en la raíz del repo, en la rama de arriba, y también te lo mandé para que lo copies
> a `CLAUDE TRABAJOS\RESPUESTA_CLAUDE.md`. Para que Codex lo vea sin copiar nada:
> `git fetch origin && git checkout claude/pedidos-fecha-entrega-bgt0em`.

> 🔎 **Todavía en curso:** lancé un agente propio para romper los arreglos 1 y 2. Si encuentra algo, lo
> corrijo en esta misma rama y lo agrego abajo, en «Revisión adversarial».

---

## Resumen

| # | Hallazgo del informe | Veredicto | Estado |
|---|---|---|---|
| 1 | Stock (y arqueo) se pisan entre dos dispositivos | **CONFIRMADO**, reproducido | Corregido: panel + `.gs` `2026-09-23-a` |
| 2 | Borrar desde una copia vieja se lleva un pago nuevo | **CONFIRMADO**, y con un caso peor | Corregido: panel + `.gs` |
| 3 | Pago mixto: corregir el 2° método deja «A cuenta» viejo | **CONFIRMADO**, con efecto en el formulario | Corregido: panel |
| 4 | `SUMA(H:H)` del Excel del Cuadre duplica | **CONFIRMADO** (formato, no plata) | **Sin tocar: decisión tuya** |
| 5 | El Excel no trae el arqueo sin pagos | **CONFIRMADO**, y es más amplio | Corregido: panel |
| 6 | «Entrega» es la fecha agendada, no la real | **CONFIRMADO** | Rotulado; el cambio de fondo es **decisión tuya** |
| — | `claveOk_` abierto sin `PANEL_KEY` | Es como está, por tu decisión del 05/09 | Sin cambios |
| — | ¿Qué `.gs` está publicado? | Era `2026-09-20-a` (§4fx). Hoy implementaste `2026-09-23-a` | **Falta confirmarlo** (ver abajo) |
| — | Publicación sin verificar | Los deploys de Pages de hoy se verificaron (`ebc3eab`: éxito 14:49 UTC) | — |
| — | `panel.yml` da verde aunque el push falle | **CONFIRMADO** | Corregido |
| — | Bitácora con encabezado de julio y pendientes viejos | **CONFIRMADO** | Corregido |

**Pruebas:** batería completa **74/74** en verde con el código de `d890468`. Cada arreglo tiene una prueba
nueva que falla contra el código anterior (los «dientes» de abajo). Todo con datos sintéticos, con la
red cortada y el servidor simulado. **No se probó contra la planilla real ni en celulares.**

---

## 1 · Stock y arqueo que se pierden entre dispositivos — CONFIRMADO

**Reproducción.** Dos navegadores con el panel real y el `.gs` real en Node, con una planilla de
mentira. El `fetch` del panel entra por `doPost` (`tests/test_concurrencia.js`). Con el código anterior
(`ebc3eab` + `.gs 2026-09-20-a`):
- A anota una entrada de 5 unidades y B, con la copia de antes, un pedido a fábrica de 8. Los dos
  guardados dan ✓ y en la planilla queda `e:[]`: **la entrada de A desaparece.**
- Dos recogidas del mismo corte de Moreno (10 − 3 y 10 − 2), cada una en un dispositivo: queda **8**,
  cuando lo correcto es **5**.
- Arqueo: A anota la caja (Efectivo 900) y B el extracto (QR BISA 2000). Queda **solo el de B**.

**Causa.** `doSave` exceptuaba del sello a toda fila `__…` («las maneja una sola persona»). El stock lo
tocan logística, el dueño y quien sube el Excel. Cada guardado reescribe la fila entera.

**Corrección.**
- **`.gs`** (`google-apps-script.gs`):
  - `:53` `SISTEMA_CON_SELLO = {__stock__, __arqueo_cuadre__}`.
  - `:917` `selloSistema`: esas dos filas se comparan con la hoja **solo si el panel manda `rev`**. Un
    panel viejo cacheado no lo manda y pasa como antes; rechazarlo lo dejaría sin poder guardar el
    stock, sin saber por qué.
  - `:401` ese `conflicto` **no se anota en «Rechazos»**: lo resuelve el panel.
  - `:73` versión **`2026-09-23-a`**.
- **Panel** (`pedidos.html`):
  - `:13349` `filaStock()` y `:3954` `filaArqueo()` guardan con `rev: sisRev(id)`.
  - `:13396` `SIS_BASE` guarda la versión del servidor sobre la que se trabajó. Se anota al leer
    (`leerCierresDeLista` `:9055`) y con el eco de cada guardado (`apiSaveAhora` `:2077`).
  - Ante `conflicto`, `apiSaveAhora` (`:2101`) llama a `sisFusionarYGuardar` (`:13520`), que junta tres
    versiones (la base, la mía y la del servidor) y vuelve a guardar con el sello nuevo. Hace hasta 3
    intentos seguidos y deja un guardado en espera con lo ya juntado.
  - Reglas de la junta (`:13406`–`:13500`):
    - `fusMapa`: uniones, qué es cada almacén y el arqueo. Por clave, gana el lado que la tocó.
    - `fusLista`: entradas e historial. Se cuentan como multiconjunto con deltas, así que dos entradas
      iguales el mismo día quedan como dos.
    - `fusPorId`: pedidos a fábrica y recogidas, por id.
    - `fusFoto`: conteos. Son la foto de un corte y gana el más nuevo; si es el mismo corte y los dos
      lados restaron por recogidas, se restan las dos.
    - Sin base conocida (la página se recargó con el guardado en la cola), se une sin contar dos veces.
  - `:13505` `sisMasNueva` y `:9074`/`:9109`: con una fila «en vuelo» (la memoria manda por 90 s,
    §4ev), si el servidor trae una versión **más nueva** que la última guardada, se junta enseguida.
    Esto no aplica si hay un guardado propio en el aire o en la cola.

**⚠️ Hacen falta las dos mitades.** Con el panel nuevo y el `.gs` viejo el stock se sigue pisando,
porque el servidor nunca dice «conflicto». Con el `.gs` nuevo y un panel viejo, también.

**Pruebas.**

| Suite | Resultado | Dientes (contra el código anterior) |
|---|---|---|
| `tests/test_concurrencia.js` (nuevo) | **18/18** | Con `.gs` viejo: **7 rojos**, que son stock, arqueo y el sello del borrado; el releer del panel ya protege el resto. Con panel viejo: **14 rojos**. |
| `tests/test_servidor.js` (177 → 194) | **194/194** | **9 rojos** contra el `.gs` viejo |

## 2 · Borrar desde una copia antigua — CONFIRMADO (y un caso peor)

**Reproducción** (`test_concurrencia.js` §4 y §5). A tiene abierta una venta que debe Bs 1.000. B
registra el pago y A confirma «Eliminar» con su vista vieja. Con el código anterior, **se borra la venta
con el pago adentro** y A ve «Pedido eliminado».

**El caso peor, que el informe no traía:** «Descartar» un borrador de Kommo que otra vendedora **ya
completó**. Es un pedido con el **mismo id** que el borrador (§4es): se borraba la venta y el lead quedaba
marcado como descartado en Kommo.

**Corrección.**
- **`.gs`**: `:971` `doDelete(id, rev)` y `:456` `doPost` le pasa `body.rev`. Si viene `rev` y no
  coincide con la hoja (`:986`), **no borra** y contesta `conflicto` con la fila actual, que queda en
  «Rechazos» con los dos sellos. **Sin `rev` borra como antes**, por los paneles viejos.
- **Panel**:
  - `:2270` `apiDelete(id, rev)`.
  - `:2286` `borrarEnServidor(loc)` **relee la planilla antes de borrar** (`apiList`, tope 20 s).
    - Si la fila cambió y no es solo el sello (`mismoContenido`), no borra.
    - Si ya no estaba, cuenta como borrado.
    - Si no pudo releer, borra con el sello visto y frena el servidor nuevo.
  - `:7970` `realDelete` borra en pantalla primero, como siempre, y **vuelve a poner la venta** si no se
    borró, con el aviso de qué cambió (`queCambioTxt` `:2307`): «ahora figura PAGADA · cobrado Bs 0 →
    Bs 1.000 · saldo…».
  - `:10749` `descartarBorrador` y `:9018` `borrEsLaMisma` pasan por lo mismo; `:4838` `borrarRetiro`
    manda su sello.
- **El releer protege desde ya, sin el `.gs` nuevo.** Queda una ventana de segundos entre leer y borrar,
  que el sello del servidor cierra.

**Pruebas.** `test_concurrencia.js` §4 (con y sin poder releer, y el control de una venta sin cambios
que sí se borra) y §5. `test_servidor.js`: borrar con sello viejo se rechaza, sin sello borra, una fila
nunca sellada se borra con `rev 0`, y queda anotado en «Rechazos». También siguen en verde
`test_borradores` 95, `test_medias` 23 y `test_botones` 50.

## 3 · Segundo método del pago mixto — CONFIRMADO

**Reproducción** (`tests/test_mixto.js` §4b). Adelanto mixto: Efectivo 1.500 + QR 500, A cuenta 2.000,
saldo 2.990, total 4.990. Contabilidad corrige el QR a 700. El saldo baja bien a 2.790, pero **«A cuenta»
queda en 2.000** en vez de 2.200. Además, al abrir el formulario **muestra 2.000 + 2.790 = 4.790** en
lugar de 4.990: el estado incoherente se ve en pantalla y viaja con cualquier edición de la plata.

**Corrección** (`ctaGuardarPago` `:5567`, rama cobro `:5662`–`:5668`). Se usa la misma regla que
`mixtoDe` (mismo día y mismo recibo que el anticipo, `mixtoEn` `:6638`) **antes y después** del cambio.
Si el renglón era o pasa a ser parte del adelanto, `p.acuenta = anticipo + 2° método`. Si le cambian el
recibo, deja de serlo y «A cuenta» vuelve al anticipo solo. La venta cargada «SÍ, pagado» sigue con el
adelanto en 0, a propósito (§4cb).

**Pruebas.** `test_mixto.js` 23 → **28/28**, con **4 rojos** contra el panel anterior. Se prueba: el
QR 500 → 700, que el total no se mueve, que el formulario muestra 2.200 + 2.790, que guardar sin tocar
la plata conserva todo, y el cambio de recibo.

**Queda abierto (decisión tuya):** `mixtoDe` reconoce el 2° método por **heurística** (mismo día y
recibo). Un pago posterior del mismo día y con el mismo recibo se confundiría con él. Marcarlo
explícitamente en el texto del historial cambia el formato que leen los paneles viejos: lo haría solo
si lo querés.

## 4 · `SUMA` de la columna MONTO del Excel del Cuadre — CONFIRMADO, sin tocar

Los montos del «Cierre por forma de pago» comparten la columna H con el detalle de pagos, así que
`SUMA(H:H)` da el doble. **No es plata perdida**: los totales del panel están bien. Arreglarlo cambia el
formato de un archivo que ya usás, así que **necesito tu opinión:**
- **(a)** poner el cierre en una **hoja aparte** (mi recomendación; es lo que propone el informe), o
- **(b)** dejarlo como está.

La fila nueva «DIFERENCIA TOTAL» (del punto 5) va en la columna J, así que no suma en H.

## 5 · El Cuadre y su Excel no coinciden — CONFIRMADO (más amplio)

**Reproducción** (`tests/test_cuadre_alta.js` §4fz). Se cuentan Bs 900 en efectivo sin ningún pago en
efectivo en el período. La tarjeta de la pantalla lo cuenta (desde §4fo), pero **la tabla del cierre no
muestra esa fila y su TOTAL dice «sobra 900»**. El texto de WhatsApp y el Excel no lo traen, y **sin
ningún pago en el período el Excel ni se bajaba**.

**Corrección.** `cuadreCierre()` (`:3974`) arma el cierre una sola vez, con los arqueos sin pagos
marcados y la diferencia total, y lo usan la pantalla (`renderCuadre` `:4353`), el texto
(`cuadreTexto` `:4653`) y el Excel (`exportCuadre` `:4691`, que suma la fila «DIFERENCIA TOTAL» y se
baja aunque solo haya arqueos).

**Pruebas.** `test_cuadre_alta.js` 31 → **35/35**, con **4 rojos** contra el panel anterior.

## 6 · «Entrega» es la fecha agendada — CONFIRMADO

En Contabilidad → Ventas el botón decía «🚚 Entrega» y la columna «Entregado el», pero cuenta la fecha
**agendada** (`p.fecha`), que logística reescribe al reprogramar. **Corrección inmediata, sin cambiar el
comportamiento:** ahora dicen «**Entrega agendada**», con una ayuda que explica que si se reprograma la
venta cambia de mes (`:1181`, `setContaBase` `:3215`, encabezado de la tabla).

**Decisión tuya:**
- **(a)** dejarlo así (agendada y rotulada),
- **(b)** contar en «Entrega» solo lo marcado entregado, o
- **(c)** guardar el **día real** al marcar ✅ entregado. Necesita una columna y una versión nueva del
  `.gs`.

## Otros puntos del informe

- **`claveOk_` abierto sin `PANEL_KEY`:** es por tu decisión del 05/09 («no configurarla hasta que él
  lo pida»). No se tocó.
- **Versión del `.gs`:** hoy implementaste `2026-09-23-a` («ya dio»). **Falta confirmarlo:** en el panel,
  **Administración → 🔒 Cerrar día**, el cuadro verde tiene que decir *versión 2026-09-23-a*. Desde acá
  no puedo lanzar el respaldo de Kommo (GitHub devuelve 403 a mi integración); lo miro en la próxima
  corrida automática.
- **`panel.yml`:** `git push || echo "nada que empujar"` daba verde aunque el push fallara. Ahora
  distingue «sin cambios» (sale limpio), reintenta 3 veces con `git pull --rebase` y si no, **falla con
  `::error::`** (`.github/workflows/panel.yml`, paso «Commit y push»).
- **Bitácora:** el encabezado decía «2026-07-13» y §5 hablaba del `.gs` 20-a «sin publicar» y de
  `test_producir` con 6 rojos (hoy 62/62). Quedó al día, con la sección nueva **§4fz**.

## Compatibilidad (qué pasa en cada combinación)

| Panel \ Servidor | `.gs` 2026-09-20-a | `.gs` 2026-09-23-a (implementado hoy) |
|---|---|---|
| **Publicado hoy (`ebc3eab`)** | como siempre | **como siempre**: no manda sellos, así que el servidor no compara |
| **Nuevo (`d890468`)** | borrar: protegido por el releer del panel · stock/arqueo: se siguen pisando | **todo protegido** |

## Cómo verificar (para Codex)

```
git fetch origin && git checkout claude/pedidos-fecha-entrega-bgt0em   # d890468
./tests/correr.sh                       # batería completa (74 suites)
node tests/test_concurrencia.js         # dos navegadores contra el .gs real
node tests/test_servidor.js             # el .gs solo
# dientes contra el código anterior:
git show ebc3eab:google-apps-script.gs > /tmp/viejo.gs && GS=/tmp/viejo.gs node tests/test_concurrencia.js
mkdir -p /tmp/v && git show ebc3eab:pedidos.html > /tmp/v/pedidos.html && git show ebc3eab:productos-mes.js > /tmp/v/productos-mes.js \
  && PEDIDOS=/tmp/v/pedidos.html node tests/test_concurrencia.js
```

Las rutas de Playwright y Chromium de los tests son las de Linux (`/opt/node22/…`, `/opt/pw-browsers/…`).
En Windows hay que adaptarlas, como ya hizo la revisión anterior.

## Decisiones que necesitan tu opinión

1. **Publicar** `d890468` en `main`, cuando lo apruebes (vos o Codex).
2. **Excel del Cuadre:** ¿el cierre en hoja aparte (a) o se deja (b)?
3. **«Entrega»:** ¿(a) agendada y rotulada, (b) solo lo entregado, o (c) guardar el día real?
4. **Pago mixto:** ¿marcar el 2° método en el historial en vez de reconocerlo por día y recibo?
5. Siguen pendientes de antes:
   - **MEDIA-4:** 💵 de Administración deja el efectivo a nombre de la vendedora aunque haya cobrado el
     chofer.
   - **MEDIA-5:** un cobro nuevo sobre una venta ya ✅ registrada no avisa.
   - **`PANEL_KEY`:** en espera.

## Revisión adversarial

_(pendiente: se completa cuando termine el agente)_
