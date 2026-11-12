# AGENTS.md — ArbiGold

ERP para la intermediación/arbitraje de oro: fondos de proveedores → asignación a clientes → recepción de oro → liquidación, con compliance KYC.

**Si eres un agente: lee `instructions/README.md` y las 5 normas antes de escribir código.** No son sugerencias: los gates de CI y el review las hacen cumplir.

## Stack

Node.js 24 LTS · TypeScript strict · Express 5 · Kysely + Supabase (PostgreSQL, Auth, Storage) · Zod · decimal.js · Vue 3 + Vite + Pinia + vue-query + PrimeVue + Tailwind · Vitest · Supertest · Playwright · npm workspaces. Detalle en `memory/decision_logs/ADR-001-stack-tecnologico.md`.

## Mapa del repo

```
apps/backend/        API Express, arquitectura hexagonal (domain → application → infrastructure)
apps/frontend/       SPA Vue 3
packages/shared-types/  Contratos Zod compartidos (requests, responses, ErrorCode)
supabase/            Migraciones SQL y políticas RLS (fuente de verdad del schema)
instructions/        Normas obligatorias
memory/              Estado vivo: plans/, decision_logs/ (ADRs), reviews/, qa/, research_briefs/, notes/
skills/              Skills de agentes (pendiente de definir)
docs/                Arquitectura y dominio (glosario en docs/domain/glossary.md)
```

## Reglas que no se rompen nunca

1. `domain/` no importa frameworks, DB, `process.env` ni el reloj.
2. Dinero, tasas y pesos nunca son `number`: se usan `Decimal` y value objects.
3. Cada archivo ejecutable tiene su spec al lado; ≥ 80% por archivo (≥ 95% en domain) en las 4 métricas, y las líneas nuevas se ejecutan.
4. Los specs de integración usan Postgres real; nunca se mockea la DB.
5. Nada de cascadas de `if`: guard clauses + mapas de estrategia. Errores tipados, traducidos en un solo lugar.
6. RLS en todas las tablas; el frontend no accede a la DB; la `service_role` no se usa en runtime.
7. Nunca se loggea PII, tokens ni secretos. Ningún secreto se commitea.
8. Los asientos contables no se editan ni se borran: se reversan.

## Flujo de ramas

`feature/<ticket>-<desc>` → PR a `beta` → `staging` → `main` (producción). Sin push directo a esas tres ramas. Commits atómicos de ≤ 10 archivos con mensaje convencional `tipo(scope): desc | ARB-123`.

## Memoria

Al iniciar una tarea, lee `memory/active_context.md` (si existe) y los ADRs relevantes. Las decisiones de arquitectura nuevas van como `memory/decision_logs/ADR-NNN-<tema>.md`.
