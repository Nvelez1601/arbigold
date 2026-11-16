#!/usr/bin/env bash
# review.sh — alcance y estado persistente de las revisiones de ArbiGold.
# Sin PRs, la "base de datos" de reviews vive EN EL REPO: memory/reviews/estado.json
# (último SHA revisado + hallazgos descartados por el humano) y un informe por pasada.
#
#   alcance [--pendiente | --working | --desde <ref> | --rango <A..B>]
#       Imprime el rango, los commits y los archivos agrupados por área (con ⚠ en las
#       áreas críticas). Default: --pendiente (desde el último SHA revisado hasta HEAD).
#   registrar <informe.md> [--hasta <sha>]
#       Guarda el informe en memory/reviews/<fecha>-<sha7>.md y avanza el último SHA revisado.
#   descartar <huella> <motivo>
#       Registra un hallazgo cerrado por el humano: no se vuelve a reportar.
#   estado
#       Último SHA revisado, commits pendientes de revisión y descartados.
#
# La huella de un hallazgo es "<archivo>#<título corto>" (estable entre pasadas).
set -uo pipefail

TOP="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "✗ No estás dentro de un repo git." >&2; exit 1; }
DIR="$TOP/memory/reviews"
ESTADO="$DIR/estado.json"
VACIO="4b825dc642cb6eb9a060e54bf8d69288fbee4904"   # árbol vacío de git
CMD="${1:-ayuda}"; [ $# -gt 0 ] && shift

json() { # json <expr python sobre e (dict del estado)> — lee/escribe estado.json
  ESTADO="$ESTADO" python3 -c '
import json, os, sys
ruta = os.environ["ESTADO"]
e = json.load(open(ruta, encoding="utf-8")) if os.path.exists(ruta) else {"ultimo_sha": None, "pasadas": [], "descartados": {}}
accion, args = sys.argv[1], sys.argv[2:]
if accion == "ultimo":
    print(e.get("ultimo_sha") or "")
elif accion == "avanzar":
    sha, informe, fecha = args
    e["ultimo_sha"] = sha
    e["pasadas"].append({"sha": sha, "informe": informe, "fecha": fecha})
elif accion == "descartar":
    huella, motivo, fecha = args
    e["descartados"][huella] = {"motivo": motivo, "fecha": fecha}
elif accion == "mostrar":
    print(json.dumps(e, ensure_ascii=False, indent=2))
if accion in ("avanzar", "descartar"):
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    json.dump(e, open(ruta, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    open(ruta, "a", encoding="utf-8").write("\n")
' "$@"
}

# Área de un archivo → "nombre|critica(0/1)". Críticas: revisión reforzada + refutador obligatorio.
area_de() {
  case "$1" in
    supabase/migrations/*)                                   echo "db-rls|1" ;;
    apps/backend/src/*/treasury/*|apps/backend/src/*/*/treasury/*)   echo "treasury|1" ;;
    apps/backend/src/*/arbitrage/*|apps/backend/src/*/*/arbitrage/*) echo "arbitrage|1" ;;
    apps/backend/src/*/compliance/*|apps/backend/src/*/*/compliance/*) echo "compliance|1" ;;
    apps/backend/src/*/identity/*|apps/backend/src/*/*/identity/*)   echo "identity|1" ;;
    apps/backend/src/*/audit/*|apps/backend/src/*/*/audit/*)         echo "audit|1" ;;
    apps/backend/src/domain/shared/*)                        echo "domain-shared|1" ;;
    apps/backend/*)                                          echo "backend|0" ;;
    apps/frontend/*)                                         echo "frontend|0" ;;
    packages/shared-types/*)                                 echo "contratos|0" ;;
    .agents/*|.claude/*|.opencode/*|skills-lock.json)        echo "skills|0" ;;
    instructions/*|memory/*|docs/*|*.md)                     echo "docs|0" ;;
    *)                                                       echo "tooling|0" ;;
  esac
}

case "$CMD" in
  alcance)
    MODO="${1:---pendiente}"
    case "$MODO" in
      --pendiente)
        DESDE="$(json ultimo)"; [ -n "$DESDE" ] || DESDE="$VACIO"
        HASTA="$(git rev-parse HEAD)"; RANGO_DIFF=("$DESDE" "$HASTA") ;;
      --desde)
        DESDE="$(git rev-parse --verify "${2:?falta la ref}")" || exit 1
        HASTA="$(git rev-parse HEAD)"; RANGO_DIFF=("$DESDE" "$HASTA") ;;
      --rango)
        R="${2:?falta el rango A..B}"; DESDE="$(git rev-parse --verify "${R%%..*}")" || exit 1
        HASTA="$(git rev-parse --verify "${R##*..}")" || exit 1; RANGO_DIFF=("$DESDE" "$HASTA") ;;
      --working)
        DESDE="$(git rev-parse HEAD)"; HASTA="WORKING"; RANGO_DIFF=("HEAD") ;;
      *) echo "✗ Modo desconocido: $MODO" >&2; exit 1 ;;
    esac

    # Un fallo de git NUNCA se lee como "no hay nada que revisar".
    ARCHIVOS="$(git diff --name-only "${RANGO_DIFF[@]}")" || { echo "✗ git diff falló: la corrida se aborta." >&2; exit 1; }
    [ "$MODO" = "--working" ] && ARCHIVOS="$(printf '%s\n%s' "$ARCHIVOS" "$(git ls-files --others --exclude-standard)" | sed '/^$/d' | sort -u)"
    [ -n "$ARCHIVOS" ] || { echo "✔ Nada que revisar en el alcance ($MODO)."; exit 0; }

    echo "════ Alcance de review ($MODO) ════"
    if [ "$HASTA" = "WORKING" ]; then
      echo "Desde HEAD ${DESDE:0:8} → working tree (sin commitear)"
    else
      if [ "$DESDE" = "$VACIO" ]; then
        echo "Desde el inicio del repo → ${HASTA:0:8}"; COMMITS=("$HASTA")
      else
        echo "Rango ${DESDE:0:8}..${HASTA:0:8}"; COMMITS=("$DESDE..$HASTA")
      fi
      echo; echo "Commits ($(git rev-list --count --no-merges "${COMMITS[@]}")):"
      git log --oneline --no-merges "${COMMITS[@]}" | sed 's/^/  /'
    fi
    echo
    declare -A GRUPOS=(); declare -A CRITICA=()
    while IFS= read -r f; do
      IFS='|' read -r area crit <<< "$(area_de "$f")"
      GRUPOS[$area]+="    $f"$'\n'; CRITICA[$area]="$crit"
    done <<< "$ARCHIVOS"
    for area in $(printf '%s\n' "${!GRUPOS[@]}" | sort); do
      MARCA="  "; [ "${CRITICA[$area]}" = "1" ] && MARCA="⚠ "
      echo "${MARCA}${area} ($(printf '%s' "${GRUPOS[$area]}" | grep -c .) archivo(s))"
      printf '%s' "${GRUPOS[$area]}"
    done
    echo
    echo "Diff stat:"; git diff --shortstat "${RANGO_DIFF[@]}" | sed 's/^/  /'
    echo "HASTA=$HASTA"   # última línea: el SHA a pasar a 'registrar --hasta'
    ;;

  registrar)
    INFORME="${1:?Uso: review.sh registrar <informe.md> [--hasta <sha>]}"
    [ -f "$INFORME" ] || { echo "✗ No existe el informe: $INFORME" >&2; exit 1; }
    HASTA="$(git rev-parse HEAD)"; [ "${2:-}" = "--hasta" ] && HASTA="$(git rev-parse --verify "${3:?falta el sha}")"
    mkdir -p "$DIR"
    DEST="$DIR/$(date +%Y-%m-%d)-${HASTA:0:7}.md"
    cp "$INFORME" "$DEST"
    json avanzar "$HASTA" "${DEST#"$TOP"/}" "$(date +%Y-%m-%dT%H:%M)"
    echo "✔ Informe guardado en ${DEST#"$TOP"/} · último SHA revisado: ${HASTA:0:8}"
    echo "  Commitéalo con: docs(reviews): review hasta ${HASTA:0:7}"
    ;;

  descartar)
    HUELLA="${1:?Uso: review.sh descartar <huella> <motivo>}"; MOTIVO="${2:?falta el motivo}"
    json descartar "$HUELLA" "$MOTIVO" "$(date +%Y-%m-%d)"
    echo "✔ Descartado: $HUELLA (no se vuelve a reportar)"
    ;;

  estado)
    ULTIMO="$(json ultimo)"
    if [ -z "$ULTIMO" ]; then
      echo "Sin reviews registradas: la primera pasada cubre todo el repo."
    else
      echo "Último SHA revisado: ${ULTIMO:0:8} · commits pendientes: $(git rev-list --count --no-merges "$ULTIMO..HEAD")"
    fi
    json mostrar
    ;;

  *) sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//' ;;
esac
