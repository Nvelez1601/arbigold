# ArbiGold

ERP para la operación de intermediación/arbitraje de oro: fondos de proveedores → asignación a clientes → recepción de oro → liquidación. Reemplaza la gestión basada en Excel.

> Estado: **esqueleto inicial**. Stack y normas definidos; skills de agentes por definir.

## Stack

Node.js 24 + TypeScript · Express 5 · Supabase (PostgreSQL, Auth, Storage) + Kysely · Zod · Vue 3 + Vite + Pinia + PrimeVue + Tailwind · Vitest / Playwright. Justificación: [ADR-001](memory/decision_logs/ADR-001-stack-tecnologico.md).

## Arranque local

```bash
nvm use                      # Node 24
npm install                  # workspaces + hooks de git (Husky)
cp apps/backend/.env.example apps/backend/.env
npm run db:start             # Supabase local (Docker)
npm run dev:backend          # API :3000
npm run dev:frontend         # SPA :5173
npm run check                # lo mismo que valida el CI
```

## Normas

Leer [`instructions/README.md`](instructions/README.md) antes de contribuir. Punto de entrada para agentes: [`AGENTS.md`](AGENTS.md).

## Estructura (monorepo)

```
apps/
  backend/src/
    domain/          shared/ + <modulo>/       # negocio puro (entities, VOs, reglas, errores)
    application/     shared/ + <modulo>/       # use-cases/ + ports/{inbound,outbound}
    infrastructure/                            # adaptadores
      entrypoints/http/<modulo>/               # Express (primarios)
      persistence/<modulo>/                    # Kysely → Supabase (secundarios)
      external-services/                       # tasas, storage KYC, auth
  backend/test/support/                        # withDatabase, builders, fakes
  frontend/src/      app/ · shared/ · modules/<modulo>/
  frontend/e2e/                                # Playwright
packages/shared-types/                         # contratos Zod backend ↔ frontend
supabase/migrations/                           # schema + RLS
instructions/  memory/  skills/  docs/  scripts/
```

Módulos: `treasury` · `sourcing` · `arbitrage` · `compliance` · `identity` · `audit`.

## Módulos de dominio previstos

1. **Proveedores (Treasury)** — capital inyectado, cuentas corrientes, retornos.
2. **Clientes (Sourcing)** — asignación de fondos, packing lists (lote, pureza, peso, origen), cumplimiento de entregas.
3. **Motor de arbitraje** — cruce de fondos, multidivisa con aritmética decimal exacta.
4. **Compliance / KYC** — expedientes cifrados y control de acceso.

## Regla de capas (hexagonal)

`infrastructure → application → domain`. `domain` no importa nada externo; `application` depende de `domain` y declara puertos; `infrastructure` implementa los puertos. Detalle en [`instructions/architecture.md`](instructions/architecture.md).
