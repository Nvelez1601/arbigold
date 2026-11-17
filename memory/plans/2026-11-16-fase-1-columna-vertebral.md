# Plan — Fase 1: columna vertebral (clientes, proveedores, operaciones, packing lists, exportaciones)

- **Fecha:** 2026-11-16
- **Fuente:** `docs/domain/modelo-operativo.md` (interpretación de las reuniones y los registros Excel)
- **Ejecución:** con `arbigold-orquestador-minion`, una tarea por fila

## Hecho en esta sesión

| Id              | Entregable                                                                                     | Estado                         |
| --------------- | ---------------------------------------------------------------------------------------------- | ------------------------------ |
| f1-dominio-oro  | VOs `Fineness` (ley ‰ con normalización de escalas), `GoldWeight`, `Money`; errores de dominio | ✅ 100 % de cobertura          |
| f1-packing-list | `GoldPiece` y `PackingList` (piezas sin repetir, totales bruto/fino)                           | ✅                             |
| f1-cierre       | `PriceClosure` y `computeOperationSpread` (gramos del cliente, del proveedor y margen)         | ✅ verificado contra los Excel |
| f1-conciliacion | `reconcileByPiece` y `reconcileBlockMelt` (diferencia por cliente, reparto en bloque)          | ✅                             |
| f1-config       | `env.ts` con DB, Supabase, logs y proxy; `.env.example` de la API y del frontend               | ✅                             |
| f1-paleta       | Tokens, preset de PrimeVue y CSS con verificación de contraste en tests                        | ✅                             |

## Hecho tras las respuestas del negocio (2026-11-17)

| Id              | Entregable                                                                                                                                                           | Estado                |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| f1-respuestas   | Onza troy 31.1035; medidas hasta 3 decimales; comparativo por packing list (`compareWithAssay`); utilidad de exportación con CVM 1 % + 0.3 % (`computeExportProfit`) | ✅ 100 % de cobertura |
| f1-aclaraciones | Viruta/fundición como consideración del packing list (`MaterialResidue`); liquidación de terceros por utilidad o cobro total en dinero (`settleThirdPartyExport`)    | ✅ 100 % de cobertura |

## Pendiente (las preguntas del §7 están respondidas)

| Id              | Tarea                                                                                                                                     | Dif. | Depende de               |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------ |
| f1-entidades    | Entidades `Client`, `Supplier`, `Operation` (con estados) y `Export` (con estados y packing lists)                                        | 8    | validación §7            |
| f1-migraciones  | `supabase/migrations`: tablas, `numeric`, FKs, RLS deny-all, rol de la app, `audit_log`                                                   | 9    | f1-entidades             |
| f1-db-helper    | `withDatabase()` (transacción con rollback por test) + builders                                                                           | 6    | f1-migraciones           |
| f1-repos        | Repositories Kysely + `*.int.spec.ts` contra el proyecto Supabase de test                                                                 | 8    | f1-db-helper             |
| f1-ledger       | Asientos de doble entrada en gramos y dinero (cliente y proveedor)                                                                        | 9    | f1-repos                 |
| f1-casos-de-uso | Registrar cliente/proveedor, abrir operación (cierre), registrar packing list, armar exportación, cargar resultado de refinería, liquidar | 8    | f1-repos, f1-ledger      |
| f1-auth         | Verificación de JWT de Supabase + RBAC por mapa de permisos                                                                               | 8    | —                        |
| f1-api          | Rutas Express + contratos Zod en `shared-types`                                                                                           | 7    | f1-casos-de-uso, f1-auth |
| f1-ui           | Pantallas de los 5 módulos (tablas densas, formularios con el mismo schema Zod)                                                           | 7    | f1-api                   |

## Criterio de cierre de la fase

Un flujo completo de punta a punta con datos ficticios: proveedor fondea → operación con margen →
packing list del cliente → exportación con dos clientes → resultado de refinería con merma →
saldos en gramos y dinero correctos para cliente y proveedor, verificados por tests de integración.
