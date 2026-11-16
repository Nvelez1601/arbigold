#!/usr/bin/env bash
# plan.sh — el estado determinístico de una corrida del orquestador minion.
#
# El plan vive FUERA del repo (jamás aparece en git status/diff):
#   ~/.config/arbigold/orquestador/<repo>-<hash>/   (resuelto solo desde el cwd)
#   ~/.config/arbigold/orquestador/multi/<nombre>/  (corridas multi-repo: --multi)
# Adentro: plan.tsv (fuente de verdad), plan.md (vista humana, se regenera sola),
# bitacora.jsonl (un evento por línea) y archivo/ (corridas terminadas).
#
# Subcomandos:
#   init [archivo.tsv] [--nuevo]   crea el plan (stdin o archivo; ver formato abajo)
#   fases                          agrupa en fases por dependencias + conflicto de archivos
#   archivos <id>                  imprime los archivos declarados de una tarea
#   done <id> | skip <id>          marca estado y regenera el md
#   ronda <id> [--error "salida"]  ronda++; misma huella de error 2 veces => STUCK (exit 2)
#   estado                         tabla de la corrida
#   reporte                        resumen final desde la bitácora y archiva el plan
#   handoff | retomar              sync entre máquinas vía gist secreto (gh)
#
# Formato de init (TSV, 6 columnas, sin encabezado):
#   id <TAB> tarea <TAB> dificultad <TAB> archivos,coma <TAB> deps,coma <TAB> llm
#   En multi-repo, los archivos llevan prefijo de repo: backend:apps/backend/src/x.ts
set -uo pipefail

CONF="$HOME/.config/arbigold/orquestador"

MULTI=""
if [ "${1:-}" = "--multi" ]; then MULTI="${2:?falta el nombre de la corrida multi}"; shift 2; fi
CMD="${1:-ayuda}"; [ $# -gt 0 ] && shift

if [ -n "$MULTI" ]; then
  DIR="$CONF/multi/$MULTI"
else
  TOP="$(git rev-parse --show-toplevel 2>/dev/null)" || {
    echo "✗ No estás dentro de un repo git. Párate en el repo, o usa --multi <nombre>." >&2; exit 1; }
  DIR="$CONF/$(basename "$TOP")-$(printf '%s' "$TOP" | shasum | cut -c1-4)"
fi
mkdir -p "$DIR"
PLAN="$DIR/plan.tsv"; BIT="$DIR/bitacora.jsonl"

bitacora() {
  PLAN_BIT="$BIT" python3 -c '
import datetime, json, os, sys
evento, identificador, detalle = sys.argv[1:]
registro = {
    "ts": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
    "evento": evento,
    "id": identificador,
    "detalle": detalle,
}
with open(os.environ["PLAN_BIT"], "a", encoding="utf-8") as archivo:
    archivo.write(json.dumps(registro, ensure_ascii=False) + "\n")
' "$1" "${2:-}" "${3:-}"
}

# Todo lo que lee/muta el TSV y regenera el md vive en python3 (mismo requisito
# que ya tiene el validador del repo). Va en una variable y python3 -c, NO en un
# heredoc a stdin: init recibe el TSV por stdin y no se lo puede comer el script.
PYCODE="$(cat <<'PY'
import hashlib, json, os, re, sys
from datetime import datetime

DIR = os.environ["PLAN_DIR"]
PLAN = os.path.join(DIR, "plan.tsv")
BIT = os.path.join(DIR, "bitacora.jsonl")
COLS = ["id", "tarea", "dif", "archivos", "deps", "llm", "fase", "estado", "ronda", "huella"]
EMOJI = {"pendiente": "⬜", "en_curso": "🔄", "done": "✅", "skip": "⏭", "stuck": "🔴"}

def cargar():
    if not os.path.exists(PLAN):
        sys.exit("✗ No hay plan activo aquí. Créalo con: plan.sh init")
    filas = []
    for ln in open(PLAN, encoding="utf-8"):
        if ln.strip():
            filas.append(dict(zip(COLS, ln.rstrip("\n").split("\t"))))
    return filas

def guardar(filas):
    with open(PLAN, "w", encoding="utf-8") as f:
        for t in filas:
            f.write("\t".join(t[c] for c in COLS) + "\n")
    regenerar_md(filas)

def regenerar_md(filas):
    done = sum(1 for t in filas if t["estado"] == "done")
    stuck = sum(1 for t in filas if t["estado"] == "stuck")
    lineas = [f"# Plan — {os.path.basename(DIR)}",
              f"_Actualizado: {datetime.now():%Y-%m-%d %H:%M} · {done}/{len(filas)} done"
              + (f" · {stuck} stuck" if stuck else "") + "_",
              "", "_Vista generada por plan.sh — NO editar a mano: la fuente de verdad es plan.tsv_",
              "", "| id | tarea | dif | fase | LLM | estado |", "|---|---|---|---|---|---|"]
    def celda(valor):
        return valor.replace("|", "\\|").replace("\n", " ")
    for t in filas:
        est = f'{EMOJI.get(t["estado"], "")} {t["estado"]}'
        if int(t["ronda"] or 0) > 0:
            est += f' (ronda {t["ronda"]})'
        lineas.append(f'| {celda(t["id"])} | {celda(t["tarea"])} | {t["dif"]} | {t["fase"]} | {celda(t["llm"])} | {est} |')
    if os.path.exists(BIT):
        lineas += ["", "## Bitácora"]
        for ln in open(BIT, encoding="utf-8"):
            e = json.loads(ln)
            det = f' — {e["detalle"]}' if e.get("detalle") else ""
            lineas.append(f'- {e["ts"]} · **{e["evento"]}** {e.get("id", "")}{det}')
    open(os.path.join(DIR, "plan.md"), "w", encoding="utf-8").write("\n".join(lineas) + "\n")

def buscar(filas, tid):
    for t in filas:
        if t["id"] == tid:
            return t
    sys.exit(f"✗ No existe la tarea '{tid}' en el plan. Ids: {', '.join(t['id'] for t in filas)}")

cmd, args = sys.argv[1], sys.argv[2:]

if cmd == "init":
    filas = []
    for ln in sys.stdin:
        if not ln.strip() or ln.startswith("#"):
            continue
        c = ln.rstrip("\n").split("\t")
        if len(c) != 6:
            sys.exit(f"✗ Cada línea necesita 6 columnas separadas por TAB (id, tarea, dif, archivos, deps, llm). Falla: {ln!r}")
        tarea = dict(zip(COLS, c + ["0", "pendiente", "0", "-"]))
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,39}", tarea["id"]):
            sys.exit(f"✗ Id inválido {tarea['id']!r}: usa 1-40 caracteres [a-z0-9-].")
        if not tarea["dif"].isdigit() or not 1 <= int(tarea["dif"]) <= 10:
            sys.exit(f"✗ Dificultad inválida en {tarea['id']}: debe ser un entero de 1 a 10.")
        if not tarea["tarea"].strip() or not tarea["archivos"].strip() or tarea["archivos"] == "-":
            sys.exit(f"✗ {tarea['id']} necesita tarea y archivos concretos.")
        filas.append(tarea)
    if not filas:
        sys.exit("✗ No llegó ninguna tarea por stdin.")
    ids = [t["id"] for t in filas]
    if len(ids) != len(set(ids)):
        sys.exit("✗ Hay ids repetidos.")
    conocidos = set(ids)
    for t in filas:
        deps = {d for d in t["deps"].split(",") if d and d != "-"}
        if t["id"] in deps:
            sys.exit(f"✗ {t['id']} depende de sí misma.")
        faltantes = deps - conocidos
        if faltantes:
            sys.exit(f"✗ {t['id']} depende de ids inexistentes: {', '.join(sorted(faltantes))}")
    guardar(filas)
    print(f"✔ Plan creado: {PLAN} ({len(filas)} tareas). Ahora: plan.sh fases")

elif cmd == "fases":
    filas = cargar()
    idx = {t["id"]: t for t in filas}
    for t in filas:  # fase base por dependencias (las done/skip no bloquean)
        t["_deps"] = [d for d in t["deps"].split(",") if d and d != "-"]
    sin_resolver, fase = list(filas), {}
    for _ in range(len(filas) + 1):
        for t in [x for x in sin_resolver if all(d in fase or idx.get(d, {}).get("estado") in ("done", "skip") for d in x["_deps"])]:
            fase[t["id"]] = 1 + max([fase.get(d, 0) for d in t["_deps"]] or [0])
            sin_resolver.remove(t)
    if sin_resolver:
        sys.exit(f"✗ Dependencias circulares o inexistentes en: {', '.join(t['id'] for t in sin_resolver)}")
    # Conflictos de archivos y dependencias se propagan hasta alcanzar un calendario estable.
    # Si B se mueve por compartir archivo con A, toda tarea que depende de B también se mueve.
    cambio = True
    while cambio:
        cambio = False
        for t in filas:
            requerida = 1 + max([fase[d] for d in t["_deps"]] or [0])
            if fase[t["id"]] < requerida:
                fase[t["id"]] = requerida
                cambio = True
        for i, a in enumerate(filas):
            for b in filas[i + 1:]:
                if fase[a["id"]] == fase[b["id"]]:
                    fa = set(x for x in a["archivos"].split(",") if x)
                    fb = set(x for x in b["archivos"].split(",") if x)
                    choque = fa & fb
                    if choque:
                        fase[b["id"]] += 1
                        cambio = True
                        print(f'⚠ {a["id"]} y {b["id"]} comparten {", ".join(sorted(choque))} → {b["id"]} pasa a la fase {fase[b["id"]]}')
    for t in filas:
        t["fase"] = str(fase[t["id"]])
    guardar(filas)
    for n in sorted(set(fase.values())):
        grupo = [i for i, f in fase.items() if f == n]
        print(f"Fase {n}: {', '.join(grupo)}" + ("  (paralelas)" if len(grupo) > 1 else ""))

elif cmd == "archivos":
    t = buscar(cargar(), args[0])
    print("\n".join(x for x in t["archivos"].split(",") if x))

elif cmd in ("done", "skip"):
    filas = cargar()
    t = buscar(filas, args[0])
    if cmd == "done":
        idx = {x["id"]: x for x in filas}
        bloquean = [d for d in t["deps"].split(",") if d and d != "-" and idx[d]["estado"] not in ("done", "skip")]
        if bloquean:
            sys.exit(f"✗ No puedes cerrar {t['id']}: todavía bloquean {', '.join(bloquean)}")
    t["estado"] = cmd
    guardar(filas)
    pend = [x["id"] for x in filas if x["estado"] not in ("done", "skip")]
    print(f'✔ {t["id"]} → {cmd}. Pendientes: {", ".join(pend) or "ninguna — corre plan.sh reporte"}')

elif cmd == "ronda":
    filas = cargar()
    t = buscar(filas, args[0])
    if int(t["ronda"] or 0) >= 2:
        t["estado"] = "stuck"
        guardar(filas)
        print(f'✗ STUCK: {t["id"]} ya alcanzó el máximo de 2 rondas.')
        sys.exit(2)
    error = args[1] if len(args) > 1 else ""
    huella = hashlib.sha256(error.encode()).hexdigest()[:12] if error else "-"
    t["ronda"] = str(int(t["ronda"] or 0) + 1)
    if error and huella == t["huella"]:
        t["estado"] = "stuck"
        guardar(filas)
        print(f'✗ STUCK: {t["id"]} repite la MISMA huella de error ({huella}) en la ronda {t["ronda"]}.')
        print("  No gastes otra ronda igual: escala de modelo o al humano.")
        sys.exit(2)
    t["huella"] = huella
    guardar(filas)
    print(f'Ronda {t["ronda"]}/2 de {t["id"]}' + (f" (huella {huella})" if error else ""))
    if int(t["ronda"]) >= 2:
        print("⚠ Tope de rondas alcanzado: si esta corrección no aprueba, escala.")

elif cmd == "estado":
    filas = cargar()
    ancho = max(len(t["tarea"]) for t in filas)
    print(f"════ {os.path.basename(DIR)} · {sum(1 for t in filas if t['estado']=='done')}/{len(filas)} done ════")
    for t in filas:
        extra = f' ronda {t["ronda"]}' if int(t["ronda"] or 0) > 0 else ""
        print(f'  {t["id"]:>4}  {t["tarea"]:<{ancho}}  dif {t["dif"]:>2}  fase {t["fase"]}  {t["llm"]:<8} {EMOJI.get(t["estado"], "")} {t["estado"]}{extra}')

elif cmd == "reporte":
    filas = cargar()
    print("id\ttarea\tdificultad\tLLM\trondas\testado")
    for t in filas:
        print(f'{t["id"]}\t{t["tarea"]}\t{t["dif"]}\t{t["llm"]}\t{t["ronda"]}\t{t["estado"]}')
    abiertas = [t["id"] for t in filas if t["estado"] not in ("done", "skip")]
    print(f'\n{sum(1 for t in filas if t["estado"] == "done")}/{len(filas)} done · sin cerrar: {", ".join(abiertas) or "ninguna"}')
    if not abiertas:
        import shutil
        dest = os.path.join(DIR, "archivo")
        os.makedirs(dest, exist_ok=True)
        stamp = datetime.now().strftime("%Y%m%d-%H%M")
        for f in ("plan.tsv", "plan.md", "bitacora.jsonl"):
            src = os.path.join(DIR, f)
            if os.path.exists(src):
                shutil.move(src, os.path.join(dest, f"{stamp}-{f}"))
        print(f"✔ Corrida archivada en {dest}/")
    else:
        print("(el plan sigue activo: quedan tareas sin cerrar)")
PY
)"
py() { PLAN_DIR="$DIR" python3 -c "$PYCODE" "$@"; }

case "$CMD" in
  init)
    NUEVO=0; SRC=""
    for a in "$@"; do [ "$a" = "--nuevo" ] && NUEVO=1 || SRC="$a"; done
    if [ -f "$PLAN" ] && grep -qvE '	(done|skip)	[0-9]+	[^	]*$' "$PLAN" 2>/dev/null && [ "$NUEVO" -eq 0 ]; then
      echo "✗ Ya hay un plan activo con tareas sin cerrar (mira: plan.sh estado)." >&2
      echo "  Para arrancar otro archivando este: plan.sh init --nuevo ${SRC:-<archivo>}" >&2
      exit 1
    fi
    if [ "$NUEVO" -eq 1 ] && [ -f "$PLAN" ]; then
      mkdir -p "$DIR/archivo"; STAMP="$(date +%Y%m%d-%H%M)"
      for f in plan.tsv plan.md bitacora.jsonl; do
        [ -f "$DIR/$f" ] && mv "$DIR/$f" "$DIR/archivo/$STAMP-$f"
      done
      echo "→ Plan anterior archivado."
    fi
    : > "$BIT"; bitacora "init"
    if [ -n "$SRC" ]; then py init < "$SRC"; else py init; fi
    ;;
  fases)     py fases && bitacora "fases" ;;
  archivos)  py archivos "${1:?falta el id}" ;;
  done|skip) py "$CMD" "${1:?falta el id}" && bitacora "$CMD" "$1" ;;
  ronda)
    ID="${1:?falta el id}"; shift || true
    ERROR=""; [ "${1:-}" = "--error" ] && ERROR="${2:-}"
    RC=0; py ronda "$ID" "$ERROR" || RC=$?
    [ "$RC" -eq 2 ] && bitacora "stuck" "$ID" "misma huella de error dos veces" || bitacora "ronda" "$ID"
    exit "$RC"
    ;;
  estado)    py estado ;;
  reporte)   bitacora "reporte" && py reporte ;;
  handoff)
    command -v gh >/dev/null || { echo "✗ Hace falta gh (GitHub CLI) para el handoff." >&2; exit 1; }
    [ -f "$PLAN" ] || { echo "✗ No hay plan activo que subir." >&2; exit 1; }
    DESC="arbigold-plan $(basename "$DIR")"
    GID="$(cat "$DIR/gist-id" 2>/dev/null || true)"
    [ -z "$GID" ] && GID="$(gh gist list --limit 100 2>/dev/null | grep -F "$DESC" | awk '{print $1}' | head -1 || true)"
    if [ -z "$GID" ]; then
      URL="$(gh gist create --desc "$DESC" "$PLAN" "$DIR/plan.md" "$BIT" 2>/tmp/gist-err-$$.txt | tail -1)"
      GID="${URL##*/}"
      if [ -z "$GID" ]; then
        echo "✗ No se pudo crear el gist. Error de gh:" >&2
        sed 's/^/    /' /tmp/gist-err-$$.txt >&2; rm -f /tmp/gist-err-$$.txt
        echo "  (Un 5xx es intermitencia de GitHub: reintenta en un rato; el plan local queda intacto.)" >&2
        exit 1
      fi
      rm -f /tmp/gist-err-$$.txt
      printf '%s' "$GID" > "$DIR/gist-id"
      echo "✔ Gist secreto creado: $DESC"
    else
      # OJO: `gh gist edit <id> <archivo>` abre un editor interactivo (no sube el
      # contenido local): el update va por la API con PATCH.
      if jq -n --rawfile a "$PLAN" --rawfile b "$DIR/plan.md" --rawfile c "$BIT" \
           '{files: {"plan.tsv": {content: $a}, "plan.md": {content: $b}, "bitacora.jsonl": {content: $c}}}' \
         | gh api "gists/$GID" -X PATCH --input - >/dev/null; then
        printf '%s' "$GID" > "$DIR/gist-id"
        echo "✔ Gist secreto actualizado: $DESC"
      else
        echo "✗ No se pudo actualizar el gist (¿intermitencia de GitHub?). El plan local queda intacto; reintenta." >&2
        exit 1
      fi
    fi
    echo "  Retómalo en otra máquina (parado en el mismo repo) con: plan.sh retomar"
    ;;
  retomar)
    command -v gh >/dev/null || { echo "✗ Hace falta gh (GitHub CLI)." >&2; exit 1; }
    DESC="arbigold-plan $(basename "$DIR")"
    GID="$(cat "$DIR/gist-id" 2>/dev/null || true)"
    [ -z "$GID" ] && GID="$(gh gist list --limit 100 2>/dev/null | grep -F "$DESC" | awk '{print $1}' | head -1 || true)"
    [ -n "$GID" ] || { echo "✗ No encontré un gist \"$DESC\" en tu cuenta. ¿Hiciste handoff en la otra máquina?" >&2; exit 1; }
    REMOTO="$(gh api "gists/$GID" --jq .updated_at 2>/dev/null || true)"
    if [ -f "$PLAN" ] && [ -n "$REMOTO" ]; then
      LOCAL_TS="$(date -u -r "$PLAN" '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || echo '')"
      if [ -n "$LOCAL_TS" ] && [ "$LOCAL_TS" ">" "$REMOTO" ]; then
        printf "⚠ El plan LOCAL es más nuevo (%s) que el del gist (%s). ¿Sobrescribir con el del gist? [s/N] " "$LOCAL_TS" "$REMOTO"
        read -r RESP; [ "$RESP" = "s" ] || { echo "Abortado: el local queda como está."; exit 0; }
      fi
    fi
    for f in plan.tsv plan.md bitacora.jsonl; do
      gh gist view "$GID" -f "$f" > "$DIR/$f" 2>/dev/null || true
    done
    printf '%s' "$GID" > "$DIR/gist-id"
    echo "✔ Plan bajado del gist (actualizado: ${REMOTO:-?})."
    bash "$0" ${MULTI:+--multi "$MULTI"} estado
    ;;
  *)
    sed -n '2,22p' "$0" | sed 's/^# \{0,1\}//'
    ;;
esac
