# Tooling — calidad automática y hooks de git

> Norma obligatoria. **Una sola rama (`main`), un solo desarrollador, sin PRs** (ver `memory/decision_logs/ADR-002-flujo-una-rama-y-agentes.md`). Los hooks son el CI local y la única puerta antes de GitHub. **No se saltan** (`--no-verify` está prohibido): si un hook falla, se corrige el código. El CI de GitHub repite las validaciones después del push y deja la evidencia.

## Requisitos

- **Node 24** (`.nvmrc`): `nvm install && nvm use`. Recomendado: `nvm alias default 24`, porque los hooks de git usan el Node por defecto de tu shell.
- **Docker**, para la base local de Supabase.
- `npm install` en la raíz instala todos los workspaces y activa Husky (script `prepare`).

## Qué corre en cada commit y en cada push (Husky)

| Hook         | Herramienta                                                        | Qué valida                                                                                                                                                                | Si falla                                                                       |
| ------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `pre-commit` | **lint-staged → ESLint** (`--fix --max-warnings=0`)                | Clean code (límites de tamaño, complejidad, anidamiento), TypeScript estricto, **fronteras hexagonales**, reglas de Vue, specs sin `.only`/`.skip`                        | Corrige lo mecánico; si queda cualquier error o warning, **bloquea el commit** |
| `pre-commit` | **lint-staged → Prettier** (`--write`)                             | Formato canónico (`.prettierrc.json`)                                                                                                                                     | Formatea los archivos en stage                                                 |
| `pre-commit` | **spec-presence gate** (`scripts/spec-presence-gate.mjs --staged`) | Todo archivo fuente en stage tiene su spec al lado (Regla 0 de `testing.md`)                                                                                              | Bloquea y dice qué spec crear                                                  |
| `commit-msg` | **commitlint** (`commitlint.config.mjs`)                           | `tipo(scope): descripción [\| ARB-123]`, scope obligatorio y dentro de la lista                                                                                           | Bloquea                                                                        |
| `pre-push`   | **`npm run verify`**                                               | `check` (formato, lint, typecheck, specs, tests) + `test:cov` (**Regla 1**: piso por archivo) + `coverage:diff` (**Regla 2**: lo agregado desde `origin/main` se ejecuta) | Bloquea el push y muestra qué línea nueva no se ejecutó                        |

**Tipos:** `feat` `fix` `refactor` `perf` `test` `docs` `chore` `ci` `build` `revert` `style`.
**Scopes:** módulos (`treasury` `sourcing` `arbitrage` `compliance` `identity` `audit`) o áreas (`backend` `frontend` `shared-types` `db` `tooling` `ci` `deps` `norms` `docs` `structure` `security`). Agregar un scope es un cambio en `commitlint.config.mjs` revisado en un PR.

## Fronteras hexagonales con ESLint (`eslint-plugin-boundaries`)

`eslint.config.mjs` traduce `architecture.md` a reglas que bloquean el commit:

| Desde                       | Puede importar                                                | Externos permitidos |
| --------------------------- | ------------------------------------------------------------- | ------------------- |
| `domain/shared`             | `domain/shared`                                               | `decimal.js`        |
| `domain/<m>`                | su propio módulo + `domain/shared`                            | `decimal.js`        |
| `application/shared`        | `domain/shared`, `application/shared`                         | `decimal.js`        |
| `application/<m>`           | `domain/<m>`, `application/<m>`, los `shared`, `shared-types` | `decimal.js`        |
| `infrastructure`            | todo el backend + `shared-types`                              | cualquiera          |
| `src/main.ts`               | `infrastructure`                                              | cualquiera          |
| `packages/shared-types/src` | sí mismo                                                      | `zod`               |
| `frontend/src/modules/<m>`  | su propio módulo, el resto del frontend, `shared-types`       | cualquiera          |

Además, en `domain/` y `application/` están prohibidos `process.env`, `Date.now()`, `new Date()`, `Math.random()`, `.toFixed()` y `parseFloat()`. `process.env` solo se lee en `infrastructure/config/`.

Ejemplo de error:

```
Arquitectura: "domain" no puede depender de "express". Ver instructions/architecture.md
```

## Comandos

```bash
npm run verify         # lo que corre el pre-push y el CI: check + test:cov + coverage:diff
npm run check          # rápido: format:check + lint + typecheck + spec:check + test
npm run lint           # ESLint del repo completo
npm run format         # Prettier --write
npm run typecheck      # tsc / vue-tsc en todos los workspaces
npm test               # unit (scripts + workspaces)
npm run test:int       # integración (requiere npm run db:start)
npm run test:cov       # Regla 1: pisos POR ARCHIVO (80%, domain 95%)
npm run coverage:diff  # Regla 2 contra origin/main (o: node scripts/coverage-gate.mjs <ref>)
npm run spec:check     # principio de specs sobre todo el repo
npm run db:start       # Supabase local (Docker): Postgres + Auth + Storage
npm run dev:backend    # API en :3000 (lee apps/backend/.env)
npm run dev:frontend   # SPA en :5173
```

## CI en GitHub (evidencia, no puerta)

`.github/workflows/ci.yml` corre en cada push a `main`: `npm ci`, `npm run check`, `npm run test:cov`, la Regla 2 contra el SHA anterior al push (`github.event.before`), `npm audit --audit-level=high` y gitleaks. Sin PRs, el CI **no puede bloquear**: confirma lo que el pre-push ya validó y deja la evidencia para SOC 2 / ISO 27001. Si queda en rojo, arreglarlo es lo primero.

En GitHub, protege `main` contra force-push y borrado (Settings → Rules). No se exige PR.

## Skills de agentes

Viven en `.agents/skills/`, la fuente única que leen OpenCode, Codex y Cursor. `.claude/skills/` y los agentes de `.claude/agents/` y `.opencode/agents/` son **symlinks**. Las skills de terceros están fijadas en `skills-lock.json` y excluidas de ESLint y Prettier (no se reformatean). Se actualizan con `npx skills update` y se revisan antes de commitear, porque son instrucciones que los agentes ejecutan. Catálogo y uso en `AGENTS.md`.

## Pendiente

- `scripts/spec-scaffold.mjs` (esqueleto de spec según el tipo de archivo).
- `apps/backend/test/support/with-database.ts`: se implementa con el primer repository. Desde ese momento el pre-push y el CI necesitan Supabase local (`npm run db:start` / `supabase start` en CI).
