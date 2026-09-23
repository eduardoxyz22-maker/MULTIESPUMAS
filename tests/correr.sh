#!/bin/bash
# Corre toda la batería. SIEMPRE desde la raíz del repo: los tests abren ./pedidos.html
#   ./tests/correr.sh            → todos, en paralelo
#   ./tests/correr.sh plata      → solo los que digan "plata"
cd "$(dirname "$0")/.." || exit 1
# ⚠️ El panel vive en hora de Bolivia (los tests abren la página con timezoneId
# America/La_Paz), pero Node acá corre en UTC. Entre las 00:00 y las 04:00 UTC (20:00 a
# 24:00 en Bolivia) «hoy» es un día distinto para el test que para la página, y las
# suites que arman fechas con `new Date()` en Node (roho, existencias) fallan sin que
# nada esté roto (§4de). Se fija la zona para que los dos relojes digan lo mismo.
export TZ="${TZ:-America/La_Paz}"
# ⚠️ El 22/09 `test_conta_alta` creció, pasó de 220 s con la máquina cargada y `timeout` lo
# mató ANTES del resumen y ANTES de su primer ✗: salía «ok (sin resumen)» —o sea, verde— con
# 3 comprobaciones en rojo adentro. Por eso ahora se mira el CÓDIGO DE SALIDA: 124 es
# `timeout`, y cualquier exit≠0 sin resumen se dice en voz alta. El tope subió a 400 s.
uno(){
  f="$1"; n=$(basename "$f" .js)
  out=$(timeout 400 node "$f" 2>&1); rc=$?
  bad=$(echo "$out" | grep -c '^✗')
  line=$(echo "$out" | grep -oE '[0-9]+ bien · [0-9]+ mal' | tail -1)
  if [ "$rc" -eq 124 ]; then echo "$n :: CORTADO POR TIEMPO (400 s)${line:+ · llegó a $line}"
  elif [ -n "$line" ]; then echo "$n :: $line"
  elif [ "$bad" -gt 0 ]; then echo "$n :: SIN RESUMEN · $bad fallas"
  elif [ -z "$out" ]; then echo "$n :: VACIO"
  elif [ "$rc" -ne 0 ]; then echo "$n :: SIN RESUMEN (exit $rc) · $(echo "$out" | tail -1)"
  else echo "$n :: ok (sin resumen)"; fi
}
export -f uno
# ⚠️ Los .cjs (otra mano tocando el mismo panel, §4db2) hablan otro idioma: "OK "/"FALLO "
# por línea y un assert() de Node que corta con exit≠0 si algo falló — no el resumen
# "N bien · N mal" que arma `uno`. Y usan require('playwright') a secas + CHROME_PATH por
# variable de entorno, no la ruta absoluta adentro del archivo: necesitan que este sandbox
# se las dé. Antes de este arreglo corrían "FALLA" siempre, y ni entraban en la batería
# (esta línea buscaba solo *.js): 4 suites con 62 comprobaciones quedaban afuera sin que
# nadie lo notara.
unoCjs(){
  f="$1"; n=$(basename "$f" .cjs)
  out=$(NODE_PATH="${NODE_PATH:-/opt/node22/lib/node_modules}" CHROME_PATH="${CHROME_PATH:-/opt/pw-browsers/chromium-1194/chrome-linux/chrome}" timeout 400 node "$f" 2>&1)
  rc=$?
  if [ "$rc" -eq 124 ]; then echo "$n :: CORTADO POR TIEMPO (400 s)"; return; fi
  ok=$(echo "$out" | grep -c '^OK ')
  fallo=$(echo "$out" | grep -c '^FALLO ')
  # ⚠️ No todos los .cjs hablan "OK "/"FALLO ": algunos usan ✓/✗ y cierran con la misma
  # línea "N bien · N mal" que los .js. Sin esta línea salían como "ok (sin resumen)" y
  # el resumen de la batería escondía cuántas comprobaciones habían corrido de verdad —
  # y con qué resultado, si el proceso igual terminaba en 0.
  line=$(echo "$out" | grep -oE '[0-9]+ bien · [0-9]+ mal' | tail -1)
  if [ "$rc" -ne 0 ] && [ "$((ok+fallo))" -eq 0 ] && [ -z "$line" ]; then
    echo "$n :: FALLA (exit $rc) · $(echo "$out" | tail -1)"
  elif [ "$rc" -ne 0 ]; then
    echo "$n :: ${line:-"$ok bien · $fallo mal"} · (exit $rc)"
  elif [ "$((ok+fallo))" -gt 0 ]; then
    echo "$n :: $ok bien · $fallo mal"
  elif [ -n "$line" ]; then
    echo "$n :: $line"
  else
    echo "$n :: ok (sin resumen)"
  fi
}
export -f unoCjs
# ⚠️ Y los .py (§4fx): `test_traer.py`, `test_kommo.py` y `test_duplicados.py` cuidan lo que
# corre en GitHub Actions —el repaso de Kommo, que es PÚBLICO y no puede filtrar datos de
# clientes— y esta batería no los corría: había que acordarse de largarlos a mano.
unoPy(){
  f="$1"; n=$(basename "$f" .py)
  out=$(timeout 400 python3 "$f" 2>&1); rc=$?
  line=$(echo "$out" | grep -oE '[0-9]+ bien · [0-9]+ mal' | tail -1)
  if [ "$rc" -eq 124 ]; then echo "$n :: CORTADO POR TIEMPO (400 s)"
  elif [ -n "$line" ]; then echo "$n :: $line"
  elif [ "$rc" -ne 0 ]; then echo "$n :: SIN RESUMEN (exit $rc) · $(echo "$out" | tail -1)"
  else echo "$n :: ok (sin resumen)"; fi
}
export -f unoPy
ls tests/test_*"$1"*.js 2>/dev/null | xargs -r -P 4 -I{} bash -c 'uno "$@"' _ {}
ls tests/test_*"$1"*.cjs 2>/dev/null | xargs -r -P 4 -I{} bash -c 'unoCjs "$@"' _ {}
ls tests/test_*"$1"*.py 2>/dev/null | xargs -r -P 4 -I{} bash -c 'unoPy "$@"' _ {}
