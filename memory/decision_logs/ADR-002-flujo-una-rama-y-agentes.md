# ADR-002 — Flujo de una sola rama, controles compensatorios y skills de agentes

- **Fecha:** 2026-11-16
- **Estado:** Aceptado (reemplaza el "Flujo de ramas" `beta → staging → main` con PRs de `AGENTS.md`)
- **Decisores:** Nelson Vélez (owner, único desarrollador)

## Contexto

ArbiGold lo desarrolla una sola persona asistida por agentes de IA. Los PRs y las ramas
de promoción (`beta`/`staging`) existen para que **otra persona** revise y apruebe; sin
esa persona, solo agregan ceremonia. Aun así, el sistema maneja dinero y KYC y debe
sostener controles de cambio alineados a SOC 2 (CC8.1) e ISO 27001 (A.8.25–A.8.32).

## Decisión

1. **Una sola rama: `main`.** Se commitea directo en ella y no se abren PRs. Las ramas
   `minion/<id>` del orquestador son efímeras (viven en worktrees y se borran al aplicar
   la entrega).
2. **Los hooks son el CI local y la única puerta:**
   - `pre-commit`: lint-staged (ESLint + Prettier) + gate de specs (Regla 0).
   - `commit-msg`: commitlint.
   - `pre-push`: `npm run verify` = check + cobertura por archivo (Regla 1) + cobertura
     del diff contra `origin/main` (Regla 2, `scripts/coverage-gate.mjs`).
   - `--no-verify` prohibido.
3. **CI en GitHub en cada push a `main`**, como **evidencia** (no puede bloquear sin PRs):
   repite los gates, corre la Regla 2 contra `github.event.before` y suma `npm audit` y
   gitleaks.
4. **Segunda firma con agentes:** `arbigold-orquestador-reviews` revisa los commits
   pendientes de `main` (o el working tree) por área, con refutador de bloqueantes, y
   versiona su informe en `memory/reviews/`. Es obligatorio antes de pushear cambios en
   áreas críticas (dinero, KYC, auth, auditoría, RLS).
5. **Ejecución con agentes:** `arbigold-orquestador-minion` delega las tareas de un plan
   en minions (`arbigold-worker`) dentro de worktrees, y las pasa por la aduana
   (`verificar-entrega.sh` + `gate-tests.sh`, que replica los hooks) antes de aplicarlas.
6. **Skills en `.agents/skills/`** (fuente única) con symlinks para Claude Code
   (`.claude/skills`, `.claude/agents`) y OpenCode (`.opencode/agents`). Las de terceros
   se fijan en `skills-lock.json` y se revisan antes de actualizarlas.

## Skills adoptadas

| Skill                          | Origen                                   | Para qué                                                     |
| ------------------------------ | ---------------------------------------- | ------------------------------------------------------------ |
| `arbigold-orquestador-minion`  | Adaptada de `ridery-orquestador-minion`  | Ejecutar planes con minions en worktrees                     |
| `arbigold-orquestador-reviews` | Adaptada de `ridery-orquestador-reviews` | Review por áreas sin PRs, informe en `memory/reviews/`       |
| `security-audit`               | cloudflare/security-audit-skill          | Auditoría de seguridad source-first                          |
| `code-review`                  | mattpocock/skills                        | Review en dos ejes (Standards / Spec) desde un punto fijo    |
| `frontend-design`              | anthropics/skills                        | Dirección visual del frontend                                |
| `ui-ux-pro-max`                | nextlevelbuilder/ui-ux-pro-max-skill     | Datos y reglas de UI/UX (paletas, tipografía, accesibilidad) |
| `qa-security-review`           | skills propias del owner                 | QA + SAST con reporte por hallazgo                           |
| `security-audit-generic`       | skills propias del owner                 | Auditoría con worktrees por vulnerabilidad                   |

No adoptadas: `security-vulnerability-analysis` (duplica `security-audit-generic`, asume
ramas beta/staging y trae un informe de otro proyecto), `qa-pr-review` (específica de
ArbiPro/Mongoose y de PRs) y las skills operativas de Ridery (Jira SF, permisos de
Office, daily standup).

## Consecuencias

- Un push tarda más (corre la suite completa con cobertura), a cambio de que nada roto
  llegue a GitHub.
- Sin aprobación humana independiente, el control de cambios descansa en la
  automatización y en la review de agentes. Para una auditoría formal se documenta como
  **control compensatorio**. Si entra un segundo desarrollador, se reabre este ADR
  (volver a PRs con review obligatoria).
- Desde el primer repository con base de datos, el pre-push y el CI necesitan Supabase local.
