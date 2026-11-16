---
name: arbigold-orquestador-minion
description: >
  Ejecuta un plan de ArbiGold con el patrón orquestador-minion: descompone el plan en
  tareas, califica la dificultad de cada una del 1 al 10, pregunta al humano qué agente
  o LLM usar por tarea y si quiere peer review, despacha minions (arbigold-worker) en
  worktrees aislados, pasa cada entrega por la aduana (scope + gate de calidad que
  replica los hooks de git) y baja los findings al minion hasta que la tarea quede bien.
  Recibe el plan por handoff del plan mode, pegado en el prompt o desde memory/plans/.
  Incluye un modo lite para trabajo puntual (hasta 3 tareas). Activar cuando el usuario
  diga: "orquesta este plan", "hazle handoff al orquestador", "usa el patrón minion",
  "ejecuta el plan con minions", "delega estas tareas en subagentes", "orquesta esto en
  lite", "delega esto rápido con minions".
license: MIT
allowed-tools: Read, Grep, Glob, Bash
metadata:
  project: arbigold
  origin: adaptado de ridery-orquestador-minion (ridery_skills)
  language: es
  compatibility: claude-code, opencode, codex-cli, cursor-agent
---

# Orquestador minion — ArbiGold

Convierte un plan en una ejecución supervisada: el agente de la sesión actúa de
**orquestador** (no escribe el código de las tareas), delega cada tarea en un **minion**
(`arbigold-worker`) y controla la calidad de lo que vuelve. El humano decide qué LLM
ejecuta cada tarea y si quiere revisión por pares. El estado de la corrida vive en un
archivo fuera del repo (**no en la memoria de la conversación**): sobrevive a las
compactaciones y a los cambios de máquina.

Rutas: en este documento `$S` es `.agents/skills/arbigold-orquestador-minion/scripts`
(relativo a la raíz del repo). Todos los comandos se corren parados en la raíz.

## Contexto de ArbiGold que cambia el patrón

- **Una sola rama (`main`), sin PRs.** Los minions trabajan en ramas `minion/<id>`
  efímeras dentro de worktrees. La entrega aprobada se **aplica** al working tree de
  `main` y la rama se borra al limpiar. Los commits los hace la sesión con OK del
  humano, y pasan por los hooks.
- **Los hooks son la vara.** `gate-tests.sh` corre sobre la entrega lo mismo que exigirán
  el pre-commit y el pre-push: Prettier, ESLint (clean code + fronteras hexagonales),
  el principio de specs y Vitest relacionado (en backend, unit + integración). Una
  entrega que pasa el gate no rebota en el commit.
- **Dominio financiero.** Dinero, doble entrada, KYC, RLS y auth son de dificultad alta
  por defecto (ver el Paso 2).

## Principios del patrón

- **El orquestador razona, planifica y delega; no ejecuta tareas pesadas.** Su activo
  más valioso es el contexto de la sesión, y delegar lo protege de la compactación.
- **El minion arranca con contexto limpio.** Recibe solo lo que necesita: menos ruido
  es menos alucinación.
- **El minion devuelve un artefacto concreto** (diff + reporte), no una conversación.
- **La orquestación es de un solo nivel.** Solo el orquestador delega; un minion nunca
  despacha sub-minions.
- **Lo que puede ser un script, es un script.** Estado, fases, scope, stuck y limpieza
  tienen un comando con exit code. El juicio del agente queda para calificar, revisar
  contenido y escalar.

## Idioma

**Todo en español**: esta skill, las referencias, los mensajes de los scripts y la
conversación con el usuario.

## Cuándo usar esta skill

- **Usar cuando:** hay un plan aprobado (del plan mode, pegado o en `memory/plans/`) con
  varias tareas delegables, o el usuario pide orquestar, hacer handoff o ejecutar con minions.
- **No usar cuando:** es una tarea única y corta que el agente resuelve directo (el
  overhead la hace más lenta, no mejor), o el plan todavía se está diseñando (eso es plan mode).

---

## Modo lite — trabajo puntual y corto

Para cuando el plan cabe en **un párrafo**: hasta **3 tareas** delegables, sin cadenas
de dependencias, en la misma sesión de principio a fin. Si el pedido no cumple eso, dilo
y usa el modo completo. El usuario también puede pedirlo explícitamente ("en lite").

**Qué se salta:** `plan.sh` entero, la tabla de modelos (se hereda el de la sesión) y el
peer review (salvo que lo pidan). El checkpoint humano es una línea: "despacho X e Y en
worktrees con el modelo de esta sesión, ¿dale?".

**Qué se conserva, innegociable:**

1. Un worktree por minion: `bash $S/minion-worktree.sh crear <id>` al despachar y
   `limpiar --todos` al terminar, también si se aborta.
2. El prompt de `references/plantilla-prompt-minion.md`: scope cerrado, nunca commitear,
   escalar en vez de adivinar, reporte breve.
3. Dos tareas que tocan el mismo archivo no van en paralelo.
4. Revisión del orquestador y `gate-tests.sh` antes de aplicar cada diff. En lite, la
   verificación de scope es tuya: compara el diff contra lo pedido.
5. **Una ronda de corrección como máximo.** A la segunda falla, la tarea vuelve a la
   sesión y la haces tú con el usuario mirando.

Regla de salida: si a mitad del lite aparecen más tareas, dependencias o un stuck, migra
al modo completo (`plan.sh init` con lo ya hecho como `done`).

---

## Paso 1 — Recibir el plan y descomponerlo

1. Fuente del plan, en orden: handoff del plan mode, plan pegado o `memory/plans/<feat>.md`.
   Sin plan no hay skill: pídelo.
2. **¿Hay una corrida a medias?** `bash $S/plan.sh estado`. Si existe un plan activo con
   tareas pendientes, propón retomarlo (las `done`/`skip` no se re-despachan). Desde otra
   máquina: `plan.sh retomar`.
3. Lee `AGENTS.md` y las normas de `instructions/` que toque el plan antes de descomponer.
4. Descompón en tareas con **id** corto, **entregable** concreto, **archivos que va a
   tocar** (cada archivo de código **con su spec**: van juntos en la misma tarea),
   **dependencias** y **criterio de aceptación** verificable. Una tarea sin entregable o
   sin criterio verificable se reescribe hasta tenerlos.
5. Respeta la arquitectura al cortar: una tarea por capa o módulo cuando se pueda
   (`domain/<m>` → `application/<m>` → `infrastructure/...`). Dos tareas en paralelo nunca
   comparten archivo.

## Paso 2 — Calificar la dificultad (1-10)

| Puntaje | Categoría | Guía |
|---|---|---|
| 1–3 | Muy sencilla | Mecánica: renombrar, mover, config, texto |
| 4–5 | Sencilla | Un archivo o módulo, patrón ya conocido en el repo |
| 6–7 | Mediana | Varios archivos, contexto de dominio |
| 8–9 | Difícil | Diseño con trade-offs, concurrencia, riesgo de romper |
| 10 | Suma dificultad | Crítica o irreversible, o que depende de **gusto** (UI/UX fina, copy) |

**Piso por área en ArbiGold** (aunque parezca simple):

| Área | Piso |
|---|---|
| `treasury`, `arbitrage` (dinero, asientos de doble entrada, liquidación, redondeo) | 8 |
| `compliance` (KYC, cifrado, documentos), `identity` (auth, RBAC, MFA), `audit` | 8 |
| `supabase/migrations` (schema, RLS) | 9 |
| Pantallas que ve el usuario final | 7 (gusto) |

Criterios: archivos tocados, riesgo, contexto necesario, reversibilidad y gusto. En caso
de duda, el mayor.

## Paso 3 — Checkpoint humano (obligatorio)

1. Vuelca el plan al estado persistente. Formato TSV, una tarea por línea:
   `id	tarea	dif	archivos,coma	deps,coma	llm`

   ```bash
   bash $S/plan.sh init tareas.tsv     # el plan vive FUERA del repo: git nunca lo ve
   bash $S/plan.sh fases               # agrupa por dependencias + conflicto de archivos
   ```

   `fases` es determinista: dos tareas que comparten un archivo NUNCA quedan en la misma fase.
2. Muestra la tabla (`plan.sh estado`) y, si el plan es grande, el trade-off: paralelizar
   gasta más tokens y vale la pena cuando el tiempo importa más que el costo.
3. Por defecto cada tarea hereda el modelo de la sesión. Consulta
   `references/tabla-modelos.md` y ofrece un override solo si el usuario quiere controlar
   costo o calidad, si una tarea de 8–10 justifica escalar, o si el modelo heredado ya
   falló. Pregunta siempre si quiere **peer review** (global o tarea por tarea). No
   sigas sin este checkpoint.

## Paso 4 — Despachar minions

1. Por cada tarea de la fase en curso: `bash $S/minion-worktree.sh crear <id>`. Crea un
   worktree aislado en la rama `minion/<id>`, con los `node_modules` y `apps/backend/.env`
   symlinkeados. Si la tarea toca un `package.json`, borra el symlink e instala ahí.
2. El prompt del minion es **la plantilla de `references/plantilla-prompt-minion.md`**,
   completa pero mínima: entregable, criterio, archivos (alcance cerrado), ruta del
   worktree, reglas del repo POR REFERENCIA y las reglas duras.
3. Despacha con `arbigold-worker` (hereda el modelo y bloquea subdelegación, commit y
   push) y corre en paralelo las tareas independientes de la misma fase. Si el host no
   tiene ese agente, usa el subagente general con las mismas restricciones en el prompt.
   Si el host no expone subagentes, ejecuta las tareas en orden dentro de sus worktrees
   con el mismo gate.
4. Un minion **nunca** commitea, pushea ni publica: la entrega es el diff del worktree.

## Paso 5 — Peer review (si el humano lo pidió)

Invoca `arbigold-reviewer` con la variante adversarial de la plantilla. Devuelve
findings con archivo y línea, o "sin observaciones"; nunca edita.

## Paso 6 — Revisión del orquestador (siempre)

1. **Primero la aduana automática:**

   ```bash
   bash $S/verificar-entrega.sh <ruta-worktree> <id> --reporte reporte.txt
   bash $S/gate-tests.sh --dir <ruta-worktree> <archivos tocados>
   bash $S/verificar-entrega.sh <ruta-worktree> <id> --aplicar
   ```

   Un scope violado, un reporte incompleto o un diff que no aplica es **rebote
   automático** al minion, sin gastar revisión. El gate corre EN el worktree y ANTES de
   aplicar; si falla, es un finding más. Nunca lo arregles en silencio.
2. Después viene tu revisión de contenido contra el criterio de aceptación y las normas
   (`instructions/`), más los findings del peer review, deduplicados.
3. Los findings se bajan al minion y se registra la ronda:

   ```bash
   bash $S/plan.sh ronda <id> --error "<salida del fallo>"
   ```

   El script cuenta el tope (2 rondas) y detecta el estancamiento por huella: **el mismo
   error dos veces da exit 2 (STUCK)**. No gastes otra ronda: escala de modelo o al
   humano. Si un modelo económico trae findings de fondo, re-despacha un escalón arriba.
4. Tarea aprobada (criterio ✓, gate ✓, sin findings): `bash $S/plan.sh done <id>`.
   Saltada por el humano: `plan.sh skip <id>`.

## Paso 7 — Reporte final, review y commits

```bash
bash $S/plan.sh reporte                     # tabla desde la bitácora; archiva la corrida
bash $S/minion-worktree.sh limpiar --todos  # worktrees y ramas minion/* (ya aplicadas)
```

1. El reporte sale del archivo, no de memoria.
2. Si alguna tarea tocó un área de piso ≥ 8, ofrece correr `arbigold-orquestador-reviews`
   en modo `working` antes de commitear.
3. Propón los **commits atómicos** (≤ 10 archivos, `tipo(scope): desc`, con scopes de
   `commitlint.config.mjs`), agrupados por tarea. Commitea solo con el OK del humano. Los
   hooks corren en cada commit: **prohibido `--no-verify`**.
4. El push queda para el humano (o con su OK). El pre-push corre `npm run verify`.

**Cambio de máquina a mitad de corrida:** `plan.sh handoff` sube el plan y la bitácora a
un gist secreto de tu cuenta, y en la otra máquina `plan.sh retomar` lo baja.

---

## Validación

1. De la skill como artefacto: `bash $S/test-orquestador.sh`.
2. De una corrida: toda tarea `done` tiene su criterio y su gate ejecutados con salida
   visible; ninguna se despachó sin LLM ni peer review elegidos en el Paso 3; al final,
   `plan.sh estado` y `git worktree list` quedan limpios.

## Referencias

| Archivo | Cuándo cargarlo |
|---|---|
| `references/plantilla-prompt-minion.md` | Paso 4, al armar cada prompt (y la variante del revisor en el Paso 5) |
| `references/tabla-modelos.md` | Paso 3, para sugerir LLM por dificultad (revisa su fecha) |
