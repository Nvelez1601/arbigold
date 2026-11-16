#!/usr/bin/env bash
# setup-worktrees.sh — Crea el directorio analysis/ y un worktree DETACHED por
# vulnerabilidad para la fase de ANÁLISIS (solo lectura). NO crea ramas ni toca master.
# Uso: bash scripts/setup-worktrees.sh <repo> <analysis_dir> <base_branch> <vuln_name...>
#   <repo>         ruta del repositorio (ej. /home/user/proyectos/mi-repo)
#   <analysis_dir> carpeta de análisis (ej. /home/user/proyectos/analysis)
#   <base_branch>  rama base para el análisis (master, main, develop)
#   <vuln_name...> uno o más nombres de worktree (ej. V1-nombre V2-nombre)

set -euo pipefail

REPO="${1:?Uso: setup-worktrees.sh <repo> <analysis_dir> <base_branch> <vuln_name...>}"
ANALYSIS="${2:?Falta analysis_dir}"
BASE="${3:?Falta base_branch}"
shift 3

if [ ! -d "$REPO/.git" ] && [ ! -f "$REPO/HEAD" ]; then
  echo "❌ No es un repo git: $REPO"
  exit 1
fi

mkdir -p "$ANALYSIS"

cd "$REPO"
git rev-parse --verify "$BASE" >/dev/null 2>&1 || { echo "❌ Rama base no existe: $BASE"; exit 1; }
HASH=$(git rev-parse "$BASE")

for NAME in "$@"; do
  WT="$ANALYSIS/$NAME"
  if [ -d "$WT" ]; then
    echo "⏭  Worktree ya existe (se omite): $NAME"
    continue
  fi
  echo "🔧 Creando worktree detached $NAME ($HASH)..."
  git worktree add --detach "$WT" "$HASH" >/dev/null
done

echo ""
echo "✅ Worktrees de análisis listos en: $ANALYSIS"
echo "   (detached, solo lectura. Úsalos para análisis con subagentes y luego limpia con cleanup-worktrees.sh)"
