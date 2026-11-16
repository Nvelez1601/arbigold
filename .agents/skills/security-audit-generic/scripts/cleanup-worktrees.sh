#!/usr/bin/env bash
# cleanup-worktrees.sh — Elimina los worktrees de ANÁLISIS (detached) y las ramas
# de fix `security/fix/*` ya mergeadas. Es la fase final del flujo de auditoría.
# Uso: bash scripts/cleanup-worktrees.sh <repo> <analysis_dir> [--keep-consolidated]
#   <repo>               ruta del repositorio (ej. /home/user/proyectos/mi-repo)
#   <analysis_dir>       carpeta de análisis (ej. /home/user/proyectos/analysis)
#   --keep-consolidated  conserva SECURITY_AUDIT_CONSOLIDATED.md y los REPORT.md

set -euo pipefail

REPO="${1:?Uso: cleanup-worktrees.sh <repo> <analysis_dir> [--keep-consolidated]}"
ANALYSIS="${2:?Falta analysis_dir}"
KEEP=false
[ "${3:-}" = "--keep-consolidated" ] && KEEP=true

cd "$REPO"

echo "🔍 Worktrees registrados actualmente:"
git worktree list

echo ""
echo "🧹 Limpiando worktrees dentro de $ANALYSIS..."
for WT in "$ANALYSIS"/*/; do
  [ -d "$WT" ] || continue
  WT="${WT%/}"
  if git worktree list --porcelain | grep -q "^worktree $WT$"; then
    git worktree remove --force "$WT" >/dev/null 2>&1 && echo "  ✓ Worktree borrado: $(basename "$WT")"
  else
    echo "  ⏭  No es un worktree git, se conserva: $(basename "$WT")"
  fi
done

echo ""
echo "🧹 Borrando ramas de fix 'security/fix/*' ya mergeadas en la rama actual..."
git branch | grep -E '^\s*security/fix/' | while read -r b; do
  b=$(echo "$b" | xargs)
  if git merge-base --is-ancestor "$b" HEAD 2>/dev/null; then
    git branch -d "$b" >/dev/null 2>&1 && echo "  ✓ Rama borrada: $b"
  else
    echo "  ⏭  Rama con commits sin mergear, se conserva: $b"
  fi
done

echo ""
echo "✅ Limpieza completada."
