#!/usr/bin/env bash
# create-fix-branch.sh — Crea una rama de fix `security/fix/<name>` DESDE master/main
# (nunca edita master directo) y un worktree con branch para aplicar el fix.
# Uso: bash scripts/create-fix-branch.sh <repo> <analysis_dir> <base_branch> <fix_name>
#   <repo>         ruta del repositorio (ej. /home/user/proyectos/mi-repo)
#   <analysis_dir> carpeta de análisis (ej. /home/user/proyectos/analysis)
#   <base_branch>  rama base de la que sale el fix (master o main SIEMPRE)
#   <fix_name>     nombre de la rama de fix (ej. V3-upload-magic-bytes)

set -euo pipefail

REPO="${1:?Uso: create-fix-branch.sh <repo> <analysis_dir> <base_branch> <fix_name>}"
ANALYSIS="${2:?Falta analysis_dir}"
BASE="${3:?Falta base_branch (master/main)}"
FIX_NAME="${4:?Falta fix_name}"

[ "$BASE" = "master" ] || [ "$BASE" = "main" ] || { echo "⚠️  La rama base debería ser master o main (actual: $BASE)."; }

FIX_BRANCH="security/fix/$FIX_NAME"
WT="$ANALYSIS/fixes/$FIX_NAME"

cd "$REPO"
git rev-parse --verify "$BASE" >/dev/null 2>&1 || { echo "❌ Rama base no existe: $BASE"; exit 1; }

if git rev-parse --verify "$FIX_BRANCH" >/dev/null 2>&1; then
  echo "⏭  La rama ya existe: $FIX_BRANCH"
else
  echo "🌿 Creando rama $FIX_BRANCH desde $BASE..."
  git branch "$FIX_BRANCH" "$BASE"
fi

if [ ! -d "$WT" ]; then
  echo "🔧 Creando worktree con branch $FIX_BRANCH..."
  git worktree add "$WT" "$FIX_BRANCH" >/dev/null
fi

echo ""
echo "✅ Rama de fix lista: $FIX_BRANCH (base: $BASE)"
echo "   Worktree para aplicar el fix: $WT"
echo "   Aplica el fix ahí, verifica (sintaxis/tests/boot) y commitea ANTES de mergear."
