// Pisos de cobertura POR ARCHIVO (instructions/testing.md, Regla 1).
// Se aplican a las 4 métricas. El dominio exige 95%: es dinero y oro.
const floor = (pct: number) => ({ lines: pct, statements: pct, functions: pct, branches: pct });

export const DEFAULT_FLOOR = floor(80);
export const DOMAIN_FLOOR = floor(95);

/** Archivos exentos de cobertura: la misma lista cerrada que el spec-presence gate. */
export const COVERAGE_EXCLUDE = [
  '**/*.spec.ts',
  '**/*.int.spec.ts',
  '**/*.contract.ts',
  '**/*.d.ts',
  '**/*.port.ts',
  '**/*.types.ts',
  '**/index.ts',
  '**/main.ts',
  '**/server.ts',
];
