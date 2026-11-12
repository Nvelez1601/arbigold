# Tooling — calidad automática y hooks de git

> Norma obligatoria. Los hooks **no se saltan** (`--no-verify` está prohibido): si un hook falla, se corrige el código. El CI vuelve a correr las mismas validaciones.

## Requisitos

- **Node 24** (`.nvmrc`): `nvm install && nvm use`. Recomendado: `nvm alias default 24`, porque los hooks de git usan el Node por defecto de tu shell.
- **Docker**, para la base local de Supabase.
- `npm install` en la raíz instala todos los workspaces y activa Husky (script `prepare`).

## Qué corre en cada commit (Husky)

| Hook         | Herramienta                                                        | Qué valida                                                                                                                                         | Si falla                                                                       |
| ------------ | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `pre-commit` | **lint-staged → ESLint** (`--fix --max-warnings=0`)                | Clean code (límites de tamaño, complejidad, anidamiento), TypeScript estricto, **fronteras hexagonales**, reglas de Vue, specs sin `.only`/`.skip` | Corrige lo mecánico; si queda cualquier error o warning, **bloquea el commit** |
| `pre-commit` | **lint-staged → Prettier** (`--write`)                             | Formato canónico (`.prettierrc.json`)                                                                                                              | Formatea los archivos en stage                                                 |
| `pre-commit` | **spec-presence gate** (`scripts/spec-presence-gate.mjs --staged`) | Todo archivo fuente en stage tiene su spec al lado (Regla 0 de `testing.md`)                                                                       | Bloquea y dice qué spec crear                                                  |
| `commit-msg` | **commitlint** (`commitlint.config.mjs`)                           | `tipo(scope): descripción [\| ARB-123]`, scope obligatorio y dentro de la lista                                                                    | Bloquea                                                                        |

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
npm run check          # todo lo que corre el CI: format:check + lint + typecheck + spec:check + test
npm run lint           # ESLint del repo completo
npm run format         # Prettier --write
npm run typecheck      # tsc / vue-tsc en todos los workspaces
npm test               # unit (scripts + workspaces)
npm run test:int       # integración (requiere npm run db:start)
npm run test:cov       # cobertura con pisos POR ARCHIVO (80%, domain 95%) — falla si alguno queda bajo
npm run spec:check     # principio de specs sobre todo el repo
npm run db:start       # Supabase local (Docker): Postgres + Auth + Storage
npm run dev:backend    # API en :3000 (lee apps/backend/.env)
npm run dev:frontend   # SPA en :5173
```

## Pendiente (próxima fase del tooling)

- `scripts/coverage-gate.mjs` → `npm run test:cov:changed -- <base>`: **Regla 2** (las líneas nuevas del diff se ejecutan). Hoy Vitest solo aplica la **Regla 1** (piso por archivo).
- `scripts/spec-scaffold.mjs` → `npm run spec:scaffold -- <archivo>`.
- `apps/backend/test/support/with-database.ts`, que se implementa con el primer repository.
- Workflows de GitHub Actions (gates de PR, CodeQL, gitleaks, `npm audit`) y protección de ramas.
