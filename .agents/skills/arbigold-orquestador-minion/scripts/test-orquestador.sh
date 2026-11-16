#!/usr/bin/env bash
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMP_PRUEBA="$(mktemp -d)"
trap 'rm -rf "$TEMP_PRUEBA"' EXIT
export HOME="$TEMP_PRUEBA/home"
unset XDG_CACHE_HOME
unset ARBIGOLD_MINION_BASE
# Decoy: TMPDIR no debe recibir worktrees aunque Cursor/agentes lo inyecten.
export TMPDIR="$TEMP_PRUEBA/tmpdir-decoy"
mkdir -p "$HOME" "$TMPDIR"
CACHE_MINIONS="$HOME/.cache/arbigold/minions"

REPO="$TEMP_PRUEBA/repo-prueba"
mkdir -p "$REPO"
git -C "$REPO" init -q
git -C "$REPO" config user.name prueba
git -C "$REPO" config user.email prueba@arbigold.test
printf 'inicial\n' > "$REPO/archivo con espacio.txt"
printf 'otro\n' > "$REPO/otro.txt"
git -C "$REPO" add .
git -C "$REPO" commit -qm inicial

cd "$REPO"
if printf 'id/invalido\tTarea\t4\tarchivo con espacio.txt\t-\theredado\n' | bash "$RAIZ/scripts/plan.sh" init >/dev/null 2>&1; then
  echo "ERROR: plan.sh aceptó un id inseguro" >&2
  exit 1
fi

cat > "$TEMP_PRUEBA/tareas.tsv" <<'TSV'
a	Primera tarea	4	archivo con espacio.txt	-	heredado
b	Segunda tarea	5	archivo con espacio.txt	-	heredado
c	Dependiente	6	otro.txt	b	heredado
TSV
bash "$RAIZ/scripts/plan.sh" init "$TEMP_PRUEBA/tareas.tsv" >/dev/null
fases="$(bash "$RAIZ/scripts/plan.sh" fases)"
grep -q 'Fase 1: a' <<<"$fases"
grep -q 'Fase 2: b' <<<"$fases"
grep -q 'Fase 3: c' <<<"$fases"

if bash "$RAIZ/scripts/plan.sh" "done" c >/dev/null 2>&1; then
  echo "ERROR: se cerró una tarea con dependencias pendientes" >&2
  exit 1
fi
bash "$RAIZ/scripts/plan.sh" "done" a >/dev/null

bash "$RAIZ/scripts/minion-worktree.sh" crear b "$REPO" >/dev/null
WT="$CACHE_MINIONS/$(basename "$REPO")-b"
if [ -e "$TMPDIR/minions" ] || [ -n "$(find "$TMPDIR" -name "$(basename "$REPO")-b" -print -quit 2>/dev/null)" ]; then
  echo "ERROR: se creó un worktree bajo TMPDIR (decoy $TMPDIR)" >&2
  exit 1
fi
if [ ! -d "$WT" ]; then
  echo "ERROR: el worktree no está en la cache estable ($WT)" >&2
  exit 1
fi
printf 'cambio\n' >> "$WT/archivo con espacio.txt"
bash "$RAIZ/scripts/verificar-entrega.sh" "$WT" b >/dev/null
bash "$RAIZ/scripts/gate-tests.sh" --dir "$WT" --comando test -f 'archivo con espacio.txt' >/dev/null

BIT="$(find "$HOME/.config/arbigold/orquestador" -name bitacora.jsonl -not -path '*/archivo/*' -print -quit)"
python3 - "$BIT" <<'PY'
import json
import sys
for linea in open(sys.argv[1], encoding="utf-8"):
    json.loads(linea)
PY

bash "$RAIZ/scripts/minion-worktree.sh" limpiar b >/dev/null
# ArbiGold (una sola rama): limpiar borra la rama minion/<id>; --conservar-ramas la deja.
if git -C "$REPO" show-ref --verify --quiet refs/heads/minion/b; then
  echo "ERROR: limpiar no borró la rama minion/b" >&2
  exit 1
fi

# Regresión: el repo padre es a su vez un worktree cuyo node_modules es un symlink
# al checkout principal. Con find -type d a secas el minion quedaba sin dependencias.
mkdir -p "$REPO/node_modules/paquete"
printf 'module.exports = 1;\n' > "$REPO/node_modules/paquete/index.js"
printf '{"name":"prueba"}\n' > "$REPO/package.json"
git -C "$REPO" add package.json
git -C "$REPO" commit -qm paquete
BASE_WT="$TEMP_PRUEBA/base-worktree"
git -C "$REPO" worktree add "$BASE_WT" -b base/prueba -q
ln -s "$REPO/node_modules" "$BASE_WT/node_modules"

bash "$RAIZ/scripts/minion-worktree.sh" crear d "$BASE_WT" >/dev/null
WT_D="$CACHE_MINIONS/$(basename "$BASE_WT")-d"
if [ ! -f "$WT_D/node_modules/paquete/index.js" ]; then
  echo "ERROR: el minion quedó sin node_modules resoluble (padre con node_modules symlinkeado)" >&2
  exit 1
fi
(cd "$BASE_WT" && bash "$RAIZ/scripts/minion-worktree.sh" limpiar d >/dev/null)

# El caso normal (node_modules como directorio real) sigue enlazando.
bash "$RAIZ/scripts/minion-worktree.sh" crear e "$REPO" >/dev/null
WT_E="$CACHE_MINIONS/$(basename "$REPO")-e"
if [ ! -f "$WT_E/node_modules/paquete/index.js" ]; then
  echo "ERROR: el minion quedó sin node_modules (padre con directorio real)" >&2
  exit 1
fi
bash "$RAIZ/scripts/minion-worktree.sh" limpiar e --conservar-ramas >/dev/null
git -C "$REPO" show-ref --verify --quiet refs/heads/minion/e || { echo "ERROR: --conservar-ramas borró minion/e" >&2; exit 1; }

# Override: ARBIGOLD_MINION_BASE (con barra final) manda sobre la cache por defecto.
OVERRIDE="$TEMP_PRUEBA/override-minions"
export ARBIGOLD_MINION_BASE="$OVERRIDE/"
bash "$RAIZ/scripts/minion-worktree.sh" crear f "$REPO" >/dev/null
WT_F="$OVERRIDE/$(basename "$REPO")-f"
if [ ! -d "$WT_F" ]; then
  echo "ERROR: el override ARBIGOLD_MINION_BASE no se usó ($WT_F)" >&2
  exit 1
fi
if [ -e "$CACHE_MINIONS/$(basename "$REPO")-f" ]; then
  echo "ERROR: con override se creó también en la cache por defecto" >&2
  exit 1
fi
bash "$RAIZ/scripts/minion-worktree.sh" limpiar f >/dev/null
if [ -e "$WT_F" ]; then
  echo "ERROR: limpiar no usó ARBIGOLD_MINION_BASE ($WT_F sigue existiendo)" >&2
  exit 1
fi
unset ARBIGOLD_MINION_BASE

echo "✔ Orquestador ArbiGold: validación, fases, dependencias, rutas con espacios, node_modules symlinkeado, limpieza de ramas y gate explícito en verde."
