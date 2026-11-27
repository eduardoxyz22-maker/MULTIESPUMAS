# Auditoría completa del panel de MultiEspumas: encargo para Jarvis

**Pedido del dueño (27/11/2026):** auditar todo el panel, con prioridad en **Contabilidad**, **Proyecciones** y **Metas**. Después
van **entregas**, **errores de guardado y sincronización** y todo lo demás.
Regla del dueño: *«noviembre debe estar perfecto, octubre no nos interesa»*. Un error que cambie un número de noviembre
de 2026 es grave; uno que solo toca meses anteriores se anota como menor.

---

## 0. Reglas del encargo (leer antes de empezar)

1. **Solo lectura.** No publiques nada, no hagas push a `main`, no corras workflows que escriban (panel.yml, publicar-gs.yml,
   publicar-pages.yml) y no escribas en la planilla real. Un arreglo se PROPONE (diff + prueba que lo demuestra); el dueño decide.
2. **El repo es PÚBLICO.** En el informe y en las pruebas no van claves, tokens, NIT, celulares, nombres de clientes ni
   montos de clientes reales. Las pruebas usan datos inventados (ver `tests/`).
3. **Las pruebas no pueden llegar a la planilla real.** Corré la batería con `tests/correr.sh`, que exporta
   `HTTPS_PROXY=http://127.0.0.1:9`. Una prueba suelta se corre con esas mismas variables (CLAUDE.md, §4lu).
4. **Auditá `origin/main`**, que es lo publicado:
   - página `PANEL_V = 2026-11-27-d`, `pedidos.html` de unas 86.100 líneas;
   - servidor `.gs` `SCRIPT_VERSION = 2026-11-26-pry-b`, de unas 14.200 líneas;
   - dashboard: `generar.py` + `panel_template.html`.

   La rama `claude/pedidos-fecha-entrega-bgt0em` puede ir atrasada.
5. **Antes de dar algo por error**, leé `CLAUDE.md` y `BITACORA_CLAUDE.md`. Muchas reglas que parecen raras las pidió el
   dueño a propósito: están marcadas con «decidido por el dueño», «no cambiar sin que lo pida» o «a propósito». Que una
   regla no te guste no es un hallazgo. Sí es hallazgo que el código no haga lo que esa regla dice.
6. Cada hallazgo, **verificado dos veces**: (a) leyendo el código y (b) con una prueba que falla hoy (Playwright contra el
   `pedidos.html` real, o el `.gs` real montado en Node como hacen `tests/test_servidor.js` y `tests/test_wa_*.js`). Lo que
   no se pueda reproducir va como «PLAUSIBLE», no como «CONFIRMADO».

---

## 1. Mapa del sistema

| Pieza | Archivo | Qué hace |
|---|---|---|
| Panel de pedidos | `pedidos.html` (+ `productos-mes.js`, `chat.js`, `escritorio.js`, `patio.js`, `fabrica-mas.js`) | Toda la página: formulario, Mis pedidos, Administración, Contabilidad, Proyección, Stock, ATC, Bot |
| Servidor | `google-apps-script.gs` | Apps Script sobre Google Sheets: guardar con candado y sello (`rev`), lectura comprimida o solo de lo cambiado, portero de cupos, bot de WhatsApp, Kommo, GPS, clave del equipo |
| Dashboard de ventas | `generar.py` → `panel_template.html` → `index.html` | Kommo + metas del panel (`metas_del_panel`) + ventas del panel sin ficha en Kommo |
| Pruebas | `tests/` (unos 580 archivos), `tests/correr.sh` | Playwright + Node + Python |

**Lógica duplicada entre la página y el `.gs`.** Es la fuente de errores más probable. Revisá que las dos copias digan
exactamente lo mismo:

| En la página | En el `.gs` | Prueba que las compara |
|---|---|---|
| bono Titanio: `alDiaBonoCumple` / `ccmBonoRegla` | `waAlDiaBonoCumple_` / `waCcmBonoRegla_` | `tests/test_bono_al_dia_gs.js` |
| comisión por escalones: `ccmEmVend` / `ccmTramoMonto` | `waCcmEmVend_` | `tests/test_comision_escalones.js` |
| emparejar efectivo con retiros: `efePareo` / `efeTapar` / `efeCerrado` | `waEfeCuentas_` / `waEfeTapar_` | `tests/test_efe_pareo.js`, `tests/test_efe_regla.js`, `tests/test_wa_efectivo.js` |
| «a esta altura»: `pryCorteAltura` / `pryEnAltura`, domingos desde `PRY_DOM_DESDE` | `waVbCorte_` / `waEnAltura_` | `tests/test_domingos_altura.js`, `tests/test_wa_13_25_26.js` |
| mes de la venta: `ventaMes` | `waVentaMes_` | `test_wa_13_25_26` §3b5 |
| `ventaTotal`, `saldoACobrar`, `docVentaFalta`, `docVentaEntregada`, `fueraDeConta`, `ctaAvCuenta` | `waCd*`, `waDocVentaEntregada_`, `waCtaAvCuenta_` | `tests/test_wa_buen_dia_cierre.js` |
| `semanaUrgentes` / `semanaLinea` / `PROD_*` | `waPh*` / `WA_PH_NO_ES_STOCK` | `tests/test_wa_pedir_hoy.js` |
| `entregaAConfirmar` | `entregaAConfirmar_` | `tests/test_avisa_cuando.js` |
| `cbzMayCliente` / `CBZ_PLAZOS` | `waMv*` / `WA_MV_PLAZOS` | `tests/test_wa_mayoristas.js` |
| `huellaFila` | `huellaFila_` (y `huella_fila` en `herramientas/diagnostico_lectura.py`) | `test_servidor` §16 |
| `FERIADOS` | `FERIADOS_GS` | `test_servidor` §15a |
| `MARCAS` / `VENDEDORES` | `WA_MARCAS` | `test_wa_bot` §1 |
| `ventaTotal` / `parseCobros` / `fueraDeConta` | `generar.py` → `ventas_panel_sin_ficha` | `test_generar_integridad` §17-26 |

Además de correr esas pruebas, buscá **casos que ellas no cubren**: centavos, domingos, feriados, fin de mes, cambio de
mes a la medianoche de Bolivia (UTC−4) y ventas cargadas un mes y entregadas el siguiente.

---

## 2. PRIORIDAD 1: Contabilidad (la plata)

Lo que tiene que cumplirse siempre (las secciones están en `CLAUDE.md`, «💰 Plata anotada que no se puede perder» y siguientes):

- **Ninguna suma de plata se pierde ni se cuenta dos veces.** Revisá `parseCobros`, `cobrosDe`, `cobrosReales`
  (el pago de mentira con `sinMonto`), `anticipoDe`, `mixtoDe` / `mixtoEn` / `mixtoMismoMetodo`, `aplicarCobros`,
  `aplicarEnvios`, `ctaIdxEnvio`, `ctaGuardarPago`, `ctaBorrarPago`, `ctaEnvioAPago` y `registradoSigue`.
  En cada venta: TOTAL = COBRADO + SALDO (`contaCobrado`, `contaFaltaCobrar`).
- **Comparar plata siempre contra 0.005, nunca contra 0.01** (§4mm). Buscá en todo el código comparaciones de
  plata con otro margen.
- **Plata escrita a mano:** `parseMonto`, `montoError`, `montoNegativo`, `montoFrena`. Probá textos pegados de WhatsApp
  como «Bs. 1.500.-», «1.500,50», «.50», «1e3» o «-1500».
- **El formulario no puede pisar pagos ya registrados:** `EDIT_PLATA0`, `_soloPrecio`, `_rehaceAdel`, `pagoRestoPrev`,
  `cobradoFueraDeAcuenta` y `cobradoNoMostrado`. Las dos últimas no se pueden mezclar (§4hd X-2).
- **Cuadre del mes:** `cuadrePagos`, `cuadrePorForma`, `cuadreCierre`, `cuadreAlertas`, `cuadreEfectivo`. La caja usa
  `fueraDeCaja` y las ventas usan `fueraDeConta` (una ATC contra costo es caja, no venta). Revisá también las dos hojas
  del Excel del Cuadre (§4pk).
- **Efectivo y retiros.**
  - Revisá `efePareo`, `EFE_CERRADO`, `efeGracia`, «Mayor y saldos» (`mysMovs`), «Efectivo por retirar»
    (`efeManoDatos`) y los tildes del retiro (`efe:id|día|monto`, guardados en `garantia`).
  - Revisá los arreglos del 27/11: `retCobroAvisos`, `retDocCruzado`, `retCruzados`, el freno cuando lo tildado supera el
    monto y que a los choferes no se les pida factura o remisión (`retDocDeRetiro`).
  - Una venta con NIT no se puede anotar como remisión (`ventaTieneNit`, `docRemisionNoVa`).
  - Verificá con datos inventados que **un cobro no quede tapado por dos retiros** y que un retiro no se lleve cobros de
    un mes cerrado.
- **Factura o remisión:** `docVentaDe`, `docVentaFalta`, `docVentaEntregada`, `ctaDocGuardar`, `DOCV_DESDE`. Revisá si
  un retiro FACTURADO o NO FACTURADO coincide con el tipo de documento de los cobros que tilda.
- **Cobranza de mayoristas:** `cbzDatos`, `cbzMayDatos`, `CBZ_PLAZOS`, vencimientos y «Pagó las tildadas»
  (`cbzPagoRegistrar`, que va de a una y revisa el saldo antes).
- **Avisos de Contabilidad y fotos leídas con IA:** `ctaAv*`, `AL_DIA_DESDE`, `iacComparar`, `ctaAvCorregiDecidir`.
  Ningún aviso puede cerrarse a ciegas.
- **ATC contra costo (STC):** `atcCobra`, `atcStcCambio`, `talonarioHuecos`.
- **Recargos por entrega:** `exportRecargos`, `enviosDe`.
- **Borrar una venta que tiene pagos:** `borrarPagosPuede`.

---

## 3. PRIORIDAD 2: Proyección

- **Lo VENDIDO, no lo cobrado.**
  - Revisá `pryVentas` (equipo, mayoristas y ROHO por separado; sin ATC ni RPT; sin filas del sistema), `ventaMes`
    (marca `vmes`) y `sucursalDeVendedor(v, ym+'-01')` (tienda por mes, `VENDEDOR_SUCURSAL_ANTES`).
  - Comprobá que la proyección dé el mismo total que Contabilidad → Ventas → «Entrega agendada» (`test_proyeccion` §3).
- **La curva y el ritmo.** Revisá `pryCurva`, `pryCurvaF`, `pryAlDia`, `pryMezcla` (pesa f², no f), `pryPrueba` (que
  use solo los meses ANTERIORES), `pryErrores`, `PRY_DIAS_RITMO` y `pryRep`. Desde el 23/11 cada vendedor proyecta como
  su parte de la marca: comprobá que la suma de los vendedores dé la proyección de la marca.
- **Días hábiles.** Revisá `pryDiaHabil`, `FERIADOS` y `FERIADOS_PASADOS` (24/09, 06/08, 07/08, 25/09) y los domingos
  desde el 01/12 (`PRY_DOM_DESDE`, `PRY_DOM_TIENDA`).
- **«A esta altura» (MoM):** `pryCorteAltura`, `pryEnAltura` y `pryMomDe`. Tiene que comparar los mismos días hábiles a
  la misma hora. Buscá si alguna comparación nueva usa todavía `pryCargadaAl(x, C.lim, C.min)` en lugar de `pryEnAltura`.
- **Unidades:** `pryUnidadesDe`, `pryTipoProd`, `PRY_NO_UNIDAD`, `PRY_SIN`, `PRY_PEDAZOS`. Un combo cuenta 1 colchón y
  1 somier; las almohadas no cuentan.
- **Vistas:** por tienda (`cxPryTiendas`), entregado y pendiente (`pryEntDatos`, `pryEntMini`), por línea
  (`pryLineasDatos`), «De dónde sale lo vendido» (`pryPlata`, que tiene que coincidir con el Cuadre) e historia de cada día
  (`__pry_hist__`, `pryHistJuntar`).
- **El dashboard:** `generar.py`. Revisá los límites del mes con `tzinfo=BOL_TZ`, `vendor_cfg` sin tildes,
  `ventas_panel_sin_ficha` (las «dos veces» van solo como aviso, no restan) y `metas_del_panel`.
  La corrida del 27/11 15:11 UTC leyó **10 vendedoras con meta**, 22 cierres y 13 por entregar sin ficha en Kommo.
  Verificá que esos números salgan de la regla escrita.

---

## 4. PRIORIDAD 3: Metas, comisiones y cierre comercial

- La fila `__metas__` guarda, por mes: las metas por marca, `m[ym].vd[v] = [mínima, presupuesto, [[Bs, %]…]]` y
  `m[ym].esc`. Revisá que `metasGuardar` conserve lo que no se tocó (otros meses, `esc`, vendedoras que no están en `MARCAS`).
- **Comisión:** `ccmCuenta(ym)` es la única cuenta. Revisá `ccmEmVend` (con escalones vale el tramo más alto alcanzado y
  no se usa la escala de la marca), `CCM_TRAMOS_DUENO` (noviembre, Jonathan en Mia Plaza), `ccmTramoSig` y
  `misComisionHtml` («Tu día»). Cualquier cuenta del porcentaje tiene que usar `r.em`.
- **Bono Titanio:**
  - cobra con la mínima y el panel al día en TODAS las fotos de los lunes (`__al_dia_sem__`, desde el 23/11/2026);
  - el ámbar se perdona;
  - un lunes sin foto no castiga.

  Probá el lunes 23/11 y el 30/11. ¿Qué pasa si nadie abrió el panel un lunes?
- **«Al día»:** `AL_DIA_DESDE='2026-11-01'`. Lo de antes de noviembre no cuenta para el bono, el rojo ni Bloki.
- **Cierre comercial:** `ccm*` y `__cierre_comercial__`. Una venta ya pagada no puede volver a contar en otro mes, lo
  cambiado después tiene que entrar como ajuste del mes siguiente y reabrir solo se permite con el último cierre.
- **Metas en otros lugares:** las metas del dashboard (`metaFuente:"panel"`), la meta por vendedora en «🎯 Metas por
  marca» (`metasVd*`, sobre `proyeccionMes(ym).marcas[].filas`) y la meta por tienda (`pryTMetaDatos`).

---

## 5. Entregas, cupos y logística

- **Cupos:** `cuposUsadosTurno` (página) y `porteroFecha_` (`.gs`) tienen que contar igual. Turnos AM 12 / PM 13; el
  sábado 15 y solo AM; domingo y feriados, cero. Revisá lo forzado (`forzar`) y el pedido NUEVO forzado (servidor 20-d).
- **Próximo día de entrega:** `proximoDiaEntrega`, `diaHabil`, `feriadoDe`, `saldoDiaConCupo`.
- **El cuadrito del saldo:**
  - revisá `saldoVeredicto` y `stockData`, el corte de las 16:30 (`HORA_CORTE`), las 48 h hábiles
    (`saldoSaleDeFabrica`) y Moreno al día siguiente;
  - el freno de lo que se fabrica (`fabFrenoGuardar`, `FAB_FRENO_TIPOS`; Eduardo y ROHO quedan libres) y la medida
    especial (`saldoMedidaEspecial`).
- **Cierre de entregas:**
  - revisá `cierreEntEntra`, `cierreEntAplicar`, lo que no salió y se reprograma (`reproAplicar`) y `entregadoSeMueve`
    (de mañana a tarde pierde el ✅);
  - el camión de cada entrega (`cierreEntCamPoner`) y quién marcó entregado (`eH`, `entHistAnotar`);
  - **nada se marca ✅ solo.**
- **ATC:** `atcViaje`, el recojo marcado a mano desde el 20/11 (`atcFueRecogida`, `ATC_RECOJO_A_MANO_DESDE`), la
  devolución (`atcSeguirViaje`) y el recojo solo lunes o martes.
- **RPT:** `rptAtrasadas`, `rpf` y `deTiendaNoViaja` (las bolsas sí viajan).
- **GPS:** `gpsLlegadaDe`, `gpsCamionPropDe` (propone, nunca asigna) y la puerta de los depósitos.
- **Stock de fábrica:**
  - `stockAsignar` (PTF → Banzer → IM) y `stockPedidoUnico` (orden de §4od: RPT, internos, mayoristas, Eduardo a
    Multicenter, puntuales);
  - `stockObjetivo` («rota +5», «cayendo +1») y el control del Excel del día (`stockConciliar`, `existNoEsDeHoy`);
  - la celda de 50.000 letras (`stockPodar`).
- **Bot de WhatsApp:**
  - qué NO se le manda al cliente (`waNoCliente_`);
  - que un número del equipo no sea tomado por cliente (`waEquipoCels_`);
  - el recordatorio, el cambio de día y «lo de la tarde sale a la mañana» (`adelantoAlSalir`).

---

## 6. Errores de guardado, sincronización y seguridad

- **Guardado durable:** `guardarDurable`, `LS_PEND`, `flushPending` (nunca `setPending(remaining)`), `colaEsperando`,
  `REESCRITAS` (días cerrados, tildes de carga, `__talonario__`, `__destinos__`, `__vistos__`) y `mandarReescritaDeCola`.
- **Conflictos y lecturas viejas:**
  - revisá `localManda` (contador `RED_N`, ventana `LECTURA_VIEJA_MS`, `BORRADO_CONFIRMA_MS`), `borradoFuera`,
    `mergePending`, `mismoContenido` y el `conflicto` con sello;
  - un caso concreto: una fila guardada recién ¿puede desaparecer de la pantalla con una lectura de la caché de 20 s
    del `doGet`?
- **Lectura solo de lo cambiado:** `listaDeBase`, `leerCambiado_`, la cuenta de control (`n` + `huella`) y
  `BORRADOS_RECIENTES`. ¿Hay algún camino que escriba la hoja SIN sello y sin anotarse? Si existe, la lectura de lo
  cambiado no lo vería.
- **Clave del equipo (ACTIVADA el 27/11):**
  - `PANEL_KEY` y `ADMIN_KEY`, `cfgLeer_` (ante un error, cierra), `claveAvisoAuto` y `pedirClaveEquipo`;
  - las herramientas que la mandan: `generar.py`, `diagnostico_lectura.py`, `verificar_cruce_ventas`, `cargar_pedidos.py`;
  - ¿queda alguna lectura o escritura que pase sin clave?
  - ¿qué ve una página vieja sin F5?
- **Rechazos:** `RECHAZOS_FIRMES` (`borrado`, `feriado`, `falta_cliente`, `dia_cerrado`). Comprobá que ninguno deje un
  ✓ verde falso. Cuando Google convierte un POST en GET (`respuesta_de_lectura`, `get_cerrado`) también hay que reintentar.
- **Datos de clientes:** nada de celulares ni nombres en registros públicos (Actions, `index.html`) ni en la hoja «Rechazos».
- **Fórmulas en la planilla:** el texto libre que empieza con `=`, `+`, `-` o `@` va con «'» (`celdaTexto_`).

---

## 7. Lo demás (pasada rápida)

Formulario (precio obligatorio, celular, «¿Quién recibió el efectivo?», «Leer la nota», cruce de ventas «¿Quién lo
atiende?»), Mis pedidos, Administración (fichas, «Para hacer», semana, riesgo de mañana), Stock y «Pedido a producción»,
Clientes (Excel), Bloki, chat, temas y escritorio. Acá solo interesan errores que cambien datos o números, o que dejen a
alguien sin poder trabajar. Lo visual va aparte y con poca prioridad.

---

## 8. Cómo correr las pruebas

```bash
cd MULTIESPUMAS
bash tests/correr.sh                 # batería entera; sale 1 si algo falla («== HAY PRUEBAS EN ROJO ==»)
HTTPS_PROXY=http://127.0.0.1:9 https_proxy=http://127.0.0.1:9 node tests/test_xxx.js   # una sola
node --check <script extraído>       # validar JS; el .gs se copia a .js antes de node --check
python -c "import ast;ast.parse(open('generar.py').read())"
```

Chromium y Playwright ya están instalados (`require('playwright')`). Las pruebas que dependen de la fecha clavan el reloj
(`page.clock.setFixedTime`). Una prueba nueva que mezcle una fecha fija con fechas relativas tiene que hacer lo mismo.

---

## 9. Qué tiene que entregar Jarvis

Un informe `INFORME_JARVIS_<fecha>.md` con:

1. **Resumen de una página**: cuántos hallazgos hay por gravedad y cuál arreglar primero.
2. **Tabla de hallazgos**, del más grave al menos grave. Cada uno con estos campos:
   - `ID` (C-01 contabilidad, P-01 proyección, M-01 metas, E-01 entregas, S-01 sincronización, O-01 otros);
   - **Gravedad**: ALTA = plata o número de noviembre mal, o algo que se pierde; MEDIA = puede pasar; BAJA = borde raro;
   - **CONFIRMADO / PLAUSIBLE**;
   - **Dónde**: `archivo:línea` sobre `origin/main`, con su sha;
   - **Qué pasa**, con un caso concreto: datos de entrada (inventados) → resultado mal → resultado esperado;
   - **Prueba**: nombre del archivo de prueba propuesto, que tiene que fallar hoy;
   - **Arreglo propuesto**: diff corto. Si la regla es del dueño, decir qué hay que preguntarle en vez de cambiarla.
3. **Diferencias entre la página y el `.gs`** encontradas en las copias de la sección 1.
4. **Lo que no se pudo revisar** y por qué. No cubrir algo sin decirlo se lee como que está cubierto.
5. **Preguntas para el dueño**: reglas ambiguas, en una línea cada una.

No arregles directamente en `main`. Las pruebas nuevas y los diffs van en una rama aparte o adjuntos al informe.
