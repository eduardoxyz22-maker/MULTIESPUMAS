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
uno(){
  f="$1"; n=$(basename "$f" .js)
  out=$(timeout 220 node "$f" 2>&1)
  bad=$(echo "$out" | grep -c '^✗')
  line=$(echo "$out" | grep -oE '[0-9]+ bien · [0-9]+ mal' | tail -1)
  if [ -n "$line" ]; then echo "$n :: $line"
  elif [ "$bad" -gt 0 ]; then echo "$n :: SIN RESUMEN · $bad fallas"
  elif [ -z "$out" ]; then echo "$n :: VACIO"
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
  out=$(NODE_PATH="${NODE_PATH:-/opt/node22/lib/node_modules}" CHROME_PATH="${CHROME_PATH:-/opt/pw-browsers/chromium-1194/chrome-linux/chrome}" timeout 220 node "$f" 2>&1)
  rc=$?
  ok=$(echo "$out" | grep -c '^OK ')
  fallo=$(echo "$out" | grep -c '^FALLO ')
  if [ "$rc" -ne 0 ] && [ "$((ok+fallo))" -eq 0 ]; then
    echo "$n :: FALLA (exit $rc) · $(echo "$out" | tail -1)"
  elif [ "$rc" -ne 0 ]; then
    echo "$n :: $ok bien · $fallo mal · (exit $rc)"
  elif [ "$((ok+fallo))" -gt 0 ]; then
    echo "$n :: $ok bien · $fallo mal"
  else
    echo "$n :: ok (sin resumen)"
  fi
}
export -f unoCjs
ls tests/test_*"$1"*.js | xargs -P 4 -I{} bash -c 'uno "$@"' _ {}
ls tests/test_*"$1"*.cjs 2>/dev/null | xargs -r -P 4 -I{} bash -c 'unoCjs "$@"' _ {}
