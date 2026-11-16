# ADR-005 — Supabase solo en la nube (sin Supabase local)

- **Fecha:** 2026-11-16
- **Estado:** Aceptado
- **Decisores:** Nelson Vélez (owner)

## Decisión

No se usa el stack local de Supabase (CLI + Docker). Todo entorno se conecta a un proyecto de
**Supabase en la nube**:

| Proyecto                                              | Para qué                                         | Quién lo usa           |
| ----------------------------------------------------- | ------------------------------------------------ | ---------------------- |
| **Desarrollo / test** (el actual)                     | Desarrollo local, `*.int.spec.ts`, pre-push y CI | Desarrolladores y CI   |
| **Producción** (a crear antes de cargar datos reales) | Operación real                                   | Solo la app desplegada |

- La CLI de Supabase se mantiene **solo** para migraciones: `npm run db:link`, `npm run db:push`,
  `npm run db:migration`. `supabase/migrations/` sigue siendo la fuente de verdad del schema y de RLS.
- Configuración del backend: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_JWKS_URL`
  (verificación de JWT con claves asimétricas) y `DATABASE_URL` (Transaction pooler, TLS).
  La `SUPABASE_SECRET_KEY` **no** se usa en runtime: solo como secreto del CI para migraciones.
- Frontend: `@supabase/supabase-js` **solo para Auth**. El ejemplo del panel que hace
  `supabase.from('tabla').select()` desde Vue **no aplica**: los datos van siempre por la API
  (ADR-001, regla 1).
- `@supabase/server` (oficial, MIT, verifica el JWT vía JWKS con `jose`) se evalúa al implementar la
  autenticación de la API (tarea `f1-auth`), no antes.

## Consecuencias

- No hace falta Docker. A cambio, los tests de integración dependen de la red y del proyecto de test.
- Los tests de integración nunca dejan datos: cada uno corre en una transacción con rollback
  (`withDatabase()`), y **nunca** apuntan al proyecto de producción.
- El plan Free pausa los proyectos tras días sin actividad: si el pre-push falla por conexión,
  primero hay que verificar que el proyecto de test esté activo.
