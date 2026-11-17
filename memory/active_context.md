# Contexto activo — ArbiGold

> **Regla:** todo agente lee este archivo al iniciar y lo actualiza al cerrar cada hito (ver `AGENTS.md` → Memoria).
> Es el estado vivo del proyecto: qué se está haciendo, cómo va y qué sigue. Lo histórico va en `memory/decision_logs/` y `memory/plans/`.

- **Última actualización:** 2026-11-17
- **Fase:** 1 — columna vertebral. Sub-hito **pantallas de los 5 módulos** entregado e integrado en `main` (commits atómicos por pantalla). Siguiente sub-hito: auth + migraciones RLS + API.
- **Plan de la fase:** `memory/plans/2026-11-16-fase-1-columna-vertebral.md`
- **Modelo del negocio:** `docs/domain/modelo-operativo.md` (preguntas del negocio respondidas el 2026-11-16/17)

## Estado del repo

| Qué              | Estado                                                                                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `main` en GitHub | al día tras el push de este hito (ver `git log` en este punto)                                                                                                                             |
| Commits locales  | 10 commits atómicos de este sub-hito: 2 de base (`shared-types`, `frontend`) + 8 por pantalla (proveedores, operaciones ×2, clientes, packing lists ×2, exportaciones ×2)                  |
| Supabase         | Proyecto en la nube (dev/test). `apps/backend/.env` completo (pooler IPv4 `aws-1-us-west-2:6543`). **Sin migraciones aún.** MCP registrado en scope local (requiere `/mcp` → Authenticate) |
| Dominio backend  | 100 % de cobertura: ley, peso, dinero, pieza, packing list (+ viruta/fundición), cierre de precio, margen, comparativo, utilidad de exportación, liquidación de terceros                   |
| Frontend         | 5 pantallas en modo demostración (repositorios localStorage). Suite: 402 tests verdes; typecheck y lint limpios; gate de specs (412 archivos) en verde                                     |
| API              | Solo `/health`. Sin rutas de negocio hasta tener auth (deny by default)                                                                                                                    |

## Orquestación del sub-hito (cerrada el 2026-11-17)

Las 5 tareas del plan `arbigold-f90f` están **aplicadas, verificadas e integradas** en `main`:
aduana de diffs → gates (typecheck, lint, specs) → peer review con corrección de hallazgos
mayores en el working tree → spec para cada archivo nuevo (Regla 0, 412 archivos) → commits
atómicos por pantalla (≤ 10 archivos, `tipo(scope): desc`) → `npm run verify` → push.

- **Plan persistente:** `~/.config/arbigold/orquestador/arbigold-f90f/plan.tsv` (marcado `done`
  con `plan.sh done` y `plan.sh reporte` tras el push).
- **Worktrees de minions:** `~/.cache/arbigold/minions/arbigold-*` borrados con
  `minion-worktree.sh limpiar --todos` (las entregas ya viven en `main`).
- **Refactor de integración:** bloques cohesivos salieron de las vistas/composables a archivos
  propios (`pieceValidation.ts`, `exportRepository.ts`, `exportTable.ts`, `operationStatus.ts`,
  `PackingListOptionRow.vue`, `focusField.ts`) con re-exports para no romper imports; esto bajó
  cada archivo del límite de 250 líneas sin tocar `max-lines`.

## Decisiones de este sub-hito

- **Diseño** (`frontend-design`): ERP de ensayo y pesaje; IBM Plex Sans local; lo memorable es la **lectura de ensayo** de las piezas (bruto × ley ‰ = fino, con la ley como sello) y la **balanza** fija del packing list. Sin clichés (MAYÚSCULAS en etiquetas, "A · B · C", "→", tarjetas idénticas).
- **Reglas de UI:** copia fijada de las Web Interface Guidelines en `docs/design/web-interface-guidelines.md` (no se descargan en cada uso).
- **Datos:** sin API todavía → repositorios intercambiables en `apps/frontend/src/shared/data/repositories.ts`, hoy en **modo demostración** (localStorage, aviso visible). `VITE_DATA_SOURCE=api` cambiará al adaptador HTTP sin tocar pantallas.
- **Fronteras:** un módulo del frontend no importa a otro; el acceso a datos de las 5 entidades vive en `shared/data` y `shared/composables/useCollection.ts`. Las rutas son por módulo (`modules/<m>/*.routes.ts`).
- **Lecciones transversales del primer peer review** (ya enviadas a todos los minions): sin `opacity` para atenuar; try/catch con toast que dice qué hacer en toda mutación; `aria-labelledby` en los `Select` de PrimeVue; mismo verbo en todo el flujo; confirmar antes de descartar cambios; `wrap-anywhere`; no guardar `q` vacía en la URL.

## Deudas conocidas (menores, del peer review; no bloquean el hito)

1. **Paginación/virtualización** de tablas (Opera­ciones, Exportaciones, clientes/proveedores): hoy
   cargan todas las filas; con datos reales hay que paginar.
2. **Guard de navegación** con diálogos abiertos (cambiar de ruta pierde el borrador): hoy solo hay
   `beforeunload` parcial en el editor de packing list.
3. **Totales exactos vs filas redondeadas**: la vista previa redondea a 2 decimales; el backend
   recalcula con `Decimal` exacto (el contrato ya lo dice).
4. Accesibilidad fina pendiente: anuncios de `aria-live` en más tablas, contraste en tags propios.

Resueltas al integrar: timeouts de specs (`testTimeout` 30 s donde hace falta), `matchMedia`/
`ResizeObserver` stubs quitados al mover código, TS2883 (no ocurre en el repo principal), punto de
miles ambiguo rechazado en `measurementString`, monedas del cierre restringidas a USDT/USD, y el
criterio de gramos de operaciones validado contra la fórmula del dominio.

## Decisiones de UI para validar con el negocio

- Operaciones: el botón "Nueva operación" se deshabilita si no hay cliente y proveedor activos; el precio por gramo se rotula en USD/g aunque el monto sea USDT; el texto de "Marcar como cumplida".
- Exportaciones: el % habitual del proveedor solo se precarga si es TERCEROS (en FONDEO ese % es el del cierre, no la utilidad).
- Packing list: "Marcar como recibido" en uno nuevo primero guarda el borrador; un residuo se corrige quitándolo y registrándolo de nuevo.
- Cifras con formato es-VE: `4.500,50 g` (punto de miles).

## Próximos pasos (en orden)

1. Verificar en GitHub la CI de este push (gates + `npm audit` + gitleaks como evidencia).
2. Siguiente sub-hito: **auth** (Supabase Auth + `@supabase/server`/JWKS + RBAC), **migraciones con
   RLS** y **API** de las 5 entidades → repositorios HTTP en el frontend
   (`f1-auth`, `f1-migraciones`, `f1-repos`, `f1-api` del plan).
3. Revisión visual con capturas (Playwright) contra `frontend-design` cuando el modo API esté listo.
