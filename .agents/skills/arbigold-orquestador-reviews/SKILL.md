---
name: arbigold-orquestador-reviews
description: >
  Orquesta revisiones de código de ArbiGold en paralelo, sin PRs: toma lo commiteado en
  main desde la última review (o el working tree antes de commitear, o un rango), lo
  agrupa por área, despacha un agente de solo lectura (arbigold-reviewer) por área con
  el rol y el catálogo de riesgos que le corresponden, verifica los hallazgos
  bloqueantes con un refutador, consolida un informe en memory/reviews/ y convierte los
  hallazgos en un plan para arbigold-orquestador-minion. Áreas críticas (dinero, KYC,
  auth, auditoría, RLS) llevan revisión reforzada. Por defecto registra el informe; el
  humano lo frena con "solo analiza", "no registres" o "vista previa". Activar cuando el
  usuario diga: "revisa lo que hice", "revisa los commits pendientes", "haz la review",
  "revisa antes de commitear", "orquesta los reviews", "revisión en paralelo".
license: MIT
allowed-tools: Read, Grep, Glob, Bash
metadata:
  project: arbigold
  origin: adaptado de ridery-orquestador-reviews (ridery_skills)
  language: es
  compatibility: claude-code, opencode, codex-cli, cursor-agent
---

# Orquestador de reviews — ArbiGold

> **Nunca se activa sola.** Esta skill despacha varios agentes y consume mucho. Úsala solo si el usuario la pide explícitamente o **después de preguntarle** (con una estimación de cuántos agentes y del costo) y que acepte. Para trabajo chico, hazlo directo en la sesión (ver `AGENTS.md` → "Cómo se trabaja con agentes").

La sesión actúa de **orquestador**: descubre, despacha, verifica y consolida. Cada área
del cambio la analiza un **agente de solo lectura** (`arbigold-reviewer`) con contexto
limpio. La orquestación es de **un solo nivel** (un agente de análisis nunca despacha
sub-agentes), y los agentes **nunca** editan, commitean ni tocan el working tree.

Rutas: `$S` es `.agents/skills/arbigold-orquestador-reviews/scripts`, y todo se corre
desde la raíz del repo.

**Todo en español**, sin excepciones.

## Por qué existe (contexto de un solo desarrollador)

ArbiGold trabaja en **una sola rama (`main`), sin PRs**. Los hooks verifican lo
mecánico (formato, lint, fronteras hexagonales, specs, cobertura), pero no el juicio:
¿este asiento contable cuadra?, ¿esta política RLS deja leer lo que no debe?, ¿el spec
prueba el contrato o la implementación? Esta skill es la **segunda firma** que un PR
daría en un equipo. Su registro en `memory/reviews/` también sirve de **evidencia del
control de cambios** (SOC 2 CC8.1, ISO 27001 A.8.32; ver `instructions/security-compliance.md`).

## Modos

| Modo | Qué hace | Cuándo |
|---|---|---|
| `registrar` | Consolida, guarda el informe en `memory/reviews/` y avanza el último SHA revisado | **Default** |
| `analyze-only` | Solo informa en el chat; no escribe nada | "solo analiza", "no registres", "vista previa" |
| `hitl` | Presenta el consolidado y pregunta qué registrar o descartar | "pregúntame antes", "revisemos juntos" |

## Paso 1 — Alcance

```bash
bash $S/review.sh alcance                 # default: commits de main desde la última review
bash $S/review.sh alcance --working       # lo que todavía no se commiteó (p. ej. tras una corrida de minions)
bash $S/review.sh alcance --desde <ref>   # o --rango A..B
```

La salida agrupa los archivos por **área** y marca con ⚠ las críticas. **Pega la tabla
de alcance en el chat tal cual**: es el entregable del descubrimiento. La última línea
(`HASTA=`) es el SHA que se registra al final.

- Las áreas `docs` y `skills` no se revisan (salvo que el humano lo pida): son markdown o
  contenido vendorizado con su propio lock.
- Si hay un plan en `memory/plans/` relacionado con los commits, anótalo: activa el eje
  **Spec** (Paso 2).
- `bash $S/review.sh estado` muestra los hallazgos **descartados** por el humano en
  pasadas anteriores. Se pasan a los agentes para que no los re-reporten.

## Paso 2 — Ruteo: un agente por área

| Área | Rol del agente | Catálogo (`references/catalogo-riesgos.md`) | Normas por referencia |
|---|---|---|---|
| ⚠ `treasury`, `arbitrage`, `exports`, `domain-shared` | Senior QA de sistemas financieros | `§Dinero` `§Ledger` `§Concurrencia` `§Hexagonal` `§Specs` | `architecture.md` §5, `error-handling.md` |
| ⚠ `compliance` | Senior de seguridad y compliance KYC | `§Seguridad` `§KYC` `§Hexagonal` `§Specs` | `security-compliance.md` |
| ⚠ `identity`, `audit` | Senior de seguridad (authn/authz y auditoría) | `§Seguridad` `§Auditoría` `§Errores` | `security-compliance.md`, `error-handling.md` §5 |
| ⚠ `db-rls` | DBA con foco en seguridad Postgres/Supabase | `§SQL` `§RLS` `§Dinero` | `security-compliance.md` §1, ADR-001 |
| `backend` (infra, http, config) | Senior backend Node/Express | `§Express` `§Errores` `§Seguridad` `§Specs` | `architecture.md`, `error-handling.md` |
| `frontend` | Senior frontend Vue 3 | `§Vue` `§Specs` | `architecture.md` §6 |
| `contratos` | Revisor de contratos de API | `§Contratos` | `architecture.md` §7 |
| `tooling` | Revisor de tooling y cadena de suministro | `§Tooling` | `tooling.md`, `security-compliance.md` §5 |

- **Eje Spec** (opcional, si hay un plan en `memory/plans/`): un agente extra aplica el eje
  *Spec* de la skill `code-review` (requisitos faltantes, alcance de más, requisitos mal
  implementados), citando la línea del plan. No se mezcla ni se re-rankea con los hallazgos
  por área. Va en su propia sección del informe.
- Las áreas chicas y relacionadas pueden ir juntas en un agente (p. ej. `contratos` + `frontend`).
- Los agentes heredan el modelo de la sesión. En áreas ⚠ con diff grande, ofrece el mejor
  modelo disponible. Si un informe vuelve flojo (walkthrough vacío o hallazgos sin anclaje
  verificado), re-despacha un escalón arriba.

## Paso 3 — Despacho

- Un `arbigold-reviewer` por área (o grupo), en paralelo, con el prompt de
  `references/plantilla-prompt-agente.md`. Si el host no tiene ese agente, usa un
  subagente de solo lectura con la restricción explícita. Si el host no expone subagentes,
  revisa de forma secuencial y dilo.
- **Tope de 5 agentes simultáneos**; el resto en cola, informando el progreso ("3/7").
- A cada agente se le pasan los archivos de SU área, el rango y los descartados.
  Un diff grande nunca se inyecta entero: el agente pide cada archivo con `git show`.
- **Fallos honestos**: si un agente muere o entrega un informe inservible, se reintenta
  UNA vez; si vuelve a fallar, el informe final lo dice explícito ("área X: NO
  revisada"). Nunca dejes caer un área en silencio.

## Paso 4 — Verificación antes de registrar

1. **Refutador de 🔴**: por cada hallazgo Bloqueante/Crítico, un agente independiente
   intenta refutarlo contra el código real. Si lo refuta, el hallazgo se degrada o se cae.
   **Obligatorio en áreas ⚠**; recomendado en el resto. Un falso bloqueante quema
   credibilidad y tiempo.
2. **Símbolos "que no existen"**: si un hallazgo afirma que algo falta, haz `git grep`
   en el árbol del SHA revisado. La ausencia en el diff no es ausencia en el repo.
3. **Anclaje**: todo hallazgo tiene archivo y línea verificados en el SHA `HASTA` (o en el
   working tree en modo `--working`). Sin anclaje no entra al informe.
4. **Descartados**: un hallazgo cuya huella (`<archivo>#<título>`) está en `estado.json`
   no se reporta otra vez. Única excepción: área ⚠ con el bug todavía demostrable en el código.

## Paso 5 — Informe y registro

El informe consolidado (formato en la plantilla) tiene:
- resumen del alcance,
- hallazgos por severidad (🔴 Bloqueante · 🟠 Mayor · 🟡 Menor · 🟢 Nota),
- la sección Spec (si corrió),
- el walkthrough de lo verificado sin hallazgos,
- las áreas no revisadas y por qué.

- `registrar`: escribe el informe en un archivo temporal y corre
  `bash $S/review.sh registrar <informe.md> --hasta <HASTA>`. Así queda en
  `memory/reviews/<fecha>-<sha7>.md` y avanza el último SHA. Propón el commit
  `docs(reviews): review hasta <sha7>` (con OK del humano). En modo `--working` no se avanza
  el SHA: se registra el informe con `--hasta HEAD` solo si el humano lo pide.
- Cuando el humano cierra un hallazgo con argumento: `bash $S/review.sh descartar "<huella>" "<motivo>"`.
  Pesa un 90%: no se reabre salvo en un área ⚠ con el bug demostrable.

## Paso 6 — De hallazgos a correcciones

Si quedan 🔴 o 🟠, ofrece convertirlos en un plan para **`arbigold-orquestador-minion`**:
una tarea por hallazgo (o por grupo que toca los mismos archivos), con el archivo y su
spec como alcance cerrado, y como criterio de aceptación el test que demuestra el fix. Las
áreas ⚠ heredan su piso de dificultad (8–9). Los 🔴 en áreas ⚠ **bloquean el push** hasta
que se corrijan o se descarten con argumento: dilo explícito en el resumen final.

## Paso 7 — Resumen final

Una tabla de área | agente | hallazgos por severidad | refutados, más los bloqueantes
activos, las áreas no revisadas y por qué, la ruta del informe registrado y el siguiente
paso (plan de correcciones o "listo para push"). No recortes cobertura en silencio.

## Qué NO es un hallazgo

El estilo o formato (lo hacen cumplir ESLint y Prettier), el tamaño del cambio, la
"policía de proceso" o una preferencia personal. Un hallazgo es un bug, un riesgo, una
violación de una norma documentada o un spec que no prueba el contrato.

## Referencias

| Archivo | Cuándo |
|---|---|
| `references/plantilla-prompt-agente.md` | Al despachar cada agente (Paso 3) y al armar el informe (Paso 5) |
| `references/catalogo-riesgos.md` | Lo cargan los agentes según su área (Paso 2) |
| `references/gotchas-operativas.md` | Ante errores de rangos de git, anclaje o shell |
