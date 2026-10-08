# Informe del 08/10/2026 · El plan de «Banzer o PTF»: qué se habló con el dueño, qué se decidió y por qué

Para Claude y Codex. Publicado en `main` el 08/10 a las 21:05 de Bolivia (`27c8d0d`, Pages OK, run 37711127971).
Bitácora §4hx. Lo anterior (§4ht → §4hw) está en `INFORME_CODEX_07-10.md`.

---

## 1. De dónde salió

Codex revisó lo publicado el 07/10 (`0d20d04`) y reprodujo tres defectos del plan de 7/15/30 días y dos de documentación:

| | Qué encontró | Gravedad |
|---|---|---|
| F1 | Una llegada «de fábrica» anotada tapaba un faltante: el plan daba por cubierta una entrega de mañana | Alta |
| F2 | Lo que Banzer puede cubrir de la zona de PTF no salía en «Qué hacer» ni en la copia para logística | Media |
| F3 | Sin el Excel de PTF, el plan decía «cada depósito tiene lo suyo» | Media |
| D1 | En `main`, §4hw figuraba como «en la rama» | Baja |
| D2 | `RESPUESTA_CLAUDE.md` §33 mezclaba criterios viejos (1 km, `stockNecesario` como fuente del plan) | Baja |

F2, F3, D1 y D2 se aceptaron tal cual. **F1 generó la conversación de abajo, y cambió la regla de fondo.**

## 2. La conversación sobre F1 (en orden)

1. **Yo** expliqué F1 como «llegadas de fábrica que el plan descuenta sin mirar la fecha».
2. **El dueño:** *«el panel nunca va a saber cuándo algo llega de fábrica. Nos basamos con los saldos de almacén que suben del
   Excel cada día… revisa o corrígeme si me equivoco»*.
3. **Yo** aclaré que el panel no sabe de llegadas, pero sí de lo que logística ANOTA como «pedido a fábrica» (el «en camino»),
   y que el plan lo restaba entero.
4. **El dueño:** *«sigo sin entender. Arma una rueda o batería de prueba… la idea de estas pestañas es contar con el stock
   suficiente para cubrir las entregas de la semana y prevenirnos para los siguientes 15 días»*.
5. **La rueda de prueba** (panel publicado, datos inventados): ESPECIAL SEMIORTOPEDICO 140x190, 6 vendidos para mañana desde
   PTF, 0 en PTF, 0 en Banzer, 2 en Moreno.

   | Caso | Qué anotó logística | Qué decía el plan | ¿Bien? |
   |---|---|---|---|
   | 1 | Nada | «Traer 8 de Moreno a PTF» + alerta | ✅ |
   | 2 | Pedido a fábrica de 10, de hace un mes, nunca cerrado | «✓ Cada depósito tiene lo suyo» | ❌ |
   | 3 | Pedido a fábrica de 10, anotado hoy (llega el domingo) | «✓ Cada depósito tiene lo suyo» | ❌ |
   | 4 | Recogida de 6 de Moreno para mañana | «Traer 2 de Moreno a PTF» | ✅ |

6. **El dueño:** *«¿cómo sabés que está pedido a fábrica? El stock solamente muestra lo que ya salió de fábrica. Ellos no anotan
   lo que pidieron a fábrica»*.
7. **Yo** reconocí que la única forma era el botón «🏭 Pedí a fábrica» de Stock, y que si nadie lo usa los casos 2 y 3 no pasan.
8. **El dueño (la regla):** *«como 100 veces te dije que no usan ese botón y creo que lo vamos a quitar. Ellos no anotan que
   está en camino. Simplemente cargan los saldos de almacén cada día. Y si en Moreno aumenta el saldo de almacén, quiere decir
   que ese producto se fabricó y salió… hagamos las cosas bien»*.
9. **El dueño (el botón):** *«sí, porque ellos crean su Excel y correo, quítalos»* → y después: *«publica»*.

⚠️ **Lección para la próxima sesión:** el dueño ya lo había dicho antes (05/10: *«logística no marca que llegó de fábrica…
cada día solo suben las existencias de los almacenes»*). Antes de proponer algo que dependa de lo que logística ANOTA a mano,
leer esa regla. **Lo que vale es el Excel del día.**

## 3. La regla que quedó (no cambiar sin el dueño)

- **El plan de 7/15/30 días trabaja SOLO con los Excel del día** (PTF, Banzer, Moreno).
- Lo único que se suma además: **una recogida de Moreno ya programada** (`almPlanRecogidas`). Es el mismo «traer de Moreno» en
  marcha, ya descontado del Excel de Moreno; si no se restara, el plan pediría traer dos veces lo mismo.
- **Lo anotado como «pedí a fábrica» NO cuenta.** Lo que se fabricó aparece cuando sube el saldo de Moreno en el Excel.
- **No hay botón «🏭 Pedí a fábrica».** Logística pide a la fábrica con su propio Excel y correo.
  - «🚨 PEDIR YA» y «🏭 Pedir esta semana» quedan como aviso: ya no abren nada.
  - `abrirStockPedido` sigue en el código sin botón, por si quedó algún pedido anotado de antes.
- Siguen en la barra de Stock «🚚 Programar recogida» y «📥 Llegó de fábrica», porque no se pidió sacarlos. Si el dueño confirma
  que tampoco los usan, son los siguientes.

## 4. Qué se cambió en el código (`pedidos.html`)

- **F1:** `almPlanDe` ya no resta `stockEnCaminoSeguro(o)` sino `almPlanRecogidas(o)`: las recogidas pendientes menos lo
  que el Excel ya mostró como entrada sin explicar (`o.detectado`). La celda de PTF dice «+N en una recogida de Moreno».
  ⚠️ No volver a restar `stockEnCaminoSeguro` en el plan.
- **F2:** `cubreB` es una acción.
  - Entra en `almPlanHace` («Qué hacer») y en el total de arriba («↪️ N entregas de PTF salen de Banzer»).
  - Entra en la copia («↪️ CARGAR EN BANZER entregas de la zona de PTF»).
  - Texto de la fila: «↪️ Cargar en Banzer N de las entregas de la zona de PTF (a Banzer le sobran)».
  - Nunca de Banzer a PTF.
- **F3:** sin el Excel de PTF (`sinConteo`), la fila va a «Qué hacer» con «⚠️ Falta el Excel de PTF: no se puede calcular».
  - Arriba sale un cartel rojo (`#alm-plan-sinexcel`).
  - El total dice «hay ?» y la copia lo lista.
- **El botón:** fuera de la barra de Stock; `bpedir` devuelve un `<span>` en vez de un botón. La leyenda de «🚚 Ya pedido» lo
  explica.
- **D1/D2:** bitácora, `CLAUDE.md` y `RESPUESTA_CLAUDE.md` §33 al día.

La pantalla de Stock («cuánto pedir», «Qué producir», tiempos de fábrica) **no se tocó**: sigue leyendo los pedidos anotados de
antes, que con el botón quitado ya no crecen.

## 5. Pruebas

- `tests/test_banzer_ptf.js`: **106**.
  - Los tres casos de Codex: F1 con un «pedí a fábrica» viejo; la recogida, que sí cuenta; F2 en la copia; F3 sin el Excel.
  - Que no haya botón ni nada que abra ese formulario.
  - Contra `0d20d04`: 7 rojas.
- Batería entera: **138 suites, 5.254 bien, 0 mal**.
- La rueda de prueba para el dueño vive en el scratchpad de la sesión, no en el repo: casos 2 y 3 ahora dicen «Traer 8 de
  Moreno a PTF» + la alerta.

## 6. Lo que queda abierto

- ¿Sacar también «🚚 Programar recogida» y «📥 Llegó de fábrica»? Esperan al dueño.
- Las zonas de cada depósito las define logística; cuando estén, reemplazan la línea recta del dueño.
- El punto de Banzer sigue aproximado hasta que el dueño mande las coordenadas.
