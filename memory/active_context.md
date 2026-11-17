# Contexto activo — ArbiGold

> **Regla:** todo agente lee este archivo al iniciar y lo actualiza al cerrar cada hito (ver `AGENTS.md` → Memoria).
> Es el estado vivo del proyecto: qué se está haciendo, cómo va y qué sigue. Lo histórico va en `memory/decision_logs/` y `memory/plans/`.

- **Última actualización:** 2026-11-17
- **Fase:** 1 — columna vertebral. Sub-hito en curso: **pantallas de los 5 módulos** (frontend, modo demostración)
- **Plan de la fase:** `memory/plans/2026-11-16-fase-1-columna-vertebral.md`
- **Modelo del negocio:** `docs/domain/modelo-operativo.md` (preguntas del negocio respondidas el 2026-11-16/17)

## Estado del repo

| Qué                         | Estado                                                                                                                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `main` en GitHub            | `5634134` (CI verde)                                                                                                                                                                                               |
| Commits locales sin pushear | 11: base del frontend (contratos Zod, layout, router por módulo, repositorios demo, utilidades), fixes de la base (Zod/PrimeVue en español, storage demo lazy, symlinks de minions), skill `web-design-guidelines` |
| Supabase                    | Proyecto en la nube (dev/test). `apps/backend/.env` completo (pooler IPv4 `aws-1-us-west-2:6543`). **Sin migraciones aún.** MCP registrado en scope local (requiere `/mcp` → Authenticate)                         |
| Dominio backend             | 100 % de cobertura: ley, peso, dinero, pieza, packing list (+ viruta/fundición), cierre de precio, margen, comparativo, utilidad de exportación, liquidación de terceros                                           |
| API                         | Solo `/health`. Sin rutas de negocio hasta tener auth (deny by default)                                                                                                                                            |

## Orquestación en curso (skill `arbigold-orquestador-minion`)

- **Estado persistente del plan:** `~/.config/arbigold/orquestador/arbigold-f90f/plan.md` (fuera del repo). Ver con `bash .agents/skills/arbigold-orquestador-minion/scripts/plan.sh estado`.
- **Worktrees de los minions:** `~/.cache/arbigold/minions/arbigold-<id>` (rama `minion/<id>`, nacidos de `c85ddef`). Las entregas están **sin commitear** dentro de cada worktree.
- **Pipeline por tarea:** `verificar-entrega.sh` (scope/reporte/apply) → `gate-tests.sh --dir <wt>` → peer review adversarial → ronda de correcciones (máx. 2) → `verificar-entrega.sh --aplicar` → `plan.sh done`.

| Tarea           | Archivos (alcance)                                                                                                                                                                                           | Estado                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `proveedores`   | `modules/treasury/{views/SuppliersView,components/SupplierFormDialog,composables/useSupplierForm}`                                                                                                           | Entrega + **ronda 1 corregida** (4 mayores y 9 menores del peer review). Falta: re-verificar, peer review de la ronda 1, aplicar |
| `clientes`      | `modules/sourcing/{views/ClientsView,components/ClientFormDialog,composables/useClientForm}`                                                                                                                 | Entregado `ok`. Falta: aduana, gate, peer review                                                                                 |
| `operaciones`   | `modules/arbitrage/{views/OperationsView,components/OperationFormDialog,components/ClosurePreview,composables/useOperationForm}`                                                                             | Entregado `ok`. Falta: aduana, gate, peer review                                                                                 |
| `packing-lists` | `modules/sourcing/{packing-lists.routes,views/PackingListsView,views/PackingListEditorView,components/PieceRowsEditor,components/ScaleSummaryBar,components/ResidueDialog,composables/usePackingListEditor}` | Entregado `ok` (14 archivos). Falta: aduana, gate, peer review                                                                   |
| `exportaciones` | `modules/exports/{views/ExportsView,components/ExportFormDialog,components/ExportProfitPreview,composables/useExportForm}`                                                                                   | Entregado `ok`. Falta: aduana, gate, peer review                                                                                 |

Cada archivo va con su `.spec.ts` al lado. Las 5 tareas son paralelas: no comparten archivos.

## Decisiones de este sub-hito

- **Diseño** (`frontend-design`): ERP de ensayo y pesaje; IBM Plex Sans local; lo memorable es la **lectura de ensayo** de las piezas (bruto × ley ‰ = fino, con la ley como sello) y la **balanza** fija del packing list. Sin clichés (MAYÚSCULAS en etiquetas, "A · B · C", "→", tarjetas idénticas).
- **Reglas de UI:** copia fijada de las Web Interface Guidelines en `docs/design/web-interface-guidelines.md` (no se descargan en cada uso).
- **Datos:** sin API todavía → repositorios intercambiables en `apps/frontend/src/shared/data/repositories.ts`, hoy en **modo demostración** (localStorage, aviso visible). `VITE_DATA_SOURCE=api` cambiará al adaptador HTTP sin tocar pantallas.
- **Fronteras:** un módulo del frontend no importa a otro; el acceso a datos de las 5 entidades vive en `shared/data` y `shared/composables/useCollection.ts`. Las rutas son por módulo (`modules/<m>/*.routes.ts`).
- **Lecciones transversales del primer peer review** (ya enviadas a todos los minions): sin `opacity` para atenuar; try/catch con toast que dice qué hacer en toda mutación; `aria-labelledby` en los `Select` de PrimeVue; mismo verbo en todo el flujo; confirmar antes de descartar cambios; `wrap-anywhere`; no guardar `q` vacía en la URL.

## Deudas conocidas (resolver al integrar)

1. **Timeouts de 5 s bajo carga** en specs de la base (App, router, AppLayout, `*.routes.spec`): subir `testTimeout` del frontend (p. ej. 15 s) en `apps/frontend/vitest.config.ts`.
2. **jsdom sin `matchMedia` ni `ResizeObserver`:** crear un setup global de tests (`apps/frontend/test/support/setup.ts`) y quitar los stubs locales de los minions.
3. **TS2883 en `test/support/mount.ts`** solo dentro de los worktrees (node_modules symlinkeado). En el repo principal no ocurre; verificar tras aplicar.
4. Error mío en el criterio de `operaciones`: 100 000 USDT a P. INT 4000 da 809,99 / 801,64 / 8,35 g (no 1619,97…). El minion lo detectó y probó contra la fórmula.
5. Falta aviso `beforeunload` (cerrar pestaña) en el editor de packing list; hoy solo hay guard de router.

## Decisiones de UI para validar con el negocio

- Operaciones: el botón "Nueva operación" se deshabilita si no hay cliente y proveedor activos; el precio por gramo se rotula en USD/g aunque el monto sea USDT; el texto de "Marcar como cumplida".
- Exportaciones: el % habitual del proveedor solo se precarga si es TERCEROS (en FONDEO ese % es el del cierre, no la utilidad).
- Packing list: "Marcar como recibido" en uno nuevo primero guarda el borrador; un residuo se corrige quitándolo y registrándolo de nuevo.
- Cifras con formato es-VE: `4.500,50 g` (punto de miles).

## Próximos pasos (en orden)

1. Terminar el pipeline de las 5 tareas (tabla de arriba), **de a una** para no saturar la máquina (los gates en paralelo dieron timeouts).
2. Resolver las deudas 1–3, aplicar las entregas al working tree, `npm run verify`, commits atómicos por pantalla.
3. Revisión visual con capturas: script en el scratchpad de la sesión (`tools/screens.cjs`, Playwright ya instalado); crítica según `frontend-design`.
4. `plan.sh reporte`, `minion-worktree.sh limpiar --todos`, push.
5. Siguiente sub-hito: **auth** (Supabase Auth + `@supabase/server`/JWKS + RBAC), **migraciones con RLS** y **API** de las 5 entidades → repositorios HTTP en el frontend (`f1-auth`, `f1-migraciones`, `f1-repos`, `f1-api` del plan).
