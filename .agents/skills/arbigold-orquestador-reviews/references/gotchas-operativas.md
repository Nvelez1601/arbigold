# Gotchas operativas

Heredadas del orquestador de reviews de Ridery (corridas reales de 2026-08), filtradas a
lo que aplica a un repo de una sola rama sin PRs. Ante un error de rango de git, de
anclaje o de shell, busca aquí primero.

## Shell y sistema

| Gotcha | Fix |
|---|---|
| zsh interpreta `$SHA:src/...` como modificador de historia (`:s`) y mutila la ruta | Siempre `"${SHA}:ruta"`, con llaves y comillas |
| En sistemas case-insensitive (macOS, algunos montajes de Windows desde WSL), `M1.md` y `m1.md` son el MISMO archivo | Usa archivos temporales con prefijos distintos (`may1`/`men1`), nunca solo cambiando mayúscula/minúscula |
| `head -N` bajo `pipefail` puede matar el pipeline con SIGPIPE (exit 141) cuando la salida es grande | Trunca con `sed -n '1,Np'` o con expansión de bash (`${VAR:0:N}`); `tail` sí es seguro |
| El modelo devuelve `\n` literales y el informe queda en un solo renglón | Normaliza solo si el texto no trae ningún salto real |

## Rangos de git

- **Archivos del cambio:** `git diff DESDE HASTA` (dos SHAs explícitos, sin puntos). En
  una rama lineal es lo mismo que la pestaña "Files changed".
- **Commits:** `git log DESDE..HASTA` (dos puntos). `A...B` (tres puntos) en commits es
  una diferencia SIMÉTRICA y cuela commits del otro lado.
- **Primera review:** no hay `DESDE`; `review.sh` usa el árbol vacío de git
  (`4b825dc…`) para el diff y `git log HASTA` para los commits.
- **Modo `--working`:** `git diff HEAD` no incluye archivos nuevos sin trackear;
  `review.sh` los suma con `git ls-files --others --exclude-standard`.
- Un fallo de `git diff` NUNCA se lee como "no hay nada que revisar". Si git falla, la
  corrida falla ruidosa. Un diff vacío legítimo no es lo mismo que un error silenciado.

## Estado persistente

- `memory/reviews/estado.json` es la fuente de verdad: `ultimo_sha`, `pasadas[]` y
  `descartados{huella: {motivo, fecha}}`. Se versiona con el repo, así que cualquier
  máquina o sesión futura reconstruye el contexto sin depender de la memoria local.
- `descartados` se ACUMULA entre pasadas y no se reabre nunca, salvo un área ⚠ con el
  bug demostrable.
- Cada informe termina con un bloque `<!-- review-state: {...} -->`, para poder
  reconstruir qué se reportó sin parsear el markdown.

## Fallos de agentes

- Error de CONFIGURACIÓN (modelo inexistente, permisos del host) → falla ruidosa: no se
  arregla reintentando, y un "verde" silencioso es peor que no revisar.
- Error TRANSITORIO (timeout, 429/5xx) → un reintento; si persiste, el área queda como
  "NO revisada" en el informe.
- El modelo inventa líneas o símbolos → por eso se exige anclaje verificado con
  `git show "${HASTA}:ruta"` y el `git grep` de símbolos antes de registrar.
