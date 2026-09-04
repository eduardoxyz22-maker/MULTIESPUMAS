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

## Probar que el test tiene dientes

Un test nuevo que pasa no prueba nada: hay que verlo **fallar** contra la versión sin el
arreglo. Como los tests abren `pedidos.html` **relativo**, alcanza con pararse en otra
carpeta que tenga la copia vieja:

```bash
mkdir -p /tmp/viejo && git show origin/main:pedidos.html > /tmp/viejo/pedidos.html
cd /tmp/viejo && node /home/user/MULTIESPUMAS/tests/test_loquesea.js
```

Y **mirar cuáles pasan igual**: esos son los invariantes que el arreglo no debía romper
(en `test_tabla.js`, que el buscador siga encontrando todo). Si pasan *todos*, el test no
prueba el arreglo; si fallan *todos*, no está cuidando lo que ya funcionaba.

Que el test **reviente** contra la versión vieja también alcanza como prueba, pero conviene
que degrade a checks en rojo (`if(typeof loNuevo!=='function') return -1;`): quien lo corra
dentro de seis meses ve *qué* falta, no un stack trace.

## La regla de oro

**Si algo falla, es una regresión de verdad.** No hay "fallas conocidas" que normalizar: la
línea de base es CERO. Si un test queda desactualizado porque el panel cambió a propósito,
se **actualiza el test** —explicando en un comentario qué cambió y por qué— y vuelve a cero.

## La auditoría (`test_auditoria.js`) y lo que enseñó

Los otros tests prueban **una** función. `test_auditoria.js` hace lo contrario: recorre
**todas** las vistas, ventanas y fichas con un pedido de cada forma, y después de cada paso
mira tres cosas — errores JS, **ids repetidos en el DOM vivo**, y `onclick` que apunten a
funciones que no existen. Cuatro pasadas: con llave, sin llave, planilla **vacía** y celular.
Correrla después de cualquier cambio grande; tarda ~90 s.

Reglas que salieron de armarla (cada una viene de un bug real, §4bx):

- **Buscar funciones declaradas dos veces a nivel raíz** antes de dar algo por bueno. En JS
  la última pisa a la primera para *todos* los llamadores, sin error ni aviso. Así
  desapareció el día de la semana del panel de cupos: dos `diaSemana` con firmas distintas.
  ```bash
  grep -oE "^function [A-Za-z_$][A-Za-z0-9_$]*\(" pedidos.html | sort | uniq -d
  ```
- **Un id que sale dos veces a la vez es un bug**, aunque el HTML "se vea bien":
  `getElementById` devuelve el primero y el otro queda muerto. Si algo tiene que salir
  repetido (un contador en dos lugares), va como **clase**. Ojo: dos ramas de un ternario con
  el mismo id **no** son duplicado — solo se dibuja una. La radiografía del DOM vivo distingue
  las dos cosas; el grep estático no.
- **El regex de `onclick` tiene que saltear palabras reservadas.** `onclick="if(...)"` no
  llama a una función `if`. Sin la lista de excepciones, 168 pasos en rojo de golpe.
- **Sin internet, Leaflet no carga nunca**: `ensureLeaflet` encola y el código de los pines
  no se ejecuta jamás, así que queda sin probar. El test inyecta un **Leaflet mínimo de
  mentira** (`window.L={map,tileLayer,circleMarker,…}`). Si el panel usa un método que el
  falso no tiene, revienta — y eso es lo que se quiere ver.
- **El fixture tiene que tener una entrega de HOY.** Sin ella, el Excel «Hoy», el cierre del
  día y el mapa «Hoy» no tienen nada y pasan vacíos, o fallan por motivos que no son bugs.
- **La pasada con la planilla vacía no es opcional.** Es donde viven los `STATE[0].id` y los
  `lista[0].fecha` que con datos nunca se ven.
