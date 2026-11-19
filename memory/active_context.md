# Contexto activo — ArbiGold

> **Regla:** todo agente lee este archivo al iniciar y lo actualiza al cerrar cada hito (ver `AGENTS.md` → Memoria).
> Es el estado vivo del proyecto: qué se está haciendo, cómo va y qué sigue. Lo histórico va en `memory/decision_logs/` y `memory/plans/`.

## Hito actual — rediseño del frontend (2026-11-19)

**Hecho y commiteado localmente (sin pushear: el push lo hace el usuario):**

- Identidad violeta/rosa (Sora + DM Sans), dashboard real en el Panel, franja de métricas por módulo, sin aviso de demo; PrimeVue 4.5.5 + `@primeuix/themes` 2.0.3 (MIT, sin watermark de licencia).
- Pulido visual verificado con capturas (`apps/frontend/e2e/check-screens.e2e.ts`, datos ficticios coherentes: cliente 96–96,5 % < proveedor 97 % → margen positivo):
  - Panel: el margen se mostraba en "USD"; son **gramos**.
  - Encabezados de `DataTable` unificados con las tablas nativas (regla global en `styles.css`).
  - Búsqueda con ícono superpuesto (`pl-10!`), acciones de fila solo-ícono con `aria-label`/`title` y `shrink-0` (PrimeVue aplastaba el SVG a 10 px).
  - Operaciones: tabla extraída a `components/OperationsTable.vue`; columnas "Cliente y proveedor", "Monto" con su P. INT debajo y "% cli. / prov." para caber a 1280 px.
  - Tags `info`/`contrast` de Aura (azul cielo/negro) → violetas de la paleta en el preset (contraste 6,6 y 12,6:1).
- Tests: setup global `apps/frontend/test/support/setup.ts` (matchMedia/ResizeObserver) y helper `test/support/select.ts` (**PrimeVue 4 selecciona en `mousedown`**, no en `click`). `useNotify` compartido para toasts.
- Estado: `format:check`, lint, typecheck, gate de specs (443 archivos) y suite frontend (456 tests) en verde.

**Pendiente antes del push:** el pre-push corre `npm run verify`, que incluye `coverage:diff` (Regla 2: toda línea nueva desde `origin/main` debe ejecutarse en algún test). Con el volumen de cambios sin pushear probablemente falle en varios archivos: correr `npm run test:cov && npm run coverage:diff` y cubrir lo que marque (sin bajar pisos ni excluir archivos).

**Siguiente sub-hito:** auth (Supabase Auth + JWKS + RBAC), migraciones con RLS y API → repositorios HTTP (`VITE_DATA_SOURCE=api`).

## Estado del repo

- **`main` en GitHub**: al día tras el push de este hito (ver `git log` en este punto)
- **Commits locales**: 13 commits atómicos de este sub-hito: 2 de base (`shared-types`, `frontend`) + 11 por pantalla (proveedores, operaciones ×2, clientes, packing lists ×2, exportaciones ×2)
- **Supabase**: Proyecto en la nube (dev/test). `apps/backend/.env` completo (pooler IPv4 `aws-1-us-west-2:6543`). **Sin migraciones aún.** MCP registrado en scope local (requiere `/mcp` → Authenticate)
- **Frontend**: 5 pantallas en modo demostración (repositorios localStorage). Suite: 403 tests verdes; typecheck y lint limpios; gate de specs (412 archivos) en verde; coverage:diff falló en `coverage:diff` hasta cubrir las líneas marcadas.

## Orquestación del sub-hito (cerrada el 2026-11-17)

Las 5 tareas del plan `arbigold-f90f` están **aplicadas, verificadas e integradas** en `main`:

1. **Aduana de diffs** → gates (typecheck, lint, specs) → peer review con corrección de hallazgos
2. **Mayores en el working tree** → spec para cada archivo nuevo (Regla 0, 412 archivos) → commits atómicos por pantalla (≤ 10 archivos, `tipo(scope): desc`) → `npm run verify` → push.

## Decisiones de este sub-hito

- **Diseño** (`frontend-design`): ERP de ensayo y pesaje; IBM Plex Sans local; lo memorable es la **lectura de ensayo** de las piezas (bruto × ley ‰ = fino, con la ley como sello) y la **balanza** fija del packing list. Sin clichés (MAYÚSCULAS en etiquetas, "A · B · C", "→", tarjetas idénticas).
- **Reglas de UI**: copia fijada de las Web Interface Guidelines en `docs/design/web-interface-guidelines.md` (no se descargan en cada uso).
- **Datos**: sin API todavía → repositorios intercambiables en `apps/frontend/src/shared/data/repositories.ts`, hoy en **modo demostración** (localStorage, aviso visible). `VITE_DATA_SOURCE=api` cambiará al adaptador HTTP sin tocar pantallas.
- **Lecciones transversales del primer peer review** (ya enviadas a todos los minions): sin `opacity` para atenuar; try/catch con toast que dice qué hacer en toda mutación; `aria-labelledby` en los `Select` de PrimeVue; mismo verbo en todo el flujo; confirmar antes de descartar cambios; `wrap-anywhere`; no guardar `q` vacía en la URL.

## Deudas conocidas (menores, del peer review; no bloquean el hito)

1. **Paginación/virtualización** de tablas (Operaciones, Exportaciones, clientes/proveedores): hoy cargan todas las filas; con datos reales hay que paginar.
2. **Guard de navegación** con diálogos abiertos (cambiar de ruta pierde el borrador): hoy solo hay `beforeunload` parcial en el editor de packing list.
3. **Totales exactos vs filas redondeadas**: la vista previa redondea a 2 decimales; el backend recalcula con `Decimal` exacto (el contrato ya lo dice).
4. Accesibilidad fina pendiente: anuncios de `aria-live` en más tablas, contraste en tags propios.

## Resueltas al integrar

- Timeouts de specs (`testTimeout` 30 s donde hace falta), `matchMedia`/ `ResizeObserver` stubs quitados al mover código, TS2883 (no ocurre en el repo principal), punto de miles ambiguo rechazado en `measurementString`, monedas del cierre restringidas a USDT/USD, y el criterio de gramos de operaciones validado contra la fórmula del dominio.

## Próximos pasos (en orden)

1. Verificar en GitHub la CI de este push (gates + `npm audit` + gitleaks como evidencia).
2. Siguiente sub-hito: **auth** (Supabase Auth + `@supabase/server`/JWKS + RBAC), **migraciones con RLS** y **API** de las 5 entidades → repositorios HTTP en el frontend (`f1-auth`, `f1-migraciones`, `f1-repos`, `f1-api` del plan).
3. Revisión visual con capturas (Playwright) contra `frontend-design` cuando el modo API esté listo.

## Importante

- El push lo hace el usuario; el hook pre-push corre `npm run verify` (`format:check` + `lint` + `typecheck` + `spec:check` + `npm test` en check, luego `test:cov`, luego `coverage:diff`). Lint cuenta `max-lines` con `skipBlankLines`/`skipComments` (250 fuente / 500 specs).
- `npm run verify` pasado localmente en sus fases check y test (403/403 verde); falló solo en `coverage:diff`. No revertir la subida de `testTimeout`/waitFor: reintroduce los flakes (PrimeVue bajo carga).
- Flakes confirmados e intermitentes: a una corrida falló `ClientFormDialog.spec.ts`, `OperationFormDialog.spec.ts`, `ClientsView.spec.ts` en distintas pasadas; todos pasan aislados.
- Ninguno de los 13 commits está en GitHub; `origin/main` sigue en `b3bf2a8~1`; el push lo hace el usuario.

## Relevantes

- `apps/frontend/src/modules/treasury/components/SupplierFormDialog.vue`: líneas 57, 166, 213 y ramas 57/148/221 sin cubrir según coverage:diff.
- `apps/frontend/src/modules/treasury/composables/useSupplierForm.ts`: línea 124 (branch brazo 1) sin cubrir.
- `apps/frontend/src/modules/treasury/views/SuppliersView.vue`: línea 168 (function anonymous_25) y 67 (branch brazo 1) sin cubrir.
- `apps/frontend/src/modules/sourcing/views/ClientsView.vue`: candidato probable del primer bloque truncado sin ejecutar (líneas 45–162); revisar en el reporte completo.
- `scripts/coverage-gate.mjs`: Regla 2; consume `coverage/coverage-final.json`, `apps/frontend/coverage/coverage-final.json`, `packages/shared-types/coverage/coverage-final.json`; base = merge-base con `origin/main`; mensaje de fallo exacto: "Escribe el test que entre ahí. No bajes pisos ni excluyas archivos."
- `apps/frontend/vitest.config.ts`: añadido `testTimeout: 15_000` (fix de flakes).
- `apps/frontend/src/modules/sourcing/views/ClientsView.spec.ts` y .../components/PieceRowsEditor.spec.ts: `waitFor` con `{ timeout: 5000, interval: 20 }`.
- `apps/frontend/src/modules/sourcing/composables/useClientForm.ts`: ahora posee `STATUS_ACTIONS`, `statusActionFor`, `StatusAction` (movidas desde la vista).
- `apps/frontend/src/modules/exports/composables/useExportForm.ts`: nuevo export público `validExportStatusFilter` (con spec en `.spec.ts`).
- `apps/frontend/src/modules/exports/views/ExportsView.vue` y .../components/ExportFormDialog.vue: reciente fix de 250 líneas; verify los marcó limpios en lint.
- `memory/active_context.md`: estado vivo actualizado (5/5 done); falta añadir nota de resolución de deuda #1.
