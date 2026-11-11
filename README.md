# ArbiGold

ERP para la operación de intermediación/arbitraje de oro: fondos de proveedores → asignación a clientes → recepción de oro → liquidación. Reemplaza la gestión basada en Excel.

> Estado: **esqueleto inicial**. Stack tecnológico, normas de desarrollo y skills de agentes aún por definir.

## Estructura (monorepo)

```
apps/
  backend/                 # Arquitectura hexagonal (ports & adapters)
    src/
      domain/              # Lógica pura de negocio, sin dependencias de frameworks
        model/             # Entidades: Operacion, Proveedor, Cliente, LoteOro, Transaccion
        value_objects/     # Dinero, TasaCambio, PesoOnzas, DocumentoKYC
        services/          # Reglas de arbitraje y calce de fondos
      application/         # Casos de uso (orquestación)
        use_cases/
        ports/
          inbound/         # Puertos expuestos (casos de uso)
          outbound/        # Interfaces hacia DB, storage, servicios externos
      infrastructure/      # Adaptadores
        entrypoints/       # API HTTP, WebSockets, bots
        persistence/       # Repositorios / ORM
        external_services/ # Tasas, storage KYC, etc.
    tests/{unit,integration}
  frontend/                # UI de operaciones (paneles y tablas densas)
packages/
  shared-types/            # Contratos y validaciones compartidas backend ↔ frontend
instructions/              # Directrices para agentes (arquitectura, convenciones, seguridad)
memory/                    # Estado vivo del proyecto (planes, ADRs, reviews, QA)
skills/                    # Skills/minions especializados
.opencode/skills/          # Descubrimiento de skills para opencode
docs/                      # Documentación de arquitectura y dominio
scripts/                   # Utilidades de desarrollo
```

## Módulos de dominio previstos

1. **Proveedores (Treasury)** — capital inyectado, cuentas corrientes, retornos.
2. **Clientes (Sourcing)** — asignación de fondos, packing lists (lote, pureza, peso, origen), cumplimiento de entregas.
3. **Motor de arbitraje** — cruce de fondos, multidivisa con aritmética decimal exacta.
4. **Compliance / KYC** — expedientes cifrados y control de acceso.

## Regla de capas

`domain` no importa nada de `application` ni `infrastructure`. `application` solo depende de `domain` y de sus propios puertos. `infrastructure` implementa los puertos.
