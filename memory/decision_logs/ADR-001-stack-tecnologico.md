# ADR-001 — Stack tecnológico

- **Fecha:** 2026-11-12
- **Estado:** Aceptado
- **Decisores:** Nelson Vélez (owner)

## Contexto

ArbiGold reemplaza la operación en Excel de un negocio de intermediación de oro: dinero de proveedores, asignación a clientes, recepción de oro, liquidación y expedientes KYC. Requisitos que mandan:

- Exactitud financiera: cero errores de redondeo, trazabilidad completa.
- Cumplimiento: controles alineados a SOC 2 e ISO/IEC 27001 (ver `instructions/security-compliance.md`).
- Costo de infraestructura bajo al inicio: sin pagar hosting de base de datos.
- Desarrollo asistido por agentes de IA, que funciona mejor en un monorepo con contratos tipados y compartidos.

## Decisión

| Capa                   | Tecnología                                                                                      | Notas                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Runtime                | **Node.js 26 LTS** ("Lithium") + npm 11                                                         | Versión fijada en `.nvmrc`; `engines` exige `>=26 <27`. Subido desde 24 el 2026-11-16 (ADR-004) |
| Lenguaje               | **TypeScript (strict)** en backend, frontend y packages                                         | Los contratos tipados son la base del principio de specs                                        |
| Monorepo               | **npm workspaces** (`apps/*`, `packages/*`)                                                     | Igual que el resto de repos del equipo                                                          |
| Backend                | **Express 5**                                                                                   | Captura nativamente los rechazos de promesas async: no hace falta un try/catch por controller   |
| Validación / contratos | **Zod**, en `packages/shared-types`                                                             | El mismo esquema valida en la API y en los formularios                                          |
| Base de datos          | **Supabase (PostgreSQL gestionado)**                                                            | Además trae Auth, Storage y RLS                                                                 |
| Acceso a datos         | **Kysely** (query builder tipado) sobre `pg`                                                    | SQL explícito, sin la "magia" de un ORM; `numeric` llega como string y se pasa a Decimal        |
| Migraciones            | **Supabase CLI** (`supabase/migrations/*.sql`)                                                  | Única fuente de verdad del schema, incluidas las políticas RLS                                  |
| Aritmética             | **decimal.js**                                                                                  | Prohibido usar `number` para dinero, tasas o pesos                                              |
| Auth                   | **Supabase Auth** (JWT, MFA)                                                                    | El backend verifica el JWT y aplica RBAC propio                                                 |
| Archivos KYC           | **Supabase Storage**, buckets privados                                                          | Cifrado a nivel de aplicación (AES-256-GCM) y URLs firmadas de vida corta                       |
| Logging                | **pino**, en JSON estructurado y con redacción de PII                                           |                                                                                                 |
| Seguridad HTTP         | helmet, CORS con allowlist, express-rate-limit                                                  |                                                                                                 |
| Frontend               | **Vue 3** (Composition API, `<script setup>`) + **Vite**                                        |                                                                                                 |
| Estado / routing       | **Pinia** + **Vue Router**                                                                      |                                                                                                 |
| Datos remotos          | **TanStack Query (vue-query)**                                                                  | Caché e invalidación sin código manual                                                          |
| UI                     | **PrimeVue** + **Tailwind CSS**                                                                 | DataTable denso para los paneles de operaciones                                                 |
| Tests                  | **Vitest** (backend y frontend), **Supertest** (HTTP), **Vue Test Utils**, **Playwright** (e2e) | Un solo runner y un solo formato de cobertura (v8 → istanbul)                                   |
| Calidad                | ESLint (flat config) + Prettier, `tsc --noEmit`                                                 |                                                                                                 |
| CI                     | GitHub Actions                                                                                  | Gates descritos en `instructions/testing.md`                                                    |

## Reglas que se derivan de esta decisión

1. **El frontend nunca habla directo con la base de datos.** Todo pasa por la API Express. El cliente de Supabase en el frontend solo se usa para Auth (login, MFA, refresh).
2. **RLS está activado en el 100% de las tablas del schema `public`.** Supabase expone PostgREST de forma pública, así que una tabla sin RLS queda abierta con la `anon key`. Las políticas son por defecto `deny all` para `anon` y `authenticated`. El backend se conecta con un rol propio de privilegio mínimo, nunca con `service_role` en runtime.
3. Cada dependencia del dominio (repositorios, storage, reloj, tasas) entra por un **puerto**. Kysely, Supabase y Express solo existen en `infrastructure/`.

## Riesgos aceptados y mitigaciones

| Riesgo                                                                                                                   | Mitigación                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El plan Free de Supabase pausa el proyecto tras días sin actividad y no incluye backups automáticos descargables ni PITR | Backup propio: `pg_dump` programado, cifrado y guardado fuera de Supabase. Antes de cargar datos reales de clientes se evalúa pasar al plan Pro (control de backups de ISO 27001) |
| Dependencia de un proveedor (lock-in)                                                                                    | La arquitectura hexagonal deja Supabase detrás de adaptadores: Postgres es estándar y Auth/Storage están detrás de puertos                                                        |
| Las cuotas del Free (tamaño de DB y storage)                                                                             | Monitorear el uso; los documentos KYC se comprimen y se valida su tamaño al subirlos                                                                                              |

## Alternativas descartadas

- **Prisma / TypeORM:** esconden el SQL y manejan `Decimal` y transacciones de forma menos explícita. Kysely mantiene el control.
- **supabase-js como capa de datos del backend:** pasa por PostgREST y no permite transacciones multi-tabla, que son indispensables para la doble entrada contable.
- **JavaScript sin tipos:** en un dominio financiero con agentes generando código, los tipos son el primer contrato.
