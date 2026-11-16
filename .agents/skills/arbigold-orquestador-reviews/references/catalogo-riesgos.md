# Catálogo de riesgos — ArbiGold

Cada agente carga solo las secciones de su área. Cada ítem es una pregunta que hay que
responder con evidencia del código, no una regla para aplicar a ciegas. La norma
documentada en `instructions/` siempre gana.

## §Dinero
- ¿Algún monto, tasa, peso o pureza pasa por `number`, `parseFloat`, `toFixed`, `Math.round` o `JSON` sin string? (debe ser `Decimal` o un VO).
- ¿Hay sumas o comparaciones entre `Money` de **monedas distintas** sin pasar por una `ExchangeRate` explícita?
- ¿El redondeo usa la `RoundingPolicy` central, con el modo y la escala correctos? ¿Se redondea en pasos intermedios (error acumulado)?
- ¿La conversión gramos ↔ onza troy usa la constante única (31.1034768)? ¿La pureza se aplica una sola vez?
- ¿Un monto negativo, cero o con más decimales que la escala de la moneda se rechaza en el VO?
- ¿El margen de arbitraje se calcula en el dominio (backend), y el front solo lo muestra?

## §Ledger
- ¿Todo movimiento de fondos genera un asiento con débitos = créditos (suma cero), en la **misma transacción** que el cambio de estado?
- ¿Algún código hace UPDATE o DELETE de un asiento? Debe reversarse con un asiento nuevo.
- ¿El saldo se deriva de los asientos, o hay un campo "saldo" que puede divergir? Si existe, ¿se actualiza en la misma transacción?
- ¿Las transiciones de estado de la operación pasan por el mapa `OPERATION_TRANSITIONS` (`assertTransition`)?
- ¿La liquidación es idempotente (reintentar no paga dos veces)?

## §Concurrencia
- ¿Dos asignaciones simultáneas pueden gastar el mismo saldo de un proveedor? (`SELECT … FOR UPDATE`, nivel `SERIALIZABLE` con reintento ante `40001`, o un constraint que lo impida).
- ¿Hay lectura-modificación-escritura fuera de una transacción?
- ¿Las operaciones que vienen de un reintento HTTP o de un doble click tienen clave de idempotencia?

## §Hexagonal
- ¿`domain` o `application` dependen de algo de infraestructura por la puerta de atrás (tipos de Kysely, `Request` de Express, filas de DB)? ESLint ve los imports, no los tipos estructurales filtrados.
- ¿El caso de uso abre transacciones de Kysely directo en vez de usar el puerto `UnitOfWork`?
- ¿Un módulo lee las tablas de otro módulo desde su repository?
- ¿El controller tiene lógica de negocio (más allá de validar, llamar al caso de uso y mapear)?

## §Errores
- ¿Hay cascadas de `if`/`switch` que deberían ser un mapa de estrategias (`error-handling.md`)?
- ¿Algún error se traga (`catch {}`), se convierte en `null` o se lanza como string u objeto plano?
- ¿Algún error de Postgres llega crudo arriba (sin pasar por `PG_ERROR_MAP`)?
- ¿Las respuestas 500 pueden filtrar stack, SQL o datos internos?

## §Seguridad
- ¿Cada ruta nueva lleva `requirePermission(...)` (deny by default)? ¿El permiso es el correcto para la acción?
- ¿Toda entrada (body, params, query, headers relevantes) se **parsea** con Zod en el borde?
- ¿Hay IDOR? (se puede pedir un recurso de otra contraparte cambiando el id, sin chequear la pertenencia).
- ¿Se loggea PII, tokens, números de documento o cuentas? ¿La redacción de pino cubre el campo nuevo?
- ¿Algún secreto, clave o URL con credenciales queda en el código, en un test o en un fixture?
- ¿Se usa la `service_role` de Supabase en runtime?

## §KYC
- ¿Los campos sensibles se cifran con AES-256-GCM, IV único y `key_version`, antes de persistirse?
- ¿Los documentos van a un bucket **privado** y se sirven con URL firmada de ≤ 5 minutos, después de verificar `kyc:read`?
- ¿La subida valida el tipo MIME real (magic bytes), la extensión y el tamaño?
- ¿Cada acceso o descarga de un documento queda en `audit_log`?

## §Auditoría
- ¿Cada acción relevante (fondos, estados, permisos, login, KYC) escribe en `audit_log` en la misma transacción?
- ¿`audit_log` sigue siendo append-only (sin UPDATE/DELETE, ni siquiera para el rol de la app)?
- ¿El registro guarda el antes/después sin PII en claro?

## §SQL
- ¿Los montos usan `numeric(p, s)` y nunca `float`/`double precision`?
- ¿Hay índices para las consultas nuevas y FKs con la acción `ON DELETE` correcta (en datos financieros casi nunca `CASCADE`)?
- ¿La migración es segura sobre datos existentes (defaults, NOT NULL sobre tablas pobladas, locks largos)?
- ¿Hay `sql.raw` o SQL armado por concatenación?

## §RLS
- ¿La tabla nueva tiene `ENABLE ROW LEVEL SECURITY` y una política deny-all para `anon` y `authenticated`?
- ¿Alguna política usa `USING (true)` o se olvida `WITH CHECK`?
- ¿Los grants del rol de la app son mínimos? ¿Una función `SECURITY DEFINER` fija el `search_path`?

## §Express
- ¿Los handlers async dependen de Express 5 para propagar errores (sin `try/catch` por controller)?
- ¿La ruta nueva queda detrás de rate limit, CORS con allowlist y límite de body?
- ¿La config nueva se valida en `infrastructure/config` (fail fast) y nunca se lee de `process.env` fuera de ahí?

## §Vue
- ¿Algún `v-html`, URL o estilo armado con datos del usuario?
- ¿Los montos se formatean desde el string `Decimal` del contrato, sin pasar por `number`?
- ¿El componente presentacional hace fetch? ¿La vista tiene lógica de negocio que debería estar en un composable?
- ¿Se cubren los estados de carga, vacío y error en el spec?

## §Contratos
- ¿El cambio de un schema Zod rompe al otro lado (backend ↔ frontend)? ¿Los montos viajan como string?
- ¿Los `ErrorCode` nuevos están en `shared-types` y el frontend tiene la UX para ellos?

## §Specs
- ¿El spec prueba el **contrato** observable (lenguaje de negocio) y no detalles de implementación?
- ¿Un `*.int.spec.ts` mockea la DB (prohibido)? ¿Un unit de caso de uso mockea módulos en vez de usar fakes in-memory de los puertos?
- ¿Se prueban los bordes: 0, negativo, máximo de decimales, moneda distinta, transición inválida, permiso faltante?
- ¿Hay `it` sin aserciones reales, o aserciones que siempre pasan?

## §Tooling
- ¿Se debilitó un gate (piso de cobertura, lista de exentos del spec gate, regla de ESLint, `--no-verify`, scope de commitlint)? Si es así, ¿está justificado?
- ¿Una dependencia nueva está mantenida, tiene licencia compatible y es necesaria? ¿El lockfile está sincronizado?
- ¿Algún script ejecuta contenido no confiable o hace llamadas de red inesperadas?
