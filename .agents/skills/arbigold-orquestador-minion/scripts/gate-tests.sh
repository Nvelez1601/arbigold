#!/usr/bin/env bash
# gate-tests.sh — gate de calidad de una entrega de minion en ArbiGold.
# Corre EXACTAMENTE lo que después exigirán los hooks de git, pero solo sobre los
# archivos de la entrega, para que una entrega aprobada nunca rebote en el commit:
#   1. Prettier --check            (formato)
#   2. ESLint --max-warnings=0     (clean code + fronteras hexagonales)
#   3. spec-presence-gate --files  (principio de specs)
#   4. vitest related              (tests relacionados, por workspace; backend: unit + int)
#
#   gate-tests.sh [--dir ruta] <archivo> [archivo...]
#   gate-tests.sh [--dir ruta] --comando <programa> [argumentos...]
#
# --dir: dónde correr (default: el cwd). Conviene el WORKTREE del minion: ya tiene
# node_modules symlinkeado y así el gate corre ANTES de aplicar el diff al principal.
#
# Salidas: 0 verde · 1 rojo · 3 no se pudo correr (falta Node/deps): corre a mano.
set -uo pipefail

DONDE="$PWD"
if [ "${1:-}" = "--dir" ]; then DONDE="${2:?falta la ruta}"; shift 2; fi
[ "${1:-}" = "--comando" ] && { shift; MODO_COMANDO=1; } || MODO_COMANDO=0
[ $# -gt 0 ] || { echo "Uso: gate-tests.sh [--dir ruta] <archivo> [archivo...]" >&2; exit 3; }

cd "$DONDE" || exit 3
TOP="$(git rev-parse --show-toplevel 2>/dev/null || echo "$DONDE")"

if [ "$MODO_COMANDO" -eq 1 ]; then
  echo "Gate explícito: $*"
  RC=0
  "$@" || RC=$?
  if [ "$RC" -eq 0 ]; then echo "✔ Gate explícito en VERDE"; exit 0; fi
  echo "✗ Gate explícito en ROJO (exit $RC)" >&2
  exit 1
fi

# Node correcto: .nvmrc manda ("24" → la v24.x más nueva instalada en nvm).
if [ -f "$TOP/.nvmrc" ]; then
  PIDE="$(tr -d ' v\n' < "$TOP/.nvmrc")"
  VER="$(ls "$HOME/.nvm/versions/node" 2>/dev/null | sed 's/^v//' | grep -E "^${PIDE}(\.|$)" | sort -V | tail -1)"
  if [ -n "$VER" ]; then
    export PATH="$HOME/.nvm/versions/node/v$VER/bin:$PATH"
    echo "Node $(node -v) (.nvmrc pide $PIDE)"
  else
    echo "⚠ .nvmrc pide $PIDE y no está en nvm: se usa $(node -v 2>/dev/null || echo '?'). Un fallo raro puede ser por la versión."
  fi
fi
[ -d "$TOP/node_modules" ] || { echo "✗ Sin node_modules en $TOP: npm install primero." >&2; exit 3; }

# Solo archivos que existen (una entrega puede borrar archivos).
ARCHIVOS=()
for f in "$@"; do [ -e "$TOP/$f" ] && ARCHIVOS+=("$f"); done
[ ${#ARCHIVOS[@]} -gt 0 ] || { echo "✔ La entrega solo borra archivos: nada que testear."; exit 0; }

FALLOS=0
paso() { # paso "<nombre>" <comando...>
  local nombre="$1"; shift
  echo "── $nombre"
  if (cd "$TOP" && "$@") 2>&1 | tail -25; [ "${PIPESTATUS[0]}" -eq 0 ]; then
    echo "   ✔ $nombre"
  else
    echo "   ✗ $nombre"; FALLOS=$((FALLOS + 1))
  fi
}

CODIGO=(); for f in "${ARCHIVOS[@]}"; do [[ "$f" =~ \.(ts|mts|mjs|js|vue)$ ]] && CODIGO+=("$f"); done

paso "Prettier" npx --no-install prettier --check --ignore-unknown "${ARCHIVOS[@]}"
[ ${#CODIGO[@]} -gt 0 ] && paso "ESLint" npx --no-install eslint --max-warnings=0 --no-warn-ignored "${CODIGO[@]}"
paso "Principio de specs" node scripts/spec-presence-gate.mjs --files "${ARCHIVOS[@]}"

# vitest related por workspace (las rutas se pasan relativas al workspace).
declare -A POR_WS=()
for f in "${CODIGO[@]}"; do
  case "$f" in
    apps/backend/*)          POR_WS[apps/backend]+=" ${f#apps/backend/}" ;;
    apps/frontend/*)         POR_WS[apps/frontend]+=" ${f#apps/frontend/}" ;;
    packages/shared-types/*) POR_WS[packages/shared-types]+=" ${f#packages/shared-types/}" ;;
    scripts/*)               POR_WS[.]+=" $f" ;;
  esac
done
for ws in "${!POR_WS[@]}"; do
  # shellcheck disable=SC2086
  paso "Vitest related ($ws)" bash -c "cd '$ws' && npx --no-install vitest related --run --passWithNoTests ${POR_WS[$ws]}"
  if [ "$ws" = "apps/backend" ]; then
    # shellcheck disable=SC2086
    paso "Vitest related integración ($ws)" bash -c "cd '$ws' && npx --no-install vitest related --run --passWithNoTests --config vitest.int.config.ts ${POR_WS[$ws]}"
  fi
done

if [ "$FALLOS" -eq 0 ]; then
  echo "✔ Gate de la entrega en VERDE (${#ARCHIVOS[@]} archivo(s))"
  exit 0
fi
echo "✗ Gate en ROJO: $FALLOS paso(s) fallaron — es un finding más: bájalo al minion con la salida de arriba."
echo "  (Si el fallo huele a entorno —Supabase local apagado, .env— confírmalo antes de culpar al cambio.)"
exit 1
