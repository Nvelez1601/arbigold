# Manejo de errores — estrategia por mapas

**Objetivo:** que ningún controller, caso de uso ni repositorio tenga cascadas de `if`/`try-catch` para traducir errores. Los errores se **lanzan tipados** y se **traducen en un solo lugar** mediante mapas.

## 1. Jerarquía única

```ts
// domain/shared/app-error.ts
export abstract class AppError extends Error {
  abstract readonly code: ErrorCode;          // p. ej. 'OPERATION_INVALID_TRANSITION'
  readonly details?: Readonly<Record<string, unknown>>;
}
```

- `ErrorCode` es una **unión de literales** declarada en `packages/shared-types/src/errors.ts`, así el frontend conoce los mismos códigos.
- Cada módulo declara sus errores en `<modulo>.errors.ts`: `InsufficientSupplierFundsError`, `KycDocumentExpiredError`, etc.
- Errores por categoría: `ValidationError`, `NotFoundError`, `ConflictError`, `ForbiddenError`, `UnauthenticatedError`, `BusinessRuleError` y, en infraestructura, `ExternalServiceError`.

## 2. Un solo traductor HTTP (mapa, no `if`)

```ts
// infrastructure/entrypoints/http/error-http-map.ts
export const ERROR_HTTP_MAP: Record<ErrorCategory, number> = {
  VALIDATION: 422,
  NOT_FOUND: 404,
  CONFLICT: 409,
  FORBIDDEN: 403,
  UNAUTHENTICATED: 401,
  BUSINESS_RULE: 422,
  EXTERNAL_SERVICE: 502,
};
```

- Un único middleware `errorHandler` hace `ERROR_HTTP_MAP[error.category]`. Cualquier error desconocido responde **500 con un mensaje genérico**, se registra con su `requestId` y nunca expone el stack ni el SQL al cliente (control de fuga de información).
- La respuesta tiene un formato fijo: `{ error: { code, message, requestId, details? } }`.
- Express 5 propaga los rechazos de los handlers async: **los controllers no llevan `try/catch`**.

## 3. Traducción de errores de infraestructura (también por mapa)

Los errores de Postgres se traducen en el adaptador, nunca se filtran hacia arriba:

```ts
const PG_ERROR_MAP: Record<string, (e: PgError) => AppError> = {
  '23505': (e) => new ConflictError('DUPLICATE_RESOURCE', { constraint: e.constraint }),
  '23503': (e) => new ConflictError('REFERENCED_RESOURCE', { constraint: e.constraint }),
  '40001': () => new ConflictError('CONCURRENT_UPDATE'),
};
```

## 4. Máquinas de estado declarativas

Los estados de una operación (y de cualquier flujo) se declaran como mapa de transiciones permitidas:

```ts
const OPERATION_TRANSITIONS: Record<OperationStatus, readonly OperationStatus[]> = {
  DRAFT:            ['FUNDED', 'CANCELLED'],
  FUNDED:           ['ALLOCATED', 'CANCELLED'],
  ALLOCATED:        ['GOLD_RECEIVED'],
  GOLD_RECEIVED:    ['SETTLED'],
  SETTLED:          [],
  CANCELLED:        [],
} as const;

assertTransition(from, to); // lanza OperationInvalidTransitionError si no está en el mapa
```

## 5. Autorización por mapa (RBAC)

Los permisos no se escriben como `if (user.role === ...)` dentro de los handlers. Se declaran así:

```ts
const PERMISSIONS: Record<Role, readonly Permission[]> = {
  ADMIN:      ['*'],
  TREASURY:   ['supplier:read', 'supplier:write', 'ledger:read'],
  OPERATIONS: ['operation:read', 'operation:write', 'packing-list:write'],
  COMPLIANCE: ['kyc:read', 'kyc:approve', 'audit:read'],
  VIEWER:     ['operation:read'],
};
router.post('/operations', requirePermission('operation:write'), controller.create);
```

## 6. Qué está prohibido

- `catch (e) {}` vacío, o un `catch` que solo hace `console.log`.
- Lanzar strings u objetos planos (`throw 'error'`).
- Usar `instanceof` encadenado para decidir el status HTTP.
- Devolver `null` para señalar un error. `null` significa "no existe" y solo se usa en lecturas (`findById`).
- Loggear PII, tokens o el contenido de documentos en los mensajes de error.
