# Testing — principio de specs y gates de cobertura

> Adaptado de la guía de cobertura de integración de `backend-new` (Ridery). Allá aplica solo a repositories y arrastra un baseline por legacy. **Aquí el proyecto nace limpio, así que aplica a todo archivo ejecutable desde el día uno y no hay baseline que administrar.**

## 1. El principio

**Cada archivo es un contrato, y su spec es la prueba de que lo cumple.**

- Todo archivo ejecutable tiene un spec **al lado**, con el mismo nombre: `margin-calculator.service.ts` → `margin-calculator.service.spec.ts`.
- El spec describe el **comportamiento observable** del archivo (lo que promete a quien lo usa), no su implementación interna.
- Los nombres de los tests usan lenguaje de negocio: `it('rechaza asignar fondos si el proveedor no tiene saldo disponible')`, no `it('throws error')`.
- Si un archivo no se puede testear sin trucos, el problema es el diseño (casi siempre falta un puerto), no el test.

## 2. Qué tipo de spec lleva cada archivo

| Archivo                                                    | Spec                               | Cómo se prueba                                                                               | Qué está prohibido                                                              |
| ---------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `domain/**` (entities, VOs, services)                      | `*.spec.ts` (unit)                 | Funciones puras, sin dobles                                                                  | Mocks de cualquier tipo: el dominio no tiene dependencias que mockear           |
| `application/**/*.use-case.ts`                             | `*.spec.ts` (unit)                 | Puertos reemplazados por **fakes in-memory** (`InMemoryOperationRepository`)                 | `vi.mock` de módulos de infraestructura                                         |
| `infrastructure/persistence/**/*.repository.ts`            | `*.int.spec.ts` (integración)      | **Postgres real** (Supabase local) con `withDatabase()` y un rollback por test               | Mockear Kysely o `pg`. Si se mockea la DB, es unit y **no cuenta** para el gate |
| `infrastructure/entrypoints/http/**` (routes + controller) | `*.int.spec.ts`                    | Supertest contra la app Express con el composition root de test                              | Llamar al controller como función suelta                                        |
| `infrastructure/external_services/**`                      | `*.spec.ts`                        | Servidor HTTP simulado (MSW / nock) que respeta el contrato del proveedor                    | Hacer llamadas reales a internet                                                |
| Puertos (`*.port.ts`)                                      | `*.contract.ts` (suite compartida) | Una suite que corre contra **todas** las implementaciones (in-memory y Kysely)               | Que el fake y la implementación real diverjan                                   |
| `packages/shared-types` (schemas Zod)                      | `*.spec.ts`                        | Casos válidos e inválidos de cada schema                                                     | —                                                                               |
| Frontend: componentes `.vue`                               | `*.spec.ts`                        | Vue Test Utils: props → render, interacción → eventos emitidos, estados de carga/vacío/error | Testear detalles internos (`wrapper.vm.algo`)                                   |
| Frontend: composables, stores, api                         | `*.spec.ts`                        | Vitest + MSW para HTTP                                                                       | —                                                                               |
| Flujos críticos de punta a punta                           | `apps/frontend/e2e/*.e2e.ts`       | Playwright contra el stack local                                                             | —                                                                               |

**Exentos de spec** (lista cerrada, definida en `scripts/spec-gate.config.mjs`): `*.d.ts`, archivos que solo re-exportan (`index.ts` sin lógica), archivos de solo tipos, `main.ts`/`server.ts` (bootstrap), archivos de configuración y `supabase/migrations/*.sql` (los cubren los `*.int.spec.ts` de repositories). Agregar algo a la lista requiere aprobación explícita en el PR.

## 3. Las reglas del gate (bloquean el merge)

### Regla 0 — Todo archivo tiene su spec

El job `spec-presence` falla si un archivo ejecutable nuevo o modificado no tiene su spec al lado.

### Regla 1 — Ningún archivo bajo el piso, en las 4 métricas

Líneas, statements, funciones **y** branches, medidas **por archivo** (no el promedio del repo):

| Zona                                      | Piso                                                |
| ----------------------------------------- | --------------------------------------------------- |
| `apps/backend/src/domain/**`              | **95%** (es dinero y oro: el corazón no se negocia) |
| Resto del backend, `packages/*`, frontend | **80%**                                             |

Se mide el **archivo completo**, no tu diff. Si tocas 3 líneas de un archivo que estaba al 60%, el archivo entero tiene que subir al piso.

### Regla 2 — Lo que agregaste tiene que ejecutarse

El piso es del archivo; este check es del **diff**. Lo viejo no puede esconder lo nuevo: si `operation.repository.ts` está al 85% y agregas `findBySupplierAndStatus` sin un test que lo llame, el archivo puede seguir en 81% y **el pre-push igual queda rojo**. Cada línea, función y branch agregado o modificado desde `origin/main` (lo que vas a pushear) debe ejecutarse al menos una vez. Una función nueva vacía no mueve el % de líneas, pero igual tiene que ejecutarse.

### Regla 3 — Los specs de integración son de verdad

Un `*.int.spec.ts` que mockea la base de datos se rechaza en el review. El gate de repositories solo cuenta cobertura de la suite de integración.

### Regla 4 — Si el CI está rojo, se escriben tests

No se baja el piso, no se agrega el archivo a la lista de exentos y no se marca un test como `skip` para pasar. `it.only`, `describe.only` e `it.skip` están prohibidos por lint.

## 4. Base de datos de test

- Se levanta en local con **Supabase CLI**: `npx supabase start` (Docker) aplica `supabase/migrations/` y el resultado es el mismo schema, con las mismas políticas RLS, que en producción.
- El helper `withDatabase()` (`apps/backend/test/support/with-database.ts`) abre una transacción por test y hace **rollback** al terminar: los tests no se pisan entre sí y no hace falta limpiar a mano.
- Por eso los repositorios reciben el ejecutor de Kysely (DB o transacción) por constructor: es el mismo diseño que permite las transacciones de doble entrada.
- Hay builders de datos de prueba (`aSupplier().withBalance('10000.00 USD').build()`) en `test/support/builders/`; los tests no escriben INSERTs a mano.
- En CI, el job usa `supabase/setup-cli` y el mismo `supabase start`.

## 5. Comandos (cópialos, no los reinventes)

```bash
npm test                                    # unit de todos los workspaces
npm run test:int                            # integración (requiere supabase start)
npm run test:cov                            # Regla 1: piso por archivo (genera los coverage-final.json)
npm run coverage:diff                       # Regla 2: lo agregado desde origin/main se ejecuta
npm run verify                              # todo lo anterior + check: es lo que corre el pre-push
```

> Estado: las Reglas 0, 1 y 2 están activas. Regla 0: pre-commit (`spec-presence-gate`). Reglas 1 y 2: pre-push (`npm run verify`) y CI. No hay PRs: el gate de diff compara contra lo que todavía no está en `origin/main`.

## 6. Flujo de un feature

1. Escribe o actualiza el **spec primero** (o en el mismo commit): define el contrato.
2. Si el spec no existe, créalo al lado del archivo (el gate de specs te dice el nombre exacto).
3. Implementa hasta que el spec pase.
4. Commitea: el pre-commit corre ESLint, Prettier y el gate de specs sobre lo que está en stage.
5. Pushea: el pre-push corre `npm run verify` (formato, lint, typecheck, specs, tests, Regla 1 y Regla 2). El CI de GitHub repite lo mismo después del push y deja la evidencia.

## 7. Qué pasarle a una IA para que escriba un spec

No le pidas "haz tests" en el vacío. Copia este bloque y rellena las rutas:

```
Contexto: ArbiGold (monorepo Node/Express + Vue + Supabase). Voy a tocar <ruta del archivo>
y necesito su spec para pasar los gates de instructions/testing.md.

Lee primero (no inventes otro estilo):
- instructions/testing.md
- instructions/architecture.md
- Un spec canónico del mismo tipo: <ruta de un spec existente>
- El archivo que estoy tocando: <ruta>
- Su spec actual, si existe: <ruta.spec.ts | ruta.int.spec.ts>

Reglas:
- Tipo de spec según la tabla de la sección 2 (repository → *.int.spec.ts con withDatabase, sin mockear la DB).
- Cubre el método que agregué o cambié: <nombre>.
- El archivo ≥ 80% (≥ 95% en domain) en líneas, statements, functions y branches.
- Las líneas NUEVAS tienen que ejecutarse; no basta con que el archivo pase el piso.
- Nombres de test en lenguaje de negocio, en español.
- No "mejores" el código bajo prueba: el spec caracteriza el contrato.
- Verificar con: npm run verify

Cambio concreto:
- Método: <nombre>
- Qué debe pasar: <comportamiento esperado, con datos de ejemplo>
```

**Si la IA entrega un `*.int.spec.ts` que mockea Kysely o `pg`, se rechaza.** Eso es un test unit, y el gate no lo cuenta como integración.
