#!/usr/bin/env bash
# merge-fix-branch.sh — Mergea una rama de fix `security/fix/<name>` a master/main
# con `--no-ff` (commit explícito por vulnerabilidad), borra la rama y su worktree.
# Uso: bash scripts/merge-fix-branch.sh <repo> <analysis_dir> <base_branch> <fix_name>
#   <repo>         ruta del repositorio (ej. /home/user/proyectos/mi-repo)
#   <analysis_dir> carpeta de análisis (ej. /home/user/proyectos/analysis)
#   <base_branch>  rama base destino del merge (master o main SIEMPRE)
#   <fix_name>     nombre de la rama de fix a mergear (ej. V3-upload-magic-bytes)

set -euo pipefail

REPO="${1:?Uso: merge-fix-branch.sh <repo> <analysis_dir> <base_branch> <fix_name>}"
ANALYSIS="${2:?Falta analysis_dir}"
BASE="${3:?Falta base_branch (master/main)}"
FIX_NAME="${4:?Falta fix_name}"

FIX_BRANCH="security/fix/$FIX_NAME"
WT="$ANALYSIS/fixes/$FIX_NAME"

cd "$REPO"

echo "🚦 Mergeando $FIX_BRANCH -> $BASE (--no-ff)..."
git checkout "$BASE" >/dev/null 2>&1 || { echo "❌ No se pudo hacer checkout a $BASE"; exit 1; }

if git rev-parse --verify "$FIX_BRANCH" >/dev/null 2>&1; then
  git merge --no-ff "$FIX_BRANCH" -m "security(fix): merge $FIX_BRANCH a $BASE"
else
  echo "⚠️  La rama $FIX_BRANCH no existe. Nada que mergear."
  exit 1
fi

# Limpieza: primero el worktree (la rama está checkout ahí), luego la rama
if [ -d "$WT" ]; then
  git worktree remove --force "$WT" >/dev/null 2>&1 && echo "🧹 Worktree $WT borrado." || echo "⚠️  No se pudo borrar el worktree."
fi

git branch -d "$FIX_BRANCH" >/dev/null 2>&1 && echo "🧹 Rama $FIX_BRANCH borrada." || echo "⚠️  No se pudo borrar la rama (¿tiene commits sin mergear?)."

echo ""
echo "✅ $FIX_BRANCH mergeada a $BASE con --no-ff."
