# Tests del panel de pedidos

**Corren contra `pedidos.html` de verdad, en un Chromium real.** Cada uno arma sus datos de
prueba, hace lo que haría una persona y comprueba lo que se ve en pantalla.

```bash
./tests/correr.sh          # toda la batería
./tests/correr.sh plata    # solo los que digan "plata" en el nombre
node tests/test_plata.js   # uno solo, con el detalle
```

> ⚠️ **Siempre desde la raíz del repo**: los tests abren `./pedidos.html`.

## ⚠️ POR QUÉ ESTÁN ACÁ Y NO EN UNA CARPETA TEMPORAL

El 21/08/2026 se perdieron **~117 suites** de golpe. Vivían en el directorio temporal de la
sesión (`/tmp/.../scratchpad/`), que el sistema borra sin avisar, y **nunca se habían
commiteado**. Solo se pudieron rescatar 2 del historial de la conversación.

**Todo test nuevo va en esta carpeta y se commitea en el mismo commit que el cambio que
prueba.** Un test que no está en el repo es un test que todavía no existe.

## Cómo se escriben acá

- Los nombres de las comprobaciones se leen **en castellano y en criollo**: dicen qué tiene
  que pasar, no cómo está hecho. Cuando uno falla, el mensaje solo tiene que alcanzar.
- **Nada de fechas fijas.** Usar `todayStr()` / `tomorrowStr()` o anclar en el mediodía
  (`new Date().setHours(12,0,0,0)`). Ya rompieron tres veces al pasar el tiempo.
- **Y ojo con `tomorrowStr()` a secas**: si mañana cae **DOMINGO** el panel no agenda, así
  que el test se cae **solo los sábados** (pasó con tres suites el 22/08). Cuando el test
  carga un pedido por el formulario, hay que correrse al primer día entregable:
  ```js
  var d=new Date(), f;
  do { d.setDate(d.getDate()+1); f=isoLocal(d); } while(diaDomingo(f));
  ```
- Al capturar avisos (`toast`), juntar **todos**, no quedarse con el último: el panel puede
  meter un "Sin conexión" en el medio y pisar el que se busca.
- **La planilla simulada tiene que tener el pedido.** Varias funciones del panel terminan en
  `showView(...)`, que **vuelve a bajar la planilla**: `editPedido` es una. Si el "servidor"
  simulado (`apiList`) devuelve vacío, `STATE` se vacía en medio de la prueba, `findById`
  devuelve `null` y el test mide otra cosa —y a veces *pasa* por el motivo equivocado—.
  Sembrar el pedido en **las dos** puntas: `STATE` y la planilla simulada.
- **Nunca poner la ruta absoluta del panel** (`path.resolve('/home/user/.../pedidos.html')`).
  Siempre `path.resolve('pedidos.html')`, que sale de `correr.sh` parado en la raíz. Con la
  ruta absoluta, correr el test contra una copia vieja (`git show <commit>:pedidos.html`)
  abre **igual el archivo de trabajo**: parece que la versión vieja ya estaba bien y uno
  cierra el bug por bueno. Pasó el 25/08 con el arreglo del banco del QR.
- **Para probar Administración no alcanza `UNLOCKED=true`.** El candado esconde
  `#admin-content` con un `display:none` inline que solo quita `tryUnlock()`. Si no se abre a
  mano, todo mide "oculto" y el test no distingue lo que escondió la función que se prueba de
  lo que ya estaba tapado:
  ```js
  document.getElementById('admin-lock').style.display='none';
  document.getElementById('admin-content').style.display='block';
  mostrarBotonesTodos();
  ```
- Un test que **no imprime ninguna falla porque se cayó antes** pasa por bueno. Si se toca
  una función que un test llama, correrlo y mirar que llegue hasta el final.
- Terminar con `process.exit(FAIL?1:0)` y un resumen `N bien · N mal`.

## La regla de oro

**Si algo falla, es una regresión de verdad.** No hay "fallas conocidas" que normalizar: la
línea de base es CERO. Si un test queda desactualizado porque el panel cambió a propósito,
se **actualiza el test** —explicando en un comentario qué cambió y por qué— y vuelve a cero.
