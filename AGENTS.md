# AGENTS.md — ArbiGold

ERP para la intermediación/arbitraje de oro: fondos de proveedores → asignación a clientes → recepción de oro → liquidación, con compliance KYC.

**Si eres un agente: lee `instructions/README.md` y las 6 normas antes de escribir código.** No son sugerencias: los hooks de git, el CI y la review las hacen cumplir.

## Stack

Node.js 26 LTS · TypeScript strict · Express 5 · Kysely + Supabase (PostgreSQL, Auth, Storage) · Zod · decimal.js · Vue 3 + Vite + Pinia + vue-query + PrimeVue + Tailwind · Vitest · Supertest · Playwright · npm workspaces. Detalle en `memory/decision_logs/ADR-001-stack-tecnologico.md`.

## Mapa del repo

```
apps/backend/           API Express, arquitectura hexagonal (domain → application → infrastructure)
apps/frontend/          SPA Vue 3
packages/shared-types/  Contratos Zod compartidos (requests, responses, ErrorCode)
supabase/               Migraciones SQL y políticas RLS (fuente de verdad del schema)
scripts/                Gates propios: specs (Regla 0) y cobertura del diff (Regla 2)
instructions/           Normas obligatorias
memory/                 Estado vivo: plans/, decision_logs/ (ADRs), reviews/, qa/, research_briefs/, notes/
.agents/skills/         Skills de agentes (fuente única); .agents/agents/: arbigold-worker y arbigold-reviewer
.claude/ .opencode/     Symlinks a .agents/ para Claude Code y OpenCode
docs/                   setup/arranque.md, domain/modelo-operativo.md (el negocio), domain/glossary.md, design/paleta.md
```

## Reglas que no se rompen nunca

1. `domain/` no importa frameworks, DB, `process.env` ni el reloj.
2. Dinero, tasas y pesos nunca son `number`: se usan `Decimal` y value objects.
3. Cada archivo ejecutable tiene su spec al lado; ≥ 80% por archivo (≥ 95% en domain) en las 4 métricas, y las líneas nuevas se ejecutan.
4. Los specs de integración usan Postgres real; nunca se mockea la DB.
5. Nada de cascadas de `if`: guard clauses + mapas de estrategia. Errores tipados, traducidos en un solo lugar.
6. RLS en todas las tablas; el frontend no accede a la DB; la `service_role` no se usa en runtime.
7. Nunca se loggea PII, tokens ni secretos. Ningún secreto se commitea.
8. Los asientos contables no se editan ni se borran: se reversan.

## Flujo de trabajo: una sola rama (`main`), sin PRs

Un solo desarrollador: se commitea directo en `main` (ver `memory/decision_logs/ADR-002-flujo-una-rama-y-agentes.md`). Los hooks son la puerta:

| Momento          | Qué corre                                                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `git commit`     | ESLint (clean code + fronteras hexagonales) y Prettier sobre lo que está en stage, gate de specs y commitlint               |
| `git push`       | `npm run verify`: check completo + cobertura por archivo (Regla 1) + cobertura de lo agregado desde `origin/main` (Regla 2) |
| Después del push | CI de GitHub (`.github/workflows/ci.yml`): repite los gates + `npm audit` + gitleaks, como evidencia                        |

- Prohibido `--no-verify` y prohibido el force-push a `main`.
- Commits atómicos de ≤ 10 archivos: `tipo(scope): desc [| ARB-123]`, con los scopes de `commitlint.config.mjs`.
- Antes de pushear cambios en áreas críticas (dinero, KYC, auth, auditoría, RLS): corre la skill `arbigold-orquestador-reviews`.

## Skills y agentes

| Skill                                           | Úsala cuando…                                                                                                                                                                                 |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `arbigold-orquestador-minion`                   | Hay un plan con varias tareas: las delega en minions (`arbigold-worker`) en worktrees aislados, con una aduana que replica los hooks                                                          |
| `arbigold-orquestador-reviews`                  | Quieres la "segunda firma": revisa los commits pendientes de `main` (o el working tree) por área y registra el informe en `memory/reviews/`                                                   |
| `code-review`                                   | Review en dos ejes (Standards vs Spec) desde un punto fijo (`origin/main`, un SHA, `HEAD~n`)                                                                                                  |
| `security-audit`                                | Preguntas de seguridad, revisión focalizada o auditoría completa (source-first)                                                                                                               |
| `qa-security-review` / `security-audit-generic` | Barrido QA + SAST del repo, con un reporte por hallazgo y su rama de fix                                                                                                                      |
| `frontend-design`                               | Dirección visual de pantallas y componentes                                                                                                                                                   |
| `web-design-guidelines`                         | Revisar UI contra las Web Interface Guidelines. **Usa la copia fijada `docs/design/web-interface-guidelines.md`** (no descargues las reglas en cada uso)                                      |
| `ui-ux-pro-max`                                 | Paletas, tipografía, accesibilidad y patrones de UI. Sus scripts se corren como `python3 .agents/skills/ui-ux-pro-max/scripts/search.py ...` (en este repo no existe `${CLAUDE_PLUGIN_ROOT}`) |

Las skills de terceros están fijadas en `skills-lock.json`: no se editan a mano. Las `arbigold-*` son propias y se cambian como cualquier archivo del repo.

## Memoria y continuidad (obligatorio)

1. **Al iniciar:** lee `memory/active_context.md` (estado vivo: qué se hace, cómo va, qué sigue), los ADRs relevantes y el estado de reviews (`bash .agents/skills/arbigold-orquestador-reviews/scripts/review.sh estado`).
2. **Al cerrar cada hito** (una pantalla integrada, una migración, un push, una decisión del negocio): actualiza `memory/active_context.md` en el mismo commit o en el siguiente. Otro agente, otro LLM u otra sesión debe poder retomar **solo con el repo**, sin la conversación.
3. Decisiones de arquitectura → `memory/decision_logs/ADR-NNN-<tema>.md`. Planes → `memory/plans/`. Informes de review → `memory/reviews/`.
4. Si hay una orquestación en curso, `active_context.md` dice dónde viven el plan (`~/.config/arbigold/orquestador/…`) y los worktrees (`~/.cache/arbigold/minions/…`), y qué falta por tarea.
