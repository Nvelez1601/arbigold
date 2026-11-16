#!/usr/bin/env bash
# verificar-entrega.sh — la aduana entre la entrega del minion y el working tree.
#
#   verificar-entrega.sh <ruta-worktree> <id> [--reporte archivo] [--aplicar] [--multi nombre]
#
# Verifica en orden y falla ruidoso en el primer problema:
#   1. SCOPE: los archivos tocados == los declarados en el plan para esa tarea
#      (violado => rebote automático, sin gastar revisión humana)
#   2. Sin marcadores de conflicto en lo tocado
#   3. El REPORTE MINION trae las secciones obligatorias (si se pasa --reporte)
#   4. git apply --check del diff contra el repo principal
# Con --aplicar, aplica el diff y deja la lista de archivos en stdout (última línea,
# separados por espacio) para encadenar con gate-tests.sh.
set -uo pipefail

WT="${1:?Uso: verificar-entrega.sh <ruta-worktree> <id> [--reporte archivo] [--aplicar]}"
ID="${2:?falta el id de la tarea}"
shift 2
REPORTE=""; APLICAR=0; MULTI=()
while [ $# -gt 0 ]; do
  case "$1" in
    --reporte) REPORTE="${2:-}"; shift 2 ;;
    --aplicar) APLICAR=1; shift ;;
    --multi)   MULTI=(--multi "${2:-}"); shift 2 ;;
    *) echo "✗ Opción desconocida: $1" >&2; exit 1 ;;
  esac
done

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[ -d "$WT/.git" ] || [ -f "$WT/.git" ] || { echo "✗ $WT no parece un worktree de git." >&2; exit 1; }
TOP="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "✗ Corre esto parado en el repo principal." >&2; exit 1; }
REPO="$(basename "$TOP")"

# ── 1. SCOPE ───────────────────────────────────────────────────────────────
# Declarados en el plan (en multi-repo vienen con prefijo "repo:"): se filtran
# los de ESTE repo y se les quita el prefijo.
DECLARADOS="$(bash "$AQUI/plan.sh" ${MULTI[@]+"${MULTI[@]}"} archivos "$ID" \
  | sed -n "s/^${REPO}://p; /:/!p" | sort -u)"
[ -n "$DECLARADOS" ] || { echo "✗ La tarea $ID no declara archivos en el plan: no hay contra qué verificar el scope." >&2; exit 1; }

# El worktree es descartable: se indexa para incluir archivos nuevos y obtener los
# nombres desde git con delimitador NUL. Se rechazan saltos de línea, que el plan TSV
# no puede representar sin ambigüedad; espacios y renames sí quedan soportados.
git -C "$WT" add -A
TOCADOS="$(python3 - "$WT" <<'PY'
import subprocess
import sys

datos = subprocess.check_output(
    ["git", "-C", sys.argv[1], "diff", "--cached", "--name-only", "-z"]
)
rutas = sorted(set(x.decode("utf-8", "surrogateescape") for x in datos.split(b"\0") if x))
if any("\n" in ruta for ruta in rutas):
    raise SystemExit("✗ Un archivo contiene un salto de línea y no cabe en el formato del plan.")
print("\n".join(rutas))
PY
)" || exit 1
[ -n "$TOCADOS" ] || { echo "✗ El worktree no tiene ningún cambio: no hay entrega que verificar." >&2; exit 1; }

FUERA=""
while IFS= read -r f; do
  printf '%s\n' "$DECLARADOS" | grep -qx -- "$f" || FUERA="${FUERA}${f}\n"
done <<< "$TOCADOS"
if [ -n "$FUERA" ]; then
  echo "✗ SCOPE VIOLADO en $ID — archivos tocados que NO están declarados en el plan:"
  printf '%b' "$FUERA" | sed 's/^/    /'
  echo "  → Rebote automático: bájale el finding al minion (o re-declara el scope si el orquestador lo aprueba)."
  exit 1
fi
echo "✔ Scope: $(printf '%s\n' "$TOCADOS" | grep -c .) archivo(s) tocado(s), todos declarados"

# ── 2. Marcadores de conflicto ─────────────────────────────────────────────
CONFLICTOS=0
while IFS= read -r f; do
  if [ -f "$WT/$f" ] && grep -nE '^<<<<<<< |^={7}$|^>>>>>>> ' "$WT/$f" >/dev/null 2>&1; then
    echo "✗ Marcadores de conflicto en $f"; CONFLICTOS=1
  fi
done <<< "$TOCADOS"
[ "$CONFLICTOS" -eq 0 ] && echo "✔ Sin marcadores de conflicto" || exit 1

# ── 3. Lint del REPORTE MINION ─────────────────────────────────────────────
if [ -n "$REPORTE" ]; then
  [ -f "$REPORTE" ] || { echo "✗ No existe el archivo del reporte: $REPORTE" >&2; exit 1; }
  FALTAN=""
  for seccion in "REPORTE MINION" "Estado:" "Archivos tocados:" "Verificaci" "Resumen:"; do
    grep -qi -- "$seccion" "$REPORTE" || FALTAN="${FALTAN} '${seccion}'"
  done
  if [ -n "$FALTAN" ]; then
    echo "✗ REPORTE incompleto — faltan secciones:${FALTAN}"
    echo "  → Rebote: pídele al minion el reporte con el formato de la plantilla."
    exit 1
  fi
  echo "✔ REPORTE completo"
fi

# ── 4. El diff aplica limpio ───────────────────────────────────────────────
DIFF="$(git -C "$WT" diff --cached)"
[ -n "$DIFF" ] || { echo "✗ Diff vacío tras add -A: nada que aplicar." >&2; exit 1; }
if ! printf '%s\n' "$DIFF" | git -C "$TOP" apply --check - 2>/tmp/apply-err-$$.txt; then
  echo "✗ El diff NO aplica limpio sobre el repo principal:"
  sed 's/^/    /' /tmp/apply-err-$$.txt; rm -f /tmp/apply-err-$$.txt
  echo "  → ¿Otra tarea tocó lo mismo? Revisa el orden de fases."
  exit 1
fi
rm -f /tmp/apply-err-$$.txt
echo "✔ git apply --check limpio"

if [ "$APLICAR" -eq 1 ]; then
  printf '%s\n' "$DIFF" | git -C "$TOP" apply -
  echo "✔ Diff de $ID aplicado al working tree principal"
  echo "→ Ahora el gate de tests sobre estos archivos:"
  printf '%s\n' "$TOCADOS" | tr '\n' ' '; echo
else
  echo "→ Verificación OK. Corre el gate de tests EN EL WORKTREE y después vuelve con --aplicar."
fi
