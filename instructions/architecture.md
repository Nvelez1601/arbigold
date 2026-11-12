# Arquitectura — Clean Architecture / Hexagonal + SOLID

> Norma obligatoria. Si un cambio la viola, el review (fase 5) lo rechaza.

## 1. Regla de dependencia (la única que no se negocia)

```
infrastructure  ──►  application  ──►  domain
 (adaptadores)       (casos de uso)    (negocio puro)
```

- `domain/` **no importa nada** fuera de `domain/`, salvo `decimal.js` y utilidades puras sin I/O. No usa Express, ni Kysely, ni Supabase, ni `process.env`, ni `Date.now()` (el tiempo entra por el puerto `Clock`).
- `application/` importa `domain/` y sus propios `ports/`. Nunca importa `infrastructure/`.
- `infrastructure/` implementa los puertos y es el único lugar donde viven los frameworks.
- La composición (el cableado de dependencias) ocurre en **un solo lugar**: `infrastructure/composition-root.ts`. Ahí no hay contenedor DI mágico: es una fábrica explícita.
- Un lint (`eslint-plugin-boundaries`) hace cumplir estas reglas en CI.

## 2. Organización: hexágono por capas, módulos de negocio dentro de cada capa

Las **capas hexagonales son el primer nivel** (así la regla de dependencia es visible en el path). Los módulos de negocio (bounded contexts) son el segundo nivel y repiten la misma forma en cada capa:

```
apps/backend/src/
  domain/                                   # NÚCLEO — negocio puro, sin I/O
    shared/                                 # shared kernel: Money, GoldWeight, ExchangeRate, AppError, RoundingPolicy
    <modulo>/
      <entidad>.entity.ts                   # invariantes y comportamiento
      <valor>.vo.ts                         # value objects inmutables
      <regla>.service.ts                    # reglas que no pertenecen a una sola entidad
      <modulo>.errors.ts                    # errores de dominio tipados (ver error-handling.md)
  application/                              # CASOS DE USO + PUERTOS
    shared/                                 # puertos transversales: Clock, UnitOfWork, AuditTrail
    <modulo>/
      use-cases/<accion>.use-case.ts        # una clase, un execute(); implementa un puerto inbound
      ports/inbound/<accion>.port.ts        # lo que el módulo ofrece (lo invocan los adaptadores primarios)
      ports/outbound/<recurso>.port.ts      # lo que el módulo necesita (repositorios, storage, tasas)
  infrastructure/                           # ADAPTADORES — único lugar con frameworks
    entrypoints/http/                       # adaptadores primarios (Express)
      middleware/                           # auth, requirePermission, errorHandler, requestId
      <modulo>/<modulo>.routes.ts · <modulo>.controller.ts
    persistence/                            # adaptadores secundarios (Kysely → Supabase Postgres)
      shared/                               # conexión, UnitOfWork transaccional, PG_ERROR_MAP
      <modulo>/<recurso>.repository.ts      # implementa ports/outbound/<recurso>.port.ts
    external-services/<servicio>/           # tasas, Supabase Storage (KYC), Supabase Auth
    config/                                 # carga y validación (Zod) de env
    composition-root.ts                     # cableado explícito puerto → adaptador
apps/backend/test/support/                  # withDatabase(), builders, fakes in-memory
supabase/migrations/                        # schema + RLS (fuente de verdad)
```

Módulos: `treasury` (proveedores y capital), `sourcing` (clientes, packing lists, lotes), `arbitrage` (operaciones, cruce y liquidación), `compliance` (KYC y documentos), `identity` (usuarios, roles y permisos), `audit` (bitácora inmutable).

Reglas entre módulos:
- Un módulo **no importa el interior de otro**. Si `arbitrage` necesita saldo de `treasury`, lo pide por un puerto inbound de `treasury` (o por un puerto outbound propio que un adaptador resuelve).
- Solo `domain/shared` y `application/shared` son importables por todos.
- La transacción que abarca varios repositorios (p. ej. asignar fondos + asiento contable + audit) se coordina con el puerto `UnitOfWork`, nunca abriendo transacciones de Kysely en el caso de uso.

## 3. Idioma y nombres

- El código va **en inglés** (`Operation`, `Supplier`, `GoldLot`, `PackingList`); la documentación y los mensajes al usuario, en español. El mapeo está en `docs/domain/glossary.md`.
- Los archivos van en `kebab-case` con un sufijo de rol: `.entity.ts`, `.vo.ts`, `.use-case.ts`, `.port.ts`, `.repository.ts`, `.controller.ts`, `.routes.ts`, `.schema.ts`, `.mapper.ts`.
- Clases y tipos en `PascalCase`; funciones y variables en `camelCase`; constantes de módulo en `UPPER_SNAKE_CASE`.

## 4. SOLID aplicado (con ejemplos de este dominio)

| Principio | Cómo se aplica aquí |
|---|---|
| **S** — Responsabilidad única | `RegisterArbitrageOperationUseCase` solo orquesta. El cálculo del margen vive en `MarginCalculator` (domain) y la persistencia en el repositorio. Un controller no tiene lógica: valida el input (Zod), llama al caso de uso y mapea la respuesta. |
| **O** — Abierto/cerrado | Se agregan comportamientos registrando una nueva estrategia en un mapa (`FEE_STRATEGIES`, `ERROR_HTTP_MAP`), no agregando un `if/else` al código existente. |
| **L** — Sustitución de Liskov | Cualquier implementación de `OperationRepositoryPort` (Kysely o in-memory) cumple el mismo contrato, y los specs del puerto corren contra ambas. |
| **I** — Segregación de interfaces | Puertos chicos: `OperationReader` y `OperationWriter` en lugar de un repositorio-dios. Un caso de uso pide solo lo que usa. |
| **D** — Inversión de dependencias | Los casos de uso reciben puertos por constructor; nunca hacen `new` de un adaptador. |

## 5. Reglas del dominio financiero

- **Dinero, tasas y pesos nunca son `number`.** Se usan los value objects `Money` (monto `Decimal` + moneda ISO 4217), `ExchangeRate` y `GoldWeight` (gramos `Decimal` + pureza). La conversión de onza troy usa `1 ozt = 31.1034768 g`, definida como constante única.
- En Postgres, `numeric(precision, scale)`: nunca `float` ni `double precision`.
- El redondeo es explícito y está centralizado (`RoundingPolicy`). Nada de `toFixed()` disperso.
- **Todo movimiento de fondos es doble entrada**: un asiento con débitos y créditos que suman cero, escrito en una sola transacción. Un asiento contable no se edita ni se borra; se reversa con otro asiento.
- Los estados de una operación son una máquina de estados declarada como mapa de transiciones permitidas (ver `error-handling.md`, sección 4).
- Toda escritura relevante produce un evento en `audit` (quién, qué, cuándo, antes/después) en la misma transacción.

## 6. Frontend (Vue 3)

```
apps/frontend/src/
  modules/<modulo>/
    components/        # presentacionales: props in, events out, sin fetch
    views/             # páginas: componen componentes y usan composables
    composables/       # lógica reutilizable (useOperationForm, useMarginPreview)
    api/               # cliente HTTP tipado con los contratos de shared-types
    stores/            # Pinia, solo estado de UI o de sesión; los datos remotos van en vue-query
  shared/              # UI kit, utilidades, formateadores (Money, GoldWeight)
  app/                 # router, plugins, layout
```

- Los componentes presentacionales no conocen la API. Las vistas no contienen lógica de negocio: la delegan a composables.
- Los formularios validan con el **mismo schema Zod** de `packages/shared-types`.
- Los cálculos que el usuario ve (preview de margen) son solo informativos: **el backend es la fuente de verdad** y recalcula siempre.

## 7. packages/shared-types

Contiene solo contratos: schemas Zod de request/response, enums compartidos y tipos derivados (`z.infer`). Sin lógica de negocio y sin dependencias de runtime aparte de Zod.
