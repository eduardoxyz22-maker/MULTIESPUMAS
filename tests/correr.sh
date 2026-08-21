#!/bin/bash
# Corre toda la batería. SIEMPRE desde la raíz del repo: los tests abren ./pedidos.html
#   ./tests/correr.sh            → todos, en paralelo
#   ./tests/correr.sh plata      → solo los que digan "plata"
cd "$(dirname "$0")/.." || exit 1
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
ls tests/test_*"$1"*.js | xargs -P 4 -n 1 -I{} bash -c 'uno "$@"' _ {}
