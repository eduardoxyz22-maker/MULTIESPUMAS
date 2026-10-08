# Informe para Codex · 07/10/2026 · «📍 Banzer o PTF», el plan de 7/15/30 días y la nota en Mis pedidos

Todo lo de este informe está **publicado** en `main` (último: `0d20d04`, 07/10 18:46 de Bolivia, Pages OK 18:47).
El servidor no cambió: sigue `2026-10-06-a`. Ningún cambio escribe la planilla: todo es pantalla.

Detalle largo en `RESPUESTA_CLAUDE.md` §33 y en la bitácora §4ht, §4hu, §4hv y §4hw. Acá va lo necesario para revisar.

| Qué | Bitácora | Publicado | Commit |
|---|---|---|---|
| Pantalla «📍 Banzer o PTF» | §4ht | 07/10 15:10 | `2c5ad8c` |
| La línea del dueño (lado oeste/este) | §4ht | 07/10 17:33 | `faff9a0` |
| Nota de venta en Mis pedidos, solo Eduardo | §4hu | 07/10 17:50 | `07c4db3` |
| Plan desplegable de 7, 15 y 30 días | §4hv | 07/10 18:10 | `3f44b05` |
| Plan, segunda vuelta + alerta de producción | §4hw | 07/10 18:46 | `0d20d04` |

---

## 1. «📍 Banzer o PTF» (§4ht)

**Pedido del dueño**: *«qué productos debemos tener en almacén Banzer y qué en Productos Terminados Fábrica, según los focos
de calor de entrega y rotación, para tener el stock a la mano según la zona de entrega»*. De los dos sale camión (§4ge); de
Moreno (IM) se va a buscar.

- **Dónde**: Stock → botón «📍 Banzer o PTF» → `abrirAlm()` → `#alm-overlay` (z 3100). Bloque de `pedidos.html` marcado `§4ht`.
- **Depósitos** (`ALM_UBIC`): PTF exacto (Plus Code 7V24+CRP). Banzer **aproximado** (`aprox:true`, sale de su dirección
  escrita: Google no le da el pin de un lugar con nombre a un programa). La pantalla lo avisa.
- **Entregas que cuentan** (`almZonaData`): 60 días por `fechaSalida`, hasta hoy, con las reglas de rotación de Stock
  (`stockCuenta`, sin `esVentaTienda`, sin `stockPedidoUnico`, sin `esProdDeTienda`). Por unidades.
- **El lado** (`almLado`): de qué lado de **la línea del dueño** cae (`ALM_DIVISION`, 23 puntos de norte a sur, `almLadoDeLinea`:
  oeste → Banzer, este → PTF; a menos de `ALM_LINEA_BANDA_KM`=0,5 km, mitad y mitad; las puntas siguen derecho). Sin línea, el
  depósito más cerca (`ALM_EMPATE_KM`). Sin pin, la zona escrita aprendida de los pedidos de esa zona con pin (`almZonas`, ≥3).
- **Cuánto tener** = `stockNecesario(o)` (la expresión que estaba adentro de `stockCuantoPedir`, sacada a función; el test
  verifica que «cuánto pedir» no cambió). Se reparte con la proporción del producto (`sB`). Lo que rota poco y lo discontinuado:
  todo en PTF.
- **Acciones de la tabla**: «🚚 Pasar N a Banzer» solo con lo que a PTF le sobra de lo suyo; «🏭 lo próximo que llegue»;
  «✋ no mandar más a Banzer». 🚫 **Nunca traer de Banzer a fábrica** (regla del dueño, 26/09).
- **Enlaces cortos** que el panel no lee: los abre el servidor en segundo plano (`almGeoPedir`: tandas de 20, los más nuevos
  primero, una vez por apertura). Lo abierto va a `MAPA_COORDS` y al teléfono.
- **La revisión automática NO cambió** (PTF → Banzer → IM). El dueño: *«aún no, porque debemos definir bien con logística las
  zonas que abarca cada almacén»*.

## 2. Nota de venta en Mis pedidos, solo para Eduardo (§4hu)

- `MIS_VE_NOTA=['Eduardo Añez']`, `misVeNota(v)` decide por el nombre **elegido** en Mis pedidos (no por el vendedor del pedido).
- `misNotaTxt(p)`: «· Nota N» o «· sin nota» al lado de la OC; nada en ATC ni RPT. La ficha (`showMisModal`) también.
- Las vendedoras no lo ven. `tests/test_mis_nota.js` (19).

## 3. El plan de 7, 15 y 30 días (§4hv → §4hw)

`<details id="alm-plan">` arriba del mapa, cerrado. Se arma una vez (`almPintar`) y solo se repinta lo de adentro
(`almPintarPlan`): una lectura nueva no lo cierra ni cambia el plazo.

**Lo que pidió el dueño**, en orden:
- *«qué tener en Banzer y qué tener en PTF para los próximos 7-15-30 días»*;
- *«sin cálculos de qué pedir a producción… mover más que todo a Banzer, pero sin descuidar las entregas de PTF»*;
- *«por ahí logística se lleva 30 colchones a Banzer y deja a PTF con 3 de ese modelo y necesita 13»*;
- con la primera versión publicada, su caso real (ESPECIAL SEMIORTOPEDICO, 6 vendidos, 0 en PTF, decía «Traer 2»):
  *«traer lo que ya está vendido… MÁS lo que debería tener para los próximos días, y lo mismo Banzer»*;
- *«¿qué pasa cuando el saldo es 0 en ambos almacenes?»*;
- *«no "pedir": se supone que el stock ya está pedido, si no TRAER DE MORENO»*;
- *«si el Excel de Moreno muestra menos, una alerta de "recordá revisar la producción"»*.

**La cuenta** (`almPlanDe(f, H, hoy, porId, Z, cache)`, por producto y plazo H, hasta hoy+H):
- **Ya vendido en su zona** (`firmeB`/`firmeP`): `stockData` ahora anota `o.compIds` = `{id, c, f}` en los dos lugares donde
  suma `comp` (no cambia ninguna cuenta; el test verifica que suma igual que `comp`). Cada pedido sale de UN depósito
  (`almLadoPedido`): su pin, o su zona escrita (gana el lado mayor); «sobre la línea» = PTF; sin pin ni zona, con `sB`.
- **Para tener** (`xB`/`xP`): `porDia × H` repartido con `sB`. Lo que rota poco, lo discontinuado y lo de pocos datos: todo en PTF.
- **Tener = ya vendido + para tener, SUMADOS** (§4hw). La primera versión tomaba el mayor. ⚠️ Por eso el plan ya **no** es
  `stockNecesario`: a propósito, el dueño quiere ver lo vendido aparte.
- **Llevar**: a Banzer solo lo que a PTF le **sobra** de su «tener» (`pasar`; PTF nunca queda debajo). Si a Banzer le sobra y a
  PTF le falta: «N de las entregas de PTF pueden salir de Banzer» (`cubreB`). Nunca de Banzer a PTF.
- **Traer** (`deM`): lo que todavía falta, **entero**, de la fábrica del producto (`almPlanFuente`: Moreno; Sueña → Multiespumas
  por `stockBloqueDe`/`MARCA_FABRICA`). Primero a PTF (contando lo en camino, `stockEnCaminoSeguro`), después a Banzer. Cada
  línea dice cuánto ya está vendido (`uF`): «📥 Traer 7 de Moreno a PTF (6 ya vendidos + 1 para tener)».
- **⚠️ La alerta** (`almPlanAlertaDe`): si lo que hay que traer es más de lo que dicen los Excel de los almacenes de donde se
  trae (`r.excel` = `o.otrosAlm`, ya libre de recogidas programadas) **y existe el Excel de esa fábrica** (`almPlanAlmsDe`:
  Moreno = los de «ir a buscar» que no dicen Multiespumas; de Multiespumas no se sube ninguno, así que Sueña no alerta).
  Texto: «⚠️ Recordá revisar la producción: para los próximos 7 días hay que traer 9 de Moreno y tenerlos, y el Excel de
  Moreno de hoy tiene 5. Faltan 4.» Si ese Excel no es de hoy: «el último Excel de Moreno, del 06/10». Va en la fila, en un
  cartel arriba con «Ver cuáles», en el filtro «⚠️ Revisar la producción (n)» y en la copia para logística.
- Nunca dice «pedir», «producir», «fabricar» ni «no alcanza».

**Pantalla**: plazos 7/15/30 con «hasta el dd/mm»; vistas «Qué hacer» · «⚠️ Revisar la producción» · «Todo el plan»; orden:
primero lo que más ya vendido hay que traer. «📋 Copiar el plan de N días» (`almCopiarPlan`): LLEVAR DE PTF A BANZER → TRAER DE
MORENO / MULTIESPUMAS → ⚠️ RECORDÁ REVISAR LA PRODUCCIÓN → TENER EN BANZER → TENER EN PTF.

## 4. Pruebas

- `tests/test_banzer_ptf.js`: **101** comprobaciones, reloj clavado en el 07/10, pedidos y coordenadas inventados, Leaflet de
  mentira que anota lo dibujado. §12 = el plan: cuentas a mano con la suma, el caso del dueño con 0 y 0, Sueña de
  Multiespumas sin alerta, la alerta con el Excel de hoy y el de ayer, el singular, el cartel y el filtro, la copia y 390 px.
  Contra `3f44b05`: 30 rojas.
- `tests/test_mis_nota.js`: 19 (8 rojas contra `faff9a0`).
- Batería entera: 138 suites. Una sola roja, en `test_borradores`, con la máquina cargada; corrida sola da 95/95.
- ⚠️ Las filas de las tablas se leen con `innerText`: con `textContent` los renglones de una celda salen pegados.

## 5. Para revisar (lo que me gustaría que mires)

1. **Redondeo por lado**: `xB` y `xP` se redondean cada uno por su cuenta; el total puede diferir en 1 de `round(porDia × H)`.
2. **Un pedido «sobre la línea»** se asigna entero a PTF en el plan, pero cuenta mitad y mitad en la proporción `sB`.
3. **La alerta mira el total del producto**, no por depósito (una sola fábrica abastece a los dos). ¿Hace falta por depósito?
4. **A 30 días** la alerta va a salir en muchos productos: el Excel de Moreno casi nunca tiene un mes de stock. ¿Conviene
   mostrarla solo en 7 y 15, o dejarla?
5. **Sueña sin Excel de Multiespumas**: no alerta nunca. Si algún día suben ese Excel con un nombre que diga «Multiespumas»,
   empieza a alertar solo.
6. **«Ya vendido» con fecha pasada**: un renglón «✗ no hay» o «📥 recoger» de un día que pasó sigue comprometido para hoy
   (la regla de Stock, §4de) y entra en los tres plazos. Lo sin marcar con fecha pasada se da por salido (§4co) y no entra.
7. **Banzer aproximado**: si el pin real cae del otro lado de la línea para algunas zonas, cambia el reparto. Falta que el dueño
   confirme las coordenadas.

## 6. Lo que NO se cambia sin el dueño

- Nunca traer de Banzer a fábrica ni de Banzer a PTF.
- El orden de la revisión automática (PTF → Banzer → IM, «el que la cubre entera» primero).
- El plan no hace cuentas de producción ni dice «pedir»: lo que falta se trae de Moreno, y si el Excel de Moreno no alcanza,
  solo se avisa «Recordá revisar la producción».
- Las zonas por depósito las va a definir logística: cuando estén, reemplazan la línea recta.
