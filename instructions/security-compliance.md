# Seguridad y cumplimiento — SOC 2 / ISO/IEC 27001

> **Aclaración honesta:** el software no "es" SOC 2 ni ISO 27001: esas certificaciones las obtiene la **organización** mediante auditoría. Lo que este repo garantiza es que **el sistema implementa y deja evidencia** de los controles técnicos que esas normas exigen (SOC 2 Trust Services Criteria: CC6, CC7 y CC8; ISO 27001:2022, Anexo A, controles tecnológicos 8.x). Cada regla de abajo indica qué control respalda.

## 1. Control de acceso (SOC 2 CC6.1–CC6.3 · ISO A.5.15, A.8.2, A.8.5)

- Autenticación con Supabase Auth. **MFA (TOTP) obligatorio** para los roles `ADMIN`, `TREASURY` y `COMPLIANCE`.
- El backend verifica la firma, `exp`, `aud` e `iss` de cada JWT; no confía en ningún claim sin verificarlo.
- RBAC por mapa de permisos (`error-handling.md`, sección 5). **Deny by default**: una ruta sin `requirePermission` no pasa el lint/test de rutas.
- Mínimo privilegio en la base de datos: el backend usa un rol Postgres propio y la `service_role` key solo se usa en migraciones y CI, nunca en runtime.
- **RLS activado en todas las tablas**, con políticas deny-all para `anon` y `authenticated` (Supabase expone PostgREST públicamente).
- Las sesiones expiran: access token de vida corta y refresh con rotación.

## 2. Criptografía (ISO A.8.24 · SOC 2 CC6.1, CC6.7)

- TLS 1.2+ en todo el tránsito; HSTS vía helmet.
- Supabase cifra la base de datos en reposo. **Además**, los campos sensibles (número de documento, cuentas bancarias, datos de origen de fondos) se cifran a nivel de aplicación con **AES-256-GCM** y un IV único por valor, guardando `key_version` para poder rotar claves.
- Las claves van en un gestor de secretos o en variables de entorno del entorno de despliegue, **nunca en el repo**. La rotación queda documentada.
- Los documentos KYC van en buckets **privados**, cifrados antes de subirlos y accesibles solo con URLs firmadas de ≤ 5 minutos, emitidas tras verificar el permiso `kyc:read`.

## 3. Registro y monitoreo (SOC 2 CC7.2–CC7.3 · ISO A.8.15, A.8.16)

- Tabla `audit_log` **append-only**: sin `UPDATE` ni `DELETE`, ni siquiera para el rol de la aplicación. Registra actor, acción, entidad, valores antes/después (sin PII en claro), IP, `requestId` y timestamp UTC.
- Se audita: login, fallos de autenticación, cambios de permisos, todo movimiento de fondos, cambios de estado de operaciones y cada acceso o descarga de un documento KYC.
- Logs técnicos con pino en JSON y redacción automática (`authorization`, `password`, `token`, `documentNumber`, `accountNumber`...).
- Cada request lleva un `requestId` (header `x-request-id`) que se propaga a logs y errores.

## 4. Desarrollo seguro y gestión de cambios (SOC 2 CC8.1 · ISO A.8.25–A.8.29, A.8.32)

- **Modelo de una sola rama (`main`), un solo desarrollador, sin PRs** (ver `ADR-002`). Como no hay segunda persona que apruebe, la segregación de funciones se reemplaza por **controles compensatorios**, todos con evidencia:
  1. **Hooks obligatorios**: el pre-commit (lint, formato, specs, commitlint) y el pre-push (`npm run verify`: tests, cobertura por archivo y de diff). Prohibido `--no-verify`.
  2. **CI en cada push a `main`** (`.github/workflows/ci.yml`): repite los gates y suma `npm audit` y gitleaks. Un CI rojo se corrige antes que cualquier feature nueva.
  3. **Review asistida por agentes** (`arbigold-orquestador-reviews`) antes de pushear cambios en áreas críticas (dinero, KYC, auth, auditoría, RLS), con el informe versionado en `memory/reviews/`.
  4. **Historial lineal e inmutable**: sin force-push a `main` (protección de rama en GitHub: bloquear force-push y borrado).
- Base de referencia: **OWASP ASVS nivel 2** y OWASP Top 10.
- **Validación con Zod en el borde** de cada entrada (body, params, query, headers relevantes y webhooks). Los objetos se parsean, no se castean.
- Solo consultas parametrizadas (Kysely). Prohibido el SQL armado por concatenación; `sql.raw` requiere justificación en el mensaje del commit.
- Headers con helmet, CORS con allowlist explícita (nunca `*`) y rate limit global más uno estricto en auth.
- Límite de tamaño de body y validación de los archivos subidos por tipo MIME real (magic bytes), extensión y tamaño.
- Las respuestas de error nunca exponen stack traces, SQL ni detalles internos.

## 5. Gestión de vulnerabilidades (SOC 2 CC7.1 · ISO A.8.8)

| Control en CI                  | Herramienta                                 | Bloquea el merge   |
| ------------------------------ | ------------------------------------------- | ------------------ |
| Dependencias vulnerables       | `npm audit --audit-level=high` + Dependabot | Sí (high/critical) |
| Análisis estático de seguridad | CodeQL o Semgrep                            | Sí                 |
| Secretos en el código          | gitleaks (también en pre-commit)            | Sí                 |
| Lockfile sincronizado          | `npm ci`                                    | Sí                 |
| Licencias de dependencias      | license-checker (allowlist)                 | Advertencia        |

- Las dependencias nuevas requieren justificación en el commit (`build(deps): ...`): mantenimiento activo, licencia y superficie de ataque.

## 6. Datos, retención y continuidad (ISO A.8.10, A.8.13 · SOC 2 A1.2)

- **Backups:** el plan Free de Supabase no da backups gestionados suficientes, así que se hace un `pg_dump` diario automatizado, cifrado y guardado fuera de Supabase, con una **prueba de restauración mensual** documentada en `memory/qa/`.
- La política de retención de los documentos KYC y del audit log se define con compliance; el borrado es lógico y deja evidencia.
- En desarrollo y staging no se usan datos reales de clientes; se trabaja con seeds sintéticos.

## 7. Evidencia

Cada control debe poder demostrarse: el resultado del CI en cada push, los informes de review de `memory/reviews/`, los reportes de `memory/qa/`, `audit_log` y la configuración versionada. **Un control sin evidencia no existe para un auditor.**
