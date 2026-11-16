#!/usr/bin/env bash
# minion-worktree.sh — ciclo de vida de los worktrees de los minions.
#
#   crear <id> [ruta-repo]     worktree con rama minion/<id> desde HEAD,
#                              node_modules (todos los del workspace) y
#                              apps/backend/.env symlinkeados
#   limpiar <id>|--todos       remove --force + prune + borra la rama minion/<id>
#                              (con --conservar-ramas se queda)
#   listar                     worktrees de minions vivos de este repo
#
# Ruta por defecto: ${XDG_CACHE_HOME:-$HOME/.cache}/arbigold/minions
# Override: ARBIGOLD_MINION_BASE (si está seteada y no vacía).
# No se usa TMPDIR ni /tmp: el temp del sistema cambia entre sesiones y macOS puede vaciarlo.
#
# En macOS los worktrees se crean de a uno (este script es secuencial por diseño).
# ArbiGold trabaja en una sola rama (main): la entrega del minion se APLICA al working
# tree principal con verificar-entrega.sh --aplicar, así que la rama minion/<id> ya no
# aporta nada y se borra al limpiar. Excepción: --conservar-ramas.
set -uo pipefail

CMD="${1:-ayuda}"; shift || true
RUTA_REPO="${2:-$PWD}"; [[ "$RUTA_REPO" == --* ]] && RUTA_REPO="$PWD"   # "--conservar-ramas" no es una ruta
TOP="$(git -C "$RUTA_REPO" rev-parse --show-toplevel 2>/dev/null || git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "✗ No estás dentro de un repo git." >&2; exit 1; }
# CACHE y BASE sin barra final: si queda el slash, el grep de limpiar/listar no
# coincide con las rutas (sin doble slash) que reporta git worktree list.
if [ -n "${ARBIGOLD_MINION_BASE:-}" ]; then
  BASE="${ARBIGOLD_MINION_BASE%/}"
else
  CACHE="${XDG_CACHE_HOME:-$HOME/.cache}"
  CACHE="${CACHE%/}"
  BASE="${CACHE}/arbigold/minions"
fi
NOMBRE="$(basename "$TOP")"

case "$CMD" in
  crear)
    ID="${1:?Uso: minion-worktree.sh crear <id> [ruta-repo]}"
    [[ "$ID" =~ ^[a-z0-9][a-z0-9-]{0,39}$ ]] || {
      echo "✗ Id inválido '$ID': usa 1-40 caracteres [a-z0-9-]." >&2; exit 1; }
    RUTA="$BASE/${NOMBRE}-${ID}"
    [ -e "$RUTA" ] && { echo "✗ Ya existe $RUTA (¿quedó de otra corrida? limpiar primero)." >&2; exit 1; }
    mkdir -p "$BASE"
    git -C "$TOP" --no-optional-locks worktree add "$RUTA" -b "minion/$ID" HEAD --quiet || exit 1

    # Dependencias por symlink, no reinstalar: todos los node_modules del workspace
    # (raíz y anidados hasta 3 niveles, sin entrar a los propios node_modules).
    # -type l además de -type d: si $TOP es a su vez un worktree, su node_modules
    # suele ser un symlink al checkout principal y con -type d solo no se veía.
    ENLACES=0
    DEPS=0
    while IFS= read -r nm; do
      REL="${nm#"$TOP"/}"
      [ -e "$RUTA/$REL" ] && continue
      [ -e "$nm" ] || continue
      mkdir -p "$RUTA/$(dirname "$REL")"
      ln -s "$nm" "$RUTA/$REL" && { ENLACES=$((ENLACES + 1)); DEPS=$((DEPS + 1)); }
    done < <(find "$TOP" -maxdepth 3 -name node_modules \( -type d -o -type l \) -not -path "*/node_modules/*" 2>/dev/null)

    # Config local gitignoreada que el backend necesita para arrancar (nunca se copia: symlink).
    if [ -f "$TOP/apps/backend/.env" ] && [ ! -e "$RUTA/apps/backend/.env" ]; then
      mkdir -p "$RUTA/apps/backend"
      ln -s "$TOP/apps/backend/.env" "$RUTA/apps/backend/.env" && ENLACES=$((ENLACES + 1))
    fi

    echo "✔ Worktree: $RUTA (rama minion/$ID, $ENLACES symlink(s), $DEPS node_modules)"
    if [ -f "$TOP/package.json" ] && [ "$DEPS" -eq 0 ]; then
      echo "⚠ Sin node_modules enlazados: el minion no podrá correr tests. Instala las dependencias en $RUTA."
    fi
    echo "  OJO: si la tarea modifica package.json, borra el symlink de node_modules y corre npm ci ahí."
    ;;

  limpiar)
    ARG="${1:?Uso: minion-worktree.sh limpiar <id>|--todos [--conservar-ramas]}"
    CONSERVAR=0; [ "${2:-}" = "--conservar-ramas" ] && CONSERVAR=1
    if [ "$ARG" != "--todos" ] && [[ ! "$ARG" =~ ^[a-z0-9][a-z0-9-]{0,39}$ ]]; then
      echo "✗ Id inválido '$ARG': no se limpia ninguna ruta." >&2
      exit 1
    fi
    limpiar_uno() {
      local id="$1" ruta="$BASE/${NOMBRE}-$1"
      git -C "$TOP" worktree remove --force "$ruta" 2>/dev/null && echo "✔ removido $ruta" \
        || rm -rf "$ruta"
      git -C "$TOP" worktree prune   # sin esto, git cree que la rama sigue en uso y no la borra
      if git -C "$TOP" show-ref --verify --quiet "refs/heads/minion/$id"; then
        if [ "$CONSERVAR" -eq 1 ]; then
          echo "✔ rama minion/$id conservada (--conservar-ramas)"
        else
          git -C "$TOP" branch -D "minion/$id" --quiet && echo "✔ rama minion/$id borrada (la entrega ya vive en main)"
        fi
      fi
    }
    if [ "$ARG" = "--todos" ]; then
      ENCONTRO=0
      while IFS= read -r ruta; do
        ENCONTRO=1
        limpiar_uno "${ruta##*"${NOMBRE}"-}"
      done < <(git -C "$TOP" worktree list --porcelain | sed -n 's/^worktree //p' | grep -F "$BASE/${NOMBRE}-" || true)
      [ "$ENCONTRO" -eq 0 ] && echo "No hay worktrees de minions que limpiar."
    else
      limpiar_uno "$ARG"
    fi
    git -C "$TOP" worktree prune
    RESTAN="$(git -C "$TOP" worktree list | grep -cF "$BASE/${NOMBRE}-" || true)"
    [ "${RESTAN:-0}" -eq 0 ] && echo "✔ Sin worktrees de minions vivos." || echo "⚠ Quedan $RESTAN worktree(s) de minions: minion-worktree.sh listar"
    ;;

  listar)
    git -C "$TOP" worktree list | grep -F "$BASE/${NOMBRE}-" || echo "No hay worktrees de minions vivos."
    ;;

  *) sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//' ;;
esac
